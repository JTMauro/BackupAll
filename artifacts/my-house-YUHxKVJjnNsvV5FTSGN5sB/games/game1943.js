// 1943: The Battle of Midway (Capcom, 1987) \u2014 built-in recreation for the MAME32 Game Room.
// The P-38 runs on an energy bar instead of lives: hits and time drain it, POWs refill it. Shoot power-ups to
// change them (shotgun, 3-way, laser, auto), loop to dodge, Mega Crash with both buttons, and sink battleships.
(function () {
  'use strict';
  const W = 224, H = 256;

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
    ':': '000C0C000C0C00', '/': '00010204081000', "'": '04040000000000', '?': '0E110102040004',
    '\u00a9': '0E11171417110E', '(': '02040808080402', ')': '08040202020408', ',': '000000000C0408',
    '=': '00001F001F0000', '+': '0004041F040400', '%': '18190204081303'
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
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function spr(rows, pal) {
    const h = rows.length, w = Math.max.apply(null, rows.map(r => r.length)), cv = mkCanvas(w, h), c = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) { const p = pal[rows[y][x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } }
    return cv;
  }

  // ================= Sprites =================
  const P38_ART = [
    '........W........',
    '...G....W....G...',
    '..GGG..WWW..GGG..',
    '..GRG..WBW..GRG..',
    'WWGGGWWWWWWWGGGWW',
    'WGGGGWWWWWWWGGGGW',
    '..GGG...W...GGG..',
    '..GGG...W...GGG..',
    '...G.........G...',
    '...G.........G...',
    '..GGG.......GGG..',
    '...O.........O...'];
  const P38 = spr(P38_ART, { W: '#d8d8d0', G: '#9a9a92', B: '#3060d0', R: '#e02020', O: '#ff8020' });
  const P38S = spr(P38_ART, { W: 'rgba(0,0,30,0.35)', G: 'rgba(0,0,30,0.35)', B: 'rgba(0,0,30,0.35)', R: 'rgba(0,0,30,0.35)', O: '' });
  const P38F = spr(P38_ART, { W: '#ffffff', G: '#ffffff', B: '#ffffff', R: '#ffffff', O: '#ffffff' });
  // enemy plane art points DOWN (toward the player)
  const ZERO_ART = [
    '....GGG....',
    '.....G.....',
    'GGGGGGGGGGG',
    'GRGGGGGGGRG',
    'GGGGGGGGGGG',
    '....GGG....',
    '.....G.....',
    '.....C.....',
    '.....W.....'];
  const ZERO = spr(ZERO_ART, { G: '#4a8a4a', R: '#ff2020', C: '#80c0ff', W: '#c0c0c0' });
  const REDZ = spr(ZERO_ART, { G: '#e03030', R: '#ffffff', C: '#80c0ff', W: '#c0c0c0' });
  const ZEROF = spr(ZERO_ART, { G: '#ffffff', R: '#ffffff', C: '#ffffff', W: '#ffffff' });
  const BOMBER_ART = [
    '.........GGG.........',
    '..........G..........',
    '....D.....G.....D....',
    '...DDD...GGG...DDD...',
    'GGGGDGGGGGGGGGGGDGGGG',
    'GGRGGGGGGGGGGGGGGGRGG',
    'GGGGGGGGGGGGGGGGGGGGG',
    '...DDD...GGG...DDD...',
    '....D....GGG....D....',
    '.........GGG.........',
    '.........GCG.........',
    '.........GGG.........',
    '..........W..........'];
  const BOMBER = spr(BOMBER_ART, { G: '#6a7a50', D: '#3a4030', R: '#ff2020', C: '#80c0ff', W: '#e0e0e0' });
  const BOMBERF = spr(BOMBER_ART, { G: '#ffffff', D: '#ffd0d0', R: '#ffffff', C: '#ffffff', W: '#ffffff' });
  const ICONS = ['POW', 'S', '3W', 'L', 'A'];
  const ICON_COL = { POW: '#ff3030', S: '#40c040', '3W': '#4080ff', L: '#ffd020', A: '#c060ff' };
  const WNAME = { S: 'SHOTGUN', '3W': '3-WAY', L: 'LASER', A: 'AUTO' };

  ArcadeRegistry.register({
    id: 'game1943', title: '1943', year: 1987, maker: 'Capcom',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Space: fire \u00b7 X: loop \u00b7 Space+X (or Z): Mega Crash \u00b7 Enter: start',
    marquee: { bg: '#0a2a5a', fg: '#ffd020', accent: '#ff3020' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(50000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0;
      let g = null, scroll = 0;

      const sfx = {
        shot() { au.tone(1400, 0.03, { type: 'square', vol: 0.04, slideTo: 900 }); },
        laser() { au.tone(2000, 0.04, { type: 'sawtooth', vol: 0.04, slideTo: 1200 }); },
        hit() { au.tone(300, 0.03, { type: 'square', vol: 0.05 }); },
        boom() { au.noise(0.3, { vol: 0.18, freq: 1200, slideTo: 100 }); },
        big() { au.noise(0.8, { vol: 0.25, freq: 800, slideTo: 50 }); },
        ouch() { au.tone(200, 0.15, { type: 'sawtooth', vol: 0.12, slideTo: 80 }); },
        pick() { au.melody([[880, .05], [1175, .05], [1760, .1]], { type: 'square', vol: 0.1 }); },
        change() { au.tone(1600, 0.04, { type: 'square', vol: 0.06 }); },
        loop() { au.tone(400, 0.5, { type: 'triangle', vol: 0.1, slideTo: 900 }); },
        crash() { au.noise(1.0, { vol: 0.3, freq: 5000, slideTo: 200 }); au.tone(80, 0.8, { type: 'sawtooth', vol: 0.12, slideTo: 40 }); },
        warn() { au.melody([[880, .15], [0, .05], [880, .15], [0, .05], [880, .15]], { type: 'square', vol: 0.09 }); },
        start() { au.melody([[523, .12], [523, .06], [659, .12], [784, .12], [1047, .24], [784, .12], [1047, .4]], { type: 'square', vol: 0.11 }); },
        clear() { au.melody([[659, .1], [784, .1], [988, .1], [1319, .3], [988, .1], [1319, .4]], { type: 'square', vol: 0.12 }); }
      };

      // ================= Background =================
      function drawOcean(ctx, sc) {
        ctx.fillStyle = '#1658a8'; ctx.fillRect(0, 0, W, H);
        const off = sc % 8;
        for (let r = -1; r < H / 8 + 1; r++) {
          const wy = Math.floor(sc / 8) - r, y = Math.round(r * 8 + off);
          for (let k = 0; k < 4; k++) {
            const x = (hash(wy * 31 + k) * W) | 0, l = 3 + (hash(wy * 17 + k) * 6 | 0);
            ctx.fillStyle = k & 1 ? '#2a6ab8' : '#5a90d8'; ctx.fillRect(x, y, l, 1);
          }
        }
      }
      function drawClouds(ctx, sc) {
        const seg = 240, s2 = sc * 1.8, base = Math.floor(s2 / seg);
        for (let i = base - 1; i <= base + 1; i++) {
          if (hash(i * 11 + 5) < 0.45) continue;
          const x = hash(i * 3 + 9) * W, y = s2 - i * seg - 30;
          if (y < -40 || y > H + 40) continue;
          ctx.fillStyle = 'rgba(255,255,255,0.32)';
          for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(x + (k - 2.5) * 10, y + Math.sin(k * 2) * 5, 10 + (k & 1) * 5, 0, Math.PI * 2); ctx.fill(); }
        }
      }

      // ================= State =================
      function newGame() {
        g = { score: 0, stage: 0, energy: 100, maxE: 100, weapon: null, wTime: 0, nextIcon: 0 };
        startStage();
        sfx.start();
      }
      function diff() { return g.stage * 0.6; }
      function startStage() {
        g.en = []; g.eb = []; g.pb = []; g.items = []; g.booms = []; g.pops = []; g.ships = [];
        g.t = 0; g.len = 2700 + Math.min(6, g.stage) * 200; g.waveT = 60; g.boss = null; g.kills = 0; g.spawned = 0;
        g.naval = g.stage % 2 === 1;
        g.p = { x: W / 2, y: H - 50, inv: 90, cool: 0, loop: 0, loopCD: 0, alive: true };
        g.phase = 'ready'; g.phaseT = 150; g.flash = 0; g.groups = {}; g.gid = 1;
        g.shipT = 500;
      }
      function addScore(n) { g.score += n; if (g.score > hi) { hi = g.score; api.setHiScore(hi); } }
      function boom(x, y, big) { g.booms.push({ x, y, t: 0, big: !!big }); }
      function pop(x, y, n) { g.pops.push({ x, y, n, t: 50 }); }

      // ================= Enemies =================
      function addEn(e) { e.t = 0; e.flash = 0; e.hp = e.hp || 1; g.en.push(e); g.spawned++; return e; }
      function spawnWave() {
        const d = diff(), r = Math.random();
        if (r < 0.28) {
          // line of zeros diving from the top and peeling off
          const x0 = 30 + Math.random() * (W - 60), side = x0 < W / 2 ? 1 : -1, n = 4 + Math.floor(Math.random() * 2);
          for (let i = 0; i < n; i++) addEn({ k: 'zero', x: x0, y: -12 - i * 18, vx: 0, vy: 1.6 + d * 0.08, turn: side, delay: 0, pat: 'dive', pts: 100 });
        } else if (r < 0.48) {
          // red formation: wipe them all out for a POW
          const gid = g.gid++, n = 5, left = Math.random() < 0.5;
          g.groups[gid] = { n, killed: 0 };
          for (let i = 0; i < n; i++) addEn({ k: 'red', x: left ? -12 - i * 18 : W + 12 + i * 18, y: 50 + Math.random() * 10, vx: (left ? 1 : -1) * (1.6 + d * 0.05), vy: 0, pat: 'wave', ph: i * 0.5, gid, pts: 200 });
        } else if (r < 0.64) {
          // from the sides in a curve
          const left = Math.random() < 0.5;
          for (let i = 0; i < 3; i++) addEn({ k: 'zero', x: left ? -10 : W + 10, y: 30 + i * 22, vx: (left ? 1 : -1) * 1.8, vy: 0.4, pat: 'side', pts: 100 });
        } else if (r < 0.78) {
          // planes from behind
          for (let i = 0; i < 3; i++) addEn({ k: 'zero', x: 30 + i * 20 + Math.random() * 100, y: H + 12 + i * 16, vx: 0, vy: -2.2 - d * 0.05, pat: 'behind', pts: 150 });
        } else if (r < 0.9 || g.stage === 0) {
          addEn({ k: 'bomber', x: 30 + Math.random() * (W - 60), y: -20, vx: 0, vy: 0.55, pat: 'bomber', hp: 10 + Math.floor(d * 2), pts: 1500, fireT: 60 });
        } else {
          for (let i = 0; i < 2; i++) addEn({ k: 'bomber', x: 50 + i * 120, y: -20 - i * 30, vx: 0, vy: 0.55, pat: 'bomber', hp: 10 + Math.floor(d * 2), pts: 1500, fireT: 60 + i * 30 });
        }
      }
      function spawnShip(boss) {
        const sh = { x: boss ? W / 2 : 40 + Math.random() * (W - 80), y: boss ? -170 : -70, len: boss ? 170 : 64, w: boss ? 36 : 18, boss: !!boss, turrets: [], sink: 0, t: 0, flash: 0 };
        const tn = boss ? 6 : 2;
        for (let i = 0; i < tn; i++) {
          const fy = boss ? 22 + i * 22 : 14 + i * 32;
          const fx = boss ? (i % 2 ? 9 : -9) : 0;
          sh.turrets.push({ ox: fx, oy: fy + (boss && i >= 3 ? 20 : 0), hp: boss ? 6 + Math.floor(diff()) : 3, fireT: 60 + i * 23, dead: false, flash: 0 });
        }
        sh.core = { ox: 0, oy: boss ? 86 : 40, hp: boss ? 40 + Math.floor(diff() * 8) : 8, max: 0, dead: false, flash: 0 };
        sh.core.max = sh.core.hp;
        g.ships.push(sh);
        if (boss) g.boss = { kind: 'ship', ship: sh };
        g.spawned += tn + 1;
        return sh;
      }
      function spawnAirBoss() {
        const hp = 60 + Math.floor(diff() * 12);
        const b = { kind: 'air', x: W / 2, y: -50, vx: 0.5, t: 0, hp, max: hp, flash: 0, guns: [], dead: 0 };
        for (const ox of [-36, -20, 20, 36]) b.guns.push({ ox, oy: 6, hp: 8 + Math.floor(diff() * 2), dead: false, fireT: 40 + Math.random() * 60, flash: 0 });
        g.boss = b; g.spawned += 5;
      }
      function aim(x, y, sp, spread) {
        const p = g.p; const a = Math.atan2(p.y - y, p.x - x) + (spread || 0);
        g.eb.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
      }
      function bspeed() { return 1.5 + Math.min(1.3, diff() * 0.12); }
      function updEnemies() {
        const p = g.p, d = diff();
        for (const e of g.en) {
          e.t++; if (e.flash > 0) e.flash--;
          if (e.pat === 'dive') {
            if (e.y > 70 + (e.turn > 0 ? 0 : 10)) { e.vx += e.turn * 0.06; e.vy = Math.max(0.6, e.vy - 0.02); }
            if (e.t === 40 && Math.random() < 0.35 + d * 0.04) aim(e.x, e.y, bspeed());
          } else if (e.pat === 'wave') {
            e.vy = Math.sin(e.t * 0.05 + e.ph) * 1.2;
            if (e.t === 60 && Math.random() < 0.3 + d * 0.04) aim(e.x, e.y, bspeed());
          } else if (e.pat === 'side') {
            e.vy += 0.012; if (e.t === 50 && Math.random() < 0.5) aim(e.x, e.y, bspeed());
          } else if (e.pat === 'behind') {
            if (e.y < 80) e.vy += 0.08;
            if (e.vy > 0 && !e.shot) { e.shot = true; if (Math.random() < 0.4 + d * 0.04) aim(e.x, e.y, bspeed()); }
          } else if (e.pat === 'bomber') {
            if (e.y > 70) e.vy = 0.25;
            e.vx = Math.sin(e.t * 0.02) * 0.4;
            if (--e.fireT <= 0) { e.fireT = Math.max(45, 100 - d * 8); for (let i = -1; i <= 1; i++) aim(e.x, e.y + 6, bspeed() * 0.9, i * 0.25); }
          }
          e.x += e.vx; e.y += e.vy;
          e.ang = Math.atan2(e.vy, e.vx) - Math.PI / 2;
          if (e.t > 30 && (e.y > H + 30 || e.y < -60 || e.x < -40 || e.x > W + 40)) { e.gone = true; if (e.gid) g.groups[e.gid].broken = true; }
          if (p.alive && !p.loop && p.inv <= 0) {
            const r = e.k === 'bomber' ? 14 : 7;
            if (Math.abs(e.x - p.x) < r + 4 && Math.abs(e.y - p.y) < r) { hurt(16); damageEn(e, 5); }
          }
        }
        g.en = g.en.filter(e => !e.gone);
        // ships
        for (const sh of g.ships) {
          sh.t++;
          if (sh.flash > 0) sh.flash--;
          sh.y += sh.boss ? (sh.y < 10 ? 0.7 : 0) : 0.5;
          if (sh.sink) { sh.sink++; if (sh.sink > 160) sh.gone = true; continue; }
          for (const tu of sh.turrets) {
            if (tu.dead) continue;
            if (tu.flash > 0) tu.flash--;
            const tx = sh.x + tu.ox, ty = sh.y + tu.oy;
            if (ty > 0 && ty < H - 30 && --tu.fireT <= 0) { tu.fireT = Math.max(50, 120 - d * 10) + Math.random() * 40; aim(tx, ty, bspeed() * 0.9); }
          }
          if (sh.boss && sh.core.flash > 0) sh.core.flash--;
          if (sh.boss && !sh.core.dead && sh.y >= 10 && sh.t % Math.max(60, 130 - Math.floor(d * 10)) === 0) {
            const cx = sh.x, cy = sh.y + sh.core.oy;
            for (let i = -2; i <= 2; i++) aim(cx, cy, bspeed() * 0.8, i * 0.22);
          }
          if (!sh.boss && sh.y > H + 20) sh.gone = true;
        }
        g.ships = g.ships.filter(s => !s.gone);
      }
      function damageEn(e, dmg) {
        e.hp -= dmg; e.flash = 4;
        if (e.hp <= 0 && !e.gone) {
          e.gone = true; g.kills++; addScore(e.pts); boom(e.x, e.y, e.k === 'bomber');
          if (e.k === 'bomber') { pop(e.x, e.y, e.pts); sfx.big(); if (Math.random() < 0.5) dropItem(e.x, e.y); } else sfx.boom();
          if (e.gid) {
            const grp = g.groups[e.gid]; grp.killed++;
            if (grp.killed >= grp.n) { dropItem(e.x, e.y); pop(e.x, e.y - 8, 'POW'); }
          }
        } else sfx.hit();
      }
      function dropItem(x, y) {
        const k = ICONS[g.nextIcon % ICONS.length]; g.nextIcon++;
        g.items.push({ x, y, k: g.nextIcon % 3 === 0 ? 'POW' : k, vy: 0.5, t: 0, hits: 0 });
      }
      function damageShipPart(sh, part, dmg) {
        if (part.dead) return;
        part.hp -= dmg; part.flash = 4;
        if (part.hp <= 0) {
          part.dead = true; g.kills++;
          const x = sh.x + part.ox, y = sh.y + part.oy;
          if (part === sh.core) {
            const pts = sh.boss ? 20000 : 3000;
            addScore(pts); pop(x, y, pts); sfx.big();
            for (let i = 0; i < 8; i++) boom(sh.x + (Math.random() - 0.5) * sh.w, sh.y + Math.random() * sh.len, true);
            sh.sink = 1;
            for (const tu of sh.turrets) tu.dead = true;
            if (!sh.boss) dropItem(x, y);
          } else { addScore(sh.boss ? 1000 : 500); boom(x, y, false); sfx.boom(); }
        } else sfx.hit();
      }
      function updBoss() {
        const b = g.boss;
        if (!b) return;
        if (b.kind === 'ship') {
          if (b.ship.sink && b.ship.sink > 120 && g.phase === 'play') bossDown();
          return;
        }
        b.t++; if (b.flash > 0) b.flash--;
        if (b.dead) { b.dead++; if (b.dead % 6 === 0) boom(b.x + (Math.random() - 0.5) * 80, b.y + (Math.random() - 0.5) * 30, true); if (b.dead > 120) { g.boss = null; bossDown(); } return; }
        if (b.y < 50) b.y += 0.5;
        b.x += b.vx; if (b.x < 60 || b.x > W - 60) b.vx = -b.vx;
        const d = diff();
        for (const gn of b.guns) {
          if (gn.dead) continue; if (gn.flash > 0) gn.flash--;
          if (--gn.fireT <= 0) { gn.fireT = Math.max(40, 100 - d * 8) + Math.random() * 30; aim(b.x + gn.ox, b.y + gn.oy, bspeed()); }
        }
        if (b.t % Math.max(70, 150 - Math.floor(d * 10)) === 0) for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + b.t * 0.01; g.eb.push({ x: b.x, y: b.y + 10, vx: Math.cos(a) * 1.3, vy: Math.sin(a) * 1.3 + 0.4 }); }
        const p = g.p;
        if (p.alive && !p.loop && p.inv <= 0 && Math.abs(p.x - b.x) < 50 && Math.abs(p.y - b.y) < 12) hurt(16);
      }
      function bossDown() {
        g.phase = 'clear'; g.phaseT = 300; g.eb = [];
        const ratio = g.spawned ? Math.min(100, Math.round(g.kills / g.spawned * 100)) : 0;
        g.ratio = ratio; g.bonus = ratio * 100 * (1 + Math.floor(g.stage / 2));
        addScore(g.bonus); sfx.clear();
      }

      // ================= Player =================
      function hurt(n) {
        const p = g.p;
        if (!p.alive || p.loop || p.inv > 0) return;
        g.energy -= n; p.inv = 40; sfx.ouch(); g.flash = 4;
        if (g.energy <= 0) { g.energy = 0; p.alive = false; boom(p.x, p.y, true); sfx.big(); g.phase = 'dead'; g.phaseT = 150; }
      }
      function fire() {
        const p = g.p, w = g.weapon;
        if (w === 'S') {
          for (let i = -3; i <= 3; i++) { const a = -Math.PI / 2 + i * 0.16; g.pb.push({ x: p.x, y: p.y - 8, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, life: 18, dmg: 1, k: 's', cancel: true }); }
          p.cool = 13; sfx.shot();
        } else if (w === '3W') {
          for (const a of [-0.22, 0, 0.22]) { const an = -Math.PI / 2 + a; g.pb.push({ x: p.x - 3, y: p.y - 8, vx: Math.cos(an) * 6, vy: Math.sin(an) * 6, life: 60, dmg: 1, k: 'b' }); g.pb.push({ x: p.x + 3, y: p.y - 8, vx: Math.cos(an) * 6, vy: Math.sin(an) * 6, life: 60, dmg: 1, k: 'b' }); }
          p.cool = 9; sfx.shot();
        } else if (w === 'L') {
          g.pb.push({ x: p.x, y: p.y - 10, vx: 0, vy: -9, life: 40, dmg: 1, k: 'l', pierce: true, hitSet: [] });
          p.cool = 5; sfx.laser();
        } else if (w === 'A') {
          g.pb.push({ x: p.x - 4, y: p.y - 8, vx: 0, vy: -7.5, life: 50, dmg: 1, k: 'b' }); g.pb.push({ x: p.x + 4, y: p.y - 8, vx: 0, vy: -7.5, life: 50, dmg: 1, k: 'b' });
          p.cool = 4; sfx.shot();
        } else {
          g.pb.push({ x: p.x - 3, y: p.y - 8, vx: 0, vy: -6, life: 60, dmg: 1, k: 'b' }); g.pb.push({ x: p.x + 3, y: p.y - 8, vx: 0, vy: -6, life: 60, dmg: 1, k: 'b' });
          p.cool = 8; sfx.shot();
        }
      }
      function megaCrash() {
        if (g.energy <= 12) { au.tone(100, 0.1, { type: 'square', vol: 0.08 }); return; }
        g.energy -= 10; g.crash = 50; sfx.crash();
        g.eb = [];
        for (const e of g.en) damageEn(e, 12);
        for (const sh of g.ships) { if (sh.y > -20 && sh.y < H) { for (const tu of sh.turrets) damageShipPart(sh, tu, 6); if (!sh.boss) damageShipPart(sh, sh.core, 6); else damageShipPart(sh, sh.core, 6); } }
        const b = g.boss;
        if (b && b.kind === 'air' && !b.dead) { for (const gn of b.guns) if (!gn.dead) { gn.hp -= 6; if (gn.hp <= 0) { gn.dead = true; addScore(1000); boom(b.x + gn.ox, b.y + gn.oy); } } b.hp -= 8; b.flash = 6; if (b.hp <= 0) killAirBoss(b); }
      }
      function killAirBoss(b) { b.dead = 1; addScore(30000); pop(b.x, b.y, 30000); sfx.big(); g.eb = []; g.kills += 1; }
      function updPlayer() {
        const p = g.p;
        if (p.inv > 0) p.inv--;
        if (p.cool > 0) p.cool--;
        if (p.loopCD > 0) p.loopCD--;
        const sp = 1.8;
        if (api.key('ArrowLeft')) p.x -= sp; if (api.key('ArrowRight')) p.x += sp;
        if (api.key('ArrowUp')) p.y -= sp; if (api.key('ArrowDown')) p.y += sp;
        p.x = Math.max(10, Math.min(W - 10, p.x)); p.y = Math.max(30, Math.min(H - 24, p.y));
        if (p.loop) { p.loop--; return; }
        const both = (api.pressed('KeyX') && api.key('Space')) || (api.pressed('Space') && api.key('KeyX')) || api.pressed('KeyZ');
        if (both) { megaCrash(); p.cool = 20; return; }
        if (api.pressed('KeyX') && p.loopCD <= 0) { p.loop = 60; p.loopCD = 90; sfx.loop(); return; }
        if (api.key('Space') && p.cool <= 0) fire();
      }
      function updShots() {
        const p = g.p;
        for (const b of g.pb) {
          b.x += b.vx; b.y += b.vy; b.life--;
          if (b.life <= 0 || b.y < -10 || b.x < -10 || b.x > W + 10) { b.dead = true; continue; }
          if (b.cancel) for (const eb of g.eb) if (Math.abs(eb.x - b.x) < 5 && Math.abs(eb.y - b.y) < 6) eb.dead = true;
          const hitR = b.k === 's' ? 9 : 7;
          for (const e of g.en) {
            if (e.gone || b.dead) continue;
            const r = e.k === 'bomber' ? 13 : hitR;
            if (Math.abs(e.x - b.x) < r && Math.abs(e.y - b.y) < (e.k === 'bomber' ? 9 : 7)) {
              if (b.pierce) { if (b.hitSet.includes(e)) continue; b.hitSet.push(e); damageEn(e, 2); }
              else { damageEn(e, b.dmg); b.dead = true; }
            }
          }
          for (const sh of g.ships) {
            if (b.dead || sh.sink) continue;
            for (const part of sh.turrets.concat([sh.core])) {
              if (part.dead || b.dead) continue;
              const px = sh.x + part.ox, py = sh.y + part.oy, rr = part === sh.core ? 9 : 6;
              if (Math.abs(px - b.x) < rr && Math.abs(py - b.y) < rr) {
                if (b.pierce) { if (b.hitSet.includes(part)) continue; b.hitSet.push(part); damageShipPart(sh, part, 2); }
                else { damageShipPart(sh, part, b.dmg); b.dead = true; }
              }
            }
          }
          const bs = g.boss;
          if (bs && bs.kind === 'air' && !bs.dead && !b.dead) {
            for (const gn of bs.guns) {
              if (gn.dead || b.dead) continue;
              if (Math.abs(bs.x + gn.ox - b.x) < 6 && Math.abs(bs.y + gn.oy - b.y) < 6) {
                if (b.pierce) { if (b.hitSet.includes(gn)) continue; b.hitSet.push(gn); } else b.dead = true;
                gn.hp -= b.pierce ? 2 : b.dmg; gn.flash = 4; sfx.hit();
                if (gn.hp <= 0) { gn.dead = true; addScore(1000); pop(bs.x + gn.ox, bs.y + gn.oy, 1000); boom(bs.x + gn.ox, bs.y + gn.oy); sfx.boom(); }
              }
            }
            if (!b.dead && Math.abs(bs.x - b.x) < 12 && Math.abs(bs.y - b.y) < 14 && !(b.pierce && b.hitSet.includes(bs))) {
              if (b.pierce) b.hitSet.push(bs); else b.dead = true;
              bs.hp -= b.pierce ? 2 : b.dmg; bs.flash = 4; sfx.hit();
              if (bs.hp <= 0) killAirBoss(bs);
            }
          }
          for (const it of g.items) {
            if (b.dead || b.pierce) continue;
            if (Math.abs(it.x - b.x) < 8 && Math.abs(it.y - b.y) < 8) {
              b.dead = true; it.hits++;
              if (it.hits % 3 === 0) { it.k = ICONS[(ICONS.indexOf(it.k) + 1) % ICONS.length]; sfx.change(); }
              it.vy = -0.6;
            }
          }
        }
        g.pb = g.pb.filter(b => !b.dead);
        for (const b of g.eb) {
          b.x += b.vx; b.y += b.vy;
          if (b.y < -10 || b.y > H + 10 || b.x < -10 || b.x > W + 10) { b.dead = true; continue; }
          if (p.alive && !p.loop && p.inv <= 0 && Math.abs(b.x - p.x) < 4 && Math.abs(b.y - p.y) < 5) { b.dead = true; hurt(5 + Math.floor(diff() * 0.5)); }
        }
        g.eb = g.eb.filter(b => !b.dead);
        for (const it of g.items) {
          it.t++; it.vy = Math.min(0.7, it.vy + 0.02); it.y += it.vy; it.x += Math.sin(it.t * 0.05) * 0.4;
          if (it.y > H + 10) it.gone = true;
          if (p.alive && Math.abs(it.x - p.x) < 11 && Math.abs(it.y - p.y) < 10) {
            it.gone = true; sfx.pick();
            if (it.k === 'POW') { g.energy = Math.min(g.maxE, g.energy + 24); pop(it.x, it.y, 'ENERGY'); }
            else { g.weapon = it.k; g.wTime = 1500; g.energy = Math.min(g.maxE, g.energy + 4); pop(it.x, it.y, WNAME[it.k]); }
            addScore(500);
          }
        }
        g.items = g.items.filter(it => !it.gone);
      }

      function updPlay() {
        g.t++;
        // energy slowly drains
        if (g.t % 100 === 0) { g.energy--; if (g.energy <= 0) { g.energy = 1; hurt(1); } }
        if (g.weapon && --g.wTime <= 0) { g.weapon = null; }
        if (g.crash > 0) g.crash--;
        if (g.flash > 0) g.flash--;
        updPlayer();
        if (!g.boss) {
          if (g.t < g.len) {
            if (--g.waveT <= 0) { g.waveT = Math.max(55, 120 - diff() * 8) + Math.random() * 40; spawnWave(); }
            if (g.naval && --g.shipT <= 0) { g.shipT = 420 + Math.random() * 200; spawnShip(false); }
          } else if (g.t === g.len) { g.warn = 180; sfx.warn(); }
          else if (g.t === g.len + 200) { if (g.naval) spawnShip(true); else spawnAirBoss(); }
        } else if (g.boss.kind === 'air' && g.t % 160 === 0 && g.en.length < 4) spawnWave();
        if (g.warn > 0) g.warn--;
        updEnemies();
        updBoss();
        updShots();
      }

      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        scroll += 0.5;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { mode = 'game'; newGame(); }
            else { coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 }); }
          }
          return;
        }
        for (const b of g.booms) { b.t++; if (g.naval) b.y += 0.5; }
        g.booms = g.booms.filter(b => b.t < (b.big ? 40 : 24));
        for (const q of g.pops) q.t--;
        g.pops = g.pops.filter(q => q.t > 0);
        switch (g.phase) {
          case 'ready':
            updPlayer();
            if (--g.phaseT <= 0) g.phase = 'play';
            break;
          case 'play': updPlay(); break;
          case 'clear':
            updPlayer();
            for (const sh of g.ships) { sh.y += 0.5; if (sh.sink) sh.sink++; }
            if (--g.phaseT <= 0) {
              g.stage++; g.energy = Math.min(g.maxE, g.energy + 30);
              startStage();
            }
            break;
          case 'dead':
            updEnemies(); updShots();
            if (--g.phaseT <= 0) {
              g.phase = 'wait';
              const cg = g;
              if (api.offerContinue) api.offerContinue(() => { if (g === cg) { g.energy = g.maxE; g.p.alive = true; g.p.inv = 120; g.phase = 'play'; g.eb = []; } }, () => { if (g === cg) gameOver(); });
              else gameOver();
            }
            break;
          case 'over':
            if (--g.phaseT <= 0 || (g.phaseT < 200 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; }
            break;
        }
      }
      function gameOver() { g.phase = 'over'; g.phaseT = 300; au.melody([[392, .25], [370, .25], [349, .25], [330, .6]], { type: 'square', vol: 0.12 }); }

      // ================= Rendering =================
      function disc(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
      function drawPlayer(ctx) {
        const p = g.p;
        if (!p.alive) return;
        if (p.inv > 0 && (p.inv >> 2) & 1 && g.phase === 'play') return;
        const x = Math.round(p.x), y = Math.round(p.y);
        if (p.loop) {
          const f = (60 - p.loop) / 60, sy = Math.cos(f * Math.PI * 2), sc = 1 + Math.sin(f * Math.PI) * 0.5;
          ctx.drawImage(P38S, x - 8 + 10, y - 6 + 14);
          ctx.save(); ctx.translate(x, y - Math.sin(f * Math.PI) * 10); ctx.scale(sc, sy * sc || 0.1); ctx.drawImage(P38, -8, -6); ctx.restore();
          return;
        }
        ctx.drawImage(P38S, x - 8 + 8, y - 6 + 12);
        ctx.drawImage(g.flash > 0 ? P38F : P38, x - 8, y - 6);
        if ((frame >> 1) & 1) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 6, y - 4, 3, 1); ctx.fillRect(x + 3, y - 4, 3, 1); }
      }
      function drawEnemy(ctx, e) {
        const im = e.flash > 0 ? (e.k === 'bomber' ? BOMBERF : ZEROF) : e.k === 'bomber' ? BOMBER : e.k === 'red' ? REDZ : ZERO;
        ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y));
        if (e.k !== 'bomber') ctx.rotate(e.ang || 0);
        ctx.drawImage(im, -Math.floor(im.width / 2), -Math.floor(im.height / 2));
        ctx.restore();
      }
      function drawShip(ctx, sh) {
        const x = Math.round(sh.x), y = Math.round(sh.y), w = sh.w, L = sh.len;
        if (y > H + 10 || y + L < -10) return;
        ctx.save();
        if (sh.sink) { ctx.globalAlpha = Math.max(0, 1 - sh.sink / 160); }
        // wake
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x - w / 2 - 3, y + L - 4, w + 6, 10);
        ctx.fillStyle = '#4a5260';
        ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + w / 2, y + 12); ctx.lineTo(x + w / 2, y + L - 6); ctx.lineTo(x + w / 2 - 4, y + L); ctx.lineTo(x - w / 2 + 4, y + L); ctx.lineTo(x - w / 2, y + L - 6); ctx.lineTo(x - w / 2, y + 12); ctx.fill();
        ctx.fillStyle = '#6a7280'; ctx.fillRect(x - w / 2 + 3, y + 10, w - 6, L - 16);
        ctx.fillStyle = '#5a6270'; for (let i = 14; i < L - 8; i += 6) ctx.fillRect(x - w / 2 + 3, y + i, w - 6, 1);
        const c = sh.core;
        // superstructure / core
        ctx.fillStyle = c.dead ? '#2a2a2a' : (c.flash > 0 ? '#ffffff' : '#8a8a90');
        ctx.fillRect(x - 7, y + c.oy - 10, 14, 20);
        if (!c.dead) { ctx.fillStyle = (frame >> 3) & 1 ? '#ff3030' : '#ffd020'; ctx.fillRect(x - 3, y + c.oy - 3, 6, 6); }
        ctx.fillStyle = '#3a3a40'; ctx.fillRect(x - 3, y + c.oy - 16, 6, 6);
        for (const tu of sh.turrets) {
          const tx = x + tu.ox, ty = y + tu.oy;
          if (tu.dead) { ctx.fillStyle = '#2a2a2a'; ctx.fillRect(tx - 4, ty - 4, 8, 8); continue; }
          disc(ctx, tx, ty, 5, tu.flash > 0 ? '#ffffff' : '#9a9aa0');
          const a = Math.atan2(g.p.y - ty, g.p.x - tx);
          ctx.fillStyle = '#303030';
          for (let i = 2; i < 9; i++) ctx.fillRect(Math.round(tx + Math.cos(a) * i), Math.round(ty + Math.sin(a) * i), 2, 2);
        }
        ctx.restore();
      }
      function drawAirBoss(ctx, b) {
        if (b.dead && (b.dead & 4)) return;
        const x = Math.round(b.x), y = Math.round(b.y), fl = b.flash > 0;
        ctx.fillStyle = 'rgba(0,0,30,0.3)'; ctx.fillRect(x - 56 + 16, y - 6 + 24, 112, 12);
        ctx.fillStyle = fl ? '#ffffff' : '#7a8a60';
        ctx.fillRect(x - 56, y - 6, 112, 12);
        ctx.fillRect(x - 8, y - 30, 16, 60);
        ctx.fillRect(x - 24, y + 22, 48, 6);
        ctx.fillStyle = '#4a5a3a'; ctx.fillRect(x - 56, y + 4, 112, 2); ctx.fillRect(x - 2, y - 30, 4, 60);
        ctx.fillStyle = '#ff2020'; disc(ctx, x - 44, y, 4, '#ff2020'); disc(ctx, x + 44, y, 4, '#ff2020');
        ctx.fillStyle = '#80c0ff'; ctx.fillRect(x - 3, y + 18, 6, 6);
        for (const ox of [-46, -30, 30, 46]) { ctx.fillStyle = '#3a3a30'; ctx.fillRect(x + ox - 3, y - 12, 6, 8); ctx.fillStyle = (frame >> 1) & 1 ? '#c0c0c0' : '#808080'; ctx.fillRect(x + ox - 6, y + 10, 12, 1); }
        for (const gn of b.guns) {
          const gx = x + gn.ox, gy = y + gn.oy;
          if (gn.dead) { ctx.fillStyle = '#202020'; ctx.fillRect(gx - 3, gy - 3, 6, 6); continue; }
          disc(ctx, gx, gy, 4, gn.flash > 0 ? '#ffffff' : '#d0b040');
        }
      }
      function drawBoom(ctx, b) {
        const T = b.big ? 40 : 24, f = b.t / T, r = (b.big ? 16 : 9) * Math.sqrt(f) + 2;
        const col = f < 0.2 ? '#ffffff' : f < 0.45 ? '#ffe040' : f < 0.7 ? '#ff7010' : '#803010';
        disc(ctx, b.x, b.y, r * (1 - f * 0.4), col);
        ctx.fillStyle = '#ffffff';
        for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + b.t * 0.1; ctx.fillRect(Math.round(b.x + Math.cos(a) * r * 1.3), Math.round(b.y + Math.sin(a) * r * 1.3), 1, 1); }
      }
      function drawItem(ctx, it) {
        const x = Math.round(it.x), y = Math.round(it.y), col = ICON_COL[it.k];
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 9, y - 6, 18, 12);
        ctx.fillStyle = col; ctx.fillRect(x - 8, y - 5, 16, 10);
        text(ctx, it.k === 'POW' ? 'POW' : it.k, x + 1, y - 3, '#ffffff', { center: true });
      }
      function hud(ctx) {
        text(ctx, '1UP', 12, 2, '#ff3030');
        text(ctx, String(g ? g.score : 0).padStart(7, ' '), 4, 11, '#ffffff');
        text(ctx, 'HIGH SCORE', W / 2 + 20, 2, '#ff3030', { center: true });
        text(ctx, String(hi).padStart(7, ' '), W / 2 - 8, 11, '#ffffff');
      }
      function energyBar(ctx) {
        const e = g.energy;
        text(ctx, 'ENERGY', 4, H - 10, '#ffffff');
        ctx.fillStyle = '#000'; ctx.fillRect(54, H - 11, 102, 9);
        ctx.fillStyle = e > 50 ? '#40e040' : e > 25 ? '#ffd020' : ((frame >> 3) & 1 ? '#ff3030' : '#801010');
        ctx.fillRect(55, H - 10, Math.max(0, e), 7);
        text(ctx, String(Math.max(0, Math.round(e))).padStart(3, ' '), W - 64, H - 10, '#ffffff');
        if (g.weapon) {
          ctx.fillStyle = ICON_COL[g.weapon]; ctx.fillRect(W - 34, H - 12, 30, 10);
          text(ctx, g.weapon, W - 19, H - 10, '#ffffff', { center: true });
          ctx.fillStyle = '#ffffff'; ctx.fillRect(W - 34, H - 2, Math.round(30 * g.wTime / 1500), 1);
        }
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        drawOcean(ctx, scroll);
        if (mode === 'title') { renderTitle(ctx); return; }
        for (const sh of g.ships) drawShip(ctx, sh);
        for (const it of g.items) drawItem(ctx, it);
        for (const e of g.en) if (e.k === 'bomber') drawEnemy(ctx, e);
        if (g.boss && g.boss.kind === 'air') drawAirBoss(ctx, g.boss);
        for (const e of g.en) if (e.k !== 'bomber') drawEnemy(ctx, e);
        drawPlayer(ctx);
        for (const b of g.pb) {
          if (b.k === 'l') { ctx.fillStyle = (frame & 1) ? '#ffffa0' : '#80ffff'; ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y), 3, 12); }
          else if (b.k === 's') { ctx.fillStyle = '#a0ff80'; ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 1, 3, 3); }
          else { ctx.fillStyle = '#ffff80'; ctx.fillRect(Math.round(b.x), Math.round(b.y), 1, 5); }
        }
        for (const b of g.eb) disc(ctx, b.x, b.y, 1.8, (frame >> 2) & 1 ? '#ffffff' : '#ff8080');
        for (const b of g.booms) drawBoom(ctx, b);
        drawClouds(ctx, scroll);
        if (g.crash > 0) {
          ctx.fillStyle = `rgba(200,220,255,${(g.crash / 50) * 0.6})`; ctx.fillRect(0, 0, W, H);
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath();
          for (let k = 0; k < 4; k++) { let x = hash(frame * 7 + k) * W; ctx.moveTo(x, 0); for (let y = 0; y < H; y += 16) { x += (hash(frame + k * 13 + y) - 0.5) * 24; ctx.lineTo(x, y); } }
          ctx.stroke();
        }
        for (const q of g.pops) text(ctx, q.n, q.x, Math.round(q.y - (50 - q.t) * 0.3), '#ffffff', { center: true });
        hud(ctx);
        energyBar(ctx);
        if (g.boss) {
          const b = g.boss, hp = b.kind === 'ship' ? b.ship.core.hp : b.hp, mx = b.kind === 'ship' ? b.ship.core.max : b.max;
          if (hp > 0) { ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 41, 22, 82, 5); ctx.fillStyle = '#ff4040'; ctx.fillRect(W / 2 - 40, 23, Math.round(80 * hp / mx), 3); }
        }
        if (g.warn > 0 && (frame >> 4) & 1) {
          text(ctx, 'WARNING!', W / 2, 90, '#ff3030', { center: true, scale: 2 });
          text(ctx, g.naval ? 'BATTLESHIP APPROACHING' : 'HEAVY BOMBER APPROACHING', W / 2, 112, '#ffffff', { center: true });
        }
        if (g.phase === 'ready') {
          text(ctx, 'STAGE ' + (g.stage + 1), W / 2, 92, '#ffffff', { center: true, scale: 2 });
          text(ctx, g.naval ? 'NAVAL BATTLE' : 'AIR BATTLE', W / 2, 114, '#ffd020', { center: true });
          if (g.phaseT < 90) text(ctx, 'READY', W / 2, 128, '#ff4040', { center: true });
        }
        if (g.phase === 'clear') {
          ctx.fillStyle = 'rgba(0,0,40,0.7)'; ctx.fillRect(16, 70, W - 32, 84);
          text(ctx, 'STAGE ' + (g.stage + 1) + ' CLEAR', W / 2, 80, '#ffd020', { center: true });
          text(ctx, 'DESTRUCTION RATIO', W / 2, 100, '#ffffff', { center: true });
          text(ctx, g.ratio + '%', W / 2, 112, '#ffe040', { center: true });
          text(ctx, 'BONUS ' + g.bonus + ' PTS', W / 2, 130, '#40ff40', { center: true });
        }
        if (g.phase === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(40, 112, W - 80, 28);
          text(ctx, 'GAME OVER', W / 2, 122, '#ff3030', { center: true });
        }
      }
      function renderTitle(ctx) {
        ctx.fillStyle = 'rgba(0,0,30,0.45)'; ctx.fillRect(0, 0, W, H);
        hud(ctx);
        const ly = 34;
        text(ctx, '1943', W / 2 + 3, ly + 3, '#401000', { center: true, scale: 6 });
        const bands = [[0, 14, '#ffffff'], [14, 28, '#ffd040'], [28, 42, '#ff6020']];
        for (const [a, b, c] of bands) { ctx.save(); ctx.beginPath(); ctx.rect(0, ly + a, W, b - a); ctx.clip(); text(ctx, '1943', W / 2, ly, c, { center: true, scale: 6 }); ctx.restore(); }
        text(ctx, 'THE BATTLE OF MIDWAY', W / 2, ly + 48, '#a0e0ff', { center: true });
        const page = (titleT / 420 | 0) % 2;
        if (page === 0) {
          ctx.drawImage(P38, W / 2 - 8, 104);
          text(ctx, 'ENERGY IS YOUR LIFE', W / 2, 124, '#ffffff', { center: true });
          text(ctx, 'X: LOOP TO DODGE', W / 2, 140, '#a0e0ff', { center: true });
          text(ctx, 'SPACE+X: MEGA CRASH', W / 2, 150, '#a0e0ff', { center: true });
          text(ctx, 'SHOOT A POWER-UP', W / 2, 168, '#ffff60', { center: true });
          text(ctx, 'TO CHANGE IT', W / 2, 178, '#ffff60', { center: true });
        } else {
          text(ctx, '- POWER UP -', W / 2, 100, '#ffff60', { center: true });
          const rows = [['POW', 'ENERGY'], ['S', 'SHOTGUN'], ['3W', '3-WAY'], ['L', 'LASER'], ['A', 'AUTO']];
          rows.forEach((r, i) => { const y = 116 + i * 14; drawItem(ctx, { x: 70, y: y + 3, k: r[0] }); text(ctx, r[1], 92, y, '#ffffff'); });
        }
        if (api.credits === 0 || coinFlash > 0) { if (coinFlash > 0 ? (coinFlash >> 2) & 1 : (frame >> 5) & 1) text(ctx, 'INSERT COIN', W / 2, 212, '#ff3030', { center: true }); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START BUTTON', W / 2, 212, '#ffffff', { center: true });
        text(ctx, '\u00a9 CAPCOM 1987', W / 2, 228, '#ffffff', { center: true });
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 9, '#ffffff');
      }
      return { update, render, destroy() { } };
    }
  });
})();
