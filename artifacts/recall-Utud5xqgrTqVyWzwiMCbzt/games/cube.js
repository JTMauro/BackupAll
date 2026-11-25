/* Recall: Cube Puzzles (cat 'cube'): Cube Blaster, Slide Out, Hidden Model, Robot Walk.
   All drawing is plain canvas with a tiny voxel renderer (orthographic, painter-sorted unit cubes). */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor } = R;
  const TAU = Math.PI * 2, Z3 = [0, 0, 0];
  const HEX = {
    coral: '#FF6B4A', sun: '#FFC234', leaf: '#3CC46B', sky: '#45AEFF', berry: '#F25A95', orange: '#FF9A3C',
    grape: '#A98BFF', peach: '#FFB892', card: '#FFF6E6', stone: '#E9DDC7', stoneD: '#CDBE9F', mint: '#BDEFCB',
    dirt: '#C98F5A', grass: '#62D486', wood: '#E7A962', woodT: '#F6CB8E', lilac: '#D9CCFF'
  };
  const SYM = { coral: '●', sky: '★', sun: '▲', leaf: '■', berry: '♥' };
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const K = (x, y, z) => x + ',' + y + ',' + z;
  const unK = k => k.split(',').map(Number);
  const ease = t => t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const now = () => performance.now();
  const boxPts = (x0, y0, z0, x1, y1, z1) => [...Array(8)].map((_, i) => [i & 1 ? x1 : x0, i & 2 ? y1 : y0, i & 4 ? z1 : z0]);
  const rgbC = {};
  const rgbOf = h => rgbC[h] || (rgbC[h] = [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)));
  const shadeOf = (h, f, w, a) => 'rgba(' + rgbOf(h).map(v => Math.round(Math.min(255, v * f) * (1 - (w || 0)) + 255 * (w || 0))).join(',') + ',' + (a == null ? 1 : a) + ')';

  R.css(`
.cx-cv{display:block;margin:0 auto;touch-action:manipulation;-webkit-tap-highlight-color:transparent;cursor:pointer;max-width:100%}
.cx-bar{display:flex;flex-wrap:wrap;justify-content:center;gap:14px;margin:16px auto 0}
.cx-bar .btn{min-width:140px}
.cx-note{text-align:center;font:600 1.25rem var(--display);color:var(--on-table-soft);margin:12px 0 0}
.cb-lab{text-align:center;font:600 1.15rem var(--display);color:var(--on-table-soft);margin:8px 0 14px}
.cb-ready{display:flex;justify-content:center;gap:22px;flex-wrap:wrap;min-height:100px;padding-top:14px}
.cb-bl{position:relative;width:92px;height:92px;padding:0;cursor:pointer;font:700 2.7rem/1 var(--display);transition:transform .15s,opacity .25s,filter .25s;animation:bounceIn .35s}
.cb-bl .cb-gun{position:absolute;left:50%;top:-15px;width:26px;height:20px;margin-left:-13px;border-radius:7px 7px 2px 2px;background:var(--d);z-index:-1}
.cb-bl .cb-n{position:absolute;right:-12px;top:-12px;min-width:42px;height:42px;padding:0 6px;border-radius:21px;background:#fff;color:var(--ink);font:700 1.4rem/42px var(--display);box-shadow:0 3px 0 rgba(0,0,0,.25)}
.cb-bl.cb-dim{opacity:.45;filter:saturate(.45)}
.cb-bl.cb-go{transform:translateY(-10px) scale(1.08)}
.cb-next{display:flex;justify-content:center;align-items:center;gap:12px;flex-wrap:wrap;margin-top:18px;font:600 1.15rem var(--display);color:var(--on-table-soft)}
.cb-mini{position:relative;width:46px;height:46px;font:700 1.4rem/1 var(--display);border-radius:12px}
.cb-mini b{position:absolute;right:-9px;top:-10px;min-width:28px;height:28px;border-radius:14px;background:#fff;color:var(--ink);font:700 1.05rem/28px var(--display);text-align:center;box-shadow:0 2px 0 rgba(0,0,0,.2)}
.cb-rain{background:linear-gradient(90deg,#FF6B4A,#FFC234,#3CC46B,#45AEFF,#A98BFF)!important;--d:#7A5BC9;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.35);font-size:1.3rem;animation:bounceIn .4s}
.hm-tabs{display:flex;justify-content:center;flex-wrap:wrap;gap:12px;margin:14px auto 18px}
.hm-tab{min-width:64px;font-size:1.15rem;padding:.55em .9em}
.hm-tab.on{--c:var(--sun);--d:var(--sun-d)}
.hm-tab.ok::after{content:" ✓";color:var(--leaf-d)}
.hm-grid{display:grid;grid-template-columns:46px repeat(var(--w),var(--cs));grid-template-rows:46px repeat(var(--d),var(--cs));gap:9px;justify-content:center;align-items:center;justify-items:center}
.hm-clue{display:grid;place-items:center;height:46px;min-width:42px;padding:0 4px;border-radius:14px;background:rgba(0,0,0,.22);font:700 1.45rem var(--display);color:#fff}
.hm-clue{border:0;cursor:pointer;box-shadow:0 4px 0 rgba(0,0,0,.25)}
.hm-clue:active{transform:translateY(3px);box-shadow:none}
.hm-clue.ok{background:var(--leaf);color:var(--ink)}
.hm-clue.over{background:var(--orange);color:var(--ink)}
.hm-cell{width:var(--cs);height:var(--cs);padding:0;cursor:pointer;font:700 1.9rem var(--display);border-radius:16px;transition:transform .1s}
.hm-cell.gone{background:rgba(0,0,0,.14);box-shadow:inset 0 0 0 3px rgba(255,255,255,.22);cursor:default}
.hm-cell.keep{--c:var(--good-bg);--d:var(--leaf-d);color:var(--leaf-d)}
.hm-cell.hi{outline:5px solid #fff;outline-offset:3px;animation:hmPulse .9s ease-in-out infinite}
@keyframes hmPulse{50%{transform:scale(1.08)}}
`);

  /* ---------------- tiny voxel renderer ---------------- */
  const FACES = [
    { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
    { n: [1, 0, 0], c: [[1, 0, 1], [1, 1, 1], [1, 1, 0], [1, 0, 0]] },
    { n: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
    { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
    { n: [0, -1, 0], c: [[0, 0, 1], [1, 0, 1], [1, 0, 0], [0, 0, 0]] }
  ];
  function inPoly(px, py, p) {
    let ins = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const xi = p[i][0], yi = p[i][1], xj = p[j][0], yj = p[j][1];
      if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) ins = !ins;
    }
    return ins;
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function poly(ctx, p) { ctx.beginPath(); p.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); }
  // draws an arrow in 0..100 face space, pointing along (ax, ay)
  function arrowIn(ctx, ax, ay) {
    ctx.save(); ctx.translate(50, 50); ctx.rotate(Math.atan2(ay, ax));
    ctx.beginPath(); ctx.moveTo(-32, -11); ctx.lineTo(2, -11); ctx.lineTo(2, -27); ctx.lineTo(36, 0); ctx.lineTo(2, 27); ctx.lineTo(2, 11); ctx.lineTo(-32, 11); ctx.closePath();
    ctx.fillStyle = 'rgba(24,36,44,.82)'; ctx.fill(); ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.stroke();
    ctx.restore();
  }

  function makeView(o) {
    o = o || {};
    const cv = el('canvas', 'cx-cv'), ctx = cv.getContext('2d');
    const V = { cv, ctx, yaw: o.yaw == null ? Math.PI / 4 : o.yaw, pitch: o.pitch || .62, s: 30, ox: 0, oy: 0, c: [0, 0, 0], W: 300, H: 300, dpr: 1, hits: [], cens: [] };
    const LT = (() => { const v = [-.5, .42, .76], l = Math.hypot(...v); return v.map(a => a / l); })();
    V.resize = (w, h) => {
      V.W = w; V.H = h; V.dpr = Math.min(3, window.devicePixelRatio || 1);
      cv.width = Math.round(w * V.dpr); cv.height = Math.round(h * V.dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px';
    };
    V.P = (x, y, z) => {
      const dx = x - V.c[0], dy = y - V.c[1], dz = z - V.c[2], co = Math.cos(V.yaw), si = Math.sin(V.yaw);
      const X = dx * co - dy * si, Y = dx * si + dy * co, sp = Math.sin(V.pitch), cp = Math.cos(V.pitch);
      return [V.ox + X * V.s, V.oy + (Y * sp - dz * cp) * V.s, Y * cp + dz * sp];
    };
    V.fit = (pts, f) => {
      f = f || {};
      const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
      pts.forEach(p => { for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); } });
      V.c = lo.map((v, i) => (v + hi[i]) / 2);
      const keep = V.yaw; V.s = 1; V.ox = 0; V.oy = 0;
      let mx = 0, a = 1e9, b = -1e9;
      (f.yaws || [V.yaw]).forEach(yw => { V.yaw = yw; pts.forEach(p => { const q = V.P(p[0], p[1], p[2]); mx = Math.max(mx, Math.abs(q[0])); a = Math.min(a, q[1]); b = Math.max(b, q[1]); }); });
      V.yaw = keep;
      const pad = f.pad == null ? 14 : f.pad;
      V.s = Math.min((V.W - 2 * pad) / (2 * mx || 1), (V.H - 2 * pad) / ((b - a) || 1), f.max || 1e9);
      V.ox = V.W / 2; V.oy = V.H / 2 - (a + b) / 2 * V.s;
    };
    const isLoose = it => it.loose || it.off || (it.sc != null && it.sc !== 1) || (it.a != null && it.a < 1);
    V.draw = (items, under, over) => {
      ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0); ctx.clearRect(0, 0, V.W, V.H);
      V.hits = []; V.cens = [];
      const co = Math.cos(V.yaw), si = Math.sin(V.yaw), sp = Math.sin(V.pitch), cp = Math.cos(V.pitch);
      if (under) under(ctx, V);
      const occ = new Set();
      for (const it of items) if (!it.sprite && !isLoose(it)) occ.add(K(it.x, it.y, it.z));
      const dep = it => { const of = it.off || Z3, dx = it.x + .5 + of[0] - V.c[0], dy = it.y + .5 + of[1] - V.c[1], dz = it.z + .5 + of[2] - V.c[2]; return (dx * si + dy * co) * cp + dz * sp + (it.dd || 0); };
      const list = items.map(it => [dep(it), it]).sort((a, b) => a[0] - b[0]);
      for (const [, it] of list) {
        if (it.sprite) { it.sprite(ctx, V, it); continue; }
        const of = it.off || Z3, sc = it.sc == null ? 1 : it.sc, loose = isLoose(it);
        const bx = it.x + .5 + of[0], by = it.y + .5 + of[1], bz = it.z + .5 + of[2];
        ctx.globalAlpha = it.a == null ? 1 : Math.max(0, it.a);
        let drew = false;
        for (let f = 0; f < 5; f++) {
          const F = FACES[f], n = F.n;
          if (!loose && occ.has(K(it.x + n[0], it.y + n[1], it.z + n[2]))) continue;
          const NX = n[0] * co - n[1] * si, NY = n[0] * si + n[1] * co;
          if (NY * cp + n[2] * sp < .02) continue;
          const p = F.c.map(c => V.P(bx + (c[0] - .5) * sc, by + (c[1] - .5) * sc, bz + (c[2] - .5) * sc));
          const lit = Math.max(0, NX * LT[0] + NY * LT[1] + n[2] * LT[2]);
          const hc = f === 0 ? (it.top || it.col) : it.col;
          poly(ctx, p);
          ctx.fillStyle = shadeOf(hc, .64 + .36 * lit, f === 0 ? .1 : 0); ctx.fill();
          ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(1, V.s * .04 * sc); ctx.strokeStyle = shadeOf(hc, .55, 0, .9); ctx.stroke();
          if (it.sym || it.deco) {
            const cw = F.c;
            let p0 = p[0], e1 = [p[1][0] - p[0][0], p[1][1] - p[0][1]], e2 = [p[3][0] - p[0][0], p[3][1] - p[0][1]];
            let uw = [0, 1, 2].map(i => cw[1][i] - cw[0][i]);
            const vw = [0, 1, 2].map(i => cw[3][i] - cw[0][i]);
            if (f > 0 && e1[0] < 0) { p0 = p[1]; e1 = [-e1[0], -e1[1]]; e2 = [p[2][0] - p[1][0], p[2][1] - p[1][1]]; uw = uw.map(v => -v); }
            ctx.save(); ctx.transform(e1[0] / 100, e1[1] / 100, e2[0] / 100, e2[1] / 100, p0[0], p0[1]);
            if (it.sym && (f === 0 || it.symAll)) {
              ctx.fillStyle = it.symCol || 'rgba(24,36,44,.5)'; ctx.font = '700 60px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.fillText(it.sym, 50, 54);
            }
            if (it.deco) it.deco(ctx, f, uw, vw, it);
            ctx.restore();
          }
          if (it.glow) { poly(ctx, p); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,' + it.glow + ')'; ctx.stroke(); }
          if (it.id != null) V.hits.push({ id: it.id, p });
          drew = true;
        }
        if (drew && it.id != null) { const c = V.P(bx, by, bz); V.cens.push({ id: it.id, x: c[0], y: c[1] }); }
        ctx.globalAlpha = 1;
      }
      if (over) over(ctx, V);
    };
    V.hit = (px, py) => {
      for (let i = V.hits.length - 1; i >= 0; i--) { const h = V.hits[i]; if (h.r ? Math.hypot(px - h.x, py - h.y) <= h.r : inPoly(px, py, h.p)) return h.id; }
      let best = null, bd = V.s * .6;
      for (const c of V.cens) { const d = Math.hypot(px - c.x, py - c.y); if (d < bd) { bd = d; best = c.id; } }
      return best;
    };
    // a canvas point (css px) that really hits this id in the last drawing, or null when hidden
    V.where = id => {
      const firm = (x, y) => [[0, 0], [4, 0], [-4, 0], [0, 4], [0, -4]].every(([a, b]) => V.hit(x + a, y + b) === id);
      let loose = null;
      for (const h of V.hits) {
        if (h.id !== id || h.r) continue;
        const cx = h.p.reduce((a, q) => a + q[0], 0) / h.p.length, cy = h.p.reduce((a, q) => a + q[1], 0) / h.p.length;
        for (const f of [0, .25, .5]) for (const q of h.p) { const x = cx + (q[0] - cx) * f, y = cy + (q[1] - cy) * f; if (firm(x, y)) return [x, y]; if (!loose && V.hit(x, y) === id) loose = [x, y]; }
      }
      if (loose) return loose;
      for (const h of V.hits) {
        if (h.id !== id) continue;
        if (h.r) { if (V.hit(h.x, h.y) === id) return [h.x, h.y]; continue; }
        const cx = h.p.reduce((a, q) => a + q[0], 0) / h.p.length, cy = h.p.reduce((a, q) => a + q[1], 0) / h.p.length;
        const tries = [[cx, cy], ...h.p.map(q => [(cx * 2 + q[0]) / 3, (cy * 2 + q[1]) / 3]), ...h.p.map(q => [(cx + q[0] * 2) / 3, (cy + q[1] * 2) / 3])];
        for (const t of tries) if (V.hit(t[0], t[1]) === id) return t;
      }
      return null;
    };
    V.onTap = fn => cv.addEventListener('click', e => {
      const r = cv.getBoundingClientRect();
      const id = V.hit((e.clientX - r.left) * V.W / r.width, (e.clientY - r.top) * V.H / r.height);
      fn(id);
    });
    return V;
  }
  // requestAnimationFrame loop that stops once the canvas leaves the page
  function animate(V, fn) {
    let last = now();
    const f = t => {
      if (!V.cv.isConnected) return;
      const dt = Math.min(60, Math.max(0, t - last)); last = t;
      if (V.cv.offsetParent !== null) fn(t, dt);
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  }
  const stageW = (api, cap) => Math.min(api.stage.clientWidth || 340, cap);

  /* =========================================================
     1. CUBE BLASTER
     ========================================================= */
  function blBuild(type, k) {
    const m = new Map(), add = (x, y, z, c) => m.set(K(x, y, z), c);
    let name;
    if (type === 0) {
      name = 'a little house';
      const w = 3 + k, d = 2 + k, wh = k ? 2 : 1, lawn = k >= 2, o = lawn ? 1 : 0, zb = lawn ? 1 : 0;
      if (lawn) for (let x = 0; x < w + 2; x++) for (let y = 0; y < d + 2; y++) add(x, y, 0, 'leaf');
      for (let z = 0; z < wh; z++) for (let x = 0; x < w; x++) for (let y = 0; y < d; y++) add(x + o, y + o, zb + z, 'coral');
      if (k) add(o + (w >> 1), o + d - 1, zb, 'sun');
      if (wh >= 2 && w >= 4) { add(o, o + d - 1, zb + 1, 'sky'); add(o + w - 1, o + d - 1, zb + 1, 'sky'); }
      for (let r = 0; r * 2 < d; r++) for (let x = 0; x < w; x++) for (let y = r; y <= d - 1 - r; y++) add(x + o, y + o, zb + wh + r, 'berry');
      if (k >= 1) add(o + w - 1, o, zb + wh + 1, 'sky');
    } else if (type === 1) {
      name = 'an apple tree';
      const Rr = k >= 2 ? 2 : 1, th = k >= 1 ? 2 + (k >= 3 ? 1 : 0) : 1, g = k >= 2 ? 1 : 0, c = Rr + (g ? 1 : 0);
      if (g) for (let x = 0; x < 2 * c + 1; x++) for (let y = 0; y < 2 * c + 1; y++) add(x, y, 0, 'sun');
      for (let z = 0; z < th; z++) add(c, c, g + z, 'coral');
      const cz = g + th + Rr;
      for (let dx = -Rr; dx <= Rr; dx++) for (let dy = -Rr; dy <= Rr; dy++) for (let dz = -Rr; dz <= Rr; dz++) {
        if (dx * dx + dy * dy + dz * dz > Rr * Rr + 1) continue;
        const surf = Math.abs(dx) === Rr || Math.abs(dy) === Rr || dz === Rr;
        add(c + dx, c + dy, cz + dz, k >= 1 && surf && Math.random() < .28 ? 'berry' : 'leaf');
      }
    } else if (type === 2) {
      name = 'a sailing boat';
      const l = 4 + k, mid = l >> 1, mh = 2 + (k >= 2 ? 1 : 0), wd = k >= 3 ? 4 : 3, cy = wd >> 1;
      for (let x = 1; x < l - 1; x++) add(x, cy, 0, 'sky');
      for (let x = 0; x < l; x++) for (let y = 0; y < wd; y++) add(x, y, 1, (y > 0 && y < wd - 1 && x > 0 && x < l - 1) ? 'sun' : 'sky');
      for (let z = 0; z <= mh; z++) add(mid, cy, 2 + z, 'sun');
      for (let j = 0; j < mh; j++) for (let i = 1; i <= mh - j; i++) if (mid - i >= 0) add(mid - i, cy, 2 + j, 'coral');
      add(mid, cy, 3 + mh, 'berry');
      if (k >= 1) add(mid + 1, cy, 3 + mh, 'berry');
    } else if (type === 3) {
      name = 'a spotty mushroom';
      const Rr = k >= 1 ? 2 : 1, g = k >= 1 ? 1 : 0, sh = 2, c = Rr;
      if (g) for (let x = 0; x < 2 * c + 1; x++) for (let y = 0; y < 2 * c + 1; y++) add(x, y, 0, 'leaf');
      for (let z = 0; z < sh; z++) add(c, c, g + z, 'sun');
      for (let dx = -Rr; dx <= Rr; dx++) for (let dy = -Rr; dy <= Rr; dy++) {
        if (dx * dx + dy * dy <= Rr * Rr + 1) add(c + dx, c + dy, g + sh, (dx + dy * 2 + 9) % 4 === 0 ? 'sky' : 'berry');
        const r2 = Rr - 1;
        if (dx * dx + dy * dy <= r2 * r2 + (r2 ? 1 : 0)) add(c + dx, c + dy, g + sh + 1, (dx * 3 + dy + 9) % 4 === 1 ? 'sky' : 'berry');
      }
    } else {
      name = 'a rubber duck';
      const bl = 3 + k, bw = k >= 2 ? 3 : 2, g = k >= 2 ? 1 : 0;
      if (g) for (let x = -1; x <= bl; x++) for (let y = -1; y <= bw; y++) add(x + 1, y + 1, 0, 'sky');
      const o = g;
      for (let x = 0; x < bl; x++) for (let y = 0; y < bw; y++) for (let z = 0; z < 2; z++) add(x + o, y + o, g + z, 'sun');
      for (let y = 0; y < bw; y++) add(o, y + o, g + 2, 'sun');
      for (let x = bl - 2; x < bl; x++) for (let y = 0; y < bw; y++) for (let z = 2; z < 4; z++) add(x + o, y + o, g + z, 'sun');
      add(bl - 1 + o, o, g + 3, 'sky'); add(bl - 1 + o, bw - 1 + o, g + 3, 'sky');
      for (let y = 0; y < bw; y++) add(bl + o, y + o, g + 2, 'coral');
      if (k >= 1) for (let x = 1; x < bl - 2; x++) { add(x + o, o, g + 1, 'berry'); add(x + o, bw - 1 + o, g + 1, 'berry'); }
    }
    return { name, m };
  }
  // level -> model: early levels walk through the shapes and grow; later ones vary shape, size and colours at the cap
  function blModel(L) {
    const type = L <= 5 ? L - 1 : randInt(5);
    const k = L < 10 ? Math.min(3, Math.floor((L - 1) / 3)) : 2 + randInt(2);
    const mdl = blBuild(type, k);
    if (L >= 6) {
      const cols = Object.keys(SYM), perm = shuffle(cols.slice()), map = {};
      cols.forEach((c, i) => { map[c] = perm[i]; });
      for (const [kk, c] of mdl.m) mdl.m.set(kk, map[c]);
    }
    if (Math.random() < .5) { // mirror for variety
      const m2 = new Map(); let mx = 0;
      for (const kk of mdl.m.keys()) mx = Math.max(mx, unK(kk)[0]);
      for (const [kk, c] of mdl.m) { const [x, y, z] = unK(kk); m2.set(K(mx - x, y, z), c); }
      mdl.m = m2;
    }
    return mdl;
  }
  // a cube can be hit when its top or any side is open to the air
  function blReach(m, k) {
    const [x, y, z] = unK(k);
    if (!m.has(K(x, y, z + 1))) return true;
    return DIRS.some(([a, b]) => !m.has(K(x + a, y + b, z)));
  }
  function blTargets(m, col) {
    const r = [];
    for (const [k, c] of m) if (c === col && blReach(m, k)) r.push(k);
    return r.sort((a, b) => unK(b)[2] - unK(a)[2]);
  }
  function blFire(m, col, n) {
    let got = 0;
    while (got < n) { const t = blTargets(m, col); if (!t.length) break; m.delete(t[0]); got++; }
    return got;
  }
  // build the queue by actually clearing the model, so following it always works
  function blQueue(cubes, L) {
    const m = new Map(cubes), q = []; let last = null;
    const lo = 3, hi = L <= 2 ? 6 : 8;
    while (m.size) {
      const cols = [...new Set([...m].filter(([k]) => blReach(m, k)).map(e => e[1]))];
      const others = cols.filter(c => c !== last);
      const col = others.length ? pick(others) : cols[0];
      const got = blFire(m, col, lo + randInt(hi - lo + 1));
      if (q.length && q[q.length - 1].c === col) q[q.length - 1].n += got; else q.push({ c: col, n: got });
      last = col;
    }
    return q;
  }

  function startBlaster(L, api) {
    const model = blModel(L), m = new Map(model.m), queue = blQueue(model.m, L), slots = L <= 2 ? 2 : 3;
    let mistakes = 0, busy = false, finished = false;
    const HINT = 'Tap a blaster. It knocks off the cubes of its colour that it can reach.';
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, zTop = 0;
    for (const kk of m.keys()) { const [x, y, z] = unK(kk); x0 = Math.min(x0, x); x1 = Math.max(x1, x + 1); y0 = Math.min(y0, y); y1 = Math.max(y1, y + 1); zTop = Math.max(zTop, z + 1); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    let R0 = 0;
    for (const kk of m.keys()) { const [x, y] = unK(kk); for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) R0 = Math.max(R0, Math.hypot(x + a - cx, y + b - cy)); }
    R0 += .5;
    const V = makeView({ pitch: .5, yaw: .6 });
    const ready = el('div', 'cb-ready'), next = el('div', 'cb-next'), note = el('p', 'cx-note'), rainBar = el('div', 'cx-bar');
    api.stage.append(V.cv, el('p', 'cb-lab', 'Your blasters'), ready, rainBar, next, note);
    api.hint(HINT);
    let pops = [], parts = [], beams = [], lastW = 0;
    function layout() {
      const w = stageW(api, 640); if (w === lastW) return; lastW = w;
      V.resize(w, Math.round(clamp(w * .8, 270, 420)));
      const pts = [];
      for (let i = 0; i < 24; i++) { const t = i / 24 * TAU, px = cx + Math.cos(t) * R0, py = cy + Math.sin(t) * R0; pts.push([px, py, -.55], [px, py, zTop]); }
      V.fit(pts, { pad: 10 });
    }
    const under = (ctx) => {
      const ring = (z, r) => { const a = []; for (let i = 0; i < 48; i++) { const t = i / 48 * TAU; a.push(V.P(cx + Math.cos(t) * r, cy + Math.sin(t) * r, z)); } return a; };
      poly(ctx, ring(-1.1, R0 * 1.08)); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fill();
      const top = ring(0, R0), bot = ring(-.5, R0);
      ctx.fillStyle = '#B49A70';
      poly(ctx, bot); ctx.fill();
      for (let i = 0; i < 48; i++) { const j = (i + 1) % 48; poly(ctx, [top[i], top[j], bot[j], bot[i]]); ctx.fill(); }
      poly(ctx, top); ctx.fillStyle = '#FFF3DD'; ctx.fill();
      for (let s = 0; s < 12; s += 2) {
        const pts = [V.P(cx, cy, 0)];
        for (let i = 0; i <= 4; i++) { const t = (s + i / 4) / 12 * TAU; pts.push(V.P(cx + Math.cos(t) * R0, cy + Math.sin(t) * R0, 0)); }
        poly(ctx, pts); ctx.fillStyle = '#F4E2C2'; ctx.fill();
      }
      poly(ctx, top); ctx.lineWidth = 3; ctx.strokeStyle = '#DCCCAF'; ctx.stroke();
    };
    let lastT = now();
    const over = (ctx) => {
      const t = now(), dt = Math.min(60, t - lastT); lastT = t;
      beams = beams.filter(b => t - b.t0 < 240);
      for (const b of beams) {
        const p = V.P(b.x + .5, b.y + .5, b.z + .5), a = 1 - (t - b.t0) / 240;
        ctx.lineCap = 'round';
        ctx.strokeStyle = shadeOf(HEX[b.c], 1, 0, a * .9); ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(V.W / 2, V.H + 6); ctx.lineTo(p[0], p[1]); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,' + a + ')'; ctx.lineWidth = 4; ctx.stroke();
      }
      parts = parts.filter(p => (p.life -= dt) > 0);
      for (const p of parts) {
        p.vy += .0016 * dt * 60 / 16; p.x += p.vx * dt / 16; p.y += p.vy * dt / 16;
        ctx.fillStyle = shadeOf(HEX[p.c], 1, 0, Math.min(1, p.life / 300));
        ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
      }
    };
    animate(V, (t, dt) => {
      layout();
      V.yaw += dt * .00035 * (busy ? .35 : 1);
      const items = [];
      const big = V.s > 21;
      for (const [kk, c] of m) { const [x, y, z] = unK(kk); items.push({ x, y, z, col: HEX[c], sym: big ? SYM[c] : null, symAll: true }); }
      pops = pops.filter(p => t - p.t0 < 300);
      for (const p of pops) { const a = Math.max(0, (t - p.t0) / 300); items.push({ x: p.x, y: p.y, z: p.z, col: a < .3 ? '#FFFFFF' : HEX[p.c], sc: a < .3 ? 1 + a : 1.3 * (1 - (a - .3) / .7), loose: true }); }
      V.draw(items, under, over);
    });
    const btns = new Map();
    function renderQueue() {
      const act = queue.slice(0, slots);
      const list = act.map(b => {
        let btn = btns.get(b);
        if (!btn) {
          btn = el('button', 'tile cb-bl c-' + b.c, `<span class="cb-gun"></span>${SYM[b.c]}<span class="cb-n"></span>`); btn.type = 'button';
          btn.onclick = () => fire(b, btn); btns.set(b, btn);
        }
        btn.querySelector('.cb-n').textContent = b.n;
        btn.setAttribute('aria-label', `${b.c} blaster, ${b.n} shots`);
        btn.classList.toggle('cb-dim', !blTargets(m, b.c).length);
        return btn;
      });
      ready.replaceChildren(...list);
      const rest = queue.slice(slots);
      next.innerHTML = rest.length ? '<span>Next:</span>' : '';
      rest.slice(0, 6).forEach(b => next.append(el('span', 'tile cb-mini c-' + b.c, `${SYM[b.c]}<b>${b.n}</b>`)));
      if (rest.length > 6) next.append(el('span', '', '+' + (rest.length - 6) + ' more'));
      note.textContent = m.size ? m.size + (m.size === 1 ? ' cube' : ' cubes') + ' left' : 'All clear!';
    }
    function blast(kk) {
      const c = m.get(kk), [x, y, z] = unK(kk), t0 = now();
      m.delete(kk); pops.push({ x, y, z, c, t0 }); beams.push({ x, y, z, c, t0 });
      const p = V.P(x + .5, y + .5, z + .5);
      for (let i = 0; i < 8; i++) parts.push({ x: p[0], y: p[1], vx: (Math.random() - .5) * 7, vy: -Math.random() * 5 - 1, s: Math.max(5, V.s * .28), c, life: 650 });
      note.textContent = m.size + (m.size === 1 ? ' cube' : ' cubes') + ' left';
      return c;
    }
    function fire(b, btn) {
      if (busy || finished || !queue.includes(b)) return;
      if (!blTargets(m, b.c).length) { sfx.soft(); wob(btn); toast('Those cubes are covered for now'); return; }
      busy = true; btn.classList.add('cb-go'); let shot = 0;
      const step = () => {
        const tt = b.n > 0 ? blTargets(m, b.c) : [];
        if (!tt.length) {
          btn.classList.remove('cb-go');
          if (b.n <= 0) queue.splice(queue.indexOf(b), 1);
          busy = false; if (shot >= 4 && m.size) toast(cheer()); after(); return;
        }
        blast(tt[0]); b.n--; shot++;
        tone(400 + shot * 55, .12, 'triangle', .1);
        btn.querySelector('.cb-n').textContent = b.n;
        api.later(step, 210);
      };
      step();
    }
    function after() {
      renderQueue();
      rainBar.innerHTML = '';
      if (!m.size) {
        finished = true; sfx.good(); api.hint(`All cleared! That was ${model.name}.`);
        api.later(() => api.done(starsFor(mistakes, 0, 2)), 600);
        return;
      }
      const stuck = !queue.slice(0, slots).some(b => blTargets(m, b.c).length);
      if (stuck) {
        const rb = el('button', 'btn cb-rain', '🌈 Free rainbow blaster'); rb.type = 'button'; rb.onclick = rainbow;
        rainBar.append(rb);
        api.hint('No blaster can reach a cube just now. Tap the free rainbow blaster.');
      } else api.hint(HINT);
    }
    function rainbow() {
      if (busy || finished) return;
      busy = true; mistakes++; rainBar.innerHTML = ''; sfx.tap();
      let n = 0;
      const step = () => {
        const act = new Set(queue.slice(0, slots).map(b => b.c));
        if (n >= 3 || (n >= 1 && [...act].some(c => blTargets(m, c).length))) { busy = false; after(); return; }
        const score = kk => { const [x, y, z] = unK(kk); return [[0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]].some(([a, b, c]) => act.has(m.get(K(x + a, y + b, z + c)))) ? 1 : 0; };
        const tt = [...m.keys()].filter(kk => blReach(m, kk)).sort((a, b) => score(b) - score(a) || unK(b)[2] - unK(a)[2]);
        if (!tt.length) { busy = false; after(); return; }
        const c = blast(tt[0]); n++;
        for (let i = queue.length - 1; i >= 0; i--) if (queue[i].c === c) { queue[i].n--; if (queue[i].n <= 0) queue.splice(i, 1); break; }
        tone([523, 659, 784][n - 1] || 880, .16, 'sine', .12);
        renderQueue();
        api.later(step, 230);
      };
      step();
    }
    V.cv._dbg = { queue, m, slots, model };
    after();
  }

  /* =========================================================
     2. SLIDE OUT
     ========================================================= */
  const SL_COL = ['coral', 'sky', 'sun', 'leaf'];
  const SL_PITCH = .66;
  function slBlock(live, W, D, x, y, z, d) {
    const [dx, dy] = DIRS[d];
    for (let s = 1; ; s++) {
      const nx = x + dx * s, ny = y + dy * s;
      if (nx < 0 || ny < 0 || nx >= W || ny >= D) return 0;
      if (live.has(K(nx, ny, z))) return s;
    }
  }
  function slVisibleAll(W, D, cubes, maxZ) {
    const V = makeView({ pitch: SL_PITCH }); V.resize(360, 340);
    const yaws = [0, 1, 2, 3].map(r => Math.PI / 4 + r * Math.PI / 2);
    V.fit(boxPts(0, 0, 0, W, D, maxZ), { yaws });
    const seen = new Set();
    for (const yw of yaws) {
      V.yaw = yw;
      V.draw(cubes.map((c, i) => ({ x: c.x, y: c.y, z: c.z, col: '#888888', id: i })));
      cubes.forEach((c, i) => { if (!seen.has(i) && V.where(i)) seen.add(i); });
    }
    return seen.size === cubes.length;
  }
  function slGen(L) {
    const n = L <= 9 ? 6 + (L - 1) * 4 : 34 + randInt(7), maxH = L <= 2 ? 1 : L <= 5 ? 2 : 3;
    for (let tries = 0; ; tries++) {
      const mh = tries > 40 ? Math.max(1, maxH - 1) : maxH;
      const area = Math.ceil(n / (mh === 1 ? 1 : mh === 2 ? 1.5 : 2));
      let W = Math.ceil(Math.sqrt(area)), D = Math.ceil(area / W);
      if (W < D) [W, D] = [D, W];
      const H = Array(W * D).fill(0), cells = shuffle([...Array(W * D).keys()]);
      let placed = 0;
      for (const c of cells) if (placed < n) { H[c] = 1; placed++; }
      while (placed < n) { const c = pick(cells.filter(i => H[i] < mh)); H[c]++; placed++; }
      const cubes = [];
      for (let i = 0; i < W * D; i++) for (let z = 0; z < H[i]; z++) cubes.push({ x: i % W, y: Math.floor(i / W), z, d: 0 });
      // removal order: always some cube can leave (the furthest one along any axis); give it a clear arrow
      const live = new Set(cubes.map(c => K(c.x, c.y, c.z)));
      let rest = cubes.slice();
      while (rest.length) {
        const opts = [];
        for (const c of rest) { const ok = [0, 1, 2, 3].filter(d => !slBlock(live, W, D, c.x, c.y, c.z, d)); if (ok.length) opts.push([c, ok]); }
        const [c, ok] = pick(opts);
        c.d = pick(ok); live.delete(K(c.x, c.y, c.z)); rest = rest.filter(q => q !== c);
      }
      if (tries > 80 || slVisibleAll(W, D, cubes, mh)) return { W, D, mh, cubes };
    }
  }
  function slDeco(ctx, f, uw, vw, it) {
    const d = DIRS[it.d], dv = [d[0], d[1], 0];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    if (f === 0) { arrowIn(ctx, dot(dv, uw), dot(dv, vw)); return; }
    const nd = dot(FACES[f].n, dv);
    if (nd > .5) {
      ctx.beginPath(); ctx.arc(50, 50, 24, 0, TAU); ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(24,36,44,.78)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(50, 50, 8, 0, TAU); ctx.fillStyle = 'rgba(24,36,44,.78)'; ctx.fill();
    } else if (nd > -.5) arrowIn(ctx, Math.sign(dot(dv, uw)), 0);
  }
  function startSlide(L, api) {
    const g = slGen(L), { W, D } = g;
    const cubes = g.cubes.map((c, i) => Object.assign({}, c, { id: i, gone: false, anim: null }));
    let rot = 0, yawT = Math.PI / 4, mistakes = 0, hints = 0, combo = 0, finished = false, hintId = null, hintUntil = 0, left = cubes.length;
    const V = makeView({ pitch: SL_PITCH, yaw: yawT });
    const bar = el('div', 'cx-bar'), note = el('p', 'cx-note');
    const rotB = el('button', 'btn c-sky', '↻ Turn view'), hintB = el('button', 'btn c-sun', '💡 Hint');
    rotB.type = hintB.type = 'button';
    bar.append(rotB, hintB);
    api.stage.append(V.cv, bar, note);
    const HINT = 'Tap a cube to slide it out the way its arrow points. If something is in the way, it just bumps.';
    api.hint(HINT);
    const setNote = () => { note.textContent = left ? left + (left === 1 ? ' cube' : ' cubes') + ' left' : 'All clear!'; };
    setNote();
    let lastW = 0;
    function layout() {
      const w = stageW(api, 640); if (w === lastW) return; lastW = w;
      V.resize(w, Math.round(clamp(w * .92, 280, 480)));
      V.fit(boxPts(0, 0, 0, W, D, g.mh), { yaws: [0, 1, 2, 3].map(r => Math.PI / 4 + r * Math.PI / 2), pad: 12 });
    }
    const liveSet = () => new Set(cubes.filter(c => !c.gone).map(c => K(c.x, c.y, c.z)));
    const blockedAt = c => slBlock(liveSet(), W, D, c.x, c.y, c.z, c.d);
    function items(t) {
      const out = [];
      for (const c of cubes) {
        if (c.gone && !c.anim) continue;
        const it = { x: c.x, y: c.y, z: c.z, d: c.d, col: HEX[SL_COL[c.d]], id: c.gone ? null : c.id, deco: slDeco };
        if (c.anim) {
          const a = (t - c.anim.t0) / c.anim.ms, [dx, dy] = DIRS[c.d];
          if (c.anim.kind === 'out') {
            const dist = (Math.max(W, D) + 2) * a * a;
            it.off = [dx * dist, dy * dist, 0]; it.a = a > .5 ? 1 - (a - .5) / .5 : 1;
          } else {
            const amt = a < .4 ? ease(a / .4) * c.anim.dist : c.anim.dist * (1 - ease((a - .4) / .6));
            it.off = [dx * amt, dy * amt, 0];
          }
          if (a >= 1) c.anim = null;
        }
        if (hintId === c.id && t < hintUntil) it.glow = .55 + .45 * Math.sin(t / 130);
        out.push(it);
      }
      return out;
    }
    animate(V, (t, dt) => {
      layout();
      const dy = yawT - V.yaw; V.yaw = Math.abs(dy) < .002 ? yawT : V.yaw + dy * Math.min(1, dt * .012);
      V.draw(items(t), ground);
    });
    function ground(ctx) {
      const p = [V.P(-.4, -.4, 0), V.P(W + .4, -.4, 0), V.P(W + .4, D + .4, 0), V.P(-.4, D + .4, 0)];
      poly(ctx, p); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fill();
    }
    function tap(id) {
      if (id == null || finished) return;
      const c = cubes[id];
      if (!c || c.gone || c.anim) return;
      const b = blockedAt(c);
      if (!b) {
        c.gone = true; c.anim = { kind: 'out', t0: now(), ms: 520 }; left--; combo++;
        if (hintId === c.id) hintId = null;
        tone(460 + Math.min(combo, 12) * 45, .14, 'triangle', .12);
        if (combo > 0 && combo % 5 === 0 && left) toast(cheer());
        setNote(); api.hint(HINT);
        if (!left) { finished = true; api.later(() => { sfx.good(); api.hint('All the cubes are out. Lovely!'); }, 400); api.later(() => api.done(starsFor(mistakes + hints, 1, 3)), 900); }
      } else {
        c.anim = { kind: 'bump', t0: now(), ms: 460, dist: b - 1 + .2 }; mistakes++; combo = 0;
        sfx.soft(); toast('Bump! Something is in the way');
      }
    }
    V.onTap(tap);
    rotB.onclick = () => { sfx.tap(); rot = (rot + 1) % 4; yawT = Math.PI / 4 + rot * Math.PI / 2; };
    hintB.onclick = () => {
      if (finished) return;
      const free = cubes.filter(c => !c.gone && !c.anim && !blockedAt(c));
      if (!free.length) return;
      hints++;
      const cur = V.yaw;
      for (let i = 0; i < 4; i++) {
        const r = (rot + i) % 4;
        V.yaw = Math.PI / 4 + r * Math.PI / 2; V.draw(items(now()), ground);
        const c = free.find(q => V.where(q.id));
        if (c) {
          V.yaw = cur; rot = r; yawT = Math.PI / 4 + r * Math.PI / 2;
          hintId = c.id; hintUntil = now() + 4000; sfx.tap();
          api.hint(i ? 'I turned the view. The glowing cube can slide out. Tap it.' : 'The glowing cube can slide out. Tap it.');
          return;
        }
      }
      V.yaw = cur; tap(free[0].id); // hidden from every side: quietly help
    };
    V.cv._dbg = {
      W, D, cubes,
      free: () => cubes.filter(c => !c.gone && !c.anim && !blockedAt(c)).map(c => c.id),
      where: id => V.where(id),
      turn: () => rotB.click()
    };
  }

  /* =========================================================
     3. HIDDEN MODEL
     ========================================================= */
  const HM_NAMES = ['a table', 'a tree', 'a mushroom', 'a pyramid', 'some stairs', 'a chair', 'a little house'];
  function hmShape(t, W, D, H) {
    const m = new Map(), add = (x, y, z, c) => m.set(K(x, y, z), c);
    const cx = (W - 1) / 2, cy = (D - 1) / 2;
    const mid = (x, y) => Math.abs(x - cx) <= .5 && Math.abs(y - cy) <= .5;
    const corner = (x, y) => (x === 0 || x === W - 1) && (y === 0 || y === D - 1);
    const edge = (x, y) => x === 0 || y === 0 || x === W - 1 || y === D - 1;
    const near = (x, y, r) => Math.abs(x - cx) + Math.abs(y - cy) <= r;
    for (let z = 0; z < H; z++) for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) {
      const top = z === H - 1;
      if (t === 0) { if (top || corner(x, y)) add(x, y, z, 'orange'); }
      else if (t === 1) {
        const th = H <= 2 ? 1 : H - 2;
        if (z < th) { if (mid(x, y)) add(x, y, z, 'orange'); }
        else if (top && H > 2) { if (near(x, y, 1.5)) add(x, y, z, 'leaf'); }
        else if (!corner(x, y)) add(x, y, z, (x + y) % 3 === 0 && z === th ? 'berry' : 'leaf');
      } else if (t === 2) {
        const cs = H >= 4 ? H - 2 : H - 1;
        if (z < cs) { if (mid(x, y)) add(x, y, z, 'card'); }
        else if (top && H >= 4) { if (near(x, y, 1.5)) add(x, y, z, (x + y) % 2 ? 'card' : 'coral'); }
        else if (!corner(x, y)) add(x, y, z, (x * 2 + y) % 3 === 0 ? 'card' : 'coral');
      } else if (t === 3) {
        if (x >= z && x <= W - 1 - z && y >= z && y <= D - 1 - z) add(x, y, z, ['sun', 'orange', 'coral', 'berry', 'grape'][z]);
      } else if (t === 4) {
        if (z <= Math.floor(x * H / W)) add(x, y, z, z % 2 ? 'sky' : 'grape');
      } else if (t === 5) {
        const zs = H >= 3 ? 1 : 0;
        if (z < zs) { if (corner(x, y)) add(x, y, z, 'berry'); }
        else if (z === zs || y === 0) add(x, y, z, 'berry');
      } else {
        const roof = H >= 3 ? H - 2 : H - 1;
        if (z < roof) { if (edge(x, y) && !(z === 0 && x === Math.floor(cx) && y === D - 1)) add(x, y, z, z === 1 && x === 0 && y === 1 ? 'sky' : 'coral'); }
        else if (z === roof && !top) add(x, y, z, 'berry');
        else if (Math.abs(y - cy) <= .5) add(x, y, z, 'berry');
      }
    }
    return { name: HM_NAMES[t], m };
  }
  function hmLines(W, D, H, keep) {
    const out = [];
    for (let z = 0; z < H; z++) {
      for (let y = 0; y < D; y++) { const cells = []; for (let x = 0; x < W; x++) cells.push(K(x, y, z)); out.push({ z, kind: 'r', i: y, cells, clue: cells.filter(k => keep.has(k)).length }); }
      for (let x = 0; x < W; x++) { const cells = []; for (let y = 0; y < D; y++) cells.push(K(x, y, z)); out.push({ z, kind: 'c', i: x, cells, clue: cells.filter(k => keep.has(k)).length }); }
    }
    return out;
  }
  // simple line logic: a line that needs no more cubes loses the rest; a line that needs all that are left keeps them
  function hmProp(lines, known) {
    let ch = true;
    while (ch) {
      ch = false;
      for (const l of lines) {
        let kk = 0; const unk = [];
        for (const k of l.cells) { const s = known.get(k); if (s === 'keep') kk++; else if (!s) unk.push(k); }
        if (!unk.length) continue;
        if (l.clue - kk === 0) { unk.forEach(k => known.set(k, 'gone')); ch = true; }
        else if (l.clue - kk === unk.length) { unk.forEach(k => known.set(k, 'keep')); ch = true; }
      }
    }
    return known;
  }
  const HM_DIMS = [[3, 3, 2], [3, 3, 3], [4, 3, 3], [4, 4, 3], [4, 4, 4], [4, 5, 4], [4, 5, 5]];
  function hmGen(L) {
    const n = HM_DIMS.length, [W, D, H] = L <= n ? HM_DIMS[L - 1] : HM_DIMS[n - 3 + randInt(3)];
    let shape = null;
    for (const t of shuffle([0, 1, 2, 3, 4, 5, 6])) {
      const s = hmShape(t, W, D, H), fr = s.m.size / (W * D * H);
      if (fr >= .2 && fr <= .8) { shape = s; break; }
    }
    if (!shape) shape = hmShape(0, W, D, H);
    const lines = hmLines(W, D, H, shape.m), givens = new Map();
    for (let guard = 0; guard < 500; guard++) {
      const known = hmProp(lines, new Map(givens));
      if (known.size === W * D * H) break;
      const unk = [];
      for (let z = 0; z < H; z++) for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) if (!known.has(K(x, y, z))) unk.push(K(x, y, z));
      const ks = unk.filter(k => shape.m.has(k));
      const k = ks.length && Math.random() < .7 ? pick(ks) : pick(unk);
      givens.set(k, shape.m.has(k) ? 'keep' : 'gone');
    }
    return { W, D, H, name: shape.name, keep: shape.m, lines, givens };
  }
  function startHidden(L, api) {
    const P = hmGen(L), { W, D, H, keep, lines } = P;
    const status = new Map(P.givens), done = Array(H).fill(false);
    let cur = 0, mistakes = 0, hints = 0, finished = false, reveal = 0, combo = 0, hiK = null;
    const pops = [];
    const V = makeView({ yaw: .4, pitch: .8 });
    const tabs = el('div', 'hm-tabs'), grid = el('div', 'hm-grid'), bar = el('div', 'cx-bar');
    const hintB = el('button', 'btn c-sun', '💡 Hint'); hintB.type = 'button'; hintB.onclick = doHint; bar.append(hintB);
    api.stage.append(V.cv, tabs, grid, bar);
    const HINT = 'Each number is how many cubes belong in that line. Tap the cubes that belong to give them a ✓. Tap again to take it off. Tap a number to tick or untick its whole line.';
    api.hint(HINT);
    const layerKeys = z => { const a = []; for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) a.push(K(x, y, z)); return a; };
    const ticked = k => status.get(k) === 'keep' || status.get(k) === 'mark';
    const right = k => keep.has(k) ? ticked(k) : !ticked(k);
    const layerDone = z => layerKeys(z).every(right);
    const lineDone = l => l.cells.every(right);
    const lineOver = l => l.cells.filter(ticked).length > l.clue;
    for (let z = 0; z < H; z++) if (layerDone(z)) { layerKeys(z).forEach(k => { if (!status.has(k)) status.set(k, 'keep'); }); done[z] = true; }
    cur = Math.max(0, done.indexOf(false));
    api.rounds(H, done.filter(Boolean).length);
    function render() {
      tabs.innerHTML = '';
      for (let z = 0; z < H; z++) {
        const b = el('button', 'btn c-card hm-tab' + (z === cur ? ' on' : '') + (done[z] ? ' ok' : ''), 'Layer ' + (z + 1));
        b.type = 'button'; b.onclick = () => { if (finished || z === cur) return; sfx.tap(); cur = z; hiK = null; render(); };
        tabs.append(b);
      }
      const cs = clamp(Math.floor((stageW(api, 640) - 56 - 9 * W) / W), 52, 76);
      grid.style.setProperty('--w', W); grid.style.setProperty('--d', D); grid.style.setProperty('--cs', cs + 'px');
      grid.innerHTML = '';
      grid.append(el('span'));
      const clue = l => {
        const ok = lineDone(l), over = !ok && lineOver(l);
        const b = el('button', 'hm-clue' + (ok ? ' ok' : over ? ' over' : ''), l.clue + (ok ? '✓' : over ? '!' : ''));
        b.type = 'button'; b.setAttribute('aria-label', (l.kind === 'r' ? 'Row' : 'Column') + ' needs ' + l.clue + '. Tap to clear or refill this line.');
        b.onclick = () => toggleLine(l); return b;
      };
      for (let x = 0; x < W; x++) grid.append(clue(lines.find(l => l.z === cur && l.kind === 'c' && l.i === x)));
      for (let y = 0; y < D; y++) {
        grid.append(clue(lines.find(l => l.z === cur && l.kind === 'r' && l.i === y)));
        for (let x = 0; x < W; x++) {
          const k = K(x, y, cur), s = status.get(k);
          const b = el('button', 'tile hm-cell ' + (s === 'gone' ? 'gone' : (s === 'keep' || s === 'mark') ? 'keep' : 'c-card') + (hiK === k ? ' hi' : ''), (s === 'keep' || s === 'mark') ? '✓' : '');
          b.type = 'button'; b.dataset.k = k;
          b.setAttribute('aria-label', s === 'gone' ? 'Empty' : (s === 'keep' || s === 'mark') ? 'Ticked' : 'Cube');
          b.onclick = () => chip(k);
          grid.append(b);
        }
      }
    }
    function chip(k) {
      if (finished) return;
      const z = unK(k)[2];
      if (z !== cur) return;
      const s = status.get(k);
      if (s === 'keep') { sfx.soft(); api.hint('That ✓ was given to you, so it stays.'); return; }
      if (s === 'gone') { sfx.soft(); api.hint('That square is already empty.'); return; }
      if (hiK === k) hiK = null;
      if (s === 'mark') { status.delete(k); combo = 0; tone(380, .1, 'triangle', .08); api.hint('Tick taken off.'); }
      else { status.set(k, 'mark'); combo++; if (!keep.has(k)) mistakes++; tone(480 + Math.min(combo, 12) * 40, .12, 'triangle', .11); api.hint(HINT); }
      afterChange();
    }
    function toggleLine(l) {
      if (finished || l.z !== cur) return;
      const open = l.cells.filter(k => !status.has(k));
      if (open.length) {
        open.forEach((k, i) => { status.set(k, 'mark'); if (!keep.has(k)) mistakes++; tone(480 + i * 60, .1, 'triangle', .09, i * .05); });
        api.hint('Ticked that ' + (l.kind === 'r' ? 'row' : 'column') + '. Tap the number again to untick it.');
      } else {
        const back = l.cells.filter(k => status.get(k) === 'mark');
        if (!back.length) { sfx.soft(); return; }
        back.forEach(k => status.delete(k)); tone(380, .12, 'triangle', .08);
        api.hint('Unticked that ' + (l.kind === 'r' ? 'row' : 'column') + '.');
      }
      afterChange();
    }
    function afterChange() {
      if (layerDone(cur)) finishLayer(cur);
      else {
        render();
        const need = layerKeys(cur).filter(k => keep.has(k)).length, have = layerKeys(cur).filter(ticked).length;
        if (have >= need) api.hint('Nearly! A number showing ! has too many ticks. Tap a ✓ in that line to take it off.');
      }
    }
    function finishLayer(z) {
      layerKeys(z).forEach(k => {
        if (keep.has(k)) status.set(k, 'keep');
        else if (status.get(k) !== 'gone') { status.set(k, 'gone'); const [x, y] = unK(k); pops.push({ x, y, z, t0: now() }); }
      });
      done[z] = true; hiK = null; render(); sfx.good();
      api.rounds(H, done.filter(Boolean).length);
      if (done.every(Boolean)) { finished = true; api.later(win, 700); return; }
      api.hint('Layer ' + (z + 1) + ' done! On to the next layer.');
      let nz = done.findIndex((d, i) => !d && i > z); if (nz < 0) nz = done.indexOf(false);
      api.later(() => { if (!finished && cur === z) { cur = nz; render(); } }, 900);
    }
    function win() {
      tabs.innerHTML = ''; grid.innerHTML = ''; bar.innerHTML = '';
      reveal = now(); lastW = 0;
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .25, 'sine', .1, i * .12));
      api.hint(`You found it: ${P.name}!`);
      api.later(() => api.done(starsFor(mistakes + Math.floor(hints / 2), 0, 2)), 3000);
    }
    function doHint() {
      if (finished) return;
      if (done[cur]) { const z = done.indexOf(false); if (z >= 0) { cur = z; render(); } return; }
      const wrong = layerKeys(cur).find(k => !keep.has(k) && status.get(k) === 'mark');
      if (wrong) { hints++; status.delete(wrong); hiK = null; sfx.tap(); api.hint('One of your ticks wasn’t part of the model, so I’ve taken it off.'); afterChange(); return; }
      for (const l of lines) {
        if (l.z !== cur) continue;
        let kk = 0; const unk = [];
        l.cells.forEach(k => { const s = status.get(k); if (s === 'keep' || s === 'mark') kk++; else if (!s) unk.push(k); });
        if (!unk.length) continue;
        const word = l.kind === 'r' ? 'row' : 'column';
        if (l.clue - kk === 0) {
          hints++; unk.forEach(k => { status.set(k, 'gone'); const [x, y] = unK(k); pops.push({ x, y, z: cur, t0: now() }); }); sfx.tap();
          api.hint(`This ${word} already has all its ticks, so I’ve cleared the rest of it.`); afterChange(); return;
        }
        if (l.clue - kk === unk.length) {
          hints++; hiK = unk[0]; render(); sfx.tap();
          api.hint(`This ${word} needs every cube it has left. Tap the glowing one to tick it.`); return;
        }
      }
    }
    let lastW = 0;
    function layout() {
      const w = stageW(api, 560); if (w === lastW) return; lastW = w;
      V.resize(w, Math.round(reveal ? clamp(w * .9, 280, 440) : clamp(w * .6, 200, 300)));
      V.fit(boxPts(0, 0, 0, W, D, H), { yaws: [...Array(12)].map((_, i) => i / 12 * TAU), pad: 10 });
    }
    function ground(ctx) {
      poly(ctx, [V.P(-.3, -.3, 0), V.P(W + .3, -.3, 0), V.P(W + .3, D + .3, 0), V.P(-.3, D + .3, 0)]);
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fill();
    }
    animate(V, t => {
      layout();
      const items = [], zTop = reveal ? H - 1 : cur, ra = reveal ? (t - reveal) / 2600 : 0;
      if (reveal) V.yaw = .4 + ease(ra) * TAU;
      for (let z = 0; z <= zTop; z++) for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) {
        const k = K(x, y, z), s = status.get(k);
        if (s === 'gone') continue;
        const it = { x, y, z };
        if (reveal) it.col = ra * 1.5 > z / H ? HEX[keep.get(k)] : HEX.mint;
        else if (s === 'keep' || s === 'mark') { it.col = HEX.mint; it.sym = '✓'; it.symCol = 'rgba(31,140,70,.8)'; }
        else { it.col = z === cur ? HEX.stone : HEX.stoneD; if (z === cur) it.id = k; }
        if (!reveal && z === cur && hiK === k) it.glow = .55 + .45 * Math.sin(t / 130);
        items.push(it);
      }
      for (let i = pops.length - 1; i >= 0; i--) {
        const p = pops[i], a = (t - p.t0) / 320;
        if (a >= 1) { pops.splice(i, 1); continue; }
        if (p.z <= zTop && !reveal) items.push({ x: p.x, y: p.y, z: p.z, col: HEX.stone, sc: Math.max(.01, 1 - a), off: [0, 0, a * .7], loose: true });
      }
      V.draw(items, ground);
    });
    V.onTap(id => { if (id) chip(id); });
    V.cv._dbg = { P, status, cur: () => cur, todo: () => layerKeys(cur).filter(k => !keep.has(k) && status.get(k) !== 'gone') };
    render();
  }

  /* =========================================================
     4. ROBOT WALK
     ========================================================= */
  // map: digit = height in blocks, '.' = water. b: buttons; each effect sets a cell to a new height (0 = water)
  const RW = [
    { name: 'First steps', map: ['1111', '1..1', '1112'], s: [0, 0], g: [3, 2], b: [] },
    { name: 'Up the stairs', map: ['1234', '1...', '1111'], s: [0, 2], g: [3, 0], b: [] },
    { name: 'A bridge appears', map: ['11.11', '11.11'], s: [0, 0], g: [4, 1], b: [{ at: [1, 1], fx: [[2, 0, 1], [2, 1, 1]] }] },
    { name: 'Down comes the wall', map: ['11311', '11311', '11311'], s: [0, 1], g: [4, 1], b: [{ at: [1, 2], fx: [[2, 1, 1]] }] },
    { name: 'Climb to the button', map: ['123.', '1...', '1.11'], s: [0, 2], g: [3, 2], b: [{ at: [2, 0], fx: [[1, 2, 1]] }] },
    { name: 'Two buttons', map: ['11.22', '1...2', '11.34'], s: [0, 0], g: [3, 2], b: [{ at: [1, 2], fx: [[2, 0, 1]] }, { at: [4, 1], fx: [[4, 2, 3]] }] },
    { name: 'Make a step', map: ['11133', '1...3', '111.3'], s: [0, 2], g: [4, 2], b: [{ at: [2, 2], fx: [[2, 0, 2]] }] },
    { name: 'Island hop', map: ['1.2.3', '1.2.3', '112.3'], s: [0, 0], g: [4, 0], b: [{ at: [2, 0], fx: [[3, 1, 2]] }] },
    { name: 'The gentle way down', map: ['333.', '3.3.', '3.31', '1111'], s: [0, 0], g: [3, 2], b: [{ at: [2, 2], fx: [[0, 2, 2]] }] },
    { name: 'Bridge and wall', map: ['1.1.2', '1.1.3', '111.1'], s: [0, 0], g: [4, 0], b: [{ at: [2, 0], fx: [[3, 2, 1]] }, { at: [4, 2], fx: [[4, 1, 2]] }] },
    { name: 'The high star', map: ['1111', '1..1', '1..4', '112.'], s: [0, 0], g: [3, 2], b: [{ at: [3, 0], fx: [[3, 3, 3]] }] },
    { name: 'The grand tour', map: ['11.222', '1....2', '11.4.3', '.111.3'], s: [0, 0], g: [3, 2], b: [{ at: [1, 3], fx: [[2, 0, 1]] }, { at: [5, 3], fx: [[3, 2, 2]] }] }
  ];
  function rwFromBase(base, flip) {
    const W = base.map[0].length, D = base.map.length, fx = x => flip ? W - 1 - x : x;
    const h = base.map.map(r => [...(flip ? [...r].reverse().join('') : r)].map(ch => ch === '.' ? 0 : +ch));
    return {
      name: base.name, W, D, h, s: [fx(base.s[0]), base.s[1]], g: [fx(base.g[0]), base.g[1]],
      b: base.b.map(b => ({ at: [fx(b.at[0]), b.at[1]], fx: b.fx.map(([x, y, v]) => [fx(x), y, v]) }))
    };
  }
  // hand-made levels first, then an endless generator (verified by BFS) whose size and button count plateau
  function rwLevel(L) {
    if (L <= RW.length) return rwFromBase(RW[L - 1], false);
    return rwGen(L) || rwFromBase(RW[2 + randInt(RW.length - 2)], Math.random() < .5);
  }
  // full state search: (x, y, buttons pressed). Returns moves to goal, whether a button is needed, and dead ends.
  function rwCheck(lv) {
    const W = lv.W, D = lv.D, enc = (x, y, m) => (m * D + y) * W + x;
    const start = enc(lv.s[0], lv.s[1], 0), dist = new Map([[start, 0]]), q = [[lv.s[0], lv.s[1], 0]], rev = new Map(), goals = [];
    while (q.length) {
      const [x, y, m] = q.shift(), cur = enc(x, y, m);
      if (x === lv.g[0] && y === lv.g[1]) { goals.push(cur); continue; }
      const h = rwHeights(lv, m);
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (!rwCan(lv, h, x, y, nx, ny)) continue;
        let nm = m; lv.b.forEach((b, i) => { if (b.at[0] === nx && b.at[1] === ny) nm |= 1 << i; });
        const nk = enc(nx, ny, nm);
        if (!rev.has(nk)) rev.set(nk, []); rev.get(nk).push(cur);
        if (!dist.has(nk)) { dist.set(nk, dist.get(cur) + 1); q.push([nx, ny, nm]); }
      }
    }
    const good = new Set(goals), rq = goals.slice();
    while (rq.length) { const c = rq.shift(); for (const p of rev.get(c) || []) if (!good.has(p)) { good.add(p); rq.push(p); } }
    const deadEnds = [...dist.keys()].filter(k => !good.has(k)).length;
    const moves = goals.length ? Math.min(...goals.map(g => dist.get(g))) : -1;
    // without pressing anything (buttons act as plain floor)
    const h0 = lv.h, seen = new Set([lv.s[1] * W + lv.s[0]]), q0 = [lv.s];
    let free = false;
    while (q0.length) {
      const [x, y] = q0.shift();
      if (x === lv.g[0] && y === lv.g[1]) { free = true; break; }
      for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (rwCan(lv, h0, x, y, nx, ny) && !seen.has(ny * W + nx)) { seen.add(ny * W + nx); q0.push([nx, ny]); } }
    }
    return { ok: moves > 0 && deadEnds === 0, moves, deadEnds, needsButton: !free };
  }
  const RW_NAMES = ['Stepping stones', 'Over the water', 'Up and over', 'Button hunt', 'Hill and pond', 'The long way round', 'Little islands', 'Up the tower', 'Puzzle garden', 'Bridges and blocks'];
  function rwGen(L) {
    const lv = L - RW.length;
    const nb = lv < 4 ? 1 : lv < 12 ? 1 + randInt(2) : 2 + randInt(2);
    const maxW = lv < 6 ? 5 : 6;
    const reach = (base, mask, from) => {
      const h = rwHeights(base, mask), W = base.W, seen = new Set([from[1] * W + from[0]]), q = [from];
      while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (rwCan(base, h, x, y, nx, ny) && !seen.has(ny * W + nx)) { seen.add(ny * W + nx); q.push([nx, ny]); } } }
      return seen;
    };
    for (let tries = 0; tries < 600; tries++) {
      const W = 4 + randInt(maxW - 3), D = 3 + randInt(maxW - 2);
      const h = Array.from({ length: D }, () => Array(W).fill(0));
      let x = randInt(W), y = randInt(D), z = 1 + randInt(2);
      const path = [[x, y]]; h[y][x] = z;
      const len = 7 + Math.min(9, lv) + randInt(3);
      for (let s = 0; s < len * 4 && path.length < len; s++) {
        const [dx, dy] = pick(DIRS), nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= D || h[ny][nx]) continue;
        z = clamp(z + pick([-1, 0, 0, 1]), 1, 4); h[ny][nx] = z; x = nx; y = ny; path.push([x, y]);
      }
      if (path.length < 6) continue;
      const onPath = new Set(path.map(([a, b]) => b * W + a));
      for (let e = 0; e < W * D * .2; e++) {
        const ex = randInt(W), ey = randInt(D);
        if (h[ey][ex]) continue;
        const nbh = DIRS.map(([a, b]) => (h[ey + b] || [])[ex + a]).filter(v => v);
        if (nbh.length) h[ey][ex] = clamp(pick(nbh) + pick([-2, -1, 0, 1, 2]), 1, 4);
      }
      const s = path[0], g = path[path.length - 1];
      const idxs = shuffle([...Array(path.length - 2).keys()].map(i => i + 1)).slice(0, nb).sort((a, b) => a - b);
      if (idxs.length < nb) continue;
      const base = { name: pick(RW_NAMES), W, D, h, s, g, b: [] };
      const fxs = idxs.map(i => {
        const [cx, cy] = path[i], orig = h[cy][cx];
        if (Math.random() < .5) { h[cy][cx] = 0; return [cx, cy, orig]; }
        const near = [path[i - 1], path[i + 1]].map(([a, b]) => h[b][a]);
        h[cy][cx] = Math.min(6, Math.max(...near) + 2); return [cx, cy, orig];
      });
      const fxCells = new Set(fxs.map(([a, b]) => b * W + a));
      let fail = false, prev = new Set();
      for (let k = 0; k < nb; k++) {
        const r = reach(base, (1 << k) - 1, s);
        const used = new Set(base.b.map(b => b.at[1] * W + b.at[0]));
        const okCell = c => c !== s[1] * W + s[0] && c !== g[1] * W + g[0] && !fxCells.has(c) && !used.has(c);
        let cand = [...r].filter(c => okCell(c) && !prev.has(c));
        if (!cand.length) cand = [...r].filter(okCell);
        if (!cand.length) { fail = true; break; }
        const c = pick(cand.filter(c2 => !onPath.has(c2)).length && Math.random() < .6 ? cand.filter(c2 => !onPath.has(c2)) : cand);
        base.b.push({ at: [c % W, Math.floor(c / W)], fx: [fxs[k]] });
        prev = r;
      }
      if (fail) continue;
      const res = rwCheck(base);
      if (res.ok && res.needsButton && res.moves >= 6) return base;
    }
    return null;
  }
  function rwHeights(lv, mask) {
    const h = lv.h.map(r => r.slice());
    lv.b.forEach((b, i) => { if (mask >> i & 1) b.fx.forEach(([x, y, v]) => { h[y][x] = v; }); });
    return h;
  }
  const rwCan = (lv, h, ax, ay, bx, by) => bx >= 0 && by >= 0 && bx < lv.W && by < lv.D && h[by][bx] > 0 && Math.abs(h[by][bx] - h[ay][ax]) <= 1;
  function rwPath(lv, h, mask, from, to) {
    const W = lv.W, idx = (x, y) => y * W + x, prev = new Map([[idx(from[0], from[1]), -1]]), q = [from];
    const unpressed = new Set(lv.b.filter((b, i) => !(mask >> i & 1)).map(b => idx(b.at[0], b.at[1])));
    while (q.length) {
      const [x, y] = q.shift();
      if (x === to[0] && y === to[1]) {
        const path = []; let c = idx(x, y);
        while (c !== idx(from[0], from[1])) { path.unshift([c % W, Math.floor(c / W)]); c = prev.get(c); }
        return path;
      }
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy, ni = idx(nx, ny);
        if (!rwCan(lv, h, x, y, nx, ny) || prev.has(ni)) continue;
        if (unpressed.has(ni) && !(nx === to[0] && ny === to[1])) continue;
        prev.set(ni, idx(x, y)); q.push([nx, ny]);
      }
    }
    return null;
  }
  function drawStar(ctx, x, y, r, sx) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * .45 : r; ctx.lineTo(x + Math.cos(a) * rr2 * sx, y + Math.sin(a) * rr2); }
    ctx.closePath();
  }
  function drawBot(ctx, V, bot, t) {
    const s = V.s, p = V.P(bot.rx + .5, bot.ry + .5, bot.rz);
    const sh = V.P(bot.rx + .5, bot.ry + .5, bot.gz);
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(sh[0], sh[1], s * .3, s * .3 * Math.sin(V.pitch), 0, 0, TAU); ctx.fill();
    const shake = t - bot.shake < 500 ? Math.sin((t - bot.shake) / 30) * s * .06 : 0;
    const bx = p[0] + shake, by = p[1] - Math.abs(Math.sin(t / 260)) * s * .03;
    const look = clamp(bot.look, -1, 1);
    ctx.fillStyle = '#4A5862';
    rr(ctx, bx - s * .2, by - s * .14, s * .13, s * .14, s * .04); ctx.fill();
    rr(ctx, bx + s * .07, by - s * .14, s * .13, s * .14, s * .04); ctx.fill();
    rr(ctx, bx - s * .26, by - s * .52, s * .52, s * .42, s * .1); ctx.fillStyle = '#45AEFF'; ctx.fill();
    ctx.lineWidth = Math.max(1.5, s * .035); ctx.strokeStyle = '#1D70C0'; ctx.stroke();
    ctx.fillStyle = '#F25A95'; ctx.font = `700 ${Math.round(s * .2)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('♥', bx, by - s * .3);
    ctx.strokeStyle = '#4A5862'; ctx.lineWidth = Math.max(1.5, s * .04);
    ctx.beginPath(); ctx.moveTo(bx, by - s * .94); ctx.lineTo(bx, by - s * 1.1); ctx.stroke();
    ctx.fillStyle = '#FFC234'; ctx.beginPath(); ctx.arc(bx, by - s * 1.13, s * .065, 0, TAU); ctx.fill();
    rr(ctx, bx - s * .32, by - s * .96, s * .64, s * .46, s * .14); ctx.fillStyle = '#FFF6E6'; ctx.fill();
    ctx.strokeStyle = '#DCCCAF'; ctx.lineWidth = Math.max(1.5, s * .035); ctx.stroke();
    rr(ctx, bx - s * .25, by - s * .89, s * .5, s * .32, s * .09); ctx.fillStyle = '#18242C'; ctx.fill();
    const blink = (t % 3200) < 120;
    ctx.fillStyle = '#7FF3FF';
    for (const ex of [-.11, .11]) {
      ctx.beginPath();
      if (blink) ctx.rect(bx + (ex + look * .04) * s - s * .05, by - s * .74, s * .1, s * .02);
      else ctx.arc(bx + (ex + look * .04) * s, by - s * .74, s * .05, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = '#7FF3FF'; ctx.lineWidth = Math.max(1.2, s * .025);
    ctx.beginPath(); ctx.arc(bx + look * .04 * s, by - s * .69, s * .07, .2 * Math.PI, .8 * Math.PI); ctx.stroke();
  }
  function startRobot(L, api) {
    const lv = rwLevel(L), { W, D } = lv;
    let mask = 0, mistakes = 0, finished = false, rot = 0, yawT = Math.PI / 4, marker = null;
    let h = rwHeights(lv, 0);
    const hd = h.map(r => r.slice()), anims = [];
    const special = new Map();
    lv.b.forEach(b => b.fx.forEach(([x, y, v]) => special.set(y * W + x, { kind: lv.h[y][x] === 0 ? 'bridge' : 'block', up: v > lv.h[y][x] })));
    const btnAt = new Map(lv.b.map((b, i) => [b.at[1] * W + b.at[0], i]));
    const gi = lv.g[1] * W + lv.g[0];
    const bot = { x: lv.s[0], y: lv.s[1], path: [], t0: 0, look: 1, shake: -1e4, jump: 0, rx: lv.s[0], ry: lv.s[1], rz: 0, gz: 0 };
    const V = makeView({ pitch: .64 });
    const bar = el('div', 'cx-bar'), note = el('p', 'cx-note', lv.name);
    const rotB = el('button', 'btn c-sky', '↻ Turn view'); rotB.type = 'button';
    rotB.onclick = () => { sfx.tap(); rot = (rot + 1) % 4; yawT = Math.PI / 4 + rot * Math.PI / 2; };
    bar.append(rotB);
    api.stage.append(V.cv, bar, note);
    const HINT = lv.b.length ? 'Tap a square to walk the robot there. It can climb one block at a time. Step on a red button to change the world. Reach the ★.'
      : 'Tap a square to walk the robot there. It can climb one block at a time. Reach the ★.';
    api.hint(HINT);
    let maxH = 1;
    lv.h.forEach(r => r.forEach(v => { maxH = Math.max(maxH, v); }));
    lv.b.forEach(b => b.fx.forEach(f => { maxH = Math.max(maxH, f[2]); }));
    let lastW = 0;
    function layout() {
      const w = stageW(api, 640); if (w === lastW) return; lastW = w;
      V.resize(w, Math.round(clamp(w * .85, 280, 470)));
      V.fit(boxPts(-.6, -.6, -.5, W + .6, D + .6, maxH + 1.3), { yaws: [0, 1, 2, 3].map(r => Math.PI / 4 + r * Math.PI / 2), pad: 8 });
    }
    function water(ctx, V2) {
      const t = now(), a = -.6, bx = W + .6, by = D + .6;
      const top = [V2.P(a, a, 0), V2.P(bx, a, 0), V2.P(bx, by, 0), V2.P(a, by, 0)];
      const bot2 = [V2.P(a, a, -.5), V2.P(bx, a, -.5), V2.P(bx, by, -.5), V2.P(a, by, -.5)];
      ctx.fillStyle = '#2B83B5';
      for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; poly(ctx, [top[i], top[j], bot2[j], bot2[i]]); ctx.fill(); }
      poly(ctx, top); ctx.fillStyle = '#4FB8E8'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const wx = ((i * 2.3) % (W + .6)) - .2, wy = ((i * 1.7 + t / 4000) % (D + .8)) - .4;
        if (wy < -.5 || wy > D + .5) continue;
        const p1 = V2.P(wx, wy, 0), p2 = V2.P(wx + .5, wy, 0);
        ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
      }
    }
    function buttonDeco(ctx, f, uw, vw, it) {
      if (f !== 0) return;
      const pressed = mask >> it.btn & 1;
      ctx.beginPath(); ctx.arc(50, 50, 34, 0, TAU); ctx.fillStyle = '#4A5862'; ctx.fill();
      ctx.beginPath(); ctx.arc(50, 50, 26, 0, TAU); ctx.fillStyle = pressed ? '#3CC46B' : '#F25A95'; ctx.fill();
      ctx.beginPath(); ctx.arc(43, 43, 9, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill();
    }
    function items(t) {
      const out = [];
      for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) {
        const v = hd[y][x], i = y * W + x;
        if (v <= .001) continue;
        const n = Math.ceil(v - 1e-6), sp = special.get(i), bi = btnAt.get(i);
        for (let z = 0; z < n; z++) {
          const it = { x, y, z, id: i, col: HEX.dirt };
          const topC = z === n - 1;
          if (sp && sp.kind === 'bridge') { it.col = HEX.wood; it.top = HEX.woodT; }
          else if (sp && sp.kind === 'block' && topC) { it.col = HEX.grape; it.top = HEX.lilac; }
          else if (topC) it.top = HEX.grass;
          if (topC && v < n - 1e-6) { it.off = [0, 0, v - n]; it.loose = true; }
          if (topC && bi != null) { it.deco = buttonDeco; it.btn = bi; }
          if (topC && sp && sp.kind === 'block' && !anims.length && h[y][x] === lv.h[y][x]) { it.sym = sp.up ? '▲' : '▼'; it.symCol = 'rgba(70,40,150,.75)'; }
          out.push(it);
        }
      }
      // goal star
      const gz = hd[lv.g[1]][lv.g[0]];
      out.push({ x: lv.g[0], y: lv.g[1], z: Math.ceil(gz), dd: .01, sprite: (ctx, V2) => {
        const bob = Math.sin(t / 350) * .08, p = V2.P(lv.g[0] + .5, lv.g[1] + .5, gz + .55 + bob), r = V2.s * .3;
        const sh = V2.P(lv.g[0] + .5, lv.g[1] + .5, gz);
        ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(sh[0], sh[1], r * .8, r * .8 * Math.sin(V2.pitch), 0, 0, TAU); ctx.fill();
        if (finished && bot.jump && t - bot.jump > 300) return;
        drawStar(ctx, p[0], p[1], r, Math.cos(t / 700)); ctx.fillStyle = '#FFC234'; ctx.fill();
        ctx.lineWidth = Math.max(2, V2.s * .05); ctx.strokeStyle = '#C28A00'; ctx.lineJoin = 'round'; ctx.stroke();
        V2.hits.push({ id: gi, x: p[0], y: p[1], r: r * .75 });
      } });
      // tap marker
      if (marker && t - marker.t0 < 700) {
        const m2 = marker, a = (t - m2.t0) / 700;
        out.push({ x: m2.x, y: m2.y, z: hd[m2.y][m2.x], dd: -.02, sprite: (ctx, V2) => {
          const p = V2.P(m2.x + .5, m2.y + .5, hd[m2.y][m2.x] + .02);
          ctx.strokeStyle = m2.ok ? `rgba(255,255,255,${1 - a})` : `rgba(242,90,149,${1 - a})`; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.ellipse(p[0], p[1], V2.s * (.2 + a * .25), V2.s * (.2 + a * .25) * Math.sin(V2.pitch), 0, 0, TAU); ctx.stroke();
        } });
      }
      out.push({ x: bot.rx, y: bot.ry, z: Math.max(0, bot.rz - .01), dd: .05, sprite: (ctx, V2) => drawBot(ctx, V2, bot, t) });
      return out;
    }
    function step(t) {
      // height animations
      for (let i = anims.length - 1; i >= 0; i--) {
        const a = anims[i], e = ease((t - a.t0) / 700);
        hd[a.y][a.x] = a.from + (a.to - a.from) * e;
        if (e >= 1) anims.splice(i, 1);
      }
      if (bot.path.length) {
        const [nx, ny] = bot.path[0], a = (t - bot.t0) / 300;
        const fz = hd[bot.y][bot.x], tz = hd[ny][nx];
        if (a >= 1) {
          bot.x = nx; bot.y = ny; bot.path.shift(); bot.t0 = t;
          bot.rx = nx; bot.ry = ny; bot.rz = bot.gz = tz;
          arrive(nx, ny);
        } else {
          const e = a;
          bot.rx = bot.x + (nx - bot.x) * e; bot.ry = bot.y + (ny - bot.y) * e;
          bot.gz = fz + (tz - fz) * e; bot.rz = bot.gz + Math.sin(Math.PI * e) * .3;
          const p1 = V.P(bot.x, bot.y, 0), p2 = V.P(nx, ny, 0); bot.look = Math.sign(p2[0] - p1[0]);
        }
      } else {
        bot.rx = bot.x; bot.ry = bot.y; bot.gz = hd[bot.y][bot.x];
        bot.rz = bot.gz + (bot.jump ? Math.abs(Math.sin((t - bot.jump) / 180)) * .45 * Math.max(0, 1 - (t - bot.jump) / 1400) : 0);
      }
    }
    function arrive(x, y) {
      tone(520 + hd[y][x] * 60, .07, 'triangle', .07);
      const i = y * W + x, bi = btnAt.get(i);
      if (bi != null && !(mask >> bi & 1)) {
        mask |= 1 << bi; bot.path = [];
        const t0 = now();
        lv.b[bi].fx.forEach(([fx, fy, v]) => anims.push({ x: fx, y: fy, from: hd[fy][fx], to: v, t0 }));
        h = rwHeights(lv, mask);
        sfx.good(); tone(330, .4, 'sine', .08, .15); toast('Click! Something moved');
        api.hint('Click! Something in the world moved. Can you reach the ★ now?');
      }
      if (x === lv.g[0] && y === lv.g[1] && !finished) {
        finished = true; bot.path = []; bot.jump = now();
        [659, 784, 1047].forEach((f, k) => tone(f, .2, 'triangle', .12, k * .1));
        api.hint('The robot got the star! Hooray!');
        api.later(() => api.done(starsFor(mistakes, 2, 5)), 1300);
      }
    }
    animate(V, (t, dt) => {
      layout();
      const dy = yawT - V.yaw; V.yaw = Math.abs(dy) < .002 ? yawT : V.yaw + dy * Math.min(1, dt * .012);
      step(t);
      V.draw(items(t), water);
    });
    function tapTile(id) {
      if (id == null || finished || bot.path.length || anims.length) return;
      const tx = id % W, ty = Math.floor(id / W);
      if (tx === bot.x && ty === bot.y) { tone(880, .1, 'sine', .08); return; }
      const path = rwPath(lv, h, mask, [bot.x, bot.y], [tx, ty]);
      if (!path) {
        mistakes++; sfx.soft(); bot.shake = now(); marker = { x: tx, y: ty, t0: now(), ok: false };
        toast('The robot can’t get there yet'); return;
      }
      marker = { x: tx, y: ty, t0: now(), ok: true };
      sfx.tap(); bot.path = path; bot.t0 = now();
    }
    V.onTap(tapTile);
    V.cv._dbg = { lv, bot, tap: tapTile, hit: (x, y) => V.hit(x, y), mistakes: () => mistakes, where: id => V.where(id), busy: () => bot.path.length > 0 || anims.length > 0, turn: () => rotB.click() };
  }

  R.cubeLab = { blBuild, blModel, blQueue, blReach, blTargets, blFire, slGen, slBlock, hmGen, hmProp, RW, rwLevel, rwCheck };

  register({ id: 'blaster', cat: 'cube', order: 1, name: 'Cube Blaster', icon: '💥', desc: 'Knock the cubes off the model, colour by colour', start: startBlaster });
  register({ id: 'slideout', cat: 'cube', order: 2, name: 'Slide Out', icon: '➡️', desc: 'Slide each cube out the way its arrow points', start: startSlide });
  register({ id: 'hidden', cat: 'cube', order: 3, name: 'Hidden Model', icon: '🗿', desc: 'Chip away cubes to find the model inside', start: startHidden });
  register({ id: 'robot', cat: 'cube', order: 4, name: 'Robot Walk', icon: '🤖', desc: 'Help the little robot reach the star', start: startRobot });
})();
