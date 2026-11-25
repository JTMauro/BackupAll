// Galaga (Namco, 1981) — faithful browser recreation for Arcade Games Galore.
(function () {
  // ---- compact 5x7 bitmap arcade font ----
  const FK = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-.,:!?=*/'\"<>()+%#@^_~";
  const FD = "ehjlphe4c4444eeh168gvv2421he26aiv22vgu11he68guhhev124888ehhehheehhf12c4ahhvhhuhhuhhuehgggheuhhhhhuvgguggvvggugggfggjhhfhhhvhhhe44444e11111hehikokihggggggvhrllhhhhhpljhhehhhhheuhhugggehhhliduhhukihfgge11uv444444hhhhhhehhhhha4hhhllrhhha4ahhhha4444v1248gv000v00000000cc0000c480cc0cc04444404eh1240400v0v000level001248g04480000aa00000248g842842124824888428422248044v440pq48mj0avaaavaehnlnge4el4444000000vehlplhe";
  const FONT = {};
  for (let i = 0; i < FK.length; i++) { const g = []; for (let r = 0; r < 7; r++) g.push(parseInt(FD[i * 7 + r], 32)); FONT[FK[i]] = g; }
  FONT['©'] = [0x0E, 0x11, 0x17, 0x14, 0x17, 0x11, 0x0E];
  // text(ctx, str, x, y, colour, {scale, adv, center, bold})
  function text(ctx, s, x, y, col, o) {
    o = o || {}; const sc = o.scale || 1, adv = (o.adv || 8) * sc, bw = o.bold ? 2 : 1;
    s = String(s).toUpperCase();
    if (o.center) x = Math.round(x - (s.length * adv - (adv - (4 + bw) * sc)) / 2);
    if (o.right) x = Math.round(x - (s.length * adv - (adv - (4 + bw) * sc)));
    ctx.fillStyle = col;
    for (const ch of s) {
      const g = FONT[ch];
      if (g) for (let r = 0; r < 7; r++) { const b = g[r]; if (b) for (let c = 0; c < 5; c++) if ((b >> (4 - c)) & 1) ctx.fillRect(x + c * sc, y + r * sc, sc * bw, sc); }
      x += adv;
    }
  }
  // build a sprite canvas from rows of chars + palette {char: colour}
  function spr(rows, pal) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
    return c;
  }

  const W = 224, H = 288, DEG = Math.PI / 180;
  const PY = 262;               // player centre y
  const C = { red: '#ff0000', white: '#ffffff', cyan: '#00ffff', yellow: '#ffff00', blue: '#2a5cff', purple: '#c040ff', green: '#00ff60' };

  // ---------------- pixel art (all sprites face UP) ----------------
  const ART = {
    fighter: [
      '.......W.......',
      '.......W.......',
      '......WWW......',
      '......WWW......',
      '...R..WWW..R...',
      '...R.WWWWW.R...',
      '...W.WBWBW.W...',
      'R..WWWBWBWWW..R',
      'R..WWWWWWWWW..R',
      'W.WWWWWWWWWWW.W',
      'WWWWWRWWWRWWWWW',
      'WWW.RRWWWRR.WWW',
      'WW..RR.W.RR..WW',
      'W......W......W'],
    bee: [[
      '..B.......B..',
      '...B.....B...',
      '....YYYYY....',
      'BB.YRYYYRY.BB',
      'BBBYYYYYYYBBB',
      'BBBYRRRRRYBBB',
      '.BBYYYYYYYBB.',
      '..BYRRRRRYB..',
      '....YYYYY....',
      '.....Y.Y.....'], [
      '..B.......B..',
      '...B.....B...',
      '....YYYYY....',
      '...YRYYYRY...',
      '.BBYYYYYYYBB.',
      'BBBYRRRRRYBBB',
      'BBBYYYYYYYBBB',
      'BB.YRRRRRY.BB',
      '....YYYYY....',
      '.....Y.Y.....']],
    bfly: [[
      '...W.....W...',
      '....W...W....',
      '.....BBB.....',
      'RR..BWWWB..RR',
      'RRR.BWWWB.RRR',
      'RRRRRBWBRRRRR',
      '.RRRRBWBRRRR.',
      '..RR.BBB.RR..',
      '....RR.RR....',
      '...RR...RR...'], [
      '...W.....W...',
      '....W...W....',
      '.....BBB.....',
      '....BWWWB....',
      '.RR.BWWWB.RR.',
      'RRRRRBWBRRRRR',
      'RRRRRBWBRRRRR',
      'RRRR.BBB.RRRR',
      '.R..RR.RR..R.',
      '...RR...RR...']],
    boss: [[
      '.....G...G.....',
      '......G.G......',
      '.....GGGGG.....',
      '....GGGGGGG....',
      '...GGYGGGYGG...',
      '.O.GGYGGGYGG.O.',
      'OO.GGGGGGGGG.OO',
      'OOOGGRRGRRGGOOO',
      'OOOOGGGGGGGOOOO',
      'OO.OOG.G.GOO.OO',
      'OO..OO.G.OO..OO',
      'O....O...O....O'], [
      '.....G...G.....',
      '......G.G......',
      '.....GGGGG.....',
      '....GGGGGGG....',
      '...GGYGGGYGG...',
      '...GGYGGGYGG...',
      '...GGGGGGGGG...',
      '.OOGGRRGRRGGOO.',
      'OOOOGGGGGGGOOOO',
      'OOOOOG.G.GOOOOO',
      '.OO.OO.G.OO.OO.',
      '..O..O...O..O..']]
  };
  const PAL = {
    fighter: { W: '#ffffff', R: '#ff1010', B: '#2050ff' },
    captive: { W: '#ff1818', R: '#ffffff', B: '#2050ff' },
    bee: { Y: '#ffe000', B: '#1c48ff', R: '#ff1818' },
    bfly: { R: '#ff1818', W: '#ffffff', B: '#1c48ff' },
    boss: { G: '#00d870', Y: '#ffe000', O: '#ff8c00', R: '#ff1818' },
    boss2: { G: '#9848ff', Y: '#ffffff', O: '#4878ff', R: '#ff1818' }
  };
  // nearest-neighbour rotation of pixel rows (keeps the crisp pixel grid)
  function rotRows(rows, a) {
    const h = rows.length, w = Math.max.apply(null, rows.map(r => r.length));
    const N = 19, c = (N - 1) / 2, cx = (w - 1) / 2, cy = (h - 1) / 2;
    const cs = Math.cos(-a), sn = Math.sin(-a), out = [];
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
  function rotSet(rows, pal) { const a = []; for (let i = 0; i < NROT; i++) a.push(spr(rotRows(rows, i * 2 * Math.PI / NROT), pal)); return a; }
  const SP = {
    fighter: [rotSet(ART.fighter, PAL.fighter)],
    captive: [rotSet(ART.fighter, PAL.captive)],
    bee: ART.bee.map(r => rotSet(r, PAL.bee)),
    bfly: ART.bfly.map(r => rotSet(r, PAL.bfly)),
    boss: ART.boss.map(r => rotSet(r, PAL.boss)),
    boss2: ART.boss.map(r => rotSet(r, PAL.boss2))
  };
  const FIGHTER = spr(ART.fighter, PAL.fighter);
  const PBULLET = spr(['.W.', 'WRW', 'RYR', '.Y.', '.Y.', '.R.', '...', '...'], { W: '#ffffff', R: '#ff3030', Y: '#ffd000' });
  const EBULLET = spr(['.W.', 'WRW', 'WRW', '.R.', '.R.', '...'], { W: '#ffff80', R: '#ff3060' });

  // explosion frames (pixel bursts)
  function burst(N, frames, pal, rays) {
    const out = [];
    for (let f = 0; f < frames; f++) {
      const g = []; for (let y = 0; y < N; y++) g.push(new Array(N).fill('.'));
      const c = (N - 1) / 2, r = 1.5 + f * (c - 1) / (frames - 1);
      const put = (x, y, ch) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < N && y < N) g[y][x] = ch; };
      if (f < 2) for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) if (Math.abs(x) + Math.abs(y) < 2 + f) put(c + x, c + y, f ? 'Y' : 'W');
      for (let k = 0; k < rays; k++) {
        const a = k * 2 * Math.PI / rays + (k & 1) * 0.2;
        const rr = r * (k & 1 ? 0.75 : 1);
        put(c + Math.cos(a) * rr, c + Math.sin(a) * rr, f < 2 ? 'W' : (f < 4 ? 'Y' : 'R'));
        put(c + Math.cos(a) * rr * 0.65, c + Math.sin(a) * rr * 0.65, f < 3 ? 'Y' : 'R');
        if (f >= 1) put(c + Math.cos(a) * rr * 0.4, c + Math.sin(a) * rr * 0.4, f < 3 ? 'R' : 'B');
      }
      out.push(spr(g.map(r => r.join('')), pal));
    }
    return out;
  }
  const BOOM = burst(17, 5, { W: '#ffffff', Y: '#ffe000', R: '#ff2020', B: '#2050ff' }, 12);
  const PBOOM = burst(33, 8, { W: '#ffffff', Y: '#ffe000', R: '#ff2020', B: '#40a0ff' }, 20);

  // stage badges
  const BADGE = {
    1: spr(['W....', 'WRR..', 'WRRY.', 'WRR..', 'W....', 'W....', 'W....', 'W....'], { W: '#ffffff', R: '#ff2020', Y: '#ffe000' }),
    5: spr(['W.....', 'WBBR..', 'WBBRR.', 'WBBR..', 'W.....', 'W.....', 'W.....', 'W.....', 'W.....', 'W.....', 'W.....', 'W.....'], { W: '#ffffff', R: '#ff2020', B: '#2050ff' }),
    10: spr(['.RRRRR.', 'RYYYYYR', 'RYRRRYR', 'RYRWRYR', 'RYRRRYR', 'RYYYYYR', '.RYYYR.', '..RYR..', '...R...', '...W...', '...W...', '...W...'], { W: '#ffffff', R: '#ff2020', Y: '#ffe000' }),
    20: spr(['.CCCCC.', 'CPPPPPC', 'CPWWWPC', 'CPWCWPC', 'CPWWWPC', 'CPPPPPC', '.CPPPC.', '..CPC..', '...C...', '...W...', '...W...', '...W...'], { W: '#ffffff', C: '#00e0ff', P: '#c040ff' }),
    30: spr(['.BBBBB.', 'BWWWWWB', 'BWBBBWB', 'BWBYBWB', 'BWBBBWB', 'BWWWWWB', '.BWWWB.', '..BWB..', '...B...', '...W...', '...W...', '...W...'], { W: '#ffffff', B: '#2050ff', Y: '#ffe000' }),
    50: spr(['Y.YYY.Y', 'YYOOOYY', 'YOOWOOY', 'YOWWWOY', 'YOOWOOY', 'YYOOOYY', '.YYOYY.', '..YOY..', '...Y...', '...W...', '...W...', '...W...'], { W: '#ffffff', Y: '#ffe000', O: '#ff8000' })
  };

  // ---------------- flight programs: [frames, turn deg/frame, speed?] ----------------
  const PROG = {
    top: [[58, 0, 2.6], [80, 4.5]],
    bottom: [[34, 0, 2.6], [90, -4]],
    // challenging stage paths (fly through and leave)
    cTop: [[40, 0, 2.6], [40, 4.5], [24, 0], [80, -4.5], [30, 0], [40, 4.5], [140, 0]],
    cBot: [[30, 0, 2.6], [90, -4], [30, 0], [45, 4], [140, 0]],
    cSide: [[30, 0, 2.4], [60, 3], [20, 0], [90, -4], [160, 0]]
  };
  const ENTRY = { // start x, y, heading (deg) for the un-mirrored version
    top: [100, -10, 90], bottom: [-10, 244, -30], cTop: [100, -10, 90], cBot: [-10, 244, -30], cSide: [-10, 120, 0]
  };

  ArcadeRegistry.register({
    id: 'galaga',
    title: 'Galaga',
    year: 1981,
    maker: 'Namco',
    width: W, height: H,
    vector: false,
    pointer: false,
    controls: 'Arrows: move · Space: fire · Enter: start',
    marquee: { bg: '#000010', fg: '#3070ff', accent: '#ff2020' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(20000);
      let mode = 'title', titleT = 0, frame = 0;
      // ---------- coin-op ----------
      let coinOp = false, lastCred = api.credits, coinFlash = 0;
      function pollCoins() {
        const c = api.credits; if (c === 0) coinOp = true;
        if (c > lastCred) au.tone(1760, 0.06, { type: 'square', vol: 0.07, slideTo: 2640 });
        lastCred = c;
      }
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 }); au.tone(73, 0.28, { type: 'sawtooth', vol: 0.08 });
        return false;
      }
      const pushScreen = () => coinOp && api.credits > 0;

      // ---------- starfield ----------
      const STARCOL = ['#ff4040', '#ffff40', '#40ff40', '#40ffff', '#4040ff', '#ff40ff', '#ffffff', '#ff9040'];
      const stars = [];
      for (let i = 0; i < 72; i++) stars.push({ x: Math.floor(Math.random() * W), y: Math.random() * H, c: STARCOL[i % 8], sp: i & 1 ? 0.5 : 1, ph: Math.floor(Math.random() * 64), per: 32 + (i % 3) * 16 });
      let starSpeed = 1;
      function updStars() { for (const s of stars) { s.y += s.sp * starSpeed; if (s.y >= H) { s.y -= H; s.x = Math.floor(Math.random() * W); } } }
      function drawStars(ctx) {
        for (const s of stars) {
          if (((frame + s.ph) % s.per) < s.per * 0.55) { ctx.fillStyle = s.c; ctx.fillRect(s.x, Math.floor(s.y), 1, 1); }
        }
      }

      // ---------- game state ----------
      let g = null;
      function newGame() {
        g = {
          score: 0, lives: 2, stage: 0, nextExtra: 20000, shots: 0, hits: 0,
          enemies: [], pbul: [], ebul: [], booms: [], pops: [],
          player: { x: 112, state: 'none', t: 0, dual: false, spin: 0, y: PY },
          phase: 'intro', phaseT: 0, firstIntro: true, msg: null, msgT: 0
        };
        nextStage();
      }

      function stageIsChallenge(n) { return n >= 3 && (n - 3) % 4 === 0; }
      function nextStage() {
        g.stage++;
        g.challenge = stageIsChallenge(g.stage);
        g.enemies = []; g.ebul = []; g.pops = [];
        g.phase = 'intro'; g.phaseT = g.firstIntro ? 380 : 150;
        g.spawnQ = []; g.stageT = 0; g.attackT = 200; g.allSpawned = false;
        g.cHits = 0; g.groupKills = [0, 0, 0, 0, 0];
        g.sway = 0; g.swayDir = 1; g.breath = 0; g.breathT = 0; g.formDone = false;
        buildStage();
        if (g.firstIntro) {
          g.player.state = 'none';
          au.melody([[523, .14], [659, .14], [784, .14], [1047, .28], [988, .14], [784, .14], [880, .28], [0, .1], [698, .14], [880, .14], [1047, .14], [1319, .28], [1175, .14], [988, .14], [1047, .5]], { type: 'square', vol: 0.06 });
          au.melody([[262, .28], [392, .28], [330, .28], [392, .28], [349, .28], [440, .28], [392, .28], [523, .5]], { type: 'triangle', vol: 0.12 });
        } else if (g.challenge) {
          au.melody([[784, .1], [988, .1], [1175, .1], [1568, .3]], { type: 'square', vol: 0.06 });
        } else {
          au.melody([[659, .08], [784, .08], [1047, .16]], { type: 'square', vol: 0.05 });
        }
        // badge tick sounds
        const b = badgesFor(g.stage).length;
        for (let i = 0; i < b; i++) au.tone(1800, 0.04, { type: 'square', vol: 0.05, delay: 0.3 + i * 0.12 });
      }

      // Each group: list of 8 {type,row,col} plus path & mirror flags.
      function buildStage() {
        const s = g.stage, Q = g.spawnQ;
        const bee = (r, c) => ({ type: 'bee', row: r, col: c });
        const bf = (r, c) => ({ type: 'bfly', row: r, col: c });
        const bs = c => ({ type: 'boss', row: 0, col: c });
        let t = 20;
        const push = (list, path, mir, gap, paired, group) => {
          // paired: two files enter at once (list split into halves, second half mirrored)
          if (paired) {
            for (let i = 0; i < 4; i++) {
              Q.push({ t: t + i * gap, spec: list[i], path, mir: mir, group });
              Q.push({ t: t + i * gap, spec: list[i + 4], path, mir: !mir, group });
            }
          } else for (let i = 0; i < 8; i++) Q.push({ t: t + i * gap, spec: list[i], path, mir, group });
        };
        if (g.challenge) {
          const ci = ((s - 3) / 4) | 0;
          const types = [['bee', 'bfly', 'bfly', 'bee', 'bee'], ['bfly', 'boss', 'bee', 'bfly', 'bee'], ['bee', 'bee', 'boss', 'bfly', 'bfly']][ci % 3];
          const paths = [['cTop', 'cBot', 'cBot', 'cSide', 'cSide'], ['cSide', 'cTop', 'cBot', 'cTop', 'cBot']][ci % 2];
          for (let gi = 0; gi < 5; gi++) {
            const list = []; for (let i = 0; i < 8; i++) list.push({ type: types[gi], row: 0, col: 0 });
            push(list, paths[gi], gi === 2 || gi === 4, 8, gi === 0 || gi === 3, gi);
            t += 230;
          }
          return;
        }
        const groups = [
          { list: [bf(1, 4), bf(1, 5), bf(2, 4), bf(2, 5), bee(3, 4), bee(3, 5), bee(4, 4), bee(4, 5)], path: 'top', mir: false, paired: true },
          { list: [bs(3), bf(1, 3), bs(4), bf(1, 6), bs(5), bf(2, 3), bs(6), bf(2, 6)], path: 'bottom', mir: false },
          { list: [bf(1, 1), bf(1, 2), bf(1, 7), bf(1, 8), bf(2, 1), bf(2, 2), bf(2, 7), bf(2, 8)], path: 'bottom', mir: true },
          { list: [bee(3, 2), bee(3, 3), bee(3, 6), bee(3, 7), bee(4, 2), bee(4, 3), bee(4, 6), bee(4, 7)], path: 'top', mir: true },
          { list: [bee(3, 0), bee(3, 1), bee(3, 8), bee(3, 9), bee(4, 0), bee(4, 1), bee(4, 8), bee(4, 9)], path: 'top', mir: false }];
        const alt = s % 4 === 2; // later stages: groups come in paired files
        groups.forEach((gr, gi) => {
          push(gr.list, gr.path, gr.mir, alt ? 8 : 7, gr.paired || (alt && gi > 2), gi);
          t += 150;
        });
      }

      // ---------- formation geometry ----------
      function slotX(col) { return 112 + (col - 4.5) * 16 * (1 + g.breath) + g.sway; }
      function slotY(row) { return 44 + row * 16 * (1 + g.breath * 0.9); }

      function spawn(q) {
        const st = ENTRY[q.path];
        const e = {
          type: q.spec.type, row: q.spec.row, col: q.spec.col, group: q.group,
          x: q.mir ? W - st[0] : st[0], y: st[1], ang: (q.mir ? 180 - st[2] : st[2]) * DEG, spd: 2.6,
          prog: PROG[q.path], pi: 0, pt: 0, mir: q.mir ? -1 : 1,
          state: g.challenge ? 'cpath' : 'path', hp: q.spec.type === 'boss' ? 2 : 1, t: 0,
          shots: (!g.challenge && g.stage > 1 && Math.random() < 0.25 + g.stage * 0.02) ? 1 : 0
        };
        g.enemies.push(e);
      }

      function runProg(e) {
        const seg = e.prog[e.pi];
        if (!seg) return true;
        if (seg[2]) e.spd = seg[2];
        e.ang += seg[1] * DEG * e.mir;
        e.x += Math.cos(e.ang) * e.spd; e.y += Math.sin(e.ang) * e.spd;
        if (++e.pt >= seg[0]) { e.pi++; e.pt = 0; }
        return false;
      }
      function homeTo(e, tx, ty, spd) {
        const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
        if (d <= spd + 0.5) { e.x = tx; e.y = ty; return true; }
        const want = Math.atan2(dy, dx);
        let da = want - e.ang; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        const maxT = d < 30 ? 0.5 : 0.12;
        e.ang += Math.max(-maxT, Math.min(maxT, da));
        e.x += Math.cos(e.ang) * spd; e.y += Math.sin(e.ang) * spd;
        if (d < 30) { e.x += dx * 0.08; e.y += dy * 0.08; }
        return false;
      }
      function turnToward(e, want, max) {
        let da = want - e.ang; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        e.ang += Math.max(-max, Math.min(max, da));
      }

      // ---------- scoring ----------
      function addScore(n) {
        g.score += n;
        if (g.score >= g.nextExtra) {
          g.lives++; g.nextExtra = g.nextExtra === 20000 ? 70000 : g.nextExtra + 70000;
          au.melody([[1319, .08], [1568, .08], [2093, .08], [1568, .08], [2093, .2]], { type: 'square', vol: 0.06 });
        }
        if (g.score > hi) hi = g.score;
      }
      function pop(x, y, txt, col) { if (g.pops.length < 10) g.pops.push({ x, y, txt, col, t: 70 }); }

      // ---------- sounds ----------
      const sfx = {
        shoot() { au.tone(1500, 0.07, { type: 'square', slideTo: 600, vol: 0.05 }); au.noise(0.05, { freq: 5000, vol: 0.05, type: 'highpass' }); },
        kill(type) {
          au.noise(0.25, { freq: 2600, slideTo: 200, vol: 0.2 });
          if (type === 'bee') au.tone(700, 0.15, { type: 'square', slideTo: 150, vol: 0.05 });
          else au.tone(500, 0.2, { type: 'sawtooth', slideTo: 90, vol: 0.05 });
        },
        bossHit() { au.tone(2200, 0.06, { type: 'square', vol: 0.06 }); au.tone(1600, 0.08, { type: 'square', vol: 0.05, delay: 0.05 }); },
        dive() { au.tone(1400, 0.7, { type: 'sine', slideTo: 350, vol: 0.05 }); },
        pdie() { au.noise(1.2, { freq: 3000, slideTo: 60, vol: 0.35 }); au.tone(220, 1, { type: 'sawtooth', slideTo: 30, vol: 0.08 }); },
        beam() { au.tone(380, 0.25, { type: 'sawtooth', slideTo: 520, vol: 0.035 }); },
        captured() { au.melody([[784, .2], [740, .2], [698, .2], [659, .2], [622, .2], [587, .3], [523, .6]], { type: 'square', vol: 0.06 }); },
        rescue() { au.melody([[523, .1], [659, .1], [784, .1], [1047, .1], [784, .1], [1047, .3]], { type: 'square', vol: 0.06 }); }
      };

      // ---------- player ----------
      function playerShips() { // centres of active ships
        const p = g.player; if (p.state !== 'alive') return [];
        return p.dual ? [p.x - 8, p.x + 8] : [p.x];
      }
      function firePlayer() {
        const p = g.player;
        const max = p.dual ? 4 : 2;
        if (g.pbul.length + (p.dual ? 2 : 1) > max) return;
        for (const sx of playerShips()) g.pbul.push({ x: sx, y: PY - 8 });
        g.shots++; sfx.shoot();
      }
      function killShip(which) { // which: index into ships, -1 = all
        const p = g.player;
        const xs = playerShips();
        if (p.dual && which >= 0) {
          const dx = xs[which];
          g.booms.push({ x: dx, y: PY, t: 0, big: true });
          p.dual = false; p.x = xs[1 - which]; sfx.pdie();
          return;
        }
        g.booms.push({ x: p.x, y: PY, t: 0, big: true });
        if (p.dual) g.booms.push({ x: p.x + 8, y: PY, t: 4, big: true });
        p.state = 'dead'; p.t = 0; p.dual = false; sfx.pdie();
        starSpeed = 0;
      }

      // ---------- enemy helpers ----------
      function isDiving(e) { return e.state !== 'form' && e.state !== 'path' && e.state !== 'home'; }
      function inFormation() { return g.enemies.filter(e => e.state === 'form' && !e.host); }
      function activeDivers() { return g.enemies.filter(e => ['dive', 'attack', 'beamgo', 'beam', 'escort', 'return'].includes(e.state)).length; }
      function enemyFire(e) {
        if (g.ebul.length >= 10 || g.player.state !== 'alive') return;
        const dy = PY - e.y; if (dy < 40) return;
        let vx = (g.player.x - e.x) / (dy / 3); vx = Math.max(-1.4, Math.min(1.4, vx));
        g.ebul.push({ x: e.x, y: e.y + 6, vx, vy: 3 });
      }

      function startDive(e, kind) {
        e.state = 'dive'; e.kind = kind || e.type; e.ang = -90 * DEG; e.spd = 1.8;
        const left = e.x < 112;
        e.prog = [[36, left ? -5 : 5]]; e.mir = 1; e.pi = 0; e.pt = 0; e.t = 0;
        e.shots = Math.random() < 0.3 + g.stage * 0.04 ? (Math.random() < 0.4 ? 2 : 1) : 0;
        e.escortsKilled = 0;
        if (e.cap) e.cap.ang = e.ang;
        sfx.dive();
      }
      function launchAttack() {
        const form = inFormation(); if (!form.length) return;
        const p = g.player;
        const bosses = form.filter(e => e.type === 'boss');
        const captiveExists = g.enemies.some(e => e.type === 'captive');
        const beaming = g.enemies.some(e => e.state === 'beamgo' || e.state === 'beam');
        const r = Math.random();
        if (r < 0.18 && bosses.length && !p.dual && !captiveExists && !beaming && p.state === 'alive' && !g.rescue) {
          const b = bosses[Math.floor(Math.random() * bosses.length)];
          if (!b.cap) { startDive(b, 'beam'); return; }
        }
        if (r < 0.4 && bosses.length) {
          const b = bosses[Math.floor(Math.random() * bosses.length)];
          startDive(b, 'boss');
          // up to two butterfly escorts from the row below
          let n = 0;
          for (const e of form) {
            if (n >= 2) break;
            if (e.type === 'bfly' && e.row === 1 && Math.abs(e.col - b.col) <= 1) {
              e.state = 'escort'; e.lead = b; e.ox = e.x - b.x; e.oy = e.y - b.y; n++;
              e.shots = Math.random() < 0.5 ? 1 : 0;
            }
          }
          return;
        }
        let pool = form.filter(e => e.type === (r < 0.7 ? 'bfly' : 'bee'));
        if (!pool.length) pool = form;
        // prefer edge columns like the original
        pool.sort((a, b) => Math.abs(b.col - 4.5) - Math.abs(a.col - 4.5));
        const pick = pool[Math.floor(Math.random() * Math.min(pool.length, 4))];
        startDive(pick);
      }

      function killEnemy(e, byPlayer) {
        const dive = isDiving(e);
        let pts = 0;
        if (g.challenge) pts = 100;
        else if (e.type === 'bee') pts = dive ? 100 : 50;
        else if (e.type === 'bfly') pts = dive ? 160 : 80;
        else if (e.type === 'boss') {
          if (!dive) pts = 150;
          else { pts = e.escortsKilled >= 2 ? 1600 : e.escortsKilled === 1 ? 800 : 400; pop(e.x, e.y, String(pts), C.cyan); }
        } else if (e.type === 'captive') { pts = 1000; pop(e.x, e.y, '1000', C.cyan); }
        if (byPlayer) addScore(pts);
        g.booms.push({ x: e.x, y: e.y, t: 0 });
        sfx.kill(e.type);
        e.state = 'dead';
        // escorts lose their leader / leader loses escorts
        for (const o of g.enemies) {
          if (o.lead === e && o.state === 'escort') { o.state = 'attack'; o.lead = null; }
        }
        if (e.lead && e.lead.state !== 'dead') e.lead.escortsKilled = (e.lead.escortsKilled || 0) + 1;
        if (g.challenge && e.group != null) {
          g.cHits++;
          if (++g.groupKills[e.group] === 8) {
            const b = g.stage < 10 ? 1000 : g.stage < 18 ? 1500 : g.stage < 26 ? 2000 : 3000;
            addScore(b); pop(e.x, e.y, String(b), C.yellow);
          }
        }
        // a boss holding a captured fighter
        if (e.cap && e.cap.state !== 'dead') {
          const cp = e.cap; cp.host = null; e.cap = null;
          if (dive && g.player.state === 'alive' && !g.player.dual) {
            cp.state = 'rescue'; cp.t = 0; g.rescue = cp;
            g.msg = 'FIGHTER RESCUED'; g.msgT = 0;
          } else { cp.state = 'turncoat'; cp.t = 0; cp.row = -1; cp.col = e.col; }
        }
        if (e.type === 'captive' && e.host) { e.host.cap = null; e.host = null; }
      }

      function hitEnemy(e) {
        if (e.type === 'boss' && e.hp > 1) { e.hp--; sfx.bossHit(); return; }
        killEnemy(e, true);
      }

      // ---------- per-enemy update ----------
      function updEnemy(e) {
        e.t++;
        const p = g.player;
        switch (e.state) {
          case 'path':
            if (runProg(e)) { e.state = 'home'; e.spd = 2.6; }
            if (e.shots && e.y > 90 && e.y < 190 && Math.random() < 0.02) { e.shots--; enemyFire(e); }
            break;
          case 'cpath':
            runProg(e);
            if (e.pi >= e.prog.length || e.x < -30 || e.x > W + 30 || e.y > H + 30 || (e.y < -30 && e.t > 60)) e.state = 'gone';
            break;
          case 'home': case 'return': {
            const tx = slotX(e.col), ty = e.row < 0 ? slotY(0) - 16 : slotY(e.row);
            if (homeTo(e, tx, ty, e.state === 'return' ? 2.2 : 2.6)) { e.state = 'form'; e.ang = -90 * DEG; }
            break;
          }
          case 'form':
            e.x = slotX(e.col); e.y = e.row < 0 ? slotY(0) - 16 : slotY(e.row);
            turnToward(e, -90 * DEG, 0.25);
            break;
          case 'dive':
            if (runProg(e)) {
              if (e.kind === 'beam') {
                e.state = 'beamgo'; e.tx = Math.max(40, Math.min(184, p.x)); e.spd = 2.2;
              } else { e.state = 'attack'; e.spd = Math.min(3.3, 2.1 + g.stage * 0.07); e.t = 0; }
            }
            break;
          case 'attack': {
            const tx = p.state === 'alive' ? p.x : 112;
            let want = Math.atan2(PY - e.y, tx - e.x);
            if (e.y > PY - 30) want = 90 * DEG;
            want = Math.max(35 * DEG, Math.min(145 * DEG, want));
            if (e.type === 'bfly' || e.kind === 'boss') want += Math.sin(e.t * 0.07) * 0.7;
            turnToward(e, want, 0.045);
            e.x += Math.cos(e.ang) * e.spd; e.y += Math.sin(e.ang) * e.spd;
            if (e.shots && e.y > 100 && e.y < 200 && Math.random() < 0.05) { e.shots--; enemyFire(e); }
            if (e.y > H + 12 || e.x < -24 || e.x > W + 24) {
              e.x = slotX(e.col); e.y = -12; e.state = 'return'; e.ang = 90 * DEG; e.kind = null;
            }
            break;
          }
          case 'escort': {
            const L = e.lead;
            if (!L || L.state === 'dead') { e.state = 'attack'; break; }
            if (L.state === 'return' || L.state === 'form') { e.state = 'return'; e.y = L.y + e.oy; e.x = L.x + e.ox; break; }
            e.x = L.x + e.ox; e.y = L.y + e.oy; e.ang = L.ang; e.t++;
            if (e.shots && e.y > 100 && e.y < 200 && Math.random() < 0.04) { e.shots--; enemyFire(e); }
            break;
          }
          case 'beamgo':
            if (homeTo(e, e.tx, 150, 2.2)) { e.state = 'beam'; e.bt = 0; e.ang = 90 * DEG; }
            break;
          case 'beam': {
            e.bt++;
            turnToward(e, 90 * DEG, 0.2);
            if (e.bt < 70) e.bh = e.bt * 1.55;
            else if (e.bt < 230 || (g.capturing === e)) e.bh = 108;
            else e.bh = Math.max(0, 108 - (e.bt - 230) * 1.8);
            if (e.bt % 16 === 1 && e.bh > 0) sfx.beam();
            // capture check
            if (p.state === 'alive' && e.bh >= 104 && Math.abs(p.x - e.x) < 20 && !g.rescue) {
              p.state = 'captured'; p.t = 0; g.capturing = e; p.y = PY;
              g.msg = null;
            }
            if (g.capturing === e) {
              p.x += (e.x - p.x) * 0.06; p.y -= 1.1; p.spin += 0.35;
              if (p.y <= e.y + 20) {
                // fighter is now held by the boss
                const cp = { type: 'captive', x: e.x, y: e.y + 20, ang: -90 * DEG, state: 'held', host: e, row: -1, col: e.col, hp: 1, t: 0 };
                g.enemies.push(cp); e.cap = cp; g.capturing = null;
                p.state = 'capturedWait'; p.t = 0;
                g.msg = 'FIGHTER CAPTURED'; g.msgT = 0; sfx.captured();
                e.bt = Math.max(e.bt, 230);
              }
            } else if (e.bt > 290) {
              if (e.cap) { e.state = 'return'; e.ang = -90 * DEG; }
              else { e.state = 'attack'; e.spd = 2.4; e.t = 0; }
            }
            break;
          }
          case 'held': {
            const hst = e.host;
            if (!hst || hst.state === 'dead') { e.state = 'turncoat'; e.t = 0; break; }
            let tx, ty;
            if (hst.state === 'form' || hst.state === 'home' || hst.state === 'return' || hst.state === 'beam') { tx = hst.x; ty = hst.y - 16; }
            else { tx = hst.x - Math.cos(hst.ang) * 16; ty = hst.y - Math.sin(hst.ang) * 16; }
            e.x += (tx - e.x) * 0.25; e.y += (ty - e.y) * 0.25;
            e.ang = hst.state === 'beam' ? -90 * DEG : hst.ang;
            break;
          }
          case 'turncoat':
            e.ang += 0.35;
            if (e.t > 60) { e.state = 'return'; e.row = -1; e.ang = -90 * DEG; }
            break;
          case 'rescue':
            if (e.t < 70) { e.ang += 0.35; e.y = Math.max(e.y, 20); }
            else {
              if (p.state !== 'alive') { e.state = 'turncoat'; e.t = 0; g.rescue = null; break; }
              const tx = p.x + 16 > 208 ? p.x - 16 : p.x + 16;
              const dx = tx - e.x, dy = PY - e.y, d = Math.hypot(dx, dy);
              e.ang = -90 * DEG;
              if (d <= 2) {
                p.dual = true; p.x = Math.min(tx, p.x) + 8; e.state = 'gone'; g.rescue = null; sfx.rescue();
              } else { e.x += dx / d * 2; e.y += dy / d * 2; }
            }
            break;
        }
      }

      // ---------- stage / main update ----------
      function updatePlay() {
        const p = g.player;
        g.stageT++;
        // spawn queue
        while (g.spawnQ.length && g.spawnQ[0].t <= g.stageT) spawn(g.spawnQ.shift());
        if (!g.spawnQ.length) g.allSpawned = true;
        // formation movement
        const busy = g.enemies.some(e => e.state === 'path' || e.state === 'home');
        if (!g.formDone && g.allSpawned && !busy) g.formDone = true;
        if (!g.formDone) {
          g.sway += 0.25 * g.swayDir; if (Math.abs(g.sway) >= 10) g.swayDir *= -1;
        } else {
          if (Math.abs(g.sway) > 0.3) g.sway -= Math.sign(g.sway) * 0.25;
          g.breathT++; g.breath = (1 - Math.cos(g.breathT * 2 * Math.PI / 150)) * 0.08;
        }

        // player
        if (p.state === 'alive') {
          const sp = 1.75, lim = p.dual ? 16 : 8;
          if (api.key('ArrowLeft')) p.x = Math.max(lim, p.x - sp);
          if (api.key('ArrowRight')) p.x = Math.min(W - lim, p.x + sp);
          if (api.pressed('Space') || api.pressed('KeyX') || api.pressed('KeyZ') || api.pressed('ArrowUp')) firePlayer();
        } else if (p.state === 'dead' || p.state === 'capturedWait') {
          p.t++;
          const busyDivers = g.enemies.some(e => ['dive', 'attack', 'beamgo', 'beam', 'escort'].includes(e.state));
          if (p.t > 160 && !busyDivers && !g.rescue) {
            if (g.lives <= 0) { lastLife(() => { g.lives = 3; p.state = 'ready'; p.t = 0; }); return; }
            p.state = 'ready'; p.t = 0;
          }
        } else if (p.state === 'ready') {
          if (++p.t > 100) { g.lives--; p.state = 'alive'; p.x = 112; p.y = PY; starSpeed = 1; g.msg = null; }
        }

        // player bullets
        for (let i = g.pbul.length - 1; i >= 0; i--) {
          const b = g.pbul[i]; b.y -= 6;
          let hit = false;
          for (const e of g.enemies) {
            if (e.state === 'dead' || e.state === 'gone' || e.state === 'rescue' || e.state === 'turncoat') continue;
            if (Math.abs(e.x - b.x) < 7 && b.y < e.y + 7 && b.y + 8 > e.y - 7) { hitEnemy(e); hit = true; g.hits++; break; }
          }
          if (hit || b.y < -10) g.pbul.splice(i, 1);
        }
        // enemies
        for (const e of g.enemies) updEnemy(e);
        // enemy bodies vs player
        if (p.state === 'alive') {
          const xs = playerShips();
          for (const e of g.enemies) {
            if (e.state === 'dead' || e.state === 'gone' || e.state === 'rescue' || e.state === 'form') continue;
            for (let k = 0; k < xs.length; k++) {
              if (Math.abs(e.x - xs[k]) < 11 && Math.abs(e.y - PY) < 10) {
                killEnemy(e, true); killShip(xs.length > 1 ? k : -1); break;
              }
            }
            if (p.state !== 'alive') break;
          }
        }
        // enemy bullets
        for (let i = g.ebul.length - 1; i >= 0; i--) {
          const b = g.ebul[i]; b.x += b.vx; b.y += b.vy;
          let rm = b.y > H + 8;
          if (!rm && p.state === 'alive' && Math.abs(b.y - PY) < 7) {
            const xs = playerShips();
            for (let k = 0; k < xs.length; k++) if (Math.abs(b.x - xs[k]) < 6) { killShip(xs.length > 1 ? k : -1); rm = true; break; }
          }
          if (rm) g.ebul.splice(i, 1);
        }
        g.enemies = g.enemies.filter(e => e.state !== 'dead' && e.state !== 'gone');

        // attacks
        if (!g.challenge && g.formDone && p.state === 'alive' && !g.rescue) {
          const remaining = g.enemies.filter(e => e.type !== 'captive').length;
          const maxDiv = remaining <= 6 ? remaining : Math.min(6, 2 + Math.floor(g.stage / 3));
          if (--g.attackT <= 0) {
            g.attackT = remaining <= 6 ? 30 : Math.max(45, 150 - g.stage * 8) + Math.floor(Math.random() * 40);
            if (activeDivers() < maxDiv) launchAttack();
          }
        }

        // stage clear?
        if (g.allSpawned && !g.enemies.some(e => e.type !== 'captive' || e.state !== 'held') && !g.rescue && p.state !== 'captured') {
          // any captive left alone just leaves with nothing
          g.enemies = [];
          if (g.challenge) { g.phase = 'results'; g.phaseT = 300; resultsSound(); }
          else { g.phase = 'clear'; g.phaseT = 90; }
        }
      }
      function resultsSound() {
        if (g.cHits === 40) au.melody([[1047, .12], [1319, .12], [1568, .12], [2093, .12], [1568, .12], [2093, .4]], { type: 'square', vol: 0.06, delay: 0.5 });
        else au.melody([[784, .1], [659, .1], [784, .3]], { type: 'square', vol: 0.05, delay: 0.5 });
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 420; g.player.state = 'none';
        au.melody([[523, .2], [494, .2], [440, .2], [392, .2], [349, .4], [330, .6]], { type: 'square', vol: 0.06 });
      }

      // final ship lost: offer a continue (keeps stage and score), else the normal GAME OVER
      function lastLife(onContinue) {
        if (!api.offerContinue) { gameOver(); return; }
        const cg = g;
        api.offerContinue(() => { if (g === cg) onContinue(); }, () => { if (g === cg) gameOver(); });
      }

      function update() {
        frame++; pollCoins(); if (coinFlash > 0) coinFlash--;
        updStars();
        if (mode === 'title') {
          titleT++; starSpeed = 1;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); }
          return;
        }
        // shared animations
        for (const b of g.booms) b.t++;
        g.booms = g.booms.filter(b => b.t < (b.big ? 64 : 24));
        for (const pp of g.pops) pp.t--;
        g.pops = g.pops.filter(pp => pp.t > 0);
        if (g.msg) g.msgT++;
        g.phaseT--;
        if (g.phase === 'intro') {
          if (g.firstIntro && g.phaseT === 160) g.player.state = 'ready0';
          if (g.phaseT <= 0) {
            g.phase = 'play'; g.firstIntro = false;
            if (g.player.state === 'ready0' || g.player.state === 'none') { g.player.state = 'alive'; g.player.x = 112; starSpeed = 1; }
          }
          // allow movement during intro if ship is live
          if (g.player.state === 'alive') {
            if (api.key('ArrowLeft')) g.player.x = Math.max(8, g.player.x - 1.75);
            if (api.key('ArrowRight')) g.player.x = Math.min(W - 8, g.player.x + 1.75);
          }
          return;
        }
        if (g.phase === 'play') { updatePlay(); return; }
        if (g.phase === 'clear' || g.phase === 'results') {
          for (let i = g.pbul.length - 1; i >= 0; i--) { g.pbul[i].y -= 6; if (g.pbul[i].y < -10) g.pbul.splice(i, 1); }
          if (g.player.state === 'alive') {
            if (api.key('ArrowLeft')) g.player.x = Math.max(8, g.player.x - 1.75);
            if (api.key('ArrowRight')) g.player.x = Math.min(W - 8, g.player.x + 1.75);
          }
          if (g.phase === 'results' && g.phaseT === 1 && g.cHits === 40) addScore(10000);
          if (g.phase === 'results' && g.phaseT === 140 && g.cHits < 40) addScore(g.cHits * 100);
          if (g.phaseT <= 0) {
            if (g.player.state !== 'alive') {
              const respawn = () => { g.lives--; g.player.state = 'alive'; g.player.x = 112; nextStage(); };
              if (g.lives <= 0) { lastLife(() => { g.lives = 3; respawn(); }); return; }
              respawn(); return;
            }
            nextStage();
          }
          return;
        }
        if (g.phase === 'over') {
          if (g.phaseT <= 0 || (g.phaseT < 300 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; }
        }
      }

      // ---------- rendering ----------
      function rotIdx(a) { return ((Math.round((a + Math.PI / 2) / (2 * Math.PI) * NROT) % NROT) + NROT) % NROT; }
      function drawSprite(ctx, set, x, y, a) { const im = set[rotIdx(a)]; ctx.drawImage(im, Math.round(x - 9), Math.round(y - 9)); }
      function enemySet(e) {
        const flap = (frame >> 4) & 1;
        if (e.type === 'captive') return e.state === 'rescue' ? SP.fighter[0] : SP.captive[0];
        if (e.type === 'boss') return (e.hp > 1 ? SP.boss : SP.boss2)[e.state === 'form' ? flap : (frame >> 3) & 1];
        return SP[e.type][e.state === 'form' ? flap : (frame >> 3) & 1];
      }
      function drawBeam(ctx, e) {
        const top = Math.round(e.y + 7), h = Math.floor(e.bh), cx = Math.round(e.x);
        const cols = ['#ffffff', '#9ad8ff', '#4a6cff', '#b048ff'];
        for (let d = 0; d < h; d += 2) {
          const hw = Math.round(5 + d * 0.22);
          const band = ((((d - frame * 2) % 32) + 32) % 32) >> 3;
          ctx.fillStyle = cols[band];
          ctx.fillRect(cx - hw, top + d, hw * 2 + 1, 1);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(cx - hw, top + d, 1, 1); ctx.fillRect(cx + hw, top + d, 1, 1);
        }
      }
      function badgesFor(n) {
        const out = []; let r = n;
        for (const v of [50, 30, 20, 10, 5, 1]) while (r >= v) { out.push(v); r -= v; }
        return out;
      }
      function drawHUD(ctx) {
        const sc = g ? g.score : 0;
        if ((frame >> 4) & 1 || mode === 'title') text(ctx, '1UP', 24, 0, C.red, { bold: true });
        text(ctx, String(sc).padStart(2, '0'), 64, 9, C.white, { right: true, bold: true });
        text(ctx, 'HIGH SCORE', 112, 0, C.red, { center: true, bold: true });
        text(ctx, String(hi), 136, 9, C.white, { right: true, bold: true });
      }
      function drawBottom(ctx) {
        if (!g) return;
        const reserve = g.lives;
        for (let i = 0; i < Math.min(reserve, 6); i++) ctx.drawImage(FIGHTER, 2 + i * 16, 272);
        const b = badgesFor(g.stage);
        let x = W - 2;
        for (let i = b.length - 1; i >= 0; i--) {
          const im = BADGE[b[i]]; x -= im.width + 1; if (x < 120) break;
          ctx.drawImage(im, x, 286 - im.height);
        }
      }
      function drawTitle(ctx) {
        // logo
        const lx = 112, ly = 44;
        text(ctx, 'GALAGA', lx + 2, ly + 2, '#5000a0', { center: true, scale: 4, adv: 8, bold: true });
        const bands = [[0, 8, '#a8e0ff'], [8, 16, '#3c82ff'], [16, 28, '#2a48e8']];
        for (const [y0, y1, col] of bands) {
          ctx.save(); ctx.beginPath(); ctx.rect(0, ly + y0, W, y1 - y0); ctx.clip();
          text(ctx, 'GALAGA', lx, ly, col, { center: true, scale: 4, adv: 8, bold: true });
          ctx.restore();
        }
        text(ctx, 'CREDIT ' + Math.min(99, api.credits), 8, 278, C.white, { bold: true });
        if (pushScreen()) {
          text(ctx, 'PUSH START BUTTON', 112, 120, C.cyan, { center: true, bold: true });
          [['1ST BONUS FOR 20000 PTS', 160], ['2ND BONUS FOR 70000 PTS', 180], ['AND FOR EVERY 70000 PTS', 200]].forEach(([s, y]) => {
            ctx.drawImage(FIGHTER, 10, y - 4); text(ctx, s, 120, y, C.yellow, { center: true });
          });
          text(ctx, '© 1981 NAMCO LTD.', 112, 236, C.white, { center: true, bold: true });
          return;
        }
        text(ctx, '-- SCORE --', 112, 92, C.cyan, { center: true, bold: true });
        const rows = [[SP.bee[(frame >> 4) & 1], '50', '100'], [SP.bfly[(frame >> 4) & 1], '80', '160'], [SP.boss[(frame >> 4) & 1], '150', '400']];
        rows.forEach((r, i) => {
          const y = 112 + i * 22;
          drawSprite(ctx, r[0], 52, y + 3, -Math.PI / 2);
          text(ctx, r[1], 112, y, C.white, { right: true, bold: true });
          text(ctx, r[2], 168, y, C.white, { right: true, bold: true });
        });
        text(ctx, 'FORMATION   DIVING', 140, 182, C.purple, { center: true });
        text(ctx, '1ST BONUS FOR 20000 PTS', 112, 202, C.yellow, { center: true });
        text(ctx, '2ND BONUS FOR 70000 PTS', 112, 214, C.yellow, { center: true });
        text(ctx, 'AND FOR EVERY 70000 PTS', 112, 226, C.yellow, { center: true });
        if (api.credits === 0) { if (coinFlash > 0 || ((frame >> 5) & 1)) text(ctx, 'INSERT COIN', 112, 248, coinFlash > 0 && ((frame >> 2) & 1) ? C.yellow : C.red, { center: true, bold: true }); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START BUTTON', 112, 248, C.red, { center: true, bold: true });
        ctx.drawImage(FIGHTER, 105, 262);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        drawStars(ctx);
        if (mode === 'title') { drawHUD(ctx); drawTitle(ctx); return; }
        const p = g.player;
        // beams below enemies
        for (const e of g.enemies) if (e.state === 'beam' && e.bh > 0) drawBeam(ctx, e);
        for (const e of g.enemies) drawSprite(ctx, enemySet(e), e.x, e.y, e.ang);
        // player
        if (p.state === 'alive' || p.state === 'ready0' && false) {
          if (p.dual) { ctx.drawImage(FIGHTER, Math.round(p.x - 8 - 7), PY - 7); ctx.drawImage(FIGHTER, Math.round(p.x + 8 - 7), PY - 7); }
          else ctx.drawImage(FIGHTER, Math.round(p.x - 7), PY - 7);
        } else if (p.state === 'captured') {
          drawSprite(ctx, SP.fighter[0], p.x, p.y, p.spin);
        }
        if (g.phase === 'intro' && g.player.state === 'ready0') ctx.drawImage(FIGHTER, Math.round(p.x - 7), PY - 7);
        // bullets
        for (const b of g.pbul) ctx.drawImage(PBULLET, Math.round(b.x - 1), Math.round(b.y));
        for (const b of g.ebul) ctx.drawImage(EBULLET, Math.round(b.x - 1), Math.round(b.y));
        // explosions
        for (const b of g.booms) {
          if (b.big) { const f = Math.min(7, b.t >> 3); ctx.drawImage(PBOOM[f], Math.round(b.x - 16), Math.round(b.y - 16)); }
          else { const f = Math.min(4, Math.floor(b.t / 5)); ctx.drawImage(BOOM[f], Math.round(b.x - 8), Math.round(b.y - 8)); }
        }
        for (const pp of g.pops) text(ctx, pp.txt, pp.x, pp.y - 3, pp.col, { center: true, adv: 6 });

        // messages
        if (g.phase === 'intro') {
          if (g.firstIntro && g.phaseT > 160) text(ctx, 'PLAYER 1', 112, 140, C.cyan, { center: true, bold: true });
          else if (g.challenge) text(ctx, 'CHALLENGING STAGE', 112, 140, C.cyan, { center: true, bold: true });
          else text(ctx, 'STAGE ' + g.stage, 112, 140, C.cyan, { center: true, bold: true });
          if (g.firstIntro && g.phaseT <= 160) text(ctx, 'READY', 112, 156, C.red, { center: true, bold: true });
        }
        if (p.state === 'ready' && g.phase === 'play') text(ctx, 'READY', 112, 150, C.red, { center: true, bold: true });
        if (g.msg && g.msgT < 180) text(ctx, g.msg, 112, 150, g.msg === 'FIGHTER CAPTURED' ? C.red : C.cyan, { center: true, bold: true });
        if (g.phase === 'results') {
          const t = 300 - g.phaseT;
          if (t > 30) text(ctx, 'NUMBER OF HITS', 24, 130, C.cyan, { bold: true });
          if (t > 60) text(ctx, String(g.cHits), 200, 130, C.cyan, { right: true, bold: true });
          if (t > 100) {
            if (g.cHits === 40) { text(ctx, 'PERFECT !', 112, 150, C.red, { center: true, bold: true }); text(ctx, 'SPECIAL BONUS 10000 PTS', 112, 170, C.yellow, { center: true }); }
            else { text(ctx, 'BONUS', 24, 150, C.yellow, { bold: true }); text(ctx, String(g.cHits * 100), 200, 150, C.yellow, { right: true, bold: true }); }
          }
        }
        if (g.phase === 'over') {
          const t = 420 - g.phaseT;
          if (t < 160) text(ctx, 'GAME OVER', 112, 140, C.cyan, { center: true, bold: true });
          else {
            text(ctx, '- RESULTS -', 112, 110, C.red, { center: true, bold: true });
            text(ctx, 'SHOTS FIRED', 24, 132, C.yellow, { bold: true }); text(ctx, String(g.shots), 204, 132, C.yellow, { right: true, bold: true });
            text(ctx, 'NUMBER OF HITS', 24, 150, C.yellow, { bold: true }); text(ctx, String(g.hits), 204, 150, C.yellow, { right: true, bold: true });
            const ratio = g.shots ? (g.hits / g.shots * 100).toFixed(1) : '0.0';
            text(ctx, 'HIT-MISS RATIO', 24, 168, C.white, { bold: true }); text(ctx, ratio + ' %', 204, 168, C.white, { right: true, bold: true });
          }
        }
        drawHUD(ctx);
        drawBottom(ctx);
      }

      if (api.debugHook) api.debugHook({ g: () => g, next: () => nextStage(), kill: e => killEnemy(e, true), dive: (e, k) => startDive(e, k), killShip: () => killShip(-1), sum: () => g && { phase: g.phase, stage: g.stage, ps: g.player.state, dual: g.player.dual, lives: g.lives, score: g.score, st: g.enemies.map(e => e.type[1] + ':' + e.state).join(',') } });
      return { update, render };
    }
  });
})();
