// Tecmo Bowl (Tecmo, 1987) - from-scratch recreation of the arcade football game.
// Pick one of four plays, the defence guesses; break tackles by mashing, dive to tackle, throw to the open man.
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
  FONT['&'] = [12, 18, 20, 8, 21, 18, 13];
  FONT['#'] = [10, 10, 31, 10, 31, 10, 10];

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const HOME = { name: 'THUNDER', ab: 'THU', jersey: '#2850d8', helmet: '#e8e8f0', pants: '#e8e8f0', zone: '#1c3aa0', r: 6 };
  const LADDER = [
    { name: 'STALLIONS', ab: 'STA', jersey: '#f07818', helmet: '#f07818', pants: '#ffffff', zone: '#a04a10', r: 4 },
    { name: 'OUTLAWS', ab: 'OUT', jersey: '#202020', helmet: '#c0c0c8', pants: '#c0c0c8', zone: '#303038', r: 5 },
    { name: 'BLIZZARD', ab: 'BLZ', jersey: '#f0f8ff', helmet: '#60b0f0', pants: '#60b0f0', zone: '#3a78b0', r: 6 },
    { name: 'GRIZZLIES', ab: 'GRZ', jersey: '#6a3a1a', helmet: '#f0c020', pants: '#f0c020', zone: '#4a2810', r: 7 },
    { name: 'MARAUDERS', ab: 'MAR', jersey: '#6a28a8', helmet: '#f0d040', pants: '#f0d040', zone: '#481870', r: 8 },
    { name: 'COMETS', ab: 'COM', jersey: '#c81e28', helmet: '#20285a', pants: '#20285a', zone: '#801018', r: 9 }
  ];
  const PLAYS = [
    { name: 'SWEEP', run: true }, { name: 'DIVE', run: true },
    { name: 'SHORT PASS', run: false }, { name: 'BOMB', run: false }
  ];

  ArcadeRegistry.register({
    id: 'tecmobowl', title: 'Tecmo Bowl', year: 1987, maker: 'Tecmo',
    width: 320, height: 224, vector: false, pointer: false,
    controls: 'Arrows: run / pick play \u00b7 Space: select, throw, mash to break tackles, dive tackle \u00b7 X: next receiver / switch defender \u00b7 Enter: start',
    marquee: { bg: '#0a3010', fg: '#ffffff', accent: '#f0c020' },
    create(api) {
      const W = 320, H = 224, FY = 32, FW = 180, GL0 = 80, GL1 = 880, FL = 960, YD = 8;
      let hi = api.getHiScore(30);
      let mode = 'title', modeT = 0, coinFlash = 0;
      let g = null, round = 0, wins = 0, totalPts = 0;
      let players = [], ball = null, carrier = null, ctrl = null, grap = null, play = null, camX = W / 2;
      let msg = '', msgCol = '#fff', sel = 0, cpuSel = 0, target = 0, livT = 0, readRight = false, pending = null, kick = null;
      let parts = [];

      const snd = {
        whistle() { api.audio.tone(2600, 0.25, { type: 'square', vol: 0.08 }); api.audio.tone(2750, 0.25, { type: 'square', vol: 0.06 }); },
        hut() { api.audio.tone(180, 0.08, { type: 'sawtooth', vol: 0.15 }); api.audio.tone(170, 0.08, { type: 'sawtooth', vol: 0.15, delay: 0.16 }); },
        hit() { api.audio.noise(0.12, { vol: 0.25, freq: 900 }); },
        mash() { api.audio.tone(300 + Math.random() * 200, 0.03, { type: 'square', vol: 0.08 }); },
        thr() { api.audio.tone(600, 0.2, { type: 'triangle', vol: 0.12, slideTo: 900 }); },
        kick() { api.audio.noise(0.08, { vol: 0.3, freq: 500 }); api.audio.tone(120, 0.1, { type: 'square', vol: 0.15 }); },
        td() { api.audio.melody([[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.2], [659, 0.1], [784, 0.4]], { type: 'square', vol: 0.15 }); api.audio.noise(1.2, { vol: 0.08, freq: 1500, type: 'bandpass' }); },
        bad() { api.audio.melody([[330, 0.15], [262, 0.3]], { type: 'triangle', vol: 0.18 }); },
        beep(f) { api.audio.tone(f || 700, 0.05, { type: 'square', vol: 0.1 }); },
        cheer() { api.audio.noise(0.8, { vol: 0.08, freq: 1800, type: 'bandpass' }); }
      };

      // ---------------- match / possession state ----------------
      function newMatch() {
        const opp = LADDER[round % LADDER.length];
        const lvl = Math.min(9, opp.r + Math.floor(round / LADDER.length) * 2);
        g = { teams: [HOME, opp], score: [0, 0], q: 1, clock: 150, poss: 0, ballOn: 25, down: 1, toGo: 10, lvl, firstRecv: 0, ot: false, over: false };
        startPossession(0, 25, 'KICKOFF - TOUCHBACK');
      }
      function startPossession(team, on, text) {
        g.poss = team; g.ballOn = clamp(on, 1, 99); g.down = 1; g.toGo = Math.min(10, 100 - g.ballOn);
        say(text || '', '#fff');
      }
      function say(t, c) { msg = t; msgCol = c || '#fff'; }
      const human = () => 0;
      const humanOnOffense = () => g.poss === 0 && !g.demo;

      // ---------------- play setup ----------------
      function mk(team, role, x, y, idx) {
        const T = g.teams[team];
        const base = { QB: 1.3, RB: 1.62, WR: 1.66, OL: 1.12, DL: 1.3, LB: 1.45, DB: 1.6 }[role];
        const rate = team === 0 ? T.r : g.lvl;
        return { team, role, x, y, vx: 0, vy: 0, spd: base * (0.9 + rate * 0.022), down: 0, blockT: 0, shed: false, engaged: null,
          route: null, ri: 0, idx, dive: 0, face: 1, run: 0, immune: 0, str: 0.8 + rate * 0.06, hold: 0 };
      }
      function setupPlay() {
        players = []; parts = [];
        const x0 = GL0 + g.ballOn * YD, o = g.poss, d = 1 - o, c = FW / 2;
        const off = {
          QB: mk(o, 'QB', x0 - 12, c, 0), RB: mk(o, 'RB', x0 - 34, c, 0),
          OL: [mk(o, 'OL', x0 - 4, c - 12, 0), mk(o, 'OL', x0 - 4, c, 1), mk(o, 'OL', x0 - 4, c + 12, 2)],
          WR: [mk(o, 'WR', x0 - 4, 22, 0), mk(o, 'WR', x0 - 4, FW - 22, 1)]
        };
        const def = {
          DL: [mk(d, 'DL', x0 + 7, c - 12, 0), mk(d, 'DL', x0 + 7, c, 1), mk(d, 'DL', x0 + 7, c + 12, 2)],
          LB: [mk(d, 'LB', x0 + 30, c - 26, 0), mk(d, 'LB', x0 + 30, c + 26, 1)],
          DB: [mk(d, 'DB', x0 + 46, 26, 0), mk(d, 'DB', x0 + 46, FW - 26, 1)]
        };
        players.push(off.QB, off.RB, ...off.OL, ...off.WR, ...def.DL, ...def.LB, ...def.DB);
        play = { off, def, x0, c };
        for (const p of players) p.face = p.team === o ? 1 : -1;
        carrier = off.QB; ball = { mode: 'held', x: off.QB.x, y: off.QB.y, h: 0 };
        grap = null; livT = 0; target = 0;
        ctrl = humanOnOffense() ? carrier : def.LB[0];
        camX = clamp(x0 + 30, W / 2, FL - W / 2);
      }
      function assignRoutes(pn) {
        const { off, x0, c } = play;
        const R = (p, pts, end) => { p.route = pts.map(q => ({ x: q[0], y: q[1] })); p.ri = 0; p.end = end || 'go'; };
        if (pn === 0) { R(off.RB, [[x0 - 22, c - 44], [x0 + 6, c - 58]], 'go'); R(off.WR[0], [[x0 + 30, 22]], 'block'); R(off.WR[1], [[x0 + 30, FW - 22]], 'block'); }
        if (pn === 1) { R(off.RB, [[x0 - 14, c + 6], [x0 + 30, c + 6]], 'go'); R(off.WR[0], [[x0 + 30, 22]], 'block'); R(off.WR[1], [[x0 + 30, FW - 22]], 'block'); }
        if (pn === 2) { R(off.WR[0], [[x0 + 44, 24], [x0 + 70, 70]], 'go'); R(off.WR[1], [[x0 + 60, FW - 24], [x0 + 50, FW - 36]], 'stop'); R(off.RB, [[x0 - 20, c + 40], [x0 + 20, c + 60]], 'go'); }
        if (pn === 3) { R(off.WR[0], [[x0 + 300, 26]], 'go'); R(off.WR[1], [[x0 + 70, FW - 26], [x0 + 300, c + 10]], 'go'); R(off.RB, [[x0 - 30, c + 16]], 'stop'); }
      }

      // ---------------- live play ----------------
      function snap() {
        assignRoutes(g.poss === 0 ? sel : cpuSel);
        play.pn = g.poss === 0 ? sel : cpuSel;
        play.dn = g.poss === 0 ? cpuSel : sel;
        readRight = play.pn === play.dn;
        play.run = PLAYS[play.pn].run;
        play.throwT = 50 + Math.random() * 50;
        mode = 'live'; modeT = 0; snd.hut();
        if (readRight) { say('', '#fff'); }
      }
      function steer(p, tx, ty, sp) {
        const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
        if (d < 1) { p.vx *= 0.7; p.vy *= 0.7; return; }
        const s = Math.min(sp, d);
        p.vx += (dx / d * s - p.vx) * 0.25; p.vy += (dy / d * s - p.vy) * 0.25;
      }
      function goalX(p) { return p.team === g.poss ? GL1 + 20 : GL0 - 20; }
      function nearestOf(p, list) { let b = null, bd = 1e9; for (const q of list) { if (q.down) continue; const d = dist(p, q); if (d < bd) { bd = d; b = q; } } return [b, bd]; }
      const offense = () => players.filter(p => p.team === g.poss);
      const defense = () => players.filter(p => p.team !== g.poss);
      function foesOf(p) { return players.filter(q => q.team !== p.team); }

      function carrierAI(p) {
        const gx = goalX(p);
        let dx = Math.sign(gx - p.x), dy = 0;
        for (const f of foesOf(p)) {
          if (f.down) continue;
          const ex = p.x - f.x, ey = p.y - f.y, d = Math.hypot(ex, ey);
          if (d < 46 && Math.sign(f.x - p.x) === Math.sign(dx) || d < 18) { dy += ey / (d * d) * 18; dx += ex / (d * d) * 8; }
        }
        if (p.y < 34) dy += (34 - p.y) * 0.06; if (p.y > FW - 34) dy -= (p.y - FW + 34) * 0.06;
        const n = Math.hypot(dx, dy) || 1;
        steer(p, p.x + dx / n * 20, p.y + dy / n * 20, p.spd);
      }
      function qbAI(p) {
        const { x0 } = play;
        if (play.run) { steer(p, x0 - 16, p.y, 0.6); return; }
        if (p.x > x0 + 2) { carrierAI(p); return; }
        if (modeT < 30) { steer(p, x0 - 34, play.c, p.spd * 0.8); return; }
        const [f, fd] = nearestOf(p, defense());
        // pick the most open receiver
        const recv = [play.off.WR[0], play.off.WR[1], play.off.RB].filter(r => !r.down);
        let best = null, bs = -1e9;
        for (const r of recv) {
          const [rf, rd] = nearestOf(r, defense());
          const s = Math.min(rd, 50) * 2 + (r.x - x0) * 0.25 - Math.abs(r.x - p.x) * 0.05;
          if (s > bs) { bs = s; best = r; }
        }
        if (best && ((modeT > play.throwT && bs > 40) || modeT > 130 || (fd < 18 && modeT > 25 && Math.random() < 0.15))) { throwTo(p, best); return; }
        if (fd < 26) steer(p, p.x - 6, p.y + (p.y > f.y ? 14 : -14), p.spd); else p.vx *= 0.8, p.vy *= 0.8;
      }
      function throwTo(qb, r) {
        if (carrier !== qb || qb.x > play.x0 + 2) return;
        const d = dist(qb, r), T = Math.max(22, d / 4.2);
        const lx = clamp(r.x + r.vx * T, 0, FL), ly = clamp(r.y + r.vy * T, 6, FW - 6);
        ball = { mode: 'air', x: qb.x, y: qb.y, h: 8, sx: qb.x, sy: qb.y, tx: lx, ty: ly, t: 0, T: Math.round(T), to: r, peak: 14 + d * 0.08 };
        carrier = null; snd.thr(); play.thrown = true;
        if (ctrl === qb) ctrl = null;
      }
      function blockAI(p) {
        // blockers: get between the nearest free defender and the ball carrier
        const ref = carrier || play.off.QB;
        let [f] = nearestOf(p, defense().filter(q => q !== ctrl || true));
        if (p.role === 'OL') { f = play.pn === 0 ? [play.def.LB[0], play.def.DL[0], play.def.DL[1]][p.idx] : play.def.DL[p.idx]; if (f.down || f.shed) { [f] = nearestOf(p, defense()); } }
        if (!f) return;
        const dx = ref.x - f.x, dy = ref.y - f.y, d = Math.hypot(dx, dy) || 1;
        steer(p, f.x + dx / d * 6, f.y + dy / d * 6, p.spd);
      }
      function routeAI(p) {
        if (play.thrown && ball.mode === 'air' && ball.to === p) { steer(p, ball.tx, ball.ty, p.spd); return; }
        if (carrier && carrier !== p && carrier.team === p.team && carrier !== play.off.QB) { blockAI(p); return; }
        if (!p.route) { blockAI(p); return; }
        if (p.ri < p.route.length) {
          const q = p.route[p.ri];
          steer(p, q.x, q.y, p.spd);
          if (Math.hypot(q.x - p.x, q.y - p.y) < 5) p.ri++;
        } else if (p.end === 'go') steer(p, p.x + 30, p.y, p.spd);
        else if (p.end === 'block') blockAI(p);
        else { p.vx *= 0.8; p.vy *= 0.8; }
      }
      function defAI(p) {
        const tgt = carrier || (ball.mode === 'air' ? null : play.off.QB);
        const lead = t => ({ x: t.x + t.vx * 10, y: t.y + t.vy * 10 });
        if (ball.mode === 'air') {
          if (p.role === 'DB' || p.role === 'LB') { steer(p, ball.tx, ball.ty, p.spd); return; }
          steer(p, ball.tx, ball.ty, p.spd * 0.7); return;
        }
        if (!tgt) return;
        const pastLOS = tgt.x > play.x0 + 4 || tgt.team !== g.poss;
        const chase = () => { const L = lead(tgt); steer(p, L.x, L.y, p.spd * (pastLOS ? 1.12 : 1)); if (dist(p, tgt) < 16 && !p.dive && p !== ctrl && Math.random() < (p.team === 1 ? 0.04 + g.lvl * 0.004 : 0.05)) startDive(p, tgt); };
        if (p.role === 'DL') { chase(); return; }
        if (p.role === 'LB') {
          if (readRight || (play.run && modeT > 16) || pastLOS || tgt === play.off.RB) { chase(); return; }
          const r = p.idx === 0 ? play.off.WR[0] : play.off.RB;
          steer(p, (r.x + play.x0 + 20) / 2 + 10, (r.y + play.c) / 2, p.spd * 0.9); return;
        }
        if (p.role === 'DB') {
          const wr = play.off.WR[p.idx];
          if (pastLOS || carrier !== play.off.QB || readRight && play.run) { chase(); return; }
          const cushion = 10 - g.lvl * 0.6;
          steer(p, wr.x + wr.vx * 8 + cushion, wr.y + wr.vy * 8, p.spd * (p.team === 1 ? 0.9 + g.lvl * 0.012 : 0.95));
        }
      }
      function turnoverAI(p) {
        if (p.team === carrier.team) {
          const [f] = nearestOf(carrier, foesOf(carrier));
          if (f) steer(p, (f.x + carrier.x) / 2, (f.y + carrier.y) / 2, p.spd); else steer(p, goalX(carrier), p.y, p.spd);
        } else {
          steer(p, carrier.x + carrier.vx * 10, carrier.y + carrier.vy * 10, p.spd);
          if (dist(p, carrier) < 16 && !p.dive && p !== ctrl && Math.random() < 0.04) startDive(p, carrier);
        }
      }
      function startDive(p, tgt) {
        const dx = (tgt ? tgt.x + tgt.vx * 6 : p.x + p.face * 10) - p.x, dy = (tgt ? tgt.y + tgt.vy * 6 : p.y) - p.y, d = Math.hypot(dx, dy) || 1;
        p.dive = 16; p.vx = dx / d * 3.1; p.vy = dy / d * 3.1; p.face = Math.sign(p.vx) || p.face;
        api.audio.tone(200, 0.1, { type: 'triangle', vol: 0.1, slideTo: 120 });
      }
      function humanMove(p) {
        const ix = (api.key('ArrowRight') ? 1 : 0) - (api.key('ArrowLeft') ? 1 : 0), iy = (api.key('ArrowDown') ? 1 : 0) - (api.key('ArrowUp') ? 1 : 0);
        const n = Math.hypot(ix, iy) || 1;
        const sp = p.spd * (p === carrier ? 1.04 : 1.02);
        if (ix || iy) { p.vx += (ix / n * sp - p.vx) * 0.3; p.vy += (iy / n * sp - p.vy) * 0.3; } else { p.vx *= 0.8; p.vy *= 0.8; }
      }

      function liveStep() {
        livT++;
        const QB = play.off.QB;
        // handoff on running plays
        if (play.run && carrier === QB && !grap && modeT >= 12) {
          carrier = play.off.RB; if (ctrl === QB) ctrl = carrier; api.audio.tone(400, 0.04, { type: 'square', vol: 0.08 });
        }
        // human buttons
        if (!g.demo) {
          if (g.poss === 0 && carrier === QB && !play.run && QB.x <= play.x0 + 2) {
            const rec = [play.off.WR[0], play.off.WR[1], play.off.RB];
            if (api.pressed('KeyX')) { target = (target + 1) % 3; snd.beep(900); }
            if (api.pressed('Space') && modeT > 8) throwTo(QB, rec[target]);
          } else if ((g.poss === 1 && (!carrier || carrier.team === 1)) || (carrier && carrier.team === 1)) {
            if (api.pressed('KeyX')) {
              const t = carrier || (ball.mode === 'air' ? { x: ball.tx, y: ball.ty } : QB);
              let b = null, bd = 1e9; for (const p of players) { if (p.team !== 0 || p.down) continue; const d = Math.hypot(p.x - t.x, p.y - t.y); if (d < bd) { bd = d; b = p; } }
              if (b) { ctrl = b; snd.beep(500); }
            }
            if (api.pressed('Space') && ctrl && ctrl !== carrier && !ctrl.dive && !ctrl.down && !grap) startDive(ctrl, null);
          }
        }
        // movement
        for (const p of players) {
          if (p.immune > 0) p.immune--;
          if (p.down > 0) { p.down--; p.vx *= 0.85; p.vy *= 0.85; p.x += p.vx; p.y += p.vy; continue; }
          if (p.dive > 0) {
            p.dive--; p.x += p.vx; p.y += p.vy;
            if (carrier && carrier.team !== p.team && dist(p, carrier) < 9 && carrier.immune <= 0) { tackle(p, 'dive'); return; }
            if (p.dive === 0) { p.down = 30; p.vx *= 0.3; p.vy *= 0.3; }
            continue;
          }
          if (grap && (p === carrier || p === grap.def)) { p.vx *= 0.5; p.vy *= 0.5; }
          else if (p === ctrl) humanMove(p);
          else if (p === carrier) {
            if (p === QB && !play.run) qbAI(p);
            else if (play.run && p === play.off.RB && p.route && p.ri < p.route.length && p.x < play.x0 + 8) { const q = p.route[p.ri]; steer(p, q.x, q.y, p.spd); if (Math.hypot(q.x - p.x, q.y - p.y) < 6) p.ri++; }
            else carrierAI(p);
          }
          else if (carrier && carrier.team !== g.poss) turnoverAI(p);
          else if (p.team === g.poss) { if (p.role === 'OL') blockAI(p); else if (p === QB) { p.vx *= 0.8; p.vy *= 0.8; } else routeAI(p); }
          else defAI(p);
          // blocking contact slows defenders
          let slow = 1; p.blocked = false;
          if ((!carrier || carrier.team === g.poss) && p.team !== g.poss && !(readRight && (p.role === 'DL' || p.role === 'LB'))) {
            for (const b of players) {
              if (b.team !== g.poss || b.down || b === carrier || b.role === 'QB') continue;
              if (Math.hypot(b.x - p.x, b.y - p.y) < 8) {
                p.blockT++; slow = p.shed ? 0.85 : 0.18; p.blocked = !p.shed;
                if (p.blockT > (p.role === 'DL' ? 50 : 18) + 30 / p.str - (p.team === 1 ? g.lvl * 2 : 6) + rnd(0, 30)) p.shed = true;
                break;
              }
            }
          }
          p.x += p.vx * slow; p.y += p.vy * slow;
          if (Math.abs(p.vx) > 0.2) p.face = Math.sign(p.vx);
          p.run += Math.hypot(p.vx, p.vy) * slow;
        }
        // keep players from stacking
        for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) {
          const a = players[i], b = players[j];
          if (a.down || b.down || a.dive || b.dive) continue;
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
          if (d < 6 && d > 0.01) { const o = (6 - d) / 2; a.x -= dx / d * o; a.y -= dy / d * o; b.x += dx / d * o; b.y += dy / d * o; }
        }
        for (const p of players) if (p !== carrier) p.y = clamp(p.y, -14, FW + 14);
        updateBall();
        if (mode !== 'live') return;
        if (!carrier) return;
        // tackles
        if (grap) {
          grap.t++;
          if (carrier === ctrl) { if (api.anyPressed('Space', 'KeyX')) { grap.pw += 1; snd.mash(); } }
          else if (Math.random() < 0.1 + (carrier.team === 1 ? g.lvl * 0.012 : 0.05)) grap.pw += 1;
          if (grap.def === ctrl && api.anyPressed('Space', 'KeyX')) { grap.pw -= 0.6; snd.mash(); }
          const need = 6 + grap.def.str * 3 + (carrier.role === 'QB' ? 4 : 0);
          if (grap.pw >= need) {
            grap.def.down = 50; grap.def.vx = -carrier.face; carrier.immune = 24; grap = null; snd.hit();
            say('BROKE THE TACKLE!', '#ff0');
          } else if (grap.t > 46) { tackle(grap.def, 'hold'); return; }
        }
        for (const d of foesOf(carrier)) {
          if (d.down || d.dive || d.blocked || carrier.immune > 0) continue;
          if (dist(d, carrier) < 7) {
            if (!grap) { grap = { def: d, t: 0, pw: 0 }; snd.hit(); }
            else if (grap.def !== d) { tackle(d, 'gang'); return; }
          }
        }
        // sidelines / end zones
        if (carrier.y < 0 || carrier.y > FW) { endPlay('out'); return; }
        const gx = goalX(carrier);
        if ((gx > GL1 && carrier.x >= GL1) || (gx < GL0 && carrier.x <= GL0)) { endPlay('td'); return; }
      }
      function tackle(d, how) {
        if (!carrier) return;
        d.down = 20; carrier.down = 40; snd.hit();
        endPlay('tackle');
      }
      function updateBall() {
        if (ball.mode === 'held') { if (carrier) { ball.x = carrier.x + carrier.face * 3; ball.y = carrier.y; ball.h = 5; } return; }
        if (ball.mode !== 'air') return;
        ball.t++;
        const t = ball.t / ball.T;
        ball.x = ball.sx + (ball.tx - ball.sx) * t; ball.y = ball.sy + (ball.ty - ball.sy) * t; ball.h = 8 + ball.peak * 4 * t * (1 - t);
        if (ball.t < ball.T) return;
        // arrival: who is there?
        const r = ball.to;
        const rd = r.down ? 99 : Math.hypot(r.x - ball.x, r.y - ball.y);
        const [dfn, dd] = nearestOf({ x: ball.x, y: ball.y }, defense());
        const recOK = rd < 11, defOK = dfn && dd < 10;
        if (recOK && (!defOK || Math.random() < (dd > rd ? 0.7 : 0.4))) {
          carrier = r; ball.mode = 'held'; if (humanOnOffense()) ctrl = r; say('', '#fff'); api.audio.tone(800, 0.06, { type: 'square', vol: 0.1 });
          return;
        }
        if (defOK && Math.random() < (recOK ? 0.5 : 0.62) - (dfn.team === 1 ? 0 : 0.1) + (dfn.team === 1 ? g.lvl * 0.015 : 0)) {
          carrier = dfn; ball.mode = 'held'; say('INTERCEPTED!', '#f44');
          if (!humanOnOffense()) ctrl = g.demo ? null : dfn; else { const [c2] = nearestOf(dfn, offense()); ctrl = c2; }
          play.intercepted = true; snd.bad();
          return;
        }
        ball.mode = 'dead'; endPlay('incomplete');
      }

      // ---------------- results ----------------
      function endPlay(how) {
        snd.whistle();
        const endX = carrier ? carrier.x : play.x0;
        const ct = carrier ? carrier.team : g.poss;
        pending = { how, endX, ct };
        mode = 'dead'; modeT = 0;
        const gain = Math.round((endX - play.x0) / YD);
        say('', '#fff');
        if (how === 'td') { say('TOUCHDOWN!', '#ff0'); snd.td(); }
        else if (ct !== g.poss) say('TURNOVER!', '#f44');
        else if (how === 'incomplete') say('INCOMPLETE', '#ccc');
        else if (carrier && carrier.role === 'QB' && endX < play.x0) say('SACKED!', '#f80');
        else if (how === 'out') say('OUT OF BOUNDS', '#ccc');
        else say(gain > 0 ? 'GAIN OF ' + gain : gain < 0 ? 'LOSS OF ' + (-gain) : 'NO GAIN', '#fff');
      }
      function scorePts(team, n) {
        g.score[team] += n;
        if (team === 0) totalPts += n;
        if (g.q > 4) g.over = true;
      }
      function resolve() {
        const { how, endX, ct } = pending;
        let runoff = how === 'incomplete' || how === 'out' ? 2 : 7;
        if (how === 'td') {
          scorePts(ct, 6);
          const good = Math.random() < 0.95; if (good) scorePts(ct, 1);
          startPossession(1 - ct, 25, good ? 'EXTRA POINT IS GOOD' : 'EXTRA POINT NO GOOD');
        } else if (ct !== g.poss) {
          // interception return
          let yds = (endX - GL0) / YD; let on = 100 - yds;
          if (on <= 0) on = 20;
          startPossession(ct, on, 'TURNOVER');
        } else if (how === 'incomplete') {
          nextDown(g.ballOn);
        } else {
          const on = (endX - GL0) / YD;
          if (on <= 0) { scorePts(1 - g.poss, 2); say('SAFETY!', '#f44'); const t = 1 - g.poss; startPossession(t, 35, 'SAFETY!'); }
          else nextDown(Math.min(99, on));
        }
        g.clock -= runoff;
        return endOfPeriodCheck();
      }
      function nextDown(on) {
        const fd = g.ballOn + g.toGo;
        const gain = Math.round(on - g.ballOn);
        g.ballOn = Math.max(1, Math.round(on * 2) / 2);
        if (g.ballOn >= fd) { g.down = 1; g.toGo = Math.min(10, 100 - Math.ceil(g.ballOn)); say('FIRST DOWN', '#ff0'); }
        else {
          g.down++; g.toGo = Math.max(0.5, fd - g.ballOn);
          if (g.down > 4) { startPossession(1 - g.poss, 100 - g.ballOn, 'TURNOVER ON DOWNS'); return; }
        }
      }
      function endOfPeriodCheck() {
        if (g.over) { g.clock = 0; return finishMatchState(); }
        if (g.clock > 0) return false;
        if (g.q === 4 || g.q > 4) {
          if (g.score[0] !== g.score[1]) return finishMatchState();
          g.q++; g.clock = 120; g.ot = true; startPossession(Math.random() < 0.5 ? 0 : 1, 25, 'SUDDEN DEATH OVERTIME');
          mode = 'qbreak'; modeT = 0; return true;
        }
        g.q++; g.clock = 150;
        if (g.q === 3) startPossession(1 - g.firstRecv, 25, 'SECOND HALF KICKOFF');
        mode = 'qbreak'; modeT = 0;
        return true;
      }
      function finishMatchState() { mode = 'final'; modeT = 0; snd.whistle(); return true; }

      // ---------------- kicking ----------------
      function doKick(type) {
        const team = g.poss;
        kick = { type, t: 0, team };
        if (type === 'punt') {
          const d = 36 + Math.random() * 16 - (team === 1 ? 0 : 0);
          let land = g.ballOn + d;
          kick.from = g.ballOn; kick.to = Math.min(land, 110);
          kick.res = land >= 100 ? 20 : 100 - land;
        } else {
          const d = 100 - g.ballOn + 17;
          const p = d < 30 ? 0.96 : d < 40 ? 0.85 : d < 50 ? 0.62 : d < 57 ? 0.35 : 0.08;
          kick.good = Math.random() < p; kick.from = g.ballOn; kick.to = 110; kick.d = Math.round(d);
        }
        snd.kick(); mode = 'kick'; modeT = 0;
      }
      function resolveKick() {
        if (kick.type === 'punt') startPossession(1 - kick.team, kick.res, 'PUNT');
        else if (kick.good) { scorePts(kick.team, 3); startPossession(1 - kick.team, 25, 'FIELD GOAL IS GOOD!'); snd.cheer(); }
        else startPossession(1 - kick.team, Math.max(20, 100 - g.ballOn), 'NO GOOD!');
        g.clock -= 6;
        if (!endOfPeriodCheck()) toPlaySel();
      }

      // ---------------- CPU play calling ----------------
      function cpuCall() {
        if (g.poss === 1) {
          if (g.down === 4) {
            const fgd = 100 - g.ballOn + 17;
            const losing = g.score[1] < g.score[0], late = g.q >= 4 && g.clock < 60;
            if (g.toGo <= 2 && g.ballOn > 45) return Math.random() < 0.5 ? 1 : 2;
            if (late && losing && g.score[0] - g.score[1] > 3) return Math.random() * 4 | 0;
            if (fgd <= 52) return 5;
            return 4;
          }
          if (g.toGo > 8) return Math.random() < 0.7 ? 2 + (Math.random() * 2 | 0) : Math.random() * 2 | 0;
          return Math.random() * 4 | 0;
        }
        // defence: cheat a little on harder teams
        if (Math.random() < 0.12 + g.lvl * 0.025) return sel;
        if (g.toGo > 8) return Math.random() < 0.65 ? 2 + (Math.random() * 2 | 0) : Math.random() * 2 | 0;
        return Math.random() * 4 | 0;
      }

      // ---------------- flow ----------------
      function tryStart() {
        if (api.useCredit()) { round = 0; wins = 0; totalPts = 0; beginMatch(); return; }
        coinFlash = 90; api.audio.tone(70, 0.25, { type: 'square', vol: 0.2 });
      }
      function beginMatch() { newMatch(); mode = 'intro'; modeT = 0; }
      function toPlaySel() { mode = 'playsel'; modeT = 0; sel = 0; setupPlay(); }

      function update() {
        modeT++;
        if (coinFlash > 0) coinFlash = api.credits > 0 ? 0 : coinFlash - 1;
        for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.x += q.vx; q.y += q.vy; if (--q.l <= 0) parts.splice(i, 1); }
        switch (mode) {
          case 'title':
            if (api.anyPressed('Enter', 'Space')) tryStart();
            if (modeT > 900) { mode = 'demo'; modeT = 0; demoInit(); }
            break;
          case 'demo':
            demoStep();
            if (api.anyPressed('Enter', 'Space')) tryStart();
            if (modeT > 1500) { mode = 'title'; modeT = 0; g = null; }
            break;
          case 'intro':
            if (modeT > 200 || (modeT > 30 && api.anyPressed('Space', 'Enter'))) toPlaySel();
            break;
          case 'playsel': {
            const n = g.down === 4 && g.poss === 0 ? 6 : 4;
            if (api.pressed('ArrowLeft') || api.pressed('ArrowRight')) { sel = (sel % 2 === 0) ? Math.min(n - 1, sel + 1) : sel - 1; snd.beep(); }
            if (api.pressed('ArrowUp')) { sel = (sel - 2 + n) % n; snd.beep(); }
            if (api.pressed('ArrowDown')) { sel = (sel + 2) % n; snd.beep(); }
            if ((modeT > 15 && api.pressed('Space')) || modeT > 600) {
              cpuSel = cpuCall();
              if (g.poss === 0 && sel >= 4) { doKick(sel === 4 ? 'punt' : 'fg'); break; }
              if (g.poss === 1 && cpuSel >= 4) { doKick(cpuSel === 4 ? 'punt' : 'fg'); break; }
              say('', '#fff'); setupPlay(); mode = 'presnap'; modeT = 0; snd.beep(1200);
            }
            break;
          }
          case 'presnap':
            camX += (clamp(play.x0 + 30, W / 2, FL - W / 2) - camX) * 0.2;
            if (modeT > 50) snap();
            break;
          case 'live': {
            liveStep();
            const f = carrier || ball;
            camX += (clamp(f.x + 30, W / 2, FL - W / 2) - camX) * 0.12;
            g.clock -= 1.6 / 60;
            break;
          }
          case 'dead':
            for (const p of players) { p.x += p.vx * 0.5; p.y += p.vy * 0.5; p.vx *= 0.9; p.vy *= 0.9; if (p.down) p.down--; }
            if (modeT === 100 || (modeT > 30 && modeT < 100 && api.pressed('Space'))) {
              modeT = 100;
              if (!resolve()) toPlaySel(); else if (mode === 'dead') toPlaySel();
            }
            break;
          case 'kick':
            if (modeT > 110) resolveKick();
            break;
          case 'qbreak':
            if (modeT > 200 || (modeT > 40 && api.pressed('Space'))) toPlaySel();
            break;
          case 'final':
            if (modeT > 260 || (modeT > 60 && api.pressed('Space'))) finishMatch();
            break;
          case 'won':
            if (modeT > 260 || (modeT > 60 && api.pressed('Space'))) beginMatch();
            break;
          case 'held': break;
          case 'gameover':
            if (modeT > 300) { mode = 'title'; modeT = 0; g = null; }
            break;
        }
      }
      function finishMatch() {
        if (totalPts > hi) { hi = totalPts; }
        api.setHiScore(totalPts);
        if (g.score[0] > g.score[1]) { wins++; round++; mode = 'won'; modeT = 0; snd.td(); }
        else {
          mode = 'held';
          const end = () => { mode = 'gameover'; modeT = 0; snd.bad(); };
          if (api.offerContinue) api.offerContinue(() => { beginMatch(); }, end); else end();
        }
      }
      // attract demo: CPU vs CPU plays
      function demoInit() { round = Math.random() * 6 | 0; newMatch(); g.demo = true; demoPlay(); }
      function demoPlay() { setupPlay(); sel = Math.random() * 4 | 0; cpuSel = Math.random() * 4 | 0; g.demoT = 0; g.demoMode = 'pre'; }
      function demoStep() {
        g.demoT++;
        if (g.demoMode === 'pre') { if (g.demoT > 40) { const save = g.poss; snap(); mode = 'demo'; ctrl = null; g.demoMode = 'live'; } return; }
        if (g.demoMode === 'live') {
          const saveMode = mode; mode = 'live'; ctrl = null;
          liveStep();
          if (mode === 'dead') { g.demoMode = 'dead'; g.demoT = 0; }
          mode = saveMode;
          const f = carrier || ball; camX += (clamp(f.x + 30, W / 2, FL - W / 2) - camX) * 0.12;
          if (g.demoT > 600) { g.demoMode = 'dead'; g.demoT = 0; }
          return;
        }
        if (g.demoMode === 'dead' && g.demoT > 80) { const save = g.poss; pending = null; g.ballOn = 15 + Math.random() * 60; g.poss = Math.random() < 0.5 ? 0 : 1; demoPlay(); }
      }

      // ---------------- rendering ----------------
      const sx = x => Math.round(x - camX + W / 2);
      const sy = y => Math.round(FY + y);
      function drawField(ctx) {
        ctx.fillStyle = '#1a5a1a'; ctx.fillRect(0, FY - 10, W, FW + 20);
        for (let yd = 0; yd < 100; yd += 5) {
          const x = sx(GL0 + yd * YD); ctx.fillStyle = (yd / 5) & 1 ? '#2f8a2f' : '#348f34'; ctx.fillRect(x, sy(0), YD * 5, FW);
        }
        // end zones
        const offT = g.teams[g.poss], defT = g.teams[1 - g.poss];
        ctx.fillStyle = offT.zone; ctx.fillRect(sx(0), sy(0), GL0, FW);
        ctx.fillStyle = defT.zone; ctx.fillRect(sx(GL1), sy(0), FL - GL1, FW);
        for (let k = 0; k < offT.name.length; k++) text(ctx, offT.name[k], sx(36), sy(FW / 2 - offT.name.length * 6 + k * 12), 'rgba(255,255,255,.55)', 2);
        for (let k = 0; k < defT.name.length; k++) text(ctx, defT.name[k], sx(GL1 + 36), sy(FW / 2 - defT.name.length * 6 + k * 12), 'rgba(255,255,255,.55)', 2);
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx(0), sy(0) - 1, FL, 2); ctx.fillRect(sx(0), sy(FW) - 1, FL, 2);
        for (let yd = 0; yd <= 100; yd += 5) {
          const x = sx(GL0 + yd * YD); if (x < -10 || x > W + 10) continue;
          ctx.fillRect(x, sy(0), yd % 50 === 0 ? 2 : 1, FW);
          if (yd % 10 === 0 && yd > 0 && yd < 100) {
            const n = String(yd <= 50 ? yd : 100 - yd);
            text(ctx, n, x, sy(14), '#fff', 1, 'center'); text(ctx, n, x, sy(FW - 21), '#fff', 1, 'center');
          }
        }
        for (let yd = 1; yd < 100; yd++) { const x = sx(GL0 + yd * YD); if (x < 0 || x > W) continue; ctx.fillRect(x, sy(60), 1, 3); ctx.fillRect(x, sy(FW - 63), 1, 3); ctx.fillRect(x, sy(2), 1, 3); ctx.fillRect(x, sy(FW - 5), 1, 3); }
        // goal posts
        for (const gx of [4, FL - 4]) { const x = sx(gx); ctx.fillStyle = '#ff0'; ctx.fillRect(x - 1, sy(FW / 2 - 14), 2, 28); ctx.fillRect(x - 3, sy(FW / 2 - 14), 6, 1); ctx.fillRect(x - 3, sy(FW / 2 + 13), 6, 1); }
        // scrimmage & first-down lines
        if (mode !== 'kick') {
          const los = sx(GL0 + g.ballOn * YD); ctx.fillStyle = '#4a8aff'; ctx.fillRect(los, sy(0), 1, FW);
          const fd = sx(GL0 + Math.min(100, g.ballOn + g.toGo) * YD); ctx.fillStyle = '#ffd820'; ctx.fillRect(fd, sy(0), 1, FW);
        }
        // sidelines crowd strip
        for (let i = 0; i < 64; i++) { const x = ((i * 37 - camX * 0.9) % (W + 20) + W + 20) % (W + 20) - 10; ctx.fillStyle = ['#c33', '#33c', '#cc3', '#ddd'][i & 3]; ctx.fillRect(x, FY - 9, 3, 3); ctx.fillRect((x + 17) % W, FY + FW + 6, 3, 3); }
      }
      function drawMan(ctx, p) {
        const T = g.teams[p.team], x = sx(p.x), y = sy(p.y);
        if (x < -10 || x > W + 10) return;
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x - 3, y + 1, 7, 2);
        if (p.down || p.dive) {
          ctx.fillStyle = T.jersey; ctx.fillRect(x - 5, y - 4, 8, 4); ctx.fillStyle = T.pants; ctx.fillRect(x - 7 * p.face + (p.face > 0 ? 0 : 5), y - 4, 3, 4);
          ctx.fillStyle = T.helmet; ctx.fillRect(p.face > 0 ? x + 3 : x - 8, y - 5, 4, 4);
          return;
        }
        const st = Math.floor(p.run / 4) % 2;
        ctx.fillStyle = T.pants; ctx.fillRect(x - 2, y - 5, 5, 2);
        ctx.fillStyle = '#222'; ctx.fillRect(x - 2 + (st ? 1 : 0), y - 3, 2, 3); ctx.fillRect(x + 1 - (st ? 1 : 0), y - 3, 2, 3);
        ctx.fillStyle = T.jersey; ctx.fillRect(x - 3, y - 10, 7, 5);
        ctx.fillStyle = T.helmet; ctx.fillRect(x - 2, y - 14, 5, 4);
        ctx.fillStyle = '#222'; ctx.fillRect(p.face > 0 ? x + 2 : x - 2, y - 13, 1, 2);
        if (p === carrier) { ctx.fillStyle = '#8a4a1a'; ctx.fillRect(x + p.face * 3 - 1, y - 9, 3, 2); }
      }
      function drawPlayers(ctx) {
        const ps = players.slice().sort((a, b) => a.y - b.y);
        for (const p of ps) drawMan(ctx, p);
        if (ctrl && (mode === 'live' || mode === 'presnap')) {
          const x = sx(ctrl.x), y = sy(ctrl.y) - 20;
          ctx.fillStyle = (api.frame & 8) ? '#ff0' : '#f80'; ctx.fillRect(x - 2, y, 5, 1); ctx.fillRect(x - 1, y + 1, 3, 1); ctx.fillRect(x, y + 2, 1, 1);
        }
        if (humanOnOffense() && mode === 'live' && carrier === play.off.QB && !play.run) {
          const r = [play.off.WR[0], play.off.WR[1], play.off.RB][target];
          const x = sx(r.x), y = sy(r.y) - 22;
          text(ctx, String(target + 1), x - 2, y, (api.frame & 4) ? '#fff' : '#f44');
        }
        if (ball.mode === 'air') {
          const x = sx(ball.x), y = sy(ball.y);
          ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - 1, y, 3, 1);
          ctx.fillStyle = '#8a4a1a'; ctx.fillRect(x - 2, y - Math.round(ball.h) - 1, 4, 3); ctx.fillStyle = '#fff'; ctx.fillRect(x, y - Math.round(ball.h), 1, 1);
        }
        if (grap && carrier) {
          const x = sx(carrier.x), y = sy(carrier.y) - 26;
          const need = 6 + grap.def.str * 3 + (carrier.role === 'QB' ? 4 : 0);
          ctx.fillStyle = '#000'; ctx.fillRect(x - 13, y, 26, 4);
          ctx.fillStyle = '#ff0'; ctx.fillRect(x - 12, y + 1, Math.round(24 * clamp(grap.pw / need, 0, 1)), 2);
          if (carrier === ctrl && (api.frame & 8)) text(ctx, 'MASH!', x, y - 9, '#fff', 1, 'center');
        }
      }
      function fmt(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
      function ord(n) { return ['1ST', '2ND', '3RD', '4TH', '4TH'][n - 1] || '4TH'; }
      function hud(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 22);
        const A = g.teams[0], B = g.teams[1];
        ctx.fillStyle = A.jersey; ctx.fillRect(2, 2, 34, 9); text(ctx, A.ab, 19, 3, A.helmet === A.jersey ? '#fff' : A.helmet, 1, 'center');
        text(ctx, String(g.score[0]).padStart(2, ' '), 40, 3, '#fff');
        ctx.fillStyle = B.jersey; ctx.fillRect(W - 36, 2, 34, 9); text(ctx, B.ab, W - 19, 3, B.helmet === B.jersey ? '#fff' : B.helmet, 1, 'center');
        text(ctx, String(g.score[1]), W - 40, 3, '#fff', 1, 'right');
        if (g.poss === 0) { ctx.fillStyle = '#ff0'; ctx.fillRect(57, 5, 3, 3); } else { ctx.fillStyle = '#ff0'; ctx.fillRect(W - 60, 5, 3, 3); }
        text(ctx, (g.q > 4 ? 'OT' : 'Q' + g.q) + ' ' + fmt(g.clock), W / 2, 3, '#ff0', 1, 'center');
        const on = Math.round(g.ballOn), side = on <= 50 ? (on === 50 ? '' : 'OWN ') : 'OPP ';
        const togo = g.ballOn + g.toGo >= 100 ? 'GOAL' : String(Math.max(1, Math.round(g.toGo)));
        text(ctx, ord(g.down) + ' & ' + togo + '  BALL ON ' + side + (on <= 50 ? on : 100 - on), W / 2, 13, '#fff', 1, 'center');
      }
      function panel(ctx, x, y, w, h, c) { ctx.fillStyle = 'rgba(0,0,20,.88)'; ctx.fillRect(x, y, w, h); ctx.fillStyle = c || '#f0c020'; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h); }
      function diagram(ctx, i, x, y, w, h, hl) {
        ctx.fillStyle = hl ? '#2a5a2a' : '#123a12'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = hl ? '#ff0' : '#4a7a4a'; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
        text(ctx, (i + 1) + ' ' + (i < 4 ? PLAYS[i].name : i === 4 ? 'PUNT' : 'FIELD GOAL'), x + 4, y + 3, hl ? '#ff0' : '#ccc');
        if (i >= 4) return;
        const ox = x + 18, oy = y + 30, lc = hl ? '#fff' : '#aaa';
        ctx.fillStyle = '#fff'; for (let k = -1; k <= 1; k++) ctx.fillRect(ox, oy + k * 6 - 1, 3, 3);
        ctx.fillRect(ox - 5, oy - 1, 3, 3); ctx.fillRect(ox - 12, oy - 1, 3, 3); ctx.fillRect(ox, oy - 18, 3, 3); ctx.fillRect(ox, oy + 16, 3, 3);
        ctx.strokeStyle = lc; ctx.beginPath();
        const L = (pts) => { ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]); };
        if (i === 0) L([[ox - 11, oy], [ox - 8, oy - 10], [ox + 4, oy - 14], [ox + 40, oy - 14]]);
        if (i === 1) L([[ox - 11, oy], [ox + 40, oy]]);
        if (i === 2) { L([[ox + 1, oy - 17], [ox + 18, oy - 17], [ox + 28, oy - 6]]); L([[ox + 1, oy + 17], [ox + 20, oy + 17], [ox + 16, oy + 13]]); L([[ox - 11, oy], [ox - 2, oy + 10], [ox + 12, oy + 12]]); }
        if (i === 3) { L([[ox + 1, oy - 17], [ox + 50, oy - 17]]); L([[ox + 1, oy + 17], [ox + 20, oy + 17], [ox + 48, oy + 2]]); }
        ctx.stroke();
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
        if (mode === 'title' || ((mode === 'gameover') && !g)) {
          ctx.fillStyle = '#0a2a0a'; ctx.fillRect(0, 0, W, H);
          for (let i = 0; i < 9; i++) { ctx.fillStyle = '#fff'; ctx.fillRect(20 + i * 35, 120, 1, 50); }
          text(ctx, 'TECMO', W / 2 + 2, 26, '#600', 4, 'center'); text(ctx, 'TECMO', W / 2, 24, '#f0c020', 4, 'center');
          text(ctx, 'BOWL', W / 2 + 2, 62, '#003', 4, 'center'); text(ctx, 'BOWL', W / 2, 60, '#fff', 4, 'center');
          // football
          ctx.fillStyle = '#8a4a1a'; ctx.beginPath(); ctx.ellipse(W / 2, 108, 16, 9, -0.3, 0, TAU); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.fillRect(W / 2 - 6, 106, 12, 1); for (let k = -4; k <= 4; k += 2) ctx.fillRect(W / 2 + k, 104, 1, 5);
          text(ctx, 'PICK YOUR PLAY. BREAK TACKLES.', W / 2, 132, '#fff', 1, 'center');
          text(ctx, 'BEAT ALL ' + LADDER.length + ' TEAMS!', W / 2, 144, '#ff0', 1, 'center');
          text(ctx, 'HI POINTS ' + hi, W / 2, 158, '#8cf', 1, 'center');
          startPrompt(ctx, 180);
          text(ctx, '\u00a9 1987 TECMO', W / 2, 206, '#aaa', 1, 'center');
          return;
        }
        if (!g) return;
        if (mode === 'kick') {
          drawField(ctx);
          const t = Math.min(1, modeT / 90), x0 = GL0 + kick.from * YD, x1 = GL0 + Math.min(kick.to, 118) * YD;
          camX = clamp(x0 + (x1 - x0) * t, W / 2, FL - W / 2);
          const bx = sx(x0 + (x1 - x0) * t), by = sy(FW / 2) - Math.round(Math.sin(Math.PI * t) * 60);
          ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(bx - 2, sy(FW / 2), 4, 2);
          ctx.fillStyle = '#8a4a1a'; ctx.fillRect(bx - 2, by - 1, 5, 3);
          hud(ctx);
          if (modeT > 92) {
            const s = kick.type === 'punt' ? 'PUNT' : (kick.good ? 'IT IS GOOD!' : 'NO GOOD!');
            panel(ctx, 90, 90, 140, 30); text(ctx, s, W / 2, 98, kick.type === 'fg' ? (kick.good ? '#ff0' : '#f44') : '#fff', 1, 'center');
            if (kick.type === 'fg') text(ctx, kick.d + ' YARDS', W / 2, 108, '#ccc', 1, 'center');
          }
          return;
        }
        drawField(ctx);
        if (players.length) drawPlayers(ctx);
        for (const q of parts) { ctx.fillStyle = q.c; ctx.fillRect(sx(q.x), sy(q.y), 2, 2); }
        hud(ctx);
        if (mode === 'demo') {
          panel(ctx, 80, 30, 160, 34);
          text(ctx, 'TECMO BOWL', W / 2, 36, '#f0c020', 2, 'center');
          startPrompt(ctx, 53);
          return;
        }
        if (mode === 'playsel') {
          ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 22, W, H - 22);
          const off = g.poss === 0;
          text(ctx, off ? 'OFFENSE - SELECT PLAY' : 'DEFENSE - GUESS THEIR PLAY', W / 2, 28, off ? '#ff0' : '#f88', 1, 'center');
          const n = g.down === 4 && off ? 6 : 4;
          for (let i = 0; i < n; i++) diagram(ctx, i, 14 + (i % 2) * 150, 40 + (i >> 1) * (n > 4 ? 58 : 76), 142, n > 4 ? 54 : 70, i === sel);
          if (msg) text(ctx, msg, W / 2, H - 12, msgCol, 1, 'center');
          return;
        }
        if (mode === 'presnap' || mode === 'live') {
          if (mode === 'presnap') text(ctx, PLAYS[g.poss === 0 ? sel : cpuSel] && g.poss === 0 ? PLAYS[sel].name : 'READY', W / 2, 26, '#fff', 1, 'center');
          if (mode === 'live' && readRight && modeT < 60 && (modeT & 8)) text(ctx, g.poss === 0 ? 'THEY READ YOUR PLAY!' : 'YOU READ THEIR PLAY!', W / 2, 26, '#f80', 1, 'center');
          if (mode === 'live' && msg && modeT > 60 && carrier && carrier.team !== g.poss) text(ctx, msg, W / 2, 26, msgCol, 1, 'center');
          if (msg === 'BROKE THE TACKLE!' && carrier && carrier.immune > 0) text(ctx, msg, W / 2, 26, '#ff0', 1, 'center');
        }
        if (mode === 'dead' && msg) {
          const big = msg === 'TOUCHDOWN!';
          text(ctx, msg, W / 2 + 1, 101, '#000', big ? 3 : 2, 'center'); text(ctx, msg, W / 2, 100, big && (api.frame & 8) ? '#fff' : msgCol, big ? 3 : 2, 'center');
        }
        if (mode === 'intro') {
          panel(ctx, 40, 60, 240, 100);
          text(ctx, 'GAME ' + (round + 1), W / 2, 70, '#ccc', 1, 'center');
          text(ctx, g.teams[0].name, W / 2, 86, '#8cf', 2, 'center');
          text(ctx, 'VS', W / 2, 106, '#fff', 1, 'center');
          text(ctx, g.teams[1].name, W / 2, 120, '#f88', 2, 'center');
          text(ctx, 'KICKOFF!', W / 2, 146, '#ff0', 1, 'center');
        }
        if (mode === 'qbreak') {
          panel(ctx, 50, 70, 220, 70);
          text(ctx, g.ot ? 'SUDDEN DEATH OVERTIME' : g.q === 3 ? 'HALFTIME' : 'END OF QUARTER ' + (g.q - 1), W / 2, 80, '#ff0', 1, 'center');
          text(ctx, g.teams[0].ab + ' ' + g.score[0] + ' - ' + g.score[1] + ' ' + g.teams[1].ab, W / 2, 100, '#fff', 2, 'center');
          if (msg) text(ctx, msg, W / 2, 124, '#ccc', 1, 'center');
        }
        if (mode === 'final' || mode === 'won' || mode === 'held') {
          const won = g.score[0] > g.score[1];
          panel(ctx, 40, 66, 240, 84, won ? '#2c4' : '#f44');
          text(ctx, 'FINAL SCORE', W / 2, 74, '#fff', 1, 'center');
          text(ctx, g.teams[0].ab + ' ' + g.score[0] + ' - ' + g.score[1] + ' ' + g.teams[1].ab, W / 2, 90, '#fff', 2, 'center');
          text(ctx, won ? 'YOU WIN!' : 'YOU LOSE', W / 2, 112, won ? '#2c4' : '#f44', 2, 'center');
          if (mode === 'won') text(ctx, 'NEXT: ' + LADDER[round % LADDER.length].name, W / 2, 134, '#ff0', 1, 'center');
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
