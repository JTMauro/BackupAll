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
  function mkSpr(rows, pal) { return { rows: rows, pal: pal, w: rows[0].length, h: rows.length, cv: null, cvf: null }; }
  function bakeSpr(s, flip) {
    const c = document.createElement('canvas'); c.width = s.w; c.height = s.h;
    const g = c.getContext('2d');
    for (let y = 0; y < s.h; y++) {
      const row = s.rows[y];
      for (let x = 0; x < row.length; x++) {
        const col = s.pal[row[x]]; if (!col) continue;
        g.fillStyle = col; g.fillRect(flip ? s.w - 1 - x : x, y, 1, 1);
      }
    }
    return c;
  }
  function drawSpr(ctx, s, x, y, flip) {
    let c = flip ? s.cvf : s.cv;
    if (!c) { c = bakeSpr(s, flip); if (flip) s.cvf = c; else s.cv = c; }
    ctx.drawImage(c, Math.round(x), Math.round(y));
  }
  function hit(ax, ay, aw, ah, bx, by, bw, bh) { return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }
  function pad2(n, k) { return String(n).padStart(k || 2, '0'); }

  // ======================================================================
  // APB - All Points Bulletin (Atari Games, 1987) -- from-scratch recreation.
  // Officer Bob patrols the city: meet the daily arrest quota, catch the
  // APB suspect, mind the gas gauge, and don't collect 10 demerits.
  // ======================================================================
  const W = 256, H = 240, TOP = 20;
  const BS = 128, NB = 8, RW = 20, CITY = BS * NB;
  const TYPES = {
    litter: { name: 'LITTERBUGS', pts: 500, col: '#40c040', roof: '#208020' },
    speeder: { name: 'SPEEDERS', pts: 800, col: '#e03030', roof: '#901010' },
    drunk: { name: 'DRUNK DRIVERS', pts: 1000, col: '#e0a020', roof: '#906000' },
    hitch: { name: 'HITCHHIKERS', pts: 400, col: '#ffffff', roof: '#ffffff' }
  };
  const DAYS = [
    [['litter', 3]],
    [['speeder', 3]],
    [['hitch', 3], ['litter', 2]],
    [['drunk', 3]],
    [['speeder', 2], ['drunk', 2]],
    [['litter', 3], ['hitch', 2], ['speeder', 2]],
    [['drunk', 3], ['speeder', 3]]
  ];
  const SUSPECTS = ['FREDDY FENDERBEND', 'MADGE THE MUGGER', 'DOUBLE PARK DAN', 'HUBCAP HARRY', 'SNEAKY PETE', 'CAPTAIN CHAOS', 'THE PRANKSTER'];
  const CIV = [['#3060e0', '#203890'], ['#c0c0c0', '#808080'], ['#a040c0', '#602080'], ['#e0e040', '#909020'], ['#40c0c0', '#207070'], ['#e07040', '#904020']];
  function isRoad(x, y) {
    if (x < -RW || y < -RW || x > CITY + RW || y > CITY + RW) return false;
    const rx = ((x % BS) + BS) % BS, ry = ((y % BS) + BS) % BS;
    return Math.min(rx, BS - rx) <= RW || Math.min(ry, BS - ry) <= RW;
  }
  function blockKind(i, j) {
    if ((i === 1 && j === 1) || (i === 5 && j === 5)) return 'gas';
    if (i === 3 && j === 5) return 'donut';
    if (i === 3 && j === 3) return 'station';
    if ((i * 7 + j * 3) % 5 === 0) return 'park';
    return 'city';
  }
  function hash(i, j, k) { let h = (i * 374761393 + j * 668265263 + k * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

  ArcadeRegistry.register({
    id: 'apb', title: 'APB', year: 1987, maker: 'Atari Games',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Left/Right: steer \u00b7 Up: gas \u00b7 Down: brake/reverse \u00b7 Space/X: siren \u00b7 Enter: start',
    marquee: { bg: '#101830', fg: '#ffffff', accent: '#ff2020' },
    create(api) {
      const au = api.audio;
      let mode = 'attract', attractT = 0, coinFlash = 0, overT = 0;
      let hi = api.getHiScore(50000);
      let score = 0, demerits = 0, day = 1;
      let pc, cars, peds, trash, parts, pops, camX = 0, camY = 0, phase, phaseT, timer, quota, apb, donutUsed, sirenSnd, msg, msgT, bumpCD, tow;
      const sfx = {
        siren(t) { if (t % 24 === 0) au.tone(t % 48 === 0 ? 960 : 720, 0.2, { type: 'square', vol: 0.05 }); },
        bump() { au.noise(0.12, { vol: 0.16, freq: 500 }); },
        crash() { au.noise(0.4, { vol: 0.25, freq: 1400, slideTo: 100 }); au.tone(200, 0.3, { type: 'sawtooth', vol: 0.1, slideTo: 50 }); },
        demerit() { au.tone(220, 0.15, { type: 'square', vol: 0.12 }); au.tone(165, 0.3, { type: 'square', vol: 0.12, delay: 0.16 }); },
        arrest() { au.melody([[659, .07], [784, .07], [988, .07], [1319, .16]], { type: 'square', vol: 0.12 }); },
        pull() { au.tone(500, 0.2, { type: 'triangle', vol: 0.1, slideTo: 250 }); },
        fuel() { au.tone(880, 0.04, { type: 'square', vol: 0.06 }); },
        day() { au.melody([[392, .12], [392, .06], [523, .12], [659, .12], [784, .3]], { type: 'square', vol: 0.12 }); },
        horn() { au.tone(330, 0.2, { type: 'sawtooth', vol: 0.08 }); au.tone(392, 0.2, { type: 'sawtooth', vol: 0.06 }); },
        apb() { au.melody([[880, .1], [0, .05], [880, .1], [0, .05], [880, .1], [1175, .3]], { type: 'square', vol: 0.12 }); }
      };
      function addScore(n, x, y) {
        score += n; if (score > hi) hi = score;
        if (x != null) pops.push({ x: x, y: y, s: String(n), t: 50 });
      }
      function say(s, t) { msg = s; msgT = t || 120; }
      function burst(x, y, col, n) {
        for (let i = 0; i < (n || 10); i++) {
          const a = Math.random() * Math.PI * 2, s = 0.3 + Math.random() * 1.5;
          parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 20 + Math.random() * 25, c: col });
        }
      }
      function addDemerit(why, x, y) {
        demerits++; sfx.demerit(); say('DEMERIT! ' + why, 100);
        if (x != null) pops.push({ x: x, y: y, s: 'DEMERIT', t: 60 });
      }

      // ---------------- traffic ----------------
      function carPos(c) {
        if (c.ax === 'h') { c.x = c.s; c.y = c.line + (c.dir > 0 ? 8 : -8) + c.shift; c.ang = c.dir > 0 ? 0 : Math.PI; }
        else { c.y = c.s; c.x = c.line + (c.dir > 0 ? -8 : 8) - c.shift * c.dir; c.ang = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
        if (c.ax === 'h') c.y = c.line + (c.dir > 0 ? 8 + c.shift : -8 - c.shift);
      }
      function newCar(type, near) {
        let tries = 0, c = null;
        while (tries++ < 30) {
          const ax = Math.random() < 0.5 ? 'h' : 'v';
          const line = (Math.random() * (NB + 1) | 0) * BS;
          const s = Math.random() * CITY;
          const dir = Math.random() < 0.5 ? 1 : -1;
          c = { ax: ax, line: line, s: s, dir: dir, shift: 0, x: 0, y: 0, ang: 0, type: type, state: 'drive', t: 0, spd: 0, col: CIV[Math.random() * CIV.length | 0], wob: Math.random() * 6, hits: 0, hitCD: 0 };
          carPos(c);
          const d = Math.hypot(c.x - pc.x, c.y - pc.y);
          if (!near || (d > 170 && d < 380)) break;
        }
        c.spd = type === 'speeder' ? 2.3 + Math.random() * 0.3 : type === 'apb' ? 2.15 + Math.min(0.35, day * 0.04) : 0.9 + Math.random() * 0.5;
        if (type !== 'civ' && type !== 'apb') c.col = [TYPES[type].col, TYPES[type].roof];
        if (type === 'apb') c.col = ['#202020', '#c040ff'];
        return c;
      }
      function chooseTurn(c, node) {
        const opts = [];
        const nx = node + c.dir * BS;
        if (nx >= 0 && nx <= CITY) opts.push({ ax: c.ax, line: c.line, s: node, dir: c.dir, w: 3 });
        for (const d of [1, -1]) {
          const nl = c.line + d * BS;
          if (nl >= 0 && nl <= CITY) opts.push({ ax: c.ax === 'h' ? 'v' : 'h', line: node, s: c.line, dir: d, w: 1 });
        }
        if (!opts.length) { c.dir = -c.dir; return; }
        let pick;
        if (c.type === 'apb' && c.state === 'drive') {
          // flee: pick the option leading furthest away from the cop
          let best = -1;
          for (const o of opts) {
            const ex = o.ax === 'h' ? o.s + o.dir * BS : o.line, ey = o.ax === 'h' ? o.line : o.s + o.dir * BS;
            const d = Math.hypot(ex - pc.x, ey - pc.y) + Math.random() * 60;
            if (d > best) { best = d; pick = o; }
          }
        } else {
          let tot = 0; for (const o of opts) tot += o.w;
          let r = Math.random() * tot;
          for (const o of opts) { r -= o.w; if (r <= 0) { pick = o; break; } }
          pick = pick || opts[0];
        }
        c.ax = pick.ax; c.line = pick.line; c.s = pick.s; c.dir = pick.dir;
      }
      function moveCar(c) {
        c.t++;
        if (c.hitCD > 0) c.hitCD--;
        if (c.state === 'wreck') { c.spd = 0; if (c.t % 6 === 0) parts.push({ x: c.x, y: c.y, vx: 0.2, vy: -0.5, t: 30, c: '#808080' }); return; }
        let sp = c.spd;
        if (c.state === 'pull') { c.spd = Math.max(0, c.spd - 0.04); sp = c.spd; c.shift = Math.min(9, c.shift + 0.25); if (c.spd <= 0) { c.state = 'stopped'; c.t = 0; } }
        else if (c.state === 'stopped') { sp = 0; if (c.t > 540) { c.state = 'drive'; c.spd = c.type === 'speeder' ? 2.4 : 1.2; c.shift = 0; } }
        else if (c.state === 'flee') { sp = c.spd * 1.25; if (c.t > 150) { c.state = 'pull'; sfx.pull(); } }
        if (c.type === 'drunk' && c.state === 'drive') { c.wob += 0.05; c.shift = Math.sin(c.wob) * 9; }
        const prev = c.s;
        c.s += sp * c.dir;
        const a = Math.floor(prev / BS), b = Math.floor(c.s / BS);
        if (sp > 0 && a !== b) {
          const node = c.dir > 0 ? b * BS : a * BS;
          const over = Math.abs(c.s - node);
          chooseTurn(c, node);
          c.s += over * c.dir;
        }
        carPos(c);
        if (c.type === 'litter' && c.state === 'drive' && c.t % 70 === 0) trash.push({ x: c.x, y: c.y, t: 900, k: Math.random() * 3 | 0 });
      }

      // ---------------- flow ----------------
      function nearestRoadPoint(x, y) {
        const lx = Math.round(x / BS) * BS, ly = Math.round(y / BS) * BS;
        return Math.abs(x - lx) < Math.abs(y - ly) ? [lx, y] : [x, ly];
      }
      function startDay() {
        const plan = DAYS[(day - 1) % DAYS.length];
        quota = plan.map(([t, n]) => ({ type: t, need: n + Math.floor((day - 1) / DAYS.length), got: 0 }));
        pc = { x: 3 * BS + 8, y: 3 * BS + 40, ang: Math.PI / 2, v: 0, fuel: 100, siren: false, flash: 0 };
        pc.x = 3 * BS + 8; pc.y = 3 * BS + 30;
        cars = []; peds = []; trash = []; parts = []; pops = [];
        for (let i = 0; i < 14; i++) cars.push(newCar('civ', false));
        camX = pc.x - W / 2; camY = pc.y - (H + TOP) / 2;
        apb = null; donutUsed = false; timer = (110 - Math.min(30, day * 3)) * 60; bumpCD = 0; tow = 0;
        phase = 'brief'; phaseT = 0; msg = ''; msgT = 0;
      }
      function startGame() {
        mode = 'play'; score = 0; demerits = 0; day = 1;
        startDay(); sfx.day();
      }
      function gameOver() {
        api.setHiScore(score); mode = 'over'; overT = 0;
        au.melody([[294, .25], [277, .25], [262, .25], [247, .6]], { type: 'square', vol: 0.12 });
      }
      function tryStart() {
        if (api.useCredit()) startGame();
        else { coinFlash = 90; au.tone(80, 0.25, { type: 'square', vol: 0.2 }); }
      }
      function quotaMet() { return quota.every(q => q.got >= q.need); }
      function checkFired() {
        if (demerits >= 10 && phase !== 'fired') {
          phase = 'fired'; phaseT = 0;
        }
      }
      function endDay() {
        phase = 'dayend'; phaseT = 0;
        let missed = 0; for (const q of quota) missed += Math.max(0, q.need - q.got);
        if (missed > 0) { demerits += Math.min(3, missed); sfx.demerit(); } else sfx.day();
        pc.dayMissed = missed;
      }

      function arrest(c, pts) {
        c.gone = true; sfx.arrest();
        addScore(pts, c.x - camX, c.y - camY - 10);
        burst(c.x, c.y, '#ffff60', 12);
      }

      function update() {
        if (coinFlash > 0) coinFlash = api.credits > 0 ? 0 : coinFlash - 1;
        if (mode === 'attract') {
          attractT++;
          if (api.anyPressed('Enter', 'Space')) tryStart();
          return;
        }
        if (mode === 'over') {
          overT++;
          if (overT > 300 || (overT > 60 && api.anyPressed('Enter', 'Space'))) { mode = 'attract'; attractT = 0; }
          return;
        }
        phaseT++;
        for (const q of parts) { q.x += q.vx; q.y += q.vy; q.t--; }
        parts = parts.filter(q => q.t > 0);
        for (const q of pops) { q.y -= 0.4; q.t--; }
        pops = pops.filter(q => q.t > 0);
        if (msgT > 0) msgT--;
        if (phase === 'brief') {
          for (const c of cars) moveCar(c);
          if (phaseT > 200 || (phaseT > 40 && api.anyPressed('Space', 'Enter'))) { phase = 'play'; phaseT = 0; say('GO GET EM, OFFICER BOB!', 90); }
          return;
        }
        if (phase === 'dayend') {
          if (phaseT === 1 && pc.dayMissed === 0) addScore(2000 * day + Math.floor(timer / 60) * 20);
          if (phaseT > 260 || (phaseT > 80 && api.anyPressed('Space', 'Enter'))) {
            if (demerits >= 10) { phase = 'fired'; phaseT = 0; return; }
            day++; startDay(); sfx.day();
          }
          return;
        }
        if (phase === 'fired') {
          if (phaseT === 150) {
            const end = () => gameOver();
            if (api.offerContinue) api.offerContinue(() => { demerits = 5; if (timer <= 0) { day++; startDay(); } else { phase = 'play'; phaseT = 0; } }, end);
            else end();
          }
          return;
        }
        // ---------------- play ----------------
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown');
        pc.siren = api.key('Space') || api.key('KeyX');
        if (pc.siren) { pc.flash++; sfx.siren(pc.flash); } else pc.flash = 0;
        if (tow > 0) {
          tow--;
          if (tow === 0) { pc.fuel = 100; say('TOWED TO THE GAS STATION', 90); }
        } else {
          const maxV = pc.fuel > 0 ? 2.7 : 0.5;
          if (U) pc.v = Math.min(maxV, pc.v + 0.06);
          else if (D) pc.v = Math.max(-1.1, pc.v - 0.1);
          else pc.v *= 0.985;
          if (Math.abs(pc.v) < 0.02 && !U) pc.v = 0;
          const turn = 0.05 * Math.min(1, Math.abs(pc.v) / 0.9 + 0.15) * (pc.v < 0 ? -1 : 1);
          if (L) pc.ang -= turn; if (R) pc.ang += turn;
          const nx = pc.x + Math.cos(pc.ang) * pc.v, ny = pc.y + Math.sin(pc.ang) * pc.v;
          const ca = Math.cos(pc.ang), sa = Math.sin(pc.ang);
          let ok = true;
          for (const [fx, fy] of [[7, 3], [7, -3], [-7, 3], [-7, -3]]) if (!isRoad(nx + ca * fx - sa * fy, ny + sa * fx + ca * fy)) { ok = false; break; }
          if (ok) { pc.x = nx; pc.y = ny; }
          else {
            if (Math.abs(pc.v) > 1.2 && bumpCD <= 0) { sfx.bump(); bumpCD = 20; }
            // slide along the wall if possible
            if (isRoad(nx, pc.y) && isRoad(nx + ca * 7, pc.y)) pc.x = nx; else if (isRoad(pc.x, ny) && isRoad(pc.x, ny + sa * 7)) pc.y = ny;
            pc.v *= -0.25;
          }
          pc.fuel = Math.max(0, pc.fuel - Math.abs(pc.v) * 0.0065 - 0.002);
          pc.empty = pc.fuel <= 0 ? (pc.empty || 0) + 1 : 0;
          if (pc.empty > 480 && tow === 0) {
            pc.empty = 0;
            addDemerit('OUT OF GAS'); tow = 120;
            pc.x = 1 * BS + 8; pc.y = 1 * BS + BS / 2; pc.ang = Math.PI / 2; pc.v = 0;
          }
        }
        if (bumpCD > 0) bumpCD--;
        // gas stations and donut shop: stop on the road beside them
        if (Math.abs(pc.v) < 0.3) {
          const bi = Math.floor(pc.x / BS), bj = Math.floor(pc.y / BS);
          for (const [i, j] of [[bi, bj], [bi - 1, bj], [bi, bj - 1], [bi - 1, bj - 1]]) {
            if (i < 0 || j < 0 || i >= NB || j >= NB) continue;
            const k = blockKind(i, j);
            const cx = i * BS + BS / 2, cy = j * BS + BS / 2;
            if (Math.abs(pc.x - cx) > BS / 2 + 4 || Math.abs(pc.y - cy) > BS / 2 + 4) continue;
            if (k === 'gas' && pc.fuel < 100) { pc.fuel = Math.min(100, pc.fuel + 0.6); if (api.frame % 8 === 0) sfx.fuel(); if (pc.fuel >= 100) say('TANK FULL', 60); }
            if (k === 'donut' && !donutUsed) { donutUsed = true; if (demerits > 0) { demerits--; say('DONUT BREAK! -1 DEMERIT', 120); } else { timer += 600; say('DONUT BREAK! +10 SECONDS', 120); } sfx.arrest(); }
          }
        }

        // keep the streets busy
        const needTargets = [];
        for (const q of quota) if (q.got < q.need) needTargets.push(q.type);
        for (const t of needTargets) {
          if (t === 'hitch') {
            if (peds.filter(p => p.hitch && !p.gone).length < 2) {
              const c = newCar('civ', true); const side = Math.random() < 0.5 ? 1 : -1;
              peds.push({ ax: c.ax, line: c.line, s: c.s, side: side, dir: 0, hitch: true, t: 0 });
            }
          } else if (cars.filter(c => c.type === t && !c.gone).length < 2) cars.push(newCar(t, true));
        }
        if (cars.filter(c => c.type === 'civ').length < 14) cars.push(newCar('civ', true));
        if (peds.filter(p => !p.hitch).length < 8) { const c = newCar('civ', true); peds.push({ ax: c.ax, line: c.line, s: c.s, side: Math.random() < 0.5 ? 1 : -1, dir: Math.random() < 0.5 ? 0.35 : -0.35, t: 0 }); }
        if (!apb && quotaMet()) {
          apb = newCar('apb', true); apb.name = SUSPECTS[(day - 1) % SUSPECTS.length]; cars.push(apb);
          sfx.apb(); say('APB: ' + apb.name, 180);
        }

        // traffic
        for (const c of cars) {
          moveCar(c);
          if (c.gone) continue;
          const d = Math.hypot(c.x - pc.x, c.y - pc.y);
          if (pc.siren && d < 80 && c.state === 'drive' && c.type !== 'civ' && c.type !== 'apb') {
            if (c.type === 'speeder' && Math.random() < 0.4) { c.state = 'flee'; c.t = 0; sfx.horn(); }
            else { c.state = 'pull'; sfx.pull(); }
          }
          if (d < 13) {
            if (c.type === 'apb') {
              if (pc.siren && c.hitCD <= 0) {
                c.hits++; c.hitCD = 40; sfx.bump(); burst(c.x, c.y, '#ffffff', 6);
                pops.push({ x: c.x - camX, y: c.y - camY - 10, s: 'HIT ' + c.hits + '/3', t: 40 });
                if (c.hits >= 3) { arrest(c, 5000 * Math.min(day, 6)); say('GOT ' + c.name + '!', 150); }
              }
            } else if (c.type !== 'civ' && (c.state === 'stopped' || c.state === 'pull')) {
              const q = quota.find(q => q.type === c.type && q.got < q.need);
              if (q) q.got++;
              arrest(c, TYPES[c.type].pts * Math.min(day, 5));
              if (quotaMet() && !apb) say('QUOTA MET!', 120);
            } else if (c.type === 'civ' && c.state !== 'wreck' && Math.abs(pc.v) > 0.8) {
              c.state = 'wreck'; c.t = 0; sfx.crash(); burst(c.x, c.y, '#ffa020', 14);
              addDemerit('HIT A CIVILIAN', c.x - camX, c.y - camY - 12);
              pc.v = -pc.v * 0.3;
            } else if (bumpCD <= 0) {
              sfx.bump(); bumpCD = 25; pc.v *= -0.3;
            }
            if (!c.gone && c.state !== 'wreck') { const k = (13 - d) / 13 * 2; pc.x += (pc.x - c.x) / (d || 1) * k; pc.y += (pc.y - c.y) / (d || 1) * k; if (!isRoad(pc.x, pc.y)) { pc.x -= (pc.x - c.x) / (d || 1) * k; pc.y -= (pc.y - c.y) / (d || 1) * k; } }
          }
          if (c.state === 'wreck' && c.t > 200) c.gone = true;
          if (d > 520 && c.type === 'civ') c.gone = true;
        }
        cars = cars.filter(c => !c.gone);
        if (apb && apb.gone) apb = { gone: true, caught: true };

        // pedestrians
        for (const p of peds) {
          p.t++;
          if (!p.hitch && !p.flat) { p.s += p.dir; if (Math.random() < 0.004) p.dir = -p.dir; }
          const off = p.side * 17;
          p.x = p.ax === 'h' ? p.s : p.line + off; p.y = p.ax === 'h' ? p.line + off : p.s;
          const d = Math.hypot(p.x - pc.x, p.y - pc.y);
          if (p.flat) { if (p.t > 120) p.gone = true; continue; }
          if (p.hitch) {
            if (d < 24 && pc.siren && Math.abs(pc.v) < 0.8) {
              p.gone = true; sfx.arrest(); addScore(TYPES.hitch.pts * Math.min(day, 5), p.x - camX, p.y - camY - 10);
              const q = quota.find(q => q.type === 'hitch' && q.got < q.need); if (q) q.got++;
              if (quotaMet() && !apb) say('QUOTA MET!', 120);
              continue;
            }
          }
          if (d < 7 && Math.abs(pc.v) > 0.6) { p.flat = true; p.t = 0; sfx.crash(); addDemerit('HIT A PEDESTRIAN', p.x - camX, p.y - camY - 12); }
          if (d > 520) p.gone = true;
        }
        peds = peds.filter(p => !p.gone);
        for (const t of trash) t.t--;
        trash = trash.filter(t => t.t > 0);

        // camera
        const tx = pc.x + Math.cos(pc.ang) * pc.v * 22 - W / 2, ty = pc.y + Math.sin(pc.ang) * pc.v * 22 - (H + TOP) / 2;
        camX += (tx - camX) * 0.12; camY += (ty - camY) * 0.12;

        timer--;
        if (timer <= 0) { timer = 0; endDay(); return; }
        checkFired();
      }

      // ---------------- drawing ----------------
      function drawCar(ctx, x, y, ang, body, roof, cop, siren, wreck) {
        ctx.save(); ctx.translate(Math.round(x - camX), Math.round(y - camY)); ctx.rotate(ang);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-6, -3, 14, 8);
        ctx.fillStyle = wreck ? '#404040' : body; ctx.fillRect(-7, -4, 14, 8);
        if (cop) { ctx.fillStyle = '#ffffff'; ctx.fillRect(-3, -4, 7, 8); }
        ctx.fillStyle = wreck ? '#202020' : roof; ctx.fillRect(-3, -3, 6, 6);
        ctx.fillStyle = '#80c0ff'; ctx.fillRect(2, -3, 2, 6);
        ctx.fillStyle = '#ffffa0'; ctx.fillRect(6, -3, 1, 2); ctx.fillRect(6, 1, 1, 2);
        ctx.fillStyle = '#ff2020'; ctx.fillRect(-7, -3, 1, 2); ctx.fillRect(-7, 1, 1, 2);
        if (cop) {
          const f = (api.frame >> 2) & 1;
          ctx.fillStyle = siren ? (f ? '#ff2020' : '#2040ff') : '#602020'; ctx.fillRect(-1, -3, 2, 3);
          ctx.fillStyle = siren ? (f ? '#2040ff' : '#ff2020') : '#202060'; ctx.fillRect(-1, 0, 2, 3);
        }
        ctx.restore();
      }
      function drawCity(ctx) {
        ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, W, H);
        const x0 = camX, y0 = camY;
        const i0 = Math.max(0, Math.floor(x0 / BS)), i1 = Math.min(NB - 1, Math.floor((x0 + W) / BS));
        const j0 = Math.max(0, Math.floor(y0 / BS)), j1 = Math.min(NB - 1, Math.floor((y0 + H) / BS));
        // blocks
        for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
          const bx = i * BS + RW - x0, by = j * BS + RW - y0, bw = BS - RW * 2;
          const k = blockKind(i, j);
          if (k === 'park') {
            ctx.fillStyle = '#2a7a2a'; ctx.fillRect(bx, by, bw, bw);
            for (let n = 0; n < 7; n++) { const tx = bx + 8 + hash(i, j, n) * (bw - 16), ty = by + 8 + hash(j, i, n) * (bw - 16); ctx.fillStyle = '#145014'; ctx.beginPath(); ctx.arc(tx, ty, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#30a030'; ctx.beginPath(); ctx.arc(tx - 1, ty - 1, 4, 0, Math.PI * 2); ctx.fill(); }
            ctx.fillStyle = '#c0a060'; ctx.fillRect(bx + bw / 2 - 2, by, 4, bw);
            continue;
          }
          ctx.fillStyle = '#505058'; ctx.fillRect(bx, by, bw, bw);
          if (k === 'gas' || k === 'donut' || k === 'station') {
            const col = k === 'gas' ? '#e02020' : k === 'donut' ? '#ff60c0' : '#2050c0';
            ctx.fillStyle = '#707078'; ctx.fillRect(bx + 4, by + 4, bw - 8, bw - 8);
            ctx.fillStyle = col; ctx.fillRect(bx + 10, by + 10, bw - 20, 26);
            ctx.fillStyle = '#000'; ctx.fillRect(bx + 12, by + 12, bw - 24, 22);
            text(ctx, k === 'gas' ? 'GAS' : k === 'donut' ? 'DONUTS' : 'POLICE', bx + bw / 2, by + 20, col, 1, 'center');
            if (k === 'gas') { ctx.fillStyle = '#c0c0c0'; for (let n = 0; n < 3; n++) ctx.fillRect(bx + 18 + n * 20, by + bw - 22, 6, 10); }
            if (k === 'donut') { ctx.fillStyle = '#e0a040'; ctx.beginPath(); ctx.arc(bx + bw / 2, by + 62, 14, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ff60c0'; ctx.beginPath(); ctx.arc(bx + bw / 2, by + 62, 11, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#707078'; ctx.beginPath(); ctx.arc(bx + bw / 2, by + 62, 4, 0, Math.PI * 2); ctx.fill(); }
            if (k === 'station') { for (let n = 0; n < 3; n++) { ctx.fillStyle = '#202020'; ctx.fillRect(bx + 10 + n * 24, by + 50, 14, 24); ctx.fillStyle = '#ffffff'; ctx.fillRect(bx + 13 + n * 24, by + 50, 8, 24); } }
            continue;
          }
          // buildings: 2x2 lots with roofs
          const half = bw / 2;
          for (let n = 0; n < 4; n++) {
            const lx = bx + (n & 1) * half, ly = by + (n >> 1) * half, r = hash(i, j, n);
            const roof = ['#6a5a4a', '#5a6a7a', '#7a4a4a', '#4a5a4a', '#6a6a6a', '#8a7a5a'][(r * 6) | 0];
            ctx.fillStyle = roof; ctx.fillRect(lx + 3, ly + 3, half - 6, half - 6);
            ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(lx + 3, ly + 3, half - 6, 2);
            ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(lx + 3, ly + half - 5, half - 6, 2);
            if (r > 0.5) { ctx.fillStyle = '#909090'; ctx.fillRect(lx + 10, ly + 10, 6, 6); }
            if (r < 0.3) { ctx.fillStyle = '#303030'; ctx.fillRect(lx + half - 16, ly + 12, 8, 4); }
          }
        }
        // roads
        for (let n = 0; n <= NB; n++) {
          const c = n * BS;
          const rx = c - x0, ry = c - y0;
          if (rx > -RW && rx < W + RW) {
            ctx.fillStyle = '#9a9a9a'; ctx.fillRect(rx - RW, -RW - y0, RW * 2, CITY + RW * 2);
            ctx.fillStyle = '#383840'; ctx.fillRect(rx - RW + 4, -RW - y0, RW * 2 - 8, CITY + RW * 2);
          }
          if (ry > -RW && ry < H + RW) {
            ctx.fillStyle = '#9a9a9a'; ctx.fillRect(-RW - x0, ry - RW, CITY + RW * 2, RW * 2);
            ctx.fillStyle = '#383840'; ctx.fillRect(-RW - x0, ry - RW + 4, CITY + RW * 2, RW * 2 - 8);
          }
        }
        // intersections + markings
        for (let n = 0; n <= NB; n++) {
          const c = n * BS, rx = c - x0, ry = c - y0;
          if (rx > -RW && rx < W + RW) {
            ctx.fillStyle = '#e0c040';
            const s0 = Math.floor(y0 / 16) * 16;
            for (let y = s0; y < y0 + H; y += 16) { const m = ((y % BS) + BS) % BS; if (m > RW && m < BS - RW && y > 0 && y < CITY) ctx.fillRect(rx - 1, y - y0, 2, 8); }
          }
          if (ry > -RW && ry < H + RW) {
            ctx.fillStyle = '#e0c040';
            const s0 = Math.floor(x0 / 16) * 16;
            for (let x = s0; x < x0 + W; x += 16) { const m = ((x % BS) + BS) % BS; if (m > RW && m < BS - RW && x > 0 && x < CITY) ctx.fillRect(x - x0, ry - 1, 8, 2); }
          }
        }
        for (let a = 0; a <= NB; a++) for (let b = 0; b <= NB; b++) {
          const rx = a * BS - x0, ry = b * BS - y0;
          if (rx < -RW || rx > W + RW || ry < -RW || ry > H + RW) continue;
          ctx.fillStyle = '#383840'; ctx.fillRect(rx - RW + 4, ry - RW + 4, RW * 2 - 8, RW * 2 - 8);
          ctx.fillStyle = '#d0d0d0';
          for (let k = -12; k <= 10; k += 4) { ctx.fillRect(rx + k, ry - RW + 4, 2, 4); ctx.fillRect(rx + k, ry + RW - 8, 2, 4); ctx.fillRect(rx - RW + 4, ry + k, 4, 2); ctx.fillRect(rx + RW - 8, ry + k, 4, 2); }
        }
        // city limits
        ctx.fillStyle = '#0a0a0a';
        if (-RW - x0 > 0) ctx.fillRect(0, 0, -RW - x0, H);
        if (CITY + RW - x0 < W) ctx.fillRect(CITY + RW - x0, 0, W, H);
        if (-RW - y0 > 0) ctx.fillRect(0, 0, W, -RW - y0);
        if (CITY + RW - y0 < H) ctx.fillRect(0, CITY + RW - y0, W, H);
      }
      function drawPed(ctx, p) {
        const x = Math.round(p.x - camX), y = Math.round(p.y - camY);
        if (x < -8 || x > W + 8 || y < -8 || y > H + 8) return;
        if (p.flat) { ctx.fillStyle = '#c04040'; ctx.fillRect(x - 3, y - 1, 7, 3); return; }
        const f = (p.t >> 3) & 1;
        ctx.fillStyle = p.hitch ? '#ffffff' : '#e0a060'; ctx.fillRect(x - 1, y - 4, 3, 3);
        ctx.fillStyle = p.hitch ? '#ff40ff' : '#4060c0'; ctx.fillRect(x - 2, y - 1, 5, 3);
        ctx.fillStyle = '#202020'; ctx.fillRect(x - 2 + f, y + 2, 2, 2); ctx.fillRect(x + 1 - f, y + 2, 2, 2);
        if (p.hitch && (p.t >> 4) & 1) { ctx.fillStyle = '#ffe0a0'; ctx.fillRect(x + (p.side > 0 ? -5 : 3), y - 2, 3, 2); }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, TOP);
        text(ctx, 'SCORE ' + score, 2, 2, '#ffffff');
        text(ctx, 'DAY ' + day, 2, 11, '#ffd040');
        const secs = Math.ceil(timer / 60);
        text(ctx, 'TIME ' + secs, 86, 2, secs <= 10 && (api.frame >> 3) & 1 ? '#ff4040' : '#ffffff');
        // demerits
        text(ctx, 'DEM', 86, 11, '#ff6060');
        for (let i = 0; i < 10; i++) { ctx.fillStyle = i < demerits ? '#ff2020' : '#402020'; ctx.fillRect(106 + i * 5, 12, 4, 6); }
        // fuel
        text(ctx, 'GAS', 160, 2, '#a0a0a0');
        ctx.fillStyle = '#303030'; ctx.fillRect(180, 3, 30, 5);
        ctx.fillStyle = pc.fuel < 25 && (api.frame >> 3) & 1 ? '#ff2020' : '#40e040'; ctx.fillRect(180, 3, Math.round(pc.fuel * 0.3), 5);
        // quota
        let qx = 160;
        for (const q of quota) {
          const t = TYPES[q.type];
          for (let i = 0; i < q.need; i++) { ctx.fillStyle = i < q.got ? t.col : '#303030'; ctx.fillRect(qx, 12, 4, 6); qx += 5; }
          qx += 3;
        }
        // radar
        const rx = W - 40, ry = TOP + 2, rs = 38;
        ctx.fillStyle = 'rgba(0,20,0,0.75)'; ctx.fillRect(rx, ry, rs, rs);
        ctx.fillStyle = '#204020';
        for (let n = 0; n <= NB; n++) { const k = Math.round(n * BS / CITY * (rs - 1)); ctx.fillRect(rx + k, ry, 1, rs); ctx.fillRect(rx, ry + k, rs, 1); }
        const blip = (x, y, col) => { ctx.fillStyle = col; ctx.fillRect(rx + Math.round(x / CITY * (rs - 1)) - 1, ry + Math.round(y / CITY * (rs - 1)) - 1, 2, 2); };
        if ((api.frame >> 3) & 1) {
          for (const c of cars) if (c.type !== 'civ') blip(c.x, c.y, c.type === 'apb' ? '#ff40ff' : TYPES[c.type].col);
          for (const p of peds) if (p.hitch) blip(p.x, p.y, '#ffffff');
        }
        blip(pc.x, pc.y, '#40a0ff');
      }
      function drawPlay(ctx) {
        drawCity(ctx);
        for (const t of trash) { const x = Math.round(t.x - camX), y = Math.round(t.y - camY); if (x < -4 || x > W || y < -4 || y > H) continue; ctx.fillStyle = ['#ffffff', '#e0e060', '#c08040'][t.k]; ctx.fillRect(x, y, 2, 2); }
        for (const p of peds) drawPed(ctx, p);
        for (const c of cars) {
          const x = c.x - camX, y = c.y - camY; if (x < -12 || x > W + 12 || y < -12 || y > H + 12) continue;
          drawCar(ctx, c.x, c.y, c.ang, c.col[0], c.col[1], false, false, c.state === 'wreck');
          if (c.type !== 'civ' && (api.frame >> 3) & 1) { ctx.strokeStyle = c.type === 'apb' ? '#ff40ff' : '#ffff40'; ctx.lineWidth = 1; ctx.strokeRect(Math.round(x) - 9.5, Math.round(y) - 9.5, 19, 19); }
          if (c.state === 'stopped' && (api.frame >> 4) & 1) text(ctx, '!', x - 2, y - 16, '#ffffff');
        }
        if (!(tow > 0 && (api.frame >> 2) & 1)) drawCar(ctx, pc.x, pc.y, pc.ang, '#101010', '#101010', true, pc.siren, false);
        for (const q of parts) { ctx.fillStyle = q.c; ctx.fillRect(Math.round(q.x - camX), Math.round(q.y - camY), 2, 2); }
        for (const q of pops) text(ctx, q.s, q.x | 0, q.y | 0, '#ffffff', 1, 'center');
        drawHUD(ctx);
        if (msgT > 0 && msg) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, H - 16, W, 12); text(ctx, msg, W / 2, H - 14, '#ffff60', 1, 'center'); }
      }
      function drawChief(ctx, x, y) {
        ctx.fillStyle = '#e0a070'; ctx.fillRect(x + 6, y + 8, 20, 22);
        ctx.fillStyle = '#203080'; ctx.fillRect(x + 2, y, 28, 10); ctx.fillRect(x, y + 8, 32, 4);
        ctx.fillStyle = '#ffd040'; ctx.fillRect(x + 14, y + 3, 4, 4);
        ctx.fillStyle = '#000'; ctx.fillRect(x + 10, y + 15, 4, 3); ctx.fillRect(x + 19, y + 15, 4, 3);
        ctx.fillStyle = '#802020'; ctx.fillRect(x + 11, y + 24, 10, 2);
        ctx.fillStyle = '#203080'; ctx.fillRect(x, y + 30, 32, 14);
        ctx.fillStyle = '#ffd040'; ctx.fillRect(x + 20, y + 33, 4, 4);
      }
      function drawBrief(ctx) {
        ctx.fillStyle = 'rgba(0,0,30,0.85)'; ctx.fillRect(16, 40, W - 32, 150);
        ctx.strokeStyle = '#ffd040'; ctx.lineWidth = 1; ctx.strokeRect(16.5, 40.5, W - 33, 149);
        drawChief(ctx, 26, 52);
        text(ctx, 'DAY ' + day, 70, 52, '#ffd040', 2);
        text(ctx, "CHIEF'S ORDERS:", 70, 72, '#ffffff');
        let y = 104;
        text(ctx, 'TODAY YOUR QUOTA IS', W / 2, 92, '#c0c0ff', 1, 'center');
        for (const q of quota) { text(ctx, q.need + ' ' + TYPES[q.type].name, W / 2, y, TYPES[q.type].col, 1, 'center'); y += 11; }
        text(ctx, 'HOLD SIREN NEAR A SUSPECT', W / 2, y + 6, '#a0a0a0', 1, 'center');
        text(ctx, 'THEN BUMP THEM TO ARREST', W / 2, y + 16, '#a0a0a0', 1, 'center');
        text(ctx, '10 DEMERITS AND YOU ARE FIRED', W / 2, y + 30, '#ff6060', 1, 'center');
      }
      function drawDayEnd(ctx) {
        ctx.fillStyle = 'rgba(0,0,30,0.85)'; ctx.fillRect(16, 50, W - 32, 120);
        drawChief(ctx, 26, 60);
        text(ctx, 'END OF DAY ' + day, 70, 62, '#ffd040');
        let y = 84;
        for (const q of quota) { text(ctx, TYPES[q.type].name + ' ' + q.got + '/' + q.need, 70, y, q.got >= q.need ? '#40ff40' : '#ff6060'); y += 10; }
        if (pc.dayMissed === 0) text(ctx, 'NICE WORK, BOB.', W / 2, 140, '#ffffff', 1, 'center');
        else text(ctx, 'QUOTA MISSED: +' + Math.min(3, pc.dayMissed) + ' DEMERITS', W / 2, 140, '#ff6060', 1, 'center');
        if (apb && apb.caught) text(ctx, 'APB SUSPECT CAPTURED!', W / 2, 152, '#ff80ff', 1, 'center');
      }
      function drawAttract(ctx) {
        ctx.fillStyle = '#101830'; ctx.fillRect(0, 0, W, H);
        const t = attractT;
        // a little patrol scene
        ctx.fillStyle = '#383840'; ctx.fillRect(0, 150, W, 40);
        ctx.fillStyle = '#e0c040'; for (let x = -(t * 2 % 16); x < W; x += 16) ctx.fillRect(x, 169, 8, 2);
        ctx.fillStyle = '#9a9a9a'; ctx.fillRect(0, 146, W, 4); ctx.fillRect(0, 190, W, 4);
        const sx = (t * 1.6) % (W + 120) - 60;
        camX = 0; camY = 0;
        drawCar(ctx, sx, 162, 0, CIV[0][0], CIV[0][1], false, false, false);
        drawCar(ctx, sx - 40, 162, 0, '#101010', '#101010', true, true, false);
        text(ctx, 'APB', W / 2 + 3, 23, '#800000', 6, 'center');
        text(ctx, 'APB', W / 2, 20, '#ffffff', 6, 'center');
        text(ctx, 'ALL POINTS BULLETIN', W / 2, 70, '#ffd040', 1, 'center');
        text(ctx, 'OFFICER BOB REPORTING FOR DUTY', W / 2, 86, '#c0c0ff', 1, 'center');
        text(ctx, 'LITTERBUG 500  SPEEDER 800', W / 2, 104, '#ffffff', 1, 'center');
        text(ctx, 'DRUNK DRIVER 1000  APB 5000', W / 2, 114, '#ffffff', 1, 'center');
        text(ctx, 'HI ' + hi, W / 2, 4, '#ffd040', 1, 'center');
        const blink = (api.frame >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 204, '#ffffff', 1, 'center'); }
        else if (api.credits > 0) { if (blink) text(ctx, 'PUSH START', W / 2, 204, '#ffffff', 1, 'center'); }
        else if (blink) text(ctx, 'INSERT COIN', W / 2, 204, '#ffffff', 1, 'center');
        text(ctx, '\u00a9 1987 ATARI GAMES', W / 2, 218, '#808080', 1, 'center');
        text(ctx, 'CREDIT ' + pad2(Math.min(99, api.credits)), 4, H - 9, '#a0a0a0');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'attract') { drawAttract(ctx); return; }
        drawPlay(ctx);
        if (phase === 'brief') drawBrief(ctx);
        if (phase === 'dayend') drawDayEnd(ctx);
        if (phase === 'fired' || mode === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(30, 80, W - 60, 60);
          text(ctx, "YOU'RE FIRED!", W / 2, 90, '#ff4040', 2, 'center');
          text(ctx, 'TURN IN YOUR BADGE', W / 2, 114, '#ffffff', 1, 'center');
          if (mode === 'over') text(ctx, 'GAME OVER', W / 2, 126, '#ffd040', 1, 'center');
        }
      }
      return { update, render };
    }
  });
})();
