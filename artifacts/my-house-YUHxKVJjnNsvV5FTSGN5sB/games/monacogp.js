// Monaco GP (Sega, 1979) -- from-scratch recreation: top-down Grand Prix with timed play, extended play,
// bridges, ice, tunnels, forks and the ambulance.
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

  const W = 224, H = 256, TOP = 18, PY = 206;
  const EXT = 2000, TIME0 = 90;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = (a, b) => a + Math.random() * (b - a);

  const CAR = [
    '.TT...TT.',
    '.TTAAATT.',
    '...RRR...',
    '...RWR...',
    '...RWR...',
    '..RRWRR..',
    '.RRRBRRR.',
    'TTRRBRRTT',
    'TTRRRRRTT',
    'TT.RRR.TT',
    '...RRR...',
    '.AAAAAAA.',
    '.L.....L.'];
  const mkCar = (body, acc) => spr(CAR, { T: '#141414', A: acc, R: body, W: '#ffffff', B: '#20208a', L: '#ff3030' });
  const PLAYER = mkCar('#ff2a2a', '#ffffff');
  const RIVALS = [['#2a6aff', '#ffffff'], ['#ffd800', '#202020'], ['#20d040', '#ffffff'], ['#d040ff', '#ffffff'],
    ['#ff8a10', '#202020'], ['#20e0e0', '#202020'], ['#f0f0f0', '#ff2020']].map(c => mkCar(c[0], c[1]));
  const AMB = [
    '.WWWWWWWW.',
    'WWWWWWWWWW',
    'WGGGGGGGGW',
    'WGGGGGGGGW',
    'WWWWWWWWWW',
    'WWWWRRWWWW',
    'WWWWRRWWWW',
    'WWRRRRRRWW',
    'WWRRRRRRWW',
    'WWWWRRWWWW',
    'WWWWRRWWWW',
    'WWWWWWWWWW',
    'WWWWWWWWWW',
    'WWWWWWWWWW',
    'WWWWWWWWWW',
    'LWWWWWWWWL'];
  const AMB_A = spr(AMB, { W: '#f4f4f4', G: '#3a4a6a', R: '#ff2020', L: '#ff4040' });
  const LIGHT_R = spr(['RR', 'RR'], { R: '#ff2020' }), LIGHT_B = spr(['BB', 'BB'], { B: '#30a0ff' });
  const TREE = [spr([
    '...GGG...',
    '..GGgGG..',
    '.GGgGGGG.',
    'GGGGGgGGG',
    'GgGGGGGgG',
    'GGGgGGGGG',
    '.GGGGgGG.',
    '..GGGGG..',
    '....B....',
    '....B....'], { G: '#0e6a14', g: '#3ab83a', B: '#6a3a10' }), spr([
    '..YYYY...',
    '.YYyYYY..',
    'YYYYYyYY.',
    'YyYYYYYY.',
    '.YYYyYY..',
    '..YYYY...',
    '...BB....',
    '...BB....'], { Y: '#c8a018', y: '#ffe060', B: '#6a3a10' })];
  const FLAG = spr(['WBWBWB', 'BWBWBW', 'WBWBWB', 'BWBWBW'], { W: '#ffffff', B: '#000000' });

  ArcadeRegistry.register({
    id: 'monacogp', title: 'Monaco GP', year: 1979, maker: 'Sega',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Left/Right: steer \u00b7 Up: gas \u00b7 Down: brake \u00b7 Space/X: shift LOW/HI \u00b7 Enter: start',
    marquee: { bg: '#0b3a10', fg: '#ffffff', accent: '#ff2a2a' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(3000);
      let mode = 'title', frame = 0, coinFlash = 0, attractT = 0;
      let g = null;

      // ---------------- track generator ----------------
      function newTrack() {
        return { rows: new Map(), genR: -90, minR: -89, cx: 112, tcx: 112, hw: 46, thw: 46, island: 0, tisland: 0,
          q: [], zone: 'normal', zl: 420, straight: false, bendT: 120, zoneN: 0 };
      }
      function queueZones(tr) {
        const n = tr.zoneN++, lvl = Math.min(6, n >> 1);
        const opts = ['bridge', 'ice', 'tunnel', 'fork', 'narrow', 'bridge', 'tunnel'];
        const pick = opts[(Math.random() * opts.length) | 0];
        tr.q.push({ z: 'normal', len: 380 + Math.random() * 420 - lvl * 30, thw: 40 + ((Math.random() * 12) | 0) });
        if (pick === 'bridge') tr.q.push({ z: 'normal', len: 140, thw: 30, straight: true }, { z: 'bridge', len: 380 + lvl * 60, thw: 30, straight: true }, { z: 'normal', len: 40, thw: 30, straight: true });
        else if (pick === 'ice') tr.q.push({ z: 'ice', len: 480 + lvl * 60, thw: 44 });
        else if (pick === 'tunnel') tr.q.push({ z: 'normal', len: 70, thw: 38, straight: true }, { z: 'tunnel', len: 560 + lvl * 80, thw: 38 }, { z: 'normal', len: 40, thw: 38 });
        else if (pick === 'fork') tr.q.push({ z: 'normal', len: 120, thw: 62 }, { z: 'fork', len: 620, thw: 62, island: 22 }, { z: 'normal', len: 110, thw: 62 });
        else tr.q.push({ z: 'normal', len: 460 + lvl * 40, thw: 26 });
      }
      function genRow(tr) {
        if (--tr.zl <= 0) {
          if (!tr.q.length) queueZones(tr);
          const z = tr.q.shift();
          tr.zone = z.z; tr.zl = z.len | 0; tr.thw = z.thw; tr.straight = !!z.straight; tr.tisland = z.island || 0;
        }
        if (!tr.straight) {
          if (--tr.bendT <= 0) { tr.bendT = 70 + Math.random() * 190; tr.tcx = rnd(tr.thw + 22, W - tr.thw - 22); }
          tr.cx += clamp(tr.tcx - tr.cx, -0.42, 0.42);
        }
        tr.hw += clamp(tr.thw - tr.hw, -0.2, 0.2);
        tr.cx = clamp(tr.cx, tr.hw + 14, W - tr.hw - 14);
        const isl = tr.zone === 'fork' && tr.zl > 95 ? tr.tisland : 0;
        tr.island += clamp(isl - tr.island, -0.25, 0.25);
        const r = ++tr.genR;
        const row = { cx: tr.cx, hw: tr.hw, island: tr.island, zone: tr.zone, tree: -1, tcol: 0 };
        if (r % 9 === 0 && tr.zone !== 'bridge' && tr.zone !== 'tunnel' && Math.random() < 0.6) {
          const left = Math.random() < 0.5;
          const x = left ? rnd(4, tr.cx - tr.hw - 12) : rnd(tr.cx + tr.hw + 12, W - 4);
          if (x > 3 && x < W - 3 && (left ? x < tr.cx - tr.hw - 10 : x > tr.cx + tr.hw + 10)) row.tree = x;
          row.tcol = tr.zone === 'ice' ? 2 : Math.random() < 0.3 ? 1 : 0;
        }
        tr.rows.set(r, row);
      }
      function rowAt(wy) {
        const tr = g.tr; wy = Math.floor(wy);
        while (tr.genR < wy) genRow(tr);
        if (wy < tr.minR) wy = tr.minR;
        return tr.rows.get(wy);
      }
      function pruneTrack() {
        const tr = g.tr, lim = Math.floor(g.dist) - 90;
        while (tr.minR < lim) { tr.rows.delete(tr.minR); tr.minR++; }
      }
      function surface(row, x) {
        const d = Math.abs(x - row.cx);
        if (row.zone === 'bridge' && d > row.hw + 1) return 'water';
        if (d > row.hw - 2) return 'grass';
        if (row.island >= 1 && d < row.island + 2) return 'grass';
        return 'road';
      }

      // ---------------- sounds ----------------
      const sfx = {
        crash() { au.noise(0.7, { freq: 2400, slideTo: 120, vol: 0.3 }); au.tone(180, 0.5, { type: 'sawtooth', slideTo: 40, vol: 0.12 }); },
        splash() { au.noise(0.9, { freq: 900, slideTo: 200, vol: 0.28, type: 'bandpass' }); au.tone(400, 0.6, { type: 'sine', slideTo: 80, vol: 0.1 }); },
        shift(hiG) { au.tone(hiG ? 520 : 300, 0.06, { type: 'square', vol: 0.08 }); },
        pass() { au.tone(1320, 0.05, { type: 'square', vol: 0.06 }); },
        beep() { au.tone(440, 0.18, { type: 'square', vol: 0.12 }); },
        go() { au.tone(880, 0.4, { type: 'square', vol: 0.14 }); },
        skid() { au.noise(0.12, { freq: 3500, vol: 0.06, type: 'highpass' }); },
        rumble() { au.noise(0.07, { freq: 300, vol: 0.08 }); },
        extend() { au.melody([[523, .1], [659, .1], [784, .1], [1047, .1], [784, .1], [1047, .3]], { type: 'square', vol: 0.12 }); },
        car() { au.melody([[1047, .08], [1319, .08], [1568, .16]], { type: 'square', vol: 0.1 }); },
        over() { au.melody([[392, .2], [349, .2], [330, .2], [262, .5]], { type: 'square', vol: 0.12 }); }
      };

      // ---------------- game ----------------
      function newGame(demo) {
        g = { demo, tr: newTrack(), dist: 0, score: 0, time: TIME0, ext: false, cars: 0, nextCar: 0,
          p: { x: 112, vx: 0, sp: 0, gear: 0, crash: 0, inv: 0, ang: 0, cext: false, kind: '' },
          rivals: [], parts: [], pops: [], spawnT: 90, ambT: 1500 + Math.random() * 900, msg: '', msgT: 0,
          startT: demo ? 0 : 200, over: 0, engT: 0, sirenT: 0, demoT: 0, passed: 0 };
        rowAt(H + 20);
        g.p.x = rowAt(pwy()).cx;
      }
      const pwy = () => g.dist + H - PY;
      const level = () => Math.min(9, (g.dist / 9000) | 0);
      function message(m, t) { g.msg = m; g.msgT = t || 150; }
      function addScore(n) {
        if (g.demo) return;
        g.score += n;
        if (g.ext && g.score >= g.nextCar) { g.cars++; g.nextCar += 3000; sfx.car(); message('BONUS CAR', 120); }
        if (g.score > hi) hi = Math.floor(g.score);
      }

      function spawnRival(amb) {
        const lv = level(), p = g.p;
        let sp, wy;
        if (amb) { sp = Math.max(p.sp + 110, 250); wy = g.dist - 30; }
        else {
          sp = rnd(105, 185) + lv * 7;
          if (p.sp > sp + 15 || p.sp < 30) wy = g.dist + H + 24;
          else { sp = Math.max(sp, p.sp + 40); wy = g.dist - 26; }
        }
        const row = rowAt(wy);
        let off;
        if (amb) off = p.x - rowAt(pwy()).cx;
        else if (row.island > 1) { const s = Math.random() < 0.5 ? -1 : 1; off = s * (row.island + (row.hw - row.island) / 2); }
        else off = rnd(-row.hw + 8, row.hw - 8);
        for (const r of g.rivals) if (Math.abs(r.wy - wy) < 34 && Math.abs(r.off - off) < 16) { if (!amb) return; }
        g.rivals.push({ wy, off, x: row.cx + off, sp, base: sp, amb: !!amb, crash: 0, ang: 0, t: 0, ph: Math.random() * 6,
          weave: !amb && Math.random() < 0.25 + lv * 0.06 ? rnd(14, 26) : 0, spr: RIVALS[(Math.random() * RIVALS.length) | 0], ahead: wy > pwy() });
        if (amb) { message('AMBULANCE!', 150); }
      }

      function crashPlayer(kind) {
        const p = g.p;
        if (p.crash) return;
        p.crash = 100; p.cext = g.ext; p.kind = kind; p.vx = 0;
        if (kind === 'water') sfx.splash(); else sfx.crash();
        burst(p.x, pwy(), kind === 'water' ? ['#ffffff', '#80c0ff', '#2060ff'] : ['#ffffff', '#ffe000', '#ff4020', '#ff2a2a']);
      }
      function burst(x, wy, cols) {
        for (let i = 0; i < 26; i++) {
          const a = Math.random() * Math.PI * 2, s = rnd(20, 90);
          g.parts.push({ x, wy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: rnd(30, 60), c: cols[i % cols.length] });
        }
      }
      function respawn() {
        const p = g.p, row = rowAt(pwy());
        p.x = row.island > 1 ? row.cx - (row.island + row.hw) / 2 : row.cx;
        p.vx = 0; p.sp = 0; p.ang = 0; p.inv = 130; p.gear = 0;
        g.rivals = g.rivals.filter(r => Math.abs(r.wy - pwy()) > 80);
      }
      function afterCrash() {
        if (g.demo) { mode = 'title'; attractT = 0; g = null; return; }
        if (g.p.cext) {
          if (g.cars <= 0) { lastLife(() => { g.cars = 2; respawn(); }); return; }
          g.cars--;
        }
        respawn();
      }
      function lastLife(onContinue) {
        const cg = g;
        if (!api.offerContinue) { gameOver(); return; }
        api.offerContinue(() => { if (g === cg) onContinue(); }, () => { if (g === cg) gameOver(); });
      }
      function gameOver() {
        api.setHiScore(Math.floor(g.score));
        g.over = 300; sfx.over(); message('GAME OVER', 300);
      }

      function autopilot(p) {
        const row = rowAt(pwy() + 6), ahead = rowAt(pwy() + 30);
        const cands = ahead.island > 1 ? [-(ahead.island + ahead.hw) / 2, (ahead.island + ahead.hw) / 2] : [-ahead.hw * 0.5, 0, ahead.hw * 0.5];
        let best = 0, bs = -1e9;
        for (const o of cands) {
          let s = -Math.abs(ahead.cx + o - p.x) * 0.3;
          for (const r of g.rivals) { const d = r.wy - pwy(); if (d > -24 && d < 120 && Math.abs(r.x - (ahead.cx + o)) < 15) s -= 200 - d; }
          if (s > bs) { bs = s; best = o; }
        }
        const tx = ahead.cx + best;
        return { L: p.x > tx + 2, R: p.x < tx - 2, U: true, D: false, shift: (p.gear === 0 && p.sp > 145) || (row.zone === 'ice' && p.gear === 1 && p.sp > 200) };
      }

      function updPlay(dt) {
        const p = g.p;
        if (g.msgT > 0) g.msgT--;
        if (g.over > 0) { if (--g.over <= 0 || (g.over < 200 && api.anyPressed('Enter'))) { mode = 'title'; attractT = 0; g = null; } return; }
        if (g.startT > 0) {
          g.startT--;
          if (g.startT === 160 || g.startT === 120 || g.startT === 80) sfx.beep();
          if (g.startT === 40) sfx.go();
          if (g.startT > 40) return;
        }
        let inp;
        if (g.demo) { inp = autopilot(p); if (++g.demoT > 1200) { mode = 'title'; attractT = 0; g = null; return; } }
        else inp = { L: api.key('ArrowLeft'), R: api.key('ArrowRight'), U: api.key('ArrowUp'), D: api.key('ArrowDown'),
          shift: api.anyPressed('Space', 'KeyX', 'KeyZ') };
        const row = rowAt(pwy());
        if (p.crash > 0) {
          p.crash--; p.ang += 0.35 * (p.crash / 100); p.sp = Math.max(0, p.sp - 420 * dt);
          if (p.crash === 0) { afterCrash(); if (!g) return; }
        } else {
          if (inp.shift) { p.gear ^= 1; sfx.shift(p.gear); }
          const max = p.gear ? 290 : 160;
          if (inp.U) { const acc = p.gear ? (p.sp < 100 ? 38 : 92) : 150; if (p.sp < max) p.sp = Math.min(max, p.sp + acc * dt); }
          else p.sp = Math.max(0, p.sp - 45 * dt);
          if (p.sp > max) p.sp = Math.max(max, p.sp - 150 * dt);
          if (inp.D) p.sp = Math.max(0, p.sp - 300 * dt);
          const steer = (inp.R ? 1 : 0) - (inp.L ? 1 : 0);
          const slick = row.zone === 'ice';
          const tv = steer * (38 + p.sp * 0.3) * (p.sp > 4 ? 1 : 0.25);
          p.vx += (tv - p.vx) * (slick ? 0.03 : 0.32);
          if (slick && steer && p.sp > 110 && frame % 9 === 0) sfx.skid();
          p.x = clamp(p.x + p.vx * dt, 5, W - 5);
          const s = surface(row, p.x);
          if (s === 'water') crashPlayer('water');
          else if (s === 'grass') {
            if (p.sp > 70) p.sp = Math.max(70, p.sp - 280 * dt);
            if (frame % 6 === 0) sfx.rumble();
          }
          // trees
          if (!p.crash && p.inv === 0) for (let k = -6; k <= 9; k++) {
            const r = rowAt(pwy() + k);
            if (r.tree >= 0 && Math.abs(r.tree - p.x) < 6) { crashPlayer('tree'); break; }
          }
          if (p.inv > 0) p.inv--;
        }
        g.dist += p.sp * dt;
        if (!p.crash) addScore(p.sp * dt / 10);
        pruneTrack();

        // timer and extended play
        if (!g.ext && !g.demo) {
          g.time -= dt;
          if (g.time <= 0) {
            g.time = 0;
            if (g.score >= EXT) {
              g.ext = true; g.cars = 2; g.nextCar = (Math.floor(g.score / 3000) + 1) * 3000;
              message('EXTENDED PLAY', 200); sfx.extend();
            } else {
              lastLife(() => { g.time = 60; message('TIME EXTENDED', 120); });
              return;
            }
          }
        }

        // rivals
        const lv = level();
        if (--g.spawnT <= 0) {
          g.spawnT = Math.max(22, 100 - lv * 9) + Math.random() * 60;
          if (g.rivals.filter(r => !r.amb).length < 3 + Math.min(4, lv)) spawnRival(false);
        }
        if (!g.demo && g.dist > 6000 && --g.ambT <= 0) { g.ambT = 1500 + Math.random() * 1200 - lv * 60; if (p.sp > 20) spawnRival(true); else g.ambT = 200; }
        const pw = pwy();
        let siren = false;
        for (const r of g.rivals) {
          r.wy += r.sp * dt;
          const rr = rowAt(r.wy);
          if (r.crash) { if (--r.crash === 0) r.dead = true; r.ang += 0.3; r.sp = Math.max(0, r.sp - 300 * dt); continue; }
          r.t += dt;
          if (r.weave) r.off += Math.cos(r.t * 1.7 + r.ph) * r.weave * dt;
          if (!r.amb) {
            r.sp += (r.base - r.sp) * 0.01;
            for (const o of g.rivals) {
              if (o === r || o.crash) continue;
              const d = o.wy - r.wy;
              if (d > 0 && d < 30 && Math.abs(o.off - r.off) < 13 && o.sp < r.sp) r.sp = o.sp;
            }
          }
          const lim = rr.hw - 6;
          if (rr.island > 1) { const sd = r.off < 0 ? -1 : 1; r.off = sd * clamp(Math.abs(r.off), rr.island + 6, Math.max(rr.island + 6, lim)); }
          else r.off = clamp(r.off, -lim, lim);
          r.x = rr.cx + r.off;
          if (r.amb) siren = true;
          // passing
          const ahead = r.wy > pw;
          if (r.ahead && !ahead && !p.crash && !r.amb) { addScore(30); g.passed++; if (!g.demo) sfx.pass(); }
          r.ahead = ahead;
          // collision
          if (!p.crash && p.inv === 0 && Math.abs(r.x - p.x) < 8 && Math.abs(r.wy - pw) < (r.amb ? 15 : 13)) {
            crashPlayer('car'); r.crash = 60; r.sp *= 0.5;
          }
        }
        g.rivals = g.rivals.filter(r => { const sy = H - (r.wy - g.dist); return sy < H + 60 && sy > -70 && !r.dead; });
        if (siren && !g.demo && ++g.sirenT % 16 === 0) au.tone((g.sirenT >> 4) & 1 ? 950 : 720, 0.14, { type: 'square', vol: 0.07 });

        for (const q of g.parts) { q.x += q.vx * dt; q.wy -= q.vy * dt; q.vx *= 0.96; q.vy *= 0.96; q.t--; }
        g.parts = g.parts.filter(q => q.t > 0);

        // engine
        if (!g.demo && ++g.engT % 5 === 0 && !p.crash) au.tone(55 + p.sp * (p.gear ? 0.55 : 0.9), 0.1, { type: 'sawtooth', vol: 0.035 });
      }

      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; au.tone(98, 0.25, { type: 'square', vol: 0.12 });
        return false;
      }

      function update(dt) {
        frame++; if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          attractT++;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(false); return; }
          if (attractT > 480) { mode = 'demo'; newGame(true); }
          return;
        }
        if (mode === 'demo') {
          if (api.anyPressed('Enter', 'Space')) { mode = 'title'; attractT = 0; g = null; return; }
          updPlay(dt); return;
        }
        updPlay(dt);
      }

      // ---------------- rendering ----------------
      function drawRoad(ctx) {
        const base = Math.floor(g.dist);
        for (let sy = TOP; sy < H; sy++) {
          const wy = base + H - sy, row = rowAt(wy), z = row.zone;
          let grass = ((wy >> 4) & 1) ? '#2a8a22' : '#25801e', road = '#6a6a6a', eA = '#ffffff', eB = '#e02020';
          if (z === 'bridge') grass = '#1a48c8';
          else if (z === 'ice') { grass = '#e6f2ff'; road = '#b8d8f0'; eA = '#ffffff'; eB = '#2060ff'; }
          else if (z === 'tunnel') { grass = (wy % 24) < 2 ? '#585858' : '#303030'; road = '#1c1c1c'; eA = '#505050'; eB = '#404040'; }
          ctx.fillStyle = grass; ctx.fillRect(0, sy, W, 1);
          if (z === 'bridge' && (wy * 37 % 13) === 0) { ctx.fillStyle = '#90c0ff'; ctx.fillRect((wy * 53) % W, sy, 5, 1); ctx.fillRect((wy * 97 + 40) % W, sy, 3, 1); }
          const l = Math.round(row.cx - row.hw), r = Math.round(row.cx + row.hw);
          ctx.fillStyle = road; ctx.fillRect(l, sy, r - l, 1);
          ctx.fillStyle = z === 'bridge' ? ((wy % 8) < 2 ? '#e0e0e0' : '#9a6030') : (((wy >> 3) & 1) ? eA : eB);
          ctx.fillRect(l - 2, sy, 2, 1); ctx.fillRect(r, sy, 2, 1);
          if (z === 'tunnel' && wy % 24 === 0) { ctx.fillStyle = '#ffe080'; ctx.fillRect(l - 6, sy, 3, 2); ctx.fillRect(r + 3, sy, 3, 2); }
          if (row.island >= 1) {
            const il = Math.round(row.cx - row.island), ir = Math.round(row.cx + row.island);
            ctx.fillStyle = '#2a8a22'; ctx.fillRect(il, sy, ir - il, 1);
            ctx.fillStyle = ((wy >> 3) & 1) ? eA : eB; ctx.fillRect(il, sy, 1, 1); ctx.fillRect(ir - 1, sy, 1, 1);
          } else if (((wy >> 3) % 3) === 0 && z !== 'tunnel') { ctx.fillStyle = z === 'ice' ? '#ffffff' : '#e8e8e8'; ctx.fillRect(Math.round(row.cx), sy, 1, 1); }
          if (row.tree >= 0) ctx.drawImage(TREE[row.tcol === 1 ? 1 : 0], Math.round(row.tree - 4), sy - 9);
        }
      }
      function inLight(x, sy) {
        const dy = PY - 6 - sy; if (dy < 0) return dy > -20 && Math.abs(x - g.p.x) < 10;
        return dy < 100 && Math.abs(x - g.p.x) < 6 + dy * 0.3;
      }
      function drawCar(ctx, im, x, sy, ang) {
        if (ang) {
          ctx.save(); ctx.translate(Math.round(x), Math.round(sy)); ctx.rotate(ang);
          ctx.drawImage(im, -Math.floor(im.width / 2), -Math.floor(im.height / 2)); ctx.restore();
        } else ctx.drawImage(im, Math.round(x - im.width / 2), Math.round(sy - im.height / 2));
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, TOP);
        ctx.fillStyle = '#ff2a2a'; ctx.fillRect(0, TOP - 1, W, 1);
        const sc = g ? Math.floor(g.score) : 0;
        text(ctx, 'SCORE', 2, 1, '#ffd800'); text(ctx, String(sc).padStart(5, '0'), 34, 1, '#ffffff');
        text(ctx, 'HI', 156, 1, '#ffd800'); text(ctx, String(Math.floor(hi)).padStart(5, '0'), 170, 1, '#ffffff');
        if (!g) return;
        if (!g.ext) {
          const t = Math.ceil(g.time);
          text(ctx, 'TIME', 82, 1, '#ffd800');
          text(ctx, String(t).padStart(2, '0'), 110, 1, t <= 10 && (frame >> 3) & 1 ? '#ff2020' : '#ffffff');
        } else {
          text(ctx, 'CARS', 82, 1, '#ffd800');
          for (let i = 0; i < Math.min(5, g.cars); i++) { ctx.fillStyle = '#ff2a2a'; ctx.fillRect(110 + i * 7, 2, 5, 6); ctx.fillStyle = '#111'; ctx.fillRect(110 + i * 7, 3, 1, 2); ctx.fillRect(114 + i * 7, 3, 1, 2); }
        }
        const kmh = Math.round(g.p.sp * 0.9);
        text(ctx, 'KM/H', 2, 10, '#80c0ff'); text(ctx, String(kmh).padStart(3, ' '), 30, 10, '#ffffff');
        ctx.fillStyle = '#203040'; ctx.fillRect(52, 11, 80, 5);
        ctx.fillStyle = kmh > 220 ? '#ff4020' : kmh > 140 ? '#ffd800' : '#30e040'; ctx.fillRect(52, 11, Math.min(80, kmh * 80 / 270), 5);
        text(ctx, g.p.gear ? 'HI' : 'LOW', 140, 10, g.p.gear ? '#ff6060' : '#60ff60');
        if (!g.ext) text(ctx, 'EXT ' + EXT, 166, 10, g.score >= EXT ? '#60ff60' : '#808080');
      }
      function drawGame(ctx) {
        drawRoad(ctx);
        const tunnel = rowAt(pwy()).zone === 'tunnel' || rowAt(pwy() + 60).zone === 'tunnel';
        for (const r of g.rivals) {
          const sy = H - (r.wy - g.dist);
          if (sy < TOP - 10) continue;
          const dark = rowAt(r.wy).zone === 'tunnel' && !inLight(r.x, sy);
          if (dark) { ctx.fillStyle = '#ff2020'; ctx.fillRect(Math.round(r.x - 3), Math.round(sy + 5), 2, 1); ctx.fillRect(Math.round(r.x + 2), Math.round(sy + 5), 2, 1); continue; }
          drawCar(ctx, r.amb ? AMB_A : r.spr, r.x, sy, r.ang);
          if (r.amb) { const f = (frame >> 3) & 1; ctx.drawImage(f ? LIGHT_R : LIGHT_B, Math.round(r.x - 4), Math.round(sy - 8)); ctx.drawImage(f ? LIGHT_B : LIGHT_R, Math.round(r.x + 2), Math.round(sy - 8)); }
        }
        const p = g.p;
        if (tunnel && !p.crash) {
          ctx.fillStyle = 'rgba(255,240,150,0.18)';
          ctx.beginPath(); ctx.moveTo(p.x - 3, PY - 6); ctx.lineTo(p.x - 36, PY - 106); ctx.lineTo(p.x + 36, PY - 106); ctx.lineTo(p.x + 3, PY - 6); ctx.closePath(); ctx.fill();
        }
        if (!(p.inv > 0 && (frame >> 2) & 1) && !(p.crash && p.kind === 'water' && p.crash < 70)) drawCar(ctx, PLAYER, p.x, PY, p.ang);
        for (const q of g.parts) { ctx.fillStyle = q.c; ctx.fillRect(Math.round(q.x), Math.round(H - (q.wy - g.dist)), 2, 2); }
        // start signal
        if (g.startT > 0) {
          ctx.fillStyle = '#000'; ctx.fillRect(80, 60, 64, 22); ctx.fillStyle = '#888'; ctx.fillRect(80, 60, 64, 1); ctx.fillRect(80, 81, 64, 1);
          for (let i = 0; i < 3; i++) {
            const on = g.startT <= 160 - i * 40 && g.startT > 40;
            ctx.fillStyle = g.startT <= 40 ? '#30ff40' : on ? '#ff2020' : '#401010';
            ctx.fillRect(86 + i * 20, 64, 12, 14);
          }
          if (g.startT <= 40) text(ctx, 'GO!', 112, 90, '#30ff40', 2, 'center');
        }
        if (g.msgT > 0 && ((frame >> 3) & 1 || g.msg === 'GAME OVER')) text(ctx, g.msg, 112, 110, g.msg === 'AMBULANCE!' ? '#ff4040' : '#ffd800', g.msg === 'GAME OVER' ? 2 : 1, 'center');
        if (!g.ext && !g.demo && g.time < 10 && g.time > 0 && (frame >> 4) & 1) text(ctx, 'HURRY UP', 112, 130, '#ff8040', 1, 'center');
        if (g.demo) {
          ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(40, 136, 144, 34);
          text(ctx, 'MONACO GP', 112, 140, '#ff2a2a', 1, 'center');
          if ((frame >> 5) & 1) text(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', 112, 156, '#ffffff', 1, 'center');
        }
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#0b3a10'; ctx.fillRect(0, TOP, W, H - TOP);
        for (let x = 0; x < W; x += 6) { ctx.drawImage(FLAG, x, TOP + 2); ctx.drawImage(FLAG, x, H - 6); }
        // road strip
        ctx.fillStyle = '#6a6a6a'; ctx.fillRect(84, TOP + 6, 56, H - TOP - 12);
        ctx.fillStyle = '#e02020'; for (let y = TOP + 6; y < H - 6; y += 16) { ctx.fillRect(82, y, 2, 8); ctx.fillRect(140, y, 2, 8); }
        ctx.fillStyle = '#fff'; for (let y = TOP + 6 + (frame % 24); y < H - 6; y += 24) ctx.fillRect(111, y, 2, 8);
        ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(10, 36, 204, 52);
        text(ctx, 'MONACO', 112 + 1, 41 + 1, '#600000', 3, 'center');
        text(ctx, 'MONACO', 112, 41, '#ff2a2a', 3, 'center');
        text(ctx, 'G.P.', 112, 66, '#ffffff', 2, 'center');
        drawCar(ctx, PLAYER, 112, 112, 0);
        drawCar(ctx, RIVALS[0], 98, 136 - (frame % 120) * 0.3, 0);
        drawCar(ctx, RIVALS[1], 126, 150 - (frame % 160) * 0.2, 0);
        ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.fillRect(8, 164, 208, 76);
        text(ctx, 'DRIVE AS FAR AS YOU CAN', 112, 168, '#ffffff', 1, 'center');
        text(ctx, 'SCORE ' + EXT + ' IN ' + TIME0 + ' SEC', 112, 180, '#ffd800', 1, 'center');
        text(ctx, 'FOR EXTENDED PLAY', 112, 190, '#ffd800', 1, 'center');
        text(ctx, 'BONUS CAR EVERY 3000', 112, 202, '#80c0ff', 1, 'center');
        if (api.credits === 0) { if (coinFlash > 0 || (frame >> 5) & 1) text(ctx, 'INSERT COIN', 112, 216, coinFlash && (frame >> 2) & 1 ? '#ffd800' : '#ff4040', 1, 'center'); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START', 112, 216, '#30ff40', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 12, 230, '#ffffff');
        text(ctx, '\u00a9 1979 SEGA', 212, 230, '#ffffff', 1, 'right');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title' || !g) drawTitle(ctx); else drawGame(ctx);
        drawHUD(ctx);
      }
      return { update, render, destroy() { } };
    }
  });
})();
