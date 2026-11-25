// Return of the Jedi (Atari, 1984) - from-scratch raster recreation for the Game Room.
// A 3/4 diagonal-scrolling view of the forest moon and the battle station: the Princess on a speeder bike
// racing scout troopers through the trees (ram them into trunks, let the Ewok ropes and logs do the rest),
// the Wookiee driving a captured walker toward the shield bunker, the freighter in the fleet battle and then
// inside the station's tunnels to the reactor and out ahead of the fireball. Shield energy, lives, rounds that
// get faster and meaner, bonus tallies, speech-like subtitled radio callouts and original music.
// All graphics are procedural voxel / pixel art baked at start-up; all sound is synthesized.
(function () {
  'use strict';
  const W = 256, H = 240, OX = 146, OY = 170;
  // screen projection of the ground plane: forward (u) runs up-left, right (v) runs up-right
  const FX = -0.7071, FY = -0.495, RX = 0.7071, RY = -0.495;
  const TAU = Math.PI * 2;

  // ---------- compact 5x7 bitmap arcade font (house style) ----------
  const FK = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-.,:!?=*/'\"<>()+%#@^_~";
  const FD = "ehjlphe4c4444eeh168gvv2421he26aiv22vgu11he68guhhev124888ehhehheehhf12c4ahhvhhuhhuhhuehgggheuhhhhhuvgguggvvggugggfggjhhfhhhvhhhe44444e11111hehikokihggggggvhrllhhhhhpljhhehhhhheuhhugggehhhliduhhukihfgge11uv444444hhhhhhehhhhha4hhhllrhhha4ahhhha4444v1248gv000v00000000cc0000c480cc0cc04444404eh1240400v0v000level001248g04480000aa00000248g842842124824888428422248044v440pq48mj0avaaavaehnlnge4el4444000000vehlplhe";
  const FONT = {};
  for (let i = 0; i < FK.length; i++) { const g = []; for (let r = 0; r < 7; r++) g.push(parseInt(FD[i * 7 + r], 32)); FONT[FK[i]] = g; }
  FONT['\u00a9'] = [0x0E, 0x11, 0x17, 0x14, 0x17, 0x11, 0x0E];
  function text(ctx, s, x, y, col, o) {
    o = o || {}; const sc = o.scale || 1, adv = (o.adv || 6) * sc, bw = o.bold ? 2 : 1;
    s = String(s).toUpperCase();
    const wd = s.length * adv - (adv - 5 * sc);
    if (o.center) x = Math.round(x - wd / 2);
    if (o.right) x = Math.round(x - wd);
    ctx.fillStyle = col;
    for (const ch of s) {
      const g = FONT[ch];
      if (g) for (let r = 0; r < 7; r++) { const b = g[r]; if (b) for (let c = 0; c < 5; c++) if ((b >> (4 - c)) & 1) ctx.fillRect(x + c * sc, y + r * sc, sc * bw, sc); }
      x += adv;
    }
  }
  function textS(ctx, s, x, y, col, o) {   // with a dark drop shadow
    const q = Object.assign({}, o || {});
    text(ctx, s, x + 1, y + 1, '#000', q); text(ctx, s, x, y, col, q);
  }

  // ---------- pixel helpers (fillRect / drawImage only, so everything stays crisp) ----------
  function rect(ctx, x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
  const xsBuf = [];
  function poly(ctx, pts, col) {
    let y0 = Infinity, y1 = -Infinity;
    for (const q of pts) { if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }
    y0 = Math.max(0, Math.floor(y0)); y1 = Math.min(H - 1, Math.ceil(y1));
    ctx.fillStyle = col;
    const n = pts.length, xs = xsBuf;
    for (let y = y0; y <= y1; y++) {
      const yc = y + 0.5; xs.length = 0;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const a = pts[i], b = pts[j];
        if ((a[1] <= yc) !== (b[1] <= yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.max(0, Math.round(xs[k])), xb = Math.min(W, Math.round(xs[k + 1]));
        if (xb > xa) ctx.fillRect(xa, y, xb - xa, 1);
      }
    }
  }
  function oval(ctx, cx, cy, rx, ry, col) {
    ctx.fillStyle = col;
    const n = Math.max(0, Math.floor(ry));
    for (let y = -n; y <= n; y++) {
      const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / ((ry + 0.5) * (ry + 0.5)))));
      if (w > 0) ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1);
    }
  }
  function line(ctx, x0, y0, x1, y1, col, t) {
    t = t || 1; ctx.fillStyle = col;
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    if (n > 600) return;
    for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + (x1 - x0) * i / n - t / 2), Math.round(y0 + (y1 - y0) * i / n - t / 2), t, t);
  }
  function hash2(x, y) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function rgbOf(h) {
    h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function shade(h, f) { const c = rgbOf(h); return 'rgb(' + c.map(v => Math.max(0, Math.min(255, Math.round(v * f)))).join(',') + ')'; }
  function tri(h) { return [shade(h, 1), shade(h, 0.6), shade(h, 0.8)]; }   // [top, front(-u), side(-v)]
  function mix(a, b, t) { const p = rgbOf(a), q = rgbOf(b); return 'rgb(' + p.map((v, i) => Math.round(v + (q[i] - v) * t)).join(',') + ')'; }
  const FACE = [1, 0.6, 0.8];

  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function bake2d(w, h, fn) {
    const c = canvas(w, h), x = c.getContext('2d');
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) { const col = fn(px, py); if (col) { x.fillStyle = col; x.fillRect(px, py, 1, 1); } }
    return c;
  }
  function spr(rows, pal) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    return bake2d(w, rows.length, (x, y) => pal[rows[y][x]] || null);
  }
  // Voxel model baked by marching each pixel's view ray: solid(a, b, z) -> material key; pal[key] = [top, front, side] or fn.
  function model(E, Z, S, solid, pal) {
    const w = Math.ceil(1.4142 * E * S) + 4, h = Math.ceil(0.99 * E * S + Z * S) + 4;
    const ox = Math.round(w / 2), oy = Math.ceil(0.495 * E * S + Z * S) + 2, zmax = Z * S;
    const sol = (a, b, z) => solid(a / S, b / S, z / S);
    const c = bake2d(w, h, (px, py) => {
      const sx = px + 0.5 - ox, sy = py + 0.5 - oy;
      const pp = sx / 0.7071, q = -sy / 0.495, a0 = (q - pp) / 2, b0 = (q + pp) / 2;
      for (let k = zmax / 0.99; k >= 0; k -= 0.3) {
        const a = a0 - k, b = b0 - k, z = 0.99 * k;
        const m = sol(a, b, z);
        if (m) {
          const face = !sol(a, b, z + 0.45) ? 0 : !sol(a - 0.45, b, z) ? 1 : 2;
          const e = pal[m]; if (!e) return '#f0f';
          return typeof e === 'function' ? e(a / S, b / S, z / S, face) : e[face];
        }
      }
      return null;
    });
    return { c, ox, oy };
  }
  function blit(ctx, m, x, y) { ctx.drawImage(m.c, Math.round(x - m.ox), Math.round(y - m.oy)); }

  // ---------- procedural art ----------
  let ART = null;
  function camo(a, b, z, f) {
    const k = hash2(Math.floor(a * 0.9) + 50, Math.floor(b * 0.9) * 31 + Math.floor(z * 0.9) * 7);
    return shade(k < 0.3 ? '#3c5a2a' : k < 0.6 ? '#5a7238' : k < 0.85 ? '#6e6a3c' : '#2c3a1c', FACE[f]);
  }
  function bikeSolid(a, b, z, scout) {
    const ab = Math.abs(b);
    if (a >= -12 && a <= -5 && ab <= 3 && z >= 2.5 && z <= 7) return a < -11.2 ? 'glow' : 'eng';
    if (a > -5 && a <= 6 && z >= 3.4 && z <= 6.4 && ab <= 2.3 - (a > 2 ? (a - 2) * 0.3 : 0)) return 'hull';
    if (a >= 6 && a <= 16 && ab >= 1.1 && ab <= 2.2 && z >= 4.1 && z <= 5.4) return 'fork';
    if (a >= 15 && a <= 17.4 && ab >= 0.4 && ab <= 4.9 && z >= 2.6 && z <= 6.8) return 'vane';
    if (a >= -8 && a <= -2.5 && ab <= 1.8 && z > 6.4 && z <= 7.6) return 'seat';
    if (a >= -4 && a <= 0 && ab >= 1.1 && ab <= 2.6 && z >= 4 && z <= 8) return 'leg';
    if (a >= -6.6 && a <= -2.4 && ab <= 2.4 - (z > 12 ? (z - 12) * 0.3 : 0) && z > 7.6 && z <= 13.6) return scout ? ((z > 9.6 && z < 10.6) ? 'belt' : 'armor') : 'camo';
    if (a >= -3.6 && a <= 2.6 && ab >= 1.8 && ab <= 2.9 && z >= 10.2 && z <= 11.8) return scout ? 'leg' : 'camo';
    const dx = a + 4.4, dz = z - 15.6;
    if (dx * dx + b * b + dz * dz <= 5.6) {
      if (scout) return (dx > 0.7 && dz < 0.9 && dz > -1.4) ? 'visor' : 'helm';
      return dx < -0.1 || dz > 1.3 ? 'hair' : 'face';
    }
    if (!scout && (dx + 2) * (dx + 2) + b * b + (dz + 0.4) * (dz + 0.4) <= 1.3) return 'hair';   // braid bun
    return 0;
  }
  function atstSolid(a, b, z, chewie) {
    const ab = Math.abs(b);
    if (z >= 26 && z <= 36) {
      const front = 9 - (z > 31 ? (z - 31) * 0.9 : 0) - (z < 28 ? (28 - z) * 1.3 : 0);
      if (a >= -9 && a <= front && ab <= 7 - (z > 34 ? (z - 34) * 0.9 : 0)) {
        if (a > front - 1.2 && z >= 30 && z <= 31.6 && ab <= 4.6) return chewie ? 'win' : 'winR';
        if (Math.abs(ab - 7) < 0.6 && z > 28) return 'trim';
        return ((Math.floor((a + 20) / 4) + (z > 31.5 ? 1 : 0)) & 1) ? 'hullA' : 'hullB';
      }
    }
    if (a >= 8 && a <= 15 && ab >= 1 && ab <= 2.4 && z >= 26.6 && z <= 28) return 'gun';
    if (ab > 7 && ab <= 9.6 && a >= -1 && a <= 6 && z >= 28 && z <= 31.6) return 'pod';
    if (ab >= 7.8 && ab <= 8.9 && a > 6 && a <= 12 && z >= 29.2 && z <= 30.3) return 'gun';
    const dx = a + 2;
    if (chewie) {
      const dz = z - 38.6;
      if (dx * dx + b * b + dz * dz <= 7.5) return dx > 0.9 && dz < 0.6 && dz > -1.2 ? 'muzz' : 'fur';
      if (dx * dx + b * b <= 13 && z > 36 && z <= 37.2) return 'hullB';
    } else if (dx * dx + b * b <= 11 && z > 36 && z <= 37.4) return 'hullB';
    if (ab <= 3.4 && a >= -4 && a <= 3 && z >= 21.5 && z < 26) return 'dark';
    if (ab <= 6.4 && a >= -3 && a <= 2 && z >= 19 && z < 21.5) return 'hip';
    return 0;
  }
  function tieSolid(a, b, z) {
    const zc = z - 9, ab = Math.abs(b), az = Math.abs(zc), aa = Math.abs(a);
    if (a * a + b * b + zc * zc <= 15) {
      if (a > 1.6) { const r = Math.hypot(b, zc); if (r < 2.4) return (r < 0.8 || Math.abs(b) < 0.35 || Math.abs(zc) < 0.35) ? 'frame' : 'win'; }
      return 'ball';
    }
    if (ab <= 8 && ab >= 3 && aa <= 1 && az <= 1) return 'strut';
    if (ab >= 7.6 && ab <= 8.7 && az <= 8.4 && aa + az * 0.577 <= 9.7) {
      if (aa + az * 0.577 > 8.7 || aa < 0.7 || Math.abs(aa - az * 0.577) < 0.7) return 'frame';
      return 'panel';
    }
    return 0;
  }
  function falconSolid(a, b, z) {
    const r = Math.hypot(a, b), ab = Math.abs(b);
    const top = 2.2 + Math.max(0, 13 - r) * 0.17;
    const da = a + 4, db = b + 5;
    if (da * da + db * db <= 7 && z >= 4.1 && z <= 5) return 'dish';
    if (Math.abs(da) < 0.8 && Math.abs(db) < 0.8 && z <= 4.5 && z > 2) return 'dish';
    if (r <= 14 && z <= top && z >= 0.4) {
      if (r >= 12.4 && a < -5) return 'eng';
      if (r < 3.2 && z > top - 0.7) return 'core';
      return 'hull';
    }
    if (a >= 8 && a <= 23 && ab >= 1.5 && ab <= 6.6 - Math.max(0, a - 13) * 0.28 && z >= 0.6 && z <= 2.6) return 'hull2';
    const dbc = b - 13.6, dz = z - 2.3;
    if (a >= -1 && a <= 9.5 && dbc * dbc + dz * dz <= 4.6) return a > 7.8 ? 'glass' : 'hull2';
    if (a >= -3 && a <= 3 && b >= 9 && b <= 13 && z >= 0.6 && z <= 3.4) return 'hull2';
    return 0;
  }
  function logSolid(len, axisU, phase) {
    return (a, b, z) => {
      const along = axisU ? a : b, across = axisU ? b : a;
      const dz = z - 4.6;
      if (Math.abs(along) > len / 2 || across * across + dz * dz > 20.5) return 0;
      if (Math.abs(along) > len / 2 - 0.9) return 'ring';
      const ang = Math.atan2(dz, across) + phase;
      return (Math.floor((ang / TAU) * 10 + 20) & 1) ? 'barkA' : 'barkB';
    };
  }
  function bunkerSolid(a, b, z) {
    const ab = Math.abs(b);
    if (a >= -26 && a <= 26 && ab <= 40 && z <= 20) {
      if (a < -22 && ab < 8 && z < 13) return a < -21.2 ? 0 : 'door';
      if (a < -25 && z > 15 && z < 17) return 'stripe';
      if (a < -25 && ab > 12 && ab < 34 && z > 4 && z < 11 && (Math.floor(b + 50) % 4 === 0)) return 'vent';
      return 'conc';
    }
    if (a >= -14 && a <= 20 && ab <= 24 && z > 20 && z <= 29) return a < -13 && z > 23 && z < 26 && ab < 18 ? 'stripe' : 'conc2';
    const dx = a - 6;
    if (Math.abs(dx) < 1.3 && ab < 1.3 && z > 29 && z <= 38) return 'mast';
    if (dx * dx + b * b <= 100 && z >= 37.5 && z <= 39) return 'dish';
    if (dx * dx + b * b <= 2 && z > 39 && z <= 42) return 'mast';
    return 0;
  }
  function reactorSolid(a, b, z) {
    const r = Math.hypot(a, b);
    if (z <= 4 && r <= 26) return r > 23 ? 'rim' : 'base';
    if (r <= 17 && z <= 66) {
      if (z > 62) return 'cap';
      if ((Math.floor(z) % 10) < 2) return 'band';
      if (r > 16 && Math.abs(Math.atan2(b, a)) % 0.8 < 0.12) return 'band';
      return 'core';
    }
    return 0;
  }
  function pillarSolid(a, b, z) {
    if (Math.abs(a) <= 4 && Math.abs(b) <= 4 && z <= 40) {
      if (Math.abs(b) > 3.3 && (Math.floor(z) % 8) < 1) return 'lite';
      return z > 37 ? 'cap' : 'pil';
    }
    return 0;
  }
  function gliderSolid(a, b, z) {
    const ab = Math.abs(b);
    if (z >= 8 && z <= 8.8 && a >= -7 && a <= 6 && ab <= (6 - a) * 0.95) return ((Math.floor(ab / 3) + Math.floor((a + 9) / 3)) & 1) ? 'leatherA' : 'leatherB';
    if (ab < 0.6 && a > -7 && a < 6 && z >= 8.8 && z <= 9.4) return 'strut';
    const dz = z - 4.6;
    if (a * a + b * b + dz * dz <= 4.4) return 'fur';
    if (a * a + b * b + (z - 7.2) * (z - 7.2) <= 2.2) return 'hood';
    if (ab < 0.4 && Math.abs(a) < 0.4 && z > 5 && z < 8) return 'strut';
    return 0;
  }

  function buildArt() {
    const P = {};
    P.bikeL = {
      hull: tri('#e2e0d6'), eng: tri('#a6a49c'), glow: ['#ffb050', '#ff5020', '#ff7a30'], fork: tri('#9c9c9c'), vane: tri('#6c6c72'),
      seat: tri('#5a3a24'), leg: tri('#5a4632'), camo, face: tri('#e8b48c'), hair: tri('#6a3a1c'),
      armor: tri('#f2f2f2'), belt: tri('#303030'), helm: tri('#f4f4f4'), visor: tri('#1a1a1a')
    };
    P.bikeS = Object.assign({}, P.bikeL, { hull: tri('#bdbab0'), leg: tri('#2e2e2e') });
    const atst = {
      hullA: tri('#a8a8ae'), hullB: tri('#94949c'), trim: tri('#6c6c74'), gun: tri('#4a4a50'), pod: tri('#7c7c84'),
      win: tri('#1c2430'), winR: ['#ff6040', '#902010', '#c03020'], dark: tri('#55555c'), hip: tri('#76767e'),
      fur: (a, b, z, f) => shade(hash2(Math.floor(a * 2) + 9, Math.floor(z * 2) * 5 + Math.floor(b * 2)) < 0.4 ? '#6a4222' : '#8a5a2e', FACE[f]),
      muzz: tri('#3a2414')
    };
    const tie = { ball: tri('#8a8c96'), win: tri('#203040'), frame: tri('#9a9ca6'), panel: tri('#3a3c48'), strut: tri('#70727c') };
    const fal = {
      hull: (a, b, z, f) => {
        const r = Math.hypot(a, b), ang = Math.atan2(b, a);
        const seam = Math.abs(((ang / TAU) * 16 + 16) % 1 - 0.5) > 0.45 || Math.abs(r - 8.5) < 0.4;
        const k = hash2(Math.floor(r / 3) + 3, Math.floor((ang + 4) * 3));
        return shade(seam ? '#8c8c88' : k < 0.18 ? '#a89a86' : k < 0.3 ? '#b6b6b0' : '#cfcfc8', FACE[f]);
      },
      hull2: tri('#c4c4bc'), eng: ['#c8f4ff', '#3a90ff', '#70c0ff'], core: tri('#8e8e8a'), glass: tri('#203040'), dish: tri('#dcdcd4')
    };
    const A = {};
    A.bikeL = model(26, 19, 1.25, (a, b, z) => bikeSolid(a, b, z, false), P.bikeL);
    A.bikeS = model(26, 19, 1.25, (a, b, z) => bikeSolid(a, b, z, true), P.bikeS);
    A.atstC = model(26, 42, 1.1, (a, b, z) => atstSolid(a, b, z, true), atst);
    A.atstE = model(26, 42, 1.1, (a, b, z) => atstSolid(a, b, z, false), atst);
    A.tie = model(18, 19, 1.1, tieSolid, tie);
    A.falcon = model(31, 6, 1.05, falconSolid, fal);
    const logPal = { barkA: tri('#7a4a28'), barkB: tri('#5c341a'), ring: tri('#c89a62') };
    A.roll = [[], []]; A.cross = [];
    for (let f = 0; f < 4; f++) {
      A.roll[0].push(model(30, 10, 1, logSolid(48, false, f * TAU / 40), logPal));
      A.roll[1].push(model(40, 10, 1, logSolid(66, false, f * TAU / 40), logPal));
      A.cross.push(model(26, 10, 1, logSolid(38, true, f * TAU / 40), logPal));
    }
    A.flog = model(44, 11, 1, (a, b, z) => {
      if (Math.abs(a - 1) < 1 && b > 10 && b < 13 && z < 13 && z > 7) return 'barkB';   // broken branch stub
      return logSolid(80, false, 0.3)(a, b, z * 0.9);
    }, logPal);
    A.bunker = model(68, 44, 1, bunkerSolid, {
      conc: (a, b, z, f) => shade(hash2(Math.floor(b / 4) + 7, Math.floor(z / 3) + Math.floor(a / 4) * 13) < 0.2 ? '#8a8c80' : '#9ea094', FACE[f]),
      conc2: tri('#8a8c84'), door: tri('#20242a'), stripe: tri('#c8a040'), vent: tri('#4a4c48'), mast: tri('#707478'), dish: tri('#c0c4c8')
    });
    A.reactor = model(38, 68, 1, reactorSolid, {
      base: tri('#4a4a58'), rim: tri('#6a6a78'), core: tri('#5a6a8a'), band: tri('#9aa8c8'), cap: ['#e0f0ff', '#6080c0', '#90b0e0']
    });
    A.pillar = model(9, 41, 1, pillarSolid, { pil: tri('#686876'), cap: tri('#8a8a98'), lite: ['#ffe080', '#d0a040', '#ffd060'] });
    A.glider = model(14, 10, 1.15, gliderSolid, { leatherA: tri('#b08a58'), leatherB: tri('#9a7446'), strut: tri('#5a3a1a'), fur: tri('#6a4424'), hood: tri('#a07a4c') });
    A.ewok = spr([
      '..hhh..', '.hhhhh.', 'hhfffhh', '.fkfkf.', '.ffnff.', 'bbbbbbb', 'b.bbb.b', '.bbbbb.', '.bb.bb.'
    ], { h: '#a8865a', f: '#6a4424', k: '#000', n: '#2a1a10', b: '#5a3a1e' });
    // redwood trunks: 4 widths, lit from the left, bark grooves, root flare
    A.trees = [];
    [10, 12, 15, 18].forEach((tw, k) => {
      const Hh = 112, w = tw + 12, seed = k * 97 + 5;
      const c = bake2d(w, Hh, (x, y) => {
        const cx = w / 2, half = tw / 2, flare = y > Hh - 10 ? (y - (Hh - 10)) * 0.65 : 0;
        const dx = x + 0.5 - cx;
        if (Math.abs(dx) > half + flare) return null;
        if (flare > 1 && Math.abs(dx) > half - 1 && hash2(x * 3 + seed, y >> 1) < 0.35) return null;
        const rel = (dx + half + flare) / (2 * (half + flare));
        const base = rel < 0.2 ? [150, 98, 60] : rel > 0.76 ? [58, 30, 16] : rel > 0.55 ? [92, 52, 28] : [112, 66, 38];
        const col = Math.floor(dx + 30);
        const groove = hash2(col * 13 + seed, Math.floor(y / 9 + hash2(col, seed) * 9)) < 0.28;
        let f = (groove ? 0.6 : 1) * (0.88 + 0.22 * hash2(x + seed, y));
        if (y < 34) f *= 0.35 + 0.65 * y / 34;
        return 'rgb(' + base.map(v => Math.round(v * f)).join(',') + ')';
      });
      A.trees.push({ c, ox: Math.round(w / 2), oy: Hh - 3, r: tw * 0.6 });
    });
    A.fern = [0, 1].map(k => bake2d(18, 8, (x, y) => {
      const dx = x - 8.5, d = Math.abs(dx) / 9 + (7 - y) / 8;
      if (d > 1 || y > 7) return null;
      const frond = (Math.floor(Math.atan2(7.5 - y, dx) * 4) + k) & 1;
      if (hash2(x + k * 31, y) < 0.25) return null;
      return frond ? '#3a7a2a' : (y < 3 ? '#5a9a3a' : '#28561c');
    }));
    // the half-built battle station
    A.ds = bake2d(118, 118, (x, y) => {
      const dx = x + 0.5 - 59, dy = y + 0.5 - 59, d = Math.hypot(dx, dy);
      if (d > 57) return null;
      const nx = dx / 57, ny = dy / 57, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      let lam = Math.max(0, -nx * 0.55 - ny * 0.5 + nz * 0.67);
      const unfinished = dy > 6 + 9 * Math.sin(dx / 11) && dx > -40 + 6 * Math.cos(dy / 7);
      if (unfinished) return (Math.abs(x % 7) < 1 || y % 6 === 0) && hash2(x, y) < 0.8 ? shade('#7a7a88', 0.4 + lam * 0.8) : null;
      const sx = dx + 22, sy = dy + 20, sd = Math.hypot(sx, sy);
      if (sd < 12) lam = Math.max(0, 0.15 + (sx * 0.4 + sy * 0.3) / 24);
      if (sd < 3) return '#60ff80';
      if (Math.abs(dy) < 0.8) return '#202028';
      const bay = [0, 0.5, 0.125, 0.625, 0.75, 0.25, 0.875, 0.375][(x & 3) + ((y & 1) << 2)];
      const lvlv = Math.floor(lam * 4 + bay * 0.9);
      if (hash2(x, y >> 1) < 0.04 && lam < 0.3) return '#ffe080';
      return ['#24242c', '#44444e', '#686874', '#9a9aa6', '#c8c8d2'][Math.max(0, Math.min(4, lvlv))];
    });
    A.cruiser = bake2d(40, 14, (x, y) => {
      const t = x / 40; if (y < 7 - t * 6 || y > 7 + t * 6) return null;
      return y < 7 ? (hash2(x, y) < 0.1 ? '#e0e0f0' : '#8a8a98') : '#4a4a58';
    });
    return A;
  }

  const SEGS = {
    bike: { kind: 'bike', title: 'SPEEDER BIKE CHASE', sub: 'FOREST MOON', len: 6200, pw: 62 },
    walker: { kind: 'walker', title: 'THE CAPTURED WALKER', sub: 'FOREST MOON', len: 3000, pw: 70 },
    space: { kind: 'falcon', title: 'THE FLEET ENGAGES', sub: 'BATTLE STATION ORBIT', len: 4400, pw: 0 },
    walker2: { kind: 'walker', title: 'ASSAULT ON THE BUNKER', sub: 'SHIELD GENERATOR', len: 2400, pw: 70 },
    tunnel: { kind: 'falcon', title: 'INTO THE SUPERSTRUCTURE', sub: 'MAIN REACTOR', len: 4600, pw: 0 }
  };
  const KIND = {
    bike: { min: 1.2, cru: 2.3, max: 3.4, lat: 1.8, acc: 0.05, fire: 9, vlim: 150 },
    walker: { min: 0.45, cru: 0.95, max: 1.35, lat: 1.0, acc: 0.03, fire: 13, vlim: 125 },
    falcon: { min: 1.4, cru: 2.5, max: 3.5, lat: 2.1, acc: 0.06, fire: 7, vlim: 130 }
  };
  const PTS = { bikeShot: 500, bikeCrash: 1000, bikeTrap: 1500, log: 200, atst: 1500, tie: 1000, pillar: 300, generator: 20000, reactor: 50000 };
  const VOICES = {
    leia: { tag: 'PRINCESS', col: '#ffb0e0', f: 210 },
    wook: { tag: 'WOOKIEE', col: '#e8a860', f: 88, growl: true },
    pilot: { tag: 'FALCON', col: '#80e0ff', f: 122 },
    cmd: { tag: 'COMMAND', col: '#ffe040', f: 100 },
    scout: { tag: 'SCOUT', col: '#ff7060', f: 150 }
  };
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ.-_';
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);

  ArcadeRegistry.register({
    id: 'returnofthejedi', title: 'Return of the Jedi', year: 1984, maker: 'Atari',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Left/Right: steer \u00b7 Up: faster \u00b7 Down: slower \u00b7 Space/X: fire \u00b7 Enter: start',
    marquee: { bg: '#000', fg: '#ffd040', accent: '#38c040' },
    create(api) {
      if (!ART) ART = buildArt();
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
      const pick = arr => arr[(Math.random() * arr.length) | 0];
      const sgn = () => (Math.random() < 0.5 ? -1 : 1);

      // ---------- high score table ----------
      const table = [150000, 120000, 100000, 80000, 60000, 50000, 40000, 30000]
        .map((s, i) => ({ n: ['LEA', 'HAN', 'CHW', 'LND', 'WKT', 'ACK', 'NNB', 'R2D'][i], s }));
      let hi = api.getHiScore(table[0].s);
      if (hi > table[0].s) { table.unshift({ n: 'TOP', s: hi }); table.pop(); }

      // ---------- state ----------
      let mode = 'attract', modeT = 0, att = 'title', attT = 0, coinFlash = 0, demoN = 0;
      let demo = false, auto = false, god = false;
      let score = 0, lives = 3, lvl = 1, nextLife = 100000;
      let order = [], segI = 0, seg = 'bike', SD = SEGS.bike, segLen = 0, phase = 'intro', phaseT = 0;
      let p = null, camU = 0, camV = 0;
      let trees = [], ferns = [], ents = [], pshots = [], eshots = [], parts = [], pops = [];
      let spawnU = 0, eventU = 0, enemyT = 0, gliderT = 0, swingT = 0, atstT = 0, segKills = 0, boss = null;
      let tun = null, escaping = false, fireU = 0, wonT = 0;
      let shake = 0, flash = 0, sub = null, said = {}, music = null, tally = null, initials = null, lastRank = -1;
      let inp = { l: 0, r: 0, u: 0, d: 0, f: 0 }, apT = 0, apBest = null;
      const stars = [];
      for (let i = 0; i < 90; i++) stars.push({ x: rnd(0, W), y: rnd(0, H), z: rnd(0.15, 1), c: pick(['#ffffff', '#c0d0ff', '#ffe0c0', '#8080a0']) });

      // ---------- sound ----------
      const snd = {
        tone(f, d, o) { if (!demo) A.tone(f, d, o); },
        noise(d, o) { if (!demo) A.noise(d, o); },
        melody(n, o) { if (!demo) A.melody(n, o); }
      };
      // speech-like radio voice: buzzy glottal source, band-passed noise formants per syllable
      const VOWEL = { a: [750, 1150], e: [520, 1850], i: [320, 2250], o: [560, 880], u: [420, 1000], y: [400, 1950] };
      function speak(who, txt, force) {
        if (sub && sub.t > 40 && !force) return false;
        const sp = VOICES[who] || VOICES.cmd;
        sub = { who: sp.tag, col: sp.col, text: txt, t: Math.max(120, txt.length * 4 + 80) };
        if (demo) return true;
        if (sp.growl) {   // the Wookiee: a rising, rasping roar
          let d = 0;
          for (let k = 0; k < 3; k++) {
            const len = k === 2 ? 0.55 : 0.22, f0 = sp.f * (1 + k * 0.15);
            A.tone(f0, len, { type: 'sawtooth', vol: 0.09, slideTo: f0 * (k === 2 ? 1.8 : 1.3), delay: d });
            A.tone(f0 * 1.01, len, { type: 'square', vol: 0.03, slideTo: f0 * 1.6, delay: d });
            A.noise(len, { type: 'bandpass', freq: 700 + k * 150, vol: 0.12, delay: d });
            d += len + 0.06;
          }
          return true;
        }
        let d = 0.04;
        A.noise(0.05, { type: 'highpass', freq: 2600, vol: 0.05 });
        const words = txt.toLowerCase().split(/\s+/);
        for (let wi = 0; wi < words.length; wi++) {
          const word = words[wi].replace(/[^a-z]/g, '');
          const syl = word.match(/[aeiouy]+/g) || ['a'];
          for (let si = 0; si < syl.length; si++) {
            const fm = VOWEL[syl[si][0]] || VOWEL.a;
            const len = 0.065 + Math.min(0.08, syl[si].length * 0.03) + (si === syl.length - 1 ? 0.03 : 0);
            const f0 = sp.f * (1 + 0.1 * Math.sin(wi * 2.1 + si * 0.7)) * (wi === words.length - 1 ? 0.88 : 1);
            if (/^[bcdfgjkpqstvxz]/.test(word) && si === 0) A.noise(0.03, { type: 'highpass', freq: 3800, vol: 0.06, delay: d });
            A.tone(f0, len, { type: 'sawtooth', vol: 0.05, slideTo: f0 * 0.9, delay: d + 0.02 });
            A.noise(len, { type: 'bandpass', freq: fm[0], vol: 0.11, delay: d + 0.02 });
            A.noise(len * 0.8, { type: 'bandpass', freq: fm[1], vol: 0.055, delay: d + 0.02 });
            d += len + 0.03;
          }
          d += 0.05;
        }
        A.noise(0.07, { type: 'highpass', freq: 2600, vol: 0.05, delay: d });
        return true;
      }
      function sayOnce(key, who, txt, force) { if (said[key]) return; if (speak(who, txt, force)) said[key] = true; }

      // ---------- music (original compositions, step sequencers) ----------
      const N = midi;
      const SONGS = {
        bike: { step: 7, bass: [40, 0, 40, 47, 40, 0, 43, 45, 40, 0, 40, 47, 38, 0, 38, 45], lead: [76, 0, 74, 0, 71, 0, 74, 76, 79, 0, 78, 0, 74, 0, 71, 0] },
        walker: { step: 12, bass: [38, 0, 38, 0, 45, 0, 38, 0, 41, 0, 40, 0, 36, 0, 38, 0], lead: [62, 0, 0, 65, 64, 0, 62, 0, 60, 0, 0, 62, 57, 0, 0, 0] },
        space: { step: 8, bass: [45, 52, 57, 52, 43, 50, 55, 50, 41, 48, 53, 48, 40, 47, 52, 47], lead: [69, 0, 72, 0, 76, 0, 74, 72, 71, 0, 67, 0, 69, 0, 0, 0] },
        tunnel: { step: 7, bass: [36, 36, 48, 36, 37, 36, 48, 36, 36, 36, 48, 36, 39, 37, 48, 36], lead: [0, 72, 0, 73, 0, 72, 0, 70, 0, 72, 0, 75, 0, 73, 0, 72] },
        escape: { step: 5, bass: [41, 53, 41, 53, 42, 54, 42, 54, 44, 56, 44, 56, 46, 58, 46, 58], lead: [77, 0, 80, 0, 82, 0, 80, 0, 77, 0, 82, 85, 82, 0, 80, 0] }
      };
      function musicStart(name) { music = { name, i: 0, t: 1 }; }
      function musicTick() {
        if (!music || demo || mode !== 'play' || phase === 'tally' || phase === 'dead') return;
        if (--music.t > 0) return;
        const s = SONGS[music.name]; music.t = s.step;
        const i = music.i % 16, bar = (music.i >> 4) & 3;
        const tr = music.name === 'walker' && bar === 2 ? 3 : music.name === 'bike' && bar === 3 ? -2 : 0;
        if (s.bass[i]) snd.tone(N(s.bass[i] + tr), s.step / 60 * 0.85, { type: 'triangle', vol: 0.14 });
        if (bar & 1 && s.lead[i]) snd.tone(N(s.lead[i] + tr), s.step / 60 * 0.9, { type: 'square', vol: 0.035 });
        if (music.name === 'walker' && i % 4 === 0) snd.noise(0.05, { freq: 400, vol: 0.06 });
        if ((music.name === 'bike' || music.name === 'escape') && i % 2 === 0) snd.noise(0.02, { type: 'highpass', freq: 6000, vol: 0.025 });
        music.i++;
      }
      function themeTune(delay) {   // original title theme in C minor
        const mel = [[67, .15], [72, .15], [74, .15], [75, .45], [74, .15], [72, .15], [70, .3], [72, .6], [0, .15], [67, .15], [75, .15], [79, .6], [77, .15], [75, .15], [74, .3], [72, .9]];
        snd.melody(mel.map(([n, d]) => [n ? N(n) : 0, d]), { type: 'square', vol: 0.09, delay: delay || 0 });
        const bass = [[48, .6], [44, .6], [46, .6], [43, .6], [48, .6], [51, .6], [43, .6], [48, .9]];
        snd.melody(bass.map(([n, d]) => [N(n), d]), { type: 'triangle', vol: 0.14, delay: delay || 0 });
      }
      function jingle() { snd.melody([[N(72), .08], [N(76), .08], [N(79), .08], [N(84), .25]], { type: 'square', vol: 0.1 }); }
      const sfx = {
        shot() {
          if (p.kind === 'bike') snd.tone(1500, 0.07, { type: 'square', vol: 0.06, slideTo: 500 });
          else if (p.kind === 'walker') { snd.tone(320, 0.14, { type: 'sawtooth', vol: 0.09, slideTo: 110 }); snd.noise(0.05, { freq: 1500, vol: 0.06 }); }
          else snd.tone(1000, 0.08, { type: 'square', vol: 0.07, slideTo: 260 });
        },
        eshot() { snd.tone(760, 0.09, { type: 'sawtooth', vol: 0.045, slideTo: 380 }); },
        boom(big) {
          snd.noise(big ? 1.1 : 0.35, { vol: big ? 0.3 : 0.18, freq: big ? 1000 : 1600, slideTo: big ? 60 : 200 });
          if (big) snd.tone(90, 0.7, { type: 'sine', vol: 0.18, slideTo: 30 });
        },
        hurt() { snd.tone(200, 0.16, { type: 'square', vol: 0.12, slideTo: 80 }); snd.noise(0.12, { freq: 2500, vol: 0.12 }); },
        bump() { snd.noise(0.08, { freq: 700, vol: 0.15 }); snd.tone(120, 0.06, { type: 'square', vol: 0.08 }); },
        step() { snd.noise(0.07, { freq: 260, vol: 0.09 }); snd.tone(55, 0.06, { type: 'sine', vol: 0.12 }); },
        whoosh() { snd.noise(0.45, { type: 'bandpass', freq: 400, slideTo: 1600, vol: 0.1 }); }
      };

      // ---------- projection ----------
      const sx = (u, v) => OX + (u - camU) * FX + (v - camV) * RX;
      const sy = (u, v, h) => OY + (u - camU) * FY + (v - camV) * RY - (h || 0);
      const onScreen = (x, y, m) => x > -m && x < W + m && y > -m && y < H + m + 60;

      // ---------- tunnel geometry ----------
      function newTunnel(esc) {
        tun = { a1: rnd(45, 70), l1: rnd(260, 340), p1: rnd(0, TAU), a2: rnd(14, 26), l2: rnd(110, 150), p2: rnd(0, TAU), hw: esc ? Math.max(38, 54 - lvl * 2) : Math.max(44, 64 - lvl * 3) };
      }
      function tC(u) {
        if (!tun) return 0;
        let k = clamp(u / 500, 0, 1);
        if (!escaping && seg === 'tunnel') k *= clamp((segLen - 160 - u) / 250, 0, 1);
        return (tun.a1 * Math.sin(u / tun.l1 + tun.p1) + tun.a2 * Math.sin(u / tun.l2 + tun.p2)) * k;
      }
      function tHW(u) {
        let w = tun ? tun.hw + 9 * Math.sin(u / 233) : 60;
        if (!escaping && seg === 'tunnel' && u > segLen - 260) w += clamp((u - (segLen - 260)) / 140, 0, 1) * 70;
        return w;
      }
      const isTunnel = () => seg === 'tunnel';

      // ---------- effects ----------
      function burst(u, v, h, n, cols, spd, life) {
        for (let i = 0; i < n; i++) {
          const a = rnd(0, TAU), s = rnd(0.2, 1) * spd;
          parts.push({ u, v, h, vu: Math.cos(a) * s, vv: Math.sin(a) * s, vh: rnd(0.3, 1.6) * spd, t: 0, T: life * rnd(0.6, 1.2), c: cols, g: 0.06, s: Math.random() < 0.3 ? 2 : 1 });
        }
      }
      const FIRE = ['#ffffff', '#fff080', '#ffb030', '#ff6020', '#a02010', '#401008'];
      const SPARK = ['#ffffff', '#a0f0ff', '#4080ff'];
      function boom(u, v, h, big) {
        burst(u, v, h, big ? 46 : 22, FIRE, big ? 2.2 : 1.3, big ? 60 : 36);
        burst(u, v, h, big ? 14 : 6, ['#808080', '#505050', '#303030'], big ? 2.6 : 1.6, 70);
        sfx.boom(big); if (big) { shake = 14; flash = 6; }
      }
      function pop(u, v, n) { pops.push({ u, v, h: 18, t: 70, s: String(n) }); }
      function addScore(n) {
        if (demo) return;
        score += n;
        if (score >= nextLife) { nextLife += 150000; lives++; jingle(); speak('cmd', 'Reinforcements have arrived', true); }
        if (score > hi) hi = score;
      }

      // ---------- player ----------
      function K() { return KIND[p.kind]; }
      function cruise() { return K().cru * Math.min(1.25, 1 + 0.05 * (lvl - 1)); }
      function hurt(n) {
        if (phase === 'dead' || p.inv > 0 || god || phase === 'tally' || phase === 'won') return;
        p.shield -= n; p.hurtT = 18; sfx.hurt(); shake = Math.max(shake, 6);
        burst(p.u, p.v, 10, 8, SPARK, 1.2, 20);
        if (p.shield <= 0) { p.shield = 0; die(); }
        else if (p.shield <= 2) sayOnce('low' + segI + '_' + lives, p.kind === 'walker' ? 'wook' : p.kind === 'bike' ? 'leia' : 'pilot', p.kind === 'walker' ? 'RRAAWGH! (Armor nearly gone!)' : 'Shields are almost gone!', true);
      }
      function crash() { if (phase === 'dead' || p.inv > 0 || god || phase === 'tally' || phase === 'won') return; p.shield = 0; die(); }
      function die() {
        phase = 'dead'; phaseT = 0; boom(p.u, p.v, 6, true);
        lives--;
      }
      function respawn() {
        p.shield = 8; p.inv = 150; p.sp = p.kind === 'walker' ? cruise() * 0.5 : cruise() * 0.6; phase = escaping ? 'escape' : 'run'; phaseT = 0;
        if (isTunnel() || seg === 'space') p.v = isTunnel() ? tC(p.u) : 0;
        else p.v = clamp(p.v, -SD.pw + 10, SD.pw - 10);
        trees = trees.filter(t => !(t.u > p.u - 30 && t.u < p.u + 140 && Math.abs(t.v - p.v) < 40));
        ents = ents.filter(e => e.t === 'bunker' || e.t === 'reactor' || e.t === 'glider' || !(e.u > p.u - 50 && e.u < p.u + 170));
        eshots = [];
        if (escaping) fireU = p.u - 220;
      }

      // ---------- segment flow ----------
      function newGame() {
        score = 0; lives = 3; lvl = 1; nextLife = 100000; said = {};
        startRound();
        mode = 'play'; modeT = 0;
      }
      function startRound() {
        order = lvl % 2 === 1 ? ['bike', 'walker', 'space', 'walker2', 'tunnel'] : ['walker', 'bike', 'space', 'walker2', 'tunnel'];
        startSeg(0);
      }
      function startSeg(i) {
        segI = i; seg = order[i]; SD = SEGS[seg];
        segLen = SD.len + (seg === 'bike' ? lvl * 300 : seg === 'tunnel' ? lvl * 200 : 0);
        const kind = SD.kind;
        p = { u: 0, v: 0, sp: 0, kind, inv: 0, fcd: 0, gun: 0, ph: 0, bumpT: 0, wallT: 0, hurtT: 0, shield: 8, vv: 0, stepS: 0 };
        p.sp = cruise();
        camU = 0; camV = 0;
        trees = []; ferns = []; ents = []; pshots = []; eshots = []; parts = []; pops = [];
        boss = null; escaping = false; tun = null; fireU = -9999; wonT = 0;
        segKills = 0; enemyT = 200; gliderT = 300; swingT = 600; atstT = 260;
        spawnU = -240; eventU = 380;
        if (isTunnel()) newTunnel(false);
        if (kind !== 'falcon') { while (spawnU < 440) spawnRow(spawnU, true); }
        if (seg === 'tunnel') p.v = tC(0);
        phase = 'intro'; phaseT = 0;
        musicStart(seg === 'walker2' ? 'walker' : seg);
        const lines = {
          bike: ['leia', 'Scouts closing in! Run them into the trees!'],
          walker: ['wook', 'RRRAAWRGH! (The Wookiee has a walker!)'],
          space: ['pilot', 'Fleet is engaging. Their shield is still active!'],
          walker2: ['leia', 'We have to bring that shield down. Go!'],
          tunnel: ['pilot', 'Shield is down! Taking her in. Stay close!']
        };
        const L = lines[seg]; speak(L[0], L[1], true);
      }
      function segDone() {
        if (phase === 'tally') return;
        phase = 'tally'; phaseT = 0;
        const per = { bike: 250, walker: 300, space: 200, walker2: 300, tunnel: 300 }[seg];
        const lines = [{ l: 'ENEMIES DESTROYED', n: segKills, k: per }, { l: 'SHIELD ENERGY', n: Math.max(0, p.shield), k: 1000 }];
        if (seg === 'walker2') lines.push({ l: 'GENERATOR BONUS', n: lvl, k: 10000 });
        if (seg === 'tunnel') lines.push({ l: 'STATION DESTROYED', n: lvl, k: 25000 });
        tally = { lines, i: 0, shown: 0, t: 0, done: false };
        snd.melody([[N(67), .1], [N(72), .1], [N(76), .1], [N(79), .3]], { type: 'square', vol: 0.09 });
      }
      function nextSeg() {
        if (segI + 1 < order.length) startSeg(segI + 1);
        else { lvl++; phase = 'roundcard'; phaseT = 0; themeTune(); }
      }

      // ---------- spawning ----------
      function spawnRow(u, initial) {
        const pw = SD.pw, L = lvl;
        const nOff = seg === 'walker2' && u > segLen - 250 ? 1 : 2;
        for (let i = 0; i < nOff; i++) {
          const side = sgn(), v = side * rnd(pw + 12, 300);
          if (Math.random() < 0.85) trees.push({ u: u + rnd(0, 12), v, k: (Math.random() * 4) | 0, r: 0 });
        }
        if (Math.random() < 0.5) ferns.push({ u: u + rnd(0, 12), v: sgn() * rnd(pw - 6, 260), k: (Math.random() * 2) | 0 });
        const onP = p.kind === 'bike' ? 0.06 + 0.012 * Math.min(6, L) : 0.035;
        const blocked = (initial && u < 260 && u > -60) || (seg === 'walker2' && u > segLen - 260);
        if (!blocked && Math.random() < onP) trees.push({ u: u + rnd(0, 12), v: rnd(-pw + 6, pw - 6), k: (Math.random() * 3) | 0, r: 0 });
        for (const t of trees) if (!t.r) t.r = ART.trees[t.k].r;
        spawnU = u + 12;
      }
      function clearPath(u0, u1) { trees = trees.filter(t => !(t.u > u0 && t.u < u1 && Math.abs(t.v) < SD.pw + 8)); }
      function spawnEvent(u) {
        const L = lvl;
        if (seg === 'bike') {
          const r = Math.random();
          if (r < 0.34) {   // Ewok rope strung across part of the trail
            clearPath(u - 30, u + 30);
            const left = Math.random() < 0.5, edge = rnd(-12, 18);
            ents.push({ t: 'rope', u, v0: left ? -170 : edge, v1: left ? edge : 170, up: 0 });
          } else if (r < 0.62) {   // log trap: Ewoks roll a trunk across the trail
            clearPath(u - 40, u + 40);
            const dir = sgn();
            ents.push({ t: 'rlog', u, v: -dir * 190, dir, spd: 1.9 + 0.12 * Math.min(5, L), go: 0, ph: 0 });
          } else {   // fallen trunk lying across one side
            clearPath(u - 25, u + 25);
            const side = sgn();
            ents.push({ t: 'log', u, v: side * rnd(20, 34), len: 76 });
          }
          eventU = u + rnd(260, 380) - Math.min(110, L * 18);
        } else if (seg === 'walker' || seg === 'walker2') {
          if (seg === 'walker2' && u > segLen - 300) { eventU = u + 400; return; }
          clearPath(u - 30, u + 30);
          const n = Math.random() < 0.3 + 0.1 * L ? 2 : 1;
          for (let i = 0; i < n; i++) {
            const big = Math.random() < 0.5, len = big ? 66 : 48;
            ents.push({ t: 'roll', u: u + i * 70, v: clamp(rnd(-50, 50), -SD.pw + len / 2 - 20, SD.pw - len / 2 + 20), len, big: big ? 1 : 0, vu: -(1.1 + 0.15 * Math.min(6, L)), hp: big ? 3 : 2, ph: 0 });
          }
          eventU = u + rnd(240, 340) - Math.min(90, L * 15);
        } else if (seg === 'tunnel') {
          if (u > segLen - 300 && !escaping) { eventU = u + 400; return; }
          const c = tC(u), hw = tHW(u);
          const n = Math.random() < 0.25 + 0.06 * L ? 2 : 1;
          const slot = rnd(-hw + 16, hw - 16);
          ents.push({ t: 'pillar', u, v: c + slot, hp: 3 });
          if (n === 2) { const s2 = slot > 0 ? slot - rnd(40, 55) : slot + rnd(40, 55); if (Math.abs(s2) < hw - 12) ents.push({ t: 'pillar', u: u + rnd(-6, 6), v: c + s2, hp: 3 }); }
          eventU = u + rnd(110, 190) - Math.min(50, L * 8);
        }
      }
      function spawnEnemies() {
        const L = lvl;
        if (seg === 'bike') {
          if (--enemyT > 0) return;
          enemyT = Math.max(70, 170 - L * 14) + rnd(0, 60);
          const n = ents.filter(e => e.t === 'ebike').length;
          if (n >= 2 + Math.min(3, L)) return;
          const k = Math.random() < 0.3 + 0.08 * L ? 2 : 1;
          for (let i = 0; i < k; i++) {
            const behind = Math.random() < 0.75;
            ents.push({ t: 'ebike', u: p.u + (behind ? -150 - i * 20 : 330), v: clamp(p.v + rnd(-60, 60), -120, 120), sp: behind ? p.sp + 1.4 : p.sp * 0.8, tdu: rnd(-20, 60), off: sgn() * rnd(18, 40), ramT: rnd(60, 140), ram: 0, kv: 0, fcd: rnd(60, 120), hp: 1, bumped: 0, on: 0 });
          }
          if (Math.random() < 0.3) speak('scout', pick(['Rebel bike sighted! Cut it off!', 'Pull over, rebel!', 'Box her in!']));
        } else if (seg === 'walker' || seg === 'walker2') {
          if (--enemyT <= 0) {
            enemyT = Math.max(110, 260 - L * 20) + rnd(0, 80);
            if (ents.filter(e => e.t === 'ebike').length < 2 + Math.min(2, L >> 1)) {
              const on = Math.random() < 0.65;
              ents.push({ t: 'ebike', u: p.u + (on ? 360 : -150), v: rnd(-50, 50), sp: on ? -1.3 - 0.1 * L : p.sp + 2, tdu: 0, off: 0, ramT: 0, ram: 0, kv: 0, fcd: rnd(30, 90), hp: 1, bumped: 0, on: on ? 1 : 0 });
            }
          }
          if (--atstT <= 0) {
            atstT = Math.max(260, 520 - L * 40) + rnd(0, 120);
            if (ents.filter(e => e.t === 'eatst').length < 1 + Math.min(2, L >> 1) && !(seg === 'walker2' && p.u > segLen - 400)) {
              ents.push({ t: 'eatst', u: p.u + 380, v: rnd(-45, 45), hp: 4 + Math.min(4, L >> 1), ph: 0, fcd: 80, hit: 0 });
              if (Math.random() < 0.5) speak('leia', 'Walker ahead! Watch its guns!');
            }
          }
          if (--gliderT <= 0) {
            gliderT = rnd(300, 520);
            const side = sgn();
            ents.push({ t: 'glider', u: p.u + rnd(90, 220), v: -side * 230, vv: side * 1.25, h: 46, drop: rnd(20, 60) });
            if (Math.random() < 0.5) speak('cmd', 'Ewok gliders overhead. They are on our side!');
          }
          if (--swingT <= 0) {
            swingT = rnd(500, 800);
            const side = sgn();
            ents.push({ t: 'swing', u: p.u + rnd(150, 230), side, ph: 0, v: side * 95 });
          }
        } else if (seg === 'space' || seg === 'tunnel') {
          if (--enemyT > 0) return;
          const nt = ents.filter(e => e.t === 'tie').length;
          enemyT = (seg === 'space' ? Math.max(110, 230 - L * 18) : Math.max(150, 300 - L * 20)) + rnd(0, 60);
          if (nt > 5 + L) return;
          if (seg === 'space') {
            const n = 3 + Math.min(3, L), base = rnd(-60, 60), fromBehind = Math.random() < 0.3;
            for (let i = 0; i < n; i++) {
              ents.push({ t: 'tie', u: p.u + (fromBehind ? -170 - i * 18 : 360 + i * 22), v: base + (i - (n - 1) / 2) * 22, h: 12, vu: fromBehind ? p.sp + 1.5 : -1.0 - 0.1 * L, vv: 0, w: rnd(0, TAU), st: 0, fcd: rnd(40, 100), behind: fromBehind ? 1 : 0 });
            }
            if (Math.random() < 0.4) speak('pilot', pick(['Fighters coming in!', 'Here they come! Stay sharp!', 'More fighters on our tail!']));
          } else {
            if (boss && boss.hp <= 0) return;
            const n = 1 + (Math.random() < 0.2 * L ? 1 : 0), fromBehind = Math.random() < 0.6;
            for (let i = 0; i < n; i++) ents.push({ t: 'tie', u: p.u + (fromBehind ? -160 - i * 30 : 380), v: tC(p.u) + rnd(-20, 20), h: 12, vu: fromBehind ? p.sp + 1.0 : -0.6, vv: 0, w: rnd(0, TAU), st: 0, fcd: rnd(50, 110), behind: fromBehind ? 1 : 0, tun: 1, life: 0 });
          }
        }
      }

      // ---------- input ----------
      function readInput() {
        if (auto) { autopilot(); return; }
        inp.l = api.key('ArrowLeft') ? 1 : 0; inp.r = api.key('ArrowRight') ? 1 : 0;
        inp.u = api.key('ArrowUp') ? 1 : 0; inp.d = api.key('ArrowDown') ? 1 : 0;
        inp.f = (api.key('Space') || api.key('KeyX') || api.key('KeyZ')) ? 1 : 0;
      }
      // ---------- autopilot (attract demo + test bot) ----------
      function hazards() {
        const hz = [], pu = p.u;
        if (p.kind !== 'falcon') for (const t of trees) if (t.u > pu - 12 && t.u < pu + 260 && Math.abs(t.v - p.v) < 140) hz.push([t.u, t.v, 0, 0, t.r + 2, t.r + 2, 3]);
        for (const e of ents) {
          if (e.u < pu - 60 || e.u > pu + 330) continue;
          switch (e.t) {
            case 'log': hz.push([e.u, e.v, 0, 0, 6, e.len / 2 + 2, 4]); break;
            case 'rope': hz.push([e.u, (e.v0 + e.v1) / 2, 0, 0, 5, Math.abs(e.v1 - e.v0) / 2 + 3, 4]); break;
            case 'rlog': hz.push([e.u, e.v, 0, e.dir * e.spd, 21, 7, 4]); break;
            case 'roll': hz.push([e.u, e.v, e.vu, 0, 6, e.len / 2 + 3, 2]); break;
            case 'eatst': hz.push([e.u, e.v, -0.35, 0, 14, 12, 1.5]); break;
            case 'ebike': hz.push([e.u, e.v, e.on ? e.sp : 0, 0, 9, 9, 0.5]); break;
            case 'pillar': hz.push([e.u, e.v, 0, 0, 6, 7, 3]); break;
            case 'tie': hz.push([e.u, e.v, e.vu, e.vv, 7, 8, 1]); break;
            case 'rock': hz.push([e.u, e.v, 0, 0, 7, 9, 1]); break;
          }
        }
        for (const s of eshots) hz.push([s.u, s.v, s.vu, s.vv, 4, 5, 0.8]);
        return hz;
      }
      function targets() {
        const out = [];
        for (const e of ents) {
          const du = e.u - p.u;
          if (du < 10 || du > 250) continue;
          if (e.t === 'ebike' || e.t === 'eatst' || e.t === 'tie' || e.t === 'roll' || (e.t === 'pillar' && p.kind === 'falcon')) out.push(e);
          if ((e.t === 'bunker' || e.t === 'reactor') && e.hp > 0) out.push(e);
        }
        return out;
      }
      function autopilot() {
        const k = K(), cr = cruise();
        const tg = targets();
        inp.f = 0;
        for (const e of tg) if (Math.abs(e.v - p.v) < ((e.t === 'bunker') ? 30 : e.t === 'reactor' ? 16 : e.t === 'roll' ? e.len / 2 : 9)) inp.f = 1;
        if (--apT > 0 && apBest) { steer(apBest); return; }
        apT = 3;
        const hz = hazards();
        const speeds = [cr, k.max, k.min];
        const vlim = p.kind === 'falcon' && !isTunnel() ? k.vlim : p.kind === 'falcon' ? 400 : k.vlim;
        let best = null, bestC = Infinity;
        for (let si = 0; si < 3; si++) {
          const s = speeds[si];
          for (let cv = Math.round(p.v / 8) * 8 - 96; cv <= p.v + 96; cv += 8) {
            if (Math.abs(cv) > vlim) continue;
            let c = Math.abs(cv - p.v) * 0.003 + si * 0.06;
            if (p.kind !== 'falcon') c += Math.max(0, Math.abs(cv) - SD.pw + 12) * 0.02;
            if (escaping) c += si === 2 ? 4 : si === 0 ? 1.2 : 0;
            if (boss) c += Math.abs(cv - (boss.v || 0)) * 0.02;
            for (const e of tg) if (Math.abs(e.v - cv) < 6 && e.t !== 'roll') c -= 0.15;
            for (let t = 2; t <= 80; t += 3) {
              const pu = p.u + s * t, dv = cv - p.v;
              const pv = p.v + Math.sign(dv) * Math.min(Math.abs(dv), k.lat * t);
              if (isTunnel()) { if (Math.abs(pv - tC(pu)) > tHW(pu) - 12) { c += 2 * (1 + (80 - t) / 30); break; } }
              let hit = false;
              for (const h of hz) {
                const hu = h[0] + h[2] * t, hv = h[1] + h[3] * t;
                if (Math.abs(hu - pu) < h[4] + 5 && Math.abs(hv - pv) < h[5] + 5) { c += h[6] * (1 + (80 - t) / 25); hit = true; break; }
              }
              if (hit) break;
            }
            if (c < bestC) { bestC = c; best = { s, v: cv }; }
          }
        }
        apBest = best; steer(best);
      }
      function steer(b) {
        if (!b) return;
        const cr = cruise();
        inp.l = b.v < p.v - 1.5 ? 1 : 0; inp.r = b.v > p.v + 1.5 ? 1 : 0;
        inp.u = b.s > cr + 0.01 ? 1 : 0; inp.d = b.s < cr - 0.01 ? 1 : 0;
      }

      // ---------- per-frame world update ----------
      function updatePlayer() {
        const k = K(), cr = cruise();
        const alive = phase !== 'dead' && phase !== 'tally' && phase !== 'won';
        let tgt = inp.u ? k.max : inp.d ? k.min : cr;
        if (!alive) tgt = phase === 'dead' ? 0 : cr * 0.7;
        if (phase === 'intro') tgt = cr;
        p.sp += clamp(tgt - p.sp, -k.acc * 1.5, k.acc);
        let maxU = Infinity;
        if (boss) maxU = boss.u - (boss.t === 'bunker' ? 62 : 70);
        const pu0 = p.u, pv0 = p.v;
        p.u = Math.min(maxU, p.u + p.sp);
        if (p.u >= maxU) p.sp = Math.min(p.sp, 0.3);
        if (alive) {
          const want = (inp.r - inp.l) * k.lat;
          p.vv += clamp(want - p.vv, -0.3, 0.3);
        } else p.vv *= 0.9;
        p.v += p.vv;
        const lim = isTunnel() ? 999 : k.vlim;
        p.v = clamp(p.v, -lim, lim);
        if (p.inv > 0) p.inv--; if (p.bumpT > 0) p.bumpT--; if (p.wallT > 0) p.wallT--; if (p.hurtT > 0) p.hurtT--;
        if (p.kind === 'walker') {
          const ph0 = p.ph; p.ph += p.sp * 0.085;
          if (Math.floor(ph0 / Math.PI) !== Math.floor(p.ph / Math.PI) && alive) sfx.step();
        } else p.ph += 0.1;
        if (!alive) return;
        // fire
        if (p.fcd > 0) p.fcd--;
        if (inp.f && p.fcd <= 0 && phase !== 'intro') {
          p.fcd = k.fire; p.gun ^= 1;
          const off = p.kind === 'walker' ? (p.gun ? 2.4 : -2.4) : p.kind === 'falcon' ? (p.gun ? 5 : -5) : (p.gun ? 2 : -2);
          const h = p.kind === 'walker' ? 30 : p.kind === 'falcon' ? 8 : 7;
          pshots.push({ u: p.u + 14, v: p.v + off, h, vu: p.sp + (p.kind === 'walker' ? 4.5 : 6), t: p.kind === 'walker' ? 60 : 48 });
          sfx.shot();
        }
        // terrain collisions
        if (p.kind === 'bike') {
          for (const t of trees) {
            if (Math.abs(t.u - p.u) < t.r + 4 && Math.abs(t.v - p.v) < t.r + 3) { crash(); return; }
          }
        } else if (p.kind === 'walker') {
          for (const t of trees) {
            const du = p.u - t.u, dv = p.v - t.v, rr = t.r + 7;
            if (Math.abs(du) < rr && Math.abs(dv) < rr) {
              const d = Math.hypot(du, dv) || 1;
              if (d < rr) {
                if (du < 0 && Math.abs(dv) < t.r) { p.u = pu0; p.sp = Math.min(p.sp, 0.2); p.v += (dv >= 0 ? 0.6 : -0.6); }
                else { p.v = pv0 + (dv >= 0 ? 0.3 : -0.3); }
              }
            }
          }
        } else if (isTunnel()) {
          const c = tC(p.u), hw = tHW(p.u), off = p.v - c;
          if (Math.abs(off) > hw - 9) {
            p.v = c + Math.sign(off) * (hw - 9); p.vv = -Math.sign(off) * 1.2;
            if (p.wallT <= 0) { p.wallT = 30; hurt(1); burst(p.u, p.v + Math.sign(off) * 8, 8, 10, ['#ffffff', '#ffe080', '#ff8040'], 1.4, 20); }
          }
        }
      }

      function killEnemy(e, how) {
        if (e.dead) return; e.dead = 1;
        const big = e.t === 'eatst';
        boom(e.u, e.v, e.t === 'tie' ? 12 : big ? 20 : 6, big);
        let pts = 0;
        if (e.t === 'ebike') pts = how === 'shot' ? PTS.bikeShot : how === 'crash' ? PTS.bikeCrash : PTS.bikeTrap;
        else if (e.t === 'eatst') pts = PTS.atst;
        else if (e.t === 'tie') pts = PTS.tie;
        else if (e.t === 'roll') pts = PTS.log;
        else if (e.t === 'pillar') pts = PTS.pillar;
        if (pts) { addScore(pts); pop(e.u, e.v, pts); }
        if (e.t !== 'roll' && e.t !== 'pillar') segKills++;
        if (how === 'trap' && Math.random() < 0.5) speak('leia', pick(['The Ewoks got that one!', 'Nice work, little friends!']));
        if (how === 'crash' && e.t === 'ebike' && Math.random() < 0.3) speak('leia', pick(['Right into the tree!', 'Scratch one scout!']));
      }

      function updateEnts() {
        const L = lvl, alive = phase !== 'dead' && phase !== 'tally' && phase !== 'won';
        for (const e of ents) {
          if (e.dead) continue;
          const du = e.u - p.u;
          switch (e.t) {
            case 'rope': {
              if (!e.up && p.u > e.u - 170) { e.up = 1; sfx.whoosh(); }
              const hit = b => b.u0 < e.u && b.u >= e.u && b.v > Math.min(e.v0, e.v1) && b.v < Math.max(e.v0, e.v1);
              if (e.up) {
                if (alive && hit({ u0: p.u - p.sp, u: p.u, v: p.v })) crash();
                for (const o of ents) if (o.t === 'ebike' && !o.dead && hit({ u0: o.u - o.sp, u: o.u, v: o.v })) killEnemy(o, 'trap');
              }
              break;
            }
            case 'rlog': {
              if (!e.go && p.u > e.u - 230) { e.go = 1; sfx.whoosh(); }
              if (e.go) { e.v += e.dir * e.spd; e.ph += e.spd * 0.12; }
              if (Math.abs(e.v) > 330) e.dead = 1;
              if (alive && Math.abs(p.u - e.u) < 21 && Math.abs(p.v - e.v) < 7) crash();
              for (const o of ents) if (o.t === 'ebike' && !o.dead && Math.abs(o.u - e.u) < 21 && Math.abs(o.v - e.v) < 7) killEnemy(o, 'trap');
              break;
            }
            case 'log':
              if (alive && p.kind === 'bike' && Math.abs(p.u - e.u) < 5 && Math.abs(p.v - e.v) < e.len / 2 + 3) crash();
              for (const o of ents) if (o.t === 'ebike' && !o.dead && Math.abs(o.u - e.u) < 5 && Math.abs(o.v - e.v) < e.len / 2 + 3) killEnemy(o, 'crash');
              break;
            case 'roll':
              e.u += e.vu; e.ph += 0.15;
              if (alive && p.kind === 'walker' && Math.abs(p.u - e.u) < 8 && Math.abs(p.v - e.v) < e.len / 2 + 5) {
                hurt(2); e.dead = 1; burst(e.u, e.v, 5, 18, ['#c89a62', '#7a4a28', '#5c341a'], 1.6, 40); sfx.bump();
              }
              for (const o of ents) if (o.t === 'ebike' && !o.dead && Math.abs(o.u - e.u) < 8 && Math.abs(o.v - e.v) < e.len / 2 + 4) killEnemy(o, 'trap');
              break;
            case 'ebike': updEbike(e, du, alive); break;
            case 'eatst': {
              e.u -= 0.35 + 0.03 * L; e.ph += 0.06;
              e.v += clamp(p.v - e.v, -0.25, 0.25);
              if (e.hit > 0) e.hit--;
              if (--e.fcd <= 0 && du > 30 && du < 280 && Math.abs(p.v - e.v) < 90) {
                e.fcd = Math.max(45, 110 - L * 8) + rnd(0, 40);
                const t = du / (2.2 + p.sp);
                for (const s of [-3, 3]) eshots.push({ u: e.u - 8, v: e.v + s, h: 28, vu: -2.2, vv: clamp((p.v - e.v) / Math.max(10, t), -1.2, 1.2), t: 160 });
                sfx.eshot();
              }
              if (alive && du < 26 && du > -10 && Math.abs(p.v - e.v) < 16) { p.u = e.u - 26; p.sp = Math.min(p.sp, 0.2); }
              break;
            }
            case 'glider': {
              e.v += e.vv; e.u += p.sp * 0.95;
              if (--e.drop <= 0 || ents.some(o => (o.t === 'ebike' || o.t === 'eatst') && !o.dead && Math.abs(o.u + (o.t === 'ebike' ? o.sp * 18 : -6) - e.u) < 14 && Math.abs(o.v - e.v) < 10)) {
                if (e.drop > -200) { ents.push({ t: 'rock', u: e.u, v: e.v, h: e.h - 2, vh: 0, vu: p.sp * 0.6 }); snd.tone(900, 0.3, { type: 'sine', vol: 0.05, slideTo: 300 }); }
                e.drop = rnd(70, 140);
              }
              if (Math.abs(e.v) > 280) e.dead = 1;
              break;
            }
            case 'rock':
              e.vh -= 0.12; e.h += e.vh; e.u += e.vu;
              if (e.h <= 0) {
                e.dead = 1; burst(e.u, e.v, 2, 10, ['#a09080', '#706050', '#504030'], 1.2, 30); snd.noise(0.15, { freq: 500, vol: 0.12 });
                for (const o of ents) if ((o.t === 'ebike' || o.t === 'eatst') && !o.dead && Math.abs(o.u - e.u) < 14 && Math.abs(o.v - e.v) < 14) {
                  if (o.t === 'eatst') { o.hp -= 3; o.hit = 8; if (o.hp <= 0) killEnemy(o, 'trap'); } else killEnemy(o, 'trap');
                }
                if (alive && Math.abs(p.u - e.u) < 9 && Math.abs(p.v - e.v) < 9) hurt(1);
              }
              break;
            case 'swing': {
              e.ph++; e.u += p.sp * 0.3;
              const t = e.ph / 120;
              e.v = e.side * 95 * Math.cos(t * Math.PI);
              e.hh = 8 + 26 * (1 - Math.sin(t * Math.PI));
              if (e.ph === 30) snd.melody([[N(79), .06], [N(84), .12]], { type: 'square', vol: 0.06 });
              if (e.hh < 18) for (const o of ents) if (o.t === 'ebike' && !o.dead && Math.abs(o.u - e.u) < 12 && Math.abs(o.v - e.v) < 10) killEnemy(o, 'trap');
              if (e.ph > 120) e.dead = 1;
              break;
            }
            case 'tie': updTie(e, du, alive); break;
            case 'pillar':
              if (alive && Math.abs(p.u - e.u) < 6 && Math.abs(p.v - e.v) < 7) { hurt(2); e.dead = 1; boom(e.u, e.v, 20, false); }
              break;
            case 'bunker': case 'reactor':
              if (e.hit > 0) e.hit--;
              break;
          }
          if (e.u < p.u - 240 && e.t !== 'bunker' && e.t !== 'reactor') e.dead = 1;
        }
        ents = ents.filter(e => !e.dead);
      }
      function updEbike(e, du, alive) {
        const L = lvl;
        if (e.on) {   // oncoming / passing in the walker stages
          e.u += e.sp;
          e.v += clamp(p.v + Math.sin(e.u / 40) * 30 - e.v, -0.8, 0.8);
        } else {
          const want = p.sp + clamp((e.tdu - du) * 0.02, -0.8, 1.4);
          e.sp += clamp(want - e.sp, -0.06, 0.06); e.u += e.sp;
          if (--e.ramT <= 0) { e.ram = Math.random() < 0.3 + 0.07 * L ? 1 : 0; e.ramT = rnd(60, 160); e.tdu = rnd(-25, 70); e.off = sgn() * rnd(16, 40); }
          let tv = e.ram ? p.v : p.v + e.off;
          const look = 30 + e.sp * 12, skill = 0.75 - 0.03 * Math.min(5, L);
          for (const t of trees) {
            const d = t.u - e.u;
            if (d > 3 && d < look && Math.abs(t.v - e.v) < t.r + 8) { if (Math.random() < skill || e.avoid) { e.avoid = t.v > e.v ? -1 : 1; } break; }
          }
          if (e.avoid) { tv = e.v + e.avoid * 30; if (Math.random() < 0.05) e.avoid = 0; }
          if (!e.kv) e.v += clamp(tv - e.v, -1.3, 1.3);
        }
        if (e.kv) { e.v += e.kv; e.kv *= 0.9; if (Math.abs(e.kv) < 0.25) e.kv = 0; }
        if (e.bumped > 0) e.bumped--;
        for (const t of trees) if (Math.abs(t.u - e.u) < t.r + 3 && Math.abs(t.v - e.v) < t.r + 3) { killEnemy(e, 'crash'); return; }
        if (Math.abs(e.v) > 200) { killEnemy(e, 'crash'); return; }
        if (--e.fcd <= 0) {
          e.fcd = Math.max(60, 140 - L * 10) + rnd(0, 50);
          if (Math.abs(e.v - p.v) < 50 && alive) {
            if (du > 20 && du < 220) { const vu = (e.on ? e.sp : e.sp) - 2.6; const t = du / Math.max(1, p.sp - vu); eshots.push({ u: e.u - 6, v: e.v, h: 7, vu, vv: clamp((p.v - e.v) / t, -1, 1), t: 120 }); sfx.eshot(); }
            else if (du < -15 && du > -130 && !e.on) { const vu = e.sp + 3; const t = -du / Math.max(1, vu - p.sp); eshots.push({ u: e.u + 8, v: e.v, h: 7, vu, vv: clamp((p.v - e.v) / t, -1, 1), t: 120 }); sfx.eshot(); }
          }
        }
        if (!alive) return;
        if (p.kind === 'bike' && Math.abs(du) < 11 && Math.abs(e.v - p.v) < 10) {
          const s = Math.sign(e.v - p.v) || 1;
          const ramming = s * p.vv > 0.4;
          e.kv = s * (2.6 + Math.max(0, s * p.vv) * 1.6); e.bumped = 60;
          p.v -= s * 2.5; p.vv = -s * 0.6;
          if (p.bumpT <= 0) { p.bumpT = 30; sfx.bump(); if (!ramming) hurt(1); }
        } else if (p.kind === 'walker' && Math.abs(du) < 10 && Math.abs(e.v - p.v) < 11) {
          killEnemy(e, 'crash'); hurt(1);
        }
      }
      function updTie(e, du, alive) {
        const L = lvl;
        e.w += 0.05;
        if (e.tun) {
          e.life++;
          if (e.behind && du > 50 + (e.w % 3) * 20 && e.life < 420) e.vu += (p.sp - e.vu) * 0.05;
          else if (e.life >= 420) e.vu += 0.03;
          e.u += e.vu;
          const tv = tC(e.u) + Math.sin(e.w) * tHW(e.u) * 0.5;
          e.vv = clamp(tv - e.v, -1.2, 1.2); e.v += e.vv;
        } else {
          e.u += e.vu;
          if (!e.behind) {
            if (du < 150 && !e.st) { e.st = 1; e.vv = clamp((p.v - e.v) * 0.012, -1.2, 1.2); }
            if (!e.st) e.vv = Math.sin(e.w) * 0.6;
          } else {
            if (du > 140 && !e.st) { e.st = 1; e.vu = p.sp - 1.2; }
            e.vv = clamp((p.v - e.v) * 0.01 + Math.sin(e.w) * 0.5, -1, 1);
          }
          e.v += e.vv;
        }
        if (--e.fcd <= 0 && alive) {
          e.fcd = Math.max(40, 100 - L * 8) + rnd(0, 50);
          if (Math.abs(e.v - p.v) < 70) {
            if (du > 25 && du < 260) { const vu = e.vu - 2.8, t = du / Math.max(1, p.sp - vu); eshots.push({ u: e.u - 6, v: e.v, h: 10, vu, vv: clamp((p.v - e.v) / t, -1.2, 1.2), t: 130, g: 1 }); sfx.eshot(); }
            else if (du < -25 && du > -150) { const vu = e.vu + 3, t = -du / Math.max(1, vu - p.sp); eshots.push({ u: e.u + 6, v: e.v, h: 10, vu, vv: clamp((p.v - e.v) / t, -1.2, 1.2), t: 130, g: 1 }); sfx.eshot(); }
          }
        }
        if (e.u > p.u + 460 || e.u < p.u - 230) e.dead = 1;
        if (alive && Math.abs(du) < 8 && Math.abs(e.v - p.v) < 9) { hurt(2); killEnemy(e, 'crash'); }
      }

      function updateShots() {
        const alive = phase !== 'dead' && phase !== 'tally' && phase !== 'won';
        for (const s of pshots) {
          s.u += s.vu; s.t--;
          if (p.kind !== 'falcon') for (const t of trees) if (Math.abs(t.u - s.u) < t.r && Math.abs(t.v - s.v) < t.r && s.u > p.u + 6) { s.t = 0; burst(s.u, s.v, s.h, 3, ['#ffe080', '#ff8040'], 0.6, 10); break; }
          if (s.t <= 0) continue;
          for (const e of ents) {
            if (e.dead) continue;
            let hit = false;
            switch (e.t) {
              case 'ebike': hit = Math.abs(e.u - s.u) < 9 && Math.abs(e.v - s.v) < 6; if (hit) killEnemy(e, 'shot'); break;
              case 'eatst': hit = Math.abs(e.u - s.u) < 10 && Math.abs(e.v - s.v) < 10; if (hit) { e.hp--; e.hit = 6; snd.noise(0.05, { freq: 3000, vol: 0.08 }); if (e.hp <= 0) killEnemy(e, 'shot'); } break;
              case 'roll': hit = Math.abs(e.u - s.u) < 8 && Math.abs(e.v - s.v) < e.len / 2; if (hit) { e.hp--; burst(s.u, s.v, 5, 4, ['#c89a62', '#7a4a28'], 0.8, 16); if (e.hp <= 0) { killEnemy(e, 'shot'); } } break;
              case 'tie': hit = Math.abs(e.u - s.u) < 9 && Math.abs(e.v - s.v) < 8; if (hit) killEnemy(e, 'shot'); break;
              case 'pillar': hit = Math.abs(e.u - s.u) < 6 && Math.abs(e.v - s.v) < 6; if (hit) { e.hp--; burst(s.u, s.v, 12, 4, SPARK, 0.8, 12); if (e.hp <= 0) killEnemy(e, 'shot'); } break;
              case 'bunker':
                hit = s.u > e.u - 30 && Math.abs(e.v - s.v) < 40;
                if (hit && e.hp > 0 && alive) {
                  e.hp--; e.hit = 6; burst(e.u - 26, s.v, rnd(4, 16), 5, FIRE, 1, 18); snd.noise(0.08, { freq: 1800, vol: 0.1 });
                  if (e.hp <= 0) bossDown(e);
                }
                break;
              case 'reactor':
                hit = s.u > e.u - 20 && Math.abs(e.v - s.v) < 20;
                if (hit && e.hp > 0 && alive) {
                  e.hp--; e.hit = 6; burst(e.u - 16, s.v, rnd(10, 50), 6, SPARK, 1, 18); snd.tone(1800, 0.06, { type: 'square', vol: 0.06, slideTo: 900 });
                  if (e.hp <= 0) bossDown(e);
                }
                break;
            }
            if (hit) { s.t = 0; break; }
          }
        }
        pshots = pshots.filter(s => s.t > 0);
        for (const s of eshots) {
          s.u += s.vu; s.v += s.vv; s.t--;
          if (alive && Math.abs(s.u - p.u) < 6 && Math.abs(s.v - p.v) < 6) { s.t = 0; hurt(1); }
        }
        eshots = eshots.filter(s => s.t > 0);
      }
      function bossDown(e) {
        boom(e.u - 10, e.v, 20, true);
        for (let i = 0; i < 6; i++) burst(e.u + rnd(-20, 20), e.v + rnd(-30, 30), rnd(5, 40), 20, FIRE, 2, 70);
        flash = 20; shake = 30;
        if (e.t === 'bunker') { addScore(PTS.generator); pop(e.u, e.v, PTS.generator); speak('leia', 'The generator is down! The shield is collapsing!', true); }
        else { addScore(PTS.reactor); pop(e.u, e.v, PTS.reactor); speak('pilot', 'Direct hit on the reactor! Full throttle, get us out!', true); }
        phase = 'won'; phaseT = 0; wonT = 0;
      }

      function updateParts() {
        for (const q of parts) { q.u += q.vu; q.v += q.vv; q.h += q.vh; q.vh -= q.g; if (q.h < 0) { q.h = 0; q.vh *= -0.3; q.vu *= 0.7; q.vv *= 0.7; } q.t++; }
        parts = parts.filter(q => q.t < q.T);
        if (parts.length > 500) parts.splice(0, parts.length - 500);
        for (const q of pops) { q.t--; q.h += 0.3; }
        pops = pops.filter(q => q.t > 0);
      }

      function updateWorld() {
        phaseT++;
        readInput();
        if (phase === 'roundcard') {
          if (phaseT > 200) startRound();
          return;
        }
        if (phase === 'tally') { updateTally(); updateParts(); return; }
        updatePlayer();
        camU += (p.u - camU) * 0.5;
        camV += (p.v * 0.7 - camV) * 0.08;
        if (isTunnel()) camV += ((p.v * 0.4 + tC(p.u + 120) * 0.6) - camV) * 0.05;
        if (p.kind !== 'falcon') while (spawnU < p.u + 440) spawnRow(spawnU, false);
        if (phase !== 'intro' && phase !== 'won') {
          while (eventU < p.u + 400 && (seg !== 'space')) { const u = eventU; spawnEvent(u); if (eventU <= u) eventU = u + 200; }
          if (phase !== 'dead') spawnEnemies();
        }
        trees = trees.filter(t => t.u > p.u - 200);
        ferns = ferns.filter(t => t.u > p.u - 200);
        updateEnts(); updateShots(); updateParts();
        musicTick();
        if (phase === 'intro' && phaseT > 170) { phase = 'run'; phaseT = 0; eventU = Math.max(eventU, p.u + 300); }
        // boss arenas
        if (seg === 'walker2' && !boss && p.u > segLen - 260) {
          boss = { t: 'bunker', u: segLen + 120, v: 0, hp: 16 + 3 * Math.min(6, lvl), max: 0, hit: 0 }; boss.max = boss.hp;
          ents.push(boss); clearPath(segLen - 120, segLen + 300);
        }
        if (seg === 'walker2' && boss && boss.hp > 0 && p.u > boss.u - 150) sayOnce('gen' + lvl, 'leia', 'There is the bunker. Blast that door!', true);
        if (seg === 'tunnel' && !escaping && !boss && p.u > segLen - 300) {
          boss = { t: 'reactor', u: segLen + 130, v: 0, hp: 10 + 2 * Math.min(6, lvl), max: 0, hit: 0 }; boss.max = boss.hp;
          ents.push(boss); ents = ents.filter(e => e.t !== 'pillar' || e.u < segLen - 300);
        }
        if (seg === 'tunnel' && boss && boss.hp > 0 && p.u > boss.u - 260) sayOnce('reac' + lvl, 'pilot', 'There is the main reactor! Pour it on!', true);
        if (phase === 'dead') {
          if (phaseT === 110) {
            if (lives > 0) respawn();
            else if (demo) { endDemo(); }
            else if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); speak('cmd', 'Back in the fight. Shields restored.', true); }, finishGame);
            else finishGame();
          }
          return;
        }
        if (phase === 'won') {
          wonT++;
          if (wonT % 9 === 0 && wonT < 90 && boss) burst(boss.u + rnd(-20, 20), boss.v + rnd(-30, 30), rnd(5, 50), 14, FIRE, 1.8, 50);
          if (wonT > 120) {
            if (seg === 'tunnel' && !escaping) startEscape();
            else if (seg === 'tunnel' && escaping) segDone();
            else segDone();
          }
          return;
        }
        // escape fireball
        if (escaping && phase === 'escape') {
          const fs = Math.min(K().max - 0.25, cruise() + 0.15 + 0.05 * lvl);
          fireU += fs;
          if (fireU < p.u - 280) fireU = p.u - 280;
          if (phaseT % 6 === 0) burst(fireU + rnd(-10, 10), tC(fireU) + rnd(-50, 50), rnd(0, 20), 3, FIRE, 1.5, 30);
          if (fireU > p.u - 40) sayOnce('fire' + lives + '_' + lvl, 'pilot', 'The fireball is right behind us! Faster!', false);
          if (fireU >= p.u - 6) { crash(); return; }
          if (p.u >= segLen) { phase = 'won'; phaseT = 0; wonT = 0; boss = null; flash = 30; shake = 40; speak('pilot', 'We made it out! The station is going up!', true); snd.noise(2.0, { vol: 0.3, freq: 700, slideTo: 40 }); }
          return;
        }
        if (!boss && p.u >= segLen && (seg === 'bike' || seg === 'walker' || seg === 'space')) {
          if (seg === 'bike') speak('leia', 'Trail is clear. On to the bunker!', true);
          if (seg === 'walker') speak('wook', 'HRRRAWWGH! (Walker on the move!)', true);
          if (seg === 'space') speak('cmd', 'The shield is still up! Pull back and regroup!', true);
          segDone();
        }
        // situational callouts
        if (seg === 'bike' && phase === 'run' && phaseT === 600) sayOnce('trap' + lvl, 'leia', 'Watch for Ewok traps! They will catch the scouts too!');
        if ((seg === 'walker' || seg === 'walker2') && ents.some(e => e.t === 'roll' && e.u - p.u < 260)) sayOnce('logs' + seg + lvl, 'cmd', 'Logs rolling down the trail! Shoot or sidestep!');
        if (seg === 'space' && phaseT === 900) sayOnce('sp2' + lvl, 'cmd', 'Keep them busy. The ground team needs more time!');
      }
      function startEscape() {
        escaping = true; boss = null; newTunnel(true);
        p.u = 0; p.v = tC(0); p.sp = cruise(); p.vv = 0; camU = 0;
        segLen = 3800 + lvl * 150; fireU = -230; eventU = 220; enemyT = 400;
        ents = []; pshots = []; eshots = [];
        phase = 'escape'; phaseT = 0; musicStart('escape');
      }
      function updateTally() {
        const T = tally;
        T.t++;
        if (T.i < T.lines.length) {
          const ln = T.lines[T.i];
          if (T.t > 30) {
            if (T.shown < ln.n) { if (T.t % 4 === 0) { T.shown++; addScore(ln.k); snd.tone(1200 + T.shown * 20, 0.03, { type: 'square', vol: 0.06 }); } }
            else if (T.t > 30 + ln.n * 4 + 30) { T.i++; T.shown = 0; T.t = 0; }
          }
        } else if (T.t > 120 || (T.t > 30 && !demo && !auto && api.anyPressed('Space', 'Enter', 'KeyX'))) { tally = null; nextSeg(); }
      }

      // ---------- game over / scores ----------
      function finishGame() {
        api.setHiScore(score);
        lastRank = -1; music = null;
        if (score > table[table.length - 1].s) { mode = 'initials'; modeT = 0; initials = { l: [0, 0, 0], pos: 0 }; }
        else { mode = 'gameover'; modeT = 0; }
      }
      function commitInitials() {
        const e = { n: initials.l.map(i => ALPHA[i]).join(''), s: score };
        table.push(e); table.sort((a, b) => b.s - a.s); table.length = 8;
        lastRank = table.indexOf(e); mode = 'gameover'; modeT = 120;
      }
      function attractInit(st) { mode = 'attract'; att = st || 'title'; attT = 0; demo = false; auto = false; music = null; if (att === 'title') themeTune(0.2); }
      function startDemo() {
        demo = true; auto = true; demoN++;
        lvl = 1 + (demoN >> 2); score = 0; lives = 1;
        order = ['bike', 'walker', 'space', 'tunnel'];
        startSeg((demoN - 1) % 4);
        sub = null;
        mode = 'attract'; att = 'demo'; attT = 0;
      }
      function endDemo() { demo = false; auto = false; attractInit('points'); }

      // ---------- main update ----------
      function update() {
        modeT++;
        if (coinFlash > 0) coinFlash--;
        if (shake > 0) shake--;
        if (flash > 0) flash--;
        if (sub && --sub.t <= 0) sub = null;
        if (mode === 'attract') {
          attT++;
          if (att === 'demo') { updateWorld(); if (attT > 60 * 22 || phase === 'tally') endDemo(); }
          else {
            for (const s of stars) { s.x += s.z * 0.3; s.y += s.z * 0.21; if (s.x > W) s.x -= W; if (s.y > H) s.y -= H; }
            if (att === 'title' && attT > 540) { att = 'scores'; attT = 0; }
            else if (att === 'scores' && attT > 420) startDemo();
            else if (att === 'points' && attT > 480) { att = 'title'; attT = 0; themeTune(0.1); }
          }
          const start = api.pressed('Enter') || (api.pressed('Space') && att !== 'demo' && attT > 20);
          if (start) {
            if (api.useCredit()) { demo = false; auto = false; A.tone(660, 0.1, { type: 'square', vol: 0.15 }); newGame(); }
            else { coinFlash = 150; A.tone(70, 0.3, { type: 'square', vol: 0.3 }); }
          }
          return;
        }
        if (mode === 'play') { updateWorld(); return; }
        if (mode === 'initials') {
          const I = initials;
          if (api.pressed('ArrowUp')) { I.l[I.pos] = (I.l[I.pos] + 1) % ALPHA.length; A.tone(500, 0.04, { vol: 0.1 }); }
          if (api.pressed('ArrowDown')) { I.l[I.pos] = (I.l[I.pos] + ALPHA.length - 1) % ALPHA.length; A.tone(450, 0.04, { vol: 0.1 }); }
          if (api.pressed('ArrowLeft') && I.pos > 0) I.pos--;
          const ok = api.pressed('Space') || api.pressed('Enter') || api.pressed('KeyX') || api.pressed('ArrowRight');
          if (ok && modeT > 10) { A.tone(880, 0.06, { vol: 0.12 }); if (++I.pos >= 3) commitInitials(); }
          else if (modeT > 60 * 30) commitInitials();
          return;
        }
        if (mode === 'gameover') {
          if (modeT > 300 || (modeT > 90 && api.anyPressed('Enter', 'Space'))) attractInit(lastRank >= 0 ? 'scores' : 'title');
        }
      }

      // ---------- drawing: backgrounds ----------
      function drawForest(ctx) {
        rect(ctx, 0, 0, W, H, '#16300f');
        const pw = SD.pw, u0 = camU - 260, u1 = camU + 600;
        poly(ctx, [[sx(u0, -pw - 6), sy(u0, -pw - 6)], [sx(u1, -pw - 6), sy(u1, -pw - 6)], [sx(u1, pw + 6), sy(u1, pw + 6)], [sx(u0, pw + 6), sy(u0, pw + 6)]], '#3c3a20');
        poly(ctx, [[sx(u0, -pw), sy(u0, -pw)], [sx(u1, -pw), sy(u1, -pw)], [sx(u1, pw), sy(u1, pw)], [sx(u0, pw), sy(u0, pw)]], '#5e4c2e');
        // bunker apron
        if (seg === 'walker2') {
          const a0 = segLen - 120, a1 = segLen + 300;
          if (a0 < u1) poly(ctx, [[sx(a0, -90), sy(a0, -90)], [sx(a1, -90), sy(a1, -90)], [sx(a1, 90), sy(a1, 90)], [sx(a0, 90), sy(a0, 90)]], '#6a6a5c');
        }
        // ground detail in world-anchored cells
        const cs = 14, cu0 = Math.floor((camU - 200) / cs), cu1 = Math.floor((camU + 460) / cs);
        for (let cu = cu0; cu <= cu1; cu++) {
          const u = cu * cs;
          const vA = Math.floor((camV - 260 + (u - camU) * 0) / cs), vB = vA + 40;
          for (let cv = vA; cv <= vB; cv++) {
            const hsh = hash2(cu, cv);
            if (hsh > 0.55) continue;
            const v = cv * cs + hash2(cv, cu) * cs, uu = u + hash2(cu * 3, cv) * cs;
            const x = sx(uu, v), y = sy(uu, v);
            if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue;
            const onPath = Math.abs(v) < pw;
            if (onPath) { ctx.fillStyle = hsh < 0.2 ? '#7a6440' : hsh < 0.35 ? '#4a3a22' : '#6a5634'; ctx.fillRect(x | 0, y | 0, hsh < 0.1 ? 2 : 1, 1); }
            else { ctx.fillStyle = hsh < 0.18 ? '#2e5a1e' : hsh < 0.36 ? '#0e2008' : '#22451a'; ctx.fillRect(x | 0, y | 0, 2, 1); if (hsh < 0.08) { ctx.fillStyle = '#4a7a2a'; ctx.fillRect(x | 0, (y | 0) - 1, 1, 1); } }
          }
        }
        for (const f of ferns) { const x = sx(f.u, f.v), y = sy(f.u, f.v); if (onScreen(x, y, 20)) ctx.drawImage(ART.fern[f.k], Math.round(x - 9), Math.round(y - 7)); }
      }
      function drawSpace(ctx) {
        rect(ctx, 0, 0, W, H, '#02020c');
        for (const s of stars) {
          const x = ((s.x - camU * FX * s.z * 0.5 - camV * RX * s.z * 0.3) % W + W) % W;
          const y = ((s.y - camU * FY * s.z * 0.5 - camV * RY * s.z * 0.3) % H + H) % H;
          ctx.fillStyle = s.c; ctx.fillRect(x | 0, y | 0, s.z > 0.8 ? 2 : 1, 1);
        }
        const dx = 6 - ((camU * 0.02) % 40), dy = 4 - ((camU * 0.012) % 30);
        ctx.drawImage(ART.ds, Math.round(dx), Math.round(dy));
        // the energy shield shimmer around the station while it is still up
        if (seg === 'space') {
          for (let i = 0; i < 26; i++) {
            const a = i / 26 * TAU + api.frame * 0.01, r = 66 + Math.sin(api.frame * 0.05 + i) * 2;
            if ((i + (api.frame >> 3)) % 3) continue;
            ctx.fillStyle = '#40ff80'; ctx.fillRect(Math.round(dx + 59 + Math.cos(a) * r), Math.round(dy + 59 + Math.sin(a) * r), 1, 1);
          }
        }
        for (let i = 0; i < 3; i++) {
          const x = ((200 + i * 90 - camU * 0.06 * (1 + i * 0.3)) % 380 + 380) % 380 - 60, y = 150 + i * 30 - ((camU * 0.04 * (1 + i * 0.3)) % 260);
          ctx.drawImage(ART.cruiser, Math.round(x), Math.round(((y % 300) + 300) % 300 - 40));
        }
      }
      function drawTunnel(ctx) {
        const hot = escaping;
        rect(ctx, 0, 0, W, H, hot ? '#2a1a1a' : '#24242e');
        const WH = 22, WL = 6;
        const u0 = Math.floor((camU - 220) / 12) * 12, u1 = camU + 520;
        // superstructure greebles on the plateau
        const cs = 18;
        for (let cu = Math.floor(u0 / cs); cu <= u1 / cs; cu++) {
          const u = cu * cs, c = tC(u), hw = tHW(u);
          for (let cv = Math.floor((camV - 280) / cs); cv <= (camV + 280) / cs; cv++) {
            const v = cv * cs;
            if (Math.abs(v - c) < hw + 10) continue;
            const hsh = hash2(cu + 900, cv);
            if (hsh > 0.5) continue;
            const hh = v > c ? WH : WL, x = sx(u, v), y = sy(u, v, hh);
            if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
            ctx.fillStyle = hsh < 0.12 ? '#3a3a48' : hsh < 0.3 ? '#191920' : '#30303c';
            ctx.fillRect(x | 0, y | 0, 6 + (hsh * 20 | 0) % 6, 3);
            if (hsh < 0.04) { ctx.fillStyle = (api.frame >> 4) % 2 ? '#ffd060' : '#a07020'; ctx.fillRect((x | 0) + 1, (y | 0) + 1, 1, 1); }
          }
        }
        const L = [], R = [], Lt = [], Rt = [];
        for (let u = u0; u <= u1; u += 12) {
          const c = tC(u), hw = tHW(u);
          L.push([sx(u, c - hw), sy(u, c - hw)]); R.push([sx(u, c + hw), sy(u, c + hw)]);
          Lt.push([sx(u, c - hw), sy(u, c - hw, WL)]); Rt.push([sx(u, c + hw), sy(u, c + hw, WH)]);
        }
        poly(ctx, Lt.concat(Rt.slice().reverse()), hot ? '#6a3a30' : '#5a5a6a');                     // right wall face
        poly(ctx, L.concat(R.slice().reverse()), hot ? '#4a2c24' : '#3e3e4a');                        // floor
        poly(ctx, L.concat(Lt.slice().reverse()), hot ? '#8a5040' : '#70707e');                       // left lip
        for (let u = Math.ceil(u0 / 24) * 24; u <= u1; u += 24) {
          const c = tC(u), hw = tHW(u);
          line(ctx, sx(u, c + hw), sy(u, c + hw), sx(u, c + hw), sy(u, c + hw, WH), hot ? '#4a2a22' : '#44444f', 1);
          ctx.fillStyle = hot ? '#ff9040' : ((u / 24 + (api.frame >> 3)) % 4 === 0 ? '#ffe080' : '#8a7a50');
          ctx.fillRect(Math.round(sx(u, c + hw)), Math.round(sy(u, c + hw, 13)), 2, 1);
        }
        for (let u = Math.ceil(u0 / 40) * 40; u <= u1; u += 40) {
          const c = tC(u), hw = tHW(u);
          line(ctx, sx(u, c - hw), sy(u, c - hw), sx(u, c + hw), sy(u, c + hw), hot ? '#3a2018' : '#33333e', 1);
          ctx.fillStyle = (u / 40 + (api.frame >> 2)) % 6 === 0 ? '#80e0ff' : '#305070';
          ctx.fillRect(Math.round(sx(u, c)), Math.round(sy(u, c)), 2, 1);
        }
        for (let i = 0; i < Rt.length - 1; i++) { ctx.fillStyle = hot ? '#a06040' : '#8a8a9a'; ctx.fillRect(Math.round(Rt[i][0]), Math.round(Rt[i][1]), 9, 1); }
        // reactor chamber floor rings
        if (boss && boss.t === 'reactor') {
          for (let r = 40; r <= 100; r += 30) {
            for (let a = 0; a < TAU; a += 0.08) {
              const u = boss.u + Math.cos(a) * r, v = boss.v + Math.sin(a) * r;
              ctx.fillStyle = '#5a6a8a'; ctx.fillRect(Math.round(sx(u, v)), Math.round(sy(u, v)), 2, 1);
            }
          }
        }
      }
      function drawFire(ctx) {
        if (!escaping || fireU < camU - 300) return;
        const u = fireU, far = fireU - 600;
        poly(ctx, [[sx(u, -500), sy(u, -500)], [sx(u, 500), sy(u, 500)], [sx(far, 500), sy(far, 500)], [sx(far, -500), sy(far, -500)]], (api.frame >> 2) % 2 ? '#ff6020' : '#ff8030');
        for (let v = -200; v <= 200; v += 9) {
          const vv = v + camV, hh = 10 + 30 * Math.abs(Math.sin(vv * 0.13 + api.frame * 0.3));
          const x = sx(u, vv), y = sy(u, vv);
          if (x < -10 || x > W + 10) continue;
          rect(ctx, x - 4, y - hh, 8, hh, '#ff9030');
          rect(ctx, x - 2, y - hh * 0.7, 4, hh * 0.7, '#ffe070');
        }
      }

      // ---------- drawing: objects ----------
      function shadow(ctx, u, v, rx, ry) { ctx.globalAlpha = 0.35; oval(ctx, sx(u, v), sy(u, v), rx, ry, '#000'); ctx.globalAlpha = 1; }
      function drawWalker(ctx, u, v, ph, chewie, hitT) { drawWalkerAt(ctx, sx(u, v), sy(u, v), ph, chewie, hitT, true); }
      function drawWalkerAt(ctx, bx, by, ph, chewie, hitT, shad) {
        const P = (du, dv, h) => [bx + du * FX + dv * RX, by + du * FY + dv * RY - (h || 0)];
        const legs = [[1, '#5c5c64'], [-1, '#8c8c96']];
        if (shad) { ctx.globalAlpha = 0.35; oval(ctx, bx, by, 13, 5, '#000'); ctx.globalAlpha = 1; }
        for (let i = 0; i < 2; i++) {
          const s = legs[i][0], col = legs[i][1], q = i ? ph + Math.PI : ph;
          const fa = Math.sin(q) * 7, fh = Math.max(0, Math.cos(q)) * 3;
          const [hx, hy] = P(0, s * 5, 20), [kx, ky] = P(fa * 0.5 - 6, s * 5.5, 11 + fh * 0.5), [fx, fy] = P(fa, s * 6, fh);
          line(ctx, hx, hy, kx, ky, col, 3); line(ctx, kx, ky, fx, fy, col, 2);
          rect(ctx, kx - 1, ky - 1, 3, 3, '#4a4a52');
          rect(ctx, fx - 4, fy - 1, 8, 3, '#3a3a42'); rect(ctx, fx - 3, fy - 2, 6, 1, col);
        }
        blit(ctx, chewie ? ART.atstC : ART.atstE, bx, by);
        if (hitT > 0 && hitT % 2) { ctx.globalAlpha = 0.6; oval(ctx, bx, by - 31, 11, 7, '#ffffff'); ctx.globalAlpha = 1; }
      }
      function drawBike(ctx, u, v, scout, bob) {
        shadow(ctx, u, v, 11, 4);
        const art = scout ? ART.bikeS : ART.bikeL;
        blit(ctx, art, sx(u, v), sy(u, v, 2 + Math.sin(bob) * 0.8));
        if ((api.frame >> 1) & 1) { const x = sx(u - 15, v), y = sy(u - 15, v, 6); rect(ctx, x - 1, y - 1, 2, 2, '#ffd080'); }
      }
      function drawObj(ctx, o) {
        const x = sx(o.u, o.v), y = sy(o.u, o.v);
        switch (o.t) {
          case 'tree': { const a = ART.trees[o.k]; ctx.drawImage(a.c, Math.round(x - a.ox), Math.round(y - a.oy)); break; }
          case 'player':
            if (phase === 'dead') return;
            if (p.inv > 0 && (p.inv >> 2) % 2) return;
            if (p.kind === 'bike') drawBike(ctx, p.u, p.v, false, p.ph);
            else if (p.kind === 'walker') drawWalker(ctx, p.u, p.v, p.ph, true, p.hurtT);
            else { shadow(ctx, p.u, p.v, 16, 6); blit(ctx, ART.falcon, x, y - 8 - Math.sin(p.ph * 0.5)); const ex = sx(p.u - 13, p.v), ey = sy(p.u - 13, p.v, 10); if ((api.frame >> 1) & 1) rect(ctx, ex - 2, ey - 1, 4, 2, '#c0f0ff'); }
            if (p.hurtT > 10) { ctx.globalAlpha = 0.5; oval(ctx, x, y - 10, 14, 9, '#ff4040'); ctx.globalAlpha = 1; }
            break;
          case 'ebike':
            if (o.on) { shadow(ctx, o.u, o.v, 11, 4); blit(ctx, ART.bikeS, x, y - 2); }
            else drawBike(ctx, o.u, o.v, true, o.u * 0.1);
            break;
          case 'eatst': drawWalker(ctx, o.u, o.v, o.ph, false, o.hit); break;
          case 'log': blit(ctx, ART.flog, x, y); break;
          case 'roll': blit(ctx, ART.roll[o.big][Math.floor(o.ph) & 3], x, y); break;
          case 'rlog': {
            blit(ctx, ART.cross[Math.floor(o.ph) & 3], x, y);
            break;
          }
          case 'rope': {
            const a0 = Math.min(o.v0, o.v1), a1 = Math.max(o.v0, o.v1), h = o.up ? 7 : 0;
            const ex = [a0, a1].map(v => [sx(o.u, v), sy(o.u, v)]);
            line(ctx, ex[0][0], ex[0][1] - h, ex[1][0], ex[1][1] - h, o.up ? '#d8c088' : '#7a6a48', 1);
            if (o.up) line(ctx, ex[0][0], ex[0][1] - h + 1, ex[1][0], ex[1][1] - h + 1, '#8a7040', 1);
            for (const v of [a0, a1]) if (Math.abs(v) < 160) ctx.drawImage(ART.ewok, Math.round(sx(o.u, v) - 3), Math.round(sy(o.u, v) - 9));
            break;
          }
          case 'tie': shadow(ctx, o.u, o.v, 8, 3); blit(ctx, ART.tie, x, y - o.h + 4); break;
          case 'pillar': shadow(ctx, o.u, o.v, 7, 3); blit(ctx, ART.pillar, x, y); break;
          case 'glider': {
            const gx = sx(o.u, o.v), gy = sy(o.u, o.v);
            ctx.globalAlpha = 0.25; oval(ctx, gx, gy, 9, 3, '#000'); ctx.globalAlpha = 1;
            blit(ctx, ART.glider, gx, gy - o.h + Math.sin(api.frame * 0.1) * 2);
            break;
          }
          case 'rock': shadow(ctx, o.u, o.v, 4, 2); oval(ctx, x, y - o.h, 3, 2, '#8a8070'); rect(ctx, x - 2, y - o.h - 2, 2, 1, '#b0a898'); break;
          case 'swing': {
            const ax = sx(o.u, o.side * 100), ay = sy(o.u, o.side * 100, 120);
            const ex = sx(o.u, o.v), ey = sy(o.u, o.v, o.hh || 20);
            line(ctx, ax, ay, ex, ey - 8, '#4a6a2a', 1);
            ctx.globalAlpha = 0.3; oval(ctx, x, y, 5, 2, '#000'); ctx.globalAlpha = 1;
            ctx.drawImage(ART.ewok, Math.round(ex - 3), Math.round(ey - 9));
            break;
          }
          case 'bunker': {
            blit(ctx, ART.bunker, x, y);
            if (o.hp > 0) {
              const dx = sx(o.u - 24, o.v), dy = sy(o.u - 24, o.v, 7);
              if ((api.frame >> 3) % 2) rect(ctx, dx - 2, dy - 2, 4, 3, o.hit ? '#ffffff' : '#ff3020');
            } else {
              for (let k = 0; k < 7; k++) {
                const fx = sx(o.u - 20 + (k % 3) * 14, o.v - 30 + k * 10), fy = sy(o.u - 20 + (k % 3) * 14, o.v - 30 + k * 10, 22);
                const fh = 4 + ((api.frame + k * 5) >> 2) % 5;
                rect(ctx, fx - 2, fy - fh, 4, fh, (api.frame + k) % 4 < 2 ? '#ff7020' : '#ffd040');
                ctx.globalAlpha = 0.5; oval(ctx, fx + 2, fy - fh - 6 - ((api.frame + k * 9) % 20), 4, 3, '#303030'); ctx.globalAlpha = 1;
              }
            }
            break;
          }
          case 'reactor': {
            if (o.hp > 0) {
              blit(ctx, ART.reactor, x, y);
              const pulse = (api.frame >> 2) % 4;
              for (let k = 0; k < 4; k++) rect(ctx, x - 8 + k * 4, y - 66 - 12 + ((k + pulse) % 4), 3, 2, o.hit ? '#ffffff' : '#a0e0ff');
              ctx.globalAlpha = 0.25 + 0.15 * Math.sin(api.frame * 0.2); oval(ctx, x, y - 50, 16, 30, '#80c0ff'); ctx.globalAlpha = 1;
            } else { oval(ctx, x, y, 26, 13, '#100808'); oval(ctx, x, y, 18, 9, (api.frame >> 2) % 2 ? '#ff6020' : '#ffd040'); }
            break;
          }
        }
      }
      function drawWorld(ctx) {
        const shx = shake ? Math.round(rnd(-2, 2)) : 0, shy = shake ? Math.round(rnd(-2, 2)) : 0;
        const ocu = camU, ocv = camV;
        camU -= shx * 0.7 + shy; camV += shx * 0.7 - shy;   // shake by nudging the camera
        if (p.kind === 'falcon' && !isTunnel()) drawSpace(ctx);
        else if (isTunnel()) drawTunnel(ctx);
        else drawForest(ctx);
        const list = [];
        for (const t of trees) {
          const x = sx(t.u, t.v), y = sy(t.u, t.v);
          if (x > -16 && x < W + 16 && y > -4 && y < H + 110) list.push({ o: t, d: t.u + t.v, tree: 1 });
        }
        for (const e of ents) {
          const x = sx(e.u, e.v), y = sy(e.u, e.v);
          if (e.t === 'rope' || e.t === 'bunker' || e.t === 'reactor' || e.t === 'swing' || onScreen(x, y, 60)) list.push({ o: e, d: e.u + e.v + (e.t === 'glider' ? -400 : 0) });
        }
        if (mode === 'play' || att === 'demo') list.push({ o: { t: 'player', u: p.u, v: p.v }, d: p.u + p.v });
        list.sort((a, b) => b.d - a.d);
        const pd = p.u + p.v, px = sx(p.u, p.v), py = sy(p.u, p.v);
        for (const it of list) {
          if (it.tree) {
            const t = it.o, a = ART.trees[t.k], x = sx(t.u, t.v), y = sy(t.u, t.v);
            const cover = it.d < pd && Math.abs(x - px) < a.ox + 12 && y > py && y - a.oy < py && phase !== 'roundcard';
            if (cover) ctx.globalAlpha = 0.38;
            ctx.drawImage(a.c, Math.round(x - a.ox), Math.round(y - a.oy));
            ctx.globalAlpha = 1;
          } else drawObj(ctx, it.o);
        }
        // shots
        for (const s of pshots) {
          const x0 = sx(s.u, s.v), y0 = sy(s.u, s.v, s.h), x1 = sx(s.u + 9, s.v), y1 = sy(s.u + 9, s.v, s.h);
          const col = p.kind === 'walker' ? '#ff6040' : p.kind === 'falcon' ? '#ff4030' : '#ff3020';
          line(ctx, x0, y0, x1, y1, col, 2); line(ctx, x0, y0, x1, y1, '#ffe0c0', 1);
        }
        for (const s of eshots) {
          const x0 = sx(s.u, s.v), y0 = sy(s.u, s.v, s.h), x1 = sx(s.u - 6, s.v), y1 = sy(s.u - 6, s.v, s.h);
          line(ctx, x0, y0, x1, y1, '#40ff60', 2); rect(ctx, x0, y0, 1, 1, '#e0ffe0');
        }
        for (const q of parts) {
          const k = Math.min(q.c.length - 1, Math.floor(q.t / q.T * q.c.length));
          ctx.fillStyle = q.c[k]; ctx.fillRect(Math.round(sx(q.u, q.v)), Math.round(sy(q.u, q.v, q.h)), q.s, q.s);
        }
        drawFire(ctx);
        for (const q of pops) text(ctx, q.s, Math.round(sx(q.u, q.v)), Math.round(sy(q.u, q.v, q.h)), (q.t >> 2) % 2 ? '#ffffff' : '#ffe040', { center: true });
        camU = ocu; camV = ocv;
        if (flash) { ctx.globalAlpha = Math.min(0.8, flash / 20); rect(ctx, 0, 0, W, H, '#ffffff'); ctx.globalAlpha = 1; }
      }

      // ---------- HUD ----------
      const pad = (n, l) => String(Math.floor(n)).padStart(l, '0');
      function drawHUD(ctx) {
        rect(ctx, 0, 0, W, 19, '#000');
        textS(ctx, '1UP', 6, 2, '#ff4040'); textS(ctx, pad(score, 7), 6, 10, '#ffffff');
        textS(ctx, 'HIGH SCORE', 128, 2, '#ffe040', { center: true }); textS(ctx, pad(hi, 7), 128, 10, '#ffffff', { center: true });
        for (let i = 0; i < Math.min(5, lives - (phase === 'dead' ? 0 : 1)); i++) {
          const x = 244 - i * 9;
          rect(ctx, x, 4, 6, 5, '#d02020'); rect(ctx, x + 1, 9, 4, 2, '#d02020'); rect(ctx, x + 2, 5, 2, 3, '#ffd0a0');
        }
        rect(ctx, 0, 226, W, 14, '#000');
        textS(ctx, p && p.kind === 'walker' ? 'ARMOR' : 'SHIELD', 4, 230, '#80e0ff');
        const sh = p ? p.shield : 8;
        for (let i = 0; i < 8; i++) {
          const on = i < sh, col = sh <= 2 ? ((api.frame >> 3) % 2 ? '#ff3030' : '#801010') : sh <= 4 ? '#ffd040' : '#40e060';
          rect(ctx, 42 + i * 9, 230, 7, 6, on ? col : '#202830');
        }
        // progress along the stage
        const prog = clamp(p.u / segLen, 0, 1);
        rect(ctx, 122, 232, 60, 3, '#303038'); rect(ctx, 122, 232, Math.round(60 * prog), 3, escaping ? '#ff8030' : '#a0a0ff');
        textS(ctx, 'RND ' + lvl, 252, 230, '#ffe040', { right: true });
      }
      function drawSub(ctx) {
        if (!sub) return;
        const words = sub.text.split(' '), lines = [];
        let cur = '';
        for (const w of words) { if ((cur + ' ' + w).trim().length > 40) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
        lines.push(cur);
        const y0 = 224 - 10 - lines.length * 9;
        ctx.globalAlpha = 0.72; rect(ctx, 2, y0 - 2, W - 4, lines.length * 9 + 12, '#000'); ctx.globalAlpha = 1;
        text(ctx, sub.who, 6, y0, sub.col);
        lines.forEach((l, i) => text(ctx, l, 6, y0 + 9 + i * 9, '#ffffff'));
      }
      function panel(ctx, x, y, w, h) { ctx.globalAlpha = 0.75; rect(ctx, x, y, w, h, '#000010'); ctx.globalAlpha = 1; rect(ctx, x, y, w, 1, '#ffe040'); rect(ctx, x, y + h - 1, w, 1, '#ffe040'); }
      function drawOverlay(ctx) {
        if (phase === 'intro') {
          const t = phaseT;
          panel(ctx, 20, 70, 216, 50);
          textS(ctx, 'ROUND ' + lvl + ' - STAGE ' + (segI + 1), 128, 78, '#ffe040', { center: true });
          textS(ctx, SD.title, 128, 92, '#ffffff', { center: true });
          if ((t >> 3) % 2) textS(ctx, SD.sub, 128, 106, '#80e0ff', { center: true });
        }
        if (phase === 'roundcard') {
          rect(ctx, 0, 19, W, 207, '#000');
          textS(ctx, 'ROUND ' + (lvl - 1) + ' COMPLETE', 128, 80, '#ffe040', { center: true, scale: 1 });
          textS(ctx, 'THE EMPIRE REGROUPS', 128, 104, '#ff6060', { center: true });
          textS(ctx, 'PREPARE FOR ROUND ' + lvl, 128, 130, '#ffffff', { center: true });
        }
        if (phase === 'tally' && tally) {
          panel(ctx, 14, 52, 228, 26 + tally.lines.length * 18);
          textS(ctx, seg === 'tunnel' ? 'THE STATION IS DESTROYED!' : 'STAGE ' + (segI + 1) + ' COMPLETE', 128, 58, '#ffe040', { center: true });
          tally.lines.forEach((ln, i) => {
            if (i > tally.i) return;
            const n = i < tally.i ? ln.n : tally.shown;
            textS(ctx, ln.l, 22, 76 + i * 18, '#80e0ff');
            textS(ctx, n + ' X ' + ln.k, 234, 76 + i * 18 + 8, '#ffffff', { right: true });
          });
        }
        if (phase === 'run' && escaping === false && boss && boss.hp > 0) {
          rect(ctx, 64, 22, 128, 4, '#401010'); rect(ctx, 64, 22, Math.round(128 * boss.hp / boss.max), 4, '#ff4030');
          textS(ctx, boss.t === 'bunker' ? 'SHIELD GENERATOR' : 'MAIN REACTOR', 128, 28, '#ff8060', { center: true });
        }
        if (phase === 'escape' && phaseT < 150 && (phaseT >> 3) % 2) textS(ctx, 'ESCAPE THE FIREBALL!', 128, 60, '#ffb040', { center: true });
        if (escaping && phase === 'escape') {
          const gap = clamp((p.u - fireU) / 280, 0, 1);
          textS(ctx, 'FIRE', 6, 22, '#ff8030'); rect(ctx, 34, 24, 60, 3, '#302010'); rect(ctx, 34, 24, Math.round(60 * gap), 3, gap < 0.25 ? '#ff3020' : '#ffb040');
        }
        if (phase === 'dead' && lives <= 0 && phaseT > 40 && !demo) textS(ctx, 'GAME OVER', 128, 100, '#ff4040', { center: true });
      }

      // ---------- attract screens ----------
      function drawLogo(ctx, y) {
        textS(ctx, 'RETURN OF THE', 128, y, '#ffe040', { center: true, scale: 1, bold: true });
        const s = 'JEDI', sc = 5, adv = 7 * sc, w = s.length * adv - 2 * sc, x = 128 - w / 2;
        text(ctx, s, x + 2, y + 14 + 2, '#801808', { scale: sc, adv: 7, bold: true });
        text(ctx, s, x, y + 14, '#ff3020', { scale: sc, adv: 7, bold: true });
        text(ctx, s, x, y + 14, '#ffd040', { scale: sc, adv: 7 });
      }
      function drawAttract(ctx) {
        if (att === 'demo') {
          drawWorld(ctx); drawHUD(ctx); drawSub(ctx);
          panel(ctx, 70, 40, 116, 26);
          textS(ctx, 'DEMO PLAY', 128, 44, '#ffe040', { center: true });
          if ((modeT >> 4) % 2) textS(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', 128, 55, '#ffffff', { center: true });
          return;
        }
        rect(ctx, 0, 0, W, H, '#02020a');
        for (const s of stars) { ctx.fillStyle = s.c; ctx.fillRect(s.x | 0, s.y | 0, s.z > 0.8 ? 2 : 1, 1); }
        if (att === 'title') {
          ctx.drawImage(ART.ds, 146, 92);
          drawLogo(ctx, 28);
          const t = attT;
          // the heroes on parade: the freighter swoops past, the bike races up the diagonal, the walker strides
          const fx = 300 - ((t * 1.4) % 420), bk = (t * 1.1) % 360;
          blit(ctx, ART.falcon, fx, 150 - (300 - fx) * 0.35 + Math.sin(t * 0.05) * 4);
          blit(ctx, ART.bikeL, 300 - bk, 250 - bk * 0.7);
          drawWalkerAt(ctx, 48, 196, t * 0.08, true, 0, true);
          textS(ctx, '\u00a9 1984 ATARI GAMES', 128, 86, '#c0c0c0', { center: true });
        } else if (att === 'scores') {
          textS(ctx, 'REBEL HEROES', 128, 30, '#ffe040', { center: true, bold: true });
          table.forEach((e, i) => {
            const col = i === lastRank && (modeT >> 3) % 2 ? '#ff4040' : i === 0 ? '#ffe040' : '#ffffff';
            textS(ctx, (i + 1) + '.', 64, 52 + i * 16, '#80e0ff', { right: true });
            textS(ctx, e.n, 76, 52 + i * 16, col);
            textS(ctx, pad(e.s, 7), 196, 52 + i * 16, col, { right: true });
          });
        } else if (att === 'points') {
          textS(ctx, 'SCORE VALUES', 128, 26, '#ffe040', { center: true, bold: true });
          const rows = [
            [ART.bikeS, 'SCOUT BIKE SHOT', PTS.bikeShot], [null, 'SCOUT INTO A TREE', PTS.bikeCrash], [ART.ewok, 'CAUGHT IN EWOK TRAP', PTS.bikeTrap],
            [ART.atstE, 'WALKER', PTS.atst], [ART.roll[0][0], 'ROLLING LOG', PTS.log], [ART.tie, 'FIGHTER', PTS.tie],
            [null, 'SHIELD GENERATOR', PTS.generator], [null, 'MAIN REACTOR', PTS.reactor]
          ];
          rows.forEach((r, i) => {
            const y = 44 + i * 21;
            if (r[0]) { if (r[0].c) blit(ctx, r[0], 44, y + 14); else ctx.drawImage(r[0], 40, y + 4); }
            textS(ctx, r[1], 76, y + 2, '#ffffff');
            textS(ctx, String(r[2]), 236, y + 10, '#ffe040', { right: true });
          });
        }
        if ((modeT >> 4) % 2 || coinFlash) textS(ctx, api.credits > 0 && !coinFlash ? 'PUSH START' : 'INSERT COIN', 128, 214, coinFlash ? '#ff4040' : '#ffffff', { center: true });
        textS(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), 128, 226, '#80e0ff', { center: true });
      }
      function render(ctx) {
        ctx.globalAlpha = 1;
        if (mode === 'attract') { drawAttract(ctx); return; }
        if (mode === 'play') {
          if (phase === 'roundcard') { rect(ctx, 0, 0, W, H, '#000'); drawOverlay(ctx); drawHUD(ctx); return; }
          drawWorld(ctx); drawHUD(ctx); drawOverlay(ctx); drawSub(ctx);
          return;
        }
        rect(ctx, 0, 0, W, H, '#000');
        for (const s of stars) { ctx.fillStyle = s.c; ctx.fillRect(s.x | 0, s.y | 0, 1, 1); }
        if (mode === 'initials') {
          textS(ctx, 'GREAT SCORE, REBEL!', 128, 50, '#ffe040', { center: true });
          textS(ctx, 'ENTER YOUR INITIALS', 128, 70, '#ffffff', { center: true });
          for (let i = 0; i < 3; i++) {
            const col = i === initials.pos && (modeT >> 3) % 2 ? '#ff4040' : '#ffffff';
            text(ctx, ALPHA[initials.l[i]], 104 + i * 18, 100, col, { scale: 2 });
            rect(ctx, 104 + i * 18, 118, 10, 1, '#80e0ff');
          }
          textS(ctx, 'UP/DOWN: LETTER  FIRE: NEXT', 128, 140, '#80e0ff', { center: true });
          textS(ctx, pad(score, 7), 128, 160, '#ffffff', { center: true });
        } else {
          textS(ctx, 'GAME OVER', 128, 96, '#ff4040', { center: true, scale: 2 });
          textS(ctx, 'SCORE ' + pad(score, 7), 128, 128, '#ffffff', { center: true });
          textS(ctx, 'REACHED ROUND ' + lvl, 128, 142, '#80e0ff', { center: true });
        }
      }

      attractInit('title');
      if (api.debugHook) api.debugHook({
        state: () => ({ mode, att, seg, segI, phase, lvl, lives, score, u: p ? p.u : 0, segLen, shield: p ? p.shield : 0, escaping, boss: boss ? boss.hp : null, demo }),
        setAuto: v => { auto = v; }, setGod: v => { god = v; }
      });
      return { update, render, destroy() { music = null; } };
    }
  });
})();
