// Carnival (Sega/Gremlin, 1980) \u2014 from-scratch recreation: shooting gallery with owls, rabbits, ducks, pipes and the bear bonus.
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
  // ===================== Carnival =====================
  const W = 224, H = 256;
  const ROWY = [62, 94, 126];             // target row tops
  const PW = 240;                          // row path length (screen + 16 offscreen)
  const PATH = PW * 3;
  const SLOT = 16;
  const GUNY = 222, AMMOY = 246;
  const PIPEY = 38;

  const ART = {
    owl: ['.o........o.', '.oo......oo.', '.oooooooooo.', 'oowwwoowwwoo', 'owwkwoowkwwo', 'owwwwyywwwwo', 'oowwoyyowwoo', '.oooooooooo.', '.occoooocco.', '.oocccccco..', '..oooooooo..', '...y....y...'],
    owl2: ['.o........o.', '.oo......oo.', '.oooooooooo.', 'oowwwoowwwoo', 'owkwwoowwkwo', 'owwwwyywwwwo', 'oowwoyyowwoo', '.oooooooooo.', 'ooccoooocco.', 'o.oocccccco.', '..oooooooo..', '..y......y..'],
    rab: ['..w...w.....', '..wp..wp....', '..wp..wp....', '...w..w.....', '...wwwww....', '..wwkwwkw...', '..wwwwpww...', '...wwwww.ww.', '..wwwwwwwww.', '.wwwwwwwwww.', '.wwwwwwwww..', '..ww....ww..'],
    rab2: ['...w...w....', '...wp..wp...', '..wp..wp....', '...w..w.....', '...wwwww....', '..wwkwwkw...', '..wwwwpww...', '...wwwww.ww.', '..wwwwwwwww.', '.wwwwwwwwww.', '..wwwwwwww..', '.ww......ww.'],
    duck: ['....yyy.....', '...yyyyy....', '...yykyy....', '.oooyyyy....', '..oo.yy.....', '....yyyyy..y', '..yyyyyyyyyy', '.yyywwwwyyy.', '.yyyywwwyyy.', '..yyyyyyyy..', '....o..o....', '...oo.oo....'],
    duck2: ['....yyy.....', '...yyyyy....', '...yykyy....', '.oooyyyy....', '..oo.yy.....', '....yyyyy...', '..yyyyyyyyyy', '.yyyyyyyyyyy', '.yyywwwwyyy.', '..yyyywwyy..', '.....oo.....', '....oo.oo...'],
    fly: ['yy........yy', 'yyy......yyy', '.yyy.yy.yyy.', '..yyyyyyyy..', '...yykyyy...', '..ooyyyy....', '..o.yyyy....', '.....yy.....'],
    fly2: ['............', '............', '.....yy.....', '.yyyyyyyyyy.', 'yyy.yky.yyy.', 'yy.ooyyy..yy', '..o.yyyy....', '.....yy.....'],
    gun: ['.....bb.....', '.....bb.....', '.....bb.....', '.....bb.....', '....bbbb....', '....bwwb....', '...bbbbbb...', '..rrrrrrrr..', '.rrwrrrrwrr.', 'rrrrrrrrrrrr', 'rrrrrrrrrrrr', '.oo......oo.', 'oooo....oooo', '.oo......oo.'],
    bear: ['...bb....bb.....', '..bbbb..bbbb....', '..bbbbbbbbbb....', '..bbwkbbwkbb....', '..bbbbbbbbbb....', '...bbbnnbbb.....', '....bbkkbb......', '...bbbbbbbbbbb..', '..bbbbbbbbbbbbbb', '.bbbbbbbbbbbbbbb', 'bbbbbbbbbbbbbbbb', 'bbbbbbbbbbbbbbbb', '.bbbbbbbbbbbbbb.', '..bbb..bbb..bbb.', '..bbb..bbb..bbb.', '.bbbb.bbbb.bbbb.'],
    bear2: ['...bb....bb.....', '..bbbb..bbbb....', '..bbbbbbbbbb....', '..bbwkbbwkbb....', '..bbbbbbbbbb....', '...bbbnnbbb.....', '....bbkkbb......', '...bbbbbbbbbbb..', '..bbbbbbbbbbbbbb', '.bbbbbbbbbbbbbbb', 'bbbbbbbbbbbbbbbb', 'bbbbbbbbbbbbbbbb', '.bbbbbbbbbbbbbb.', '..bbbb...bbbb...', '.bbbb.....bbbb..', 'bbbb.......bbbb.'],
    bearUp: ['....b.....b.....', '...bbb...bbb....', '...bbbbbbbbb....', '...bwkbbbwkb..b.', '...bbbbbbbbb.bb.', '..b.bbnnbbb.bb..', '.bb..bkkbb.bb...', '.bbb.bbbbbbb....', '..bbbbbbbbbb....', '....bbbbbbbb....', '....bbbbbbbb....', '....bbbbbbbb....', '....bbbbbbbb....', '....bbb..bbb....', '....bbb..bbb....', '...bbbb..bbbb...'],
    pipe: ['.ww.', 'wwww', '.ww.', '.ww.', '.ww.', '.ww.', '.ww.', '.ww.', 'wwww'],
    bullet: ['y', 'y', 'o', 'o']
  };
  const PAL = { o: '#c87830', w: '#ffffff', k: '#000000', y: '#ffe030', c: '#ffd8a0', p: '#ff80b0', b: '#a8a8a8', r: '#d02020', n: '#202020' };

  ArcadeRegistry.register({
    id: 'carnival', title: 'Carnival', year: 1980, maker: 'Sega/Gremlin',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Left/Right: move gun \u00b7 Space: fire \u00b7 Enter: start',
    marquee: { bg: '#200818', fg: '#ffe030', accent: '#ff3060' },
    create(api) {
      const A = api.audio, coin = makeCoin(api), music = makeMusic(api);
      const SPR = {};
      for (const k in ART) SPR[k] = sprite(ART[k], PAL);
      SPR.bearL = sprite(flipRows(ART.bear), PAL); SPR.bear2L = sprite(flipRows(ART.bear2), PAL);
      SPR.flyR = sprite(flipRows(ART.fly), PAL); SPR.fly2R = sprite(flipRows(ART.fly2), PAL);
      SPR.duckL = sprite(flipRows(ART.duck), PAL); SPR.duck2L = sprite(flipRows(ART.duck2), PAL);
      SPR.owlL = SPR.owl; SPR.rabL = sprite(flipRows(ART.rab), PAL); SPR.rab2L = sprite(flipRows(ART.rab2), PAL);
      const POINTS = { owl: 40, rab: 30, duck: 20 };

      let hi = api.getHiScore(5000);
      let state = 'title', T = 0, score = 0, round = 1, ammo = 40, items = [], fliers = [], pipes = [], pipeX = 0;
      let bullet = null, gunX = 106, bonus = 200, popups = [], parts = [], bear = null, tally = 0, bonusGiven = false;
      let demo = false, demoT = 0, pipeAward = 0, hitStreak = 0;

      // ---------------- music: a carnival waltz ----------------
      const n = { G3: 196, A3: 220, B3: 247, C4: 262, D4: 294, E4: 330, Fs4: 370, G4: 392, A4: 440, B4: 494, C5: 523, D5: 587, E5: 659, Fs5: 740, G5: 784 };
      const q = 0.19;
      const WALTZ = [[n.D4, q], [n.G4, q * 2], [n.B4, q], [n.D5, q * 2], [n.D5, q], [n.E5, q], [n.D5, q], [n.B4, q], [n.C5, q * 3],
        [n.C5, q], [n.A4, q * 2], [n.C5, q], [n.E5, q * 2], [n.E5, q], [n.Fs5, q], [n.E5, q], [n.C5, q], [n.B4, q * 3],
        [n.D4, q], [n.G4, q * 2], [n.B4, q], [n.D5, q * 2], [n.G5, q], [n.Fs5, q], [n.E5, q], [n.D5, q], [n.C5, q * 3],
        [n.A4, q], [n.Fs4, q * 2], [n.A4, q], [n.D5, q], [n.C5, q], [n.A4, q], [n.G4, q * 3], [0, q * 3]];
      function startMusic() { music.play(WALTZ, { type: 'triangle', vol: 0.07 }); }

      function sfxShot() { A.tone(1500, 0.06, { type: 'square', vol: 0.08, slideTo: 500 }); }
      function sfxHit() { A.tone(900, 0.05, { type: 'square', vol: 0.12 }); A.tone(1350, 0.08, { type: 'square', vol: 0.1, delay: 0.05 }); }
      function sfxClank() { A.tone(2200, 0.05, { type: 'square', vol: 0.08 }); A.noise(0.05, { vol: 0.08, freq: 5000 }); }
      function sfxEat() { for (let i = 0; i < 5; i++) A.tone(300 - i * 30, 0.05, { type: 'square', vol: 0.12, delay: i * 0.06 }); }
      function sfxBonus() { A.melody([[784, .07], [988, .07], [1175, .07], [1568, .2]], { type: 'square', vol: 0.1 }); }

      // ---------------- round setup ----------------
      function setupRound() {
        items = []; fliers = []; bullet = null; popups = []; bonusGiven = false;
        const specials = { 7: 'p10', 22: 'p5', 37: 'p5', 30: 'up' };
        for (let s = 0; s < PATH / SLOT; s++) {
          const row = Math.floor(s * SLOT / PW), local = (s * SLOT) % PW;
          let type = row === 0 ? 'owl' : row === 1 ? 'rab' : 'duck';
          if (specials[s]) type = specials[s];
          else if (local >= 224 || s % 5 === 4) continue;  // gaps
          if (round >= 3 && type === 'up') type = 'p5';
          items.push({ p: s * SLOT, type, hit: 0 });
        }
        pipes = []; for (let i = 0; i < 8; i++) pipes.push({ on: true, fall: 0 });
        pipeX = 0;
        bonus = Math.min(990, 100 + round * 100);
      }
      function startGame() {
        score = 0; round = 1; ammo = 40; gunX = 106; parts = []; demo = false;
        setupRound(); state = 'play'; T = 0; startMusic();
      }
      function startDemo() { demo = true; score = 0; round = 1; ammo = 40; setupRound(); state = 'play'; T = 0; demoT = 0; }
      const speed = () => (0.45 + Math.min(1.1, (round - 1) * 0.12)) * (items.filter(isAnimal).length < 6 ? 1.35 : 1);
      const isAnimal = it => it.type === 'owl' || it.type === 'rab' || it.type === 'duck';
      function itemPos(it) {
        const row = Math.floor(it.p / PW), local = it.p % PW;
        const x = row === 1 ? 224 - local : local - 16;
        return { row, x, y: ROWY[row], dir: row === 1 ? -1 : 1 };
      }
      function addScore(v) { if (demo) return; score += v; if (score > hi) hi = score; }
      function pop(x, y, v) { popups.push({ x, y, v, t: 50 }); }

      function fire() {
        if (bullet || ammo <= 0) return;
        if (state === 'play') ammo--;
        bullet = { x: gunX + 6, y: GUNY - 2 };
        sfxShot();
      }

      function autoAim() {
        let best = null, bd = 1e9;
        for (const it of items) { if (!isAnimal(it) || it.hit) continue; const p = itemPos(it); const lead = p.x + 6 + p.dir * speed() * (GUNY - p.y) / 6; const d = Math.abs(lead - gunX - 6) + p.row * 20; if (lead > 8 && lead < 214 && d < bd) { bd = d; best = lead; } }
        for (const f of fliers) { const d = Math.abs(f.x + 6 - gunX - 6) - 40; if (d < bd) { bd = d; best = f.x + 6; } }
        if (state === 'bear' && bear) best = bear.x + 8 + bear.dir * bear.sp * 18;
        return best;
      }
      function updateGun() {
        let mv = 0;
        if (demo) {
          // demo gun: chase the nearest animal about to pass overhead
          const best = autoAim();
          if (best != null) { mv = Math.sign(best - gunX - 6); if (Math.abs(best - gunX - 6) < 3) fire(); }
        } else {
          if (api.key('ArrowLeft')) mv = -1;
          if (api.key('ArrowRight')) mv = 1;
          if (api.pressed('Space') || api.pressed('KeyX') || api.pressed('ArrowUp')) fire();
        }
        gunX = clamp(gunX + mv * 1.6, 4, W - 16);
      }

      function hitTest(bx, by) {
        // flying ducks
        for (let i = 0; i < fliers.length; i++) {
          const f = fliers[i];
          if (Math.abs(bx - (f.x + 6)) < 7 && by > f.y - 2 && by < f.y + 10) {
            fliers.splice(i, 1); addScore(100 * Math.min(5, round)); pop(f.x + 6, f.y, 100 * Math.min(5, round)); burst(parts, f.x + 6, f.y + 4, ['#ffe030', '#ffffff'], 10); sfxHit(); return true;
          }
        }
        // conveyor targets
        for (const it of items) {
          if (it.hit) continue;
          const p = itemPos(it);
          if (by >= p.y && by <= p.y + 12 && bx >= p.x && bx <= p.x + 11) {
            it.hit = 1;
            if (isAnimal(it)) {
              const v = POINTS[it.type]; addScore(v); pop(p.x + 6, p.y + 4, v); bonus = Math.min(9990, bonus + 10); sfxHit();
              burst(parts, p.x + 6, p.y + 6, ['#ffffff', '#ffe030', '#ff8040'], 8);
            } else if (it.type === 'p5' || it.type === 'p10') {
              const k = it.type === 'p5' ? 5 : 10; if (!demo) ammo = Math.min(99, ammo + k); pop(p.x + 6, p.y + 4, k); sfxBonus();
            } else if (it.type === 'up') {
              // reverse the direction of the whole conveyor for a moment
              addScore(150); pop(p.x + 6, p.y + 4, 150); sfxBonus(); reverseT = 240;
            }
            return true;
          }
        }
        // pipes
        if (by >= PIPEY && by <= PIPEY + 9) {
          for (let i = 0; i < 8; i++) {
            const pp = pipes[i]; if (!pp.on) continue;
            const x = pipeLocalX(i);
            if (bx >= x - 1 && bx <= x + 4) {
              pp.on = false; pp.fall = 1; addScore(10 + 10 * Math.min(round, 9)); sfxClank();
              if (pipes.every(q => !q.on) && !bonusGiven) { bonusGiven = true; addScore(bonus); pipeAward = 150; sfxBonus(); pop(112, 26, bonus); }
              return true;
            }
          }
        }
        return false;
      }
      let reverseT = 0;
      function pipeLocalX(i) { return ((i * 28 + pipeX) % 224 + 224) % 224; }

      function updatePlay() {
        updateGun();
        // conveyor
        const sp = speed() * (reverseT > 0 ? -0.6 : 1);
        if (reverseT > 0) reverseT--;
        for (const it of items) {
          it.p = ((it.p + sp) % PATH + PATH) % PATH;
          if (it.hit) it.hit++;
        }
        items = items.filter(it => it.hit < 18);
        // ducks leave the bottom row and dive for the ammo
        const dRate = 0.0012 + round * 0.0006;
        if (fliers.length < 1 + Math.min(3, round >> 1)) {
          for (const it of items) {
            if (it.type !== 'duck' || it.hit) continue;
            const p = itemPos(it);
            if (p.row === 2 && p.x > 20 && p.x < 190 && Math.random() < dRate) {
              it.hit = 99; // remove
              fliers.push({ x: p.x, y: p.y, vx: p.x < gunX ? 0.5 : -0.5, vy: 0.45 + Math.min(0.6, round * 0.05), t: 0 });
              A.tone(500, 0.12, { type: 'square', vol: 0.08, slideTo: 900 });
              break;
            }
          }
        }
        for (let i = fliers.length - 1; i >= 0; i--) {
          const f = fliers[i]; f.t++;
          f.x += f.vx + Math.sin(f.t / 12) * 0.6; f.y += f.vy;
          if (f.t % 40 === 0) f.vx = clamp((gunX - f.x) * 0.02, -0.9, 0.9);
          f.x = clamp(f.x, 0, W - 12);
          if (f.y >= AMMOY - 8) {
            fliers.splice(i, 1);
            if (!demo) { const eaten = Math.min(ammo, 4 + Math.min(4, round >> 1)); ammo -= eaten; pop(f.x + 6, AMMOY - 14, eaten); }
            sfxEat(); burst(parts, f.x + 6, AMMOY - 4, ['#ffe030'], 8);
          }
        }
        // pipes rotate
        pipeX -= 0.5 + Math.min(1, round * 0.08);
        for (const pp of pipes) if (pp.fall) pp.fall++;
        if (pipeAward > 0) pipeAward--;
        // bullet
        if (bullet) {
          for (let s = 0; s < 3 && bullet; s++) {
            bullet.y -= 2;
            if (hitTest(bullet.x, bullet.y)) bullet = null;
            else if (bullet.y < 30) bullet = null;
          }
        }
        stepParts(parts);
        for (let i = popups.length - 1; i >= 0; i--) if (--popups[i].t <= 0) popups.splice(i, 1);
        // round over?
        if (!items.some(it => isAnimal(it) && !it.hit) && fliers.length === 0) {
          if (demo) { state = 'title'; T = 0; return; }
          state = 'clear'; T = 0; tally = 0; music.stop();
          A.melody([[523, .1], [659, .1], [784, .1], [1047, .1], [784, .1], [1047, .3]], { type: 'square', vol: 0.1 });
          return;
        }
        if (ammo <= 0 && !bullet) {
          if (demo) { state = 'title'; T = 0; return; }
          state = 'out'; T = 0; music.stop();
          A.melody([[392, .2], [370, .2], [349, .2], [330, .5]], { type: 'square', vol: 0.12 });
        }
      }

      function startBear() {
        state = 'bear'; T = 0; bullet = null; fliers = [];
        bear = { x: -20, dir: 1, sp: 0.6 + round * 0.05, hits: 0, up: 0, anim: 0, done: false };
        A.melody([[262, .15], [330, .15], [392, .15], [330, .15], [262, .3]], { type: 'triangle', vol: 0.12 });
      }
      function updateBear() {
        updateGun();
        const b = bear;
        if (b.up > 0) b.up--;
        else { b.x += b.dir * b.sp; b.anim++; }
        if (bullet) {
          for (let s = 0; s < 3 && bullet; s++) {
            bullet.y -= 2;
            if (b.up === 0 && bullet.x >= b.x && bullet.x <= b.x + 16 && bullet.y >= 118 && bullet.y <= 134) {
              bullet = null; b.hits++; b.up = 16; b.dir = -b.dir; b.sp = Math.min(3, b.sp * 1.2 + 0.1);
              const v = 50 * b.hits; addScore(v); pop(b.x + 8, 112, v);
              A.tone(150, 0.15, { type: 'sawtooth', vol: 0.14, slideTo: 90 });
            } else if (bullet.y < 30) bullet = null;
          }
        }
        if (bullet === null && state === 'bear') ammo = Math.max(ammo, 1);
        stepParts(parts);
        for (let i = popups.length - 1; i >= 0; i--) if (--popups[i].t <= 0) popups.splice(i, 1);
        if (b.x < -24 || b.x > W + 8) {
          state = 'roundmsg'; T = 0;
          round++; setupRound();
        }
      }

      function update() {
        coin.tick(); T++;
        if (state === 'title') {
          if (api.anyPressed('Enter', 'Space')) { if (coin.tryStart()) startGame(); }
          else if (T > 900) startDemo();
          return;
        }
        if (demo) {
          demoT++; music.tick();
          if (api.anyPressed('Enter', 'Space') || demoT > 1800) { demo = false; state = 'title'; T = 0; return; }
          updatePlay(); return;
        }
        music.tick();
        if (state === 'play') updatePlay();
        else if (state === 'clear') {
          // count leftover bullets: 10 points each
          if (T > 40 && T % 4 === 0 && ammo > 0) { ammo--; tally++; addScore(10); A.tone(1200, 0.03, { type: 'square', vol: 0.07 }); }
          if (T > 60 && ammo === 0 && T > 120) { ammo = 0; startBear(); }
        } else if (state === 'bear') updateBear();
        else if (state === 'roundmsg') {
          if (T === 1) ammo = 40;
          if (T > 120) { state = 'play'; T = 0; startMusic(); }
        } else if (state === 'out') {
          if (T === 90) {
            const over = () => { state = 'over'; T = 0; api.setHiScore(score); };
            if (api.offerContinue) api.offerContinue(() => { ammo = 40; state = 'play'; T = 0; startMusic(); }, over);
            else over();
          }
        } else if (state === 'over') {
          if (T > 240 || (T > 60 && api.anyPressed('Enter', 'Space'))) { state = 'title'; T = 0; }
        }
      }

      // ---------------- drawing ----------------
      function drawBooth(ctx) {
        ctx.fillStyle = '#100418'; ctx.fillRect(0, 0, W, H);
        // awning
        for (let i = 0; i < 14; i++) { ctx.fillStyle = i % 2 ? '#ffffff' : '#e02040'; ctx.fillRect(i * 16, 18, 16, 10); }
        ctx.fillStyle = '#e02040'; for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc(i * 16 + 8, 28, 8, 0, Math.PI); ctx.fill(); ctx.fillStyle = i % 2 ? '#e02040' : '#ffffff'; }
        // shelves for each row
        for (let r = 0; r < 3; r++) {
          ctx.fillStyle = '#6a3a10'; ctx.fillRect(0, ROWY[r] + 13, W, 3);
          ctx.fillStyle = '#a06020'; ctx.fillRect(0, ROWY[r] + 13, W, 1);
        }
        // pipe rail
        ctx.fillStyle = '#404070'; ctx.fillRect(0, PIPEY + 9, W, 2);
        // counter
        ctx.fillStyle = '#3a1a08'; ctx.fillRect(0, 150, W, 4);
        ctx.fillStyle = '#5a2a10'; ctx.fillRect(0, 154, W, 2);
        // posts
        ctx.fillStyle = '#c0a040'; ctx.fillRect(0, 28, 3, 128); ctx.fillRect(W - 3, 28, 3, 128);
        // gun track
        ctx.fillStyle = '#303030'; ctx.fillRect(0, GUNY + 14, W, 2);
      }
      function drawHUD(ctx) {
        text(ctx, 'SCORE', 4, 1, '#ff4060'); text(ctx, pad(score, 6), 52, 1, '#ffffff');
        text(ctx, 'HI', 130, 1, '#ff4060'); text(ctx, pad(hi, 6), 152, 1, '#ffffff');
        text(ctx, 'R' + round, 4, 10, '#80c0ff', { bold: false });
        // bonus box
        ctx.fillStyle = pipeAward && ((pipeAward >> 3) & 1) ? '#ffe030' : '#2040a0'; ctx.fillRect(84, 9, 56, 9);
        text(ctx, 'BONUS ' + bonus, 112, 10, '#ffffff', { center: true, adv: 6, bold: false });
      }
      function drawAmmo(ctx) {
        ctx.fillStyle = '#ffe030';
        const shown = Math.min(ammo, 50);
        for (let i = 0; i < shown; i++) { const x = 4 + (i % 50) * 4; ctx.fillStyle = '#ffe030'; ctx.fillRect(x, AMMOY, 2, 3); ctx.fillStyle = '#c87830'; ctx.fillRect(x, AMMOY + 3, 2, 3); }
        if (ammo > 50) text(ctx, '+' + (ammo - 50), 206, AMMOY, '#ffe030', { bold: false, adv: 6 });
      }
      function drawItems(ctx) {
        const af = (api.frame >> 4) & 1;
        for (const it of items) {
          const p = itemPos(it);
          if (p.x < -14 || p.x > W + 2) continue;
          if (it.hit) {
            // flipped-down target
            const k = Math.max(1, 12 - it.hit);
            ctx.fillStyle = '#806040'; ctx.fillRect(Math.round(p.x), p.y + 12 - k, 12, k);
            continue;
          }
          const x = Math.round(p.x), y = p.y;
          if (it.type === 'owl') ctx.drawImage(af ? SPR.owl2 : SPR.owl, x, y);
          else if (it.type === 'rab') ctx.drawImage(p.dir < 0 ? (af ? SPR.rab2L : SPR.rabL) : (af ? SPR.rab2 : SPR.rab), x, y);
          else if (it.type === 'duck') ctx.drawImage(p.dir < 0 ? (af ? SPR.duck2L : SPR.duckL) : (af ? SPR.duck2 : SPR.duck), x, y);
          else {
            ctx.fillStyle = it.type === 'up' ? '#40c040' : '#2050ff'; ctx.fillRect(x, y + 1, 12, 11);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y + 1, 12, 1); ctx.fillRect(x, y + 11, 12, 1);
            if (it.type === 'up') text(ctx, '<>', x + 1, y + 3, '#ffffff', { adv: 6, bold: false });
            else tinyNum(ctx, it.type === 'p5' ? 5 : 10, x + 7, y + 6, '#ffe030'), ctx.fillRect(x + 1, y + 6, 3, 1), ctx.fillRect(x + 2, y + 5, 1, 3);
          }
        }
      }
      function drawPipes(ctx) {
        for (let i = 0; i < 8; i++) {
          const pp = pipes[i], x = Math.round(pipeLocalX(i));
          if (pp.on) ctx.drawImage(SPR.pipe, x, PIPEY);
          else if (pp.fall && pp.fall < 20) { ctx.globalAlpha = 1 - pp.fall / 20; ctx.drawImage(SPR.pipe, x, PIPEY + pp.fall); ctx.globalAlpha = 1; }
        }
      }
      function drawGun(ctx) { ctx.drawImage(SPR.gun, Math.round(gunX), GUNY); }
      function drawBullet(ctx) { if (bullet) { ctx.fillStyle = '#ffffff'; ctx.fillRect(bullet.x - 1, Math.round(bullet.y), 2, 5); } }
      function drawPopups(ctx) { for (const p of popups) tinyNum(ctx, p.v, p.x, Math.round(p.y - (50 - p.t) * 0.2), '#ffffff'); }

      function renderTitle(ctx) {
        drawBooth(ctx); drawHUD(ctx);
        ctx.fillStyle = '#100418'; ctx.fillRect(12, 34, 200, 160);
        ctx.strokeStyle = '#ffe030'; ctx.lineWidth = 1; ctx.strokeRect(12.5, 34.5, 199, 159);
        const cols = ['#ff3060', '#ffe030', '#30c0ff', '#40e040', '#ff8020', '#ff60ff', '#ffffff', '#ff3060'];
        const word = 'CARNIVAL';
        for (let i = 0; i < word.length; i++) text(ctx, word[i], 30 + i * 22, 44 + Math.round(Math.sin(api.frame / 10 + i) * 2), cols[(i + (api.frame >> 3)) % 8], { scale: 2 });
        text(ctx, '- SCORE TABLE -', 112, 70, '#ffffff', { center: true });
        ctx.drawImage(SPR.owl, 50, 84); text(ctx, '40 PTS', 72, 86, '#ffe030');
        ctx.drawImage(SPR.rab, 50, 100); text(ctx, '30 PTS', 72, 102, '#ffe030');
        ctx.drawImage(SPR.duck, 50, 116); text(ctx, '20 PTS', 72, 118, '#ffe030');
        ctx.drawImage(SPR.fly, 50, 134); text(ctx, 'EATS BULLETS!', 72, 134, '#ff8060');
        ctx.drawImage(SPR.pipe, 54, 148); text(ctx, 'ALL 8 = BONUS', 72, 150, '#80c0ff');
        ctx.fillStyle = '#2050ff'; ctx.fillRect(50, 164, 12, 11); tinyNum(ctx, 10, 57, 169, '#ffe030');
        text(ctx, 'EXTRA BULLETS', 72, 166, '#80ff80');
        text(ctx, 'NO AMMO = GAME OVER', 112, 182, '#ff6060', { center: true, adv: 7 });
        coin.draw(ctx, 112, 204, '#ffffff', api.frame);
        text(ctx, '\u00a9 1980 SEGA/GREMLIN', 112, 228, '#c0a040', { center: true, adv: 7 });
        coin.credit(ctx, 4, 247, '#a0a0a0');
      }

      function render(ctx) {
        if (state === 'title') { renderTitle(ctx); return; }
        drawBooth(ctx); drawHUD(ctx);
        if (state === 'bear' || (state === 'roundmsg')) {
          if (state === 'bear' && bear) {
            const b = bear, x = Math.round(b.x);
            const s = b.up ? SPR.bearUp : (b.dir > 0 ? ((b.anim >> 3) & 1 ? SPR.bear2 : SPR.bear) : ((b.anim >> 3) & 1 ? SPR.bear2L : SPR.bearL));
            ctx.drawImage(s, x, 118);
            text(ctx, 'BEAR BONUS', 112, 70, '#ffe030', { center: true });
            text(ctx, 'HITS ' + b.hits, 112, 86, '#ffffff', { center: true });
          } else {
            text(ctx, 'ROUND ' + round, 112, 90, '#ffe030', { center: true, scale: 2 });
            text(ctx, 'GET READY', 112, 120, '#ffffff', { center: true });
          }
        } else {
          drawPipes(ctx); drawItems(ctx);
          for (const f of fliers) { const fr = (f.t >> 3) & 1; const right = f.vx > 0; ctx.drawImage(right ? (fr ? SPR.fly2R : SPR.flyR) : (fr ? SPR.fly2 : SPR.fly), Math.round(f.x), Math.round(f.y)); }
        }
        drawBullet(ctx); drawGun(ctx); if (state !== "bear") drawAmmo(ctx); drawParts(ctx, parts); drawPopups(ctx);
        if (state === 'clear') { text(ctx, 'ROUND CLEAR!', 112, 100, '#ffe030', { center: true }); text(ctx, 'BULLETS ' + tally + ' X 10', 112, 116, '#ffffff', { center: true }); }
        if (state === 'out') text(ctx, 'OUT OF BULLETS', 112, 100, '#ff4040', { center: true });
        if (state === 'over') { ctx.fillStyle = '#000'; ctx.fillRect(56, 96, 112, 24); text(ctx, 'GAME OVER', 112, 104, '#ff4040', { center: true }); }
        if (demo) { text(ctx, 'DEMO', 112, 170, '#ffffff', { center: true }); coin.draw(ctx, 112, 186, '#ffe030', api.frame); }
        if (state === 'play' && T < 90 && !demo && ((T >> 3) & 1)) text(ctx, 'ROUND ' + round, 112, 170, '#ffffff', { center: true });
      }
      if (api.debugHook) api.debugHook({ sum: () => ({ state, score, round, ammo, left: items.filter(i => isAnimal(i) && !i.hit).length, fl: fliers.length }), aim: () => autoAim(), gun: () => gunX + 6 });
      return { update, render, destroy() { music.stop(); } };
    }
  });
})();
