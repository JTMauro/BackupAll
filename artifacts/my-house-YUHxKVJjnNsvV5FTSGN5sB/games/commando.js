// Commando (Capcom, 1985) \u2014 built-in recreation for the MAME32 Game Room.
// Super Joe fights his way up a vertically scrolling battlefield: rifle fires the way he runs, grenades are thrown
// forward, rescue POWs, and survive the soldier rush at each fortress gate.
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
    '=': '00001F001F0000', '+': '0004041F040400', 'x': '00110A040A1100'
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
  function mkRng(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }

  const THEMES = [
    { name: 'JUNGLE', base: '#4c7a2c', dark: '#3a6420', lite: '#6a9a3c', rock: '#7a6a58' },
    { name: 'DESERT', base: '#c8a868', dark: '#a88848', lite: '#e0c888', rock: '#8a7050' },
    { name: 'HILLS', base: '#8a7a52', dark: '#6e5e3e', lite: '#a8986a', rock: '#5a5048' },
    { name: 'SWAMP', base: '#3e6a3a', dark: '#2c5028', lite: '#5a8a4a', rock: '#68685a' }
  ];

  ArcadeRegistry.register({
    id: 'commando', title: 'Commando', year: 1985, maker: 'Capcom',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: run (rifle fires the way you run) \u00b7 Space: fire \u00b7 X: grenade \u00b7 Enter: start',
    marquee: { bg: '#2a3a10', fg: '#ffd000', accent: '#ff3020' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(50000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0;
      let g = null;
      let demoScroll = 0;

      // ================= Sound =================
      const sfx = {
        shot() { au.noise(0.04, { vol: 0.12, freq: 3500, type: 'highpass' }); au.tone(900, 0.03, { type: 'square', vol: 0.05, slideTo: 500 }); },
        eshot() { au.tone(600, 0.04, { type: 'square', vol: 0.05, slideTo: 300 }); },
        throw() { au.tone(300, 0.25, { type: 'triangle', vol: 0.1, slideTo: 700 }); },
        boom() { au.noise(0.45, { vol: 0.25, freq: 900, slideTo: 80 }); },
        kill() { au.tone(220, 0.08, { type: 'square', vol: 0.1, slideTo: 90 }); },
        pick() { au.melody([[784, .05], [1047, .05], [1319, .08]], { type: 'square', vol: 0.1 }); },
        pow() { au.melody([[523, .06], [659, .06], [784, .06], [1047, .06], [1319, .12]], { type: 'square', vol: 0.1 }); },
        die() { au.melody([[392, .12], [330, .12], [262, .12], [196, .3]], { type: 'square', vol: 0.12 }); },
        start() { au.melody([[392, .1], [392, .1], [523, .2], [392, .1], [523, .1], [659, .3], [523, .1], [659, .1], [784, .45]], { type: 'square', vol: 0.11 }); },
        clear() { au.melody([[523, .1], [659, .1], [784, .1], [1047, .2], [784, .1], [1047, .4]], { type: 'square', vol: 0.12 }); },
        oneup() { au.melody([[1047, .06], [1319, .06], [1568, .06], [2093, .12]], { type: 'square', vol: 0.1 }); }
      };

      // ================= Pixel man =================
      // pal: helmet, skin, shirt, pants, gun
      const PJOE = { h: '#3a2a1a', s: '#f0b080', c: '#4a8a3a', p: '#5a5a3a', g: '#202020', band: '#e02020' };
      const PSOL = { h: '#7a8090', s: '#e0a070', c: '#8a8e9a', p: '#5a5e6a', g: '#202020' };
      const PSOL2 = { h: '#a07030', s: '#e0a070', c: '#c09040', p: '#705020', g: '#202020' };
      const POFF = { h: '#c02020', s: '#e0a070', c: '#d8d8d8', p: '#404048', g: '#202020' };
      const PPOW = { h: '#e0a070', s: '#e0a070', c: '#e8e0c0', p: '#c8b890', g: null };
      function drawMan(ctx, x, y, dx, dy, step, pal, dying) {
        x = Math.round(x); y = Math.round(y);
        if (dying) {
          ctx.fillStyle = pal.c; ctx.fillRect(x - 5, y - 1, 10, 4);
          ctx.fillStyle = pal.s; ctx.fillRect(x + 5, y - 1, 3, 3);
          ctx.fillStyle = pal.p; ctx.fillRect(x - 8, y, 3, 3);
          return;
        }
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x - 4, y + 6, 9, 2);
        const lp = step & 1;
        ctx.fillStyle = pal.p;
        ctx.fillRect(x - 3, y + 2, 2, lp ? 5 : 3); ctx.fillRect(x + 1, y + 2, 2, lp ? 3 : 5);
        ctx.fillStyle = '#2a2018'; ctx.fillRect(x - 3, y + (lp ? 6 : 4), 2, 1); ctx.fillRect(x + 1, y + (lp ? 4 : 6), 2, 1);
        ctx.fillStyle = pal.c; ctx.fillRect(x - 4, y - 3, 8, 6);
        ctx.fillStyle = pal.s; ctx.fillRect(x - 5, y - 2 + (lp ? 1 : 0), 1, 3); ctx.fillRect(x + 4, y - 2 + (lp ? 0 : 1), 1, 3);
        ctx.fillStyle = pal.s; ctx.fillRect(x - 2, y - 7, 4, 4);
        ctx.fillStyle = pal.h;
        if (dy > 0) ctx.fillRect(x - 2, y - 7, 4, 1);
        else ctx.fillRect(x - 2, y - 7, 4, 3);
        if (pal.band) { ctx.fillStyle = pal.band; ctx.fillRect(x - 2, y - 5, 4, 1); }
        if (pal.g) {
          const L = 7, ox = x + (dx >= 0 ? 2 : -2), oy = y;
          ctx.fillStyle = pal.g;
          for (let i = 1; i <= L; i++) ctx.fillRect(Math.round(ox + dx * i), Math.round(oy + dy * i - 1), 1, 1);
        }
      }

      // ================= Areas =================
      function buildArea(n) {
        const r = mkRng(n * 7919 + 13);
        const len = 2000 + Math.min(4, n) * 150;
        const th = THEMES[n % 4];
        const obs = [], nests = [], boxes = [], events = [], water = [];
        // water bands
        const nRiv = n === 0 ? 1 : 1 + (r() < 0.5 ? 1 : 0);
        for (let i = 0; i < nRiv; i++) {
          const wy = -Math.round(len * (0.3 + i * 0.38 + r() * 0.08));
          const bx = 30 + Math.round(r() * (W - 100));
          water.push({ y: wy, h: 28, bx, bw: 40 });
        }
        const inWater = (y, h) => water.some(w => y + h > w.y - 10 && y < w.y + w.h + 10);
        for (let by = 120; by > -len + 140; by -= 56 + Math.round(r() * 20)) {
          if (inWater(by - 30, 50)) continue;
          const gx = 30 + r() * (W - 60);
          const cnt = 1 + Math.floor(r() * 3);
          for (let k = 0; k < cnt; k++) {
            const kind = ['rock', 'tree', 'sand', 'tree', 'hut'][Math.floor(r() * 5)];
            const w = kind === 'hut' ? 26 : kind === 'sand' ? 28 : kind === 'tree' ? 14 : 16 + Math.round(r() * 8);
            const h = kind === 'hut' ? 20 : kind === 'sand' ? 8 : kind === 'tree' ? 12 : 12;
            const x = Math.round(r() * (W - w));
            if (x + w > gx - 24 && x < gx + 24) continue;
            const y = by - Math.round(r() * 20);
            if (obs.some(o => x < o.x + o.w + 4 && x + w + 4 > o.x && y < o.y + o.h + 4 && y + h + 4 > o.y)) continue;
            obs.push({ x, y, w, h, kind });
          }
          if (by < -150 && r() < 0.18 + n * 0.03) {
            const x = Math.round(r() < 0.5 ? 6 + r() * 30 : W - 60 + r() * 30), y = by - 30;
            if (!obs.some(o => x < o.x + o.w + 4 && x + 28 > o.x && y < o.y + o.h + 4 && y + 14 > o.y)) nests.push({ x, y, w: 24, h: 12, up: 0, t: 60 + Math.floor(r() * 120), dead: false });
          }
        }
        for (let y = -300; y > -len + 200; y -= 380 + Math.round(r() * 200)) {
          const x = 20 + Math.round(r() * (W - 40));
          if (!obs.some(o => x > o.x - 8 && x < o.x + o.w + 8 && y > o.y - 8 && y < o.y + o.h + 8) && !inWater(y - 6, 12)) boxes.push({ x, y, taken: false });
        }
        events.push({ at: -len * 0.25, t: 'pow' }, { at: -len * 0.62, t: 'pow' });
        events.push({ at: -len * 0.45, t: 'truck' });
        if (n >= 1) events.push({ at: -len * 0.8, t: 'truck' });
        events.push({ at: -len * 0.35, t: 'bike' }, { at: -len * 0.7, t: 'bike' });
        if (n >= 2) events.push({ at: -len * 0.55, t: 'bike' });
        events.sort((a, b) => b.at - a.at);
        // fortress wall at the end
        const gateY = -len;
        obs.push({ x: 0, y: gateY - 36, w: W / 2 - 24, h: 36, kind: 'wall' });
        obs.push({ x: W / 2 + 24, y: gateY - 36, w: W / 2 - 24, h: 36, kind: 'wall' });
        return { n, len, th, obs, nests, boxes, events, water, gateY };
      }

      // ================= Game state =================
      function newGame() {
        g = { score: 0, lives: 3, area: 0, nextLife: 10000 };
        startArea();
        sfx.start();
      }
      function startArea() {
        g.A = buildArea(g.area);
        g.camY = 0;
        g.en = []; g.eb = []; g.eg = []; g.pb = []; g.pg = null; g.booms = []; g.pops = [];
        g.spawnT = 120; g.bikeT = 900; g.phase = 'ready'; g.phaseT = 100; g.rush = 0; g.rushT = 0; g.officer = false;
        g.grenades = Math.max(g.grenades || 0, 6);
        g.evIdx = 0;
        resetPlayer();
      }
      function resetPlayer() {
        g.p = { x: W / 2, y: g.camY + H - 40, dx: 0, dy: -1, step: 0, stepT: 0, alive: true, inv: 120, cool: 0 };
      }
      function diff() { return g.area + Math.max(0, g.area - 7) * 0.5; }
      function addScore(n) {
        g.score += n;
        if (g.score >= g.nextLife) { g.lives++; g.nextLife += g.nextLife === 10000 ? 40000 : 50000; sfx.oneup(); }
        if (g.score > hi) { hi = g.score; api.setHiScore(hi); }
      }
      function boom(x, y, big) { g.booms.push({ x, y, t: 0, big: !!big }); }
      function pop(x, y, n) { g.pops.push({ x, y, n, t: 50 }); }

      // ================= Collision =================
      function solidRect(x, y, w, h, bullets) {
        const A = g.A;
        for (const o of A.obs) if (x < o.x + o.w && x + w > o.x && y < o.y + o.h && y + h > o.y) {
          if (bullets && o.kind === 'sand' && !bullets.sandBlock) continue;
          return true;
        }
        if (!bullets) {
          for (const ne of A.nests) if (x < ne.x + ne.w && x + w > ne.x && y < ne.y + ne.h && y + h > ne.y) return true;
          for (const wt of A.water) if (y + h > wt.y && y < wt.y + wt.h && !(x >= wt.bx && x + w <= wt.bx + wt.bw)) return true;
          if (y < A.gateY + 2 && x + w > W / 2 - 24 && x < W / 2 + 24 && g.phase !== 'clear') return true;
        }
        return false;
      }
      function moveBody(o, vx, vy) {
        let hit = false;
        if (vx) { if (!solidRect(o.x - 3 + vx, o.y, 7, 6)) o.x += vx; else hit = true; }
        if (vy) { if (!solidRect(o.x - 3, o.y + vy, 7, 6)) o.y += vy; else hit = true; }
        return hit;
      }

      // ================= Enemies =================
      function spawnSoldier(x, y, opts) {
        opts = opts || {};
        if (solidRect(x - 3, y, 7, 6)) return null;
        const s = {
          t: 'sol', x, y, dx: 0, dy: 1, vx: 0, vy: 0, step: 0, stepT: 0, decide: 0, shootT: 40 + Math.random() * 80,
          kind: opts.kind || (Math.random() < 0.2 + diff() * 0.03 ? 'gren' : 'rifle'), dying: 0, age: 0, rush: !!opts.rush
        };
        g.en.push(s); return s;
      }
      function soldierCount() { return g.en.filter(e => e.t === 'sol' && !e.dying).length; }
      function regularSpawn() {
        const maxSol = Math.min(11, 5 + Math.floor(diff()));
        if (soldierCount() >= maxSol) return;
        const r = Math.random();
        if (r < 0.62 && g.camY - 6 > g.A.gateY + 4) spawnSoldier(12 + Math.random() * (W - 24), g.camY - 6);
        else if (r < 0.9) { const left = Math.random() < 0.5; spawnSoldier(left ? -4 : W + 4, g.camY + 30 + Math.random() * 120); }
        else spawnSoldier(12 + Math.random() * (W - 24), g.camY + H + 6);
      }
      function runEvent(ev) {
        if (ev.t === 'pow') {
          const left = Math.random() < 0.5, y = g.camY + 50 + Math.random() * 60, dir = left ? 1 : -1, x0 = left ? -10 : W + 10;
          const pw = { t: 'pow', x: x0 - dir * 14, y, dir, free: false, dying: 0, step: 0, stepT: 0, age: 0 };
          const g1 = spawnSoldier(x0, y, { kind: 'rifle' }), g2 = spawnSoldier(x0 - dir * 28, y, { kind: 'rifle' });
          [g1, g2].forEach(s => { if (s) { s.escort = pw; s.vx = dir * 0.45; s.decide = 9999; s.dx = dir; s.dy = 0; } });
          pw.guards = [g1, g2].filter(Boolean);
          g.en.push(pw);
        } else if (ev.t === 'truck') {
          const x = 40 + Math.random() * (W - 80);
          g.en.push({ t: 'truck', x, y: g.camY - 30, hp: 1, drop: 4 + Math.floor(diff() / 2), dropT: 0, stopY: 70 + Math.random() * 40, st: 'in', age: 0, dying: 0 });
        } else if (ev.t === 'bike') {
          const left = Math.random() < 0.5;
          g.en.push({ t: 'bike', x: left ? -20 : W + 20, y: g.camY + 40 + Math.random() * 100, vx: (left ? 1 : -1) * (1.8 + diff() * 0.1), thrown: false, age: 0, dying: 0 });
        }
      }
      function enemyShoot(x, y, speed) {
        const p = g.p; const a = Math.atan2(p.y - y, p.x - x) + (Math.random() - 0.5) * 0.15;
        const sp = speed || (1.4 + Math.min(1.2, diff() * 0.12));
        g.eb.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 200 });
        sfx.eshot();
      }
      function enemyGrenade(x, y) {
        const p = g.p; const tx = p.x + (Math.random() - 0.5) * 20, ty = p.y + (Math.random() - 0.5) * 16;
        g.eg.push({ x0: x, y0: y, tx, ty, t: 0, T: 50 });
      }
      function killEnemy(e, pts) {
        if (e.dying) return;
        e.dying = 1; addScore(pts); pop(e.x, e.y - 10, pts); sfx.kill();
        if (e.t === 'truck' || e.t === 'bike') { boom(e.x, e.y, true); sfx.boom(); }
      }
      function updEnemies() {
        const p = g.p;
        for (const e of g.en) {
          e.age++;
          if (e.dying) { e.dying++; continue; }
          const sy = e.y - g.camY;
          if (e.t === 'sol') {
            if (e.escort) {
              if (e.escort.free || e.escort.dying) { e.escort = null; e.decide = 0; }
              else { e.x += e.vx; if (++e.stepT > 8) { e.stepT = 0; e.step++; } }
            } else {
              if (--e.decide <= 0) {
                e.decide = 40 + Math.random() * 70;
                const ang = Math.atan2(p.y - e.y, p.x - e.x) + (Math.random() - 0.5) * (e.rush ? 0.8 : 1.8);
                const sp = (e.rush ? 0.75 : 0.5) + Math.min(0.5, diff() * 0.05);
                if (Math.random() < 0.25 && !e.rush && g.phase !== 'rush' && !e.stopped) { e.vx = 0; e.vy = 0; e.stopped = true; }
                else { e.vx = Math.cos(ang) * sp; e.vy = Math.sin(ang) * sp; e.stopped = false; }
                if (Math.abs(p.y - e.y) < 30 && Math.random() < 0.4) e.vy *= 0.2;
              }
              if (moveSol(e, e.vx, e.vy)) e.decide = Math.min(e.decide, 8);
            }
            if (e.vx || e.vy) { const m = Math.hypot(e.vx, e.vy); e.dx = e.vx / m; e.dy = e.vy / m; }
            if (sy > 0 && sy < H - 20 && p.alive && --e.shootT <= 0) {
              e.shootT = Math.max(40, 140 - diff() * 10) + Math.random() * 80;
              if (e.kind === 'gren' && Math.hypot(p.x - e.x, p.y - e.y) < 120) enemyGrenade(e.x, e.y);
              else if (Math.hypot(p.x - e.x, p.y - e.y) < 170) enemyShoot(e.x, e.y - 2);
              const a = Math.atan2(p.y - e.y, p.x - e.x); e.dx = Math.cos(a); e.dy = Math.sin(a);
            }
            if (e.age > 60 && (sy > H + 24 || sy < -50 || e.x < -24 || e.x > W + 24)) e.gone = true;
            if (e.y < g.A.gateY - 4) e.gone = true;
            if (e.age > 1200 && !e.rush && (sy < 0 || sy > H || e.x < 4 || e.x > W - 4)) e.gone = true;
            if (p.alive && p.inv <= 0 && Math.abs(p.x - e.x) < 6 && Math.abs(p.y - e.y) < 8) playerHit();
          } else if (e.t === 'pow') {
            if (e.free) {
              const a = Math.atan2(p.y - e.y, p.x - e.x); e.x += Math.cos(a) * 1.0; e.y += Math.sin(a) * 1.0;
              if (Math.hypot(p.x - e.x, p.y - e.y) < 9 && p.alive) { e.gone = true; addScore(1000); pop(e.x, e.y - 10, 1000); sfx.pow(); if (Math.random() < 0.5) g.grenades = Math.min(99, g.grenades + 2); }
            } else {
              e.x += e.dir * 0.45;
              if (e.guards.every(s => s.dying || s.gone || !s.escort)) { e.free = true; }
              if (e.age > 60 && (e.x < -30 || e.x > W + 30)) e.gone = true;
            }
            if (++e.stepT > 10) { e.stepT = 0; e.step++; }
            if (sy > H + 20) e.gone = true;
          } else if (e.t === 'truck') {
            if (e.st === 'in') { e.y += 0.9; if (sy >= e.stopY) { e.st = 'drop'; e.dropT = 30; } }
            else if (e.st === 'drop') {
              if (--e.dropT <= 0) {
                if (e.drop > 0) { e.drop--; e.dropT = 28; const s = spawnSoldier(e.x + (Math.random() < 0.5 ? -14 : 14), e.y + 10); if (s) { s.vy = 0.6; s.decide = 20; } }
                else e.st = 'out';
              }
            } else { e.y += 1.1; if (sy > H + 40) e.gone = true; }
            if (p.alive && p.inv <= 0 && Math.abs(p.x - e.x) < 12 && Math.abs(p.y - e.y) < 18) playerHit();
          } else if (e.t === 'bike') {
            e.x += e.vx;
            if (!e.thrown && Math.abs(e.x - p.x) < 30 && sy > 0) { e.thrown = true; enemyGrenade(e.x, e.y); }
            if (e.x < -40 || e.x > W + 40) e.gone = true;
            if (p.alive && p.inv <= 0 && Math.abs(p.x - e.x) < 12 && Math.abs(p.y - e.y) < 8) playerHit();
          } else if (e.t === 'officer') {
            e.y -= 0.9; if (++e.stepT > 6) { e.stepT = 0; e.step++; }
            if (e.y < g.A.gateY - 30) e.gone = true;
          }
        }
        g.en = g.en.filter(e => !e.gone && !(e.dying && e.dying > 40));
        // nests
        for (const ne of g.A.nests) {
          if (ne.dead) continue;
          const sy = ne.y - g.camY;
          if (sy < -20 || sy > H) continue;
          if (--ne.t <= 0) {
            if (ne.up) { ne.up = 0; ne.t = 60 + Math.random() * 90; }
            else { ne.up = 1; ne.t = 70; ne.shot = 25; }
          }
          if (ne.up && ne.shot && --ne.shot === 0 && p.alive) enemyShoot(ne.x + ne.w / 2, ne.y);
        }
      }
      function moveSol(e, vx, vy) {
        if (vx || vy) { if (++e.stepT > 8) { e.stepT = 0; e.step++; } }
        // soldiers ignore terrain while off-screen entering
        const sy = e.y - g.camY;
        if (e.x < 2 || e.x > W - 2 || sy < 0) { e.x += vx; e.y += vy; return false; }
        return moveBody(e, vx, vy);
      }

      // ================= Player =================
      function playerHit() {
        const p = g.p;
        if (!p.alive || p.inv > 0 || g.phase === 'clear') return;
        p.alive = false; g.prevPhase = g.phase; g.phase = 'dead'; g.phaseT = 120; sfx.die();
      }
      function updPlayer() {
        const p = g.p;
        let mx = (api.key('ArrowRight') ? 1 : 0) - (api.key('ArrowLeft') ? 1 : 0);
        let my = (api.key('ArrowDown') ? 1 : 0) - (api.key('ArrowUp') ? 1 : 0);
        if (mx || my) {
          const m = Math.hypot(mx, my); p.dx = mx / m; p.dy = my / m;
          const sp = 1.15;
          moveBody(p, p.dx * sp, p.dy * sp);
          if (++p.stepT > 7) { p.stepT = 0; p.step++; }
        }
        p.x = Math.max(6, Math.min(W - 6, p.x));
        const bottom = g.camY + H - 14, top = g.camY + 24;
        if (p.y > bottom) p.y = bottom;
        if (p.y < top) p.y = top;
        if (p.inv > 0) p.inv--;
        if (p.cool > 0) p.cool--;
        if (api.key('Space') && p.cool <= 0 && g.pb.length < 3) {
          p.cool = 9;
          g.pb.push({ x: p.x + p.dx * 8, y: p.y - 2 + p.dy * 8, vx: p.dx * 4, vy: p.dy * 4, life: 24 });
          sfx.shot();
        }
        if (api.pressed('KeyX') && !g.pg && g.grenades > 0) {
          g.grenades--;
          g.pg = { x0: p.x, y0: p.y - 4, tx: p.x + p.dx * (p.dy > 0 ? 50 : 10), ty: p.y - (p.dy > 0 ? -40 : 72), t: 0, T: 36 };
          sfx.throw();
        }
      }
      function grenadeBlast(x, y, r) {
        boom(x, y, true); sfx.boom();
        for (const e of g.en) {
          if (e.dying || e.gone) continue;
          const d = Math.hypot(e.x - x, e.y - y);
          if (e.t === 'sol' && d < r) killEnemy(e, e.rush ? 200 : 150);
          else if (e.t === 'truck' && d < r + 12) killEnemy(e, 1000);
          else if (e.t === 'bike' && d < r + 6) killEnemy(e, 500);
          else if (e.t === 'officer' && d < r) killEnemy(e, 2000);
          else if (e.t === 'pow' && d < r - 4) { e.dying = 1; }
        }
        for (const ne of g.A.nests) if (!ne.dead && Math.hypot(ne.x + ne.w / 2 - x, ne.y + ne.h / 2 - y) < r + 8) {
          ne.dead = true; addScore(300); pop(ne.x + ne.w / 2, ne.y - 6, 300); boom(ne.x + ne.w / 2, ne.y + 4, false);
        }
      }
      function updShots() {
        const p = g.p;
        for (const b of g.pb) {
          b.x += b.vx; b.y += b.vy; b.life--;
          if (b.life <= 0 || solidRect(b.x - 1, b.y - 1, 2, 2, { sandBlock: false })) { b.dead = true; continue; }
          for (const ne of g.A.nests) if (!ne.dead && b.x > ne.x && b.x < ne.x + ne.w && b.y > ne.y - 4 && b.y < ne.y + ne.h) b.dead = true;
          for (const e of g.en) {
            if (e.dying || b.dead) continue;
            if (e.t === 'sol' && Math.abs(e.x - b.x) < 5 && b.y > e.y - 9 && b.y < e.y + 6) { b.dead = true; killEnemy(e, e.rush ? 200 : 150); }
            else if (e.t === 'bike' && Math.abs(e.x - b.x) < 10 && Math.abs(e.y - b.y) < 7) { b.dead = true; killEnemy(e, 500); }
            else if (e.t === 'truck' && Math.abs(e.x - b.x) < 11 && Math.abs(e.y - b.y) < 17) { b.dead = true; au.tone(1500, 0.02, { type: 'square', vol: 0.05 }); }
            else if (e.t === 'officer' && Math.abs(e.x - b.x) < 5 && Math.abs(e.y - b.y) < 8) { b.dead = true; killEnemy(e, 2000); }
            else if (e.t === 'pow' && !e.free && Math.abs(e.x - b.x) < 4 && Math.abs(e.y - b.y) < 6) { b.dead = true; e.dying = 1; sfx.kill(); }
          }
        }
        g.pb = g.pb.filter(b => !b.dead);
        if (g.pg) {
          const gr = g.pg; gr.t++;
          if (gr.t >= gr.T) { grenadeBlast(gr.tx, gr.ty, 16); g.pg = null; }
        }
        for (const b of g.eb) {
          b.x += b.vx; b.y += b.vy; b.life--;
          const sy = b.y - g.camY;
          if (b.life <= 0 || sy < -10 || sy > H + 10 || b.x < -10 || b.x > W + 10) { b.dead = true; continue; }
          if (solidRect(b.x - 1, b.y - 1, 2, 2, { sandBlock: false })) { b.dead = true; continue; }
          if (p.alive && p.inv <= 0 && Math.abs(b.x - p.x) < 3.5 && b.y > p.y - 7 && b.y < p.y + 5) { b.dead = true; playerHit(); }
        }
        g.eb = g.eb.filter(b => !b.dead);
        for (const gr of g.eg) {
          gr.t++;
          if (gr.t >= gr.T) {
            gr.dead = true; boom(gr.tx, gr.ty, false); au.noise(0.25, { vol: 0.18, freq: 1200, slideTo: 100 });
            if (p.alive && p.inv <= 0 && Math.hypot(p.x - gr.tx, p.y - gr.ty) < 11) playerHit();
          }
        }
        g.eg = g.eg.filter(gr => !gr.dead);
        for (const bx of g.A.boxes) if (!bx.taken && p.alive && Math.abs(bx.x - p.x) < 8 && Math.abs(bx.y - p.y) < 8) {
          bx.taken = true; g.grenades = Math.min(99, g.grenades + 3); addScore(200); pop(bx.x, bx.y - 10, 200); sfx.pick();
        }
      }

      function updPlay() {
        const p = g.p, A = g.A;
        if (p.alive) updPlayer();
        // scroll
        const lockCam = A.gateY - 48;
        if (p.alive && p.y - g.camY < 112 && g.camY > lockCam) g.camY = Math.max(lockCam, p.y - 112);
        // events
        while (g.evIdx < A.events.length && g.camY <= A.events[g.evIdx].at) { runEvent(A.events[g.evIdx]); g.evIdx++; }
        if (g.phase === 'play') {
          if (--g.spawnT <= 0) { g.spawnT = Math.max(28, 75 - diff() * 6) + Math.random() * 40; regularSpawn(); }
          if (g.camY <= lockCam) {
            g.phase = 'rush'; g.rush = 10 + Math.min(16, Math.floor(diff() * 2.5)); g.rushT = 60; g.gateOpen = 0;
            g.en.push({ t: 'officer', x: W / 2, y: A.gateY + 40, step: 0, stepT: 0, age: 0, dying: 0 });
            au.melody([[196, .15], [233, .15], [262, .15], [294, .3]], { type: 'sawtooth', vol: 0.09 });
          }
        } else if (g.phase === 'rush') {
          if (g.gateOpen < 24) g.gateOpen += 0.5;
          if (g.rush > 0 && --g.rushT <= 0) {
            g.rushT = Math.max(16, 42 - diff() * 3) + Math.random() * 20;
            const s = spawnSoldier(W / 2 + (Math.random() - 0.5) * 30, A.gateY + 4, { rush: true });
            if (s) { g.rush--; s.vy = 0.8; s.decide = 20; }
          }
          if (g.rush <= 0 && !g.en.some(e => e.t === 'sol' && !e.dying)) {
            g.phase = 'clear'; g.phaseT = 220; addScore(0); sfx.clear();
            g.eb = []; g.eg = [];
          }
        }
        updEnemies();
        updShots();
      }

      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++; demoScroll += 0.5;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { mode = 'game'; newGame(); }
            else { coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 }); }
          }
          return;
        }
        for (const b of g.booms) b.t++;
        g.booms = g.booms.filter(b => b.t < (b.big ? 36 : 22));
        for (const q of g.pops) q.t--;
        g.pops = g.pops.filter(q => q.t > 0);
        switch (g.phase) {
          case 'ready':
            if (--g.phaseT <= 0) g.phase = 'play';
            break;
          case 'play': case 'rush': updPlay(); break;
          case 'clear': {
            const p = g.p;
            g.phaseT--;
            for (const e of g.en) if (e.dying) e.dying++;
            g.en = g.en.filter(e => !(e.dying && e.dying > 40) && e.t !== 'sol');
            if (g.phaseT < 170) {
              const tx = W / 2, ty = g.A.gateY - 30;
              p.x += Math.max(-1, Math.min(1, tx - p.x));
              if (Math.abs(tx - p.x) < 2) p.y -= 1;
              if (++p.stepT > 7) { p.stepT = 0; p.step++; }
              p.dx = 0; p.dy = -1;
              if (p.y < ty) p.hidden = true;
            }
            if (g.phaseT <= 0) { g.area++; startArea(); }
            break;
          }
          case 'dead':
            updEnemies();
            for (const b of g.eb) { b.x += b.vx; b.y += b.vy; }
            if (--g.phaseT <= 0) {
              if (g.lives > 1) { g.lives--; respawn(); }
              else {
                g.phase = 'wait';
                const cg = g;
                if (api.offerContinue) api.offerContinue(() => { if (g === cg) { g.lives = 3; respawn(); } }, () => { if (g === cg) gameOver(); });
                else gameOver();
              }
            }
            break;
          case 'over':
            if (--g.phaseT <= 0 || (g.phaseT < 200 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; }
            break;
        }
      }
      function respawn() {
        g.eb = []; g.eg = []; g.pb = []; g.pg = null;
        g.en = g.en.filter(e => e.t !== 'bike' && e.t !== 'truck');
        resetPlayer();
        // don't respawn inside an obstacle
        for (let k = 0; k < 80 && solidRect(g.p.x - 3, g.p.y, 7, 6); k++) { g.p.x = 20 + Math.random() * (W - 40); g.p.y = g.camY + H - 40 - (k % 6) * 14; }
        g.phase = g.prevPhase === 'rush' ? 'rush' : 'play';
        g.grenades = Math.max(g.grenades, 4);
      }
      function gameOver() { g.phase = 'over'; g.phaseT = 300; au.melody([[262, .25], [247, .25], [233, .25], [196, .6]], { type: 'square', vol: 0.12 }); }

      // ================= Rendering =================
      function drawGround(ctx, camY, th, A) {
        ctx.fillStyle = th.base; ctx.fillRect(0, 0, W, H);
        const r0 = Math.floor(camY / 8);
        for (let r = r0; r < r0 + H / 8 + 2; r++) {
          const y = r * 8 - camY;
          for (let k = 0; k < 5; k++) {
            const hv = hash(r * 31 + k * 977 + 5);
            const x = (hv * W) | 0;
            ctx.fillStyle = k & 1 ? th.dark : th.lite;
            ctx.fillRect(x, y + ((hv * 64) & 7), k < 2 ? 2 : 1, 1);
            if (k === 0 && hv > 0.55) { ctx.fillStyle = th.dark; ctx.fillRect(x + 3, y + 2, 1, 3); ctx.fillRect(x + 5, y + 1, 1, 4); ctx.fillRect(x + 7, y + 3, 1, 2); }
          }
        }
        if (!A) return;
        // dirt road down the middle (gently winding)
        for (let y = 0; y < H; y += 4) {
          const wy = y + camY;
          const cx = W / 2 + Math.sin(wy / 140) * 30;
          ctx.fillStyle = 'rgba(120,90,50,0.22)'; ctx.fillRect(Math.round(cx - 18), y, 36, 4);
        }
        for (const wt of A.water) {
          const y = wt.y - camY;
          if (y > H || y + wt.h < 0) continue;
          ctx.fillStyle = '#2858a8'; ctx.fillRect(0, y, W, wt.h);
          ctx.fillStyle = '#4878c8';
          for (let i = 0; i < 10; i++) { const x = ((hash(i * 13 + wt.y) * W + frame * 0.3) % W) | 0; ctx.fillRect(x, y + 3 + (i * 7) % (wt.h - 6), 6, 1); }
          ctx.fillStyle = '#806040'; ctx.fillRect(0, y - 2, W, 2); ctx.fillRect(0, y + wt.h, W, 2);
          ctx.fillStyle = '#8a6a3a'; ctx.fillRect(wt.bx, y - 2, wt.bw, wt.h + 4);
          ctx.fillStyle = '#6a4a28'; for (let i = 0; i < wt.h + 4; i += 4) ctx.fillRect(wt.bx, y - 2 + i, wt.bw, 1);
          ctx.fillStyle = '#4a3018'; ctx.fillRect(wt.bx - 2, y - 2, 2, wt.h + 4); ctx.fillRect(wt.bx + wt.bw, y - 2, 2, wt.h + 4);
        }
      }
      function drawObstacle(ctx, o, th) {
        const x = Math.round(o.x), y = Math.round(o.y - g.camY);
        if (y > H || y + o.h < -40) return;
        if (o.kind === 'rock') {
          ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 2, y + 2, o.w, o.h);
          ctx.fillStyle = th.rock; ctx.fillRect(x, y + 2, o.w, o.h - 2); ctx.fillRect(x + 2, y, o.w - 4, o.h);
          ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x + 2, y + 1, o.w - 6, 2);
          ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 1, y + o.h - 3, o.w - 2, 2);
        } else if (o.kind === 'tree') {
          ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 5, y + 4, 4, o.h - 4);
          ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(x + 9, y + 2, 10, 0, 7); ctx.fill();
          ctx.fillStyle = '#1e5a1a'; ctx.beginPath(); ctx.arc(x + 7, y, 10, 0, 7); ctx.fill();
          ctx.fillStyle = '#2e7a28'; ctx.beginPath(); ctx.arc(x + 5, y - 2, 6, 0, 7); ctx.fill();
          ctx.fillStyle = '#3e9a38'; ctx.fillRect(x + 3, y - 5, 3, 2);
        } else if (o.kind === 'sand') {
          for (let i = 0; i < o.w; i += 7) { ctx.fillStyle = '#b8a070'; ctx.fillRect(x + i, y, 6, 4); ctx.fillStyle = '#9a8458'; ctx.fillRect(x + i, y + 3, 6, 1); }
          for (let i = 3; i < o.w - 3; i += 7) { ctx.fillStyle = '#c8b080'; ctx.fillRect(x + i, y + 4, 6, 4); ctx.fillStyle = '#9a8458'; ctx.fillRect(x + i, y + 7, 6, 1); }
        } else if (o.kind === 'hut') {
          ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + 3, y + 3, o.w, o.h);
          ctx.fillStyle = '#7a5a38'; ctx.fillRect(x, y + 6, o.w, o.h - 6);
          ctx.fillStyle = '#a88850'; ctx.beginPath(); ctx.moveTo(x - 2, y + 8); ctx.lineTo(x + o.w / 2, y - 2); ctx.lineTo(x + o.w + 2, y + 8); ctx.fill();
          ctx.fillStyle = '#2a1a0a'; ctx.fillRect(x + o.w / 2 - 3, y + o.h - 7, 6, 7);
        } else if (o.kind === 'wall') {
          ctx.fillStyle = '#787068'; ctx.fillRect(x, y, o.w, o.h);
          ctx.fillStyle = '#5a524a';
          for (let r = 0; r < o.h; r += 6) for (let c = (r / 6 & 1) * 6; c < o.w; c += 12) ctx.fillRect(x + c, y + r, 1, 6);
          for (let r = 0; r < o.h; r += 6) ctx.fillRect(x, y + r, o.w, 1);
          ctx.fillStyle = '#9a928a'; for (let c = 0; c < o.w; c += 10) ctx.fillRect(x + c, y - 4, 6, 4);
        }
      }
      function drawGate(ctx) {
        const A = g.A, y = A.gateY - 36 - g.camY;
        if (y > H || y < -60) return;
        const open = g.phase === 'rush' || g.phase === 'clear' ? (g.gateOpen || 24) : 0;
        ctx.fillStyle = '#1a1410'; ctx.fillRect(W / 2 - 24, y, 48, 36);
        ctx.fillStyle = '#6a4a2a';
        ctx.fillRect(W / 2 - 24, y + 4, 24 - open, 32); ctx.fillRect(W / 2 + open, y + 4, 24 - open, 32);
        ctx.fillStyle = '#4a3018';
        for (let i = 0; i < 4; i++) { ctx.fillRect(W / 2 - 24, y + 8 + i * 8, 24 - open, 1); ctx.fillRect(W / 2 + open, y + 8 + i * 8, 24 - open, 1); }
        ctx.fillStyle = '#5a524a'; ctx.fillRect(W / 2 - 28, y - 8, 56, 8);
        ctx.fillStyle = '#e02020'; ctx.fillRect(W / 2 - 1, y - 22, 1, 14); ctx.fillRect(W / 2, y - 22, 8, 5);
      }
      function drawNest(ctx, ne) {
        const x = Math.round(ne.x), y = Math.round(ne.y - g.camY);
        if (y > H || y < -20) return;
        if (ne.dead) { ctx.fillStyle = '#4a3a28'; ctx.fillRect(x + 2, y + 2, ne.w - 4, ne.h - 4); ctx.fillStyle = '#2a2018'; ctx.fillRect(x + 8, y + 4, 8, 4); return; }
        ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x + 4, y + 2, ne.w - 8, ne.h - 4);
        if (ne.up) drawMan(ctx, x + ne.w / 2, y + 2, 0, 1, 0, PSOL, false);
        ctx.fillStyle = '#b8a070';
        for (let i = 0; i < ne.w; i += 6) { ctx.fillRect(x + i, y + ne.h - 5, 5, 5); }
        ctx.fillRect(x, y, 4, ne.h); ctx.fillRect(x + ne.w - 4, y, 4, ne.h);
        ctx.fillStyle = '#8a7448'; for (let i = 0; i < ne.w; i += 6) ctx.fillRect(x + i, y + ne.h - 1, 5, 1);
      }
      function drawTruck(ctx, e) {
        const x = Math.round(e.x), y = Math.round(e.y - g.camY);
        if (e.dying) { ctx.fillStyle = '#2a2a20'; ctx.fillRect(x - 10, y - 16, 20, 32); ctx.fillStyle = (frame >> 2) & 1 ? '#ff8020' : '#ffd040'; ctx.fillRect(x - 4, y - 6, 8, 8); return; }
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 9, y - 14, 22, 34);
        ctx.fillStyle = '#202020'; for (const wy of [-12, -2, 10]) { ctx.fillRect(x - 12, y + wy, 3, 6); ctx.fillRect(x + 9, y + wy, 3, 6); }
        ctx.fillStyle = '#4a5a2a'; ctx.fillRect(x - 10, y - 16, 20, 22);
        ctx.fillStyle = '#5a6a3a'; for (let i = 0; i < 5; i++) ctx.fillRect(x - 10, y - 15 + i * 4, 20, 1);
        ctx.fillStyle = '#3a4820'; ctx.fillRect(x - 9, y + 7, 18, 10);
        ctx.fillStyle = '#90b0d0'; ctx.fillRect(x - 7, y + 12, 14, 3);
        ctx.fillStyle = '#ffffa0'; ctx.fillRect(x - 8, y + 17, 3, 2); ctx.fillRect(x + 5, y + 17, 3, 2);
      }
      function drawBike(ctx, e) {
        const x = Math.round(e.x), y = Math.round(e.y - g.camY), d = e.vx > 0 ? 1 : -1;
        if (e.dying) return;
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 10, y + 5, 20, 3);
        ctx.fillStyle = '#202020'; ctx.fillRect(x - 10, y + 2, 5, 4); ctx.fillRect(x + 5, y + 2, 5, 4);
        ctx.fillStyle = '#606a40'; ctx.fillRect(x - 7, y, 14, 3);
        ctx.fillStyle = '#4a5030'; ctx.fillRect(x - 6 * d - 4, y - 6, 8, 8);
        drawMan(ctx, x + d * 2, y - 2, d, 0, 0, PSOL, false);
        drawMan(ctx, x - d * 6, y - 4, d, 0, 0, PSOL2, false);
      }
      function drawEntity(ctx, e) {
        const sy = e.y - g.camY;
        if (sy < -40 || sy > H + 40) return;
        if (e.t === 'sol') {
          if (e.dying && e.dying > 30 && (e.dying & 2)) return;
          drawMan(ctx, e.x, sy, e.dx, e.dy, e.step, e.kind === 'gren' ? PSOL2 : PSOL, !!e.dying);
        } else if (e.t === 'pow') {
          if (e.dying) { drawMan(ctx, e.x, sy, 0, 1, 0, PPOW, true); return; }
          drawMan(ctx, e.x, sy, e.free ? 0 : e.dir, 1, e.step, PPOW, false);
          if (!e.free) { ctx.fillStyle = '#d0d0d0'; ctx.fillRect(Math.round(e.x) - 3, Math.round(sy) - 1, 6, 1); }
          else if ((frame >> 3) & 1) text(ctx, 'HELP', e.x, sy - 18, '#ffffff', { center: true });
        } else if (e.t === 'truck') drawTruck(ctx, e);
        else if (e.t === 'bike') drawBike(ctx, e);
        else if (e.t === 'officer') drawMan(ctx, e.x, sy, 0, -1, e.step, POFF, !!e.dying);
      }
      function drawBoom(ctx, b) {
        const T = b.big ? 36 : 22, f = b.t / T, r = (b.big ? 15 : 9) * Math.sqrt(f) + 2;
        const x = b.x, y = b.y - g.camY;
        const col = f < 0.2 ? '#ffffff' : f < 0.45 ? '#ffe040' : f < 0.7 ? '#ff7010' : '#603018';
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r * (1 - f * 0.3), 0, 7); ctx.fill();
        ctx.fillStyle = '#ffe080';
        for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + b.t * 0.1; ctx.fillRect(Math.round(x + Math.cos(a) * r * 1.3), Math.round(y + Math.sin(a) * r * 1.3), 2, 2); }
      }
      function drawGrenadeArc(ctx, gr, col) {
        const f = gr.t / gr.T;
        const x = gr.x0 + (gr.tx - gr.x0) * f, y = gr.y0 + (gr.ty - gr.y0) * f - g.camY;
        const hgt = Math.sin(f * Math.PI) * 22;
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(Math.round(x) - 1, Math.round(y), 3, 2);
        ctx.fillStyle = col; ctx.fillRect(Math.round(x) - 1, Math.round(y - hgt) - 2, 3, 4);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x), Math.round(y - hgt) - 2, 1, 1);
      }
      function hud(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, 20);
        text(ctx, '1UP', 12, 2, '#ff3030');
        text(ctx, String(g ? g.score : 0).padStart(7, ' '), 4, 11, '#ffffff');
        text(ctx, 'TOP', W / 2 - 4, 2, '#ff3030', { center: true });
        text(ctx, String(hi).padStart(7, ' '), W / 2 - 32, 11, '#ffffff');
        if (g) text(ctx, 'AREA ' + (g.area + 1), W - 4, 2, '#ffe040', { right: true });
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        const A = g.A;
        drawGround(ctx, g.camY, A.th, A);
        for (const bx of A.boxes) {
          if (bx.taken) continue;
          const x = Math.round(bx.x), y = Math.round(bx.y - g.camY);
          if (y < -10 || y > H) continue;
          ctx.fillStyle = '#5a4a20'; ctx.fillRect(x - 5, y - 4, 10, 8); ctx.fillStyle = '#8a7a40'; ctx.fillRect(x - 4, y - 3, 8, 6);
          ctx.fillStyle = '#2a3a18'; ctx.fillRect(x - 2, y - 2, 2, 4); ctx.fillRect(x + 1, y - 2, 2, 4);
        }
        for (const ne of A.nests) drawNest(ctx, ne);
        drawGate(ctx);
        const list = [];
        for (const o of A.obs) if (o.kind !== 'sand' && o.kind !== 'wall') list.push({ y: o.y + o.h, o });
        for (const e of g.en) list.push({ y: e.y + (e.t === 'truck' ? 16 : 6), e });
        const p = g.p;
        if (g.phase !== 'wait' && g.phase !== 'over' && !p.hidden) list.push({ y: p.y + 6, p: true });
        for (const o of A.obs) if (o.kind === 'sand' || o.kind === 'wall') drawObstacle(ctx, o, A.th);
        list.sort((a, b) => a.y - b.y);
        for (const it of list) {
          if (it.o) drawObstacle(ctx, it.o, A.th);
          else if (it.e) drawEntity(ctx, it.e);
          else {
            if (p.alive) { if (!(p.inv > 0 && (p.inv >> 2) & 1)) drawMan(ctx, p.x, p.y - g.camY, p.dx, p.dy, p.step, PJOE, false); }
            else if (g.phase === 'dead') { const sy = p.y - g.camY; if (g.phaseT > 100) drawMan(ctx, p.x, sy, 0, 1, (frame >> 3), PJOE, false); else drawMan(ctx, p.x, sy, 0, 1, 0, PJOE, true); }
          }
        }
        ctx.fillStyle = '#ffffa0';
        for (const b of g.pb) ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y - g.camY) - 1, 2, 2);
        for (const b of g.eb) { ctx.fillStyle = (frame >> 2) & 1 ? '#ffffff' : '#ff6060'; ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y - g.camY) - 1, 2, 2); }
        if (g.pg) drawGrenadeArc(ctx, g.pg, '#2a4a1a');
        for (const gr of g.eg) drawGrenadeArc(ctx, gr, '#505860');
        for (const b of g.booms) drawBoom(ctx, b);
        for (const q of g.pops) text(ctx, q.n, q.x, Math.round(q.y - g.camY - (50 - q.t) * 0.3), '#ffffff', { center: true });
        hud(ctx);
        // lives and grenades
        for (let i = 0; i < Math.min(6, g.lives - 1); i++) { ctx.fillStyle = PJOE.c; ctx.fillRect(4 + i * 9, H - 10, 6, 6); ctx.fillStyle = PJOE.s; ctx.fillRect(5 + i * 9, H - 14, 4, 4); ctx.fillStyle = PJOE.band; ctx.fillRect(5 + i * 9, H - 13, 4, 1); }
        ctx.fillStyle = '#2a4a1a'; ctx.fillRect(W - 46, H - 12, 6, 8); ctx.fillStyle = '#8a8a8a'; ctx.fillRect(W - 44, H - 14, 2, 2);
        text(ctx, 'x' + String(g.grenades).padStart(2, '0'), W - 36, H - 11, '#ffffff');
        if (g.phase === 'ready') {
          text(ctx, 'AREA ' + (g.area + 1), W / 2, 100, '#ffffff', { center: true, scale: 2 });
          text(ctx, A.th.name, W / 2, 122, '#ffe040', { center: true });
          if ((frame >> 4) & 1) text(ctx, 'GO!', W / 2, 140, '#ff4040', { center: true });
        }
        if (g.phase === 'rush' && g.rush > 0 && (frame >> 4) & 1) text(ctx, 'BREAK THROUGH THE GATE!', W / 2, 60, '#ffffff', { center: true });
        if (g.phase === 'clear') {
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(30, 100, W - 60, 40);
          text(ctx, 'AREA ' + (g.area + 1) + ' CLEAR', W / 2, 108, '#ffe040', { center: true });
          text(ctx, (g.area % 8) === 7 ? 'MISSION ACCOMPLISHED' : 'ADVANCE!', W / 2, 124, '#ffffff', { center: true });
        }
        if (g.phase === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(40, 112, W - 80, 28);
          text(ctx, 'GAME OVER', W / 2, 122, '#ff3030', { center: true });
        }
      }
      function renderTitle(ctx) {
        drawGround(ctx, -demoScroll, THEMES[(titleT / 600 | 0) % 4], null);
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, H);
        hud(ctx);
        const ly = 34;
        text(ctx, 'COMMANDO', W / 2 + 2, ly + 2, '#401000', { center: true, scale: 3 });
        const bands = [[0, 7, '#ffff60'], [7, 14, '#ffc020'], [14, 21, '#ff6010']];
        for (const [a, b, c] of bands) { ctx.save(); ctx.beginPath(); ctx.rect(0, ly + a, W, b - a); ctx.clip(); text(ctx, 'COMMANDO', W / 2, ly, c, { center: true, scale: 3 }); ctx.restore(); }
        const page = (titleT / 420 | 0) % 2;
        if (page === 0) {
          drawMan(ctx, W / 2, 80, 0, -1, (frame >> 3), PJOE, false);
          text(ctx, 'SUPER JOE', W / 2, 92, '#ffffff', { center: true });
          text(ctx, 'BREAK THROUGH ENEMY LINES', W / 2, 110, '#a0e0ff', { center: true });
          text(ctx, 'AND STORM THE FORTRESS', W / 2, 120, '#a0e0ff', { center: true });
          text(ctx, 'RIFLE FIRES THE WAY YOU RUN', W / 2, 140, '#ffffff', { center: true });
          text(ctx, 'X: GRENADE  SPACE: FIRE', W / 2, 150, '#ffffff', { center: true });
          text(ctx, '1ST BONUS 10000 PTS', W / 2, 170, '#ffff60', { center: true });
          text(ctx, 'AND EVERY 50000 PTS', W / 2, 180, '#ffff60', { center: true });
        } else {
          text(ctx, '- SCORE TABLE -', W / 2, 74, '#ffff60', { center: true });
          const rows = [[PSOL, 'SOLDIER', '150'], [PSOL2, 'GRENADIER', '150'], [null, 'BIKE', '500'], [null, 'TRUCK (GRENADE)', '1000'], [PPOW, 'RESCUE POW', '1000'], [POFF, 'OFFICER', '2000']];
          rows.forEach((r, i) => {
            const y = 94 + i * 16;
            if (r[0]) drawMan(ctx, 34, y + 3, 0, 1, 0, r[0], false);
            else { ctx.fillStyle = i === 2 ? '#606a40' : '#4a5a2a'; ctx.fillRect(28, y - 1, 12, 8); }
            text(ctx, r[1], 50, y, '#ffffff'); text(ctx, r[2], W - 16, y, '#ffe040', { right: true });
          });
        }
        if (api.credits === 0 || coinFlash > 0) { if (coinFlash > 0 ? (coinFlash >> 2) & 1 : (frame >> 5) & 1) text(ctx, 'INSERT COIN', W / 2, 206, '#ff3030', { center: true }); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START BUTTON', W / 2, 206, '#ffffff', { center: true });
        text(ctx, '\u00a9 CAPCOM 1985', W / 2, 226, '#ffffff', { center: true });
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 9, '#ffffff');
      }
      return { update, render, destroy() { } };
    }
  });
})();
