// Missile Command (Atari, 1980) — faithful browser recreation for Arcade Games Galore.
(function () {
  // ---- compact 5x7 bitmap arcade font ----
  const FK = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-.,:!?=*/'\"<>()+%#@^_~";
  const FD = "ehjlphe4c4444eeh168gvv2421he26aiv22vgu11he68guhhev124888ehhehheehhf12c4ahhvhhuhhuhhuehgggheuhhhhhuvgguggvvggugggfggjhhfhhhvhhhe44444e11111hehikokihggggggvhrllhhhhhpljhhehhhhheuhhugggehhhliduhhukihfgge11uv444444hhhhhhehhhhha4hhhllrhhha4ahhhha4444v1248gv000v00000000cc0000c480cc0cc04444404eh1240400v0v000level001248g04480000aa00000248g842842124824888428422248044v440pq48mj0avaaavaehnlnge4el4444000000vehlplhe";
  const FONT = {};
  for (let i = 0; i < FK.length; i++) { const g = []; for (let r = 0; r < 7; r++) g.push(parseInt(FD[i * 7 + r], 32)); FONT[FK[i]] = g; }
  FONT['©'] = [0x0E, 0x11, 0x17, 0x14, 0x17, 0x11, 0x0E];
  // text(ctx, str, x, y, colour, {scale, adv, center, bold})
  function text(ctx, s, x, y, col, o) {
    o = o || {}; const sc = o.scale || 1, adv = (o.adv || 8) * sc, bw = o.bold ? 2 : 1;
    s = String(s).toUpperCase();
    if (o.center) x = Math.round(x - (s.length * adv - (adv - (4 + bw) * sc)) / 2);
    if (o.right) x = Math.round(x - (s.length * adv - (adv - (4 + bw) * sc)));
    ctx.fillStyle = col;
    for (const ch of s) {
      const g = FONT[ch];
      if (g) for (let r = 0; r < 7; r++) { const b = g[r]; if (b) for (let c = 0; c < 5; c++) if ((b >> (4 - c)) & 1) ctx.fillRect(x + c * sc, y + r * sc, sc * bw, sc); }
      x += adv;
    }
  }
  // build a sprite canvas from rows of chars + palette {char: colour}
  function spr(rows, pal) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
    return c;
  }

  const W = 256, H = 231;
  const GROUND_Y = 212;                       // top of flat ground
  const BASES = [{ x: 16, name: 'ALPHA' }, { x: 128, name: 'DELTA' }, { x: 240, name: 'OMEGA' }];
  const BASE_TOP = 196;
  const CITY_X = [48, 74, 100, 156, 182, 208];

  // wave colour palettes (change every two waves like the cabinet)
  const PALS = [
    { bg: '#000000', ground: '#e8c000', city: '#00a8ff', city2: '#00f0ff', enemy: '#ff2828', abm: '#2850ff', text: '#ff2828', cross: '#2850ff' },
    { bg: '#000000', ground: '#00b0ff', city: '#ffd800', city2: '#ff8000', enemy: '#28ff48', abm: '#ff2828', text: '#28ff48', cross: '#ff2828' },
    { bg: '#000000', ground: '#ff2828', city: '#ffd800', city2: '#ffffff', enemy: '#ffd800', abm: '#28ff48', text: '#ffd800', cross: '#28ff48' },
    { bg: '#000038', ground: '#e8c000', city: '#ff40ff', city2: '#ffffff', enemy: '#00f0ff', abm: '#ff2828', text: '#00f0ff', cross: '#ffffff' },
    { bg: '#002810', ground: '#28ff48', city: '#2850ff', city2: '#ffd800', enemy: '#ff2828', abm: '#ffd800', text: '#ffffff', cross: '#ffd800' },
    { bg: '#300030', ground: '#00b0ff', city: '#28ff48', city2: '#ffffff', enemy: '#ffd800', abm: '#ff40ff', text: '#ffd800', cross: '#ffffff' },
    { bg: '#383800', ground: '#ff8000', city: '#00f0ff', city2: '#ffffff', enemy: '#2850ff', abm: '#ff2828', text: '#2850ff', cross: '#ffffff' },
    { bg: '#200000', ground: '#ffd800', city: '#ff2828', city2: '#00f0ff', enemy: '#ffffff', abm: '#28ff48', text: '#ffffff', cross: '#28ff48' }];

  // ---------------- pixel art ----------------
  const ART = {
    city: [
      '.......A........',
      '.......A....A...',
      '..A...AAA...A...',
      '..A.A.AAA..AAA..',
      '.AAAA.AAAA.AAA.A',
      '.AAAAAAAAAAAAAAA',
      'AABAABABAABABBAA',
      'AAAAAAAAAAAAAAAA'],
    rubble: [
      '................',
      '................',
      '................',
      '................',
      '........A.......',
      '..A..A.AAA..A...',
      '.AAA.AAAAAA.AA..',
      'AAAAAAAAAAAAAAAA'],
    abm: ['.A.', '.A.', 'AAA', 'A.A'],
    cross: ['...A...', '...A...', '...A...', 'AAA.AAA', '...A...', '...A...', '...A...'],
    xmark: ['A...A', '.A.A.', '..A..', '.A.A.', 'A...A'],
    bomber: [
      'AA..............',
      'AAA......AA.....',
      '.AAAAAAAAAAAAA..',
      '.AAAAAAAAAAAAAAA',
      '..AAA....AA.....',
      '.........A......'],
    sat: [
      '..A.......A..',
      '...A.....A...',
      '....AAAAA....',
      'AAA.ABBBA.AAA',
      'AAAAABBBAAAAA',
      'AAA.ABBBA.AAA',
      '....AAAAA....',
      '...A.....A...',
      '..A.......A..'],
    smart: ['...A...', '..ABA..', '.ABBBA.', 'ABBCBBA', '.ABBBA.', '..ABA..', '...A...']
  };
  function mirror(rows) { return rows.map(r => r.split('').reverse().join('')); }
  function buildSet(P) {
    return {
      city: spr(ART.city, { A: P.city, B: P.city2 }),
      rubble: spr(ART.rubble, { A: P.city }),
      abm: spr(ART.abm, { A: P.abm }),
      cross: spr(ART.cross, { A: P.cross }),
      xmark: spr(ART.xmark, { A: P.cross }),
      bomberR: spr(ART.bomber, { A: P.enemy }), bomberL: spr(mirror(ART.bomber), { A: P.enemy }),
      sat: spr(ART.sat, { A: P.enemy, B: P.city2 }),
      smart: [spr(ART.smart, { A: P.enemy, B: P.city2, C: '#ffffff' }), spr(ART.smart, { A: P.city2, B: P.enemy, C: P.enemy })]
    };
  }
  const SETS = PALS.map(buildSet);
  const FLASH = ['#ffffff', '#ff2828', '#ffd800', '#28ff48', '#00f0ff', '#2850ff', '#ff40ff', '#ff8000'];

  function disc(ctx, cx, cy, r) { // crisp pixel disc
    cx = Math.round(cx); cy = Math.round(cy);
    const R = Math.round(r);
    for (let dy = -R; dy <= R; dy++) {
      const q = r * r - dy * dy;
      if (q < 0.6) continue;
      const hw = Math.floor(Math.sqrt(q) + 0.25);
      ctx.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
    }
  }
  function line(ctx, x0, y0, x1, y1) { // 1px Bresenham line
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0;
    while (n++ < 600) {
      ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  ArcadeRegistry.register({
    id: 'missilecommand',
    title: 'Missile Command',
    year: 1980,
    maker: 'Atari',
    width: W, height: H,
    vector: false,
    pointer: true,
    controls: 'Mouse/arrows: aim · Z/X/C (A/S/D): fire Alpha/Delta/Omega · Click/Space: nearest base',
    marquee: { bg: '#000000', fg: '#ff2828', accent: '#e8c000' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(7500);
      let mode = 'title', frame = 0, titleT = 0;
      let g = null;
      let lastMX = -1, lastMY = -1;
      // ---------- coin-op ----------
      let coinOp = false, lastCred = api.credits, coinFlash = 0;
      function pollCoins() {
        const c = api.credits; if (c === 0) coinOp = true;
        if (c > lastCred) au.tone(1175, 0.07, { type: 'square', vol: 0.07, slideTo: 1760 });
        lastCred = c;
      }
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 }); au.tone(73, 0.28, { type: 'sawtooth', vol: 0.08 });
        return false;
      }
      const pushScreen = () => coinOp && api.credits > 0;

      function newGame(demo) {
        g = {
          demo, score: 0, wave: 0, nextBonus: 10000, bonusCities: 0,
          cities: CITY_X.map(x => ({ x, alive: true })),
          bases: BASES.map(b => ({ x: b.x, ammo: 10, alive: true })),
          abms: [], icbms: [], fliers: [], booms: [],
          cx: 128, cy: 100, phase: 'intro', phaseT: 0, msg: null
        };
        startWave();
      }
      function mult() { return Math.min(6, Math.floor(g.wave / 2) + 1); }
      function pal() { return PALS[Math.floor(g.wave / 2) % PALS.length]; }
      function set() { return SETS[Math.floor(g.wave / 2) % SETS.length]; }

      function startWave() {
        // place bonus cities in destroyed slots
        g.newCity = -1;
        while (g.bonusCities > 0) {
          const dead = g.cities.filter(c => !c.alive);
          if (!dead.length) break;
          const c = dead[Math.floor(Math.random() * dead.length)]; c.alive = true; g.bonusCities--; g.newCity = g.cities.indexOf(c);
        }
        for (const b of g.bases) { b.ammo = 10; b.alive = true; }
        const w = g.wave;
        g.toLaunch = Math.min(30, 12 + w * 2);
        g.smartLeft = w >= 5 ? Math.min(7, w - 4) : 0;
        g.fliersLeft = w >= 1 ? Math.min(4, 1 + Math.floor(w / 2)) : 0;
        g.speed = Math.min(1.7, 0.36 + w * 0.13);
        g.launchT = 40; g.flierT = 300;
        g.abms = []; g.icbms = []; g.fliers = []; g.booms = [];
        // only three cities can be targeted per wave
        const alive = g.cities.filter(c => c.alive);
        alive.sort(() => Math.random() - 0.5);
        g.targets = alive.slice(0, 3);
        g.phase = 'intro'; g.phaseT = g.demo ? 30 : 150;
        if (!g.demo) for (let i = 0; i < 6; i++) au.tone(i & 1 ? 660 : 880, 0.22, { type: 'square', vol: 0.05, delay: i * 0.24 });
      }

      // ---------- sounds ----------
      const sfx = {
        launch() { au.noise(0.25, { freq: 1500, slideTo: 5000, vol: 0.08, type: 'bandpass' }); au.tone(300, 0.2, { type: 'sawtooth', slideTo: 900, vol: 0.03 }); },
        boom() { au.noise(0.6, { freq: 1200, slideTo: 80, vol: 0.22 }); },
        bigboom() { au.noise(1.2, { freq: 900, slideTo: 40, vol: 0.35 }); au.tone(90, 0.9, { type: 'sawtooth', slideTo: 30, vol: 0.08 }); },
        empty() { au.tone(180, 0.08, { type: 'square', vol: 0.05 }); },
        tick() { au.tone(1600, 0.03, { type: 'square', vol: 0.04 }); },
        cityTick() { au.tone(520, 0.12, { type: 'square', vol: 0.06 }); au.tone(780, 0.1, { type: 'square', vol: 0.05, delay: 0.06 }); },
        flier() { au.tone(api.frame % 20 < 10 ? 420 : 380, 0.12, { type: 'sawtooth', vol: 0.025 }); }
      };

      function addScore(n) {
        if (g.demo) return;
        g.score += n * mult();
        if (g.score > hi) hi = g.score;
      }

      // ---------- player ----------
      function fireFrom(bi, tx, ty) {
        const b = g.bases[bi];
        if (!b.alive || b.ammo <= 0) { if (!g.demo) sfx.empty(); return false; }
        if (g.abms.length >= 8) return false;
        ty = Math.min(ty, BASE_TOP - 12);
        b.ammo--;
        const sx = b.x, sy = BASE_TOP - 4;
        const d = Math.hypot(tx - sx, ty - sy) || 1;
        const sp = bi === 1 ? 6 : 3.5;
        g.abms.push({ sx, sy, x: sx, y: sy, tx, ty, vx: (tx - sx) / d * sp, vy: (ty - sy) / d * sp, n: Math.ceil(d / sp) });
        if (!g.demo) sfx.launch();
        return true;
      }
      function nearestBase(tx) {
        let best = -1, bd = 1e9;
        g.bases.forEach((b, i) => { if (b.alive && b.ammo > 0) { const d = Math.abs(b.x - tx); if (d < bd) { bd = d; best = i; } } });
        return best;
      }
      function controls() {
        const m = api.mouse;
        if (m.x !== lastMX || m.y !== lastMY) { if (lastMX >= 0) { g.cx = m.x; g.cy = m.y; } lastMX = m.x; lastMY = m.y; }
        const sp = 3;
        if (api.key('ArrowLeft')) g.cx -= sp; if (api.key('ArrowRight')) g.cx += sp;
        if (api.key('ArrowUp')) g.cy -= sp; if (api.key('ArrowDown')) g.cy += sp;
        g.cx = Math.max(4, Math.min(W - 4, g.cx)); g.cy = Math.max(12, Math.min(BASE_TOP - 14, g.cy));
        if (api.pressed('KeyZ') || api.pressed('KeyA')) fireFrom(0, g.cx, g.cy);
        if (api.pressed('KeyX') || api.pressed('KeyS')) fireFrom(1, g.cx, g.cy);
        if (api.pressed('KeyC') || api.pressed('KeyD')) fireFrom(2, g.cx, g.cy);
        if (api.pressed('Space')) { const b = nearestBase(g.cx); if (b >= 0) fireFrom(b, g.cx, g.cy); else sfx.empty(); }
        if (m.clicked) {
          g.cx = Math.max(4, Math.min(W - 4, m.x)); g.cy = Math.max(12, Math.min(BASE_TOP - 14, m.y));
          const b = nearestBase(g.cx); if (b >= 0) fireFrom(b, g.cx, g.cy); else sfx.empty();
        }
      }
      function demoAI() {
        // aim at the lowest incoming warhead now and then
        if (frame % 40 !== 0) return;
        let best = null;
        for (const m of g.icbms) if (!best || m.y > best.y) best = m;
        if (!best || best.y < 40) return;
        const lead = 18;
        const tx = best.x + best.vx * lead, ty = best.y + best.vy * lead;
        const b = nearestBase(tx); if (b >= 0) fireFrom(b, tx, ty);
      }

      // ---------- enemies ----------
      function pickTarget() {
        const r = Math.random();
        const tc = g.targets.filter(c => c.alive);
        if (r < 0.55 && tc.length) { const c = tc[Math.floor(Math.random() * tc.length)]; return { x: c.x + 8, y: GROUND_Y }; }
        if (r < 0.8) { const ab = g.bases.filter(b => b.alive); if (ab.length) { const b = ab[Math.floor(Math.random() * ab.length)]; return { x: b.x, y: BASE_TOP }; } }
        for (let k = 0; k < 20; k++) {
          const x = 8 + Math.random() * (W - 16);
          if (!g.cities.some(c => c.alive && g.targets.indexOf(c) < 0 && x >= c.x - 4 && x <= c.x + 20)) return { x, y: GROUND_Y };
        }
        return { x: g.bases[1].x, y: BASE_TOP };
      }
      function spawnMissile(sx, sy, smart) {
        const t = pickTarget();
        const d = Math.hypot(t.x - sx, t.y - sy) || 1;
        const sp = smart ? g.speed * 0.9 : g.speed;
        g.icbms.push({
          sx, sy, x: sx, y: sy, tx: t.x, ty: t.y, vx: (t.x - sx) / d * sp, vy: (t.y - sy) / d * sp,
          smart, mirv: !smart && sy < 20 && Math.random() < 0.18 + g.wave * 0.03 ? 70 + Math.random() * 70 : 0
        });
      }
      function launcher() {
        const activeLimit = 4 + Math.floor(g.wave / 2);
        if (--g.launchT <= 0 && (g.toLaunch > 0 || g.smartLeft > 0)) {
          g.launchT = 50 + Math.random() * Math.max(30, 140 - g.wave * 10);
          if (g.icbms.length < activeLimit) {
            const n = 1 + Math.floor(Math.random() * Math.min(4, 1 + g.wave / 2));
            for (let i = 0; i < n; i++) {
              if (g.smartLeft > 0 && Math.random() < 0.3) { g.smartLeft--; spawnMissile(10 + Math.random() * (W - 20), 10, true); }
              else if (g.toLaunch > 0) { g.toLaunch--; spawnMissile(Math.random() * W, 10, false); }
            }
          }
        }
        // bombers & killer satellites
        if (g.fliersLeft > 0 && g.toLaunch > 2 && --g.flierT <= 0 && !g.fliers.length) {
          g.flierT = 400 + Math.random() * 300; g.fliersLeft--;
          const left = Math.random() < 0.5, sat = Math.random() < 0.5;
          g.fliers.push({ x: left ? -16 : W, y: 70 + Math.random() * 50, vx: left ? 0.7 : -0.7, sat, drops: 2, dropAt: 40 + Math.random() * 150 });
        }
      }
      function updateEnemies() {
        for (let i = g.icbms.length - 1; i >= 0; i--) {
          const m = g.icbms[i];
          if (m.smart) {
            // smart bombs side-step expanding fireballs
            for (const b of g.booms) {
              if (!b.friendly) continue;
              const dx = m.x - b.x, dy = m.y - b.y, d = Math.hypot(dx, dy);
              if (d < b.r + 12 && d > b.r) { m.x += (dx >= 0 ? 1 : -1) * 1.6; m.y -= 0.3; }
            }
            const d = Math.hypot(m.tx - m.x, m.ty - m.y) || 1;
            m.vx = (m.tx - m.x) / d * g.speed * 0.9; m.vy = (m.ty - m.y) / d * g.speed * 0.9;
          }
          m.x += m.vx; m.y += m.vy;
          if (m.mirv && m.y >= m.mirv) {
            m.mirv = 0;
            const extra = 1 + Math.floor(Math.random() * 3);
            for (let k = 0; k < extra && g.icbms.length < 24; k++) {
              const t = pickTarget(); const d = Math.hypot(t.x - m.x, t.y - m.y) || 1;
              g.icbms.push({ sx: m.x, sy: m.y, x: m.x, y: m.y, tx: t.x, ty: t.y, vx: (t.x - m.x) / d * g.speed, vy: (t.y - m.y) / d * g.speed, mirv: 0 });
            }
          }
          if (m.y >= m.ty) { impact(m.x, m.ty); g.icbms.splice(i, 1); }
        }
        for (let i = g.fliers.length - 1; i >= 0; i--) {
          const f = g.fliers[i];
          f.x += f.vx;
          if (!g.demo && frame % 12 === 0) sfx.flier();
          if (f.drops > 0 && Math.abs(f.x - f.dropAt) < 1 && g.toLaunch > 0) {
            f.drops--; f.dropAt = 30 + Math.random() * 190;
            const n = 1 + (Math.random() < 0.4 ? 1 : 0);
            for (let k = 0; k < n && g.toLaunch > 0; k++) { g.toLaunch--; spawnMissile(f.x + 6, f.y + 4, false); }
          }
          if (f.x < -20 || f.x > W + 4) g.fliers.splice(i, 1);
        }
      }
      function impact(x, y) {
        g.booms.push({ x, y: y - 2, r: 0, t: 0, max: 14, friendly: false });
        for (const c of g.cities) if (c.alive && x >= c.x - 2 && x <= c.x + 18) { c.alive = false; g.booms.push({ x: c.x + 8, y: GROUND_Y - 4, r: 0, t: 0, max: 16, friendly: false }); }
        for (const b of g.bases) if (b.alive && Math.abs(x - b.x) < 14 && y <= BASE_TOP + 4) { b.alive = false; b.ammo = 0; }
        if (!g.demo) sfx.bigboom();
      }
      function updateABMs() {
        for (let i = g.abms.length - 1; i >= 0; i--) {
          const a = g.abms[i];
          a.x += a.vx; a.y += a.vy;
          if (--a.n <= 0) { g.booms.push({ x: a.tx, y: a.ty, r: 0, t: 0, max: 13, friendly: true }); g.abms.splice(i, 1); if (!g.demo) sfx.boom(); }
        }
      }
      function updateBooms() {
        for (let i = g.booms.length - 1; i >= 0; i--) {
          const b = g.booms[i]; b.t++;
          b.r = b.t < 24 ? b.max * b.t / 24 : b.t < 36 ? b.max : b.max * (1 - (b.t - 36) / 22);
          if (b.t > 58) { g.booms.splice(i, 1); continue; }
          if (!b.friendly) continue;
          // fireballs destroy anything whose warhead is inside them
          for (let k = g.icbms.length - 1; k >= 0; k--) {
            const m = g.icbms[k];
            if (Math.hypot(m.x - b.x, m.y - b.y) <= b.r + 0.5) {
              g.icbms.splice(k, 1); addScore(m.smart ? 125 : 25);
              if (g.booms.length < 40) g.booms.push({ x: m.x, y: m.y, r: 0, t: 0, max: 12, friendly: true });
            }
          }
          for (let k = g.fliers.length - 1; k >= 0; k--) {
            const f = g.fliers[k];
            if (Math.hypot(f.x + 7 - b.x, f.y + 4 - b.y) <= b.r + 5) {
              g.fliers.splice(k, 1); addScore(100);
              if (g.booms.length < 40) g.booms.push({ x: f.x + 7, y: f.y + 4, r: 0, t: 0, max: 14, friendly: true });
            }
          }
        }
      }

      // ---------- phases ----------
      function waveOver() {
        return g.toLaunch <= 0 && g.smartLeft <= 0 && !g.icbms.length && !g.fliers.length && !g.abms.length && !g.booms.length;
      }
      function beginBonus() {
        g.phase = 'bonus'; g.phaseT = 40;
        g.bAmmo = 0; g.bCities = 0; g.bAmmoList = []; g.bCityList = [];
        for (const b of g.bases) for (let k = 0; k < b.ammo; k++) g.bAmmoList.push(b);
        for (const c of g.cities) if (c.alive) g.bCityList.push(c);
        g.bonusStage = 0;
      }
      function updateBonus() {
        if (--g.phaseT > 0) return;
        if (g.bonusStage === 0) {
          if (g.bAmmoList.length) { const b = g.bAmmoList.shift(); b.ammo--; g.bAmmo++; addScore(5); if (!g.demo) sfx.tick(); g.phaseT = 4; return; }
          g.bonusStage = 1; g.phaseT = 30; return;
        }
        if (g.bonusStage === 1) {
          if (g.bCityList.length) { g.bCityList.shift(); g.bCities++; addScore(100); if (!g.demo) sfx.cityTick(); g.phaseT = 18; return; }
          g.bonusStage = 2; g.phaseT = 20;
          // bonus cities
          while (!g.demo && g.score >= g.nextBonus) {
            g.bonusCities++; g.nextBonus += 10000; g.gotBonusCity = 150;
            au.melody([[523, .1], [659, .1], [784, .1], [1047, .1], [784, .1], [1047, .3]], { type: 'square', vol: 0.06 });
          }
          return;
        }
        if (g.bonusStage === 2) {
          g.bonusStage = 3; g.phaseT = g.gotBonusCity ? 150 : 90; return;
        }
        // next wave or the end
        const alive = g.cities.some(c => c.alive);
        if (!alive && g.bonusCities === 0) {
          if (api.offerContinue && !g.demo) {
            // all cities gone: offer a continue — on accept rebuild the six cities and replay this wave
            g.phase = 'continue';
            api.offerContinue(() => {
              for (const c of g.cities) c.alive = true;
              g.gotBonusCity = 0;
              startWave();
            }, theEnd);
          } else theEnd();
          return;
        }
        g.gotBonusCity = 0;
        g.wave++; startWave();
      }
      function theEnd() {
        g.phase = 'theend'; g.phaseT = 420;
        if (!g.demo) { api.setHiScore(g.score); sfx.bigboom(); au.noise(3, { freq: 600, slideTo: 30, vol: 0.4, delay: 0.3 }); }
      }

      function updateGame() {
        if (g.gotBonusCity) g.gotBonusCity--;
        if (g.phase === 'intro') {
          if (!g.demo) controls();
          if (--g.phaseT <= 0) g.phase = 'play';
          return;
        }
        if (g.phase === 'play') {
          if (g.demo) demoAI(); else controls();
          launcher(); updateEnemies(); updateABMs(); updateBooms();
          if (waveOver()) {
            if (g.demo && !g.cities.some(c => c.alive)) { mode = 'title'; titleT = 0; newGame(true); return; }
            beginBonus();
          }
          return;
        }
        if (g.phase === 'bonus') { updateBonus(); return; }
        if (g.phase === 'continue') return;
        if (g.phase === 'theend') {
          if (--g.phaseT <= 0 || (g.phaseT < 300 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; newGame(true); }
        }
      }

      // ---------- rendering ----------
      function drawGround(ctx, P, S) {
        ctx.fillStyle = P.ground;
        ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
        // base mounds
        for (const b of BASES) {
          for (let y = BASE_TOP; y < GROUND_Y; y++) {
            const hw = 10 + (y - BASE_TOP) * 0.9;
            ctx.fillRect(Math.round(b.x - hw), y, Math.round(hw * 2), 1);
          }
        }
        // small bumps under the cities
        for (const x of CITY_X) ctx.fillRect(x - 2, GROUND_Y - 2, 20, 2);
        // cities
        g.cities.forEach((c, i) => {
          if (c.alive) { if (!(g.phase === 'intro' && i === g.newCity && (frame >> 3) & 1)) ctx.drawImage(S.city, c.x, GROUND_Y - 9); }
          else ctx.drawImage(S.rubble, c.x, GROUND_Y - 9);
        });
        // ammo pyramids
        g.bases.forEach((b, bi) => {
          let k = 0;
          const rows = [1, 2, 3, 4];
          for (let r = 0; r < 4 && k < b.ammo; r++) for (let j = 0; j < rows[r] && k < b.ammo; j++, k++) {
            const x = b.x - (rows[r] * 4) / 2 + j * 4 + 1 - 1;
            ctx.drawImage(S.abm, Math.round(x), BASE_TOP - 1 + r * 4);
          }
          if (g.phase === 'play' || g.phase === 'intro') {
            if (!b.alive || b.ammo === 0) text(ctx, 'OUT', b.x, 220, P.bg === '#000000' ? '#000000' : P.bg, { center: true, adv: 6 });
            else if (b.ammo <= 3) text(ctx, 'LOW', b.x, 220, P.bg === '#000000' ? '#000000' : P.bg, { center: true, adv: 6 });
          }
        });
      }
      function drawBoom(ctx, b, P) {
        if (b.r < 0.5) return;
        ctx.fillStyle = FLASH[(Math.floor(frame / 2) + Math.floor(b.x)) % FLASH.length];
        disc(ctx, b.x, b.y, b.r);
      }
      function render(ctx) {
        const P = pal(), S = set();
        ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
        if (g.phase === 'theend') { renderEnd(ctx, P); return; }
        // incoming trails
        ctx.fillStyle = P.enemy;
        for (const m of g.icbms) if (!m.smart) line(ctx, m.sx, m.sy, m.x, m.y);
        for (const m of g.icbms) {
          if (m.smart) ctx.drawImage(S.smart[(frame >> 2) & 1], Math.round(m.x) - 3, Math.round(m.y) - 3);
          else { ctx.fillStyle = (frame >> 2) & 1 ? '#ffffff' : P.enemy; ctx.fillRect(Math.round(m.x), Math.round(m.y), 1, 1); }
        }
        for (const f of g.fliers) {
          const im = f.sat ? S.sat : (f.vx > 0 ? S.bomberR : S.bomberL);
          ctx.drawImage(im, Math.round(f.x), Math.round(f.y));
        }
        // ABM trails + targets
        ctx.fillStyle = P.abm;
        for (const a of g.abms) line(ctx, a.sx, a.sy, a.x, a.y);
        for (const a of g.abms) { ctx.drawImage(S.xmark, Math.round(a.tx) - 2, Math.round(a.ty) - 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(a.x), Math.round(a.y), 1, 1); ctx.fillStyle = P.abm; }
        for (const b of g.booms) drawBoom(ctx, b, P);
        drawGround(ctx, P, S);
        // crosshair
        if (!g.demo && (g.phase === 'play' || g.phase === 'intro')) ctx.drawImage(S.cross, Math.round(g.cx) - 3, Math.round(g.cy) - 3);
        // score line
        text(ctx, String(g.demo ? 0 : g.score), 92, 1, P.text, { right: true });
        text(ctx, String(hi), 160, 1, P.text, { right: true });
        if (g.phase === 'intro' && !g.demo) {
          text(ctx, 'PLAYER  1', 128, 60, P.abm, { center: true });
          text(ctx, mult() + ' X POINTS', 128, 84, P.abm, { center: true });
          if ((frame >> 3) & 1) {
            text(ctx, 'DEFEND', 64, 150, P.abm, { center: true });
            text(ctx, 'CITIES', 192, 150, P.abm, { center: true });
            ctx.fillStyle = P.abm;
            for (const c of g.cities) if (c.alive) { const x = c.x + 7; ctx.fillRect(x, 182, 1, 12); ctx.fillRect(x - 2, 190, 5, 1); ctx.fillRect(x - 1, 191, 3, 1); ctx.fillRect(x, 192, 1, 1); }
          }
        }
        if (g.phase === 'bonus') {
          text(ctx, 'BONUS POINTS', 128, 70, P.abm, { center: true });
          if (g.bAmmo > 0) {
            text(ctx, String(g.bAmmo * 5 * mult()), 84, 92, P.text, { right: true });
            for (let i = 0; i < g.bAmmo; i++) ctx.drawImage(S.abm, 96 + i * 4, 93);
          }
          if (g.bCities > 0) {
            text(ctx, String(g.bCities * 100 * mult()), 84, 112, P.text, { right: true });
            for (let i = 0; i < g.bCities; i++) ctx.drawImage(S.city, 96 + i * 20, 111);
          }
        }
        if (g.gotBonusCity && g.phase === 'bonus') text(ctx, 'BONUS CITY', 128, 140, P.text, { center: true });
      }
      function renderEnd(ctx, P) {
        // the giant final explosion
        const t = 420 - g.phaseT;
        const r = Math.min(110, t * 1.6);
        const cx = 128, cy = 112;
        for (let k = 0; k < 6; k++) {
          const rr = r - k * 18; if (rr <= 0) break;
          ctx.fillStyle = FLASH[(Math.floor(frame / 3) + k) % FLASH.length];
          // octagonal fireball
          const R = Math.round(rr), c = Math.round(rr * 0.41);
          for (let dy = -R; dy <= R; dy++) {
            const a = Math.abs(dy);
            const hw = a <= c ? R : R - (a - c);
            ctx.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
          }
        }
        if (t > 50) {
          const col = (frame >> 3) & 1 ? '#ff2828' : '#000000';
          for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, 2], [-2, 2], [2, -2]]) text(ctx, 'THE END', cx + ox, cy - 11 + oy, '#000000', { center: true, scale: 3, bold: true });
          text(ctx, 'THE END', cx, cy - 11, col === '#000000' ? '#ffffff' : col, { center: true, scale: 3, bold: true });
        }
        text(ctx, String(g.score), 92, 1, '#ffffff', { right: true });
        text(ctx, String(hi), 160, 1, '#ffffff', { right: true });
      }

      function renderTitle(ctx) {
        const push = pushScreen();
        if (push) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); } else render(ctx);
        const P = pal();
        const word = 'MISSILE', word2 = 'COMMAND';
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(16, 34, 224, 138);
        text(ctx, 'CREDITS: ' + Math.min(99, api.credits), 128, 160, '#ffffff', { center: true });
        if (push) {
          text(ctx, word, 129, 41, '#600000', { center: true, scale: 3, adv: 7 });
          text(ctx, word, 128, 40, '#ff2828', { center: true, scale: 3, adv: 7 });
          text(ctx, word2, 129, 69, '#600000', { center: true, scale: 3, adv: 7 });
          text(ctx, word2, 128, 68, '#ff2828', { center: true, scale: 3, adv: 7 });
          text(ctx, 'PRESS START', 128, 102, (frame >> 4) & 1 ? '#ffd800' : '#00a8ff', { center: true });
          text(ctx, '1 PLAYER', 128, 118, '#ffffff', { center: true });
          text(ctx, 'BONUS CITY EVERY 10000', 128, 134, '#00a8ff', { center: true });
          text(ctx, '© 1980 ATARI', 128, 200, '#e8c000', { center: true });
          return;
        }
        text(ctx, word, 129, 41, '#600000', { center: true, scale: 3, adv: 7 });
        text(ctx, word, 128, 40, '#ff2828', { center: true, scale: 3, adv: 7 });
        text(ctx, word2, 129, 69, '#600000', { center: true, scale: 3, adv: 7 });
        text(ctx, word2, 128, 68, '#ff2828', { center: true, scale: 3, adv: 7 });
        text(ctx, 'DEFEND YOUR CITIES', 128, 100, '#e8c000', { center: true });
        text(ctx, 'BONUS CITY EVERY 10000', 128, 114, '#00a8ff', { center: true });
        text(ctx, 'Z X C OR CLICK TO FIRE', 128, 128, '#ffffff', { center: true });
        if (api.credits === 0) { if (coinFlash > 0 || ((frame >> 5) & 1)) text(ctx, 'INSERT COIN', 128, 144, coinFlash > 0 && ((frame >> 2) & 1) ? '#ff2828' : '#ffd800', { center: true }); }
        else if ((frame >> 5) & 1) text(ctx, 'PRESS START', 128, 144, '#ffd800', { center: true });
      }

      newGame(true);
      if (api.debugHook) api.debugHook({ g: () => g, sum: () => ({ mode, phase: g.phase, wave: g.wave, score: g.score, cities: g.cities.filter(c => c.alive).length, ammo: g.bases.map(b => b.ammo).join('/'), icbm: g.icbms.length, toL: g.toLaunch }) });

      return {
        update() {
          frame++; pollCoins(); if (coinFlash > 0) coinFlash--;
          if (mode === 'title') {
            titleT++;
            if (!pushScreen()) updateGame();
            if ((api.anyPressed('Enter') || (titleT > 30 && (api.pressed('Space') || api.mouse.clicked))) && tryStart()) {
              mode = 'play'; newGame(false); lastMX = api.mouse.x; lastMY = api.mouse.y;
            }
            return;
          }
          updateGame();
        },
        render(ctx) {
          if (mode === 'title') renderTitle(ctx); else render(ctx);
        }
      };
    }
  });
})();
