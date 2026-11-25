// 688 Attack Sub (Electronic Arts, 1989) -- arcade-friendly, from-scratch take on the PC submarine sim.
// Top-down tactical plot of your Los Angeles-class boat, passive sonar contacts that firm up from
// unknown to classified, speed / depth / heading orders (more speed = more noise), a thermal layer to
// hide under, a periscope station at shallow depth, wire-guided torpedoes, enemy destroyers and subs
// hunting you with active pings, depth charges and homing torpedoes, and noisemakers to decoy them.
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
    '#': [10, 31, 10, 10, 10, 31, 10], '%': [25, 26, 2, 4, 8, 11, 19]
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
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const D2R = Math.PI / 180;
  const norm = a => ((a % 360) + 360) % 360;
  const adiff = (a, b) => { let d = norm(a - b); if (d > 180) d -= 360; return d; };   // a - b in -180..180
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const brg = (from, tx, ty) => norm(Math.atan2(tx - from.x, -(ty - from.y)) / D2R);
  const pad = (n, k) => String(Math.max(0, Math.round(n))).padStart(k, '0');

  ArcadeRegistry.register({
    id: 'sub688', title: '688 Attack Sub', year: 1989, maker: 'Electronic Arts',
    width: 320, height: 240, vector: false, pointer: true,
    controls: 'Left/Right: rudder (scope: train) \u00b7 Up/Down: change selected order \u00b7 Enter: next order (SPEED/DEPTH/TARGET/SCOPE) \u00b7 Space: fire torpedo \u00b7 X: noisemaker \u00b7 Z: zoom \u00b7 Mouse: click plot/buttons',
    marquee: { bg: '#001820', fg: '#30ff90', accent: '#ffb020' },
    create(api) {
      const W = 320, H = 240, MX = 0, MY = 12, MW = 232, MH = 228, PX = 232;
      const MCX = MX + MW / 2, MCY = MY + MH / 2;
      const TC = 12, KT = 0.5626, SDT = TC / 60;
      const SPEEDS = [0, 5, 10, 15, 20, 25, 32];
      const DEPTHS = [60, 100, 150, 200, 250, 300, 400, 500, 600, 800];
      const PERI = 60, ZOOMS = [25, 50, 100];
      const FOCI = ['SPEED', 'DEPTH', 'TARGET', 'SCOPE'];
      const TYPES = {
        merchant: { name: 'MERCHANT', cls: 'MERCH', noise: 1.0, surf: true, pts: 500, hp: 1, len: 160, sens: 0, color: '#e8e060' },
        tanker: { name: 'TANKER', cls: 'TANKR', noise: 1.1, surf: true, pts: 700, hp: 2, len: 220, sens: 0, color: '#e8e060' },
        dd: { name: 'DESTROYER', cls: 'DD', noise: 1.25, surf: true, pts: 1000, hp: 1, len: 130, sens: 1.0, color: '#ff5050' },
        cg: { name: 'CRUISER', cls: 'CG', noise: 1.4, surf: true, pts: 2500, hp: 2, len: 190, sens: 0.8, color: '#ff5050' },
        ss: { name: 'ATTACK SUB', cls: 'SSN', noise: 0.5, surf: false, pts: 1500, hp: 1, len: 110, sens: 1.3, color: '#ff5050' }
      };
      const MISSIONS = [
        { name: 'FIRST PATROL', brief: ['A LONE FREIGHTER IS CARRYING', 'SUPPLIES ACROSS YOUR SECTOR.', 'TRACK IT ON SONAR AND SINK IT.', 'NO ESCORTS REPORTED.'],
          layer: 300, torps: 8, decoys: 4, need: 1,
          setup(add) { add('merchant', 2600, -8500, 95, 7, { obj: true, mode: 'course' }); } },
        { name: 'CONVOY RUN', brief: ['A CONVOY OF THREE FREIGHTERS', 'WITH ONE DESTROYER ESCORT.', 'SINK AT LEAST TWO SHIPS.', 'STAY QUIET - USE THE LAYER.'],
          layer: 250, torps: 10, decoys: 5, need: 2,
          setup(add) {
            const L = add('merchant', -5200, -10500, 100, 8, { obj: true, mode: 'course' });
            add('merchant', -5800, -9600, 100, 8, { obj: true, mode: 'escort', leader: L, ox: -700, oy: 800 });
            add('merchant', -4500, -9500, 100, 8, { obj: true, mode: 'escort', leader: L, ox: 600, oy: 900 });
            add('dd', -4000, -11500, 100, 12, { mode: 'escort', leader: L, ox: 1400, oy: -1200 });
          } },
        { name: 'SILENT HUNTER', brief: ['AN ENEMY ATTACK SUB IS', 'PATROLLING THIS AREA. IT IS', 'HIDING BELOW THE LAYER. DIVE', 'DEEP TO HEAR IT AND SINK IT.'],
          layer: 280, torps: 10, decoys: 6, need: 1,
          setup(add) { add('ss', 3500, -10500, 270, 6, { obj: true, mode: 'hunt', cx: 1500, cy: -9500 }); } },
        { name: 'BREAKOUT', brief: ['TWO DESTROYERS AND A SUB', 'GUARD A BARRIER LINE. SLIP', 'THROUGH TO THE EXIT ZONE', 'NORTH. KILLS ARE OPTIONAL.'],
          layer: 300, torps: 8, decoys: 6, goal: 'reach', zone: { x: 0, y: -17000, r: 1600 },
          setup(add) {
            add('dd', -4500, -8000, 90, 12, { mode: 'barrier', ax: -5000, ay: -8000, bx: 1000, by: -8000 });
            add('dd', 4500, -8800, 270, 12, { mode: 'barrier', ax: 5000, ay: -8800, bx: -1000, by: -8800 });
            add('ss', 0, -12500, 90, 5, { mode: 'hunt', cx: 0, cy: -12500 });
          } },
        { name: 'TASK FORCE', brief: ['AN ENEMY CRUISER, TWO', 'DESTROYERS AND A SUB ARE', 'HEADING WEST. SINK THE', 'CRUISER - IT TAKES TWO HITS.'],
          layer: 260, torps: 12, decoys: 8, need: 1,
          setup(add) {
            const L = add('cg', 6000, -11000, 265, 11, { obj: true, mode: 'course' });
            add('dd', 6000, -12600, 265, 11, { mode: 'escort', leader: L, ox: 300, oy: -1600 });
            add('dd', 5800, -9300, 265, 11, { mode: 'escort', leader: L, ox: -300, oy: 1700 });
            add('ss', 3000, -11000, 265, 6, { mode: 'escort', leader: L, ox: -2600, oy: 200 });
          } }
      ];

      // ---------- state ----------
      let state = 'attract', stateT = 0, attractT = 0, coinFlash = 0;
      let score = 0, hi = api.getHiScore(25000), boats = 3, mi = 0, tier = 0;
      let P = null, ens = [], torps = [], decoys = [], pings = [], dcs = [], wrecks = [], booms = [];
      let mission = null, focus = 0, zoom = 1, selected = null, contactNum = 0, scope = false;
      let msgs = [], alarmT = 0, shake = 0, simT = 0, stealth = true, failReason = '', bonusLines = [];
      let sweep = 0, lastMouse = { x: 0, y: 0 };

      function say(s, col) { msgs.push({ s, t: 300, col: col || '#80ffb0' }); if (msgs.length > 3) msgs.shift(); }
      function addScore(n) { score += n; if (score > hi) hi = score; }

      // ---------- sound ----------
      const snd = {
        ping(vol) { api.audio.tone(1550, 0.7, { type: 'sine', vol: vol }); api.audio.tone(1550, 0.5, { type: 'sine', vol: vol * 0.35, delay: 0.45 }); },
        launch() { api.audio.noise(0.6, { vol: 0.16, freq: 600, slideTo: 120 }); api.audio.tone(180, 0.5, { type: 'triangle', vol: 0.1, slideTo: 60 }); },
        contact() { api.audio.tone(880, 0.06, { type: 'square', vol: 0.08 }); api.audio.tone(1175, 0.08, { type: 'square', vol: 0.08, delay: 0.08 }); },
        alarm() { api.audio.tone(880, 0.12, { type: 'square', vol: 0.1 }); api.audio.tone(620, 0.12, { type: 'square', vol: 0.1, delay: 0.14 }); },
        boom(v) { api.audio.noise(1.4, { vol: v || 0.25, freq: 500, slideTo: 40 }); api.audio.tone(60, 1, { type: 'sine', vol: 0.15, slideTo: 25 }); },
        decoy() { api.audio.noise(0.8, { vol: 0.1, freq: 3000, type: 'bandpass', slideTo: 600 }); },
        click() { api.audio.tone(1200, 0.025, { type: 'square', vol: 0.06 }); },
        creak() { api.audio.tone(70, 0.9, { type: 'sawtooth', vol: 0.08, slideTo: 45 }); }
      };

      // ---------- mission setup ----------
      function startMission() {
        mission = MISSIONS[mi % MISSIONS.length];
        tier = Math.floor(mi / MISSIONS.length);
        P = { x: 0, y: 0, hdg: 0, ordHdg: 0, spd: 10, ordSpd: 2, depth: 150, ordDepth: 2, hull: 100,
          torps: mission.torps, decoys: mission.decoys, tubes: [0, 0, 0, 0], scopeBrg: 0, decoyCD: 0 };
        ens = []; torps = []; decoys = []; pings = []; dcs = []; wrecks = []; booms = []; msgs = [];
        selected = null; contactNum = 0; focus = 0; scope = false; stealth = true; simT = 0; alarmT = 0;
        let id = 0;
        mission.setup((type, x, y, hdg, spd, o) => {
          const T = TYPES[type];
          const e = { id: id++, type, T, x, y, hdg, spd, baseSpd: spd + tier * 1.5, ordSpd: spd, depth: T.surf ? 0 : (mission.layer + 120), hp: T.hp, alive: true,
            mode: o.mode, state: 'patrol', det: 0, ex: 0, ey: 0, estT: 0, torpCD: rnd(20, 40), dcCD: 0, pingCD: rnd(5, 15), decoyCD: 0,
            obj: !!o.obj, leader: o.leader || null, ox: o.ox || 0, oy: o.oy || 0, ax: o.ax, ay: o.ay, bx: o.bx, by: o.by, leg: 0,
            cx: o.cx, cy: o.cy, wx: x, wy: y, zigT: rnd(30, 60), heardTorp: false, baseH: hdg, zigH: hdg,
            c: { q: 0, ex: x, ey: y, err: 2000, num: 0, cls: false, updT: 0, lost: 0 } };
          if (o.obj) { e.c.q = 0.3; e.c.err = 2500; e.c.ex = x + rnd(-1200, 1200); e.c.ey = y + rnd(-1200, 1200); e.c.lost = 30; }
          ens.push(e); return e;
        });
        state = 'brief'; stateT = 0;
      }
      function newGame() { score = 0; boats = 3; mi = 0; startMission(); api.audio.melody([[262, .12], [330, .12], [392, .12], [523, .3]], { type: 'triangle', vol: .14 }); }
      function tryStart() {
        if (api.useCredit()) { newGame(); return; }
        coinFlash = 90; api.audio.tone(80, 0.25, { type: 'square', vol: 0.2 });
      }

      // ---------- helpers ----------
      const layer = () => mission.layer;
      function crosses(d1, d2) { const L = layer(); return (d1 < L) !== (d2 < L); }
      function playerNoise() {
        let n = 0.22 + P.spd / 32 * 0.85;
        if (P.spd >= 20 && P.depth < 300) n += 0.35;     // cavitation near the surface
        if (scope && P.depth <= PERI + 5) n += 0.1;
        return n;
      }
      function cavitating() { return P.spd >= 20 && P.depth < 300; }
      function contacts() { return ens.filter(e => e.alive && e.c.q > 0.15); }
      function steer(o, tgtHdg, rate) {
        const d = adiff(tgtHdg, o.hdg);
        o.hdg = norm(o.hdg + clamp(d, -rate * SDT, rate * SDT));
      }
      function move(o, kts) { o.x += Math.sin(o.hdg * D2R) * kts * KT * SDT; o.y -= Math.cos(o.hdg * D2R) * kts * KT * SDT; }

      // ---------- player orders ----------
      function fireTorpedo(target) {
        if (state !== 'play') return;
        const tube = P.tubes.findIndex(t => t <= 0);
        if (P.torps <= 0) { say('NO TORPEDOES REMAINING', '#ff8060'); snd.click(); return; }
        if (tube < 0) { say('ALL TUBES RELOADING', '#ffb060'); snd.click(); return; }
        let tg = target || selected;
        if (!tg || !tg.alive || tg.c.q <= 0.15) {
          let best = null, bd = 1e9;
          for (const e of contacts()) { const d = Math.hypot(e.c.ex - P.x, e.c.ey - P.y) - (e.obj ? 1500 : 0); if (d < bd) { bd = d; best = e; } }
          tg = best;
        }
        if (tg) selected = tg;
        const h = tg ? brg(P, tg.c.ex, tg.c.ey) : P.hdg;
        P.torps--; P.tubes[tube] = 45;
        torps.push({ side: 'p', x: P.x + Math.sin(P.hdg * D2R) * 40, y: P.y - Math.cos(P.hdg * D2R) * 40, hdg: h, spd: 50, run: 0, range: 15000,
          wire: true, guide: tg, lock: null, num: 1 + (torps.length % 9), trail: [] });
        say('TUBE ' + (tube + 1) + ' FIRED' + (tg ? ' AT S' + tg.c.num : '') + ', WIRE GUIDED');
        snd.launch();
        for (const e of ens) if (e.alive && e.T.sens > 0 && dist(e, P) < 7000) { e.det = Math.min(1.2, e.det + 0.25); e.ex = P.x + rnd(-800, 800); e.ey = P.y + rnd(-800, 800); }
      }
      function dropDecoy() {
        if (state !== 'play') return;
        if (P.decoys <= 0) { say('NO NOISEMAKERS LEFT', '#ff8060'); return; }
        if (P.decoyCD > 0) return;
        P.decoys--; P.decoyCD = 6;
        decoys.push({ side: 'p', x: P.x - Math.sin(P.hdg * D2R) * 60, y: P.y + Math.cos(P.hdg * D2R) * 60, depth: P.depth, life: 45 });
        say('NOISEMAKER AWAY'); snd.decoy();
      }
      function cycleTarget(dir) {
        const cs = contacts().sort((a, b) => a.c.num - b.c.num);
        if (!cs.length) { selected = null; return; }
        let i = cs.indexOf(selected);
        i = i < 0 ? 0 : (i + dir + cs.length) % cs.length;
        selected = cs[i]; snd.click();
      }
      function setFocus(f) {
        focus = f; snd.click();
        scope = FOCI[f] === 'SCOPE';
        if (scope) { P.scopeBrg = selected && selected.alive ? brg(P, selected.c.ex, selected.c.ey) : P.hdg; if (P.depth > PERI + 5) say('COME TO PERISCOPE DEPTH (60 FT)', '#ffb060'); }
      }
      function adjust(dir) {   // dir -1 = up arrow
        const f = FOCI[focus];
        if (f === 'SPEED' || f === 'SCOPE') { P.ordSpd = clamp(P.ordSpd - dir, 0, SPEEDS.length - 1); snd.click(); }
        else if (f === 'DEPTH') { P.ordDepth = clamp(P.ordDepth + dir, 0, DEPTHS.length - 1); snd.click(); }
        else if (f === 'TARGET') cycleTarget(-dir);
      }

      // ---------- input ----------
      const BTN = {
        focus: [0, 1, 2, 3].map(i => ({ x: PX + 3, y: 129 + i * 9, w: 82, h: 9 })),
        fire: { x: PX + 4, y: 170, w: 80, h: 18 }, decoy: { x: PX + 4, y: 192, w: 80, h: 18 },
        zoomb: { x: PX + 4, y: 214, w: 38, h: 18 }, up: { x: PX + 46, y: 214, w: 18, h: 18 }, dn: { x: PX + 66, y: 214, w: 18, h: 18 }
      };
      const inside = (b, x, y) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
      function fireAction() {
        if (scope && P.depth <= PERI + 5) {
          let best = null, bd = 4;
          for (const e of ens) if (e.alive && e.T.surf && dist(e, P) < 11000) { const d = Math.abs(adiff(brg(P, e.x, e.y), P.scopeBrg)); if (d < bd) { bd = d; best = e; } }
          fireTorpedo(best);
        } else fireTorpedo(null);
      }
      function controls() {
        const turn = 1.4;
        if (scope) {
          if (api.key('ArrowLeft')) P.scopeBrg = norm(P.scopeBrg - 0.8);
          if (api.key('ArrowRight')) P.scopeBrg = norm(P.scopeBrg + 0.8);
        } else {
          if (api.key('ArrowLeft')) P.ordHdg = norm(P.ordHdg - turn);
          if (api.key('ArrowRight')) P.ordHdg = norm(P.ordHdg + turn);
        }
        if (api.pressed('ArrowUp')) adjust(-1);
        if (api.pressed('ArrowDown')) adjust(1);
        if (api.pressed('Enter')) setFocus((focus + 1) % FOCI.length);
        if (api.pressed('Space')) fireAction();
        if (api.pressed('KeyX')) dropDecoy();
        if (api.pressed('KeyZ')) { zoom = (zoom + 1) % ZOOMS.length; snd.click(); }
        const m = api.mouse;
        if (m.clicked) {
          if (m.x >= PX) {
            for (let i = 0; i < 4; i++) if (inside(BTN.focus[i], m.x, m.y)) setFocus(i);
            if (inside(BTN.fire, m.x, m.y)) fireAction();
            if (inside(BTN.decoy, m.x, m.y)) dropDecoy();
            if (inside(BTN.zoomb, m.x, m.y)) { zoom = (zoom + 1) % ZOOMS.length; snd.click(); }
            if (inside(BTN.up, m.x, m.y)) adjust(-1);
            if (inside(BTN.dn, m.x, m.y)) adjust(1);
          } else if (m.y >= MY) {
            if (scope) { P.scopeBrg = norm(P.scopeBrg + (m.x - MCX) / 5.4); }
            else {
              const sc = ZOOMS[zoom];
              let hit = null, hd = 9;
              for (const e of contacts()) {
                const sx = MCX + (e.c.ex - P.x) / sc, sy = MCY + (e.c.ey - P.y) / sc;
                const d = Math.hypot(sx - m.x, sy - m.y); if (d < hd) { hd = d; hit = e; }
              }
              if (hit) { selected = hit; snd.click(); }
              else { P.ordHdg = norm(Math.atan2(m.x - MCX, -(m.y - MCY)) / D2R); snd.click(); }
            }
          }
        }
      }

      // ---------- simulation ----------
      function updatePlayer() {
        let maxS = SPEEDS[P.ordSpd];
        if (P.hull < 50) maxS = Math.min(maxS, 20);
        P.spd += clamp(maxS - P.spd, -0.7 * SDT, 0.5 * SDT);
        const rate = 3 * clamp(P.spd / 10, 0.3, 1.3);
        steer(P, P.ordHdg, rate);
        const tD = DEPTHS[P.ordDepth];
        P.depth += clamp(tD - P.depth, -4 * SDT, 4 * SDT);
        move(P, P.spd);
        for (let i = 0; i < 4; i++) if (P.tubes[i] > 0) P.tubes[i] -= SDT;
        if (P.decoyCD > 0) P.decoyCD -= SDT;
        if (scope && P.depth > PERI + 5 && FOCI[focus] === 'SCOPE' && (api.frame % 240 === 0)) say('TOO DEEP FOR PERISCOPE', '#ffb060');
      }

      function sonar() {
        const pn = playerNoise();
        for (const e of ens) {
          if (!e.alive) continue;
          const d = Math.max(50, dist(e, P)), c = e.c;
          // ---- we hear them ----
          let sig = e.T.noise * (0.5 + e.spd / 20) * 7000 / d;
          if (crosses(P.depth, e.depth)) sig *= 0.38;
          if (P.spd > 20) sig *= 0.55; if (P.spd > 27) sig *= 0.6;
          if (sig > 1) {
            c.q = Math.min(1, c.q + SDT * 0.03 * Math.min(3, sig));
            c.err = clamp(1800 / (sig * (0.3 + c.q)), 60, 2200);
            c.lost = 0;
            c.updT -= SDT;
            if (c.updT <= 0) { c.updT = 2; const a = rnd(0, 6.283), r = rnd(0, c.err * 0.6); c.ex = e.x + Math.cos(a) * r; c.ey = e.y + Math.sin(a) * r; }
          } else { c.q = Math.max(0, c.q - SDT * (c.lost > 240 ? 0.004 : 0.0006)); c.lost += SDT; }
          // periscope: surface ships in view are identified exactly
          if (scope && P.depth <= PERI + 5 && e.T.surf && d < 11000 && Math.abs(adiff(brg(P, e.x, e.y), P.scopeBrg)) < 21) {
            c.q = 1; c.cls = true; c.ex = e.x; c.ey = e.y; c.err = 40; c.lost = 0;
          }
          if (c.q > 0.15 && !c.num) { c.num = ++contactNum; say((c.lost > 0 ? 'INTEL: TARGET AREA S' : 'SONAR: NEW CONTACT S') + c.num + ' BRG ' + pad(brg(P, c.ex, c.ey), 3)); snd.contact(); }
          if (c.q > 0.55 && !c.cls) { c.cls = true; say('S' + c.num + ' CLASSIFIED ' + e.T.name, '#ffe080'); snd.contact(); }
          // ---- they hear us ----
          if (e.T.sens > 0) {
            let s2 = pn * e.T.sens * (1 + tier * 0.15) * 3600 / d;
            if (crosses(P.depth, e.depth)) s2 *= 0.33;
            if (e.spd > 18) s2 *= 0.5;
            if (scope && P.depth <= PERI + 5 && e.T.surf && d < 6000) s2 += 1.1;
            if (s2 > 1) {
              e.det = Math.min(1.2, e.det + SDT * 0.022 * Math.min(3, s2));
              e.estT -= SDT;
              if (e.estT <= 0) { e.estT = 3; const err = 1700 * (1.15 - Math.min(1, e.det)) + 120; e.ex = P.x + rnd(-err, err); e.ey = P.y + rnd(-err, err); }
            } else e.det = Math.max(0, e.det - SDT * 0.004);
          }
        }
      }

      function enemyFire(e) {
        const h = brg(e, e.ex, e.ey);
        torps.push({ side: 'e', x: e.x, y: e.y, hdg: h, spd: e.type === 'ss' ? 45 : 40, run: 0, range: e.type === 'ss' ? 10000 : 7500,
          fx: e.ex, fy: e.ey, lock: null, depth: e.depth, seen: false, trail: [], searchT: 0, owner: e });
        e.torpCD = (e.type === 'ss' ? 120 : 90) / (1 + tier * 0.2);
      }

      function updateEnemies() {
        for (const e of ens) {
          if (!e.alive) continue;
          // alert state
          const was = e.state;
          if (e.T.sens > 0) {
            if (e.det > 0.75) e.state = 'attack'; else if (e.det > 0.3) e.state = 'search'; else if (e.det < 0.12) e.state = 'patrol';
            if (e.state === 'attack' && was !== 'attack') { stealth = false; if (dist(e, P) < 14000) { say((e.c.num ? 'S' + e.c.num : 'ENEMY') + ' HAS DETECTED US!', '#ff6060'); snd.alarm(); } }
          }
          // heard torpedoes?
          let threat = null;
          for (const t of torps) if (t.side === 'p' && Math.hypot(t.x - e.x, t.y - e.y) < 4500) threat = t;
          if (threat && !e.heardTorp) { e.heardTorp = true; if (e.T.sens > 0) { e.det = Math.max(e.det, 0.5); e.ex = P.x + rnd(-1500, 1500); e.ey = P.y + rnd(-1500, 1500); } }
          let tgtH = e.hdg, tgtS = e.baseSpd;
          if (threat && (e.T.sens === 0 || e.type === 'ss' || Math.hypot(threat.x - e.x, threat.y - e.y) < 2000)) {
            // evade
            tgtH = norm(brg(e, threat.x, threat.y) + 180 + (e.id % 2 ? 40 : -40)); tgtS = e.type === 'ss' ? 30 : e.type === 'dd' ? 28 : 15;
            if (e.type === 'ss' && e.decoyCD <= 0 && Math.hypot(threat.x - e.x, threat.y - e.y) < 2500) { decoys.push({ side: 'e', x: e.x, y: e.y, depth: e.depth, life: 40 }); e.decoyCD = 50; }
          } else if (e.state === 'attack' || e.state === 'search') {
            const de = Math.hypot(e.ex - e.x, e.ey - e.y);
            tgtH = brg(e, e.ex, e.ey);
            if (e.type === 'dd' || e.type === 'cg') tgtS = e.state === 'attack' ? (de > 2500 ? 24 : 15) : 14;
            else if (e.type === 'ss') { tgtS = de > 4500 ? 12 : 6; if (de < 3000) tgtH = norm(tgtH + 90); }
            else { tgtH = norm(brg(e, e.ex, e.ey) + 180); tgtS = 15; }
            if (e.state === 'attack' && e.torpCD <= 0 && torps.filter(t => t.owner === e).length < 2 && de < (e.type === 'ss' ? 6500 : 5000) && Math.hypot(P.x - e.x, P.y - e.y) > 600) enemyFire(e);
            if (e.type === 'dd' && e.state === 'attack' && de < 380 && e.dcCD <= 0) {
              const dg = crosses(e.depth, P.depth) && e.det < 1 ? rnd(100, 600) : P.depth + rnd(-130, 130);
              for (let k = 0; k < 3; k++) dcs.push({ x: e.x + rnd(-150, 150), y: e.y + rnd(-150, 150), depth: dg + k * 40 - 40, t: 4 + dg / 100 + k * 0.6 });
              e.dcCD = 35; if (dist(e, P) < 6000) say('DEPTH CHARGES IN THE WATER!', '#ff6060');
            }
          } else {
            if (e.mode === 'course') { e.zigT -= SDT; if (e.zigT <= 0) { e.zigT = rnd(40, 80); e.zigH = norm(e.baseH + rnd(-30, 30)); } tgtH = e.zigH; }
            else if (e.mode === 'escort' && e.leader && e.leader.alive) {
              const L = e.leader, c = Math.cos(L.hdg * D2R), s = Math.sin(L.hdg * D2R);
              const tx = L.x + e.ox * c - e.oy * s, ty = L.y + e.ox * s + e.oy * c;
              const dd = Math.hypot(tx - e.x, ty - e.y);
              tgtH = dd > 200 ? brg(e, tx, ty) : L.hdg; tgtS = clamp(L.spd + dd / 300, 0, 22);
            } else if (e.mode === 'barrier') {
              const tx = e.leg ? e.ax : e.bx, ty = e.leg ? e.ay : e.by;
              if (Math.hypot(tx - e.x, ty - e.y) < 400) e.leg ^= 1;
              tgtH = brg(e, tx, ty);
            } else if (e.mode === 'hunt') {
              if (Math.hypot(e.wx - e.x, e.wy - e.y) < 400 || e.zigT <= 0) { e.wx = e.cx + rnd(-4000, 4000); e.wy = e.cy + rnd(-3000, 3000); e.zigT = 120; }
              e.zigT -= SDT; tgtH = brg(e, e.wx, e.wy);
            } else if (e.mode === 'escort') { e.mode = 'course'; e.baseH = e.zigH = e.hdg; }
          }
          steer(e, tgtH, e.type === 'merchant' || e.type === 'tanker' || e.type === 'cg' ? 2 : 4);
          e.spd += clamp(tgtS - e.spd, -0.6 * SDT, 0.6 * SDT);
          if (e.type === 'ss') { const want = e.state === 'patrol' ? layer() + 120 : (P.depth < layer() ? layer() - 80 : layer() + 120); e.depth += clamp(want - e.depth, -3 * SDT, 3 * SDT); }
          move(e, e.spd);
          if (e.torpCD > 0) e.torpCD -= SDT; if (e.dcCD > 0) e.dcCD -= SDT; if (e.decoyCD > 0) e.decoyCD -= SDT;
          // active sonar
          if ((e.type === 'dd' || e.type === 'cg') && e.state !== 'patrol') {
            e.pingCD -= SDT;
            if (e.pingCD <= 0) {
              e.pingCD = rnd(14, 22) / (1 + tier * 0.15);
              const d = dist(e, P);
              pings.push({ x: e.x, y: e.y, r: 0, max: 9000 });
              if (d < 16000) snd.ping(clamp(0.12 - d / 160000, 0.02, 0.12));
              if (d < (crosses(e.depth, P.depth) ? 4200 : 9000)) { e.det = 1.15; e.ex = P.x + rnd(-80, 80); e.ey = P.y + rnd(-80, 80); }
              // their ping gives them away
              e.c.q = Math.max(e.c.q, 0.6); e.c.cls = e.c.cls || e.c.q > 0.55; e.c.ex = e.x + rnd(-150, 150); e.c.ey = e.y + rnd(-150, 150); e.c.err = 200;
            }
          }
        }
      }

      function damagePlayer(n, why) {
        if (state !== 'play') return;
        P.hull -= n; shake = 40; snd.boom(0.3); snd.creak();
        if (P.hull <= 0) {
          P.hull = 0; state = 'sunk'; stateT = 260; failReason = why;
          say('HULL BREACHED!', '#ff4040');
          api.audio.noise(3, { vol: 0.25, freq: 300, slideTo: 30, delay: 0.5 });
        } else say('HIT! ' + why + ' - HULL ' + Math.round(P.hull) + '%', '#ff6060');
      }
      function killEnemy(e) {
        e.hp--;
        if (e.hp > 0) { say((e.c.num ? 'S' + e.c.num : 'TARGET') + ' HIT - STILL AFLOAT', '#ffe080'); snd.boom(0.2); e.det = 1.1; return; }
        e.alive = false; wrecks.push({ x: e.x, y: e.y, t: 0, type: e.type });
        addScore(e.T.pts * (1 + tier));
        say((e.c.num ? 'S' + e.c.num + ' ' : '') + e.T.name + ' SUNK! +' + e.T.pts * (1 + tier), '#ffe080');
        snd.boom(0.3);
        api.audio.noise(2.5, { vol: 0.12, freq: 250, slideTo: 40, delay: 1 });
        if (selected === e) selected = null;
        for (const o of ens) if (o.alive && o.T.sens > 0 && dist(o, e) < 9000) { o.det = Math.max(o.det, 0.45); o.ex = P.x + rnd(-2500, 2500); o.ey = P.y + rnd(-2500, 2500); }
      }

      function seekerScan(t, cands) {
        let best = null, bd = 1e9;
        for (const c of cands) {
          const d = Math.hypot(c.x - t.x, c.y - t.y);
          let range = c.isDecoy ? 2200 : 1700;
          if (!c.isDecoy && crosses(t.depth == null ? c.depth : t.depth, c.depth)) range *= 0.55;
          if (d > range) continue;
          if (Math.abs(adiff(brg(t, c.x, c.y), t.hdg)) > 45) continue;
          const score2 = c.isDecoy ? d * 0.5 : d;
          if (score2 < bd) { bd = score2; best = c; }
        }
        return best;
      }

      function updateTorps() {
        for (let i = torps.length - 1; i >= 0; i--) {
          const t = torps[i];
          if (api.frame % 6 === 0) { t.trail.push(t.x, t.y); if (t.trail.length > 16) t.trail.splice(0, 2); }
          if (t.side === 'p') {
            if (t.wire && (P.spd > 22 || dist(t, P) > 12000)) { t.wire = false; say('WIRE ' + t.num + ' CUT', '#ffb060'); }
            if (t.lock && (t.lock.alive === false || (t.lock.life != null && t.lock.life <= 0))) t.lock = null;
            if (!t.lock && t.run > 900) {
              const cands = [];
              for (const e of ens) if (e.alive) cands.push({ x: e.x, y: e.y, depth: e.depth, obj: e });
              for (const dcy of decoys) if (dcy.side === 'e' && dcy.life > 0) cands.push({ x: dcy.x, y: dcy.y, depth: dcy.depth, obj: dcy, isDecoy: true, ref: dcy });
              t.depth = t.guide && t.guide.alive ? t.guide.depth : P.depth;
              const b = seekerScan(t, cands);
              if (b) {
                if (b.isDecoy && Math.random() < 0.4 && cands.some(c => !c.isDecoy && Math.hypot(c.x - t.x, c.y - t.y) < 1700)) t.lock = cands.find(c => !c.isDecoy && Math.hypot(c.x - t.x, c.y - t.y) < 1700).obj;
                else t.lock = b.obj;
                if (t.lock && !b.isDecoy) say('TORPEDO ' + t.num + ' ACQUIRED TARGET', '#80ffff');
              }
            }
            if (t.lock) steer(t, brg(t, t.lock.x, t.lock.y), 10);
            else if (t.wire && t.guide && t.guide.alive && t.guide.c.q > 0.15) steer(t, brg(t, t.guide.c.ex, t.guide.c.ey), 6);
            move(t, t.spd); t.run += t.spd * KT * SDT;
            let hit = null;
            for (const e of ens) if (e.alive && Math.hypot(e.x - t.x, e.y - t.y) < 55) hit = e;
            if (hit) { killEnemy(hit); booms.push({ x: t.x, y: t.y, t: 0 }); torps.splice(i, 1); continue; }
            if (t.lock && t.lock.life != null && Math.hypot(t.lock.x - t.x, t.lock.y - t.y) < 40) { booms.push({ x: t.x, y: t.y, t: 0, small: true }); torps.splice(i, 1); continue; }
            if (t.run > t.range) { say('TORPEDO ' + t.num + ' OUT OF FUEL', '#ffb060'); torps.splice(i, 1); continue; }
          } else {
            if (!t.seen && dist(t, P) < 9000) { t.seen = true; say('TORPEDO IN THE WATER! BRG ' + pad(brg(P, t.x, t.y), 3), '#ff4040'); snd.alarm(); alarmT = 200; }
            if (t.lock && t.lock.life != null && t.lock.life <= 0) t.lock = null;
            if (!t.lock && t.run > 600) {
              const cands = [{ x: P.x, y: P.y, depth: P.depth, obj: P }];
              for (const dcy of decoys) if (dcy.side === 'p' && dcy.life > 0) cands.push({ x: dcy.x, y: dcy.y, depth: dcy.depth, obj: dcy, isDecoy: true, ref: dcy });
              const b = seekerScan(t, cands);
              if (b) {
                if (b.isDecoy) t.lock = Math.random() < 0.8 ? b.obj : P; else t.lock = P;
              }
            }
            if (t.lock) { steer(t, brg(t, t.lock.x, t.lock.y), 9); t.depth += clamp(t.lock.depth - t.depth, -8 * SDT, 8 * SDT); }
            else if (Math.hypot(t.fx - t.x, t.fy - t.y) > 250 && !t.searching) steer(t, brg(t, t.fx, t.fy), 8);
            else { t.searching = true; t.searchT += SDT; t.hdg = norm(t.hdg + Math.sin(t.searchT * 0.5) * 6 * SDT); }
            move(t, t.spd); t.run += t.spd * KT * SDT;
            if (t.lock === P && dist(t, P) < 50) { booms.push({ x: t.x, y: t.y, t: 0 }); torps.splice(i, 1); damagePlayer(60, 'TORPEDO'); continue; }
            if (t.lock && t.lock.life != null && Math.hypot(t.lock.x - t.x, t.lock.y - t.y) < 40) { booms.push({ x: t.x, y: t.y, t: 0, small: true }); say('DECOY TOOK THE TORPEDO', '#80ffb0'); torps.splice(i, 1); continue; }
            if (t.run > t.range) { if (t.seen) say('ENEMY TORPEDO RAN OUT', '#80ffb0'); torps.splice(i, 1); continue; }
          }
        }
        for (let i = decoys.length - 1; i >= 0; i--) { decoys[i].life -= SDT; if (decoys[i].life <= 0) decoys.splice(i, 1); }
        for (let i = dcs.length - 1; i >= 0; i--) {
          const c = dcs[i]; c.t -= SDT;
          if (c.t <= 0) {
            dcs.splice(i, 1); booms.push({ x: c.x, y: c.y, t: 0, small: true });
            const d = Math.hypot(c.x - P.x, c.y - P.y);
            if (d < 1500) snd.boom(0.18);
            if (d < 180 && Math.abs(c.depth - P.depth) < 100) damagePlayer(22, 'DEPTH CHARGE');
          }
        }
        for (let i = pings.length - 1; i >= 0; i--) { pings[i].r += 1500 * SDT; if (pings[i].r > pings[i].max) pings.splice(i, 1); }
        for (let i = booms.length - 1; i >= 0; i--) { booms[i].t += 1 / 60; if (booms[i].t > 1.5) booms.splice(i, 1); }
        for (const w of wrecks) w.t += 1 / 60;
      }

      function checkMission() {
        if (state !== 'play') return;
        let done = false;
        if (mission.goal === 'reach') {
          if (Math.hypot(P.x - mission.zone.x, P.y - mission.zone.y) < mission.zone.r) done = true;
        } else {
          const sunk = ens.filter(e => e.obj && !e.alive).length;
          if (sunk >= mission.need) done = true;
          else {
            const left = ens.filter(e => e.obj && e.alive);
            const need = mission.need - sunk;
            if (left.filter(e => dist(e, P) < 30000).length < need) return fail('TARGETS ESCAPED');
            if (P.torps <= 0 && !torps.some(t => t.side === 'p')) return fail('OUT OF TORPEDOES');
          }
        }
        if (done) {
          state = 'success'; stateT = 0;
          const b = [];
          b.push(['MISSION BONUS', 1500 * (mi + 1)]);
          b.push(['HULL ' + Math.round(P.hull) + '%', Math.round(P.hull) * 10]);
          b.push(['TORPEDOES SAVED', P.torps * 100]);
          b.push(['NOISEMAKERS SAVED', P.decoys * 50]);
          if (stealth) b.push(['NEVER DETECTED', 2000]);
          bonusLines = b;
          for (const l of b) addScore(l[1]);
          api.setHiScore(score);
          api.audio.melody([[392, .12], [523, .12], [659, .12], [784, .12], [659, .12], [784, .4]], { type: 'square', vol: .13 });
        }
      }
      function fail(why) { state = 'failed'; stateT = 220; failReason = why; snd.creak(); say('MISSION FAILED: ' + why, '#ff6060'); }
      function loseBoat() {
        boats--;
        if (boats > 0) { startMission(); return; }
        const over = () => { state = 'over'; stateT = 360; api.setHiScore(score); api.audio.melody([[330, .25], [294, .25], [262, .25], [196, .6]], { type: 'triangle', vol: .15 }); };
        if (api.offerContinue) { state = 'wait'; api.offerContinue(() => { boats = 3; startMission(); }, over); }
        else over();
      }

      // ---------- main update ----------
      function update() {
        if (coinFlash > 0) coinFlash--;
        if (shake > 0) shake--;
        sweep += 0.05;
        for (let i = msgs.length - 1; i >= 0; i--) if (--msgs[i].t <= 0) msgs.splice(i, 1);
        const go = api.anyPressed('Enter', 'Space') || api.mouse.clicked;
        if (state === 'attract') {
          attractT++;
          if (go) tryStart();
          return;
        }
        if (state === 'wait') return;
        if (state === 'over') { if (--stateT <= 0 || (stateT < 260 && go)) { state = 'attract'; attractT = 0; } return; }
        if (state === 'brief') { stateT++; if (stateT > 30 && go) { state = 'play'; say('CONN AYE. ' + mission.name + ' UNDERWAY'); } return; }
        if (state === 'success') { stateT++; if (stateT > 90 && go) { mi++; startMission(); } return; }
        if (state === 'failed') { stateT--; if (stateT <= 0) loseBoat(); return; }
        if (state === 'sunk') {
          stateT--; shake = Math.max(shake, 4);
          updateEnemies(); updateTorps();
          if (stateT <= 0) loseBoat();
          return;
        }
        // play
        simT += SDT;
        controls();
        updatePlayer();
        sonar();
        updateEnemies();
        updateTorps();
        if (alarmT > 0) { alarmT--; if (alarmT % 50 === 0 && torps.some(t => t.side === 'e' && t.seen)) snd.alarm(); }
        if (selected && !selected.alive) selected = null;
        checkMission();
      }

      // ---------- rendering ----------
      function toMap(x, y) { const sc = ZOOMS[zoom]; return [MCX + (x - P.x) / sc, MCY + (y - P.y) / sc]; }
      function inMap(sx, sy) { return sx > MX - 10 && sx < MX + MW + 10 && sy > MY - 10 && sy < MY + MH + 10; }

      function drawMap(ctx) {
        const sc = ZOOMS[zoom];
        ctx.fillStyle = '#00121a'; ctx.fillRect(MX, MY, MW, MH);
        ctx.save(); ctx.beginPath(); ctx.rect(MX, MY, MW, MH); ctx.clip();
        // grid every 1000 yds (2000 when zoomed out)
        const g = sc >= 100 ? 2000 : 1000;
        ctx.fillStyle = '#06303c';
        const x0 = Math.floor((P.x - MW / 2 * sc) / g) * g, y0 = Math.floor((P.y - MH / 2 * sc) / g) * g;
        for (let x = x0; x < P.x + MW / 2 * sc + g; x += g) { const s = toMap(x, 0)[0]; ctx.fillRect(Math.round(s), MY, 1, MH); }
        for (let y = y0; y < P.y + MH / 2 * sc + g; y += g) { const s = toMap(0, y)[1]; ctx.fillRect(MX, Math.round(s), MW, 1); }
        // range rings
        ctx.strokeStyle = 'rgba(40,160,120,0.35)'; ctx.lineWidth = 1;
        for (const r of [2000, 5000]) { ctx.beginPath(); ctx.arc(MCX, MCY, r / sc, 0, Math.PI * 2); ctx.stroke(); }
        // sonar sweep
        ctx.strokeStyle = 'rgba(60,255,150,0.18)';
        ctx.beginPath(); ctx.moveTo(MCX, MCY); ctx.lineTo(MCX + Math.sin(sweep) * 200, MCY - Math.cos(sweep) * 200); ctx.stroke();
        // objective zone
        if (mission.goal === 'reach') {
          const [zx, zy] = toMap(mission.zone.x, mission.zone.y);
          ctx.strokeStyle = (api.frame >> 4) & 1 ? '#30ff90' : '#20a060';
          ctx.beginPath(); ctx.arc(zx, zy, mission.zone.r / sc, 0, Math.PI * 2); ctx.stroke();
          text(ctx, 'EXIT', zx, zy - 3, '#30ff90', 1, 'center');
        }
        // pings
        for (const p of pings) {
          const [px, py] = toMap(p.x, p.y);
          ctx.strokeStyle = 'rgba(255,90,90,' + (0.6 * (1 - p.r / p.max)).toFixed(2) + ')';
          ctx.beginPath(); ctx.arc(px, py, p.r / sc, 0, Math.PI * 2); ctx.stroke();
        }
        // wrecks
        for (const w of wrecks) { const [wx, wy] = toMap(w.x, w.y); if (!inMap(wx, wy)) continue; ctx.fillStyle = '#556'; ctx.fillRect(wx - 2, wy - 2, 1, 1); ctx.fillRect(wx + 2, wy - 2, 1, 1); ctx.fillRect(wx, wy, 1, 1); ctx.fillRect(wx - 2, wy + 2, 1, 1); ctx.fillRect(wx + 2, wy + 2, 1, 1); }
        // decoys
        for (const d of decoys) {
          if (d.side === 'e' && !(dist(d, P) < 6000)) continue;
          const [dx, dy] = toMap(d.x, d.y);
          ctx.strokeStyle = d.side === 'p' ? '#a0ffff' : '#ff9090';
          ctx.beginPath(); ctx.arc(dx, dy, 2 + (api.frame >> 3) % 3, 0, Math.PI * 2); ctx.stroke();
        }
        // depth charges
        for (const c of dcs) { const [cx, cy] = toMap(c.x, c.y); ctx.fillStyle = '#ff8040'; ctx.fillRect(cx - 1, cy - 1, 2, 2); }
        // contacts
        for (const e of ens) {
          if (!e.alive || e.c.q <= 0.15) continue;
          const c = e.c, [cx, cy] = toMap(c.ex, c.ey);
          const fresh = c.lost < 20;
          const col = !c.cls ? '#e0e040' : e.T.color;
          ctx.strokeStyle = fresh ? col : '#606040'; ctx.fillStyle = ctx.strokeStyle;
          if (c.err / sc > 4) { ctx.strokeStyle = 'rgba(224,224,64,0.25)'; ctx.beginPath(); ctx.arc(cx, cy, c.err / sc, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = fresh ? col : '#606040'; }
          // symbol: unknown = square, surface = top half diamond, sub = bottom half diamond, merchant = circle
          ctx.beginPath();
          if (!c.cls) ctx.rect(cx - 3, cy - 3, 6, 6);
          else if (e.type === 'merchant' || e.type === 'tanker') ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
          else if (e.T.surf) { ctx.moveTo(cx - 4, cy + 1); ctx.lineTo(cx, cy - 4); ctx.lineTo(cx + 4, cy + 1); ctx.closePath(); }
          else { ctx.moveTo(cx - 4, cy - 1); ctx.lineTo(cx, cy + 4); ctx.lineTo(cx + 4, cy - 1); ctx.closePath(); }
          ctx.stroke();
          ctx.fillRect(cx, cy, 1, 1);
          text(ctx, 'S' + c.num + (c.cls ? ' ' + e.T.cls : ''), cx + 5, cy - 8, fresh ? col : '#606040');
          if (e.obj && c.cls) text(ctx, '*', cx - 9, cy - 8, '#ffe080');
          if (selected === e && (api.frame >> 3) & 1) {
            ctx.strokeStyle = '#ffffff';
            ctx.beginPath(); ctx.moveTo(cx - 7, cy - 4); ctx.lineTo(cx - 7, cy - 7); ctx.lineTo(cx - 4, cy - 7);
            ctx.moveTo(cx + 7, cy - 4); ctx.lineTo(cx + 7, cy - 7); ctx.lineTo(cx + 4, cy - 7);
            ctx.moveTo(cx - 7, cy + 4); ctx.lineTo(cx - 7, cy + 7); ctx.lineTo(cx - 4, cy + 7);
            ctx.moveTo(cx + 7, cy + 4); ctx.lineTo(cx + 7, cy + 7); ctx.lineTo(cx + 4, cy + 7); ctx.stroke();
          }
          if (selected === e) { ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.moveTo(MCX, MCY); ctx.lineTo(cx, cy); ctx.stroke(); }
        }
        // torpedoes
        for (const t of torps) {
          if (t.side === 'e' && !t.seen) continue;
          const [tx, ty] = toMap(t.x, t.y);
          ctx.fillStyle = t.side === 'p' ? 'rgba(80,255,255,0.35)' : 'rgba(255,80,80,0.35)';
          for (let k = 0; k < t.trail.length; k += 2) { const q = toMap(t.trail[k], t.trail[k + 1]); ctx.fillRect(q[0], q[1], 1, 1); }
          if (t.side === 'p' && t.wire) {
            ctx.fillStyle = 'rgba(80,255,255,0.5)';
            for (let k = 0; k <= 1; k += 0.05) ctx.fillRect(MCX + (tx - MCX) * k, MCY + (ty - MCY) * k, 1, 1);
          }
          ctx.fillStyle = t.side === 'p' ? '#60ffff' : ((api.frame >> 2) & 1 ? '#ff3030' : '#ffff60');
          ctx.fillRect(tx - 1, ty - 1, 3, 3);
          ctx.fillRect(tx + Math.sin(t.hdg * D2R) * 4, ty - Math.cos(t.hdg * D2R) * 4, 1, 1);
          if (t.side === 'p') text(ctx, String(t.num), tx + 3, ty + 2, '#60ffff');
        }
        // explosions
        for (const b of booms) {
          const [bx, by] = toMap(b.x, b.y);
          ctx.strokeStyle = 'rgba(255,200,80,' + (1 - b.t / 1.5).toFixed(2) + ')';
          ctx.beginPath(); ctx.arc(bx, by, (b.small ? 4 : 8) * (0.3 + b.t), 0, Math.PI * 2); ctx.stroke();
        }
        // own ship
        const h = P.hdg * D2R, s = Math.sin(h), c = Math.cos(h);
        ctx.strokeStyle = 'rgba(80,200,255,0.5)';
        ctx.beginPath(); ctx.moveTo(MCX, MCY); ctx.lineTo(MCX + Math.sin(P.ordHdg * D2R) * 22, MCY - Math.cos(P.ordHdg * D2R) * 22); ctx.stroke();
        ctx.fillStyle = '#50d0ff';
        ctx.beginPath(); ctx.moveTo(MCX + s * 7, MCY - c * 7); ctx.lineTo(MCX - s * 5 + c * 3, MCY + c * 5 + s * 3); ctx.lineTo(MCX - s * 5 - c * 3, MCY + c * 5 - s * 3); ctx.closePath(); ctx.fill();
        if (cavitating() && (api.frame >> 2) & 1) { ctx.fillStyle = '#ffffff'; ctx.fillRect(MCX - s * 8 - 1, MCY + c * 8 - 1, 2, 2); }
        if (scope && P.depth <= PERI + 5) { ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(MCX, MCY); ctx.lineTo(MCX + Math.sin(P.scopeBrg * D2R) * 40, MCY - Math.cos(P.scopeBrg * D2R) * 40); ctx.stroke(); }
        // off-map pointer to objective
        let ox = null, oy = null;
        if (mission.goal === 'reach') { ox = mission.zone.x; oy = mission.zone.y; }
        const [ax, ay] = ox != null ? toMap(ox, oy) : [0, 0];
        if (ox != null && !inMap(ax, ay)) {
          const ang = Math.atan2(ax - MCX, -(ay - MCY));
          const px = MCX + Math.sin(ang) * 100, py = MCY - Math.cos(ang) * 100;
          ctx.fillStyle = '#30ff90'; ctx.fillRect(px - 2, py - 2, 4, 4);
          text(ctx, 'EXIT ' + (Math.hypot(ox - P.x, oy - P.y) / 1000).toFixed(1) + 'K', px, py + 4, '#30ff90', 1, 'center');
        }
        ctx.restore();
        // scale bar & compass N
        text(ctx, 'N', MX + 4, MY + 3, '#4080a0');
        ctx.fillStyle = '#4080a0'; ctx.fillRect(MX + 4, MY + MH - 22, 1000 / sc, 1);
        text(ctx, '1000 YD', MX + 4, MY + MH - 20, '#4080a0');
      }

      function drawShipSil(ctx, type, x, y, len, dir, h) {
        const L = len / 2;
        ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
        ctx.fillStyle = '#20262c';
        ctx.beginPath(); ctx.moveTo(-L, -h * 0.5); ctx.lineTo(L * 1.05, -h * 0.7); ctx.lineTo(L * 0.85, 0); ctx.lineTo(-L * 0.95, 0); ctx.closePath(); ctx.fill();
        if (type === 'merchant' || type === 'tanker') {
          ctx.fillRect(-L * 0.85, -h * 1.5, L * 0.3, h); ctx.fillRect(-L * 0.75, -h * 2, L * 0.08, h * 0.6);
          if (type === 'merchant') { ctx.fillRect(-L * 0.2, -h * 1.4, L * 0.05, h); ctx.fillRect(L * 0.4, -h * 1.4, L * 0.05, h); }
        } else {
          ctx.fillRect(-L * 0.3, -h * 1.2, L * 0.6, h * 0.8); ctx.fillRect(-L * 0.05, -h * 1.8, L * 0.25, h * 0.7);
          ctx.fillRect(L * 0.08, -h * 2.8, Math.max(1, L * 0.03), h * 1.1);
          ctx.fillRect(L * 0.45, -h * 0.9, L * 0.15, h * 0.35); ctx.fillRect(-L * 0.6, -h * 0.9, L * 0.15, h * 0.35);
          if (type === 'cg') ctx.fillRect(-L * 0.25, -h * 2.2, L * 0.15, h);
        }
        ctx.restore();
      }
      function drawScope(ctx) {
        const CXs = MCX, CYs = MCY, HY = MCY - 4, R = 108;
        if (P.depth > PERI + 5) {
          ctx.fillStyle = '#001020'; ctx.fillRect(MX, MY, MW, MH);
          for (let i = 0; i < 30; i++) { ctx.fillStyle = 'rgba(80,140,200,0.25)'; ctx.fillRect((i * 53 + api.frame) % MW, (i * 37 + api.frame * 0.5) % MH + MY, 1, 2); }
          text(ctx, 'PERISCOPE LOWERED', CXs, CYs - 20, '#ffb060', 1, 'center');
          text(ctx, 'DEPTH ' + Math.round(P.depth) + ' FT', CXs, CYs - 6, '#ffffff', 1, 'center');
          text(ctx, 'ORDER DEPTH 60 TO RAISE', CXs, CYs + 8, '#80ffb0', 1, 'center');
          return;
        }
        const sky = ctx.createLinearGradient(0, MY, 0, HY);
        sky.addColorStop(0, '#5a7a96'); sky.addColorStop(1, '#b8c8d0');
        ctx.fillStyle = sky; ctx.fillRect(MX, MY, MW, HY - MY);
        const sea = ctx.createLinearGradient(0, HY, 0, MY + MH);
        sea.addColorStop(0, '#46606c'); sea.addColorStop(1, '#16262e');
        ctx.fillStyle = sea; ctx.fillRect(MX, HY, MW, MY + MH - HY);
        // waves
        ctx.fillStyle = 'rgba(200,220,230,0.3)';
        for (let k = 1; k < 12; k++) {
          const y = HY + k * k * 0.9, sp = 4 + k * 3;
          const off = ((-P.scopeBrg * 5.4 * (1 + k * 0.05)) % sp + sp) % sp;
          for (let x = MX + off; x < MX + MW; x += sp) ctx.fillRect(x, y, 1 + k * 0.4, 1);
        }
        // ships
        const vis = [];
        for (const e of ens) {
          if (!e.alive || !e.T.surf) continue;
          const d = dist(e, P); if (d > 11000) continue;
          const rel = adiff(brg(P, e.x, e.y), P.scopeBrg);
          if (Math.abs(rel) > 24) continue;
          vis.push({ e, d, rel });
        }
        vis.sort((a, b) => b.d - a.d);
        let center = null;
        for (const v of vis) {
          const asp = adiff(v.e.hdg, brg(P, v.e.x, v.e.y));
          const k = Math.max(0.25, Math.abs(Math.sin(asp * D2R)));
          const len = Math.max(3, v.e.T.len * k / v.d * 310), hh = Math.max(1, v.e.T.len * 0.06 / v.d * 310);
          const x = CXs + v.rel * 5.4, y = HY + Math.min(6, 3000 / v.d);
          drawShipSil(ctx, v.e.type, x, y, len, Math.sin(asp * D2R) >= 0 ? 1 : -1, hh);
          if (Math.abs(v.rel) < 3) center = v;
        }
        for (const w of wrecks) {
          const d = dist(w, P), rel = adiff(brg(P, w.x, w.y), P.scopeBrg);
          if (d < 9000 && Math.abs(rel) < 24 && w.t < 30) { ctx.fillStyle = 'rgba(40,40,40,0.6)'; const x = CXs + rel * 5.4; ctx.fillRect(x - 2, HY - 30 * (1 - w.t / 30) * 3000 / Math.max(1500, d), 4, 30 * (1 - w.t / 30) * 3000 / Math.max(1500, d)); }
        }
        // scope mask
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.rect(MX, MY, MW, MH); ctx.arc(CXs, CYs, R, 0, Math.PI * 2, true); ctx.fill('evenodd');
        // reticle
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(CXs - R, HY, R * 2, 1); ctx.fillRect(CXs, CYs - R, 1, R * 2);
        for (let k = -20; k <= 20; k += 5) { const x = CXs + k * 5.4; ctx.fillRect(x, HY - (k % 10 === 0 ? 5 : 3), 1, k % 10 === 0 ? 10 : 6); }
        text(ctx, 'BRG ' + pad(P.scopeBrg, 3), CXs, MY + 4, '#ffb020', 1, 'center');
        for (let k = -20; k <= 20; k += 10) text(ctx, pad(norm(P.scopeBrg + k), 3), CXs + k * 5.4, HY + 24, 'rgba(0,0,0,0.7)', 1, 'center');
        if (center) {
          const e = center.e;
          text(ctx, (e.c.num ? 'S' + e.c.num + ' ' : '') + e.T.name, CXs, MY + MH - 30, '#ffe080', 1, 'center');
          text(ctx, 'RANGE ' + (center.d / 1000).toFixed(1) + 'K YD  SPACE: FIRE', CXs, MY + MH - 20, '#ffffff', 1, 'center');
        }
        text(ctx, 'SCOPE UP', MX + 4, MY + 4, (api.frame >> 4) & 1 ? '#ffb020' : '#806010');
      }

      function bar(ctx, x, y, w, h, f, col) { ctx.fillStyle = '#0a1a20'; ctx.fillRect(x, y, w, h); ctx.fillStyle = col; ctx.fillRect(x, y, Math.round(w * clamp(f, 0, 1)), h); }
      function button(ctx, b, label, col, lit) {
        ctx.fillStyle = lit ? col : '#0c2228'; ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
        text(ctx, label, b.x + b.w / 2, b.y + (b.h - 7) / 2, lit ? '#001010' : col, 1, 'center');
      }
      function drawPanel(ctx) {
        ctx.fillStyle = '#04161c'; ctx.fillRect(PX, MY, W - PX, MH);
        ctx.fillStyle = '#1c4450'; ctx.fillRect(PX, MY, 1, MH);
        const x = PX + 4;
        const ordered = (cur, ord) => Math.round(cur) === Math.round(ord) ? '' : '>' + Math.round(ord);
        text(ctx, 'HDG ' + pad(P.hdg, 3) + (Math.abs(adiff(P.ordHdg, P.hdg)) > 1 ? '>' + pad(P.ordHdg, 3) : ''), x, 15, '#80ffb0');
        text(ctx, 'SPD ' + Math.round(P.spd) + ordered(P.spd, SPEEDS[P.ordSpd]), x, 24, FOCI[focus] === 'SPEED' ? '#ffffff' : '#80ffb0');
        text(ctx, 'DEP ' + Math.round(P.depth) + ordered(P.depth, DEPTHS[P.ordDepth]), x, 33, FOCI[focus] === 'DEPTH' ? '#ffffff' : '#80ffb0');
        const below = P.depth >= layer();
        text(ctx, 'LYR ' + layer() + (below ? ' UND' : ' ABV'), x, 42, below ? '#60c0ff' : '#808080');
        text(ctx, 'NOISE', x, 51, '#80ffb0');
        const pn = playerNoise();
        bar(ctx, x + 32, 51, 30, 6, pn / 1.5, pn > 0.9 ? '#ff4040' : pn > 0.6 ? '#ffb020' : '#30ff90');
        text(ctx, 'HULL', x, 60, '#80ffb0'); bar(ctx, x + 32, 60, 30, 6, P.hull / 100, P.hull > 50 ? '#30ff90' : '#ff4040');
        text(ctx, 'TORP ' + pad(P.torps, 2), x, 69, '#80ffb0');
        for (let i = 0; i < 4; i++) { ctx.fillStyle = P.tubes[i] <= 0 && P.torps > i ? '#30ff90' : P.tubes[i] > 0 ? '#604010' : '#202020'; ctx.fillRect(x + 44 + i * 5, 69, 4, 7); }
        text(ctx, 'DECOY ' + P.decoys, x, 78, '#80ffb0');
        if (cavitating()) text(ctx, 'CAVITATING', x, 87, (api.frame >> 3) & 1 ? '#ff4040' : '#802020');
        // depth profile
        const dx = W - 16, dy0 = 14, dh = 76;
        ctx.fillStyle = '#082838'; ctx.fillRect(dx, dy0, 12, dh);
        ctx.fillStyle = '#9fd0ff'; ctx.fillRect(dx, dy0, 12, 1);
        const ly = dy0 + layer() / 900 * dh;
        ctx.fillStyle = '#204a70'; ctx.fillRect(dx, ly, 12, dy0 + dh - ly);
        ctx.fillStyle = '#60c0ff'; ctx.fillRect(dx - 1, ly, 14, 1);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(dx + 1, dy0 + DEPTHS[P.ordDepth] / 900 * dh, 10, 1);
        ctx.fillStyle = '#50d0ff'; ctx.fillRect(dx + 3, dy0 + P.depth / 900 * dh - 1, 6, 3);
        // target box
        ctx.fillStyle = '#1c4450'; ctx.fillRect(PX, 95, W - PX, 1);
        const tgt = selected && selected.alive ? selected : null;
        text(ctx, 'TARGET', x, 98, FOCI[focus] === 'TARGET' ? '#ffffff' : '#80ffb0');
        if (tgt) {
          const c = tgt.c, r = Math.hypot(c.ex - P.x, c.ey - P.y);
          text(ctx, 'S' + c.num + ' ' + (c.cls ? tgt.T.cls : '?????'), x + 42, 98, c.cls ? tgt.T.color : '#e0e040');
          text(ctx, 'B' + pad(brg(P, c.ex, c.ey), 3) + ' R' + (r / 1000).toFixed(1) + 'K', x, 107, '#c0ffe0');
          text(ctx, c.cls ? tgt.T.name.slice(0, 13) : 'UNKNOWN', x, 116, '#80a090');
        } else text(ctx, 'NONE', x, 107, '#406050');
        ctx.fillStyle = '#1c4450'; ctx.fillRect(PX, 125, W - PX, 1);
        for (let i = 0; i < 4; i++) {
          const b = BTN.focus[i], on = focus === i;
          if (on) { ctx.fillStyle = '#145040'; ctx.fillRect(b.x, b.y, b.w, b.h); }
          text(ctx, (on ? '>' : ' ') + FOCI[i], b.x + 2, b.y + 1, on ? '#ffffff' : '#50a080');
        }
        const ready = P.tubes.some(t => t <= 0) && P.torps > 0;
        button(ctx, BTN.fire, 'FIRE', '#ff6040', ready && (api.frame >> 4) & 1);
        button(ctx, BTN.decoy, 'DECOY', '#60e0ff', false);
        button(ctx, BTN.zoomb, 'ZOOM', '#80ffb0', false);
        button(ctx, BTN.up, '<', '#80ffb0', false); button(ctx, BTN.up, '', '#80ffb0', false); text(ctx, '+', BTN.up.x + 9, BTN.up.y + 6, '#80ffb0', 1, 'center');
        button(ctx, BTN.dn, '', '#80ffb0', false); text(ctx, '-', BTN.dn.x + 9, BTN.dn.y + 6, '#80ffb0', 1, 'center');
      }
      function drawTop(ctx) {
        ctx.fillStyle = '#021014'; ctx.fillRect(0, 0, W, MY);
        ctx.fillStyle = '#1c4450'; ctx.fillRect(0, MY - 1, W, 1);
        text(ctx, 'M' + (mi + 1) + ' ' + mission.name, 2, 2, '#ffb020');
        text(ctx, 'SCORE ' + pad(score, 7), 190, 2, '#ffffff', 1, 'center');
        text(ctx, 'BOATS ' + boats, W - 2, 2, '#60c0ff', 1, 'right');
      }
      function drawMsgs(ctx) {
        let y = MY + MH - 10;
        for (let i = msgs.length - 1; i >= 0; i--) {
          const m = msgs[i];
          ctx.fillStyle = 'rgba(0,10,14,0.7)'; ctx.fillRect(MX, y - 1, MW, 9);
          text(ctx, m.s.slice(0, 38), MX + 2, y, m.col);
          y -= 9;
        }
        const enemyT = torps.some(t => t.side === 'e' && t.seen);
        if (enemyT && (api.frame >> 3) & 1) text(ctx, '! TORPEDO WARNING !', MCX, MY + 14, '#ff4040', 1, 'center');
        if (!scope) {
          const obj = mission.goal === 'reach' ? 'REACH THE EXIT ZONE' : 'SINK ' + mission.need + ' TARGET' + (mission.need > 1 ? 'S' : '') + ' (' + ens.filter(e => e.obj && !e.alive).length + '/' + mission.need + ')';
          text(ctx, obj, MX + 12, MY + 4, '#406870');
        }
      }

      function drawSubSil(ctx, x, y, s) {
        ctx.fillStyle = '#0c2a34';
        ctx.beginPath(); ctx.ellipse(x, y, 60 * s, 7 * s, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(x - 6 * s, y - 15 * s, 18 * s, 10 * s);
        ctx.fillRect(x - 2 * s, y - 13 * s, 26 * s, 2 * s);
        ctx.beginPath(); ctx.moveTo(x - 58 * s, y); ctx.lineTo(x - 72 * s, y - 9 * s); ctx.lineTo(x - 72 * s, y + 9 * s); ctx.fill();
        ctx.fillStyle = '#1e5060'; ctx.fillRect(x - 50 * s, y - 2 * s, 100 * s, 1);
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#000a10'; ctx.fillRect(0, 0, W, H);
        // sonar scope background
        ctx.strokeStyle = '#06303c';
        for (let r = 30; r < 200; r += 30) { ctx.beginPath(); ctx.arc(160, 130, r, 0, Math.PI * 2); ctx.stroke(); }
        const a = attractT * 0.03;
        ctx.strokeStyle = 'rgba(60,255,150,0.3)'; ctx.beginPath(); ctx.moveTo(160, 130); ctx.lineTo(160 + Math.sin(a) * 200, 130 - Math.cos(a) * 200); ctx.stroke();
        const page = Math.floor(attractT / 480) % 2;
        for (let k = 3; k >= 0; k--) text(ctx, '688', 160 + k, 18 + k, k ? '#103040' : '#30ff90', 5, 'center');
        text(ctx, 'ATTACK SUB', 160, 58, '#ffb020', 2, 'center');
        drawSubSil(ctx, 160, 92, 1);
        if (page === 0) {
          text(ctx, 'COMMAND A LOS ANGELES CLASS', 160, 112, '#80ffb0', 1, 'center');
          text(ctx, 'NUCLEAR ATTACK SUBMARINE', 160, 122, '#80ffb0', 1, 'center');
          text(ctx, 'LISTEN. STALK. STRIKE. SURVIVE.', 160, 138, '#c0e0e0', 1, 'center');
          text(ctx, 'HI SCORE ' + pad(hi, 7), 160, 156, '#ffe080', 1, 'center');
        } else {
          const L = ['LEFT/RIGHT  RUDDER', 'ENTER  NEXT ORDER', 'UP/DOWN  CHANGE ORDER', 'SPACE  FIRE TORPEDO', 'X  NOISEMAKER   Z  ZOOM', 'FAST = LOUD. HIDE UNDER', 'THE LAYER. 60 FT = SCOPE'];
          L.forEach((s, i) => text(ctx, s, 160, 108 + i * 9, i < 5 ? '#c0e0e0' : '#60c0ff', 1, 'center'));
        }
        const blink = (attractT >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', 160, 180, '#ff6060', 1, 'center'); }
        else if (api.credits === 0) { if (blink) text(ctx, 'INSERT COIN', 160, 180, '#ff6060', 1, 'center'); }
        else text(ctx, 'PUSH START', 160, 180, blink ? '#ffffff' : '#808080', 1, 'center');
        text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), 4, 230, '#888');
        text(ctx, '\u00a9 1989 ELECTRONIC ARTS', 316, 230, '#666', 1, 'right');
      }
      function drawBrief(ctx) {
        ctx.fillStyle = '#000a10'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#1c4450'; ctx.strokeRect(20.5, 20.5, 279, 199);
        text(ctx, 'MISSION ' + (mi + 1), 160, 30, '#ffb020', 2, 'center');
        text(ctx, mission.name, 160, 50, '#30ff90', 2, 'center');
        if (tier > 0) text(ctx, 'THREAT LEVEL ' + (tier + 1), 160, 68, '#ff6060', 1, 'center');
        mission.brief.forEach((s, i) => text(ctx, s, 160, 84 + i * 11, '#c0e0e0', 1, 'center'));
        text(ctx, 'TORPEDOES ' + mission.torps + '   NOISEMAKERS ' + mission.decoys, 160, 140, '#80ffb0', 1, 'center');
        text(ctx, 'THERMAL LAYER AT ' + mission.layer + ' FT', 160, 151, '#60c0ff', 1, 'center');
        text(ctx, 'BOATS ' + boats + '   SCORE ' + pad(score, 7), 160, 168, '#ffffff', 1, 'center');
        if (stateT > 30 && (stateT >> 4) & 1) text(ctx, 'PRESS START TO SAIL', 160, 196, '#ffe080', 1, 'center');
      }
      function drawSuccess(ctx) {
        ctx.fillStyle = 'rgba(0,10,16,0.88)'; ctx.fillRect(30, 40, 260, 160);
        ctx.strokeStyle = '#30ff90'; ctx.strokeRect(30.5, 40.5, 259, 159);
        text(ctx, 'MISSION COMPLETE', 160, 50, '#30ff90', 2, 'center');
        bonusLines.forEach((l, i) => { if (stateT > 20 + i * 12) { text(ctx, l[0], 50, 80 + i * 12, '#c0e0e0'); text(ctx, String(l[1]), 270, 80 + i * 12, '#ffe080', 1, 'right'); } });
        text(ctx, 'SCORE ' + pad(score, 7), 160, 160, '#ffffff', 1, 'center');
        if ((mi + 1) % MISSIONS.length === 0) text(ctx, 'CAMPAIGN COMPLETE - THREAT RISING', 160, 172, '#ff8060', 1, 'center');
        if (stateT > 90 && (stateT >> 4) & 1) text(ctx, 'PRESS START', 160, 186, '#ffe080', 1, 'center');
      }

      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'attract') { drawTitle(ctx); return; }
        if (state === 'brief') { drawBrief(ctx); return; }
        if (!P) { drawTitle(ctx); return; }
        ctx.save();
        if (shake > 0) ctx.translate(Math.round(rnd(-2, 2)), Math.round(rnd(-2, 2)));
        if (scope && state === 'play') drawScope(ctx); else drawMap(ctx);
        drawMsgs(ctx);
        drawPanel(ctx);
        drawTop(ctx);
        ctx.restore();
        if (state === 'success') drawSuccess(ctx);
        if (state === 'sunk') {
          ctx.fillStyle = 'rgba(80,0,0,' + (0.2 + 0.3 * (1 - stateT / 260)).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H);
          text(ctx, 'BOAT LOST', 160, 100, '#ff4040', 3, 'center');
          text(ctx, failReason, 160, 128, '#ffffff', 1, 'center');
        }
        if (state === 'failed') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 80, W, 60);
          text(ctx, 'MISSION FAILED', 160, 92, '#ff4040', 2, 'center');
          text(ctx, failReason, 160, 116, '#ffffff', 1, 'center');
        }
        if (state === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 80, W, 60);
          text(ctx, 'GAME OVER', 160, 96, '#ff4040', 3, 'center');
        }
      }

      return {
        update, render,
        debug() {
          return {
            state, mission: mi, name: mission && mission.name, score, boats,
            P: P && { x: P.x, y: P.y, hdg: P.hdg, ordHdg: P.ordHdg, spd: P.spd, ordSpd: P.ordSpd, depth: P.depth, ordDepth: P.ordDepth, hull: P.hull, torps: P.torps, decoys: P.decoys },
            focus: FOCI[focus], goal: mission && (mission.goal || 'sink'), zone: mission && mission.zone, layer: mission && mission.layer,
            ens: ens.map(e => ({ type: e.type, x: e.x, y: e.y, alive: e.alive, obj: e.obj, q: e.c.q, state: e.state, depth: e.depth })),
            etorps: torps.filter(t => t.side === 'e').map(t => ({ x: t.x, y: t.y, lock: t.lock === P })), ptorps: torps.filter(t => t.side === 'p').length
          };
        },
        destroy() { }
      };
    }
  });
})();
