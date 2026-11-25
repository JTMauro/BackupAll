// Rastan (Taito, 1987) - from-scratch recreation. Barbarian side-scroller: swords, ropes, weapons, armour and round bosses.
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
  function spr(rows, pal, flip) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(flip ? w - 1 - i : i, y, 1, 1); } } });
    return c;
  }
  function pair(rows, pal) { return [spr(rows, pal, false), spr(rows, pal, true)]; }
  function tileCanvas(fn) { const c = document.createElement('canvas'); c.width = 16; c.height = 16; fn(c.getContext('2d')); return c; }

  const W = 256, H = 224, TS = 16, NR = 14;
  const GRAV = 0.28;
  const EMPTY = 0, GROUND = 1, BRICK = 2, PLAT = 3, LAVA = 4, SPIKE = 5;

  // ---------- Rastan sprite (faces right) ----------
  const PAL = { h: '#5a2c0c', s: '#e8a060', d: '#a86030', b: '#c02818', g: '#6a3a10', m: '#d0d0e0', w: '#ffffff', y: '#f0c020' };
  const UP = [
    '...hhhhh....', '..hhhhhhh...', '..hhhsssh...', '..hhssws....', '...hssss....', '....dss.....',
    '..ddsssdd...', '.dsssssssd..', '.ssssssssss.', '.ss.ssss.ss.', '.ss.ssss.ss.', '.ss.dssd.ss.',
    '.d..ssss..d.', '....yyyy....', '....bbbb....', '...bbbbbb...'];
  const LEGS = {
    stand: ['...ss..ss...', '...ss..ss...', '...ss..ss...', '...ss..ss...', '...gg..gg...', '...gg..gg...', '..ggg..ggg..'],
    w1: ['...ss...ss..', '..ss....ss..', '..ss.....ss.', '.ss......ss.', '.gg......gg.', '.gg......gg.', 'ggg.....ggg.'],
    w2: ['....ss.ss...', '....ss.ss...', '....ss.ss...', '....sssss...', '....gg.gg...', '....gg.gg...', '...ggggggg..'],
    jump: ['..ssssss....', '..ss..sss...', '..ss...ss...', '.ggg...ss...', '.gg...ggg...', '......gg....', '............']
  };
  const CROUCH = [
    '............', '............', '............', '............', '............', '............', '...hhhhh....', '..hhhhhhh...', '..hhhsssh...', '..hhssws....', '...hssss....',
    '..ddsssdd...', '.dsssssssd..', '.ssssssssss.', '.ss.ssss.ss.', '.d..yyyy..d.', '...bbbbbb...', '..sssss.ss..', '.sss...sss..', '.gg.....gg..', 'ggg.....ggg.', '............', '............'];
  const CLIMB = [
    '.s........s.', '.ss......ss.', '..s.hhhh.s..', '..shhhhhhs..', '..shhhhhhs..', '..shhhhhhs..', '..dshhhhsd..', '...ssssss...', '...ssssss...', '...ssssss...', '....ssss....', '....ssss....',
    '....yyyy....', '....bbbb....', '...bbbbbb...', '...ss..ss...', '...ss..ss...', '...ss...ss..', '...ss...ss..', '...gg...gg..', '...gg...gg..', '..ggg...ggg.', '............'];
  const SPR = {
    stand: pair(UP.concat(LEGS.stand), PAL), w1: pair(UP.concat(LEGS.w1), PAL), w2: pair(UP.concat(LEGS.w2), PAL),
    jump: pair(UP.concat(LEGS.jump), PAL), crouch: pair(CROUCH, PAL), climb: pair(CLIMB, PAL)
  };

  // ---------- tiles ----------
  const TILE = {};
  TILE.grass = tileCanvas(x => { x.fillStyle = '#8a5a2a'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#6a4018'; for (let i = 0; i < 6; i++) x.fillRect((i * 7) % 16, 6 + (i * 5) % 9, 3, 2); x.fillStyle = '#30a030'; x.fillRect(0, 0, 16, 4); x.fillStyle = '#50d040'; x.fillRect(0, 0, 16, 1); for (let i = 0; i < 16; i += 3) x.fillRect(i, 4, 1, 2); });
  TILE.dirt = tileCanvas(x => { x.fillStyle = '#8a5a2a'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#6a4018'; for (let i = 0; i < 7; i++) x.fillRect((i * 9) % 16, (i * 5) % 16, 3, 2); x.fillStyle = '#a07040'; x.fillRect(3, 9, 2, 1); });
  TILE.brick = tileCanvas(x => { x.fillStyle = '#6a6070'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#3a3040'; x.fillRect(0, 7, 16, 1); x.fillRect(0, 15, 16, 1); x.fillRect(7, 0, 1, 7); x.fillRect(3, 8, 1, 7); x.fillRect(12, 8, 1, 7); x.fillStyle = '#9088a0'; x.fillRect(0, 0, 7, 1); x.fillRect(8, 0, 8, 1); x.fillRect(4, 8, 8, 1); });
  TILE.brickTop = tileCanvas(x => { x.drawImage(TILE.brick, 0, 0); x.fillStyle = '#b0a8c0'; x.fillRect(0, 0, 16, 2); });
  TILE.plat = tileCanvas(x => { x.fillStyle = '#7a6a50'; x.fillRect(0, 0, 16, 6); x.fillStyle = '#b0a080'; x.fillRect(0, 0, 16, 1); x.fillStyle = '#4a3a20'; x.fillRect(0, 5, 16, 1); x.fillRect(7, 0, 1, 6); x.fillStyle = '#5a4a30'; x.fillRect(2, 6, 2, 3); x.fillRect(12, 6, 2, 3); });
  TILE.spike = tileCanvas(x => { x.fillStyle = '#c0c0d0'; for (let i = 0; i < 4; i++) { for (let k = 0; k < 8; k++) x.fillRect(i * 4 + 1 + (k >> 2), 8 + k, 2 - (k >> 3), 1); x.fillRect(i * 4 + 1, 8, 2, 8); x.fillStyle = '#ffffff'; x.fillRect(i * 4 + 1, 7, 1, 2); x.fillStyle = '#c0c0d0'; } x.fillStyle = '#707080'; x.fillRect(0, 14, 16, 2); });

  ArcadeRegistry.register({
    id: 'rastan', title: 'Rastan', year: 1987, maker: 'Taito',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: walk / climb ropes / crouch \u00b7 Space: sword (Up = overhead, Down in air = stab) \u00b7 X: jump \u00b7 Enter: start',
    marquee: { bg: '#200800', fg: '#f0c020', accent: '#c02818' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(50000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0;
      let g = null;
      let NC = 200, tiles = new Uint8Array(NR * NC), ropes = [];

      function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
      const tAt = (c, r) => (c < 0 || c >= NC) ? BRICK : (r < 0 || r >= NR) ? EMPTY : tiles[r * NC + c];
      const solidT = t => t === GROUND || t === BRICK;
      function solidPt(x, y) { return solidT(tAt(Math.floor(x / TS), Math.floor(y / TS))); }
      function platPt(x, y) { return tAt(Math.floor(x / TS), Math.floor(y / TS)) === PLAT; }

      // ---------- level generation ----------
      function genLevel(round) {
        const r = rng(round * 9973 + 17);
        NC = 190 + Math.min(60, round * 10);
        tiles = new Uint8Array(NR * NC); ropes = [];
        const spawns = [], items = [];
        const castleFrom = Math.floor(NC * 0.55);
        const setT = (c, rr, t) => { if (c >= 0 && c < NC && rr >= 0 && rr < NR) tiles[rr * NC + c] = t; };
        const column = (c, h) => { const castle = c >= castleFrom; for (let rr = h; rr < NR; rr++) setT(c, rr, castle ? BRICK : GROUND); };
        let h = 11, x = 0;
        for (; x < 14; x++) column(x, h);
        const arena = NC - 17;
        while (x < arena - 2) {
          const castle = x >= castleFrom;
          const k = r();
          if (k < 0.25) { // flat
            const len = 5 + (r() * 6 | 0);
            for (let i = 0; i < len; i++) column(x + i, h);
            spawns.push({ x: (x + len / 2) * TS, kind: castle ? (r() < .5 ? 'skeleton' : 'soldier') : (r() < .6 ? 'soldier' : 'bat') });
            if (castle && r() < .5) { setT(x + 2, h - 1, SPIKE); setT(x + 3, h - 1, SPIKE); }
            x += len;
          } else if (k < 0.42) { // step up or down
            h = Math.max(8, Math.min(12, h + (r() < .5 ? -1 : 1) * (1 + (r() * 2 | 0))));
            const len = 4 + (r() * 5 | 0);
            for (let i = 0; i < len; i++) column(x + i, h);
            x += len;
          } else if (k < 0.62) { // pit (lava in the castle)
            const gap = 2 + (r() * Math.min(2, 1 + round * 0.5) | 0);
            for (let i = 0; i < gap; i++) { if (castle || r() < .4) setT(x + i, NR - 1, LAVA); }
            if (gap >= 3) { setT(x + 1, h - 2, PLAT); setT(x + 2, h - 2, PLAT); }
            spawns.push({ x: (x + gap / 2) * TS, kind: castle ? 'bat' : 'harpy', fly: true });
            x += gap;
            for (let i = 0; i < 2; i++) column(x + i, h);
            x += 2;
          } else if (k < 0.85) { // tower: platform with rope + item
            const len = 8;
            for (let i = 0; i < len; i++) column(x + i, h);
            const pr = h - 5;
            for (let i = 2; i < 7; i++) setT(x + i, pr, PLAT);
            ropes.push({ c: x + 2, r0: pr + 1, r1: h - 1 });
            items.push({ x: (x + 5) * TS + 8, y: pr * TS, kind: pickItem(r, round) });
            spawns.push({ x: (x + 5) * TS, kind: castle ? 'skeleton' : 'soldier', y: pr * TS });
            x += len;
          } else { // high ledge with a rope
            const len = 6;
            for (let i = 0; i < len; i++) column(x + i, h);
            const top = Math.max(5, h - 3);
            for (let i = 0; i < 4; i++) column(x + len + i, top);
            ropes.push({ c: x + len - 1, r0: top - 2, r1: h - 1 });
            setT(x + len - 1, top - 3, PLAT); setT(x + len - 2, top - 3, PLAT);
            spawns.push({ x: (x + len + 2) * TS, kind: 'bat', fly: true });
            x += len + 4; h = top;
            // and down again
            if (h < 9) { h = 9; }
          }
        }
        for (; x < NC; x++) column(x, 11);
        for (let rr = 0; rr < NR; rr++) setT(NC - 1, rr, BRICK);
        // guarantee a jumpable start for every step (max 3 tiles up)
        let prev = -1;
        for (let c = 0; c < NC - 1; c++) {
          let top = NR; for (let rr = 0; rr < NR; rr++) if (solidT(tiles[rr * NC + c])) { top = rr; break; }
          if (top < NR && prev >= 0 && prev - top > 3) {
            // insert a step platform
            setT(c - 1, prev - 2, PLAT);
          }
          if (top < NR) prev = top;
        }
        return { spawns, items, castleFrom, arena };
      }
      function pickItem(r, round) {
        const k = r();
        if (k < 0.16) return 'axe'; if (k < 0.30) return 'mace'; if (k < 0.42) return 'fire';
        if (k < 0.54) return 'shield'; if (k < 0.64) return 'armor'; if (k < 0.82) return 'potion';
        if (k < 0.92) return 'jewel'; return 'ring';
      }

      // ---------- game ----------
      function newGame() {
        g = { score: 0, lives: 3, round: 1, nextLife: 50000 };
        startRound();
      }
      function startRound() {
        const L = genLevel(g.round);
        g.L = L;
        g.spawns = L.spawns.map(s => Object.assign({ done: false }, s));
        g.items = L.items.map(i => Object.assign({ vy: 0, t: 0 }, i));
        g.enemies = []; g.shots = []; g.eshots = []; g.parts = []; g.pops = [];
        g.p = { x: 40, y: 11 * TS, vx: 0, vy: 0, face: 0, onGround: false, rope: null, crouch: false, atk: 0, atkKind: 'side', hp: 32, inv: 0, walk: 0, weapon: 'sword', wT: 0, guard: null, gT: 0, dead: 0, checkX: 40, checkY: 11 * TS, kb: 0 };
        g.camX = 0; g.boss = null; g.bossLock = false;
        g.phase = 'ready'; g.phaseT = 150;
        au.melody([[294, .15], [440, .15], [392, .1], [440, .1], [523, .3], [440, .15], [587, .45]], { type: 'square', vol: .12 });
      }
      function addScore(n, x, y) {
        g.score += n;
        if (g.score >= g.nextLife) { g.lives++; g.nextLife += 50000; au.melody([[784, .08], [988, .08], [1175, .16]], { type: 'square', vol: .14 }); }
        if (g.score > hi) hi = g.score;
        if (x != null) g.pops.push({ x, y, s: String(n), t: 50 });
      }
      function sparks(x, y, col, n) { for (let i = 0; i < (n || 8); i++) g.parts.push({ x, y, vx: (Math.random() - .5) * 3, vy: -Math.random() * 3, t: 20 + Math.random() * 15, col }); }

      // ---------- physics ----------
      function phys(e, hw, hh, drop) {
        e.hitWall = false;
        let nx = e.x + e.vx;
        if (e.vx) {
          const edge = nx + Math.sign(e.vx) * hw;
          let hit = false;
          for (let yy = e.y - hh + 1; yy < e.y; yy += 7) if (solidPt(edge, yy)) hit = true;
          if (solidPt(edge, e.y - 1)) hit = true;
          if (hit) { nx = e.vx > 0 ? Math.floor(edge / TS) * TS - hw - 0.01 : (Math.floor(edge / TS) + 1) * TS + hw + 0.01; e.hitWall = true; }
        }
        e.x = nx;
        e.vy = Math.min(e.vy + GRAV, 6);
        let ny = e.y + e.vy;
        e.onGround = false;
        if (e.vy > 0) {
          for (const xx of [e.x - hw + 1, e.x + hw - 1]) {
            const top = Math.floor(ny / TS) * TS;
            if (solidPt(xx, ny) || (!drop && platPt(xx, ny) && e.y <= top + 0.5)) { ny = top; e.vy = 0; e.onGround = true; break; }
          }
        } else if (e.vy < 0) {
          for (const xx of [e.x - hw + 1, e.x + hw - 1]) if (solidPt(xx, ny - hh)) { ny = (Math.floor((ny - hh) / TS) + 1) * TS + hh; e.vy = 0; break; }
        }
        e.y = ny;
      }
      function groundAhead(e, dir) {
        const x = e.x + dir * 10;
        return solidPt(x, e.y + 2) || platPt(x, e.y + 2);
      }

      // ---------- weapons ----------
      const WEAP = {
        sword: { reach: 22, dmg: 1, col: '#e0e0f0', len: 18, speed: 14 },
        axe: { reach: 24, dmg: 2, col: '#c0c0c0', len: 18, speed: 16 },
        mace: { reach: 36, dmg: 2, col: '#a0a0a0', len: 30, speed: 20 },
        fire: { reach: 26, dmg: 2, col: '#ff8020', len: 20, speed: 14 }
      };
      function attackBox() {
        const p = g.p, w = WEAP[p.weapon], f = p.face ? -1 : 1;
        if (p.atkKind === 'up') return { x: p.x - 14, y: p.y - 26 - w.reach + 6, w: 28, h: w.reach };
        if (p.atkKind === 'down') return { x: p.x - 6, y: p.y - 4, w: 12, h: w.reach };
        const top = p.crouch ? p.y - 14 : p.y - 24;
        return f > 0 ? { x: p.x + 2, y: top, w: w.reach, h: 16 } : { x: p.x - 2 - w.reach, y: top, w: w.reach, h: 16 };
      }
      const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

      function hurtPlayer(n, fromX) {
        const p = g.p; if (p.inv > 0 || p.dead) return;
        if (p.guard === 'shield') n = Math.ceil(n / 2);
        if (p.guard === 'armor') n = Math.ceil(n / 4);
        p.hp -= n; p.inv = 60;
        if (!p.rope) { p.vx = (p.x < fromX ? -1 : 1) * 2; p.vy = -2.5; p.kb = 14; }
        au.tone(180, .15, { type: 'sawtooth', vol: .14, slideTo: 90 });
        if (p.hp <= 0) killPlayer();
      }
      function killPlayer() {
        const p = g.p; if (p.dead) return;
        p.hp = 0; p.dead = 1; p.rope = null; g.phase = 'dying'; g.phaseT = 120; p.vy = -4; p.vx = 0;
        au.melody([[440, .12], [415, .12], [392, .12], [370, .12], [349, .5]], { type: 'square', vol: .14 });
      }
      function respawn() {
        g.lives--;
        if (g.lives <= 0) { lastLife(); return; }
        doRespawn();
      }
      function doRespawn() {
        const p = g.p;
        p.dead = 0; p.hp = 32; p.inv = 120; p.x = p.checkX; p.y = p.checkY; p.vx = 0; p.vy = 0; p.rope = null; p.atk = 0; p.weapon = 'sword'; p.guard = null;
        g.eshots = [];
        for (const e of g.enemies) if (Math.abs(e.x - p.x) < 60 && !e.boss) e.dead = 1;
        g.phase = 'play';
      }
      function lastLife() {
        g.phase = 'wait';
        const cg = g;
        if (!api.offerContinue) { gameOver(); return; }
        api.offerContinue(() => { if (g === cg) { g.lives = 3; g.score = 0; doRespawn(); } }, () => { if (g === cg) gameOver(); });
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 320;
        au.melody([[294, .3], [277, .3], [262, .3], [220, .8]], { type: 'triangle', vol: .18 });
      }

      // ---------- player update ----------
      function updatePlayer() {
        const p = g.p;
        if (p.inv > 0) p.inv--;
        if (p.wT > 0 && --p.wT <= 0) { p.weapon = 'sword'; au.tone(300, .2, { type: 'triangle', vol: .1, slideTo: 150 }); }
        if (p.gT > 0 && --p.gT <= 0) p.guard = null;
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown');
        const jumpP = api.pressed('KeyX') || api.pressed('KeyZ'), atkP = api.pressed('Space');
        const w = WEAP[p.weapon];
        if (p.atk > 0) {
          p.atk--;
          const ph = w.speed - p.atk;
          if (ph >= 3 && ph <= w.speed - 3) doHits();
        }
        if (p.rope) {
          const rp = p.rope, rx = rp.c * TS + 8, ytop = rp.r0 * TS, ybot = (rp.r1 + 1) * TS;
          p.x = rx; p.vx = 0; p.vy = 0;
          if (L) p.face = 1; if (R) p.face = 0;
          if (!p.atk) {
            if (U) { p.y -= 1.2; p.walk++; }
            if (D) { p.y += 1.4; p.walk++; }
          }
          if (p.y <= ytop + 1) {
            // climb onto the ledge above
            if (platPt(rx, ytop - 8) || solidPt(rx, ytop - 8)) { p.y = ytop - TS; } else p.y = ytop;
            p.rope = null; p.onGround = true;
          } else if (p.y >= ybot || solidPt(rx, p.y + 1)) { p.rope = null; }
          if (jumpP && p.rope) { p.rope = null; p.vy = -3.5; p.vx = L ? -1.4 : R ? 1.4 : 0; }
          if (atkP && !p.atk) startAttack('side');
          return;
        }
        // grab a rope
        if ((U || (D && p.onGround)) && !p.atk) {
          for (const rp of ropes) {
            const rx = rp.c * TS + 8, ytop = rp.r0 * TS, ybot = (rp.r1 + 1) * TS;
            if (Math.abs(p.x - rx) > 7) continue;
            if (U && p.y > ytop + 4 && p.y - 20 < ybot) { p.rope = rp; p.crouch = false; return; }
            if (D && p.onGround && Math.abs(p.y - (ytop - TS)) < 2) { p.rope = rp; p.y = ytop + 6; p.crouch = false; return; }
          }
        }
        p.crouch = p.onGround && D && !p.atk;
        let ax = 0;
        if (p.kb > 0) p.kb--;
        else if (!p.crouch && !(p.atk && p.onGround)) { if (L) { ax = -1; p.face = 1; } if (R) { ax = 1; p.face = 0; } }
        else if (p.crouch) { if (L) p.face = 1; if (R) p.face = 0; }
        if (!p.kb) p.vx = ax * 1.5;
        if (ax && p.onGround) p.walk++;
        if (jumpP && p.onGround && !p.atk) {
          if (D && platPt(p.x, p.y + 2)) { p.y += 3; p.drop = 10; }
          else { p.vy = -5.6; au.tone(260, .1, { type: 'square', vol: .08, slideTo: 520 }); }
        }
        if (atkP && !p.atk) startAttack(U ? 'up' : (!p.onGround && D) ? 'down' : 'side');
        if (p.drop > 0) p.drop--;
        phys(p, 5, p.crouch ? 16 : 26, p.drop > 0);
        if (p.atkKind === 'down' && p.atk && !p.onGround) p.vy = Math.max(p.vy, 2);
        // hazards
        const tf = tAt(Math.floor(p.x / TS), Math.floor((p.y - 1) / TS));
        if (tf === SPIKE) hurtPlayer(6, p.x - (p.face ? -1 : 1));
        if (p.y >= (NR - 1) * TS + 4 && tAt(Math.floor(p.x / TS), NR - 1) === LAVA) { sparks(p.x, p.y, '#ff8020', 20); au.noise(.5, { vol: .2, freq: 900 }); killPlayer(); return; }
        if (p.y > NR * TS + 30) { killPlayer(); return; }
        // checkpoint
        if (p.onGround && !p.kb) {
          const c = Math.floor(p.x / TS), rr = Math.floor(p.y / TS);
          if (solidT(tAt(c - 1, rr)) && solidT(tAt(c + 1, rr)) && solidT(tAt(c, rr)) && tAt(c, rr - 1) !== SPIKE) { p.checkX = c * TS + 8; p.checkY = rr * TS; }
        }
        // camera / arena lock
        const arenaX = (NC - 16) * TS;
        if (!g.bossLock && p.x > arenaX + 40) startBoss();
        if (g.bossLock) { if (p.x < arenaX + 6) p.x = arenaX + 6; g.camX = arenaX; }
        else g.camX = Math.max(0, Math.min(arenaX, p.x - 100));
        if (p.x < g.camX + 6) p.x = g.camX + 6;
      }
      function startAttack(kind) {
        const p = g.p, w = WEAP[p.weapon];
        p.atk = w.speed; p.atkKind = kind; p.hitSet = new Set();
        au.noise(.08, { vol: .12, freq: 3000, slideTo: 800, type: 'bandpass' });
        if (p.weapon === 'fire' && kind === 'side') {
          const f = p.face ? -1 : 1;
          g.shots.push({ x: p.x + f * 14, y: p.y - (p.crouch ? 10 : 18), vx: f * 3.5, life: 50 });
          au.tone(400, .15, { type: 'sawtooth', vol: .08, slideTo: 200 });
        }
      }
      function doHits() {
        const p = g.p, box = attackBox(), w = WEAP[p.weapon];
        for (const e of g.enemies) {
          if (e.dead || p.hitSet.has(e)) continue;
          if (overlap(box, ebox(e))) {
            p.hitSet.add(e);
            hitEnemy(e, w.dmg);
            if (p.atkKind === 'down') p.vy = -4;
          }
        }
        for (const s of g.eshots) if (s.breakable && overlap(box, { x: s.x - 3, y: s.y - 3, w: 6, h: 6 })) { s.life = 0; sparks(s.x, s.y, '#ffffff', 4); }
      }
      function hitEnemy(e, dmg) {
        if (e.inv > 0) return;
        e.hp -= dmg; e.inv = e.boss ? 14 : 8; e.flash = 8;
        sparks(e.x, e.y - e.h / 2, '#ffffff', 5);
        au.tone(e.boss ? 160 : 220, .08, { type: 'square', vol: .12, slideTo: 90 });
        if (!e.boss) e.vx = (e.x > g.p.x ? 1 : -1) * 1.5;
        if (e.hp <= 0) {
          e.dead = 1; addScore(e.pts, e.x, e.y - e.h - 6);
          sparks(e.x, e.y - e.h / 2, '#ffd040', 14);
          au.noise(.25, { vol: .15, freq: 1500, slideTo: 200 });
          if (e.boss) bossDefeated(e);
          else if (Math.random() < 0.18) g.items.push({ x: e.x, y: e.y - 10, kind: pickItem(Math.random, g.round), vy: -2, t: 0, drop: true });
        }
      }
      function ebox(e) { return { x: e.x - e.w / 2, y: e.y - e.h, w: e.w, h: e.h }; }

      // ---------- enemies ----------
      const EDEF = {
        soldier: { w: 12, h: 26, hp: 3, pts: 400, sp: 0.6 },
        skeleton: { w: 10, h: 24, hp: 2, pts: 300, sp: 0.75 },
        bat: { w: 12, h: 8, hp: 1, pts: 100, sp: 1.0, fly: true },
        harpy: { w: 16, h: 12, hp: 2, pts: 200, sp: 1.2, fly: true }
      };
      function spawnEnemy(s) {
        const d = EDEF[s.kind]; const lvl = g.round;
        const e = { kind: s.kind, x: s.x, y: s.y || 0, vx: 0, vy: 0, w: d.w, h: d.h, hp: d.hp + Math.floor((lvl - 1) / 2), pts: d.pts, sp: d.sp * (1 + (lvl - 1) * 0.08), fly: !!d.fly, t: 0, face: 1, atk: 0, cd: 60, inv: 0, flash: 0, dead: 0, base: 0 };
        if (e.fly) { e.y = 50 + Math.random() * 60; e.base = e.y; }
        else if (!s.y) { // drop onto ground from the top
          let rr = 0; while (rr < NR && !solidT(tAt(Math.floor(e.x / TS), rr)) && tAt(Math.floor(e.x / TS), rr) !== PLAT) rr++;
          e.y = rr * TS;
          if (rr >= NR) return;
        }
        g.enemies.push(e);
      }
      function updateEnemies() {
        const p = g.p;
        for (const s of g.spawns) {
          if (s.done) continue;
          if (s.x < g.camX + W + 20 && s.x > g.camX - 20) { s.done = true; spawnEnemy(s); }
        }
        // occasional extra bats in later rounds
        if (!g.bossLock && frame % Math.max(200, 520 - g.round * 50) === 0 && g.enemies.length < 6) spawnEnemy({ kind: g.p.x > g.L.castleFrom * TS ? 'bat' : 'harpy', x: g.camX + W + 10 });
        for (const e of g.enemies) {
          if (e.dead) { e.dead++; continue; }
          e.t++; if (e.inv > 0) e.inv--; if (e.flash > 0) e.flash--;
          if (e.boss) { updateBoss(e); continue; }
          const dx = p.x - e.x;
          if (e.kind === 'bat') {
            e.face = dx < 0 ? 1 : 0;
            e.x += Math.sign(dx) * e.sp; e.y = e.base + Math.sin(e.t * 0.08) * 20;
            if (Math.abs(dx) < 50) e.base += Math.sign(p.y - 14 - e.base) * 0.4;
          } else if (e.kind === 'harpy') {
            // swoop: hover high, then dive at the player
            if (!e.st) e.st = 'hover';
            if (e.st === 'hover') { e.x += Math.sign(dx) * e.sp * .6; e.y += (40 - e.y) * .05; if (Math.abs(dx) < 70 && e.t > 50) { e.st = 'dive'; e.tx = p.x; e.ty = p.y - 12; } }
            else if (e.st === 'dive') { const ddx = e.tx - e.x, ddy = e.ty - e.y, d = Math.hypot(ddx, ddy) || 1; e.x += ddx / d * 2.4; e.y += ddy / d * 2.4; if (d < 4) { e.st = 'rise'; e.t = 0; } }
            else { e.y -= 1.5; e.x += (e.face ? -1 : 1) * 1; if (e.y < 40) { e.st = 'hover'; e.t = 0; } }
            e.face = dx < 0 ? 1 : 0;
          } else {
            // ground walkers
            if (e.atk > 0) {
              e.atk--; e.vx = 0;
              if (e.atk === 10) { // swing
                const f = e.face ? -1 : 1;
                const box = f > 0 ? { x: e.x, y: e.y - 24, w: 22, h: 16 } : { x: e.x - 22, y: e.y - 24, w: 22, h: 16 };
                if (overlap(box, { x: p.x - 5, y: p.y - 26, w: 10, h: 26 })) hurtPlayer(4 + Math.floor(g.round / 2), e.x);
                au.noise(.06, { vol: .08, freq: 2500, type: 'bandpass' });
              }
            } else {
              e.face = dx < 0 ? 1 : 0;
              const dir = Math.sign(dx) || 1;
              if (Math.abs(dx) > 18 && Math.abs(dx) < 200) { e.vx = dir * e.sp; if (e.onGround && !groundAhead(e, dir)) e.vx = 0; }
              else e.vx *= 0.8;
              if (--e.cd <= 0 && Math.abs(dx) < 30 && Math.abs(p.y - e.y) < 24) { e.atk = 24; e.cd = 70 - Math.min(40, g.round * 6) + Math.random() * 40; }
              if (e.kind === 'skeleton' && e.cd <= 0 && Math.abs(dx) < 140 && Math.abs(dx) >= 30) {
                e.cd = 110 + Math.random() * 60;
                g.eshots.push({ x: e.x, y: e.y - 20, vx: Math.sign(dx) * 1.8, vy: -3, grav: 0.15, life: 120, breakable: true, kind: 'bone', dmg: 3 });
              }
              if (e.onGround && e.hitWall && Math.random() < 0.05) e.vy = -4.5;
            }
            phys(e, e.w / 2 - 1, e.h);
            if (e.y > NR * TS + 20) e.dead = 60;
          }
          if (!p.dead && overlap(ebox(e), { x: p.x - 5, y: p.y - (p.crouch ? 16 : 26), w: 10, h: p.crouch ? 16 : 26 })) hurtPlayer(e.fly ? 3 : 2, e.x);
          if (e.x < g.camX - 80 || e.x > g.camX + W + 120) e.gone = true;
        }
        g.enemies = g.enemies.filter(e => !e.gone && e.dead < 30);
      }
      function updateShots() {
        const p = g.p;
        for (const s of g.shots) {
          s.x += s.vx; s.life--;
          if (solidPt(s.x, s.y)) s.life = 0;
          for (const e of g.enemies) if (!e.dead && overlap({ x: s.x - 4, y: s.y - 4, w: 8, h: 8 }, ebox(e))) { hitEnemy(e, 2); s.life = 0; break; }
        }
        g.shots = g.shots.filter(s => s.life > 0);
        for (const s of g.eshots) {
          s.x += s.vx; s.y += s.vy; if (s.grav) s.vy += s.grav; s.life--;
          if (s.kind !== 'fire' && solidPt(s.x, s.y)) s.life = 0;
          if (!p.dead && overlap({ x: s.x - 3, y: s.y - 3, w: 6, h: 6 }, { x: p.x - 5, y: p.y - (p.crouch ? 16 : 26), w: 10, h: p.crouch ? 16 : 26 })) { s.life = 0; hurtPlayer(s.dmg || 3, s.x); }
        }
        g.eshots = g.eshots.filter(s => s.life > 0);
        for (const it of g.items) {
          it.t++;
          if (it.drop) { it.vy = Math.min(4, it.vy + .2); it.y += it.vy; if (solidPt(it.x, it.y) || platPt(it.x, it.y)) { it.y = Math.floor(it.y / TS) * TS; it.vy = 0; it.drop = false; } if (it.y > NR * TS) it.taken = true; }
          if (!p.dead && Math.abs(it.x - p.x) < 12 && it.y > p.y - 30 && it.y < p.y + 6) collect(it);
          if (it.drop === false && it.t > 900 && it.kind !== 'potion') it.taken = it.t > 1200;
        }
        g.items = g.items.filter(i => !i.taken);
        for (const q of g.parts) { q.x += q.vx; q.y += q.vy; q.vy += .15; q.t--; }
        g.parts = g.parts.filter(q => q.t > 0);
        for (const q of g.pops) { q.t--; q.y -= .4; }
        g.pops = g.pops.filter(q => q.t > 0);
      }
      function collect(it) {
        const p = g.p; it.taken = true;
        const k = it.kind;
        if (k === 'axe' || k === 'mace' || k === 'fire') { p.weapon = k; p.wT = 1500; addScore(500, it.x, it.y - 10); au.melody([[523, .06], [784, .06], [1047, .12]], { type: 'square', vol: .12 }); }
        else if (k === 'shield' || k === 'armor') { p.guard = k; p.gT = 1800; addScore(500, it.x, it.y - 10); au.melody([[392, .06], [523, .06], [659, .12]], { type: 'triangle', vol: .14 }); }
        else if (k === 'potion') { p.hp = Math.min(32, p.hp + 12); addScore(100, it.x, it.y - 10); au.melody([[659, .06], [880, .06], [1319, .1]], { type: 'triangle', vol: .14 }); }
        else if (k === 'jewel') { addScore(2000, it.x, it.y - 10); au.melody([[1319, .05], [1568, .05], [2093, .1]], { type: 'square', vol: .1 }); }
        else { addScore(1000, it.x, it.y - 10); au.melody([[1047, .05], [1319, .1]], { type: 'square', vol: .1 }); }
      }

      // ---------- bosses ----------
      function startBoss() {
        g.bossLock = true;
        const arenaX = (NC - 16) * TS;
        const kind = ['knight', 'wizard', 'dragon'][(g.round - 1) % 3];
        const hp = { knight: 18, wizard: 16, dragon: 24 }[kind] + (g.round - 1) * 3;
        const b = { boss: true, kind, x: arenaX + 200, y: 11 * TS, vx: 0, vy: 0, w: kind === 'dragon' ? 26 : 18, h: kind === 'dragon' ? 26 : 40, hp, maxhp: hp, pts: 10000 * Math.min(3, Math.ceil(g.round / 3)), t: 0, face: 1, st: 'enter', stT: 60, inv: 0, flash: 0, dead: 0 };
        if (kind === 'wizard') { b.y = 11 * TS - 30; b.fly = true; }
        if (kind === 'dragon') { b.hx = arenaX + 210; b.hy = 11 * TS - 60; b.x = b.hx; b.y = b.hy + 13; }
        g.enemies = g.enemies.filter(e => e.x > arenaX - 10);
        g.enemies.push(b); g.boss = b;
        au.melody([[110, .2], [117, .2], [110, .2], [104, .4]], { type: 'sawtooth', vol: .14 });
      }
      function updateBoss(b) {
        const p = g.p, arenaX = (NC - 16) * TS, dx = p.x - b.x;
        b.stT--;
        if (b.kind === 'knight') {
          b.face = dx < 0 ? 1 : 0;
          if (b.st === 'enter') { if (b.stT <= 0) { b.st = 'walk'; b.stT = 60; } }
          else if (b.st === 'walk') {
            b.vx = Math.sign(dx) * (0.7 + g.round * 0.05);
            if (Math.abs(dx) < 34) { b.st = 'wind'; b.stT = 26; b.vx = 0; }
            else if (b.stT <= 0) { b.stT = 80; if (Math.random() < .35 && b.onGround) { b.vy = -5.5; b.vx = Math.sign(dx) * 2; b.st = 'leap'; } }
          } else if (b.st === 'leap') { if (b.onGround && b.stT < 70) { b.st = 'walk'; b.stT = 60; au.noise(.2, { vol: .15, freq: 300 }); } }
          else if (b.st === 'wind') { b.vx = 0; if (b.stT <= 0) { b.st = 'slash'; b.stT = 16; } }
          else if (b.st === 'slash') {
            if (b.stT === 12) {
              const f = b.face ? -1 : 1;
              const box = f > 0 ? { x: b.x, y: b.y - 40, w: 40, h: 34 } : { x: b.x - 40, y: b.y - 40, w: 40, h: 34 };
              if (overlap(box, { x: p.x - 5, y: p.y - 26, w: 10, h: 26 })) hurtPlayer(7, b.x);
              au.noise(.15, { vol: .14, freq: 2000, type: 'bandpass' });
            }
            if (b.stT <= 0) { b.st = 'walk'; b.stT = 50 + Math.random() * 40; }
          }
          phys(b, 9, 40);
          if (b.x < arenaX + 12) b.x = arenaX + 12;
        } else if (b.kind === 'wizard') {
          b.face = dx < 0 ? 1 : 0;
          b.y = 11 * TS - 18 + Math.sin(b.t * .05) * 12;
          if (b.st === 'enter') { if (b.stT <= 0) { b.st = 'cast'; b.stT = 90; } }
          else if (b.st === 'cast') {
            b.x += Math.sin(b.t * .02) * .6;
            if (b.stT % 30 === 0 && b.stT > 0) {
              const a = Math.atan2(p.y - 14 - b.y + 20, dx);
              for (let k = -1; k <= 1; k++) g.eshots.push({ x: b.x, y: b.y - 24, vx: Math.cos(a + k * .3) * 2, vy: Math.sin(a + k * .3) * 2, life: 160, kind: 'fire', dmg: 4, breakable: true });
              au.tone(500, .2, { type: 'sawtooth', vol: .1, slideTo: 150 });
            }
            if (b.stT <= 0) { b.st = 'vanish'; b.stT = 40; }
          } else if (b.st === 'vanish') {
            if (b.stT === 20) { b.x = arenaX + 30 + Math.random() * (W - 60); if (Math.abs(b.x - p.x) < 50) b.x = p.x + (p.x < arenaX + W / 2 ? 90 : -90); au.tone(1200, .2, { type: 'sine', vol: .1, slideTo: 300 }); }
            if (b.stT <= 0) { b.st = 'cast'; b.stT = 90 + Math.random() * 60 - g.round * 5; }
          }
        } else if (b.kind === 'dragon') {
          // head on a long neck, bobbing from the right side; breathes fire arcs
          b.face = 1;
          const ty = 11 * TS - 50 + Math.sin(b.t * .03) * 40;
          const tx = b.hx - 40 + Math.sin(b.t * .017) * 50;
          b.x += (tx - b.x) * .04; b.y += (ty + 13 - b.y) * .05;
          if (b.st === 'enter') { if (b.stT <= 0) { b.st = 'idle'; b.stT = 90; } }
          else if (b.st === 'idle') { if (b.stT <= 0) { b.st = 'breath'; b.stT = 60; } }
          else if (b.st === 'breath') {
            if (b.stT % 6 === 0) { g.eshots.push({ x: b.x - 12, y: b.y - 12, vx: -2.2 - Math.random(), vy: -1 + Math.random() * 1.5, grav: 0.05, life: 120, kind: 'fire', dmg: 4 }); au.noise(.1, { vol: .1, freq: 900 }); }
            if (b.stT <= 0) { b.st = 'idle'; b.stT = 80 + Math.random() * 60; }
          }
        }
      }
      function bossDefeated(b) {
        g.phase = 'clear'; g.phaseT = 300;
        g.bonus = 5000 + Math.floor(g.p.hp / 32 * 10000 / 100) * 100;
        addScore(g.bonus);
        au.melody([[392, .12], [523, .12], [659, .12], [784, .24], [659, .12], [784, .5]], { type: 'square', vol: .14, delay: .3 });
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
        if (g.phase === 'ready') { if (--g.phaseT <= 0) g.phase = 'play'; return; }
        if (g.phase === 'play') { updatePlayer(); if (g.phase === 'play') { updateEnemies(); updateShots(); } return; }
        if (g.phase === 'dying') { const p = g.p; p.vy += .2; p.y += p.vy; updateShots(); if (--g.phaseT <= 0) respawn(); return; }
        if (g.phase === 'clear') { updateShots(); if (--g.phaseT <= 0) { g.round++; startRound(); } return; }
        if (g.phase === 'over') { if (--g.phaseT <= 0 || (g.phaseT < 220 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; } }
      }

      // ---------- render ----------
      function drawBG(ctx, camX, castle) {
        if (!castle) {
          const gr = ctx.createLinearGradient(0, 0, 0, H);
          gr.addColorStop(0, '#f08030'); gr.addColorStop(.45, '#f8c060'); gr.addColorStop(1, '#a06040');
          ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = '#fff0b0'; ctx.beginPath(); ctx.arc(190, 60, 18, 0, 6.3); ctx.fill();
          // far mountains
          ctx.fillStyle = '#8a4a50';
          for (let i = -1; i < 6; i++) { const bx = i * 64 - ((camX * .2) % 64); ctx.beginPath(); ctx.moveTo(bx, 150); ctx.lineTo(bx + 32, 90 + ((i * 37 + Math.floor(camX * .2 / 64) * 13) & 31)); ctx.lineTo(bx + 64, 150); ctx.fill(); }
          ctx.fillStyle = '#5a3040'; ctx.fillRect(0, 150, W, H - 150);
          ctx.fillStyle = '#4a2838';
          for (let i = -1; i < 10; i++) { const bx = i * 32 - ((camX * .5) % 32); ctx.beginPath(); ctx.moveTo(bx, 175); ctx.lineTo(bx + 16, 140 + (((i + Math.floor(camX * .5 / 32)) * 23) & 15)); ctx.lineTo(bx + 32, 175); ctx.fill(); }
          ctx.fillRect(0, 175, W, H - 175);
        } else {
          ctx.fillStyle = '#1a1420'; ctx.fillRect(0, 0, W, H);
          const off = (camX * .5) % 32;
          ctx.fillStyle = '#241c2c';
          for (let y = 0; y < H; y += 16) for (let x = -32; x < W + 32; x += 32) ctx.fillRect(x - off + ((y / 16) & 1) * 16, y, 30, 14);
          // windows and torches
          for (let i = -1; i < 4; i++) {
            const wx = i * 96 - ((camX * .5) % 96) + 40;
            ctx.fillStyle = '#080610'; ctx.fillRect(wx, 50, 14, 26); ctx.beginPath(); ctx.arc(wx + 7, 50, 7, Math.PI, 0); ctx.fill();
            ctx.fillStyle = '#806040'; ctx.fillRect(wx + 40, 90, 3, 10);
            ctx.fillStyle = (frame >> 2) & 1 ? '#ffb020' : '#ff6010'; ctx.fillRect(wx + 39, 84 + ((frame >> 3) & 1), 5, 6);
          }
        }
      }
      function drawTiles(ctx, camX) {
        const c0 = Math.floor(camX / TS), off = -(camX - c0 * TS);
        for (let i = 0; i <= 16; i++) {
          const c = c0 + i; if (c < 0 || c >= NC) continue;
          const x = Math.round(off + i * TS);
          for (let rr = 0; rr < NR; rr++) {
            const t = tiles[rr * NC + c]; if (!t) continue;
            const y = rr * TS;
            if (t === GROUND) ctx.drawImage(tAt(c, rr - 1) === GROUND ? TILE.dirt : TILE.grass, x, y);
            else if (t === BRICK) ctx.drawImage(solidT(tAt(c, rr - 1)) ? TILE.brick : TILE.brickTop, x, y);
            else if (t === PLAT) ctx.drawImage(TILE.plat, x, y);
            else if (t === SPIKE) ctx.drawImage(TILE.spike, x, y);
            else if (t === LAVA) {
              ctx.fillStyle = '#c02000'; ctx.fillRect(x, y + 4, 16, 12);
              ctx.fillStyle = '#ff7010'; for (let k = 0; k < 4; k++) ctx.fillRect(x + k * 4, y + 3 + Math.round(Math.sin((frame + c * 16 + k * 4) * .15) * 2), 3, 3);
              ctx.fillStyle = '#ffd040'; ctx.fillRect(x + ((frame >> 3) + c * 5) % 14, y + 7, 2, 1);
            }
          }
        }
        // ropes
        for (const rp of ropes) {
          const x = rp.c * TS + 8 - camX; if (x < -8 || x > W + 8) continue;
          for (let y = rp.r0 * TS - 6; y < (rp.r1 + 1) * TS; y += 4) { ctx.fillStyle = '#c0a060'; ctx.fillRect(x - 1, y, 2, 3); ctx.fillStyle = '#806030'; ctx.fillRect(x - 1 + ((y >> 2) & 1), y + 3, 1, 1); }
        }
      }
      function drawWeapon(ctx, p, x, y) {
        const w = WEAP[p.weapon], f = p.face ? -1 : 1;
        let ang, hx = x + f * 4, hy = y - (p.crouch ? 12 : 20);
        if (p.atk) {
          const t = 1 - p.atk / w.speed;
          if (p.atkKind === 'up') ang = -Math.PI / 2 - f * (0.9 - t * 1.8);
          else if (p.atkKind === 'down') ang = Math.PI / 2;
          else ang = f > 0 ? -1.4 + t * 2.0 : Math.PI + 1.4 - t * 2.0;
        } else if (p.rope) { ang = f > 0 ? -0.6 : Math.PI + 0.6; hx = x + f * 5; hy = y - 14; }
        else ang = f > 0 ? -2.2 : Math.PI + 2.2 - Math.PI * 0; // resting over shoulder
        if (!p.atk && !p.rope) { ang = f > 0 ? -2.3 : -0.84; hx = x - f * 1; hy = y - 14; }
        const ca = Math.cos(ang), sa = Math.sin(ang);
        if (p.weapon === 'mace') {
          const L2 = p.atk ? w.len : 10;
          ctx.fillStyle = '#806040'; for (let i = 0; i < 6; i++) ctx.fillRect(Math.round(hx + ca * i), Math.round(hy + sa * i), 1, 1);
          ctx.fillStyle = '#909090'; for (let i = 6; i < L2; i += 2) ctx.fillRect(Math.round(hx + ca * i), Math.round(hy + sa * i), 1, 1);
          const bx = Math.round(hx + ca * L2), by = Math.round(hy + sa * L2);
          ctx.fillStyle = '#707070'; ctx.fillRect(bx - 3, by - 3, 6, 6); ctx.fillStyle = '#c0c0c0'; ctx.fillRect(bx - 4, by, 8, 1); ctx.fillRect(bx, by - 4, 1, 8); ctx.fillRect(bx - 2, by - 2, 2, 2);
          return;
        }
        // handle
        ctx.fillStyle = '#806040'; for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(hx + ca * i), Math.round(hy + sa * i), 2, 2);
        ctx.fillStyle = '#f0c020'; ctx.fillRect(Math.round(hx + ca * 4 - sa * 2), Math.round(hy + sa * 4 + ca * 2), 1, 1); ctx.fillRect(Math.round(hx + ca * 4 + sa * 2), Math.round(hy + sa * 4 - ca * 2), 1, 1);
        if (p.weapon === 'axe') {
          ctx.fillStyle = '#806040'; for (let i = 4; i < 16; i++) ctx.fillRect(Math.round(hx + ca * i), Math.round(hy + sa * i), 2, 2);
          const bx = hx + ca * 14, by = hy + sa * 14;
          ctx.fillStyle = '#c0c0d0';
          for (let k = -5; k <= 5; k++) for (let j = 0; j < 6 - Math.abs(k) / 2; j++) ctx.fillRect(Math.round(bx - sa * k * 1 + ca * j * 0), Math.round(by + ca * k), 2, 2);
          return;
        }
        const col = p.weapon === 'fire' ? ((frame >> 1) & 1 ? '#ffd040' : '#ff6010') : w.col;
        ctx.fillStyle = col;
        for (let i = 4; i < w.len; i++) ctx.fillRect(Math.round(hx + ca * i), Math.round(hy + sa * i), 2, 1);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(hx + ca * (w.len - 1)), Math.round(hy + sa * (w.len - 1)), 1, 1);
      }
      function drawPlayer(ctx, camX) {
        const p = g.p;
        if (p.inv > 0 && (frame & 2) && !p.dead) return;
        const x = Math.round(p.x - camX), y = Math.round(p.y);
        const fi = p.face;
        let im;
        if (p.dead) im = SPR.jump[fi];
        else if (p.rope) im = SPR.climb[((p.walk >> 3) & 1) ? 0 : 1];
        else if (p.crouch) im = SPR.crouch[fi];
        else if (!p.onGround) im = SPR.jump[fi];
        else if (Math.abs(p.vx) > 0.1) im = [SPR.w1, SPR.stand, SPR.w2, SPR.stand][(p.walk >> 3) & 3][fi];
        else im = SPR.stand[fi];
        if (p.guard === 'shield' && !p.rope) {
          const sx = x + (p.face ? 3 : -8);
          ctx.fillStyle = '#8a5a20'; ctx.fillRect(sx, y - 22, 6, 11); ctx.fillStyle = '#f0c020'; ctx.fillRect(sx + 1, y - 21, 4, 9); ctx.fillStyle = '#c02818'; ctx.fillRect(sx + 2, y - 18, 2, 3);
        }
        ctx.drawImage(im, x - 6, y - im.height);
        if (p.guard === 'armor') { ctx.fillStyle = 'rgba(200,200,230,.85)'; ctx.fillRect(x - 4, y - 17, 8, 5); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 3, y - 17, 2, 1); }
        if (!p.dead) drawWeapon(ctx, p, x, y);
      }
      function drawEnemy(ctx, e, camX) {
        if (e.dead && (e.dead & 2)) return;
        const x = Math.round(e.x - camX), y = Math.round(e.y), f = e.face ? -1 : 1;
        const fl = e.flash > 0 && (frame & 2);
        if (e.boss) { drawBoss(ctx, e, x, y, fl); return; }
        if (e.kind === 'soldier') {
          const skin = fl ? '#fff' : '#40a040', arm = fl ? '#fff' : '#a08040';
          const st = (e.t >> 3) & 1;
          ctx.fillStyle = skin; ctx.fillRect(x - 4, y - 26, 8, 7); ctx.fillRect(x + f * 3, y - 24, 4 * f, 3);
          ctx.fillStyle = '#ff2020'; ctx.fillRect(x + f * 2, y - 24, 1, 1);
          ctx.fillStyle = arm; ctx.fillRect(x - 5, y - 19, 10, 9);
          ctx.fillStyle = '#704010'; ctx.fillRect(x - 5, y - 11, 10, 2);
          ctx.fillStyle = skin; ctx.fillRect(x - 4 + st, y - 9, 3, 9); ctx.fillRect(x + 1 - st, y - 9, 3, 9);
          ctx.fillStyle = '#40a040'; ctx.fillRect(x - f * 6, y - 8, 3, 2); // tail
          // sword
          const sw = e.atk > 10 ? -1 : e.atk > 0 ? 1 : 0;
          ctx.fillStyle = '#d0d0e0';
          if (sw === -1) ctx.fillRect(x + f * 2 - (f < 0 ? 2 : 0), y - 38, 2, 16);
          else if (sw === 1) ctx.fillRect(x + (f > 0 ? 5 : -21), y - 19, 16, 2);
          else ctx.fillRect(x + f * 6 - (f < 0 ? 1 : 0), y - 22, 1, 12);
          ctx.fillStyle = '#8a6a30'; ctx.fillRect(x - f * 7 - 2, y - 20, 4, 8);
        } else if (e.kind === 'skeleton') {
          const b = fl ? '#ffd0d0' : '#e8e0d0';
          ctx.fillStyle = b; ctx.fillRect(x - 3, y - 24, 7, 7);
          ctx.fillStyle = '#000'; ctx.fillRect(x - 2 + (f > 0 ? 2 : 0), y - 22, 2, 2); ctx.fillRect(x - 1, y - 18, 3, 1);
          ctx.fillStyle = b; ctx.fillRect(x - 1, y - 17, 2, 9); for (let k = 0; k < 3; k++) ctx.fillRect(x - 4, y - 16 + k * 3, 9, 1);
          const st = (e.t >> 3) & 1;
          ctx.fillRect(x - 3 + st, y - 8, 2, 8); ctx.fillRect(x + 1 - st, y - 8, 2, 8);
          ctx.fillRect(x + f * 3, y - 15 + (e.atk > 10 ? -4 : 0), f * 5, 1);
          if (e.atk) { ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x + (f > 0 ? 5 : -19), y - 18, 14, 2); }
        } else if (e.kind === 'bat') {
          const up = (e.t >> 2) & 1;
          ctx.fillStyle = fl ? '#fff' : '#6030a0'; ctx.fillRect(x - 3, y - 6, 6, 5);
          ctx.fillStyle = fl ? '#fff' : '#8040c0';
          if (up) { ctx.fillRect(x - 9, y - 9, 6, 2); ctx.fillRect(x + 3, y - 9, 6, 2); ctx.fillRect(x - 5, y - 7, 2, 2); ctx.fillRect(x + 3, y - 7, 2, 2); }
          else { ctx.fillRect(x - 9, y - 4, 6, 2); ctx.fillRect(x + 3, y - 4, 6, 2); ctx.fillRect(x - 8, y - 2, 2, 1); ctx.fillRect(x + 6, y - 2, 2, 1); }
          ctx.fillStyle = '#ff2020'; ctx.fillRect(x - 2, y - 5, 1, 1); ctx.fillRect(x + 1, y - 5, 1, 1);
        } else if (e.kind === 'harpy') {
          const up = (e.t >> 3) & 1;
          ctx.fillStyle = fl ? '#fff' : '#e8a060'; ctx.fillRect(x - 3, y - 12, 6, 5);
          ctx.fillStyle = '#c03030'; ctx.fillRect(x - 3, y - 13, 6, 2);
          ctx.fillStyle = fl ? '#fff' : '#30a080'; ctx.fillRect(x - 4, y - 7, 8, 6);
          ctx.fillStyle = fl ? '#fff' : '#40c0a0';
          if (up) { ctx.fillRect(x - 12, y - 14, 8, 3); ctx.fillRect(x + 4, y - 14, 8, 3); } else { ctx.fillRect(x - 12, y - 6, 8, 3); ctx.fillRect(x + 4, y - 6, 8, 3); }
          ctx.fillStyle = '#f0c020'; ctx.fillRect(x - 3, y - 1, 2, 2); ctx.fillRect(x + 1, y - 1, 2, 2);
        }
      }
      function drawBoss(ctx, b, x, y, fl) {
        const f = b.face ? -1 : 1;
        if (b.kind === 'knight') {
          const arm = fl ? '#ffffff' : '#7080a0', dk = fl ? '#ffffff' : '#404860';
          ctx.fillStyle = dk; ctx.fillRect(x - 9, y - 40, 18, 12);
          ctx.fillStyle = arm; ctx.fillRect(x - 8, y - 40, 16, 10);
          ctx.fillStyle = '#ff2020'; ctx.fillRect(x + f * 2 - 2, y - 35, 6, 2);
          ctx.fillStyle = '#c02818'; ctx.fillRect(x - 2, y - 46, 4, 6);
          ctx.fillStyle = arm; ctx.fillRect(x - 11, y - 28, 22, 14); ctx.fillStyle = dk; ctx.fillRect(x - 11, y - 16, 22, 2);
          const st = (b.t >> 3) & 1 && Math.abs(b.vx) > 0;
          ctx.fillStyle = arm; ctx.fillRect(x - 8 + (st ? 2 : 0), y - 14, 6, 14); ctx.fillRect(x + 2 - (st ? 2 : 0), y - 14, 6, 14);
          // shield
          ctx.fillStyle = '#c0a020'; ctx.fillRect(x - f * 14 - 4, y - 30, 8, 18); ctx.fillStyle = '#802010'; ctx.fillRect(x - f * 14 - 2, y - 26, 4, 8);
          // big sword
          ctx.fillStyle = '#e0e0f0';
          if (b.st === 'wind') ctx.fillRect(x - f * 4 - 1, y - 70, 3, 32);
          else if (b.st === 'slash') ctx.fillRect(x + (f > 0 ? 8 : -42), y - 26, 34, 3);
          else ctx.fillRect(x + f * 12 - 1, y - 44, 2, 28);
        } else if (b.kind === 'wizard') {
          const robe = fl ? '#fff' : '#5020a0';
          const yy = y;
          ctx.globalAlpha = b.st === 'vanish' ? (Math.abs(b.stT - 20) / 20) : 1;
          ctx.fillStyle = robe; ctx.beginPath(); ctx.moveTo(x - 12, yy); ctx.lineTo(x, yy - 34); ctx.lineTo(x + 12, yy); ctx.fill();
          ctx.fillStyle = '#e0d0c0'; ctx.fillRect(x - 4, yy - 40, 8, 8);
          ctx.fillStyle = '#d0d0d0'; ctx.fillRect(x - 4, yy - 33, 8, 8);
          ctx.fillStyle = robe; ctx.beginPath(); ctx.moveTo(x - 7, yy - 38); ctx.lineTo(x, yy - 54); ctx.lineTo(x + 7, yy - 38); ctx.fill();
          ctx.fillStyle = '#ff2020'; ctx.fillRect(x + f * 1 - 1, yy - 37, 1, 1); ctx.fillRect(x + f * 1 + 2, yy - 37, 1, 1);
          ctx.fillStyle = '#806040'; ctx.fillRect(x + f * 10, yy - 44, 2, 40);
          ctx.fillStyle = (frame >> 2) & 1 ? '#40ffff' : '#ff40ff'; ctx.fillRect(x + f * 10 - 2, yy - 48, 6, 6);
          ctx.globalAlpha = 1;
        } else {
          // dragon: body on the right, neck to the head (b.x,b.y)
          const bodyX = b.hx + 30 - g.camX, bodyY = 11 * TS;
          ctx.fillStyle = '#306030'; ctx.beginPath(); ctx.ellipse(bodyX, bodyY - 30, 40, 34, 0, 0, 6.3); ctx.fill();
          ctx.fillStyle = '#50a040'; for (let k = 0; k < 5; k++) ctx.fillRect(bodyX - 20 + k * 9, bodyY - 66 + Math.abs(k - 2) * 3, 5, 8);
          ctx.strokeStyle = '#306030'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(bodyX - 20, bodyY - 40); ctx.quadraticCurveTo(bodyX - 30, y - 40, x + 6, y - 12); ctx.stroke(); ctx.lineWidth = 1;
          const hc = fl ? '#ffffff' : '#40a040';
          ctx.fillStyle = hc; ctx.fillRect(x - 13, y - 24, 22, 14); ctx.fillRect(x - 18, y - 18, 8, 8);
          ctx.fillStyle = '#f0f0a0'; ctx.fillRect(x - 18, y - 11, 10, 2);
          ctx.fillStyle = '#ffff00'; ctx.fillRect(x - 6, y - 21, 3, 3); ctx.fillStyle = '#000'; ctx.fillRect(x - 6, y - 20, 1, 2);
          ctx.fillStyle = '#e0e0c0'; ctx.fillRect(x + 2, y - 30, 2, 6); ctx.fillRect(x + 6, y - 28, 2, 5);
          if (b.st === 'breath') { ctx.fillStyle = '#ff2000'; ctx.fillRect(x - 18, y - 12, 8, 4); }
        }
      }
      function drawItem(ctx, it, camX) {
        const x = Math.round(it.x - camX), y = Math.round(it.y) - 2 - (it.drop === false ? ((frame >> 4) & 1) : 0);
        if (x < -10 || x > W + 10) return;
        const k = it.kind;
        if (k === 'axe') { ctx.fillStyle = '#806040'; ctx.fillRect(x - 1, y - 12, 2, 12); ctx.fillStyle = '#d0d0e0'; ctx.fillRect(x + 1, y - 12, 5, 6); ctx.fillRect(x - 6, y - 12, 5, 6); }
        else if (k === 'mace') { ctx.fillStyle = '#806040'; ctx.fillRect(x - 1, y - 8, 2, 8); ctx.fillStyle = '#909090'; ctx.fillRect(x - 3, y - 13, 6, 6); ctx.fillStyle = '#e0e0e0'; ctx.fillRect(x - 4, y - 10, 8, 1); ctx.fillRect(x, y - 14, 1, 8); }
        else if (k === 'fire') { ctx.fillStyle = '#806040'; ctx.fillRect(x - 1, y - 4, 2, 4); ctx.fillStyle = '#f0c020'; ctx.fillRect(x - 3, y - 5, 6, 1); ctx.fillStyle = (frame >> 2) & 1 ? '#ff6010' : '#ffd040'; ctx.fillRect(x - 1, y - 16, 2, 11); }
        else if (k === 'shield') { ctx.fillStyle = '#8a5a20'; ctx.fillRect(x - 5, y - 13, 10, 13); ctx.fillStyle = '#f0c020'; ctx.fillRect(x - 4, y - 12, 8, 10); ctx.fillStyle = '#c02818'; ctx.fillRect(x - 1, y - 10, 2, 6); }
        else if (k === 'armor') { ctx.fillStyle = '#b0b0d0'; ctx.fillRect(x - 6, y - 12, 12, 10); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 5, y - 12, 4, 2); ctx.fillStyle = '#707090'; ctx.fillRect(x - 1, y - 10, 2, 8); }
        else if (k === 'potion') { ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x - 1, y - 12, 2, 3); ctx.fillStyle = '#2060ff'; ctx.fillRect(x - 4, y - 9, 8, 9); ctx.fillStyle = '#80c0ff'; ctx.fillRect(x - 3, y - 8, 2, 3); }
        else if (k === 'jewel') { ctx.fillStyle = (frame >> 3) & 1 ? '#40ff80' : '#20c060'; ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x + 6, y - 6); ctx.lineTo(x, y); ctx.lineTo(x - 6, y - 6); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(x - 2, y - 8, 2, 2); }
        else { ctx.strokeStyle = '#f0c020'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 5, 4, 0, 6.3); ctx.stroke(); ctx.lineWidth = 1; ctx.fillStyle = '#ff2020'; ctx.fillRect(x - 1, y - 11, 3, 3); }
      }
      function credStr() { return 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'); }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        const camX = Math.round(g.camX);
        drawBG(ctx, camX, camX > g.L.castleFrom * TS - W / 2);
        drawTiles(ctx, camX);
        for (const it of g.items) drawItem(ctx, it, camX);
        for (const e of g.enemies) drawEnemy(ctx, e, camX);
        if (g.phase !== 'wait' && g.phase !== 'over') drawPlayer(ctx, camX);
        for (const s of g.shots) { const x = s.x - camX; ctx.fillStyle = (frame & 2) ? '#ffd040' : '#ff6010'; ctx.beginPath(); ctx.arc(x, s.y, 4, 0, 6.3); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, s.y - 1, 2, 2); }
        for (const s of g.eshots) {
          const x = Math.round(s.x - camX), y = Math.round(s.y);
          if (s.kind === 'bone') { ctx.fillStyle = '#e8e0d0'; const a = (frame >> 2) & 1; if (a) ctx.fillRect(x - 4, y - 1, 8, 2); else ctx.fillRect(x - 1, y - 4, 2, 8); }
          else { ctx.fillStyle = (frame & 2) ? '#ff4010' : '#ffb020'; ctx.fillRect(x - 3, y - 3, 6, 6); ctx.fillStyle = '#ffff80'; ctx.fillRect(x - 1, y - 1, 2, 2); }
        }
        for (const q of g.parts) { ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x - camX), Math.round(q.y), 2, 2); }
        for (const q of g.pops) text(ctx, q.s, q.x - camX, q.y, '#ffffff', 1, 'center');
        drawHUD(ctx);
        if (g.phase === 'ready') { text(ctx, 'ROUND ' + g.round, W / 2, 80, '#f0c020', 2, 'center'); text(ctx, 'DEFEAT THE GUARDIAN', W / 2, 104, '#ffffff', 1, 'center'); }
        if (g.phase === 'clear') { text(ctx, 'ROUND CLEAR', W / 2, 70, '#f0c020', 2, 'center'); text(ctx, 'BONUS ' + g.bonus, W / 2, 94, '#ffffff', 1, 'center'); }
        if (g.phase === 'over') { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(50, 90, W - 100, 30); text(ctx, 'GAME OVER', W / 2, 98, '#ff4040', 2, 'center'); }
      }
      function drawHUD(ctx) {
        const p = g.p;
        ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, 22);
        text(ctx, '1P', 4, 2, '#ff4040', 1); text(ctx, String(g.score).padStart(7, '0'), 18, 2, '#ffffff', 1);
        text(ctx, 'HI ' + String(hi).padStart(7, '0'), W - 4, 2, '#f0c020', 1, 'right');
        // life bar
        ctx.fillStyle = '#400000'; ctx.fillRect(4, 12, 66, 6);
        ctx.fillStyle = p.hp > 10 ? '#40e040' : '#ff4020'; ctx.fillRect(5, 13, Math.max(0, p.hp) * 2, 4);
        for (let i = 0; i < Math.min(5, g.lives - 1); i++) { ctx.drawImage(SPR.stand[0], 0, 0, 12, 10, 76 + i * 12, 11, 12, 10); }
        text(ctx, 'R' + g.round, 140, 12, '#80c0ff', 1);
        let ix = 160;
        if (p.weapon !== 'sword') { drawItem(ctx, { x: ix, y: 21, kind: p.weapon, drop: true }, 0); ctx.fillStyle = '#f0c020'; ctx.fillRect(ix - 6, 21, Math.ceil(p.wT / 1500 * 12), 1); ix += 16; }
        if (p.guard) { drawItem(ctx, { x: ix, y: 21, kind: p.guard, drop: true }, 0); ctx.fillStyle = '#80c0ff'; ctx.fillRect(ix - 6, 21, Math.ceil(p.gT / 1800 * 12), 1); }
        if (g.boss && !g.boss.dead) {
          text(ctx, 'BOSS', 196, 12, '#ff4040', 1);
          ctx.fillStyle = '#400000'; ctx.fillRect(222, 12, 30, 6); ctx.fillStyle = '#ff4020'; ctx.fillRect(223, 13, Math.ceil(28 * Math.max(0, g.boss.hp) / g.boss.maxhp), 4);
        }
      }
      function renderTitle(ctx) {
        drawBG(ctx, titleT * 0.5, false);
        ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, W, H);
        text(ctx, 'RASTAN', W / 2 + 3, 39, '#401000', 5, 'center');
        text(ctx, 'RASTAN', W / 2, 36, '#f0c020', 5, 'center');
        text(ctx, 'THE BARBARIAN KING', W / 2, 78, '#ff8040', 1, 'center');
        // hero
        const im = SPR.stand[0];
        ctx.drawImage(im, 0, 0, im.width, im.height, W / 2 - 12, 92, im.width * 2, im.height * 2);
        ctx.fillStyle = '#e0e0f0'; ctx.fillRect(W / 2 + 12, 92, 3, 34); ctx.fillStyle = '#f0c020'; ctx.fillRect(W / 2 + 8, 124, 11, 3);
        const page = Math.floor(titleT / 400) % 2;
        if (page === 0) {
          text(ctx, 'AXE  MACE  FIRE SWORD', W / 2, 152, '#ffffff', 1, 'center');
          text(ctx, 'SHIELD  ARMOR  POTION', W / 2, 164, '#80c0ff', 1, 'center');
        } else {
          text(ctx, 'HIGH SCORE', W / 2, 152, '#ff4040', 1, 'center');
          text(ctx, String(hi), W / 2, 164, '#ffffff', 1, 'center');
        }
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 184, '#ff4040', 1, 'center'); }
        else if ((titleT >> 5) & 1) text(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 184, '#40ffff', 1, 'center');
        text(ctx, credStr(), W / 2, 198, '#cccccc', 1, 'center');
        text(ctx, '\u00a9 1987 TAITO', W / 2, 212, '#999999', 1, 'center');
      }
      return { update, render, destroy() { } };
    }
  });
})();
