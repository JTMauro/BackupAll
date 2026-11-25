// Spy Hunter (Bally Midway, 1983) - vertical road and river chase: civilians, Switch Blades, Road Lords, Enforcers, Mad Bomber, weapons van, forks and boathouse.
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

  // ---------- helpers ----------
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }
  // build a sprite canvas from rows of chars + palette {char: colour}
  function paint(rows, pal) {
    const h = rows.length, w = Math.max.apply(null, rows.map(r => r.length));
    const [c, x] = mkCanvas(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < rows[j].length; i++) {
      const col = pal[rows[j][i]];
      if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); }
    }
    return c;
  }
  // rotate char rows 90 degrees clockwise (an up-facing sprite becomes right-facing)
  function rot90(rows) {
    const h = rows.length, w = Math.max.apply(null, rows.map(r => r.length)), out = [];
    for (let x = 0; x < w; x++) { let s = ''; for (let y = h - 1; y >= 0; y--) s += rows[y][x] || '.'; out.push(s); }
    return out;
  }
  function flipV(rows) { return rows.slice().reverse(); }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const pad2 = n => String(Math.min(99, n)).padStart(2, '0');


  // ======================================================================
  // Spy Hunter: constants
  // ======================================================================
  const W = 240, H = 320, PY = 236;      // PY: screen row of the player's car
  const TOP = 16, BOT = 304;             // playfield between the HUD bars
  const smooth = t => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---------- procedural vehicle art (all facing up) ----------
  function vehicle(w, h, draw) { const [c, x] = mkCanvas(w, h); draw(x, w, h); return c; }
  const R = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
  function car(body, trim, glass, opts) {
    opts = opts || {};
    const w = opts.w || 12, h = opts.h || 20;
    return vehicle(w + 4, h, (x) => {
      const o = 2;
      // tyres
      R(x, '#111', 0, 3, 3, 5); R(x, '#111', w + 1, 3, 3, 5); R(x, '#111', 0, h - 8, 3, 5); R(x, '#111', w + 1, h - 8, 3, 5);
      if (opts.spikes) { R(x, '#e0e0e0', 0, 4, 1, 1); R(x, '#e0e0e0', 0, 6, 1, 1); R(x, '#e0e0e0', w + 3, 4, 1, 1); R(x, '#e0e0e0', w + 3, 6, 1, 1); R(x, '#e0e0e0', 0, h - 7, 1, 1); R(x, '#e0e0e0', w + 3, h - 7, 1, 1); }
      R(x, body, o, 1, w, h - 2); R(x, body, o + 1, 0, w - 2, h);
      R(x, glass, o + 2, 4, w - 4, 3);                // windscreen
      R(x, trim, o + 1, 8, w - 2, h - 13);            // roof
      R(x, glass, o + 2, h - 5, w - 4, 2);            // rear window
      if (opts.stripe) { R(x, opts.stripe, o + w / 2 - 2, 0, 1, h); R(x, opts.stripe, o + w / 2 + 1, 0, 1, h); }
      if (opts.gun) { R(x, '#f0c090', o + w - 3, 9, 2, 3); R(x, '#202020', o + w, 10, 3, 1); }
      R(x, '#ffff90', o + 1, 0, 2, 1); R(x, '#ffff90', o + w - 3, 0, 2, 1);
      R(x, '#ff2020', o + 1, h - 1, 2, 1); R(x, '#ff2020', o + w - 3, h - 1, 2, 1);
    });
  }
  function truck(cab, box) {
    return vehicle(16, 34, (x) => {
      R(x, '#111', 0, 4, 2, 5); R(x, '#111', 14, 4, 2, 5); R(x, '#111', 0, 24, 2, 6); R(x, '#111', 14, 24, 2, 6);
      R(x, cab, 2, 0, 12, 9); R(x, '#a0d8ff', 3, 2, 10, 2);
      R(x, '#333', 3, 9, 10, 1);
      R(x, box, 1, 10, 14, 24); R(x, '#ffffff40', 2, 11, 12, 1);
      for (let i = 0; i < 4; i++) R(x, '#00000030', 1, 13 + i * 5, 14, 1);
    });
  }
  function van() {
    return vehicle(22, 48, (x) => {
      R(x, '#111', 0, 4, 3, 6); R(x, '#111', 19, 4, 3, 6); R(x, '#111', 0, 34, 3, 7); R(x, '#111', 19, 34, 3, 7); R(x, '#111', 0, 26, 3, 7); R(x, '#111', 19, 26, 3, 7);
      R(x, '#d01818', 3, 0, 16, 11); R(x, '#a0d8ff', 5, 2, 12, 3); R(x, '#900', 3, 9, 16, 2);
      R(x, '#e8e8e8', 2, 12, 18, 31); R(x, '#d01818', 4, 16, 14, 3); R(x, '#202060', 4, 21, 14, 2);
      R(x, '#d01818', 4, 25, 14, 3);
      // the drive-in ramp at the back
      R(x, '#606060', 5, 43, 12, 5); R(x, '#909090', 5, 43, 12, 1); R(x, '#909090', 5, 45, 12, 1); R(x, '#909090', 5, 47, 12, 1);
    });
  }
  function boat(body, deck, trim) {
    return vehicle(14, 22, (x) => {
      R(x, body, 3, 0, 8, 2); R(x, body, 2, 2, 10, 2); R(x, body, 1, 4, 12, 17); R(x, body, 2, 21, 10, 1);
      R(x, deck, 3, 6, 8, 10); R(x, '#a0e0ff', 4, 6, 6, 2); R(x, trim, 1, 17, 12, 2);
      R(x, '#303030', 5, 19, 4, 3);
    });
  }
  function heli(frame) {
    return vehicle(28, 28, (x) => {
      R(x, '#303030', 13, 18, 2, 9); R(x, '#303030', 10, 25, 8, 1);
      R(x, '#5a6a2a', 10, 6, 8, 13); R(x, '#5a6a2a', 11, 4, 6, 2); R(x, '#a0d8ff', 11, 6, 6, 3); R(x, '#3a4a1a', 9, 12, 10, 3);
      x.fillStyle = '#c0c0c0';
      if (frame) { x.fillRect(1, 12, 26, 1); x.fillRect(14, 0, 1, 26); }
      else { for (let i = 0; i < 20; i++) { x.fillRect(4 + i, 3 + i, 1, 1); x.fillRect(23 - i, 3 + i, 1, 1); } }
    });
  }

  // ---------- original score in the arcade's 60s spy-jazz/surf style (new melodies, not any existing theme) ----------
  // 8-bar blues-ish loop in E minor: syncopated surf bass, four-on-two drums, brass stabs, and a twangy guitar lead
  // that answers on every other pass. 16th-note grid, one step every 7 frames (~128 BPM). The river section plays it a 4th higher.
  const NT = m => 440 * Math.pow(2, (m - 69) / 12);
  const ROOTS = [40, 40, 45, 40, 47, 45, 40, 40];                 // E E A E B A E E (E2 = midi 40)
  const BASSP = [[0, 0], [3, 0], [4, 7], [6, 10], [8, 12], [11, 10], [12, 7], [14, 3]];
  const LEAD = [                                                   // [bar, step, midi, length in 16ths]
    [0, 0, 71, 4], [0, 6, 74, 2], [0, 8, 76, 6], [1, 0, 79, 2], [1, 2, 76, 2], [1, 4, 74, 4], [1, 10, 71, 4],
    [2, 0, 69, 4], [2, 4, 72, 2], [2, 6, 76, 6], [3, 0, 74, 3], [3, 4, 71, 2], [3, 6, 69, 2], [3, 8, 67, 8],
    [4, 0, 78, 4], [4, 4, 75, 4], [4, 8, 71, 8], [5, 0, 69, 2], [5, 2, 72, 2], [5, 4, 76, 6], [5, 12, 74, 4],
    [6, 0, 76, 8], [6, 8, 71, 8], [7, 0, 64, 12]];

  ArcadeRegistry.register({
    id: 'spyhunter', title: 'Spy Hunter', year: 1983, maker: 'Bally Midway',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Left/Right: steer \u00b7 Up: gas \u00b7 Down: brake \u00b7 Space: machine guns \u00b7 X: special weapon \u00b7 Enter: start',
    marquee: { bg: '#101010', fg: '#f0f0f0', accent: '#d01818' },
    create(api) {
      const au = api.audio;
      let musStep = 0;
      function musicStep(n) {
        const bar = (n >> 4) % 8, st = n & 15, pass = (n >> 7) & 1, up = g.player && g.player.boat ? 5 : 0;
        const root = ROOTS[bar] + up, dom = bar === 4;                // the B bar is a dominant 7th
        // drums: kick on 1 and 3, snare on 2 and 4, hats on 8ths
        if (st === 0 || st === 8 || (st === 10 && bar % 2)) au.tone(90, .12, { type: 'sine', vol: .16, slideTo: 40 });
        if (st === 4 || st === 12) au.noise(.11, { vol: .07, freq: 1900, type: 'bandpass' });
        if (st % 2 === 0) au.noise(.03, { vol: st % 4 === 2 ? .035 : .02, freq: 7000, type: 'highpass' });
        // bass
        for (const [bs, off] of BASSP) if (bs === st) au.tone(NT(root + off), .16, { type: 'sawtooth', vol: .055 });
        // brass stabs on the offbeats
        if (st === 6 || st === 14) for (const iv of dom ? [12, 16, 22] : [12, 15, 19]) au.tone(NT(root + iv + 12), .09, { type: 'square', vol: .018 });
        // twangy lead on every other pass
        if (pass) for (const [lb, ls, m, len] of LEAD) if (lb === bar && ls === st) {
          const d = len * 7 / 60;
          au.tone(NT(m + up), d, { type: 'triangle', vol: .07, attack: .004 });
          au.tone(NT(m + up) * 2.005, Math.min(d, .25), { type: 'square', vol: .012 });
        }
      }
      const SP = {
        player: car('#f4f4f4', '#2050c0', '#203050', { stripe: '#2050c0' }),
        boat: boat('#f4f4f4', '#2050c0', '#c02020'),
        civ: ['#e0c020', '#30a040', '#d07020', '#a040c0', '#40a0d0'].map(c => car(c, c, '#203040')),
        civTruck: truck('#2a7a2a', '#d0c090'),
        blade: car('#2a5ad0', '#183a90', '#102040', { spikes: true }),
        lord: car('#7a5020', '#4a3010', '#101010', { w: 16, h: 24 }),
        enforcer: car('#202020', '#383838', '#6080a0', { w: 12, h: 26, gun: true }),
        van: van(),
        torpedo: boat('#404858', '#606878', '#d02020'),
        dumper: boat('#7a4a20', '#a07040', '#303030'),
        heli: [heli(0), heli(1)]
      };

      // ---------- course: road segments generated ahead of the player ----------
      let segs = [], genD = 0, genCx = 120, genW = 110, genCount = 0, lastBoat = 0;
      function addSeg(kind, len, cxB, wB, extra) {
        const s = Object.assign({ kind, d0: genD, len, cxA: genCx, cxB, wA: genW, wB, fork: null, side: kind === 'river' ? 'bank' : 'grass', mark: null }, extra || {});
        segs.push(s); genD += len; genCx = cxB; genW = wB; genCount++;
        return s;
      }
      function resetCourse() {
        segs = []; genD = -400; genCx = 120; genW = 110; genCount = 0; lastBoat = 0;
        addSeg('road', 1400, 120, 110);
      }
      function genMore(target) {
        while (genD < target) {
          if (genD - lastBoat > 9000 && genCount > 6) {
            // boathouse: road funnels into the boathouse, the car becomes a boat
            lastBoat = genD;
            addSeg('road', 400, 120, 64);
            const bh = addSeg('road', 120, 120, 64); bh.mark = 'boathouse';
            let n = 3 + Math.floor(Math.random() * 3);
            addSeg('river', 300, 120, 140);
            while (n--) {
              const w = 100 + Math.floor(Math.random() * 60);
              addSeg('river', 500 + Math.floor(Math.random() * 400), clamp(120 + (Math.random() - 0.5) * 80, w / 2 + 16, W - w / 2 - 16), w);
            }
            addSeg('river', 300, 120, 64);
            const dk = addSeg('river', 120, 120, 64); dk.mark = 'dock';
            addSeg('road', 300, 120, 100);
            continue;
          }
          const r = Math.random();
          if (r < 0.2) addSeg('road', 500 + Math.random() * 500, genCx, genW);
          else if (r < 0.45) { const w = 70 + Math.floor(Math.random() * 70); addSeg('road', 500 + Math.random() * 300, clamp(120 + (Math.random() - 0.5) * 120, w / 2 + 14, W - w / 2 - 14), w); }
          else if (r < 0.6) addSeg('road', 400, genCx, genW < 90 ? 120 : 64);
          else if (r < 0.8) {
            const side = Math.random() < 0.5 ? 1 : -1;
            addSeg('road', 300, 120 - side * 32, 76);
            addSeg('road', 1100, 120 - side * 32, 76, { fork: { side, sep: 92, w2: 40 } });
            addSeg('road', 200, genCx, 90);
          } else {
            const w = 80 + Math.floor(Math.random() * 30);
            addSeg('road', 200, clamp(genCx, w / 2 + 40, W - w / 2 - 40), w);
            addSeg('road', 500, genCx, w, { side: 'water' });   // a bridge over the river
          }
        }
      }
      function segAt(d) {
        for (let i = segs.length - 1; i >= 0; i--) if (d >= segs[i].d0) return segs[i];
        return segs[0];
      }
      // returns {water, side, mark, ivs:[[l,r],...]}
      function row(d) {
        const s = segAt(d);
        const t = clamp((d - s.d0) / s.len, 0, 1), e = smooth(t);
        const cx = lerp(s.cxA, s.cxB, e), w = lerp(s.wA, s.wB, e);
        let ivs = [[cx - w / 2, cx + w / 2]];
        if (s.fork) {
          const env = t < 0.3 ? smooth(t / 0.3) : t > 0.7 ? smooth((1 - t) / 0.3) : 1;
          const off = env * s.fork.sep, bc = cx + s.fork.side * off, h2 = s.fork.w2 / 2;
          const b = [bc - h2, bc + h2], m = ivs[0];
          if (b[0] <= m[1] && b[1] >= m[0]) ivs = [[Math.min(m[0], b[0]), Math.max(m[1], b[1])]];
          else ivs = b[0] > m[0] ? [m, b] : [b, m];
        }
        return { water: s.kind === 'river', side: s.side, mark: s.mark, markT: t, ivs, seg: s };
      }
      function ivAt(rw, x) { for (const iv of rw.ivs) if (x >= iv[0] && x <= iv[1]) return iv; return null; }
      function onCourse(x, d, half) {
        for (const dd of [d - 6, d + 6]) {
          const rw = row(dd), iv = ivAt(rw, x);
          if (!iv || x - half < iv[0] || x + half > iv[1]) return false;
        }
        return true;
      }

      // ---------- state ----------
      let hi = api.getHiScore(30000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, lastCred = api.credits;
      let g = null;
      function newGame() {
        resetCourse(); genMore(3000);
        g = {
          score: 0, scoreAcc: 0, spares: 0, nextCar: 10000, timer: 1000, timerOn: true, noScore: 0,
          dist: 0, spd: 0, ents: [], shots: [], fx: [], slicks: [], smokes: [], bombs: [], missiles: [], pops: [],
          phase: 'deliver', t: 0, weapon: null, ammo: 0, nextWeapon: 0, heli: null, heliT: 2400, vanT: 1800, spawnT: 120,
          kills: 0, msg: '', msgT: 0
        };
        g.player = { x: 120, vx: 0, boat: false, hidden: true, inv: 0 };
        startDeliver();
      }
      function startDeliver() {
        const rw = row(g.dist);
        let best = rw.ivs[0]; for (const iv of rw.ivs) if (iv[1] - iv[0] > best[1] - best[0]) best = iv;
        g.player.x = (best[0] + best[1]) / 2; g.player.vx = 0;
        g.player.boat = rw.water; g.spd = 2;
        g.ents = g.ents.filter(e => Math.abs(e.wy - g.dist) > 160);
        if (rw.water) { g.phase = 'play'; g.player.hidden = false; g.player.inv = 120; return; }
        g.phase = 'deliver'; g.player.hidden = true;
        g.ents.push({ type: 'van', x: g.player.x, wy: g.dist - 150, spd: 4.2, vx: 0, w: 22, h: 48, state: 'deliver', life: 0 });
      }
      function pollCoins() {
        if (api.credits > lastCred) au.tone(1568, .06, { type: 'square', vol: .08, slideTo: 2093 });
        lastCred = api.credits;
      }
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(110, .25, { type: 'square', vol: .14 });
        return false;
      }
      function addScore(n) {
        if (g.noScore > 0) return;
        g.score += n;
        while (g.score >= g.nextCar) { g.nextCar += 10000; g.spares++; flash('BONUS CAR'); au.melody([[784, .07], [988, .07], [1175, .07], [1568, .14]], { type: 'square', vol: .1 }); }
        if (g.score > hi) hi = g.score;
      }
      function flash(m) { g.msg = m; g.msgT = 150; }
      function pop(x, wy, txt, col) { g.pops.push({ x, wy, txt, col: col || '#fff', t: 60 }); }
      const sy = wy => PY - (wy - g.dist);
      function boom(x, wy, big) {
        g.fx.push({ x, wy, t: 0, big: !!big });
        au.noise(big ? 0.7 : 0.4, { vol: big ? 0.25 : 0.18, freq: big ? 1500 : 2500, slideTo: 120 });
      }

      // ---------- spawning ----------
      const SIZE = { civ: [12, 20], civTruck: [16, 34], blade: [12, 20], lord: [16, 24], enforcer: [12, 26], torpedo: [14, 22], dumper: [14, 22] };
      function spawn(type, ahead) {
        const wy = ahead ? g.dist + (PY - TOP) + 40 : g.dist - (BOT - PY) - 40;
        const rw = row(wy);
        const iv = rw.ivs[Math.floor(Math.random() * rw.ivs.length)];
        const [w, h] = SIZE[type];
        if (iv[1] - iv[0] < w + 6) return;
        const x = iv[0] + w / 2 + 3 + Math.random() * (iv[1] - iv[0] - w - 6);
        for (const e of g.ents) if (Math.abs(e.wy - wy) < 40 && Math.abs(e.x - x) < 20) return;
        const diff = Math.min(1, g.dist / 40000);
        let spd;
        if (type === 'civ' || type === 'civTruck') spd = ahead ? 2.2 + Math.random() * 1.2 : g.spd + 1.0;
        else spd = ahead ? 2.5 : Math.max(3.5, g.spd + 1.4);
        g.ents.push({ type, x, wy, spd, base: type === 'civ' || type === 'civTruck' ? spd : 3 + diff * 2.4, vx: 0, w, h, t: 0, spin: 0, lastHit: -999, sheet: Math.floor(Math.random() * 5), side: Math.random() < 0.5 ? -1 : 1, fire: 60 + Math.random() * 60 });
      }
      function spawner() {
        if (--g.spawnT > 0) return;
        const diff = Math.min(1, g.dist / 40000);
        g.spawnT = Math.round(110 - diff * 55 + Math.random() * 40);
        const active = g.ents.filter(e => e.type !== 'van').length;
        if (active >= 4 + Math.round(diff * 3)) return;
        const rw = row(g.dist);
        if (rw.water) { spawn(Math.random() < 0.5 ? 'torpedo' : 'dumper', true); return; }
        const r = Math.random();
        const fast = g.spd > 3.2;
        if (r < 0.45) spawn(Math.random() < 0.25 ? 'civTruck' : 'civ', fast ? Math.random() < 0.8 : Math.random() < 0.2);
        else if (r < 0.66) spawn('blade', false);
        else if (r < 0.84) { if (g.dist > 2500) spawn('lord', Math.random() < 0.3); else spawn('civ', true); }
        else { if (g.dist > 5000) spawn('enforcer', false); else spawn('blade', false); }
      }

      // ---------- player death ----------
      function killPlayer(why) {
        if (g.phase !== 'play' || g.player.inv > 0) return;
        boom(g.player.x, g.dist, true);
        g.phase = 'dead'; g.t = 120; g.player.hidden = true;
        if (why) flash(why);
        au.tone(300, .8, { type: 'sawtooth', vol: .12, slideTo: 40 });
      }
      function afterDeath() {
        if (g.timerOn) { startDeliver(); return; }                    // free cars while the timer runs
        if (g.spares > 0) { g.spares--; startDeliver(); return; }
        g.phase = 'wait';
        const end = () => { api.setHiScore(g.score); g.phase = 'over'; g.t = 360; au.melody([[392, .2], [370, .2], [349, .2], [330, .6]], { type: 'square', vol: .1 }); };
        if (api.offerContinue) api.offerContinue(() => { g.spares = 2; startDeliver(); }, end); else end();
      }

      // ---------- weapons ----------
      const WEAPONS = [['OIL SLICK', 10], ['SMOKE SCREEN', 8], ['MISSILES', 6]];
      function fireGuns() {
        if (frame % 5) return;
        g.shots.push({ x: g.player.x - 4, wy: g.dist + 10, t: 0 }, { x: g.player.x + 4, wy: g.dist + 10, t: 0 });
        au.tone(180, .03, { type: 'square', vol: .07 }); au.noise(.03, { vol: .06, freq: 4000 });
      }
      function fireSpecial() {
        if (!g.weapon || g.ammo <= 0) { au.tone(90, .08, { type: 'square', vol: .08 }); return; }
        g.ammo--;
        const p = g.player;
        if (g.weapon === 'OIL SLICK') { g.slicks.push({ x: p.x, wy: g.dist - 18, t: 600 }); au.noise(.3, { vol: .12, freq: 600 }); }
        else if (g.weapon === 'SMOKE SCREEN') { g.smokes.push({ x: p.x, wy: g.dist - 16, t: 200, r: 6 }); au.noise(.5, { vol: .14, freq: 900, slideTo: 200 }); }
        else { g.missiles.push({ x: p.x, wy: g.dist + 12, vx: 0, vy: 2, t: 0 }); au.tone(300, .4, { type: 'sawtooth', vol: .1, slideTo: 1200 }); }
        if (g.ammo <= 0) { flash(g.weapon + ' EMPTY'); g.weapon = null; }
      }

      // ---------- per-frame play ----------
      function destroyEnt(e, byPlayer, how) {
        e.dead = true;
        boom(e.x, e.wy, e.type === 'van');
        if (e.type === 'civ' || e.type === 'civTruck') {
          if (byPlayer) { g.noScore = 300; flash('CIVILIAN HIT - NO SCORE'); au.melody([[220, .15], [208, .15], [196, .3]], { type: 'square', vol: .1 }); }
          return;
        }
        if (e.type === 'van') return;
        const pts = 150;
        if (byPlayer) { addScore(pts); g.kills++; if (g.noScore <= 0) pop(e.x, e.wy, String(pts), '#ffe040'); }
      }
      function steerEnt(e) {
        // AI desired x
        const p = g.player, dyP = e.wy - g.dist;
        let tx = e.x;
        const rw = row(e.wy + 20), iv = ivAt(rw, e.x) || rw.ivs[0];
        const playing = g.phase === 'play' && !p.hidden;
        switch (e.type) {
          case 'blade': case 'enforcer': {
            const off = e.type === 'enforcer' ? 20 : 16;
            if (playing) {
              let side = e.side; if (p.x + side * off < iv[0] + 8 || p.x + side * off > iv[1] - 8) side = -side; e.side = side;
              tx = p.x + side * off;
              e.spd = dyP < -6 ? Math.max(g.spd + 1.3, 3.2) : dyP > 6 ? Math.max(0.5, g.spd - 0.8) : g.spd;
              if (Math.abs(dyP) < 12 && Math.abs(e.x - tx) < 6) {
                e.t++;
                if (e.type === 'blade' && e.t > 50 && Math.abs(e.x - p.x) < 21) { flash('TIRES SLASHED'); killPlayer(); }
                if (e.type === 'enforcer' && e.t > 30 && --e.fire <= 0) {
                  e.fire = 50; g.shots.push({ x: e.x, wy: e.wy, t: 0, enemy: true, vx: Math.sign(p.x - e.x) * 3.5 });
                  au.tone(140, .08, { type: 'square', vol: .12 }); au.noise(.1, { vol: .12, freq: 3000 });
                }
              } else e.t = Math.max(0, e.t - 1);
            } else e.spd = e.base;
            break;
          }
          case 'lord':
            if (playing) {
              tx = p.x;
              e.spd = dyP < -4 ? Math.max(g.spd + 1, 3) : dyP > 4 ? Math.max(0.5, g.spd - 0.6) : g.spd;
            } else e.spd = e.base;
            break;
          case 'torpedo':
            if (playing) {
              tx = p.x; e.spd = dyP > 100 ? g.spd - 0.5 : g.spd + 0.3;
              if (Math.abs(e.x - p.x) < 20 && dyP > 30 && --e.fire <= 0) {
                e.fire = 80; g.shots.push({ x: e.x, wy: e.wy - 12, t: 0, enemy: true, torpedo: true, vy: -2.2 });
                au.tone(500, .4, { type: 'triangle', vol: .1, slideTo: 200 });
              }
            }
            break;
          case 'dumper':
            if (playing) {
              e.spd = dyP > 140 ? g.spd - 0.4 : g.spd + 0.2; tx = p.x + Math.sin(frame / 40 + e.sheet) * 30;
              if (--e.fire <= 0 && dyP > 20) { e.fire = 55; g.ents.push({ type: 'barrel', x: e.x, wy: e.wy - 14, spd: 0.3, base: 0.3, vx: 0, w: 8, h: 8, t: 0, spin: 0, lastHit: -999 }); au.tone(200, .1, { type: 'square', vol: .08 }); }
            }
            break;
          default: {
            // civilians and others: keep to their lane, ease off if blocked
            const w = (iv[1] - iv[0]);
            if (e.x < iv[0] + e.w / 2 + 4) tx = iv[0] + e.w / 2 + 6; else if (e.x > iv[1] - e.w / 2 - 4) tx = iv[1] - e.w / 2 - 6;
            if (w < e.w + 10) tx = (iv[0] + iv[1]) / 2;
            e.spd += (e.base - e.spd) * 0.05;
          }
        }
        // keep inside the road edges ahead (unless spinning out)
        tx = clamp(tx, iv[0] + e.w / 2 + 3, iv[1] - e.w / 2 - 3);
        const maxS = e.type === 'lord' ? 1.1 : e.type === 'civ' || e.type === 'civTruck' ? 0.6 : 1.3;
        e.x += clamp(tx - e.x, -maxS, maxS);
      }
      function updateEnts() {
        const p = g.player;
        for (const e of g.ents) {
          if (e.dead) continue;
          if (e.type === 'van') { updateVan(e); continue; }
          if (e.type === 'barrel') { e.wy += e.spd; e.t++; }
          else {
            if (e.spin > 0) { e.spin--; e.x += e.spinDir * 1.6; e.spd *= 0.98; }
            else steerEnt(e);
            e.wy += e.spd;
          }
          e.x += e.vx; e.vx *= 0.86;
          // terrain: cars can't swim, boats can't drive
          const rw = row(e.wy);
          const boatType = e.type === 'torpedo' || e.type === 'dumper' || e.type === 'barrel';
          if (rw.water !== boatType) { e.dead = true; continue; }
          if (e.type !== 'barrel' && !onCourse(e.x, e.wy, e.w / 2 - 2)) { destroyEnt(e, frame - e.lastHit < 90, 'road'); continue; }
          // slicks and smoke
          for (const s of g.slicks) if (e.spin <= 0 && Math.abs(s.x - e.x) < 10 && Math.abs(s.wy - e.wy) < 10) { e.spin = 60; e.spinDir = Math.random() < 0.5 ? -1 : 1; e.lastHit = frame; au.tone(800, .3, { type: 'triangle', vol: .08, slideTo: 300 }); }
          for (const s of g.smokes) if (e.spin <= 0 && Math.abs(s.x - e.x) < s.r + 4 && Math.abs(s.wy - e.wy) < s.r + 6) { e.spin = 80; e.spinDir = e.x < 120 ? -1 : 1; e.lastHit = frame; }
          // collision with the player
          if (g.phase === 'play' && !p.hidden) {
            const dx = e.x - p.x, dy = e.wy - g.dist;
            const ox = (e.w + 12) / 2 - Math.abs(dx), oy = (e.h + 20) / 2 - Math.abs(dy);
            if (ox > 0 && oy > 0) {
              if (e.type === 'barrel') { e.dead = true; boom(e.x, e.wy); killPlayer(); continue; }
              if (ox < oy * 0.9) {
                // side bump: Road Lords are heavy, everyone else gets shoved
                const sgn = Math.sign(dx) || 1;
                const heavy = e.type === 'lord' || e.type === 'civTruck';
                e.vx += sgn * (heavy ? 1.2 : 3.2); p.vx -= sgn * (heavy ? 3.2 : 1.0);
                e.x += sgn * ox * 0.5; p.x -= sgn * ox * 0.5;
                e.lastHit = frame;
                au.noise(.08, { vol: .12, freq: 1200 }); au.tone(90, .08, { type: 'square', vol: .1 });
              } else if (dy > 0) {
                // rear-ended something: bounce back
                g.spd = Math.max(0, e.spd - 1); g.dist = e.wy - (e.h + 20) / 2 - 1;
                au.tone(80, .1, { type: 'square', vol: .12 });
              } else {
                e.spd = g.spd + 0.6; e.wy = g.dist - (e.h + 20) / 2 - 1;
              }
            }
          }
        }
        // cars bumping each other
        for (let i = 0; i < g.ents.length; i++) for (let j = i + 1; j < g.ents.length; j++) {
          const a = g.ents[i], b = g.ents[j];
          if (a.dead || b.dead || a.type === 'van' || b.type === 'van' || a.type === 'barrel' || b.type === 'barrel') continue;
          const dx = b.x - a.x, dy = b.wy - a.wy;
          if (Math.abs(dx) < (a.w + b.w) / 2 && Math.abs(dy) < (a.h + b.h) / 2) {
            if (Math.abs(dx) > Math.abs(dy) * 0.6) { const s = Math.sign(dx) || 1; a.vx -= s * 0.8; b.vx += s * 0.8; }
            else { const back = dy > 0 ? a : b, front = dy > 0 ? b : a; back.spd = Math.min(back.spd, front.spd); back.wy = Math.min(back.wy, front.wy - (a.h + b.h) / 2); }
            if (a.spin > 0) { b.spin = 40; b.spinDir = Math.sign(dx) || 1; b.lastHit = a.lastHit; }
            if (b.spin > 0) { a.spin = 40; a.spinDir = -(Math.sign(dx) || 1); a.lastHit = b.lastHit; }
          }
        }
        const lo = g.dist - (BOT - PY) - 140, hiD = g.dist + (PY - TOP) + 160;
        g.ents = g.ents.filter(e => !e.dead && e.wy > lo && e.wy < hiD + (e.type === 'van' ? 200 : 0));
      }
      function updateVan(v) {
        const p = g.player;
        v.life++;
        if (v.state === 'deliver') {
          v.wy += v.spd; g.spd = 2; g.dist += 0;            // scroll handled in update
          const target = g.dist + 40;
          if (v.wy >= target) { v.wy = target; v.spd = 2; v.state = 'leave'; p.hidden = false; p.inv = 90; g.phase = 'play'; g.spd = 2; au.melody([[392, .08], [523, .08], [659, .12]], { type: 'square', vol: .1 }); }
          return;
        }
        if (v.state === 'leave') { v.spd = Math.min(7, v.spd + 0.05); v.wy += v.spd; return; }
        if (v.state === 'arrive') {
          const dyP = v.wy - g.dist;
          v.spd = dyP < 70 ? g.spd + 1.4 : Math.max(1.8, g.spd - 0.45);
          if (v.life > 1100) v.state = 'leave';
          const rw = row(v.wy), iv = ivAt(rw, v.x) || rw.ivs[0];
          v.x += clamp(clamp((iv[0] + iv[1]) / 2, iv[0] + 14, iv[1] - 14) - v.x, -0.8, 0.8);
          v.wy += v.spd;
          // docking: drive straight up the ramp
          if (g.phase === 'play' && !p.hidden && dyP > 0 && dyP < 36 && Math.abs(v.x - p.x) < 15) {
            if (Math.abs(v.x - p.x) < 7) { v.state = 'loading'; g.phase = 'load'; g.t = 80; p.hidden = true; au.melody([[262, .06], [330, .06], [392, .06], [523, .06], [659, .06], [784, .12]], { type: 'square', vol: .1 }); }
            else { g.dist = v.wy - 36; g.spd = Math.max(0, v.spd - 0.8); p.vx += Math.sign(p.x - v.x) * 1.5; au.tone(90, .08, { type: 'square', vol: .1 }); }
          }
          return;
        }
        if (v.state === 'loading') {
          v.wy += v.spd; v.spd = 2.6; g.spd = 2.6; g.dist = v.wy - 10;
          p.x = v.x;
          if (--g.t <= 0) {
            const wpn = WEAPONS[g.nextWeapon % 3]; g.nextWeapon++;
            g.weapon = wpn[0]; g.ammo = wpn[1];
            flash(wpn[0]); addScore(500);
            v.state = 'leave'; g.phase = 'play'; p.hidden = false; p.inv = 40; g.dist = v.wy - 42; g.spd = 2;
          }
        }
      }
      function updateShots() {
        const p = g.player;
        for (const s of g.shots) {
          s.t++;
          if (s.enemy) {
            if (s.torpedo) s.wy += s.vy + 0; else { s.x += s.vx; s.wy += g.spd; }
            if (g.phase === 'play' && !p.hidden && Math.abs(s.x - p.x) < 7 && Math.abs(s.wy - g.dist) < 10) { s.dead = true; killPlayer(); }
            if (s.t > 120) s.dead = true;
            continue;
          }
          s.wy += 7 + g.spd;
          if (s.t > 30) s.dead = true;
          for (const e of g.ents) {
            if (e.dead || e.type === 'van' || Math.abs(e.x - s.x) > e.w / 2 + 1 || Math.abs(e.wy - s.wy) > e.h / 2 + 2) continue;
            s.dead = true;
            if (e.type === 'lord') { g.fx.push({ x: s.x, wy: s.wy, t: 0, spark: true }); au.tone(2000, .03, { type: 'square', vol: .05 }); }
            else if (e.type === 'barrel') { destroyEnt(e, false); addScore(50); }
            else destroyEnt(e, true);
            break;
          }
          // shoot down enemy shells/torpedoes
          for (const o of g.shots) if (o.enemy && o.torpedo && !o.dead && Math.abs(o.x - s.x) < 5 && Math.abs(o.wy - s.wy) < 8) { o.dead = true; s.dead = true; g.fx.push({ x: o.x, wy: o.wy, t: 0, spark: true }); }
        }
        g.shots = g.shots.filter(s => !s.dead);
        for (const m of g.missiles) {
          m.t++;
          if (g.heli) {
            const hy = g.dist + (PY - g.heli.y);
            const dx = g.heli.x - m.x, dy = hy - m.wy, d = Math.hypot(dx, dy) || 1;
            m.vx += dx / d * 0.5; m.vy += dy / d * 0.5;
            const sp = Math.hypot(m.vx, m.vy); if (sp > 6) { m.vx *= 6 / sp; m.vy *= 6 / sp; }
            if (d < 12) {
              m.dead = true; boom(g.heli.x, hy, true); addScore(700); pop(g.heli.x, hy, '700', '#ffe040'); g.heli = null; g.kills++;
            }
          } else { m.vy = Math.min(6, m.vy + 0.3); }
          m.x += m.vx; m.wy += m.vy + g.spd;
          if (!m.dead) for (const e of g.ents) if (!e.dead && e.type !== 'van' && Math.abs(e.x - m.x) < e.w / 2 + 2 && Math.abs(e.wy - m.wy) < e.h / 2 + 2) { m.dead = true; destroyEnt(e, true); break; }
          if (m.t > 140) m.dead = true;
        }
        g.missiles = g.missiles.filter(m => !m.dead);
        for (const s of g.slicks) s.t--;
        g.slicks = g.slicks.filter(s => s.t > 0 && s.wy > g.dist - 200);
        for (const s of g.smokes) { s.t--; s.r = Math.min(22, s.r + 0.25); s.wy += g.spd * 0.3; }
        g.smokes = g.smokes.filter(s => s.t > 0);
      }
      function updateHeli() {
        if (!g.heli) {
          if (g.phase === 'play' && --g.heliT <= 0) {
            g.heli = { x: Math.random() < 0.5 ? -20 : W + 20, y: 70, t: 0, drop: 90 };
            g.heliT = Math.max(1200, 2600 - g.dist / 30);
            flash('MAD BOMBER!');
          }
          return;
        }
        const hc = g.heli; hc.t++;
        if (hc.t < 900) { hc.x += clamp(g.player.x - hc.x, -1.1, 1.1); hc.y += (70 - hc.y) * 0.05; }
        else { hc.y -= 1.2; if (hc.y < -40) { g.heli = null; return; } }
        if (frame % 8 === 0) au.noise(.06, { vol: .05, freq: 500 });
        if (g.phase === 'play' && hc.t < 900 && --hc.drop <= 0) {
          hc.drop = Math.max(45, 90 - g.dist / 800);
          g.bombs.push({ x: hc.x + (Math.random() - 0.5) * 16, wy: g.dist + 40 + Math.random() * 60, t: 50, sy: hc.y });
          au.tone(1200, .5, { type: 'sine', vol: .07, slideTo: 300 });
        }
      }
      function updateBombs() {
        for (const b of g.bombs) {
          if (--b.t > 0) continue;
          b.dead = true; boom(b.x, b.wy);
          if (g.phase === 'play' && Math.abs(b.x - g.player.x) < 15 && Math.abs(b.wy - g.dist) < 16) killPlayer('BOMBED');
          for (const e of g.ents) if (e.type !== 'van' && Math.abs(e.x - b.x) < 14 && Math.abs(e.wy - b.wy) < 16) destroyEnt(e, false);
        }
        g.bombs = g.bombs.filter(b => !b.dead);
      }

      function updatePlay() {
        const p = g.player;
        // driving
        if (api.key('ArrowUp')) g.spd = Math.min(6, g.spd + (g.spd < 3 ? 0.06 : 0.035));
        else if (api.key('ArrowDown')) g.spd = Math.max(0, g.spd - 0.12);
        else g.spd += (Math.min(g.spd, 2.4) - g.spd) * 0.01;
        const steer = (api.key('ArrowLeft') ? -1 : 0) + (api.key('ArrowRight') ? 1 : 0);
        p.x += steer * (1.2 + Math.min(1.2, g.spd * 0.3)) + p.vx; p.vx *= 0.82;
        if (p.inv > 0) p.inv--;
        if (api.key('Space')) fireGuns();
        if (api.pressed('KeyX') || api.pressed('KeyZ')) fireSpecial();
        // the course
        const rw = row(g.dist);
        if (rw.water !== p.boat) {
          p.boat = rw.water;
          flash(p.boat ? 'BOAT MODE' : 'BACK ON THE ROAD');
          au.melody([[523, .05], [659, .05], [784, .05], [1047, .1]], { type: 'square', vol: .1 });
          g.slicks = []; g.smokes = [];
        }
        if (p.inv <= 0 && !onCourse(p.x, g.dist, 5)) { killPlayer(p.boat ? 'RAN AGROUND' : 'OFF THE ROAD'); return; }
        if (p.inv > 0) { const iv = ivAt(rw, p.x) || rw.ivs[0]; p.x = clamp(p.x, iv[0] + 6, iv[1] - 6); }
        // points for distance driven (the score counter)
        g.scoreAcc += g.spd;
        while (g.scoreAcc >= 25) { g.scoreAcc -= 25; addScore(5); }
        // weapons van arrives every so often on the road
        if (!rw.water && --g.vanT <= 0) {
          g.vanT = 2000;
          let wet = false; for (let k = 0; k < 2600; k += 40) if (row(g.dist + k).water) wet = true;
          if (wet) g.vanT = 300;
          else if (!g.ents.some(e => e.type === 'van')) { g.ents.push({ type: 'van', x: p.x < 120 ? p.x + 30 : p.x - 30, wy: g.dist - 160, spd: g.spd + 1.5, vx: 0, w: 22, h: 48, state: 'arrive', life: 0 }); flash('WEAPONS VAN'); au.melody([[659, .1], [523, .1], [659, .1], [784, .2]], { type: 'square', vol: .09 }); }
        }
        spawner();
      }

      function update() {
        frame++; pollCoins(); if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); }
          return;
        }
        if (g.msgT > 0) g.msgT--;
        if (g.noScore > 0) g.noScore--;
        for (const pp of g.pops) { pp.t--; pp.wy += 0.5; }
        g.pops = g.pops.filter(pp => pp.t > 0);
        for (const f of g.fx) f.t++;
        g.fx = g.fx.filter(f => f.t < (f.spark ? 8 : f.big ? 48 : 30));
        if (g.phase === 'over') { if (--g.t <= 0 || (g.t < 260 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; } return; }
        if (g.phase === 'wait') return;
        // the no-death timer
        if (g.timerOn && (g.phase === 'play' || g.phase === 'load')) {
          if (frame % 6 === 0) g.timer--;
          if (g.timer <= 0) { g.timer = 0; g.timerOn = false; g.spares++; flash('TIMER OUT - ONE SPARE CAR'); au.melody([[523, .12], [392, .12], [523, .12], [659, .25]], { type: 'square', vol: .1 }); }
        }
        if (g.phase === 'play') updatePlay();
        else if (g.phase === 'dead') { g.spd *= 0.96; if (--g.t <= 0) afterDeath(); }
        else if (g.phase === 'deliver') g.spd = 2;
        g.dist += g.spd;
        genMore(g.dist + 2000);
        while (segs.length > 3 && segs[1].d0 + segs[1].len < g.dist - 600) segs.shift();
        updateEnts(); updateShots(); updateHeli(); updateBombs();
        // music + engine
        if (g.phase === 'play' || g.phase === 'load') {
          if (frame % 7 === 0) musicStep(musStep++);
          if (frame % 5 === 0) au.tone(50 + g.spd * 16, .1, { type: 'square', vol: .025 });
        }
      }

      // ======================================================================
      // Rendering
      // ======================================================================
      const GRASS = ['#2f8a2a', '#2a7c26'], BANK = ['#3a6a2a', '#346026'];
      function hash(n) { n = Math.sin(n * 91.345 + 47.853) * 43758.5453; return n - Math.floor(n); }
      function drawCourse(ctx, dist) {
        for (let y = TOP; y < BOT; y += 2) {
          const d = dist + (PY - y), rw = row(d);
          const band = Math.floor(d / 32) & 1;
          // sides
          ctx.fillStyle = rw.water ? BANK[band] : rw.side === 'water' ? '#1848b0' : GRASS[band];
          ctx.fillRect(0, y, W, 2);
          for (const iv of rw.ivs) {
            const l = Math.round(iv[0]), r = Math.round(iv[1]);
            if (rw.water) {
              ctx.fillStyle = '#1a50c8'; ctx.fillRect(l, y, r - l, 2);
              if (hash(Math.floor(d / 6) * 7 + l) < 0.08) { ctx.fillStyle = '#80b0ff'; ctx.fillRect(l + Math.floor(hash(Math.floor(d / 6)) * (r - l - 8)), y, 6, 1); }
              ctx.fillStyle = '#e0e0ff'; if ((Math.floor(d / 4) & 1)) { ctx.fillRect(l, y, 1, 2); ctx.fillRect(r - 1, y, 1, 2); }
            } else {
              ctx.fillStyle = '#585858'; ctx.fillRect(l, y, r - l, 2);
              ctx.fillStyle = (Math.floor(d / 8) & 1) ? '#ffffff' : '#d02020';
              ctx.fillRect(l, y, 2, 2); ctx.fillRect(r - 2, y, 2, 2);
              if (r - l > 56 && (Math.floor(d / 20) & 1)) { ctx.fillStyle = '#e8e8e8'; ctx.fillRect(Math.round((l + r) / 2) - 1, y, 2, 2); }
              if (rw.side === 'water') { ctx.fillStyle = '#909090'; ctx.fillRect(l - 3, y, 1, 2); ctx.fillRect(r + 2, y, 1, 2); }
            }
          }
          // roadside trees / bushes
          if (!rw.water && rw.side === 'grass' && (Math.floor(d) % 28) < 2) {
            const k = Math.floor(d / 28);
            for (let i = 0; i < 2; i++) {
              const tx = Math.floor(hash(k * 3 + i) * (W - 10));
              if (!rw.ivs.some(iv => tx > iv[0] - 14 && tx < iv[1] + 4)) {
                ctx.fillStyle = '#1a5a18'; ctx.fillRect(tx, y - 6, 9, 8); ctx.fillStyle = '#3aa030'; ctx.fillRect(tx + 1, y - 7, 6, 5); ctx.fillStyle = '#5a3a18'; ctx.fillRect(tx + 4, y + 2, 2, 2);
              }
            }
          }
          if (rw.water && (Math.floor(d) % 40) < 2) {
            const k = Math.floor(d / 40), tx = Math.floor(hash(k * 5) * (W - 8));
            if (!rw.ivs.some(iv => tx > iv[0] - 12 && tx < iv[1] + 4)) { ctx.fillStyle = '#7a7a6a'; ctx.fillRect(tx, y - 3, 6, 4); ctx.fillStyle = '#a0a090'; ctx.fillRect(tx + 1, y - 3, 3, 1); }
          }
          // boathouse / dock structures
          if (rw.mark === 'boathouse' && rw.markT > 0.55) {
            const iv = rw.ivs[0];
            ctx.fillStyle = rw.markT > 0.92 ? '#4a2a10' : '#8a5a2a'; ctx.fillRect(iv[0] - 40, y, 40, 2); ctx.fillRect(iv[1], y, 40, 2);
            ctx.fillStyle = '#20202a'; ctx.fillRect(iv[0], y, iv[1] - iv[0], 2);
            if ((Math.floor(d / 4) & 1)) { ctx.fillStyle = '#6a4018'; ctx.fillRect(iv[0] - 40, y, 2, 2); ctx.fillRect(iv[1] + 38, y, 2, 2); }
          }
          if (rw.mark === 'dock' && rw.markT > 0.6) {
            const iv = rw.ivs[0];
            ctx.fillStyle = (Math.floor(d / 3) & 1) ? '#a07040' : '#805020'; ctx.fillRect(iv[0], y, iv[1] - iv[0], 2);
          }
        }
        // signs
        for (const s of segs) {
          if (s.mark !== 'boathouse') continue;
          const y = Math.round(PY - (s.d0 + s.len * 0.75 - dist));
          if (y > TOP - 10 && y < BOT) text(ctx, 'BOAT HOUSE', W / 2, y - 3, '#ffe040', 1, 'center');
        }
      }
      function drawEnt(ctx, e) {
        const y = Math.round(sy(e.wy)), x = Math.round(e.x);
        if (y < TOP - 40 || y > BOT + 40) return;
        let img;
        switch (e.type) {
          case 'civ': img = SP.civ[e.sheet]; break;
          case 'civTruck': img = SP.civTruck; break;
          case 'blade': img = SP.blade; break;
          case 'lord': img = SP.lord; break;
          case 'enforcer': img = SP.enforcer; break;
          case 'van': img = SP.van; break;
          case 'torpedo': img = SP.torpedo; break;
          case 'dumper': img = SP.dumper; break;
          case 'barrel': {
            ctx.fillStyle = '#6a3a10'; ctx.fillRect(x - 4, y - 4, 8, 8); ctx.fillStyle = '#a06020'; ctx.fillRect(x - 3, y - 4, 6, 8);
            ctx.fillStyle = '#303030'; ctx.fillRect(x - 4, y - 2, 8, 1); ctx.fillRect(x - 4, y + 1, 8, 1);
            if ((frame >> 3) & 1) { ctx.fillStyle = '#ff3030'; ctx.fillRect(x - 1, y - 1, 2, 2); }
            return;
          }
        }
        if (!img) return;
        if (e.spin > 0) {
          ctx.save(); ctx.translate(x, y); ctx.rotate(e.spin * 0.35 * (e.spinDir || 1)); ctx.drawImage(img, -Math.floor(img.width / 2), -Math.floor(img.height / 2)); ctx.restore();
        } else ctx.drawImage(img, x - Math.floor(img.width / 2), y - Math.floor(img.height / 2));
        if (e.type === 'blade' && e.t > 10 && (frame >> 1) & 1) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + (e.x < g.player.x ? 8 : -10), y - 4, 2, 2); }
        if ((e.type === 'torpedo' || e.type === 'dumper') && (frame >> 2) & 1) { ctx.fillStyle = '#c0e0ff'; ctx.fillRect(x - 4, y + 11, 2, 2); ctx.fillRect(x + 2, y + 12, 2, 2); }
      }
      function drawFx(ctx) {
        for (const s of g.slicks) { const y = Math.round(sy(s.wy)); ctx.fillStyle = '#101018'; ctx.fillRect(s.x - 7, y - 4, 14, 8); ctx.fillRect(s.x - 5, y - 6, 10, 12); ctx.fillStyle = '#383850'; ctx.fillRect(s.x - 3, y - 3, 4, 2); }
        for (const b of g.bombs) {
          const y = Math.round(sy(b.wy)), k = b.t / 50;
          ctx.fillStyle = '#00000060'; ctx.fillRect(b.x - 3, y - 2, 6, 4);
          const by = Math.round(lerp(y, b.sy, k));
          ctx.fillStyle = '#202020'; ctx.fillRect(b.x - 2, by - 3, 4, 6); ctx.fillStyle = '#ff4020'; ctx.fillRect(b.x - 1, by + 2, 2, 1);
        }
        for (const s of g.shots) {
          const y = Math.round(sy(s.wy));
          if (s.torpedo) { ctx.fillStyle = '#e0e0e0'; ctx.fillRect(s.x - 1, y - 4, 3, 8); ctx.fillStyle = '#ff3030'; ctx.fillRect(s.x - 1, y + 3, 3, 1); ctx.fillStyle = '#a0c8ff'; ctx.fillRect(s.x, y - 7, 1, 3); }
          else if (s.enemy) { ctx.fillStyle = '#ffd040'; ctx.fillRect(s.x - 2, y - 1, 4, 2); }
          else { ctx.fillStyle = '#ffff80'; ctx.fillRect(s.x, y - 3, 1, 4); }
        }
        for (const m of g.missiles) { const y = Math.round(sy(m.wy)); ctx.fillStyle = '#f0f0f0'; ctx.fillRect(Math.round(m.x) - 1, y - 4, 3, 7); ctx.fillStyle = (frame & 1) ? '#ffa020' : '#ff4010'; ctx.fillRect(Math.round(m.x) - 1, y + 3, 3, 3); }
        for (const f of g.fx) {
          const y = Math.round(sy(f.wy)), x = Math.round(f.x);
          if (f.spark) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 1, 3, 3); continue; }
          const r = Math.round((f.big ? 18 : 11) * Math.min(1, f.t / 10)), fade = f.t > (f.big ? 30 : 18);
          ctx.fillStyle = fade ? '#603020' : '#ff6010'; ctx.fillRect(x - r, y - r / 2, r * 2, r);
          ctx.fillRect(x - r / 2, y - r, r, r * 2);
          if (!fade) { ctx.fillStyle = '#ffe040'; ctx.fillRect(x - r / 2, y - r / 3, r, r * 0.66); ctx.fillStyle = '#fff'; ctx.fillRect(x - 2, y - 2, 4, 4); }
        }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, TOP); ctx.fillRect(0, BOT, W, H - BOT);
        text(ctx, String(g ? g.score : 0).padStart(6, '0'), 4, 5, g && g.noScore > 0 && (frame >> 3) & 1 ? '#ff3030' : '#ffffff', 1);
        text(ctx, 'HI ' + String(hi).padStart(6, '0'), W - 4, 5, '#ffe040', 1, 'right');
        if (!g) return;
        if (g.timerOn) { ctx.fillStyle = '#202020'; ctx.fillRect(86, 3, 60, 11); text(ctx, String(g.timer).padStart(4, '0'), 116, 5, g.timer < 150 && (frame >> 3) & 1 ? '#ff4040' : '#40ff40', 1, 'center'); }
        // spare cars
        for (let i = 0; i < Math.min(5, g.spares); i++) ctx.drawImage(SP.player, W - 14 - i * 12, BOT + 1, 8, 13);
        if (g.weapon) text(ctx, g.weapon + ' ' + g.ammo, 4, BOT + 5, '#40e0ff', 1);
        else text(ctx, 'MACHINE GUNS', 4, BOT + 5, '#808080', 1);
        // speedometer
        ctx.fillStyle = '#303030'; ctx.fillRect(132, BOT + 5, 40, 6);
        ctx.fillStyle = g.spd > 4.5 ? '#ff5030' : '#40ff40'; ctx.fillRect(132, BOT + 5, Math.round(40 * g.spd / 6), 6);
      }
      function drawTitle(ctx) {
        // scrolling road behind the logo
        const d = titleT * 2;
        if (!segs.length || d < segs[0].d0) resetCourse();
        genMore(d + 2000);
        while (segs.length > 3 && segs[1].d0 + segs[1].len < d - 600) segs.shift();
        drawCourse(ctx, d);
        ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(10, 30, W - 20, 250);
        const grad = ['#ffffff', '#f0f0f0', '#d8d8d8', '#c0c0c0', '#a8a8a8', '#d01818', '#901010'];
        textS(ctx, 'SPY', W / 2, 40, grad, 4, 'center');
        textS(ctx, 'HUNTER', W / 2, 74, grad, 4, 'center');
        ctx.drawImage(SP.player, W / 2 - 8, 112);
        text(ctx, 'SWITCH BLADE   150', 40, 140, '#ffffff', 1); ctx.drawImage(SP.blade, 20, 135, 11, 18);
        text(ctx, 'ROAD LORD      RAM', 40, 160, '#ffffff', 1); ctx.drawImage(SP.lord, 18, 155, 15, 20);
        text(ctx, 'ENFORCER       150', 40, 180, '#ffffff', 1); ctx.drawImage(SP.enforcer, 20, 175, 11, 20);
        text(ctx, 'MAD BOMBER     700', 40, 200, '#ffffff', 1); ctx.drawImage(SP.heli[(titleT >> 2) & 1], 14, 192, 20, 20);
        text(ctx, "DON'T SHOOT CIVILIANS", W / 2, 222, '#ff8080', 1, 'center');
        text(ctx, 'VAN: OIL - SMOKE - MISSILES', W / 2, 236, '#40e0ff', 1, 'center');
        if (api.credits === 0 || coinFlash > 0) { if (coinFlash > 0 ? (frame >> 2) & 1 : (frame >> 5) & 1) text(ctx, 'INSERT COIN', W / 2, 256, '#ff3030', 1, 'center'); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START', W / 2, 256, '#ffe040', 1, 'center');
        text(ctx, '\u00a9 1983 BALLY MIDWAY', W / 2, 270, '#c0c0c0', 1, 'center');
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, TOP); ctx.fillRect(0, BOT, W, H - BOT);
        text(ctx, 'HI ' + String(hi).padStart(6, '0'), W - 4, 5, '#ffe040', 1, 'right');
        text(ctx, 'CREDIT ' + pad2(api.credits), 4, BOT + 5, '#ffffff', 1);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { drawTitle(ctx); return; }
        drawCourse(ctx, g.dist);
        for (const e of g.ents) if (e.type === 'barrel') drawEnt(ctx, e);
        drawFx(ctx);
        for (const e of g.ents) if (e.type !== 'barrel' && e.type !== 'van') drawEnt(ctx, e);
        for (const e of g.ents) if (e.type === 'van') drawEnt(ctx, e);
        const p = g.player;
        if (!p.hidden && (p.inv <= 0 || (frame >> 2) & 1)) {
          const img = p.boat ? SP.boat : SP.player;
          ctx.drawImage(img, Math.round(p.x) - Math.floor(img.width / 2), PY - Math.floor(img.height / 2));
          if (p.boat && (frame >> 2) & 1) { ctx.fillStyle = '#e0f0ff'; ctx.fillRect(Math.round(p.x) - 6, PY + 11, 3, 2); ctx.fillRect(Math.round(p.x) + 3, PY + 12, 3, 2); }
        }
        for (const s of g.smokes) {
          const y = Math.round(sy(s.wy)), r = Math.round(s.r);
          ctx.fillStyle = s.t > 60 ? '#d8d8d8' : '#909090';
          ctx.fillRect(s.x - r, y - r / 2, r * 2, r); ctx.fillRect(s.x - r / 2, y - r, r, r * 2);
          ctx.fillStyle = '#f8f8f8'; ctx.fillRect(s.x - r / 3, y - r / 2, r / 2, r / 3);
        }
        if (g.heli) {
          const hc = g.heli;
          ctx.fillStyle = '#00000050'; ctx.fillRect(Math.round(hc.x) - 6, Math.round(hc.y) + 40, 12, 6);
          ctx.drawImage(SP.heli[(frame >> 1) & 1], Math.round(hc.x) - 14, Math.round(hc.y) - 14);
        }
        for (const pp of g.pops) textS(ctx, pp.txt, Math.round(pp.x), Math.round(sy(pp.wy)) - 16, pp.col, 1, 'center');
        if (g.msgT > 0 && (g.msgT > 40 || (frame >> 2) & 1)) textS(ctx, g.msg, W / 2, 40, '#ffe040', 1, 'center');
        if (g.phase === 'deliver' && g.dist < 400) textS(ctx, 'PLAYER 1', W / 2, 120, '#ffffff', 2, 'center');
        if (g.phase === 'over' || g.phase === 'wait') textS(ctx, 'GAME OVER', W / 2, 140, '#ff3030', 2, 'center');
        drawHUD(ctx);
      }
      if (api.debugHook) api.debugHook({ g: () => g, mode: () => mode, row });
      return { update, render, destroy() { } };
    }
  });
})();
