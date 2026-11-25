// Space Fury (Sega, 1981) \u2014 from-scratch vector recreation for the MAME32 Game Room.
// Dock with weapon modules between waves, shoot the alien pieces before they combine, and endure the commander's taunts.
(function () {
  'use strict';
  // ---------- stroke font (4x6 grid) ----------
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
  function vt(ctx, str, x, y, sc, col, align, lw) {
    ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = lw || 1.5; vtext(ctx, str, x, y, sc, align); ctx.stroke();
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pad = (n, l) => String(Math.floor(n)).padStart(l, '0');
  const TAU = Math.PI * 2;
  const W = 640, H = 480;
  const wrapX = x => (x + W) % W, wrapY = y => (y + H) % H;
  const dX = d => { if (d > W / 2) d -= W; if (d < -W / 2) d += W; return d; };
  const dY = d => { if (d > H / 2) d -= H; if (d < -H / 2) d += H; return d; };

  // the commander's lines (shown between rounds)
  const TAUNTS = [
    ['SO... AN EARTHLING DARES', 'TO ENTER MY DOMAIN.', 'MY FLEET WILL FEAST ON YOUR SHIP.'],
    ['YOU HAVE SURVIVED. FOR NOW.', 'THAT WAS ONLY MY SCOUTS.'],
    ['IMPRESSIVE, FOR A PRIMITIVE.', 'BUT MY WARRIORS GROW HUNGRY.'],
    ['YOUR LUCK WILL NOT LAST,', 'LITTLE EARTHLING.'],
    ['ENOUGH OF THESE GAMES!', 'NOW YOU FACE MY FURY!'],
    ['STILL ALIVE? I AM ALMOST', 'BEGINNING TO ADMIRE YOU.', 'ALMOST.'],
    ['NO ONE HAS COME THIS FAR.', 'NO ONE WILL GO FURTHER.'],
    ['I HAVE A THOUSAND SHIPS.', 'YOU HAVE ONE.']
  ];
  const TAUNT_OVER = ['AS I FORETOLD...', 'YOU HAVE FAILED, EARTHLING.'];
  const TAUNT_ATTRACT = ['COME, EARTHLING.', 'INSERT A COIN... IF YOU DARE.'];

  // module types
  const MODS = {
    twin: { name: 'TWIN CANNON', col: '#40ff60' },
    spread: { name: 'SPREAD FIRE', col: '#ffd040' },
    side: { name: 'SIDE GUNS', col: '#ff6040' }
  };
  const PIECE_COL = ['#ff4040', '#40ff60', '#ffd040', '#40c0ff', '#ff60ff', '#ffffff'];

  ArcadeRegistry.register({
    id: 'spacefury', title: 'Space Fury', year: 1981, maker: 'Sega',
    width: W, height: H, vector: true, pointer: false,
    controls: 'Left/Right: rotate \u00b7 Up: thrust \u00b7 Space: fire \u00b7 Enter: start (Space skips the taunt)',
    marquee: { bg: '#04000c', fg: '#ff40ff', accent: '#40ff60' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(10000);
      let mode = 'attract', at = 0, coinFlash = 0, frame = 0, lastCred = api.credits;
      let g = null;
      const dust = [];
      for (let i = 0; i < 40; i++) dust.push({ x: rnd(0, W), y: rnd(0, H) });

      const S = {
        fire() { au.tone(1500, 0.07, { type: 'square', vol: 0.05, slideTo: 500 }); },
        boom() { au.noise(0.45, { vol: 0.2, freq: 1800, slideTo: 80 }); },
        big() { au.noise(1.0, { vol: 0.26, freq: 1000, slideTo: 40 }); au.tone(150, 0.8, { type: 'sawtooth', vol: 0.1, slideTo: 30 }); },
        combine() { au.tone(200, 0.4, { type: 'sawtooth', vol: 0.08, slideTo: 800 }); au.tone(300, 0.4, { type: 'square', vol: 0.05, slideTo: 1200, delay: 0.05 }); },
        dock() { au.melody([[440, .08], [554, .08], [659, .08], [880, .2]], { type: 'square', vol: 0.1 }); },
        voice() { au.tone(rnd(90, 160), 0.06, { type: 'sawtooth', vol: 0.07, slideTo: rnd(70, 200) }); },
        thrust() { au.noise(0.08, { vol: 0.04, freq: 500 }); },
        ebolt() { au.tone(400, 0.1, { type: 'triangle', vol: 0.07, slideTo: 150 }); },
        enter() { au.tone(900, 0.15, { type: 'square', vol: 0.04, slideTo: 300 }); },
        extra() { au.melody([[1047, .06], [1319, .06], [1568, .14]], { type: 'square', vol: 0.08 }); },
        warn() { au.tone(1200, 0.05, { type: 'square', vol: 0.05 }); }
      };

      // ---------- game ----------
      function newGame(demo) {
        g = { demo, score: 0, lives: 3, wave: 0, nextExtra: 10000, mods: [], fx: [], shots: [], bolts: [], aliens: [], modules: [], phase: '', phaseT: 0, taunt: TAUNTS[0], tauntT: 0 };
        resetShip();
        if (demo) { g.wave = 1; startWave(); } else startTaunt(TAUNTS[0]);
      }
      function resetShip() { g.ship = { x: W / 2, y: H / 2, a: -Math.PI / 2, vx: 0, vy: 0, alive: true, deadT: 0, inv: 120, cd: 0 }; }
      function startTaunt(lines) { g.phase = 'taunt'; g.taunt = lines; g.tauntT = 0; g.phaseT = 120 + lines.join('').length * 3; }
      function startDock() {
        const avail = Object.keys(MODS).filter(k => g.mods.indexOf(k) < 0);
        g.modules = [];
        if (!avail.length) { startWave(); return; }
        const spots = [[W * 0.2, H * 0.25], [W * 0.8, H * 0.25], [W * 0.5, H * 0.82]];
        avail.forEach((k, i) => g.modules.push({ type: k, x: spots[i][0], y: spots[i][1], a: rnd(0, TAU), va: rnd(-0.01, 0.01), t: 0 }));
        g.phase = 'dock'; g.phaseT = 600;
        g.ship.x = W / 2; g.ship.y = H / 2; g.ship.vx = g.ship.vy = 0;
      }
      function startWave() {
        if (!g.demo || g.wave === 0) g.wave++;
        const n = g.wave;
        g.modules = [];
        g.groups = Math.min(8, 2 + n);
        g.spawned = 0; g.spawnT = 60; g.groupId = 0;
        g.phase = 'wave'; g.phaseT = 0;
        g.aliens = []; g.bolts = [];
      }
      function addScore(n) {
        if (g.demo) return;
        g.score += n;
        if (g.score >= g.nextExtra) { g.lives++; g.nextExtra += g.nextExtra === 10000 ? 20000 : 30000; S.extra(); }
        if (g.score > hi) hi = g.score;
      }
      function boom(x, y, r, col, n) { g.fx.push({ x, y, t: 0, r, col, parts: Array.from({ length: n || 10 }, () => ({ a: rnd(0, TAU), s: rnd(0.4, 1.2) * r / 18, rot: rnd(0, 6) })) }); }
      function shipR() { return 9 + g.mods.length * 3; }
      function killShip() {
        const s = g.ship;
        if (g.demo || !s.alive || s.inv > 0) return;
        s.alive = false; s.deadT = 150; boom(s.x, s.y, 60, '#40e0ff', 22); boom(s.x, s.y, 30, '#ffffff', 10); S.big();
        g.lostMods = g.mods.length; g.mods = [];
      }
      function gameOver() {
        api.setHiScore(g.score);
        startTaunt(TAUNT_OVER); g.phase = 'overtaunt';
      }
      function afterDeath() {
        g.lives--;
        if (g.lives > 0) { resetShip(); g.bolts = []; return; }
        if (api.offerContinue && !g.demo) {
          g.phase = 'wait';
          const cg = g;
          api.offerContinue(() => { if (g === cg) { g.lives = 3; g.score = 0; resetShip(); g.phase = 'wave'; } }, () => { if (g === cg) gameOver(); });
        } else gameOver();
      }

      // ---------- aliens ----------
      function spawnGroup() {
        const n = g.wave, gid = g.groupId++;
        const edge = Math.floor(Math.random() * 4);
        const mx = rnd(W * 0.2, W * 0.8), my = rnd(H * 0.2, H * 0.8);
        for (let i = 0; i < 3; i++) {
          let x, y;
          if (edge === 0) { x = rnd(0, W); y = -10 - i * 25; } else if (edge === 1) { x = W + 10 + i * 25; y = rnd(0, H); }
          else if (edge === 2) { x = rnd(0, W); y = H + 10 + i * 25; } else { x = -10 - i * 25; y = rnd(0, H); }
          g.aliens.push({ k: 'piece', gid, x, y, vx: 0, vy: 0, mx: mx + rnd(-30, 30), my: my + rnd(-30, 30), sp: 1.3 + n * 0.12 + rnd(0, 0.4), rot: rnd(0, TAU), col: PIECE_COL[gid % PIECE_COL.length], t: 0, wander: rnd(0, TAU), hp: 1 });
        }
        S.enter();
      }
      function updAliens() {
        const n = g.wave, s = g.ship;
        if (g.spawned < g.groups && --g.spawnT <= 0) { spawnGroup(); g.spawned++; g.spawnT = Math.max(90, 240 - n * 15); }
        for (const a of g.aliens) {
          a.t++; a.rot += a.k === 'piece' ? 0.12 : 0.04;
          if (a.k === 'piece') {
            const mates = g.aliens.filter(b => b.k === 'piece' && b.gid === a.gid && !b.dead);
            let tx = a.mx, ty = a.my;
            if (mates.length === 1) { tx = s.x; ty = s.y; }     // a lone piece hunts the ship
            else { let cx = 0, cy = 0; for (const b of mates) { cx += b.x; cy += b.y; } tx = (cx / mates.length + a.mx) / 2; ty = (cy / mates.length + a.my) / 2; }
            const dx = dX(tx - a.x), dy = dY(ty - a.y), d = Math.hypot(dx, dy) || 1;
            a.wander += rnd(-0.2, 0.2);
            a.vx += (dx / d * a.sp + Math.cos(a.wander) * 0.6 - a.vx) * 0.06;
            a.vy += (dy / d * a.sp + Math.sin(a.wander) * 0.6 - a.vy) * 0.06;
          } else {
            // combined Fury ships hunt the player and shoot
            const dx = dX(s.x - a.x), dy = dY(s.y - a.y), d = Math.hypot(dx, dy) || 1;
            const sp = (a.k === 'super' ? 1.6 : 1.9) + n * 0.1;
            const orbit = d < 120 ? 1 : 0;
            a.vx += ((dx / d) * sp * (1 - orbit) + (-dy / d) * sp * orbit - a.vx) * 0.03;
            a.vy += ((dy / d) * sp * (1 - orbit) + (dx / d) * sp * orbit - a.vy) * 0.03;
            if (--a.cd <= 0 && s.alive) {
              a.cd = Math.max(45, (a.k === 'super' ? 70 : 110) - n * 6) + rnd(0, 40);
              const ang = Math.atan2(dy, dx), spd = 3.2 + n * 0.1;
              const angs = a.k === 'super' ? [ang - 0.25, ang, ang + 0.25] : [ang];
              for (const q of angs) g.bolts.push({ x: a.x, y: a.y, vx: Math.cos(q) * spd, vy: Math.sin(q) * spd, t: 160 });
              if (!g.demo) S.ebolt();
            }
          }
          if (a.k !== 'piece' || a.t > 60) { a.x = wrapX(a.x + a.vx); a.y = wrapY(a.y + a.vy); }
          else { a.x += a.vx; a.y += a.vy; }
          if (a.flash > 0) a.flash--;
          // contact
          if (s.alive && Math.hypot(dX(a.x - s.x), dY(a.y - s.y)) < shipR() + (a.k === 'piece' ? 8 : a.k === 'fury' ? 18 : 26)) killShip();
        }
        // combine pieces of a group once they gather
        const gids = new Set(g.aliens.filter(a => a.k === 'piece').map(a => a.gid));
        for (const gid of gids) {
          const m = g.aliens.filter(a => a.k === 'piece' && a.gid === gid);
          if (m.length < 2 || m.some(a => a.t < 120)) continue;
          let cx = 0, cy = 0; for (const a of m) { cx += a.x; cy += a.y; } cx /= m.length; cy /= m.length;
          if (m.every(a => Math.hypot(a.x - cx, a.y - cy) < 22)) {
            for (const a of m) a.dead = true;
            g.aliens.push({ k: 'fury', gid, x: cx, y: cy, vx: 0, vy: 0, rot: 0, col: m[0].col, t: 0, cd: 80, hp: 1, parts: m.length, flash: 20 });
            boom(cx, cy, 30, '#ffffff', 8); if (!g.demo) S.combine();
          }
        }
        // two Furies can merge into a Super Fury (from wave 4)
        if (n >= 4) {
          const f = g.aliens.filter(a => a.k === 'fury' && !a.dead && a.t > 200);
          for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) {
            if (f[i].dead || f[j].dead) continue;
            if (Math.hypot(dX(f[i].x - f[j].x), dY(f[i].y - f[j].y)) < 40) {
              f[i].dead = f[j].dead = true;
              const x = f[i].x, y = f[i].y;
              g.aliens.push({ k: 'super', gid: -1, x, y, vx: 0, vy: 0, rot: 0, col: '#ff8020', t: 0, cd: 60, hp: 3, parts: 6, flash: 30 });
              boom(x, y, 40, '#ffffff', 12); if (!g.demo) S.combine();
            }
          }
          // furies drift toward each other a little so merges actually happen
          if (f.length >= 2) { const a = f[0], b = f[1]; const dx = dX(b.x - a.x), dy = dY(b.y - a.y), d = Math.hypot(dx, dy) || 1; a.vx += dx / d * 0.03; a.vy += dy / d * 0.03; b.vx -= dx / d * 0.03; b.vy -= dy / d * 0.03; }
        }
        g.aliens = g.aliens.filter(a => !a.dead);
        // bolts
        for (const b of g.bolts) {
          b.x = wrapX(b.x + b.vx); b.y = wrapY(b.y + b.vy); b.t--;
          if (s.alive && Math.hypot(dX(b.x - s.x), dY(b.y - s.y)) < shipR()) { b.t = 0; killShip(); }
        }
        g.bolts = g.bolts.filter(b => b.t > 0);
        // wave complete
        if (g.spawned >= g.groups && !g.aliens.length && s.alive) {
          g.phase = 'clear'; g.phaseT = 120;
        }
      }
      function shoot() {
        const s = g.ship, ca = Math.cos(s.a), sa = Math.sin(s.a), sp = 8;
        const add = (ang, ox, oy) => {
          const x = s.x + ca * 12 + (-sa) * ox + ca * oy, y = s.y + sa * 12 + ca * ox + sa * oy;
          g.shots.push({ x, y, vx: Math.cos(ang) * sp + s.vx * 0.5, vy: Math.sin(ang) * sp + s.vy * 0.5, t: 55 });
        };
        add(s.a, 0, 0);
        if (g.mods.indexOf('twin') >= 0) { add(s.a, -9, -4); add(s.a, 9, -4); }
        if (g.mods.indexOf('spread') >= 0) { add(s.a - 0.3, 0, 0); add(s.a + 0.3, 0, 0); }
        if (g.mods.indexOf('side') >= 0) { add(s.a - Math.PI / 2, 0, -10); add(s.a + Math.PI / 2, 0, -10); add(s.a + Math.PI, 0, -22); }
        if (!g.demo) S.fire();
      }
      function updShots() {
        for (const sh of g.shots) {
          sh.x = wrapX(sh.x + sh.vx); sh.y = wrapY(sh.y + sh.vy); sh.t--;
          for (const a of g.aliens) {
            if (a.dead || sh.t <= 0) continue;
            const r = a.k === 'piece' ? 10 : a.k === 'fury' ? 18 : 26;
            if (Math.hypot(dX(a.x - sh.x), dY(a.y - sh.y)) < r) {
              sh.t = 0; a.hp--;
              if (a.hp <= 0) {
                a.dead = true;
                if (a.k === 'piece') { boom(a.x, a.y, 20, a.col, 8); S.boom(); addScore(100); }
                else if (a.k === 'fury') { boom(a.x, a.y, 40, a.col, 16); S.big(); addScore(250 * a.parts); }
                else { boom(a.x, a.y, 70, '#ff8020', 26); S.big(); addScore(2000); }
              } else { a.flash = 10; S.boom(); }
            }
          }
        }
        g.shots = g.shots.filter(s => s.t > 0);
      }
      function aiInput() {
        const s = g.ship;
        let tgt = null, bd = 1e9;
        for (const a of g.aliens) { const d = Math.hypot(dX(a.x - s.x), dY(a.y - s.y)); if (d < bd) { bd = d; tgt = a; } }
        if (g.phase === 'dock' && g.modules.length) { tgt = g.modules[0]; bd = Math.hypot(tgt.x - s.x, tgt.y - s.y); }
        const inp = { left: false, right: false, thrust: false, fire: false };
        if (tgt) {
          const da = Math.atan2(dY(tgt.y - s.y), dX(tgt.x - s.x)) - s.a;
          const d = Math.atan2(Math.sin(da), Math.cos(da));
          inp.left = d < -0.06; inp.right = d > 0.06;
          inp.fire = Math.abs(d) < 0.2 && g.phase === 'wave';
          inp.thrust = g.phase === 'dock' ? Math.abs(d) < 0.3 && Math.hypot(s.vx, s.vy) < 1.5 : bd > 220 && Math.abs(d) < 0.4 && frame % 3 === 0;
        }
        return inp;
      }
      function updShip(inp) {
        const s = g.ship;
        if (!s.alive) { if (--s.deadT <= 0) afterDeath(); return; }
        if (s.inv > 0) s.inv--;
        if (inp.left) s.a -= 0.075; if (inp.right) s.a += 0.075;
        if (inp.thrust) { s.vx += Math.cos(s.a) * 0.12; s.vy += Math.sin(s.a) * 0.12; if (frame % 5 === 0 && !g.demo) S.thrust(); }
        s.vx *= 0.988; s.vy *= 0.988;
        const sp = Math.hypot(s.vx, s.vy); if (sp > 5) { s.vx *= 5 / sp; s.vy *= 5 / sp; }
        s.x = wrapX(s.x + s.vx); s.y = wrapY(s.y + s.vy);
        if (s.cd > 0) s.cd--;
        if (inp.fire && s.cd === 0 && g.shots.length < 14 && g.phase !== 'dock') { shoot(); s.cd = 11; }
      }
      function updDock() {
        const s = g.ship;
        for (const m of g.modules) {
          m.t++; m.a += m.va;
          m.x += Math.sin(m.t * 0.01) * 0.2; m.y += Math.cos(m.t * 0.013) * 0.15;
          const d = Math.hypot(m.x - s.x, m.y - s.y);
          if (s.alive && d < 26) {
            if (Math.hypot(s.vx, s.vy) < 2.6) {
              g.mods.push(m.type); m.got = true; boom(m.x, m.y, 26, MODS[m.type].col, 10); S.dock();
              g.dockMsg = MODS[m.type].name; g.dockMsgT = 120;
            } else if (!m.warned) { m.warned = true; S.warn(); g.dockMsg = 'TOO FAST - SLOW DOWN TO DOCK'; g.dockMsgT = 90; }
          } else if (d > 40) m.warned = false;
        }
        if (g.modules.some(m => m.got)) { g.modules = []; g.phaseT = Math.min(g.phaseT, 70); }
        if (--g.phaseT <= 0) startWave();
      }
      function step() {
        for (const f of g.fx) f.t++;
        g.fx = g.fx.filter(f => f.t < 50);
        if (g.dockMsgT > 0) g.dockMsgT--;
        const skip = !g.demo && api.anyPressed('Space', 'Enter');
        switch (g.phase) {
          case 'wait': return;
          case 'taunt': case 'overtaunt': {
            g.tauntT++;
            const total = g.taunt.join('').length;
            if (g.tauntT % 3 === 0 && g.tauntT / 2 < total && !g.demo) S.voice();
            if (--g.phaseT <= 0 || (skip && g.tauntT > 40)) {
              if (g.phase === 'overtaunt') { g.phase = 'over'; g.phaseT = 200; }
              else startDock();
            }
            return;
          }
          case 'over': if (--g.phaseT <= 0 || (g.phaseT < 140 && api.anyPressed('Enter'))) { mode = 'attract'; at = 0; g = null; } return;
          case 'clear': {
            g.phaseT--; updShots();
            const inp = g.demo ? aiInput() : readInput(); updShip(inp);
            if (g.phaseT <= 0) { if (g.demo) startWave(); else startTaunt(TAUNTS[g.wave % TAUNTS.length]); }
            return;
          }
        }
        const inp = g.demo ? aiInput() : readInput();
        updShip(inp);
        updShots();
        if (g.phase === 'dock') updDock();
        else if (g.phase === 'wave') updAliens();
      }
      function readInput() { return { left: api.key('ArrowLeft'), right: api.key('ArrowRight'), thrust: api.key('ArrowUp'), fire: api.key('Space') }; }
      function update() {
        frame++;
        if (api.credits > lastCred) au.tone(1760, 0.06, { type: 'square', vol: 0.07, slideTo: 2640 });
        lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'attract') {
          at++;
          const ph = attractPhase();
          if (ph === 1) { if (!g) newGame(true); step(); if (g && g.wave > 3) g = null; } else g = null;
          if (at >= 2000) at = 0;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { mode = 'game'; newGame(false); }
            else { coinFlash = 90; au.tone(90, 0.3, { type: 'square', vol: 0.14 }); }
          }
          return;
        }
        step();
      }
      function attractPhase() { return at < 500 ? 0 : at < 1500 ? 1 : 2; }

      // ---------- rendering ----------
      function lines(ctx, pts, x, y, a, sc, closed) {
        const ca = Math.cos(a), sa = Math.sin(a);
        for (let i = 0; i < pts.length; i++) {
          const px = x + (pts[i][0] * ca - pts[i][1] * sa) * sc, py = y + (pts[i][0] * sa + pts[i][1] * ca) * sc;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        if (closed) { const px = x + (pts[0][0] * ca - pts[0][1] * sa) * sc, py = y + (pts[0][0] * sa + pts[0][1] * ca) * sc; ctx.lineTo(px, py); }
      }
      function drawShip(ctx, x, y, a, mods, sc, col) {
        sc = sc || 1;
        ctx.beginPath(); ctx.strokeStyle = col || '#40e0ff'; ctx.lineWidth = 1.6;
        lines(ctx, [[14, 0], [-8, -9], [-4, 0], [-8, 9]], x, y, a, sc, true);
        lines(ctx, [[2, -3], [6, 0], [2, 3]], x, y, a, sc, false);
        ctx.stroke();
        if (mods.indexOf('twin') >= 0) { ctx.beginPath(); ctx.strokeStyle = MODS.twin.col; lines(ctx, [[8, -9], [-6, -9], [-6, -13], [8, -13]], x, y, a, sc, true); lines(ctx, [[8, 9], [-6, 9], [-6, 13], [8, 13]], x, y, a, sc, true); ctx.stroke(); }
        if (mods.indexOf('spread') >= 0) { ctx.beginPath(); ctx.strokeStyle = MODS.spread.col; lines(ctx, [[-8, -9], [-14, -18], [-2, -14], [6, -5]], x, y, a, sc, false); lines(ctx, [[-8, 9], [-14, 18], [-2, 14], [6, 5]], x, y, a, sc, false); ctx.stroke(); }
        if (mods.indexOf('side') >= 0) { ctx.beginPath(); ctx.strokeStyle = MODS.side.col; lines(ctx, [[-4, 0], [-12, -5], [-22, 0], [-12, 5]], x, y, a, sc, true); lines(ctx, [[-10, -4], [-10, -20]], x, y, a, sc, false); lines(ctx, [[-10, 4], [-10, 20]], x, y, a, sc, false); ctx.stroke(); }
      }
      function drawModule(ctx, m) {
        const col = MODS[m.type].col;
        ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = 1.5;
        lines(ctx, [[-14, -10], [14, -10], [14, 10], [-14, 10]], m.x, m.y, m.a, 1, true);
        lines(ctx, [[14, -5], [22, -5], [22, 5], [14, 5]], m.x, m.y, m.a, 1, false);
        if (m.type === 'twin') { lines(ctx, [[-8, -4], [8, -4]], m.x, m.y, m.a, 1); lines(ctx, [[-8, 4], [8, 4]], m.x, m.y, m.a, 1); }
        else if (m.type === 'spread') { lines(ctx, [[-8, 0], [8, -6]], m.x, m.y, m.a, 1); lines(ctx, [[-8, 0], [8, 0]], m.x, m.y, m.a, 1); lines(ctx, [[-8, 0], [8, 6]], m.x, m.y, m.a, 1); }
        else { lines(ctx, [[0, -10], [0, -18]], m.x, m.y, m.a, 1); lines(ctx, [[0, 10], [0, 18]], m.x, m.y, m.a, 1); lines(ctx, [[-14, 0], [-22, 0]], m.x, m.y, m.a, 1); }
        ctx.stroke();
        // docking beacon
        if ((frame >> 4) & 1) { ctx.beginPath(); ctx.arc(m.x, m.y, 30 + (frame % 16), 0, TAU); ctx.strokeStyle = col; ctx.lineWidth = 0.8; ctx.stroke(); }
        vt(ctx, MODS[m.type].name, m.x, m.y + 34, 1.6, col, 'center', 1.1);
      }
      function drawAlien(ctx, a) {
        ctx.beginPath(); ctx.strokeStyle = a.flash > 0 && (a.flash & 2) ? '#ffffff' : a.col; ctx.lineWidth = 1.6;
        if (a.k === 'piece') {
          lines(ctx, [[0, -8], [7, 6], [0, 2], [-7, 6]], a.x, a.y, a.rot, 1, true);
        } else if (a.k === 'fury') {
          for (let i = 0; i < a.parts; i++) {
            const ang = a.rot + i * TAU / a.parts;
            lines(ctx, [[0, -8], [7, 6], [0, 2], [-7, 6]], a.x + Math.cos(ang) * 9, a.y + Math.sin(ang) * 9, ang + Math.PI / 2, 1.1, true);
          }
          ctx.moveTo(a.x + 5, a.y); ctx.arc(a.x, a.y, 5, 0, TAU);
        } else {
          for (let i = 0; i < 6; i++) {
            const ang = a.rot + i * TAU / 6;
            lines(ctx, [[0, -8], [7, 6], [0, 2], [-7, 6]], a.x + Math.cos(ang) * 17, a.y + Math.sin(ang) * 17, ang + Math.PI / 2, 1.2, true);
          }
          lines(ctx, [[10, 0], [0, 10], [-10, 0], [0, -10]], a.x, a.y, -a.rot * 2, 1, true);
          ctx.moveTo(a.x + 4, a.y); ctx.arc(a.x, a.y, 4, 0, TAU);
        }
        ctx.stroke();
      }
      function drawCommander(ctx, cx, cy, sc, talking) {
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.strokeStyle = '#40ff60';
        // dome head
        ctx.moveTo(cx - 90 * sc, cy + 40 * sc);
        ctx.bezierCurveTo(cx - 110 * sc, cy - 90 * sc, cx + 110 * sc, cy - 90 * sc, cx + 90 * sc, cy + 40 * sc);
        ctx.bezierCurveTo(cx + 70 * sc, cy + 95 * sc, cx - 70 * sc, cy + 95 * sc, cx - 90 * sc, cy + 40 * sc);
        // brow ridges
        ctx.moveTo(cx - 70 * sc, cy - 32 * sc); ctx.lineTo(cx - 20 * sc, cy - 18 * sc); ctx.moveTo(cx + 70 * sc, cy - 32 * sc); ctx.lineTo(cx + 20 * sc, cy - 18 * sc);
        // antennae
        ctx.moveTo(cx - 40 * sc, cy - 58 * sc); ctx.lineTo(cx - 70 * sc, cy - 110 * sc); ctx.moveTo(cx + 40 * sc, cy - 58 * sc); ctx.lineTo(cx + 70 * sc, cy - 110 * sc);
        ctx.moveTo(cx - 64 * sc, cy - 110 * sc); ctx.arc(cx - 70 * sc, cy - 110 * sc, 6 * sc, 0, TAU);
        ctx.moveTo(cx + 76 * sc, cy - 110 * sc); ctx.arc(cx + 70 * sc, cy - 110 * sc, 6 * sc, 0, TAU);
        // gill lines
        for (let i = 0; i < 3; i++) { ctx.moveTo(cx - 84 * sc, cy + (i * 12) * sc); ctx.lineTo(cx - 70 * sc, cy + (i * 12 + 4) * sc); ctx.moveTo(cx + 84 * sc, cy + (i * 12) * sc); ctx.lineTo(cx + 70 * sc, cy + (i * 12 + 4) * sc); }
        ctx.stroke();
        // the single great eye
        ctx.beginPath(); ctx.strokeStyle = '#ffffff';
        ctx.moveTo(cx + 34 * sc, cy - 10 * sc); ctx.ellipse(cx, cy - 10 * sc, 34 * sc, 20 * sc, 0, 0, TAU); ctx.stroke();
        const look = Math.sin(frame * 0.03) * 14 * sc;
        ctx.beginPath(); ctx.strokeStyle = '#ff2020';
        ctx.moveTo(cx + look + 10 * sc, cy - 10 * sc); ctx.arc(cx + look, cy - 10 * sc, 10 * sc, 0, TAU);
        ctx.moveTo(cx + look + 3 * sc, cy - 10 * sc); ctx.arc(cx + look, cy - 10 * sc, 3 * sc, 0, TAU);
        ctx.stroke();
        // mouth with fangs
        const open = talking ? (Math.abs(Math.sin(frame * 0.5)) * 14 + 2) * sc : 3 * sc;
        ctx.beginPath(); ctx.strokeStyle = '#40ff60';
        ctx.moveTo(cx - 40 * sc, cy + 40 * sc); ctx.quadraticCurveTo(cx, cy + 40 * sc - 6 * sc, cx + 40 * sc, cy + 40 * sc);
        ctx.moveTo(cx - 40 * sc, cy + 40 * sc); ctx.quadraticCurveTo(cx, cy + 40 * sc + open * 2, cx + 40 * sc, cy + 40 * sc);
        for (const fx of [-22, -8, 8, 22]) { ctx.moveTo(cx + (fx - 4) * sc, cy + 37 * sc); ctx.lineTo(cx + fx * sc, cy + 46 * sc); ctx.lineTo(cx + (fx + 4) * sc, cy + 37 * sc); }
        ctx.stroke();
      }
      function drawTaunt(ctx, lines_, t, y0) {
        let shown = Math.floor(t / 2);
        lines_.forEach((ln, i) => {
          const s = ln.slice(0, Math.max(0, shown)); shown -= ln.length;
          vt(ctx, s, W / 2, y0 + i * 30, 3, '#ffd040', 'center', 1.7);
        });
      }
      function drawHUD(ctx) {
        vt(ctx, pad(g.score, 6), 20, 14, 2.8, '#ffffff');
        vt(ctx, 'HI ' + pad(hi, 6), W / 2, 14, 2, '#a0a0a0', 'center');
        vt(ctx, 'WAVE ' + g.wave, W - 20, 14, 2, '#ff60ff', 'right');
        for (let i = 0; i < Math.min(6, g.lives - 1); i++) drawShip(ctx, 30 + i * 22, 50, -Math.PI / 2, [], 0.7, '#40e0ff');
      }
      function drawPlay(ctx) {
        ctx.fillStyle = '#303050'; for (const d of dust) ctx.fillRect(d.x, d.y, 1.5, 1.5);
        for (const m of g.modules) drawModule(ctx, m);
        for (const a of g.aliens) drawAlien(ctx, a);
        ctx.fillStyle = '#ff60ff'; for (const b of g.bolts) { ctx.fillRect(b.x - 2, b.y - 2, 4, 4); }
        ctx.fillStyle = '#ffffff'; for (const s of g.shots) ctx.fillRect(s.x - 1.5, s.y - 1.5, 3, 3);
        const s = g.ship;
        if (s.alive && (s.inv === 0 || (frame & 4))) {
          drawShip(ctx, s.x, s.y, s.a, g.mods);
          if (!g.demo && api.key('ArrowUp') && (frame & 2)) { ctx.beginPath(); ctx.strokeStyle = '#ff8040'; lines(ctx, [[-5, -4], [-14, 0], [-5, 4]], s.x, s.y, s.a, 1); ctx.stroke(); }
        }
        for (const f of g.fx) {
          ctx.beginPath(); ctx.strokeStyle = f.t > 32 && (f.t & 2) ? '#603020' : f.col; ctx.lineWidth = 1.4;
          for (const q of f.parts) { const d = q.s * f.t, x = f.x + Math.cos(q.a) * d, y = f.y + Math.sin(q.a) * d, r = q.rot + f.t * 0.2; ctx.moveTo(x - Math.cos(r) * 3, y - Math.sin(r) * 3); ctx.lineTo(x + Math.cos(r) * 3, y + Math.sin(r) * 3); }
          ctx.stroke();
        }
      }
      function attractFooter(ctx, y) {
        const blink = (frame >> 5) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) vt(ctx, 'INSERT COIN', W / 2, y, 3, '#ffffff', 'center'); }
        else if (blink) vt(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, y, 3, '#40ff60', 'center');
        vt(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), W / 2, y + 34, 2, '#808080', 'center');
      }
      function render(ctx) {
        ctx.fillStyle = '#020004'; ctx.fillRect(0, 0, W, H);
        if (mode === 'attract' && !g) {
          const ph = attractPhase();
          vt(ctx, 'SPACE FURY', W / 2, 24, 7, '#ff40ff', 'center', 2.4);
          if (ph === 0) {
            drawCommander(ctx, W / 2, 210, 1.1, (at % 240) < 160);
            drawTaunt(ctx, TAUNT_ATTRACT, at % 240 * 1.2, 330);
          } else {
            vt(ctx, 'HIGH SCORE ' + pad(hi, 6), W / 2, 100, 3, '#ffd040', 'center');
            const rows = [['piece', '100'], ['fury', '250 PER PIECE'], ['super', '2000']];
            rows.forEach((r, i) => {
              const y = 170 + i * 60;
              drawAlien(ctx, { k: r[0], x: 200, y, rot: frame * 0.05, col: r[0] === 'super' ? '#ff8020' : PIECE_COL[i], parts: 3, flash: 0 });
              vt(ctx, r[1], 260, y - 8, 2.6, '#ffffff');
            });
            vt(ctx, 'DOCK WITH MODULES FOR MORE FIREPOWER', W / 2, 350, 2, '#40e0ff', 'center');
          }
          attractFooter(ctx, 400);
          vt(ctx, '1981 SEGA', W - 14, 462, 1.6, '#606060', 'right');
          return;
        }
        if (g.phase === 'taunt' || g.phase === 'overtaunt') {
          drawCommander(ctx, W / 2, 190, 1.2, g.tauntT / 2 < g.taunt.join('').length);
          drawTaunt(ctx, g.taunt, g.tauntT, 330);
          drawHUD(ctx);
          return;
        }
        drawPlay(ctx);
        drawHUD(ctx);
        if (g.phase === 'dock') {
          vt(ctx, 'DOCK WITH A MODULE', W / 2, 90, 3, '#40e0ff', 'center');
          vt(ctx, String(Math.ceil(g.phaseT / 60)), W / 2, 124, 3, '#ffffff', 'center');
        }
        if (g.dockMsgT > 0) vt(ctx, g.dockMsg, W / 2, H - 60, 2.4, '#ffd040', 'center');
        if (g.phase === 'clear') vt(ctx, 'WAVE ' + g.wave + ' COMPLETE', W / 2, H / 2 - 60, 3.5, '#40ff60', 'center');
        if (g.phase === 'over') vt(ctx, 'GAME OVER', W / 2, H / 2 - 20, 6, '#ff4040', 'center', 2.2);
        if (mode === 'attract') {
          vt(ctx, 'SPACE FURY', W / 2, 70, 4, '#ff40ff', 'center', 2);
          attractFooter(ctx, 400);
        }
      }
      return { update, render, destroy() { } };
    }
  });
})();
