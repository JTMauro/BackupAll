// Teenage Mutant Ninja Turtles (Konami, 1989) -- from-scratch tribute. Four turtles vs the Foot Clan: combos, jump kicks, specials, pizza, six scenes with bosses.
(function () {
  'use strict';
  // ================= shared helpers: font, rig renderer, backgrounds =================
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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8],
    '&': [12, 18, 20, 8, 21, 18, 13], '"': [10, 10, 0, 0, 0, 0, 0], '#': [10, 31, 10, 10, 10, 31, 10]
  };
  // col may be a function(row) -> colour for two-tone logo text
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    const fn = typeof col === 'function';
    if (!fn) ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) {
        const bits = g[r]; if (!bits) continue;
        if (fn) ctx.fillStyle = col(r);
        let c = 0;
        while (c < 5) {
          if (bits & (16 >> c)) { let e = c; while (e + 1 < 5 && (bits & (16 >> (e + 1)))) e++; ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, (e - c + 1) * sc, sc); c = e + 1; } else c++;
        }
      }
    }
  }
  function textO(ctx, s, x, y, col, sc, align, oc) {
    sc = sc || 1; const o = Math.max(1, sc >> 1);
    text(ctx, s, x - o, y, oc || '#000', sc, align); text(ctx, s, x + o, y, oc || '#000', sc, align);
    text(ctx, s, x, y - o, oc || '#000', sc, align); text(ctx, s, x, y + o, oc || '#000', sc, align);
    text(ctx, s, x + o, y + o, oc || '#000', sc, align);
    text(ctx, s, x, y, col, sc, align);
  }
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function hash(i, s) { let x = Math.sin(i * 127.1 + (s || 0) * 311.7) * 43758.5453; return x - Math.floor(x); }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, k) => a + (b - a) * k;
  const rnd = (a, b) => a + Math.random() * (b - a);
  function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }

  // ---------- articulated pixel figure ----------
  // pose angles: 0 = limb pointing down, +PI/2 = forward, PI = up. rot < 0 tips the body backwards.
  function PA(n, t, k) {
    k = k || 0;
    const ext = k < 0.25 ? k / 0.25 : k < 0.7 ? 1 : Math.max(0, 1 - (k - 0.7) / 0.3);
    let w;
    switch (n) {
      case 'walk': w = Math.sin(t * 0.22);
        return { lean: 0.08, lf: [w * 0.5, w * 0.5 - 0.25 * Math.abs(w)], lb: [-w * 0.5, -w * 0.5 - 0.25 * Math.abs(w)], af: [0.3 - w * 0.45, 0.9 - w * 0.3], ab: [w * 0.45, 0.6 + w * 0.3], bob: Math.abs(w) > 0.7 ? 1 : 0 };
      case 'run': w = Math.sin(t * 0.36);
        return { lean: 0.35, lf: [w * 0.85 + 0.2, w * 0.6 - 0.5], lb: [-w * 0.85 + 0.2, -w * 0.6 - 0.5], af: [0.3 - w * 0.9, 1.4], ab: [0.3 + w * 0.9, 1.2], bob: Math.abs(w) > 0.7 ? 1 : 0 };
      case 'punch': return { lean: 0.08 + 0.12 * ext, lf: [0.35, 0.2], lb: [-0.35, -0.25], af: [lerp(0.3, 1.55, ext), lerp(1.5, 1.57, ext)], ab: [0.2, 1.1] };
      case 'punch2': return { lean: 0.1 + 0.15 * ext, lf: [0.35, 0.2], lb: [-0.35, -0.25], af: [0.2, 1.3], ab: [lerp(0.2, 1.55, ext), lerp(1.1, 1.57, ext)] };
      case 'upper': return { lean: 0.15 - 0.25 * ext, lf: [0.3, 0.1], lb: [-0.35, -0.3], af: [lerp(0.6, 2.7, ext), lerp(1.8, 2.9, ext)], ab: [0.1, 0.8] };
      case 'slash': { const a = lerp(2.9, 0.7, clamp(k * 1.8, 0, 1)); return { lean: 0.1 + 0.15 * clamp(k * 2, 0, 1), lf: [0.4, 0.25], lb: [-0.35, -0.3], af: [a, a - 0.15], ab: [a * 0.6, a * 0.6 + 0.3] }; }
      case 'slash2': { const a = lerp(0.3, 2.3, clamp(k * 1.8, 0, 1)); return { lean: 0.2, lf: [0.4, 0.3], lb: [-0.3, -0.3], af: [a, a + 0.1], ab: [0.3, 1.0] }; }
      case 'thrust': return { lean: 0.25 * ext, lf: [0.55 * ext + 0.1, 0.3], lb: [-0.45, -0.4], af: [lerp(0.6, 1.57, ext), 1.57], ab: [lerp(0.4, 1.4, ext), 1.5] };
      case 'kick': return { lean: -0.25 * ext, lf: [lerp(0.1, 1.55, ext), lerp(0.05, 1.6, ext)], lb: [-0.15, -0.05], af: [-0.5, 0.2], ab: [0.6, 1.4] };
      case 'jump': return { lean: 0.1, lf: [1.1, 0.2], lb: [0.5, -0.35], af: [2.3, 2.6], ab: [1.8, 2.2] };
      case 'jkick': return { lean: -0.2, lf: [1.45, 1.55], lb: [0.6, -0.5], af: [-0.4, 0.3], ab: [0.8, 1.6] };
      case 'hurt': return { lean: -0.35, lf: [0.12, 0], lb: [-0.2, -0.1], af: [-0.9, -0.4], ab: [-0.6, -0.2] };
      case 'knock': return { rot: -1.0, lf: [0.6, 0.35], lb: [-0.2, 0], af: [2.5, 2.8], ab: [2.2, 2.4] };
      case 'down': return { rot: -1.57, lf: [0.25, 0.1], lb: [0, -0.1], af: [2.8, 3.0], ab: [2.6, 2.8] };
      case 'crouch': return { lean: 0.5, lf: [1.25, -0.3], lb: [0.6, -0.65], af: [1.0, 1.5], ab: [0.7, 1.2] };
      case 'carry': return { lean: 0, lf: [0.12, 0.04], lb: [-0.12, -0.04], af: [2.9, 3.1], ab: [2.8, 3.0] };
      case 'throw': return { lean: 0.25, lf: [0.4, 0.25], lb: [-0.35, -0.3], af: [1.8, 1.6], ab: [1.6, 1.5] };
      case 'cast': return { lean: -0.1, lf: [0.25, 0.1], lb: [-0.25, -0.1], af: [2.7, 3.0], ab: [2.5, 2.9] };
      case 'dash': w = Math.sin(t * 0.4); return { lean: 0.45, lf: [0.9, 0.3], lb: [-0.5, -0.9], af: [1.5, 1.5], ab: [1.2, 1.4] };
      case 'wind': return { lean: -0.15, lf: [0.3, 0.15], lb: [-0.3, -0.2], af: [-0.7, 0.3], ab: [0.3, 1.0] };
      case 'ride': return { lean: 0.05, lf: [1.3, 0.3], lb: [1.3, 0.3], af: [0.9, 1.3], ab: [0.6, 1.1] };
      case 'win': return { lean: 0, lf: [0.15, 0.05], lb: [-0.15, -0.05], af: [3.0, 3.1], ab: [0.2, 0.8] };
      case 'spin': w = Math.sin(t * 0.5); return { lean: 0.05, lf: [0.5, 0.2], lb: [-0.5, -0.3], af: [1.57, 1.6], ab: [1.57 + w * 0.3, 1.6] };
      case 'shoot': return { lean: 0.05, lf: [0.3, 0.15], lb: [-0.3, -0.2], af: [1.55, 1.57], ab: [1.45, 1.55] };
      default: w = Math.sin(t * 0.08);
        return { lean: 0.05, lf: [0.13, 0.05], lb: [-0.13, -0.05], af: [0.35, 1.2], ab: [0.1, 0.9], bob: w > 0 ? 1 : 0 };
    }
  }
  // build joints in local space: x forward, y down, feet on y=0
  function joints(look, pn, t, k) {
    const a = PA(pn, t, k);
    const h = look.h || 46, hs = look.hs || 9;
    const TH = h * 0.25, SH = h * 0.23, TO = h * 0.3, UA = h * 0.18, FA = h * 0.17;
    const ls = Math.sin(a.lean || 0), lc = Math.cos(a.lean || 0);
    const J = { hip: { x: 0, y: 0 } };
    J.neck = { x: ls * TO, y: -lc * TO };
    J.sho = { x: ls * TO * 0.86, y: -lc * TO * 0.86 };
    J.head = { x: ls * (TO + hs * 0.55), y: -lc * (TO + hs * 0.55) };
    const limb = (o, an, l1, l2) => { const m = { x: o.x + Math.sin(an[0]) * l1, y: o.y + Math.cos(an[0]) * l1 }; return [m, { x: m.x + Math.sin(an[1]) * l2, y: m.y + Math.cos(an[1]) * l2 }]; };
    [J.kf, J.ff] = limb(J.hip, a.lf, TH, SH); [J.kb, J.fb] = limb(J.hip, a.lb, TH, SH);
    [J.ef, J.hf] = limb(J.sho, a.af, UA, FA); [J.eb, J.hb] = limb(J.sho, a.ab, UA, FA);
    const r = a.rot || 0, cr = Math.cos(r), sr = Math.sin(r);
    const names = ['hip', 'neck', 'sho', 'head', 'kf', 'ff', 'kb', 'fb', 'ef', 'hf', 'eb', 'hb'];
    let maxY = -1e9;
    for (const n of names) {
      const p = J[n]; const x = p.x * cr - p.y * sr, y = p.x * sr + p.y * cr; p.x = x; p.y = y;
      const pad = n === 'head' ? hs / 2 : n === 'hip' || n === 'neck' ? (look.tw || 10) / 2 : (look.lw || 5) / 2;
      if (n !== 'hf' && n !== 'hb' && n !== 'ef' && n !== 'eb' && y + pad > maxY) maxY = y + pad;
    }
    const off = -maxY + (a.bob || 0);
    for (const n of names) J[n].y += off;
    const ux = J.neck.x - J.hip.x, uy = J.neck.y - J.hip.y, ul = Math.hypot(ux, uy) || 1;
    J.u = { x: ux / ul, y: uy / ul }; J.f = { x: -J.u.y, y: J.u.x };
    J.t = t; J.k = k; J.pn = pn; J.rot = r;
    return J;
  }
  // ops builder for a figure: segments drawn as runs of axis-aligned squares (crisp, outlined)
  function OpsB() {
    const ops = [];
    const o = {
      ops,
      seg(p, q, th, col, noOut) { ops.push([p.x, p.y, q.x, q.y, th, col, noOut]); },
      dot(p, th, col, noOut) { ops.push([p.x, p.y, p.x, p.y, th, col, noOut]); },
      at(p, J, fw, up) { return { x: p.x + J.f.x * fw + J.u.x * up, y: p.y + J.f.y * fw + J.u.y * up }; },
      along(p, q, d) { const dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy) || 1; return { x: q.x + dx / l * d, y: q.y + dy / l * d }; }
    };
    return o;
  }
  function headDefault(o, J, L) {
    const hs = L.hs || 9, hd = J.head;
    o.dot(hd, hs, L.skin);
    const hr = L.hair;
    if (hr) {
      const c = hr.col;
      switch (hr.style) {
        case 'long': o.dot(o.at(hd, J, -1, 2), hs + 1, c); o.seg(o.at(hd, J, -3, 0), o.at(hd, J, -4, -hs), 4, c); o.dot(o.at(hd, J, 1, 0), hs - 3, L.skin, 1); break;
        case 'spike': o.dot(o.at(hd, J, -1, 3), hs, c); for (let i = -1; i <= 1; i++) o.seg(o.at(hd, J, i * 3, 4), o.at(hd, J, i * 4, 8), 2, c); break;
        case 'beehive': o.seg(o.at(hd, J, -1, 2), o.at(hd, J, -1, hs * 2.6), hs + 1, c); break;
        case 'mohawk': o.seg(o.at(hd, J, -2, 3), o.at(hd, J, 1, 7), 3, c); break;
        case 'bun': o.dot(o.at(hd, J, -1, 3), hs, c); o.dot(o.at(hd, J, -5, 4), 5, c); break;
        case 'helmet': o.dot(o.at(hd, J, -1, 2), hs + 1, c); if (hr.visor) o.seg(o.at(hd, J, 1, 1), o.at(hd, J, 4, 1), 2, hr.visor, 1); break;
        case 'horns': o.dot(o.at(hd, J, -1, 3), hs + 1, c); o.seg(o.at(hd, J, 2, 4), o.at(hd, J, 4, 9), 2, hr.horn || '#eee'); o.seg(o.at(hd, J, -4, 4), o.at(hd, J, -6, 9), 2, hr.horn || '#eee'); break;
        case 'hood': o.dot(o.at(hd, J, -1, 1), hs + 2, c); o.dot(o.at(hd, J, 2, 0), hs - 4, L.skin, 1); break;
        case 'bald': break;
        default: o.dot(o.at(hd, J, -1, 3), hs, c);
      }
    }
    if (L.mask) { o.seg(o.at(hd, J, -hs / 2, 1), o.at(hd, J, hs / 2, 1), 3, L.mask, 1); o.seg(o.at(hd, J, -hs / 2, 1), o.at(hd, J, -hs / 2 - 5, -2 + Math.sin(J.t * 0.3) * 2), 2, L.mask); }
    if (!L.noEye) o.dot(o.at(hd, J, hs * 0.28, 1), L.eyeSz || 2, L.eye || '#000', 1);
    if (L.beard) o.seg(o.at(hd, J, 2, -2), o.at(hd, J, 1, -hs / 2 - 2), 4, L.beard);
  }
  function weaponOps(o, J, L, wp) {
    const hf = J.hf, ef = J.ef;
    const d = (p, q, len) => o.along(p, q, len);
    switch (wp.type) {
      case 'sword': case 'katana': { const tip = d(ef, hf, wp.len || 16); o.seg(hf, tip, 2, wp.col || '#dde'); o.seg(d(ef, hf, -1), d(ef, hf, 1), 4, wp.col2 || '#a60', 1); if (wp.type === 'katana' && wp.two) { o.seg(J.hb, d(J.eb, J.hb, wp.len || 16), 2, wp.col || '#dde'); } break; }
      case 'staff': { o.seg(d(ef, hf, -(wp.len || 30) * 0.45), d(ef, hf, (wp.len || 30) * 0.55), 2, wp.col || '#a65'); break; }
      case 'sai': { const tip = d(ef, hf, wp.len || 10); o.seg(hf, tip, 2, wp.col || '#ccd'); o.seg(o.at(hf, J, 0, 2), o.at(hf, J, 2, 4), 1, wp.col || '#ccd', 1); if (wp.two) o.seg(J.hb, d(J.eb, J.hb, wp.len || 10), 2, wp.col || '#ccd'); break; }
      case 'nunchaku': { const a = d(ef, hf, 6); o.seg(hf, a, 2, wp.col || '#a52'); const sw = J.t * 0.5; o.seg(a, { x: a.x + Math.cos(sw) * 7, y: a.y + Math.sin(sw) * 7 }, 2, wp.col || '#a52'); break; }
      case 'axe': { const tip = d(ef, hf, wp.len || 14); o.seg(d(ef, hf, -2), tip, 2, wp.col2 || '#853'); o.seg(o.at(tip, J, 0, 2), o.at(tip, J, 0, -3), 5, wp.col || '#ccd'); break; }
      case 'mace': case 'club': { const tip = d(ef, hf, wp.len || 12); o.seg(hf, tip, 2, wp.col2 || '#863'); o.dot(tip, 5, wp.col || '#999'); break; }
      case 'claws': { for (let i = -1; i <= 1; i++) { const s = o.at(hf, J, 0, i * 1.5); o.seg(s, d(ef, { x: hf.x, y: hf.y + i * 1.5 }, wp.len || 7), 1, wp.col || '#eef', 1); } break; }
      case 'knife': { o.seg(hf, d(ef, hf, wp.len || 7), 2, wp.col || '#eef'); break; }
      case 'gun': { o.seg(hf, d(ef, hf, wp.len || 8), 3, wp.col || '#444'); break; }
      case 'vacuum': { const tip = d(ef, hf, wp.len || 14); o.seg(hf, tip, 2, wp.col2 || '#888'); o.seg(o.at(tip, J, -1, -1), o.at(tip, J, 3, -2), 3, wp.col || '#c33'); break; }
      case 'rope': { const sw = Math.sin(J.t * 0.4); const tip = d(ef, hf, (wp.len || 14) * (0.6 + 0.4 * Math.abs(sw))); o.seg(hf, tip, 1, wp.col || '#fd4', 1); o.dot(tip, 3, wp.col2 || '#c33'); break; }
      case 'whip': { const tip = d(ef, hf, wp.len || 20); o.seg(hf, tip, 1, wp.col || '#642', 1); break; }
    }
  }
  // figure description -> ops (back limbs darker)
  function figOps(L, J) {
    const o = OpsB(), lw = L.lw || 5, tw = L.tw || 10;
    const sh = L.shade || '#0004';
    if (L.back) L.back(o, J, L);
    // back arm + leg
    o.seg(J.sho, J.eb, lw, L.armsB || L.arms || L.body); o.seg(J.eb, J.hb, lw - 1, L.foreB || L.fore || L.skin); o.dot(J.hb, lw, L.hand || L.skin);
    o.seg(J.hip, J.kb, lw + 1, L.legsB || L.legs); o.seg(J.kb, J.fb, lw, L.bootsB || L.boots || L.legsB || L.legs); o.seg(J.fb, o.at(J.fb, J, 0, 0), lw, L.shoe || L.boots || L.legs);
    o.seg(J.fb, { x: J.fb.x + 2.5 * Math.cos(J.rot), y: J.fb.y + 2.5 * Math.sin(J.rot) }, lw - 1, L.shoe || L.bootsB || L.boots || L.legs);
    // front leg
    o.seg(J.hip, J.kf, lw + 1, L.legs); o.seg(J.kf, J.ff, lw, L.boots || L.legs);
    o.seg(J.ff, { x: J.ff.x + 2.5 * Math.cos(J.rot), y: J.ff.y + 2.5 * Math.sin(J.rot) }, lw - 1, L.shoe || L.boots || L.legs);
    // torso
    o.seg(J.hip, J.neck, tw, L.body);
    if (L.chest) o.seg(o.at(J.hip, J, tw * 0.2, 2), o.at(J.neck, J, tw * 0.2, -2), Math.max(2, tw - 4), L.chest, 1);
    if (L.belt) o.seg(o.at(J.hip, J, -tw * 0.3, 1), o.at(J.hip, J, tw * 0.3, 1), 3, L.belt, 1);
    if (L.mid) L.mid(o, J, L);
    if (L.head) L.head(o, J, L); else headDefault(o, J, L);
    // front arm
    o.seg(J.sho, J.ef, lw, L.arms || L.body); o.seg(J.ef, J.hf, lw - 1, L.fore || L.skin); o.dot(J.hf, lw, L.hand || L.skin);
    if (L.wpn) weaponOps(o, J, L, L.wpn);
    if (L.front) L.front(o, J, L);
    return o.ops;
  }
  function drawOps(ctx, ops, sx, sy, face, flash, out) {
    for (let pass = 0; pass < 2; pass++) {
      if (pass === 0) ctx.fillStyle = out || '#000';
      for (const op of ops) {
        if (pass === 0 && op[6]) continue;
        const th = op[4] + (pass === 0 ? 2 : 0);
        if (pass === 1) ctx.fillStyle = flash || op[5];
        const x0 = sx + face * op[0], y0 = sy + op[1], x1 = sx + face * op[2], y1 = sy + op[3];
        const dx = x1 - x0, dy = y1 - y0, n = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / Math.max(1, th * 0.45));
        const h2 = th / 2;
        for (let i = 0; i <= n; i++) {
          const f = n ? i / n : 0;
          ctx.fillRect(Math.round(x0 + dx * f - h2), Math.round(y0 + dy * f - h2), th, th);
        }
      }
    }
  }
  function drawFig(ctx, sx, sy, face, L, pn, t, k, flash) {
    if (L.custom) { L.custom(ctx, Math.round(sx), Math.round(sy), face, pn, t, k || 0, flash); return; }
    const J = joints(L, pn, t, k);
    drawOps(ctx, figOps(L, J), Math.round(sx), Math.round(sy), face, flash, L.out);
  }
  function shadow(ctx, x, y, w) {
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    x = Math.round(x); y = Math.round(y); w = Math.round(w);
    ctx.fillRect(x - w / 2 + 2, y - 2, w - 4, 4); ctx.fillRect(x - w / 2, y - 1, w, 2);
  }
  // ---------- background helpers ----------
  function bands(ctx, cols, y0, y1, W) { const h = (y1 - y0) / cols.length; cols.forEach((c, i) => rect(ctx, 0, y0 + i * h, W, h + 1, c)); }
  // a row of buildings scrolled at parallax `par`
  function buildings(ctx, camX, W, o) {
    const sw = o.sw || 48, off = camX * (o.par || 0.5), i0 = Math.floor(off / sw) - 1, i1 = i0 + Math.ceil(W / sw) + 2;
    for (let i = i0; i <= i1; i++) {
      const r = hash(i, o.seed || 1), bw = sw - 4 - Math.floor(r * 10), bh = o.minH + Math.floor(hash(i, (o.seed || 1) + 5) * (o.maxH - o.minH));
      const x = Math.round(i * sw - off), y = o.base - bh, col = o.cols[Math.floor(r * o.cols.length)];
      rect(ctx, x, y, bw, bh, col);
      if (o.roof) rect(ctx, x - 1, y, bw + 2, 2, o.roof);
      if (o.win) {
        const lit = o.lit || o.win;
        for (let wy = y + 5; wy < o.base - 6; wy += o.wy || 8) for (let wx = x + 4; wx < x + bw - 5; wx += o.wx || 7) {
          const on = hash(i * 31 + wx * 3 + wy, 9) > 0.55;
          rect(ctx, wx, wy, o.ww || 3, o.wh || 4, on ? lit : o.win);
        }
      }
    }
  }
  // floor stripes / tiles
  function floor(ctx, camX, W, y0, y1, o) {
    rect(ctx, 0, y0, W, y1 - y0, o.c1);
    const tw = o.tw || 32, off = camX % tw;
    if (o.style === 'planks') {
      for (let y = y0; y < y1; y += 6) rect(ctx, 0, y, W, 1, o.c2);
      for (let y = y0, r = 0; y < y1; y += 6, r++) for (let x = -off - (r % 2) * tw / 2; x < W; x += tw) rect(ctx, x, y, 1, 6, o.c2);
    } else if (o.style === 'tiles') {
      for (let y = y0; y < y1; y += o.th || 12) rect(ctx, 0, y, W, 1, o.c2);
      const n = Math.ceil((y1 - y0) / (o.th || 12));
      for (let r = 0; r < n; r++) { const yy = y0 + r * (o.th || 12), sk = (r - n / 2) * 2; for (let x = -off; x < W + tw; x += tw) rect(ctx, x + sk * ((x - W / 2) / W), yy, 1, o.th || 12, o.c2); }
    } else if (o.style === 'stones') {
      for (let y = y0, r = 0; y < y1; y += 8, r++) for (let x = -((camX + r * 13) % 20); x < W; x += 20) { rect(ctx, x + 1, y + 1, 17, 6, (r + Math.floor((x + camX) / 20)) % 3 ? o.c1 : o.c2); }
    } else if (o.style === 'grass') {
      for (let i = 0; i < 70; i++) { const x = ((hash(i, 3) * 900 - camX) % W + W) % W, y = y0 + hash(i, 4) * (y1 - y0); rect(ctx, x, y, 2, 1, o.c2); rect(ctx, x + 1, y - 1, 1, 1, o.c2); }
    } else if (o.style === 'road') {
      for (let x = -((camX) % 40); x < W; x += 40) rect(ctx, x, (y0 + y1) / 2, 20, 2, o.c2);
    } else if (o.style === 'metal') {
      for (let y = y0; y < y1; y += 10) rect(ctx, 0, y, W, 1, o.c2);
      for (let x = -off; x < W; x += tw) { rect(ctx, x, y0, 1, y1 - y0, o.c2); rect(ctx, x + 3, y0 + 3, 2, 2, o.c3 || o.c2); }
    }
  }
  // ================= Teenage Mutant Ninja Turtles: game data =================
  const TSKIN = '#5cae3a', TSH = '#3f7a28', PLAS = '#e8c868';
  function turtle(mask, wpn) {
    return {
      h: 40, hs: 12, tw: 14, lw: 6, skin: TSKIN, body: TSH, chest: PLAS, belt: '#9a6a30', arms: TSKIN, fore: TSKIN, hand: TSKIN, legs: TSKIN,
      boots: TSKIN, shoe: '#4c9a30', mask, eye: '#fff', eyeSz: 2, wpn,
      back(o, J) { o.seg(o.at(J.hip, J, -6, 3), o.at(J.neck, J, -6, -4), 11, '#356a20'); o.seg(o.at(J.hip, J, -8, 6), o.at(J.neck, J, -8, -7), 4, '#4b8a2e', 1); },
      front(o, J) { o.dot(J.ef, 4, '#9a6a30', 1); o.dot(J.kf, 4, '#9a6a30', 1); }
    };
  }
  function foot(body, extra) {
    return Object.assign({ h: 44, hs: 9, tw: 10, lw: 5, skin: '#e0b090', body, arms: body, fore: body, hand: '#333', legs: body, boots: '#2a2a2a', shoe: '#222', belt: '#222',
      hair: { style: 'hood', col: body }, eye: '#000', chest: null,
      mid(o, J) { o.seg(o.at(J.neck, J, 2, -3), o.at(J.neck, J, -2, -10), 3, '#222', 1); } }, extra || {});
  }
  function mouser(ctx, x, y, face, pn, t, k, fl) {
    const c = fl || '#d8d8e0', d = fl || '#80808c', bob = (t >> 3) % 2;
    const open = pn === 'punch' || pn === 'wind' ? 1 : 0;
    if (pn === 'down' || pn === 'knock') { rect(ctx, x - 8, y - 6, 16, 6, d); rect(ctx, x - 6, y - 8, 10, 3, c); return; }
    rect(ctx, x - 3, y - 6, 2, 6, d); rect(ctx, x + 2, y - 6, 2, 6, d); rect(ctx, x - 5, y - 1, 5, 1, d); rect(ctx, x + 1, y - 1, 5, 1, d);
    rect(ctx, x - 7, y - 16 - bob, 14, 10, c); rect(ctx, x - 7 + (face > 0 ? 9 : 0), y - 18 - bob - open * 3, 5, 4 + open * 2, c);
    rect(ctx, x + face * 6 - 1, y - 14 - bob + open * 2, 4, 2, '#fff'); rect(ctx, x + face * 6 - 2, y - 10 - bob, 5, 2, d);
    for (let i = 0; i < 3; i++) rect(ctx, x + face * (3 + i * 2) - (face < 0 ? 1 : 0), y - 12 - bob, 1, 2, '#fff');
    rect(ctx, x - face * 2 - 1, y - 15 - bob, 3, 3, '#e02020'); rect(ctx, x - face * 2, y - 14 - bob, 1, 1, '#ff8');
  }
  function rodney(ctx, x, y, face, pn, t, k, fl) {
    const c = fl || '#c03030', w = (t >> 2) % 2;
    if (pn === 'down' || pn === 'knock') { rect(ctx, x - 9, y - 6, 18, 6, c); return; }
    rect(ctx, x - 1, y - 18, 2, 10, '#888'); rect(ctx, x - 6, y - 26, 12, 9, c); rect(ctx, x - 4, y - 24, 8, 4, '#222'); rect(ctx, x + face * 2 - 1, y - 23, 3, 2, '#f44');
    rect(ctx, x - 7, y - 9, 14, 6, '#444'); rect(ctx, x - 6 + w * 2, y - 4, 4, 4, '#222'); rect(ctx, x + 2 - w * 2, y - 4, 4, 4, '#222');
    rect(ctx, x + face * 6, y - 22, face * 8, 1, '#ff0'); if (pn === 'punch') rect(ctx, x + face * 13, y - 24, 4, 4, '#ff8');
  }
  function baxter(ctx, x, y, face, pn, t, k, fl) {
    const c = fl || '#b0b8c8', bob = Math.round(Math.sin(t * 0.1) * 2);
    if (pn === 'down' || pn === 'knock') { rect(ctx, x - 18, y - 10, 36, 10, c); rect(ctx, x - 6, y - 16, 12, 6, '#e0b090'); return; }
    rect(ctx, x - 16, y - 18 + bob, 32, 12, c); rect(ctx, x - 18, y - 10 + bob, 36, 4, '#606878'); rect(ctx, x - 12, y - 6 + bob, 6, 4, (t >> 1) % 2 ? '#fd4' : '#f80'); rect(ctx, x + 6, y - 6 + bob, 6, 4, (t >> 1) % 2 ? '#f80' : '#fd4');
    rect(ctx, x - 6, y - 32 + bob, 12, 14, '#e8e8f0'); rect(ctx, x - 5, y - 42 + bob, 10, 10, '#e0b090'); rect(ctx, x - 5, y - 44 + bob, 10, 3, '#6a4020');
    rect(ctx, x + face * 1 - 2, y - 39 + bob, 5, 2, '#222'); rect(ctx, x + face * 3 - 1, y - 39 + bob, 2, 1, '#9cf');
    rect(ctx, x + face * 6, y - 28 + bob, face * 8, 3, '#e8e8f0'); rect(ctx, x + face * 14 - 1, y - 30 + bob, 3, 6, '#555');
  }
  const SHURI = { pk: 'star', spd: 3.2, dmg: 4, col: '#ddd' };
  const G = {
    id: 'tmnt', title: 'Teenage Mutant Ninja Turtles', year: 1989, maker: 'Konami', W: 288, H: 224, FT: 146, FB: 212,
    controls: 'Arrows: move (tap twice to run) \u00b7 Space: attack \u00b7 X: jump (Space in air = jump kick) \u00b7 Space+X or Z: special \u00b7 Enter: start',
    marquee: { bg: '#0a2a10', fg: '#58d040', accent: '#e02020' },
    php: 48, lives: 3, hiDefault: 120, showPts: false, scoreDigits: 4, hpBonus: 0, barCol: '#3ce040', barSeg: 6, hudSlots: 4, hudCol: '#58e040',
    sparkCol: '#ffe060', jumpV: 4.6, stageWord: 'SCENE', clearWord: 'COWABUNGA!', propPts: 0, maxAlive: 5,
    copy: '\u00a9 1989 KONAMI  (TRIBUTE)', rosterTitle: 'HEROES IN A HALF SHELL',
    story: ['SHREDDER HAS KIDNAPPED APRIL', 'AND SPLINTER. SAVE THEM!'],
    ending: ['CONGRATULATIONS!', 'SHREDDER IS DEFEATED AND', 'APRIL AND SPLINTER ARE SAFE.', '', 'BUT THE FOOT CLAN RETURNS...', 'TRY THE NEXT ROUND!'],
    overLine: s => 'FOOT SOLDIERS BEATEN ' + s,
    startTune: [[392, 0.09], [392, 0.09], [466, 0.09], [523, 0.09], [587, 0.18], [523, 0.09], [587, 0.3]],
    clearTune: [[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.16], [880, 0.08], [1047, 0.3]],
    chars: [
      { name: 'LEO', col: '#3070ff', desc: 'LEADER - TWIN KATANAS', look: turtle('#2060f0', { type: 'katana', len: 15, two: true }), spd: 1.35, combo: 4, atkT: 13, reach: 34, pow: 5, poses: ['slash', 'slash2', 'slash', 'slash2'], jpose: 'jkick', stat: [0.7, 0.7, 0.75], sp: { kind: 'spin', dmg: 7, r: 36, col: '#5af', cool: 40 } },
      { name: 'MIKE', col: '#ff9020', desc: 'PARTY DUDE - NUNCHAKU', look: turtle('#ff8010', { type: 'nunchaku' }), spd: 1.45, combo: 4, atkT: 11, reach: 30, pow: 4.5, poses: ['punch', 'punch2', 'slash2', 'kick'], stat: [0.6, 0.85, 0.6], sp: { kind: 'flurry', dmg: 8, col: '#fa4', cool: 40 } },
      { name: 'DON', col: '#b050ff', desc: 'BRAINS - LONG BO STAFF', look: turtle('#9040e0', { type: 'staff', len: 34, col: '#b07040' }), spd: 1.2, combo: 4, atkT: 15, reach: 44, pow: 4.5, poses: ['thrust', 'slash', 'thrust', 'slash2'], stat: [0.65, 0.55, 1], sp: { kind: 'leap', dmg: 10, r: 46, col: '#c8f', cool: 40 } },
      { name: 'RAPH', col: '#ff3030', desc: 'HOTHEAD - TWIN SAI', look: turtle('#e02020', { type: 'sai', two: true }), spd: 1.55, combo: 4, atkT: 10, reach: 27, pow: 5.5, poses: ['thrust', 'punch2', 'thrust', 'kick'], stat: [0.85, 0.95, 0.45], sp: { kind: 'drill', dmg: 7, spd: 4.2, col: '#f66', cool: 40 } }
    ],
    enemies: {
      foot: { name: 'FOOT SOLDIER', hp: 11, spd: 1.0, pts: 1, look: foot('#7040a8'), atk: { reach: 22, dmg: 3, pose: 'punch' }, cd: 70 },
      footk: { name: 'FOOT SOLDIER', hp: 12, spd: 1.2, pts: 1, look: foot('#3060c0'), atk: { reach: 26, dmg: 4, pose: 'kick', knock: true }, ai: 'jumper', cd: 80 },
      footw: { name: 'FOOT SOLDIER', hp: 10, spd: 1.0, pts: 1, look: foot('#e8e8e8'), atk: { reach: 22, dmg: 3, pose: 'punch' }, ai: 'ranged', proj: SHURI, pref: 100, shootPose: 'throw', cd: 90 },
      footy: { name: 'FOOT SOLDIER', hp: 13, spd: 1.0, pts: 1, look: foot('#e0c020', { wpn: { type: 'sword', len: 14 } }), atk: { reach: 30, dmg: 5, pose: 'slash' }, cd: 70 },
      footo: { name: 'FOOT SOLDIER', hp: 13, spd: 1.1, pts: 1, look: foot('#f07820', { wpn: { type: 'axe', len: 12 } }), atk: { reach: 28, dmg: 5, pose: 'slash' }, ai: 'charger', chSpd: 3.2, chPose: 'dash', cd: 90 },
      footr: { name: 'FOOT SOLDIER', hp: 14, spd: 1.0, pts: 1, look: foot('#c02828', { wpn: { type: 'staff', len: 28, col: '#ccc' } }), atk: { reach: 38, dmg: 5, pose: 'thrust' }, cd: 80 },
      mouser: { name: 'MOUSER', hp: 6, spd: 1.3, pts: 1, look: { custom: mouser }, w: 12, hh: 18, atk: { reach: 14, dmg: 2, pose: 'punch' }, wind: 8, rec: 14, cd: 40 },
      rodney: { name: 'ROADKILL RODNEY', hp: 9, spd: 1.4, pts: 1, look: { custom: rodney }, w: 14, hh: 26, atk: { reach: 22, dmg: 3, pose: 'punch' }, ai: 'charger', chSpd: 3.6, chDmg: 4, cd: 70 },
      stone: { name: 'STONE WARRIOR', hp: 26, spd: 0.8, pts: 1, look: { h: 50, hs: 10, tw: 14, lw: 7, skin: '#8a8a80', body: '#6a6a62', arms: '#7a7a70', fore: '#8a8a80', legs: '#6a6a62', boots: '#55554e', hair: { style: 'helmet', col: '#5a5a52', visor: '#f40' }, eye: '#f40', wpn: { type: 'gun', len: 10, col: '#333' } }, w: 18, hh: 50, atk: { reach: 26, dmg: 6, pose: 'punch', knock: true }, ai: 'ranged', proj: { pk: 'laser', spd: 4, dmg: 5, col: '#f60' }, pref: 120, shootPose: 'shoot', cd: 100 },
      rocksteady: { name: 'ROCKSTEADY', boss: 1, hp: 150, spd: 1.0, pts: 10, w: 22, hh: 54,
        look: { h: 50, hs: 13, tw: 18, lw: 8, skin: '#9a9a8a', body: '#506030', chest: '#6a7a40', arms: '#9a9a8a', fore: '#9a9a8a', legs: '#5a4a30', boots: '#2a2a2a', belt: '#222', hair: { style: 'horns', col: '#9a9a8a', horn: '#eee' }, eye: '#000', wpn: { type: 'gun', len: 14, col: '#222' } },
        atk: { reach: 30, dmg: 7, pose: 'punch', knock: true }, proj: { pk: 'bullet', spd: 4.5, dmg: 4, burst: 3, col: '#ff4' }, pref: 110, shootPose: 'shoot', chSpd: 3.6, chDmg: 8, chPose: 'dash',
        moves: [['melee', 3], ['shoot', 3], ['charge', 2]], cd: 60 },
      bebop: { name: 'BEBOP', boss: 1, hp: 165, spd: 1.1, pts: 10, w: 22, hh: 54,
        look: { h: 50, hs: 13, tw: 18, lw: 8, skin: '#c89070', body: '#5a3a7a', chest: '#3a3a3a', arms: '#c89070', fore: '#c89070', legs: '#4060a0', boots: '#2a2a2a', belt: '#888', hair: { style: 'mohawk', col: '#a040c0' }, eye: '#000', beard: '#e8e8e8', wpn: { type: 'gun', len: 12, col: '#333' } },
        atk: { reach: 30, dmg: 7, pose: 'upper', knock: true }, proj: { pk: 'laser', spd: 5, dmg: 5, col: '#f4f' }, pref: 120, shootPose: 'shoot', chSpd: 4, chDmg: 8, chPose: 'dash',
        moves: [['melee', 3], ['charge', 3], ['shoot', 2]], cd: 60 },
      baxter: { name: 'BAXTER STOCKMAN', boss: 1, hp: 150, spd: 1.2, pts: 10, w: 30, hh: 46, fly: 1, flyZ: 34, look: { custom: baxter },
        atk: { reach: 26, dmg: 6, pose: 'punch', knock: true }, proj: { pk: 'bomb', spd: 2.2, dmg: 7, arc: 1, boom: 1, z: 30 }, pref: 70, summon: ['mouser'],
        moves: [['shoot', 4], ['summon', 2], ['melee', 2]], cd: 60 },
      granitor: { name: 'GRANITOR', boss: 1, hp: 190, spd: 0.9, pts: 10, w: 22, hh: 58,
        look: { h: 54, hs: 12, tw: 18, lw: 8, skin: '#9a8a70', body: '#7a6a50', chest: '#8a7a60', arms: '#9a8a70', fore: '#aa9a80', legs: '#6a5a40', boots: '#4a3a2a', hair: { style: 'helmet', col: '#6a5a40', visor: '#f20' }, eye: '#f20' },
        atk: { reach: 30, dmg: 8, pose: 'upper', knock: true }, beamDmg: 7, beamCol: '#f62', moves: [['melee', 3], ['beam', 2], ['leap', 2]], cd: 70 },
      rock2: { name: 'ROCKSTEADY', boss: 1, hp: 110, spd: 1.0, pts: 10, w: 22, hh: 54, look: null, atk: null, moves: [['melee', 3], ['shoot', 2], ['charge', 1]], cd: 80 },
      bebop2: { name: 'BEBOP', boss: 1, hp: 110, spd: 1.1, pts: 10, w: 22, hh: 54, look: null, atk: null, moves: [['melee', 3], ['charge', 2], ['shoot', 1]], cd: 80 },
      shredder: { name: 'SHREDDER', boss: 1, hp: 240, spd: 1.3, pts: 50, w: 18, hh: 50,
        look: { h: 48, hs: 10, tw: 12, lw: 6, skin: '#c89070', body: '#802030', chest: '#b0b0c0', arms: '#b0b0c0', fore: '#802030', hand: '#b0b0c0', legs: '#4a2a5a', boots: '#b0b0c0', belt: '#222',
          hair: { style: 'helmet', col: '#b8b8c8', visor: '#222' }, eye: '#f00', wpn: { type: 'claws', len: 8 },
          back(o, J) { o.seg(o.at(J.neck, J, -4, 0), o.at(J.hip, J, -12, -14), 8, '#4a2a5a'); },
          front(o, J) { for (let i = 0; i < 3; i++) o.seg(o.at(J.sho, J, -2 + i * 2, 2), o.at(J.sho, J, -3 + i * 3, 7), 1, '#e0e0f0', 1); } },
        atk: { reach: 30, dmg: 7, pose: 'slash', knock: true }, beamDmg: 9, beamCol: '#c4f', summon: ['foot', 'footw', 'footy'],
        moves: [['melee', 4], ['beam', 2], ['summon', 1], ['leap', 2]], cd: 50 }
    },
    items: {
      pizza: { type: 'food', heal: 48, pts: 0, label: 'PIZZA!', draw(ctx, x, y) { rect(ctx, x - 9, y - 6, 18, 6, '#e8e0c8'); rect(ctx, x - 9, y - 6, 18, 1, '#a09070'); rect(ctx, x - 6, y - 5, 12, 3, '#f0c040'); rect(ctx, x - 4, y - 5, 2, 2, '#c02020'); rect(ctx, x + 2, y - 4, 2, 2, '#c02020'); } }
    },
    props: {
      drum: { hp: 2, w: 14, drop: ['pizza', null, null], debris: '#4a6ab0', draw(ctx, x, y, hp, fl) { rect(ctx, x - 7, y - 20, 14, 20, fl ? '#fff' : '#3a5aa0'); rect(ctx, x - 7, y - 15, 14, 2, '#24407a'); rect(ctx, x - 7, y - 7, 14, 2, '#24407a'); rect(ctx, x - 5, y - 20, 3, 20, '#6a8ad0'); } },
      hydrant: { hp: 2, w: 10, drop: [null, null, 'pizza'], debris: '#e04040', draw(ctx, x, y, hp, fl) { const c = fl ? '#fff' : '#d02828'; rect(ctx, x - 4, y - 16, 8, 16, c); rect(ctx, x - 6, y - 12, 12, 3, c); rect(ctx, x - 3, y - 19, 6, 3, '#f0f0f0'); rect(ctx, x - 6, y - 2, 12, 2, '#801818'); } },
      sign: { hp: 1, w: 10, drop: [null, 'pizza'], debris: '#888', draw(ctx, x, y, hp, fl) { rect(ctx, x - 1, y - 36, 2, 36, '#999'); rect(ctx, x - 8, y - 44, 16, 10, fl ? '#fff' : '#e0c020'); rect(ctx, x - 6, y - 42, 12, 6, '#222'); } }
    },
    tunes: [
      { tempo: 9, bass: [0, null, 0, 12, 3, null, 5, 7, 0, null, 0, 12, 10, null, 7, 5], lead: [12, null, 15, null, 17, 19, null, 17, 15, null, 12, null, 10, 12, null, null] },
      { tempo: 10, bass: [0, 0, 7, 0, 5, 5, 3, 5, 0, 0, 7, 0, 10, 10, 7, 5], lead: [7, null, 10, 12, null, 10, 7, null, 5, null, 7, null, 3, null, null, null] },
      { tempo: 8, bass: [0, null, 12, null, 0, null, 10, 12, 0, null, 12, null, 3, 5, 6, 7], lead: [null, 12, null, 15, null, 12, 10, null, 12, null, 19, null, 17, 15, 12, null] }
    ]
  };
  // tag-team twins reuse their full stats
  G.enemies.rock2 = Object.assign({}, G.enemies.rocksteady, { hp: 110, cd: 80 });
  G.enemies.bebop2 = Object.assign({}, G.enemies.bebop, { hp: 110, cd: 80 });

  // ---------- backgrounds ----------
  function bgFire(ctx, cx, fr, W, H) {
    rect(ctx, 0, 0, W, 146, '#4a2a1a');
    const off = Math.floor(cx * 0.9);
    for (let i = Math.floor(off / 64) - 1; i < Math.floor(off / 64) + 7; i++) {
      const x = i * 64 - off;
      rect(ctx, x, 20, 62, 110, hash(i, 2) > 0.5 ? '#6a3a24' : '#5a3020'); rect(ctx, x + 62, 20, 2, 110, '#2a160c');
      rect(ctx, x + 14, 40, 30, 36, '#1a0a06');
      const fl = (fr >> 2) + i;
      rect(ctx, x + 16, 60 - (fl % 4) * 3, 26, 16 + (fl % 4) * 3, '#e04010'); rect(ctx, x + 20, 66 - (fl % 3) * 3, 18, 10 + (fl % 3) * 3, '#ffa020'); rect(ctx, x + 25, 70, 8, 6, '#fff080');
      rect(ctx, x + 6, 96, 50, 8, '#3a2014');
    }
    rect(ctx, 0, 0, W, 20, '#1a0c08');
    for (let x = -(fr % 16); x < W; x += 16) rect(ctx, x, 12 + ((x + fr) >> 3) % 4, 10, 6, 'rgba(60,40,30,0.8)');
    rect(ctx, 0, 130, W, 16, '#7a5a3a'); rect(ctx, 0, 130, W, 2, '#9a7a5a');
    floor(ctx, cx, W, 146, H, { style: 'planks', c1: '#8a5a30', c2: '#6a4020', tw: 40 });
  }
  function bgStreet(ctx, cx, fr, W, H, night, snow) {
    rect(ctx, 0, 0, W, 120, night ? '#0a0a28' : '#3050a0');
    if (night) for (let i = 0; i < 30; i++) rect(ctx, (hash(i, 1) * W) | 0, (hash(i, 2) * 60) | 0, 1, 1, '#fff');
    else { rect(ctx, 0, 70, W, 50, '#5070b8'); }
    buildings(ctx, cx, W, { par: 0.3, base: 120, minH: 50, maxH: 100, sw: 40, cols: night ? ['#1a1a3a', '#22224a'] : ['#506090', '#6070a0'], win: night ? '#2a2a50' : '#8090c0', lit: night ? '#ffe070' : '#a0b0e0', seed: 3 });
    buildings(ctx, cx, W, { par: 0.7, base: 132, minH: 40, maxH: 80, sw: 60, cols: night ? ['#3a2a3a', '#4a3030'] : ['#8a5040', '#a06048', '#7a6a5a'], win: '#302020', lit: night ? '#ffd050' : '#c0d0ff', wx: 10, wy: 12, ww: 5, wh: 7, seed: 7, roof: '#222' });
    rect(ctx, 0, 132, W, 20, snow ? '#d8e0f0' : '#9a9a9a'); for (let x = -(cx % 32); x < W; x += 32) rect(ctx, x, 132, 1, 20, snow ? '#b0b8d0' : '#7a7a7a');
    rect(ctx, 0, 150, W, 2, '#555');
    floor(ctx, cx, W, 152, H, { style: 'road', c1: snow ? '#a8b0c0' : '#404048', c2: snow ? '#e8ecf4' : '#e0d040' });
    for (let x = -((cx * 1.0) % 180); x < W; x += 180) { rect(ctx, x + 40, 186, 22, 6, '#202024'); rect(ctx, x + 42, 187, 18, 4, '#333'); }
  }
  function bgSewer(ctx, cx, fr, W, H) {
    rect(ctx, 0, 0, W, 146, '#1e2e1e');
    for (let y = 8, r = 0; y < 130; y += 8, r++) for (let x = -((cx * 0.8 + r * 9) % 18); x < W; x += 18) rect(ctx, x, y, 17, 7, (r + Math.floor((x + cx) / 18)) % 3 ? '#2c402a' : '#344a30');
    const off = Math.floor(cx * 0.8);
    for (let i = Math.floor(off / 120); i < Math.floor(off / 120) + 4; i++) { const x = i * 120 - off; rect(ctx, x + 30, 30, 50, 50, '#0a120a'); rect(ctx, x + 28, 28, 54, 3, '#4a5a48'); rect(ctx, x + 40, 72 + ((fr >> 3) + i) % 3, 30, 8, '#3a6a4a'); }
    rect(ctx, 0, 100, W, 6, '#6a7a60'); rect(ctx, 0, 104, W, 2, '#3a4a30');
    rect(ctx, 0, 120, W, 26, '#2a5a48'); for (let x = -((fr + cx) % 24); x < W; x += 24) rect(ctx, x, 126 + (x & 4), 12, 1, '#4a8a70');
    floor(ctx, cx, W, 146, H, { style: 'stones', c1: '#4a5a46', c2: '#3a4a36' });
  }
  function bgDock(ctx, cx, fr, W, H) {
    rect(ctx, 0, 0, W, 90, '#1a2040'); rect(ctx, 0, 60, W, 30, '#2a3050');
    buildings(ctx, cx, W, { par: 0.2, base: 90, minH: 20, maxH: 60, sw: 30, cols: ['#101830'], win: '#101830', lit: '#ffe080', seed: 11 });
    rect(ctx, 0, 90, W, 34, '#183050'); for (let x = -((fr * 0.5 + cx * 0.3) % 20); x < W; x += 20) rect(ctx, x, 96 + ((x + fr) >> 4) % 3 * 8, 8, 1, '#3a6090');
    const off = Math.floor(cx * 0.9);
    for (let i = Math.floor(off / 90) - 1; i < Math.floor(off / 90) + 5; i++) { const x = i * 90 - off; if (hash(i, 4) > 0.4) { rect(ctx, x + 10, 104, 34, 40, '#8a6a3a'); rect(ctx, x + 10, 104, 34, 2, '#aa8a5a'); rect(ctx, x + 26, 104, 2, 40, '#6a4a2a'); rect(ctx, x + 50, 118, 26, 26, '#7a5a2a'); } }
    rect(ctx, 0, 140, W, 6, '#555');
    floor(ctx, cx, W, 146, H, { style: 'planks', c1: '#6a5030', c2: '#4a3820', tw: 50 });
  }
  function bgTechno(ctx, cx, fr, W, H) {
    rect(ctx, 0, 0, W, 146, '#283038');
    const off = Math.floor(cx * 0.9);
    for (let i = Math.floor(off / 48) - 1; i < Math.floor(off / 48) + 8; i++) {
      const x = i * 48 - off; rect(ctx, x, 10, 46, 120, '#38424c'); rect(ctx, x + 46, 10, 2, 120, '#1a2026');
      rect(ctx, x + 6, 20, 34, 20, '#101820'); for (let k = 0; k < 4; k++) rect(ctx, x + 9 + k * 8, 24 + ((fr >> 3) + i + k) % 4 * 4, 5, 3, ['#f44', '#4f4', '#ff4', '#4cf'][(i + k) & 3]);
      rect(ctx, x + 12, 60, 22, 50, '#2a323a'); rect(ctx, x + 14, 62, 18, 46, '#1a2228');
    }
    rect(ctx, 0, 0, W, 10, '#101418'); rect(ctx, 0, 130, W, 16, '#505a64'); rect(ctx, 0, 130, W, 2, '#8090a0');
    floor(ctx, cx, W, 146, H, { style: 'metal', c1: '#58626c', c2: '#3a424a', c3: '#8a949e' });
  }
  function snowFg(ctx, cx, fr, W) { for (let i = 0; i < 40; i++) { const x = ((hash(i, 8) * 600 - cx * 1.1 + Math.sin(fr * 0.02 + i) * 10) % W + W) % W, y = (hash(i, 9) * 224 + fr * (0.6 + hash(i, 3) * 0.6)) % 224; rect(ctx, x, y, 2, 2, '#fff'); } }
  function emberFg(ctx, cx, fr, W) { for (let i = 0; i < 18; i++) { const x = ((hash(i, 5) * 500 - cx) % W + W) % W, y = 224 - (hash(i, 6) * 224 + fr * (0.5 + hash(i, 2))) % 224; rect(ctx, x, y, 1, 2, i % 2 ? '#ff8020' : '#ffd040'); } }

  const WV = (at, en, max, extra) => Object.assign({ at, en, max: max || 4 }, extra || {});
  G.stages = [
    { name: 'BURNING APARTMENT', len: 1500, tune: 0, bg: bgFire, fg: emberFg, haz: { kind: 'fire', every: 300, col: '#f40' },
      objs: [['item', 'pizza', 600, 196], ['prop', 'drum', 860, 160]],
      waves: [WV(150, [['foot', 3]], 3), WV(420, [['foot', 3], ['footw', 1]]), WV(760, [['foot', 2], ['footk', 2], ['footw', 1]]), WV(1050, [['foot', 3], ['footy', 2]]), WV(1500 - 288, [['rocksteady', 1], ['foot', 2]], 3, { boss: 1 })] },
    { name: 'STREETS OF NEW YORK', len: 1800, tune: 1, bg: (c, x, f, W, H) => bgStreet(c, x, f, W, H, false, false), haz: { kind: 'car', every: 520, col: '#3060d0' },
      objs: [['prop', 'hydrant', 380, 150], ['prop', 'sign', 700, 150], ['prop', 'hydrant', 1100, 150], ['item', 'pizza', 1250, 200]],
      waves: [WV(160, [['foot', 3], ['footk', 1]]), WV(460, [['footw', 2], ['foot', 2], ['rodney', 1]]), WV(780, [['footk', 2], ['footy', 2], ['footo', 1]]), WV(1100, [['foot', 3], ['footo', 2], ['footw', 1]]), WV(1380, [['rodney', 2], ['footy', 2], ['footk', 2]], 5), WV(1800 - 288, [['bebop', 1], ['foot', 2]], 3, { boss: 1 })] },
    { name: 'THE SEWERS', len: 1700, tune: 2, bg: bgSewer, haz: null,
      objs: [['prop', 'drum', 520, 170], ['item', 'pizza', 980, 190], ['prop', 'drum', 1240, 200]],
      waves: [WV(140, [['mouser', 5]], 4), WV(420, [['foot', 2], ['footr', 2], ['mouser', 2]]), WV(720, [['footw', 2], ['footk', 2], ['mouser', 3]], 5), WV(1050, [['footr', 2], ['footo', 2], ['mouser', 3]], 5), WV(1700 - 288, [['baxter', 1], ['mouser', 2]], 4, { boss: 1 })] },
    { name: 'BIG APPLE, 3 A.M.', len: 1900, tune: 1, bg: (c, x, f, W, H) => bgStreet(c, x, f, W, H, true, true), fg: snowFg, haz: { kind: 'debris', every: 340, col: '#c8d8f0' },
      objs: [['prop', 'sign', 400, 150], ['item', 'pizza', 900, 200], ['prop', 'hydrant', 1300, 150]],
      waves: [WV(160, [['footk', 3], ['footw', 1]]), WV(470, [['stone', 2], ['foot', 2]]), WV(800, [['footy', 2], ['footr', 2], ['rodney', 2]], 5), WV(1120, [['stone', 2], ['footo', 2], ['footw', 2]], 5), WV(1420, [['footk', 3], ['footy', 2], ['stone', 1]], 5), WV(1900 - 288, [['granitor', 1], ['stone', 1]], 3, { boss: 1 })] },
    { name: 'THE WAREHOUSE DOCKS', len: 1900, tune: 0, bg: bgDock, haz: { kind: 'debris', every: 300, col: '#8a6a3a' },
      objs: [['prop', 'drum', 450, 160], ['prop', 'drum', 470, 190], ['item', 'pizza', 1000, 180], ['prop', 'drum', 1400, 170]],
      waves: [WV(170, [['foot', 2], ['footo', 2], ['footw', 1]]), WV(500, [['footr', 2], ['footy', 2], ['mouser', 3]], 5), WV(850, [['stone', 2], ['footk', 3]], 5), WV(1180, [['footo', 3], ['footw', 2], ['rodney', 2]], 5), WV(1900 - 288, [['rock2', 1], ['bebop2', 1]], 2, { boss: 1, gap: 20 })] },
    { name: 'THE TECHNODROME', len: 2000, tune: 2, bg: bgTechno, haz: { kind: 'laser', every: 280, col: '#f2f' },
      objs: [['item', 'pizza', 700, 190], ['item', 'pizza', 1500, 170]],
      waves: [WV(160, [['stone', 2], ['footy', 2]]), WV(480, [['footk', 3], ['footw', 2], ['mouser', 2]], 5), WV(820, [['stone', 3], ['footr', 2]], 5), WV(1160, [['footo', 3], ['footy', 2], ['rodney', 2]], 5), WV(1460, [['stone', 2], ['footk', 3], ['footw', 2]], 5), WV(2000 - 288, [['shredder', 1]], 4, { boss: 1 })] }
  ];

  // ---------- title ----------
  G.titleBg = function (ctx, fr, W, H, md) {
    rect(ctx, 0, 0, W, H, '#060a20');
    for (let i = 0; i < 40; i++) rect(ctx, (hash(i, 1) * W) | 0, (hash(i, 2) * 110) | 0, 1, 1, (fr + i * 7) % 60 < 50 ? '#fff' : '#446');
    buildings(ctx, fr * 0.6, W, { par: 1, base: 178, minH: 30, maxH: 80, sw: 32, cols: ['#121a3a', '#18204a'], win: '#1a2246', lit: '#ffe070', seed: 2 });
    rect(ctx, 0, 178, W, 46, '#0c1028');
    if (md === 'title') for (let i = 0; i < 4; i++) drawFig(ctx, 48 + i * 64, 166, i < 2 ? 1 : -1, G.chars[i].look, (fr + i * 25) % 100 < 22 ? G.chars[i].poses[3] : 'stand', fr, ((fr + i * 25) % 22) / 22);
  };
  G.logoH = 96; G.logoY = 16;
  G.drawLogo = function (c, W) {
    textO(c, 'TEENAGE MUTANT', W / 2, 6, r => r < 4 ? '#ff4040' : '#c01010', 2, 'center', '#000');
    const g = r => ['#c8ff70', '#a0f050', '#80e040', '#60c030', '#48a828', '#389020', '#287818'][r];
    for (let k = 4; k >= 1; k--) text(c, 'NINJA', W / 2 + k, 26 + k, '#103008', 4, 'center');
    text(c, 'NINJA', W / 2, 26, g, 4, 'center');
    for (let k = 3; k >= 1; k--) text(c, 'TURTLES', W / 2 + k, 60 + k, '#103008', 3, 'center');
    text(c, 'TURTLES', W / 2, 60, g, 3, 'center');
    rect(c, 30, 86, W - 60, 2, '#e02020');
  };
  // ================= beat-'em-up engine core =================
  ArcadeRegistry.register({
    id: G.id, title: G.title, year: G.year, maker: G.maker, width: G.W, height: G.H,
    vector: false, pointer: false, controls: G.controls, marquee: G.marquee,
    create(api) {
      const W = G.W, H = G.H, FT = G.FT, FB = G.FB, A = api.audio, GRAV = 0.22;
      const S = {
        swing() { A.noise(0.06, { vol: 0.07, freq: 3500, type: 'highpass' }); },
        hit() { A.noise(0.08, { vol: 0.2, freq: 1400 }); A.tone(200, 0.06, { type: 'square', vol: 0.09, slideTo: 80 }); },
        heavy() { A.noise(0.18, { vol: 0.24, freq: 800, slideTo: 100 }); A.tone(130, 0.15, { type: 'square', vol: 0.12, slideTo: 45 }); },
        hurt() { A.tone(320, 0.14, { type: 'sawtooth', vol: 0.12, slideTo: 110 }); A.noise(0.08, { vol: 0.15, freq: 1000 }); },
        jump() { A.tone(260, 0.1, { type: 'square', vol: 0.07, slideTo: 520 }); },
        land() { A.noise(0.05, { vol: 0.08, freq: 400 }); },
        thud() { A.noise(0.2, { vol: 0.2, freq: 300, slideTo: 60 }); },
        pick() { A.melody([[880, 0.05], [1175, 0.05], [1568, 0.08]], { type: 'square', vol: 0.1 }); },
        food() { A.melody([[523, 0.06], [659, 0.06], [784, 0.06], [1047, 0.14]], { type: 'square', vol: 0.12 }); },
        special() { A.tone(180, 0.45, { type: 'sawtooth', vol: 0.12, slideTo: 1300 }); A.noise(0.4, { vol: 0.12, freq: 3000, slideTo: 300 }); },
        boom() { A.noise(0.5, { vol: 0.25, freq: 900, slideTo: 50 }); A.tone(90, 0.4, { type: 'square', vol: 0.1, slideTo: 30 }); },
        shoot() { A.tone(950, 0.08, { type: 'square', vol: 0.07, slideTo: 300 }); },
        laser() { A.tone(1500, 0.25, { type: 'sawtooth', vol: 0.07, slideTo: 200 }); },
        go() { A.tone(1320, 0.07, { type: 'square', vol: 0.1 }); A.tone(1320, 0.07, { type: 'square', vol: 0.1, delay: 0.12 }); },
        coin() { A.tone(1200, 0.05, { type: 'square', vol: 0.12 }); A.tone(1800, 0.12, { type: 'square', vol: 0.12, delay: 0.05 }); },
        die() { A.melody([[392, 0.12], [330, 0.12], [262, 0.12], [196, 0.35]], { type: 'square', vol: 0.13 }); },
        oneup() { A.melody([[784, 0.07], [988, 0.07], [1175, 0.07], [1568, 0.2]], { type: 'square', vol: 0.12 }); },
        clear() { A.melody(G.clearTune || [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.2], [784, 0.1], [1047, 0.35]], { type: 'square', vol: 0.13 }); },
        boss() { A.tone(70, 0.6, { type: 'sawtooth', vol: 0.13, slideTo: 140 }); A.noise(0.6, { vol: 0.1, freq: 500 }); },
        start() { A.melody(G.startTune || [[392, 0.08], [523, 0.08], [659, 0.08], [784, 0.2]], { type: 'square', vol: 0.13 }); }
      };
      let mode = 'title', mt = 0, fr = 0, hi = api.getHiScore(G.hiDefault || 10000), coinFlash = 0;
      let demo = false; const dk = new Set(), dkp = new Set();
      const K = c => demo ? dk.has(c) : api.key(c);
      const PR = c => demo ? dkp.has(c) : api.pressed(c);
      let sel = 0, selT = 0, P = null, ents = [], fx = [], st = null, stIdx = 0, loop = 0, camX = 0, lockX = null;
      let waveI = 0, wave = null, spawnQ = [], spawnT = 0, goT = 0, score = 0, lives = 0, nextExt = 0;
      let shake = 0, flashT = 0, flashCol = '#fff', introT = 0, freeze = 0, hazT = 0, musicT = 0, musicI = 0, bonus = null, lastCred = api.credits, bossE = null;
      let logo = null;
      function getLogo() { if (!logo) { logo = mkCanvas(W, G.logoH || 90); const c = logo.getContext('2d'); if (c) { c.imageSmoothingEnabled = false; G.drawLogo(c, W); } } return logo; }
      const diff = () => 1 + stIdx * 0.1 + loop * 0.45;
      const credStr = () => 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0');

      // ---------- creation ----------
      function newPlayer(ci) {
        const c = G.chars[ci];
        return { kind: 'player', ci, c, look: c.look, x: 40, y: (FT + FB) / 2, z: 0, vx: 0, vy: 0, vz: 0, face: 1, hp: G.php, st: 'stand', t: 0, combo: 0,
          inv: 0, cool: 0, hold: null, weap: null, mount: null, pots: 0, lastA: -99, lastJ: -99, tapL: -99, tapR: -99, run: 0, flash: 0, w: 14 };
      }
      function mkEnemy(id, x, y, z) {
        const d = G.enemies[id], hpM = (1 + loop * 0.35) * (d.boss ? 1 + stIdx * 0.05 : 1);
        const e = { kind: 'enemy', id, d, look: d.look, x, y, z: z || 0, vx: 0, vy: 0, vz: 0, face: x < P.x ? 1 : -1, hp: Math.ceil(d.hp * hpM), st: 'enter', t: 0,
          cd: 30 + Math.random() * 60, token: false, inv: 0, flash: 0, armor: 0, stag: 0, goal: null, slot: Math.floor(Math.random() * 6), oy: rnd(-20, 20),
          mount: d.mount ? G.mounts[d.mount] : null, w: d.w || 14, hh: d.hh || 44, wave: true, carry: d.thief ? (d.carry || 2) : 0 };
        e.maxhp = e.hp;
        if (d.fly) e.z = d.flyZ || 40;
        return e;
      }
      function mkItem(id, x, y, z, life) { return { kind: 'item', id, d: G.items[id], x, y: clamp(y, FT + 2, FB - 2), z: z || 0, vz: z ? 1.5 : 0, life: life || 0, t: 0 }; }
      function mkMount(m, x, y, face) { return { kind: 'mount', m, x, y, z: 0, face: face || -1, t: 0, life: 900, w: m.w || 30 }; }
      function addScore(n) {
        if (demo || !n) return; score += n;
        while (G.extend && score >= nextExt) { lives++; S.oneup(); pop(P.x, P.y, 50, '1UP', '#4f4'); nextExt += G.extend[1]; }
        if (score > hi) hi = score;
      }
      function pop(x, y, z, s, col) { fx.push({ k: 'pop', x, y, z, t: 0, dur: 50, s: String(s), col: col || '#fff' }); }
      function spark(x, y, z, col) { fx.push({ k: 'spark', x, y, z, t: 0, dur: 8, col: col || '#ff8' }); }
      function debris(x, y, z, col, n) { for (let i = 0; i < (n || 6); i++) fx.push({ k: 'deb', x, y, z, vx: rnd(-2, 2), vz: rnd(1, 3.5), t: 0, dur: 60, col }); }
      function ring(x, y, r, col, dur) { fx.push({ k: 'ring', x, y, z: 0, r, t: 0, dur: dur || 20, col }); }

      // ---------- flow ----------
      function startGame(ci) {
        P = newPlayer(ci); score = 0; lives = G.lives; loop = 0; nextExt = G.extend ? G.extend[0] : 1e12;
        S.start(); startStage(0);
      }
      function startStage(i) {
        stIdx = i; st = G.stages[i]; ents = []; fx = []; camX = 0; lockX = null; waveI = 0; wave = null; spawnQ = []; goT = 0; bossE = null;
        P.x = 30; P.y = (FT + FB) / 2; P.z = 0; P.vx = P.vy = P.vz = 0; P.st = 'stand'; P.t = 0; P.hold = null; P.inv = 60; P.face = 1; P.run = 0;
        for (const o of st.objs || []) {
          if (o[0] === 'prop') ents.push({ kind: 'prop', id: o[1], d: G.props[o[1]], x: o[2], y: o[3], z: 0, hp: G.props[o[1]].hp, w: G.props[o[1]].w || 16, t: 0 });
          else if (o[0] === 'item') ents.push(mkItem(o[1], o[2], o[3]));
          else if (o[0] === 'mount') { const m = mkMount(G.mounts[o[1]], o[2], o[3]); m.life = 1e9; ents.push(m); }
        }
        mode = 'play'; mt = 0; introT = 170; hazT = 240; musicI = 0; musicT = 0;
      }
      function nextStage() {
        if (stIdx + 1 >= G.stages.length) { mode = 'ending'; mt = 0; S.clear(); return; }
        startStage(stIdx + 1);
      }
      function gameOver() {
        if (demo) { toTitle(); return; }
        api.setHiScore(score); mode = 'over'; mt = 0;
      }
      function toTitle() { demo = false; mode = 'title'; mt = 0; P = null; ents = []; fx = []; }
      function loseLife() {
        if (demo) { toTitle(); return; }
        lives--;
        if (lives > 0) { respawn(); return; }
        P.st = 'gone';
        const cont = () => { lives = G.lives; respawn(); };
        if (api.offerContinue) api.offerContinue(cont, gameOver); else gameOver();
      }
      function respawn() {
        P.hp = G.php; P.st = 'respawn'; P.t = 0; P.z = H; P.vz = 0; P.inv = 160; P.dying = false; P.hold = null; P.weap = null; P.mount = null;
        P.x = clamp(P.x, camX + 30, camX + W - 30);
        for (const e of ents) if (e.kind === 'enemy' && Math.abs(e.x - P.x) < 50 && !e.d.boss && e.st !== 'knock' && e.hp > 0) knockE(e, e.x < P.x ? -1 : 1, false, 1);
      }
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; mode = 'select'; mt = 0; selT = 600; sel = 0; S.coin(); return true; }
        coinFlash = 90; A.tone(80, 0.2, { type: 'square', vol: 0.2 }); return false;
      }

      // ---------- combat helpers ----------
      const hittable = e => e.kind === 'enemy' && e.hp > 0 && !['knock', 'down', 'getup', 'dead', 'flee'].includes(e.st) && e.inv <= 0;
      function zOK(att, e) { return e.z <= att.z + 34 && e.z + (e.hh || 40) >= att.z - 6; }
      function hurtEnemy(e, dmg, knock, dir, thr) {
        const d = e.d;
        if (d.thief) { thiefHit(e, dir); return; }
        if (e.mount) { dropMount(e); knock = true; }
        e.hp -= dmg; e.flash = 6; e.face = -dir;
        if (e.hp <= 0) {
          e.hp = 0; e.dying = true; knockE(e, dir, thr, d.boss ? 0.6 : 1.2); addScore(d.pts); if (d.pts && G.showPts !== false) pop(e.x, e.y, e.hh, d.pts, '#ff0');
          if (d.drop && Math.random() < (d.dropP || 0.3)) { const id = d.drop[Math.floor(Math.random() * d.drop.length)]; ents.push(mkItem(id, e.x, e.y, 20, 900)); }
          if (d.boss) { shake = 20; S.boom(); flashT = 12; for (const o of ents) if (o.kind === 'enemy' && o !== e && !o.d.boss && o.hp > 0 && o.wave) { o.hp = 0; o.dying = true; knockE(o, o.x < e.x ? -1 : 1, false, 1); } }
          return;
        }
        if (d.boss) {
          if (knock && e.armor <= 0) { knockE(e, dir, thr, 0.5); e.armor = 0; e.stag = 0; return; }
          if (e.armor <= 0) { e.st = 'hurt'; e.t = 0; e.hurtDur = 9; e.stag++; if (e.stag >= 4) { e.armor = 100; e.stag = 0; } }
          return;
        }
        if (knock || e.z > 6) knockE(e, dir, thr, 1);
        else { e.st = 'hurt'; e.t = 0; e.hurtDur = 16; e.x += dir * 2; e.goal = null; }
      }
      function knockE(e, dir, thr, m) { e.st = 'knock'; e.t = 0; e.vz = thr ? 3.6 : 2.8; e.vx = dir * (thr ? 3.4 : 2.2) * m; e.vy = 0; e.thrown = thr; e.token = false; e.goal = null; e.hitSet = null; }
      function thiefHit(e, dir) {
        e.flash = 6; S.hit();
        if (e.carry > 0) { e.carry--; const id = e.d.drop[Math.floor(Math.random() * e.d.drop.length)]; ents.push(mkItem(id, e.x - dir * 6, e.y, 18, 700)); }
        e.st = 'flee'; e.t = 0; e.fdir = dir; e.z = 0; e.vz = 2;
      }
      function attackHits(att, reach, dmg, knock, thr, air) {
        let n = 0; const x0 = att.x + att.face * 2, x1 = att.x + att.face * reach, lo = Math.min(x0, x1), hiX = Math.max(x0, x1);
        for (const e of ents) {
          if (e.kind === 'prop') { if (e.x + e.w / 2 >= lo && e.x - e.w / 2 <= hiX && Math.abs(e.y - att.y) <= 10 && att.z < 30) { hitProp(e); n++; } continue; }
          if (!hittable(e)) continue;
          if (e.x + e.w / 2 >= lo && e.x - e.w / 2 <= hiX && Math.abs(e.y - att.y) <= (air ? 12 : 9) && zOK(att, e)) {
            hurtEnemy(e, dmg, knock, thr ? -att.face : att.face, thr); n++;
            spark((e.x + att.x) / 2 + att.face * 4, e.y, att.z + 26, G.sparkCol);
          }
        }
        if (n) { if (knock) S.heavy(); else S.hit(); }
        return n;
      }
      function areaHit(att, r, dmg, knock) {
        let n = 0;
        for (const e of ents) {
          const dx = e.x - att.x, dy = e.y - att.y;
          if (Math.abs(dx) > r || Math.abs(dy) > r * 0.4 + 8) continue;
          if (e.kind === 'prop') { hitProp(e); n++; continue; }
          if (!hittable(e)) continue;
          hurtEnemy(e, dmg, knock, dx >= 0 ? 1 : -1, false); spark(e.x, e.y, e.z + 24, G.sparkCol); n++;
        }
        if (n) S.heavy();
        return n;
      }
      function hitProp(e) {
        e.hp--; e.flash = 6; S.hit();
        if (e.hp <= 0) {
          e.dead = true; debris(e.x, e.y, 10, e.d.debris || '#a86', 8); S.thud(); addScore(G.propPts || 0);
          const dr = e.d.drop; if (dr) { const id = dr[Math.floor(Math.random() * dr.length)]; if (id) ents.push(mkItem(id, e.x, e.y, 10)); }
        }
      }
      function hurtPlayer(dmg, knock, dir) {
        const p = P;
        if (demo && p.hp - dmg <= 0) dmg = 0;
        if (p.inv > 0 || ['knock', 'down', 'getup', 'dead', 'respawn', 'gone', 'special'].includes(p.st)) return false;
        dmg *= (1 + loop * 0.25) * (G.dmgMul || 1);
        p.hp -= dmg; p.flash = 8; S.hurt();
        if (p.hold) { ents.push(mkItem(p.hold, p.x, p.y, 20)); p.hold = null; }
        if (p.mount) { dismount(p); knock = true; }
        p.combo = 0; p.run = 0;
        if (p.hp <= 0) { p.hp = 0; p.dying = true; knock = true; }
        if (knock) { p.st = 'knock'; p.t = 0; p.vz = 2.8; p.vx = dir * 2; p.weap = p.dying ? null : p.weap; }
        else { p.st = 'hurt'; p.t = 0; p.x += dir * 3; }
        return true;
      }
      function dismount(p) { const m = mkMount(p.mount, p.x, p.y, p.face); m.life = 600; ents.push(m); p.mount = null; }
      function dropMount(e) { const m = mkMount(e.mount, e.x, e.y, e.face); ents.push(m); e.mount = null; }
      function proj(o) { o.kind = 'proj'; o.t = 0; o.vy = o.vy || 0; o.z = o.z == null ? 24 : o.z; o.life = o.life || 220; o.hitSet = new Set(); ents.push(o); return o; }

      // ---------- player ----------
      function nearItem(pred) { for (const e of ents) if (e.kind === 'item' && Math.abs(e.x - P.x) < 14 && Math.abs(e.y - P.y) < 9 && e.z < 6 && (!pred || pred(e))) return e; return null; }
      function startAtk(ci) { const p = P; p.st = 'atk'; p.t = 0; p.combo = ci; p.hitAny = false; p.queued = false; S.swing(); }
      function actionPress() {
        const p = P;
        if (p.mount) { p.st = 'matk'; p.t = 0; S.swing(); return; }
        const it = !p.hold && !p.weap && nearItem(e => e.d.type === 'weapon' || e.d.type === 'throw');
        if (it) { it.dead = true; if (it.d.type === 'weapon') p.weap = { d: it.d, ammo: it.d.ammo }; else p.hold = it.id; p.st = 'pick'; p.t = 0; S.pick(); return; }
        if (p.hold) {
          const d = G.items[p.hold]; p.hold = null; p.st = 'throwH'; p.t = 0; S.swing();
          proj({ own: 'p', pk: 'item', item: d, x: p.x + p.face * 8, y: p.y, z: 30, vx: p.face * 4.6, vz: 0.8, arc: true, grav: 0.08, dmg: d.dmg || 5, knock: true, pierce: false, w: 8 });
          return;
        }
        if (p.weap) {
          const f = p.weap.d.fire; p.st = 'shoot'; p.t = 0; p.shootDur = f.rate || 10;
          for (let i = 0; i < (f.n || 1); i++) proj({ own: 'p', pk: f.kind, col: f.col, x: p.x + p.face * 14, y: p.y + (i - ((f.n || 1) - 1) / 2) * 4, z: 26, vx: p.face * (f.spd || 6), dmg: f.dmg, knock: !!f.knock, pierce: !!f.pierce, w: f.w || 5, boom: f.boom, life: f.life || 80 });
          if (f.kind === 'flame') S.special(); else S.shoot();
          if (--p.weap.ammo <= 0) p.weap = null;
          return;
        }
        if (p.st === 'run') { p.st = 'datk'; p.t = 0; p.hitDone = false; S.swing(); return; }
        startAtk(0);
      }
      function trySpecial() {
        const p = P, s = p.c.sp;
        if (!s || p.cool > 0) return false;
        if (s.kind === 'magic') { if (p.pots < 1) { A.tone(150, 0.1, { type: 'square', vol: 0.1 }); return false; } }
        else if (s.cost && p.hp <= s.cost) return false;
        if (s.cost && s.kind !== 'magic') p.hp -= s.cost;
        p.st = 'special'; p.t = 0; p.z = 0; p.vz = 0; p.cool = s.cool || 30; p.lvl = 0; S.special();
        if (s.kind === 'magic') { p.lvl = Math.min(p.pots, p.c.maxPots || 9); p.pots = 0; freeze = 110; flashCol = s.col; flashT = 6; }
        return true;
      }
      function nearestEnemy() { let b = null, bd = 1e9; for (const e of ents) if (hittable(e) && e.x > camX - 10 && e.x < camX + W + 10) { const d = Math.abs(e.x - P.x) + Math.abs(e.y - P.y) * 2; if (d < bd) { bd = d; b = e; } } return b; }
      function updSpecial() {
        const p = P, s = p.c.sp, T = p.t, dmg = (s.dmg || 4);
        let dur = s.dur || 36;
        switch (s.kind) {
          case 'spin': dur = 34; if (T % 4 === 0) p.face *= -1; if (T % 6 === 3) areaHit(p, s.r || 34, dmg, T > 24); p.z = T < 17 ? T * 0.7 : (34 - T) * 0.7; if (T % 6 === 0) ring(p.x, p.y, s.r || 34, s.col, 10); break;
          case 'drill': dur = 30; p.x += p.face * (s.spd || 4); if (T % 5 === 0) attackHits(p, 26, dmg, true); if (T % 3 === 0) fx.push({ k: 'dust', x: p.x - p.face * 8, y: p.y, z: 0, t: 0, dur: 16 }); break;
          case 'leap': dur = 200; if (T === 0) { p.vz = 5.2; p.sv = p.face * 2.4; } p.x += p.sv; p.z += p.vz; p.vz -= GRAV;
            if (T > 6 && T % 4 === 0) attackHits(p, 24, dmg * 0.5, false, false, true);
            if (p.z <= 0 && T > 3) { p.z = 0; areaHit(p, s.r || 44, dmg, true); shake = 8; ring(p.x, p.y, s.r || 44, s.col, 18); S.boom(); dur = 0; } break;
          case 'flurry': dur = 34; if (T % 4 === 1) attackHits(p, s.r || (p.c.reach + 8), dmg * 0.6, T >= 29); break;
          case 'beam': dur = 36; if (T === 10) { S.laser(); const n = s.n || 1; for (let i = 0; i < n; i++) proj({ own: 'p', pk: 'beam', col: s.col, col2: s.col2, x: p.x + p.face * 14, y: p.y + (i - (n - 1) / 2) * 6, z: s.z || 28, vx: p.face * (s.spd || 7), vy: (i - (n - 1) / 2) * (s.spread || 0), dmg, knock: true, pierce: true, w: s.len || 30, life: 70 }); } break;
          case 'nova': dur = 44; if (T === 14) { areaHit(p, s.r || 90, dmg, true); flashCol = s.col; flashT = 8; shake = 8; ring(p.x, p.y, s.r || 90, s.col, 26); ring(p.x, p.y, (s.r || 90) * 0.6, s.col2 || '#fff', 20); } break;
          case 'teleport': dur = 42;
            if (T === 0) fx.push({ k: 'bamf', x: p.x, y: p.y, z: 20, t: 0, dur: 24, col: s.col });
            if (T === 8) { const e = nearestEnemy(); if (e) { p.x = clamp(e.x - e.face * 18, camX + 10, camX + W - 10); p.y = e.y; p.face = e.x > p.x ? 1 : -1; } fx.push({ k: 'bamf', x: p.x, y: p.y, z: 20, t: 0, dur: 24, col: s.col }); }
            if (T >= 12 && T % 5 === 0) attackHits(p, 30, dmg * 0.6, T >= 37); break;
          case 'magic': dur = 110;
            if (T === 60) { const lv = p.lvl; for (const e of ents) if (hittable(e) && e.x > camX - 10 && e.x < camX + W + 10) hurtEnemy(e, (e.d.boss ? 0.55 : 1) * dmg * lv, true, e.x >= p.x ? 1 : -1); shake = 14; S.boom(); flashCol = s.col; flashT = 10; }
            if (T % 12 === 0) (s.style === 'lightning' ? S.laser : S.thud)(); break;
        }
        if (T >= dur) { p.st = 'stand'; p.t = 0; p.z = 0; p.inv = Math.max(p.inv, 20); }
      }
      function updPlayer() {
        const p = P, c = p.c; p.t++;
        if (p.inv > 0) p.inv--; if (p.cool > 0) p.cool--; if (p.flash > 0) p.flash--;
        const L = K('ArrowLeft'), R = K('ArrowRight'), U = K('ArrowUp'), D = K('ArrowDown');
        const aP = PR('Space'), jP = PR('KeyX'), zP = PR('KeyZ');
        if (aP) p.lastA = fr; if (jP) p.lastJ = fr;
        const spec = zP || (aP && fr - p.lastJ <= 6) || (jP && fr - p.lastA <= 6);
        const canSpec = ['stand', 'walk', 'run'].includes(p.st) || (p.st === 'atk' && p.t < 7 && p.combo === 0) || (p.st === 'jump' && p.t < 8);
        if (spec && canSpec && !p.mount && !p.hold && trySpecial()) return;
        const mx = (R ? 1 : 0) - (L ? 1 : 0), my = (D ? 1 : 0) - (U ? 1 : 0);
        switch (p.st) {
          case 'stand': case 'walk': case 'run': {
            if (PR('ArrowRight')) { if (fr - p.tapR < 14) p.run = 1; p.tapR = fr; }
            if (PR('ArrowLeft')) { if (fr - p.tapL < 14) p.run = -1; p.tapL = fr; }
            if ((p.run === 1 && !R) || (p.run === -1 && !L) || p.mount || p.hold || G.noRun) p.run = 0;
            const spd = (p.mount ? p.mount.spd : c.spd) * (p.run ? 1.9 : 1);
            p.vx = mx * spd; p.vy = my * spd * 0.62; if (mx) p.face = mx;
            p.st = p.run ? 'run' : (mx || my) ? 'walk' : 'stand';
            if (jP) {
              if (p.mount) { dismount(p); p.st = 'jump'; p.t = 0; p.vz = G.jumpV * 0.8; p.jx = 0; p.jatk = false; break; }
              p.st = 'jump'; p.t = 0; p.vz = G.jumpV * (c.jump || 1); p.jx = p.run ? p.run * c.spd * 1.8 : mx * c.spd * 1.1; p.jatk = false; p.hitDone = false; S.jump(); break;
            }
            if (aP) actionPress();
            break;
          }
          case 'atk': {
            p.vx = 0; p.vy = 0;
            const fin = p.combo >= c.combo - 1, T = c.atkT + (fin ? 5 : 0), act = Math.floor(T * 0.4);
            if (p.t === act) {
              const back = p.face === 1 ? L : R;
              if (attackHits(p, c.reach * (fin ? 1.12 : 1), c.pow * (fin ? 1.6 : 1), fin, fin && back && !G.noThrow)) p.hitAny = true;
            }
            if (aP && p.t > act - 3) p.queued = true;
            if (p.t >= T) { if (p.queued) startAtk(p.hitAny && !fin ? p.combo + 1 : 0); else { p.st = 'stand'; p.combo = 0; } }
            break;
          }
          case 'jump': {
            p.x += p.jx; p.y += my * 0.5; p.z += p.vz; p.vz -= GRAV;
            if (aP && !p.jatk) { p.jatk = true; p.jt = 0; S.swing(); }
            if (p.jatk) { p.jt++; if (!p.hitDone && p.jt >= 3 && p.jt <= 16 && attackHits(p, c.reach * 0.95, c.pow * 1.3, true, false, true)) p.hitDone = true; }
            if (p.vz < 0 && p.z < 26) for (const m of ents) if (m.kind === 'mount' && !m.dead && !m.fleeing && Math.abs(m.x - p.x) < 16 && Math.abs(m.y - p.y) < 9) { p.mount = m.m; m.dead = true; p.st = 'stand'; p.z = 0; S.pick(); break; }
            if (p.z <= 0 && p.t > 2 && p.st === 'jump') { p.z = 0; p.vz = 0; p.st = 'stand'; S.land(); }
            break;
          }
          case 'datk': {
            const T = 22; p.vx = p.face * c.spd * 2.6 * (1 - p.t / T); p.vy = 0;
            if (!p.hitDone && p.t >= 2 && p.t <= 14 && attackHits(p, c.reach * 0.9, c.pow * 1.5, true)) p.hitDone = true;
            if (p.t >= T) p.st = 'stand';
            break;
          }
          case 'pick': p.vx = p.vy = 0; if (p.t >= 10) p.st = 'stand'; break;
          case 'throwH': p.vx = p.vy = 0; if (p.t >= 12) p.st = 'stand'; break;
          case 'shoot': p.vx = p.vy = 0; if (p.t >= p.shootDur) p.st = 'stand'; break;
          case 'matk': {
            const m = p.mount; p.vx = p.vy = 0; if (!m) { p.st = 'stand'; break; }
            const T = m.atk.t || 24;
            if (p.t === Math.floor(T * 0.4)) mountStrike(p, m, 'p');
            if (p.t >= T) p.st = 'stand';
            break;
          }
          case 'hurt': p.vx = p.vy = 0; if (p.t >= 18) p.st = 'stand'; break;
          case 'knock': p.x += p.vx; p.z += p.vz; p.vz -= GRAV; if (p.z <= 0 && p.t > 2) { p.z = 0; p.st = p.dying ? 'dead' : 'down'; p.t = 0; S.thud(); shake = 3; if (p.dying) S.die(); } break;
          case 'down': if (p.t >= 40) { p.st = 'getup'; p.t = 0; } break;
          case 'getup': if (p.t >= 14) { p.st = 'stand'; p.inv = 70; } break;
          case 'dead': if (p.t >= 90) loseLife(); break;
          case 'respawn': p.z = Math.max(0, p.z - 5); if (p.z <= 0) { p.st = 'stand'; S.land(); } break;
          case 'special': updSpecial(); break;
        }
        if (p.st === 'stand' || p.st === 'walk' || p.st === 'run') { p.x += p.vx; p.y += p.vy; }
        if (p.st === 'datk') p.x += p.vx;
        p.y = clamp(p.y, FT, FB); p.x = clamp(p.x, camX + 10, camX + W - 10);
        // pickups
        if (p.z < 8 && !['knock', 'down', 'dead', 'gone'].includes(p.st)) for (const e of ents) {
          if (e.kind !== 'item' || e.dead || e.z > 4 || Math.abs(e.x - p.x) > 13 || Math.abs(e.y - p.y) > 8) continue;
          const d = e.d;
          if (d.type === 'food') { e.dead = true; p.hp = Math.min(G.php, p.hp + (d.heal || G.php)); addScore(d.pts || 0); S.food(); pop(e.x, e.y, 30, d.label || 'YUM!', '#8f8'); }
          else if (d.type === 'pot') { e.dead = true; p.pots = Math.min(p.c.maxPots || 9, p.pots + 1); S.pick(); }
          else if (d.type === 'pts') { e.dead = true; addScore(d.pts); S.pick(); pop(e.x, e.y, 30, d.pts, '#ff0'); }
        }
      }
      function mountStrike(att, m, side) {
        const a = m.atk;
        if (side === 'p') {
          if (a.kind === 'breath' || a.kind === 'fireball') {
            S.special();
            proj({ own: 'p', pk: a.kind === 'breath' ? 'fire' : 'fireball', x: att.x + att.face * 20, y: att.y, z: a.z || 20, vx: att.face * (a.kind === 'breath' ? 3 : 4), dmg: a.dmg, knock: true, pierce: a.kind === 'breath', w: a.kind === 'breath' ? 14 : 8, life: a.kind === 'breath' ? (a.reach || 50) / 3 : 90 });
          } else attackHits(att, a.reach || 40, a.dmg, true);
        } else {
          if (a.kind === 'breath' || a.kind === 'fireball') {
            proj({ own: 'e', pk: a.kind === 'breath' ? 'fire' : 'fireball', x: att.x + att.face * 20, y: att.y, z: a.z || 20, vx: att.face * (a.kind === 'breath' ? 3 : 3.5), dmg: a.dmg * 0.6, knock: true, pierce: true, w: a.kind === 'breath' ? 14 : 8, life: a.kind === 'breath' ? (a.reach || 50) / 3 : 90 });
          } else enemyHitBox(att, a.reach || 40, a.dmg * 0.7, true);
        }
      }
      function enemyHitBox(e, reach, dmg, knock) {
        const p = P, lo = Math.min(e.x, e.x + e.face * reach), hiX = Math.max(e.x, e.x + e.face * reach);
        if (p.x + 7 >= lo && p.x - 7 <= hiX && Math.abs(p.y - e.y) <= 8 && p.z < e.z + 30 && p.z + 40 > e.z) { if (hurtPlayer(dmg, knock, e.face)) { spark(p.x, p.y, p.z + 26, '#fff'); return true; } }
        return false;
      }

      // ---------- enemies ----------
      function chooseGoal(e) {
        const d = e.d;
        if (d.boss) {
          const mv = d.moves; let tot = 0; for (const m of mv) tot += m[1];
          let r = Math.random() * tot; for (const m of mv) { r -= m[1]; if (r <= 0) return m[0]; } return mv[0][0];
        }
        switch (d.ai) {
          case 'ranged': return Math.random() < 0.7 ? 'shoot' : 'melee';
          case 'charger': return Math.random() < 0.55 ? 'charge' : 'melee';
          case 'jumper': return Math.random() < 0.5 ? 'leap' : 'melee';
          default: return 'melee';
        }
      }
      function updEnemy(e) {
        const d = e.d; e.t++;
        if (e.flash > 0) e.flash--; if (e.inv > 0) e.inv--; if (e.armor > 0) e.armor--;
        const df = diff(), dx = P.x - e.x, dy = P.y - e.y, sg = dx >= 0 ? 1 : -1;
        const pOK = !['dead', 'gone', 'respawn'].includes(P.st);
        switch (e.st) {
          case 'enter': {
            if (e.z > 0 && !d.fly) { e.z += e.vz; e.vz -= GRAV; if (e.z <= 0) { e.z = 0; S.land(); } }
            const tx = clamp(e.x, camX + 24, camX + W - 24);
            e.x += clamp(tx - e.x, -d.spd * 1.2, d.spd * 1.2); e.face = sg;
            if (Math.abs(tx - e.x) < 1 && (e.z <= 0 || d.fly)) { e.st = d.thief ? 'thief' : 'walk'; e.t = 0; if (d.boss) S.boss(); }
            break;
          }
          case 'thief': {
            if (!e.tdir) e.tdir = e.x < camX + W / 2 ? 1 : -1;
            e.x += e.tdir * d.spd; e.y += Math.sin(e.t * 0.05) * 0.3; e.face = e.tdir;
            if (e.x < camX - 30 || e.x > camX + W + 30) e.dead = true;
            break;
          }
          case 'flee': {
            e.x -= -e.fdir * 2.8; e.face = e.fdir; e.z = Math.max(0, e.z + e.vz); e.vz -= GRAV;
            if (e.carry > 0 && e.t > 40) { e.st = 'thief'; e.tdir = e.fdir; }
            if (e.x < camX - 30 || e.x > camX + W + 30) e.dead = true;
            break;
          }
          case 'walk': {
            if (d.fly) { const tz = (e.goal === 'melee' && (e.token || d.boss) && Math.abs(dx) < 70) ? 0 : (d.flyZ || 40) + Math.sin(e.t * 0.06) * 6; e.z += clamp(tz - e.z, -1.2, 1.2); }
            if (e.t > 240) { e.goal = null; e.t = 0; }
            if (!e.goal) e.goal = chooseGoal(e);
            let tx = e.x, ty = e.y, sp = d.spd * (0.9 + df * 0.1);
            const reach = (e.mount ? e.mount.atk.reach : d.atk.reach) || 24;
            if (!pOK) { tx = P.x - sg * 90; ty = e.y; }
            else if (e.goal === 'melee') {
              if (e.token || d.boss) { tx = P.x - sg * (reach * 0.7 + 4); ty = P.y; }
              else { tx = P.x - sg * (64 + (e.slot % 3) * 20); ty = clamp(P.y + e.oy, FT, FB); sp *= 0.6; }
              if ((e.token || d.boss) && Math.abs(dx) <= reach + 6 && Math.abs(dy) <= 6 && e.cd <= 0 && (!d.fly || e.z < 6)) { e.st = 'wind'; e.t = 0; e.face = sg; break; }
            } else if (e.goal === 'shoot' || e.goal === 'beam') {
              tx = P.x - sg * (d.pref || 110); ty = P.y;
              if (Math.abs(dy) <= 5 && e.cd <= 0 && e.x > camX && e.x < camX + W) { e.st = e.goal; e.t = 0; e.face = sg; break; }
            } else if (e.goal === 'charge') {
              tx = P.x - sg * 120; ty = P.y;
              if (Math.abs(dy) <= 6 && e.cd <= 0 && Math.abs(dx) > 50 && e.x > camX && e.x < camX + W) { e.st = 'charge'; e.t = 0; e.face = sg; e.hitDone = false; break; }
            } else if (e.goal === 'leap') {
              tx = P.x - sg * 80; ty = P.y;
              if (e.cd <= 0 && Math.abs(dx) < 150) { e.st = 'leap'; e.t = 0; e.vz = 4.2; const tt = 2 * 4.2 / GRAV; e.vx = clamp(dx / tt, -3.5, 3.5); e.vy = clamp(dy / tt, -1.5, 1.5); e.face = sg; e.z = 0.1; break; }
            } else if (e.goal === 'summon') { if (countAlive() < 6) { e.st = 'summon'; e.t = 0; } else e.goal = 'melee'; break; }
            if (e.x < camX + 6 && tx < e.x) tx = e.x; if (e.x > camX + W - 6 && tx > e.x) tx = e.x;
            const ddx = tx - e.x, ddy = ty - e.y;
            const msp = e.mount ? e.mount.spd * 0.8 : sp;
            e.vx = Math.abs(ddx) > 2 ? clamp(ddx, -msp, msp) : 0; e.vy = Math.abs(ddy) > 1 ? clamp(ddy, -msp * 0.6, msp * 0.6) : 0;
            e.x += e.vx; e.y += e.vy; e.face = sg; e.moving = Math.abs(e.vx) + Math.abs(e.vy) > 0.2;
            e.cd -= df;
            // ride a free beast
            if (d.ride && !e.mount) for (const m of ents) if (m.kind === 'mount' && !m.dead && Math.abs(m.x - e.x) < 12 && Math.abs(m.y - e.y) < 8) { e.mount = m.m; m.dead = true; break; }
            break;
          }
          case 'wind': if (e.t >= (d.wind || 14) / Math.min(1.6, 0.8 + df * 0.2)) { e.st = 'atk'; e.t = 0; S.swing(); } break;
          case 'atk':
            if (e.t === 2) { if (e.mount) mountStrike(e, e.mount, 'e'); else enemyHitBox(e, d.atk.reach || 24, d.atk.dmg || 2, !!d.atk.knock); }
            if (e.t >= 10) { e.st = 'rec'; e.t = 0; } break;
          case 'rec': if (e.t >= (d.rec || 20)) { e.st = 'walk'; e.t = 0; endMove(e); } break;
          case 'shoot': {
            const pj = d.proj || { pk: 'star', spd: 3, dmg: 2 };
            const n = pj.burst || 1;
            for (let i = 0; i < n; i++) if (e.t === (d.wind || 16) + i * 10) {
              proj({ own: 'e', pk: pj.pk, col: pj.col, x: e.x + e.face * 12, y: e.y, z: e.z + (pj.z || 24), vx: e.face * pj.spd, vz: pj.arc ? 3 : 0, arc: !!pj.arc, grav: 0.18, dmg: pj.dmg, knock: !!pj.knock, w: pj.w || 5, boom: pj.boom, life: 160 });
              if (pj.pk === 'laser') S.laser(); else S.shoot();
            }
            if (e.t >= (d.wind || 16) + n * 10 + 10) { e.st = 'walk'; e.t = 0; endMove(e); }
            break;
          }
          case 'beam': {
            if (e.t === 40) S.laser();
            if (e.t > 40 && e.t < 70 && !e.hitDone) { const inF = (P.x - e.x) * e.face > 0; if (inF && Math.abs(P.y - e.y) < 8 && P.z < 30) { if (hurtPlayer(d.beamDmg || 4, true, e.face)) e.hitDone = true; } }
            if (e.t >= 76) { e.st = 'walk'; e.t = 0; e.hitDone = false; endMove(e); }
            break;
          }
          case 'charge': {
            e.x += e.face * (d.chSpd || 3.4);
            if (e.t % 4 === 0) fx.push({ k: 'dust', x: e.x - e.face * 8, y: e.y, z: 0, t: 0, dur: 14 });
            if (!e.hitDone && enemyHitBox(e, 16, d.chDmg || d.atk.dmg + 1, true)) e.hitDone = true;
            if (e.t > 100 || (e.face > 0 && e.x > camX + W - 12) || (e.face < 0 && e.x < camX + 12) || (e.x - P.x) * e.face > 60) { e.st = 'rec'; e.t = 0; }
            break;
          }
          case 'leap': {
            e.x += e.vx; e.y += e.vy; e.z += e.vz; e.vz -= GRAV;
            if (e.z <= 0 && e.t > 2) {
              e.z = 0; e.st = 'rec'; e.t = 0; S.land();
              if (d.boss) { shake = 8; ring(e.x, e.y, 34, '#fff', 14); }
              if (Math.abs(P.x - e.x) < (d.boss ? 34 : 20) && Math.abs(P.y - e.y) < 10 && P.z < 10) hurtPlayer(d.atk.dmg + 1, true, P.x >= e.x ? 1 : -1);
            }
            break;
          }
          case 'summon':
            if (e.t === 20) { for (let i = 0; i < 2; i++) spawnEnemy(d.summon[Math.floor(Math.random() * d.summon.length)], i ? 1 : -1); A.tone(400, 0.3, { type: 'triangle', vol: 0.12, slideTo: 800 }); }
            if (e.t >= 40) { e.st = 'walk'; e.t = 0; endMove(e); } break;
          case 'hurt': if (e.t >= e.hurtDur) { e.st = 'walk'; e.t = 0; } break;
          case 'knock': {
            e.x += e.vx; e.z += e.vz; e.vz -= GRAV;
            if (e.thrown) for (const o of ents) if (o !== e && hittable(o) && Math.abs(o.x - e.x) < 14 && Math.abs(o.y - e.y) < 9 && !(e.hitSet || (e.hitSet = new Set())).has(o)) { e.hitSet.add(o); hurtEnemy(o, 3, true, e.vx > 0 ? 1 : -1); S.heavy(); }
            if (e.z <= 0 && e.t > 2) { e.z = 0; e.st = e.dying ? 'dead' : 'down'; e.t = 0; S.thud(); if (d.boss) shake = 6; }
            break;
          }
          case 'down': if (e.t >= (d.boss ? 30 : 38)) { e.st = 'getup'; e.t = 0; } break;
          case 'getup': if (e.t >= 12) { e.st = 'walk'; e.t = 0; e.inv = 15; e.cd = Math.max(e.cd, 20); } break;
          case 'dead': if (e.t >= 45) e.dead = true; break;
        }
        e.y = clamp(e.y, FT, FB);
        if (e.st !== 'enter' && e.st !== 'thief' && e.st !== 'flee') e.x = clamp(e.x, camX - 4, camX + W + 4);
      }
      function endMove(e) { e.goal = null; e.cd = (e.d.cd || 70) * (0.6 + Math.random() * 0.8) / Math.min(2.2, diff()); }
      function countAlive() { let n = 0; for (const e of ents) if (e.kind === 'enemy' && e.hp > 0 && !e.d.thief) n++; return n; }
      function spawnEnemy(id, side) {
        const d = G.enemies[id];
        side = side || (Math.random() < 0.5 ? -1 : 1);
        let x = side < 0 ? camX - 24 : camX + W + 24, y = rnd(FT + 4, FB - 4), z = 0;
        if (d.spawn === 'drop') { x = clamp(P.x + rnd(-90, 90), camX + 30, camX + W - 30); z = H; }
        if (d.boss) { x = camX + W + 30; y = (FT + FB) / 2; }
        const e = mkEnemy(id, x, y, z); e.vz = 0;
        ents.push(e); if (d.boss) bossE = e;
        return e;
      }
      function assignTokens() {
        const list = [];
        for (const e of ents) if (e.kind === 'enemy' && e.hp > 0 && !e.d.boss && !e.d.thief) { e.token = false; list.push(e); }
        list.sort((a, b) => (Math.abs(a.x - P.x) + Math.abs(a.y - P.y)) - (Math.abs(b.x - P.x) + Math.abs(b.y - P.y)));
        const n = Math.min(4, 2 + Math.floor(diff() * 0.6));
        for (let i = 0; i < list.length && i < n; i++) list[i].token = true;
      }

      // ---------- waves, camera, hazards ----------
      function updWaves() {
        const wv = st.waves;
        if (!wave) {
          const tgtMax = waveI < wv.length ? wv[waveI].at : st.len - W;
          const tgt = Math.min(P.x - W * 0.42, tgtMax);
          if (tgt > camX) camX = Math.min(tgt, camX + 2.2);
          if (waveI < wv.length && camX >= wv[waveI].at - 0.5) {
            wave = wv[waveI]; camX = wave.at; lockX = camX; spawnQ = [];
            for (const g of wave.en) for (let i = 0; i < g[1] + (loop > 0 && !G.enemies[g[0]].boss ? 1 : 0); i++) spawnQ.push(g[0]);
            if (!wave.boss) spawnQ.sort(() => Math.random() - 0.5);
            spawnT = 20;
          }
        } else {
          if (spawnQ.length && --spawnT <= 0) {
            const lim = (wave.max || G.maxAlive || 5);
            if (countAlive() < lim || G.enemies[spawnQ[0]].thief) { spawnEnemy(spawnQ.shift()); spawnT = wave.gap || Math.max(14, 40 - stIdx * 3); }
            else spawnT = 10;
          }
          let alive = false; for (const e of ents) if (e.kind === 'enemy' && e.wave && !e.dead && (e.hp > 0 || e.d.thief)) { alive = true; break; }
          if (!spawnQ.length && !alive) {
            wave = null; lockX = null; waveI++;
            if (waveI >= wv.length) { mode = 'clear'; mt = 0; S.clear(); P.st = P.st === 'special' ? 'stand' : P.st; }
            else { goT = 150; S.go(); }
          }
        }
      }
      function updHaz() {
        const hz = st.haz; if (!hz || introT > 0) return;
        if (--hazT > 0) return;
        hazT = Math.max(60, hz.every / Math.min(1.8, diff()) * rnd(0.7, 1.3));
        const h = { kind: 'haz', hk: hz.kind, t: 0, x: clamp(P.x + rnd(-40, 40), camX + 20, camX + W - 20), y: clamp(P.y + rnd(-10, 10), FT, FB), z: 0, dir: Math.random() < 0.5 ? 1 : -1 };
        if (hz.kind === 'laser' || hz.kind === 'car') h.y = clamp(P.y + rnd(-6, 6), FT + 4, FB - 4);
        if (hz.kind === 'car') h.x = h.dir > 0 ? camX - 60 : camX + W + 60;
        ents.push(h);
      }
      function updHazE(h) {
        h.t++;
        const hurtAt = (r, ry, dmg) => { if (Math.abs(P.x - h.x) < r && Math.abs(P.y - h.y) < ry && P.z < 14) hurtPlayer(dmg, true, P.x >= h.x ? 1 : -1); for (const e of ents) if (hittable(e) && !e.d.boss && Math.abs(e.x - h.x) < r && Math.abs(e.y - h.y) < ry) hurtEnemy(e, 3, true, e.x >= h.x ? 1 : -1); };
        switch (h.hk) {
          case 'debris': if (h.t === 55) { hurtAt(16, 9, 3); debris(h.x, h.y, 2, '#887', 6); S.thud(); shake = 3; } if (h.t > 60) h.dead = true; break;
          case 'fire': if (h.t > 40 && h.t < 110 && h.t % 10 === 0) hurtAt(10, 6, 2); if (h.t > 110) h.dead = true; break;
          case 'laser': if (h.t === 50) S.laser(); if (h.t > 50 && h.t < 70 && Math.abs(P.y - h.y) < 5 && P.z < 16) hurtPlayer(3, true, 1); if (h.t > 70) h.dead = true; break;
          case 'car': if (h.t > 50) { h.x += h.dir * 6; if (h.t % 2 === 0) hurtAt(22, 7, 4); } if (h.t > 50 && (h.x < camX - 80 || h.x > camX + W + 80)) h.dead = true; if (h.t === 51) A.noise(0.6, { vol: 0.12, freq: 400 }); break;
          default: h.dead = true;
        }
      }
      function updProj(o) {
        o.t++; o.x += o.vx; o.y += o.vy;
        if (o.arc) { o.z += o.vz; o.vz -= o.grav || 0.18; if (o.z <= 0) { if (o.boom) explode(o); else if (o.pk === 'item') { debris(o.x, o.y, 2, '#ccc', 5); S.thud(); } o.dead = true; return; } }
        if (--o.life <= 0 || o.x < camX - 50 || o.x > camX + W + 50) { if (o.boom && o.life <= 0) explode(o); o.dead = true; return; }
        if (o.own === 'e') {
          if (Math.abs(P.y - o.y) <= 7 && Math.abs(P.x - o.x) <= 7 + o.w / 2 && P.z <= o.z + 8 && P.z + 42 >= o.z) {
            if (o.boom) { explode(o); o.dead = true; return; }
            if (hurtPlayer(o.dmg, o.knock, o.vx >= 0 ? 1 : -1) && !o.pierce) o.dead = true;
          }
        } else {
          for (const e of ents) {
            if (o.hitSet.has(e)) continue;
            if (e.kind === 'prop' && Math.abs(e.x - o.x) < e.w / 2 + o.w / 2 && Math.abs(e.y - o.y) < 9) { o.hitSet.add(e); hitProp(e); if (!o.pierce) { o.dead = true; return; } continue; }
            if (!hittable(e)) continue;
            if (Math.abs(e.y - o.y) <= 9 && Math.abs(e.x - o.x) <= e.w / 2 + o.w / 2 && zOK(o, e)) {
              o.hitSet.add(e);
              if (o.boom) { explode(o); o.dead = true; return; }
              hurtEnemy(e, o.dmg, o.knock, o.vx >= 0 ? 1 : -1); spark(e.x, e.y, o.z + 4, o.col || G.sparkCol); S.hit();
              if (!o.pierce) { o.dead = true; return; }
            }
          }
        }
      }
      function explode(o) {
        fx.push({ k: 'boom', x: o.x, y: o.y, z: Math.max(0, o.z), t: 0, dur: 22 }); S.boom(); shake = 5;
        if (o.own === 'e') { if (Math.abs(P.x - o.x) < 22 && Math.abs(P.y - o.y) < 10) hurtPlayer(o.dmg, true, P.x >= o.x ? 1 : -1); }
        else for (const e of ents) if (hittable(e) && Math.abs(e.x - o.x) < 26 && Math.abs(e.y - o.y) < 12) hurtEnemy(e, o.dmg, true, e.x >= o.x ? 1 : -1);
      }
      function updMountE(m) {
        m.t++;
        if (--m.life <= 0 && !m.fleeing) { m.fleeing = true; m.face = m.x < camX + W / 2 ? -1 : 1; }
        if (m.fleeing) { m.x += m.face * 2; if (m.x < camX - 50 || m.x > camX + W + 50) m.dead = true; return; }
        if (m.t % 120 === 0) { m.tx = clamp(m.x + rnd(-40, 40), camX + 20, camX + W - 20); m.ty = rnd(FT, FB); }
        if (m.tx != null) { const dx = m.tx - m.x; if (Math.abs(dx) > 1) { m.x += Math.sign(dx) * 0.5; m.face = Math.sign(dx); } m.y += clamp(m.ty - m.y, -0.3, 0.3); }
      }

      // ---------- demo autopilot ----------
      function demoInput() {
        const prev = new Set(dk); dk.clear();
        const e = nearestEnemy();
        if (e) {
          const sg = e.x >= P.x ? 1 : -1, want = (P.c.reach * 0.7);
          const dx = e.x - P.x, dy = e.y - P.y;
          if (Math.abs(dy) > 3) dk.add(dy > 0 ? 'ArrowDown' : 'ArrowUp');
          if (Math.abs(dx) > want + 4) dk.add(sg > 0 ? 'ArrowRight' : 'ArrowLeft');
          else if (Math.abs(dx) < want - 8) dk.add(sg > 0 ? 'ArrowLeft' : 'ArrowRight');
          else if (P.face !== sg) dk.add(sg > 0 ? 'ArrowRight' : 'ArrowLeft');
          if (Math.abs(dy) < 6 && Math.abs(dx) < P.c.reach + 6 && fr % 9 === 0) dk.add('Space');
          if (fr % 400 === 200) { dk.add('Space'); dk.add('KeyX'); }
          else if (fr % 170 === 0) dk.add('KeyX');
        } else { dk.add('ArrowRight'); if (P.y < (FT + FB) / 2 - 4) dk.add('ArrowDown'); }
        dkp.clear(); for (const k of dk) if (!prev.has(k)) dkp.add(k);
      }
      function music() {
        if (demo || !st || !G.tunes) return;
        const tn = G.tunes[st.tune || 0]; if (!tn) return;
        if (--musicT > 0) return; musicT = tn.tempo;
        const i = musicI++, b = tn.bass[i % tn.bass.length];
        if (b != null) A.tone(55 * Math.pow(2, b / 12), tn.tempo / 60 * 0.9, { type: 'triangle', vol: 0.08 });
        const l = tn.lead && tn.lead[i % tn.lead.length];
        if (l != null) A.tone(220 * Math.pow(2, l / 12), tn.tempo / 60 * 0.85, { type: 'square', vol: 0.03 });
      }

      // ---------- main update ----------
      function updWorld() {
        if (introT > 0) introT--; if (goT > 0) goT--; if (shake > 0) shake--; if (flashT > 0) flashT--;
        if (demo) demoInput();
        updPlayer();
        if (freeze > 0) { freeze--; }
        else {
          assignTokens();
          for (const e of ents) {
            if (e.dead) continue;
            if (e.kind === 'enemy') updEnemy(e);
            else if (e.kind === 'proj') updProj(e);
            else if (e.kind === 'haz') updHazE(e);
            else if (e.kind === 'mount') updMountE(e);
            else if (e.kind === 'item') { e.t++; if (e.z > 0 || e.vz) { e.z += e.vz; e.vz -= GRAV; if (e.z <= 0) { e.z = 0; e.vz = 0; } } if (e.life && e.t > e.life) e.dead = true; }
            else if (e.kind === 'prop') { if (e.flash > 0) e.flash--; }
          }
          // keep enemies from stacking
          for (let i = 0; i < ents.length; i++) { const a = ents[i]; if (a.kind !== 'enemy' || a.st !== 'walk') continue; for (let j = i + 1; j < ents.length; j++) { const b = ents[j]; if (b.kind !== 'enemy' || b.st !== 'walk') continue; if (Math.abs(a.x - b.x) < 10 && Math.abs(a.y - b.y) < 5) { const s = a.y <= b.y ? -1 : 1; a.y += s * 0.6; b.y -= s * 0.6; } } }
          updHaz();
        }
        ents = ents.filter(e => !e.dead);
        if (mode === 'play' || mode === 'demo') updWaves();
        for (const f of fx) { f.t++; if (f.k === 'deb') { f.x += f.vx; f.z += f.vz; f.vz -= GRAV; if (f.z < 0) { f.z = 0; f.vz = -f.vz * 0.3; f.vx *= 0.5; } } }
        fx = fx.filter(f => f.t < f.dur);
        music();
      }
      function update() {
        fr++; mt++;
        if (api.credits > lastCred) S.coin(); lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        switch (mode) {
          case 'title': case 'roster':
            if (api.anyPressed('Enter', 'Space')) { tryStart(); return; }
            if (mode === 'title' && mt > 480) { mode = 'roster'; mt = 0; }
            else if (mode === 'roster' && mt > 360) { demo = true; P = newPlayer(Math.floor(Math.random() * G.chars.length)); score = 0; lives = 1; loop = 0; startStage(Math.floor(Math.random() * Math.min(3, G.stages.length))); mode = 'demo'; mt = 0; }
            break;
          case 'demo':
            if (api.anyPressed('Enter', 'Space')) { toTitle(); tryStart(); return; }
            updWorld(); if (mode === 'clear' || mt > 1800) toTitle(); if (mode === 'demo' && !demo) toTitle();
            break;
          case 'select':
            if (api.anyPressed('ArrowLeft')) { sel = (sel + G.chars.length - 1) % G.chars.length; A.tone(700, 0.04, { type: 'square', vol: 0.1 }); }
            if (api.anyPressed('ArrowRight')) { sel = (sel + 1) % G.chars.length; A.tone(700, 0.04, { type: 'square', vol: 0.1 }); }
            if (--selT <= 0 || (mt > 15 && api.anyPressed('Enter', 'Space', 'KeyX'))) startGame(sel);
            break;
          case 'play': updWorld(); break;
          case 'clear':
            if (mt === 1) { const b = Math.floor(P.hp) * (G.hpBonus != null ? G.hpBonus : 100); addScore(b); bonus = { pts: b }; }
            if (P.st !== 'special') P.st = 'stand';
            if (mt > 260) { if (G.bonusAfter && G.bonusAfter.includes(stIdx) && G.bonusGame) { mode = 'bonus'; mt = 0; bonus = { me: 0, cpu: 0, done: 0, win: false, t: 0, kind: G.bonusAfter.indexOf(stIdx) }; } else nextStage(); }
            break;
          case 'bonus': {
            const b = bonus; b.t++;
            if (!b.done) {
              if (b.t > 60 && b.t < 660) {
                if (api.anyPressed('Space', 'KeyX')) { b.me += 2.3; A.tone(300 + b.me * 6, 0.04, { type: 'square', vol: 0.08 }); }
                b.me = Math.max(0, b.me - 0.08); b.cpu += 0.17 + loop * 0.03 + Math.random() * 0.05;
                if (b.me >= 100 || b.cpu >= 100 || b.t >= 659) { b.done = b.t; b.win = b.me >= b.cpu; S.boom(); if (b.win) { addScore(G.bonusPts || 10000); S.oneup(); } }
              }
            } else if (b.t - b.done > 180) nextStage();
            break;
          }
          case 'ending': if (mt > 720 || (mt > 120 && api.anyPressed('Enter', 'Space'))) { loop++; startStage(0); } break;
          case 'over': if (mt > 300 || (mt > 90 && api.anyPressed('Enter'))) toTitle(); break;
        }
      }

      // ---------- rendering ----------
      function poseOf(o) {
        const T = o.t;
        if (o.kind === 'player') {
          const c = o.c;
          switch (o.st) {
            case 'walk': return ['walk', fr, 0];
            case 'run': return ['run', fr, 0];
            case 'atk': { const fin = o.combo >= c.combo - 1; const ps = c.poses || ['punch', 'punch2', 'punch', 'kick']; const pn = fin ? ps[ps.length - 1] : ps[o.combo % (ps.length - 1)]; return [pn, fr, clamp(T / (c.atkT + (fin ? 5 : 0)), 0, 1)]; }
            case 'jump': return o.jatk ? [c.jpose || 'jkick', fr, 0.5] : ['jump', fr, 0];
            case 'datk': return [c.dpose || 'dash', fr, 0.5];
            case 'pick': case 'getup': return ['crouch', fr, 0];
            case 'throwH': return ['throw', fr, 0];
            case 'shoot': return ['shoot', fr, 0];
            case 'hurt': return ['hurt', fr, 0];
            case 'knock': return ['knock', fr, 0];
            case 'down': case 'dead': case 'gone': return ['down', fr, 0];
            case 'respawn': return ['jump', fr, 0];
            case 'special': { const s = c.sp; const m = { spin: 'spin', drill: c.drillPose || 'dash', leap: 'jkick', flurry: (T >> 2) % 2 ? 'punch' : 'punch2', beam: s.pose || 'shoot', nova: 'cast', teleport: (T >> 2) % 2 ? 'slash' : 'slash2', magic: 'cast' }; return [m[s.kind] || 'cast', fr, s.kind === 'flurry' ? 0.5 : (T % 8) / 8]; }
          }
          if (o.hold) return ['carry', fr, 0];
          return ['stand', fr, 0];
        }
        const d = o.d;
        switch (o.st) {
          case 'walk': case 'enter': case 'thief': case 'flee': return [o.moving === false && o.st === 'walk' ? 'stand' : 'walk', o.t + o.slot * 7, 0];
          case 'wind': return ['wind', T, 0];
          case 'atk': return [d.atk.pose || 'punch', T, clamp(T / 10, 0, 1) * 0.6 + 0.2];
          case 'rec': return ['stand', T, 0];
          case 'shoot': return [d.shootPose || 'throw', T, 0];
          case 'beam': return ['shoot', T, 0];
          case 'charge': return [d.chPose || 'dash', T, 0];
          case 'leap': return ['jkick', T, 0];
          case 'summon': return ['cast', T, 0];
          case 'hurt': return ['hurt', T, 0];
          case 'knock': return ['knock', T, 0];
          case 'down': case 'dead': return ['down', T, 0];
          case 'getup': return ['crouch', T, 0];
        }
        return ['stand', T, 0];
      }
      function drawEnt(ctx, e) {
        const sx = e.x - camX, sy = e.y - e.z;
        if (sx < -80 || sx > W + 80) return;
        switch (e.kind) {
          case 'player': case 'enemy': {
            if (e.kind === 'player' && (e.st === 'gone' || (e.inv > 0 && e.st !== 'special' && (fr >> 1) % 2 && e.st !== 'down'))) return;
            if (e.kind === 'player' && e.st === 'special' && e.c.sp.kind === 'teleport' && e.t < 10) return;
            if (e.st === 'dead' && (e.t >> 2) % 2) return;
            const [pn, t, k] = poseOf(e);
            const fl = e.flash > 0 && (e.flash >> 1) % 2 ? '#fff' : null;
            if (e.mount) {
              const m = e.mount, an = e.st === 'matk' || e.st === 'atk' || e.st === 'wind' ? 'atk' : (e.st === 'walk' && (e.kind === 'enemy' ? e.moving : true)) ? 'walk' : 'stand';
              m.draw(ctx, Math.round(sx), Math.round(sy), e.face, fr, an, e.kind === 'player' ? clamp(e.t / (m.atk.t || 24), 0, 1) : 0.5);
              drawFig(ctx, sx - e.face * (m.seatX || 0), sy - m.h, e.face, e.look, e.kind === 'player' && e.st === 'matk' ? 'slash' : 'ride', t, k, fl);
            } else drawFig(ctx, sx, sy, e.face, e.look, pn, t, k, fl);
            if (e.kind === 'player') {
              if (e.hold) { const d = G.items[e.hold]; d.draw(ctx, Math.round(sx), Math.round(sy - (e.look.h || 46) - 6), fr); }
              if (e.weap && e.weap.d.held) e.weap.d.held(ctx, Math.round(sx), Math.round(sy), e.face, e.st === 'shoot');
            }
            if (e.kind === 'enemy' && e.st === 'beam') { const bc = e.d.beamCol || '#f4f', y0 = Math.round(sy - 26), x0 = Math.round(sx + e.face * 12), len = e.face > 0 ? W - x0 : x0; if (e.t < 40) { if ((e.t >> 2) % 2) rect(ctx, e.face > 0 ? x0 : 0, y0, len, 1, bc); } else if (e.t < 70) { rect(ctx, e.face > 0 ? x0 : 0, y0 - 4, len, 8, bc); rect(ctx, e.face > 0 ? x0 : 0, y0 - 1, len, 2, '#fff'); } }
            if (e.kind === 'enemy' && e.d.boss && e.armor > 0 && (fr >> 2) % 2) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(Math.round(sx - e.w / 2 - 2), Math.round(sy - e.hh - 2), e.w + 4, e.hh + 4); }
            break;
          }
          case 'item': if (!(e.life && e.t > e.life - 120 && (fr >> 2) % 2)) e.d.draw(ctx, Math.round(sx), Math.round(sy), fr); break;
          case 'prop': e.d.draw(ctx, Math.round(sx), Math.round(sy), e.hp, e.flash > 0); break;
          case 'mount': e.m.draw(ctx, Math.round(sx), Math.round(sy), e.face, fr, e.fleeing || (e.tx != null && Math.abs(e.tx - e.x) > 1) ? 'walk' : 'stand', 0); break;
          case 'proj': drawProj(ctx, e, sx, sy); break;
          case 'haz': drawHaz(ctx, e, sx, e.y); break;
        }
      }
      function drawProj(ctx, o, sx, sy) {
        sx = Math.round(sx); sy = Math.round(sy); const f = o.vx >= 0 ? 1 : -1;
        if (G.drawProj && G.drawProj(ctx, o, sx, sy, fr)) return;
        switch (o.pk) {
          case 'item': o.item.draw(ctx, sx, sy + 6, fr); break;
          case 'star': { const r = (fr >> 1) % 2; rect(ctx, sx - 3, sy - 1, 7, 2, o.col || '#ddd'); rect(ctx, sx - 1, sy - 3, 2, 7, o.col || '#ddd'); if (r) { rect(ctx, sx - 2, sy - 2, 1, 1, '#fff'); rect(ctx, sx + 2, sy + 2, 1, 1, '#fff'); } break; }
          case 'knife': rect(ctx, sx - 5, sy - 1, 10, 2, '#eee'); rect(ctx, sx - f * 6, sy - 1, 3, 2, '#840'); break;
          case 'bullet': rect(ctx, sx - 3, sy - 1, 6, 2, o.col || '#ff4'); break;
          case 'laser': rect(ctx, sx - 8, sy - 1, 16, 2, o.col || '#f44'); rect(ctx, sx - 6, sy, 12, 1, '#fff'); break;
          case 'rocket': rect(ctx, sx - 5, sy - 2, 10, 4, '#aab'); rect(ctx, sx + f * 5 - 1, sy - 1, 3, 2, '#f44'); rect(ctx, sx - f * 8 - 2, sy - 1, 4, 2, (fr % 4 < 2) ? '#fd0' : '#f80'); break;
          case 'bomb': rect(ctx, sx - 3, sy - 3, 6, 6, '#222'); rect(ctx, sx - 1, sy - 5, 2, 2, (fr % 4 < 2) ? '#f80' : '#ff0'); break;
          case 'rock': rect(ctx, sx - 4, sy - 4, 8, 8, '#887'); rect(ctx, sx - 2, sy - 3, 3, 2, '#aa9'); break;
          case 'fire': case 'fireball': { const s = o.pk === 'fire' ? 6 + (o.t % 6) : 6; rect(ctx, sx - s / 2, sy - s / 2, s, s, '#f40'); rect(ctx, sx - s / 4, sy - s / 4, s / 2, s / 2, '#ff0'); break; }
          case 'beam': { const w = o.w; rect(ctx, sx - w / 2, sy - 3, w, 6, o.col || '#f44'); rect(ctx, sx - w / 2, sy - 1, w, 2, o.col2 || '#fff'); break; }
          case 'flame': { const s = 5 + (o.t % 5); rect(ctx, sx - s / 2, sy - s / 2, s, s, '#f60'); rect(ctx, sx - 1, sy - 1, 3, 3, '#ff8'); break; }
          default: rect(ctx, sx - 3, sy - 3, 6, 6, o.col || '#fff');
        }
      }
      function drawHaz(ctx, h, sx, y) {
        sx = Math.round(sx); const c = st.haz.col || '#f60';
        switch (h.hk) {
          case 'debris': { const k = Math.min(1, h.t / 55); shadow(ctx, sx, y, 6 + 12 * k); if (h.t < 55) { const yy = y - (1 - k) * H; rect(ctx, sx - 7, yy - 10, 14, 10, st.haz.col || '#776'); rect(ctx, sx - 5, yy - 9, 6, 3, '#998'); } else rect(ctx, sx - 9, y - 4, 18, 4, '#776'); break; }
          case 'fire': { if (h.t < 40) { if ((h.t >> 2) % 2) rect(ctx, sx - 6, y - 2, 12, 3, '#f80'); } else { const fh = 18 + Math.sin(h.t * 0.6) * 5; rect(ctx, sx - 7, y - fh, 14, fh, c); rect(ctx, sx - 4, y - fh * 0.7, 8, fh * 0.7, '#fd0'); rect(ctx, sx - 2, y - fh * 0.4, 4, fh * 0.4, '#fff8c0'); } break; }
          case 'laser': { if (h.t < 50) { if ((h.t >> 2) % 2) rect(ctx, 0, y - 1, W, 1, c); } else { rect(ctx, 0, y - 18, W, 4, c); rect(ctx, 0, y - 17, W, 2, '#fff'); } rect(ctx, 0, y - 22, 6, 10, '#666'); rect(ctx, W - 6, y - 22, 6, 10, '#666'); break; }
          case 'car': { if (h.t < 50) { if ((h.t >> 2) % 2) text(ctx, h.dir > 0 ? '>>' : '<<', h.dir > 0 ? 4 : W - 16, y - 12, '#ff0'); } else { const f = h.dir; rect(ctx, sx - 22, y - 16, 44, 11, c); rect(ctx, sx - 12 + f * 2, y - 24, 22, 9, c); rect(ctx, sx - 9 + f * 3, y - 22, 16, 5, '#9cf'); rect(ctx, sx - 18, y - 6, 8, 6, '#111'); rect(ctx, sx + 10, y - 6, 8, 6, '#111'); rect(ctx, sx + f * 20 - 1, y - 14, 3, 3, '#ff8'); } break; }
        }
      }
      function drawFx(ctx, f) {
        const sx = Math.round(f.x - camX), sy = Math.round(f.y - f.z);
        switch (f.k) {
          case 'spark': { const r = 3 + f.t; ctx.fillStyle = f.t < 4 ? '#fff' : f.col; ctx.fillRect(sx - r, sy, r * 2 + 1, 1); ctx.fillRect(sx, sy - r, 1, r * 2 + 1); const q = r * 0.7 | 0; for (let i = -q; i <= q; i += 2) { ctx.fillRect(sx + i, sy + i, 1, 1); ctx.fillRect(sx + i, sy - i, 1, 1); } break; }
          case 'pop': text(ctx, f.s, sx, sy - f.t * 0.5, f.col, 1, 'center'); break;
          case 'dust': { const r = 2 + f.t / 4; ctx.fillStyle = 'rgba(200,190,170,0.5)'; ctx.fillRect(sx - r, sy - r - 2, r * 2, r * 2); break; }
          case 'deb': rect(ctx, sx - 2, sy - 2, 4, 3, f.col); break;
          case 'ring': { const r = f.r * (0.3 + 0.7 * f.t / f.dur); ctx.strokeStyle = f.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(sx, sy - 10, r, r * 0.35, 0, 0, Math.PI * 2); ctx.stroke(); break; }
          case 'boom': { const r = 4 + f.t * 1.2; rect(ctx, sx - r, sy - r - 6, r * 2, r * 2, f.t < 8 ? '#fff' : '#f80'); rect(ctx, sx - r / 2, sy - r / 2 - 6, r, r, '#ff0'); break; }
          case 'bamf': { for (let i = 0; i < 6; i++) { const a = i * 1.05 + f.t * 0.1, r = 4 + f.t * 0.8; rect(ctx, sx + Math.cos(a) * r - 4, sy + Math.sin(a) * r * 0.6 - 4, 8, 8, f.col || '#538'); } break; }
        }
      }
      function drawMagic(ctx) {
        const s = P.c.sp, T = P.t, lv = Math.max(1, P.lvl);
        ctx.fillStyle = 'rgba(0,0,30,' + Math.min(0.55, T / 40) + ')'; ctx.fillRect(0, 0, W, H);
        if (T < 20) return;
        const n = 2 + lv * 2;
        for (let i = 0; i < n; i++) {
          const x = Math.round(((i + 0.5) / n) * W + Math.sin(i * 7) * 10), y = FT + hash(i, 5) * (FB - FT), ph = (T - 20 - i * 4);
          if (ph < 0) continue;
          if (s.style === 'lightning') { if ((T + i) % 6 < 3) { ctx.fillStyle = (T % 4 < 2) ? '#fff' : s.col; let px = x; for (let yy = 0; yy < y; yy += 8) { const nx = px + ((hash(i * 13 + yy, T >> 2) * 10) | 0) - 5; ctx.fillRect(Math.min(px, nx), yy, Math.abs(nx - px) + 2, 8); px = nx; } } }
          else if (s.style === 'fire') { const fh = Math.min(70, ph * 3) * (0.8 + Math.sin(T * 0.5 + i) * 0.2); rect(ctx, x - 9, y - fh, 18, fh, '#d20'); rect(ctx, x - 6, y - fh * 0.8, 12, fh * 0.8, '#f80'); rect(ctx, x - 3, y - fh * 0.5, 6, fh * 0.5, '#ff6'); }
          else { const rh = Math.min(30, ph * 2); rect(ctx, x - 8, y - rh, 16, rh, '#865'); rect(ctx, x - 5, y - rh, 6, rh, '#a98'); rect(ctx, x - 3, y - rh - 4, 6, 4, '#865'); if (ph > 10) { rect(ctx, x - 12 + (ph % 9), y - rh - ph % 30, 4, 4, '#776'); } }
        }
      }
      function drawWorld(ctx) {
        ctx.save();
        if (shake) ctx.translate(Math.round(rnd(-2, 2)), Math.round(rnd(-2, 2)));
        st.bg(ctx, camX, fr, W, H);
        const list = ents.slice(); list.push(P);
        for (const e of list) if (e.kind !== 'haz' && e.kind !== 'proj' && !(e.kind === 'player' && e.st === 'gone')) { const sx = e.x - camX; if (sx > -60 && sx < W + 60) shadow(ctx, sx, e.y, e.kind === 'item' ? 12 : e.mount ? 30 : (e.w || 14) + 6); }
        for (const e of list) if (e.kind === 'haz') drawEnt(ctx, e);
        list.sort((a, b) => a.y - b.y || (a.kind === 'proj' ? 1 : 0) - (b.kind === 'proj' ? 1 : 0));
        for (const e of list) if (e.kind !== 'haz') drawEnt(ctx, e);
        for (const f of fx) drawFx(ctx, f);
        if (st.fg) st.fg(ctx, camX, fr, W, H);
        ctx.restore();
        if (P.st === 'special' && P.c.sp.kind === 'magic') drawMagic(ctx);
        if (flashT > 0) { ctx.globalAlpha = 0.35 * flashT / 10; rect(ctx, 0, 0, W, H, flashCol); ctx.globalAlpha = 1; }
        drawHud(ctx);
        if (goT > 0 && (goT >> 3) % 2) { textO(ctx, 'GO', W - 44, H / 2 - 20, '#ff0', 2, 'left'); textO(ctx, '>', W - 18, H / 2 - 20, '#ff0', 2, 'left'); }
        if (introT > 0 && mode !== 'demo') {
          const y = H / 2 - 30; rect(ctx, 0, y - 6, W, 44, 'rgba(0,0,0,0.6)');
          textO(ctx, (G.stageWord || 'STAGE') + ' ' + (stIdx + 1), W / 2, y, G.hudCol || '#ff0', 2, 'center');
          textO(ctx, st.name, W / 2, y + 22, '#fff', 1, 'center');
        }
        if (mode === 'demo') { textO(ctx, 'DEMO PLAY', W / 2, H / 2 - 40, '#fff', 1, 'center'); if ((fr >> 5) % 2) textO(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, H - 24, '#ff0', 1, 'center'); }
      }
      function hpBar(ctx, x, y, w, h, v, max, col, seg) {
        rect(ctx, x - 1, y - 1, w + 2, h + 2, '#000'); rect(ctx, x, y, w, h, '#400');
        rect(ctx, x, y, clamp(Math.round(w * v / max), 0, w), h, col);
        if (seg) for (let i = 1; i < max / seg; i++) rect(ctx, x + Math.round(w * i * seg / max), y, 1, h, '#000');
      }
      function drawHud(ctx) {
        if (!P) return;
        if (G.hud) { G.hud(ctx, { P, score, lives, hi, fr, credits: api.credits, hpBar, bossE, W, H, php: G.php, demo }); }
        else {
          const n = G.hudSlots || 1, sw = Math.floor(W / Math.max(n, 2));
          rect(ctx, 0, 0, W, 22, 'rgba(0,0,0,0.55)');
          for (let i = 0; i < n; i++) {
            const x = i * sw + 2;
            if (i === 0) {
              textO(ctx, P.c.name, x + 2, 2, P.c.col || '#ff0', 1);
              text(ctx, String(score).padStart(G.scoreDigits || 6, ' '), x + sw - 6, 2, '#fff', 1, 'right');
              text(ctx, '=' + Math.max(0, lives - 1), x + 2, 12, '#fff', 1);
              hpBar(ctx, x + 22, 13, sw - 32, 5, P.hp, G.php, P.hp < G.php * 0.3 && (fr >> 3) % 2 ? '#f44' : (G.barCol || '#4f4'), G.barSeg);
            } else if ((fr >> 5) % 2) text(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', x + sw / 2 - 2, 7, G.chars[i % G.chars.length].col || '#888', 1, 'center');
          }
          if (n < 2) text(ctx, 'HI ' + hi, W - 4, 2, '#aaa', 1, 'right');
          if (P.weap) text(ctx, P.weap.d.label + ' ' + P.weap.ammo, 4, 24, '#ff8', 1);
          if (G.hudExtra) G.hudExtra(ctx, P, fr);
        }
        bossE = null; for (const e of ents) if (e.kind === 'enemy' && e.d.boss && e.hp > 0 && e.st !== 'enter') { bossE = e; break; }
        if (bossE) {
          const y = H - 14; rect(ctx, 0, y - 2, W, 14, 'rgba(0,0,0,0.6)');
          textO(ctx, bossE.d.name, 6, y, '#f84', 1);
          hpBar(ctx, 8 + bossE.d.name.length * 6 + 6, y + 1, W - (bossE.d.name.length * 6 + 26), 5, bossE.hp, bossE.maxhp, '#f80');
        }
      }
      function drawPrompt(ctx, y) {
        if (coinFlash > 0) { if ((coinFlash >> 2) % 2) textO(ctx, 'INSERT COIN', W / 2, y, '#fff', 1, 'center'); }
        else if ((fr >> 5) % 2 === 0) textO(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, y, '#ff0', 1, 'center');
        text(ctx, credStr(), W - 6, H - 10, '#aaa', 1, 'right');
      }
      function render(ctx) {
        ctx.imageSmoothingEnabled = false;
        rect(ctx, 0, 0, W, H, '#000');
        switch (mode) {
          case 'title': {
            G.titleBg(ctx, fr, W, H, mode);
            const lg = getLogo(); ctx.drawImage(lg, 0, G.logoY || 16);
            text(ctx, 'HI SCORE ' + hi, W / 2, 4, '#fff', 1, 'center');
            drawPrompt(ctx, H - 52);
            text(ctx, G.copy, W / 2, H - 24, '#ccc', 1, 'center');
            break;
          }
          case 'roster': {
            G.titleBg(ctx, fr, W, H, mode); rect(ctx, 0, 0, W, H, 'rgba(0,0,0,0.5)');
            textO(ctx, G.rosterTitle || 'CHOOSE YOUR HERO', W / 2, 10, G.hudCol || '#ff0', 1, 'center');
            const n = G.chars.length, cw = W / n;
            G.chars.forEach((c, i) => { const x = cw * i + cw / 2; drawFig(ctx, x, 120, 1, c.look, (mt + i * 20) % 120 < 30 ? (c.poses ? c.poses[c.poses.length - 1] : 'kick') : 'stand', mt, ((mt + i * 20) % 30) / 30); text(ctx, c.name, x, 128 + (c.name.length * 6 > cw - 2 ? (i % 2) * 9 : 0), c.col || '#fff', 1, 'center'); });
            (G.story || []).forEach((s, i) => text(ctx, s, W / 2, 148 + i * 10, '#fff', 1, 'center'));
            text(ctx, 'HI SCORE ' + hi, W / 2, 26, '#fff', 1, 'center');
            drawPrompt(ctx, H - 22);
            break;
          }
          case 'select': {
            G.titleBg(ctx, fr, W, H, mode); rect(ctx, 0, 0, W, H, 'rgba(0,0,0,0.55)');
            textO(ctx, G.selectTitle || 'SELECT PLAYER', W / 2, 10, G.hudCol || '#ff0', 2, 'center');
            const n = G.chars.length, cw = W / n, sc = n <= 4 ? 2 : 1;
            G.chars.forEach((c, i) => {
              const x = cw * i + cw / 2, on = i === sel;
              if (on) { rect(ctx, x - cw / 2 + 3, 36, cw - 6, 128, 'rgba(255,255,255,0.12)'); if ((fr >> 3) % 2) { ctx.strokeStyle = c.col || '#ff0'; ctx.lineWidth = 2; ctx.strokeRect(x - cw / 2 + 3, 36, cw - 6, 128); } }
              ctx.save(); ctx.translate(Math.round(x), 150); ctx.scale(sc, sc);
              drawFig(ctx, 0, 0, 1, c.look, on ? ((fr % 90) < 30 ? (c.poses ? c.poses[c.poses.length - 1] : 'kick') : 'stand') : 'stand', fr, ((fr % 30) / 30));
              ctx.restore();
              text(ctx, c.name, x, n > 4 ? 156 + (i % 2) * 10 : 168, on ? (c.col || '#ff0') : '#888', 1, 'center');
            });
            const c = G.chars[sel];
            const bar = (lbl, v, y) => { text(ctx, lbl, W / 2 - 70, y, '#ccc', 1); rect(ctx, W / 2 - 10, y, 80, 6, '#333'); rect(ctx, W / 2 - 10, y, Math.round(80 * v), 6, c.col || '#ff0'); };
            bar('POWER', c.stat[0], 182); bar('SPEED', c.stat[1], 192); bar('REACH', c.stat[2], 202);
            text(ctx, c.desc || '', W / 2, 213, '#fff', 1, 'center');
            text(ctx, String(Math.ceil(selT / 60)), W - 10, 10, '#fff', 1, 'right');
            break;
          }
          case 'play': case 'demo': case 'clear': case 'over': {
            drawWorld(ctx);
            if (mode === 'clear') {
              rect(ctx, 0, H / 2 - 36, W, 60, 'rgba(0,0,0,0.6)');
              textO(ctx, G.clearWord || 'STAGE CLEAR', W / 2, H / 2 - 28, G.hudCol || '#ff0', 2, 'center');
              if (mt > 60 && bonus && bonus.pts > 0) textO(ctx, 'VITALITY BONUS ' + bonus.pts, W / 2, H / 2 - 4, '#fff', 1, 'center');
              if (mt > 100) textO(ctx, 'SCORE ' + score, W / 2, H / 2 + 8, '#fff', 1, 'center');
            }
            if (mode === 'over') {
              rect(ctx, 0, H / 2 - 30, W, 56, 'rgba(0,0,0,0.7)');
              textO(ctx, 'GAME OVER', W / 2, H / 2 - 24, '#f44', 2, 'center');
              textO(ctx, (G.overLine ? G.overLine(score) : 'SCORE ' + score), W / 2, H / 2 + 4, '#fff', 1, 'center');
            }
            break;
          }
          case 'bonus': {
            const b = bonus;
            if (G.bonusGame) G.bonusGame(ctx, b, fr, W, H, P);
            textO(ctx, 'BONUS STAGE', W / 2, 8, '#ff0', 2, 'center');
            if (b.t < 60) textO(ctx, 'MASH THE BUTTONS!', W / 2, 30, '#fff', 1, 'center');
            else if (!b.done) text(ctx, 'TIME ' + Math.max(0, Math.ceil((660 - b.t) / 60)), W / 2, 30, '#fff', 1, 'center');
            else textO(ctx, b.win ? 'YOU WIN! ' + (G.bonusPts || 10000) + ' PTS' : 'TOO BAD!', W / 2, 30, b.win ? '#4f4' : '#f44', 1, 'center');
            break;
          }
          case 'ending': {
            G.titleBg(ctx, fr, W, H, mode); rect(ctx, 0, 0, W, H, 'rgba(0,0,0,0.6)');
            const lines = G.ending || ['CONGRATULATIONS!'];
            lines.forEach((s, i) => { if (mt > i * 40) textO(ctx, s, W / 2, 30 + i * 14, i === 0 ? '#ff0' : '#fff', 1, 'center'); });
            drawFig(ctx, W / 2, H - 30, 1, P.look, 'win', fr, 0);
            text(ctx, 'SCORE ' + score, W / 2, H - 18, '#fff', 1, 'center');
            break;
          }
        }
      }
      return { update, render, destroy() { } };
    }
  });
})();
