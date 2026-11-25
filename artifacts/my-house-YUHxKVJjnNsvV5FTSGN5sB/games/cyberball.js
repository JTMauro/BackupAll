// Cyberball (Atari Games, 1988) \u2014 from-scratch recreation: 7-on-7 robot football with the exploding ball.
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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8],
    '%': [24, 25, 2, 4, 8, 19, 3], '#': [10, 31, 10, 10, 10, 31, 10], '$': [4, 15, 20, 14, 5, 30, 4]
  };
  // text(ctx, str, x, y, colour, scale, align: 'left'|'center'|'right')
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
  // text with a 1px dark drop shadow
  function stext(ctx, s, x, y, col, sc, align) { text(ctx, s, x + 1, y + 1, '#000', sc, align); text(ctx, s, x, y, col, sc, align); }
  // build a sprite canvas from rows of chars + palette {char: colour}
  function spr(rows, pal) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
    return c;
  }
  function flipH(src) {
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const x = c.getContext('2d'); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0);
    return c;
  }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rand = (a, b) => a + Math.random() * (b - a);
  const irand = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const pad = (n, l) => String(Math.floor(n)).padStart(l, '0');

  // ======================= CYBERBALL =======================
  const W = 256, H = 240, HUD = 18, YD = 5, FX = W / 2;   // 5 pixels per yard
  const HALFW = 20;                                        // field half-width in yards
  const TEAMS = [
    { name: 'HAMMERS', body: '#2060ff', trim: '#a0c0ff', visor: '#ffe040' },        // the player
    { name: 'SCORPIONS', body: '#c02020', trim: '#ffa0a0', visor: '#40ffff', sk: 0.95, iq: 0.6 },
    { name: 'GLADIATORS', body: '#808020', trim: '#ffff80', visor: '#ff40ff', sk: 1.0, iq: 0.7 },
    { name: 'DESTROYERS', body: '#802080', trim: '#ff80ff', visor: '#40ff40', sk: 1.05, iq: 0.8 },
    { name: 'TERMINATORS', body: '#208060', trim: '#80ffd0', visor: '#ff4040', sk: 1.1, iq: 0.88 },
    { name: 'ANNIHILATORS', body: '#404040', trim: '#c0c0c0', visor: '#ff2020', sk: 1.16, iq: 0.95 }
  ];
  const TEMP = [
    { name: 'COOL', col: '#40a0ff' }, { name: 'WARM', col: '#ffe040' }, { name: 'HOT', col: '#ff8020' }, { name: 'CRITICAL', col: '#ff2020' }
  ];
  const OPLAYS = ['RUN', 'SHORT PASS', 'LONG BOMB'];
  const DPLAYS = ['RUSH', 'ZONE', 'MAN'];
  const SPEED = { QB: 0.085, C: 0.072, LG: 0.072, RG: 0.072, RB: 0.112, WR1: 0.116, WR2: 0.116, DL1: 0.076, DL2: 0.076, DL3: 0.076, LB1: 0.094, LB2: 0.094, CB1: 0.112, CB2: 0.112 };
  const OFORM = { C: [0, -1], LG: [-3, -1], RG: [3, -1], QB: [0, -4], RB: [0, -8], WR1: [-14, -1], WR2: [14, -1] };
  const DFORM = { DL1: [-3, 1.2], DL2: [0, 1.2], DL3: [3, 1.2], LB1: [-6, 5], LB2: [6, 5], CB1: [-14, 6], CB2: [14, 6] };
  // routes: [inward, downfield] offsets from the start spot
  const ROUTES = {
    'RUN': { WR1: [[6, 3]], WR2: [[6, 3]], RB: [[0, 4], [5, 7], [6, 30]] },
    'SHORT PASS': { WR1: [[0, 6], [6, 11], [10, 14]], WR2: [[0, 11], [2, 8]], RB: [[-8, 2], [-10, 6]] },
    'LONG BOMB': { WR1: [[0, 26], [3, 45]], WR2: [[0, 12], [7, 32], [9, 45]], RB: [[0, 2]] }
  };

  ArcadeRegistry.register({
    id: 'cyberball', title: 'Cyberball', year: 1988, maker: 'Atari Games',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move / pick play \u00b7 Space: pass / burst / select \u00b7 X: switch receiver or defender \u00b7 Enter: start',
    marquee: { bg: '#101820', fg: '#40a0ff', accent: '#ff2020' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(50000);
      let mode = 'title', modeT = 0, frame = 0, coinFlash = 0;
      let G = null;
      const snd = {
        hike() { au.tone(220, 0.08, { type: 'square', vol: 0.12 }); au.tone(330, 0.1, { type: 'square', vol: 0.12, delay: 0.1 }); },
        whistle() { au.tone(2400, 0.25, { type: 'sine', vol: 0.12, slideTo: 2200 }); },
        throwB() { au.tone(500, 0.15, { type: 'triangle', vol: 0.1, slideTo: 1200 }); },
        catchB() { au.tone(880, 0.06, { type: 'square', vol: 0.1 }); },
        clank() { au.noise(0.12, { vol: 0.12, freq: 2500, type: 'bandpass' }); au.tone(180, 0.08, { type: 'square', vol: 0.08 }); },
        tackle() { au.noise(0.25, { vol: 0.2, freq: 1200, slideTo: 200 }); au.tone(90, 0.2, { type: 'sawtooth', vol: 0.12, slideTo: 50 }); },
        boom() { au.noise(0.8, { vol: 0.3, freq: 1500, slideTo: 50 }); au.tone(80, 0.6, { type: 'sawtooth', vol: 0.15, slideTo: 30 }); },
        td() { au.melody([[523, .1], [659, .1], [784, .1], [1047, .15], [784, .1], [1047, .4]], { type: 'square', vol: 0.14 }); },
        bad() { au.melody([[330, .15], [262, .3]], { type: 'square', vol: 0.12 }); },
        beep() { au.tone(660, 0.04, { type: 'square', vol: 0.08 }); },
        defuse() { au.melody([[1047, .06], [784, .06], [523, .12]], { type: 'triangle', vol: 0.15 }); },
        warn() { au.tone(1200, 0.06, { type: 'square', vol: 0.06 }); },
        horn() { au.tone(150, 0.6, { type: 'sawtooth', vol: 0.12 }); au.tone(225, 0.6, { type: 'sawtooth', vol: 0.08 }); }
      };
      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; au.tone(90, 0.25, { type: 'square', vol: 0.14 });
        return false;
      }

      // ---------- game setup ----------
      function newGame(demo) {
        G = { demo: !!demo, score: 0, opp: 1, wins: 0, pts: [0, 0], qtr: 1, clock: 60 * 60, poss: 0, los: 25, down: 1, defused: false,
          msg: '', msgT: 0, phase: 'select', phaseT: 0, sel: 0, ot: false, booms: [] };
        startPossession(0, 25);
      }
      const dirOf = team => team === 0 ? 1 : -1;
      function startPossession(team, los) {
        G.poss = team; G.los = clamp(los, 1, 99); G.down = 1;
        // the ball is defused once the offence carries it across midfield
        G.defused = false; G.startSide = team === 0 ? G.los < 50 : G.los > 50;
        toSelect();
      }
      function toSelect() {
        G.phase = 'select'; G.phaseT = 0; G.sel = 0; G.cpuPlay = null;
        G.ball = null; G.robots = null;
      }
      function setupPlay(oplay, dplay) {
        const off = G.poss, def = 1 - off, dir = dirOf(off);
        const opp = TEAMS[G.opp];
        const mul = t => t === 1 ? opp.sk : 1;
        G.robots = [];
        for (const role in OFORM) {
          const [x, dy] = OFORM[role];
          G.robots.push(mkRobot(off, role, x * dir, G.los + dy * dir, SPEED[role] * mul(off)));
        }
        for (const role in DFORM) {
          const [x, dy] = DFORM[role];
          G.robots.push(mkRobot(def, role, x * dir, G.los + dy * dir, SPEED[role] * mul(def)));
        }
        G.oplay = oplay; G.dplay = dplay;
        const qb = byRole(off, 'QB');
        G.ball = { holder: qb, air: null, z: 0 };
        G.ctrl = null;
        if (!G.demo) G.ctrl = off === 0 ? qb : byRole(0, 'LB1');
        G.target = byRole(off, oplay === 'LONG BOMB' ? 'WR1' : oplay === 'SHORT PASS' ? 'WR2' : 'RB');
        // routes (the run play hits a hole either side of the centre)
        G.holeSide = Math.random() < 0.5 ? -1 : 1;
        for (const r of G.robots) {
          if (r.team !== off) continue;
          const rt = ROUTES[oplay][r.role];
          if (rt) {
            const side = r.x === 0 ? (G.holeSide || 1) : -Math.sign(r.x);
            r.route = rt.map(([i, d]) => [r.x + i * side, r.y + d * dir]);
            r.ri = 0;
          }
        }
        G.phase = 'presnap'; G.phaseT = 40; G.playT = 0; G.thrown = false; G.handed = false;
        G.result = null; G.startLos = G.los; G.crossedMid = false; G.handT = 0;
      }
      function mkRobot(team, role, x, y, sp) {
        return { team, role, x, y, vx: 0, vy: 0, sp, eng: null, engBy: null, free: 0, route: null, ri: 0, anim: Math.random() * 10, burst: 0, burstCool: 0, stun: 0, down: false };
      }
      function byRole(team, role) { return G.robots.find(r => r.team === team && r.role === role); }
      function isLine(r) { return r.role === 'C' || r.role === 'LG' || r.role === 'RG'; }
      function isDL(r) { return r.role[0] === 'D'; }
      function carrier() { return G.ball && G.ball.holder; }
      function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
      function moveToward(r, tx, ty, mul) {
        const dx = tx - r.x, dy = ty - r.y, d = Math.hypot(dx, dy);
        let sp = r.sp * (mul || 1);
        if (r.eng) sp *= 0.15;
        if (r.burst > 0) sp *= 1.45;
        if (r.stun > 0) sp = 0;
        if (d < 0.05) { r.vx = 0; r.vy = 0; return; }
        const s = Math.min(sp, d);
        r.vx = dx / d * s; r.vy = dy / d * s;
      }

      // ---------- AI ----------
      function nearestFoe(r, filter) {
        let best = null, bd = 1e9;
        for (const o of G.robots) { if (o.team === r.team || o.down) continue; if (filter && !filter(o)) continue; const d = dist(r, o); if (d < bd) { bd = d; best = o; } }
        return best;
      }
      function openness(rec) {
        let m = 1e9; for (const o of G.robots) if (o.team !== rec.team) m = Math.min(m, dist(o, rec));
        return m;
      }
      function aiOffense(r) {
        const dir = dirOf(r.team), c = carrier(), qb = byRole(r.team, 'QB');
        if (c === r) {
          // ball carrier: head for the end zone, sidestepping tacklers
          let ax = 0;
          for (const o of G.robots) {
            if (o.team === r.team || o.down) continue;
            const dx = r.x - o.x, dy = (o.y - r.y) * dir;
            if (dy > -1 && dy < 7 && Math.abs(dx) < 5) ax += Math.sign(dx || (Math.random() - 0.5)) * (5 - Math.abs(dx)) / (1 + dy);
          }
          if (r.x > HALFW - 3) ax -= 2; if (r.x < -HALFW + 3) ax += 2;
          if (r.role === 'QB' && !G.handed && G.oplay === 'RUN') { moveToward(r, r.x, G.los - dir * 4.5, 0.5); return; }
          if (r.role === 'QB' && !G.thrown && !G.handed && G.oplay !== 'RUN' && (r.y - G.los) * dir < 0) return aiQB(r);
          moveToward(r, r.x + clamp(ax, -3, 3), r.y + dir * 5);
          if (r.burstCool <= 0 && Math.random() < 0.03) { r.burst = 30; r.burstCool = 100; }
          return;
        }
        if (G.ball.air && (r.role === 'WR1' || r.role === 'WR2' || r.role === 'RB') && G.ball.air.target === r) {
          moveToward(r, G.ball.air.tx, G.ball.air.ty); return;
        }
        if (isLine(r) || (G.oplay === 'LONG BOMB' && r.role === 'RB') || (G.oplay === 'RUN' && r.role[0] === 'W' && r.ri >= 1) || (c && c !== qb && c.team === r.team && r.role !== c.role)) {
          // blockers: pick up the nearest free defender between them and the ball
          const ref = c || qb;
          const f = nearestFoe(r, o => !o.engBy || o.engBy === r);
          if (f && dist(f, ref) < 14) {
            const gx = f.x + (ref.x - f.x) * 0.25, gy = f.y + (ref.y - f.y) * 0.25;
            moveToward(r, gx, gy);
            if (dist(r, f) < 1.3 && !f.eng && f.free <= 0 && f !== carrier()) { f.eng = r; f.engBy = r; r.engT = 0; snd.clank(); }
          } else moveToward(r, r.x, r.y + dir * 0.5, 0.5);
          return;
        }
        if (r.route && r.ri < r.route.length) {
          const [tx, ty] = r.route[r.ri];
          moveToward(r, tx, ty);
          if (Math.hypot(tx - r.x, ty - r.y) < 0.6) r.ri++;
          return;
        }
        if (r.role === 'RB' && G.oplay === 'RUN' && !G.handed) { moveToward(r, qb.x + 0.6, qb.y + dir * 0.3); return; }
        // route finished: drift away from the nearest defender
        const f = nearestFoe(r);
        const away = f ? Math.sign(r.x - f.x) || 1 : 0;
        moveToward(r, clamp(r.x + away * 2, -HALFW + 2, HALFW - 2), r.y + dir * 1.5, 0.6);
      }
      function aiQB(r) {
        const dir = dirOf(r.team), iq = r.team === 1 ? TEAMS[G.opp].iq : 0.8;
        // drop back, then look for the most open receiver
        const drop = G.los - dir * 7;
        if ((r.y - drop) * dir > 0.3) moveToward(r, r.x, drop); else r.vx = r.vy = 0;
        if (G.oplay === 'RUN') return;
        const press = nearestFoe(r);
        const pressured = press && dist(press, r) < 2.4;
        const readT = 45 + (1 - iq) * 40;
        if (G.playT > readT || pressured) {
          let best = null, bo = -1;
          for (const role of ['WR1', 'WR2', 'RB']) {
            const rec = byRole(r.team, role); if (!rec || rec.down) continue;
            const o = openness(rec) + ((rec.y - G.los) * dir) * 0.05 * (G.oplay === 'LONG BOMB' ? 2 : 1);
            if (o > bo) { bo = o; best = rec; }
          }
          if (best && (bo > 2.5 - iq || pressured || G.playT > 150)) throwTo(r, best, iq);
          else if (G.playT > 200) { r.route = null; G.oplay = 'RUN'; G.handed = true; }  // scramble
        }
      }
      function aiDefense(r) {
        const off = 1 - r.team, dir = dirOf(off), c = carrier();
        if (r.eng) {
          // engaged with a blocker: fight through
          const br = (r.team === 1 ? 0.0045 * TEAMS[G.opp].sk : 0.0045);
          if (Math.random() < br || !r.eng || dist(r, r.eng) > 2.2) { r.eng.engT = 0; r.eng = null; r.engBy = null; r.free = 50; }
        }
        if (r.free > 0) r.free--;
        const air = G.ball.air;
        if (air) {
          if (Math.hypot(air.tx - r.x, air.ty - r.y) < 10) { moveToward(r, air.tx, air.ty); return; }
        }
        const beyond = c && ((c.y - G.los) * dir > 0.5 || (c.role !== 'QB' && (!G.handT || G.playT - G.handT > 18)));
        if (c && (isDL(r) || beyond || (G.dplay === 'RUSH' && r.role[0] === 'L') || (c.role === 'QB' && G.handed))) {
          // pursuit: aim where the carrier is heading
          const k = Math.min(18, dist(r, c) / Math.max(0.05, r.sp) * 0.5);
          moveToward(r, c.x + c.vx * k, c.y + c.vy * k, 0.93);
          return;
        }
        const qb = byRole(off, 'QB');
        const cover = { CB1: 'WR1', CB2: 'WR2', LB1: 'RB', LB2: 'QB' }[r.role];
        if (G.dplay === 'ZONE') {
          const home = r.role[0] === 'C' ? [Math.sign(r.x || 1) * 10, G.los + dir * 15] : [Math.sign(r.x || 1) * 5, G.los + dir * 7];
          let tgt = null, td = 7;
          for (const o of G.robots) if (o.team === off && o.role !== 'QB' && !isLine(o)) { const d = Math.hypot(o.x - home[0], o.y - home[1]); if (d < td) { td = d; tgt = o; } }
          if (tgt) moveToward(r, tgt.x, tgt.y + dir * 1.2); else moveToward(r, home[0], home[1]);
          return;
        }
        const m = byRole(off, cover);
        if (m && cover !== 'QB') moveToward(r, m.x + m.vx * 4, m.y + m.vy * 4 - dir * 0.9, 0.97);
        else if (qb) moveToward(r, qb.x, G.los + dir * 4, 0.6);
      }

      // ---------- passing ----------
      function throwTo(qb, rec, acc) {
        const sp = 0.5;
        let tx = rec.x, ty = rec.y;
        for (let i = 0; i < 3; i++) { const t = Math.hypot(tx - qb.x, ty - qb.y) / sp; tx = rec.x + rec.vx * t; ty = rec.y + rec.vy * t; }
        const err = (1 - acc) * 3;
        tx = clamp(tx + rand(-err, err), -HALFW - 1, HALFW + 1); ty += rand(-err, err);
        const d = Math.hypot(tx - qb.x, ty - qb.y);
        G.ball.air = { x0: qb.x, y0: qb.y, tx, ty, t: 0, dur: Math.max(10, d / sp), target: rec, team: qb.team };
        G.ball.holder = null; G.thrown = true;
        snd.throwB();
      }
      function resolveCatch() {
        const A = G.ball.air;
        let bestO = null, bo = 1.6, bestD = null, bd = 1.2;
        for (const r of G.robots) {
          if (r.down || r.stun > 0) continue;
          const d = Math.hypot(r.x - A.tx, r.y - A.ty);
          if (r.team === A.team && r.role !== 'QB' && d < bo) { bo = d; bestO = r; }
          if (r.team !== A.team && d < bd) { bd = d; bestD = r; }
        }
        G.ball.air = null;
        if (bestD && (!bestO || bd < bo - 0.4) && Math.random() < 0.35) { endPlay('int', bestD); return; }
        if (bestD && bestO && bd < 1.0 && Math.random() < 0.4) { endPlay('inc'); return; }
        if (bestO && Math.random() < 0.92) {
          G.ball.holder = bestO; snd.catchB();
          if (G.ctrl && G.ctrl.team === bestO.team && !G.demo) G.ctrl = bestO;
          return;
        }
        endPlay('inc');
      }

      // ---------- live play ----------
      function updateLive() {
        G.playT++;
        if (G.clock > 0) G.clock--;
        const off = G.poss, dir = dirOf(off), c = carrier();
        // player control
        const me = G.ctrl;
        if (me && !G.demo) {
          let mx = 0, my = 0;
          if (api.key('ArrowLeft')) mx--; if (api.key('ArrowRight')) mx++;
          if (api.key('ArrowUp')) my++; if (api.key('ArrowDown')) my--;
          const l = Math.hypot(mx, my) || 1;
          let sp = me.sp * 1.04; if (me.eng) sp *= 0.25; if (me.burst > 0) sp *= 1.45; if (me.stun > 0) sp = 0;
          me.vx = mx / l * sp; me.vy = my / l * sp;
          if (me.eng && api.pressed('Space') && Math.random() < 0.3) { me.eng.engT = 0; me.eng = null; me.engBy = null; me.free = 40; }
          if (me.team === off) {
            const canThrow = me.role === 'QB' && c === me && !G.thrown && (me.y - G.los) * dir < 0.5;
            if (canThrow && api.pressed('KeyX')) {
              const opts = ['WR1', 'WR2', 'RB'].map(rl => byRole(off, rl));
              const i = opts.indexOf(G.target); G.target = opts[(i + 1) % 3]; snd.beep();
            }
            if (api.pressed('Space')) {
              if (canThrow && G.oplay !== 'RUN') throwTo(me, G.target, 0.97);
              else if (me.burstCool <= 0) { me.burst = 30; me.burstCool = 90; }
            }
          } else {
            if (api.pressed('KeyX')) {
              const ref = c || (G.ball.air ? { x: G.ball.air.tx, y: G.ball.air.ty } : me);
              let best = me, bd = 1e9;
              for (const r of G.robots) if (r.team === me.team && !r.down) { const d = Math.hypot(r.x - ref.x, r.y - ref.y); if (d < bd) { bd = d; best = r; } }
              G.ctrl = best; snd.beep();
            }
            if (api.pressed('Space') && me.burstCool <= 0) { me.burst = 22; me.burstCool = 70; }
          }
        }
        // handoff on run plays
        if (G.oplay === 'RUN' && !G.handed && c && c.role === 'QB') {
          const rb = byRole(off, 'RB');
          if (G.playT > 12 && dist(rb, c) < 1.6) {
            G.ball.holder = rb; G.handed = true; G.handT = G.playT; rb.burst = 45; rb.burstCool = 120; snd.catchB();
            if (G.ctrl === c) G.ctrl = rb;
          } else if (G.playT > 90) G.handed = true;   // keeper
        }
        for (const r of G.robots) {
          if (r.burst > 0) r.burst--; if (r.burstCool > 0) r.burstCool--; if (r.stun > 0) r.stun--;
          if (r === G.ctrl && !G.demo) continue;
          if (r.team === off) { if (r.role === 'QB' && carrier() === r && !G.handed && !G.thrown && G.oplay !== 'RUN') aiQB(r); else if (r.role === 'QB' && carrier() !== r) moveToward(r, r.x, r.y, 0); else aiOffense(r); }
          else aiDefense(r);
        }
        // integrate and keep robots from overlapping
        for (const r of G.robots) {
          r.x += r.vx; r.y += r.vy;
          if (r.vx || r.vy) r.anim += 0.25;
          r.y = clamp(r.y, -12, 112);
          if (r !== carrier()) r.x = clamp(r.x, -HALFW - 2, HALFW + 2);
        }
        for (let i = 0; i < G.robots.length; i++) for (let j = i + 1; j < G.robots.length; j++) {
          const a = G.robots[i], b = G.robots[j], d = dist(a, b);
          if (a.team === b.team && (a === carrier() || b === carrier())) continue;
          if (d > 0.001 && d < 0.9) { const p = (0.9 - d) / 2, ux = (a.x - b.x) / d, uy = (a.y - b.y) / d; a.x += ux * p; a.y += uy * p; b.x -= ux * p; b.y -= uy * p; }
        }
        // blockers stay engaged with their man
        for (const r of G.robots) if (r.eng) { r.eng.vx = r.vx; }
        // ball in flight
        if (G.ball.air) {
          const A = G.ball.air; A.t++;
          if (A.t >= A.dur) resolveCatch();
        }
        const cc = carrier();
        if (!cc || G.phase !== 'live') return;
        // midfield: the ball cools down
        if (!G.crossedMid && !G.defused && G.startSide && (cc.y - 50) * dir > 0) {
          G.crossedMid = true; G.defused = true; G.msg = 'BALL DEFUSED'; G.msgT = 90; snd.defuse();
        }
        // touchdown / out of bounds / tackle
        if ((dir > 0 && cc.y >= 100) || (dir < 0 && cc.y <= 0)) { endPlay('td', cc); return; }
        if (Math.abs(cc.x) > HALFW + 0.5) { endPlay('oob', cc); return; }
        for (const r of G.robots) {
          if (r.team === cc.team || r.down || r.eng || r.stun > 0) continue;
          if (dist(r, cc) < (r.burst > 0 ? 1.15 : 0.95)) { endPlay('tackle', cc, r); return; }
        }
        if (G.playT > 60 * 25) endPlay('tackle', cc);
      }
      function endPlay(kind, who, by) {
        if (G.phase !== 'live') return;
        G.phase = 'whistle'; G.phaseT = 110; G.result = kind;
        const off = G.poss, dir = dirOf(off);
        const spot = who ? who.y : G.los;
        G.endSpot = spot;
        for (const r of G.robots) { r.vx = r.vy = 0; r.eng = null; r.engBy = null; }
        const gain = (spot - G.los) * dir;
        if (kind === 'td') {
          G.pts[off] += 7; G.msg = 'TOUCHDOWN!'; G.msgT = 110; snd.td();
          if (off === 0 && !G.demo) addScore(7000);
        } else if (kind === 'int') {
          G.msg = 'INTERCEPTED!'; G.msgT = 110; snd.bad(); G.ball.holder = who;
          if (off === 1 && !G.demo) addScore(2000);
        } else if (kind === 'inc') {
          G.msg = 'INCOMPLETE'; G.msgT = 90; snd.whistle();
        } else {
          G.ball.holder = who;
          const own = (dir > 0 && spot < 0) || (dir < 0 && spot > 100);
          if (own) { G.result = 'safety'; G.pts[1 - off] += 2; G.msg = 'SAFETY'; G.msgT = 110; snd.bad(); }
          else if (G.down >= 4 && !G.crossedMid) {
            G.result = 'explode'; G.msg = 'BALL EXPLODES!'; G.msgT = 110; snd.boom();
            who.down = true; G.booms.push({ x: who.x, y: who.y, t: 0 });
          } else {
            G.msg = kind === 'oob' ? 'OUT OF BOUNDS' : (who && who.role === 'QB' && gain < 0) ? 'SACKED!' : 'TACKLED  ' + (gain >= 0 ? '+' : '') + Math.round(gain) + ' YDS';
            G.msgT = 90; kind === 'oob' ? snd.whistle() : snd.tackle();
            if (by && !G.demo && off === 1 && who.role === 'QB') addScore(500);
          }
        }
        if (!G.demo && off === 0 && gain > 0 && kind !== 'int' && kind !== 'inc') addScore(Math.round(gain) * 10);
        G.clock = Math.max(0, G.clock - 60 * 3);
      }
      function resolvePlay() {
        const off = G.poss, dir = dirOf(off), k = G.result;
        if (k === 'td') { startPossession(1 - off, off === 0 ? 75 : 25); return; }
        if (k === 'safety') { startPossession(1 - off, off === 0 ? 70 : 30); return; }
        if (k === 'int' || k === 'explode') { startPossession(1 - off, clamp(G.endSpot, 5, 95)); return; }
        if (k !== 'inc') G.los = clamp(G.endSpot, 1, 99);
        if (G.crossedMid) { G.down = 1; G.startSide = false; G.crossedMid = false; return toSelect(); }
        if (G.down >= 4) {
          G.msg = 'TURNOVER ON DOWNS'; G.msgT = 90; startPossession(1 - off, G.los); return;
        }
        G.down++;
        if (G.down === 4) snd.warn();
        void dir;
        toSelect();
      }
      function addScore(n) { if (G.demo) return; G.score += n; if (G.score > hi) hi = G.score; }

      // ---------- quarters ----------
      function endQuarter() {
        snd.horn();
        G.phase = 'quarter'; G.phaseT = 180;
      }
      function afterQuarter() {
        if (G.demo) { if (G.qtr >= 4) { newGame(true); return; } G.qtr++; G.clock = 60 * 60; toSelect(); return; }
        const behind = G.pts[0] < G.pts[1];
        if (G.qtr >= 4 && G.pts[0] !== G.pts[1] && !behind) {
          // victory: on to a tougher team
          G.phase = 'win'; G.phaseT = 300; addScore(20000 + G.pts[0] * 100); G.wins++; snd.td();
          return;
        }
        const next = () => { G.qtr++; G.clock = 60 * 60; if (G.qtr > 4) G.ot = true; toSelect(); };
        if (behind && api.offerContinue) { G.phase = 'hold'; api.offerContinue(next, gameOver); }
        else if (behind && G.qtr >= 4) gameOver();
        else next();
      }
      function gameOver() {
        api.setHiScore(G.score);
        G.phase = 'over'; G.phaseT = 420;
        au.melody([[330, .2], [294, .2], [262, .2], [196, .6]], { type: 'square', vol: 0.12 });
      }

      // ---------- main update ----------
      function update() {
        frame++; modeT++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          if (!G || !G.demo) newGame(true);
          step();
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; modeT = 0; newGame(false); }
          return;
        }
        step();
      }
      function step() {
        if (G.msgT > 0) G.msgT--;
        for (const b of G.booms) b.t++;
        G.booms = G.booms.filter(b => b.t < 60);
        switch (G.phase) {
          case 'select': {
            G.phaseT++;
            const off = G.poss === 0;
            if (G.demo || !off) {
              if (!G.cpuPick) G.cpuPick = irand(0, 2);
            }
            if (!G.demo) {
              if (api.pressed('ArrowLeft')) { G.sel = (G.sel + 2) % 3; snd.beep(); }
              if (api.pressed('ArrowRight')) { G.sel = (G.sel + 1) % 3; snd.beep(); }
            }
            const go = G.demo ? G.phaseT > 60 : (api.pressed('Space') && G.phaseT > 15) || G.phaseT > 600;
            if (go) {
              const cpu = irand(0, 2);
              const mine = G.demo ? irand(0, 2) : G.sel;
              if (G.poss === 0) setupPlay(OPLAYS[mine], DPLAYS[cpu]);
              else setupPlay(OPLAYS[cpu], DPLAYS[mine]);
              G.cpuPick = 0;
            }
            break;
          }
          case 'presnap':
            if (--G.phaseT <= 0) { G.phase = 'live'; snd.hike(); }
            break;
          case 'live':
            updateLive();
            break;
          case 'whistle':
            if (--G.phaseT <= 0) {
              const clockOut = G.clock <= 0;
              resolvePlay();
              if (clockOut) endQuarter();
            }
            break;
          case 'quarter':
            if (--G.phaseT <= 0) afterQuarter();
            break;
          case 'win':
            if (--G.phaseT <= 0) {
              G.opp = G.opp + 1 >= TEAMS.length ? 1 : G.opp + 1;
              G.pts = [0, 0]; G.qtr = 1; G.clock = 60 * 60; G.ot = false;
              startPossession(0, 25);
            }
            break;
          case 'over':
            if (--G.phaseT <= 0 || (G.phaseT < 240 && api.anyPressed('Enter'))) { mode = 'title'; modeT = 0; G = null; }
            break;
        }
      }

      // ---------- drawing ----------
      let camY = 30;
      const sx = x => Math.round(FX + x * YD);
      const sy = y => Math.round(HUD + (H - HUD) / 2 + (camY - y) * YD);
      function drawField(ctx) {
        ctx.fillStyle = '#103018'; ctx.fillRect(0, HUD, W, H - HUD);
        // turf stripes every 5 yards
        for (let y = -10; y < 110; y += 5) {
          const a = sy(y + 5), b = sy(y);
          if (b < HUD || a > H) continue;
          ctx.fillStyle = ((y / 5) & 1) ? '#164020' : '#13381c';
          ctx.fillRect(sx(-HALFW), a, HALFW * 2 * YD, b - a);
        }
        // end zones
        const ez = (y0, y1, team) => {
          const a = sy(y1), b = sy(y0);
          ctx.fillStyle = team === 0 ? '#102060' : '#501010'; ctx.fillRect(sx(-HALFW), a, HALFW * 2 * YD, b - a);
          const n = TEAMS[team === 0 ? 0 : G.opp].name;
          text(ctx, n, FX, Math.round((a + b) / 2) - 3, team === 0 ? '#80a0ff' : '#ff8080', 1, 'center');
        };
        ez(-10, 0, 0); ez(100, 110, 1);
        // yard lines and numbers
        for (let y = 0; y <= 100; y += 5) {
          const py = sy(y); if (py < HUD - 2 || py > H + 2) continue;
          ctx.fillStyle = y === 50 ? '#ffe040' : '#c0e0c0';
          ctx.fillRect(sx(-HALFW), py, HALFW * 2 * YD, 1);
          if (y % 10 === 0 && y > 0 && y < 100) {
            const n = String(y <= 50 ? y : 100 - y);
            text(ctx, n, sx(-HALFW) + 4, py - 3, '#a0c0a0');
            text(ctx, n, sx(HALFW) - 4, py - 3, '#a0c0a0', 1, 'right');
          }
          for (let x = -HALFW + 2; x < HALFW; x += 4) { ctx.fillStyle = '#80a080'; ctx.fillRect(sx(x), py - 2, 1, 1); }
        }
        // sidelines
        ctx.fillStyle = '#e0e0e0'; ctx.fillRect(sx(-HALFW) - 1, HUD, 1, H - HUD); ctx.fillRect(sx(HALFW), HUD, 1, H - HUD);
        ctx.fillStyle = '#202830'; ctx.fillRect(0, HUD, sx(-HALFW) - 1, H - HUD); ctx.fillRect(sx(HALFW) + 1, HUD, W, H - HUD);
        for (let y = HUD + ((frame >> 2) % 6); y < H; y += 6) { ctx.fillStyle = '#304050'; ctx.fillRect(4, y, 16, 2); ctx.fillRect(W - 20, y, 16, 2); }
      }
      function drawRobot(ctx, r, highlight) {
        const T = TEAMS[r.team === 0 ? 0 : G.opp];
        const x = sx(r.x), y = sy(r.y);
        if (y < HUD - 16 || y > H + 16) return;
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x - 5, y - 1, 10, 3);
        if (r.down) { ctx.fillStyle = '#303030'; ctx.fillRect(x - 6, y - 4, 12, 4); ctx.fillStyle = T.body; ctx.fillRect(x - 4, y - 5, 8, 2); return; }
        const step = Math.floor(r.anim) & 1;
        // legs
        ctx.fillStyle = '#606878';
        ctx.fillRect(x - 3, y - 4 - (step ? 1 : 0), 2, 4); ctx.fillRect(x + 1, y - 4 - (step ? 0 : 1), 2, 4);
        // torso with shoulder pads
        ctx.fillStyle = T.body; ctx.fillRect(x - 4, y - 10, 8, 6);
        ctx.fillStyle = T.trim; ctx.fillRect(x - 5, y - 11, 3, 2); ctx.fillRect(x + 2, y - 11, 3, 2); ctx.fillRect(x - 1, y - 9, 2, 4);
        // arms
        ctx.fillStyle = '#808898'; ctx.fillRect(x - 6, y - 9 + step, 2, 4); ctx.fillRect(x + 4, y - 9 + (1 - step), 2, 4);
        // dome head with visor
        ctx.fillStyle = '#a0a8b8'; ctx.fillRect(x - 2, y - 14, 4, 3);
        ctx.fillStyle = T.visor; ctx.fillRect(x - 2, y - 13, 4, 1);
        if (r.eng && (frame & 4)) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 16, 2, 1); }
        if (highlight) {
          ctx.fillStyle = (frame & 8) ? '#ffffff' : '#ffe040';
          ctx.fillRect(x - 1, y - 20, 3, 1); ctx.fillRect(x, y - 19, 1, 2);
        }
      }
      function drawBall(ctx) {
        const B = G.ball; if (!B) return;
        const temp = TEMP[Math.min(3, G.down - 1)];
        let bx, by, h = 0;
        if (B.air) {
          const A = B.air, u = A.t / A.dur;
          bx = A.x0 + (A.tx - A.x0) * u; by = A.y0 + (A.ty - A.y0) * u; h = Math.sin(u * Math.PI) * Math.min(14, A.dur * 0.25);
          ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(sx(bx) - 2, sy(by) - 1, 4, 2);
        } else if (B.holder) { bx = B.holder.x + 0.6; by = B.holder.y; h = 7; }
        else return;
        const x = sx(bx), y = sy(by) - Math.round(h) - 2;
        ctx.fillStyle = G.down >= 4 && (frame & 4) && !G.crossedMid ? '#ffffff' : temp.col;
        ctx.fillRect(x - 2, y - 1, 5, 3); ctx.fillRect(x - 1, y - 2, 3, 5);
        ctx.fillStyle = '#402010'; ctx.fillRect(x, y, 1, 1);
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#081018'; ctx.fillRect(0, 0, W, HUD);
        ctx.fillStyle = '#40a0ff'; ctx.fillRect(0, HUD - 1, W, 1);
        const opp = TEAMS[G.opp];
        text(ctx, 'HAM', 2, 2, '#80a0ff'); text(ctx, pad(G.pts[0], 2), 22, 2, '#fff');
        text(ctx, opp.name.slice(0, 3), 2, 10, '#ff8080'); text(ctx, pad(G.pts[1], 2), 22, 10, '#fff');
        const secs = Math.ceil(G.clock / 60);
        text(ctx, (G.ot ? 'OT' : 'Q' + G.qtr) + ' ' + Math.floor(secs / 60) + ':' + pad(secs % 60, 2), 40, 2, '#ffe040');
        const temp = TEMP[Math.min(3, G.down - 1)];
        text(ctx, 'DOWN ' + G.down, 40, 10, '#fff');
        text(ctx, 'BALL', 100, 2, '#a0a0a0'); text(ctx, temp.name, 100, 10, G.down >= 4 && (frame & 8) ? '#fff' : temp.col);
        const yl = G.los <= 50 ? G.los : 100 - G.los;
        text(ctx, (G.los < 50 ? 'OWN ' : G.los > 50 ? 'OPP ' : 'MID ') + Math.round(yl), 156, 2, '#a0c0a0');
        text(ctx, pad(G.score, 7), W - 2, 2, '#fff', 1, 'right');
        text(ctx, 'HI ' + pad(hi, 7), W - 2, 10, '#40a0ff', 1, 'right');
      }
      function drawSelect(ctx) {
        const off = G.poss === 0;
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(10, 60, W - 20, 110);
        ctx.strokeStyle = '#40a0ff'; ctx.strokeRect(10.5, 60.5, W - 21, 109);
        stext(ctx, off ? 'OFFENSE - CHOOSE PLAY' : 'DEFENSE - CHOOSE PLAY', W / 2, 68, off ? '#80a0ff' : '#ff8080', 1, 'center');
        const names = off ? OPLAYS : DPLAYS;
        for (let i = 0; i < 3; i++) {
          const x = 18 + i * 76, y = 84, sel = i === G.sel;
          ctx.fillStyle = sel ? '#204080' : '#102030'; ctx.fillRect(x, y, 68, 54);
          if (sel && (frame & 8)) { ctx.strokeStyle = '#ffe040'; ctx.strokeRect(x + 0.5, y + 0.5, 67, 53); }
          // little play diagram
          ctx.fillStyle = '#80a0ff';
          for (const dx of [-8, 0, 8]) ctx.fillRect(x + 34 + dx - 1, y + 40, 3, 3);
          ctx.fillStyle = '#ffe040';
          if (off) {
            if (i === 0) { ctx.fillRect(x + 33, y + 14, 2, 24); ctx.fillRect(x + 31, y + 14, 6, 2); }
            else if (i === 1) { ctx.fillRect(x + 12, y + 26, 2, 14); ctx.fillRect(x + 12, y + 26, 14, 2); ctx.fillRect(x + 54, y + 22, 2, 18); ctx.fillRect(x + 50, y + 22, 6, 2); }
            else { ctx.fillRect(x + 10, y + 6, 2, 34); ctx.fillRect(x + 56, y + 16, 2, 24); ctx.fillRect(x + 46, y + 8, 10, 2); }
          } else {
            ctx.fillStyle = '#ff8080';
            if (i === 0) { for (const dx of [-12, -4, 4, 12]) ctx.fillRect(x + 34 + dx, y + 22, 2, 14); }
            else if (i === 1) { ctx.strokeStyle = '#ff8080'; ctx.strokeRect(x + 6.5, y + 6.5, 24, 14); ctx.strokeRect(x + 36.5, y + 6.5, 24, 14); }
            else { for (const dx of [-24, 0, 24]) { ctx.fillRect(x + 34 + dx - 3, y + 16, 7, 2); ctx.fillRect(x + 34 + dx, y + 16, 2, 8); } }
          }
          text(ctx, names[i], x + 34, y + 46, sel ? '#fff' : '#a0a0a0', 1, 'center');
        }
        text(ctx, 'LEFT/RIGHT  SPACE TO CALL', W / 2, 148, '#a0c0ff', 1, 'center');
        const temp = TEMP[Math.min(3, G.down - 1)];
        text(ctx, 'DOWN ' + G.down + '  BALL ' + temp.name + (G.startSide && !G.defused ? '  CROSS 50 TO DEFUSE' : ''), W / 2, 158, temp.col, 1, 'center');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (!G) newGame(true);
        // camera follows the ball
        let fy = G.los;
        if (G.ball && G.ball.air) { const A = G.ball.air, u = A.t / A.dur; fy = A.y0 + (A.ty - A.y0) * u; }
        else if (G.ball && G.ball.holder) fy = G.ball.holder.y;
        const half = (H - HUD) / 2 / YD;
        camY += (clamp(fy + dirOf(G.poss) * 6, -10 + half, 110 - half) - camY) * 0.12;
        drawField(ctx);
        if (G.robots) {
          // line of scrimmage
          ctx.fillStyle = '#40a0ff'; ctx.fillRect(sx(-HALFW), sy(G.los), HALFW * 2 * YD, 1);
          const list = G.robots.slice().sort((a, b) => b.y - a.y);
          for (const r of list) drawRobot(ctx, r, r === G.ctrl && !G.demo);
          // pass target marker
          if (G.ctrl && G.ctrl.role === 'QB' && carrier() === G.ctrl && !G.thrown && G.oplay !== 'RUN' && G.target && G.poss === 0) {
            const t = G.target, x = sx(t.x), y = sy(t.y);
            ctx.strokeStyle = (frame & 4) ? '#ffe040' : '#ff8020'; ctx.strokeRect(x - 7.5, y - 17.5, 15, 19);
          }
          drawBall(ctx);
        } else {
          ctx.fillStyle = '#40a0ff'; ctx.fillRect(sx(-HALFW), sy(G.los), HALFW * 2 * YD, 1);
        }
        for (const b of G.booms) {
          const r = 4 + b.t * 0.6, x = sx(b.x), y = sy(b.y) - 6;
          ctx.fillStyle = b.t < 10 ? '#fff' : b.t < 25 ? '#ffe040' : b.t < 40 ? '#ff6020' : '#602010';
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
        if (mode === 'title') { renderTitle(ctx); return; }
        drawHUD(ctx);
        if (G.msgT > 0) stext(ctx, G.msg, W / 2, 34, G.result === 'td' ? ((frame & 8) ? '#ffe040' : '#fff') : '#fff', G.result === 'td' || G.result === 'explode' ? 2 : 1, 'center');
        if (G.phase === 'select') drawSelect(ctx);
        if (G.phase === 'presnap') stext(ctx, G.poss === 0 ? (G.oplay === 'RUN' ? 'HANDOFF TO RB' : 'X: PICK RECEIVER  SPACE: PASS') : 'X: SWITCH  SPACE: DIVE', W / 2, H - 12, '#ffe040', 1, 'center');
        if (G.phase === 'quarter') {
          ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(20, 80, W - 40, 60);
          stext(ctx, (G.ot ? 'OVERTIME' : 'QUARTER ' + G.qtr) + ' OVER', W / 2, 90, '#ffe040', 1, 'center');
          stext(ctx, 'HAMMERS ' + G.pts[0] + '  ' + TEAMS[G.opp].name + ' ' + G.pts[1], W / 2, 108, '#fff', 1, 'center');
          if (G.pts[0] < G.pts[1]) stext(ctx, 'YOU ARE BEHIND!', W / 2, 124, '#ff4040', 1, 'center');
        }
        if (G.phase === 'win') {
          ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(10, 70, W - 20, 80);
          stext(ctx, 'VICTORY!', W / 2, 80, '#ffe040', 3, 'center');
          stext(ctx, 'HAMMERS ' + G.pts[0] + '  ' + TEAMS[G.opp].name + ' ' + G.pts[1], W / 2, 110, '#fff', 1, 'center');
          stext(ctx, 'NEXT: ' + TEAMS[G.opp + 1 >= TEAMS.length ? 1 : G.opp + 1].name, W / 2, 126, '#80a0ff', 1, 'center');
        }
        if (G.phase === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 90, W, 50);
          stext(ctx, 'GAME OVER', W / 2, 102, '#ff2020', 3, 'center');
        }
      }
      function renderTitle(ctx) {
        ctx.fillStyle = 'rgba(0,0,10,0.6)'; ctx.fillRect(0, 30, W, 110);
        const t = 'CYBERBALL';
        for (let i = 0; i < t.length; i++) {
          const x = W / 2 - t.length * 13 + i * 26 + 1, wob = Math.round(Math.sin(frame * 0.07 + i * 0.6) * 2);
          text(ctx, t[i], x + 2, 44 + wob, '#102040', 4);
          text(ctx, t[i], x, 42 + wob, '#40a0ff', 4);
          ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x, 42 + wob, 20, 4);
        }
        stext(ctx, 'FOOTBALL IN THE 21ST CENTURY', W / 2, 78, '#ffe040', 1, 'center');
        const page = Math.floor(modeT / 360) % 2;
        if (page === 0) {
          stext(ctx, 'CROSS MIDFIELD TO DEFUSE THE BALL', W / 2, 94, '#fff', 1, 'center');
          stext(ctx, 'OR IT EXPLODES ON 4TH DOWN!', W / 2, 106, '#ff4040', 1, 'center');
        } else {
          stext(ctx, 'HIGH SCORE ' + pad(hi, 7), W / 2, 94, '#40a0ff', 1, 'center');
          stext(ctx, 'BEAT ALL FIVE ROBOT TEAMS', W / 2, 106, '#fff', 1, 'center');
        }
        const blink = (frame >> 5) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) stext(ctx, 'INSERT COIN', W / 2, 122, '#fff', 1, 'center'); }
        else if (blink) stext(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 122, '#ffe040', 1, 'center');
        ctx.fillStyle = '#081018'; ctx.fillRect(0, 0, W, HUD);
        text(ctx, '\u00a9 1988 ATARI GAMES', 4, 6, '#40a0ff');
        text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), W - 4, 6, '#fff', 1, 'right');
      }
      return { update, render, destroy() { } };
    }
  });
})();
