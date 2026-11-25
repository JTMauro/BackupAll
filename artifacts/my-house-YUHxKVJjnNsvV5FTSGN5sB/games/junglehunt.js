(function () {
  'use strict';
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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8],
    '"': [10, 10, 0, 0, 0, 0, 0], '#': [10, 31, 10, 10, 31, 10, 0], '&': [12, 18, 20, 8, 21, 18, 13], '%': [24, 25, 2, 4, 8, 19, 3]
  };
  // text(ctx, s, x, y, col, scale, align: 'left'|'center'|'right')
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
  function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; }
  // build a sprite canvas from string rows and a palette {char: colour}
  function spr(rows, pal) {
    const h = rows.length, w = rows.reduce((m, r) => Math.max(m, r.length), 0), cv = mk(w, h), c = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) { const p = pal[rows[y][x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } }
    return cv;
  }
  function flipH(cv) { const c = mk(cv.width, cv.height), x = c.getContext('2d'); x.translate(cv.width, 0); x.scale(-1, 1); x.drawImage(cv, 0, 0); return c; }
  const pad = (n, l) => String(Math.max(0, Math.floor(n))).padStart(l, '0');
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const irnd = n => (Math.random() * n) | 0;

  // =====================================================================
  // Jungle Hunt (Taito, 1982) -- from-scratch recreation.
  // Four scenes per round: swing across the vines, swim the crocodile river, run the boulder hill,
  // then jump the cannibals to rescue the girl before she's lowered into the pot.
  // =====================================================================
  const W = 256, H = 224;
  const SCENES = ['VINES', 'RIVER', 'BOULDER HILL', 'CANNIBAL CAMP'];
  const C = { helmet: '#f4ecc8', skin: '#f0b080', shirt: '#e8d890', shorts: '#a88848', boot: '#603010', knife: '#e0e8ff' };

  ArcadeRegistry.register({
    id: 'junglehunt', title: 'Jungle Hunt', year: 1982, maker: 'Taito',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Space: jump / let go / stab \u00b7 Arrows: run, swim, climb vine \u00b7 Down: duck \u00b7 Enter: start',
    marquee: { bg: '#0a3010', fg: '#ffe040', accent: '#ff6020' },
    create(api) {
      const A = api.audio;
      let hi = api.getHiScore(20000);
      let state = 'title', T = 0, score = 0, lives = 3, round = 1, scene = 0, bonus = 5000, nextExtra = 10000;
      let p, camX = 0, camY = 0, vines, monkeys, crocs, boulders, cannibals, girl, parts, pops, deathKind = '', spawnT = 0, clearT = 0;

      // ---------- coin-op ----------
      let lastCred = api.credits, coinFlash = 0;
      function pollCoins() { const c = api.credits; if (c > lastCred) A.tone(1800, .06, { vol: .08, slideTo: 2400 }); lastCred = c; if (coinFlash > 0) coinFlash--; }
      function tryStart() { if (api.useCredit()) { lastCred = api.credits; return true; } coinFlash = 90; A.tone(98, .28, { vol: .14 }); return false; }
      function drawCoin(ctx, y) {
        if (api.credits <= 0) { if (coinFlash > 0 ? (api.frame >> 2) & 1 : (api.frame >> 5) & 1) text(ctx, 'INSERT COIN', W / 2, y, coinFlash > 0 ? '#ff3030' : '#ffd040', 1, 'center'); }
        else if ((api.frame >> 5) & 1) text(ctx, 'PUSH START', W / 2, y, '#ffd040', 1, 'center');
        text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), 4, H - 9, '#c8c8c8');
      }
      const sfx = {
        jump() { A.tone(400, .14, { type: 'square', vol: .08, slideTo: 900 }); },
        catch() { A.tone(660, .05, { type: 'square', vol: .09 }); A.tone(990, .07, { type: 'square', vol: .09, delay: .05 }); },
        yell() { A.melody([[392, .12], [523, .1], [392, .1], [523, .1], [659, .25]], { type: 'sawtooth', vol: .06 }); },
        stab() { A.noise(.06, { vol: .1, freq: 4000, type: 'highpass' }); },
        kill() { A.tone(200, .2, { type: 'square', vol: .12, slideTo: 60 }); },
        bubble() { A.tone(900 + Math.random() * 400, .04, { type: 'sine', vol: .05 }); },
        point() { A.tone(1200, .05, { type: 'square', vol: .07 }); },
        die() { A.melody([[523, .12], [494, .12], [466, .12], [440, .12], [415, .3]], { type: 'square', vol: .1 }); },
        drum(k) { A.tone(k ? 110 : 82, .1, { type: 'triangle', vol: .16 }); },
        rumble() { A.noise(.2, { vol: .08, freq: 300 }); },
        extra() { A.melody([[784, .08], [988, .08], [1175, .08], [1568, .2]], { type: 'square', vol: .1 }); },
        rescue() { A.melody([[523, .12], [659, .12], [784, .12], [1047, .24], [880, .12], [1047, .12], [1319, .4]], { type: 'square', vol: .1 }); }
      };
      function addScore(n, x, y) {
        score += n; if (x != null) pops.push({ x, y, n, t: 50 });
        if (score >= nextExtra) { lives++; nextExtra += 30000; sfx.extra(); }
        if (score > hi) hi = score;
      }

      // ================= scene setup =================
      const VY = 26, VINE_LEDGE_Y = 172, VINE_WATER = 206;
      const SURF = 84, RIVER_BED = 204, RIVER_LEN = 1500;
      const HILL_LEN = 960, hillY = x => 196 - 0.2 * x;
      const CAMP_GROUND = 192, GIRL_X = 228;
      function setupScene() {
        parts = []; pops = []; camX = 0; camY = 0; spawnT = 60;
        const sp = 1 + (round - 1) * 0.12;
        if (scene === 0) {
          const n = Math.min(6 + round, 10); vines = [];
          for (let i = 0; i < n; i++) {
            const L = 78 + irnd(40);
            vines.push({ ax: 70 + i * 76, L, amp: 0.55 + Math.random() * 0.15, w: 0.042 * sp * Math.sqrt(100 / L), ph: i * 2.3 + Math.random() });
          }
          monkeys = [];
          if (round >= 2) for (let i = 2; i < n; i += 3) monkeys.push({ v: i, r: 30, dir: 1, sp: 0.35 + round * 0.05 });
          p = { mode: 'vine', v: 0, r: 46, x: 0, y: 0, vx: 0, vy: 0, last: 0, noGrab: 0, maxV: 0, face: 1, anim: 0 };
        } else if (scene === 1) {
          crocs = []; p = { mode: 'swim', x: 40, y: SURF, face: 1, air: 100, stab: 0, anim: 0 };
        } else if (scene === 2) {
          boulders = []; p = { mode: 'run', x: 30, y: hillY(30), vy: 0, ground: true, duck: false, face: 1, anim: 0 };
        } else {
          const n = Math.min(1 + round, 3);
          cannibals = [];
          for (let i = 0; i < n; i++) { const bx = 92 + i * (110 / n); cannibals.push({ x: bx, base: bx, y: CAMP_GROUND, vy: 0, wait: 20 + irnd(40), passed: false, anim: irnd(30) }); }
          girl = { rope: 18, rate: 44 / Math.max(1500, 3000 - round * 300), saved: false };
          p = { mode: 'run', x: 14, y: CAMP_GROUND, vy: 0, vx: 0, ground: true, duck: false, face: 1, anim: 0 };
        }
      }
      function startGame() {
        score = 0; lives = 3; round = 1; scene = 0; bonus = 5000; nextExtra = 10000;
        setupScene(); state = 'ready'; T = 0;
        A.melody([[392, .1], [392, .1], [523, .1], [392, .1], [659, .2], [587, .1], [523, .3]], { type: 'square', vol: .1 });
      }
      function die(kind) {
        if (state !== 'play') return;
        state = 'dying'; T = 0; deathKind = kind; sfx.die();
      }
      function sceneClear() {
        state = 'sceneclear'; T = 0;
        A.melody([[784, .08], [988, .08], [1175, .16]], { type: 'square', vol: .1 });
      }

      // ================= vines =================
      function vineAng(v) { return v.amp * Math.sin(v.w * api.frame + v.ph); }
      function vinePt(v, r) { const a = vineAng(v); return [v.ax + Math.sin(a) * r, VY + Math.cos(a) * r]; }
      function updateVines() {
        if (p.mode === 'vine') {
          const v = vines[p.v];
          if (api.key('ArrowUp')) p.r = Math.max(24, p.r - 0.7);
          if (api.key('ArrowDown')) p.r = Math.min(v.L - 4, p.r + 0.7);
          const [x, y] = vinePt(v, p.r); p.x = x; p.y = y;
          for (const m of monkeys) if (m.v === p.v && Math.abs(m.r - p.r) < 12) { p.mode = 'fall'; p.vx = 0; p.vy = 0; A.tone(1600, .1, { type: 'square', vol: .1 }); }
          if (p.mode === 'vine' && api.pressed('Space')) {
            const a = vineAng(v), da = v.amp * v.w * Math.cos(v.w * api.frame + v.ph);
            p.vx = p.r * da * Math.cos(a) + 1.35; p.vy = -p.r * da * Math.sin(a) - 1.3;
            p.mode = 'air'; p.last = p.v; p.noGrab = 14; sfx.jump();
          }
        } else {
          p.vy += 0.12; if (api.key('ArrowRight')) p.vx += 0.02; if (api.key('ArrowLeft')) p.vx -= 0.02;
          p.x += p.vx; p.y += p.vy; p.anim++;
          if (p.noGrab > 0) p.noGrab--;
          if (p.mode === 'air') {
            for (let j = 0; j < vines.length; j++) {
              if (j === p.last && p.noGrab > 0) continue;
              const v = vines[j], a = vineAng(v), dx = p.x - v.ax, dy = p.y - VY;
              const t = dx * Math.sin(a) + dy * Math.cos(a), perp = Math.abs(dx * Math.cos(a) - dy * Math.sin(a));
              if (t > 18 && t < v.L && perp < 6) {
                let hitMonkey = false;
                for (const m of monkeys) if (m.v === j && Math.abs(m.r - t) < 12) hitMonkey = true;
                if (hitMonkey) { p.mode = 'fall'; p.vx *= 0.3; break; }
                p.mode = 'vine'; p.v = j; p.r = t; sfx.catch();
                if (j > p.maxV) { p.maxV = j; addScore(100 + 20 * (round - 1), p.x, p.y - 10); }
                break;
              }
            }
          }
          const lastV = vines[vines.length - 1], ledge = lastV.ax + 46;
          if (p.mode === 'air' && p.x > ledge && p.y + 24 >= VINE_LEDGE_Y) { p.y = VINE_LEDGE_Y - 24; sfx.yell(); sceneClear(); return; }
          if (p.y + 24 > VINE_WATER) die('splash');
        }
        for (const m of monkeys) { m.r += m.dir * m.sp; if (m.r > vines[m.v].L - 4) m.dir = -1; if (m.r < 20) m.dir = 1; }
        const target = p.x - 90; if (target > camX) camX += (target - camX) * 0.1;
      }

      // ================= river =================
      function updateRiver() {
        p.anim++;
        const sp = 1.15;
        if (api.key('ArrowLeft')) { p.x -= sp; p.face = -1; }
        if (api.key('ArrowRight')) { p.x += sp; p.face = 1; }
        if (api.key('ArrowUp')) p.y -= sp; else if (api.key('ArrowDown')) p.y += sp;
        else if (p.y < SURF + 6) p.y -= 0.3;
        p.y = clamp(p.y, SURF, RIVER_BED - 6);
        p.x = clamp(p.x, camX + 10, RIVER_LEN + 40);
        if (p.stab > 0) p.stab--;
        if (api.pressed('Space') && p.stab === 0) { p.stab = 14; sfx.stab(); }
        const under = p.y > SURF + 4;
        if (under) { p.air -= 0.22 + round * 0.03; if (api.frame % 40 === 0) sfx.bubble(); }
        else p.air = Math.min(100, p.air + 1.2);
        if (p.air <= 0) { p.air = 0; die('drown'); return; }
        // crocodiles
        if (--spawnT <= 0 && p.x < RIVER_LEN - 160) {
          spawnT = Math.max(50, 150 - round * 15) + irnd(80);
          crocs.push({ x: camX + W + 30, y: Math.random() < 0.3 ? SURF + 4 : SURF + 18 + irnd(RIVER_BED - SURF - 30), sp: 0.55 + round * 0.12 + Math.random() * 0.3, ph: irnd(120), dead: 0 });
        }
        const tipX = p.x + p.face * 15, tipY = p.y;
        for (const c of crocs) {
          if (c.dead) { c.dead++; c.y -= 0.6; c.x -= 0.3; continue; }
          c.x -= c.sp; c.ph++;
          if (round >= 2 && Math.abs(c.x - p.x) < 120) c.y += Math.sign(p.y - c.y) * 0.15 * Math.min(3, round - 1);
          c.y = clamp(c.y, SURF + 4, RIVER_BED - 6);
          const open = (c.ph % 120) < 50;
          c.open = open;
          if (p.stab > 6 && tipX > c.x - 18 && tipX < c.x + 16 && Math.abs(tipY - c.y) < 7) {
            if (!open) { c.dead = 1; sfx.kill(); addScore(100 * Math.min(round, 3) + 100, c.x, c.y - 8); }
          }
          if (!c.dead && Math.abs(p.x - c.x) < 20 && Math.abs(p.y - c.y) < 6) { die('croc'); return; }
        }
        crocs = crocs.filter(c => c.x > camX - 40 && c.dead < 90);
        const target = p.x - 90; if (target > camX) camX += (target - camX) * 0.1;
        camX = Math.min(camX, RIVER_LEN + 60 - W + 40);
        if (p.x >= RIVER_LEN && !under) sceneClear();
      }

      // ================= running (hill + camp) =================
      function runControls(groundAt) {
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight');
        p.duck = p.ground && api.key('ArrowDown');
        if (p.ground) {
          p.vx = p.duck ? 0 : (R ? 1.1 : 0) - (L ? 1.0 : 0);
          if (R) p.face = 1; else if (L) p.face = -1;
          if (api.anyPressed('Space', 'ArrowUp') && !p.duck) { p.ground = false; p.vy = -3.7; p.vx = p.vx * 1.35; sfx.jump(); }
        }
        p.x += p.vx; if (p.vx) p.anim++;
        if (!p.ground) {
          p.vy += 0.16; p.y += p.vy;
          const g = groundAt(p.x);
          if (p.y >= g) { p.y = g; p.ground = true; p.vy = 0; }
        } else p.y = groundAt(p.x);
      }
      function updateHill() {
        runControls(hillY);
        p.x = Math.max(p.x, camX + 8);
        if (--spawnT <= 0 && p.x < HILL_LEN - 120) {
          spawnT = Math.max(70, 170 - round * 15) + irnd(90);
          const kind = Math.random() < 0.45 ? 'bounce' : 'roll';
          const r = kind === 'roll' ? (Math.random() < 0.5 ? 6 : 10) : 7;
          boulders.push({ x: camX + W + 20, kind, r, sp: 1.3 + round * 0.15 + Math.random() * 0.6, ph: 0, hgt: 28 + irnd(10), rot: 0, passed: false, by: 0 });
          sfx.rumble();
        }
        const ph = p.duck ? 10 : 21;
        for (const b of boulders) {
          b.x -= b.sp; b.rot += b.sp / b.r; b.ph += 0.07;
          const g = hillY(b.x);
          b.by = b.kind === 'roll' ? g - b.r : g - b.r - Math.abs(Math.sin(b.ph)) * b.hgt;
          if (b.kind === 'bounce' && Math.abs(Math.sin(b.ph)) < 0.06) A.tone(90, .05, { type: 'triangle', vol: .06 });
          // collision: circle vs player box
          const nx = clamp(b.x, p.x - 4, p.x + 4), ny = clamp(b.by, p.y - ph, p.y);
          if ((b.x - nx) ** 2 + (b.by - ny) ** 2 < (b.r - 1) ** 2) { die('boulder'); return; }
          if (!b.passed && b.x < p.x - 8) { b.passed = true; addScore(100, p.x, p.y - 30); sfx.point(); }
        }
        boulders = boulders.filter(b => b.x > camX - 30);
        const target = p.x - 70; if (target > camX) camX += (target - camX) * 0.12;
        camY = hillY(camX + 70) - 180;
        if (p.x >= HILL_LEN) sceneClear();
      }
      function updateCamp() {
        runControls(() => CAMP_GROUND);
        p.x = clamp(p.x, 6, W - 10);
        if (api.frame % 30 === 0) sfx.drum((api.frame / 30) & 1);
        for (const c of cannibals) {
          c.anim++;
          if (c.y >= CAMP_GROUND && c.vy >= 0) {
            c.y = CAMP_GROUND; c.vy = 0;
            if (--c.wait <= 0) {
              c.vy = -(2.4 + Math.random() * 1.6 + round * 0.1); c.wait = Math.max(8, 40 - round * 4) + irnd(40);
              c.dir = Math.abs(p.x - c.x) < 70 && p.x < c.x ? -1 : (c.x < c.base ? 1 : (Math.random() < 0.5 ? -1 : 1));
            }
          } else { c.vy += 0.15; c.y += c.vy; c.x += c.dir * (0.5 + round * 0.08); c.x = clamp(c.x, c.base - 30, Math.min(c.base + 30, GIRL_X - 30)); if (c.y > CAMP_GROUND) c.y = CAMP_GROUND; }
          const ph = p.duck ? 10 : 21;
          if (Math.abs(c.x - p.x) < 8 && p.y > c.y - 24 && p.y - ph < c.y) { die('spear'); return; }
          if (!c.passed && p.x > c.x + 8) { c.passed = true; addScore(200 * Math.min(round, 3), c.x, c.y - 34); sfx.point(); }
        }
        girl.rope += girl.rate;
        if (girl.rope >= 62) { die('pot'); return; }
        if (p.x >= GIRL_X - 18) {
          state = 'rescue'; T = 0; girl.saved = true; sfx.rescue();
        }
      }

      // ================= main update =================
      function gameOver() { state = 'gameover'; T = 0; api.setHiScore(score); }
      function update() {
        T++; pollCoins();
        for (const q of pops || []) q.t--;
        if (pops) pops = pops.filter(q => q.t > 0);
        switch (state) {
          case 'title':
            if (api.anyPressed('Enter', 'Space') && tryStart()) startGame();
            break;
          case 'ready':
            if (scene === 0) { const [x, y] = vinePt(vines[p.v], p.r); p.x = x; p.y = y; }
            if (T > 110) { state = 'play'; T = 0; }
            break;
          case 'play':
            if (api.frame % 32 === 0 && bonus > 0) bonus -= 10;
            if (scene === 0) updateVines(); else if (scene === 1) updateRiver(); else if (scene === 2) updateHill(); else updateCamp();
            break;
          case 'dying':
            if (deathKind === 'splash' || deathKind === 'boulder' || deathKind === 'spear') { p.y += Math.min(4, T * 0.15); }
            if (deathKind === 'drown' || deathKind === 'croc') p.y += 0.3;
            if (T > 130) {
              if (lives > 1) { lives--; setupScene(); state = 'ready'; T = 0; }
              else if (api.offerContinue) api.offerContinue(() => { lives = 3; setupScene(); state = 'ready'; T = 0; }, () => { lives = 0; gameOver(); });
              else { lives = 0; gameOver(); }
            }
            break;
          case 'sceneclear':
            if (scene >= 1) { p.x += 0.8; p.anim++; if (scene === 2) p.y = hillY(Math.min(p.x, HILL_LEN)); }
            if (T > 100) { scene++; setupScene(); state = 'ready'; T = 0; }
            break;
          case 'rescue':
            if (T === 120) { addScore(bonus); }
            if (T > 320) { round++; scene = 0; bonus = 5000; setupScene(); state = 'ready'; T = 0; }
            break;
          case 'gameover':
            if (T > 240 || (T > 60 && api.anyPressed('Enter'))) { state = 'title'; T = 0; }
            break;
        }
      }

      // ================= drawing =================
      // explorer, facing right unless face<0. pose: run|jump|duck|hang|swim
      function drawExplorer(ctx, sx, sy, pose, face, anim, extra) {
        sx = Math.round(sx); sy = Math.round(sy);
        const r = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(face < 0 ? sx - x - w : sx + x, sy + y, w, h); };
        if (pose === 'hang') {
          r(-2, 0, 1, 6, C.skin); r(2, 0, 1, 6, C.skin);
          r(-3, 4, 7, 2, C.helmet); r(-4, 6, 9, 1, C.helmet); r(-2, 7, 5, 3, C.skin);
          r(-3, 10, 7, 7, C.shirt); r(-3, 17, 7, 3, C.shorts);
          const k = (anim >> 3) & 1;
          r(-3, 20, 2, 4 + k, C.skin); r(2, 20, 2, 5 - k, C.skin); r(-3, 23 + k, 2, 1, C.boot); r(2, 24 - k, 2, 1, C.boot);
          return;
        }
        if (pose === 'swim') {
          const k = (anim >> 3) & 1;
          r(4, -5, 6, 2, C.helmet); r(3, -3, 8, 1, C.helmet); r(5, -2, 4, 3, C.skin);
          r(-5, -2, 10, 4, C.shirt); r(-9, -2, 4, 3, C.shorts);
          r(-15, k ? -2 : 0, 6, 2, C.skin); r(-16, k ? 0 : -2, 5, 2, C.skin);
          if (extra) { r(9, 1, 3, 1, C.skin); r(12, 0, 6, 1, C.knife); r(12, 1, 1, 1, '#806040'); }
          else r(k ? 8 : 6, k ? 1 : -4, 4, 1, C.skin);
          return;
        }
        if (pose === 'duck') {
          r(-3, -12, 7, 2, C.helmet); r(-4, -10, 9, 1, C.helmet); r(-1, -9, 4, 3, C.skin);
          r(-3, -7, 7, 4, C.shirt); r(-4, -3, 8, 2, C.shorts); r(-4, -1, 3, 1, C.boot); r(2, -1, 3, 1, C.boot);
          return;
        }
        r(-3, -22, 7, 2, C.helmet); r(-4, -20, 9, 1, C.helmet); r(-2, -19, 5, 4, C.skin); r(2, -18, 1, 1, '#000');
        r(-3, -15, 6, 7, C.shirt); r(-3, -8, 6, 3, C.shorts);
        if (pose === 'jump') {
          r(3, -15, 3, 1, C.skin); r(5, -17, 1, 2, C.skin);
          r(-3, -5, 2, 2, C.skin); r(-5, -4, 2, 1, C.boot); r(1, -5, 2, 3, C.skin); r(2, -3, 2, 1, C.boot);
          return;
        }
        const k = (anim >> 3) & 1;
        if (k) { r(-4, -5, 2, 4, C.skin); r(-5, -1, 3, 1, C.boot); r(2, -5, 2, 4, C.skin); r(3, -1, 3, 1, C.boot); r(2, -14, 2, 4, C.skin); }
        else { r(-1, -5, 2, 4, C.skin); r(-1, -1, 3, 1, C.boot); r(1, -5, 2, 4, C.skin); r(1, -1, 3, 1, C.boot); r(-1, -14, 2, 5, C.skin); }
      }
      function drawJungleBack(ctx, cx, sky) {
        ctx.fillStyle = sky || '#1c5a2a'; ctx.fillRect(0, 16, W, H - 16);
        // distant trunks
        for (let x = -40; x < W + 40; x += 34) { const wx = Math.floor((x + cx * 0.5) / 34); const sx = wx * 34 - cx * 0.5; ctx.fillStyle = '#2a4a1c'; ctx.fillRect(Math.round(sx), 16, 8 + (wx & 3), H); }
        // canopy
        for (let x = -20; x < W + 20; x += 10) { const wx = Math.floor((x + cx) / 10); const sx = wx * 10 - cx; ctx.fillStyle = (wx & 1) ? '#2e8a2a' : '#3aa83a'; ctx.fillRect(Math.round(sx), 16, 11, 8 + ((wx * 7) & 7)); ctx.fillStyle = '#1e6a1e'; ctx.fillRect(Math.round(sx) + 3, 22 + ((wx * 5) & 7), 5, 3); }
      }
      function drawVines(ctx) {
        const cx = Math.round(camX);
        drawJungleBack(ctx, cx, '#185028');
        // swamp water under the vines
        ctx.fillStyle = '#1838a0'; ctx.fillRect(0, VINE_WATER, W, H - VINE_WATER);
        ctx.fillStyle = '#4060d0'; for (let x = 0; x < W; x += 8) ctx.fillRect(x + ((api.frame >> 3) & 7), VINE_WATER + 2, 4, 1);
        // start branch and finish ledge
        ctx.fillStyle = '#6a4020'; ctx.fillRect(-cx - 10, 60, 90, 6);
        const lastV = vines[vines.length - 1], ledge = lastV.ax + 46;
        ctx.fillStyle = '#5a3a18'; ctx.fillRect(ledge - cx, VINE_LEDGE_Y, 400, VINE_WATER - VINE_LEDGE_Y);
        ctx.fillStyle = '#40a030'; ctx.fillRect(ledge - cx, VINE_LEDGE_Y, 400, 3);
        for (const v of vines) {
          const sx = v.ax - cx; if (sx < -140 || sx > W + 140) continue;
          const a = vineAng(v);
          ctx.fillStyle = '#58b030';
          for (let r = 0; r < v.L; r += 2) { const x = sx + Math.sin(a) * r, y = VY + Math.cos(a) * r; ctx.fillRect(Math.round(x), Math.round(y), 2, 2); }
          ctx.fillStyle = '#30801c'; ctx.fillRect(Math.round(sx) - 3, VY - 4, 7, 4);
        }
        for (const m of monkeys) {
          const v = vines[m.v]; const [x, y] = vinePt(v, m.r), sx = Math.round(x - cx), sy = Math.round(y);
          if (sx < -10 || sx > W + 10) continue;
          ctx.fillStyle = '#8a4a18'; ctx.fillRect(sx - 3, sy - 2, 6, 7); ctx.fillRect(sx - 2, sy - 6, 5, 4);
          ctx.fillStyle = '#e0a070'; ctx.fillRect(sx - 1, sy - 5, 3, 2);
          ctx.fillStyle = '#8a4a18'; ctx.fillRect(sx + 3, sy + 3 + ((m.r >> 2) & 1), 3, 1); ctx.fillRect(sx - 5, sy, 2, 1);
        }
        if (p.mode === 'vine' || p.mode === 'air' || p.mode === 'fall' || state !== 'play') drawExplorer(ctx, p.x - cx, p.y, 'hang', 1, api.frame, 0);
      }
      function drawRiver(ctx) {
        const cx = Math.round(camX);
        drawJungleBack(ctx, cx, '#206030');
        ctx.fillStyle = '#103090'; ctx.fillRect(0, SURF - 2, W, H - SURF + 2);
        for (let y = SURF + 10; y < RIVER_BED; y += 14) { ctx.fillStyle = '#183ca8'; for (let x = 0; x < W; x += 24) ctx.fillRect(((x - cx * 0.6 + y * 3) % W + W) % W, y, 10, 1); }
        ctx.fillStyle = '#80b0ff'; for (let x = 0; x < W; x += 6) ctx.fillRect(x, SURF - 2 + (((x + cx + (api.frame >> 2)) >> 3) & 1), 4, 1);
        ctx.fillStyle = '#806030'; ctx.fillRect(0, RIVER_BED, W, H - RIVER_BED);
        for (let x = -10; x < W + 10; x += 12) { const wx = Math.floor((x + cx) / 12); ctx.fillStyle = '#2a8a3a'; ctx.fillRect(wx * 12 - cx, RIVER_BED - 3 - (wx & 3), 2, 4 + (wx & 3)); }
        // far bank
        const bx = RIVER_LEN + 20 - cx;
        if (bx < W) { ctx.fillStyle = '#6a4a20'; ctx.fillRect(bx, SURF - 14, W, H); ctx.fillStyle = '#40a030'; ctx.fillRect(bx, SURF - 14, W, 3); }
        for (const c of crocs) {
          const sx = Math.round(c.x - cx), sy = Math.round(c.y);
          if (c.dead) {
            ctx.fillStyle = '#c8d080'; ctx.fillRect(sx - 16, sy - 2, 30, 4); ctx.fillStyle = '#4a7a20'; ctx.fillRect(sx - 14, sy + 2, 26, 2);
            continue;
          }
          ctx.fillStyle = '#3a7a20'; ctx.fillRect(sx - 8, sy - 3, 22, 6); ctx.fillRect(sx + 14, sy - 1, 8, 3); ctx.fillRect(sx + 22, sy, 4, 1);
          ctx.fillStyle = '#2a5a14'; for (let i = 0; i < 5; i++) ctx.fillRect(sx - 6 + i * 4, sy - 4, 2, 1);
          ctx.fillStyle = '#c8d080'; ctx.fillRect(sx - 6, sy + 2, 18, 1);
          const leg = (c.ph >> 3) & 1; ctx.fillStyle = '#3a7a20'; ctx.fillRect(sx - 4 + leg, sy + 3, 2, 2); ctx.fillRect(sx + 8 - leg, sy + 3, 2, 2);
          // head and jaws (facing left)
          ctx.fillStyle = '#3a7a20';
          if (c.open) {
            ctx.fillRect(sx - 18, sy - 7, 11, 3); ctx.fillRect(sx - 12, sy - 4, 4, 2); ctx.fillRect(sx - 18, sy + 2, 11, 2);
            ctx.fillStyle = '#ff6060'; ctx.fillRect(sx - 14, sy - 3, 6, 4);
            ctx.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) { ctx.fillRect(sx - 17 + i * 3, sy - 4, 1, 1); ctx.fillRect(sx - 17 + i * 3, sy + 1, 1, 1); }
          } else { ctx.fillRect(sx - 18, sy - 2, 10, 4); ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 16, sy, 6, 1); }
          ctx.fillStyle = '#ffff40'; ctx.fillRect(sx - 9, sy - 4, 2, 1);
        }
        drawExplorer(ctx, p.x - cx, p.y, 'swim', p.face, p.anim, p.stab > 4);
        if (p.y > SURF + 4 && (api.frame & 15) < 6) { ctx.fillStyle = '#c0e0ff'; ctx.fillRect(Math.round(p.x - cx + p.face * 8), Math.round(p.y) - 8 - ((api.frame & 15) >> 1), 2, 2); }
        // air meter
        text(ctx, 'AIR', 8, SURF - 30, '#ffffff');
        ctx.fillStyle = '#202020'; ctx.fillRect(28, SURF - 30, 102, 7);
        ctx.fillStyle = p.air > 30 ? '#40e0ff' : ((api.frame >> 2) & 1 ? '#ff3030' : '#ffff40'); ctx.fillRect(29, SURF - 29, Math.round(p.air), 5);
      }
      function drawHill(ctx) {
        const cx = Math.round(camX), cy = Math.round(camY);
        ctx.fillStyle = '#6ab0e8'; ctx.fillRect(0, 16, W, H);
        ctx.fillStyle = '#88c8f0'; ctx.fillRect(0, 16, W, 30);
        // distant mountains
        ctx.fillStyle = '#7a8a9a';
        for (let x = 0; x < W; x += 4) { const wx = (x + cx * 0.3); const h = 30 + Math.sin(wx * 0.03) * 16 + Math.sin(wx * 0.011) * 10; ctx.fillRect(x, 120 - h, 4, h + 200); }
        // hill surface
        for (let x = 0; x < W; x += 2) {
          const wx = x + cx, gy = Math.round(hillY(wx) - cy);
          ctx.fillStyle = wx > HILL_LEN + 20 ? '#3a9a2a' : '#8a6a3a'; ctx.fillRect(x, gy, 2, H - gy);
          ctx.fillStyle = '#5a8a2a'; ctx.fillRect(x, gy, 2, 2);
          if (((wx >> 1) * 13) % 17 === 0) { ctx.fillStyle = '#6a4a20'; ctx.fillRect(x, gy + 8 + (wx % 11), 3, 2); }
        }
        // summit flag
        const fx = HILL_LEN + 10 - cx, fy = hillY(HILL_LEN + 10) - cy;
        ctx.fillStyle = '#ffffff'; ctx.fillRect(fx, fy - 30, 1, 30); ctx.fillStyle = '#ff3030'; ctx.fillRect(fx + 1, fy - 30, 10, 6);
        for (const b of boulders) {
          const sx = Math.round(b.x - cx), sy = Math.round(b.by - cy), r = b.r;
          ctx.fillStyle = '#7a6a5a'; ctx.fillRect(sx - r + 1, sy - r, 2 * r - 2, 2 * r); ctx.fillRect(sx - r, sy - r + 1, 2 * r, 2 * r - 2);
          ctx.fillStyle = '#a89888'; ctx.fillRect(sx - r + 2, sy - r + 1, r, 2);
          ctx.fillStyle = '#4a3a2a';
          for (let k = 0; k < 2; k++) { const a = b.rot + k * Math.PI; ctx.fillRect(Math.round(sx + Math.cos(a) * r * 0.5), Math.round(sy + Math.sin(a) * r * 0.5), 2, 2); }
          if (b.kind === 'bounce') { const g = Math.round(hillY(b.x) - cy); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(sx - 4, g - 1, 8, 2); }
        }
        const pose = p.duck ? 'duck' : (!p.ground ? 'jump' : 'run');
        drawExplorer(ctx, p.x - cx, p.y - cy, state === 'dying' ? 'duck' : pose, p.face, p.anim, 0);
      }
      function drawCamp(ctx) {
        ctx.fillStyle = '#081830'; ctx.fillRect(0, 16, W, H);
        ctx.fillStyle = '#e8e0a0'; ctx.fillRect(30, 30, 10, 10); ctx.fillStyle = '#081830'; ctx.fillRect(34, 28, 8, 10);
        ctx.fillStyle = '#ffffff'; for (let i = 0; i < 20; i++) ctx.fillRect((i * 53) % W, 20 + (i * 31) % 70, 1, 1);
        ctx.fillStyle = '#0e3a1a'; for (let x = 0; x < W; x += 12) ctx.fillRect(x, 100 - ((x * 7) % 30), 14, 100);
        ctx.fillStyle = '#5a3a18'; ctx.fillRect(0, CAMP_GROUND, W, H - CAMP_GROUND);
        ctx.fillStyle = '#7a5a28'; for (let x = 0; x < W; x += 10) ctx.fillRect(x + 3, CAMP_GROUND + 4 + (x % 3) * 3, 4, 1);
        // huts
        for (const hx of [40, 170]) { ctx.fillStyle = '#8a6a30'; ctx.fillRect(hx, CAMP_GROUND - 26, 26, 26); ctx.fillStyle = '#c0a050'; for (let i = 0; i < 8; i++) ctx.fillRect(hx - 4 + i * 2, CAMP_GROUND - 34 + i, 34 - i * 4, 1); ctx.fillStyle = '#201008'; ctx.fillRect(hx + 9, CAMP_GROUND - 12, 8, 12); }
        // pole, girl and pot
        ctx.fillStyle = '#6a4020'; ctx.fillRect(GIRL_X + 14, 100, 3, CAMP_GROUND - 100); ctx.fillRect(GIRL_X - 6, 100, 23, 3);
        const gy = 103 + Math.round(girl.rope);
        ctx.fillStyle = '#c0a060'; ctx.fillRect(GIRL_X, 103, 1, gy - 103);
        if (!girl.saved) {
          ctx.fillStyle = '#f0b080'; ctx.fillRect(GIRL_X - 1, gy, 3, 4); ctx.fillRect(GIRL_X - 2, gy + 4, 5, 3);
          ctx.fillStyle = '#ffe040'; ctx.fillRect(GIRL_X - 3, gy + 3, 1, 8); ctx.fillRect(GIRL_X + 3, gy + 3, 1, 8);
          ctx.fillStyle = '#ff60a0'; ctx.fillRect(GIRL_X - 2, gy + 7, 5, 8);
          ctx.fillStyle = '#f0b080'; ctx.fillRect(GIRL_X - 2, gy + 15, 2, 5); ctx.fillRect(GIRL_X + 1, gy + 15, 2, 5);
        }
        ctx.fillStyle = '#303030'; ctx.fillRect(GIRL_X - 14, CAMP_GROUND - 20, 30, 18); ctx.fillRect(GIRL_X - 16, CAMP_GROUND - 22, 34, 3);
        ctx.fillStyle = '#e0e0e0'; ctx.fillRect(GIRL_X - 12, CAMP_GROUND - 23, 4 + (api.frame >> 4 & 1) * 2, 2);
        for (let i = 0; i < 6; i++) { ctx.fillStyle = (api.frame + i * 5) & 8 ? '#ff8020' : '#ffe040'; ctx.fillRect(GIRL_X - 12 + i * 5, CAMP_GROUND - 2 - ((api.frame >> 2) + i) % 4, 3, 3 + ((api.frame >> 2) + i) % 4); }
        for (const c of cannibals) {
          const sx = Math.round(c.x), sy = Math.round(c.y), k = (c.anim >> 4) & 1;
          ctx.fillStyle = '#5a2a10'; ctx.fillRect(sx - 3, sy - 20, 6, 5); ctx.fillRect(sx - 3, sy - 15, 7, 8);
          ctx.fillStyle = '#ff4040'; ctx.fillRect(sx - 4, sy - 24, 8, 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 2, sy - 27, 1, 3); ctx.fillRect(sx + 1, sy - 28, 1, 4);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 2, sy - 18, 1, 1); ctx.fillRect(sx + 1, sy - 18, 1, 1);
          ctx.fillStyle = '#40c040'; ctx.fillRect(sx - 4, sy - 8, 8, 3);
          ctx.fillStyle = '#5a2a10'; ctx.fillRect(sx - 3 - k, sy - 5, 2, 5); ctx.fillRect(sx + 1 + k, sy - 5, 2, 5);
          // spear
          ctx.fillStyle = '#c0a060'; ctx.fillRect(sx - 7, sy - 30 + k * 2, 1, 26); ctx.fillStyle = '#e0e0ff'; ctx.fillRect(sx - 8, sy - 33 + k * 2, 3, 3);
        }
        if (state === 'rescue') {
          drawExplorer(ctx, GIRL_X - 18, CAMP_GROUND, 'run', 1, 0, 0);
          ctx.fillStyle = '#f0b080'; ctx.fillRect(GIRL_X - 9, CAMP_GROUND - 19, 3, 4); ctx.fillStyle = '#ffe040'; ctx.fillRect(GIRL_X - 10, CAMP_GROUND - 20, 5, 2);
          ctx.fillStyle = '#ff60a0'; ctx.fillRect(GIRL_X - 10, CAMP_GROUND - 15, 5, 9); ctx.fillStyle = '#f0b080'; ctx.fillRect(GIRL_X - 10, CAMP_GROUND - 6, 2, 6); ctx.fillRect(GIRL_X - 7, CAMP_GROUND - 6, 2, 6);
          if (T > 30) { const hy = CAMP_GROUND - 40 - Math.min(20, (T - 30) * 0.3); ctx.fillStyle = '#ff3060'; ctx.fillRect(GIRL_X - 18, hy, 3, 2); ctx.fillRect(GIRL_X - 14, hy, 3, 2); ctx.fillRect(GIRL_X - 18, hy + 2, 7, 2); ctx.fillRect(GIRL_X - 17, hy + 4, 5, 1); ctx.fillRect(GIRL_X - 16, hy + 5, 3, 1); ctx.fillRect(GIRL_X - 15, hy + 6, 1, 1); }
        } else {
          const pose = p.duck ? 'duck' : (!p.ground ? 'jump' : 'run');
          drawExplorer(ctx, p.x, p.y, pose, p.face, p.anim, 0);
        }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 16);
        text(ctx, '1UP', 4, 0, '#ff4040'); text(ctx, pad(score, 6), 4, 8, '#ffffff');
        text(ctx, 'HI-SCORE', W / 2, 0, '#ff4040', 1, 'center'); text(ctx, pad(hi, 6), W / 2, 8, '#ffffff', 1, 'center');
        text(ctx, 'BONUS', W - 4, 0, '#40ff40', 1, 'right'); text(ctx, pad(bonus, 4), W - 4, 8, '#ffffff', 1, 'right');
        for (let i = 0; i < Math.min(lives - 1, 5); i++) { ctx.fillStyle = C.helmet; ctx.fillRect(48 + i * 9, 9, 6, 3); ctx.fillRect(47 + i * 9, 12, 8, 1); ctx.fillStyle = C.skin; ctx.fillRect(49 + i * 9, 13, 4, 2); }
        text(ctx, 'R' + round, 168, 8, '#ffd040');
        for (let pi = 0, x; pi < 4; pi++) { ctx.fillStyle = pi === scene ? '#ffd040' : pi < scene ? '#806020' : '#404040'; ctx.fillRect(184 + pi * 6, 9, 4, 4); }
        for (const q of pops) text(ctx, String(q.n), Math.round(q.x - camX), Math.round(q.y - camY - (50 - q.t) * 0.3), '#ffff80', 1, 'center');
      }
      function drawScene(ctx) {
        if (scene === 0) drawVines(ctx); else if (scene === 1) drawRiver(ctx); else if (scene === 2) drawHill(ctx); else drawCamp(ctx);
      }
      function drawTitle(ctx) {
        drawJungleBack(ctx, T * 0.3, '#103818');
        // swinging explorer
        const a = 0.7 * Math.sin(T * 0.04), ax = 200, L = 70;
        ctx.fillStyle = '#58b030'; for (let r = 0; r < L; r += 2) ctx.fillRect(Math.round(ax + Math.sin(a) * r), Math.round(26 + Math.cos(a) * r), 2, 2);
        drawExplorer(ctx, ax + Math.sin(a) * L, 26 + Math.cos(a) * L, 'hang', 1, T, 0);
        text(ctx, 'JUNGLE', 22, 40, '#802000', 3); text(ctx, 'JUNGLE', 20, 38, '#ffe040', 3);
        text(ctx, 'HUNT', 46, 66, '#802000', 3); text(ctx, 'HUNT', 44, 64, '#ff8020', 3);
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(16, 100, W - 32, 92);
        if (Math.floor(T / 400) % 2 === 0) {
          text(ctx, 'SAVE THE GIRL FROM', W / 2, 106, '#ffffff', 1, 'center');
          text(ctx, 'THE CANNIBALS!', W / 2, 116, '#ffffff', 1, 'center');
          SCENES.forEach((s, i) => text(ctx, (i + 1) + '. ' + s, 70, 132 + i * 11, '#c0ffc0'));
        } else {
          text(ctx, '- SCORE -', W / 2, 106, '#ffffff', 1, 'center');
          const rows = [['VINE CAUGHT', '100'], ['CROCODILE', '200+'], ['BOULDER PASSED', '100'], ['CANNIBAL JUMPED', '200+'], ['RESCUE', 'BONUS']];
          rows.forEach((r, i) => { text(ctx, r[0], 40, 120 + i * 12, '#c0ffc0'); text(ctx, r[1], W - 40, 120 + i * 12, '#ffd040', 1, 'right'); });
        }
        text(ctx, 'HI-SCORE ' + pad(hi, 6), W / 2, 196, '#ff6060', 1, 'center');
        text(ctx, '\u00a9 1982 TAITO', W - 4, H - 9, '#ffffff', 1, 'right');
        drawCoin(ctx, 206);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { drawTitle(ctx); return; }
        drawScene(ctx);
        drawHUD(ctx);
        if (state === 'ready') {
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(48, 92, W - 96, 30);
          text(ctx, 'ROUND ' + round + ' - ' + SCENES[scene], W / 2, 96, '#ffd040', 1, 'center');
          if ((T >> 4) & 1) text(ctx, 'GO!', W / 2, 110, '#ffffff', 1, 'center');
        } else if (state === 'dying') {
          const msg = { drown: 'OUT OF AIR!', croc: 'CHOMP!', pot: 'TOO LATE!' }[deathKind];
          if (msg) text(ctx, msg, W / 2, 100, '#ff4040', 1, 'center');
        } else if (state === 'rescue') {
          text(ctx, 'YOU SAVED HER!', W / 2, 60, '#ff80c0', 2, 'center');
          if (T > 100) text(ctx, 'BONUS ' + bonus, W / 2, 84, '#ffffff', 1, 'center');
        } else if (state === 'gameover') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(60, 90, W - 120, 30);
          text(ctx, 'GAME OVER', W / 2, 98, '#ff4040', 2, 'center');
        }
      }
      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
