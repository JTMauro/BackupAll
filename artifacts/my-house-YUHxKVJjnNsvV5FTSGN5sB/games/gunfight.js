// Gun Fight (Midway, 1975) \u2014 from-scratch recreation. Two cowboys duel across the desert; cacti, pine trees
// and a rolling covered wagon soak up (and get chewed by) the bullets. Six shots each, ricochets off the top and
// bottom of the screen, a 60-second duel clock. 1P vs CPU ladder or 2P head-to-head.
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

  const W = 256, H = 224;
  const FY0 = 22, FY1 = 210;            // ricochet lines (top / bottom of the playfield)
  const CW = 12, CH = 24;               // cowboy box
  const LMIN = 4, LMAX = 90, RMIN = 154, RMAX = 240;
  const BSPD = 3, BVY = 1.55;           // bullet speed / diagonal vertical speed
  const SHOTS = 6, DUEL = 60;

  // obstacle bitmaps (each char = a 2x2 pixel cell)
  const CACTUS = [
    '....####....', '...######...', '...######.##', '...######.##', '##.######.##', '##.######.##', '##.######.##',
    '##.########.', '##.#######..', '##########..', '.#########..', '...######...', '...######...', '...######...',
    '...######...', '...######...', '...######...', '...######...', '...######...', '...######...', '..########..'];
  const TREE = [
    '.....##.....', '....####....', '...######...', '....####....', '...######...', '..########..', '....####....',
    '..########..', '.##########.', '...######...', '..########..', '.##########.', '############', '.....##.....',
    '.....##.....', '....####....'];
  const WAGON = [
    '....################....', '...##################...', '..####################..', '..####################..',
    '..####################..', '..####################..', '..####################..', '########################',
    '########################', '..####............####..', '.######..........######.', '.######..........######.',
    '..####............####..'];
  const SCENES = [
    [['c', 116, 96]],
    [['w', 104, 60, 0.55]],
    [['t', 60, 44], ['t', 172, 150], ['c', 116, 108]],
    [['c', 116, 28], ['t', 116, 92], ['c', 116, 152]],
    [['w', 104, 120, -0.8], ['c', 64, 54], ['c', 168, 128]],
    [['t', 116, 30], ['t', 116, 160], ['c', 70, 110], ['c', 162, 70]]
  ];

  ArcadeRegistry.register({
    id: 'gunfight', title: 'Gun Fight', year: 1975, maker: 'Midway',
    width: W, height: H, vector: false, pointer: false,
    controls: '1P: Arrows/WASD move, Space/Q fire (hold Up/Down to aim) \u00b7 2P: WASD+Q vs Arrows+Space \u00b7 Up/Down+Enter: mode',
    marquee: { bg: '#2a1406', fg: '#ffd27a', accent: '#e8402a' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(10);
      let mode = 'title', frame = 0, coinFlash = 0, titleT = 0, menuSel = 0;
      let lastCred = api.credits, coinOp = false;
      let g = null;

      function pollCoins() {
        const c = api.credits; if (c === 0) coinOp = true;
        if (c > lastCred) au.tone(1760, 0.06, { type: 'square', vol: 0.07, slideTo: 2640 });
        lastCred = c;
      }
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 });
        return false;
      }
      const credStr = () => 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0');

      // ---------- sound ----------
      const sfx = {
        shot() { au.noise(0.18, { vol: 0.22, freq: 3200, slideTo: 300 }); au.tone(180, 0.08, { type: 'square', vol: 0.08, slideTo: 60 }); },
        ricochet() { au.tone(2400, 0.16, { type: 'triangle', vol: 0.08, slideTo: 900 }); },
        thud() { au.noise(0.07, { vol: 0.15, freq: 700 }); },
        click() { au.tone(1400, 0.02, { type: 'square', vol: 0.06 }); },
        reload() { for (let i = 0; i < 6; i++) au.tone(900 + i * 40, 0.025, { type: 'square', vol: 0.05, delay: i * 0.05 }); },
        hit() {
          au.noise(0.25, { vol: 0.22, freq: 1800, slideTo: 200 });
          // a little "funeral march" phrase
          au.melody([[196, .3], [196, .22], [196, .08], [196, .3], [233, .22], [220, .08], [220, .22], [196, .08], [196, .22], [185, .08], [196, .4]],
            { type: 'square', vol: 0.07, delay: 0.25 });
        },
        tick() { au.tone(1000, 0.02, { type: 'square', vol: 0.05 }); },
        win() { au.melody([[392, .1], [523, .1], [659, .1], [784, .3]], { type: 'square', vol: 0.12 }); },
        lose() { au.melody([[392, .2], [330, .2], [262, .2], [196, .45]], { type: 'square', vol: 0.12 }); },
        menu() { au.tone(660, 0.03, { type: 'square', vol: 0.1 }); }
      };

      // ---------- obstacles ----------
      function mkObs(kind, x, y, vy) {
        const src = kind === 'c' ? CACTUS : kind === 't' ? TREE : WAGON;
        const cw = src[0].length, ch = src.length, cells = new Uint8Array(cw * ch);
        for (let r = 0; r < ch; r++) for (let c = 0; c < cw; c++) cells[r * cw + c] = src[r][c] === '#' ? 1 : 0;
        return { kind, x, y, cw, ch, cells, vy: vy || 0 };
      }
      function obsColor(o, r) {
        if (o.kind === 'c') return r === 20 ? '#7a5a2a' : (r & 1) ? '#38b048' : '#2f9a3e';
        if (o.kind === 't') return r >= 13 ? '#8a5a2a' : (r & 1) ? '#1f8a4a' : '#16703c';
        if (r <= 6) return '#f2ecd8';
        if (r <= 8) return '#9a6030';
        return '#5a3418';
      }
      function solidAt(px, py) {
        for (const o of g.obs) {
          const cx = Math.floor((px - o.x) / 2), cy = Math.floor((py - o.y) / 2);
          if (cx < 0 || cy < 0 || cx >= o.cw || cy >= o.ch) continue;
          if (o.cells[cy * o.cw + cx]) return o;
        }
        return null;
      }
      function rectHitsObs(x, y, w, h) {
        for (const o of g.obs) {
          if (x + w <= o.x || x >= o.x + o.cw * 2 || y + h <= o.y || y >= o.y + o.ch * 2) continue;
          const c0 = Math.max(0, Math.floor((x - o.x) / 2)), c1 = Math.min(o.cw - 1, Math.floor((x + w - 1 - o.x) / 2));
          const r0 = Math.max(0, Math.floor((y - o.y) / 2)), r1 = Math.min(o.ch - 1, Math.floor((y + h - 1 - o.y) / 2));
          for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (o.cells[r * o.cw + c]) return true;
        }
        return false;
      }
      function chip(o, px, py) {
        const cx = Math.floor((px - o.x) / 2), cy = Math.floor((py - o.y) / 2);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (Math.abs(dx) + Math.abs(dy) > 1 && Math.random() < 0.5) continue;
          const c = cx + dx, r = cy + dy;
          if (c >= 0 && r >= 0 && c < o.cw && r < o.ch) o.cells[r * o.cw + c] = 0;
        }
        for (let i = 0; i < 4; i++) g.parts.push({ x: px, y: py, vx: (Math.random() - 0.5) * 1.6, vy: -Math.random() * 1.5, t: 20, col: obsColor(o, cy) });
      }

      // ---------- cowboys ----------
      function mkCowboy(side, cpu) {
        return {
          side, dir: side === 0 ? 1 : -1, cpu, x: side === 0 ? 16 : 228, y: 104, aim: 0, shots: SHOTS, emptyT: 0,
          walk: 0, moving: false, dead: 0, hitBy: -1,
          ai: { ty: 104, tx: side === 0 ? 20 : 224, think: 0, aimHold: 0 }
        };
      }
      function newScene() {
        const sc = SCENES[g.scene % SCENES.length];
        g.obs = sc.map(s => mkObs(s[0], s[1], s[2], s[3]));
        g.bullets = []; g.parts = [];
        g.p[0].x = 16; g.p[0].y = 104; g.p[1].x = 228; g.p[1].y = 104;
        for (const p of g.p) { p.shots = SHOTS; p.dead = 0; p.aim = 0; p.emptyT = 0; p.ai.think = 30; }
        g.phase = 'ready'; g.t = 70;
      }
      function startDuel() {
        g.score = [0, 0]; g.time = DUEL * 60; g.scene = (g.duel - 1) % SCENES.length;
        newScene();
      }
      function startGame(kind) {
        g = { kind, duel: 1, total: 0, skill: kind === 'demo' ? 0.7 : 0.35, flash: [0, 0] };
        g.p = [mkCowboy(0, kind === 'demo'), mkCowboy(1, kind !== '2p')];
        startDuel();
        mode = kind === 'demo' ? 'demo' : 'game';
      }

      // ---------- bullet path simulation (for the CPU) ----------
      function simulate(x, y, vx, vy, target, steps) {
        for (let i = 0; i < steps; i++) {
          x += vx; y += vy;
          if (y < FY0) { y = 2 * FY0 - y; vy = -vy; }
          if (y > FY1) { y = 2 * FY1 - y; vy = -vy; }
          if (x < 0 || x > W) return null;
          if (solidAt(x, y)) return null;
          if (target && x >= target.x && x <= target.x + CW && y >= target.y && y <= target.y + CH) return { i, y };
        }
        return null;
      }
      function muzzle(p, aim) {
        return { x: p.x + (p.dir > 0 ? CW + 2 : -3), y: p.y + (aim < 0 ? 6 : aim > 0 ? 15 : 10) };
      }
      function fire(p) {
        if (p.dead || g.phase !== 'play') return;
        if (g.bullets.some(b => b.owner === p.side)) return;    // one bullet in the air per gun
        if (p.shots <= 0) { sfx.click(); return; }
        const m = muzzle(p, p.aim);
        if (m.y < FY0 + 1 || m.y > FY1 - 1) return;
        p.shots--;
        g.bullets.push({ x: m.x, y: m.y, vx: BSPD * p.dir, vy: BVY * p.aim, owner: p.side, life: 400 });
        g.flash[p.side] = 4;
        sfx.shot();
      }

      // ---------- movement ----------
      function tryMove(p, dx, dy) {
        const lo = p.side === 0 ? LMIN : RMIN, hi2 = p.side === 0 ? LMAX : RMAX;
        if (dx) {
          const nx = Math.max(lo, Math.min(hi2, p.x + dx));
          if (!rectHitsObs(nx, p.y, CW, CH)) p.x = nx;
        }
        if (dy) {
          const ny = Math.max(FY0 + 1, Math.min(FY1 - CH, p.y + dy));
          if (!rectHitsObs(p.x, ny, CW, CH)) p.y = ny;
        }
      }
      function humanInput(p, keys) {
        let dx = 0, dy = 0;
        if (keys.some(k => k[0] && api.key(k[0]))) dx--;
        if (keys.some(k => k[1] && api.key(k[1]))) dx++;
        if (keys.some(k => k[2] && api.key(k[2]))) dy--;
        if (keys.some(k => k[3] && api.key(k[3]))) dy++;
        p.aim = dy;
        p.moving = !!(dx || dy);
        if (p.moving) { tryMove(p, dx * 0.9, dy * 0.9); p.walk += 0.15; }
        if (keys.some(k => k[4] && api.pressed(k[4]))) fire(p);
      }
      function cpuThink(p) {
        const foe = g.p[1 - p.side], ai = p.ai;
        const sk = g.skill;
        let dx = 0, dy = 0;
        // 1) dodge an incoming bullet
        let danger = null;
        for (const b of g.bullets) {
          if (b.owner === p.side) continue;
          if ((b.vx > 0) !== (p.x > b.x)) continue;
          const steps = Math.ceil(Math.abs((p.x + CW / 2) - b.x) / BSPD) + 2;
          // predict the y when the bullet reaches our column
          let x = b.x, y = b.y, vy = b.vy, blocked = false;
          for (let i = 0; i < steps; i++) {
            x += b.vx; y += vy;
            if (y < FY0) { y = 2 * FY0 - y; vy = -vy; }
            if (y > FY1) { y = 2 * FY1 - y; vy = -vy; }
            if (solidAt(x, y)) { blocked = true; break; }
          }
          if (!blocked && y > p.y - 6 && y < p.y + CH + 6) danger = y;
        }
        if (danger !== null && Math.random() < 0.35 + sk * 0.6) {
          const up = danger > p.y + CH / 2;
          dy = up ? -1 : 1;
          if (p.y < FY0 + 8) dy = 1; if (p.y > FY1 - CH - 8) dy = -1;
        } else {
          // 2) wander toward a chosen spot
          if (--ai.think <= 0) {
            ai.think = 30 + Math.random() * 70;
            const r = Math.random();
            if (r < 0.55) ai.ty = foe.y + (Math.random() - 0.5) * 30;
            else ai.ty = FY0 + 10 + Math.random() * (FY1 - FY0 - CH - 20);
            const lo = p.side === 0 ? LMIN : RMIN, hi2 = p.side === 0 ? LMAX : RMAX;
            ai.tx = lo + Math.random() * (hi2 - lo);
          }
          if (Math.abs(ai.ty - p.y) > 2) dy = ai.ty > p.y ? 1 : -1;
          if (Math.abs(ai.tx - p.x) > 2) dx = ai.tx > p.x ? 1 : -1;
        }
        const ox = p.x, oy = p.y;
        tryMove(p, dx * (0.6 + sk * 0.35), dy * (0.6 + sk * 0.35));
        p.moving = p.x !== ox || p.y !== oy;
        if (p.moving) p.walk += 0.15;
        if (p.moving && p.y === oy && dy) ai.think = 0;   // stuck on a cactus: pick a new spot
        // 3) look for a shot
        if (ai.aimHold > 0) ai.aimHold--;
        if (p.shots > 0 && !g.bullets.some(b => b.owner === p.side) && g.phase === 'play') {
          const lead = { x: foe.x, y: foe.y + (foe.moving ? (foe.aim * 6) : 0) };
          const order = [0, -1, 1].sort(() => Math.random() - 0.5);
          for (const a of order) {
            const m = muzzle(p, a);
            const r = simulate(m.x, m.y, BSPD * p.dir, BVY * a, lead, 120);
            if (r) {
              p.aim = a; ai.aimHold = 20;
              const chance = 0.03 + sk * 0.09 - (r.i > 60 ? 0.02 : 0);
              if (Math.random() < chance) fire(p);
              break;
            }
          }
          // nothing lines up: occasional speculative ricochet shot
          if (p.shots > 3 && Math.random() < 0.002 + sk * 0.002) { p.aim = Math.random() < 0.5 ? -1 : 1; fire(p); }
        }
        if (ai.aimHold <= 0 && !p.moving) p.aim = 0;
      }

      // ---------- per-frame game logic ----------
      function killCowboy(p, shooter) {
        p.dead = 1; g.score[shooter]++;
        if (g.kind === '1p' && shooter === 0) g.total++;
        g.phase = 'hit'; g.t = 150; g.bullets = [];
        sfx.hit();
      }
      function endDuel() {
        const [a, b] = g.score;
        if (g.kind === 'demo') { mode = 'title'; titleT = 0; g = null; return; }
        if (g.kind === '2p') { g.phase = 'result'; g.t = 300; g.msg = a > b ? 'LEFT GUNMAN WINS' : b > a ? 'RIGHT GUNMAN WINS' : 'A DRAW!'; g.final = true; sfx.win(); return; }
        if (a > b) {
          g.phase = 'result'; g.t = 200; g.msg = 'YOU WIN THE DUEL!'; g.final = false; sfx.win();
          return;
        }
        g.msg = a === b ? 'A DRAW - NO WINNER' : 'THE STRANGER WINS';
        sfx.lose();
        const cg = g;
        const over = () => { if (g !== cg) return; if (g.total > hi) hi = g.total; api.setHiScore(g.total); g.phase = 'over'; g.t = 330; };
        if (api.offerContinue) {
          g.phase = 'hold';
          api.offerContinue(() => { if (g === cg) startDuel(); }, over);
        } else over();
      }
      function updGame() {
        if (g.flash[0] > 0) g.flash[0]--; if (g.flash[1] > 0) g.flash[1]--;
        // particles
        for (const pt of g.parts) { pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.1; pt.t--; }
        g.parts = g.parts.filter(pt => pt.t > 0);
        // moving obstacles keep moving during play
        if (g.phase === 'play' || g.phase === 'ready') for (const o of g.obs) if (o.vy) {
          o.y += o.vy;
          if (o.y < FY0 + 2) { o.y = FY0 + 2; o.vy = -o.vy; }
          if (o.y + o.ch * 2 > FY1 - 2) { o.y = FY1 - 2 - o.ch * 2; o.vy = -o.vy; }
        }
        if (g.phase === 'hold') return;
        if (g.phase === 'ready') { if (--g.t <= 0) g.phase = 'play'; return; }
        if (g.phase === 'hit') {
          for (const p of g.p) if (p.dead) p.dead++;
          if (--g.t <= 0) {
            if (g.time <= 0) endDuel(); else { g.scene++; newScene(); }
          }
          return;
        }
        if (g.phase === 'result') {
          if (--g.t <= 0 || (g.t < 120 && api.anyPressed('Enter', 'Space'))) {
            if (g.final) { mode = 'title'; titleT = 0; g = null; return; }
            g.duel++; g.skill = Math.min(1, g.skill + 0.12); startDuel();
          }
          return;
        }
        if (g.phase === 'over') {
          if (--g.t <= 0 || (g.t < 200 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; g = null; }
          return;
        }
        // play
        g.time--;
        if (g.time % 60 === 0 && g.time <= 600 && g.time > 0) sfx.tick();
        if (g.time <= 0) { g.phase = 'hit'; g.t = 60; return; }
        const [a, b] = g.p;
        if (g.kind === '2p') {
          humanInput(a, [['KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyQ']]);
          humanInput(b, [['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'], [null, null, null, null, 'Enter']]);
        } else {
          if (a.cpu) cpuThink(a);
          else humanInput(a, [['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'], ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyQ']]);
          cpuThink(b);
        }
        // ammo: reload when both are dry (or one has been dry for a while)
        for (const p of g.p) p.emptyT = p.shots === 0 && !g.bullets.some(bb => bb.owner === p.side) ? p.emptyT + 1 : 0;
        if ((a.emptyT > 0 && b.emptyT > 0) || a.emptyT > 360 || b.emptyT > 360) {
          for (const p of g.p) if (p.emptyT > 0) { p.shots = SHOTS; p.emptyT = 0; }
          sfx.reload();
        }
        // bullets
        for (const bl of g.bullets) {
          for (let s = 0; s < 3 && bl.life > 0; s++) {
            bl.x += bl.vx / 3; bl.y += bl.vy / 3;
            if (bl.y < FY0) { bl.y = 2 * FY0 - bl.y; bl.vy = -bl.vy; sfx.ricochet(); }
            if (bl.y > FY1) { bl.y = 2 * FY1 - bl.y; bl.vy = -bl.vy; sfx.ricochet(); }
            if (bl.x < -2 || bl.x > W + 2) { bl.life = 0; break; }
            const o = solidAt(bl.x, bl.y);
            if (o) { chip(o, bl.x, bl.y); sfx.thud(); bl.life = 0; break; }
            const t = g.p[1 - bl.owner];
            if (!t.dead && bl.x >= t.x + 1 && bl.x <= t.x + CW - 1 && bl.y >= t.y && bl.y <= t.y + CH) {
              bl.life = 0; killCowboy(t, bl.owner); return;
            }
          }
          bl.life--;
        }
        g.bullets = g.bullets.filter(bl => bl.life > 0);
      }

      function update() {
        frame++; pollCoins(); if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('ArrowUp', 'ArrowDown', 'KeyW', 'KeyS')) { menuSel ^= 1; sfx.menu(); }
          if (api.pressed('Digit1')) menuSel = 0; if (api.pressed('Digit2')) menuSel = 1;
          if (api.anyPressed('Enter', 'Space', 'Digit1', 'Digit2')) { if (tryStart()) startGame(menuSel ? '2p' : '1p'); return; }
          if (titleT > 600) startGame('demo');
          return;
        }
        if (mode === 'demo') {
          if (api.anyPressed('Enter', 'Space')) { mode = 'title'; titleT = 0; g = null; return; }
          updGame();
          if (g && (api.frame % 60 === 0) && g.time < DUEL * 60 - 25 * 60) { mode = 'title'; titleT = 0; g = null; }
          return;
        }
        updGame();
      }

      // ---------- drawing ----------
      function drawCowboy(ctx, p, shirt, flash) {
        const x = Math.round(p.x), y = Math.round(p.y), d = p.dir;
        const px = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(d > 0 ? x + dx : x + CW - dx - w, y + dy, w, h); };
        const hat = '#3a2412', skin = '#f0b080', pants = '#3050a0', boot = '#2a1a0a';
        if (p.dead) {
          // knocked flat on his back: hat rolls away, little stars, "GOT ME!"
          const t = p.dead, fy = y + 14;
          const lay = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(d > 0 ? x - 6 + dx : x + CW + 6 - dx - w, fy + dy, w, h); };
          if (t < 12) { px(3, 0, 6, 3, hat); px(4, 4, 4, 4, skin); px(3, 9, 6, 7, shirt); px(3, 16, 2, 8, pants); px(7, 16, 2, 8, pants); return; }
          lay(16, 2, 4, 4, skin); lay(2, 2, 14, 5, shirt); lay(-4, 3, 6, 2, pants); lay(-4, 6, 6, 2, pants); lay(-6, 2, 2, 3, boot); lay(-6, 6, 2, 3, boot);
          const hx = d > 0 ? x + 18 + Math.min(20, t / 3) : x - 14 - Math.min(20, t / 3);
          ctx.fillStyle = hat; ctx.fillRect(hx, fy + 6, 8, 2); ctx.fillRect(hx + 2, fy + 3, 4, 3);
          if ((t >> 3) & 1) { ctx.fillStyle = '#ffe040'; ctx.fillRect(x + 4, fy - 4, 1, 1); ctx.fillRect(x + 9, fy - 6, 1, 1); ctx.fillRect(x + 2, fy - 8, 1, 1); }
          if (t < 110) text(ctx, 'GOT ME!', x + CW / 2, y - 6, '#fff', 1, 'center');
          return;
        }
        // hat
        px(3, 0, 6, 3, hat); px(1, 3, 10, 1, hat); px(3, 2, 6, 1, '#7a4a20');
        // head
        px(4, 4, 4, 4, skin); px(7, 5, 1, 1, '#000'); px(6, 7, 3, 1, '#5a2a10');
        px(5, 8, 2, 1, skin);
        // torso / vest / belt
        px(3, 9, 6, 7, shirt); px(3, 9, 2, 6, '#5a3a1a'); px(3, 15, 6, 1, '#c08030');
        // back arm
        px(2, 10, 1, 5, shirt); px(2, 15, 1, 1, skin);
        // legs (walk cycle)
        const ph = p.moving ? Math.floor(p.walk) & 1 : 0;
        if (ph) { px(2, 16, 2, 6, pants); px(7, 16, 2, 5, pants); px(1, 22, 3, 2, boot); px(7, 21, 3, 2, boot); }
        else { px(3, 16, 2, 6, pants); px(7, 16, 2, 6, pants); px(3, 22, 3, 2, boot); px(7, 22, 3, 2, boot); }
        // gun arm
        const gun = '#c8c8d0';
        if (p.aim < 0) { px(8, 9, 2, 2, shirt); px(10, 7, 2, 2, shirt); px(12, 6, 1, 1, skin); px(12, 4, 2, 2, gun); px(14, 3, 1, 1, gun); }
        else if (p.aim > 0) { px(8, 11, 2, 2, shirt); px(10, 12, 2, 2, shirt); px(12, 13, 1, 1, skin); px(12, 14, 2, 2, gun); px(14, 15, 1, 1, gun); }
        else { px(8, 10, 4, 2, shirt); px(12, 10, 1, 2, skin); px(12, 9, 4, 2, gun); px(13, 11, 1, 1, gun); }
        if (flash) {
          const m = muzzle(p, p.aim);
          ctx.fillStyle = '#fff8a0'; ctx.fillRect(m.x - 2, m.y - 2, 5, 5); ctx.fillStyle = '#ff9020'; ctx.fillRect(m.x - 1, m.y - 1, 3, 3);
        }
      }
      function drawObs(ctx, o) {
        for (let r = 0; r < o.ch; r++) {
          ctx.fillStyle = obsColor(o, r);
          for (let c = 0; c < o.cw; c++) if (o.cells[r * o.cw + c]) ctx.fillRect(Math.round(o.x) + c * 2, Math.round(o.y) + r * 2, 2, 2);
        }
        if (o.kind === 'w') {
          ctx.fillStyle = '#c8b890';
          for (let c = 4; c < o.cw - 4; c += 5) for (let r = 1; r < 7; r++) if (o.cells[r * o.cw + c]) ctx.fillRect(Math.round(o.x) + c * 2, Math.round(o.y) + r * 2, 1, 2);
        }
      }
      function drawField(ctx) {
        ctx.fillStyle = '#d8a860'; ctx.fillRect(0, FY0, W, FY1 - FY0);
        // dusty speckles (fixed pattern)
        ctx.fillStyle = '#c89850';
        for (let i = 0; i < 90; i++) { const sx = (i * 97 + 13) % W, sy = FY0 + ((i * 57 + 29) % (FY1 - FY0)); ctx.fillRect(sx, sy, 2, 1); }
        ctx.fillStyle = '#e8c078';
        for (let i = 0; i < 40; i++) { const sx = (i * 151 + 41) % W, sy = FY0 + ((i * 89 + 7) % (FY1 - FY0)); ctx.fillRect(sx, sy, 1, 1); }
        ctx.fillStyle = '#6a3a14'; ctx.fillRect(0, FY0 - 2, W, 2); ctx.fillRect(0, FY1, W, 2);
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#1a0c04'; ctx.fillRect(0, 0, W, FY0 - 2); ctx.fillRect(0, FY1 + 2, W, H - FY1 - 2);
        const names = g.kind === '2p' ? ['LEFT', 'RIGHT'] : g.kind === 'demo' ? ['CPU', 'CPU'] : ['YOU', 'STRANGER'];
        text(ctx, names[0], 4, 3, '#ffd27a'); text(ctx, String(g.score[0]), 4, 11, '#fff', 1);
        text(ctx, names[1], W - 4, 3, '#ffd27a', 1, 'right'); text(ctx, String(g.score[1]), W - 4, 11, '#fff', 1, 'right');
        const sec = Math.max(0, Math.ceil(g.time / 60));
        text(ctx, 'TIME', W / 2, 3, '#ffd27a', 1, 'center');
        text(ctx, String(sec).padStart(2, '0'), W / 2, 11, sec <= 10 && ((frame >> 3) & 1) ? '#ff4030' : '#fff', 1, 'center');
        if (g.kind === '1p') { text(ctx, 'DUEL ' + g.duel, 70, 7, '#c89850', 1, 'center'); text(ctx, 'HITS ' + g.total, 186, 7, '#c89850', 1, 'center'); }
        // bullets left
        for (let s = 0; s < 2; s++) {
          const p = g.p[s];
          for (let i = 0; i < SHOTS; i++) {
            const bx = s === 0 ? 4 + i * 6 : W - 8 - i * 6;
            ctx.fillStyle = i < p.shots ? '#e8c040' : '#3a2a1a';
            ctx.fillRect(bx, FY1 + 5, 3, 6); ctx.fillStyle = i < p.shots ? '#b08020' : '#3a2a1a'; ctx.fillRect(bx, FY1 + 10, 3, 1);
          }
          if (p.shots === 0 && ((frame >> 4) & 1)) text(ctx, 'EMPTY', s === 0 ? 44 : W - 44, FY1 + 4, '#ff6040', 1, s === 0 ? 'left' : 'right');
        }
        text(ctx, 'HI ' + hi, W / 2, FY1 + 4, '#c89850', 1, 'center');
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#1a0c04'; ctx.fillRect(0, 0, W, H);
        // sunset desert backdrop
        const bands = ['#5a1a10', '#8a2a14', '#b84a18', '#e07a20', '#f0a840'];
        for (let i = 0; i < bands.length; i++) { ctx.fillStyle = bands[i]; ctx.fillRect(0, 96 + i * 8, W, 8); }
        ctx.fillStyle = '#ffe080'; ctx.beginPath(); ctx.arc(W / 2, 136, 18, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#c88040'; ctx.fillRect(0, 136, W, 50);
        ctx.fillStyle = '#a86a30'; for (let i = 0; i < 30; i++) ctx.fillRect((i * 83) % W, 140 + (i * 31) % 44, 3, 1);
        // mesas
        ctx.fillStyle = '#3a1408'; ctx.fillRect(10, 118, 40, 18); ctx.fillRect(18, 112, 24, 6); ctx.fillRect(200, 122, 50, 14); ctx.fillRect(212, 116, 26, 6);
        // two duelists silhouetted
        const t = titleT;
        const fake = (side, x) => ({ side, dir: side ? -1 : 1, x, y: 138, aim: (t >> 6) % 3 - 1, moving: true, walk: t * 0.08, dead: 0 });
        drawCowboy(ctx, fake(0, 40 + Math.sin(t * 0.02) * 6), '#c03020', false);
        drawCowboy(ctx, fake(1, 204 - Math.sin(t * 0.02) * 6), '#2a8a40', false);
        const o = mkObs('c', 116, 142); for (let r = 0; r < o.ch; r++) { ctx.fillStyle = obsColor(o, r); for (let c = 0; c < o.cw; c++) if (o.cells[r * o.cw + c]) ctx.fillRect(o.x + c * 2, o.y + r * 2, 2, 2); }
        text(ctx, 'GUN FIGHT', W / 2 + 2, 22, '#5a1a08', 3, 'center');
        text(ctx, 'GUN FIGHT', W / 2, 20, '#ffd27a', 3, 'center');
        text(ctx, 'SIX SHOTS. ONE TOWN. NO SHERIFF.', W / 2, 48, '#e8a860', 1, 'center');
        const blink = (frame >> 4) & 1;
        text(ctx, (menuSel === 0 ? '> ' : '  ') + '1 GUNMAN  VS STRANGER', 56, 64, menuSel === 0 && blink ? '#a08050' : '#fff');
        text(ctx, (menuSel === 1 ? '> ' : '  ') + '2 GUNMEN', 56, 76, menuSel === 1 && blink ? '#a08050' : '#fff');
        text(ctx, 'BEST STREAK ' + hi + ' HITS', W / 2, 192, '#ffd27a', 1, 'center');
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 202, '#fff', 1, 'center'); }
        else if (api.credits === 0) { if (blink) text(ctx, 'INSERT COIN', W / 2, 202, '#fff', 1, 'center'); }
        else text(ctx, 'PUSH START', W / 2, 202, blink ? '#fff' : '#a08050', 1, 'center');
        text(ctx, credStr(), 4, H - 9, '#a08050', 1);
        text(ctx, '\u00a9 1975 MIDWAY', W - 4, H - 9, '#a08050', 1, 'right');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title' || !g) { drawTitle(ctx); return; }
        drawField(ctx);
        for (const o of g.obs) drawObs(ctx, o);
        const shirts = ['#c03020', '#2a8a40'];
        for (const p of g.p) drawCowboy(ctx, p, shirts[p.side], g.flash[p.side] > 0);
        ctx.fillStyle = '#fff';
        for (const b of g.bullets) { ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y), 3, 1); ctx.fillStyle = '#ff0'; ctx.fillRect(Math.round(b.x), Math.round(b.y), 1, 1); ctx.fillStyle = '#fff'; }
        for (const pt of g.parts) { ctx.fillStyle = pt.col; ctx.fillRect(Math.round(pt.x), Math.round(pt.y), 1, 1); }
        drawHUD(ctx);
        const box = (msg, sub, col) => {
          ctx.fillStyle = 'rgba(26,12,4,0.85)'; ctx.fillRect(28, 92, W - 56, sub ? 38 : 26);
          text(ctx, msg, W / 2, 98, col || '#ffd27a', 1, 'center'); if (sub) text(ctx, sub, W / 2, 112, '#fff', 1, 'center');
        };
        if (g.phase === 'ready') {
          if (g.time === DUEL * 60 && g.score[0] + g.score[1] === 0) box(mode === 'demo' ? 'DEMONSTRATION' : g.kind === '1p' ? 'DUEL ' + g.duel : 'DRAW!', g.kind === '1p' ? 'FIRST TO SHOOT... WINS' : null);
          else if ((g.t >> 3) & 1) text(ctx, 'DRAW!', W / 2, 30, '#fff', 2, 'center');
        }
        if (mode === 'demo' && ((frame >> 5) & 1)) text(ctx, 'GAME OVER', W / 2, 30, '#fff', 1, 'center');
        if (g.phase === 'result') box(g.msg, g.final ? g.score[0] + ' - ' + g.score[1] : 'NEXT DUEL: A FASTER STRANGER');
        if (g.phase === 'hold') box(g.msg, g.score[0] + ' - ' + g.score[1], '#ff6040');
        if (g.phase === 'over') box('GAME OVER', 'TOTAL HITS ' + g.total, '#ff6040');
      }
      return { update, render, destroy() { } };
    }
  });
})();
