// Time Pilot (Konami, 1982) \u2014 procedural recreation for the MAME32 Game Room.
// The player's plane stays at the centre and turns through 16 headings while the sky scrolls past.
// Eras 1910 / 1940 / 1970 / 1982 / 2001: shoot the quota, then down the boss to warp to the next era.
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
  // heading index 0..15 -> radians (0 = north, clockwise)
  const dirAng = d => d * TAU / 16 - Math.PI / 2;
  const angIdx = a => ((Math.round((a + Math.PI / 2) / (TAU / 16)) % 16) + 16) % 16;
  function rotSet(rows, pal) { const N = Math.ceil(Math.hypot(rows.length, rows[0].length)) + 1; const out = []; for (let i = 0; i < 16; i++) out.push(spr(rotRows(rows, i * TAU / 16, N), pal)); return out; }

  const W = 224, H = 256, CX = 112, CY = 136;
  const ERAS = [
    { year: 1910, sky: '#5c9ee6', cloud: ['#ffffff', '#c8dcf0'], enemy: 'bi', speed: 1.15, boss: 'blimp', bossName: 'AIRSHIP', bossHp: 8, bossPts: 1500 },
    { year: 1940, sky: '#2c5cae', cloud: ['#f0f0f0', '#a8b8d8'], enemy: 'mono', speed: 1.45, boss: 'bomber', bossName: 'BOMBER', bossHp: 10, bossPts: 2000 },
    { year: 1970, sky: '#5e7a52', cloud: ['#c8d4b8', '#8ca080'], enemy: 'heli', speed: 1.2, boss: 'chopper', bossName: 'HELICOPTER', bossHp: 12, bossPts: 3000 },
    { year: 1982, sky: '#26264e', cloud: ['#8c8cb0', '#5a5a80'], enemy: 'jet', speed: 1.9, boss: 'bigjet', bossName: 'JET BOMBER', bossHp: 14, bossPts: 4000 },
    { year: 2001, sky: '#000008', cloud: null, enemy: 'ufo', speed: 1.7, boss: 'mother', bossName: 'MOTHERSHIP', bossHp: 16, bossPts: 5000 }
  ];
  const QUOTA = 56;

  // ---------- pixel art (planes face north) ----------
  const PLAYER_ART = [
    '......W......',
    '......W......',
    '.....WWW.....',
    '.....WBW.....',
    '.....WWW.....',
    '....WWWWW....',
    '..WWWWWWWWW..',
    'WWWWWWWWWWWWW',
    'WWR..WWW..RWW',
    '.....WWW.....',
    '....WWWWW....',
    '...WW.R.WW...'];
  const ART = {
    bi: ['....WWW....', '.....G.....', 'YYYYYYYYYYY', 'Y.Y.GGG.Y.Y', 'YYYYYYYYYYY', '.....G.....', '.....G.....', '....YYY....', '.....G.....'],
    mono: ['.....W.....', '....GGG....', '.....G.....', 'GGGGGGGGGGG', '.GGGGRGGGG.', '.....G.....', '.....G.....', '...GGGGG...', '.....G.....'],
    heli: ['....GGG....', '...GGGGG...', '...GWWWG...', '...GGGGG...', '....GGG....', '.....G.....', '.....G.....', '.....G.....', '....GGG....'],
    jet: ['.....W.....', '.....W.....', '....WWW....', '....WBW....', '...WWWWW...', '..WWWWWWW..', '.WWWWWWWWW.', 'WWW.WWW.WWW', '....WWW....', '...WW.WW...'],
    missile: ['.W.', 'WWW', 'WWW', 'WWW', 'RWR', '.Y.']
  };
  const PALS = {
    bi: { W: '#ffffff', G: '#80501c', Y: '#e8c040' },
    mono: { W: '#ffffff', G: '#30a040', R: '#ff3030' },
    heli: { W: '#a0e0ff', G: '#c09030' },
    jet: { W: '#d8d8e0', B: '#3060ff' },
    missile: { W: '#ffffff', R: '#ff3030', Y: '#ffe040' }
  };
  const PSET = rotSet(PLAYER_ART, { W: '#ffffff', B: '#3060ff', R: '#ff2020' });
  const ESET = {}; for (const k in ART) ESET[k] = rotSet(ART[k], PALS[k]);
  const UFO = [spr(['....CCC....', '..CCCCCCC..', '.WWWWWWWWW.', 'WRWWYWWRWWW', '.WWWWWWWWW.', '...C...C...'], { C: '#40e0ff', W: '#c0c0d0', R: '#ff3030', Y: '#ffe040' }),
    spr(['....CCC....', '..CCCCCCC..', '.WWWWWWWWW.', 'WWWRWWYWWRW', '.WWWWWWWWW.', '..C.....C..'], { C: '#40e0ff', W: '#c0c0d0', R: '#ff3030', Y: '#ffe040' })];
  const CHUTE = spr(['..RRWRR..', '.RRWWWRR.', 'RRWWWWWRR', 'R.......R', '.R.....R.', '..R...R..', '...RYR...', '....Y....', '...Y.Y...'], { R: '#ff3030', W: '#ffffff', Y: '#ffe040' });
  const MINI = spr(['..W..', '.WWW.', 'WWWWW', '..W..', '.W.W.'], { W: '#ffffff' });

  // deterministic puffy cloud art
  function cloudArt(w, h, seed) {
    let s = seed; const r = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const g = []; for (let y = 0; y < h; y++) g.push(new Array(w).fill('.'));
    const n = 4 + (w >> 3);
    for (let k = 0; k < n; k++) {
      const rad = h * (0.25 + r() * 0.25), cx = rad + r() * (w - 2 * rad), cy = h * 0.55 + (r() - 0.5) * h * 0.2;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x - cx) ** 2 + ((y - cy) * 1.3) ** 2 < rad * rad) g[y][x] = 'W';
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g[y][x] === 'W' && (y + 2 >= h || g[y + 2][x] === '.' || y > h * 0.72)) g[y][x] = 'S';
    return g.map(row => row.join(''));
  }
  const CLOUD_ART = [cloudArt(24, 10, 3), cloudArt(40, 16, 11), cloudArt(64, 24, 29)];
  const CLOUDS = ERAS.map(e => e.cloud ? CLOUD_ART.map(a => spr(a, { W: e.cloud[0], S: e.cloud[1] })) : null);

  ArcadeRegistry.register({
    id: 'timepilot', title: 'Time Pilot', year: 1982, maker: 'Konami',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: steer (plane turns toward the direction) \u00b7 Space: fire \u00b7 Enter: start',
    marquee: { bg: '#2c5cae', fg: '#ffffff', accent: '#ffe040' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(10000);
      let mode = 'title', titleT = 0, frame = 0, coinFlash = 0, lastCred = api.credits;
      let g = null;
      let clouds = [], stars = [];
      function makeSky() {
        clouds = [];
        for (let i = 0; i < 14; i++) { const layer = i < 6 ? 0 : i < 11 ? 1 : 2; clouds.push({ x: rnd(-60, W + 60), y: rnd(-40, H + 40), layer, par: [0.45, 0.8, 1.25][layer] }); }
        stars = [];
        for (let i = 0; i < 70; i++) stars.push({ x: rnd(0, W), y: rnd(0, H), par: 0.2 + (i % 3) * 0.25, c: ['#ffffff', '#8080ff', '#ffff80'][i % 3] });
      }
      makeSky();

      // ---------- sound ----------
      const sfx = {
        shot() { au.tone(1300, 0.05, { type: 'square', vol: 0.05, slideTo: 700 }); },
        boom() { au.noise(0.3, { vol: 0.2, freq: 1800, slideTo: 200 }); },
        clank() { au.tone(260, 0.08, { type: 'square', vol: 0.08, slideTo: 180 }); au.noise(0.06, { vol: 0.1, freq: 4000, type: 'highpass' }); },
        bossDie() { au.noise(1.6, { vol: 0.3, freq: 1500, slideTo: 40 }); au.tone(200, 1.4, { type: 'sawtooth', vol: 0.08, slideTo: 40 }); },
        die() { au.noise(1.4, { vol: 0.28, freq: 1200, slideTo: 50 }); au.tone(700, 1.2, { type: 'square', vol: 0.06, slideTo: 60 }); },
        chute(n) { au.melody([[784, .07], [988, .07], [1175, .07], [1568, .07 * (1 + n)]], { type: 'square', vol: 0.08 }); },
        missile() { au.tone(1800, 0.3, { type: 'sine', vol: 0.04, slideTo: 900 }); },
        warp() { au.tone(100, 2.5, { type: 'sawtooth', vol: 0.08, slideTo: 3000 }); au.tone(150, 2.5, { type: 'square', vol: 0.04, slideTo: 4000 }); },
        boss() { au.melody([[392, .15], [370, .15], [392, .15], [370, .15], [392, .3]], { type: 'square', vol: 0.07 }); },
        start() { au.melody([[523, .1], [523, .1], [784, .2], [698, .1], [659, .1], [587, .1], [1047, .3], [784, .15], [880, .15], [988, .15], [1047, .4]], { type: 'square', vol: 0.08 }); },
        coin() { au.tone(1760, 0.06, { type: 'square', vol: 0.07, slideTo: 2640 }); },
        extra() { au.melody([[1047, .08], [1319, .08], [1568, .08], [2093, .2]], { type: 'square', vol: 0.08 }); }
      };

      // ---------- game ----------
      function newGame(demo) {
        g = {
          demo, score: 0, lives: 3, nextExtra: 10000, era: 0, loop: 0, kills: 0, phase: 'intro', phaseT: demo ? 90 : 180,
          wx: 0, wy: 0, dir: 2, turnT: 0, alive: true, deadT: 0, fireT: 0, pb: [], eb: [], en: [], booms: [], pops: [], boss: null,
          chute: null, chuteT: 900, chuteN: 0, spawnT: 60, formT: 500, t: 0, demoT: 0, overPending: false, bossDone: false, aiDir: 2
        };
        makeSky();
        if (!demo) sfx.start();
      }
      const E = () => ERAS[g.era];
      const diff = () => g.loop * 0.25;
      function setupEra() {
        g.kills = 0; g.en = []; g.eb = []; g.pb = []; g.boss = null; g.chute = null; g.chuteT = 700; g.chuteN = 0; g.bossDone = false;
        g.spawnT = 60; g.formT = 500; makeSky();
      }
      function addScore(n) {
        if (g.demo) return;
        g.score += n;
        if (g.score >= g.nextExtra) { g.lives++; g.nextExtra = g.nextExtra === 10000 ? 50000 : g.nextExtra + 50000; sfx.extra(); }
        if (g.score > hi) hi = g.score;
      }
      function boom(x, y, big) { g.booms.push({ x, y, t: 0, big: !!big }); }
      const sx = x => x - g.wx + CX, sy = y => y - g.wy + CY;
      const pvx = () => g.alive ? Math.cos(dirAng(g.dir)) * 1.5 : 0;
      const pvy = () => g.alive ? Math.sin(dirAng(g.dir)) * 1.5 : 0;

      // ---------- enemies ----------
      function spawnEnemy() {
        const a = Math.random() * TAU, d = 170;
        const x = g.wx + Math.cos(a) * d, y = g.wy + Math.sin(a) * d;
        const kind = E().enemy;
        g.en.push({ kind, x, y, a: a + Math.PI + rnd(-0.6, 0.6), sp: E().speed + diff() + rnd(-0.1, 0.2), tr: 0.025 + rnd(0, 0.015) + diff() * 0.02, fireT: 60 + (Math.random() * 90 | 0), form: false, wob: Math.random() * TAU });
      }
      function spawnFormation() {
        const a = Math.random() * TAU, d = 180, head = a + Math.PI + rnd(-0.3, 0.3);
        const px = -Math.sin(head), py = Math.cos(head);
        const kind = E().enemy;
        for (let i = 0; i < 5; i++) {
          const back = Math.abs(i - 2) * 12, side = (i - 2) * 14;
          g.en.push({ kind, x: g.wx + Math.cos(a) * (d + back) + px * side, y: g.wy + Math.sin(a) * (d + back) + py * side, a: head, sp: E().speed + 0.3 + diff(), tr: 0, fireT: 999, form: true, wob: 0 });
        }
      }
      function spawnMissile(x, y, a) {
        if (g.en.filter(e => e.kind === 'missile').length >= 3 + g.loop) return;
        g.en.push({ kind: 'missile', x, y, a, sp: 2.0 + diff() * 0.5, tr: 0.045, life: 220, fireT: 9999, form: false, wob: 0 });
        if (!g.demo) sfx.missile();
      }
      function updEnemy(e) {
        const dx = g.wx - e.x, dy = g.wy - e.y, dist = Math.hypot(dx, dy);
        if (e.kind === 'ufo') {
          e.wob += 0.05;
          const want = Math.atan2(dy, dx) + Math.sin(e.wob) * 1.2;
          e.a += Math.max(-0.08, Math.min(0.08, angDiff(e.a, want)));
        } else if (!e.form) {
          const want = Math.atan2(dy, dx);
          // once past the player keep going a while before turning back (classic dogfight loops)
          e.a += Math.max(-e.tr, Math.min(e.tr, angDiff(e.a, want)));
        }
        if (e.kind === 'missile' && --e.life <= 0) { e.dead = true; boom(e.x, e.y, false); return; }
        e.x += Math.cos(e.a) * e.sp; e.y += Math.sin(e.a) * e.sp;
        if (dist > 280) { e.dead = true; return; }
        if (--e.fireT <= 0 && g.alive && dist < 140) {
          e.fireT = Math.max(50, 140 - g.era * 10 - g.loop * 20) + (Math.random() * 80 | 0);
          if ((e.kind === 'heli' || e.kind === 'jet') && Math.random() < 0.35) spawnMissile(e.x, e.y, e.a);
          else if (Math.abs(angDiff(e.a, Math.atan2(dy, dx))) < 0.9 || e.kind === 'ufo') {
            const b = Math.atan2(dy, dx), v = 2.1 + diff() * 0.6;
            g.eb.push({ x: e.x, y: e.y, vx: Math.cos(b) * v, vy: Math.sin(b) * v, life: 110 });
          }
        }
      }
      function killEnemy(e, byShot) {
        e.dead = true; boom(e.x, e.y, false); sfx.boom();
        addScore(e.kind === 'missile' ? 150 : 100);
        if (e.kind !== 'missile' && byShot) {
          g.kills++;
          if (g.kills >= QUOTA && !g.boss && !g.bossDone) spawnBoss();
        }
      }

      // ---------- boss ----------
      const BOSS_BOX = { blimp: [26, 9], bomber: [20, 14], chopper: [24, 8], bigjet: [26, 16], mother: [28, 12] };
      function spawnBoss() {
        const dir = Math.random() < 0.5 ? 1 : -1;
        const kind = E().boss;
        g.boss = { kind, x: g.wx - dir * 170, y: g.wy + rnd(-70, 70), dir, hp: E().bossHp + g.loop * 2, hitT: 0, fireT: 90, t: 0 };
        if (!g.demo) sfx.boss();
      }
      function updBoss() {
        const b = g.boss; b.t++;
        const sp = b.kind === 'blimp' ? 0.6 : b.kind === 'mother' ? 0.9 : 0.8;
        b.x += b.dir * sp; b.y += Math.sin(b.t * 0.02) * 0.3;
        if (b.hitT > 0) b.hitT--;
        const dx = b.x - g.wx, dy = b.y - g.wy;
        // drifted out of range: come around again from the other side
        if (Math.abs(dx) > 260 || Math.abs(dy) > 220) { b.dir = dx > 0 ? -1 : 1; b.x = g.wx - b.dir * 170; b.y = g.wy + rnd(-70, 70); }
        if (--b.fireT <= 0 && g.alive && Math.abs(dx) < 140 && Math.abs(dy) < 140) {
          b.fireT = Math.max(30, 80 - g.loop * 10) + (Math.random() * 40 | 0);
          if (b.kind === 'chopper' || b.kind === 'bigjet') spawnMissile(b.x, b.y, Math.atan2(-dy, -dx));
          else { const a = Math.atan2(-dy, -dx); for (const o of b.kind === 'mother' ? [-0.3, 0, 0.3] : [0]) g.eb.push({ x: b.x, y: b.y, vx: Math.cos(a + o) * 2, vy: Math.sin(a + o) * 2, life: 120 }); }
        }
      }
      function hitBoss() {
        const b = g.boss; b.hp--; b.hitT = 6; sfx.clank();
        if (b.hp <= 0) {
          addScore(E().bossPts + g.loop * 1000);
          g.pops.push({ x: b.x, y: b.y, txt: String(E().bossPts + g.loop * 1000), t: 120 });
          for (let i = 0; i < 8; i++) boom(b.x + rnd(-20, 20), b.y + rnd(-10, 10), true);
          sfx.bossDie();
          g.boss = null; g.bossDone = true;
          g.phase = 'bossdown'; g.phaseT = 120;
        }
      }

      // ---------- player ----------
      function killPlayer() {
        if (!g.alive) return;
        g.alive = false; g.deadT = 0; g.lives--;
        boom(g.wx, g.wy, true); sfx.die();
      }
      function gameOver() {
        if (!g.demo) api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 240;
      }
      function lastLife() {
        if (g.demo) { g.phase = 'over'; g.phaseT = 60; return; }
        if (!api.offerContinue) { gameOver(); return; }
        const cg = g;
        api.offerContinue(() => { if (g === cg) { g.lives = 3; respawn(); } }, () => { if (g === cg) gameOver(); });
      }
      function respawn() {
        g.alive = true; g.overPending = false; g.en = []; g.eb = []; g.pb = []; g.spawnT = 90; g.dir = 2;
        if (g.boss) { g.boss.x = g.wx - g.boss.dir * 170; }
        g.phase = 'ready'; g.phaseT = 90;
      }

      function readCtl() {
        if (!g.demo) {
          const u = api.key('ArrowUp'), d = api.key('ArrowDown'), l = api.key('ArrowLeft'), r = api.key('ArrowRight');
          return { dx: (r ? 1 : 0) - (l ? 1 : 0), dy: (d ? 1 : 0) - (u ? 1 : 0), fire: api.key('Space') || api.key('KeyZ') };
        }
        // attract pilot: turn toward the nearest target and shoot
        let best = null, bd = 1e9;
        for (const e of g.en) { const d = Math.hypot(e.x - g.wx, e.y - g.wy); if (d < bd) { bd = d; best = e; } }
        if (g.boss) best = g.boss;
        if (best) { const a = Math.atan2(best.y - g.wy, best.x - g.wx); g.aiDir = angIdx(a); }
        else if (frame % 120 === 0) g.aiDir = Math.random() * 16 | 0;
        return { want: g.aiDir, fire: true };
      }

      function updPlay() {
        const c = readCtl();
        if (g.alive) {
          let want = c.want;
          if (want == null && (c.dx || c.dy)) want = angIdx(Math.atan2(c.dy, c.dx));
          if (want != null && want !== g.dir) {
            if (++g.turnT >= 4) {
              g.turnT = 0;
              let d = (want - g.dir + 16) % 16;
              g.dir = (g.dir + (d <= 8 ? 1 : 15)) % 16;
            }
          } else g.turnT = 3;
          g.wx += pvx(); g.wy += pvy();
          if (g.fireT > 0) g.fireT--;
          if (c.fire && g.fireT === 0 && g.pb.length < 8) {
            g.fireT = 6;
            const a = dirAng(g.dir);
            g.pb.push({ x: g.wx + Math.cos(a) * 7, y: g.wy + Math.sin(a) * 7, vx: Math.cos(a) * 4.5 + pvx(), vy: Math.sin(a) * 4.5 + pvy(), life: 34 });
            if (!g.demo) sfx.shot();
          }
        } else {
          g.deadT++;
          if (g.deadT === 150) {
            if (g.lives > 0) respawn();
            else if (!g.overPending) { g.overPending = true; lastLife(); }
          }
        }
        // spawns
        const maxE = 6 + g.era + g.loop * 2;
        const planes = g.en.filter(e => e.kind !== 'missile').length;
        if (--g.spawnT <= 0) { g.spawnT = Math.max(20, 55 - g.era * 4 - g.loop * 8); if (planes < maxE && g.alive) spawnEnemy(); }
        if (--g.formT <= 0) { g.formT = 420 + (Math.random() * 300 | 0); if (g.alive && E().enemy !== 'ufo') spawnFormation(); }
        // parachuting pilots
        if (!g.chute && --g.chuteT <= 0 && g.alive) {
          const a = Math.random() * TAU;
          g.chute = { x: g.wx + Math.cos(a) * 110, y: g.wy + Math.sin(a) * 90 - 20, t: 0 };
        }
        if (g.chute) {
          const ch = g.chute; ch.t++; ch.y += 0.35; ch.x += Math.sin(ch.t * 0.04) * 0.3;
          if (g.alive && Math.abs(ch.x - g.wx) < 10 && Math.abs(ch.y - g.wy) < 10) {
            g.chuteN = Math.min(5, g.chuteN + 1); const pts = g.chuteN * 1000;
            addScore(pts); g.pops.push({ x: ch.x, y: ch.y, txt: String(pts), t: 90 }); sfx.chute(g.chuteN);
            g.chute = null; g.chuteT = 600 + (Math.random() * 400 | 0);
          } else if (Math.hypot(ch.x - g.wx, ch.y - g.wy) > 300) { g.chute = null; g.chuteT = 400; }
        }

        for (const e of g.en) updEnemy(e);
        if (g.boss) updBoss();
        // player bullets
        for (const b of g.pb) {
          b.x += b.vx; b.y += b.vy; b.life--;
          for (const e of g.en) if (!e.dead && Math.abs(e.x - b.x) < 7 && Math.abs(e.y - b.y) < 7) { killEnemy(e, true); b.life = 0; break; }
          if (b.life > 0 && g.boss) { const [hw, hh] = BOSS_BOX[g.boss.kind]; if (Math.abs(g.boss.x - b.x) < hw && Math.abs(g.boss.y - b.y) < hh) { b.life = 0; hitBoss(); } }
        }
        g.pb = g.pb.filter(b => b.life > 0);
        // enemy bullets
        for (const b of g.eb) { b.x += b.vx; b.y += b.vy; b.life--; if (g.alive && Math.abs(b.x - g.wx) < 3.5 && Math.abs(b.y - g.wy) < 3.5) { b.life = 0; killPlayer(); } }
        g.eb = g.eb.filter(b => b.life > 0);
        if (g.alive) {
          for (const e of g.en) if (!e.dead && Math.abs(e.x - g.wx) < 8 && Math.abs(e.y - g.wy) < 8) { killEnemy(e, false); killPlayer(); break; }
          if (g.alive && g.boss) { const [hw, hh] = BOSS_BOX[g.boss.kind]; if (Math.abs(g.boss.x - g.wx) < hw && Math.abs(g.boss.y - g.wy) < hh) killPlayer(); }
        }
        g.en = g.en.filter(e => !e.dead);
        // engine drone
        if (g.alive && g.t % 12 === 0 && !g.demo) au.tone(g.era === 4 ? 70 : 55 + g.era * 6, 0.2, { type: 'sawtooth', vol: 0.025 });
      }

      function updGame() {
        g.t++;
        for (const b of g.booms) b.t++;
        g.booms = g.booms.filter(b => b.t < (b.big ? 50 : 24));
        for (const p of g.pops) p.t--;
        g.pops = g.pops.filter(p => p.t > 0);
        if (g.phase === 'over') { if (--g.phaseT <= 0) { mode = 'title'; titleT = 0; } return; }
        if (g.phase === 'intro' || g.phase === 'ready') {
          if (g.phase === 'intro') { g.wx += pvx(); g.wy += pvy(); }
          if (--g.phaseT <= 0) g.phase = 'play';
          if (g.phase === 'ready') updPlay();
          return;
        }
        if (g.phase === 'bossdown') {
          // remaining enemies flee while the plane keeps flying
          g.wx += pvx(); g.wy += pvy();
          for (const e of g.en) { e.x += Math.cos(e.a) * e.sp; e.y += Math.sin(e.a) * e.sp; }
          if (--g.phaseT <= 0) { g.phase = 'warp'; g.phaseT = 180; g.en = []; g.eb = []; g.pb = []; if (!g.demo) sfx.warp(); }
          return;
        }
        if (g.phase === 'warp') {
          if (--g.phaseT <= 0) {
            g.era++; if (g.era >= ERAS.length) { g.era = 0; g.loop++; }
            setupEra(); g.phase = 'intro'; g.phaseT = 150;
          }
          return;
        }
        if (g.demo && ++g.demoT > 2400) { mode = 'title'; titleT = 0; return; }
        updPlay();
      }

      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 });
        return false;
      }
      let titleDir = 0;
      function update() {
        frame++;
        if (api.credits > lastCred) sfx.coin(); lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title' || mode === 'demo') {
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(false); setupEra(); return; }
        }
        if (mode === 'title') {
          titleT++;
          if (titleT % 20 === 0) titleDir = (titleDir + 1) % 16;
          for (const c of clouds) { c.y += c.par * 0.8; if (c.y > H + 40) { c.y -= H + 80; c.x = rnd(-60, W + 60); } }
          if (titleT > 700) { mode = 'demo'; newGame(true); setupEra(); }
          return;
        }
        // parallax scrolling of clouds / stars follows the plane's motion
        const vx = g.alive && g.phase !== 'warp' ? pvx() : 0, vy = g.alive && g.phase !== 'warp' ? pvy() : 0;
        for (const c of clouds) {
          c.x -= vx * c.par; c.y -= vy * c.par;
          if (c.x < -70) c.x += W + 140; if (c.x > W + 70) c.x -= W + 140;
          if (c.y < -50) c.y += H + 100; if (c.y > H + 50) c.y -= H + 100;
        }
        for (const s of stars) { s.x = (s.x - vx * s.par + W) % W; s.y = (s.y - vy * s.par + H) % H; }
        updGame();
      }

      // ---------- drawing ----------
      function drawClouds(ctx, layers, era) {
        const set = CLOUDS[era];
        if (!set) return;
        for (const c of clouds) if (layers.includes(c.layer)) { const s = set[c.layer]; ctx.drawImage(s, Math.round(c.x - s.width / 2), Math.round(c.y - s.height / 2)); }
      }
      function drawRotor(ctx, x, y, len, t, col) {
        const a = t * 0.6;
        ctx.fillStyle = col;
        for (let i = -len; i <= len; i++) {
          ctx.fillRect(Math.round(x + Math.cos(a) * i), Math.round(y + Math.sin(a) * i), 1, 1);
          ctx.fillRect(Math.round(x + Math.cos(a + Math.PI / 2) * i), Math.round(y + Math.sin(a + Math.PI / 2) * i), 1, 1);
        }
      }
      function drawEnemy(ctx, e) {
        const x = Math.round(sx(e.x)), y = Math.round(sy(e.y));
        if (x < -20 || x > W + 20 || y < -20 || y > H + 20) return;
        if (e.kind === 'ufo') { const s = UFO[(g.t >> 3) & 1]; ctx.drawImage(s, x - 5, y - 3); return; }
        const set = ESET[e.kind], s = set[angIdx(e.a)];
        ctx.drawImage(s, x - (s.width >> 1), y - (s.height >> 1));
        if (e.kind === 'heli') drawRotor(ctx, x, y, 7, g.t, '#e0e0e0');
      }
      function fillE(ctx, cx, cy, rx, ry, col) { // pixel ellipse
        ctx.fillStyle = col;
        for (let yy = -ry; yy <= ry; yy++) { const w = Math.round(rx * Math.sqrt(1 - (yy * yy) / (ry * ry))); ctx.fillRect(cx - w, cy + yy, w * 2 + 1, 1); }
      }
      function drawBoss(ctx, b, X, Y, flashOn) {
        const d = b.dir, k = b.kind;
        const c1 = flashOn ? '#ffffff' : null;
        if (k === 'blimp') {
          fillE(ctx, X, Y, 26, 8, c1 || '#a8a890');
          fillE(ctx, X - d * 4, Y - 3, 18, 3, c1 || '#d0d0b8');
          ctx.fillStyle = c1 || '#808070'; ctx.fillRect(X - d * 26 - (d > 0 ? 4 : 0), Y - 10, 5, 20);
          ctx.fillStyle = c1 || '#604020'; ctx.fillRect(X - 6, Y + 8, 12, 4);
          ctx.fillStyle = '#ff3030'; for (let i = -2; i <= 2; i++) ctx.fillRect(X + i * 8, Y, 2, 2);
        } else if (k === 'bomber') {
          ctx.fillStyle = c1 || '#4a7040'; ctx.fillRect(X - 20, Y - 3, 40, 6);           // fuselage
          ctx.fillRect(X - d * 4 - 3, Y - 14, 8, 28);                                   // wing
          ctx.fillRect(X - d * 18 - 2, Y - 7, 4, 14);                                   // tailplane
          ctx.fillStyle = c1 || '#2c4a28'; ctx.fillRect(X - d * 4 - 6, Y - 10, 3, 4); ctx.fillRect(X - d * 4 - 6, Y + 6, 3, 4);
          ctx.fillStyle = '#a0e0ff'; ctx.fillRect(X + d * 17 - 1, Y - 2, 3, 4);
          drawRotor(ctx, X - d * 4 + d * 4, Y - 8, 3, g.t, '#ffffff'); drawRotor(ctx, X - d * 4 + d * 4, Y + 8, 3, g.t, '#ffffff');
        } else if (k === 'chopper') {
          ctx.fillStyle = c1 || '#6a7a3a'; ctx.fillRect(X - 22, Y - 5, 44, 10);
          fillE(ctx, X + d * 22, Y, 4, 5, c1 || '#6a7a3a');
          ctx.fillStyle = '#a0e0ff'; ctx.fillRect(X + d * 20 - 1, Y - 3, 3, 6);
          drawRotor(ctx, X - 16, Y, 12, g.t, '#e8e8e8'); drawRotor(ctx, X + 16, Y, 12, g.t + 3, '#e8e8e8');
        } else if (k === 'bigjet') {
          ctx.fillStyle = c1 || '#9090a8'; ctx.fillRect(X - 26, Y - 3, 52, 6);
          for (let i = 0; i < 14; i++) { ctx.fillRect(X - d * i - 2, Y - 4 - i, 5, 1); ctx.fillRect(X - d * i - 2, Y + 4 + i, 5, 1); }
          ctx.fillRect(X - d * 24 - 2, Y - 8, 4, 16);
          ctx.fillStyle = c1 || '#606078'; for (const o of [-9, -5, 5, 9]) ctx.fillRect(X - d * Math.abs(o) * 0.8 - 2, Y + o, 4, 2);
          ctx.fillStyle = '#ff3030'; ctx.fillRect(X + d * 25 - 1, Y - 1, 2, 2);
        } else {
          fillE(ctx, X, Y + 2, 28, 7, c1 || '#8888a0');
          fillE(ctx, X, Y - 4, 14, 7, c1 || '#40c0ff');
          for (let i = 0; i < 8; i++) { ctx.fillStyle = ((g.t >> 2) + i) % 3 ? '#ff3030' : '#ffe040'; ctx.fillRect(X - 24 + i * 7, Y + 2, 3, 2); }
        }
        // damage meter
        const hpMax = E().bossHp + g.loop * 2;
        ctx.fillStyle = '#000'; ctx.fillRect(X - 15, Y - 22, 30, 3);
        ctx.fillStyle = '#ff3030'; ctx.fillRect(X - 15, Y - 22, Math.round(30 * b.hp / hpMax), 3);
      }
      function drawBoom(ctx, b) {
        const x = sx(b.x), y = sy(b.y);
        const n = b.big ? 14 : 9, r = 1 + b.t * (b.big ? 0.6 : 0.5);
        const cols = ['#ffffff', '#ffe040', '#ff8000', '#ff3030', '#606060'];
        for (let k = 0; k < n; k++) {
          const a = k * TAU / n + (k & 1) * 0.3;
          for (let j = 0; j < 3; j++) {
            ctx.fillStyle = cols[Math.min(4, j + (b.t >> 3))];
            const rr = r * (1 - j * 0.3), s = b.t < 12 ? 2 : 1;
            ctx.fillRect(Math.round(x + Math.cos(a) * rr), Math.round(y + Math.sin(a) * rr), s, s);
          }
        }
      }
      function drawHUD(ctx) {
        text(ctx, '1-UP', 8, 2, '#ff4040');
        text(ctx, String(g && mode !== 'title' && !g.demo ? g.score : 0), 8, 11, '#ffffff');
        text(ctx, 'HI-SCORE', W - 8, 2, '#ff4040', { right: true });
        text(ctx, String(hi), W - 8, 11, '#ffffff', { right: true });
      }
      function drawBottom(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, H - 16, W, 16);
        text(ctx, 'A.D.' + E().year, 4, H - 12, '#ffe040');
        // kill progress bar
        const bx = 76, bw = 90;
        ctx.fillStyle = '#404040'; ctx.fillRect(bx, H - 11, bw, 5);
        ctx.fillStyle = g.kills >= QUOTA ? ((frame >> 3) & 1 ? '#ff3030' : '#ffe040') : '#40ff40';
        ctx.fillRect(bx, H - 11, Math.round(bw * Math.min(1, g.kills / QUOTA)), 5);
        for (let i = 0; i < Math.min(5, g.alive ? g.lives - 1 : g.lives); i++) ctx.drawImage(MINI, W - 8 - i * 7, H - 12);
        // era stage markers
        for (let i = 0; i < 5; i++) { ctx.fillStyle = i < g.era ? '#ffe040' : i === g.era ? '#ffffff' : '#505050'; ctx.fillRect(bx + 4 + i * 18, H - 4, 10, 2); }
      }
      function drawTitle(ctx) {
        ctx.fillStyle = ERAS[0].sky; ctx.fillRect(0, 0, W, H);
        drawClouds(ctx, [0, 1], 0);
        const s = PSET[titleDir]; ctx.drawImage(s, CX - (s.width >> 1), 150 - (s.height >> 1));
        drawClouds(ctx, [2], 0);
        text(ctx, 'TIME', W / 2 + 2, 38, '#1c3c80', { center: true, scale: 3 });
        text(ctx, 'TIME', W / 2, 36, '#ffe040', { center: true, scale: 3 });
        text(ctx, 'PILOT', W / 2 + 2, 66, '#1c3c80', { center: true, scale: 3 });
        text(ctx, 'PILOT', W / 2, 64, '#ff4040', { center: true, scale: 3 });
        const page = Math.floor(titleT / 350) % 2;
        if (page === 0) {
          ERAS.forEach((e, i) => text(ctx, 'A.D.' + e.year + '  ' + e.bossName, 24, 98 + i * 11, '#ffffff'));
        } else {
          text(ctx, 'DOWN ' + QUOTA + ' ENEMIES', W / 2, 100, '#ffffff', { center: true });
          text(ctx, 'THEN DESTROY THE BOSS', W / 2, 112, '#ffffff', { center: true });
          ctx.drawImage(CHUTE, 40, 124); text(ctx, 'RESCUE 1000-5000', 120, 126, '#ffe040', { center: true });
        }
        if (api.credits === 0) { if (coinFlash > 0 || ((frame >> 5) & 1)) text(ctx, 'INSERT COIN', W / 2, 186, coinFlash && ((frame >> 2) & 1) ? '#ffe040' : '#ff4040', { center: true }); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START BUTTON', W / 2, 186, '#ffffff', { center: true });
        text(ctx, '1ST BONUS 10000 PTS', W / 2, 204, '#ffffff', { center: true });
        text(ctx, 'AND EVERY 50000 PTS', W / 2, 214, '#ffffff', { center: true });
        text(ctx, '\u00a9 KONAMI 1982', W / 2, 230, '#ffe040', { center: true });
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W / 2, H - 10, '#ffffff', { center: true });
        drawHUD(ctx);
      }
      function render(ctx) {
        if (mode === 'title') { drawTitle(ctx); return; }
        const era = g.era;
        if (g.phase === 'warp') {
          const t = 180 - g.phaseT;
          ctx.fillStyle = (t >> 2) & 1 ? '#000020' : '#200040'; ctx.fillRect(0, 0, W, H);
          const cols = ['#ff3030', '#ffe040', '#40ff40', '#40c0ff', '#c040ff', '#ffffff'];
          for (let i = 0; i < 40; i++) {
            const a = i * TAU / 40 + t * 0.02, r0 = (t * 3 + i * 17) % 160;
            ctx.fillStyle = cols[i % 6];
            for (let k = 0; k < 6; k++) ctx.fillRect(Math.round(CX + Math.cos(a) * (r0 + k * 3)), Math.round(CY + Math.sin(a) * (r0 + k * 3)), 2, 2);
          }
          const s = PSET[(t >> 2) % 16]; ctx.drawImage(s, CX - (s.width >> 1), CY - (s.height >> 1));
          text(ctx, 'TIME WARP', W / 2, 60, '#ffffff', { center: true, scale: 2 });
          const ny = ERAS[(era + 1) % ERAS.length].year;
          if (t > 60) text(ctx, 'A.D. ' + (ny === 1910 ? 1910 : ny), W / 2, 200, '#ffe040', { center: true, scale: 2 });
          drawHUD(ctx);
          return;
        }
        ctx.fillStyle = ERAS[era].sky; ctx.fillRect(0, 0, W, H);
        if (!ERAS[era].cloud) for (const s of stars) { ctx.fillStyle = s.c; ctx.fillRect(s.x | 0, s.y | 0, 1, 1); }
        drawClouds(ctx, [0, 1], era);
        if (g.chute) {
          const x = Math.round(sx(g.chute.x)), y = Math.round(sy(g.chute.y));
          ctx.drawImage(CHUTE, x - 4, y - 5);
        }
        if (g.boss) {
          const X = Math.round(sx(g.boss.x)), Y = Math.round(sy(g.boss.y));
          if (X > -60 && X < W + 60 && Y > -40 && Y < H + 40) drawBoss(ctx, g.boss, X, Y, g.boss.hitT > 0 && (g.boss.hitT & 2));
        }
        for (const e of g.en) drawEnemy(ctx, e);
        if (g.alive) { const s = PSET[g.dir]; ctx.drawImage(s, CX - (s.width >> 1), CY - (s.height >> 1)); }
        ctx.fillStyle = '#ffffff';
        for (const b of g.pb) ctx.fillRect(Math.round(sx(b.x)) - 1, Math.round(sy(b.y)) - 1, 2, 2);
        for (const b of g.eb) { ctx.fillStyle = (g.t >> 2) & 1 ? '#ff3030' : '#ffe040'; ctx.fillRect(Math.round(sx(b.x)) - 1, Math.round(sy(b.y)) - 1, 2, 2); }
        for (const b of g.booms) drawBoom(ctx, b);
        drawClouds(ctx, [2], era);
        for (const p of g.pops) text(ctx, p.txt, sx(p.x), sy(p.y) - 12, '#ffffff', { center: true, adv: 6 });
        // off-screen boss indicator
        if (g.boss) {
          const X = sx(g.boss.x), Y = sy(g.boss.y);
          if (X < 0 || X > W || Y < 20 || Y > H - 16) {
            const a = Math.atan2(Y - CY, X - CX), ix = Math.round(CX + Math.cos(a) * 96), iy = Math.round(CY + Math.sin(a) * 100);
            if ((frame >> 3) & 1) { ctx.fillStyle = '#ff3030'; ctx.fillRect(ix - 2, iy - 2, 5, 5); }
          }
        }
        if (g.phase === 'intro') {
          text(ctx, 'STAGE ' + (g.loop * 5 + era + 1), W / 2, 70, '#ffffff', { center: true });
          text(ctx, 'A.D. ' + ERAS[era].year, W / 2, 86, '#ffe040', { center: true, scale: 2 });
          if (!g.demo && g.loop === 0 && era === 0) text(ctx, 'PLAYER 1', W / 2, 180, '#ff4040', { center: true });
        }
        if (g.phase === 'ready') text(ctx, 'READY', W / 2, 100, '#ffffff', { center: true });
        if (g.kills >= QUOTA && g.boss && (frame >> 4) & 1) text(ctx, E().bossName + ' APPROACHING', W / 2, 26, '#ff3030', { center: true, adv: 7 });
        if (g.phase === 'over') text(ctx, 'GAME OVER', W / 2, 100, '#ffffff', { center: true, scale: 2 });
        if (g.demo) {
          text(ctx, 'DEMONSTRATION', W / 2, 190, '#ffffff', { center: true });
          if ((frame >> 5) & 1) text(ctx, api.credits ? 'PUSH START BUTTON' : 'INSERT COIN', W / 2, 204, '#ffe040', { center: true });
        }
        drawBottom(ctx);
        drawHUD(ctx);
      }

      if (api.debugHook) api.debugHook({ g: () => g, mode: () => mode });
      return { update, render, destroy() { } };
    }
  });
})();
