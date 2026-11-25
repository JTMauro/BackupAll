// Rolling Thunder (Namco, 1986) -- from-scratch recreation for the MAME32 Game Room.
// WCPO agent Albatross infiltrates Geldra's base: two floors, doors to hide in and stock up on bullets,
// hooded Maskers, a machine gun, limited ammo and a ticking clock.
(function () {
  'use strict';
  const W = 288, H = 224;
  const FONT_HEX = {
    '0': '0E11131519110E', '1': '040C040404040E', '2': '0E11010204081F', '3': '1F02040201110E',
    '4': '02060A121F0202', '5': '1F101E0101110E', '6': '0608101E11110E', '7': '1F010204080808',
    '8': '0E11110E11110E', '9': '0E11110F01020C', 'A': '0E11111F111111', 'B': '1E11111E11111E',
    'C': '0E11101010110E', 'D': '1C12111111121C', 'E': '1F10101E10101F', 'F': '1F10101E101010',
    'G': '0E11101711110F', 'H': '1111111F111111', 'I': '0E04040404040E', 'J': '0702020202120C',
    'K': '11121418141211', 'L': '1010101010101F', 'M': '111B1515111111', 'N': '11111915131111',
    'O': '0E11111111110E', 'P': '1E11111E101010', 'Q': '0E11111115120D', 'R': '1E11111E141211',
    'S': '0F10100E01011E', 'T': '1F040404040404', 'U': '1111111111110E', 'V': '11111111110A04',
    'W': '1111111515150A', 'X': '11110A040A1111', 'Y': '1111110A040404', 'Z': '1F01020408101F',
    ' ': '00000000000000', '!': '04040404040004', '-': '0000001F000000', '.': '00000000000C0C',
    ':': '000C0C000C0C00', '/': '00010204081000', "'": '04040000000000', '?': '0E110102040004',
    '\u00a9': '0E11171417110E', '(': '02040808080402', ')': '08040202020408', ',': '000000000C0408',
    '=': '00001F001F0000', '*': '0004150E150400', '+': '0004041F040400'
  };
  const FONT = {};
  for (const k in FONT_HEX) { const s = FONT_HEX[k]; const a = []; for (let i = 0; i < 7; i++) a.push(parseInt(s.substr(i * 2, 2), 16) || 0); FONT[k] = a; }
  function txt(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    if (align === 'c') x = Math.round(x - s.length * 4 * sc); else if (align === 'r') x = x - s.length * 8 * sc;
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) { const b = g[r]; if (!b) continue; for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + (i * 8 + c) * sc, y + r * sc, sc, sc); }
    }
  }
  // tiny 3x5 font for door signs
  const MINI = { A: '25755', B: '65656', E: '74647', L: '44447', M: '57755', R: '65655', S: '34216', T: '72222', U: '55557', X: '55255', I: '72227', G: '34553', O: '25552', N: '65555' };
  function mini(ctx, s, x, y, col) {
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = MINI[s[i]]; if (!g) continue;
      for (let r = 0; r < 5; r++) { const b = parseInt(g[r], 16); for (let c = 0; c < 3; c++) if (b & (4 >> c)) ctx.fillRect(x + i * 4 + c, y + r, 1, 1); }
    }
  }
  const MASK_COLS = [
    { body: '#30a030', dark: '#186018', pts: 100, rate: 140, crouch: 0.2, jump: 0, gren: 0 },   // green
    { body: '#3060e0', dark: '#183080', pts: 200, rate: 110, crouch: 0.4, jump: 0.1, gren: 0 }, // blue
    { body: '#e03030', dark: '#801818', pts: 300, rate: 70, crouch: 0.3, jump: 0.35, gren: 0 }, // red
    { body: '#a040c0', dark: '#502060', pts: 500, rate: 120, crouch: 0.1, jump: 0.1, gren: 1 }  // purple: grenades
  ];

  ArcadeRegistry.register({
    id: 'rollingthunder', title: 'Rolling Thunder', year: 1986, maker: 'Namco',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: walk/crouch \u00b7 Space: shoot \u00b7 X: jump (Up+X leap up a floor, Down+X drop) \u00b7 Up at a door: hide/ammo \u00b7 Enter: start',
    marquee: { bg: '#101010', fg: '#ffffff', accent: '#e02020' },
    create(api) {
      const A = api.audio;
      const F1 = 200, F2 = 128;   // feet y of lower floor and upper balcony
      // ---- state ----
      let state = 'title', tmr = 0, score = 0, hi = api.getHiScore(30000), lives = 2, area = 1, nextExtra = 20000;
      let coinFlash = 0, attractT = 0;
      let L = 2400, uppers = [], doors = [], crates = [], pits = [], enemies = [], pbul = [], ebul = [], grenades = [], fx = [], popups = [];
      let pl, camX = 0, time = 0, timeTick = 0, ammo = 50, gun = 'pistol', life = 2, maxOnScreen = 3, spawnT = 0, bossAlive = false;
      let seed = 1;
      const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

      function buildArea() {
        seed = (area * 977 + 31) >>> 0; rnd();
        L = 2200 + Math.min(area, 6) * 200;
        uppers = []; doors = []; crates = []; pits = [];
        let x = 220;
        while (x < L - 300) { const w = 260 + Math.floor(rnd() * 260); uppers.push([x, Math.min(L - 200, x + w)]); x += w + 120 + Math.floor(rnd() * 160); }
        // lower floor doors
        for (let dx = 160; dx < L - 160; dx += 110 + Math.floor(rnd() * 90)) {
          const r = rnd();
          doors.push({ x: dx, floor: 0, kind: r < 0.12 ? 'bullets' : r < 0.17 ? 'arms' : r < 0.75 ? 'enemy' : 'plain', open: 0, used: false, cd: 0 });
        }
        for (const u of uppers) for (let dx = u[0] + 40; dx < u[1] - 30; dx += 90 + Math.floor(rnd() * 80)) {
          const r = rnd();
          doors.push({ x: dx, floor: 1, kind: r < 0.16 ? 'bullets' : r < 0.22 ? 'arms' : r < 0.8 ? 'enemy' : 'plain', open: 0, used: false, cd: 0 });
        }
        // guarantee ammo early on
        doors.push({ x: 120, floor: 0, kind: 'bullets', open: 0, used: false, cd: 0 });
        doors.sort((a, b) => a.x - b.x);
        // crates (lower floor), avoid doors
        for (let cx = 300; cx < L - 300; cx += 180 + Math.floor(rnd() * 200)) {
          if (doors.some(d => d.floor === 0 && Math.abs(d.x - cx) < 30)) continue;
          crates.push({ x: cx, w: 20, h: rnd() < 0.5 ? 16 : 26 });
        }
        if (area >= 2) for (let px = 500; px < L - 400; px += 500 + Math.floor(rnd() * 300)) {
          if (doors.some(d => d.floor === 0 && Math.abs(d.x - px) < 50) || crates.some(c => Math.abs(c.x - px) < 50)) continue;
          pits.push([px, px + 30 + Math.floor(rnd() * 10)]);
        }
        doors.push({ x: L - 40, floor: 0, kind: 'goal', open: 0, used: false, cd: 0 });
      }
      const upperAt = x => uppers.some(u => x > u[0] + 2 && x < u[1] - 2);
      const pitAt = x => pits.find(p => x > p[0] + 3 && x < p[1] - 3);
      const floorY = f => f ? F2 : F1;

      function startArea() {
        buildArea();
        pl = { x: 40, y: F1, vx: 0, vy: 0, on: true, face: 1, crouch: false, hide: null, hideT: 0, anim: 0, drop: 0, inv: 60, dead: 0, shootT: 0, hurt: 0 };
        camX = 0; time = 150; timeTick = 0; life = 2; enemies = []; pbul = []; ebul = []; grenades = []; fx = []; popups = [];
        spawnT = 120; bossAlive = false;
        maxOnScreen = Math.min(6, 2 + area);
        if (area % 5 === 0) { enemies.push(makeBoss()); bossAlive = true; }
        state = 'ready'; tmr = 0;
        A.melody([[330, .12], [392, .12], [494, .12], [659, .24], [587, .12], [659, .36]], { type: 'square', vol: .1 });
      }
      function startGame() { score = 0; lives = 2; area = 1; nextExtra = 20000; ammo = 50; gun = 'pistol'; startArea(); }
      function addScore(n, x, y) {
        score += n;
        if (score >= nextExtra) { lives++; nextExtra += nextExtra === 20000 ? 50000 : 70000; A.melody([[1047, .08], [1319, .08], [1568, .16]], { type: 'square', vol: .12 }); }
        if (score > hi) hi = score;
        if (x != null) popups.push({ x, y, s: String(n), t: 50 });
      }

      // ---- enemies ----
      function makeMasker(x, floor, col) {
        return { k: 'masker', x, y: floorY(floor), vx: 0, vy: 0, on: true, face: x < pl.x ? 1 : -1, col, hp: 1, st: 'emerge', t: 0, cd: 40 + Math.random() * 60, crouch: false, drop: 0, aim: 0 };
      }
      function makeBoss() { return { k: 'boss', x: L - 120, y: F1, vx: 0, vy: 0, on: true, face: -1, col: 3, hp: 24 + area * 2, st: 'walk', t: 0, cd: 60, crouch: false, drop: 0 }; }
      function pickCol() { const r = Math.random(); const lv = Math.min(area, 6); if (r < 0.5 - lv * 0.05) return 0; if (r < 0.78 - lv * 0.03) return 1; if (r < 0.93) return 2; return 3; }
      function onScreen(x) { return x > camX - 10 && x < camX + W + 10; }
      function spawnEnemies() {
        if (bossAlive && area % 5 === 0 && Math.random() < 0.5) return;
        const live = enemies.filter(e => e.k !== 'boss' && !e.dead).length;
        if (live >= maxOnScreen) return;
        // from an enemy door on screen
        const cands = doors.filter(d => d.kind === 'enemy' && onScreen(d.x) && d.x > camX + 20 && d.x < camX + W - 20 && Math.abs(d.x - pl.x) > 40 && d.cd <= 0);
        if (cands.length && Math.random() < 0.75) {
          const d = cands[Math.floor(Math.random() * cands.length)];
          d.open = 30; d.cd = 200;
          const e = makeMasker(d.x, d.floor, pickCol()); enemies.push(e);
          A.tone(110, 0.1, { type: 'square', vol: 0.08 });
          return;
        }
        // from the screen edge, or a panther in later areas
        const side = Math.random() < 0.7 ? 1 : -1;
        const x = side > 0 ? camX + W + 12 : camX - 12;
        if (x < 10 || x > L - 10) return;
        if (area >= 2 && Math.random() < 0.15) { enemies.push({ k: 'panther', x, y: F1, vx: -side * (2.4 + area * 0.1), vy: 0, on: true, face: -side, col: 0, hp: 1, st: 'run', t: 0, cd: 0, crouch: false, drop: 0 }); A.tone(90, 0.3, { type: 'sawtooth', vol: 0.08, slideTo: 60 }); return; }
        const fl = upperAt(x) && Math.random() < 0.4 ? 1 : 0;
        const e = makeMasker(x, fl, pickCol()); e.st = 'walk'; enemies.push(e);
      }
      function enemyShoot(e) {
        const low = e.crouch;
        ebul.push({ x: e.x + e.face * 8, y: e.y - (low ? 9 : 20), vx: e.face * (2.0 + Math.min(1.2, area * 0.12)), low });
        A.tone(e.k === 'boss' ? 160 : 240, 0.06, { type: 'square', vol: 0.08, slideTo: 120 });
      }
      function physics(o) {
        o.vy += 0.25; if (o.vy > 6) o.vy = 6;
        const oy = o.y; o.y += o.vy;
        o.on = false;
        if (o.drop > 0) o.drop--;
        if (o.vy >= 0 && oy <= F2 && o.y >= F2 && upperAt(o.x) && o.drop <= 0) { o.y = F2; o.vy = 0; o.on = true; }
        for (const c of crates) if (o.vy >= 0 && oy <= F1 - c.h && o.y >= F1 - c.h && Math.abs(o.x - c.x) < c.w / 2 + 3) { o.y = F1 - c.h; o.vy = 0; o.on = true; }
        if (o.vy >= 0 && oy <= F1 && o.y >= F1 && !pitAt(o.x)) { o.y = F1; o.vy = 0; o.on = true; }
      }
      function crateBlock(o, ox) {
        for (const c of crates) {
          const top = F1 - c.h;
          if (o.y > top + 1 && o.y - 20 < F1 && Math.abs(o.x - c.x) < c.w / 2 + 5) { o.x = ox < c.x ? c.x - c.w / 2 - 5 : c.x + c.w / 2 + 5; return true; }
        }
        return false;
      }
      function updateEnemy(e) {
        e.t++;
        if (e.dead) { e.dt = (e.dt || 0) + 1; return; }
        const sameFloor = Math.abs(e.y - pl.y) < 20 && !pl.hide;
        if (e.k === 'panther') {
          e.x += e.vx; physics(e);
          return;
        }
        if (e.st === 'emerge') { if (e.t > 30) { e.st = 'walk'; e.t = 0; } return; }
        const C = MASK_COLS[e.col];
        const dx = pl.x - e.x;
        if (e.k === 'boss') {
          e.face = dx > 0 ? 1 : -1;
          if (!onScreen(e.x)) { physics(e); return; }
          if (Math.abs(dx) > 90) e.x += e.face * 0.6; else if (Math.abs(dx) < 60) e.x -= e.face * 0.4;
          e.x = Math.max(L - 260, Math.min(L - 30, e.x));
          if (--e.cd <= 0 && sameFloor && onScreen(e.x)) { e.crouch = Math.random() < 0.4; enemyShoot(e); if (Math.random() < 0.5) { e.crouch = !e.crouch; enemyShoot(e); } e.cd = 45; }
          physics(e); return;
        }
        if (e.st === 'walk') {
          if (!pl.hide) e.face = dx > 0 ? 1 : -1;
          const want = 50 + (e.col * 23 + e.t) % 70;
          let mv = 0;
          if (!sameFloor || Math.abs(dx) > want + 30) mv = e.face * (0.7 + e.col * 0.1);
          else if (Math.abs(dx) < want - 20) mv = -e.face * 0.5;
          const ox = e.x; e.x += mv; if (pitAt(e.x) && e.on && e.y >= F1) e.x = ox;
          if (e.on && mv) crateBlock(e, ox);
          if (mv) e.anim = (e.anim || 0) + 1;
          // change floors to follow the player
          if (e.on && !pl.hide && Math.random() < 0.006 + C.jump * 0.01) {
            if (pl.y < F2 + 5 && e.y >= F1 - 1 && upperAt(e.x)) { e.vy = -6.6; e.on = false; }
            else if (pl.y > F2 + 20 && e.y <= F2 + 1) { e.drop = 12; e.vy = -1; e.on = false; }
          }
          // red maskers hop over bullets
          if (e.on && C.jump > 0 && pbul.some(b => Math.abs(b.x - e.x) < 40 && Math.sign(e.x - b.x) === Math.sign(b.vx) && Math.abs(b.y - (e.y - 20)) < 10) && Math.random() < C.jump) { e.vy = -4; e.on = false; }
          if (--e.cd <= 0 && onScreen(e.x) && !pl.hide && sameFloor && Math.abs(dx) < 220) {
            e.st = 'aim'; e.t = 0; e.crouch = Math.random() < C.crouch;
          }
        } else if (e.st === 'aim') {
          if (e.t === 18) {
            if (C.gren && Math.random() < 0.6) { grenades.push({ x: e.x, y: e.y - 22, vx: e.face * Math.min(2.2, Math.abs(dx) / 45), vy: -3.5, t: 0, f: e.y }); A.tone(500, 0.15, { vol: 0.08, slideTo: 300 }); }
            else enemyShoot(e);
          }
          if (e.t > 34) { e.st = 'walk'; e.crouch = false; e.cd = C.rate * (0.7 + Math.random() * 0.6) / Math.min(1.8, 1 + area * 0.1); }
        }
        physics(e);
        if (e.y > H + 20) e.dead = true, e.dt = 99;
      }

      // ---- player ----
      function killPlayer(cause) {
        if (pl.dead || pl.hide || pl.inv > 0 || state !== 'play') return;
        pl.dead = 1; pl.cause = cause;
        A.melody([[392, .1], [370, .1], [349, .1], [330, .1], [311, .1], [294, .3]], { type: 'square', vol: .12 });
      }
      function hurt() {
        if (pl.inv > 0 || pl.dead || pl.hide) return;
        life--; pl.inv = 60; pl.vx = -pl.face * 2; pl.hurt = 12;
        A.tone(150, 0.2, { type: 'square', vol: 0.14, slideTo: 80 });
        if (life <= 0) { pl.inv = 0; killPlayer('touch'); }
      }
      function doorAt(x, floor) { return doors.find(d => d.floor === floor && Math.abs(d.x - x) < 10); }
      function updatePlayer() {
        if (pl.dead) { pl.dead++; return; }
        if (pl.inv > 0) pl.inv--;
        if (pl.shootT > 0) pl.shootT--;
        const floor = pl.y <= F2 + 1 ? 1 : 0;
        // hiding in a doorway
        if (pl.hide) {
          pl.hideT++;
          const d = pl.hide;
          if (pl.hideT === 40 && !d.used && (d.kind === 'bullets' || d.kind === 'arms')) {
            d.used = true;
            if (d.kind === 'arms') { gun = 'mg'; ammo = Math.min(999, ammo + 50); popups.push({ x: d.x, y: d.floor ? F2 - 40 : F1 - 40, s: 'MACHINE GUN', t: 70 }); }
            else { ammo = Math.min(999, ammo + 50); popups.push({ x: d.x, y: d.floor ? F2 - 40 : F1 - 40, s: 'BULLETS +50', t: 70 }); }
            A.melody([[880, .05], [1175, .05], [1568, .1]], { type: 'square', vol: .12 });
          }
          if (pl.hideT > 20 && api.anyPressed('ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyX')) { pl.hide = null; pl.inv = 20; A.tone(140, 0.08, { vol: 0.08 }); }
          return;
        }
        const l = api.key('ArrowLeft'), r = api.key('ArrowRight'), up = api.key('ArrowUp'), down = api.key('ArrowDown');
        pl.crouch = pl.on && down && !api.pressed('KeyX');
        const ox = pl.x;
        if (pl.hurt > 0) { pl.hurt--; pl.x += pl.vx; }
        else if (pl.on && !pl.crouch) {
          if (l) { pl.x -= 1.25; pl.face = -1; } else if (r) { pl.x += 1.25; pl.face = 1; }
          if (l || r) pl.anim++;
        } else if (!pl.on) pl.x += pl.vx;
        if (pl.on && pl.y >= F1 - 1 && pitAt(pl.x)) pl.on = false;
        if (pl.on) crateBlock(pl, ox);
        pl.x = Math.max(camX + 6, Math.min(L - 6, pl.x));
        // doors
        if (pl.on && api.pressed('ArrowUp') && !api.key('KeyX')) {
          const d = doorAt(pl.x, floor);
          if (d && (pl.y === F1 || pl.y === F2)) {
            if (d.kind === 'goal') { areaClear(); return; }
            pl.hide = d; pl.hideT = 0; d.open = 20; pl.x = d.x; A.tone(110, 0.1, { vol: 0.1 });
            return;
          }
        }
        // jumps
        if (pl.on && api.pressed('KeyX')) {
          if (up && floor === 0 && upperAt(pl.x)) { pl.vy = -6.6; pl.vx = 0; pl.on = false; A.tone(300, 0.25, { vol: 0.1, slideTo: 900 }); }
          else if (down && floor === 1) { pl.drop = 12; pl.vy = -1.5; pl.vx = 0; pl.on = false; A.tone(500, 0.2, { vol: 0.08, slideTo: 200 }); }
          else { pl.vy = -4.3; pl.vx = l ? -1.25 : r ? 1.25 : 0; pl.on = false; A.tone(260, 0.15, { vol: 0.08, slideTo: 600 }); }
        }
        physics(pl);
        if (pl.y > H + 10) { killPlayer('pit'); return; }
        // shooting
        const canFire = gun === 'mg' && ammo > 0 ? (api.key('Space') && pl.shootT === 0) : api.pressed('Space') && (ammo > 0 ? pbul.length < 3 : pbul.length === 0);
        if (canFire) {
          const low = pl.crouch;
          pbul.push({ x: pl.x + pl.face * 10, y: pl.y - (low ? 10 : 20) - (pl.on ? 0 : 0), vx: pl.face * 5, low });
          pl.shootT = gun === 'mg' && ammo > 0 ? 6 : 10;
          if (ammo > 0) { ammo--; if (ammo === 0) gun = 'pistol'; }
          A.noise(0.08, { vol: 0.14, freq: gun === 'mg' ? 3000 : 2000, slideTo: 400 });
          A.tone(gun === 'mg' ? 180 : 120, 0.05, { type: 'square', vol: 0.08 });
        }
      }
      function areaClear() {
        state = 'clear'; tmr = 0;
        A.melody([[523, .12], [659, .12], [784, .12], [1047, .24], [988, .12], [1047, .4]], { type: 'square', vol: .12 });
      }

      function updatePlay() {
        tmr++;
        updatePlayer();
        if (state !== 'play') return;
        camX = Math.max(0, Math.min(L - W, pl.x - W * 0.4));
        if (++timeTick >= 40) { timeTick = 0; time--; if (time <= 20 && time > 0) A.tone(1000, 0.05, { vol: 0.08 }); if (time <= 0 && !pl.dead) { pl.inv = 0; pl.hide = null; killPlayer('time'); } }
        for (const d of doors) { if (d.open > 0) d.open--; if (d.cd > 0) d.cd--; }
        if (--spawnT <= 0) { spawnEnemies(); spawnT = Math.max(40, 120 - area * 10) + Math.random() * 60; }
        for (const e of enemies) updateEnemy(e);
        enemies = enemies.filter(e => !(e.dead && e.dt > 40) && (e.k === 'boss' || (e.x > camX - 200 && e.x < camX + W + 200)));
        if (bossAlive && !enemies.some(e => e.k === 'boss' && !e.dead)) bossAlive = false;
        // player bullets
        for (const b of pbul) {
          b.x += b.vx;
          for (const c of crates) if (Math.abs(b.x - c.x) < c.w / 2 && b.y > F1 - c.h) b.hit = true;
          for (const e of enemies) {
            if (e.dead || b.hit || e.st === 'emerge') continue;
            const top = e.k === 'panther' ? e.y - 10 : e.crouch ? e.y - 15 : e.k === 'boss' ? e.y - 36 : e.y - 27;
            if (Math.abs(b.x - e.x) < (e.k === 'boss' ? 10 : 7) && b.y > top && b.y < e.y) {
              b.hit = true; e.hp--;
              if (e.hp <= 0) {
                e.dead = true; e.dt = 0;
                const pts = e.k === 'boss' ? 10000 : e.k === 'panther' ? 300 : MASK_COLS[e.col].pts;
                addScore(pts, e.x, e.y - 34);
                A.noise(0.2, { vol: 0.14, freq: 1200, slideTo: 200 });
                if (e.k === 'boss') { for (let i = 0; i < 6; i++) fx.push({ x: e.x + (Math.random() - 0.5) * 30, y: e.y - Math.random() * 30, t: -i * 6 }); }
              } else A.tone(900, 0.04, { vol: 0.08 });
            }
          }
        }
        pbul = pbul.filter(b => !b.hit && b.x > camX - 10 && b.x < camX + W + 10);
        // enemy bullets
        for (const b of ebul) {
          b.x += b.vx;
          for (const c of crates) if (Math.abs(b.x - c.x) < c.w / 2 && b.y > F1 - c.h) b.hit = true;
          if (!b.hit && !pl.hide && !pl.dead && Math.abs(b.x - pl.x) < 5) {
            const top = pl.crouch ? pl.y - 14 : pl.y - 27;
            if (b.y > top && b.y < pl.y) { b.hit = true; killPlayer('shot'); }
          }
        }
        ebul = ebul.filter(b => !b.hit && b.x > camX - 20 && b.x < camX + W + 20);
        // grenades
        for (const g of grenades) {
          g.t++; g.vy += 0.15; g.x += g.vx; g.y += g.vy;
          const fy = upperAt(g.x) && g.f <= F2 + 1 ? F2 : F1;
          if (g.y >= fy) { g.done = true; fx.push({ x: g.x, y: fy - 6, t: 0 }); A.noise(0.4, { vol: 0.2, freq: 700, slideTo: 80 }); if (Math.abs(pl.x - g.x) < 18 && Math.abs(pl.y - fy) < 10 && !pl.hide) killPlayer('blast'); }
        }
        grenades = grenades.filter(g => !g.done);
        for (const f of fx) f.t++; fx = fx.filter(f => f.t < 24);
        // contact
        if (!pl.dead) for (const e of enemies) {
          if (e.dead || e.st === 'emerge') continue;
          if (Math.abs(e.x - pl.x) < 10 && Math.abs(e.y - pl.y) < 16) { if (e.k === 'panther' && !pl.on) continue; hurt(); break; }
        }
        // goal also reachable by walking into it
        if (!pl.dead && pl.x >= L - 30 && pl.on && pl.y === F1 && !bossAlive) areaClear();
        if (bossAlive && pl.x > L - 60) pl.x = L - 60;
      }

      function tryStart() { if (api.useCredit()) { startGame(); return; } coinFlash = 90; A.tone(80, 0.25, { vol: 0.2 }); }

      function update() {
        if (coinFlash > 0) coinFlash--;
        for (const q of popups) q.t--; popups = popups.filter(q => q.t > 0);
        if (state === 'title') { attractT++; tmr++; if (api.anyPressed('Enter', 'Space')) tryStart(); return; }
        if (state === 'ready') { if (++tmr > 120) { state = 'play'; tmr = 0; } return; }
        if (state === 'play') {
          updatePlay();
          if (pl.dead > 100) {
            const respawn = () => { const keepAmmo = Math.max(ammo, 30); startArea(); ammo = keepAmmo; };
            if (lives > 0) { lives--; gun = 'pistol'; respawn(); }
            else {
              state = 'wait';
              const over = () => { state = 'gameover'; tmr = 0; api.setHiScore(score); };
              if (api.offerContinue) api.offerContinue(() => { lives = 2; gun = 'pistol'; respawn(); }, over); else over();
            }
          }
          return;
        }
        if (state === 'clear') {
          tmr++;
          if (tmr === 60) addScore(time * 10);
          if (tmr === 100) addScore(ammo * 10);
          if (tmr > 200) { area++; startArea(); }
          return;
        }
        if (state === 'gameover') { if (++tmr > 220) { state = 'title'; tmr = 0; attractT = 0; } return; }
      }

      // ================= Rendering =================
      function drawAgent(ctx, x, y, face, pose, anim, flash) {
        // pose: stand, walk, crouch, jump, shoot, crouchshoot, dead
        ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (face < 0) ctx.scale(-1, 1);
        const skin = '#f0b080', shirt = flash ? '#ff8080' : '#f0f0f0', pants = '#203060', hair = '#201810', shoe = '#402010';
        const cr = pose === 'crouch' || pose === 'crouchshoot';
        const oy = cr ? 10 : 0;
        if (pose === 'dead') {
          ctx.fillStyle = pants; ctx.fillRect(-14, -5, 10, 4); ctx.fillStyle = shirt; ctx.fillRect(-4, -6, 12, 5); ctx.fillStyle = skin; ctx.fillRect(8, -6, 5, 4); ctx.fillStyle = hair; ctx.fillRect(10, -7, 4, 2);
          ctx.restore(); return;
        }
        // legs
        ctx.fillStyle = pants;
        if (cr) { ctx.fillRect(-4, -10, 9, 5); ctx.fillRect(3, -6, 3, 6); ctx.fillRect(-5, -6, 3, 6); }
        else if (pose === 'jump') { ctx.fillRect(-4, -14, 4, 8); ctx.fillRect(1, -14, 4, 6); ctx.fillRect(3, -9, 4, 3); }
        else { const s = pose === 'walk' ? [[-1, 1], [2, -2], [0, 0], [-2, 2]][(anim >> 3) & 3] : [0, 0]; ctx.fillRect(-3 + s[0], -14, 3, 14); ctx.fillRect(1 + s[1], -14, 3, 14); ctx.fillStyle = shoe; ctx.fillRect(-4 + s[0], -2, 5, 2); ctx.fillRect(1 + s[1], -2, 5, 2); }
        // torso
        ctx.fillStyle = shirt; ctx.fillRect(-4, -26 + oy, 9, 13);
        ctx.fillStyle = '#c02020'; ctx.fillRect(0, -25 + oy, 1, 6);
        // head
        ctx.fillStyle = skin; ctx.fillRect(-2, -32 + oy, 6, 6);
        ctx.fillStyle = hair; ctx.fillRect(-3, -33 + oy, 7, 3); ctx.fillRect(-3, -31 + oy, 2, 3);
        ctx.fillStyle = '#000'; ctx.fillRect(3, -30 + oy, 1, 1);
        // arm and gun
        if (pose === 'shoot' || pose === 'crouchshoot') { ctx.fillStyle = shirt; ctx.fillRect(3, -24 + oy, 6, 3); ctx.fillStyle = skin; ctx.fillRect(9, -24 + oy, 2, 3); ctx.fillStyle = '#404040'; ctx.fillRect(10, -25 + oy, 4, 2); }
        else { ctx.fillStyle = shirt; ctx.fillRect(1, -24 + oy, 3, 9); ctx.fillStyle = skin; ctx.fillRect(1, -15 + oy, 3, 2); }
        ctx.restore();
      }
      function drawMasker(ctx, e) {
        const C = MASK_COLS[e.col];
        const x = Math.round(e.x - camX), y = Math.round(e.y);
        ctx.save(); ctx.translate(x, y); if (e.face < 0) ctx.scale(-1, 1);
        const big = e.k === 'boss' ? 1.35 : 1;
        if (big !== 1) ctx.scale(big, big);
        if (e.dead) {
          const k = Math.min(1, (e.dt || 0) / 20);
          ctx.globalAlpha = 1 - k * 0.7;
          ctx.fillStyle = C.body; ctx.fillRect(-12, -6, 22, 6); ctx.fillStyle = C.dark; ctx.fillRect(8, -8, 6, 6);
          ctx.globalAlpha = 1; ctx.restore(); return;
        }
        const cr = e.crouch && e.st === 'aim';
        const oy = cr ? 10 : 0;
        // legs
        ctx.fillStyle = C.dark;
        if (cr) { ctx.fillRect(-5, -10, 10, 5); ctx.fillRect(-5, -5, 3, 5); ctx.fillRect(3, -5, 3, 5); }
        else if (!e.on) { ctx.fillRect(-4, -14, 4, 8); ctx.fillRect(1, -12, 4, 6); }
        else { const s = [[-1, 1], [2, -2], [0, 0], [-2, 2]][((e.anim || 0) >> 3) & 3]; ctx.fillRect(-3 + s[0], -14, 3, 14); ctx.fillRect(1 + s[1], -14, 3, 14); }
        ctx.fillStyle = '#101010'; if (!cr && e.on) { ctx.fillRect(-4, -2, 5, 2); ctx.fillRect(1, -2, 5, 2); }
        // robe and hood
        ctx.fillStyle = C.body; ctx.fillRect(-5, -26 + oy, 10, 14); ctx.fillRect(-4, -31 + oy, 8, 5); ctx.fillRect(-3, -34 + oy, 5, 3); ctx.fillRect(-2, -36 + oy, 3, 2);
        ctx.fillStyle = '#000'; ctx.fillRect(1, -30 + oy, 2, 1); ctx.fillRect(-2, -30 + oy, 2, 1);
        ctx.fillStyle = '#ffe080'; ctx.fillRect(1, -30 + oy, 1, 1);
        ctx.fillStyle = C.dark; ctx.fillRect(-5, -14 + oy, 10, 2);
        if (e.st === 'aim') { ctx.fillStyle = C.body; ctx.fillRect(3, -24 + oy, 7, 3); ctx.fillStyle = '#303030'; ctx.fillRect(9, -25 + oy, 5, 2); }
        else { ctx.fillStyle = C.dark; ctx.fillRect(1, -24 + oy, 3, 9); }
        if (e.k === 'boss') { ctx.fillStyle = '#ffe040'; ctx.fillRect(-4, -26, 8, 2); }
        ctx.restore();
      }
      function drawPanther(ctx, e) {
        const x = Math.round(e.x - camX), y = Math.round(e.y);
        ctx.save(); ctx.translate(x, y); if (e.vx < 0) ctx.scale(-1, 1);
        if (e.dead) { ctx.fillStyle = '#202020'; ctx.fillRect(-12, -4, 24, 4); ctx.restore(); return; }
        const f = (e.t >> 2) & 1;
        ctx.fillStyle = '#181818'; ctx.fillRect(-11, -10, 20, 6); ctx.fillRect(7, -12, 7, 5); ctx.fillRect(-16, -11, 6, 2);
        ctx.fillRect(f ? -10 : -8, -4, 3, 4); ctx.fillRect(f ? 5 : 3, -4, 3, 4);
        ctx.fillStyle = '#ffe000'; ctx.fillRect(11, -11, 1, 1);
        ctx.restore();
      }
      function drawLevel(ctx) {
        // back wall
        ctx.fillStyle = area % 2 ? '#2a2018' : '#182028'; ctx.fillRect(0, 24, W, F1 - 24);
        const brick = area % 2 ? '#3a2c20' : '#223040';
        ctx.fillStyle = brick;
        const off = -Math.floor(camX * 0.9) % 32;
        for (let y = 30; y < F1; y += 12) for (let x = off - 32 + ((y / 12) & 1) * 16; x < W; x += 32) ctx.fillRect(x, y, 30, 10);
        // windows / pillars at parallax 1
        for (let i = Math.floor(camX / 160) - 1; i < Math.floor(camX / 160) + 3; i++) {
          const x = Math.round(i * 160 + 70 - camX);
          ctx.fillStyle = '#101418'; ctx.fillRect(x, 40, 30, 40); ctx.fillStyle = '#304860'; ctx.fillRect(x + 2, 42, 12, 17); ctx.fillRect(x + 16, 42, 12, 17); ctx.fillRect(x + 2, 61, 12, 17); ctx.fillRect(x + 16, 61, 12, 17);
        }
        // upper balconies
        for (const u of uppers) {
          const x0 = Math.round(u[0] - camX), x1 = Math.round(u[1] - camX);
          if (x1 < 0 || x0 > W) continue;
          ctx.fillStyle = '#707070'; ctx.fillRect(x0, F2, x1 - x0, 6); ctx.fillStyle = '#a0a0a0'; ctx.fillRect(x0, F2, x1 - x0, 1);
          ctx.fillStyle = '#404040'; ctx.fillRect(x0, F2 + 6, x1 - x0, 2);
          ctx.fillStyle = '#909090'; ctx.fillRect(x0, F2 - 14, x1 - x0, 2);
          for (let x = x0; x < x1; x += 8) ctx.fillRect(x, F2 - 12, 1, 12);
          ctx.fillStyle = '#505050'; for (let x = x0 + 20; x < x1 - 10; x += 80) ctx.fillRect(x, F2 + 8, 6, F1 - F2 - 8);
        }
        // floor
        ctx.fillStyle = '#5a5a5a'; ctx.fillRect(0, F1, W, H - F1); ctx.fillStyle = '#8a8a8a'; ctx.fillRect(0, F1, W, 2);
        ctx.fillStyle = '#404040'; for (let x = -Math.floor(camX) % 24; x < W; x += 24) ctx.fillRect(x, F1 + 2, 1, H - F1);
        for (const p of pits) { const x0 = Math.round(p[0] - camX); if (x0 > W || x0 + 60 < 0) continue; ctx.fillStyle = '#000'; ctx.fillRect(x0, F1, p[1] - p[0], H - F1); ctx.fillStyle = (api.frame >> 3) & 1 ? '#ff4010' : '#ff8020'; ctx.fillRect(x0, H - 6, p[1] - p[0], 6); }
        // doors
        for (const d of doors) {
          const x = Math.round(d.x - camX), fy = floorY(d.floor);
          if (x < -20 || x > W + 20) continue;
          const goal = d.kind === 'goal';
          ctx.fillStyle = goal ? '#c0a040' : '#5a3418'; ctx.fillRect(x - 11, fy - 38, 22, 38);
          const open = d.open > 0 || (pl && pl.hide === d);
          ctx.fillStyle = open ? '#000' : goal ? '#806020' : '#8a5428'; ctx.fillRect(x - 9, fy - 36, 18, 36);
          if (!open) { ctx.fillStyle = '#ffd040'; ctx.fillRect(x + 5, fy - 18, 2, 2); ctx.fillStyle = '#6a3c18'; ctx.fillRect(x - 7, fy - 33, 14, 12); ctx.fillRect(x - 7, fy - 18, 14, 14); }
          if (d.kind === 'bullets' || d.kind === 'arms') {
            ctx.fillStyle = d.used ? '#404040' : '#f0f0f0'; ctx.fillRect(x - 15, fy - 47, 30, 8);
            mini(ctx, d.kind === 'arms' ? 'ARMS' : 'BULLETS', x - (d.kind === 'arms' ? 8 : 14), fy - 46, d.used ? '#808080' : '#c02020');
          } else if (goal) { ctx.fillStyle = '#20c040'; ctx.fillRect(x - 13, fy - 47, 26, 8); mini(ctx, 'EXIT', x - 8, fy - 46, '#ffffff'); }
        }
        // crates
        for (const c of crates) {
          const x = Math.round(c.x - camX - c.w / 2); if (x > W || x + c.w < 0) continue;
          ctx.fillStyle = '#9a6a30'; ctx.fillRect(x, F1 - c.h, c.w, c.h); ctx.fillStyle = '#6a4418'; ctx.fillRect(x, F1 - c.h, c.w, 1); ctx.fillRect(x, F1 - 1, c.w, 1); ctx.fillRect(x, F1 - c.h, 1, c.h); ctx.fillRect(x + c.w - 1, F1 - c.h, 1, c.h);
          for (let k = 0; k < c.w; k += 2) ctx.fillRect(x + k, F1 - c.h + Math.floor(k * c.h / c.w), 2, 1);
        }
      }
      function drawActors(ctx) {
        for (const e of enemies) {
          if (e.st === 'emerge') { if (e.t < 12) continue; }
          if (e.k === 'panther') drawPanther(ctx, e); else drawMasker(ctx, e);
        }
        if (pl && !pl.hide && (pl.inv === 0 || (pl.inv >> 2) & 1 || pl.dead)) {
          let pose = 'stand';
          if (pl.dead) pose = 'dead';
          else if (!pl.on) pose = 'jump';
          else if (pl.crouch) pose = pl.shootT > 0 ? 'crouchshoot' : 'crouch';
          else if (pl.shootT > 0) pose = 'shoot';
          else if (api.key('ArrowLeft') || api.key('ArrowRight')) pose = 'walk';
          drawAgent(ctx, pl.x - camX, pl.y, pl.face, pose, pl.anim, pl.hurt > 0);
        }
        for (const b of pbul) { const x = Math.round(b.x - camX); ctx.fillStyle = '#ffff80'; ctx.fillRect(x - 2, Math.round(b.y), 5, 2); }
        for (const b of ebul) { const x = Math.round(b.x - camX); ctx.fillStyle = '#ff6040'; ctx.fillRect(x - 2, Math.round(b.y) - 1, 4, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, Math.round(b.y), 2, 1); }
        for (const g of grenades) { const x = Math.round(g.x - camX); ctx.fillStyle = '#304020'; ctx.fillRect(x - 2, Math.round(g.y) - 2, 4, 4); ctx.fillStyle = '#ff4000'; ctx.fillRect(x, Math.round(g.y) - 3, 1, 1); }
        for (const f of fx) { if (f.t < 0) continue; const x = Math.round(f.x - camX), r = Math.min(14, f.t); ctx.fillStyle = f.t < 8 ? '#ffffff' : f.t < 16 ? '#ffc020' : '#ff4010'; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.fillRect(Math.round(x + Math.cos(a) * r) - 2, Math.round(f.y + Math.sin(a) * r) - 2, 4, 4); } }
        for (const q of popups) txt(ctx, q.s, Math.round(q.x - camX), Math.round(q.y - (50 - q.t) / 3), '#ffffff', 1, 'c');
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 24);
        txt(ctx, '1UP', 8, 2, '#ff4040'); txt(ctx, String(score).padStart(7, ' '), 0, 12, '#ffffff');
        txt(ctx, 'HI', 88, 2, '#ff4040'); txt(ctx, String(hi).padStart(7, ' '), 72, 12, '#ffffff');
        if (state !== 'title') {
          txt(ctx, 'BULLET', 140, 2, gun === 'mg' && ammo > 0 ? '#40ff40' : '#40c0ff'); txt(ctx, String(ammo).padStart(3, ' '), 148, 12, ammo === 0 ? ((api.frame >> 3) & 1 ? '#ff4040' : '#000') : '#ffffff');
          txt(ctx, 'TIME', 200, 2, '#ffe040'); txt(ctx, String(Math.max(0, time)).padStart(3, ' '), 200, 12, time <= 20 && (api.frame & 16) ? '#ff4040' : '#ffffff');
          // life meter
          ctx.fillStyle = '#ffffff'; txt(ctx, 'L', 240, 2, '#ffffff');
          for (let i = 0; i < 2; i++) { ctx.fillStyle = i < life ? '#ff4040' : '#402020'; ctx.fillRect(250 + i * 10, 3, 8, 5); }
          for (let i = 0; i < Math.min(4, lives); i++) { ctx.fillStyle = '#f0f0f0'; ctx.fillRect(244 + i * 10, 13, 5, 7); ctx.fillStyle = '#201810'; ctx.fillRect(244 + i * 10, 12, 5, 2); }
          if (gun === 'mg' && ammo > 0) mini(ctx, 'MG', 176, 13, '#40ff40');
        }
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        // searchlight sweep
        const sx = W / 2 + Math.sin(attractT / 50) * 120;
        ctx.fillStyle = '#101820'; for (let y = 24; y < 170; y += 2) { const w = (y - 24) * 0.5; ctx.fillRect(Math.round(sx - w), y, Math.round(w * 2), 1); }
        txt(ctx, 'ROLLING', W / 2 + 2, 40, '#600000', 3, 'c'); txt(ctx, 'ROLLING', W / 2, 38, '#e02020', 3, 'c');
        txt(ctx, 'THUNDER', W / 2 + 2, 68, '#600000', 3, 'c'); txt(ctx, 'THUNDER', W / 2, 66, '#ffffff', 3, 'c');
        txt(ctx, 'AGENT ALBATROSS VS GELDRA', W / 2, 98, '#ffe040', 1, 'c');
        drawAgent(ctx, 90, 160, 1, (attractT >> 5) & 1 ? 'shoot' : 'stand', attractT, false);
        if ((attractT >> 5) & 1) { ctx.fillStyle = '#ffff80'; ctx.fillRect(110 + ((attractT * 4) % 60), 140, 5, 2); }
        const fake = { col: Math.floor(attractT / 120) % 4, face: -1, st: (attractT >> 5) & 1 ? 'aim' : 'walk', crouch: false, on: true, x: 200, y: 160, anim: attractT, dead: false };
        const sv = camX; camX = 0; drawMasker(ctx, fake); camX = sv;
        txt(ctx, 'UP AT A DOOR: HIDE / RELOAD', W / 2, 174, '#a0c0ff', 1, 'c');
        txt(ctx, 'UP+X: LEAP   DOWN+X: DROP', W / 2, 184, '#a0c0ff', 1, 'c');
        const blink = (attractT >> 5) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) txt(ctx, 'INSERT COIN', W / 2, 198, '#ff4040', 1, 'c'); }
        else if (blink) txt(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 198, '#ffffff', 1, 'c');
        txt(ctx, '\u00a9 1986 NAMCO', W / 2, 210, '#808080', 1, 'c');
        txt(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 8, H - 10, '#ffffff');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { drawTitle(ctx); drawHUD(ctx); return; }
        drawLevel(ctx); drawActors(ctx); drawHUD(ctx);
        if (state === 'ready') { ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(W / 2 - 70, 80, 140, 36); txt(ctx, 'AREA ' + area, W / 2, 86, '#ffffff', 1, 'c'); txt(ctx, area % 5 === 0 ? 'MABOO AWAITS' : 'GELDRA BASE', W / 2, 102, '#ffe040', 1, 'c'); }
        if (state === 'clear') {
          ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(W / 2 - 80, 70, 160, 60);
          txt(ctx, 'AREA ' + area + ' CLEAR', W / 2, 76, '#ffe040', 1, 'c');
          if (tmr > 60) txt(ctx, 'TIME BONUS ' + time * 10, W / 2, 96, '#ffffff', 1, 'c');
          if (tmr > 100) txt(ctx, 'BULLET BONUS ' + ammo * 10, W / 2, 110, '#ffffff', 1, 'c');
        }
        if (state === 'play' && pl.dead && pl.cause === 'time') txt(ctx, 'TIME OVER', W / 2, 90, '#ff4040', 1, 'c');
        if (state === 'play' && time <= 20 && time > 0 && (api.frame & 32)) txt(ctx, 'HURRY UP!', W / 2, 30, '#ff4040', 1, 'c');
        if (state === 'gameover') { ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 46, 96, 92, 16); txt(ctx, 'GAME OVER', W / 2, 100, '#ff4040', 1, 'c'); }
      }
      buildArea();
      pl = { x: 40, y: F1, vx: 0, vy: 0, on: true, face: 1, crouch: false, hide: null, anim: 0, inv: 0, dead: 0, shootT: 0, hurt: 0 };
      return { update, render, destroy() { } };
    }
  });
})();
