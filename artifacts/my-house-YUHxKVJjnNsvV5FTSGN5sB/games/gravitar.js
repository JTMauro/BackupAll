// Gravitar (Atari, 1982) - from-scratch vector recreation: gravity, bunkers, fuel, tractor beam and the reactor.
(function () {
  'use strict';

  // ---------- Vector font: 4x6 grid, strokes are runs of "xy" digit pairs ----------
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

  // ---------- Gravitar ----------
  const W = 640, H = 480, TAU = Math.PI * 2;
  const SHIP = [[11, 0], [-7, -7], [-3, 0], [-7, 7]];
  const PLANET_BONUS = [2000, 3000, 4000, 6000];
  // three solar systems (the fourth loop starts again, harder)
  const SYSTEMS = [
    { sun: [330, 250], planets: [[150, 120, 22], [520, 110, 26], [530, 390, 20], [140, 370, 24]], reactor: [330, 70], home: [40, 450] },
    { sun: [300, 230], planets: [[110, 210, 24], [470, 90, 20], [560, 300, 26], [300, 420, 22]], reactor: [580, 440], home: [40, 40] },
    { sun: [340, 260], planets: [[200, 90, 20], [560, 170, 24], [420, 420, 22], [90, 300, 26]], reactor: [80, 130], home: [600, 450] }
  ];
  const PCOL = ['#ff9a3a', '#5cff8a', '#ff5cd8', '#5cc8ff'];

  ArcadeRegistry.register({
    id: 'gravitar', title: 'Gravitar', year: 1982, maker: 'Atari',
    width: W, height: H, vector: true, pointer: false,
    controls: 'Left/Right: rotate \u00b7 Up: thrust \u00b7 Space: fire \u00b7 X or Down: shield + tractor beam \u00b7 Enter: start',
    marquee: { bg: '#04050c', fg: '#ff4ad8', accent: '#3ad0ff' },
    create(api) {
      const A = api.audio;
      let seed = 1;
      const srand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
      const rnd = (a, b) => a + Math.random() * (b - a);
      let hi = api.getHiScore(10000);
      let state = 'attract';     // attract | system | planet | dead | sysclear | over
      let stateT = 0, attractT = 0;
      let score = 0, lives = 5, fuel = 10000, nextExtra = 10000, sysNo = 0, loop = 0;
      let ship = null, shots = [], ebul = [], debris = [], dots = [], planets = [], reactorP = null;
      let cur = null;            // current planet (null = solar system)
      let camX = 0, msg = '', msgT = 0, deadWhere = 'system', thrustSnd = 0;
      let coinFlash = 0;

      const snd = {
        fire() { A.tone(1100, 0.06, { type: 'square', vol: 0.07, slideTo: 300 }); },
        ebul() { A.tone(420, 0.06, { type: 'triangle', vol: 0.08, slideTo: 200 }); },
        boom() { A.noise(0.5, { vol: 0.25, freq: 1600, slideTo: 100 }); },
        die() { A.noise(1.3, { vol: 0.32, freq: 2500, slideTo: 50 }); A.tone(300, 1, { type: 'sawtooth', vol: 0.1, slideTo: 30 }); },
        thrust() { A.noise(0.1, { vol: 0.12, freq: 380 }); },
        tractor() { A.tone(180 + (api.frame % 20) * 12, 0.07, { type: 'sine', vol: 0.05 }); },
        fuel() { A.melody([[523, .06], [659, .06], [784, .06], [1046, .12]], { type: 'square', vol: 0.12 }); },
        enter() { A.tone(200, 0.6, { type: 'sine', vol: 0.15, slideTo: 1200 }); },
        leave() { A.tone(1200, 0.5, { type: 'sine', vol: 0.15, slideTo: 200 }); },
        bonus() { A.melody([[392, .1], [523, .1], [659, .1], [784, .1], [1046, .3]], { type: 'square', vol: 0.14 }); },
        alarm() { A.tone(880, 0.12, { type: 'square', vol: 0.12 }); A.tone(660, 0.12, { type: 'square', vol: 0.12, delay: 0.13 }); },
        extra() { A.melody([[1318, .06], [1568, .06], [2093, .15]], { type: 'square', vol: 0.14 }); }
      };

      // ---------- planets ----------
      function makePlanet(i, sys) {
        seed = 1234 + sys * 97 + i * 31 + loop * 7;
        const WW = 1920, n = 48, pts = [];
        let y = 340;
        const rough = 30 + i * 10;
        for (let k = 0; k < n; k++) {
          y += (srand() - 0.5) * rough * 2;
          if (k % 12 === 5) y = 430 + srand() * 20;          // a valley
          if (k % 12 === 9) y = 200 + srand() * 60;          // a peak
          y = Math.max(190, Math.min(455, y));
          pts.push([k * WW / n, Math.round(y)]);
        }
        pts.push([WW, pts[0][1]]);
        const p = {
          wrap: true, WW, floor: pts, ceil: null, bunkers: [], tanks: [], done: false, reactor: null,
          grav: 0.022 + i * 0.003 + sys * 0.002 + loop * 0.004, bonus: PLANET_BONUS[i] + loop * 1000, idx: i, entryX: WW / 2
        };
        // bunkers on gentle slopes, fuel tanks on flats
        const used = new Set();
        const nb = 4 + i + Math.min(3, sys + loop);
        for (let tries = 0; tries < 400 && p.bunkers.length < nb; tries++) {
          const k = Math.floor(srand() * n);
          if (used.has(k) || used.has(k - 1) || used.has(k + 1)) continue;
          const [x1, y1] = pts[k], [x2, y2] = pts[k + 1];
          if (Math.abs((y2 - y1) / (x2 - x1)) > 1.1) continue;
          used.add(k); p.bunkers.push(mount(x1, y1, x2, y2, 1, srand() < 0.5 ? 0 : 1));
        }
        for (let tries = 0; tries < 400 && p.tanks.length < 2 + (i & 1); tries++) {
          const k = Math.floor(srand() * n);
          if (used.has(k)) continue;
          const [x1, y1] = pts[k], [x2, y2] = pts[k + 1];
          if (Math.abs((y2 - y1) / (x2 - x1)) > 0.45) continue;
          used.add(k); const t = mount(x1, y1, x2, y2, 1, 0); t.fuel = 2500; p.tanks.push(t);
        }
        return p;
      }
      function makeReactor(sys) {
        const floor = [[0, 330], [160, 340], [230, 360], [300, 425], [420, 440], [560, 425], [700, 452], [840, 438], [980, 452], [1100, 455], [1280, 455]];
        const ceil = [[0, -400], [262, -400], [272, 245], [420, 320], [560, 300], [700, 335], [840, 312], [980, 330], [1100, 300], [1180, 285], [1280, 285]];
        const p = { wrap: false, WW: 1280, floor, ceil, bunkers: [], tanks: [], done: false, grav: 0.024 + sys * 0.002 + loop * 0.004, bonus: 0, idx: 4, entryX: 110 };
        const fb = [[3, 4], [5, 6], [7, 8]], cb = [[4, 5], [6, 7], [8, 9]];
        for (const [a, b] of fb) p.bunkers.push(mount(floor[a][0], floor[a][1], floor[b][0], floor[b][1], 1, a & 1));
        for (const [a, b] of cb) if (sys + loop > 0 || a !== 8) p.bunkers.push(mount(ceil[a][0], ceil[a][1], ceil[b][0], ceil[b][1], -1, 1));
        const t = mount(floor[1][0], floor[1][1], floor[2][0], floor[2][1], 1, 0); t.fuel = 2500; p.tanks.push(t);
        p.reactor = { x: 1200, y: 441, hit: false, t: 0 };
        return p;
      }
      function mount(x1, y1, x2, y2, side, kind) {
        // place an object at a segment's midpoint, standing on (side 1) or hanging from (side -1) the surface
        const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy);
        let nx = dy / l, ny = -dx / l;
        if (side > 0 && ny > 0) { nx = -nx; ny = -ny; }
        if (side < 0 && ny < 0) { nx = -nx; ny = -ny; }
        return { x: (x1 + x2) / 2, y: (y1 + y2) / 2, nx, ny, kind, alive: true, fireT: Math.floor(rnd(60, 200)) };
      }
      function buildSystem() {
        const s = SYSTEMS[sysNo % 3];
        planets = s.planets.map((pp, i) => { const p = makePlanet(i, sysNo % 3); p.sx = pp[0]; p.sy = pp[1]; p.r = pp[2]; return p; });
        reactorP = makeReactor(sysNo % 3); reactorP.sx = s.reactor[0]; reactorP.sy = s.reactor[1]; reactorP.r = 16;
      }
      function surfY(pts, x) {
        for (let i = 0; i < pts.length - 1; i++) {
          const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
          if (x >= x1 && x <= x2) return x2 === x1 ? Math.max(y1, y2) : y1 + (y2 - y1) * (x - x1) / (x2 - x1);
        }
        return pts[pts.length - 1][1];
      }
      function wx(x) { return cur && cur.wrap ? ((x % cur.WW) + cur.WW) % cur.WW : x; }
      function floorAt(x) { return surfY(cur.floor, wx(x)); }
      function ceilAt(x) { return cur.ceil ? surfY(cur.ceil, wx(x)) : -1e9; }
      function solid(x, y) {
        if (!cur.wrap && (x < 0 || x > cur.WW)) return true;
        return y >= floorAt(x) || y <= ceilAt(x);
      }
      function wd(dx) { if (cur && cur.wrap) { dx = ((dx % cur.WW) + cur.WW) % cur.WW; if (dx > cur.WW / 2) dx -= cur.WW; } return dx; }

      // ---------- game flow ----------
      function newShip(x, y) { return { x, y, vx: 0, vy: 0, a: -Math.PI / 2, thrust: false, shield: false, alive: true, safe: 70 }; }
      function startGame() {
        score = 0; lives = 5; fuel = 10000; nextExtra = 10000; sysNo = 0; loop = 0;
        shots = []; ebul = []; debris = []; dots = [];
        buildSystem(); toSystem(true);
        msg = 'PLAYER 1'; msgT = 120;
      }
      function toSystem(home, from) {
        cur = null; state = 'system'; stateT = 0; shots = []; ebul = [];
        const s = SYSTEMS[sysNo % 3];
        if (home || !from) { ship = newShip(s.home[0], s.home[1]); ship.a = Math.atan2(s.sun[1] - s.home[1], s.sun[0] - s.home[0]); }
        else {
          const a = Math.atan2(from.sy - s.sun[1], from.sx - s.sun[0]);
          ship = newShip(from.sx + Math.cos(a) * (from.r + 16), from.sy + Math.sin(a) * (from.r + 16));
          ship.vx = Math.cos(a) * 1.2; ship.vy = Math.sin(a) * 1.2; ship.a = a;
        }
      }
      function enterPlanet(p) {
        cur = p; state = 'planet'; stateT = 0; shots = []; ebul = [];
        ship = newShip(p.entryX, 24); ship.a = Math.PI / 2;
        if (p.reactor) { p.reactor.hit = false; p.reactor.t = 0; }
        msg = p.reactor ? 'REACTOR - DESTROY IT AND ESCAPE' : (p.done ? 'PLANET CLEARED' : 'DESTROY ALL BUNKERS'); msgT = 120;
        snd.enter();
      }
      function addScore(n) {
        score += n; if (score > hi) hi = score;
        if (score >= nextExtra) { nextExtra += 10000; lives++; snd.extra(); msg = 'BONUS SHIP'; msgT = 90; }
      }
      function explode(x, y, n, col, big) {
        for (let i = 0; i < n; i++) {
          const a = rnd(0, TAU), s = rnd(0.5, big ? 4 : 2.5);
          debris.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, a: rnd(0, TAU), va: rnd(-0.3, 0.3), l: rnd(3, big ? 10 : 6), t: rnd(30, 70), col });
        }
      }
      function killShip() {
        if (!ship.alive) return;
        ship.alive = false; explode(ship.x, ship.y, 16, '#ffffff', true); snd.die();
        lives--; deadWhere = cur; state = 'dead'; stateT = 0;
        if (cur && cur.reactor) { cur.reactor.hit = false; cur.reactor.t = 0; }
      }
      function afterDeath() {
        if (lives <= 0 || fuel <= 0) {
          const over = () => { state = 'over'; stateT = 0; api.setHiScore(score); };
          if (api.offerContinue) {
            state = 'over'; stateT = -1e9;
            api.offerContinue(() => { lives = 4; fuel = Math.max(fuel, 7500); respawn(); }, over);
          } else over();
          return;
        }
        respawn();
      }
      function respawn() {
        if (deadWhere) { const p = deadWhere; cur = p; state = 'planet'; stateT = 0; ship = newShip(p.entryX, 24); ship.a = Math.PI / 2; shots = []; ebul = []; }
        else toSystem(true);
      }
      function checkSystemClear() {
        if (planets.every(p => p.done)) { sysClear(false); return true; }
        return false;
      }
      function sysClear(viaReactor) {
        state = 'sysclear'; stateT = 0;
        const b = viaReactor ? 5000 + sysNo * 1000 + Math.floor(Math.max(0, reactorP.reactor.t) / 60) * 100 : 4000 + sysNo * 1000;
        addScore(b); fuel = Math.min(99999, fuel + 7500);
        msg = (viaReactor ? 'REACTOR DESTROYED ' : 'SYSTEM CLEARED ') + b; msgT = 200;
        snd.bonus();
      }

      // ---------- ship ----------
      function controlShip(grav) {
        const s = ship;
        if (api.key('ArrowLeft')) s.a -= 0.075;
        if (api.key('ArrowRight')) s.a += 0.075;
        s.thrust = api.key('ArrowUp') && fuel > 0;
        if (s.thrust) {
          s.vx += Math.cos(s.a) * 0.075; s.vy += Math.sin(s.a) * 0.075; fuel = Math.max(0, fuel - 3);
          if (--thrustSnd <= 0) { thrustSnd = 6; snd.thrust(); }
        }
        s.shield = (api.key('KeyX') || api.key('ArrowDown')) && fuel > 0;
        if (s.shield) { fuel = Math.max(0, fuel - 6); if (api.frame % 6 === 0) snd.tractor(); }
        s.vx += grav[0]; s.vy += grav[1];
        const sp = Math.hypot(s.vx, s.vy), mx = 4.2;
        if (sp > mx) { s.vx *= mx / sp; s.vy *= mx / sp; }
        s.x += s.vx; s.y += s.vy;
        if (s.safe > 0) s.safe--;
        if (api.pressed('Space') && shots.length < 4) {
          shots.push({ x: s.x + Math.cos(s.a) * 11, y: s.y + Math.sin(s.a) * 11, vx: s.vx + Math.cos(s.a) * 6, vy: s.vy + Math.sin(s.a) * 6, t: 55 });
          snd.fire();
        }
        if (fuel <= 0 && !s.outMsg) { s.outMsg = true; msg = 'OUT OF FUEL'; msgT = 180; }
      }
      function shipPts() {
        const c = Math.cos(ship.a), s = Math.sin(ship.a);
        return SHIP.map(([x, y]) => [ship.x + x * c - y * s, ship.y + x * s + y * c]);
      }

      // ---------- solar system ----------
      function updateSystem() {
        const s = SYSTEMS[sysNo % 3];
        const dx = s.sun[0] - ship.x, dy = s.sun[1] - ship.y, d2 = Math.max(400, dx * dx + dy * dy), d = Math.sqrt(d2);
        const g = (420 + loop * 80) / d2;
        controlShip([dx / d * g, dy / d * g]);
        if (ship.x < 0) ship.x += W; if (ship.x > W) ship.x -= W;
        if (ship.y < 0) ship.y += H; if (ship.y > H) ship.y -= H;
        if (d < 20) { killShip(); return; }
        for (const p of planets.concat([reactorP])) {
          if (p.done) continue;
          if (Math.hypot(p.sx - ship.x, p.sy - ship.y) < p.r + 6) { enterPlanet(p); return; }
        }
        moveShots(false);
      }

      // ---------- planet ----------
      function updatePlanet() {
        const p = cur;
        controlShip([0, p.grav]);
        if (p.wrap) ship.x = wx(ship.x);
        camX = p.wrap ? ship.x - W / 2 : Math.max(0, Math.min(p.WW - W, ship.x - W / 2));
        // leaving through the top
        if (ship.y < -8) {
          snd.leave();
          if (p.reactor) {
            if (p.reactor.hit) { sysClear(true); return; }
            toSystem(false, p); return;
          }
          toSystem(false, p);
          checkSystemClear();
          return;
        }
        // terrain collision
        for (const [x, y] of shipPts()) if (solid(x, y)) { killShip(); return; }
        // tractor beam
        if (ship.shield) {
          for (const t of p.tanks) {
            if (!t.alive) continue;
            const dx = wd(t.x - ship.x), dy = t.y - ship.y;
            if (dy > 0 && dy < 90 && Math.abs(dx) < 34 + dy * 0.2) {
              t.y -= 1.2; t.x = wx(t.x - Math.sign(dx) * 0.8);
              if (Math.hypot(dx, dy) < 14) { t.alive = false; fuel += t.fuel; addScore(0); msg = 'FUEL ' + t.fuel; msgT = 60; snd.fuel(); }
            }
          }
        }
        // bunkers fire
        for (const b of p.bunkers) {
          if (!b.alive) continue;
          const dx = wd(ship.x - b.x), dy = ship.y - b.y;
          if (Math.abs(dx) > 420 || ship.safe > 0) continue;
          if (--b.fireT <= 0) {
            b.fireT = Math.max(45, Math.floor(rnd(110, 200) - sysNo * 12 - loop * 20));
            const a = Math.atan2(dy, dx) + rnd(-0.25, 0.25);
            if (Math.cos(a) * b.nx + Math.sin(a) * b.ny > -0.1) {
              const sp = 2.4 + sysNo * 0.2 + loop * 0.3;
              ebul.push({ x: b.x + b.nx * 8, y: b.y + b.ny * 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 160 });
              snd.ebul();
            }
          }
        }
        // reactor countdown
        if (p.reactor && p.reactor.hit) {
          p.reactor.t--;
          if (p.reactor.t % 60 === 0) snd.alarm();
          if (p.reactor.t <= 0) { explode(ship.x, ship.y, 4, '#ffffff', false); msg = 'TOO LATE'; msgT = 90; killShip(); return; }
        }
        moveShots(true);
        // enemy bullets
        for (let i = ebul.length - 1; i >= 0; i--) {
          const e = ebul[i]; e.x += e.vx; e.y += e.vy; if (p.wrap) e.x = wx(e.x);
          if (--e.t <= 0 || solid(e.x, e.y)) { ebul.splice(i, 1); continue; }
          const d = Math.hypot(wd(e.x - ship.x), e.y - ship.y);
          if (ship.shield && d < 16) { ebul.splice(i, 1); continue; }
          if (d < 7) { ebul.splice(i, 1); killShip(); return; }
        }
      }
      function moveShots(onPlanet) {
        for (let i = shots.length - 1; i >= 0; i--) {
          const s = shots[i]; s.x += s.vx; s.y += s.vy;
          if (!onPlanet) { if (s.x < 0) s.x += W; if (s.x > W) s.x -= W; if (s.y < 0) s.y += H; if (s.y > H) s.y -= H; }
          else s.x = wx(s.x);
          let gone = --s.t <= 0;
          if (onPlanet && !gone) {
            if (solid(s.x, s.y)) { gone = true; dots.push({ x: s.x, y: s.y, t: 10 }); }
            for (const b of cur.bunkers) {
              if (gone || !b.alive) continue;
              if (Math.hypot(wd(b.x - s.x), b.y - s.y) < 11) {
                b.alive = false; gone = true; addScore(250); explode(b.x, b.y, 10, '#ff5c5c', false); snd.boom();
                if (!cur.reactor && !cur.done && cur.bunkers.every(q => !q.alive)) {
                  cur.done = true; addScore(cur.bonus); msg = 'PLANET DESTROYED  BONUS ' + cur.bonus; msgT = 180; snd.bonus();
                }
              }
            }
            for (const t of cur.tanks) {
              if (gone || !t.alive) continue;
              if (Math.hypot(wd(t.x - s.x), t.y - s.y) < 9) { t.alive = false; gone = true; addScore(100); explode(t.x, t.y, 8, '#5cff8a', false); snd.boom(); }
            }
            const r = cur.reactor;
            if (r && !gone && !r.hit && Math.hypot(s.x - r.x, s.y - r.y) < 14) {
              gone = true; r.hit = true; r.t = Math.max(600, 1200 - sysNo * 120 - loop * 120);
              addScore(2000); explode(r.x, r.y, 20, '#ffe94a', true); snd.boom();
              msg = 'REACTOR CRITICAL - ESCAPE'; msgT = 150;
            }
          }
          if (gone) shots.splice(i, 1);
        }
      }

      function update() {
        stateT++;
        if (coinFlash > 0) coinFlash--;
        if (msgT > 0) msgT--;
        for (let i = debris.length - 1; i >= 0; i--) { const d = debris[i]; d.x += d.vx; d.y += d.vy; d.vx *= 0.98; d.vy *= 0.98; d.a += d.va; if (--d.t <= 0) debris.splice(i, 1); }
        for (let i = dots.length - 1; i >= 0; i--) if (--dots[i].t <= 0) dots.splice(i, 1);
        if (state === 'attract') {
          attractT++;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { startGame(); return; }
            coinFlash = 120; A.tone(70, 0.28, { type: 'square', vol: 0.25 });
          }
          return;
        }
        if (state === 'over') {
          if (stateT > 240 || (stateT > 60 && api.anyPressed('Enter', 'Space'))) { state = 'attract'; stateT = 0; attractT = 0; cur = null; }
          return;
        }
        if (state === 'dead') {
          if (stateT > 120) afterDeath();
          return;
        }
        if (state === 'sysclear') {
          if (stateT > 200) {
            sysNo++; if (sysNo % 3 === 0) loop++;
            buildSystem(); toSystem(true);
            msg = loop > 0 && sysNo % 3 === 0 ? 'NEW GALAXY - STRONGER GRAVITY' : 'SOLAR SYSTEM ' + (sysNo + 1); msgT = 150;
          }
          return;
        }
        if (fuel <= 0 && ship && ship.alive && !ship.thrust && stateT > 1) {
          // stranded: when the tank is dry the game is over
          if (!ship.dryT) ship.dryT = 0;
          if (++ship.dryT > 180) { lives = 0; killShip(); return; }
        }
        if (state === 'system') updateSystem();
        else if (state === 'planet') updatePlanet();
      }

      // ---------- drawing ----------
      function glow(ctx, col, b) { ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = b == null ? 6 : b; }
      function vt(ctx, s, x, y, sc, col, align, lw) { glow(ctx, col, 6); ctx.lineWidth = lw || 1.3; ctx.beginPath(); vtext(ctx, s, x, y, sc, align); ctx.stroke(); }
      function circ(ctx, x, y, r, n) { n = n || 16; for (let i = 0; i <= n; i++) { const a = i / n * TAU; if (i === 0) ctx.moveTo(x + r, y); else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } }
      function sx(x) {
        if (!cur || !cur.wrap) return x - (cur ? camX : 0);
        let d = ((x - camX) % cur.WW + cur.WW) % cur.WW; if (d > W + 200) d -= cur.WW; return d;
      }
      function drawShip(ctx, x, y, a, sc, col) {
        const c = Math.cos(a), s = Math.sin(a);
        glow(ctx, col || '#ffffff', 7); ctx.lineWidth = 1.4; ctx.beginPath();
        SHIP.forEach(([px, py], i) => { const X = x + (px * c - py * s) * sc, Y = y + (px * s + py * c) * sc; if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); });
        ctx.closePath(); ctx.stroke();
      }
      function drawPlayerShip(ctx, x, y) {
        drawShip(ctx, x, y, ship.a, 1, '#ffffff');
        if (ship.thrust && (api.frame & 2)) {
          const c = Math.cos(ship.a), s = Math.sin(ship.a);
          glow(ctx, '#ff9a3a', 8); ctx.beginPath();
          ctx.moveTo(x + (-5 * c + 3 * s), y + (-5 * s - 3 * c)); ctx.lineTo(x - 13 * c, y - 13 * s); ctx.lineTo(x + (-5 * c - 3 * s), y + (-5 * s + 3 * c));
          ctx.stroke();
        }
        if (ship.shield) {
          glow(ctx, '#3ad0ff', 10); ctx.beginPath(); circ(ctx, x, y, 15, 14); ctx.stroke();
          if (cur) {
            // tractor beam cone
            ctx.beginPath(); ctx.moveTo(x - 4, y + 6); ctx.lineTo(x - 34 - 18, y + 90); ctx.moveTo(x + 4, y + 6); ctx.lineTo(x + 34 + 18, y + 90);
            const k = (api.frame % 15) / 15 * 80 + 10; ctx.moveTo(x - 4 - k * 0.55, y + k); ctx.lineTo(x + 4 + k * 0.55, y + k);
            ctx.stroke();
          }
        }
      }
      function drawSystem(ctx, demoMode) {
        const s = SYSTEMS[sysNo % 3];
        // the sun
        glow(ctx, '#ffd23a', 12); ctx.lineWidth = 1.5; ctx.beginPath(); circ(ctx, s.sun[0], s.sun[1], 14, 12);
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * TAU + api.frame * 0.01, r1 = 18, r2 = 24 + ((i + (api.frame >> 3)) % 3) * 3;
          ctx.moveTo(s.sun[0] + Math.cos(a) * r1, s.sun[1] + Math.sin(a) * r1); ctx.lineTo(s.sun[0] + Math.cos(a) * r2, s.sun[1] + Math.sin(a) * r2);
        }
        ctx.stroke();
        // planets
        planets.forEach((p, i) => {
          const col = p.done ? '#404860' : PCOL[i];
          glow(ctx, col, p.done ? 0 : 7); ctx.lineWidth = 1.3; ctx.beginPath();
          circ(ctx, p.sx, p.sy, p.r, 18);
          // surface markings
          if (i === 0) { ctx.moveTo(p.sx - p.r, p.sy); ctx.lineTo(p.sx + p.r, p.sy); }
          if (i === 1) { ctx.moveTo(p.sx - p.r * 0.7, p.sy - p.r * 0.7); ctx.lineTo(p.sx + p.r * 0.7, p.sy + p.r * 0.7); ctx.moveTo(p.sx - p.r * 0.7, p.sy + p.r * 0.7); ctx.lineTo(p.sx + p.r * 0.7, p.sy - p.r * 0.7); }
          if (i === 2) { circ(ctx, p.sx, p.sy, p.r * 0.5, 10); }
          if (i === 3) { ctx.moveTo(p.sx - p.r * 1.5, p.sy + 4); ctx.lineTo(p.sx + p.r * 1.5, p.sy - 4); }
          ctx.stroke();
          if (!p.done) vt(ctx, String(p.bonus), p.sx, p.sy + p.r + 8, 1.6, col, 'center', 1);
        });
        const r = reactorP;
        glow(ctx, '#ff3a3a', 8); ctx.lineWidth = 1.4; ctx.beginPath();
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + api.frame * 0.02; ctx.moveTo(r.sx, r.sy); ctx.lineTo(r.sx + Math.cos(a) * r.r, r.sy + Math.sin(a) * r.r); }
        circ(ctx, r.sx, r.sy, r.r, 12); ctx.stroke();
        if (!demoMode) vt(ctx, 'REACTOR', r.sx, r.sy + r.r + 8, 1.5, '#ff3a3a', 'center', 1);
        // home base
        glow(ctx, '#3ad0ff', 6); ctx.beginPath();
        ctx.moveTo(s.home[0] - 10, s.home[1] + 12); ctx.lineTo(s.home[0], s.home[1] + 4); ctx.lineTo(s.home[0] + 10, s.home[1] + 12); ctx.stroke();
      }
      function drawPlanet(ctx) {
        const p = cur;
        glow(ctx, p.reactor ? '#ff6a3a' : PCOL[p.idx], 6); ctx.lineWidth = 1.5;
        for (const pts of [p.floor, p.ceil]) {
          if (!pts) continue;
          const offs = p.wrap ? [-p.WW, 0, p.WW] : [0];
          for (const o of offs) {
            if (pts[0][0] + o - camX > W + 50 || pts[pts.length - 1][0] + o - camX < -50) continue;
            ctx.beginPath();
            pts.forEach(([x, y], i) => { const X = x + o - camX, Y = Math.max(-5, y); if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); });
            ctx.stroke();
          }
        }
        // bunkers
        for (const b of p.bunkers) {
          if (!b.alive) continue;
          const x = sx(b.x); if (x < -30 || x > W + 30) continue;
          const tx = -b.ny, ty = b.nx;      // along the surface
          glow(ctx, b.kind ? '#ff5c5c' : '#ffb03a', 7); ctx.lineWidth = 1.3; ctx.beginPath();
          const P = (u, v) => [x + tx * u + b.nx * v, b.y + ty * u + b.ny * v];
          let q = P(-9, 0); ctx.moveTo(q[0], q[1]);
          for (const [u, v] of (b.kind ? [[-6, 7], [6, 7], [9, 0]] : [[-5, 6], [0, 8], [5, 6], [9, 0]])) { q = P(u, v); ctx.lineTo(q[0], q[1]); }
          q = P(-9, 0); ctx.lineTo(q[0], q[1]);
          // gun barrel aims at the ship
          const dx = wd(ship.x - b.x), dy = ship.y - b.y, l = Math.hypot(dx, dy) || 1;
          q = P(0, 6); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[0] + dx / l * 7, q[1] + dy / l * 7);
          ctx.stroke();
        }
        // fuel tanks
        for (const t of p.tanks) {
          if (!t.alive) continue;
          const x = sx(t.x); if (x < -30 || x > W + 30) continue;
          glow(ctx, '#5cff8a', 7); ctx.lineWidth = 1.3; ctx.beginPath();
          ctx.moveTo(x - 7, t.y); ctx.lineTo(x - 7, t.y - 12); ctx.lineTo(x + 7, t.y - 12); ctx.lineTo(x + 7, t.y); ctx.closePath();
          ctx.stroke();
          vt(ctx, 'F', x, t.y - 10, 1.3, '#5cff8a', 'center', 1);
        }
        // reactor
        if (p.reactor) {
          const r = p.reactor, x = r.x - camX;
          glow(ctx, r.hit ? ((api.frame >> 2) & 1 ? '#ffffff' : '#ff2020') : '#ffe94a', 10); ctx.lineWidth = 1.5; ctx.beginPath();
          circ(ctx, x, r.y - 6, 10, 12);
          for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + api.frame * 0.05; ctx.moveTo(x + Math.cos(a) * 4, r.y - 6 + Math.sin(a) * 4); ctx.lineTo(x + Math.cos(a) * 10, r.y - 6 + Math.sin(a) * 10); }
          ctx.moveTo(x - 16, r.y + 14); ctx.lineTo(x - 10, r.y + 2); ctx.lineTo(x + 10, r.y + 2); ctx.lineTo(x + 16, r.y + 14);
          ctx.stroke();
        }
        // enemy bullets
        ctx.fillStyle = '#ff7a7a';
        for (const e of ebul) { const x = sx(e.x); ctx.fillRect(x - 1.5, e.y - 1.5, 3, 3); }
      }
      function render(ctx) {
        ctx.shadowBlur = 0; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (state === 'attract') { drawAttract(ctx); return; }
        if (cur) drawPlanet(ctx); else drawSystem(ctx, false);
        if (ship && ship.alive && state !== 'sysclear') drawPlayerShip(ctx, cur ? sx(ship.x) : ship.x, ship.y);
        // shots
        ctx.fillStyle = '#ffffff';
        for (const s of shots) ctx.fillRect((cur ? sx(s.x) : s.x) - 1.5, s.y - 1.5, 3, 3);
        for (const d of dots) ctx.fillRect((cur ? sx(d.x) : d.x) - 1, d.y - 1, 2, 2);
        // debris
        for (const d of debris) {
          glow(ctx, d.col, 5); ctx.lineWidth = 1.2; ctx.beginPath();
          const x = cur ? sx(d.x) : d.x;
          ctx.moveTo(x - Math.cos(d.a) * d.l, d.y - Math.sin(d.a) * d.l); ctx.lineTo(x + Math.cos(d.a) * d.l, d.y + Math.sin(d.a) * d.l);
          ctx.stroke();
        }
        // HUD
        vt(ctx, String(score).padStart(2, '0'), 150, 14, 3, '#ffffff', 'right', 1.5);
        vt(ctx, String(hi), W / 2, 14, 2, '#9aa8ff', 'center', 1.1);
        vt(ctx, 'FUEL ' + Math.floor(fuel), W - 30, 14, 2, fuel < 2000 && (api.frame & 16) ? '#ff3a3a' : '#5cff8a', 'right', 1.2);
        for (let i = 0; i < Math.min(8, lives - (ship && ship.alive ? 1 : 0)); i++) drawShip(ctx, 40 + i * 18, 44, -Math.PI / 2, 0.7, '#ffffff');
        if (cur && cur.reactor && cur.reactor.hit) vt(ctx, String(Math.ceil(cur.reactor.t / 60)), W / 2, 50, 5, (api.frame >> 3) & 1 ? '#ff3a3a' : '#ffffff', 'center', 2);
        if (msgT > 0) vt(ctx, msg, W / 2, 110, 2.6, '#ffe94a', 'center', 1.3);
        if (state === 'over') vt(ctx, 'GAME OVER', W / 2, 220, 6, '#ff3a3a', 'center', 2);
        ctx.shadowBlur = 0;
      }
      function drawAttract(ctx) {
        if (!planets.length) buildSystem();
        const page = Math.floor(attractT / 480) % 2;
        drawSystem(ctx, true);
        ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(100, 140, 440, 230);
        vt(ctx, 'GRAVITAR', W / 2, 60, 8, '#ff4ad8', 'center', 2.4);
        if (page === 0) {
          vt(ctx, 'BUNKER   250', W / 2, 160, 2.4, '#ff5c5c', 'center');
          vt(ctx, 'FUEL TANK   2500 FUEL', W / 2, 190, 2.4, '#5cff8a', 'center');
          vt(ctx, 'PLANET   2000 - 6000', W / 2, 220, 2.4, '#5cc8ff', 'center');
          vt(ctx, 'REACTOR   5000 AND UP', W / 2, 250, 2.4, '#ffe94a', 'center');
          vt(ctx, 'BONUS SHIP EVERY 10000', W / 2, 280, 2.2, '#ffffff', 'center');
        } else {
          vt(ctx, 'HIGH SCORE', W / 2, 170, 3, '#ffffff', 'center');
          vt(ctx, String(hi), W / 2, 210, 3.4, '#ffe94a', 'center');
          vt(ctx, 'X OR DOWN - SHIELD AND TRACTOR BEAM', W / 2, 260, 1.8, '#3ad0ff', 'center');
          vt(ctx, 'FUEL RUNS OUT - GAME ENDS', W / 2, 284, 1.8, '#ff9a3a', 'center');
        }
        const blink = coinFlash > 0 ? (coinFlash % 20) < 12 : (attractT % 60) < 40;
        if (blink) vt(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 330, 3.4, '#ffffff', 'center', 1.5);
        vt(ctx, 'CREDITS ' + Math.min(99, api.credits), W / 2, 430, 2, '#9aa8ff', 'center');
        vt(ctx, '1982 ATARI', W / 2, 455, 1.6, '#6070a0', 'center', 1);
      }
      return { update, render, destroy() { } };
    }
  });
})();
