// Pengo (Sega, 1982) \u2014 procedural recreation for the MAME32 Game Room.
// Push ice blocks to crush the Sno-Bees, smash their eggs, shake the walls to stun them
// and line up the three diamond blocks for a big bonus.
(function () {
  'use strict';
  const W = 224, H = 288, NC = 13, NR = 15, CS = 16, FX = 8, FY = 24;

  // ================= Bitmap font (5x7 in 8px cells) =================
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
    '!': '04040404040004', '-': '0000001F000000', '.': '00000000000C0C', ':': '000C0C000C0C00',
    '/': '00010204081000', "'": '04040000000000', '?': '0E110102040004', '\u00a9': '0E11171417110E',
    '(': '02040808080402', ')': '08040202020408', ',': '000000000C0408', '=': '00001F001F0000',
    '>': '08040201020408', '<': '02040810080402', '*': '0004150E150400', '+': '0004041F040400'
  };
  const FONT = {};
  for (const k in FONT_HEX) { const s = FONT_HEX[k], a = []; for (let i = 0; i < 7; i++) a.push(parseInt(s.substr(i * 2, 2), 16) || 0); FONT[k] = a; }
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  const gcache = {};
  function glyph(ch, col) {
    const k = col + ch; let g = gcache[k];
    if (!g) {
      g = mk(5, 7); const c = g.getContext('2d'); c.fillStyle = col; const a = FONT[ch];
      for (let r = 0; r < 7; r++) for (let x = 0; x < 5; x++) if (a[r] & (16 >> x)) c.fillRect(x, r, 1, 1);
      gcache[k] = g;
    }
    return g;
  }
  function txt(ctx, s, x, y, col) {
    s = String(s).toUpperCase();
    for (let i = 0; i < s.length; i++) { const ch = s[i]; if (FONT[ch]) ctx.drawImage(glyph(ch, col), x + i * 8, y); }
  }
  const ctr = (ctx, s, y, col) => txt(ctx, s, Math.round((W - String(s).length * 8) / 2) + 1, y, col);
  function bigTxt(ctx, s, x, y, col, sc, shade) {
    s = String(s).toUpperCase();
    for (let i = 0; i < s.length; i++) {
      const a = FONT[s[i]]; if (!a) continue;
      for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (a[r] & (16 >> c)) {
        if (shade) { ctx.fillStyle = shade; ctx.fillRect(x + (i * 6 + c) * sc + 1, y + r * sc + 1, sc, sc); }
        ctx.fillStyle = col; ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
  }
  const D3 = ['75557', '26227', '71747', '71717', '55711', '74717', '74757', '71111', '75757', '75717'];
  function tinyNum(ctx, n, cx, cy, col) {
    const s = String(n), w = s.length * 4 - 1; let x = Math.round(cx - w / 2); ctx.fillStyle = col;
    for (const ch of s) { const g = D3[+ch]; for (let r = 0; r < 5; r++) { const b = parseInt(g[r], 16); for (let c = 0; c < 3; c++) if (b & (4 >> c)) ctx.fillRect(x + c, cy + r, 1, 1); } x += 4; }
  }
  function spr(rows, pal) {
    const h = rows.length, w = rows[0].length, cv = mk(w, h), c = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = pal[rows[y][x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } }
    return cv;
  }
  const flipH = rows => rows.map(r => r.split('').reverse().join(''));

  // ================= Sprites (16x16) =================
  const PAL = { R: '#ff2828', r: '#a01010', W: '#ffffff', K: '#000000', Y: '#ffd000', O: '#ff9000', G: '#40e040', g: '#108010', B: '#2060ff', C: '#80ffff' };
  // Pengo: front (down), back (up), side (right)
  const PENGO_DOWN = [
    ['................', '.....RRRRRR.....', '....RRRRRRRR....', '...RRWWRRWWRR...', '...RRWKRRKWRR...', '...RRRRYYRRRR...', '...RRRYYYYRRR...', '..RRRWWWWWWRRR..',
      '.RRRWWWWWWWWRRR.', '.RR.WWWWWWWW.RR.', '....WWWWWWWW....', '....WWWWWWWW....', '.....RRRRRR.....', '....YYY..YYY....', '...YYYY..YYYY...', '................'],
    ['................', '.....RRRRRR.....', '....RRRRRRRR....', '...RRWWRRWWRR...', '...RRWKRRKWRR...', '...RRRRYYRRRR...', '...RRRYYYYRRR...', '..RRRWWWWWWRRR..',
      '..RRWWWWWWWWRR..', '..RR.WWWWWW.RR..', '....WWWWWWWW....', '....WWWWWWWW....', '.....RRRRRR.....', '.....YY..YY.....', '....YYY..YYY....', '................']];
  const PENGO_UP = [
    ['................', '.....RRRRRR.....', '....RRRRRRRR....', '...RRRRRRRRRR...', '...RRRRRRRRRR...', '...RRRRRRRRRR...', '...RRRRRRRRRR...', '..RRRRRRRRRRRR..',
      '.RRRRRRRRRRRRRR.', '.RR.RRRRRRRR.RR.', '....RRRRRRRR....', '....RRRRRRRR....', '.....RRRRRR.....', '....YYY..YYY....', '...YYYY..YYYY...', '................'],
    ['................', '.....RRRRRR.....', '....RRRRRRRR....', '...RRRRRRRRRR...', '...RRRRRRRRRR...', '...RRRRRRRRRR...', '...RRRRRRRRRR...', '..RRRRRRRRRRRR..',
      '..RRRRRRRRRRRR..', '..RR.RRRRRR.RR..', '....RRRRRRRR....', '....RRRRRRRR....', '.....RRRRRR.....', '.....YY..YY.....', '....YYY..YYY....', '................']];
  const PENGO_SIDE = [
    ['................', '......RRRRR.....', '.....RRRRRRR....', '.....RRRRWWRR...', '.....RRRRWKRR...', '.....RRRRRRRYY..', '.....RRRRRRYYYY.', '....RRRRRRWW....',
      '...RRRRRRWWWW...', '...RRRRRRWWWW...', '....RRRRRWWWW...', '....RRRRRWWW....', '.....RRRRRR.....', '.....YYY.YYY....', '....YYYY..YYY...', '................'],
    ['................', '......RRRRR.....', '.....RRRRRRR....', '.....RRRRWWRR...', '.....RRRRWKRR...', '.....RRRRRRRYY..', '.....RRRRRRYYYY.', '....RRRRRRWW....',
      '...RRRRRRWWWW...', '....RRRRRWWWW...', '....RRRRRWWWW...', '....RRRRRWWW....', '.....RRRRRR.....', '......YYYYY.....', '......YYYYYY....', '................']];
  const PENGO_PUSH = ['................', '......RRRRR.....', '.....RRRRRRR....', '.....RRRRWWRR...', '.....RRRRWKRR...', '.....RRRRRRRYY..', '.....RRRRRRYYYY.', '....RRRRRRWWRRR.',
    '...RRRRRRWWWWRR.', '...RRRRRRWWWW...', '....RRRRRWWWW...', '....RRRRRWWW....', '.....RRRRRR.....', '....YYY..YYY....', '...YYYY...YYY...', '................'];
  const BEE = [
    ['................', '................', '.....GGGGGG.....', '....GGGGGGGG....', '...GGYYGGYYGG...', '...GGYKGGKYGG...', '..GGGGGGGGGGGG..', '..GGGGOOOOGGGG..',
      '..GGGGOOOOGGGG..', '.GGGGGGGGGGGGGG.', '.GgGGGGGGGGGGgG.', '..GGGGGGGGGGGG..', '...GGGGGGGGGG...', '...gg......gg...', '..ggg......ggg..', '................'],
    ['................', '................', '................', '.....GGGGGG.....', '....GGGGGGGG....', '...GGYYGGYYGG...', '...GGYKGGKYGG...', '..GGGGGGGGGGGG..',
      '..GGGGOOOOGGGG..', '.GGGGGOOOOGGGGG.', 'GgGGGGGGGGGGGGgG', '.GGGGGGGGGGGGGG.', '..GGGGGGGGGGGG..', '....gg....gg....', '...ggg....ggg...', '................']];
  const BEE_DIZZY = ['................', '..Y..........Y..', '.....GGGGGG.....', '....GGGGGGGG....', '...GGKGGGGKGG...', '...GKGKGGKGKG...', '..GGGKGGGGKGGG..', '..GGGGGGGGGGGG..',
    '..GGGGGWWGGGGG..', '.GGGGGGGGGGGGGG.', '.GgGGGGGGGGGGgG.', '..GGGGGGGGGGGG..', '...GGGGGGGGGG...', '...gg......gg...', '..ggg......ggg..', '................'];
  const EGG_ART = ['................', '................', '................', '................', '......WWWW......', '.....WWWWWW.....', '....WWWGWWWW....', '....WWWWWWGW....',
    '....WGWWWWWW....', '....WWWWWGWW....', '.....WWWWWW.....', '......WWWW......', '................', '................', '................', '................'];

  const DX = [0, -1, 0, 1], DY = [-1, 0, 1, 0];
  const CRUSH_PTS = [400, 1600, 3200, 6400];

  ArcadeRegistry.register({
    id: 'pengo', title: 'Pengo', year: 1982, maker: 'Sega',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: walk \u00b7 Space or X: push / crush ice (at the wall: shake it) \u00b7 Enter: start',
    marquee: { bg: '#001840', fg: '#40d0ff', accent: '#ff2828' },
    create(api) {
      const A = api.audio;
      const PG = {
        0: PENGO_UP.map(r => spr(r, PAL)), 2: PENGO_DOWN.map(r => spr(r, PAL)),
        3: PENGO_SIDE.map(r => spr(r, PAL)), 1: PENGO_SIDE.map(r => spr(flipH(r), PAL))
      };
      const PUSH = { 3: spr(PENGO_PUSH, PAL), 1: spr(flipH(PENGO_PUSH), PAL), 0: PG[0][0], 2: PG[2][0] };
      const BEE_S = BEE.map(r => spr(r, PAL)), BEE_D = spr(BEE_DIZZY, PAL), EGG_S = spr(EGG_ART, PAL);
      const BEE_HATCH = spr(BEE[0], { ...PAL, G: '#ffffff', g: '#c0c0c0' });
      // ice and diamond blocks
      function blockSprite(kind, flash) {
        const cv = mk(16, 16), c = cv.getContext('2d');
        if (kind === 1) {
          c.fillStyle = flash ? '#ffffa0' : '#30b8f0'; c.fillRect(0, 0, 16, 16);
          c.fillStyle = flash ? '#ffffff' : '#b0f0ff'; c.fillRect(0, 0, 16, 2); c.fillRect(0, 0, 2, 16);
          c.fillStyle = flash ? '#c0c060' : '#1060a0'; c.fillRect(0, 14, 16, 2); c.fillRect(14, 0, 2, 16);
          c.fillStyle = flash ? '#ffffff' : '#e0ffff'; c.fillRect(4, 4, 3, 1); c.fillRect(4, 5, 1, 2); c.fillRect(9, 9, 2, 1);
        } else {
          c.fillStyle = '#1830c0'; c.fillRect(0, 0, 16, 16);
          c.fillStyle = '#6080ff'; c.fillRect(0, 0, 16, 2); c.fillRect(0, 0, 2, 16);
          c.fillStyle = '#081060'; c.fillRect(0, 14, 16, 2); c.fillRect(14, 0, 2, 16);
          c.fillStyle = flash ? '#ffffff' : '#ffd000';
          for (let i = 0; i < 5; i++) c.fillRect(8 - i, 3 + i, i * 2 + 1, 1);
          for (let i = 0; i < 5; i++) c.fillRect(8 - (4 - i), 8 + i, (4 - i) * 2 + 1, 1);
          c.fillStyle = '#ffffff'; c.fillRect(7, 5, 1, 2);
        }
        return cv;
      }
      const ICE = blockSprite(1, false), ICE_F = blockSprite(1, true), DIA = blockSprite(2, false), DIA_F = blockSprite(2, true);

      let hi = api.getHiScore(20000);
      let state = 'title', T = 0, page = 0, demo = false, coinFlash = 0;
      let score = 0, lives = 3, level = 1, nextLife = 30000;
      let grid = new Uint8Array(NC * NR), eggs = new Uint8Array(NC * NR), crumbles, slides, bees, pengo, pops, shake, eggsLeft, activeMax, roundT, diamondDone, stunAll, lastBeeT, bonusMsg, bonusT;
      let demoAI = { d: 2, t: 0 };

      // ---------- sound ----------
      const snd = {
        push() { A.tone(180, 0.12, { type: 'square', vol: 0.12, slideTo: 90 }); },
        slide() { A.tone(600, 0.25, { type: 'triangle', vol: 0.1, slideTo: 1200 }); },
        stop() { A.noise(0.06, { vol: 0.12, freq: 700 }); },
        crack() { A.noise(0.15, { vol: 0.15, freq: 2500, slideTo: 600 }); },
        crush() { A.melody([[1568, 0.05], [1319, 0.05], [1047, 0.05], [784, 0.12]], { type: 'square', vol: 0.12 }); },
        egg() { A.tone(900, 0.15, { type: 'square', vol: 0.1, slideTo: 200 }); },
        hatch() { A.tone(300, 0.3, { type: 'sawtooth', vol: 0.08, slideTo: 900 }); },
        shake() { A.noise(0.3, { vol: 0.18, freq: 200 }); A.tone(70, 0.3, { type: 'square', vol: 0.12 }); },
        stomp() { A.tone(1200, 0.08, { type: 'square', vol: 0.1, slideTo: 400 }); },
        diamond() { A.melody([[1047, 0.08], [1319, 0.08], [1568, 0.08], [2093, 0.08], [1568, 0.08], [2093, 0.08], [2637, 0.3]], { type: 'square', vol: 0.12 }); },
        death() { A.melody([[988, 0.1], [932, 0.1], [880, 0.1], [831, 0.1], [784, 0.1], [740, 0.1], [698, 0.4], [0, 0.1], [349, 0.15], [175, 0.4]], { type: 'square', vol: 0.12 }); },
        clear() { A.melody([[784, 0.1], [988, 0.1], [1175, 0.1], [1568, 0.25], [0, 0.05], [1319, 0.1], [1568, 0.4]], { type: 'square', vol: 0.12 }); },
        life() { A.melody([[1319, 0.08], [1568, 0.08], [2093, 0.2]], { type: 'square', vol: 0.12 }); },
        start() {
          const m = [[659, 0.12], [587, 0.12], [659, 0.12], [523, 0.12], [392, 0.24], [0, 0.06], [440, 0.12], [494, 0.12], [523, 0.12], [587, 0.12], [659, 0.36], [0, 0.06], [784, 0.12], [659, 0.12], [523, 0.12], [587, 0.12], [523, 0.4]];
          A.melody(m, { type: 'square', vol: 0.1 }); A.melody(m.map(([f, d]) => [f / 2, d]), { type: 'triangle', vol: 0.12 });
        },
        noCoin() { A.tone(98, 0.28, { type: 'square', vol: 0.14 }); }
      };
      const TUNE = [659, 0, 784, 659, 523, 0, 587, 0, 659, 0, 523, 440, 392, 0, 0, 0, 440, 0, 523, 440, 392, 0, 440, 0, 494, 0, 523, 587, 659, 0, 0, 0];
      let musicT = 0, musicI = 0;
      function music() {
        if (demo) return;
        if (++musicT >= 9) { musicT = 0; const f = TUNE[musicI++ % TUNE.length]; if (f) { A.tone(f, 0.1, { type: 'square', vol: 0.03 }); A.tone(f / 2, 0.12, { type: 'triangle', vol: 0.06 }); } }
      }

      // ---------- field ----------
      const inField = (c, r) => c >= 0 && r >= 0 && c < NC && r < NR;
      const idx = (c, r) => r * NC + c;
      const px = c => FX + c * CS, py = r => FY + r * CS;
      function slideAt(c, r) { for (const s of slides) if ((s.c === c && s.r === r) || (s.tc === c && s.tr === r)) return s; return null; }
      function solid(c, r) { return !inField(c, r) || grid[idx(c, r)] !== 0 || !!slideAt(c, r); }
      function genMaze() {
        grid.fill(1); eggs.fill(0);
        const seen = new Uint8Array(NC * NR), stack = [[6, 6]];
        seen[idx(6, 6)] = 1; grid[idx(6, 6)] = 0;
        while (stack.length) {
          const [c, r] = stack[stack.length - 1];
          const nb = [];
          for (let d = 0; d < 4; d++) { const nc = c + DX[d] * 2, nr = r + DY[d] * 2; if (inField(nc, nr) && !seen[idx(nc, nr)]) nb.push(d); }
          if (!nb.length) { stack.pop(); continue; }
          const d = nb[Math.random() * nb.length | 0], nc = c + DX[d] * 2, nr = r + DY[d] * 2;
          grid[idx(c + DX[d], r + DY[d])] = 0; grid[idx(nc, nr)] = 0; seen[idx(nc, nr)] = 1; stack.push([nc, nr]);
        }
        // open a few extra holes so the maze has loops
        for (let i = 0; i < 10; i++) {
          const c = Math.random() * NC | 0, r = Math.random() * NR | 0;
          if (grid[idx(c, r)] && ((c & 1) !== (r & 1))) grid[idx(c, r)] = 0;
        }
        // the three diamond blocks, away from the walls and from each other
        const dias = [];
        for (let tries = 0; dias.length < 3 && tries < 500; tries++) {
          const c = 1 + (Math.random() * (NC - 2) | 0), r = 1 + (Math.random() * (NR - 2) | 0);
          if (grid[idx(c, r)] !== 1) continue;
          if (dias.some(([a, b]) => Math.abs(a - c) + Math.abs(b - r) < 3)) continue;
          if (Math.abs(c - 6) + Math.abs(r - 6) < 2) continue;
          dias.push([c, r]); grid[idx(c, r)] = 2;
        }
        // Sno-Bee eggs
        const total = Math.min(12, 5 + level);
        let placed = 0;
        for (let tries = 0; placed < total && tries < 2000; tries++) {
          const c = Math.random() * NC | 0, r = Math.random() * NR | 0;
          if (grid[idx(c, r)] !== 1 || eggs[idx(c, r)]) continue;
          if (Math.abs(c - 6) + Math.abs(r - 6) < 4) continue;
          eggs[idx(c, r)] = 1; placed++;
        }
        eggsLeft = placed;
      }

      // ---------- setup ----------
      function initRound() {
        genMaze();
        activeMax = Math.min(4, 2 + ((level + 1) >> 1));
        diamondDone = false; lastBeeT = 0; roundT = 0;
        resetActors(true);
        state = 'intro'; T = 0;
      }
      function resetActors(fresh) {
        if (fresh || !pengo) pengo = { c: 6, r: 6, x: px(6), y: py(6), dir: 2, moving: false, tc: 6, tr: 6, anim: 0, push: 0, pushReq: 0 };
        else { pengo.x = px(pengo.c); pengo.y = py(pengo.r); pengo.moving = false; pengo.push = 0; pengo.pushReq = 0; }
        slides = []; crumbles = []; pops = []; shake = null; stunAll = 0; bonusT = 0;
        if (fresh) bees = [];
      }
      function startGame(isDemo) {
        demo = isDemo; score = 0; lives = 3; level = 1; nextLife = 30000;
        initRound();
        if (!demo) snd.start();
      }
      function addScore(n, x, y) {
        if (demo) return;
        score += n;
        if (x != null) pops.push({ x, y, v: n, t: 60 });
        if (score >= nextLife) { lives++; nextLife += 50000; snd.life(); }
        if (score > hi) hi = score;
      }
      function beeSpeed() { return Math.min(1.6, 0.85 + level * 0.07); }

      // ---------- bees ----------
      function hatchOne(initial) {
        const list = [];
        for (let i = 0; i < NC * NR; i++) if (eggs[i] && grid[i] === 1) list.push(i);
        if (!list.length) return false;
        // prefer eggs away from Pengo
        list.sort((a, b) => dist(b) - dist(a));
        function dist(i) { return Math.abs((i % NC) - pengo.c) + Math.abs(((i / NC) | 0) - pengo.r); }
        const i = list[Math.random() * Math.min(list.length, initial ? list.length : 4) | 0];
        const c = i % NC, r = (i / NC) | 0;
        eggs[i] = 0; eggsLeft--; grid[i] = 0;
        crumbles.push({ c, r, t: 16, kind: 1 });
        bees.push({ c, r, tc: c, tr: r, x: px(c), y: py(r), dir: 2, state: 'hatch', t: 50, acc: 0, anim: 0, eatT: 0 });
        snd.hatch();
        return true;
      }
      function beeChoose(b) {
        const pc = pengo.c, pr = pengo.r;
        let tx = pc, ty = pr;
        const fleeing = lastBeeT > 1800 && bees.filter(x => x.state !== 'dead').length === 1 && eggsLeft === 0;
        if (fleeing) { tx = b.c < NC / 2 ? 0 : NC - 1; ty = b.r < NR / 2 ? 0 : NR - 1; b.flee = true; }
        const opts = [];
        for (let d = 0; d < 4; d++) { const nc = b.c + DX[d], nr = b.r + DY[d]; if (!solid(nc, nr) && !bees.some(o => o !== b && o.state !== 'dead' && o.tc === nc && o.tr === nr)) opts.push(d); }
        // decide whether to chew through the ice in front
        const fc = b.c + DX[b.dir], fr = b.r + DY[b.dir];
        const frontIce = inField(fc, fr) && grid[idx(fc, fr)] === 1 && !eggs[idx(fc, fr)] && !slideAt(fc, fr);
        const chew = Math.min(0.25, 0.02 + level * 0.015);
        if (frontIce && !fleeing && (!opts.length || Math.random() < chew)) { b.state = 'eat'; b.t = 36; return -1; }
        if (!opts.length) {
          // look for any ice to chew
          for (let d = 0; d < 4; d++) { const nc = b.c + DX[d], nr = b.r + DY[d]; if (inField(nc, nr) && grid[idx(nc, nr)] === 1 && !eggs[idx(nc, nr)]) { b.dir = d; b.state = 'eat'; b.t = 36; return -1; } }
          return -1;
        }
        let o2 = opts.filter(d => d !== (b.dir ^ 2)); if (!o2.length) o2 = opts;
        if (!fleeing && Math.random() > Math.min(0.85, 0.55 + level * 0.04)) return o2[Math.random() * o2.length | 0];
        let best = o2[0], bs = 1e9;
        for (const d of o2) { const s = Math.abs(b.c + DX[d] - tx) + Math.abs(b.r + DY[d] - ty) + Math.random() * 0.9; if (s < bs) { bs = s; best = d; } }
        return best;
      }
      function updateBee(b) {
        if (b.state === 'hatch') { if (--b.t <= 0) b.state = 'walk'; return; }
        if (b.state === 'stun') { if (--b.t <= 0) b.state = 'walk'; return; }
        if (b.state === 'eat') {
          if (--b.t <= 0) {
            const fc = b.c + DX[b.dir], fr = b.r + DY[b.dir];
            if (inField(fc, fr) && grid[idx(fc, fr)] === 1 && !eggs[idx(fc, fr)]) { grid[idx(fc, fr)] = 0; crumbles.push({ c: fc, r: fr, t: 16, kind: 1 }); A.noise(0.08, { vol: 0.07, freq: 1800 }); }
            b.state = 'walk';
          }
          return;
        }
        if (b.state !== 'walk') return;
        b.acc += beeSpeed() * (b.flee ? 1.3 : 1);
        while (b.acc >= 1) {
          b.acc -= 1;
          if (b.x === px(b.c) && b.y === py(b.r)) {
            if (b.flee && (b.c === 0 || b.c === NC - 1) && (b.r === 0 || b.r === NR - 1)) { b.state = 'dead'; b.escaped = true; return; }
            const d = beeChoose(b);
            if (d < 0) return;
            b.dir = d; b.tc = b.c + DX[d]; b.tr = b.r + DY[d];
          }
          if (solid(b.tc, b.tr) && !(b.tc === b.c && b.tr === b.r)) { // target got filled (block arrived)
            b.tc = b.c; b.tr = b.r; b.dir ^= 2;
          }
          const tx = px(b.tc), ty = py(b.tr);
          b.x += Math.sign(tx - b.x); b.y += Math.sign(ty - b.y);
          if (b.x === tx && b.y === ty) { b.c = b.tc; b.r = b.tr; }
        }
        b.anim++;
      }

      // ---------- Pengo ----------
      function readInput() {
        if (demo) {
          if (--demoAI.t <= 0) { demoAI.t = 20 + (Math.random() * 50 | 0); demoAI.d = Math.random() * 4 | 0; }
          return { d: demoAI.d, push: Math.random() < 0.04 };
        }
        let d = -1;
        if (api.key('ArrowUp')) d = 0; else if (api.key('ArrowDown')) d = 2; else if (api.key('ArrowLeft')) d = 1; else if (api.key('ArrowRight')) d = 3;
        return { d, push: api.anyPressed('Space', 'KeyX', 'KeyZ') };
      }
      function doPush() {
        const p = pengo, d = p.dir, c1 = p.c + DX[d], r1 = p.r + DY[d];
        p.push = 10;
        if (!inField(c1, r1)) { shakeWall(d); return; }
        const k = grid[idx(c1, r1)];
        if (!k || slideAt(c1, r1)) return;
        const c2 = c1 + DX[d], r2 = r1 + DY[d];
        if (!solid(c2, r2)) {
          // the block slides
          grid[idx(c1, r1)] = 0;
          const egg = eggs[idx(c1, r1)]; eggs[idx(c1, r1)] = 0;
          slides.push({ c: c1, r: r1, tc: c2, tr: r2, x: px(c1), y: py(r1), dir: d, kind: k, egg, carried: [] });
          snd.slide();
        } else if (k === 1) {
          // crush the ice in place
          grid[idx(c1, r1)] = 0;
          crumbles.push({ c: c1, r: r1, t: 16, kind: 1 });
          if (eggs[idx(c1, r1)]) { eggs[idx(c1, r1)] = 0; eggsLeft--; addScore(500, px(c1) + 8, py(r1)); snd.egg(); }
          else { addScore(30); snd.crack(); }
        } else snd.push();
      }
      function shakeWall(d) {
        if (shake && shake.t > 0) return;
        shake = { side: d, t: 40 };
        snd.shake();
        for (const b of bees) {
          if (b.state !== 'walk' && b.state !== 'eat') continue;
          const near = (d === 1 && b.x <= px(0) + 4) || (d === 3 && b.x >= px(NC - 1) - 4) || (d === 0 && b.y <= py(0) + 4) || (d === 2 && b.y >= py(NR - 1) - 4);
          if (near) { b.state = 'stun'; b.t = 240; }
        }
      }
      function updatePengo(inp) {
        const p = pengo;
        if (p.push > 0) p.push--;
        if (inp.push) p.pushReq = 8;
        if (!p.moving) {
          if (p.pushReq > 0) { p.pushReq = 0; doPush(); return; }
          if (inp.d >= 0 && p.push <= 4) {
            p.dir = inp.d;
            const nc = p.c + DX[inp.d], nr = p.r + DY[inp.d];
            if (!solid(nc, nr)) { p.moving = true; p.tc = nc; p.tr = nr; p.acc = 0; }
          }
        }
        if (p.pushReq > 0) p.pushReq--;
        if (p.moving) {
          p.acc = (p.acc || 0) + 1.45;
          while (p.acc >= 1) {
            p.acc -= 1;
            const tx = px(p.tc), ty = py(p.tr);
            p.x += Math.sign(tx - p.x); p.y += Math.sign(ty - p.y);
            if (p.x === tx && p.y === ty) {
              p.c = p.tc; p.r = p.tr; p.moving = false;
              if (p.pushReq > 0) { p.pushReq = 0; doPush(); break; }
              if (inp.d >= 0) {
                p.dir = inp.d;
                const nc = p.c + DX[inp.d], nr = p.r + DY[inp.d];
                if (!solid(nc, nr)) { p.moving = true; p.tc = nc; p.tr = nr; continue; }
              }
              break;
            }
          }
          p.anim++;
        }
      }

      // ---------- blocks ----------
      function updateSlides() {
        for (const s of slides) {
          for (let k = 0; k < 4; k++) {
            const tx = px(s.tc), ty = py(s.tr);
            s.x += Math.sign(tx - s.x); s.y += Math.sign(ty - s.y);
            // scoop up bees in the way
            for (const b of bees) {
              if (b.state === 'dead' || b.state === 'crushed') continue;
              const along = (s.dir === 1 || s.dir === 3) ? (b.x - s.x) * DX[s.dir] : (b.y - s.y) * DY[s.dir];
              const perp = (s.dir === 1 || s.dir === 3) ? Math.abs(b.y - s.y) : Math.abs(b.x - s.x);
              if (perp < 10 && along > 0 && along < 16) { b.state = 'crushed'; s.carried.push(b); }
            }
            for (const b of s.carried) { b.x = s.x + DX[s.dir] * 14; b.y = s.y + DY[s.dir] * 14; }
            if (s.x === tx && s.y === ty) {
              s.c = s.tc; s.r = s.tr;
              const nc = s.c + DX[s.dir], nr = s.r + DY[s.dir];
              s.tc = s.c; s.tr = s.r;
              if (!inField(nc, nr) || grid[idx(nc, nr)] !== 0 || slides.some(o => o !== s && ((o.c === nc && o.r === nr) || (o.tc === nc && o.tr === nr)))) { stopSlide(s); break; }
              s.tc = nc; s.tr = nr;
            }
          }
        }
        slides = slides.filter(s => !s.done);
      }
      function stopSlide(s) {
        s.done = true;
        grid[idx(s.c, s.r)] = s.kind;
        if (s.egg) eggs[idx(s.c, s.r)] = 1;
        snd.stop();
        const n = s.carried.length;
        if (n) {
          for (const b of s.carried) b.state = 'dead';
          const pts = CRUSH_PTS[Math.min(3, n - 1)];
          addScore(pts, s.x + 8 + DX[s.dir] * 12, s.y + DY[s.dir] * 12);
          snd.crush();
        }
        if (s.kind === 2) checkDiamonds();
      }
      function checkDiamonds() {
        if (diamondDone) return;
        const ds = [];
        for (let i = 0; i < NC * NR; i++) if (grid[i] === 2) ds.push([i % NC, (i / NC) | 0]);
        if (ds.length !== 3) return;
        let line = false;
        const rows = ds.every(d => d[1] === ds[0][1]), cols = ds.every(d => d[0] === ds[0][0]);
        if (rows) { const xs = ds.map(d => d[0]).sort((a, b) => a - b); line = xs[1] === xs[0] + 1 && xs[2] === xs[1] + 1; }
        if (cols) { const ys = ds.map(d => d[1]).sort((a, b) => a - b); line = ys[1] === ys[0] + 1 && ys[2] === ys[1] + 1; }
        if (!line) return;
        diamondDone = true;
        const touching = ds.some(([c, r]) => c === 0 || r === 0 || c === NC - 1 || r === NR - 1);
        const v = touching ? 5000 : 10000;
        addScore(v); bonusMsg = 'DIAMOND BONUS ' + v; bonusT = 180;
        stunAll = 360;
        for (const b of bees) if (b.state === 'walk' || b.state === 'eat') { b.state = 'stun'; b.t = 360; }
        snd.diamond();
      }

      // ---------- play loop ----------
      function updatePlay() {
        roundT++;
        updatePengo(readInput());
        updateSlides();
        for (const c of crumbles) c.t--;
        crumbles = crumbles.filter(c => c.t > 0);
        for (const b of bees) updateBee(b);
        const escaped = bees.some(b => b.escaped);
        bees = bees.filter(b => b.state !== 'dead');
        const live = bees.length;
        if (live < activeMax && eggsLeft > 0) {
          if (!updatePlay.hatchT) updatePlay.hatchT = 70;
          if (--updatePlay.hatchT <= 0) { updatePlay.hatchT = 0; hatchOne(false); }
        }
        if (live === 1 && eggsLeft === 0) lastBeeT++; else lastBeeT = 0;
        if (shake && shake.t > 0) shake.t--;
        for (const o of pops) o.t--;
        pops = pops.filter(o => o.t > 0);
        if (bonusT > 0) bonusT--;
        // Pengo vs bees
        const p = pengo;
        for (const b of bees) {
          if (Math.abs(b.x - p.x) < 12 && Math.abs(b.y - p.y) < 12) {
            if (b.state === 'stun') { b.state = 'dead'; addScore(100, b.x + 8, b.y); snd.stomp(); }
            else if (b.state === 'walk' || b.state === 'eat') { die(); return; }
          }
        }
        bees = bees.filter(b => b.state !== 'dead');
        // round clear
        if (!bees.length && eggsLeft <= 0 && !slides.some(s => s.egg)) {
          state = 'clear'; T = 0;
          if (demo) { state = 'title'; page = 0; T = 0; return; }
          const s = roundT / 60;
          const tb = escaped ? 0 : s < 20 ? 5000 : s < 30 ? 2000 : s < 40 ? 1000 : s < 50 ? 500 : s < 60 ? 10 : 0;
          clearInfo = { secs: Math.floor(s), bonus: tb };
          addScore(tb);
          snd.clear();
        }
        music();
      }
      let clearInfo = { secs: 0, bonus: 0 };
      function die() {
        state = 'dying'; T = 0;
        if (!demo) snd.death();
      }
      function afterDeath() {
        if (demo) { state = 'title'; page = 0; T = 0; return; }
        const respawn = () => {
          resetActors(false);
          // the Sno-Bees scatter away from Pengo
          for (const b of bees) {
            if (b.state === 'crushed') continue;
            const empt = [];
            for (let i = 0; i < NC * NR; i++) { const c = i % NC, r = (i / NC) | 0; if (!grid[i] && Math.abs(c - pengo.c) + Math.abs(r - pengo.r) >= 6) empt.push([c, r]); }
            if (empt.length) { const [c, r] = empt[Math.random() * empt.length | 0]; b.c = b.tc = c; b.r = b.tr = r; b.x = px(c); b.y = py(r); }
            b.state = 'hatch'; b.t = 40;
          }
          bees = bees.filter(b => b.state !== 'crushed');
          state = 'ready'; T = 60;
        };
        const gameOver = () => { state = 'gameover'; T = 0; api.setHiScore(score); };
        if (lives <= 1) {
          lives = 0;
          if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, gameOver);
          else gameOver();
        } else { lives--; respawn(); }
      }
      function tryStart() {
        if (api.useCredit()) { startGame(false); return; }
        coinFlash = 90; snd.noCoin();
      }

      function update() {
        T++; if (coinFlash > 0) coinFlash--;
        switch (state) {
          case 'title':
            if (api.anyPressed('Enter', 'Space')) { tryStart(); break; }
            if (T > 420) { T = 0; page++; if (page % 3 === 2) startGame(true); }
            break;
          case 'intro':
            if (demo && api.anyPressed('Enter', 'Space')) { state = 'title'; T = 0; tryStart(); break; }
            if (T === 100) { for (let i = 0; i < activeMax; i++) hatchOne(true); }
            if (T >= 150) { state = 'play'; T = 0; roundT = 0; updatePlay.hatchT = 0; }
            break;
          case 'ready':
            if (T >= 120) { state = 'play'; T = 0; }
            break;
          case 'play':
            if (demo) {
              if (api.anyPressed('Enter', 'Space')) { state = 'title'; page = 0; T = 0; tryStart(); break; }
              if (T > 1500) { state = 'title'; page = 0; T = 0; break; }
            }
            updatePlay();
            break;
          case 'dying':
            if (T >= 150) afterDeath();
            break;
          case 'clear':
            if (T >= 260) { level++; initRound(); }
            break;
          case 'gameover':
            if (T > 240) { state = 'title'; page = 0; T = 0; demo = false; }
            break;
        }
      }

      // ---------- rendering ----------
      function drawWalls(ctx) {
        const sh = shake && shake.t > 0 ? shake : null;
        const fw = NC * CS, fh = NR * CS;
        const sides = [[FX - 8, FY - 8, fw + 16, 8, 0], [FX - 8, FY - 8, 8, fh + 16, 1], [FX - 8, FY + fh, fw + 16, 8, 2], [FX + fw, FY - 8, 8, fh + 16, 3]];
        for (const [x, y, w, h, side] of sides) {
          const active = sh && sh.side === side;
          const o = active ? (((T >> 1) & 1) ? 1 : -1) : 0;
          const ox = (side === 1 || side === 3) ? o : 0, oy = (side === 0 || side === 2) ? o : 0;
          ctx.fillStyle = active ? '#ffffff' : '#c08000'; ctx.fillRect(x + ox, y + oy, w, h);
          ctx.fillStyle = active ? '#ffd000' : '#ffd040';
          if (w > h) for (let i = x + 2; i < x + w; i += 8) ctx.fillRect(i + ox, y + 3 + oy, 4, 2);
          else for (let i = y + 2; i < y + h; i += 8) ctx.fillRect(x + 3 + ox, i + oy, 2, 4);
        }
      }
      function drawBlocks(ctx, reveal) {
        const flashEggs = (state === 'intro' && T > 30 && T < 100) || false;
        for (let r = 0; r < NR; r++) {
          if (reveal != null && r > reveal) break;
          for (let c = 0; c < NC; c++) {
            const k = grid[idx(c, r)]; if (!k) continue;
            const flash = flashEggs && eggs[idx(c, r)] && ((T >> 3) & 1);
            const df = k === 2 && stunAll > 0 && ((T >> 2) & 1);
            ctx.drawImage(k === 1 ? (flash ? ICE_F : ICE) : (df ? DIA_F : DIA), px(c), py(r));
          }
        }
        for (const s of slides) ctx.drawImage(s.kind === 1 ? ICE : DIA, s.x, s.y);
        for (const cb of crumbles) {
          const t = cb.t, x = px(cb.c), y = py(cb.r);
          ctx.fillStyle = '#b0f0ff';
          for (let i = 0; i < 8; i++) {
            const a = i * 0.785, rr = (16 - t) * 0.8;
            ctx.fillRect(Math.round(x + 7 + Math.cos(a) * rr), Math.round(y + 7 + Math.sin(a) * rr), 3, 3);
          }
          if (t > 8) { ctx.fillStyle = '#30b8f0'; ctx.fillRect(x + 4, y + 4, 8, 8); }
        }
      }
      function drawBees(ctx) {
        for (const b of bees) {
          if (b.state === 'hatch') {
            if (b.t > 25) ctx.drawImage(EGG_S, b.x, b.y);
            else ctx.drawImage(((b.t >> 2) & 1) ? BEE_HATCH : BEE_S[0], b.x, b.y);
          } else if (b.state === 'stun') ctx.drawImage(((T >> 3) & 1) ? BEE_D : BEE_S[0], b.x + (((T >> 2) & 1) ? 1 : 0), b.y);
          else if (b.state === 'crushed') ctx.drawImage(BEE_S[1], 0, 0, 16, 16, b.x + 2, b.y + 4, 12, 10);
          else if (b.state === 'eat') ctx.drawImage(BEE_S[(T >> 2) & 1], b.x + DX[b.dir] * ((T >> 2) & 1), b.y + DY[b.dir] * ((T >> 2) & 1));
          else ctx.drawImage(BEE_S[(b.anim >> 3) & 1], b.x, b.y);
        }
      }
      function drawPengo(ctx) {
        const p = pengo;
        let img = p.push > 0 ? PUSH[p.dir] : PG[p.dir][p.moving ? (p.anim >> 3) & 1 : 0];
        ctx.drawImage(img, p.x, p.y);
      }
      function drawHUD(ctx) {
        txt(ctx, '1P', 8, 0, '#40d0ff'); txt(ctx, String(score).padStart(7, ' '), 24, 0, '#ffffff');
        txt(ctx, 'HI', 120, 0, '#ff2828'); txt(ctx, String(Math.max(hi, score)).padStart(7, ' '), 136, 0, '#ffffff');
        const shown = Math.min(6, lives - (state === 'play' || state === 'dying' ? 1 : 0));
        for (let i = 0; i < shown; i++) ctx.drawImage(PG[2][0], 8 + i * 12, H - 14, 11, 11);
        txt(ctx, 'ACT ' + level, 150, H - 12, '#40d0ff');
        // remaining Sno-Bee eggs
        for (let i = 0; i < Math.min(8, eggsLeft); i++) ctx.drawImage(EGG_S, 4, 4, 8, 8, 84 + i * 8, H - 12, 6, 6);
      }
      function drawCredit(ctx) { txt(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 56, H - 10, '#ffffff'); }
      function drawCoinMsg(ctx, y) {
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) ctr(ctx, 'INSERT COIN', y, '#ff3030'); }
        else if (api.credits === 0) { if ((T >> 5) & 1) ctr(ctx, 'INSERT COIN', y, '#ffd000'); }
        else if ((T >> 5) & 1) ctr(ctx, 'PUSH START BUTTON', y, '#ffd000');
      }
      function renderTitle(ctx) {
        if (page % 3 === 0) {
          // logo made of ice blocks
          const s = 'PENGO';
          for (let i = 0; i < s.length; i++) bigTxt(ctx, s[i], 24 + i * 36, 40, ['#40d0ff', '#80e0ff', '#40d0ff', '#80e0ff', '#40d0ff'][i], 6, '#104080');
          for (let i = 0; i < 5; i++) ctx.drawImage(ICE, 32 + i * 32, 100);
          ctx.drawImage(DIA, 64, 100); ctx.drawImage(DIA, 128, 100);
          const t = T % 240;
          const bx = 200 - t * 1.2, pxp = bx - 40;
          if (bx > -20) { ctx.drawImage(BEE_S[(T >> 3) & 1], bx, 136); ctx.drawImage(PG[1][(T >> 3) & 1], pxp + 20, 136); ctx.drawImage(ICE, pxp + 2, 136); }
          ctr(ctx, 'PUSH THE ICE BLOCKS', 172, '#ffffff');
          ctr(ctx, 'TO CRUSH THE SNO-BEES', 184, '#ffffff');
          ctr(ctx, 'BONUS PENGO AT 30000 PTS', 204, '#ff2828');
          drawCoinMsg(ctx, 228);
          ctr(ctx, '\u00a9 1982 SEGA', 250, '#40d0ff');
        } else {
          ctr(ctx, '- SCORE -', 28, '#ffd000');
          ctx.drawImage(ICE, 24, 46); ctx.drawImage(BEE_S[0], 42, 46); txt(ctx, 'CRUSH  400 - 6400', 64, 50, '#ffffff');
          ctx.drawImage(BEE_D, 42, 70); txt(ctx, 'STOMP DIZZY  100', 64, 74, '#ffffff');
          ctx.drawImage(EGG_S, 42, 94); txt(ctx, 'BREAK EGG    500', 64, 98, '#ffffff');
          ctx.drawImage(ICE, 42, 118); txt(ctx, 'BREAK ICE     30', 64, 122, '#ffffff');
          ctx.drawImage(DIA, 8, 142); ctx.drawImage(DIA, 24, 142); ctx.drawImage(DIA, 40, 142); txt(ctx, 'LINE UP 10000', 64, 146, '#ffffff');
          ctr(ctx, 'TIME BONUS', 172, '#40d0ff');
          const tb = [['0-19 SEC', 5000], ['20-29 SEC', 2000], ['30-39 SEC', 1000], ['40-49 SEC', 500], ['50-59 SEC', 10]];
          tb.forEach(([a, v], i) => { txt(ctx, a, 40, 186 + i * 10, '#ffffff'); txt(ctx, String(v).padStart(5, ' '), 136, 186 + i * 10, '#ffd000'); });
          drawCoinMsg(ctx, 248);
        }
        txt(ctx, 'HI ' + hi, 8, 2, '#ff2828');
        drawCredit(ctx);
      }
      function render(ctx) {
        ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { renderTitle(ctx); return; }
        drawHUD(ctx);
        drawWalls(ctx);
        drawBlocks(ctx, state === 'intro' ? Math.floor(T / 2) : null);
        if (state !== 'intro' || T > 30) {
          drawBees(ctx);
          if (state === 'dying') {
            const p = pengo;
            if (T < 90) ctx.drawImage(PG[[2, 1, 0, 3][(T >> 3) & 3]][0], p.x, p.y);
            else { ctx.drawImage(PG[2][0], 0, 0, 16, 16, p.x, p.y + 6, 16, 10); }
            ctx.fillStyle = '#ffd000';
            for (let i = 0; i < 3; i++) { const a = T / 6 + i * 2.1; ctx.fillRect(p.x + 7 + Math.cos(a) * 8, p.y - 2 + Math.sin(a) * 3, 2, 2); }
          } else drawPengo(ctx);
        }
        for (const o of pops) tinyNum(ctx, o.v, o.x, o.y, '#ffffff');
        if (bonusT > 0) { ctx.fillStyle = '#000'; ctx.fillRect(24, 140, 176, 12); ctr(ctx, bonusMsg, 142, '#ffd000'); }
        if (state === 'intro' && T > 30) {
          ctx.fillStyle = '#000'; ctx.fillRect(56, 118, 112, 30);
          ctr(ctx, demo ? 'DEMO PLAY' : 'PLAYER 1', 122, '#ffffff');
          ctr(ctx, 'ACT ' + level, 134, '#40d0ff');
        }
        if (state === 'ready') { ctx.fillStyle = '#000'; ctx.fillRect(72, 128, 80, 12); ctr(ctx, 'READY!', 130, '#ffd000'); }
        if (state === 'clear' && T > 20) {
          ctx.fillStyle = '#000'; ctx.fillRect(24, 110, 176, 56);
          ctr(ctx, 'ACT ' + level + ' CLEAR', 116, '#ffd000');
          ctr(ctx, 'GAME TIME ' + clearInfo.secs + ' SEC', 132, '#ffffff');
          ctr(ctx, clearInfo.bonus ? 'BONUS ' + clearInfo.bonus + ' PTS' : 'NO BONUS', 148, '#40d0ff');
        }
        if (state === 'gameover') { ctx.fillStyle = '#000'; ctx.fillRect(64, 128, 96, 18); ctr(ctx, 'GAME OVER', 133, '#ff2828'); }
        if (demo) { ctx.fillStyle = '#000'; ctx.fillRect(40, H - 26, 144, 10); drawCoinMsg(ctx, H - 25); }
      }

      initRound(); state = 'title'; T = 0;
      if (api.debugHook) api.debugHook({ get: () => ({ state, level, score, lives, pengo, bees, eggsLeft, slides, T, grid }), push: doPush });
      return { update, render, destroy() { } };
    }
  });
})();
