// Route 16 (Tehkan / Sun Electronics, 1981) - from-scratch recreation.
// Drive through a city of 16 rooms, grab every money bag while three pursuit cars hunt you. Watch your fuel.
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

  const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1]; // 0 right, 1 down, 2 left, 3 up

  // Grid mover: e.x/e.y are pixel centres in the local grid (tile size T). decide(e, tx, ty) is called at tile
  // centres and returns the direction to take, or -1 to stop there.
  function advance(e, T, decide) {
    let rem = e.spd;
    e.moving = false;
    for (let guard = 0; rem > 1e-6 && guard < 6; guard++) {
      const tx = Math.floor(e.x / T), ty = Math.floor(e.y / T);
      const cx = tx * T + T / 2, cy = ty * T + T / 2;
      if (Math.abs(e.x - cx) < 1e-4 && Math.abs(e.y - cy) < 1e-4) {
        e.x = cx; e.y = cy;
        const nd = decide(e, tx, ty);
        if (nd < 0) return;
        e.dir = nd;
        const d = Math.min(rem, T);
        e.x += DX[nd] * d; e.y += DY[nd] * d; rem -= d; e.moving = true;
        if (d === T) { e.x = cx + DX[nd] * T; e.y = cy + DY[nd] * T; }
        continue;
      }
      const off = (e.x - cx) * DX[e.dir] + (e.y - cy) * DY[e.dir];
      e.moving = true;
      if (off < 0) {
        const d = Math.min(rem, -off);
        e.x += DX[e.dir] * d; e.y += DY[e.dir] * d; rem -= d;
        if (d >= -off - 1e-6) { e.x = cx; e.y = cy; }
      } else {
        const d = Math.min(rem, T - off);
        e.x += DX[e.dir] * d; e.y += DY[e.dir] * d; rem -= d;
        if (d >= T - off - 1e-6) { e.x = cx + DX[e.dir] * T; e.y = cy + DY[e.dir] * T; }
      }
    }
  }

  // 7x7 car, facing right. b body, t trim, c cockpit, h headlight, w wheel
  const CAR = [
    '.ww.ww.',
    'tbbbbbt',
    'bbcbbbh',
    'bbccbbb',
    'bbcbbbh',
    'tbbbbbt',
    '.ww.ww.'
  ];
  function drawCar(ctx, x, y, dir, s, body, trim) {
    const x0 = Math.round(x) - 3 * s - (s > 1 ? 0 : 0), y0 = Math.round(y) - 3 * s;
    const cols = { b: body, t: trim, c: '#101830', h: '#ffffa0', w: '#202020' };
    for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) {
      const ch = CAR[j][i]; if (ch === '.') continue;
      const lx = i - 3, ly = j - 3;
      let rx, ry;
      if (dir === 0) { rx = lx; ry = ly; } else if (dir === 1) { rx = -ly; ry = lx; }
      else if (dir === 2) { rx = -lx; ry = -ly; } else { rx = ly; ry = -lx; }
      ctx.fillStyle = cols[ch];
      ctx.fillRect(x0 + (rx + 3) * s, y0 + (ry + 3) * s, s, s);
    }
  }

  ArcadeRegistry.register({
    id: 'route16', title: 'Route 16', year: 1981, maker: 'Tehkan / Sun Electronics',
    width: 224, height: 256, vector: false, pointer: false,
    controls: 'Arrows: drive \u00b7 Enter/Space: start',
    marquee: { bg: '#001400', fg: '#ffd800', accent: '#ff3030' },
    create(api) {
      const W = 224, H = 256;
      const MT = 8, MN = 27, MX = 4, MY = 22;      // city map: 27x27 tiles of 8px
      const RT = 16, RN = 13, RX = 8, RY = 22;     // room close-up: 13x13 tiles of 16px
      const au = api.audio;
      const ROOMCOL = ['#e8443c', '#3cc8e8', '#e8b030', '#b060f0', '#40d860', '#f070c0'];
      const HOMES = [[1, 1], [25, 1], [13, 1]];
      let hi = api.getHiScore(10000);
      let mode = 'title', titleT = 0, coinFlash = 0, lastCred = api.credits;
      let g = null;

      // ---------- map ----------
      function isRoad(x, y) {
        if (x < 1 || y < 1 || x > 25 || y > 25) return false;
        return x % 6 === 1 || y % 6 === 1;
      }
      function roomCenter(i) { return [4 + 6 * (i % 4), 4 + 6 * Math.floor(i / 4)]; }
      function mapDoor(i) { const [cx, cy] = roomCenter(i), s = g.rooms[i].side; return [cx + 2 * DX[s], cy + 2 * DY[s]]; }
      function mapOutside(i) { const [cx, cy] = roomCenter(i), s = g.rooms[i].side; return [cx + 3 * DX[s], cy + 3 * DY[s]]; }
      function roomDoor(i) { const s = g.rooms[i].side; return [6 + 6 * DX[s], 6 + 6 * DY[s]]; }
      function roomInside(i) { const s = g.rooms[i].side; return [6 + 5 * DX[s], 6 + 5 * DY[s]]; }
      function doorRoomAt(x, y) {
        for (let i = 0; i < 16; i++) { const [dx, dy] = mapDoor(i); if (dx === x && dy === y) return i; }
        return -1;
      }
      // 0 blocked, 1 free, 2 door
      function tileKind(loc, x, y) {
        if (loc < 0) {
          if (isRoad(x, y)) return 1;
          return doorRoomAt(x, y) >= 0 ? 2 : 0;
        }
        if (x < 0 || y < 0 || x >= RN || y >= RN) return 0;
        const [dx, dy] = roomDoor(loc);
        if (x === dx && y === dy) return 2;
        return g.rooms[loc].tiles[y * RN + x] ? 0 : 1;
      }

      function makeRoom(i, stage) {
        // every side of a room box touches a road in the lattice, so any side can hold the door
        const side = Math.floor(Math.random() * 4);
        const tiles = new Uint8Array(RN * RN);
        for (let y = 0; y < RN; y++) for (let x = 0; x < RN; x++) {
          if (x === 0 || y === 0 || x === RN - 1 || y === RN - 1) tiles[y * RN + x] = 1;
          else if (x % 2 === 0 && y % 2 === 0) tiles[y * RN + x] = 1;
        }
        const room = { side, tiles, items: [], cleared: false, col: ROOMCOL[(i + stage) % ROOMCOL.length], visited: false };
        const ins = [6 + 5 * DX[side], 6 + 5 * DY[side]];
        const connected = () => {
          const seen = new Uint8Array(RN * RN), q = [ins];
          seen[ins[1] * RN + ins[0]] = 1; let n = 1;
          while (q.length) {
            const [x, y] = q.pop();
            for (let d = 0; d < 4; d++) {
              const nx = x + DX[d], ny = y + DY[d];
              if (nx < 1 || ny < 1 || nx > RN - 2 || ny > RN - 2) continue;
              const k = ny * RN + nx;
              if (tiles[k] || seen[k]) continue;
              seen[k] = 1; n++; q.push([nx, ny]);
            }
          }
          let free = 0; for (let y = 1; y < RN - 1; y++) for (let x = 1; x < RN - 1; x++) if (!tiles[y * RN + x]) free++;
          return n === free;
        };
        const merges = 4 + Math.min(6, stage);
        for (let m = 0, tries = 0; m < merges && tries < 60; tries++) {
          const px = 2 + 2 * Math.floor(Math.random() * 5), py = 2 + 2 * Math.floor(Math.random() * 5);
          const d = Math.floor(Math.random() * 4);
          const nx = px + 2 * DX[d], ny = py + 2 * DY[d];
          if (nx < 2 || ny < 2 || nx > 10 || ny > 10) continue;
          const bx = px + DX[d], by = py + DY[d], k = by * RN + bx;
          if (tiles[k]) continue;
          if (Math.abs(bx - ins[0]) + Math.abs(by - ins[1]) < 2) continue;
          tiles[k] = 1;
          if (!connected()) { tiles[k] = 0; continue; }
          m++;
        }
        const free = [];
        for (let y = 1; y < RN - 1; y++) for (let x = 1; x < RN - 1; x++) {
          if (tiles[y * RN + x]) continue;
          if (Math.abs(x - ins[0]) + Math.abs(y - ins[1]) < 4) continue;
          free.push([x, y]);
        }
        const nb = 2 + (Math.random() < 0.5 ? 1 : 0);
        for (let b = 0; b < nb + 1 && free.length; b++) {
          const k = Math.floor(Math.random() * free.length);
          const [x, y] = free.splice(k, 1)[0];
          if (b < nb) room.items.push({ x, y, kind: 'bag' });
          else if (Math.random() < 0.45) room.items.push({ x, y, kind: 'q' });
        }
        return room;
      }

      // ---------- game state ----------
      function newGame(demo) {
        g = {
          demo: !!demo, score: 0, lives: 3, stage: 1, extra: false,
          phase: 'ready', t: 120, pops: [], fuel: 100, power: 0, powerChain: 0, stun: 0,
          engine: 0, lowBeep: 0, demoT: 0
        };
        setupStage();
      }
      function setupStage() {
        g.rooms = [];
        for (let i = 0; i < 16; i++) g.rooms.push(makeRoom(i, g.stage));
        g.fuel = 100;
        resetActors();
      }
      function enemySpeed() { return Math.min(1.12, 0.78 + 0.05 * (g.stage - 1)); }
      function resetActors() {
        g.p = { x: 13 * MT + 4, y: 25 * MT + 4, dir: 3, want: 3, spd: 1.05, loc: -1, door: -1 };
        g.enemies = HOMES.map(([hx, hy], i) => ({
          idx: i, x: hx * MT + 4, y: hy * MT + 4, dir: 1, spd: enemySpeed(), loc: -1,
          wait: 60 + i * 90, dead: 0, enterT: 0, exitT: 0, wtx: 13, wty: 13, wanderT: 0, atDoor: false
        }));
        g.power = 0; g.stun = 0;
      }
      function T(loc) { return loc < 0 ? MT : RT; }
      function scaleFor(loc) { return loc < 0 ? 1 : RT / MT; }

      function addScore(n) {
        if (g.demo) return;
        g.score += n;
        if (!g.extra && g.score >= 20000) {
          g.extra = true; g.lives++;
          au.melody([[1047, .07], [1319, .07], [1568, .07], [2093, .16]], { type: 'square', vol: .1 });
        }
        if (g.score > hi) hi = g.score;
      }
      function pop(loc, x, y, txt, col) { g.pops.push({ loc, x, y, txt, col, t: 70 }); }

      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(110, .25, { type: 'square', vol: .14 });
        return false;
      }

      // ---------- sounds ----------
      const snd = {
        bag() { au.tone(880, .05, { type: 'square', vol: .12, slideTo: 1760 }); au.tone(1320, .06, { type: 'square', vol: .1, delay: .05 }); },
        room() { au.melody([[784, .06], [988, .06], [1175, .06], [1568, .12]], { type: 'square', vol: .12 }); },
        enter() { au.tone(330, .08, { type: 'triangle', vol: .15, slideTo: 660 }); },
        exit() { au.tone(660, .08, { type: 'triangle', vol: .15, slideTo: 330 }); },
        crash() { au.noise(.7, { vol: .25, freq: 1800, slideTo: 120 }); au.tone(300, .6, { type: 'sawtooth', vol: .12, slideTo: 40 }); },
        power() { au.melody([[523, .05], [659, .05], [784, .05], [1047, .05], [784, .05], [1047, .1]], { type: 'square', vol: .12 }); },
        bomb() { au.noise(.4, { vol: .22, freq: 900, slideTo: 100 }); au.tone(90, .4, { type: 'square', vol: .12 }); },
        eat() { au.tone(200, .18, { type: 'square', vol: .14, slideTo: 1600 }); },
        start() { au.melody([[392, .1], [523, .1], [659, .1], [784, .2], [659, .1], [784, .3]], { type: 'square', vol: .13 }); },
        clear() { au.melody([[523, .1], [659, .1], [784, .1], [1047, .1], [784, .1], [1047, .1], [1319, .3]], { type: 'square', vol: .13 }); }
      };

      // ---------- player ----------
      function readInput() {
        const p = g.p;
        if (g.demo) return;
        if (api.key('ArrowLeft')) p.want = 2;
        else if (api.key('ArrowRight')) p.want = 0;
        else if (api.key('ArrowUp')) p.want = 3;
        else if (api.key('ArrowDown')) p.want = 1;
      }
      function playerDecide(e, tx, ty) {
        if (g.demo) {
          // demo driver: random turns at junctions, prefers rooms that still hold bags
          const opts = [];
          for (let d = 0; d < 4; d++) {
            const k = tileKind(e.loc, tx + DX[d], ty + DY[d]);
            if (!k) continue;
            if (k === 2 && e.loc < 0) { const r = doorRoomAt(tx + DX[d], ty + DY[d]); if (g.rooms[r].cleared) continue; }
            if (d === (e.dir + 2) % 4 && Math.random() < 0.85) continue;
            opts.push(d);
          }
          if (opts.length) e.want = opts[Math.floor(Math.random() * opts.length)];
          if (e.loc >= 0 && Math.random() < 0.02) e.want = (e.dir + 2) % 4;
        }
        for (const d of [e.want, e.dir]) {
          if (d < 0) continue;
          const k = tileKind(e.loc, tx + DX[d], ty + DY[d]);
          if (k === 1) return d;
          if (k === 2) { e.door = d; return -1; }
        }
        return -1;
      }
      function enterRoom(i) {
        const p = g.p;
        const [ix, iy] = roomInside(i);
        p.loc = i; p.x = ix * RT + RT / 2; p.y = iy * RT + RT / 2; p.dir = (g.rooms[i].side + 2) % 4; p.want = p.dir; p.spd = 1.05 * 2;
        g.rooms[i].visited = true;
        if (!g.demo) snd.enter();
      }
      function exitRoom() {
        const p = g.p, i = p.loc;
        const [ox, oy] = mapOutside(i);
        p.loc = -1; p.x = ox * MT + MT / 2; p.y = oy * MT + MT / 2; p.dir = g.rooms[i].side; p.want = p.dir; p.spd = 1.05;
        // a car parked at the door slips into the room as you drive out (no unseen instant crash)
        const [ix, iy] = roomInside(i);
        for (const e of g.enemies) {
          if (e.dead || e.loc !== -1) continue;
          if (Math.abs(e.x - p.x) < MT * 1.6 && Math.abs(e.y - p.y) < MT * 1.6) {
            e.loc = i; e.x = ix * RT + RT / 2; e.y = iy * RT + RT / 2; e.dir = (g.rooms[i].side + 2) % 4; e.exitT = 0; e.atDoor = false;
          }
        }
        if (!g.demo) snd.exit();
      }
      function collectItems() {
        const p = g.p; if (p.loc < 0) return;
        const room = g.rooms[p.loc];
        const tx = Math.floor(p.x / RT), ty = Math.floor(p.y / RT);
        for (let k = room.items.length - 1; k >= 0; k--) {
          const it = room.items[k];
          if (it.x !== tx || it.y !== ty) continue;
          const cx = tx * RT + RT / 2, cy = ty * RT + RT / 2;
          if (Math.abs(p.x - cx) + Math.abs(p.y - cy) > RT * 0.55) continue;
          room.items.splice(k, 1);
          if (it.kind === 'bag') {
            const v = Math.min(500, 100 * g.stage);
            addScore(v); pop(p.loc, cx, cy, String(v), '#ffe060');
            g.fuel = Math.min(100, g.fuel + 4);
            if (!g.demo) snd.bag();
          } else {
            const r = Math.random();
            if (r < 0.5) {
              g.power = 420; g.powerChain = 0; if (!g.demo) snd.power();
              pop(p.loc, cx, cy, 'POWER', '#60c0ff');
            } else if (r < 0.75) {
              addScore(2000); pop(p.loc, cx, cy, '2000', '#ff80ff'); if (!g.demo) snd.room();
            } else {
              g.stun = 90; g.fuel = Math.max(1, g.fuel - 15); pop(p.loc, cx, cy, 'BOMB!', '#ff4040'); if (!g.demo) snd.bomb();
            }
          }
          if (!room.cleared && !room.items.some(q => q.kind === 'bag')) {
            room.cleared = true; addScore(500); g.fuel = Math.min(100, g.fuel + 10);
            pop(p.loc, W / 2 - RX, RT * 6.5, 'ROOM CLEAR 500', '#80ff80');
            if (!g.demo) snd.room();
            if (g.rooms.every(r2 => r2.cleared)) { g.phase = 'clear'; g.t = 0; if (!g.demo) snd.clear(); }
          }
        }
      }

      // ---------- enemies ----------
      function hunting(e) {
        const n = Math.min(3, 1 + Math.floor(g.stage / 2));
        return e.idx < n;
      }
      function enemyTarget(e) {
        const p = g.p;
        if (g.power > 0) {
          // run for the corner furthest from the player
          if (e.loc < 0) {
            const px = p.loc < 0 ? p.x / MT : roomCenter(p.loc)[0];
            const py = p.loc < 0 ? p.y / MT : roomCenter(p.loc)[1];
            return [px < 13 ? 25 : 1, py < 13 ? 25 : 1];
          }
          const [dx, dy] = roomDoor(e.loc);
          return [dx, dy];
        }
        if (e.loc >= 0) {
          if (p.loc === e.loc) {
            if (e.idx === 1) return [Math.floor(p.x / RT) + 2 * DX[p.dir], Math.floor(p.y / RT) + 2 * DY[p.dir]];
            return [Math.floor(p.x / RT), Math.floor(p.y / RT)];
          }
          return roomInside(e.loc);
        }
        if (p.loc >= 0) {
          if (hunting(e)) return mapOutside(p.loc);
        } else {
          const ptx = Math.floor(p.x / MT), pty = Math.floor(p.y / MT);
          const ex = Math.floor(e.x / MT), ey = Math.floor(e.y / MT);
          const near = Math.abs(ptx - ex) + Math.abs(pty - ey) < 12;
          if (hunting(e) || near) {
            if (e.idx === 1) return [ptx + 4 * DX[p.dir], pty + 4 * DY[p.dir]];
            if (e.idx === 2) return [2 * ptx - ex, 2 * pty - ey];
            return [ptx, pty];
          }
        }
        if (--e.wanderT <= 0) {
          e.wanderT = 240 + Math.random() * 200;
          e.wtx = 1 + 6 * Math.floor(Math.random() * 5); e.wty = 1 + 6 * Math.floor(Math.random() * 5);
        }
        return [e.wtx, e.wty];
      }
      function enemyDecide(e, tx, ty) {
        const p = g.p;
        if (e.loc < 0 && p.loc >= 0 && hunting(e) && g.power <= 0) {
          const [ox, oy] = mapOutside(p.loc);
          if (tx === ox && ty === oy) { e.atDoor = true; return -1; }
        }
        e.atDoor = false;
        const [gx, gy] = enemyTarget(e);
        const back = (e.dir + 2) % 4;
        let best = -1, bd = 1e9; const opts = [];
        for (let d = 0; d < 4; d++) {
          if (tileKind(e.loc, tx + DX[d], ty + DY[d]) !== 1) continue;
          if (d === back) continue;
          opts.push(d);
          const nx = tx + DX[d], ny = ty + DY[d];
          const dd = (nx - gx) * (nx - gx) + (ny - gy) * (ny - gy);
          if (dd < bd) { bd = dd; best = d; }
        }
        if (best < 0) return tileKind(e.loc, tx + DX[back], ty + DY[back]) === 1 ? back : -1;
        if (opts.length > 1 && Math.random() < 0.12) return opts[Math.floor(Math.random() * opts.length)];
        return best;
      }
      function updateEnemy(e) {
        const p = g.p;
        if (e.dead > 0) {
          if (--e.dead === 0) {
            const [hx, hy] = HOMES[e.idx];
            e.loc = -1; e.x = hx * MT + 4; e.y = hy * MT + 4; e.dir = 1; e.wait = 30;
          }
          return;
        }
        if (e.wait > 0) { e.wait--; return; }
        const base = enemySpeed() * (g.power > 0 ? 0.6 : 1);
        e.spd = base * scaleFor(e.loc);
        // leave a room the player is no longer in
        if (e.loc >= 0 && (p.loc !== e.loc || g.power > 0)) {
          if (++e.exitT > (g.power > 0 ? 20 : 70)) {
            const [ox, oy] = mapOutside(e.loc);
            e.dir = g.rooms[e.loc].side; e.loc = -1; e.x = ox * MT + 4; e.y = oy * MT + 4; e.exitT = 0;
            e.spd = base;
          }
        } else e.exitT = 0;
        advance(e, T(e.loc), enemyDecide);
        if (e.atDoor && p.loc >= 0 && e.loc < 0) {
          if (++e.enterT > 40) {
            e.enterT = 0; e.atDoor = false;
            const [ix, iy] = roomInside(p.loc);
            e.loc = p.loc; e.x = ix * RT + RT / 2; e.y = iy * RT + RT / 2; e.dir = (g.rooms[p.loc].side + 2) % 4;
            if (!g.demo) au.tone(180, .2, { type: 'sawtooth', vol: .1, slideTo: 360 });
          }
        } else e.enterT = 0;
      }

      function killPlayer() {
        g.phase = 'dying'; g.t = 110;
        if (!g.demo) snd.crash();
      }

      function checkCollisions() {
        const p = g.p;
        for (const e of g.enemies) {
          if (e.dead || e.wait > 0 || e.loc !== p.loc) continue;
          const lim = T(p.loc) * 0.75;
          if (Math.abs(e.x - p.x) < lim && Math.abs(e.y - p.y) < lim) {
            if (g.power > 0) {
              const v = 1000 * Math.pow(2, Math.min(2, g.powerChain++));
              addScore(v); pop(p.loc, e.x, e.y, String(v), '#60e0ff');
              e.dead = 200; if (!g.demo) snd.eat();
            } else { killPlayer(); return; }
          }
        }
      }

      function updatePlay() {
        const p = g.p;
        readInput();
        if (g.stun > 0) g.stun--;
        else {
          if (p.want === (p.dir + 2) % 4) p.dir = p.want;
          p.door = -1;
          advance(p, T(p.loc), playerDecide);
          if (p.door >= 0) {
            if (p.loc < 0) {
              const tx = Math.floor(p.x / MT) + DX[p.door], ty = Math.floor(p.y / MT) + DY[p.door];
              const r = doorRoomAt(tx, ty);
              if (r >= 0) enterRoom(r);
            } else exitRoom();
          }
          collectItems();
          if (g.phase !== 'play') return;
          if (p.moving && !g.demo && (++g.engine % 9) === 0) au.tone(70 + (p.loc >= 0 ? 20 : 0), .05, { type: 'square', vol: .035 });
        }
        if (g.power > 0) {
          g.power--;
          if (!g.demo && g.power % 20 === 0 && g.power > 0) au.tone(g.power < 120 ? 600 : 900, .05, { type: 'triangle', vol: .06 });
        }
        for (const e of g.enemies) updateEnemy(e);
        checkCollisions();
        if (g.phase !== 'play') return;
        if (!g.demo) {
          g.fuel -= 100 / (60 * 85);
          if (g.fuel < 20 && --g.lowBeep <= 0) { g.lowBeep = 40; au.tone(1200, .06, { type: 'square', vol: .08 }); }
          if (g.fuel <= 0) { g.fuel = 0; pop(p.loc, p.x, p.y - 10, 'NO FUEL', '#ff4040'); killPlayer(); }
        } else if (++g.demoT > 1500) { mode = 'title'; titleT = 0; }
      }

      function gameOver() {
        g.phase = 'over'; g.t = 240;
        api.setHiScore(g.score);
        au.melody([[392, .2], [330, .2], [294, .2], [262, .5]], { type: 'square', vol: .13 });
      }

      function update() {
        if (api.credits > lastCred) au.tone(1568, .06, { type: 'square', vol: .08, slideTo: 2093 });
        lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (titleT === 420) newGame(true);
          if (titleT > 420 && g && g.demo) {
            if (g.phase === 'ready') { if (--g.t <= 0) g.phase = 'play'; }
            else if (g.phase === 'play') updatePlay();
            else if (g.phase === 'dying' || g.phase === 'clear') { if (--g.t <= 0 || g.phase === 'clear') { titleT = 0; } }
            if (mode === 'title' && titleT === 0) g = null;
          }
          if (titleT > 2400) { titleT = 0; g = null; }
          if (api.anyPressed('Enter', 'Space') && tryStart()) {
            mode = 'game'; newGame(false); snd.start();
          }
          return;
        }
        for (const pp of g.pops) { pp.t--; pp.y -= 0.2; }
        g.pops = g.pops.filter(pp => pp.t > 0);
        if (g.phase === 'ready') { if (--g.t <= 0) g.phase = 'play'; return; }
        if (g.phase === 'play') { updatePlay(); return; }
        if (g.phase === 'dying') {
          if (--g.t > 0) return;
          const respawn = () => { resetActors(); g.fuel = Math.max(g.fuel, 60); g.phase = 'ready'; g.t = 100; };
          if (g.lives <= 1) {
            g.phase = 'wait';
            if (api.offerContinue) api.offerContinue(() => { g.lives = 3; respawn(); }, gameOver);
            else gameOver();
          } else { g.lives--; respawn(); }
          return;
        }
        if (g.phase === 'clear') {
          g.t++;
          if (g.t > 60 && g.t % 4 === 0 && g.fuel > 0) {
            const f = Math.min(g.fuel, 2); g.fuel -= f; addScore(Math.round(f * 10));
            au.tone(1000 + g.fuel * 8, .03, { type: 'square', vol: .07 });
          }
          if (g.t > 60 && g.fuel <= 0 && g.t > 260) {
            g.stage++; setupStage(); g.phase = 'ready'; g.t = 120;
          }
          return;
        }
        if (g.phase === 'over') {
          if (--g.t <= 0 || (g.t < 150 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; titleT = 0; g = null; }
        }
      }

      // ---------- rendering ----------
      function drawMap(ctx) {
        ctx.fillStyle = '#0a1a0a'; ctx.fillRect(MX, MY, MN * MT, MN * MT);
        // roads
        for (let y = 0; y < MN; y++) for (let x = 0; x < MN; x++) {
          if (!isRoad(x, y)) continue;
          const px = MX + x * MT, py = MY + y * MT;
          ctx.fillStyle = '#34343c'; ctx.fillRect(px, py, MT, MT);
          ctx.fillStyle = '#5a5a64';
          const hz = y % 6 === 1, vt = x % 6 === 1;
          if (hz && !vt && (x & 1)) ctx.fillRect(px + 2, py + 4, 4, 1);
          if (vt && !hz && (y & 1)) ctx.fillRect(px + 4, py + 2, 1, 4);
        }
        // outer kerb
        ctx.fillStyle = '#208020';
        ctx.fillRect(MX + 6, MY + 6, MN * MT - 12, 1); ctx.fillRect(MX + 6, MY + MN * MT - 7, MN * MT - 12, 1);
        ctx.fillRect(MX + 6, MY + 6, 1, MN * MT - 12); ctx.fillRect(MX + MN * MT - 7, MY + 6, 1, MN * MT - 12);
        // rooms
        for (let i = 0; i < 16; i++) {
          const r = g.rooms[i];
          const [cx, cy] = roomCenter(i);
          const x0 = MX + (cx - 2) * MT, y0 = MY + (cy - 2) * MT;
          ctx.fillStyle = r.cleared ? '#141414' : '#0c0c24'; ctx.fillRect(x0, y0, 40, 40);
          ctx.fillStyle = r.cleared ? '#505050' : r.col;
          ctx.fillRect(x0, y0, 40, 2); ctx.fillRect(x0, y0 + 38, 40, 2); ctx.fillRect(x0, y0, 2, 40); ctx.fillRect(x0 + 38, y0, 2, 40);
          // door gap
          const [dx, dy] = mapDoor(i);
          ctx.fillStyle = '#34343c';
          const gx = MX + dx * MT, gy = MY + dy * MT;
          if (r.side === 0 || r.side === 2) ctx.fillRect(r.side === 0 ? gx + 6 : gx, gy + 1, 2, 6);
          else ctx.fillRect(gx + 1, r.side === 1 ? gy + 6 : gy, 6, 2);
          ctx.fillStyle = (api.frame >> 4) & 1 ? '#ffffff' : r.col;
          if (r.side === 0 || r.side === 2) ctx.fillRect(r.side === 0 ? gx + 6 : gx, gy + 3, 2, 2);
          else ctx.fillRect(gx + 3, r.side === 1 ? gy + 6 : gy, 2, 2);
          // contents
          if (r.cleared) { text(ctx, 'OK', x0 + 20, y0 + 16, '#606060', 1, 'center'); continue; }
          let k = 0;
          for (const it of r.items) {
            const ix = x0 + 8 + (k % 4) * 7, iy = y0 + 12 + Math.floor(k / 4) * 8;
            if (it.kind === 'bag') { ctx.fillStyle = '#e0b030'; ctx.fillRect(ix, iy + 1, 5, 4); ctx.fillRect(ix + 1, iy, 3, 1); }
            else { ctx.fillStyle = '#ff60ff'; ctx.fillRect(ix + 1, iy, 3, 1); ctx.fillRect(ix + 3, iy + 1, 1, 1); ctx.fillRect(ix + 2, iy + 2, 1, 1); ctx.fillRect(ix + 2, iy + 4, 1, 1); }
            k++;
          }
          text(ctx, String(i + 1), x0 + 20, y0 + 27, '#40406a', 1, 'center');
        }
        // player in a room: mark it
        if (g.p.loc >= 0 && (api.frame >> 3) & 1) {
          const [cx, cy] = roomCenter(g.p.loc);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(MX + cx * MT, MY + cy * MT, 3, 3);
        }
      }
      function enemyColors(e) {
        if (g.power > 0) {
          const fl = g.power < 120 && (api.frame >> 3) & 1;
          return fl ? ['#ffffff', '#4040ff'] : ['#3050ff', '#a0c0ff'];
        }
        return ['#ff2a2a', '#ffd040'];
      }
      function drawActors(ctx, loc, ox, oy, s) {
        for (const e of g.enemies) {
          if (e.dead || e.loc !== loc) continue;
          if (e.wait > 0 && (api.frame >> 2) & 1) continue;
          const [b, t] = enemyColors(e);
          drawCar(ctx, ox + e.x, oy + e.y, e.dir, s, b, t);
        }
        const p = g.p;
        if (p.loc === loc) {
          if (g.phase === 'dying') drawCrash(ctx, ox + p.x, oy + p.y, s);
          else if (g.stun > 0 && (api.frame >> 2) & 1) drawCar(ctx, ox + p.x, oy + p.y, p.dir, s, '#ff8000', '#ffffff');
          else drawCar(ctx, ox + p.x, oy + p.y, p.dir, s, '#38a8ff', '#ffffff');
        }
        for (const pp of g.pops) if (pp.loc === loc) text(ctx, pp.txt, ox + pp.x, oy + pp.y - 4, pp.col, 1, 'center');
      }
      function drawCrash(ctx, x, y, s) {
        const k = 110 - g.t;
        const cols = ['#ffffff', '#ffe040', '#ff8020', '#ff2020'];
        for (let i = 0; i < 12; i++) {
          const a = i * Math.PI / 6 + k * 0.05, r = Math.min(k, 30) * 0.35 * s;
          ctx.fillStyle = cols[(i + (k >> 2)) & 3];
          ctx.fillRect(Math.round(x + Math.cos(a) * r) - s, Math.round(y + Math.sin(a) * r) - s, 2 * s, 2 * s);
        }
        if (k < 50) { ctx.fillStyle = cols[(k >> 1) & 3]; ctx.fillRect(Math.round(x) - 2 * s, Math.round(y) - 2 * s, 4 * s, 4 * s); }
      }
      function drawBag(ctx, x, y) {
        ctx.fillStyle = '#c08020'; ctx.fillRect(x + 3, y + 5, 10, 9); ctx.fillRect(x + 4, y + 4, 8, 11); ctx.fillRect(x + 5, y + 2, 6, 2);
        ctx.fillStyle = '#806010'; ctx.fillRect(x + 5, y + 4, 6, 1);
        ctx.fillStyle = '#ffe070';
        ctx.fillRect(x + 7, y + 6, 2, 7); ctx.fillRect(x + 6, y + 7, 4, 1); ctx.fillRect(x + 6, y + 9, 4, 1); ctx.fillRect(x + 6, y + 11, 4, 1);
        ctx.fillRect(x + 6, y + 7, 1, 3); ctx.fillRect(x + 9, y + 9, 1, 3);
      }
      function drawQ(ctx, x, y) {
        const c = ['#ff40ff', '#40ffff', '#ffff40'][(api.frame >> 3) % 3];
        ctx.fillStyle = c; ctx.fillRect(x + 2, y + 2, 12, 12);
        ctx.fillStyle = '#200020'; ctx.fillRect(x + 3, y + 3, 10, 10);
        text(ctx, '?', x + 8, y + 5, c, 1, 'center');
      }
      function drawRoom(ctx) {
        const p = g.p, r = g.rooms[p.loc];
        ctx.fillStyle = '#060a14'; ctx.fillRect(RX, RY, RN * RT, RN * RT);
        for (let y = 0; y < RN; y++) for (let x = 0; x < RN; x++) {
          const px = RX + x * RT, py = RY + y * RT;
          if (r.tiles[y * RN + x]) {
            ctx.fillStyle = r.col; ctx.fillRect(px, py, RT, RT);
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.fillRect(px, py + 7, RT, 1); ctx.fillRect(px, py + 15, RT, 1);
            ctx.fillRect(px + ((y & 1) ? 4 : 11), py, 1, 7); ctx.fillRect(px + ((y & 1) ? 11 : 4), py + 8, 1, 7);
          } else {
            ctx.fillStyle = '#0c1424'; ctx.fillRect(px + 7, py + 7, 2, 2);
          }
        }
        const [dx, dy] = roomDoor(p.loc);
        ctx.fillStyle = '#34343c'; ctx.fillRect(RX + dx * RT, RY + dy * RT, RT, RT);
        ctx.fillStyle = (api.frame >> 3) & 1 ? '#40ff40' : '#108010';
        for (let k = 0; k < 4; k++) ctx.fillRect(RX + dx * RT + 2 + k * 3 * (r.side & 1 ? 1 : 0), RY + dy * RT + 2 + k * 3 * (r.side & 1 ? 0 : 1), (r.side & 1) ? 2 : 12, (r.side & 1) ? 12 : 2);
        for (const it of r.items) {
          const x = RX + it.x * RT, y = RY + it.y * RT;
          if (it.kind === 'bag') drawBag(ctx, x, y); else drawQ(ctx, x, y);
        }
        drawActors(ctx, p.loc, RX, RY, 2);
        text(ctx, 'ROOM ' + (p.loc + 1), RX + 4, RY + 4, '#ffffff', 1);
      }
      function drawMini(ctx, x0, y0) {
        // 4x4 room radar used while inside a room
        ctx.fillStyle = '#000'; ctx.fillRect(x0 - 1, y0 - 1, 30, 30);
        ctx.fillStyle = '#304030'; ctx.fillRect(x0, y0, 28, 28);
        for (let i = 0; i < 16; i++) {
          const rx = x0 + 2 + (i % 4) * 6.5, ry = y0 + 2 + Math.floor(i / 4) * 6.5;
          ctx.fillStyle = g.rooms[i].cleared ? '#606060' : g.rooms[i].col;
          if (i === g.p.loc && (api.frame >> 3) & 1) ctx.fillStyle = '#ffffff';
          ctx.fillRect(Math.round(rx), Math.round(ry), 4, 4);
        }
        for (const e of g.enemies) {
          if (e.dead) continue;
          let ex, ey;
          if (e.loc < 0) { ex = e.x / MT; ey = e.y / MT; } else { [ex, ey] = roomCenter(e.loc); }
          ctx.fillStyle = '#ff3030';
          ctx.fillRect(Math.round(x0 + ex * 28 / 27) - 1, Math.round(y0 + ey * 28 / 27) - 1, 2, 2);
        }
      }
      function drawHud(ctx, showStage) {
        text(ctx, '1UP', 12, 2, '#ff4040');
        text(ctx, String(g ? g.score : 0).padStart(6, ' '), 4, 11, '#ffffff');
        text(ctx, 'HI-SCORE', W / 2, 2, '#ff4040', 1, 'center');
        text(ctx, String(hi).padStart(6, ' '), W / 2, 11, '#ffffff', 1, 'center');
        if (showStage !== false && g && !g.demo) text(ctx, 'STAGE ' + g.stage, W - 4, 2, '#40c0ff', 1, 'right');
      }
      function drawBottom(ctx, y) {
        for (let i = 0; i < Math.min(5, g.lives - 1); i++) drawCar(ctx, 10 + i * 10, y + 6, 3, 1, '#38a8ff', '#ffffff');
        text(ctx, 'FUEL', 62, y + 2, '#ffffff');
        ctx.fillStyle = '#303030'; ctx.fillRect(88, y + 2, 82, 7);
        const f = Math.max(0, g.fuel) / 100;
        ctx.fillStyle = f < 0.2 ? ((api.frame >> 3) & 1 ? '#ff2020' : '#802020') : f < 0.45 ? '#ffc020' : '#30e030';
        ctx.fillRect(89, y + 3, Math.round(80 * f), 5);
      }
      function credStr() { return 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'); }
      function drawLogo(ctx, y) {
        const t = api.frame;
        text(ctx, 'ROUTE', W / 2 + 1, y + 1, '#802000', 3, 'center');
        text(ctx, 'ROUTE', W / 2, y, '#ffd800', 3, 'center');
        text(ctx, '16', W / 2 + 1, y + 27, '#800000', 4, 'center');
        text(ctx, '16', W / 2, y + 26, (t >> 3) & 1 ? '#ff3030' : '#ff6040', 4, 'center');
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        drawHud(ctx);
        drawLogo(ctx, 34);
        text(ctx, '- SCORE TABLE -', W / 2, 98, '#40c0ff', 1, 'center');
        drawBag(ctx, 40, 110); text(ctx, 'MONEY BAG  100-500', 62, 115, '#ffe060');
        drawQ(ctx, 40, 130); text(ctx, 'POWER, BONUS OR BOMB', 62, 135, '#ff80ff');
        drawCar(ctx, 48, 157, 0, 2, '#3050ff', '#a0c0ff'); text(ctx, 'CAPTURE 1000-4000', 62, 154, '#80c0ff');
        text(ctx, 'ROOM CLEAR 500', 62, 172, '#80ff80');
        text(ctx, 'BONUS CAR AT 20000', W / 2, 188, '#ffffff', 1, 'center');
        const blink = (api.frame >> 5) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 206, '#ff3030', 1, 'center'); }
        else if (api.credits > 0) { if (blink) text(ctx, 'PUSH START', W / 2, 206, '#ffffff', 1, 'center'); }
        else if (blink) text(ctx, 'INSERT COIN', W / 2, 206, '#ff3030', 1, 'center');
        text(ctx, '\u00a9 1981 TEHKAN / SUN', W / 2, 226, '#a0a0a0', 1, 'center');
        text(ctx, credStr(), 4, H - 10, '#a0a0a0');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title' && (!g || !g.demo)) { drawTitle(ctx); return; }
        drawHud(ctx, g.p.loc < 0);
        const p = g.p;
        if (p.loc < 0) {
          drawMap(ctx);
          drawActors(ctx, -1, MX, MY, 1);
          drawBottom(ctx, MY + MN * MT + 2);
        } else {
          drawRoom(ctx);
          drawBottom(ctx, RY + RN * RT + 6);
          drawMini(ctx, W - 32, 6);
        }
        if (g.phase === 'ready') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 40, 120, 80, 22);
          text(ctx, 'STAGE ' + g.stage, W / 2, 123, '#40c0ff', 1, 'center');
          text(ctx, 'READY!', W / 2, 133, '#ffd800', 1, 'center');
        }
        if (g.phase === 'clear') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 60, 110, 120, 34);
          text(ctx, 'ALL BAGS TAKEN!', W / 2, 114, '#ffd800', 1, 'center');
          text(ctx, 'FUEL BONUS', W / 2, 126, '#ffffff', 1, 'center');
          text(ctx, 'STAGE ' + (g.stage + 1) + ' NEXT', W / 2, 136, '#40c0ff', 1, 'center');
        }
        if (g.phase === 'over') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 50, 118, 100, 20);
          text(ctx, 'GAME OVER', W / 2, 124, '#ff3030', 1, 'center');
        }
        if (g.demo) {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 50, 100, 100, 30);
          text(ctx, 'ROUTE 16', W / 2, 104, '#ffd800', 1, 'center');
          const blink = (api.frame >> 5) & 1;
          if (blink) text(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 117, api.credits > 0 ? '#ffffff' : '#ff3030', 1, 'center');
          text(ctx, credStr(), 4, H - 10, '#a0a0a0');
        }
      }
      return { update, render, destroy() { } };
    }
  });
})();
