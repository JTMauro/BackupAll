// Bionic Commando (Capcom, 1987) -- from-scratch recreation for the MAME32 Game Room.
// The commando cannot jump: fire the bionic arm to grab platforms, pull up, swing across gaps.
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
  const pair = (rows, pal) => [spr(rows, pal), spr(mirror(rows), pal)];

  // commando, faces right
  const C_TOP = ['....RRRR....', '...RRRRRR...', '...RSSSSR...', '....SSKS....', '....SSSS....', '..GGGGGGG...', '.GGGGGGGGM..', '.GGGGGGGMMM.', '.SGGGGGG.MM.', '..GGGGGG....', '..YYYYYY....'];
  const C_STAND = C_TOP.concat(['..GGGGGG....', '..GG..GG....', '..GG..GG....', '..GG..GG....', '..GG..GG....', '.KKK..KKK...', '.KKK..KKK...']);
  const C_WALK = C_TOP.concat(['..GGGGGG....', '.GGG..GG....', 'GGG....GG...', 'GG.....GG...', 'KK......GG..', 'KKK.....KKK.', '.........KK.']);
  const C_HANG = ['.........MM.', '....RRRRMM..', '...RRRRRRM..', '...RSSSSRM..', '....SSKSM...', '....SSSSM...', '..GGGGGGG...', '.GGGGGGGG...', '.GGGGGGG....', '.SGGGGGG....', '..GGGGGG....', '..YYYYYY....', '..GGGGGG....', '...GG.GG....', '...GG..GG...', '..GG....GG..', '..GG....GG..', '.KKK....KKK.', '.KK......KK.'];
  const CPAL = { R: '#e04020', S: '#f0b080', K: '#302010', G: '#30903a', M: '#a0a8b8', Y: '#c0a030' };
  const E_TOP = ['....HHHH....', '...HHHHHH...', '...HSSSSH...', '....SSKS....', '....SSSS....', '..UUUUUUU...', '.UUUUUUUUWWW', '.UUUUUUUW...', '.SUUUUUU....', '..UUUUUU....', '..KKKKKK....'];
  const E_STAND = E_TOP.concat(['..UUUUUU....', '..UU..UU....', '..UU..UU....', '..UU..UU....', '..UU..UU....', '.KKK..KKK...', '.KKK..KKK...']);
  const E_WALK = E_TOP.concat(['..UUUUUU....', '.UUU..UU....', 'UUU....UU...', 'UU.....UU...', 'KK......UU..', 'KKK.....KKK.', '.........KK.']);
  const EPALS = [{ H: '#5a6a30', S: '#e0a070', K: '#202018', U: '#8a7a50', W: '#404040' }, { H: '#404858', S: '#e0a070', K: '#101010', U: '#6070a0', W: '#303030' }, { H: '#702020', S: '#e0a070', K: '#101010', U: '#a04040', W: '#303030' }];

  const W = 256, H = 224, T = 16, COLS = 16;

  ArcadeRegistry.register({
    id: 'bioniccommando', title: 'Bionic Commando', year: 1987, maker: 'Capcom',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Left/Right: walk \u00b7 X: bionic arm (diagonal; hold Up: straight up) \u00b7 while hooked: Up climb, Left/Right swing, X release \u00b7 Space: fire (Up+Space: fire up) \u00b7 Down+X: drop \u00b7 Enter: start',
    marquee: { bg: '#102010', fg: '#40e040', accent: '#ffd040' },
    create(api) {
      const au = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      const ri = n => Math.random() * n | 0;
      const snd = {
        shot() { au.tone(900, 0.05, { type: 'square', vol: 0.06, slideTo: 300 }); au.noise(0.03, { vol: 0.05, freq: 2500 }); },
        arm() { au.tone(400, 0.12, { type: 'sawtooth', vol: 0.06, slideTo: 1200 }); },
        clank() { au.tone(1600, 0.04, { type: 'square', vol: 0.08 }); au.noise(0.03, { vol: 0.06, freq: 4000, type: 'highpass' }); },
        pull() { au.tone(600, 0.15, { type: 'triangle', vol: 0.06, slideTo: 300 }); },
        eshot() { au.tone(500, 0.06, { type: 'square', vol: 0.05, slideTo: 200 }); },
        kill() { au.tone(300, 0.2, { type: 'sawtooth', vol: 0.1, slideTo: 60 }); au.noise(0.1, { vol: 0.1, freq: 1500 }); },
        boom() { au.noise(0.4, { vol: 0.2, freq: 900, slideTo: 60 }); },
        item() { au.melody([[880, .05], [1109, .05], [1319, .05], [1760, .12]], { type: 'square', vol: 0.12 }); },
        die() { au.melody([[587, .12], [554, .12], [523, .12], [494, .12], [392, .5]], { type: 'triangle', vol: 0.2 }); },
        clear() { au.melody([[523, .1], [659, .1], [784, .1], [1047, .25], [784, .1], [1047, .5]], { type: 'square', vol: 0.12 }); },
        rotor() { au.noise(0.05, { vol: 0.03, freq: 300 }); }
      };
      const SP = { stand: pair(C_STAND, CPAL), walk: pair(C_WALK, CPAL), hang: pair(C_HANG, CPAL) };
      const ESP = EPALS.map(p => ({ stand: pair(E_STAND, p), walk: pair(E_WALK, p) }));

      const THEMES = [
        { name: 'THE FOREST', sky: ['#082010', '#0c3018', '#104020', '#185028'], trunk: '#4a3018', trunk2: '#3a2410', plat: '#7a5028', plat2: '#4a3018', leaf: '#2a7030', boss: 'trooper', bname: 'HEAVY TROOPER', tiers: 26 },
        { name: 'ENEMY BASE', sky: ['#101828', '#182438', '#203048', '#283c58'], trunk: '#404858', trunk2: '#303440', plat: '#a0a8b8', plat2: '#606878', leaf: '#ffd040', boss: 'copter', bname: 'GUNSHIP', tiers: 30 },
        { name: 'THE FORTRESS', sky: ['#200810', '#301018', '#401820', '#502028'], trunk: '#605048', trunk2: '#403430', plat: '#c08060', plat2: '#704030', leaf: '#ff4040', boss: 'mech', bname: 'WALKER MECH', tiers: 34 }
      ];

      let hi = api.getHiScore(30000), mode = 'title', titleT = 0, frame = 0, coinFlash = 0;
      let g = null;
      function tryStart() {
        if (api.useCredit()) { newGame(); return; }
        coinFlash = 90; au.tone(110, 0.25, { type: 'square', vol: 0.15 });
      }
      function newGame() {
        g = { score: 0, lives: 3, stage: 0, loop: 0, nextExtra: 30000, gun: 'normal' };
        mode = 'game'; startStage();
      }
      function th() { return THEMES[g.stage]; }
      function diff() { return g.stage + g.loop * 3; }
      function addScore(n, x, y) {
        g.score += n; if (g.score > hi) hi = g.score;
        if (x != null) g.pops.push({ x, y, t: 40, s: String(n) });
        while (g.score >= g.nextExtra) { g.lives++; g.nextExtra += g.nextExtra < 50000 ? 50000 : 80000; snd.item(); }
      }

      // ---------- level ----------
      function genLevel() {
        const tiers = th().tiers + g.loop * 4;
        const rows = 14 + tiers * 3 + 2;
        const map = new Uint8Array(COLS * rows);
        const set = (x, y) => { if (x >= 0 && x < COLS && y >= 0 && y < rows) map[y * COLS + x] = 1; };
        const spawns = [];
        // ground
        for (let x = 0; x < COLS; x++) set(x, rows - 1);
        let mx0 = 5, mx1 = 10; // main path platform span on previous tier
        let row = rows - 1;
        const d = diff();
        for (let t = 0; t < tiers; t++) {
          row -= 3 + (t % 4 === 3 ? 1 : 0);
          if (row < 15) break;
          // main platform overlapping (or diagonally reachable from) the previous one
          const len = 3 + ri(5);
          let x0;
          if (Math.random() < 0.3) x0 = Math.random() < 0.5 ? mx0 - len - 1 : mx1 + 2; // offset: needs a diagonal grab
          else x0 = mx0 + ri(Math.max(1, mx1 - mx0 + 1)) - ri(len - 1);
          x0 = Math.max(0, Math.min(COLS - len, x0));
          for (let x = x0; x < x0 + len; x++) set(x, row);
          // extras
          const extras = ri(3);
          const occupied = [[x0, x0 + len - 1]];
          for (let k = 0; k < extras; k++) {
            const l2 = 2 + ri(4), e0 = ri(COLS - l2 + 1);
            if (occupied.some(([a, b]) => e0 <= b + 2 && e0 + l2 - 1 >= a - 2)) continue;
            const off = Math.random() < 0.5 ? 0 : -1; for (let x = e0; x < e0 + l2; x++) set(x, row + off);
            occupied.push([e0, e0 + l2 - 1]);
          }
          // enemies
          if (t > 0 && Math.random() < 0.55 + Math.min(0.3, d * 0.08)) {
            const [a, b] = occupied[ri(occupied.length)];
            const r = Math.random();
            spawns.push({ k: r < 0.6 ? 'sold' : r < 0.85 && d > 0 ? 'gren' : 'sold', x: (a + ri(b - a + 1)) * T + 8, y: row * T, row });
          }
          if (t > 2 && Math.random() < 0.18) spawns.push({ k: 'turret', x: Math.random() < 0.5 ? 6 : W - 6, y: row * T - 30, row: row - 2 });
          if (Math.random() < 0.12) spawns.push({ k: 'crate', x: (x0 + (len >> 1)) * T + 8, y: row * T - 40, row: row - 3 });
          mx0 = x0; mx1 = x0 + len - 1;
        }
        // boss arena at the top: wide floor
        const ar = 12;
        for (let r = 0; r <= ar; r++) for (let x = 0; x < COLS; x++) map[r * COLS + x] = 0;
        for (let x = 0; x < COLS; x++) set(x, ar);
        // a ledge stair from the last tier into the arena
        let r2 = row - 3;
        while (r2 > ar + 1) { const x0 = Math.max(0, Math.min(COLS - 5, mx0 + ri(3) - 1)); for (let x = x0; x < x0 + 5; x++) set(x, r2); mx0 = x0; r2 -= 3; }
        for (let x = 2; x < 6; x++) set(x, 8); for (let x = 10; x < 14; x++) set(x, 8);
        g.map = map; g.rows = rows; g.spawns = spawns.sort((a, b) => b.row - a.row); g.spawnI = 0;
        g.arenaY = (ar + 1) * T;
      }
      function plat(tx, ty) {
        if (tx < 0 || tx >= COLS || ty < 0 || ty >= g.rows) return false;
        return g.map[ty * COLS + tx] === 1;
      }
      function platUnder(x, y0, y1, hw) {
        // landing test for feet moving from y0 to y1 (y1 > y0): returns surface y or -1
        const r0 = Math.floor(y0 / T) + (y0 % T === 0 ? 0 : 1), r1 = Math.floor(y1 / T);
        for (let r = Math.max(0, r0); r <= r1; r++) {
          if (r * T < y0 - 0.01) continue;
          for (let tx = Math.floor((x - hw) / T); tx <= Math.floor((x + hw) / T); tx++) if (plat(tx, r)) return r * T;
        }
        return -1;
      }
      function standing(o, hw) { const r = Math.round(o.y / T); if (Math.abs(r * T - o.y) > 0.5) return false; for (let tx = Math.floor((o.x - hw) / T); tx <= Math.floor((o.x + hw) / T); tx++) if (plat(tx, r)) return true; return false; }

      function startStage() {
        genLevel();
        const y0 = (g.rows - 1) * T;
        g.p = { x: W / 2, y: y0, vx: 0, vy: 0, face: 1, st: 'ground', anim: 0, inv: 90, cd: 0, drop: 0, safeX: W / 2, safeY: y0 };
        g.arm = null;
        g.cy = y0 - H + 40; g.en = []; g.pb = []; g.eb = []; g.items = []; g.fx = []; g.pops = [];
        g.boss = null; g.locked = false; g.phase = 'intro'; g.phaseT = 150; g.paraT = 300;
        au.melody([[392, .1], [392, .1], [523, .2], [392, .1], [587, .2], [523, .1], [659, .4]], { type: 'square', vol: 0.11 });
      }

      // ---------- player & arm ----------
      function shoulder() { const p = g.p; return { x: p.x + p.face * 3, y: p.y - 14 }; }
      function fireArm() {
        const p = g.p;
        const up = api.key('ArrowUp');
        const dx = up ? 0 : p.face * 0.7071, dy = up ? -1 : -0.7071;
        const s = shoulder();
        g.arm = { st: 'out', dx, dy, len: 0, max: 70, ax: s.x, ay: s.y, up };
        snd.arm();
      }
      function armTip() { const s = shoulder(), a = g.arm; if (a.st === 'hook') return { x: a.ax, y: a.ay }; return { x: s.x + a.dx * a.len, y: s.y + a.dy * a.len }; }
      function updArm() {
        const a = g.arm, p = g.p;
        if (!a) return;
        if (a.st === 'out') {
          a.len += 6;
          const tip = armTip();
          // hit enemies / items
          for (const e of g.en) if (!e.dead && Math.abs(e.x - tip.x) < 8 && Math.abs(e.y - e.h / 2 - tip.y) < e.h / 2 + 2) { hitEnemy(e, 2); a.st = 'back'; snd.clank(); return; }
          for (const it of g.items) if (Math.abs(it.x - tip.x) < 9 && Math.abs(it.y - tip.y) < 9) { it.grab = true; a.st = 'back'; return; }
          if (g.boss && g.boss.st === 'fight' && bossHit(tip.x, tip.y, 4)) { damageBoss(2); a.st = 'back'; snd.clank(); return; }
          const tx = Math.floor(tip.x / T), ty = Math.floor(tip.y / T);
          if (tip.x < 0 || tip.x >= W) { a.st = 'back'; return; }
          if (plat(tx, ty) && tip.y - ty * T < 10) {
            a.st = 'hook'; a.ax = tip.x; a.ay = ty * T + 4; a.row = ty; snd.clank();
            if (a.up || Math.abs(a.ax - p.x) < 10) { p.st = 'pull'; }
            else {
              // start swinging
              const L = Math.hypot(p.x - a.ax, p.y - 10 - a.ay);
              a.L = Math.max(24, L); a.th = Math.atan2(p.x - a.ax, p.y - 10 - a.ay); a.w = 0; p.st = 'swing';
            }
            return;
          }
          if (a.len >= a.max) a.st = 'back';
        } else if (a.st === 'back') {
          a.len -= 9;
          if (a.len <= 0) g.arm = null;
        }
      }
      function updPlayer() {
        const p = g.p;
        if (p.inv > 0) p.inv--;
        if (p.cd > 0) p.cd--;
        if (p.drop > 0) p.drop--;
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown');
        const dir = (R ? 1 : 0) - (L ? 1 : 0);
        if (p.st === 'dead') { p.vy = Math.min(5, p.vy + 0.25); p.y += p.vy; return; }
        // gun
        if (api.pressed('Space') && p.cd <= 0 && g.pb.length < (g.gun === 'rapid' ? 6 : 3)) {
          const s = shoulder();
          const up = U && p.st !== 'swing';
          const vx = up ? 0 : p.face * 5, vy = up ? -5 : 0;
          g.pb.push({ x: s.x + (up ? 0 : p.face * 6), y: up ? s.y - 6 : s.y + 1, vx, vy, t: 50 });
          if (g.gun === 'wide') { g.pb.push({ x: s.x, y: s.y, vx: up ? -1.2 : vx, vy: up ? -5 : -1.2, t: 40 }); g.pb.push({ x: s.x, y: s.y, vx: up ? 1.2 : vx, vy: up ? -5 : 1.2, t: 40 }); }
          p.cd = g.gun === 'rapid' ? 5 : 10; snd.shot();
        }
        switch (p.st) {
          case 'ground': {
            if (!g.arm) { if (dir) { p.face = dir; p.x += dir * 1.4; p.anim++; } }
            p.x = Math.max(6, Math.min(W - 6, p.x));
            if (api.pressed('KeyX')) {
              if (D) { p.drop = 14; p.st = 'air'; p.vy = 1; p.vx = 0; }
              else if (!g.arm) fireArm();
            }
            if (p.st === 'ground' && !standing(p, 3)) { p.st = 'air'; p.vy = 0; p.vx = dir * 1.0; }
            else if (p.st === 'ground') { p.safeX = p.x; p.safeY = p.y; }
            break;
          }
          case 'air': {
            if (api.pressed('KeyX') && !g.arm) fireArm();
            if (dir) { p.vx += (dir * 1.2 - p.vx) * 0.06; p.face = dir; }
            p.vy = Math.min(5, p.vy + 0.3);
            const ny = p.y + p.vy;
            p.x = Math.max(6, Math.min(W - 6, p.x + p.vx));
            const land = p.drop > 0 ? -1 : platUnder(p.x, p.y, ny, 3);
            if (land >= 0 && p.vy > 0) { p.y = land; p.vy = 0; p.vx = 0; p.st = 'ground'; au.noise(0.03, { vol: 0.05, freq: 500 }); }
            else p.y = ny;
            break;
          }
          case 'pull': {
            const a = g.arm;
            p.y -= 4; p.x += Math.sign(a.ax - p.x) * Math.min(2, Math.abs(a.ax - p.x));
            if (frame % 6 === 0) snd.pull();
            if (p.y <= a.row * T) {
              p.y = a.row * T; p.st = 'ground'; g.arm = null;
              if (!standing(p, 3)) { const tx = Math.floor(p.x / T); for (let k = 0; k < 3; k++) { if (plat(tx + k, a.row)) { p.x = (tx + k) * T + 6; break; } if (plat(tx - k, a.row)) { p.x = (tx - k) * T + 10; break; } } }
            }
            break;
          }
          case 'swing': {
            const a = g.arm;
            // pendulum about the hook
            const acc = -0.35 / a.L * Math.sin(a.th) + dir * 0.0025;
            a.w = (a.w + acc) * 0.995;
            a.th += a.w;
            if (a.th > 1.45) { a.th = 1.45; a.w = -Math.abs(a.w) * 0.5; } if (a.th < -1.45) { a.th = -1.45; a.w = Math.abs(a.w) * 0.5; }
            if (U) a.L = Math.max(10, a.L - 1.5);
            p.x = a.ax + Math.sin(a.th) * a.L; p.y = a.ay + Math.cos(a.th) * a.L + 10;
            if (p.x < 6 || p.x > W - 6) { p.x = Math.max(6, Math.min(W - 6, p.x)); a.w = -a.w * 0.5; a.th = Math.asin(Math.max(-1, Math.min(1, (p.x - a.ax) / a.L))); }
            if (Math.abs(a.w) > 0.001) p.face = a.w * Math.cos(a.th) > 0 ? 1 : -1;
            if (a.L <= 12) { p.st = 'pull'; break; }
            if (api.pressed('KeyX')) {
              p.vx = Math.cos(a.th) * a.w * a.L; p.vy = -Math.sin(a.th) * a.w * a.L; p.vx = Math.max(-3, Math.min(3, p.vx)); p.vy = Math.max(-4, Math.min(4, p.vy));
              p.st = 'air'; g.arm = null;
            }
            break;
          }
          case 'dead':
            p.vy = Math.min(5, p.vy + 0.25); p.y += p.vy;
            break;
        }
        updArm();
        // camera
        let ty = p.y - 130;
        if (g.locked) ty = 0;
        ty = Math.max(0, Math.min(g.rows * T - H, ty));
        g.cy += (ty - g.cy) * 0.1;
        if (!g.locked && p.st === 'ground' && p.y <= g.arenaY - T) { g.locked = true; }
        if (g.locked && !g.boss && g.cy < 2) { g.cy = 0; spawnBoss(); }
        if (p.y > g.cy + H + 40 && p.st !== 'dead') kill();
      }
      function kill() {
        const p = g.p;
        if (p.st === 'dead' || g.phase !== 'play') return;
        if (p.inv > 0) return;
        p.st = 'dead'; p.vy = -3; g.arm = null; g.phase = 'dying'; g.phaseT = 140; snd.die();
      }
      function respawn() {
        const p = g.p;
        p.x = p.safeX; p.y = p.safeY; p.st = 'ground'; p.vy = 0; p.vx = 0; p.inv = 150;
        if (g.locked) { p.x = W / 2; p.y = g.arenaY - T; }
        g.eb = []; g.en = g.en.filter(e => Math.abs(e.y - p.y) > 60);
        g.phase = 'play';
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 300;
        au.melody([[392, .2], [370, .2], [349, .2], [330, .6]], { type: 'square', vol: 0.12 });
      }

      // ---------- enemies ----------
      function bsp() { return Math.min(2.8, 1.6 + diff() * 0.15); }
      function makeEnemy(s) {
        const e = { k: s.k, x: s.x, y: s.y, vx: 0, vy: 0, t: 0, hp: 1, face: -1, anim: 0, w: 10, h: 18, pal: Math.min(2, g.stage), cd: 60 + ri(60) };
        if (s.k === 'gren') { e.hp = 2; e.pal = 2; }
        if (s.k === 'turret') { e.hp = 3; e.w = 12; e.h = 12; }
        if (s.k === 'crate') { e.hp = 1; e.w = 12; e.h = 12; }
        if (s.k === 'para') { e.st = 'chute'; }
        if (s.k === 'bird') { e.w = 12; e.h = 8; e.vx = s.x < W / 2 ? 1.5 : -1.5; }
        return e;
      }
      function updEnemy(e) {
        const p = g.p;
        e.t++;
        switch (e.k) {
          case 'para':
            if (e.st === 'chute') {
              e.y += 0.7; e.x += Math.sin(e.t * 0.05) * 0.4;
              if (e.t % 100 === 50) { aimed(e.x, e.y - 10); }
              const land = platUnder(e.x, e.y - 0.7, e.y, 3);
              if (land >= 0 && e.y > g.cy + 20) { e.y = land; e.st = 'walk'; e.k = 'sold'; }
              if (e.y > g.cy + H + 20) e.dead = true;
            }
            break;
          case 'sold':
          case 'gren': {
            e.face = p.x > e.x ? 1 : -1;
            const same = Math.abs(p.y - e.y) < 12;
            if (!same && Math.abs(p.x - e.x) > 20) {
              const nx = e.x + e.face * 0.5;
              if (standing({ x: nx + e.face * 5, y: e.y }, 0)) { e.x = nx; e.anim++; }
            }
            if (--e.cd <= 0 && e.y > g.cy && e.y < g.cy + H) {
              if (e.k === 'gren') { const dx = p.x - e.x; g.eb.push({ k: 'gren', x: e.x, y: e.y - 16, vx: Math.max(-2.5, Math.min(2.5, dx / 50)), vy: -3.5, t: 0 }); e.cd = 110 + ri(60); }
              else if (same || Math.random() < 0.4) { g.eb.push({ k: 'b', x: e.x + e.face * 8, y: e.y - 12, vx: e.face * bsp(), vy: same ? 0 : Math.sign(p.y - e.y) * 0.4, t: 0 }); e.shoot = 8; e.cd = 70 + ri(60) - Math.min(30, diff() * 8); }
              else e.cd = 30;
              snd.eshot();
            }
            if (e.shoot) e.shoot--;
            break;
          }
          case 'turret':
            e.face = p.x > e.x ? 1 : -1;
            if (--e.cd <= 0 && e.y > g.cy && e.y < g.cy + H) { e.cd = Math.max(60, 120 - diff() * 12); for (let i = -1; i <= 1; i++) aimed(e.x, e.y - 6, i * 0.25); snd.eshot(); }
            break;
          case 'crate':
            e.y += Math.sin(e.t * 0.05) * 0.2;
            break;
          case 'bird':
            e.x += e.vx; e.y += Math.sin(e.t * 0.1) * 1.2 + (p.y - 10 > e.y ? 0.3 : -0.3); e.anim++;
            if (e.x < -20 || e.x > W + 20) e.dead = true;
            break;
        }
        if (e.y > g.cy + H + 120 && e.k !== 'para') e.dead = true;
        if (e.k !== 'crate' && e.k !== 'turret' && Math.abs(e.x - p.x) < e.w / 2 + 3 && Math.abs((e.y - e.h / 2) - (p.y - 9)) < e.h / 2 + 7) kill();
      }
      function aimed(x, y, off) { const p = g.p; const a = Math.atan2(p.y - 10 - y, p.x - x) + (off || 0); g.eb.push({ k: 'b', x, y, vx: Math.cos(a) * bsp(), vy: Math.sin(a) * bsp(), t: 0 }); }
      function hitEnemy(e, n) {
        if (e.dead) return;
        e.hp -= n || 1; e.flash = 5;
        if (e.hp > 0) { snd.clank(); return; }
        e.dead = true;
        if (e.k === 'crate') { dropItem(e.x, e.y - 6); g.fx.push({ k: 'boom', x: e.x, y: e.y - 6, t: 0 }); snd.boom(); return; }
        const pts = { sold: 100, para: 200, gren: 300, turret: 500, bird: 150 }[e.k] || 100;
        addScore(pts, e.x, e.y - e.h - 4);
        g.fx.push({ k: 'boom', x: e.x, y: e.y - e.h / 2, t: 0 }); snd.kill();
        if (e.k === 'para' && Math.random() < 0.35) dropItem(e.x, e.y - 10);
      }
      function dropItem(x, y) {
        const r = Math.random();
        g.items.push({ k: r < 0.25 ? 'rapid' : r < 0.45 ? 'wide' : r < 0.85 ? 'bonus' : 'oneup', x, y, vy: -1.5, t: 0 });
      }
      function takeItem(it) {
        if (it.k === 'rapid' || it.k === 'wide') { if (g.gun === it.k) addScore(1000, it.x, it.y); g.gun = it.k; }
        else if (it.k === 'bonus') addScore(1000 * (1 + ri(5)), it.x, it.y);
        else g.lives++;
        snd.item();
      }

      // ---------- bosses ----------
      function spawnBoss() {
        const k = th().boss, hp = { trooper: 24, copter: 30, mech: 38 }[k] + g.loop * 8;
        const fy = g.arenaY - T;
        g.boss = { k, hp, max: hp, t: 0, st: 'enter', flash: 0, x: k === 'copter' ? -40 : W + 30, y: k === 'copter' ? 50 : fy, face: -1, vx: 0 };
        au.melody([[196, .15], [185, .15], [196, .15], [233, .3], [196, .4]], { type: 'sawtooth', vol: 0.1 });
      }
      function bossBox(b) {
        if (b.k === 'trooper') return { x: b.x - 11, y: b.y - 32, w: 22, h: 32 };
        if (b.k === 'copter') return { x: b.x - 26, y: b.y - 12, w: 52, h: 24 };
        return { x: b.x - 22, y: b.y - 48, w: 44, h: 48 };
      }
      function bossHit(x, y, r) { const bb = bossBox(g.boss); return x + r > bb.x && x - r < bb.x + bb.w && y + r > bb.y && y - r < bb.y + bb.h; }
      function updBoss() {
        const b = g.boss, p = g.p, s = bsp();
        b.t++; if (b.flash) b.flash--;
        if (b.st === 'dead') {
          if (b.k === 'copter') { b.y += 1.2; b.x += 0.5; }
          if (b.t % 6 === 0) { g.fx.push({ k: 'boom', x: b.x + rnd(-20, 20), y: b.y - rnd(0, 30), t: 0 }); if (b.t % 18 === 0) snd.boom(); }
          if (b.t === 120) { g.phase = 'clear'; g.phaseT = 260; g.bonus = 10000 * (g.stage + 1); addScore(g.bonus); snd.clear(); }
          return;
        }
        if (b.k === 'trooper') {
          if (b.st === 'enter') { b.x -= 0.8; if (b.x < W - 40) { b.st = 'fight'; b.t = 0; } }
          else {
            b.face = p.x > b.x ? 1 : -1;
            const cyc = b.t % 160;
            if (cyc < 60) b.x += b.face * 0.6;
            if (cyc === 70 || cyc === 78 || cyc === 86) { g.eb.push({ k: 'b', x: b.x + b.face * 12, y: b.y - 18, vx: b.face * (s + 0.5), vy: 0, t: 0 }); snd.eshot(); }
            if (cyc === 120) { g.eb.push({ k: 'gren', x: b.x, y: b.y - 30, vx: (p.x - b.x) / 55, vy: -4, t: 0 }); }
            b.x = Math.max(14, Math.min(W - 14, b.x));
          }
        } else if (b.k === 'copter') {
          if (frame % 8 === 0) snd.rotor();
          if (b.st === 'enter') { b.x += 1.2; if (b.x > 60) { b.st = 'fight'; b.t = 0; b.vx = 1; } }
          else {
            b.x += b.vx * (1 + g.loop * 0.3); if (b.x < 40 || b.x > W - 40) b.vx *= -1;
            b.y = 56 + Math.sin(b.t * 0.03) * 22;
            if (b.t % 70 === 0) { aimed(b.x, b.y + 10); aimed(b.x, b.y + 10, 0.2); aimed(b.x, b.y + 10, -0.2); snd.eshot(); }
            if (b.t % 110 === 55) g.eb.push({ k: 'bomb', x: b.x, y: b.y + 12, vx: b.vx * 0.5, vy: 0.5, t: 0 });
            if (b.t % 400 === 200) for (let i = 0; i < 2; i++) g.en.push(makeEnemy({ k: 'para', x: rnd(30, W - 30), y: -10 }));
          }
        } else {
          if (b.st === 'enter') { b.x -= 0.6; if (b.x < W - 50) { b.st = 'fight'; b.t = 0; } }
          else {
            b.face = p.x > b.x ? 1 : -1;
            const cyc = b.t % 200;
            if (cyc < 80) b.x += b.face * 0.5;
            if (cyc === 90 || cyc === 110) { g.eb.push({ k: 'rocket', x: b.x, y: b.y - 50, vx: b.face * 0.5, vy: -2.5, t: 0 }); snd.eshot(); }
            if (cyc === 150) for (let i = 0; i < 5; i++) { g.eb.push({ k: 'b', x: b.x + b.face * 20, y: b.y - 30, vx: b.face * s * Math.cos((i - 2) * 0.2), vy: s * Math.sin((i - 2) * 0.2), t: 0 }); }
            b.x = Math.max(24, Math.min(W - 24, b.x));
          }
        }
        const bb = bossBox(b);
        if (p.x + 4 > bb.x && p.x - 4 < bb.x + bb.w && p.y > bb.y && p.y - 18 < bb.y + bb.h) kill();
      }
      function damageBoss(n) {
        const b = g.boss; if (b.st !== 'fight') return;
        b.hp -= n; b.flash = 6; snd.clank();
        if (b.hp <= 0) { b.hp = 0; b.st = 'dead'; b.t = 0; g.eb = []; g.en.forEach(e => { if (!e.dead && e.k !== 'crate') hitEnemy(e, 9); }); addScore(5000, b.x, b.y - 40); }
      }

      // ---------- update ----------
      function updGame() {
        if (g.phase === 'over') { if (--g.phaseT <= 0 || (g.phaseT < 200 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; } return; }
        if (g.phase === 'cont') return;
        for (const f of g.fx) f.t++;
        g.fx = g.fx.filter(f => f.t < 22);
        g.pops = g.pops.filter(pp => (pp.t--, pp.y -= 0.4, pp.t > 0));
        if (g.phase === 'intro') { if (--g.phaseT <= 0) g.phase = 'play'; return; }
        if (g.phase === 'clear') { if (--g.phaseT <= 0) { g.stage++; if (g.stage >= THEMES.length) { g.stage = 0; g.loop++; } startStage(); } return; }
        if (g.phase === 'dying') {
          updPlayer();
          if (--g.phaseT <= 0) {
            g.lives--; g.gun = 'normal';
            if (g.lives <= 0) {
              if (api.offerContinue) { g.phase = 'cont'; const cg = g; api.offerContinue(() => { if (g === cg) { g.lives = 3; respawn(); } }, () => { if (g === cg) gameOver(); }); }
              else gameOver();
            } else respawn();
          }
          return;
        }
        const p = g.p;
        updPlayer();
        if (g.phase !== 'play') return;
        // spawns
        while (g.spawnI < g.spawns.length && g.spawns[g.spawnI].row * T > g.cy - 20) {
          const s = g.spawns[g.spawnI++];
          if (s.row * T < g.cy + H + 40) g.en.push(makeEnemy(s));
        }
        if (!g.locked && --g.paraT <= 0) {
          g.paraT = Math.max(150, 330 - diff() * 30) + ri(120);
          if (g.en.length >= 6 + Math.min(4, diff())) { /* enough on screen */ }
          else if (Math.random() < 0.7) g.en.push(makeEnemy({ k: 'para', x: rnd(20, W - 20), y: g.cy - 10 }));
          else g.en.push(makeEnemy({ k: 'bird', x: Math.random() < 0.5 ? -10 : W + 10, y: g.cy + rnd(30, 140) }));
        }
        for (const e of g.en) if (!e.dead) updEnemy(e);
        if (g.boss) updBoss();
        // player bullets
        for (const b of g.pb) {
          b.x += b.vx; b.y += b.vy; b.t--;
          if (b.t <= 0 || b.x < -4 || b.x > W + 4 || b.y < g.cy - 10) { b.dead = true; continue; }
          for (const e of g.en) if (!e.dead && Math.abs(e.x - b.x) < e.w / 2 + 2 && Math.abs(e.y - e.h / 2 - b.y) < e.h / 2 + 2) { hitEnemy(e, 1); b.dead = true; break; }
          if (!b.dead && g.boss && g.boss.st === 'fight' && bossHit(b.x, b.y, 2)) { damageBoss(1); b.dead = true; }
        }
        g.pb = g.pb.filter(b => !b.dead);
        g.en = g.en.filter(e => !e.dead);
        // enemy bullets
        for (const b of g.eb) {
          b.t++;
          if (b.k === 'gren') {
            b.vy += 0.15; b.x += b.vx; b.y += b.vy;
            const land = b.vy > 0 ? platUnder(b.x, b.y - b.vy, b.y, 1) : -1;
            if (land >= 0 || b.t > 160) { b.dead = true; g.fx.push({ k: 'blast', x: b.x, y: b.y, t: 0 }); snd.boom(); if (Math.abs(b.x - p.x) < 16 && Math.abs(b.y - p.y) < 18) kill(); continue; }
          } else if (b.k === 'rocket') {
            if (b.t < 40) { b.y += b.vy; b.x += b.vx; }
            else { const a = Math.atan2(p.y - 10 - b.y, p.x - b.x); b.vx += Math.cos(a) * 0.08; b.vy += Math.sin(a) * 0.08; const sp = Math.hypot(b.vx, b.vy); if (sp > 2.4) { b.vx *= 2.4 / sp; b.vy *= 2.4 / sp; } b.x += b.vx; b.y += b.vy; }
            if (b.t > 300) b.dead = true;
          } else if (b.k === 'bomb') {
            b.vy += 0.1; b.x += b.vx; b.y += b.vy;
            const land = platUnder(b.x, b.y - b.vy, b.y, 1);
            if (land >= 0) { b.dead = true; g.fx.push({ k: 'blast', x: b.x, y: land, t: 0 }); snd.boom(); if (Math.abs(b.x - p.x) < 18 && Math.abs(land - p.y) < 16) kill(); continue; }
          } else { b.x += b.vx; b.y += b.vy; }
          if (b.x < -10 || b.x > W + 10 || b.y > g.cy + H + 20 || b.y < g.cy - 40) { b.dead = true; continue; }
          if (Math.abs(b.x - p.x) < 4 && Math.abs(b.y - (p.y - 9)) < 9) { b.dead = true; kill(); }
        }
        g.eb = g.eb.filter(b => !b.dead);
        // items
        for (const it of g.items) {
          it.t++;
          if (it.grab) { it.x += (p.x - it.x) * 0.25; it.y += (p.y - 10 - it.y) * 0.25; }
          else { it.vy = Math.min(1, it.vy + 0.05); const land = it.vy > 0 ? platUnder(it.x, it.y, it.y + it.vy, 2) : -1; if (land >= 0) { it.y = land; it.vy = 0; } else it.y += it.vy; }
          if (Math.abs(it.x - p.x) < 9 && Math.abs(it.y - (p.y - 8)) < 12) { it.dead = true; takeItem(it); }
          if (it.t > 700 || it.y > g.cy + H + 60) it.dead = true;
        }
        g.items = g.items.filter(it => !it.dead);
      }
      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') { titleT++; if (api.anyPressed('Enter', 'Space')) tryStart(); return; }
        updGame();
      }

      // ---------- render ----------
      function drawBack(ctx, t, cy) {
        for (let i = 0; i < t.sky.length; i++) { ctx.fillStyle = t.sky[i]; ctx.fillRect(0, Math.floor(i * H / t.sky.length), W, Math.ceil(H / t.sky.length) + 1); }
        // parallax trunks / towers
        const off = -Math.floor(cy * 0.4) % 64;
        for (let k = 0; k < 4; k++) {
          const x = [10, 84, 150, 214][k], w = [26, 18, 30, 20][k];
          ctx.fillStyle = t.trunk2; ctx.fillRect(x, 0, w, H);
          ctx.fillStyle = t.trunk; ctx.fillRect(x + 3, 0, w - 8, H);
          for (let y = off - 64; y < H; y += 64) { ctx.fillStyle = t.trunk2; ctx.fillRect(x + 4, y + ((k * 23) & 31), w - 10, 3); }
        }
        if (t.boss === 'trooper') { ctx.fillStyle = 'rgba(40,120,50,0.5)'; for (let y = off - 64; y < H; y += 64) for (let k = 0; k < 6; k++) ctx.fillRect((k * 53 + 7) % W, y + (k * 19) % 60, 22, 10); }
      }
      function drawLevel(ctx) {
        const t = th(), cy = Math.round(g.cy);
        const r0 = Math.floor(cy / T), r1 = r0 + Math.ceil(H / T) + 1;
        for (let r = r0; r <= r1; r++) for (let x = 0; x < COLS; x++) {
          if (!plat(x, r)) continue;
          const sx = x * T, sy = r * T - cy;
          ctx.fillStyle = t.plat2; ctx.fillRect(sx, sy, T, 8);
          ctx.fillStyle = t.plat; ctx.fillRect(sx, sy, T, 5);
          ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(sx, sy, T, 1);
          if (t.boss === 'trooper') { ctx.fillStyle = t.leaf; if (!plat(x - 1, r)) ctx.fillRect(sx - 4, sy - 3, 8, 5); if (!plat(x + 1, r)) ctx.fillRect(sx + T - 4, sy - 3, 8, 5); }
          else { ctx.fillStyle = t.plat2; ctx.fillRect(sx + 2, sy + 8, 2, 4); ctx.fillRect(sx + 12, sy + 8, 2, 4); if ((x + r) % 4 === 0) { ctx.fillStyle = t.leaf; ctx.fillRect(sx + 7, sy + 1, 2, 2); } }
        }
        // arena marker
        if (g.arenaY - cy > -20 && g.arenaY - cy < H) { text(ctx, g.locked ? '' : 'DANGER', W / 2, g.arenaY - T - cy - 30, (frame >> 4) & 1 ? '#ff4040' : '#ffd040', 1, 'center'); }
      }
      function drawPlayer(ctx) {
        const p = g.p, cy = g.cy;
        if (p.inv > 0 && (p.inv & 4) && p.st !== 'dead') return;
        const fi = p.face > 0 ? 0 : 1;
        const x = Math.round(p.x), y = Math.round(p.y - cy);
        // bionic arm cable
        if (g.arm) {
          const s = shoulder(), tip = armTip();
          const sx = Math.round(s.x), sy = Math.round(s.y - cy), tx = Math.round(tip.x), ty = Math.round(tip.y - cy);
          const n = Math.max(1, Math.ceil(Math.hypot(tx - sx, ty - sy) / 3));
          for (let i = 0; i <= n; i++) { ctx.fillStyle = i & 1 ? '#c0c8d8' : '#707888'; ctx.fillRect(Math.round(sx + (tx - sx) * i / n) - 1, Math.round(sy + (ty - sy) * i / n) - 1, 2, 2); }
          ctx.fillStyle = '#e0e8f0'; ctx.fillRect(tx - 3, ty - 3, 6, 6); ctx.fillStyle = '#505868'; ctx.fillRect(tx - 1, ty - 4, 2, 3);
        }
        if (p.st === 'dead') {
          ctx.save(); ctx.translate(x, y - 9); ctx.rotate(p.face * Math.min(1.6, (140 - g.phaseT) * 0.08)); ctx.drawImage(SP.stand[fi], -6, -9); ctx.restore();
          return;
        }
        if (p.st === 'swing' || p.st === 'pull') ctx.drawImage(SP.hang[fi], x - 6, y - 19);
        else if (p.st === 'ground' && (api.key('ArrowLeft') || api.key('ArrowRight')) && !g.arm) ctx.drawImage(((p.anim >> 3) & 1 ? SP.walk : SP.stand)[fi], x - 6, y - 18);
        else ctx.drawImage((p.st === 'air' ? SP.walk : SP.stand)[fi], x - 6, y - 18);
      }
      function drawEnemy(ctx, e) {
        const cy = g.cy, x = Math.round(e.x), y = Math.round(e.y - cy);
        if (y < -40 || y > H + 40) return;
        const fi = e.face > 0 ? 0 : 1;
        switch (e.k) {
          case 'para':
            ctx.fillStyle = '#e8e8e0'; ctx.fillRect(x - 12, y - 40, 24, 6); ctx.fillRect(x - 10, y - 43, 20, 3);
            ctx.fillStyle = '#c03030'; ctx.fillRect(x - 4, y - 40, 8, 6);
            ctx.fillStyle = '#a0a0a0'; for (let i = 0; i < 8; i++) { ctx.fillRect(x - 11 + i, y - 34 + i * 2, 1, 1); ctx.fillRect(x + 10 - i, y - 34 + i * 2, 1, 1); }
            ctx.drawImage(ESP[e.pal].stand[fi], x - 6, y - 18);
            break;
          case 'sold': case 'gren':
            ctx.drawImage(((e.anim >> 3) & 1 ? ESP[e.pal].walk : ESP[e.pal].stand)[fi], x - 6, y - 18);
            if (e.shoot) { ctx.fillStyle = '#ffff80'; ctx.fillRect(x + e.face * 9 - 1, y - 13, 3, 3); }
            break;
          case 'turret':
            ctx.fillStyle = '#505868'; ctx.fillRect(x - 6, y - 12, 12, 12);
            ctx.fillStyle = '#ff3030'; ctx.fillRect(x - 2, y - 8, 4, 4);
            ctx.fillStyle = '#a0a8b8'; ctx.fillRect(e.face > 0 ? x + 4 : x - 10, y - 7, 6, 2);
            break;
          case 'crate':
            ctx.fillStyle = '#e8e8e0'; ctx.fillRect(x - 10, y - 30, 20, 5);
            ctx.fillStyle = '#a0a0a0'; ctx.fillRect(x - 7, y - 25, 1, 13); ctx.fillRect(x + 6, y - 25, 1, 13);
            ctx.fillStyle = '#a07030'; ctx.fillRect(x - 6, y - 12, 12, 12); ctx.fillStyle = '#604010'; ctx.fillRect(x - 6, y - 7, 12, 2);
            break;
          case 'bird':
            ctx.fillStyle = '#202020'; ctx.fillRect(x - 3, y - 6, 6, 4);
            ctx.fillStyle = '#404040'; const wy = (e.anim >> 2) & 1 ? -3 : 1; ctx.fillRect(x - 8, y - 6 + wy, 5, 2); ctx.fillRect(x + 3, y - 6 + wy, 5, 2);
            ctx.fillStyle = '#ffd040'; ctx.fillRect(e.vx > 0 ? x + 3 : x - 5, y - 5, 2, 1);
            break;
        }
        if (e.flash) { e.flash--; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(x - e.w / 2, y - e.h, e.w, e.h); }
      }
      function drawBoss(ctx) {
        const b = g.boss; if (!b) return;
        const x = Math.round(b.x), y = Math.round(b.y - g.cy), fl = b.flash & 2;
        if (b.k === 'trooper') {
          ctx.drawImage(ESP[2].stand[b.face > 0 ? 0 : 1], x - 12, y - 36, 24, 36);
          ctx.fillStyle = '#404040'; ctx.fillRect(b.face > 0 ? x + 6 : x - 20, y - 22, 14, 4);
          if (fl) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(x - 12, y - 36, 24, 36); }
        } else if (b.k === 'copter') {
          ctx.fillStyle = fl ? '#ffffff' : '#506040'; ctx.fillRect(x - 22, y - 10, 34, 18); ctx.fillRect(x + 10, y - 6, 28, 6);
          ctx.fillStyle = '#80c0e0'; ctx.fillRect(x - 20, y - 8, 10, 8);
          ctx.fillStyle = '#303828'; ctx.fillRect(x - 18, y + 8, 28, 2); ctx.fillRect(x - 14, y + 6, 2, 3); ctx.fillRect(x + 4, y + 6, 2, 3);
          ctx.fillStyle = '#202020'; const rw = (frame & 2) ? 40 : 26; ctx.fillRect(x - 6 - rw / 2, y - 14, rw, 2); ctx.fillRect(x - 7, y - 13, 3, 4);
          ctx.fillRect(x + 36, y - 9 + ((frame & 2) ? 0 : 4), 2, 8);
        } else {
          ctx.fillStyle = fl ? '#ffffff' : '#606870'; ctx.fillRect(x - 20, y - 46, 40, 26);
          ctx.fillStyle = '#ff3030'; ctx.fillRect(x + b.face * 10 - 3, y - 40, 6, 4);
          ctx.fillStyle = '#404850'; ctx.fillRect(x - 24, y - 50, 48, 6); ctx.fillRect(x - 16, y - 58, 10, 8); ctx.fillRect(x + 6, y - 58, 10, 8);
          const st = Math.sin(b.t * 0.15) * 4;
          ctx.fillStyle = '#505860'; ctx.fillRect(x - 16 + st, y - 20, 8, 20); ctx.fillRect(x + 8 - st, y - 20, 8, 20);
          ctx.fillStyle = '#303438'; ctx.fillRect(x - 20 + st, y - 4, 14, 4); ctx.fillRect(x + 6 - st, y - 4, 14, 4);
          ctx.fillStyle = '#808890'; ctx.fillRect(b.face > 0 ? x + 18 : x - 32, y - 34, 14, 6);
        }
      }
      function drawShots(ctx) {
        const cy = g.cy;
        ctx.fillStyle = '#ffff80';
        for (const b of g.pb) ctx.fillRect(Math.round(b.x) - 2, Math.round(b.y - cy) - 1, 4, 3);
        for (const b of g.eb) {
          const x = Math.round(b.x), y = Math.round(b.y - cy);
          if (b.k === 'gren' || b.k === 'bomb') { ctx.fillStyle = '#304020'; ctx.fillRect(x - 3, y - 3, 6, 6); ctx.fillStyle = (frame & 4) ? '#ff4020' : '#ffd040'; ctx.fillRect(x - 1, y - 5, 2, 2); }
          else if (b.k === 'rocket') { ctx.fillStyle = '#e0e0e0'; ctx.fillRect(x - 2, y - 2, 5, 5); ctx.fillStyle = (frame & 2) ? '#ff8020' : '#ffff40'; ctx.fillRect(Math.round(x - b.vx * 2) - 1, Math.round(y - b.vy * 2) - 1, 3, 3); }
          else { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 2, y - 1, 4, 3); ctx.fillStyle = '#ff4020'; ctx.fillRect(x - 1, y, 2, 1); }
        }
        const IC = { rapid: ['R', '#40c0ff'], wide: ['W', '#ff60ff'], bonus: ['B', '#ffd040'], oneup: ['1', '#40ff40'] };
        for (const it of g.items) {
          if (it.t > 560 && (frame & 4)) continue;
          const x = Math.round(it.x), y = Math.round(it.y - cy);
          ctx.fillStyle = '#101010'; ctx.fillRect(x - 6, y - 12, 12, 12);
          ctx.fillStyle = IC[it.k][1]; ctx.fillRect(x - 6, y - 12, 12, 1); ctx.fillRect(x - 6, y - 1, 12, 1);
          text(ctx, IC[it.k][0], x - 2, y - 10, IC[it.k][1]);
        }
        for (const f of g.fx) {
          const x = Math.round(f.x), y = Math.round(f.y - cy);
          const r = (f.k === 'blast' ? 5 : 3) + f.t * (f.k === 'blast' ? 0.8 : 0.5);
          ctx.fillStyle = f.t < 6 ? '#ffffff' : f.t < 14 ? '#ffd040' : '#e04010';
          ctx.fillRect(x - r, y - r / 2, r * 2, r); ctx.fillRect(x - r / 2, y - r, r, r * 2);
        }
        for (const pp of g.pops) text(ctx, pp.s, Math.round(pp.x), Math.round(pp.y - cy), '#ffffff', 1, 'center');
      }
      function drawHUD(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, 11);
        text(ctx, '1P', 4, 2, '#40e040'); text(ctx, String(g ? g.score : 0), 70, 2, '#ffffff', 1, 'right');
        text(ctx, 'HI', 96, 2, '#ff4040'); text(ctx, String(hi), 162, 2, '#ffffff', 1, 'right');
        if (mode !== 'game' || !g) return;
        for (let i = 0; i < Math.min(5, g.lives - 1); i++) ctx.drawImage(SP.stand[0], 172 + i * 9, 1, 6, 9);
        if (g.gun !== 'normal') text(ctx, g.gun === 'rapid' ? 'RAPID' : 'WIDE', W - 4, 2, '#40c0ff', 1, 'right');
        // height meter
        if (!g.locked) {
          const total = (g.rows - 1) * T - g.arenaY, k = Math.max(0, Math.min(1, ((g.rows - 1) * T - g.p.y) / total));
          ctx.fillStyle = '#203020'; ctx.fillRect(W - 6, 20, 3, 100); ctx.fillStyle = '#40e040'; ctx.fillRect(W - 6, 20 + Math.round(100 * (1 - k)), 3, Math.round(100 * k));
        }
      }
      function drawTitle(ctx) {
        drawBack(ctx, THEMES[0], titleT * 0.5);
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, H);
        const page = Math.floor(titleT / 420) % 2;
        if (page === 0) {
          text(ctx, 'BIONIC', W / 2 + 2, 30, '#002000', 4, 'center'); text(ctx, 'BIONIC', W / 2, 28, '#40e040', 4, 'center');
          text(ctx, 'COMMANDO', W / 2 + 2, 66, '#002000', 3, 'center'); text(ctx, 'COMMANDO', W / 2, 64, '#ffd040', 3, 'center');
          // a commando swinging from a hook
          const ax = W / 2, ay = 100, th2 = Math.sin(titleT * 0.04) * 0.9, L = 48;
          const px = ax + Math.sin(th2) * L, py = ay + Math.cos(th2) * L;
          ctx.fillStyle = '#a0a8b8'; for (let i = 0; i <= 12; i++) ctx.fillRect(Math.round(ax + (px - ax) * i / 12) - 1, Math.round(ay + (py - ay) * i / 12) - 1, 2, 2);
          ctx.fillStyle = THEMES[0].plat; ctx.fillRect(ax - 24, ay - 4, 48, 5);
          ctx.drawImage(SP.hang[th2 > 0 ? 1 : 0], Math.round(px) - 6, Math.round(py) - 2);
          text(ctx, 'HI-SCORE ' + hi, W / 2, 168, '#ffffff', 1, 'center');
        } else {
          text(ctx, '- HOW TO PLAY -', W / 2, 26, '#ffd040', 1, 'center');
          ['YOU CANNOT JUMP!', 'X: FIRE THE BIONIC ARM', 'UP + X: ARM STRAIGHT UP', 'HOOK A LEDGE ABOVE TO PULL UP', 'HOOK DIAGONALLY TO SWING,', 'UP TO CLIMB, X TO LET GO', 'SPACE: FIRE  DOWN+X: DROP DOWN', 'CLIMB TO THE TOP!']
            .forEach((l, i) => text(ctx, l, W / 2, 44 + i * 13, i === 0 || i === 7 ? '#ff6040' : '#ffffff', 1, 'center'));
          text(ctx, 'EXTEND 30000 AND 80000 PTS', W / 2, 160, '#ffd040', 1, 'center');
        }
        const blink = (frame >> 5) & 1;
        if (coinFlash > 0 || api.credits === 0) { if (coinFlash > 0 ? (frame >> 2) & 1 : blink) text(ctx, 'INSERT COIN', W / 2, 184, '#ff4040', 1, 'center'); }
        else if (blink) text(ctx, 'PUSH START', W / 2, 184, '#40ffff', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 10, '#ffffff');
        text(ctx, '\u00a9 1987 CAPCOM', W - 4, H - 10, '#c0c0c0', 1, 'right');
      }
      function render(ctx) {
        if (mode === 'title') { drawTitle(ctx); drawHUD(ctx); return; }
        drawBack(ctx, th(), g.cy);
        drawLevel(ctx);
        for (const e of g.en) drawEnemy(ctx, e);
        drawBoss(ctx);
        drawPlayer(ctx);
        drawShots(ctx);
        if (g.boss && g.boss.st !== 'dead') {
          text(ctx, th().bname, W / 2, 14, '#ffd040', 1, 'center');
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 60, 23, 120, 5);
          ctx.fillStyle = '#e03020'; ctx.fillRect(W / 2 - 59, 24, Math.round(118 * g.boss.hp / g.boss.max), 3);
        }
        drawHUD(ctx);
        if (g.phase === 'intro') { text(ctx, 'AREA ' + (g.stage + 1), W / 2, 80, '#ffffff', 2, 'center'); text(ctx, th().name, W / 2, 102, '#ffd040', 1, 'center'); }
        if (g.phase === 'clear') { text(ctx, 'AREA CLEAR', W / 2, 80, '#ffffff', 2, 'center'); text(ctx, 'BONUS ' + g.bonus, W / 2, 102, '#ffd040', 1, 'center'); }
        if (g.phase === 'over') text(ctx, 'GAME OVER', W / 2, 100, '#ff4040', 2, 'center');
      }
      if (api.debugHook) api.debugHook({ g: () => g, inv: () => { if (g && g.p && g.p.st !== 'dead') g.p.inv = Math.max(g.p.inv, 2); }, sum: () => g && { mode, ph: g.phase, st: g.stage, loop: g.loop, lives: g.lives, sc: g.score, y: g.p.y | 0, top: g.arenaY, pst: g.p.st, en: g.en.length, boss: g.boss && g.boss.hp } });
      return { update, render, destroy() { } };
    }
  });
})();
