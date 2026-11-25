// Bosconian (Namco, 1981) \u2014 built-in recreation for the MAME32 Game Room.
// Free-scrolling space, radar, twin front/rear cannons; destroy every space station to clear the round.
(function () {
  'use strict';
  const W = 288, H = 224, PW = 224;        // playfield is the left 224x224; the right 64 px is the radar panel
  const WS = 2048;                         // toroidal world size
  const CX = PW / 2, CY = H / 2;

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
  const NROT = 16;
  function rotSet(rows, pal, N) { const a = []; for (let i = 0; i < NROT; i++) a.push(spr(rotRows(rows, i * 2 * Math.PI / NROT, N), pal)); return a; }
  function rotIdx(a) { return ((Math.round((a + Math.PI / 2) / (2 * Math.PI) * NROT) % NROT) + NROT) % NROT; }
  const wrapD = d => ((d % WS) + WS * 1.5) % WS - WS / 2;
  const wrapP = v => ((v % WS) + WS) % WS;

  // ================= Sprites (art faces UP) =================
  const SHIP_ART = [
    '.....W.....',
    '.....W.....',
    '....WRW....',
    '....WRW....',
    '...WWRWW...',
    '..WWWWWWW..',
    '.WWBWWWBWW.',
    'WWWBWWWBWWW',
    'WW.WWWWW.WW',
    'W...RRR...W',
    '....R.R....'];
  const SHIP = []; for (let i = 0; i < 8; i++) SHIP.push(spr(rotRows(SHIP_ART, i * Math.PI / 4, 15), { W: '#ffffff', R: '#ff2020', B: '#3060ff' }));
  const ITYPE = rotSet([
    '...Y...',
    '..YYY..',
    '.YYRYY.',
    'YYYRYYY',
    'Y.YYY.Y',
    '...Y...'], { Y: '#ffe020', R: '#ff3020' }, 11);
  const PTYPE = rotSet([
    'G.....G',
    'GG.W.GG',
    '.GGWGG.',
    '.GGGGG.',
    'GG.G.GG',
    'G.....G'], { G: '#30ff60', W: '#ffffff' }, 11);
  const ETYPE = rotSet([
    '..CCC..',
    '.CCWCC.',
    'CCWWWCC',
    'C.CCC.C',
    'C..C..C'], { C: '#40c0ff', W: '#ffffff' }, 11);
  const SPY = rotSet([
    '...P...',
    '..PPP..',
    'PPPWPPP',
    '..PPP..',
    '.P...P.'], { P: '#ff60ff', W: '#ffffff' }, 11);
  const LEADER = rotSet([
    '...R...',
    '..RRR..',
    '.RRWRR.',
    'RRRWRRR',
    'RR.R.RR',
    'R.....R'], { R: '#ff3030', W: '#ffff80' }, 11);
  const ROCKS = [];
  for (let v = 0; v < 3; v++) {
    const N = 11 + v * 2, rows = [];
    for (let y = 0; y < N; y++) {
      let s = '';
      for (let x = 0; x < N; x++) {
        const dx = x - (N - 1) / 2, dy = y - (N - 1) / 2, a = Math.atan2(dy, dx);
        const r = (N / 2 - 0.5) * (0.78 + 0.22 * Math.sin(a * 3 + v * 2) * Math.cos(a * 2 + v));
        const d = Math.hypot(dx, dy);
        s += d > r ? '.' : (d > r - 1.2 ? 'D' : ((x * 7 + y * 3 + v) % 9 === 0 ? 'D' : (dx + dy < -1 ? 'L' : 'M')));
      }
      rows.push(s);
    }
    ROCKS.push(spr(rows, { D: '#5a4030', M: '#8a6a48', L: '#b89870' }));
  }
  const MINE = spr([
    '.....R.....',
    '.....R.....',
    '..R..P..R..',
    '...RPPPR...',
    '....PWP....',
    'RRPPWWWPPRR',
    '....PWP....',
    '...RPPPR...',
    '..R..P..R..',
    '.....R.....',
    '.....R.....'], { R: '#ff3060', P: '#ff90c0', W: '#ffffff' });

  ArcadeRegistry.register({
    id: 'bosconian', title: 'Bosconian', year: 1981, maker: 'Namco',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: steer (8 ways, always moving) \u00b7 Space: fire front + rear \u00b7 Enter: start',
    marquee: { bg: '#000018', fg: '#30ff60', accent: '#ff3030' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(20000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0;
      let g = null;
      const stars = [];
      for (let i = 0; i < 70; i++) stars.push({ x: Math.random() * 512, y: Math.random() * 512, d: 0.3 + (i % 3) * 0.25, c: ['#ffffff', '#8080ff', '#ff8080', '#80ff80', '#ffff80'][i % 5] });
      let camX = 0, camY = 0;

      // ================= Voice-ish alerts (synthesized beeps) =================
      function sayBlastOff() {
        au.melody([[392, .09], [523, .09], [0, .05], [659, .12]], { type: 'square', vol: 0.12 });
        au.noise(0.9, { vol: 0.12, freq: 300, slideTo: 3000, delay: 0.35 });
      }
      function sayAlert() {
        for (let k = 0; k < 2; k++) {
          au.tone(880, 0.12, { type: 'square', vol: 0.12, delay: k * 0.45 });
          au.tone(660, 0.18, { type: 'square', vol: 0.12, delay: k * 0.45 + 0.14 });
        }
      }
      function sayConditionRed() {
        // "con-di-tion RED" as a 4-syllable pitch contour, then the klaxon
        au.melody([[523, .1], [587, .1], [494, .12], [0, .06], [392, .3]], { type: 'sawtooth', vol: 0.11 });
        for (let k = 0; k < 3; k++) au.tone(700, 0.22, { type: 'square', vol: 0.09, slideTo: 1100, delay: 0.75 + k * 0.28 });
      }
      function saySpy() { au.melody([[1047, .06], [784, .06], [1047, .06], [784, .06]], { type: 'square', vol: 0.1 }); }

      // ================= World setup =================
      function newGame() {
        g = { score: 0, lives: 2, round: 1, nextLife: 20000, msg: '', msgT: 0 };
        startRound();
      }
      function startRound() {
        const R = g.round;
        g.p = { x: WS / 2, y: WS / 2 + 300, dir: 0, tdir: 0, turnT: 0, alive: true, inv: 0 };
        g.pb = []; g.eb = []; g.en = []; g.booms = []; g.pops = []; g.blasts = [];
        g.stations = []; g.rocks = []; g.mines = [];
        const ns = Math.min(8, 3 + R);
        const far = (x, y, md) => g.stations.every(s => Math.hypot(wrapD(s.x - x), wrapD(s.y - y)) > md) && Math.hypot(wrapD(g.p.x - x), wrapD(g.p.y - y)) > 180;
        for (let i = 0; i < ns; i++) {
          let x, y, k = 0;
          do { x = Math.random() * WS; y = Math.random() * WS; k++; } while (!far(x, y, 380) && k < 200);
          g.stations.push({ x, y, vert: Math.random() < 0.5, can: [1, 1, 1, 1, 1, 1], ft: [0, 0, 0, 0, 0, 0].map(() => 60 + Math.random() * 120), t: Math.random() * 300, alive: true, launch: 200 + Math.random() * 200 });
        }
        const clear = (x, y) => Math.hypot(wrapD(g.p.x - x), wrapD(g.p.y - y)) > 90 && g.stations.every(s => Math.hypot(wrapD(s.x - x), wrapD(s.y - y)) > 44);
        for (let i = 0; i < 70; i++) { const x = Math.random() * WS, y = Math.random() * WS; if (clear(x, y)) g.rocks.push({ x, y, v: i % 3, vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15 }); }
        for (let i = 0; i < Math.min(60, 22 + R * 4); i++) { const x = Math.random() * WS, y = Math.random() * WS; if (clear(x, y)) g.mines.push({ x, y }); }
        g.spawnT = 240; g.spyT = 900 + Math.random() * 600; g.formT = Math.max(900, 2000 - R * 120); g.red = 0; g.cond = 'GREEN';
        g.phase = 'start'; g.phaseT = 150; g.fireT = 0;
        sayBlastOff();
      }
      const diff = () => Math.min(1, (g.round - 1) / 10);
      function addScore(n) {
        g.score += n;
        while (g.score >= g.nextLife) {
          g.lives++; g.nextLife = g.nextLife === 20000 ? 70000 : g.nextLife + 70000;
          au.melody([[1047, .08], [1319, .08], [1568, .08], [2093, .2]], { type: 'square', vol: 0.12 });
        }
        if (g.score > hi) hi = g.score;
      }
      function boom(x, y, big) { g.booms.push({ x, y, t: 0, big: !!big }); }
      function pop(x, y, n) { g.pops.push({ x, y, n, t: 60 }); }
      const dist = (a, b) => Math.hypot(wrapD(a.x - b.x), wrapD(a.y - b.y));

      // station geometry: cannons on a hexagon, core channel along the long axis
      function cannonXY(s, i) {
        const a = (i * 60 + 30) * Math.PI / 180;
        let dx = Math.cos(a) * 26, dy = Math.sin(a) * 20;
        if (s.vert) { const t = dx; dx = dy; dy = t; }
        return { x: s.x + dx, y: s.y + dy };
      }
      const coreOpen = s => (s.t % 240) < 150;

      // ================= Enemies =================
      const ESPD = { I: 2.1, P: 1.7, E: 1.4, spy: 1.6, lead: 1.5, wing: 1.5 };
      const EPTS = { I: 50, P: 60, E: 70, lead: 0, wing: 0 };
      function spawnEnemy(type, x, y) {
        const a = Math.atan2(wrapD(g.p.y - y), wrapD(g.p.x - x));
        const e = { type, x: wrapP(x), y: wrapP(y), a, t: 0, sp: ESPD[type] * (1 + diff() * 0.35) };
        g.en.push(e); return e;
      }
      function spawnAround(type) {
        const a = Math.random() * Math.PI * 2, r = 170 + Math.random() * 60;
        return spawnEnemy(type, g.p.x + Math.cos(a) * r, g.p.y + Math.sin(a) * r);
      }
      function spawnFormation() {
        const kinds = ['I', 'P', 'E'], k = kinds[(Math.random() * 3) | 0];
        const a = Math.random() * Math.PI * 2, r = 230;
        const lx = g.p.x + Math.cos(a) * r, ly = g.p.y + Math.sin(a) * r;
        const lead = spawnEnemy('lead', lx, ly); lead.kind = k; lead.fid = frame; lead.sp *= 1.2;
        const shapes = [[[-14, 10], [14, 10], [-28, 20], [28, 20]], [[0, 14], [0, 28], [-14, 14], [14, 14]], [[-12, 0], [12, 0], [-24, 0], [24, 0]]];
        const sh = shapes[(Math.random() * shapes.length) | 0];
        g.form = { id: lead.fid, left: 5, leaderFirst: false, alive: true };
        for (const o of sh) { const w = spawnEnemy('wing', lx, ly); w.kind = k; w.lead = lead; w.ox = o[0]; w.oy = o[1]; w.fid = lead.fid; w.sp = lead.sp; }
        g.red = 900; sayAlert();
        g.msg = 'FORMATION ATTACK'; g.msgT = 120;
      }
      function updEnemies() {
        const p = g.p, D = diff();
        for (const e of g.en) {
          e.t++;
          if (e.type === 'wing' && e.lead && !e.lead.dead) {
            // keep station relative to the leader's heading
            const L = e.lead, ca = Math.cos(L.a - Math.PI / 2), sa = Math.sin(L.a - Math.PI / 2);
            const tx = L.x + e.ox * ca - e.oy * sa * -1, ty = L.y + e.ox * sa + e.oy * ca * -1;
            e.x = wrapP(e.x + Math.max(-3, Math.min(3, wrapD(tx - e.x)))); e.y = wrapP(e.y + Math.max(-3, Math.min(3, wrapD(ty - e.y)))); e.a = L.a;
            continue;
          }
          if (e.type === 'wing') { e.type = e.kind; e.sp = ESPD[e.kind] * (1.1 + D * 0.35); e.lead = null; }
          let target;
          if (e.type === 'spy') {
            // the spy ship keeps its distance and runs away
            target = Math.atan2(wrapD(e.y - p.y), wrapD(e.x - p.x)) + Math.sin(e.t / 40) * 0.6;
            if (e.t > 600) { e.gone = true; g.red = 1200; g.formT = Math.min(g.formT, 60); g.msg = 'SPY SHIP ESCAPED'; g.msgT = 120; }
          } else {
            target = Math.atan2(wrapD(p.y - e.y), wrapD(p.x - e.x));
            if (e.type === 'E') target += Math.sin(e.t / 25) * 0.9;
            if (!p.alive) target += Math.PI;
          }
          let da = target - e.a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
          const tr = e.type === 'I' ? 0.06 : e.type === 'lead' ? 0.035 : 0.045;
          e.a += Math.max(-tr, Math.min(tr, da));
          e.x = wrapP(e.x + Math.cos(e.a) * e.sp); e.y = wrapP(e.y + Math.sin(e.a) * e.sp);
          if (dist(e, p) > (e.type === 'spy' ? 1000 : 700)) e.gone = true;
        }
        g.en = g.en.filter(e => !e.gone && !e.dead);
        if (g.form && !g.en.some(e => e.fid === g.form.id)) g.form = null;
      }
      function killEnemy(e, byBlast) {
        if (e.dead) return;
        e.dead = true; boom(e.x, e.y, false);
        au.noise(0.25, { vol: 0.16, freq: 2400, slideTo: 200, type: 'bandpass' });
        if (e.type === 'spy') { const pts = [100, 200, 300, 400, 500, 600, 800, 1000][(Math.random() * 8) | 0]; addScore(pts); pop(e.x, e.y, pts); return; }
        let pts = EPTS[e.type === 'lead' || e.type === 'wing' ? e.kind : e.type] || 50;
        addScore(pts);
        if (e.fid && g.form && g.form.id === e.fid) {
          if (e.type === 'lead') {
            const wingsLeft = g.en.some(o => o.type === 'wing' && o.fid === e.fid && !o.dead);
            if (wingsLeft) g.form.leaderFirst = true;
            else g.form.leaderLast = true;
          }
          g.form.left--;
          if (g.form.left <= 0) {
            const b = g.form.leaderLast ? 1500 : g.form.leaderFirst ? 1000 : 500;
            addScore(b); pop(e.x, e.y, b); g.form = null;
            au.melody([[784, .08], [1047, .08], [1319, .08], [1568, .2]], { type: 'square', vol: 0.12 });
          }
        }
      }

      // ================= Update =================
      function playerDie() {
        const p = g.p; if (!p.alive) return;
        p.alive = false;
        boom(p.x, p.y, true); boom(p.x + 5, p.y - 4, true);
        au.noise(1.4, { vol: 0.3, freq: 2400, slideTo: 50 });
        au.tone(500, 1.2, { type: 'sawtooth', vol: 0.1, slideTo: 40 });
        g.phase = 'dead'; g.phaseT = 170;
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 300;
        au.melody([[440, .2], [415, .2], [392, .2], [370, .5]], { type: 'square', vol: 0.1 });
      }
      function mineBlast(m) {
        m.dead = true;
        g.blasts.push({ x: m.x, y: m.y, t: 0 });
        addScore(20);
        au.noise(0.6, { vol: 0.24, freq: 1600, slideTo: 80 });
        for (const e of g.en) if (dist(e, m) < 30) killEnemy(e, true);
        for (const o of g.mines) if (!o.dead && o !== m && dist(o, m) < 26) { o.chain = 6; }
        if (g.p.alive && dist(g.p, m) < 22 && g.p.inv <= 0) playerDie();
      }
      function stationDestroyed(s) {
        s.alive = false;
        addScore(1500); pop(s.x, s.y, 1500);
        for (let k = 0; k < 8; k++) boom(s.x + (Math.random() - 0.5) * 50, s.y + (Math.random() - 0.5) * 40, true);
        au.noise(1.2, { vol: 0.28, freq: 1600, slideTo: 60 });
        au.tone(200, 1.0, { type: 'square', vol: 0.08, slideTo: 40 });
      }
      const DIRS = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
      function updPlay() {
        const p = g.p, D = diff();
        if (g.msgT > 0) g.msgT--;
        if (g.red > 0) g.red--;
        // steering: the ship turns one notch at a time toward the stick
        let sx = 0, sy = 0;
        if (api.key('ArrowLeft')) sx -= 1; if (api.key('ArrowRight')) sx += 1;
        if (api.key('ArrowUp')) sy -= 1; if (api.key('ArrowDown')) sy += 1;
        if (sx || sy) for (let i = 0; i < 8; i++) if (DIRS[i][0] === sx && DIRS[i][1] === sy) p.tdir = i;
        if (p.dir !== p.tdir && --p.turnT <= 0) {
          const df = (p.tdir - p.dir + 8) % 8;
          p.dir = (p.dir + (df <= 4 ? 1 : 7)) % 8; p.turnT = 5;
        }
        const ang = p.dir * Math.PI / 4 - Math.PI / 2, sp = 1.7;
        p.x = wrapP(p.x + Math.cos(ang) * sp); p.y = wrapP(p.y + Math.sin(ang) * sp);
        if (p.inv > 0) p.inv--;
        // fire front and back at once
        if (g.fireT > 0) g.fireT--;
        if ((api.pressed('Space') || (api.key('Space') && g.fireT <= 0)) && g.pb.length < 8) {
          g.fireT = 9;
          for (const s of [1, -1]) g.pb.push({ x: p.x + Math.cos(ang) * 7 * s, y: p.y + Math.sin(ang) * 7 * s, vx: Math.cos(ang) * 5.5 * s, vy: Math.sin(ang) * 5.5 * s, t: 0 });
          au.tone(1800, 0.05, { type: 'square', vol: 0.06, slideTo: 900 });
        }
        for (const b of g.pb) { b.x = wrapP(b.x + b.vx); b.y = wrapP(b.y + b.vy); b.t++; }
        g.pb = g.pb.filter(b => b.t < 34);
        for (const b of g.eb) { b.x = wrapP(b.x + b.vx); b.y = wrapP(b.y + b.vy); b.t++; }
        g.eb = g.eb.filter(b => b.t < 140 && !b.hit);
        for (const r of g.rocks) { r.x = wrapP(r.x + r.vx); r.y = wrapP(r.y + r.vy); }
        // stations: cannons fire, core launches missiles
        for (const s of g.stations) {
          if (!s.alive) continue;
          s.t++;
          const dd = dist(s, p);
          if (dd > 190 || !p.alive) continue;
          for (let i = 0; i < 6; i++) {
            if (!s.can[i]) continue;
            if (--s.ft[i] <= 0) {
              s.ft[i] = Math.max(70, 170 - D * 90) * (0.7 + Math.random() * 0.6);
              const c = cannonXY(s, i), a = Math.atan2(wrapD(p.y - c.y), wrapD(p.x - c.x)), v = 1.6 + D * 0.8;
              g.eb.push({ x: c.x, y: c.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0 });
            }
          }
          if (coreOpen(s) && --s.launch <= 0 && g.en.length < 12) {
            s.launch = Math.max(200, 420 - D * 200);
            const e = spawnEnemy('I', s.x, s.y); e.sp *= 1.1;
            au.tone(300, 0.2, { type: 'sawtooth', vol: 0.06, slideTo: 900 });
          }
        }
        // free enemies
        if (--g.spawnT <= 0) {
          g.spawnT = Math.max(80, 220 - D * 130) * (0.7 + Math.random() * 0.6);
          if (g.en.length < 10) { const t = Math.random(); spawnAround(t < 0.4 ? 'I' : t < 0.75 ? 'P' : 'E'); }
        }
        if (--g.spyT <= 0) {
          g.spyT = 1500 + Math.random() * 900;
          if (!g.en.some(e => e.type === 'spy')) { const e = spawnAround('spy'); e.sp = 1.6; g.msg = 'SPY SHIP SIGHTED'; g.msgT = 120; saySpy(); }
        }
        if (--g.formT <= 0) { g.formT = Math.max(900, 2000 - g.round * 120) * (0.8 + Math.random() * 0.4); if (!g.form) spawnFormation(); }
        updEnemies();
        // condition
        let near = 0; for (const e of g.en) if (dist(e, p) < 160) near++;
        const cond = (g.red > 0 || near >= 5) ? 'RED' : near >= 2 ? 'YELLOW' : 'GREEN';
        if (cond === 'RED' && g.cond !== 'RED') sayConditionRed();
        g.cond = cond;
        if (cond === 'RED' && frame % 60 === 0) au.tone(700, 0.1, { type: 'square', vol: 0.05 });
        // chain-reaction mines
        for (const m of g.mines) if (!m.dead && m.chain && --m.chain <= 0) mineBlast(m);
        for (const bl of g.blasts) bl.t++;
        g.blasts = g.blasts.filter(bl => bl.t < 30);
        // player bullets vs everything
        for (const b of g.pb) {
          if (b.hit) continue;
          for (const s of g.stations) {
            if (!s.alive || b.hit) continue;
            const dx = wrapD(b.x - s.x), dy = wrapD(b.y - s.y);
            if (Math.abs(dx) > 40 || Math.abs(dy) > 40) continue;
            for (let i = 0; i < 6; i++) {
              if (!s.can[i]) continue;
              const c = cannonXY(s, i);
              if (Math.abs(wrapD(b.x - c.x)) < 6 && Math.abs(wrapD(b.y - c.y)) < 6) {
                s.can[i] = 0; b.hit = true; addScore(200); boom(c.x, c.y, false);
                au.noise(0.3, { vol: 0.2, freq: 1800, slideTo: 150 });
                if (s.can.every(v => !v)) stationDestroyed(s);
                break;
              }
            }
            if (b.hit) continue;
            // core: only a shot straight down the open channel gets in
            const along = s.vert ? Math.abs(b.vy) > Math.abs(b.vx) : Math.abs(b.vx) > Math.abs(b.vy);
            const perp = s.vert ? Math.abs(dx) : Math.abs(dy);
            if (Math.hypot(dx, dy) < 7 && along && perp < 4 && coreOpen(s)) { b.hit = true; stationDestroyed(s); continue; }
            // the hull swallows other shots
            const inHull = s.vert ? (Math.abs(dx) < 14 && Math.abs(dy) < 22 && !(along && perp < 4)) : (Math.abs(dy) < 14 && Math.abs(dx) < 22 && !(along && perp < 4));
            if (inHull) { b.hit = true; au.tone(400, 0.03, { type: 'square', vol: 0.05 }); }
          }
          if (b.hit) continue;
          for (const e of g.en) if (!e.dead && Math.abs(wrapD(b.x - e.x)) < 6 && Math.abs(wrapD(b.y - e.y)) < 6) { b.hit = true; killEnemy(e); break; }
          if (b.hit) continue;
          for (const r of g.rocks) if (!r.dead && Math.abs(wrapD(b.x - r.x)) < 6 + r.v && Math.abs(wrapD(b.y - r.y)) < 6 + r.v) { b.hit = true; r.dead = true; addScore(10); boom(r.x, r.y, false); au.noise(0.2, { vol: 0.14, freq: 800, slideTo: 100 }); break; }
          if (b.hit) continue;
          for (const m of g.mines) if (!m.dead && Math.abs(wrapD(b.x - m.x)) < 6 && Math.abs(wrapD(b.y - m.y)) < 6) { b.hit = true; mineBlast(m); break; }
        }
        g.pb = g.pb.filter(b => !b.hit); g.en = g.en.filter(e => !e.dead);
        g.rocks = g.rocks.filter(r => !r.dead); g.mines = g.mines.filter(m => !m.dead);
        // player collisions
        if (p.alive && p.inv <= 0) {
          for (const b of g.eb) if (Math.abs(wrapD(b.x - p.x)) < 4 && Math.abs(wrapD(b.y - p.y)) < 4) { b.hit = true; playerDie(); break; }
          if (p.alive) for (const e of g.en) if (dist(e, p) < 8) { killEnemy(e); playerDie(); break; }
          if (p.alive) for (const r of g.rocks) if (dist(r, p) < 7 + r.v) { r.dead = true; boom(r.x, r.y, false); playerDie(); break; }
          if (p.alive) for (const m of g.mines) if (dist(m, p) < 8) { mineBlast(m); playerDie(); break; }
          if (p.alive) for (const s of g.stations) {
            if (!s.alive) continue;
            const dx = Math.abs(wrapD(p.x - s.x)), dy = Math.abs(wrapD(p.y - s.y));
            if ((s.vert ? dx < 12 && dy < 22 : dx < 22 && dy < 12)) { playerDie(); break; }
            for (let i = 0; i < 6; i++) if (s.can[i]) { const c = cannonXY(s, i); if (dist(c, p) < 8) { s.can[i] = 0; boom(c.x, c.y, false); if (s.can.every(v => !v)) stationDestroyed(s); playerDie(); break; } }
            if (!p.alive) break;
          }
        }
        // round clear
        if (p.alive && g.stations.every(s => !s.alive)) {
          g.phase = 'clear'; g.phaseT = 200;
          au.melody([[523, .12], [659, .12], [784, .12], [1047, .12], [784, .12], [1047, .4]], { type: 'square', vol: 0.12 });
        }
        // engine hum
        if (frame % 16 === 0 && p.alive) au.tone(70, 0.14, { type: 'triangle', vol: 0.05 });
      }
      function respawn() {
        const p = g.p;
        g.p = { x: p.x, y: p.y, dir: 0, tdir: 0, turnT: 0, alive: true, inv: 120 };
        g.eb = []; g.en = g.en.filter(e => dist(e, g.p) > 160);
        g.rocks = g.rocks.filter(r => dist(r, g.p) > 50); g.mines = g.mines.filter(m => dist(m, g.p) > 50);
        // don't spawn inside a station
        for (const s of g.stations) if (s.alive && dist(s, g.p) < 60) g.p.y = wrapP(g.p.y + 90);
        g.phase = 'start'; g.phaseT = 90; g.red = 0;
        sayBlastOff();
      }
      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++; camX += 0.6; camY -= 0.3;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { mode = 'game'; newGame(); }
            else { coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 }); }
          }
          return;
        }
        for (const b of g.booms) b.t++;
        g.booms = g.booms.filter(b => b.t < (b.big ? 44 : 24));
        for (const q of g.pops) q.t--;
        g.pops = g.pops.filter(q => q.t > 0);
        camX = g.p.x; camY = g.p.y;
        switch (g.phase) {
          case 'start':
            if (--g.phaseT <= 0) g.phase = 'play';
            break;
          case 'play': updPlay(); break;
          case 'dead':
            updEnemies();
            for (const b of g.eb) { b.x = wrapP(b.x + b.vx); b.y = wrapP(b.y + b.vy); b.t++; }
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
          case 'clear':
            if (--g.phaseT <= 0) { g.round++; startRound(); }
            break;
          case 'over':
            if (--g.phaseT <= 0 || (g.phaseT < 200 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; }
            break;
        }
      }

      // ================= Rendering =================
      function disc(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
      const scr = (o) => ({ x: Math.round(CX + wrapD(o.x - camX)), y: Math.round(CY + wrapD(o.y - camY)) });
      const onScr = (q, m) => q.x > -m && q.x < PW + m && q.y > -m && q.y < H + m;
      function drawStars(ctx) {
        for (const s of stars) {
          const x = ((s.x - camX * s.d) % 512 + 512) % 512, y = ((s.y - camY * s.d) % 512 + 512) % 512;
          if (x < PW && y < H && ((frame + (s.x | 0)) % 50) < 40) { ctx.fillStyle = s.c; ctx.fillRect(x | 0, y | 0, 1, 1); }
        }
      }
      function drawStation(ctx, s, sx, sy) {
        const pts = []; for (let i = 0; i < 6; i++) { const c = cannonXY(s, i); pts.push({ x: sx + wrapD(c.x - s.x), y: sy + wrapD(c.y - s.y) }); }
        // girders between cannons and to the core
        ctx.fillStyle = '#0a6a2a';
        ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#30d860'; ctx.lineWidth = 2;
        ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.closePath(); ctx.stroke();
        ctx.lineWidth = 1;
        for (const q of pts) { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(q.x, q.y); ctx.stroke(); }
        // core channel
        ctx.fillStyle = '#002010';
        if (s.vert) ctx.fillRect(sx - 3, sy - 24, 6, 48); else ctx.fillRect(sx - 24, sy - 3, 48, 6);
        const open = coreOpen(s);
        disc(ctx, sx, sy, 7, '#208040');
        disc(ctx, sx, sy, 5, open ? ((frame >> 3) & 1 ? '#ff60a0' : '#ff2060') : '#604050');
        if (!open) { ctx.fillStyle = '#30d860'; if (s.vert) ctx.fillRect(sx - 5, sy - 1, 10, 2); else ctx.fillRect(sx - 1, sy - 5, 2, 10); }
        // cannon pods
        for (let i = 0; i < 6; i++) {
          const q = pts[i];
          if (s.can[i]) { disc(ctx, q.x, q.y, 6, '#30d860'); disc(ctx, q.x, q.y, 4, '#a0ffb0'); disc(ctx, q.x - 1, q.y - 1, 1.5, '#ffffff'); }
          else { disc(ctx, q.x, q.y, 4, '#203020'); }
        }
      }
      function drawEnemy(ctx, e, q) {
        const set = e.type === 'spy' ? SPY : e.type === 'lead' ? LEADER : (e.type === 'wing' ? e.kind : e.type) === 'I' ? ITYPE : (e.type === 'wing' ? e.kind : e.type) === 'P' ? PTYPE : ETYPE;
        ctx.drawImage(set[rotIdx(e.a)], q.x - 5, q.y - 5);
      }
      function drawBoom(ctx, b, q) {
        const T = b.big ? 44 : 24, f = b.t / T, r = (b.big ? 15 : 8) * Math.sqrt(f) + 1;
        const cols = ['#ffffff', '#ffff40', '#ff8020', '#ff2020', '#802020'];
        ctx.fillStyle = cols[Math.min(4, (f * 5) | 0)];
        for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6 + (k & 1) * 0.3; const rr = r * (k & 1 ? 0.6 : 1); ctx.fillRect(Math.round(q.x + Math.cos(a) * rr), Math.round(q.y + Math.sin(a) * rr), 2, 2); }
      }
      function drawPanel(ctx) {
        ctx.fillStyle = '#000000'; ctx.fillRect(PW, 0, W - PW, H);
        ctx.fillStyle = '#404080'; ctx.fillRect(PW, 0, 1, H);
        text(ctx, 'HIGH', PW + 6, 3, '#ff3030'); text(ctx, 'SCORE', PW + 22, 12, '#ff3030');
        text(ctx, String(hi), W - 3, 22, '#ffffff', { right: true });
        text(ctx, '1UP', PW + 6, 34, '#ff3030');
        text(ctx, String(g ? g.score : 0), W - 3, 44, '#ffffff', { right: true });
        // radar
        const rx = PW + 4, ry = 56, rw = 58, rh = 72;
        ctx.fillStyle = '#100830'; ctx.fillRect(rx, ry, rw, rh);
        ctx.fillStyle = '#5040a0'; ctx.fillRect(rx, ry, rw, 1); ctx.fillRect(rx, ry + rh - 1, rw, 1); ctx.fillRect(rx, ry, 1, rh); ctx.fillRect(rx + rw - 1, ry, 1, rh);
        if (g && mode === 'game') {
          // radar is centred on the player
          const mx = o => rx + rw / 2 + wrapD(o.x - g.p.x) / WS * rw, my = o => ry + rh / 2 + wrapD(o.y - g.p.y) / WS * rh;
          for (const s of g.stations) if (s.alive) { ctx.fillStyle = '#30ff60'; ctx.fillRect(Math.round(mx(s)) - 1, Math.round(my(s)) - 1, 3, 3); }
          if (g.cond === 'RED') for (const e of g.en) if (e.type === 'lead' || e.type === 'spy') { ctx.fillStyle = (frame >> 3) & 1 ? '#ff3030' : '#ffff40'; ctx.fillRect(Math.round(mx(e)), Math.round(my(e)), 2, 2); }
          if ((frame >> 3) & 1) { ctx.fillStyle = '#ffffff'; ctx.fillRect(rx + rw / 2 - 1, ry + rh / 2 - 1, 2, 2); }
          text(ctx, 'CONDITION', PW + 32, 134, '#c0c0ff', { center: true });
          const cc = g.cond === 'RED' ? '#ff2020' : g.cond === 'YELLOW' ? '#ffe020' : '#20ff40';
          const blink = g.cond !== 'RED' || ((frame >> 3) & 1);
          ctx.fillStyle = cc; if (blink) ctx.fillRect(PW + 6, 144, 52, 11);
          text(ctx, g.cond, PW + 32, 146, '#000000', { center: true });
          for (let i = 0; i < Math.min(4, g.lives); i++) ctx.drawImage(SHIP[0], PW + 4 + i * 14, 164);
          text(ctx, 'ROUND', PW + 6, 186, '#ffffff'); text(ctx, String(g.round), W - 4, 196, '#ffffff', { right: true });
          const left = g.stations.filter(s => s.alive).length;
          text(ctx, 'BASES ' + left, PW + 32, 210, '#30ff60', { center: true });
        }
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, PW, H); ctx.clip();
        drawStars(ctx);
        if (mode === 'title') { ctx.restore(); renderTitle(ctx); return; }
        for (const s of g.stations) { if (!s.alive) continue; const q = scr(s); if (onScr(q, 40)) drawStation(ctx, s, q.x, q.y); }
        for (const r of g.rocks) { const q = scr(r); if (onScr(q, 10)) { const im = ROCKS[r.v]; ctx.drawImage(im, q.x - (im.width >> 1), q.y - (im.height >> 1)); } }
        for (const m of g.mines) { const q = scr(m); if (onScr(q, 10)) ctx.drawImage(MINE, q.x - 5, q.y - 5); }
        for (const bl of g.blasts) { const q = scr(bl); disc(ctx, q.x, q.y, 6 + bl.t * 0.7, bl.t < 8 ? '#ffffff' : bl.t < 18 ? 'rgba(255,120,200,0.7)' : 'rgba(255,40,100,0.35)'); }
        for (const e of g.en) { const q = scr(e); if (onScr(q, 8)) drawEnemy(ctx, e, q); }
        ctx.fillStyle = '#ffffff';
        for (const b of g.pb) { const q = scr(b); ctx.fillRect(q.x - 1, q.y - 1, 2, 2); }
        for (const b of g.eb) { const q = scr(b); ctx.fillStyle = (frame >> 2) & 1 ? '#ff4040' : '#ffff40'; ctx.fillRect(q.x - 1, q.y - 1, 2, 2); }
        const p = g.p;
        if (p.alive && !(p.inv > 0 && (p.inv >> 2) & 1)) ctx.drawImage(SHIP[p.dir], CX - 7, CY - 7);
        for (const b of g.booms) { const q = scr(b); if (onScr(q, 20)) drawBoom(ctx, b, q); }
        for (const q0 of g.pops) { const q = scr(q0); text(ctx, q0.n, q.x, q.y - 12, '#ffffff', { center: true }); }
        if (g.phase === 'start') { text(ctx, 'ROUND ' + g.round, CX, 70, '#ffffff', { center: true }); if ((frame >> 3) & 1) text(ctx, 'BLAST OFF!', CX, 150, '#ffe020', { center: true }); }
        if (g.msgT > 0 && g.phase === 'play' && ((g.msgT >> 3) & 1)) text(ctx, g.msg, CX, 40, g.msg.indexOf('SPY') >= 0 ? '#ff60ff' : '#ff4040', { center: true });
        if (g.phase === 'play' && g.cond === 'RED' && g.red > 0 && ((frame >> 4) & 1) && g.msgT <= 0) text(ctx, 'CONDITION RED', CX, 40, '#ff2020', { center: true });
        if (g.phase === 'clear') text(ctx, 'ROUND ' + g.round + ' CLEAR', CX, 90, '#30ff60', { center: true });
        if (g.phase === 'over') { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(30, 98, PW - 60, 28); text(ctx, 'GAME OVER', CX, 108, '#ff3030', { center: true }); }
        ctx.restore();
        drawPanel(ctx);
      }
      function renderTitle(ctx) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, PW, H); ctx.clip();
        const ly = 26;
        text(ctx, 'BOSCONIAN', CX + 2, ly + 2, '#003010', { center: true, scale: 3 });
        const bands = [[0, 7, '#a0ffb0'], [7, 14, '#30ff60'], [14, 21, '#10a030']];
        for (const [a, b, c] of bands) { ctx.save(); ctx.beginPath(); ctx.rect(0, ly + a, PW, b - a); ctx.clip(); text(ctx, 'BOSCONIAN', CX, ly, c, { center: true, scale: 3 }); ctx.restore(); }
        text(ctx, 'STAR DESTROYER', CX, ly + 26, '#ffe020', { center: true });
        const page = (titleT / 420 | 0) % 2;
        if (page === 0) {
          const s = { x: 0, y: 0, vert: false, can: [1, 1, 1, 1, 1, 1], t: titleT };
          drawStation(ctx, s, CX, 96);
          text(ctx, 'CANNON      200', CX, 126, '#ffffff', { center: true });
          text(ctx, 'STATION    1500', CX, 138, '#ffffff', { center: true });
          text(ctx, 'HIT THE CORE OR', CX, 154, '#a0c0ff', { center: true });
          text(ctx, 'ALL SIX CANNONS', CX, 164, '#a0c0ff', { center: true });
        } else {
          const rows = [[ITYPE, 'I-TYPE', 50], [PTYPE, 'P-TYPE', 60], [ETYPE, 'E-TYPE', 70], [SPY, 'SPY SHIP', '?'], [MINE, 'COSMO-MINE', 20], [ROCKS[1], 'ASTEROID', 10]];
          rows.forEach((r, i) => {
            const y = 70 + i * 16, im = Array.isArray(r[0]) ? r[0][(titleT >> 3) % NROT] : r[0];
            ctx.drawImage(im, 30 - (im.width >> 1), y + 3 - (im.height >> 1));
            text(ctx, r[1], 46, y, '#ffffff'); text(ctx, r[2], 200, y, '#ffffff', { right: true });
          });
          text(ctx, 'FORMATION BONUS', CX, 170, '#ff6060', { center: true });
        }
        if (api.credits === 0 || coinFlash > 0) { if (coinFlash > 0 ? (coinFlash >> 2) & 1 : (frame >> 5) & 1) text(ctx, 'INSERT COIN', CX, 186, '#ff3030', { center: true }); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START BUTTON', CX, 186, '#ffffff', { center: true });
        text(ctx, '\u00a9 1981 NAMCO', CX, 200, '#c0c0c0', { center: true });
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 9, '#ffffff');
        ctx.restore();
        drawPanel(ctx);
      }
      return { update, render, destroy() { } };
    }
  });
})();
