// Karate Champ (Data East, 1984) - from-scratch recreation for the MAME32 Game Room.
// One-on-one tournament karate: full points and half points, a referee who calls every point, and bonus stages.
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
  function textS(ctx, s, x, y, col, sc, align) { text(ctx, s, x + (sc || 1), y + (sc || 1), '#000', sc, align); text(ctx, s, x, y, col, sc, align); }

  // ---------- procedural pixel-limb fighter renderer ----------
  const D2R = Math.PI / 180;
  const shadeCache = {};
  function shade(hex, k) {
    const key = hex + k; if (shadeCache[key]) return shadeCache[key];
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.round(((n >> 16) & 255) * k)), g = Math.min(255, Math.round(((n >> 8) & 255) * k)), b = Math.min(255, Math.round((n & 255) * k));
    return (shadeCache[key] = '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1));
  }
  function seg(ctx, x0, y0, x1, y1, w, col) {
    ctx.fillStyle = col;
    const dx = x1 - x0, dy = y1 - y0, n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
    const h = w / 2;
    for (let i = 0; i <= n; i++) { const t = i / n; ctx.fillRect(Math.round(x0 + dx * t - h), Math.round(y0 + dy * t - h), w, w); }
  }
  // P: {lean, ra:[upper,fore], la, rl:[thigh,shin], ll}; angles in degrees from straight down (+ = forward); lean from up.
  function drawMan(ctx, x, y, f, P, C, s) {
    const LT = 9 * s, LS = 9 * s, TT = 12 * s, UA = 7 * s, FA = 7 * s;
    const cs = a => Math.cos(a * D2R), sn = a => Math.sin(a * D2R);
    const legH = L => cs(L[0]) * LT + cs(L[1]) * LS;
    const hy = y - Math.max(legH(P.rl), legH(P.ll), 2 * s);
    const hx = x;
    const lean = P.lean || 0;
    const nx = hx + sn(lean) * TT * f, ny = hy - cs(lean) * TT;
    const shx = hx + sn(lean) * TT * 0.85 * f, shy = hy - cs(lean) * TT * 0.85;
    const lw = Math.max(3, Math.round(4 * s)), aw = Math.max(2, Math.round(3 * s)), tw = Math.round(7 * s);
    function leg(L, dark) {
      const kx = hx + sn(L[0]) * LT * f, ky = hy + cs(L[0]) * LT;
      const fx = kx + sn(L[1]) * LS * f, fy = ky + cs(L[1]) * LS;
      const pc = dark ? shade(C.pants, 0.7) : C.pants;
      seg(ctx, hx, hy, kx, ky, lw, pc); seg(ctx, kx, ky, fx, fy, lw, pc);
      ctx.fillStyle = dark ? shade(C.shoes, 0.7) : C.shoes;
      ctx.fillRect(Math.round(fx - 2 * s + (f > 0 ? 1 : -1) * s), Math.round(fy - 2 * s), Math.round(5 * s), Math.round(3 * s));
    }
    function arm(A, dark) {
      const ex = shx + sn(A[0]) * UA * f, ey = shy + cs(A[0]) * UA;
      const wx = ex + sn(A[1]) * FA * f, wy = ey + cs(A[1]) * FA;
      const sl = C.sleeve || C.skin;
      seg(ctx, shx, shy, ex, ey, aw, dark ? shade(sl, 0.75) : sl);
      seg(ctx, ex, ey, wx, wy, aw, dark ? shade(C.skin, 0.75) : C.skin);
      ctx.fillStyle = dark ? shade(C.skin, 0.75) : C.skin;
      ctx.fillRect(Math.round(wx - 1.5 * s), Math.round(wy - 1.5 * s), Math.round(3 * s), Math.round(3 * s));
      return { x: wx, y: wy, a: A[1], ex, ey };
    }
    const backHand = arm(P.la, true);
    leg(P.ll, true);
    seg(ctx, hx, hy, nx, ny, tw, C.top);
    if (C.belt) seg(ctx, hx, hy, hx + sn(lean) * 2 * s * f, hy - cs(lean) * 2 * s, tw, C.belt);
    leg(P.rl, false);
    // head
    const hcx = hx + sn(lean) * (TT + 4 * s) * f, hcy = hy - cs(lean) * (TT + 4 * s);
    const hw = Math.round(6 * s), hh = Math.round(7 * s);
    const X0 = Math.round(hcx - hw / 2), Y0 = Math.round(hcy - hh / 2);
    ctx.fillStyle = C.skin; ctx.fillRect(X0, Y0, hw, hh);
    ctx.fillStyle = C.hair;
    if (C.hood) { ctx.fillRect(X0, Y0, hw, hh); ctx.fillStyle = C.skin; ctx.fillRect(f > 0 ? X0 + hw - Math.round(3 * s) : X0, Y0 + Math.round(2 * s), Math.round(3 * s), Math.round(2 * s)); }
    else {
      ctx.fillRect(X0, Y0, hw, Math.round(2 * s));
      ctx.fillRect(f > 0 ? X0 : X0 + hw - Math.round(2 * s), Y0, Math.round(2 * s), Math.round(5 * s));
      if (C.long) ctx.fillRect(f > 0 ? X0 - Math.round(2 * s) : X0 + hw, Y0 + 1, Math.round(2 * s), Math.round(9 * s));
      if (C.mohawk) ctx.fillRect(X0 + Math.round(2 * s), Y0 - Math.round(2 * s), Math.round(2 * s), Math.round(3 * s));
      ctx.fillStyle = '#000'; ctx.fillRect(f > 0 ? X0 + hw - Math.round(2 * s) : X0 + Math.round(s), Y0 + Math.round(3 * s), Math.max(1, Math.round(s)), Math.max(1, Math.round(s)));
    }
    if (C.band) { ctx.fillStyle = C.band; ctx.fillRect(X0, Y0 + Math.round(2 * s), hw, Math.max(1, Math.round(s))); }
    const front = arm(P.ra, false);
    return { front, back: backHand, head: { x: hcx, y: hcy } };
  }
  function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296; }

  const W = 256, H = 224, FLOOR = 192, SC = 1.45;
  const POSE = {
    stand: { lean: 4, ra: [45, 165], la: [15, 150], rl: [24, 6], ll: [-22, -6] },
    stand2: { lean: 7, ra: [48, 168], la: [18, 152], rl: [25, 7], ll: [-22, -6] },
    walk0: { lean: 6, ra: [45, 165], la: [15, 150], rl: [32, 8], ll: [-12, -4] },
    walk1: { lean: 6, ra: [45, 165], la: [15, 150], rl: [10, 0], ll: [-32, -8] },
    block: { lean: -4, ra: [70, 178], la: [45, 172], rl: [20, 4], ll: [-28, -8] },
    crouch: { lean: 20, ra: [60, 150], la: [30, 140], rl: [85, -10], ll: [-20, -80] },
    cblock: { lean: 12, ra: [80, 30], la: [55, 25], rl: [85, -10], ll: [-20, -80] },
    jump: { lean: 6, ra: [60, 170], la: [30, 160], rl: [80, -20], ll: [50, -50] },
    punchW: { lean: 0, ra: [0, 150], la: [50, 150], rl: [24, 6], ll: [-22, -6] },
    lunge: { lean: 22, ra: [90, 90], la: [-30, 120], rl: [52, 10], ll: [-45, -35] },
    jab: { lean: 8, ra: [114, 118], la: [20, 150], rl: [24, 6], ll: [-22, -6] },
    lowp: { lean: 34, ra: [76, 76], la: [10, 140], rl: [85, -10], ll: [-20, -80] },
    strong: { lean: 28, ra: [90, 92], la: [-40, 120], rl: [56, 0], ll: [-56, -46] },
    backfist: { lean: -6, ra: [100, 140], la: [-10, 130], rl: [24, 6], ll: [-22, -6] },
    kickW: { lean: 0, ra: [40, 165], la: [10, 150], rl: [80, -20], ll: [-6, -2] },
    front: { lean: -12, ra: [40, 160], la: [-20, 120], rl: [92, 84], ll: [-8, -4] },
    sideW: { lean: -10, ra: [60, 170], la: [20, 150], rl: [85, -40], ll: [-4, -2] },
    side: { lean: -38, ra: [30, 170], la: [-60, 40], rl: [98, 98], ll: [-6, -6] },
    roundW: { lean: -12, ra: [40, 165], la: [0, 150], rl: [100, 10], ll: [-4, -2] },
    round: { lean: -46, ra: [20, 170], la: [-80, 0], rl: [124, 128], ll: [-4, -4] },
    jumpk: { lean: -20, ra: [40, 165], la: [-60, 30], rl: [96, 96], ll: [40, -60] },
    sweep: { lean: 36, ra: [80, 40], la: [60, 0], rl: [88, 90], ll: [70, -70] },
    bsweep: { lean: -26, ra: [-60, -20], la: [-90, -30], rl: [88, 92], ll: [70, -70] },
    hit: { lean: -26, ra: [-25, 40], la: [-45, 30], rl: [12, 0], ll: [-16, 0] },
    fall: { lean: -62, ra: [-120, -140], la: [-100, -150], rl: [60, 40], ll: [40, 30] },
    down: { lean: -90, ra: [-100, -80], la: [-95, -85], rl: [88, 92], ll: [86, 90] },
    getup: { lean: -20, ra: [-30, 0], la: [-40, -10], rl: [80, 92], ll: [70, 100] },
    bow: { lean: 42, ra: [28, 18], la: [24, 14], rl: [4, 0], ll: [-4, 0] },
    ready: { lean: 0, ra: [12, 40], la: [-6, 30], rl: [12, 0], ll: [-12, 0] },
    win: { lean: 0, ra: [-170, -176], la: [10, 150], rl: [12, 0], ll: [-12, 0] },
    chop: { lean: 30, ra: [100, 150], la: [10, 140], rl: [30, 0], ll: [-30, -10] },
    chopW: { lean: -10, ra: [-160, -170], la: [10, 140], rl: [24, 6], ll: [-22, -6] },
    sad: { lean: 30, ra: [10, 0], la: [5, 0], rl: [8, 0], ll: [-8, 0] }
  };
  // lvl: h/m/l, frames (w)ind-up/(a)ctive/(r)ecovery, reach from centre, full = can score a full point
  const MOVES = {
    lunge: { lvl: 'm', w: 6, a: 4, r: 11, reach: 34, full: false, pts: 200, name: 'LUNGE PUNCH', wp: 'punchW', p: 'lunge', step: 10 },
    jab: { lvl: 'h', w: 4, a: 4, r: 9, reach: 29, full: false, pts: 100, name: 'HIGH PUNCH', wp: 'punchW', p: 'jab' },
    lowp: { lvl: 'l', w: 5, a: 4, r: 10, reach: 28, full: false, pts: 100, name: 'LOW PUNCH', wp: 'crouch', p: 'lowp', low: true },
    strong: { lvl: 'm', w: 9, a: 4, r: 14, reach: 34, full: true, pts: 300, name: 'REVERSE PUNCH', wp: 'punchW', p: 'strong', step: 12 },
    backfist: { lvl: 'h', w: 7, a: 4, r: 12, reach: 31, full: false, pts: 200, name: 'BACK FIST', wp: 'punchW', p: 'backfist' },
    front: { lvl: 'm', w: 8, a: 5, r: 13, reach: 39, full: true, pts: 300, name: 'FRONT KICK', wp: 'kickW', p: 'front' },
    side: { lvl: 'm', w: 11, a: 5, r: 15, reach: 45, full: true, pts: 400, name: 'SIDE KICK', wp: 'sideW', p: 'side' },
    round: { lvl: 'h', w: 12, a: 5, r: 16, reach: 43, full: true, pts: 400, name: 'ROUNDHOUSE', wp: 'roundW', p: 'round' },
    jumpk: { lvl: 'h', w: 10, a: 12, r: 12, reach: 42, full: true, pts: 500, name: 'JUMP SIDE KICK', wp: 'jump', p: 'jumpk', air: true, step: 26 },
    sweep: { lvl: 'l', w: 9, a: 5, r: 16, reach: 42, full: false, pts: 300, name: 'FOOT SWEEP', wp: 'crouch', p: 'sweep', low: true, kd: true },
    bsweep: { lvl: 'l', w: 12, a: 6, r: 18, reach: 46, full: true, pts: 400, name: 'BACK SWEEP', wp: 'crouch', p: 'bsweep', low: true, kd: true }
  };
  const MOVE_LIST = Object.keys(MOVES);
  const VENUES = [
    { name: 'SEASIDE', sky: ['#3870d0', '#80b0f0'], mat: '#c8a060', line: '#a07838', kind: 'sea' },
    { name: 'PAGODA', sky: ['#e07040', '#f0c070'], mat: '#b89060', line: '#8a6838', kind: 'pagoda' },
    { name: 'MT. FUJI', sky: ['#5090e0', '#c0e0ff'], mat: '#a8b870', line: '#788840', kind: 'fuji' },
    { name: 'NIGHT CITY', sky: ['#080820', '#283060'], mat: '#706070', line: '#504050', kind: 'city' },
    { name: 'BRIDGE', sky: ['#90a0c0', '#d0d8e8'], mat: '#909090', line: '#606060', kind: 'bridge' },
    { name: 'DOJO', sky: ['#5a3818', '#7a5028'], mat: '#d8b878', line: '#a88848', kind: 'dojo' }
  ];
  const RANKS = ['WHITE BELT', 'YELLOW BELT', 'GREEN BELT', 'BLUE BELT', 'BROWN BELT', '1ST DAN', '2ND DAN', '3RD DAN', '4TH DAN', '5TH DAN', '6TH DAN', '7TH DAN', '8TH DAN', '9TH DAN', '10TH DAN'];
  const BELTC = ['#f0f0f0', '#f0d020', '#30a030', '#3050d0', '#7a4a20', '#101010'];
  const GI_W = { skin: '#f4b884', hair: '#2a1a10', top: '#f4f4f4', sleeve: '#f4f4f4', pants: '#f4f4f4', shoes: '#f4b884', belt: '#101010' };
  const GI_R = { skin: '#e8a878', hair: '#101010', top: '#e02828', sleeve: '#e02828', pants: '#e02828', shoes: '#e8a878', belt: '#101010' };
  const REF = { skin: '#f0c098', hair: '#e8e8e8', top: '#283880', sleeve: '#283880', pants: '#f0f0f0', shoes: '#202020', belt: '#283880' };

  ArcadeRegistry.register({
    id: 'karatechamp', title: 'Karate Champ', year: 1984, maker: 'Data East',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Left/Right: step \u00b7 Up: jump \u00b7 Down: crouch \u00b7 hold Back: block \u00b7 Space: punch, X: kick (+Up/Down/Fwd/Back for other techniques) \u00b7 Enter: start',
    marquee: { bg: '#f4f4f0', fg: '#d01818', accent: '#101010' },
    create(api) {
      const A = api.audio;
      // little vowel-ish "voice" for the referee
      function say(word, d0) {
        const v = { BEGIN: [[220, 0.09, 330], [260, 0.16, 200]], STOP: [[300, 0.06, 300], [240, 0.18, 160]], WHITE: [[260, 0.1, 340], [200, 0.16, 180]], RED: [[240, 0.1, 300], [180, 0.18, 150]], FULL: [[200, 0.1, 260], [240, 0.2, 170]], HALF: [[260, 0.12, 320], [210, 0.18, 170]], JUDGE: [[230, 0.1, 280], [200, 0.2, 150]] }[word] || [[220, 0.15, 180]];
        let d = d0 || 0;
        for (const [f, dur, to] of v) { A.tone(f, dur, { type: 'sawtooth', vol: 0.09, slideTo: to, delay: d }); A.tone(f * 2.02, dur, { type: 'square', vol: 0.03, slideTo: to * 2, delay: d }); d += dur; }
      }
      const sfx = {
        whoosh() { A.noise(0.07, { vol: 0.08, freq: 2500, type: 'highpass' }); },
        hit() { A.noise(0.1, { vol: 0.24, freq: 1800 }); A.tone(180, 0.08, { type: 'square', vol: 0.1, slideTo: 80 }); },
        block() { A.noise(0.05, { vol: 0.16, freq: 600 }); A.tone(400, 0.04, { type: 'square', vol: 0.06 }); },
        thud() { A.noise(0.25, { vol: 0.22, freq: 300, slideTo: 60 }); },
        crack() { A.noise(0.12, { vol: 0.25, freq: 2500, slideTo: 400 }); },
        win() { A.melody([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.3], [784, 0.1], [1047, 0.4]], { type: 'square', vol: 0.13 }); },
        lose() { A.melody([[392, 0.2], [370, 0.2], [349, 0.2], [330, 0.5]], { type: 'triangle', vol: 0.15 }); },
        tick() { A.tone(1500, 0.02, { type: 'square', vol: 0.05 }); },
        gong() { A.tone(196, 1.2, { type: 'sine', vol: 0.2 }); A.tone(294, 0.9, { type: 'sine', vol: 0.08 }); }
      };
      let hi = api.getHiScore(30000);
      let mode = 'attract', T = 0, coinFlash = 0, lastCred = api.credits, atPage = 0, atT = 0;
      let score = 0, match = 0, demo = false;
      let F = [], ref = { flag: 0, say: '', sayT: 0, sub: '' };
      let phase = 'intro', phaseT = 0, clock = 30, clockAcc = 0, lastPoint = null, bonus = null, venue = 0;

      function credStr() { return 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'); }
      function addScore(n) { if (demo) return; score += n; if (score > hi) hi = score; }
      function mkFighter(isP, x, face) {
        return { isP, x, z: 0, vx: 0, vz: 0, face, state: 'walk', t: 0, move: null, hitDone: false, pts: 0, anim: 0, pal: isP ? GI_W : GI_R, att: 0, ai: { cd: 30, hold: 0, holdS: null, reacted: null, want: 0 } };
      }
      function cpuLevel() { return demo ? 4 : Math.min(14, match); }
      function newGame() {
        score = 0; match = 0; demo = false; mode = 'game';
        startMatch();
      }
      function startMatch() {
        venue = match % VENUES.length;
        F = [mkFighter(true, -10, 1), mkFighter(false, W + 10, -1)];
        F[0].pal = Object.assign({}, GI_W, { belt: BELTC[Math.min(5, match)] });
        F[1].pal = Object.assign({}, GI_R, { belt: BELTC[Math.min(5, match + 1)] });
        phase = 'intro'; phaseT = 0; clock = 30; clockAcc = 0; ref.flag = 0; ref.say = ''; lastPoint = null;
      }
      function resetPositions() {
        F[0].x = 76; F[1].x = W - 76; F[0].face = 1; F[1].face = -1;
        for (const f of F) { f.state = 'stand'; f.t = 0; f.z = 0; f.move = null; f.ai.hold = 0; f.ai.reacted = null; }
      }
      function refSay(w, sub, flag, t) { ref.say = w; ref.sub = sub || ''; ref.flag = flag || 0; ref.sayT = t || 90; say(w.split(' ')[0]); }

      // ---------- fighter control ----------
      function isFree(f) { return f.state === 'stand' || f.state === 'walk' || f.state === 'block' || f.state === 'crouch' || f.state === 'cblock'; }
      function startMove(f, m) { f.state = 'att'; f.move = m; f.t = 0; f.hitDone = false; f.att++; sfx.whoosh(); }
      function playerIntent() {
        const lx = (api.key('ArrowRight') ? 1 : 0) - (api.key('ArrowLeft') ? 1 : 0);
        const up = api.key('ArrowUp'), dn = api.key('ArrowDown');
        return { lx, up, dn, punch: api.pressed('Space'), kick: api.pressed('KeyX') };
      }
      function chooseMove(f, it) {
        const fwd = it.lx === f.face, back = it.lx === -f.face;
        if (it.punch) { if (it.up) return 'jab'; if (it.dn) return 'lowp'; if (fwd) return 'strong'; if (back) return 'backfist'; return 'lunge'; }
        if (it.kick) { if (it.up) return 'jumpk'; if (it.dn && back) return 'bsweep'; if (it.dn) return 'sweep'; if (fwd) return 'side'; if (back) return 'round'; return 'front'; }
        return null;
      }
      function applyIntent(f, it, opp) {
        if (!isFree(f)) return;
        f.face = opp.x >= f.x ? 1 : -1;
        const mv = chooseMove(f, it);
        if (mv) { startMove(f, mv); return; }
        const fwd = it.lx === f.face, back = it.lx === -f.face;
        if (it.up) { f.state = 'jump'; f.vz = 4.2; f.vx = it.lx * 1.2; f.z = 0.1; return; }
        if (it.dn) { f.state = back ? 'cblock' : 'crouch'; return; }
        if (back) { f.state = 'block'; f.x -= f.face * 0.7; f.anim++; return; }
        if (fwd) { f.state = 'walk'; f.x += f.face * 1.15; f.anim++; return; }
        f.state = 'stand';
      }
      function stepFighter(f) {
        switch (f.state) {
          case 'att': {
            const M = MOVES[f.move]; f.t++;
            if (M.step && f.t <= M.w + (M.air ? M.a : 0)) f.x += f.face * M.step / (M.w + (M.air ? M.a : 0));
            if (M.air) { const tot = M.w + M.a; f.z = f.t <= tot ? Math.sin(f.t / tot * Math.PI) * 30 : 0; }
            if (f.t >= M.w + M.a + M.r) { f.state = 'stand'; f.move = null; f.z = 0; }
            break;
          }
          case 'jump': f.z += f.vz; f.vz -= 0.3; f.x += f.vx; if (f.z <= 0) { f.z = 0; f.state = 'stand'; } break;
          case 'hit': if (--f.t <= 0) f.state = 'stand'; break;
          case 'fall': f.z += f.vz; f.vz -= 0.3; f.x += f.vx; if (f.z <= 0) { f.z = 0; f.state = 'down'; f.t = 40; sfx.thud(); } break;
          case 'down': if (--f.t <= 0) { f.state = 'getup'; f.t = 18; } break;
          case 'getup': if (--f.t <= 0) f.state = 'stand'; break;
          case 'walkin': break;
        }
        f.x = Math.max(16, Math.min(W - 16, f.x));
      }
      function lowProfile(f) { return f.state === 'crouch' || f.state === 'cblock' || (f.state === 'att' && MOVES[f.move].low) || f.state === 'down'; }
      function airborne(f) { return (f.state === 'jump' && f.z > 6) || (f.state === 'att' && MOVES[f.move].air && f.z > 8); }
      // returns {res:'hit'|'block'|null, full}
      function evalHit(a, d) {
        const M = MOVES[a.move];
        if (a.state !== 'att' || a.hitDone || a.t <= M.w || a.t > M.w + M.a) return null;
        const dist = (d.x - a.x) * a.face;
        if (dist < 6 || dist > M.reach + 7) return null;
        if (M.lvl === 'h' && lowProfile(d)) return null;
        if (M.lvl === 'l' && airborne(d)) return null;
        if (d.state === 'down' || d.state === 'fall' || d.state === 'getup') return null;
        a.hitDone = true;
        if ((d.state === 'block' && M.lvl !== 'l') || (d.state === 'cblock' && M.lvl === 'l')) return { res: 'block' };
        const clean = M.full && dist >= M.reach - 14 && !(a.isP === false && Math.random() < 0.15);
        return { res: 'hit', full: clean };
      }
      function resolveHits() {
        const r0 = evalHit(F[0], F[1]), r1 = evalHit(F[1], F[0]);
        const h0 = r0 && r0.res === 'hit', h1 = r1 && r1.res === 'hit';
        if (r0 && r0.res === 'block') { sfx.block(); F[0].x -= F[0].face * 4; F[1].x += F[0].face * 2; }
        if (r1 && r1.res === 'block') { sfx.block(); F[1].x -= F[1].face * 4; F[0].x += F[1].face * 2; }
        if (h0 && h1) { // clash: no point
          sfx.hit(); for (const f of F) { f.state = 'hit'; f.t = 14; f.x -= f.face * 6; }
          return;
        }
        if (h0) awardPoint(0, r0.full);
        else if (h1) awardPoint(1, r1.full);
      }
      function awardPoint(i, full) {
        const a = F[i], d = F[1 - i], M = MOVES[a.move];
        sfx.hit();
        if (M.kd || full) { d.state = 'fall'; d.vz = 2.6; d.vx = a.face * 1.4; d.z = 1; }
        else { d.state = 'hit'; d.t = 30; d.x += a.face * 4; }
        const val = full ? 1 : 0.5;
        a.pts += val;
        if (i === 0) addScore(M.pts * (full ? 2 : 1) * (1 + Math.floor(match / 3)));
        lastPoint = { i, full, name: M.name };
        phase = 'point'; phaseT = 0;
        refSay('STOP', '', 0, 30);
      }
      // ---------- CPU ----------
      function aiIntent(me, op) {
        const it = { lx: 0, up: false, dn: false, punch: false, kick: false };
        const lv = cpuLevel(), ai = me.ai;
        const d = Math.abs(op.x - me.x), fwd = op.x >= me.x ? 1 : -1;
        if (!isFree(me)) return it;
        // react to an incoming technique once
        if (op.state === 'att' && op.t <= MOVES[op.move].w + 1 && ai.reacted !== op.att) {
          ai.reacted = op.att;
          const M = MOVES[op.move];
          const react = Math.min(0.82, 0.18 + lv * 0.055);
          if (d < M.reach + 12 && Math.random() < react) {
            ai.hold = M.w + M.a + 6;
            ai.holdS = M.lvl === 'h' ? (Math.random() < 0.5 ? 'crouch' : 'block') : M.lvl === 'm' ? (Math.random() < 0.75 ? 'block' : 'jump') : (Math.random() < 0.6 ? 'jump' : 'cblock');
            // counter when the opponent whiffs
            if (Math.random() < lv * 0.05) ai.counter = true;
          }
        }
        if (ai.hold > 0) {
          ai.hold--;
          if (ai.holdS === 'crouch') it.dn = true;
          else if (ai.holdS === 'cblock') { it.dn = true; it.lx = -fwd; }
          else if (ai.holdS === 'block') it.lx = -fwd;
          else if (ai.holdS === 'jump') { it.up = me.state !== 'jump'; ai.hold = 0; }
          return it;
        }
        // punish a recovering opponent
        if (op.state === 'att' && op.t > MOVES[op.move].w + MOVES[op.move].a && (ai.counter || Math.random() < lv * 0.02)) {
          ai.counter = false;
          const m = pickMove(d, op, lv);
          if (m) return setMoveIntent(it, m, fwd);
        }
        if (--ai.cd > 0) {
          if (ai.want > 0) it.lx = fwd; else if (ai.want < 0) it.lx = -fwd;
          if (ai.want < 0 && Math.random() < 0.5) it.lx = 0;
          return it;
        }
        // new decision
        const aggr = 0.35 + lv * 0.04;
        const m = pickMove(d, op, lv);
        if (m && Math.random() < aggr) { ai.cd = Math.max(8, 40 - lv * 2) + Math.random() * 20; return setMoveIntent(it, m, fwd); }
        const ideal = 40 + Math.random() * 16;
        ai.want = d > ideal + 6 ? 1 : d < ideal - 10 ? -1 : (Math.random() < 0.3 ? (Math.random() < 0.5 ? 1 : -1) : 0);
        ai.cd = 12 + Math.random() * 24;
        if (Math.random() < 0.05 + lv * 0.01) { ai.hold = 20; ai.holdS = 'block'; }
        return it;
      }
      function pickMove(d, op, lv) {
        const cands = [];
        for (const k of MOVE_LIST) {
          const M = MOVES[k];
          const reach = M.reach + (M.step || 0) * 0.6;
          if (d > reach + 2 || d < reach - 22) continue;
          let w = 1;
          if (M.lvl === 'h' && lowProfile(op)) w = 0.05;
          if (M.lvl === 'l' && airborne(op)) w = 0.05;
          if (op.state === 'block' && M.lvl === 'l') w *= 3;
          if (op.state === 'crouch' && M.lvl !== 'h') w *= 2;
          if (M.full) w *= 1 + lv * 0.08;
          if (d >= M.reach - 14 && d <= M.reach) w *= 1 + lv * 0.12;
          cands.push([k, w]);
        }
        if (!cands.length) return null;
        let tot = cands.reduce((s, c) => s + c[1], 0), r = Math.random() * tot;
        for (const c of cands) { r -= c[1]; if (r <= 0) return c[0]; }
        return cands[0][0];
      }
      function setMoveIntent(it, m, fwd) {
        const map = { lunge: ['p', 0, 0], jab: ['p', 0, 'u'], lowp: ['p', 0, 'd'], strong: ['p', 1, 0], backfist: ['p', -1, 0], front: ['k', 0, 0], side: ['k', 1, 0], round: ['k', -1, 0], jumpk: ['k', 0, 'u'], sweep: ['k', 0, 'd'], bsweep: ['k', -1, 'd'] }[m];
        it.punch = map[0] === 'p'; it.kick = map[0] === 'k'; it.lx = map[1] * fwd; it.up = map[2] === 'u'; it.dn = map[2] === 'd';
        return it;
      }
      // ---------- match flow ----------
      function updMatch() {
        phaseT++;
        if (ref.sayT > 0) ref.sayT--;
        const [p, c] = F;
        if (phase === 'intro') {
          // walk in, bow
          p.x = Math.min(76, -10 + phaseT * 1.2); c.x = Math.max(W - 76, W + 10 - phaseT * 1.2);
          p.state = c.state = phaseT < 72 ? 'walkin' : phaseT < 110 ? 'bow' : 'ready';
          p.anim++; c.anim++;
          if (phaseT === 72) sfx.gong();
          if (phaseT === 150) { resetPositions(); refSay('BEGIN', '', 0, 50); phase = 'fight'; phaseT = 0; }
          return;
        }
        if (phase === 'begin') {
          if (phaseT === 1) { resetPositions(); }
          if (phaseT === 40) { refSay('BEGIN', '', 0, 50); }
          if (phaseT >= 60) { phase = 'fight'; phaseT = 0; }
          return;
        }
        if (phase === 'fight') {
          if (!demo) applyIntent(p, playerIntent(), c); else applyIntent(p, aiIntent(p, c), c);
          applyIntent(c, aiIntent(c, p), p);
          stepFighter(p); stepFighter(c);
          // keep apart
          const gap = c.x - p.x;
          if (Math.abs(gap) < 22 && p.z < 10 && c.z < 10) { const push = (22 - Math.abs(gap)) / 2 * (gap >= 0 ? 1 : -1); p.x -= push; c.x += push; }
          resolveHits();
          clockAcc++;
          if (clockAcc >= 60) { clockAcc = 0; clock--; if (clock <= 10 && clock > 0) sfx.tick(); if (clock <= 0) { clock = 0; timeUp(); } }
          return;
        }
        if (phase === 'point') {
          stepFighter(p); stepFighter(c);
          if (phaseT === 34) {
            const lp = lastPoint;
            refSay(lp.i === 0 ? 'WHITE' : 'RED', lp.full ? 'FULL POINT' : 'HALF POINT', lp.i === 0 ? 1 : 2, 80);
            say(lp.full ? 'FULL' : 'HALF', 0.35);
          }
          if (phaseT >= 130) {
            const winner = F[0].pts >= 2 ? 0 : F[1].pts >= 2 ? 1 : -1;
            if (winner >= 0) endMatch(winner, false);
            else { phase = 'begin'; phaseT = 0; }
          }
          return;
        }
        if (phase === 'judge') {
          if (phaseT === 90) {
            const w = lastPoint.i;
            refSay(w === 0 ? 'WHITE' : 'RED', 'WINS BY DECISION', w === 0 ? 1 : 2, 100);
          }
          if (phaseT > 180) endMatch(lastPoint.i, true);
          return;
        }
        if (phase === 'matchend') {
          const w = lastPoint.winner;
          F[w].state = 'win'; F[1 - w].state = 'sad';
          if (phaseT === 1) { if (w === 0 || demo) sfx.win(); else sfx.lose(); }
          if (phaseT > 200) {
            if (demo) { mode = 'attract'; atPage = 2; atT = 0; demo = false; return; }
            if (w === 0) {
              addScore(clock * 100);
              const kinds = ['boards', 'vases', 'bull'];
              startBonus(kinds[match % 3]);
            } else {
              api.setHiScore(score);
              const over = () => { mode = 'over'; T = 0; };
              if (api.offerContinue) api.offerContinue(() => { startMatch(); }, over); else over();
              phase = 'wait';
            }
          }
          return;
        }
      }
      function timeUp() {
        refSay('STOP', '', 0, 40);
        const [p, c] = F;
        let w;
        if (p.pts !== c.pts) w = p.pts > c.pts ? 0 : 1;
        else {
          // judges' decision: count landed or blocked aggression
          const lean = (p.att - c.att) * 0.06 + (Math.random() - 0.5);
          w = lean >= 0 ? 0 : 1;
          lastPoint = { i: w, judge: true };
          phase = 'judge'; phaseT = 0; refSay('JUDGE', '', 3, 80);
          return;
        }
        lastPoint = { i: w };
        endMatch(w, true);
      }
      function endMatch(w, byTime) {
        lastPoint = Object.assign(lastPoint || {}, { winner: w });
        phase = 'matchend'; phaseT = 0;
        refSay(w === 0 ? 'WHITE' : 'RED', 'WINS!', w === 0 ? 1 : 2, 160);
        if (w === 0 && !demo) addScore(1000 * (match + 1));
      }
      // ---------- bonus stages ----------
      function startBonus(kind) {
        phase = 'bonus'; phaseT = 0;
        const p = mkFighter(true, kind === 'boards' ? 90 : W / 2, 1); p.state = 'stand'; p.pal = F[0].pal;
        bonus = { kind, p, t: 0, done: false, msg: '', got: 0, total: 0, power: 0, pdir: 1, boards: 10 + Math.min(5, match >> 1), broken: -1, objs: [], spawn: 60, count: 0, bull: null, time: 20 * 60, endT: 0 };
        if (kind === 'bull') bonus.bull = { x: W + 40, dir: -1, sp: 2.2 + match * 0.08, hp: 3, state: 'charge', t: 0 };
        sfx.gong();
      }
      function updBonus() {
        const b = bonus, p = b.p;
        b.t++;
        if (b.done) { b.endT++; stepFighter(p); if (b.endT > 170) { match++; startMatch(); } return; }
        if (b.t < 90) return;
        if (b.kind === 'boards') {
          if (b.broken < 0) {
            b.power += b.pdir * (0.018 + match * 0.002);
            if (b.power >= 1) { b.power = 1; b.pdir = -1; } if (b.power <= 0) { b.power = 0; b.pdir = 1; }
            if (api.anyPressed('Space', 'KeyX')) { b.broken = 0; b.hitPow = b.power; p.state = 'chopW'; b.ct = 0; sfx.whoosh(); }
          } else {
            b.ct++;
            if (b.ct === 10) {
              const n = b.hitPow > 0.92 ? b.boards : Math.floor(b.hitPow * b.hitPow * b.boards);
              b.broken = n; b.got = n; sfx.crack(); if (n >= b.boards) sfx.win();
              addScore(n * 200 + (n >= b.boards ? 3000 : 0));
              b.msg = n >= b.boards ? 'PERFECT!' : n + ' BOARDS';
            }
            if (b.ct > 10) p.state = 'chop';
            if (b.ct > 60) b.done = true;
          }
          return;
        }
        // shared fighter control for vases/bull (can face both ways)
        const it = playerIntent();
        if (isFree(p)) {
          if (it.lx) p.face = it.lx;
          const mv = chooseMove(p, it);
          if (mv && mv !== 'jumpk') { startMove(p, mv); }
          else if (it.up) { p.state = 'jump'; p.vz = 4.4; p.vx = 0; p.z = 0.1; }
          else if (it.dn) p.state = 'crouch';
          else p.state = 'stand';
        }
        stepFighter(p);
        p.x = W / 2;
        b.time--;
        if (b.kind === 'vases') {
          if (b.count < 20 && --b.spawn <= 0) {
            const side = Math.random() < 0.5 ? -1 : 1, lv = ['h', 'm', 'l'][Math.random() * 3 | 0];
            b.objs.push({ x: side < 0 ? -10 : W + 10, dir: -side, lv, sp: 1.3 + match * 0.05 + Math.random() * 0.5, kind: Math.random() * 3 | 0, broken: 0 });
            b.count++; b.spawn = Math.max(30, 70 - match * 2);
          }
          for (const o of b.objs) {
            if (o.broken) { o.broken++; continue; }
            o.x += o.dir * o.sp;
            if (p.state === 'att') {
              const M = MOVES[p.move];
              const rel = (o.x - p.x) * p.face;
              if (p.t > M.w && p.t <= M.w + M.a && M.lvl === o.lv && rel > 4 && rel < M.reach + 8) { o.broken = 1; b.got++; addScore(200); sfx.crack(); }
            }
            if (!o.broken && Math.abs(o.x - p.x) < 6) {
              const dodge = (o.lv === 'h' && lowProfile(p)) || (o.lv === 'l' && airborne(p));
              if (!dodge && !o.hitP) { o.hitP = true; sfx.block(); if (isFree(p)) { p.state = 'hit'; p.t = 14; } }
            }
          }
          b.objs = b.objs.filter(o => o.broken < 20 && o.x > -20 && o.x < W + 20);
          if ((b.count >= 20 && !b.objs.length) || b.time <= 0) {
            b.done = true; b.msg = b.got + ' OF 20 BROKEN';
            if (b.got >= 20) { addScore(5000); b.msg = 'PERFECT!'; sfx.win(); }
          }
          return;
        }
        if (b.kind === 'bull') {
          const u = b.bull;
          u.t++;
          if (u.state === 'charge') {
            u.x += u.dir * u.sp;
            if (p.state === 'att') {
              const M = MOVES[p.move];
              const rel = (u.x - p.x) * p.face;
              if (p.t > M.w && p.t <= M.w + M.a && M.lvl !== 'h' && rel > 0 && rel < M.reach + 14 && !p.hitDone) {
                p.hitDone = true; u.hp--; sfx.hit(); addScore(1000);
                u.state = 'stagger'; u.t = 0;
                if (u.hp <= 0) { u.state = 'down'; sfx.thud(); }
              }
            }
            if (u.state === 'charge' && Math.abs(u.x - p.x) < 14 && !airborne(p) && p.state !== 'fall' && p.state !== 'down') {
              p.state = 'fall'; p.vz = 3.4; p.vx = 0; p.z = 1; sfx.thud();
            }
            if (u.x < -60 || u.x > W + 60) { u.dir = -u.dir; u.sp += 0.15; }
          } else if (u.state === 'stagger') {
            u.x -= u.dir * 2.2;
            if (u.t > 20) { u.state = 'charge'; }
          }
          if (u.state === 'down' && !b.done) { b.done = true; b.msg = 'BULL DEFEATED!'; addScore(5000); sfx.win(); }
          if (b.time <= 0 && !b.done) { b.done = true; b.msg = 'TIME UP'; }
        }
      }
      // ---------- update ----------
      function update() {
        if (api.credits > lastCred) A.tone(1800, 0.06, { type: 'square', vol: 0.08, slideTo: 2400 });
        lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        T++;
        if (mode === 'attract') {
          atT++;
          if (atPage === 1) { updMatch(); if (atT > 1500 && mode === 'attract') { atPage = 2; atT = 0; demo = false; } }
          else if (atT > (atPage === 0 ? 420 : 300)) { atPage = (atPage + 1) % 3; atT = 0; if (atPage === 1) { demo = true; match = 3; startMatch(); } }
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { lastCred = api.credits; demo = false; newGame(); }
            else { coinFlash = 90; A.tone(110, 0.25, { type: 'square', vol: 0.12 }); }
          }
          return;
        }
        if (mode === 'over') { if (T > 300 || (T > 90 && api.anyPressed('Enter'))) { mode = 'attract'; atPage = 0; atT = 0; } return; }
        if (phase === 'bonus') updBonus(); else updMatch();
      }
      // ---------- rendering ----------
      function drawVenue(ctx, v) {
        const V = VENUES[v];
        ctx.fillStyle = V.sky[0]; ctx.fillRect(0, 24, W, 70);
        ctx.fillStyle = V.sky[1]; ctx.fillRect(0, 94, W, 56);
        for (let i = 0; i < 6; i++) { ctx.fillStyle = shade(V.sky[1], 0.95 + i * 0.01); ctx.fillRect(0, 70 + i * 4, W, 4); }
        switch (V.kind) {
          case 'sea':
            ctx.fillStyle = '#fff0a0'; ctx.fillRect(190, 50, 20, 20); ctx.fillRect(186, 54, 28, 12);
            ctx.fillStyle = '#2050a0'; ctx.fillRect(0, 118, W, 32);
            ctx.fillStyle = '#80b0e0'; for (let i = 0; i < 20; i++) ctx.fillRect(Math.round((i * 37 + T * 0.2) % W), 122 + (i % 4) * 7, 8, 1);
            ctx.fillStyle = '#d8c080'; ctx.fillRect(0, 144, W, 8);
            ctx.fillStyle = '#3a6a2a'; ctx.fillRect(14, 70, 4, 74); ctx.fillStyle = '#2a8a2a'; ctx.fillRect(2, 64, 28, 6); ctx.fillRect(6, 60, 20, 4);
            break;
          case 'pagoda':
            ctx.fillStyle = '#e0e0a0'; ctx.fillRect(40, 44, 16, 16);
            for (let i = 0; i < 4; i++) { const w = 70 - i * 14, y = 140 - i * 22; ctx.fillStyle = '#502010'; ctx.fillRect(170 - w / 2, y - 4, w, 5); ctx.fillStyle = '#a03020'; ctx.fillRect(170 - w / 2 + 6, y, w - 12, 18); ctx.fillStyle = '#301008'; ctx.fillRect(166, y + 6, 8, 12); }
            ctx.fillStyle = '#502010'; ctx.fillRect(168, 40, 4, 16);
            ctx.fillStyle = '#4a6a3a'; ctx.fillRect(0, 136, W, 16);
            break;
          case 'fuji':
            ctx.fillStyle = '#5a6aa0';
            for (let y = 60; y < 150; y++) { const w = (y - 60) * 1.8 + 16; ctx.fillRect(Math.round(128 - w / 2), y, Math.round(w), 1); }
            ctx.fillStyle = '#f8f8ff';
            for (let y = 60; y < 84; y++) { const w = (y - 60) * 1.8 + 16; ctx.fillRect(Math.round(128 - w / 2), y, Math.round(w), 1); if (y > 78) for (let k = 0; k < w; k += 8) ctx.fillRect(Math.round(128 - w / 2 + k), y, 4, 4); }
            ctx.fillStyle = '#3a7a2a'; ctx.fillRect(0, 140, W, 12);
            ctx.fillStyle = '#f0b0c0'; for (let i = 0; i < 10; i++) ctx.fillRect(10 + i * 25, 132 + (i % 3) * 3, 10, 8);
            break;
          case 'city':
            ctx.fillStyle = '#f0f0d0'; for (let i = 0; i < 30; i++) ctx.fillRect(Math.round(hash(i) * W), 26 + Math.round(hash(i + 50) * 40), 1, 1);
            for (let i = 0; i < 12; i++) {
              const bw = 18 + Math.round(hash(i * 3) * 16), bh = 40 + Math.round(hash(i * 7) * 60), bx = i * 22 - 4;
              ctx.fillStyle = '#181828'; ctx.fillRect(bx, 150 - bh, bw, bh);
              ctx.fillStyle = '#f0d060'; for (let y = 150 - bh + 4; y < 146; y += 7) for (let x = bx + 3; x < bx + bw - 3; x += 5) if (hash(x * 31 + y) < 0.4) ctx.fillRect(x, y, 2, 3);
            }
            break;
          case 'bridge':
            ctx.fillStyle = '#4060a0'; ctx.fillRect(0, 126, W, 26);
            ctx.fillStyle = '#c03020';
            ctx.fillRect(50, 40, 8, 100); ctx.fillRect(198, 40, 8, 100); ctx.fillRect(50, 40, 156, 5); ctx.fillRect(50, 70, 156, 3);
            for (let x = 0; x < W; x++) { const y = 46 + Math.round(Math.pow((x - 128) / 74, 2) * 30); if (y < 120) ctx.fillRect(x, y, 1, 2); }
            ctx.fillRect(0, 118, W, 6);
            for (let x = 0; x < W; x += 8) ctx.fillRect(x, 106, 2, 12);
            break;
          case 'dojo':
            ctx.fillStyle = '#7a5028'; ctx.fillRect(0, 24, W, 128);
            ctx.fillStyle = '#5a3818'; for (let x = 0; x < W; x += 32) ctx.fillRect(x, 24, 4, 128);
            ctx.fillStyle = '#e8dcc0'; ctx.fillRect(80, 40, 96, 56); ctx.fillStyle = '#5a3818'; ctx.fillRect(127, 40, 2, 56); ctx.fillRect(80, 67, 96, 2);
            ctx.fillStyle = '#101010'; text(ctx, 'KARATE', 128, 50, '#202020', 1, 'center'); text(ctx, 'DO', 128, 76, '#c01010', 1, 'center');
            ctx.fillStyle = '#3a2008'; ctx.fillRect(0, 140, W, 12);
            break;
        }
        // mat
        ctx.fillStyle = V.mat; ctx.fillRect(0, 152, W, H - 152);
        ctx.fillStyle = V.line;
        for (let i = 0; i <= 8; i++) { const x0 = i * 32, x1 = (i * 32 - 128) * 1.5 + 128; for (let y = 152; y < H; y += 2) ctx.fillRect(Math.round(x0 + (x1 - x0) * (y - 152) / (H - 152)), y, 1, 2); }
        ctx.fillRect(0, 152, W, 1); ctx.fillRect(0, 168, W, 1); ctx.fillRect(0, 196, W, 1);
      }
      function drawFighter(ctx, f) {
        const x = Math.round(f.x), y = FLOOR - Math.round(f.z);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 12, FLOOR - 1, 24, 3);
        let p;
        switch (f.state) {
          case 'att': { const M = MOVES[f.move]; p = POSE[f.t <= M.w ? M.wp : M.p]; break; }
          case 'walk': case 'block': p = f.state === 'block' ? POSE.block : POSE[(f.anim >> 3) & 1 ? 'walk0' : 'walk1']; break;
          case 'walkin': p = POSE[(f.anim >> 3) & 1 ? 'walk0' : 'walk1']; break;
          case 'stand': p = (T >> 5) & 1 ? POSE.stand2 : POSE.stand; break;
          default: p = POSE[f.state] || POSE.stand;
        }
        drawMan(ctx, x, y, f.face, p, f.pal, SC);
      }
      function drawRef(ctx) {
        const x = W / 2, y = 168;
        const fl = ref.flag;
        const pose = { lean: 0, ra: fl === 1 || fl === 3 ? [-150, -170] : [20, 10], la: fl === 2 || fl === 3 ? [-150, -170] : [20, 10], rl: [8, 0], ll: [-8, 0] };
        // referee faces the viewer-left; white flag in his left hand (screen left), red in right
        const r = drawMan(ctx, x, y, -1, pose, REF, 1.15);
        // beard
        ctx.fillStyle = '#f0f0f0'; ctx.fillRect(Math.round(r.head.x - 3), Math.round(r.head.y + 2), 6, 5);
        const flag = (h, col) => { ctx.fillStyle = '#806040'; ctx.fillRect(Math.round(h.x), Math.round(h.y - 8), 1, 10); ctx.fillStyle = col; ctx.fillRect(Math.round(h.x) + (col === '#fff' ? -8 : 1), Math.round(h.y - 8), 7, 5); };
        flag(r.front, '#e02020'); flag(r.back, '#fff');
        if (ref.sayT > 0 && ref.say) {
          const w = Math.max(ref.say.length, ref.sub.length) * 6 + 10;
          const bx = Math.round(x - w / 2), by = 90;
          ctx.fillStyle = '#fff'; ctx.fillRect(bx, by, w, ref.sub ? 22 : 13); ctx.fillRect(x - 2, by + (ref.sub ? 22 : 13), 4, 4);
          ctx.fillStyle = '#000'; ctx.fillRect(bx, by, w, 1); ctx.fillRect(bx, by + (ref.sub ? 21 : 12), w, 1); ctx.fillRect(bx, by, 1, ref.sub ? 22 : 13); ctx.fillRect(bx + w - 1, by, 1, ref.sub ? 22 : 13);
          text(ctx, ref.say, x, by + 3, ref.say === 'RED' ? '#d01010' : '#101010', 1, 'center');
          if (ref.sub) text(ctx, ref.sub, x, by + 12, '#2030a0', 1, 'center');
        }
      }
      function pointIcons(ctx, pts, x, col) {
        for (let i = 0; i < 2; i++) {
          const v = Math.max(0, Math.min(1, pts - i));
          ctx.fillStyle = '#404040'; ctx.fillRect(x + i * 12, 18, 10, 10);
          ctx.fillStyle = col;
          if (v >= 1) ctx.fillRect(x + i * 12, 18, 10, 10);
          else if (v >= 0.5) ctx.fillRect(x + i * 12, 18, 5, 10);
          ctx.fillStyle = '#000'; ctx.fillRect(x + i * 12, 18, 1, 1); ctx.fillRect(x + i * 12 + 9, 18, 1, 1); ctx.fillRect(x + i * 12, 27, 1, 1); ctx.fillRect(x + i * 12 + 9, 27, 1, 1);
        }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 30);
        text(ctx, 'WHITE', 6, 2, '#fff'); text(ctx, String(score).padStart(6, '0'), 42, 2, '#fff');
        text(ctx, 'HI ' + String(hi).padStart(6, '0'), W / 2, 2, '#ffd040', 1, 'center');
        text(ctx, 'RED', W - 6, 2, '#ff3030', 1, 'right');
        if (F.length) { pointIcons(ctx, F[0].pts, 6, '#fff'); pointIcons(ctx, F[1].pts, W - 28, '#ff3030'); }
        if (phase !== 'bonus') {
          ctx.fillStyle = '#202020'; ctx.fillRect(W / 2 - 13, 12, 26, 16);
          text(ctx, String(clock).padStart(2, '0'), W / 2, 15, clock <= 10 && (T >> 3) & 1 ? '#ff3030' : '#fff', 1, 'center');
          text(ctx, demo ? 'DEMO' : RANKS[Math.min(RANKS.length - 1, match)], 34, 20, '#a0a0a0');
          text(ctx, VENUES[venue].name, W - 34, 20, '#a0a0a0', 1, 'right');
        }
      }
      function drawBonus(ctx) {
        const b = bonus, p = b.p;
        drawVenue(ctx, (match + 2) % VENUES.length);
        const title = b.kind === 'boards' ? 'BREAK THE BOARDS!' : b.kind === 'vases' ? 'BREAK THE FLYING VASES!' : 'FIGHT THE BULL!';
        textS(ctx, 'BONUS STAGE', W / 2, 36, '#ffe040', 2, 'center');
        textS(ctx, title, W / 2, 56, '#fff', 1, 'center');
        if (b.kind === 'boards') {
          // cinder blocks + boards
          const bx = 130, n = b.boards;
          ctx.fillStyle = '#909090'; ctx.fillRect(bx, FLOOR - 20, 12, 20); ctx.fillRect(bx + 44, FLOOR - 20, 12, 20);
          for (let i = 0; i < n; i++) {
            const y = FLOOR - 22 - i * 4;
            const brk = b.broken > 0 && i >= n - b.broken;
            ctx.fillStyle = (i % 2) ? '#d8b070' : '#c8a060';
            if (!brk) ctx.fillRect(bx - 2, y, 60, 3);
            else { ctx.fillRect(bx - 4 - (b.ct - 10) * 0.6, y + (b.ct - 10) * 0.8, 28, 3); ctx.fillRect(bx + 34 + (b.ct - 10) * 0.6, y + (b.ct - 10) * 0.8, 28, 3); }
          }
          // power meter
          ctx.fillStyle = '#202020'; ctx.fillRect(20, 76, 12, 102);
          const pv = b.broken < 0 ? b.power : b.hitPow;
          for (let i = 0; i < 50; i++) { if (i / 50 > pv) break; ctx.fillStyle = i > 45 ? '#ff2020' : i > 30 ? '#ffe040' : '#40e040'; ctx.fillRect(22, 176 - i * 2, 8, 1); }
          text(ctx, 'POWER', 6, 182, '#fff');
          if (b.t > 90 && b.broken < 0 && (T >> 4) & 1) textS(ctx, 'PRESS SPACE AT FULL POWER', W / 2, 72, '#ffe040', 1, 'center');
          p.x = 112;
          drawMan(ctx, 104, FLOOR, 1, POSE[b.broken < 0 ? 'ready' : p.state] || POSE.ready, p.pal, SC);
        } else if (b.kind === 'vases') {
          drawFighter(ctx, p);
          for (const o of b.objs) {
            const y = o.lv === 'h' ? FLOOR - 66 : o.lv === 'm' ? FLOOR - 44 : FLOOR - 12, x = Math.round(o.x);
            const cols = ['#4070e0', '#e0e0e0', '#c08040'];
            if (o.broken) { ctx.fillStyle = cols[o.kind]; for (let k = 0; k < 6; k++) ctx.fillRect(x + (k - 3) * o.broken * 0.8, y + Math.abs(k - 3) * o.broken * 0.5 + o.broken * 0.4, 3, 3); continue; }
            if (o.kind === 0) { ctx.fillStyle = cols[0]; ctx.fillRect(x - 5, y - 5, 10, 10); ctx.fillRect(x - 3, y - 8, 6, 3); ctx.fillStyle = '#fff'; ctx.fillRect(x - 5, y - 1, 10, 2); }
            else if (o.kind === 1) { ctx.fillStyle = '#c04020'; ctx.fillRect(x - 5, y - 2, 10, 8); ctx.fillStyle = '#30a030'; ctx.fillRect(x - 6, y - 8, 12, 6); ctx.fillStyle = '#ff4060'; ctx.fillRect(x - 1, y - 9, 3, 3); }
            else { ctx.fillStyle = cols[2]; ctx.fillRect(x - 7, y - 4, 14, 8); ctx.fillStyle = '#a06030'; ctx.fillRect(x - 7, y - 1, 14, 1); }
          }
          text(ctx, 'BROKEN ' + b.got, 8, 76, '#fff');
        } else {
          drawFighter(ctx, p);
          const u = b.bull, x = Math.round(u.x), f = u.dir, y = FLOOR;
          if (u.state === 'down') { ctx.fillStyle = '#3a2010'; ctx.fillRect(x - 24, y - 14, 48, 14); ctx.fillStyle = '#e8e0c0'; ctx.fillRect(x + f * 24 - 2, y - 18, 4, 6); }
          else {
            const leg = (T >> 2) & 1;
            ctx.fillStyle = '#3a2010'; ctx.fillRect(x - 22, y - 34, 40, 20);
            ctx.fillRect(x - 20 + (leg ? 2 : 0), y - 14, 5, 14); ctx.fillRect(x - 10 - (leg ? 2 : 0), y - 14, 5, 14); ctx.fillRect(x + 4 + (leg ? 2 : 0), y - 14, 5, 14); ctx.fillRect(x + 12 - (leg ? 2 : 0), y - 14, 5, 14);
            ctx.fillStyle = '#2a1408'; ctx.fillRect(x + f * 18 - 7, y - 36, 14, 14);
            ctx.fillStyle = '#e8e0c0'; ctx.fillRect(x + f * 18 - 9, y - 40, 3, 6); ctx.fillRect(x + f * 18 + 6, y - 40, 3, 6); ctx.fillRect(x + f * 18 - 9, y - 40, 18, 2);
            ctx.fillStyle = '#ff2020'; ctx.fillRect(x + f * 18 + f * 3 - 1, y - 32, 2, 2);
            ctx.fillStyle = '#2a1408'; ctx.fillRect(x - f * 22 - 1, y - 32, 2, 12);
            if (u.state === 'stagger') { ctx.fillStyle = '#fff'; ctx.fillRect(x - 2, y - 50, 4, 4); }
          }
          text(ctx, 'BULL', 8, 76, '#fff'); for (let i = 0; i < 3; i++) { ctx.fillStyle = i < u.hp ? '#ff3030' : '#404040'; ctx.fillRect(36 + i * 8, 76, 6, 6); }
        }
        if (b.kind !== 'boards') text(ctx, 'TIME ' + Math.max(0, Math.ceil(b.time / 60)), W - 8, 76, '#fff', 1, 'right');
        if (b.done) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 98, W, 26); textS(ctx, b.msg, W / 2, 104, '#ffe040', 2, 'center'); }
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'attract' && atPage !== 1) { renderAttract(ctx); return; }
        if (phase === 'bonus' && mode !== 'attract') { drawBonus(ctx); drawHUD(ctx); return; }
        drawVenue(ctx, venue);
        drawRef(ctx);
        if (F.length) { const o = F.slice().sort((a, b) => (a.state === 'att') - (b.state === 'att')); for (const f of o) drawFighter(ctx, f); }
        if (phase === 'point' && lastPoint && phaseT > 34) textS(ctx, lastPoint.name, W / 2, 60, '#fff', 1, 'center');
        if (phase === 'intro' && phaseT > 20) { textS(ctx, demo ? 'DEMONSTRATION' : 'MATCH ' + (match + 1), W / 2, 50, '#ffe040', 2, 'center'); if (!demo) textS(ctx, 'VS ' + RANKS[Math.min(RANKS.length - 1, match + 1)], W / 2, 70, '#fff', 1, 'center'); }
        drawHUD(ctx);
        if (mode === 'attract') {
          textS(ctx, 'KARATE CHAMP', W / 2, 42, '#ff3030', 2, 'center');
          blinkStart(ctx, 204);
        }
        if (mode === 'over') { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 96, W, 34); textS(ctx, 'GAME OVER', W / 2, 106, '#ff3030', 2, 'center'); }
      }
      function blinkStart(ctx, y) {
        const blink = (T >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) textS(ctx, 'INSERT COIN', W / 2, y, '#fff', 1, 'center'); }
        else if (api.credits > 0) { if (blink) textS(ctx, 'PUSH START', W / 2, y, '#ffe040', 1, 'center'); }
        else if (blink) textS(ctx, 'INSERT COIN', W / 2, y, '#fff', 1, 'center');
        text(ctx, credStr(), W - 4, H - 9, '#aaa', 1, 'right');
      }
      function renderAttract(ctx) {
        ctx.fillStyle = '#f4f0e8'; ctx.fillRect(0, 0, W, H);
        if (atPage === 0) {
          // big red sun and title
          ctx.fillStyle = '#e02020';
          for (let y = -30; y <= 30; y++) { const w = Math.round(Math.sqrt(900 - y * y)); ctx.fillRect(W / 2 - w, 70 + y, w * 2, 1); }
          textS(ctx, 'KARATE', W / 2, 26, '#101010', 3, 'center');
          textS(ctx, 'CHAMP', W / 2, 106, '#101010', 3, 'center');
          const fr = (atT >> 5) % 4;
          drawMan(ctx, 86, 190, 1, [POSE.stand, POSE.side, POSE.stand, POSE.lunge][fr], GI_W, SC);
          drawMan(ctx, 170, 190, -1, [POSE.stand2, POSE.block, POSE.stand2, POSE.hit][fr], GI_R, SC);
          text(ctx, '\u00a9 1984 DATA EAST', W / 2, 212, '#606060', 1, 'center');
          blinkStart(ctx, 140);
          text(ctx, 'HI ' + hi, 4, H - 9, '#606060');
        } else {
          ctx.fillStyle = '#101018'; ctx.fillRect(0, 0, W, H);
          textS(ctx, 'HOW TO FIGHT', W / 2, 10, '#ffe040', 2, 'center');
          const rows = [['SPACE', 'LUNGE PUNCH', '1/2'], ['UP+SPACE', 'HIGH PUNCH', '1/2'], ['DOWN+SPACE', 'LOW PUNCH', '1/2'], ['FWD+SPACE', 'REVERSE PUNCH', '1'], ['BACK+SPACE', 'BACK FIST', '1/2'],
          ['X', 'FRONT KICK', '1'], ['FWD+X', 'SIDE KICK', '1'], ['BACK+X', 'ROUNDHOUSE', '1'], ['UP+X', 'JUMP SIDE KICK', '1'], ['DOWN+X', 'FOOT SWEEP', '1/2'], ['DN+BACK+X', 'BACK SWEEP', '1']];
          rows.forEach((r, i) => { text(ctx, r[0], 8, 34 + i * 12, '#80c0ff'); text(ctx, r[1], 76, 34 + i * 12, '#fff'); text(ctx, r[2], W - 8, 34 + i * 12, '#ffe040', 1, 'right'); });
          text(ctx, 'HIT AT FULL REACH FOR A FULL POINT', W / 2, 172, '#a0a0a0', 1, 'center');
          text(ctx, 'TWO POINTS WIN THE MATCH', W / 2, 182, '#a0a0a0', 1, 'center');
          blinkStart(ctx, 200);
          text(ctx, 'HI ' + hi, 4, H - 9, '#606060');
        }
      }
      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
