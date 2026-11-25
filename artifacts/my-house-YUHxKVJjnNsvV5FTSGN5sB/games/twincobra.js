// Twin Cobra (Toaplan, 1987) - from-scratch recreation of the vertical-scrolling attack-helicopter shooter.
// Tanks, gun emplacements, gunships and boats; colour-cycling weapon capsules, S power-ups, bombs and a boss per stage.
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

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = (a, b) => a + Math.random() * (b - a);

  ArcadeRegistry.register({
    id: 'twincobra', title: 'Twin Cobra', year: 1987, maker: 'Toaplan',
    width: 240, height: 320, vector: false, pointer: false,
    controls: 'Arrows: fly \u00b7 Space (hold): fire \u00b7 X: bomb \u00b7 Enter: start',
    marquee: { bg: '#0a1a0a', fg: '#ffd800', accent: '#e02020' },
    create(api) {
      const W = 240, H = 320, TS = 16, COLS = 15, STAGE_LEN = 5200, SCROLL = 0.55;
      const WCOL = { red: '#ff3a20', blue: '#3a8aff', green: '#30e040', yellow: '#ffe020' };
      const WTYPES = ['red', 'blue', 'green', 'yellow'];
      const THEMES = [
        { name: 'GREEN PLAINS', land: ['#3a7a2a', '#357226'], dark: '#28581c', road: '#8a8a7a', water: true },
        { name: 'DESERT FRONT', land: ['#c8a860', '#c0a058'], dark: '#a08040', road: '#7a6a50', water: false },
        { name: 'HARBOR COAST', land: ['#4a7a3a', '#447234'], dark: '#2e5a24', road: '#8a8a7a', water: true, sea: true },
        { name: 'ENEMY BASE', land: ['#6a6a6a', '#646464'], dark: '#505050', road: '#3a3a3a', water: false, base: true }
      ];
      let hi = api.getHiScore(50000);
      let mode = 'title', modeT = 0, coinFlash = 0;
      let score = 0, lives = 3, bombs = 3, stage = 0, wtype = 'red', wlv = 1, stars = 0, nextExtra = 50000;
      let scroll = 0, map = null, theme = THEMES[0], events = [], evI = 0;
      let P = null, shots = [], ebul = [], enemies = [], items = [], fx = [], bomb = null, boss = null, fireT = 0, shake = 0;

      const snd = {
        shot() { api.audio.tone(1200, 0.03, { type: 'square', vol: 0.04, slideTo: 800 }); },
        hit() { api.audio.tone(300, 0.03, { type: 'square', vol: 0.05 }); },
        boom() { api.audio.noise(0.4, { vol: 0.22, freq: 1200, slideTo: 100 }); },
        big() { api.audio.noise(1.0, { vol: 0.3, freq: 900, slideTo: 40 }); api.audio.tone(80, 0.8, { type: 'sawtooth', vol: 0.15, slideTo: 30 }); },
        item() { api.audio.melody([[784, 0.05], [988, 0.05], [1319, 0.1]], { type: 'square', vol: 0.12 }); },
        power() { api.audio.melody([[523, 0.05], [784, 0.05], [1047, 0.05], [1568, 0.12]], { type: 'square', vol: 0.12 }); },
        die() { api.audio.noise(1.2, { vol: 0.3, freq: 2000, slideTo: 60 }); api.audio.tone(400, 1.0, { type: 'sawtooth', vol: 0.12, slideTo: 40 }); },
        bomb() { api.audio.noise(1.4, { vol: 0.35, freq: 600, slideTo: 40 }); },
        warn() { api.audio.melody([[440, 0.15], [0, 0.05], [440, 0.15], [0, 0.05], [440, 0.15]], { type: 'square', vol: 0.15 }); },
        clear() { api.audio.melody([[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.12], [784, 0.12], [1047, 0.4]], { type: 'square', vol: 0.14 }); },
        tick() { api.audio.tone(1800, 0.03, { type: 'square', vol: 0.06 }); }
      };

      // ---------------- terrain ----------------
      function hash(a, b) { let h = (a * 374761393 + b * 668265263 + stage * 9973) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
      function buildMap() {
        theme = THEMES[stage % THEMES.length];
        const rows = Math.ceil((STAGE_LEN + H + 64) / TS);
        map = [];
        for (let r = 0; r < rows; r++) {
          const row = [];
          const rc = 7 + Math.sin(r * 0.045 + stage) * 4 + Math.sin(r * 0.13) * 1.2;
          const riverOn = theme.water && !theme.sea && (r % 120) > 30 && (r % 120) < 100;
          const coast = theme.sea ? 9 + Math.sin(r * 0.05) * 3 : 99;
          const road = r % 28 === 6 || r % 28 === 7;
          const vroad = theme.base ? 3 : 11;
          for (let c = 0; c < COLS; c++) {
            let t = 'land';
            if (theme.sea && c > coast) t = c > coast + 1 ? 'sea' : 'shore';
            else if (riverOn && Math.abs(c - rc) < 1.6) t = 'water';
            else if (riverOn && Math.abs(c - rc) < 2.4) t = 'bank';
            else if (road) t = riverOn && Math.abs(c - rc) < 3 ? 'bridge' : 'road';
            else if (c === vroad && !theme.sea) t = 'road';
            else if (theme.base && (c === 9 || c === 10) && r % 60 < 40) t = 'runway';
            else {
              const h = hash(c, r);
              if (h < (theme.base ? 0.1 : 0.06) && r > 20) t = 'bldg';
              else if (!theme.base && h > 0.86) t = theme === THEMES[1] ? 'dune' : 'tree';
              else if (theme.base && h > 0.9) t = 'pad';
            }
            row.push(t);
          }
          map.push(row);
        }
      }
      function tileAtWorld(wx, wy) { const r = Math.floor(wy / TS), c = Math.floor(wx / TS); if (!map[r] || c < 0 || c >= COLS) return 'land'; return map[r][c]; }
      const isWater = t => t === 'water' || t === 'sea';
      function drawTerrain(ctx) {
        const r0 = Math.floor(scroll / TS), off = scroll - r0 * TS;
        for (let k = -1; k < H / TS + 1; k++) {
          const r = r0 + k, row = map[r]; if (!row) continue;
          const y = Math.round(H - (k + 1) * TS + off);
          for (let c = 0; c < COLS; c++) {
            const t = row[c], x = c * TS, hv = hash(c, r);
            switch (t) {
              case 'land': ctx.fillStyle = theme.land[(c + r) & 1]; ctx.fillRect(x, y, TS, TS); if (hv > 0.6) { ctx.fillStyle = theme.dark; ctx.fillRect(x + (hv * 97 % 12), y + (hv * 53 % 12), 3, 2); } break;
              case 'tree': ctx.fillStyle = theme.land[0]; ctx.fillRect(x, y, TS, TS); ctx.fillStyle = '#1a4a12'; ctx.beginPath(); ctx.arc(x + 8, y + 8, 7, 0, TAU); ctx.fill(); ctx.fillStyle = '#2a6a1a'; ctx.beginPath(); ctx.arc(x + 6, y + 6, 4, 0, TAU); ctx.fill(); break;
              case 'dune': ctx.fillStyle = theme.land[0]; ctx.fillRect(x, y, TS, TS); ctx.fillStyle = '#e0c880'; ctx.fillRect(x + 2, y + 6, 12, 3); ctx.fillStyle = theme.dark; ctx.fillRect(x + 2, y + 9, 12, 2); break;
              case 'water': case 'sea': ctx.fillStyle = t === 'sea' ? '#1a4aa0' : '#2a5ab8'; ctx.fillRect(x, y, TS, TS); if (((r * 7 + c * 3 + (api.frame >> 4)) % 5) === 0) { ctx.fillStyle = '#6a9ae8'; ctx.fillRect(x + 3, y + 7, 6, 1); } break;
              case 'bank': case 'shore': ctx.fillStyle = '#c8b070'; ctx.fillRect(x, y, TS, TS); ctx.fillStyle = '#a89050'; ctx.fillRect(x + (hv * 10 | 0), y + 4, 3, 2); break;
              case 'road': ctx.fillStyle = theme.road; ctx.fillRect(x, y, TS, TS); ctx.fillStyle = 'rgba(255,255,255,.25)'; if (r % 28 === 6) ctx.fillRect(x + 4, y + 15, 8, 1); break;
              case 'bridge': ctx.fillStyle = '#7a5a3a'; ctx.fillRect(x, y, TS, TS); ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x, y, TS, 1); ctx.fillRect(x + 4, y, 1, TS); break;
              case 'runway': ctx.fillStyle = '#2a2a2a'; ctx.fillRect(x, y, TS, TS); if (c === 9 && r % 4 === 0) { ctx.fillStyle = '#ddd'; ctx.fillRect(x + 15, y + 2, 2, 10); } break;
              case 'pad': ctx.fillStyle = '#585858'; ctx.fillRect(x, y, TS, TS); ctx.fillStyle = '#ddd'; ctx.fillRect(x + 4, y + 4, 8, 1); ctx.fillRect(x + 4, y + 11, 8, 1); break;
              case 'bldg': ctx.fillStyle = theme.land[0]; ctx.fillRect(x, y, TS, TS); ctx.fillStyle = '#202020'; ctx.fillRect(x + 3, y + 4, 12, 11); ctx.fillStyle = hv > 0.03 ? '#9a9aa0' : '#a06040'; ctx.fillRect(x + 1, y + 1, 12, 11); ctx.fillStyle = '#c8c8d0'; ctx.fillRect(x + 1, y + 1, 12, 2); break;
            }
          }
        }
      }

      // ---------------- stage script ----------------
      function buildEvents() {
        events = []; evI = 0;
        const lvl = stage;
        for (let wy = 380; wy < STAGE_LEN - 250; wy += rnd(70, 120) - Math.min(30, lvl * 4)) {
          const r = Math.random();
          if (r < 0.32) events.push({ wy, k: 'tanks' });
          else if (r < 0.5) events.push({ wy, k: 'heli' });
          else if (r < 0.62) events.push({ wy, k: 'gun' });
          else if (r < 0.72) events.push({ wy, k: 'bigtank' });
          else if (r < 0.84) events.push({ wy, k: theme.water ? 'boat' : 'tanks' });
          else events.push({ wy, k: 'heli' });
        }
        for (let wy = 700; wy < STAGE_LEN - 400; wy += 820) events.push({ wy: wy + rnd(-60, 60), k: 'carrier' });
        for (let wy = 1100; wy < STAGE_LEN - 400; wy += 1300) events.push({ wy, k: 'scarrier' });
        events.sort((a, b) => a.wy - b.wy);
      }
      const toScreenY = wy => H - (wy - scroll);
      function findTile(pred, tries) {
        for (let k = 0; k < (tries || 30); k++) { const x = rnd(12, W - 12); if (pred(x)) return x; }
        return -1;
      }
      function spawnEvent(e) {
        const fr = 1 + stage * 0.15, wyAt = sy => scroll + H - sy;
        switch (e.k) {
          case 'tanks': {
            const dir = Math.random() < 0.5 ? 1 : -1, n = 2 + (Math.random() * 3 | 0), sy = rnd(-40, -12);
            for (let i = 0; i < n; i++) {
              const x = dir > 0 ? -8 - i * 18 : W + 8 + i * 18;
              enemies.push(mkE('tank', x, sy, { vx: dir * 0.4, vy: 0, hp: 3, pts: 100, ground: true, fire: rnd(60, 140) / fr }));
            }
            break;
          }
          case 'bigtank': {
            const x = findTile(x => !isWater(tileAtWorld(x, wyAt(-24))));
            if (x >= 0) enemies.push(mkE('bigtank', x, -24, { vx: 0, vy: -0.2, hp: 14 + stage * 3, pts: 500, ground: true, fire: 90 / fr, r: 11 }));
            break;
          }
          case 'gun': {
            for (let i = 0; i < 2; i++) { const sy = -14 - i * 26, x = findTile(x => !isWater(tileAtWorld(x, wyAt(sy)))); if (x >= 0) enemies.push(mkE('gun', x, sy, { hp: 6, pts: 300, ground: true, fire: rnd(50, 110) / fr })); }
            break;
          }
          case 'boat': {
            const x = findTile(x => isWater(tileAtWorld(x, wyAt(-20))), 60);
            if (x >= 0) enemies.push(mkE('boat', x, -20, { vx: 0, vy: -0.25, hp: 5, pts: 300, ground: true, fire: 80 / fr, water: true }));
            else enemies.push(mkE('tank', -8, -20, { vx: 0.4, vy: 0, hp: 3, pts: 100, ground: true, fire: 100 / fr }));
            break;
          }
          case 'heli': {
            const n = 3 + (Math.random() * 3 | 0), side = Math.random() < 0.5 ? -1 : 1, x0 = rnd(50, W - 50);
            for (let i = 0; i < n; i++) enemies.push(mkE('heli', clamp(x0 + side * i * 16, 10, W - 10), -14 - i * 22, { hp: 2, pts: 200, air: true, fire: rnd(40, 90) / fr, t: -i * 8, sx: side }));
            break;
          }
          case 'carrier': enemies.push(mkE('carrier', rnd(40, W - 40), -20, { hp: 10, pts: 1000, air: true, fire: 9999, drop: 'weapon', r: 10 })); break;
          case 'scarrier': enemies.push(mkE('carrier', rnd(40, W - 40), -20, { hp: 10, pts: 1000, air: true, fire: 9999, drop: Math.random() < 0.5 ? 'S' : 'B', r: 10 })); break;
        }
      }
      function mkE(k, x, y, o) {
        const e = Object.assign({ k, x, y, vx: 0, vy: 0, hp: 1, pts: 100, ground: false, air: false, fire: 100, t: 0, ang: Math.PI / 2, flash: 0, r: 7 }, o);
        if (e.ground) { e.wy = scroll + (H - y); }
        e.fireT = e.fire * rnd(0.5, 1.2);
        return e;
      }

      // ---------------- player ----------------
      function newPlayer() { P = { x: W / 2, y: H - 40, inv: 150, dead: 0, bank: 0, ph: 0 }; }
      function fire() {
        const x = P.x, y = P.y - 8, L = wlv, S = (vx, vy, o) => shots.push(Object.assign({ x, y, vx, vy, d: 1, w: 2, h: 6, t: wtype }, o || {}));
        if (wtype === 'red') {
          S(0, -7, { x: x - 4 }); S(0, -7, { x: x + 4 });
          if (L >= 2) { S(-1, -6.8); S(1, -6.8); }
          if (L >= 3) { S(-2, -6.5); S(2, -6.5); }
          if (L >= 4) { S(-3, -6); S(3, -6); }
        } else if (wtype === 'blue') {
          const n = L, d = 1.6 + L * 0.25;
          for (let i = 0; i < n; i++) S(0, -9, { x: x + (i - (n - 1) / 2) * 5, d, w: 3, h: 14 });
        } else if (wtype === 'green') {
          S(0, -7, { x: x - 3 }); S(0, -7, { x: x + 3 });
          if (L >= 2) { S(-6, 0, { y: P.y, w: 6, h: 2 }); S(6, 0, { y: P.y, w: 6, h: 2 }); }
          if (L >= 3) { S(-3, 3.5, { y: P.y + 4 }); S(3, 3.5, { y: P.y + 4 }); }
          if (L >= 4) { S(-1.5, -6.8); S(1.5, -6.8); S(0, 6, { y: P.y + 6 }); }
        } else {
          S(0, -7.5);
          for (let i = 0; i < L; i++) if (shots.filter(s => s.homing).length < 6) S((i & 1 ? 1 : -1) * 2, -3, { homing: true, d: 1.4, x: x + (i & 1 ? 6 : -6) });
        }
        snd.shot();
      }
      function killPlayer() {
        if (P.inv > 0 || P.dead || bomb) return;
        P.dead = 1; snd.die(); shake = 20;
        explode(P.x, P.y, 2.2, 40);
        wlv = 1; bombs = Math.max(bombs, 3);
      }
      function explode(x, y, size, n) {
        for (let i = 0; i < n; i++) { const a = rnd(0, TAU), s = rnd(0.3, 2.2) * size; fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: rnd(16, 34), c: ['#fff', '#ffe040', '#ff8020', '#e02010'][i & 3], sz: rnd(1, 3) * Math.min(2, size) }); }
        fx.push({ ring: true, x, y, r: 2, max: 10 + size * 10, l: 16 });
      }
      function dropItem(x, y, kind) { items.push({ x, y, kind, t: 0, col: Math.random() * 4 | 0, vy: 0.3 }); }
      function addScore(n) {
        score += n;
        if (score >= nextExtra) { lives = Math.min(9, lives + 1); nextExtra += nextExtra === 50000 ? 100000 : 150000; snd.power(); }
      }

      // ---------------- enemies ----------------
      function aimShot(e, spd, spread, n) {
        if (!P || P.dead) return;
        const a0 = Math.atan2(P.y - e.y, P.x - e.x);
        n = n || 1;
        for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * (spread || 0); ebul.push({ x: e.x, y: e.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd }); }
      }
      const bspd = () => 1.7 + Math.min(1.6, stage * 0.2);
      function updEnemy(e) {
        e.t++;
        if (e.flash) e.flash--;
        if (e.ground) { e.wy += e.vy; e.x += e.vx; e.y = H - (e.wy - scroll); }
        if (P && !P.dead) e.ang += Math.atan2(Math.sin(Math.atan2(P.y - e.y, P.x - e.x) - e.ang), Math.cos(Math.atan2(P.y - e.y, P.x - e.x) - e.ang)) * 0.06;
        switch (e.k) {
          case 'tank':
            if (e.vx && tileAtWorld(e.x + Math.sign(e.vx) * 8, e.wy) === 'water') e.vx = -e.vx;
            break;
          case 'heli': {
            if (e.t < 0) return;
            if (e.t < 70) { e.y += 2.2; e.x += Math.sin(e.t * 0.05) * e.sx * 0.6; }
            else if (e.t < 110) { e.y += 0.6; if (P) e.x += clamp(P.x - e.x, -1, 1); }
            else { e.y -= 1.2; e.x += e.sx * 2.4; }
            break;
          }
          case 'carrier':
            if (e.t < 90) e.y += 1.0; else if (e.t < 300) { e.y += 0.15; e.x += Math.sin(e.t * 0.03) * 0.8; } else e.y += 1.6;
            break;
        }
        if (e.y > -8 && e.y < H - 30) {
          if (--e.fireT <= 0) {
            e.fireT = e.fire * rnd(0.8, 1.3);
            if (e.k === 'bigtank') aimShot(e, bspd(), 0.25, 3);
            else if (e.k === 'gun') { aimShot(e, bspd() * 1.1); setTimeoutShot(e, 8); }
            else if (e.k === 'heli' && e.t > 30 && e.t < 120) aimShot(e, bspd() * 1.15);
            else if (e.k !== 'heli' && e.k !== 'carrier') aimShot(e, bspd());
          }
        }
        if (e.queue && --e.queue.t <= 0) { aimShot(e, bspd() * 1.1); e.queue = null; }
      }
      function setTimeoutShot(e, t) { e.queue = { t }; }
      function hurt(e, d) {
        e.hp -= d; e.flash = 4;
        if (e.hp <= 0) {
          e.dead = true; addScore(e.pts); snd.boom();
          explode(e.x, e.y, e.k === 'bigtank' || e.k === 'carrier' ? 1.6 : 1, e.k === 'bigtank' || e.k === 'carrier' ? 24 : 12);
          if (e.ground) fx.push({ crater: true, x: e.x, wy: e.wy, l: 900 });
          if (e.drop) dropItem(e.x, e.y, e.drop === 'weapon' ? 'W' : e.drop);
          else if (e.ground && Math.random() < 0.18) dropItem(e.x, e.y, 'star');
        } else snd.hit();
      }

      // ---------------- boss ----------------
      function spawnBoss() {
        const hp = 260 + stage * 90;
        boss = { x: W / 2, y: -50, hp, max: hp, t: 0, flash: 0, ang: 0, turrets: [{ dx: -18, dy: 10, a: 0 }, { dx: 18, dy: 10, a: 0 }, { dx: 0, dy: -8, a: 0 }], phase: 0, dead: 0 };
        snd.warn();
      }
      function updBoss() {
        const b = boss; b.t++; if (b.flash) b.flash--;
        if (b.dead) {
          b.dead++;
          if (b.dead % 6 === 0) { explode(b.x + rnd(-30, 30), b.y + rnd(-26, 26), 1.4, 10); snd.boom(); }
          if (b.dead > 150) { boss = null; mode = 'clear'; modeT = 0; snd.clear(); }
          return;
        }
        if (b.y < 70) { b.y += 0.6; return; }
        b.x = W / 2 + Math.sin(b.t * 0.012) * 60;
        const s = bspd();
        const rage = b.hp < b.max / 2 ? 1 : 0;
        if (b.t % (rage ? 70 : 100) === 0) for (let i = 0; i < 12 + stage * 2; i++) { const a = i / (12 + stage * 2) * TAU + b.t * 0.01; ebul.push({ x: b.x, y: b.y, vx: Math.cos(a) * s * 0.8, vy: Math.sin(a) * s * 0.8 }); }
        for (const tr of b.turrets) {
          const tx = b.x + tr.dx, ty = b.y + tr.dy;
          if (P && !P.dead) tr.a = Math.atan2(P.y - ty, P.x - tx);
          if ((b.t + tr.dx * 3) % (rage ? 40 : 60) === 0) aimShot({ x: tx, y: ty }, s * 1.1, 0.18, rage ? 3 : 2);
        }
      }

      // ---------------- flow ----------------
      function startStage() {
        scroll = 0; buildMap(); buildEvents();
        shots = []; ebul = []; enemies = []; items = []; fx = []; bomb = null; boss = null;
        newPlayer(); mode = 'stagein'; modeT = 0;
      }
      function startGame() { score = 0; lives = 3; bombs = 3; stage = 0; wtype = 'red'; wlv = 1; stars = 0; nextExtra = 50000; startStage(); }
      function tryStart() {
        if (api.useCredit()) { startGame(); return; }
        coinFlash = 90; api.audio.tone(70, 0.25, { type: 'square', vol: 0.2 });
      }

      function playStep() {
        // scrolling
        if (scroll < STAGE_LEN) {
          scroll = Math.min(STAGE_LEN, scroll + SCROLL);
          while (evI < events.length && events[evI].wy <= scroll) spawnEvent(events[evI++]);
          if (scroll >= STAGE_LEN && !boss) spawnBoss();
        }
        // player
        if (P.dead) {
          P.dead++;
          if (P.dead === 90) {
            lives--;
            if (lives <= 0) {
              mode = 'held';
              const end = () => { if (score > hi) hi = score; api.setHiScore(score); mode = 'gameover'; modeT = 0; };
              if (api.offerContinue) api.offerContinue(() => { lives = 3; newPlayer(); mode = 'play'; }, end); else end();
              return;
            }
            newPlayer();
          }
        } else {
          const sp = 2.1;
          let dx = (api.key('ArrowRight') ? 1 : 0) - (api.key('ArrowLeft') ? 1 : 0), dy = (api.key('ArrowDown') ? 1 : 0) - (api.key('ArrowUp') ? 1 : 0);
          if (dx && dy) { dx *= 0.75; dy *= 0.75; }
          P.x = clamp(P.x + dx * sp, 8, W - 8); P.y = clamp(P.y + dy * sp, 16, H - 14);
          P.bank += (dx - P.bank) * 0.2; P.ph++;
          if (P.inv > 0) P.inv--;
          if (--fireT <= 0 && api.key('Space')) { fire(); fireT = wtype === 'blue' ? 7 : 6; }
          if (api.pressed('KeyX') && bombs > 0 && !bomb) { bombs--; bomb = { x: P.x, y: P.y - 40, t: 0 }; snd.bomb(); shake = 30; }
        }
        // shots
        for (const s of shots) {
          if (s.homing) {
            let best = null, bd = 1e9;
            for (const e of enemies) { if (e.dead || e.y < 0) continue; const d = Math.hypot(e.x - s.x, e.y - s.y); if (d < bd) { bd = d; best = e; } }
            if (boss && !boss.dead && boss.y > 0) { const d = Math.hypot(boss.x - s.x, boss.y - s.y); if (d < bd) best = boss; }
            if (best) { const a = Math.atan2(best.y - s.y, best.x - s.x); s.vx += Math.cos(a) * 0.6; s.vy += Math.sin(a) * 0.6; }
            const v = Math.hypot(s.vx, s.vy); if (v > 5.5) { s.vx *= 5.5 / v; s.vy *= 5.5 / v; }
            s.life = (s.life || 0) + 1; if (s.life > 90) s.gone = true;
          }
          s.x += s.vx; s.y += s.vy;
          if (s.y < -16 || s.y > H + 16 || s.x < -10 || s.x > W + 10) s.gone = true;
          if (s.gone) continue;
          for (const e of enemies) {
            if (e.dead || e.t < 0 || e.y < -6) continue;
            if (Math.abs(e.x - s.x) < e.r + s.w / 2 && Math.abs(e.y - s.y) < e.r + s.h / 2) { hurt(e, s.d); s.gone = true; break; }
          }
          if (!s.gone && boss && !boss.dead && boss.y > 10 && Math.abs(boss.x - s.x) < 34 && Math.abs(boss.y - s.y) < 26) {
            boss.hp -= s.d; boss.flash = 3; s.gone = true; if ((api.frame & 3) === 0) snd.hit();
            if (boss.hp <= 0) { boss.dead = 1; addScore(20000 + stage * 10000); snd.big(); shake = 40; ebul = []; }
          }
        }
        shots = shots.filter(s => !s.gone);
        // enemies
        for (const e of enemies) {
          updEnemy(e);
          if (!e.dead && e.air && P && !P.dead && e.t >= 0 && Math.abs(e.x - P.x) < e.r + 3 && Math.abs(e.y - P.y) < e.r + 3) { killPlayer(); hurt(e, 99); }
        }
        enemies = enemies.filter(e => !e.dead && e.y < H + 40 && e.y > -200 && e.x > -120 && e.x < W + 120);
        if (boss) updBoss();
        // enemy bullets
        for (const b of ebul) {
          b.x += b.vx; b.y += b.vy;
          if (P && !P.dead && Math.abs(b.x - P.x) < 3 && Math.abs(b.y - P.y) < 3) { killPlayer(); b.gone = true; }
          if (b.x < -6 || b.x > W + 6 || b.y < -6 || b.y > H + 6) b.gone = true;
        }
        ebul = ebul.filter(b => !b.gone);
        // bomb
        if (bomb) {
          bomb.t++;
          if (bomb.t < 20) bomb.y -= 1;
          if (bomb.t === 20) { explode(bomb.x, bomb.y, 3, 60); snd.big(); }
          if (bomb.t >= 20) {
            const r = Math.min(110, (bomb.t - 20) * 5);
            ebul = [];
            for (const e of enemies) if (!e.dead && Math.hypot(e.x - bomb.x, e.y - bomb.y) < r && !e.bombed) { e.bombed = true; hurt(e, 25); }
            if (boss && !boss.dead && bomb.t % 10 === 0 && Math.hypot(boss.x - bomb.x, boss.y - bomb.y) < r + 30) { boss.hp -= 6; boss.flash = 4; if (boss.hp <= 0) { boss.dead = 1; addScore(20000 + stage * 10000); snd.big(); } }
            if (P) P.inv = Math.max(P.inv, 4);
          }
          if (bomb.t > 60) { bomb = null; for (const e of enemies) e.bombed = false; }
        }
        // items
        for (const it of items) {
          it.t++; it.y += it.vy + (it.y < 40 ? 0.3 : 0); if (it.kind !== 'star') it.y = Math.min(it.y, H - 30 + Math.sin(it.t * 0.05) * 4);
          if (it.t % 50 === 0) it.col = (it.col + 1) % 4;
          if (it.kind === 'star') it.y += SCROLL;
          if (P && !P.dead && Math.abs(it.x - P.x) < 11 && Math.abs(it.y - P.y) < 11) {
            it.gone = true;
            if (it.kind === 'W') {
              const c = WTYPES[it.col];
              if (c === wtype) wlv = Math.min(4, wlv + 1); else wtype = c;
              addScore(1000); snd.power();
            } else if (it.kind === 'S') { wlv = Math.min(4, wlv + 1); addScore(1000); snd.power(); }
            else if (it.kind === 'B') { bombs = Math.min(9, bombs + 1); addScore(1000); snd.item(); }
            else { stars++; addScore(100); snd.item(); }
          }
          if (it.t > 1200 || it.y > H + 10) it.gone = true;
        }
        items = items.filter(i => !i.gone);
        // effects
        for (const f of fx) {
          if (f.crater) { f.l--; continue; }
          if (f.ring) { f.r += (f.max - f.r) * 0.25; f.l--; continue; }
          f.x += f.vx; f.y += f.vy; f.vx *= 0.92; f.vy *= 0.92; f.l--;
        }
        fx = fx.filter(f => f.l > 0);
        if (fx.length > 500) fx.splice(0, fx.length - 500);
      }

      function update() {
        modeT++;
        if (coinFlash > 0) coinFlash = api.credits > 0 ? 0 : coinFlash - 1;
        if (shake > 0) shake--;
        switch (mode) {
          case 'title':
            if (!map) { stage = 0; buildMap(); }
            scroll = (scroll + 0.5) % (STAGE_LEN - 400);
            if (api.anyPressed('Enter', 'Space')) tryStart();
            break;
          case 'stagein':
            if (P.y > H - 60) P.y -= 0.5;
            if (modeT > 150) { mode = 'play'; modeT = 0; }
            break;
          case 'play': playStep(); break;
          case 'clear':
            if (modeT > 60 && modeT < 60 + stars * 4 && modeT % 4 === 0) { addScore(500); snd.tick(); }
            if (modeT > 120 + stars * 4 + 120) { stage++; stars = 0; startStage(); }
            break;
          case 'held': break;
          case 'gameover':
            if (modeT > 300) { mode = 'title'; modeT = 0; map = null; scroll = 0; }
            break;
        }
      }

      // ---------------- drawing ----------------
      function drawHeli(ctx, x, y, bank, ph, col, scale) {
        x = Math.round(x); y = Math.round(y);
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x - 3 + 10, y + 12, 6, 10);
        ctx.fillStyle = col || '#d8d8e0';
        ctx.fillRect(x - 3, y - 6, 6, 14);      // body
        ctx.fillRect(x - 1, y + 8, 2, 9);       // tail boom
        ctx.fillRect(x - 4, y + 15, 8, 2);      // tail fin
        ctx.fillStyle = '#4a8aff'; ctx.fillRect(x - 2, y - 6, 4, 4);   // canopy
        ctx.fillStyle = '#888'; ctx.fillRect(x - 6 - Math.round(bank), y, 3, 4); ctx.fillRect(x + 3 - Math.round(bank), y, 3, 4); // stubs
        ctx.fillStyle = '#e02020'; ctx.fillRect(x - 1, y + 2, 2, 2);
        // rotor
        ctx.fillStyle = 'rgba(230,230,230,.75)';
        if ((ph >> 1) & 1) ctx.fillRect(x - 11, y - 1, 22, 1); else ctx.fillRect(x, y - 12, 1, 22);
        ctx.fillStyle = 'rgba(230,230,230,.35)';
        if ((ph >> 1) & 1) ctx.fillRect(x, y - 12, 1, 22); else ctx.fillRect(x - 11, y - 1, 22, 1);
      }
      function drawEnemy(ctx, e) {
        if (e.t < 0) return;
        const x = Math.round(e.x), y = Math.round(e.y), fl = e.flash > 0;
        switch (e.k) {
          case 'tank': {
            ctx.fillStyle = fl ? '#fff' : '#5a6a3a'; ctx.fillRect(x - 7, y - 6, 14, 12);
            ctx.fillStyle = '#2a2a1a'; ctx.fillRect(x - 7, y - 7, 14, 2); ctx.fillRect(x - 7, y + 5, 14, 2);
            ctx.fillStyle = fl ? '#fff' : '#8a9a5a'; ctx.fillRect(x - 3, y - 3, 6, 6);
            ctx.strokeStyle = '#1a1a10'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(e.ang) * 9, y + Math.sin(e.ang) * 9); ctx.stroke(); ctx.lineWidth = 1;
            break;
          }
          case 'bigtank': {
            ctx.fillStyle = fl ? '#fff' : '#6a5a3a'; ctx.fillRect(x - 11, y - 12, 22, 24);
            ctx.fillStyle = '#2a2010'; ctx.fillRect(x - 13, y - 12, 3, 24); ctx.fillRect(x + 10, y - 12, 3, 24);
            ctx.fillStyle = fl ? '#fff' : '#9a8a5a'; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill();
            ctx.strokeStyle = '#201808'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(e.ang) * 13, y + Math.sin(e.ang) * 13); ctx.stroke(); ctx.lineWidth = 1;
            break;
          }
          case 'gun': {
            ctx.fillStyle = '#707070'; ctx.fillRect(x - 8, y - 8, 16, 16); ctx.fillStyle = '#505050'; ctx.fillRect(x - 8, y + 6, 16, 2);
            ctx.fillStyle = fl ? '#fff' : '#a0a0a0'; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill();
            ctx.strokeStyle = '#202020'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(e.ang) * 9, y + Math.sin(e.ang) * 9); ctx.stroke(); ctx.lineWidth = 1;
            break;
          }
          case 'boat': {
            ctx.fillStyle = '#fff'; ctx.fillRect(x - 2, y + 12, 4, 3);
            ctx.fillStyle = fl ? '#fff' : '#7a7a8a'; ctx.beginPath(); ctx.moveTo(x, y - 13); ctx.lineTo(x + 6, y - 4); ctx.lineTo(x + 6, y + 11); ctx.lineTo(x - 6, y + 11); ctx.lineTo(x - 6, y - 4); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#4a4a5a'; ctx.fillRect(x - 3, y - 2, 6, 6);
            ctx.strokeStyle = '#202020'; ctx.beginPath(); ctx.moveTo(x, y + 1); ctx.lineTo(x + Math.cos(e.ang) * 8, y + 1 + Math.sin(e.ang) * 8); ctx.stroke();
            break;
          }
          case 'heli': drawEnemyHeli(ctx, x, y, fl ? '#fff' : '#3a6a3a', e.t); break;
          case 'carrier': {
            ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x + 6, y + 10, 16, 10);
            ctx.fillStyle = fl ? '#fff' : '#c07020'; ctx.fillRect(x - 8, y - 9, 16, 20); ctx.fillRect(x - 2, y + 10, 4, 8);
            ctx.fillStyle = '#ffe080'; ctx.fillRect(x - 5, y - 9, 10, 4);
            ctx.fillStyle = WCOL[WTYPES[(e.t >> 4) % 4]]; ctx.fillRect(x - 3, y, 6, 6);
            ctx.fillStyle = 'rgba(230,230,230,.7)'; if ((e.t >> 1) & 1) ctx.fillRect(x - 16, y - 2, 32, 1); else ctx.fillRect(x, y - 18, 1, 32);
            break;
          }
        }
      }
      function drawEnemyHeli(ctx, x, y, col, t) {
        ctx.fillStyle = col; ctx.fillRect(x - 3, y - 7, 6, 12); ctx.fillRect(x - 1, y - 14, 2, 8); ctx.fillRect(x - 3, y - 15, 6, 2);
        ctx.fillStyle = '#e0e040'; ctx.fillRect(x - 2, y + 2, 4, 3);
        ctx.fillStyle = 'rgba(230,230,230,.7)'; if ((t >> 1) & 1) ctx.fillRect(x - 9, y - 1, 18, 1); else ctx.fillRect(x, y - 10, 1, 18);
      }
      function drawBoss(ctx) {
        const b = boss, x = Math.round(b.x), y = Math.round(b.y), fl = b.flash > 0;
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - 30, y - 22, 66, 56);
        ctx.fillStyle = '#2a2010'; ctx.fillRect(x - 38, y - 26, 10, 56); ctx.fillRect(x + 28, y - 26, 10, 56);
        for (let k = 0; k < 7; k++) { ctx.fillStyle = '#4a4030'; ctx.fillRect(x - 38, y - 26 + ((k * 8 + (b.t >> 2)) % 56), 10, 2); ctx.fillRect(x + 28, y - 26 + ((k * 8 + (b.t >> 2)) % 56), 10, 2); }
        ctx.fillStyle = fl ? '#fff' : '#6a6a50'; ctx.fillRect(x - 28, y - 28, 56, 58);
        ctx.fillStyle = fl ? '#fff' : '#8a8a68'; ctx.fillRect(x - 22, y - 22, 44, 46);
        ctx.fillStyle = '#4a4a38'; ctx.fillRect(x - 22, y + 18, 44, 6);
        for (const tr of b.turrets) {
          const tx = x + tr.dx, ty = y + tr.dy;
          ctx.fillStyle = '#3a3a2a'; ctx.beginPath(); ctx.arc(tx, ty, 7, 0, TAU); ctx.fill();
          ctx.fillStyle = fl ? '#fff' : '#b0b088'; ctx.beginPath(); ctx.arc(tx, ty, 5, 0, TAU); ctx.fill();
          ctx.strokeStyle = '#202018'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + Math.cos(tr.a) * 12, ty + Math.sin(tr.a) * 12); ctx.stroke(); ctx.lineWidth = 1;
        }
        ctx.fillStyle = '#000'; ctx.fillRect(40, 30, 160, 4);
        ctx.fillStyle = '#e02020'; ctx.fillRect(41, 31, Math.round(158 * Math.max(0, b.hp) / b.max), 2);
      }
      function drawItems(ctx) {
        for (const it of items) {
          const x = Math.round(it.x), y = Math.round(it.y);
          if (it.t > 1000 && (it.t & 4)) continue;
          if (it.kind === 'star') {
            ctx.fillStyle = (it.t & 8) ? '#ffe040' : '#fff';
            ctx.fillRect(x - 1, y - 4, 3, 9); ctx.fillRect(x - 4, y - 1, 9, 3); ctx.fillRect(x - 2, y - 2, 5, 5);
            continue;
          }
          const col = it.kind === 'W' ? WCOL[WTYPES[it.col]] : it.kind === 'S' ? '#ffffff' : '#ff60ff';
          ctx.fillStyle = '#000'; ctx.fillRect(x - 7, y - 7, 14, 14);
          ctx.fillStyle = col; ctx.fillRect(x - 6, y - 6, 12, 12);
          ctx.fillStyle = '#000'; ctx.fillRect(x - 4, y - 4, 8, 8);
          text(ctx, it.kind === 'W' ? 'P' : it.kind, x - 2, y - 3, col);
        }
      }
      function drawShots(ctx) {
        for (const s of shots) {
          const c = WCOL[s.t];
          if (s.homing) { ctx.fillStyle = c; ctx.fillRect(Math.round(s.x) - 2, Math.round(s.y) - 2, 4, 4); ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 2, 2); continue; }
          ctx.fillStyle = c; ctx.fillRect(Math.round(s.x - s.w / 2), Math.round(s.y - s.h / 2), s.w, s.h);
          ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(s.x - s.w / 2) + (s.w > 2 ? 1 : 0), Math.round(s.y - s.h / 2), Math.max(1, s.w - 2), Math.max(1, s.h - 3));
        }
        for (const b of ebul) {
          const x = Math.round(b.x), y = Math.round(b.y);
          ctx.fillStyle = (api.frame & 2) ? '#ff4020' : '#ffd040'; ctx.fillRect(x - 2, y - 1, 4, 2); ctx.fillRect(x - 1, y - 2, 2, 4);
          ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 1, 1);
        }
      }
      function drawFx(ctx) {
        for (const f of fx) {
          if (f.crater) { const y = Math.round(H - (f.wy - scroll)); if (y < -10 || y > H + 10) continue; ctx.fillStyle = 'rgba(20,15,10,.6)'; ctx.beginPath(); ctx.arc(f.x, y, 7, 0, TAU); ctx.fill(); continue; }
          if (f.ring) { ctx.strokeStyle = 'rgba(255,240,180,' + (f.l / 16).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); ctx.stroke(); continue; }
          ctx.fillStyle = f.c; const s = Math.max(1, Math.round(f.sz * f.l / 30)); ctx.fillRect(Math.round(f.x) - s, Math.round(f.y) - s, s * 2, s * 2);
        }
        if (bomb) {
          if (bomb.t < 20) { ctx.fillStyle = '#ff60ff'; ctx.fillRect(Math.round(bomb.x) - 2, Math.round(bomb.y) - 3, 4, 6); }
          else { const r = Math.min(110, (bomb.t - 20) * 5); ctx.fillStyle = 'rgba(255,220,120,' + Math.max(0, 0.5 - (bomb.t - 20) / 90).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(bomb.x, bomb.y, r, 0, TAU); ctx.fill(); }
        }
      }
      function hud(ctx) {
        text(ctx, '1UP', 6, 4, '#e02020'); text(ctx, String(score).padStart(7, ' '), 26, 4, '#fff');
        text(ctx, 'HI ' + String(Math.max(hi, score)), W - 6, 4, '#ffd800', 1, 'right');
        for (let i = 0; i < Math.min(6, lives - 1); i++) { ctx.fillStyle = '#d8d8e0'; ctx.fillRect(6 + i * 9, H - 12, 3, 8); ctx.fillRect(4 + i * 9, H - 10, 7, 1); }
        for (let i = 0; i < Math.min(8, bombs); i++) { ctx.fillStyle = '#ff60ff'; ctx.fillRect(6 + i * 7, H - 22, 4, 6); }
        ctx.fillStyle = WCOL[wtype]; for (let i = 0; i < wlv; i++) ctx.fillRect(W - 10 - i * 6, H - 10, 4, 6);
        text(ctx, 'STARS ' + stars, W - 6, H - 22, '#ffe040', 1, 'right');
      }
      function credStr() { return 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'); }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.save();
        if (shake) ctx.translate(Math.round(rnd(-2, 2)), Math.round(rnd(-2, 2)));
        if (map) drawTerrain(ctx);
        if (mode === 'title') {
          ctx.restore();
          ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H);
          text(ctx, 'TWIN', W / 2 + 2, 52, '#600', 5, 'center'); text(ctx, 'TWIN', W / 2, 50, '#ffd800', 5, 'center');
          text(ctx, 'COBRA', W / 2 + 2, 92, '#400', 5, 'center'); text(ctx, 'COBRA', W / 2, 90, '#e02020', 5, 'center');
          drawHeli(ctx, W / 2, 160, Math.sin(modeT * 0.03) * 2, modeT, '#d8d8e0');
          text(ctx, 'HI-SCORE ' + hi, W / 2, 196, '#fff', 1, 'center');
          const blink = (api.frame >> 4) & 1;
          if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 222, '#fff', 1, 'center'); }
          else if (api.credits > 0) text(ctx, 'PUSH START', W / 2, 222, blink ? '#fff' : '#666', 1, 'center');
          else if (blink) text(ctx, 'INSERT COIN', W / 2, 222, '#fff', 1, 'center');
          [['red', 'SPREAD'], ['blue', 'LASER'], ['green', '4-WAY'], ['yellow', 'HOMING']].forEach((w, i) => { ctx.fillStyle = WCOL[w[0]]; ctx.fillRect(40, 244 + i * 11, 8, 7); text(ctx, w[1], 54, 244 + i * 11, '#ddd'); });
          text(ctx, 'S POWER  B BOMB', 130, 255, '#ddd');
          text(ctx, '\u00a9 1987 TOAPLAN', W / 2, 298, '#aaa', 1, 'center');
          text(ctx, credStr(), 4, H - 10, '#888');
          return;
        }
        // ground layer
        for (const e of enemies) if (e.ground) drawEnemy(ctx, e);
        drawFx(ctx);
        drawItems(ctx);
        if (boss) drawBoss(ctx);
        for (const e of enemies) if (!e.ground) drawEnemy(ctx, e);
        if (P && !P.dead && (P.inv === 0 || (P.inv & 4))) drawHeli(ctx, P.x, P.y, P.bank * 2, P.ph, '#d8d8e0');
        drawShots(ctx);
        ctx.restore();
        hud(ctx);
        if (mode === 'stagein') {
          text(ctx, 'STAGE ' + (stage + 1), W / 2, 120, '#fff', 2, 'center');
          text(ctx, theme.name, W / 2, 142, '#ffd800', 1, 'center');
          if (modeT < 100 && (modeT & 16)) text(ctx, 'READY', W / 2, 162, '#e02020', 1, 'center');
        }
        if (boss && boss.t < 120 && !boss.dead && (api.frame & 16)) text(ctx, 'WARNING!', W / 2, 140, '#ff2020', 2, 'center');
        if (mode === 'clear') {
          ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(20, 100, W - 40, 90);
          text(ctx, 'STAGE ' + (stage + 1) + ' CLEAR', W / 2, 112, '#ffd800', 2, 'center');
          text(ctx, 'BONUS STARS ' + stars + ' X 500', W / 2, 140, '#fff', 1, 'center');
          text(ctx, '= ' + stars * 500, W / 2, 156, '#ffe040', 1, 'center');
        }
        if (mode === 'gameover') text(ctx, 'GAME OVER', W / 2, 150, '#e02020', 2, 'center');
      }
      return { update, render, destroy() { } };
    }
  });
})();
