// Zaxxon (Sega, 1982) \u2014 from-scratch isometric recreation for the MAME32 Game Room.
// Fortress run -> open space dogfight -> second fortress -> the Zaxxon robot. Altitude meter + shadow give depth.
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
    '=': [0, 0, 31, 0, 31, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0], '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0],
    '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8]
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
  const pad = (n, l) => String(Math.floor(n)).padStart(l, '0');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;

  const W = 224, H = 256;
  // isometric projection: u = forward (up-right on screen), v = lateral (down-right), h = altitude
  const BX = 70, BY = 186, FX = 0.9, FY = 0.52, RX = 0.9, RY = 0.52;
  const HW = 44, VLIM = 36, HMAX = 50, FENCE = 74, SPD = 1.0, WT = 6;
  function P(u, v, h) { return [BX + u * FX + v * RX, BY - u * FY + v * RY - h]; }

  ArcadeRegistry.register({
    id: 'zaxxon', title: 'Zaxxon', year: 1982, maker: 'Sega',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Left/Right: steer \u00b7 Down: climb \u00b7 Up: dive (flight stick) \u00b7 Space: fire \u00b7 Enter: start',
    marquee: { bg: '#000010', fg: '#ffd000', accent: '#30a0ff' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(10000);
      let mode = 'attract', at = 0, coinFlash = 0, frame = 0, lastCred = api.credits;
      let g = null;
      const stars = [];
      for (let i = 0; i < 70; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, c: i % 4 });

      const S = {
        shot() { au.tone(1400, 0.07, { type: 'square', vol: 0.07, slideTo: 380 }); },
        boom() { au.noise(0.35, { vol: 0.22, freq: 1400, slideTo: 90 }); },
        big() { au.noise(1.0, { vol: 0.26, freq: 900, slideTo: 40 }); au.tone(120, 0.7, { type: 'sawtooth', vol: 0.12, slideTo: 30 }); },
        fuel() { au.melody([[660, .05], [880, .05], [1175, .09]], { type: 'square', vol: 0.09 }); },
        shell() { au.tone(260, 0.07, { type: 'triangle', vol: 0.09, slideTo: 140 }); },
        alarm() { au.tone(988, 0.07, { type: 'square', vol: 0.08 }); au.tone(740, 0.07, { type: 'square', vol: 0.08, delay: 0.08 }); },
        zap() { au.noise(0.04, { vol: 0.04, freq: 5000, type: 'highpass' }); },
        hit() { au.tone(1800, 0.05, { type: 'square', vol: 0.08, slideTo: 900 }); },
        launch() { au.tone(200, 0.5, { type: 'sawtooth', vol: 0.08, slideTo: 1200 }); },
        siren() { au.tone(500, 0.25, { type: 'square', vol: 0.07, slideTo: 900 }); au.tone(900, 0.25, { type: 'square', vol: 0.07, slideTo: 500, delay: 0.25 }); },
        start() { au.melody([[392, .1], [523, .1], [659, .1], [784, .2], [659, .1], [784, .35]], { type: 'square', vol: 0.1 }); },
        extra() { au.melody([[1047, .06], [1319, .06], [1568, .06], [2093, .12]], { type: 'square', vol: 0.08 }); }
      };

      // ---------- level construction ----------
      function wallDef(u, fenced) {
        const gw = rnd(22, 30), gc = rnd(-VLIM + gw / 2 - 2, VLIM - gw / 2 + 2);
        return { t: 'wall', u, g0: gc - gw / 2, g1: gc + gw / 2, gh: rnd(20, 30), wt: fenced ? rnd(26, 34) : rnd(16, 26), fence: fenced };
      }
      function fortress(defs, u0, len, r, second) {
        defs.push(wallDef(u0 + 50, true));
        let u = u0 + 130, k = 0;
        const span = 290;
        while (u < u0 + len - 120) {
          const items = [];
          const nFuel = Math.max(1, 3 - Math.floor((r - 1) / 2));
          const nGun = Math.min(4, 1 + Math.floor((r + (second ? 1 : 0)) / 2) + (Math.random() < 0.5 ? 1 : 0));
          const list = [];
          for (let i = 0; i < nFuel; i++) list.push('fuel');
          for (let i = 0; i < nGun; i++) list.push('gun');
          if (Math.random() < 0.55) list.push('radar');
          if (Math.random() < 0.4 + r * 0.1) list.push('silo');
          if (Math.random() < 0.6) list.push('plane');
          for (const t of list) {
            for (let tries = 0; tries < 12; tries++) {
              const it = { t, u: u + rnd(30, span - 40), v: rnd(-38, 38) };
              if (items.every(o => Math.abs(o.u - it.u) > 16 || Math.abs(o.v - it.v) > 14)) { items.push(it); break; }
            }
          }
          for (const it of items) defs.push(it);
          u += span;
          const kind = k % 3;
          if (kind === 1 && Math.random() < 0.5) defs.push({ t: 'barrier', u, bh: rnd(15, 26) });
          else defs.push(wallDef(u, kind !== 2));
          u += 40; k++;
        }
        defs.push(wallDef(u0 + len, true));
      }
      function buildRound(r) {
        const defs = [], floors = [];
        const faLen = 2000 + r * 100;
        floors.push([30, faLen + 30]);
        fortress(defs, 0, faLen, r, false);
        const sp0 = faLen + 180, spLen = 1900 + r * 100;
        const nPl = 18 + Math.min(10, r * 2);
        for (let i = 0; i < nPl; i++) defs.push({ t: 'eplane', u: sp0 + 300 + i * (spLen - 300) / nPl + rnd(-20, 20) });
        const fb0 = sp0 + spLen + 160, fbLen = 2000 + r * 100;
        floors.push([fb0 + 20, fb0 + fbLen + 1100]);
        fortress(defs, fb0, fbLen, r, true);
        const bossU = fb0 + fbLen + 300;
        defs.push({ t: 'boss', u: bossU, v: -14 });
        defs.sort((a, b) => a.u - b.u);
        return { defs, floors, sp0, sp1: sp0 + spLen, fb0, bossU, end: bossU + 220, cps: [0, sp0 - 120, fb0 - 60, bossU - 380] };
      }
      function spawnObjs(from) {
        g.objs = [];
        for (const d of g.lvl.defs) {
          if (d.u < from + 20 && d.t !== 'boss') continue;
          const o = Object.assign({}, d, { alive: true, act: false, cd: rnd(30, 90), h: 0 });
          if (d.t === 'eplane') { o.v = rnd(-VLIM, VLIM); o.h = rnd(6, 44); }
          if (d.t === 'boss') { o.st = 'idle'; o.hits = 0; o.flash = 0; }
          g.objs.push(o);
        }
      }
      function overFloor(u) { for (const f of g.lvl.floors) if (u >= f[0] && u <= f[1]) return true; return false; }
      function inSpace() { return g.camU > g.lvl.sp0 && g.camU < g.lvl.sp1; }

      function newGame(demo) {
        g = {
          demo, score: 0, lives: 3, round: 1, extra: false, camU: 0, v: 0, h: 24, fuel: 100, alive: true, deadT: 0,
          shots: [], eshots: [], fx: [], pops: [], phase: demo ? 'play' : 'start', phaseT: demo ? 0 : 150, fireCD: 0,
          lvl: null, objs: [], aiFire: 0, msg: '', msgT: 0, alarmT: 0
        };
        g.lvl = buildRound(1);
        spawnObjs(0);
        if (!demo) S.start();
      }
      function addScore(n, u, v, h) {
        if (g.demo) return;
        g.score += n;
        if (!g.extra && g.score >= 10000) { g.extra = true; g.lives++; S.extra(); }
        if (g.score > hi) hi = g.score;
        if (u != null && n >= 300) g.pops.push({ u, v, h, n, t: 60 });
      }
      function boom(u, v, h, big) {
        g.fx.push({ u, v, h, t: 0, big: !!big, parts: Array.from({ length: big ? 18 : 9 }, () => ({ a: rnd(0, 6.28), s: rnd(0.4, big ? 2.4 : 1.4), c: Math.random() < 0.5 ? '#ffd040' : '#ff5020' })) });
      }
      function crash() {
        if (g.demo || !g.alive) return;
        g.alive = false; g.deadT = 130;
        boom(g.camU, g.v, g.h, true); S.big();
        g.shots = [];
      }
      function respawn() {
        const cps = g.lvl.cps;
        let cp = 0; for (const c of cps) if (c <= g.camU) cp = c;
        g.camU = cp; g.v = 0; g.h = 24; g.fuel = 100; g.alive = true;
        g.eshots = []; g.fx = []; g.pops = []; g.shots = [];
        spawnObjs(cp);
        g.phase = 'start'; g.phaseT = 100;
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 300;
        au.melody([[392, .2], [330, .2], [262, .2], [196, .5]], { type: 'square', vol: 0.1 });
      }
      function loseLife() {
        g.lives--;
        if (g.lives > 0) { respawn(); return; }
        if (api.offerContinue) {
          g.phase = 'wait';
          const cg = g;
          api.offerContinue(() => { if (g === cg) { g.lives = 3; g.score = 0; respawn(); } }, () => { if (g === cg) gameOver(); });
        } else gameOver();
      }

      // ---------- collision helpers ----------
      function wallPass(o, v, h, mv, mh) {
        if (o.t === 'barrier') return h + mh < o.bh;
        const inGap = v - mv > o.g0 && v + mv < o.g1 && h + mh < o.gh;
        const over = !o.fence && h - mh > o.wt;
        return inGap || over;
      }
      const OBJH = { fuel: 11, gun: 8, radar: 15, silo: 15, plane: 5 };
      const OBJR = { fuel: 6, gun: 6, radar: 5, silo: 4, plane: 7 };
      const PTS = { fuel: 300, gun: 200, radar: 1000, silo: 150, plane: 50, eplane: 100 };

      // ---------- demo autopilot ----------
      function aiInput() {
        let tv = 0, th = 12, fire = false;
        let wall = null;
        for (const o of g.objs) {
          if (!o.alive) continue;
          const rel = o.u - g.camU;
          if ((o.t === 'wall' || o.t === 'barrier') && rel > -2 && rel < 150) { wall = o; break; }
        }
        if (wall) {
          if (wall.t === 'barrier') { th = wall.bh - 9; tv = g.v; }
          else { tv = (wall.g0 + wall.g1) / 2; th = Math.max(3, wall.gh - 12); }
        } else {
          let best = null;
          for (const o of g.objs) {
            if (!o.alive) continue;
            const rel = o.u - g.camU;
            if (rel < 20 || rel > 160) continue;
            if (o.t === 'eplane' && o.act) { best = o; break; }
            if (OBJH[o.t] && o.t !== 'silo') { best = o; break; }
          }
          if (best) { tv = best.v; th = best.t === 'eplane' ? best.h : 4; fire = Math.abs(best.v - g.v) < 6 && (best.t !== 'eplane' || Math.abs(best.h - g.h) < 6); }
          if (inSpace() && !best) th = 25;
        }
        return { dv: Math.sign(Math.round(tv - g.v)), dh: Math.abs(th - g.h) > 1.5 ? Math.sign(th - g.h) : 0, fire: fire || (g.aiFire++ % 25 === 0) };
      }

      // ---------- update ----------
      function updGame() {
        if (g.phase === 'over') { g.phaseT--; if (g.phaseT <= 0 || (g.phaseT < 200 && api.anyPressed('Enter'))) { mode = 'attract'; at = 0; g = null; } return; }
        if (g.phase === 'wait') return;
        if (g.phase === 'start') { if (--g.phaseT <= 0) g.phase = 'play'; return; }
        if (g.msgT > 0) g.msgT--;
        // fx
        for (const f of g.fx) f.t++;
        g.fx = g.fx.filter(f => f.t < (f.big ? 70 : 34));
        for (const p of g.pops) p.t--;
        g.pops = g.pops.filter(p => p.t > 0);
        if (!g.alive) {
          if (--g.deadT <= 0) loseLife();
          return;
        }
        g.camU += SPD;
        // ship control
        let dv = 0, dh = 0, fire = false;
        if (g.demo) { const a = aiInput(); dv = a.dv; dh = a.dh; fire = a.fire; }
        else {
          if (api.key('ArrowLeft')) dv = -1; if (api.key('ArrowRight')) dv = 1;
          if (api.key('ArrowDown')) dh = 1; if (api.key('ArrowUp')) dh = -1;
          fire = api.pressed('Space') || (api.key('Space') && g.fireCD <= 0);
        }
        g.v = clamp(g.v + dv * 1.1, -VLIM, VLIM);
        if (g.fuel <= 0) { g.h -= 0.5; if (g.h <= 0) { g.h = 0; crash(); return; } }
        else g.h = clamp(g.h + dh * 0.9, 0, HMAX);
        // fuel
        if (!g.demo) {
          g.fuel = Math.max(0, g.fuel - (0.021 + g.round * 0.002));
          if (g.fuel < 25 && g.fuel > 0 && ++g.alarmT % 50 === 0) S.alarm();
        }
        if (frame % 9 === 0) au.tone(60 + g.h * 1.2, 0.16, { type: 'sawtooth', vol: 0.018 });
        // shooting
        if (g.fireCD > 0) g.fireCD--;
        if (fire && g.shots.length < 3 && g.fireCD <= 0) {
          g.shots.push({ u: g.camU + 8, pu: g.camU + 8, v: g.v, h: g.h + 1, life: 42 });
          g.fireCD = 9; S.shot();
        }
        updShots();
        updObjs();
        updEShots();
        if (!g.alive) return;
        // round end
        const bo = g.objs.find(o => o.t === 'boss');
        if (g.camU > g.lvl.end && (!bo || ((bo.st === 'dead' || bo.st === 'pass') && g.camU > bo.u + 90))) {
          g.round++;
          addScore(1000 * Math.min(g.round - 1, 5));
          g.lvl = buildRound(g.round); g.camU = 0; spawnObjs(0);
          g.eshots = []; g.shots = [];
          g.msg = 'ROUND ' + g.round; g.msgT = 150;
          if (!g.demo) S.start();
        }
      }
      function updShots() {
        for (const s of g.shots) {
          s.pu = s.u; s.u += 4; s.life--;
          for (const o of g.objs) {
            if (!o.alive || s.life <= 0) continue;
            if (o.t === 'wall' || o.t === 'barrier') {
              if (s.pu <= o.u + WT && s.u >= o.u && !wallPass(o, s.v, s.h, 0, 0)) { s.life = 0; S.zap(); g.fx.push({ u: o.u, v: s.v, h: s.h, t: 20, big: false, parts: [] }); }
              continue;
            }
            if (o.t === 'eplane') {
              if (o.act && Math.abs(o.u - s.u) < 6 && Math.abs(o.v - s.v) < 8 && Math.abs(o.h - s.h) < 7) {
                o.alive = false; s.life = 0; boom(o.u, o.v, o.h); S.boom(); addScore(PTS.eplane, o.u, o.v, o.h);
              }
              continue;
            }
            if (o.t === 'silo' && o.launched) {
              if (Math.abs(o.u - s.u) < 5 && Math.abs(o.v - s.v) < 6 && Math.abs(o.h + 7 - s.h) < 9) { o.alive = false; s.life = 0; boom(o.u, o.v, o.h); S.boom(); addScore(300, o.u, o.v, o.h); }
              continue;
            }
            if (o.t === 'missile') {
              if (Math.abs(o.u - s.u) < 6 && Math.abs(o.v - s.v) < 7 && Math.abs(o.h - s.h) < 7) { o.alive = false; s.life = 0; boom(o.u, o.v, o.h); S.boom(); addScore(300, o.u, o.v, o.h); }
              continue;
            }
            if (o.t === 'boss') {
              if (o.st === 'dead' || o.st === 'idle') continue;
              const lu = o.u - 10, lv = o.v + 15, lh = 24;
              if (s.pu <= lu + 4 && s.u >= lu - 4 && Math.abs(s.v - lv) < 7 && Math.abs(s.h - lh) < 7) {
                s.life = 0; o.hits++; o.flash = 8; S.hit();
                if (o.hits >= 6) {
                  o.st = 'dead'; boom(o.u, o.v, 20, true); boom(o.u - 4, o.v + 10, 30, true); S.big();
                  addScore(1000 * Math.min(5, g.round), o.u, o.v, 40);
                }
              } else if (s.pu <= o.u + 8 && s.u >= o.u - 8 && s.v > o.v - 12 && s.v < o.v + 12 && s.h < 46) { s.life = 0; S.zap(); }
              continue;
            }
            const oh = OBJH[o.t];
            if (!oh) continue;
            if (s.pu <= o.u + 5 && s.u >= o.u - 5 && Math.abs(o.v - s.v) < OBJR[o.t] + 2 && s.h < oh + 2) {
              o.alive = false; s.life = 0; boom(o.u, o.v, 4); S.boom();
              addScore(PTS[o.t], o.u, o.v, oh);
              if (o.t === 'fuel' && !g.demo) { g.fuel = Math.min(100, g.fuel + 30); S.fuel(); }
            }
          }
        }
        g.shots = g.shots.filter(s => s.life > 0);
      }
      function fireAt(fromU, fromV, fromH, speed) {
        const du = g.camU - fromU, dv = g.v - fromV, dh = g.h - fromH;
        const d = Math.hypot(du, dv, dh) || 1;
        g.eshots.push({ u: fromU, v: fromV, h: fromH, vu: du / d * speed, vv: dv / d * speed, vh: dh / d * speed, life: 160 });
      }
      function updObjs() {
        const r = g.round;
        for (const o of g.objs) {
          if (!o.alive) continue;
          const rel = o.u - g.camU;
          if (rel > 330) break;
          if (rel < -170 && o.t !== 'boss') { o.alive = false; continue; }
          o.t2 = (o.t2 || 0) + 1;
          switch (o.t) {
            case 'wall': case 'barrier':
              if (g.alive && rel <= 0 && rel > -WT - 1 && !wallPass(o, g.v, g.h, 4, 2)) crash();
              if (o.t === 'barrier' && rel < 60 && rel > 0 && o.t2 % 12 === 0) S.zap();
              break;
            case 'gun':
              if (rel > 40 && rel < 210 && !inSpace()) {
                if (--o.cd <= 0) { o.cd = Math.max(55, 150 - r * 14) + rnd(0, 60); fireAt(o.u, o.v, 7, 1.3 + r * 0.1); S.shell(); }
              }
              break;
            case 'silo':
              if (!o.launched && rel < 100 + r * 10) { o.launched = true; S.launch(); }
              if (o.launched) { o.h += 0.9 + r * 0.05; if (o.h > 90) o.alive = false; }
              break;
            case 'eplane':
              if (!o.act && rel < 240) o.act = true;
              if (o.act) {
                o.u += 0.25;
                if (rel > 30) {
                  o.v += clamp(g.v - o.v, -0.35, 0.35);
                  o.h += clamp(g.h - o.h, -0.3, 0.3) + Math.sin(o.t2 * 0.05) * 0.2;
                  o.h = clamp(o.h, 2, HMAX);
                }
                if (rel > 60 && rel < 200 && --o.cd <= 0) { o.cd = Math.max(70, 170 - r * 12) + rnd(0, 60); fireAt(o.u - 4, o.v, o.h, 1.7 + r * 0.1); S.shell(); }
                if (g.alive && Math.abs(rel) < 6 && Math.abs(o.v - g.v) < 7 && Math.abs(o.h - g.h) < 6) { o.alive = false; boom(o.u, o.v, o.h); crash(); }
              }
              break;
            case 'missile':
              o.u += o.vu + SPD;
              o.v += clamp(g.v - o.v, -0.32, 0.32); o.h += clamp(g.h - o.h, -0.3, 0.3);
              if (g.alive && Math.abs(o.u - g.camU) < 6 && Math.abs(o.v - g.v) < 6 && Math.abs(o.h - g.h) < 6) { o.alive = false; crash(); }
              if (o.u - g.camU < -40) o.alive = false;
              break;
            case 'boss': updBoss(o, rel); break;
          }
          // ground objects collide with low ship
          const oh = OBJH[o.t];
          if (oh && g.alive && o.alive) {
            const hh = o.t === 'silo' && o.launched ? o.h + 15 : oh;
            const hb = o.t === 'silo' && o.launched ? o.h : 0;
            if (Math.abs(rel) < 5 && Math.abs(o.v - g.v) < OBJR[o.t] + 4 && g.h < hh + 1 && g.h + 4 > hb) { o.alive = false; boom(o.u, o.v, 4); crash(); }
          }
        }
        g.objs = g.objs.filter(o => o.alive || o.t === 'boss');
      }
      function updBoss(o, rel) {
        if (o.flash > 0) o.flash--;
        if (o.st === 'idle') {
          if (rel < 110) { o.st = 'active'; o.bt = 0; g.msg = 'ZAXXON'; g.msgT = 90; S.siren(); }
        } else if (o.st === 'active') {
          o.bt++;
          o.u = g.camU + 110;
          o.v += clamp((g.v - 15) - o.v, -0.25, 0.25);
          o.v = clamp(o.v, -36, 20);
          if (o.bt % 60 === 0) S.siren();
          if (o.bt === 330 && !g.demo) {
            g.objs.push({ t: 'missile', u: o.u - 12, v: o.v + 15, h: 24, vu: -1.15 - g.round * 0.05, alive: true });
            S.launch();
          }
          if (o.bt > 480) o.st = 'pass';
        } else if (o.st === 'pass') {
          // the robot stays put and the ship flies past: collide with its body
          if (g.alive && Math.abs(rel) < 8 && g.v > o.v - 12 && g.v < o.v + 18 && g.h < 46) crash();
        }
      }
      function updEShots() {
        for (const s of g.eshots) {
          s.u += s.vu + SPD; s.v += s.vv; s.h += s.vh; s.life--;
          if (g.alive && Math.abs(s.u - g.camU) < 4 && Math.abs(s.v - g.v) < 5 && Math.abs(s.h - g.h) < 5) { s.life = 0; crash(); }
          if (s.h < -2) s.life = 0;
        }
        g.eshots = g.eshots.filter(s => s.life > 0);
      }

      function tryStart() {
        if (api.useCredit()) { newGame(false); mode = 'game'; return true; }
        coinFlash = 90; au.tone(90, 0.3, { type: 'square', vol: 0.14 });
        return false;
      }
      function update() {
        frame++;
        if (api.credits > lastCred) au.tone(1760, 0.06, { type: 'square', vol: 0.07, slideTo: 2640 });
        lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        for (const s of stars) { s.x -= 0.25 * (1 + s.c * 0.5) * FX; s.y += 0.25 * (1 + s.c * 0.5) * FY; if (s.x < 0) s.x += W; if (s.y > H) s.y -= H; }
        if (mode === 'attract') {
          at++;
          const ph = attractPhase();
          if (ph === 1) {
            if (!g) newGame(true);
            updGame();
          } else if (g) g = null;
          if (at >= 1800) at = 0;
          if (api.anyPressed('Enter', 'Space')) tryStart();
          return;
        }
        updGame();
      }
      function attractPhase() { return at < 540 ? 0 : at < 1500 ? 1 : 2; }

      // ---------- rendering ----------
      function poly(ctx, pts, col) {
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath(); ctx.fill();
      }
      function line(ctx, a, b, col, w) {
        ctx.strokeStyle = col; ctx.lineWidth = w || 1; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
      function box(ctx, u, v, h, du, dv, dh, top, front, side) {
        poly(ctx, [P(u, v, h), P(u, v + dv, h), P(u, v + dv, h + dh), P(u, v, h + dh)], front);
        poly(ctx, [P(u, v + dv, h), P(u + du, v + dv, h), P(u + du, v + dv, h + dh), P(u, v + dv, h + dh)], side);
        poly(ctx, [P(u, v, h + dh), P(u, v + dv, h + dh), P(u + du, v + dv, h + dh), P(u + du, v, h + dh)], top);
      }
      function cyl(ctx, u, v, h, r, ht, cTop, cBody, cDark) {
        const b = P(u, v, h), t = P(u, v, h + ht);
        ctx.fillStyle = cDark; ctx.fillRect(b[0] - r * 1.1, t[1], r * 1.1, b[1] - t[1]);
        ctx.fillStyle = cBody; ctx.fillRect(b[0], t[1], r * 1.1, b[1] - t[1]);
        ctx.beginPath(); ctx.ellipse(b[0], b[1], r * 1.1, r * 0.55, 0, 0, Math.PI); ctx.fillStyle = cBody; ctx.fill();
        ctx.beginPath(); ctx.ellipse(t[0], t[1], r * 1.1, r * 0.55, 0, 0, Math.PI * 2); ctx.fillStyle = cTop; ctx.fill();
      }
      function drawFloor(ctx) {
        for (const f of g.lvl.floors) {
          const a = Math.max(f[0], g.camU - 140) - g.camU, b = Math.min(f[1], g.camU + 330) - g.camU;
          if (b <= a) continue;
          // fortress edge faces
          poly(ctx, [P(a, HW, 0), P(b, HW, 0), P(b, HW, -12), P(a, HW, -12)], '#1c2050');
          if (f[0] - g.camU === a) poly(ctx, [P(a, -HW, 0), P(a, HW, 0), P(a, HW, -12), P(a, -HW, -12)], '#262a68');
          poly(ctx, [P(a, -HW, 0), P(a, HW, 0), P(b, HW, 0), P(b, -HW, 0)], '#4a4e9a');
          ctx.lineWidth = 1;
          for (let v = -HW + 11; v < HW; v += 11) line(ctx, P(a, v, 0), P(b, v, 0), '#3a3e84');
          const s0 = Math.ceil((a + g.camU) / 22) * 22;
          for (let u = s0; u < b + g.camU; u += 22) line(ctx, P(u - g.camU, -HW, 0), P(u - g.camU, HW, 0), (u / 22) % 4 === 0 ? '#6a6ec0' : '#3a3e84');
          line(ctx, P(a, -HW, 0), P(b, -HW, 0), '#8a8ee0');
          line(ctx, P(a, HW, 0), P(b, HW, 0), '#8a8ee0');
        }
      }
      function drawShip(ctx, rel, v, h, scale) {
        const k = scale || 1;
        const c = (du, dv, dh) => P(rel + du * k, v + dv * k, h + dh * k);
        poly(ctx, [c(10, 0, 0), c(-4, -9, 0), c(-6, -8, 0), c(-6, 8, 0), c(-4, 9, 0)], '#3050e0');
        poly(ctx, [c(10, 0, 1), c(-2, -3, 1), c(-7, -2, 1), c(-7, 2, 1), c(-2, 3, 1)], '#f0f0ff');
        poly(ctx, [c(4, 0, 2), c(0, -1.5, 2), c(0, 1.5, 2)], '#ff3030');
        poly(ctx, [c(-1, 0, 1), c(-7, 0, 1), c(-7, 0, 7), c(-4, 0, 7)], '#c0c8ff');
        poly(ctx, [c(-6, -9, 0), c(-3, -9, 0), c(-3, -9, 2), c(-6, -9, 2)], '#ffd040');
        poly(ctx, [c(-6, 9, 0), c(-3, 9, 0), c(-3, 9, 2), c(-6, 9, 2)], '#ffd040');
        if (frame & 2) { const e = c(-8, 0, 1); ctx.fillStyle = '#ff9020'; ctx.fillRect(e[0] - 2, e[1] - 1, 3, 2); }
      }
      function drawEPlane(ctx, rel, v, h) {
        const c = (du, dv, dh) => P(rel + du, v + dv, h + dh);
        poly(ctx, [c(-9, 0, 0), c(4, -9, 0), c(6, -8, 0), c(6, 8, 0), c(4, 9, 0)], '#20a020');
        poly(ctx, [c(-9, 0, 1), c(3, -3, 1), c(7, -2, 1), c(7, 2, 1), c(3, 3, 1)], '#e0e040');
        poly(ctx, [c(1, 0, 1), c(7, 0, 1), c(7, 0, 6), c(4, 0, 6)], '#90ff60');
      }
      function drawObj(ctx, o) {
        const rel = o.u - g.camU;
        switch (o.t) {
          case 'wall': {
            const top = o.fence ? o.wt : o.wt;
            const segs = [[-HW, o.g0, 0, top], [o.g1, HW, 0, top], [o.g0, o.g1, o.gh, top]];
            for (const s of segs) {
              if (s[1] - s[0] <= 0.5 || s[3] - s[2] <= 0.5) continue;
              box(ctx, rel, s[0], s[2], WT, s[1] - s[0], s[3] - s[2], '#c8c8d8', '#8888a8', '#686888');
              for (let hh = s[2] + 4; hh < s[3]; hh += 5) line(ctx, P(rel, s[0], hh), P(rel, s[1], hh), '#70708c');
            }
            if (o.fence) {
              for (const pv of [-HW, o.g0, o.g1, HW]) {
                const pb = P(rel + 3, pv, top), pt = P(rel + 3, pv, FENCE);
                ctx.fillStyle = '#d0d040'; ctx.fillRect(pt[0] - 1, pt[1], 2, pb[1] - pt[1]);
              }
              if (frame & 1) {
                ctx.strokeStyle = (frame >> 1) & 1 ? '#80ffff' : '#ffffff'; ctx.lineWidth = 1; ctx.beginPath();
                for (let hh = top + 8; hh < FENCE; hh += 10) {
                  const a = P(rel + 3, -HW, hh), b = P(rel + 3, HW, hh);
                  ctx.moveTo(a[0], a[1]);
                  for (let i = 1; i <= 10; i++) { const t = i / 10; ctx.lineTo(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + (i % 2 ? -2 : 2) * Math.random()); }
                }
                // electric curtain across the gap's upper part too
                const a = P(rel + 3, o.g0, o.gh), b = P(rel + 3, o.g1, o.gh);
                ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
                ctx.stroke();
              }
            }
            break;
          }
          case 'barrier': {
            for (const pv of [-HW, HW]) {
              const pb = P(rel + 3, pv, 0), pt = P(rel + 3, pv, FENCE);
              ctx.fillStyle = '#a0a0c0'; ctx.fillRect(pt[0] - 2, pt[1], 4, pb[1] - pt[1]);
              ctx.fillStyle = '#ffd040'; ctx.fillRect(pt[0] - 2, pt[1] - 2, 4, 3);
            }
            ctx.strokeStyle = (frame >> 1) & 1 ? '#40ffff' : '#ffffff'; ctx.lineWidth = 1; ctx.beginPath();
            for (let hh = o.bh; hh < FENCE; hh += 6) {
              const a = P(rel + 3, -HW, hh), b = P(rel + 3, HW, hh);
              ctx.moveTo(a[0], a[1]);
              for (let i = 1; i <= 12; i++) { const t = i / 12; ctx.lineTo(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + (Math.random() - 0.5) * 3); }
            }
            ctx.stroke();
            break;
          }
          case 'fuel':
            cyl(ctx, rel, o.v, 0, 6, 11, '#ff8080', '#e02020', '#901010');
            { const p = P(rel, o.v, 4); text(ctx, 'E', p[0] - 2, p[1] - 4, '#ffffff', 1); }
            break;
          case 'gun': {
            box(ctx, rel - 5, o.v - 5, 0, 10, 10, 5, '#60b060', '#307030', '#205020');
            cyl(ctx, rel, o.v, 5, 3, 3, '#90e090', '#408040', '#285028');
            const a = P(rel, o.v, 7), b = P(rel - 7, o.v + 2, 8);
            line(ctx, a, b, '#c0ffc0', 2);
            break;
          }
          case 'radar': {
            const b = P(rel, o.v, 0), t = P(rel, o.v, 12);
            ctx.fillStyle = '#909090'; ctx.fillRect(b[0] - 1, t[1], 3, b[1] - t[1]);
            box(ctx, rel - 3, o.v - 3, 0, 6, 6, 3, '#b0b0b0', '#707070', '#505050');
            const ang = o.t2 * 0.08;
            ctx.beginPath(); ctx.ellipse(t[0], t[1], 7 * Math.abs(Math.cos(ang)) + 1.5, 5, 0, 0, Math.PI * 2);
            ctx.fillStyle = Math.cos(ang) > 0 ? '#f0f0f0' : '#a0a0b0'; ctx.fill();
            ctx.fillStyle = '#ff3030'; ctx.fillRect(t[0] - 1, t[1] - 4, 2, 2);
            break;
          }
          case 'silo': {
            if (!o.launched) box(ctx, rel - 5, o.v - 5, 0, 10, 10, 2, '#707070', '#404040', '#303030');
            const b = P(rel, o.v, o.h), t = P(rel, o.v, o.h + 15);
            ctx.fillStyle = '#e8e8e8'; ctx.fillRect(t[0] - 2, t[1] + 3, 4, b[1] - t[1] - 3);
            ctx.fillStyle = '#ff3020'; ctx.fillRect(t[0] - 1, t[1], 2, 4);
            ctx.fillStyle = '#ffd040'; ctx.fillRect(b[0] - 3, b[1] - 3, 2, 3); ctx.fillRect(b[0] + 1, b[1] - 3, 2, 3);
            if (o.launched && (frame & 2)) { ctx.fillStyle = '#ff9020'; ctx.fillRect(b[0] - 1, b[1], 2, 4); }
            break;
          }
          case 'plane': {
            const c = (du, dv, dh) => P(rel + du, o.v + dv, dh);
            poly(ctx, [c(-8, 0, 1), c(3, -8, 1), c(5, -7, 1), c(5, 7, 1), c(3, 8, 1)], '#c08020');
            poly(ctx, [c(-8, 0, 2), c(3, -2, 2), c(6, -1, 2), c(6, 1, 2), c(3, 2, 2)], '#f0d080');
            poly(ctx, [c(1, 0, 2), c(6, 0, 2), c(6, 0, 6), c(4, 0, 6)], '#ffe0a0');
            break;
          }
          case 'eplane': if (o.act) drawEPlane(ctx, rel, o.v, o.h); break;
          case 'missile': {
            const a = P(rel, o.v, o.h), b = P(rel + 8, o.v, o.h + 1);
            line(ctx, a, b, '#ffffff', 3); ctx.fillStyle = '#ff3030'; ctx.fillRect(a[0] - 2, a[1] - 2, 3, 3);
            if (frame & 1) { ctx.fillStyle = '#ffd040'; ctx.fillRect(b[0], b[1] - 1, 3, 2); }
            break;
          }
          case 'boss': drawBoss(ctx, o, rel); break;
        }
      }
      function drawBoss(ctx, o, rel) {
        if (o.st === 'dead' || rel > 330 || rel < -150) return;
        const v = o.v;
        const body = o.flash > 0 && (o.flash & 2) ? '#ffffff' : null;
        const G1 = body || '#d0a020', G2 = body || '#906010', G3 = body || '#604008';
        // legs
        box(ctx, rel - 5, v - 10, 0, 10, 7, 16, G1, G2, G3);
        box(ctx, rel - 5, v + 3, 0, 10, 7, 16, G1, G2, G3);
        // torso
        box(ctx, rel - 7, v - 12, 16, 14, 24, 18, G1, G2, G3);
        ctx.fillStyle = '#ff2020'; { const p = P(rel - 7, v, 26); ctx.fillRect(p[0] - 3, p[1] - 2, 6, 4); }
        // head
        box(ctx, rel - 5, v - 6, 34, 10, 12, 10, '#e8e8e8', '#a0a0b0', '#707080');
        const eye = (frame >> 3) & 1 ? '#ff2020' : '#ffff40';
        { const p = P(rel - 5, v - 3, 39); ctx.fillStyle = eye; ctx.fillRect(p[0] - 1, p[1] - 1, 3, 2); }
        { const p = P(rel - 5, v + 3, 39); ctx.fillStyle = eye; ctx.fillRect(p[0] - 1, p[1] - 1, 3, 2); }
        // left arm
        box(ctx, rel - 4, v - 16, 22, 6, 4, 10, G1, G2, G3);
        // right arm with missile launcher (the target)
        box(ctx, rel - 12, v + 12, 21, 12, 6, 6, '#ff6060', '#c02020', '#801010');
        if (o.st === 'active' && o.bt < 330) {
          const a = P(rel - 16, v + 15, 26), b = P(rel - 8, v + 15, 26);
          line(ctx, a, b, '#ffffff', 3);
        }
        // hit counter pips
        if (o.st === 'active') for (let i = 0; i < 6; i++) { const p = P(rel - 7, v - 10 + i * 4, 32); ctx.fillStyle = i < o.hits ? '#40ff40' : '#404040'; ctx.fillRect(p[0], p[1], 2, 2); }
      }
      function drawFx(ctx) {
        for (const f of g.fx) {
          const p = P(f.u - g.camU, f.v, f.h);
          if (!f.parts.length) { ctx.fillStyle = '#ffffff'; ctx.fillRect(p[0] - 1, p[1] - 1, 3, 3); continue; }
          const t = f.t;
          if (t < 8) { ctx.fillStyle = t & 1 ? '#ffffff' : '#ffd040'; ctx.beginPath(); ctx.arc(p[0], p[1], (f.big ? 4 : 2) + t * (f.big ? 1.6 : 0.9), 0, 6.283); ctx.fill(); }
          for (const q of f.parts) {
            const d = q.s * t;
            ctx.fillStyle = t > (f.big ? 50 : 24) && (t & 2) ? '#802010' : q.c;
            ctx.fillRect(p[0] + Math.cos(q.a) * d - 1, p[1] + Math.sin(q.a) * d * 0.7 + t * t * 0.01 - 1, 2, 2);
          }
        }
        for (const q of g.pops) {
          const p = P(q.u - g.camU, q.v, q.h + (60 - q.t) * 0.2);
          text(ctx, String(q.n), p[0], p[1] - 10, '#ffffff', 1, 'center');
        }
      }
      function drawWorld(ctx) {
        // starfield
        for (const s of stars) { ctx.fillStyle = ['#404080', '#8080c0', '#ffffff', '#ffd040'][s.c]; ctx.fillRect(s.x | 0, s.y | 0, 1, 1); }
        drawFloor(ctx);
        // ship shadow on the fortress floor
        if (g.alive && overFloor(g.camU)) {
          const p = P(0, g.v, 0);
          ctx.fillStyle = 'rgba(0,0,20,0.6)';
          ctx.beginPath(); ctx.ellipse(p[0], p[1], 9, 4, -0.5, 0, 6.283); ctx.fill();
        }
        // depth-sorted drawables
        const dl = [];
        const walls = [];
        for (const o of g.objs) if (o.alive && (o.t === 'wall' || o.t === 'barrier')) walls.push(o.u);
        const zone = u => { let z = 0; for (const w of walls) if (w < u) z++; return z; };
        for (const o of g.objs) {
          if (!o.alive) continue;
          const rel = o.u - g.camU;
          if (rel > 330 || rel < -170) continue;
          const isW = o.t === 'wall' || o.t === 'barrier';
          dl.push({ z: isW ? zone(o.u) + 0.5 : zone(o.u), k: isW ? rel : rel - (o.v || 0), f: () => drawObj(ctx, o) });
        }
        if (g.alive) dl.push({ z: zone(g.camU + 3), k: -g.v, f: () => drawShip(ctx, 0, g.v, g.h) });
        for (const s of g.shots) dl.push({ z: zone(s.u), k: s.u - g.camU - s.v, f: () => { const a = P(s.u - g.camU, s.v, s.h), b = P(s.u - g.camU - 5, s.v, s.h); line(ctx, a, b, '#ffff80', 2); } });
        for (const s of g.eshots) dl.push({ z: zone(s.u), k: s.u - g.camU - s.v, f: () => { const a = P(s.u - g.camU, s.v, s.h); ctx.fillStyle = frame & 2 ? '#ff4040' : '#ffffff'; ctx.fillRect(a[0] - 1.5, a[1] - 1.5, 3, 3); } });
        dl.sort((a, b) => b.z - a.z || b.k - a.k);
        for (const d of dl) d.f();
        drawFx(ctx);
      }
      function drawHUD(ctx) {
        text(ctx, '1UP', 8, 2, '#ff4040'); text(ctx, pad(g.score, 6), 8, 11, '#ffffff');
        text(ctx, 'HIGH SCORE', 112, 2, '#ff4040', 1, 'center'); text(ctx, pad(hi, 6), 112, 11, '#ffffff', 1, 'center');
        if (inSpace()) {
          let n = 0; for (const o of g.objs) if (o.t === 'eplane' && o.alive) n++;
          text(ctx, 'ENEMY PLANE', 218, 2, '#40ff40', 1, 'right'); text(ctx, pad(n, 2), 218, 11, '#ffffff', 1, 'right');
        } else { text(ctx, 'ROUND', 218, 2, '#40c0ff', 1, 'right'); text(ctx, String(g.round), 218, 11, '#ffffff', 1, 'right'); }
        // altimeter
        const ax = 3, ay = 46, ah = 120;
        text(ctx, 'H', ax + 1, ay - 9, '#ffd040');
        text(ctx, 'L', ax + 1, ay + ah + 3, '#ffd040');
        ctx.fillStyle = '#202040'; ctx.fillRect(ax, ay, 8, ah);
        const nb = 12, filled = Math.round(g.h / HMAX * nb);
        for (let i = 0; i < nb; i++) {
          ctx.fillStyle = i < filled ? (i > 9 ? '#ff4040' : i > 5 ? '#ffd040' : '#40ff40') : '#303050';
          ctx.fillRect(ax + 1, ay + ah - (i + 1) * 10 + 1, 6, 8);
        }
        // fuel gauge
        const fy = 245;
        text(ctx, 'FUEL', 8, fy, g.fuel < 25 && (frame & 16) ? '#ff2020' : '#ffd040');
        text(ctx, 'E', 36, fy, '#ff4040'); text(ctx, 'F', 132, fy, '#40ff40');
        ctx.fillStyle = '#202040'; ctx.fillRect(44, fy, 86, 7);
        const segs = Math.ceil(g.fuel / 100 * 16);
        for (let i = 0; i < segs; i++) { ctx.fillStyle = g.fuel < 25 ? '#ff4040' : '#40c0ff'; ctx.fillRect(45 + i * 5.3, fy + 1, 4, 5); }
        // lives
        for (let i = 0; i < Math.min(6, g.lives - 1); i++) {
          const x = 212 - i * 13, y = fy + 3;
          ctx.fillStyle = '#f0f0ff'; ctx.fillRect(x - 5, y, 10, 2); ctx.fillRect(x - 1, y - 3, 3, 7); ctx.fillStyle = '#3050e0'; ctx.fillRect(x + 4, y - 1, 2, 4);
        }
      }
      function attractText(ctx) {
        const blink = (frame >> 5) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', 112, 214, '#ffffff', 1, 'center'); }
        else if (blink) text(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', 112, 214, '#40c0ff', 1, 'center');
        text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), 8, 246, '#a0a0a0');
      }
      function drawLogo(ctx, y) {
        for (let d = 6; d > 0; d--) text(ctx, 'ZAXXON', 112 + d * 0.8, y + d * 0.6, d > 3 ? '#402000' : '#a05000', 5, 'center');
        text(ctx, 'ZAXXON', 112, y, '#ffd000', 5, 'center');
      }
      function render(ctx) {
        ctx.fillStyle = '#000008'; ctx.fillRect(0, 0, W, H);
        if (mode === 'attract') {
          const ph = attractPhase();
          if (ph === 1 && g) {
            drawWorld(ctx);
            text(ctx, 'HIGH SCORE', 112, 2, '#ff4040', 1, 'center'); text(ctx, pad(hi, 6), 112, 11, '#ffffff', 1, 'center');
            text(ctx, 'DEMONSTRATION', 112, 30, '#ffd040', 1, 'center');
            attractText(ctx);
            return;
          }
          for (const s of stars) { ctx.fillStyle = ['#404080', '#8080c0', '#ffffff', '#ffd040'][s.c]; ctx.fillRect(s.x | 0, s.y | 0, 1, 1); }
          if (ph === 0) {
            drawLogo(ctx, 34);
            text(ctx, '- SCORE TABLE -', 112, 86, '#40c0ff', 1, 'center');
            const rows = [['FUEL TANK', '300', '#ff4040'], ['GUN TURRET', '200', '#40ff40'], ['RADAR TOWER', '1000', '#e0e0e0'],
              ['MISSILE', '150 / 300', '#ffffff'], ['PLANE', '50 / 100', '#ffd040'], ['ZAXXON', '1000+', '#ffd000']];
            rows.forEach((r, i) => { text(ctx, r[0], 30, 102 + i * 14, r[2]); text(ctx, r[1], 194, 102 + i * 14, '#ffffff', 1, 'right'); });
            text(ctx, 'EXTRA SHIP AT 10000', 112, 192, '#ff80ff', 1, 'center');
          } else {
            drawLogo(ctx, 34);
            text(ctx, 'HIGH SCORE', 112, 100, '#ff4040', 1, 'center');
            text(ctx, pad(hi, 6), 112, 116, '#ffffff', 2, 'center');
            text(ctx, 'SHOOT FUEL TANKS TO REFUEL', 112, 150, '#40c0ff', 1, 'center');
            text(ctx, 'WATCH YOUR ALTITUDE', 112, 162, '#40c0ff', 1, 'center');
            text(ctx, 'AND YOUR SHADOW', 112, 174, '#40c0ff', 1, 'center');
          }
          text(ctx, '\u00a9 1982 SEGA', 112, 232, '#808080', 1, 'center');
          attractText(ctx);
          return;
        }
        drawWorld(ctx);
        drawHUD(ctx);
        if (g.phase === 'start') {
          text(ctx, 'PLAYER 1', 112, 80, '#40c0ff', 1, 'center');
          text(ctx, 'ROUND ' + g.round, 112, 92, '#ffffff', 1, 'center');
        }
        if (g.msgT > 0 && (g.msgT >> 3) & 1) text(ctx, g.msg, 112, 60, '#ffd040', 2, 'center');
        if (g.alive && g.camU > g.lvl.sp0 - 160 && g.camU < g.lvl.sp0 + 60) text(ctx, 'ENTERING SPACE', 112, 70, '#40ff40', 1, 'center');
        if (g.alive && g.camU > g.lvl.fb0 - 200 && g.camU < g.lvl.fb0 - 40) text(ctx, 'FORTRESS AHEAD', 112, 70, '#ff8040', 1, 'center');
        if (g.fuel <= 0 && g.alive) text(ctx, 'OUT OF FUEL', 112, 110, '#ff2020', 1, 'center');
        if (g.phase === 'over') text(ctx, 'GAME OVER', 112, 110, '#ff4040', 2, 'center');
      }
      return { update, render, destroy() { } };
    }
  });
})();
