// Tokio / Scramble Formation (Taito, 1986) \u2014 built-in recreation for the MAME32 Game Room. Free captured wingmen from enemy transports and switch their formation as you fly over the seas and islands toward Tokyo.
(function () {
  'use strict';
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
    '=': '00001F001F0000', '+': '0004041F040400', 'x': '00110A040A1100', '>': '08040201020408',
    '<': '02040810080402', '#': '0A1F0A0A1F0A00', '*': '00150E1F0E1500', '%': '19190204081313'
  };
  const FONT = {};
  for (const k in FONT_HEX) { const s = FONT_HEX[k]; const a = []; for (let i = 0; i < 7; i++) a.push(parseInt(s.substr(i * 2, 2), 16) || 0); FONT[k] = a; }
  // text(ctx, str, x, y, colour, {scale, center, right, shadow})
  function text(ctx, s, x, y, col, o) {
    o = o || {}; const sc = o.scale || 1, adv = (o.adv || 8) * sc; s = String(s);
    if (s.toUpperCase) s = s.replace(/[a-wyz]/g, c => c.toUpperCase());
    const w = s.length * adv - (adv - 5 * sc);
    if (o.center) x = Math.round(x - w / 2); else if (o.right) x = Math.round(x - w);
    if (o.shadow) { const sh = o.shadow; o.shadow = null; text(ctx, s, x + sc, y + sc, sh, { scale: sc, adv: o.adv }); }
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) { const b = g[r]; if (!b) continue; for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + i * adv + c * sc, y + r * sc, sc, sc); }
    }
  }
  function mkRng(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[(Math.random() * a.length) | 0];
  const TAU = Math.PI * 2;
  // build a sprite canvas from rows of chars + palette {char: colour}; flip mirrors horizontally
  function spr(rows, pal, flip) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(flip ? w - 1 - i : i, y, 1, 1); } } });
    return c;
  }
  // rotate a char-grid (nearest neighbour) so the art (drawn facing UP) faces angle a (radians, 0 = right)
  function rotRows(rows, a) {
    const h = rows.length, w = Math.max.apply(null, rows.map(r => r.length));
    const N = Math.ceil(Math.sqrt(w * w + h * h)) | 1;
    const r = a + Math.PI / 2, cs = Math.cos(r), sn = Math.sin(r);
    const out = [];
    for (let y = 0; y < N; y++) {
      let line = '';
      for (let x = 0; x < N; x++) {
        const dx = x - (N - 1) / 2, dy = y - (N - 1) / 2;
        const sx = Math.round(dx * cs + dy * sn + (w - 1) / 2), sy = Math.round(-dx * sn + dy * cs + (h - 1) / 2);
        line += (sy >= 0 && sy < h && sx >= 0 && sx < w) ? (rows[sy][sx] || '.') : '.';
      }
      out.push(line);
    }
    return out;
  }
  // n rotations of an UP-facing sprite: index 0 faces right, increasing clockwise
  function rotSet(rows, pal, n) { const a = []; for (let i = 0; i < n; i++) a.push(spr(rotRows(rows, i / n * TAU), pal)); return a; }
  function angIdx(a, n) { return ((Math.round(a / TAU * n) % n) + n) % n; }
  function drawC(ctx, im, x, y) { ctx.drawImage(im, Math.round(x - im.width / 2), Math.round(y - im.height / 2)); }
  const DIR8 = [[1, 0], [0.7071, 0.7071], [0, 1], [-0.7071, 0.7071], [-1, 0], [-0.7071, -0.7071], [0, -1], [0.7071, -0.7071]];
  function dir8Of(dx, dy) { return angIdx(Math.atan2(dy, dx), 8); }
  function boxHit(a, b) { return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2; }
  function coinOp(api) {
    // shared attract helper: returns true if a credit was used
    return api.useCredit();
  }
  function pad2(n) { return String(Math.min(99, n)).padStart(2, '0'); }
  const W = 224, H = 256;

  const PAL = {
    W: '#e8e8f0', w: '#a0a0b8', B: '#2850e0', b: '#183090', C: '#60e8ff', R: '#ff3020', r: '#ffa020', Y: '#ffe040',
    G: '#4a7a3a', g: '#2c5020', K: '#202020', D: '#606070', d: '#404050', O: '#c87830', o: '#7a4818', S: '#d0b090', P: '#e080ff'
  };
  const ART = {
    jet: ['.......W.......', '......WBW......', '......WBW......', '.....WWBWW.....', '.....WCCCW.....', '....WWCCCWW....', '...WWWWBWWWW...',
      '..WWWWWBWWWWW..', '.WWWWWWBWWWWWW.', 'WWWBWWWBWWWBWWW', 'WW..WWWBWWW..WW', '....WWWBWWW....', '.....WWBWW.....', '....WWWBWWW....', '...WWw.R.wWW...'],
    helper: ['.....B.....', '....BWB....', '....BCB....', '...BBWBB...', '.BBBBWBBBB.', 'BBWBBWBBWBB', '....BWB....', '...BBWBB...', '..BB.r.BB..'],
    fighter: ['......G......', '.....GGG.....', '.....GYG.....', '.G...GGG...G.', '.GGGGGGGGGGG.', 'GGGGGRGRGGGGG', '.GGGGGGGGGGG.', '.....GGG.....', '.....GGG.....', '....GGGGG....', '...GG.G.GG...'],
    jetE: ['.....D.....', '....DDD....', '....DKD....', '...DDDDD...', '..DDDDDDD..', '.DDDRDRDDD.', 'DDD.DDD.DDD', 'DD..DDD..DD', '....DDD....', '...DDDDD...', '...D.r.D...'],
    heli: ['......d......', '......d......', '.....DDD.....', '....DCCCD....', '....DDDDD....', '....DDDDD....', '.....DDD.....', '......D......', '......D......', '.....DDD.....'],
    carrier: ['...............OO...............', '..............OOOO..............', '.............OoooOO.............', '.............OOOOOO.............',
      '.............OOOOOO.............', '.......O.....OOOOOO.....O.......', '.......O....OOOOOOOO....O.......', 'OOOOOOOOOOOOOOROOROOOOOOOOOOOOOO',
      'OoooooOOOOOOOOOOOOOOOOOOOOoooooO', 'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO', '.......o....OOOOOOOO....o.......', '.............OOOOOO.............',
      '.............OOOOOO.............', '.............OOOOOO.............', '..........OOOOOOOOOOOO..........', '..........OoooOOOOoooO..........', '.............OOOOOO.............']
  };

  ArcadeRegistry.register({
    id: 'tokio', title: 'Tokio / Scramble Formation', year: 1986, maker: 'Taito',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: fly \u00b7 Space: fire (hold for rapid) \u00b7 X: change wingman formation \u00b7 Enter: start',
    marquee: { bg: '#081838', fg: '#ffffff', accent: '#ff3020' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(40000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, g = null;

      const JET = spr(ART.jet, PAL);
      const HELP = spr(ART.helper, PAL);
      const NR = 16;
      const FIGHT = rotSet(ART.fighter, PAL, NR);
      const FIGHT2 = rotSet(ART.fighter, Object.assign({}, PAL, { G: '#8a8a40', g: '#5a5a20' }), NR);
      const JETE = rotSet(ART.jetE, PAL, NR);
      const HELI = spr(ART.heli, PAL);
      const CARRIER = spr(ART.carrier, PAL);
      const CARRIERF = spr(ART.carrier, { O: '#fff', o: '#fff', R: '#fff' });
      const LIFE = spr(ART.helper, Object.assign({}, PAL, { B: '#e8e8f0', W: '#2850e0' }));

      const sfx = {
        shot() { au.tone(1800, 0.03, { type: 'square', vol: 0.04, slideTo: 900 }); },
        boom() { au.noise(0.25, { vol: 0.16, freq: 1400, slideTo: 200 }); },
        big() { au.noise(0.7, { vol: 0.24, freq: 900, slideTo: 50 }); },
        hit() { au.tone(300, 0.04, { type: 'square', vol: 0.06 }); },
        eshot() { au.tone(700, 0.05, { type: 'triangle', vol: 0.05, slideTo: 400 }); },
        join() { au.melody([[784, .06], [988, .06], [1175, .06], [1568, .14]], { type: 'square', vol: 0.11 }); },
        form() { au.tone(600, 0.08, { type: 'square', vol: 0.08, slideTo: 1200 }); },
        lose() { au.tone(500, 0.2, { type: 'sawtooth', vol: 0.08, slideTo: 120 }); },
        die() { au.noise(1.0, { vol: 0.25, freq: 700, slideTo: 40 }); au.melody([[523, .1], [440, .1], [349, .1], [262, .3]], { type: 'square', vol: 0.1, delay: 0.2 }); },
        oneup() { au.melody([[1047, .06], [1319, .06], [1568, .06], [2093, .14]], { type: 'square', vol: 0.1 }); },
        start() { au.melody([[523, .12], [659, .12], [784, .12], [1047, .24], [988, .12], [1047, .12], [1175, .12], [1319, .4]], { type: 'square', vol: 0.11 }); },
        warn() { au.melody([[880, .15], [660, .15], [880, .15], [660, .15], [880, .15], [660, .15]], { type: 'square', vol: 0.09 }); },
        clear() { au.melody([[784, .1], [988, .1], [1175, .1], [1568, .3], [1175, .1], [1568, .45]], { type: 'square', vol: 0.11 }); },
        bonus() { au.melody([[1319, .05], [1568, .05], [2093, .1]], { type: 'square', vol: 0.09 }); }
      };

      const STAGES = [
        { name: 'PACIFIC OCEAN', sea: '#1848a8', sea2: '#3060c0', land: '#c8b070', land2: '#3c8a3c', city: 0, boss: 'fortress' },
        { name: 'BOSO PENINSULA', sea: '#1a50a0', sea2: '#3a70c8', land: '#b8a868', land2: '#4a7a30', city: 0, boss: 'battleship' },
        { name: 'MOUNT FUJI', sea: '#285080', sea2: '#4870a0', land: '#6a8a4a', land2: '#2c5a2c', city: 0, boss: 'fortress', fuji: 1 },
        { name: 'TOKYO', sea: '#203878', sea2: '#40589a', land: '#707078', land2: '#505058', city: 1, boss: 'battleship' }
      ];
      const FORMS = ['SPREAD', 'WING', 'ROLL'];

      // ================= Terrain =================
      function buildStage(n) {
        const r = mkRng(n * 1777 + 3);
        const st = STAGES[n % 4];
        const len = 3600 + Math.min(4, n) * 300; // scroll distance before boss
        const isles = [], ground = [];
        let d = 260;
        while (d < len) {
          const w = 50 + r() * (st.city ? 140 : 90), h = 60 + r() * 120;
          const x = st.city ? (r() < 0.5 ? -20 : W - w + 20) : r() * (W - w);
          const isle = { d, x, w, h, seed: (r() * 1e9) | 0, city: st.city };
          isles.push(isle);
          const nt = 1 + (r() < 0.6 ? 1 : 0) + (n > 1 ? 1 : 0);
          for (let i = 0; i < nt; i++) ground.push({ k: 'turret', d: d + 12 + r() * (h - 24), x: x + 12 + r() * (w - 24) });
          d += h + 70 + r() * 160;
        }
        // ships in the sea gaps
        for (let s = 500; s < len; s += 500 + r() * 400) ground.push({ k: 'ship', d: s, x: 30 + r() * (W - 60) });
        ground.sort((a, b) => a.d - b.d);
        return { st, len, isles, ground, gi: 0 };
      }

      function newGame() {
        g = { score: 0, lives: 3, stage: 0, nextExtra: 20000, form: 0 };
        startStage(); sfx.start();
      }
      function startStage() {
        g.map = buildStage(g.stage);
        g.scroll = 0; g.speed = 0.6;
        g.en = []; g.shots = []; g.eb = []; g.fx = []; g.pops = []; g.drops = []; g.craters = [];
        g.helpers = g.helpers || [];
        g.waveT = 90; g.carrierT = 500; g.boss = null; g.groups = {}; g.gid = 0;
        g.phase = 'ready'; g.phaseT = 150;
        g.p = { x: W / 2, y: 210, inv: 120, dead: 0, fireT: 0, bank: 0 };
      }
      function diff() { return g.stage; }
      function addScore(n) {
        g.score += n;
        if (g.score >= g.nextExtra) { g.lives++; g.nextExtra += g.nextExtra < 70000 ? 50000 : 70000; sfx.oneup(); }
        if (g.score > hi) hi = g.score;
      }
      function pop(x, y, t, c) { g.pops.push({ x, y, t: 60, txt: t, col: c || '#fff' }); }
      function boom(x, y, big) { g.fx.push({ x, y, t: 0, big: !!big }); }

      // ---- helper positions ----
      function helperSlot(i, n) {
        const p = g.p;
        if (g.form === 0) { const off = [-18, 18, -32, 32][i]; return { x: p.x + off, y: p.y + 4 + (i >= 2 ? 6 : 0), a: -Math.PI / 2 }; }
        if (g.form === 1) { const s = i & 1 ? 1 : -1, k = (i >> 1) + 1; return { x: p.x + s * 13 * k, y: p.y + 12 * k, a: -Math.PI / 2 + s * 0.3 }; }
        const a = frame * 0.06 + i / Math.max(1, n) * TAU;
        return { x: p.x + Math.cos(a) * 22, y: p.y + Math.sin(a) * 22, a: -Math.PI / 2 };
      }

      // ---- enemies ----
      function spawn(k, x, y, o) {
        const e = Object.assign({ k, x, y, vx: 0, vy: 0, t: 0, hp: 1, ang: Math.PI / 2, fireT: 60 + Math.random() * 80 }, o || {});
        g.en.push(e); return e;
      }
      function spawnWave() {
        const d = diff(), r = Math.random();
        const gid = ++g.gid;
        if (r < 0.35) {
          // swooping formation of five
          const left = Math.random() < 0.5, x0 = left ? 40 + Math.random() * 40 : W - 40 - Math.random() * 40;
          g.groups[gid] = { n: 5, killed: 0, x: x0 };
          for (let i = 0; i < 5; i++) spawn('fighter', x0, -10 - i * 18, { gid, path: left ? 1 : -1, delay: i * 0, spd: 1.5 + d * 0.12 });
        } else if (r < 0.55) {
          // line of fighters straight down then peel off
          g.groups[gid] = { n: 4, killed: 0 };
          const x0 = 30 + Math.random() * (W - 60);
          for (let i = 0; i < 4; i++) spawn('fighter', x0 + (i - 1.5) * 18, -12 - Math.abs(i - 1.5) * 10, { gid, path: 0, spd: 1.6 + d * 0.1 });
        } else if (r < 0.75) {
          // divers aiming at the player
          const n = 2 + Math.min(3, d);
          for (let i = 0; i < n; i++) spawn('jet', 20 + Math.random() * (W - 40), -14 - i * 30, { spd: 2.2 + d * 0.15 });
        } else if (r < 0.9) {
          // side crossers
          const left = Math.random() < 0.5;
          g.groups[gid] = { n: 3, killed: 0 };
          for (let i = 0; i < 3; i++) spawn('fighter', left ? -10 - i * 20 : W + 10 + i * 20, 40 + Math.random() * 30 + i * 8, { gid, cross: left ? 1 : -1, spd: 1.8 + d * 0.1, ang: left ? 0 : Math.PI });
        } else {
          spawn('heli', 30 + Math.random() * (W - 60), -12, { hp: 3, spd: 0.8 });
        }
      }

      function shoot(x, y, ang, spd) { g.eb.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd }); }
      const aim = (x, y) => Math.atan2(g.p.y - y, g.p.x - x);
      const VAL = { fighter: 100, jet: 150, heli: 300, carrier: 1000, turret: 300, ship: 800 };

      function killEnemy(e) {
        e.dead = true;
        const v = VAL[e.k] || 100;
        addScore(v);
        boom(e.x, e.y, e.k === 'carrier' || e.k === 'ship');
        if (e.k === 'carrier' || e.k === 'ship') sfx.big(); else sfx.boom();
        if (e.k === 'carrier') { g.drops.push({ x: e.x, y: e.y, t: 0 }); pop(e.x, e.y - 12, 'RESCUE!', '#60e8ff'); }
        if (e.ground) g.craters.push({ x: e.x, d: g.scroll - e.y, s: e.k === 'ship' ? 2 : 1 });
        if (e.gid && g.groups[e.gid]) {
          const gr = g.groups[e.gid]; gr.killed++;
          if (gr.killed >= gr.n) { const b = 500 + gr.n * 100; addScore(b); pop(e.x, e.y, String(b), '#ffe040'); sfx.bonus(); }
        }
      }

      // ---- boss ----
      function startBoss() {
        const st = g.map.st, d = diff();
        const fort = st.boss === 'fortress';
        const parts = fort ? [[-36, 4], [36, 4], [-18, 14], [18, 14]] : [[-30, -8], [30, -8], [-14, 18], [14, 18], [0, 32]];
        g.boss = { type: st.boss, x: W / 2, y: -60, t: 0, vx: 0.6 + d * 0.1, core: 40 + d * 12, coreMax: 40 + d * 12, flash: 0,
          parts: parts.map(p => ({ dx: p[0], dy: p[1], hp: 10 + d * 3, fireT: 40 + Math.random() * 60, flash: 0 })) };
        g.phase = 'boss'; sfx.warn();
      }
      function updBoss() {
        const b = g.boss, d = diff(); b.t++;
        if (b.flash) b.flash--;
        const ty = b.type === 'fortress' ? 56 : 50;
        if (b.y < ty) b.y += 0.6;
        else {
          b.x += b.vx; if (b.x < 60 || b.x > W - 60) b.vx = -b.vx;
          if (b.type === 'fortress') b.y = ty + Math.sin(b.t * 0.02) * 10;
        }
        const alive = b.parts.filter(p => p.hp > 0);
        for (const p of alive) {
          if (p.flash) p.flash--;
          if (--p.fireT <= 0) {
            p.fireT = Math.max(40, 100 - d * 10) + Math.random() * 40;
            const x = b.x + p.dx, y = b.y + p.dy;
            if (y > 0) { const a = aim(x, y); shoot(x, y, a, 1.6 + d * 0.1); if (d > 0) { shoot(x, y, a - 0.2, 1.6); shoot(x, y, a + 0.2, 1.6); } sfx.eshot(); }
          }
        }
        if (b.y >= ty && b.t % Math.max(50, (alive.length ? 140 : 70) - d * 10) === 0) {
          const n = alive.length ? 6 : 12;
          for (let i = 0; i < n; i++) shoot(b.x, b.y + 10, Math.PI / 2 + (i - (n - 1) / 2) * (alive.length ? 0.25 : 0.45), 1.3 + d * 0.08);
        }
        // contact
        const p = g.p;
        if (!p.dead && !p.inv && Math.abs(p.x - b.x) < 40 && Math.abs(p.y - b.y) < 18) killPlayer();
      }
      function hitBoss(s) {
        const b = g.boss; if (!b || b.y < 10) return false;
        for (const p of b.parts) {
          if (p.hp <= 0) continue;
          if (Math.abs(s.x - (b.x + p.dx)) < 7 && Math.abs(s.y - (b.y + p.dy)) < 7) {
            p.hp--; p.flash = 3; sfx.hit();
            if (p.hp <= 0) { boom(b.x + p.dx, b.y + p.dy); addScore(1000); pop(b.x + p.dx, b.y + p.dy, '1000'); sfx.boom(); }
            return true;
          }
        }
        if (Math.abs(s.x - b.x) < (b.type === 'fortress' ? 48 : 22) && Math.abs(s.y - b.y) < 14) {
          if (b.parts.some(p => p.hp > 0)) return true; // armour
          b.core--; b.flash = 3; sfx.hit();
          if (b.core <= 0) {
            const pts = 10000 + g.stage * 5000;
            addScore(pts); pop(b.x, b.y, String(pts), '#ffe040');
            for (let i = 0; i < 10; i++) g.fx.push({ x: b.x + rnd(-40, 40), y: b.y + rnd(-16, 16), t: -i * 6, big: true });
            sfx.big(); g.boss = null; g.eb = []; g.phase = 'clear'; g.phaseT = 240;
            setTimeout1 = 60;
          }
          return true;
        }
        return false;
      }
      let setTimeout1 = 0;

      function killPlayer() {
        const p = g.p; if (p.dead) return;
        p.dead = 1; boom(p.x, p.y, true); sfx.die();
        for (const h of g.helpers) boom(h.x, h.y);
        g.helpers = [];
        g.prevPhase = g.phase; g.phase = 'dead'; g.phaseT = 130;
      }

      // ================= Update =================
      function updWorld(playable) {
        const p = g.p, d = diff();
        g.scroll += g.speed;
        // ground targets come into view
        const M = g.map;
        while (M.gi < M.ground.length && M.ground[M.gi].d <= g.scroll + 20) {
          const q = M.ground[M.gi++];
          if (g.phase === 'boss') continue;
          if (q.k === 'turret') spawn('turret', q.x, g.scroll - q.d, { ground: true, hp: 3 });
          else spawn('ship', q.x, g.scroll - q.d - 20, { ground: true, hp: 10, vx: (Math.random() < 0.5 ? -1 : 1) * 0.2 });
        }
        if (playable && g.phase === 'play') {
          if (--g.waveT <= 0) { spawnWave(); g.waveT = Math.max(50, 120 - d * 12) + Math.random() * 60; }
          if (--g.carrierT <= 0) {
            g.carrierT = 700 + Math.random() * 300;
            if (g.helpers.length < 4) spawn('carrier', 30 + Math.random() * (W - 60), -16, { hp: 8 + d * 2, spd: 0.5 });
          }
          if (g.scroll >= M.len) startBoss();
        }
        // enemies
        for (const e of g.en) {
          e.t++;
          if (e.flash) e.flash--;
          if (e.ground) {
            e.y += g.speed; if (e.k === 'ship') e.x = clamp(e.x + e.vx, 20, W - 20);
            if (e.y > 10 && e.y < H - 40 && --e.fireT <= 0) {
              e.fireT = Math.max(50, 130 - d * 12) + Math.random() * 60;
              const a = aim(e.x, e.y); shoot(e.x, e.y, a, 1.2 + d * 0.08);
              if (e.k === 'ship') { shoot(e.x, e.y - 10, a - 0.15, 1.2); shoot(e.x, e.y + 10, a + 0.15, 1.2); }
              sfx.eshot();
            }
            e.ang = aim(e.x, e.y);
          } else if (e.k === 'fighter') {
            if (e.cross) { e.x += e.cross * e.spd; e.y += Math.sin(e.t * 0.04) * 0.8 + 0.3; e.ang = Math.atan2(Math.sin(e.t * 0.04) * 0.8 + 0.3, e.cross * e.spd); }
            else if (e.path) {
              const t = e.t;
              const vx = e.path * Math.sin(t * 0.025) * 1.8, vy = e.spd * (t < 120 ? 1 : Math.cos((t - 120) * 0.02));
              e.x += vx; e.y += vy; e.ang = Math.atan2(vy, vx);
            } else {
              if (e.t < 70) { e.y += e.spd; e.ang = Math.PI / 2; }
              else { if (!e.peel) e.peel = e.x < g.p.x ? -1 : 1; e.vx += e.peel * 0.06; e.x += e.vx; e.y += e.spd * 0.6 - e.t * 0.002; e.ang = Math.atan2(e.spd * 0.6 - e.t * 0.002, e.vx); }
            }
            if (--e.fireT <= 0 && e.y > 0 && e.y < H - 60) { e.fireT = Math.max(70, 160 - d * 15) + Math.random() * 80; shoot(e.x, e.y, aim(e.x, e.y), 1.5 + d * 0.1); }
          } else if (e.k === 'jet') {
            if (e.t < 30) { e.y += 1.2; e.ang = Math.PI / 2; }
            else {
              if (!e.locked) { e.locked = true; const a = aim(e.x, e.y); e.vx = Math.cos(a) * e.spd; e.vy = Math.max(0.8, Math.sin(a) * e.spd); e.ang = Math.atan2(e.vy, e.vx); shoot(e.x, e.y, a, 2 + d * 0.1); sfx.eshot(); }
              e.x += e.vx; e.y += e.vy; e.vy += 0.02;
            }
          } else if (e.k === 'heli') {
            if (e.y < 60) e.y += e.spd; else { e.x += Math.sin(e.t * 0.02) * 0.8; e.y += 0.05; }
            if (--e.fireT <= 0) { e.fireT = Math.max(60, 120 - d * 10); const a = aim(e.x, e.y); for (let i = -1; i <= 1; i++) shoot(e.x, e.y, a + i * 0.25, 1.4); sfx.eshot(); }
            if (e.t > 900) e.y += 1;
          } else if (e.k === 'carrier') {
            e.y += e.spd; e.x += Math.sin(e.t * 0.01) * 0.3;
            if (--e.fireT <= 0) { e.fireT = 90; shoot(e.x - 12, e.y + 6, aim(e.x, e.y), 1.3); shoot(e.x + 12, e.y + 6, aim(e.x, e.y), 1.3); }
          }
          if (e.y > H + 30 || e.x < -50 || e.x > W + 50 || (e.y < -120 && e.t > 300)) e.dead = 2;
          if (!e.ground && !p.dead && !p.inv && Math.abs(e.x - p.x) < (e.k === 'carrier' ? 16 : 7) && Math.abs(e.y - p.y) < 7) { killEnemy(e); killPlayer(); }
          for (const h of g.helpers) if (!e.ground && !e.dead && Math.abs(e.x - h.x) < 7 && Math.abs(e.y - h.y) < 7) { h.dead = true; killEnemy(e); }
        }
        // enemy bullets
        for (const b of g.eb) {
          b.x += b.vx; b.y += b.vy;
          if (b.x < -6 || b.x > W + 6 || b.y < -6 || b.y > H + 6) b.dead = true;
          else if (!p.dead && !p.inv && Math.abs(b.x - p.x) < 3 && Math.abs(b.y - p.y) < 4) { b.dead = true; killPlayer(); }
          else for (const h of g.helpers) if (!h.dead && Math.abs(b.x - h.x) < 4 && Math.abs(b.y - h.y) < 4) { b.dead = true; h.dead = true; boom(h.x, h.y); sfx.lose(); }
        }
        // player shots
        for (const s of g.shots) {
          s.x += s.vx; s.y += s.vy;
          if (s.y < -8 || s.x < -8 || s.x > W + 8) { s.dead = true; continue; }
          if (g.boss && hitBoss(s)) { s.dead = true; continue; }
          for (const e of g.en) {
            if (e.dead) continue;
            const r = e.k === 'carrier' ? 16 : e.k === 'ship' ? 10 : 7, ry = e.k === 'ship' ? 20 : r;
            if (Math.abs(e.x - s.x) < r && Math.abs(e.y - s.y) < ry) {
              s.dead = true; e.hp--; e.flash = 3;
              if (e.hp <= 0) killEnemy(e); else sfx.hit();
              break;
            }
          }
        }
        // falling wingmen
        for (const dr of g.drops) {
          dr.t++; dr.y += 0.7; dr.x += Math.sin(dr.t * 0.05) * 0.4;
          if (!p.dead && Math.abs(dr.x - p.x) < 12 && Math.abs(dr.y - p.y) < 12) {
            dr.dead = true;
            if (g.helpers.length < 4) { g.helpers.push({ x: dr.x, y: dr.y }); sfx.join(); pop(p.x, p.y - 16, 'JOIN!', '#60e8ff'); }
            else { addScore(2000); pop(p.x, p.y - 16, '2000', '#ffe040'); sfx.bonus(); }
          }
          if (dr.y > H + 10) dr.dead = true;
        }
        g.en = g.en.filter(e => !e.dead);
        g.eb = g.eb.filter(b => !b.dead);
        g.shots = g.shots.filter(s => !s.dead);
        g.drops = g.drops.filter(s => !s.dead);
        g.helpers = g.helpers.filter(h => !h.dead);
        g.craters = g.craters.filter(c => g.scroll - c.d < H + 20);
        if (g.boss) updBoss();
      }

      function updPlayer() {
        const p = g.p;
        let dx = 0, dy = 0;
        if (api.key('ArrowLeft')) dx -= 1; if (api.key('ArrowRight')) dx += 1;
        if (api.key('ArrowUp')) dy -= 1; if (api.key('ArrowDown')) dy += 1;
        const n = dx && dy ? 0.7071 : 1;
        p.x = clamp(p.x + dx * n * 1.9, 8, W - 8); p.y = clamp(p.y + dy * n * 1.7, 24, H - 16);
        p.bank += (dx - p.bank) * 0.2;
        if (p.inv) p.inv--;
        if (p.fireT) p.fireT--;
        if ((api.pressed('Space') || api.key('Space')) && !p.fireT && g.shots.length < 18) {
          p.fireT = 7;
          g.shots.push({ x: p.x - 3, y: p.y - 8, vx: 0, vy: -6 }, { x: p.x + 3, y: p.y - 8, vx: 0, vy: -6 });
          g.helpers.forEach((h, i) => {
            const a = g.form === 1 ? -Math.PI / 2 + (i & 1 ? 0.22 : -0.22) : -Math.PI / 2;
            g.shots.push({ x: h.x, y: h.y - 6, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, h: 1 });
          });
          sfx.shot();
        }
        if (api.pressed('KeyX')) { g.form = (g.form + 1) % 3; sfx.form(); g.formMsg = 60; }
        // helpers glide to slots
        g.helpers.forEach((h, i) => { const s = helperSlot(i, g.helpers.length); h.x += (s.x - h.x) * 0.25; h.y += (s.y - h.y) * 0.25; });
      }

      function gameOver() {
        api.setHiScore(g.score); g.phase = 'over'; g.phaseT = 300;
        au.melody([[392, .2], [370, .2], [349, .2], [330, .5]], { type: 'square', vol: 0.1 });
      }

      function update() {
        frame++; if (coinFlash) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { mode = 'game'; newGame(); }
            else { coinFlash = 90; au.tone(110, 0.25, { type: 'square', vol: 0.12 }); }
          }
          return;
        }
        for (const f of g.fx) f.t++;
        g.fx = g.fx.filter(f => f.t < (f.big ? 40 : 24));
        for (const q of g.pops) { q.t--; q.y -= 0.3; }
        g.pops = g.pops.filter(q => q.t > 0);
        if (g.formMsg) g.formMsg--;
        if (setTimeout1 && --setTimeout1 === 0) sfx.clear();
        switch (g.phase) {
          case 'ready': g.scroll += g.speed; updPlayer(); if (--g.phaseT <= 0) g.phase = 'play'; break;
          case 'play': case 'boss': updPlayer(); updWorld(true); break;
          case 'dead':
            g.p.dead++; updWorld(false);
            if (--g.phaseT <= 0) {
              const cont = () => { g.p = { x: W / 2, y: 210, inv: 150, dead: 0, fireT: 0, bank: 0 }; g.phase = g.boss ? 'boss' : 'play'; g.eb = []; };
              if (g.lives > 1) { g.lives--; cont(); }
              else {
                g.phase = 'wait'; const cg = g;
                if (api.offerContinue) api.offerContinue(() => { if (g === cg) { g.lives = 3; cont(); } }, () => { if (g === cg) gameOver(); });
                else gameOver();
              }
            }
            break;
          case 'clear':
            updPlayer(); g.scroll += g.speed; g.eb = [];
            if (--g.phaseT <= 0) { g.stage++; startStage(); }
            break;
          case 'over':
            if (--g.phaseT <= 0 || (g.phaseT < 200 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; g = null; }
            break;
        }
      }

      // ================= Render =================
      function hash(n) { n = Math.imul(n ^ (n >>> 15), 2246822519); n = Math.imul(n ^ (n >>> 13), 3266489917); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
      function drawSea(ctx, st, scroll) {
        ctx.fillStyle = st.sea; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = st.sea2;
        const off = scroll % 16;
        for (let y = -16; y < H + 16; y += 16) {
          const row = Math.floor((scroll - y) / 16);
          for (let i = 0; i < 4; i++) { const h = hash(row * 7 + i); ctx.fillRect(Math.round(h * W), Math.round(y + off), 6 + (i & 1) * 4, 1); }
        }
      }
      function drawIsle(ctx, is, scroll, st) {
        const top = Math.round(scroll - is.d - is.h), bot = top + is.h;
        if (bot < -10 || top > H + 10) return;
        const rows = Math.ceil(is.h / 4);
        for (let i = 0; i < rows; i++) {
          const y = top + i * 4, t = i / rows;
          const bulge = Math.sin(t * Math.PI);
          const jit = (hash(is.seed + i) - 0.5) * 8;
          const w = Math.max(6, is.w * (0.35 + 0.65 * Math.sqrt(bulge))) + jit;
          const x = is.x + (is.w - w) / 2 + (hash(is.seed + i * 3) - 0.5) * 6;
          if (is.city) {
            ctx.fillStyle = '#585860'; ctx.fillRect(Math.round(is.x), y, Math.round(is.w), 4);
          } else {
            ctx.fillStyle = '#e8e0b0'; ctx.fillRect(Math.round(x - 3), y, Math.round(w + 6), 4);
            ctx.fillStyle = st.land; ctx.fillRect(Math.round(x), y, Math.round(w), 4);
            if (w > 20) { ctx.fillStyle = st.land2; ctx.fillRect(Math.round(x + 5), y, Math.round(w - 10), 4); }
          }
        }
        if (is.city) {
          // blocks of rooftops
          for (let by = 0; by < is.h - 10; by += 18) for (let bx = 4; bx < is.w - 12; bx += 16) {
            const h = hash(is.seed + by * 31 + bx);
            const y = top + by + 3;
            ctx.fillStyle = h < 0.3 ? '#a0a0b0' : h < 0.6 ? '#8a7a6a' : '#b0a890';
            ctx.fillRect(Math.round(is.x + bx), y, 12, 13);
            ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(Math.round(is.x + bx) + 12, y + 2, 2, 13);
            if (h > 0.8) { ctx.fillStyle = '#e04040'; ctx.fillRect(Math.round(is.x + bx) + 4, y + 4, 4, 4); }
          }
        } else if (st.fuji && is.w > 90) {
          const cx = Math.round(is.x + is.w / 2), cy = Math.round(top + is.h / 2);
          for (let k = 0; k < 18; k++) { ctx.fillStyle = k < 6 ? '#ffffff' : '#7a6a8a'; ctx.fillRect(cx - k * 2, cy - 18 + k * 2, k * 4 + 1, 2); }
        } else {
          for (let k = 0; k < is.w * is.h / 300; k++) {
            const hx = hash(is.seed + k * 13), hy = hash(is.seed + k * 17 + 5);
            const x = Math.round(is.x + is.w * (0.25 + hx * 0.5)), y = Math.round(top + is.h * (0.15 + hy * 0.7));
            ctx.fillStyle = '#1c5a1c'; ctx.fillRect(x, y, 5, 4); ctx.fillStyle = '#3a9a3a'; ctx.fillRect(x + 1, y, 3, 2);
          }
        }
      }
      function drawTurret(ctx, e) {
        const x = Math.round(e.x), y = Math.round(e.y);
        ctx.fillStyle = e.flash ? '#fff' : '#505058'; ctx.fillRect(x - 6, y - 5, 12, 10); ctx.fillRect(x - 5, y - 6, 10, 12);
        ctx.fillStyle = '#8a8a98'; ctx.fillRect(x - 3, y - 3, 6, 6);
        ctx.fillStyle = '#202020';
        for (let i = 2; i < 9; i++) ctx.fillRect(Math.round(x + Math.cos(e.ang) * i), Math.round(y + Math.sin(e.ang) * i), 2, 2);
      }
      function drawShip(ctx, e) {
        const x = Math.round(e.x), y = Math.round(e.y);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x - 6, y + 22, 12, 3);
        ctx.fillStyle = e.flash ? '#fff' : '#686878';
        ctx.fillRect(x - 8, y - 18, 16, 38); ctx.fillRect(x - 6, y - 22, 12, 4); ctx.fillRect(x - 3, y - 25, 6, 3);
        ctx.fillStyle = '#8a8a9a'; ctx.fillRect(x - 5, y - 6, 10, 12);
        ctx.fillStyle = '#c0c0c8'; ctx.fillRect(x - 3, y - 4, 6, 6);
        ctx.fillStyle = '#303038'; ctx.fillRect(x - 3, y - 14, 6, 5); ctx.fillRect(x - 3, y + 10, 6, 5);
        ctx.fillStyle = '#202020';
        for (const oy of [-12, 12]) for (let i = 2; i < 7; i++) ctx.fillRect(Math.round(x + Math.cos(e.ang) * i), Math.round(y + oy + Math.sin(e.ang) * i), 1, 1);
      }
      function drawBoss(ctx, b) {
        const x = Math.round(b.x), y = Math.round(b.y);
        if (b.type === 'fortress') {
          ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 50, y + 30, 100, 10);
          ctx.fillStyle = b.flash ? '#fff' : '#5a6a50';
          ctx.fillRect(x - 56, y - 2, 112, 12); ctx.fillRect(x - 48, y - 6, 96, 4); ctx.fillRect(x - 10, y - 30, 20, 60);
          ctx.fillRect(x - 24, y + 24, 48, 6);
          ctx.fillStyle = '#3a4a34'; ctx.fillRect(x - 56, y + 8, 112, 2); ctx.fillRect(x - 6, y - 26, 12, 50);
          ctx.fillStyle = '#60e8ff'; ctx.fillRect(x - 4, y - 24, 8, 6);
          ctx.fillStyle = '#ff3020'; ctx.fillRect(x - 46, y, 6, 6); ctx.fillRect(x + 40, y, 6, 6);
          for (const ex of [-44, -24, 24, 44]) { ctx.fillStyle = '#303030'; ctx.fillRect(x + ex - 3, y - 12, 6, 10); ctx.fillStyle = (frame >> 1) & 1 ? '#d0d0d0' : '#606060'; ctx.fillRect(x + ex - 8, y - 13, 16, 1); }
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(x - 20, y + 42, 40, 4);
          ctx.fillStyle = b.flash ? '#fff' : '#606a78';
          ctx.fillRect(x - 24, y - 36, 48, 76); ctx.fillRect(x - 18, y - 44, 36, 8); ctx.fillRect(x - 10, y - 50, 20, 6); ctx.fillRect(x - 18, y + 40, 36, 4);
          ctx.fillStyle = '#808a98'; ctx.fillRect(x - 12, y - 6, 24, 20);
          ctx.fillStyle = '#a0a8b8'; ctx.fillRect(x - 8, y - 2, 16, 8); ctx.fillStyle = '#303038'; ctx.fillRect(x - 3, y - 16, 6, 10);
          ctx.fillStyle = '#e8e8e8'; ctx.fillRect(x - 1, y - 20, 2, 6);
        }
        for (const p of b.parts) {
          const px = x + p.dx, py = y + p.dy;
          if (p.hp <= 0) { ctx.fillStyle = '#202020'; ctx.fillRect(px - 4, py - 4, 8, 8); continue; }
          ctx.fillStyle = p.flash ? '#fff' : '#a03020'; ctx.fillRect(px - 5, py - 5, 10, 10);
          ctx.fillStyle = '#ffa020'; ctx.fillRect(px - 2, py - 2, 4, 4);
          const a = aim(px, py); ctx.fillStyle = '#202020';
          for (let i = 3; i < 9; i++) ctx.fillRect(Math.round(px + Math.cos(a) * i), Math.round(py + Math.sin(a) * i), 2, 2);
        }
      }
      function drawBoom(ctx, f) {
        if (f.t < 0) return;
        const x = Math.round(f.x), y = Math.round(f.y), m = f.big ? 2 : 1, t = f.t;
        const r = (2 + t * 0.6) * m;
        const cols = ['#ffffff', '#ffe040', '#ffa020', '#ff3020', '#802010'];
        ctx.fillStyle = cols[Math.min(4, (t / (f.big ? 8 : 5)) | 0)];
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + t * 0.1; ctx.fillRect(Math.round(x + Math.cos(a) * r) - m, Math.round(y + Math.sin(a) * r) - m, 2 * m + 1, 2 * m + 1); }
        if (t < 8) ctx.fillRect(x - 2 * m, y - 2 * m, 4 * m, 4 * m);
      }
      function drawHUD(ctx) {
        if ((frame >> 4) & 1 || mode === 'title') text(ctx, '1UP', 8, 2, '#ff4040');
        text(ctx, String(g ? g.score : 0), 64, 11, '#fff', { right: true });
        text(ctx, 'HI-SCORE', 112, 2, '#ff4040', { center: true });
        text(ctx, String(Math.max(hi, g ? g.score : 0)), 136, 11, '#fff', { right: true });
        if (g && mode === 'game') {
          for (let i = 0; i < Math.min(6, g.lives - 1); i++) ctx.drawImage(LIFE, 3 + i * 12, H - 11);
          text(ctx, FORMS[g.form], W - 3, H - 9, g.formMsg && (frame >> 2) & 1 ? '#fff' : '#60e8ff', { right: true });
        }
      }
      function drawTitle(ctx) {
        drawSea(ctx, STAGES[0], titleT * 0.6);
        ctx.fillStyle = 'rgba(0,0,30,0.45)'; ctx.fillRect(0, 0, W, H);
        text(ctx, 'TOKIO', 112 + 3, 52 + 3, '#600000', { center: true, scale: 4 });
        text(ctx, 'TOKIO', 112, 52, '#ff3020', { center: true, scale: 4 });
        text(ctx, 'SCRAMBLE FORMATION', 112, 92, '#fff', { center: true, shadow: '#000' });
        // demo formation
        const cx = 112 + Math.sin(titleT * 0.02) * 40, cy = 150;
        const fm = Math.floor(titleT / 180) % 3;
        for (let i = 0; i < 4; i++) {
          let x, y;
          if (fm === 0) { x = cx + [-18, 18, -32, 32][i]; y = cy + 4 + (i >= 2 ? 6 : 0); }
          else if (fm === 1) { const s = i & 1 ? 1 : -1, k = (i >> 1) + 1; x = cx + s * 13 * k; y = cy + 12 * k; }
          else { const a = frame * 0.06 + i / 4 * TAU; x = cx + Math.cos(a) * 22; y = cy + Math.sin(a) * 22; }
          drawC(ctx, HELP, x, y);
        }
        drawC(ctx, JET, cx, cy);
        text(ctx, 'FORMATION ' + FORMS[fm], 112, 186, '#60e8ff', { center: true });
        text(ctx, 'SHOOT THE TRANSPORT TO FREE', 112, 200, '#ffe040', { center: true, adv: 7 });
        text(ctx, 'YOUR WINGMEN', 112, 209, '#ffe040', { center: true, adv: 7 });
        if (api.credits > 0) { if ((frame >> 5) & 1) text(ctx, 'PUSH START', 112, 226, '#40ffff', { center: true }); }
        else if (coinFlash > 0 ? (frame >> 2) & 1 : (frame >> 5) & 1) text(ctx, 'INSERT COIN', 112, 226, coinFlash ? '#ffe040' : '#ff4040', { center: true });
        text(ctx, '\u00a9 1986 TAITO (RECREATION)', 112, 238, '#a0a0c0', { center: true, adv: 7 });
        text(ctx, 'CREDIT ' + pad2(api.credits), 8, 247, '#fff');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { drawTitle(ctx); drawHUD(ctx); return; }
        const st = g.map.st;
        drawSea(ctx, st, g.scroll);
        for (const is of g.map.isles) drawIsle(ctx, is, g.scroll, st);
        for (const c of g.craters) { const y = Math.round(g.scroll - c.d); ctx.fillStyle = '#302820'; ctx.fillRect(Math.round(c.x) - 4 * c.s, y - 3 * c.s, 8 * c.s, 6 * c.s); }
        for (const e of g.en) if (e.k === 'ship') drawShip(ctx, e);
        for (const e of g.en) if (e.k === 'turret') drawTurret(ctx, e);
        if (g.boss && g.boss.type === 'battleship') drawBoss(ctx, g.boss);
        // air layer shadows
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        for (const e of g.en) if (!e.ground) ctx.fillRect(Math.round(e.x + 10), Math.round(e.y + 16), e.k === 'carrier' ? 20 : 8, 3);
        if (!g.p.dead && g.phase !== 'wait' && g.phase !== 'over') ctx.fillRect(Math.round(g.p.x + 12), Math.round(g.p.y + 18), 10, 3);
        for (const d of g.drops) {
          const x = Math.round(d.x), y = Math.round(d.y);
          ctx.fillStyle = '#fff'; ctx.fillRect(x - 7, y - 14, 14, 3); ctx.fillRect(x - 5, y - 16, 10, 2);
          ctx.fillStyle = '#ff3020'; ctx.fillRect(x - 1, y - 16, 2, 5);
          ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x - 6, y - 11, 1, 6); ctx.fillRect(x + 5, y - 11, 1, 6);
          drawC(ctx, HELP, x, y);
        }
        for (const e of g.en) {
          if (e.ground) continue;
          if (e.k === 'fighter') drawC(ctx, e.flash ? FIGHT2[angIdx(e.ang, NR)] : (e.gid && e.path ? FIGHT : FIGHT2)[angIdx(e.ang, NR)], e.x, e.y);
          else if (e.k === 'jet') drawC(ctx, JETE[angIdx(e.ang, NR)], e.x, e.y);
          else if (e.k === 'heli') {
            drawC(ctx, HELI, e.x, e.y);
            ctx.fillStyle = '#c0c0c0'; const a = frame * 0.5;
            ctx.fillRect(Math.round(e.x + Math.cos(a) * 9) - 1, Math.round(e.y - 3 + Math.sin(a) * 3), 3, 1); ctx.fillRect(Math.round(e.x - Math.cos(a) * 9) - 1, Math.round(e.y - 3 - Math.sin(a) * 3), 3, 1);
          } else if (e.k === 'carrier') {
            drawC(ctx, e.flash ? CARRIERF : CARRIER, e.x, e.y);
            ctx.save(); ctx.globalAlpha = 0.9; drawC(ctx, HELP, e.x, e.y + 2); ctx.restore();
            ctx.fillStyle = (frame >> 3) & 1 ? '#c0c0c0' : '#606060'; ctx.fillRect(Math.round(e.x) - 14, Math.round(e.y) + 1, 6, 1); ctx.fillRect(Math.round(e.x) + 9, Math.round(e.y) + 1, 6, 1);
          }
        }
        if (g.boss && g.boss.type === 'fortress') drawBoss(ctx, g.boss);
        // player + helpers
        const p = g.p;
        if (!p.dead && g.phase !== 'wait' && g.phase !== 'over' && !(p.inv && (frame >> 1) & 1)) {
          for (const h of g.helpers) drawC(ctx, HELP, h.x, h.y);
          const w = JET.width, bank = Math.round(p.bank * 2);
          ctx.drawImage(JET, Math.round(p.x - w / 2 + (bank < 0 ? 1 : 0)), Math.round(p.y - 8), w - Math.abs(bank), JET.height);
          ctx.fillStyle = (frame >> 1) & 1 ? '#ffe040' : '#ff3020'; ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) + 7, 2, 2 + (frame & 1));
        }
        for (const s of g.shots) { ctx.fillStyle = s.h ? '#60e8ff' : '#ffffa0'; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 3, 2, 6); }
        for (const b of g.eb) { const x = Math.round(b.x), y = Math.round(b.y); ctx.fillStyle = (frame >> 2) & 1 ? '#ff6040' : '#ffe040'; ctx.fillRect(x - 2, y - 1, 4, 3); ctx.fillRect(x - 1, y - 2, 2, 5); }
        for (const f of g.fx) drawBoom(ctx, f);
        for (const q of g.pops) text(ctx, q.txt, q.x, Math.round(q.y), q.col, { center: true, adv: 6 });
        if (g.phase === 'ready') {
          text(ctx, 'STAGE ' + (g.stage + 1), 112, 100, '#ffe040', { center: true, scale: 2, shadow: '#000' });
          text(ctx, st.name, 112, 122, '#fff', { center: true, shadow: '#000' });
        }
        if (g.phase === 'boss' && g.boss && g.boss.t < 150 && (frame >> 3) & 1) text(ctx, 'WARNING!', 112, 120, '#ff3020', { center: true, scale: 2, shadow: '#000' });
        if (g.phase === 'clear' && g.phaseT < 180) text(ctx, 'MISSION COMPLETE', 112, 110, '#fff', { center: true, shadow: '#000' });
        if (g.phase === 'over') text(ctx, 'GAME OVER', 112, 120, '#ff3020', { center: true, scale: 2, shadow: '#000' });
        drawHUD(ctx);
      }
      if (api.debugHook) api.debugHook({ g: () => g, mode: () => mode });
      return { update, render, destroy() { } };
    }
  });
})();
