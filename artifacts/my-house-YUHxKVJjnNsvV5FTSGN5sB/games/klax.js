// Klax (Atari Games, 1989) - from-scratch recreation for the MAME32 Game Room.
// Tiles tumble down a conveyor; catch them on the paddle and drop them into the bin to make lines of a colour.
(function () {
  'use strict';
  const W = 320, H = 240;

  // ---------- 5x7 bitmap font ----------
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
    '=': '00001F001F0000', '>': '08040201020408', '<': '02040810080402', '*': '0004150E150400',
    '+': '0004041F040400'
  };
  const FONT = {};
  for (const k in FONT_HEX) { const s = FONT_HEX[k], a = []; for (let i = 0; i < 7; i++) a.push(parseInt(s.substr(i * 2, 2), 16) || 0); FONT[k] = a; }
  function txt(ctx, s, x, y, col, sc) {
    sc = sc || 1; ctx.fillStyle = col; s = String(s).toUpperCase();
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) { const b = g[r]; if (!b) continue; for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc); }
    }
  }
  const tw = (s, sc) => (String(s).length * 6 - 1) * (sc || 1);
  const txtC = (ctx, s, cx, y, col, sc) => txt(ctx, s, Math.round(cx - tw(s, sc) / 2), y, col, sc);
  const txtR = (ctx, s, rx, y, col, sc) => txt(ctx, s, rx - tw(s, sc), y, col, sc);
  function txtS(ctx, s, cx, y, col, sc) { txtC(ctx, s, cx + (sc || 1), y + (sc || 1), '#000', sc); txtC(ctx, s, cx, y, col, sc); }

  // ---------- geometry ----------
  const LANES = 5, ND = 8, BR = 5;               // lanes, conveyor rows, bin rows
  const yAt = d => { const t = d / ND; return 30 + 118 * (0.72 * t + 0.28 * t * t); };
  const hwAt = d => 44 + 41 * (d / ND);
  const laneX = (l, d) => 160 + (l - 2) * (2 * hwAt(d) / LANES);
  const BIN_X = 160 - 85, BIN_CW = 34, BIN_Y = 172, BIN_RH = 12;
  const PAD_Y = 156;
  const WILD = 9;
  const TCOL = [null,
    ['#2a6cff', '#8ab4ff', '#10308a'], ['#30d040', '#a0ffa8', '#106018'], ['#ffe020', '#fff4a0', '#907000'],
    ['#ff2a2a', '#ffa0a0', '#800808'], ['#c040ff', '#e8b0ff', '#5a1080'], ['#ff8ad0', '#ffd0ee', '#a03070'],
    ['#f0f0f0', '#ffffff', '#808090']];
  const N = { C4: 261.6, E4: 329.6, G4: 392, A4: 440, C5: 523.3, D5: 587.3, E5: 659.3, G5: 784, A5: 880, C6: 1046.5 };
  const GOALS = [
    { t: 'klax', n: 3, s: 'KLAXES' }, { t: 'points', n: 10000, s: 'POINTS' }, { t: 'diag', n: 2, s: 'DIAGONALS' },
    { t: 'tiles', n: 40, s: 'TILES' }, { t: 'horiz', n: 3, s: 'HORIZONTALS' }, { t: 'klax', n: 5, s: 'KLAXES' },
    { t: 'points', n: 25000, s: 'POINTS' }, { t: 'diag', n: 3, s: 'DIAGONALS' }, { t: 'horiz', n: 5, s: 'HORIZONTALS' },
    { t: 'klax', n: 8, s: 'KLAXES' }];

  ArcadeRegistry.register({
    id: 'klax', title: 'Klax', year: 1989, maker: 'Atari Games',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Left/Right: move paddle \u00b7 Space: drop tile in bin \u00b7 Up/X: flip tile back \u00b7 Down: speed tiles \u00b7 Enter: start',
    marquee: { bg: '#081040', fg: '#ffe020', accent: '#ff2a2a' },
    create(api) {
      const A = api.audio;
      let state = 'title', T = 0, hi = api.getHiScore(50000), lastCred = api.credits, coinFlash = 0;
      let score = 0, wave = 1, goal = null, prog = 0, drops = 0, maxDrops = 3, tiles = [], stack = [], bin = [], padL = 2, padX = 160;
      let stepF = 30, stepT = 0, spawnT = 0, resolving = null, msgs = [], parts = [], falling = [], introT = 0, clearT = 0, overT = 0;
      let waveStart = 0, ncolors = 4, bonus = 0, hurry = 0, tilesCaught = 0, belt = 0;

      function pollCoins() { const c = api.credits; if (c > lastCred) A.tone(1800, 0.06, { vol: 0.08, slideTo: 2400 }); lastCred = c; }
      function tryStart() { if (api.useCredit()) { lastCred = api.credits; return true; } coinFlash = 90; A.tone(98, 0.28, { vol: 0.14 }); return false; }
      function clearBin() { bin = []; for (let r = 0; r < BR; r++) bin.push(new Array(LANES).fill(0)); }
      clearBin();

      function startGame() { score = 0; wave = 1; startWave(); }
      function startWave() {
        const g = GOALS[(wave - 1) % GOALS.length], lap = Math.floor((wave - 1) / GOALS.length);
        goal = { t: g.t, s: g.s, n: g.t === 'points' ? g.n * (1 + lap) : g.t === 'tiles' ? g.n + 10 * lap : g.n + lap * 2 };
        prog = 0; drops = 0; maxDrops = wave <= 5 ? 3 : wave <= 10 ? 4 : 5; tiles = []; stack = []; clearBin(); falling = []; resolving = null;
        stepF = Math.max(9, 30 - (wave - 1) * 2); ncolors = Math.min(7, 3 + Math.ceil(wave / 2)); stepT = 0; spawnT = 40; waveStart = score; tilesCaught = 0;
        padL = 2; padX = laneX(2, ND); state = 'intro'; introT = 0;
        A.melody([[N.C5, .1], [N.E5, .1], [N.G5, .1], [N.C6, .2]], { type: 'square', vol: 0.1 });
      }
      function msg(s, col, big) { msgs.push({ s, col, t: 70, big }); }

      // ---------- conveyor ----------
      function laneFree(l, d) { return !tiles.some(t => t.l === l && t.d === d); }
      function spawnTile() {
        const maxOn = 3 + Math.min(6, Math.floor(wave / 2));
        if (tiles.length >= maxOn) return;
        const ls = [0, 1, 2, 3, 4].filter(l => laneFree(l, 0) && laneFree(l, 1));
        if (!ls.length) return;
        const l = ls[Math.floor(Math.random() * ls.length)];
        const c = wave >= 6 && Math.random() < 0.03 ? WILD : 1 + Math.floor(Math.random() * ncolors);
        tiles.push({ l, d: 0, f: 0, c, moving: false, lip: 0 });
      }
      function stepBelt() {
        // advance from the near end backwards so tiles follow each other
        tiles.sort((a, b) => b.d - a.d);
        for (const t of tiles) {
          if (t.d >= ND) continue;
          if (!t.moving && !tiles.some(o => o !== t && o.l === t.l && o.d === t.d + 1 && !(o.moving && o.d < ND))) t.moving = true;
        }
      }
      function updateTiles(speed) {
        for (const t of tiles) {
          if (t.moving) {
            t.f += speed / stepF;
            if (t.f >= 1) { t.f = 0; t.moving = false; t.d++; if (t.d < ND) A.tone(200 + t.d * 30, 0.025, { type: 'triangle', vol: 0.06 }); }
          }
          if (t.d >= ND) {
            if (padL === t.l && Math.abs(padX - laneX(t.l, ND)) < 6 && stack.length < 5) { catchTile(t); continue; }
            t.lip += speed; if (t.lip > 34) dropTile(t);
          }
        }
        tiles = tiles.filter(t => !t.gone);
      }
      function catchTile(t) {
        t.gone = true; stack.push(t.c); addScore(5); tilesCaught++;
        if (goal.t === 'tiles') prog++;
        A.tone(700, 0.05, { type: 'square', vol: 0.1 }); A.tone(1050, 0.05, { type: 'square', vol: 0.08, delay: 0.04 });
      }
      function dropTile(t) {
        t.gone = true; drops++;
        falling.push({ x: laneX(t.l, ND), y: yAt(ND), vy: 1, c: t.c, t: 60 });
        A.tone(600, 0.5, { type: 'sawtooth', vol: 0.12, slideTo: 80 });
        msg('DROP!', '#ff4040', false);
        if (drops >= maxDrops) { state = 'failing'; overT = 0; }
      }

      // ---------- bin / klax detection ----------
      function findKlax() {
        const m = []; for (let r = 0; r < BR; r++) m.push(new Array(LANES).fill(false));
        const found = [];
        const dirs = [['horiz', 1, 0], ['vert', 0, 1], ['diag', 1, 1], ['diag', 1, -1]];
        for (let col = 1; col <= 7; col++) {
          const ok = (r, c) => r >= 0 && r < BR && c >= 0 && c < LANES && (bin[r][c] === col || bin[r][c] === WILD);
          for (const [kind, dc, dr] of dirs) for (let r = 0; r < BR; r++) for (let c = 0; c < LANES; c++) {
            if (!ok(r, c) || ok(r - dr, c - dc)) continue;
            let len = 0, real = 0; while (ok(r + dr * len, c + dc * len)) { if (bin[r + dr * len][c + dc * len] === col) real++; len++; }
            if (len >= 3 && real > 0) {
              const cells = []; for (let k = 0; k < len; k++) cells.push([r + dr * k, c + dc * k]);
              const key = kind + cells.map(x => x.join(',')).join(';');
              if (found.some(f => f.key === key)) continue;
              found.push({ kind, len, cells, key, col });
              for (const [rr, cc] of cells) m[rr][cc] = true;
            }
          }
        }
        return { m, found };
      }
      const PTS = { vert: [50, 10000, 15000], horiz: [1000, 5000, 10000], diag: [5000, 10000, 20000] };
      function checkBin(combo) {
        const k = findKlax();
        if (!k.found.length) { resolving = null; checkGoal(); return; }
        let pts = 0, nk = 0;
        for (const f of k.found) {
          pts += PTS[f.kind][f.len - 3]; nk += f.len - 2;
          if (goal.t === f.kind) prog += f.len - 2;
        }
        if (k.found.length > 1 || combo > 0) pts *= (k.found.length + combo);
        if (goal.t === 'klax') prog += nk;
        addScore(pts);
        const kinds = k.found.map(f => f.kind);
        msg(kinds.includes('diag') ? 'DIAGONAL KLAX!' : kinds.includes('horiz') ? 'HORIZONTAL KLAX!' : 'KLAX!', '#ffe020', true);
        if (k.found.length > 1) msg(k.found.length + ' WAY KLAX!', '#80ffff', false);
        msgs.push({ s: String(pts), col: '#fff', t: 60, big: false, y: 120 });
        resolving = { m: k.m, t: 0, combo };
        const base = kinds.includes('diag') ? N.G5 : kinds.includes('horiz') ? N.E5 : N.C5;
        A.melody([[base, .07], [base * 1.26, .07], [base * 1.5, .07], [base * 2, .2]], { type: 'square', vol: 0.12 });
        A.noise(0.3, { vol: 0.06, freq: 3000, type: 'bandpass' });
      }
      function stepResolve() {
        const R = resolving; R.t++;
        if (R.t === 30) {
          for (let r = 0; r < BR; r++) for (let c = 0; c < LANES; c++) if (R.m[r][c]) {
            bin[r][c] = 0;
            for (let i = 0; i < 5; i++) parts.push({ x: BIN_X + c * BIN_CW + 17, y: BIN_Y + r * BIN_RH + 6, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 3, t: 30, col: '#fff' });
          }
          for (let c = 0; c < LANES; c++) { let w = BR - 1; for (let r = BR - 1; r >= 0; r--) if (bin[r][c]) { const v = bin[r][c]; bin[r][c] = 0; bin[w][c] = v; w--; } }
          checkBin(R.combo + 1);
        }
      }
      function checkGoal() {
        const done = goal.t === 'points' ? score - waveStart >= goal.n : prog >= goal.n;
        if (done && state === 'play') {
          state = 'waveclear'; clearT = 0;
          let empty = 0; for (const row of bin) for (const v of row) if (!v) empty++;
          bonus = 1000 * wave + empty * 250;
          A.melody([[N.C5, .1], [N.E5, .1], [N.G5, .1], [N.C6, .1], [N.G5, .1], [N.C6, .3]], { type: 'square', vol: 0.12 });
        }
      }
      function addScore(n) { score += n; if (score > hi) hi = score; }
      function dropToBin() {
        if (!stack.length || resolving) return;
        const c = padL; let r = -1; for (let rr = BR - 1; rr >= 0; rr--) if (!bin[rr][c]) { r = rr; break; }
        if (r < 0) { A.tone(110, 0.15, { type: 'square', vol: 0.12 }); msg('BIN FULL', '#ff8040', false); return; }
        const v = stack.pop(); bin[r][c] = v;
        falling.push({ bin: true, c, r, y: PAD_Y, ty: BIN_Y + r * BIN_RH, v });
        A.tone(400, 0.08, { type: 'triangle', vol: 0.15, slideTo: 200 });
        checkBin(0);
      }
      function flipBack() {
        if (!stack.length) return;
        let d = -1; for (let dd = 0; dd < ND - 1; dd++) if (laneFree(padL, dd)) { d = dd; break; }
        if (d < 0) return;
        tiles.push({ l: padL, d, f: 0, c: stack.pop(), moving: false, lip: 0 });
        A.tone(300, 0.1, { type: 'square', vol: 0.1, slideTo: 900 });
      }

      function updatePlay() {
        if (api.pressed('ArrowLeft') && padL > 0) padL--;
        if (api.pressed('ArrowRight') && padL < LANES - 1) padL++;
        const tx = laneX(padL, ND); padX += Math.sign(tx - padX) * Math.min(Math.abs(tx - padX), 7);
        if (api.pressed('Space')) dropToBin();
        if (api.anyPressed('ArrowUp', 'KeyX', 'KeyZ')) flipBack();
        const speed = api.key('ArrowDown') ? 3 : 1;
        belt += speed;
        stepT += speed; if (stepT >= stepF) { stepT = 0; stepBelt(); }
        spawnT -= speed; if (spawnT <= 0) { spawnTile(); spawnT = stepF * (1.6 + Math.random() * 1.6); }
        if (!tiles.length && spawnT > 20) spawnT = 20;
        updateTiles(speed);
        if (resolving) stepResolve(); else if (goal.t === 'points' || goal.t === 'tiles') checkGoal();
      }
      function update() {
        T++; pollCoins(); if (coinFlash > 0) coinFlash--;
        for (const m of msgs) m.t--; msgs = msgs.filter(m => m.t > 0);
        for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.t--; } parts = parts.filter(p => p.t > 0);
        for (const f of falling) { if (f.bin) { f.y += 6; if (f.y >= f.ty) f.done = true; } else { f.y += f.vy; f.vy += 0.3; f.t--; if (f.t <= 0) f.done = true; } }
        falling = falling.filter(f => !f.done);
        switch (state) {
          case 'title':
            if (api.anyPressed('Enter', 'Space') && tryStart()) startGame();
            break;
          case 'intro':
            introT++; belt++;
            if (introT > 150 || (introT > 40 && api.anyPressed('Space', 'Enter'))) state = 'play';
            break;
          case 'play': updatePlay(); break;
          case 'waveclear':
            clearT++;
            if (clearT === 60) addScore(bonus);
            if (clearT > 200) { wave++; startWave(); }
            break;
          case 'failing':
            overT++;
            if (overT === 60) {
              A.melody([[N.G4, .2], [N.E4, .2], [N.C4, .4]], { type: 'triangle', vol: 0.18 });
              const end = () => { state = 'over'; overT = 0; api.setHiScore(score); };
              if (api.offerContinue) api.offerContinue(() => { startWave(); }, end); else end();
            }
            break;
          case 'over':
            overT++;
            if (overT > 300 || (overT > 90 && api.anyPressed('Enter', 'Space'))) { state = 'title'; T = 0; }
            break;
        }
      }

      // ---------- render ----------
      function tileBox(ctx, cx, yTop, w, depth, thick, c, flash) {
        const p = TCOL[c === WILD ? 1 + ((T >> 2) % 7) : c];
        const x = Math.round(cx - w / 2);
        ctx.fillStyle = flash ? '#fff' : p[0]; ctx.fillRect(x, Math.round(yTop), Math.round(w), Math.max(1, Math.round(depth)));
        ctx.fillStyle = flash ? '#ccc' : p[1]; ctx.fillRect(x, Math.round(yTop), Math.round(w), 1); ctx.fillRect(x, Math.round(yTop), 1, Math.max(1, Math.round(depth)));
        ctx.fillStyle = flash ? '#999' : p[2]; ctx.fillRect(x, Math.round(yTop + depth), Math.round(w), Math.max(1, Math.round(thick)));
        if (c === WILD) { ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(cx) - 1, Math.round(yTop), 2, Math.max(1, Math.round(depth))); }
      }
      function drawConveyor(ctx) {
        // rails and belt
        const y0 = yAt(0), y1 = yAt(ND);
        ctx.fillStyle = '#383848';
        ctx.beginPath(); ctx.moveTo(160 - hwAt(0) - 6, y0 - 4); ctx.lineTo(160 + hwAt(0) + 6, y0 - 4); ctx.lineTo(160 + hwAt(ND) + 8, y1 + 4); ctx.lineTo(160 - hwAt(ND) - 8, y1 + 4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#14141c';
        ctx.beginPath(); ctx.moveTo(160 - hwAt(0), y0); ctx.lineTo(160 + hwAt(0), y0); ctx.lineTo(160 + hwAt(ND), y1); ctx.lineTo(160 - hwAt(ND), y1); ctx.closePath(); ctx.fill();
        // moving cross stripes
        const ph = (belt / stepF) % 1;
        for (let d = 0; d < ND; d++) {
          const dd = d + ph, y = Math.round(yAt(dd));
          ctx.fillStyle = d % 2 ? '#22222e' : '#2a2a38';
          ctx.fillRect(Math.round(160 - hwAt(dd)), y, Math.round(2 * hwAt(dd)), 1);
        }
        // lane dividers
        ctx.strokeStyle = '#4a4a66'; ctx.lineWidth = 1;
        for (let l = 0; l <= LANES; l++) {
          const xa = 160 + (l - 2.5) * (2 * hwAt(0) / LANES), xb = 160 + (l - 2.5) * (2 * hwAt(ND) / LANES);
          ctx.beginPath(); ctx.moveTo(xa + 0.5, y0); ctx.lineTo(xb + 0.5, y1); ctx.stroke();
        }
        // rail lights
        for (let d = 0; d <= ND; d++) {
          const on = ((T >> 3) + d) % 4 === 0;
          ctx.fillStyle = on ? '#ffe060' : '#806020';
          ctx.fillRect(Math.round(160 - hwAt(d) - 5), Math.round(yAt(d)) - 1, 2, 2); ctx.fillRect(Math.round(160 + hwAt(d) + 3), Math.round(yAt(d)) - 1, 2, 2);
        }
        // the far machine that feeds tiles
        ctx.fillStyle = '#505070'; ctx.fillRect(160 - 54, y0 - 18, 108, 14);
        ctx.fillStyle = '#7070a0'; ctx.fillRect(160 - 54, y0 - 18, 108, 2);
        ctx.fillStyle = '#000'; ctx.fillRect(160 - 46, y0 - 8, 92, 4);
      }
      function drawTiles(ctx) {
        const list = tiles.slice().sort((a, b) => (a.d + a.f) - (b.d + b.f));
        for (const t of list) {
          const p = Math.min(ND, t.d + t.f), lw = 2 * hwAt(p) / LANES;
          const w = lw - 4, depthFlat = (yAt(Math.min(ND, p + 1)) - yAt(p)) * 0.85 || 6, thick = 2 + 3 * p / ND;
          const ph = t.moving ? t.f : 0;
          const lift = Math.sin(ph * Math.PI) * (6 + 6 * p / ND);
          const dep = Math.max(2, depthFlat * Math.abs(Math.cos(ph * Math.PI)) + thick * Math.abs(Math.sin(ph * Math.PI)) * 2.2);
          let yTop = yAt(p) - lift + 1;
          if (t.d >= ND) yTop = yAt(ND) - depthFlat + 2 + Math.sin(t.lip * 0.5) * 1.5;
          tileBox(ctx, laneX(t.l, p), yTop, w, dep, thick, t.c, t.d >= ND && (t.lip >> 2) & 1);
        }
      }
      function drawPaddle(ctx) {
        const x = Math.round(padX);
        ctx.fillStyle = '#c0c0d8'; ctx.fillRect(x - 17, PAD_Y, 34, 4);
        ctx.fillStyle = '#606078'; ctx.fillRect(x - 17, PAD_Y + 4, 34, 3);
        ctx.fillStyle = '#ff4040'; ctx.fillRect(x - 17, PAD_Y + 1, 2, 2); ctx.fillRect(x + 15, PAD_Y + 1, 2, 2);
        for (let i = 0; i < stack.length; i++) tileBox(ctx, x, PAD_Y - 6 - i * 5, 30, 3, 2, stack[i]);
        // arrow showing the target column
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x - 1, PAD_Y + 8, 2, 6);
      }
      function drawBin(ctx) {
        ctx.fillStyle = '#5a5a78'; ctx.fillRect(BIN_X - 5, BIN_Y - 4, BIN_CW * LANES + 10, BR * BIN_RH + 8);
        ctx.fillStyle = '#0c0c18'; ctx.fillRect(BIN_X, BIN_Y, BIN_CW * LANES, BR * BIN_RH + 2);
        ctx.fillStyle = '#181828'; for (let c = 1; c < LANES; c++) ctx.fillRect(BIN_X + c * BIN_CW, BIN_Y, 1, BR * BIN_RH);
        ctx.fillStyle = '#8888aa'; ctx.fillRect(BIN_X - 5, BIN_Y - 4, BIN_CW * LANES + 10, 1);
        const anim = new Set(falling.filter(f => f.bin).map(f => f.r + ',' + f.c));
        for (let r = 0; r < BR; r++) for (let c = 0; c < LANES; c++) {
          const v = bin[r][c]; if (!v || anim.has(r + ',' + c)) continue;
          const fl = resolving && resolving.m[r][c] && ((resolving.t >> 2) & 1);
          tileBox(ctx, BIN_X + c * BIN_CW + 17, BIN_Y + r * BIN_RH + 1, 32, 8, 3, v, fl);
        }
        for (const f of falling) if (f.bin) tileBox(ctx, BIN_X + f.c * BIN_CW + 17, Math.min(f.y, f.ty) + 1, 32, 8, 3, f.v);
      }
      function drawHUD(ctx) {
        txt(ctx, 'SCORE', 8, 6, '#ffe020'); txt(ctx, String(score), 8, 16, '#fff');
        txtR(ctx, 'HIGH', 312, 6, '#ffe020'); txtR(ctx, String(hi), 312, 16, '#fff');
        txt(ctx, 'WAVE ' + wave, 8, 34, '#80ffff');
        if (goal) {
          txt(ctx, 'GOAL', 8, 52, '#ffe020');
          const left = goal.t === 'points' ? Math.max(0, goal.n - (score - waveStart)) : Math.max(0, goal.n - prog);
          txt(ctx, String(left), 8, 62, '#fff'); txt(ctx, goal.s, 8, 72, '#fff');
          txt(ctx, 'TO GO', 8, 82, '#a0a0c0');
        }
        txtR(ctx, 'DROPS', 312, 34, '#ffe020');
        for (let i = 0; i < maxDrops; i++) {
          const x = 300 - i * 14, y = 46, on = i < drops;
          ctx.fillStyle = on ? ((T >> 3) & 1 ? '#ff3030' : '#a01010') : '#203020'; ctx.fillRect(x, y, 10, 10);
          ctx.fillStyle = on ? '#ffa0a0' : '#305030'; ctx.fillRect(x + 1, y + 1, 3, 3);
        }
        txtR(ctx, 'TILES ' + tilesCaught, 312, 66, '#a0a0c0');
        txt(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 8, 228, '#606080');
      }
      function drawBackground(ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#000018'); g.addColorStop(1, '#101040');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 40; i++) { const x = (i * 131 + (T >> 3)) % W, y = (i * 71) % 150; if (((T >> 4) + i) % 7) ctx.fillRect(x, y, 1, 1); }
      }
      function drawLogo(ctx, cx, y, sc) {
        const s = 'KLAX', cols = [4, 3, 2, 1];
        let x = cx - tw(s, sc) / 2;
        for (let i = 0; i < 4; i++) {
          const g = FONT[s[i]];
          for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r] & (16 >> c)) {
            const bounce = Math.round(Math.sin(T / 10 + i + r * 0.2) * 1.5);
            tileBox(ctx, x + c * sc + sc / 2, y + r * sc + bounce, sc - 1, sc - 3, 2, cols[i]);
          }
          x += 6 * sc;
        }
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        drawBackground(ctx);
        if (state === 'title') {
          drawLogo(ctx, W / 2, 24, 12);
          txtC(ctx, "IT'S THE 90'S, AND THERE IS", W / 2, 118, '#80ffff');
          txtC(ctx, 'TIME FOR KLAX.', W / 2, 128, '#80ffff');
          const tt = T % 600;
          if (tt < 300) {
            txtC(ctx, 'CATCH THE TILES ON THE PADDLE.', W / 2, 146, '#fff');
            txtC(ctx, 'DROP THEM IN THE BIN TO MAKE', W / 2, 156, '#fff');
            txtC(ctx, '3 IN A ROW OF ONE COLOUR.', W / 2, 166, '#fff');
          } else {
            txtC(ctx, 'VERTICAL      50', W / 2, 146, '#fff');
            txtC(ctx, 'HORIZONTAL  1000', W / 2, 156, '#fff');
            txtC(ctx, 'DIAGONAL    5000', W / 2, 166, '#fff');
          }
          txtC(ctx, 'HIGH SCORE ' + hi, W / 2, 182, '#ffe020');
          if (api.credits > 0) { if ((T >> 5) & 1) txtC(ctx, 'PUSH START', W / 2, 200, '#fff'); }
          else if (coinFlash > 0 ? ((T >> 2) & 1) : ((T >> 5) & 1)) txtC(ctx, 'INSERT COIN', W / 2, 200, coinFlash > 0 ? '#ff4040' : '#fff');
          txtC(ctx, '\u00a9 1989 ATARI GAMES', W / 2, 216, '#8080a0');
          txtC(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W / 2, 228, '#8080a0');
          return;
        }
        drawConveyor(ctx); drawBin(ctx); drawTiles(ctx); drawPaddle(ctx);
        for (const f of falling) if (!f.bin) tileBox(ctx, f.x, f.y, 26, 6, 3, f.c);
        for (const p of parts) { ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); }
        drawHUD(ctx);
        let my = 96;
        for (const m of msgs) {
          if (m.big) { if ((m.t >> 2) & 1) txtS(ctx, m.s, W / 2, 98, m.col, 2); }
          else { txtS(ctx, m.s, W / 2, m.y || my, m.col); if (!m.y) my += 10; }
        }
        if (state === 'intro') {
          ctx.fillStyle = 'rgba(0,0,30,0.75)'; ctx.fillRect(60, 60, 200, 70);
          ctx.strokeStyle = '#ffe020'; ctx.strokeRect(60.5, 60.5, 199, 69);
          txtC(ctx, 'WAVE ' + wave, W / 2, 68, '#ffe020', 2);
          txtC(ctx, goal.t === 'tiles' ? 'CATCH ' + goal.n + ' TILES' : 'GET ' + goal.n + ' ' + goal.s, W / 2, 92, '#fff');
          txtC(ctx, maxDrops + ' DROPS ALLOWED', W / 2, 106, '#80ffff');
          if ((introT >> 4) & 1) txtC(ctx, 'READY', W / 2, 118, '#ff8040');
        }
        if (state === 'waveclear') {
          ctx.fillStyle = 'rgba(0,0,30,0.75)'; ctx.fillRect(60, 60, 200, 60);
          txtC(ctx, 'WAVE ' + wave + ' COMPLETE', W / 2, 70, '#ffe020', 1);
          if (clearT > 30) txtC(ctx, 'BONUS ' + bonus, W / 2, 88, '#fff');
        }
        if (state === 'failing' && (overT >> 3) & 1) txtS(ctx, 'DROP METER FULL', W / 2, 110, '#ff4040', 1);
        if (state === 'over') { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 96, W, 30); txtC(ctx, 'GAME OVER', W / 2, 104, '#ff4040', 2); }
      }
      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
