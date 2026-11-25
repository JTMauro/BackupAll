// Tron (Bally Midway, 1982) — four sub-games, raster recreation
(function () {
  'use strict';
  const W = 256, H = 240, FY = 18; // field top

  // ---------- 5x7 bitmap font ----------
  const FONT = {
    '0': '0E11131519110E', '1': '040C040404040E', '2': '0E11010204081F', '3': '1F02040201110E', '4': '02060A121F0202',
    '5': '1F101E0101110E', '6': '0608101E11110E', '7': '1F010204080808', '8': '0E11110E11110E', '9': '0E11110F01020C',
    A: '0E1111111F1111', B: '1E11111E11111E', C: '0E11101010110E', D: '1C12111111121C', E: '1F10101E10101F',
    F: '1F10101E101010', G: '0E11101711110F', H: '1111111F111111', I: '0E04040404040E', J: '0702020202120C',
    K: '11121418141211', L: '1010101010101F', M: '111B1515111111', N: '11111915131111', O: '0E11111111110E',
    P: '1E11111E101010', Q: '0E11111115120D', R: '1E11111E141211', S: '0F10100E01011E', T: '1F040404040404',
    U: '1111111111110E', V: '11111111110A04', W: '1111111515150A', X: '11110A040A1111', Y: '1111110A040404',
    Z: '1F01020408101F', '-': '0000001F000000', '.': '00000000000C0C', ':': '000C0C000C0C00', '!': '04040404040004',
    '/': '01010204081010', '=': '00001F001F0000', '(': '02040808080402', ')': '08040202020408', ',': '000000000C0408',
    '?': '0E110102040004', '>': '08040201020408', '<': '02040810080402', '+': '0004041F040400', "'": '04040800000000'
  };
  function textW(s, sc) { return String(s).length * 6 * sc - sc; }
  function drawText(ctx, s, x, y, col, sc, align) {
    s = String(s).toUpperCase(); sc = sc || 1;
    if (align === 'center') x = Math.round(x - textW(s, sc) / 2); else if (align === 'right') x = Math.round(x - textW(s, sc));
    for (const ch of s) {
      const g = FONT[ch];
      if (g) for (let r = 0; r < 7; r++) {
        const bits = parseInt(g.substr(r * 2, 2), 16);
        ctx.fillStyle = typeof col === 'function' ? col(r) : col;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + c * sc, y + r * sc, sc, sc);
      }
      x += 6 * sc;
    }
  }

  // ---------- sprites ----------
  const BLUE = { B: '#2a8cff', W: '#d0f4ff', b: '#0a3a90', T: '#2a8cff', t: '#0a3a90' };
  const ORNG = { B: '#ff8a1a', W: '#fff0a0', b: '#903000', T: '#ff8a1a', t: '#903000' };
  const REDT = { B: '#ff3030', W: '#ffd0d0', b: '#801010', T: '#ff3030', t: '#801010' };
  const BUGP = { G: '#40ff40', Y: '#e0ff40', W: '#ffffff' };
  const SPR = {
    cycle: [
      '.....BBBB...',
      '...BBWWWBB..',
      'BBBBBBBBBBBB',
      'BWWBBbbbBWWB',
      'BWWB....BWWB',
      '.BB......BB.'
    ],
    tank0: [
      'TT.......TT',
      'TtT.BBB.TtT',
      'TTTBBWBBTTT',
      'TtTBWbWBTtT',
      'TTTBBWBBTTT',
      'TtTBBBBBTtT',
      'TTTBBBBBTTT',
      'TtTBBBBBTtT',
      'TT.......TT'
    ],
    tank1: [
      'TT.......TT',
      'TTT.BBB.TTT',
      'TtTBBWBBTtT',
      'TTTBWbWBTTT',
      'TtTBBWBBTtT',
      'TTTBBBBBTTT',
      'TtTBBBBBTtT',
      'TTTBBBBBTTT',
      'TT.......TT'
    ],
    man0: ['..WWW..', '..WBW..', '..WWW..', '.BBBBB.', 'BWBBBWB', 'B.BWB.B', 'W.BBB.W', '..BBB..', '..B.B..', '.BB.BB.', '.B...B.', 'WW...WW'],
    man1: ['..WWW..', '..WBW..', '..WWW..', '.BBBBB.', 'BWBBBWB', 'B.BWB.B', 'W.BBB.W', '..BBB..', '..B.B..', '..B.B..', '..B.B..', '.WW.WW.'],
    bug0: ['Y.....Y', '.Y.G.Y.', '..GGG..', 'YGGWGGY', '..GGG..', '.Y...Y.', 'Y.....Y'],
    bug1: ['.......', 'Y..G..Y', '.YGGGY.', '.GGWGG.', '.YGGGY.', 'Y.....Y', '.......']
  };
  function rot(rows) { const h = rows.length, w = rows[0].length, out = []; for (let x = 0; x < w; x++) { let s = ''; for (let y = h - 1; y >= 0; y--) s += rows[y][x]; out.push(s); } return out; }
  function mk(rows, pal) {
    const h = rows.length, w = rows[0].length, c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'), px = [];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const ch = rows[j][i]; if (ch !== '.') { x.fillStyle = pal[ch]; x.fillRect(i, j, 1, 1); px.push([i - w / 2, j - h / 2, pal[ch]]); } }
    return { c, w, h, px };
  }
  function mk4(rows, pal) { const r = [rows]; for (let i = 1; i < 4; i++) r.push(rot(r[i - 1])); return r.map(x => mk(x, pal)); }

  const LEVELS = ['RPG', 'COBOL', 'BASIC', 'FORTRAN', 'SNOBOL', 'PL1', 'PASCAL', 'ALGOL', 'ASSEMBLY', 'OS', 'JCL', 'USER'];
  const GAMES = ['io', 'mcp', 'tank', 'cycle'];
  const GNAME = { io: 'I/O TOWER', mcp: 'MCP CONE', tank: 'TANKS', cycle: 'LIGHT CYCLES' };
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

  ArcadeRegistry.register({
    id: 'tron', title: 'Tron', year: 1982, maker: 'Bally Midway',
    width: W, height: H, vector: false, pointer: true,
    controls: 'Arrows: move/steer · Space/click: fire (cycles: speed) · Mouse or Z/X: aim · Enter: start',
    marquee: { bg: '#000814', fg: '#2a8cff', accent: '#ff8a1a' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      const ri = n => (Math.random() * n) | 0;
      const SP = {
        cycB: mk4(SPR.cycle, BLUE), cycO: mk4(SPR.cycle, ORNG), cycY: mk4(SPR.cycle, { B: '#ffe020', W: '#ffffc0', b: '#806000' }),
        tankB0: mk4(SPR.tank0, BLUE), tankB1: mk4(SPR.tank1, BLUE), tankR0: mk4(SPR.tank0, REDT), tankR1: mk4(SPR.tank1, REDT),
        man0: mk(SPR.man0, BLUE), man1: mk(SPR.man1, BLUE), bug0: mk(SPR.bug0, BUGP), bug1: mk(SPR.bug1, BUGP)
      };
      // tank sprites face up in base; cycles face right in base
      const tankIdx = d => [1, 2, 3, 0][d];

      let hi = api.getHiScore(25000);
      let state = 'title', stT = 0, score = 0, lives = 3, lvl = 0, nextLife = 20000;
      let coinFlash = 0, coinHold = 0, lastCredits = api.credits;
      let done = {}, sel = 0, selT = 0, game = null, resT = 0, resMsg = '', parts = [];
      let lastMX = -1, lastMY = -1;

      function addScore(n) {
        score += n;
        if (score >= nextLife) { nextLife += 20000; lives = Math.min(lives + 1, 6); A.melody([[988, 0.08], [1318, 0.08], [1976, 0.15]], { type: 'square', vol: 0.08 }); }
      }
      function burst(x, y, cols, n, sp) {
        for (let i = 0; i < n && parts.length < 500; i++) {
          const a = Math.random() * 6.283, s = rnd(0.3, sp || 2.5);
          parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, c: cols[ri(cols.length)], t: rnd(20, 50) });
        }
      }
      function shatter(spr, x, y) {
        for (const [px, py, c] of spr.px) { if (parts.length > 500) break; const a = Math.atan2(py, px + 0.01), s = Math.hypot(px, py) * 0.3 + rnd(0.3, 1.5); parts.push({ x: x + px, y: y + py, vx: Math.cos(a) * s, vy: Math.sin(a) * s, c, t: rnd(25, 50) }); }
      }
      function updParts() { for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vx *= 0.97; p.vy *= 0.97; if (--p.t <= 0) parts.splice(i, 1); } }
      function drawParts(ctx) { for (const p of parts) { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.t > 25 ? 2 : 1, p.t > 25 ? 2 : 1); } }
      function blit(ctx, s, x, y) { ctx.drawImage(s.c, Math.round(x - s.w / 2), Math.round(y - s.h / 2)); }
      function grid(ctx, step, col) {
        ctx.fillStyle = col;
        for (let x = 0; x < W; x += step) ctx.fillRect(x, FY, 1, H - FY);
        for (let y = FY; y < H; y += step) ctx.fillRect(0, y, W, 1);
      }
      function glowRect(ctx, x, y, w, h, c, halo) { ctx.fillStyle = halo; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
      function pixLine(ctx, x0, y0, x1, y1, c) {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0; ctx.fillStyle = c;
        for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + (x1 - x0) * i / (n || 1)), Math.round(y0 + (y1 - y0) * i / (n || 1)), 1, 1);
      }

      // ---------- shared aim (mouse, Z/X, or movement) ----------
      const aim = { a: -Math.PI / 2, mouseT: 0, manT: 0 };
      function updAim(px, py, mdx, mdy) {
        const m = api.mouse;
        if (Math.abs(m.x - lastMX) + Math.abs(m.y - lastMY) > 0.5) { if (lastMX >= 0) aim.mouseT = 240; lastMX = m.x; lastMY = m.y; }
        if (api.key('KeyZ')) { aim.a -= 0.07; aim.manT = 200; aim.mouseT = 0; }
        else if (api.key('KeyX')) { aim.a += 0.07; aim.manT = 200; aim.mouseT = 0; }
        else if (aim.mouseT > 0) { aim.mouseT--; aim.a = Math.atan2(m.y - py, m.x - px); }
        else if (aim.manT > 0) aim.manT--;
        else if (mdx || mdy) aim.a = Math.atan2(mdy, mdx);
      }
      const firePressed = () => api.pressed('Space') || api.mouse.clicked;

      // ============ LIGHT CYCLES ============
      function makeCycles(L) {
        const CS = 2, GX = 128, GY = (H - FY) / CS | 0;
        const occ = new Uint8Array(GX * GY);
        const tc = document.createElement('canvas'); tc.width = W; tc.height = H - FY; const tx = tc.getContext('2d');
        const hc = document.createElement('canvas'); hc.width = W; hc.height = H - FY; const hx = hc.getContext('2d');
        const COL = { 2: ['#2a8cff', '#0a2a60'], 3: ['#ff8a1a', '#502000'], 4: ['#ffe020', '#504000'], 5: ['#ff8a1a', '#502000'] };
        for (let x = 0; x < GX; x++) { occ[x] = 1; occ[(GY - 1) * GX + x] = 1; }
        for (let y = 0; y < GY; y++) { occ[y * GX] = 1; occ[y * GX + GX - 1] = 1; }
        const nE = Math.min(3, 1 + Math.floor(L / 2));
        const cyc = [{ id: 2, x: GX / 2, y: GY - 12, dir: 3, nd: 3, sp: 0.62, acc: 0, alive: true, ai: false }];
        const ex = nE === 1 ? [GX / 2] : nE === 2 ? [GX / 3, 2 * GX / 3] : [GX / 4, GX / 2, 3 * GX / 4];
        ex.forEach((x, i) => cyc.push({ id: 3 + i, x: x | 0, y: 11, dir: 1, nd: 1, sp: Math.min(0.95, 0.6 + L * 0.035), acc: 0, alive: true, ai: true, agg: 0.3 + Math.min(0.5, L * 0.05) }));
        for (const c of cyc) mark(c);
        let t = 0, endT = 0, result = null;
        function mark(c) {
          occ[c.y * GX + c.x] = c.id;
          const [a, b] = COL[c.id];
          hx.fillStyle = b; hx.fillRect(c.x * CS - 1, c.y * CS - 1, CS + 2, CS + 2);
          tx.fillStyle = a; tx.fillRect(c.x * CS, c.y * CS, CS, CS);
        }
        function redraw() {
          tx.clearRect(0, 0, W, H); hx.clearRect(0, 0, W, H);
          for (let y = 0; y < GY; y++) for (let x = 0; x < GX; x++) {
            const v = occ[y * GX + x]; if (v < 2) continue;
            hx.fillStyle = COL[v][1]; hx.fillRect(x * CS - 1, y * CS - 1, CS + 2, CS + 2);
            tx.fillStyle = COL[v][0]; tx.fillRect(x * CS, y * CS, CS, CS);
          }
        }
        const free = (x, y) => x > 0 && y > 0 && x < GX - 1 && y < GY - 1 && occ[y * GX + x] === 0;
        const seen = new Uint16Array(GX * GY); let stamp = 0;
        function space(x, y, lim) {
          if (!free(x, y)) return 0;
          stamp = (stamp + 1) & 0xffff; if (stamp === 0) { seen.fill(0); stamp = 1; }
          const st = [y * GX + x]; seen[st[0]] = stamp; let n = 0;
          while (st.length && n < lim) {
            const i = st.pop(); n++;
            const cx = i % GX, cy = (i / GX) | 0;
            for (const [dx, dy] of DIRS) { const nx = cx + dx, ny = cy + dy, j = ny * GX + nx; if (seen[j] !== stamp && free(nx, ny)) { seen[j] = stamp; st.push(j); } }
          }
          return n;
        }
        function ray(x, y, d, lim) { let n = 0; while (n < lim) { x += DIRS[d][0]; y += DIRS[d][1]; if (!free(x, y)) break; n++; } return n; }
        function think(c) {
          const p = cyc[0];
          const ahead = ray(c.x, c.y, c.dir, 12);
          const opts = [c.dir, (c.dir + 1) % 4, (c.dir + 3) % 4];
          let want = null;
          if (ahead < 3 + ri(4) || Math.random() < 0.025) want = 'turn';
          // aggression: cut across the player's path
          if (p.alive && Math.random() < c.agg * 0.08) {
            const tx2 = p.x + DIRS[p.dir][0] * 10, ty2 = p.y + DIRS[p.dir][1] * 10;
            const dx = tx2 - c.x, dy = ty2 - c.y;
            const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3);
            if (d !== (c.dir + 2) % 4 && ray(c.x, c.y, d, 6) > 4) { c.nd = d; return; }
          }
          if (!want) return;
          let best = c.dir, bs = -1;
          for (const d of opts) {
            const nx = c.x + DIRS[d][0], ny = c.y + DIRS[d][1];
            const s = space(nx, ny, 400) + ray(c.x, c.y, d, 20) * 2 + Math.random() * 6;
            if (s > bs) { bs = s; best = d; }
          }
          c.nd = best;
        }
        function crash(c) {
          c.alive = false;
          const px = c.x * CS + 1, py = FY + c.y * CS + 1;
          burst(px, py, c.id === 2 ? ['#2a8cff', '#d0f4ff', '#ffffff'] : ['#ff8a1a', '#fff0a0', '#ffffff'], 60, 3);
          A.noise(0.8, { freq: 3000, slideTo: 100, vol: 0.4 });
          if (c.id !== 2) { for (let i = 0; i < occ.length; i++) if (occ[i] === c.id) occ[i] = 0; redraw(); addScore(1000); }
        }
        return {
          name: 'cycle',
          update() {
            t++;
            if (t < 90) return;
            const p = cyc[0];
            if (p.alive) {
              if (api.pressed('ArrowRight') && p.dir !== 2) p.nd = 0;
              if (api.pressed('ArrowDown') && p.dir !== 3) p.nd = 1;
              if (api.pressed('ArrowLeft') && p.dir !== 0) p.nd = 2;
              if (api.pressed('ArrowUp') && p.dir !== 1) p.nd = 3;
              p.sp = (api.key('Space') || api.mouse.down) ? 1.0 : 0.62;
            }
            if (t % 8 === 0 && p.alive) A.tone(p.sp > 0.8 ? 110 : 80, 0.14, { type: 'sawtooth', vol: 0.03 });
            for (const c of cyc) {
              if (!c.alive) continue;
              c.acc += c.sp;
              while (c.acc >= 1 && c.alive) {
                c.acc -= 1;
                if (c.ai) think(c);
                if (c.nd !== (c.dir + 2) % 4) c.dir = c.nd;
                const nx = c.x + DIRS[c.dir][0], ny = c.y + DIRS[c.dir][1];
                if (occ[ny * GX + nx] !== 0) { crash(c); break; }
                c.x = nx; c.y = ny; mark(c);
              }
            }
            if (!result) {
              if (!p.alive) { endT++; if (endT > 100) result = 'die'; }
              else if (cyc.every(c => !c.ai || !c.alive)) { endT++; if (endT > 70) result = 'win'; }
            }
          },
          render(ctx) {
            grid(ctx, 16, '#06123a');
            ctx.drawImage(hc, 0, FY); ctx.drawImage(tc, 0, FY);
            ctx.fillStyle = '#2a8cff';
            ctx.fillRect(0, FY, W, 2); ctx.fillRect(0, H - 2, W, 2); ctx.fillRect(0, FY, 2, H - FY); ctx.fillRect(W - 2, FY, 2, H - FY);
            for (const c of cyc) {
              if (!c.alive) continue;
              const spr = (c.id === 2 ? SP.cycB : c.id === 4 ? SP.cycY : SP.cycO)[c.dir];
              const cx = c.x * CS + 1 - DIRS[c.dir][0] * 4, cy = FY + c.y * CS + 1 - DIRS[c.dir][1] * 4;
              blit(ctx, spr, cx, cy);
            }
            if (t < 90) drawText(ctx, 'READY', W / 2, 120, (t >> 3) & 1 ? '#ffffff' : '#2a8cff', 2, 'center');
          },
          get result() { return result; }
        };
      }

      // ============ TANKS ============
      const TMAP = [
        '################',
        '#......##......#',
        '#.##.#....#.##.#',
        '#.#..#.##.#..#.#',
        '#....#....#....#',
        '#.##...##...##.#',
        '#..............#',
        '#.##...##...##.#',
        '#....#....#....#',
        '#.#..#.##.#..#.#',
        '#.##.#....#.##.#',
        '#......##......#',
        '################'
      ];
      function makeTanks(L) {
        const CSZ = 16, OY = FY + 6, GX = 16, GY = 13;
        const wall = (cx, cy) => cx < 0 || cy < 0 || cx >= GX || cy >= GY || TMAP[cy][cx] === '#';
        const wallAt = (x, y) => wall(Math.floor(x / CSZ), Math.floor((y - OY) / CSZ));
        const boxFree = (x, y, r) => !wallAt(x - r, y - r) && !wallAt(x + r, y - r) && !wallAt(x - r, y + r) && !wallAt(x + r, y + r);
        const center = (cx, cy) => [cx * CSZ + 8, OY + cy * CSZ + 8];
        const DX = 128, DY = OY + 6 * CSZ + 8;
        const pl = { x: center(7, 10)[0] + 8, y: center(7, 10)[1], dir: 3, alive: true, cd: 0, moving: false };
        const nT = Math.min(3, 1 + Math.floor(L / 3));
        const spots = [[1, 1], [14, 1], [7, 1], [1, 6], [14, 6]];
        const tanks = [];
        for (let i = 0; i < nT; i++) { const [x, y] = center(...spots[i]); tanks.push({ x, y, dir: 1, hp: 3, flash: 0, fireT: rnd(80, 160), a: Math.PI / 2, path: null, moving: true }); }
        const shots = [];
        let t = 0, endT = 0, result = null, dist = null, distT = 0;
        function bfs() {
          const pcx = Math.floor(pl.x / CSZ), pcy = Math.floor((pl.y - OY) / CSZ);
          const d = new Int16Array(GX * GY).fill(-1); const q = [pcy * GX + pcx]; d[q[0]] = 0;
          while (q.length) { const i = q.shift(), x = i % GX, y = (i / GX) | 0; for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (!wall(nx, ny) && d[ny * GX + nx] < 0) { d[ny * GX + nx] = d[i] + 1; q.push(ny * GX + nx); } } }
          dist = d;
        }
        function move(o, dx, dy, r) {
          let moved = false;
          if (dx && boxFree(o.x + dx, o.y, r)) { o.x += dx; moved = true; }
          if (dy && boxFree(o.x, o.y + dy, r)) { o.y += dy; moved = true; }
          return moved;
        }
        function teleport(o) {
          if (Math.hypot(o.x - DX, o.y - DY) < 6) {
            let cx, cy; do { cx = ri(GX); cy = ri(GY); } while (wall(cx, cy) || Math.abs(cx - 7.5) < 3);
            [o.x, o.y] = center(cx, cy); burst(o.x, o.y, ['#ffffff', '#40ffff', '#ff40ff'], 20, 2);
            A.tone(200, 0.3, { type: 'sine', vol: 0.1, slideTo: 2000 });
          }
        }
        function fire(o, a, owner) {
          shots.push({ x: o.x + Math.cos(a) * 8, y: o.y + Math.sin(a) * 8, vx: Math.cos(a) * 2.6, vy: Math.sin(a) * 2.6, b: 1, owner, t: 240 });
          A.tone(owner ? 900 : 500, 0.1, { type: 'square', vol: 0.05, slideTo: owner ? 300 : 150 });
        }
        return {
          name: 'tank',
          update() {
            t++;
            if (t < 60) return;
            if (pl.alive) {
              let dx = 0, dy = 0;
              if (api.key('ArrowLeft')) dx = -1; else if (api.key('ArrowRight')) dx = 1;
              if (api.key('ArrowUp')) dy = -1; else if (api.key('ArrowDown')) dy = 1;
              if (dx && dy) dy = 0;
              if (dx || dy) pl.dir = dx > 0 ? 0 : dx < 0 ? 2 : dy > 0 ? 1 : 3;
              pl.moving = (dx || dy) && move(pl, dx * 0.9, dy * 0.9, 5);
              // corner assist: nudge toward lane centres
              if (dx && !dy) { const cy = OY + Math.floor((pl.y - OY) / CSZ) * CSZ + 8; if (!boxFree(pl.x + dx, pl.y, 5)) pl.y += Math.sign(cy - pl.y) * 0.5; }
              if (dy && !dx) { const cx = Math.floor(pl.x / CSZ) * CSZ + 8; if (!boxFree(pl.x, pl.y + dy, 5)) pl.x += Math.sign(cx - pl.x) * 0.5; }
              updAim(pl.x, pl.y, dx, dy);
              if (pl.cd > 0) pl.cd--;
              if (firePressed() && pl.cd <= 0 && shots.filter(s => s.owner).length < 2) { fire(pl, aim.a, true); pl.cd = 12; }
              teleport(pl);
              if (t % 10 === 0 && pl.moving) A.tone(60, 0.08, { type: 'square', vol: 0.03 });
            }
            if (--distT <= 0) { bfs(); distT = 15; }
            for (const e of tanks) {
              if (e.flash > 0) e.flash--;
              // follow the BFS gradient
              const cx = Math.floor(e.x / CSZ), cy = Math.floor((e.y - OY) / CSZ);
              const [ccx, ccy] = center(cx, cy);
              if (Math.abs(e.x - ccx) < 1 && Math.abs(e.y - ccy) < 1) {
                let best = e.dir, bd = 9999;
                for (let d = 0; d < 4; d++) { const nx = cx + DIRS[d][0], ny = cy + DIRS[d][1]; if (wall(nx, ny)) continue; const v = dist[ny * GX + nx] + Math.random() * (Math.random() < 0.15 ? 6 : 0.5); if (v < bd && v >= 0) { bd = v; best = d; } }
                e.dir = best; e.x = ccx; e.y = ccy;
              }
              const sp = Math.min(0.75, 0.45 + L * 0.03);
              e.x += DIRS[e.dir][0] * sp; e.y += DIRS[e.dir][1] * sp;
              const ta = Math.atan2(pl.y - e.y, pl.x - e.x);
              let da = ta - e.a; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283;
              e.a += Math.max(-0.04, Math.min(0.04, da));
              if (--e.fireT <= 0 && pl.alive && Math.abs(da) < 0.3) { e.fireT = Math.max(50, rnd(90, 160) - L * 6); fire(e, e.a + rnd(-0.1, 0.1), false); }
              teleport(e);
              if (pl.alive && Math.hypot(e.x - pl.x, e.y - pl.y) < 10) { die(); }
            }
            for (let i = shots.length - 1; i >= 0; i--) {
              const s = shots[i]; let kill = false;
              if (wallAt(s.x + s.vx, s.y)) { if (s.b-- > 0) s.vx = -s.vx; else kill = true; }
              if (wallAt(s.x, s.y + s.vy)) { if (s.b-- > 0) s.vy = -s.vy; else kill = true; }
              s.x += s.vx; s.y += s.vy;
              if (s.owner) {
                for (let j = tanks.length - 1; j >= 0; j--) {
                  const e = tanks[j];
                  if (Math.abs(s.x - e.x) < 6 && Math.abs(s.y - e.y) < 6) {
                    kill = true; e.hp--; e.flash = 10; A.noise(0.15, { freq: 2000, vol: 0.2 });
                    if (e.hp <= 0) { shatter(SP.tankR0[tankIdx(e.dir)], e.x, e.y); burst(e.x, e.y, ['#ff3030', '#ffff60', '#ffffff'], 30, 2.5); tanks.splice(j, 1); addScore(1000); A.noise(0.8, { freq: 1500, slideTo: 60, vol: 0.4 }); }
                    else addScore(100);
                    break;
                  }
                }
              } else if (pl.alive && Math.abs(s.x - pl.x) < 5 && Math.abs(s.y - pl.y) < 5) { kill = true; die(); }
              if (kill || --s.t <= 0) shots.splice(i, 1);
            }
            if (!result) {
              if (!pl.alive) { if (++endT > 110) result = 'die'; }
              else if (!tanks.length) { if (++endT > 60) result = 'win'; }
            }
          },
          render(ctx) {
            ctx.fillStyle = '#000'; ctx.fillRect(0, FY, W, H - FY);
            for (let y = 0; y < GY; y++) for (let x = 0; x < GX; x++) {
              const px = x * CSZ, py = OY + y * CSZ;
              if (TMAP[y][x] === '#') {
                ctx.fillStyle = '#0a2a7a'; ctx.fillRect(px, py, CSZ, CSZ);
                ctx.fillStyle = '#2a8cff'; ctx.fillRect(px + 1, py + 1, CSZ - 2, 1); ctx.fillRect(px + 1, py + 1, 1, CSZ - 2);
                ctx.fillStyle = '#061440'; ctx.fillRect(px + 3, py + 3, CSZ - 6, CSZ - 6);
                ctx.fillStyle = '#40ffff'; ctx.fillRect(px + 2, py + 2, 1, 1);
              } else { ctx.fillStyle = '#04102e'; ctx.fillRect(px + 8, py + 8, 1, 1); }
            }
            // teleport diamond
            const pulse = ['#ffffff', '#ff40ff', '#40ffff', '#ffff40'][(t >> 3) & 3];
            for (let k = 0; k < 7; k++) { ctx.fillStyle = pulse; ctx.fillRect(DX - k, DY - 6 + k, 1, 1); ctx.fillRect(DX + k, DY - 6 + k, 1, 1); ctx.fillRect(DX - k, DY + 6 - k, 1, 1); ctx.fillRect(DX + k, DY + 6 - k, 1, 1); }
            for (const e of tanks) {
              const s = (e.flash & 2 ? SP.tankB0 : (t >> 3) & 1 ? SP.tankR0 : SP.tankR1)[tankIdx(e.dir)];
              blit(ctx, s, e.x, e.y);
              pixLine(ctx, e.x, e.y, e.x + Math.cos(e.a) * 8, e.y + Math.sin(e.a) * 8, '#ffd0d0');
            }
            if (pl.alive) {
              blit(ctx, (pl.moving && (t >> 2) & 1 ? SP.tankB1 : SP.tankB0)[tankIdx(pl.dir)], pl.x, pl.y);
              pixLine(ctx, pl.x, pl.y, pl.x + Math.cos(aim.a) * 8, pl.y + Math.sin(aim.a) * 8, '#ffffff');
            }
            for (const s of shots) { ctx.fillStyle = s.owner ? '#ffffff' : '#ff8080'; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 2, 2); }
            if (t < 60) drawText(ctx, 'READY', W / 2, 108, (t >> 3) & 1 ? '#ffffff' : '#2a8cff', 2, 'center');
            ctx.fillStyle = '#fff';
          },
          get result() { return result; }
        };
        function die() {
          if (!pl.alive) return;
          pl.alive = false; shatter(SP.tankB0[tankIdx(pl.dir)], pl.x, pl.y); burst(pl.x, pl.y, ['#2a8cff', '#ffffff'], 40, 3);
          A.noise(1.2, { freq: 2500, slideTo: 50, vol: 0.45 });
        }
      }

      // ============ shared: walking Tron + discs ============
      function makeMan(x, y) { return { x, y, alive: true, cd: 0, step: 0 }; }
      function manMove(m, sp, canMove) {
        let dx = 0, dy = 0;
        if (api.key('ArrowLeft')) dx = -1; else if (api.key('ArrowRight')) dx = 1;
        if (api.key('ArrowUp')) dy = -1; else if (api.key('ArrowDown')) dy = 1;
        if (dx && dy) { dx *= 0.72; dy *= 0.72; }
        if (dx && canMove(m.x + dx * sp, m.y)) m.x += dx * sp;
        if (dy && canMove(m.x, m.y + dy * sp)) m.y += dy * sp;
        if (dx || dy) m.step++;
        updAim(m.x, m.y - 2, dx, dy);
        return [dx, dy];
      }
      function drawDisc(ctx, d) {
        const c = ['#ffffff', '#40c0ff'][(api.frame >> 1) & 1];
        ctx.fillStyle = '#2a8cff'; ctx.fillRect(Math.round(d.x) - 2, Math.round(d.y) - 1, 5, 3); ctx.fillRect(Math.round(d.x) - 1, Math.round(d.y) - 2, 3, 5);
        ctx.fillStyle = c; ctx.fillRect(Math.round(d.x) - 1, Math.round(d.y) - 1, 3, 3);
      }
      function drawMan(ctx, m) { blit(ctx, (m.step >> 3) & 1 ? SP.man1 : SP.man0, m.x, m.y); pixLine(ctx, m.x, m.y - 2, m.x + Math.cos(aim.a) * 9, m.y - 2 + Math.sin(aim.a) * 9, '#1a50a0'); }

      // ============ MCP CONE ============
      function makeMCP(L) {
        const rows = Math.min(7, 3 + Math.floor(L / 2)), BW = 8, BH = 6, NC = 32;
        const RC = ['#c040ff', '#4060ff', '#40c0ff', '#40ff80', '#ffff40', '#ff9020', '#ff3030'];
        const blocks = []; for (let r = 0; r < rows; r++) { blocks.push(new Array(NC).fill(true)); }
        let top = 68, off = 0, total = rows * NC, cleared = 0;
        const speed = 0.012 + L * 0.003;
        const man = makeMan(128, 222), discs = [];
        let t = 0, endT = 0, result = null, won = false;
        const blockAt = (x, y) => {
          const r = Math.floor((y - top) / BH); if (r < 0 || r >= rows) return null;
          const dir = r % 2 ? -1 : 1; const ox = ((x - off * dir) % W + W) % W;
          const c = Math.floor(ox / BW); return blocks[r][c] ? [r, c] : null;
        };
        const manFree = (x, y) => x > 4 && x < W - 4 && y < H - 6 && y > 30 && !blockAt(x - 3, y - 5) && !blockAt(x + 3, y - 5) && !blockAt(x - 3, y + 5) && !blockAt(x + 3, y + 5) && !blockAt(x, y);
        function die() { if (!man.alive) return; man.alive = false; shatter(SP.man0, man.x, man.y); burst(man.x, man.y, ['#2a8cff', '#ffffff'], 30, 2.5); A.noise(1.2, { freq: 2500, slideTo: 50, vol: 0.45 }); }
        return {
          name: 'mcp',
          update() {
            t++;
            off += 0.35 + L * 0.03;
            if (t < 60 || won) { if (won && ++endT > 80) result = 'win'; return; }
            top += speed;
            if (man.alive) {
              manMove(man, 1.2, manFree);
              // the descending wall pushes Tron down
              let guard = 0;
              while (!manFree(man.x, man.y) && guard++ < 6) man.y += 1;
              if (man.y > H - 6) die();
              if (man.cd > 0) man.cd--;
              if (firePressed() && man.cd <= 0 && discs.length < 2) { discs.push({ x: man.x, y: man.y - 4, vx: Math.cos(aim.a) * 3.2, vy: Math.sin(aim.a) * 3.2 }); man.cd = 10; A.tone(1200, 0.1, { type: 'triangle', vol: 0.08, slideTo: 600 }); }
              if (man.y < 64 && Math.abs(man.x - 128) < 9) {
                won = true; addScore(1000 + 250 * Math.min(8, L)); A.melody([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.08], [1319, 0.2]], { type: 'square', vol: 0.09 });
                burst(128, 58, RC, 60, 2.5);
              }
            }
            for (let i = discs.length - 1; i >= 0; i--) {
              const d = discs[i]; d.x += d.vx; d.y += d.vy; let kill = false;
              const b = blockAt(d.x, d.y);
              if (b) { blocks[b[0]][b[1]] = false; cleared++; addScore(25); kill = true; burst(d.x, d.y, [RC[b[0]], '#ffffff'], 8, 1.5); A.tone(1600 - b[0] * 120, 0.06, { type: 'square', vol: 0.05 }); if (cleared === total) addScore(1000); }
              if (d.x < 0 || d.x > W || d.y < 20 || d.y > H) kill = true;
              if (kill) discs.splice(i, 1);
            }
            if (!result && !man.alive && ++endT > 100) result = 'die';
          },
          render(ctx) {
            grid(ctx, 16, '#06123a');
            // MCP cone
            const cols = ['#ff3030', '#ff9020', '#ffff40', '#40ff80', '#40c0ff', '#c040ff'];
            for (let y = 22; y < 60; y++) {
              const f = (y - 22) / 38, hw = Math.round(40 - f * 32);
              ctx.fillStyle = cols[(Math.floor((y + t * 0.3) / 4)) % 6]; ctx.fillRect(128 - hw, y, hw * 2, 1);
              ctx.fillStyle = '#000'; if ((y & 3) === 0) ctx.fillRect(128 - hw, y, hw * 2, 1);
            }
            ctx.fillStyle = '#ffffff'; ctx.fillRect(120, 60, 16, 1);
            // face of the MCP
            ctx.fillStyle = '#000'; ctx.fillRect(116, 32, 6, 3); ctx.fillRect(134, 32, 6, 3); ctx.fillRect(122, 44, 12, 2);
            // shield
            for (let r = 0; r < rows; r++) {
              const dir = r % 2 ? -1 : 1, y = Math.round(top + r * BH);
              for (let c = 0; c < NC; c++) {
                if (!blocks[r][c]) continue;
                const x = Math.round(((c * BW + off * dir) % W + W) % W);
                for (const xx of [x, x - W]) {
                  if (xx > W || xx + BW < 0) continue;
                  ctx.fillStyle = RC[r]; ctx.fillRect(xx, y, BW - 1, BH - 1);
                  ctx.fillStyle = '#000'; ctx.fillRect(xx + 2, y + 2, BW - 5, BH - 5);
                }
              }
            }
            for (const d of discs) drawDisc(ctx, d);
            if (man.alive && !won) drawMan(ctx, man);
            if (won) drawText(ctx, 'ENTERED CONE', W / 2, 120, '#ffffff', 1, 'center');
            if (t < 60) drawText(ctx, 'READY', W / 2, 150, (t >> 3) & 1 ? '#ffffff' : '#2a8cff', 2, 'center');
          },
          get result() { return result; }
        };
      }

      // ============ I/O TOWER ============
      function makeIO(L) {
        const TX = 128, TY = 120;
        const man = makeMan(128, 220), discs = [], bugs = [];
        let t = 0, endT = 0, result = null, won = false, time = Math.max(25, 45 - L * 2) * 60, spawnT = 60;
        const bugSp = Math.min(1.0, 0.45 + L * 0.05);
        function die() { if (!man.alive) return; man.alive = false; shatter(SP.man0, man.x, man.y); burst(man.x, man.y, ['#2a8cff', '#ffffff'], 30, 2.5); A.noise(1.2, { freq: 2500, slideTo: 50, vol: 0.45 }); }
        const canMove = (x, y) => x > 4 && x < W - 4 && y > FY + 7 && y < H - 7;
        return {
          name: 'io',
          update() {
            t++;
            if (t < 60 || won) { if (won && ++endT > 80) result = 'win'; return; }
            if (man.alive) {
              if (--time <= 0) die();
              if (time % 60 === 0 && time < 600) A.tone(1500, 0.05, { type: 'square', vol: 0.06 });
              manMove(man, 1.25, canMove);
              if (man.cd > 0) man.cd--;
              if (firePressed() && man.cd <= 0 && discs.length < 3) { discs.push({ x: man.x, y: man.y - 2, vx: Math.cos(aim.a) * 3.5, vy: Math.sin(aim.a) * 3.5 }); man.cd = 8; A.tone(1200, 0.1, { type: 'triangle', vol: 0.08, slideTo: 600 }); }
              if (Math.hypot(man.x - TX, man.y - TY) < 7) {
                won = true; addScore(1000 + Math.floor(time / 60) * 50);
                A.melody([[392, 0.08], [523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.25]], { type: 'square', vol: 0.09 });
              }
            }
            // grid bugs crawl along grid lines and multiply
            if (--spawnT <= 0 && bugs.length < 14 + L) {
              spawnT = Math.max(25, 80 - L * 5);
              const n = 1 + ri(2);
              for (let k = 0; k < n; k++) {
                let x, y; do { x = ri(16) * 16; y = FY + ri(14) * 16; } while (Math.hypot(x - man.x, y - man.y) < 60 || Math.hypot(x - TX, y - TY) < 24);
                bugs.push({ x, y, dir: ri(4), tt: 0, born: 20 });
              }
            }
            for (let i = bugs.length - 1; i >= 0; i--) {
              const b = bugs[i]; b.tt++;
              if (b.born > 0) { b.born--; continue; }
              if ((b.x % 16 === 0) && ((b.y - FY) % 16 === 0)) {
                // at a node: pick a direction, usually toward Tron
                const dx = man.x - b.x, dy = man.y - b.y;
                if (Math.random() < 0.7) b.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3);
                else b.dir = ri(4);
                const nx = b.x + DIRS[b.dir][0] * 16, ny = b.y + DIRS[b.dir][1] * 16;
                if (nx < 0 || nx > W - 1 || ny < FY || ny > H - 1) b.dir = (b.dir + 2) % 4;
              }
              b.acc = (b.acc || 0) + bugSp;
              while (b.acc >= 1) { b.acc -= 1; b.x += DIRS[b.dir][0]; b.y += DIRS[b.dir][1]; if ((b.x % 16 === 0) && ((b.y - FY) % 16 === 0)) { b.acc = 0; break; } }
              if (man.alive && Math.abs(b.x - man.x) < 6 && Math.abs(b.y - man.y) < 8) die();
            }
            for (let i = discs.length - 1; i >= 0; i--) {
              const d = discs[i]; d.x += d.vx; d.y += d.vy; let kill = d.x < 0 || d.x > W || d.y < FY || d.y > H;
              for (let j = bugs.length - 1; j >= 0 && !kill; j--) {
                const b = bugs[j];
                if (b.born <= 0 && Math.abs(b.x - d.x) < 5 && Math.abs(b.y - d.y) < 5) { shatter(SP.bug0, b.x, b.y); bugs.splice(j, 1); addScore(100); kill = true; A.noise(0.2, { freq: 3000, slideTo: 500, vol: 0.2 }); }
              }
              if (kill) discs.splice(i, 1);
            }
            if (t % 20 === 0 && bugs.length) A.tone(1800 + ri(400), 0.02, { type: 'square', vol: 0.02 });
            if (!result && !man.alive && ++endT > 100) result = 'die';
          },
          render(ctx) {
            grid(ctx, 16, '#0a2060');
            // I/O tower: beam of light in a ring
            const pulse = (t >> 2) & 1;
            ctx.fillStyle = '#103070';
            for (let a = 0; a < 64; a++) { const an = a / 64 * 6.283; ctx.fillRect(Math.round(TX + Math.cos(an) * 16), Math.round(TY + Math.sin(an) * 10), 1, 1); }
            ctx.fillStyle = pulse ? '#40c0ff' : '#2a8cff';
            for (let a = 0; a < 48; a++) { const an = a / 48 * 6.283; ctx.fillRect(Math.round(TX + Math.cos(an) * 10), Math.round(TY + Math.sin(an) * 6), 1, 1); }
            const beam = ['#ffffff', '#c0f0ff', '#40c0ff', '#2a8cff'];
            for (let x = -4; x <= 4; x++) { ctx.fillStyle = beam[Math.min(3, Math.abs(x))]; ctx.fillRect(TX + x, FY + 1, 1, TY - FY); }
            ctx.fillStyle = '#ffffff'; ctx.fillRect(TX - 6, TY - 1, 13, 2);
            for (const b of bugs) {
              if (b.born > 0) { if (b.born & 2) { ctx.fillStyle = '#40ff40'; ctx.fillRect(b.x - 1, b.y - 1, 3, 3); } continue; }
              blit(ctx, (b.tt >> 3) & 1 ? SP.bug1 : SP.bug0, b.x, b.y);
            }
            for (const d of discs) drawDisc(ctx, d);
            if (man.alive && !won) drawMan(ctx, man);
            // bit counter
            drawText(ctx, 'BITS ' + Math.max(0, Math.ceil(time / 60)), W - 4, FY + 4, time < 600 && (t & 16) ? '#ff3030' : '#ffff40', 1, 'right');
            if (won) drawText(ctx, 'I/O TOWER ENTERED', W / 2, 150, '#ffffff', 1, 'center');
            if (t < 60) drawText(ctx, 'READY', W / 2, 160, (t >> 3) & 1 ? '#ffffff' : '#2a8cff', 2, 'center');
          },
          get result() { return result; }
        };
      }

      // ---------- flow ----------
      function startGame() { score = 0; lives = 3; lvl = 0; nextLife = 20000; done = {}; toSelect(); }
      function toSelect() { state = 'select'; stT = 0; selT = 20 * 60; parts = []; if (done[GAMES[sel]]) sel = GAMES.findIndex(g => !done[g]); if (sel < 0) sel = 0; }
      function launch(g) {
        const L = lvl;
        game = g === 'cycle' ? makeCycles(L) : g === 'tank' ? makeTanks(L) : g === 'mcp' ? makeMCP(L) : makeIO(L);
        state = 'game'; stT = 0; parts = []; aim.a = -Math.PI / 2; aim.manT = 0;
        A.melody([[262, 0.06], [330, 0.06], [392, 0.06], [523, 0.1]], { type: 'square', vol: 0.07 });
      }
      function update() {
        stT++;
        updParts();
        if (coinFlash > 0) coinFlash--;
        if (coinHold > 0) coinHold--;
        const cr = api.credits;
        if (state === 'title') {
          if (lastCredits === 0 && cr > 0) { coinHold = 150; coinFlash = 0; }
          lastCredits = cr;
          if (api.anyPressed('Enter', 'Space') || (api.mouse.clicked && stT > 10)) {
            if (api.useCredit()) { lastCredits = api.credits; startGame(); }
            else { coinFlash = 150; A.tone(70, 0.28, { type: 'square', vol: 0.3 }); A.tone(58, 0.28, { type: 'sawtooth', vol: 0.15 }); }
          }
          return;
        }
        lastCredits = cr;
        if (state === 'select') {
          if (api.pressed('ArrowLeft') || api.pressed('ArrowRight')) { sel = (sel >> 1) * 2 + (1 - sel % 2); A.tone(880, 0.03, { vol: 0.05 }); }
          if (api.pressed('ArrowUp') || api.pressed('ArrowDown')) { sel = (1 - (sel >> 1)) * 2 + sel % 2; A.tone(880, 0.03, { vol: 0.05 }); }
          const m = api.mouse;
          if (m.clicked && m.y > 40) { const q = (m.y > 140 ? 2 : 0) + (m.x > 128 ? 1 : 0); sel = q; }
          const go = stT > 20 && (api.anyPressed('Space', 'Enter') || (m.clicked && m.y > 40)) || --selT <= 0;
          if (go) {
            if (done[GAMES[sel]]) { if (selT <= 0) sel = GAMES.findIndex(g => !done[g]); else { A.tone(150, 0.15, { vol: 0.08 }); return; } }
            launch(GAMES[sel]);
          }
          return;
        }
        if (state === 'game') {
          game.update();
          const r = game.result;
          if (r) {
            if (r === 'win') {
              done[game.name] = true; resMsg = GNAME[game.name] + ' COMPLETED'; addScore(500);
              if (GAMES.every(g => done[g])) { lvl++; done = {}; resMsg = 'LEVEL COMPLETE'; addScore(2000); A.melody([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.1], [784, 0.1], [1047, 0.3]], { type: 'square', vol: 0.09 }); }
            } else {
              lives--; resMsg = lives > 0 || api.offerContinue ? 'DEREZZED' : 'GAME OVER';
              A.melody([[392, 0.15], [330, 0.15], [262, 0.15], [196, 0.4]], { type: 'triangle', vol: 0.1 });
            }
            state = 'result'; resT = 150;
          }
          return;
        }
        if (state === 'result') {
          if (--resT <= 0) {
            const gameOver = () => { state = 'gameover'; stT = 0; if (score > hi) { hi = score; api.setHiScore(score); } };
            // continue: 3 fresh lives, back to the game-select grid on the same level with completed games and score kept
            if (lives <= 0) { if (api.offerContinue) api.offerContinue(() => { lives = 3; toSelect(); }, gameOver); else gameOver(); }
            else toSelect();
          }
          return;
        }
        if (state === 'gameover') {
          if (stT > 200 || (stT > 60 && api.anyPressed('Enter', 'Space'))) { state = 'title'; stT = 0; }
        }
      }

      // ---------- drawing ----------
      function hud(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, FY);
        drawText(ctx, String(score), 4, 5, '#ffffff', 1);
        drawText(ctx, LEVELS[lvl % 12], W / 2, 5, '#ff8a1a', 1, 'center');
        for (let i = 0; i < Math.min(lives, 6); i++) { ctx.drawImage(SP.man0.c, W - 10 - i * 9, 3); }
        ctx.fillStyle = '#2a8cff'; ctx.fillRect(0, FY - 2, W, 1);
      }
      // neon-tube TRON logo: each letter is a path stroked wide (glow), medium (tube) and thin (core)
      const LOGO = [
        [[0, 0], [30, 0], null, [15, 0], [15, 40]],
        [[38, 40], [38, 0], [62, 0], [68, 6], [68, 16], [62, 22], [38, 22], null, [52, 22], [68, 40]],
        [[82, 0], [106, 0], [112, 6], [112, 34], [106, 40], [82, 40], [76, 34], [76, 6], [82, 0]],
        [[120, 40], [120, 0], [150, 40], [150, 0]]
      ];
      function logo(ctx, y) {
        const ox = W / 2 - 75, flick = 0.85 + 0.15 * Math.sin(stT * 0.2);
        ctx.save(); ctx.lineJoin = 'miter'; ctx.miterLimit = 2; ctx.lineCap = 'square';
        const pass = (w, c, blur) => {
          ctx.lineWidth = w; ctx.strokeStyle = c; ctx.shadowColor = '#2a8cff'; ctx.shadowBlur = blur;
          ctx.beginPath();
          for (const L of LOGO) { let pen = false; for (const p of L) { if (!p) { pen = false; continue; } if (!pen) ctx.moveTo(ox + p[0], y + p[1]); else ctx.lineTo(ox + p[0], y + p[1]); pen = true; } }
          ctx.stroke();
        };
        ctx.globalAlpha = flick;
        pass(9, '#0a3a90', 12); pass(6, '#2a8cff', 6); pass(2, '#d0f4ff', 0);
        ctx.restore();
        // horizontal light streak through the logo
        ctx.fillStyle = '#ff8a1a'; ctx.fillRect(20, y + 52, W - 40, 1);
        ctx.fillStyle = '#ffd0a0'; ctx.fillRect(60, y + 52, W - 120, 1);
      }
      function floor(ctx, y0, t) {
        ctx.fillStyle = '#1a50c0';
        for (let i = -12; i <= 12; i++) pixLine(ctx, W / 2 + i * 6, y0, W / 2 + i * 40, H, '#0c2a70');
        for (let k = 0; k < 8; k++) {
          const f = ((k + (t * 0.02) % 1) / 8); const y = y0 + (H - y0) * f * f;
          ctx.fillStyle = '#1a50c0'; ctx.fillRect(0, Math.round(y), W, 1);
        }
      }
      function icon(ctx, g, cx, cy, active, t) {
        if (g === 'io') {
          ctx.fillStyle = active ? '#ffffff' : '#40c0ff';
          for (let x = -3; x <= 3; x++) ctx.fillRect(cx + x, cy - 22, 1, 26);
          for (let a = 0; a < 40; a++) { const an = a / 40 * 6.283; ctx.fillRect(Math.round(cx + Math.cos(an) * 14), Math.round(cy + 4 + Math.sin(an) * 6), 1, 1); }
        } else if (g === 'mcp') {
          const cols = ['#ff3030', '#ff9020', '#ffff40', '#40ff80', '#40c0ff', '#c040ff'];
          for (let y = 0; y < 26; y++) { const hw = Math.round(18 - y * 0.6); ctx.fillStyle = cols[Math.floor((y + t * 0.2) / 3) % 6]; ctx.fillRect(cx - hw, cy - 16 + y, hw * 2, 1); }
        } else if (g === 'tank') {
          ctx.save(); ctx.translate(cx, cy); ctx.scale(2, 2); ctx.drawImage(SP.tankB0[0].c, -5.5, -4.5); ctx.restore();
        } else {
          ctx.save(); ctx.translate(cx, cy); ctx.scale(2, 2); ctx.drawImage(SP.cycB[0].c, -6, -3); ctx.restore();
          ctx.fillStyle = '#2a8cff'; ctx.fillRect(cx - 40, cy + 1, 28, 2);
        }
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') {
          floor(ctx, 160, stT);
          logo(ctx, 40);
          drawText(ctx, 'HIGH SCORE ' + hi, W / 2, 16, '#ff8a1a', 1, 'center');
          const cr = api.credits;
          if (cr > 0) { if (coinHold > 0 || (stT % 60) < 40) drawText(ctx, 'PRESS START', W / 2, 128, '#ffffff', 1, 'center'); }
          else if (coinFlash > 0 ? (coinFlash > 90 || (coinFlash % 20) < 14) : (stT % 60) < 40) drawText(ctx, 'INSERT COIN', W / 2, 128, coinFlash > 0 ? '#ff4040' : '#ffffff', 1, 'center');
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 34, 225, 68, 13);
          drawText(ctx, 'CREDITS ' + Math.min(cr, 99), W / 2, 228, '#ffe040', 1, 'center');
          drawText(ctx, 'LIGHT CYCLES  TANKS', W / 2, 142, '#40c0ff', 1, 'center');
          drawText(ctx, 'MCP CONE  I/O TOWER', W / 2, 152, '#40c0ff', 1, 'center');
          drawParts(ctx);
          return;
        }
        hud(ctx);
        if (state === 'select') {
          drawText(ctx, 'LEVEL ' + (lvl + 1) + '  ' + LEVELS[lvl % 12], W / 2, 24, '#ffff40', 1, 'center');
          const quads = [[0, 36], [128, 36], [0, 138], [128, 138]];
          GAMES.forEach((g, i) => {
            const [x, y] = quads[i], act = sel === i && ((stT >> 3) & 1 || true);
            const c = done[g] ? '#303848' : sel === i ? ((stT >> 3) & 1 ? '#ffffff' : '#ff8a1a') : '#2a8cff';
            ctx.fillStyle = c; ctx.fillRect(x + 4, y, 120, 1); ctx.fillRect(x + 4, y + 97, 120, 1); ctx.fillRect(x + 4, y, 1, 98); ctx.fillRect(x + 123, y, 1, 98);
            if (!done[g]) icon(ctx, g, x + 64, y + 44, act, stT);
            drawText(ctx, GNAME[g], x + 64, y + 80, done[g] ? '#505868' : '#ffffff', 1, 'center');
            if (done[g]) drawText(ctx, 'DONE', x + 64, y + 40, '#40ff80', 2, 'center');
          });
          // Tron at the centre points at the chosen game
          ctx.fillStyle = '#000'; ctx.fillRect(112, 118, 32, 40);
          blit(ctx, SP.man0, 128, 132);
          drawText(ctx, String(Math.ceil(selT / 60)), W / 2, 146, '#ffff40', 1, 'center');
          const [qx, qy] = [[-1, -1], [1, -1], [-1, 1], [1, 1]][sel];
          pixLine(ctx, 128, 130, 128 + qx * 10, 130 + qy * 10, '#ffff40');
          return;
        }
        if (state === 'game' || state === 'result') {
          game.render(ctx);
          drawParts(ctx);
          if (state === 'result') {
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 104, W, 30);
            drawText(ctx, resMsg, W / 2, 112, resMsg === 'DEREZZED' || resMsg === 'GAME OVER' ? '#ff3030' : '#40ff80', 1, 'center');
            if (resMsg === 'LEVEL COMPLETE') drawText(ctx, 'NEXT ' + LEVELS[lvl % 12], W / 2, 122, '#ffff40', 1, 'center');
          }
          return;
        }
        if (state === 'gameover') {
          drawText(ctx, 'GAME OVER', W / 2, 100, '#ff3030', 2, 'center');
          drawText(ctx, 'END OF LINE', W / 2, 130, '#2a8cff', 1, 'center');
        }
      }
      return { update, render };
    }
  });
})();
