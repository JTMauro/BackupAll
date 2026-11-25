// Xevious (Namco, 1982) \u2014 built-in recreation for the MAME32 Game Room.
// Solvalou vs. the Xevious forces: Zapper (Space) for air targets, Blaster (X) bombs the spot under the sight.
(function () {
  'use strict';
  const W = 224, H = 288;

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
  // text(ctx, s, x, y, col, {scale, center, right})
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
    const h = rows.length, w = rows[0].length, cv = mkCanvas(w, h), c = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = pal[rows[y][x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } }
    return cv;
  }
  function RNG(seed) { let s = (seed >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // ================= Sprites =================
  const SOLVALOU = spr([
    '.......W.......',
    '......WGW......',
    '......WGW......',
    '.....WGRGW.....',
    '.....WGRGW.....',
    '....WGGRGGW....',
    '....WGGGGGW....',
    '...WGGGBGGGW...',
    '..WGGGBBBGGGW..',
    '.WGGGGBBBGGGGW.',
    'WGGGGGGBGGGGGGW',
    'WGGRRGGGGGRRGGW',
    'WGG..GGGGG..GGW',
    '.W...WGGGW...W.',
    '......WRW......'], { W: '#ffffff', G: '#a8acc0', R: '#e02020', B: '#2030a0' });
  const SHADOW = spr([
    '.......K.......', '......KKK......', '.....KKKKK.....', '....KKKKKKK....', '...KKKKKKKKK...',
    '.KKKKKKKKKKKKK.', 'KKKKKKKKKKKKKKK', 'KKK..KKKKK..KKK', '......KKK......'], { K: 'rgba(0,0,0,0.35)' });
  const TORKAN = spr([
    '....WWW....',
    '..WWBBBWW..',
    '.WBBCCCBBW.',
    'WBBCCWCCBBW',
    'WBBBCCCBBBW',
    '.WWBBBBBWW.',
    '...RR.RR...'], { W: '#e8e8ff', B: '#3050d0', C: '#80c8ff', R: '#ff3030' });
  const JARA = spr([
    '.....W.....',
    '....WGW....',
    'WWWWGGGWWWW',
    '.GGGGRGGGG.',
    '..GG.G.GG..'], { W: '#ffffff', G: '#9098b0', R: '#ff2020' });
  const TERRAZI = spr([
    'G....W....G',
    'GG..WYW..GG',
    'GGGGGRGGGGG',
    '.GGGGGGGGG.',
    '..G.GGG.G..',
    '....G.G....'], { W: '#ffffff', G: '#30b060', Y: '#ffe040', R: '#ff2020' });
  const GROBDA = spr([
    'KK.....KK',
    'KGGGGGGGK',
    'KGDDDDDGK',
    'KGDRRRDGK',
    'KGDRWRDGK',
    'KGDDDDDGK',
    'KGGGGGGGK',
    'KK.....KK'], { K: '#202020', G: '#707880', D: '#4a5058', R: '#b02020', W: '#ff8080' });
  const FLAG = spr([
    'WRRRR',
    'WRRRR',
    'WRRR.',
    'W....',
    'W....',
    'W....'], { W: '#ffffff', R: '#ffd000' });

  const AREA_LEN = 1792;               // pixels of terrain per area
  const SCROLL = 0.55;                 // terrain scroll speed (px/frame)
  const GRASS = ['#3d7a2c', '#4a7d30', '#557a2e', '#3f6f36', '#4d8034', '#5a7c34', '#456f2c', '#3b7440'];

  // ================= Nazca figures (normalised 0..1 polylines) =================
  const NAZCA = [
    // hummingbird
    [[[.5, .05], [.5, .3]], [[.5, .3], [.42, .35], [.4, .5], [.45, .7], [.5, .78], [.55, .7], [.6, .5], [.58, .35], [.5, .3]],
      [[.42, .4], [.1, .3], [.05, .38], [.4, .48]], [[.58, .4], [.9, .3], [.95, .38], [.6, .48]],
      [[.45, .7], [.38, .92], [.5, .85], [.62, .92], [.55, .7]]],
    // spider
    [[[.5, .3], [.4, .4], [.42, .6], [.5, .7], [.58, .6], [.6, .4], [.5, .3]], [[.5, .3], [.5, .15]],
      [[.43, .38], [.2, .2], [.15, .3]], [[.42, .48], [.12, .45]], [[.42, .58], [.15, .7], [.2, .8]], [[.45, .66], [.3, .9]],
      [[.57, .38], [.8, .2], [.85, .3]], [[.58, .48], [.88, .45]], [[.58, .58], [.85, .7], [.8, .8]], [[.55, .66], [.7, .9]]],
    // monkey spiral + lines
    [[[.5, .5], [.55, .5], [.55, .45], [.45, .45], [.45, .58], [.62, .58], [.62, .38], [.38, .38], [.38, .66], [.7, .66], [.7, .3]],
      [[.7, .3], [.8, .2], [.9, .25], [.85, .1]], [[.38, .66], [.25, .8], [.15, .75], [.2, .9]]],
    // trapezoids and lines
    [[[.1, .05], [.9, .95]], [[.2, .9], [.35, .1], [.45, .1], [.4, .9], [.2, .9]], [[.6, .1], [.95, .5], [.6, .9]], [[.05, .5], [.95, .45]]]
  ];

  ArcadeRegistry.register({
    id: 'xevious', title: 'Xevious', year: 1982, maker: 'Namco',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Space: Zapper (air) \u00b7 X: Blaster bomb (ground) \u00b7 Enter: start',
    marquee: { bg: '#0a1a10', fg: '#d8dce8', accent: '#e02020' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(40000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0;
      let g = null;
      let demo = { map: genArea(5, null).map, d: 0 };

      // ================= Terrain generation =================
      function genArea(area, prev) {
        const rnd = RNG(area * 7919 + 13);
        const lvl = (area - 1) % 16;
        const MH = AREA_LEN + H;
        const cv = mkCanvas(W, MH), x = cv.getContext('2d');
        const base = GRASS[lvl % GRASS.length];
        x.fillStyle = base; x.fillRect(0, 0, W, MH);
        for (let i = 0; i < 3200; i++) {
          x.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,200,0.12)';
          x.fillRect(rnd() * W | 0, rnd() * MH | 0, 1 + (rnd() * 2 | 0), 1);
        }
        const roads = [], objs = [];
        const nazcaArea = (lvl % 4) === 2;
        let y = AREA_LEN; const segs = [];
        while (y > 0) { const len = 200 + (rnd() * 180 | 0); const top = Math.max(0, y - len); segs.push({ bot: y, top }); y = top; }
        segs.forEach((s, i) => {
          let k = rnd();
          let kind = k < 0.33 ? 'forest' : k < 0.53 ? 'road' : k < 0.7 ? 'river' : k < 0.85 ? 'field' : 'nazca';
          if (nazcaArea && i % 2 === 1) kind = 'nazca';
          if (!nazcaArea && kind === 'nazca' && rnd() < 0.6) kind = 'forest';
          if (i === 0) kind = 'forest';
          s.kind = kind;
          if (kind === 'forest') drawForest(x, s, rnd);
          else if (kind === 'river') drawRiver(x, s, rnd);
          else if (kind === 'road') roads.push(drawRoad(x, s, rnd));
          else if (kind === 'field') drawField(x, s, rnd);
          else drawNazca(x, s, rnd);
          // a road often runs through forests too
          if (kind === 'forest' && rnd() < 0.5) roads.push(drawRoad(x, s, rnd));
        });
        if (prev) x.drawImage(prev, 0, 0, W, H, 0, AREA_LEN, W, H);
        // ---- ground objects ----
        const diff = area;
        const put = (type, ox, oy, extra) => { const o = Object.assign({ type, x: ox, gy: oy, alive: true, t: 0, ft: 60 + rnd() * 120 }, extra || {}); objs.push(o); return o; };
        segs.forEach((s, i) => {
          const span = s.bot - s.top;
          const rp = (lo, hi) => s.top + 20 + rnd() * Math.max(1, span - 40);
          if (s.bot > AREA_LEN - 60 && i === 0) return;
          // barra clusters
          if (rnd() < 0.8) {
            const cx = 30 + rnd() * (W - 60), cy = rp(), n = 2 + (rnd() * 3 | 0), hor = rnd() < 0.5;
            for (let j = 0; j < n; j++) put('barra', hor ? cx - n * 9 + j * 18 + 9 : cx, hor ? cy : cy - j * 18);
          }
          const nl = Math.min(4, 1 + (diff / 3 | 0));
          for (let j = 0; j < nl; j++) if (rnd() < 0.7) put('logram', 20 + rnd() * (W - 40), rp());
          if (diff >= 2 && rnd() < 0.35) put('garubarra', 30 + rnd() * (W - 60), rp());
          if (diff >= 4 && rnd() < 0.3) put('derota', 40 + rnd() * (W - 80), rp(), { hp: 1 });
          if (diff >= 6 && rnd() < 0.3) {
            const cx = 30 + rnd() * (W - 60), cy = rp();
            put('logram', cx - 8, cy - 8); put('logram', cx + 8, cy - 8); put('logram', cx - 8, cy + 8); put('logram', cx + 8, cy + 8);
          }
        });
        for (const r of roads) {
          const n = 1 + (rnd() * 2 | 0);
          for (let j = 0; j < n; j++) {
            const idx = rnd() * (r.length - 1) | 0;
            const typ = diff >= 3 && rnd() < 0.4 ? 'domogram' : 'grobda';
            put(typ, r[idx].x, r[idx].y, { path: r, pi: idx, dir: rnd() < 0.5 ? 1 : -1, spd: typ === 'grobda' ? 0.3 : 0.25 });
          }
        }
        put('zolbak', 30 + rnd() * (W - 60), AREA_LEN * (0.3 + rnd() * 0.4));
        const ns = (area % 3 === 0) ? 2 : 1;
        for (let j = 0; j < ns; j++) put('sol', 24 + rnd() * (W - 48), AREA_LEN * (0.15 + rnd() * 0.7), { state: 'hidden', h: 0 });
        if (area % 2 === 1 && rnd() < 0.7) put('flag', 24 + rnd() * (W - 48), AREA_LEN * (0.2 + rnd() * 0.6), { state: 'hidden' });
        // keep objects out of the area's lead-in
        return { map: cv, objs: objs.filter(o => o.gy < AREA_LEN - 30 && o.gy > 30) };
      }
      function drawForest(x, s, rnd) {
        const span = s.bot - s.top, side = rnd();
        const ph = rnd() * 6, amp = 20 + rnd() * 30;
        const inside = (px, py) => {
          const t = (py - s.top) / span; const taper = Math.sin(Math.PI * Math.max(0, Math.min(1, t)));
          const e = Math.sin(py / 37 + ph) * amp * 0.5 + Math.sin(py / 13 + ph * 2) * 8;
          if (side < 0.33) return px < W * 0.55 * taper + e;
          if (side < 0.66) return px > W - W * 0.55 * taper + e;
          return Math.abs(px - W / 2 - e) < W * 0.42 * taper;
        };
        const n = span * W / 45 | 0;
        for (let i = 0; i < n; i++) {
          const px = rnd() * W, py = s.top + rnd() * span;
          if (!inside(px, py)) continue;
          const r = 3 + rnd() * 4;
          x.fillStyle = '#1d4a1a'; x.beginPath(); x.arc(px | 0, py | 0, r, 0, Math.PI * 2); x.fill();
          x.fillStyle = '#2c6422'; x.beginPath(); x.arc((px - 1) | 0, (py - 1) | 0, r * 0.6, 0, Math.PI * 2); x.fill();
          x.fillStyle = '#4a8a34'; x.fillRect((px - 2) | 0, (py - 2) | 0, 1, 1);
        }
      }
      function drawRiver(x, s, rnd) {
        const span = s.bot - s.top, ltr = rnd() < 0.5;
        const x0 = ltr ? -50 : W + 50, x1 = ltr ? W + 50 : -50, amp = 20 + rnd() * 30, ph = rnd() * 6;
        for (let yy = s.top; yy < s.bot; yy++) {
          const t = (s.bot - yy) / span;
          const cx = x0 + (x1 - x0) * t + Math.sin(t * Math.PI * 2 + ph) * amp;
          // the river is drawn as a band of horizontal runs; since it crosses diagonally, widen to cover gaps
          const w = 30 + Math.sin(yy / 23 + ph) * 6;
          const slope = Math.abs((x1 - x0) / span) * 2 + 2;
          x.fillStyle = '#c8b070'; x.fillRect((cx - w / 2 - 3 - slope) | 0, yy, (w + 6 + slope * 2) | 0, 1);
          x.fillStyle = '#2050b0'; x.fillRect((cx - w / 2 - slope / 2) | 0, yy, (w + slope) | 0, 1);
          x.fillStyle = '#3870d0'; if ((yy + (cx | 0)) % 5 === 0) x.fillRect((cx - w / 4) | 0, yy, (w / 2) | 0, 1);
        }
      }
      function drawRoad(x, s, rnd) {
        const span = s.bot - s.top;
        const x0 = 20 + rnd() * (W - 40), x1 = 20 + rnd() * (W - 40), amp = 10 + rnd() * 25, ph = rnd() * 6;
        const path = [];
        for (let yy = s.bot; yy >= s.top; yy -= 2) {
          const t = (s.bot - yy) / span;
          path.push({ x: x0 + (x1 - x0) * t + Math.sin(t * Math.PI * 2 + ph) * amp, y: yy });
        }
        for (const p of path) { x.fillStyle = '#3a3a34'; x.fillRect((p.x - 6) | 0, p.y | 0, 12, 2); }
        for (const p of path) { x.fillStyle = '#8a8a80'; x.fillRect((p.x - 5) | 0, p.y | 0, 10, 2); }
        path.forEach((p, i) => { if ((i >> 2) & 1) { x.fillStyle = '#e8e8d0'; x.fillRect(p.x | 0, p.y | 0, 1, 2); } });
        // occasional crossing road
        if (rnd() < 0.5) {
          const cy = (s.top + span * (0.3 + rnd() * 0.4)) | 0;
          x.fillStyle = '#3a3a34'; x.fillRect(0, cy - 5, W, 10);
          x.fillStyle = '#8a8a80'; x.fillRect(0, cy - 4, W, 8);
          x.fillStyle = '#e8e8d0'; for (let xx = 0; xx < W; xx += 8) x.fillRect(xx, cy, 4, 1);
        }
        return path;
      }
      function drawField(x, s, rnd) {
        const span = s.bot - s.top;
        const n = 3 + (rnd() * 4 | 0);
        for (let i = 0; i < n; i++) {
          const fw = 30 + rnd() * 60, fh = 30 + rnd() * 70, fx = rnd() * (W - fw), fy = s.top + rnd() * Math.max(1, span - fh);
          x.fillStyle = rnd() < 0.5 ? '#6a8a3a' : '#7a7a40'; x.fillRect(fx | 0, fy | 0, fw | 0, fh | 0);
          x.fillStyle = 'rgba(0,0,0,0.15)';
          for (let yy = 2; yy < fh; yy += 4) x.fillRect(fx | 0, (fy + yy) | 0, fw | 0, 1);
        }
      }
      function drawNazca(x, s, rnd) {
        const span = s.bot - s.top;
        for (let yy = s.top; yy < s.bot; yy++) {
          const t = (yy - s.top) / span, e = Math.min(1, Math.sin(Math.PI * t) * 3);
          const m = W * 0.5 * e + Math.sin(yy / 17) * 6;
          x.fillStyle = '#c0a060'; x.fillRect((W / 2 - m) | 0, yy, (m * 2) | 0, 1);
          if ((yy * 7) % 11 === 0) { x.fillStyle = '#a88848'; x.fillRect((W / 2 - m + rnd() * m * 2) | 0, yy, 2, 1); }
        }
        const fig = NAZCA[rnd() * NAZCA.length | 0];
        const sz = Math.min(170, span - 40), ox = (W - sz) / 2, oy = s.top + (span - sz) / 2;
        x.strokeStyle = '#6a4a24'; x.lineWidth = 1.5;
        for (const line of fig) {
          x.beginPath();
          line.forEach((p, i) => { const px = ox + p[0] * sz, py = oy + p[1] * sz; if (i) x.lineTo(px, py); else x.moveTo(px, py); });
          x.stroke();
        }
      }

      // ================= Game state =================
      function newGame() {
        g = {
          score: 0, lives: 2, area: 1, nextLife: 20000,
          p: { x: W / 2, y: H - 50, alive: true }, phase: 'ready', phaseT: 120,
          pb: [], eb: [], air: [], booms: [], pops: [], bomb: null, fireT: 0, spawnT: 120, calm: 0, msg: '', msgT: 0
        };
        loadArea(1, null, 0);
        au.melody([[392, .12], [523, .12], [659, .12], [784, .24], [659, .12], [784, .4]], { type: 'square', vol: 0.12 });
      }
      function loadArea(area, prev, d0) {
        const a = genArea(area, prev);
        g.map = a.map; g.gnd = a.objs; g.d = d0; g.andorDone = (area % 2 === 1);
        const my = AREA_LEN - d0;
        g.gnd = g.gnd.filter(o => o.gy < my + 60);   // nothing already behind the start line
      }
      function nextArea() {
        const old = g.map;
        const carry = g.gnd.filter(o => o.alive || o.type === 'crater').filter(o => o.gy - (AREA_LEN - g.d) > -40);
        g.area++;
        const a = genArea(g.area, old);
        for (const o of carry) { o.gy += AREA_LEN; if (o.path) o.path = null; }
        g.map = a.map; g.gnd = a.objs.concat(carry); g.d -= AREA_LEN;
        g.andorDone = (g.area % 2 === 1);
        g.msg = 'AREA ' + g.area; g.msgT = 150;
      }
      function restartAfterDeath() {
        const cp = g.d >= AREA_LEN * 0.55 ? AREA_LEN * 0.55 : 0;
        loadArea(g.area, null, cp);
        if (cp > AREA_LEN * 0.45) g.andorDone = true;
        const my = AREA_LEN - g.d;
        g.gnd = g.gnd.filter(o => o.gy - my < 90);
        g.p = { x: W / 2, y: H - 50, alive: true };
        g.pb = []; g.eb = []; g.air = []; g.bomb = null; g.spawnT = 150; g.phase = 'ready'; g.phaseT = 100;
      }
      function addScore(n) {
        g.score += n;
        if (g.score >= g.nextLife) {
          g.lives++; g.nextLife = g.nextLife === 20000 ? 60000 : g.nextLife + 60000;
          au.melody([[784, .08], [988, .08], [1175, .08], [1568, .2]], { type: 'square', vol: 0.12 });
        }
        if (g.score > hi) hi = g.score;
      }
      function pop(x, y, n) { g.pops.push({ x, y, n, t: 60 }); }
      function boom(x, y, big, ground) { g.booms.push({ x, y, t: 0, big: !!big, ground: !!ground }); }
      const mapY0 = () => AREA_LEN - g.d;
      const diff = () => Math.min(20, g.area);
      function spario(x, y, tx, ty, sp) {
        const dx = tx - x, dy = ty - y, L = Math.hypot(dx, dy) || 1;
        sp = sp || Math.min(2.6, 1.3 + diff() * 0.07);
        g.eb.push({ x, y, vx: dx / L * sp, vy: dy / L * sp });
      }
      function aimAtPlayer(x, y, sp) { if (g.p.alive) spario(x, y, g.p.x, g.p.y, sp); }

      // ================= Air enemies =================
      function spawnWave() {
        const D = diff(), r = Math.random();
        const opts = [['toroid', 5]];
        if (D >= 1) opts.push(['torkan', 3]);
        if (D >= 2) opts.push(['zoshi', 3], ['bacura', 2], ['zakato', 2]);
        if (D >= 3) opts.push(['terrazi', 2]);
        if (D >= 4) opts.push(['jara', 3]);
        if (D >= 5) opts.push(['brag', 2]);
        let tot = 0; for (const o of opts) tot += o[1];
        let pick = r * tot, type = 'toroid';
        for (const o of opts) { pick -= o[1]; if (pick <= 0) { type = o[0]; break; } }
        const px = g.p.x;
        if (type === 'toroid') {
          const n = 3 + (Math.random() * 3 | 0), x0 = 20 + Math.random() * (W - 40);
          for (let i = 0; i < n; i++) g.air.push({ type, x: x0 + (Math.random() - 0.5) * 30, y: -10 - i * 16, vx: 0, vy: 1.6 + D * 0.05, t: 0, st: 0, shoot: Math.random() < 0.25 + D * 0.05 });
        } else if (type === 'torkan') {
          for (let i = 0; i < 2; i++) g.air.push({ type, x: 30 + Math.random() * (W - 60), y: -10 - i * 20, vx: 0, vy: 2, t: 0, st: 0, stopY: 60 + Math.random() * 90 });
        } else if (type === 'zoshi') {
          const x0 = Math.random() < 0.5 ? -10 : W + 10;
          for (let i = 0; i < 3; i++) g.air.push({ type, x: x0, y: 30 + i * 18, vx: 0, vy: 0, t: -i * 12, st: 0, a: 0 });
        } else if (type === 'bacura') {
          const n = 2 + (Math.random() * 3 | 0), x0 = 20 + Math.random() * (W - 40 - n * 24);
          for (let i = 0; i < n; i++) g.air.push({ type, x: x0 + i * 24, y: -12, vx: 0, vy: 0.75, t: Math.random() * 60 });
        } else if (type === 'zakato' || type === 'brag') {
          g.air.push({ type, x: 24 + Math.random() * (W - 48), y: 30 + Math.random() * 130, vx: 0, vy: 0, t: 0 });
        } else if (type === 'terrazi') {
          const left = Math.random() < 0.5;
          g.air.push({ type, x: left ? -10 : W + 10, y: H - 30, vx: left ? 1.8 : -1.8, vy: -0.5, t: 0, shot: false });
        } else if (type === 'jara') {
          const n = 2 + (Math.random() * 2 | 0);
          for (let i = 0; i < n; i++) g.air.push({ type, x: px + (i - n / 2) * 30, y: -10 - i * 14, vx: 0, vy: 2.2, t: Math.random() * 6, base: px + (i - n / 2) * 30 });
        }
      }
      const AIRPTS = { toroid: 30, torkan: 50, zoshi: 70, jara: 150, terrazi: 700, zakato: 100, brag: 600, bacura: 0 };
      function updAir() {
        const p = g.p, D = diff();
        for (const e of g.air) {
          e.t++;
          switch (e.type) {
            case 'toroid':
              if (e.st === 0) {
                e.vx += Math.sign(p.x - e.x) * 0.03; e.vx = Math.max(-1.2, Math.min(1.2, e.vx));
                if (e.y > p.y - 110 + Math.random() * 30 || e.y > H * 0.55) { e.st = 1; e.vx = (e.x < p.x ? -1 : 1) * 1.6; if (e.shoot) aimAtPlayer(e.x, e.y); }
              } else { e.vy = Math.max(-2.4, e.vy - 0.12); }
              break;
            case 'torkan':
              if (e.st === 0) { if (e.y >= e.stopY) { e.vy = 0; e.st = 1; e.t = 0; } }
              else if (e.st === 1) { if (e.t === 30) aimAtPlayer(e.x, e.y); if (e.t > 50) { e.st = 2; } }
              else e.vy = Math.max(-2.2, e.vy - 0.08);
              break;
            case 'zoshi':
              if (e.t > 0 && e.t % 50 === 1) {
                const dx = p.x - e.x, dy = p.y - e.y, L = Math.hypot(dx, dy) || 1, sp = 1.4 + D * 0.05;
                e.vx = dx / L * sp; e.vy = dy / L * sp;
                if (Math.random() < 0.15 + D * 0.02) aimAtPlayer(e.x, e.y);
              }
              if (e.t > 400) { e.vy = -2; }
              e.a += 0.25;
              break;
            case 'bacura': break;
            case 'zakato': case 'brag':
              if (e.t === 45 && e.type === 'zakato') aimAtPlayer(e.x, e.y);
              if (e.t === 80) {
                if (e.type === 'brag') { for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; g.eb.push({ x: e.x, y: e.y, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6 }); } boom(e.x, e.y); }
                e.dead = true;
              }
              break;
            case 'terrazi':
              e.vy -= 0.035; e.vx *= 0.995;
              if (!e.shot && e.y < p.y - 30) { e.shot = true; aimAtPlayer(e.x, e.y); }
              break;
            case 'jara':
              e.x = e.base + Math.sin(e.t / 14) * 26; e.base += Math.sign(p.x - e.base) * 0.35;
              break;
          }
          e.x += e.vx; e.y += e.vy;
          if (e.y > H + 20 || e.y < -40 || e.x < -40 || e.x > W + 40) e.dead = e.t > 20;
        }
        g.air = g.air.filter(e => !e.dead);
      }

      // ================= Ground enemies =================
      const GPTS = { barra: 100, garubarra: 300, logram: 300, zolbak: 600, grobda: 200, domogram: 800, derota: 1000, sol: 2000 };
      function bombable(o) { return o.alive && o.type !== 'crater' && !(o.type === 'flag' && o.state !== 'hidden'); }
      function updGround() {
        const my = mapY0(), p = g.p, D = diff();
        for (const o of g.gnd) {
          if (!o.alive) continue;
          o.t++;
          const sy = o.gy - my;
          if ((o.type === 'grobda' || o.type === 'domogram') && o.path) {
            let spd = o.spd;
            if (o.type === 'grobda' && g.bomb && Math.abs(g.bomb.tx - o.x) < 34 && Math.abs(g.bomb.tgy - o.gy) < 40) spd = 1.1;
            o.pi += o.dir * spd / 2;
            if (o.pi <= 0 || o.pi >= o.path.length - 1) { o.dir *= -1; o.pi = Math.max(0, Math.min(o.path.length - 1, o.pi)); }
            const q = o.path[Math.round(o.pi)]; o.x = q.x; o.gy = q.y;
          }
          if (o.type === 'sol' && o.state === 'rise') { o.h = Math.min(16, o.h + 0.25); if (o.h >= 16) o.state = 'up'; }
          if (o.type === 'flag' && o.state === 'shown' && p.alive && Math.abs(p.x - o.x) < 10 && Math.abs(p.y - sy) < 12) {
            o.alive = false; g.lives++; pop(o.x, sy, '1UP');
            au.melody([[1047, .08], [1319, .08], [1568, .08], [2093, .25]], { type: 'square', vol: 0.12 });
          }
          if (o.type === 'andor') { updAndor(o, sy); continue; }
          if (sy < 6 || sy > H - 70 || !p.alive) continue;
          let rate = 0;
          if (o.type === 'logram') rate = Math.max(70, 170 - D * 6);
          else if (o.type === 'derota') rate = Math.max(28, 60 - D * 2);
          else if (o.type === 'domogram') rate = Math.max(80, 150 - D * 4);
          else if (o.type === 'grobda' && D >= 8) rate = 200;
          if (rate) {
            o.ft--;
            if (o.ft <= 0) {
              o.ft = rate * (0.7 + Math.random() * 0.6); o.open = 14;
              aimAtPlayer(o.x, sy);
              if (o.type === 'derota') aimAtPlayer(o.x, sy, Math.min(3, 1.8 + D * 0.08));
            }
          }
          if (o.open) o.open--;
        }
        // Andor Genesis entry
        if (!g.andorDone && g.d > AREA_LEN * 0.4) {
          g.andorDone = true;
          g.gnd.push({ type: 'andor', x: W / 2, gy: mapY0() - 70, alive: true, t: 0, hatch: [1, 1, 1, 1], ft: [40, 70, 100, 130], core: true });
          g.msg = 'ANDOR GENESIS'; g.msgT = 150;
          au.melody([[110, .3], [104, .3], [98, .3], [92, .6]], { type: 'sawtooth', vol: 0.1 });
        }
        g.gnd = g.gnd.filter(o => (o.gy - my) < H + 80 || (o.type === 'andor' && o.alive && o.gy - my < H + 90));
      }
      const HATCH = [[-26, -14], [26, -14], [-26, 18], [26, 18]];
      function updAndor(o, sy) {
        o.gy -= SCROLL * 0.45;   // hovers: slower than the ground
        if (!o.core) return;
        if (sy < -40 || sy > H - 40 || !g.p.alive) return;
        for (let i = 0; i < 4; i++) {
          if (!o.hatch[i]) continue;
          if (--o.ft[i] <= 0) { o.ft[i] = Math.max(50, 110 - diff() * 3) + Math.random() * 40; aimAtPlayer(o.x + HATCH[i][0], sy + HATCH[i][1]); }
        }
        if (o.t % 160 === 80 && diff() >= 3) { for (let k = -1; k <= 1; k++) g.eb.push({ x: o.x, y: sy, vx: k * 0.8, vy: 1.8 }); }
      }
      function hitGround(o, bx, bgy) {
        const my = mapY0(), sy = o.gy - my;
        if (o.type === 'andor') {
          if (!o.core) return false;
          let hit = false;
          for (let i = 0; i < 4; i++) {
            if (o.hatch[i] && Math.hypot(bx - (o.x + HATCH[i][0]), bgy - (o.gy + HATCH[i][1])) < 9) { o.hatch[i] = 0; addScore(1000); pop(o.x + HATCH[i][0], sy + HATCH[i][1], 1000); boom(o.x + HATCH[i][0], sy + HATCH[i][1], false, true); hit = true; }
          }
          if (Math.hypot(bx - o.x, bgy - o.gy) < 9) {
            o.core = false; addScore(4000); pop(o.x, sy, 4000);
            for (let k = 0; k < 6; k++) boom(o.x + (Math.random() - 0.5) * 50, sy + (Math.random() - 0.5) * 50, true, true);
            au.noise(1.4, { vol: 0.25, freq: 1500, slideTo: 80 });
            hit = true;
          }
          return hit;
        }
        if (o.type === 'sol') {
          if (o.state === 'hidden') { o.state = 'rise'; au.melody([[220, .1], [330, .1], [440, .1], [660, .2]], { type: 'triangle', vol: 0.14 }); return true; }
          if (o.state === 'rise') return false;
        }
        if (o.type === 'flag') { if (o.state === 'hidden') { o.state = 'shown'; au.tone(1200, 0.2, { type: 'square', vol: 0.1, slideTo: 2400 }); } return true; }
        o.alive = false;
        const pts = GPTS[o.type] || 100;
        addScore(pts); pop(o.x, sy, pts);
        boom(o.x, sy, o.type === 'derota' || o.type === 'sol' || o.type === 'domogram', true);
        g.gnd.push({ type: 'crater', x: o.x, gy: o.gy, alive: false, big: o.type === 'derota' || o.type === 'garubarra' });
        if (o.type === 'zolbak') { g.calm = 900; g.msg = 'RADAR DOWN'; g.msgT = 90; }
        return true;
      }
      function sightTarget() {
        const my = mapY0(), sx = g.p.x, sgy = my + g.p.y - 84;
        for (const o of g.gnd) {
          if (!bombable(o)) continue;
          if (o.type === 'flag') continue;   // the flag gives no hint
          if (o.type === 'andor') {
            if (!o.core) continue;
            if (Math.hypot(sx - o.x, sgy - o.gy) < 10) return true;
            for (let i = 0; i < 4; i++) if (o.hatch[i] && Math.hypot(sx - o.x - HATCH[i][0], sgy - o.gy - HATCH[i][1]) < 9) return true;
            continue;
          }
          if (Math.hypot(sx - o.x, sgy - o.gy) < 10) return true;
        }
        return false;
      }

      // ================= Main update =================
      function playerDie() {
        const p = g.p; p.alive = false; g.bomb = null;
        boom(p.x, p.y, true); boom(p.x - 6, p.y + 4, false); boom(p.x + 6, p.y - 3, false);
        au.noise(1.2, { vol: 0.28, freq: 2200, slideTo: 60 });
        au.tone(400, 1.0, { type: 'sawtooth', vol: 0.1, slideTo: 40 });
        g.phase = 'dead'; g.phaseT = 160;
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 300;
        au.melody([[392, .2], [370, .2], [349, .2], [330, .5]], { type: 'square', vol: 0.1 });
      }
      function updPlay() {
        const p = g.p;
        g.d += SCROLL;
        if (g.d >= AREA_LEN) nextArea();
        if (g.calm > 0) g.calm--;
        if (g.msgT > 0) g.msgT--;
        // player
        if (p.alive) {
          const sp = 1.6;
          let dx = 0, dy = 0;
          if (api.key('ArrowLeft')) dx -= 1; if (api.key('ArrowRight')) dx += 1;
          if (api.key('ArrowUp')) dy -= 1; if (api.key('ArrowDown')) dy += 1;
          if (dx && dy) { dx *= 0.75; dy *= 0.75; }
          p.x = Math.max(8, Math.min(W - 8, p.x + dx * sp)); p.y = Math.max(104, Math.min(H - 22, p.y + dy * sp));
          if (g.fireT > 0) g.fireT--;
          if ((api.pressed('Space') || (api.key('Space') && g.fireT <= 0)) && g.pb.length < 6) {
            g.pb.push({ x: p.x - 4, y: p.y - 8 }, { x: p.x + 4, y: p.y - 8 }); g.fireT = 8;
            au.tone(1500, 0.06, { type: 'square', vol: 0.06, slideTo: 700 });
          }
          if ((api.pressed('KeyX') || api.key('KeyX')) && !g.bomb) {
            g.bomb = { x0: p.x, y0: p.y - 6, tx: p.x, tgy: mapY0() + p.y - 84, t: 0, T: 26 };
            au.tone(1100, 0.42, { type: 'triangle', vol: 0.12, slideTo: 260 });
          }
        }
        for (const b of g.pb) b.y -= 7;
        g.pb = g.pb.filter(b => b.y > -8);
        // bomb
        if (g.bomb) {
          const b = g.bomb; b.t++;
          if (b.t >= b.T) {
            const sy = b.tgy - mapY0();
            boom(b.tx, sy, false, true);
            au.noise(0.3, { vol: 0.2, freq: 900, slideTo: 100 });
            for (const o of g.gnd.slice()) {
              if (!bombable(o)) continue;
              if (o.type === 'andor') { hitGround(o, b.tx, b.tgy); continue; }
              if (Math.hypot(b.tx - o.x, b.tgy - o.gy) < (o.type === 'derota' ? 11 : 9)) hitGround(o, b.tx, b.tgy);
            }
            g.bomb = null;
          }
        }
        updGround();
        // spawn air
        const andorOn = g.gnd.some(o => o.type === 'andor' && o.core);
        if (--g.spawnT <= 0) {
          spawnWave();
          let base = Math.max(55, 150 - diff() * 6);
          if (g.calm > 0) base *= 2; if (andorOn) base *= 1.6;
          g.spawnT = base * (0.7 + Math.random() * 0.6);
        }
        updAir();
        for (const b of g.eb) { b.x += b.vx; b.y += b.vy; }
        g.eb = g.eb.filter(b => b.x > -6 && b.x < W + 6 && b.y > -6 && b.y < H + 6);
        // collisions: zapper vs air
        for (const b of g.pb) {
          for (const e of g.air) {
            if (e.dead || b.hit) continue;
            if (e.type === 'zakato' || e.type === 'brag') { if (e.t < 12) continue; }
            if (Math.abs(b.x - e.x) < 7 && Math.abs(b.y - e.y) < 8) {
              b.hit = true;
              if (e.type === 'bacura') { au.tone(2400, 0.03, { type: 'square', vol: 0.05 }); continue; }
              e.dead = true; const pts = AIRPTS[e.type]; addScore(pts); if (pts >= 100) pop(e.x, e.y, pts);
              boom(e.x, e.y, false);
              au.noise(0.18, { vol: 0.16, freq: 3000, slideTo: 300, type: 'bandpass' });
            }
          }
        }
        g.pb = g.pb.filter(b => !b.hit); g.air = g.air.filter(e => !e.dead);
        // player hit
        if (p.alive) {
          for (const e of g.air) if (Math.abs(e.x - p.x) < 8 && Math.abs(e.y - p.y) < 8 && !((e.type === 'zakato' || e.type === 'brag') && e.t < 12)) { playerDie(); break; }
          if (p.alive) for (const b of g.eb) if (Math.abs(b.x - p.x) < 4 && Math.abs(b.y - p.y) < 5) { playerDie(); break; }
        }
        // background bass loop
        if (frame % 64 === 0 && p.alive) {
          const nn = [55, 55, 65.4, 73.4][(frame / 64 | 0) % 4];
          au.tone(nn, 0.22, { type: 'triangle', vol: 0.07 });
          au.tone(nn, 0.12, { type: 'triangle', vol: 0.05, delay: 0.27 });
        }
      }
      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (!demo) demo = { map: genArea(5, null).map, d: 0 };
          demo.d += SCROLL * 1.5; if (demo.d >= AREA_LEN - 2) demo.d = 0;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { mode = 'game'; newGame(); }
            else { coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 }); }
          }
          return;
        }
        for (const b of g.booms) b.t++;
        g.booms = g.booms.filter(b => b.t < (b.big ? 48 : 28));
        for (const q of g.pops) { q.t--; }
        g.pops = g.pops.filter(q => q.t > 0);
        if (g.phase === 'ready') {
          g.phaseT--;
          if (g.p.alive) { if (api.key('ArrowLeft')) g.p.x = Math.max(8, g.p.x - 1.6); if (api.key('ArrowRight')) g.p.x = Math.min(W - 8, g.p.x + 1.6); }
          if (g.phaseT <= 0) g.phase = 'play';
          return;
        }
        if (g.phase === 'play') { updPlay(); return; }
        if (g.phase === 'dead') {
          g.d += SCROLL * 0.5;
          if (g.d >= AREA_LEN) nextArea();
          for (const b of g.eb) { b.x += b.vx; b.y += b.vy; }
          updAir();
          if (--g.phaseT <= 0) {
            if (g.lives > 0) { g.lives--; restartAfterDeath(); }
            else {
              g.phase = 'wait';
              const cg = g;
              if (api.offerContinue) api.offerContinue(() => { if (g === cg) { g.lives = 2; restartAfterDeath(); } }, () => { if (g === cg) gameOver(); });
              else gameOver();
            }
          }
          return;
        }
        if (g.phase === 'over') {
          if (--g.phaseT <= 0 || (g.phaseT < 200 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; }
        }
      }

      // ================= Rendering =================
      function drawPyramid(ctx, x, y, s) {
        x = Math.round(x); y = Math.round(y);
        for (let i = 0; i <= s; i++) {
          ctx.fillStyle = '#c8c8c8'; ctx.fillRect(x - i, y - s + i, i, 1);
          ctx.fillStyle = '#6e6e70'; ctx.fillRect(x, y - s + i, i, 1);
        }
        for (let i = 0; i <= s; i++) {
          ctx.fillStyle = '#9a9a9c'; ctx.fillRect(x - s + i, y + i, (s - i) * 2, 1);
        }
        ctx.fillStyle = '#404044'; ctx.fillRect(x - 1, y - 1, 2, 2);
      }
      function disc(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
      function drawGround(ctx, o, sy) {
        const x = Math.round(o.x); sy = Math.round(sy);
        switch (o.type) {
          case 'crater':
            ctx.fillStyle = 'rgba(20,14,8,0.55)'; ctx.beginPath(); ctx.ellipse(x, sy, o.big ? 11 : 7, o.big ? 8 : 5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x - 2, sy - 1, 4, 2);
            break;
          case 'barra': drawPyramid(ctx, x, sy, 7); break;
          case 'garubarra': drawPyramid(ctx, x, sy, 11); ctx.fillStyle = '#d02020'; ctx.fillRect(x - 1, sy - 2, 3, 3); break;
          case 'logram':
            disc(ctx, x, sy, 6, '#505058'); disc(ctx, x, sy, 5, '#a0a0aa'); disc(ctx, x - 1, sy - 1, 2, '#e0e0e8');
            disc(ctx, x, sy, 2.2, o.open ? '#ff3020' : '#303038');
            break;
          case 'zolbak': {
            disc(ctx, x, sy, 7, '#404048'); disc(ctx, x, sy, 6, '#8a8a96');
            const a = frame / 10;
            ctx.fillStyle = '#ff3030'; ctx.fillRect(Math.round(x + Math.cos(a) * 4) - 1, Math.round(sy + Math.sin(a) * 4) - 1, 2, 2);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x - Math.cos(a) * 4) - 1, Math.round(sy - Math.sin(a) * 4) - 1, 2, 2);
            disc(ctx, x, sy, 2, '#202024');
            break;
          }
          case 'grobda': ctx.drawImage(GROBDA, x - 4, sy - 4); break;
          case 'domogram':
            ctx.fillStyle = '#202020'; ctx.fillRect(x - 7, sy - 6, 14, 12);
            disc(ctx, x, sy, 6, '#7a6a50'); disc(ctx, x, sy, 3, '#b0a080');
            ctx.fillStyle = o.open ? '#ff4020' : '#401010'; ctx.fillRect(x - 1, sy - 9, 2, 5);
            break;
          case 'derota':
            ctx.fillStyle = '#383840';
            ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8; ctx.lineTo(x + Math.cos(a) * 11, sy + Math.sin(a) * 11); } ctx.fill();
            ctx.fillStyle = '#9090a0';
            ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8; ctx.lineTo(x + Math.cos(a) * 9, sy + Math.sin(a) * 9); } ctx.fill();
            disc(ctx, x, sy, 4, o.open ? '#ff4020' : '#a02020');
            for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + frame / 40; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x + Math.cos(a) * 7), Math.round(sy + Math.sin(a) * 7), 1, 1); }
            break;
          case 'sol':
            if (o.state === 'hidden') break;
            {
              const h = Math.round(o.h);
              ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x - 6, sy - 1, 12, 4);
              for (let i = 0; i < h; i++) {
                const w = 6 - (i >> 2);
                ctx.fillStyle = i % 4 === 0 ? '#606870' : '#b8c0c8'; ctx.fillRect(x - w, sy - i, w, 1);
                ctx.fillStyle = i % 4 === 0 ? '#404850' : '#808890'; ctx.fillRect(x, sy - i, w, 1);
              }
              if (o.state === 'up') { ctx.fillStyle = (frame >> 3) & 1 ? '#ffd000' : '#ff6000'; ctx.fillRect(x - 1, sy - h - 2, 2, 2); }
            }
            break;
          case 'flag': if (o.state === 'shown') ctx.drawImage(FLAG, x - 2, sy - 5); break;
          case 'andor': drawAndor(ctx, o, x, sy); break;
        }
      }
      function drawAndor(ctx, o, x, y) {
        const R = 46;
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8; ctx.lineTo(x + 8 + Math.cos(a) * R, y + 10 + Math.sin(a) * R); } ctx.fill();
        ctx.fillStyle = '#4a4e58';
        ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8; ctx.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); } ctx.fill();
        ctx.fillStyle = '#7e8492';
        ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8; ctx.lineTo(x + Math.cos(a) * (R - 4), y + Math.sin(a) * (R - 4)); } ctx.fill();
        // panel lines
        ctx.fillStyle = '#5a5e68';
        for (let i = -R + 8; i < R - 6; i += 8) { ctx.fillRect(x - R + 8, y + i, (R - 8) * 2, 1); }
        ctx.fillStyle = '#a8aebc'; ctx.fillRect(x - 3, y - R + 4, 6, (R - 4) * 2); ctx.fillRect(x - R + 4, y - 3, (R - 4) * 2, 6);
        // hatches (Bragza)
        for (let i = 0; i < 4; i++) {
          const hx = x + HATCH[i][0], hy = y + HATCH[i][1];
          if (o.hatch[i] && o.core) { disc(ctx, hx, hy, 5, '#303038'); disc(ctx, hx, hy, 3, (frame >> 4) & 1 ? '#e02020' : '#801010'); }
          else { disc(ctx, hx, hy, 5, '#201810'); }
        }
        // core (Algo)
        if (o.core) {
          disc(ctx, x, y, 8, '#303038');
          disc(ctx, x, y, 6, ((frame >> 3) & 1) ? '#ff2020' : '#ff9020');
          disc(ctx, x - 1, y - 2, 2, '#ffffff');
        } else {
          disc(ctx, x, y, 9, '#201810'); disc(ctx, x, y, 5, ((frame >> 2) & 1) ? '#603010' : '#301808');
        }
      }
      function drawAir(ctx, e) {
        const x = Math.round(e.x), y = Math.round(e.y);
        switch (e.type) {
          case 'toroid': {
            const w = Math.max(1, Math.abs(Math.cos(e.t / 5)) * 7);
            ctx.fillStyle = '#c8ccd8'; ctx.beginPath(); ctx.ellipse(x, y, w, 7, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#6a6e80'; ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.5, w * 0.45), 3.5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 6, 1, 2);
            break;
          }
          case 'torkan': ctx.drawImage(TORKAN, x - 5, y - 3); break;
          case 'zoshi':
            ctx.save(); ctx.translate(x, y); ctx.rotate(e.a);
            ctx.fillStyle = '#6a6e7a'; ctx.fillRect(-7, -2, 14, 4); ctx.fillRect(-2, -7, 4, 14);
            ctx.fillStyle = '#c0c4d0'; ctx.fillRect(-6, -1, 12, 1); ctx.fillRect(-1, -6, 1, 12);
            ctx.restore();
            ctx.fillStyle = '#ff3030'; ctx.fillRect(x - 1, y - 1, 2, 2);
            break;
          case 'jara': ctx.drawImage(JARA, x - 5, y - 2); break;
          case 'terrazi': ctx.drawImage(TERRAZI, x - 5, y - 3); break;
          case 'bacura': {
            const h = Math.max(1, Math.round(Math.abs(Math.sin(e.t / 12)) * 10));
            ctx.fillStyle = '#e0e4ee'; ctx.fillRect(x - 9, y - (h >> 1), 18, h);
            ctx.fillStyle = '#5a5e6a'; ctx.fillRect(x - 9, y - (h >> 1) + (h >> 1), 18, 1);
            if (h > 4) { ctx.fillStyle = '#8890a0'; ctx.fillRect(x - 6, y - (h >> 1) + 1, 12, 1); }
            break;
          }
          case 'zakato': case 'brag': {
            const a = Math.min(1, e.t / 12, (80 - e.t) / 10);
            ctx.globalAlpha = Math.max(0.1, a);
            disc(ctx, x, y, 6, '#202024'); ctx.fillStyle = e.type === 'brag' ? '#40c0ff' : '#e02020'; ctx.fillRect(x - 6, y - 1, 12, 2);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 3, y - 4, 2, 1);
            ctx.globalAlpha = 1;
            break;
          }
        }
      }
      function drawBoom(ctx, b, sy) {
        const T = b.big ? 48 : 28, f = b.t / T, r = (b.big ? 16 : 9) * Math.sqrt(f) + 2;
        const cols = ['#ffffff', '#ffff60', '#ff9020', '#e02010', '#602010'];
        const c = cols[Math.min(4, (f * 5) | 0)];
        for (let k = 0; k < 10; k++) {
          const a = k * Math.PI / 5 + b.t * 0.05;
          const rr = r * (k & 1 ? 0.6 : 1);
          ctx.fillStyle = c; ctx.fillRect(Math.round(b.x + Math.cos(a) * rr) - 1, Math.round(sy + Math.sin(a) * rr) - 1, 2, 2);
        }
        if (f < 0.4) disc(ctx, b.x, sy, r * 0.6, f < 0.2 ? '#ffffff' : '#ffc040');
      }
      function drawSight(ctx, x, y, on) {
        x = Math.round(x); y = Math.round(y);
        const col = on ? ((frame >> 2) & 1 ? '#ff2020' : '#ffffff') : '#7090ff';
        ctx.fillStyle = col;
        ctx.fillRect(x - 6, y - 6, 4, 1); ctx.fillRect(x - 6, y - 6, 1, 4);
        ctx.fillRect(x + 3, y - 6, 4, 1); ctx.fillRect(x + 6, y - 6, 1, 4);
        ctx.fillRect(x - 6, y + 6, 4, 1); ctx.fillRect(x - 6, y + 3, 1, 4);
        ctx.fillRect(x + 3, y + 6, 4, 1); ctx.fillRect(x + 6, y + 3, 1, 4);
        if (on) ctx.fillRect(x - 1, y - 1, 2, 2);
      }
      function hud(ctx) {
        text(ctx, '1UP', 16, 2, '#ff3030');
        text(ctx, String(g ? g.score : 0).padStart(7, ' '), 8, 11, '#ffffff');
        text(ctx, 'HIGH SCORE', W / 2 + 28, 2, '#ff3030', { center: true });
        text(ctx, String(hi).padStart(7, ' '), W / 2 + 4, 11, '#ffffff');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        const fy = Math.floor(AREA_LEN - g.d);
        ctx.drawImage(g.map, 0, fy, W, H, 0, 0, W, H);
        for (const o of g.gnd) if (o.type === 'crater') drawGround(ctx, o, o.gy - fy);
        for (const o of g.gnd) if (o.alive && o.type !== 'crater') { const sy = o.gy - fy; if (sy > -60 && sy < H + 60) drawGround(ctx, o, sy); }
        for (const b of g.booms) if (b.ground) drawBoom(ctx, b, b.y);
        const p = g.p;
        if (g.bomb) {
          const b = g.bomb, f = b.t / b.T, ty = b.tgy - fy;
          const bx = b.x0 + (b.tx - b.x0) * f, by = b.y0 + (ty - b.y0) * f;
          const s = Math.max(1, Math.round(3 - f * 2));
          ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(bx) - s, Math.round(by) - s, s * 2, s * 2);
          ctx.fillStyle = '#ff3030'; ctx.fillRect(Math.round(bx) - 1, Math.round(by) - 1, 1, 1);
        }
        if (p.alive && g.phase !== 'over') {
          drawSight(ctx, p.x, p.y - 84, g.phase === 'play' && sightTarget());
          ctx.drawImage(SHADOW, Math.round(p.x) - 4, Math.round(p.y) + 10);
          ctx.drawImage(SOLVALOU, Math.round(p.x) - 7, Math.round(p.y) - 7);
        }
        for (const e of g.air) drawAir(ctx, e);
        for (const b of g.pb) { ctx.fillStyle = '#ffffa0'; ctx.fillRect(Math.round(b.x), Math.round(b.y), 1, 5); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(b.x), Math.round(b.y), 1, 2); }
        for (const b of g.eb) {
          const on = (frame >> 2) & 1;
          ctx.fillStyle = on ? '#ffffff' : '#ff4040';
          ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 2, 2, 4); ctx.fillRect(Math.round(b.x) - 2, Math.round(b.y) - 1, 4, 2);
        }
        for (const b of g.booms) if (!b.ground) drawBoom(ctx, b, b.y);
        for (const q of g.pops) text(ctx, q.n, q.x, Math.round(q.y - (60 - q.t) * 0.3), '#ffffff', { center: true });
        hud(ctx);
        // lives
        for (let i = 0; i < Math.min(6, g.lives); i++) ctx.drawImage(SOLVALOU, 4 + i * 16, H - 17);
        text(ctx, 'AREA ' + g.area, W - 4, H - 10, '#c0c0c0', { right: true });
        if (g.msgT > 0 && ((g.msgT >> 3) & 1)) text(ctx, g.msg, W / 2, 120, '#ffff60', { center: true });
        if (g.phase === 'ready') text(ctx, 'READY', W / 2, 140, '#ffffff', { center: true });
        if (g.phase === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(40, 124, W - 80, 30);
          text(ctx, 'GAME OVER', W / 2, 135, '#ff3030', { center: true });
        }
      }
      function renderTitle(ctx) {
        const fy = Math.floor(AREA_LEN - demo.d);
        ctx.drawImage(demo.map, 0, fy, W, H, 0, 0, W, H);
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
        hud(ctx);
        const page = (titleT / 480 | 0) % 2;
        // logo with metallic bands
        const ly = 44;
        text(ctx, 'XEVIOUS', W / 2 + 2, ly + 2, '#202030', { center: true, scale: 4 });
        const bands = [[0, 7, '#ffffff'], [7, 14, '#c8ccd8'], [14, 21, '#8a90a0'], [21, 28, '#d0d4e0']];
        for (const [a, b, c] of bands) { ctx.save(); ctx.beginPath(); ctx.rect(0, ly + a, W, b - a); ctx.clip(); text(ctx, 'XEVIOUS', W / 2, ly, c, { center: true, scale: 4 }); ctx.restore(); }
        ctx.fillStyle = '#e02020'; ctx.fillRect(28, ly + 32, W - 56, 2);
        if (page === 0) {
          ctx.drawImage(SOLVALOU, W / 2 - 7, 92);
          text(ctx, 'SOLVALOU', W / 2, 112, '#c8ccd8', { center: true });
          text(ctx, 'ZAPPER  - AIR TARGETS', W / 2, 132, '#ffffff', { center: true });
          text(ctx, 'BLASTER - GROUND TARGETS', W / 2, 144, '#ffffff', { center: true });
          text(ctx, 'BOMB WHERE THE SIGHT', W / 2, 162, '#a0c0ff', { center: true });
          text(ctx, 'FLASHES RED', W / 2, 172, '#a0c0ff', { center: true });
          text(ctx, 'BONUS 20000 AND 60000', W / 2, 192, '#ffff60', { center: true });
          text(ctx, 'EVERY 60000 PTS', W / 2, 202, '#ffff60', { center: true });
        } else {
          text(ctx, '- SCORE TABLE -', W / 2, 86, '#ffff60', { center: true });
          const rows = [['toroid', 'TOROID', 30], ['torkan', 'TORKAN', 50], ['zoshi', 'ZOSHI', 70], ['jara', 'JARA', 150], ['zakato', 'ZAKATO', 100], ['terrazi', 'TERRAZI', 700]];
          rows.forEach((r, i) => {
            const y = 102 + i * 14;
            drawAir(ctx, { type: r[0], x: 40, y: y + 3, t: titleT + 40, a: titleT / 8 });
            text(ctx, r[1], 58, y, '#ffffff'); text(ctx, r[2], 150, y, '#ffffff', { right: true });
          });
          const gr = [['logram', 'LOGRAM', 300], ['derota', 'DEROTA', 1000], ['sol', 'SOL', 2000]];
          gr.forEach((r, i) => {
            const y = 190 + i * 16;
            drawGround(ctx, { type: r[0], x: 40, state: 'up', h: 14, open: 0 }, y + 4 + (r[0] === 'sol' ? 4 : 0));
            text(ctx, r[1], 58, y, '#ffffff'); text(ctx, r[2], 150, y, '#ffffff', { right: true });
          });
          text(ctx, 'ANDOR GENESIS CORE 4000', W / 2, 238, '#ff8040', { center: true });
        }
        if (api.credits === 0 || coinFlash > 0) { if (coinFlash > 0 ? (coinFlash >> 2) & 1 : (frame >> 5) & 1) text(ctx, 'INSERT COIN', W / 2, 252, '#ff3030', { center: true }); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START BUTTON', W / 2, 252, '#ffffff', { center: true });
        text(ctx, '\u00a9 1982 NAMCO', W / 2, 266, '#c0c0c0', { center: true });
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 9, '#ffffff');
      }
      return { update, render, destroy() { } };
    }
  });
})();
