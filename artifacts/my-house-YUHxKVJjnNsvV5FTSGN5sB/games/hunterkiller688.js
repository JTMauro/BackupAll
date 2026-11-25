// 688(I) Hunter/Killer (Jane's Combat Simulations, 1997) -- arcade-friendly original take on the late Cold War
// attack submarine sim: sonar waterfall with bow and towed arrays, target motion analysis plot, periscope,
// weapons console with wire-guided heavyweight torpedoes, land attack missiles, countermeasures and a mission campaign.
// All art, sound, names and text are original.
(function () {
  'use strict';
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
    '%': [24, 25, 2, 4, 8, 19, 3], '[': [14, 8, 8, 8, 8, 8, 14], ']': [14, 2, 2, 2, 2, 2, 14], '~': [0, 0, 8, 21, 2, 0, 0]
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
  const TAU = Math.PI * 2, D2R = Math.PI / 180;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const wrap = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
  const deg = a => { let d = Math.round(a / D2R) % 360; if (d < 0) d += 360; return d; };
  const p3 = n => String(Math.max(0, Math.round(n))).padStart(3, '0');
  const brg = (ax, ay, bx, by) => Math.atan2(bx - ax, ay - by);
  const dst = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];

  const KY = 0.5626;          // yards per second per knot
  const TS = 10;              // time compression
  const VH = 188;             // bottom of the station area; HUD below
  const SPEEDS = [0, 5, 10, 15, 20, 25, 32];
  const KINDS = {
    ssn: { nm: 'ATTACK SUB', cls: 'SSN', src: 9, pts: 3000, hostile: 1, sub: 1, cruise: 8, max: 30, sens: 10000, tones: [3, 9, 22] },
    ssk: { nm: 'DIESEL SUB', cls: 'SSK', src: 8, pts: 2500, hostile: 1, sub: 1, cruise: 4, max: 17, sens: 7000, tones: [5, 14] },
    dd: { nm: 'DESTROYER', cls: 'DDG', src: 30, pts: 2000, hostile: 1, surf: 1, cruise: 16, max: 30, sens: 7000, tones: [2, 7, 12, 26] },
    ff: { nm: 'FRIGATE', cls: 'FFG', src: 26, pts: 1500, hostile: 1, surf: 1, cruise: 15, max: 28, sens: 7000, tones: [4, 11, 19] },
    merch: { nm: 'MERCHANT', cls: 'MERCH', src: 34, pts: -2000, surf: 1, cruise: 13, max: 14, tones: [1, 6, 16, 17] },
    bio: { nm: 'BIOLOGIC', cls: 'BIO', src: 7, pts: 0, bio: 1, cruise: 3, max: 4, tones: [8, 24] }
  };
  const MISSIONS = [
    { n: 'COLD WATER', txt: ['A DIESEL BOAT IS SHADOWING THE', 'SHIPPING LANE. FIND IT, TRACK IT,', 'SINK IT. MERCHANTS ARE NEUTRAL.'], obj: [{ k: 'sink', w: ['ssk'], n: 1 }], spawn: [['ssk', 1], ['merch', 2], ['bio', 1]], night: 0 },
    { n: 'CHOKEPOINT', txt: ['TWO ATTACK SUBS WILL TRANSIT', 'THE GAP TONIGHT. STOP THEM', 'BEFORE THEY REACH OPEN WATER.'], obj: [{ k: 'sink', w: ['ssn'], n: 2 }], spawn: [['ssn', 2], ['merch', 1], ['bio', 2]], night: 1 },
    { n: 'DEEP STRIKE', txt: ['REACH THE LAUNCH BOX AND PUT', 'THREE LAND ATTACK MISSILES ON', 'THE AIRFIELD. A FRIGATE PATROLS.'], obj: [{ k: 'tlam', n: 3 }], spawn: [['ff', 1], ['merch', 2]], box: 1, night: 0 },
    { n: 'SURFACE ACTION', txt: ['A SURFACE GROUP IS STEAMING', 'SOUTH. SINK TWO WARSHIPS.', 'EXPECT ASW ROCKETS WHEN SEEN.'], obj: [{ k: 'sink', w: ['dd', 'ff'], n: 2 }], spawn: [['group', 1], ['bio', 1]], night: 0 },
    { n: 'WOLF HUNT', txt: ['AN SSN AND A DIESEL BOAT ARE', 'STALKING THE CARRIER GROUP.', 'KILL BOTH OF THEM.'], obj: [{ k: 'sink', w: ['ssn'], n: 1 }, { k: 'sink', w: ['ssk'], n: 1 }], spawn: [['ssn', 1], ['ssk', 1], ['merch', 2]], night: 1 },
    { n: 'LAST WATCH', txt: ['STRIKE THE NAVAL BASE WITH TWO', 'MISSILES, THEN CLEAR THE AREA', 'OF TWO ENEMY ATTACK SUBS.'], obj: [{ k: 'tlam', n: 2 }, { k: 'sink', w: ['ssn'], n: 2 }], spawn: [['ssn', 2], ['ff', 1]], box: 1, night: 1 }
  ];
  const STATIONS = ['sonar', 'tma', 'scope', 'weapons'];
  const ST_NAMES = ['SONAR', 'TMA PLOT', 'SCOPE', 'WEAPONS'];

  ArcadeRegistry.register({
    id: 'hunterkiller688', title: '688(I) Hunter/Killer', year: 1997, maker: "Jane's Combat Simulations",
    width: 320, height: 240, vector: false, pointer: true,
    controls: 'X: next station (hold X + Up/Down: depth, X + Left/Right: select track, X + Space: decoy) \u00b7 Sonar: Left/Right cursor, Space designate, Up/Down array view, Enter towed array \u00b7 TMA: arrows helm/speed, Space fire, Enter zoom \u00b7 Scope: Left/Right train, Space mark \u00b7 Weapons: Up/Down launcher, Space fire, Left/Right steer wire, Enter next torpedo \u00b7 1-4 stations, A/D/W/S helm, F fire, L missile, C decoy, T array',
    marquee: { bg: '#04140c', fg: '#58ff8c', accent: '#ffb030' },
    create(api) {
      const W = 320, H = 240;
      let mode = 'title', modeT = 0, frame = 0, coinFlash = 0;
      let hi = api.getHiScore(30000);
      let score = 0, lives = 3, mIdx = 0, round = 0, nextExtra = 50000;
      let O = null, ents = [], tracks = [], torps = [], decoys = [], tlams = [], rockets = [], msgs = [], booms = [];
      let station = 'sonar', cursor = 0, arrView = 'bow', tmaZoom = 1, scopeB = 0, launcher = 0, wireSel = 0, trackSel = null;
      let objs = [], mission = null, box = null, layer = 350, night = false, alarmT = 0, shake = 0, trackN = 0, failT = -1, failWhy = '';
      let xHold = false, xCombo = false, legHdg = 0, legT = 999, wf = [], wfHead = 0, wfT = 0, wfImg = null, pingFlash = 0, histT = 0, hist = [];
      let lostT = 0, tlamCool = 0, decoyCool = 0, completeT = -1, oldMission = 0;
      const WF_W = 288, WF_H = 118;
      for (let i = 0; i < WF_H; i++) wf.push(new Float32Array(WF_W));
      const holdF = {};
      function rep(code) { if (!api.key(code)) { holdF[code] = 0; return false; } const f = (holdF[code] || 0) + 1; holdF[code] = f; return f === 1 || (f > 18 && f % 4 === 0); }
      function msg(s, col) { msgs.push({ s, t: 4.5, col: col || '#a8ffb8' }); if (msgs.length > 3) msgs.shift(); }

      const snd = {
        click() { api.audio.tone(1200, 0.025, { type: 'square', vol: 0.06 }); },
        launch() { api.audio.noise(0.7, { vol: 0.22, freq: 1200, slideTo: 150 }); api.audio.tone(220, 0.5, { type: 'sine', vol: 0.12, slideTo: 90 }); },
        tlam() { api.audio.noise(1.6, { vol: 0.25, freq: 3000, slideTo: 300 }); api.audio.tone(90, 1.2, { type: 'sawtooth', vol: 0.08, slideTo: 300 }); },
        boom(v) { api.audio.noise(1.8, { vol: 0.32 * v, freq: 500, slideTo: 30 }); api.audio.tone(55, 1.4, { type: 'sine', vol: 0.3 * v, slideTo: 25 }); },
        alarm() { for (let i = 0; i < 5; i++) api.audio.tone(i % 2 ? 700 : 950, 0.14, { type: 'square', vol: 0.1, delay: i * 0.15 }); },
        ping(v) { api.audio.tone(3500, 0.35, { type: 'sine', vol: 0.14 * v }); api.audio.tone(3500, 0.2, { type: 'sine', vol: 0.05 * v, delay: 0.45 }); },
        seeker(v) { api.audio.tone(6000, 0.05, { type: 'sine', vol: 0.08 * v }); },
        decoy() { api.audio.noise(1.2, { vol: 0.15, freq: 3000, type: 'bandpass' }); },
        good() { api.audio.melody([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.25]], { type: 'square', vol: 0.12 }); },
        theme() {
          api.audio.melody([[196, 0.4], [233, 0.4], [294, 0.6], [262, 0.2], [233, 0.4], [196, 0.8], [0, 0.1], [175, 0.4], [196, 0.4], [233, 0.4], [220, 1.0]], { type: 'sawtooth', vol: 0.06 });
          api.audio.melody([[98, 1.6], [87, 1.6], [98, 1.6]], { type: 'sine', vol: 0.1 });
        }
      };

      // ---------- setup ----------
      function newBoat() {
        O = { x: 0, y: 0, hdg: 0, spd: 10, ord: 2, depth: 400, dOrd: 400, hull: 100, rud: 0, array: 0, arrayOrd: 0,
          tubes: [1, 1, 1, 1], reload: [0, 0, 0, 0], mk48: 18, tlam: 12, cm: 10, scope: false };
        legHdg = 0; legT = 999; hist = [];
      }
      function makeEnt(k, x, y, hdg) {
        const K = KINDS[k];
        return { k, K, x, y, hdg, spd: K.cruise, ord: K.cruise, depth: K.sub ? rnd(250, 700) : 0, alive: true, sinkT: 0, aware: 0, st: 'patrol',
          wp: null, fireT: rnd(20, 60), cmT: 0, pingT: rnd(0, 10), track: null, s: 0, heard: 0, pp: null, evT: 0, zigT: rnd(30, 90), base: hdg, lead: null, off: null };
      }
      function spawnFor(k, n) {
        for (let i = 0; i < n; i++) {
          const a = rnd(0, TAU), d = k === 'bio' ? rnd(4000, 12000) : rnd(13000, 22000);
          const x = O.x + Math.sin(a) * d, y = O.y - Math.cos(a) * d;
          let h = rnd(0, TAU);
          if (k === 'merch') h = brg(x, y, O.x + rnd(-8000, 8000), O.y + rnd(-8000, 8000));
          const e = makeEnt(k, x, y, h);
          if (k === 'ssn' && mission.n === 'CHOKEPOINT') { e.wp = { x: O.x + rnd(-6000, 6000), y: O.y + rnd(-6000, 6000) }; }
          ents.push(e);
        }
      }
      function startMission() {
        mission = MISSIONS[mIdx % MISSIONS.length];
        round = Math.floor(mIdx / MISSIONS.length);
        newBoat(); O.hdg = rnd(0, TAU); legHdg = O.hdg;
        ents = []; tracks = []; torps = []; decoys = []; tlams = []; rockets = []; booms = []; trackN = 0; trackSel = null;
        objs = mission.obj.map(o => Object.assign({ done: 0 }, o));
        layer = Math.round(rnd(250, 500) / 10) * 10; night = !!mission.night;
        for (const sp of mission.spawn) {
          if (sp[0] === 'group') {
            const a = rnd(0, TAU), d = rnd(16000, 20000);
            const x = O.x + Math.sin(a) * d, y = O.y - Math.cos(a) * d, h = brg(x, y, O.x, O.y) + rnd(-0.5, 0.5);
            const lead = makeEnt('dd', x, y, h); ents.push(lead);
            [[-1500, -800], [1500, -800], [0, -2200]].forEach((o, i) => { const f = makeEnt(i === 2 ? 'dd' : 'ff', x, y, h); f.lead = lead; f.off = o; ents.push(f); });
          } else spawnFor(sp[0], sp[1]);
        }
        box = null;
        if (mission.box) { const a = rnd(0, TAU), d = rnd(9000, 13000); box = { x: O.x + Math.sin(a) * d, y: O.y - Math.cos(a) * d, r: 3500 }; }
        for (const w of wf) w.fill(0);
        station = 'sonar'; cursor = O.hdg; failT = -1; completeT = -1; scopeB = O.hdg;
        mode = 'brief'; modeT = 0;
      }
      function newGame() { score = 0; lives = 3; mIdx = 0; nextExtra = 50000; msgs = []; startMission(); snd.theme(); }
      function tryStart() { if (api.useCredit()) { newGame(); return true; } coinFlash = 90; api.audio.tone(70, 0.25, { type: 'square', vol: 0.2 }); return false; }

      // ---------- acoustics ----------
      function ownNoise() { let n = 1 + Math.max(0, O.spd - 8) / 6; if (O.depth < 200 && O.spd > 18) n *= 1.5; return n; }
      function arrayOK(e, rel, towed) {
        if (towed) return O.array >= 1 && O.spd <= 20 ? (Math.abs(rel) < 20 * D2R ? 0.4 : 2) : 0;
        return Math.abs(rel) > 150 * D2R ? 0 : 1;
      }
      function signal(e, towed) {
        if (!e.alive && e.sinkT > 6) return 0;
        const d = dst(O.x, O.y, e.x, e.y);
        const b = brg(O.x, O.y, e.x, e.y), rel = wrap(b - O.hdg);
        const g = arrayOK(e, rel, towed); if (!g) return 0;
        let src = e.K.src * (0.6 + e.spd / 12);
        if (e.k === 'ssk' && e.spd > 10) src *= 2;
        if (!e.alive) src = 40;
        const cross = (e.depth > layer) !== (O.depth > layer) ? 0.6 : 1;
        const DR = src * 1000 * g * cross / ownNoise() * (1 + round * 0);
        return clamp(1 - d / DR, 0, 1);
      }
      function heardBy(e) {
        // how well enemy e hears the player (0..1)
        const d = dst(O.x, O.y, e.x, e.y);
        let n = 0.6 + Math.max(0, O.spd - 5) / 8; if (O.depth < 200 && O.spd > 18) n *= 1.5;
        if (O.depth <= 65 && O.scope && e.K.surf && d < 9000) n *= 2.2;
        const cross = (e.depth > layer) !== (O.depth > layer) ? 0.55 : 1;
        const D = e.K.sens * n * cross * (1 + round * 0.15) * (e.spd > 18 ? 0.5 : 1);
        return clamp(1 - d / D, 0, 1);
      }
      function track(e) {
        if (e.track) return e.track;
        const d = dst(O.x, O.y, e.x, e.y), b = brg(O.x, O.y, e.x, e.y);
        const er = rnd(0.25, 0.55) * d * (Math.random() < 0.5 ? -1 : 1);
        const t = { id: 'S' + (++trackN), e, q: 0, ex: Math.sin(b) * er, ey: -Math.cos(b) * er, eh: rnd(-1, 1), es: rnd(-0.5, 0.5), bears: [], heardT: 0, cls: false, lost: 0 };
        e.track = t; tracks.push(t);
        return t;
      }
      function est(t) {
        const k = 1 - t.q, e = t.e;
        return { x: e.x + t.ex * k, y: e.y + t.ey * k, hdg: e.hdg + t.eh * k, spd: Math.max(0, e.spd * (1 + t.es * k)) };
      }
      function detectedS(e) { return Math.max(signal(e, false), signal(e, true)); }

      // ---------- weapons ----------
      function interceptHdg(sx, sy, tx, ty, th, ts, vt) {
        const vx = Math.sin(th) * ts, vy = -Math.cos(th) * ts, rx = tx - sx, ry = ty - sy;
        const a = vx * vx + vy * vy - vt * vt, b = 2 * (rx * vx + ry * vy), c = rx * rx + ry * ry;
        const dd = b * b - 4 * a * c;
        if (dd < 0 || Math.abs(a) < 1e-6) return brg(sx, sy, tx, ty);
        const s = Math.sqrt(dd), t1 = (-b - s) / (2 * a), t2 = (-b + s) / (2 * a);
        const t = Math.min(t1, t2) > 0 ? Math.min(t1, t2) : Math.max(t1, t2);
        if (!(t > 0)) return brg(sx, sy, tx, ty);
        return Math.atan2(rx + vx * t, -(ry + vy * t));
      }
      function fireTorp(tube) {
        if (tube == null) { tube = O.tubes.findIndex(t => t === 1); if (tube < 0) { msg(O.mk48 > 0 ? 'ALL TUBES RELOADING' : 'NO TORPEDOES LEFT', '#ffb030'); return; } }
        if (!O.tubes[tube]) { msg('TUBE ' + (tube + 1) + ' NOT READY', '#ffb030'); return; }
        const t = trackSel && trackSel.e ? trackSel : null;
        let h = O.hdg;
        if (t) { const e = est(t); h = interceptHdg(O.x, O.y, e.x, e.y, e.hdg, e.spd * KY, 55 * KY); }
        O.tubes[tube] = 0; O.reload[tube] = O.mk48 > 0 ? 30 : 0; if (O.mk48 > 0) O.mk48--;
        const tp = { own: 1, x: O.x + Math.sin(O.hdg) * 40, y: O.y - Math.cos(O.hdg) * 40, hdg: O.hdg, ord: h, spd: 55, run: 0, wire: true, manual: false, tr: t, st: 'run', tgt: null, id: 'W' + (tube + 1), depth: t ? t.e.depth : O.depth, snakeT: 0, base: h, enable: t ? Math.max(1500, dst(O.x, O.y, est(t).x, est(t).y) - 2500) : 3000 };
        torps.push(tp); wireSel = torps.filter(x => x.own).length - 1;
        snd.launch(); msg('TUBE ' + (tube + 1) + ' FIRED' + (t ? ' AT ' + t.id + ' SOL ' + Math.round(t.q * 100) + '%' : ' - NO TRACK, RUNNING ON BOW'));
        for (const e of ents) if (e.alive && e.K.hostile && dst(e.x, e.y, O.x, O.y) < 12000) { e.aware = Math.max(e.aware, 0.6); e.pp = { x: O.x + rnd(-800, 800), y: O.y + rnd(-800, 800) }; }
      }
      function fireTLAM() {
        if (!box) { msg('NO STRIKE TASKING THIS MISSION', '#ffb030'); return; }
        if (O.tlam <= 0) { msg('VLS EMPTY', '#ffb030'); return; }
        if (dst(O.x, O.y, box.x, box.y) > box.r) { msg('OUTSIDE LAUNCH BOX', '#ffb030'); return; }
        if (O.depth > 150 || O.spd > 8) { msg('LAUNCH: DEPTH 150 FT MAX, 8 KT MAX', '#ffb030'); return; }
        if (tlamCool > 0) return;
        const to = objs.find(o => o.k === 'tlam');
        if (to && to.done + tlams.length >= to.n) { msg('STRIKE TASKING FULFILLED - HOLD FIRE'); return; }
        O.tlam--; tlamCool = 12;
        tlams.push({ t: 260, hit: Math.random() < 0.85 });
        snd.tlam(); msg('VLS CELL ' + (12 - O.tlam) + ' AWAY - MISSILE INBOUND TO TARGET', '#ffd080');
        for (const e of ents) if (e.alive && e.K.hostile && dst(e.x, e.y, O.x, O.y) < 25000) { e.aware = Math.max(e.aware, 1); e.pp = { x: O.x + rnd(-1000, 1000), y: O.y + rnd(-1000, 1000) }; }
      }
      function launchDecoy() {
        if (O.cm <= 0) { msg('NO COUNTERMEASURES', '#ffb030'); return; }
        if (decoyCool > 0) return;
        O.cm--; decoyCool = 1; decoys.push({ x: O.x, y: O.y, depth: O.depth, t: 60, own: 1 }); snd.decoy(); msg('COUNTERMEASURE AWAY');
      }
      function enemyFire(e) {
        const pp = e.pp || { x: O.x, y: O.y };
        const h = interceptHdg(e.x, e.y, pp.x, pp.y, O.hdg, O.spd * KY * 0.5, 45 * KY);
        torps.push({ own: 0, x: e.x, y: e.y, hdg: h, ord: h, spd: 45, run: 0, wire: false, st: 'run', tgt: null, depth: O.depth, snakeT: 0, base: h, enable: Math.max(1500, dst(e.x, e.y, pp.x, pp.y) - 2500) });
        const d = dst(O.x, O.y, e.x, e.y);
        if (d < 16000) { msg('TORPEDO IN THE WATER! BEARING ' + p3(deg(brg(O.x, O.y, e.x, e.y))), '#ff6050'); snd.alarm(); alarmT = 3; }
      }
      function killEnt(e, how) {
        if (!e.alive) return;
        e.alive = false; e.sinkT = 0;
        booms.push({ x: e.x, y: e.y, t: 0 });
        const d = dst(O.x, O.y, e.x, e.y); snd.boom(clamp(1.3 - d / 20000, 0.3, 1));
        score += e.K.pts * (e.K.pts > 0 ? 1 + round * 0.5 : 1);
        if (e.K.pts < 0) msg('NEUTRAL MERCHANT SUNK! ' + e.K.pts + ' PTS', '#ff6050');
        else msg((how || 'HIT') + ': ' + (e.track ? e.track.id + ' ' : '') + e.K.nm + ' DESTROYED +' + e.K.pts, '#ffe070');
        for (const o of objs) if (o.k === 'sink' && o.w.includes(e.k)) o.done++;
        if (score >= nextExtra) { lives++; nextExtra += 50000; msg('EXTRA BOAT', '#80ff80'); }
        if (score > hi) { hi = score; api.setHiScore(hi); }
        if (e.K.pts > 0) snd.good();
      }

      // ---------- simulation ----------
      function steer(s, desired, kt, rate, gdt) {
        s.hdg = wrap(s.hdg + clamp(wrap(desired - s.hdg), -rate * gdt, rate * gdt));
        s.spd += clamp(kt - s.spd, -1 * gdt, 1 * gdt);
        s.x += Math.sin(s.hdg) * s.spd * KY * gdt; s.y -= Math.cos(s.hdg) * s.spd * KY * gdt;
      }
      function updEnt(e, gdt) {
        if (!e.alive) { e.sinkT += gdt / TS; e.spd = Math.max(0, e.spd - gdt); return; }
        const d = dst(e.x, e.y, O.x, O.y);
        // hostiles listen for us
        if (e.K.hostile) {
          const h = heardBy(e);
          if (h > 0) { e.aware += h * gdt * 0.008; e.pp = { x: O.x + rnd(-1, 1) * d * 0.06, y: O.y + rnd(-1, 1) * d * 0.06 }; }
          else e.aware = Math.max(0, e.aware - gdt * 0.003);
          // incoming torpedo?
          for (const t of torps) if (t.own && dst(t.x, t.y, e.x, e.y) < 6000 && (t.st !== 'run' || dst(t.x, t.y, e.x, e.y) < 3500) && e.evT <= 0) {
            e.evT = 70; e.evH = brg(t.x, t.y, e.x, e.y); e.aware = Math.max(e.aware, 1); e.pp = e.pp || { x: O.x, y: O.y };
            if (e.cmT <= 0) { decoys.push({ x: e.x, y: e.y, depth: e.depth, t: 50, own: 0 }); e.cmT = 70; }
            if (e.K.sub && e.fireT > 15 && Math.random() < 0.6) e.fireT = 8 + Math.random() * 10;
          }
        }
        e.fireT -= gdt; e.cmT -= gdt; e.evT -= gdt;
        if (e.evT > 0) { steer(e, e.evH + Math.sin(e.evT * 0.05) * 0.5, e.K.max, 3 * D2R, gdt); return; }
        if (e.lead) {
          if (e.lead.alive && e.aware < 1) {
            const L = e.lead, rx = Math.cos(L.hdg), ry = Math.sin(L.hdg), fx = Math.sin(L.hdg), fy = -Math.cos(L.hdg);
            const px = L.x + rx * e.off[0] + fx * e.off[1], py = L.y + ry * e.off[0] + fy * e.off[1];
            const al = (px - e.x) * fx + (py - e.y) * fy, la = (px - e.x) * rx + (py - e.y) * ry;
            steer(e, L.hdg + clamp(la / 1500, -0.7, 0.7), clamp(L.spd + al / 300, 5, e.K.max), 3 * D2R, gdt); return;
          }
          if (!e.lead.alive) e.lead = null;
        }
        if (e.K.hostile && e.aware >= 1 && e.pp) {
          e.st = 'attack';
          const pd = dst(e.x, e.y, e.pp.x, e.pp.y);
          if (e.K.sub) {
            const stand = e.k === 'ssk' ? 4000 : 7000;
            steer(e, brg(e.x, e.y, e.pp.x, e.pp.y) + (pd < stand ? 1.4 : 0), pd > stand ? (e.k === 'ssk' ? 8 : 15) : 6, 2 * D2R, gdt);
            if (e.fireT <= 0 && e.aware >= 1.3 && pd < (e.k === 'ssk' ? 7500 : 9500)) { enemyFire(e); e.fireT = rnd(90, 140) - round * 15; }
          } else {
            steer(e, brg(e.x, e.y, e.pp.x, e.pp.y), pd > 6000 ? 26 : 12, 3 * D2R, gdt);
            e.pingT -= gdt;
            if (e.pingT <= 0) {
              e.pingT = 12;
              if (d < 20000) { snd.ping(clamp(1.2 - d / 20000, 0.2, 1)); pingFlash = 1; }
              const pr = 12000 * ((O.depth > layer) ? 0.55 : 1);
              if (d < pr) { e.pp = { x: O.x + rnd(-300, 300), y: O.y + rnd(-300, 300) }; e.aware = 2; }
            }
            if (e.fireT <= 0 && pd < 10000) {
              e.fireT = rnd(80, 120) - round * 10;
              rockets.push({ x: e.pp.x + rnd(-400, 400), y: e.pp.y + rnd(-400, 400), t: 20 });
              msg('ASW ROCKET LAUNCH DETECTED!', '#ff6050'); snd.alarm();
            }
          }
          if (e.aware > 0 && Math.random() < 0.0005 * gdt) e.pp = null;
          return;
        }
        e.st = 'patrol';
        if (e.K.surf || e.K.bio) {
          if (e.k !== 'merch') { e.zigT -= gdt; if (e.zigT <= 0) { e.zigT = rnd(60, 120); e.base = wrap(e.base + rnd(-0.6, 0.6)); } }
          // keep in the area
          if (d > 26000) e.base = brg(e.x, e.y, O.x + rnd(-5000, 5000), O.y + rnd(-5000, 5000));
          steer(e, e.base, e.K.cruise, 1.5 * D2R, gdt);
        } else {
          if (!e.wp || dst(e.x, e.y, e.wp.x, e.wp.y) < 800) e.wp = { x: O.x + rnd(-14000, 14000), y: O.y + rnd(-14000, 14000) };
          steer(e, brg(e.x, e.y, e.wp.x, e.wp.y), e.K.cruise, 1.5 * D2R, gdt);
          if (e.k === 'ssk' && Math.random() < 0.0004 * gdt) e.depth = e.depth > 100 ? 60 : rnd(250, 600);
        }
      }
      function updTorp(t, gdt) {
        const step = t.spd * KY * gdt;
        t.run += step;
        if (t.own) {
          if (t.wire) {
            if (t.run > 16000 || O.spd > 20) { t.wire = false; msg(t.id + ' WIRE PARTED', '#ffb030'); }
            else if (!t.manual && t.tr && t.st === 'run') {
              const e = est(t.tr);
              t.ord = interceptHdg(t.x, t.y, e.x, e.y, e.hdg, e.spd * KY, t.spd * KY);
              t.depth = t.tr.e.depth;
              if (dst(t.x, t.y, e.x, e.y) < 2600) { t.st = 'search'; t.base = t.hdg; }
            }
          }
          if (t.st === 'run' && !t.wire && t.run > t.enable) { t.st = 'search'; t.base = t.hdg; }
          if (t.st === 'run' && (!t.tr || t.manual) && t.run > t.enable) { t.st = 'search'; t.base = t.hdg; }
        } else if (t.st === 'run' && t.run > t.enable) { t.st = 'search'; t.base = t.hdg; }
        // seeker
        if (t.st === 'search' || t.st === 'home') {
          const inCone = c => c && dst(t.x, t.y, c.x, c.y) < 3500 && Math.abs(wrap(brg(t.x, t.y, c.x, c.y) - t.hdg)) < 50 * D2R && c.alive !== false && !(c.t != null && c.hdg == null && c.t <= 0);
          if (t.st === 'home' && !inCone(t.tgt)) { t.tgt = null; t.st = 'search'; t.base = t.hdg; }
          if (t.st === 'search' && (frame & 15) === 0) {
            const cands = [];
            if (t.own) { for (const e of ents) if (e.alive && !e.K.bio) cands.push(e); for (const dc of decoys) if (!dc.own) cands.push(dc); }
            else { cands.push(O); for (const dc of decoys) if (dc.own) cands.push(dc); }
            let best = null, bd = 3000;
            for (const c of cands) {
              const d = dst(t.x, t.y, c.x, c.y), rel = wrap(brg(t.x, t.y, c.x, c.y) - t.hdg);
              if (d > bd || Math.abs(rel) > 38 * D2R) continue;
              const isDecoy = c.t != null && c.hdg == null;
              const cross = ((c.depth || 0) > layer) !== (t.depth > layer) ? 0.6 : 1;
              if (Math.random() > (t.own ? (isDecoy ? 0.75 : 0.85) : (isDecoy ? 0.85 : 0.5 + round * 0.1)) * cross) continue;
              best = c; bd = d;
            }
            if (best) { t.tgt = best; t.st = 'home'; if (!t.own) { if (best === O) { msg('ENEMY TORPEDO HAS ACQUIRED US!', '#ff4040'); snd.alarm(); } } else msg(t.id + ' ACQUIRED - HOMING'); }
          }
          if (t.st === 'home' && t.tgt) {
            const c = t.tgt;
            if ((c.t != null && c.hdg == null && c.t <= 0) || c.alive === false) { t.tgt = null; t.st = 'search'; t.base = t.hdg; }
            else {
              t.ord = brg(t.x, t.y, c.x, c.y); t.depth += clamp((c.depth || 0) - t.depth, -10 * gdt, 10 * gdt);
              if (dst(t.x, t.y, c.x, c.y) < 45) {
                t.dead = true;
                if (c === O) { O.hull -= 38 + rnd(0, 10) + round * 5; shake = 16; booms.push({ x: O.x, y: O.y, t: 0 }); snd.boom(1); msg('TORPEDO HIT! FLOODING!', '#ff4040'); }
                else if (c.hdg == null) { c.t = 0; msg(t.own ? t.id + ' DECOYED' : 'ENEMY TORPEDO DECOYED', t.own ? '#ffb030' : '#80ff80'); }
                else killEnt(c, t.own ? t.id + ' HIT' : 'HIT');
              }
            }
          } else if (t.st === 'search') {
            t.snakeT += gdt; t.ord = t.base + Math.sin(t.snakeT * 0.08) * 0.6;
          }
        }
        if (t.own && t.manual && t.st === 'run') { /* ord driven by player */ }
        t.hdg = wrap(t.hdg + clamp(wrap(t.ord - t.hdg), -12 * D2R * gdt, 12 * D2R * gdt));
        t.x += Math.sin(t.hdg) * step; t.y -= Math.cos(t.hdg) * step;
        if (t.run > (t.own ? 26000 : 18000)) { t.dead = true; if (t.own) msg(t.id + ' FUEL EXHAUSTED'); else msg('ENEMY TORPEDO RAN OUT', '#80ff80'); }
        if (!t.own && t.st === 'home' && t.tgt === O && (frame % (dst(t.x, t.y, O.x, O.y) < 2000 ? 12 : 30)) === 0) snd.seeker(clamp(1.2 - dst(t.x, t.y, O.x, O.y) / 4000, 0.2, 1));
      }
      function simulate(dt) {
        const gdt = dt * TS;
        // own ship
        const kt = SPEEDS[O.ord];
        O.spd += clamp(kt - O.spd, -0.5 * gdt, 0.35 * gdt);
        O.hdg = wrap(O.hdg + O.rud * (0.6 + Math.min(1, O.spd / 12) * 1.4) * D2R * gdt);
        O.x += Math.sin(O.hdg) * O.spd * KY * gdt; O.y -= Math.cos(O.hdg) * O.spd * KY * gdt;
        O.depth += clamp(O.dOrd - O.depth, -4 * gdt, 4 * gdt);
        if (O.depth > 1300) { O.hull -= 0.05 * gdt; if (Math.random() < 0.01) msg('PASSING TEST DEPTH! HULL STRESS', '#ff6050'); }
        O.scope = O.depth <= 65 && O.spd <= 10 && station === 'scope';
        // towed array
        if (O.arrayOrd && O.array < 1) O.array = Math.min(1, O.array + gdt / 60);
        if (!O.arrayOrd && O.array > 0) O.array = Math.max(0, O.array - gdt / 50);
        if (O.array > 0 && O.spd > 26 && Math.random() < 0.002 * gdt) { O.array = 0; O.arrayOrd = 0; msg('TOWED ARRAY LOST - OVERSPEED', '#ff6050'); }
        // reloads
        for (let i = 0; i < 4; i++) if (!O.tubes[i] && O.reload[i] > 0) { O.reload[i] -= gdt; if (O.reload[i] <= 0) { O.tubes[i] = 1; msg('TUBE ' + (i + 1) + ' LOADED MK48'); } }
        for (let i = 0; i < 4; i++) if (!O.tubes[i] && O.reload[i] <= 0 && O.mk48 > 0) { O.mk48--; O.reload[i] = 30; }
        tlamCool = Math.max(0, tlamCool - gdt); decoyCool = Math.max(0, decoyCool - dt);
        // leg tracking for TMA
        if (Math.abs(wrap(O.hdg - legHdg)) > 25 * D2R) { legHdg = O.hdg; legT = 0; }
        legT += gdt;
        histT += gdt; if (histT > 20) { histT = 0; hist.push([O.x, O.y]); if (hist.length > 60) hist.shift(); }
        // world
        for (const e of ents) updEnt(e, gdt);
        for (const t of torps) updTorp(t, gdt);
        torps = torps.filter(t => !t.dead);
        for (const d of decoys) d.t -= gdt;
        decoys = decoys.filter(d => d.t > 0);
        for (const r of rockets) {
          r.t -= gdt;
          if (r.t <= 0) { r.dead = true; const h = rnd(0, TAU); torps.push({ own: 0, x: r.x, y: r.y, hdg: h, ord: h, spd: 40, run: 0, wire: false, st: 'search', base: h, tgt: null, depth: 100, snakeT: 0, enable: 0 }); if (dst(r.x, r.y, O.x, O.y) < 15000) { msg('SPLASH - ASW TORPEDO IN THE WATER', '#ff6050'); snd.alarm(); } }
        }
        rockets = rockets.filter(r => !r.dead);
        for (const m of tlams) {
          m.t -= gdt;
          if (m.t <= 0) {
            m.dead = true;
            if (m.hit) { for (const o of objs) if (o.k === 'tlam') o.done++; score += 1000; msg('BDA: MISSILE IMPACT - TARGET HIT +1000', '#ffe070'); snd.good(); }
            else msg('BDA: MISSILE SHOT DOWN', '#ffb030');
          }
        }
        tlams = tlams.filter(m => !m.dead);
        for (const b of booms) b.t += dt;
        booms = booms.filter(b => b.t < 3);
        ents = ents.filter(e => e.alive || e.sinkT < 12);
        // tracks
        for (const t of tracks) {
          const e = t.e;
          const s = detectedS(e);
          if (s > 0 && e.alive) {
            t.lost = 0; t.heardT += gdt;
            if (t.heardT > 40 && !t.cls) { t.cls = true; msg(t.id + ' CLASSIFIED ' + e.K.cls + (e.K.hostile ? ' - HOSTILE' : e.K.bio ? '' : ' - NEUTRAL'), e.K.hostile ? '#ff9070' : '#a8ffb8'); }
            const bonus = legT > 15 && legT < 240 ? 2.2 : 0.5;
            t.q = Math.min(0.97, t.q + gdt * 0.0035 * bonus * (0.4 + s));
            if ((frame % 30) === 0) { t.bears.push([O.x, O.y, brg(O.x, O.y, e.x, e.y)]); if (t.bears.length > 14) t.bears.shift(); }
          } else { t.lost += gdt; t.q = Math.max(0, t.q - gdt * 0.0015); }
        }
        tracks = tracks.filter(t => t.e.alive || t.e.sinkT < 6);
        if (trackSel && !tracks.includes(trackSel)) trackSel = null;
        // waterfall row
        wfT += dt;
        if (wfT > 0.18) { wfT = 0; addWaterfallRow(); }
        pingFlash = Math.max(0, pingFlash - dt * 2);
        alarmT = Math.max(0, alarmT - dt); shake = Math.max(0, shake - dt * 10);
        // end conditions
        if (O.hull <= 0) { O.hull = 0; mode = 'lost'; lostT = 0; snd.boom(1); api.audio.noise(3, { vol: 0.25, freq: 300, slideTo: 40, delay: 0.5 }); return; }
        if (completeT < 0 && objs.every(o => o.done >= o.n)) { completeT = 3; msg('ALL OBJECTIVES COMPLETE - MISSION ACCOMPLISHED', '#80ff80'); snd.good(); }
        if (completeT >= 0) { completeT -= dt; if (completeT <= 0) { const b = 5000 * (mIdx % MISSIONS.length + 1) * (1 + round); score += b; if (score > hi) { hi = score; api.setHiScore(hi); } mode = 'debrief'; modeT = 0; failWhy = 'BONUS ' + b; } return; }
        // stuck checks
        const needT = objs.find(o => o.k === 'tlam' && o.done < o.n);
        if (needT && O.tlam + tlams.length < needT.n - needT.done) fail('NOT ENOUGH MISSILES LEFT');
        const needS = objs.find(o => o.k === 'sink' && o.done < o.n);
        if (needS && O.mk48 === 0 && O.tubes.every(x => !x) && !torps.some(t => t.own)) fail('OUT OF TORPEDOES');
        if (needS) {
          const left = ents.filter(e => e.alive && needS.w.includes(e.k)).length;
          if (left < needS.n - needS.done) spawnFor(needS.w[0], needS.n - needS.done - left);
        }
        if (failT >= 0) { failT -= dt; if (failT <= 0) { mode = 'debrief'; modeT = 0; } }
      }
      function fail(why) { if (failT < 0) { failT = 4; failWhy = 'FAILED: ' + why; msg('MISSION FAILED: ' + why, '#ff6050'); } }
      function addWaterfallRow() {
        wfHead = (wfHead + 1) % WF_H;
        const row = wf[wfHead];
        const towed = arrView === 'towed';
        const on = towed ? O.array >= 1 : true;
        const bg = 0.06 + Math.min(0.3, (ownNoise() - 1) * 0.12);
        for (let c = 0; c < WF_W; c++) {
          let v = on ? bg + Math.random() * 0.14 : Math.random() * 0.04;
          if (!towed) { const rel = wrap(c * 1.25 * D2R - O.hdg); if (Math.abs(rel) > 150 * D2R) v *= 0.3; }
          row[c] = v;
        }
        if (!on) return;
        const add = (b, s) => {
          let c0 = Math.round(((b / D2R) % 360 + 360) % 360 / 1.25);
          for (let k = -2; k <= 2; k++) { const c = (c0 + k + WF_W) % WF_W; row[c] = Math.min(1, row[c] + s * (k === 0 ? 1 : Math.abs(k) === 1 ? 0.55 : 0.2) * (0.7 + Math.random() * 0.5)); }
        };
        for (const e of ents) {
          const s = signal(e, towed); if (s <= 0) continue;
          const b = brg(O.x, O.y, e.x, e.y);
          add(b, 0.25 + s * 0.8);
          if (towed) add(2 * O.hdg - b, 0.2 + s * 0.6);
        }
        for (const t of torps) { const d = dst(O.x, O.y, t.x, t.y); if (d < 15000) { const b = brg(O.x, O.y, t.x, t.y); add(b, 0.9 * (1 - d / 15000) + 0.3); } }
        for (const d of decoys) if (dst(O.x, O.y, d.x, d.y) < 8000) add(brg(O.x, O.y, d.x, d.y), 0.7);
        if (pingFlash > 0.8) for (let c = 0; c < WF_W; c++) row[c] = Math.min(1, row[c] + 0.35);
      }

      // ---------- input ----------
      function selectTrack(dir) {
        const live = tracks.filter(t => t.e.alive);
        if (!live.length) { trackSel = null; return; }
        let i = live.indexOf(trackSel); i = (i + dir + live.length) % live.length; if (i < 0) i = 0;
        trackSel = live[i]; snd.click(); msg('TRACK ' + trackSel.id + ' SELECTED');
      }
      function designate() {
        let best = null, bd = 5 * D2R;
        for (const e of ents) {
          if (!e.alive) continue;
          const s = signal(e, arrView === 'towed'); if (s <= 0) continue;
          const b = brg(O.x, O.y, e.x, e.y);
          let d = Math.abs(wrap(b - cursor));
          if (arrView === 'towed') d = Math.min(d, Math.abs(wrap(2 * O.hdg - b - cursor)));
          if (d < bd) { bd = d; best = e; }
        }
        if (!best) { msg('NO CONTACT ON CURSOR BEARING'); snd.click(); return; }
        const isNew = !best.track;
        trackSel = track(best); snd.click();
        msg(isNew ? 'NEW TRACK ' + trackSel.id + ' DESIGNATED' : 'TRACK ' + trackSel.id + ' SELECTED');
      }
      function scopeMark() {
        if (!O.scope) return;
        let best = null, bd = 2.5 * D2R;
        for (const e of ents) {
          if (!e.alive || !e.K.surf) continue;
          const d = dst(O.x, O.y, e.x, e.y); if (d > (night ? 9000 : 16000)) continue;
          const a = Math.abs(wrap(brg(O.x, O.y, e.x, e.y) - scopeB)); if (a < bd) { bd = a; best = e; }
        }
        if (!best) { msg('NOTHING ON THE CROSSHAIR'); return; }
        trackSel = track(best); trackSel.q = 1; trackSel.cls = true; snd.click();
        msg('MARK! ' + trackSel.id + ' ' + best.K.nm + ' RANGE ' + (dst(O.x, O.y, best.x, best.y) / 1000).toFixed(1) + ' KYD');
      }
      function handleInput() {
        if (api.pressed('KeyX')) { xHold = true; xCombo = false; }
        const up = rep('ArrowUp'), dn = rep('ArrowDown'), lf = api.key('ArrowLeft'), rt = api.key('ArrowRight');
        const pl = rep('ArrowLeft'), pr = rep('ArrowRight');
        O.rud = (api.key('KeyA') ? -1 : 0) + (api.key('KeyD') ? 1 : 0);
        if (api.pressed('KeyW')) O.ord = Math.min(6, O.ord + 1);
        if (api.pressed('KeyS')) O.ord = Math.max(0, O.ord - 1);
        if (xHold) {
          if (up) { O.dOrd = Math.max(O.dOrd > 150 ? 150 : 60, O.dOrd - 100); if (O.dOrd < 60) O.dOrd = 60; xCombo = true; snd.click(); }
          if (dn) { O.dOrd = Math.min(1400, O.dOrd < 150 ? 150 : O.dOrd + 100); xCombo = true; snd.click(); }
          if (pl) { selectTrack(-1); xCombo = true; }
          if (pr) { selectTrack(1); xCombo = true; }
          if (api.pressed('Space')) { launchDecoy(); xCombo = true; }
          if (!api.key('KeyX')) { xHold = false; if (!xCombo) { station = STATIONS[(STATIONS.indexOf(station) + 1) % 4]; snd.click(); } }
        } else if (station === 'sonar') {
          if (lf) cursor = wrap(cursor - (api.key('ShiftLeft') ? 2 : 0.8) * D2R);
          if (rt) cursor = wrap(cursor + (api.key('ShiftLeft') ? 2 : 0.8) * D2R);
          if (api.pressed('ArrowUp') || api.pressed('ArrowDown')) { arrView = arrView === 'bow' ? 'towed' : 'bow'; snd.click(); }
          if (api.pressed('Space')) designate();
          if (api.pressed('Enter')) toggleArray();
        } else if (station === 'tma') {
          if (lf || rt) O.rud = (lf ? -1 : 0) + (rt ? 1 : 0);
          if (api.pressed('ArrowUp')) { O.ord = Math.min(6, O.ord + 1); snd.click(); }
          if (api.pressed('ArrowDown')) { O.ord = Math.max(0, O.ord - 1); snd.click(); }
          if (api.pressed('Space')) fireTorp(null);
          if (api.pressed('Enter')) { tmaZoom = (tmaZoom + 1) % 3; snd.click(); }
        } else if (station === 'scope') {
          if (lf) scopeB = wrap(scopeB - 0.6 * D2R);
          if (rt) scopeB = wrap(scopeB + 0.6 * D2R);
          if (api.pressed('ArrowUp')) { O.ord = Math.min(6, O.ord + 1); snd.click(); }
          if (api.pressed('ArrowDown')) { O.ord = Math.max(0, O.ord - 1); snd.click(); }
          if (api.pressed('Space')) { if (!O.scope) { O.dOrd = 60; if (O.ord > 2) O.ord = 2; msg('COMING TO PERISCOPE DEPTH'); } else scopeMark(); }
          if (api.pressed('Enter') && trackSel) { scopeB = brg(O.x, O.y, trackSel.e.x, trackSel.e.y); snd.click(); }
        } else if (station === 'weapons') {
          if (api.pressed('ArrowUp')) { launcher = (launcher + 4) % 5; snd.click(); }
          if (api.pressed('ArrowDown')) { launcher = (launcher + 1) % 5; snd.click(); }
          const mine = torps.filter(t => t.own && t.wire);
          if (mine.length) {
            const t = mine[wireSel % mine.length];
            if (lf) { t.manual = true; t.ord = wrap(t.ord - 0.8 * D2R); }
            if (rt) { t.manual = true; t.ord = wrap(t.ord + 0.8 * D2R); }
          }
          if (api.pressed('Enter')) { wireSel++; snd.click(); }
          if (api.pressed('Space')) { if (launcher === 4) fireTLAM(); else fireTorp(launcher); }
        }
        if (api.pressed('KeyF')) fireTorp(null);
        if (api.pressed('KeyL')) fireTLAM();
        if (api.pressed('KeyC')) launchDecoy();
        if (api.pressed('KeyT')) toggleArray();
        if (api.pressed('KeyQ')) { O.dOrd = Math.max(60, O.dOrd - 100); }
        if (api.pressed('KeyE')) { O.dOrd = Math.min(1400, O.dOrd + 100); }
        if (api.pressed('KeyZ')) selectTrack(1);
        for (let i = 0; i < 4; i++) if (api.pressed('Digit' + (i + 1))) { station = STATIONS[i]; snd.click(); }
        if (api.mouse.clicked) {
          const mx = api.mouse.x, my = api.mouse.y;
          if (my < 11) { station = STATIONS[clamp(Math.floor(mx / 80), 0, 3)]; snd.click(); }
          else if (station === 'sonar' && my > 28 && my < 150 && mx >= 16 && mx < 304) { cursor = wrap((mx - 16) * 1.25 * D2R); designate(); }
          else if (station === 'tma' && my < VH) {
            const sc = [250, 500, 1000][tmaZoom]; let best = null, bd = 12;
            for (const t of tracks) { const e = est(t); const d = Math.hypot(160 + (e.x - O.x) / sc - mx, 100 + (e.y - O.y) / sc - my); if (d < bd) { bd = d; best = t; } }
            if (best) { trackSel = best; snd.click(); }
          }
        }
      }
      function toggleArray() { O.arrayOrd = O.arrayOrd ? 0 : 1; msg(O.arrayOrd ? 'STREAMING TOWED ARRAY' : 'RETRIEVING TOWED ARRAY'); snd.click(); }

      // ---------- update ----------
      function update(dt) {
        frame++; modeT += dt;
        if (coinFlash > 0) coinFlash--;
        for (const m of msgs) m.t -= dt;
        msgs = msgs.filter(m => m.t > 0);
        if (mode === 'title') { if (api.anyPressed('Enter', 'Space') || api.mouse.clicked) tryStart(); return; }
        if (mode === 'brief') { if ((modeT > 1 && (api.anyPressed('Enter', 'Space') || api.mouse.clicked)) || modeT > 12) { mode = 'play'; modeT = 0; msg('CONN: MISSION ' + (mIdx + 1) + ' UNDERWAY'); } return; }
        if (mode === 'debrief') {
          if ((modeT > 2 && (api.anyPressed('Enter', 'Space') || api.mouse.clicked)) || modeT > 12) { if (failWhy.indexOf('FAILED') < 0) mIdx++; failWhy = ''; startMission(); }
          return;
        }
        if (mode === 'over') { if (modeT > 6 || (modeT > 2 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; modeT = 0; } return; }
        if (mode === 'wait') return;
        if (mode === 'lost') {
          lostT += dt; O.depth += dt * 60;
          if (lostT > 3.5) {
            lives--;
            if (lives > 0) { oldMission = mIdx; startMission(); msg('A NEW BOAT IS ASSIGNED'); }
            else {
              mode = 'wait';
              const done = () => { mode = 'over'; modeT = 0; if (score > hi) { hi = score; api.setHiScore(hi); } };
              if (api.offerContinue) api.offerContinue(() => { lives = 3; startMission(); }, done); else done();
            }
          }
          return;
        }
        handleInput();
        simulate(dt);
      }

      // ---------- rendering ----------
      function panel(ctx, x, y, w, h, col) { ctx.fillStyle = col || '#0a1a10'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#1e4a2c'; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h); }
      function drawSonar(ctx) {
        const x0 = 16, y0 = 30;
        text(ctx, (arrView === 'bow' ? 'BROADBAND - SPHERICAL BOW ARRAY' : 'BROADBAND - TOWED ARRAY' + (O.array < 1 ? (O.arrayOrd ? ' (STREAMING ' + Math.round(O.array * 100) + '%)' : ' (STOWED)') : '')), 4, 13, '#58ff8c');
        // bearing scale
        ctx.fillStyle = '#123a20'; ctx.fillRect(x0, 22, WF_W, 7);
        for (let b = 0; b < 360; b += 15) { ctx.fillStyle = '#58ff8c'; ctx.fillRect(x0 + b / 1.25, 26, 1, b % 45 === 0 ? 3 : 2); if (b % 90 === 0) text(ctx, p3(b), x0 + b / 1.25 + (b === 0 ? 9 : 0), 21, '#58ff8c', 1, 'center'); }
        // own heading & baffles
        const hx = x0 + deg(O.hdg) / 1.25; ctx.fillStyle = '#ffb030'; ctx.fillRect(hx - 1, 22, 3, 3);
        // waterfall
        if (!wfImg && ctx.createImageData) wfImg = ctx.createImageData(WF_W, WF_H);
        if (wfImg && wfImg.data && wfImg.data.length >= WF_W * WF_H * 4) {
          const D = wfImg.data;
          for (let r = 0; r < WF_H; r++) {
            const row = wf[(wfHead - r + WF_H) % WF_H];
            let p = r * WF_W * 4;
            for (let c = 0; c < WF_W; c++) { const v = row[c]; D[p] = v * v * 160; D[p + 1] = 20 + v * 235; D[p + 2] = 10 + v * 90; D[p + 3] = 255; p += 4; }
          }
          ctx.putImageData(wfImg, x0, y0);
        } else { ctx.fillStyle = '#08200e'; ctx.fillRect(x0, y0, WF_W, WF_H); }
        // cursor & track tags
        const cx = x0 + ((deg(cursor)) / 1.25);
        ctx.fillStyle = 'rgba(255,200,60,0.6)'; ctx.fillRect(Math.round(cx), y0, 1, WF_H);
        ctx.fillStyle = '#ffc83c'; ctx.fillRect(Math.round(cx) - 2, y0 - 2, 5, 2);
        text(ctx, 'CURSOR ' + p3(deg(cursor)), 304, 13, '#ffc83c', 1, 'right');
        for (const t of tracks) {
          if (!t.e.alive || t.lost > 30) continue;
          const b = brg(O.x, O.y, t.e.x, t.e.y), tx = x0 + deg(b) / 1.25;
          text(ctx, t.id, tx, y0 + WF_H + 2, t === trackSel ? '#ffc83c' : '#58ff8c', 1, 'center');
        }
        // lower panel: track list + narrowband
        panel(ctx, 4, 158, 168, 29);
        const live = tracks.filter(t => t.e.alive).slice(-3);
        if (!live.length) text(ctx, 'NO TRACKS - SPACE TO DESIGNATE', 8, 168, '#3a8a50');
        live.forEach((t, i) => {
          const s = detectedS(t.e);
          text(ctx, (t === trackSel ? '>' : ' ') + t.id + ' ' + p3(deg(brg(O.x, O.y, t.e.x, t.e.y))) + ' ' + (t.cls ? t.e.K.cls : '?????') + (s > 0 ? ' ' + Math.round(s * 30) + 'DB' : ' FADE'), 6, 161 + i * 9, t === trackSel ? '#ffc83c' : '#58ff8c');
        });
        panel(ctx, 176, 158, 140, 29);
        text(ctx, 'NARROWBAND', 180, 160, '#3a8a50');
        if (trackSel && trackSel.e.alive) {
          const s = detectedS(trackSel.e);
          for (const f of trackSel.e.K.tones) { if (s <= 0 && Math.random() < 0.7) continue; const x = 180 + f * 5; ctx.fillStyle = s > 0.2 ? '#a8ffb8' : '#3a8a50'; ctx.fillRect(x, 169 + Math.floor(Math.random() * 2), 1, 16); }
          for (let i = 0; i < 20; i++) { ctx.fillStyle = '#1e5a30'; ctx.fillRect(180 + Math.floor(Math.random() * 132), 178 + Math.floor(Math.random() * 7), 1, 2); }
        }
      }
      function drawTMA(ctx) {
        const sc = [250, 500, 1000][tmaZoom], cx = 160, cy = 100;
        ctx.fillStyle = '#04120a'; ctx.fillRect(0, 11, W, VH - 11);
        const grid = 5000 / sc;
        ctx.fillStyle = '#0c2a16';
        const ox = ((-(O.x / sc)) % grid + grid) % grid, oy = ((-(O.y / sc)) % grid + grid) % grid;
        for (let x = (cx + ox) % grid; x < W; x += grid) ctx.fillRect(Math.round(x), 11, 1, VH - 11);
        for (let y = 11 + ((cy - 11 + oy) % grid); y < VH; y += grid) ctx.fillRect(0, Math.round(y), W, 1);
        const SX = x => cx + (x - O.x) / sc, SY = y => cy + (y - O.y) / sc;
        if (box) { ctx.strokeStyle = '#ffb030'; ctx.beginPath(); ctx.arc(SX(box.x), SY(box.y), box.r / sc, 0, TAU); ctx.stroke(); text(ctx, 'LAUNCH BOX', clamp(SX(box.x), 40, 280), clamp(SY(box.y) - 3, 14, VH - 10), '#ffb030', 1, 'center'); }
        // own history
        ctx.fillStyle = '#2a8a4a'; for (const h of hist) ctx.fillRect(SX(h[0]), SY(h[1]), 1, 1);
        // bearing lines
        for (const t of tracks) {
          if (!t.e.alive) continue;
          ctx.strokeStyle = t === trackSel ? 'rgba(255,200,60,0.35)' : 'rgba(88,255,140,0.18)';
          ctx.beginPath();
          for (const b of t.bears) { ctx.moveTo(SX(b[0]), SY(b[1])); ctx.lineTo(SX(b[0] + Math.sin(b[2]) * 40000), SY(b[1] - Math.cos(b[2]) * 40000)); }
          ctx.stroke();
          const e = est(t), d = dst(O.x, O.y, t.e.x, t.e.y);
          const ex = SX(e.x), ey = SY(e.y);
          const r = Math.max(2, (1 - t.q) * d * 0.5 / sc);
          ctx.strokeStyle = t === trackSel ? '#ffc83c' : (t.cls && t.e.K.hostile ? '#ff7050' : '#58ff8c');
          ctx.beginPath(); ctx.arc(ex, ey, r, 0, TAU); ctx.stroke();
          ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(ex - 1, ey - 1, 3, 3);
          ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.sin(e.hdg) * (6 + e.spd), ey - Math.cos(e.hdg) * (6 + e.spd)); ctx.stroke();
          text(ctx, t.id, ex + 4, ey - 9, ctx.fillStyle);
        }
        // torpedoes & decoys
        for (const t of torps) {
          const tx = SX(t.x), ty = SY(t.y);
          if (t.own) { ctx.fillStyle = '#7ad0ff'; ctx.fillRect(tx - 1, ty - 1, 3, 3); if (t.wire) { ctx.strokeStyle = 'rgba(122,208,255,0.4)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke(); } }
          else if (dst(O.x, O.y, t.x, t.y) < 15000) { ctx.fillStyle = (frame >> 3) & 1 ? '#ff4040' : '#ffa0a0'; ctx.fillRect(tx - 1, ty - 1, 3, 3); }
        }
        for (const d of decoys) { ctx.fillStyle = '#c0c0ff'; ctx.fillRect(SX(d.x), SY(d.y), 2, 2); }
        for (const b of booms) { ctx.strokeStyle = '#ffb030'; ctx.beginPath(); ctx.arc(SX(b.x), SY(b.y), 2 + b.t * 8, 0, TAU); ctx.stroke(); }
        // own ship
        const hx = Math.sin(O.hdg), hy = -Math.cos(O.hdg);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(cx + hx * 6, cy + hy * 6); ctx.lineTo(cx - hx * 4 + hy * 3, cy - hy * 4 - hx * 3); ctx.lineTo(cx - hx * 4 - hy * 3, cy - hy * 4 + hx * 3); ctx.closePath(); ctx.fill();
        if (O.array > 0) { ctx.fillStyle = '#58ff8c'; for (let i = 1; i < 6; i++) ctx.fillRect(cx - hx * (4 + i * 3 * O.array), cy - hy * (4 + i * 3 * O.array), 1, 1); }
        text(ctx, 'TMA PLOT  ' + sc * 10 / 1000 + ' KYD/DIV' + (legT < 15 ? '  NEW LEG' : legT < 240 ? '  LEG ' + Math.round(legT) + 'S' : '  CHANGE LEG FOR BEARING RATE'), 4, 13, '#58ff8c');
        if (trackSel && trackSel.e.alive) {
          const e = est(trackSel), d = dst(O.x, O.y, e.x, e.y);
          panel(ctx, 4, VH - 22, 312, 21, 'rgba(4,18,10,0.85)');
          text(ctx, trackSel.id + ' ' + (trackSel.cls ? trackSel.e.K.nm : 'UNCLASSIFIED') + '  SOLUTION ' + Math.round(trackSel.q * 100) + '%', 8, VH - 20, '#ffc83c');
          text(ctx, 'BRG ' + p3(deg(brg(O.x, O.y, trackSel.e.x, trackSel.e.y))) + ' RNG ' + (d / 1000).toFixed(1) + 'KYD CRS ' + p3(deg(e.hdg)) + ' SPD ' + Math.round(e.spd) + 'KT', 8, VH - 10, '#a8ffb8');
        }
      }
      function drawScope(ctx) {
        const PX = 611, hy = 96 + Math.sin(api.time * 0.8) * 2;
        if (!O.scope) {
          ctx.fillStyle = '#05070a'; ctx.fillRect(0, 11, W, VH - 11);
          text(ctx, 'PERISCOPE HOUSED', W / 2, 80, '#58ff8c', 2, 'center');
          text(ctx, 'COME TO 60 FT AND 10 KT OR LESS', W / 2, 104, '#a8ffb8', 1, 'center');
          text(ctx, 'SPACE: MAKE PERISCOPE DEPTH', W / 2, 118, '#ffc83c', 1, 'center');
          text(ctx, 'DEPTH ' + Math.round(O.depth) + ' FT  SPEED ' + Math.round(O.spd) + ' KT', W / 2, 136, '#3a8a50', 1, 'center');
          return;
        }
        const top = night ? '#02040a' : '#5a7896', hor = night ? '#101a26' : '#a8b8c4', sea = night ? '#050a10' : '#284a62';
        for (let y = 11; y < hy; y += 5) { const k = (y - 11) / (hy - 11); ctx.fillStyle = k < 0.5 ? top : hor; ctx.fillRect(0, y, W, 5); }
        ctx.fillStyle = sea; ctx.fillRect(0, hy, W, VH - hy);
        ctx.fillStyle = night ? '#18242e' : '#6a8aa0';
        for (let i = 0; i < 14; i++) { const y = hy + 2 + i * i * 0.5, sp = 12 + i * 4, off = (scopeB * PX * 0.5 + api.time * (5 + i)) % sp; for (let x = -off; x < W; x += sp) ctx.fillRect(x + (i * 5) % 7, y, 3 + i, 1); }
        // ships
        const vis = ents.filter(e => e.K.surf && (e.alive || e.sinkT < 10)).map(e => ({ e, d: dst(O.x, O.y, e.x, e.y), rel: wrap(brg(O.x, O.y, e.x, e.y) - scopeB) }))
          .filter(v => v.d < (night ? 9000 : 16000) && Math.abs(v.rel) < 0.35).sort((a, b) => b.d - a.d);
        for (const v of vis) {
          const e = v.e, sx = 160 + v.rel * PX, sc = PX / v.d * 0.9, by = hy + 2;
          const asp = Math.abs(Math.sin(e.hdg - brg(O.x, O.y, e.x, e.y))), dir = Math.sin(e.hdg - brg(O.x, O.y, e.x, e.y)) >= 0 ? 1 : -1;
          const len = (e.k === 'merch' ? 180 : e.k === 'dd' ? 155 : 135) * (asp * 0.85 + 0.15) * sc;
          const sink = e.alive ? 0 : e.sinkT * 3;
          ctx.save(); ctx.beginPath(); ctx.rect(0, 11, W, by - 11); ctx.clip();
          const col = night ? '#0a0e12' : '#4a5258';
          ctx.fillStyle = col;
          const P = u => sx + (u - 0.5) * len * dir;
          ctx.beginPath(); ctx.moveTo(P(0), by - 6 * sc + sink); ctx.lineTo(P(0.05), by + sink); ctx.lineTo(P(0.9), by + sink); ctx.lineTo(P(1), by - 9 * sc + sink); ctx.lineTo(P(0), by - 8 * sc + sink); ctx.fill();
          const blk = (u0, u1, h) => { const a = P(u0), b = P(u1); ctx.fillRect(Math.min(a, b), by - 8 * sc - h * sc + sink, Math.max(1, Math.abs(b - a)), h * sc); };
          if (e.k === 'merch') { blk(0.05, 0.2, 14); blk(0.1, 0.14, 22); blk(0.3, 0.85, 7); }
          else { blk(0.35, 0.6, 10); blk(0.45, 0.5, 26); blk(0.62, 0.7, 7); blk(0.75, 0.8, 3); blk(0.1, 0.25, 6); ctx.fillRect(P(0.47) - 4 * sc, by - 34 * sc + sink, 8 * sc + 1, Math.max(1, 2 * sc)); }
          ctx.restore();
          if (night && e.alive) { ctx.fillStyle = '#ffffff'; ctx.fillRect(P(0.47), by - 34 * sc, 1, 1); ctx.fillStyle = dir > 0 ? '#ff3030' : '#30ff60'; ctx.fillRect(P(0.6), by - 14 * sc, 1, 1); }
          if (!e.alive) { ctx.fillStyle = (frame >> 2) & 1 ? '#ffa030' : '#ff5020'; ctx.fillRect(sx - 4, by - 10, 8, 8); }
        }
        // reticle & mask
        ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.fillRect(30, Math.round(hy), 260, 1); ctx.fillRect(159, 16, 1, 166);
        for (let i = -8; i <= 8; i++) ctx.fillRect(160 + i * 16, Math.round(hy) - (i % 2 ? 2 : 4), 1, i % 2 ? 4 : 8);
        ctx.fillStyle = '#040506';
        ctx.beginPath(); ctx.rect(0, 11, W, VH - 11); ctx.arc(160, 98, 86, 0, TAU, true); ctx.fill();
        text(ctx, 'TRUE ' + p3(deg(scopeB)), 4, 16, '#58ff8c'); text(ctx, 'REL ' + p3(deg(scopeB - O.hdg)), 4, 26, '#58ff8c');
        text(ctx, 'X4', 4, 36, '#58ff8c');
        text(ctx, 'SPACE MARK', 316, 16, '#ffc83c', 1, 'right'); text(ctx, 'ENTER TRAIN', 316, 26, '#ffc83c', 1, 'right'); text(ctx, 'ON TRACK', 316, 34, '#ffc83c', 1, 'right');
        if (ents.some(e => e.alive && e.K.surf && e.K.hostile && dst(O.x, O.y, e.x, e.y) < 9000)) text(ctx, 'ESM: RADAR', 4, 176, (frame >> 4) & 1 ? '#ff6050' : '#802820');
      }
      function drawWeapons(ctx) {
        ctx.fillStyle = '#060e0a'; ctx.fillRect(0, 11, W, VH - 11);
        text(ctx, 'WEAPONS CONTROL', 4, 14, '#58ff8c');
        for (let i = 0; i < 4; i++) {
          const y = 26 + i * 22, sel = launcher === i;
          panel(ctx, 4, y, 150, 20, sel ? '#1a3a20' : '#0a1a10');
          text(ctx, 'TUBE ' + (i + 1), 8, y + 3, sel ? '#ffc83c' : '#58ff8c');
          // torpedo glyph
          if (O.tubes[i]) { ctx.fillStyle = '#7ad0ff'; ctx.fillRect(60, y + 6, 60, 6); ctx.fillRect(120, y + 7, 4, 4); ctx.fillStyle = '#3a6a8a'; ctx.fillRect(56, y + 4, 4, 10); text(ctx, 'MK48', 128, y + 6, '#7ad0ff'); }
          else if (O.reload[i] > 0) { ctx.fillStyle = '#223'; ctx.fillRect(60, y + 6, 60, 6); ctx.fillStyle = '#ffb030'; ctx.fillRect(60, y + 6, 60 * (1 - O.reload[i] / 30), 6); text(ctx, 'LOAD', 124, y + 6, '#ffb030'); }
          else text(ctx, 'EMPTY', 60, y + 6, '#605040');
          if (sel) text(ctx, 'READY: SPACE', 8, y + 12, (frame >> 4) & 1 ? '#ffc83c' : '#806020');
        }
        const sel4 = launcher === 4;
        panel(ctx, 4, 116, 150, 40, sel4 ? '#1a3a20' : '#0a1a10');
        text(ctx, 'VLS LAND ATTACK', 8, 119, sel4 ? '#ffc83c' : '#58ff8c');
        for (let i = 0; i < 12; i++) { ctx.fillStyle = i < O.tlam ? '#ffb030' : '#302010'; ctx.fillRect(8 + (i % 6) * 12, 130 + Math.floor(i / 6) * 11, 9, 8); }
        text(ctx, box ? 'TASKED' : 'NO TASKING', 84, 132, box ? '#ffb030' : '#605040');
        if (box) text(ctx, dst(O.x, O.y, box.x, box.y) <= box.r ? 'IN BOX' : 'OUT OF BOX', 84, 142, dst(O.x, O.y, box.x, box.y) <= box.r ? '#80ff80' : '#ff7050');
        text(ctx, 'MK48 RESERVE ' + O.mk48 + '   DECOYS ' + O.cm + '   TLAM AIRBORNE ' + tlams.length, 4, 162, '#a8ffb8');
        text(ctx, 'TARGET: ' + (trackSel ? trackSel.id + ' SOL ' + Math.round(trackSel.q * 100) + '%' : 'NONE (USE SONAR)'), 4, 174, '#ffc83c');
        // wire panel
        panel(ctx, 160, 26, 156, 130);
        text(ctx, 'WIRE GUIDANCE', 166, 29, '#58ff8c');
        const mine = torps.filter(t => t.own);
        if (!mine.length) text(ctx, 'NO WEAPONS RUNNING', 166, 44, '#3a8a50');
        const wired = mine.filter(t => t.wire), ws = wired.length ? wired[wireSel % wired.length] : null;
        mine.slice(0, 5).forEach((t, i) => {
          const y = 42 + i * 22, s = t === ws;
          text(ctx, (s ? '>' : ' ') + t.id + ' ' + (t.run / 1000).toFixed(1) + 'KYD ' + (t.wire ? 'WIRE' : 'CUT'), 164, y, s ? '#ffc83c' : '#a8ffb8');
          text(ctx, ' ' + (t.st === 'run' ? (t.manual ? 'MANUAL ' : 'AUTO ') + 'CRS ' + p3(deg(t.ord)) : t.st === 'search' ? 'SEEKER SEARCH' : 'HOMING!'), 164, y + 9, t.st === 'home' ? '#ff9070' : '#3a8a50');
        });
        text(ctx, 'L/R STEER  ENTER NEXT', 166, 146, '#3a8a50');
      }
      function bar(ctx, x, y, w, v, col) { ctx.fillStyle = '#020604'; ctx.fillRect(x, y, w, 5); ctx.fillStyle = col; ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * clamp(v, 0, 1)), 3); }
      function drawHUD(ctx) {
        ctx.fillStyle = '#0a120e'; ctx.fillRect(0, VH, W, H - VH);
        ctx.fillStyle = '#1e4a2c'; ctx.fillRect(0, VH, W, 1);
        const y = VH + 3;
        text(ctx, 'CRS ' + p3(deg(O.hdg)), 3, y, '#a8ffb8');
        text(ctx, 'SPD ' + String(Math.round(O.spd)).padStart(2, '0') + '>' + String(SPEEDS[O.ord]).padStart(2, '0') + 'KT', 56, y, O.spd > 20 ? '#ffb030' : '#a8ffb8');
        text(ctx, 'DEPTH ' + String(Math.round(O.depth)).padStart(4, '0') + '>' + String(O.dOrd).padStart(4, '0'), 138, y, O.depth > 1300 ? '#ff5040' : '#a8ffb8');
        text(ctx, 'LYR ' + layer, 268, y, O.depth > layer ? '#7ad0ff' : '#3a8a50');
        text(ctx, 'HULL', 3, y + 10, '#3a8a50'); bar(ctx, 30, y + 11, 44, O.hull / 100, O.hull > 50 ? '#58ff8c' : '#ff5040');
        text(ctx, 'ARRAY ' + (O.array >= 1 ? 'OUT' : O.arrayOrd ? Math.round(O.array * 100) + '%' : 'IN'), 80, y + 10, O.array >= 1 ? '#58ff8c' : '#3a8a50');
        text(ctx, 'MK48 ' + (O.tubes.reduce((a, b) => a + b, 0) + O.mk48), 152, y + 10, '#7ad0ff');
        text(ctx, 'TLAM ' + O.tlam, 206, y + 10, '#ffb030');
        text(ctx, 'CM ' + O.cm, 260, y + 10, '#c0c0ff');
        text(ctx, 'OBJ ' + objs.map(o => (o.k === 'tlam' ? 'STRIKE ' : 'SINK ' + o.w.map(w => KINDS[w].cls).join('/') + ' ') + Math.min(o.n, o.done) + '/' + o.n).join('  '), 3, y + 21, objs.every(o => o.done >= o.n) ? '#80ff80' : '#ffc83c');
        text(ctx, 'SCORE ' + score, 3, y + 32, '#a8ffb8');
        text(ctx, 'BOATS ' + lives, 110, y + 32, '#a8ffb8');
        text(ctx, 'MSN ' + (mIdx + 1), 170, y + 32, '#a8ffb8');
        const threat = torps.some(t => !t.own && dst(t.x, t.y, O.x, O.y) < 12000);
        if (threat && (frame >> 3) & 1) text(ctx, 'TORPEDO!', 316, y + 32, '#ff4040', 1, 'right');
      }
      function drawTabs(ctx) {
        ctx.fillStyle = '#020604'; ctx.fillRect(0, 0, W, 11);
        STATIONS.forEach((s, i) => { const sel = station === s; ctx.fillStyle = sel ? '#1e6a38' : '#0a1a10'; ctx.fillRect(i * 80 + 1, 1, 78, 9); text(ctx, (i + 1) + ' ' + ST_NAMES[i], i * 80 + 40, 2, sel ? '#e8ffe8' : '#3a8a50', 1, 'center'); });
      }
      function drawMsgs(ctx) {
        let y = station === 'sonar' ? 40 : 30;
        for (const m of msgs) { const w = m.s.length * 6 + 6; ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(160 - w / 2, y - 2, w, 11); text(ctx, m.s, 160, y, m.col, 1, 'center'); y += 12; }
      }
      function drawSubSide(ctx, x, y, s, col) {
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.ellipse ? ctx.ellipse(x, y, 90 * s, 9 * s, 0, 0, TAU) : ctx.rect(x - 90 * s, y - 9 * s, 180 * s, 18 * s); ctx.fill();
        ctx.fillRect(x + 20 * s, y - 24 * s, 26 * s, 16 * s); ctx.fillRect(x + 14 * s, y - 16 * s, 40 * s, 3 * s);
        ctx.fillRect(x + 30 * s, y - 34 * s, 2 * s, 10 * s); ctx.fillRect(x + 36 * s, y - 30 * s, 2 * s, 6 * s);
        ctx.beginPath(); ctx.moveTo(x - 86 * s, y); ctx.lineTo(x - 104 * s, y - 14 * s); ctx.lineTo(x - 100 * s, y); ctx.lineTo(x - 104 * s, y + 14 * s); ctx.closePath(); ctx.fill();
      }
      function drawTitle(ctx) {
        for (let y = 0; y < H; y += 8) { ctx.fillStyle = 'rgb(' + (2) + ',' + (10 + y / 12 | 0) + ',' + (20 + y / 5 | 0) + ')'; ctx.fillRect(0, y, W, 8); }
        // sweeping sonar ring
        const a = api.time * 1.2;
        ctx.strokeStyle = '#0e3a20'; for (const r of [30, 60, 90]) { ctx.beginPath(); ctx.arc(160, 140, r, 0, TAU); ctx.stroke(); }
        ctx.strokeStyle = '#58ff8c'; ctx.beginPath(); ctx.moveTo(160, 140); ctx.lineTo(160 + Math.sin(a) * 90, 140 - Math.cos(a) * 90); ctx.stroke();
        for (let i = 0; i < 5; i++) { const b = i * 1.3 + 0.4, r = 40 + i * 9, fade = (wrap(a - b) + TAU) % TAU; if (fade < 2) { ctx.fillStyle = 'rgba(88,255,140,' + (1 - fade / 2).toFixed(2) + ')'; ctx.fillRect(160 + Math.sin(b) * r - 1, 140 - Math.cos(b) * r - 1, 3, 3); } }
        drawSubSide(ctx, 160 + Math.sin(api.time * 0.3) * 6, 140, 0.9, '#071a0e');
        text(ctx, '688(I)', W / 2, 14, '#000', 4, 'center'); text(ctx, '688(I)', W / 2 - 1, 13, '#58ff8c', 4, 'center');
        text(ctx, 'HUNTER/KILLER', W / 2, 46, '#ffb030', 2, 'center');
        const page = Math.floor(modeT / 7) % 3;
        if (page === 0) { text(ctx, 'LATE COLD WAR ATTACK SUBMARINE COMMAND', W / 2, 66, '#a8ffb8', 1, 'center'); text(ctx, 'HIGH SCORE ' + hi, W / 2, 78, '#ffc83c', 1, 'center'); }
        else if (page === 1) { ['LISTEN ON SONAR, DESIGNATE TRACKS,', 'MANEUVER TO SOLVE TMA, THEN FIRE.', 'X CHANGES STATION. HOLD X FOR DEPTH.'].forEach((s, i) => text(ctx, s, W / 2, 64 + i * 10, '#a8ffb8', 1, 'center')); }
        else { text(ctx, 'SSN 3000  SSK 2500  DDG 2000', W / 2, 64, '#a8ffb8', 1, 'center'); text(ctx, 'FFG 1500  STRIKE 1000', W / 2, 74, '#a8ffb8', 1, 'center'); text(ctx, 'NEUTRAL MERCHANT -2000', W / 2, 84, '#ff7050', 1, 'center'); }
        const blink = (frame >> 5) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 200, '#fff', 1, 'center'); }
        else if (api.credits > 0) { if (blink) text(ctx, 'PUSH START', W / 2, 200, '#fff', 1, 'center'); }
        else if (blink) text(ctx, 'INSERT COIN', W / 2, 200, '#fff', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, 228, '#3a8a50');
        text(ctx, "\u00a9 1997 JANE'S COMBAT SIMULATIONS", W - 4, 228, '#3a8a50', 1, 'right');
      }
      function drawBrief(ctx) {
        ctx.fillStyle = '#04100a'; ctx.fillRect(0, 0, W, H);
        panel(ctx, 12, 12, 296, 216);
        text(ctx, 'MISSION ' + (mIdx + 1) + ': ' + mission.n, W / 2, 22, '#ffc83c', 1, 'center');
        if (round) text(ctx, 'THREAT LEVEL ' + (round + 1), W / 2, 34, '#ff7050', 1, 'center');
        mission.txt.forEach((s, i) => text(ctx, s, 24, 50 + i * 12, '#a8ffb8'));
        text(ctx, 'OBJECTIVES', 24, 100, '#58ff8c');
        objs.forEach((o, i) => text(ctx, '- ' + (o.k === 'tlam' ? 'LAND ATTACK HITS: ' + o.n : 'SINK ' + o.n + ' ' + o.w.map(w => KINDS[w].nm).join(' OR ')), 30, 112 + i * 10, '#e8ffe8'));
        text(ctx, 'LAYER ' + layer + ' FT   ' + (night ? 'NIGHT' : 'DAY') + '   LOADOUT 22 MK48, 12 TLAM, 10 CM', 24, 150, '#3a8a50');
        drawSubSide(ctx, 230, 190, 0.35, '#1e4a2c');
        if ((frame >> 5) & 1) text(ctx, 'PRESS SPACE TO TAKE THE CONN', W / 2, 212, '#ffffff', 1, 'center');
      }
      function drawDebrief(ctx) {
        ctx.fillStyle = '#04100a'; ctx.fillRect(0, 0, W, H);
        const ok = failWhy.indexOf('FAILED') < 0;
        text(ctx, ok ? 'MISSION COMPLETE' : 'MISSION FAILED', W / 2, 40, ok ? '#80ff80' : '#ff6050', 2, 'center');
        text(ctx, mission.n, W / 2, 64, '#ffc83c', 1, 'center');
        text(ctx, failWhy, W / 2, 84, '#a8ffb8', 1, 'center');
        if (!ok) text(ctx, 'BOAT REARMED - TRY AGAIN', W / 2, 100, '#a8ffb8', 1, 'center');
        text(ctx, 'SCORE ' + score, W / 2, 130, '#e8ffe8', 2, 'center');
        if (modeT > 2 && (frame >> 5) & 1) text(ctx, 'PRESS SPACE', W / 2, 200, '#fff', 1, 'center');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { drawTitle(ctx); return; }
        if (mode === 'brief') { drawBrief(ctx); return; }
        if (mode === 'debrief') { drawDebrief(ctx); return; }
        ctx.save();
        if (shake > 0) ctx.translate(Math.round(rnd(-1, 1) * shake * 0.4), Math.round(rnd(-1, 1) * shake * 0.4));
        if (station === 'sonar') drawSonar(ctx);
        else if (station === 'tma') drawTMA(ctx);
        else if (station === 'scope') drawScope(ctx);
        else drawWeapons(ctx);
        ctx.restore();
        drawTabs(ctx);
        if (alarmT > 0 && (frame >> 3) & 1) { ctx.fillStyle = 'rgba(255,0,0,0.18)'; ctx.fillRect(0, 11, W, VH - 11); }
        if (mode === 'lost' || mode === 'wait' || mode === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,' + (mode === 'lost' ? Math.min(0.85, lostT * 0.3) : 0.85).toFixed(2) + ')'; ctx.fillRect(0, 0, W, VH);
          text(ctx, mode === 'over' ? 'GAME OVER' : 'HULL BREACHED', W / 2, 80, mode === 'over' ? '#fff' : '#ff5040', 2, 'center');
          if (mode === 'over') text(ctx, 'FINAL SCORE ' + score, W / 2, 104, '#ffc83c', 1, 'center');
        }
        drawMsgs(ctx);
        drawHUD(ctx);
      }
      function debug() { return { layer, mode, O, ents, tracks, torps, trackSel, station, objs, mIdx, score, lives, box, cursor, failWhy, arrView, signal, est }; }
      return { update, render, destroy() { }, debug };
    }
  });
})();
