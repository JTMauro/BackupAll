// Domino Man (Bally Midway, 1983) -- from-scratch recreation: set up a long chain of dominoes on the marked
// spots while the neighborhood bully, the bag lady and killer bees try to knock them over. Stand in the way of
// a falling chain to stop it; finish the set and watch the whole line topple for a bonus.
(function () {
  'use strict';
  // ---------- compact 5x7 bitmap font ----------
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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8]
  };
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) {
        const bits = g[r]; if (!bits) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
  }
  function spr(rows, pal) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
    return c;
  }

  const W = 256, H = 240, FY = 36, CELL = 16, HUDB = 228;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const cx = c => c * CELL + 8, cy = r => FY + r * CELL + 8;

  const LAYOUTS = [
    { name: 'MAIN STREET', pts: [[2, 2], [12, 2], [12, 5], [3, 5], [3, 8], [12, 8]] },
    { name: 'CITY BLOCK', pts: [[1, 9], [1, 2], [8, 2], [8, 9], [14, 9], [14, 3]] },
    { name: 'THE SPIRAL', pts: [[2, 1], [13, 1], [13, 9], [3, 9], [3, 4], [10, 4], [10, 6]] },
    { name: 'DOUBLE DOUBLE', pts: [[1, 1], [1, 9], [5, 9], [5, 3], [10, 3], [10, 9], [14, 9], [14, 1]] }
  ];
  function expand(pts) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      let [c, r] = pts[i]; const [c2, r2] = pts[i + 1];
      const dc = Math.sign(c2 - c), dr = Math.sign(r2 - r);
      while (c !== c2 || r !== r2) { out.push([c, r]); c += dc; r += dr; }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  // Domino Man: bald, mustache, white shirt; 2 walk frames (12x16)
  const MPAL = { S: '#ffc890', K: '#202020', W: '#ffffff', B: '#3050c0', R: '#c03020', H: '#804020' };
  const MAN = [spr([
    '....SSSS....',
    '...SSSSSS...',
    '...SKSSKS...',
    '...SSSSSS...',
    '...HHHHHH...',
    '....SSSS....',
    '..WWWRRWWW..',
    '.SWWWRRWWWS.',
    '.S.WWWWWW.S.',
    '...WWWWWW...',
    '...BBBBBB...',
    '...BBB.BBB..',
    '...BB...BB..',
    '...BB...BB..',
    '..KKK...KK..',
    '.........K..'], MPAL), spr([
    '....SSSS....',
    '...SSSSSS...',
    '...SKSSKS...',
    '...SSSSSS...',
    '...HHHHHH...',
    '....SSSS....',
    '..WWWRRWWW..',
    '.SWWWRRWWWS.',
    '.S.WWWWWW.S.',
    '...WWWWWW...',
    '...BBBBBB...',
    '..BBB.BBB...',
    '..BB...BB...',
    '..BB...BB...',
    '..KK...KKK..',
    '..K.........'], MPAL)];
  const BPAL = { S: '#e0a070', K: '#202020', R: '#e02020', W: '#ffffff', J: '#2040a0', H: '#402010' };
  const BULLY = [spr([
    '....HHHHH.....',
    '...HSSSSSH....',
    '...SKSSKSS....',
    '...SSSSSSS....',
    '....SKKKS.....',
    '..RWRWRWRWR...',
    '.SRWRWRWRWRS..',
    'SSRWRWRWRWRSS.',
    'SS.RWRWRWR.SS.',
    '...JJJJJJJ....',
    '...JJJ.JJJ....',
    '...JJ...JJ....',
    '...JJ...JJ....',
    '..KKK...KKK...'], BPAL), spr([
    '....HHHHH.....',
    '...HSSSSSH....',
    '...SKSSKSS....',
    '...SSSSSSS....',
    '....SKKKS.....',
    '..RWRWRWRWR...',
    '.SRWRWRWRWRS..',
    'SSRWRWRWRWRSS.',
    'SS.RWRWRWR.SS.',
    '...JJJJJJJ....',
    '..JJJ...JJJ...',
    '..JJ.....JJ...',
    '.JJ.......JJ..',
    'KKK.......KKK.'], BPAL)];
  const LADY = [spr([
    '...PPPP...........',
    '..PGGGGP..........',
    '..GSKSKG..........',
    '..GSSSSG.CCCCCCCC.',
    '...SSSS..CYOYGYOC.',
    '..MMMMMMSSCCCCCCCC',
    '.MMMMMMM..C......C',
    '.MMMMMMM..CCCCCCCC',
    '.MMMMMMM...C....C.',
    '..MMMMM...........',
    '..S...S....K....K.',
    '..KK..KK..........'], { P: '#a040a0', G: '#c0c0c0', S: '#f0c090', K: '#202020', M: '#806040', C: '#c0c0d0', Y: '#ffe040', O: '#ff8020' })];
  LADY.push(LADY[0]);
  const BEE = [spr(['.WW.WW..', '.WW.WW..', '..YKYKY.', 'KYKYKYKK', '..YKYKY.', '........'], { W: '#d0f0ff', Y: '#ffd800', K: '#202020' }),
    spr(['........', '.WW.WW..', '.WWYWWY.', 'KYKYKYKK', '..YKYKY.', '........'], { W: '#d0f0ff', Y: '#ffd800', K: '#202020' })];
  const CUP = spr(['.W.W..', '..W...', 'CCCCC.', 'CBBBCC', 'CBBBC.C', 'CBBBCC', '.CCC..', 'DDDDD.'], { W: '#c0c0c0', C: '#ffffff', B: '#804020', D: '#a0a0a0' });

  ArcadeRegistry.register({
    id: 'dominoman', title: 'Domino Man', year: 1983, maker: 'Bally Midway',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: walk \u00b7 Space: set a domino on a marked spot \u00b7 stand in a falling chain to stop it \u00b7 Enter: start',
    marquee: { bg: '#102040', fg: '#ffffff', accent: '#ffd800' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(10000);
      let mode = 'title', frame = 0, coinFlash = 0, titleT = 0;
      let g = null;

      const sfx = {
        place() { au.tone(1200, 0.04, { type: 'square', vol: 0.08 }); au.tone(800, 0.04, { type: 'square', vol: 0.06, delay: 0.03 }); },
        tick(i) { au.tone(900 + (i % 8) * 60, 0.03, { type: 'square', vol: 0.06 }); },
        knock() { au.noise(0.12, { freq: 2000, vol: 0.12 }); au.tone(300, 0.15, { type: 'square', slideTo: 150, vol: 0.06 }); },
        save() { au.melody([[784, .06], [1047, .1]], { type: 'square', vol: 0.1 }); },
        die() { au.melody([[880, .1], [831, .1], [784, .1], [740, .1], [698, .1], [659, .1], [622, .1], [587, .3]], { type: 'square', vol: 0.1 }); },
        bee() { au.tone(220 + Math.random() * 30, 0.08, { type: 'sawtooth', vol: 0.03 }); },
        bonus() { au.melody([[1047, .06], [1319, .06], [1568, .06], [2093, .12]], { type: 'square', vol: 0.1 }); },
        clear() { au.melody([[523, .12], [659, .12], [784, .12], [1047, .12], [988, .12], [1047, .36]], { type: 'square', vol: 0.11 }); },
        tune() { au.melody([[392, .12], [440, .12], [494, .12], [523, .24], [494, .12], [440, .12], [392, .36]], { type: 'square', vol: 0.09 }); au.melody([[196, .36], [262, .36], [247, .36], [196, .36]], { type: 'triangle', vol: 0.1 }); },
        extra() { au.melody([[1047, .08], [1319, .08], [1568, .08], [2093, .2]], { type: 'square', vol: 0.1 }); },
        over() { au.melody([[392, .2], [349, .2], [330, .2], [262, .6]], { type: 'square', vol: 0.1 }); }
      };

      // ---------------- game state ----------------
      function newGame() {
        g = { score: 0, lives: 3, round: 0, nextExtra: 20000, p: { x: 0, y: 0, dir: 1, walk: 0, dead: 0, inv: 0 },
          doms: [], enemies: [], phase: 'intro', phaseT: 0, msg: '', msgT: 0, over: 0, pops: [], bonusItem: null, bonusT: 900, ladyT: 600, beeT: 900, finI: 0, finT: 0 };
        startRound();
      }
      function startRound() {
        g.round++;
        const L = LAYOUTS[(g.round - 1) % LAYOUTS.length];
        g.layout = L;
        g.doms = expand(L.pts).map(([c, r], i) => ({ c, r, x: cx(c), y: cy(r), st: 0, t: 0, dir: 0, i, fx: 0, fy: 0 }));
        resetActors();
        g.phase = 'intro'; g.phaseT = 150; g.bonusT = 900; g.ladyT = 700; g.beeT = g.round >= 2 ? 500 : 1300;
        sfx.tune();
      }
      function resetActors() {
        const p = g.p;
        p.x = 128; p.y = cy(11) - 2; p.dead = 0; p.inv = 90;
        if (g.doms.some(d => Math.abs(d.x - p.x) < 8 && Math.abs(d.y - p.y) < 8)) p.y = cy(10);
        g.enemies = [{ type: 'bully', x: 16, y: cy(0), sp: Math.min(1.05, 0.55 + g.round * 0.06), tx: 16, ty: cy(0), rt: 0, f: 0 }];
        if (g.round >= 3) g.enemies.push({ type: 'bully', x: W - 16, y: cy(0), sp: Math.min(0.95, 0.45 + g.round * 0.05), tx: W - 16, ty: cy(0), rt: 60, f: 0 });
      }
      function addScore(n) {
        g.score += n;
        if (g.score >= g.nextExtra) { g.lives++; g.nextExtra += 30000; sfx.extra(); }
        if (g.score > hi) hi = g.score;
      }
      function pop(x, y, t, c) { g.pops.push({ x, y, t: 50, txt: t, c: c || '#ffd800' }); }

      // ---------------- dominoes ----------------
      function spotAt(x, y, r) { r = r || 7; for (const d of g.doms) if (Math.abs(d.x - x) < r && Math.abs(d.y - y) < r) return d; return null; }
      function playerBlocks(d) { const p = g.p; return !p.dead && g.phase === 'play' && Math.abs(p.x - d.x) < 8 && Math.abs(p.y + 4 - d.y) < 9; }
      function knock(d, dir) {
        if (d.st !== 1) return;
        d.st = 2; d.t = 0; d.dir = dir;
        let nb = dir < 0 ? g.doms[d.i - 1] : g.doms[d.i + 1], sg = 1;
        if (!nb) { nb = dir < 0 ? g.doms[d.i + 1] : g.doms[d.i - 1]; sg = -1; }
        if (nb) { const dx = nb.x - d.x, dy = nb.y - d.y, l = Math.hypot(dx, dy) || 1; d.fx = dx / l * sg; d.fy = dy / l * sg; }
        else { d.fx = 1; d.fy = 0; }
        sfx.tick(d.i);
      }
      function propagate(j, dir) {
        const n = g.doms[j];
        if (!n || n.st !== 1) return;
        if (playerBlocks(n)) { addScore(50); pop(n.x, n.y - 10, 'SAVED', '#80ff80'); sfx.save(); return; }
        knock(n, dir);
        if (g.phase === 'finale') { addScore(10 * g.round); g.finCount++; }
      }
      function updDoms() {
        const step = g.phase === 'finale' ? 4 : 6;
        for (const d of g.doms) {
          if (d.st !== 2) continue;
          d.t++;
          if (d.t === step) {
            if (d.dir <= 0) propagate(d.i - 1, -1);
            if (d.dir >= 0) propagate(d.i + 1, 1);
          }
          if (d.t >= 10) d.st = 3;
        }
      }

      // ---------------- enemies ----------------
      function updEnemies() {
        const p = g.p;
        for (const e of g.enemies) {
          e.f++;
          if (e.type === 'bully') {
            if (--e.rt <= 0) {
              e.rt = 90 + rnd(0, 90);
              const standing = g.doms.filter(d => d.st === 1);
              if (standing.length && Math.random() < 0.6) { const d = standing[(Math.random() * standing.length) | 0]; e.tx = d.x; e.ty = d.y; }
              else { e.tx = p.x; e.ty = p.y; }
            }
            // axis-aligned walking, like a city block
            const dx = e.tx - e.x, dy = e.ty - e.y;
            if (Math.abs(dx) > 1 && (Math.abs(dx) >= Math.abs(dy) || (e.f >> 6) & 1)) { e.x += Math.sign(dx) * e.sp; e.face = Math.sign(dx); }
            else if (Math.abs(dy) > 1) e.y += Math.sign(dy) * e.sp;
            else e.rt = Math.min(e.rt, 10);
            const d = spotAt(e.x, e.y + 2, 6);
            if (d && d.st === 1) { knock(d, 0); sfx.knock(); }
            if (!p.dead && p.inv <= 0 && Math.abs(e.x - p.x) < 9 && Math.abs(e.y - p.y) < 11) killPlayer();
          } else if (e.type === 'lady') {
            e.x += e.vx;
            const d = spotAt(e.x + e.vx * 6, e.y + 2, 6);
            if (d && d.st === 1) { knock(d, 0); sfx.knock(); }
            if (e.x < -30 || e.x > W + 30) e.dead = true;
          } else if (e.type === 'bee') {
            e.t++;
            if (e.t > 720) { e.y -= 1.5; e.x += Math.sin(e.t * 0.2); if (e.y < 10) e.dead = true; continue; }
            const dx = p.x - e.x, dy = p.y - 4 - e.y, l = Math.hypot(dx, dy) || 1;
            e.vx += dx / l * 0.08 + rnd(-0.15, 0.15); e.vy += dy / l * 0.08 + rnd(-0.15, 0.15);
            const s = Math.hypot(e.vx, e.vy), m = Math.min(1.5, 0.8 + g.round * 0.06);
            if (s > m) { e.vx *= m / s; e.vy *= m / s; }
            e.x = clamp(e.x + e.vx, 4, W - 4); e.y = clamp(e.y + e.vy, FY, HUDB - 4);
            if (e.t % 8 === 0) sfx.bee();
            if (!p.dead && p.inv <= 0 && Math.abs(e.x - p.x) < 6 && Math.abs(e.y - (p.y - 4)) < 7) killPlayer();
          }
        }
        g.enemies = g.enemies.filter(e => !e.dead);
        // arrivals
        if (--g.ladyT <= 0) {
          g.ladyT = Math.max(400, 900 - g.round * 60) + rnd(0, 300);
          const rows = [...new Set(g.doms.map(d => d.r))];
          const r = rows[(Math.random() * rows.length) | 0], left = Math.random() < 0.5;
          g.enemies.push({ type: 'lady', x: left ? -20 : W + 20, y: cy(r) - 2, vx: (left ? 1 : -1) * (0.6 + g.round * 0.04), f: 0 });
        }
        if (--g.beeT <= 0) {
          g.beeT = Math.max(500, 1300 - g.round * 120) + rnd(0, 300);
          if (!g.enemies.some(e => e.type === 'bee')) g.enemies.push({ type: 'bee', x: Math.random() < 0.5 ? 4 : W - 4, y: FY + 4, vx: 0, vy: 0, t: 0, f: 0 });
        }
      }

      // ---------------- player ----------------
      function killPlayer() {
        const p = g.p; if (p.dead) return;
        p.dead = 140; sfx.die();
      }
      function afterDeath() {
        if (g.lives <= 0) { lastLife(() => { g.lives = 3; resetActors(); }); return; }
        g.lives--; resetActors();
      }
      function lastLife(onC) {
        const cg = g;
        if (!api.offerContinue) { gameOver(); return; }
        api.offerContinue(() => { if (g === cg) onC(); }, () => { if (g === cg) gameOver(); });
      }
      function gameOver() { api.setHiScore(g.score); g.over = 300; sfx.over(); }

      function updPlayer() {
        const p = g.p;
        if (p.dead) { if (--p.dead === 0) afterDeath(); return; }
        if (p.inv > 0) p.inv--;
        const sp = 1.25;
        let mx = 0, my = 0;
        if (api.key('ArrowLeft')) mx = -1; else if (api.key('ArrowRight')) mx = 1;
        if (api.key('ArrowUp')) my = -1; else if (api.key('ArrowDown')) my = 1;
        if (mx || my) {
          p.x = clamp(p.x + mx * sp, 6, W - 6); p.y = clamp(p.y + my * sp, FY + 6, HUDB - 8);
          if (mx) p.dir = mx; p.walk++;
        }
        if (api.anyPressed('Space', 'KeyX', 'KeyZ')) {
          const d = spotAt(p.x, p.y + 4, 9);
          if (d && (d.st === 0 || d.st === 3)) {
            d.st = 1; addScore(10); sfx.place();
            if (g.doms.every(o => o.st === 1)) { g.phase = 'finale'; g.phaseT = 50; g.finCount = 0; g.msg = 'ALL SET!'; g.msgT = 90; }
          }
        }
        if (g.bonusItem && Math.abs(g.bonusItem.x - p.x) < 9 && Math.abs(g.bonusItem.y - p.y) < 10) {
          const v = 300 * g.round; addScore(v); pop(p.x, p.y - 14, String(v)); sfx.bonus(); g.bonusItem = null;
        }
      }

      function updGame() {
        for (const q of g.pops) q.t--;
        g.pops = g.pops.filter(q => q.t > 0);
        if (g.msgT > 0) g.msgT--;
        if (g.over > 0) { if (--g.over <= 0 || (g.over < 220 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; g = null; } return; }
        if (g.phase === 'intro') { if (--g.phaseT <= 0) g.phase = 'play'; return; }
        if (g.phase === 'finale') {
          updDoms();
          if (g.phaseT > 0 && --g.phaseT === 0) { const d0 = g.doms[0]; knock(d0, 1); addScore(10 * g.round); g.finCount = 1; }
          if (g.phaseT === 0 && !g.doms.some(d => d.st === 2)) {
            const bonus = g.finCount * 10 * g.round + 1000 * g.round;
            addScore(1000 * g.round); g.clearBonus = bonus;
            g.phase = 'clear'; g.phaseT = 180; sfx.clear();
          }
          return;
        }
        if (g.phase === 'clear') { if (--g.phaseT <= 0) startRound(); return; }
        updPlayer();
        if (g.phase !== 'play') return;
        updDoms();
        updEnemies();
        if (g.bonusItem && --g.bonusItem.t <= 0) g.bonusItem = null;
        if (!g.bonusItem && --g.bonusT <= 0) {
          g.bonusT = 900 + rnd(0, 600);
          for (let k = 0; k < 20; k++) {
            const c = (Math.random() * 16) | 0, r = (Math.random() * 12) | 0;
            if (!g.doms.some(d => d.c === c && d.r === r)) { g.bonusItem = { x: cx(c), y: cy(r), t: 420 }; break; }
          }
        }
      }

      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; au.tone(98, 0.25, { type: 'square', vol: 0.12 }); return false;
      }
      function update() {
        frame++; if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); }
          return;
        }
        updGame();
      }

      // ---------------- rendering ----------------
      function drawStreet(ctx) {
        ctx.fillStyle = '#2a3048'; ctx.fillRect(0, FY, W, HUDB - FY);
        ctx.fillStyle = '#323a56';
        for (let r = 0; r < 12; r++) for (let c = 0; c < 16; c++) if ((r + c) & 1) ctx.fillRect(c * CELL, FY + r * CELL, CELL, CELL);
        ctx.fillStyle = '#20263a';
        for (let x = 0; x <= W; x += CELL) ctx.fillRect(x, FY, 1, HUDB - FY);
        for (let y = FY; y <= HUDB; y += CELL) ctx.fillRect(0, y, W, 1);
        // buildings along the top
        const cols = ['#803020', '#605080', '#307050', '#806030'];
        for (let i = 0; i < 8; i++) {
          const h = 10 + ((i * 7) % 5) * 2;
          ctx.fillStyle = cols[i & 3]; ctx.fillRect(i * 32, FY - h - 2, 32, h + 2);
          ctx.fillStyle = (frame >> 6) % 8 === i ? '#ffe080' : '#c0b060';
          for (let x = 4; x < 28; x += 8) ctx.fillRect(i * 32 + x, FY - h + 1, 4, 3);
        }
        ctx.fillStyle = '#909090'; ctx.fillRect(0, FY - 2, W, 2);
      }
      function drawDomino(ctx, d) {
        const x = Math.round(d.x), y = Math.round(d.y);
        if (d.st === 0) {
          ctx.fillStyle = '#7080a0'; ctx.fillRect(x - 3, y + 2, 7, 1); ctx.fillRect(x, y - 1, 1, 7);
          ctx.fillStyle = '#a0b0d0'; ctx.fillRect(x - 1, y + 1, 3, 3);
          return;
        }
        if (d.st === 1) {
          ctx.fillStyle = '#000'; ctx.fillRect(x - 3, y - 7, 8, 14);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 4, y - 8, 8, 14);
          ctx.fillStyle = '#000'; ctx.fillRect(x - 4, y - 1, 8, 1);
          const pips = (d.i * 7) % 6 + 1, top = (d.i * 3) % 6 + 1;
          drawPips(ctx, x - 4, y - 8, top); drawPips(ctx, x - 4, y, pips);
          return;
        }
        // falling / fallen: lying in the direction of the fall
        const k = d.st === 2 ? Math.min(1, d.t / 8) : 1;
        ctx.fillStyle = d.st === 3 ? '#a8a8a8' : '#ffffff';
        if (Math.abs(d.fx) >= Math.abs(d.fy)) {
          const w = Math.round(8 + 8 * k), h = Math.round(14 - 8 * k);
          ctx.fillRect(d.fx >= 0 ? x - 4 : x + 4 - w, y + 6 - h, w, h);
        } else {
          const off = Math.round(d.fy * 7 * k), h = Math.round(14 - 6 * k);
          ctx.fillRect(x - 4, y - 8 + off + ((14 - h) >> 1), 8, h);
        }
        if (d.st === 3) { ctx.fillStyle = '#606060'; ctx.fillRect(x - 1, y, 2, 2); }
      }
      function drawPips(ctx, x, y, n) {
        ctx.fillStyle = '#000';
        const P = { 1: [[3, 3]], 2: [[1, 1], [5, 5]], 3: [[1, 1], [3, 3], [5, 5]], 4: [[1, 1], [5, 1], [1, 5], [5, 5]], 5: [[1, 1], [5, 1], [3, 3], [1, 5], [5, 5]], 6: [[1, 1], [5, 1], [1, 3], [5, 3], [1, 5], [5, 5]] }[n];
        for (const [a, b] of P) ctx.fillRect(x + a, y + b - (b > 3 ? 1 : 0), 1, 1);
      }
      function drawSprite(ctx, im, x, y, flip) {
        if (flip) { ctx.save(); ctx.translate(Math.round(x), 0); ctx.scale(-1, 1); ctx.drawImage(im, -Math.floor(im.width / 2), Math.round(y - im.height)); ctx.restore(); }
        else ctx.drawImage(im, Math.round(x - im.width / 2), Math.round(y - im.height));
      }
      function drawGame(ctx) {
        drawStreet(ctx);
        // draw by depth (y)
        const items = [];
        for (const d of g.doms) items.push({ y: d.y + 6, f: () => drawDomino(ctx, d) });
        if (g.bonusItem) items.push({ y: g.bonusItem.y + 4, f: () => { if (g.bonusItem.t > 90 || (frame & 4)) ctx.drawImage(CUP, g.bonusItem.x - 3, g.bonusItem.y - 4); } });
        for (const e of g.enemies) {
          if (e.type === 'bully') items.push({ y: e.y + 8, f: () => drawSprite(ctx, BULLY[(e.f >> 3) & 1], e.x, e.y + 8, e.face < 0) });
          else if (e.type === 'lady') items.push({ y: e.y + 6, f: () => drawSprite(ctx, LADY[0], e.x, e.y + 7, e.vx < 0) });
        }
        const p = g.p;
        if (!(p.inv > 0 && (frame >> 2) & 1)) items.push({ y: p.y + 8, f: () => {
          if (p.dead) {
            ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y)); ctx.rotate(Math.PI / 2 * Math.min(1, (140 - p.dead) / 20)); ctx.drawImage(MAN[0], -6, -8); ctx.restore();
            for (let i = 0; i < 3; i++) { const a = frame * 0.15 + i * 2.1; ctx.fillStyle = '#ffe040'; ctx.fillRect(Math.round(p.x + Math.cos(a) * 8), Math.round(p.y - 12 + Math.sin(a) * 3), 2, 2); }
          } else drawSprite(ctx, MAN[(p.walk >> 3) & 1], p.x, p.y + 8, p.dir < 0);
        } });
        items.sort((a, b) => a.y - b.y);
        for (const it of items) it.f();
        for (const e of g.enemies) if (e.type === 'bee') ctx.drawImage(BEE[(frame >> 1) & 1], Math.round(e.x - 4), Math.round(e.y - 3));
        for (const q of g.pops) text(ctx, q.txt, q.x, q.y - (50 - q.t) * 0.3, q.c, 1, 'center');
        // hint for the next empty spot when only a few remain
        const left = g.doms.filter(d => d.st !== 1).length;
        if (g.phase === 'play' && left > 0 && left <= 3 && (frame >> 4) & 1) for (const d of g.doms) if (d.st !== 1) { ctx.strokeStyle = '#ffd800'; ctx.strokeRect(d.x - 6, d.y - 6, 12, 12); }
        if (g.phase === 'intro') {
          ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(40, 108, 176, 30);
          text(ctx, 'ROUND ' + g.round, W / 2, 112, '#ffd800', 1, 'center'); text(ctx, g.layout.name, W / 2, 124, '#ffffff', 1, 'center');
        }
        if (g.phase === 'clear') {
          ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(30, 100, 196, 40);
          text(ctx, 'ROUND CLEAR!', W / 2, 106, '#ffd800', 2, 'center'); text(ctx, 'BONUS ' + g.clearBonus, W / 2, 126, '#ffffff', 1, 'center');
        }
        if (g.msgT > 0 && (frame >> 3) & 1) text(ctx, g.msg, W / 2, 96, '#ffd800', 2, 'center');
        if (g.over > 0) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 106, W, 30); text(ctx, 'GAME OVER', W / 2, 112, '#ff4040', 2, 'center'); }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 16); ctx.fillRect(0, HUDB, W, H - HUDB);
        text(ctx, '1UP', 4, 0, '#ff4040'); text(ctx, String(g ? g.score : 0).padStart(6, '0'), 4, 8, '#ffffff');
        text(ctx, 'HIGH SCORE', W / 2, 0, '#ff4040', 1, 'center'); text(ctx, String(hi).padStart(6, '0'), W / 2, 8, '#ffffff', 1, 'center');
        if (!g) return;
        text(ctx, 'ROUND ' + g.round, W - 4, 0, '#ffd800', 1, 'right');
        const set = g.doms.filter(d => d.st === 1).length;
        text(ctx, set + '/' + g.doms.length, W - 4, 8, '#ffffff', 1, 'right');
        for (let i = 0; i < Math.min(6, g.lives); i++) ctx.drawImage(MAN[0], 4 + i * 12, HUDB + 1, 8, 11);
        ctx.fillStyle = '#304060'; ctx.fillRect(90, HUDB + 4, 160, 5);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(90, HUDB + 4, 160 * set / g.doms.length, 5);
      }
      function drawTitle(ctx) {
        drawStreet(ctx);
        ctx.fillStyle = 'rgba(0,0,20,.65)'; ctx.fillRect(0, FY, W, HUDB - FY);
        text(ctx, 'DOMINO', W / 2 + 2, 46, '#600000', 4, 'center'); text(ctx, 'DOMINO', W / 2, 44, '#ffffff', 4, 'center');
        text(ctx, 'MAN', W / 2 + 2, 78, '#600000', 4, 'center'); text(ctx, 'MAN', W / 2, 76, '#ff3030', 4, 'center');
        // a little demo chain topples across the title
        const n = 14, ph = titleT % 240;
        for (let i = 0; i < n; i++) {
          const x = 30 + i * 15, fallen = ph > 60 && (ph - 60) / 6 > i;
          if (fallen) { ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x - 2, 128, 14, 6); }
          else { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 4, 120, 8, 14); ctx.fillStyle = '#000'; ctx.fillRect(x - 4, 127, 8, 1); drawPips(ctx, x - 4, 120, (i % 6) + 1); drawPips(ctx, x - 4, 128, ((i * 5) % 6) + 1); }
        }
        drawSprite(ctx, MAN[(frame >> 3) & 1], 18, 136, false);
        drawSprite(ctx, BULLY[(frame >> 3) & 1], 40, 172, false); text(ctx, 'THE BULLY', 56, 162, '#ff6060');
        drawSprite(ctx, LADY[0], 150, 172, false); text(ctx, 'BAG LADY', 166, 162, '#c080ff');
        ctx.drawImage(BEE[(frame >> 1) & 1], 36, 178); text(ctx, 'KILLER BEE', 56, 178, '#ffd800');
        ctx.drawImage(CUP, 148, 177); text(ctx, 'BONUS', 166, 178, '#ffffff');
        if (api.credits === 0) { if (coinFlash > 0 || (frame >> 5) & 1) text(ctx, 'INSERT COIN', W / 2, 198, coinFlash && (frame >> 2) & 1 ? '#ffd800' : '#ff4040', 1, 'center'); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START', W / 2, 198, '#40ff60', 1, 'center');
        text(ctx, '\u00a9 1983 BALLY MIDWAY', W / 2, 212, '#ffffff', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, HUDB + 3, '#ffffff');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title' || !g) { drawTitle(ctx); drawHUD(ctx); ctx.fillStyle = '#000'; ctx.fillRect(0, HUDB, W, 12); text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, HUDB + 3, '#ffffff'); return; }
        drawGame(ctx);
        drawHUD(ctx);
      }
      return { update, render, destroy() { } };
    }
  });
})();
