// Gyruss (Konami, 1983) \u2014 built-in recreation for the MAME32 Game Room.
// Orbit the rim, shoot into the vortex, warp from Neptune to Earth to the beat of a Bach toccata.
(function () {
  'use strict';
  const W = 224, H = 256;
  const CX = 112, CY = 124, R = 98;           // vortex centre and the player's orbit radius

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
  const NROT = 32;
  function rotSet(rows, pal, N) { const a = []; for (let i = 0; i < NROT; i++) a.push(spr(rotRows(rows, i * 2 * Math.PI / NROT, N), pal)); return a; }
  function rotIdx(a) { return ((Math.round((a + Math.PI / 2) / (2 * Math.PI) * NROT) % NROT) + NROT) % NROT; }

  // ================= Sprites (art faces UP) =================
  const SHIP = rotSet([
    '......W......',
    '......W......',
    '.....WBW.....',
    '.....WBW.....',
    '..R..WWW..R..',
    '..W.WWWWW.W..',
    '.WW.WWRWW.WW.',
    'WWWWWWRWWWWWW',
    'WWWWWWWWWWWWW',
    'WW..WWWWW..WW',
    'R....RRR....R',
    '.....R.R.....'], { W: '#e8e8ff', B: '#40a0ff', R: '#ff3020' }, 17);
  const ENEMY_ART = [
    'A.........A',
    'AA...W...AA',
    'AAA.WBW.AAA',
    '.AAABBBAAA.',
    '..AABCBAA..',
    '...ABBBA...',
    '....ABA....',
    '.....A.....'];
  const ENEMY_PALS = [
    { A: '#30a0ff', B: '#ffe020', C: '#ff2020', W: '#ffffff' },
    { A: '#30ff60', B: '#ff60ff', C: '#ffffff', W: '#ffffff' },
    { A: '#ff4040', B: '#40e0ff', C: '#ffff40', W: '#ffffff' },
    { A: '#ffa020', B: '#8040ff', C: '#ffffff', W: '#ffffff' },
    { A: '#e0e0e0', B: '#ff3030', C: '#30ff30', W: '#ffff00' }
  ];
  const ENEMY = ENEMY_PALS.map(p => rotSet(ENEMY_ART, p, 13));
  const SAT = spr([
    '.G...G.',
    'GGG.GGG',
    '.GWWWG.',
    '..WRW..',
    '.GWWWG.',
    'GGG.GGG',
    '.G...G.'], { G: '#a0a0b0', W: '#ffffff', R: '#ff3030' });
  const ROCK = spr([
    '..DDDD..',
    '.DMMMLD.',
    'DMMLLMMD',
    'DMMMMMDD',
    'DMDMMMMD',
    'DMMMDMMD',
    '.DMMMMD.',
    '..DDDD..'], { D: '#604020', M: '#a07040', L: '#d0a070' });

  const PLANETS = [
    { name: 'NEPTUNE', c1: '#3050ff', c2: '#80a0ff', warps: 2 },
    { name: 'URANUS', c1: '#40c0c0', c2: '#a0ffff', warps: 3 },
    { name: 'SATURN', c1: '#c0a050', c2: '#ffe0a0', warps: 3, ring: true },
    { name: 'JUPITER', c1: '#c07040', c2: '#ffc090', warps: 3, bands: true },
    { name: 'MARS', c1: '#c03010', c2: '#ff8050', warps: 3 },
    { name: 'EARTH', c1: '#2060e0', c2: '#30c040', warps: 3, earth: true }
  ];

  // ================= Music: toccata-style theme =================
  const MF = m => 440 * Math.pow(2, (m - 69) / 12);
  const S = 0.105;  // sixteenth note
  const MOTIF = o => [[MF(81 - o), S], [MF(79 - o), S], [MF(81 - o), S * 6], [0, S * 2], [MF(79 - o), S], [MF(77 - o), S], [MF(76 - o), S], [MF(74 - o), S], [MF(73 - o), S * 3], [MF(74 - o), S * 5]];
  const ARP = (a, b, c) => { const n = []; for (let i = 0; i < 4; i++) n.push([MF(a), S], [MF(b), S], [MF(c), S], [MF(b), S]); return n; };
  const BARS = [
    { lead: MOTIF(0), bass: [[MF(38), S * 16]] },
    { lead: MOTIF(12), bass: [[MF(38), S * 16]] },
    { lead: ARP(69, 74, 77), bass: [[MF(38), S * 4], [MF(50), S * 4], [MF(38), S * 4], [MF(50), S * 4]], top: [[MF(86), S * 8], [MF(84), S * 4], [MF(82), S * 4]] },
    { lead: ARP(69, 73, 76), bass: [[MF(33), S * 4], [MF(45), S * 4], [MF(33), S * 4], [MF(45), S * 4]], top: [[MF(81), S * 12], [MF(79), S * 4]] },
    { lead: ARP(70, 74, 79), bass: [[MF(31), S * 4], [MF(43), S * 4], [MF(31), S * 4], [MF(43), S * 4]], top: [[MF(77), S * 8], [MF(79), S * 4], [MF(82), S * 4]] },
    { lead: ARP(69, 73, 79), bass: [[MF(33), S * 4], [MF(45), S * 4], [MF(33), S * 4], [MF(45), S * 4]], top: [[MF(81), S * 6], [MF(79), S * 2], [MF(77), S * 2], [MF(76), S * 2], [MF(73), S * 4]] },
    { lead: ARP(69, 74, 77), bass: [[MF(38), S * 4], [MF(50), S * 4], [MF(38), S * 4], [MF(50), S * 4]], top: [[MF(74), S * 16]] },
    { lead: ARP(70, 74, 77), bass: [[MF(34), S * 4], [MF(46), S * 4], [MF(34), S * 4], [MF(46), S * 4]], top: [[MF(77), S * 8], [MF(74), S * 8]] },
    { lead: ARP(69, 73, 76), bass: [[MF(33), S * 4], [MF(45), S * 4], [MF(33), S * 4], [MF(45), S * 4]], top: [[MF(76), S * 4], [MF(79), S * 4], [MF(81), S * 8]] },
    { lead: ARP(69, 74, 77), bass: [[MF(38), S * 8], [MF(26), S * 8]], top: [[MF(74), S * 16]] }
  ];
  const BAR_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5, 6, 7, 8, 9];

  ArcadeRegistry.register({
    id: 'gyruss', title: 'Gyruss', year: 1983, maker: 'Konami',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: fly around the rim (toward the pushed direction) \u00b7 Space: fire \u00b7 Enter: start',
    marquee: { bg: '#000020', fg: '#ff40c0', accent: '#40c0ff' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(30000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0;
      let g = null;
      const stars = [];
      for (let i = 0; i < 80; i++) stars.push({ a: Math.random() * Math.PI * 2, r: Math.random() * 150, c: ['#ffffff', '#ffff80', '#80c0ff', '#ff80ff'][i % 4] });
      let starSpeed = 1;
      const polar = (r, a) => ({ x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r });
      const scaleOf = r => 0.3 + 0.7 * Math.min(1.2, Math.max(0, r) / R);

      // ================= Music scheduler =================
      let musNext = 0, musI = 0;
      function musicTick() {
        if (frame < musNext) return;
        const bar = BARS[BAR_ORDER[musI % BAR_ORDER.length]]; musI++;
        const d = au.melody(bar.lead, { type: 'square', vol: 0.05 });
        au.melody(bar.bass, { type: 'triangle', vol: 0.11 });
        if (bar.top) au.melody(bar.top, { type: 'triangle', vol: 0.06 });
        // a little drum on the beats
        for (let k = 0; k < 4; k++) au.noise(0.05, { vol: 0.06, freq: k % 2 ? 6000 : 1200, type: k % 2 ? 'highpass' : 'lowpass', delay: k * S * 4 });
        musNext = frame + Math.max(60, Math.round(Math.max(d, S * 16) * 60));
      }

      // ================= Game state =================
      function newGame() {
        g = { score: 0, lives: 2, planet: 0, loop: 0, nextLife: 30000, stage: 0, dbl: false };
        g.warps = PLANETS[0].warps;
        resetPlayer();
        beginWarp();
        musNext = frame + 30; musI = 0;
      }
      function resetPlayer() { g.p = { a: Math.PI / 2, alive: true, inv: 0 }; g.pb = []; g.fireT = 0; }
      function beginWarp() {
        g.phase = 'warp'; g.phaseT = 200; g.en = []; g.eb = []; g.sats = []; g.rocks = []; g.booms = g.booms || []; g.pops = g.pops || [];
        au.tone(200, 1.6, { type: 'sawtooth', vol: 0.08, slideTo: 1600 });
        au.noise(1.6, { vol: 0.08, freq: 400, slideTo: 4000 });
      }
      const diff = () => Math.min(1, (g.stage + g.loop * 10) / 22);
      function startStage() {
        g.stage++;
        g.phase = 'play'; g.phaseT = 0; g.en = []; g.eb = []; g.sats = []; g.rocks = []; g.pb = [];
        g.t = 0; g.waveN = 4; g.spawnList = [];
        g.formRot = 0; g.attackT = 200; g.satDone = false; g.timeout = 0;
        const pal = (g.planet + g.stage) % ENEMY.length;
        for (let w = 0; w < g.waveN; w++) {
          const fromOut = w % 2 === 1, dir = w % 2 ? -1 : 1, th0 = Math.random() * Math.PI * 2;
          for (let i = 0; i < 8; i++) {
            g.spawnList.push({ at: 60 + w * 170 + i * 9, e: { pal, ring: w, slot: i, st: 'enter', fromOut, dir, th0, t: 0, T: 110, r: 0, a: 0 } });
          }
        }
      }
      function startChance() {
        g.phase = 'chance'; g.t = 0; g.en = []; g.eb = []; g.pb = []; g.hits = 0; g.spawnList = [];
        for (let w = 0; w < 5; w++) {
          const dir = w % 2 ? -1 : 1, th0 = Math.random() * Math.PI * 2, kind = w % 3;
          for (let i = 0; i < 8; i++) g.spawnList.push({ at: 60 + w * 200 + i * 10, e: { pal: (w + g.planet) % ENEMY.length, st: 'fly', kind, dir, th0, t: 0, r: 0, a: th0 } });
        }
      }
      function addScore(n) {
        g.score += n;
        while (g.score >= g.nextLife) {
          g.lives++; g.nextLife = g.nextLife === 30000 ? 80000 : g.nextLife + 80000;
          au.melody([[1047, .08], [1319, .08], [1568, .08], [2093, .2]], { type: 'square', vol: 0.12 });
        }
        if (g.score > hi) hi = g.score;
      }
      function boom(x, y, s) { g.booms.push({ x, y, t: 0, s: s || 1 }); }
      function pop(x, y, n) { g.pops.push({ x, y, n, t: 60 }); }

      // ================= Enemy motion =================
      const ringR = ring => 26 + ring * 14;
      function slotA(e) { return g.formRot * (e.ring % 2 ? -1 : 1) + e.slot * Math.PI / 4 + e.ring * 0.4; }
      function moveEnemy(e) {
        const ox = e.r, oa = e.a;
        e.t++;
        switch (e.st) {
          case 'enter': {
            const u = Math.min(1, e.t / e.T), rf = ringR(e.ring), sa = slotA(e);
            if (e.fromOut) { e.r = (R + 50) * (1 - u) + rf * u; e.a = sa + e.dir * (1 - u) * Math.PI * 2.2; }
            else { e.r = rf * u + 70 * Math.sin(Math.PI * u); e.a = sa + e.dir * (1 - u) * Math.PI * 2.6; }
            if (u >= 1) e.st = 'form';
            if (g.p.alive && e.t === 60 && Math.random() < 0.15 + diff() * 0.3) shoot(e);
            break;
          }
          case 'form':
            e.r = ringR(e.ring) + Math.sin(frame / 18 + e.slot) * 3; e.a = slotA(e);
            break;
          case 'attack': {
            // swing out to the rim, chasing the player's angle, then loop back through the centre
            e.r += 0.9 + e.r / R * 1.6;
            let da = g.p.a - e.a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
            e.a += Math.max(-0.03, Math.min(0.03, da)) + Math.sin(e.t / 12) * 0.02 * e.dir;
            if (!e.fired && e.r > R * 0.45) { e.fired = true; shoot(e); if (diff() > 0.5) shoot(e, 0.12); }
            if (e.r > R + 40) { e.st = 'enter'; e.fromOut = false; e.t = 0; e.T = 120; e.fired = false; e.r = 0; }
            break;
          }
          case 'leave':
            e.r -= 1.2; e.a += 0.04 * e.dir;
            if (e.r <= 2) { if (e.rejoin) { e.rejoin = false; e.st = 'enter'; e.fromOut = false; e.t = 0; e.T = 110; e.r = 0; } else e.gone = true; }
            break;
          case 'fly': {
            // chance stage: big looping sweeps out of the vortex and off screen
            const u = e.t / 150;
            if (e.kind === 0) { e.r = u * (R + 60); e.a = e.th0 + e.dir * u * Math.PI * 2; }
            else if (e.kind === 1) { e.r = 50 + Math.sin(u * Math.PI * 1.5) * 50 + u * 40; e.a = e.th0 + e.dir * u * Math.PI * 3; }
            else { e.r = (R + 60) * (1 - Math.abs(1 - u * 1.2)); e.a = e.th0 + e.dir * u * Math.PI * 1.5; }
            if (e.t > 40 && (e.r > R + 50 || e.r < 0 || u > 1.6)) e.gone = true;
            break;
          }
        }
        // facing: from the change in screen position
        const p0 = polar(ox, oa), p1 = polar(e.r, e.a);
        if (Math.abs(p1.x - p0.x) + Math.abs(p1.y - p0.y) > 0.05) e.face = Math.atan2(p1.y - p0.y, p1.x - p0.x);
        else if (e.face == null) e.face = e.a;
        if (e.st === 'form') e.face = e.a;
      }
      function shoot(e, off) {
        if (!g.p.alive) return;
        g.eb.push({ r: Math.max(4, e.r), a: e.a + (off || 0) });
        au.tone(900, 0.06, { type: 'square', vol: 0.04, slideTo: 500 });
      }

      // ================= Update =================
      function playerDie() {
        const p = g.p; if (!p.alive) return;
        p.alive = false; g.dbl = false;
        const q = polar(R, p.a); boom(q.x, q.y, 2.2); boom(q.x + 4, q.y - 4, 1.4);
        au.noise(1.4, { vol: 0.3, freq: 2400, slideTo: 50 });
        au.tone(700, 1.2, { type: 'sawtooth', vol: 0.1, slideTo: 40 });
        g.deadT = 150;
        for (const e of g.en) if (e.st === 'attack') { e.st = 'leave'; e.rejoin = true; }
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 300;
        au.melody([[MF(69), .2], [MF(67), .2], [MF(65), .2], [MF(64), .2], [MF(62), .6]], { type: 'square', vol: 0.1 });
      }
      function movePlayer() {
        const p = g.p;
        let sx = 0, sy = 0;
        if (api.key('ArrowLeft')) sx -= 1; if (api.key('ArrowRight')) sx += 1;
        if (api.key('ArrowUp')) sy -= 1; if (api.key('ArrowDown')) sy += 1;
        if (sx || sy) {
          const ta = Math.atan2(sy, sx);
          let da = ta - p.a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
          const sp = 0.05;
          if (Math.abs(da) > 0.01) p.a += Math.max(-sp, Math.min(sp, da));
          p.a = (p.a + Math.PI * 2) % (Math.PI * 2);
        }
        if (g.fireT > 0) g.fireT--;
        if ((api.pressed('Space') || (api.key('Space') && g.fireT <= 0)) && g.pb.length < (g.dbl ? 8 : 4)) {
          g.fireT = 8;
          if (g.dbl) { g.pb.push({ r: R - 8, a: p.a, off: -4 }, { r: R - 8, a: p.a, off: 4 }); }
          else g.pb.push({ r: R - 8, a: p.a, off: 0 });
          au.tone(1300, 0.07, { type: 'square', vol: 0.06, slideTo: 2600 });
        }
      }
      // player shots fly into the vortex, slowing with distance
      const shotPos = b => { const q = polar(b.r, b.a); const s = b.off * b.r / R; return { x: q.x - Math.sin(b.a) * s, y: q.y + Math.cos(b.a) * s }; };
      function updShots() {
        for (const b of g.pb) { b.r -= 1.6 + b.r / R * 3.4; }
        g.pb = g.pb.filter(b => b.r > 10 && !b.hit);
        for (const b of g.eb) b.r += 0.7 + b.r / R * 2.4;
        g.eb = g.eb.filter(b => b.r < R + 30 && !b.hit);
      }
      function shotsVsEnemies(chance) {
        for (const b of g.pb) {
          if (b.hit) continue;
          const bp = shotPos(b);
          for (const e of g.en) {
            if (e.dead || e.gone) continue;
            const q = polar(e.r, e.a), rad = 6 * scaleOf(e.r) + 1.5;
            if (Math.abs(q.x - bp.x) < rad && Math.abs(q.y - bp.y) < rad) {
              b.hit = true; e.dead = true; boom(q.x, q.y, scaleOf(e.r));
              au.noise(0.22, { vol: 0.16, freq: 2400, slideTo: 200, type: 'bandpass' });
              if (chance) { g.hits++; addScore(100); }
              else { const pts = e.st === 'form' ? 50 : 100; addScore(pts); if (pts > 50 && e.st === 'attack') pop(q.x, q.y, pts); }
              break;
            }
          }
          if (b.hit) continue;
          for (const s of g.sats) {
            if (s.dead) continue;
            const q = polar(s.r, s.a);
            if (Math.abs(q.x - bp.x) < 6 && Math.abs(q.y - bp.y) < 6) {
              b.hit = true; s.dead = true; boom(q.x, q.y, 1);
              if (s.gen) {
                if (!g.dbl) { g.dbl = true; g.msg = 'DOUBLE SHOT'; g.msgT = 120; addScore(300); pop(q.x, q.y, 300); }
                else { addScore(1000); pop(q.x, q.y, 1000); }
                au.melody([[784, .06], [1047, .06], [1319, .06], [1568, .06], [2093, .2]], { type: 'square', vol: 0.12 });
              } else { addScore(100); au.noise(0.2, { vol: 0.14, freq: 3000, slideTo: 300 }); }
              break;
            }
          }
          if (b.hit) continue;
          for (const m of g.rocks) { const q = polar(m.r, m.a), rad = 4 * scaleOf(m.r) + 1; if (Math.abs(q.x - bp.x) < rad && Math.abs(q.y - bp.y) < rad) { b.hit = true; au.tone(300, 0.03, { type: 'square', vol: 0.05 }); break; } }
        }
        g.en = g.en.filter(e => !e.dead && !e.gone);
        g.sats = g.sats.filter(s => !s.dead && !s.gone);
      }
      function playerCollisions() {
        const p = g.p; if (!p.alive || p.inv > 0) return;
        const pq = polar(R, p.a);
        for (const b of g.eb) { const q = polar(b.r, b.a); if (Math.abs(q.x - pq.x) < 5 && Math.abs(q.y - pq.y) < 5) { b.hit = true; playerDie(); return; } }
        for (const e of g.en) { const q = polar(e.r, e.a); if (Math.abs(q.x - pq.x) < 8 && Math.abs(q.y - pq.y) < 8) { e.dead = true; boom(q.x, q.y, 1); playerDie(); return; } }
        for (const m of g.rocks) { const q = polar(m.r, m.a); if (Math.abs(q.x - pq.x) < 7 && Math.abs(q.y - pq.y) < 7) { playerDie(); return; } }
      }
      function updPlay() {
        const p = g.p, D = diff();
        g.t++; g.formRot += 0.006;
        if (g.msgT > 0) g.msgT--;
        if (p.alive) { movePlayer(); if (p.inv > 0) p.inv--; }
        for (const s of g.spawnList) if (!s.done && g.t >= s.at) { s.done = true; g.en.push(s.e); }
        for (const e of g.en) moveEnemy(e);
        // pick attackers once the formation has assembled
        const allIn = g.spawnList.every(s => s.done);
        if (allIn && p.alive && --g.attackT <= 0) {
          g.attackT = Math.max(40, 130 - D * 90) * (0.6 + Math.random() * 0.8);
          const formed = g.en.filter(e => e.st === 'form');
          const n = Math.min(formed.length, 1 + (Math.random() < D ? 1 : 0));
          for (let i = 0; i < n; i++) { const e = formed[(Math.random() * formed.length) | 0]; if (e.st === 'form') { e.st = 'attack'; e.t = 0; e.fired = false; e.dir = Math.random() < 0.5 ? 1 : -1; } }
          if (n) au.tone(400, 0.25, { type: 'triangle', vol: 0.06, slideTo: 1200 });
        }
        // the formation shoots too
        if (p.alive && g.t % Math.max(30, 90 - (D * 60 | 0)) === 0) { const formed = g.en.filter(e => e.st === 'form'); if (formed.length) shoot(formed[(Math.random() * formed.length) | 0]); }
        // satellites, once per stage
        if (!g.satDone && g.t > 900) {
          g.satDone = true;
          const a0 = Math.random() * Math.PI * 2;
          for (let k = -1; k <= 1; k++) g.sats.push({ r: 0, a: a0 + k * 0.7, gen: k === 0, t: 0 });
          g.msg = 'SATELLITES'; g.msgT = 90;
          au.melody([[1568, .05], [0, .05], [1568, .05], [0, .05], [1568, .05]], { type: 'square', vol: 0.08 });
        }
        for (const s of g.sats) {
          s.t++;
          if (s.t < 60) s.r = s.t * 0.7; else if (s.t > 540) { s.r -= 0.8; if (s.r <= 0) s.gone = true; }
          s.a += 0.008;
          if (s.t > 60 && s.t % 110 === 0 && !s.gen && p.alive) g.eb.push({ r: s.r, a: s.a });
        }
        // meteors from Uranus onwards
        if ((g.planet > 0 || g.loop) && g.t % Math.max(160, 400 - (D * 240 | 0)) === 0) g.rocks.push({ r: 4, a: p.a + (Math.random() - 0.5) * 0.6 });
        for (const m of g.rocks) m.r += 0.5 + m.r / R * 1.8;
        g.rocks = g.rocks.filter(m => m.r < R + 30);
        updShots(); shotsVsEnemies(false); playerCollisions();
        g.en = g.en.filter(e => !e.dead && !e.gone);
        // time-out: after a long time the stragglers flee into the vortex
        if (allIn && g.t > 2400 + 600 && !g.timeout) { g.timeout = 1; for (const e of g.en) e.st = 'leave'; }
        // dead -> respawn
        if (!p.alive && --g.deadT <= 0) {
          if (g.lives > 0) { g.lives--; respawnPlayer(); }
          else {
            g.phase = 'wait';
            const cg = g;
            if (api.offerContinue) api.offerContinue(() => { if (g === cg) { g.lives = 2; g.phase = 'play'; respawnPlayer(); } }, () => { if (g === cg) gameOver(); });
            else gameOver();
          }
        }
        // stage clear
        if (g.spawnList.every(s => s.done) && g.en.length === 0 && p.alive) stageClear();
      }
      function respawnPlayer() { g.p = { a: Math.PI / 2, alive: true, inv: 120 }; g.eb = []; g.pb = []; }
      function stageClear() {
        g.warps--;
        g.sats = []; g.rocks = [];
        if (g.warps <= 0) {
          g.phase = 'arrive'; g.phaseT = 220;
          au.melody([[MF(74), .12], [MF(77), .12], [MF(81), .12], [MF(86), .4]], { type: 'square', vol: 0.12 });
        } else beginWarp();
      }
      function updChance() {
        const p = g.p;
        g.t++;
        if (p.alive) movePlayer();
        for (const s of g.spawnList) if (!s.done && g.t >= s.at) { s.done = true; g.en.push(s.e); }
        for (const e of g.en) moveEnemy(e);
        updShots(); shotsVsEnemies(true);
        g.en = g.en.filter(e => !e.gone && !e.dead);
        if (g.spawnList.every(s => s.done) && g.en.length === 0) {
          g.bonus = g.hits >= 40 ? 10000 : 0;   // each hit already scored 100
          addScore(g.bonus);
          g.phase = 'results'; g.phaseT = 260;
          if (g.hits >= 40) au.melody([[1047, .1], [1319, .1], [1568, .1], [2093, .1], [1568, .1], [2093, .4]], { type: 'square', vol: 0.1, delay: 0.4 });
          else au.melody([[784, .1], [659, .1], [784, .3]], { type: 'square', vol: 0.1, delay: 0.4 });
        }
      }
      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        for (const s of stars) {
          s.r += (0.3 + s.r * 0.02) * starSpeed;
          if (s.r > 170) { s.r = Math.random() * 10; s.a = Math.random() * Math.PI * 2; }
        }
        if (mode === 'title') {
          titleT++; starSpeed = 1;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { mode = 'game'; newGame(); }
            else { coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 }); }
          }
          return;
        }
        for (const b of g.booms) b.t++;
        g.booms = g.booms.filter(b => b.t < 26);
        for (const q of g.pops) q.t--;
        g.pops = g.pops.filter(q => q.t > 0);
        if (g.phase !== 'over' && g.phase !== 'wait') musicTick();
        switch (g.phase) {
          case 'warp':
            starSpeed = Math.min(6, starSpeed + 0.08);
            if (g.p.alive) movePlayer();
            g.pb = [];
            if (--g.phaseT <= 0) { starSpeed = 1; startStage(); }
            break;
          case 'play': updPlay(); break;
          case 'arrive':
            starSpeed = Math.max(0.3, starSpeed - 0.02);
            if (--g.phaseT <= 0) { starSpeed = 1; startChance(); }
            break;
          case 'chance': updChance(); break;
          case 'results':
            if (--g.phaseT <= 0) {
              g.planet++;
              if (g.planet >= PLANETS.length) { g.planet = 0; g.loop++; }
              g.warps = PLANETS[g.planet].warps;
              beginWarp();
            }
            break;
          case 'over':
            if (--g.phaseT <= 0 || (g.phaseT < 200 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; }
            break;
        }
      }

      // ================= Rendering =================
      function disc(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2); ctx.fill(); }
      function drawStars(ctx) {
        for (const s of stars) {
          const q = polar(s.r, s.a);
          if (q.x < 0 || q.x >= W || q.y < 0 || q.y >= H) continue;
          ctx.fillStyle = s.c;
          const len = starSpeed > 2 ? Math.min(12, starSpeed * s.r / 40) : 0;
          if (len > 1) { ctx.globalAlpha = 0.8; for (let k = 0; k < len; k += 1) { const q2 = polar(s.r - k, s.a); ctx.fillRect(q2.x | 0, q2.y | 0, 1, 1); } ctx.globalAlpha = 1; }
          else ctx.fillRect(q.x | 0, q.y | 0, s.r > 80 ? 2 : 1, s.r > 80 ? 2 : 1);
        }
      }
      function drawPlanet(ctx, pl, rad) {
        rad = Math.round(rad);
        if (pl.ring) { ctx.strokeStyle = '#e0c080'; ctx.lineWidth = Math.max(1, rad / 8); ctx.beginPath(); ctx.ellipse(CX, CY, rad * 1.9, rad * 0.5, -0.3, 0, Math.PI * 2); ctx.stroke(); }
        disc(ctx, CX, CY, rad, pl.c1);
        ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, rad, 0, Math.PI * 2); ctx.clip();
        if (pl.bands) for (let k = -3; k <= 3; k++) { ctx.fillStyle = k % 2 ? pl.c2 : '#a05030'; ctx.fillRect(CX - rad, CY + k * rad / 4, rad * 2, Math.max(1, rad / 8)); }
        if (pl.earth) { disc(ctx, CX - rad * 0.3, CY - rad * 0.2, rad * 0.45, pl.c2); disc(ctx, CX + rad * 0.4, CY + rad * 0.3, rad * 0.3, pl.c2); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(CX - rad, CY - rad * 0.6, rad * 2, Math.max(1, rad / 10)); }
        disc(ctx, CX - rad * 0.35, CY - rad * 0.35, rad * 0.35, 'rgba(255,255,255,0.18)');
        disc(ctx, CX + rad * 0.5, CY + rad * 0.5, rad * 0.9, 'rgba(0,0,0,0.3)');
        ctx.restore();
        if (pl.ring) { ctx.strokeStyle = '#ffe0a0'; ctx.lineWidth = Math.max(1, rad / 8); ctx.beginPath(); ctx.ellipse(CX, CY, rad * 1.9, rad * 0.5, -0.3, 0, Math.PI); ctx.stroke(); }
      }
      function drawScaled(ctx, im, x, y, s) {
        const w = Math.max(2, Math.round(im.width * s)), h = Math.max(2, Math.round(im.height * s));
        ctx.drawImage(im, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
      }
      function drawGame(ctx) {
        if (g.phase === 'arrive' || g.phase === 'chance' || g.phase === 'results') {
          const k = g.phase === 'arrive' ? 1 - g.phaseT / 220 : 1;
          drawPlanet(ctx, PLANETS[g.planet], 6 + k * 34);
        } else if (g.phase === 'play' && g.warps === 1) {
          drawPlanet(ctx, PLANETS[g.planet], 4 + Math.min(1, g.t / 3000) * 8);
        }
        // vortex hub glow
        disc(ctx, CX, CY, 2 + ((frame >> 3) & 1), '#ffffff');
        for (const m of g.rocks) { const q = polar(m.r, m.a); drawScaled(ctx, ROCK, q.x, q.y, scaleOf(m.r) * 1.6); }
        for (const s of g.sats) {
          const q = polar(s.r, s.a), sc = scaleOf(s.r) * 1.5;
          if (s.gen) { disc(ctx, q.x, q.y, 5 * sc, (frame >> 2) & 1 ? '#ffe020' : '#ff6020'); disc(ctx, q.x, q.y, 2.5 * sc, '#ffffff'); }
          else drawScaled(ctx, SAT, q.x, q.y, sc);
        }
        // beam between satellites
        if (g.sats.length >= 2) {
          ctx.strokeStyle = (frame >> 1) & 1 ? 'rgba(120,200,255,0.6)' : 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.beginPath();
          g.sats.forEach((s, i) => { const q = polar(s.r, s.a); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }); ctx.stroke();
        }
        for (const e of g.en) {
          if (e.r < 0) continue;
          const q = polar(e.r, e.a), set = ENEMY[e.pal || 0];
          const im = set[rotIdx(e.face == null ? e.a : e.face)];
          drawScaled(ctx, im, q.x, q.y, scaleOf(e.r));
        }
        for (const b of g.pb) { const q = shotPos(b), s = scaleOf(b.r); ctx.fillStyle = '#80ffff'; const z = Math.max(1, Math.round(3 * s)); ctx.fillRect(Math.round(q.x - z / 2), Math.round(q.y - z / 2), z, z); }
        for (const b of g.eb) { const q = polar(b.r, b.a), s = scaleOf(b.r); disc(ctx, q.x, q.y, 1 + 1.5 * s, (frame >> 2) & 1 ? '#ff4040' : '#ffff40'); }
        const p = g.p;
        if (p.alive && !(p.inv > 0 && (p.inv >> 2) & 1) && g.phase !== 'over') {
          const q = polar(R, p.a);
          ctx.drawImage(SHIP[rotIdx(p.a + Math.PI)], Math.round(q.x - 8), Math.round(q.y - 8));
          if (g.dbl) { ctx.fillStyle = '#80ffff'; const q2 = polar(R - 8, p.a); ctx.fillRect(Math.round(q2.x - Math.sin(p.a) * 4), Math.round(q2.y + Math.cos(p.a) * 4), 1, 1); ctx.fillRect(Math.round(q2.x + Math.sin(p.a) * 4), Math.round(q2.y - Math.cos(p.a) * 4), 1, 1); }
        }
        for (const b of g.booms) {
          const f = b.t / 26, r = (3 + 10 * Math.sqrt(f)) * b.s;
          ctx.fillStyle = f < 0.25 ? '#ffffff' : f < 0.5 ? '#ffff40' : f < 0.75 ? '#ff8020' : '#c02020';
          for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 + f; ctx.fillRect(Math.round(b.x + Math.cos(a) * r), Math.round(b.y + Math.sin(a) * r), 2, 2); }
        }
        for (const q of g.pops) text(ctx, q.n, q.x, Math.round(q.y - 10 - (60 - q.t) * 0.2), '#ffffff', { center: true });
      }
      function hud(ctx) {
        text(ctx, '1UP', 8, 2, '#ff4040');
        text(ctx, String(g ? g.score : 0), 64, 11, '#ffffff', { right: true });
        text(ctx, 'HI-SCORE', W - 8, 2, '#ff4040', { right: true });
        text(ctx, String(hi), W - 8, 11, '#ffffff', { right: true });
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        drawStars(ctx);
        if (mode === 'title') { renderTitle(ctx); return; }
        drawGame(ctx);
        hud(ctx);
        for (let i = 0; i < Math.min(6, g.lives); i++) ctx.drawImage(SHIP[0], 2 + i * 14, H - 16);
        const pl = PLANETS[g.planet];
        if (g.phase === 'play' || g.phase === 'warp') text(ctx, g.warps + ' TO ' + pl.name, W - 4, H - 10, '#40c0ff', { right: true });
        if (g.phase === 'warp' && g.phaseT < 180) {
          text(ctx, g.warps + (g.warps === 1 ? ' WARP' : ' WARPS'), CX, 92, '#ffffff', { center: true, scale: 2 });
          text(ctx, 'TO ' + pl.name, CX, 112, '#40c0ff', { center: true, scale: 2 });
        }
        if (g.phase === 'arrive') text(ctx, pl.name, CX, 60, '#ffffff', { center: true, scale: 2 });
        if (g.phase === 'chance' && g.t < 120) text(ctx, 'CHANCE!', CX, 70, (frame >> 3) & 1 ? '#ffff40' : '#ff40c0', { center: true, scale: 2 });
        if (g.phase === 'results') {
          text(ctx, 'NUMBER OF HITS ' + g.hits, CX, 80, '#ffffff', { center: true });
          text(ctx, (g.hits >= 40 ? 'PERFECT BONUS ' : 'BONUS ') + g.bonus, CX, 96, g.hits >= 40 ? '#ffff40' : '#40ff80', { center: true });
        }
        if (g.msgT > 0 && g.phase === 'play' && ((g.msgT >> 3) & 1)) text(ctx, g.msg, CX, 60, '#ffff40', { center: true });
        if (g.phase === 'over') { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(40, 112, W - 80, 28); text(ctx, 'GAME OVER', CX, 122, '#ff3030', { center: true }); }
      }
      function renderTitle(ctx) {
        hud(ctx);
        const ly = 36;
        text(ctx, 'GYRUSS', CX + 2, ly + 2, '#400040', { center: true, scale: 4 });
        const bands = [[0, 7, '#ffc0ff'], [7, 14, '#ff60e0'], [14, 21, '#c020c0'], [21, 28, '#ff60e0']];
        for (const [a, b, c] of bands) { ctx.save(); ctx.beginPath(); ctx.rect(0, ly + a, W, b - a); ctx.clip(); text(ctx, 'GYRUSS', CX, ly, c, { center: true, scale: 4 }); ctx.restore(); }
        const page = (titleT / 420 | 0) % 2;
        // ship circling the rim
        const a = titleT * 0.02 + Math.PI / 2, q = polar(R, a);
        ctx.drawImage(SHIP[rotIdx(a + Math.PI)], Math.round(q.x - 8), Math.round(q.y - 8));
        if (page === 0) {
          text(ctx, 'FROM NEPTUNE', CX, 90, '#40c0ff', { center: true });
          text(ctx, 'TO EARTH', CX, 102, '#40c0ff', { center: true });
          text(ctx, 'SHOOT THE CENTRE', CX, 124, '#ffffff', { center: true });
          text(ctx, 'SATELLITE FOR', CX, 134, '#ffffff', { center: true });
          text(ctx, 'DOUBLE SHOT', CX, 144, '#ffff40', { center: true });
          text(ctx, 'CHANCE STAGE AT', CX, 162, '#ff60e0', { center: true });
          text(ctx, 'EVERY PLANET', CX, 172, '#ff60e0', { center: true });
        } else {
          text(ctx, '- SCORE -', CX, 88, '#ffff40', { center: true });
          ctx.drawImage(ENEMY[0][rotIdx(Math.PI / 2)], 50, 100); text(ctx, 'FORMATION   50', 72, 103, '#ffffff');
          ctx.drawImage(ENEMY[2][rotIdx(Math.PI / 2)], 50, 118); text(ctx, 'ATTACKING  100', 72, 121, '#ffffff');
          ctx.drawImage(SAT, 53, 137); text(ctx, 'SATELLITE  100', 72, 139, '#ffffff');
          disc(ctx, 56, 159, 4, (frame >> 2) & 1 ? '#ffe020' : '#ff6020'); text(ctx, 'GENERATOR  300', 72, 156, '#ffffff');
          text(ctx, 'CHANCE PERFECT 10000', CX, 176, '#ff60e0', { center: true });
        }
        if (api.credits === 0 || coinFlash > 0) { if (coinFlash > 0 ? (coinFlash >> 2) & 1 : (frame >> 5) & 1) text(ctx, 'INSERT COIN', CX, 196, '#ff3030', { center: true }); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START BUTTON', CX, 196, '#ffffff', { center: true });
        text(ctx, '\u00a9 1983 KONAMI', CX, 236, '#c0c0c0', { center: true });
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 9, '#ffffff');
      }
      return { update, render, destroy() { } };
    }
  });
})();
