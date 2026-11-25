// Star Trek: Strategic Operations Simulator (Sega, 1983) \u2014 from-scratch vector recreation for the MAME32 Game Room.
// Tactical overhead scanner + first-person viewscreen; phasers, photon torpedoes, warp, starbase docking, Klingons, Nomad.
(function () {
  'use strict';
  // ---------- stroke font (4x6 grid) ----------
  const VF = {
    A: '0602204246 0343', B: '003041423303 334445360600', C: '40000646', D: '00304244360600',
    E: '40000646 0333', F: '400006 0333', G: '400006464323', H: '0006 4046 0343', I: '0040 2026 0646',
    J: '40460604', K: '0006 400346', L: '000646', M: '0600224046', N: '06004640', O: '0040460600',
    P: '0600404303', Q: '0040460600 2446', R: '0600404303 1346', S: '400003434606', T: '0040 2026',
    U: '00064640', V: '002640', W: '0006244640', X: '0046 4006', Y: '002240 2226', Z: '00400646',
    '0': '0040460600', '1': '2026', '2': '004043030646', '3': '00404606 0343', '4': '000343 4046',
    '5': '400003434606', '6': '0006464303', '7': '004046', '8': '0040460600 0343', '9': '4303004046',
    '-': '0343', '.': '2526', ':': '2122 2425', '!': '2024 2526', '/': '4006', '=': '0242 0444',
    "'": '2022', ',': '2516', '?': '0040432324 2526', '(': '30121436', ')': '10323416', '>': '004306', '<': '400346'
  };
  function vtext(ctx, str, x, y, sc, align) {
    str = String(str).toUpperCase();
    const adv = 6 * sc, w = str.length * adv - 2 * sc;
    if (align === 'center') x -= w / 2; else if (align === 'right') x -= w;
    for (const ch of str) {
      const g = VF[ch];
      if (g) for (const st of g.split(' ')) {
        for (let i = 0; i < st.length; i += 2) {
          const px = x + (+st[i]) * sc, py = y + (+st[i + 1]) * sc;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        if (st.length === 2) ctx.lineTo(x + (+st[0]) * sc + 0.5, y + (+st[1]) * sc);
      }
      x += adv;
    }
  }
  function vt(ctx, str, x, y, sc, col, align, lw) {
    ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = lw || 1.4; vtext(ctx, str, x, y, sc, align); ctx.stroke();
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
  const pad = (n, l) => String(Math.floor(n)).padStart(l, '0');
  const TAU = Math.PI * 2;
  const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

  const W = 640, H = 480, SZ = 3200;
  const TAC = { x: 160, y: 10, w: 470, h: 290, cx: 395, cy: 155, sc: 0.62 };
  const VIEW = { x: 160, y: 310, w: 470, h: 160, cx: 395, cy: 390, f: 240 };
  const RAD = { cx: 80, cy: 392, r: 66, sc: 66 / 1500 };
  const wrapD = d => { d = (d + SZ / 2) % SZ; if (d < 0) d += SZ; return d - SZ / 2; };
  const wrapP = v => ((v % SZ) + SZ) % SZ;

  // top-view line shapes (x forward, y right), unit ~ world units
  const SH_KLING = [[[12, 0], [6, -3], [0, -3], [-6, -14], [-9, -14], [-4, 0], [-9, 14], [-6, 14], [0, 3], [6, 3], [12, 0]]];
  const SH_NOMAD = [[[8, -4], [8, 4], [-8, 4], [-8, -4], [8, -4]], [[8, 0], [14, 0]], [[-8, -4], [-12, -8]], [[-8, 4], [-12, 8]]];

  ArcadeRegistry.register({
    id: 'startrek', title: 'Star Trek: Strategic Operations Simulator', year: 1983, maker: 'Sega',
    width: W, height: H, vector: true, pointer: false,
    controls: 'Left/Right: rotate \u00b7 Up: impulse \u00b7 Space: phasers \u00b7 X: photon torpedo \u00b7 Down/Z: warp \u00b7 Enter: start',
    marquee: { bg: '#000814', fg: '#40c0ff', accent: '#ffd040' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(20000);
      let mode = 'attract', at = 0, coinFlash = 0, frame = 0, lastCred = api.credits;
      let g = null;
      const vstars = [];
      for (let i = 0; i < 90; i++) vstars.push({ az: rnd(0, TAU), el: rnd(-0.32, 0.32) });

      const S = {
        phaser() { au.tone(1800, 0.25, { type: 'sawtooth', vol: 0.07, slideTo: 600 }); au.tone(1200, 0.25, { type: 'square', vol: 0.04, slideTo: 2400 }); },
        torp() { au.tone(220, 0.4, { type: 'sine', vol: 0.15, slideTo: 880 }); au.tone(440, 0.4, { type: 'triangle', vol: 0.08, slideTo: 110 }); },
        boom() { au.noise(0.6, { vol: 0.22, freq: 1500, slideTo: 60 }); },
        big() { au.noise(1.4, { vol: 0.28, freq: 900, slideTo: 30 }); au.tone(90, 1.2, { type: 'sawtooth', vol: 0.1, slideTo: 25 }); },
        hit() { au.noise(0.2, { vol: 0.18, freq: 3000, slideTo: 300 }); au.tone(160, 0.2, { type: 'square', vol: 0.08 }); },
        bolt() { au.tone(600, 0.12, { type: 'square', vol: 0.05, slideTo: 200 }); },
        warp() { au.tone(80, 0.8, { type: 'sawtooth', vol: 0.1, slideTo: 1600 }); au.noise(0.8, { vol: 0.08, freq: 400, slideTo: 4000 }); },
        alert() { au.tone(700, 0.18, { type: 'square', vol: 0.07, slideTo: 500 }); },
        dock() { au.melody([[523, .12], [659, .12], [784, .12], [1047, .3]], { type: 'triangle', vol: 0.12 }); },
        clear() { au.melody([[392, .15], [523, .15], [659, .15], [784, .15], [1047, .4]], { type: 'triangle', vol: 0.12 }); },
        start() { au.melody([[392, .25], [523, .12], [698, .5], [659, .25], [523, .18], [440, .18], [587, .5]], { type: 'triangle', vol: 0.12 }); },
        extra() { au.melody([[1047, .08], [1319, .08], [1568, .16]], { type: 'square', vol: 0.08 }); },
        klaxon() { au.tone(420, 0.3, { type: 'sawtooth', vol: 0.06, slideTo: 300 }); }
      };

      // ---------- game state ----------
      function newGame(demo) {
        g = { demo, score: 0, ships: 3, sector: 0, nextExtra: 40000, msg: '', msgT: 0, phase: 'play', phaseT: 0, fx: [] };
        nextSector();
        if (!demo) S.start();
      }
      function resetShip() {
        g.ent = { x: SZ / 2, y: SZ / 2, a: -Math.PI / 2, vx: 0, vy: 0, shields: 100, photons: 5, warp: 100, warpT: 0, cd: 0, beamT: 0, beamLen: 0, dockT: 0, alive: true, deadT: 0, inv: 120 };
      }
      function nextSector() {
        g.sector++;
        const n = g.sector;
        resetShip();
        g.kTotal = 3 + Math.min(12, n * 2 - 1);
        g.kLeft = g.kTotal; g.kSpawned = 0;
        g.kl = []; g.saucers = []; g.mines = []; g.torps = []; g.bolts = [];
        g.nomad = n % 3 === 0 ? { x: wrapP(g.ent.x + rnd(-900, 900)), y: wrapP(g.ent.y - 900), vx: 1, vy: 0, hp: 3, cd: 120, t: 0 } : null;
        const ba = rnd(0, TAU);
        g.base = { x: wrapP(g.ent.x + Math.cos(ba) * 700), y: wrapP(g.ent.y + Math.sin(ba) * 700), hp: 4, alive: true, used: false, rot: 0 };
        g.spawnT = 90; g.saucerT = 600;
        g.phase = 'intro'; g.phaseT = 150;
        g.msg = 'SECTOR ' + n; g.msgT = 150;
      }
      function addScore(n) {
        if (g.demo) return;
        g.score += n;
        if (g.score >= g.nextExtra) { g.ships++; g.nextExtra += 40000; S.extra(); }
        if (g.score > hi) hi = g.score;
      }
      function boom(x, y, r, col, n) {
        g.fx.push({ x, y, t: 0, r, col, parts: Array.from({ length: n || 12 }, () => ({ a: rnd(0, TAU), s: rnd(0.5, 2.5) * r / 20, rot: rnd(0, 6) })) });
      }
      function say(m, t) { g.msg = m; g.msgT = t || 120; }
      function rel(o) { return { dx: wrapD(o.x - g.ent.x), dy: wrapD(o.y - g.ent.y) }; }
      function damage(n) {
        const e = g.ent;
        if (g.demo || !e.alive || e.inv > 0) return;
        e.shields -= n; S.hit();
        if (e.shields < 30 && e.shields + n >= 30) { say('SHIELDS LOW', 120); S.klaxon(); }
        if (e.shields <= 0) {
          e.shields = 0; e.alive = false; e.deadT = 180; boom(e.x, e.y, 70, '#ffd040', 28); boom(e.x, e.y, 40, '#40c0ff', 16); S.big();
          for (const s of g.saucers) s.att = false;
        }
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 360;
      }
      function shipLost() {
        g.ships--;
        if (g.ships > 0) { const keepX = g.ent.x, keepY = g.ent.y; resetShip(); g.ent.x = keepX; g.ent.y = keepY; g.bolts = []; say('ENTERPRISE READY', 120); return; }
        if (api.offerContinue && !g.demo) {
          g.phase = 'wait';
          const cg = g;
          api.offerContinue(() => { if (g === cg) { g.ships = 3; g.score = 0; const kx = g.ent.x, ky = g.ent.y; resetShip(); g.ent.x = kx; g.ent.y = ky; g.phase = 'play'; } }, () => { if (g === cg) gameOver(); });
        } else gameOver();
      }

      // ---------- demo autopilot ----------
      function aiInput() {
        const e = g.ent;
        let tgt = null, bd = 1e9;
        for (const k of g.kl) { const r = rel(k), d = Math.hypot(r.dx, r.dy); if (d < bd) { bd = d; tgt = r; } }
        if (!tgt && g.nomad) { tgt = rel(g.nomad); bd = Math.hypot(tgt.dx, tgt.dy); }
        const inp = { left: false, right: false, thrust: false, phaser: false, torp: false, warp: false };
        if (tgt) {
          const da = angDiff(Math.atan2(tgt.dy, tgt.dx), e.a);
          inp.left = da < -0.05; inp.right = da > 0.05;
          inp.thrust = bd > 260 && Math.abs(da) < 0.5;
          inp.phaser = Math.abs(da) < 0.12 && bd < 320;
          inp.torp = Math.abs(da) < 0.08 && bd > 320 && bd < 600 && frame % 90 === 0;
        }
        return inp;
      }

      // ---------- update ----------
      function updShip(inp) {
        const e = g.ent;
        if (!e.alive) { if (--e.deadT <= 0) shipLost(); return; }
        if (e.inv > 0) e.inv--;
        if (inp.left) e.a -= 0.055; if (inp.right) e.a += 0.055;
        const ca = Math.cos(e.a), sa = Math.sin(e.a);
        if (e.warpT > 0) {
          e.warpT--; e.vx = ca * 11; e.vy = sa * 11;
          if (e.warpT === 0) { e.vx = ca * 2; e.vy = sa * 2; }
        } else {
          if (inp.thrust) { e.vx += ca * 0.07; e.vy += sa * 0.07; if (frame % 6 === 0 && !g.demo) au.tone(70, 0.1, { type: 'sawtooth', vol: 0.035 }); }
          e.vx *= 0.985; e.vy *= 0.985;
          const sp = Math.hypot(e.vx, e.vy); if (sp > 3.2) { e.vx *= 3.2 / sp; e.vy *= 3.2 / sp; }
        }
        e.x = wrapP(e.x + e.vx); e.y = wrapP(e.y + e.vy);
        if (inp.warp && e.warpT === 0 && e.warp >= 25) {
          e.warp -= 25; e.warpT = 34; S.warp();
          for (const s of g.saucers) if (s.att) { s.att = false; s.vx = -ca * 3; s.vy = -sa * 3; s.stun = 90; }
        }
        // phasers
        if (e.cd > 0) e.cd--;
        if (e.beamT > 0) e.beamT--;
        if (inp.phaser && e.cd === 0) { firePhaser(); e.cd = 16; }
        if (inp.torp && e.photons > 0 && g.torps.length < 2) {
          e.photons--;
          g.torps.push({ x: e.x + ca * 16, y: e.y + sa * 16, vx: ca * 7 + e.vx, vy: sa * 7 + e.vy, t: 85 });
          S.torp();
        }
        // docking
        const b = g.base;
        if (b.alive && !b.used) {
          const r = rel(b), d = Math.hypot(r.dx, r.dy);
          if (d < 46 && Math.hypot(e.vx, e.vy) < 1.6 && e.warpT === 0) {
            e.dockT++;
            e.vx *= 0.9; e.vy *= 0.9;
            if (e.dockT === 1) say('DOCKING', 90);
            if (e.dockT >= 90) {
              b.used = true; e.shields = 100; e.photons = 5; e.warp = 100; e.dockT = 0;
              for (const s of g.saucers) s.dead = true;
              addScore(1000 + g.sector * 500); say('DOCKED - SHIP REPLENISHED', 150); S.dock();
            }
          } else e.dockT = 0;
        }
        if (e.shields < 30 && frame % 90 === 0 && !g.demo) S.alert();
      }
      function firePhaser() {
        const e = g.ent, ca = Math.cos(e.a), sa = Math.sin(e.a), RANGE = 330;
        let best = null, bt = RANGE;
        const test = (o, r, kind) => {
          const q = rel(o);
          const t = q.dx * ca + q.dy * sa, p = Math.abs(-q.dx * sa + q.dy * ca);
          if (t > 0 && t < bt && p < r) { bt = t; best = { o, kind }; }
        };
        for (const k of g.kl) test(k, 16, 'k');
        for (const s of g.saucers) if (!s.att) test(s, 10, 's');
        for (const m of g.mines) test(m, 9, 'm');
        if (g.nomad) test(g.nomad, 14, 'n');
        e.beamT = 8; e.beamLen = bt;
        if (!g.demo) S.phaser();
        if (best) hitObj(best.o, best.kind, 1);
      }
      function hitObj(o, kind, dmg) {
        if (kind === 'k') {
          o.hp -= dmg;
          if (o.hp <= 0) { o.dead = true; g.kLeft--; boom(o.x, o.y, 40, '#40ff60', 14); S.boom(); addScore(500 + 50 * Math.min(10, g.sector)); }
          else { o.flash = 10; S.hit(); }
        } else if (kind === 's') { o.dead = true; boom(o.x, o.y, 20, '#ff60ff', 8); S.boom(); addScore(300); }
        else if (kind === 'm') { o.dead = true; boom(o.x, o.y, 16, '#ffd040', 6); S.boom(); addScore(100); }
        else if (kind === 'n') {
          o.hp -= dmg; o.flash = 12;
          if (o.hp <= 0) { boom(o.x, o.y, 60, '#ffffff', 22); S.big(); addScore(2000); g.nomad = null; say('NOMAD DESTROYED', 120); }
          else S.hit();
        }
      }
      function fireBolt(from, tx, ty, sp) {
        const dx = wrapD(tx - from.x), dy = wrapD(ty - from.y), d = Math.hypot(dx, dy) || 1;
        g.bolts.push({ x: from.x, y: from.y, vx: dx / d * sp, vy: dy / d * sp, t: Math.ceil(Math.min(600, d + 120) / sp), alt: from.alt || 0 });
        if (!g.demo) S.bolt();
      }
      function updEnemies() {
        const e = g.ent, n = g.sector;
        // spawn Klingons (warp in)
        const maxOn = Math.min(5, 2 + Math.floor(n / 2));
        if (g.kSpawned < g.kTotal && g.kl.length < maxOn && --g.spawnT <= 0) {
          g.spawnT = Math.max(60, 200 - n * 12);
          const a = rnd(0, TAU), d = rnd(650, 900);
          g.kl.push({ x: wrapP(e.x + Math.cos(a) * d), y: wrapP(e.y + Math.sin(a) * d), vx: 0, vy: 0, a: a + Math.PI, hp: n >= 3 ? 2 : 1, cd: rnd(80, 160), t: 0, orbit: Math.random() < 0.5 ? 1 : -1, alt: rnd(-40, 40), goBase: Math.random() < 0.25 + n * 0.03, flash: 0 });
          g.kSpawned++;
          boom(g.kl[g.kl.length - 1].x, g.kl[g.kl.length - 1].y, 18, '#ffffff', 6);
        }
        const kSpeed = 1.5 + Math.min(1.5, n * 0.12);
        for (const k of g.kl) {
          k.t++; if (k.flash > 0) k.flash--;
          let tx = e.x, ty = e.y, R = 230;
          const b = g.base;
          if (k.goBase && b.alive) { tx = b.x; ty = b.y; R = 150; }
          const dx = wrapD(tx - k.x), dy = wrapD(ty - k.y), d = Math.hypot(dx, dy) || 1;
          let ax = dx / d, ay = dy / d;
          if (d < R + 50) { const ox = -ay * k.orbit, oy = ax * k.orbit, push = d < R - 60 ? -0.8 : 0.1; ax = ox + ax * push; ay = oy + ay * push; }
          k.vx += (ax * kSpeed - k.vx) * 0.04; k.vy += (ay * kSpeed - k.vy) * 0.04;
          k.x = wrapP(k.x + k.vx); k.y = wrapP(k.y + k.vy);
          k.a = Math.atan2(k.vy, k.vx);
          if (--k.cd <= 0) {
            k.cd = Math.max(55, 150 - n * 9) + rnd(0, 60);
            if (k.goBase && b.alive && d < 320) fireBolt(k, b.x, b.y, 3.5);
            else { const r = rel(k); if (Math.hypot(r.dx, r.dy) < 480 && e.alive) fireBolt(k, e.x + e.vx * 20, e.y + e.vy * 20, 3.6 + n * 0.12); }
          }
          if (e.alive) { const r = rel(k); if (Math.hypot(r.dx, r.dy) < 20) { k.dead = true; g.kLeft--; boom(k.x, k.y, 40, '#40ff60', 14); S.boom(); damage(30); } }
        }
        g.kl = g.kl.filter(k => !k.dead);
        // anti-matter saucers
        if (n >= 2 && --g.saucerT <= 0) {
          g.saucerT = Math.max(300, 900 - n * 60);
          const cnt = Math.min(3, 1 + Math.floor(n / 3));
          for (let i = 0; i < cnt; i++) { const a = rnd(0, TAU); g.saucers.push({ x: wrapP(e.x + Math.cos(a) * 700), y: wrapP(e.y + Math.sin(a) * 700), vx: 0, vy: 0, att: false, off: rnd(0, TAU), stun: 0 }); }
          say('ANTI-MATTER SAUCERS', 100);
        }
        for (const s of g.saucers) {
          if (s.att) { s.x = wrapP(e.x + Math.cos(s.off) * 14); s.y = wrapP(e.y + Math.sin(s.off) * 14); s.off += 0.05; if (!g.demo) e.shields -= 0.06; if (e.shields <= 0) damage(1); continue; }
          if (s.stun > 0) { s.stun--; s.x = wrapP(s.x + s.vx); s.y = wrapP(s.y + s.vy); continue; }
          const r = rel(s), d = Math.hypot(r.dx, r.dy) || 1;
          s.vx += (-r.dx / d * 2.2 - s.vx) * 0.05; s.vy += (-r.dy / d * 2.2 - s.vy) * 0.05;
          s.x = wrapP(s.x + s.vx); s.y = wrapP(s.y + s.vy);
          if (d < 16 && e.alive && e.inv === 0) { s.att = true; say('SAUCER ATTACHED - WARP OR DOCK', 120); S.hit(); }
        }
        g.saucers = g.saucers.filter(s => !s.dead);
        // Nomad lays mines
        const nm = g.nomad;
        if (nm) {
          nm.t++; if (nm.flash > 0) nm.flash--;
          if (nm.t % 120 === 0) { const a = rnd(0, TAU); nm.vx = Math.cos(a) * 1.4; nm.vy = Math.sin(a) * 1.4; }
          const r = rel(nm), d = Math.hypot(r.dx, r.dy);
          if (d > 700) { nm.vx -= r.dx / d * 0.05; nm.vy -= r.dy / d * 0.05; }
          nm.x = wrapP(nm.x + nm.vx); nm.y = wrapP(nm.y + nm.vy);
          if (--nm.cd <= 0) { nm.cd = Math.max(70, 150 - n * 5); if (g.mines.length < 14) g.mines.push({ x: nm.x, y: nm.y, t: 0 }); }
          if (d < 20 && e.alive) damage(2);
        }
        for (const m of g.mines) {
          m.t++;
          const r = rel(m); if (Math.hypot(r.dx, r.dy) < 14 && e.alive) { m.dead = true; boom(m.x, m.y, 30, '#ffd040', 10); S.boom(); damage(25); }
        }
        g.mines = g.mines.filter(m => !m.dead);
        // enemy bolts
        for (const b of g.bolts) {
          b.x = wrapP(b.x + b.vx); b.y = wrapP(b.y + b.vy); b.t--;
          const r = rel(b);
          if (e.alive && Math.hypot(r.dx, r.dy) < 13) { b.t = 0; boom(b.x, b.y, 10, '#ff4040', 5); damage(10 + Math.min(6, n)); continue; }
          const bs = g.base;
          if (bs.alive && Math.hypot(wrapD(b.x - bs.x), wrapD(b.y - bs.y)) < 22) {
            b.t = 0; bs.hp--; boom(b.x, b.y, 12, '#ff4040', 5);
            if (bs.hp === 2) say('STARBASE UNDER ATTACK', 120);
            if (bs.hp <= 0) { bs.alive = false; boom(bs.x, bs.y, 80, '#ffffff', 30); S.big(); say('STARBASE DESTROYED', 150); for (const k of g.kl) k.goBase = false; }
          }
        }
        g.bolts = g.bolts.filter(b => b.t > 0);
        // player torpedoes
        for (const t of g.torps) {
          t.x = wrapP(t.x + t.vx); t.y = wrapP(t.y + t.vy); t.t--;
          let hit = t.t <= 0;
          const near = (o, r) => Math.hypot(wrapD(o.x - t.x), wrapD(o.y - t.y)) < r;
          if (!hit) for (const k of g.kl) if (near(k, 18)) hit = true;
          if (!hit && g.nomad && near(g.nomad, 18)) hit = true;
          for (const s of g.saucers) if (!s.att && near(s, 14)) hit = true;
          if (hit) {
            t.t = 0; boom(t.x, t.y, 55, '#ff8040', 16); S.boom();
            for (const k of g.kl) if (!k.dead && near(k, 60)) hitObj(k, 'k', 9);
            for (const s of g.saucers) if (!s.att && !s.dead && near(s, 60)) hitObj(s, 's', 9);
            for (const m of g.mines) if (!m.dead && near(m, 60)) hitObj(m, 'm', 9);
            if (g.nomad && near(g.nomad, 60)) hitObj(g.nomad, 'n', 3);
            if (g.base.alive && near(g.base, 50)) { g.base.hp -= 2; if (g.base.hp <= 0) { g.base.alive = false; boom(g.base.x, g.base.y, 80, '#ffffff', 30); say('STARBASE DESTROYED', 150); } }
          }
        }
        g.torps = g.torps.filter(t => t.t > 0);
        g.kl = g.kl.filter(k => !k.dead);
        g.saucers = g.saucers.filter(s => !s.dead);
        g.mines = g.mines.filter(m => !m.dead);
        g.base.rot += 0.01;
        // sector clear?
        if (g.kLeft <= 0 && !g.nomad && g.ent.alive) {
          const e2 = g.ent;
          const bonus = g.sector * 1000 + Math.round(e2.shields) * 10 + e2.photons * 100;
          addScore(bonus); g.lastBonus = bonus;
          g.phase = 'clear'; g.phaseT = 240; if (!g.demo) S.clear();
        }
      }
      function update() {
        frame++;
        if (api.credits > lastCred) au.tone(1760, 0.06, { type: 'square', vol: 0.07, slideTo: 2640 });
        lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'attract') {
          at++;
          const ph = attractPhase();
          if (ph === 1) { if (!g) newGame(true); stepGame(); } else g = null;
          if (at >= 2100) at = 0;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { mode = 'game'; newGame(false); }
            else { coinFlash = 90; au.tone(90, 0.3, { type: 'square', vol: 0.14 }); }
          }
          return;
        }
        stepGame();
      }
      function attractPhase() { return at < 600 ? 0 : at < 1500 ? 1 : 2; }
      function stepGame() {
        for (const f of g.fx) f.t++;
        g.fx = g.fx.filter(f => f.t < 60);
        if (g.msgT > 0) g.msgT--;
        if (g.phase === 'wait') return;
        if (g.phase === 'over') { if (--g.phaseT <= 0 || (g.phaseT < 240 && api.anyPressed('Enter'))) { mode = 'attract'; at = 0; g = null; } return; }
        if (g.phase === 'intro') { if (--g.phaseT <= 0) g.phase = 'play'; return; }
        if (g.phase === 'clear') {
          g.phaseT--;
          g.ent.x = wrapP(g.ent.x + Math.cos(g.ent.a) * Math.max(0, (180 - g.phaseT) * 0.15));
          g.ent.y = wrapP(g.ent.y + Math.sin(g.ent.a) * Math.max(0, (180 - g.phaseT) * 0.15));
          if (g.phaseT === 150 && !g.demo) S.warp();
          if (g.phaseT <= 0) nextSector();
          return;
        }
        let inp;
        if (g.demo) inp = aiInput();
        else inp = { left: api.key('ArrowLeft'), right: api.key('ArrowRight'), thrust: api.key('ArrowUp'), phaser: api.key('Space'), torp: api.pressed('KeyX'), warp: api.pressed('ArrowDown') || api.pressed('KeyZ') };
        updShip(inp);
        updEnemies();
      }

      // ---------- rendering ----------
      function shape(ctx, lines, x, y, a, sc) {
        const ca = Math.cos(a), sa = Math.sin(a);
        for (const l of lines) {
          for (let i = 0; i < l.length; i++) {
            const px = x + (l[i][0] * ca - l[i][1] * sa) * sc, py = y + (l[i][0] * sa + l[i][1] * ca) * sc;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
        }
      }
      function drawEnterpriseTop(ctx, x, y, a, sc, col) {
        const ca = Math.cos(a), sa = Math.sin(a);
        const P = (fx, fy) => [x + (fx * ca - fy * sa) * sc, y + (fx * sa + fy * ca) * sc];
        ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = 1.5;
        const c = P(9, 0); ctx.moveTo(c[0] + 9 * sc, c[1]); ctx.arc(c[0], c[1], 9 * sc, 0, TAU);
        let p = P(2, 0); ctx.moveTo(p[0], p[1]); p = P(-4, 0); ctx.lineTo(p[0], p[1]);
        shape(ctx, [[[-3, -2], [-12, -2], [-12, 2], [-3, 2], [-3, -2]], [[-6, -2], [-10, -7]], [[-6, 2], [-10, 7]], [[-6, -9], [-18, -9]], [[-6, 9], [-18, 9]]], x, y, a, sc);
        ctx.stroke();
      }
      function drawBase(ctx, x, y, rot, sc, col) {
        ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = 1.4;
        ctx.moveTo(x + 18 * sc, y); ctx.arc(x, y, 18 * sc, 0, TAU);
        ctx.moveTo(x + 7 * sc, y); ctx.arc(x, y, 7 * sc, 0, TAU);
        for (let i = 0; i < 4; i++) { const a = rot + i * Math.PI / 2; ctx.moveTo(x + Math.cos(a) * 7 * sc, y + Math.sin(a) * 7 * sc); ctx.lineTo(x + Math.cos(a) * 26 * sc, y + Math.sin(a) * 26 * sc); }
        ctx.stroke();
      }
      function star(ctx, x, y, r) { ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.moveTo(x - r * 0.7, y - r * 0.7); ctx.lineTo(x + r * 0.7, y + r * 0.7); ctx.moveTo(x + r * 0.7, y - r * 0.7); ctx.lineTo(x - r * 0.7, y + r * 0.7); }
      function frameRect(ctx, r, col) { ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.rect(r.x, r.y, r.w, r.h); ctx.stroke(); }
      function drawTactical(ctx) {
        const T = TAC, e = g.ent;
        ctx.save(); ctx.beginPath(); ctx.rect(T.x, T.y, T.w, T.h); ctx.clip();
        // grid dots fixed to the sector
        ctx.fillStyle = '#204060';
        const gs = 120, ox = ((-e.x * T.sc) % (gs * T.sc)), oy = ((-e.y * T.sc) % (gs * T.sc));
        for (let x = T.x + ((T.cx - T.x + ox) % (gs * T.sc)); x < T.x + T.w; x += gs * T.sc) for (let y = T.y + ((T.cy - T.y + oy) % (gs * T.sc)); y < T.y + T.h; y += gs * T.sc) ctx.fillRect(x, y, 1.5, 1.5);
        const toS = o => { const r = rel(o); return [T.cx + r.dx * T.sc, T.cy + r.dy * T.sc]; };
        // starbase
        if (g.base.alive) { const p = toS(g.base); drawBase(ctx, p[0], p[1], g.base.rot, T.sc * 1.3, g.base.used ? '#406080' : '#40c0ff'); if (e.dockT > 0 && (frame & 8)) vt(ctx, 'DOCKING', p[0], p[1] + 26, 1.6, '#40c0ff', 'center'); }
        // mines
        ctx.beginPath(); ctx.strokeStyle = '#ffd040'; ctx.lineWidth = 1.2;
        for (const m of g.mines) { const p = toS(m); star(ctx, p[0], p[1], 4 + ((m.t >> 3) & 1)); }
        ctx.stroke();
        // nomad
        if (g.nomad) { const p = toS(g.nomad); ctx.beginPath(); ctx.strokeStyle = g.nomad.flash & 2 ? '#ffffff' : '#ff9040'; ctx.lineWidth = 1.5; shape(ctx, SH_NOMAD, p[0], p[1], g.nomad.t * 0.02, T.sc * 1.2); ctx.stroke(); }
        // klingons
        for (const k of g.kl) { const p = toS(k); ctx.beginPath(); ctx.strokeStyle = k.flash & 2 ? '#ffffff' : '#40ff60'; ctx.lineWidth = 1.5; shape(ctx, SH_KLING, p[0], p[1], k.a, T.sc * 1.3); ctx.stroke(); }
        // saucers
        ctx.beginPath(); ctx.strokeStyle = '#ff60ff'; ctx.lineWidth = 1.3;
        for (const s of g.saucers) { const p = toS(s); const r = 5; ctx.moveTo(p[0] + r, p[1]); ctx.ellipse(p[0], p[1], r, r * 0.5, 0, 0, TAU); const a = frame * 0.3; ctx.moveTo(p[0] + Math.cos(a) * r, p[1] + Math.sin(a) * r * 0.5); ctx.lineTo(p[0] - Math.cos(a) * r, p[1] - Math.sin(a) * r * 0.5); }
        ctx.stroke();
        // bolts & torps
        ctx.fillStyle = '#ff4040'; for (const b of g.bolts) { const p = toS(b); ctx.fillRect(p[0] - 1.5, p[1] - 1.5, 3, 3); }
        ctx.beginPath(); ctx.strokeStyle = '#ffa040'; for (const t of g.torps) { const p = toS(t); star(ctx, p[0], p[1], 4); } ctx.stroke();
        // enterprise
        if (e.alive && (e.inv === 0 || (frame & 4))) {
          drawEnterpriseTop(ctx, T.cx, T.cy, e.a, T.sc * 1.3, '#ffffff');
          if (e.beamT > 0) {
            ctx.beginPath(); ctx.strokeStyle = e.beamT & 2 ? '#ff4040' : '#ffd040'; ctx.lineWidth = 2;
            const ca = Math.cos(e.a), sa = Math.sin(e.a);
            ctx.moveTo(T.cx + ca * 14 * T.sc, T.cy + sa * 14 * T.sc); ctx.lineTo(T.cx + ca * e.beamLen * T.sc, T.cy + sa * e.beamLen * T.sc); ctx.stroke();
          }
          if (e.warpT > 0) { ctx.beginPath(); ctx.strokeStyle = '#80c0ff'; for (let i = 0; i < 6; i++) { const ang = e.a + Math.PI + rnd(-0.4, 0.4); ctx.moveTo(T.cx + Math.cos(ang) * 14, T.cy + Math.sin(ang) * 14); ctx.lineTo(T.cx + Math.cos(ang) * rnd(30, 60), T.cy + Math.sin(ang) * rnd(30, 60)); } ctx.stroke(); }
        }
        // explosions
        for (const f of g.fx) {
          const p = toS(f); ctx.beginPath(); ctx.strokeStyle = f.t > 40 && (f.t & 2) ? '#804020' : f.col; ctx.lineWidth = 1.3;
          for (const q of f.parts) { const d = q.s * f.t * T.sc * 1.2, x = p[0] + Math.cos(q.a) * d, y = p[1] + Math.sin(q.a) * d; ctx.moveTo(x - Math.cos(q.rot + f.t * 0.2) * 3, y - Math.sin(q.rot + f.t * 0.2) * 3); ctx.lineTo(x + Math.cos(q.rot + f.t * 0.2) * 3, y + Math.sin(q.rot + f.t * 0.2) * 3); }
          if (f.t < 10) { ctx.moveTo(p[0] + f.t * 2, p[1]); ctx.arc(p[0], p[1], f.t * 2, 0, TAU); }
          ctx.stroke();
        }
        ctx.restore();
        frameRect(ctx, T, '#2080c0');
      }
      function drawViewscreen(ctx) {
        const V = VIEW, e = g.ent;
        ctx.save(); ctx.beginPath(); ctx.rect(V.x, V.y, V.w, V.h); ctx.clip();
        // background stars by direction
        ctx.fillStyle = '#c0c8ff';
        for (const s of vstars) {
          const d = angDiff(s.az, e.a);
          if (Math.abs(d) > 1.0) continue;
          const x = V.cx + Math.tan(d) * V.f, y = V.cy + s.el * V.f;
          if (e.warpT > 0) { ctx.beginPath(); ctx.strokeStyle = '#a0c0ff'; ctx.lineWidth = 1; ctx.moveTo(x, y); ctx.lineTo(V.cx + (x - V.cx) * 1.4, V.cy + (y - V.cy) * 1.4); ctx.stroke(); }
          else ctx.fillRect(x, y, 1.5, 1.5);
        }
        const ca = Math.cos(e.a), sa = Math.sin(e.a);
        const objs = [];
        const add = (o, kind, alt) => { const r = rel(o); const f = r.dx * ca + r.dy * sa, l = -r.dx * sa + r.dy * ca; if (f > 20 && f < 1400) objs.push({ o, kind, f, l, alt: alt || 0 }); };
        if (g.base.alive) add(g.base, 'base', 10);
        for (const k of g.kl) add(k, 'k', k.alt);
        for (const s of g.saucers) if (!s.att) add(s, 's', -10);
        for (const m of g.mines) add(m, 'm', 0);
        if (g.nomad) add(g.nomad, 'n', -20);
        for (const b of g.bolts) add(b, 'b', b.alt * 0.5);
        for (const t of g.torps) add(t, 't', 0);
        objs.sort((a, b) => b.f - a.f);
        for (const ob of objs) {
          const x = V.cx + ob.l / ob.f * V.f, y = V.cy - ob.alt / ob.f * V.f + 30 / ob.f * V.f * 0.3, s = V.f / ob.f;
          ctx.beginPath(); ctx.lineWidth = 1.4;
          if (ob.kind === 'k') {
            ctx.strokeStyle = ob.o.flash & 2 ? '#ffffff' : '#40ff60';
            const k = s * 16;
            ctx.moveTo(x - k, y + k * 0.35); ctx.lineTo(x - k * 0.55, y - k * 0.15); ctx.lineTo(x - k * 0.2, y); ctx.lineTo(x + k * 0.2, y); ctx.lineTo(x + k * 0.55, y - k * 0.15); ctx.lineTo(x + k, y + k * 0.35);
            ctx.moveTo(x - k * 0.2, y); ctx.lineTo(x, y - k * 0.35); ctx.lineTo(x + k * 0.2, y);
            ctx.moveTo(x + k * 0.12, y - k * 0.5); ctx.arc(x, y - k * 0.5, k * 0.12, 0, TAU);
            ctx.moveTo(x - k * 0.55, y - k * 0.15); ctx.lineTo(x - k * 0.55, y + k * 0.3); ctx.moveTo(x + k * 0.55, y - k * 0.15); ctx.lineTo(x + k * 0.55, y + k * 0.3);
          } else if (ob.kind === 'base') {
            ctx.strokeStyle = '#40c0ff'; const k = s * 26;
            ctx.moveTo(x + k, y); ctx.ellipse(x, y, k, k * 0.25, 0, 0, TAU);
            ctx.moveTo(x + k * 0.3, y); ctx.arc(x, y, k * 0.3, 0, TAU);
            ctx.moveTo(x, y - k * 0.3); ctx.lineTo(x, y - k * 0.8); ctx.moveTo(x, y + k * 0.3); ctx.lineTo(x, y + k * 0.8);
          } else if (ob.kind === 's') {
            ctx.strokeStyle = '#ff60ff'; const k = s * 8; ctx.moveTo(x + k, y); ctx.ellipse(x, y, k, k * 0.4, 0, 0, TAU); ctx.moveTo(x - k * 0.4, y - k * 0.3); ctx.lineTo(x + k * 0.4, y - k * 0.3);
          } else if (ob.kind === 'm') { ctx.strokeStyle = '#ffd040'; star(ctx, x, y, Math.max(1.5, s * 5)); }
          else if (ob.kind === 'n') { ctx.strokeStyle = ob.o.flash & 2 ? '#ffffff' : '#ff9040'; const k = s * 12; ctx.rect(x - k * 0.5, y - k, k, k * 2); ctx.moveTo(x, y - k); ctx.lineTo(x, y - k * 1.6); ctx.moveTo(x - k * 0.5, y); ctx.lineTo(x - k, y + k * 0.4); ctx.moveTo(x + k * 0.5, y); ctx.lineTo(x + k, y + k * 0.4); }
          else if (ob.kind === 'b') { ctx.strokeStyle = '#ff4040'; const k = Math.max(1.5, s * 4); ctx.moveTo(x - k, y); ctx.lineTo(x + k, y); ctx.moveTo(x, y - k); ctx.lineTo(x, y + k); }
          else if (ob.kind === 't') { ctx.strokeStyle = '#ffa040'; star(ctx, x, y, Math.max(2, s * 6)); }
          ctx.stroke();
        }
        // phaser beams converge on the crosshair
        if (e.alive && e.beamT > 0) {
          ctx.beginPath(); ctx.strokeStyle = e.beamT & 2 ? '#ff4040' : '#ffd040'; ctx.lineWidth = 2;
          ctx.moveTo(V.x + 20, V.y + V.h); ctx.lineTo(V.cx, V.cy); ctx.moveTo(V.x + V.w - 20, V.y + V.h); ctx.lineTo(V.cx, V.cy); ctx.stroke();
        }
        // crosshair
        ctx.beginPath(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
        ctx.moveTo(V.cx - 16, V.cy); ctx.lineTo(V.cx - 6, V.cy); ctx.moveTo(V.cx + 6, V.cy); ctx.lineTo(V.cx + 16, V.cy);
        ctx.moveTo(V.cx, V.cy - 12); ctx.lineTo(V.cx, V.cy - 4); ctx.moveTo(V.cx, V.cy + 4); ctx.lineTo(V.cx, V.cy + 12); ctx.stroke();
        if (!e.alive) { ctx.beginPath(); ctx.strokeStyle = '#ff4040'; for (let i = 0; i < 12; i++) { ctx.moveTo(V.cx, V.cy); ctx.lineTo(V.cx + rnd(-200, 200), V.cy + rnd(-70, 70)); } ctx.stroke(); }
        ctx.restore();
        frameRect(ctx, V, '#2080c0');
      }
      function bar(ctx, x, y, w, h, frac, col) {
        ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.rect(x, y, w, h); ctx.stroke();
        ctx.beginPath(); ctx.lineWidth = 1;
        const n = Math.round(clamp(frac, 0, 1) * (w - 4) / 3);
        for (let i = 0; i < n; i++) { ctx.moveTo(x + 2 + i * 3 + 0.5, y + 2); ctx.lineTo(x + 2 + i * 3 + 0.5, y + h - 2); }
        ctx.stroke();
      }
      function drawPanel(ctx) {
        const e = g.ent;
        const sc = e.shields < 30 && (frame & 16) ? '#ff4040' : '#40ff60';
        vt(ctx, 'SHIELDS', 12, 14, 2, sc); bar(ctx, 12, 30, 136, 12, e.shields / 100, sc);
        vt(ctx, 'PHOTONS', 12, 56, 2, '#ffa040');
        ctx.beginPath(); ctx.strokeStyle = '#ffa040'; ctx.lineWidth = 1.3;
        for (let i = 0; i < 5; i++) { const x = 20 + i * 26, y = 80; if (i < e.photons) star(ctx, x, y, 7); else { ctx.moveTo(x - 2, y); ctx.lineTo(x + 2, y); } }
        ctx.stroke();
        vt(ctx, 'WARP', 12, 98, 2, '#40c0ff'); bar(ctx, 12, 114, 136, 12, e.warp / 100, '#40c0ff');
        vt(ctx, 'SCORE', 12, 142, 2, '#ffd040'); vt(ctx, pad(g.score, 6), 12, 160, 3, '#ffffff');
        vt(ctx, 'SECTOR', 12, 192, 2, '#ffd040'); vt(ctx, String(g.sector), 148, 192, 2, '#ffffff', 'right');
        vt(ctx, 'KLINGONS', 12, 214, 2, '#40ff60'); vt(ctx, String(Math.max(0, g.kLeft)), 148, 214, 2, '#ffffff', 'right');
        if (g.nomad) vt(ctx, 'NOMAD', 12, 236, 2, '#ff9040');
        for (let i = 0; i < Math.min(5, g.ships - 1); i++) drawEnterpriseTop(ctx, 24 + i * 28, 274, -Math.PI / 2, 0.8, '#ffffff');
        vt(ctx, 'HI ' + pad(hi, 6), 12, 300, 1.6, '#808080');
        // long range radar
        ctx.beginPath(); ctx.strokeStyle = '#2080c0'; ctx.lineWidth = 1.2;
        ctx.moveTo(RAD.cx + RAD.r, RAD.cy); ctx.arc(RAD.cx, RAD.cy, RAD.r, 0, TAU);
        ctx.moveTo(RAD.cx - RAD.r, RAD.cy); ctx.lineTo(RAD.cx + RAD.r, RAD.cy); ctx.moveTo(RAD.cx, RAD.cy - RAD.r); ctx.lineTo(RAD.cx, RAD.cy + RAD.r);
        const sw = frame * 0.05; ctx.moveTo(RAD.cx, RAD.cy); ctx.lineTo(RAD.cx + Math.cos(sw) * RAD.r, RAD.cy + Math.sin(sw) * RAD.r);
        ctx.stroke();
        const dot = (o, col, s) => { const r = rel(o); const x = r.dx * RAD.sc, y = r.dy * RAD.sc; if (x * x + y * y < RAD.r * RAD.r) { ctx.fillStyle = col; ctx.fillRect(RAD.cx + x - s / 2, RAD.cy + y - s / 2, s, s); } };
        if (g.base.alive) dot(g.base, '#40c0ff', 5);
        for (const k of g.kl) dot(k, '#40ff60', 3);
        for (const s of g.saucers) dot(s, '#ff60ff', 2);
        if (g.nomad) dot(g.nomad, '#ff9040', 4);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(RAD.cx - 1.5, RAD.cy - 1.5, 3, 3);
        vt(ctx, 'LONG RANGE', RAD.cx, RAD.cy + RAD.r + 6, 1.4, '#2080c0', 'center');
      }
      function drawLogo(ctx, y) {
        vt(ctx, 'STAR TREK', W / 2, y, 9, '#40c0ff', 'center', 2.4);
        vt(ctx, 'STRATEGIC OPERATIONS SIMULATOR', W / 2, y + 66, 2.6, '#ffd040', 'center');
      }
      function attractFooter(ctx) {
        const blink = (frame >> 5) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) vt(ctx, 'INSERT COIN', W / 2, 410, 3, '#ffffff', 'center'); }
        else if (blink) vt(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 410, 3, '#40ff60', 'center');
        vt(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), W / 2, 446, 2, '#808080', 'center');
      }
      function render(ctx) {
        ctx.fillStyle = '#000006'; ctx.fillRect(0, 0, W, H);
        if (mode === 'attract' && !g) {
          const ph = attractPhase();
          drawLogo(ctx, 60);
          drawEnterpriseTop(ctx, W / 2, 210, -Math.PI / 2 + Math.sin(frame * 0.02) * 0.4, 3, '#ffffff');
          if (ph === 0) {
            vt(ctx, 'DESTROY THE KLINGONS IN EACH SECTOR', W / 2, 270, 2, '#ffffff', 'center');
            vt(ctx, 'DOCK AT STARBASE TO REPLENISH', W / 2, 296, 2, '#40c0ff', 'center');
            vt(ctx, 'BEWARE NOMAD AND HIS MINES', W / 2, 322, 2, '#ff9040', 'center');
            vt(ctx, 'KLINGON 500   SAUCER 300   NOMAD 2000', W / 2, 356, 2, '#40ff60', 'center');
          } else {
            vt(ctx, 'HIGH SCORE', W / 2, 286, 3, '#ffd040', 'center');
            vt(ctx, pad(hi, 6), W / 2, 320, 4, '#ffffff', 'center');
            vt(ctx, 'BONUS ENTERPRISE EVERY 40000', W / 2, 366, 2, '#40c0ff', 'center');
          }
          attractFooter(ctx);
          vt(ctx, '1983 SEGA', W - 14, 462, 1.6, '#606060', 'right');
          return;
        }
        drawPanel(ctx);
        drawTactical(ctx);
        drawViewscreen(ctx);
        if (g.msgT > 0 && (g.msgT > 30 || (frame & 4))) vt(ctx, g.msg, TAC.cx, TAC.y + 16, 2.4, '#ffd040', 'center');
        if (g.phase === 'clear') {
          vt(ctx, 'SECTOR ' + g.sector + ' CLEARED', TAC.cx, TAC.cy - 60, 3.2, '#40ff60', 'center');
          vt(ctx, 'BONUS ' + (g.lastBonus || 0), TAC.cx, TAC.cy + 50, 2.6, '#ffffff', 'center');
        }
        if (g.phase === 'over') vt(ctx, 'GAME OVER', TAC.cx, TAC.cy - 20, 5, '#ff4040', 'center', 2);
        if (mode === 'attract') {
          vt(ctx, 'DEMONSTRATION', TAC.cx, TAC.y + 270, 2, '#808080', 'center');
          const blink = (frame >> 5) & 1;
          if (blink) vt(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', VIEW.cx, VIEW.y + 14, 2.4, '#40ff60', 'center');
          if (coinFlash > 0 && ((coinFlash >> 2) & 1)) vt(ctx, 'INSERT COIN', VIEW.cx, VIEW.y + 40, 2.4, '#ffffff', 'center');
          vt(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), VIEW.cx, VIEW.y + VIEW.h - 20, 1.6, '#808080', 'center');
        }
      }
      return { update, render, destroy() { } };
    }
  });
})();
