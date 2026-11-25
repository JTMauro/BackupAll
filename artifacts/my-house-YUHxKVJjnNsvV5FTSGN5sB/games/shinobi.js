// Shinobi (Sega, 1987) \u2014 from-scratch recreation. Joe Musashi fights through five missions of two-level
// stages: jump between the lower and upper floors, throw shuriken or slash and kick at close range, free every
// tied hostage before the exit opens, call Ninja Magic once per stage, beat the mission boss, then try the
// first-person shuriken bonus stage.
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
    '"': [10, 10, 20, 0, 0, 0, 0], '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], '=': [0, 0, 31, 0, 31, 0, 0],
    '+': [0, 4, 4, 31, 4, 4, 0], '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2],
    '>': [8, 4, 2, 1, 2, 4, 8]
  };
  // col: css colour or array of 7 per-row colours (gradient lettering)
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    for (let r = 0; r < 7; r++) {
      ctx.fillStyle = typeof col === 'string' ? col : col[r];
      for (let i = 0; i < s.length; i++) {
        const g = FONT[s[i]]; if (!g) continue;
        const bits = g[r]; if (!bits) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
    return w;
  }
  function textS(ctx, s, x, y, col, sc, align) { // with 1px drop shadow / outline
    sc = sc || 1;
    text(ctx, s, x + 1, y + 1, '#000', sc, align);
    if (sc > 1) { text(ctx, s, x - 1, y, '#000', sc, align); text(ctx, s, x + 1, y, '#000', sc, align); text(ctx, s, x, y - 1, '#000', sc, align); text(ctx, s, x, y + sc, '#000', sc, align); }
    return text(ctx, s, x, y, col, sc, align);
  }

  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  ArcadeRegistry.register({
    id: 'shinobi', title: 'Shinobi', year: 1987, maker: 'Sega',
    width: 320, height: 224, vector: false, pointer: false,
    controls: 'Arrows: move/crouch \u00b7 Space: jump (Up+Space: leap up a level, Down+Space: drop down) \u00b7 X: shuriken/sword \u00b7 Z or Enter: ninja magic',
    marquee: { bg: '#100000', fg: '#ffffff', accent: '#e02020' },
    create(api) {
      const W = 320, H = 224, HUD = 18, LO = 208, UP = 128;
      const audio = api.audio;
      const MISSIONS = [
        { name: 'MISSION 1', sky: '#101830', b1: '#202838', b2: '#303a50', win: '#e0c040', floor: '#504840', floorD: '#302820', rail: '#806040', boss: 'kenoh' },
        { name: 'MISSION 2', sky: '#0a2040', b1: '#18304a', b2: '#24405a', win: '#60c0ff', floor: '#5a4a38', floorD: '#3a2a18', rail: '#a07040', boss: 'heli' },
        { name: 'MISSION 3', sky: '#301810', b1: '#4a2818', b2: '#603820', win: '#ffa040', floor: '#806040', floorD: '#503820', rail: '#c08040', boss: 'mandara' },
        { name: 'MISSION 4', sky: '#102010', b1: '#1a3020', b2: '#284030', win: '#80ff80', floor: '#605040', floorD: '#403020', rail: '#a08050', boss: 'lobster' },
        { name: 'MISSION 5', sky: '#180818', b1: '#281428', b2: '#381e38', win: '#ff60ff', floor: '#484048', floorD: '#282028', rail: '#8a6a8a', boss: 'masked' }
      ];
      const BOSSNAME = { kenoh: 'KEN OH', heli: 'BLACK TURTLE', mandara: 'MANDARA', lobster: 'LOBSTER', masked: 'MASKED NINJA' };
      let hi = api.getHiScore(50000);
      let mode = 'title', modeT = 0, score = 0, lives = 0, mission = 0, stage = 0, loop = 0, nextExtra = 50000, coinFlash = 0;
      let len = 0, camX = 0, walks = [], enemies = [], hostages = [], spawns = [], shots = [], eshots = [], pops = [], fx = [];
      let joe = null, timeLeft = 0, magicUsed = false, magicT = 0, boss = null, power = false, bgmT = 0, bonusStage = null, tallyT = 0, endInfo = null, msg = null;

      function M() { return MISSIONS[mission % 5]; }
      function addScore(n) {
        score += n;
        while (score >= nextExtra) { lives++; nextExtra += 100000; audio.melody([[880, .08], [1175, .08], [1760, .16]], { type: 'square', vol: 0.12 }); }
        if (score > hi) hi = score;
      }
      function pop(x, y, t, col) { pops.push({ x, y, t: String(t), f: 50, col: col || '#fff' }); }
      function say(t, f) { msg = { t, f: f || 120 }; }
      const sfx = {
        throwS() { audio.noise(0.06, { vol: 0.12, freq: 6000, type: 'highpass' }); audio.tone(1800, 0.05, { type: 'square', vol: 0.04, slideTo: 900 }); },
        gun() { audio.noise(0.08, { vol: 0.18, freq: 2500 }); },
        slash() { audio.noise(0.1, { vol: 0.16, freq: 4000, slideTo: 800, type: 'bandpass' }); },
        hit() { audio.tone(220, 0.12, { type: 'square', vol: 0.12, slideTo: 60 }); audio.noise(0.08, { vol: 0.14, freq: 1800 }); },
        clink() { audio.tone(2400, 0.06, { type: 'triangle', vol: 0.12 }); audio.tone(3200, 0.05, { type: 'triangle', vol: 0.08, delay: 0.03 }); },
        enemyShot() { audio.noise(0.06, { vol: 0.12, freq: 1500 }); },
        jump() { audio.tone(240, 0.12, { type: 'triangle', vol: 0.1, slideTo: 480 }); },
        die() { audio.melody([[440, .12], [415, .12], [392, .12], [370, .12], [349, .4]], { type: 'sawtooth', vol: 0.1 }); },
        rescue() { audio.melody([[784, .07], [988, .07], [1175, .07], [1568, .14]], { type: 'square', vol: 0.1 }); },
        magic() { audio.noise(1.2, { vol: 0.3, freq: 300, slideTo: 3000 }); audio.tone(110, 1.2, { type: 'sawtooth', vol: 0.12, slideTo: 880 }); },
        clear() { audio.melody([[392, .12], [523, .12], [659, .12], [784, .24], [659, .12], [784, .4]], { type: 'square', vol: 0.12 }); }
      };
      // original minor-key theme
      const BGM = [[220, .16], [262, .16], [330, .16], [294, .16], [262, .16], [247, .16], [220, .32], [196, .16], [220, .16], [262, .16], [247, .16], [220, .48],
        [330, .16], [392, .16], [440, .16], [392, .16], [349, .16], [330, .16], [294, .32], [262, .16], [294, .16], [330, .16], [247, .16], [220, .48]];
      const BASS = [[110, .32], [110, .16], [165, .16], [110, .32], [98, .32], [87, .32], [87, .16], [131, .16], [98, .32], [110, .32], [110, .32], [110, .16], [165, .16], [147, .32], [131, .32], [123, .32], [110, .64]];

      // ---------- figures (rect-built) ----------
      function man(ctx, x, y, face, P, pose, fr) {
        x = Math.round(x); y = Math.round(y);
        const R = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(face > 0 ? x + dx : x - dx - w, y + dy, w, h); };
        if (pose === 'crouch') {
          R(-5, -6, 4, 6, P.legs); R(1, -6, 5, 3, P.legs); R(4, -3, 2, 3, P.legs);
          R(-4, -14, 8, 8, P.body); R(-1, -14, 2, 8, P.belt || P.body);
          R(-3, -20, 6, 6, P.skin); R(-3, -20, 6, 2, P.hair); if (P.mask) R(-3, -18, 6, 2, P.mask);
          R(1, -18, 2, 1, '#000');
          R(3, -12, 6, 2, P.skin);
          return;
        }
        if (pose === 'bound') {
          R(-5, -5, 10, 5, P.legs); R(-4, -14, 8, 9, P.body); R(-3, -20, 6, 6, P.skin); R(-3, -20, 6, 2, P.hair);
          R(-5, -11, 10, 1, '#e0c080'); R(-5, -8, 10, 1, '#e0c080');
          return;
        }
        if (pose === 'jump') {
          R(-4, -10, 8, 5, P.legs); R(-5, -6, 4, 3, P.legs); R(2, -7, 4, 3, P.legs);
          R(-4, -20, 8, 10, P.body); R(-1, -14, 2, 3, P.belt || P.body);
          R(-3, -26, 6, 6, P.skin); R(-3, -26, 6, 2, P.hair); if (P.mask) R(-3, -24, 6, 2, P.mask);
          R(1, -24, 2, 1, '#000'); R(3, -19, 5, 2, P.skin); R(-6, -19, 3, 2, P.skin);
          return;
        }
        // standing family
        const st = (fr & 1) && pose === 'walk';
        if (pose === 'walk') { if (st) { R(-4, -12, 3, 12, P.legs); R(2, -12, 3, 10, P.legs); R(3, -2, 3, 2, P.legs); } else { R(-5, -12, 3, 10, P.legs); R(-6, -2, 3, 2, P.legs); R(1, -12, 3, 12, P.legs); } }
        else if (pose === 'kick') { R(-4, -12, 3, 12, P.legs); R(0, -13, 12, 3, P.legs); }
        else { R(-4, -12, 3, 12, P.legs); R(1, -12, 3, 12, P.legs); }
        R(-4, -22, 8, 10, P.body); R(-4, -14, 8, 2, P.belt || P.body);
        R(-3, -28, 6, 6, P.skin); R(-3, -28, 6, 2, P.hair); if (P.mask) R(-3, -26, 6, 2, P.mask);
        R(1, -26, 2, 1, '#000');
        if (pose === 'throw' || pose === 'gun') { R(3, -21, 8, 2, P.skin); if (pose === 'gun') R(10, -22, 4, 2, '#202020'); }
        else if (pose === 'slash') { R(3, -21, 4, 2, P.skin); ctx.fillStyle = '#e8f0ff'; for (let i = 0; i < 14; i++) ctx.fillRect(face > 0 ? x + 6 + i : x - 7 - i, y - 30 + i + (i > 7 ? (i - 7) : 0), 2, 1); }
        else if (pose === 'shield') { R(3, -24, 4, 22, '#a0a0b0'); R(4, -23, 2, 20, '#d0d0e0'); }
        else if (pose === 'knife') { R(3, -27, 2, 6, P.skin); }
        else { R(-6, -21, 2, 7, P.skin); R(4, -21, 2, 7, P.skin); }
      }
      const JOE = { skin: '#ffc890', hair: '#e8e8e8', mask: '#e8e8e8', body: '#f0f0f0', legs: '#e0e0e0', belt: '#3050c0' };
      const JOEP = { skin: '#ffc890', hair: '#e8e8e8', mask: '#e8e8e8', body: '#ffe040', legs: '#f0d030', belt: '#e02020' };
      const PALS = {
        gunman: { skin: '#ffc890', hair: '#302010', body: '#4060a0', legs: '#283050', belt: '#000' },
        punk: { skin: '#e0a070', hair: '#ff40a0', body: '#606060', legs: '#3050a0', belt: '#000' },
        ninja: { skin: '#ffc890', hair: '#20a040', mask: '#20a040', body: '#20a040', legs: '#108030', belt: '#e0e040' },
        ninjaR: { skin: '#ffc890', hair: '#c02020', mask: '#c02020', body: '#c02020', legs: '#901010', belt: '#ffe040' },
        shield: { skin: '#d09060', hair: '#000', body: '#806040', legs: '#504030', belt: '#c0a040' },
        knife: { skin: '#ffc890', hair: '#c08020', body: '#c04040', legs: '#404040', belt: '#000' },
        child: { skin: '#ffc890', hair: '#603010', body: '#ff8080', legs: '#4060c0' }
      };

      // ---------- stage generation ----------
      function genStage() {
        const lv = mission * 2 + stage + loop * 10;
        let s = (lv * 69069 + 12345) % 2147483647 + 1; const R = () => (s = (s * 48271) % 2147483647) / 2147483647;
        len = 1500 + Math.min(900, lv * 100);
        walks = []; spawns = []; hostages = [];
        let x = 260 + Math.floor(R() * 120);
        while (x < len - 300) {
          const w = 180 + Math.floor(R() * 260);
          walks.push({ x, w: Math.min(w, len - 260 - x) });
          x += w + 80 + Math.floor(R() * 120);
        }
        const types = ['gunman', 'punk', 'ninja', 'shield', 'knife'];
        const ntype = Math.min(5, 2 + Math.floor(lv / 2) + 1);
        for (let ex = 300; ex < len - 120; ex += 90 + Math.floor(R() * 110) - Math.min(40, lv * 4)) {
          const up = onWalk(ex) && R() < 0.5;
          spawns.push({ x: ex, kind: types[Math.floor(R() * ntype)], up });
        }
        const nh = 3 + Math.min(3, Math.floor(lv / 3));
        for (let i = 0; i < nh; i++) {
          const hx = Math.floor(len * (i + 0.7) / (nh + 0.5));
          const up = onWalk(hx) && R() < 0.5;
          hostages.push({ x: hx, up, power: i === 1 || (i === 3 && R() < 0.5), saved: false, t: 0 });
        }
      }
      function onWalk(x) { return walks.some(w => x > w.x + 10 && x < w.x + w.w - 10); }
      function walkAt(x) { return walks.some(w => x > w.x - 2 && x < w.x + w.w + 2); }
      function levelY(up) { return up ? UP : LO; }

      function newJoe(x) {
        return { x, y: LO, vx: 0, vy: 0, ground: true, face: 1, crouch: false, atk: 0, atkPose: 'throw', anim: 0, inv: 120, ign: false, dieT: 0, kb: 0 };
      }
      function startStage() {
        enemies = []; shots = []; eshots = []; pops = []; fx = []; boss = null; magicUsed = false; magicT = 0;
        timeLeft = 180; msg = null;
        if (stage === 2) {
          len = W; walks = []; spawns = []; hostages = [];
          const kind = M().boss;
          if (kind === 'heli' || kind === 'mandara') walks = [{ x: 0, w: 90 }, { x: 230, w: 90 }];
          boss = makeBoss(kind);
          joe = newJoe(40); camX = 0;
        } else {
          genStage(); joe = newJoe(40); camX = 0;
        }
        mode = 'ready'; modeT = 0; bgmT = 0;
      }
      function startGame() {
        score = 0; lives = 2; mission = 0; stage = 0; loop = 0; nextExtra = 50000; power = false;
        startStage();
      }
      function nextStage() {
        stage++;
        if (stage > 2) { startBonus(); return; }
        startStage();
      }
      function afterBonus() {
        stage = 0; mission++;
        if (mission >= 5) { mission = 0; loop++; }
        startStage();
      }

      // ---------- player ----------
      function killJoe() {
        if (mode !== 'play' || joe.inv > 0) return;
        mode = 'die'; modeT = 0; joe.dieT = 0; joe.vy = -3; power = false;
        sfx.die();
      }
      function updateJoe() {
        const j = joe;
        if (j.inv > 0) j.inv--;
        if (j.atk > 0) j.atk--;
        if (j.kb > 0) { j.kb--; j.x += j.kbv; }
        const L = api.key('ArrowLeft'), Rt = api.key('ArrowRight'), Dn = api.key('ArrowDown'), Up = api.key('ArrowUp');
        j.crouch = j.ground && Dn && !api.pressed('Space');
        let vx = 0;
        if (!j.crouch && j.atk < 6) { if (L && !Rt) { vx = -1.5; j.face = -1; } else if (Rt && !L) { vx = 1.5; j.face = 1; } }
        if (j.crouch) { if (L) j.face = -1; if (Rt) j.face = 1; }
        if (!j.ground) vx = j.vx;
        j.vx = vx;
        j.x = clamp(j.x + vx, camX + 6, (boss ? W : len) - 6);
        if (j.ground && api.pressed('Space')) {
          if (Up && (j.y === LO) && (walkAt(j.x) || walkAt(j.x + j.face * 30))) { j.vy = -6.9; j.big = true; sfx.jump(); audio.tone(400, 0.2, { type: 'triangle', vol: 0.08, slideTo: 900 }); }
          else if (Dn && j.y === UP) { j.ign = true; j.vy = -1.5; j.big = true; }
          else { j.vy = -4.3; j.big = false; sfx.jump(); }
          j.ground = false;
          j.vx = vx;
        }
        if (j.ground && j.y === UP && !walkAt(j.x)) { j.ground = false; j.vy = 0; j.ign = false; }
        if (!j.ground) {
          const py = j.y; j.vy = Math.min(6, j.vy + 0.28); j.y += j.vy;
          if (j.vy > 0 && !j.ign && py <= UP && j.y >= UP && walkAt(j.x)) { j.y = UP; j.vy = 0; j.ground = true; }
          if (j.y >= LO) { j.y = LO; j.vy = 0; j.ground = true; j.ign = false; }
          if (j.ign && j.y > UP + 8) j.ign = false;
        }
        j.anim += Math.abs(vx) * 0.08;
        // attack: sword/kick when an enemy is right in front, otherwise shuriken
        if (api.pressed('KeyX') && j.atk <= 4) {
          const near = enemies.find(e => !e.dead && Math.abs(e.y - j.y) < 20 && (e.x - j.x) * j.face > -4 && Math.abs(e.x - j.x) < 26);
          const nearBoss = boss && boss.hp > 0 && boss.melee && Math.abs(boss.x - j.x) < 30 && Math.abs(boss.y - j.y) < 30;
          if (near || nearBoss) {
            j.atk = 14; j.atkPose = j.crouch ? 'crouch' : (j.ground && Math.random() < 0.4 ? 'kick' : 'slash'); sfx.slash();
            if (near) hitEnemy(near, true, 3);
            else damageBoss(2);
          } else if (shots.length < 3) {
            j.atk = 10; j.atkPose = power ? 'gun' : 'throw';
            const hy = j.crouch ? j.y - 9 : j.y - 21;
            shots.push({ x: j.x + j.face * 8, y: hy, vx: j.face * (power ? 6 : 4.6), t: 0, power });
            if (power) sfx.gun(); else sfx.throwS();
          }
        }
        // ninja magic
        if ((api.pressed('KeyZ') || api.pressed('Enter')) && !magicUsed) {
          magicUsed = true; magicT = 120; sfx.magic();
          for (const e of enemies) if (!e.dead && Math.abs(e.x - camX - W / 2) < W / 2 + 10) hitEnemy(e, true, 3);
          eshots = [];
          if (boss && boss.hp > 0) damageBoss(Math.ceil(boss.maxHp * 0.3));
        }
        // hostages
        for (const h of hostages) {
          if (h.saved) continue;
          if (Math.abs(h.x - j.x) < 12 && Math.abs(levelY(h.up) - j.y) < 10) {
            h.saved = true; h.t = 0; addScore(500); sfx.rescue();
            if (h.power) { power = true; pop(h.x, levelY(h.up) - 40, 'POWER UP!', '#ffe040'); }
            else pop(h.x, levelY(h.up) - 40, 'THANK YOU', '#7ff');
          }
        }
        // exit
        if (!boss && j.x > len - 40) {
          if (hostages.every(h => h.saved)) stageClear();
          else if (!msg) say('RESCUE ALL HOSTAGES!', 90);
        }
        camX = boss ? 0 : clamp(j.x - W / 2 + 20, 0, len - W);
      }
      function stageClear() {
        mode = 'clear'; modeT = 0;
        endInfo = { time: Math.floor(timeLeft) * 50, magic: magicUsed ? 0 : 5000 };
        tallyT = 0; sfx.clear();
      }

      // ---------- enemies ----------
      function spawnEnemy(sp) {
        const e = { kind: sp.kind, x: sp.x, y: levelY(sp.up), up: sp.up, face: -1, t: Math.floor(Math.random() * 40), hp: 1, crouch: false, state: 'idle', vy: 0, ground: true, dead: false, dieT: 0, atkT: 0 };
        if (e.kind === 'shield') e.hp = 2;
        enemies.push(e);
      }
      const EPTS = { gunman: 200, punk: 100, ninja: 300, shield: 400, knife: 200 };
      function hitEnemy(e, melee, dmg) {
        if (e.dead) return;
        e.hp -= dmg;
        if (e.hp <= 0) { e.dead = true; e.dieT = 0; addScore(EPTS[e.kind] || 100); pop(e.x, e.y - 34, EPTS[e.kind] || 100); sfx.hit(); }
        else sfx.clink();
      }
      function enemyFire(e, kind, vx, y, vy) { eshots.push({ x: e.x + e.face * 8, y, vx, vy: vy || 0, kind, t: 0 }); }
      function updateEnemies() {
        while (spawns.length && spawns[0].x < camX + W + 30) spawnEnemy(spawns.shift());
        const diff = Math.min(2, mission * 0.2 + loop * 0.5 + stage * 0.1);
        for (let i = enemies.length - 1; i >= 0; i--) {
          const e = enemies[i];
          if (e.dead) { e.dieT++; if (e.dieT > 40) enemies.splice(i, 1); continue; }
          e.t++;
          const dx = joe.x - e.x, same = Math.abs(joe.y - e.y) < 12 && joe.ground;
          if (Math.abs(dx) > 4) e.face = dx > 0 ? 1 : -1;
          const onScreen = e.x > camX - 10 && e.x < camX + W + 10;
          switch (e.kind) {
            case 'gunman':
              if (e.t % 100 === 40) e.crouch = Math.random() < 0.45;
              if (onScreen && same && e.t % Math.round(110 - diff * 25) === 0) { enemyFire(e, 'bullet', e.face * 2.6, e.y - (e.crouch ? 9 : 21)); sfx.enemyShot(); e.atkT = 10; }
              if (!same && onScreen && Math.abs(dx) > 40) e.x += e.face * 0.4;
              break;
            case 'punk':
              if (e.atkT > 0) { e.atkT--; if (e.atkT === 6 && Math.abs(dx) < 20 && same) killJoe(); }
              else if (same && Math.abs(dx) < 18 && e.t % 40 === 0) e.atkT = 24;
              else if (onScreen) e.x += e.face * (0.7 + diff * 0.2);
              break;
            case 'shield':
              if (e.atkT > 0) { e.atkT--; if (e.atkT === 8 && Math.abs(dx) < 22 && same) killJoe(); }
              else if (same && Math.abs(dx) < 20 && e.t % 60 === 0) e.atkT = 30;
              else if (onScreen) e.x += e.face * 0.45;
              break;
            case 'knife':
              if (onScreen && e.t % Math.round(120 - diff * 20) === 0 && Math.abs(dx) < 200) { enemyFire(e, 'knife', e.face * 2.2, e.y - 24, -2.2); e.atkT = 12; }
              if (e.atkT > 0) e.atkT--;
              break;
            case 'ninja':
              if (e.ground) {
                if (onScreen && e.t % 70 === 0) {
                  // leap toward Joe's level, or hop and throw
                  if (joe.y !== e.y && (e.up ? true : walkAt(e.x + e.face * 30))) { e.vy = e.up ? -1.5 : -6.9; e.ign = e.up; e.ground = false; e.vx = e.face * 1.2; }
                  else { e.vy = -4; e.ground = false; e.vx = e.face * 1.0; }
                }
                if (onScreen && same && e.t % 70 === 35) { enemyFire(e, 'star', e.face * 3, e.y - 20); e.atkT = 8; }
              } else {
                const py = e.y; e.vy += 0.28; e.y += e.vy; e.x += e.vx;
                if (e.vy > 0 && !e.ign && py <= UP && e.y >= UP && walkAt(e.x)) { e.y = UP; e.vy = 0; e.ground = true; e.up = true; }
                if (e.y >= LO) { e.y = LO; e.vy = 0; e.ground = true; e.up = false; e.ign = false; }
                if (e.ign && e.y > UP + 8) e.ign = false;
              }
              if (e.atkT > 0) e.atkT--;
              break;
          }
          if (e.up && e.ground && e.y === UP && !walkAt(e.x)) { e.x -= e.face * 1; }
          // body contact: knockback only
          if (mode === 'play' && joe.inv <= 0 && joe.kb <= 0 && Math.abs(e.x - joe.x) < 9 && Math.abs(e.y - joe.y) < 20) {
            joe.kb = 10; joe.kbv = dx > 0 ? 1.6 : -1.6; audio.tone(150, 0.08, { type: 'square', vol: 0.1 });
          }
          if (e.x < camX - 120) enemies.splice(i, 1);
        }
      }
      function updateShots() {
        for (let i = shots.length - 1; i >= 0; i--) {
          const s = shots[i]; s.x += s.vx; s.t++;
          let gone = s.x < camX - 10 || s.x > camX + W + 10;
          for (const e of enemies) {
            if (e.dead || gone) continue;
            const top = e.y - (e.crouch && e.kind === 'gunman' ? 16 : 28);
            if (Math.abs(s.x - e.x) < 7 && s.y > top && s.y < e.y) {
              const front = Math.sign(s.vx) === -e.face;
              if (e.kind === 'shield' && front && e.atkT <= 0 && !s.power) { sfx.clink(); fx.push({ x: s.x, y: s.y, t: 0 }); gone = true; }
              else if (e.kind === 'ninja' && front && e.ground && Math.random() < 0.35 && !s.power) { sfx.clink(); fx.push({ x: s.x, y: s.y, t: 0 }); gone = true; e.atkT = 8; }
              else { hitEnemy(e, false, s.power ? 2 : 1); gone = true; }
            }
          }
          if (!gone && boss && boss.hp > 0 && boss.hit(s)) { gone = true; }
          if (gone) shots.splice(i, 1);
        }
        for (let i = eshots.length - 1; i >= 0; i--) {
          const s = eshots[i]; s.x += s.vx; s.t++;
          if (s.kind === 'knife' || s.kind === 'fire' || s.kind === 'drop') { s.vy += s.kind === 'drop' ? 0.12 : 0.1; s.y += s.vy; }
          else if (s.vy) s.y += s.vy;
          if (s.y > LO + 2 && s.kind !== 'wave') { eshots.splice(i, 1); continue; }
          if (s.x < camX - 20 || s.x > camX + W + 20 || s.t > 400) { eshots.splice(i, 1); continue; }
          if (mode !== 'play' || joe.inv > 0) continue;
          const jt = joe.y - (joe.crouch ? 16 : (joe.ground ? 28 : 26));
          if (Math.abs(s.x - joe.x) < 6 && s.y > jt && s.y < joe.y + 1) { eshots.splice(i, 1); killJoe(); }
        }
        for (let i = fx.length - 1; i >= 0; i--) if (++fx[i].t > 10) fx.splice(i, 1);
      }

      // ---------- bosses ----------
      function makeBoss(kind) {
        const hpBase = { kenoh: 14, heli: 16, mandara: 16, lobster: 18, masked: 22 }[kind] + loop * 6;
        const b = { kind, hp: hpBase, maxHp: hpBase, t: 0, x: 250, y: LO, flash: 0, melee: kind === 'kenoh' || kind === 'lobster' || kind === 'masked', vx: 0, deadT: -1, guard: false };
        if (kind === 'heli') { b.x = 200; b.y = 70; }
        if (kind === 'mandara') { b.x = 160; b.y = 76; }
        b.hit = s => {
          let box;
          if (b.kind === 'heli') box = [b.x - 30, b.y - 14, 60, 26];
          else if (b.kind === 'mandara') box = [b.x - 14, b.y - 14, 28, 28];
          else if (b.kind === 'kenoh') box = [b.x - 12, b.y - 52, 24, 52];
          else box = [b.x - 8, b.y - 30, 16, 30];
          if (s.x < box[0] || s.x > box[0] + box[2] || s.y < box[1] || s.y > box[1] + box[3]) return false;
          if (b.guard && !s.power) { sfx.clink(); fx.push({ x: s.x, y: s.y, t: 0 }); return true; }
          damageBoss(s.power ? 2 : 1); return true;
        };
        return b;
      }
      function damageBoss(n) {
        const b = boss; if (!b || b.hp <= 0) return;
        b.hp -= n; b.flash = 6; sfx.hit();
        if (b.hp <= 0) { b.hp = 0; b.deadT = 0; eshots = []; enemies.forEach(e => e.dead = true); audio.noise(1.5, { vol: 0.3, freq: 1200, slideTo: 100 }); addScore(10000 + mission * 5000); pop(b.x, Math.max(40, b.y - 40), 10000 + mission * 5000, '#ffe040'); }
      }
      function updateBoss() {
        const b = boss; b.t++; if (b.flash > 0) b.flash--;
        if (b.deadT >= 0) { if (++b.deadT > 180) stageClear(); if (b.deadT % 8 === 0) fx.push({ x: b.x + (Math.random() - 0.5) * 40, y: b.y - Math.random() * 40, t: 0, big: true }); return; }
        const lvl = mission + loop * 2;
        const jx = joe.x;
        switch (b.kind) {
          case 'kenoh': {
            // the giant hurls fireballs in volleys and lowers his guard only between them
            const cyc = b.t % 160;
            b.guard = cyc < 60;
            if (cyc === 80 || cyc === 110) { for (let k = 0; k < 3; k++) eshots.push({ x: b.x - 14, y: b.y - 44, vx: -(1.6 + k * 0.7), vy: -2.4 - k * 0.4, kind: 'fire', t: 0 }); audio.noise(0.3, { vol: 0.2, freq: 900 }); }
            b.x = 250 + Math.sin(b.t * 0.01) * 20;
            if (Math.abs(jx - b.x) < 16 && joe.y > b.y - 40 && mode === 'play') killJoe();
            break;
          }
          case 'heli': {
            b.x = 160 + Math.sin(b.t * 0.012) * 110; b.y = 66 + Math.sin(b.t * 0.031) * 14;
            if (b.t % Math.max(90, 170 - lvl * 15) === 0 && enemies.filter(e => !e.dead).length < 3) {
              enemies.push({ kind: 'ninja', x: b.x, y: b.y + 10, up: false, face: -1, t: 0, hp: 1, crouch: false, vy: 0, vx: 0, ground: false, dead: false, dieT: 0, atkT: 0 });
            }
            if (b.t % 50 === 25) { eshots.push({ x: b.x, y: b.y + 12, vx: (jx - b.x) / 70, vy: 1, kind: 'drop', t: 0 }); sfx.enemyShot(); }
            break;
          }
          case 'mandara': {
            b.x = 160 + Math.sin(b.t * 0.015) * 90;
            b.guard = (b.t % 140) < 50;
            if (!b.guard && b.t % 30 === 0) { const a = Math.atan2(joe.y - 16 - b.y, jx - b.x); eshots.push({ x: b.x, y: b.y + 6, vx: Math.cos(a) * 2.4, vy: Math.sin(a) * 2.4, kind: 'beam', t: 0 }); audio.tone(900, 0.1, { type: 'sawtooth', vol: 0.08, slideTo: 300 }); }
            break;
          }
          case 'lobster': {
            const cyc = b.t % 150;
            b.guard = cyc < 70;
            if (cyc < 70) { b.face = jx < b.x ? -1 : 1; b.x = clamp(b.x + b.face * (0.6 + lvl * 0.08), 20, W - 20); }
            if (cyc === 90 || (lvl > 2 && cyc === 120)) { eshots.push({ x: b.x, y: LO - 6, vx: (jx < b.x ? -1 : 1) * 2.6, vy: 0, kind: 'wave', t: 0 }); sfx.slash(); }
            if (Math.abs(jx - b.x) < 14 && Math.abs(joe.y - b.y) < 20 && mode === 'play') killJoe();
            break;
          }
          case 'masked': {
            const cyc = b.t % 120;
            if (cyc === 0) { b.x = 40 + Math.random() * 240; b.y = Math.random() < 0.4 ? UP : LO; if (!walks.length) b.y = LO; b.face = jx < b.x ? -1 : 1; audio.tone(1200, 0.2, { type: 'sine', vol: 0.1, slideTo: 200 }); }
            b.guard = cyc < 15;
            if (cyc === 40 || cyc === 70) for (let k = -1; k <= 1; k++) eshots.push({ x: b.x, y: b.y - 20, vx: b.face * 2.6, vy: k * 0.7, kind: 'star', t: 0 });
            if (Math.abs(jx - b.x) < 12 && Math.abs(joe.y - b.y) < 20 && mode === 'play' && cyc > 15) killJoe();
            break;
          }
        }
      }

      // ---------- bonus stage: first-person shuriken ----------
      function startBonus() {
        mode = 'bonus'; modeT = 0;
        bonusStage = { x: W / 2, ninjas: [], next: 60, spawned: 0, total: 30, hits: 0, shots: [], over: false, endT: 0, failed: false };
        audio.melody([[523, .1], [659, .1], [784, .1], [1047, .25]], { type: 'square', vol: 0.12 });
      }
      function updateBonus() {
        const b = bonusStage;
        if (b.over) {
          if (++b.endT === 30 && !b.failed && b.hits >= b.total) { lives++; addScore(20000); audio.melody([[880, .08], [1175, .08], [1760, .2]], { type: 'square', vol: 0.12 }); }
          if (b.endT > 200) afterBonus();
          return;
        }
        if (api.key('ArrowLeft')) b.x -= 3; if (api.key('ArrowRight')) b.x += 3;
        b.x = clamp(b.x, 16, W - 16);
        if ((api.pressed('KeyX') || api.pressed('Space')) && b.shots.length < 4) { b.shots.push({ x: b.x, z: 0 }); sfx.throwS(); }
        if (b.spawned < b.total && --b.next <= 0) {
          b.ninjas.push({ x: 30 + Math.random() * (W - 60), z: 1, vz: -(0.0035 + Math.random() * 0.002 + mission * 0.0004), drift: (Math.random() - 0.5) * 0.6, ph: Math.random() * 6, alive: true });
          b.spawned++; b.next = Math.max(26, 60 - mission * 6);
        }
        for (let i = b.shots.length - 1; i >= 0; i--) { const s = b.shots[i]; s.z += 0.03; if (s.z > 1) b.shots.splice(i, 1); }
        for (const n of b.ninjas) {
          if (!n.alive) continue;
          n.z += n.vz; n.x = clamp(n.x + n.drift, 20, W - 20); n.ph += 0.15;
          for (let i = b.shots.length - 1; i >= 0; i--) {
            const s = b.shots[i];
            const sc = 1 - n.z * 0.85;
            if (Math.abs(s.z - n.z) < 0.06 && Math.abs(s.x - n.x) < 4 + 12 * sc) { n.alive = false; b.hits++; addScore(500); b.shots.splice(i, 1); sfx.hit(); break; }
          }
          if (n.alive && n.z <= 0.02) { n.alive = false; b.failed = true; b.over = true; audio.melody([[392, .15], [330, .15], [262, .3]], { type: 'square', vol: 0.12 }); }
        }
        if (b.spawned >= b.total && b.ninjas.every(n => !n.alive)) { b.over = true; if (b.hits >= b.total) say('PERFECT!  1UP', 160); }
      }

      // ---------- main update ----------
      function update() {
        modeT++;
        if (coinFlash > 0) coinFlash = api.credits > 0 ? 0 : coinFlash - 1;
        if (msg && --msg.f <= 0) msg = null;
        for (let i = pops.length - 1; i >= 0; i--) { pops[i].y -= 0.4; if (--pops[i].f <= 0) pops.splice(i, 1); }
        if (mode === 'title') {
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { coinFlash = 0; startGame(); }
            else { coinFlash = 90; audio.tone(70, 0.25, { type: 'square', vol: 0.25 }); }
          }
          return;
        }
        if (mode === 'over') { if (modeT > 360 || (modeT > 90 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; modeT = 0; } return; }
        if (mode === 'ready') { if (modeT > 120) { mode = 'play'; modeT = 0; } return; }
        if (mode === 'bonus') { updateBonus(); return; }
        if (mode === 'clear') {
          tallyT++;
          if (tallyT === 60) addScore(endInfo.time);
          if (tallyT === 100) addScore(endInfo.magic);
          if (tallyT > 220) nextStage();
          return;
        }
        if (mode === 'die') {
          joe.dieT++; joe.vy += 0.25; joe.y = Math.min(LO, joe.y + joe.vy);
          if (modeT === 140) {
            const resume = () => { const x = joe.x; joe = newJoe(x); if (x < camX + 10) joe.x = camX + 10; eshots = []; enemies = enemies.filter(e => Math.abs(e.x - x) > 60 || e.dead); mode = 'play'; modeT = 0; if (timeLeft < 60) timeLeft = 60; };
            if (lives > 0) { lives--; resume(); }
            else if (api.offerContinue) api.offerContinue(() => { lives = 2; resume(); }, () => { mode = 'over'; modeT = 0; api.setHiScore(hi); });
            else { mode = 'over'; modeT = 0; api.setHiScore(hi); }
          }
          return;
        }
        if (mode === 'play') {
          if (--bgmT <= 0) { const l = audio.melody(BGM, { type: 'square', vol: 0.04 }); audio.melody(BASS, { type: 'triangle', vol: 0.09 }); bgmT = Math.round(l * 60); }
          timeLeft -= 1 / 60;
          if (timeLeft <= 0) { timeLeft = 0; joe.inv = 0; killJoe(); return; }
          if (magicT > 0) magicT--;
          updateJoe(); if (mode !== 'play') return;
          updateEnemies();
          if (boss) updateBoss();
          updateShots();
        }
      }

      // ---------- rendering ----------
      function drawBG(ctx) {
        const m = M();
        ctx.fillStyle = m.sky; ctx.fillRect(0, HUD, W, H - HUD);
        // distant buildings
        for (let layer = 0; layer < 2; layer++) {
          const par = layer ? 0.5 : 0.25, col = layer ? m.b2 : m.b1;
          for (let i = -1; i < 12; i++) {
            const bw = 40 + (i * 37 % 3) * 12;
            const wx = Math.floor((camX * par) / 52) + i;
            const bx = Math.round(wx * 52 - camX * par);
            const bh = 50 + ((wx * 7919) % 5 + 5) % 5 * 16 + layer * 20;
            ctx.fillStyle = col; ctx.fillRect(bx, LO - bh - 40 + layer * 30, bw, bh + 40);
            if (layer) {
              ctx.fillStyle = m.win;
              for (let yy = LO - bh - 4; yy < LO - 30; yy += 10) for (let xx = bx + 4; xx < bx + bw - 4; xx += 8) if (((xx * 13 + yy * 7 + wx) % 5) < 2) ctx.fillRect(xx, yy, 3, 4);
            }
          }
        }
        // floor
        ctx.fillStyle = m.floor; ctx.fillRect(0, LO, W, H - LO);
        ctx.fillStyle = m.floorD; for (let x = -(camX % 32); x < W; x += 32) ctx.fillRect(Math.round(x), LO, 2, H - LO);
        ctx.fillRect(0, LO, W, 2);
        // upper walkways
        for (const w of walks) {
          const x = Math.round(w.x - camX); if (x > W || x + w.w < 0) continue;
          ctx.fillStyle = m.floorD; for (let px = x + 10; px < x + w.w - 4; px += 60) ctx.fillRect(px, UP + 6, 6, LO - UP - 6);
          ctx.fillStyle = m.rail; ctx.fillRect(x, UP, w.w, 6);
          ctx.fillStyle = m.floor; ctx.fillRect(x, UP, w.w, 2);
          ctx.fillStyle = m.rail; ctx.fillRect(x, UP - 14, w.w, 2); for (let px = x; px < x + w.w; px += 12) ctx.fillRect(px, UP - 14, 2, 14);
        }
        // exit door
        if (!boss) {
          const ex = Math.round(len - 30 - camX);
          if (ex < W + 30) {
            const open = hostages.every(h => h.saved);
            ctx.fillStyle = '#202020'; ctx.fillRect(ex - 14, LO - 44, 32, 44);
            ctx.fillStyle = open ? '#000' : '#605040'; ctx.fillRect(ex - 10, LO - 40, 24, 40);
            text(ctx, 'EXIT', ex + 2, LO - 54, open ? (api.frame & 16 ? '#ffe040' : '#fff') : '#888', 1, 'center');
          }
        }
      }
      function drawBoss(ctx) {
        const b = boss; if (b.flash & 2) return;
        const x = Math.round(b.x), y = Math.round(b.y);
        const dead = b.deadT >= 0;
        if (dead && (b.deadT & 4)) return;
        switch (b.kind) {
          case 'kenoh':
            ctx.fillStyle = '#603020'; ctx.fillRect(x - 10, y - 18, 8, 18); ctx.fillRect(x + 2, y - 18, 8, 18);
            ctx.fillStyle = '#a04030'; ctx.fillRect(x - 14, y - 46, 28, 28);
            ctx.fillStyle = '#d08050'; ctx.fillRect(x - 7, y - 58, 14, 12);
            ctx.fillStyle = '#000'; ctx.fillRect(x - 5, y - 54, 3, 2); ctx.fillRect(x + 2, y - 54, 3, 2);
            ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 8, y - 62, 16, 4);
            ctx.fillStyle = '#d08050';
            if (b.guard) { ctx.fillRect(x - 22, y - 50, 8, 24); ctx.fillStyle = '#a0a0b0'; ctx.fillRect(x - 26, y - 52, 6, 30); }
            else { ctx.fillRect(x - 24, y - 44, 10, 6); ctx.fillRect(x + 14, y - 44, 8, 6); }
            break;
          case 'heli':
            ctx.fillStyle = '#202830'; ctx.fillRect(x - 30, y - 10, 46, 20); ctx.fillRect(x + 16, y - 4, 22, 6); ctx.fillRect(x + 36, y - 10, 4, 12);
            ctx.fillStyle = '#60c0ff'; ctx.fillRect(x - 28, y - 7, 12, 8);
            ctx.fillStyle = '#404850'; ctx.fillRect(x - 24, y + 10, 36, 2); ctx.fillRect(x - 4, y - 14, 4, 4);
            ctx.fillStyle = '#c0c0c0'; { const r = (b.t * 7) % 40; ctx.fillRect(x - 2 - r, y - 15, r * 2 + 4, 1); ctx.fillRect(x - 40 + r, y - 16, 2 * (40 - r), 1); }
            break;
          case 'mandara':
            ctx.fillStyle = '#806020'; ctx.fillRect(x - 16, y - 16, 32, 32);
            ctx.fillStyle = '#c09030'; ctx.fillRect(x - 13, y - 13, 26, 26);
            ctx.fillStyle = b.guard ? '#604010' : '#ff2020'; ctx.fillRect(x - 9, y - 5, 6, 4); ctx.fillRect(x + 3, y - 5, 6, 4);
            ctx.fillStyle = '#604010'; ctx.fillRect(x - 6, y + 5, 12, 3); ctx.fillRect(x - 2, y - 20, 4, 6);
            ctx.fillStyle = '#ffd040'; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + b.t * 0.03; ctx.fillRect(Math.round(x + Math.cos(a) * 22) - 2, Math.round(y + Math.sin(a) * 22) - 2, 4, 4); }
            break;
          case 'lobster':
            man(ctx, x, y, b.face || -1, { skin: '#ffc890', hair: '#c02020', body: '#d03020', legs: '#902010', belt: '#ffd040', mask: '#c02020' }, b.guard ? 'shield' : 'slash', 0);
            ctx.fillStyle = '#e04020'; ctx.fillRect(x - 6, y - 34, 12, 4);
            break;
          case 'masked':
            man(ctx, x, y, b.face || -1, { skin: '#d0d0d0', hair: '#202020', mask: '#ffffff', body: '#303030', legs: '#202020', belt: '#c02020' }, (b.t % 120) > 30 ? 'throw' : 'stand', 0);
            if ((b.t % 120) < 15) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x - 8, y - 30, 16, 30); }
            break;
        }
      }
      function drawWorld(ctx) {
        drawBG(ctx);
        if (boss) drawBoss(ctx);
        for (const h of hostages) {
          const x = h.x - camX; if (x < -20 || x > W + 20) continue;
          const y = levelY(h.up);
          if (!h.saved) { man(ctx, x, y, -1, PALS.child, 'bound', 0); if (h.power && (api.frame & 16)) { ctx.fillStyle = '#ffe040'; ctx.fillRect(Math.round(x) - 1, y - 26, 2, 3); } }
          else if (++h.t < 40) man(ctx, x, y - h.t, 1, PALS.child, 'jump', 0);
        }
        for (const e of enemies) {
          const x = e.x - camX; if (x < -20 || x > W + 20) continue;
          if (e.dead) { if (e.dieT & 2) man(ctx, x - e.face * e.dieT * 0.5, e.y, e.face, PALS[e.kind], 'jump', 0); continue; }
          const P = e.kind === 'ninja' && mission >= 2 ? PALS.ninjaR : PALS[e.kind];
          let pose = 'stand';
          if (!e.ground) pose = 'jump';
          else if (e.kind === 'gunman') pose = e.crouch ? 'crouch' : (e.atkT > 0 ? 'gun' : 'stand');
          else if (e.kind === 'shield') pose = e.atkT > 0 && e.atkT < 14 ? 'slash' : 'shield';
          else if (e.kind === 'punk') pose = e.atkT > 0 ? (e.atkT < 10 ? 'kick' : 'stand') : 'walk';
          else if (e.kind === 'knife') pose = e.atkT > 0 ? 'throw' : 'knife';
          else if (e.kind === 'ninja') pose = e.atkT > 0 ? 'throw' : 'stand';
          man(ctx, x, e.y, e.face, P, pose, (api.frame >> 3) + e.x);
          if (e.kind === 'gunman' && e.crouch) { ctx.fillStyle = '#202020'; ctx.fillRect(Math.round(x + (e.face > 0 ? 6 : -10)), e.y - 11, 4, 2); }
        }
        // Joe
        const jx = joe.x - camX;
        if (mode === 'die') {
          if (joe.dieT & 4 || joe.dieT < 30) man(ctx, jx - joe.face * Math.min(20, joe.dieT * 0.5), joe.y, joe.face, JOE, 'jump', 0);
        } else if (!(joe.inv > 0 && (joe.inv & 4))) {
          let pose = 'stand';
          if (!joe.ground) pose = 'jump';
          else if (joe.crouch) pose = 'crouch';
          else if (joe.atk > 0) pose = joe.atkPose === 'crouch' ? 'crouch' : joe.atkPose;
          else if (joe.vx) pose = 'walk';
          man(ctx, jx, joe.y, joe.face, power ? JOEP : JOE, pose, Math.floor(joe.anim));
          if (joe.crouch && joe.atk > 0) { ctx.fillStyle = '#ffc890'; ctx.fillRect(Math.round(jx + (joe.face > 0 ? 3 : -11)), joe.y - 11, 8, 2); }
        }
        for (const s of shots) {
          const x = Math.round(s.x - camX), y = Math.round(s.y);
          if (s.power) { ctx.fillStyle = '#ffe040'; ctx.fillRect(x - 3, y - 1, 6, 2); }
          else { ctx.fillStyle = '#e0e0f0'; const r = s.t & 2; if (r) { ctx.fillRect(x - 3, y, 7, 1); ctx.fillRect(x, y - 3, 1, 7); } else { ctx.fillRect(x - 2, y - 2, 1, 1); ctx.fillRect(x + 2, y - 2, 1, 1); ctx.fillRect(x - 2, y + 2, 1, 1); ctx.fillRect(x + 2, y + 2, 1, 1); ctx.fillRect(x - 1, y - 1, 3, 3); } }
        }
        for (const s of eshots) {
          const x = Math.round(s.x - camX), y = Math.round(s.y);
          switch (s.kind) {
            case 'bullet': ctx.fillStyle = '#ffff80'; ctx.fillRect(x - 2, y, 4, 1); break;
            case 'knife': ctx.fillStyle = '#e0e0e0'; ctx.fillRect(x - 3, y, 6, 1); ctx.fillStyle = '#804020'; ctx.fillRect(x - 4, y, 2, 1); break;
            case 'star': ctx.fillStyle = '#c0c0d0'; ctx.fillRect(x - 2, y, 5, 1); ctx.fillRect(x, y - 2, 1, 5); break;
            case 'fire': ctx.fillStyle = '#ff4000'; ctx.fillRect(x - 3, y - 3, 6, 6); ctx.fillStyle = '#ffe040'; ctx.fillRect(x - 1, y - 1, 3, 3); break;
            case 'beam': ctx.fillStyle = '#ff40ff'; ctx.fillRect(x - 2, y - 2, 4, 4); break;
            case 'drop': ctx.fillStyle = '#303030'; ctx.fillRect(x - 2, y - 3, 4, 6); ctx.fillStyle = '#ff4000'; ctx.fillRect(x - 1, y + 2, 2, 2); break;
            case 'wave': ctx.fillStyle = '#80e0ff'; ctx.fillRect(x - 3, y - 6, 6, 12); ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 4, 2, 8); break;
          }
        }
        for (const f of fx) { ctx.fillStyle = f.big ? (f.t & 2 ? '#ff8000' : '#ffe040') : '#fff'; const r = f.big ? f.t * 2 : f.t; ctx.fillRect(Math.round(f.x - camX - r / 2), Math.round(f.y - r / 2), r + 1, r + 1); }
        if (magicT > 0) {
          const a = magicT / 120;
          ctx.fillStyle = `rgba(255,${Math.floor(120 + 100 * Math.sin(magicT * 0.5))},40,${(a * 0.5).toFixed(2)})`; ctx.fillRect(0, HUD, W, H - HUD);
          for (let k = 0; k < 12; k++) { const r = (120 - magicT) * 3 + k * 10; ctx.fillStyle = '#ffe040'; ctx.fillRect(Math.round(joe.x - camX + Math.cos(k) * r), Math.round(joe.y - 20 + Math.sin(k) * r * 0.5), 4, 4); }
        }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, HUD);
        text(ctx, 'SCORE', 4, 2, '#e02020'); text(ctx, String(score), 40, 2, '#fff');
        text(ctx, 'HI', 4, 10, '#e02020'); text(ctx, String(hi), 40, 10, '#fff');
        if (mode !== 'bonus') {
          text(ctx, (mission + 1) + '-' + (stage + 1), 112, 2, '#ffe040');
          const t = Math.max(0, Math.ceil(timeLeft)); const ts = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
          text(ctx, 'TIME ' + ts, 112, 10, t < 30 && (api.frame & 16) ? '#e02020' : '#fff');
          text(ctx, 'MAGIC', 176, 2, '#7ff');
          if (!magicUsed) { ctx.fillStyle = (api.frame & 16) ? '#ffe040' : '#ff8000'; ctx.fillRect(184, 10, 6, 6); ctx.fillRect(186, 9, 2, 8); ctx.fillRect(183, 12, 8, 2); }
          if (!boss) {
            const left = hostages.filter(h => !h.saved).length;
            text(ctx, 'HOSTAGE ' + left, W - 4, 2, left ? '#ffe040' : '#7f7', 1, 'right');
          } else if (boss.hp > 0) {
            text(ctx, BOSSNAME[boss.kind], W - 4, 2, '#e02020', 1, 'right');
            ctx.fillStyle = '#400'; ctx.fillRect(W - 84, 11, 80, 4); ctx.fillStyle = '#e02020'; ctx.fillRect(W - 84, 11, Math.round(80 * boss.hp / boss.maxHp), 4);
          }
          for (let i = 0; i < Math.min(5, lives); i++) { ctx.fillStyle = '#f0f0f0'; ctx.fillRect(220 + i * 8, 10, 5, 6); ctx.fillStyle = '#ffc890'; ctx.fillRect(221 + i * 8, 11, 3, 2); }
          if (power) text(ctx, 'POW', 260, 10, '#ffe040');
        }
      }
      function renderBonus(ctx) {
        const b = bonusStage;
        ctx.fillStyle = '#081028'; ctx.fillRect(0, HUD, W, H - HUD);
        ctx.fillStyle = '#ffffe0'; ctx.fillRect(250, 34, 18, 18); ctx.fillStyle = '#081028'; ctx.fillRect(256, 32, 16, 16);
        // rooftops in perspective
        for (let i = 0; i < 9; i++) {
          const z = 1 - i / 9, y = 90 + (1 - z) * 110;
          ctx.fillStyle = i & 1 ? '#202838' : '#283040';
          ctx.fillRect(0, Math.round(y), W, Math.round(14 * (1 - z) + 2));
        }
        ctx.fillStyle = '#403830'; ctx.fillRect(0, 196, W, H - 196);
        // ninjas leaping in
        const list = b.ninjas.filter(n => n.alive).sort((p, q) => q.z - p.z);
        for (const n of list) {
          const sc = 1 - n.z * 0.85, y = 90 + (1 - n.z) * 100 - Math.abs(Math.sin(n.ph)) * 30 * sc;
          const s = Math.max(1, Math.round(sc * 3));
          ctx.fillStyle = '#20a040'; ctx.fillRect(Math.round(n.x - 4 * s), Math.round(y - 12 * s), 8 * s, 10 * s);
          ctx.fillStyle = '#ffc890'; ctx.fillRect(Math.round(n.x - 2 * s), Math.round(y - 11 * s), 4 * s, 2 * s);
          ctx.fillStyle = '#108030'; ctx.fillRect(Math.round(n.x - 5 * s), Math.round(y - 4 * s), 3 * s, 4 * s); ctx.fillRect(Math.round(n.x + 2 * s), Math.round(y - 4 * s), 3 * s, 4 * s);
        }
        for (const s of b.shots) { const y = 196 - s.z * 106, r = Math.max(1, Math.round(3 * (1 - s.z))); ctx.fillStyle = '#e0e0f0'; ctx.fillRect(Math.round(s.x - r), Math.round(y), r * 2 + 1, 1); ctx.fillRect(Math.round(s.x), Math.round(y - r), 1, r * 2 + 1); }
        // Joe's arm from behind
        ctx.fillStyle = '#f0f0f0'; ctx.fillRect(Math.round(b.x - 10), 200, 20, 24);
        ctx.fillStyle = '#ffc890'; ctx.fillRect(Math.round(b.x - 3), 194, 6, 8);
        ctx.fillStyle = '#e02020'; ctx.fillRect(Math.round(b.x) - 1, 186, 2, 6); ctx.fillRect(Math.round(b.x) - 3, 188, 6, 2);
        textS(ctx, 'BONUS STAGE', W / 2, 24, '#ffe040', 2, 'center');
        text(ctx, 'HITS ' + b.hits + ' / ' + b.total, W / 2, 42, '#fff', 1, 'center');
        if (b.over) textS(ctx, b.failed ? 'BONUS OVER' : (b.hits >= b.total ? 'PERFECT! 1UP' : 'BONUS OVER'), W / 2, 110, b.failed ? '#e02020' : '#ffe040', 2, 'center');
      }
      function renderTitle(ctx) {
        ctx.fillStyle = '#100000'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#e02020'; ctx.fillRect(W / 2 - 60, 30, 120, 120); ctx.fillStyle = '#100000'; ctx.fillRect(W / 2 - 50, 40, 100, 100);
        ctx.fillStyle = '#801010'; ctx.fillRect(W / 2 - 46, 44, 92, 92);
        textS(ctx, 'SHINOBI', W / 2, 70, ['#fff', '#fff', '#ffe0e0', '#ffc0c0', '#ff9090', '#ff6060', '#e02020'], 4, 'center');
        man(ctx, W / 2 - 4, 140, 1, JOE, ((modeT >> 5) & 1) ? 'throw' : 'stand', 0);
        if ((modeT >> 5) & 1) { const sx = W / 2 + 8 + ((modeT & 31) * 4); ctx.fillStyle = '#fff'; ctx.fillRect(sx - 3, 119, 7, 1); ctx.fillRect(sx, 116, 1, 7); }
        text(ctx, 'ZEED HAS KIDNAPPED THE CHILDREN', W / 2, 158, '#fff', 1, 'center');
        text(ctx, 'OF THE OBORO CLAN', W / 2, 168, '#fff', 1, 'center');
        text(ctx, 'HI SCORE ' + hi, W / 2, 182, '#ffe040', 1, 'center');
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) textS(ctx, 'INSERT COIN', W / 2, 196, '#ff5040', 1, 'center'); }
        else if (api.credits === 0) { if ((api.frame >> 4) & 1) textS(ctx, 'INSERT COIN', W / 2, 196, '#fff', 1, 'center'); }
        else textS(ctx, 'PUSH START BUTTON', W / 2, 196, (api.frame >> 5) & 1 ? '#fff' : '#ffe040', 1, 'center');
        text(ctx, '\u00a9 1987 SEGA', W / 2, 210, '#aaa', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 10, '#aaa');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        if (mode === 'bonus') renderBonus(ctx);
        else drawWorld(ctx);
        for (const q of pops) textS(ctx, q.t, Math.round(q.x - (mode === 'bonus' ? 0 : camX)), Math.round(q.y), q.col, 1, 'center');
        drawHUD(ctx);
        if (mode === 'ready') {
          textS(ctx, stage === 2 ? 'BOSS' : M().name, W / 2, 80, '#ffe040', 2, 'center');
          textS(ctx, stage === 2 ? BOSSNAME[M().boss] : 'STAGE ' + (stage + 1), W / 2, 100, '#fff', 1, 'center');
          if (stage < 2) text(ctx, 'RESCUE ALL HOSTAGES', W / 2, 114, '#7ff', 1, 'center');
        }
        if (msg && mode !== 'ready') textS(ctx, msg.t, W / 2, 60, '#ffe040', 1, 'center');
        if (mode === 'clear') {
          ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(70, 60, 180, 80);
          textS(ctx, 'STAGE CLEAR', W / 2, 68, '#ffe040', 2, 'center');
          if (tallyT > 40) text(ctx, 'TIME BONUS ' + endInfo.time, W / 2, 96, '#fff', 1, 'center');
          if (tallyT > 80) text(ctx, endInfo.magic ? 'NO MAGIC BONUS ' + endInfo.magic : 'MAGIC USED', W / 2, 110, endInfo.magic ? '#7ff' : '#888', 1, 'center');
        }
        if (mode === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(80, 84, 160, 44);
          textS(ctx, 'GAME OVER', W / 2, 92, '#e02020', 2, 'center');
          text(ctx, 'SCORE ' + score, W / 2, 114, '#fff', 1, 'center');
        }
      }
      return { update, render, destroy() { api.setHiScore(hi); } };
    }
  });
})();
