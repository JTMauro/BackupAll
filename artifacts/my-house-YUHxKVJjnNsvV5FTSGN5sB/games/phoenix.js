// Phoenix (Amstar / Centuri, 1980) \u2014 procedural recreation for the MAME32 Game Room.
// Five-wave cycle: two small-bird waves, two egg-hatching Phoenix waves, then the mothership. Shield on button 2.
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
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);

  const W = 208, H = 256, PY = 236;
  // ---------- pixel art ----------
  const SHIP = spr([
    '.....W.....',
    '.....W.....',
    '....RWR....',
    '...RRWRR...',
    '.B.RWWWR.B.',
    'BBBWWWWWBBB',
    'BWWWWRWWWWB',
    'BBB.RRR.BBB'], { W: '#e8e8ff', R: '#ff3030', B: '#3050ff' });
  const MINI = spr(['..W..', '.RWR.', 'BWWWB', 'B.R.B'], { W: '#e8e8ff', R: '#ff3030', B: '#3050ff' });
  const BIRD_ART = [[
    'A........A',
    'AB......BA',
    '.AB.YY.BA.',
    '..BBYYBB..',
    '...BCCB...',
    '....BB....',
    '...B..B...'], [
    '..........',
    '....YY....',
    '..BBYYBB..',
    '.ABBCCBBA.',
    'AB..BB..BA',
    'A..B..B..A',
    '..........'], [
    '..........',
    '..........',
    'AABBYYBBAA',
    '..BBYYBB..',
    '...BCCB...',
    '....BB....',
    '...B..B...']];
  const BIRD_PAL = [
    { A: '#ff4040', B: '#ff80c0', Y: '#ffe040', C: '#ff2020' },
    { A: '#20c0ff', B: '#40ff90', Y: '#ffe040', C: '#ff2020' }
  ];
  const BIRDS = BIRD_PAL.map(p => BIRD_ART.map(a => spr(a, p)));
  const BODY = spr([
    '...YY...',
    '..YRRY..',
    '..YYYY..',
    '.OOYYOO.',
    '.OYYYYO.',
    'OOYYYYOO',
    '.OYYYYO.',
    '..OYYO..',
    '..O..O..',
    '.O....O.'], { Y: '#ffd040', R: '#ff2020', O: '#ff7010' });
  const BODY2 = spr([
    '...WW...',
    '..WRRW..',
    '..WWWW..',
    '.BBWWBB.',
    '.BWWWWB.',
    'BBWWWWBB',
    '.BWWWWB.',
    '..BWWB..',
    '..B..B..',
    '.B....B.'], { W: '#c0ffff', R: '#ff2020', B: '#2080ff' });
  const ALIEN = spr([
    '...GGGG...',
    '..GGGGGG..',
    '.GWWGGWWG.',
    '.GWRGGRWG.',
    '.GGGGGGGG.',
    '..GGPPGG..',
    '...GGGG...',
    '.PPPGGPPP.',
    'PP.PPPP.PP',
    'P..P..P..P'], { G: '#40ff40', W: '#ffffff', R: '#ff2020', P: '#c040ff' });
  // big bird wing profile per flap frame: vertical offset of each of 4 segments (inner -> outer)
  const WING_Y = [[-3, -6, -9, -12], [-1, -2, -3, -4], [1, 2, 4, 6], [2, 4, 7, 10]];
  const FLAP_SEQ = [0, 1, 2, 3, 2, 1];

  ArcadeRegistry.register({
    id: 'phoenix', title: 'Phoenix', year: 1980, maker: 'Amstar',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Space: fire \u00b7 X: shield \u00b7 Enter: start',
    marquee: { bg: '#100008', fg: '#ff7010', accent: '#ffd040' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(4000);
      let mode = 'title', titleT = 0, frame = 0, coinFlash = 0, lastCred = api.credits;
      let g = null;

      const SCOL = ['#ffffff', '#ffe040', '#40ffff', '#ff60ff', '#60ff60'];
      const stars = [];
      for (let i = 0; i < 60; i++) stars.push({ x: Math.random() * W | 0, y: Math.random() * H, c: SCOL[i % 5], ph: Math.random() * 60 | 0, sp: i % 3 === 0 ? 0.5 : 0.25 });
      function updStars() { for (const s of stars) { s.y += s.sp; if (s.y >= H) { s.y -= H; s.x = Math.random() * W | 0; } } }

      // ---------- sound ----------
      const FUR_ELISE = [[659, .14], [622, .14], [659, .14], [622, .14], [659, .14], [494, .14], [587, .14], [523, .14], [440, .3], [0, .1], [262, .14], [330, .14], [440, .14], [494, .3], [0, .1], [330, .14], [415, .14], [494, .14], [523, .4]];
      const sfx = {
        shot() { au.tone(2200, 0.1, { type: 'square', vol: 0.08, slideTo: 600 }); },
        bird() { au.noise(0.18, { vol: 0.18, freq: 3000, slideTo: 400 }); au.tone(1200, 0.1, { type: 'square', vol: 0.05, slideTo: 2400 }); },
        wing() { au.tone(900, 0.05, { type: 'square', vol: 0.06, slideTo: 300 }); },
        phoenix() { au.noise(0.5, { vol: 0.22, freq: 2500, slideTo: 150 }); au.tone(300, 0.4, { type: 'sawtooth', vol: 0.07, slideTo: 1500 }); },
        thud() { au.tone(180, 0.05, { type: 'square', vol: 0.06, slideTo: 90 }); },
        shield() { au.tone(220, 1.0, { type: 'sawtooth', vol: 0.07, slideTo: 880 }); au.tone(330, 1.0, { type: 'square', vol: 0.04, slideTo: 1320 }); },
        die() { au.noise(1.3, { vol: 0.28, freq: 1800, slideTo: 60 }); au.tone(600, 1.0, { type: 'square', vol: 0.06, slideTo: 50 }); },
        chirp() { au.tone(rnd(2000, 3000), 0.04, { type: 'square', vol: 0.025, slideTo: rnd(1000, 1500) }); },
        swoop() { au.tone(500, 0.6, { type: 'triangle', vol: 0.07, slideTo: 1600 }); },
        hatch() { au.tone(150, 0.25, { type: 'square', vol: 0.06, slideTo: 600 }); },
        mother() { au.noise(3, { vol: 0.3, freq: 1500, slideTo: 40 }); au.melody([[523, .1], [659, .1], [784, .1], [1047, .1], [784, .1], [1047, .1], [1319, .4]], { type: 'square', vol: 0.08, delay: 0.4 }); },
        coin() { au.tone(1760, 0.06, { type: 'square', vol: 0.07, slideTo: 2640 }); },
        extra() { au.melody([[1047, .08], [1319, .08], [1568, .08], [2093, .2]], { type: 'square', vol: 0.08 }); }
      };

      const WAVE_NAMES = ['WAVE 1', 'WAVE 2', 'PHOENIX', 'PHOENIX', 'MOTHERSHIP'];

      function newGame(demo) {
        g = {
          demo, score: 0, lives: 4, ext: false, cycle: 0, wave: 0, phase: 'intro', phaseT: demo ? 60 : 200, px: W / 2, alive: false, deadT: 0,
          shot: null, ebul: [], birds: [], big: [], ms: null, booms: [], pops: [], shieldT: 0, shieldCool: 0, t: 0, diveT: 120, demoT: 0, overPending: false
        };
        setupWave();
        if (!demo) au.melody(FUR_ELISE, { type: 'square', vol: 0.07 });
      }
      const level = () => g.cycle * 5 + g.wave;
      function setupWave() {
        g.birds = []; g.big = []; g.ms = null; g.ebul = []; g.shot = null; g.t = 0;
        g.diveT = 120;
        if (g.wave <= 1) {
          // 16 small birds in a staggered formation, flying in from above
          const kind = g.wave;
          for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
            const sx = 40 + c * 40 + (r & 1 ? 20 : 0) - 10, sy = 46 + r * 20;
            g.birds.push({ kind, sx, sy, x: sx + (c < 2 ? -120 : 120), y: -20 - r * 20, state: 'enter', vx: 0, vy: 0, wp: [], ph: Math.random() * TAU, delay: (r * 4 + c) * 6 });
          }
        } else if (g.wave <= 3) {
          const n = 8;
          for (let i = 0; i < n; i++) {
            const sx = 30 + (i % 4) * 50 + (i >= 4 ? 25 : 0), sy = 60 + (i >= 4 ? 40 : 0);
            g.big.push({ sx, sy, x: sx, y: sy, state: 'egg', t: 0, hatch: 60 + i * 25 + (Math.random() * 30 | 0), wl: [1, 1, 1, 1], wr: [1, 1, 1, 1], regrow: 0, ph: Math.random() * TAU, flap: 0, vx: 0, vy: 0 });
          }
        } else {
          const under = new Uint8Array(64 * 9);
          for (let r = 0; r < 9; r++) { const half = 32 - r * 2 - 2; for (let c = 0; c < 64; c++) under[r * 64 + c] = Math.abs(c - 31.5) < half ? 1 : 0; }
          const belt = new Uint8Array(64 * 3).fill(1);
          g.ms = { y: 26, under, belt, off: 0, t: 0, alive: true, deadT: 0, fireT: 90 };
          for (let i = 0; i < 4; i++) spawnEscort(i * 40);
        }
      }
      function spawnEscort(delay) {
        const sx = rnd(30, W - 30);
        g.birds.push({ kind: 1, esc: true, sx, sy: 150, x: Math.random() < 0.5 ? -10 : W + 10, y: rnd(110, 170), state: 'fly', vx: 0, vy: 0, wp: escortPath(), ph: Math.random() * TAU, delay: delay || 0 });
      }
      function escortPath() {
        const p = [];
        for (let i = 0; i < 5; i++) p.push([rnd(16, W - 16), rnd(g.ms ? g.ms.y + 60 : 120, PY - 16)]);
        return p;
      }

      function addScore(n) {
        if (g.demo) return;
        g.score += n;
        if (!g.ext && g.score >= 10000) { g.ext = true; g.lives++; sfx.extra(); }
        if (g.score > hi) hi = g.score;
      }
      function boom(x, y, big, col) { g.booms.push({ x, y, t: 0, big: !!big, col: col || 0 }); }

      // ---------- small birds ----------
      function birdDive(b) {
        b.state = 'fly'; b.wp = [];
        const fierce = b.kind === 1 || g.cycle > 0;
        let y = b.y;
        const n = fierce ? 4 : 3;
        for (let i = 0; i < n; i++) { y = Math.min(PY - 8, y + rnd(30, 60)); b.wp.push([i === n - 1 && g.alive ? g.px + rnd(-20, 20) : rnd(14, W - 14), y]); }
        b.wp.push([rnd(14, W - 14), rnd(PY - 60, PY - 10)]);
        b.wp.push([rnd(14, W - 14), rnd(80, 140)]);
        b.shots = 1 + (fierce ? 2 : 1);
      }
      function updBird(b) {
        if (b.delay > 0) { b.delay--; return; }
        b.ph += 0.15;
        const spd = (b.kind === 1 ? 1.9 : 1.5) + Math.min(1.2, g.cycle * 0.3) + (b.esc ? 0.3 : 0);
        if (b.state === 'form') {
          const fx = Math.sin(g.t * 0.02) * 14;
          b.x = b.sx + fx + Math.sin(b.ph * 0.5) * 2; b.y = b.sy + Math.cos(b.ph * 0.4) * 2;
          if (g.alive && Math.random() < 0.0015 + g.cycle * 0.0007 && b.y < PY - 80) birdShoot(b);
          return;
        }
        let tx, ty;
        if (b.state === 'enter' || b.state === 'return') { tx = b.sx + Math.sin(g.t * 0.02) * 14; ty = b.sy; }
        else if (b.wp.length) { tx = b.wp[0][0]; ty = b.wp[0][1]; }
        else { if (b.esc) { b.wp = escortPath(); return; } b.state = 'return'; return; }
        const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy);
        // steer with inertia (wobbly bird flight)
        const ax = dx / (d || 1) * 0.25, ay = dy / (d || 1) * 0.25;
        b.vx = (b.vx + ax) * 0.93; b.vy = (b.vy + ay) * 0.93;
        const v = Math.hypot(b.vx, b.vy); if (v > spd) { b.vx *= spd / v; b.vy *= spd / v; }
        b.x += b.vx + Math.sin(b.ph) * 0.6; b.y += b.vy;
        if (d < 8) {
          if (b.state === 'enter' || b.state === 'return') { b.state = 'form'; b.vx = b.vy = 0; }
          else b.wp.shift();
        }
        if (b.state === 'fly' && b.shots > 0 && b.y < PY - 50 && g.alive && Math.random() < 0.02 + g.cycle * 0.005) { b.shots--; birdShoot(b); }
      }
      function birdShoot(b) {
        if (g.ebul.length >= 5 + g.cycle * 2) return;
        g.ebul.push({ x: b.x, y: b.y + 4, vx: 0, vy: 2.2 + g.cycle * 0.25 });
      }
      function killBird(b) {
        const i = g.birds.indexOf(b); if (i < 0) return;
        g.birds.splice(i, 1);
        let pts = 20;
        if (b.state !== 'form') pts = b.y > 160 ? 80 : 50;
        if (b.esc) pts = 100;
        addScore(pts); sfx.bird(); boom(b.x, b.y, false, b.kind ? 1 : 0);
        if (pts > 20) g.pops.push({ x: b.x, y: b.y, txt: String(pts), t: 50 });
        if (b.esc && g.ms && g.ms.alive) g.escRespawn = 240;
      }

      // ---------- Phoenix (big birds) ----------
      function bigBody(p) { return p.state === 'hatch' ? Math.min(1, p.t / 30) : 1; }
      function updBig(p) {
        p.t++;
        if (p.state === 'egg') { p.x = p.sx + Math.sin(g.t * 0.02 + p.ph) * 4; p.y = p.sy; if (p.t >= p.hatch) { p.state = 'hatch'; p.t = 0; sfx.hatch(); } return; }
        if (p.state === 'hatch') { if (p.t >= 30) { p.state = 'hover'; p.t = 0; } return; }
        p.flap = FLAP_SEQ[(Math.floor(g.t / (p.state === 'swoop' ? 4 : 6)) + (p.sx | 0)) % FLAP_SEQ.length];
        // regrow wings
        if (++p.regrow > 160) {
          p.regrow = 0;
          for (const w of [p.wl, p.wr]) { const i = w.indexOf(0); if (i >= 0) { w[i] = 1; break; } }
        }
        if (p.state === 'hover') {
          const tx = p.sx + Math.sin(g.t * 0.013 + p.ph) * 36, ty = p.sy + Math.sin(g.t * 0.031 + p.ph) * 12;
          p.x += (tx - p.x) * 0.05; p.y += (ty - p.y) * 0.05;
          if (g.alive && Math.random() < 0.004 + g.cycle * 0.0015) bigShoot(p);
          return;
        }
        if (p.state === 'swoop' || p.state === 'rise') {
          const tx = p.state === 'swoop' ? p.tx : p.sx, ty = p.state === 'swoop' ? PY - 26 : p.sy;
          const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
          const sp = p.state === 'swoop' ? 1.8 + g.cycle * 0.3 : 1.2;
          p.vx = (p.vx + dx / (d || 1) * 0.12) * 0.97; p.vy = (p.vy + dy / (d || 1) * 0.12) * 0.97;
          const v = Math.hypot(p.vx, p.vy); if (v > sp) { p.vx *= sp / v; p.vy *= sp / v; }
          p.x += p.vx; p.y += p.vy;
          p.x = Math.max(20, Math.min(W - 20, p.x));
          if (p.state === 'swoop' && (d < 10 || p.y > PY - 30)) { p.state = 'rise'; }
          else if (p.state === 'rise' && d < 6) { p.state = 'hover'; p.vx = p.vy = 0; }
          if (p.state === 'swoop' && g.alive && Math.random() < 0.02) bigShoot(p);
        }
      }
      function bigShoot(p) {
        if (g.ebul.length >= 5 + g.cycle * 2) return;
        g.ebul.push({ x: p.x, y: p.y + 6, vx: 0, vy: 2.4 + g.cycle * 0.25 });
      }
      function wingSegY(p, i) { return p.y + WING_Y[p.flap][i]; }
      // returns true if the shot was stopped
      function shotVsBig(p, sx, sy) {
        if (p.state === 'egg' || p.state === 'hatch') {
          if (Math.abs(sx - p.x) < 4 && Math.abs(sy - p.y) < 5) { sfx.thud(); return true; }
          return false;
        }
        if (Math.abs(sx - p.x) < 4 && sy > p.y - 5 && sy < p.y + 6) { killBig(p); return true; }
        const dx = Math.abs(sx - p.x); if (dx < 4 || dx >= 20) return false;
        const i = Math.floor((dx - 4) / 4), w = sx < p.x ? p.wl : p.wr;
        // an outer segment is only attached if the inner ones are
        let attached = true; for (let k = 0; k <= i; k++) if (!w[k]) attached = false;
        if (!attached) return false;
        const wy = wingSegY(p, i);
        if (sy > wy - 2 && sy < wy + 3) { w[i] = 0; sfx.wing(); boom(sx, wy, false, 2); return true; }
        return false;
      }
      function killBig(p) {
        const i = g.big.indexOf(p); if (i < 0) return;
        g.big.splice(i, 1);
        let pts = 50 + (g.wave === 3 ? 50 : 0);
        if (p.state === 'swoop' || p.state === 'rise') pts = [100, 200, 500, 500, 800][Math.random() * (p.y > 160 ? 5 : 3) | 0];
        addScore(pts); sfx.phoenix(); boom(p.x, p.y, true, 3);
        g.pops.push({ x: p.x, y: p.y, txt: String(pts), t: 70 });
      }

      // ---------- mothership ----------
      const MS_HALF = 64;
      function msShot(sx, sy) { // returns true if the shot is stopped
        const m = g.ms; if (!m || !m.alive) return false;
        const lx = sx - W / 2, ly = sy - m.y;
        if (ly < 0 || ly >= 48 || Math.abs(lx) >= MS_HALF) return false;
        const col = Math.floor((lx + MS_HALF) / 2);
        if (ly >= 30) {
          const r = Math.floor((ly - 30) / 2), idx = r * 64 + col;
          if (m.under[idx]) { chip(m.under, r, col, 9); return true; }
          return false;
        }
        if (ly >= 24) {
          const r = Math.floor((ly - 24) / 2), bc = (col + m.off) % 64;
          if (m.belt[r * 64 + bc]) { chipBelt(m, r, bc); return true; }
          return false;
        }
        if (Math.abs(lx) < 6 && ly >= 10) { killMother(); return true; }
        if (Math.abs(lx) < 40 && ly >= 6) { sfx.thud(); return true; }
        if (Math.abs(lx) < 10) { sfx.thud(); return true; }
        return false;
      }
      function chip(arr, r, col) {
        arr[r * 64 + col] = 0;
        if (col > 0 && Math.random() < 0.6) arr[r * 64 + col - 1] = 0;
        if (col < 63 && Math.random() < 0.6) arr[r * 64 + col + 1] = 0;
        sfx.thud(); boom(W / 2 - MS_HALF + col * 2 + 1, g.ms.y + 30 + r * 2, false, 4);
      }
      function chipBelt(m, r, bc) {
        m.belt[r * 64 + bc] = 0;
        if (Math.random() < 0.5) m.belt[r * 64 + (bc + 1) % 64] = 0;
        sfx.thud();
        // the conveyor slowly repairs itself
        m.repair = 0;
      }
      function killMother() {
        const m = g.ms; m.alive = false; m.deadT = 0;
        const secs = m.t / 60;
        const pts = Math.max(1, Math.min(9, 9 - Math.floor(secs / 15) + (Math.random() * 2 | 0))) * 1000;
        addScore(pts); sfx.mother();
        g.pops.push({ x: W / 2, y: m.y + 16, txt: String(pts), t: 200 });
        g.birds = []; g.ebul = [];
      }
      function updMother() {
        const m = g.ms; m.t++;
        if (!m.alive) {
          m.deadT++;
          if (m.deadT % 6 === 0 && m.deadT < 150) boom(W / 2 + rnd(-60, 60), m.y + rnd(0, 48), Math.random() < 0.3, Math.random() * 5 | 0);
          if (m.deadT === 200) { g.phase = 'clear'; g.phaseT = 60; }
          return;
        }
        if (m.t % 4 === 0) m.off = (m.off + 1) % 64;
        if (m.t % 70 === 0 && m.y < PY - 100) m.y++;
        // belt self-repair
        if (m.t % 200 === 0) { const i = m.belt.indexOf(0); if (i >= 0) m.belt[i] = 1; }
        if (--m.fireT <= 0 && g.alive) {
          m.fireT = Math.max(25, 80 - g.cycle * 10) + (Math.random() * 40 | 0);
          // fire from the lowest remaining hull cell near the player
          const lx = Math.max(-40, Math.min(40, g.px - W / 2 + rnd(-30, 30)));
          const col = Math.max(0, Math.min(63, Math.floor((lx + MS_HALF) / 2)));
          let r = 8; while (r >= 0 && !m.under[r * 64 + col]) r--;
          const y = r >= 0 ? m.y + 30 + r * 2 + 2 : m.y + 30;
          g.ebul.push({ x: W / 2 - MS_HALF + col * 2 + 1, y, vx: 0, vy: 2.2 + g.cycle * 0.3, big: true });
        }
        if (g.escRespawn > 0 && --g.escRespawn === 0) spawnEscort(0);
        if (g.birds.length < 3 && m.t % 300 === 0) spawnEscort(0);
      }

      // ---------- player ----------
      function killPlayer() {
        if (!g.alive || g.shieldT > 0) return;
        g.alive = false; g.deadT = 0; g.shot = null;
        boom(g.px, PY, true, 5); sfx.die();
      }
      function gameOver() {
        if (!g.demo) api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 240;
      }
      function lastLife() {
        if (g.demo) { g.phase = 'over'; g.phaseT = 60; return; }
        if (!api.offerContinue) { gameOver(); return; }
        const cg = g;
        api.offerContinue(() => { if (g === cg) { g.lives = 4; respawn(); } }, () => { if (g === cg) gameOver(); });
      }
      function respawn() { g.alive = true; g.px = W / 2; g.deadT = 0; g.overPending = false; g.shieldCool = 0; }

      function readCtl() {
        if (!g.demo) return { l: api.key('ArrowLeft'), r: api.key('ArrowRight'), fire: api.key('Space') || api.key('KeyZ'), shield: api.pressed('KeyX') || api.pressed('ArrowDown') };
        let threat = false;
        for (const b of g.ebul) if (b.y > PY - 30 && b.y < PY && Math.abs(b.x - g.px) < 8) threat = true;
        let tgt = null;
        for (const b of g.birds) if (b.delay <= 0 && (!tgt || b.y > tgt.y)) tgt = b;
        for (const p of g.big) if (p.state !== 'egg' && (!tgt || p.y > tgt.y)) tgt = p;
        const tx = tgt ? tgt.x : W / 2 + Math.sin(frame * 0.01) * 30;
        const dx = tx - g.px;
        return { l: dx < -3, r: dx > 3, fire: Math.abs(dx) < 10, shield: threat && g.shieldCool === 0 };
      }

      function updGame() {
        g.t++;
        for (const b of g.booms) b.t++;
        g.booms = g.booms.filter(b => b.t < (b.big ? 50 : 20));
        for (const p of g.pops) p.t--;
        g.pops = g.pops.filter(p => p.t > 0);
        if (g.phase === 'over') { if (--g.phaseT <= 0) { mode = 'title'; titleT = 0; } return; }
        if (g.phase === 'intro') {
          if (--g.phaseT <= 0) { g.phase = 'play'; respawn(); }
          return;
        }
        if (g.phase === 'clear') {
          if (--g.phaseT <= 0) {
            g.wave++; if (g.wave > 4) { g.wave = 0; g.cycle++; }
            setupWave(); g.phase = 'wave'; g.phaseT = 90;
          }
          return;
        }
        if (g.phase === 'wave') { if (--g.phaseT <= 0) g.phase = 'play'; }
        if (g.demo && ++g.demoT > 2400) { mode = 'title'; titleT = 0; return; }

        const c = readCtl();
        if (g.shieldCool > 0) g.shieldCool--;
        if (g.alive) {
          if (g.shieldT > 0) g.shieldT--;
          else {
            if (c.l) g.px -= 1.6; if (c.r) g.px += 1.6;
            g.px = Math.max(8, Math.min(W - 8, g.px));
            if (c.shield && g.shieldCool === 0) { g.shieldT = 75; g.shieldCool = 75 + 300; sfx.shield(); }
          }
          if (c.fire && !g.shot) { g.shot = { x: Math.round(g.px), y: PY - 8 }; sfx.shot(); }
        } else {
          g.deadT++;
          if (g.deadT === 140) {
            if (g.lives > 1) { g.lives--; respawn(); g.ebul = []; }
            else if (!g.overPending) { g.overPending = true; lastLife(); }
          }
        }

        // player shot (stepped so it cannot tunnel through 2px cells)
        if (g.shot) {
          for (let s = 0; s < 3 && g.shot; s++) {
            g.shot.y -= 2;
            const sx = g.shot.x, sy = g.shot.y;
            if (sy < 16) { g.shot = null; break; }
            let hit = false;
            for (const b of g.birds) if (b.delay <= 0 && Math.abs(b.x - sx) < 5 && Math.abs(b.y - sy) < 4) { killBird(b); hit = true; break; }
            if (!hit) for (const p of g.big) if (shotVsBig(p, sx, sy)) { hit = true; break; }
            if (!hit && msShot(sx, sy)) hit = true;
            if (hit) g.shot = null;
          }
        }

        // enemies
        if (g.wave <= 1 || g.ms) {
          const formers = g.birds.filter(b => b.state === 'form');
          if (--g.diveT <= 0) {
            g.diveT = Math.max(25, (g.wave === 1 ? 60 : 90) - g.cycle * 12) + (Math.random() * 40 | 0);
            if (formers.length && g.alive) {
              const fliers = g.birds.length - formers.length, maxF = 3 + g.wave + g.cycle * 2;
              if (fliers < maxF || formers.length === g.birds.length) birdDive(formers[Math.random() * formers.length | 0]);
            }
          }
        }
        for (const b of g.birds) updBird(b);
        if (g.big.length) {
          if (--g.diveT <= 0) {
            g.diveT = Math.max(40, 140 - g.cycle * 20) + (Math.random() * 60 | 0);
            const hov = g.big.filter(p => p.state === 'hover');
            const sw = g.big.filter(p => p.state === 'swoop' || p.state === 'rise').length;
            if (hov.length && g.alive && sw < 2 + g.cycle) { const p = hov[Math.random() * hov.length | 0]; p.state = 'swoop'; p.tx = g.px + rnd(-30, 30); sfx.swoop(); }
          }
          for (const p of g.big) updBig(p);
          if (g.t % 18 === 0 && !g.demo) au.tone(140 + (g.t % 36 ? 0 : 40), 0.08, { type: 'triangle', vol: 0.04 });
        }
        if (g.ms) updMother();
        if (g.birds.length && g.t % 9 === 0 && !g.demo && Math.random() < 0.5) sfx.chirp();

        // enemy bullets
        for (const b of g.ebul) { b.x += b.vx; b.y += b.vy; }
        g.ebul = g.ebul.filter(b => b.y < H);
        if (g.alive) {
          if (g.shieldT > 0) {
            g.ebul = g.ebul.filter(b => !(Math.abs(b.x - g.px) < 12 && b.y > PY - 14 && b.y < PY + 6));
            for (const b of g.birds.slice()) if (Math.abs(b.x - g.px) < 13 && Math.abs(b.y - PY) < 13) killBird(b);
            for (const p of g.big.slice()) if (p.state !== 'egg' && Math.abs(p.x - g.px) < 14 && Math.abs(p.y - PY) < 14) killBig(p);
          } else {
            for (const b of g.ebul) if (Math.abs(b.x - g.px) < 5 && b.y > PY - 6 && b.y < PY + 5) { killPlayer(); b.y = H + 10; break; }
            for (const b of g.birds) if (b.delay <= 0 && Math.abs(b.x - g.px) < 8 && Math.abs(b.y - PY) < 7) { killBird(b); killPlayer(); break; }
            for (const p of g.big) if (p.state !== 'egg' && Math.abs(p.x - g.px) < 10 && Math.abs(p.y - PY) < 8) { killPlayer(); break; }
          }
        }

        // wave clear
        if (g.phase === 'play' || g.phase === 'wave') {
          if (g.wave <= 1 && g.birds.length === 0) { g.phase = 'clear'; g.phaseT = 120; }
          else if (g.wave >= 2 && g.wave <= 3 && g.big.length === 0) { g.phase = 'clear'; g.phaseT = 120; }
          if (g.phase === 'clear') { g.ebul = []; g.shot = null; if (!g.demo) au.melody([[784, .1], [988, .1], [1175, .1], [1568, .25]], { type: 'square', vol: 0.07 }); }
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
        if (mode === 'title') { titleT++; if (titleT > 700) { mode = 'demo'; newGame(true); } return; }
        updGame();
      }

      // ---------- drawing ----------
      const BOOMCOLS = [['#ffffff', '#ff80c0', '#ff4040'], ['#ffffff', '#40ff90', '#20c0ff'], ['#ffd040', '#ff7010'], ['#ffffff', '#ffd040', '#ff7010', '#ff2020'], ['#ff9030', '#c04000'], ['#ffffff', '#ffe040', '#3050ff', '#ff3030']];
      function drawBoom(ctx, b) {
        const cols = BOOMCOLS[b.col] || BOOMCOLS[0];
        const n = b.big ? 14 : 8, r = (b.big ? 1.5 : 1) + b.t * (b.big ? 0.5 : 0.4);
        for (let k = 0; k < n; k++) {
          const a = k * TAU / n + b.t * 0.05;
          for (let j = 0; j < 2; j++) {
            ctx.fillStyle = cols[(k + j + (b.t >> 2)) % cols.length];
            ctx.fillRect(Math.round(b.x + Math.cos(a) * r * (1 - j * 0.4)), Math.round(b.y + Math.sin(a) * r * (1 - j * 0.4)), b.big ? 2 : 1, b.big ? 2 : 1);
          }
        }
      }
      function drawBird(ctx, b) {
        const f = b.state === 'form' ? (Math.floor(g.t / 10 + b.sx) % 3) : (Math.floor(g.t / 5 + b.sx) % 3);
        ctx.drawImage(BIRDS[b.kind][f], Math.round(b.x - 5), Math.round(b.y - 3));
      }
      const WCOL = ['#ff7010', '#ff4020', '#ff2060', '#ff40c0'];
      const WCOL2 = ['#2080ff', '#20c0ff', '#40ffe0', '#c0ffff'];
      function drawBig(ctx, p, blue) {
        const x = Math.round(p.x), y = Math.round(p.y);
        if (p.state === 'egg' || (p.state === 'hatch' && p.t < 15)) {
          const pulse = ((frame + p.hatch) >> 3) & 1;
          ctx.fillStyle = pulse ? '#c060ff' : '#8040c0';
          ctx.fillRect(x - 2, y - 4, 4, 1); ctx.fillRect(x - 3, y - 3, 6, 6); ctx.fillRect(x - 2, y + 3, 4, 1);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 2, 1, 2);
          if (p.state === 'hatch') { ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 3, y - 1, 6, 1); }
          return;
        }
        const cols = blue ? WCOL2 : WCOL;
        const grow = bigBody(p);
        for (const [w, s] of [[p.wl, -1], [p.wr, 1]]) {
          for (let i = 0; i < 4; i++) {
            let ok = true; for (let k = 0; k <= i; k++) if (!w[k]) ok = false;
            if (!ok) break;
            if (p.state === 'hatch' && i > grow * 4) break;
            const wy = Math.round(wingSegY(p, i));
            const x0 = s < 0 ? x - 8 - i * 4 : x + 4 + i * 4;
            ctx.fillStyle = cols[i]; ctx.fillRect(x0, wy - 1, 4, 3);
            ctx.fillStyle = cols[Math.min(3, i + 1)]; ctx.fillRect(x0 + (s < 0 ? 0 : 3), wy + 2, 1, 1 + (i >> 1));
          }
        }
        ctx.drawImage(blue ? BODY2 : BODY, x - 4, y - 5);
      }
      function drawMother(ctx) {
        const m = g.ms; if (!m) return;
        if (!m.alive && m.deadT > 150) return;
        const cx = W / 2, y = Math.round(m.y), flick = !m.alive && (m.deadT >> 2) & 1;
        // antenna and roof
        ctx.fillStyle = flick ? '#ffffff' : '#ffd040'; ctx.fillRect(cx - 1, y - 6, 2, 6);
        ctx.fillStyle = flick ? '#ffffff' : '#8040ff';
        ctx.fillRect(cx - 10, y, 20, 3); ctx.fillRect(cx - 20, y + 3, 40, 3);
        // cabin
        ctx.fillStyle = flick ? '#ffffff' : '#3050ff';
        ctx.fillRect(cx - 40, y + 6, 32, 18); ctx.fillRect(cx + 8, y + 6, 32, 18);
        ctx.fillRect(cx - 8, y + 6, 16, 4);
        ctx.fillStyle = '#10204a'; ctx.fillRect(cx - 8, y + 10, 16, 14);
        // windows / lights
        for (let i = 0; i < 6; i++) { ctx.fillStyle = ((g.t >> 3) + i) % 3 === 0 ? '#ffff60' : '#2030a0'; ctx.fillRect(cx - 36 + i * 5, y + 12, 3, 3); ctx.fillRect(cx + 10 + i * 5, y + 12, 3, 3); }
        if (m.alive) ctx.drawImage(ALIEN, cx - 5, y + 12);
        // conveyor belt
        for (let r = 0; r < 3; r++) for (let c = 0; c < 64; c++) {
          const bc = (c + m.off) % 64;
          if (!m.belt[r * 64 + bc]) continue;
          ctx.fillStyle = flick ? '#ffffff' : ((bc >> 1) + r) & 1 ? '#c040ff' : '#7020c0';
          ctx.fillRect(cx - MS_HALF + c * 2, y + 24 + r * 2, 2, 2);
        }
        // underbelly
        for (let r = 0; r < 9; r++) for (let c = 0; c < 64; c++) {
          if (!m.under[r * 64 + c]) continue;
          ctx.fillStyle = flick ? '#ffffff' : (r < 2 ? '#ffb040' : r < 6 ? '#ff7010' : '#d04000');
          ctx.fillRect(cx - MS_HALF + c * 2, y + 30 + r * 2, 2, 2);
        }
      }
      function drawHUD(ctx) {
        text(ctx, 'SCORE1', 8, 2, '#ff4040');
        text(ctx, 'HI-SCORE', W - 8, 2, '#ff4040', { right: true });
        text(ctx, String(g && mode !== 'title' && !g.demo ? g.score : 0).padStart(5, '0'), 8, 11, '#ffffff');
        text(ctx, String(hi).padStart(5, '0'), W - 8, 11, '#ffffff', { right: true });
      }
      function drawTitle(ctx) {
        const page = Math.floor(titleT / 350) % 2;
        // logo
        text(ctx, 'PHOENIX', W / 2 + 2, 34, '#601000', { center: true, scale: 3 });
        text(ctx, 'PHOENIX', W / 2, 32, (frame >> 3) & 1 ? '#ff7010' : '#ffd040', { center: true, scale: 3 });
        if (page === 0) {
          // flapping phoenix as the emblem
          const fake = { x: W / 2, y: 80, flap: FLAP_SEQ[(frame >> 3) % 6], wl: [1, 1, 1, 1], wr: [1, 1, 1, 1], state: 'hover', t: 99 };
          drawBig(ctx, fake, false);
          text(ctx, 'SCORE TABLE', W / 2, 106, '#40ffff', { center: true });
          ctx.drawImage(BIRDS[0][(frame >> 3) % 3], 30, 122); text(ctx, '20 50 80 PTS', 120, 122, '#ffffff', { center: true });
          const fake2 = { x: 35, y: 148, flap: FLAP_SEQ[(frame >> 3) % 6], wl: [1, 1, 1, 1], wr: [1, 1, 1, 1], state: 'hover', t: 99 };
          drawBig(ctx, fake2, true);
          text(ctx, '50 TO 800 PTS', 124, 146, '#ffffff', { center: true });
          ctx.drawImage(ALIEN, 30, 166); text(ctx, '1000-9000 PTS', 124, 168, '#ffffff', { center: true });
        } else {
          text(ctx, 'HIT THE PHOENIX', W / 2, 80, '#ffd040', { center: true });
          text(ctx, 'IN THE BODY', W / 2, 92, '#ffd040', { center: true });
          text(ctx, 'BLAST THROUGH THE HULL', W / 2, 116, '#ff7010', { center: true });
          text(ctx, 'AND THE CONVEYOR BELT', W / 2, 128, '#c040ff', { center: true });
          text(ctx, 'TO HIT THE ALIEN', W / 2, 140, '#40ff40', { center: true });
          text(ctx, 'X: FORCE FIELD', W / 2, 164, '#40ffff', { center: true });
        }
        if (api.credits === 0) { if (coinFlash > 0 || ((frame >> 5) & 1)) text(ctx, 'INSERT COIN', W / 2, 196, coinFlash && ((frame >> 2) & 1) ? '#ffe040' : '#ff4040', { center: true }); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START', W / 2, 196, '#ffe040', { center: true });
        text(ctx, '\u00a9 1980 AMSTAR', W / 2, 216, '#c040ff', { center: true });
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W / 2, H - 10, '#ffffff', { center: true });
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        for (const s of stars) if ((frame + s.ph) % 60 < 42) { ctx.fillStyle = s.c; ctx.fillRect(s.x, s.y | 0, 1, 1); }
        if (mode === 'title') { drawHUD(ctx); drawTitle(ctx); return; }
        drawMother(ctx);
        for (const p of g.big) drawBig(ctx, p, g.wave === 3);
        for (const b of g.birds) if (b.delay <= 0) drawBird(ctx, b);
        if (g.alive) {
          ctx.drawImage(SHIP, Math.round(g.px - 5), PY - 4);
          if (g.shieldT > 0) {
            const col = (g.t >> 1) & 1 ? '#ffe040' : '#40ffff';
            ctx.fillStyle = col;
            for (let a = 0; a < 32; a++) { const an = Math.PI + a * Math.PI / 31; ctx.fillRect(Math.round(g.px + Math.cos(an) * 12), Math.round(PY + 2 + Math.sin(an) * 12), 1, 1); }
            ctx.fillRect(Math.round(g.px - 12), PY + 2, 25, 1);
          }
        }
        if (g.shot) { ctx.fillStyle = '#ffffff'; ctx.fillRect(g.shot.x, Math.round(g.shot.y), 1, 5); }
        for (const b of g.ebul) {
          ctx.fillStyle = b.big ? '#ff9030' : '#ff60ff'; ctx.fillRect(Math.round(b.x) - (b.big ? 1 : 0), Math.round(b.y), b.big ? 2 : 1, 4);
        }
        for (const b of g.booms) drawBoom(ctx, b);
        for (const p of g.pops) text(ctx, p.txt, p.x, p.y - 3, '#ffe040', { center: true, adv: 6 });
        // bottom bar: lives and wave
        ctx.fillStyle = '#3050ff'; ctx.fillRect(0, H - 10, W, 1);
        for (let i = 0; i < Math.min(6, g.lives - 1); i++) ctx.drawImage(MINI, 4 + i * 8, H - 7);
        if (g.shieldCool === 0 && g.alive) text(ctx, 'F', 60, H - 8, '#40ffff');
        text(ctx, 'R' + (g.cycle + 1) + '-' + (g.wave + 1), W - 4, H - 8, '#ffe040', { right: true });

        if (g.phase === 'intro' && !g.demo) { text(ctx, 'PLAYER 1', W / 2, 140, '#ff4040', { center: true }); text(ctx, 'READY', W / 2, 156, '#40ffff', { center: true }); }
        if (g.phase === 'wave' || (g.phase === 'intro' && g.demo)) text(ctx, WAVE_NAMES[g.wave], W / 2, 150, '#ffe040', { center: true });
        if (g.phase === 'over') text(ctx, 'GAME OVER', W / 2, 150, '#ff4040', { center: true });
        if (g.demo) {
          text(ctx, 'DEMONSTRATION', W / 2, 170, '#c040ff', { center: true });
          if ((frame >> 5) & 1) text(ctx, api.credits ? 'PUSH START' : 'INSERT COIN', W / 2, 184, '#ffe040', { center: true });
        }
        drawHUD(ctx);
      }

      if (api.debugHook) api.debugHook({ g: () => g, mode: () => mode });
      return { update, render, destroy() { } };
    }
  });
})();
