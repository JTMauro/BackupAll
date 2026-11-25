// Gorf (Midway, 1981) \u2014 procedural recreation for the MAME32 Game Room.
// Five missions per tour: Astro Battles, Laser Attack, Galaxians, Space Warp and the Flag Ship.
// Quark laser: one shot on screen; firing again cancels the shot in flight. Rank rises with each Flag Ship destroyed.
(function () {
  'use strict';
  // ---------- compact 5x7 bitmap arcade font ----------
  const FK = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-.,:!?=*/'\"<>()+%#@^_~";
  const FD = "ehjlphe4c4444eeh168gvv2421he26aiv22vgu11he68guhhev124888ehhehheehhf12c4ahhvhhuhhuhhuehgggheuhhhhhuvgguggvvggugggfggjhhfhhhvhhhe44444e11111hehikokihggggggvhrllhhhhhpljhhehhhhheuhhugggehhhliduhhukihfgge11uv444444hhhhhhehhhhha4hhhllrhhha4ahhhha4444v1248gv000v00000000cc0000c480cc0cc04444404eh1240400v0v000level001248g04480000aa00000248g842842124824888428422248044v440pq48mj0avaaavaehnlnge4el4444000000vehlplhe";
  const FONT = {};
  for (let i = 0; i < FK.length; i++) { const g = []; for (let r = 0; r < 7; r++) g.push(parseInt(FD[i * 7 + r], 32)); FONT[FK[i]] = g; }
  FONT['\u00a9'] = [0x0E, 0x11, 0x17, 0x14, 0x17, 0x11, 0x0E];
  function text(ctx, s, x, y, col, o) {
    o = o || {}; const sc = o.scale || 1, adv = (o.adv || 8) * sc;
    s = String(s).toUpperCase();
    if (o.center) x = Math.round(x - (s.length * adv - (adv - 5 * sc)) / 2);
    if (o.right) x = Math.round(x - (s.length * adv - (adv - 5 * sc)));
    ctx.fillStyle = col;
    for (const ch of s) {
      const g = FONT[ch];
      if (g) for (let r = 0; r < 7; r++) { const b = g[r]; if (b) for (let c = 0; c < 5; c++) if ((b >> (4 - c)) & 1) ctx.fillRect(x + c * sc, y + r * sc, sc, sc); }
      x += adv;
    }
  }
  function spr(rows, pal) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
    return c;
  }
  function rotRows(rows, a, N) {
    const h = rows.length, w = Math.max.apply(null, rows.map(r => r.length));
    const c = (N - 1) / 2, cx = (w - 1) / 2, cy = (h - 1) / 2, cs = Math.cos(-a), sn = Math.sin(-a), out = [];
    for (let y = 0; y < N; y++) {
      let s = '';
      for (let x = 0; x < N; x++) {
        const dx = x - c, dy = y - c;
        const sx = Math.round(cx + dx * cs - dy * sn), sy = Math.round(cy + dx * sn + dy * cs);
        s += (sy >= 0 && sy < h && sx >= 0 && sx < w) ? (rows[sy][sx] || '.') : '.';
      }
      out.push(s);
    }
    return out;
  }
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

  const W = 224, H = 288;
  const PYMIN = 222, PYMAX = 270;
  const MISSIONS = ['ASTRO BATTLES', 'LASER ATTACK', 'GALAXIANS', 'SPACE WARP', 'FLAG SHIP'];
  const RANKS = ['SPACE CADET', 'SPACE CAPTAIN', 'SPACE COLONEL', 'SPACE GENERAL', 'SPACE WARRIOR', 'SPACE AVENGER'];
  const TAUNTS = ['GORF WILL CRUSH YOU', 'YOU CANNOT ESCAPE GORF', 'GORF IS WATCHING YOU', 'SURRENDER TO GORF', 'GORF SHALL RULE', 'GORF FEARS NO ONE'];

  // ---------- pixel art ----------
  const SHIP_ROWS = [
    '....W....',
    '....W....',
    '...WCW...',
    '...WCW...',
    '..WWWWW..',
    '.RWWWWWR.',
    'RRWW.WWRR',
    'R.Y...Y.R'];
  const SHIP = spr(SHIP_ROWS, { W: '#f0f0ff', C: '#30d0ff', R: '#ff3030', Y: '#ffe040' });
  const MINI = spr(['..W..', '.WCW.', 'RWWWR', 'R...R'], { W: '#f0f0ff', C: '#30d0ff', R: '#ff3030' });
  const INV_ART = [
    [['..A.....A..', '...A...A...', '..AAAAAAA..', '.AA.AAA.AA.', 'AAAAAAAAAAA', 'A.AAAAAAA.A', 'A.A.....A.A', '...AA.AA...'],
     ['..A.....A..', 'A..A...A..A', 'A.AAAAAAA.A', 'AAA.AAA.AAA', 'AAAAAAAAAAA', '.AAAAAAAAA.', '..A.....A..', '.A.......A.']],
    [['....AA....', '...AAAA...', '..AAAAAA..', '.AA.AA.AA.', '.AAAAAAAA.', '...A..A...', '..A.AA.A..', '.A.A..A.A.'],
     ['....AA....', '...AAAA...', '..AAAAAA..', '.AA.AA.AA.', '.AAAAAAAA.', '..A.AA.A..', '.A......A.', '..A....A..']],
    [['...AAAAAA...', '.AAAAAAAAAA.', 'AAAAAAAAAAAA', 'AAA..AA..AAA', 'AAAAAAAAAAAA', '...AA..AA...', '..AA.AA.AA..', 'AA........AA'],
     ['...AAAAAA...', '.AAAAAAAAAA.', 'AAAAAAAAAAAA', 'AAA..AA..AAA', 'AAAAAAAAAAAA', '..AAA..AAA..', '.AA..AA..AA.', '..AA....AA..']]
  ];
  const INV_COL = ['#ff40ff', '#40ffff', '#ffe040', '#40ff40'];
  const INV = INV_COL.map((col, r) => INV_ART[[1, 1, 0, 2][r]].map(a => spr(a, { A: col })));
  const SAUCER = spr(['.....RRRRRR.....', '...RRRRRRRRRR...', '..RRWRRWRRWRRWR.', 'RRRRRRRRRRRRRRRR', '..RRR..RR..RRR..', '...R........R...'], { R: '#ff3030', W: '#ffffff' });
  const LASER = spr(['.....RRRRR.....', '...RRYYYYYRR...', '.RRYYWWWWWYYRR.', 'RRRRRRRRRRRRRRR', '.B.B.B.B.B.B.B.', '....RRRRRRR....', '......RRR......'], { R: '#ff3030', Y: '#ffe040', W: '#ffffff', B: '#3060ff' });
  const ESC = spr(['....C....', '...CCC...', 'C.CCWCC.C', 'CCCCCCCCC', 'C..C.C..C', 'C.......C'], { C: '#40ff90', W: '#ffffff' });
  const GAL_ART = ['A..........A', 'AA........AA', 'AAA.BBBB.AAA', '.AABBBBBBAA.', '..ABBCCBBA..', '...BBBBBB...', '...B.BB.B...', '....B..B....'];
  const GAL_ART2 = ['............', 'A..........A', 'AA.BBBBBB.AA', 'AAABBBBBBAAA', '.AABBCCBBAA.', '...BBBBBB...', '...B.BB.B...', '...B....B...'];
  const GAL_PAL = [{ A: '#2a5cff', B: '#00b4ff', C: '#ffe000' }, { A: '#b030ff', B: '#ff70ff', C: '#ffe000' }, { A: '#ff2020', B: '#ffe000', C: '#ffffff' }];
  const GAL = GAL_PAL.map(p => { const rot = []; for (let i = 0; i < 16; i++) rot.push(spr(rotRows(GAL_ART, i * TAU / 16, 15), p)); return { f: [spr(GAL_ART, p), spr(GAL_ART2, p)], rot }; });
  const WARPER = [spr(['.....Y.....', '...YYYYY...', '..YRRRRRY..', 'YYYYYYYYYYY', '.GGGGGGGGG.', '..G.G.G.G..', '.G.......G.'], { Y: '#ffe040', R: '#ff3030', G: '#40ff40' }),
    spr(['.....Y.....', '...YYYYY...', '..YRRRRRY..', 'YYYYYYYYYYY', '.GGGGGGGGG.', '.G.G.G.G.G.', 'G.........G'], { Y: '#ffe040', R: '#ff3030', G: '#40ff40' })];

  ArcadeRegistry.register({
    id: 'gorf', title: 'Gorf', year: 1981, maker: 'Midway',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Space: quark laser (re-fire cancels shot) \u00b7 Enter: start',
    marquee: { bg: '#000010', fg: '#ff3030', accent: '#30d0ff' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(10000);
      let mode = 'title', titleT = 0, frame = 0, coinFlash = 0, lastCred = api.credits;
      let g = null;

      const stars = [];
      for (let i = 0; i < 70; i++) stars.push({ x: Math.random() * W | 0, y: Math.random() * H, c: ['#ffffff', '#8080ff', '#ff8080', '#ffff80'][i % 4], sp: 0.2 + (i % 3) * 0.2 });
      function updStars() { for (const s of stars) { s.y += s.sp; if (s.y >= H) { s.y -= H; s.x = Math.random() * W | 0; } } }

      // ---------- sound ----------
      const sfx = {
        shot() { au.tone(2600, 0.09, { type: 'sawtooth', vol: 0.07, slideTo: 900 }); },
        cancel() { au.tone(400, 0.03, { type: 'square', vol: 0.04 }); },
        hit() { au.noise(0.2, { vol: 0.2, freq: 2600, slideTo: 300 }); au.tone(900, 0.1, { type: 'square', vol: 0.05, slideTo: 200 }); },
        chip() { au.tone(220, 0.04, { type: 'square', vol: 0.05, slideTo: 120 }); },
        march(n) { au.tone([98, 92, 87, 82][n & 3], 0.07, { type: 'square', vol: 0.09 }); },
        saucer() { au.tone(700, 0.12, { type: 'sine', vol: 0.05, slideTo: 900 }); },
        laser() { au.tone(1400, 0.8, { type: 'sawtooth', vol: 0.06, slideTo: 300 }); au.noise(0.8, { vol: 0.06, freq: 4000, type: 'highpass' }); },
        warp(n) { au.tone(200 + (n % 16) * 40, 0.08, { type: 'triangle', vol: 0.04 }); },
        die() { au.noise(1.4, { vol: 0.28, freq: 1600, slideTo: 50 }); au.tone(800, 1.2, { type: 'sawtooth', vol: 0.06, slideTo: 40 }); },
        big() { au.noise(3, { vol: 0.32, freq: 1200, slideTo: 30 }); au.tone(100, 2.5, { type: 'sawtooth', vol: 0.1, slideTo: 25 }); },
        voice() { // robotic "speech" warble
          let t = 0; const n = 6 + (Math.random() * 5 | 0);
          for (let i = 0; i < n; i++) { const d = rnd(0.06, 0.14); au.tone(rnd(90, 180), d, { type: 'sawtooth', vol: 0.09, slideTo: rnd(80, 200), delay: t }); au.noise(d, { vol: 0.04, freq: rnd(800, 2500), type: 'bandpass', delay: t }); t += d + 0.02; }
        },
        promote() { au.melody([[523, .12], [659, .12], [784, .12], [1047, .24], [784, .12], [1047, .4]], { type: 'square', vol: 0.08 }); },
        coin() { au.tone(1760, 0.06, { type: 'square', vol: 0.07, slideTo: 2640 }); },
        start() { au.melody([[262, .1], [330, .1], [392, .1], [523, .2], [392, .1], [523, .3]], { type: 'square', vol: 0.08 }); }
      };

      // ---------- game ----------
      function newGame(demo) {
        g = {
          demo, score: 0, lives: 3, rank: 0, tour: 0, mission: 0, phase: 'mission', phaseT: demo ? 90 : 210,
          px: W / 2, py: 258, alive: false, deadT: 0, shot: null, eb: [], en: [], booms: [], pops: [], t: 0,
          shield: null, saucer: null, saucerT: 600, inv: null, fs: null, warp: null, fireT: 60, diveT: 120, sway: 0, swayDir: 1,
          taunt: TAUNTS[0], demoT: 0, overPending: false, marchN: 0, marchT: 0, flash: 0
        };
        setupMission();
        if (!demo) { sfx.start(); }
      }
      const lvl = () => g.tour;
      function setupMission() {
        g.en = []; g.eb = []; g.shot = null; g.shield = null; g.saucer = null; g.fs = null; g.warp = null; g.t = 0;
        g.fireT = 90; g.diveT = 150; g.sway = 0;
        g.taunt = TAUNTS[Math.random() * TAUNTS.length | 0]; g.voiceT = 20;
        const m = g.mission;
        if (m === 0) {
          for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) g.en.push({ type: 'inv', r, c, x: 0, y: 0 });
          g.inv = { ox: 40, oy: 50 + Math.min(30, lvl() * 8), dir: 1 };
          g.shield = new Uint8Array(96 * 3).fill(1);
          g.saucerT = 500;
          placeInvaders();
        } else if (m === 1) {
          for (let k = 0; k < 2; k++) {
            const L = { type: 'laser', k, x: W / 2, y: -20, state: 'patrol', t: 0, beam: 0, cool: 120 + k * 120 };
            g.en.push(L);
            for (let i = 0; i < 4; i++) g.en.push({ type: 'esc', k, i, ox: [-18, 18, -10, 10][i], oy: [6, 6, -10, -10][i], x: W / 2, y: -20, state: 'form', vx: 0, vy: 0 });
          }
        } else if (m === 2) {
          const rows = [[2, 3, 4, 5], [0, 1, 2, 3, 4, 5, 6, 7], [0, 1, 2, 3, 4, 5, 6, 7]];
          rows.forEach((cols, r) => cols.forEach(c => g.en.push({ type: 'gal', kind: 2 - r, r, c, state: 'form', x: 0, y: 0, hd: Math.PI / 2, sp: 0, turn: 0, la: 0, shots: 0 })));
        } else if (m === 3) {
          g.warp = { cx: W / 2, cy: 112, quota: 8 + Math.min(8, lvl() * 2), killed: 0, spawnT: 60 };
        } else {
          const cells = new Uint8Array(56 * 14);
          for (let r = 0; r < 14; r++) {
            const hw = r < 9 ? 28 : 28 - (r - 8) * 5;
            for (let c = 0; c < 56; c++) {
              if (Math.abs(c - 27.5) >= hw) continue;
              const core = r >= 3 && r <= 7 && c >= 24 && c <= 31 && !((r === 3 || r === 7) && (c === 24 || c === 31));
              cells[r * 56 + c] = core ? 2 : 1;
            }
          }
          g.fs = { x: W / 2, y: 36, t: 0, cells, alive: true, deadT: 0, fireT: 60 };
        }
      }
      function placeInvaders() {
        for (const e of g.en) if (e.type === 'inv') { e.x = g.inv.ox + e.c * 24; e.y = g.inv.oy + e.r * 16; }
      }
      function addScore(n) {
        if (g.demo) return;
        g.score += n;
        if (g.score > hi) hi = g.score;
      }
      function boom(x, y, big, pal) { g.booms.push({ x, y, t: 0, big: !!big, pal: pal || 0 }); }
      function pop(x, y, n) { g.pops.push({ x, y, txt: String(n), t: 60 }); }
      function enemyShot(x, y, vx, vy, kind) { if (g.eb.length < 6 + lvl() * 2) g.eb.push({ x, y, vx, vy, kind: kind || 0 }); }
      function aimShot(x, y, sp, kind) { const dx = g.px - x, dy = g.py - y, d = Math.hypot(dx, dy) || 1; enemyShot(x, y, dx / d * sp, dy / d * sp, kind); }

      // ---------- mission 1: Astro Battles ----------
      function shieldCellY(i, row) { return 204 - Math.round(20 * Math.sin(Math.PI * (i + 0.5) / 96)) + row * 2; }
      function hitShield(x, y) {
        if (!g.shield) return false;
        const i = Math.floor((x - 16) / 2); if (i < 0 || i >= 96) return false;
        for (let row = 0; row < 3; row++) {
          const cy = shieldCellY(i, row);
          if (g.shield[row * 96 + i] && y >= cy - 1 && y < cy + 3) {
            for (let k = -1; k <= 1; k++) if (i + k >= 0 && i + k < 96 && (k === 0 || Math.random() < 0.6)) { g.shield[row * 96 + i + k] = 0; if (row < 2 && Math.random() < 0.4) g.shield[(row + 1) * 96 + i + k] = 0; }
            return true;
          }
        }
        return false;
      }
      function updAstro() {
        const inv = g.inv, n = g.en.length;
        if (!n) return;
        const sp = 0.25 + (24 - n) * 0.045 + lvl() * 0.08 + (n === 1 ? 0.8 : 0);
        inv.ox += inv.dir * sp;
        let minX = 999, maxX = -999, maxY = 0;
        for (const e of g.en) { const x = inv.ox + e.c * 24, y = inv.oy + e.r * 16; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y > maxY) maxY = y; }
        if (minX < 10 && inv.dir < 0) { inv.dir = 1; inv.oy += 6; }
        if (maxX > W - 10 && inv.dir > 0) { inv.dir = -1; inv.oy += 6; }
        placeInvaders();
        // march beat
        g.marchT += sp; if (g.marchT > 12) { g.marchT = 0; g.marchN++; if (!g.demo) sfx.march(g.marchN); }
        // invaders chew through the force field when low
        for (const e of g.en) if (e.y > 180) for (let dx = -6; dx <= 6; dx += 2) hitShieldSilent(e.x + dx, e.y + 4);
        if (maxY > PYMIN - 12) {
          if (g.alive) killPlayer();
          inv.oy -= 50; placeInvaders();
        }
        if (--g.fireT <= 0 && g.alive) {
          g.fireT = Math.max(16, 55 - lvl() * 8 - (24 - n)) + (Math.random() * 30 | 0);
          // lowest invader of a random column (biased toward the player)
          const cols = {};
          for (const e of g.en) if (!cols[e.c] || e.r > cols[e.c].r) cols[e.c] = e;
          const list = Object.keys(cols).map(k => cols[k]);
          let e = list[Math.random() * list.length | 0];
          if (Math.random() < 0.5) for (const c of list) if (Math.abs(c.x - g.px) < Math.abs(e.x - g.px)) e = c;
          enemyShot(e.x, e.y + 6, 0, 2 + lvl() * 0.25, 1);
        }
        // saucer
        if (!g.saucer && --g.saucerT <= 0) { const d = Math.random() < 0.5 ? 1 : -1; g.saucer = { x: d > 0 ? -16 : W + 16, y: 30, vx: d * 0.9 }; }
        if (g.saucer) {
          g.saucer.x += g.saucer.vx;
          if (g.t % 10 === 0 && !g.demo) sfx.saucer();
          if (g.saucer.x < -20 || g.saucer.x > W + 20) { g.saucer = null; g.saucerT = 700 + (Math.random() * 400 | 0); }
        }
      }
      function hitShieldSilent(x, y) {
        const i = Math.floor((x - 16) / 2); if (i < 0 || i >= 96 || !g.shield) return;
        for (let row = 0; row < 3; row++) { const cy = shieldCellY(i, row); if (y >= cy - 4 && y < cy + 4) g.shield[row * 96 + i] = 0; }
      }

      // ---------- mission 2: Laser Attack ----------
      function patrolPos(k) {
        return [W / 2 + Math.sin(g.t * 0.012 + k * Math.PI) * 70, 66 + Math.sin(g.t * 0.024 + k * 1.7) * 20];
      }
      function moveTo(e, tx, ty, sp) {
        const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
        if (d <= sp) { e.x = tx; e.y = ty; return true; }
        e.x += dx / d * sp; e.y += dy / d * sp; return false;
      }
      function updLaser() {
        for (const e of g.en) {
          const [px, py] = patrolPos(e.k);
          if (e.type === 'laser') {
            e.t++;
            if (e.state === 'patrol') {
              moveTo(e, px, py, 2);
              if (--e.cool <= 0 && g.alive && !g.en.some(o => o.type === 'laser' && o !== e && o.state !== 'patrol')) {
                e.state = 'descend'; e.tx = Math.max(16, Math.min(W - 16, g.px + rnd(-24, 24))); e.ty = rnd(100, 150);
              }
            } else if (e.state === 'descend') {
              if (moveTo(e, e.tx, e.ty, 1.6 + lvl() * 0.2)) { e.state = 'fire'; e.beam = 0; e.t = 0; if (!g.demo) sfx.laser(); }
            } else if (e.state === 'fire') {
              e.beam = Math.min(H, e.beam + 7);
              if (e.t > 70) e.state = 'retract';
            } else if (e.state === 'retract') {
              e.beam -= 10; if (e.beam <= 0) { e.beam = 0; e.state = 'return'; }
            } else if (e.state === 'return') {
              if (moveTo(e, px, py, 1.8)) { e.state = 'patrol'; e.cool = Math.max(60, 200 - lvl() * 25) + (Math.random() * 80 | 0); }
            }
            if (e.state === 'patrol' && g.alive && Math.random() < 0.006 + lvl() * 0.002) aimShot(e.x, e.y + 6, 2, 0);
          } else {
            const sx = px + e.ox, sy = py + e.oy;
            if (e.state === 'form') {
              moveTo(e, sx, sy, 2.5);
              if (g.alive && Math.random() < 0.0012 + lvl() * 0.0006) { e.state = 'dive'; e.vx = 0; e.vy = 1; }
            } else if (e.state === 'dive') {
              const dx = g.px - e.x;
              e.vx = Math.max(-1.6, Math.min(1.6, e.vx + Math.sign(dx) * 0.06));
              e.vy = Math.min(2.6 + lvl() * 0.2, e.vy + 0.05);
              e.x += e.vx; e.y += e.vy;
              if (e.y < PYMIN - 30 && Math.random() < 0.015) enemyShot(e.x, e.y + 4, 0, 2.6, 0);
              if (e.y > H + 8) { e.y = -10; e.state = 'back'; }
            } else if (e.state === 'back') {
              if (moveTo(e, sx, sy, 2.2)) e.state = 'form';
            }
          }
        }
        // laser beam kills
        if (g.alive) for (const e of g.en) if (e.type === 'laser' && e.beam > 0 && Math.abs(e.x - g.px) < 5 && e.y + 4 + e.beam > g.py - 4) killPlayer();
      }

      // ---------- mission 3: Galaxians ----------
      function galSlot(e) { return [W / 2 - 70 + e.c * 20 + g.sway, 50 + e.r * 16]; }
      function updGal() {
        let minC = 7, maxC = 0;
        for (const e of g.en) { if (e.c < minC) minC = e.c; if (e.c > maxC) maxC = e.c; }
        g.sway += g.swayDir * 0.3;
        if (W / 2 - 70 + minC * 20 + g.sway < 12) g.swayDir = 1;
        if (W / 2 - 70 + maxC * 20 + g.sway > W - 12) g.swayDir = -1;
        const n = g.en.length;
        const divers = g.en.filter(e => e.state !== 'form').length;
        if (--g.diveT <= 0 && g.alive) {
          g.diveT = Math.max(30, 110 - lvl() * 15) + (Math.random() * 50 | 0);
          const maxD = n <= 4 ? n : 2 + Math.min(4, lvl());
          if (divers < maxD) {
            const fm = g.en.filter(e => e.state === 'form');
            if (fm.length) {
              const e = fm[Math.random() * fm.length | 0];
              e.state = 'loop'; e.hd = -Math.PI / 2; e.turn = e.x < W / 2 ? -1 : 1; e.la = 0; e.sp = 1.4; e.shots = 2 + Math.min(3, lvl());
              if (!g.demo) au.tone(1400, 0.8, { type: 'sine', vol: 0.05, slideTo: 300 });
            }
          }
        }
        for (const e of g.en) {
          const [sx, sy] = galSlot(e);
          if (e.state === 'form') { e.x = sx; e.y = sy; e.hd = Math.PI / 2; continue; }
          if (e.state === 'loop') {
            e.hd += e.turn * 0.09; e.la += 0.09;
            e.x += Math.cos(e.hd) * e.sp; e.y += Math.sin(e.hd) * e.sp;
            if (e.la >= Math.PI) { e.state = 'dive'; e.sp = Math.min(3, 1.7 + lvl() * 0.2); }
          } else if (e.state === 'dive') {
            if (e.y < PYMIN - 20) {
              const want = Math.atan2(g.py + 30 - e.y, (g.alive ? g.px : e.x) - e.x);
              e.hd += Math.max(-0.035, Math.min(0.035, angDiff(e.hd, want)));
            }
            e.x += Math.cos(e.hd) * e.sp; e.y += Math.sin(e.hd) * e.sp;
            if (e.x < 6 || e.x > W - 6) { e.hd = Math.PI - e.hd; e.x = Math.max(6, Math.min(W - 6, e.x)); }
            if (e.shots > 0 && e.y > 80 && e.y < PYMIN - 40 && g.alive && Math.random() < 0.04) { e.shots--; aimShot(e.x, e.y + 5, 2.4 + lvl() * 0.2, 0); }
            if (e.y > H + 10) { e.y = -12; e.x = sx; e.state = 'return'; }
          } else if (e.state === 'return') {
            if (moveTo(e, sx, sy, 1.8)) { e.state = 'form'; }
            else e.hd = Math.atan2(sy - e.y, sx - e.x);
          }
        }
      }

      // ---------- mission 4: Space Warp ----------
      function updWarp() {
        const w = g.warp;
        const active = g.en.length, maxA = 2 + Math.min(2, lvl());
        if (--w.spawnT <= 0 && active < maxA && w.killed + active < w.quota) {
          w.spawnT = 70;
          g.en.push({ type: 'warp', a: Math.random() * TAU, r: 0, dir: Math.random() < 0.5 ? 1 : -1, x: w.cx, y: w.cy, fireT: 60 });
        }
        for (const e of g.en) {
          e.a += e.dir * (0.045 - Math.min(0.02, e.r * 0.0002));
          e.r += 0.42 + lvl() * 0.06;
          e.x = w.cx + Math.cos(e.a) * e.r; e.y = w.cy + Math.sin(e.a) * e.r * 0.95;
          if (e.r > 160 || e.y > PYMAX + 8) { e.r = 0; e.a = Math.random() * TAU; }
          if (e.r > 30 && g.alive && --e.fireT <= 0) { e.fireT = Math.max(40, 100 - lvl() * 12) + (Math.random() * 60 | 0); aimShot(e.x, e.y, 2 + lvl() * 0.2, 2); }
        }
        if (g.t % 6 === 0 && !g.demo) sfx.warp(g.t / 6);
      }

      // ---------- mission 5: Flag Ship ----------
      function updFlag() {
        const f = g.fs; f.t++;
        if (!f.alive) {
          f.deadT++;
          if (f.deadT % 5 === 0 && f.deadT < 120) boom(f.x + rnd(-56, 56), f.y + rnd(-8, 28), Math.random() < 0.4, Math.random() * 4 | 0);
          if (f.deadT === 220) { g.phase = 'promote'; g.phaseT = 300; promote(); }
          return;
        }
        f.x = W / 2 + Math.sin(f.t * (0.011 + lvl() * 0.002)) * 52;
        f.y = 36 + Math.min(70, f.t / 90);
        if (--f.fireT <= 0 && g.alive) {
          f.fireT = Math.max(18, 50 - lvl() * 6) + (Math.random() * 30 | 0);
          const c = Math.random() * 56 | 0;
          let r = 13; while (r >= 0 && !f.cells[r * 56 + c]) r--;
          const x = f.x - 56 + c * 2 + 1, y = f.y + (r >= 0 ? r * 2 + 2 : 0);
          if (Math.random() < 0.25 + lvl() * 0.05) { for (const v of [-0.7, 0, 0.7]) enemyShot(x, y, v, 2.2, 2); }
          else aimShot(x, y, 2.2 + lvl() * 0.2, 2);
        }
      }
      function shotVsFlag(sx, sy) {
        const f = g.fs; if (!f || !f.alive) return false;
        const lx = sx - (f.x - 56), ly = sy - f.y;
        if (ly < -10 || ly >= 28 || lx < 0 || lx >= 112) return false;
        if (ly < 0) return Math.abs(sx - f.x) < 20; // bridge absorbs
        const c = lx >> 1, r = ly >> 1, v = f.cells[r * 56 + c];
        if (!v) return false;
        if (v === 2) { killFlag(); return true; }
        f.cells[r * 56 + c] = 0;
        for (const [dc, dr] of [[-1, 0], [1, 0], [0, -1]]) { const cc = c + dc, rr = r + dr; if (cc >= 0 && cc < 56 && rr >= 0 && f.cells[rr * 56 + cc] === 1 && Math.random() < 0.6) f.cells[rr * 56 + cc] = 0; }
        addScore(10); sfx.chip(); boom(sx, sy, false, 3);
        return true;
      }
      function killFlag() {
        const f = g.fs; f.alive = false; f.deadT = 0;
        const pts = 1000 + g.rank * 500;
        addScore(pts); pop(f.x, f.y + 10, pts);
        g.eb = []; g.flash = 30; sfx.big();
      }
      function promote() {
        if (g.rank < RANKS.length - 1) g.rank++;
        g.lives++;
        if (!g.demo) sfx.promote();
      }

      // ---------- player ----------
      function killPlayer() {
        if (!g.alive) return;
        g.alive = false; g.deadT = 0; g.shot = null; g.lives--;
        boom(g.px, g.py, true, 1); sfx.die();
      }
      function gameOver() {
        if (!g.demo) api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 270;
      }
      function lastLife() {
        if (g.demo) { g.phase = 'over'; g.phaseT = 60; return; }
        if (!api.offerContinue) { gameOver(); return; }
        const cg = g;
        api.offerContinue(() => { if (g === cg) { g.lives = 3; respawn(); } }, () => { if (g === cg) gameOver(); });
      }
      function respawn() { g.alive = true; g.px = W / 2; g.py = 258; g.overPending = false; g.eb = []; }

      function killEnemy(e) {
        const i = g.en.indexOf(e); if (i < 0) return;
        g.en.splice(i, 1);
        let pts = 0, pal = 0;
        if (e.type === 'inv') { pts = [40, 30, 20, 10][e.r] + 0; pal = 2; }
        else if (e.type === 'laser') { pts = e.state === 'patrol' ? 100 : 200; pal = 1; pop(e.x, e.y, pts); }
        else if (e.type === 'esc') { pts = e.state === 'form' ? 50 : 80; pal = 4; }
        else if (e.type === 'gal') { pts = e.state === 'form' ? [30, 40, 60][e.kind] : [60, 80, 150][e.kind]; pal = e.kind; if (e.state !== 'form') pop(e.x, e.y, pts); }
        else if (e.type === 'warp') { pts = e.r < 40 ? 300 : e.r < 80 ? 200 : 100; pal = 3; pop(e.x, e.y, pts); g.warp.killed++; }
        addScore(pts); sfx.hit(); boom(e.x, e.y, false, pal);
      }
      function hitbox(e) {
        if (e.type === 'laser') return [8, 4];
        if (e.type === 'inv') return [6, 4];
        if (e.type === 'esc') return [5, 3];
        return [6, 4];
      }

      function readCtl() {
        if (!g.demo) return { l: api.key('ArrowLeft'), r: api.key('ArrowRight'), u: api.key('ArrowUp'), d: api.key('ArrowDown'), fire: api.pressed('Space') || api.pressed('KeyZ') };
        let tx = W / 2, best = null;
        if (g.fs && g.fs.alive) tx = g.fs.x;
        for (const e of g.en) if (!best || e.y > best.y) best = e;
        if (best) tx = best.x;
        let dodge = 0;
        for (const b of g.eb) if (b.y > g.py - 40 && b.y < g.py && Math.abs(b.x - g.px) < 9) dodge = b.x > g.px ? -1 : 1;
        for (const e of g.en) if (e.beam > 0 && Math.abs(e.x - g.px) < 14) dodge = e.x > g.px ? -1 : 1;
        const dx = tx - g.px;
        return { l: dodge ? dodge < 0 : dx < -3, r: dodge ? dodge > 0 : dx > 3, u: false, d: true, fire: Math.abs(dx) < 8 && frame % 12 === 0 };
      }

      function updGame() {
        g.t++;
        if (g.flash > 0) g.flash--;
        for (const b of g.booms) b.t++;
        g.booms = g.booms.filter(b => b.t < (b.big ? 60 : 22));
        for (const p of g.pops) p.t--;
        g.pops = g.pops.filter(p => p.t > 0);
        if (g.phase === 'over') { if (--g.phaseT <= 0) { mode = 'title'; titleT = 0; } return; }
        if (g.phase === 'mission') {
          if (--g.voiceT === 0 && !g.demo) sfx.voice();
          if (--g.phaseT <= 0) { g.phase = 'play'; if (!g.alive && g.lives > 0) respawn(); }
          return;
        }
        if (g.phase === 'clear') {
          if (--g.phaseT <= 0) { g.mission++; setupMission(); g.phase = 'mission'; g.phaseT = g.demo ? 90 : 180; }
          return;
        }
        if (g.phase === 'promote') {
          if (--g.phaseT <= 0) { g.tour++; g.mission = 0; setupMission(); g.phase = 'mission'; g.phaseT = g.demo ? 90 : 180; }
          return;
        }
        if (g.demo && ++g.demoT > 2700) { mode = 'title'; titleT = 0; return; }

        const c = readCtl();
        if (g.alive) {
          if (c.l) g.px -= 1.6; if (c.r) g.px += 1.6; if (c.u) g.py -= 1.2; if (c.d) g.py += 1.2;
          g.px = Math.max(8, Math.min(W - 8, g.px)); g.py = Math.max(PYMIN, Math.min(PYMAX, g.py));
          if (c.fire) { if (g.shot) sfx.cancel(); g.shot = { x: Math.round(g.px), y: g.py - 6 }; sfx.shot(); }
        } else {
          g.deadT++;
          if (g.deadT === 150) {
            if (g.lives > 0) respawn();
            else if (!g.overPending) { g.overPending = true; lastLife(); }
          }
        }

        const m = g.mission;
        if (m === 0) updAstro(); else if (m === 1) updLaser(); else if (m === 2) updGal(); else if (m === 3) updWarp(); else updFlag();

        // quark laser
        if (g.shot) {
          for (let s = 0; s < 3 && g.shot; s++) {
            g.shot.y -= 2;
            const sx = g.shot.x, sy = g.shot.y;
            if (sy < 18) { g.shot = null; break; }
            let hit = false;
            for (const e of g.en) { const [hx, hy] = hitbox(e); if (Math.abs(e.x - sx) < hx && Math.abs(e.y - sy) < hy) { killEnemy(e); hit = true; break; } }
            if (!hit && g.saucer && Math.abs(g.saucer.x - sx) < 8 && Math.abs(g.saucer.y - sy) < 4) {
              const pts = [100, 150, 200, 300][Math.random() * 4 | 0];
              addScore(pts); pop(g.saucer.x, g.saucer.y, pts); boom(g.saucer.x, g.saucer.y, true, 1); sfx.hit(); g.saucer = null; g.saucerT = 900; hit = true;
            }
            if (!hit && shotVsFlag(sx, sy)) hit = true;
            if (hit) g.shot = null;
          }
        }

        // enemy shots
        for (const b of g.eb) { b.x += b.vx; b.y += b.vy; }
        g.eb = g.eb.filter(b => b.y < H + 4 && b.y > -8 && b.x > -8 && b.x < W + 8 && !(g.shield && b.vy > 0 && hitShield(b.x, b.y)));
        if (g.alive) {
          for (const b of g.eb) if (Math.abs(b.x - g.px) < 4 && Math.abs(b.y - g.py) < 5) { killPlayer(); b.y = H + 20; break; }
          for (const e of g.en) { const [hx, hy] = hitbox(e); if (Math.abs(e.x - g.px) < hx + 3 && Math.abs(e.y - g.py) < hy + 3) { killEnemy(e); killPlayer(); break; } }
        }

        // mission complete?
        if (g.phase === 'play') {
          let done = false;
          if (m <= 2 && g.en.length === 0) done = true;
          if (m === 3 && g.warp.killed >= g.warp.quota) done = true;
          if (done) { g.phase = 'clear'; g.phaseT = 120; g.eb = []; g.shot = null; g.saucer = null; if (!g.demo) au.melody([[659, .1], [784, .1], [988, .1], [1319, .25]], { type: 'square', vol: 0.07 }); }
        }
      }

      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 });
        return false;
      }
      function update() {
        frame++; updStars();
        if (api.credits > lastCred) sfx.coin(); lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title' || mode === 'demo') {
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(false); return; }
        }
        if (mode === 'title') { titleT++; if (titleT > 720) { mode = 'demo'; newGame(true); } return; }
        updGame();
      }

      // ---------- drawing ----------
      const BPAL = [['#ffffff', '#40c0ff', '#2a5cff'], ['#ffffff', '#ffe040', '#ff3030'], ['#ffffff', '#ff60ff', '#40ffff'], ['#ffffff', '#ffe040', '#ff8000'], ['#ffffff', '#40ff90', '#20a040']];
      function drawBoom(ctx, b) {
        const cols = BPAL[b.pal] || BPAL[0];
        const n = b.big ? 16 : 9, r = 1 + b.t * (b.big ? 0.55 : 0.45);
        for (let k = 0; k < n; k++) {
          const a = k * TAU / n + (k & 1) * 0.25;
          for (let j = 0; j < 3; j++) {
            ctx.fillStyle = cols[(j + (b.t >> 2)) % 3];
            const rr = r * (1 - j * 0.3);
            ctx.fillRect(Math.round(b.x + Math.cos(a) * rr), Math.round(b.y + Math.sin(a) * rr), b.big ? 2 : 1, b.big ? 2 : 1);
          }
        }
      }
      function drawEnemy(ctx, e) {
        if (e.type === 'inv') { const f = (g.marchN & 1); const s = INV[e.r][f]; ctx.drawImage(s, Math.round(e.x - s.width / 2), Math.round(e.y - 4)); }
        else if (e.type === 'laser') {
          if (e.beam > 0) {
            const x = Math.round(e.x), y0 = Math.round(e.y + 4), len = Math.min(e.beam, H - y0);
            ctx.fillStyle = (g.t >> 1) & 1 ? '#ffffff' : '#ff4040'; ctx.fillRect(x - 1, y0, 3, len);
            ctx.fillStyle = '#ffe040'; ctx.fillRect(x, y0, 1, len);
          }
          ctx.drawImage(LASER, Math.round(e.x - 7), Math.round(e.y - 3));
        }
        else if (e.type === 'esc') ctx.drawImage(ESC, Math.round(e.x - 4), Math.round(e.y - 3));
        else if (e.type === 'gal') {
          const S = GAL[e.kind];
          if (e.state === 'form') ctx.drawImage(S.f[((g.t >> 4) + e.c) & 1], Math.round(e.x - 6), Math.round(e.y - 4));
          else { let i = Math.round(angDiff(Math.PI / 2, e.hd) / (TAU / 16)); i = ((i % 16) + 16) % 16; ctx.drawImage(S.rot[i], Math.round(e.x - 7), Math.round(e.y - 7)); }
        }
        else if (e.type === 'warp') {
          const s = WARPER[(g.t >> 3) & 1];
          if (e.r < 12) { const k = Math.max(1, Math.round(e.r / 2)); ctx.fillStyle = '#ffe040'; ctx.fillRect(Math.round(e.x - k / 2), Math.round(e.y - k / 2), k, k); }
          else ctx.drawImage(s, Math.round(e.x - 5), Math.round(e.y - 3));
        }
      }
      const WARP_COLS = ['#ff3030', '#ff8000', '#ffe040', '#40ff40', '#40c0ff', '#3050ff', '#c040ff', '#ff40ff'];
      function drawWarp(ctx) {
        const w = g.warp;
        for (let arm = 0; arm < 4; arm++) {
          for (let i = 0; i < 40; i++) {
            const r = i * 2.2, a = arm * TAU / 4 + i * 0.16 - g.t * 0.05;
            ctx.fillStyle = WARP_COLS[(i + (g.t >> 2)) % 8];
            ctx.fillRect(Math.round(w.cx + Math.cos(a) * r), Math.round(w.cy + Math.sin(a) * r * 0.95), i > 20 ? 1 : 2, i > 20 ? 1 : 2);
          }
        }
        ctx.fillStyle = (g.t >> 2) & 1 ? '#ffffff' : '#ffe040'; ctx.fillRect(w.cx - 2, w.cy - 2, 4, 4);
        text(ctx, 'KILLS ' + w.killed + '/' + w.quota, W - 6, 22, '#40ff40', { right: true, adv: 6 });
      }
      function drawFlag(ctx) {
        const f = g.fs;
        if (!f.alive && f.deadT > 110) return;
        const x0 = Math.round(f.x - 56), y0 = Math.round(f.y);
        const white = !f.alive && (f.deadT >> 1) & 1;
        // bridge, fins and lights
        ctx.fillStyle = white ? '#fff' : '#3050ff';
        ctx.fillRect(x0 + 40, y0 - 10, 32, 4); ctx.fillRect(x0 + 34, y0 - 6, 44, 6);
        ctx.fillStyle = white ? '#fff' : '#30d0ff'; ctx.fillRect(x0 + 50, y0 - 14, 12, 4);
        ctx.fillStyle = white ? '#fff' : '#3050ff';
        ctx.fillRect(x0 - 6, y0 + 4, 6, 10); ctx.fillRect(x0 + 112, y0 + 4, 6, 10);
        for (let i = 0; i < 8; i++) { ctx.fillStyle = ((g.t >> 3) + i) % 4 === 0 ? '#ffffff' : '#ffe040'; ctx.fillRect(x0 + 37 + i * 5, y0 - 4, 2, 2); }
        for (let r = 0; r < 14; r++) for (let c = 0; c < 56; c++) {
          const v = f.cells[r * 56 + c]; if (!v) continue;
          if (white) ctx.fillStyle = '#ffffff';
          else if (v === 2) ctx.fillStyle = ((g.t >> 2) + r + c) & 1 ? '#ffffff' : '#ff3030';
          else ctx.fillStyle = r < 2 ? '#c040ff' : (r + (c >> 3)) & 1 ? '#ff40ff' : '#a020c0';
          ctx.fillRect(x0 + c * 2, y0 + r * 2, 2, 2);
        }
      }
      function drawShield(ctx) {
        if (!g.shield) return;
        for (let row = 0; row < 3; row++) {
          ctx.fillStyle = ['#40c0ff', '#3080ff', '#2050c0'][row];
          for (let i = 0; i < 96; i++) if (g.shield[row * 96 + i]) ctx.fillRect(16 + i * 2, shieldCellY(i, row), 2, 2);
        }
      }
      function drawHUD(ctx) {
        text(ctx, 'SCORE', 6, 2, '#ff3030');
        text(ctx, String(g && mode !== 'title' && !g.demo ? g.score : 0), 6, 11, '#ffffff');
        text(ctx, 'HIGH', W - 6, 2, '#ff3030', { right: true });
        text(ctx, String(hi), W - 6, 11, '#ffffff', { right: true });
        if (g && mode !== 'title') text(ctx, RANKS[g.rank], W / 2, 2, '#30d0ff', { center: true, adv: 6 });
      }
      function drawGorfLogo(ctx, y) {
        const cols = ['#ff3030', '#ffe040', '#40ff40', '#30d0ff'];
        'GORF'.split('').forEach((ch, i) => {
          text(ctx, ch, W / 2 - 54 + i * 30 + 2, y + 2, '#202060', { scale: 4 });
          text(ctx, ch, W / 2 - 54 + i * 30, y, cols[(i + (frame >> 4)) % 4], { scale: 4 });
        });
      }
      function drawTitle(ctx) {
        drawGorfLogo(ctx, 34);
        const page = Math.floor(titleT / 360) % 2;
        if (page === 0) {
          text(ctx, 'GALACTIC ORBITING', W / 2, 76, '#ffffff', { center: true });
          text(ctx, 'ROBOT FORCE', W / 2, 88, '#ffffff', { center: true });
          text(ctx, 'MISSIONS', W / 2, 112, '#ffe040', { center: true });
          MISSIONS.forEach((m, i) => text(ctx, (i + 1) + '. ' + m, 40, 128 + i * 13, ['#ff40ff', '#ff3030', '#2a9cff', '#40ff40', '#ff8000'][i]));
          text(ctx, 'QUARK LASER: FIRE AGAIN', W / 2, 202, '#30d0ff', { center: true });
          text(ctx, 'TO CANCEL YOUR SHOT', W / 2, 214, '#30d0ff', { center: true });
        } else {
          text(ctx, 'RANKS', W / 2, 80, '#ffe040', { center: true });
          RANKS.forEach((r, i) => text(ctx, r, W / 2, 96 + i * 14, i === 0 ? '#ffffff' : '#30d0ff', { center: true }));
          text(ctx, 'DESTROY THE FLAG SHIP', W / 2, 190, '#ff40ff', { center: true });
          text(ctx, 'CORE FOR PROMOTION', W / 2, 202, '#ff40ff', { center: true });
          text(ctx, 'AND A BONUS SHIP', W / 2, 214, '#ff40ff', { center: true });
        }
        if (api.credits === 0) { if (coinFlash > 0 || ((frame >> 5) & 1)) text(ctx, 'INSERT COIN', W / 2, 238, coinFlash && ((frame >> 2) & 1) ? '#ffe040' : '#ff3030', { center: true }); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START', W / 2, 238, '#ffe040', { center: true });
        text(ctx, '\u00a9 1981 MIDWAY', W / 2, 256, '#c040ff', { center: true });
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W / 2, H - 10, '#ffffff', { center: true });
      }
      function render(ctx) {
        ctx.fillStyle = g && mode !== 'title' && g.flash > 0 && (g.flash >> 1) & 1 ? '#ffffff' : '#000';
        ctx.fillRect(0, 0, W, H);
        for (const s of stars) { ctx.fillStyle = s.c; ctx.fillRect(s.x, s.y | 0, 1, 1); }
        if (mode === 'title') { drawHUD(ctx); drawTitle(ctx); return; }
        if (g.phase === 'mission') {
          const n = g.tour * 5 + g.mission + 1;
          text(ctx, 'MISSION ' + n, W / 2, 96, '#ffe040', { center: true });
          text(ctx, MISSIONS[g.mission], W / 2, 112, '#30d0ff', { center: true, scale: 1 });
          if (g.phaseT < 150) {
            text(ctx, g.taunt, W / 2, 144, '#ff3030', { center: true });
            text(ctx, RANKS[g.rank], W / 2, 158, '#ff3030', { center: true });
          }
        }
        if (g.warp) drawWarp(ctx);
        if (g.fs) drawFlag(ctx);
        drawShield(ctx);
        if (g.phase !== 'mission') for (const e of g.en) drawEnemy(ctx, e);
        if (g.saucer) ctx.drawImage(SAUCER, Math.round(g.saucer.x - 8), g.saucer.y - 3);
        if (g.alive) ctx.drawImage(SHIP, Math.round(g.px - 4), Math.round(g.py - 4));
        if (g.shot) { ctx.fillStyle = (g.t >> 1) & 1 ? '#ffffff' : '#30d0ff'; ctx.fillRect(g.shot.x, Math.round(g.shot.y), 1, 6); }
        for (const b of g.eb) {
          if (b.kind === 2) { ctx.fillStyle = (g.t >> 2) & 1 ? '#ff8000' : '#ffe040'; ctx.fillRect(Math.round(b.x - 1), Math.round(b.y - 1), 3, 3); }
          else if (b.kind === 1) { ctx.fillStyle = '#ffffff'; const zz = (Math.floor(b.y / 3) & 1); ctx.fillRect(Math.round(b.x) - zz, Math.round(b.y), 1, 2); ctx.fillRect(Math.round(b.x) + 1 - zz, Math.round(b.y) + 2, 1, 2); }
          else { ctx.fillStyle = '#ff40ff'; ctx.fillRect(Math.round(b.x), Math.round(b.y), 1, 4); }
        }
        for (const b of g.booms) drawBoom(ctx, b);
        for (const p of g.pops) text(ctx, p.txt, p.x, p.y - 3, '#ffe040', { center: true, adv: 6 });
        // bottom: lives and mission markers
        for (let i = 0; i < Math.min(8, g.alive ? g.lives - 1 : g.lives); i++) ctx.drawImage(MINI, 4 + i * 8, H - 6);
        for (let i = 0; i < 5; i++) { ctx.fillStyle = i < g.mission ? '#40ff40' : i === g.mission ? ((frame >> 4) & 1 ? '#ffe040' : '#806000') : '#303050'; ctx.fillRect(W - 46 + i * 9, H - 6, 7, 4); }
        if (g.phase === 'clear') text(ctx, 'MISSION ACCOMPLISHED', W / 2, 140, '#40ff40', { center: true });
        if (g.phase === 'promote') {
          text(ctx, 'FLAG SHIP DESTROYED', W / 2, 120, '#ffe040', { center: true });
          text(ctx, 'YOU ARE PROMOTED TO', W / 2, 140, '#ffffff', { center: true });
          text(ctx, RANKS[g.rank], W / 2, 156, (frame >> 3) & 1 ? '#30d0ff' : '#ffffff', { center: true });
          text(ctx, 'BONUS SHIP', W / 2, 176, '#ff40ff', { center: true });
        }
        if (g.phase === 'over') text(ctx, 'GAME OVER', W / 2, 150, '#ff3030', { center: true, scale: 2 });
        if (g.demo) {
          text(ctx, 'DEMONSTRATION', W / 2, 190, '#c040ff', { center: true });
          if ((frame >> 5) & 1) text(ctx, api.credits ? 'PUSH START' : 'INSERT COIN', W / 2, 204, '#ffe040', { center: true });
        }
        drawHUD(ctx);
      }

      if (api.debugHook) api.debugHook({ g: () => g, mode: () => mode });
      return { update, render, destroy() { } };
    }
  });
})();
