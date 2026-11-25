// Renegade (Technos / Taito, 1986) - from-scratch recreation. Street brawling across the subway, harbor, back streets and alley.
(function () {
  'use strict';
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
    '=': [0, 0, 31, 0, 31, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0], '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0]
  };
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) { const b = g[r]; if (!b) continue; for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc); }
    }
  }

  const W = 256, H = 224;
  const YMIN = 150, YMAX = 208;     // walkable depth band (feet y)
  const STAGE_W = 640;

  // ---------- skeleton poses (facing right, feet centre at 0,0) ----------
  // joints: fK fF bK bF (knees/feet), fE fH bE bH (elbows/hands), n (neck), hp (hip)
  const POSE = {
    idle: { n: [0, -32], hp: [0, -18], fK: [3, -9], fF: [4, 0], bK: [-3, -9], bF: [-4, 0], fE: [4, -25], fH: [7, -29], bE: [-3, -25], bH: [1, -28] },
    walk1: { n: [1, -32], hp: [0, -18], fK: [5, -9], fF: [8, 0], bK: [-3, -9], bF: [-7, 0], fE: [4, -25], fH: [7, -29], bE: [-4, -25], bH: [0, -28] },
    walk2: { n: [1, -32], hp: [0, -18], fK: [1, -9], fF: [0, 0], bK: [0, -9], bF: [-1, 0], fE: [3, -25], fH: [6, -28], bE: [-2, -25], bH: [2, -27] },
    punch: { n: [2, -32], hp: [0, -18], fK: [4, -9], fF: [7, 0], bK: [-4, -9], bF: [-7, 0], fE: [9, -30], fH: [17, -31], bE: [-2, -25], bH: [2, -27] },
    wind: { n: [-1, -32], hp: [0, -18], fK: [4, -9], fF: [6, 0], bK: [-4, -9], bF: [-6, 0], fE: [-2, -26], fH: [-6, -30], bE: [3, -26], bH: [6, -28] },
    bkick: { n: [4, -30], hp: [0, -18], fK: [3, -9], fF: [3, 0], bK: [-8, -19], bF: [-19, -21], fE: [7, -26], fH: [10, -30], bE: [2, -24], bH: [6, -26] },
    fkick: { n: [-2, -32], hp: [0, -18], fK: [8, -19], fF: [19, -21], bK: [-3, -9], bF: [-3, 0], fE: [2, -26], fH: [6, -29], bE: [-5, -25], bH: [-8, -28] },
    jump: { n: [0, -32], hp: [0, -18], fK: [5, -13], fF: [3, -6], bK: [-3, -13], bF: [-5, -6], fE: [5, -27], fH: [8, -32], bE: [-4, -27], bH: [-6, -32] },
    jkick: { n: [-2, -32], hp: [0, -18], fK: [8, -18], fF: [18, -19], bK: [-3, -13], bF: [-7, -9], fE: [2, -28], fH: [4, -33], bE: [-5, -27], bH: [-9, -30] },
    grab: { n: [2, -32], hp: [0, -18], fK: [3, -9], fF: [5, 0], bK: [-4, -9], bF: [-5, 0], fE: [7, -28], fH: [11, -31], bE: [5, -26], bH: [10, -28] },
    knee: { n: [3, -32], hp: [0, -18], fK: [8, -24], fF: [6, -15], bK: [-2, -9], bF: [-3, 0], fE: [7, -29], fH: [11, -33], bE: [5, -27], bH: [10, -31] },
    throw: { n: [-5, -30], hp: [0, -18], fK: [3, -9], fF: [5, 0], bK: [-4, -9], bF: [-6, 0], fE: [-5, -36], fH: [-9, -40], bE: [-3, -35], bH: [-7, -40] },
    hurt: { n: [-4, -31], hp: [0, -18], fK: [3, -9], fF: [5, 0], bK: [-4, -9], bF: [-5, 0], fE: [2, -24], fH: [6, -21], bE: [-7, -26], bH: [-9, -21] },
    dazed: { n: [-2, -31], hp: [0, -18], fK: [3, -9], fF: [3, 0], bK: [-3, -9], bF: [-3, 0], fE: [1, -24], fH: [2, -18], bE: [-3, -24], bH: [-2, -18] },
    held: { n: [-3, -27], hp: [0, -16], fK: [4, -8], fF: [3, 0], bK: [-3, -8], bF: [-4, 0], fE: [2, -21], fH: [3, -16], bE: [-4, -21], bH: [-3, -16] },
    lash: { n: [2, -32], hp: [0, -18], fK: [4, -9], fF: [7, 0], bK: [-4, -9], bF: [-7, 0], fE: [8, -28], fH: [13, -26], bE: [-2, -25], bH: [2, -27] },
    aim: { n: [1, -32], hp: [0, -18], fK: [3, -9], fF: [5, 0], bK: [-4, -9], bF: [-5, 0], fE: [8, -29], fH: [15, -29], bE: [5, -28], bH: [12, -29] }
  };

  const STAGES = [
    { name: 'SUBWAY PLATFORM', bg: 'subway', foes: ['thug', 'thug', 'thug'], boss: 'jack', count: 9 },
    { name: 'HARBOR PIER', bg: 'harbor', foes: ['thug', 'thug'], bikers: 6, boss: 'chief', count: 7 },
    { name: 'BACK STREETS', bg: 'street', foes: ['girl', 'girl', 'thug'], boss: 'bertha', count: 9 },
    { name: 'THE ALLEY', bg: 'alley', foes: ['knife', 'thug', 'knife'], boss: 'sabu', count: 10 }
  ];
  const KINDS = {
    thug: { hp: 4, dmg: 3, reach: 22, sp: 0.75, pal: { skin: '#e8b080', hair: '#202020', shirt: '#c03030', pants: '#303060', shoe: '#101010' }, pts: 500 },
    girl: { hp: 3, dmg: 3, reach: 36, sp: 0.85, pal: { skin: '#f0c090', hair: '#c04080', shirt: '#e060a0', pants: '#402040', shoe: '#801040' }, pts: 500, weapon: 'chain' },
    knife: { hp: 3, dmg: 6, reach: 26, sp: 0.9, pal: { skin: '#d8a070', hair: '#604020', shirt: '#30a060', pants: '#202020', shoe: '#101010' }, pts: 600, weapon: 'knife' },
    jack: { hp: 18, dmg: 4, reach: 26, sp: 0.6, pal: { skin: '#e0a070', hair: '#e0a070', shirt: '#404040', pants: '#202020', shoe: '#101010' }, pts: 5000, boss: true, scale: 1.25 },
    chief: { hp: 18, dmg: 4, reach: 24, sp: 0.7, pal: { skin: '#e0a070', hair: '#101010', shirt: '#202020', pants: '#204080', shoe: '#101010' }, pts: 5000, boss: true, scale: 1.2 },
    bertha: { hp: 20, dmg: 5, reach: 28, sp: 0.55, pal: { skin: '#f0c090', hair: '#ffd040', shirt: '#a02020', pants: '#a02020', shoe: '#301010' }, pts: 5000, boss: true, scale: 1.3 },
    sabu: { hp: 18, dmg: 5, reach: 24, sp: 0.8, pal: { skin: '#e0a070', hair: '#101010', shirt: '#e0e0e0', pants: '#404040', shoe: '#101010' }, pts: 10000, boss: true, scale: 1.15, weapon: 'gun' }
  };
  const PLAYER_PAL = { skin: '#f0b888', hair: '#3a2010', shirt: '#f0f0f0', pants: '#2848a8', shoe: '#e0e0e0' };

  ArcadeRegistry.register({
    id: 'renegade', title: 'Renegade', year: 1986, maker: 'Technos / Taito',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Space: attack LEFT \u00b7 X: attack RIGHT (facing = punch, behind = back kick) \u00b7 Space+X or Z: jump \u00b7 punch a dazed foe then walk in to grab/knee/throw \u00b7 Enter: start',
    marquee: { bg: '#100810', fg: '#ff3030', accent: '#ffe040' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(30000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0;
      let g = null;

      // ---------- drawing ----------
      function limb(ctx, x1, y1, x2, y2, w, col) {
        ctx.fillStyle = col;
        const n = Math.max(1, Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))));
        for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x1 + (x2 - x1) * i / n - w / 2), Math.round(y1 + (y2 - y1) * i / n - w / 2), w, w);
      }
      function drawFighter(ctx, f, sx, sy, pal, poseName, opt) {
        opt = opt || {};
        ctx.save();
        ctx.translate(Math.round(sx), Math.round(sy));
        const sc = opt.scale || 1;
        ctx.scale((f.face || 1) * sc, sc);
        if (opt.flash) ctx.globalAlpha = 0.5;
        if (poseName === 'down') {
          // lying on the back
          ctx.fillStyle = pal.pants; ctx.fillRect(2, -5, 14, 4); ctx.fillStyle = pal.shoe; ctx.fillRect(15, -6, 3, 5);
          ctx.fillStyle = pal.shirt; ctx.fillRect(-12, -6, 14, 6);
          ctx.fillStyle = pal.skin; ctx.fillRect(-19, -7, 7, 7); ctx.fillStyle = pal.hair; ctx.fillRect(-20, -7, 3, 7);
          ctx.fillStyle = pal.skin; ctx.fillRect(-8, -9, 2, 3); ctx.fillRect(-4, -1, 8, 2);
          ctx.restore(); return;
        }
        const P = POSE[poseName] || POSE.idle;
        const hp = P.hp, n = P.n;
        const dk = 'rgba(0,0,0,.25)';
        // back arm & leg
        limb(ctx, n[0] - 1, n[1] + 2, P.bE[0], P.bE[1], 3, pal.shirt); limb(ctx, P.bE[0], P.bE[1], P.bH[0], P.bH[1], 3, pal.skin);
        limb(ctx, hp[0] - 1, hp[1], P.bK[0], P.bK[1], 4, pal.pants); limb(ctx, P.bK[0], P.bK[1], P.bF[0], P.bF[1], 4, pal.pants);
        ctx.fillStyle = pal.shoe; ctx.fillRect(P.bF[0] - 2, P.bF[1] - 2, 5, 3);
        ctx.fillStyle = dk; ctx.fillRect(P.bF[0] - 2, P.bF[1] - 2, 5, 3);
        // torso
        limb(ctx, hp[0], hp[1] - 1, n[0], n[1] + 3, 8, pal.shirt);
        ctx.fillStyle = '#202020'; ctx.fillRect(hp[0] - 4, hp[1] - 2, 8, 2);
        if (opt.vest) { ctx.fillStyle = opt.vest; ctx.fillRect(n[0] - 4, n[1] + 2, 3, 12); }
        // front leg
        limb(ctx, hp[0] + 1, hp[1], P.fK[0], P.fK[1], 4, pal.pants); limb(ctx, P.fK[0], P.fK[1], P.fF[0], P.fF[1], 4, pal.pants);
        ctx.fillStyle = pal.shoe; ctx.fillRect(P.fF[0] - 2, P.fF[1] - 2, 5, 3);
        // head
        const hx = n[0] + 1, hy = n[1] - 5;
        ctx.fillStyle = pal.skin; ctx.fillRect(hx - 3, hy - 4, 7, 8); ctx.fillRect(hx - 1, hy + 3, 3, 2);
        ctx.fillStyle = pal.hair; ctx.fillRect(hx - 4, hy - 5, 7, 3); ctx.fillRect(hx - 4, hy - 3, 2, 4);
        if (opt.bald) { ctx.fillStyle = pal.skin; ctx.fillRect(hx - 4, hy - 5, 7, 3); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(hx - 2, hy - 5, 2, 1); }
        if (opt.longHair) { ctx.fillStyle = pal.hair; ctx.fillRect(hx - 5, hy - 3, 3, 10); }
        ctx.fillStyle = '#000'; ctx.fillRect(hx + 2, hy - 1, 1, 1);
        if (opt.shades) { ctx.fillStyle = '#000'; ctx.fillRect(hx, hy - 1, 4, 2); }
        // front arm
        limb(ctx, n[0] + 1, n[1] + 2, P.fE[0], P.fE[1], 3, pal.shirt); limb(ctx, P.fE[0], P.fE[1], P.fH[0], P.fH[1], 3, pal.skin);
        ctx.fillStyle = pal.skin; ctx.fillRect(P.fH[0] - 1, P.fH[1] - 1, 3, 3);
        // weapons
        if (opt.weapon === 'knife') { ctx.fillStyle = '#e0e0f0'; ctx.fillRect(P.fH[0] + 1, P.fH[1] - 1, 6, 1); }
        if (opt.weapon === 'chain') {
          ctx.fillStyle = '#c0c0c0';
          if (poseName === 'lash') for (let i = 0; i < 22; i += 2) ctx.fillRect(P.fH[0] + 1 + i, P.fH[1] + Math.round(Math.sin(i * .4) * 2), 2, 1);
          else for (let i = 0; i < 10; i += 2) ctx.fillRect(P.fH[0], P.fH[1] + 1 + i, 1, 1);
        }
        if (opt.weapon === 'gun') { ctx.fillStyle = '#303030'; ctx.fillRect(P.fH[0], P.fH[1] - 2, 6, 2); ctx.fillRect(P.fH[0], P.fH[1] - 1, 2, 3); }
        ctx.restore();
      }

      // ---------- game ----------
      function newGame() {
        g = { score: 0, lives: 3, stage: 0, nextLife: 30000 };
        startStage();
      }
      function startStage() {
        const st = STAGES[g.stage % 4];
        g.st = st; g.loop = Math.floor(g.stage / 4);
        g.p = mkPlayer();
        g.foes = []; g.bullets = []; g.parts = []; g.pops = [];
        g.camX = 0; g.toSpawn = st.count + g.loop * 2; g.bikers = st.bikers ? st.bikers + g.loop * 2 : 0; g.bossOut = false;
        g.spawnT = 90; g.time = 120 * 60; g.phase = 'ready'; g.phaseT = 150;
        g.train = { x: -400, t: 600 };
        au.melody([[330, .1], [330, .1], [392, .1], [330, .1], [294, .1], [262, .2], [294, .1], [330, .3]], { type: 'square', vol: .12 });
      }
      function mkPlayer() { return { x: 60, y: 180, z: 0, vz: 0, vx: 0, face: 1, st: 'idle', t: 0, hp: 24, inv: 60, hitsTaken: 0, hitClock: 0, walk: 0, buf: null, bufT: 0, grab: null, knees: 0, combo: 0 }; }
      function mkFoe(kind, x, y) {
        const k = KINDS[kind], lvl = g.loop;
        const hp = k.hp + (k.boss ? lvl * 6 : lvl);
        return { kind, x, y, z: 0, vz: 0, face: x < g.p.x ? 1 : -1, st: 'walk', t: 0, hp, maxhp: hp, cd: 60 + Math.random() * 60, stun: 0, walk: 0, side: Math.random() < .5 ? -1 : 1, boss: !!k.boss, k, sp: k.sp * (1 + lvl * 0.12), downs: 0 };
      }
      function addScore(n, x, y) {
        g.score += n;
        if (g.score >= g.nextLife) { g.lives++; g.nextLife += 50000; au.melody([[880, .06], [1175, .06], [1760, .12]], { type: 'square', vol: .12 }); }
        if (g.score > hi) hi = g.score;
        if (x != null) g.pops.push({ x, y, s: String(n), t: 40 });
      }
      function hitFx(x, y) { for (let i = 0; i < 5; i++) g.parts.push({ x, y, vx: (Math.random() - .5) * 3, vy: (Math.random() - .5) * 3, t: 10 }); }
      const sndHit = () => { au.noise(.07, { vol: .22, freq: 1800, slideTo: 300 }); au.tone(110, .06, { type: 'square', vol: .12 }); };
      const sndWhiff = () => au.noise(.05, { vol: .06, freq: 4000, type: 'highpass' });
      const sndFall = () => { au.noise(.25, { vol: .2, freq: 400, slideTo: 60 }); };

      // ---------- player ----------
      function playerAttack(dir) {
        const p = g.p;
        if (p.z < 0 || p.st === 'jump') { if (p.st === 'jump' && !p.kicked) { p.kicked = true; p.face = dir; p.atkT = 18; sndWhiff(); } return; }
        if (p.st === 'grab' && p.grab) {
          const e = p.grab;
          if (dir === p.face) { p.st = 'knee'; p.t = 0; }
          else { p.st = 'throw'; p.t = 0; }
          void e; return;
        }
        if (!['idle', 'walk'].includes(p.st)) return;
        p.t = 0;
        if (dir === p.face) { p.st = 'punch'; p.combo = p.comboT > 0 ? p.combo + 1 : 1; p.comboT = 30; }
        else p.st = 'bkick';
        sndWhiff();
      }
      function updatePlayer() {
        const p = g.p;
        p.t++; if (p.inv > 0) p.inv--; if (p.comboT > 0) p.comboT--;
        if (p.hitClock > 0) { p.hitClock--; if (!p.hitClock) p.hitsTaken = 0; }
        // input buffer: left+right attack together = jump
        const L = api.pressed('Space'), R = api.pressed('KeyX');
        if (api.pressed('KeyZ')) tryJump();
        else if (L && R) tryJump();
        else if (L || R) {
          if (p.buf && p.buf !== (L ? -1 : 1) && p.bufT > 0) { p.buf = null; tryJump(); }
          else { p.buf = L ? -1 : 1; p.bufT = 4; }
        }
        if (p.buf && --p.bufT <= 0) { const d = p.buf; p.buf = null; playerAttack(d); }
        const kl = api.key('ArrowLeft'), kr = api.key('ArrowRight'), ku = api.key('ArrowUp'), kd = api.key('ArrowDown');
        switch (p.st) {
          case 'idle': case 'walk': {
            let mx = (kr ? 1 : 0) - (kl ? 1 : 0), my = (kd ? 1 : 0) - (ku ? 1 : 0);
            if (mx) p.face = mx;
            p.x += mx * 1.3; p.y += my * 0.8;
            p.st = (mx || my) ? 'walk' : 'idle';
            if (mx || my) p.walk++;
            // grab a dazed enemy by walking into it
            if (mx) for (const e of g.foes) {
              if (e.st === 'dazed' && Math.abs(e.y - p.y) < 6 && Math.abs(e.x - p.x) < 16 && Math.sign(e.x - p.x) === p.face) {
                p.st = 'grab'; p.grab = e; p.t = 0; p.knees = 0; e.st = 'held'; e.face = -p.face; e.x = p.x + p.face * 13; e.y = p.y;
                au.tone(200, .08, { type: 'square', vol: .1 });
                break;
              }
            }
            break;
          }
          case 'punch':
            if (p.t === 4) meleeHit(p.face, 6, 24, p.combo >= 3 ? 2 : 1, p.combo >= 3 ? 'knock' : 'jab');
            if (p.t >= 11) p.st = 'idle';
            break;
          case 'bkick':
            if (p.t === 6) meleeHit(-p.face, 4, 28, 2, 'knock');
            if (p.t >= 18) p.st = 'idle';
            break;
          case 'jump': {
            p.vz += 0.32; p.z += p.vz; p.x += p.vx;
            if (p.kicked && p.atkT > 0) { p.atkT--; if (p.atkT === 14 || p.atkT === 8) meleeHit(p.face, 6, 26, 2, 'knock', true); }
            if (p.z >= 0) { p.z = 0; p.vz = 0; p.st = 'idle'; p.kicked = false; }
            break;
          }
          case 'grab': {
            const e = p.grab;
            if (!e || e.st !== 'held') { p.st = 'idle'; p.grab = null; break; }
            if (p.t > 100) { e.st = 'walk'; e.cd = 20; p.st = 'idle'; p.grab = null; break; }
            break;
          }
          case 'knee': {
            const e = p.grab;
            if (p.t === 6 && e) {
              p.knees++; damageFoe(e, 1, 'held'); hitFx(e.x, e.y - 28);
              if (e.hp <= 0 || p.knees >= 3) { knockDown(e, p.face, 2.5); p.grab = null; }
            }
            if (p.t >= 14) { p.st = p.grab ? 'grab' : 'idle'; p.t = p.grab ? Math.min(p.t, 60) : 0; }
            break;
          }
          case 'throw': {
            const e = p.grab;
            if (p.t === 4 && e) { e.x = p.x; e.z = -30; }
            if (p.t === 10 && e) { p.face = -p.face; damageFoe(e, 2, 'held'); knockDown(e, p.face, 3.5); e.x = p.x + p.face * 18; p.grab = null; addScore(200, e.x, e.y - 40); sndFall(); }
            if (p.t >= 20) { p.st = 'idle'; }
            break;
          }
          case 'hurt': if (p.t >= 16) p.st = 'idle'; break;
          case 'down':
            p.x += p.vx; p.vx *= 0.9;
            if (p.t >= 60) { if (p.hp <= 0) { playerDies(); return; } p.st = 'idle'; p.inv = 50; }
            break;
        }
        p.y = Math.max(YMIN, Math.min(YMAX, p.y));
        p.x = Math.max(g.camX + 8, Math.min(Math.min(STAGE_W - 8, g.camX + W - 8), p.x));
        // camera
        const target = Math.max(0, Math.min(STAGE_W - W, p.x - W / 2));
        g.camX += (target - g.camX) * 0.1;
      }
      function tryJump() {
        const p = g.p;
        if (!['idle', 'walk'].includes(p.st)) return;
        p.st = 'jump'; p.vz = -5.2; p.z = 0; p.kicked = false; p.t = 0;
        p.vx = (api.key('ArrowRight') ? 1.6 : 0) - (api.key('ArrowLeft') ? 1.6 : 0);
        au.tone(300, .1, { type: 'square', vol: .06, slideTo: 600 });
      }
      function meleeHit(dir, minR, maxR, dmg, kind, air) {
        const p = g.p; let hitAny = false;
        for (const e of g.foes) {
          if (e.st === 'down' || e.st === 'dead' || e.st === 'enter' && e.x < g.camX - 10) continue;
          if (e.st === 'held' && kind !== 'knock') continue;
          const dx = (e.x - p.x) * dir;
          if (Math.abs(e.y - p.y) > 7) continue;
          if (e.biker) { if (dx > 0 && dx < maxR + 10) { bikerOff(e); hitAny = true; } continue; }
          if (dx < minR - 4 || dx > maxR + (e.boss ? 4 : 0)) continue;
          if (e.z < -20 && !air) continue;
          // foes on guard sometimes block and counter
          if ((e.st === 'walk' || e.st === 'wind') && !air && Math.random() < (e.boss ? 0.4 : 0.18) + g.loop * 0.06 + (g.stage % 4) * 0.03) {
            au.tone(1400, .04, { type: 'square', vol: .08 }); e.st = 'wind'; e.t = 4; e.face = -dir; hitAny = false; break;
          }
          hitAny = true;
          hitFx(e.x - dir * 4, e.y - 30);
          if (kind === 'knock') { damageFoe(e, dmg); if (!e.boss || e.hp <= 0 || Math.random() < 0.4) knockDown(e, dir, 2.5); else { e.st = 'hurt'; e.t = 0; } }
          else {
            damageFoe(e, dmg);
            if (e.st !== 'down') {
              e.stun++;
              e.st = 'hurt'; e.t = 0; e.x += dir * 2;
              const dazeAt = e.boss ? (e.hp < e.maxhp / 3 ? 3 : 99) : 3;
              if (e.stun >= dazeAt && e.hp > 0) { e.st = 'dazed'; e.t = 0; e.stun = 0; }
              if (e.hp <= 0) knockDown(e, dir, 2);
            }
          }
          addScore(100);
          if (!air) break; // a punch hits one foe; jump kicks can hit several
        }
        if (hitAny) sndHit();
      }
      function damageFoe(e, n) { e.hp -= n; e.flash = 6; }
      function knockDown(e, dir, v) {
        e.st = 'down'; e.t = 0; e.vx = dir * v; e.z = Math.min(e.z, -6); e.vz = -2.5; e.stun = 0; e.downs++;
        sndFall();
        if (e.hp <= 0) { addScore(e.k.pts, e.x, e.y - 50); }
      }
      function hurtPlayer(n, fromX, heavy) {
        const p = g.p;
        if (p.inv > 0 || p.st === 'down' || p.st === 'dead') return;
        if (p.grab) { const e = p.grab; e.st = 'walk'; p.grab = null; }
        p.hp -= n; p.hitsTaken++; p.hitClock = 90;
        au.tone(140, .12, { type: 'sawtooth', vol: .14, slideTo: 70 });
        hitFx(p.x, p.y - 30 + p.z);
        if (p.hp <= 0 || heavy || p.hitsTaken >= 3 || p.st === 'jump') {
          p.st = 'down'; p.t = 0; p.vx = (p.x < fromX ? -2 : 2); p.z = 0; p.vz = 0; p.hitsTaken = 0; sndFall();
          if (p.hp <= 0) p.hp = 0;
        } else { p.st = 'hurt'; p.t = 0; p.face = fromX < p.x ? -1 : 1; }
      }
      function playerDies() {
        g.phase = 'dying'; g.phaseT = 90;
        au.melody([[392, .15], [349, .15], [330, .15], [262, .45]], { type: 'square', vol: .14 });
      }
      function afterDeath() {
        g.lives--;
        if (g.lives <= 0) { lastLife(); return; }
        revive();
      }
      function revive() {
        const p = g.p; const x = p.x, y = p.y;
        g.p = mkPlayer(); g.p.x = x; g.p.y = y; g.p.inv = 120;
        g.bullets = [];
        for (const e of g.foes) if (Math.abs(e.x - x) < 40 && e.st !== 'down') { e.x += e.x < x ? -40 : 40; e.st = 'walk'; }
        g.time = Math.max(g.time, 60 * 60);
        g.phase = 'play';
      }
      function lastLife() {
        g.phase = 'wait';
        const cg = g;
        if (!api.offerContinue) { gameOver(); return; }
        api.offerContinue(() => { if (g === cg) { g.lives = 3; g.score = 0; revive(); } }, () => { if (g === cg) gameOver(); });
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 320;
        au.melody([[262, .25], [247, .25], [233, .25], [220, .7]], { type: 'triangle', vol: .18 });
      }

      // ---------- foes ----------
      function spawnLogic() {
        const active = g.foes.filter(e => e.st !== 'dead');
        if (g.bikers > 0) {
          if (--g.spawnT <= 0 && active.filter(e => e.biker).length < 2) {
            g.spawnT = 70 + Math.random() * 60;
            const fromL = Math.random() < .5;
            const e = mkFoe('thug', fromL ? g.camX - 30 : g.camX + W + 30, YMIN + 4 + Math.random() * (YMAX - YMIN - 8));
            e.biker = true; e.bdir = fromL ? 1 : -1; e.face = e.bdir; e.st = 'ride'; e.passes = 0;
            e.k = Object.assign({}, KINDS.thug, { pal: { skin: '#e0a070', hair: '#101010', shirt: '#202020', pants: '#404040', shoe: '#101010' }, pts: 800 });
            g.foes.push(e); g.bikers--;
            au.noise(.6, { vol: .08, freq: 300 });
          }
          return;
        }
        const maxOn = Math.min(4, 2 + Math.floor(g.loop / 2) + (g.stage % 4 >= 2 ? 1 : 0));
        if (g.toSpawn > 0) {
          if (--g.spawnT <= 0 && active.length < maxOn) {
            g.spawnT = 50 + Math.random() * 70;
            const kinds = g.st.foes, kind = kinds[(Math.random() * kinds.length) | 0];
            const fromL = Math.random() < (g.p.x > STAGE_W / 2 ? .7 : .3);
            const x = fromL ? Math.max(-20, g.camX - 20) : Math.min(STAGE_W + 20, g.camX + W + 20);
            g.foes.push(mkFoe(kind, x, YMIN + Math.random() * (YMAX - YMIN)));
            g.toSpawn--;
          }
        } else if (!g.bossOut && active.length === 0) {
          g.bossOut = true;
          const x = g.p.x < STAGE_W / 2 ? Math.min(STAGE_W - 20, g.camX + W + 20) : Math.max(20, g.camX - 20);
          const b = mkFoe(g.st.boss, x, (YMIN + YMAX) / 2); g.foes.push(b); g.boss = b;
          const k2 = g.st.foes[0];
          g.foes.push(mkFoe(k2, x + 30 * Math.sign(x - g.p.x), YMIN + 6), mkFoe(k2, x + 30 * Math.sign(x - g.p.x), YMAX - 6));
          au.melody([[147, .2], [139, .2], [131, .2], [123, .5]], { type: 'sawtooth', vol: .14 });
        }
      }
      function bikerOff(e) {
        e.biker = false; e.hp = 0; knockDown(e, e.bdir, 3);
        e.crash = { x: e.x, y: e.y, vx: e.bdir * 3, t: 0 };
        addScore(300, e.x, e.y - 40);
        au.noise(.4, { vol: .2, freq: 900, slideTo: 100 });
      }
      function updateFoes() {
        const p = g.p;
        for (const e of g.foes) {
          e.t++; if (e.flash > 0) e.flash--;
          if (e.crash) { e.crash.x += e.crash.vx; e.crash.vx *= .97; e.crash.t++; }
          if (e.st === 'ride') {
            e.x += e.bdir * (2.6 + g.loop * .3);
            if ((e.bdir > 0 && e.x > g.camX + W + 60) || (e.bdir < 0 && e.x < g.camX - 60)) {
              e.passes++;
              if (e.passes >= 3) { e.st = 'dead'; continue; }
              e.bdir = -e.bdir; e.face = e.bdir; e.y = Math.max(YMIN, Math.min(YMAX, p.y + (Math.random() - .5) * 16));
            }
            if (Math.abs(e.x - p.x) < 14 && Math.abs(e.y - p.y) < 6 && p.z > -14) hurtPlayer(4, e.x - e.bdir * 10, true);
            if ((frame & 15) === 0) au.tone(70 + (e.t % 3) * 5, .2, { type: 'sawtooth', vol: .04 });
            continue;
          }
          const dx = p.x - e.x, dy = p.y - e.y;
          switch (e.st) {
            case 'enter': case 'walk': {
              e.face = dx > 0 ? 1 : -1;
              // pick a side of the player and approach
              const reach = e.k.reach - 4;
              const tx = p.x - e.side * reach, ty = p.y;
              const ex = tx - e.x, ey = ty - e.y;
              if (Math.abs(ex) > 2) e.x += Math.sign(ex) * Math.min(Math.abs(ex), e.sp);
              if (Math.abs(ey) > 1) e.y += Math.sign(ey) * Math.min(Math.abs(ey), e.sp * 0.6);
              e.walk++;
              // don't crowd: if another foe already on that side, switch
              if ((e.t & 63) === 0) { const same = g.foes.some(o => o !== e && o.st === 'walk' && Math.sign(p.x - o.x) === Math.sign(p.x - e.x) && Math.abs(o.x - e.x) < 20); if (same) e.side = -e.side; }
              e.face = dx > 0 ? 1 : -1;
              if (--e.cd <= 0 && Math.abs(dx) < e.k.reach + 2 && Math.abs(dy) < 6 && p.st !== 'down') { e.st = 'wind'; e.t = 0; }
              if (e.k.weapon === 'gun' && e.cd <= 0 && Math.abs(dx) > 70 && Math.abs(dy) < 8 && p.st !== 'down') { e.st = 'aim'; e.t = 0; }
              break;
            }
            case 'wind':
              if (e.t >= (e.boss ? 12 : 16) - Math.min(6, g.loop * 2)) { e.st = 'atk'; e.t = 0; }
              break;
            case 'atk':
              if (e.t === 2) {
                if (Math.abs(p.x + 0 - e.x) < e.k.reach + 4 && Math.sign(p.x - e.x) === e.face && Math.abs(p.y - e.y) < 7 && p.z > -18) hurtPlayer(e.k.dmg, e.x, e.boss && Math.random() < .3);
                else sndWhiff();
              }
              if (e.t >= 14) { e.st = 'walk'; e.cd = (e.boss ? 40 : 60) + Math.random() * (e.boss ? 40 : 80) - g.loop * 8; }
              break;
            case 'aim':
              e.face = dx > 0 ? 1 : -1;
              if (e.t === 30) { g.bullets.push({ x: e.x + e.face * 18, y: e.y, vx: e.face * 4, life: 90 }); au.noise(.15, { vol: .25, freq: 3000, slideTo: 400 }); }
              if (e.t >= 50) { e.st = 'walk'; e.cd = 100 + Math.random() * 60; }
              break;
            case 'hurt':
              if (e.t >= 14) { e.st = 'walk'; e.cd = Math.min(e.cd, 8 + Math.random() * 20); }
              break;
            case 'dazed':
              if (e.t >= 60) { e.st = 'walk'; e.cd = 20; }
              break;
            case 'held':
              if (p.grab !== e) { e.st = 'walk'; e.cd = 20; break; }
              e.x = p.x + p.face * 13; e.y = p.y; e.face = -p.face;
              break;
            case 'down':
              e.x += e.vx; e.vx *= 0.92;
              if (e.z < 0 || e.vz < 0) { e.vz += 0.3; e.z += e.vz; if (e.z >= 0) { e.z = 0; e.vz = 0; } }
              if (e.t >= (e.hp <= 0 ? 80 : 55)) {
                if (e.hp <= 0) { e.st = 'dead'; if (e === g.boss) bossBeaten(); }
                else { e.st = 'walk'; e.cd = 30; }
              }
              break;
          }
          e.y = Math.max(YMIN, Math.min(YMAX, e.y));
          if (e.st !== 'down' && e.st !== 'held') e.x = Math.max(-40, Math.min(STAGE_W + 40, e.x));
        }
        g.foes = g.foes.filter(e => e.st !== 'dead');
        for (const b of g.bullets) {
          b.x += b.vx; b.life--;
          if (Math.abs(b.x - p.x) < 6 && Math.abs(b.y - p.y) < 6 && p.z > -16 && p.inv <= 0 && p.st !== 'down') { b.life = 0; hurtPlayer(12, b.x - b.vx, true); }
        }
        g.bullets = g.bullets.filter(b => b.life > 0);
      }
      function bossBeaten() {
        for (const e of g.foes) if (e !== g.boss && e.st !== 'down') { e.hp = 0; knockDown(e, e.x < g.p.x ? -1 : 1, 2); }
        g.phase = 'clear'; g.phaseT = 300;
        g.bonus = Math.floor(g.time / 60) * 100;
        addScore(g.bonus);
        au.melody([[523, .1], [659, .1], [784, .1], [1047, .2], [784, .1], [1047, .4]], { type: 'square', vol: .14, delay: .6 });
      }

      function update() {
        frame++; if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { mode = 'game'; newGame(); }
            else { coinFlash = 90; au.tone(90, .3, { type: 'square', vol: .15 }); }
          }
          return;
        }
        for (const q of g.parts) { q.x += q.vx; q.y += q.vy; q.t--; }
        g.parts = g.parts.filter(q => q.t > 0);
        for (const q of g.pops) { q.t--; q.y -= .4; }
        g.pops = g.pops.filter(q => q.t > 0);
        if (g.train) { g.train.t--; if (g.train.t <= 0 && g.st.bg === 'subway') { g.train.x += 8; if (g.train.x > STAGE_W + 500) { g.train.x = -600; g.train.t = 900; } if (g.train.x > -500 && g.train.x < -480) au.noise(2, { vol: .06, freq: 300 }); } }
        if (g.phase === 'ready') { if (--g.phaseT <= 0) g.phase = 'play'; return; }
        if (g.phase === 'play') {
          updatePlayer();
          if (g.phase !== 'play') return;
          spawnLogic(); updateFoes();
          if (g.time > 0 && --g.time <= 0) { g.time = 0; g.p.hp = 0; g.p.st = 'down'; g.p.t = 50; g.p.grab = null; au.tone(200, .5, { type: 'square', vol: .12 }); }
          if (g.time === 30 * 60) au.melody([[880, .1], [0, .05], [880, .1]], { type: 'square', vol: .1 });
          return;
        }
        if (g.phase === 'dying') { updateFoes(); if (--g.phaseT <= 0) afterDeath(); return; }
        if (g.phase === 'clear') { updateFoes(); if (--g.phaseT <= 0) { g.stage++; startStage(); } return; }
        if (g.phase === 'over') { if (--g.phaseT <= 0 || (g.phaseT < 220 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; } }
      }

      // ---------- backgrounds ----------
      function drawBG(ctx, kind, camX) {
        const ox = -Math.round(camX);
        if (kind === 'subway') {
          ctx.fillStyle = '#c8c0a0'; ctx.fillRect(0, 30, W, 110);
          ctx.fillStyle = '#e8e0c8'; for (let x = (ox % 16) - 16; x < W; x += 16) for (let y = 30; y < 120; y += 8) ctx.fillRect(x + ((y >> 3) & 1) * 8, y, 15, 7);
          for (let i = 0; i < 6; i++) {
            const px = ox + 40 + i * 110; if (px < -60 || px > W) continue;
            ctx.fillStyle = ['#d03030', '#3060d0', '#30a050'][i % 3]; ctx.fillRect(px, 50, 40, 50);
            ctx.fillStyle = '#fff'; ctx.fillRect(px + 4, 56, 32, 4); ctx.fillRect(px + 8, 64, 24, 20);
          }
          ctx.fillStyle = '#204080'; ctx.fillRect(0, 34, W, 8); text(ctx, 'SUBWAY', ox + 300, 35, '#ffffff', 1);
          ctx.fillStyle = '#909090'; ctx.fillRect(0, 120, W, 20);
          // train passing behind the platform
          if (g && g.train) { const tx = g.train.x + ox; if (tx > -500 && tx < W) { ctx.fillStyle = '#b0b8c0'; ctx.fillRect(tx, 70, 480, 66); ctx.fillStyle = '#c03030'; ctx.fillRect(tx, 112, 480, 6); ctx.fillStyle = '#304060'; for (let k = 0; k < 12; k++) ctx.fillRect(tx + 10 + k * 40, 80, 26, 20); } }
          ctx.fillStyle = '#707070'; ctx.fillRect(0, 140, W, H - 140);
          ctx.fillStyle = '#e8d040'; ctx.fillRect(0, 140, W, 3);
          ctx.fillStyle = '#606060'; for (let x = (ox % 32) - 32; x < W; x += 32) ctx.fillRect(x, 143, 1, H - 143);
        } else if (kind === 'harbor') {
          const gr = ctx.createLinearGradient(0, 30, 0, 120); gr.addColorStop(0, '#f0a060'); gr.addColorStop(1, '#ffd0a0');
          ctx.fillStyle = gr; ctx.fillRect(0, 30, W, 90);
          ctx.fillStyle = '#204a80'; ctx.fillRect(0, 100, W, 40);
          ctx.fillStyle = '#4070b0'; for (let i = 0; i < 20; i++) ctx.fillRect(((i * 37 + frame * .3 + ox * .3) % W + W) % W, 104 + (i * 13) % 30, 8, 1);
          for (let i = 0; i < 4; i++) { const cx = ox * .5 + i * 180; ctx.fillStyle = '#c04020'; ctx.fillRect(cx, 50, 6, 50); ctx.fillRect(cx, 50, 50, 5); ctx.fillStyle = '#303030'; ctx.fillRect(cx + 40, 55, 1, 25); }
          ctx.fillStyle = '#404040'; ctx.fillRect(ox * .5 + 100, 80, 70, 20); ctx.fillRect(ox * .5 + 110, 70, 30, 10);
          ctx.fillStyle = '#8a6a40'; ctx.fillRect(0, 140, W, H - 140);
          ctx.fillStyle = '#6a4a28'; for (let y = 140; y < H; y += 8) ctx.fillRect(0, y, W, 1);
          for (let x = (ox % 48) - 48; x < W; x += 48) { ctx.fillStyle = '#5a3a18'; ctx.fillRect(x, 140, 2, H - 140); }
          ctx.fillStyle = '#303030'; ctx.fillRect(0, 136, W, 4); for (let x = (ox % 40) - 40; x < W; x += 40) ctx.fillRect(x, 128, 4, 10);
        } else if (kind === 'street') {
          ctx.fillStyle = '#202040'; ctx.fillRect(0, 30, W, 110);
          for (let i = 0; i < 10; i++) {
            const bx = ox + i * 70; if (bx < -70 || bx > W) continue;
            ctx.fillStyle = ['#704838', '#586070', '#806040'][i % 3]; ctx.fillRect(bx, 40 + (i % 3) * 8, 66, 100);
            for (let wy = 50 + (i % 3) * 8; wy < 110; wy += 16) for (let wx = 6; wx < 60; wx += 14) { ctx.fillStyle = ((i + wx + wy) % 5) ? '#ffe080' : '#303030'; ctx.fillRect(bx + wx, wy, 8, 10); }
            ctx.fillStyle = ['#ff4080', '#40ffff', '#ffff40'][i % 3]; ctx.fillRect(bx + 10, 116, 46, 8);
            ctx.fillStyle = '#101010'; ctx.fillRect(bx + 26, 124, 14, 16);
          }
          ctx.fillStyle = '#808088'; ctx.fillRect(0, 140, W, 10);
          ctx.fillStyle = '#404048'; ctx.fillRect(0, 150, W, H - 150);
          ctx.fillStyle = '#c0c040'; for (let x = (ox % 40) - 40; x < W; x += 40) ctx.fillRect(x, 200, 20, 2);
        } else {
          ctx.fillStyle = '#301c18'; ctx.fillRect(0, 30, W, 115);
          for (let y = 30; y < 140; y += 6) for (let x = (ox % 16) - 16; x < W; x += 16) { ctx.fillStyle = (y / 6) & 1 ? '#5a2c20' : '#64342a'; ctx.fillRect(x + ((y / 6) & 1) * 8, y, 15, 5); }
          for (let i = 0; i < 6; i++) { const dx2 = ox + 60 + i * 120; if (dx2 < -40 || dx2 > W) continue; ctx.fillStyle = '#2a1a10'; ctx.fillRect(dx2, 80, 28, 60); ctx.fillStyle = '#806020'; ctx.fillRect(dx2 + 22, 110, 3, 3); ctx.fillStyle = '#ffd040'; ctx.fillRect(dx2 + 8, 66, 12, 6); }
          for (let i = 0; i < 5; i++) { const tx = ox + 20 + i * 140; ctx.fillStyle = '#506050'; ctx.fillRect(tx, 124, 16, 18); ctx.fillStyle = '#708070'; ctx.fillRect(tx - 1, 122, 18, 3); }
          ctx.fillStyle = '#383030'; ctx.fillRect(0, 142, W, H - 142);
          ctx.fillStyle = '#2a2222'; for (let x = (ox % 24) - 24; x < W; x += 24) ctx.fillRect(x, 142, 1, H - 142);
        }
      }

      // ---------- render ----------
      function foePose(e) {
        switch (e.st) {
          case 'wind': return e.k.weapon === 'gun' ? 'aim' : 'wind';
          case 'atk': return e.k.weapon === 'chain' ? 'lash' : (e.boss && e.kind === 'chief' && (e.t & 1)) ? 'fkick' : 'punch';
          case 'aim': return 'aim';
          case 'hurt': return 'hurt';
          case 'dazed': return 'dazed';
          case 'held': return 'held';
          case 'down': return 'down';
          default: return (e.walk >> 3) & 1 ? 'walk1' : 'walk2';
        }
      }
      function playerPose(p) {
        switch (p.st) {
          case 'punch': return p.t < 8 ? 'punch' : 'idle';
          case 'bkick': return p.t < 14 ? 'bkick' : 'idle';
          case 'jump': return p.kicked && p.atkT > 0 ? 'jkick' : 'jump';
          case 'grab': return 'grab';
          case 'knee': return p.t < 10 ? 'knee' : 'grab';
          case 'throw': return 'throw';
          case 'hurt': return 'hurt';
          case 'down': return 'down';
          case 'walk': return (p.walk >> 3) & 1 ? 'walk1' : 'walk2';
          default: return 'idle';
        }
      }
      function drawBike(ctx, x, y, dir) {
        ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(dir, 1);
        ctx.fillStyle = '#101010'; ctx.beginPath(); ctx.arc(-12, -6, 6, 0, 6.3); ctx.arc(14, -6, 6, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#808080'; ctx.fillRect(-13, -7, 2, 2); ctx.fillRect(13, -7, 2, 2);
        ctx.fillStyle = '#c02020'; ctx.fillRect(-10, -16, 22, 7); ctx.fillStyle = '#e0e0e0'; ctx.fillRect(10, -22, 2, 10); ctx.fillRect(8, -22, 6, 2);
        ctx.fillStyle = '#404040'; ctx.fillRect(-14, -12, 6, 3);
        ctx.restore();
      }
      function credStr() { return 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'); }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        const camX = Math.round(g.camX);
        drawBG(ctx, g.st.bg, camX);
        // draw sorted by depth
        const list = g.foes.map(e => ({ y: e.y, e }));
        list.push({ y: g.p.y + 0.1, p: g.p });
        list.sort((a, b) => a.y - b.y);
        for (const it of list) {
          if (it.p) {
            const p = it.p;
            ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(Math.round(p.x - camX) - 8, Math.round(p.y) - 2, 16, 3);
            if (g.phase === 'wait' || g.phase === 'over') continue;
            if (p.inv > 0 && (frame & 2) && p.st !== 'down') continue;
            drawFighter(ctx, p, p.x - camX, p.y + p.z, PLAYER_PAL, playerPose(p), {});
          } else {
            const e = it.e;
            if (e.crash) { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - e.crash.t / 60); drawBike(ctx, e.crash.x - camX, e.crash.y, -e.bdir); ctx.restore(); }
            if (e.st === 'down' && e.hp <= 0 && e.t > 40 && (frame & 2)) continue;
            ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(Math.round(e.x - camX) - 8, Math.round(e.y) - 2, 16, 3);
            const opt = { scale: e.k.scale || 1, weapon: e.k.weapon, flash: e.flash > 0 && (frame & 2) };
            if (e.kind === 'jack') opt.bald = true;
            if (e.kind === 'girl' || e.kind === 'bertha') opt.longHair = true;
            if (e.kind === 'chief' || e.kind === 'sabu') opt.shades = true;
            if (e.kind === 'chief') opt.vest = '#603010';
            if (e.st === 'ride') {
              drawBike(ctx, e.x - camX, e.y, e.bdir);
              drawFighter(ctx, { face: e.bdir }, e.x - camX - e.bdir * 2, e.y - 10, e.k.pal, 'jump', opt);
              continue;
            }
            drawFighter(ctx, e, e.x - camX, e.y + e.z, e.k.pal, foePose(e), opt);
            if (e.st === 'dazed') { for (let k = 0; k < 3; k++) { const a = frame * .15 + k * 2.1; ctx.fillStyle = '#ffff40'; ctx.fillRect(Math.round(e.x - camX + Math.cos(a) * 7), Math.round(e.y - 46 * (e.k.scale || 1) + Math.sin(a) * 2), 2, 2); } }
          }
        }
        for (const b of g.bullets) { ctx.fillStyle = '#ffff80'; ctx.fillRect(Math.round(b.x - camX) - 2, Math.round(b.y) - 30, 4, 2); }
        for (const q of g.parts) { ctx.fillStyle = (q.t & 2) ? '#ffffff' : '#ffd040'; ctx.fillRect(Math.round(q.x - camX), Math.round(q.y), 2, 2); }
        for (const q of g.pops) text(ctx, q.s, q.x - camX, q.y, '#ffffff', 1, 'center');
        drawHUD(ctx);
        if (g.phase === 'ready') { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(30, 70, W - 60, 40); text(ctx, 'MISSION ' + (g.stage + 1), W / 2, 76, '#ffe040', 2, 'center'); text(ctx, g.st.name, W / 2, 96, '#ffffff', 1, 'center'); }
        if (g.phase === 'clear') { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(30, 70, W - 60, 40); text(ctx, 'STAGE CLEAR', W / 2, 76, '#ffe040', 2, 'center'); text(ctx, 'TIME BONUS ' + g.bonus, W / 2, 96, '#ffffff', 1, 'center'); }
        if (g.phase === 'over') { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(50, 80, W - 100, 30); text(ctx, 'GAME OVER', W / 2, 88, '#ff3030', 2, 'center'); }
        if (g.phase === 'play' && g.bossOut && g.boss && g.boss.st !== 'dead' && g.boss.t < 120 && (frame >> 3) & 1) text(ctx, 'THE BOSS!', W / 2, 60, '#ff3030', 2, 'center');
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 30);
        const p = g.p;
        text(ctx, '1P', 4, 2, '#ff3030', 1); text(ctx, String(g.score).padStart(6, '0'), 20, 2, '#fff', 1);
        text(ctx, 'HI ' + String(hi).padStart(6, '0'), W / 2 + 4, 2, '#ffe040', 1, 'center');
        text(ctx, 'TIME', W - 40, 2, '#80c0ff', 1); text(ctx, String(Math.ceil(g.time / 60)).padStart(3, '0'), W - 4, 12, (g.time < 30 * 60 && (frame & 16)) ? '#ff3030' : '#ffffff', 1, 'right');
        // health
        ctx.fillStyle = '#400000'; ctx.fillRect(4, 13, 74, 6);
        for (let i = 0; i < 24; i++) { ctx.fillStyle = i < p.hp ? (p.hp > 8 ? '#40e040' : '#ff4020') : '#200000'; ctx.fillRect(5 + i * 3, 14, 2, 4); }
        for (let i = 0; i < Math.min(5, g.lives - 1); i++) { ctx.fillStyle = PLAYER_PAL.hair; ctx.fillRect(84 + i * 8, 13, 6, 2); ctx.fillStyle = PLAYER_PAL.skin; ctx.fillRect(84 + i * 8, 15, 6, 4); }
        if (g.boss && g.bossOut && g.boss.st !== 'dead') {
          text(ctx, 'BOSS', 130, 13, '#ff3030', 1);
          ctx.fillStyle = '#400000'; ctx.fillRect(156, 14, 52, 5); ctx.fillStyle = '#ff6020'; ctx.fillRect(157, 15, Math.max(0, Math.ceil(50 * g.boss.hp / g.boss.maxhp)), 3);
        } else {
          const left = g.toSpawn + g.foes.filter(e => e.st !== 'dead' && !(e.st === 'down' && e.hp <= 0)).length + g.bikers;
          text(ctx, 'GANG ' + left, 130, 13, '#c0c0c0', 1);
        }
        text(ctx, 'MISSION ' + (g.stage + 1), 4, 22, '#c0a0ff', 1);
        text(ctx, g.st.name, W - 4, 22, '#806080', 1, 'right');
      }
      function renderTitle(ctx) {
        drawBG(ctx, ['subway', 'harbor', 'street', 'alley'][Math.floor(titleT / 300) % 4], (titleT * 0.5) % (STAGE_W - W));
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, W, H);
        text(ctx, 'RENEGADE', W / 2 + 3, 37, '#600000', 4, 'center');
        text(ctx, 'RENEGADE', W / 2, 34, '#ff3030', 4, 'center');
        // a little sparring demo
        const ph = (titleT >> 4) % 6;
        const pose = ['idle', 'punch', 'idle', 'bkick', 'jump', 'jkick'][ph];
        drawFighter(ctx, { face: 1 }, 110, 140 - (ph >= 4 ? 14 : 0), PLAYER_PAL, pose, {});
        drawFighter(ctx, { face: -1 }, 132, 140, KINDS.thug.pal, ph === 1 || ph === 5 ? 'hurt' : 'idle', {});
        drawFighter(ctx, { face: 1 }, 88, 140, KINDS.thug.pal, ph === 3 ? 'hurt' : 'wind', {});
        const page = Math.floor(titleT / 400) % 2;
        if (page === 0) {
          text(ctx, 'SPACE = HIT LEFT   X = HIT RIGHT', W / 2, 152, '#ffffff', 1, 'center');
          text(ctx, 'BEHIND YOU = BACK KICK', W / 2, 162, '#ffe040', 1, 'center');
          text(ctx, 'BOTH = JUMP KICK', W / 2, 172, '#ffe040', 1, 'center');
        } else {
          text(ctx, 'HIGH SCORE', W / 2, 154, '#ffe040', 1, 'center'); text(ctx, String(hi), W / 2, 166, '#ffffff', 1, 'center');
        }
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 188, '#ff4040', 1, 'center'); }
        else if ((titleT >> 5) & 1) text(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 188, '#40ffff', 1, 'center');
        text(ctx, credStr(), W / 2, 200, '#c0c0c0', 1, 'center');
        text(ctx, '\u00a9 1986 TECHNOS JAPAN / TAITO', W / 2, 212, '#909090', 1, 'center');
      }
      return { update, render, destroy() { } };
    }
  });
})();
