// Dragon Spirit (Namco, 1987) -- from-scratch recreation for the MAME32 Game Room.
// Fly the blue dragon over volcano, jungle, desert, ice, sea and Zawel's castle: fire breath for the air,
// bombs for the ground, crack eggs for power orbs that add heads and stronger flame.
(function () {
  'use strict';
  const W = 224, H = 288;
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
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function sprite(rows, pal) {
    const h = rows.length, w = rows[0].length, cv = mkCanvas(w, h), c = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = pal[rows[y][x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } }
    return cv;
  }
  const mirror = half => half.map(r => r + r.split('').reverse().join(''));
  const BODY_A = mirror([
    '..........b', '.........bb', 'w.......bbb', 'ww......bbB', 'www....bbbB', 'wwww..bbbbB', '.wwwwbbbbbB', '..wwwwbbbbB',
    '...wwwwbbbB', '....www.bbB', '.....w...bB', '..........b', '..........b', '..........b', '..........b', '...........']);
  const BODY_B = mirror([
    '..........b', '.........bb', '........bbb', '........bbB', '.......bbbB', 'w.....bbbbB', 'ww...bbbbbB', 'www.wbbbbbB',
    '.wwwwwbbbbB', '..wwwww.bbB', '...wwww..bB', '....www...b', '.....ww...b', '......w...b', '..........b', '...........']);
  const HEAD = ['.h.h.', '.hhh.', 'hhhhh', 'hyhyh', '.hhh.', '..h..', '..h..'];
  const BIRD_A = mirror(['p......', 'pp.....', 'ppp...k', '.pppppp', '..ppppp', '....ppp', '.....pp', '......p']);
  const BIRD_B = mirror(['.......', '.......', '......k', '...pppp', 'pppppp.', '..ppppp', '....ppp', '......p']);
  const EGG = ['...ww...', '..wwww..', '.wwswww.', '.wwwwsw.', 'wswwwwww', 'wwwwswww', 'wwwwwwsw', '.wswwww.', '..wwww..'];
  const CRAWLER = mirror(['.k..ggg', '..kgggg', '.kgGggg', 'k.gGggG', '.kgggGg', 'k.ggggg', '.kgGggg', '..ggggg', '...gg..']);
  const STAGES = [
    { name: 'VOLCANO', base: '#5a3020', alt: '#7a4028', river: '#ff5010', river2: '#ffc040', deco: '#2a1810', deco2: '#904830', boss: 'serpent', bossName: 'FIRE SERPENT', bcol: ['#ff4020', '#ffc040'] },
    { name: 'JUNGLE', base: '#1e6a24', alt: '#2a8a30', river: '#2a60c0', river2: '#80b0ff', deco: '#0e4a14', deco2: '#40b040', boss: 'twin', bossName: 'MAN-EATER', bcol: ['#c040c0', '#40ff80'] },
    { name: 'DESERT', base: '#c8a060', alt: '#d8b070', river: '#a07040', river2: '#e0c080', deco: '#907040', deco2: '#e8d090', boss: 'worm', bossName: 'SAND WORM', bcol: ['#d08040', '#ffe0a0'] },
    { name: 'ICE FIELD', base: '#c0d8f0', alt: '#d8e8ff', river: '#3060c0', river2: '#a0c0ff', deco: '#8098c0', deco2: '#ffffff', boss: 'twin', bossName: 'ICE HYDRA', bcol: ['#60a0ff', '#ffffff'] },
    { name: 'SEA', base: '#1840a0', alt: '#2050b0', river: '#d0c080', river2: '#f0e0a0', deco: '#103080', deco2: '#60a0ff', boss: 'serpent', bossName: 'KRAKEN SNAKE', bcol: ['#40c0a0', '#ffff80'] },
    { name: 'ZAWEL CASTLE', base: '#302838', alt: '#403848', river: '#801020', river2: '#ff4060', deco: '#181020', deco2: '#706080', boss: 'demon', bossName: 'ZAWEL', bcol: ['#a020c0', '#ffe040'] }
  ];

  ArcadeRegistry.register({
    id: 'dragonspirit', title: 'Dragon Spirit', year: 1987, maker: 'Namco',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: fly \u00b7 Space: fire breath (air) \u00b7 X: bomb (ground) \u00b7 Enter: start',
    marquee: { bg: '#101040', fg: '#40a0ff', accent: '#ffc020' },
    create(api) {
      const A = api.audio;
      const PAL = { b: '#2858f0', B: '#90c8ff', w: '#70a0ff', h: '#2858f0', y: '#ffe040' };
      const PAL_GOLD = { b: '#d0a020', B: '#fff080', w: '#ffd060', h: '#d0a020', y: '#ff2020' };
      const SP_BODY = [sprite(BODY_A, PAL), sprite(BODY_B, PAL)];
      const SP_BODYW = [sprite(BODY_A, { b: '#fff', B: '#fff', w: '#fff' }), sprite(BODY_B, { b: '#fff', B: '#fff', w: '#fff' })];
      const SP_BODYG = [sprite(BODY_A, PAL_GOLD), sprite(BODY_B, PAL_GOLD)];
      const SP_HEAD = sprite(HEAD, PAL), SP_HEADG = sprite(HEAD, PAL_GOLD);
      const SP_BIRD = [['#c060ff', '#ffff00'], ['#ff6040', '#ffff00'], ['#40e0a0', '#ff2020']].map(([p, k]) => [sprite(BIRD_A, { p, k }), sprite(BIRD_B, { p, k })]);
      const SP_EGG = sprite(EGG, { w: '#fff8e0', s: '#c08040' });
      const SP_CRAWL = sprite(CRAWLER, { g: '#808020', G: '#c0c040', k: '#302010' });

      // ---- state ----
      let state = 'title', tmr = 0, score = 0, hi = api.getHiScore(50000), lives = 2, stage = 0, nextExtra = 30000;
      let coinFlash = 0, attractT = 0;
      let scrollY = 0, stageLen = 3400, spd = 0.5;
      let pl, shots = [], bombs = [], air = [], ground = [], ebul = [], items = [], fx = [], popups = [], boss = null;
      let nextAir = 0, nextGround = 0, eggsLeft = 0, fireCD = 0, quakeT = 0;
      const S = () => STAGES[stage % STAGES.length];
      const lap = () => Math.floor(stage / STAGES.length);
      const diff = () => 1 + stage * 0.08 + lap() * 0.3;

      function resetPlayer(full) {
        pl = { x: W / 2, y: H - 50, heads: full ? 1 : pl.heads, power: full ? 1 : pl.power, inv: 150, dead: 0, anim: 0, gold: 0 };
      }
      function startStage() {
        scrollY = 0; stageLen = 3200 + Math.min(stage, 8) * 100;
        shots = []; bombs = []; air = []; ground = []; ebul = []; items = []; fx = []; boss = null;
        nextAir = 80; nextGround = 60; eggsLeft = 4;
        pl.x = W / 2; pl.y = H - 50; pl.inv = 150;
        state = 'ready'; tmr = 0;
        A.melody([[392, .15], [523, .15], [659, .15], [784, .3], [659, .15], [784, .45]], { type: 'square', vol: .1 });
      }
      function startGame() { score = 0; lives = 2; stage = 0; nextExtra = 30000; resetPlayer(true); startStage(); }
      function addScore(n, x, y) {
        score += n;
        if (score >= nextExtra) { lives++; nextExtra += nextExtra === 30000 ? 70000 : 100000; A.melody([[1047, .08], [1319, .08], [1568, .16]], { type: 'square', vol: .12 }); }
        if (score > hi) hi = score;
        if (x != null) popups.push({ x, y, s: String(n), t: 50 });
      }
      function boom(x, y, big) {
        fx.push({ x, y, t: 0, big: !!big });
        if (big) A.noise(0.6, { vol: 0.22, freq: 800, slideTo: 80 }); else A.noise(0.18, { vol: 0.12, freq: 2000, slideTo: 300 });
      }
      function aimed(x, y, sp) { const dx = pl.x - x, dy = pl.y - y, d = Math.hypot(dx, dy) || 1; ebul.push({ x, y, vx: dx / d * sp, vy: dy / d * sp }); }
      function bullet(x, y, a, sp) { ebul.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp }); }

      // ---- spawning ----
      function spawnAir() {
        const r = Math.random(), d = diff();
        if (r < 0.4) { // V formation of birds swooping
          const from = Math.random() < 0.5 ? -1 : 1, n = 4 + Math.floor(Math.random() * 3);
          for (let i = 0; i < n; i++) air.push({ k: 'bird', x: W / 2 + from * (40 + i * 14), y: -20 - i * 16, t: -i * 6, hp: 1, sx: from, v: 0, pts: 100, c: 0 });
        } else if (r < 0.65) { // divers
          for (let i = 0; i < 3; i++) air.push({ k: 'diver', x: 30 + Math.random() * (W - 60), y: -20 - i * 30, t: 0, hp: 2, pts: 200, c: 1, vx: 0, vy: 1.2 * d });
        } else if (r < 0.85) { // shooter hovers and fires
          air.push({ k: 'shooter', x: 30 + Math.random() * (W - 60), y: -20, t: 0, hp: 5 + lap() * 2, pts: 500, c: 2, ty: 40 + Math.random() * 60 });
        } else { // fireball orbs in a line
          const x0 = Math.random() < 0.5 ? -10 : W + 10;
          for (let i = 0; i < 5; i++) air.push({ k: 'orb', x: x0, y: 30 + i * 4, t: -i * 12, hp: 1, pts: 150, dir: x0 < 0 ? 1 : -1, base: 40 + Math.random() * 60 });
        }
      }
      function spawnGround() {
        const r = Math.random();
        const x = 20 + Math.random() * (W - 40);
        const wy = scrollY + 20;
        if (eggsLeft > 0 && (r < 0.25 || scrollY > stageLen * (1 - eggsLeft * 0.2))) { ground.push({ k: 'egg', x, wy, hp: 1, pts: 0, t: 0 }); eggsLeft--; }
        else if (r < 0.65) ground.push({ k: 'turret', x, wy, hp: 2, pts: 500, t: Math.floor(Math.random() * 60) });
        else ground.push({ k: 'crawler', x, wy, hp: 1, pts: 300, t: 0, vx: (Math.random() - 0.5) * 0.6 });
      }
      const gy = g => scrollY - g.wy;

      // ---- bosses ----
      function spawnBoss() {
        const st = S(), d = diff();
        const b = { kind: st.boss, t: 0, x: W / 2, y: -60, hp: 0, max: 0, parts: [], col: st.bcol, dead: 0, flash: 0 };
        if (b.kind === 'serpent') { b.hp = b.max = Math.round(60 * d); for (let i = 0; i < 12; i++) b.parts.push({ x: W / 2, y: -20 - i * 10 }); }
        else if (b.kind === 'twin') { b.heads = [{ dx: -34, hp: Math.round(40 * d), fl: 0 }, { dx: 34, hp: Math.round(40 * d), fl: 0 }]; b.hp = b.max = b.heads[0].hp * 2; }
        else if (b.kind === 'worm') { b.hp = b.max = Math.round(24 * d); b.x = W / 2; b.y = 80; b.wy = scrollY - 80; b.up = 0; }
        else { b.hp = b.max = Math.round(140 * d); }
        boss = b; state = 'boss'; tmr = 0;
        A.melody([[196, .25], [185, .25], [175, .25], [165, .5]], { type: 'sawtooth', vol: .12 });
      }
      function bossHit(dmg, bx, by) {
        const b = boss; if (!b || b.dead) return false;
        if (b.kind === 'twin') {
          for (const h of b.heads) if (h.hp > 0 && Math.abs(bx - (b.x + h.dx)) < 14 && Math.abs(by - (b.y + 10)) < 14) { h.hp -= dmg; h.fl = 4; b.hp -= dmg; if (h.hp <= 0) { boom(b.x + h.dx, b.y + 10, true); addScore(5000, b.x + h.dx, b.y); } if (b.heads.every(q => q.hp <= 0)) killBoss(); return true; }
          return false;
        }
        if (b.kind === 'serpent') { const h = b.parts[0]; if (Math.abs(bx - h.x) < 12 && Math.abs(by - h.y) < 12) { b.hp -= dmg; b.flash = 4; if (b.hp <= 0) killBoss(); return true; } for (let i = 1; i < b.parts.length; i++) { const q = b.parts[i]; if (Math.abs(bx - q.x) < 7 && Math.abs(by - q.y) < 7) { fx.push({ x: bx, y: by, t: 8, big: false, spark: 1 }); return true; } } return false; }
        if (b.kind === 'demon') { if (Math.abs(bx - b.x) < 30 && by > b.y - 20 && by < b.y + 26) { b.hp -= dmg; b.flash = 4; if (b.hp <= 0) killBoss(); return true; } return false; }
        return false;
      }
      function killBoss() {
        const b = boss; b.dead = 1; b.hp = 0;
        addScore(10000 * (1 + (stage % 6 === 5 ? 4 : 0)) + lap() * 10000, b.x, b.y);
        for (let i = 0; i < 8; i++) fx.push({ x: b.x + (Math.random() - 0.5) * 60, y: b.y + (Math.random() - 0.5) * 40, t: -i * 8, big: true });
        A.noise(2, { vol: 0.25, freq: 600, slideTo: 40 });
        ebul = [];
      }
      function updateBoss() {
        const b = boss, d = diff(); b.t++; if (b.flash) b.flash--;
        if (b.dead) { b.dead++; if (b.dead > 120) { boss = null; state = 'clear'; tmr = 0; A.melody([[523, .12], [659, .12], [784, .12], [1047, .12], [784, .12], [1047, .4]], { type: 'square', vol: .12 }); } return; }
        if (b.kind === 'serpent') {
          const h = b.parts[0];
          if (b.t < 90) { h.y += 1; h.x = W / 2 + Math.sin(b.t / 20) * 60; }
          else { h.x = W / 2 + Math.sin(b.t / 40) * 80; h.y = 70 + Math.sin(b.t / 27) * 40 + (b.t % 600 > 480 ? Math.sin((b.t % 600 - 480) / 120 * Math.PI) * 100 : 0); }
          for (let i = 1; i < b.parts.length; i++) { const a = b.parts[i - 1], q = b.parts[i]; const dx = q.x - a.x, dy = q.y - a.y, dd = Math.hypot(dx, dy) || 1; if (dd > 9) { q.x = a.x + dx / dd * 9; q.y = a.y + dy / dd * 9; } }
          if (b.t > 90 && b.t % Math.max(30, Math.round(70 / d)) === 0) { aimed(h.x, h.y, 2 * Math.min(1.6, d)); if (d > 1.3) { bullet(h.x, h.y, Math.PI / 2 - 0.4, 1.8); bullet(h.x, h.y, Math.PI / 2 + 0.4, 1.8); } A.tone(300, 0.1, { type: 'sawtooth', vol: 0.08 }); }
        } else if (b.kind === 'twin') {
          if (b.y < 50) b.y += 0.7; else b.x = W / 2 + Math.sin(b.t / 70) * 40;
          for (const h of b.heads) { if (h.fl) h.fl--; if (h.hp > 0 && b.t > 60 && (b.t + (h.dx > 0 ? 30 : 0)) % Math.max(36, Math.round(80 / d)) === 0) { const hx = b.x + h.dx, hy = b.y + 16; for (let k = -1; k <= 1; k++) bullet(hx, hy, Math.atan2(pl.y - hy, pl.x - hx) + k * 0.25, 1.9 * Math.min(1.5, d)); A.tone(250, 0.1, { type: 'sawtooth', vol: 0.08 }); } }
        } else if (b.kind === 'worm') {
          // ground boss: rises out of the sand, sprays bullets, sinks and moves
          const cyc = b.t % 300;
          b.up = cyc < 40 ? cyc / 40 : cyc < 220 ? 1 : cyc < 260 ? 1 - (cyc - 220) / 40 : 0;
          if (cyc === 280) { b.x = 40 + Math.random() * (W - 80); b.y = 50 + Math.random() * 70; }
          if (b.up >= 1 && cyc % Math.max(20, Math.round(45 / d)) === 0) { const n = 8; for (let k = 0; k < n; k++) bullet(b.x, b.y, k / n * Math.PI * 2 + b.t / 30, 1.4 * Math.min(1.5, d)); A.tone(180, 0.15, { type: 'sawtooth', vol: 0.08 }); }
        } else {
          if (b.y < 60) b.y += 0.6; else { b.x = W / 2 + Math.sin(b.t / 60) * 50; }
          if (b.t > 80) {
            if (b.t % Math.max(40, Math.round(90 / d)) === 0) { for (let k = 0; k < 12; k++) bullet(b.x, b.y, k / 12 * Math.PI * 2 + (b.t / 90), 1.5); A.tone(160, 0.2, { type: 'sawtooth', vol: 0.1 }); }
            if (b.t % 50 === 25) aimed(b.x, b.y + 20, 2.4);
            if (b.t % 400 === 200) { for (let i = 0; i < 4; i++) air.push({ k: 'bird', x: b.x + (i - 1.5) * 20, y: b.y, t: 0, hp: 1, sx: i < 2 ? -1 : 1, v: 0, pts: 100, c: 1 }); }
          }
        }
      }

      // ---- player ----
      function killPlayer() {
        if (pl.inv > 0 || pl.dead) return;
        if (pl.heads > 1) {
          pl.heads--; pl.power = Math.max(1, pl.power - 1); pl.inv = 120;
          A.noise(0.3, { vol: 0.18, freq: 1500, slideTo: 200 }); boom(pl.x, pl.y - 8, false);
          return;
        }
        pl.dead = 1; boom(pl.x, pl.y, true);
        A.melody([[440, .12], [392, .12], [349, .12], [294, .12], [247, .3]], { type: 'triangle', vol: .14 });
      }
      function headXs() { return pl.heads === 1 ? [0] : pl.heads === 2 ? [-6, 6] : [-9, 0, 9]; }
      function updatePlayer() {
        if (pl.dead) {
          pl.dead++;
          if (pl.dead === 120) {
            const respawn = () => { resetPlayer(true); pl.inv = 180; };
            if (lives > 0) { lives--; respawn(); }
            else {
              const prev = state; state = 'wait';
              const over = () => { state = 'gameover'; tmr = 0; api.setHiScore(score); };
              if (api.offerContinue) api.offerContinue(() => { lives = 2; respawn(); state = prev; }, over); else over();
            }
          }
          return;
        }
        if (pl.inv > 0) pl.inv--;
        if (pl.gold > 0) pl.gold--;
        const sp = 1.9;
        let dx = 0, dy = 0;
        if (api.key('ArrowLeft')) dx -= 1; if (api.key('ArrowRight')) dx += 1;
        if (api.key('ArrowUp')) dy -= 1; if (api.key('ArrowDown')) dy += 1;
        if (dx && dy) { dx *= 0.72; dy *= 0.72; }
        pl.x = Math.max(12, Math.min(W - 12, pl.x + dx * sp)); pl.y = Math.max(30, Math.min(H - 20, pl.y + dy * sp));
        pl.anim++;
        // fire breath
        if (fireCD > 0) fireCD--;
        if ((api.key('Space') && fireCD === 0) || api.pressed('Space')) {
          if (shots.length < 6 + pl.heads * 4) {
            fireCD = 7;
            const xs = headXs();
            xs.forEach((ox, i) => {
              const ang = pl.heads === 3 ? (i - 1) * 0.18 : pl.heads === 2 ? (i ? 0.06 : -0.06) : 0;
              shots.push({ x: pl.x + ox, y: pl.y - 16, vx: Math.sin(ang) * 6, vy: -Math.cos(ang) * 6, p: pl.power + (pl.gold ? 1 : 0) });
            });
            A.noise(0.06, { vol: 0.08, freq: 3000, type: 'highpass' });
          }
        }
        if (api.pressed('KeyX') && bombs.length < 2) {
          bombs.push({ x: pl.x, y: pl.y - 10, tx: pl.x, ty: pl.y - 72, t: 0 });
          A.tone(600, 0.25, { type: 'triangle', vol: 0.1, slideTo: 150 });
        }
      }

      function updateWorld() {
        const d = diff();
        scrollY += spd;
        if (quakeT > 0) quakeT--;
        // spawns
        if (state === 'play') {
          if (scrollY > nextAir) { spawnAir(); nextAir = scrollY + (110 + Math.random() * 90) / Math.min(1.8, d); }
          if (scrollY > nextGround) { spawnGround(); nextGround = scrollY + (50 + Math.random() * 60) / Math.min(1.6, d); }
          if (scrollY >= stageLen && !air.length) spawnBoss();
        }
        // shots
        for (const s of shots) { s.x += s.vx; s.y += s.vy; }
        shots = shots.filter(s => s.y > -10 && s.x > -10 && s.x < W + 10 && !s.hit);
        for (const b of bombs) {
          b.t++; const k = b.t / 22;
          b.cx = b.x + (b.tx - b.x) * k; b.cy = b.y + (b.ty - b.y) * k;
          if (b.t >= 22) {
            b.done = true; fx.push({ x: b.tx, y: b.ty, t: 0, big: false, ground: 1 });
            A.noise(0.25, { vol: 0.16, freq: 600, slideTo: 100 });
            for (const g of ground) if (!g.dead && Math.abs(g.x - b.tx) < 14 && Math.abs(gy(g) - b.ty) < 14) hitGround(g, 1);
            if (boss && boss.kind === 'worm' && !boss.dead && boss.up > 0.5 && Math.abs(boss.x - b.tx) < 20 && Math.abs(boss.y - b.ty) < 20) { boss.hp -= 1 + (pl.power >> 1); boss.flash = 6; if (boss.hp <= 0) killBoss(); }
          }
        }
        bombs = bombs.filter(b => !b.done);
        // air enemies
        for (const e of air) {
          e.t++;
          if (e.t < 0) continue;
          if (e.k === 'bird') {
            e.y += 1.3 * Math.min(1.5, d); e.x += Math.sin(e.t / 22) * 1.6 * e.sx;
            if (e.t === 60 && Math.random() < 0.3 * d) aimed(e.x, e.y, 1.8);
          } else if (e.k === 'diver') {
            if (e.t < 50) e.y += e.vy;
            else if (e.t === 50) { const dx = pl.x - e.x, dy = pl.y - e.y, dd = Math.hypot(dx, dy) || 1; e.vx = dx / dd * 2.6 * Math.min(1.4, d); e.vy = dy / dd * 2.6 * Math.min(1.4, d); }
            else { e.x += e.vx; e.y += e.vy; }
          } else if (e.k === 'shooter') {
            if (e.y < e.ty) e.y += 1; else e.x += Math.sin(e.t / 40) * 0.8;
            if (e.t % Math.max(40, Math.round(90 / d)) === 30) { aimed(e.x, e.y, 1.8 * Math.min(1.5, d)); }
            if (e.t > 500) e.y += 2;
          } else if (e.k === 'orb') {
            e.x += e.dir * 1.6; e.y = e.base + Math.sin(e.t / 15) * 20 + e.t * 0.15;
          }
        }
        air = air.filter(e => !e.dead && e.y < H + 20 && e.x > -40 && e.x < W + 40);
        // ground
        for (const g of ground) {
          g.t++;
          if (g.k === 'turret' && !g.dead) { const y = gy(g); if (y > 0 && y < pl.y - 30 && g.t % Math.max(50, Math.round(120 / d)) === 0) aimed(g.x, y, 1.6 * Math.min(1.6, d)); }
          if (g.k === 'crawler' && !g.dead) { g.x += g.vx; if (g.x < 10 || g.x > W - 10) g.vx = -g.vx; }
        }
        ground = ground.filter(g => gy(g) < H + 30 && !(g.dead && g.t > 400));
        // shots vs air / boss
        for (const s of shots) {
          for (const e of air) {
            if (e.t < 0 || e.dead) continue;
            if (Math.abs(s.x - e.x) < 9 && Math.abs(s.y - e.y) < 9) { s.hit = true; e.hp -= s.p; if (e.hp <= 0) { e.dead = true; addScore(e.pts, e.x, e.y); boom(e.x, e.y, false); } else A.tone(1200, 0.03, { vol: 0.06 }); break; }
          }
          if (!s.hit && boss && bossHit(s.p, s.x, s.y)) { s.hit = true; A.tone(900, 0.03, { vol: 0.06 }); }
        }
        // bullets
        for (const b of ebul) { b.x += b.vx; b.y += b.vy; }
        ebul = ebul.filter(b => b.x > -8 && b.x < W + 8 && b.y > -8 && b.y < H + 8 && !b.hit);
        // items
        for (const it of items) { it.t++; it.y += 0.6; it.x += Math.sin(it.t / 15) * 0.5; }
        items = items.filter(it => it.y < H + 10 && !it.got);
        // fx
        for (const f of fx) f.t++;
        fx = fx.filter(f => f.t < (f.big ? 40 : 22));
        for (const q of popups) q.t--; popups = popups.filter(q => q.t > 0);
        // player collisions
        if (!pl.dead && state !== 'wait') {
          for (const b of ebul) if (Math.abs(b.x - pl.x) < 4 && Math.abs(b.y - pl.y) < 5) { b.hit = true; killPlayer(); break; }
          for (const e of air) if (e.t >= 0 && !e.dead && Math.abs(e.x - pl.x) < 10 && Math.abs(e.y - pl.y) < 9) { e.dead = true; boom(e.x, e.y, false); killPlayer(); break; }
          if (boss && !boss.dead) {
            if (boss.kind === 'serpent') { for (const q of boss.parts) if (Math.abs(q.x - pl.x) < 8 && Math.abs(q.y - pl.y) < 8) { killPlayer(); break; } }
            else if (boss.kind !== 'worm' && Math.abs(boss.x - pl.x) < 28 && Math.abs(boss.y - pl.y) < 20) killPlayer();
          }
          for (const it of items) if (Math.abs(it.x - pl.x) < 12 && Math.abs(it.y - pl.y) < 12) { it.got = true; collect(it); }
        }
      }
      function hitGround(g, dmg) {
        g.hp -= dmg;
        if (g.hp > 0) return;
        g.dead = true; g.t = 0;
        const y = gy(g);
        if (g.k === 'egg') {
          const r = Math.random();
          const kind = pl.heads < 3 && r < 0.4 ? 'red' : r < 0.82 ? 'blue' : 'quake';
          items.push({ x: g.x, y, k: kind, t: 0 });
          A.melody([[784, .05], [1047, .08]], { type: 'square', vol: .12 });
        } else { addScore(g.pts, g.x, y); boom(g.x, y, false); }
      }
      function collect(it) {
        A.melody([[1047, .05], [1319, .05], [1568, .05], [2093, .1]], { type: 'square', vol: .12 });
        if (it.k === 'red') { if (pl.heads < 3) pl.heads++; else addScore(2000, it.x, it.y); }
        else if (it.k === 'blue') { if (pl.power < 3) pl.power++; else { pl.gold = 600; addScore(1000, it.x, it.y); } }
        else { quakeT = 40; A.noise(1, { vol: 0.25, freq: 200 }); for (const g of ground) if (!g.dead && gy(g) > 0 && gy(g) < H && g.k !== 'egg') hitGround(g, 99); if (boss && boss.kind === 'worm' && !boss.dead) { boss.hp -= 6; if (boss.hp <= 0) killBoss(); } }
      }

      function tryStart() { if (api.useCredit()) { startGame(); return; } coinFlash = 90; A.tone(80, 0.25, { vol: 0.2 }); }

      function update() {
        if (coinFlash > 0) coinFlash--;
        if (state === 'title') { attractT++; scrollY += 0.5; if (api.anyPressed('Enter', 'Space')) tryStart(); return; }
        if (state === 'ready') { tmr++; scrollY += spd; updatePlayerMoveOnly(); if (tmr > 120) { state = 'play'; tmr = 0; } return; }
        if (state === 'play' || state === 'boss') {
          tmr++;
          updatePlayer();
          if (state === 'wait') return;
          updateWorld();
          if (boss) updateBoss();
          return;
        }
        if (state === 'clear') { tmr++; scrollY += spd; pl.y -= tmr > 90 ? 3 : 0; if (tmr > 200) { stage++; startStage(); } return; }
        if (state === 'gameover') { if (++tmr > 220) { state = 'title'; tmr = 0; attractT = 0; } return; }
      }
      function updatePlayerMoveOnly() {
        let dx = 0, dy = 0;
        if (api.key('ArrowLeft')) dx -= 1; if (api.key('ArrowRight')) dx += 1; if (api.key('ArrowUp')) dy -= 1; if (api.key('ArrowDown')) dy += 1;
        pl.x = Math.max(12, Math.min(W - 12, pl.x + dx * 1.9)); pl.y = Math.max(30, Math.min(H - 20, pl.y + dy * 1.9)); pl.anim++;
      }

      // ================= Rendering =================
      function hsh(a, b) { let h = (a * 374761393 + b * 668265263 + 1013904223) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return (h ^ (h >>> 16)) >>> 0; }
      function riverX(wy) { return W / 2 + Math.sin(wy / 190) * 70 + Math.sin(wy / 67) * 18; }
      function drawTerrain(ctx, st, sy) {
        const shake = quakeT > 0 ? ((quakeT >> 1) & 1 ? 2 : -2) : 0;
        ctx.fillStyle = st.base; ctx.fillRect(0, 0, W, H);
        const off = Math.floor(sy) % 16;
        for (let row = -1; row < H / 16 + 1; row++) {
          const y = row * 16 + off + shake, wyRow = Math.floor((sy - y) / 16);
          for (let col = 0; col < W / 16; col++) {
            const h = hsh(col, wyRow);
            if ((h & 3) === 0) { ctx.fillStyle = st.alt; ctx.fillRect(col * 16, y, 16, 16); }
            const k = (h >> 4) & 15;
            if (k < 2) { ctx.fillStyle = st.deco; ctx.fillRect(col * 16 + 3, y + 4, 8, 6); ctx.fillRect(col * 16 + 5, y + 2, 4, 10); ctx.fillStyle = st.deco2; ctx.fillRect(col * 16 + 4, y + 3, 3, 2); }
            else if (k < 4) { ctx.fillStyle = st.deco2; ctx.fillRect(col * 16 + ((h >> 8) & 7), y + ((h >> 11) & 7), 2, 2); }
          }
        }
        // river band
        for (let y = 0; y < H; y += 4) {
          const wy = sy - y, cx = riverX(wy), w = 22 + Math.sin(wy / 50) * 6;
          ctx.fillStyle = st.river; ctx.fillRect(Math.round(cx - w), y + shake, Math.round(w * 2), 4);
          ctx.fillStyle = st.river2; if (((wy >> 2) + (api.frame >> 3)) % 5 === 0) ctx.fillRect(Math.round(cx - w / 3), y + shake, Math.round(w / 2), 1);
          ctx.fillStyle = st.deco; ctx.fillRect(Math.round(cx - w) - 2, y + shake, 2, 4); ctx.fillRect(Math.round(cx + w), y + shake, 2, 4);
        }
      }
      function drawGround(ctx) {
        for (const g of ground) {
          const y = Math.round(gy(g)), x = Math.round(g.x);
          if (y < -20 || y > H + 20) continue;
          if (g.dead) { ctx.fillStyle = '#201008'; ctx.fillRect(x - 6, y - 4, 12, 8); ctx.fillStyle = '#403020'; ctx.fillRect(x - 4, y - 2, 8, 4); continue; }
          if (g.k === 'egg') { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - 4, y + 4, 10, 3); ctx.drawImage(SP_EGG, x - 4, y - 5); }
          else if (g.k === 'turret') {
            ctx.fillStyle = '#404040'; ctx.fillRect(x - 7, y - 7, 14, 14); ctx.fillStyle = '#808080'; ctx.fillRect(x - 6, y - 6, 12, 12);
            ctx.fillStyle = '#c03030'; ctx.fillRect(x - 3, y - 3, 6, 6);
            const a = Math.atan2(pl.y - y, pl.x - x); ctx.fillStyle = '#202020'; for (let k = 2; k < 9; k++) ctx.fillRect(Math.round(x + Math.cos(a) * k) - 1, Math.round(y + Math.sin(a) * k) - 1, 2, 2);
          } else ctx.drawImage(SP_CRAWL, x - 7, y - 4);
        }
      }
      function drawBird(ctx, e) {
        const img = SP_BIRD[e.c || 0][(e.t >> 3) & 1];
        ctx.drawImage(img, Math.round(e.x - 7), Math.round(e.y - 4));
      }
      function drawAir(ctx) {
        for (const e of air) {
          if (e.t < 0) continue;
          if (e.k === 'bird' || e.k === 'diver') drawBird(ctx, e);
          else if (e.k === 'shooter') {
            const x = Math.round(e.x), y = Math.round(e.y);
            ctx.fillStyle = '#40a080'; ctx.fillRect(x - 10, y - 2, 20, 4); ctx.fillRect(x - 4, y - 7, 8, 14);
            ctx.fillStyle = '#a0ffd0'; ctx.fillRect(x - 2, y - 5, 4, 4); ctx.fillStyle = '#ff2020'; ctx.fillRect(x - 1, y + 3, 2, 2);
            ctx.fillStyle = (e.t >> 2) & 1 ? '#80ffc0' : '#208060'; ctx.fillRect(x - 12, y - 1, 2, 2); ctx.fillRect(x + 10, y - 1, 2, 2);
          } else {
            ctx.fillStyle = (e.t >> 2) & 1 ? '#ff8020' : '#ffe040'; ctx.fillRect(Math.round(e.x) - 4, Math.round(e.y) - 4, 8, 8);
            ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(e.x) - 2, Math.round(e.y) - 2, 3, 3);
          }
        }
      }
      function drawBoss(ctx) {
        const b = boss; if (!b) return;
        const fl = b.flash && (b.flash & 1);
        if (b.dead && (b.dead >> 2) & 1) return;
        const c0 = fl ? '#ffffff' : b.col[0], c1 = b.col[1];
        if (b.kind === 'serpent') {
          for (let i = b.parts.length - 1; i >= 0; i--) {
            const q = b.parts[i], r = i === 0 ? 10 : 7 - Math.floor(i / 4);
            ctx.fillStyle = i === 0 ? c0 : (i & 1 ? b.col[0] : c1);
            for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); ctx.fillRect(Math.round(q.x) - w, Math.round(q.y) + dy, w * 2, 1); }
          }
          const h = b.parts[0]; ctx.fillStyle = '#ffff00'; ctx.fillRect(Math.round(h.x) - 6, Math.round(h.y) + 2, 3, 3); ctx.fillRect(Math.round(h.x) + 3, Math.round(h.y) + 2, 3, 3);
          ctx.fillStyle = '#000'; ctx.fillRect(Math.round(h.x) - 3, Math.round(h.y) + 7, 6, 2);
        } else if (b.kind === 'twin') {
          const x = Math.round(b.x), y = Math.round(b.y);
          ctx.fillStyle = b.col[0]; ctx.fillRect(x - 30, y - 30, 60, 30); ctx.fillRect(x - 20, y - 40, 40, 12);
          ctx.fillStyle = c1; for (let k = 0; k < 5; k++) ctx.fillRect(x - 26 + k * 12, y - 26, 4, 18);
          for (const hd of b.heads) {
            if (hd.hp <= 0) { ctx.fillStyle = '#402030'; ctx.fillRect(x + hd.dx - 4, y - 4, 8, 8); continue; }
            const hx = x + hd.dx, hy = y + 10;
            ctx.fillStyle = b.col[0]; ctx.fillRect(Math.round((x + hx) / 2) - 3, y - 6, 6, 14);
            ctx.fillStyle = hd.fl & 1 ? '#ffffff' : b.col[0];
            for (let dy = -11; dy <= 11; dy++) { const w = Math.round(Math.sqrt(121 - dy * dy)); ctx.fillRect(hx - w, hy + dy, w * 2, 1); }
            ctx.fillStyle = c1; ctx.fillRect(hx - 6, hy - 2, 4, 4); ctx.fillRect(hx + 2, hy - 2, 4, 4);
            ctx.fillStyle = '#400010'; ctx.fillRect(hx - 5, hy + 5, 10, 4); ctx.fillStyle = '#fff'; ctx.fillRect(hx - 4, hy + 5, 1, 2); ctx.fillRect(hx + 3, hy + 5, 1, 2);
          }
        } else if (b.kind === 'worm') {
          const x = Math.round(b.x), y = Math.round(b.y), r = Math.round(4 + b.up * 14);
          ctx.fillStyle = '#80603a'; for (let dy = -r - 3; dy <= r + 3; dy++) { const w = Math.round(Math.sqrt(Math.max(0, (r + 3) ** 2 - dy * dy))); ctx.fillRect(x - w, y + dy, w * 2, 1); }
          if (b.up > 0.1) {
            ctx.fillStyle = c0; for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); ctx.fillRect(x - w, y + dy, w * 2, 1); }
            ctx.fillStyle = '#400000'; const m = Math.round(r * 0.6); for (let dy = -m; dy <= m; dy++) { const w = Math.round(Math.sqrt(m * m - dy * dy)); ctx.fillRect(x - w, y + dy, w * 2, 1); }
            ctx.fillStyle = '#ffffff'; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.fillRect(Math.round(x + Math.cos(a) * m) - 1, Math.round(y + Math.sin(a) * m) - 1, 2, 2); }
          }
        } else {
          const x = Math.round(b.x), y = Math.round(b.y);
          ctx.fillStyle = b.col[0];
          for (let k = 0; k < 30; k++) { const w = 22 - Math.floor(k / 2), lx = x - 50 + k; ctx.fillRect(lx, y - 20 + k, w, 2); ctx.fillRect(x + 50 - k - w, y - 20 + k, w, 2); }
          ctx.fillStyle = c0; ctx.fillRect(x - 20, y - 24, 40, 50); ctx.fillRect(x - 14, y - 34, 28, 12);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 18, y - 40, 4, 8); ctx.fillRect(x + 14, y - 40, 4, 8);
          ctx.fillStyle = c1; ctx.fillRect(x - 10, y - 28, 6, 4); ctx.fillRect(x + 4, y - 28, 6, 4);
          ctx.fillStyle = '#200020'; ctx.fillRect(x - 8, y - 16, 16, 6);
          ctx.fillStyle = (b.t >> 3) & 1 ? '#ff4040' : '#ffe040'; ctx.fillRect(x - 4, y + 2, 8, 8);
        }
        // boss vitality bar
        if (!b.dead) { ctx.fillStyle = '#400000'; ctx.fillRect(40, 20, 144, 3); ctx.fillStyle = '#ff4040'; ctx.fillRect(40, 20, Math.round(144 * Math.max(0, b.hp) / b.max), 3); }
      }
      function drawDragon(ctx, x, y, heads, anim, white, gold) {
        const f = (anim >> 3) & 1;
        const body = white ? SP_BODYW[f] : gold ? SP_BODYG[f] : SP_BODY[f];
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(Math.round(x) - 6 + 12, Math.round(y) + 20, 12, 4);
        ctx.drawImage(body, Math.round(x) - 11, Math.round(y) - 6);
        const xs = heads === 1 ? [0] : heads === 2 ? [-6, 6] : [-9, 0, 9];
        for (const ox of xs) {
          ctx.fillStyle = white ? '#fff' : gold ? '#d0a020' : '#2858f0'; ctx.fillRect(Math.round(x + ox * 0.5) - 1, Math.round(y) - 8, 2, 4);
          ctx.drawImage(gold ? SP_HEADG : SP_HEAD, Math.round(x + ox) - 2, Math.round(y) - 15);
        }
      }
      function drawPlayer(ctx) {
        if (pl.dead) return;
        if (pl.inv > 0 && (pl.inv >> 2) & 1) return;
        drawDragon(ctx, pl.x, pl.y, pl.heads, pl.anim, false, pl.gold > 0);
        // bomb sight
        ctx.fillStyle = 'rgba(255,255,255,.5)'; const tx = Math.round(pl.x), ty = Math.round(pl.y - 72);
        ctx.fillRect(tx - 5, ty, 3, 1); ctx.fillRect(tx + 3, ty, 3, 1); ctx.fillRect(tx, ty - 5, 1, 3); ctx.fillRect(tx, ty + 3, 1, 3);
      }
      function drawShots(ctx) {
        for (const s of shots) {
          const r = 1 + s.p;
          ctx.fillStyle = s.p >= 3 ? '#ffffff' : '#ff8020'; ctx.fillRect(Math.round(s.x) - r, Math.round(s.y) - r - 1, r * 2, r * 2 + 3);
          ctx.fillStyle = s.p >= 4 ? '#40c0ff' : '#ffe040'; ctx.fillRect(Math.round(s.x) - r + 1, Math.round(s.y) - r, r * 2 - 2, r * 2);
        }
        for (const b of bombs) { const k = 1 - b.t / 22; ctx.fillStyle = '#ffe040'; const r = Math.max(1, Math.round(1 + k * 2)); ctx.fillRect(Math.round(b.cx) - r, Math.round(b.cy) - r, r * 2, r * 2); }
        for (const b of ebul) { ctx.fillStyle = (api.frame >> 2) & 1 ? '#ff60ff' : '#ffffff'; ctx.fillRect(Math.round(b.x) - 2, Math.round(b.y) - 2, 4, 4); ctx.fillStyle = '#ff2080'; ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 1, 2, 2); }
      }
      function drawItems(ctx) {
        for (const it of items) {
          const x = Math.round(it.x), y = Math.round(it.y);
          const col = it.k === 'red' ? '#ff4020' : it.k === 'blue' ? '#3080ff' : '#ffe020';
          ctx.fillStyle = col; for (let dy = -5; dy <= 5; dy++) { const w = Math.round(Math.sqrt(25 - dy * dy)); ctx.fillRect(x - w, y + dy, w * 2, 1); }
          ctx.fillStyle = '#fff'; ctx.fillRect(x - 3, y - 3, 2, 2);
          if ((it.t >> 3) & 1) { ctx.fillRect(x - 8, y, 2, 1); ctx.fillRect(x + 7, y, 2, 1); ctx.fillRect(x, y - 8, 1, 2); ctx.fillRect(x, y + 7, 1, 2); }
        }
      }
      function drawFx(ctx) {
        for (const f of fx) {
          if (f.t < 0) continue;
          const r = f.big ? Math.min(20, f.t) : Math.min(9, f.t * 0.8);
          const cols = f.ground ? ['#ffffff', '#ffc040', '#806040'] : ['#ffffff', '#ffe040', '#ff6020'];
          ctx.fillStyle = cols[Math.min(2, Math.floor(f.t / (f.big ? 12 : 7)))];
          for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + f.t * 0.1; ctx.fillRect(Math.round(f.x + Math.cos(a) * r) - 2, Math.round(f.y + Math.sin(a) * r) - 2, 4, 4); }
          if (f.t < 6) { ctx.fillRect(Math.round(f.x) - 4, Math.round(f.y) - 4, 8, 8); }
        }
        if (pl.dead && pl.dead < 60) { ctx.fillStyle = (pl.dead >> 2) & 1 ? '#ffffff' : '#ff8020'; const r = pl.dead; for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; ctx.fillRect(Math.round(pl.x + Math.cos(a) * r) - 2, Math.round(pl.y + Math.sin(a) * r) - 2, 4, 4); } }
        for (const q of popups) txt(ctx, q.s, Math.round(q.x), Math.round(q.y) - (50 - q.t) / 3, '#ffffff', 1, 'c');
      }
      function drawHUD(ctx) {
        txt(ctx, '1UP', 16, 2, '#ff4040'); txt(ctx, String(score).padStart(7, ' '), 0, 11, '#ffffff');
        txt(ctx, 'HI-SCORE', 120, 2, '#ff4040'); txt(ctx, String(hi).padStart(7, ' '), 120, 11, '#ffffff');
        if (state !== 'title') {
          for (let i = 0; i < Math.min(5, lives); i++) { ctx.fillStyle = '#2858f0'; ctx.fillRect(6 + i * 12, H - 10, 8, 6); ctx.fillStyle = '#90c8ff'; ctx.fillRect(9 + i * 12, H - 13, 2, 3); }
          txt(ctx, 'AREA ' + (stage + 1), W - 4, H - 10, '#ffe040', 1, 'r');
        } else txt(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 8, H - 10, '#ffffff');
      }
      function drawTitle(ctx) {
        drawTerrain(ctx, STAGES[Math.floor(attractT / 600) % STAGES.length], scrollY);
        ctx.fillStyle = 'rgba(0,0,20,.55)'; ctx.fillRect(0, 0, W, H);
        txt(ctx, 'DRAGON', W / 2 + 2, 48, '#103080', 3, 'c'); txt(ctx, 'DRAGON', W / 2, 46, '#40a0ff', 3, 'c');
        txt(ctx, 'SPIRIT', W / 2 + 2, 76, '#806000', 3, 'c'); txt(ctx, 'SPIRIT', W / 2, 74, '#ffc020', 3, 'c');
        txt(ctx, 'THE NEW LEGEND', W / 2, 104, '#ffffff', 1, 'c');
        drawDragon(ctx, W / 2, 150 + Math.sin(attractT / 30) * 4, 1 + Math.floor(attractT / 120) % 3, attractT, false, false);
        txt(ctx, 'RESCUE PRINCESS ALICIA', W / 2, 182, '#ff80c0', 1, 'c');
        txt(ctx, 'FROM THE DEMON ZAWEL', W / 2, 192, '#ff80c0', 1, 'c');
        txt(ctx, 'SPACE: FIRE   X: BOMB', W / 2, 210, '#a0c0ff', 1, 'c');
        const blink = (attractT >> 5) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) txt(ctx, 'INSERT COIN', W / 2, 230, '#ff4040', 1, 'c'); }
        else if (blink) txt(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 230, '#ffffff', 1, 'c');
        txt(ctx, '\u00a9 1987 NAMCO', W / 2, 252, '#ffffff', 1, 'c');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { drawTitle(ctx); drawHUD(ctx); return; }
        drawTerrain(ctx, S(), scrollY);
        drawGround(ctx);
        if (boss && boss.kind === 'worm') drawBoss(ctx);
        drawItems(ctx);
        drawAir(ctx);
        if (boss && boss.kind !== 'worm') drawBoss(ctx);
        drawShots(ctx);
        drawPlayer(ctx);
        drawFx(ctx);
        drawHUD(ctx);
        if (state === 'ready') {
          ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(40, 110, 144, 40);
          txt(ctx, 'AREA ' + (stage + 1), W / 2, 116, '#ffffff', 1, 'c'); txt(ctx, S().name, W / 2, 132, '#ffe040', 1, 'c');
        }
        if (state === 'boss' && boss && boss.t < 120 && ((boss.t >> 4) & 1)) { txt(ctx, 'WARNING!', W / 2, 120, '#ff4040', 1, 'c'); txt(ctx, S().bossName, W / 2, 134, '#ffffff', 1, 'c'); }
        if (state === 'clear') { txt(ctx, 'AREA ' + (stage + 1) + ' CLEAR', W / 2, 120, '#ffe040', 1, 'c'); }
        if (state === 'gameover') { ctx.fillStyle = '#000'; ctx.fillRect(64, 126, 96, 16); txt(ctx, 'GAME OVER', W / 2, 130, '#ff4040', 1, 'c'); }
      }
      resetPlayer(true);
      return { update, render, destroy() { } };
    }
  });
})();
