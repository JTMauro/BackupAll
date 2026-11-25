// Forgotten Worlds (Capcom, 1988) -- from-scratch recreation for the MAME32 Game Room.
// A flying soldier with a rotating gun and an orbiting satellite; collect zenny and spend it in the shop.
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
  const mirror = rows => rows.map(r => r.split('').reverse().join(''));

  const HERO = [
    '.....HHHH.......', '....HHHHHH......', '....HSSSSH......', '....HSSKSS......', '.....SSSS.......', '...AAAAAAAA.....',
    '..AAPPPPPPAA....', '.JJAPPPPPPAA....', '.JJAPPPPPPA.....', '.JJ.PPPPPP......', '.JJ.BBBBBB......', '.FF.PPPPPP......',
    '.F..PP..PP......', '....PP..PP......', '....PP...PP.....', '....AA...AA.....', '...AAA...AAA....'];
  const HERO2 = HERO.slice(0, 11).concat(['.FF.PPPPPP......', 'FF..PPPPPP......', 'F...PP.PP.......', '....PP.PP.......', '....AA.AA.......', '...AAA.AAA......']);
  const HPAL = { H: '#e0c040', S: '#f0b080', K: '#202020', A: '#a8b0b8', P: '#c03030', B: '#ffd040', J: '#606870', F: '#ffa020' };
  const FLYER = ['....GGGG....', '..GGRRRRGG..', '.GRRYYYYRRG.', 'GGRYKKKKYRGG', 'GGRYKKKKYRGG', '.GRRYYYYRRG.', '..GGRRRRGG..', '....GGGG....'];
  const FLYPAL = [{ G: '#507090', R: '#90b0d0', Y: '#ffffff', K: '#ff3030' }, { G: '#806040', R: '#d0a060', Y: '#ffe080', K: '#20a040' }, { G: '#704080', R: '#b070d0', Y: '#ffffff', K: '#ffd040' }];
  const WALKER = ['....LLLL....', '...LLLLLL...', '...LYLLYL...', '....LLLL.GG.', '..TTTTTTTGG.', '.TTTTTTTT...', '.LTTTTTTL...', '..TTTTTT....', '..LL..LL....', '.LL....LL...', '.LL....LL...', 'LLL....LLL..'];

  const W = 384, H = 224, TOPY = 14;

  ArcadeRegistry.register({
    id: 'forgottenworlds', title: 'Forgotten Worlds', year: 1988, maker: 'Capcom',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: fly \u00b7 Space: fire \u00b7 X: rotate aim clockwise \u00b7 Z: rotate aim counter-clockwise \u00b7 A: mega crush \u00b7 Shop: Up/Down, Space buy, X leave \u00b7 Enter: start',
    marquee: { bg: '#200810', fg: '#ffd040', accent: '#40a0ff' },
    create(api) {
      const au = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      const ri = n => Math.random() * n | 0;
      const NDIR = 16;
      const snd = {
        shot() { au.tone(1300, 0.04, { type: 'square', vol: 0.04, slideTo: 700 }); },
        laser() { au.tone(2200, 0.08, { type: 'sawtooth', vol: 0.04, slideTo: 900 }); },
        missile() { au.noise(0.08, { vol: 0.06, freq: 1800 }); },
        rot() { au.tone(2400, 0.015, { type: 'square', vol: 0.03 }); },
        hit() { au.noise(0.04, { vol: 0.07, freq: 3000 }); },
        kill() { au.noise(0.22, { vol: 0.15, freq: 1400, slideTo: 150 }); },
        big() { au.noise(0.6, { vol: 0.25, freq: 900, slideTo: 40 }); au.tone(80, 0.5, { type: 'sawtooth', vol: 0.1, slideTo: 30 }); },
        zenny() { au.tone(1760, 0.05, { type: 'square', vol: 0.06 }); au.tone(2637, 0.07, { type: 'square', vol: 0.06, delay: 0.05 }); },
        hurt() { au.tone(200, 0.2, { type: 'sawtooth', vol: 0.15, slideTo: 70 }); },
        buy() { au.melody([[1047, .05], [1319, .05], [1568, .1]], { type: 'square', vol: 0.1 }); },
        no() { au.tone(150, 0.2, { type: 'square', vol: 0.12 }); },
        crush() { au.noise(1.2, { vol: 0.3, freq: 3000, slideTo: 60 }); au.tone(60, 1, { type: 'sawtooth', vol: 0.12, slideTo: 20 }); },
        clear() { au.melody([[440, .12], [554, .12], [659, .12], [880, .3], [831, .12], [880, .5]], { type: 'square', vol: 0.12 }); },
        die() { au.melody([[440, .12], [415, .12], [392, .12], [370, .12], [330, .5]], { type: 'triangle', vol: 0.2 }); }
      };
      const HS = [spr(HERO, HPAL), spr(mirror(HERO), HPAL)];
      const HS2 = [spr(HERO2, HPAL), spr(mirror(HERO2), HPAL)];
      const FS = FLYPAL.map(p => spr(FLYER, p));
      const WS = [spr(WALKER, { L: '#40a050', Y: '#ffff40', T: '#806030', G: '#a0a0a0' }), spr(mirror(WALKER), { L: '#40a050', Y: '#ffff40', T: '#806030', G: '#a0a0a0' })];

      const STAGES = [
        { name: 'CITY OF RUINS', boss: 'dragon', bname: 'DUST DRAGON', len: 3400, sky: ['#301018', '#502030', '#804040', '#b06040'], ruin: '#5a3a30', ruin2: '#3a2420', far: '#40202a' },
        { name: 'PYRAMID', boss: 'wargod', bname: 'WAR GOD', len: 3700, sky: ['#402008', '#704010', '#a06020', '#d09040'], ruin: '#a07a40', ruin2: '#6a5028', far: '#80602a' },
        { name: 'IRON FORTRESS', boss: 'emperor', bname: 'IRON EMPEROR', len: 4000, sky: ['#080818', '#101830', '#182848', '#203860'], ruin: '#505868', ruin2: '#30343e', far: '#202838' }
      ];
      const SHOP = [
        { k: 'normal', name: 'NORMAL GUN', price: 0 },
        { k: 'spread', name: '3-WAY GUN', price: 1200 },
        { k: 'laser', name: 'LASER', price: 2400 },
        { k: 'homing', name: 'HOMING MISSILE', price: 3200 },
        { k: 'armor', name: 'ARMOR', price: 1000 },
        { k: 'vital', name: 'VITALITY', price: 600 },
        { k: 'crush', name: 'MEGA CRUSH', price: 1500 },
        { k: 'exit', name: 'EXIT', price: 0 }
      ];

      let hi = api.getHiScore(50000), mode = 'title', titleT = 0, frame = 0, coinFlash = 0;
      let g = null;
      function tryStart() {
        if (api.useCredit()) { newGame(); return; }
        coinFlash = 90; au.tone(110, 0.25, { type: 'square', vol: 0.15 });
      }
      function newGame() {
        g = { score: 0, lives: 3, stage: 0, loop: 0, zenny: 300, weapon: 'normal', armor: 0, crush: 1, nextExtra: 100000, maxVit: 12 };
        mode = 'game'; startStage();
      }
      function stg() { return STAGES[g.stage]; }
      function diff() { return g.stage + g.loop * 3; }
      function addScore(n) {
        g.score += n; if (g.score > hi) hi = g.score;
        while (g.score >= g.nextExtra) { g.lives++; g.nextExtra += 100000; snd.buy(); }
      }

      // ---------- terrain ----------
      function genTerrain() {
        const len = stg().len + W + 64;
        const n = Math.ceil(len / 16) + 2;
        const fl = new Int16Array(n), ce = new Int16Array(n);
        let f = 200, c = TOPY, tf = 200, tc = TOPY;
        for (let i = 0; i < n; i++) {
          if (i % 12 === 0) {
            tf = i < 30 ? 206 : 160 + ri(48);
            tc = i < 30 || Math.random() < 0.55 ? TOPY : TOPY + 10 + ri(40);
            if (tf - tc < 110) tc = Math.max(TOPY, tf - 110);
          }
          f += Math.sign(tf - f) * Math.min(4, Math.abs(tf - f));
          c += Math.sign(tc - c) * Math.min(4, Math.abs(tc - c));
          fl[i] = f; ce[i] = c;
        }
        for (let i = 0; i < n; i++) if (fl[i] - ce[i] < 100) ce[i] = Math.max(TOPY, fl[i] - 100);
        // boss arena is open
        const b0 = Math.floor(stg().len / 16);
        for (let i = b0; i < n; i++) { fl[i] = Math.min(fl[i], 212); ce[i] = TOPY; }
        g.fl = fl; g.ce = ce;
      }
      function floorAt(wx) { const i = Math.max(0, Math.min(g.fl.length - 2, Math.floor(wx / 16))), k = (wx / 16) - Math.floor(wx / 16); return g.fl[i] + (g.fl[i + 1] - g.fl[i]) * Math.max(0, Math.min(1, k)); }
      function ceilAt(wx) { const i = Math.max(0, Math.min(g.ce.length - 2, Math.floor(wx / 16))), k = (wx / 16) - Math.floor(wx / 16); return g.ce[i] + (g.ce[i + 1] - g.ce[i]) * Math.max(0, Math.min(1, k)); }

      function startStage() {
        genTerrain();
        g.sx = 0; g.p = { x: 60, y: 110, aim: 0, rotT: 0, cd: 0, inv: 120, vit: g.maxVit, anim: 0, dead: 0 };
        g.sat = { a: 0 };
        g.en = []; g.pb = []; g.eb = []; g.zen = []; g.fx = []; g.pops = [];
        g.boss = null; g.phase = 'intro'; g.phaseT = 150; g.waveD = 200; g.shops = [Math.floor(stg().len * 0.45), stg().len - 260]; g.shopObj = null; g.shopSel = 0; g.flash = 0;
        au.melody([[330, .15], [440, .15], [494, .15], [523, .3], [494, .15], [440, .15], [659, .45]], { type: 'square', vol: 0.1 });
      }

      // ---------- player ----------
      function aimVec(a) { const r = a / NDIR * Math.PI * 2; return [Math.cos(r), Math.sin(r)]; }
      function satPos() {
        const p = g.p, [ax, ay] = aimVec(p.aim);
        return { x: p.x + ax * 20 - ay * 4, y: p.y - 10 + ay * 20 + ax * 4 };
      }
      function fireFrom(x, y, main) {
        const p = g.p, a = p.aim / NDIR * Math.PI * 2;
        const w = g.weapon;
        if (w === 'normal') g.pb.push({ x, y, vx: Math.cos(a) * 6.5, vy: Math.sin(a) * 6.5, dmg: 1, k: 'n', t: 60 });
        else if (w === 'spread') for (let i = -1; i <= 1; i++) g.pb.push({ x, y, vx: Math.cos(a + i * 0.2) * 6, vy: Math.sin(a + i * 0.2) * 6, dmg: 1, k: 'n', t: 60 });
        else if (w === 'laser') g.pb.push({ x, y, vx: Math.cos(a) * 9, vy: Math.sin(a) * 9, dmg: 1, k: 'l', t: 50, pierce: true, hit: new Set(), ang: a });
        else if (w === 'homing') { if (main || frame % 2 === 0) g.pb.push({ x, y, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, dmg: 2, k: 'h', t: 120, ang: a }); }
      }
      function updPlayer() {
        const p = g.p;
        if (p.inv > 0) p.inv--;
        let dx = 0, dy = 0;
        if (api.key('ArrowLeft')) dx--; if (api.key('ArrowRight')) dx++;
        if (api.key('ArrowUp')) dy--; if (api.key('ArrowDown')) dy++;
        const s = (dx && dy) ? 1.4 : 1.9;
        p.x = Math.max(10, Math.min(W - 10, p.x + dx * s));
        p.y += dy * s;
        const wx = g.sx + p.x;
        const lo = floorAt(wx) - 9, hiY = Math.max(TOPY + 20, ceilAt(wx) + 22);
        p.y = Math.max(hiY, Math.min(lo, p.y));
        if (dx || dy) p.anim++;
        // rotating the gun (8 steps a second when held)
        const cw = api.key('KeyX'), ccw = api.key('KeyZ');
        if (api.pressed('KeyX')) { p.aim = (p.aim + 1) % NDIR; p.rotT = 12; snd.rot(); }
        else if (api.pressed('KeyZ')) { p.aim = (p.aim + NDIR - 1) % NDIR; p.rotT = 12; snd.rot(); }
        else if (cw || ccw) { if (--p.rotT <= 0) { p.aim = (p.aim + (cw ? 1 : NDIR - 1)) % NDIR; p.rotT = 5; snd.rot(); } }
        if (p.cd > 0) p.cd--;
        if (api.key('Space') && p.cd <= 0) {
          const [ax, ay] = aimVec(p.aim);
          fireFrom(p.x + ax * 14, p.y - 10 + ay * 14, true);
          const sp = satPos(); fireFrom(sp.x, sp.y, false);
          p.cd = { normal: 7, spread: 9, laser: 11, homing: 15 }[g.weapon];
          if (g.weapon === 'laser') snd.laser(); else if (g.weapon === 'homing') snd.missile(); else snd.shot();
        }
        if (api.pressed('KeyA') && g.crush > 0) megaCrush();
      }
      function megaCrush() {
        g.crush--; g.flash = 40; snd.crush();
        for (const e of g.en) damageEnemy(e, 20);
        g.eb = [];
        if (g.boss && g.boss.st === 'fight') damageBoss(10);
      }
      function hurt(n) {
        const p = g.p;
        if (p.inv > 0 || g.phase !== 'play' && g.phase !== 'boss') return;
        if (g.armor > 0) { g.armor--; p.inv = 60; snd.hit(); return; }
        p.vit -= n; p.inv = 45; snd.hurt();
        if (p.vit <= 0) { p.vit = 0; die(); }
      }
      function die() {
        g.phase = 'dying'; g.phaseT = 140; g.prevPhase = g.boss ? 'boss' : 'play';
        g.fx.push({ k: 'big', x: g.p.x, y: g.p.y - 10, t: 0 });
        snd.big(); snd.die();
      }
      function respawn() {
        const p = g.p;
        p.vit = g.maxVit; p.inv = 150; p.x = 60; p.y = 110; g.eb = [];
        g.phase = g.boss ? 'boss' : 'play';
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 300;
        au.melody([[392, .2], [370, .2], [349, .2], [330, .6]], { type: 'square', vol: 0.12 });
      }

      // ---------- enemies ----------
      function bsp() { return Math.min(3, 1.6 + diff() * 0.15); }
      function aimShot(x, y, sp, off) {
        const a = Math.atan2(g.p.y - 10 - y, g.p.x - x) + (off || 0);
        g.eb.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0 });
      }
      function spawnWave() {
        const d = diff();
        const r = Math.random();
        const wx = g.sx + W + 16;
        if (r < 0.35) {
          // sine-wave formation
          const y0 = rnd(50, 150), pal = ri(3), n = 5 + Math.min(3, d);
          for (let i = 0; i < n; i++) g.en.push({ k: 'flyer', x: W + 16 + i * 20, y: y0, y0, ph: i * 0.6, hp: 1, pal, t: -i * 6, w: 12, h: 8, pts: 100 });
        } else if (r < 0.55) {
          const onCeil = Math.random() < 0.4 && ceilAt(wx) > TOPY + 4;
          g.en.push({ k: 'turret', wx, ceil: onCeil, hp: 3, t: 0, cd: 60, w: 14, h: 12, pts: 300 });
        } else if (r < 0.7) {
          for (let i = 0; i < 2 + (d > 1 ? 1 : 0); i++) g.en.push({ k: 'walker', wx: wx + i * 26, y: floorAt(wx + i * 26), vy: 0, hp: 2, t: ri(40), cd: 80 + ri(60), w: 12, h: 12, pts: 200 });
        } else if (r < 0.85) {
          g.en.push({ k: 'pod', x: W + 20, y: rnd(60, 150), hp: 7 + d * 2, t: 0, w: 22, h: 22, pts: 600 });
        } else {
          // swoopers: come from behind
          const n = 3 + Math.min(3, d);
          for (let i = 0; i < n; i++) g.en.push({ k: 'swoop', x: -16 - i * 18, y: rnd(40, 160), hp: 1, pal: 2, t: -i * 8, w: 12, h: 8, pts: 150 });
        }
      }
      function updEnemy(e) {
        e.t++;
        const p = g.p;
        if (e.wx != null) e.x = e.wx - g.sx;
        switch (e.k) {
          case 'flyer':
            if (e.t < 0) return;
            e.x -= 1.6 + diff() * 0.1; e.y = e.y0 + Math.sin(e.t * 0.06 + e.ph) * 30;
            if (e.t % 120 === 60 && Math.random() < 0.4) aimShot(e.x, e.y, bsp());
            break;
          case 'swoop':
            if (e.t < 0) return;
            e.x += 2.4; e.y += Math.sign(p.y - 10 - e.y) * 0.6;
            if (e.t === 70) aimShot(e.x, e.y, bsp());
            if (e.x > W + 30) e.dead = true;
            break;
          case 'turret':
            e.y = e.ceil ? ceilAt(e.wx) + 6 : floorAt(e.wx) - 6;
            if (--e.cd <= 0 && e.x < W - 10 && e.x > 10) { e.cd = Math.max(50, 100 - diff() * 10); aimShot(e.x, e.y, bsp()); if (diff() > 1) { aimShot(e.x, e.y, bsp(), 0.25); aimShot(e.x, e.y, bsp(), -0.25); } }
            break;
          case 'walker': {
            e.wx -= 0.5;
            const fy = floorAt(e.wx);
            if (e.y < fy) { e.vy += 0.25; e.y = Math.min(fy, e.y + e.vy); } else { e.y = fy; e.vy = 0; if (e.t % 90 === 45) e.vy = -4; }
            if (e.vy < 0) e.y += e.vy;
            if (--e.cd <= 0 && e.x < W) { e.cd = 90 + ri(60); aimShot(e.x, e.y - 8, bsp()); }
            break;
          }
          case 'pod':
            e.x -= 0.7; e.y += Math.sin(e.t * 0.03) * 0.6;
            if (e.t % 70 === 0) for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + e.t * 0.01; g.eb.push({ x: e.x, y: e.y, vx: Math.cos(a) * bsp() * 0.7, vy: Math.sin(a) * bsp() * 0.7, t: 0 }); }
            break;
        }
        if (e.x < -40 && e.k !== 'swoop') e.dead = true;
        if (e.k !== 'turret' && e.k !== 'walker' && Math.abs(e.x - p.x) < e.w / 2 + 5 && Math.abs(e.y - (p.y - 10)) < e.h / 2 + 9) hurt(3);
      }
      function damageEnemy(e, n) {
        if (e.dead || e.t < 0) return;
        e.hp -= n; e.flash = 4;
        if (e.hp > 0) { snd.hit(); return; }
        e.dead = true; addScore(e.pts); snd.kill();
        g.fx.push({ k: e.k === 'pod' ? 'big' : 'boom', x: e.x, y: e.y, t: 0 });
        const drop = e.k === 'pod' ? 3 : Math.random() < 0.45 ? 1 : 0;
        for (let i = 0; i < drop; i++) g.zen.push({ x: e.x + rnd(-6, 6), y: e.y + rnd(-6, 6), vx: rnd(-0.5, 0.5) - 0.6, vy: rnd(-1.5, 0), v: e.k === 'pod' ? 100 : [10, 20, 50][ri(3)], t: 0 });
      }

      // ---------- bosses ----------
      function spawnBoss() {
        const k = stg().boss, hpb = { dragon: 70, wargod: 90, emperor: 110 }[k] + g.loop * 30;
        const b = { k, hp: hpb, max: hpb, t: 0, st: 'enter', flash: 0, x: W + 60, y: 110, trail: [], open: 0 };
        if (k === 'wargod') { b.x = W + 80; b.y = 112; }
        if (k === 'emperor') { b.x = W + 90; b.y = 112; b.rot = 0; b.cores = [6, 6, 6, 6]; }
        g.boss = b;
        au.melody([[147, .2], [139, .2], [147, .2], [175, .4], [147, .5]], { type: 'sawtooth', vol: 0.1 });
      }
      function bossParts(b) {
        // returns hit boxes: {x,y,r,weak}
        if (b.k === 'dragon') {
          const out = [{ x: b.x, y: b.y, r: 14, weak: true }];
          for (let i = 1; i <= 14; i++) { const s = b.trail[i * 6]; if (s) out.push({ x: s.x, y: s.y, r: 9 - i * 0.25, weak: false }); }
          return out;
        }
        if (b.k === 'wargod') {
          const out = [{ x: b.x, y: b.y, r: 44, weak: false, body: true }];
          if (b.open > 0.6) out.unshift({ x: b.x - 20, y: b.y + 22, r: 12, weak: true });
          out.push({ x: b.x - 70, y: b.y + Math.sin(b.t * 0.03) * 70, r: 12, weak: false });
          return out;
        }
        const out = [{ x: b.x, y: b.y, r: 16, weak: b.cores.every(c => c <= 0) }];
        for (let i = 0; i < 4; i++) if (b.cores[i] > 0) { const a = b.rot + i * Math.PI / 2; out.push({ x: b.x + Math.cos(a) * 40, y: b.y + Math.sin(a) * 40, r: 9, weak: true, core: i }); }
        return out;
      }
      function updBoss() {
        const b = g.boss, p = g.p, s = bsp();
        b.t++; if (b.flash) b.flash--;
        if (b.st === 'dead') {
          if (b.t % 5 === 0) g.fx.push({ k: 'boom', x: b.x + rnd(-40, 40), y: b.y + rnd(-40, 40), t: 0 });
          if (b.t % 20 === 0) snd.big();
          if (b.t === 140) { g.phase = 'clear'; g.phaseT = 260; g.bonus = 20000 * (g.stage + 1); addScore(g.bonus); g.zenny += 1000; snd.clear(); }
          return;
        }
        if (b.k === 'dragon') {
          const tx = W - 120 + Math.sin(b.t * 0.017) * 110, ty = 112 + Math.sin(b.t * 0.031) * 70;
          if (b.st === 'enter') { b.x += (tx - b.x) * 0.02; b.y += (ty - b.y) * 0.02; if (b.t > 150) b.st = 'fight'; }
          else { b.x = tx; b.y = ty; }
          b.trail.unshift({ x: b.x, y: b.y }); if (b.trail.length > 100) b.trail.pop();
          if (b.st === 'fight' && b.t % 90 === 0) for (let i = -2; i <= 2; i++) aimShot(b.x - 10, b.y, s, i * 0.15);
          if (b.st === 'fight' && b.t % 200 === 100) for (let i = 1; i <= 14; i += 3) { const sg = b.trail[i * 6]; if (sg) aimShot(sg.x, sg.y, s * 0.8); }
        } else if (b.k === 'wargod') {
          if (b.st === 'enter') { b.x -= 0.6; if (b.x <= W - 80) { b.x = W - 80; b.st = 'fight'; b.t = 0; } }
          else {
            const cyc = b.t % 240;
            b.open = cyc > 120 && cyc < 200 ? Math.min(1, (cyc - 120) / 15) : Math.max(0, b.open - 0.08);
            if (cyc > 135 && cyc < 195 && cyc % 8 === 0) { const a = Math.PI + Math.sin(b.t * 0.2) * 0.7; g.eb.push({ x: b.x - 20, y: b.y + 22, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, big: true }); }
            if (cyc === 40 || cyc === 70) for (let i = -1; i <= 1; i++) aimShot(b.x - 30, b.y - 18, s, i * 0.2);
            b.y = 112 + Math.sin(b.t * 0.02) * 10;
          }
          // the swinging fist
          const fx = b.x - 70, fy = b.y + Math.sin(b.t * 0.03) * 70;
          if (Math.abs(fx - p.x) < 16 && Math.abs(fy - (p.y - 10)) < 18) hurt(3);
        } else {
          if (b.st === 'enter') { b.x -= 0.7; if (b.x <= W - 110) { b.x = W - 110; b.st = 'fight'; b.t = 0; } }
          b.rot += 0.012 + (4 - b.cores.filter(c => c > 0).length) * 0.006;
          b.y = 112 + Math.sin(b.t * 0.015) * 40;
          if (b.st === 'fight') {
            for (let i = 0; i < 4; i++) if (b.cores[i] > 0 && (b.t + i * 25) % 100 === 0) { const a = b.rot + i * Math.PI / 2; aimShot(b.x + Math.cos(a) * 40, b.y + Math.sin(a) * 40, s); }
            if (b.t % 160 === 80) for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.eb.push({ x: b.x, y: b.y, vx: Math.cos(a) * s * 0.75, vy: Math.sin(a) * s * 0.75, t: 0 }); }
          }
        }
        // contact
        for (const pt of bossParts(b)) if (!pt.body && Math.hypot(pt.x - p.x, pt.y - (p.y - 10)) < pt.r + 7) hurt(3);
        if (b.k === 'wargod' && p.x > b.x - 46) { p.x = b.x - 46; }
      }
      function damageBoss(n, part) {
        const b = g.boss;
        if (b.st !== 'fight') return;
        if (part && part.core != null) { b.cores[part.core] -= n; b.flash = 4; snd.hit(); if (b.cores[part.core] <= 0) { g.fx.push({ k: 'big', x: part.x, y: part.y, t: 0 }); snd.big(); addScore(2000); } return; }
        b.hp -= n; b.flash = 4; snd.hit();
        if (b.hp <= 0) { b.hp = 0; b.st = 'dead'; b.t = 0; g.eb = []; for (const e of g.en) e.dead = true; addScore(10000); }
      }

      // ---------- shop ----------
      function openShop() { g.phase = 'shop'; g.shopSel = 0; g.shopMsg = 'WELCOME!'; au.melody([[784, .1], [988, .1], [1175, .2]], { type: 'triangle', vol: 0.15 }); }
      function updShop() {
        if (api.pressed('ArrowUp')) { g.shopSel = (g.shopSel + SHOP.length - 1) % SHOP.length; snd.rot(); }
        if (api.pressed('ArrowDown')) { g.shopSel = (g.shopSel + 1) % SHOP.length; snd.rot(); }
        if (api.pressed('KeyX')) { closeShop(); return; }
        if (api.pressed('Space') || api.pressed('Enter')) {
          const it = SHOP[g.shopSel];
          if (it.k === 'exit') { closeShop(); return; }
          if (['normal', 'spread', 'laser', 'homing'].includes(it.k) && g.weapon === it.k) { g.shopMsg = 'YOU HAVE IT'; snd.no(); return; }
          if (it.k === 'armor' && g.armor >= 3) { g.shopMsg = 'ARMOR IS FULL'; snd.no(); return; }
          if (it.k === 'vital' && g.p.vit >= g.maxVit && g.maxVit >= 20) { g.shopMsg = 'YOU ARE FINE'; snd.no(); return; }
          if (g.zenny < it.price) { g.shopMsg = 'NOT ENOUGH ZENNY'; snd.no(); return; }
          g.zenny -= it.price; snd.buy(); g.shopMsg = 'THANK YOU!';
          if (it.k === 'armor') g.armor = Math.min(3, g.armor + 1);
          else if (it.k === 'vital') { g.maxVit = Math.min(20, g.maxVit + 2); g.p.vit = g.maxVit; }
          else if (it.k === 'crush') g.crush = Math.min(5, g.crush + 1);
          else g.weapon = it.k;
        }
      }
      function closeShop() { g.phase = 'play'; g.shopObj = null; g.p.inv = Math.max(g.p.inv, 60); }

      // ---------- update ----------
      function updGame() {
        if (g.phase === 'over') { if (--g.phaseT <= 0 || (g.phaseT < 200 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; } return; }
        if (g.phase === 'cont') return;
        if (g.phase === 'shop') { updShop(); return; }
        if (g.flash > 0) g.flash--;
        for (const f of g.fx) f.t++;
        g.fx = g.fx.filter(f => f.t < (f.k === 'big' ? 40 : 22));
        g.pops = g.pops.filter(pp => (pp.t--, pp.y -= 0.4, pp.t > 0));
        if (g.phase === 'intro') { g.sat.a += 0.05; if (--g.phaseT <= 0) g.phase = 'play'; return; }
        if (g.phase === 'clear') { if (--g.phaseT <= 0) { g.stage++; if (g.stage >= STAGES.length) { g.stage = 0; g.loop++; } startStage(); } return; }
        if (g.phase === 'dying') {
          if (--g.phaseT <= 0) {
            g.lives--; g.armor = 0;
            if (g.lives <= 0) {
              if (api.offerContinue) { g.phase = 'cont'; const cg = g; api.offerContinue(() => { if (g === cg) { g.lives = 3; g.zenny += 500; respawn(); } }, () => { if (g === cg) gameOver(); }); }
              else gameOver();
            } else respawn();
          }
          return;
        }
        const p = g.p;
        // scrolling and spawning
        if (!g.boss) {
          g.sx += 0.75;
          if (g.sx >= stg().len) { g.sx = stg().len; spawnBoss(); g.phase = 'boss'; }
          else {
            g.waveD -= 0.75;
            if (g.waveD <= 0) { spawnWave(); g.waveD = Math.max(70, 150 - diff() * 15) + ri(80); }
            if (g.shops.length && g.sx >= g.shops[0]) { g.shops.shift(); g.shopObj = { x: W + 20, y: 90 + ri(40) }; }
          }
        }
        if (g.shopObj) {
          g.shopObj.x -= 0.75;
          if (g.shopObj.x < -30) g.shopObj = null;
          else if (Math.abs(g.shopObj.x - p.x) < 18 && Math.abs(g.shopObj.y - (p.y - 10)) < 20) { openShop(); return; }
        }
        updPlayer();
        g.sat.a += 0.05;
        for (const e of g.en) if (!e.dead) updEnemy(e);
        if (g.boss) updBoss();
        if (g.phase === 'dying') return;
        // player shots
        for (const b of g.pb) {
          if (b.k === 'h') {
            let best = null, bd = 1e9;
            for (const e of g.en) { if (e.dead || e.t < 0) continue; const d = Math.hypot(e.x - b.x, e.y - b.y); if (d < bd) { bd = d; best = e; } }
            if (!best && g.boss && g.boss.st === 'fight') { const wk = bossParts(g.boss).find(pt => pt.weak) || bossParts(g.boss)[0]; best = wk; }
            if (best) { const want = Math.atan2(best.y - b.y, best.x - b.x); let da = want - b.ang; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; b.ang += Math.max(-0.12, Math.min(0.12, da)); }
            const sp = Math.min(5.5, Math.hypot(b.vx, b.vy) + 0.2);
            b.vx = Math.cos(b.ang) * sp; b.vy = Math.sin(b.ang) * sp;
            if (frame % 3 === 0) g.fx.push({ k: 'puff', x: b.x, y: b.y, t: 10 });
          }
          b.x += b.vx; b.y += b.vy; b.t--;
          if (b.t <= 0 || b.x < -10 || b.x > W + 10 || b.y < TOPY - 10 || b.y > H + 10) { b.dead = true; continue; }
          if (b.y > floorAt(g.sx + b.x) || b.y < ceilAt(g.sx + b.x) - 2) { b.dead = true; g.fx.push({ k: 'spark', x: b.x, y: b.y, t: 12 }); continue; }
          for (const e of g.en) {
            if (e.dead || e.t < 0) continue;
            if (Math.abs(e.x - b.x) < e.w / 2 + 2 && Math.abs(e.y - b.y) < e.h / 2 + 2) {
              if (b.pierce) { if (b.hit.has(e)) continue; b.hit.add(e); damageEnemy(e, b.dmg); }
              else { damageEnemy(e, b.dmg); b.dead = true; break; }
            }
          }
          if (!b.dead && g.boss && g.boss.st === 'fight') {
            for (const pt of bossParts(g.boss)) {
              if (Math.hypot(pt.x - b.x, pt.y - b.y) < pt.r + 2) {
                if (pt.weak) { if (!b.pierce || !b.hit.has(pt.core != null ? 'c' + pt.core : 'boss')) { if (b.pierce) b.hit.add(pt.core != null ? 'c' + pt.core : 'boss'); damageBoss(b.dmg, pt); } if (!b.pierce) b.dead = true; }
                else { b.dead = true; g.fx.push({ k: 'spark', x: b.x, y: b.y, t: 12 }); }
                break;
              }
            }
          }
        }
        g.pb = g.pb.filter(b => !b.dead);
        g.en = g.en.filter(e => !e.dead);
        // enemy shots
        for (const b of g.eb) {
          b.x += b.vx; b.y += b.vy; b.t++;
          if (b.x < -10 || b.x > W + 10 || b.y < TOPY - 10 || b.y > H + 10 || b.t > 500) { b.dead = true; continue; }
          if (Math.abs(b.x - p.x) < (b.big ? 7 : 4) && Math.abs(b.y - (p.y - 10)) < (b.big ? 10 : 8)) { b.dead = true; hurt(2); }
        }
        g.eb = g.eb.filter(b => !b.dead);
        // zenny
        for (const z of g.zen) {
          z.t++; z.vy = Math.min(1.5, z.vy + 0.05); z.x += z.vx; z.y += z.vy;
          const fy = floorAt(g.sx + z.x) - 4; if (z.y > fy) { z.y = fy; z.vy = -z.vy * 0.4; }
          const d = Math.hypot(z.x - p.x, z.y - (p.y - 10));
          if (d < 40) { z.x += (p.x - z.x) * 0.08; z.y += (p.y - 10 - z.y) * 0.08; }
          if (d < 12) { z.dead = true; g.zenny += z.v; snd.zenny(); g.pops.push({ x: z.x, y: z.y, t: 30, s: String(z.v) }); }
          if (z.x < -10 || z.t > 600) z.dead = true;
        }
        g.zen = g.zen.filter(z => !z.dead);
      }
      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') { titleT++; if (api.anyPressed('Enter', 'Space')) tryStart(); return; }
        updGame();
      }

      // ---------- render ----------
      function drawBack(ctx, s, sx) {
        for (let i = 0; i < s.sky.length; i++) { ctx.fillStyle = s.sky[i]; ctx.fillRect(0, Math.floor(i * H / s.sky.length), W, Math.ceil(H / s.sky.length) + 1); }
        // distant ruins/pyramids/towers at 0.3 parallax
        ctx.fillStyle = s.far;
        const off = -Math.floor(sx * 0.3) % 160;
        for (let x = off - 160; x < W + 160; x += 160) {
          if (s.boss === 'wargod') { ctx.beginPath(); ctx.moveTo(x, 190); ctx.lineTo(x + 70, 100); ctx.lineTo(x + 140, 190); ctx.fill(); }
          else if (s.boss === 'emperor') { ctx.fillRect(x + 10, 90, 20, 120); ctx.fillRect(x + 60, 60, 26, 150); ctx.fillRect(x + 110, 110, 16, 100); ctx.fillRect(x + 66, 50, 14, 10); }
          else { ctx.fillRect(x + 10, 110, 30, 110); ctx.fillRect(x + 20, 96, 10, 14); ctx.fillRect(x + 70, 130, 50, 90); ctx.fillRect(x + 84, 120, 20, 10); ctx.fillRect(x + 130, 100, 20, 120); }
        }
        // dust haze
        ctx.fillStyle = 'rgba(255,220,180,0.05)'; ctx.fillRect(0, 150, W, 74);
      }
      function drawTerrain(ctx) {
        const s = stg();
        const x0 = Math.floor(g.sx / 4) * 4;
        for (let wx = x0; wx < g.sx + W + 4; wx += 4) {
          const x = Math.round(wx - g.sx);
          const f = Math.round(floorAt(wx)), c = Math.round(ceilAt(wx));
          ctx.fillStyle = s.ruin; ctx.fillRect(x, f, 4, H - f);
          ctx.fillStyle = s.ruin2; if (((wx >> 4) & 3) === 0) ctx.fillRect(x, f + 6, 4, H - f);
          ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x, f, 4, 2);
          if (((wx >> 3) % 5) === 0) { ctx.fillStyle = s.ruin2; ctx.fillRect(x, f + 12, 3, 5); }
          if (c > TOPY) {
            ctx.fillStyle = s.ruin; ctx.fillRect(x, TOPY, 4, c - TOPY);
            ctx.fillStyle = s.ruin2; ctx.fillRect(x, c - 3, 4, 3);
            if (((wx >> 2) % 7) === 0) { ctx.fillStyle = s.ruin; ctx.fillRect(x + 1, c, 2, 4 + ((wx >> 4) & 3) * 2); }
          }
        }
      }
      function drawPlayer(ctx) {
        const p = g.p;
        if (g.phase === 'dying') return;
        if (p.inv > 0 && (p.inv & 4) && g.phase !== 'intro') return;
        const [ax, ay] = aimVec(p.aim);
        const fi = ax >= -0.01 ? 0 : 1;
        const x = Math.round(p.x), y = Math.round(p.y);
        ctx.drawImage(((p.anim >> 3) & 1 ? HS2 : HS)[fi], x - 8, y - 18);
        // jet flame
        ctx.fillStyle = (frame & 2) ? '#ffd040' : '#ff6020'; ctx.fillRect(fi ? x + 5 : x - 7, y - 5, 2, 3 + (frame & 3));
        // gun barrel along the aim
        const gx = x + (fi ? -1 : 1), gy = y - 10;
        for (let i = 2; i < 13; i++) { ctx.fillStyle = i > 10 ? '#ffffff' : '#808890'; ctx.fillRect(Math.round(gx + ax * i) - 1, Math.round(gy + ay * i) - 1, 3, 3); }
        // satellite
        const sp = satPos();
        const sx = Math.round(sp.x), sy = Math.round(sp.y);
        ctx.fillStyle = '#204060'; ctx.fillRect(sx - 5, sy - 5, 10, 10);
        ctx.fillStyle = '#40a0ff'; ctx.fillRect(sx - 4, sy - 4, 8, 8);
        ctx.fillStyle = '#c0f0ff'; ctx.fillRect(sx - 2, sy - 2, 3, 3);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(sx + ax * 5), Math.round(sy + ay * 5), 2, 2);
        const ra = g.sat.a;
        ctx.fillStyle = '#80d0ff'; ctx.fillRect(Math.round(sx + Math.cos(ra) * 7), Math.round(sy + Math.sin(ra) * 3), 2, 1);
        if (g.armor > 0) { ctx.strokeStyle = 'rgba(120,200,255,0.6)'; ctx.beginPath(); ctx.arc(x, y - 9, 13, 0, Math.PI * 2); ctx.stroke(); }
      }
      function drawEnemy(ctx, e) {
        if (e.t < 0) return;
        const x = Math.round(e.x), y = Math.round(e.y);
        switch (e.k) {
          case 'flyer': case 'swoop': ctx.drawImage(FS[e.pal], x - 6, y - 4); break;
          case 'turret':
            ctx.fillStyle = '#404850'; ctx.fillRect(x - 7, y - 6, 14, 12);
            ctx.fillStyle = '#8890a0'; ctx.fillRect(x - 5, y - 4, 10, 8);
            ctx.fillStyle = '#ff3030'; ctx.fillRect(x - 2, y - 2, 4, 4);
            { const a = Math.atan2(g.p.y - 10 - y, g.p.x - x); ctx.fillStyle = '#c0c8d0'; for (let i = 4; i < 11; i++) ctx.fillRect(Math.round(x + Math.cos(a) * i) - 1, Math.round(y + Math.sin(a) * i) - 1, 2, 2); }
            break;
          case 'walker': ctx.drawImage(WS[1], x - 6, y - 12); break;
          case 'pod':
            ctx.fillStyle = '#603048'; ctx.fillRect(x - 11, y - 9, 22, 18); ctx.fillRect(x - 9, y - 11, 18, 22);
            ctx.fillStyle = '#a05070'; ctx.fillRect(x - 8, y - 7, 16, 14);
            ctx.fillStyle = (frame >> 3) & 1 ? '#ffe040' : '#ff8020'; ctx.fillRect(x - 4, y - 4, 8, 8);
            ctx.fillStyle = '#301020'; for (let i = 0; i < 4; i++) { const a = i * 1.57 + e.t * 0.05; ctx.fillRect(Math.round(x + Math.cos(a) * 12) - 2, Math.round(y + Math.sin(a) * 12) - 2, 4, 4); }
            break;
        }
        if (e.flash) { e.flash--; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(x - e.w / 2, y - e.h / 2, e.w, e.h); }
      }
      function drawBoss(ctx) {
        const b = g.boss; if (!b) return;
        const fl = b.flash & 2;
        if (b.k === 'dragon') {
          for (let i = 14; i >= 1; i--) {
            const s = b.trail[i * 6]; if (!s) continue;
            const r = Math.round(9 - i * 0.25), x = Math.round(s.x), y = Math.round(s.y);
            ctx.fillStyle = '#5a3a20'; ctx.fillRect(x - r, y - r, r * 2, r * 2);
            ctx.fillStyle = i & 1 ? '#a07040' : '#c09050'; ctx.fillRect(x - r + 2, y - r + 2, r * 2 - 4, r * 2 - 4);
            ctx.fillStyle = '#e0c080'; ctx.fillRect(x - 1, y - r - 3, 3, 4);
          }
          const x = Math.round(b.x), y = Math.round(b.y);
          ctx.fillStyle = fl ? '#fff' : '#704828'; ctx.fillRect(x - 18, y - 12, 34, 24);
          ctx.fillStyle = fl ? '#fff' : '#b08050'; ctx.fillRect(x - 24, y - 4, 14, 12); // snout
          ctx.fillStyle = '#f0f0e0'; for (let i = 0; i < 4; i++) ctx.fillRect(x - 24 + i * 3, y + 8, 2, 3);
          ctx.fillStyle = '#ff2020'; ctx.fillRect(x - 10, y - 8, 4, 3);
          ctx.fillStyle = '#e0c080'; ctx.fillRect(x - 2, y - 18, 3, 7); ctx.fillRect(x + 6, y - 20, 3, 9);
        } else if (b.k === 'wargod') {
          const x = Math.round(b.x), y = Math.round(b.y);
          ctx.fillStyle = fl ? '#ffffff' : '#a08040'; ctx.fillRect(x - 46, y - 56, 92, 112);
          ctx.fillStyle = '#806028'; ctx.fillRect(x - 46, y - 56, 92, 14); ctx.fillRect(x + 30, y - 56, 16, 112);
          ctx.fillStyle = '#4060c0'; for (let i = 0; i < 6; i++) ctx.fillRect(x - 46, y - 40 + i * 14, 8, 6);
          ctx.fillStyle = '#201008'; ctx.fillRect(x - 36, y - 26, 18, 8); ctx.fillRect(x - 4, y - 26, 18, 8);
          ctx.fillStyle = (frame >> 3) & 1 ? '#ff3020' : '#ffd040'; ctx.fillRect(x - 32, y - 24, 8, 4); ctx.fillRect(x, y - 24, 8, 4);
          ctx.fillStyle = '#806028'; ctx.fillRect(x - 24, y - 12, 10, 18);
          const mo = Math.round(b.open * 14);
          ctx.fillStyle = '#301008'; ctx.fillRect(x - 36, y + 14, 34, 4 + mo);
          if (mo > 4) { ctx.fillStyle = (frame & 4) ? '#ff4020' : '#ffd040'; ctx.fillRect(x - 26, y + 17, 12, mo - 2); }
          // fist on a chain
          const fx = x - 70, fy = Math.round(b.y + Math.sin(b.t * 0.03) * 70);
          ctx.fillStyle = '#806028'; for (let i = 0; i < 6; i++) ctx.fillRect(Math.round(x - 46 + (fx - x + 46) * i / 6) - 1, Math.round(y + (fy - y) * i / 6) - 1, 3, 3);
          ctx.fillStyle = '#a08040'; ctx.fillRect(fx - 11, fy - 11, 22, 22); ctx.fillStyle = '#806028'; ctx.fillRect(fx - 11, fy - 3, 22, 2);
        } else {
          const x = Math.round(b.x), y = Math.round(b.y);
          ctx.fillStyle = '#30343e'; ctx.fillRect(x - 30, y - 30, 60, 60);
          ctx.fillStyle = '#505868'; ctx.fillRect(x - 26, y - 26, 52, 52);
          ctx.fillStyle = '#30343e'; ctx.fillRect(x - 60, y - 6, 120, 12); ctx.fillRect(x - 6, y - 60, 12, 120);
          const core = b.cores.every(c => c <= 0);
          ctx.fillStyle = fl && core ? '#ffffff' : core ? ((frame >> 2) & 1 ? '#ff3030' : '#ffd040') : '#603030'; ctx.fillRect(x - 12, y - 12, 24, 24);
          for (let i = 0; i < 4; i++) {
            const a = b.rot + i * Math.PI / 2, cx = Math.round(x + Math.cos(a) * 40), cy = Math.round(y + Math.sin(a) * 40);
            ctx.fillStyle = '#707888'; ctx.fillRect(cx - 9, cy - 9, 18, 18);
            ctx.fillStyle = b.cores[i] > 0 ? (fl ? '#ffffff' : '#40e0ff') : '#202020'; ctx.fillRect(cx - 5, cy - 5, 10, 10);
          }
        }
      }
      function drawShots(ctx) {
        for (const b of g.pb) {
          const x = Math.round(b.x), y = Math.round(b.y);
          if (b.k === 'l') { ctx.fillStyle = '#80ffff'; for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(x - Math.cos(b.ang) * i * 3) - 1, Math.round(y - Math.sin(b.ang) * i * 3) - 1, 3, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 1, 2, 2); }
          else if (b.k === 'h') { ctx.fillStyle = '#e0e0e0'; ctx.fillRect(x - 2, y - 2, 4, 4); ctx.fillStyle = '#ff4020'; ctx.fillRect(Math.round(x - Math.cos(b.ang) * 3) - 1, Math.round(y - Math.sin(b.ang) * 3) - 1, 2, 2); }
          else { ctx.fillStyle = '#80c0ff'; ctx.fillRect(x - 2, y - 2, 4, 4); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 1, 2, 2); }
        }
        for (const b of g.eb) {
          const x = Math.round(b.x), y = Math.round(b.y), r = b.big ? 4 : 2;
          ctx.fillStyle = (frame & 2) ? '#ff6020' : '#ffd040'; ctx.fillRect(x - r, y - r, r * 2, r * 2);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 1, 2, 2);
        }
        for (const z of g.zen) {
          if (z.t > 450 && (frame & 4)) continue;
          const x = Math.round(z.x), y = Math.round(z.y), sw = Math.abs(Math.sin(z.t * 0.15)) * 4 + 1;
          ctx.fillStyle = '#2060ff'; ctx.fillRect(Math.round(x - sw), y - 4, Math.round(sw * 2), 8);
          ctx.fillStyle = '#a0d0ff'; ctx.fillRect(x - 1, y - 2, 1, 4);
        }
        for (const f of g.fx) {
          const x = Math.round(f.x), y = Math.round(f.y);
          if (f.k === 'boom' || f.k === 'big') {
            const r = (f.k === 'big' ? 6 : 3) + f.t * (f.k === 'big' ? 1.0 : 0.6);
            ctx.fillStyle = f.t < 6 ? '#ffffff' : f.t < 14 ? '#ffd040' : '#e04010';
            ctx.fillRect(x - r, y - r / 2, r * 2, r); ctx.fillRect(x - r / 2, y - r, r, r * 2);
          } else if (f.k === 'puff') { ctx.fillStyle = 'rgba(220,220,220,0.5)'; ctx.fillRect(x - 1, y - 1, 3, 3); f.t += 1; }
          else { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 1, 2, 2); f.t += 1; }
        }
        for (const pp of g.pops) text(ctx, pp.s, Math.round(pp.x), Math.round(pp.y), '#80c0ff', 1, 'center');
      }
      function drawShopObj(ctx) {
        const s = g.shopObj; if (!s) return;
        const x = Math.round(s.x), y = Math.round(s.y);
        ctx.fillStyle = '#402010'; ctx.fillRect(x - 16, y - 18, 32, 36);
        ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 14, y - 16, 28, 10);
        text(ctx, 'SHOP', x - 11, y - 14, '#802010');
        ctx.fillStyle = (frame >> 4) & 1 ? '#ff60a0' : '#ffa0c0'; ctx.fillRect(x - 6, y - 2, 12, 16);
        ctx.fillStyle = '#201008'; ctx.fillRect(x - 3, y + 2, 6, 12);
      }
      function drawShop(ctx) {
        ctx.fillStyle = '#100818'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#301830'; ctx.fillRect(20, 20, W - 40, H - 40);
        ctx.fillStyle = '#ffd040'; ctx.fillRect(20, 20, W - 40, 2); ctx.fillRect(20, H - 22, W - 40, 2);
        // shopkeeper
        const kx = 60, ky = 60;
        ctx.fillStyle = '#ff80b0'; ctx.fillRect(kx - 18, ky - 22, 36, 30);
        ctx.fillStyle = '#f8c8a0'; ctx.fillRect(kx - 12, ky - 14, 24, 22);
        ctx.fillStyle = '#ff80b0'; ctx.fillRect(kx - 14, ky - 16, 28, 6);
        ctx.fillStyle = '#2040a0'; ctx.fillRect(kx - 8, ky - 6, 4, 4); ctx.fillRect(kx + 4, ky - 6, 4, 4);
        ctx.fillStyle = '#e04060'; ctx.fillRect(kx - 3, ky + 3, 6, 2);
        ctx.fillStyle = '#ffd040'; ctx.fillRect(kx - 16, ky + 8, 32, 30);
        text(ctx, g.shopMsg || '', kx, ky + 46, '#ffffff', 1, 'center');
        text(ctx, 'ZENNY ' + g.zenny, kx, ky + 60, '#80c0ff', 1, 'center');
        text(ctx, 'SHOP', W / 2 + 40, 30, '#ffd040', 2, 'center');
        SHOP.forEach((it, i) => {
          const y = 56 + i * 16, sel = i === g.shopSel;
          if (sel) { ctx.fillStyle = '#603060'; ctx.fillRect(140, y - 3, 216, 13); }
          const owned = ['normal', 'spread', 'laser', 'homing'].includes(it.k) && g.weapon === it.k;
          text(ctx, (sel ? '> ' : '  ') + it.name, 144, y, owned ? '#80ff80' : sel ? '#ffffff' : '#c0a0c0');
          if (it.price) text(ctx, String(it.price), 350, y, g.zenny >= it.price ? '#ffd040' : '#806040', 1, 'right');
        });
        text(ctx, 'ARMOR ' + g.armor + '  CRUSH ' + g.crush + '  VIT ' + g.p.vit + '/' + g.maxVit, W / 2 + 40, 190, '#a0a0c0', 1, 'center');
        text(ctx, 'UP/DOWN SELECT  SPACE BUY  X LEAVE', W / 2, 206, '#808080', 1, 'center');
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, TOPY);
        text(ctx, '1P', 4, 4, '#ff4040'); text(ctx, String(g ? g.score : 0), 70, 4, '#ffffff', 1, 'right');
        text(ctx, 'HI', 120, 4, '#ffd040'); text(ctx, String(hi), 186, 4, '#ffffff', 1, 'right');
        if (mode !== 'game' || !g) return;
        text(ctx, 'Z', 198, 4, '#40a0ff'); text(ctx, String(g.zenny), 248, 4, '#80c0ff', 1, 'right');
        ctx.fillStyle = '#301010'; ctx.fillRect(256, 4, 62, 7);
        ctx.fillStyle = g.p.vit > g.maxVit / 3 ? '#40e040' : '#ff3030'; ctx.fillRect(257, 5, Math.round(60 * g.p.vit / g.maxVit), 5);
        for (let i = 0; i < Math.min(4, g.lives - 1); i++) { ctx.fillStyle = '#e0c040'; ctx.fillRect(324 + i * 7, 4, 5, 7); }
        for (let i = 0; i < g.crush; i++) { ctx.fillStyle = '#ff60a0'; ctx.fillRect(356 + i * 5, 5, 3, 5); }
      }
      function drawTitle(ctx) {
        drawBack(ctx, STAGES[(Math.floor(titleT / 600)) % 3], titleT);
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, H);
        const page = Math.floor(titleT / 400) % 2;
        if (page === 0) {
          text(ctx, 'FORGOTTEN', W / 2 + 2, 38, '#400808', 4, 'center');
          text(ctx, 'FORGOTTEN', W / 2, 36, '#ffd040', 4, 'center');
          text(ctx, 'WORLDS', W / 2 + 2, 74, '#400808', 4, 'center');
          text(ctx, 'WORLDS', W / 2, 72, '#ff6030', 4, 'center');
          ctx.drawImage(HS[0], W / 2 - 16, 112, 32, 34);
          ctx.fillStyle = '#40a0ff'; ctx.fillRect(W / 2 + 26 + Math.round(Math.cos(titleT * 0.05) * 6), 118 + Math.round(Math.sin(titleT * 0.05) * 6), 10, 10);
          text(ctx, 'HI-SCORE ' + hi, W / 2, 160, '#ffffff', 1, 'center');
        } else {
          text(ctx, '- HOW TO PLAY -', W / 2, 30, '#ffd040', 1, 'center');
          ['SPACE: FIRE GUN AND SATELLITE', 'X / Z: ROTATE THE AIM CLOCKWISE / BACK', 'A: MEGA CRUSH SMART BOMB', 'COLLECT BLUE ZENNY FROM ENEMIES', 'FLY INTO THE SHOP TO BUY WEAPONS,', 'ARMOR, VITALITY AND MEGA CRUSH', '', 'DEFEAT THE GODS OF DESTRUCTION!']
            .forEach((l, i) => text(ctx, l, W / 2, 52 + i * 13, i === 7 ? '#ff6030' : '#ffffff', 1, 'center'));
          text(ctx, 'EXTEND EVERY 100000 PTS', W / 2, 160, '#ffd040', 1, 'center');
        }
        const blink = (frame >> 5) & 1;
        if (coinFlash > 0 || api.credits === 0) { if (coinFlash > 0 ? (frame >> 2) & 1 : blink) text(ctx, 'INSERT COIN', W / 2, 184, '#ff4040', 1, 'center'); }
        else if (blink) text(ctx, 'PUSH START', W / 2, 184, '#40ffff', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 10, '#ffffff');
        text(ctx, '\u00a9 1988 CAPCOM', W - 4, H - 10, '#c0c0c0', 1, 'right');
      }
      function render(ctx) {
        if (mode === 'title') { drawTitle(ctx); drawHUD(ctx); return; }
        if (g.phase === 'shop') { drawShop(ctx); drawHUD(ctx); return; }
        drawBack(ctx, stg(), g.sx);
        drawTerrain(ctx);
        drawShopObj(ctx);
        drawBoss(ctx);
        for (const e of g.en) drawEnemy(ctx, e);
        drawPlayer(ctx);
        drawShots(ctx);
        if (g.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (g.flash / 50) + ')'; ctx.fillRect(0, 0, W, H); }
        if (g.boss && g.boss.st !== 'dead') {
          text(ctx, stg().bname, W / 2, TOPY + 4, '#ffd040', 1, 'center');
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 80, TOPY + 13, 160, 5);
          ctx.fillStyle = '#e03020'; ctx.fillRect(W / 2 - 79, TOPY + 14, Math.round(158 * g.boss.hp / g.boss.max), 3);
        }
        drawHUD(ctx);
        if (g.phase === 'intro') { text(ctx, 'STAGE ' + (g.stage + 1), W / 2, 80, '#ffffff', 2, 'center'); text(ctx, stg().name, W / 2, 102, '#ffd040', 1, 'center'); }
        if (g.phase === 'clear') { text(ctx, 'STAGE CLEAR', W / 2, 80, '#ffffff', 2, 'center'); text(ctx, 'BONUS ' + g.bonus + '  +1000 ZENNY', W / 2, 104, '#ffd040', 1, 'center'); }
        if (g.phase === 'over') text(ctx, 'GAME OVER', W / 2, 100, '#ff4040', 2, 'center');
      }
      if (api.debugHook) api.debugHook({ g: () => g, inv: () => { if (g && g.p) g.p.inv = Math.max(g.p.inv, 2); }, sum: () => g && { mode, ph: g.phase, st: g.stage, loop: g.loop, lives: g.lives, sc: g.score, z: g.zenny, sx: g.sx | 0, w: g.weapon, en: g.en.length, boss: g.boss && g.boss.hp } });
      return { update, render, destroy() { } };
    }
  });
})();
