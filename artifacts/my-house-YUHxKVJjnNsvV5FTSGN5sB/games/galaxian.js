// Galaxian (Namco, 1979) \u2014 procedural recreation for the MAME32 Game Room.
// Convoy of 46 aliens, flagships diving with red escorts, single-shot missile, scrolling starfield, wave flags.
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
  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

  const W = 224, H = 256, PY = 232;
  // ---------- pixel art (aliens drawn facing DOWN, toward the player) ----------
  const ALIEN = [[
    'A..........A',
    'AA........AA',
    'AAA.BBBB.AAA',
    '.AABBBBBBAA.',
    '..ABBCCBBA..',
    '...BBBBBB...',
    '...B.BB.B...',
    '....B..B....'], [
    '............',
    'A..........A',
    'AA.BBBBBB.AA',
    'AAABBBBBBAAA',
    '.AABBCCBBAA.',
    '...BBBBBB...',
    '...B.BB.B...',
    '...B....B...']];
  const FLAG = [[
    'R....YY....R',
    'RR..YYYY..RR',
    'RRR.YYYY.RRR',
    '.RRYYYYYYRR.',
    '..RYYBBYYR..',
    '...YYYYYY...',
    '....Y..Y....',
    '...Y....Y...'], [
    '.....YY.....',
    'R...YYYY...R',
    'RR..YYYY..RR',
    'RRRYYYYYYRRR',
    '.RRYYBBYYRR.',
    '...YYYYYY...',
    '....Y..Y....',
    '....Y..Y....']];
  const PALS = [
    { A: '#2a5cff', B: '#00b4ff', C: '#ffe000' },   // drone (blue)
    { A: '#b030ff', B: '#ff70ff', C: '#ffe000' },   // emissary (purple)
    { A: '#ff1c1c', B: '#ff9a9a', C: '#ffe000' },   // hornet (red)
    { Y: '#ffe000', R: '#ff1c1c', B: '#2a5cff' }    // flagship
  ];
  const SHIP = [
    '.....WW.....',
    '....WWWW....',
    '....WBBW....',
    '...WWBBWW...',
    'R..WWWWWW..R',
    'R.WWWWWWWW.R',
    'RWWWWWWWWWWR',
    'RWWWRWWRWWWR',
    'RWW.RRRR.WWR',
    '.R...RR...R.'];
  const NROT = 16;
  const SPR = PALS.map((pal, t) => {
    const art = t === 3 ? FLAG : ALIEN;
    const rot = [];
    for (let i = 0; i < NROT; i++) rot.push(spr(rotRows(art[0], i * TAU / NROT, 15), pal));
    return { f: [spr(art[0], pal), spr(art[1], pal)], rot };
  });
  const SHIPSPR = spr(SHIP, { W: '#ffffff', R: '#ff2020', B: '#2a5cff' });
  const MINI = spr(['..W..', '.WWW.', 'RWWWR', 'RWRWR'], { W: '#ffffff', R: '#ff2020' });
  const FLAGSPR = spr(['WRRRR', 'WRRRR', 'WRRY.', 'WR...', 'W....', 'W....'], { W: '#c0c0c0', R: '#ff2020', Y: '#ffe000' });
  const FORM_PTS = [30, 40, 50, 60], DIVE_PTS = [60, 80, 100, 150];

  ArcadeRegistry.register({
    id: 'galaxian', title: 'Galaxian', year: 1979, maker: 'Namco',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Space: fire \u00b7 Enter: start',
    marquee: { bg: '#000018', fg: '#ff2a2a', accent: '#ffe000' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(5000);
      let mode = 'title', titleT = 0, frame = 0, coinFlash = 0, lastCred = api.credits;
      let g = null;

      // ---------- starfield ----------
      const SCOL = ['#ff4040', '#ffff40', '#40ff40', '#40ffff', '#4060ff', '#ff40ff', '#ffffff', '#ff9040'];
      const stars = [];
      for (let i = 0; i < 80; i++) stars.push({ x: Math.random() * W | 0, y: Math.random() * H, c: SCOL[i % 8], ph: Math.random() * 64 | 0, per: 24 + (i % 4) * 12 });
      function updStars() { for (const s of stars) { s.y += 0.35; if (s.y >= H) { s.y -= H; s.x = Math.random() * W | 0; } } }
      function drawStars(ctx) {
        for (const s of stars) {
          if ((frame + s.ph) % s.per < s.per * 0.6) { ctx.fillStyle = s.c; ctx.fillRect(s.x, s.y | 0, 1, 1); }
        }
      }

      // ---------- sound ----------
      const sfx = {
        shot() { au.tone(1800, 0.14, { type: 'square', vol: 0.09, slideTo: 380 }); },
        hit() { au.noise(0.22, { vol: 0.2, freq: 2400, slideTo: 300 }); au.tone(600, 0.12, { type: 'square', vol: 0.06, slideTo: 90 }); },
        flag() { au.noise(0.4, { vol: 0.22, freq: 3000, slideTo: 200 }); au.melody([[1047, .05], [1319, .05], [1568, .05], [2093, .1]], { type: 'square', vol: 0.07 }); },
        dive() { au.tone(1500, 1.0, { type: 'sine', vol: 0.06, slideTo: 260 }); },
        die() { au.noise(1.2, { vol: 0.28, freq: 1600, slideTo: 60 }); au.tone(400, 1.0, { type: 'sawtooth', vol: 0.08, slideTo: 40 }); },
        start() { au.melody([[392, .12], [523, .12], [659, .12], [784, .24], [659, .12], [784, .36], [0, .1], [523, .12], [587, .12], [659, .12], [784, .12], [1047, .4]], { type: 'square', vol: 0.08 }); },
        extra() { au.melody([[1319, .08], [1568, .08], [2093, .08], [1568, .08], [2093, .2]], { type: 'square', vol: 0.08 }); },
        coin() { au.tone(1760, 0.06, { type: 'square', vol: 0.07, slideTo: 2640 }); }
      };

      // ---------- game state ----------
      function slotX(c) { return 40 + c * 16 + g.sway; }
      function slotY(r) { return 40 + r * 12; }
      function newGame(demo) {
        g = {
          demo, score: 0, lives: 3, wave: 1, ext: false, px: W / 2, alive: false, deadT: 0, shot: null, ebul: [], booms: [], pops: [],
          aliens: [], phase: 'intro', phaseT: demo ? 60 : 150, sway: 0, swayDir: 1, attackT: 200, flagT: 600, t: 0, demoT: 0, aiTarget: W / 2
        };
        setupWave();
        if (!demo) sfx.start();
      }
      function setupWave() {
        g.aliens = [];
        const rows = [[3, 6], [2, 3, 4, 5, 6, 7], [1, 2, 3, 4, 5, 6, 7, 8], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]];
        g.sway = 0;
        rows.forEach((cols, r) => cols.forEach(c => {
          const type = r === 0 ? 3 : r === 1 ? 2 : r === 2 ? 1 : 0;
          g.aliens.push({ type, c, r, state: 'form', x: slotX(c), y: slotY(r), hd: Math.PI / 2, sp: 0, appear: (5 - r) * 10 + c * 2, leader: null, escN: 0, escKilled: 0, shots: 0, turn: 0, loopA: 0, ox: 0, oy: 0 });
        }));
        g.ebul = []; g.shot = null; g.attackT = Math.max(90, 200 - g.wave * 10); g.flagT = Math.max(300, 700 - g.wave * 40); g.t = 0;
      }
      function alienCount() { return g.aliens.length; }
      function diverCount() { let n = 0; for (const a of g.aliens) if (a.state !== 'form') n++; return n; }

      function addScore(n) {
        if (g.demo) return;
        g.score += n;
        if (!g.ext && g.score >= 7000) { g.ext = true; g.lives++; sfx.extra(); }
        if (g.score > hi) hi = g.score;
      }

      // ---------- attacks ----------
      function startDive(a, dir) {
        a.state = 'loop'; a.hd = -Math.PI / 2; a.turn = dir; a.loopA = 0; a.sp = 1.3;
        a.shots = 1 + Math.min(3, Math.floor(g.wave / 2)) + (Math.random() < 0.4 ? 1 : 0);
      }
      function launchAttack() {
        const formers = g.aliens.filter(a => a.state === 'form');
        if (!formers.length) return;
        const side = Math.random() < 0.5 ? -1 : 1;  // -1 left side
        // pick the outermost aliens in the chosen side
        let best = null;
        for (const a of formers) {
          if (a.type === 3) continue;
          if (!best || (side < 0 ? a.c < best.c || (a.c === best.c && a.r > best.r && Math.random() < 0.5) : a.c > best.c || (a.c === best.c && a.r > best.r && Math.random() < 0.5))) best = a;
        }
        if (!best) best = formers[Math.random() * formers.length | 0];
        const group = [best];
        // purples / reds sometimes come in pairs or threes
        if (best.type >= 1 && Math.random() < 0.5) {
          for (const a of formers) if (a !== best && a.type === best.type && Math.abs(a.c - best.c) <= 1 && group.length < 3) group.push(a);
        }
        const dir = best.x < W / 2 ? -1 : 1;
        group.forEach((a, i) => { startDive(a, dir); a.delay = i * 10; });
        sfx.dive();
      }
      function launchFlagship() {
        const flags = g.aliens.filter(a => a.state === 'form' && a.type === 3);
        if (!flags.length) return false;
        const f = flags[Math.random() * flags.length | 0];
        const reds = g.aliens.filter(a => a.state === 'form' && a.type === 2).sort((a, b) => Math.abs(a.c - f.c) - Math.abs(b.c - f.c));
        const esc = reds.slice(0, Math.min(2, reds.length)).filter(a => Math.abs(a.c - f.c) <= 3);
        const dir = f.x < W / 2 ? -1 : 1;
        startDive(f, dir); f.escN = esc.length; f.escKilled = 0;
        esc.forEach((e, i) => { startDive(e, dir); e.leader = f; e.ox = (i === 0 ? -1 : 1) * 13; e.oy = -6; e.delay = 0; });
        sfx.dive();
        return true;
      }

      function fireAt(a) {
        if (g.ebul.length >= 4 + g.wave) return;
        const dx = (g.px - a.x);
        g.ebul.push({ x: a.x, y: a.y + 5, vx: Math.max(-0.9, Math.min(0.9, dx * 0.012)), vy: 2.3 + Math.min(1, g.wave * 0.08) });
      }

      function updAlien(a) {
        if (a.delay > 0) { a.delay--; if (a.state === 'loop') { a.x = slotX(a.c); a.y = slotY(a.r); return; } }
        if (a.state === 'form') { a.x = slotX(a.c); a.y = slotY(a.r); a.hd = Math.PI / 2; return; }
        if (a.leader) {
          const L = a.leader;
          if (g.aliens.includes(L) && (L.state === 'loop' || L.state === 'dive')) {
            a.x = L.x + a.ox; a.y = L.y + a.oy; a.hd = L.hd; a.state = L.state; return;
          }
          a.leader = null; if (a.state === 'loop') { a.state = 'dive'; a.sp = 1.8; }
        }
        if (a.state === 'loop') {
          a.hd += a.turn * 0.085; a.loopA += 0.085;
          a.x += Math.cos(a.hd) * a.sp; a.y += Math.sin(a.hd) * a.sp;
          if (a.loopA >= Math.PI) { a.state = 'dive'; a.sp = Math.min(2.7, 1.5 + g.wave * 0.12 + (a.type === 3 ? 0.2 : 0)); a.hd = Math.PI / 2 - a.turn * 0.4; }
          return;
        }
        if (a.state === 'dive') {
          if (a.y < PY - 34) {
            const tx = g.alive ? g.px : a.x + Math.cos(a.hd) * 40;
            const want = Math.atan2(PY + 30 - a.y, tx - a.x);
            const tr = 0.022 + Math.min(0.03, g.wave * 0.003);
            a.hd += Math.max(-tr, Math.min(tr, angDiff(a.hd, want)));
            if (a.type === 0) a.hd += Math.sin((g.t + a.c * 13) * 0.12) * 0.03;
          }
          a.x += Math.cos(a.hd) * a.sp; a.y += Math.sin(a.hd) * a.sp;
          if (a.x < 6) { a.x = 6; a.hd = Math.PI - a.hd; } if (a.x > W - 6) { a.x = W - 6; a.hd = Math.PI - a.hd; }
          if (a.shots > 0 && a.y > 70 && a.y < PY - 50 && g.alive && Math.random() < 0.035 + g.wave * 0.004) { a.shots--; fireAt(a); }
          if (a.y > H + 10) {
            // re-enter from the top: return to the convoy (or keep attacking when nearly wiped out)
            a.y = -12; a.x = slotX(a.c);
            if (alienCount() <= 4 && g.alive) { a.state = 'dive'; a.hd = Math.PI / 2; a.shots = 2; }
            else a.state = 'return';
          }
          return;
        }
        if (a.state === 'return') {
          const sx = slotX(a.c), sy = slotY(a.r), dx = sx - a.x, dy = sy - a.y, d = Math.hypot(dx, dy);
          const sp = 1.6;
          if (d < sp + 0.5) { a.state = 'form'; a.x = sx; a.y = sy; a.hd = Math.PI / 2; a.escN = 0; a.escKilled = 0; }
          else { a.x += dx / d * sp; a.y += dy / d * sp; a.hd = Math.atan2(dy, dx); }
        }
      }

      function killAlien(a) {
        const i = g.aliens.indexOf(a); if (i < 0) return;
        g.aliens.splice(i, 1);
        let pts;
        if (a.state === 'form') pts = FORM_PTS[a.type];
        else if (a.type === 3) {
          if (a.escN === 0) pts = 150;
          else if (a.escN === 2 && a.escKilled === 2) pts = 800;
          else if (a.escN === 2) pts = 300;
          else pts = 200;
          g.pops.push({ x: a.x, y: a.y, txt: String(pts), t: 90 });
        } else pts = DIVE_PTS[a.type];
        if (a.leader && g.aliens.includes(a.leader)) a.leader.escKilled++;
        if (a.type === 3) { for (const e of g.aliens) if (e.leader === a) e.leader = null; sfx.flag(); } else sfx.hit();
        addScore(pts);
        g.booms.push({ x: a.x, y: a.y, t: 0, big: false, col: a.type });
      }

      function killPlayer() {
        if (!g.alive) return;
        g.alive = false; g.deadT = 0; g.shot = null;
        g.booms.push({ x: g.px, y: PY, t: 0, big: true });
        sfx.die();
      }

      function gameOver() {
        if (!g.demo) api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 240;
      }
      function lastLife() {
        if (g.demo) { g.phase = 'over'; g.phaseT = 60; return; }
        if (!api.offerContinue) { gameOver(); return; }
        const cg = g;
        api.offerContinue(() => { if (g === cg) { g.lives = 3; g.phase = 'respawn'; } }, () => { if (g === cg) gameOver(); });
      }

      // ---------- controls ----------
      function readCtl() {
        if (!g.demo) return { l: api.key('ArrowLeft'), r: api.key('ArrowRight'), fire: api.pressed('Space') || api.pressed('KeyZ') };
        // attract-mode pilot: dodge, then chase the lowest attacker or a convoy column
        let threat = null;
        for (const b of g.ebul) if (b.y > PY - 60 && b.y < PY && Math.abs(b.x + b.vx * (PY - b.y) / b.vy - g.px) < 10) threat = b;
        if (threat) return { l: threat.x >= g.px, r: threat.x < g.px, fire: false };
        let tgt = null;
        for (const a of g.aliens) if (a.state === 'dive' && a.y < PY - 40 && (!tgt || a.y > tgt.y)) tgt = a;
        if (!tgt) { if (frame % 90 === 0 && g.aliens.length) { const a = g.aliens[Math.random() * g.aliens.length | 0]; g.aiTarget = a.x; } }
        const tx = tgt ? tgt.x : g.aiTarget;
        const dx = tx - g.px;
        return { l: dx < -3, r: dx > 3, fire: Math.abs(dx) < 8 && Math.random() < 0.3 };
      }

      // ---------- update ----------
      function updGame() {
        g.t++;
        for (const b of g.booms) b.t++;
        g.booms = g.booms.filter(b => b.t < (b.big ? 70 : 24));
        for (const p of g.pops) p.t--;
        g.pops = g.pops.filter(p => p.t > 0);

        if (g.phase === 'over') { if (--g.phaseT <= 0) { mode = 'title'; titleT = 0; } return; }

        // formation sway (shared by phases)
        let minC = 9, maxC = 0;
        for (const a of g.aliens) { if (a.c < minC) minC = a.c; if (a.c > maxC) maxC = a.c; }
        g.sway += g.swayDir * 0.3;
        if (40 + minC * 16 + g.sway < 10) g.swayDir = 1;
        if (40 + maxC * 16 + g.sway > W - 10) g.swayDir = -1;

        if (g.phase === 'intro') {
          if (--g.phaseT <= 0) { g.phase = 'play'; g.alive = true; g.px = W / 2; }
          for (const a of g.aliens) updAlien(a);
          return;
        }
        if (g.phase === 'clear') {
          if (--g.phaseT <= 0) { g.wave++; setupWave(); g.phase = 'play'; }
          return;
        }
        if (g.phase === 'respawn') {
          g.phase = 'play'; g.alive = true; g.px = W / 2; g.ebul = []; g.overPending = false;
          for (const a of g.aliens) if (a.state !== 'form') { a.state = 'return'; a.leader = null; }
        }

        if (g.demo && ++g.demoT > 2400) { mode = 'title'; titleT = 0; return; }

        const c = readCtl();
        if (g.alive) {
          if (c.l) g.px -= 1.5; if (c.r) g.px += 1.5;
          g.px = Math.max(10, Math.min(W - 10, g.px));
          if (c.fire && !g.shot) { g.shot = { x: Math.round(g.px), y: PY - 8 }; sfx.shot(); }
        } else {
          g.deadT++;
          const divers = diverCount();
          if (g.deadT > 400) for (const a of g.aliens) if (a.state === 'dive' || a.state === 'loop') { a.state = 'return'; a.leader = null; }
          if (g.deadT > 150 && divers === 0) {
            if (g.lives > 1) { g.lives--; g.phase = 'respawn'; }
            else if (!g.overPending) { g.overPending = true; g.lives = 0; lastLife(); }
            if (g.phase !== 'respawn') return;
          }
        }
        if (g.shot) {
          g.shot.y -= 5;
          if (g.shot.y < 12) g.shot = null;
          else for (const a of g.aliens) {
            if ((a.delay > 0 && a.state === 'loop') || g.t < a.appear) continue;
            if (Math.abs(a.x - g.shot.x) < 6 && g.shot.y < a.y + 5 && g.shot.y + 6 > a.y - 4) { killAlien(a); g.shot = null; break; }
          }
        }

        // attack scheduling
        if (g.alive) {
          const n = alienCount(), maxDiv = n <= 6 ? n : Math.min(7, 2 + Math.floor(g.wave / 2));
          if (--g.attackT <= 0) {
            g.attackT = n <= 6 ? 40 : Math.max(50, 150 - g.wave * 10) + (Math.random() * 60 | 0);
            if (diverCount() < maxDiv) launchAttack();
          }
          if (--g.flagT <= 0) {
            g.flagT = Math.max(280, 700 - g.wave * 40) + (Math.random() * 200 | 0);
            if (diverCount() < maxDiv + 2) launchFlagship();
          }
        }
        for (const a of g.aliens) updAlien(a);

        // enemy bullets
        for (const b of g.ebul) { b.x += b.vx; b.y += b.vy; }
        g.ebul = g.ebul.filter(b => b.y < H);
        if (g.alive) {
          for (const b of g.ebul) if (Math.abs(b.x - g.px) < 5 && Math.abs(b.y - PY) < 6) { killPlayer(); b.y = H + 10; break; }
          for (const a of g.aliens) if (a.state !== 'form' && Math.abs(a.x - g.px) < 9 && Math.abs(a.y - PY) < 8) { killAlien(a); killPlayer(); break; }
        }

        // swarm drone sound: quickens as the convoy thins out
        const n = alienCount();
        const per = 10 + Math.floor(n / 4);
        if (!g.demo && g.t % per === 0 && n) au.tone(110 + (46 - n) * 6, 0.12, { type: 'triangle', vol: 0.035 });

        if (n === 0 && g.phase === 'play') {
          g.phase = 'clear'; g.phaseT = 150; g.ebul = []; g.shot = null;
          if (!g.demo) au.melody([[784, .08], [988, .08], [1175, .08], [1568, .2]], { type: 'square', vol: 0.07 });
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
        if (mode === 'title' || (g && g.demo && mode === 'demo')) {
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(false); return; }
        }
        if (mode === 'title') {
          titleT++;
          if (titleT > 720) { mode = 'demo'; newGame(true); }
          return;
        }
        updGame();
      }

      // ---------- drawing ----------
      function drawAlien(ctx, a) {
        const S = SPR[a.type];
        if (a.state === 'form' || (a.delay > 0 && a.state === 'loop')) {
          const f = ((frame >> 4) + a.c) & 1;
          ctx.drawImage(S.f[f], Math.round(a.x - 6), Math.round(a.y - 4));
        } else {
          let i = Math.round(angDiff(Math.PI / 2, a.hd) / (TAU / NROT)); i = ((i % NROT) + NROT) % NROT;
          ctx.drawImage(S.rot[i], Math.round(a.x - 7), Math.round(a.y - 7));
        }
      }
      const BOOMCOL = ['#ffffff', '#ffe000', '#ff8000', '#ff2020', '#b030ff', '#2a5cff'];
      function drawBoom(ctx, b) {
        const n = b.big ? 16 : 10, r = b.big ? 2 + b.t * 0.35 : 1 + b.t * 0.35;
        for (let k = 0; k < n; k++) {
          const a = k * TAU / n + (k & 1) * 0.3;
          for (let j = 0; j < 3; j++) {
            const rr = r * (1 - j * 0.3) * (k & 1 ? 0.7 : 1);
            ctx.fillStyle = BOOMCOL[(j + (b.t >> 2) + k) % BOOMCOL.length];
            const s = b.big && b.t < 30 ? 2 : 1;
            ctx.fillRect(Math.round(b.x + Math.cos(a) * rr), Math.round(b.y + Math.sin(a) * rr), s, s);
          }
        }
        if (b.t < 6) { ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(b.x - 2), Math.round(b.y - 2), 4, 4); }
      }
      function drawHUD(ctx) {
        text(ctx, '1UP', 24, 2, '#ff2020');
        text(ctx, String(g && mode !== 'title' && !g.demo ? g.score : 0).padStart(2, '0'), 56, 11, '#ffffff', { right: true });
        text(ctx, 'HIGH SCORE', W / 2, 2, '#ff2020', { center: true });
        text(ctx, String(hi), W / 2 + 12, 11, '#ffffff', { right: true });
      }
      function drawBottom(ctx) {
        if (g && mode !== 'title') {
          for (let i = 0; i < Math.min(6, g.lives - 1); i++) ctx.drawImage(MINI, 4 + i * 8, H - 7);
          const fl = Math.min(12, g.wave);
          for (let i = 0; i < fl; i++) ctx.drawImage(FLAGSPR, W - 8 - i * 7, H - 8);
        }
      }
      function drawTitle(ctx) {
        const page = Math.floor(titleT / 360) % 2;
        if (page === 0) {
          text(ctx, 'GALAXIAN', W / 2 + 1, 41, '#600000', { center: true, scale: 3 });
          text(ctx, 'GALAXIAN', W / 2, 40, '#ff2a2a', { center: true, scale: 3 });
          if (titleT > 40) text(ctx, 'WE ARE THE GALAXIANS', W / 2, 80, '#b030ff', { center: true });
          if (titleT > 90) text(ctx, 'MISSION: DESTROY ALIENS', W / 2, 96, '#ff2a2a', { center: true });
          if (titleT > 140) {
            text(ctx, '- SCORE ADVANCE TABLE -', W / 2, 120, '#00b4ff', { center: true });
            text(ctx, 'CONVOY  CHARGER', 140, 134, '#ffe000', { center: true });
            const rows = [[3, '60', '150 PTS'], [2, '50', '100 PTS'], [1, '40', ' 80 PTS'], [0, '30', ' 60 PTS']];
            rows.forEach(([t, a, b], i) => {
              const y = 148 + i * 14;
              if (titleT > 160 + i * 25) {
                ctx.drawImage(SPR[t].f[(frame >> 4) & 1], 34, y);
                text(ctx, a, 104, y + 1, '#00ffff', { right: true });
                text(ctx, b, 192, y + 1, '#00ffff', { right: true });
              }
            });
          }
        } else {
          text(ctx, 'GALAXIAN', W / 2, 40, '#ff2a2a', { center: true, scale: 3 });
          text(ctx, 'FLAGSHIP ATTACK BONUS', W / 2, 80, '#ffe000', { center: true });
          ctx.drawImage(SPR[2].f[0], 76, 100); ctx.drawImage(SPR[3].f[0], 106, 96); ctx.drawImage(SPR[2].f[0], 136, 100);
          text(ctx, 'ESCORTS FIRST  800 PTS', W / 2, 120, '#ffffff', { center: true });
          text(ctx, 'WITH 2 ESCORTS 300 PTS', W / 2, 134, '#ffffff', { center: true });
          text(ctx, 'WITH 1 ESCORT  200 PTS', W / 2, 148, '#ffffff', { center: true });
          text(ctx, 'ALONE          150 PTS', W / 2, 162, '#ffffff', { center: true });
          text(ctx, 'BONUS GALAXIP FOR 7000 PTS', W / 2, 186, '#00ffff', { center: true });
        }
        if (api.credits === 0) { if (coinFlash > 0 || ((frame >> 5) & 1)) text(ctx, 'INSERT COIN', W / 2, 214, coinFlash && ((frame >> 2) & 1) ? '#ffe000' : '#ff2020', { center: true }); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START BUTTON', W / 2, 214, '#ffe000', { center: true });
        text(ctx, '\u00a9 NAMCO 1979', W / 2, 228, '#b030ff', { center: true });
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 8, H - 9, '#ffffff');
      }

      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        drawStars(ctx);
        if (mode === 'title') { drawHUD(ctx); drawTitle(ctx); return; }
        const showAliens = g.phase !== 'clear';
        if (showAliens) for (const a of g.aliens) {
          if (g.phase === 'intro' ? (g.demo ? 60 : 150) - g.phaseT < a.appear : g.t < a.appear) continue;
          drawAlien(ctx, a);
        }
        // player and missile
        if (g.alive) {
          ctx.drawImage(SHIPSPR, Math.round(g.px - 6), PY - 5);
          if (!g.shot) { ctx.fillStyle = '#ffe000'; ctx.fillRect(Math.round(g.px) - 1 + 1, PY - 9, 1, 4); }
        }
        if (g.shot) { ctx.fillStyle = '#ffe000'; ctx.fillRect(g.shot.x, Math.round(g.shot.y), 1, 4); }
        for (const b of g.ebul) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(b.x), Math.round(b.y), 1, 3); ctx.fillStyle = '#ff4040'; ctx.fillRect(Math.round(b.x), Math.round(b.y) + 3, 1, 1); }
        for (const b of g.booms) drawBoom(ctx, b);
        for (const p of g.pops) text(ctx, p.txt, p.x, p.y - 3, '#00ffff', { center: true, adv: 6 });

        if (g.phase === 'intro' && !g.demo) {
          text(ctx, 'PLAYER ONE', W / 2, 140, '#ff2020', { center: true });
          if (g.phaseT < 90) text(ctx, 'READY', W / 2, 156, '#00ffff', { center: true });
        }
        if (g.phase === 'over') text(ctx, 'GAME OVER', W / 2, 150, '#ff2020', { center: true });
        if (g.demo) {
          text(ctx, 'DEMONSTRATION', W / 2, 150, '#b030ff', { center: true });
          if (api.credits === 0) { if ((frame >> 5) & 1) text(ctx, 'INSERT COIN', W / 2, 166, '#ff2020', { center: true }); }
          else if ((frame >> 5) & 1) text(ctx, 'PUSH START BUTTON', W / 2, 166, '#ffe000', { center: true });
        }
        drawHUD(ctx); drawBottom(ctx);
      }

      if (api.debugHook) api.debugHook({ g: () => g, mode: () => mode });
      return { update, render, destroy() { } };
    }
  });
})();
