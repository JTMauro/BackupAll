// Hoops Jam - a from-scratch 2-on-2 arcade basketball game in the style of the 1993 coin-op classics:
// turbo, monster dunks, shoves, goaltending allowed, and players who catch fire after three straight baskets.
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
  FONT['#'] = [10, 10, 31, 10, 31, 10, 10];
  FONT['&'] = [12, 18, 20, 8, 21, 18, 13];

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // Original teams. Ratings 1..9: spd, sht (2pt), thr (3pt), dnk, def
  const TEAMS = [
    { name: 'HARBOR HAWKS', ab: 'HAW', c1: '#c81e2a', c2: '#ffffff', p: [{ n: 'B.KANE', s: '#8a5a3a', r: [7, 6, 5, 8, 6] }, { n: 'T.ROWE', s: '#f0c8a0', r: [6, 7, 8, 4, 5] }] },
    { name: 'METRO BLAZE', ab: 'BLZ', c1: '#ff7a10', c2: '#202020', p: [{ n: 'J.STONE', s: '#5a3820', r: [8, 6, 6, 7, 6] }, { n: 'R.DIAZ', s: '#d8a070', r: [7, 7, 7, 5, 6] }] },
    { name: 'DESERT VIPERS', ab: 'VIP', c1: '#7a2ad0', c2: '#30d0a0', p: [{ n: 'K.MOSS', s: '#6a4028', r: [6, 8, 7, 6, 5] }, { n: 'L.PRATT', s: '#f0c8a0', r: [5, 6, 9, 3, 6] }] },
    { name: 'NORTH KNIGHTS', ab: 'KNI', c1: '#2050c0', c2: '#e0e0e0', p: [{ n: 'D.HALE', s: '#7a4a2a', r: [6, 6, 5, 9, 7] }, { n: 'M.FINN', s: '#f0c8a0', r: [7, 7, 6, 5, 7] }] },
    { name: 'BAYOU GATORS', ab: 'GAT', c1: '#208a30', c2: '#f0e040', p: [{ n: 'A.BOONE', s: '#4a3018', r: [9, 5, 4, 8, 6] }, { n: 'C.LEROY', s: '#c89060', r: [7, 7, 6, 6, 6] }] },
    { name: 'SUMMIT YETIS', ab: 'YET', c1: '#e0f0ff', c2: '#3070c0', p: [{ n: 'O.BERG', s: '#f0d0b0', r: [5, 8, 6, 7, 8] }, { n: 'S.WADE', s: '#6a4028', r: [8, 7, 7, 6, 6] }] },
    { name: 'COAST SHARKS', ab: 'SHK', c1: '#20a0b0', c2: '#202838', p: [{ n: 'P.REEF', s: '#8a5a3a', r: [8, 6, 8, 5, 6] }, { n: 'G.TIDE', s: '#e8b890', r: [6, 6, 6, 9, 7] }] },
    { name: 'CAPITAL COMETS', ab: 'COM', c1: '#202048', c2: '#ffc820', p: [{ n: 'V.NOVA', s: '#5a3820', r: [9, 8, 7, 8, 7] }, { n: 'E.STARR', s: '#f0c8a0', r: [8, 8, 9, 6, 8] }] }
  ];

  ArcadeRegistry.register({
    id: 'nbajam', title: 'Hoops Jam', year: 1993, maker: 'Original',
    width: 320, height: 240, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Space: shoot (release at the top) / jump-block \u00b7 X: pass / steal \u00b7 Z/Shift or double-tap: turbo (turbo+X shove, turbo+shoot near rim: dunk) \u00b7 Enter: start',
    marquee: { bg: '#10102a', fg: '#ff7a10', accent: '#30a0ff' },
    create(api) {
      const W = 320, H = 240, CL = 560, CD = 100, HOOPX = [30, 530], RIM = 58, G = 0.55;
      const attackHoop = t => t === 0 ? 1 : 0;
      let hi = api.getHiScore(150);
      let mode = 'title', modeT = 0, coinFlash = 0;
      let myTeam = 0, selIdx = 0, ladder = [], round = 0, totalPts = 0, wins = 0;
      let g = null, camX = CL / 2, shake = 0, banner = '', bannerT = 0, bannerCol = '#fff';
      let parts = [], crowd = [], flash = [];
      let lastDir = { ArrowLeft: -99, ArrowRight: -99, ArrowUp: -99, ArrowDown: -99 }, latch = false;

      { let s = 99; const r = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
        const cols = ['#c83a3a', '#3a5ac8', '#e0c050', '#e0e0e0', '#3aa050', '#a050c0', '#e08040', '#806050'];
        for (let i = 0; i < 520; i++) crowd.push([r() * 760 - 100, 26 + r() * 62, cols[r() * cols.length | 0], r()]); }

      const snd = {
        bounce() { api.audio.tone(110, 0.05, { type: 'triangle', vol: 0.18 }); },
        swish() { api.audio.noise(0.25, { vol: 0.18, freq: 4000, slideTo: 1500, type: 'bandpass' }); },
        rim() { api.audio.tone(330, 0.12, { type: 'square', vol: 0.12, slideTo: 260 }); },
        dunk() { api.audio.noise(0.5, { vol: 0.3, freq: 900, slideTo: 60 }); api.audio.tone(90, 0.4, { type: 'sawtooth', vol: 0.15, slideTo: 40 }); },
        steal() { api.audio.tone(900, 0.06, { type: 'square', vol: 0.12, slideTo: 1400 }); },
        shove() { api.audio.noise(0.15, { vol: 0.22, freq: 700 }); },
        horn() { api.audio.tone(196, 0.8, { type: 'sawtooth', vol: 0.14 }); api.audio.tone(247, 0.8, { type: 'sawtooth', vol: 0.1 }); },
        fire() { api.audio.melody([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.08], [1319, 0.25]], { type: 'square', vol: 0.14 }); api.audio.noise(0.8, { vol: 0.12, freq: 2500, slideTo: 300 }); },
        cheer() { api.audio.noise(0.9, { vol: 0.1, freq: 1800, type: 'bandpass' }); },
        jump() { api.audio.tone(220, 0.06, { type: 'triangle', vol: 0.08, slideTo: 330 }); },
        beep(f) { api.audio.tone(f || 660, 0.05, { type: 'square', vol: 0.12 }); }
      };
      function say(t, col, n) { banner = t; bannerCol = col || '#fff'; bannerT = n || 90; }

      // ---------------- game setup ----------------
      function mkPlayer(team, k, T, human) {
        const d = T.p[k];
        return {
          team, k, T, d, name: d.n, human, spd: d.r[0], sht: d.r[1], thr: d.r[2], dnk: d.r[3], def: d.r[4],
          x: CL / 2, z: 50, h: 0, vx: 0, vz: 0, vh: 0, face: 1, down: 0, turbo: 100, fire: 0, fireBaskets: 0, streak: 0,
          act: null, actT: 0, cool: 0, ai: { tx: 0, tz: 0, t: 0, rel: 0, blocked: false }, ix: 0, iz: 0, tb: false, run: 0, wantPass: 0
        };
      }
      function newGame(t0, t1, demo, level) {
        g = {
          teams: [TEAMS[t0], TEAMS[t1]], score: [0, 0], q: 1, clock: 120, shot: 24, demo, level, poss: -1, lastScorer: -1,
          players: [], ball: { x: CL / 2, z: 50, h: 40, vx: 0, vz: 0, vh: 0, owner: null, mode: 'loose', t: 0 }
        };
        g.players.push(mkPlayer(0, 0, g.teams[0], !demo), mkPlayer(0, 1, g.teams[0], false), mkPlayer(1, 0, g.teams[1], false), mkPlayer(1, 1, g.teams[1], false));
        tipoff();
      }
      function tipoff() {
        const P = g.players;
        const spots = [[CL / 2 - 14, 46], [CL / 2 - 60, 75], [CL / 2 + 14, 54], [CL / 2 + 60, 25]];
        P.forEach((p, i) => { p.x = spots[i][0]; p.z = spots[i][1]; p.h = 0; p.vh = 0; p.act = null; p.down = 0; p.face = p.team === 0 ? 1 : -1; });
        const b = g.ball; b.owner = null; b.mode = 'loose'; b.x = CL / 2; b.z = 50; b.h = 50; b.vx = 0; b.vz = 0; b.vh = 6; b.t = 0;
        g.shot = 24; g.poss = -1;
      }
      function hoopOf(p) { return HOOPX[attackHoop(p.team)]; }
      function dirOf(p) { return p.team === 0 ? 1 : -1; }
      function distHoop(x, z, hx) { return Math.hypot(x - hx, (z - 50) * 1.5); }
      function d2(a, b) { return Math.hypot(a.x - b.x, (a.z - b.z) * 1.3); }
      function mates(p) { return g.players.filter(q => q.team === p.team && q !== p)[0]; }
      function foes(p) { return g.players.filter(q => q.team !== p.team); }
      function nearestFoe(p) { let best = null, bd = 1e9; for (const q of foes(p)) { const d = d2(p, q); if (d < bd) { bd = d; best = q; } } return [best, bd]; }

      function giveBall(p) {
        const b = g.ball;
        if (g.poss !== p.team) { g.shot = 24; }
        b.owner = p; b.mode = 'held'; g.poss = p.team; p.ai.t = 0;
      }
      function looseBall(vx, vz, vh) {
        const b = g.ball; const o = b.owner;
        if (o) { b.x = o.x; b.z = o.z; b.h = o.h + 26; }
        b.owner = null; b.mode = 'loose'; b.vx = vx; b.vz = vz; b.vh = vh; b.t = 0;
      }

      // ---------------- actions ----------------
      function jump(p, v) { if (p.h > 0 || p.down || p.act === 'dunk') return false; p.vh = v || 6.4; p.h = 0.1; snd.jump(); return true; }
      function startShot(p) {
        if (!jump(p, 6.2 + p.spd * 0.05)) return;
        p.act = 'shoot'; p.ai.rel = rnd(-1.6, 1.6) * Math.max(0.15, 1 - g.level * 0.1);
        p.face = dirOf(p);
      }
      function startDunk(p) {
        if (p.h > 0 || p.down) return;
        const hx = hoopOf(p);
        p.act = 'dunk'; p.actT = 0; p.dk = { x0: p.x, z0: p.z, x1: hx - dirOf(p) * 7, z1: 50, T: 30 + Math.abs(p.x - hx) * 0.12 };
        p.h = 0.1; p.face = dirOf(p); snd.jump();
      }
      function releaseShot(p, q) {
        const b = g.ball; if (b.owner !== p) { p.act = null; return; }
        const hx = hoopOf(p), d = distHoop(p.x, p.z, hx), three = d > 150;
        let prob = d < 50 ? 0.7 : d < 100 ? 0.56 : d < 150 ? 0.48 : 0.37;
        prob += ((three ? p.thr : p.sht) - 5) * 0.03;
        if (d > 230) prob *= 0.4;
        const [f, fd] = nearestFoe(p);
        let blocked = false;
        if (fd < 24) { prob *= f.h > 6 ? 0.45 : 0.68; if (f.h > 8 && fd < 16 && Math.random() < 0.35 + f.def * 0.03) blocked = true; }
        prob *= 0.5 + 0.5 * q;
        if (!g.demo && p.team === 1) prob *= 0.88 + g.level * 0.04;
        if (p.fire) prob = Math.max(prob, 0.92);
        if (blocked && !p.fire) {
          looseBall(-dirOf(p) * rnd(1, 2.5), rnd(-1.5, 1.5), 3); say('REJECTED!', '#f44', 60); snd.shove();
          p.act = null; return;
        }
        b.owner = null; b.mode = 'shot'; b.t = 0;
        b.sx = p.x + dirOf(p) * 4; b.sz = p.z; b.sh = p.h + 34; b.tx = hx; b.tz = 50;
        b.T = Math.round(30 + d * 0.09); b.peak = 26 + d * 0.16;
        b.make = Math.random() < prob; b.pts = three ? 3 : 2; b.shooter = p; b.q = q;
        p.act = null;
        if (three && b.make && d > 200) b.long = true;
      }
      function passBall(p, to) {
        const b = g.ball; if (b.owner !== p || !to) return;
        b.owner = null; b.mode = 'pass'; b.from = p; b.to = to; b.x = p.x; b.z = p.z; b.h = p.h + 24; b.t = 0;
        p.act = null; p.cool = 12; api.audio.tone(500, 0.04, { type: 'triangle', vol: 0.1 });
      }
      function trySteal(p) {
        if (p.cool > 0 || p.down) return;
        p.cool = 28;
        const b = g.ball, o = b.owner;
        if (!o || o.team === p.team) return;
        const d = d2(p, o);
        if (d > 17) return;
        if (p.tb && p.turbo > 10) {
          // shove: knocks the ball handler flat
          o.down = 55; o.act = null; o.vx = dirOf(p) * 0; looseBall(rnd(-1, 1), rnd(-1, 1), 4); snd.shove(); p.turbo -= 10; return;
        }
        let ch = 0.16 + (p.def - o.spd) * 0.02 + (Math.abs(o.vx) + Math.abs(o.vz) < 0.3 ? 0.12 : 0);
        if (o.h > 0) ch *= 0.5;
        if (Math.random() < ch) { giveBall(p); g.shot = 24; snd.steal(); say('STEAL!', '#ff0', 40); }
      }
      function shoveAny(p) {
        // turbo + X with no ball handler nearby shoves the nearest opponent anyway
        const [f, fd] = nearestFoe(p);
        if (f && fd < 15 && !f.down) { f.down = 50; if (g.ball.owner === f) looseBall(rnd(-1, 1), rnd(-1, 1), 4); f.act = null; snd.shove(); p.turbo -= 10; p.cool = 30; }
      }

      // ---------------- scoring ----------------
      function scored(team, pts, shooter, dunk) {
        g.score[team] += pts;
        if (!g.demo && team === 0) totalPts += pts;
        const other = 1 - team;
        for (const q of g.players) if (q.team === other) { q.streak = 0; if (q.fire) { q.fire = 0; } }
        for (const q of g.players) if (q.team === team && q !== shooter) q.streak = 0;
        if (shooter) {
          if (shooter.fire) { if (++shooter.fireBaskets >= 4) { shooter.fire = 0; } }
          else if (++shooter.streak >= 3) { shooter.fire = 1; shooter.fireBaskets = 0; shooter.turbo = 100; say(shooter.name + " IS ON FIRE!", '#ff8a20', 120); snd.fire(); }
        }
        if (dunk && bannerT < 60) say(['KABOOM!', 'SLAM IT!', 'MONSTER JAM!', 'RIM WRECKER!'][Math.random() * 4 | 0], '#ff0', 70);
        else if (pts === 3 && bannerT < 60) say(g.ball.long ? 'FROM DOWNTOWN!' : 'THREE!', '#4cf', 60);
        snd.cheer();
        g.pauseT = 50; g.inTo = other;
      }

      // ---------------- AI ----------------
      function aiPlayer(p) {
        const b = g.ball, hx = hoopOf(p), dir = dirOf(p), mate = mates(p);
        p.ix = 0; p.iz = 0; p.tb = false;
        if (p.down || p.act === 'dunk') return;
        const goTo = (tx, tz, tol) => {
          const dx = tx - p.x, dz = tz - p.z;
          if (Math.abs(dx) > (tol || 3)) p.ix = Math.sign(dx);
          if (Math.abs(dz) > (tol || 3)) p.iz = Math.sign(dz);
        };
        const lvl = p.team === 1 && !g.demo ? g.level : 3;
        if (b.owner === p) {
          if (p.act === 'shoot') return;
          const d = distHoop(p.x, p.z, hx);
          const [f, fd] = nearestFoe(p);
          if (--p.ai.t <= 0) {
            p.ai.t = 50 + Math.random() * 70;
            const r = Math.random();
            if (r < 0.35) { p.ai.tx = hx - dir * rnd(20, 60); p.ai.tz = rnd(30, 70); }
            else if (r < 0.7) { p.ai.tx = hx - dir * rnd(80, 140); p.ai.tz = rnd(10, 90); }
            else { p.ai.tx = hx - dir * rnd(155, 175); p.ai.tz = rnd(15, 85); }
          }
          goTo(p.ai.tx, p.ai.tz, 4);
          if (p.turbo > 30 && Math.random() < 0.5 && Math.abs(p.x - hx) > 60) p.tb = true;
          if ((p.fire || p.turbo > 20) && d < 75 && d > 25 && fd > 12 && Math.random() < 0.05 + p.dnk * 0.006) { p.tb = true; startDunk(p); return; }
          const atSpot = Math.abs(p.x - p.ai.tx) < 8 && Math.abs(p.z - p.ai.tz) < 8;
          if (g.shot < 3 || (atSpot && fd > 16 && Math.random() < 0.08) || (d < 180 && fd > 30 && Math.random() < 0.012)) { startShot(p); return; }
          if (fd < 14 && Math.random() < 0.02 + (mate.human ? 0.01 : 0)) passBall(p, mate);
          return;
        }
        if (b.owner && b.owner.team === p.team) {
          // off-ball offense: get open on the wing, or cut to the rim
          if (--p.ai.t <= 0) {
            p.ai.t = 60 + Math.random() * 90;
            p.ai.tx = hx - dir * (Math.random() < 0.3 ? rnd(15, 40) : rnd(60, 170)); p.ai.tz = b.owner.z < 50 ? rnd(55, 92) : rnd(8, 45);
          }
          goTo(p.ai.tx, p.ai.tz, 5);
          if (b.owner.human && p.wantPass > 0) { }
          return;
        }
        if (b.mode === 'loose' || (b.mode === 'shot' && b.t > b.T * 0.6)) {
          // rebound / chase; the closer man of each team goes for it
          const tx = b.mode === 'shot' ? b.tx - dirOf(b.shooter) * 18 : b.x, tz = b.mode === 'shot' ? 50 : b.z;
          const md = Math.hypot(mate.x - tx, mate.z - tz), myd = Math.hypot(p.x - tx, p.z - tz);
          if (myd <= md || mate.down || mate.human) {
            goTo(tx, tz, 2);
            if (p.turbo > 10 && myd > 40) p.tb = true;
            if (b.mode === 'loose' && b.h > 36 && b.h < 70 && myd < 12 && p.h === 0) jump(p);
            return;
          }
        }
        if (b.mode === 'shot' && b.shooter && b.shooter.team !== p.team && b.t < 6) return;
        // defence: stay between my man and our basket
        const defHoop = HOOPX[attackHoop(1 - p.team)];
        const man = g.players.find(q => q.team !== p.team && q.k === p.k);
        const carrier = b.owner && b.owner.team !== p.team ? b.owner : null;
        const mark = carrier ? (d2(p, carrier) <= d2(mate, carrier) || mate.down ? carrier : mates(carrier)) : man;
        const towards = Math.sign(defHoop - mark.x) || 1;
        goTo(mark.x + towards * 13, mark.z + (50 - mark.z) * 0.15, 3);
        if (Math.abs(p.x - mark.x) > 50 && p.turbo > 20) p.tb = true;
        if (carrier === mark) {
          const dd = d2(p, carrier);
          if (carrier.act === 'shoot' && dd < 22 && !p.ai.blocked && Math.random() < 0.18 + lvl * 0.03) { p.ai.blocked = true; jump(p, 6.8); }
          if (carrier.act === 'dunk' && dd < 30 && Math.random() < 0.05 + lvl * 0.01) jump(p, 7);
          if (dd < 15 && Math.random() < 0.01 + lvl * 0.004) { if (p.turbo > 40 && Math.random() < 0.15 + lvl * 0.02) p.tb = true; trySteal(p); }
          if (carrier.act !== 'shoot') p.ai.blocked = false;
        }
      }

      // ---------------- human input ----------------
      function humanInput(p) {
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown');
        for (const k of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) if (api.pressed(k)) { if (api.frame - lastDir[k] < 14) latch = true; lastDir[k] = api.frame; }
        if (!L && !R && !U && !D) latch = false;
        p.ix = (R ? 1 : 0) - (L ? 1 : 0); p.iz = (D ? 1 : 0) - (U ? 1 : 0);
        p.tb = api.key('KeyZ') || api.key('ShiftLeft') || api.key('ShiftRight') || latch;
        if (p.down) return;
        const b = g.ball, hx = hoopOf(p);
        if (b.owner === p) {
          if (api.pressed('Space') && !p.act && p.h === 0) {
            const d = distHoop(p.x, p.z, hx);
            if (p.tb && (p.turbo > 5 || p.fire) && d < 85) startDunk(p); else startShot(p);
          }
          if (p.act === 'shoot' && !api.key('Space') && p.h > 0) releaseShot(p, 1 - Math.min(1, Math.abs(p.vh) / 5.5));
          if (api.pressed('KeyX') && p.act !== 'dunk') { if (p.act === 'shoot') p.act = null; passBall(p, mates(p)); }
        } else {
          if (api.pressed('Space')) jump(p, 6.6);
          if (api.pressed('KeyX')) {
            if (b.owner && b.owner.team === p.team) { const m = b.owner; if (!m.act) passBall(m, p); }
            else if (b.owner) trySteal(p);
            else if (p.tb) shoveAny(p);
          }
        }
      }

      // ---------------- simulation ----------------
      function movePlayer(p) {
        if (p.cool > 0) p.cool--;
        if (p.down > 0) { p.down--; p.vx *= 0.8; p.vz *= 0.8; }
        if (p.act === 'dunk') {
          const k = p.dk; p.actT++;
          const t = Math.min(1, p.actT / k.T);
          p.x = k.x0 + (k.x1 - k.x0) * t; p.z = k.z0 + (k.z1 - k.z0) * t;
          p.h = 48 * Math.sin(Math.PI * t * 0.82) + 4;
          if (!p.fire) p.turbo = Math.max(0, p.turbo - 0.4);
          if (t >= 1) finishDunk(p);
          return;
        }
        const useT = p.tb && (p.turbo > 1 || p.fire) && (p.ix || p.iz);
        if (useT && !p.fire) p.turbo = Math.max(0, p.turbo - 0.55);
        else if (!useT) p.turbo = Math.min(100, p.turbo + 0.18);
        if (p.fire) p.turbo = 100;
        if (p.h <= 0 && !p.down) {
          const sp = (1.05 + p.spd * 0.05) * (useT ? 1.55 : 1) * (g.ball.owner === p ? 0.95 : 1);
          let ix = p.ix, iz = p.iz; if (ix && iz) { ix *= 0.75; iz *= 0.75; }
          p.vx += (ix * sp - p.vx) * 0.35; p.vz += (iz * sp * 0.72 - p.vz) * 0.35;
          if (ix) p.face = ix;
        }
        p.x += p.vx; p.z += p.vz;
        if (p.h > 0) {
          p.h += p.vh; p.vh -= G;
          if (p.h <= 0) {
            p.h = 0; p.vh = 0;
            if (p.act === 'shoot') { if (g.ball.owner === p) releaseShot(p, 0.1); p.act = null; }
            p.vx *= 0.3; p.vz *= 0.3;
          }
        }
        p.x = clamp(p.x, 6, CL - 6); p.z = clamp(p.z, 2, CD - 2);
        if (Math.abs(p.vx) + Math.abs(p.vz) > 0.2) p.run += Math.hypot(p.vx, p.vz); else p.run = 0;
      }
      function finishDunk(p) {
        const b = g.ball, hx = hoopOf(p);
        p.act = null; p.vh = 0; p.vx = 0; p.vz = 0;
        if (b.owner !== p) return;
        let prob = 0.86 + p.dnk * 0.012;
        for (const f of foes(p)) if (f.h > 14 && Math.abs(f.x - hx) < 26 && Math.abs(f.z - 50) < 18) prob -= 0.3 + f.def * 0.02;
        if (p.fire) prob = Math.max(prob, 0.96);
        if (Math.random() < prob) {
          b.owner = null; b.mode = 'net'; b.x = hx; b.z = 50; b.h = RIM; b.t = 0; b.long = false;
          shake = 18; snd.dunk();
          for (let i = 0; i < 24; i++) parts.push({ x: hx, z: 50, h: RIM, vx: rnd(-2, 2), vz: rnd(-1, 1), vh: rnd(0, 3), life: 30, col: p.fire ? '#ff8a20' : '#fff' });
          scored(p.team, 2, p, true);
        } else {
          looseBall(-dirOf(p) * rnd(1.5, 3), rnd(-1.5, 1.5), 4); b.x = hx; b.z = 50; b.h = RIM + 4;
          say('DENIED!', '#f44', 60); snd.rim();
        }
      }
      function updateBall() {
        const b = g.ball;
        if (b.mode === 'held') {
          const o = b.owner;
          b.x = o.x + o.face * 5; b.z = o.z + 1;
          if (o.h > 0 || o.act) b.h = o.h + 34; else { const ph = (api.frame % 24) / 24; b.h = 4 + 18 * Math.abs(Math.cos(ph * Math.PI)); if ((api.frame % 24) === 12 && Math.abs(o.x - camX) < 170) snd.bounce(); }
          if (o.down) looseBall(rnd(-1, 1), rnd(-1, 1), 3);
          return;
        }
        if (b.mode === 'pass') {
          b.t++;
          const to = b.to, tx = to.x + to.vx * 4, tz = to.z + to.vz * 4;
          const dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz), sp = 5.5;
          if (d < sp + 2 || b.t > 80) { if (!to.down) giveBall(to); else looseBall(0, 0, 1); return; }
          b.x += dx / d * sp; b.z += dz / d * sp * 0.8; b.h += (to.h + 26 - b.h) * 0.1;
          for (const f of foes(b.from)) if (!f.down && Math.hypot(f.x - b.x, (f.z - b.z) * 1.3) < 9 && b.h < f.h + 44 && Math.random() < 0.08 + f.def * 0.008) { giveBall(f); snd.steal(); say('PICKED OFF!', '#ff0', 40); return; }
          return;
        }
        if (b.mode === 'shot') {
          b.t++;
          const t = b.t / b.T;
          b.x = b.sx + (b.tx - b.sx) * t; b.z = b.sz + (b.tz - b.sz) * t;
          b.h = b.sh + (RIM + 2 - b.sh) * t + b.peak * 4 * t * (1 - t);
          // goaltending is legal: a leaping defender can swat it on the way down
          if (t > 0.55 && t < 0.97) for (const f of foes(b.shooter)) {
            if (f.h > 12 && Math.hypot(f.x - b.x, (f.z - b.z) * 1.2) < 10 && Math.abs(f.h + 36 - b.h) < 12 && Math.random() < 0.25) {
              looseBall(-dirOf(b.shooter) * rnd(1.5, 3), rnd(-1.5, 1.5), 2); say('SWATTED!', '#f44', 50); snd.shove(); return;
            }
          }
          if (b.t >= b.T) {
            if (b.make) {
              b.mode = 'net'; b.t = 0; b.x = b.tx; b.z = 50; b.h = RIM; snd.swish();
              scored(b.shooter.team, b.pts, b.shooter, false);
            } else {
              snd.rim();
              b.mode = 'loose'; b.owner = null; b.x = b.tx; b.z = 50; b.h = RIM + 2;
              b.vx = -dirOf(b.shooter) * rnd(0.6, 2.4); b.vz = rnd(-1.6, 1.6); b.vh = rnd(2, 4.5); b.t = 0;
            }
          }
          return;
        }
        if (b.mode === 'net') {
          b.t++; b.h = Math.max(0, RIM - b.t * 1.6);
          return;
        }
        // loose ball
        b.t++;
        b.x += b.vx; b.z += b.vz; b.h += b.vh; b.vh -= 0.38;
        if (b.h <= 0) { b.h = 0; if (Math.abs(b.vh) > 1.2) { b.vh = -b.vh * 0.6; snd.bounce(); } else b.vh = 0; b.vx *= 0.92; b.vz *= 0.92; }
        if (b.x < 4 || b.x > CL - 4) { b.vx = -b.vx; b.x = clamp(b.x, 4, CL - 4); }
        if (b.z < 1 || b.z > CD - 1) { b.vz = -b.vz; b.z = clamp(b.z, 1, CD - 1); }
        let best = null, bd = 1e9;
        for (const p of g.players) {
          if (p.down || p.act === 'dunk' || p.cool > 18) continue;
          const d = Math.hypot(p.x - b.x, (p.z - b.z) * 1.3);
          if (d < 11 && b.h < p.h + 46 && d < bd) { bd = d; best = p; }
        }
        if (best && b.t > 3) { giveBall(best); if (best.h > 0) best.act = null; }
      }
      function separate() {
        const P = g.players;
        for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
          const a = P[i], c = P[j]; if (a.h > 0 || c.h > 0) continue;
          const dx = c.x - a.x, dz = (c.z - a.z) * 1.4, d = Math.hypot(dx, dz);
          if (d < 8 && d > 0.01) { const o = (8 - d) / 2; a.x -= dx / d * o; c.x += dx / d * o; a.z -= dz / d * o / 1.4; c.z += dz / d * o / 1.4; }
        }
      }
      function stepGame() {
        const b = g.ball;
        if (g.pauseT > 0) {
          g.pauseT--;
          for (const p of g.players) { p.ix = p.iz = 0; p.tb = false; movePlayer(p); }
          updateBall();
          if (g.pauseT === 0) {
            // the scored-on team takes it out from under the basket
            const t = g.inTo, mine = g.players.filter(p => p.team === t);
            const hx = HOOPX[attackHoop(1 - t)];
            mine.sort((a, c) => Math.abs(a.x - hx) - Math.abs(c.x - hx));
            const p = mine[0]; p.x = hx + dirOf(p) * 12; p.z = 50 + rnd(-10, 10); p.h = 0; p.act = null; p.down = 0;
            g.poss = -1; giveBall(p);
          }
          return;
        }
        for (const p of g.players) { if (p.human) humanInput(p); else aiPlayer(p); }
        for (const p of g.players) {
          if (!p.human && p.act === 'shoot' && g.ball.owner === p && p.h > 0 && p.vh < p.ai.rel) releaseShot(p, 1 - Math.min(1, Math.abs(p.vh) / 5.5));
          movePlayer(p);
        }
        separate();
        updateBall();
        // clocks
        g.clock -= (1 / 60) * 1.25;
        if (b.mode === 'held' || b.mode === 'pass') {
          g.shot -= 1 / 60;
          if (g.shot <= 0) {
            const o = b.owner || (b.from || null);
            say('SHOT CLOCK', '#f44', 60); snd.horn();
            const other = g.players.find(p => p.team !== (o ? o.team : g.poss) && !p.down) || g.players[0];
            if (b.owner) b.owner.act = null;
            giveBall(other); g.shot = 24;
          }
        }
        if (g.clock <= 0 && b.mode !== 'shot' && b.mode !== 'net' && !g.players.some(p => p.act === 'dunk')) {
          g.clock = 0; endQuarter();
        }
      }
      function endQuarter() {
        snd.horn();
        if (g.q >= 4 && g.score[0] !== g.score[1]) { mode = g.demo ? 'demoend' : 'final'; modeT = 300; return; }
        mode = g.demo ? 'demoend' : 'qbreak'; modeT = g.demo ? 120 : 220;
      }
      function nextQuarter() {
        g.q++; g.clock = g.q > 4 ? 60 : 120;
        for (const p of g.players) { p.turbo = 100; }
        tipoff();
        mode = 'play';
      }

      // ---------------- flow ----------------
      function tryStart() {
        if (api.useCredit()) { mode = 'select'; modeT = 0; snd.beep(880); return; }
        coinFlash = 90; api.audio.tone(70, 0.25, { type: 'square', vol: 0.2 });
      }
      function startLadder() {
        ladder = []; for (let i = 1; i < TEAMS.length; i++) ladder.push((myTeam + i) % TEAMS.length);
        round = 0; totalPts = 0; wins = 0; startMatch();
      }
      function startMatch() {
        newGame(myTeam, ladder[round % ladder.length], false, Math.min(7, round + Math.floor(round / ladder.length) * 2));
        mode = 'intro'; modeT = 180; parts = [];
      }
      function startDemo() {
        const a = Math.random() * TEAMS.length | 0; let c = (a + 1 + (Math.random() * (TEAMS.length - 1) | 0)) % TEAMS.length;
        newGame(a, c, true, 3); g.clock = 40; g.q = 4; mode = 'demo'; modeT = 0;
      }
      function finishMatch() {
        const won = g.score[0] > g.score[1];
        if (totalPts > hi) { hi = totalPts; api.setHiScore(hi); }
        if (won) { wins++; round++; mode = 'won'; modeT = 300; api.audio.melody([[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.3], [784, 0.12], [1047, 0.4]], { type: 'square', vol: 0.15 }); }
        else {
          mode = 'held';
          const end = () => { mode = 'gameover'; modeT = 300; api.audio.melody([[392, 0.2], [330, 0.2], [262, 0.5]], { type: 'triangle', vol: 0.2 }); };
          if (api.offerContinue) api.offerContinue(() => { startMatch(); }, end); else end();
        }
      }

      function update() {
        if (coinFlash > 0) coinFlash = api.credits > 0 ? 0 : coinFlash - 1;
        if (bannerT > 0) bannerT--;
        if (shake > 0) shake--;
        modeT++;
        for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.x += q.vx; q.z += q.vz; q.h += q.vh; q.vh -= 0.15; if (--q.life <= 0) parts.splice(i, 1); }
        if (g && g.ball) for (const p of g.players) if (p.fire && (api.frame & 1)) {
          const b = g.ball; parts.push({ x: b.x + rnd(-2, 2), z: b.z, h: b.h + rnd(0, 4), vx: rnd(-0.3, 0.3), vz: 0, vh: rnd(0.5, 1.4), life: 14, col: Math.random() < 0.5 ? '#ff4' : '#f60' });
          parts.push({ x: p.x + rnd(-3, 3), z: p.z, h: rnd(0, 6), vx: 0, vz: 0, vh: rnd(0.4, 1), life: 10, col: '#f80' });
        }
        switch (mode) {
          case 'title':
            if (modeT > 420) startDemo();
            if (api.anyPressed('Enter', 'Space')) tryStart();
            break;
          case 'demo':
            stepGame(); followCam();
            if (modeT > 1800) { mode = 'title'; modeT = 0; g = null; }
            if (api.anyPressed('Enter', 'Space')) tryStart();
            break;
          case 'demoend':
            if (modeT > 120) { mode = 'title'; modeT = 0; g = null; }
            if (api.anyPressed('Enter', 'Space')) tryStart();
            break;
          case 'select':
            if (api.pressed('ArrowLeft')) { selIdx = (selIdx + 7) % 8; snd.beep(); }
            if (api.pressed('ArrowRight')) { selIdx = (selIdx + 1) % 8; snd.beep(); }
            if (api.pressed('ArrowUp') || api.pressed('ArrowDown')) { selIdx = (selIdx + 4) % 8; snd.beep(); }
            if ((modeT > 20 && api.anyPressed('Space', 'Enter')) || modeT > 1200) { myTeam = selIdx; snd.beep(1320); startLadder(); }
            break;
          case 'intro':
            followCam();
            if (modeT > 180 || (modeT > 30 && api.anyPressed('Space', 'Enter'))) { mode = 'play'; modeT = 0; }
            break;
          case 'play':
            stepGame(); followCam();
            break;
          case 'qbreak':
            if (modeT > 220 || (modeT > 40 && api.anyPressed('Space', 'Enter'))) nextQuarter();
            break;
          case 'final':
            if (modeT > 240 || (modeT > 60 && api.anyPressed('Space', 'Enter'))) finishMatch();
            break;
          case 'won':
            if (modeT > 300 || (modeT > 60 && api.anyPressed('Space', 'Enter'))) startMatch();
            break;
          case 'held': break;
          case 'gameover':
            if (modeT > 300) { mode = 'title'; modeT = 0; g = null; }
            break;
        }
      }
      function followCam() {
        const b = g.ball;
        const tx = clamp(b.x + (b.owner ? dirOf(b.owner) * 30 : 0), 150, CL - 150);
        camX += (tx - camX) * 0.08;
      }

      // ---------------- rendering ----------------
      function scl(z) { return 0.82 + 0.36 * z / CD; }
      function P(x, z, h) { return [W / 2 + (x - camX) * scl(z), 92 + z * 1.25 - (h || 0)]; }
      function poly(ctx, pts, col) { ctx.fillStyle = col; ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fill(); }
      function line(ctx, a, c, col) { ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke(); }
      function worldLine(ctx, pts, col) { ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); pts.forEach((q, i) => { const s = P(q[0], q[1], 0); i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]); }); ctx.stroke(); }

      function drawArena(ctx) {
        ctx.fillStyle = '#0c0c18'; ctx.fillRect(0, 0, W, H);
        // crowd (parallax)
        for (const c of crowd) {
          const x = Math.round(c[0] - (camX - CL / 2) * 0.6 + 60); if (x < -2 || x > W) continue;
          const bob = ((api.frame + c[3] * 60) % 40 < 20 && bannerT > 0) ? 1 : 0;
          ctx.fillStyle = c[2]; ctx.fillRect(x, c[1] - bob, 3, 3);
          ctx.fillStyle = '#d8a070'; ctx.fillRect(x, c[1] - 2 - bob, 3, 2);
        }
        if (Math.random() < 0.15) flash.push([rnd(0, W), rnd(28, 86), 3]);
        for (let i = flash.length - 1; i >= 0; i--) { const f = flash[i]; ctx.fillStyle = '#fff'; ctx.fillRect(f[0], f[1], 2, 2); if (--f[2] <= 0) flash.splice(i, 1); }
        ctx.fillStyle = '#1a1a30'; ctx.fillRect(0, 86, W, 8);
        // apron and floor
        const T = g ? g.teams[0] : TEAMS[0];
        poly(ctx, [P(-30, -8), P(CL + 30, -8), P(CL + 30, CD + 10), P(-30, CD + 10)], '#5a2a1a');
        poly(ctx, [P(0, 0), P(CL, 0), P(CL, CD), P(0, CD)], '#c99050');
        for (let z = 5; z < CD; z += 10) worldLine(ctx, [[0, z], [CL, z]], 'rgba(120,70,30,.35)');
        // paint
        for (let s = 0; s < 2; s++) {
          const x0 = s ? CL : 0, x1 = s ? CL - 110 : 110;
          poly(ctx, [P(x0, 34), P(x1, 34), P(x1, 66), P(x0, 66)], s ? (g ? g.teams[1].c1 : '#2050c0') : T.c1);
          ctx.globalAlpha = 1;
        }
        const wl = '#fff';
        worldLine(ctx, [[0, 0], [CL, 0], [CL, CD], [0, CD], [0, 0]], wl);
        worldLine(ctx, [[CL / 2, 0], [CL / 2, CD]], wl);
        const circ = [], key = [];
        for (let a = 0; a <= 32; a++) circ.push([CL / 2 + 22 * Math.cos(a / 32 * TAU), 50 + 20 * Math.sin(a / 32 * TAU)]);
        worldLine(ctx, circ, wl);
        for (let s = 0; s < 2; s++) {
          const hx = HOOPX[s], dir = s ? -1 : 1, x0 = s ? CL : 0, x1 = s ? CL - 110 : 110;
          worldLine(ctx, [[x0, 34], [x1, 34], [x1, 66], [x0, 66]], wl);
          const arc = [];
          for (let a = -90; a <= 90; a += 6) {
            const r = a * Math.PI / 180; const z = 50 + 150 * Math.sin(r) / 1.5;
            if (z < 0 || z > CD) continue;
            arc.push([hx + dir * 150 * Math.cos(r), z]);
          }
          worldLine(ctx, [[x0, 0]].concat(arc.length ? [[arc[0][0], 0]] : []).concat(arc).concat(arc.length ? [[arc[arc.length - 1][0], CD]] : []).concat([[x0, CD]]), wl);
          const ft = []; for (let a = -90; a <= 90; a += 10) { const r = a * Math.PI / 180; ft.push([x1 + dir * 16 * Math.cos(r), 50 + 16 * Math.sin(r)]); }
          worldLine(ctx, ft, wl);
        }
        // centre logo
        const c = P(CL / 2, 50); text(ctx, 'JAM', c[0], c[1] - 3, 'rgba(255,255,255,.5)', 1, 'center');
      }
      function drawHoop(ctx, s) {
        const hx = HOOPX[s], dir = s ? -1 : 1, bx = hx - dir * 8, px = hx - dir * 26;
        // stanchion
        const f = P(px, 50, 0), t = P(px, 50, 80);
        ctx.fillStyle = '#333'; ctx.fillRect(Math.round(f[0]) - 3, Math.round(t[1]), 6, Math.round(f[1] - t[1]));
        ctx.fillStyle = '#c03030'; ctx.fillRect(Math.round(f[0]) - 5, Math.round(f[1]) - 10, 10, 10);
        const a = P(px, 50, 76), c2 = P(bx, 50, 76); ctx.fillStyle = '#444'; ctx.fillRect(Math.min(a[0], c2[0]), a[1] - 1, Math.abs(c2[0] - a[0]), 3);
        // backboard (seen edge-on in perspective)
        poly(ctx, [P(bx, 36, 86), P(bx, 64, 86), P(bx, 64, 60), P(bx, 36, 60)], 'rgba(230,240,255,.85)');
        const q1 = P(bx, 36, 86), q2 = P(bx, 64, 86), q3 = P(bx, 64, 60), q4 = P(bx, 36, 60);
        ctx.strokeStyle = '#c03030'; ctx.beginPath(); ctx.moveTo(q1[0], q1[1]); ctx.lineTo(q2[0], q2[1]); ctx.lineTo(q3[0], q3[1]); ctx.lineTo(q4[0], q4[1]); ctx.closePath(); ctx.stroke();
        // rim + net
        const r = P(hx, 50, RIM);
        const shakeRim = (g && g.ball.mode === 'net' && g.ball.t < 10 && Math.abs(g.ball.x - hx) < 2) ? ((api.frame & 2) ? 1 : -1) : 0;
        ctx.strokeStyle = '#fff'; ctx.beginPath();
        for (let k = -2; k <= 2; k++) { ctx.moveTo(r[0] + k * 3, r[1] + shakeRim); ctx.lineTo(r[0] + k * 2, r[1] + 12 + shakeRim); }
        ctx.moveTo(r[0] - 5, r[1] + 6); ctx.lineTo(r[0] + 5, r[1] + 6); ctx.stroke();
        ctx.strokeStyle = '#ff6a10'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(r[0], r[1] + shakeRim, 7, 2.5, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1;
      }
      function drawPlayer(ctx, p, isP1) {
        const [fx, fy] = P(p.x, p.z, 0);
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(fx, fy, 6 - Math.min(3, p.h / 15), 2, 0, 0, TAU); ctx.fill();
        const x = Math.round(fx), y = Math.round(fy - p.h), T = p.T, f = p.face;
        if (p.down) {
          ctx.fillStyle = T.c1; ctx.fillRect(x - 8, y - 5, 10, 5); ctx.fillStyle = T.c2; ctx.fillRect(x + 2, y - 5, 4, 5);
          ctx.fillStyle = p.d.s; ctx.fillRect(x - 13, y - 5, 5, 5); ctx.fillRect(x + 6, y - 4, 6, 3);
          return;
        }
        const air = p.h > 0, holding = g.ball.owner === p;
        const step = air ? 0 : Math.floor(p.run / 5) % 4;
        const lo = [0, 2, 0, -2][step];
        // legs and shoes
        ctx.fillStyle = p.d.s;
        ctx.fillRect(x - 3 + (air ? -1 : lo * 0.5), y - 11, 2, 9); ctx.fillRect(x + 1 - (air ? -1 : lo * 0.5), y - 11, 2, 9);
        ctx.fillStyle = '#fff'; ctx.fillRect(x - 4 + (air ? -1 : lo * 0.5), y - 2, 4, 2); ctx.fillRect(x + 1 - (air ? -1 : lo * 0.5), y - 2, 4, 2);
        // shorts + jersey
        ctx.fillStyle = T.c2; ctx.fillRect(x - 4, y - 15, 8, 5);
        ctx.fillStyle = T.c1; ctx.fillRect(x - 4, y - 24, 8, 9);
        ctx.fillStyle = T.c2; ctx.fillRect(x - 1, y - 21, 2, 3);
        // arms
        ctx.fillStyle = p.d.s;
        if (air || p.act) { ctx.fillRect(x - 5, y - 33, 2, 10); ctx.fillRect(x + 3, y - 33, 2, 10); }
        else if (holding) { ctx.fillRect(x - 6, y - 23, 2, 7); ctx.fillRect(x + (f > 0 ? 4 : -6), y - 20, 2 + 0, 6); ctx.fillRect(x + 4 * f, y - 16, 3 * f, 2); }
        else { ctx.fillRect(x - 6, y - 23, 2, 8 + (step & 1)); ctx.fillRect(x + 4, y - 23, 2, 8 + ((step + 1) & 1)); }
        // head (big-head arcade style)
        ctx.fillStyle = p.d.s; ctx.fillRect(x - 3, y - 31, 7, 7);
        ctx.fillStyle = '#201008'; ctx.fillRect(x - 3, y - 32, 7, 2);
        ctx.fillStyle = '#000'; ctx.fillRect(x + (f > 0 ? 2 : -2), y - 29, 1, 1);
        if (p.fire) { ctx.fillStyle = (api.frame & 4) ? '#ff4' : '#f60'; ctx.fillRect(x - 3, y - 35, 2, 3); ctx.fillRect(x + 1, y - 37, 2, 5); }
        if (isP1) {
          text(ctx, 'P1', x - 5, y - 46 - (air ? 0 : 0), (api.frame & 16) ? '#ff0' : '#fff');
          ctx.fillStyle = '#ff0'; ctx.fillRect(x - 1, y - 38, 3, 1); ctx.fillRect(x, y - 37, 1, 1);
        }
      }
      function drawBall(ctx) {
        const b = g.ball, [sx, sy] = P(b.x, b.z, b.h), [fx, fy] = P(b.x, b.z, 0);
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(Math.round(fx) - 2, Math.round(fy), 4, 1);
        const onFire = (b.owner && b.owner.fire) || (b.mode === 'shot' && b.shooter.fire);
        ctx.fillStyle = onFire ? '#ff5010' : '#e86a18'; ctx.beginPath(); ctx.arc(Math.round(sx), Math.round(sy), 2.6, 0, TAU); ctx.fill();
        ctx.fillStyle = '#000'; ctx.fillRect(Math.round(sx) - 2, Math.round(sy), 5, 1);
      }
      function drawCourt(ctx) {
        ctx.save();
        if (shake) ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
        drawArena(ctx);
        const ps = g.players.slice().sort((a, c) => a.z - c.z);
        const human = g.players.find(p => p.human);
        let hoopsDone = false;
        const ballZ = g.ball.owner ? g.ball.owner.z + 0.01 : g.ball.z;
        let ballDone = false;
        for (const p of ps) {
          if (!hoopsDone && p.z >= 50) { drawHoop(ctx, 0); drawHoop(ctx, 1); hoopsDone = true; }
          if (!ballDone && ballZ < p.z && !g.ball.owner) { drawBall(ctx); ballDone = true; }
          drawPlayer(ctx, p, p === human);
          if (g.ball.owner === p) { drawBall(ctx); ballDone = true; }
        }
        if (!hoopsDone) { drawHoop(ctx, 0); drawHoop(ctx, 1); }
        if (!ballDone) drawBall(ctx);
        if (g.ball.mode === 'net') drawBall(ctx);
        for (const q of parts) { const [x, y] = P(q.x, q.z, q.h); ctx.fillStyle = q.col; ctx.fillRect(Math.round(x), Math.round(y), 2, 2); }
        ctx.restore();
      }
      function fmtClock(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
      function scoreboard(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 22);
        ctx.fillStyle = '#222'; ctx.fillRect(0, 21, W, 1);
        const T0 = g.teams[0], T1 = g.teams[1];
        ctx.fillStyle = T0.c1; ctx.fillRect(4, 3, 40, 16); ctx.fillStyle = T1.c1; ctx.fillRect(W - 44, 3, 40, 16);
        text(ctx, T0.ab, 24, 4, T0.c2, 1, 'center'); text(ctx, T1.ab, W - 24, 4, T1.c2, 1, 'center');
        text(ctx, String(g.score[0]), 48, 5, '#ff0', 2);
        text(ctx, String(g.score[1]), W - 48, 5, '#ff0', 2, 'right');
        text(ctx, (g.q > 4 ? 'OT' : 'Q' + g.q) + ' ' + fmtClock(g.clock), W / 2, 3, '#fff', 1, 'center');
        text(ctx, 'SHOT ' + Math.max(0, Math.ceil(g.shot)), W / 2, 12, g.shot < 5 ? '#f44' : '#8cf', 1, 'center');
        // bottom: names + turbo
        ctx.fillStyle = '#000'; ctx.fillRect(0, H - 18, W, 18);
        g.players.forEach((p, i) => {
          const x = i < 2 ? 4 + i * 78 : W - 78 * (4 - i) + 2;
          text(ctx, p.name, x, H - 16, p.fire ? ((api.frame & 8) ? '#ff0' : '#f60') : (p.human ? '#ff0' : '#ccc'));
          ctx.fillStyle = '#333'; ctx.fillRect(x, H - 6, 70, 3);
          ctx.fillStyle = p.fire ? '#f60' : p.turbo > 30 ? '#2c4' : '#c42'; ctx.fillRect(x, H - 6, Math.round(70 * p.turbo / 100), 3);
        });
      }
      function panel(ctx, x, y, w, h, col) {
        ctx.fillStyle = 'rgba(0,0,30,.88)'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = col || '#ff7a10'; ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + h - 2, w, 2);
      }
      function logo(ctx, y) {
        const c1 = '#ff7a10', c2 = '#30a0ff';
        text(ctx, 'HOOPS', W / 2 + 2, y + 2, '#401000', 4, 'center'); text(ctx, 'HOOPS', W / 2, y, c1, 4, 'center');
        text(ctx, 'JAM', W / 2 + 2, y + 32, '#001840', 5, 'center'); text(ctx, 'JAM', W / 2, y + 30, c2, 5, 'center');
        ctx.fillStyle = '#e86a18'; ctx.beginPath(); ctx.arc(W / 2 + 62, y + 46, 9, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.beginPath(); ctx.moveTo(W / 2 + 53, y + 46); ctx.lineTo(W / 2 + 71, y + 46); ctx.moveTo(W / 2 + 62, y + 37); ctx.lineTo(W / 2 + 62, y + 55); ctx.stroke();
      }
      function credStr() { return 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'); }
      function startPrompt(ctx, y) {
        const blink = (api.frame >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, y, '#fff', 1, 'center'); }
        else if (api.credits > 0) text(ctx, 'PUSH START', W / 2, y, blink ? '#fff' : '#666', 1, 'center');
        else if (blink) text(ctx, 'INSERT COIN', W / 2, y, '#fff', 1, 'center');
        text(ctx, credStr(), 4, H - 9, '#888');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title' || ((mode === 'demoend' || mode === 'gameover') && !g)) {
          ctx.fillStyle = '#0a0a20'; ctx.fillRect(0, 0, W, H);
          for (let i = 0; i < 12; i++) { ctx.fillStyle = i & 1 ? '#141436' : '#10102a'; ctx.fillRect(0, i * 20, W, 20); }
          logo(ctx, 30);
          text(ctx, '2 ON 2 ARCADE BASKETBALL', W / 2, 108, '#fff', 1, 'center');
          const ph = (modeT >> 7) % 3;
          if (ph === 0) {
            text(ctx, 'TURBO  DUNK  SHOVE  BLOCK', W / 2, 126, '#ff0', 1, 'center');
            text(ctx, 'HIT 3 IN A ROW AND YOU', W / 2, 140, '#ccc', 1, 'center');
            text(ctx, 'CATCH FIRE!', W / 2, 150, '#ff7a10', 1, 'center');
          } else if (ph === 1) {
            for (let i = 0; i < 8; i++) { const T = TEAMS[i]; ctx.fillStyle = T.c1; ctx.fillRect(40 + (i % 4) * 62, 122 + (i >> 2) * 18, 54, 14); text(ctx, T.ab, 67 + (i % 4) * 62, 126 + (i >> 2) * 18, T.c2, 1, 'center'); }
          } else {
            text(ctx, 'BEST TOTAL POINTS', W / 2, 128, '#8cf', 1, 'center');
            text(ctx, String(hi), W / 2, 142, '#fff', 2, 'center');
          }
          startPrompt(ctx, 180);
          text(ctx, '\u00a9 HOOPS JAM - ORIGINAL GAME', W / 2, 212, '#666', 1, 'center');
          return;
        }
        if (mode === 'select') {
          ctx.fillStyle = '#0a0a20'; ctx.fillRect(0, 0, W, H);
          text(ctx, 'SELECT YOUR TEAM', W / 2, 10, '#ff7a10', 2, 'center');
          for (let i = 0; i < 8; i++) {
            const T = TEAMS[i], x = 14 + (i % 4) * 75, y = 34 + (i >> 2) * 40, sel = i === selIdx;
            ctx.fillStyle = sel && (api.frame & 8) ? '#fff' : '#333'; ctx.fillRect(x - 2, y - 2, 70, 34);
            ctx.fillStyle = T.c1; ctx.fillRect(x, y, 66, 30);
            text(ctx, T.ab, x + 33, y + 4, T.c2, 2, 'center');
            ctx.fillStyle = T.c2; ctx.fillRect(x + 4, y + 22, 58, 2);
          }
          const T = TEAMS[selIdx];
          panel(ctx, 10, 120, 300, 100);
          text(ctx, T.name, W / 2, 128, T.c1 === '#202048' ? '#ffc820' : T.c1, 1, 'center');
          const lab = ['SPEED', 'SHOOT', '3 PTS', 'DUNKS', 'DEFENSE'];
          T.p.forEach((pl, k) => {
            const x = 20 + k * 150;
            text(ctx, pl.n, x, 142, '#fff');
            for (let j = 0; j < 5; j++) {
              text(ctx, lab[j], x, 154 + j * 11, '#999');
              for (let s = 0; s < 9; s++) { ctx.fillStyle = s < pl.r[j] ? '#ff7a10' : '#333'; ctx.fillRect(x + 50 + s * 9, 155 + j * 11, 7, 5); }
            }
          });
          text(ctx, 'ARROWS: CHOOSE   SPACE: SELECT', W / 2, 226, '#8cf', 1, 'center');
          return;
        }
        if (!g) return;
        drawCourt(ctx);
        scoreboard(ctx);
        if (bannerT > 0 && (mode === 'play' || mode === 'demo')) {
          const sc = banner.length > 14 ? 1 : 2;
          text(ctx, banner, W / 2 + 1, 41, '#000', sc, 'center');
          text(ctx, banner, W / 2, 40, (bannerT >> 2) & 1 ? bannerCol : '#fff', sc, 'center');
        }
        if (mode === 'demo' || mode === 'demoend') {
          panel(ctx, 70, 54, 180, 44);
          text(ctx, 'HOOPS JAM', W / 2, 60, '#ff7a10', 2, 'center');
          text(ctx, 'DEMO GAME', W / 2, 78, '#ccc', 1, 'center');
          startPrompt(ctx, 88);
        }
        if (mode === 'intro') {
          panel(ctx, 30, 60, 260, 90);
          text(ctx, 'GAME ' + (round + 1) + ' OF ' + ladder.length, W / 2, 68, '#ccc', 1, 'center');
          text(ctx, g.teams[0].name, W / 2, 84, '#fff', 1, 'center');
          text(ctx, 'VS', W / 2, 98, '#ff7a10', 2, 'center');
          text(ctx, g.teams[1].name, W / 2, 118, '#fff', 1, 'center');
          text(ctx, 'WINS ' + wins + '   POINTS ' + totalPts, W / 2, 134, '#8cf', 1, 'center');
        }
        if (mode === 'qbreak') {
          panel(ctx, 50, 70, 220, 70);
          text(ctx, g.q === 2 ? 'HALFTIME' : g.q >= 4 ? 'END OF REGULATION' : 'END OF QUARTER ' + g.q, W / 2, 80, '#ff0', 1, 'center');
          text(ctx, g.teams[0].ab + ' ' + g.score[0] + '  -  ' + g.score[1] + ' ' + g.teams[1].ab, W / 2, 98, '#fff', 2, 'center');
          if (g.q >= 4) text(ctx, 'OVERTIME!', W / 2, 122, '#f44', 1, 'center');
        }
        if (mode === 'final' || mode === 'won' || mode === 'held') {
          const won = g.score[0] > g.score[1];
          panel(ctx, 40, 66, 240, 80, won ? '#2c4' : '#f44');
          text(ctx, 'FINAL', W / 2, 74, '#fff', 1, 'center');
          text(ctx, g.teams[0].ab + ' ' + g.score[0] + '  -  ' + g.score[1] + ' ' + g.teams[1].ab, W / 2, 90, '#fff', 2, 'center');
          text(ctx, won ? 'YOU WIN!' : 'YOU LOSE', W / 2, 114, won ? '#2c4' : '#f44', 2, 'center');
          if (mode === 'won') text(ctx, round >= ladder.length && round % ladder.length === 0 ? 'YOU BEAT EVERY TEAM!' : 'NEXT: ' + TEAMS[ladder[round % ladder.length]].name, W / 2, 134, '#ff0', 1, 'center');
        }
        if (mode === 'gameover') {
          panel(ctx, 70, 80, 180, 56);
          text(ctx, 'GAME OVER', W / 2, 90, '#f44', 2, 'center');
          text(ctx, 'WINS ' + wins + '  POINTS ' + totalPts, W / 2, 114, '#fff', 1, 'center');
        }
      }
      return { update, render, destroy() { } };
    }
  });
})();
