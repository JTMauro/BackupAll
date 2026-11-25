// 1942 (Capcom, 1984) \u2014 built-in recreation for the MAME32 Game Room.
// Fly the P-38 "Super Ace" over the Pacific: 32 stages, red squadrons drop POWs, loop-the-loop to dodge.
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
    '=': '00001F001F0000', '+': '0004041F040400', '%': '18190204081303', '#': '0A0A1F0A1F0A0A'
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
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function spr(rows, pal) {
    const h = rows.length, w = Math.max.apply(null, rows.map(r => r.length)), cv = mkCanvas(w, h), c = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) { const p = pal[rows[y][x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } }
    return cv;
  }
  // nearest-neighbour rotation of pixel rows into an N x N grid
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
  const NROT = 24;
  function rotSet(rows, pal, N) { const a = []; for (let i = 0; i < NROT; i++) a.push(spr(rotRows(rows, i * 2 * Math.PI / NROT, N), pal)); return a; }
  // art faces UP; heading a in radians (0 = right, PI/2 = down)
  function rotIdx(a) { return ((Math.round((a + Math.PI / 2) / (2 * Math.PI) * NROT) % NROT) + NROT) % NROT; }

  // ================= Sprites =================
  const P38_ART = [
    '.......W.......',
    '..G....W....G..',
    '..G...WWW...G..',
    '..G...WBW...G..',
    'WWGWWWWWWWWWGWW',
    'WGGGWWWWWWWGGGW',
    '..G...WWW...G..',
    '..G....W....G..',
    '..G.........G..',
    '.GGG.......GGG.',
    '..R.........R..'];
  const P38 = spr(P38_ART, { W: '#e0e0d8', G: '#a8a8a0', B: '#3060d0', R: '#ff8020' });
  const P38S = spr(P38_ART, { W: 'rgba(0,0,20,0.35)', G: 'rgba(0,0,20,0.35)', B: 'rgba(0,0,20,0.35)', R: '' });
  const MINI = spr(['..W..', 'WWWWW', '..W..', '.WWW.'], { W: '#e0e0d8' });
  const ZERO_ART = [
    '......W......',
    '......G......',
    '.....GGG.....',
    'GGGGGGGGGGGGG',
    'GRGGGGGGGGGRG',
    '.....GGG.....',
    '......G......',
    '....GGGGG....'];
  const ZERO = rotSet(ZERO_ART, { G: '#3a8a3a', R: '#ff2020', W: '#c0c0c0' }, 15);
  const RED = rotSet(ZERO_ART, { G: '#e02828', R: '#ffffff', W: '#c0c0c0' }, 15);
  const GREY = rotSet(ZERO_ART, { G: '#909098', R: '#ff2020', W: '#ffffff' }, 15);
  const MEDIUM_ART = [
    '..........WW..........',
    '..........GG..........',
    '.....D....GG....D.....',
    '....DDD...GG...DDD....',
    'GGGGGDGGGGGGGGGGDGGGGG',
    'GGGRGGGGGGGGGGGGGGRGGG',
    'GGGGGGGGGGGGGGGGGGGGGG',
    '....DDD...GG...DDD....',
    '.....D....GG....D.....',
    '..........GG..........',
    '..........GG..........',
    '.......GGGGGGGG.......',
    '.......GGGRRGGG.......',
    '..........GG..........'];
  const MEDIUM = spr(MEDIUM_ART, { G: '#507040', D: '#303828', R: '#ff2020', W: '#d0d0d0' });
  const MEDIUM_HIT = spr(MEDIUM_ART, { G: '#ffffff', D: '#ffd0d0', R: '#ffffff', W: '#ffffff' });
  const POWSPR = {};
  const POWCOL = { W: '#40c040', S: '#a0a0a8', K: '#ffffff', F: '#ffe020', L: '#303030', U: '#ff3030' };
  for (const k in POWCOL) {
    POWSPR[k] = spr([
      'BBBBBBBBBBBBB',
      'BCCCCCCCCCCCB',
      'BCTTCTTTCTCTB',
      'BCTCTCTCTCTCB',
      'BCTTCCTCTTTCB',
      'BCTCCTTTCTCTB',
      'BCCCCCCCCCCCB',
      'BBBBBBBBBBBBB'], { B: '#ff2020', C: POWCOL[k], T: k === 'K' || k === 'F' ? '#000000' : '#ffffff' });
  }

  ArcadeRegistry.register({
    id: 'game1942', title: '1942', year: 1984, maker: 'Capcom',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Space: fire \u00b7 X: loop-the-loop (limited) \u00b7 Enter: start',
    marquee: { bg: '#0a2a6a', fg: '#ffffff', accent: '#ff3020' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(40000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0;
      let g = null;
      let scroll = 0;

      // ================= Ocean & islands =================
      function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; }
      const ISLANDS = [];
      for (let v = 0; v < 6; v++) {
        const w = 40 + v * 12, h = 30 + ((v * 17) % 40), cv = mkCanvas(w, h), x = cv.getContext('2d');
        const pts = []; const n = 14;
        for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, r = 0.7 + hash(v * 100 + i) * 0.3; pts.push([w / 2 + Math.cos(a) * (w / 2 - 2) * r, h / 2 + Math.sin(a) * (h / 2 - 2) * r]); }
        const poly = (scale, col) => { x.fillStyle = col; x.beginPath(); pts.forEach((p, i) => { const px = w / 2 + (p[0] - w / 2) * scale, py = h / 2 + (p[1] - h / 2) * scale; if (i) x.lineTo(px, py); else x.moveTo(px, py); }); x.fill(); };
        poly(1, '#2c78c8'); poly(0.92, '#e8d8a0'); poly(0.8, '#3c9030'); poly(0.55, '#2a6a22');
        for (let i = 0; i < w * h / 30; i++) { const px = hash(v * 999 + i) * w, py = hash(v * 777 + i * 3) * h; if (Math.hypot((px - w / 2) / w, (py - h / 2) / h) < 0.3) { x.fillStyle = '#1a4a16'; x.fillRect(px | 0, py | 0, 2, 2); } }
        ISLANDS.push(cv);
      }
      function drawOcean(ctx, sc) {
        ctx.fillStyle = '#1050a8'; ctx.fillRect(0, 0, W, H);
        const off = sc % 8;
        for (let r = -1; r < H / 8 + 1; r++) {
          const wy = Math.floor(sc / 8) - r;
          const y = Math.round(r * 8 + off);
          for (let k = 0; k < 4; k++) {
            const x = (hash(wy * 31 + k) * W) | 0, l = 3 + (hash(wy * 17 + k) * 6 | 0);
            ctx.fillStyle = k & 1 ? '#3070c0' : '#5890d8'; ctx.fillRect(x, y, l, 1);
          }
        }
        // islands: one every ~420 px of travel
        const seg = 420;
        const base = Math.floor(sc / seg);
        for (let i = base - 1; i <= base + 1; i++) {
          if (hash(i * 7 + 3) < 0.35) continue;
          const im = ISLANDS[(hash(i * 13) * ISLANDS.length) | 0];
          const x = (hash(i * 5 + 1) * (W + 40) - 40) | 0;
          const y = Math.round(sc - i * seg - im.height);
          if (y > -im.height && y < H) ctx.drawImage(im, x, y);
        }
      }
      function drawClouds(ctx, sc) {
        const seg = 260, s2 = sc * 1.6, base = Math.floor(s2 / seg);
        for (let i = base - 1; i <= base + 1; i++) {
          if (hash(i * 11 + 5) < 0.5) continue;
          const x = hash(i * 3 + 9) * W, y = s2 - i * seg - 30;
          if (y < -40 || y > H + 40) continue;
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + (k - 2) * 9, y + Math.sin(k * 2) * 4, 9 + (k & 1) * 4, 0, Math.PI * 2); ctx.fill(); }
        }
      }
      function drawCarrier(ctx, cy) {
        // cy = y of the carrier's centre
        const x = W / 2 - 22, y = Math.round(cy - 110);
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(x - 3, y + 200, 50, 30);
        ctx.fillStyle = '#505868'; ctx.beginPath(); ctx.moveTo(x + 22, y - 12); ctx.lineTo(x + 44, y + 10); ctx.lineTo(x + 44, y + 220); ctx.lineTo(x, y + 220); ctx.lineTo(x, y + 10); ctx.fill();
        ctx.fillStyle = '#8a7a5a'; ctx.fillRect(x + 3, y + 8, 38, 208);
        ctx.fillStyle = '#ffffff'; for (let i = 0; i < 12; i++) ctx.fillRect(x + 21, y + 16 + i * 16, 2, 8);
        ctx.fillStyle = '#6a5a40'; for (let i = 0; i < 26; i++) ctx.fillRect(x + 3, y + 12 + i * 8, 38, 1);
        ctx.fillStyle = '#404850'; ctx.fillRect(x + 44, y + 120, 8, 30); ctx.fillStyle = '#606870'; ctx.fillRect(x + 45, y + 124, 6, 6);
      }

      // ================= Game state =================
      const CARRIER_Y = 190;
      function newGame() {
        g = { score: 0, lives: 2, stage: 1, loop: 0, nextLife: 20000 };
        startStage(true);
        au.melody([[392, .15], [392, .08], [523, .15], [659, .15], [784, .3], [659, .15], [784, .45]], { type: 'square', vol: 0.12 });
      }
      function resetPlayer() {
        g.p = { x: W / 2, y: CARRIER_Y, alive: true, roll: 0, rolling: false, inv: 0 };
        g.gun = 0; g.sides = [false, false]; g.rolls = 3;
      }
      function startStage(first) {
        if (first || !g.p) resetPlayer();
        g.p.x = W / 2; g.p.y = CARRIER_Y; g.p.rolling = false; g.rolls = Math.max(g.rolls, 3);
        g.en = []; g.eb = []; g.pb = []; g.booms = []; g.pops = []; g.pows = [];
        g.st = 0; g.stLen = Math.min(3600, 2100 + g.stage * 50); g.spawnT = 120;
        g.kills = 0; g.spawned = 0; g.redDone = [false, false, false]; g.squad = 0;
        g.phase = 'takeoff'; g.phaseT = 0; g.carrierY = CARRIER_Y; g.stopFire = 0; g.boss = false; g.fireT = 0;
      }
      const diff = () => Math.min(1, (g.stage - 1 + g.loop * 16) / 28);
      function addScore(n) {
        g.score += n;
        while (g.score >= g.nextLife) {
          g.lives++; g.nextLife = g.nextLife === 20000 ? 80000 : g.nextLife + 80000;
          au.melody([[523, .08], [659, .08], [784, .08], [1047, .2]], { type: 'square', vol: 0.12 });
        }
        if (g.score > hi) hi = g.score;
      }
      function boom(x, y, big) { g.booms.push({ x, y, t: 0, big: !!big }); }
      function pop(x, y, n) { g.pops.push({ x, y, n, t: 50 }); }

      // ================= Enemy formations =================
      // program steps: [frames, turn deg/frame, speed?]
      const PROG = {
        dive: [[70, 0, 2.2], [45, 4], [300, 0]],
        swoop: [[50, 0, 2.0], [80, 1.6], [300, 0]],
        sweep: [[30, 0, 2.2], [90, 2.4], [40, 0], [300, -0.2]],
        rise: [[70, 0, 2.6], [45, 4], [300, 0]],
        sshape: [[40, 0, 2.0], [45, 2.5], [40, -2.5], [45, 2.5], [300, 0]],
        red: [[40, 0, 2.2], [90, 4], [20, 0], [90, -4], [300, 0]]
      };
      function addEnemy(e) { g.en.push(e); g.spawned++; }
      function spawnFormation() {
        const D = diff(), r = Math.random(), mir = Math.random() < 0.5 ? -1 : 1;
        const sp = 1 + D * 0.35;
        const mk = (type, x, y, a, prog, delay, extra) => Object.assign({ type, x, y, a, prog: PROG[prog], pi: 0, pt: 0, sp: PROG[prog][0][2] * sp, mir, delay, hp: 1, t: 0 }, extra || {});
        if (r < 0.3) {
          const n = 4 + (Math.random() * 3 | 0), x0 = 30 + Math.random() * (W - 60);
          for (let i = 0; i < n; i++) addEnemy(mk('zero', x0 + (i % 2) * 12 * mir, -10, Math.PI / 2, 'dive', i * 10));
        } else if (r < 0.5) {
          const n = 5;
          for (let i = 0; i < n; i++) addEnemy(mk('zero', mir > 0 ? -10 : W + 10, 10, mir > 0 ? 0.6 : Math.PI - 0.6, 'swoop', i * 9));
        } else if (r < 0.65) {
          const n = 4;
          for (let i = 0; i < n; i++) addEnemy(mk('zero', mir > 0 ? -10 : W + 10, 40 + Math.random() * 40, mir > 0 ? 0 : Math.PI, 'sweep', i * 10));
        } else if (r < 0.8) {
          const n = 3 + (Math.random() * 3 | 0), x0 = 40 + Math.random() * (W - 80);
          for (let i = 0; i < n; i++) addEnemy(mk('zero', x0 + (i - n / 2) * 16, H + 12 + i * 4, -Math.PI / 2, 'rise', i * 6));
        } else if (r < 0.92) {
          const x0 = 40 + Math.random() * (W - 80);
          for (let i = 0; i < 4; i++) addEnemy(mk('zero', x0, -10, Math.PI / 2, 'sshape', i * 10));
        } else {
          // lone grey fighters that aim straight at the player
          for (let i = 0; i < 2 + (D * 3 | 0); i++) {
            const x = 20 + Math.random() * (W - 40), a = Math.atan2(g.p.y + 20, g.p.x - x);
            addEnemy({ type: 'grey', x, y: -10 - i * 20, a, prog: [[999, 0, 2.4 + D]], pi: 0, pt: 0, sp: 2.4 + D, mir: 1, delay: i * 15, hp: 1, t: 0 });
          }
        }
      }
      function spawnRed() {
        g.squad++;
        const mir = Math.random() < 0.5 ? -1 : 1;
        const id = g.squad;
        for (let i = 0; i < 5; i++) addEnemy({ type: 'red', squad: id, x: mir > 0 ? 40 : W - 40, y: -10, a: Math.PI / 2, prog: PROG.red, pi: 0, pt: 0, sp: 2.2 * (1 + diff() * 0.3), mir, delay: i * 9, hp: 1, t: 0 });
        g.redLeft = g.redLeft || {}; g.redLeft[id] = 5;
      }
      function spawnMedium(fromBelow) {
        const x = 40 + Math.random() * (W - 80);
        addEnemy({ type: 'medium', x, y: fromBelow ? H + 20 : -20, vy: fromBelow ? -0.9 : 0.7, vx: 0, hp: 10 + (diff() * 10 | 0), flash: 0, t: 0, delay: 0, below: fromBelow, life: 900 });
      }
      function spawnBoss() {
        if (g.stage % 4 === 0) {
          addEnemy({ type: 'ayako', x: W / 2, y: H + 40, vy: -0.6, vx: 0, hp: 60 + (diff() * 60 | 0), flash: 0, t: 0, delay: 0, life: 1900 });
          g.msg = 'AYAKO'; g.msgT = 120;
        } else {
          spawnMedium(false); spawnMedium(Math.random() < 0.5);
          if (g.stage > 8) spawnMedium(false);
        }
        g.boss = true;
        au.melody([[220, .15], [208, .15], [196, .15], [185, .3]], { type: 'sawtooth', vol: 0.1 });
      }
      function enemyShoot(x, y, sp) {
        if (g.stopFire > 0 || !g.p.alive) return;
        const dx = g.p.x - x, dy = g.p.y - y, L = Math.hypot(dx, dy) || 1;
        sp = sp || 1.6 + diff() * 1.0;
        g.eb.push({ x, y, vx: dx / L * sp, vy: dy / L * sp });
      }
      function updEnemies() {
        const D = diff();
        for (const e of g.en) {
          if (e.delay > 0) { e.delay--; continue; }
          e.t++;
          if (e.prog) {
            const step = e.prog[e.pi];
            if (step[2]) e.sp = step[2] * (1 + D * 0.35);
            e.a += step[1] * Math.PI / 180 * e.mir;
            if (++e.pt >= step[0] && e.pi < e.prog.length - 1) { e.pi++; e.pt = 0; }
            e.x += Math.cos(e.a) * e.sp; e.y += Math.sin(e.a) * e.sp;
            if (e.y > 0 && e.y < H - 60 && Math.random() < 0.004 + D * 0.008) enemyShoot(e.x, e.y);
            if (e.t > 40 && (e.x < -30 || e.x > W + 30 || e.y < -30 || e.y > H + 30)) e.gone = true;
          } else if (e.type === 'medium') {
            if (e.flash) e.flash--;
            e.life--;
            if (e.below) { if (e.y < 60) e.vy = Math.min(0.3, e.vy + 0.02); }
            else if (e.y > 70) e.vy = Math.max(0.1, e.vy - 0.01);
            e.vx = Math.sin(e.t / 60) * 0.5;
            if (e.life < 0) e.vy = e.below ? -1.4 : 1.4;
            e.x += e.vx; e.y += e.vy;
            if (e.t % Math.max(40, 90 - (D * 50 | 0)) === 0 && e.y > 0 && e.y < H - 40) { enemyShoot(e.x - 8, e.y + 6); enemyShoot(e.x + 8, e.y + 6); if (D > 0.3) enemyShoot(e.x, e.y + 8, 2); }
            if (e.t > 60 && (e.y < -40 || e.y > H + 40)) e.gone = true;
          } else if (e.type === 'ayako') {
            if (e.flash) e.flash--;
            e.life--;
            if (e.y > 70) e.vy = -0.6; else e.vy = Math.min(0, e.vy + 0.02);
            e.vx = Math.sin(e.t / 90) * 0.6;
            if (e.life < 0) e.vy = -1.2;
            e.x += e.vx; e.y += e.vy;
            if (e.y < H - 50 && e.life > 0) {
              const per = Math.max(30, 70 - (D * 40 | 0));
              if (e.t % per === 0) for (let k = -2; k <= 2; k++) { if (g.stopFire > 0) break; const a = Math.PI / 2 + k * 0.25; g.eb.push({ x: e.x, y: e.y + 16, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6 }); }
              if (e.t % per === per >> 1) { enemyShoot(e.x - 24, e.y + 4); enemyShoot(e.x + 24, e.y + 4); }
            }
            if (e.t > 100 && e.y < -60) e.gone = true;
          }
        }
        g.en = g.en.filter(e => !e.gone && !e.dead);
      }
      function killEnemy(e) {
        e.dead = true; g.kills++;
        const pts = { zero: 50, grey: 100, red: 100, medium: 1500, ayako: 20000 }[e.type];
        addScore(pts);
        if (e.type === 'medium' || e.type === 'ayako') {
          pop(e.x, e.y, pts);
          for (let k = 0; k < (e.type === 'ayako' ? 10 : 4); k++) boom(e.x + (Math.random() - 0.5) * (e.type === 'ayako' ? 60 : 24), e.y + (Math.random() - 0.5) * 24, true);
          au.noise(e.type === 'ayako' ? 1.6 : 0.8, { vol: 0.25, freq: 1800, slideTo: 60 });
        } else {
          boom(e.x, e.y, false);
          au.noise(0.2, { vol: 0.18, freq: 2600, slideTo: 200 });
        }
        if (e.type === 'red') {
          g.redLeft[e.squad]--;
          if (g.redLeft[e.squad] === 0) {
            const r = Math.random();
            const types = ['W', 'S', 'K', 'F', 'L', 'W', 'S'];
            let type = types[(r * types.length) | 0];
            if (Math.random() < 0.06) type = 'U';
            if (type === 'W' && g.gun >= 1 && Math.random() < 0.5) type = 'S';
            g.pows.push({ x: e.x, y: e.y, type, t: 0 });
            au.melody([[1047, .06], [1319, .06], [1047, .06], [1319, .06]], { type: 'square', vol: 0.1 });
          }
        }
      }
      function collectPow(w) {
        addScore(1000); pop(w.x, w.y - 8, 1000);
        au.melody([[784, .07], [988, .07], [1175, .07], [1568, .07], [1976, .2]], { type: 'square', vol: 0.12 });
        switch (w.type) {
          case 'W': g.gun = 1; g.msg = 'DOUBLE GUNS'; break;
          case 'S': g.sides = [true, true]; g.msg = 'SIDE FIGHTERS'; break;
          case 'K': for (const e of g.en) if (e.delay <= 0 && e.y > -10 && e.y < H + 10 && (e.type !== 'ayako')) { if (e.type === 'medium') e.hp = 0; killEnemy(e); } g.eb = []; g.msg = 'ALL ENEMIES DOWN'; break;
          case 'F': g.stopFire = 600; g.eb = []; g.msg = 'ENEMY FIRE STOPPED'; break;
          case 'L': g.rolls++; g.msg = 'EXTRA LOOP'; break;
          case 'U': g.lives++; g.msg = 'EXTRA PLANE'; break;
        }
        g.msgT = 100;
      }

      // ================= Update =================
      function playerHit(sideIdx) {
        if (sideIdx >= 0) {
          g.sides[sideIdx] = false; boom(g.p.x + (sideIdx ? 18 : -18), g.p.y + 2, false);
          au.noise(0.3, { vol: 0.2, freq: 1500, slideTo: 100 });
          return;
        }
        const p = g.p; p.alive = false;
        boom(p.x, p.y, true); boom(p.x - 6, p.y + 5, true); boom(p.x + 7, p.y - 3, false);
        au.noise(1.3, { vol: 0.3, freq: 2000, slideTo: 50 });
        au.tone(600, 1.2, { type: 'sawtooth', vol: 0.1, slideTo: 50 });
        g.phase = 'dead'; g.phaseT = 150;
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 300;
        au.melody([[392, .25], [349, .25], [330, .25], [262, .6]], { type: 'square', vol: 0.1 });
      }
      function movePlayer(auto) {
        const p = g.p;
        if (!p.alive) return;
        if (auto) return;
        let dx = 0, dy = 0;
        if (api.key('ArrowLeft')) dx -= 1; if (api.key('ArrowRight')) dx += 1;
        if (api.key('ArrowUp')) dy -= 1; if (api.key('ArrowDown')) dy += 1;
        const sp = 1.9;
        p.x = Math.max(10, Math.min(W - 10, p.x + dx * sp)); p.y = Math.max(20, Math.min(H - 16, p.y + dy * sp));
        p.bank = dx;
      }
      function updPlayerActions() {
        const p = g.p;
        if (!p.alive) return;
        if (p.rolling) {
          p.roll++;
          if (p.roll >= 72) { p.rolling = false; p.roll = 0; }
        } else if (api.anyPressed('KeyX', 'KeyZ') && g.rolls > 0) {
          p.rolling = true; p.roll = 0; g.rolls--;
          au.tone(300, 0.6, { type: 'sawtooth', vol: 0.08, slideTo: 900 });
          au.tone(900, 0.5, { type: 'sawtooth', vol: 0.06, slideTo: 300, delay: 0.6 });
        }
        if (g.fireT > 0) g.fireT--;
        if (!p.rolling && (api.pressed('Space') || (api.key('Space') && g.fireT <= 0)) && g.pb.length < 14) {
          g.fireT = 6;
          if (g.gun) { g.pb.push({ x: p.x - 6, y: p.y - 8 }, { x: p.x - 2, y: p.y - 10 }, { x: p.x + 2, y: p.y - 10 }, { x: p.x + 6, y: p.y - 8 }); }
          else g.pb.push({ x: p.x - 2, y: p.y - 10 }, { x: p.x + 2, y: p.y - 10 });
          if (g.sides[0]) g.pb.push({ x: p.x - 18, y: p.y - 4 });
          if (g.sides[1]) g.pb.push({ x: p.x + 18, y: p.y - 4 });
          au.tone(220, 0.05, { type: 'square', vol: 0.07, slideTo: 110 });
        }
      }
      function updShots() {
        for (const b of g.pb) b.y -= 6;
        g.pb = g.pb.filter(b => b.y > -6);
        for (const b of g.eb) { b.x += b.vx; b.y += b.vy; }
        g.eb = g.eb.filter(b => b.x > -4 && b.x < W + 4 && b.y > -4 && b.y < H + 4);
        for (const b of g.pb) {
          for (const e of g.en) {
            if (e.dead || e.delay > 0 || b.hit) continue;
            const rx = e.type === 'ayako' ? 34 : e.type === 'medium' ? 11 : 6, ry = e.type === 'ayako' ? 16 : e.type === 'medium' ? 7 : 6;
            if (Math.abs(b.x - e.x) < rx && Math.abs(b.y - e.y) < ry) {
              b.hit = true; e.hp--;
              if (e.hp <= 0) killEnemy(e);
              else { e.flash = 4; au.tone(1200, 0.03, { type: 'square', vol: 0.05 }); }
            }
          }
        }
        g.pb = g.pb.filter(b => !b.hit); g.en = g.en.filter(e => !e.dead);
        // POWs
        for (const w of g.pows) { w.t++; w.y += 0.5; w.x += Math.sin(w.t / 20) * 0.4; }
        const p = g.p;
        if (p.alive) for (const w of g.pows) if (!w.got && Math.abs(w.x - p.x) < 12 && Math.abs(w.y - p.y) < 10) { w.got = true; collectPow(w); }
        g.pows = g.pows.filter(w => !w.got && w.y < H + 10);
        // player collisions
        if (p.alive && !p.rolling) {
          const hitAt = (x, y, r) => {
            if (Math.abs(x - p.x) < r + 3 && Math.abs(y - p.y) < r + 3) return -1;
            if (g.sides[0] && Math.abs(x - (p.x - 18)) < r + 2 && Math.abs(y - (p.y + 2)) < r + 2) return 0;
            if (g.sides[1] && Math.abs(x - (p.x + 18)) < r + 2 && Math.abs(y - (p.y + 2)) < r + 2) return 1;
            return -2;
          };
          for (const b of g.eb) { const h = hitAt(b.x, b.y, 1); if (h > -2) { b.hit = true; playerHit(h); if (!p.alive) break; } }
          g.eb = g.eb.filter(b => !b.hit);
          if (p.alive) for (const e of g.en) {
            if (e.delay > 0) continue;
            const r = e.type === 'ayako' ? 20 : e.type === 'medium' ? 8 : 4;
            const h = hitAt(e.x, e.y, r);
            if (h > -2) {
              if (e.type === 'zero' || e.type === 'red' || e.type === 'grey') { killEnemy(e); }
              playerHit(h); if (!p.alive) break;
            }
          }
          g.en = g.en.filter(e => !e.dead);
        }
      }
      function updPlay() {
        g.st++; scroll += 0.6;
        if (g.stopFire > 0) g.stopFire--;
        if (g.msgT > 0) g.msgT--;
        movePlayer(false); updPlayerActions();
        if (g.st < g.stLen) {
          if (--g.spawnT <= 0) { spawnFormation(); g.spawnT = Math.max(45, 110 - diff() * 60) * (0.7 + Math.random() * 0.6); }
          const marks = [0.2, 0.5, 0.8];
          marks.forEach((m, i) => { if (!g.redDone[i] && g.st > g.stLen * m) { g.redDone[i] = true; spawnRed(); } });
          if (g.stage >= 3 && g.st % 900 === 450) spawnMedium(Math.random() < 0.4);
        } else if (!g.boss) {
          if (!g.en.length || g.st > g.stLen + 400) spawnBoss();
        } else if (!g.en.length) {
          g.phase = 'landing'; g.phaseT = 0; g.carrierY = -130; g.eb = [];
          au.melody([[523, .15], [659, .15], [784, .15], [1047, .3], [784, .15], [1047, .5]], { type: 'square', vol: 0.12 });
        }
        updEnemies(); updShots();
        // background march: a light two-bar figure
        if (frame % 120 === 0 && g.p.alive) {
          au.melody([[196, .12], [0, .12], [247, .12], [0, .12], [294, .12], [0, .12], [247, .12], [0, .12]], { type: 'triangle', vol: 0.06 });
        }
      }
      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++; scroll += 0.6;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { mode = 'game'; newGame(); }
            else { coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 }); }
          }
          return;
        }
        for (const b of g.booms) b.t++;
        g.booms = g.booms.filter(b => b.t < (b.big ? 40 : 24));
        for (const q of g.pops) q.t--;
        g.pops = g.pops.filter(q => q.t > 0);
        const p = g.p;
        switch (g.phase) {
          case 'takeoff':
            g.phaseT++; scroll += 0.6;
            g.carrierY += Math.min(1.2, g.phaseT / 80);
            if (g.phaseT < 70) { p.y = g.carrierY - 70 + Math.max(0, 70 - g.phaseT) * 0.9; }
            else { p.y = Math.max(p.y - 0.8, Math.min(p.y, 190)); movePlayer(false); }
            if (g.phaseT > 200) g.phase = 'play';
            break;
          case 'play': updPlay(); break;
          case 'landing':
            g.phaseT++; scroll += 0.6;
            for (const b of g.booms) b.y += 0.6;
            if (g.carrierY < 150) g.carrierY += 0.8;
            p.rolling = false;
            p.x += Math.max(-1, Math.min(1, W / 2 - p.x)); p.y += Math.max(-1, Math.min(1, g.carrierY - 70 - p.y));
            updShots();
            if (g.phaseT > 260) {
              const ratio = g.spawned ? Math.round(g.kills / g.spawned * 100) : 0;
              const bonus = ratio >= 100 ? 50000 : ratio >= 90 ? 20000 : ratio >= 80 ? 10000 : ratio >= 70 ? 5000 : ratio >= 60 ? 2000 : ratio >= 50 ? 1000 : 0;
              g.ratio = ratio; g.bonus = bonus; addScore(bonus);
              g.phase = 'tally'; g.phaseT = 240;
              if (bonus) au.melody([[784, .1], [988, .1], [1175, .1], [1568, .3]], { type: 'square', vol: 0.12, delay: 0.4 });
            }
            break;
          case 'tally':
            if (--g.phaseT <= 0) {
              g.stage++;
              if (g.stage > 32) { g.stage = 1; g.loop++; g.msg = 'CONGRATULATIONS'; g.msgT = 200; }
              startStage(false);
              g.p.gun = g.gun;
            }
            break;
          case 'dead':
            scroll += 0.6;
            updEnemies();
            for (const b of g.eb) { b.x += b.vx; b.y += b.vy; }
            if (--g.phaseT <= 0) {
              if (g.lives > 0) { g.lives--; respawn(); }
              else {
                g.phase = 'wait';
                const cg = g;
                if (api.offerContinue) api.offerContinue(() => { if (g === cg) { g.lives = 2; respawn(); } }, () => { if (g === cg) gameOver(); });
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
        const keepGun = 0;
        g.p = { x: W / 2, y: H - 40, alive: true, roll: 0, rolling: false, inv: 0 };
        g.gun = keepGun; g.sides = [false, false]; g.rolls = 3; g.eb = [];
        g.phase = 'play'; g.p.inv = 120;
        g.en = g.en.filter(e => e.type === 'medium' || e.type === 'ayako');
      }

      // ================= Rendering =================
      function disc(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
      function drawPlayer(ctx) {
        const p = g.p;
        if (!p.alive) return;
        if (p.inv > 0 && g.phase === 'play') { p.inv--; if ((p.inv >> 2) & 1) return; }
        const x = Math.round(p.x), y = Math.round(p.y);
        if (p.rolling) {
          const t = p.roll / 72, s = 1 + 0.6 * Math.sin(Math.PI * t), fy = Math.cos(2 * Math.PI * t), oy = -Math.sin(2 * Math.PI * t) * 22;
          ctx.drawImage(P38S, x - 7 + 10, y + 14);
          ctx.save(); ctx.translate(x, y + oy); ctx.scale(s, s * (Math.abs(fy) < 0.15 ? 0.15 * Math.sign(fy || 1) : fy));
          ctx.drawImage(P38, -7, -5); ctx.restore();
          return;
        }
        ctx.drawImage(P38S, x - 7 + 6, y + 8);
        ctx.drawImage(P38, x - 7, y - 5);
        // propellers
        if ((frame >> 1) & 1) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 6, y - 5, 3, 1); ctx.fillRect(x + 4, y - 5, 3, 1); }
        if (g.sides[0]) ctx.drawImage(MINI, x - 20, y);
        if (g.sides[1]) ctx.drawImage(MINI, x + 16, y);
      }
      function drawAyako(ctx, e) {
        const x = Math.round(e.x), y = Math.round(e.y), hit = e.flash > 0;
        const body = hit ? '#ffffff' : '#4a6a3a', dark = hit ? '#ffd0d0' : '#2a3a22', light = hit ? '#ffffff' : '#6a8a50';
        ctx.fillStyle = 'rgba(0,0,30,0.3)'; ctx.fillRect(x - 40 + 14, y - 4 + 20, 80, 10);
        ctx.fillStyle = body; ctx.fillRect(x - 44, y - 4, 88, 10);              // wing
        ctx.fillStyle = light; ctx.fillRect(x - 44, y - 4, 88, 2);
        ctx.fillStyle = body; ctx.fillRect(x - 5, y - 26, 10, 50);              // fuselage
        ctx.fillStyle = light; ctx.fillRect(x - 3, y - 26, 2, 50);
        ctx.fillStyle = body; ctx.fillRect(x - 16, y - 24, 32, 6);              // tail plane (faces down: tail at top)
        ctx.fillStyle = '#a0c0ff'; ctx.fillRect(x - 3, y + 18, 6, 4);           // nose glass
        for (const ex of [-32, -16, 16, 32]) {
          ctx.fillStyle = dark; ctx.fillRect(x + ex - 3, y - 8, 6, 18);
          ctx.fillStyle = (frame >> 1) & 1 ? '#ffffff' : '#808080'; ctx.fillRect(x + ex - 5, y + 10, 10, 1);
        }
        disc(ctx, x - 30, y + 1, 3, hit ? '#fff' : '#ff2020'); disc(ctx, x + 30, y + 1, 3, hit ? '#fff' : '#ff2020');
      }
      function drawEnemy(ctx, e) {
        if (e.delay > 0) return;
        const x = Math.round(e.x), y = Math.round(e.y);
        if (e.type === 'zero') ctx.drawImage(ZERO[rotIdx(e.a)], x - 7, y - 7);
        else if (e.type === 'red') ctx.drawImage(RED[rotIdx(e.a)], x - 7, y - 7);
        else if (e.type === 'grey') ctx.drawImage(GREY[rotIdx(e.a)], x - 7, y - 7);
        else if (e.type === 'medium') {
          ctx.save(); ctx.translate(x, y); if (!e.below) ctx.scale(1, -1);
          ctx.drawImage(e.flash ? MEDIUM_HIT : MEDIUM, -11, -7); ctx.restore();
        } else if (e.type === 'ayako') drawAyako(ctx, e);
      }
      function drawBoom(ctx, b) {
        const T = b.big ? 40 : 24, f = b.t / T, r = (b.big ? 14 : 8) * Math.sqrt(f) + 2;
        const col = f < 0.2 ? '#ffffff' : f < 0.45 ? '#ffe040' : f < 0.7 ? '#ff7010' : '#803010';
        disc(ctx, b.x, b.y, r * (1 - f * 0.4), col);
        ctx.fillStyle = '#ffffff';
        for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + b.t * 0.1; ctx.fillRect(Math.round(b.x + Math.cos(a) * r * 1.3), Math.round(b.y + Math.sin(a) * r * 1.3), 1, 1); }
      }
      function hud(ctx) {
        text(ctx, '1UP', 12, 2, '#ff3030');
        text(ctx, String(g ? g.score : 0).padStart(7, ' '), 4, 11, '#ffffff');
        text(ctx, 'HIGH SCORE', W / 2 + 20, 2, '#ff3030', { center: true });
        text(ctx, String(hi).padStart(7, ' '), W / 2 - 8, 11, '#ffffff');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        drawOcean(ctx, scroll);
        if (mode === 'title') { renderTitle(ctx); return; }
        if (g.phase === 'takeoff' || g.phase === 'landing' || g.phase === 'tally') drawCarrier(ctx, g.carrierY);
        for (const w of g.pows) ctx.drawImage(POWSPR[w.type], Math.round(w.x) - 6, Math.round(w.y) - 4);
        for (const e of g.en) if (e.type === 'medium' || e.type === 'ayako') drawEnemy(ctx, e);
        for (const e of g.en) if (e.type !== 'medium' && e.type !== 'ayako') drawEnemy(ctx, e);
        drawPlayer(ctx);
        ctx.fillStyle = '#ffff80';
        for (const b of g.pb) { ctx.fillRect(Math.round(b.x), Math.round(b.y), 1, 4); }
        for (const b of g.eb) { disc(ctx, b.x, b.y, 1.6, (frame >> 2) & 1 ? '#ffffff' : '#ff8080'); }
        for (const b of g.booms) drawBoom(ctx, b);
        drawClouds(ctx, scroll);
        for (const q of g.pops) text(ctx, q.n, q.x, Math.round(q.y - (50 - q.t) * 0.3), '#ffffff', { center: true });
        hud(ctx);
        for (let i = 0; i < Math.min(5, g.lives); i++) ctx.drawImage(P38, 2 + i * 16, H - 13);
        for (let i = 0; i < Math.min(8, g.rolls); i++) text(ctx, 'R', W - 10 - i * 9, H - 10, '#ffe040');
        if (g.stopFire > 0 && (frame >> 4) & 1) text(ctx, 'NO FIRE', W - 4, 22, '#ffe040', { right: true });
        if (g.msgT > 0 && g.phase === 'play') text(ctx, g.msg, W / 2, 100, '#ffffff', { center: true });
        if (g.phase === 'takeoff' && g.phaseT < 180) {
          text(ctx, 'STAGE ' + g.stage, W / 2, 90, '#ffffff', { center: true, scale: 2 });
          text(ctx, (33 - g.stage) + ' STAGES TO GO', W / 2, 112, '#ffe040', { center: true });
          if (g.phaseT > 60) text(ctx, 'READY', W / 2, 126, '#ff4040', { center: true });
        }
        if (g.phase === 'tally') {
          ctx.fillStyle = 'rgba(0,0,40,0.7)'; ctx.fillRect(20, 70, W - 40, 80);
          text(ctx, 'SHOOTING DOWN', W / 2 - 10, 82, '#ffffff', { center: true });
          text(ctx, g.ratio + '%', W - 32, 82, '#ffe040', { right: true });
          text(ctx, 'SPECIAL BONUS', W / 2, 104, '#ffffff', { center: true });
          text(ctx, g.bonus + ' PTS', W / 2, 118, g.bonus ? '#40ff40' : '#a0a0a0', { center: true });
          if (g.msgT > 0 && g.msg === 'CONGRATULATIONS') { g.msgT--; text(ctx, 'CONGRATULATIONS', W / 2, 136, '#ff4040', { center: true }); }
        }
        if (g.phase === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(40, 112, W - 80, 28);
          text(ctx, 'GAME OVER', W / 2, 122, '#ff3030', { center: true });
        }
      }
      function renderTitle(ctx) {
        ctx.fillStyle = 'rgba(0,0,30,0.45)'; ctx.fillRect(0, 0, W, H);
        text(ctx, '1UP', 12, 2, '#ff3030');
        text(ctx, 'HIGH SCORE', W / 2 + 20, 2, '#ff3030', { center: true });
        text(ctx, String(hi).padStart(7, ' '), W / 2 - 8, 11, '#ffffff');
        // logo
        const ly = 36;
        text(ctx, '1942', W / 2 + 3, ly + 3, '#601010', { center: true, scale: 6 });
        const bands = [[0, 14, '#ffffff'], [14, 28, '#ffd040'], [28, 42, '#ff6020']];
        for (const [a, b, c] of bands) { ctx.save(); ctx.beginPath(); ctx.rect(0, ly + a, W, b - a); ctx.clip(); text(ctx, '1942', W / 2, ly, c, { center: true, scale: 6 }); ctx.restore(); }
        const page = (titleT / 420 | 0) % 2;
        if (page === 0) {
          ctx.drawImage(P38, W / 2 - 7, 92);
          text(ctx, 'SUPER ACE', W / 2, 108, '#ffffff', { center: true });
          text(ctx, 'SHOOT A RED SQUADRON', W / 2, 128, '#ff6060', { center: true });
          text(ctx, 'FOR A POW', W / 2, 138, '#ff6060', { center: true });
          text(ctx, 'X: LOOP TO DODGE', W / 2, 156, '#a0e0ff', { center: true });
          text(ctx, '1ST BONUS 20000 PTS', W / 2, 176, '#ffff60', { center: true });
          text(ctx, 'AND EVERY 80000 PTS', W / 2, 186, '#ffff60', { center: true });
        } else {
          text(ctx, '- POW -', W / 2, 92, '#ffff60', { center: true });
          const rows = [['W', 'DOUBLE GUNS'], ['S', 'SIDE FIGHTERS'], ['K', 'DESTROY ALL'], ['F', 'STOP FIRE'], ['L', 'EXTRA LOOP'], ['U', 'EXTRA PLANE']];
          rows.forEach((r, i) => { const y = 108 + i * 14; ctx.drawImage(POWSPR[r[0]], 40, y - 1); text(ctx, r[1], 62, y, '#ffffff'); });
        }
        if (api.credits === 0 || coinFlash > 0) { if (coinFlash > 0 ? (coinFlash >> 2) & 1 : (frame >> 5) & 1) text(ctx, 'INSERT COIN', W / 2, 212, '#ff3030', { center: true }); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START BUTTON', W / 2, 212, '#ffffff', { center: true });
        text(ctx, '\u00a9 CAPCOM 1984', W / 2, 228, '#ffffff', { center: true });
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 9, '#ffffff');
      }
      return { update, render, destroy() { } };
    }
  });
})();
