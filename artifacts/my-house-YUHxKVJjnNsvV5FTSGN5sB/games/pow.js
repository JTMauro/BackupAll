// P.O.W.: Prisoners of War (SNK, 1988) \u2014 built-in recreation for the MAME32 Game Room. Bust out of the prison camp bare-handed: punch, kick and jump-kick through enemy soldiers, grab knives, rifles and grenades, and beat each stage's boss.
(function () {
  'use strict';
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
    '=': '00001F001F0000', '+': '0004041F040400', 'x': '00110A040A1100', '>': '08040201020408',
    '<': '02040810080402', '#': '0A1F0A0A1F0A00', '*': '00150E1F0E1500', '%': '19190204081313'
  };
  const FONT = {};
  for (const k in FONT_HEX) { const s = FONT_HEX[k]; const a = []; for (let i = 0; i < 7; i++) a.push(parseInt(s.substr(i * 2, 2), 16) || 0); FONT[k] = a; }
  // text(ctx, str, x, y, colour, {scale, center, right, shadow})
  function text(ctx, s, x, y, col, o) {
    o = o || {}; const sc = o.scale || 1, adv = (o.adv || 8) * sc; s = String(s);
    if (s.toUpperCase) s = s.replace(/[a-wyz]/g, c => c.toUpperCase());
    const w = s.length * adv - (adv - 5 * sc);
    if (o.center) x = Math.round(x - w / 2); else if (o.right) x = Math.round(x - w);
    if (o.shadow) { const sh = o.shadow; o.shadow = null; text(ctx, s, x + sc, y + sc, sh, { scale: sc, adv: o.adv }); }
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) { const b = g[r]; if (!b) continue; for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + i * adv + c * sc, y + r * sc, sc, sc); }
    }
  }
  function mkRng(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[(Math.random() * a.length) | 0];
  const TAU = Math.PI * 2;
  // build a sprite canvas from rows of chars + palette {char: colour}; flip mirrors horizontally
  function spr(rows, pal, flip) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(flip ? w - 1 - i : i, y, 1, 1); } } });
    return c;
  }
  // rotate a char-grid (nearest neighbour) so the art (drawn facing UP) faces angle a (radians, 0 = right)
  function rotRows(rows, a) {
    const h = rows.length, w = Math.max.apply(null, rows.map(r => r.length));
    const N = Math.ceil(Math.sqrt(w * w + h * h)) | 1;
    const r = a + Math.PI / 2, cs = Math.cos(r), sn = Math.sin(r);
    const out = [];
    for (let y = 0; y < N; y++) {
      let line = '';
      for (let x = 0; x < N; x++) {
        const dx = x - (N - 1) / 2, dy = y - (N - 1) / 2;
        const sx = Math.round(dx * cs + dy * sn + (w - 1) / 2), sy = Math.round(-dx * sn + dy * cs + (h - 1) / 2);
        line += (sy >= 0 && sy < h && sx >= 0 && sx < w) ? (rows[sy][sx] || '.') : '.';
      }
      out.push(line);
    }
    return out;
  }
  // n rotations of an UP-facing sprite: index 0 faces right, increasing clockwise
  function rotSet(rows, pal, n) { const a = []; for (let i = 0; i < n; i++) a.push(spr(rotRows(rows, i / n * TAU), pal)); return a; }
  function angIdx(a, n) { return ((Math.round(a / TAU * n) % n) + n) % n; }
  function drawC(ctx, im, x, y) { ctx.drawImage(im, Math.round(x - im.width / 2), Math.round(y - im.height / 2)); }
  const DIR8 = [[1, 0], [0.7071, 0.7071], [0, 1], [-0.7071, 0.7071], [-1, 0], [-0.7071, -0.7071], [0, -1], [0.7071, -0.7071]];
  function dir8Of(dx, dy) { return angIdx(Math.atan2(dy, dx), 8); }
  function boxHit(a, b) { return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2; }
  function coinOp(api) {
    // shared attract helper: returns true if a credit was used
    return api.useCredit();
  }
  function pad2(n) { return String(Math.min(99, n)).padStart(2, '0'); }
  const W = 256, H = 224;
  const GY0 = 146, GY1 = 206;           // walkable depth band (feet y)

  ArcadeRegistry.register({
    id: 'pow', title: 'P.O.W.: Prisoners of War', year: 1988, maker: 'SNK',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: walk (Up/Down: depth) \u00b7 Space: punch / use weapon \u00b7 X: kick \u00b7 Space+X or Z: jump (X in the air: jump kick) \u00b7 Enter: start',
    marquee: { bg: '#1a1a08', fg: '#f0e0a0', accent: '#e03020' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(40000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, g = null;

      const sfx = {
        swing() { au.noise(0.05, { vol: 0.06, freq: 2000, type: 'bandpass' }); },
        hit() { au.noise(0.08, { vol: 0.18, freq: 700, slideTo: 200 }); au.tone(140, 0.06, { type: 'square', vol: 0.08, slideTo: 70 }); },
        bighit() { au.noise(0.16, { vol: 0.24, freq: 500, slideTo: 80 }); au.tone(100, 0.12, { type: 'square', vol: 0.1, slideTo: 40 }); },
        slash() { au.tone(2400, 0.06, { type: 'sawtooth', vol: 0.05, slideTo: 800 }); },
        gun() { au.noise(0.05, { vol: 0.14, freq: 2600, type: 'highpass' }); au.tone(500, 0.04, { type: 'square', vol: 0.05, slideTo: 200 }); },
        egun() { au.noise(0.05, { vol: 0.1, freq: 1800, type: 'highpass' }); },
        boom() { au.noise(0.5, { vol: 0.24, freq: 900, slideTo: 60 }); },
        jump() { au.tone(300, 0.1, { type: 'triangle', vol: 0.07, slideTo: 600 }); },
        land() { au.noise(0.04, { vol: 0.08, freq: 400 }); },
        bark() { au.tone(500, 0.06, { type: 'sawtooth', vol: 0.08, slideTo: 300 }); au.tone(450, 0.08, { type: 'sawtooth', vol: 0.08, slideTo: 250, delay: 0.1 }); },
        pick() { au.melody([[784, .05], [1047, .05], [1319, .1]], { type: 'square', vol: 0.1 }); },
        hurt() { au.tone(220, 0.12, { type: 'square', vol: 0.1, slideTo: 110 }); },
        die() { au.melody([[392, .15], [330, .15], [262, .15], [196, .4]], { type: 'square', vol: 0.12 }); },
        go() { au.melody([[880, .08], [1175, .12]], { type: 'square', vol: 0.09 }); },
        oneup() { au.melody([[1047, .06], [1319, .06], [1568, .06], [2093, .14]], { type: 'square', vol: 0.1 }); },
        start() { au.melody([[262, .12], [262, .06], [330, .12], [392, .12], [392, .06], [523, .24], [494, .12], [440, .12], [392, .4]], { type: 'square', vol: 0.11 }); },
        boss() { au.melody([[147, .2], [156, .2], [147, .2], [156, .2], [139, .5]], { type: 'sawtooth', vol: 0.09 }); },
        clear() { au.melody([[523, .1], [659, .1], [784, .1], [1047, .25], [988, .1], [1047, .45]], { type: 'square', vol: 0.12 }); }
      };

      // ================= Puppet renderer =================
      const D2R = Math.PI / 180;
      const POSES = {
        idle: { lean: 0, fu: 30, ff: 130, bu: 15, bf: 115, ft: 12, fs: 2, bt: -10, bs: -6 },
        walk0: { lean: 4, fu: 40, ff: 120, bu: -5, bf: 90, ft: 28, fs: 8, bt: -22, bs: -30 },
        walk1: { lean: 4, fu: 10, ff: 110, bu: 25, bf: 120, ft: -20, fs: -28, bt: 26, bs: 6 },
        punch: { lean: 10, fu: 90, ff: 90, bu: 20, bf: 125, ft: 18, fs: 4, bt: -18, bs: -10 },
        punch2: { lean: 6, fu: 25, ff: 130, bu: 90, bf: 90, ft: 14, fs: 2, bt: -16, bs: -8 },
        upper: { lean: -6, fu: 160, ff: 172, bu: 10, bf: 100, ft: 10, fs: 0, bt: -14, bs: -8 },
        kick: { lean: -18, fu: 25, ff: 110, bu: -30, bf: 50, ft: 92, fs: 92, bt: -8, bs: -4 },
        jump: { lean: 6, fu: 60, ff: 150, bu: -20, bf: 60, ft: 75, fs: -35, bt: 35, bs: -60 },
        jkick: { lean: -12, fu: 30, ff: 120, bu: -40, bf: 40, ft: 62, fs: 62, bt: -10, bs: -70 },
        hurt: { lean: -22, fu: -30, ff: 10, bu: -45, bf: -15, ft: 12, fs: 6, bt: -16, bs: -12 },
        gun: { lean: 2, fu: 88, ff: 90, bu: 75, bf: 92, ft: 16, fs: 2, bt: -14, bs: -8 },
        throw: { lean: 8, fu: 150, ff: 150, bu: 0, bf: 90, ft: 22, fs: 4, bt: -20, bs: -10 },
        slash: { lean: 12, fu: 100, ff: 60, bu: 20, bf: 120, ft: 20, fs: 4, bt: -20, bs: -12 },
        wind: { lean: -6, fu: -10, ff: 60, bu: 10, bf: 120, ft: 12, fs: 2, bt: -12, bs: -8 }
      };
      function seg(ctx, x1, y1, x2, y2, t, col) {
        ctx.fillStyle = col;
        const n = Math.max(1, Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))));
        for (let i = 0; i <= n; i++) { const x = x1 + (x2 - x1) * i / n, y = y1 + (y2 - y1) * i / n; ctx.fillRect(Math.round(x - t / 2), Math.round(y - t / 2), t, t); }
      }
      function shade(c) { // darker variant for far-side limbs
        const n = parseInt(c.slice(1), 16); const r = (n >> 16) * 0.72, g2 = ((n >> 8) & 255) * 0.72, b = (n & 255) * 0.72;
        return '#' + ((1 << 24) + ((r | 0) << 16) + ((g2 | 0) << 8) + (b | 0)).toString(16).slice(1);
      }
      const shadeCache = {};
      const sh = c => shadeCache[c] || (shadeCache[c] = shade(c));
      // f: {x, y (feet, screen), z (height), face, pose, pal, s (scale), flash}
      function drawPuppet(ctx, f) {
        const P = POSES[f.pose] || POSES.idle, s = f.s || 1, fc = f.face, pal = f.pal;
        const bx = f.x, by = f.y - (f.z || 0);
        if (f.pose === 'down') {
          // lying on the ground
          const x = Math.round(bx), y = Math.round(f.y);
          seg(ctx, x - 12 * s * fc, y - 3, x + 2 * s * fc, y - 3, 6 * s, pal.shirt);
          seg(ctx, x + 2 * s * fc, y - 2, x + 14 * s * fc, y - 2, 4 * s, pal.pants);
          ctx.fillStyle = pal.skin; ctx.fillRect(Math.round(x - 17 * s * fc - 3 * s), y - Math.round(6 * s), Math.round(6 * s), Math.round(6 * s));
          if (pal.hat) { ctx.fillStyle = pal.hat; ctx.fillRect(Math.round(x - 17 * s * fc - 3 * s), y - Math.round(7 * s), Math.round(6 * s), Math.round(2 * s)); }
          ctx.fillStyle = pal.boot; ctx.fillRect(Math.round(x + 14 * s * fc - 2 * s), y - Math.round(4 * s), Math.round(4 * s), Math.round(4 * s));
          return;
        }
        const T = 3 * s, LL = 8 * s;
        const hipX = bx, hipY = by - 16 * s;
        const lean = P.lean * D2R;
        const shX = hipX + Math.sin(lean) * 12 * s * fc, shY = hipY - Math.cos(lean) * 12 * s;
        const limb = (ox, oy, a1, a2, L) => { const x1 = ox + Math.sin(a1 * D2R) * L * fc, y1 = oy + Math.cos(a1 * D2R) * L; return [x1, y1, x1 + Math.sin(a2 * D2R) * L * fc, y1 + Math.cos(a2 * D2R) * L]; };
        const fl = f.flash ? '#ffffff' : null;
        // back leg & arm
        let k = limb(hipX, hipY, P.bt, P.bs, LL);
        seg(ctx, hipX, hipY, k[0], k[1], T + 1, fl || sh(pal.pants)); seg(ctx, k[0], k[1], k[2], k[3], T, fl || sh(pal.pants));
        ctx.fillStyle = fl || pal.boot; ctx.fillRect(Math.round(k[2] - 2 * s), Math.round(k[3] - 1), Math.round(5 * s), Math.round(2 * s + 1));
        k = limb(shX, shY + 1, P.bu, P.bf, 6.5 * s);
        seg(ctx, shX, shY + 1, k[0], k[1], T, fl || sh(pal.arm || pal.skin)); seg(ctx, k[0], k[1], k[2], k[3], T, fl || sh(pal.skin));
        // torso
        seg(ctx, hipX, hipY - 1, shX, shY + 2, 7 * s, fl || pal.shirt);
        ctx.fillStyle = fl || pal.belt || '#302010'; ctx.fillRect(Math.round(hipX - 3.5 * s), Math.round(hipY - 1), Math.round(7 * s), Math.round(2 * s));
        // front leg
        k = limb(hipX, hipY, P.ft, P.fs, LL);
        seg(ctx, hipX, hipY, k[0], k[1], T + 1, fl || pal.pants); seg(ctx, k[0], k[1], k[2], k[3], T, fl || pal.pants);
        ctx.fillStyle = fl || pal.boot; ctx.fillRect(Math.round(k[2] - (fc > 0 ? 1 : 3) * s), Math.round(k[3] - 1), Math.round(5 * s), Math.round(2 * s + 1));
        // head
        const hx = shX + fc * 1 * s, hy = shY - 5 * s;
        const hs = Math.round(6 * s);
        ctx.fillStyle = fl || pal.skin; ctx.fillRect(Math.round(hx - hs / 2), Math.round(hy - hs / 2), hs, hs);
        ctx.fillStyle = fl || pal.hair; ctx.fillRect(Math.round(hx - hs / 2), Math.round(hy - hs / 2), hs, Math.round(2 * s)); ctx.fillRect(Math.round(hx - hs / 2 - (fc > 0 ? 0 : -hs + 2 * s)), Math.round(hy - hs / 2), Math.round(2 * s), Math.round(4 * s));
        if (pal.hat) { ctx.fillStyle = fl || pal.hat; ctx.fillRect(Math.round(hx - hs / 2 - s), Math.round(hy - hs / 2 - s), hs + Math.round(2 * s), Math.round(3 * s)); }
        if (pal.band) { ctx.fillStyle = fl || pal.band; ctx.fillRect(Math.round(hx - hs / 2), Math.round(hy - hs / 2 + 2 * s), hs, Math.max(1, Math.round(s))); ctx.fillRect(Math.round(hx - fc * hs / 2 - fc * 2), Math.round(hy - hs / 2 + 2 * s + (frame >> 3 & 1)), 2, 3); }
        ctx.fillStyle = '#100808'; ctx.fillRect(Math.round(hx + fc * 1.5 * s), Math.round(hy - 0.5 * s), 1, Math.max(1, Math.round(s)));
        // front arm
        k = limb(shX, shY + 1, P.fu, P.ff, 6.5 * s);
        seg(ctx, shX, shY + 1, k[0], k[1], T, fl || pal.arm || pal.skin); seg(ctx, k[0], k[1], k[2], k[3], T, fl || pal.skin);
        ctx.fillStyle = fl || pal.skin; ctx.fillRect(Math.round(k[2] - 1.5 * s), Math.round(k[3] - 1.5 * s), Math.round(3 * s + 1), Math.round(3 * s + 1));
        return { hx: k[2], hy: k[3] };
      }
      function drawDog(ctx, d, sx, sy) {
        const x = Math.round(sx), y = Math.round(sy - (d.z || 0)), fc = d.face, run = (d.t >> 2) & 1;
        const c = d.flash ? '#fff' : '#3a2a1a', c2 = d.flash ? '#fff' : '#8a5a2a';
        ctx.fillStyle = c; ctx.fillRect(x - 9, y - 11, 18, 6);
        ctx.fillStyle = c2; ctx.fillRect(x - 6, y - 7, 10, 2);
        ctx.fillStyle = c; ctx.fillRect(x + fc * 8 - 3, y - 15, 7, 5); ctx.fillRect(x + fc * 12 - 2, y - 13, 4, 3);
        ctx.fillRect(x + fc * 7 - 1, y - 17, 2, 3);
        ctx.fillRect(x - fc * 10 - 1, y - 13 + run, 3, 2);
        const lg = run ? 2 : -2;
        ctx.fillRect(x - 7 + lg, y - 5, 2, 5); ctx.fillRect(x - 4 - lg, y - 5, 2, 5); ctx.fillRect(x + 4 + lg, y - 5, 2, 5); ctx.fillRect(x + 7 - lg, y - 5, 2, 5);
        if (d.st === 'lunge') { ctx.fillStyle = '#fff'; ctx.fillRect(x + fc * 13 - 1, y - 12, 2, 1); }
      }

      // ================= Data =================
      const PAL = {
        snake: { skin: '#e8a878', shirt: '#e8e0c8', arm: '#e8a878', pants: '#4a6a30', boot: '#3a2a18', hair: '#2a1a10', band: '#e02020', belt: '#5a3a18' },
        soldier: { skin: '#e0a070', shirt: '#4a7a3a', pants: '#3a6a2c', boot: '#202020', hair: '#201810', hat: '#3a5a2a', belt: '#202010' },
        knife: { skin: '#e0a070', shirt: '#6a5a3a', pants: '#4a4030', boot: '#202020', hair: '#201810', hat: '#c02020', belt: '#202010' },
        gunner: { skin: '#e0a070', shirt: '#b09868', pants: '#8a7850', boot: '#302010', hair: '#201810', hat: '#6a6040', belt: '#302010' },
        kicker: { skin: '#e0a070', shirt: '#303860', arm: '#e0a070', pants: '#2a3050', boot: '#202020', hair: '#101010', band: '#ffffff', belt: '#e0e0e0' },
        grenadier: { skin: '#e0a070', shirt: '#5a6a7a', pants: '#4a5868', boot: '#202020', hair: '#201810', hat: '#4a5868', belt: '#202010' },
        brute: { skin: '#d89060', shirt: '#d89060', arm: '#d89060', pants: '#5a4a3a', boot: '#202020', hair: '#101010', belt: '#a07030' },
        ninja: { skin: '#e0a070', shirt: '#202028', arm: '#202028', pants: '#202028', boot: '#101010', hair: '#202028', band: '#c02020', belt: '#c02020' },
        general: { skin: '#e0a070', shirt: '#6a6a4a', pants: '#4a4a30', boot: '#101010', hair: '#a0a0a0', hat: '#5a5a3a', belt: '#e0c040' }
      };
      const KIND = {
        soldier: { hp: 4, spd: 0.7, pts: 300, reach: 22, dmg: 2 },
        knife: { hp: 4, spd: 0.8, pts: 400, reach: 26, dmg: 3 },
        gunner: { hp: 3, spd: 0.6, pts: 500, reach: 0, dmg: 3 },
        kicker: { hp: 5, spd: 0.9, pts: 600, reach: 30, dmg: 3 },
        grenadier: { hp: 3, spd: 0.6, pts: 500, reach: 0, dmg: 4 },
        dog: { hp: 2, spd: 2.0, pts: 200, reach: 16, dmg: 2 },
        brute: { hp: 50, spd: 0.75, pts: 10000, reach: 32, dmg: 4, boss: 1, s: 1.35 },
        ninja: { hp: 44, spd: 1.2, pts: 15000, reach: 30, dmg: 3, boss: 1, s: 1.1 },
        general: { hp: 56, spd: 0.7, pts: 20000, reach: 26, dmg: 4, boss: 1, s: 1.2 }
      };
      const STAGES = [
        { name: 'PRISON CAMP', len: 1500, sky: '#5a7aa8', far: '#3a5a3a', ground: '#8a7a50', ground2: '#7a6a42', deco: 'camp', boss: 'brute',
          waves: [['soldier', 'soldier', 'soldier'], ['soldier', 'knife', 'soldier', 'dog'], ['gunner', 'soldier', 'soldier', 'knife'], ['dog', 'dog', 'soldier', 'kicker'], ['soldier', 'gunner', 'knife', 'soldier', 'soldier']] },
        { name: 'JUNGLE', len: 1700, sky: '#4a8a6a', far: '#1e4a24', ground: '#5a6a30', ground2: '#4a5a28', deco: 'jungle', boss: 'ninja',
          waves: [['soldier', 'dog', 'dog', 'soldier'], ['kicker', 'soldier', 'knife'], ['grenadier', 'soldier', 'soldier', 'gunner'], ['knife', 'knife', 'kicker', 'dog'], ['grenadier', 'gunner', 'soldier', 'kicker', 'soldier']] },
        { name: 'ENEMY BASE', len: 1800, sky: '#6a6a78', far: '#4a4a52', ground: '#6a6a6a', ground2: '#5a5a5a', deco: 'base', boss: 'brute',
          waves: [['gunner', 'gunner', 'soldier'], ['kicker', 'kicker', 'knife', 'soldier'], ['grenadier', 'grenadier', 'dog', 'dog'], ['soldier', 'knife', 'gunner', 'kicker', 'soldier'], ['kicker', 'grenadier', 'gunner', 'knife', 'dog', 'soldier']] },
        { name: 'HEADQUARTERS', len: 1900, sky: '#2a2a48', far: '#3a3a40', ground: '#7a7068', ground2: '#6a6058', deco: 'hq', boss: 'general',
          waves: [['soldier', 'kicker', 'gunner', 'knife'], ['dog', 'dog', 'dog', 'kicker'], ['grenadier', 'gunner', 'gunner', 'knife', 'soldier'], ['kicker', 'kicker', 'knife', 'knife', 'soldier'], ['grenadier', 'gunner', 'kicker', 'knife', 'soldier', 'dog']] }
      ];

      // ================= Game =================
      function newGame() {
        g = { score: 0, lives: 3, stage: 0, loop: 0, nextExtra: 30000 };
        startStage(); sfx.start();
      }
      function startStage() {
        const st = STAGES[g.stage % 4];
        g.st = st; g.cam = 0; g.lock = null; g.wave = 0; g.queue = [];
        g.en = []; g.items = []; g.shots = []; g.nades = []; g.fx = []; g.pops = []; g.props = [];
        const r = mkRng(g.stage * 31 + 5);
        for (let x = 200; x < st.len - 100; x += 180 + r() * 160) g.props.push({ k: r() < 0.5 ? 'drum' : 'crate', x, y: GY0 + 6 + r() * 40, hp: 2 });
        g.waveX = []; for (let i = 0; i < st.waves.length; i++) g.waveX.push(120 + i * (st.len - 300) / st.waves.length);
        g.phase = 'ready'; g.phaseT = 120; g.go = 0;
        g.p = newPlayer(); g.bossSpawned = false;
      }
      function newPlayer() {
        return { x: 50 + g.cam, y: 180, z: 0, vz: 0, face: 1, hp: 16, armor: 0, act: null, actT: 0, combo: 0, comboT: 0, hurtT: 0, downT: 0, inv: 90, weapon: null, ammo: 0, walkT: 0, dead: 0, air: false, jumpT: 0, hitList: null };
      }
      function diff() { return g.stage + g.loop * 2; }
      function addScore(n) {
        g.score += n;
        if (g.score >= g.nextExtra) { g.lives++; g.nextExtra += 50000; sfx.oneup(); }
        if (g.score > hi) hi = g.score;
      }
      function pop(x, y, t, c) { g.pops.push({ x, y, t: 50, txt: t, col: c || '#fff' }); }

      function spawnEnemy(k, fromLeft) {
        const d = diff(), K = KIND[k];
        const x = fromLeft ? g.cam - 20 : g.cam + W + 20;
        const e = { k, x, y: GY0 + 4 + Math.random() * (GY1 - GY0 - 8), z: 0, vz: 0, face: fromLeft ? 1 : -1, hp: K.hp + (K.boss ? d * 6 : Math.floor(d / 2)), t: 0,
          st: 'walk', stT: 0, atkCd: 60 + Math.random() * 60, flash: 0, s: K.s || 1, vx: 0, combo: 0 };
        e.max = e.hp;
        if (K.boss) { e.x = g.cam + W + 30; e.y = (GY0 + GY1) / 2; e.face = -1; }
        g.en.push(e); return e;
      }

      // ---- player actions ----
      const ACT = {
        punch: { len: 14, hitF: [3, 7], reach: 22, dmg: 1, pose: 'punch' },
        punch2: { len: 14, hitF: [3, 7], reach: 22, dmg: 1, pose: 'punch2' },
        upper: { len: 20, hitF: [4, 9], reach: 22, dmg: 2, pose: 'upper', knock: 1 },
        kick: { len: 22, hitF: [5, 11], reach: 30, dmg: 2, pose: 'kick', knock: 1 },
        slash: { len: 16, hitF: [3, 8], reach: 30, dmg: 2, pose: 'slash' },
        jkick: { len: 99, hitF: [0, 99], reach: 26, dmg: 3, pose: 'jkick', knock: 1, air: 1 },
        jpunch: { len: 99, hitF: [0, 99], reach: 20, dmg: 2, pose: 'punch', air: 1 },
        shoot: { len: 10, hitF: [-1, -1], pose: 'gun' },
        throw: { len: 18, hitF: [-1, -1], pose: 'throw' }
      };
      function startAct(name) {
        const p = g.p;
        p.act = name; p.actT = 0; p.hitList = new Set();
        if (name === 'shoot') {
          p.ammo--; sfx.gun();
          g.shots.push({ x: p.x + p.face * 18, y: p.y, h: 22, vx: p.face * 5, own: true, life: 60 });
          if (p.ammo <= 0) p.weapon = null;
        } else if (name === 'throw') {
          p.ammo--; sfx.jump();
          g.nades.push({ x: p.x + p.face * 6, y: p.y, z: 30, vx: p.face * 2.4, vz: 2.2, own: true });
          if (p.ammo <= 0) p.weapon = null;
        } else if (name === 'slash') sfx.slash(); else sfx.swing();
      }
      function playerAttackBox(p) {
        const A = ACT[p.act]; if (!A || A.hitF[0] < 0) return null;
        if (!A.air && (p.actT < A.hitF[0] || p.actT > A.hitF[1])) return null;
        return { x: p.x + p.face * A.reach * 0.6, w: A.reach, y: p.y, z: p.z, dmg: A.dmg, knock: A.knock };
      }
      function hurtEnemy(e, dmg, knock, dir) {
        const K = KIND[e.k];
        e.hp -= dmg; e.flash = 6; e.combo++;
        addScore(dmg * 20);
        if (e.hp <= 0) {
          e.st = 'fall'; e.stT = 0; e.vz = 3; e.vx = dir * 1.8; e.dead = 1; sfx.bighit();
          addScore(K.pts); pop(e.x, e.y - 50, String(K.pts), '#ffe040');
          if (!K.boss && Math.random() < 0.28) dropItem(e.x, e.y, e.k);
          if (K.boss) { g.phase = 'clear'; g.phaseT = 260; g.en.forEach(o => { if (o !== e && o.st !== 'fall') { o.hp = 0; o.st = 'fall'; o.stT = 0; o.vz = 3; o.vx = 1; o.dead = 1; } }); g.shots = []; g.nades = []; g.clearSnd = 50; }
          return;
        }
        if ((knock || e.combo >= 3) && !K.boss) { e.st = 'fall'; e.stT = 0; e.vz = 2.6; e.vx = dir * 1.6; e.combo = 0; sfx.bighit(); }
        else if (K.boss && knock && e.combo >= 4) { e.st = 'fall'; e.stT = 0; e.vz = 2; e.vx = dir * 1.2; e.combo = 0; sfx.bighit(); }
        else { e.st = 'hurt'; e.stT = 0; e.vx = dir * (K.boss ? 0.5 : 1.2); sfx.hit(); }
      }
      function hurtPlayer(dmg, dir, knock) {
        const p = g.p;
        if (p.inv || p.dead || p.downT) return;
        if (p.armor > 0) { const a = Math.min(p.armor, dmg); p.armor -= a; dmg -= a; pop(p.x, p.y - 50, 'ARMOR', '#a0c0ff'); }
        p.hp -= dmg; sfx.hurt();
        p.act = null;
        if (p.air) knock = true;
        if (p.hp <= 0) { p.hp = 0; p.downT = 1; p.vz = 3; p.vx = dir * 1.6; p.dead = 1; sfx.die(); g.phase = 'dying'; g.phaseT = 120; p.weapon = null; return; }
        if (knock) { p.downT = 1; p.vz = 2.6; p.vx = dir * 1.5; p.air = true; if (p.weapon === 'knife') { dropItem(p.x, p.y, 'knife', true); p.weapon = null; } }
        else { p.hurtT = 16; p.vx = dir * 1.2; }
      }
      function dropItem(x, y, from, forced) {
        let k;
        if (forced) k = from;
        else if (from === 'knife') k = 'knife';
        else if (from === 'gunner') k = 'm16';
        else if (from === 'grenadier') k = 'grenade';
        else k = pick(['ration', 'ration', 'vest', 'knife', 'm16', 'grenade', 'knuckles']);
        g.items.push({ k, x, y: clamp(y, GY0 + 2, GY1 - 2), t: 720 });
      }

      // ================= Update =================
      function updPlayer() {
        const p = g.p, d = diff();
        if (p.inv) p.inv--;
        if (p.comboT) p.comboT--; else p.combo = 0;
        // knocked down
        if (p.downT) {
          p.downT++;
          if (p.z > 0 || p.vz > 0) { p.z += p.vz; p.vz -= 0.25; p.x += p.vx; if (p.z <= 0) { p.z = 0; p.vz = 0; sfx.land(); } }
          if (p.downT > 60 && !p.dead) { p.downT = 0; p.inv = 60; p.air = false; }
          p.x = clamp(p.x, g.cam + 8, g.cam + W - 8);
          return;
        }
        if (p.hurtT) { p.hurtT--; p.x += p.vx; p.vx *= 0.85; p.x = clamp(p.x, g.cam + 8, g.cam + W - 8); return; }
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight'), U = api.key('ArrowUp'), Dn = api.key('ArrowDown');
        const pa = api.pressed('Space'), pb = api.pressed('KeyX');
        const jumpReq = api.pressed('KeyZ') || (pa && api.key('KeyX')) || (pb && api.key('Space'));
        // airborne
        if (p.air) {
          p.z += p.vz; p.vz -= 0.22; p.x += p.vx;
          if (!p.act && pb) { p.act = 'jkick'; p.actT = 0; p.hitList = new Set(); sfx.swing(); }
          else if (!p.act && pa) { p.act = 'jpunch'; p.actT = 0; p.hitList = new Set(); sfx.swing(); }
          if (p.act) p.actT++;
          if (p.z <= 0) { p.z = 0; p.vz = 0; p.air = false; p.act = null; sfx.land(); }
          p.x = clamp(p.x, g.cam + 8, g.cam + W - 8);
          return;
        }
        if (p.act) {
          p.actT++;
          const A = ACT[p.act];
          if (p.actT >= A.len) { p.act = null; }
          else return;
        }
        if (jumpReq) {
          p.air = true; p.vz = 4.2; p.vx = (R ? 1.4 : L ? -1.4 : 0); if (R) p.face = 1; if (L) p.face = -1; sfx.jump(); return;
        }
        if (pa) {
          if (p.weapon === 'm16') { startAct('shoot'); return; }
          if (p.weapon === 'grenade') { startAct('throw'); return; }
          if (p.weapon === 'knife') { startAct('slash'); return; }
          p.combo++; p.comboT = 30;
          startAct(p.combo >= 3 ? 'upper' : p.combo === 2 ? 'punch2' : 'punch');
          if (p.combo >= 3) p.combo = 0;
          return;
        }
        if (pb) { startAct('kick'); return; }
        let mx = 0, my = 0;
        if (L) mx -= 1; if (R) mx += 1; if (U) my -= 1; if (Dn) my += 1;
        if (mx) p.face = mx;
        p.x += mx * 1.3; p.y = clamp(p.y + my * 0.9, GY0, GY1);
        const leftLimit = g.cam + 8, rightLimit = g.lock != null ? g.cam + W - 10 : g.cam + W - 8;
        p.x = clamp(p.x, leftLimit, rightLimit);
        if (mx || my) p.walkT++; else p.walkT = 0;
        // camera
        if (g.lock == null && p.x > g.cam + W * 0.55) g.cam = Math.min(g.st.len - W, p.x - W * 0.55);
      }

      function enemyAttack(e) {
        const K = KIND[e.k], p = g.p, d = diff();
        e.st = 'wind'; e.stT = 0; e.kickAtk = e.k === 'kicker' || (e.k === 'brute' && Math.random() < 0.5);
        if (e.k === 'kicker' || e.k === 'ninja') { if (Math.abs(p.x - e.x) > 36 && Math.random() < 0.6) { e.st = 'jkick'; e.vz = 3.6; e.vx = e.face * 2.0; e.z = 0.1; sfx.jump(); } }
      }
      function updEnemy(e) {
        const K = KIND[e.k], p = g.p, d = diff();
        e.t++; e.stT++; if (e.flash) e.flash--;
        const dx = p.x - e.x, dy = p.y - e.y, adx = Math.abs(dx);
        if (e.st === 'fall') {
          e.z += e.vz; e.vz -= 0.2; e.x += e.vx;
          if (e.z <= 0) { e.z = 0; e.vz = 0; e.vx *= 0.6; if (e.stT > 2 && !e.landed) { e.landed = 1; sfx.land(); } }
          if (e.dead) { if (e.stT > 70) e.gone = true; }
          else if (e.stT > (K.boss ? 50 : 60)) { e.st = 'walk'; e.stT = 0; e.landed = 0; e.atkCd = 30; }
          return;
        }
        if (e.st === 'hurt') { e.x += e.vx; e.vx *= 0.85; if (e.stT > (K.boss ? 8 : 16)) { e.st = 'walk'; e.stT = 0; } return; }
        if (e.k !== 'dog') e.face = dx > 0 ? 1 : -1;
        if (e.atkCd) e.atkCd--;
        const busy = g.en.filter(o => o !== e && !o.dead && (o.st === 'wind' || o.st === 'atk' || o.engage)).length;
        // per-kind behaviour
        if (e.k === 'dog') {
          if (e.st === 'walk') {
            e.face = dx > 0 ? 1 : -1;
            e.x += e.face * K.spd * (1 + d * 0.05); e.y += Math.sign(dy) * Math.min(Math.abs(dy), 0.8);
            if (adx < 40 && Math.abs(dy) < 6 && !e.atkCd) { e.st = 'lunge'; e.stT = 0; e.vz = 2.6; e.z = 0.1; e.vx = e.face * 2.6; sfx.bark(); }
            if (adx > 160) e.face = dx > 0 ? 1 : -1;
          } else if (e.st === 'lunge') {
            e.z += e.vz; e.vz -= 0.2; e.x += e.vx;
            if (Math.abs(p.x - e.x) < 12 && Math.abs(p.y - e.y) < 7 && p.z < 16) { hurtPlayer(K.dmg, e.face, false); e.vx = -e.vx * 0.3; }
            if (e.z <= 0) { e.z = 0; e.st = 'walk'; e.atkCd = 50; }
          }
          return;
        }
        const ranged = e.k === 'gunner' || e.k === 'grenadier' || (e.k === 'general' && e.hp < e.max * 0.6 && e.t % 400 < 200);
        if (e.st === 'walk') {
          let tx, ty = p.y;
          if (ranged) { tx = p.x + (e.x < p.x ? -100 : 100); ty = e.k === 'grenadier' ? e.y : p.y; }
          else if (busy >= 2 && !K.boss && !e.engage) { tx = p.x + (e.x < p.x ? -60 : 60); ty = e.y + Math.sin(e.t * 0.03) * 0.5; }
          else { e.engage = true; tx = p.x + (e.x < p.x ? -K.reach + 4 : K.reach - 4); }
          tx = clamp(tx, g.cam + 12, g.cam + W - 12);
          if (e.x < g.cam - 4 || e.x > g.cam + W + 4) tx = p.x;
          const sp = K.spd * (1 + d * 0.05);
          if (Math.abs(tx - e.x) > 2) e.x += Math.sign(tx - e.x) * sp;
          if (Math.abs(ty - e.y) > 1) e.y += Math.sign(ty - e.y) * sp * 0.7;
          e.y = clamp(e.y, GY0, GY1);
          e.moving = Math.abs(tx - e.x) > 2 || Math.abs(ty - e.y) > 1;
          if (!e.atkCd && p.downT === 0 && !p.dead) {
            if (ranged && e.x > g.cam && e.x < g.cam + W && (e.k === 'grenadier' || Math.abs(dy) < 5)) { e.st = 'aim'; e.stT = 0; }
            else if (!ranged && adx < K.reach + 6 && Math.abs(dy) < 6 && p.z < 12) enemyAttack(e);
            else if (e.k === 'kicker' || e.k === 'ninja') { if (adx < 70 && adx > 40 && Math.abs(dy) < 6 && Math.random() < 0.02) enemyAttack(e); }
          }
        } else if (e.st === 'aim') {
          e.moving = false;
          if (e.stT === (e.k === 'grenadier' ? 20 : 24)) {
            if (e.k === 'grenadier' || (e.k === 'general' && e.t % 2)) {
              const T = 46; g.nades.push({ x: e.x, y: e.y, z: 30 * e.s, vx: (p.x - e.x) / T, vy: (p.y - e.y) / T, vz: 2.6, own: false }); sfx.jump();
            } else { g.shots.push({ x: e.x + e.face * 16, y: e.y, h: 22 * e.s, vx: e.face * (2.4 + d * 0.15), own: false, life: 140 }); sfx.egun(); }
          }
          if (e.stT > 40) { e.st = 'walk'; e.stT = 0; e.atkCd = Math.max(40, 110 - d * 10) + Math.random() * 60; }
        } else if (e.st === 'wind') {
          e.moving = false;
          if (e.stT >= Math.max(8, (K.boss ? 14 : 18) - d)) { e.st = 'atk'; e.stT = 0; e.hitDone = false; sfx.swing(); }
        } else if (e.st === 'atk') {
          if (!e.hitDone && e.stT < 8 && Math.abs(p.x - (e.x + e.face * K.reach * 0.6)) < K.reach * 0.7 && Math.abs(p.y - e.y) < 7 && p.z < 14) {
            e.hitDone = true; hurtPlayer(K.dmg + (K.boss ? Math.floor(d / 2) : 0), e.face, e.k === 'brute' || e.k === 'kicker' || (K.boss && Math.random() < 0.4));
          }
          if (e.stT > 14) { e.st = 'walk'; e.stT = 0; e.engage = false; e.atkCd = (K.boss ? Math.max(20, 50 - d * 5) : Math.max(30, 80 - d * 8)) + Math.random() * 40; if (e.k === 'brute' && Math.random() < 0.4) { e.st = 'charge'; e.stT = 0; } }
        } else if (e.st === 'jkick') {
          e.z += e.vz; e.vz -= 0.2; e.x += e.vx;
          if (!e.hitDone && Math.abs(p.x - e.x) < 18 && Math.abs(p.y - e.y) < 7 && Math.abs(p.z - e.z) < 20) { e.hitDone = true; hurtPlayer(K.dmg, e.face, true); }
          if (e.z <= 0) { e.z = 0; e.st = 'walk'; e.stT = 0; e.hitDone = false; e.atkCd = 50; }
          if (e.k === 'ninja' && e.stT === 12 && Math.random() < 0.5) g.shots.push({ x: e.x, y: e.y, h: 30, vx: e.face * 3, own: false, life: 90, star: true });
        } else if (e.st === 'charge') {
          e.x += e.face * 2.4; e.moving = true;
          if (!e.hitDone && Math.abs(p.x - e.x) < 20 && Math.abs(p.y - e.y) < 8) { e.hitDone = true; hurtPlayer(K.dmg, e.face, true); }
          if (e.stT > 50 || e.x < g.cam + 10 || e.x > g.cam + W - 10) { e.st = 'walk'; e.stT = 0; e.hitDone = false; e.atkCd = 40; }
        }
        if (K.boss) e.x = clamp(e.x, g.cam + 10, g.cam + W - 10);
      }

      function checkHits() {
        const p = g.p;
        const box = p.act ? playerAttackBox(p) : null;
        if (box) {
          for (const e of g.en) {
            if (e.st === 'fall' || p.hitList.has(e)) continue;
            const hw = e.k === 'dog' ? 10 : 8 * e.s;
            if (Math.abs(e.x - box.x) < box.w * 0.5 + hw && Math.abs(e.y - p.y) < 8 && Math.abs((e.z || 0) - box.z) < 26) {
              p.hitList.add(e);
              let dmg = box.dmg + (p.weapon === 'knuckles' ? 1 : 0);
              hurtEnemy(e, dmg, box.knock, p.face);
              g.fx.push({ x: e.x - p.face * 4, y: e.y, z: 22 * e.s + (e.z || 0), t: 0, k: 'spark' });
            }
          }
          for (const pr of g.props) {
            if (pr.dead || p.hitList.has(pr)) continue;
            if (Math.abs(pr.x - box.x) < box.w * 0.5 + 8 && Math.abs(pr.y - p.y) < 8) {
              p.hitList.add(pr); pr.hp--; pr.flash = 6; sfx.hit();
              if (pr.hp <= 0) { pr.dead = true; dropItem(pr.x, pr.y); addScore(100); g.fx.push({ x: pr.x, y: pr.y, z: 10, t: 0, k: 'boom' }); }
            }
          }
        }
        // projectiles
        for (const s of g.shots) {
          s.x += s.vx; s.life--;
          if (s.life <= 0 || s.x < g.cam - 20 || s.x > g.cam + W + 20) { s.dead = true; continue; }
          if (s.own) {
            for (const e of g.en) if (e.st !== 'fall' && Math.abs(e.x - s.x) < 8 * e.s && Math.abs(e.y - s.y) < 8) { hurtEnemy(e, 2, false, Math.sign(s.vx)); s.dead = true; break; }
          } else if (Math.abs(p.x - s.x) < 7 && Math.abs(p.y - s.y) < 7 && p.z < 18 && !p.downT) { s.dead = true; hurtPlayer(3, Math.sign(s.vx), s.star ? false : true); }
        }
        for (const n of g.nades) {
          n.x += n.vx; n.y += n.vy || 0; n.z += n.vz; n.vz -= 0.12;
          if (n.z <= 0) {
            n.dead = true; sfx.boom(); g.fx.push({ x: n.x, y: n.y, z: 4, t: 0, k: 'boom' });
            if (n.own) { for (const e of g.en) if (e.st !== 'fall' && Math.abs(e.x - n.x) < 26 && Math.abs(e.y - n.y) < 14) hurtEnemy(e, 5, true, Math.sign(e.x - n.x) || 1); }
            else if (Math.abs(p.x - n.x) < 22 && Math.abs(p.y - n.y) < 12 && p.z < 10) hurtPlayer(4, Math.sign(p.x - n.x) || 1, true);
          }
        }
        // pickups
        for (const it of g.items) {
          it.t--;
          if (p.downT || p.air || Math.abs(it.x - p.x) > 10 || Math.abs(it.y - p.y) > 8) continue;
          if (it.k === 'ration') { p.hp = Math.min(16, p.hp + 8); pop(p.x, p.y - 50, 'ENERGY', '#60ff60'); }
          else if (it.k === 'vest') { p.armor = 8; pop(p.x, p.y - 50, 'BODY ARMOR', '#a0c0ff'); }
          else { if (p.weapon && p.weapon !== it.k) continue; p.weapon = it.k; p.ammo = it.k === 'm16' ? 30 : it.k === 'grenade' ? 4 : 0; pop(p.x, p.y - 50, { knife: 'KNIFE', m16: 'M16', grenade: 'GRENADES', knuckles: 'KNUCKLES' }[it.k], '#ffe040'); }
          it.t = 0; sfx.pick();
        }
        g.items = g.items.filter(i => i.t > 0);
        g.shots = g.shots.filter(s => !s.dead);
        g.nades = g.nades.filter(s => !s.dead);
        g.props = g.props.filter(s => !s.dead);
      }

      function waveLogic() {
        const st = g.st;
        // trigger the next lock point
        if (g.lock == null) {
          if (g.wave < st.waves.length && g.cam >= g.waveX[g.wave] ) {
            g.lock = g.cam; g.queue = st.waves[g.wave].slice();
            const d = diff(); for (let i = 0; i < Math.min(3, d); i++) g.queue.push(pick(['soldier', 'knife', 'kicker', 'gunner']));
            g.wave++; g.spawnT = 20;
          } else if (g.wave >= st.waves.length && g.cam >= st.len - W - 1 && !g.bossSpawned) {
            g.lock = g.cam; g.bossSpawned = true; g.queue = [];
            spawnEnemy(st.boss, false); sfx.boss();
            g.bossName = st.boss;
            const d = diff(); g.queue = d > 0 ? ['soldier', 'soldier'] : ['soldier'];
            g.spawnT = 200;
          }
        }
        if (g.lock != null) {
          if (g.queue.length && --g.spawnT <= 0 && g.en.filter(e => !e.dead).length < 3 + Math.min(2, diff())) {
            spawnEnemy(g.queue.shift(), Math.random() < 0.35); g.spawnT = 40 + Math.random() * 50;
          }
          if (!g.queue.length && !g.en.some(e => !e.dead) && g.phase === 'play') { g.lock = null; g.go = 120; sfx.go(); }
        }
      }

      function gameOver() {
        api.setHiScore(g.score); g.phase = 'over'; g.phaseT = 300;
        au.melody([[330, .25], [311, .25], [294, .25], [262, .6]], { type: 'square', vol: 0.1 });
      }

      function update() {
        frame++; if (coinFlash) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { mode = 'game'; newGame(); }
            else { coinFlash = 90; au.tone(110, 0.25, { type: 'square', vol: 0.12 }); }
          }
          return;
        }
        for (const f of g.fx) f.t++;
        g.fx = g.fx.filter(f => f.t < (f.k === 'boom' ? 30 : 10));
        for (const q of g.pops) { q.t--; q.y -= 0.4; }
        g.pops = g.pops.filter(q => q.t > 0);
        for (const pr of g.props) if (pr.flash) pr.flash--;
        if (g.go) g.go--;
        if (g.clearSnd && --g.clearSnd === 0) sfx.clear();
        switch (g.phase) {
          case 'ready': updPlayer(); if (--g.phaseT <= 0) g.phase = 'play'; break;
          case 'play':
            updPlayer(); for (const e of g.en) updEnemy(e); checkHits(); waveLogic();
            g.en = g.en.filter(e => !e.gone && !(e.x < g.cam - 120 || e.x > g.cam + W + 120));
            break;
          case 'dying':
            updPlayer(); for (const e of g.en) { e.t++; if (e.st === 'fall') updEnemy(e); }
            g.shots = []; g.nades = [];
            if (--g.phaseT <= 0) {
              const cont = () => { const np = newPlayer(); np.x = clamp(g.p.x, g.cam + 20, g.cam + W - 20); np.y = g.p.y; np.inv = 150; g.p = np; g.phase = 'play'; };
              if (g.lives > 1) { g.lives--; cont(); }
              else {
                g.phase = 'wait'; const cg = g;
                if (api.offerContinue) api.offerContinue(() => { if (g === cg) { g.lives = 3; cont(); } }, () => { if (g === cg) gameOver(); });
                else gameOver();
              }
            }
            break;
          case 'clear':
            for (const e of g.en) updEnemy(e);
            g.en = g.en.filter(e => !e.gone);
            { const p = g.p; p.act = null; if (p.air) { p.z = 0; p.air = false; } if (g.phaseT < 180) { p.face = 1; p.x += 1.2; p.walkT++; } }
            if (--g.phaseT <= 0) { g.stage++; if (g.stage % 4 === 0) g.loop++; startStage(); }
            break;
          case 'over':
            if (--g.phaseT <= 0 || (g.phaseT < 200 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; g = null; }
            break;
        }
      }

      // ================= Render =================
      function hash(n) { n = Math.imul(n ^ (n >>> 15), 2246822519); n = Math.imul(n ^ (n >>> 13), 3266489917); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
      function drawBG(ctx, st, cam) {
        ctx.fillStyle = st.sky; ctx.fillRect(0, 0, W, GY0 - 30);
        if (st.deco === 'hq') { for (let i = 0; i < 40; i++) { ctx.fillStyle = '#c0c0e0'; ctx.fillRect((i * 67 + 13) % W, (i * 31) % 70 + 20, 1, 1); } }
        // far layer
        const fx = cam * 0.4;
        ctx.fillStyle = st.far;
        for (let i = -1; i < 12; i++) {
          const k = Math.floor(fx / 32) + i, x = k * 32 - fx, h = 20 + hash(k + g.stage * 100) * 30;
          ctx.fillRect(Math.round(x), Math.round(GY0 - 30 - h), 33, Math.round(h));
        }
        // mid layer by theme
        const mx = cam * 0.8;
        const top = GY0 - 30;
        if (st.deco === 'camp') {
          ctx.fillStyle = '#6a5a3a'; ctx.fillRect(0, top, W, 30);
          for (let i = -1; i < 6; i++) {
            const k = Math.floor(mx / 64) + i, x = Math.round(k * 64 - mx);
            if (hash(k) < 0.5) { // barracks hut
              ctx.fillStyle = '#5a4428'; ctx.fillRect(x + 4, top - 18, 56, 40); ctx.fillStyle = '#7a6040'; ctx.fillRect(x, top - 26, 64, 10);
              ctx.fillStyle = '#2a2010'; ctx.fillRect(x + 26, top + 4, 12, 18); ctx.fillStyle = '#c8c070'; ctx.fillRect(x + 10, top - 8, 8, 6); ctx.fillRect(x + 46, top - 8, 8, 6);
            } else { // watchtower
              ctx.fillStyle = '#4a3820'; ctx.fillRect(x + 20, top - 50, 3, 72); ctx.fillRect(x + 40, top - 50, 3, 72); ctx.fillRect(x + 16, top - 58, 32, 12);
              ctx.fillStyle = '#6a5030'; ctx.fillRect(x + 14, top - 62, 36, 4); ctx.fillStyle = (frame >> 5) & 1 ? '#ffe080' : '#c0a050'; ctx.fillRect(x + 30, top - 54, 4, 4);
            }
          }
          // barbed wire fence
          const wx = cam * 1.0;
          ctx.fillStyle = '#5a5a5a';
          for (let i = -1; i < 18; i++) { const x = Math.round(Math.floor(wx / 16) * 16 + i * 16 - wx); ctx.fillRect(x, top + 6, 2, 24); }
          ctx.fillStyle = '#909090'; for (const yy of [top + 9, top + 16, top + 23]) for (let x = 0; x < W; x += 3) ctx.fillRect(x, yy + ((x + Math.floor(wx)) % 6 < 3 ? 0 : 1), 2, 1);
        } else if (st.deco === 'jungle') {
          ctx.fillStyle = '#2a5a2a'; ctx.fillRect(0, top, W, 30);
          for (let i = -1; i < 9; i++) {
            const k = Math.floor(mx / 40) + i, x = Math.round(k * 40 - mx), h = hash(k);
            ctx.fillStyle = '#4a3018'; ctx.fillRect(x + 16, top - 60, 6, 90);
            ctx.fillStyle = '#1e5a22'; ctx.fillRect(x - 4, top - 80 + h * 10, 48, 30); ctx.fillStyle = '#2e7a2e'; ctx.fillRect(x + 2, top - 76 + h * 10, 34, 18);
            ctx.fillStyle = '#3a8a3a'; ctx.fillRect(x + 8 + h * 10, top - 40, 2, 30 + h * 20);
          }
        } else if (st.deco === 'base') {
          ctx.fillStyle = '#5a5a62'; ctx.fillRect(0, top - 40, W, 70);
          for (let i = -1; i < 9; i++) {
            const k = Math.floor(mx / 32) + i, x = Math.round(k * 32 - mx);
            ctx.fillStyle = '#4a4a52'; ctx.fillRect(x, top - 40, 2, 70);
            ctx.fillStyle = '#3a3a42'; ctx.fillRect(x + 4, top - 30, 24, 3);
            if (hash(k) < 0.35) { ctx.fillStyle = '#806030'; ctx.fillRect(x + 6, top + 6, 20, 20); ctx.fillStyle = '#5a4020'; ctx.fillRect(x + 6, top + 15, 20, 2); ctx.fillRect(x + 15, top + 6, 2, 20); }
            if (hash(k + 7) < 0.25) { ctx.fillStyle = '#a02020'; ctx.fillRect(x + 8, top - 24, 16, 10); text(ctx, 'NO', x + 9, top - 22, '#fff', { adv: 7 }); }
          }
        } else {
          ctx.fillStyle = '#8a8070'; ctx.fillRect(0, top - 30, W, 60);
          for (let i = -1; i < 7; i++) {
            const k = Math.floor(mx / 48) + i, x = Math.round(k * 48 - mx);
            ctx.fillStyle = '#6a6058'; ctx.fillRect(x, top - 30, 48, 2); ctx.fillRect(x, top - 30, 2, 60);
            ctx.fillStyle = '#202028'; ctx.fillRect(x + 10, top - 20, 10, 14); ctx.fillRect(x + 28, top - 20, 10, 14);
            if (hash(k) < 0.4) { ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x + 22, top - 60, 2, 34); ctx.fillStyle = '#c02020'; ctx.fillRect(x + 24, top - 60 + ((frame >> 4) & 1), 16, 10); ctx.fillStyle = '#ffe040'; ctx.fillRect(x + 29, top - 57, 5, 4); }
          }
        }
        // ground
        ctx.fillStyle = st.ground; ctx.fillRect(0, GY0 - 8, W, H - GY0 + 8);
        ctx.fillStyle = st.ground2;
        for (let i = 0; i < 60; i++) { const k = Math.floor(cam / 16) + i; const x = Math.round(((k * 16) - cam) + hash(k) * 12) % (W + 32), y = GY0 - 6 + ((hash(k * 3) * (H - GY0)) | 0); ctx.fillRect(x, y, 4, 1); }
        ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(0, GY0 - 8, W, 3);
      }
      function drawProp(ctx, pr, cam) {
        const x = Math.round(pr.x - cam), y = Math.round(pr.y);
        if (pr.k === 'drum') {
          ctx.fillStyle = pr.flash ? '#fff' : '#3a6a8a'; ctx.fillRect(x - 7, y - 20, 14, 20);
          ctx.fillStyle = '#5a8aaa'; ctx.fillRect(x - 5, y - 20, 4, 20); ctx.fillStyle = '#2a4a6a'; ctx.fillRect(x - 7, y - 14, 14, 2); ctx.fillRect(x - 7, y - 6, 14, 2);
        } else {
          ctx.fillStyle = pr.flash ? '#fff' : '#8a6030'; ctx.fillRect(x - 9, y - 16, 18, 16);
          ctx.fillStyle = '#5a3a18'; ctx.fillRect(x - 9, y - 9, 18, 2); ctx.fillRect(x - 1, y - 16, 2, 16); ctx.strokeStyle = '#5a3a18';
        }
      }
      function drawItem(ctx, it, cam) {
        if (it.t < 150 && (frame >> 2) & 1) return;
        const x = Math.round(it.x - cam), y = Math.round(it.y);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x - 7, y - 1, 14, 2);
        if (it.k === 'knife') { ctx.fillStyle = '#d0d0e0'; ctx.fillRect(x - 6, y - 4, 9, 2); ctx.fillStyle = '#5a3a18'; ctx.fillRect(x + 3, y - 5, 4, 3); }
        else if (it.k === 'm16') { ctx.fillStyle = '#202020'; ctx.fillRect(x - 9, y - 5, 18, 3); ctx.fillRect(x - 2, y - 3, 3, 3); ctx.fillRect(x + 5, y - 3, 3, 2); }
        else if (it.k === 'grenade') { ctx.fillStyle = '#3a5a2a'; ctx.fillRect(x - 3, y - 7, 6, 7); ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x - 1, y - 9, 2, 2); }
        else if (it.k === 'vest') { ctx.fillStyle = '#4a6a8a'; ctx.fillRect(x - 6, y - 10, 12, 10); ctx.fillStyle = '#2a4a6a'; ctx.fillRect(x - 2, y - 10, 4, 4); }
        else if (it.k === 'knuckles') { ctx.fillStyle = '#e0c040'; ctx.fillRect(x - 5, y - 5, 10, 4); ctx.fillStyle = '#806010'; ctx.fillRect(x - 4, y - 4, 1, 2); ctx.fillRect(x - 1, y - 4, 1, 2); ctx.fillRect(x + 2, y - 4, 1, 2); }
        else { ctx.fillStyle = '#e0e0c0'; ctx.fillRect(x - 6, y - 8, 12, 8); ctx.fillStyle = '#c02020'; ctx.fillRect(x - 6, y - 6, 12, 2); text(ctx, '+', x - 2, y - 15, '#60ff60'); }
      }
      function poseOf(f, isPlayer) {
        if (isPlayer) {
          const p = f;
          if (p.downT || p.dead) return p.z > 0 ? 'hurt' : 'down';
          if (p.hurtT) return 'hurt';
          if (p.air) return p.act === 'jkick' ? 'jkick' : p.act === 'jpunch' ? 'punch' : 'jump';
          if (p.act) { const A = ACT[p.act]; if (p.act === 'kick' && p.actT < 4) return 'wind'; return A.pose; }
          if (p.weapon === 'm16') return p.walkT ? (((p.walkT >> 3) & 1) ? 'walk0' : 'walk1') : 'gun';
          return p.walkT ? (((p.walkT >> 3) & 1) ? 'walk0' : 'walk1') : 'idle';
        }
        const e = f;
        if (e.st === 'fall') return e.z > 0 || e.stT < 4 ? 'hurt' : 'down';
        if (e.st === 'hurt') return 'hurt';
        if (e.st === 'wind') return 'wind';
        if (e.st === 'atk') return e.kickAtk ? 'kick' : e.k === 'knife' ? 'slash' : 'punch';
        if (e.st === 'jkick') return 'jkick';
        if (e.st === 'aim') return e.k === 'grenadier' || (e.k === 'general' && e.t % 2) ? 'throw' : 'gun';
        if (e.st === 'charge') return ((e.t >> 2) & 1) ? 'walk0' : 'walk1';
        return e.moving ? (((e.t >> 3) & 1) ? 'walk0' : 'walk1') : 'idle';
      }
      function drawFighterAt(ctx, f, pal, pose, cam, s, flash, weapon) {
        const x = f.x - cam, y = f.y;
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(Math.round(x - 8 * s), Math.round(y - 1), Math.round(16 * s), 3);
        const hand = drawPuppet(ctx, { x, y, z: f.z, face: f.face, pose, pal, s, flash });
        if (!hand) return;
        if (weapon === 'm16' || weapon === 'rifle') { ctx.fillStyle = '#202020'; ctx.fillRect(Math.round(hand.hx - (f.face > 0 ? 4 : 12)), Math.round(hand.hy - 2), 16, 3); ctx.fillRect(Math.round(hand.hx - 1), Math.round(hand.hy), 3, 3); }
        if (weapon === 'knife' && pose !== 'down') { ctx.fillStyle = '#e0e0f0'; ctx.fillRect(Math.round(hand.hx + (f.face > 0 ? 1 : -8)), Math.round(hand.hy - 1), 8, 2); }
        if (weapon === 'grenade' && pose === 'throw') { ctx.fillStyle = '#3a5a2a'; ctx.fillRect(Math.round(hand.hx - 2), Math.round(hand.hy - 3), 4, 4); }
        if (weapon === 'knuckles') { ctx.fillStyle = '#e0c040'; ctx.fillRect(Math.round(hand.hx - 2), Math.round(hand.hy - 2), 4, 3); }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, 26);
        if ((frame >> 4) & 1 || mode === 'title') text(ctx, '1UP', 6, 2, '#ff4040');
        text(ctx, String(g ? g.score : 0), 80, 2, '#fff', { right: true });
        text(ctx, 'HI', 168, 2, '#ff4040');
        text(ctx, String(Math.max(hi, g ? g.score : 0)), 250, 2, '#fff', { right: true });
        if (!g || mode !== 'game') return;
        const p = g.p;
        text(ctx, 'SNAKE', 6, 13, '#ffe040');
        for (let i = 0; i < 16; i++) { ctx.fillStyle = i < p.hp ? (p.hp <= 4 ? '#ff4040' : '#40e040') : '#303030'; ctx.fillRect(48 + i * 5, 13, 4, 7); }
        if (p.armor) { ctx.fillStyle = '#80a0ff'; ctx.fillRect(48, 21, p.armor * 10, 2); }
        for (let i = 0; i < Math.min(5, g.lives - 1); i++) { ctx.fillStyle = '#e8a878'; ctx.fillRect(134 + i * 8, 13, 5, 5); ctx.fillStyle = '#e02020'; ctx.fillRect(134 + i * 8, 15, 5, 1); ctx.fillStyle = '#e8e0c8'; ctx.fillRect(134 + i * 8, 18, 5, 3); }
        if (p.weapon) text(ctx, ({ knife: 'KNIFE', m16: 'M16 ' + p.ammo, grenade: 'GREN ' + p.ammo, knuckles: 'KNUCKLES' })[p.weapon], 250, 13, '#60e0ff', { right: true, adv: 7 });
        const boss = g.en.find(e => KIND[e.k].boss && !e.dead);
        if (boss) {
          text(ctx, boss.k.toUpperCase(), 6, 210, '#ff8080', { adv: 7 });
          ctx.fillStyle = '#400'; ctx.fillRect(70, 211, 150, 5); ctx.fillStyle = '#ff3030'; ctx.fillRect(70, 211, Math.max(0, Math.round(150 * boss.hp / boss.max)), 5);
        }
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#1a1408'; ctx.fillRect(0, 0, W, H);
        // searchlights
        for (let i = 0; i < 2; i++) {
          const a = Math.sin(titleT * 0.01 + i * 2) * 0.5;
          ctx.fillStyle = 'rgba(255,240,160,0.08)';
          for (let k = 0; k < 120; k += 2) { const w = k * 0.35; ctx.fillRect(Math.round((i ? 200 : 56) + Math.sin(a) * k - w / 2), 160 - k, Math.round(w), 2); }
        }
        // barbed wire
        ctx.fillStyle = '#707070'; for (let x = 0; x < W; x += 3) { ctx.fillRect(x, 150 + ((x % 6) < 3 ? 0 : 1), 2, 1); ctx.fillRect(x, 140 + ((x % 6) < 3 ? 1 : 0), 2, 1); }
        for (let x = 4; x < W; x += 24) ctx.fillRect(x, 136, 2, 22);
        text(ctx, 'P.O.W.', 128 + 3, 34 + 3, '#000', { center: true, scale: 4 });
        text(ctx, 'P.O.W.', 128, 34, '#f0e0a0', { center: true, scale: 4 });
        ctx.save(); ctx.beginPath(); ctx.rect(0, 50, W, 12); ctx.clip(); text(ctx, 'P.O.W.', 128, 34, '#e03020', { center: true, scale: 4 }); ctx.restore();
        text(ctx, 'PRISONERS OF WAR', 128, 72, '#fff', { center: true, shadow: '#000' });
        // demo fight
        const t = titleT % 240;
        const pp = { x: 100, y: 196, z: 0, face: 1 };
        const ee = { x: 150 - (t > 120 ? Math.min(30, (t - 120)) : 0), y: 196, z: 0, face: -1 };
        const pose = t % 60 < 10 ? 'punch' : t % 60 < 20 ? 'punch2' : t % 60 > 40 && t % 60 < 54 ? 'kick' : 'idle';
        drawFighterAt(ctx, pp, PAL.snake, pose, 0, 1.2, 0);
        drawFighterAt(ctx, ee, PAL.soldier, t % 60 < 24 && t % 60 > 4 ? 'hurt' : 'walk0', 0, 1.2, 0);
        const ph = Math.floor(titleT / 300) % 2;
        if (ph === 0) {
          text(ctx, 'PUNCH  SPACE', 128, 92, '#ffe040', { center: true });
          text(ctx, 'KICK   X', 128, 102, '#ffe040', { center: true });
          text(ctx, 'JUMP   SPACE+X', 128, 112, '#ffe040', { center: true });
        } else {
          text(ctx, 'ESCAPE THE CAMP', 128, 92, '#60e0ff', { center: true });
          text(ctx, 'AND FREE THE PRISONERS', 128, 104, '#60e0ff', { center: true });
        }
        if (api.credits > 0) { if ((frame >> 5) & 1) text(ctx, 'PUSH START', 128, 124, '#40ffff', { center: true, shadow: '#000' }); }
        else if (coinFlash > 0 ? (frame >> 2) & 1 : (frame >> 5) & 1) text(ctx, 'INSERT COIN', 128, 124, coinFlash ? '#ffe040' : '#ff4040', { center: true, shadow: '#000' });
        text(ctx, '\u00a9 1988 SNK (RECREATION)', 128, 204, '#a0a0a0', { center: true, adv: 7 });
        text(ctx, 'CREDIT ' + pad2(api.credits), 8, 214, '#fff');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { drawTitle(ctx); drawHUD(ctx); return; }
        const cam = Math.round(g.cam);
        drawBG(ctx, g.st, cam);
        for (const it of g.items) drawItem(ctx, it, cam);
        const list = [];
        for (const pr of g.props) list.push({ y: pr.y, f: () => drawProp(ctx, pr, cam) });
        for (const e of g.en) list.push({
          y: e.y, f: () => {
            if (e.dead && e.stT > 40 && (frame >> 1) & 1) return;
            if (e.k === 'dog') { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(Math.round(e.x - cam - 9), Math.round(e.y - 1), 18, 3); if (e.st === 'fall' && e.z <= 0) { ctx.fillStyle = '#3a2a1a'; ctx.fillRect(Math.round(e.x - cam - 9), Math.round(e.y - 5), 18, 5); } else drawDog(ctx, e, e.x - cam, e.y); return; }
            drawFighterAt(ctx, e, PAL[e.k], poseOf(e, false), cam, e.s, e.flash && (frame & 2), e.k === 'gunner' || (e.k === 'general' && e.st === 'aim') ? 'rifle' : e.k === 'knife' ? 'knife' : null);
          }
        });
        const p = g.p;
        if (g.phase !== 'wait' && g.phase !== 'over') list.push({
          y: p.y + 0.5, f: () => {
            if (p.inv && !p.downT && (frame >> 1) & 1) return;
            drawFighterAt(ctx, p, PAL.snake, poseOf(p, true), cam, 1, 0, p.weapon);
            if (p.armor) { ctx.fillStyle = 'rgba(80,120,200,0.6)'; ctx.fillRect(Math.round(p.x - cam - 4), Math.round(p.y - p.z - 28), 8, 9); }
          }
        });
        list.sort((a, b) => a.y - b.y).forEach(o => o.f());
        for (const s of g.shots) {
          const x = Math.round(s.x - cam), y = Math.round(s.y - s.h);
          if (s.star) { ctx.fillStyle = '#d0d0e0'; const f = (frame >> 1) & 1; ctx.fillRect(x - 3 + f, y - 1, 6 - 2 * f, 2); ctx.fillRect(x - 1, y - 3 + f, 2, 6 - 2 * f); }
          else { ctx.fillStyle = s.own ? '#ffffa0' : '#ffa040'; ctx.fillRect(x - 3, y, 6, 2); }
        }
        for (const n of g.nades) { const x = Math.round(n.x - cam), y = Math.round(n.y); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 2, y - 1, 5, 2); ctx.fillStyle = '#3a5a2a'; ctx.fillRect(x - 2, Math.round(y - n.z) - 2, 4, 5); }
        for (const f of g.fx) {
          const x = Math.round(f.x - cam), y = Math.round(f.y - f.z);
          if (f.k === 'spark') { ctx.fillStyle = f.t < 4 ? '#ffffff' : '#ffe040'; const r = 2 + f.t; ctx.fillRect(x - r, y, r * 2, 1); ctx.fillRect(x, y - r, 1, r * 2); ctx.fillRect(x - 1, y - 1, 3, 3); }
          else { const r = 4 + f.t * 0.8; ctx.fillStyle = ['#ffffff', '#ffe060', '#ff9020', '#c03010', '#503020'][Math.min(4, f.t / 6 | 0)]; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + f.t * 0.05; ctx.fillRect(Math.round(x + Math.cos(a) * r) - 2, Math.round(y - 6 + Math.sin(a) * r * 0.7) - 2, 4, 4); } }
        }
        for (const q of g.pops) text(ctx, q.txt, Math.round(q.x - cam), Math.round(q.y), q.col, { center: true, adv: 6, shadow: '#000' });
        if (g.go && (frame >> 3) & 1) { text(ctx, 'GO', 214, 90, '#ffe040', { scale: 2, shadow: '#000' }); ctx.fillStyle = '#ffe040'; for (let i = 0; i < 6; i++) ctx.fillRect(242 + i, 90 + i, 1, 14 - i * 2); }
        if (g.phase === 'ready') { text(ctx, 'STAGE ' + (g.stage + 1), 128, 80, '#ffe040', { center: true, scale: 2, shadow: '#000' }); text(ctx, g.st.name, 128, 102, '#fff', { center: true, shadow: '#000' }); }
        if (g.phase === 'clear' && g.phaseT < 220) text(ctx, 'STAGE CLEAR!', 128, 84, '#fff', { center: true, scale: 2, shadow: '#a00000' });
        if (g.phase === 'over') text(ctx, 'GAME OVER', 128, 90, '#ff4040', { center: true, scale: 2, shadow: '#000' });
        drawHUD(ctx);
      }
      if (api.debugHook) api.debugHook({ g: () => g, mode: () => mode });
      return { update, render, destroy() { } };
    }
  });
})();
