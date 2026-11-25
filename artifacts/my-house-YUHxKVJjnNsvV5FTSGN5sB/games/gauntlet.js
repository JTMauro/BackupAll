// Gauntlet (Atari Games, 1985) - from-scratch recreation: four heroes, generators, keys, food, potions and Death.
(function () {
  'use strict';
  // ---------- 5x7 bitmap font ----------
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
    '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], '=': [0, 0, 31, 0, 31, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0],
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8]
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

  // tiny 3x5 font for the EXIT tiles
  const TINY = { E: [7, 4, 6, 4, 7], X: [5, 5, 2, 5, 5], I: [7, 2, 2, 2, 7], T: [7, 2, 2, 2, 2], O: [7, 5, 5, 5, 7], '+': [0, 2, 7, 2, 0],
    0: [7, 5, 5, 5, 7], 1: [2, 6, 2, 2, 7], 2: [7, 1, 7, 4, 7], 3: [7, 1, 3, 1, 7], 4: [5, 5, 7, 1, 1], 5: [7, 4, 7, 1, 7], 6: [7, 4, 7, 5, 7], 7: [7, 1, 1, 2, 2], 8: [7, 5, 7, 5, 7], 9: [7, 5, 7, 1, 7] };
  function tiny(ctx, s, x, y, col) {
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) { const g = TINY[s[i]]; if (!g) continue; for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r] & (4 >> c)) ctx.fillRect(x + i * 4 + c, y + r, 1, 1); }
  }

  // ---------- sprites (12 wide) ----------
  const SPR = {
    warrior: ['y..aaaa...y.', 'yy.aaaa..yy.', '.yaaaaaaay..', '..asskssa...', '..assssa....', '.aaabbaaa.w.', 'aaaabbaaaaww', 'ss.abbba.sw.', 's..aaaaa..w.', '...bbbbb....', '...bb.bb....', '...bb.bb....', '..kkk.kkk...'],
    valkyrie: ['w..wwww..w..', 'ww.wwww.ww..', '.wwwwwwww...', '..yssssy....', '..yskksy....', '.aaaaaaaa.w.', 'ywaaaaaaasw.', 'yyyaaaaa..w.', 'yyyaaaaa....', '.y.bbbbb....', '...bb.bb....', '...ss.ss....', '..kkk.kkk...'],
    wizard: ['.....aa.....', '....aaa.....', '...aaaaa....', '..aaaaaaa...', '..kssssk..w.', '..wsssw...w.', '.aawwwaaa.w.', 'aaaawaaaaaw.', 's..aaaaa.sw.', '...aaaaa..w.', '..aaaaaaa...', '..aaaaaaa...', '..kkk.kkk...'],
    elf: ['....aaa.....', '...aaaaa..y.', '..aasssaa.y.', '...sksks..y.', '...sssss.ky.', '..aaaaaaak.y', '.saaaaaaay.y', 's..aaaaa.y.y', '...aaaaa..y.', '...bbbbb....', '...bb.bb....', '...bb.bb....', '..kkk.kkk...'],
    ghost: ['...gwwwg....', '..gwwwwwg...', '.gwwkwwkwg..', '.gwwkwwkwg..', '.gwwwwwwwg..', 'gwwwkkkwwwg.', 'gwwwwwwwwwg.', 'gwwwwwwwwwg.', 'gwwwwwwwwwg.', '.gwwgwwgwg..', '.g.g.gg.g...'],
    grunt: ['..........w.', '...aaaa..ww.', '..aaaaaa.w..', '..akaaka.w..', '..aaaaaa.w..', '...akka..s..', '.bbbbbbbbs..', 'sbbbbbbbb...', 's.bbbbbb....', '..aa..aa....', '..aa..aa....', '.kkk..kkk...'],
    demon: ['.y........y.', '.yy.aaaa.yy.', '..yaaaaaay..', '..akyaayka..', 'b.aaaaaaaa.b', 'bb.awwwwa.bb', 'bbbaaaaaabbb', 'bb.aaaaaa.bb', 'b..aaaaaa..b', '...aa..aa...', '...aa..aa...', '..kk....kk..'],
    lobber: ['............', '....aaaa....', '...aakkaa...', '...aaaaaa...', '....aaaa..w.', '..bbbbbbbww.', '.s.bbbbbb...', '...bbbbbb...', '...aa..aa...', '...aa..aa...', '..kk....kk..'],
    sorcerer: ['....aaaa....', '...aaaaaa...', '...akyykaa..', '...aaaaaa...', '..aaaaaaaa..', '.saaaaaaaas.', 'y.aaaaaaaa.y', 'y.aaaaaaaa..', '..aaaaaaaa..', '.aaaaaaaaaa.', '.aaaaaaaaaa.', '..kk....kk..'],
    death: ['...kkkkk....', '..kkwwwkk...', '..kwkwkwk...', '..kwwwwwk...', '..kkwkwkk...', '.kkkkkkkkk.w', 'kkwkkkkkwkkw', 'k.kkkkkkk.w.', '..kkkkkkk.w.', '.kkkkkkkkk..', '.kkkkkkkkk..', 'kkkkkkkkkkk.']
  };
  const HEROES = [
    { id: 'warrior', name: 'WARRIOR', who: 'THOR', a: '#e02818', b: '#801010', armor: 0.2, shot: 3, melee: 3, magic: 1, speed: 1.05, shotSp: 3.6, stats: [3, 1, 4, 4, 1] },
    { id: 'valkyrie', name: 'VALKYRIE', who: 'THYRA', a: '#2858f0', b: '#102880', armor: 0.3, shot: 2, melee: 2, magic: 2, speed: 1.2, shotSp: 3.8, stats: [4, 2, 2, 3, 2] },
    { id: 'wizard', name: 'WIZARD', who: 'MERLIN', a: '#f0d020', b: '#907010', armor: 0.0, shot: 2, melee: 1, magic: 3, speed: 1.2, shotSp: 3.8, stats: [1, 4, 3, 1, 2] },
    { id: 'elf', name: 'ELF', who: 'QUESTOR', a: '#20c030', b: '#106018', armor: 0.1, shot: 1, melee: 1, magic: 3, speed: 1.55, shotSp: 4.6, stats: [2, 3, 1, 1, 4] }
  ];
  const STATNAMES = ['ARMOR', 'MAGIC', 'SHOT POWER', 'FIGHT', 'SPEED'];
  const MON = {
    ghost: { cols: ['#a0a0a0', '#c8c8c8', '#ffffff'], sp: 0.95, dmg: 10, pts: 10 },
    grunt: { cols: ['#8a5a2a', '#a87030', '#c89048'], sp: 0.8, dmg: 5, pts: 5 },
    demon: { cols: ['#a01818', '#d02828', '#ff4040'], sp: 0.9, dmg: 7, pts: 10 },
    lobber: { cols: ['#4060a0', '#5080c0', '#70a0e0'], sp: 0.75, dmg: 4, pts: 10 },
    sorcerer: { cols: ['#702090', '#9030b0', '#b050d0'], sp: 0.9, dmg: 8, pts: 10 },
    death: { cols: ['#504860', '#504860', '#504860'], sp: 0.85, dmg: 0, pts: 0 }
  };
  const WALLPAL = [
    ['#a06830', '#d09858', '#603c18', '#1a120c'], ['#707888', '#a0a8b8', '#404858', '#101218'], ['#3a7a50', '#60a878', '#20482c', '#0c1810'],
    ['#8a4a8a', '#b878b8', '#502850', '#160c16'], ['#b09030', '#e0c060', '#685418', '#18140a'], ['#4a6ab0', '#7898e0', '#283c70', '#0c1020']
  ];
  const HINTS = ['FIND THE EXIT', 'SAVE KEYS TO OPEN DOORS', 'SHOOT THE GENERATORS', 'SOME FOOD CAN BE DESTROYED',
    'LOBBERS THROW OVER WALLS', 'SORCERERS VANISH', 'BEWARE OF DEATH|ONLY MAGIC KILLS IT', 'DEMONS SPIT FIREBALLS',
    'MAGIC AFFECTS ALL MONSTERS|ON THE SCREEN', 'SHOT POTIONS EXPLODE WEAKLY', 'ALL WALLS BECOME EXITS|IF YOU TAKE TOO LONG',
    'SHOTS DO NOT HURT DEATH', 'TREASURE HIDES BEHIND DOORS'];

  const W = 320, H = 240, VW = 240, VH = 240, TS = 16, MW = 32, MH = 32;

  ArcadeRegistry.register({
    id: 'gauntlet', title: 'Gauntlet', year: 1985, maker: 'Atari Games',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Space: fire (hold to stand & shoot) \u00b7 X/Z: magic potion \u00b7 Enter: start',
    marquee: { bg: '#1a0c04', fg: '#e8b030', accent: '#e02818' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(20000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, lastCred = api.credits, sel = 0, selT = 0;
      let g = null;
      let seed = 1;
      const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
      let wr = 1; const wrnd = () => ((wr = (wr * 1103515245 + 12345) >>> 0) / 4294967296); // world rng (non-level)

      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 });
        return false;
      }
      const credStr = () => 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0');
      const snd = {
        shot() { au.tone(900, 0.06, { type: 'square', vol: 0.06, slideTo: 400 }); },
        hit() { au.noise(0.05, { vol: 0.08, freq: 2500 }); },
        kill() { au.tone(300, 0.08, { type: 'square', vol: 0.08, slideTo: 80 }); },
        gen() { au.noise(0.25, { vol: 0.14, freq: 1500, slideTo: 100 }); },
        hurt() { au.tone(160, 0.06, { type: 'sawtooth', vol: 0.08 }); },
        food() { au.melody([[523, .05], [659, .05], [784, .1]], { type: 'square', vol: 0.09 }); },
        key() { au.melody([[1047, .05], [1568, .1]], { type: 'square', vol: 0.09 }); },
        treasure() { au.melody([[1319, .04], [1568, .04], [2093, .08]], { type: 'square', vol: 0.08 }); },
        door() { au.tone(200, 0.3, { type: 'sawtooth', vol: 0.1, slideTo: 600 }); },
        magic() { au.noise(0.8, { vol: 0.22, freq: 4000, slideTo: 80 }); au.tone(80, 0.8, { type: 'sawtooth', vol: 0.12, slideTo: 1600 }); },
        exit() { au.melody([[392, .08], [523, .08], [659, .08], [784, .08], [1047, .25]], { type: 'square', vol: 0.1 }); },
        fire() { au.tone(500, 0.12, { type: 'sawtooth', vol: 0.05, slideTo: 200 }); },
        drain() { au.tone(90 + (frame % 8) * 10, 0.04, { type: 'square', vol: 0.05 }); },
        warn() { au.melody([[220, .15], [196, .15], [220, .15], [196, .3]], { type: 'square', vol: 0.08 }); },
        theme() {
          au.melody([[294, .15], [294, .15], [440, .3], [392, .15], [349, .15], [330, .15], [294, .45], [0, .1], [349, .15], [392, .15], [440, .6]], { type: 'square', vol: 0.08 });
          au.melody([[147, .6], [131, .6], [117, .6], [110, .75]], { type: 'triangle', vol: 0.12 });
        }
      };

      // ---------- level generation ----------
      const T = (m, x, y) => (x < 0 || y < 0 || x >= MW || y >= MH) ? 1 : m[y * MW + x];
      function bfs(m, sx, sy, passDoors) {
        const d = new Int16Array(MW * MH).fill(-1); const q = [sx + sy * MW]; d[q[0]] = 0;
        for (let qi = 0; qi < q.length; qi++) {
          const i = q[qi], x = i % MW, y = i / MW | 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy, t = T(m, nx, ny);
            if (t === 1 || (t === 2 && !passDoors)) continue;
            const j = nx + ny * MW; if (d[j] >= 0) continue; d[j] = d[i] + 1; q.push(j);
          }
        }
        return d;
      }
      function genLevel(n) {
        seed = n * 9973 + 17 + (n > 16 ? (g.loopSeed | 0) : 0);
        const m = new Uint8Array(MW * MH).fill(1);
        const style = n === 1 ? 2 : [3, 1, 0, 2, 3, 0, 1, 2][n % 8];
        const C = 10, vis = new Uint8Array(C * C);
        const carveCell = (cx, cy) => { for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) m[(1 + 3 * cy + y) * MW + 1 + 3 * cx + x] = 0; };
        const openBetween = (cx, cy, nx, ny) => {
          if (nx !== cx) { const wx = 3 + 3 * Math.min(cx, nx); for (let y = 0; y < 2; y++) m[(1 + 3 * cy + y) * MW + wx] = 0; }
          else { const wy = 3 + 3 * Math.min(cy, ny); for (let x = 0; x < 2; x++) m[wy * MW + 1 + 3 * cx + x] = 0; }
        };
        const st = [[rnd() * C | 0, rnd() * C | 0]]; vis[st[0][1] * C + st[0][0]] = 1; carveCell(st[0][0], st[0][1]);
        while (st.length) {
          const [cx, cy] = st[st.length - 1];
          const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [cx + dx, cy + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < C && y < C && !vis[y * C + x]);
          if (!nb.length) { st.pop(); continue; }
          const [nx, ny] = nb[rnd() * nb.length | 0];
          vis[ny * C + nx] = 1; carveCell(nx, ny); openBetween(cx, cy, nx, ny); st.push([nx, ny]);
        }
        const braid = [0.3, 0.12, 0.65, 0.25][style];
        for (let cy = 0; cy < C; cy++) for (let cx = 0; cx < C; cx++) {
          if (cx + 1 < C && rnd() < braid) openBetween(cx, cy, cx + 1, cy);
          if (cy + 1 < C && rnd() < braid) openBetween(cx, cy, cx, cy + 1);
        }
        if (style === 2) { // open arena: knock out pillars where all four sides are open
          for (let j = 0; j < C - 1; j++) for (let i = 0; i < C - 1; i++) {
            const px = 3 + 3 * i, py = 3 + 3 * j;
            if (!T(m, px - 1, py) && !T(m, px + 1, py) && !T(m, px, py - 1) && !T(m, px, py + 1) && rnd() < 0.8) m[py * MW + px] = 0;
          }
        }
        if (style === 3 || style === 0) { // rooms
          const nr = style === 3 ? 5 : 2;
          for (let k = 0; k < nr; k++) {
            const w = 4 + (rnd() * 5 | 0), h = 4 + (rnd() * 5 | 0), x0 = 1 + (rnd() * (MW - w - 3) | 0), y0 = 1 + (rnd() * (MH - h - 3) | 0);
            for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) m[y * MW + x] = 0;
          }
        }
        // borders
        for (let i = 0; i < MW; i++) { m[i] = 1; m[(MH - 1) * MW + i] = 1; m[i * MW] = 1; m[i * MW + MW - 1] = 1; }
        // start in a corner cell
        const corner = rnd() * 4 | 0;
        const sx = corner & 1 ? 28 : 1, sy = corner & 2 ? 28 : 1;
        m[sy * MW + sx] = 0;
        let d = bfs(m, sx, sy, true);
        // exit: farthest tile
        let best = 0, ex = sx, ey = sy;
        for (let i = 0; i < MW * MH; i++) if (d[i] > best) { best = d[i]; ex = i % MW; ey = i / MW | 0; }
        m[ey * MW + ex] = 3;
        // doors in 2-wide passages that do not cut the start from the exit
        const nDoors = 2 + (n % 3) + (n > 8 ? 1 : 0);
        let placed = 0;
        for (let tries = 0; tries < 80 && placed < nDoors; tries++) {
          const cx = rnd() * C | 0, cy = rnd() * C | 0, horiz = rnd() < 0.5;
          if (horiz ? cx + 1 >= C : cy + 1 >= C) continue;
          const tiles = horiz ? [[3 + 3 * cx, 1 + 3 * cy], [3 + 3 * cx, 2 + 3 * cy]] : [[1 + 3 * cx, 3 + 3 * cy], [2 + 3 * cx, 3 + 3 * cy]];
          if (tiles.some(([x, y]) => T(m, x, y) !== 0 || (Math.abs(x - sx) < 4 && Math.abs(y - sy) < 4))) continue;
          for (const [x, y] of tiles) m[y * MW + x] = 2;
          const dd = bfs(m, sx, sy, false);
          if (dd[ey * MW + ex] < 0) { for (const [x, y] of tiles) m[y * MW + x] = 0; continue; }
          placed++;
        }
        const d0 = bfs(m, sx, sy, false); d = bfs(m, sx, sy, true);
        const occ = new Uint8Array(MW * MH);
        occ[sy * MW + sx] = 1; occ[ey * MW + ex] = 1;
        const pick = (pred) => {
          for (let tries = 0; tries < 400; tries++) {
            const x = 1 + (rnd() * (MW - 2) | 0), y = 1 + (rnd() * (MH - 2) | 0), i = y * MW + x;
            if (m[i] !== 0 || occ[i] || d[i] < 0) continue;
            if (pred && !pred(x, y, i)) continue;
            occ[i] = 1; return [x, y];
          }
          return null;
        };
        const items = [];
        const addItem = (type, pred) => { const p = pick(pred); if (p) items.push({ type, x: p[0] * TS + 2, y: p[1] * TS + 2 }); };
        const behind = (x, y, i) => d0[i] < 0;
        for (let k = 0; k < placed + 1; k++) addItem('key', (x, y, i) => d0[i] >= 0 && d0[i] > 4);
        for (let k = 0; k < 3 + (n % 3); k++) addItem(k === 0 ? 'jug' : 'food');
        addItem('food', behind);
        for (let k = 0; k < 2; k++) addItem('potion');
        addItem('potion', behind);
        for (let k = 0; k < 4; k++) addItem('treasure');
        for (let k = 0; k < 3; k++) addItem('treasure', behind);
        if (n % 3 === 0) addItem(['xarmor', 'xshot', 'xspeed', 'xmagic'][(n / 3 | 0) % 4], behind);
        if (n >= 2 && n % 4 === 2) { const p = pick((x, y, i) => d[i] > 12); if (p) m[p[1] * MW + p[0]] = 4; }
        // generators
        const pool = n === 1 ? ['ghost'] : n === 2 ? ['ghost', 'grunt'] : n === 3 ? ['grunt', 'demon', 'ghost'] :
          ['ghost', 'grunt', 'demon'].concat(n >= 5 ? ['lobber'] : [], n >= 6 ? ['sorcerer'] : [], n >= 9 ? ['demon', 'grunt'] : []);
        const gens = [];
        const nGen = Math.min(16, 4 + n);
        const maxLv = Math.min(3, 1 + Math.floor(n / 4));
        for (let k = 0; k < nGen; k++) {
          const p = pick((x, y, i) => d[i] > 9 && [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].every(([dx, dy]) => T(m, x + dx, y + dy) < 2 && !occ[(y + dy) * MW + x + dx]));
          if (!p) continue;
          const lv = 1 + (rnd() * maxLv | 0);
          gens.push({ x: p[0] * TS, y: p[1] * TS, kind: pool[rnd() * pool.length | 0], hp: lv * 3, lv, t: 30 + (rnd() * 120 | 0) });
        }
        if (n >= 7 && n % 2 === 1) {
          const p = pick((x, y, i) => d[i] > 14);
          if (p) gens.push({ x: p[0] * TS, y: p[1] * TS, kind: 'death', hp: 9, lv: 3, t: 200 });
        }
        return { m, sx, sy, ex, ey, items, gens, style, pal: WALLPAL[(n - 1) % WALLPAL.length] };
      }

      // ---------- game state ----------
      function newGame(hero) {
        g = { hero, score: 0, health: 1500, keys: 0, potions: 0, level: 1, armor: hero.armor, shotP: hero.shot, speed: hero.speed, magicP: hero.magic, msgs: [], loopSeed: 0, lowWarn: false };
        startLevel();
        g.msgs.push({ s: 'WELCOME, ' + hero.name, t: 180 });
      }
      function startLevel() {
        const L = genLevel(g.level);
        g.L = L; g.map = L.m; g.items = L.items; g.gens = L.gens;
        g.mons = []; g.shots = []; g.foes = []; g.fx = []; g.pops = [];
        g.p = { x: L.sx * TS + 2, y: L.sy * TS + 2, dx: 1, dy: 0, fcd: 0, mcd: 0, walk: 0, hurtT: 0 };
        g.levelT = 0; g.wallsExit = false; g.intro = 150; g.exitT = 0; g.flash = 0; g.tick = 0;
        // a few monsters already roaming near each generator
        for (const gn of g.gens) for (let k = 0; k < (gn.kind === 'death' ? 0 : 2); k++) spawnFrom(gn);
        camTo(true);
      }
      let camX = 0, camY = 0;
      function camTo(snap) {
        const tx = Math.max(0, Math.min(MW * TS - VW, g.p.x + 6 - VW / 2)), ty = Math.max(0, Math.min(MH * TS - VH, g.p.y + 6 - VH / 2));
        if (snap) { camX = tx; camY = ty; } else { camX += (tx - camX) * 0.25; camY += (ty - camY) * 0.25; }
      }
      const solidTile = (px, py, forPlayer) => {
        const t = T(g.map, Math.floor(px / TS), Math.floor(py / TS));
        return t === 1 || t === 2;
      };
      function wallHit(x, y, w, h) {
        return solidTile(x, y) || solidTile(x + w - 1, y) || solidTile(x, y + h - 1) || solidTile(x + w - 1, y + h - 1);
      }
      const overlap = (a, b, pad) => Math.abs(a.x - b.x) < 12 + (pad || 0) && Math.abs(a.y - b.y) < 12 + (pad || 0);
      function genBlock(x, y) { for (const gn of g.gens) if (Math.abs(x - gn.x - 2) < 13 && Math.abs(y - gn.y - 2) < 13) return gn; return null; }
      function spawnFrom(gn) {
        if (g.mons.length >= 90) return;
        const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]];
        const s = (wrnd() * 8) | 0;
        for (let k = 0; k < 8; k++) {
          const [dx, dy] = dirs[(s + k) % 8];
          const x = gn.x + 2 + dx * TS, y = gn.y + 2 + dy * TS;
          if (wallHit(x, y, 12, 12) || genBlock(x, y)) continue;
          if (g.mons.some(o => overlap(o, { x, y }))) continue;
          if (g.p && overlap(g.p, { x, y })) continue;
          const lv = gn.kind === 'death' ? 1 : Math.max(1, Math.ceil(gn.hp / 3));
          g.mons.push({ kind: gn.kind, lv, hp: gn.kind === 'death' ? 999 : lv, x, y, cd: 0, t: (wrnd() * 100) | 0, vis: true, drained: 0, face: 1 });
          return;
        }
      }
      function addScore(n, x, y) {
        g.score += n;
        if (x != null && n > 0) g.pops.push({ x, y, s: String(n), t: 40 });
      }
      function msg(s, t) { if (g.msgs.some(m => m.s === s)) return; g.msgs.push({ s, t: t || 150 }); if (g.msgs.length > 2) g.msgs.shift(); }
      function hurt(n, kind) {
        n = Math.max(1, Math.round(n * (1 - g.armor)));
        g.health -= n; g.p.hurtT = 8;
        if ((frame & 7) === 0 || n > 4) snd.hurt();
      }
      function onScreen(x, y) { return x > camX - 16 && x < camX + VW + 4 && y > camY - 16 && y < camY + VH + 4; }
      function doMagic(power) {
        snd.magic(); g.flash = 20;
        for (const m of g.mons) {
          if (!onScreen(m.x, m.y)) continue;
          if (m.kind === 'death') { killMon(m, true); continue; }
          m.hp -= power; if (m.hp <= 0) killMon(m);
        }
        for (const gn of g.gens) {
          if (!onScreen(gn.x, gn.y)) continue;
          gn.hp -= power * 2; if (gn.hp <= 0) killGen(gn);
        }
      }
      function killMon(m, byMagic) {
        if (m.dead) return;
        m.dead = true;
        if (m.kind === 'death') { const v = [1000, 2000, 1000, 4000, 1000, 6000, 8000][wrnd() * 7 | 0]; addScore(byMagic ? v : 0, m.x, m.y); }
        else addScore(MON[m.kind].pts * m.lv, m.x, m.y);
        g.fx.push({ x: m.x + 6, y: m.y + 6, t: 0, col: MON[m.kind].cols[2] });
        snd.kill();
      }
      function killGen(gn) {
        if (gn.dead) return;
        gn.dead = true; addScore(gn.kind === 'death' ? 300 : 10 * gn.lv * 10, gn.x, gn.y);
        g.fx.push({ x: gn.x + 8, y: gn.y + 8, t: 0, col: '#ffd040', big: true }); snd.gen();
      }

      // ---------- update ----------
      function moveEnt(e, dx, dy, isPlayer) {
        let blockedBy = null;
        const tryAxis = (nx, ny) => {
          if (wallHit(nx, ny, 12, 12)) {
            if (isPlayer && g.wallsExit) { levelExit(1); }
            return false;
          }
          const gb = genBlock(nx, ny); if (gb) { blockedBy = blockedBy || gb; return false; }
          if (isPlayer) {
            for (const m of g.mons) if (!m.dead && overlap({ x: nx, y: ny }, m) && !overlap(e, m, -1)) { blockedBy = m; return false; }
          } else {
            if (overlap({ x: nx, y: ny }, g.p)) { blockedBy = g.p; return false; }
            for (const m of near(nx, ny)) if (m !== e && !m.dead && overlap({ x: nx, y: ny }, m) && !overlap(e, m, -1)) return false;
          }
          e.x = nx; e.y = ny; return true;
        };
        const mx = dx !== 0 && tryAxis(e.x + dx, e.y);
        const my = dy !== 0 && tryAxis(e.x, e.y + dy);
        return { moved: mx || my, blockedBy };
      }
      let buckets = new Map();
      function rebucket() {
        buckets = new Map();
        for (const m of g.mons) { const k = (m.x >> 5) * 64 + (m.y >> 5); let b = buckets.get(k); if (!b) buckets.set(k, b = []); b.push(m); }
      }
      function near(x, y) {
        const out = [], bx = x >> 5, by = y >> 5;
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const b = buckets.get((bx + i) * 64 + by + j); if (b) for (const m of b) out.push(m); }
        return out;
      }
      function levelExit(skip) {
        if (g.exitT) return;
        g.exitT = 1; g.skip = skip; snd.exit();
      }
      function lineClear(x0, y0, x1, y1) {
        const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6);
        for (let i = 1; i < n; i++) if (solidTile(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n)) return false;
        return true;
      }
      function updPlay() {
        const p = g.p;
        g.tick++;
        for (const m of g.msgs) m.t--;
        g.msgs = g.msgs.filter(m => m.t > 0);
        for (const f of g.fx) f.t++; g.fx = g.fx.filter(f => f.t < 20);
        for (const q of g.pops) { q.t--; q.y -= 0.4; } g.pops = g.pops.filter(q => q.t > 0);
        if (g.flash > 0) g.flash--;
        if (g.exitT) {
          g.exitT++;
          if (g.exitT > 70) { g.level += g.skip; if (g.level > 16) g.loopSeed = (g.loopSeed || 0) + 7; startLevel();  }
          return;
        }
        if (g.intro > 0) { g.intro--; camTo(); return; }
        if (g.dying) { if (--g.dying === 0) lastLife(); return; }
        g.levelT++;
        // health drains with time
        if (g.tick % 60 === 0) g.health--;
        if (!g.wallsExit && g.levelT > 60 * 150) { g.wallsExit = true; msg('ALL WALLS ARE NOW EXITS', 300); snd.warn(); }
        // input
        let ix = (api.key('ArrowRight') ? 1 : 0) - (api.key('ArrowLeft') ? 1 : 0);
        let iy = (api.key('ArrowDown') ? 1 : 0) - (api.key('ArrowUp') ? 1 : 0);
        const firing = api.key('Space');
        if (ix || iy) { p.dx = ix; p.dy = iy; }
        if (p.fcd > 0) p.fcd--;
        if (p.mcd > 0) p.mcd--;
        if (p.hurtT > 0) p.hurtT--;
        if (firing) {
          if (p.fcd <= 0 && g.shots.length === 0) {
            const l = Math.hypot(p.dx, p.dy) || 1;
            g.shots.push({ x: p.x + 6, y: p.y + 6, dx: p.dx / l * g.hero.shotSp, dy: p.dy / l * g.hero.shotSp });
            p.fcd = 8; snd.shot();
          }
        } else if (ix || iy) {
          const l = Math.hypot(ix, iy), sp = g.speed;
          const steps = 2;
          let blocked = null;
          for (let s = 0; s < steps; s++) { const r = moveEnt(p, ix / l * sp / steps, iy / l * sp / steps, true); if (r.blockedBy) blocked = r.blockedBy; }
          p.walk++;
          // hand-to-hand: walking into a monster or generator fights it
          if (blocked && blocked !== p && p.mcd <= 0) {
            p.mcd = 12;
            if (g.gens.includes(blocked)) { blocked.hp -= g.hero.melee; snd.hit(); if (blocked.hp <= 0) killGen(blocked); else blocked.lv = Math.ceil(blocked.hp / 3); }
            else if (g.mons.includes(blocked) && blocked.kind !== 'death' && !blocked.dead) { blocked.hp -= g.hero.melee; snd.hit(); if (blocked.hp <= 0) killMon(blocked); else blocked.lv = Math.max(1, blocked.hp); }
          }
        }
        if (api.anyPressed('KeyX', 'KeyZ') && g.potions > 0) { g.potions--; doMagic(g.magicP); }
        // tile under player
        const ctx_ = Math.floor((p.x + 6) / TS), cty = Math.floor((p.y + 6) / TS), tt = T(g.map, ctx_, cty);
        if (tt === 3) { levelExit(1); return; }
        if (tt === 4) { levelExit(3); msg('EXIT TO LEVEL ' + (g.level + 3), 200); return; }
        // doors: touching with a key opens the whole door
        if (g.keys > 0) {
          for (const [dx, dy] of [[0, -3], [13, 6], [6, 13], [-3, 6]]) {
            const tx = Math.floor((p.x + dx + (dx === 13 ? 2 : 0)) / TS), ty = Math.floor((p.y + dy + (dy === 13 ? 2 : 0)) / TS);
            if (T(g.map, tx, ty) === 2) { openDoor(tx, ty); g.keys--; snd.door(); addScore(0); break; }
          }
        }
        // items
        for (const it of g.items) {
          if (it.dead || !overlap(p, it, -2)) continue;
          it.dead = true;
          switch (it.type) {
            case 'food': case 'jug': g.health += 100; snd.food(); addScore(0); g.pops.push({ x: it.x, y: it.y, s: '+100', t: 40 }); break;
            case 'key': g.keys++; addScore(100, it.x, it.y); snd.key(); break;
            case 'potion': g.potions++; addScore(50, it.x, it.y); snd.key(); break;
            case 'treasure': addScore(100, it.x, it.y); snd.treasure(); break;
            case 'xarmor': g.armor = Math.min(0.6, g.armor + 0.15); msg('EXTRA ARMOR'); snd.treasure(); break;
            case 'xshot': g.shotP++; msg('EXTRA SHOT POWER'); snd.treasure(); break;
            case 'xspeed': g.speed += 0.25; msg('EXTRA SPEED'); snd.treasure(); break;
            case 'xmagic': g.magicP++; msg('EXTRA MAGIC POWER'); snd.treasure(); break;
          }
        }
        g.items = g.items.filter(it => !it.dead);
        updShots();
        rebucket();
        updMons();
        updGens();
        updFoes();
        g.mons = g.mons.filter(m => !m.dead); g.gens = g.gens.filter(gn => !gn.dead);
        camTo();
        // announcer
        if (g.health < 200 && !g.lowWarn) { g.lowWarn = true; msg(g.hero.name + ' NEEDS FOOD, BADLY!', 220); snd.warn(); }
        if (g.health >= 300) g.lowWarn = false;
        if (g.health <= 0) { g.health = 0; g.dying = 60; au.tone(400, 1.0, { type: 'sawtooth', vol: 0.12, slideTo: 40 }); }
      }
      function openDoor(tx, ty) {
        const st = [[tx, ty]];
        while (st.length) {
          const [x, y] = st.pop();
          if (T(g.map, x, y) !== 2) continue;
          g.map[y * MW + x] = 0; g.fx.push({ x: x * TS + 8, y: y * TS + 8, t: 0, col: '#e0b040' });
          st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }
      }
      function updShots() {
        for (const s of g.shots) {
          for (let k = 0; k < 2 && !s.dead; k++) {
            s.x += s.dx / 2; s.y += s.dy / 2;
            if (solidTile(s.x, s.y)) { s.dead = true; g.fx.push({ x: s.x, y: s.y, t: 10, col: '#ffffff' }); break; }
            for (const m of g.mons) {
              if (m.dead || Math.abs(m.x + 6 - s.x) > 8 || Math.abs(m.y + 6 - s.y) > 8) continue;
              if (m.kind === 'sorcerer' && !m.vis) continue;
              s.dead = true;
              if (m.kind === 'death') { g.fx.push({ x: s.x, y: s.y, t: 10, col: '#ff80ff' }); snd.hit(); break; }
              m.hp -= g.shotP; snd.hit();
              if (m.hp <= 0) killMon(m); else m.lv = Math.max(1, m.hp);
              break;
            }
            if (s.dead) break;
            for (const gn of g.gens) {
              if (gn.dead || s.x < gn.x || s.x > gn.x + TS || s.y < gn.y || s.y > gn.y + TS) continue;
              s.dead = true; gn.hp -= g.shotP; snd.hit();
              if (gn.hp <= 0) killGen(gn); else gn.lv = Math.ceil(gn.hp / 3);
              break;
            }
            if (s.dead) break;
            for (const it of g.items) {
              if (it.dead || Math.abs(it.x + 6 - s.x) > 7 || Math.abs(it.y + 6 - s.y) > 7) continue;
              if (it.type === 'jug' || it.type === 'food' && g.level >= 4) { it.dead = true; s.dead = true; msg(g.hero.name + ' SHOT THE FOOD'); snd.hurt(); }
              else if (it.type === 'potion') { it.dead = true; s.dead = true; doMagic(Math.max(1, g.magicP - 1)); }
              break;
            }
          }
          if (Math.abs(s.x - g.p.x) > 260 || Math.abs(s.y - g.p.y) > 260) s.dead = true;
        }
        g.shots = g.shots.filter(s => !s.dead);
        g.items = g.items.filter(it => !it.dead);
      }
      function updMons() {
        const p = g.p;
        for (const m of g.mons) {
          if (m.dead) continue;
          m.t++;
          const ddx = p.x - m.x, ddy = p.y - m.y, dist = Math.hypot(ddx, ddy);
          if (dist > 280) continue;
          if (m.cd > 0) m.cd--;
          const def = MON[m.kind];
          let sx = Math.abs(ddx) > 2 ? Math.sign(ddx) : 0, sy = Math.abs(ddy) > 2 ? Math.sign(ddy) : 0;
          let sp = def.sp + Math.min(0.4, g.level * 0.02);
          if (m.kind === 'lobber') {
            if (dist < 70) { sx = -sx; sy = -sy; }
            else if (dist < 130) { sx = 0; sy = 0; }
            if (m.cd <= 0 && dist < 170) {
              m.cd = 110; g.foes.push({ type: 'rock', x0: m.x + 6, y0: m.y + 6, x1: p.x + 6, y1: p.y + 6, t: 0, T: 44 }); snd.fire();
            }
          }
          if (m.kind === 'sorcerer') m.vis = ((m.t >> 5) & 3) !== 0;
          if (m.kind === 'demon' && m.cd <= 0 && dist < 150 && (Math.abs(ddx) < 6 || Math.abs(ddy) < 6 || Math.abs(Math.abs(ddx) - Math.abs(ddy)) < 8) && lineClear(m.x + 6, m.y + 6, p.x + 6, p.y + 6)) {
            m.cd = 90; const l = dist || 1;
            g.foes.push({ type: 'fire', x: m.x + 6, y: m.y + 6, dx: ddx / l * 2.4, dy: ddy / l * 2.4, t: 0 }); snd.fire();
          }
          if (sx) m.face = sx;
          const l = Math.hypot(sx, sy) || 1;
          const r = moveEnt(m, sx / l * sp, sy / l * sp, false);
          if (!r.moved && !r.blockedBy && (sx || sy)) {
            // slide around corners: try each axis alone at full speed
            if (sx) moveEnt(m, 0, (m.t >> 6) & 1 ? sp : -sp, false); else moveEnt(m, (m.t >> 6) & 1 ? sp : -sp, 0, false);
          }
          // contact
          const touching = Math.abs(p.x - m.x) < 14 && Math.abs(p.y - m.y) < 14;
          if (touching) {
            if (m.kind === 'ghost') { hurt(def.dmg * m.lv); m.dead = true; g.fx.push({ x: m.x + 6, y: m.y + 6, t: 0, col: '#fff' }); continue; }
            if (m.kind === 'death') {
              g.health -= 2; m.drained += 2; g.p.hurtT = 4; if ((frame & 3) === 0) snd.drain();
              if (m.drained >= 200) { m.dead = true; g.fx.push({ x: m.x + 6, y: m.y + 6, t: 0, col: '#ff80ff' }); }
              continue;
            }
            if (m.cd <= 0 && (m.kind !== 'sorcerer' || m.vis)) { m.cd = 30; hurt(def.dmg * m.lv); }
          }
        }
      }
      function updGens() {
        const p = g.p;
        for (const gn of g.gens) {
          if (Math.abs(gn.x - p.x) > 200 || Math.abs(gn.y - p.y) > 200) continue;
          if (--gn.t <= 0) {
            gn.t = Math.max(45, (gn.kind === 'death' ? 900 : 150) - g.level * 6) + (wrnd() * 60 | 0);
            if (gn.kind === 'death' && g.mons.some(m => m.kind === 'death')) continue;
            spawnFrom(gn);
          }
        }
      }
      function updFoes() {
        const p = g.p;
        for (const f of g.foes) {
          f.t++;
          if (f.type === 'fire') {
            f.x += f.dx; f.y += f.dy;
            if (solidTile(f.x, f.y) || f.t > 120) { f.dead = true; continue; }
            if (Math.abs(f.x - p.x - 6) < 7 && Math.abs(f.y - p.y - 6) < 7) { f.dead = true; hurt(10); }
          } else if (f.type === 'rock') {
            if (f.t >= f.T) {
              f.dead = true; g.fx.push({ x: f.x1, y: f.y1, t: 6, col: '#a0a0a0' });
              if (Math.abs(f.x1 - p.x - 6) < 10 && Math.abs(f.y1 - p.y - 6) < 10) hurt(8);
            }
          }
        }
        g.foes = g.foes.filter(f => !f.dead);
      }
      function lastLife() {
        g.phase = 'wait';
        const cg = g;
        const end = () => { if (g === cg) gameOver(); };
        if (!api.offerContinue) { end(); return; }
        g.waiting = true;
        api.offerContinue(() => { if (g === cg) { g.waiting = false; g.health = 1500; msg('WELCOME BACK, ' + g.hero.name, 180); } }, end);
      }
      function gameOver() {
        api.setHiScore(g.score); hi = Math.max(hi, g.score);
        mode = 'over'; g.overT = 0;
        au.melody([[294, .3], [277, .3], [262, .3], [247, .8]], { type: 'square', vol: 0.09 });
      }

      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (api.credits > lastCred) au.tone(1760, 0.06, { type: 'square', vol: 0.07, slideTo: 2640 });
        lastCred = api.credits;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'select'; selT = 0; snd.theme(); }
          return;
        }
        if (mode === 'select') {
          selT++;
          if (api.pressed('ArrowLeft') || api.pressed('ArrowUp')) { sel = (sel + 3) % 4; au.tone(600, 0.04, { vol: 0.08 }); }
          if (api.pressed('ArrowRight') || api.pressed('ArrowDown')) { sel = (sel + 1) % 4; au.tone(600, 0.04, { vol: 0.08 }); }
          if ((selT > 20 && api.anyPressed('Enter', 'Space')) || selT > 1200) {
            wr = (Date.now() & 0xffff) + 1;
            newGame(HEROES[sel]); mode = 'play';
          }
          return;
        }
        if (mode === 'play') { if (!g.waiting) updPlay(); return; }
        if (mode === 'over') { if (++g.overT > 300 || (g.overT > 60 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; titleT = 0; } }
      }

      // ---------- drawing ----------
      function drawSpr(ctx, rows, x, y, pal, flip) {
        x = Math.round(x); y = Math.round(y);
        for (let r = 0; r < rows.length; r++) {
          const row = rows[r];
          for (let c = 0; c < row.length; c++) {
            const ch = row[c]; if (ch === '.') continue;
            const col = pal[ch]; if (!col) continue;
            ctx.fillStyle = col; ctx.fillRect(flip ? x + 11 - c : x + c, y + r, 1, 1);
          }
        }
      }
      function heroPal(h, hurtFlash) {
        return hurtFlash ? { a: '#fff', b: '#fff', s: '#fff', k: '#fff', w: '#fff', y: '#fff' } : { a: h.a, b: h.b, s: '#f0b080', k: '#000', w: '#c0c0d0', y: '#f0d040' };
      }
      function monPal(m) {
        const d = MON[m.kind], c = d.cols[Math.max(0, Math.min(2, m.lv - 1))];
        switch (m.kind) {
          case 'ghost': return { w: c, g: '#606060', k: '#000' };
          case 'grunt': return { a: c, b: '#506030', k: '#000', w: '#a07040', s: '#e0a070' };
          case 'demon': return { a: c, b: '#601010', y: '#f0e040', k: '#000', w: '#fff' };
          case 'lobber': return { a: c, b: '#304070', k: '#000', w: '#909090', s: '#e0a070' };
          case 'sorcerer': return { a: c, k: '#000', y: '#f0f040', s: '#e0a070' };
          case 'death': return { k: '#28202e', w: ((frame >> 3) & 1) ? '#ff80c0' : '#e0e0e0' };
        }
        return {};
      }
      function drawTile(ctx, t, sx, sy, tx, ty) {
        const pal = g.L.pal;
        if (t === 1) {
          if (g.wallsExit && ((frame >> 3) & 1)) { ctx.fillStyle = '#e0e0e0'; ctx.fillRect(sx, sy, TS, TS); return; }
          ctx.fillStyle = pal[0]; ctx.fillRect(sx, sy, TS, TS);
          const up = T(g.map, tx, ty - 1) === 1, dn = T(g.map, tx, ty + 1) === 1, lf = T(g.map, tx - 1, ty) === 1, rt = T(g.map, tx + 1, ty) === 1;
          ctx.fillStyle = pal[1]; if (!up) ctx.fillRect(sx, sy, TS, 2); if (!lf) ctx.fillRect(sx, sy, 2, TS);
          ctx.fillStyle = pal[2]; if (!dn) ctx.fillRect(sx, sy + TS - 3, TS, 3); if (!rt) ctx.fillRect(sx + TS - 2, sy, 2, TS);
          // brick lines
          ctx.fillStyle = pal[2];
          ctx.fillRect(sx, sy + 7, TS, 1);
          ctx.fillRect(sx + ((ty & 1) ? 4 : 11), sy + 2, 1, 5); ctx.fillRect(sx + ((ty & 1) ? 11 : 4), sy + 8, 1, 5);
          return;
        }
        ctx.fillStyle = pal[3]; ctx.fillRect(sx, sy, TS, TS);
        ctx.fillStyle = '#ffffff0c'; if ((tx + ty) & 1) ctx.fillRect(sx, sy, TS, TS);
        ctx.fillStyle = '#00000060'; ctx.fillRect(sx, sy, TS, 1); ctx.fillRect(sx, sy, 1, TS);
        // wall shadow onto floor
        if (T(g.map, tx - 1, ty) === 1) { ctx.fillStyle = '#00000080'; ctx.fillRect(sx, sy, 3, TS); }
        if (T(g.map, tx, ty - 1) === 1) { ctx.fillStyle = '#00000080'; ctx.fillRect(sx, sy, TS, 3); }
        if (t === 2) {
          ctx.fillStyle = '#8a5a20'; ctx.fillRect(sx, sy, TS, TS);
          ctx.fillStyle = '#e0b040'; ctx.fillRect(sx + 1, sy + 3, TS - 2, 2); ctx.fillRect(sx + 1, sy + 11, TS - 2, 2);
          ctx.fillStyle = '#5a3a10'; ctx.fillRect(sx + 4, sy, 2, TS); ctx.fillRect(sx + 10, sy, 2, TS);
          ctx.fillStyle = '#f0d060'; ctx.fillRect(sx + 7, sy + 7, 2, 2);
        } else if (t === 3 || t === 4) {
          ctx.fillStyle = t === 3 ? '#e8d8a0' : '#a0e8e0'; ctx.fillRect(sx + 1, sy + 1, TS - 2, TS - 2);
          ctx.fillStyle = '#403020';
          for (let k = 0; k < 4; k++) ctx.fillRect(sx + 2 + k * 2, sy + 9 + k, TS - 4 - k * 4, 1);
          if (t === 3) tiny(ctx, 'EXIT', sx + 1, sy + 2, ((frame >> 4) & 1) ? '#c02010' : '#000');
          else tiny(ctx, 'TO' + Math.min(99, g.level + 3), sx, sy + 2, '#103060');
        }
      }
      function drawItem(ctx, it, x, y) {
        switch (it.type) {
          case 'food':
            ctx.fillStyle = '#e0e0e0'; ctx.fillRect(x - 1, y + 7, 14, 4); ctx.fillStyle = '#b0b0b0'; ctx.fillRect(x, y + 10, 12, 1);
            ctx.fillStyle = '#a04818'; ctx.fillRect(x + 2, y + 3, 8, 5); ctx.fillStyle = '#d07030'; ctx.fillRect(x + 3, y + 3, 5, 2);
            ctx.fillStyle = '#f0f0e0'; ctx.fillRect(x + 9, y + 1, 2, 3); break;
          case 'jug':
            ctx.fillStyle = '#c08040'; ctx.fillRect(x + 3, y + 3, 7, 9); ctx.fillRect(x + 4, y, 4, 3); ctx.fillStyle = '#804818'; ctx.fillRect(x + 3, y + 6, 7, 1);
            ctx.fillStyle = '#c08040'; ctx.fillRect(x + 10, y + 4, 2, 4); ctx.fillStyle = '#f0e0b0'; tiny(ctx, 'X', x + 5, y + 7, '#402010'); break;
          case 'key':
            ctx.fillStyle = '#f0d040'; ctx.fillRect(x, y + 4, 5, 5); ctx.fillStyle = '#000'; ctx.fillRect(x + 2, y + 6, 1, 1);
            ctx.fillStyle = '#f0d040'; ctx.fillRect(x + 5, y + 6, 7, 2); ctx.fillRect(x + 9, y + 8, 1, 2); ctx.fillRect(x + 11, y + 8, 1, 3); break;
          case 'potion': case 'xarmor': case 'xshot': case 'xspeed': case 'xmagic': {
            const c = it.type === 'potion' ? '#3070f0' : '#f08020';
            ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x + 5, y, 3, 3);
            ctx.fillStyle = c; ctx.fillRect(x + 4, y + 3, 5, 2); ctx.fillRect(x + 2, y + 5, 9, 7);
            ctx.fillStyle = '#ffffff80'; ctx.fillRect(x + 3, y + 6, 2, 3);
            if (it.type !== 'potion') tiny(ctx, '+', x + 5, y + 6, '#fff');
            break;
          }
          case 'treasure':
            ctx.fillStyle = '#8a5020'; ctx.fillRect(x, y + 4, 13, 8); ctx.fillStyle = '#a86830'; ctx.fillRect(x, y + 2, 13, 3);
            ctx.fillStyle = '#f0d040'; ctx.fillRect(x, y + 5, 13, 1); ctx.fillRect(x + 5, y + 4, 3, 4);
            if ((frame + x) % 40 < 6) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 10, y + 1, 1, 1); } break;
        }
      }
      function drawGen(ctx, gn, x, y) {
        const lv = Math.max(1, Math.ceil(gn.hp / 3));
        if (gn.kind === 'ghost') {
          // pile of bones
          ctx.fillStyle = ['#807860', '#a8a080', '#e0d8c0'][lv - 1];
          ctx.fillRect(x + 2, y + 9, 12, 5); ctx.fillRect(x + 4, y + 6, 8, 3); ctx.fillRect(x + 6, y + 3, 4, 3);
          ctx.fillStyle = '#403828'; ctx.fillRect(x + 6, y + 4, 1, 1); ctx.fillRect(x + 9, y + 4, 1, 1);
          ctx.fillRect(x + 3, y + 11, 3, 1); ctx.fillRect(x + 10, y + 12, 3, 1);
        } else if (gn.kind === 'death') {
          ctx.fillStyle = '#30283a'; ctx.fillRect(x + 1, y + 1, 14, 14); ctx.fillStyle = '#ff80c0'; ctx.fillRect(x + 4, y + 4, 8, 8);
          ctx.fillStyle = '#000'; ctx.fillRect(x + 5, y + 6, 2, 2); ctx.fillRect(x + 9, y + 6, 2, 2); ctx.fillRect(x + 7, y + 9, 2, 2);
        } else {
          const c = MON[gn.kind].cols[lv - 1];
          ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 1, y + 1, 14, 14);
          ctx.fillStyle = c; ctx.fillRect(x + 2, y + 2, 12, 12);
          ctx.fillStyle = '#00000080'; ctx.fillRect(x + 2, y + 12, 12, 2); ctx.fillRect(x + 12, y + 2, 2, 12);
          ctx.fillStyle = '#e8e0c8'; ctx.fillRect(x + 5, y + 4, 6, 5); ctx.fillRect(x + 6, y + 9, 4, 2);
          ctx.fillStyle = '#000'; ctx.fillRect(x + 6, y + 6, 1, 2); ctx.fillRect(x + 9, y + 6, 1, 2);
          for (let k = 0; k < lv; k++) { ctx.fillStyle = '#f0d040'; ctx.fillRect(x + 3 + k * 4, y + 13, 2, 1); }
        }
      }
      function drawPlay(ctx) {
        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();
        const cx = Math.round(camX), cy = Math.round(camY);
        const tx0 = Math.floor(cx / TS), ty0 = Math.floor(cy / TS);
        for (let ty = ty0; ty <= ty0 + VH / TS + 1; ty++) for (let tx = tx0; tx <= tx0 + VW / TS + 1; tx++) drawTile(ctx, T(g.map, tx, ty), tx * TS - cx, ty * TS - cy, tx, ty);
        for (const it of g.items) if (onScreen(it.x, it.y)) drawItem(ctx, it, it.x - cx, it.y - cy);
        for (const gn of g.gens) if (onScreen(gn.x, gn.y)) drawGen(ctx, gn, gn.x - cx, gn.y - cy);
        for (const m of g.mons) {
          if (!onScreen(m.x, m.y)) continue;
          if (m.kind === 'sorcerer' && !m.vis) { if ((frame & 3) === 0) { ctx.fillStyle = '#b050d060'; ctx.fillRect(m.x - cx + 4, m.y - cy + 2, 4, 8); } continue; }
          const bob = (m.t >> 3) & 1;
          drawSpr(ctx, SPR[m.kind], m.x - cx, m.y - cy - bob, monPal(m), m.face < 0);
        }
        // player
        const p = g.p, hp = HEROES.find(h => h.id === g.hero.id);
        if (!(g.dying && (frame & 2))) drawSpr(ctx, SPR[g.hero.id], p.x - cx, p.y - cy - ((p.walk >> 3) & 1), heroPal(hp, p.hurtT > 0 && (frame & 2)), p.dx < 0);
        // shots
        for (const s of g.shots) {
          const x = s.x - cx, y = s.y - cy;
          ctx.fillStyle = g.hero.id === 'warrior' ? '#c0c0d0' : g.hero.id === 'valkyrie' ? '#e0e0f0' : g.hero.id === 'wizard' ? '#ff8020' : '#a0ff60';
          const a = frame & 3;
          if (g.hero.id === 'warrior') { ctx.fillRect(x - 3, y - 1, 6, 2); ctx.fillRect(x - 1, y - 3, 2, 6); ctx.fillStyle = '#806040'; ctx.fillRect(x - 1 + (a & 1) * 2 - 1, y - 1, 2, 2); }
          else if (g.hero.id === 'wizard') { ctx.fillRect(x - 3, y - 3, 6, 6); ctx.fillStyle = '#ffe040'; ctx.fillRect(x - 1, y - 1, 3, 3); }
          else { ctx.fillRect(x - 1 - s.dx * 0.8, y - 1 - s.dy * 0.8, 3, 3); ctx.fillRect(x - 1, y - 1, 3, 3); ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 1, 1); }
        }
        for (const f of g.foes) {
          if (f.type === 'fire') { ctx.fillStyle = (frame & 2) ? '#ff4010' : '#ffd040'; ctx.fillRect(f.x - cx - 3, f.y - cy - 3, 6, 6); ctx.fillStyle = '#fff0a0'; ctx.fillRect(f.x - cx - 1, f.y - cy - 1, 2, 2); }
          else {
            const k = f.t / f.T, x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k - Math.sin(k * Math.PI) * 40;
            ctx.fillStyle = '#00000080'; ctx.fillRect(f.x0 + (f.x1 - f.x0) * k - cx - 2, f.y0 + (f.y1 - f.y0) * k - cy, 4, 2);
            ctx.fillStyle = '#b0b0b0'; ctx.fillRect(x - cx - 2, y - cy - 2, 5, 5); ctx.fillStyle = '#707070'; ctx.fillRect(x - cx, y - cy, 2, 2);
          }
        }
        for (const f of g.fx) {
          const r = f.big ? f.t * 1.4 : f.t * 0.8;
          ctx.fillStyle = f.col;
          for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.fillRect(Math.round(f.x - cx + Math.cos(a) * r), Math.round(f.y - cy + Math.sin(a) * r), 2, 2); }
        }
        for (const q of g.pops) text(ctx, q.s, q.x - cx + 6, q.y - cy, '#ffffff', 1, 'center');
        if (g.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${(g.flash / 20 * 0.7).toFixed(2)})`; ctx.fillRect(0, 0, VW, VH); }
        if (g.exitT) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, g.exitT / 60).toFixed(2)})`; ctx.fillRect(0, 0, VW, VH); }
        if (g.intro > 0) {
          ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(10, 80, VW - 20, 56);
          text(ctx, 'LEVEL ' + g.level, VW / 2, 88, '#f0d040', 2, 'center');
          const hint = HINTS[(g.level - 1) % HINTS.length].split('|');
          hint.forEach((h, i) => text(ctx, h, VW / 2, 112 + i * 10 - (hint.length - 1) * 5, '#ffffff', 1, 'center'));
        }
        // messages
        g.msgs.forEach((m, i) => {
          const y = VH - 22 + i * 10 - (g.msgs.length - 1) * 10;
          ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(0, y - 2, VW, 11);
          text(ctx, m.s, VW / 2, y, (m.t >> 3) & 1 ? '#ffffff' : '#f0d040', 1, 'center');
        });
        ctx.restore();
      }
      function drawPanel(ctx) {
        ctx.fillStyle = '#100804'; ctx.fillRect(VW, 0, W - VW, H);
        ctx.fillStyle = '#5a3a18'; ctx.fillRect(VW, 0, 2, H);
        text(ctx, 'GAUNTLET', VW + 41, 6, '#e8b030', 1, 'center');
        const h = g.hero;
        ctx.fillStyle = h.b; ctx.fillRect(VW + 6, 20, 70, 74);
        ctx.fillStyle = '#000'; ctx.fillRect(VW + 8, 22, 66, 70);
        text(ctx, h.name, VW + 41, 26, h.a, 1, 'center');
        drawSpr(ctx, SPR[h.id], VW + 11, 40, heroPal(h), false);
        text(ctx, 'HEALTH', VW + 74, 38, '#c0c0c0', 1, 'right');
        text(ctx, String(g.health), VW + 74, 48, g.health < 200 && (frame & 16) ? '#ff4040' : '#ffffff', 1, 'right');
        text(ctx, 'SCORE', VW + 12, 60, '#c0c0c0', 1);
        text(ctx, String(g.score), VW + 72, 70, '#ffffff', 1, 'right');
        // inventory
        for (let i = 0; i < Math.min(6, g.keys); i++) drawItem(ctx, { type: 'key' }, VW + 10 + i * 10, 78);
        for (let i = 0; i < Math.min(6, g.potions); i++) drawItem(ctx, { type: 'potion' }, VW + 8 + i * 11, 98);
        text(ctx, 'LEVEL', VW + 41, 120, '#c0c0c0', 1, 'center');
        text(ctx, String(g.level), VW + 41, 130, '#f0d040', 2, 'center');
        text(ctx, 'HI', VW + 10, 154, '#c0c0c0', 1);
        text(ctx, String(Math.max(hi, g.score)), VW + 72, 154, '#c0c0c0', 1, 'right');
        text(ctx, 'X: MAGIC', VW + 41, 176, '#6080ff', 1, 'center');
        text(ctx, 'HOLD SPACE', VW + 41, 190, '#808080', 1, 'center');
        text(ctx, 'TO SHOOT', VW + 41, 199, '#808080', 1, 'center');
        if (g.wallsExit && (frame & 16)) text(ctx, 'WALLS=EXIT', VW + 41, 218, '#ff8040', 1, 'center');
        text(ctx, credStr(), VW + 41, 230, '#606060', 1, 'center');
      }
      function drawLogo(ctx, y) {
        const t = 'GAUNTLET';
        for (let i = 0; i < t.length; i++) {
          text(ctx, t[i], 50 + i * 28 + 2, y + 2, '#3a1a04', 4);
          text(ctx, t[i], 50 + i * 28, y, '#c87818', 4);
          text(ctx, t[i], 50 + i * 28, y - 1, i % 2 ? '#f0c040' : '#e8a828', 4);
        }
        ctx.fillStyle = '#c87818'; ctx.fillRect(40, y + 32, 240, 2);
      }
      function drawTitle(ctx) {
        // stone background
        ctx.fillStyle = '#1a120c'; ctx.fillRect(0, 0, W, H);
        for (let y = 0; y < H; y += 16) for (let x = ((y >> 4) & 1) * 8 - 8; x < W; x += 16) { ctx.fillStyle = '#24180e'; ctx.fillRect(x + 1, y + 1, 14, 14); }
        const page = (titleT / 400 | 0) % 3;
        drawLogo(ctx, 18);
        if (page === 0) {
          HEROES.forEach((h, i) => {
            const x = 30 + i * 72;
            drawSpr(ctx, SPR[h.id], x + 10, 80 + ((frame >> 4) + i & 1), heroPal(h), false);
            text(ctx, h.name, x + 16, 100, h.a, 1, 'center');
            text(ctx, h.who, x + 16, 110, '#a08060', 1, 'center');
          });
          text(ctx, 'FOUR HEROES ENTER THE DUNGEON', W / 2, 140, '#ffffff', 1, 'center');
          text(ctx, 'FIND THE EXIT ON EACH LEVEL', W / 2, 152, '#ffffff', 1, 'center');
          text(ctx, 'FOOD RESTORES HEALTH', W / 2, 164, '#f0d040', 1, 'center');
        } else if (page === 1) {
          text(ctx, 'THE MONSTERS', W / 2, 62, '#e02818', 1, 'center');
          const ks = ['ghost', 'grunt', 'demon', 'lobber', 'sorcerer', 'death'];
          const nm = ['GHOST', 'GRUNT', 'DEMON', 'LOBBER', 'SORCERER', 'DEATH'];
          ks.forEach((k, i) => {
            const x = i < 3 ? 60 : 180, y = 80 + (i % 3) * 26;
            drawSpr(ctx, SPR[k], x - 20, y - 2, monPal({ kind: k, lv: 3 }), false);
            text(ctx, nm[i], x, y + 2, '#ffffff', 1);
          });
          text(ctx, 'DESTROY THE GENERATORS', W / 2, 162, '#f0d040', 1, 'center');
        } else {
          text(ctx, 'HIGH SCORE', W / 2, 76, '#ffffff', 1, 'center');
          text(ctx, String(hi), W / 2, 92, '#f0d040', 3, 'center');
          text(ctx, 'HEALTH DRAINS WITH TIME', W / 2, 132, '#c0c0c0', 1, 'center');
          text(ctx, 'ONLY MAGIC KILLS DEATH', W / 2, 144, '#c0c0c0', 1, 'center');
          text(ctx, 'DON\'T SHOOT THE FOOD', W / 2, 156, '#c0c0c0', 1, 'center');
        }
        const blink = (frame >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 192, '#ffffff', 1, 'center'); }
        else if (api.credits === 0) { if (blink) text(ctx, 'INSERT COIN', W / 2, 192, '#ffffff', 1, 'center'); }
        else text(ctx, 'PUSH START', W / 2, 192, blink ? '#ffffff' : '#888888', 1, 'center');
        text(ctx, credStr(), 8, 228, '#888888', 1);
        text(ctx, '\u00a9 1985 ATARI GAMES', W - 8, 228, '#888888', 1, 'right');
      }
      function drawSelect(ctx) {
        ctx.fillStyle = '#100804'; ctx.fillRect(0, 0, W, H);
        drawLogo(ctx, 10);
        text(ctx, 'SELECT HERO', W / 2, 52, '#ffffff', 1, 'center');
        HEROES.forEach((h, i) => {
          const x = 8 + i * 78, on = i === sel;
          ctx.fillStyle = on ? h.a : '#3a2a1a'; ctx.fillRect(x, 64, 70, 130);
          ctx.fillStyle = '#000'; ctx.fillRect(x + 2, 66, 66, 126);
          drawSpr(ctx, SPR[h.id], x + 29, 72 + (on ? ((frame >> 3) & 1) : 0), heroPal(h), false);
          text(ctx, h.name, x + 35, 90, on ? h.a : '#808080', 1, 'center');
          STATNAMES.forEach((s, k) => {
            text(ctx, s.split(' ')[0].slice(0, 5), x + 5, 104 + k * 17, '#a0a0a0', 1);
            for (let b = 0; b < 4; b++) { ctx.fillStyle = b < h.stats[k] ? (on ? h.a : '#606060') : '#202020'; ctx.fillRect(x + 6 + b * 15, 113 + k * 17, 13, 4); }
          });
        });
        text(ctx, 'ARROWS CHOOSE - SPACE TO ENTER', W / 2, 210, '#f0d040', 1, 'center');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { drawTitle(ctx); return; }
        if (mode === 'select') { drawSelect(ctx); return; }
        drawPlay(ctx); drawPanel(ctx);
        if (mode === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(20, 90, 200, 50);
          text(ctx, 'GAME OVER', 120, 100, '#e02818', 2, 'center');
          text(ctx, 'SCORE ' + g.score, 120, 124, '#ffffff', 1, 'center');
        }
      }
      return { update, render, destroy() { } };
    }
  });
})();
