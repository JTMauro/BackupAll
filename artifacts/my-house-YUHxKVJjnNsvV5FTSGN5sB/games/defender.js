// Defender (Williams, 1981) \u2014 raster recreation
(function () {
  'use strict';
  const W = 320, H = 240, WW = 2048, TOP = 34, GROUND = 238;

  // ---------- 5x7 bitmap font ----------
  const FONT = {
    '0': '0E11131519110E', '1': '040C040404040E', '2': '0E11010204081F', '3': '1F0204020111 0E', '4': '02060A121F0202',
    '5': '1F101E0101110E', '6': '0608101E11110E', '7': '1F010204080808', '8': '0E11110E11110E', '9': '0E11110F01020C',
    A: '0E1111111F1111', B: '1E11111E11111E', C: '0E11101010110E', D: '1C121111 11121C', E: '1F10101E10101F',
    F: '1F10101E101010', G: '0E1110171111 0F', H: '1111111F111111', I: '0E04040404040E', J: '0702020202120C',
    K: '11121418141211', L: '1010101010101F', M: '111B1515111111', N: '11111915131111', O: '0E11111111110E',
    P: '1E11111E101010', Q: '0E111111151 20D', R: '1E11111E141211', S: '0F10100E01011E', T: '1F040404040404',
    U: '1111111111110E', V: '11111111110A04', W: '11111115151 50A', X: '11110A040A1111', Y: '1111110A040404',
    Z: '1F01020408101F', '-': '0000001F000000', '.': '00000000000C0C', ':': '000C0C000C0C00', '!': '04040404040004',
    '/': '01010204081010', '=': '00001F001F0000', '(': '02040808080402', ')': '08040202020408', ',': '00000000 0C0408',
    '?': '0E110102040004', 'x': '0000110A040A11', '>': '08040201020408', '<': '02040810080402', '+': '0004041F040400', "'": '04040800000000'
  };
  for (const k in FONT) FONT[k] = FONT[k].replace(/ /g, '');
  function textW(s, sc) { return String(s).length * 6 * sc - sc; }
  function drawText(ctx, s, x, y, col, sc, align) {
    s = String(s).toUpperCase(); sc = sc || 1;
    if (align === 'center') x = Math.round(x - textW(s, sc) / 2); else if (align === 'right') x = Math.round(x - textW(s, sc));
    for (const ch of s) {
      const g = FONT[ch];
      if (g) {
        for (let r = 0; r < 7; r++) {
          const bits = parseInt(g.substr(r * 2, 2), 16);
          ctx.fillStyle = typeof col === 'function' ? col(r) : col;
          for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + c * sc, y + r * sc, sc, sc);
        }
      }
      x += 6 * sc;
    }
  }

  // ---------- pixel art ----------
  const PAL = {
    W: '#ffffff', w: '#a8a8c8', R: '#ff2020', r: '#b00000', Y: '#ffff40', G: '#20ff20', g: '#00a000', M: '#ff30ff',
    P: '#a040ff', B: '#4060ff', b: '#2020a0', C: '#40ffff', O: '#ff9020', o: '#c05000', K: '#202020'
  };
  const SPR = {
    ship: [
      'WW..............',
      'WWW.............',
      'WWWWW.CC........',
      'WWWWWWWWWWWWW...',
      'MMWWWWWWWWWWWWWW',
      'MMMMMWWWWWwww...',
      '..MMMMMM........'
    ],
    lander0: [
      '...GGG...',
      '..GgGgG..',
      '.GGGGGGG.',
      '.YGYGYGY.',
      '..YYYYY..',
      '.Y..Y..Y.',
      'Y...Y...Y'
    ],
    lander1: [
      '...GGG...',
      '..GgGgG..',
      '.GGGGGGG.',
      '.GYGYGYG.',
      '..YYYYY..',
      '.Y..Y..Y.',
      '.Y..Y..Y.'
    ],
    mutant0: [
      '...MGM...',
      '..GMGMG..',
      '.MGMMMGM.',
      '.GMGMGMG.',
      '..MMGMM..',
      '.M..G..M.',
      'G...M...G'
    ],
    mutant1: [
      '...GMG...',
      '..MGMGM..',
      '.GMGGGMG.',
      '.MGMGMGM.',
      '..GGMGG..',
      '.G..M..G.',
      '.M..G..M.'
    ],
    bomber0: ['BBBBBBB', 'BY.Y.YB', 'B.Y.Y.B', 'BY.Y.YB', 'B.Y.Y.B', 'BY.Y.YB', 'BBBBBBB'],
    bomber1: ['BBBBBBB', 'B.Y.Y.B', 'BY.Y.YB', 'B.Y.Y.B', 'BY.Y.YB', 'B.Y.Y.B', 'BBBBBBB'],
    pod0: ['P..P..P', '.P.R.P.', '..RRR..', 'PRRWRRP', '..RRR..', '.P.R.P.', 'P..P..P'],
    pod1: ['...P...', '.P.R.P.', '..RRR..', 'PRRYRRP', '..RRR..', '.P.R.P.', '...P...'],
    swarmer0: ['..R..', '.RRR.', 'RRYRR', '.R.R.'],
    swarmer1: ['..R..', '.ROR.', 'RRRRR', 'R...R'],
    baiter0: ['...GGGGGGG...', '.GGGGGGGGGGG.', 'GYGGYGGGYGGYG', '.GGGGGGGGGGG.', '...GGGGGGG...'],
    baiter1: ['...GGGGGGG...', '.GGGGGGGGGGG.', 'GGYGGGYGGGYGG', '.GGGGGGGGGGG.', '...GGGGGGG...'],
    human0: ['.Y.', 'MYM', 'MMM', 'M.M', '.M.', 'G.G', 'G.G'],
    human1: ['.Y.', 'MYM', 'MMM', 'M.M', '.M.', '.G.', 'G.G'],
    shipIcon: ['WW......', 'WWWWWWW.', 'MMWWWWWW', '.MMM....'],
    bombIcon: ['.RR.', 'RRRR', '.RR.']
  };
  function makeSprite(rows, flip) {
    const h = rows.length, w = rows[0].length;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    const px = [];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const ch = rows[j][flip ? w - 1 - i : i];
      if (ch !== '.') { x.fillStyle = PAL[ch]; x.fillRect(i, j, 1, 1); px.push([i - w / 2, j - h / 2, PAL[ch]]); }
    }
    return { c, w, h, px };
  }

  ArcadeRegistry.register({
    id: 'defender', title: 'Defender', year: 1981, maker: 'Williams',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Up/Down: climb \u00b7 Left/Right: thrust (opposite arrow reverses) \u00b7 Space: fire \u00b7 Z: smart bomb \u00b7 X: hyperspace',
    marquee: { bg: '#000', fg: '#ff9020', accent: '#ff2020' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      const ri = n => (Math.random() * n) | 0;
      const S = {};
      for (const k in SPR) { S[k] = makeSprite(SPR[k], false); S[k + 'L'] = makeSprite(SPR[k], true); }
      const wrapX = x => ((x % WW) + WW) % WW;
      const dwx = (a, b) => { let d = (a - b) % WW; if (d > WW / 2) d -= WW; else if (d < -WW / 2) d += WW; return d; };

      // terrain
      const terr = new Int16Array(WW);
      (function genTerrain() {
        let h = 222, x = 0;
        while (x < WW) {
          const len = 3 + ri(ri(4) ? 14 : 30); let s = [-1, 1, 1, -1, 0][ri(5)];
          if (h < 200) s = 1; if (h > 232) s = -1;
          for (let i = 0; i < len && x < WW; i++, x++) { h = Math.max(196, Math.min(234, h + (s === 0 ? 0 : s))); terr[x] = h; }
        }
        // make seamless
        const fix = 80, a = terr[WW - fix], b = terr[0];
        for (let i = 0; i < fix; i++) terr[WW - fix + i] = Math.round(a + (b - a) * i / fix);
      })();
      const stars = [];
      for (let i = 0; i < 40; i++) stars.push({ x: rnd(0, 640), y: rnd(TOP + 2, 190), c: ['#ff2020', '#ffff40', '#4060ff', '#ff30ff', '#ffffff'][ri(5)] });

      let hi = api.getHiScore(21270);
      let state = 'attract', stT = 0;
      let coinFlash = 0, coinHold = 0, lastCredits = api.credits;
      let ship, camX = 0, score = 0, lives = 3, bombs = 3, nextBonus = 10000, wave = 0, planet = true;
      let enemies = [], humans = [], lasers = [], bullets = [], mines = [], parts = [];
      let landersLeft = 0, spawnT = 0, waveT = 0, baiterT = 0, flash = 0, deadT = 0, bonusT = 0, bonusShown = 0;
      let thrustSnd = 0;

      function newShip() {
        ship = { x: wrapX(camX + 70), y: 120, vx: 0, face: 1, sx: 70, alive: true, hyper: 0, carry: [], thrust: false };
      }
      function startGame() {
        state = 'play'; stT = 0; score = 0; lives = 3; bombs = 3; nextBonus = 10000; wave = 0; planet = true;
        camX = 0; newShip(); humans = []; startWave();
      }
      function startWave() {
        wave++;
        enemies = []; bullets = []; mines = []; lasers = [];
        if (wave === 1 || (wave - 1) % 5 === 0 || humans.length === 0 && planet) {
          planet = true; humans = [];
          for (let i = 0; i < 10; i++) humans.push({ x: rnd(0, WW), y: GROUND - 3, st: 'walk', vx: Math.random() < 0.5 ? -0.08 : 0.08, vy: 0, fy: 0 });
        }
        landersLeft = wave === 1 ? 15 : 20; spawnT = 60; waveT = 0; baiterT = 0;
        const nb = Math.min(6, wave === 1 ? 2 : wave + 1), np = Math.min(4, wave);
        for (let i = 0; i < nb; i++) spawn('B', farX(), rnd(70, 170));
        for (let i = 0; i < np; i++) spawn('P', farX(), rnd(60, 180));
        A.melody([[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.25]], { type: 'square', vol: 0.08 });
      }
      function farX() { return wrapX(ship.x + (Math.random() < 0.5 ? 1 : -1) * rnd(260, WW / 2)); }
      function spawn(t, x, y) {
        const e = { t, x: wrapX(x), y, vx: 0, vy: 0, tt: ri(1000), appear: 40, fireT: rnd(60, 200) };
        if (t === 'L') { e.vx = (Math.random() < 0.5 ? -1 : 1) * rnd(0.4, 0.9); e.st = 'seek'; e.target = null; e.baseY = y; }
        if (t === 'B') { e.vx = (Math.random() < 0.5 ? -1 : 1) * rnd(0.5, 0.9); e.baseY = y; e.mineT = rnd(30, 90); e.appear = 0; }
        if (t === 'P') { e.vx = rnd(-0.4, 0.4); e.vy = rnd(-0.3, 0.3); e.appear = 0; }
        if (t === 'S') { e.vx = rnd(-2, 2); e.vy = rnd(-1, 1); e.appear = 0; }
        if (t === 'T') { e.appear = 20; }
        if (t === 'M') { e.appear = 0; }
        enemies.push(e);
        if (e.appear && Math.abs(dwx(e.x, camX + W / 2)) < 200) A.tone(300, 0.4, { type: 'triangle', vol: 0.05, slideTo: 1200 });
        return e;
      }
      function spriteFor(e) {
        const f = (api.frame >> 3) & 1;
        switch (e.t) {
          case 'L': return S['lander' + f];
          case 'M': return S['mutant' + ((api.frame >> 2) & 1)];
          case 'B': return S['bomber' + ((api.frame >> 4) & 1)];
          case 'P': return S['pod' + ((api.frame >> 4) & 1)];
          case 'S': return S['swarmer' + f];
          case 'T': return S['baiter' + ((api.frame >> 2) & 1)];
        }
      }
      const PTS = { L: 150, M: 150, B: 250, P: 1000, S: 150, T: 200 };

      function addScore(n) {
        score += n;
        while (score >= nextBonus) {
          nextBonus += 10000; lives = Math.min(lives + 1, 9); bombs = Math.min(bombs + 1, 9);
          A.melody([[880, 0.08], [1175, 0.08], [1760, 0.16]], { type: 'square', vol: 0.09 });
        }
      }
      function explodeSprite(spr, x, y, mult) {
        for (const [px, py, c] of spr.px) {
          if (parts.length > 600) break;
          const a = Math.atan2(py + 0.01, px + 0.01), d = Math.hypot(px, py) * 0.25 + rnd(0.6, 1.6) * (mult || 1);
          parts.push({ x: x + px, y: y + py, vx: Math.cos(a) * d, vy: Math.sin(a) * d, c, t: rnd(26, 46) });
        }
      }
      function killEnemy(i, pts) {
        const e = enemies[i];
        if (e.target && e.target.claimed === e) e.target.claimed = null;
        explodeSprite(spriteFor(e), e.x, e.y, 1.3);
        enemies.splice(i, 1);
        if (pts) addScore(PTS[e.t]);
        if (e.t === 'L' && e.hold) { e.hold.st = 'fall'; e.hold.vy = 0; e.hold.fy = e.hold.y; e.hold = null; }
        if (e.t === 'P' && pts) {
          const n = 4 + ri(3);
          for (let k = 0; k < n; k++) spawn('S', e.x + rnd(-4, 4), e.y + rnd(-4, 4));
        }
        A.noise(0.35, { freq: 2400, slideTo: 150, vol: 0.3 });
      }
      function killShip() {
        if (!ship.alive) return;
        ship.alive = false; deadT = 170; flash = 6;
        for (let k = 0; k < 3; k++) explodeSprite(S.ship, ship.x, ship.y, 1.5 + k);
        for (let k = 0; k < 60; k++) { const a = Math.random() * 6.28, s = rnd(0.5, 3.5); parts.push({ x: ship.x, y: ship.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, c: ['#ffffff', '#ff2020', '#ffff40', '#ff30ff'][ri(4)], t: rnd(40, 80) }); }
        for (const h of ship.carry) { h.st = 'fall'; h.vy = 0; h.fy = h.y; }
        ship.carry = []; bullets = []; mines = [];
        A.noise(2.0, { freq: 3000, slideTo: 40, vol: 0.5 });
        A.tone(1200, 1.6, { type: 'sawtooth', vol: 0.1, slideTo: 50 });
      }
      function fireAt(e, sp) {
        if (bullets.length > 24 || !ship.alive) return;
        const dx = dwx(ship.x, e.x), dy = ship.y - e.y;
        const t = Math.hypot(dx, dy) / sp;
        const lx = dx + ship.vx * t * 0.6;
        const d = Math.hypot(lx, dy) || 1;
        bullets.push({ x: e.x, y: e.y, vx: lx / d * sp, vy: dy / d * sp, t: 200 });
        A.tone(1400, 0.05, { type: 'square', vol: 0.025, slideTo: 900 });
      }
      const screenX = x => dwx(x, camX + W / 2) + W / 2;
      const visibleX = (x, m) => { const s = screenX(x); return s > -m && s < W + m; };

      function planetDies() {
        planet = false; flash = 30;
        A.noise(2.5, { freq: 800, slideTo: 30, vol: 0.6 });
        for (let x = 0; x < WW; x += 6) if (visibleX(x, 0)) parts.push({ x, y: terr[x], vx: rnd(-1, 1), vy: rnd(-2.5, -0.2), c: '#ff9020', t: rnd(40, 90) });
        for (const e of enemies) if (e.t === 'L') { e.t = 'M'; e.hold = null; }
      }

      // ---------- update ----------
      function updShip() {
        if (!ship.alive) {
          if (--deadT <= 0) {
            const respawn = () => {
              const cx = camX; newShip(); ship.x = wrapX(cx + 70); camX = cx;
              enemies = enemies.filter(e => e.t !== 'S' && e.t !== 'T');
              for (const e of enemies) if (visibleX(e.x, 60)) e.x = farX();
            };
            if (lives <= 1) {
              lives = 0;
              const gameOver = () => { state = 'gameover'; stT = 0; if (score > hi) { hi = score; api.setHiScore(score); } };
              // continue: 3 fresh ships (and at least 3 smart bombs) in the same wave, score/humanoids kept
              if (api.offerContinue) api.offerContinue(() => { lives = 3; bombs = Math.max(bombs, 3); respawn(); }, gameOver);
              else gameOver();
              return;
            }
            lives--; respawn();
          }
          return;
        }
        if (ship.hyper > 0) { if (--ship.hyper === 0 && Math.random() < 0.2) killShip(); return; }
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight');
        if (api.pressed('ArrowLeft') && ship.face === 1) ship.face = -1;
        if (api.pressed('ArrowRight') && ship.face === -1) ship.face = 1;
        ship.thrust = (ship.face === 1 && R) || (ship.face === -1 && L);
        if (ship.thrust) { ship.vx += ship.face * 0.22; if (--thrustSnd <= 0) { thrustSnd = 6; A.noise(0.12, { freq: 500, vol: 0.12 }); } }
        else ship.vx *= 0.975;
        ship.vx = Math.max(-6.5, Math.min(6.5, ship.vx));
        if (api.key('ArrowUp')) ship.y -= 2.4;
        if (api.key('ArrowDown')) ship.y += 2.4;
        ship.y = Math.max(TOP + 5, Math.min(GROUND - 6, ship.y));
        ship.x = wrapX(ship.x + ship.vx);
        const target = ship.face === 1 ? 64 : W - 64;
        const ds = target - ship.sx;
        ship.sx += Math.max(-3.5, Math.min(3.5, ds));
        camX = wrapX(ship.x - ship.sx);
        if (api.pressed('Space') && lasers.length < 4) {
          lasers.push({ x: wrapX(ship.x + ship.face * 9), y: Math.round(ship.y + 1), dir: ship.face, len: 6, t: 0, hue: ri(6) });
          A.tone(2400, 0.12, { type: 'sawtooth', vol: 0.06, slideTo: 500 });
        }
        if (api.pressed('KeyZ') && bombs > 0) {
          bombs--; flash = 5;
          A.noise(0.9, { freq: 5000, slideTo: 100, vol: 0.55 });
          for (let i = enemies.length - 1; i >= 0; i--) if (visibleX(enemies[i].x, 0) && enemies[i].appear <= 0) killEnemy(i, true);
          bullets = bullets.filter(b => !visibleX(b.x, 0));
        }
        if (api.pressed('KeyX')) {
          ship.x = wrapX(ship.x + rnd(400, WW - 400)); ship.y = rnd(60, 200); ship.vx = 0; ship.hyper = 30; ship.sx = ship.face === 1 ? 64 : W - 64;
          camX = wrapX(ship.x - ship.sx);
          A.tone(200, 0.4, { type: 'sawtooth', vol: 0.1, slideTo: 2000 });
        }
        // carried humanoids
        for (const h of ship.carry) { h.x = wrapX(ship.x - ship.face * 2); h.y = ship.y + 7; }
        if (ship.carry.length && ship.y >= GROUND - 14) {
          for (const h of ship.carry) { h.st = 'walk'; h.y = GROUND - 3; addScore(500); popup(h.x, h.y - 10, '500'); }
          ship.carry = []; A.melody([[784, 0.07], [1047, 0.1]], { type: 'square', vol: 0.08 });
        }
      }
      const popups = [];
      function popup(x, y, s) { if (popups.length < 8) popups.push({ x, y, s, t: 60 }); }

      function updLasers() {
        for (let i = lasers.length - 1; i >= 0; i--) {
          const l = lasers[i]; l.t++; l.len += 15;
          const head = l.x + l.dir * l.len;
          const hsx = screenX(head);
          let hit = false;
          for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j]; if (e.appear > 0) continue;
            const spr = spriteFor(e);
            if (Math.abs(e.y - l.y) > spr.h / 2 + 1) continue;
            const d = dwx(e.x, l.x) * l.dir;
            if (d > -spr.w / 2 && d < l.len + spr.w / 2) { killEnemy(j, true); hit = true; break; }
          }
          if (hit || l.t > 24 || hsx < -40 || hsx > W + 40) lasers.splice(i, 1);
        }
      }

      function updEnemies() {
        for (let i = enemies.length - 1; i >= 0; i--) {
          const e = enemies[i]; e.tt++;
          if (e.appear > 0) { e.appear--; continue; }
          const dx = dwx(ship.x, e.x), vis = visibleX(e.x, 0);
          switch (e.t) {
            case 'L': {
              if (e.st === 'seek') {
                if (!e.target || e.target.st !== 'walk' || e.target.claimed !== e) {
                  e.target = null;
                  if (planet && Math.random() < 0.01) {
                    const free = humans.filter(h => h.st === 'walk' && (!h.claimed || h.claimed.t !== 'L' || !enemies.includes(h.claimed)));
                    if (free.length) { e.target = free[ri(free.length)]; e.target.claimed = e; }
                  }
                }
                if (e.target) {
                  const tdx = dwx(e.target.x, e.x);
                  e.x = wrapX(e.x + Math.max(-1, Math.min(1, tdx)) * 0.9);
                  if (Math.abs(tdx) < 2) e.st = 'down';
                  e.y += Math.sign(110 - e.y) * 0.3;
                } else {
                  e.x = wrapX(e.x + e.vx);
                  e.y = e.baseY + Math.sin(e.tt * 0.03) * 20;
                }
              } else if (e.st === 'down') {
                const h = e.target;
                if (!h || h.st !== 'walk') { e.st = 'seek'; e.target = null; break; }
                e.x = wrapX(e.x + Math.max(-0.5, Math.min(0.5, dwx(h.x, e.x))));
                e.y += 0.7;
                if (e.y >= h.y - 8) { h.st = 'held'; e.hold = h; e.st = 'up'; if (visibleX(e.x, 80)) A.tone(600, 0.5, { type: 'square', vol: 0.06, slideTo: 300 }); }
              } else if (e.st === 'up') {
                e.y -= 0.45;
                if (e.hold) { e.hold.x = e.x; e.hold.y = e.y + 8; if (e.tt % 30 === 0 && visibleX(e.x, 120)) A.tone(e.tt % 60 ? 900 : 700, 0.12, { type: 'square', vol: 0.05 }); }
                if (e.y <= TOP + 8) {
                  if (e.hold) { const h = e.hold; h.st = 'dead'; explodeSprite(S.human0, h.x, h.y, 1); e.hold = null; }
                  e.t = 'M'; A.tone(200, 0.4, { type: 'sawtooth', vol: 0.08, slideTo: 1500 });
                  humans = humans.filter(h => h.st !== 'dead');
                  if (humans.length === 0 && planet) planetDies();
                }
              }
              if (vis && --e.fireT <= 0) { e.fireT = rnd(70, 160) - wave * 4; fireAt(e, 1.8 + wave * 0.1); }
              break;
            }
            case 'M': {
              e.vx += Math.sign(dx) * 0.18; e.vx = Math.max(-3.2, Math.min(3.2, e.vx));
              e.x = wrapX(e.x + e.vx + rnd(-1, 1));
              e.y += Math.sign(ship.y - e.y + rnd(-30, 30)) * 1.2 + rnd(-1.2, 1.2);
              e.y = Math.max(TOP + 4, Math.min(GROUND - 6, e.y));
              if (vis && --e.fireT <= 0) { e.fireT = rnd(50, 110); fireAt(e, 2.4); }
              break;
            }
            case 'B': {
              e.x = wrapX(e.x + e.vx); e.y = e.baseY + Math.sin(e.tt * 0.02) * 30;
              if (--e.mineT <= 0 && Math.abs(dx) < 500) { e.mineT = rnd(40, 80); if (mines.length < 30) mines.push({ x: e.x, y: e.y, t: 400 }); }
              break;
            }
            case 'P': {
              e.x = wrapX(e.x + e.vx); e.y += e.vy;
              if (e.y < TOP + 10 || e.y > 190) e.vy = -e.vy;
              break;
            }
            case 'S': {
              e.vx += Math.sign(dx) * 0.12; e.vx = Math.max(-3.8, Math.min(3.8, e.vx));
              e.x = wrapX(e.x + e.vx); e.y += Math.sin(e.tt * 0.08) * 1.6 + Math.sign(ship.y - e.y) * 0.5;
              e.y = Math.max(TOP + 4, Math.min(GROUND - 6, e.y));
              if (vis && --e.fireT <= 0 && Math.sign(e.vx) === Math.sign(dx)) { e.fireT = rnd(60, 140); fireAt(e, 2.6); }
              break;
            }
            case 'T': {
              const want = ship.vx + Math.sign(dx) * 1.8;
              e.vx += (want - e.vx) * 0.08; e.x = wrapX(e.x + e.vx);
              e.y += Math.sign(ship.y - 20 * Math.sin(e.tt * 0.05) - e.y) * 1.3;
              if (vis && --e.fireT <= 0) { e.fireT = rnd(30, 60); fireAt(e, 3); }
              break;
            }
          }
          // collision with ship
          if (ship.alive && !ship.hyper && e.appear <= 0) {
            const spr = spriteFor(e);
            if (Math.abs(dwx(e.x, ship.x)) < spr.w / 2 + 7 && Math.abs(e.y - ship.y) < spr.h / 2 + 3) { killEnemy(i, true); killShip(); }
          }
        }
      }

      function updHumans() {
        for (let i = humans.length - 1; i >= 0; i--) {
          const h = humans[i];
          if (h.st === 'walk') {
            h.x = wrapX(h.x + h.vx); h.y = GROUND - 3;
            if (Math.random() < 0.004) h.vx = -h.vx;
          } else if (h.st === 'fall') {
            h.vy = Math.min(2.2, h.vy + 0.035); h.y += h.vy;
            if (ship.alive && !ship.hyper && Math.abs(dwx(h.x, ship.x)) < 9 && Math.abs(h.y - ship.y) < 9) {
              h.st = 'carried'; ship.carry.push(h); addScore(500); popup(h.x, h.y - 10, '500');
              A.melody([[523, 0.06], [659, 0.06], [784, 0.1]], { type: 'square', vol: 0.08 });
            } else if (h.y >= GROUND - 3) {
              h.y = GROUND - 3;
              if (h.y - h.fy > 80) {
                h.st = 'dead'; explodeSprite(S.human0, h.x, h.y, 1); A.noise(0.4, { freq: 900, vol: 0.2 });
              } else { h.st = 'walk'; addScore(250); popup(h.x, h.y - 10, '250'); }
            }
          }
          if (h.st === 'dead') { humans.splice(i, 1); h.claimed = null; if (humans.length === 0 && planet) planetDies(); }
        }
      }

      function updMisc() {
        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i]; b.x = wrapX(b.x + b.vx); b.y += b.vy;
          if (ship.alive && !ship.hyper && Math.abs(dwx(b.x, ship.x)) < 7 && Math.abs(b.y - ship.y) < 3.5) { bullets.splice(i, 1); killShip(); break; }
          if (--b.t <= 0 || b.y < TOP || b.y > GROUND || !visibleX(b.x, 40)) bullets.splice(i, 1);
        }
        for (let i = mines.length - 1; i >= 0; i--) {
          const m = mines[i];
          if (ship.alive && !ship.hyper && Math.abs(dwx(m.x, ship.x)) < 7 && Math.abs(m.y - ship.y) < 4) { mines.splice(i, 1); killShip(); break; }
          if (--m.t <= 0) mines.splice(i, 1);
        }
        for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x = wrapX(p.x + p.vx); p.y += p.vy; if (--p.t <= 0) parts.splice(i, 1); }
        for (let i = popups.length - 1; i >= 0; i--) if (--popups[i].t <= 0) popups.splice(i, 1);
      }

      function update() {
        stT++;
        if (flash > 0) flash--;
        if (coinFlash > 0) coinFlash--;
        if (coinHold > 0) coinHold--;
        const cr = api.credits;
        if (state === 'attract') {
          camX = wrapX(camX + 1.5);
          for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx; p.y += p.vy; if (--p.t <= 0) parts.splice(i, 1); }
          if (lastCredits === 0 && cr > 0) { stT = 0; coinHold = 150; coinFlash = 0; }   // coin in: back to the start page
          lastCredits = cr;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { lastCredits = api.credits; startGame(); }
            else { coinFlash = 150; stT = 0; A.tone(70, 0.28, { type: 'square', vol: 0.3 }); A.tone(58, 0.28, { type: 'sawtooth', vol: 0.15 }); }
          }
          return;
        }
        lastCredits = cr;
        if (state === 'gameover') {
          updMisc();
          if (stT > 240 || (stT > 60 && api.anyPressed('Enter', 'Space'))) { state = 'attract'; stT = 0; enemies = []; parts = []; }
          return;
        }
        if (state === 'bonus') {
          if (--bonusT <= 0) { startWave(); state = 'play'; }
          if (bonusT === 150 || (bonusT < 150 && bonusShown < humans.length && bonusT % 8 === 0)) {
            if (bonusT < 150) { bonusShown++; addScore(Math.min(5, wave) * 100); A.tone(1200 + bonusShown * 60, 0.05, { type: 'square', vol: 0.07 }); }
          }
          updMisc();
          return;
        }
        waveT++;
        updShip();
        if (state !== 'play') return;
        updLasers(); updEnemies(); updHumans(); updMisc();
        // spawn landers in groups
        if (landersLeft > 0 && (--spawnT <= 0 || enemies.filter(e => e.t === 'L' || e.t === 'M').length < 2)) {
          const n = Math.min(5, landersLeft); landersLeft -= n; spawnT = 900;
          for (let k = 0; k < n; k++) spawn(planet ? 'L' : 'M', farX(), rnd(50, 110));
        }
        // baiters if dawdling
        if (waveT > 2400 && ++baiterT > 500 && enemies.filter(e => e.t === 'T').length < 2) {
          baiterT = 0; const b = spawn('T', wrapX(ship.x + (Math.random() < 0.5 ? 140 : -140)), rnd(60, 160)); b.vx = ship.vx;
        }
        if (landersLeft === 0 && !enemies.some(e => e.t === 'L' || e.t === 'M') && ship.alive) {
          state = 'bonus'; bonusT = 240; bonusShown = 0; bullets = []; mines = [];
          A.melody([[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.3]], { type: 'square', vol: 0.09 });
        }
      }

      // ---------- render ----------
      function blit(ctx, spr, x, y) { ctx.drawImage(spr.c, Math.round(x - spr.w / 2), Math.round(y - spr.h / 2)); }
      function drawWorld(ctx) {
        // stars (parallax)
        for (const s of stars) {
          const sx = ((s.x - camX * 0.4) % 640 + 640) % 640;
          if (sx < W && ((api.frame + s.x) & 63) > 4) { ctx.fillStyle = s.c; ctx.fillRect(sx | 0, s.y | 0, 1, 1); }
        }
        // terrain
        if (planet) {
          ctx.fillStyle = '#c86414';
          let prev = null;
          for (let sx = 0; sx < W; sx++) {
            const h = terr[wrapX(Math.floor(camX) + sx)];
            if (prev !== null && Math.abs(h - prev) > 1) ctx.fillRect(sx, Math.min(h, prev), 1, Math.abs(h - prev));
            else ctx.fillRect(sx, h, 1, 1);
            prev = h;
          }
        }
        // humans
        for (const h of humans) {
          const sx = screenX(h.x); if (sx < -6 || sx > W + 6) continue;
          blit(ctx, S['human' + ((h.st === 'walk' && (api.frame >> 4) & 1) ? 1 : 0)], sx, h.y - 1);
        }
        // mines
        for (const m of mines) {
          const sx = screenX(m.x); if (sx < -4 || sx > W + 4) continue;
          ctx.fillStyle = (api.frame & 4) ? '#ffff40' : '#ff30ff';
          ctx.fillRect(Math.round(sx) - 1, Math.round(m.y), 3, 1); ctx.fillRect(Math.round(sx), Math.round(m.y) - 1, 1, 3);
        }
        // enemies
        for (const e of enemies) {
          const sx = screenX(e.x); if (sx < -16 || sx > W + 16) continue;
          const spr = spriteFor(e);
          if (e.appear > 0) {
            const k = 1 + e.appear * 0.18;
            for (const [px, py, c] of spr.px) { ctx.fillStyle = c; ctx.fillRect(Math.round(sx + px * k), Math.round(e.y + py * k), 1, 1); }
          } else blit(ctx, spr, sx, e.y);
        }
        // bullets
        for (const b of bullets) {
          const sx = screenX(b.x);
          ctx.fillStyle = ['#ffffff', '#ffff40', '#ff30ff', '#40ffff'][(api.frame >> 1) & 3];
          ctx.fillRect(Math.round(sx), Math.round(b.y), 2, 2);
        }
        // lasers
        const LC = ['#ffffff', '#ff30ff', '#40ffff', '#ffff40', '#ff2020', '#20ff20'];
        for (const l of lasers) {
          const sx = screenX(l.x);
          for (let k = 0; k < l.len; k += 2) {
            const frac = k / l.len;
            // the tail breaks up into dashes as it fades, the head stays solid
            if (frac < 0.4 && (((k >> 2) + l.t) % 4) < (l.t > 12 ? 3 : 1)) continue;
            ctx.fillStyle = frac > 0.9 ? '#ffffff' : LC[(l.hue + ((k >> 4) % 6)) % 6];
            ctx.fillRect(Math.round(sx + l.dir * k), l.y, 2, 1);
          }
        }
        // ship
        if (state === 'play' || state === 'bonus') {
          if (ship.alive && !ship.hyper) {
            const sx = screenX(ship.x);
            blit(ctx, ship.face === 1 ? S.ship : S.shipL, sx, ship.y);
            if (ship.thrust || Math.abs(ship.vx) > 0.5) {
              const fl = ship.thrust ? 3 + ri(4) : 1 + ri(2), bx = Math.round(sx - ship.face * 9);
              const cols = ['#ffff40', '#ff9020', '#ff2020'];
              for (let k = 0; k < fl; k++) { ctx.fillStyle = cols[Math.min(2, k >> 1)]; ctx.fillRect(bx - ship.face * k, Math.round(ship.y) + (k & 1), 1, 1); }
            }
          }
        }
        // particles
        for (const p of parts) {
          const sx = screenX(p.x); if (sx < 0 || sx > W) continue;
          ctx.fillStyle = p.c; ctx.fillRect(Math.round(sx), Math.round(p.y), p.t > 20 ? 2 : 1, 1);
        }
        for (const p of popups) drawText(ctx, p.s, screenX(p.x), p.y | 0, '#ffffff', 1, 'center');
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, TOP);
        // frame
        ctx.fillStyle = '#2040ff';
        ctx.fillRect(0, 32, W, 1);
        ctx.fillRect(96, 0, 1, 32); ctx.fillRect(224, 0, 1, 32); ctx.fillRect(96, 0, 129, 1);
        // scanner
        const mapX = x => 160 + dwx(x, camX + W / 2) / 16;
        const mapY = y => 2 + (y - TOP) / (GROUND - TOP) * 28;
        if (planet) {
          ctx.fillStyle = '#c86414';
          for (let i = 0; i < 128; i++) { const wx = wrapX(Math.floor(camX + W / 2 + (i - 64) * 16)); ctx.fillRect(97 + i, Math.round(mapY(terr[wx])), 1, 1); }
        }
        const dot = (x, y, c, w) => { const sx = mapX(x); if (sx < 97 || sx > 223) return; ctx.fillStyle = c; ctx.fillRect(Math.round(sx), Math.round(mapY(y)), w || 2, 2); };
        for (const h of humans) dot(h.x, h.y, '#ff30ff', 1);
        const EC = { L: '#20ff20', M: '#ff30ff', B: '#4060ff', P: '#a040ff', S: '#ff2020', T: '#20ff20' };
        for (const e of enemies) dot(e.x, e.y, EC[e.t]);
        if (state !== 'attract' && ship.alive) dot(ship.x, ship.y, (api.frame & 8) ? '#ffffff' : '#ffff40', 3);
        // view brackets
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(150, 1, 21, 1); ctx.fillRect(150, 31, 21, 1);
        ctx.fillRect(150, 1, 1, 3); ctx.fillRect(170, 1, 1, 3); ctx.fillRect(150, 29, 1, 3); ctx.fillRect(170, 29, 1, 3);
        // lives, bombs, score
        if (state !== 'attract') {
          for (let i = 0; i < Math.min(lives - (ship.alive ? 1 : 0), 5); i++) ctx.drawImage(S.shipIcon.c, 6 + i * 11, 4);
          for (let i = 0; i < Math.min(bombs, 5); i++) ctx.drawImage(S.bombIcon.c, 82, 3 + i * 4);
          drawText(ctx, String(score), 88, 20, '#ffff40', 1, 'right');
        }
        drawText(ctx, String(hi), 300, 20, '#40ffff', 1, 'right');
        drawText(ctx, 'HIGH', 300, 8, '#2040ff', 1, 'right');
      }
      function drawLogo(ctx, y) {
        const grad = r => ['#ffff40', '#ffe030', '#ffc020', '#ff9020', '#ff6010', '#ff3010', '#e01010'][r];
        drawText(ctx, 'DEFENDER', W / 2 + 3, y + 3, '#2020a0', 4, 'center');
        drawText(ctx, 'DEFENDER', W / 2 + 1, y + 1, '#802000', 4, 'center');
        drawText(ctx, 'DEFENDER', W / 2, y, grad, 4, 'center');
      }
      function render(ctx) {
        ctx.fillStyle = flash > 0 && (flash & 1) ? '#ffffff' : '#000';
        ctx.fillRect(0, 0, W, H);
        if (flash > 0 && (flash & 1)) return;
        if (state === 'attract') {
          drawWorld(ctx);
          drawHUD(ctx);
          const ph = Math.floor(stT / 420) % 2;
          if (ph === 0) {
            drawLogo(ctx, 60);
            const cr = api.credits;
            if (cr > 0) drawText(ctx, 'PRESS START', W / 2, 128, (coinHold > 0 || (api.frame & 32)) ? '#ffffff' : '#40ffff', 1, 'center');
            else if (coinFlash > 0 ? (coinFlash > 90 || (coinFlash % 20) < 14) : (stT % 60) < 40) drawText(ctx, 'INSERT COIN', W / 2, 128, coinFlash > 0 ? '#ff2020' : '#ffffff', 1, 'center');
            drawText(ctx, 'HIGH SCORE ' + hi, W / 2, 146, '#ffff40', 1, 'center');
            drawText(ctx, 'ARROWS FLY  SPACE FIRE', W / 2, 166, '#a040ff', 1, 'center');
            drawText(ctx, 'Z SMART BOMB  X HYPERSPACE', W / 2, 178, '#a040ff', 1, 'center');
          } else {
            drawText(ctx, 'SCANNER', W / 2, 44, '#2040ff', 1, 'center');
            const rows = [['lander0', 'LANDER', 150], ['mutant0', 'MUTANT', 150], ['bomber0', 'BOMBER', 250], ['pod0', 'POD', 1000], ['swarmer0', 'SWARMER', 150], ['baiter0', 'BAITER', 200], ['human0', 'HUMANOID', 500]];
            rows.forEach(([k, n, p], i) => {
              const x = i < 4 ? 80 : 240, y = 58 + (i < 4 ? i : i - 4) * 36 + (i < 4 ? 0 : 18);
              const s = S[k];
              ctx.drawImage(s.c, Math.round(x - s.w), Math.round(y - s.h), s.w * 2, s.h * 2);
              drawText(ctx, n, x, y + 10, '#ffffff', 1, 'center');
              drawText(ctx, String(p), x, y + 19, '#ffff40', 1, 'center');
            });
          }
          drawText(ctx, 'CREDITS: ' + Math.min(api.credits, 99), W / 2, 196, '#40ffff', 1, 'center');
          return;
        }
        drawWorld(ctx);
        drawHUD(ctx);
        if (state === 'bonus') {
          drawText(ctx, 'ATTACK WAVE ' + wave, W / 2, 70, '#ff30ff', 1, 'center');
          drawText(ctx, 'COMPLETED', W / 2, 84, '#ff30ff', 1, 'center');
          drawText(ctx, 'BONUS X ' + Math.min(5, wave) * 100, W / 2, 104, '#40ffff', 1, 'center');
          for (let i = 0; i < bonusShown; i++) ctx.drawImage(S.human0.c, W / 2 - humans.length * 3 + i * 6, 124);
        }
        if (state === 'play' && waveT < 120) drawText(ctx, 'WAVE ' + wave, W / 2, 80, '#40ffff', 1, 'center');
        if (state === 'gameover') drawText(ctx, 'GAME OVER', W / 2, 120, '#ff2020', 2, 'center');
      }
      return { update, render };
    }
  });
})();
