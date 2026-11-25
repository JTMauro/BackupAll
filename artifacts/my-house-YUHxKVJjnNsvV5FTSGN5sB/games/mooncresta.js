// Moon Cresta (Nichibutsu, 1980) \u2014 from-scratch recreation: three-stage rocket, docking, Cold Eyes, Super Flies, Atomic Piles, Meteors, Four-D.
(function () {
  'use strict';
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
    ':': '000C0C000C0C00', '/': '00010204081000', '"': '0A0A0000000000', "'": '04040000000000',
    '?': '0E110102040004', '@': '0E11171517100E', '#': '0A0A1F0A1F0A0A', '\u00a9': '0E11171417110E',
    '(': '02040808080402', ')': '08040202020408', ',': '000000000C0408', '=': '00001F001F0000',
    '>': '08040201020408', '<': '02040810080402', '&': '0C12140815120D', '*': '0004150E150400',
    '+': '0004041F040400', '%': '18190204081303'
  };
  const FONT = {};
  for (const k in FONT_HEX) { const s = FONT_HEX[k]; const a = []; for (let i = 0; i < 7; i++) a.push(parseInt(s.substr(i * 2, 2), 16) || 0); FONT[k] = a; }
  // text(ctx, str, x, y, colour, {scale, adv, center, right, bold})
  function text(ctx, s, x, y, col, o) {
    o = o || {}; const sc = o.scale || 1, adv = (o.adv || 8) * sc, bw = o.bold === false ? 1 : 2;
    s = String(s).toUpperCase();
    const w = s.length * adv - (adv - (4 + bw) * sc);
    if (o.center) x = Math.round(x - w / 2); else if (o.right) x = Math.round(x - w);
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) { const b = g[r]; if (!b) continue; for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + i * adv + c * sc, y + r * sc, bw * sc - (bw - 1) * (sc - 1), sc); }
    }
  }
  const D3 = ['75557', '26227', '71747', '71717', '55711', '74717', '74757', '71111', '75757', '75717'];
  function tinyNum(ctx, n, cx, cy, col) {
    const s = String(n); const w = s.length * 4 - 1; let x = Math.round(cx - w / 2); ctx.fillStyle = col;
    for (const ch of s) { const g = D3[+ch]; if (g) for (let r = 0; r < 5; r++) { const b = parseInt(g[r], 16); for (let c = 0; c < 3; c++) if (b & (4 >> c)) ctx.fillRect(x + c, cy - 2 + r, 1, 1); } x += 4; }
  }
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  // sprite from rows of chars; pal maps char -> colour ('.' or unmapped = transparent)
  function sprite(rows, pal) {
    const h = rows.length, w = Math.max.apply(null, rows.map(r => r.length)), cv = mkCanvas(w, h), c = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) { const p = pal[rows[y][x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } }
    return cv;
  }
  const flipRows = rows => rows.map(r => r.split('').reverse().join(''));
  const vflipRows = rows => rows.slice().reverse();
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const irnd = n => Math.floor(Math.random() * n);
  const pick = a => a[irnd(a.length)];
  const pad = (n, l) => String(n).padStart(l, '0');
  // coin-op helper: start with a credit or flash INSERT COIN
  function makeCoin(api) {
    let flash = 0, last = api.credits;
    return {
      tick() {
        if (flash > 0) flash = api.credits > 0 ? 0 : flash - 1;
        if (api.credits > last) api.audio.tone(1800, 0.06, { type: 'square', vol: 0.08, slideTo: 2400 });
        last = api.credits;
      },
      tryStart() {
        if (api.useCredit()) { last = api.credits; return true; }
        flash = 90; api.audio.tone(98, 0.28, { type: 'square', vol: 0.14 });
        return false;
      },
      // draws PUSH START / INSERT COIN centred at cx,y and CREDIT nn at cx2,y2
      draw(ctx, cx, y, col, frame) {
        const blink = (frame >> 4) & 1;
        if (flash > 0) { if ((flash >> 2) & 1) text(ctx, 'INSERT COIN', cx, y, '#ff4040', { center: true }); }
        else if (api.credits <= 0) { if (blink) text(ctx, 'INSERT COIN', cx, y, col, { center: true }); }
        else if (blink) text(ctx, 'PUSH START', cx, y, col, { center: true });
      },
      credit(ctx, x, y, col) { text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), x, y, col); }
    };
  }
  // looping background tune (frame-driven)
  function makeMusic(api) {
    let notes = null, opts = null, len = 0, t = 0, on = false;
    return {
      play(n, o) { notes = n; opts = o || {}; len = n.reduce((s, x) => s + x[1], 0); t = 0; on = true; api.audio.melody(notes, opts); },
      stop() { on = false; },
      tick() { if (!on) return; t += 1 / 60; if (t >= len) { t -= len; api.audio.melody(notes, opts); } },
      get on() { return on; }
    };
  }
  // particle bursts
  function burst(list, x, y, cols, n, sp) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = (sp || 1.5) * (0.3 + Math.random()); list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 20 + irnd(20), c: pick(cols) }); }
  }
  function stepParts(list) { for (let i = list.length - 1; i >= 0; i--) { const p = list[i]; p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; if (--p.t <= 0) list.splice(i, 1); } }
  function drawParts(ctx, list, ox) { ox = ox || 0; for (const p of list) { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x - ox), Math.round(p.y), p.t > 10 ? 2 : 1, p.t > 10 ? 2 : 1); } }
  // ===================== Moon Cresta =====================
  const W = 224, H = 256, PY = 236;
  const STAGE_ART = {
    1: ['...w...', '...w...', '..www..', '..wrw..', '..wrw..', '..www..', '.wwbww.', '.wbbbw.', '.wwbww.', 'wwwwwww', 'wrwwwrw', 'wrw.wrw', 'ww...ww', 'w.....w', 'o.....o', '.......'],
    2: ['...y.........y.', '...y.........y.', '..yyy.......yyy', '..yyy.wwwww.yyy', '..yyywwrrrwwyyy', '.yyyywwwwwwwyyy', 'yyyyywwbwwwyyyy', 'yyrryyybyyyrryy', 'yyrryyyyyyyrryy', 'yy..yyyyyyy..yy', 'y....o...o....y', '...............'],
    3: ['..r...................r', '..r...................r', '.rrr.................rr', '.rrr...ccccccccc.....rr', '.rrr.ccwwwwwwwwwcc...rr', 'rrrrrccwwbbbbbwwccrrrrr', 'rrrrrcwwwwwwwwwwwcrrrrr', 'rrwwrrrrrrrrrrrrrrrwwrr', 'rrwwrr.rrrrrrrrr.rrwwrr', 'rr..rr..rr...rr..rr..rr', 'r....o..o.....o..o....r', '.......................']
  };
  const SPAL = { w: '#ffffff', r: '#ff3030', b: '#3060ff', y: '#ffe030', c: '#30e0ff', o: '#ff9020', g: '#40ff40', p: '#d040ff', k: '#000000', m: '#a0a0a0', d: '#606060', l: '#ffb0b0' };
  const STAGE_W = { 1: 7, 2: 15, 3: 23 }, STAGE_H = { 1: 16, 2: 12, 3: 12 };
  const EART = {
    coldeye: [['....rrrr....', '..rrrrrrrr..', '.rrooooooor.', '.roowwwwoor.', 'rroowbbwoorr', 'rrowbkkbworr', 'rrowbkkbworr', 'rroowbbwoorr', '.roowwwwoor.', '.rrooooooor.', '..rrrrrrrr..', '.r..r..r..r.'],
      ['....rrrr....', '..rrrrrrrr..', '.rrooooooor.', '.roooooooor.', 'rroooooooorr', 'rrowwwwwworr', 'rrooooooooor', 'rroooooooorr', '.roooooooor.', '.rrooooooor.', '..rrrrrrrr..', 'r..r..r..r..']],
    superfly: [['gg..........gg', 'ggg........ggg', '.ggg..pp..ggg.', '..gggpwwpggg..', '...ppwkkwpp...', '..ggppppppgg..', '.ggg.pppp.ggg.', 'gg...p..p...gg', '....p....p....', '..............'],
      ['..............', '..............', 'gggg..pp..gggg', 'ggggppwwppgggg', '.ggppwkkwppgg..', '...pppppppp...', '..gg.pppp.gg..', '.gg..p..p..gg.', '....p....p....', '..............']],
    atomic: [['....y..y....', '..y.oyyo.y..', '...oorroo...', '.yorrwwrroy.', '..orwwwwro..', 'yorrwwwwrroy', '.yorwwwwroy.', '..orrwwrro..', '.yoorrrroy..', '...oo..oo...', '..y..yy..y..', '............'],
      ['..y......y..', '...yoyyoy...', '.yoorrrroo..', '..orrwwrroy.', 'yorwwwwwwroy', '.orrwwwwrro.', '.orrwwwwrro.', 'yorrwwwwrroy', '..oorrrroo..', '.y.oooooo.y.', '....y..y....', '............']],
    small: [['..y..y..', '.yoooy..', 'yorrroy.', '.orwwro.', '.orwwroy', 'yorrro..', '..ooy...', '.y..y...'], ['.y....y.', '..oyyo..', '.orrrro.', 'yorwwroy', '.orwwro.', '.orrrroy', '..oooo..', 'y..y....']],
    meteor: [['....mmmmm.....', '..mmmmmmmmm...', '.mmdmmmmmmmm..', '.mmddmmmdmmmm.', 'mmmmmmmmddmmm.', 'mmmmmmmmmmmmmm', 'mmdmmmmmmmmmmm', 'mmddmmmmmdmmmm', '.mmmmmmmmddmm.', '.mmmmdmmmmmmm.', '..mmmddmmmmm..', '...mmmmmmmm...', '.....mmmm.....'],
      ['.....mmmm.....', '...mmmmmmmm...', '..mmmmmmdmmm..', '.mmmdmmmddmmm.', '.mmmddmmmmmmmm', 'mmmmmmmmmmmmmm', 'mmmmmmmdmmmmmm', 'mmmmmmmddmmmmm', '.mmdmmmmmmmmm.', '.mmddmmmmmmmm.', '..mmmmmmmdmm..', '...mmmmmmmm...', '....mmmmm.....']],
    fourd: [['.....pp.....', '....pwwp....', '...pwccwp...', 'p.pwc..cwp.p', 'pppc....cppp', '.pc..ww..cp.', '.pc..ww..cp.', 'pppc....cppp', 'p.pwc..cwp.p', '...pwccwp...', '....pwwp....', '.....pp.....'],
      ['p..........p', '.pp......pp.', '.pwp....pwp.', '..pwc..cwp..', '...cc..cc...', '.....ww.....', '.....ww.....', '...cc..cc...', '..pwc..cwp..', '.pwp....pwp.', '.pp......pp.', 'p..........p']]
  };
  const WAVES = ['coldeye', 'coldeye', 'superfly', 'superfly', 'dock', 'atomic', 'atomic', 'meteor', 'fourd', 'dock'];
  const WAVE_N = { coldeye: 16, superfly: 16, atomic: 10, meteor: 22, fourd: 12 };
  const WAVE_MAX = { coldeye: 6, superfly: 6, atomic: 4, meteor: 5, fourd: 4 };
  const PTS = { coldeye: 30, superfly: 50, atomic: 80, small: 40, meteor: 100, fourd: 150 };

  ArcadeRegistry.register({
    id: 'mooncresta', title: 'Moon Cresta', year: 1980, maker: 'Nichibutsu',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Left/Right: move \u00b7 Space: fire / thrust when docking \u00b7 Enter: start',
    marquee: { bg: '#000010', fg: '#ff3030', accent: '#30e0ff' },
    create(api) {
      const A = api.audio, coin = makeCoin(api);
      const SS = {}; for (const k in STAGE_ART) SS[k] = sprite(STAGE_ART[k], SPAL);
      const ES = {}; for (const k in EART) ES[k] = EART[k].map(f => sprite(f, SPAL));
      const stars = []; for (let i = 0; i < 70; i++) stars.push({ x: irnd(W), y: irnd(H), s: 0.3 + Math.random() * 1.2, c: pick(['#ffffff', '#ffe030', '#30e0ff', '#ff6060', '#a0a0ff']) });

      let hi = api.getHiScore(20000);
      let state = 'title', T = 0, score = 0, wave = 0, loop = 0, owned, cur, px = 112, shots = [], enemies = [], parts = [], popups = [];
      let toSpawn = 0, spawnT = 0, dock = null, fireCD = 0, deadT = 0, demo = false, wreck = [], waveMsg = 0;

      const mult = () => 1 + loop * 0.25 + Math.min(0.3, wave * 0.03);
      const waveType = () => WAVES[wave % WAVES.length];
      function addScore(v) { if (demo) return; score += v; if (score > hi) hi = score; }

      // ------------ ship geometry ------------
      // sections stacked top (smallest number) to bottom; returns [{n,x,y,w,h}]
      function sections(stack, cx, bottom) {
        const out = []; let y = bottom;
        const ord = stack.slice().sort((a, b) => b - a);
        for (const n of ord) { y -= STAGE_H[n]; out.push({ n, x: Math.round(cx - STAGE_W[n] / 2), y, w: STAGE_W[n], h: STAGE_H[n] }); }
        return out;
      }
      function shipTop() { const s = sections(cur, px, PY); return s.length ? s[s.length - 1].y : PY; }

      function newGame() {
        score = 0; wave = 0; loop = 0; owned = [1, 2, 3]; cur = [1]; px = 112; shots = []; enemies = []; parts = []; popups = []; wreck = [];
        startWave(); state = 'play';
      }
      function startWave() {
        const t = waveType();
        enemies = []; shots = [];
        if (t === 'dock') {
          const reserve = owned.filter(n => cur.indexOf(n) < 0 && n > Math.max.apply(null, cur));
          if (!reserve.length) { wave++; startWave(); return; }
          dock = { n: reserve[0], x: 112, sx: 40 + irnd(144), y: 50, vy: 0.3, T: 0, res: null, rt: 0 };
          state = 'dock'; T = 0;
          A.melody([[392, .12], [523, .12], [659, .12], [784, .25], [659, .12], [784, .4]], { type: 'square', vol: 0.1 });
          return;
        }
        toSpawn = WAVE_N[t] + Math.min(8, loop * 3); spawnT = 60; waveMsg = 90;
        state = 'play';
      }
      function spawnEnemy(t) {
        const m = mult();
        const side = Math.random() < 0.5 ? -1 : 1;
        const e = { t, x: side < 0 ? -10 : W + 10, y: 30 + irnd(40), vx: 0, vy: 0, T: 0, mode: 'enter', hp: 1, ax: 30 + irnd(164), ay: 40 + irnd(80), ph: Math.random() * 6, cool: 60 + irnd(160), size: 12 };
        if (t === 'coldeye') { e.vx = -side * 1.4 * m; e.vy = 0.6; }
        if (t === 'superfly') { e.x = 20 + irnd(184); e.y = -10; e.tx = 20 + irnd(184); e.ty = 40 + irnd(90); e.mode = 'dash'; }
        if (t === 'atomic') { e.x = 20 + irnd(184); e.y = -10; e.vx = (Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random() * 0.6) * m; e.vy = (0.8 + Math.random() * 0.4) * m; e.mode = 'bounce'; }
        if (t === 'meteor') { e.x = 10 + irnd(204); e.y = -14; e.vx = (Math.random() - 0.5) * 0.6; e.vy = (1 + Math.random() * 1.1) * m; e.hp = 2; e.size = 14; e.mode = 'fall'; }
        if (t === 'fourd') { e.x = 20 + irnd(184); e.y = 30 + irnd(110); e.mode = 'appear'; }
        enemies.push(e);
      }

      // ------------ enemy behaviours ------------
      function aimAt(e, tx, ty, sp, k) {
        const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
        e.vx += (dx / d * sp - e.vx) * k; e.vy += (dy / d * sp - e.vy) * k;
      }
      function updEnemy(e) {
        const m = mult(); e.T++;
        switch (e.t) {
          case 'coldeye':
            if (e.mode === 'enter') {
              e.x += e.vx; e.y += e.vy; e.vy += 0.01;
              if (e.T > 40) e.mode = 'hover';
            } else if (e.mode === 'hover') {
              const tx = e.ax + Math.sin(e.T / 30 + e.ph) * 36, ty = e.ay + Math.sin(e.T / 21 + e.ph) * 20;
              aimAt(e, tx, ty, 1.2 * m, 0.08); e.x += e.vx; e.y += e.vy;
              if (--e.cool <= 0 && state === 'play') { e.mode = 'dive'; A.tone(700, 0.4, { type: 'triangle', vol: 0.06, slideTo: 300 }); }
            } else if (e.mode === 'dive') {
              e.vy = Math.min(2.6 * m, e.vy + 0.06); e.vx += clamp((px - e.x) * 0.004, -0.08, 0.08); e.vx = clamp(e.vx, -1.6, 1.6);
              e.x += e.vx; e.y += e.vy;
              if (e.y > H + 12) { e.y = -12; e.mode = 'hover'; e.cool = 80 + irnd(160); e.ay = 40 + irnd(80); }
            }
            break;
          case 'superfly':
            if (e.mode === 'dash') {
              const dx = e.tx - e.x, dy = e.ty - e.y, d = Math.hypot(dx, dy), sp = (e.dive ? 3 : 2.4) * m;
              if (d < sp) { e.x = e.tx; e.y = e.ty; e.mode = 'pause'; e.cool = 8 + irnd(26); }
              else { e.x += dx / d * sp; e.y += dy / d * sp; }
              if (e.y > H + 10) { e.y = -10; e.dive = false; e.tx = 20 + irnd(184); e.ty = 40 + irnd(90); }
            } else {
              if (--e.cool <= 0) {
                e.mode = 'dash';
                if (Math.random() < 0.28 && state === 'play') { e.dive = true; e.tx = px + rnd(-20, 20); e.ty = H + 20; A.tone(1200, 0.25, { type: 'square', vol: 0.04, slideTo: 600 }); }
                else { e.dive = false; e.tx = clamp(e.x + rnd(-70, 70), 10, 214); e.ty = clamp(e.y + rnd(-50, 60), 30, 170); }
              }
            }
            break;
          case 'atomic': case 'small':
            e.x += e.vx; e.y += e.vy;
            if (e.x < 6) { e.x = 6; e.vx = Math.abs(e.vx); } if (e.x > W - 6) { e.x = W - 6; e.vx = -Math.abs(e.vx); }
            if (e.y < 24 && e.T > 30) { e.y = 24; e.vy = Math.abs(e.vy); }
            if (e.y > PY - 8) { e.y = PY - 8; e.vy = -Math.abs(e.vy); }
            if (e.T % 90 === 0) e.vx += clamp((px - e.x) * 0.01, -0.5, 0.5);
            break;
          case 'meteor':
            e.x += e.vx; e.y += e.vy;
            if (e.y > H + 16) e.dead = true;
            break;
          case 'fourd':
            if (e.mode === 'appear') { if (e.T > 40) { e.mode = 'rush'; e.T = 0; e.tx = px; e.ty = PY - 10; const d = Math.hypot(e.tx - e.x, e.ty - e.y) || 1; e.vx = (e.tx - e.x) / d * 2.2 * m; e.vy = (e.ty - e.y) / d * 2.2 * m; A.tone(300, 0.3, { type: 'sawtooth', vol: 0.05, slideTo: 1200 }); } }
            else if (e.mode === 'rush') { e.x += e.vx; e.y += e.vy; if (e.T > 70 || e.y > H + 10) { e.mode = 'vanish'; e.T = 0; } }
            else if (e.mode === 'vanish') { if (e.T > 20) { e.mode = 'appear'; e.T = 0; e.x = 20 + irnd(184); e.y = 30 + irnd(100); } }
            break;
        }
      }
      const eSize = e => e.t === 'small' ? 8 : e.size;
      const solid = e => !(e.t === 'fourd' && (e.mode === 'vanish' || (e.mode === 'appear' && e.T < 16)));

      // ------------ player ------------
      function fire() {
        if (fireCD > 0) return;
        if (shots.some(s => s.y > 140)) return;
        const secs = sections(cur, px, PY);
        for (const s of secs) {
          if (s.n === 1) shots.push({ x: s.x + 3, y: s.y });
          else if (s.n === 2) { shots.push({ x: s.x + 3, y: s.y + 1 }); shots.push({ x: s.x + 13, y: s.y + 1 }); }
          else { shots.push({ x: s.x + 2, y: s.y + 1 }); shots.push({ x: s.x + 22, y: s.y + 1 }); }
        }
        fireCD = 8;
        A.tone(1400, 0.08, { type: 'square', vol: 0.07, slideTo: 300 });
      }
      function killSection(n) {
        owned = owned.filter(x => x !== n); cur = cur.filter(x => x !== n);
        const s = { x: px, y: PY - 8 };
        burst(parts, s.x, s.y, ['#ffffff', '#ff3030', '#ffe030', '#30e0ff'], 30, 2.2);
        A.noise(0.9, { vol: 0.25, freq: 1800, slideTo: 100 });
        A.tone(400, 0.8, { type: 'sawtooth', vol: 0.1, slideTo: 40 });
        if (!cur.length) { state = 'dead'; deadT = 0; }
      }
      function demoMove() {
        // dodge nearest threat, otherwise line up under an enemy
        let tx = px, threat = null, td = 1e9;
        for (const e of enemies) { if (!solid(e)) continue; if (e.y > 150 && Math.abs(e.x - px) < 30 && e.y < td + 200) { threat = e; td = e.y; } }
        if (threat) tx = px + (threat.x < px ? 40 : -40);
        else { let best = null, bd = 1e9; for (const e of enemies) { const d = Math.abs(e.x - px) + (H - e.y) * 0.2; if (d < bd) { bd = d; best = e; } } if (best) tx = best.x; }
        if (Math.abs(tx - px) > 2) px += Math.sign(tx - px) * 1.6;
        if (Math.random() < 0.3) fire();
      }

      function updatePlay() {
        const t = waveType();
        if (waveMsg > 0) waveMsg--;
        if (fireCD > 0) fireCD--;
        if (state === 'play') {
          if (demo) demoMove();
          else {
            if (api.key('ArrowLeft')) px -= 1.7;
            if (api.key('ArrowRight')) px += 1.7;
            if (api.key('Space') || api.key('KeyX') || api.key('ArrowUp')) fire();
          }
          const sw = Math.max.apply(null, cur.map(n => STAGE_W[n]));
          px = clamp(px, sw / 2 + 2, W - sw / 2 - 2);
        }
        // spawn
        if (toSpawn > 0 && --spawnT <= 0 && enemies.length < WAVE_MAX[t]) {
          const grp = t === 'coldeye' || t === 'superfly' ? 2 : 1;
          for (let i = 0; i < grp && toSpawn > 0; i++) { spawnEnemy(t); toSpawn--; }
          spawnT = t === 'meteor' ? 30 + irnd(30) : 40;
        }
        for (const e of enemies) updEnemy(e);
        // shots
        for (const s of shots) s.y -= 6;
        shots = shots.filter(s => s.y > 16 && !s.dead);
        for (const s of shots) {
          for (const e of enemies) {
            if (e.dead || !solid(e)) continue;
            const r = eSize(e) / 2 + 1;
            if (Math.abs(s.x - e.x) < r && s.y < e.y + r && s.y > e.y - r - 6) {
              s.dead = true;
              if (--e.hp > 0) { A.tone(200, 0.05, { type: 'square', vol: 0.1 }); e.flash = 6; break; }
              e.dead = true;
              let v = PTS[e.t]; if (e.mode === 'dive' || e.dive || e.mode === 'rush') v *= 2;
              addScore(v); popups.push({ x: e.x, y: e.y, v, t: 40 });
              burst(parts, e.x, e.y, e.t === 'meteor' ? ['#a0a0a0', '#606060', '#ffffff'] : ['#ffffff', '#ffe030', '#ff9020', '#ff3030'], 14);
              A.noise(0.25, { vol: 0.16, freq: 3000, slideTo: 200 });
              if (e.t === 'atomic') for (const d of [-1, 1]) enemies.push({ t: 'small', x: e.x, y: e.y, vx: d * 1.4 * mult(), vy: -1.2, T: 0, hp: 1, size: 8, mode: 'bounce' });
              break;
            }
          }
        }
        shots = shots.filter(s => !s.dead);
        // collisions with ship
        if (state === 'play') {
          const secs = sections(cur, px, PY);
          for (const e of enemies) {
            if (e.dead || !solid(e)) continue;
            const r = eSize(e) / 2 - 1;
            for (const s of secs) {
              if (e.x + r > s.x + 1 && e.x - r < s.x + s.w - 1 && e.y + r > s.y + 1 && e.y - r < s.y + s.h - 1) {
                e.dead = true; burst(parts, e.x, e.y, ['#ffe030', '#ffffff'], 8);
                if (!demo) killSection(s.n); else burst(parts, px, PY - 8, ['#ffffff'], 6);
                break;
              }
            }
            if (state !== 'play') break;
          }
        }
        enemies = enemies.filter(e => !e.dead);
        // wave complete
        if (toSpawn === 0 && enemies.length === 0 && state === 'play') {
          wave++; if (wave % WAVES.length === 0) loop++;
          if (demo && wave >= 3) { state = 'title'; T = 0; return; }
          addScore(0);
          state = 'wavegap'; T = 0;
        }
      }
      function updateDock() {
        const d = dock; d.T++;
        if (d.res) {
          d.rt++;
          if (d.rt > 150) { dock = null; wave++; if (wave % WAVES.length === 0) loop++; startWave(); }
          return;
        }
        // descend
        const thrust = demo ? (d.vy > 0.45) : (api.key('Space') || api.key('KeyX') || api.key('ArrowUp'));
        d.vy += thrust ? -0.03 : 0.012; d.vy = clamp(d.vy, -0.4, 1.4);
        if (demo) d.sx += clamp(d.x - d.sx, -0.5, 0.5);
        else { if (api.key('ArrowLeft')) d.sx -= 0.6; if (api.key('ArrowRight')) d.sx += 0.6; }
        d.sx = clamp(d.sx, 14, W - 14);
        d.y = Math.max(40, d.y + d.vy);
        const tgtTop = PY - STAGE_H[d.n];
        if (d.y >= tgtTop) {
          const dx = Math.abs(d.sx - d.x);
          if (dx <= 2.5 && d.vy <= 0.9) {
            d.res = 'ok'; cur = cur.concat([d.n]); px = d.x;
            const bonus = Math.max(1000, 5000 - Math.floor(d.T / 60) * 300); d.bonus = bonus; addScore(bonus);
            A.melody([[523, .08], [659, .08], [784, .08], [1047, .08], [784, .08], [1047, .08], [1319, .3]], { type: 'square', vol: 0.12 });
          } else {
            d.res = 'fail'; owned = owned.filter(x => x !== d.n);
            burst(parts, d.x, PY - 6, ['#ffffff', '#ff3030', '#ffe030'], 30, 2);
            A.noise(0.8, { vol: 0.25, freq: 1500, slideTo: 100 });
            px = d.sx;
          }
          d.y = tgtTop;
        }
        if (d.T > 60 * 30 && !d.res) { d.res = 'time'; px = d.sx; }
      }

      function update() {
        coin.tick(); T++;
        for (const s of stars) { s.y += s.s * (state === 'dock' ? 0.3 : 1); if (s.y > H) { s.y = 0; s.x = irnd(W); } }
        stepParts(parts);
        for (let i = popups.length - 1; i >= 0; i--) if (--popups[i].t <= 0) popups.splice(i, 1);
        if (state === 'title') {
          if (api.anyPressed('Enter', 'Space')) { if (coin.tryStart()) { demo = false; newGame(); playStart(); } }
          else if (T > 720) { demo = true; newGame(); }
          return;
        }
        if (demo && (api.anyPressed('Enter', 'Space') || T > 2400)) { demo = false; state = 'title'; T = 0; return; }
        if (state === 'play') { bgHum(); updatePlay(); }
        else if (state === 'dock') updateDock();
        else if (state === 'wavegap') { updatePlay(); if (T > 90) startWave(); }
        else if (state === 'dead') {
          updatePlay(); deadT++;
          if (deadT > 150) {
            if (owned.length) { cur = [Math.min.apply(null, owned)]; px = 112; state = 'play'; enemies.forEach(e => { if (e.y > 140) e.y = -12; }); waveMsg = 60; }
            else {
              const over = () => { state = 'over'; T = 0; api.setHiScore(score); };
              state = 'hold';
              if (api.offerContinue && !demo) api.offerContinue(() => { owned = [1, 2, 3]; cur = [1]; px = 112; state = 'play'; enemies = []; }, over);
              else over();
            }
          }
        } else if (state === 'over') {
          if (T > 240 || (T > 60 && api.anyPressed('Enter', 'Space'))) { state = 'title'; T = 0; }
        }
      }
      let humT = 0;
      function bgHum() { if (--humT > 0) return; humT = 32; A.tone(140, 0.45, { type: 'triangle', vol: 0.05, slideTo: 90 }); }
      function playStart() { A.melody([[330, .1], [392, .1], [523, .1], [392, .1], [523, .1], [659, .1], [523, .1], [659, .1], [784, .4]], { type: 'square', vol: 0.1 }); }

      // ------------ drawing ------------
      function drawStars(ctx) { for (const s of stars) { if ((api.frame + s.x) % 40 < 3) continue; ctx.fillStyle = s.c; ctx.fillRect(s.x | 0, s.y | 0, 1, 1); } }
      function drawShip(ctx, stack, cx, bottom) { for (const s of sections(stack, cx, bottom)) ctx.drawImage(SS[s.n], s.x, s.y); }
      function drawEnemy(ctx, e) {
        if (e.t === 'fourd' && e.mode === 'vanish' && (e.T & 2)) return;
        if (e.t === 'fourd' && e.mode === 'appear' && e.T < 16 && (e.T & 2)) return;
        const fr = ES[e.t][(e.T >> 3) & 1], s = eSize(e);
        if (e.flash > 0) { e.flash--; if (e.flash & 1) return; }
        ctx.drawImage(fr, Math.round(e.x - s / 2), Math.round(e.y - s / 2));
      }
      function drawHUD(ctx) {
        text(ctx, '1UP', 16, 2, '#ff3030'); text(ctx, pad(score, 6), 8, 11, '#ffffff');
        text(ctx, 'HI-SCORE', 112, 2, '#ff3030', { center: true }); text(ctx, pad(hi, 6), 112, 11, '#ffffff', { center: true });
        if (state !== 'title') {
          // reserve stages + wave flags
          let x = 4;
          for (const n of owned) if (cur.indexOf(n) < 0 && !(dock && dock.n === n && dock.res !== 'fail')) { ctx.drawImage(SS[n], x, H - 13); x += STAGE_W[n] + 2; }
          for (let i = 0; i <= Math.min(wave, 12); i++) { ctx.fillStyle = '#ff3030'; ctx.fillRect(W - 6 - i * 5, H - 10, 3, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(W - 6 - i * 5, H - 10, 1, 9); }
        }
      }
      function renderTitle(ctx) {
        // moon
        ctx.fillStyle = '#c8c8a0'; ctx.beginPath(); ctx.arc(170, 70, 26, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#a0a080'; ctx.beginPath(); ctx.arc(162, 64, 6, 0, Math.PI * 2); ctx.arc(180, 80, 4, 0, Math.PI * 2); ctx.fill();
        text(ctx, 'MOON CRESTA', 112, 40, '#ffe030', { center: true, scale: 2 });
        drawShip(ctx, [1, 2, 3], 56, 112);
        text(ctx, '- SCORE -', 112, 126, '#30e0ff', { center: true });
        const rows = [['coldeye', 'COLD EYE', 30], ['superfly', 'SUPER FLY', 50], ['atomic', 'ATOMIC PILE', 80], ['meteor', 'METEOR', 100], ['fourd', 'FOUR-D', 150]];
        rows.forEach((r, i) => { ctx.drawImage(ES[r[0]][(api.frame >> 4) & 1], 30, 138 + i * 15); text(ctx, r[1], 50, 140 + i * 15, '#ffffff'); text(ctx, String(r[2]), 196, 140 + i * 15, '#ffe030', { right: true }); });
        text(ctx, 'DIVING X2  DOCKING BONUS', 112, 216, '#ff9020', { center: true, adv: 7, bold: false });
        coin.draw(ctx, 112, 228, '#ffffff', api.frame);
        text(ctx, '\u00a9 1980 NICHIBUTSU', 112, 242, '#a0a0ff', { center: true, adv: 7, bold: false });
        coin.credit(ctx, 4, 232 + 16, '#808080');
      }
      function render(ctx) {
        ctx.fillStyle = '#000008'; ctx.fillRect(0, 0, W, H);
        drawStars(ctx);
        if (state === 'title') { drawHUD(ctx); renderTitle(ctx); return; }
        for (const e of enemies) drawEnemy(ctx, e);
        ctx.fillStyle = '#ffffff'; for (const s of shots) ctx.fillRect(s.x, Math.round(s.y), 1, 5);
        if (state === 'dock' && dock) {
          const d = dock;
          // guide beam
          if (!d.res) { ctx.fillStyle = 'rgba(48,224,255,0.25)'; ctx.fillRect(d.x - 1, d.y + 8, 2, PY - d.y - 20); }
          if (d.res !== 'fail') ctx.drawImage(SS[d.n], Math.round(d.x - STAGE_W[d.n] / 2), PY - STAGE_H[d.n]);
          if (d.res === 'ok') drawShip(ctx, cur, px, PY);
          else drawShip(ctx, cur, d.sx, Math.round(d.y));
          text(ctx, 'DOCKING', 112, 100, (api.frame >> 3) & 1 ? '#30e0ff' : '#ffffff', { center: true, scale: 2 });
          if (!d.res) { text(ctx, 'SPEED ' + (d.vy > 0.9 ? 'HIGH' : 'OK'), 112, 124, d.vy > 0.9 ? '#ff3030' : '#40ff40', { center: true }); text(ctx, 'TIME ' + Math.max(0, 30 - Math.floor(d.T / 60)), 112, 136, '#ffffff', { center: true }); }
          if (d.res === 'ok') text(ctx, 'BONUS ' + d.bonus, 112, 136, '#ffe030', { center: true });
          if (d.res === 'fail') text(ctx, 'DOCKING FAILED', 112, 136, '#ff3030', { center: true });
          if (d.res === 'time') text(ctx, 'TIME OUT', 112, 136, '#ff3030', { center: true });
        } else if (state === 'play' || state === 'wavegap') {
          drawShip(ctx, cur, px, PY);
        }
        drawParts(ctx, parts);
        for (const p of popups) tinyNum(ctx, p.v, p.x, Math.round(p.y - (40 - p.t) * 0.3), '#30e0ff');
        drawHUD(ctx);
        if (waveMsg > 0 && state === 'play' && ((waveMsg >> 3) & 1)) text(ctx, 'WAVE ' + (wave + 1), 112, 120, '#ffffff', { center: true });
        if (state === 'over') text(ctx, 'GAME OVER', 112, 120, '#ff3030', { center: true, scale: 2 });
        if (demo) { text(ctx, 'DEMO PLAY', 112, 100, '#ffe030', { center: true }); coin.draw(ctx, 112, 140, '#ffffff', api.frame); }
      }
      if (api.debugHook) api.debugHook({ sum: () => ({ state, score, wave, loop, owned, cur, en: enemies.length, toSpawn }), px: () => px, enemies: () => enemies, dock: () => dock });
      return { update, render };
    }
  });
})();
