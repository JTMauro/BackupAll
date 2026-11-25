// Space Invaders (Taito, 1978) — faithful browser recreation for Arcade Games Galore.
(function () {
  // ---- compact 5x7 bitmap arcade font ----
  const FK = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-.,:!?=*/'\"<>()+%#@^_~";
  const FD = "ehjlphe4c4444eeh168gvv2421he26aiv22vgu11he68guhhev124888ehhehheehhf12c4ahhvhhuhhuhhuehgggheuhhhhhuvgguggvvggugggfggjhhfhhhvhhhe44444e11111hehikokihggggggvhrllhhhhhpljhhehhhhheuhhugggehhhliduhhukihfgge11uv444444hhhhhhehhhhha4hhhllrhhha4ahhhha4444v1248gv000v00000000cc0000c480cc0cc04444404eh1240400v0v000level001248g04480000aa00000248g842842124824888428422248044v440pq48mj0avaaavaehnlnge4el4444000000vehlplhe";
  const FONT = {};
  for (let i = 0; i < FK.length; i++) { const g = []; for (let r = 0; r < 7; r++) g.push(parseInt(FD[i * 7 + r], 32)); FONT[FK[i]] = g; }
  // text(ctx, str, x, y, colour, {scale, adv, center, bold})
  function text(ctx, s, x, y, col, o) {
    o = o || {}; const sc = o.scale || 1, adv = (o.adv || 8) * sc, bw = o.bold ? 2 : 1;
    s = String(s).toUpperCase();
    if (o.center) x = Math.round(x - (s.length * adv - (adv - (4 + bw) * sc)) / 2);
    if (o.right) x = Math.round(x - (s.length * adv - (adv - (4 + bw) * sc)));
    ctx.fillStyle = col;
    for (const ch of s) {
      const g = FONT[ch];
      if (g) for (let r = 0; r < 7; r++) { const b = g[r]; if (b) for (let c = 0; c < 5; c++) if ((b >> (4 - c)) & 1) ctx.fillRect(x + c * sc, y + r * sc, sc * bw, sc); }
      x += adv;
    }
  }
  // build a sprite canvas from rows of chars + palette {char: colour}
  function spr(rows, pal) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
    return c;
  }

  const W = 224, H = 256;
  const WHITE = '#ffffff';

  // ---------------- sprites (hand-made pixel art) ----------------
  const P = { '#': WHITE };
  const S = {
    squid: [spr([
      '...##...',
      '..####..',
      '.######.',
      '##.##.##',
      '########',
      '..#..#..',
      '.#.##.#.',
      '#.#..#.#'], P), spr([
      '...##...',
      '..####..',
      '.######.',
      '##.##.##',
      '########',
      '.#.##.#.',
      '#......#',
      '.#....#.'], P)],
    crab: [spr([
      '..#.....#..',
      '...#...#...',
      '..#######..',
      '.##.###.##.',
      '###########',
      '#.#######.#',
      '#.#.....#.#',
      '...##.##...'], P), spr([
      '..#.....#..',
      '#..#...#..#',
      '#.#######.#',
      '###.###.###',
      '###########',
      '.#########.',
      '..#.....#..',
      '.#.......#.'], P)],
    octo: [spr([
      '....####....',
      '.##########.',
      '############',
      '###..##..###',
      '############',
      '...##..##...',
      '..##.##.##..',
      '##........##'], P), spr([
      '....####....',
      '.##########.',
      '############',
      '###..##..###',
      '############',
      '..###..###..',
      '.##..##..##.',
      '..##....##..'], P)],
    alienBoom: spr([
      '....#...#....',
      '.#...#.#...#.',
      '..#.......#..',
      '...#.....#...',
      '##.........##',
      '...#.....#...',
      '..#.#...#.#..',
      '.#...#.#...#.'], P),
    player: spr([
      '......#......',
      '.....###.....',
      '.....###.....',
      '.###########.',
      '#############',
      '#############',
      '#############',
      '#############'], P),
    playerBoom: [spr([
      '.....#..........',
      '..........#.....',
      '.....#.##..#....',
      '...#.....#......',
      '.#...######..#..',
      '..###########...',
      '.#############.#',
      '################'], P), spr([
      '#.......#.....#.',
      '.....#.......#..',
      '..#......#.....#',
      '.......###....#.',
      '.#.###########..',
      '######.####.#.#.',
      '##############.#',
      '################'], P)],
    ufo: spr([
      '.....######.....',
      '...##########...',
      '..############..',
      '.##.##.##.##.##.',
      '################',
      '..###..##..###..',
      '...#........#...'], P),
    ufoBoom: spr([
      '#..#....#..#...#.....',
      '..#..#.....#..#...#..',
      '.....#######..#.....#',
      '#..###########..#....',
      '..##.##.##.##.##.#...',
      '#.###############..#.',
      '...###..#.#..###.....',
      '.#..#..#...#..#..#..#'], P),
    shotBoom: spr([
      '#...#..#',
      '..#...#.',
      '.######.',
      '########',
      '########',
      '.######.',
      '..#..#..',
      '#..#...#'], P),
    aShotBoom: spr([
      '..#...',
      '#...#.',
      '..##.#',
      '.####.',
      '#.##..',
      '.####.',
      '#.#.#.',
      '..#..#'], P),
  };
  // invader shots: rolling, plunger, squiggly — 4 animation frames each (3x8)
  const SHOTROWS = {
    rolling: [
      ['.#.', '.#.', '.#.', '.##', '##.', '.#.', '.#.', '.#.'],
      ['.#.', '.#.', '.##', '##.', '.#.', '.#.', '.##', '##.'],
      ['.#.', '.##', '##.', '.#.', '.#.', '.##', '##.', '.#.'],
      ['.##', '##.', '.#.', '.#.', '.##', '##.', '.#.', '.#.']],
    plunger: [
      ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '.#.', '.#.'],
      ['.#.', '.#.', '###', '.#.', '.#.', '.#.', '.#.', '.#.'],
      ['.#.', '.#.', '.#.', '.#.', '###', '.#.', '.#.', '.#.'],
      ['.#.', '.#.', '.#.', '.#.', '.#.', '.#.', '###', '.#.']],
    squiggly: [
      ['.#.', '#..', '.#.', '..#', '.#.', '#..', '.#.', '..#'],
      ['#..', '.#.', '..#', '.#.', '#..', '.#.', '..#', '.#.'],
      ['.#.', '..#', '.#.', '#..', '.#.', '..#', '.#.', '#..'],
      ['..#', '.#.', '#..', '.#.', '..#', '.#.', '#..', '.#.']]
  };
  const SHOTSPR = {};
  for (const k in SHOTROWS) SHOTSPR[k] = SHOTROWS[k].map(r => spr(r, P));

  const SHIELD_ROWS = [
    '....##############....',
    '...################...',
    '..##################..',
    '.####################.',
    '######################', '######################', '######################', '######################',
    '######################', '######################', '######################', '######################',
    '#######........#######',
    '######..........######',
    '#####............#####',
    '#####............#####'];
  const MASK_PSHOT = ['#...#..#', '..#...#.', '.######.', '########', '########', '.######.', '..#..#..', '#..#...#'];
  const MASK_ASHOT = ['..#...', '#...#.', '..##.#', '.####.', '#.##..', '.####.', '#.#.#.', '..#..#'];

  const TYPE = [ // per row from top
    { k: 'squid', w: 8, off: 4, pts: 30 },
    { k: 'crab', w: 11, off: 2, pts: 20 },
    { k: 'crab', w: 11, off: 2, pts: 20 },
    { k: 'octo', w: 12, off: 2, pts: 10 },
    { k: 'octo', w: 12, off: 2, pts: 10 }];
  const UFO_PTS = [100, 50, 50, 100, 150, 100, 100, 50, 300, 100, 100, 100, 50, 150, 100];
  const PLUNGER_COLS = [1, 7, 1, 1, 1, 4, 11, 1, 6, 3, 1, 1, 11, 9, 2, 8];
  const SQUIGGLY_COLS = [11, 1, 6, 3, 1, 1, 11, 9, 2, 8, 2, 11, 4, 7, 10];
  const WAVE_OFF = [0, 16, 24, 24, 24, 32, 32, 32];
  const HEART = [87, 78, 69, 62];

  const SHIELD_Y = 192, PLAYER_Y = 216, GROUND_Y = 239;
  const SHIELD_X = [32, 77, 122, 167];

  ArcadeRegistry.register({
    id: 'spaceinvaders',
    title: 'Space Invaders',
    year: 1978,
    maker: 'Taito',
    width: W, height: H,
    vector: false,
    pointer: false,
    controls: 'Arrows: move · Space: fire · Enter: start',
    marquee: { bg: '#05060f', fg: '#ffffff', accent: '#20ff40' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(0);
      let mode = 'title';      // title | demo | play
      let titleT = 0;
      let g = null;            // game state
      let blink = 0;
      // ---------- coin-op ----------
      let coinOp = false, lastCred = api.credits, coinFlash = 0;
      function pollCoins() {
        const c = api.credits; if (c === 0) coinOp = true;
        if (c > lastCred) au.tone(880, 0.05, { type: 'square', vol: 0.06, slideTo: 1320 });
        lastCred = c;
      }
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 }); au.tone(73, 0.28, { type: 'sawtooth', vol: 0.08 });
        return false;
      }
      const credStr = () => 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0');
      function startPlay() {
        mode = 'play'; newGame(false);
        au.melody([[131, 0.1], [0, 0.05], [131, 0.1], [196, 0.3]], { type: 'square', vol: 0.06 });
      }

      // ---------- game state ----------
      function newGame(demo) {
        g = {
          demo, score: 0, lives: 3, wave: 0, extraGiven: false,
          shotsFired: 0, phase: 'start', phaseT: demo ? 30 : 150,
          ground: new Uint8Array(W).fill(1),
          aiTarget: 112, demoT: 0
        };
        g.ground.fill(1);
        setupWave();
        g.px = 16;
      }
      function setupWave() {
        const off = WAVE_OFF[Math.min(g.wave, WAVE_OFF.length - 1)];
        g.aliens = [];
        // movement order: bottom row first, left to right (like the original)
        for (let row = 4; row >= 0; row--) {
          for (let col = 0; col < 11; col++) {
            const t = TYPE[row];
            g.aliens.push({ row, col, t, x: 24 + col * 16 + t.off, y: 64 + off + row * 16, alive: true, f: 0 });
          }
        }
        g.cursor = 0; g.dx = 2; g.drop = false; g.nextDrop = false;
        g.alive = 55; g.boom = null; // {x,y,t}
        g.shields = SHIELD_X.map(sx => {
          const a = new Uint8Array(22 * 16);
          for (let y = 0; y < 16; y++) for (let x = 0; x < 22; x++) a[y * 22 + x] = SHIELD_ROWS[y][x] === '#' ? 1 : 0;
          return { x: sx, a };
        });
        g.shot = null; g.shotBoom = null;
        g.ashots = { rolling: null, plunger: null, squiggly: null };
        g.aBooms = [];
        g.fireT = 30; g.shotOrder = 0; g.plIdx = 0; g.sqIdx = 0;
        g.ufo = null; g.ufoT = 0x600; g.ufoScore = null;
        g.noteI = 0; g.noteT = 0;
        g.px = 16;
      }

      // ---------- helpers ----------
      function shieldAt(x, y) {
        if (y < SHIELD_Y || y >= SHIELD_Y + 16) return null;
        for (const s of g.shields) if (x >= s.x && x < s.x + 22) {
          const lx = x - s.x, ly = y - SHIELD_Y;
          if (s.a[ly * 22 + lx]) return s;
        }
        return null;
      }
      function erase(mask, cx, cy) { // mask top-left at cx,cy
        for (let y = 0; y < mask.length; y++) for (let x = 0; x < mask[y].length; x++) {
          if (mask[y][x] !== '#') continue;
          const px = cx + x, py = cy + y;
          if (py >= SHIELD_Y && py < SHIELD_Y + 16) for (const s of g.shields) {
            if (px >= s.x && px < s.x + 22) s.a[(py - SHIELD_Y) * 22 + (px - s.x)] = 0;
          }
        }
      }
      function addScore(n) {
        if (g.demo) return;
        g.score += n;
        if (!g.extraGiven && g.score >= 1500) {
          g.extraGiven = true; g.lives++;
          au.melody([[1046, 0.06], [1318, 0.06], [1568, 0.06], [2093, 0.12]], { type: 'square', vol: 0.08 });
        }
        if (g.score > hi) hi = g.score;
      }
      function reloadRate() {
        const s = g.score;
        return s < 200 ? 48 : s < 1000 ? 16 : s < 2000 ? 11 : s < 3000 ? 8 : 7;
      }
      function lowestInCol(col) {
        let best = null;
        for (const a of g.aliens) if (a.alive && a.col === col && (!best || a.y > best.y)) best = a;
        return best;
      }

      // ---------- sounds ----------
      const sfx = {
        shoot() { au.noise(0.12, { freq: 4000, slideTo: 600, vol: 0.12, type: 'bandpass' }); au.tone(900, 0.1, { type: 'square', slideTo: 250, vol: 0.04 }); },
        kill() { au.noise(0.22, { freq: 2500, slideTo: 150, vol: 0.22 }); au.tone(320, 0.18, { type: 'square', slideTo: 60, vol: 0.06 }); },
        die() {
          for (let i = 0; i < 6; i++) au.noise(0.18, { freq: 1200 - i * 150, slideTo: 80, vol: 0.3, delay: i * 0.16 });
        },
        heart(i) { au.tone(HEART[i], 0.11, { type: 'square', vol: 0.32, slideTo: HEART[i] * 0.85 }); },
        ufoHit() { for (let i = 0; i < 8; i++) au.tone(1600 - i * 120, 0.08, { type: 'square', vol: 0.06, delay: i * 0.06, slideTo: 400 }); },
      };

      // ---------- player shot ----------
      function firePlayer() {
        if (g.shot || g.shotBoom || g.phase !== 'live') return;
        g.shot = { x: g.px + 6, y: PLAYER_Y - 4 };
        g.shotsFired++;
        sfx.shoot();
      }
      function updatePlayerShot() {
        if (g.shotBoom) { if (--g.shotBoom.t <= 0) g.shotBoom = null; }
        const s = g.shot; if (!s) return;
        for (let step = 0; step < 4; step++) {
          s.y -= 1;
          // shields
          for (let k = 0; k < 4; k++) if (shieldAt(s.x, s.y + k)) {
            erase(MASK_PSHOT, s.x - 4, s.y + k - 6);
            g.shotBoom = { x: s.x - 4, y: s.y - 2, t: 16 }; g.shot = null; return;
          }
          // aliens
          for (const a of g.aliens) {
            if (!a.alive) continue;
            if (s.x >= a.x && s.x < a.x + a.t.w && s.y < a.y + 8 && s.y + 4 > a.y) {
              a.alive = false; g.alive--;
              g.boom = { x: a.x + a.t.w / 2 - 6, y: a.y, t: 16 };
              addScore(a.t.pts); sfx.kill(); g.shot = null; return;
            }
          }
          // ufo
          if (g.ufo && !g.ufo.dead && s.x >= g.ufo.x && s.x < g.ufo.x + 16 && s.y < 47 && s.y > 36) {
            const pts = UFO_PTS[g.shotsFired % 15];
            g.ufo.dead = 1; g.ufo.t = 80; g.ufo.pts = pts; addScore(pts); sfx.ufoHit();
            g.shot = null; return;
          }
          // alien shots
          for (const k in g.ashots) {
            const b = g.ashots[k];
            if (b && s.x >= b.x - 1 && s.x <= b.x + 1 && s.y < b.y + 8 && s.y + 4 > b.y) {
              g.ashots[k] = null; g.aBooms.push({ x: b.x - 3, y: b.y + 2, t: 12 });
              g.shotBoom = { x: s.x - 4, y: s.y - 2, t: 16 }; g.shot = null; return;
            }
          }
          if (s.y <= 32) { g.shotBoom = { x: s.x - 4, y: 32, t: 16 }; g.shot = null; return; }
        }
      }

      // ---------- invaders ----------
      function marchStep() {
        if (g.boom) { if (--g.boom.t <= 0) g.boom = null; else return; }
        if (g.alive === 0) return;
        // find next alive alien from cursor
        let n = 0;
        while (n < 56) {
          if (g.cursor >= g.aliens.length) { // sweep finished
            g.cursor = 0;
            g.drop = g.nextDrop; g.nextDrop = false;
            if (!g.drop) {
              let hitEdge = false;
              for (const a of g.aliens) if (a.alive && ((g.dx > 0 && a.x + a.t.w >= 214) || (g.dx < 0 && a.x <= 9))) hitEdge = true;
              if (hitEdge) { g.drop = true; g.dx = -g.dx; }
            }
          }
          const a = g.aliens[g.cursor++];
          n++;
          if (!a.alive) continue;
          if (g.drop) a.y += 8;
          else a.x += (g.alive === 1 && g.dx > 0) ? 3 : g.dx;
          a.f ^= 1;
          // invaders eat the shields
          if (a.y + 8 > SHIELD_Y && a.y < SHIELD_Y + 16) {
            for (let yy = a.y; yy < a.y + 8; yy++) for (let xx = a.x; xx < a.x + a.t.w; xx++) {
              if (yy >= SHIELD_Y && yy < SHIELD_Y + 16) for (const s of g.shields) if (xx >= s.x && xx < s.x + 22) s.a[(yy - SHIELD_Y) * 22 + xx - s.x] = 0;
            }
          }
          if (a.y + 8 >= PLAYER_Y) { invadersLanded(); }
          break;
        }
      }
      function invadersLanded() {
        if (g.phase === 'over' || g.phase === 'dying') { g.lives = 0; g.landed = true; return; }
        g.lives = 0; g.landed = true; killPlayer();
      }

      function spawnAlienShot() {
        if (--g.fireT > 0) return;
        // any active shot must have travelled a little first
        for (const k in g.ashots) { const b = g.ashots[k]; if (b && b.y < b.y0 + reloadRate()) return; }
        const types = ['rolling', 'plunger', 'squiggly'];
        for (let tries = 0; tries < 3; tries++) {
          const type = types[g.shotOrder]; g.shotOrder = (g.shotOrder + 1) % 3;
          if (g.ashots[type]) continue;
          let shooter = null;
          if (type === 'rolling') {
            // column directly above the player
            const pcx = g.px + 6; let best = null, bd = 99;
            for (const a of g.aliens) if (a.alive) { const d = Math.abs(a.x + a.t.w / 2 - pcx); if (d < 8 && (!best || a.y > best.y)) { best = a; bd = d; } }
            shooter = best;
          } else if (type === 'plunger') {
            if (g.alive === 1) continue;
            shooter = lowestInCol(PLUNGER_COLS[g.plIdx] - 1); g.plIdx = (g.plIdx + 1) % PLUNGER_COLS.length;
          } else {
            if (g.ufo) continue; // UFO uses the squiggly shot's slot
            shooter = lowestInCol(SQUIGGLY_COLS[g.sqIdx] - 1); g.sqIdx = (g.sqIdx + 1) % SQUIGGLY_COLS.length;
          }
          if (!shooter) continue;
          const x = Math.round(shooter.x + shooter.t.w / 2), y = shooter.y + 8;
          g.ashots[type] = { x, y, y0: y, f: 0, acc: 0 };
          g.fireT = 4;
          return;
        }
        g.fireT = 4;
      }
      function updateAlienShots() {
        const speed = g.alive <= 8 ? 5 / 3 : 4 / 3;
        for (const k in g.ashots) {
          const b = g.ashots[k]; if (!b) continue;
          b.acc += speed;
          if (api.frame % 3 === 0) b.f = (b.f + 1) & 3;
          while (b.acc >= 1) {
            b.acc -= 1; b.y += 1;
            const tip = b.y + 7;
            // shields
            let hit = false;
            for (let dx = -1; dx <= 1 && !hit; dx++) if (shieldAt(b.x + dx, tip)) hit = true;
            if (hit) { erase(MASK_ASHOT, b.x - 3, tip - 3); g.aBooms.push({ x: b.x - 3, y: tip - 4, t: 12 }); g.ashots[k] = null; break; }
            // player
            if (g.phase === 'live' && tip >= PLAYER_Y + 1 && b.y < PLAYER_Y + 8) {
              const lx = b.x - g.px;
              if (lx >= 0 && lx < 13 && (tip >= PLAYER_Y + 3 || (lx >= 5 && lx <= 7))) {
                g.ashots[k] = null; killPlayer(); break;
              }
            }
            if (tip >= GROUND_Y - 1) {
              for (let dx = -1; dx <= 1; dx++) if (b.x + dx >= 0 && b.x + dx < W && Math.random() < 0.7) g.ground[b.x + dx] = 0;
              g.aBooms.push({ x: b.x - 3, y: GROUND_Y - 8, t: 12 }); g.ashots[k] = null; break;
            }
          }
        }
        for (let i = g.aBooms.length - 1; i >= 0; i--) if (--g.aBooms[i].t <= 0) g.aBooms.splice(i, 1);
      }

      function updateUfo() {
        if (g.ufo) {
          const u = g.ufo;
          if (u.dead) { if (--u.t <= 0) g.ufo = null; return; }
          u.x += u.dir;
          if (api.frame % 8 === 0) au.tone(api.frame % 16 ? 1250 : 900, 0.14, { type: 'square', vol: 0.035, slideTo: api.frame % 16 ? 900 : 1250 });
          if (u.x < -16 || u.x > W) g.ufo = null;
          return;
        }
        if (--g.ufoT <= 0) {
          g.ufoT = 0x600;
          if (g.alive >= 8 && !g.ashots.squiggly) {
            const fromLeft = (g.shotsFired & 1) === 0;
            g.ufo = { x: fromLeft ? -8 : W - 8, dir: fromLeft ? 1 : -1, dead: 0 };
          }
        }
      }

      function killPlayer() {
        if (g.phase !== 'live') return;
        g.phase = 'dying'; g.phaseT = 130; g.shot = null;
        sfx.die();
      }

      // demo AI
      function demoInput() {
        g.demoT++;
        if (Math.abs(g.px - g.aiTarget) < 2 || g.demoT % 90 === 0) g.aiTarget = 16 + Math.floor(Math.random() * 180);
        return { left: g.px > g.aiTarget + 1, right: g.px < g.aiTarget - 1, fire: Math.random() < 0.1 };
      }

      function updateGame() {
        g.phaseT--;
        if (g.phase === 'start') {
          if (g.phaseT <= 0) g.phase = 'live';
          return;
        }
        if (g.phase === 'over') {
          if (g.phaseT <= 0) { mode = 'title'; titleT = 0; }
          return;
        }
        if (g.phase === 'dying') {
          updateAlienShots();
          if (g.phaseT <= 0) {
            g.lives--;
            const respawn = () => { g.phase = 'live'; g.px = 16; for (const k in g.ashots) g.ashots[k] = null; };
            const gameOver = () => {
              if (!g.demo) api.setHiScore(g.score);
              g.phase = 'over'; g.phaseT = g.demo ? 60 : 300;
              if (g.demo) { mode = 'title'; titleT = 0; }
              else au.melody([[392, 0.25], [330, 0.25], [262, 0.25], [196, 0.6]], { type: 'square', vol: 0.08 });
            };
            if (g.lives <= 0) {
              if (!g.demo && api.offerContinue) {
                const cg = g;
                api.offerContinue(() => {
                  if (g !== cg) return;
                  g.lives = 3;
                  if (g.landed) {
                    // the invaders reached the bottom: lift the survivors back to the wave's starting height
                    g.landed = false;
                    const top = 64 + WAVE_OFF[Math.min(g.wave, WAVE_OFF.length - 1)] + 4 * 16;
                    let low = -Infinity; for (const a of g.aliens) if (a.alive) low = Math.max(low, a.y);
                    const lift = Math.max(0, low - top);
                    for (const a of g.aliens) a.y -= lift;
                    g.drop = false; g.nextDrop = false;
                  }
                  respawn();
                }, gameOver);
              } else gameOver();
              return;
            }
            respawn();
          }
          return;
        }
        if (g.phase === 'cleared') {
          if (g.phaseT <= 0) { g.wave++; setupWave(); g.phase = 'live'; }
          return;
        }
        // live
        let L, R, F;
        if (g.demo) { const d = demoInput(); L = d.left; R = d.right; F = d.fire; }
        else { L = api.key('ArrowLeft'); R = api.key('ArrowRight'); F = api.key('Space') || api.key('ArrowUp') || api.key('KeyX') || api.key('KeyZ'); }
        if (L && !R) g.px = Math.max(16, g.px - 1);
        if (R && !L) g.px = Math.min(W - 29, g.px + 1);
        if (F) firePlayer();
        updatePlayerShot();
        marchStep();
        if (g.phase !== 'live') return;
        spawnAlienShot();
        updateAlienShots();
        updateUfo();
        // heartbeat
        if (g.alive > 0) {
          const interval = Math.max(5, Math.min(52, Math.round(g.alive * 0.95)));
          if (++g.noteT >= interval) { g.noteT = 0; if (!g.demo) sfx.heart(g.noteI); g.noteI = (g.noteI + 1) & 3; }
        }
        if (g.alive === 0 && !g.boom) {
          g.phase = 'cleared'; g.phaseT = 90; g.shot = null; g.ufo = null;
          for (const k in g.ashots) g.ashots[k] = null;
        }
      }

      // ---------- rendering ----------
      function pad4(n) { return String(n % 10000).padStart(4, '0'); }
      function drawHeader(ctx, showScore1) {
        text(ctx, 'SCORE<1> HI-SCORE SCORE<2>', 8, 8, WHITE);
        if (showScore1) text(ctx, pad4(g && mode !== 'title' && !g.demo ? g.score : 0), 24, 24, WHITE);
        text(ctx, pad4(hi), 96, 24, WHITE);
        text(ctx, '0000', 176, 24, WHITE);
      }
      function drawGround(ctx, groundArr) {
        ctx.fillStyle = WHITE;
        if (!groundArr) { ctx.fillRect(0, GROUND_Y, W, 1); return; }
        for (let x = 0; x < W; x++) if (groundArr[x]) ctx.fillRect(x, GROUND_Y, 1, 1);
      }
      function drawPlayfield(ctx) {
        // shields
        ctx.fillStyle = WHITE;
        for (const s of g.shields) {
          for (let y = 0; y < 16; y++) {
            let run = -1;
            for (let x = 0; x <= 22; x++) {
              const on = x < 22 && s.a[y * 22 + x];
              if (on && run < 0) run = x;
              else if (!on && run >= 0) { ctx.fillRect(s.x + run, SHIELD_Y + y, x - run, 1); run = -1; }
            }
          }
        }
        // aliens
        for (const a of g.aliens) if (a.alive) ctx.drawImage(S[a.t.k][a.f], a.x, a.y);
        if (g.boom) ctx.drawImage(S.alienBoom, g.boom.x, g.boom.y);
        // ufo
        if (g.ufo) {
          const u = g.ufo;
          if (!u.dead) ctx.drawImage(S.ufo, u.x, 40);
          else if (u.t > 50) ctx.drawImage(S.ufoBoom, u.x - 3, 40);
          else text(ctx, String(u.pts), u.x + 8, 40, WHITE, { center: true });
        }
        // player
        if (g.phase === 'dying') ctx.drawImage(S.playerBoom[(g.phaseT >> 3) & 1], g.px - 1, PLAYER_Y);
        else if (g.phase !== 'over' || g.lives > 0) {
          if (!(g.phase === 'start' && (g.phaseT >> 3) & 1 && false)) ctx.drawImage(S.player, g.px, PLAYER_Y);
        }
        // shots
        ctx.fillStyle = WHITE;
        if (g.shot) ctx.fillRect(g.shot.x, g.shot.y, 1, 4);
        if (g.shotBoom) ctx.drawImage(S.shotBoom, g.shotBoom.x, g.shotBoom.y);
        for (const k in g.ashots) { const b = g.ashots[k]; if (b) ctx.drawImage(SHOTSPR[k][b.f], b.x - 1, Math.round(b.y)); }
        for (const b of g.aBooms) ctx.drawImage(S.aShotBoom, b.x, b.y);
        drawGround(ctx, g.ground);
        // lives
        const lv = Math.max(0, g.phase === 'dying' ? g.lives - 1 : g.lives);
        text(ctx, String(Math.max(0, g.lives)), 8, 241, WHITE);
        for (let i = 0; i < Math.min(lv - 1, 5); i++) ctx.drawImage(S.player, 24 + i * 16, 241);
      }

      // attract / title page with typed text
      const TITLE_LINES = [
        { s: 'PLAY', y: 64, at: 20 },
        { s: 'SPACE  INVADERS', y: 88, at: 60 },
        { s: '*SCORE ADVANCE TABLE*', y: 120, at: 170, instant: true },
        { s: '=? MYSTERY', y: 140, x: 88, at: 200, icon: 'ufo' },
        { s: '=30 POINTS', y: 160, x: 88, at: 280, icon: 'squid' },
        { s: '=20 POINTS', y: 180, x: 88, at: 360, icon: 'crab' },
        { s: '=10 POINTS', y: 200, x: 88, at: 440, icon: 'octo' }];
      function drawTitle(ctx) {
        for (const L of TITLE_LINES) {
          const t = titleT - L.at; if (t < 0) continue;
          const n = L.instant ? L.s.length : Math.min(L.s.length, Math.floor(t / 7) + 1);
          const str = L.s.slice(0, n);
          if (L.x != null) text(ctx, str, L.x, L.y, WHITE);
          else {
            const full = L.s.length * 8 - 3; const x0 = Math.round((W - full) / 2);
            text(ctx, str, x0, L.y, WHITE);
          }
          if (L.icon && titleT >= L.at - 30) {
            const im = L.icon === 'ufo' ? S.ufo : S[L.icon][(titleT >> 5) & 1];
            ctx.drawImage(im, 80 - im.width, L.y);
          }
        }
        if (api.credits === 0) { if (coinFlash > 0 || ((blink >> 5) & 1)) text(ctx, 'INSERT  COIN', W / 2, 222, WHITE, { center: true }); }
        else if ((blink >> 5) & 1) text(ctx, 'PUSH START', W / 2, 222, WHITE, { center: true });
        drawGround(ctx, null);
        text(ctx, credStr(), 136, 241, WHITE);
      }
      function drawPush(ctx) {
        text(ctx, 'PUSH', W / 2, 96, WHITE, { center: true });
        text(ctx, api.credits > 1 ? '1 OR 2PLAYERS BUTTON' : 'ONLY 1PLAYER  BUTTON', W / 2, 128, WHITE, { center: true });
        drawGround(ctx, null);
        text(ctx, credStr(), 136, 241, WHITE);
      }

      function overlay(ctx) {
        // the cabinet's coloured cellophane strips
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = '#ff2638'; ctx.fillRect(0, 32, W, 24);
        ctx.fillStyle = '#28ff5a'; ctx.fillRect(0, 184, W, 56); ctx.fillRect(0, 240, 136, 16);
        ctx.globalCompositeOperation = 'source-over';
      }

      if (api.debugHook) api.debugHook({ sum: () => g && ({ mode, phase: g.phase, score: g.score, lives: g.lives, wave: g.wave, alive: g.aliens.filter(a => a.alive).length, demo: g.demo }), g: () => g, kill: () => killPlayer(), land: () => invadersLanded() });
      return {
        update() {
          blink++; pollCoins(); if (coinFlash > 0) coinFlash--;
          // a coin interrupts the attract cycle and brings up the PUSH screen, as on the real cabinet
          if ((mode === 'title' || mode === 'demo' || (mode === 'play' && g && g.phase === 'over' && g.phaseT <= 0)) && coinOp && api.credits > 0) mode = 'push';
          if (mode === 'push') {
            if (api.credits === 0) { mode = 'title'; titleT = 0; return; }
            if (api.anyPressed('Enter', 'Space') && tryStart()) startPlay();
            return;
          }
          if (mode === 'title') {
            titleT++;
            if (api.anyPressed('Enter', 'Space')) {
              if (tryStart()) startPlay();
              return;
            }
            if (titleT > 900) { mode = 'demo'; newGame(true); }
            return;
          }
          if (mode === 'demo') {
            if (api.anyPressed('Enter', 'Space')) { if (tryStart()) { startPlay(); return; } }
            updateGame();
            if (g.demoT > 1500 && mode === 'demo') { mode = 'title'; titleT = 0; }
            return;
          }
          updateGame();
        },
        render(ctx) {
          ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
          if (mode === 'title') {
            drawHeader(ctx, true);
            drawTitle(ctx);
          } else if (mode === 'push') {
            drawHeader(ctx, true);
            drawPush(ctx);
          } else {
            const flash = g.phase === 'start' && !g.demo;
            drawHeader(ctx, !(flash && (g.phaseT >> 3) & 1));
            if (g.phase === 'start' && !g.demo) {
              text(ctx, 'PLAY PLAYER<1>', W / 2, 112, WHITE, { center: true });
              drawGround(ctx, g.ground);
              text(ctx, String(g.lives), 8, 241, WHITE);
              for (let i = 0; i < g.lives - 1; i++) ctx.drawImage(S.player, 24 + i * 16, 241);
            } else drawPlayfield(ctx);
            if (g.demo) text(ctx, 'DEMO', W / 2, 52, WHITE, { center: true });
            if (g.demo && api.credits === 0 && coinFlash > 0) text(ctx, 'INSERT  COIN', W / 2, 64, WHITE, { center: true });
            if (g.phase === 'over') {
              const s = 'GAME OVER'; const n = Math.min(s.length, Math.floor((300 - g.phaseT) / 8) + 1);
              const x0 = Math.round((W - (s.length * 8 - 3)) / 2);
              ctx.fillStyle = '#000'; ctx.fillRect(x0 - 4, 44, s.length * 8 + 6, 14);
              text(ctx, s.slice(0, n), x0, 48, WHITE);
            }
            text(ctx, credStr(), 136, 241, WHITE);
          }
          overlay(ctx);
        }
      };
    }
  });
})();
