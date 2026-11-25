// SonSon (Capcom, 1984) \u2014 built-in recreation for the MAME32 Game Room.
// The monkey king SonSon and his pig friend TonTon travel west to India along six scrolling lanes. Jump between
// lanes, shoot the creatures, and eat fruit in unbroken chains for growing bonuses.
(function () {
  'use strict';
  const W = 256, H = 224;

  // ================= Bitmap font (5x7) =================
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
    '=': '00001F001F0000', '+': '0004041F040400', 'x': '00110A040A1100'
  };
  const FONT = {};
  for (const k in FONT_HEX) { const s = FONT_HEX[k]; const a = []; for (let i = 0; i < 7; i++) a.push(parseInt(s.substr(i * 2, 2), 16) || 0); FONT[k] = a; }
  function text(ctx, s, x, y, col, o) {
    o = o || {}; const sc = o.scale || 1, adv = 8 * sc; s = String(s).toUpperCase();
    const w = s.length * adv - 3 * sc;
    if (o.center) x = Math.round(x - w / 2); else if (o.right) x = Math.round(x - w);
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) { const b = g[r]; if (!b) continue; for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + i * adv + c * sc, y + r * sc, sc, sc); }
    }
  }
  function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; }

  const LANES = 6, LY = [];
  for (let i = 0; i < LANES; i++) LY.push(56 + i * 30);
  const STAGE_COUNT = 12;
  const PLACES = ['CHANG-AN', 'YELLOW RIVER', 'BAMBOO GROVE', 'FIRE MOUNTAIN', 'SILK ROAD', 'DESERT', 'DEMON CAVE', 'STONE FOREST', 'HIMALAYA', 'GANGES', 'TEMPLE ROAD', 'INDIA'];
  const SKIES = [['#58a8f8', '#90d0ff'], ['#f8a858', '#ffd090'], ['#3878c8', '#78b0e8'], ['#c84828', '#f89058'], ['#e8c070', '#f8e0a0'], ['#2a2a6a', '#5a5aa8']];
  const FRUITS = [
    { name: 'peach', c1: '#ffa0b0', c2: '#ff6080', leaf: '#40a040' },
    { name: 'cherry', c1: '#e02030', c2: '#a01020', leaf: '#40a040' },
    { name: 'banana', c1: '#ffe040', c2: '#c0a020', leaf: '#806020' },
    { name: 'strawberry', c1: '#ff3040', c2: '#c01828', leaf: '#40c040' },
    { name: 'grape', c1: '#9050d0', c2: '#6030a0', leaf: '#40a040' },
    { name: 'melon', c1: '#60c040', c2: '#307020', leaf: '#806020' }
  ];

  ArcadeRegistry.register({
    id: 'sonson', title: 'SonSon', year: 1984, maker: 'Capcom',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Left/Right: run \u00b7 Up/Down: jump to the lane above/below \u00b7 Space: fire \u00b7 Enter: start',
    marquee: { bg: '#f8d040', fg: '#c01818', accent: '#2050c0' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(30000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0;
      let g = null;
      let bgX = 0;

      const sfx = {
        shot() { au.tone(1000, 0.05, { type: 'square', vol: 0.06, slideTo: 1600 }); },
        jump() { au.tone(400, 0.12, { type: 'square', vol: 0.07, slideTo: 900 }); },
        drop() { au.tone(700, 0.1, { type: 'square', vol: 0.06, slideTo: 300 }); },
        kill() { au.tone(800, 0.06, { type: 'square', vol: 0.08, slideTo: 200 }); au.noise(0.08, { vol: 0.08, freq: 2500 }); },
        hit() { au.tone(1500, 0.03, { type: 'square', vol: 0.05 }); },
        fruit(n) { au.tone(660 + Math.min(10, n) * 90, 0.07, { type: 'square', vol: 0.08 }); },
        big() { au.melody([[1047, .05], [1319, .05], [1568, .05], [2093, .1]], { type: 'square', vol: 0.1 }); },
        pow() { au.melody([[523, .05], [784, .05], [1047, .05], [784, .05], [1047, .05], [1568, .12]], { type: 'square', vol: 0.1 }); },
        die() { au.melody([[880, .08], [784, .08], [698, .08], [587, .08], [523, .08], [392, .3]], { type: 'square', vol: 0.11 }); },
        clear() { au.melody([[523, .1], [659, .1], [784, .1], [1047, .1], [880, .1], [1047, .35]], { type: 'square', vol: 0.12 }); },
        oneup() { au.melody([[784, .06], [988, .06], [1175, .06], [1568, .14]], { type: 'square', vol: 0.1 }); },
        start() {
          au.melody([[392, .12], [440, .12], [523, .24], [440, .12], [523, .12], [587, .24], [659, .12], [587, .12], [523, .36]], { type: 'square', vol: 0.1 });
          au.melody([[196, .24], [262, .24], [220, .24], [294, .24], [262, .48]], { type: 'triangle', vol: 0.1 });
        }
      };

      // ================= State =================
      function newGame() {
        g = { score: 0, lives: 3, stage: 0, nextLife: 30000 };
        startStage();
        sfx.start();
      }
      function diff() { return g.stage * 0.45 + (g.loop || 0) * 2; }
      function startStage() {
        g.en = []; g.eb = []; g.shots = []; g.fruit = []; g.pops = []; g.fx = [];
        g.dist = 0; g.len = 2400 + Math.min(8, g.stage) * 120; g.spawnT = 90; g.fruitT = 40; g.boss = null;
        g.chain = 0; g.chainT = 0; g.lastLane = -1;
        g.bossStage = g.stage % 3 === 2;
        resetPlayers();
        g.phase = 'ready'; g.phaseT = 150;
      }
      function resetPlayers() {
        g.p = { x: 60, lane: 2, y: LY[2], dir: 1, jump: null, inv: 120, cool: 0, alive: true, step: 0 };
        g.pig = { x: 40, lane: 4, y: LY[4], dir: 1, jump: null, cool: 0, out: 0, think: 0, step: 0 };
      }
      function addScore(n) {
        g.score += n;
        if (g.score >= g.nextLife) { g.lives++; g.nextLife += g.nextLife === 30000 ? 70000 : 100000; sfx.oneup(); }
        if (g.score > hi) { hi = g.score; api.setHiScore(hi); }
      }
      function pop(x, y, n, col) { g.pops.push({ x, y, n, t: 50, col: col || '#ffffff' }); }
      function speed() { return 0.6 + Math.min(0.5, diff() * 0.04); }

      // ================= Spawning =================
      function freeLane(avoid) {
        let l; for (let k = 0; k < 6; k++) { l = Math.floor(Math.random() * LANES); if (l !== avoid) break; } return l;
      }
      function addEn(e) { e.t = 0; e.flash = 0; e.hp = e.hp || 1; e.y = e.y == null ? LY[e.lane] : e.y; g.en.push(e); return e; }
      function spawnEnemy() {
        const d = diff(), r = Math.random();
        const lane = Math.floor(Math.random() * LANES);
        if (r < 0.32) addEn({ k: 'imp', x: W + 10, lane, vx: -(0.4 + Math.random() * 0.4 + d * 0.04), pts: 100, hopT: 60 + Math.random() * 120 });
        else if (r < 0.5) addEn({ k: 'bat', x: W + 10, y0: LY[lane] - 8, y: LY[lane] - 8, lane, vx: -(1.0 + d * 0.06), ph: Math.random() * 6, pts: 300 });
        else if (r < 0.66) addEn({ k: 'skull', x: W + 10, lane, vx: -(1.6 + d * 0.1), hp: 2, pts: 100 });
        else if (r < 0.78 && d > 0.3) addEn({ k: 'statue', x: W + 12, lane, vx: 0, hp: 5 + Math.floor(d), fireT: 60, pts: 500 });
        else if (r < 0.9) addEn({ k: 'bird', x: W + 10, y: 20, lane: -1, vx: -(1.4 + d * 0.05), vy: 0.9 + Math.random() * 0.6, pts: 300 });
        else {
          // a pack of imps on neighbouring lanes
          const l0 = Math.min(LANES - 2, lane);
          for (let i = 0; i < 2; i++) addEn({ k: 'imp', x: W + 10 + i * 16, lane: l0 + i, vx: -(0.5 + d * 0.04), pts: 200, hopT: 200 });
        }
      }
      function spawnFruitRow() {
        const lane = Math.floor(Math.random() * LANES);
        const n = 4 + Math.floor(Math.random() * 5), kind = Math.floor(Math.random() * 5);
        const zig = Math.random() < 0.3;
        for (let i = 0; i < n; i++) {
          const l = zig ? Math.max(0, Math.min(LANES - 1, lane + ((i >> 1) & 1 ? 1 : 0))) : lane;
          g.fruit.push({ x: W + 8 + i * 18, lane: l, kind, big: false });
        }
        if (Math.random() < 0.18) g.fruit.push({ x: W + 8 + n * 18 + 30, lane: Math.floor(Math.random() * LANES), kind: 5, big: true });
        if (Math.random() < 0.07) g.fruit.push({ x: W + 40, lane: Math.floor(Math.random() * LANES), kind: -1, pow: true });
      }
      function spawnBoss() {
        const hp = 18 + Math.floor(diff() * 4);
        g.boss = { x: W + 30, y: LY[2], ty: LY[2], hp, max: hp, t: 0, flash: 0, dead: 0, fireT: 80 };
        au.melody([[196, .15], [185, .15], [175, .15], [165, .4]], { type: 'sawtooth', vol: 0.1 });
      }

      // ================= Players =================
      function startJump(c, dl) {
        const to = c.lane + dl;
        if (to < 0 || to >= LANES || c.jump) return false;
        c.jump = { from: c.lane, to, t: 0, T: dl < 0 ? 22 : 16 };
        return true;
      }
      function stepJump(c) {
        if (!c.jump) { c.y = LY[c.lane]; return; }
        const j = c.jump; j.t++;
        const f = j.t / j.T, y0 = LY[j.from], y1 = LY[j.to];
        c.y = y0 + (y1 - y0) * f - Math.sin(f * Math.PI) * (j.to < j.from ? 14 : 6);
        if (j.t >= j.T) { c.lane = j.to; c.jump = null; c.y = LY[c.lane]; }
      }
      function laneOf(c) { return c.jump ? (c.jump.t > c.jump.T / 2 ? c.jump.to : c.jump.from) : c.lane; }
      function fire(c, who) {
        const n = g.shots.filter(s => s.who === who).length;
        if (n >= 2) return;
        c.cool = 14;
        g.shots.push({ x: c.x + c.dir * 8, y: c.y - 7, vx: c.dir * 4.2, who, lane: laneOf(c) });
        if (who === 'p') sfx.shot();
      }
      function updPlayer() {
        const p = g.p;
        if (p.inv > 0) p.inv--;
        if (p.cool > 0) p.cool--;
        let mv = 0;
        if (api.key('ArrowLeft')) { mv = -1; p.dir = -1; }
        else if (api.key('ArrowRight')) { mv = 1; p.dir = 1; }
        p.x += mv * 1.4;
        if (mv) { if ((frame & 7) === 0) p.step++; }
        // drifting back with the scenery when standing still feels right in SonSon: the world scrolls past
        p.x = Math.max(10, Math.min(W - 12, p.x));
        if (!p.jump) {
          if (api.pressed('ArrowUp') && startJump(p, -1)) sfx.jump();
          else if (api.pressed('ArrowDown') && startJump(p, 1)) sfx.drop();
        }
        stepJump(p);
        if (api.key('Space') && p.cool <= 0) fire(p, 'p');
      }
      function updPig() {
        const q = g.pig, p = g.p;
        if (q.out > 0) { q.out--; if (q.out === 0) { q.x = 20; q.lane = (p.lane + 3) % LANES; q.jump = null; q.inv = 90; } return; }
        if (q.inv > 0) q.inv--;
        if (q.cool > 0) q.cool--;
        // TonTon wanders toward the nearest fruit ahead, otherwise keeps pace with SonSon on another lane
        if (--q.think <= 0 && !q.jump) {
          q.think = 30 + Math.random() * 30;
          let best = null, bd = 1e9;
          for (const f of g.fruit) { if (f.pow) continue; const d = Math.abs(f.x - q.x) + Math.abs(f.lane - q.lane) * 40; if (f.x > q.x - 10 && d < bd) { bd = d; best = f; } }
          q.target = best ? { x: best.x, lane: best.lane } : { x: Math.max(30, p.x - 30 + Math.random() * 60), lane: q.lane === p.lane ? (q.lane + 2) % LANES : q.lane };
        }
        const tg = q.target || { x: q.x, lane: q.lane };
        if (!q.jump && tg.lane !== q.lane) startJump(q, tg.lane < q.lane ? -1 : 1);
        const dx = tg.x - q.x;
        if (Math.abs(dx) > 3) { q.x += Math.sign(dx) * 1.1; q.dir = Math.sign(dx); if ((frame & 7) === 0) q.step++; }
        q.x = Math.max(10, Math.min(W - 12, q.x));
        stepJump(q);
        if (q.cool <= 0) for (const e of g.en) if (e.lane === laneOf(q) && e.x > q.x && e.x - q.x < 140) { q.dir = 1; fire(q, 'pig'); break; }
      }
      function killPlayer() {
        const p = g.p;
        if (!p.alive || p.inv > 0 || g.phase !== 'play') return;
        p.alive = false; g.phase = 'dead'; g.phaseT = 140; p.vy = -3; sfx.die();
      }

      // ================= Update =================
      function updWorld() {
        const sp = speed(), p = g.p;
        g.dist += sp; bgX += sp;
        // fruit chain timeout
        if (g.chainT > 0 && --g.chainT === 0) g.chain = 0;
        if (!g.boss) {
          if (g.dist < g.len) {
            if (--g.spawnT <= 0) { g.spawnT = Math.max(32, 90 - diff() * 7) + Math.random() * 50; spawnEnemy(); }
            if (--g.fruitT <= 0) { g.fruitT = 160 + Math.random() * 120; spawnFruitRow(); }
          } else if (g.bossStage) spawnBoss();
          else if (!g.en.some(e => e.x < W)) stageClear();
        }
        for (const f of g.fruit) f.x -= sp;
        g.fruit = g.fruit.filter(f => f.x > -12);
        // enemies
        const d = diff();
        for (const e of g.en) {
          e.t++; if (e.flash > 0) e.flash--;
          if (e.k === 'imp') {
            e.x += e.vx - sp * 0.2;
            if (--e.hopT <= 0 && !e.jump) { e.hopT = 90 + Math.random() * 120; const dl = p.lane > e.lane ? 1 : p.lane < e.lane ? -1 : (Math.random() < 0.5 ? -1 : 1); startJump(e, dl); }
            stepJump(e);
          } else if (e.k === 'bat') {
            e.x += e.vx; e.y = e.y0 + Math.sin(e.t * 0.06 + e.ph) * 26;
            e.lane = nearestLane(e.y + 8);
          } else if (e.k === 'skull') {
            e.x += e.vx;
          } else if (e.k === 'statue') {
            e.x -= sp;
            if (e.x < W - 8 && --e.fireT <= 0) { e.fireT = Math.max(60, 130 - d * 10); g.eb.push({ x: e.x - 8, y: e.y - 10, vx: -1.6 - d * 0.08, vy: 0 }); }
          } else if (e.k === 'bird') {
            e.x += e.vx; e.y += e.vy; if (e.y > LY[LANES - 1] + 10) e.vy = -Math.abs(e.vy);
            e.lane = nearestLane(e.y + 6);
          } else if (e.k === 'fruitfly') {
            e.x -= sp;
          }
          if (e.x < -20 || e.x > W + 60 || e.y < -20) e.gone = true;
          // contact
          if (p.alive && p.inv <= 0 && Math.abs(e.x - p.x) < 9 && Math.abs((e.y - 6) - (p.y - 7)) < 11) killPlayer();
          const q = g.pig;
          if (!q.out && !(q.inv > 0) && Math.abs(e.x - q.x) < 9 && Math.abs((e.y - 6) - (q.y - 7)) < 11) { q.out = 180; g.fx.push({ x: q.x, y: q.y, t: 0, k: 'pig' }); au.tone(300, 0.2, { type: 'square', vol: 0.06, slideTo: 100 }); }
        }
        g.en = g.en.filter(e => !e.gone);
        // boss
        const b = g.boss;
        if (b) {
          b.t++; if (b.flash > 0) b.flash--;
          if (b.dead) { b.dead++; if (b.dead % 6 === 0) g.fx.push({ x: b.x + (Math.random() - 0.5) * 40, y: b.y + (Math.random() - 0.5) * 40, t: 0, k: 'boom' }); if (b.dead > 90) { g.boss = null; stageClear(); } }
          else {
            if (b.x > W - 40) b.x -= 0.6;
            if (Math.abs(b.y - b.ty) < 1) b.ty = LY[Math.floor(Math.random() * LANES)];
            b.y += Math.sign(b.ty - b.y) * Math.min(1 + d * 0.05, Math.abs(b.ty - b.y));
            if (--b.fireT <= 0) {
              b.fireT = Math.max(40, 90 - d * 6);
              const a = Math.atan2(p.y - 8 - (b.y - 10), p.x - (b.x - 16));
              g.eb.push({ x: b.x - 16, y: b.y - 10, vx: Math.cos(a) * 1.8, vy: Math.sin(a) * 1.8 });
              if (b.t % 3 === 0) addEn({ k: 'skull', x: b.x - 20, lane: nearestLane(b.y), vx: -1.8, hp: 1, pts: 200 });
            }
            if (p.alive && p.inv <= 0 && Math.abs(b.x - p.x) < 20 && Math.abs(b.y - 12 - p.y + 7) < 20) killPlayer();
          }
        }
        // shots
        for (const s of g.shots) {
          s.x += s.vx;
          if (s.x < -8 || s.x > W + 8) { s.dead = true; continue; }
          for (const e of g.en) {
            if (e.gone || s.dead) continue;
            if (Math.abs(e.x - s.x) < 8 && Math.abs((e.y - 6) - s.y) < 9) { s.dead = true; hitEnemy(e, s.who); }
          }
          if (b && !b.dead && !s.dead && Math.abs(b.x - s.x) < 20 && Math.abs(b.y - 12 - s.y) < 20) {
            s.dead = true; b.hp--; b.flash = 6; sfx.hit();
            if (b.hp <= 0) { b.dead = 1; addScore(5000); pop(b.x, b.y - 30, 5000, '#ffe040'); au.noise(1, { vol: 0.25, freq: 900, slideTo: 60 }); g.eb = []; }
          }
          for (const eb of g.eb) if (!s.dead && Math.abs(eb.x - s.x) < 5 && Math.abs(eb.y - s.y) < 5) { eb.dead = true; s.dead = true; }
        }
        g.shots = g.shots.filter(s => !s.dead);
        for (const eb of g.eb) {
          eb.x += eb.vx; eb.y += eb.vy;
          if (eb.x < -8 || eb.x > W + 8 || eb.y < 0 || eb.y > H) eb.dead = true;
          if (p.alive && p.inv <= 0 && Math.abs(eb.x - p.x) < 5 && Math.abs(eb.y - (p.y - 7)) < 8) { eb.dead = true; killPlayer(); }
        }
        g.eb = g.eb.filter(eb => !eb.dead);
        // fruit pickup
        for (const f of g.fruit) {
          if (f.got) continue;
          for (const c of [p, g.pig]) {
            if (f.got || (c === p && !p.alive) || (c === g.pig && g.pig.out)) continue;
            if (Math.abs(f.x - c.x) < 9 && Math.abs((LY[f.lane] - 6) - (c.y - 7)) < 10) eatFruit(f, c === p);
          }
        }
        g.fruit = g.fruit.filter(f => !f.got);
        for (const fx of g.fx) fx.t++;
        g.fx = g.fx.filter(fx => fx.t < 30);
        for (const q of g.pops) q.t--;
        g.pops = g.pops.filter(q => q.t > 0);
      }
      function nearestLane(y) { let best = 0; for (let i = 1; i < LANES; i++) if (Math.abs(LY[i] - y) < Math.abs(LY[best] - y)) best = i; return best; }
      function hitEnemy(e, who) {
        e.hp--; e.flash = 6;
        if (e.hp > 0) { sfx.hit(); return; }
        e.gone = true; sfx.kill();
        g.fx.push({ x: e.x, y: e.y - 6, t: 0, k: 'puff' });
        addScore(e.pts); pop(e.x, e.y - 16, e.pts, who === 'pig' ? '#ffa0c0' : '#ffffff');
        // some creatures leave fruit behind
        if (Math.random() < 0.25) g.fruit.push({ x: e.x, lane: Math.max(0, e.lane), kind: Math.floor(Math.random() * 5), big: false });
      }
      function eatFruit(f, byPlayer) {
        f.got = true;
        if (f.pow) {
          // POW: every creature on screen turns into fruit
          sfx.pow();
          for (const e of g.en) { e.gone = true; g.fruit.push({ x: e.x, lane: Math.max(0, e.lane), kind: Math.floor(Math.random() * 5), big: false }); g.fx.push({ x: e.x, y: e.y - 6, t: 0, k: 'puff' }); }
          g.eb = [];
          pop(f.x, LY[f.lane] - 18, 'POW', '#ffe040');
          return;
        }
        if (f.big) { addScore(1000); pop(f.x, LY[f.lane] - 18, 1000, '#ffe040'); sfx.big(); return; }
        g.chain = Math.min(g.chain + 1, 20); g.chainT = 70;
        const pts = Math.min(g.chain, 10) * 50;
        addScore(pts); pop(f.x, LY[f.lane] - 18, pts, g.chain >= 8 ? '#ffe040' : '#ffffff');
        sfx.fruit(g.chain);
        if (g.chain === 10) { addScore(1000); pop(W / 2, 40, 'CHAIN BONUS 1000', '#ffe040'); sfx.big(); }
      }
      function stageClear() {
        if (g.phase !== 'play') return;
        g.phase = 'clear'; g.phaseT = 240; sfx.clear();
        g.bonus = 1000 * (g.stage + 1); addScore(g.bonus);
      }

      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++; bgX += 0.6;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { mode = 'game'; newGame(); }
            else { coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 }); }
          }
          return;
        }
        switch (g.phase) {
          case 'ready':
            bgX += 0.3;
            stepJump(g.p); stepJump(g.pig);
            if (--g.phaseT <= 0) g.phase = 'play';
            break;
          case 'play':
            updPlayer(); updPig(); updWorld();
            break;
          case 'dead': {
            const p = g.p; p.vy += 0.2; p.y += p.vy;
            for (const fx of g.fx) fx.t++;
            if (--g.phaseT <= 0) {
              if (g.lives > 1) { g.lives--; g.en = []; g.eb = []; g.shots = []; resetPlayers(); g.phase = 'ready'; g.phaseT = 90; if (g.boss) g.boss.fireT = 120; }
              else {
                g.phase = 'wait';
                const cg = g;
                if (api.offerContinue) api.offerContinue(() => { if (g === cg) { g.lives = 3; g.en = []; g.eb = []; resetPlayers(); g.phase = 'ready'; g.phaseT = 90; } }, () => { if (g === cg) gameOver(); });
                else gameOver();
              }
            }
            break;
          }
          case 'clear':
            bgX += 0.6; stepJump(g.p);
            for (const q of g.pops) q.t--;
            g.pops = g.pops.filter(q => q.t > 0);
            if (--g.phaseT <= 0) {
              g.stage++;
              if (g.stage >= STAGE_COUNT) { g.phase = 'india'; g.phaseT = 420; sfx.start(); }
              else startStage();
            }
            break;
          case 'india':
            bgX += 0.3;
            if (--g.phaseT <= 0) { g.stage = 0; g.loop = (g.loop || 0) + 1; addScore(50000); startStage(); }
            break;
          case 'over':
            if (--g.phaseT <= 0 || (g.phaseT < 200 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; }
            break;
        }
      }
      function gameOver() { g.phase = 'over'; g.phaseT = 300; au.melody([[523, .2], [494, .2], [466, .2], [440, .5]], { type: 'square', vol: 0.12 }); }

      // ================= Drawing =================
      function R(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
      function drawMonkey(ctx, x, y, dir, step, fire) {
        x = Math.round(x); y = Math.round(y);
        const fur = '#c87830', face = '#f8d0a0';
        // legs
        const s = step & 1;
        R(ctx, x - 4, y - 4, 3, 4 - s, fur); R(ctx, x + 1, y - 4, 3, 3 + s, fur);
        // body with red vest
        R(ctx, x - 4, y - 10, 8, 6, '#e02020'); R(ctx, x - 1, y - 10, 2, 6, '#ffe040');
        // head
        R(ctx, x - 5, y - 17, 10, 7, fur); R(ctx, x - 3 + dir, y - 15, 6, 5, face);
        R(ctx, x + dir * 2 - 1, y - 14, 1, 1, '#000'); R(ctx, x + dir * 2 + 1 * dir, y - 14, 1, 1, '#000');
        R(ctx, x - 5, y - 18, 10, 2, '#ffd040'); // golden circlet
        R(ctx, x - 6 - (dir > 0 ? 0 : -11), y - 15, 2, 3, fur);
        // tail
        R(ctx, x - dir * 6 - 1, y - 7, 2, 2, fur); R(ctx, x - dir * 8 - 1, y - 9, 2, 3, fur);
        // staff
        if (fire) R(ctx, x + dir * 3 - (dir < 0 ? 8 : 0), y - 9, 9, 2, '#ff6020');
        else R(ctx, x + dir * 4, y - 15, 2, 12, '#ff6020');
      }
      function drawPig(ctx, x, y, dir, step) {
        x = Math.round(x); y = Math.round(y);
        const pink = '#ff98b8', dk = '#d06888';
        const s = step & 1;
        R(ctx, x - 4, y - 4, 3, 4 - s, dk); R(ctx, x + 1, y - 4, 3, 3 + s, dk);
        R(ctx, x - 6, y - 12, 12, 9, pink); R(ctx, x - 6, y - 7, 12, 2, '#4060d0');
        R(ctx, x - 5, y - 18, 10, 7, pink);
        R(ctx, x + dir * 4 - 2, y - 15, 4, 3, dk); R(ctx, x + dir * 4 - 1, y - 14, 1, 1, '#000'); R(ctx, x + dir * 4 + 1, y - 14, 1, 1, '#000');
        R(ctx, x + dir * 1 - 1, y - 16, 1, 1, '#000');
        R(ctx, x - 5, y - 20, 3, 3, dk); R(ctx, x + 2, y - 20, 3, 3, dk);
        R(ctx, x - dir * 8 - 1, y - 18, 3, 12, '#c0c0c0');
      }
      function drawFruit(ctx, f) {
        const x = Math.round(f.x), y = f.y != null ? f.y : LY[f.lane] - 7;
        if (f.pow) {
          R(ctx, x - 7, y - 5, 14, 10, (frame >> 2) & 1 ? '#ff3030' : '#ffe040');
          text(ctx, 'POW', x + 1, y - 3, '#ffffff', { center: true });
          return;
        }
        const F = FRUITS[f.kind];
        if (f.big) {
          ctx.fillStyle = F.c2; ctx.beginPath(); ctx.ellipse(x, y - 2, 9, 7, 0, 0, 7); ctx.fill();
          ctx.fillStyle = F.c1; for (let i = -6; i <= 6; i += 4) ctx.fillRect(x + i, y - 8, 1, 12);
          R(ctx, x - 1, y - 11, 2, 3, F.leaf);
          return;
        }
        if (F.name === 'cherry') { ctx.fillStyle = F.c1; ctx.beginPath(); ctx.arc(x - 3, y + 2, 3, 0, 7); ctx.arc(x + 3, y + 2, 3, 0, 7); ctx.fill(); R(ctx, x - 3, y - 5, 1, 5, F.leaf); R(ctx, x + 2, y - 5, 1, 5, F.leaf); R(ctx, x - 3, y - 5, 6, 1, F.leaf); }
        else if (F.name === 'banana') { R(ctx, x - 5, y, 10, 3, F.c1); R(ctx, x - 6, y - 2, 3, 3, F.c1); R(ctx, x + 3, y - 3, 3, 3, F.c1); R(ctx, x - 4, y + 2, 8, 1, F.c2); }
        else if (F.name === 'grape') { ctx.fillStyle = F.c1; for (const [dx, dy] of [[-3, -2], [0, -2], [3, -2], [-2, 1], [2, 1], [0, 4]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, 2, 0, 7); ctx.fill(); } R(ctx, x, y - 6, 1, 3, F.leaf); }
        else { ctx.fillStyle = F.c1; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); R(ctx, x - 2, y - 3, 2, 2, '#ffffff'); R(ctx, x - 1, y - 7, 3, 2, F.leaf); if (F.name === 'strawberry') { R(ctx, x - 2, y, 1, 1, '#ffe040'); R(ctx, x + 2, y + 2, 1, 1, '#ffe040'); } }
      }
      function drawEnemy(ctx, e) {
        const x = Math.round(e.x), y = Math.round(e.y), fl = e.flash > 0 && (e.flash & 2);
        switch (e.k) {
          case 'imp': {
            const c = fl ? '#fff' : '#30a0e0', s = (e.t >> 3) & 1;
            R(ctx, x - 4, y - 4, 3, 4 - s, '#2060a0'); R(ctx, x + 1, y - 4, 3, 3 + s, '#2060a0');
            R(ctx, x - 5, y - 13, 10, 10, c); R(ctx, x - 4, y - 16, 2, 3, '#ffffff'); R(ctx, x + 2, y - 16, 2, 3, '#ffffff');
            R(ctx, x - 3, y - 11, 2, 2, '#ffe040'); R(ctx, x + 1, y - 11, 2, 2, '#ffe040'); R(ctx, x - 2, y - 7, 4, 1, '#c01010');
            R(ctx, x - 9, y - 12, 4, 2, c);
            break;
          }
          case 'bat': {
            const c = fl ? '#fff' : '#8040a0', wf = (e.t >> 2) & 1;
            R(ctx, x - 3, y - 4, 6, 6, c); R(ctx, x - 10, y - (wf ? 7 : 1), 7, 3, c); R(ctx, x + 3, y - (wf ? 7 : 1), 7, 3, c);
            R(ctx, x - 2, y - 2, 1, 1, '#ff3030'); R(ctx, x + 1, y - 2, 1, 1, '#ff3030');
            break;
          }
          case 'skull': {
            const c = fl ? '#fff' : '#f0f0e0', r = (e.t >> 2) & 3;
            ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y - 6, 6, 0, 7); ctx.fill();
            const ex = [[-3, -1], [-1, -3], [1, -1], [-1, 1]][r];
            R(ctx, x + ex[0] - 1, y - 7 + ex[1], 2, 2, '#000'); R(ctx, x + ex[0] + 2, y - 7 + ex[1], 2, 2, '#000');
            break;
          }
          case 'statue': {
            const c = fl ? '#fff' : '#a09080';
            R(ctx, x - 7, y - 22, 14, 22, c); R(ctx, x - 8, y - 24, 16, 4, '#807060');
            R(ctx, x - 5, y - 18, 3, 3, '#ff3030'); R(ctx, x + 2, y - 18, 3, 3, '#ff3030'); R(ctx, x - 4, y - 11, 8, 3, '#504030');
            R(ctx, x - 7, y - 2, 14, 2, '#605040');
            break;
          }
          case 'bird': {
            const c = fl ? '#fff' : '#e0c020', wf = (e.t >> 2) & 1;
            R(ctx, x - 4, y - 3, 9, 5, c); R(ctx, x - 7, y - 4, 3, 3, '#ff6020');
            R(ctx, x - 2, y - (wf ? 9 : -1), 6, 4, c); R(ctx, x - 6, y - 3, 1, 1, '#000');
            break;
          }
        }
      }
      function drawBoss(ctx, b) {
        if (b.dead && (b.dead & 4)) return;
        const x = Math.round(b.x), y = Math.round(b.y), fl = b.flash > 0;
        const c = fl ? '#ffffff' : '#c03030';
        R(ctx, x - 20, y - 34, 40, 34, c);
        R(ctx, x - 22, y - 40, 6, 10, '#f0e0a0'); R(ctx, x + 16, y - 40, 6, 10, '#f0e0a0');
        R(ctx, x - 14, y - 28, 8, 6, '#ffffff'); R(ctx, x - 12, y - 26, 4, 4, '#000'); R(ctx, x + 2, y - 28, 8, 6, '#ffffff'); R(ctx, x + 4, y - 26, 4, 4, '#000');
        R(ctx, x - 16, y - 14, 26, 8, '#400000');
        for (let i = 0; i < 4; i++) R(ctx, x - 14 + i * 6, y - 14, 3, 3, '#ffffff');
        R(ctx, x - 24, y - 6, 48, 6, '#2050c0');
        R(ctx, x - 50, y - 42, 100, 4, '#000'); R(ctx, x - 49, y - 41, Math.max(0, 98 * b.hp / b.max), 2, '#ff4040');
      }
      function drawScenery(ctx) {
        const sky = SKIES[(g ? g.stage : 0) % SKIES.length];
        R(ctx, 0, 0, W, H, sky[0]);
        R(ctx, 0, 110, W, H - 110, sky[1]);
        // far mountains / pagodas
        for (let i = -1; i < 8; i++) {
          const px = bgX * 0.25, base = Math.floor(px / 48), idx = base + i, x = i * 48 - (px % 48);
          const h = 30 + hash(idx * 7) * 50;
          ctx.fillStyle = 'rgba(40,60,90,0.35)';
          ctx.beginPath(); ctx.moveTo(x - 10, 200); ctx.lineTo(x + 24, 200 - h); ctx.lineTo(x + 58, 200); ctx.fill();
          if (hash(idx * 13) > 0.7) {
            ctx.fillStyle = 'rgba(120,30,30,0.5)';
            for (let k = 0; k < 4; k++) { ctx.fillRect(x + 14 + k, 180 - h * 0.6 - k * 12, 20 - k * 2, 3); ctx.fillRect(x + 18 + k, 183 - h * 0.6 - k * 12, 12 - k * 2, 9); }
          }
        }
        // clouds
        for (let i = -1; i < 5; i++) {
          const px = bgX * 0.5, base = Math.floor(px / 80), idx = base + i, x = i * 80 - (px % 80), y = 30 + hash(idx * 3) * 140;
          if (hash(idx * 5) < 0.5) continue;
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.beginPath(); ctx.ellipse(x + 20, y, 18, 5, 0, 0, 7); ctx.ellipse(x + 30, y - 4, 10, 5, 0, 0, 7); ctx.fill();
        }
      }
      function drawLanes(ctx) {
        const off = Math.floor(bgX) % 8;
        for (let i = 0; i < LANES; i++) {
          const y = LY[i];
          for (let x = -off; x < W; x += 8) { R(ctx, x, y, 6, 3, '#40a040'); R(ctx, x, y, 6, 1, '#80e060'); R(ctx, x + 6, y + 1, 2, 1, '#206020'); }
        }
      }
      function hud(ctx) {
        R(ctx, 0, 0, W, 26, '#000');
        text(ctx, '1UP', 8, 2, '#ff4040'); text(ctx, String(g ? g.score : 0).padStart(7, ' '), 4, 11, '#ffffff');
        text(ctx, 'HI', W / 2 - 30, 2, '#ff4040'); text(ctx, String(hi).padStart(7, ' '), W / 2 - 40, 11, '#ffffff');
        if (g && g.phase !== undefined) {
          // journey meter: stage progress toward India
          const tot = STAGE_COUNT;
          const prog = Math.min(1, (g.stage + Math.min(1, g.dist / g.len)) / tot);
          text(ctx, 'INDIA', W - 4, 2, '#ffe040', { right: true });
          R(ctx, W - 84, 13, 80, 4, '#404040'); R(ctx, W - 84, 13, Math.round(80 * prog), 4, '#ffd040');
          R(ctx, W - 84 + Math.round(80 * prog) - 2, 11, 4, 8, '#e02020');
          if (g.chain > 1) text(ctx, 'x' + g.chain, W / 2 + 34, 11, '#ffe040');
        }
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        drawScenery(ctx);
        drawLanes(ctx);
        if (mode === 'title') { renderTitle(ctx); return; }
        for (const f of g.fruit) drawFruit(ctx, f);
        for (const e of g.en) drawEnemy(ctx, e);
        if (g.boss) drawBoss(ctx, g.boss);
        const q = g.pig;
        if (!q.out && !(q.inv > 0 && (frame & 4))) drawPig(ctx, q.x, q.y, q.dir, q.step);
        const p = g.p;
        if (p.alive) { if (!(p.inv > 0 && (frame & 4))) drawMonkey(ctx, p.x, p.y, p.dir, p.step, p.cool > 8); }
        else if (g.phase === 'dead') {
          ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y) - 8); ctx.rotate(frame * 0.3); drawMonkey(ctx, 0, 8, 1, 0, false); ctx.restore();
        }
        for (const s of g.shots) {
          const x = Math.round(s.x), y = Math.round(s.y);
          R(ctx, x - 3, y - 2, 6, 4, s.who === 'pig' ? '#ffa0c0' : ((frame >> 1) & 1 ? '#ffffff' : '#ffe040'));
          R(ctx, x - 3 - Math.sign(s.vx) * 4, y - 1, 4, 2, 'rgba(255,255,255,0.5)');
        }
        for (const eb of g.eb) { R(ctx, eb.x - 2, eb.y - 2, 5, 5, (frame >> 1) & 1 ? '#ff4040' : '#ffe040'); }
        for (const fx of g.fx) {
          if (fx.k === 'pig') { R(ctx, fx.x - 4, fx.y - 20 - fx.t, 8, 6, '#ff98b8'); continue; }
          const r = fx.k === 'boom' ? 5 + fx.t * 0.6 : 2 + fx.t * 0.4;
          ctx.fillStyle = fx.t < 8 ? '#ffffff' : fx.t < 18 ? '#ffe040' : '#ff8020';
          for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; ctx.fillRect(Math.round(fx.x + Math.cos(a) * r), Math.round(fx.y + Math.sin(a) * r), 2, 2); }
        }
        for (const q2 of g.pops) text(ctx, q2.n, q2.x, Math.round(q2.y - (50 - q2.t) * 0.3), q2.col, { center: true });
        hud(ctx);
        for (let i = 0; i < Math.min(6, g.lives - 1); i++) { R(ctx, 4 + i * 10, H - 9, 7, 6, '#c87830'); R(ctx, 4 + i * 10, H - 10, 7, 2, '#ffd040'); }
        text(ctx, 'STAGE ' + (g.stage + 1), W - 4, H - 9, '#ffffff', { right: true });
        if (g.phase === 'ready') {
          R(ctx, 48, 92, W - 96, 36, 'rgba(0,0,0,0.6)');
          text(ctx, 'STAGE ' + (g.stage + 1), W / 2, 98, '#ffffff', { center: true });
          text(ctx, PLACES[g.stage % PLACES.length], W / 2, 112, '#ffe040', { center: true });
        }
        if (g.phase === 'clear') {
          R(ctx, 40, 86, W - 80, 48, 'rgba(0,0,0,0.6)');
          text(ctx, 'STAGE ' + (g.stage + 1) + ' CLEAR', W / 2, 94, '#ffe040', { center: true });
          text(ctx, 'BONUS ' + g.bonus, W / 2, 110, '#ffffff', { center: true });
          text(ctx, (STAGE_COUNT - g.stage - 1) + ' STAGES TO INDIA', W / 2, 122, '#a0e0ff', { center: true });
        }
        if (g.phase === 'india') {
          R(ctx, 20, 70, W - 40, 80, 'rgba(0,0,0,0.7)');
          text(ctx, 'YOU HAVE ARRIVED', W / 2, 80, '#ffffff', { center: true });
          text(ctx, 'IN INDIA!', W / 2, 94, '#ffe040', { center: true, scale: 2 });
          text(ctx, 'BONUS 50000', W / 2, 120, '#40ff40', { center: true });
          text(ctx, 'THE JOURNEY CONTINUES...', W / 2, 134, '#a0e0ff', { center: true });
        }
        if (g.phase === 'over') { R(ctx, 64, 100, W - 128, 26, 'rgba(0,0,0,0.7)'); text(ctx, 'GAME OVER', W / 2, 109, '#ff3030', { center: true }); }
      }
      function renderTitle(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H);
        hud(ctx);
        const ly = 40;
        text(ctx, 'SONSON', W / 2 + 3, ly + 3, '#600000', { center: true, scale: 4 });
        text(ctx, 'SONSON', W / 2, ly, '#ffd020', { center: true, scale: 4 });
        R(ctx, 40, ly + 32, W - 80, 2, '#e02020');
        drawMonkey(ctx, W / 2 - 16, 100, 1, (frame >> 3), false);
        drawPig(ctx, W / 2 + 16, 100, -1, (frame >> 3));
        const page = (titleT / 400 | 0) % 2;
        if (page === 0) {
          text(ctx, 'JOURNEY TO THE WEST', W / 2, 110, '#ffffff', { center: true });
          text(ctx, 'UP/DOWN: CHANGE LANE', W / 2, 126, '#a0e0ff', { center: true });
          text(ctx, 'EAT FRUIT IN A ROW', W / 2, 140, '#ffff60', { center: true });
          text(ctx, 'FOR CHAIN BONUSES', W / 2, 150, '#ffff60', { center: true });
        } else {
          text(ctx, '- FRUIT CHAIN -', W / 2, 110, '#ffff60', { center: true });
          for (let i = 0; i < 5; i++) { drawFruit(ctx, { x: 46 + i * 40, y: 124, lane: 0, kind: i }); }
          text(ctx, '50 100 150 ... 500', W / 2, 136, '#ffffff', { center: true });
          text(ctx, '10 IN A ROW: 1000 BONUS', W / 2, 148, '#ffe040', { center: true });
        }
        if (api.credits === 0 || coinFlash > 0) { if (coinFlash > 0 ? (coinFlash >> 2) & 1 : (frame >> 5) & 1) text(ctx, 'INSERT COIN', W / 2, 172, '#ff3030', { center: true }); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START BUTTON', W / 2, 172, '#ffffff', { center: true });
        text(ctx, '\u00a9 CAPCOM 1984', W / 2, 190, '#ffffff', { center: true });
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 9, '#ffffff');
      }
      return { update, render, destroy() { } };
    }
  });
})();
