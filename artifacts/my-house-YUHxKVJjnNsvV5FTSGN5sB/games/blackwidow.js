// Black Widow (Atari, 1982) - from-scratch vector recreation: twin-stick spider defending its web.
(function () {
  'use strict';

  // ---------- Vector font: 4x6 grid, strokes are runs of "xy" digit pairs ----------
  const VF = {
    A: '0602204246 0343', B: '003041423303 334445360600', C: '40000646', D: '00304244360600',
    E: '40000646 0333', F: '400006 0333', G: '400006464323', H: '0006 4046 0343', I: '0040 2026 0646',
    J: '40460604', K: '0006 400346', L: '000646', M: '0600224046', N: '06004640', O: '0040460600',
    P: '0600404303', Q: '0040460600 2446', R: '0600404303 1346', S: '400003434606', T: '0040 2026',
    U: '00064640', V: '002640', W: '0006244640', X: '0046 4006', Y: '002240 2226', Z: '00400646',
    '0': '0040460600', '1': '2026', '2': '004043030646', '3': '00404606 0343', '4': '000343 4046',
    '5': '400003434606', '6': '0006464303', '7': '004046', '8': '0040460600 0343', '9': '4303004046',
    '-': '0343', '.': '2526', ':': '2122 2425', '!': '2024 2526', '/': '4006', '=': '0242 0444',
    "'": '2022', ',': '2516', '?': '0040432324 2526', '(': '30121436', ')': '10323416', '>': '004306', '<': '400346'
  };
  function vtext(ctx, str, x, y, sc, align) {
    str = String(str).toUpperCase();
    const adv = 6 * sc, w = str.length * adv - 2 * sc;
    if (align === 'center') x -= w / 2; else if (align === 'right') x -= w;
    for (const ch of str) {
      const g = VF[ch];
      if (g) for (const st of g.split(' ')) {
        for (let i = 0; i < st.length; i += 2) {
          const px = x + (+st[i]) * sc, py = y + (+st[i + 1]) * sc;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        if (st.length === 2) ctx.lineTo(x + (+st[0]) * sc + 0.5, y + (+st[1]) * sc);
      }
      x += adv;
    }
  }

  // ---------- Black Widow ----------
  const W = 640, H = 480;
  const CX = 320, CY = 262;            // web centre
  const SPOKES = 16, RINGS = [34, 70, 106, 142, 178, 210];
  const WEB_R = 210;                   // outer strand
  const TAU = Math.PI * 2;

  // what each bug is worth and how it behaves
  const BUGS = {
    mosquito: { pts: 100, r: 8, hp: 1, col: '#5cff6a' },
    beetle: { pts: 200, r: 10, hp: 2, col: '#ffb52e' },
    hornet: { pts: 300, r: 10, hp: 1, col: '#ff4a3a' },
    egglayer: { pts: 500, r: 12, hp: 3, col: '#e65cff' },
    spoiler: { pts: 1000, r: 11, hp: 4, col: '#58c8ff' }
  };
  const GRUB_PTS = 500, EGG_PTS = 1000;

  ArcadeRegistry.register({
    id: 'blackwidow', title: 'Black Widow', year: 1982, maker: 'Atari',
    width: W, height: H, vector: true, pointer: false,
    controls: 'Arrows: move \u00b7 WASD: fire in that direction \u00b7 Space: fire ahead (hold X to lock aim) \u00b7 Enter: start',
    marquee: { bg: '#05030c', fg: '#ff3a4a', accent: '#5c7cff' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      let hi = api.getHiScore(20000);
      let state = 'attract';   // attract | wavein | play | dead | waveclear | over
      let demo = true, stateT = 0, attractT = 0;
      let spider = null, bullets = [], bugs = [], grubs = [], eggs = [], sparks = [], pops = [], legs = [];
      let score = 0, lives = 3, wave = 1, nextExtra = 20000, queue = [], spawnT = 0, fireT = 0, grubChain = 0;
      let coinFlash = 0, lastCredits = api.credits;

      const snd = {
        fire() { A.tone(1500, 0.04, { type: 'square', vol: 0.06, slideTo: 700 }); },
        hit() { A.tone(300, 0.05, { type: 'square', vol: 0.1 }); },
        kill() { A.noise(0.18, { vol: 0.18, freq: 2500, slideTo: 300 }); A.tone(800, 0.12, { type: 'sawtooth', vol: 0.08, slideTo: 200 }); },
        grub() { A.melody([[1046, .04], [1318, .04], [1568, .07]], { type: 'square', vol: 0.12 }); },
        egg() { A.tone(200, 0.06, { type: 'triangle', vol: 0.14 }); },
        eggOff() { A.melody([[523, .05], [784, .05], [1046, .05], [1568, .1]], { type: 'triangle', vol: 0.16 }); },
        hatch() { A.tone(120, 0.2, { type: 'sawtooth', vol: 0.12, slideTo: 600 }); },
        lay() { A.tone(90, 0.08, { type: 'sine', vol: 0.15 }); },
        die() { A.noise(1.2, { vol: 0.3, freq: 3000, slideTo: 60 }); A.tone(400, 1.0, { type: 'square', vol: 0.12, slideTo: 40 }); },
        wave() { A.melody([[392, .1], [523, .1], [659, .1], [784, .25]], { type: 'square', vol: 0.13 }); },
        extra() { A.melody([[1318, .06], [1568, .06], [2093, .15]], { type: 'square', vol: 0.14 }); },
        steal() { A.tone(600, 0.15, { type: 'sawtooth', vol: 0.1, slideTo: 150 }); }
      };

      // ---------- setup ----------
      function newSpider() { return { x: CX, y: CY, a: -Math.PI / 2, aim: -Math.PI / 2, walk: 0, inv: 120, alive: true }; }
      function buildQueue() {
        queue = [];
        const n = Math.min(40, 10 + wave * 2);
        for (let i = 0; i < n; i++) {
          const r = Math.random();
          let t = 'mosquito';
          if (wave >= 2 && r < 0.35) t = 'beetle';
          if (wave >= 3 && r > 0.72) t = 'hornet';
          if (wave >= 4 && i % 6 === 3) t = 'egglayer';
          if (wave >= 5 && i % 9 === 5) t = 'spoiler';
          queue.push(t);
        }
        if (wave >= 2 && wave < 4 && wave % 2 === 0) queue[queue.length >> 1] = 'egglayer';
      }
      function startWave() {
        bullets = []; bugs = []; eggs = []; grubs = []; grubChain = 0;
        buildQueue(); spawnT = 60;
        state = 'wavein'; stateT = 0;
        spider = newSpider();
      }
      function startGame(isDemo) {
        demo = isDemo; score = 0; lives = 3; wave = 1; nextExtra = 20000;
        sparks = []; pops = []; legs = [];
        startWave();
      }
      function addScore(n, x, y) {
        if (demo) return;
        score += n;
        if (score > hi) hi = score;
        if (score >= nextExtra) { nextExtra += 30000; lives++; snd.extra(); }
        if (x != null) pops.push({ x, y, t: 50, s: String(n) });
      }

      function spawnBug(type, x, y) {
        if (x == null) {
          // enter from a random point on the screen edge
          const side = Math.floor(Math.random() * 4);
          x = side === 0 ? rnd(0, W) : side === 1 ? W + 10 : side === 2 ? rnd(0, W) : -10;
          y = side === 0 ? -10 : side === 1 ? rnd(40, H) : side === 2 ? H + 10 : rnd(40, H);
        }
        const d = BUGS[type];
        const sp = { mosquito: 1.55, beetle: 1.0, hornet: 1.5, egglayer: 0.9, spoiler: 1.1 }[type] * (1 + Math.min(0.6, (wave - 1) * 0.06));
        bugs.push({
          type, x, y, vx: 0, vy: 0, sp, hp: d.hp + (wave >= 8 && type !== 'mosquito' ? 1 : 0), r: d.r, t: Math.floor(rnd(0, 60)),
          mode: 0, modeT: rnd(60, 140), tx: CX, ty: CY, ang: Math.atan2(y - CY, x - CX), layT: 120, stolen: 0, flash: 0
        });
      }

      // ---------- spider ----------
      function inWeb(x, y) { return Math.hypot(x - CX, y - CY) <= WEB_R - 4; }
      function clampWeb(o) {
        const dx = o.x - CX, dy = o.y - CY, d = Math.hypot(dx, dy), m = WEB_R - 6;
        if (d > m) { o.x = CX + dx / d * m; o.y = CY + dy / d * m; }
      }
      function playerControls() {
        let mx = 0, my = 0, fx = 0, fy = 0, fire = false;
        if (api.key('ArrowLeft')) mx--; if (api.key('ArrowRight')) mx++;
        if (api.key('ArrowUp')) my--; if (api.key('ArrowDown')) my++;
        if (api.key('KeyA')) fx--; if (api.key('KeyD')) fx++;
        if (api.key('KeyW')) fy--; if (api.key('KeyS')) fy++;
        const lock = api.key('KeyX');
        if (fx || fy) { fire = true; spider.aim = Math.atan2(fy, fx); }
        else if (api.key('Space')) fire = true;
        return { mx, my, fire, lock };
      }
      function demoControls() {
        // attract-mode pilot: keep away from bugs, chase grubs, shoot the closest bug
        let near = null, nd = 1e9;
        for (const b of bugs) { const d = Math.hypot(b.x - spider.x, b.y - spider.y); if (d < nd) { nd = d; near = b; } }
        let mx = 0, my = 0;
        if (near && nd < 110) { mx = spider.x - near.x; my = spider.y - near.y; }
        else if (grubs.length) { const g = grubs[0]; mx = g.x - spider.x; my = g.y - spider.y; }
        else { mx = CX - spider.x; my = CY - spider.y; if (Math.hypot(mx, my) < 20) mx = my = 0; }
        const l = Math.hypot(mx, my);
        if (l > 0) { mx = Math.round(mx / l); my = Math.round(my / l); }
        if (near) spider.aim = Math.atan2(near.y - spider.y, near.x - spider.x);
        return { mx, my, fire: !!near && nd < 330, lock: true };
      }
      function updateSpider() {
        const c = demo ? demoControls() : playerControls();
        if (c.mx || c.my) {
          const a = Math.atan2(c.my, c.mx);
          spider.x += Math.cos(a) * 2.7; spider.y += Math.sin(a) * 2.7;
          spider.a = a; spider.walk += 0.35;
          if (!c.lock && !(api.key('KeyA') || api.key('KeyD') || api.key('KeyW') || api.key('KeyS'))) spider.aim = a;
        }
        clampWeb(spider);
        if (spider.inv > 0) spider.inv--;
        if (fireT > 0) fireT--;
        if (c.fire && fireT <= 0 && bullets.length < 8) {
          fireT = 6;
          const a = spider.aim;
          bullets.push({ x: spider.x + Math.cos(a) * 10, y: spider.y + Math.sin(a) * 10, vx: Math.cos(a) * 8.5, vy: Math.sin(a) * 8.5 });
          snd.fire();
        }
      }

      // ---------- bugs ----------
      function steer(b, tx, ty, sp, turn) {
        const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy) || 1;
        b.vx += (dx / d * sp - b.vx) * turn; b.vy += (dy / d * sp - b.vy) * turn;
      }
      function updateBug(b) {
        b.t++; if (b.flash > 0) b.flash--;
        const sx = spider.alive ? spider.x : CX, sy = spider.alive ? spider.y : CY;
        switch (b.type) {
          case 'mosquito':
            if (--b.modeT <= 0) { b.modeT = rnd(30, 70); b.tx = sx + rnd(-90, 90); b.ty = sy + rnd(-90, 90); }
            steer(b, b.tx, b.ty, b.sp, 0.08);
            b.vx += rnd(-0.25, 0.25); b.vy += rnd(-0.25, 0.25);
            break;
          case 'beetle':
            steer(b, sx, sy, b.sp, 0.03);
            break;
          case 'hornet':
            if (b.mode === 0) {
              // circle the spider, then dive
              b.ang += 0.025;
              steer(b, sx + Math.cos(b.ang) * 130, sy + Math.sin(b.ang) * 130, b.sp * 1.4, 0.06);
              if (--b.modeT <= 0) { b.mode = 1; b.modeT = 55; const a = Math.atan2(sy - b.y, sx - b.x); b.vx = Math.cos(a) * b.sp * 2.6; b.vy = Math.sin(a) * b.sp * 2.6; A.tone(500, 0.3, { type: 'sawtooth', vol: 0.07, slideTo: 1200 }); }
            } else if (--b.modeT <= 0) { b.mode = 0; b.modeT = rnd(80, 150); b.ang = Math.atan2(b.y - sy, b.x - sx); }
            break;
          case 'egglayer': {
            // patrol the web on a ring, laying eggs on the strands
            b.ang += 0.008 * (b.t & 512 ? -1 : 1);
            const rr = 120 + Math.sin(b.t * 0.01) * 50;
            steer(b, CX + Math.cos(b.ang) * rr, CY + Math.sin(b.ang) * rr, b.sp, 0.05);
            if (inWeb(b.x, b.y) && --b.layT <= 0) {
              b.layT = Math.max(110, 220 - wave * 8);
              if (eggs.length < 10) { eggs.push({ x: b.x, y: b.y, vx: 0, vy: 0, t: Math.max(260, 420 - wave * 12) }); snd.lay(); }
            }
            break;
          }
          case 'spoiler': {
            // heads for the nearest grub and eats it; otherwise prowls after the spider
            let g = null, gd = 1e9;
            for (const q of grubs) { const d = Math.hypot(q.x - b.x, q.y - b.y); if (d < gd) { gd = d; g = q; } }
            if (g) steer(b, g.x, g.y, b.sp * 1.3, 0.07); else steer(b, sx, sy, b.sp * 0.8, 0.03);
            break;
          }
        }
        // speed limit
        const s = Math.hypot(b.vx, b.vy), lim = b.type === 'hornet' && b.mode === 1 ? b.sp * 2.8 : b.sp * 1.5;
        if (s > lim) { b.vx *= lim / s; b.vy *= lim / s; }
        b.x += b.vx; b.y += b.vy;
        // stay on (or near) the screen
        if (b.x < -30) b.vx += 0.3; if (b.x > W + 30) b.vx -= 0.3;
        if (b.y < -30) b.vy += 0.3; if (b.y > H + 30) b.vy -= 0.3;
      }
      function killBug(i) {
        const b = bugs[i];
        bugs.splice(i, 1);
        addScore(BUGS[b.type].pts + b.stolen, b.x, b.y - 14);
        for (let k = 0; k < 14; k++) { const a = rnd(0, TAU), s = rnd(0.5, 3.5); sparks.push({ x: b.x, y: b.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: rnd(15, 35), col: BUGS[b.type].col }); }
        // a shot bug that lands on the web leaves a grub
        if (b.type !== 'spoiler' && inWeb(b.x, b.y)) grubs.push({ x: b.x, y: b.y, t: 0 });
        snd.kill();
      }

      // ---------- main update ----------
      function startPressed() { return api.anyPressed('Enter') || (demo && api.pressed('Space')); }
      function tryStart() {
        if (api.useCredit()) { lastCredits = api.credits; startGame(false); return true; }
        coinFlash = 120; A.tone(70, 0.28, { type: 'square', vol: 0.25 });
        return false;
      }

      startGame(true);

      function update() {
        stateT++;
        if (coinFlash > 0) coinFlash--;
        for (let i = sparks.length - 1; i >= 0; i--) { const p = sparks[i]; p.x += p.vx; p.y += p.vy; p.vx *= 0.95; p.vy *= 0.95; if (--p.t <= 0) sparks.splice(i, 1); }
        for (let i = pops.length - 1; i >= 0; i--) { pops[i].y -= 0.4; if (--pops[i].t <= 0) pops.splice(i, 1); }
        for (let i = legs.length - 1; i >= 0; i--) { const l = legs[i]; l.x += l.vx; l.y += l.vy; l.a += l.va; if (--l.t <= 0) legs.splice(i, 1); }

        if (demo) {
          attractT++;
          if (startPressed()) { if (tryStart()) return; }
          if (attractT > 60 * 45 && (state === 'play' || state === 'wavein')) { attractT = 0; startGame(true); }
        }
        if (state === 'over') {
          if (stateT > 240 || (stateT > 60 && api.anyPressed('Enter', 'Space'))) { attractT = 0; startGame(true); }
          return;
        }
        if (state === 'wavein') {
          if (stateT > 100) { state = 'play'; stateT = 0; }
          if (spider.alive) updateSpider();
          return;
        }
        if (state === 'waveclear') {
          if (stateT === 1) { addScore(wave * 1000); snd.wave(); }
          if (stateT > 150) { wave++; startWave(); }
          return;
        }
        if (state === 'dead') {
          for (const b of bugs) updateBug(b);
          if (stateT > 150) {
            if (demo) { attractT = 0; startGame(true); return; }
            if (lives <= 0) {
              const over = () => { state = 'over'; stateT = 0; api.setHiScore(score); };
              if (api.offerContinue) { state = 'over'; stateT = -1e9; api.offerContinue(() => { lives = 3; respawn(); }, over); }
              else over();
            } else respawn();
          }
          return;
        }

        // ---- play ----
        updateSpider();
        // spawning
        const maxOn = Math.min(9, 4 + Math.floor(wave / 2));
        if (queue.length && --spawnT <= 0 && bugs.length < maxOn) {
          spawnBug(queue.shift());
          spawnT = Math.max(25, 85 - wave * 5);
        }
        for (const b of bugs) updateBug(b);
        // bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
          const s = bullets[i]; s.x += s.vx; s.y += s.vy;
          let gone = s.x < -5 || s.x > W + 5 || s.y < -5 || s.y > H + 5;
          for (let j = bugs.length - 1; j >= 0 && !gone; j--) {
            const b = bugs[j];
            if (Math.hypot(b.x - s.x, b.y - s.y) < b.r + 3) {
              gone = true;
              if (--b.hp <= 0) killBug(j); else { b.flash = 8; snd.hit(); b.vx += s.vx * 0.15; b.vy += s.vy * 0.15; }
            }
          }
          for (const e of eggs) {
            if (gone) break;
            if (Math.hypot(e.x - s.x, e.y - s.y) < 7) { gone = true; e.vx += s.vx * 0.35; e.vy += s.vy * 0.35; snd.egg(); }
          }
          if (gone) bullets.splice(i, 1);
        }
        // grubs drift toward the edge of the web
        for (let i = grubs.length - 1; i >= 0; i--) {
          const g = grubs[i]; g.t++;
          const dx = g.x - CX, dy = g.y - CY, d = Math.hypot(dx, dy) || 1;
          g.x += dx / d * 0.22; g.y += dy / d * 0.22;
          if (d > WEB_R) { grubs.splice(i, 1); continue; }
          if (spider.alive && Math.hypot(g.x - spider.x, g.y - spider.y) < 14) {
            grubs.splice(i, 1); grubChain++;
            addScore(GRUB_PTS, g.x, g.y - 12); snd.grub(); continue;
          }
          for (const b of bugs) {
            if (b.type === 'spoiler' && Math.hypot(b.x - g.x, b.y - g.y) < b.r + 4) {
              grubs.splice(i, 1); b.stolen += GRUB_PTS; snd.steal(); break;
            }
          }
        }
        // eggs: pushed around, fall off the web, or hatch
        for (let i = eggs.length - 1; i >= 0; i--) {
          const e = eggs[i];
          if (spider.alive) {
            const dx = e.x - spider.x, dy = e.y - spider.y, d = Math.hypot(dx, dy);
            if (d < 14 && d > 0) { e.vx = dx / d * 3.2; e.vy = dy / d * 3.2; snd.egg(); }
          }
          e.x += e.vx; e.y += e.vy; e.vx *= 0.97; e.vy *= 0.97;
          if (!inWeb(e.x, e.y) && Math.hypot(e.x - CX, e.y - CY) > WEB_R + 2) {
            eggs.splice(i, 1); addScore(EGG_PTS, e.x, e.y); snd.eggOff(); continue;
          }
          if (--e.t <= 0) {
            eggs.splice(i, 1);
            spawnBug(wave >= 6 && Math.random() < 0.4 ? 'beetle' : 'mosquito', e.x, e.y);
            snd.hatch();
          }
        }
        // spider vs bugs
        if (spider.alive && spider.inv <= 0) {
          for (const b of bugs) {
            if (Math.hypot(b.x - spider.x, b.y - spider.y) < b.r + 5) { killSpider(); break; }
          }
        }
        // wave over?
        if (state === 'play' && !queue.length && !bugs.length && !eggs.length) { state = 'waveclear'; stateT = 0; }
        // heartbeat
        if (state === 'play' && api.frame % Math.max(16, 40 - wave * 2) === 0) A.tone(55 + (bugs.length * 6), 0.06, { type: 'triangle', vol: 0.12 });
      }
      function killSpider() {
        spider.alive = false; state = 'dead'; stateT = 0;
        if (!demo) lives--;
        grubChain = 0;
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU + 0.2;
          legs.push({ x: spider.x, y: spider.y, vx: Math.cos(a) * rnd(1, 3), vy: Math.sin(a) * rnd(1, 3), a, va: rnd(-0.2, 0.2), t: 120 });
        }
        for (let k = 0; k < 30; k++) { const a = rnd(0, TAU), s = rnd(0.5, 4); sparks.push({ x: spider.x, y: spider.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: rnd(20, 60), col: '#ff3a4a' }); }
        snd.die();
      }
      function respawn() {
        spider = newSpider(); state = 'play'; stateT = 0; bullets = [];
        // the bugs scatter back toward the edges
        for (const b of bugs) { const a = Math.atan2(b.y - CY, b.x - CX); b.x = CX + Math.cos(a) * 330; b.y = CY + Math.sin(a) * 300; b.vx = b.vy = 0; }
      }

      // ---------- drawing ----------
      function glow(ctx, col, blur) { ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = blur == null ? 6 : blur; }
      function circle(ctx, x, y, r, n) {
        n = n || 10;
        for (let i = 0; i <= n; i++) { const a = i / n * TAU, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
      }
      function ellipse(ctx, x, y, rx, ry, rot, n) {
        n = n || 10; const c = Math.cos(rot), s = Math.sin(rot);
        for (let i = 0; i <= n; i++) { const a = i / n * TAU, ex = Math.cos(a) * rx, ey = Math.sin(a) * ry; const px = x + ex * c - ey * s, py = y + ex * s + ey * c; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
      }
      function seg(ctx, x, y, rot, x1, y1, x2, y2) {
        const c = Math.cos(rot), s = Math.sin(rot);
        ctx.moveTo(x + x1 * c - y1 * s, y + x1 * s + y1 * c); ctx.lineTo(x + x2 * c - y2 * s, y + x2 * s + y2 * c);
      }
      function drawWeb(ctx) {
        glow(ctx, '#2a3cff', 4); ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < SPOKES; i++) {
          const a = i / SPOKES * TAU;
          ctx.moveTo(CX + Math.cos(a) * 6, CY + Math.sin(a) * 6); ctx.lineTo(CX + Math.cos(a) * WEB_R, CY + Math.sin(a) * WEB_R);
        }
        for (const r of RINGS) {
          for (let i = 0; i <= SPOKES; i++) {
            const a = i / SPOKES * TAU;
            // strands sag a little between spokes
            const px = CX + Math.cos(a) * r, py = CY + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else {
              const am = (i - 0.5) / SPOKES * TAU, rm = r * 0.94;
              ctx.quadraticCurveTo(CX + Math.cos(am) * rm, CY + Math.sin(am) * rm, px, py);
            }
          }
        }
        ctx.stroke();
      }
      function drawSpider(ctx, x, y, a, walk, sc) {
        sc = sc || 1;
        glow(ctx, '#ffffff', 6); ctx.lineWidth = 1.4;
        ctx.beginPath();
        ellipse(ctx, x, y, 7 * sc, 5 * sc, a, 10);            // abdomen
        ellipse(ctx, x + Math.cos(a) * 8 * sc, y + Math.sin(a) * 8 * sc, 3.5 * sc, 3 * sc, a, 8);   // head
        for (let i = 0; i < 4; i++) {
          for (const side of [-1, 1]) {
            const base = (-0.9 + i * 0.6) * side;
            const sw = Math.sin(walk + i * 1.3 + (side > 0 ? 0 : Math.PI)) * 0.25;
            const la = a + Math.PI / 2 * side + base * 0.5 + sw;
            const kx = x + Math.cos(la) * 9 * sc, ky = y + Math.sin(la) * 9 * sc;
            const fa = la + (i < 2 ? 0.6 : -0.6) * side * -1;
            ctx.moveTo(x + Math.cos(la) * 3 * sc, y + Math.sin(la) * 3 * sc); ctx.lineTo(kx, ky);
            ctx.lineTo(kx + Math.cos(fa) * 7 * sc, ky + Math.sin(fa) * 7 * sc);
          }
        }
        ctx.stroke();
        // red hourglass
        glow(ctx, '#ff2a3a', 8); ctx.beginPath();
        seg(ctx, x, y, a, -3 * sc, -2.5 * sc, 1 * sc, 2.5 * sc); seg(ctx, x, y, a, -3 * sc, 2.5 * sc, 1 * sc, -2.5 * sc);
        seg(ctx, x, y, a, -3 * sc, -2.5 * sc, -3 * sc, 2.5 * sc); seg(ctx, x, y, a, 1 * sc, -2.5 * sc, 1 * sc, 2.5 * sc);
        ctx.stroke();
      }
      function drawBug(ctx, b) {
        const col = b.flash > 0 && (b.flash & 2) ? '#ffffff' : BUGS[b.type].col;
        glow(ctx, col, 7); ctx.lineWidth = 1.3;
        const a = Math.atan2(b.vy, b.vx), f = (b.t >> 2) & 1, x = b.x, y = b.y;
        ctx.beginPath();
        switch (b.type) {
          case 'mosquito':
            seg(ctx, x, y, a, -6, 0, 5, 0); seg(ctx, x, y, a, 5, 0, 11, 0);           // body + proboscis
            seg(ctx, x, y, a, 0, 0, -3, f ? -8 : -5); seg(ctx, x, y, a, -3, f ? -8 : -5, -7, f ? -6 : -2);
            seg(ctx, x, y, a, 0, 0, -3, f ? 8 : 5); seg(ctx, x, y, a, -3, f ? 8 : 5, -7, f ? 6 : 2);
            seg(ctx, x, y, a, 2, 0, 4, 5); seg(ctx, x, y, a, 2, 0, 4, -5);
            break;
          case 'beetle':
            ellipse(ctx, x, y, 8, 6, a, 10); seg(ctx, x, y, a, -8, 0, 8, 0);
            for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) { const w = f ? 1.5 : -1.5; seg(ctx, x, y, a, i * 4, s * 5, i * 4 + w, s * 10); }
            seg(ctx, x, y, a, 8, 0, 11, -3); seg(ctx, x, y, a, 8, 0, 11, 3);
            break;
          case 'hornet':
            ellipse(ctx, x, y, 9, 4, a, 10);
            seg(ctx, x, y, a, -3, -4, -3, 4); seg(ctx, x, y, a, -6, -3, -6, 3); seg(ctx, x, y, a, 0, -4, 0, 4);
            seg(ctx, x, y, a, -9, 0, -13, 0);                                         // stinger
            seg(ctx, x, y, a, 2, -3, f ? -2 : 4, -11); seg(ctx, x, y, a, f ? -2 : 4, -11, -2, -4);
            seg(ctx, x, y, a, 2, 3, f ? -2 : 4, 11); seg(ctx, x, y, a, f ? -2 : 4, 11, -2, 4);
            break;
          case 'egglayer':
            ellipse(ctx, x, y, 12, 9, a, 12); ellipse(ctx, x, y, 7, 5, a, 10);
            seg(ctx, x, y, a, 12, 0, 16, -4); seg(ctx, x, y, a, 12, 0, 16, 4);
            for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) seg(ctx, x, y, a, i * 5, s * 8, i * 5 + (f ? 2 : -2), s * 13);
            break;
          case 'spoiler': {
            const r = b.t * 0.08;
            for (let i = 0; i < 4; i++) { const q = r + i * Math.PI / 2; seg(ctx, x, y, q, 0, 0, 11, 0); seg(ctx, x, y, q, 11, 0, 6, 5); }
            circle(ctx, x, y, 5, 8);
            break;
          }
        }
        ctx.stroke();
      }
      function drawGrub(ctx, g) {
        glow(ctx, '#ffe94a', 6); ctx.lineWidth = 1.2; ctx.beginPath();
        const w = Math.sin(g.t * 0.2) * 1.5;
        ctx.moveTo(g.x - 6, g.y + w); ctx.lineTo(g.x - 3, g.y - 2 - w); ctx.lineTo(g.x, g.y + 2 + w); ctx.lineTo(g.x + 3, g.y - 2 - w); ctx.lineTo(g.x + 6, g.y + w);
        circle(ctx, g.x + 7, g.y + w, 1.5, 6);
        ctx.stroke();
      }
      function drawEgg(ctx, e) {
        const warn = e.t < 90 && (e.t & 4);
        glow(ctx, warn ? '#ffffff' : '#d8d0ff', 5); ctx.lineWidth = 1.2; ctx.beginPath();
        ellipse(ctx, e.x, e.y, 4, 5.5, 0, 10);
        ctx.stroke();
      }
      function vt(ctx, s, x, y, sc, col, align, lw) {
        glow(ctx, col, 6); ctx.lineWidth = lw || 1.4; ctx.beginPath(); vtext(ctx, s, x, y, sc, align); ctx.stroke();
      }
      function render(ctx) {
        ctx.shadowBlur = 0; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        drawWeb(ctx);
        for (const e of eggs) drawEgg(ctx, e);
        for (const g of grubs) drawGrub(ctx, g);
        for (const b of bugs) drawBug(ctx, b);
        if (spider && spider.alive && (spider.inv <= 0 || (spider.inv & 4))) drawSpider(ctx, spider.x, spider.y, spider.a, spider.walk);
        // flying legs
        if (legs.length) {
          glow(ctx, '#ffffff', 5); ctx.beginPath();
          for (const l of legs) { ctx.moveTo(l.x, l.y); ctx.lineTo(l.x + Math.cos(l.a) * 12, l.y + Math.sin(l.a) * 12); }
          ctx.stroke();
        }
        // bullets
        glow(ctx, '#ffffff', 8); ctx.lineWidth = 2; ctx.beginPath();
        for (const s of bullets) { ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.6, s.y - s.vy * 0.6); }
        ctx.stroke();
        // sparks
        for (const p of sparks) { ctx.fillStyle = p.col; ctx.globalAlpha = Math.min(1, p.t / 20); ctx.fillRect(p.x - 1, p.y - 1, 2, 2); }
        ctx.globalAlpha = 1;
        for (const p of pops) vt(ctx, p.s, p.x, p.y, 1.6, '#ffe94a', 'center', 1);
        // HUD
        vt(ctx, String(demo ? 0 : score).padStart(2, '0'), 120, 16, 3.2, '#ffffff', 'right', 1.5);
        vt(ctx, String(hi), W / 2, 16, 2.2, '#9aa8ff', 'center', 1.2);
        if (!demo) {
          for (let i = 0; i < Math.min(6, lives - (state === 'dead' ? 0 : 1)); i++) drawSpider(ctx, W - 40 - i * 26, 26, -Math.PI / 2, 0, 0.7);
          vt(ctx, 'WAVE ' + wave, 20, H - 26, 2, '#5c7cff', 'left', 1.1);
        }
        if (state === 'wavein' && !demo) {
          vt(ctx, 'WAVE ' + wave, W / 2, 120, 4, '#ffffff', 'center', 1.6);
          if (wave === 1) vt(ctx, 'SHOOT THE BUGS - EAT THE GRUBS', W / 2, 160, 2, '#ffe94a', 'center', 1.1);
        }
        if (state === 'waveclear' && !demo) {
          vt(ctx, 'WAVE ' + wave + ' COMPLETE', W / 2, 120, 3.2, '#ffffff', 'center', 1.5);
          vt(ctx, 'BONUS ' + wave * 1000, W / 2, 160, 2.6, '#ffe94a', 'center', 1.2);
        }
        if (state === 'over' && !demo) vt(ctx, 'GAME OVER', W / 2, 200, 6, '#ff3a4a', 'center', 2);
        if (demo) drawAttract(ctx);
        ctx.shadowBlur = 0;
      }
      function drawAttract(ctx) {
        const page = Math.floor(attractT / 480) % 2;
        const cr = api.credits;
        const blink = coinFlash > 0 ? (coinFlash % 20) < 12 : (stateT % 60) < 40;
        vt(ctx, 'BLACK WIDOW', W / 2, 52, 7, '#ff3a4a', 'center', 2.4);
        if (page === 1) {
          const rows = [['mosquito', 'MOSQUITO', '100'], ['beetle', 'BEETLE', '200'], ['hornet', 'HORNET', '300'], ['egglayer', 'EGG LAYER', '500'], ['spoiler', 'SPOILER', '1000 AND UP']];
          ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(150, 110, 340, 250);
          rows.forEach((r, i) => {
            drawBug(ctx, { type: r[0], x: 200, y: 140 + i * 36, vx: 1, vy: 0, t: stateT, flash: 0 });
            vt(ctx, r[1] + '  ' + r[2], 236, 134 + i * 36, 2, '#ffffff', 'left', 1.1);
          });
          drawGrub(ctx, { x: 200, y: 320, t: stateT });
          vt(ctx, 'GRUB ' + GRUB_PTS + '   EGG OFF WEB ' + EGG_PTS, 236, 314, 2, '#ffe94a', 'left', 1.1);
          vt(ctx, 'HIGH SCORE ' + hi, W / 2, 344, 2, '#9aa8ff', 'center', 1.1);
        }
        if (blink) vt(ctx, cr > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 400, 3.4, '#ffffff', 'center', 1.5);
        vt(ctx, 'CREDITS ' + Math.min(99, cr), W / 2, 440, 2, '#9aa8ff', 'center', 1.1);
        vt(ctx, '1982 ATARI', W / 2, 460, 1.6, '#6070a0', 'center', 1);
      }
      return { update, render, destroy() { } };
    }
  });
})();
