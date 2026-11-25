// Targ (Exidy, 1980) \u2014 from-scratch recreation for the MAME32 Game Room. Procedural art, synthesized sound.
(function () {
  'use strict';
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
    ':': '000C0C000C0C00', '/': '00010204081000', '"': '0A0A0000000000', "'": '04040000000000',
    '?': '0E110102040004', '\u00a9': '0E11171417110E', '(': '02040808080402', ')': '08040202020408',
    ',': '000000000C0408', '=': '00001F001F0000', '>': '08040201020408', '<': '02040810080402',
    '+': '0004041F040400', '*': '0004150E150400', '#': '0A0A1F0A1F0A0A'
  };
  const FONT = {};
  for (const k in FONT_HEX) { const s = FONT_HEX[k]; const a = []; for (let i = 0; i < 7; i++) a.push(parseInt(s.substr(i * 2, 2), 16) || 0); FONT[k] = a; }
  // txt(ctx, str, x, y, colour, scale): 8px cells (times scale), bold strokes
  function txt(ctx, s, x, y, col, sc) {
    sc = sc || 1; ctx.fillStyle = col; s = String(s).toUpperCase();
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) { const b = g[r]; if (!b) continue; for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + i * 8 * sc + c * sc, y + r * sc, sc + 1, sc); }
    }
  }
  const textW = (s, sc) => String(s).length * 8 * (sc || 1) - 2 * (sc || 1);
  function ctxt(ctx, s, cx, y, col, sc) { txt(ctx, s, Math.round(cx - textW(s, sc) / 2), y, col, sc); }
  function rtxt(ctx, s, rx, y, col, sc) { txt(ctx, s, Math.round(rx - textW(s, sc)), y, col, sc); }
  const D3 = ['75557', '26227', '71747', '71717', '55711', '74717', '74757', '71111', '75757', '75717'];
  function tinyNum(ctx, n, cx, cy, col) {
    const s = String(n); const w = s.length * 4 - 1; let x = Math.round(cx - w / 2); ctx.fillStyle = col;
    for (const ch of s) { const g = D3[+ch]; if (g) for (let r = 0; r < 5; r++) { const b = parseInt(g[r], 16); for (let c = 0; c < 3; c++) if (b & (4 >> c)) ctx.fillRect(x + c, Math.round(cy) - 2 + r, 1, 1); } x += 4; }
  }

  // ================= Sprite helpers =================
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function sprite(rows, pal) {
    const h = rows.length, w = Math.max.apply(null, rows.map(r => r.length)), cv = mkCanvas(w, h), c = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) { const p = pal[rows[y][x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } }
    return cv;
  }
  const flipRows = rows => rows.map(r => r.split('').reverse().join(''));
  const vflipRows = rows => rows.slice().reverse();
  const rotRows = rows => { const h = rows.length, w = rows[0].length, out = []; for (let x = 0; x < w; x++) { let s = ''; for (let y = h - 1; y >= 0; y--) s += rows[y][x] || '.'; out.push(s); } return out; }; // clockwise
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rand = (a, b) => a + Math.random() * (b - a);
  const irand = n => Math.floor(Math.random() * n);
  const pick = a => a[irand(a.length)];
  const pad = (n, l) => String(n).padStart(l, '0');

  // ================= Coin-op helper =================
  function makeCoin(api) {
    const A = api.audio; let last = api.credits, flash = 0;
    return {
      tick() { const c = api.credits; if (c > last) A.tone(1800, 0.06, { type: 'square', vol: 0.08, slideTo: 2400 }); last = c; if (flash > 0) flash--; },
      tryStart() {
        if (api.useCredit()) { last = api.credits; return true; }
        flash = 90; A.tone(98, 0.28, { type: 'square', vol: 0.14 }); A.tone(73, 0.28, { type: 'sawtooth', vol: 0.08 }); return false;
      },
      prompt(ctx, cx, y, T, c1, c2) {
        if (api.credits > 0 && !flash) { if ((T >> 5) & 1) ctxt(ctx, 'PUSH START', cx, y, c1 || '#fff'); }
        else if (flash ? (api.frame >> 2) & 1 : (T >> 5) & 1) ctxt(ctx, 'INSERT COIN', cx, y, flash ? '#ff3030' : (c2 || c1 || '#fff'));
      },
      credit(ctx, x, y, col) { txt(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), x, y, col || '#fff'); }
    };
  }
  const W = 256, H = 224, GX = 8, GY = 6, SP = 32, X0 = 16, Y0 = 32;
  const DX = [0, -1, 0, 1], DY = [-1, 0, 1, 0];
  const KEYS = ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];
  const nx = i => X0 + SP * i, ny = j => Y0 + SP * j;
  const XMAX = nx(GX - 1), YMAX = ny(GY - 1);
  const onNode = e => (e.x - X0) % SP === 0 && (e.y - Y0) % SP === 0;
  const inside = (x, y) => x >= X0 && x <= XMAX && y >= Y0 && y <= YMAX;
  // sprites drawn facing UP; rotated for other directions
  const WUMMEL = ['...ww...', '.wwccww.', 'bwccccwb', 'bwwwwwwb', '.wwrrww.', 'bwwwwwwb', 'bwwwwwwb', '.rr..rr.'];
  const TARG_A = ['g..gg..g', '.gggggg.', 'gwkggwkg', 'gggggggg', '.gyyyyg.', 'gggggggg', 'g.g..g.g', '.g....g.'];
  const TARG_B = ['.g.gg.g.', 'g.gggg.g', 'gkwggkwg', 'gggggggg', '.gyyyyg.', 'gggggggg', '.g.gg.g.', 'g......g'];
  const SPECTAR = ['....pppp....', '..pppppppp..', '.ppwwppwwpp.', 'pppppppppppp', 'yy.yy..yy.yy', '.pppppppppp.'];

  ArcadeRegistry.register({
    id: 'targ', title: 'Targ', year: 1980, maker: 'Exidy',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: steer the Wummel \u00b7 Space/X: fire forward \u00b7 Enter: start',
    marquee: { bg: '#000018', fg: '#30ff60', accent: '#ff3030' },
    create(api) {
      const A0 = api.audio, coin = makeCoin(api); let demo = false;
      const A = { tone: (...a) => { if (!demo) A0.tone(...a); }, noise: (...a) => { if (!demo) A0.noise(...a); }, melody: (...a) => demo ? 0 : A0.melody(...a) };
      const rot = (rows, d) => { let r = rows; for (let k = 0; k < [0, 3, 2, 1][d]; k++) r = rotRows(r); return r; };
      const WSPR = [0, 1, 2, 3].map(d => sprite(rot(WUMMEL, d), { w: '#ffffff', c: '#40c0ff', b: '#808080', r: '#ff3030' }));
      const TCOLS = ['#30ff60', '#ffe040', '#ff60ff', '#40e0ff'];
      const TSPR = TCOLS.map(col => [TARG_A, TARG_B].map(f => [0, 1, 2, 3].map(d => sprite(rot(f, d), { g: col, w: '#fff', k: '#000', y: '#ff3030' }))));
      const SSPR = sprite(SPECTAR, { p: '#c060ff', w: '#ffffff', y: '#ffe040' });
      const CITY = buildCity();

      let hi = api.getHiScore(1000);
      let state = 'title', T = 0, titleT = 0, score = 0, lives = 3, wave = 1, nextLife = 2000;
      let car, shot, targs, toSpawn, total, killed, spawnT, spectar, specT, booms, popups, engT = 0, waveT = 0;

      function buildCity() {
        const cv = mkCanvas(W, H), c = cv.getContext('2d'), cols = [['#1838a8', '#5080ff'], ['#a83818', '#ff9050'], ['#187838', '#50e080']];
        c.fillStyle = '#101010'; c.fillRect(X0 - 8, Y0 - 8, XMAX - X0 + 16, YMAX - Y0 + 16);
        for (let j = 0; j < GY - 1; j++) for (let i = 0; i < GX - 1; i++) {
          const x = nx(i) + 6, y = ny(j) + 6, w = SP - 12, k = (i * 7 + j * 3) % 3, [f, e] = cols[k];
          c.fillStyle = e; c.fillRect(x, y, w, w); c.fillStyle = f; c.fillRect(x + 1, y + 1, w - 2, w - 2);
          c.fillStyle = '#000'; for (let yy = y + 4; yy < y + w - 3; yy += 5) for (let xx = x + 4; xx < x + w - 3; xx += 5) c.fillRect(xx, yy, 2, 2);
          c.fillStyle = '#ffe080'; for (let n = 0; n < 4; n++) { const xx = x + 4 + ((i * 13 + j * 7 + n * 5) % 3) * 5, yy = y + 4 + ((i * 3 + j * 11 + n * 7) % 3) * 5; c.fillRect(xx, yy, 2, 2); }
        }
        // road markings
        c.fillStyle = '#404040';
        for (let j = 0; j < GY; j++) for (let x = X0; x < XMAX; x += 6) c.fillRect(x, ny(j), 3, 1);
        for (let i = 0; i < GX; i++) for (let y = Y0; y < YMAX; y += 6) c.fillRect(nx(i), y, 1, 3);
        c.strokeStyle = '#c0c0c0'; c.lineWidth = 1; c.strokeRect(X0 - 8.5, Y0 - 8.5, XMAX - X0 + 17, YMAX - Y0 + 17);
        return cv;
      }
      const P = () => ({ base: Math.min(1.05, 0.5 + wave * 0.07), chase: Math.min(0.75, 0.3 + wave * 0.06), maxOn: Math.min(7, 4 + Math.floor(wave / 2)), count: Math.min(16, 9 + wave) });
      function resetActors() {
        car = { x: nx(3), y: ny(GY - 1), dir: 3, want: 3, acc: 0, anim: 0 };
        shot = null; spectar = null; specT = 900 + irand(600); booms = []; spawnT = 60;
        if (targs) { toSpawn += targs.length; targs = []; }
      }
      function startWave() { targs = []; total = P().count; toSpawn = total; killed = 0; waveT = 0; resetActors(); state = 'ready'; T = 0; }
      function startGame(isDemo) {
        demo = !!isDemo; score = 0; lives = 3; wave = 1; nextLife = 2000; popups = []; targs = null;
        startWave(); A.melody([[262, .1], [330, .1], [392, .1], [523, .2], [392, .1], [523, .3]], { type: 'square', vol: 0.11 });
      }
      function addScore(n) {
        if (demo) return; score += n; if (score > hi) hi = score;
        if (score >= nextLife) { nextLife += 5000; lives++; A.melody([[1046, .08], [1318, .08], [1568, .08], [2093, .2]], { vol: 0.1 }); }
      }

      // ---------------- movement ----------------
      function carStep() {
        const c = car;
        if (c.want === (c.dir + 2) % 4) c.dir = c.want;
        if (onNode(c)) {
          if (inside(c.x + DX[c.want] * SP, c.y + DY[c.want] * SP)) c.dir = c.want;
          if (!inside(c.x + DX[c.dir] * SP, c.y + DY[c.dir] * SP)) return;
        }
        c.x += DX[c.dir]; c.y += DY[c.dir]; c.anim++;
      }
      function targStep(t, p) {
        if (onNode(t)) {
          const back = (t.dir + 2) % 4, opts = [];
          for (let d = 0; d < 4; d++) if (d !== back && inside(t.x + DX[d] * SP, t.y + DY[d] * SP)) opts.push(d);
          if (!opts.length) t.dir = back;
          else if (Math.random() < p.chase + (t.last ? 0.25 : 0)) {
            let best = 1e9; for (const d of opts) { const dd = Math.hypot(t.x + DX[d] * SP - car.x, t.y + DY[d] * SP - car.y); if (dd < best) { best = dd; t.dir = d; } }
          } else t.dir = pick(opts);
        }
        t.x += DX[t.dir]; t.y += DY[t.dir]; t.anim++;
      }
      function spawnTarg() {
        const corners = [[0, 0], [GX - 1, 0], [0, GY - 1], [GX - 1, GY - 1], [0, 2], [GX - 1, 3]];
        let best = corners[0], bd = -1;
        for (const cn of corners) { const d = Math.hypot(nx(cn[0]) - car.x, ny(cn[1]) - car.y) + Math.random() * 60; if (d > bd) { bd = d; best = cn; } }
        const t = { x: nx(best[0]), y: ny(best[1]), dir: best[1] === 0 ? 2 : 0, acc: 0, anim: 0, born: 50, col: irand(4) };
        targs.push(t); toSpawn--;
        A.tone(150, 0.4, { type: 'sawtooth', vol: 0.07, slideTo: 600 });
      }
      function boom(x, y, big) { booms.push({ x, y, t: 0, big }); A.noise(big ? 0.7 : 0.3, { vol: big ? 0.25 : 0.16, freq: big ? 900 : 2000, slideTo: 100 }); }

      // ---------------- play ----------------
      function updatePlay() {
        const p = P(); waveT++;
        let fire;
        if (demo) fire = demoDrive();
        else {
          for (let d = 0; d < 4; d++) if (api.key(KEYS[d])) car.want = d;
          for (let d = 0; d < 4; d++) if (api.pressed(KEYS[d])) car.want = d;
          fire = api.anyPressed('Space', 'KeyX');
        }
        car.acc += 1.15; while (car.acc >= 1) { car.acc -= 1; carStep(); }
        if (fire && !shot) {
          shot = { x: car.x + DX[car.dir] * 5, y: car.y + DY[car.dir] * 5, dir: car.dir };
          A.tone(1800, 0.12, { type: 'square', vol: 0.09, slideTo: 300 });
        }
        if (shot) {
          for (let s = 0; s < 4 && shot; s++) {
            shot.x += DX[shot.dir]; shot.y += DY[shot.dir];
            if (shot.x < X0 - 6 || shot.x > XMAX + 6 || shot.y < Y0 - 6 || shot.y > YMAX + 6) { shot = null; break; }
            for (const t of targs) if (!t.dead && t.born <= 0 && Math.abs(t.x - shot.x) < 6 && Math.abs(t.y - shot.y) < 6) {
              t.dead = true; killed++; const v = 10 * wave; addScore(v); popups.push({ x: t.x, y: t.y, v, t: 45 }); boom(t.x, t.y, false); shot = null; break;
            }
            if (shot && spectar && Math.abs(spectar.x - shot.x) < 8 && Math.abs(spectar.y - shot.y) < 6) {
              const v = Math.min(1000, 100 * wave); addScore(v); popups.push({ x: spectar.x, y: spectar.y, v, t: 90 }); boom(spectar.x, spectar.y, false);
              A.melody([[1046, .06], [1318, .06], [1568, .06], [2093, .12]], { type: 'square', vol: 0.1 }); spectar = null; shot = null;
            }
          }
        }
        targs = targs.filter(t => !t.dead);
        const remaining = targs.length + toSpawn;
        if (toSpawn > 0 && targs.length < p.maxOn && --spawnT <= 0) { spawnTarg(); spawnT = 70; }
        const urge = (1 - remaining / total) * 0.55 + Math.min(0.2, waveT / 60 * 0.004);
        for (const t of targs) {
          t.last = remaining === 1;
          if (t.born > 0) { t.born--; continue; }
          t.acc += p.base + urge + (t.last ? 0.25 : 0);
          while (t.acc >= 1) { t.acc -= 1; targStep(t, p); }
          if (Math.abs(t.x - car.x) < 7 && Math.abs(t.y - car.y) < 7) { die(); return; }
        }
        // spectar smuggler
        if (!spectar) { if (--specT <= 0) { const left = Math.random() < 0.5, j = irand(GY); spectar = { x: left ? X0 - 10 : XMAX + 10, y: ny(j), vx: left ? 1.4 : -1.4 }; } }
        else {
          spectar.x += spectar.vx;
          if ((api.frame & 15) === 0) A.tone(api.frame & 16 ? 880 : 1175, 0.1, { type: 'triangle', vol: 0.06 });
          if (spectar.x < X0 - 20 || spectar.x > XMAX + 20) { spectar = null; specT = 900 + irand(600); }
        }
        // engine / heartbeat
        if (--engT <= 0) { engT = Math.max(8, Math.round(26 * remaining / total) + 6); A.tone(55 + (total - remaining) * 3, 0.08, { type: 'square', vol: 0.07 }); }
        if (remaining === 0) { state = 'wavecleared'; T = 0; A.melody([[523, .08], [659, .08], [784, .08], [1046, .08], [784, .08], [1046, .25]], { type: 'square', vol: 0.12 }); }
      }
      // attract-mode autopilot: line up with the nearest Targ and shoot when one is dead ahead
      function demoDrive() {
        const live = targs.filter(t => t.born <= 0);
        const ahead = t => car.dir === 1 || car.dir === 3 ? Math.abs(t.y - car.y) < 4 && (t.x - car.x) * DX[car.dir] > 0 : Math.abs(t.x - car.x) < 4 && (t.y - car.y) * DY[car.dir] > 0;
        if (onNode(car) && live.length) {
          let n = live[0], bd = 1e9; for (const t of live) { const d = Math.hypot(t.x - car.x, t.y - car.y); if (d < bd) { bd = d; n = t; } }
          const dx = n.x - car.x, dy = n.y - car.y;
          car.want = Math.random() < 0.15 ? irand(4) : Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 3) : (dy < 0 ? 0 : 2);
        }
        return live.some(ahead) && Math.random() < 0.3;
      }
      function die() { state = 'dying'; T = 0; boom(car.x, car.y, true); }

      function update() {
        T++; coin.tick();
        if (popups) { for (const pp of popups) pp.t--; popups = popups.filter(pp => pp.t > 0); }
        if (booms) { for (const b of booms) b.t++; booms = booms.filter(b => b.t < (b.big ? 70 : 30)); }
        switch (state) {
          case 'title': titleT++; if (api.anyPressed('Enter', 'Space') && coin.tryStart()) startGame(false); else if (titleT > 720) startGame(true); break;
          case 'ready': if (demo && api.anyPressed('Enter', 'Space')) { toTitle(); break; } if (T >= (demo ? 50 : 100)) { state = 'play'; T = 0; } break;
          case 'play': if (demo && (api.anyPressed('Enter', 'Space') || T > 1800)) { toTitle(); break; } updatePlay(); break;
          case 'dying':
            if (demo && T >= 100) { toTitle(); break; }
            if (T >= 130) {
              const respawn = () => { resetActors(); state = 'ready'; T = 0; };
              const over = () => { state = 'gameover'; T = 0; api.setHiScore(score); };
              if (lives <= 1) { lives = 0; if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, over); else over(); }
              else { lives--; respawn(); }
            }
            break;
          case 'wavecleared': if (T >= 150) { if (demo) { toTitle(); break; } wave++; startWave(); } break;
          case 'gameover': if (T >= 200 || (T > 60 && api.anyPressed('Enter'))) toTitle(); break;
        }
      }
      function toTitle() { state = 'title'; T = 0; titleT = 0; demo = false; }

      // ---------------- render ----------------
      function drawBoom(ctx, b) {
        const r = b.big ? b.t * 0.5 : b.t * 0.45, n = b.big ? 14 : 8;
        for (let i = 0; i < n; i++) {
          const a = i / n * Math.PI * 2 + b.t * 0.05, rr = r * (0.6 + ((i * 7) % 5) / 10);
          ctx.fillStyle = ['#ffffff', '#ffe040', '#ff8020', '#ff3030'][(i + (b.t >> 2)) & 3];
          ctx.fillRect(Math.round(b.x + Math.cos(a) * rr) - 1, Math.round(b.y + Math.sin(a) * rr) - 1, 2, 2);
        }
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        txt(ctx, 'SCORE', 8, 2, '#30ff60'); txt(ctx, pad(score, 5), 8, 11, '#fff');
        ctxt(ctx, 'HIGH', 128, 2, '#30ff60'); ctxt(ctx, pad(hi, 5), 128, 11, '#fff');
        if (state === 'title') { renderTitle(ctx); return; }
        rtxt(ctx, 'WAVE', 248, 2, '#30ff60'); rtxt(ctx, String(wave), 248, 11, '#fff');
        ctx.drawImage(CITY, 0, 0);
        if (spectar) ctx.drawImage(SSPR, Math.round(spectar.x - 6), Math.round(spectar.y - 3));
        for (const t of targs) {
          if (t.born > 0) { if ((t.born >> 2) & 1) { ctx.strokeStyle = TCOLS[t.col]; ctx.strokeRect(t.x - 4.5 - (t.born >> 3), t.y - 4.5 - (t.born >> 3), 9 + (t.born >> 2), 9 + (t.born >> 2)); } continue; }
          ctx.drawImage(TSPR[t.col][(t.anim >> 3) & 1][t.dir], t.x - 4, t.y - 4);
        }
        if (state !== 'dying' && state !== 'gameover') ctx.drawImage(WSPR[car.dir], car.x - 4, car.y - 4);
        if (shot) { ctx.fillStyle = '#ffff60'; if (DX[shot.dir]) ctx.fillRect(shot.x - 3, shot.y, 6, 1); else ctx.fillRect(shot.x, shot.y - 3, 1, 6); }
        for (const b of booms) drawBoom(ctx, b);
        for (const pp of popups) tinyNum(ctx, pp.v, pp.x, pp.y - 8, '#ffffff');
        // footer
        const yb = YMAX + 12;
        for (let i = 0; i < Math.min(lives - 1, 6); i++) ctx.drawImage(WSPR[0], 8 + i * 12, yb);
        const remaining = targs.length + toSpawn;
        txt(ctx, 'TARGS', 112, yb, '#30ff60'); txt(ctx, pad(remaining, 2), 160, yb, '#ffffff');
        if (demo && (api.frame >> 5) & 1) { ctx.fillStyle = '#000'; ctx.fillRect(96, ny(3) + 8, 64, 18); ctxt(ctx, 'DEMO', 128, ny(3) + 13, '#ffffff'); }
        if (state === 'ready') { ctx.fillStyle = '#000'; ctx.fillRect(80, ny(2) + 8, 96, 18); ctxt(ctx, 'WAVE ' + wave, 128, ny(2) + 13, '#ffe040'); }
        if (state === 'wavecleared') { ctx.fillStyle = '#000'; ctx.fillRect(56, ny(2) + 8, 144, 18); ctxt(ctx, 'WAVE CLEARED', 128, ny(2) + 13, '#30ff60'); }
        if (state === 'gameover') { ctx.fillStyle = '#000'; ctx.fillRect(72, ny(2) + 8, 112, 18); ctxt(ctx, 'GAME OVER', 128, ny(2) + 13, '#ff3030'); }
      }
      function renderTitle(ctx) {
        const t = titleT;
        txt(ctx, 'TARG', Math.round(W / 2 - textW('TARG', 5) / 2), 34, '#30ff60', 5);
        // chase strip
        const y = 92, px = ((t * 1.2) % 340) - 40;
        ctx.fillStyle = '#404040'; for (let x = 0; x < W; x += 6) ctx.fillRect(x, y + 4, 3, 1);
        ctx.drawImage(WSPR[3], Math.round(px), y);
        for (let i = 0; i < 3; i++) ctx.drawImage(TSPR[i][(t >> 3) & 1][3], Math.round(px - 24 - i * 14), y);
        if ((t >> 4) & 1) { ctx.fillStyle = '#ffff60'; ctx.fillRect(Math.round(px + 12 + (t % 16) * 3), y + 4, 6, 1); }
        const rows = [[WSPR[0], 'WUMMEL  - YOU', '#ffffff'], [TSPR[0][0][0], 'TARG  10 X WAVE', '#30ff60'], [SSPR, 'SPECTAR SMUGGLER', '#c060ff'], [null, '100 - 1000 PTS', '#c060ff']];
        rows.forEach((r, i) => { if (t > 20 + i * 20) { if (r[0]) ctx.drawImage(r[0], 40 - (r[0].width - 8) / 2, 114 + i * 16); txt(ctx, r[1], 64, 114 + i * 16, r[2]); } });
        ctxt(ctx, 'BONUS WUMMEL AT 2000', W / 2, 180, '#40c0ff');
        coin.prompt(ctx, W / 2, 194, T, '#ffe040');
        ctxt(ctx, '\u00a9 1980 EXIDY', W / 2, 206, '#ff60c0');
        coin.credit(ctx, 4, 216, '#a0a0a0');
      }

      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
