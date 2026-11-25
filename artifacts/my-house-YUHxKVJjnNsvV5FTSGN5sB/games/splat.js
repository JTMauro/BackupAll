// Splat! (Williams, 1982) - from-scratch raster recreation for the Game Room.
// A twin-stick food fight in a scrolling garden maze: grab the target foods, splat the incoming tomatoes,
// eggs, grapes and pies, and never get pinned between the scrolling screen edge and a hedge.
(function () {
  'use strict';
  const W = 292, H = 240, TOPH = 22, CS = 16, GW = 48, GH = 40, WWID = GW * CS, WHEI = GH * CS;

  // ---------- 5x7 bitmap font ----------
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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0]
  };
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) {
        const bits = g[r]; if (!bits) continue;
        ctx.fillStyle = typeof col === 'function' ? col(r, i) : col;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
  }

  // ---------- pixel art ----------
  const PAL = {
    k: '#000000', W: '#ffffff', R: '#ff2020', r: '#a01010', Y: '#ffe020', y: '#c0a000', O: '#ff9020', o: '#a05010', B: '#4070ff',
    b: '#203090', S: '#ffc890', s: '#c08060', G: '#30d030', g: '#107010', P: '#a040ff', p: '#602090', N: '#8a4a1a', n: '#5a2a0a',
    C: '#f8e8c0', M: '#ff60c0', w: '#c0c0c0'
  };
  const ART = {
    // the hero: a kid in a cap and overalls
    kid0: ['..RRRR..', '.RRRRRR.', '..SSSS..', '..SkSk..', '..SSSS..', '.BBYYBB.', 'S.BBBB.S', '..BBBB..', '..B..B..', '.nn..nn.'],
    kid1: ['..RRRR..', '.RRRRRR.', '..SSSS..', '..SkSk..', '..SSSS..', '.BBYYBB.', 'S.BBBB.S', '..BBBB..', '..B...B.', '.nn...nn'],
    kid2: ['..RRRR..', '.RRRRRR.', '..SSSS..', '..SkSk..', '..SSSS..', '.BBYYBB.', 'S.BBBB.S', '..BBBB..', '.B...B..', 'nn...nn.'],
    thrower: ['..gggg..', '.gGGGGg.', '..SSSS..', '..kSSk..', '..SrrS..', '.GGGGGG.', 'S.GGGG.S', '..GGGG..'],
    banana: ['......Y.', '.....YY.', '....YYy.', '...YYy..', '..YYy...', 'YYYy....', '.yy.....', '........'],
    cake: ['...R....', '..WWW...', '.MMMMMM.', '.CCCCCC.', '.MMMMMM.', '.CCCCCC.', '.NNNNNN.', '........'],
    cone: ['..MMM...', '.MMWMM..', '.MMMMM..', '..NoN...', '..oNo...', '...N....', '...o....', '........'],
    burger: ['..oooo..', '.oYoYoo.', '.oooooo.', '.GGGGGG.', '.nnnnnn.', '.RRRRRR.', '.oooooo.', '........'],
    pieslice: ['.......o', '.....ooR', '...ooRRo', '.ooRRRRo', 'oooooooo', '.CCCCCC.', '........', '........'],
    cherries: ['....g...', '...g.g..', '..g...g.', '.RR..RR.', 'RWRR.RWR', 'RRRR.RRR', '.RR...R.', '........'],
    hotdog: ['........', '.oooooo.', 'oRRRRRRo', 'oYYYYYYo', 'oRRRRRRo', '.oooooo.', '........', '........'],
    melon: ['........', 'g......g', 'GG....GG', '.GRRRRG.', '.RkRRkR.', '..RRRR..', '...RR...', '........'],
    tomato: ['..g..', '.RRR.', 'RRWRR', 'RRRRR', '.RRR.'],
    egg: ['.WW.', 'WWWW', 'WWWw', '.ww.'],
    grapes: ['.g.', 'PPP', 'PpP', '.P.'],
    pie: ['..ooooo..', '.oCoCoCo.', 'oCCCCCCCo', 'ooooooooo', '.wwwwwww.']
  };
  const TARGETS = ['banana', 'cake', 'cone', 'burger', 'pieslice', 'cherries', 'hotdog', 'melon'];
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function sprite(rows, flip) {
    const h = rows.length, w = rows[0].length, c = canvas(w, h), x = c.getContext('2d');
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const ch = rows[j][flip ? w - 1 - i : i]; if (ch !== '.') { x.fillStyle = PAL[ch]; x.fillRect(i, j, 1, 1); } }
    return { c, w, h };
  }

  ArcadeRegistry.register({
    id: 'splat', title: 'Splat!', year: 1982, maker: 'Williams',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 WASD: throw in a direction (twin-stick) \u00b7 Space: throw where you face \u00b7 Enter: start',
    marquee: { bg: '#103010', fg: '#ff2020', accent: '#ffe020' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      const ri = n => (Math.random() * n) | 0;
      const S = {};
      for (const k in ART) { S[k] = sprite(ART[k]); S[k + 'L'] = sprite(ART[k], true); }
      const wx = x => ((x % WWID) + WWID) % WWID, wy = y => ((y % WHEI) + WHEI) % WHEI;
      const dx = (a, b) => { let d = (a - b) % WWID; if (d > WWID / 2) d -= WWID; else if (d < -WWID / 2) d += WWID; return d; };
      const dy = (a, b) => { let d = (a - b) % WHEI; if (d > WHEI / 2) d -= WHEI; else if (d < -WHEI / 2) d += WHEI; return d; };

      // hedge tile
      const HEDGE = canvas(CS, CS);
      (function () {
        const x = HEDGE.getContext('2d');
        for (let j = 0; j < CS; j++) for (let i = 0; i < CS; i++) {
          const n = (i * 37 + j * 91 + ((i * j) % 7) * 13) % 11;
          x.fillStyle = n < 3 ? '#0c5a14' : n < 7 ? '#169a24' : n < 9 ? '#24c034' : '#60e060';
          if (i === 0 || j === CS - 1) x.fillStyle = '#063a0a';
          x.fillRect(i, j, 1, 1);
        }
      })();
      const GRASS = canvas(CS, CS);
      (function () {
        const x = GRASS.getContext('2d');
        x.fillStyle = '#3a6a1a'; x.fillRect(0, 0, CS, CS);
        x.fillStyle = '#4a7a22'; for (let k = 0; k < 7; k++) x.fillRect((k * 7) % CS, (k * 5 + 3) % CS, 1, 2);
        x.fillStyle = '#2e5a14'; for (let k = 0; k < 5; k++) x.fillRect((k * 11 + 4) % CS, (k * 3 + 9) % CS, 1, 1);
      })();

      // ---------- maze ----------
      let wall, gates, gateAt;
      function buildMaze() {
        wall = new Uint8Array(GW * GH); gates = []; gateAt = new Int16Array(GW * GH).fill(-1);
        for (let j = 0; j < GH; j += 4) for (let i = 0; i < GW; i += 4) {
          wall[j * GW + i] = 1;
          const r = Math.random(), len = 1 + ri(2);
          // each pillar may grow a hedge right or down; a gap always remains before the next pillar
          if (r < 0.4) for (let k = 1; k <= len; k++) wall[j * GW + (i + k) % GW] = 1;
          else if (r < 0.8) for (let k = 1; k <= len; k++) wall[((j + k) % GH) * GW + i] = 1;
        }
        // a few of the remaining gaps become closing hedge gates
        for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
          if (wall[j * GW + i] || !((i % 4 === 0) !== (j % 4 === 0))) continue;
          if (Math.random() < 0.18) { gateAt[j * GW + i] = gates.length; gates.push({ i, j, ph: ri(600), closed: false, warn: false }); }
        }
      }
      const cellSolid = (i, j) => { i = ((i % GW) + GW) % GW; j = ((j % GH) + GH) % GH; const k = j * GW + i; return wall[k] === 1 || (gateAt[k] >= 0 && gates[gateAt[k]].closed); };
      const solidAt = (x, y) => cellSolid(Math.floor(wx(x) / CS), Math.floor(wy(y) / CS));
      const boxHit = (x, y, hw, hh) => solidAt(x - hw, y - hh) || solidAt(x + hw, y - hh) || solidAt(x - hw, y + hh) || solidAt(x + hw, y + hh);
      function openSpot(nx, ny) {
        // nearest open cell centre to world point
        const ci = Math.floor(wx(nx) / CS), cj = Math.floor(wy(ny) / CS);
        for (let r = 0; r < 10; r++) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
          if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue;
          const a = ci + i, b = cj + j, ka = ((a % GW) + GW) % GW, kb = ((b % GH) + GH) % GH;
          if (!cellSolid(a, b) && gateAt[kb * GW + ka] < 0) return [wx(a * CS + CS / 2), wy(b * CS + CS / 2)];
        }
        return [wx(nx), wy(ny)];
      }

      let hi = api.getHiScore(20000);
      let state = 'attract', stT = 0, coinFlash = 0;
      let score = 0, lives = 3, level = 1, nextExtra = 20000;
      let kid, camX = 0, camY = 0, scrollA = 0, scrollSp = 0.4, scrollT = 0, pauseScroll = 0;
      let targets = [], foods = [], shots = [], throwers = [], parts = [], splats = [], popups = [];
      let timeLeft = 0, foodT = 0, throwT = 0, deadT = 0, clearT = 0, levelT = 0, deathMsg = '';
      buildMaze();

      function newKid() {
        const [x, y] = openSpot(camX + W / 2, camY + TOPH + (H - TOPH) / 2);
        kid = { x, y, fx: 1, fy: 0, alive: true, safe: 90, walk: 0, fireT: 0, moving: false };
        pauseScroll = 60;
      }
      function startLevel() {
        buildMaze();
        foods = []; shots = []; throwers = []; splats = []; parts = [];
        camX = rnd(0, WWID); camY = rnd(0, WHEI);
        newKid();
        targets = [];
        const n = Math.min(8, 4 + Math.floor(level / 2));
        const kinds = TARGETS.slice().sort(() => Math.random() - 0.5).slice(0, n);
        for (const k of kinds) {
          let x, y, tries = 0;
          do { [x, y] = openSpot(rnd(0, WWID), rnd(0, WHEI)); tries++; } while (tries < 40 && (Math.hypot(dx(x, kid.x), dy(y, kid.y)) < 90 || targets.some(t => Math.hypot(dx(x, t.x), dy(y, t.y)) < 60)));
          targets.push({ k, x, y, got: false });
        }
        timeLeft = 60 * (60 + n * 6); foodT = 120; throwT = 300; levelT = 0;
        scrollSp = Math.min(1.0, 0.35 + level * 0.06); scrollA = ri(8) * Math.PI / 4; scrollT = rnd(300, 500);
        A.melody([[523, .08], [784, .08], [659, .08], [1047, .2]], { type: 'square', vol: 0.12 });
      }
      function startGame() { state = 'play'; stT = 0; score = 0; lives = 3; level = 1; nextExtra = 20000; popups = []; startLevel(); }
      function addScore(n) {
        score += n;
        if (score >= nextExtra) { nextExtra += 20000; lives = Math.min(9, lives + 1); A.melody([[784, .07], [988, .07], [1319, .15]], { type: 'square', vol: 0.12 }); }
        if (score > hi) hi = score;
      }
      function popup(x, y, s) { if (popups.length < 10) popups.push({ x, y, s: String(s), t: 50 }); }
      function splatAt(x, y, col, n) {
        if (splats.length > 40) splats.shift();
        const blobs = []; for (let k = 0; k < (n || 6); k++) blobs.push([rnd(-5, 5), rnd(-4, 4), 1 + ri(3)]);
        splats.push({ x, y, col, blobs, t: 400 });
        for (let k = 0; k < 12 && parts.length < 400; k++) { const a = rnd(0, 6.28), s = rnd(0.5, 2); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, c: col, t: rnd(10, 25) }); }
        A.noise(0.12, { freq: 900, vol: 0.2 });
        A.tone(140, 0.08, { type: 'square', vol: 0.1, slideTo: 60 });
      }
      function killKid(msg) {
        if (!kid.alive || kid.safe > 0) return;
        kid.alive = false; deadT = 140; deathMsg = msg;
        splatAt(kid.x, kid.y, msg === 'SQUISHED!' ? '#30d030' : '#ff2020', 12);
        A.melody([[440, .12], [349, .12], [294, .12], [220, .35]], { type: 'square', vol: 0.12, delay: 0.1 });
      }
      const FOODK = { tomato: { pts: 50, col: '#ff2020', sp: 1.5 }, egg: { pts: 100, col: '#ffffff', sp: 2.2 }, grapes: { pts: 150, col: '#a040ff', sp: 1.3 }, pie: { pts: 200, col: '#f8e8c0', sp: 0.9 } };
      function throwFood(x, y, kind) {
        const f = FOODK[kind], sp = f.sp + level * 0.08;
        const ddx = dx(kid.x, x), ddy = dy(kid.y, y), d = Math.hypot(ddx, ddy) || 1;
        foods.push({ k: kind, x: wx(x), y: wy(y), vx: ddx / d * sp, vy: ddy / d * sp, t: 600, spin: 0 });
        A.tone(kind === 'egg' ? 900 : 500, 0.1, { type: 'triangle', vol: 0.06, slideTo: 300 });
      }

      // ---------- update ----------
      function updKid() {
        if (!kid.alive) {
          if (--deadT <= 0) {
            if (lives <= 1) {
              lives = 0;
              const over = () => { state = 'gameover'; stT = 0; api.setHiScore(score); };
              if (api.offerContinue) api.offerContinue(() => { lives = 3; timeLeft = Math.max(timeLeft, 60 * 40); newKid(); foods = []; }, over); else over();
              return;
            }
            lives--; newKid(); foods = []; if (timeLeft < 60 * 20) timeLeft = 60 * 30;
          }
          return;
        }
        if (kid.safe > 0) kid.safe--;
        let ix = 0, iy = 0;
        if (api.key('ArrowLeft')) ix--; if (api.key('ArrowRight')) ix++;
        if (api.key('ArrowUp')) iy--; if (api.key('ArrowDown')) iy++;
        kid.moving = !!(ix || iy);
        if (kid.moving) {
          const d = Math.hypot(ix, iy), sp = 1.35;
          kid.fx = ix / d; kid.fy = iy / d; kid.walk++;
          const nx = kid.x + ix / d * sp; if (!boxHit(nx, kid.y, 3, 3)) kid.x = wx(nx);
          const ny = kid.y + iy / d * sp; if (!boxHit(kid.x, ny, 3, 3)) kid.y = wy(ny);
          if (kid.walk % 12 === 0) A.tone(120, 0.03, { type: 'square', vol: 0.03 });
        }
        // screen edges push the player along with the scroll
        const m = 6, sx = dx(kid.x, camX), sy = dy(kid.y, camY);
        let px = 0, py = 0;
        if (sx < m) px = m - sx; else if (sx > W - m) px = W - m - sx;
        if (sy < TOPH + m) py = TOPH + m - sy; else if (sy > H - m) py = H - m - sy;
        if (px || py) {
          kid.x = wx(kid.x + px); kid.y = wy(kid.y + py);
          if (boxHit(kid.x, kid.y, 3, 3)) { killKid('SQUISHED!'); return; }
        }
        if (boxHit(kid.x, kid.y, 2, 2)) { killKid('SQUISHED!'); return; }   // a hedge gate closed on us
        // throwing: twin-stick with WASD, or Space toward the facing direction
        let fx = 0, fy = 0;
        if (api.key('KeyA')) fx--; if (api.key('KeyD')) fx++; if (api.key('KeyW')) fy--; if (api.key('KeyS')) fy++;
        if (!fx && !fy && api.key('Space')) { fx = kid.fx; fy = kid.fy; }
        if (kid.fireT > 0) kid.fireT--;
        if ((fx || fy) && kid.fireT <= 0 && shots.length < 3) {
          const d = Math.hypot(fx, fy);
          shots.push({ x: kid.x, y: kid.y - 2, vx: fx / d * 3.6, vy: fy / d * 3.6, t: 55 });
          kid.fireT = 10; A.tone(700, 0.06, { type: 'square', vol: 0.06, slideTo: 300 });
        }
        // targets
        for (const t of targets) {
          if (t.got) continue;
          if (Math.abs(dx(t.x, kid.x)) < 8 && Math.abs(dy(t.y, kid.y)) < 8) {
            t.got = true; const p = 500 * Math.min(level, 5); addScore(p); popup(t.x, t.y - 10, p);
            A.melody([[784, .05], [988, .05], [1175, .05], [1568, .12]], { type: 'square', vol: 0.12 });
          }
        }
        if (targets.every(t => t.got)) { state = 'clear'; clearT = 0; foods = []; A.melody([[523, .1], [659, .1], [784, .1], [1047, .1], [784, .1], [1047, .3]], { type: 'square', vol: 0.13 }); }
      }
      function updScroll() {
        if (pauseScroll > 0) { pauseScroll--; return; }
        if (--scrollT <= 0) {
          scrollT = rnd(260, 520) - Math.min(150, level * 15);
          scrollA = ri(8) * Math.PI / 4;
          A.tone(220, 0.15, { type: 'triangle', vol: 0.06, slideTo: 330 });
        }
        camX = wx(camX + Math.cos(scrollA) * scrollSp); camY = wy(camY + Math.sin(scrollA) * scrollSp);
      }
      function updGates() {
        for (const g of gates) {
          g.ph = (g.ph + 1) % 600;
          const was = g.closed;
          g.warn = g.ph >= 360 && g.ph < 420; g.closed = g.ph >= 420;
          if (g.closed && !was && Math.abs(dx(g.i * CS + 8, camX + W / 2)) < W / 2 && Math.abs(dy(g.j * CS + 8, camY + H / 2)) < H / 2) A.tone(90, 0.12, { type: 'square', vol: 0.06 });
        }
      }
      function onScreen(x, y, m) { const sx = dx(x, camX), sy = dy(y, camY); return sx > -m && sx < W + m && sy > TOPH - m && sy < H + m; }
      function updFoods() {
        const lv = level;
        if (--foodT <= 0) {
          foodT = Math.max(28, 110 - lv * 9 - Math.min(40, levelT / 120)) + rnd(0, 40);
          // food comes flying in from just off the edge of the screen
          const e = ri(4);
          let x = camX + (e === 0 ? -8 : e === 1 ? W + 8 : rnd(0, W)), y = camY + (e === 2 ? TOPH - 8 : e === 3 ? H + 8 : rnd(TOPH, H));
          const kinds = ['tomato', 'tomato', 'egg'].concat(lv >= 2 ? ['grapes'] : [], lv >= 3 ? ['pie'] : []);
          if (kid.alive && foods.length < 8 + lv) throwFood(x, y, kinds[ri(kinds.length)]);
        }
        if (--throwT <= 0) {
          throwT = Math.max(160, 420 - lv * 30) + rnd(0, 120);
          if (kid.alive && throwers.length < 1 + (lv >> 1)) {
            for (let k = 0; k < 10; k++) {
              const [x, y] = openSpot(camX + rnd(20, W - 20), camY + rnd(TOPH + 20, H - 20));
              if (Math.hypot(dx(x, kid.x), dy(y, kid.y)) > 70 && onScreen(x, y, -10)) { throwers.push({ x, y, t: 0, thrown: 0 }); break; }
            }
          }
        }
        for (let i = foods.length - 1; i >= 0; i--) {
          const f = foods[i];
          if (f.k === 'pie' && kid.alive) {
            // pies drift after the player
            const ddx = dx(kid.x, f.x), ddy = dy(kid.y, f.y), d = Math.hypot(ddx, ddy) || 1, sp = Math.hypot(f.vx, f.vy);
            f.vx += ddx / d * 0.03; f.vy += ddy / d * 0.03; const ns = Math.hypot(f.vx, f.vy); f.vx *= sp / ns; f.vy *= sp / ns;
          }
          f.x = wx(f.x + f.vx); f.y = wy(f.y + f.vy); f.spin++;
          if (kid.alive && kid.safe <= 0 && Math.abs(dx(f.x, kid.x)) < 5 && Math.abs(dy(f.y, kid.y)) < 6) { foods.splice(i, 1); killKid('SPLAT!'); continue; }
          if (--f.t <= 0 || !onScreen(f.x, f.y, 40)) foods.splice(i, 1);
        }
        for (let i = throwers.length - 1; i >= 0; i--) {
          const t = throwers[i]; t.t++;
          if (kid.alive && t.t > 50 && t.thrown < 2 && t.t % 70 === 50) { t.thrown++; throwFood(t.x, t.y - 4, ['tomato', 'egg', 'grapes'][ri(lv >= 2 ? 3 : 2)]); }
          if (t.t > 200 || !onScreen(t.x, t.y, 0)) throwers.splice(i, 1);
        }
        for (let i = shots.length - 1; i >= 0; i--) {
          const s = shots[i]; s.x = wx(s.x + s.vx); s.y = wy(s.y + s.vy);
          let gone = --s.t <= 0 || !onScreen(s.x, s.y, 4);
          if (!gone && solidAt(s.x, s.y)) { gone = true; splatAt(s.x - s.vx, s.y - s.vy, '#ff2020', 4); }
          if (!gone) for (let j = foods.length - 1; j >= 0; j--) {
            const f = foods[j];
            if (Math.abs(dx(f.x, s.x)) < 5 && Math.abs(dy(f.y, s.y)) < 5) {
              foods.splice(j, 1); gone = true;
              const fk = FOODK[f.k]; addScore(fk.pts); popup(f.x, f.y - 8, fk.pts); splatAt(f.x, f.y, fk.col, 6);
              if (f.k === 'grapes') for (let k = -1; k <= 1; k += 2) foods.push({ k: 'tomato', x: f.x, y: f.y, vx: f.vy * k * 0.9 + f.vx * 0.3, vy: -f.vx * k * 0.9 + f.vy * 0.3, t: 200, spin: 0 });
              break;
            }
          }
          if (!gone) for (let j = throwers.length - 1; j >= 0; j--) {
            const t = throwers[j];
            if (t.t > 15 && Math.abs(dx(t.x, s.x)) < 5 && Math.abs(dy(t.y, s.y)) < 6) { throwers.splice(j, 1); gone = true; addScore(300); popup(t.x, t.y - 10, 300); splatAt(t.x, t.y, '#ff2020', 8); break; }
          }
          if (gone) shots.splice(i, 1);
        }
      }
      function updMisc() {
        for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vx *= 0.9; p.vy *= 0.9; if (--p.t <= 0) parts.splice(i, 1); }
        for (let i = splats.length - 1; i >= 0; i--) if (--splats[i].t <= 0) splats.splice(i, 1);
        for (let i = popups.length - 1; i >= 0; i--) if (--popups[i].t <= 0) popups.splice(i, 1);
      }

      function update() {
        stT++; if (coinFlash > 0) coinFlash--;
        if (state === 'attract') {
          camX = wx(camX + 0.5); camY = wy(camY + 0.25); updGates();
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) startGame();
            else { coinFlash = 120; A.tone(70, 0.25, { type: 'square', vol: 0.2 }); }
          }
          return;
        }
        if (state === 'gameover') {
          updMisc();
          if (stT > 240 || (stT > 60 && api.anyPressed('Enter', 'Space'))) { state = 'attract'; stT = 0; }
          return;
        }
        if (state === 'clear') {
          updMisc(); clearT++;
          if (clearT > 60 && timeLeft > 0) {
            const n = Math.min(timeLeft, 60); timeLeft -= n; addScore(Math.round(n / 60 * 10 * level));
            if (clearT % 3 === 0) A.tone(1200 + (timeLeft % 600), 0.03, { type: 'square', vol: 0.05 });
          } else if (clearT > 60 && clearT > 160) { level++; state = 'play'; startLevel(); }
          return;
        }
        levelT++;
        updGates(); updScroll(); updKid();
        if (state !== 'play') return;
        updFoods(); updMisc();
        if (kid.alive) {
          timeLeft--;
          if (timeLeft === 600) A.melody([[880, .1], [0, .1], [880, .1]], { type: 'square', vol: 0.1 });
          if (timeLeft <= 0) { kid.safe = 0; killKid('TIME UP!'); timeLeft = 60 * 30; }
        }
      }

      // ---------- render ----------
      const scrX = x => Math.round(dx(x, camX)), scrY = y => Math.round(dy(y, camY));
      function blit(ctx, s, x, y) { ctx.drawImage(s.c, Math.round(x - s.w / 2), Math.round(y - s.h / 2)); }
      function drawGarden(ctx) {
        const ox = Math.floor(camX / CS), oy = Math.floor(camY / CS), fx = camX - ox * CS, fy = camY - oy * CS;
        for (let j = 0; j <= Math.ceil(H / CS) + 1; j++) for (let i = 0; i <= Math.ceil(W / CS) + 1; i++) {
          const ci = ox + i, cj = oy + j, x = Math.round(i * CS - fx), y = Math.round(j * CS - fy);
          if (y + CS < TOPH) continue;
          const ka = ((ci % GW) + GW) % GW, kb = ((cj % GH) + GH) % GH, k = kb * GW + ka;
          if (wall[k]) ctx.drawImage(HEDGE, x, y);
          else {
            ctx.drawImage(GRASS, x, y);
            if (gateAt[k] >= 0) {
              const g = gates[gateAt[k]];
              if (g.closed) {
                const grow = Math.min(CS, (g.ph - 420) * 2);
                ctx.drawImage(HEDGE, 0, 0, CS, grow, x, y, CS, grow);
                ctx.fillStyle = '#063a0a'; ctx.fillRect(x, y, CS, 1);
              } else if (g.warn) {
                ctx.fillStyle = (api.frame & 4) ? '#ffe020' : '#a05010';
                ctx.fillRect(x, y, CS, 1); ctx.fillRect(x, y + CS - 1, CS, 1); ctx.fillRect(x, y, 1, CS); ctx.fillRect(x + CS - 1, y, 1, CS);
              } else { ctx.fillStyle = '#6a4a1a'; ctx.fillRect(x + 2, y + CS - 3, CS - 4, 2); }
            }
          }
        }
        for (const s of splats) {
          const x = scrX(s.x), y = scrY(s.y); if (x < -10 || x > W + 10 || y < TOPH - 10 || y > H + 10) continue;
          ctx.fillStyle = s.col;
          for (const [bx, by, r] of s.blobs) ctx.fillRect(Math.round(x + bx - r / 2), Math.round(y + by - r / 2), r, r);
        }
      }
      function drawThings(ctx) {
        for (const t of targets) {
          if (t.got) continue;
          const x = scrX(t.x), y = scrY(t.y); if (x < -8 || x > W + 8 || y < TOPH - 8 || y > H + 8) continue;
          blit(ctx, S[t.k], x, y + Math.round(Math.sin(api.frame * 0.15) * 1));
          if (api.frame & 16) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 4, y - 5, 1, 1); }
        }
        for (const t of throwers) {
          const x = scrX(t.x), y = scrY(t.y);
          const rise = Math.min(8, t.t / 3) - Math.max(0, (t.t - 180) / 3);
          ctx.drawImage(S.thrower.c, 0, 0, 8, Math.max(1, Math.round(rise)), x - 4, y + 4 - Math.round(rise), 8, Math.max(1, Math.round(rise)));
          ctx.fillStyle = '#6a4a1a'; ctx.fillRect(x - 5, y + 4, 10, 2);
        }
        for (const f of foods) {
          const x = scrX(f.x), y = scrY(f.y);
          const sh = 4 + Math.round(Math.sin(f.spin * 0.08) * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x - 2, y + sh, 5, 2);   // shadow: it is airborne
          blit(ctx, (f.spin >> 3) & 1 ? S[f.k + 'L'] : S[f.k], x, y);
        }
        for (const s of shots) {
          const x = scrX(s.x), y = scrY(s.y);
          ctx.fillStyle = '#ff2020'; ctx.fillRect(x - 1, y - 1, 3, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 1, 1, 1);
          ctx.fillStyle = '#30d030'; ctx.fillRect(x, y - 2, 1, 1);
        }
        if (kid && kid.alive && state !== 'attract' && !(kid.safe > 0 && (kid.safe & 4))) {
          const f = kid.moving ? ['kid1', 'kid0', 'kid2', 'kid0'][(kid.walk >> 3) & 3] : 'kid0';
          blit(ctx, kid.fx < 0 ? S[f + 'L'] : S[f], scrX(kid.x), scrY(kid.y) - 2);
        }
        for (const p of parts) { ctx.fillStyle = p.c; ctx.fillRect(scrX(p.x), scrY(p.y), 1, 1); }
        for (const p of popups) text(ctx, p.s, scrX(p.x), scrY(p.y) - (50 - p.t) / 4, '#ffffff', 1, 'center');
        // arrows toward off-screen targets
        if (state === 'play' && kid && kid.alive) {
          for (const t of targets) {
            if (t.got) continue;
            const x = dx(t.x, camX + W / 2), y = dy(t.y, camY + (TOPH + H) / 2);
            if (Math.abs(x) < W / 2 - 4 && Math.abs(y) < (H - TOPH) / 2 - 4) continue;
            const k = Math.min((W / 2 - 6) / Math.abs(x || 0.01), ((H - TOPH) / 2 - 6) / Math.abs(y || 0.01));
            const ax = Math.round(W / 2 + x * k), ay = Math.round((TOPH + H) / 2 + y * k);
            if (api.frame & 8) { ctx.fillStyle = '#ffe020'; ctx.fillRect(ax - 1, ay - 1, 3, 3); ctx.fillStyle = '#ff2020'; ctx.fillRect(ax, ay, 1, 1); }
          }
        }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#081808'; ctx.fillRect(0, 0, W, TOPH);
        ctx.fillStyle = '#30d030'; ctx.fillRect(0, TOPH - 1, W, 1);
        text(ctx, String(score).padStart(6, '0'), 3, 2, '#ffffff');
        text(ctx, 'HI ' + hi, 3, 12, '#ffe020');
        for (let i = 0; i < Math.min(5, lives - (kid && kid.alive ? 1 : 0)); i++) ctx.drawImage(S.kid0.c, 0, 0, 8, 5, 64 + i * 9, 3, 8, 5);
        // target list
        targets.forEach((t, i) => {
          const x = 112 + i * 13;
          ctx.drawImage(S[t.k].c, x, 2);
          if (t.got) { ctx.fillStyle = '#ff2020'; for (let k = 0; k < 8; k++) { ctx.fillRect(x + k, 2 + k, 1, 1); ctx.fillRect(x + 7 - k, 2 + k, 1, 1); } }
        });
        // timer bar
        const tl = Math.max(0, timeLeft) / (60 * 110);
        ctx.fillStyle = '#203020'; ctx.fillRect(112, 14, 120, 4);
        ctx.fillStyle = timeLeft < 600 ? ((api.frame & 8) ? '#ff2020' : '#ffe020') : '#30d030'; ctx.fillRect(112, 14, Math.round(120 * Math.min(1, tl)), 4);
        text(ctx, 'LVL ' + level, 289, 7, '#ffe020', 1, 'right');
      }
      function drawLogo(ctx, y) {
        text(ctx, 'SPLAT!', W / 2 + 2, y + 2, '#401010', 5, 'center');
        text(ctx, 'SPLAT!', W / 2, y, r => r < 3 ? '#ff4040' : r < 5 ? '#ff2020' : '#c01010', 5, 'center');
        // dripping tomato juice
        ctx.fillStyle = '#c01010';
        for (let k = 0; k < 6; k++) { const x = W / 2 - 70 + k * 27, len = 3 + ((stT >> 3) + k * 3) % 9; ctx.fillRect(x, y + 35, 2, len); }
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        drawGarden(ctx);
        if (state === 'attract') {
          drawHUD(ctx);
          ctx.fillStyle = 'rgba(0,16,0,0.65)'; ctx.fillRect(24, 34, W - 48, 186);
          drawLogo(ctx, 44);
          const page = Math.floor(stT / 420) % 2;
          if (page === 0) {
            text(ctx, 'COLLECT THE TARGET FOODS', W / 2, 96, '#ffffff', 1, 'center');
            text(ctx, "DON'T GET PINNED BY THE SCROLL", W / 2, 108, '#ffffff', 1, 'center');
            if (api.credits > 0) text(ctx, 'PUSH START', W / 2, 136, (api.frame & 32) ? '#ffffff' : '#30d030', 1, 'center');
            else if (coinFlash > 0 ? (coinFlash & 8) : (stT % 60) < 40) text(ctx, 'INSERT COIN', W / 2, 136, coinFlash > 0 ? '#ff2020' : '#ffffff', 1, 'center');
            text(ctx, 'HIGH SCORE ' + hi, W / 2, 156, '#ffe020', 1, 'center');
            text(ctx, 'ARROWS MOVE  WASD/SPACE THROW', W / 2, 180, '#30d030', 1, 'center');
            text(ctx, '\u00a9 1982 WILLIAMS', W / 2, 204, '#80a080', 1, 'center');
          } else {
            const rows = [['tomato', 'TOMATO', 50], ['egg', 'EGG', 100], ['grapes', 'GRAPES', 150], ['pie', 'PIE', 200], ['thrower', 'FOOD FIGHTER', 300], ['cake', 'TARGET FOOD', '500+']];
            rows.forEach(([k, n, p], i) => {
              const y = 98 + i * 18;
              blit(ctx, S[k], 74, y + 3); text(ctx, n, 92, y, '#ffffff'); text(ctx, String(p), 240, y, '#ffe020', 1, 'right');
            });
          }
          text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W / 2, 226, '#ffffff', 1, 'center');
          return;
        }
        drawThings(ctx);
        drawHUD(ctx);
        if (state === 'play' && levelT < 120) { text(ctx, 'LEVEL ' + level, W / 2, 80, '#ffffff', 2, 'center'); text(ctx, 'GET THE FOOD!', W / 2, 100, '#ffe020', 1, 'center'); }
        if (kid && !kid.alive && deadT > 40 && state === 'play') text(ctx, deathMsg, W / 2, 110, (api.frame & 8) ? '#ff2020' : '#ffffff', 2, 'center');
        if (state === 'clear') { text(ctx, 'ALL FOOD COLLECTED!', W / 2, 90, '#ffe020', 1, 'center'); text(ctx, 'TIME BONUS', W / 2, 106, '#ffffff', 1, 'center'); }
        if (state === 'gameover') text(ctx, 'GAME OVER', W / 2, 110, '#ff2020', 2, 'center');
      }
      return { update, render, destroy() { } };
    }
  });
})();
