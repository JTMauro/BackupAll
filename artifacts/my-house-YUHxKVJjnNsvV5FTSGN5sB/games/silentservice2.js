// Silent Service II (MicroProse, 1990) -- arcade-friendly from-scratch take on the PC WWII fleet submarine sim.
// Bridge/periscope view with ship silhouettes on the horizon, a simplified torpedo data computer (range, angle on bow,
// speed), deck gun, plot/map view, escorts that hunt with sonar and depth charges, damage control and tonnage-scored patrols.
(function () {
  'use strict';
  const W = 320, H = 240;

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
    '%': [25, 26, 2, 4, 8, 11, 19], '#': [10, 31, 10, 10, 31, 10, 0]
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
  function shadow(ctx, s, x, y, col, sc, align) { text(ctx, s, x + 1, y + 1, '#000', sc, align); text(ctx, s, x, y, col, sc, align); }

  const TAU = Math.PI * 2, KT = 0.5626; // yards per second per knot
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const wrapA = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
  const brgOf = (x, y) => Math.atan2(x, y);
  const deg = a => Math.round(((a * 180 / Math.PI) % 360 + 360) % 360);
  const pad3 = n => String(n).padStart(3, '0');

  // ---------- ship types (generic WWII merchant and escort designs) ----------
  const TYPES = {
    freighter: { name: 'FREIGHTER', L: 140, B: 18, tons: [4200, 7200], spd: 8.5, hp: 1.4 },
    tanker: { name: 'TANKER', L: 165, B: 21, tons: [7500, 10400], spd: 9, hp: 2.0 },
    transport: { name: 'TRANSPORT', L: 150, B: 19, tons: [6000, 8800], spd: 9.5, hp: 1.7 },
    destroyer: { name: 'DESTROYER', L: 115, B: 11, tons: [1500, 1950], spd: 15, hp: 1.0, escort: true },
    cruiser: { name: 'HEAVY CRUISER', L: 200, B: 20, tons: [9800, 11800], spd: 18, hp: 2.6 }
  };
  // silhouettes: [kind, color index, points in (u along length -0.5 stern..0.5 bow, v height in yards)]
  const SIL = {
    freighter: [
      ['p', 0, [[-0.5, 0], [-0.5, 8], [-0.3, 7], [0.32, 7], [0.36, 9], [0.5, 10], [0.47, 0]]],
      ['p', 1, [[-0.1, 7], [-0.1, 13], [0.06, 13], [0.06, 7]]], ['p', 1, [[-0.08, 13], [-0.08, 15], [0.04, 15], [0.04, 13]]],
      ['p', 2, [[-0.04, 15], [-0.03, 20], [0.02, 20], [0.02, 15]]], ['p', 1, [[-0.5, 8], [-0.5, 10], [-0.4, 10], [-0.4, 8]]],
      ['l', 2, [[0.28, 7], [0.28, 23]]], ['l', 2, [[-0.3, 7], [-0.3, 21]]], ['l', 2, [[0.28, 19], [0.42, 9]]], ['l', 2, [[-0.3, 17], [-0.18, 8]]]],
    tanker: [
      ['p', 0, [[-0.5, 0], [-0.5, 7], [0.42, 6], [0.5, 8], [0.48, 0]]],
      ['p', 1, [[0.08, 6], [0.08, 11], [0.18, 11], [0.18, 6]]], ['p', 1, [[-0.48, 7], [-0.48, 13], [-0.3, 13], [-0.3, 7]]],
      ['p', 2, [[-0.44, 13], [-0.43, 19], [-0.37, 19], [-0.37, 13]]], ['l', 2, [[0.34, 6], [0.34, 17]]], ['l', 3, [[-0.3, 8], [0.08, 8]]]],
    transport: [
      ['p', 0, [[-0.5, 0], [-0.5, 9], [0.4, 9], [0.5, 11], [0.47, 0]]],
      ['p', 1, [[-0.25, 9], [-0.25, 15], [0.2, 15], [0.2, 9]]], ['p', 1, [[-0.15, 15], [-0.15, 18], [0.12, 18], [0.12, 15]]],
      ['p', 2, [[-0.06, 18], [-0.05, 25], [0.04, 25], [0.04, 18]]], ['l', 2, [[0.34, 9], [0.34, 24]]], ['l', 2, [[-0.36, 9], [-0.36, 22]]]],
    destroyer: [
      ['p', 0, [[-0.5, 0], [-0.5, 4], [0.1, 4], [0.14, 6], [0.5, 7], [0.46, 0]]],
      ['p', 1, [[0.14, 6], [0.14, 11], [0.26, 11], [0.26, 6]]], ['p', 2, [[-0.02, 4], [-0.01, 11], [0.05, 11], [0.05, 4]]],
      ['p', 2, [[-0.16, 4], [-0.15, 10], [-0.09, 10], [-0.09, 4]]], ['p', 1, [[0.3, 6], [0.3, 8], [0.38, 8], [0.38, 6]]],
      ['p', 1, [[-0.42, 4], [-0.42, 6], [-0.32, 6], [-0.32, 4]]], ['l', 2, [[0.2, 11], [0.2, 19]]]],
    cruiser: [
      ['p', 0, [[-0.5, 0], [-0.5, 6], [0.3, 6], [0.36, 8], [0.5, 9], [0.47, 0]]],
      ['p', 1, [[0.05, 6], [0.05, 14], [0.22, 14], [0.22, 6]]], ['p', 1, [[0.1, 14], [0.1, 20], [0.2, 20], [0.2, 14]]],
      ['p', 2, [[-0.08, 6], [-0.06, 15], [0.0, 15], [0.0, 6]]], ['p', 1, [[-0.3, 6], [-0.3, 11], [-0.15, 11], [-0.15, 6]]],
      ['p', 1, [[0.26, 6], [0.26, 9], [0.36, 9], [0.36, 6]]], ['p', 1, [[-0.42, 6], [-0.42, 9], [-0.33, 9], [-0.33, 6]]],
      ['l', 2, [[0.16, 20], [0.16, 27]]], ['l', 2, [[-0.22, 11], [-0.22, 20]]]]
  };
  const PATROLS = [
    { name: 'LONE FREIGHTER', area: 'SHIPPING LANE NORTH', night: false, m: ['freighter'], e: 0, dist: 8000, brief: ['AN UNESCORTED FREIGHTER IS', 'REPORTED IN YOUR AREA.', 'GOOD TARGET FOR A NEW SKIPPER.'] },
    { name: 'SMALL CONVOY', area: 'STRAIT APPROACHES', night: false, m: ['freighter', 'freighter'], e: 1, dist: 11000, brief: ['TWO MERCHANTS WITH A SINGLE', 'DESTROYER ESCORT. ATTACK AT', 'PERISCOPE DEPTH, THEN GO DEEP.'] },
    { name: 'NIGHT SURFACE ATTACK', area: 'ISLAND CHAIN WEST', night: true, m: ['freighter', 'transport', 'freighter'], e: 1, dist: 10000, brief: ['A CONVOY MOVES BY NIGHT.', 'ATTACK ON THE SURFACE - THEY', 'CAN BARELY SEE YOUR LOW BRIDGE.'] },
    { name: 'TANKER RUN', area: 'OIL ROUTE SOUTH', night: false, m: ['tanker', 'tanker', 'freighter'], e: 2, dist: 12000, brief: ['FUEL IS THEIR LIFEBLOOD.', 'TWO TANKERS UNDER ESCORT.', 'SINK THE TANKERS FIRST.'] },
    { name: 'TROOP CONVOY', area: 'OPEN SEA EAST', night: true, m: ['transport', 'transport', 'freighter'], e: 2, dist: 11000, brief: ['FAST TRANSPORTS CARRYING', 'TROOPS AND SUPPLIES.', 'TWO ALERT ESCORTS.'] },
    { name: 'TASK FORCE', area: 'FLEET ANCHORAGE', night: false, m: ['cruiser'], e: 2, dist: 12000, fast: true, brief: ['A HEAVY CRUISER AT 18 KNOTS', 'WITH DESTROYER SCREEN.', 'ONE CHANCE - GET AHEAD OF HER.'] },
    { name: 'LARGE CONVOY', area: 'NORTHERN SEA LANE', night: false, m: ['freighter', 'tanker', 'transport', 'freighter', 'freighter'], e: 3, dist: 13000, brief: ['A BIG CONVOY, THREE ESCORTS.', 'PICK YOUR TARGETS, FIRE SPREADS', 'AND SLIP AWAY DEEP.'] },
    { name: 'THE BIG ONE', area: 'HOME WATERS', night: true, m: ['tanker', 'tanker', 'transport', 'cruiser'], e: 3, dist: 12000, brief: ['THE MOST VALUABLE CONVOY YET,', 'HEAVILY GUARDED, AT NIGHT.', 'MAKE EVERY FISH COUNT.'] }];
  const SYS = ['ENGINES', 'BATTERY', 'PERISCOPE', 'FWD TUBES', 'AFT TUBES', 'DIVE PLANES', 'DECK GUN', 'PUMPS'];
  const DEPTHS = [0, 60, 100, 150, 200, 250, 300, 350, 400];
  const TELE = ['ALL STOP', '1/3', '2/3', 'STANDARD', 'FULL', 'FLANK'];
  const SPD_SURF = [0, 5, 9, 13, 17, 20], SPD_SUB = [0, 2, 4, 6, 8, 9];
  const RANKS = ['LIEUTENANT', 'LT COMMANDER', 'COMMANDER', 'CAPTAIN', 'COMMODORE'];

  ArcadeRegistry.register({
    id: 'silentservice2', title: 'Silent Service II', year: 1990, maker: 'MicroProse',
    width: W, height: H, vector: false, pointer: true,
    controls: 'X: view (scope/map/damage) \u00b7 Scope: Left/Right turn, Up/Down depth, Space fire, Z spread, Enter gun/zoom \u00b7 Map: arrows helm/speed, Space time \u00b7 C: crash dive \u00b7 Mouse: click',
    marquee: { bg: '#081420', fg: '#d8e8f0', accent: '#e0a030' },
    create(api) {
      let state = 'title', stateT = 0, tTitle = 0, coinFlash = 0, paused = false;
      let score = 0, lives = 3, patrolIdx = 0, round = 0, hiScore = api.getHiScore(30000);
      let sub = null, ships = [], torps = [], dcs = [], fx = [], msgs = [], shells = [];
      let view = 'scope', scopeBrg = 0, scopeHi = false, lock = null, weapon = 'torp', ts = 8, mapZoom = 0, statSel = 0;
      let gameT = 0, patrol = null, shake = 0, holdT = 0, pingT = 0, demo = null;

      function msg(s, col, t) { msgs.push({ s, col: col || '#ffe070', t: t || 3 }); if (msgs.length > 4) msgs.shift(); }
      function slow() { if (ts > 8) { ts = 8; } }
      const snd = {
        torp() { api.audio.noise(0.6, { vol: 0.18, freq: 600, slideTo: 150 }); api.audio.tone(90, 0.4, { type: 'sine', vol: 0.15 }); },
        boom(v) { api.audio.noise(1.2, { vol: v || 0.3, freq: 400, slideTo: 40 }); api.audio.tone(55, 0.8, { type: 'sine', vol: v || 0.25 }); },
        ping() { api.audio.tone(1480, 0.5, { type: 'sine', vol: 0.06 }); api.audio.tone(1480, 0.3, { type: 'sine', vol: 0.025, delay: 0.55 }); },
        gun() { api.audio.noise(0.25, { vol: 0.22, freq: 1200, slideTo: 100 }); },
        clank() { api.audio.tone(320, 0.08, { type: 'square', vol: 0.12 }); api.audio.tone(250, 0.1, { type: 'square', vol: 0.1, delay: 0.09 }); },
        klaxon() { for (let i = 0; i < 2; i++) api.audio.tone(330, 0.25, { type: 'sawtooth', vol: 0.1, delay: i * 0.35, slideTo: 260 }); }
      };

      // ---------- world setup ----------
      function mkShip(type, x, y, hdg) {
        const T = TYPES[type];
        return {
          type, T, x, y, hdg, speed: T.spd, hp: T.hp * (1 + round * 0.1), maxhp: T.hp * (1 + round * 0.1), tons: Math.round(rnd(T.tons[0], T.tons[1]) / 50) * 50,
          sink: 0, sinking: false, escort: !!T.escort, state: 'patrol', lk: null, lkT: 0, dcCd: 0, gunCd: rnd(4, 8), run: 0, fire: 0,
          off: [0, 0], skill: 0.6 + round * 0.25 + rnd(0, 0.2), id: Math.random()
        };
      }
      function setupPatrol() {
        const P = PATROLS[patrolIdx % PATROLS.length];
        patrol = { def: P, night: P.night, t0: P.night ? 22 * 3600 : 9 * 3600, tons: 0, sunk: 0, conv: null, alert: false, endT: 0, lostT: 0, escaped: 0 };
        sub = {
          x: 0, y: 0, hdg: 0, ordHdg: 0, speed: 9, tele: 3, depth: 0, ordDepth: 0, batt: 100, hull: 100, flood: 0,
          sys: SYS.map(() => 100), prio: 0, fwd: 6, aft: 4, fwdRes: 10, aftRes: 4, reloadF: 0, reloadA: 0, gunAmmo: 90, gunCd: 0, lost: false
        };
        ships = []; torps = []; dcs = []; fx = []; msgs = []; shells = [];
        gameT = 0; lock = null; view = 'scope'; weapon = 'torp'; ts = 8; scopeBrg = 0; paused = false;
        const b0 = rnd(-0.6, 0.6), d = P.dist;
        const cx = Math.sin(b0) * d, cy = Math.cos(b0) * d;
        const side = Math.random() < 0.5 ? 1 : -1;
        const course = wrapA(b0 + Math.PI + side * rnd(1.2, 1.7));
        const conv = { x: cx, y: cy, base: course, leg: 0, legT: rnd(200, 400), speed: P.fast ? 18 : 9 + round * 0.5 };
        patrol.conv = conv;
        const cols = Math.min(3, P.m.length);
        P.m.forEach((t, i) => {
          const col = i % cols - (cols - 1) / 2, row = Math.floor(i / cols);
          const s = mkShip(t, 0, 0, course);
          s.off = [col * 650, -row * 600];
          placeStation(s, conv);
          ships.push(s);
        });
        const stations = [[-1500, 900], [1500, 900], [0, 1700], [0, -1500], [-1600, -600]];
        for (let i = 0; i < P.e + (round > 0 ? 1 : 0); i++) {
          const s = mkShip('destroyer', 0, 0, course);
          s.off = stations[i % stations.length];
          placeStation(s, conv);
          ships.push(s);
        }
        msg(P.name, '#ffffff', 4);
        msg('CONVOY REPORTED BEARING ' + pad3(deg(b0)), '#80ff80', 6);
      }
      function stationPos(s, c) {
        const h = wrapA(c.base + c.leg), ch = Math.cos(h), sh = Math.sin(h);
        // offset [lateral, longitudinal] in convoy frame
        return [c.x + s.off[0] * ch + s.off[1] * sh, c.y - s.off[0] * sh + s.off[1] * ch];
      }
      function placeStation(s, c) { const p = stationPos(s, c); s.x = p[0]; s.y = p[1]; }
      function maxSpeed() {
        const surf = sub.depth < 5;
        const tbl = surf ? SPD_SURF : SPD_SUB;
        let v = tbl[sub.tele] * (0.3 + 0.7 * sub.sys[0] / 100);
        if (!surf && sub.batt <= 0) v = Math.min(v, 1);
        return v;
      }

      // ---------- sensing ----------
      function visRange() {
        const base = patrol.night ? 4200 : 14000;
        if (sub.depth < 5) return base;
        if (sub.depth <= 65 && sub.sys[2] >= 30) return base * (patrol.night ? 0.7 : 0.8);
        return 0;
      }
      function visible(s) { const d = Math.hypot(s.x - sub.x, s.y - sub.y); return d < visRange() + (s.fire > 0 ? 6000 : 0); }
      function sonarContacts() { return ships.filter(s => !s.sinking && Math.hypot(s.x - sub.x, s.y - sub.y) < 10000); }
      function aobOf(s) { return wrapA(brgOf(sub.x - s.x, sub.y - s.y) - s.hdg); }

      // ---------- TDC ----------
      function scopeFov() { return scopeHi ? 0.1 : sub.depth < 5 ? 0.45 : 0.35; }
      function lockTarget() {
        let best = null, bd = scopeHi ? 0.035 : 0.08;
        for (const s of ships) {
          if (s.sinking || !visible(s)) continue;
          const d = Math.abs(wrapA(brgOf(s.x - sub.x, s.y - sub.y) - scopeBrg));
          if (d < bd) { bd = d; best = s; }
        }
        if (best && (!lock || lock.s !== best)) lock = { s: best, obs: 0, ox: rnd(-1, 1), oa: rnd(-1, 1), os: rnd(-1, 1) };
        if (!best && lock && (lock.s.sinking || !visible(lock.s) || Math.abs(wrapA(brgOf(lock.s.x - sub.x, lock.s.y - sub.y) - scopeBrg)) > 0.25)) lock = null;
      }
      function solution() {
        if (!lock) return null;
        const s = lock.s, ef = Math.max(0.04, 1 - lock.obs / 50);
        const R = Math.hypot(s.x - sub.x, s.y - sub.y), brg = brgOf(s.x - sub.x, s.y - sub.y), aob = aobOf(s);
        return {
          ef, q: Math.round((1 - ef) * 100), brg, R,
          rE: Math.max(200, R * (1 + 0.32 * ef * lock.ox)), aE: wrapA(aob + 0.7 * ef * lock.oa), sE: Math.max(0, s.speed + 5 * ef * lock.os)
        };
      }
      function gyroFor(sol) {
        const px = Math.sin(sol.brg) * sol.rE, py = Math.cos(sol.brg) * sol.rE;
        const hE = wrapA(sol.brg + Math.PI - sol.aE);
        const vx = Math.sin(hE) * sol.sE * KT, vy = Math.cos(hE) * sol.sE * KT, vt = 46 * KT;
        const a = vx * vx + vy * vy - vt * vt, b = 2 * (px * vx + py * vy), c = px * px + py * py;
        const disc = b * b - 4 * a * c;
        if (disc < 0) return null;
        const t = (-b - Math.sqrt(disc)) / (2 * a);
        if (t <= 0) return null;
        return { hdg: brgOf(px + vx * t, py + vy * t), run: vt * t };
      }
      function fire(n) {
        if (sub.depth > 65) { msg('TOO DEEP TO FIRE - COME TO 60 FT', '#ffa040'); return; }
        if (weapon === 'gun') { fireGun(); return; }
        const sol = solution();
        if (!sol) { msg('NO TARGET LOCKED', '#ffa040', 1.5); return; }
        const g = gyroFor(sol);
        if (!g) { msg('NO FIRING SOLUTION', '#ffa040'); return; }
        if (g.run > 4600) { msg('OUT OF TORPEDO RANGE', '#ffa040'); return; }
        const fwd = Math.abs(wrapA(g.hdg - sub.hdg)) <= Math.PI / 2;
        let fired = 0;
        for (let i = 0; i < n; i++) {
          if (fwd ? (sub.fwd <= 0 || sub.sys[3] < 50) : (sub.aft <= 0 || sub.sys[4] < 50)) break;
          if (fwd) sub.fwd--; else sub.aft--;
          const off = n > 1 ? (i - (n - 1) / 2) * 0.035 : 0;
          const h = g.hdg + off + rnd(-0.008, 0.008);
          torps.push({ x: sub.x + Math.sin(sub.hdg) * (fwd ? 60 : -60), y: sub.y + Math.cos(sub.hdg) * (fwd ? 60 : -60), hdg: h, run: 0, dud: Math.random() < 0.1, trail: [] });
          fired++;
          snd.torp();
        }
        if (!fired) { msg((fwd ? 'FORWARD' : 'AFT') + ' TUBES NOT READY', '#ffa040'); return; }
        msg(fired > 1 ? 'SPREAD OF ' + fired + ' AWAY!' : 'TORPEDO AWAY! ' + (fwd ? 'FWD' : 'AFT'), '#ffffff', 2);
        msg('RUN ' + Math.round(g.run) + ' YDS - ' + Math.round(g.run / (46 * KT)) + ' SEC', '#c0d0e0', 3);
      }
      function fireGun() {
        if (sub.depth >= 5) { msg('GUN CREW CANNOT MAN THE GUN SUBMERGED', '#ffa040'); weapon = 'torp'; return; }
        if (sub.sys[6] < 50) { msg('DECK GUN DAMAGED', '#ffa040'); return; }
        if (sub.gunAmmo <= 0) { msg('OUT OF SHELLS', '#ffa040'); return; }
        if (sub.gunCd > 0) return;
        if (!lock) { msg('NO TARGET', '#ffa040', 1); return; }
        const s = lock.s, R = Math.hypot(s.x - sub.x, s.y - sub.y);
        if (R > 6000) { msg('OUT OF GUN RANGE', '#ffa040', 1.5); return; }
        sub.gunAmmo--; sub.gunCd = 3; snd.gun();
        const hit = Math.random() < (0.85 - R / 8000) * (s.speed < 2 ? 1.3 : 1);
        shells.push({ s, t: 1 + R / 800, hit, du: rnd(-0.4, 0.4) });
      }

      // ---------- simulation ----------
      function damageShip(s, dmg, why) {
        if (s.sinking) return;
        s.hp -= dmg; s.fire = Math.max(s.fire, 200);
        if (!s.escort) s.speed = Math.max(2, s.speed * 0.6);
        alertConvoy(why === 'gun' ? 0 : 1);
        if (s.hp <= 0) {
          s.sinking = true; s.speed = 0; s.tilt = (Math.random() < 0.5 ? -1 : 1) * rnd(0.05, 0.25);
          patrol.tons += s.tons; patrol.sunk++; score += s.tons;
          if (score > hiScore) hiScore = score;
          msg(s.T.name + ' SINKING! ' + s.tons + ' TONS', '#80ff80', 5);
          api.audio.melody([[392, 0.12], [523, 0.12], [659, 0.25]], { type: 'square', vol: 0.1, delay: 0.6 });
          if (lock && lock.s === s) lock = null;
        }
      }
      function alertConvoy(lvl) {
        if (!patrol.alert) {
          patrol.alert = true;
          const c = patrol.conv, away = brgOf(c.x - sub.x, c.y - sub.y);
          c.base = wrapA(away + rnd(-0.4, 0.4)); c.speed += 2; c.legT = 400;
        }
        for (const e of ships) if (e.escort && !e.sinking && e.state === 'patrol' && lvl) {
          const r = Math.hypot(e.x - sub.x, e.y - sub.y);
          if (r < 9000) { e.state = 'hunt'; e.lk = [sub.x + rnd(-700, 700), sub.y + rnd(-700, 700)]; e.lkT = 0; e.lkD = clamp(sub.depth + rnd(-80, 80), 40, 400); }
        }
      }
      function steerShip(s, tx, ty, spd, dt) {
        const want = brgOf(tx - s.x, ty - s.y), d = wrapA(want - s.hdg), rate = s.escort ? 0.05 : 0.025;
        s.hdg = wrapA(s.hdg + clamp(d, -rate * dt, rate * dt));
        s.speed += clamp(spd - s.speed, -1 * dt, 0.5 * dt);
      }
      function detectChance(e, r) {
        let p = 0;
        if (sub.depth < 5) { const vr = patrol.night ? 2400 : 8000; if (r < vr) p += 0.025 + 0.25 * (1 - r / vr); }
        else if (sub.depth <= 65 && view === 'scope') { const vr = patrol.night ? 900 : 2800; if (r < vr) p += 0.02 + (sub.speed > 5 ? 0.04 : 0); }
        const sr = 3800;
        if (r < sr && sub.depth >= 5) p += (1 - r / sr) * (0.006 + sub.speed * sub.speed * 0.0013) * (sub.depth > 250 ? 0.35 : 1) * (e.state === 'patrol' ? 0.5 : 1.3) * e.skill;
        return p;
      }
      function updateShips(dt) {
        const c = patrol.conv;
        c.legT -= dt;
        if (c.legT <= 0) { c.legT = rnd(250, 450); c.leg = [-0.5, 0, 0.5][Math.floor(Math.random() * 3)]; }
        const ch = wrapA(c.base + c.leg);
        c.x += Math.sin(ch) * c.speed * KT * dt; c.y += Math.cos(ch) * c.speed * KT * dt;
        let hunting = false;
        for (const s of ships) {
          if (s.sinking) {
            s.sink += dt / (s.type === 'destroyer' ? 60 : 110);
            if (s.fire > 0) s.fire -= dt;
            continue;
          }
          if (s.fire > 0) s.fire -= dt * 0.5;
          const r = Math.hypot(s.x - sub.x, s.y - sub.y);
          if (!s.escort) {
            const p = stationPos(s, c);
            const ax = p[0] + Math.sin(ch) * 800, ay = p[1] + Math.cos(ch) * 800;
            const behind = (p[0] - s.x) * Math.sin(ch) + (p[1] - s.y) * Math.cos(ch);
            const spdMax = s.hp < s.maxhp ? Math.min(c.speed, 5) : c.speed + 2;
            steerShip(s, ax, ay, clamp(c.speed + behind * 0.01, 0, spdMax), dt);
          } else {
            s.dcCd -= dt; s.gunCd -= dt;
            const p = detectChance(s, r);
            if (s.cool > 0) s.cool -= dt;
            if (!(s.cool > 0) && Math.random() < p * dt) {
              if (s.state === 'patrol') { msg('ESCORT HAS DETECTED US!', '#ff6040', 3); slow(); }
              s.state = 'hunt'; s.lkT = 0;
              const err = 60 + r * 0.06;
              s.lk = [sub.x + rnd(-err, err), sub.y + rnd(-err, err)]; s.lkD = sub.depth;
            }
            if (s.state === 'patrol') {
              const p2 = stationPos(s, c);
              const wv = Math.sin(gameT / 90 + s.id * 10) * 500;
              steerShip(s, p2[0] + Math.sin(ch) * 900 + Math.cos(ch) * wv, p2[1] + Math.cos(ch) * 900 - Math.sin(ch) * wv, c.speed + 3, dt);
            } else {
              hunting = true;
              s.lkT += dt;
              const dl = Math.hypot(s.lk[0] - s.x, s.lk[1] - s.y);
              if (s.run > 0) {
                s.run -= dt;
                steerShip(s, s.x + Math.sin(s.hdg) * 1000, s.y + Math.cos(s.hdg) * 1000, 26, dt);
              } else {
                steerShip(s, s.lk[0], s.lk[1], dl < 1200 ? 14 : 28, dt);
                if (dl < 120 && s.dcCd <= 0) dropPattern(s);
              }
              s.huntT = (s.huntT || 0) + dt;
              if (s.lkT > 300 || s.huntT > 1100 + 400 * round || Math.hypot(s.x - c.x, s.y - c.y) > 9000) { s.state = 'patrol'; s.lk = null; s.huntT = 0; s.cool = 200; msg('ESCORT BREAKS OFF THE HUNT', '#80ff80'); }
              if (sub.depth < 5 && r < (patrol.night ? 3000 : 7000) && s.gunCd <= 0) {
                s.gunCd = rnd(5, 9);
                const hit = Math.random() < 0.12 + (1 - r / 7000) * 0.3;
                fx.push({ k: 'splash', x: sub.x + rnd(-60, 60), y: sub.y + rnd(-60, 60), t: 3 });
                api.audio.noise(0.3, { vol: 0.15, freq: 900, slideTo: 100 });
                if (hit) damageSub(rnd(5, 9), 'SHELL HIT!');
              }
            }
          }
          s.x += Math.sin(s.hdg) * s.speed * KT * dt; s.y += Math.cos(s.hdg) * s.speed * KT * dt;
        }
        if (hunting && (pingT -= dt) <= 0) { pingT = 9; const near = ships.some(e => e.escort && e.state === 'hunt' && Math.hypot(e.x - sub.x, e.y - sub.y) < 5000); if (near && sub.depth >= 5) snd.ping(); }
        ships = ships.filter(s => s.sink < 1);
      }
      function dropPattern(e) {
        e.dcCd = 50; e.run = 40;
        const setD = clamp((e.lkD == null ? sub.depth : e.lkD) + rnd(-90, 90) / e.skill, 40, 420);
        const ch = Math.cos(e.hdg), sh = Math.sin(e.hdg);
        const n = 4 + Math.round(e.skill * 2);
        for (let i = 0; i < n; i++) {
          const lat = (i % 3 - 1) * 70, lon = (Math.floor(i / 3) - 0.5) * 80 + rnd(-20, 20);
          dcs.push({ x: e.x + lat * ch + lon * sh, y: e.y - lat * sh + lon * ch, d: 0, set: setD + rnd(-25, 25), delay: i * 1.2 });
        }
        if (sub.depth >= 5) msg('DEPTH CHARGES!', '#ff6040', 2);
        slow();
      }
      function damageSub(dmg, why) {
        sub.hull = Math.max(0, sub.hull - dmg * 0.7);
        for (let k = 0; k < 2; k++) { const i = Math.floor(Math.random() * SYS.length); sub.sys[i] = Math.max(0, sub.sys[i] - dmg * rnd(1, 3)); }
        if (sub.hull < 85) sub.flood = Math.min(100, sub.flood + dmg * 0.35);
        shake = Math.min(1.5, shake + dmg / 15);
        if (why) msg(why, '#ff6040', 2.5);
        if (dmg > 6) msg('DAMAGE REPORT: HULL ' + Math.round(sub.hull) + '%', '#ff9060', 3);
      }
      function updateDCs(dt) {
        for (const d of dcs) {
          if (d.delay > 0) { d.delay -= dt; continue; }
          d.d += 9 * dt;
          if (d.d >= d.set) {
            d.dead = true;
            const hr = Math.hypot(d.x - sub.x, d.y - sub.y), vr = Math.abs(d.set - sub.depth) / 3;
            const r = Math.hypot(hr, vr);
            fx.push({ k: 'dc', x: d.x, y: d.y, t: 4 });
            const v = clamp(0.4 - r / 2000, 0.06, 0.4);
            snd.boom(v);
            if (sub.depth >= 5 || r < 150) {
              if (r < 45) damageSub(rnd(18, 30), 'DIRECT HIT! HEAVY DAMAGE!');
              else if (r < 90) damageSub(rnd(8, 15), 'CLOSE ONE! WE ARE TAKING WATER!');
              else if (r < 160) damageSub(rnd(2, 5), null);
              else shake = Math.min(1, shake + 0.2);
            }
          }
        }
        dcs = dcs.filter(d => !d.dead);
      }
      function updateTorps(dt) {
        for (const t of torps) {
          const step = 46 * KT * dt, nx = t.x + Math.sin(t.hdg) * step, ny = t.y + Math.cos(t.hdg) * step;
          t.run += step;
          if ((t.trail.length === 0 || t.run - t.trail[t.trail.length - 1][2] > 120)) t.trail.push([t.x, t.y, t.run]);
          if (t.trail.length > 30) t.trail.shift();
          for (const s of ships) {
            if (s.sinking) continue;
            // closest approach of the torpedo step to the ship's keel line
            const hx = Math.sin(s.hdg), hy = Math.cos(s.hdg);
            let hit = false;
            for (let k = 0; k <= 4 && !hit; k++) {
              const px = t.x + (nx - t.x) * k / 4 - s.x, py = t.y + (ny - t.y) * k / 4 - s.y;
              const along = px * hx + py * hy, across = px * hy - py * hx;
              if (Math.abs(along) < s.T.L / 2 && Math.abs(across) < s.T.B / 2 + 3) hit = true;
            }
            if (hit) {
              t.dead = true;
              if (t.dud) { msg('DUD! TORPEDO FAILED TO EXPLODE', '#ffa040', 3); snd.clank(); alertConvoy(1); }
              else {
                fx.push({ k: 'boom', x: t.x, y: t.y, t: 3, s });
                snd.boom(0.35); slow();
                msg('HIT! ' + s.T.name, '#80ff80', 3);
                damageShip(s, rnd(0.8, 1.35), 'torp');
              }
              break;
            }
          }
          t.x = nx; t.y = ny;
          if (t.run > 4600) { t.dead = true; }
        }
        torps = torps.filter(t => !t.dead);
      }
      function updateShells(dt) {
        for (const sh of shells) {
          sh.t -= dt;
          if (sh.t <= 0) {
            sh.dead = true;
            if (sh.s.sinking) continue;
            if (sh.hit) { fx.push({ k: 'boom', x: sh.s.x, y: sh.s.y, t: 1.5, s: sh.s, small: true }); damageShip(sh.s, sh.s.escort ? 0.13 : 0.09, 'gun'); api.audio.noise(0.3, { vol: 0.12, freq: 700 }); }
            else fx.push({ k: 'splash', x: sh.s.x + rnd(-80, 80), y: sh.s.y + rnd(-80, 80), t: 2.5 });
          }
        }
        shells = shells.filter(s => !s.dead);
      }
      function updateSub(dt, rdt) {
        // helm: ordered course and actual turn
        const turn = 0.05 * clamp(sub.speed / 6, 0.25, 1);
        sub.hdg = wrapA(sub.hdg + clamp(wrapA(sub.ordHdg - sub.hdg), -turn * dt, turn * dt));
        const vmax = maxSpeed();
        sub.speed += clamp(vmax - sub.speed, -0.4 * dt, 0.25 * dt);
        sub.x += Math.sin(sub.hdg) * sub.speed * KT * dt; sub.y += Math.cos(sub.hdg) * sub.speed * KT * dt;
        // depth
        const rate = 2.6 * (0.3 + 0.7 * sub.sys[5] / 100) * (sub.crash ? 1.8 : 1);
        let target = sub.ordDepth;
        if (sub.flood > 60) target = Math.max(target, sub.depth + (sub.flood - 60) * 0.3);
        if (sub.flood > 85 && target < sub.depth) target = sub.depth;
        sub.depth += clamp(target - sub.depth, -rate * dt, rate * dt);
        if (sub.depth < 0.5 && sub.ordDepth === 0) sub.depth = 0;
        if (sub.crash && sub.depth > sub.ordDepth - 5) sub.crash = false;
        // battery
        if (sub.depth >= 5) sub.batt = Math.max(0, sub.batt - (0.0015 + sub.speed * sub.speed * 0.00045) * (1.4 - 0.4 * sub.sys[1] / 100) * dt);
        else sub.batt = Math.min(100, sub.batt + 0.035 * dt);
        // reloads
        if (sub.fwd < 6 && sub.fwdRes > 0 && sub.sys[3] >= 50) { sub.reloadF += dt; if (sub.reloadF > 80) { sub.reloadF = 0; sub.fwd++; sub.fwdRes--; } }
        if (sub.aft < 4 && sub.aftRes > 0 && sub.sys[4] >= 50) { sub.reloadA += dt; if (sub.reloadA > 80) { sub.reloadA = 0; sub.aft++; sub.aftRes--; } }
        sub.gunCd -= dt;
        // damage control
        for (let i = 0; i < SYS.length; i++) if (sub.sys[i] < 100) sub.sys[i] = Math.min(100, sub.sys[i] + dt * 0.06 * (sub.prio === i ? 4 : 1));
        if (sub.hull < 100) sub.hull = Math.min(sub.hull < 80 ? 80 : 100, sub.hull + dt * (sub.prio === -1 ? 0.03 : 0.008));
        const leak = (100 - sub.hull) * 0.0008 * (0.5 + sub.depth / 300);
        sub.flood = clamp(sub.flood + (leak - (0.02 + 0.07 * sub.sys[7] / 100) * (sub.depth < 5 ? 2.5 : 1)) * dt, 0, 100);
        const crush = 430 * (0.65 + 0.35 * sub.hull / 100);
        if (sub.depth > crush - 40 && Math.random() < rdt * 0.6) { api.audio.tone(70, 0.6, { type: 'sawtooth', vol: 0.06, slideTo: 50 }); msg('HULL IS GROANING!', '#ff9060', 1.5); }
        if (sub.depth > crush) sub.hull -= dt * 1.5;
        if (sub.flood >= 100 || sub.hull <= 0) loseSub();
      }
      function loseSub() {
        if (sub.lost) return;
        sub.lost = true; state = 'sunk'; stateT = 0;
        snd.klaxon(); snd.boom(0.3);
      }
      function endPatrol(reason) {
        state = 'report'; stateT = 0; patrol.reason = reason;
        patrol.bonus = ships.every(s => s.escort || s.sinking) ? 1000 + round * 500 : 0;
        score += patrol.bonus;
        if (score > hiScore) hiScore = score;
        api.setHiScore(score);
        api.audio.melody([[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.3]], { type: 'square', vol: 0.1 });
      }
      function checkEnd(rdt) {
        const merch = ships.filter(s => !s.escort && !s.sinking);
        if (merch.length === 0) {
          patrol.endT += rdt;
          if (patrol.endT === rdt) msg('ALL TARGETS SUNK! PATROL COMPLETE', '#80ff80', 6);
          if (patrol.endT > 6) endPatrol('ALL TARGETS SUNK');
          return;
        }
        const far = merch.every(s => Math.hypot(s.x - sub.x, s.y - sub.y) > 16000);
        if (far) { msg('THE CONVOY HAS ESCAPED', '#ffa040', 4); endPatrol('CONVOY ESCAPED'); return; }
        if (gameT > 2.5 * 3600) { msg('PATROL TIME EXPIRED', '#ffa040', 4); endPatrol('TIME EXPIRED'); }
      }

      // ---------- input ----------
      function nextView() { view = view === 'scope' ? 'map' : view === 'map' ? 'status' : 'scope'; api.audio.tone(900, 0.03, { vol: 0.08 }); }
      function setDepthIdx(dir) {
        let i = DEPTHS.findIndex(d => d >= sub.ordDepth - 1);
        if (i < 0) i = DEPTHS.length - 1;
        if (DEPTHS[i] !== sub.ordDepth && dir > 0) i--;
        i = clamp(i + dir, 0, DEPTHS.length - 1);
        if (sub.flood > 85 && DEPTHS[i] < sub.depth) { msg('TOO MUCH WATER - CANNOT BLOW BALLAST', '#ff6040'); return; }
        sub.ordDepth = DEPTHS[i]; sub.crash = false;
        if (sub.depth < 5 && sub.ordDepth > 0) { msg('DIVE! DIVE!', '#ffffff', 1.5); snd.klaxon(); if (weapon === 'gun') weapon = 'torp'; }
        else msg('MAKE DEPTH ' + sub.ordDepth + ' FT', '#c0d0e0', 1.5);
        if (sub.ordDepth === 0) msg('SURFACE! SURFACE!', '#ffffff', 1.5);
      }
      function handleInput(rdt) {
        if (api.pressed('KeyX') || api.pressed('Tab')) nextView();
        if (api.pressed('Digit1')) view = 'scope';
        if (api.pressed('Digit2')) view = 'map';
        if (api.pressed('Digit3')) view = 'status';
        if (api.pressed('KeyP')) paused = !paused;
        if (paused) return;
        if (api.pressed('KeyT')) { ts = ts === 8 ? 32 : 8; msg(ts > 8 ? 'TIME COMPRESSION X4' : 'NORMAL TIME', '#c0d0e0', 1); }
        if (api.pressed('KeyC')) { sub.ordDepth = 300; sub.crash = true; sub.tele = 5; msg('CRASH DIVE!', '#ff6040'); snd.klaxon(); weapon = 'torp'; }
        if (api.pressed('KeyW')) sub.tele = Math.min(5, sub.tele + 1);
        if (api.pressed('KeyS')) sub.tele = Math.max(0, sub.tele - 1);
        if (api.key('KeyA')) sub.ordHdg = wrapA(sub.ordHdg - 0.9 * rdt);
        if (api.key('KeyD')) sub.ordHdg = wrapA(sub.ordHdg + 0.9 * rdt);
        if (api.pressed('KeyQ')) mapZoom = (mapZoom + 1) % 4;
        if (api.pressed('KeyV')) scopeHi = !scopeHi;
        const m = api.mouse;
        if (view === 'scope') {
          const l = api.key('ArrowLeft'), r = api.key('ArrowRight');
          if (l || r) { holdT += rdt; scopeBrg = wrapA(scopeBrg + (r ? 1 : -1) * (scopeHi ? 0.12 : 0.45) * (holdT > 0.6 ? 2.5 : 1) * rdt); if (lock) lock = null; }
          else holdT = 0;
          if (api.pressed('ArrowUp')) setDepthIdx(-1);
          if (api.pressed('ArrowDown')) setDepthIdx(1);
          if (api.pressed('Space')) fire(1);
          if (api.pressed('KeyZ')) fire(3);
          if (api.pressed('Enter')) {
            if (sub.depth < 5) { weapon = weapon === 'torp' ? 'gun' : 'torp'; msg(weapon === 'gun' ? 'DECK GUN MANNED' : 'TORPEDOES SELECTED', '#c0d0e0', 1.5); }
            else { scopeHi = !scopeHi; msg(scopeHi ? 'HIGH POWER' : 'LOW POWER', '#c0d0e0', 1); }
          }
          if (m.clicked) {
            if (m.y > 200) nextView();
            else { const fov = scopeFov(); scopeBrg = wrapA(scopeBrg + (m.x - 160) / W * fov); lock = null; }
          }
        } else if (view === 'map') {
          if (api.key('ArrowLeft')) sub.ordHdg = wrapA(sub.ordHdg - 0.9 * rdt);
          if (api.key('ArrowRight')) sub.ordHdg = wrapA(sub.ordHdg + 0.9 * rdt);
          if (api.pressed('ArrowUp')) sub.tele = Math.min(5, sub.tele + 1);
          if (api.pressed('ArrowDown')) sub.tele = Math.max(0, sub.tele - 1);
          if (api.pressed('Space')) { ts = ts === 8 ? 32 : 8; msg(ts > 8 ? 'TIME COMPRESSION X4' : 'NORMAL TIME', '#c0d0e0', 1); }
          if (api.pressed('Enter')) mapZoom = (mapZoom + 1) % 4;
          if (m.clicked) {
            if (m.y > 200) nextView();
            else { const sc = mapScale(); sub.ordHdg = brgOf((m.x - 160) / sc, -(m.y - 100) / sc); msg('COME TO COURSE ' + pad3(deg(sub.ordHdg)), '#c0d0e0', 1.5); }
          }
        } else {
          const n = SYS.length + 2;
          if (api.pressed('ArrowUp')) statSel = (statSel + n - 1) % n;
          if (api.pressed('ArrowDown')) statSel = (statSel + 1) % n;
          if (m.clicked) { if (m.y > 200) nextView(); else if (m.y >= 60 && m.y < 60 + n * 13) statSel = Math.floor((m.y - 60) / 13); }
          if (api.pressed('Space') || api.pressed('Enter') || (m.clicked && m.y < 200)) {
            if (statSel === 0) { sub.prio = -1; msg('PRIORITY: HULL REPAIR', '#80ff80', 1.5); }
            else if (statSel <= SYS.length) { sub.prio = statSel - 1; msg('PRIORITY: ' + SYS[statSel - 1], '#80ff80', 1.5); }
            else {
              const hunted = ships.some(e => e.escort && !e.sinking && e.state === 'hunt');
              if (hunted) msg('CANNOT BREAK OFF - WE ARE BEING HUNTED', '#ffa040');
              else endPatrol('BROKE OFF ENGAGEMENT');
            }
          }
          if (api.pressed('ArrowLeft') || api.pressed('ArrowRight')) nextView();
        }
      }

      // ---------- main update ----------
      function tryStart() {
        if (api.useCredit()) {
          score = 0; lives = 3; patrolIdx = 0; round = 0;
          state = 'brief'; stateT = 0;
          api.audio.melody([[262, 0.1], [330, 0.1], [392, 0.1], [523, 0.25]], { type: 'square', vol: 0.1 });
        } else { coinFlash = 90; api.audio.tone(80, 0.25, { vol: 0.2 }); }
      }
      function setupDemo() {
        patrol = { night: false, conv: { x: 0, y: 7000, base: Math.PI / 2, leg: 0, legT: 9e9, speed: 9 } };
        sub = { x: 0, y: 0, hdg: 0, depth: 60, sys: SYS.map(() => 100), speed: 2 };
        ships = ['freighter', 'tanker', 'transport', 'destroyer', 'freighter'].map((t, i) => {
          const s = mkShip(t, -4000 + i * 1500, 5200 + (i % 2) * 900, Math.PI / 2);
          return s;
        });
        demo = { t: 0 };
      }
      function update(dt) {
        if (coinFlash > 0) coinFlash--;
        for (const m of msgs) m.t -= dt;
        msgs = msgs.filter(m => m.t > 0);
        stateT += dt;
        if (shake > 0) shake = Math.max(0, shake - dt);
        if (state === 'title') {
          tTitle += dt;
          if (!demo) setupDemo();
          for (const s of ships) { s.x += Math.sin(s.hdg) * s.speed * KT * dt * 8; if (s.x > 6000) s.x -= 12000; }
          scopeBrg = Math.sin(tTitle * 0.1) * 0.25;
          if (api.anyPressed('Enter', 'Space')) tryStart();
          return;
        }
        if (state === 'brief') {
          if (stateT > 0.5 && api.anyPressed('Enter', 'Space', 'KeyX')) { setupPatrol(); state = 'patrol'; stateT = 0; }
          return;
        }
        if (state === 'report') {
          if (stateT > 1.2 && api.anyPressed('Enter', 'Space', 'KeyX')) { patrolIdx++; if (patrolIdx % PATROLS.length === 0) round++; state = 'brief'; stateT = 0; }
          return;
        }
        if (state === 'sunk') {
          if (stateT > 4) {
            lives--;
            if (lives > 0) { state = 'brief'; stateT = 0; }
            else if (api.offerContinue) { state = 'cont'; api.offerContinue(() => { lives = 3; state = 'brief'; stateT = 0; }, gameOver); }
            else gameOver();
          }
          return;
        }
        if (state === 'over') { if (stateT > 7 || (stateT > 2 && api.anyPressed('Enter', 'Space'))) { state = 'title'; demo = null; } return; }
        if (state !== 'patrol') return;
        handleInput(dt);
        if (paused || state !== 'patrol') return;
        const gdt = dt * ts;
        gameT += gdt;
        updateSub(gdt, dt);
        if (state !== 'patrol') return;
        updateShips(gdt); updateTorps(gdt); updateDCs(gdt); updateShells(gdt);
        if (state !== 'patrol') return;
        for (const f of fx) f.t -= gdt / 8;
        fx = fx.filter(f => f.t > 0);
        if (view === 'scope' && sub.depth <= 65) {
          if (lock && !lock.s.sinking && visible(lock.s)) {
            lock.obs += gdt * (sub.depth < 5 && patrol.night ? 1.2 : 1);
            scopeBrg = wrapA(scopeBrg + clamp(wrapA(brgOf(lock.s.x - sub.x, lock.s.y - sub.y) - scopeBrg), -0.3 * dt, 0.3 * dt));
          }
          lockTarget();
        } else if (lock && (lock.s.sinking || !visible(lock.s))) lock = null;
        if (ts > 8 && ships.some(s => s.escort && !s.sinking && s.state === 'hunt' && Math.hypot(s.x - sub.x, s.y - sub.y) < 3000)) slow();
        checkEnd(dt);
        if (api.frame % 50 === 0) api.audio.tone(sub.depth < 5 ? 55 : 40, 0.7, { type: 'triangle', vol: 0.03 + sub.speed * 0.003 });
      }
      function gameOver() {
        state = 'over'; stateT = 0;
        if (score > hiScore) hiScore = score;
        api.setHiScore(score);
      }

      // ---------- rendering: periscope / bridge ----------
      function drawSil(ctx, s, x0, y0, ppy, dirSign, lenPx, night, fog) {
        const parts = SIL[s.type];
        const cols = night ? ['#020304', '#06080a', '#000000', '#020304'] : ['#4c5258', '#6a7076', '#33373c', '#4c5258'];
        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, W, y0 + 0.5); ctx.clip();
        ctx.translate(x0, y0 + s.sink * 22 * ppy);
        if (s.sinking) ctx.rotate(s.tilt * dirSign * s.sink * 3);
        const X = u => u * lenPx * dirSign, Y = v => -v * ppy;
        ctx.globalAlpha = 1 - fog;
        for (const [k, ci, pts] of parts) {
          if (k === 'p') {
            ctx.fillStyle = cols[ci]; ctx.beginPath(); ctx.moveTo(X(pts[0][0]), Y(pts[0][1]));
            for (let i = 1; i < pts.length; i++) ctx.lineTo(X(pts[i][0]), Y(pts[i][1]));
            ctx.closePath(); ctx.fill();
          } else {
            ctx.strokeStyle = cols[ci]; ctx.lineWidth = Math.max(1, ppy * 0.6); ctx.beginPath();
            ctx.moveTo(X(pts[0][0]), Y(pts[0][1])); ctx.lineTo(X(pts[1][0]), Y(pts[1][1])); ctx.stroke();
          }
        }
        // fire and smoke
        if (s.fire > 0) {
          for (let i = 0; i < 6; i++) {
            const u = ((i * 37 + Math.floor(api.time * 12)) % 7) / 7 * 0.5 - 0.25, h = rnd(4, 12);
            ctx.fillStyle = i & 1 ? '#ff9020' : '#ffd040';
            ctx.fillRect(X(u) - ppy, Y(8 + h * 0.5), Math.max(1, ppy * 2.5), Math.max(1, h * ppy * 0.6));
          }
          ctx.fillStyle = night ? 'rgba(50,40,30,0.5)' : 'rgba(40,40,40,0.5)';
          for (let i = 0; i < 6; i++) { const r = (4 + i * 3) * ppy; ctx.beginPath(); ctx.arc(X(0.05) + i * 4 * ppy, Y(18 + i * 10), r, 0, TAU); ctx.fill(); }
        }
        ctx.restore();
      }
      function drawScopeWorld(ctx, opts) {
        const night = patrol.night, surf = sub.depth < 5;
        const fov = opts.fov, cx = 160, ppr = W / fov;
        const bob = surf ? Math.sin(api.time * 1.3) * 1.5 : Math.sin(api.time * 2.1) * 3 + Math.sin(api.time * 3.7) * 1.5;
        const hy = 108 + bob + (shake > 0 ? rnd(-3, 3) * shake : 0);
        const eye = surf ? 9 : 2;
        // sky & sea
        const sky = night ? ['#070c1c', '#16223e', '#2e4062'] : ['#5a88c0', '#86aed6', '#bcd2e4'];
        ctx.fillStyle = sky[0]; ctx.fillRect(0, 0, W, hy);
        ctx.fillStyle = sky[1]; ctx.fillRect(0, hy - 40, W, 40);
        ctx.fillStyle = sky[2]; ctx.fillRect(0, hy - 12, W, 12);
        if (night) {
          for (let i = 0; i < 40; i++) {
            const a = i * 0.7853 + i * i * 0.01, x = cx + wrapA(a - scopeBrg) * ppr * 0.2, y = (i * 53) % Math.max(1, hy - 20);
            if (x > 0 && x < W) { ctx.fillStyle = '#8890a8'; ctx.fillRect(x, y, 1, 1); }
          }
          const mx = cx + wrapA(2.2 - scopeBrg) * ppr;
          if (mx > -20 && mx < W + 20) { ctx.fillStyle = '#d8d8c0'; ctx.beginPath(); ctx.arc(mx, hy - 60, 8, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(200,200,170,0.15)'; ctx.fillRect(mx - 12, hy, 24, 120); }
        } else {
          for (let i = 0; i < 8; i++) {
            const a = i * 0.785 + 0.3, x = cx + wrapA(a - scopeBrg) * ppr;
            if (x < -60 || x > W + 60) continue;
            ctx.fillStyle = 'rgba(240,245,250,0.85)';
            for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x + k * 12 - 18, hy - 30 - (i % 3) * 14 - (k & 1) * 5, 9 + (k & 1) * 3, 0, TAU); ctx.fill(); }
          }
        }
        ctx.fillStyle = night ? '#0a121c' : '#2c5878'; ctx.fillRect(0, hy, W, H - hy);
        ctx.fillStyle = night ? '#0e1824' : '#386a8c'; ctx.fillRect(0, hy, W, 3);
        // wave dashes anchored to absolute bearing
        ctx.fillStyle = night ? 'rgba(120,140,160,0.25)' : 'rgba(200,225,240,0.45)';
        for (let row = 0; row < 10; row++) {
          const y = hy + 4 + row * row * 1.3, step = 0.05 / (1 + row * 0.6) * (fov / 0.6);
          const k0 = Math.floor((scopeBrg - fov / 2) / step);
          for (let k = k0; k < k0 + fov / step + 2; k++) {
            const h = ((k * 7919 + row * 104729) >>> 0) % 5; if (h > 1) continue;
            const x = cx + (k * step - scopeBrg) / fov * W + Math.sin(api.time + k) * 2;
            ctx.fillRect(x, y, 2 + row, 1);
          }
        }
        // ships, far to near
        const list = ships.map(s => ({ s, r: Math.hypot(s.x - sub.x, s.y - sub.y), b: brgOf(s.x - sub.x, s.y - sub.y) }))
          .filter(o => o.r < (opts.vis || visRange()) + (o.s.fire > 0 ? 6000 : 0)).sort((a, b) => b.r - a.r);
        for (const o of list) {
          const rel = wrapA(o.b - scopeBrg);
          if (Math.abs(rel) > fov / 2 + 0.2) continue;
          const x0 = cx + rel / fov * W;
          const ppy = ppr / o.r;
          const aob = wrapA(o.b + Math.PI - o.s.hdg);
          const lenPx = Math.max(o.s.T.L * Math.abs(Math.sin(aob)), o.s.T.B * 0.9) * ppy;
          const dirSign = Math.sin(o.s.hdg - o.b) >= 0 ? 1 : -1;
          const hull = Math.max(0, (o.r - 7000) / 9000) * 14;
          const y0 = hy + eye / o.r * ppr + hull * ppy;
          const fog = night ? 0 : clamp((o.r - 6000) / 14000, 0, 0.65);
          drawSil(ctx, o.s, x0, y0, ppy, dirSign, lenPx, night, fog);
          if (lock && lock.s === o.s && opts.reticle) {
            ctx.strokeStyle = '#ffd040'; ctx.strokeRect(x0 - lenPx / 2 - 3, y0 - 26 * ppy - 3, lenPx + 6, 26 * ppy + 6);
          }
        }
        // torpedo wakes
        ctx.fillStyle = night ? 'rgba(160,190,200,0.5)' : 'rgba(240,250,255,0.8)';
        for (const t of torps) {
          const r = Math.hypot(t.x - sub.x, t.y - sub.y); if (r < 30) continue;
          const rel = wrapA(brgOf(t.x - sub.x, t.y - sub.y) - scopeBrg);
          if (Math.abs(rel) > fov / 2) continue;
          ctx.fillRect(cx + rel / fov * W - 2, hy + eye / r * ppr, 4, 1);
        }
        // explosions and splashes
        for (const f of fx) {
          const r = Math.hypot(f.x - sub.x, f.y - sub.y); if (r < 20) continue;
          const rel = wrapA(brgOf(f.x - sub.x, f.y - sub.y) - scopeBrg);
          if (Math.abs(rel) > fov / 2 + 0.1) continue;
          const x = cx + rel / fov * W, y = hy + eye / r * ppr, ppy = ppr / r, a = f.t / (f.k === 'boom' ? 3 : 4);
          if (f.k === 'boom') {
            ctx.fillStyle = 'rgba(255,' + (150 + a * 100 | 0) + ',60,' + a.toFixed(2) + ')';
            ctx.beginPath(); ctx.arc(x, y - 10 * ppy, (f.small ? 8 : 25) * ppy * (1.5 - a), 0, TAU); ctx.fill();
            ctx.fillStyle = 'rgba(235,240,245,' + (a * 0.8).toFixed(2) + ')';
            ctx.fillRect(x - 6 * ppy, y - (f.small ? 15 : 60) * ppy * (1.2 - a * 0.5), 12 * ppy, (f.small ? 15 : 60) * ppy * (1.2 - a * 0.5));
          } else {
            ctx.fillStyle = 'rgba(235,240,245,' + (a * 0.8).toFixed(2) + ')';
            const hgt = (f.k === 'dc' ? 40 : 18) * ppy * Math.sin(a * Math.PI);
            ctx.fillRect(x - 4 * ppy, y - hgt, 8 * ppy, hgt);
          }
        }
        return hy;
      }
      function drawScope(ctx) {
        const surf = sub.depth < 5;
        if (!surf && (sub.depth > 65 || sub.sys[2] < 30)) { drawSonar(ctx); return; }
        const fov = scopeFov();
        const hy = drawScopeWorld(ctx, { fov, reticle: true });
        const cx = 160;
        if (!surf) {
          // periscope optics
          if (sub.depth > 52 && Math.sin(api.time * 2.1) > 0.4) { ctx.fillStyle = 'rgba(30,70,90,0.55)'; ctx.fillRect(0, hy - 6, W, H - hy + 6); }
          ctx.fillStyle = '#000';
          ctx.beginPath(); ctx.rect(0, 0, W, 200); ctx.arc(cx, 100, 96, 0, TAU, true); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(cx - 96, 100); ctx.lineTo(cx + 96, 100); ctx.moveTo(cx, 4); ctx.lineTo(cx, 196); ctx.stroke();
          for (let i = -8; i <= 8; i++) { const x = cx + i * 10; ctx.beginPath(); ctx.moveTo(x, 97); ctx.lineTo(x, i % 4 ? 100 : 94); ctx.stroke(); }
          for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(cx - 3, 100 + i * 12); ctx.lineTo(cx + 3, 100 + i * 12); ctx.stroke(); }
          text(ctx, scopeHi ? 'HIGH POWER' : 'LOW POWER', 8, 6, '#6a7a6a');
        } else {
          // bridge railing / binocular frame
          ctx.fillStyle = '#1c2024'; ctx.fillRect(0, 182, W, 18);
          ctx.fillStyle = '#2a3036'; ctx.fillRect(0, 180, W, 3);
          for (let x = 10; x < W; x += 50) ctx.fillRect(x, 160, 3, 22);
          ctx.fillStyle = '#2a3036'; ctx.fillRect(0, 160, W, 2);
          ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(cx - 6, 100); ctx.lineTo(cx + 6, 100); ctx.moveTo(cx, 94); ctx.lineTo(cx, 106); ctx.stroke();
          text(ctx, weapon === 'gun' ? 'BRIDGE - DECK GUN' : 'BRIDGE', 8, 6, '#c0d0e0');
        }
        text(ctx, 'BRG ' + pad3(deg(scopeBrg)) + ' REL ' + pad3(deg(scopeBrg - sub.hdg)), 312, 6, '#c0d0b0', 1, 'right');
        drawTDC(ctx);
      }
      function drawTDC(ctx) {
        const sol = solution();
        if (!sol) { text(ctx, 'NO TARGET - TURN SCOPE ONTO A SHIP', 160, 186, '#8a9a8a', 1, 'center'); return; }
        const s = lock.s;
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(4, 150, 104, 46);
        text(ctx, s.T.name, 8, 153, '#ffd040');
        text(ctx, s.tons + ' TONS', 8, 162, '#c0d0b0');
        text(ctx, 'RNG ' + Math.round(sol.rE / 50) * 50, 8, 171, '#c0d0b0');
        const a = deg(Math.abs(sol.aE));
        text(ctx, 'AOB ' + (sol.aE >= 0 ? 'S' : 'P') + a + ' SPD ' + Math.round(sol.sE), 8, 180, '#c0d0b0');
        const q = sol.q;
        text(ctx, 'SOL', 8, 189, '#c0d0b0');
        ctx.fillStyle = '#222'; ctx.fillRect(28, 189, 76, 6);
        ctx.fillStyle = q > 75 ? '#40e040' : q > 45 ? '#e0c040' : '#e04040'; ctx.fillRect(28, 189, 76 * q / 100, 6);
        const g = gyroFor(sol);
        if (weapon === 'torp' && g) {
          const gy = wrapA(g.hdg - sub.hdg), fwd = Math.abs(gy) <= Math.PI / 2;
          text(ctx, 'GYRO ' + pad3(deg(gy)) + (fwd ? ' FWD' : ' AFT'), 314, 180, g.run > 4600 ? '#e04040' : '#c0d0b0', 1, 'right');
          text(ctx, 'RUN ' + Math.round(g.run) + (g.run > 4600 ? ' FAR' : ''), 314, 189, g.run > 4600 ? '#e04040' : '#c0d0b0', 1, 'right');
        } else if (weapon === 'gun') text(ctx, 'GUN RNG ' + Math.round(sol.R / 50) * 50, 314, 189, sol.R < 6000 ? '#c0d0b0' : '#e04040', 1, 'right');
      }
      function drawSonar(ctx) {
        ctx.fillStyle = '#04120c'; ctx.fillRect(0, 0, W, 200);
        ctx.strokeStyle = '#0e3a24'; ctx.lineWidth = 1;
        const cx = 160, cy = 100, R = 80;
        for (let r = 20; r <= R; r += 20) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
        const sw = (api.time * 1.5) % TAU;
        ctx.strokeStyle = '#30c070'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(sw) * R, cy - Math.cos(sw) * R); ctx.stroke();
        for (const s of sonarContacts()) {
          const b = wrapA(brgOf(s.x - sub.x, s.y - sub.y) - sub.hdg), r = Math.hypot(s.x - sub.x, s.y - sub.y);
          const loud = s.escort && s.state === 'hunt' ? 1 : clamp(1 - r / 10000, 0.2, 1);
          ctx.strokeStyle = s.escort ? 'rgba(255,90,70,' + loud.toFixed(2) + ')' : 'rgba(80,240,140,' + loud.toFixed(2) + ')';
          ctx.beginPath(); ctx.moveTo(cx + Math.sin(b) * 22, cy - Math.cos(b) * 22); ctx.lineTo(cx + Math.sin(b) * R, cy - Math.cos(b) * R); ctx.stroke();
        }
        text(ctx, sub.sys[2] < 30 && sub.depth <= 65 ? 'PERISCOPE DAMAGED' : 'HYDROPHONES', 8, 6, '#30c070');
        text(ctx, 'RED = ESCORT  GREEN = MERCHANT', 8, 188, '#208050');
        text(ctx, 'UP: COME UP TO 60 FT', 312, 188, '#208050', 1, 'right');
        const hunted = ships.filter(e => e.escort && !e.sinking && e.state === 'hunt');
        if (hunted.length) text(ctx, 'PINGING! ' + hunted.length + ' ESCORT' + (hunted.length > 1 ? 'S' : '') + ' HUNTING', 312, 6, (api.frame >> 4) & 1 ? '#ff6040' : '#a03020', 1, 'right');
        text(ctx, 'RUN SILENT: SLOW AND DEEP', 160, 176, '#208050', 1, 'center');
      }

      // ---------- rendering: map ----------
      function mapScale() {
        const z = [0, 160 / 4000, 160 / 10000, 160 / 22000][mapZoom];
        if (z) return z;
        let nd = 1e9; for (const s of ships) if (!s.sinking && (visible(s) || s.escort)) nd = Math.min(nd, Math.hypot(s.x - sub.x, s.y - sub.y));
        return nd < 4500 ? 160 / 5000 : nd < 11000 ? 160 / 12000 : 160 / 22000;
      }
      function drawMap(ctx) {
        const sc = mapScale(), cx = 160, cy = 100;
        const X = x => cx + (x - sub.x) * sc, Y = y => cy - (y - sub.y) * sc;
        ctx.fillStyle = '#0c2036'; ctx.fillRect(0, 0, W, 200);
        const grid = sc > 0.02 ? 1000 : 4000;
        ctx.strokeStyle = '#163452'; ctx.lineWidth = 1; ctx.beginPath();
        for (let gx = Math.floor((sub.x - 200 / sc) / grid) * grid; gx < sub.x + 200 / sc; gx += grid) { ctx.moveTo(X(gx), 0); ctx.lineTo(X(gx), 200); }
        for (let gy = Math.floor((sub.y - 120 / sc) / grid) * grid; gy < sub.y + 120 / sc; gy += grid) { ctx.moveTo(0, Y(gy)); ctx.lineTo(W, Y(gy)); }
        ctx.stroke();
        // torpedo range ring
        ctx.strokeStyle = 'rgba(255,210,64,0.25)'; ctx.beginPath(); ctx.arc(cx, cy, 4600 * sc, 0, TAU); ctx.stroke();
        // sonar bearings
        if (sub.depth >= 5) for (const s of sonarContacts()) {
          if (visible(s)) continue;
          const b = brgOf(s.x - sub.x, s.y - sub.y);
          ctx.strokeStyle = s.escort ? 'rgba(255,90,70,0.35)' : 'rgba(80,240,140,0.3)';
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(b) * 400, cy - Math.cos(b) * 400); ctx.stroke();
        }
        // depth charges
        for (const d of dcs) { ctx.fillStyle = '#ff9030'; ctx.fillRect(X(d.x) - 1, Y(d.y) - 1, 2, 2); }
        for (const f of fx) if (f.k === 'dc' || f.k === 'boom') { ctx.strokeStyle = f.k === 'dc' ? 'rgba(255,140,40,0.7)' : 'rgba(255,240,120,0.8)'; ctx.beginPath(); ctx.arc(X(f.x), Y(f.y), (4 - f.t) * 3 + 2, 0, TAU); ctx.stroke(); }
        // torpedoes
        for (const t of torps) {
          ctx.fillStyle = 'rgba(255,230,120,0.5)';
          for (const p of t.trail) ctx.fillRect(X(p[0]), Y(p[1]), 1, 1);
          ctx.fillStyle = '#ffe070'; ctx.fillRect(X(t.x) - 1, Y(t.y) - 1, 3, 3);
        }
        // ships
        for (const s of ships) {
          const seen = visible(s) || (sub.depth < 5 && Math.hypot(s.x - sub.x, s.y - sub.y) < 6000);
          if (!seen) continue;
          const x = X(s.x), y = Y(s.y), l = Math.max(3, s.T.L * sc * 0.5), h = s.hdg;
          ctx.strokeStyle = s.sinking ? '#606060' : s.escort ? '#ff6050' : '#f0f0e0'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x - Math.sin(h) * l, y + Math.cos(h) * l); ctx.lineTo(x + Math.sin(h) * l, y - Math.cos(h) * l); ctx.stroke();
          ctx.lineWidth = 1;
          if (!s.sinking) { ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(x + Math.sin(h) * l - 1, y - Math.cos(h) * l - 1, 2, 2); }
          if (lock && lock.s === s) { ctx.strokeStyle = '#ffd040'; ctx.strokeRect(x - 6, y - 6, 12, 12); }
          if (sc > 0.02 && !s.sinking) text(ctx, s.escort ? 'DD' : s.T.name.slice(0, 3), x + 6, y + 3, s.escort ? '#ff8070' : '#a0b0a0');
        }
        // our boat
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(sub.hdg);
        ctx.fillStyle = sub.depth < 5 ? '#60ff80' : '#30a0ff';
        ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(4, 5); ctx.lineTo(-4, 5); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = 'rgba(96,255,128,0.5)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(sub.ordHdg) * 30, cy - Math.cos(sub.ordHdg) * 30); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,210,64,0.5)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(scopeBrg) * 18, cy - Math.cos(scopeBrg) * 18); ctx.stroke();
        text(ctx, 'PLOT  ' + (grid / 1000) + ',000 YD GRID', 6, 6, '#80a0c0');
        text(ctx, 'ORDERED COURSE ' + pad3(deg(sub.ordHdg)), 314, 6, '#80ff90', 1, 'right');
        text(ctx, 'ARROWS: HELM/SPEED  SPACE: TIME  CLICK: STEER', 160, 190, '#4a6a8a', 1, 'center');
      }

      // ---------- rendering: damage control ----------
      function drawStatus(ctx) {
        ctx.fillStyle = '#1a1a16'; ctx.fillRect(0, 0, W, 200);
        // boat profile
        ctx.fillStyle = '#3a4048';
        ctx.beginPath(); ctx.moveTo(20, 34); ctx.lineTo(296, 34); ctx.quadraticCurveTo(312, 40, 300, 48); ctx.lineTo(30, 48); ctx.quadraticCurveTo(10, 42, 20, 34); ctx.fill();
        ctx.fillRect(140, 22, 36, 12);
        const comp = [[30, 4], [3, 3], [5, 6], [1, 0], [2, 5], [0, 7], [4, 0]];
        comp.forEach(([x, si], i) => {
          const h = sub.sys[si];
          ctx.fillStyle = h > 80 ? '#2a5a2a' : h > 40 ? '#7a6a20' : '#8a2020';
          ctx.fillRect(28 + i * 38, 36, 34, 10);
        });
        const fl = sub.flood / 100;
        ctx.fillStyle = 'rgba(40,110,200,0.6)'; ctx.fillRect(28, 46 - 10 * fl, 266, 10 * fl);
        text(ctx, 'DAMAGE CONTROL', 6, 6, '#e0c080');
        text(ctx, 'HULL ' + Math.round(sub.hull) + '%  FLOOD ' + Math.round(sub.flood) + '%  CRUSH ' + Math.round(430 * (0.65 + 0.35 * sub.hull / 100)) + ' FT', 314, 6, '#c0c0a0', 1, 'right');
        const rows = [['HULL INTEGRITY', sub.hull, sub.prio === -1]].concat(SYS.map((n, i) => [n, sub.sys[i], sub.prio === i])).concat([['END ENGAGEMENT', -1, false]]);
        rows.forEach(([n, v, pr], i) => {
          const y = 60 + i * 13;
          if (i === statSel) { ctx.fillStyle = '#34342a'; ctx.fillRect(4, y - 2, 312, 12); }
          text(ctx, n, 10, y, i === statSel ? '#ffffff' : '#c0c0a0');
          if (v >= 0) {
            ctx.fillStyle = '#2a2a24'; ctx.fillRect(130, y, 120, 7);
            ctx.fillStyle = v > 80 ? '#40c040' : v > 40 ? '#d0b030' : '#d03030'; ctx.fillRect(130, y, 120 * v / 100, 7);
            text(ctx, Math.round(v) + '%', 284, y, '#c0c0a0', 1, 'right');
            if (pr) text(ctx, '*', 296, y, '#ffd040');
          }
        });
        text(ctx, 'UP/DOWN SELECT  SPACE: REPAIR PRIORITY (*)', 160, 190, '#7a7a60', 1, 'center');
      }

      // ---------- HUD ----------
      function clock() { const t = (patrol.t0 + gameT) % 86400; return String(Math.floor(t / 3600)).padStart(2, '0') + String(Math.floor(t % 3600 / 60)).padStart(2, '0'); }
      function drawHUD(ctx) {
        ctx.fillStyle = '#14181c'; ctx.fillRect(0, 200, W, 40);
        ctx.fillStyle = '#2a3238'; ctx.fillRect(0, 200, W, 1);
        const surf = sub.depth < 5;
        text(ctx, 'DEPTH', 4, 204, '#7a8a9a'); text(ctx, surf ? 'SURF' : Math.round(sub.depth) + 'FT', 4, 213, surf ? '#60ff80' : sub.depth > 250 ? '#ff9060' : '#30a0ff');
        text(ctx, '>' + sub.ordDepth, 4, 222, '#7a8a9a');
        text(ctx, 'SPEED', 46, 204, '#7a8a9a'); text(ctx, sub.speed.toFixed(1) + 'KT', 46, 213, '#e0e0e0'); text(ctx, TELE[sub.tele], 46, 222, '#7a8a9a');
        text(ctx, 'COURSE', 98, 204, '#7a8a9a'); text(ctx, pad3(deg(sub.hdg)), 98, 213, '#e0e0e0');
        text(ctx, 'BATT', 142, 204, '#7a8a9a');
        ctx.fillStyle = '#222'; ctx.fillRect(142, 214, 26, 6); ctx.fillStyle = sub.batt > 30 ? '#40c040' : '#d03030'; ctx.fillRect(142, 214, 26 * sub.batt / 100, 6);
        text(ctx, 'TUBES', 176, 204, '#7a8a9a'); text(ctx, 'F' + sub.fwd + '/' + sub.fwdRes, 176, 213, sub.fwd ? '#e0e0e0' : '#d03030'); text(ctx, 'A' + sub.aft + '/' + sub.aftRes, 176, 222, sub.aft ? '#e0e0e0' : '#d03030');
        text(ctx, 'TIME ' + clock(), 220, 204, '#7a8a9a');
        text(ctx, ts > 8 ? 'X4 TIME' : '', 220, 213, '#ffd040');
        text(ctx, weapon === 'gun' ? 'GUN ' + sub.gunAmmo : 'TORPEDO', 220, 222, weapon === 'gun' ? '#ffd040' : '#7a8a9a');
        text(ctx, 'TONS', 316, 204, '#7a8a9a', 1, 'right'); text(ctx, String(score), 316, 213, '#ffffff', 1, 'right');
        text(ctx, 'BOATS ' + lives, 316, 222, '#7a8a9a', 1, 'right');
        const tabs = ['scope', 'map', 'status'], names = [surf ? 'BRIDGE' : sub.depth <= 65 ? 'SCOPE' : 'SONAR', 'MAP', 'DAMAGE'];
        tabs.forEach((t, i) => { const x = 4 + i * 54; ctx.fillStyle = view === t ? '#3a5a7a' : '#20282e'; ctx.fillRect(x, 231, 50, 9); text(ctx, names[i], x + 25, 232, view === t ? '#fff' : '#7a8a9a', 1, 'center'); });
        text(ctx, 'X: NEXT VIEW', 316, 232, '#4a5a6a', 1, 'right');
        if (sub.hull < 100 || sub.flood > 0) { if (sub.flood > 30 && (api.frame >> 4) & 1) text(ctx, 'FLOODING ' + Math.round(sub.flood) + '%', 220, 232 - 9 * 0, '#ff4040'); }
      }
      function drawPatrol(ctx) {
        ctx.save();
        if (shake > 0 && view !== 'scope') ctx.translate(rnd(-2, 2) * shake, rnd(-2, 2) * shake);
        if (view === 'scope') drawScope(ctx);
        else if (view === 'map') drawMap(ctx);
        else drawStatus(ctx);
        ctx.restore();
        drawHUD(ctx);
        msgs.forEach((m, i) => shadow(ctx, m.s, 160, 18 + i * 10, m.col, 1, 'center'));
        if (sub.batt < 15 && sub.depth >= 5 && (api.frame >> 5) & 1) shadow(ctx, 'BATTERY LOW - SURFACE TO RECHARGE', 160, 140, '#ff6040', 1, 'center');
        if (paused) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 90, W, 24); shadow(ctx, 'PAUSED', 160, 98, '#fff', 1, 'center'); }
      }
      function panel(ctx, title) {
        ctx.fillStyle = '#0a1622'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#1a3048'; ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
        for (let y = 0; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }
        ctx.fillStyle = '#d0a040'; ctx.fillRect(10, 24, W - 20, 1); ctx.fillRect(10, H - 22, W - 20, 1);
        shadow(ctx, title, 160, 10, '#e0e8f0', 1, 'center');
      }
      const rank = () => RANKS[Math.min(RANKS.length - 1, Math.floor(score / 25000))];
      function render(ctx) {
        ctx.save();
        if (state === 'title') {
          if (!demo) setupDemo();
          drawScopeWorld(ctx, { fov: 0.4, vis: 14000 });
          ctx.fillStyle = '#000'; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(160, 112, 104, 0, TAU, true); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.beginPath(); ctx.moveTo(56, 112); ctx.lineTo(264, 112); ctx.moveTo(160, 8); ctx.lineTo(160, 216); ctx.stroke();
          shadow(ctx, 'SILENT SERVICE', 160, 14, '#d8e8f0', 2, 'center');
          shadow(ctx, 'II', 160, 32, '#e0a030', 2, 'center');
          const page = Math.floor(tTitle / 6) % 3;
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(40, 150, 240, 46);
          if (page === 0) {
            text(ctx, 'WWII FLEET SUBMARINE COMMAND', 160, 154, '#c0d0e0', 1, 'center');
            text(ctx, 'SINK ENEMY SHIPPING', 160, 166, '#c0d0e0', 1, 'center');
            text(ctx, 'HIGH SCORE ' + hiScore + ' TONS', 160, 182, '#ffd040', 1, 'center');
          } else if (page === 1) {
            text(ctx, 'X: SCOPE / MAP / DAMAGE VIEWS', 160, 152, '#c0d0e0', 1, 'center');
            text(ctx, 'SCOPE: ARROWS TURN AND DIVE', 160, 162, '#c0d0e0', 1, 'center');
            text(ctx, 'SPACE: FIRE  Z: SPREAD OF 3', 160, 172, '#c0d0e0', 1, 'center');
            text(ctx, 'MAP: ARROWS STEER AND SPEED', 160, 182, '#c0d0e0', 1, 'center');
          } else {
            text(ctx, 'HOLD A SHIP IN THE SCOPE TO', 160, 154, '#c0d0e0', 1, 'center');
            text(ctx, 'BUILD THE TDC SOLUTION, THEN', 160, 164, '#c0d0e0', 1, 'center');
            text(ctx, 'FIRE AND GO DEEP. C: CRASH DIVE', 160, 174, '#c0d0e0', 1, 'center');
            text(ctx, 'ESCORTS HUNT WITH SONAR', 160, 184, '#ff8060', 1, 'center');
          }
          if (api.credits > 0) { if ((api.frame >> 5) & 1) shadow(ctx, 'PUSH START', 160, 212, '#ffffff', 1, 'center'); }
          else if (coinFlash > 0 ? (api.frame >> 2) & 1 : (api.frame >> 5) & 1) shadow(ctx, 'INSERT COIN', 160, 212, '#ff6040', 1, 'center');
          text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 316, 230, '#7a8a9a', 1, 'right');
          text(ctx, '\u00a9 1990 MICROPROSE', 4, 230, '#7a8a9a');
        } else if (state === 'brief') {
          const P = PATROLS[patrolIdx % PATROLS.length];
          panel(ctx, 'PATROL ORDERS - PATROL ' + (patrolIdx + 1) + (round ? ' (WAR YEAR ' + (round + 1) + ')' : ''));
          shadow(ctx, P.name, 160, 34, '#ffd040', 2, 'center');
          text(ctx, 'AREA: ' + P.area + (P.night ? ' - NIGHT' : ' - DAY'), 160, 58, '#80c0ff', 1, 'center');
          P.brief.forEach((l, i) => text(ctx, l, 160, 76 + i * 12, '#c0d0e0', 1, 'center'));
          text(ctx, 'INTEL: ' + P.m.length + ' TARGETS, ' + (P.e + (round > 0 ? 1 : 0)) + ' ESCORTS', 160, 120, '#ffa040', 1, 'center');
          text(ctx, 'COMMANDER: ' + rank(), 160, 140, '#c0d0e0', 1, 'center');
          text(ctx, 'TONNAGE SUNK ' + score + '   BOATS ' + lives, 160, 152, '#c0d0e0', 1, 'center');
          text(ctx, 'LOAD: 24 TORPEDOES, 90 SHELLS', 160, 168, '#7a8a9a', 1, 'center');
          if ((api.frame >> 4) & 1) text(ctx, 'PRESS SPACE TO BEGIN PATROL', 160, 200, '#ffffff', 1, 'center');
        } else if (state === 'report') {
          panel(ctx, 'PATROL REPORT');
          shadow(ctx, patrol.reason, 160, 36, patrol.sunk ? '#80ff80' : '#ffa040', 1, 'center');
          const rows = [['SHIPS SUNK', patrol.sunk], ['TONNAGE THIS PATROL', patrol.tons], ['CLEAN SWEEP BONUS', patrol.bonus], ['TORPEDOES LEFT', sub.fwd + sub.fwdRes + sub.aft + sub.aftRes], ['HULL', Math.round(sub.hull) + '%']];
          rows.forEach(([a, b], i) => { text(ctx, a, 40, 62 + i * 14, '#c0d0e0'); text(ctx, String(b), 280, 62 + i * 14, '#ffd040', 1, 'right'); });
          text(ctx, 'CAREER TONNAGE ' + score, 160, 140, '#ffffff', 1, 'center');
          text(ctx, 'RANK: ' + rank(), 160, 154, '#ffd040', 1, 'center');
          const medal = patrol.tons >= 20000 ? 'NAVY CROSS' : patrol.tons >= 12000 ? 'SILVER STAR' : patrol.tons >= 5000 ? 'BRONZE STAR' : '';
          if (medal) text(ctx, 'AWARDED THE ' + medal, 160, 170, '#80ff80', 1, 'center');
          if (stateT > 1.2 && (api.frame >> 4) & 1) text(ctx, 'PRESS SPACE', 160, 202, '#ffffff', 1, 'center');
        } else if (state === 'sunk' || state === 'cont') {
          ctx.fillStyle = '#02080e'; ctx.fillRect(0, 0, W, H);
          for (let i = 0; i < 30; i++) { const x = (i * 97) % W, y = H - ((stateT * 40 + i * 37) % H); ctx.fillStyle = 'rgba(120,170,220,0.5)'; ctx.beginPath(); ctx.arc(x, y, 1 + (i % 3), 0, TAU); ctx.fill(); }
          shadow(ctx, 'BOAT LOST', 160, 80, '#ff5040', 3, 'center');
          text(ctx, sub && sub.flood >= 100 ? 'FLOODED AND SANK' : 'HULL CRUSHED', 160, 118, '#c0d0e0', 1, 'center');
          text(ctx, 'THE CREW IS RESCUED... BOATS LEFT ' + Math.max(0, lives - 1), 160, 134, '#c0d0e0', 1, 'center');
        } else if (state === 'over') {
          panel(ctx, 'END OF WAR PATROLS');
          shadow(ctx, 'GAME OVER', 160, 70, '#ff6040', 3, 'center');
          text(ctx, 'CAREER TONNAGE ' + score, 160, 120, '#ffffff', 1, 'center');
          text(ctx, 'FINAL RANK ' + rank(), 160, 134, '#ffd040', 1, 'center');
          text(ctx, 'HIGH SCORE ' + hiScore, 160, 156, '#c0d0e0', 1, 'center');
        } else if (state === 'patrol' && sub) {
          drawPatrol(ctx);
        } else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
        ctx.restore();
      }

      return {
        update, render, destroy() { },
        _bot: () => ({ state, sub, ships, torps, dcs, view, scopeBrg, lock, sol: solution(), patrol, score, lives, patrolIdx, ts, weapon, visible, gyro: s => gyroFor(s) })
      };
    }
  });
})();
