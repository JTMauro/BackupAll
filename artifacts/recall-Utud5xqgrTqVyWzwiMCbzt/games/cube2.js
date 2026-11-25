/* Recall: Cube Puzzles part 2 (cat 'cube', orders 5-9):
   Cube Twist, Copy Build, Count the Cubes, Shadow Match, Fold It.
   Plain canvas drawing: a small orthographic voxel renderer (adapted from cube.js) plus a quad renderer
   for the twisting cube and the folding nets. */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor } = R;
  const TAU = Math.PI * 2, Z3 = [0, 0, 0];
  const HEX = {
    coral: '#FF6B4A', sun: '#FFC234', leaf: '#3CC46B', sky: '#45AEFF', berry: '#F25A95', orange: '#FF9A3C',
    grape: '#A98BFF', peach: '#FFB892', card: '#FFF6E6', stone: '#E9DDC7', body: '#2A2F3A', grey: '#C9CED6', shadow: '#2B3A44'
  };
  // colour + symbol pairs (the first five match R.CUBES)
  const PAL = [
    { c: 'coral', s: '●' }, { c: 'sky', s: '★' }, { c: 'sun', s: '▲' }, { c: 'leaf', s: '■' },
    { c: 'berry', s: '♥' }, { c: 'grape', s: '◆' }, { c: 'orange', s: '✚' }, { c: 'peach', s: '✿' }
  ];
  const K = (x, y, z) => x + ',' + y + ',' + z;
  const unK = k => k.split(',').map(Number);
  const ease = t => t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3);
  const easeIO = t => t <= 0 ? 0 : t >= 1 ? 1 : t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const now = () => performance.now();
  const boxPts = (x0, y0, z0, x1, y1, z1) => [...Array(8)].map((_, i) => [i & 1 ? x1 : x0, i & 2 ? y1 : y0, i & 4 ? z1 : z0]);
  const rgbC = {};
  const rgbOf = h => rgbC[h] || (rgbC[h] = [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)));
  const shadeOf = (h, f, w, a) => 'rgba(' + rgbOf(h).map(v => Math.round(Math.min(255, v * f) * (1 - (w || 0)) + 255 * (w || 0))).join(',') + ',' + (a == null ? 1 : a) + ')';
  const mixHex = (a, b, t) => { const A = rgbOf(a), B = rgbOf(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join(''); };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const vkey = v => v.map(a => Math.round(a)).join(',');
  function rotV(v, ax, ang) {
    const c = Math.cos(ang), s = Math.sin(ang), d = dot(ax, v), x = cross(ax, v);
    return [0, 1, 2].map(i => v[i] * c + x[i] * s + ax[i] * d * (1 - c));
  }
  const rotI = (v, ax, d) => rotV(v, ax, d * Math.PI / 2).map(Math.round);
  const AX = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };

  R.css(`
.c2-cv{display:block;margin:0 auto;touch-action:manipulation;-webkit-tap-highlight-color:transparent;max-width:100%}
.c2-wrap{max-width:560px;margin:0 auto}
.c2-bar{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin:12px auto 0}
.c2-bar .btn{min-width:120px;font-size:1.2rem}
.c2-lab{text-align:center;font:600 1.25rem/1.2 var(--display);color:var(--on-table-soft);margin:0 0 4px}
.c2-glow{outline:5px solid #fff;outline-offset:3px;animation:c2pulse .8s ease-in-out infinite}
@keyframes c2pulse{50%{transform:scale(1.06)}}
.c2-nope{opacity:.35;pointer-events:none}
.c2-right{--c:var(--good-bg);--d:var(--leaf-d);outline:5px solid var(--leaf);outline-offset:2px}
/* twist */
.c2-tw-view{position:relative;max-width:460px;margin:0 auto}
.c2-tw-back{position:absolute;right:0;top:0;display:grid;justify-items:center;background:rgba(0,0,0,.18);border-radius:16px;padding:2px 4px 4px}
.c2-tw-back span{font:600 1rem var(--display);color:var(--on-table-soft)}
.c2-tw-pad{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px;max-width:440px;margin:8px auto 0}
.c2-mv{min-height:64px;padding:.2em .5em;gap:.3em;font-size:1.25rem;justify-content:space-between}
.c2-mv canvas{width:58px;height:50px;flex:none}
.c2-tw-bar{display:flex;gap:12px;max-width:440px;margin:12px auto 0}
.c2-tw-bar .btn{flex:1;font-size:1.25rem}
/* copy build */
.c2-cb-views{display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:560px;margin:0 auto}
.c2-cb-views>div{background:rgba(0,0,0,.16);border-radius:18px;padding:6px 4px 2px}
.c2-cb-pal{display:flex;justify-content:center;flex-wrap:wrap;gap:10px;margin:12px auto 10px}
.c2-pc{width:58px;height:58px;padding:0;font:700 1.8rem/1 var(--display);cursor:pointer;transition:transform .12s}
.c2-pc.on{transform:translateY(-6px);outline:5px solid #fff;outline-offset:3px}
.c2-cb-side .c2-off.on{--c:var(--sun);--d:var(--sun-d);outline:4px solid #fff;outline-offset:2px}
.c2-cb-low{display:flex;justify-content:center;align-items:flex-start;gap:14px}
.c2-cb-grid{display:grid;grid-template-columns:repeat(3,var(--cs));gap:8px;padding:8px;border-radius:18px;background:rgba(0,0,0,.2);box-shadow:inset 0 4px 10px rgba(0,0,0,.2)}
.c2-cell{position:relative;width:var(--cs);height:var(--cs);padding:0;cursor:pointer;font:700 1.9rem/1 var(--display);border-radius:16px;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.c2-cell.empty{background:rgba(255,255,255,.1);box-shadow:inset 0 0 0 3px rgba(255,255,255,.28);color:rgba(255,255,255,.55);font-size:1.6rem}
.c2-cell b{position:absolute;right:-8px;top:-9px;min-width:30px;height:30px;border-radius:15px;background:#fff;color:var(--ink);font:700 1.15rem/30px var(--display);box-shadow:0 2px 0 rgba(0,0,0,.25)}
.c2-cell.drop{animation:bounceIn .3s}
.c2-cb-side{display:grid;gap:9px;width:118px}
.c2-cb-side .btn{font-size:1.15rem;padding:.3em .4em;min-height:56px;line-height:1.05}
/* quiz-like games */
.c2-opts{display:grid;grid-template-columns:repeat(var(--n),1fr);gap:12px;max-width:520px;margin:12px auto 0}
.c2-num{min-height:72px;font:700 2.2rem var(--display);padding:0}
.c2-pics{display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:520px;margin:10px auto 0}
.c2-pic{padding:6px;min-height:0;border-radius:18px}
.c2-pic.c2-solo{grid-column:1 / -1;justify-self:center;width:calc(50% - 6px)}
.c2-sil{display:grid;gap:3px;padding:8px;border-radius:12px;background:#F4ECDD;box-shadow:inset 0 0 0 3px #E2D5BD;margin:0 auto}
.c2-sil i{display:block;width:var(--q);height:var(--q);border-radius:4px}
.c2-sil i.f{background:#2B3A44}
.c2-sil i.e{background:rgba(43,58,68,.06)}
`);

  /* ---------------- voxel renderer (adapted from cube.js) ---------------- */
  const FACES = [
    { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
    { n: [1, 0, 0], c: [[1, 0, 1], [1, 1, 1], [1, 1, 0], [1, 0, 0]] },
    { n: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
    { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
    { n: [0, -1, 0], c: [[0, 0, 1], [1, 0, 1], [1, 0, 0], [0, 0, 0]] }
  ];
  const LT = (() => { const v = [-.5, .42, .76], l = Math.hypot(...v); return v.map(a => a / l); })();
  function poly(ctx, p) { ctx.beginPath(); p.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); }
  function hull(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (p.length < 3) return p;
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  function makeView(o) {
    o = o || {};
    const cv = el('canvas', 'c2-cv'), ctx = cv.getContext('2d');
    const V = { cv, ctx, yaw: o.yaw == null ? Math.PI / 4 : o.yaw, pitch: o.pitch == null ? .62 : o.pitch, s: 30, ox: 0, oy: 0, c: [0, 0, 0], W: 300, H: 300, dpr: 1 };
    V.resize = (w, h) => {
      V.W = w; V.H = h; V.dpr = Math.min(3, window.devicePixelRatio || 1);
      cv.width = Math.round(w * V.dpr); cv.height = Math.round(h * V.dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px';
    };
    V.P = (x, y, z) => {
      const dx = x - V.c[0], dy = y - V.c[1], dz = z - V.c[2], co = Math.cos(V.yaw), si = Math.sin(V.yaw);
      const X = dx * co - dy * si, Y = dx * si + dy * co, sp = Math.sin(V.pitch), cp = Math.cos(V.pitch);
      return [V.ox + X * V.s, V.oy + (Y * sp - dz * cp) * V.s, Y * cp + dz * sp];
    };
    V.P3 = p => V.P(p[0], p[1], p[2]);
    // fit points for several camera angles at once ([yaw, pitch] pairs)
    V.fit = (pts, f) => {
      f = f || {};
      const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
      pts.forEach(p => { for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); } });
      V.c = lo.map((v, i) => (v + hi[i]) / 2);
      const ky = V.yaw, kp = V.pitch; V.s = 1; V.ox = 0; V.oy = 0;
      let mx = 0, a = 1e9, b = -1e9;
      (f.cams || [[V.yaw, V.pitch]]).forEach(([yw, pt]) => { V.yaw = yw; V.pitch = pt; pts.forEach(p => { const q = V.P(p[0], p[1], p[2]); mx = Math.max(mx, Math.abs(q[0])); a = Math.min(a, q[1]); b = Math.max(b, q[1]); }); });
      V.yaw = ky; V.pitch = kp;
      const pad = f.pad == null ? 12 : f.pad;
      V.s = Math.min((V.W - 2 * pad) / (2 * mx || 1), (V.H - 2 * pad) / ((b - a) || 1), f.max || 1e9);
      V.ox = V.W / 2; V.oy = V.H / 2 - (a + b) / 2 * V.s;
      if (f.keepC) { V.oy = V.H / 2; }
    };
    const isLoose = it => it.loose || it.off || (it.sc != null && it.sc !== 1) || (it.a != null && it.a < 1);
    V.clear = () => { ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0); ctx.clearRect(0, 0, V.W, V.H); };
    V.draw = (items, under, over) => {
      V.clear();
      const co = Math.cos(V.yaw), si = Math.sin(V.yaw), sp = Math.sin(V.pitch), cp = Math.cos(V.pitch);
      if (under) under(ctx, V);
      const occ = new Set();
      for (const it of items) if (!isLoose(it)) occ.add(K(it.x, it.y, it.z));
      const dep = it => { const of = it.off || Z3, dx = it.x + .5 + of[0] - V.c[0], dy = it.y + .5 + of[1] - V.c[1], dz = it.z + .5 + of[2] - V.c[2]; return (dx * si + dy * co) * cp + dz * sp; };
      const list = items.map(it => [dep(it), it]).sort((a, b) => a[0] - b[0]);
      for (const [, it] of list) {
        const of = it.off || Z3, sc = it.sc == null ? 1 : it.sc, loose = isLoose(it);
        const bx = it.x + .5 + of[0], by = it.y + .5 + of[1], bz = it.z + .5 + of[2];
        ctx.globalAlpha = it.a == null ? 1 : Math.max(0, it.a);
        for (let f = 0; f < 5; f++) {
          const F = FACES[f], n = F.n;
          if (!loose && occ.has(K(it.x + n[0], it.y + n[1], it.z + n[2]))) continue;
          const NX = n[0] * co - n[1] * si, NY = n[0] * si + n[1] * co;
          if (NY * cp + n[2] * sp < .02) continue;
          const p = F.c.map(c => V.P(bx + (c[0] - .5) * sc, by + (c[1] - .5) * sc, bz + (c[2] - .5) * sc));
          const lit = Math.max(0, NX * LT[0] + NY * LT[1] + n[2] * LT[2]);
          const hc = it.col;
          poly(ctx, p);
          ctx.fillStyle = shadeOf(hc, .64 + .36 * lit, f === 0 ? .1 : 0); ctx.fill();
          ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(1, V.s * .04 * sc); ctx.strokeStyle = shadeOf(hc, .55, 0, .9); ctx.stroke();
          if (it.sym && (f === 0 || it.symAll)) {
            const cw = F.c;
            let p0 = p[0], e1 = [p[1][0] - p[0][0], p[1][1] - p[0][1]], e2 = [p[3][0] - p[0][0], p[3][1] - p[0][1]];
            if (f > 0 && e1[0] < 0) { p0 = p[1]; e1 = [-e1[0], -e1[1]]; e2 = [p[2][0] - p[1][0], p[2][1] - p[1][1]]; }
            void cw;
            ctx.save(); ctx.transform(e1[0] / 100, e1[1] / 100, e2[0] / 100, e2[1] / 100, p0[0], p0[1]);
            ctx.fillStyle = it.symCol || 'rgba(24,36,44,.5)'; ctx.font = '700 60px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(it.sym, 50, 54);
            ctx.restore();
          }
          if (it.glow) { poly(ctx, p); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,' + it.glow + ')'; ctx.stroke(); }
        }
        ctx.globalAlpha = 1;
      }
      if (over) over(ctx, V);
    };
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

  // world-space direction of the shadow (light is fixed to the camera, from upper left)
  function shadowDir(V) {
    const co = Math.cos(V.yaw), si = Math.sin(V.yaw), X = .5, Y = -.42;
    return [X * co + Y * si, -X * si + Y * co];
  }
  // soft cast shadows of solid columns on the floor (z = 0): one union path, one fill
  function columnShadows(ctx, V, cols, alpha) {
    const [sx, sy] = shadowDir(V), k = .55;
    ctx.beginPath();
    for (const [x, y, h] of cols) {
      if (h <= 0) continue;
      const ox = sx * h * k, oy = sy * h * k, pts = [];
      for (const [a, b] of [[0, 0], [1, 0], [1, 1], [0, 1]]) { pts.push(V.P(x + a, y + b, 0)); pts.push(V.P(x + a + ox, y + b + oy, 0)); }
      const hl = hull(pts);
      hl.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath();
    }
    ctx.fillStyle = 'rgba(10,30,36,' + (alpha || .32) + ')'; ctx.fill('nonzero');
  }
  // a chunky wooden-ish floor slab under a W x D area, with optional grid lines
  function floorSlab(ctx, V, x0, y0, x1, y1, lines) {
    const top = [V.P(x0, y0, 0), V.P(x1, y0, 0), V.P(x1, y1, 0), V.P(x0, y1, 0)];
    const bot = [V.P(x0, y0, -.35), V.P(x1, y0, -.35), V.P(x1, y1, -.35), V.P(x0, y1, -.35)];
    // ground shadow
    const g = [V.P(x0 - .2, y0 - .2, -.4), V.P(x1 + .2, y0 - .2, -.4), V.P(x1 + .2, y1 + .2, -.4), V.P(x0 - .2, y1 + .2, -.4)];
    poly(ctx, g); ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fill();
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4; poly(ctx, [top[i], top[j], bot[j], bot[i]]);
      ctx.fillStyle = '#B49A70'; ctx.fill();
    }
    poly(ctx, top); ctx.fillStyle = '#FFF3DD'; ctx.fill();
    if (lines) {
      ctx.strokeStyle = 'rgba(180,154,112,.55)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = x0 + 1; x < x1; x++) { const a = V.P(x, y0, 0), b = V.P(x, y1, 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
      for (let y = y0 + 1; y < y1; y++) { const a = V.P(x0, y, 0), b = V.P(x1, y, 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
      ctx.stroke();
    }
    poly(ctx, top); ctx.lineWidth = 3; ctx.strokeStyle = '#DCCCAF'; ctx.stroke();
  }
  // a soft round shadow on the floor
  function blobShadow(ctx, V, c, r, a) {
    const p = V.P(c[0], c[1], c[2]);
    const ry = Math.max(.15, Math.abs(Math.sin(V.pitch)));
    ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(1, ry);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * V.s);
    g.addColorStop(0, 'rgba(0,20,26,' + (a || .42) + ')'); g.addColorStop(.6, 'rgba(0,20,26,' + (a || .42) * .6 + ')'); g.addColorStop(1, 'rgba(0,20,26,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * V.s, 0, TAU); ctx.fill(); ctx.restore();
  }

  /* ---------------- quad renderer (twisting cube, folding nets) ----------------
     quad: { pts: [p0, p1, p2, p3] (p1 = p0 + u, p3 = p0 + v, u x v = outward normal), col, sym, one (cull back), back, inset, grp } */
  function drawQuads(V, quads, order) {
    const ctx = V.ctx, co = Math.cos(V.yaw), si = Math.sin(V.yaw);
    const list = [];
    for (const q of quads) {
      const p = q.pts.map(V.P3);
      const area = (p[1][0] - p[0][0]) * (p[3][1] - p[0][1]) - (p[1][1] - p[0][1]) * (p[3][0] - p[0][0]);
      const front = area > 0;
      if (!front && q.one) continue;
      const d = (p[0][2] + p[1][2] + p[2][2] + p[3][2]) / 4;
      list.push({ q, p, front, d, g: order ? order(q) : 0 });
    }
    list.sort((a, b) => a.g - b.g || a.d - b.d);
    for (const { q, p, front } of list) {
      const n = cross(sub(q.pts[1], q.pts[0]), sub(q.pts[3], q.pts[0])), l = Math.hypot(...n) || 1;
      const s = front ? 1 : -1, nx = n[0] / l * s, ny = n[1] / l * s, nz = n[2] / l * s;
      const NX = nx * co - ny * si, NY = nx * si + ny * co;
      const lit = clamp(NX * LT[0] + NY * LT[1] + nz * LT[2], 0, 1);
      ctx.lineJoin = 'round';
      if (q.inset) {
        poly(ctx, p); ctx.fillStyle = q.base || HEX.body; ctx.fill(); ctx.lineWidth = Math.max(1, V.s * .03); ctx.strokeStyle = q.base || HEX.body; ctx.stroke();
        if (!front) continue;
        const cx = (p[0][0] + p[2][0]) / 2, cy = (p[0][1] + p[2][1]) / 2, f = q.inset;
        const pi = p.map(a => [cx + (a[0] - cx) * f, cy + (a[1] - cy) * f]);
        poly(ctx, pi); ctx.fillStyle = shadeOf(q.col, .7 + .36 * lit, .06); ctx.fill();
        ctx.lineWidth = Math.max(1, V.s * .05); ctx.strokeStyle = shadeOf(q.col, 1.1, .25, .8); ctx.stroke();
        if (q.glow) { ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,' + q.glow + ')'; ctx.stroke(); }
      } else {
        const col = front ? q.col : (q.back || HEX.stone);
        poly(ctx, p); ctx.fillStyle = shadeOf(col, .66 + .36 * lit, front ? .04 : 0); ctx.fill();
        ctx.lineWidth = Math.max(1.5, V.s * .045); ctx.strokeStyle = shadeOf(col, .55, 0, .95); ctx.stroke();
      }
      if (front && q.sym) {
        const e1 = [p[1][0] - p[0][0], p[1][1] - p[0][1]], e2 = [p[3][0] - p[0][0], p[3][1] - p[0][1]];
        ctx.save(); ctx.transform(e1[0] / 100, e1[1] / 100, e2[0] / 100, e2[1] / 100, p[0][0], p[0][1]);
        ctx.fillStyle = q.symCol || 'rgba(24,36,44,.62)'; ctx.font = '700 ' + (q.symSize || 60) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(q.sym, 50, 55); ctx.restore();
      }
    }
  }
  // a curved arrow around an axis (world space), drawn on top
  function arcArrow(ctx, V, ax, centre, r, a0, a1, o) {
    o = o || {};
    const e1 = Math.abs(ax[2]) > .5 ? [1, 0, 0] : [0, 0, 1], e2 = cross(ax, e1);
    const pt = a => V.P3(add(centre, add(mul(e1, r * Math.cos(a)), mul(e2, r * Math.sin(a)))));
    const pts = []; const N = 24;
    for (let i = 0; i <= N; i++) pts.push(pt(a0 + (a1 - a0) * i / N));
    const end = pts[N], prev = pts[N - 3], ang = Math.atan2(end[1] - prev[1], end[0] - prev[0]);
    const w = o.w || Math.max(5, V.s * .2), hs = w * 2.1;
    const tip = [end[0] + Math.cos(ang) * hs * .9, end[1] + Math.sin(ang) * hs * .9];
    const drawIt = (lw, col) => {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = col; ctx.lineWidth = lw;
      ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tip[0], tip[1]);
      ctx.lineTo(end[0] + Math.cos(ang + 2.2) * hs, end[1] + Math.sin(ang + 2.2) * hs);
      ctx.lineTo(end[0] + Math.cos(ang - 2.2) * hs, end[1] + Math.sin(ang - 2.2) * hs); ctx.closePath();
      ctx.fillStyle = col; ctx.fill(); ctx.stroke();
    };
    ctx.globalAlpha = o.a == null ? 1 : o.a;
    drawIt(w + 6, o.edge || 'rgba(24,36,44,.9)');
    drawIt(w, o.col || '#FFFFFF');
    ctx.globalAlpha = 1;
    return pts;
  }
  // the angle on a circle around ax (through centre) that faces the camera most
  function frontAngle(V, ax, centre, r) {
    const e1 = Math.abs(ax[2]) > .5 ? [1, 0, 0] : [0, 0, 1], e2 = cross(ax, e1);
    let best = 0, bd = -1e9;
    for (let i = 0; i < 72; i++) {
      const a = i / 72 * TAU, d = V.P3(add(centre, add(mul(e1, r * Math.cos(a)), mul(e2, r * Math.sin(a)))))[2];
      if (d > bd) { bd = d; best = a; }
    }
    return best;
  }

  /* =========================================================
     5. CUBE TWIST (2 x 2 colour cube)
     ========================================================= */
  const TW_C = [0, 1, 2, 3, 4, 5]; // PAL index per starting face
  const DIRS6 = [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]];
  const TW_MOVES = {
    U: { ax: AX.z, sel: p => p[2] > 0, name: 'Top', arc: { c: [0, 0, .5], r: 1.55 } },
    R: { ax: AX.x, sel: p => p[0] > 0, name: 'Right', arc: { c: [.5, 0, 0], r: 1.55 } },
    S: { ax: AX.z, sel: () => true, name: 'Turn', arc: { c: [0, 0, -.35], r: 1.75 } }
  };
  function twNew() {
    const st = [];
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
      const p = [x, y, z];
      DIRS6.forEach((n, i) => { if (dot(n, p) > 0) st.push({ p: p.slice(), n: n.slice(), c: TW_C[i] }); });
    }
    return st;
  }
  function twApply(st, t, d) {
    const M = TW_MOVES[t];
    for (const s of st) if (M.sel(s.p)) { s.p = rotI(s.p, M.ax, d); s.n = rotI(s.n, M.ax, d); }
  }
  function twSolved(st) {
    const g = {};
    for (const s of st) { const k = vkey(s.n); if (g[k] == null) g[k] = s.c; else if (g[k] !== s.c) return false; }
    return true;
  }
  // the shortest-ish way back: invert the move history, merge turns that combine, drop final whole-cube turns
  function twPlan(hist) {
    const seq = hist.slice().reverse().map(e => ({ t: e.t, d: -e.d }));
    const runs = [];
    for (const m of seq) {
      let last = runs[runs.length - 1];
      if (m.t === 'R') { if (!last || last.type !== 'R') runs.push(last = { type: 'R', r: 0 }); last.r += m.d; }
      else { if (!last || last.type !== 'US') runs.push(last = { type: 'US', u: 0, s: 0 }); if (m.t === 'U') last.u += m.d; else last.s += m.d; }
    }
    const m4 = v => ((v % 4) + 4) % 4;
    const empty = r => r.type === 'R' ? m4(r.r) === 0 : m4(r.u) === 0 && m4(r.s) === 0;
    for (let guard = 0; guard < 200; guard++) {
      if (runs.length && runs[runs.length - 1].type === 'US') runs[runs.length - 1].s = 0;
      const i = runs.findIndex(empty);
      if (i < 0) break;
      runs.splice(i, 1);
      if (i > 0 && i < runs.length && runs[i - 1].type === runs[i].type) {
        const a = runs[i - 1], b = runs[i];
        if (a.type === 'R') a.r += b.r; else { a.u += b.u; a.s += b.s; }
        runs.splice(i, 1);
      }
    }
    const out = [], ex = (t, v) => { v = m4(v); if (v === 1) out.push({ t, d: 1 }); else if (v === 2) out.push({ t, d: 1 }, { t, d: 1 }); else if (v === 3) out.push({ t, d: -1 }); };
    for (const r of runs) { if (r.type === 'R') ex('R', r.r); else { ex('U', r.u); ex('S', r.s); } }
    return out;
  }
  function twQuads(st, anim, hl) {
    const out = [];
    const M = anim && TW_MOVES[anim.m], ang = anim ? anim.d * Math.PI / 2 * anim.a : 0;
    for (const s of st) {
      const mv = !!(M && M.sel(s.p)), n = s.n;
      const u = Math.abs(n[0]) === 1 ? [0, 1, 0] : [1, 0, 0], v = cross(n, u);
      const c0 = add(mul(s.p, .5), mul(n, .5));
      let pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => add(c0, add(mul(u, a * .5), mul(v, b * .5))));
      if (mv) pts = pts.map(q => rotV(q, M.ax, ang));
      const lit = hl ? hl.sel(s.p) : false;
      out.push({ pts, one: true, inset: .8, col: hl ? (lit ? HEX.sun : HEX.grey) : HEX[PAL[s.c].c], sym: hl ? null : PAL[s.c].s, grp: mv ? 1 : 0, symSize: 66 });
    }
    if (M && anim.m !== 'S') {
      // the two dark faces where the layers part
      const a = M.ax, u = Math.abs(a[0]) === 1 ? [0, 1, 0] : [1, 0, 0], v = cross(a, u);
      const sq = (nrm, uu, vv) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => add(mul(uu, x), mul(vv, y)));
      out.push({ pts: sq(a, u, v), one: true, col: HEX.body, back: HEX.body, grp: 0 });
      const mp = sq(mul(a, -1), v, u).map(q => rotV(q, a, ang));
      out.push({ pts: mp, one: true, col: HEX.body, back: HEX.body, grp: 1 });
    }
    return out;
  }
  function twDraw(V, st, anim, o) {
    o = o || {};
    V.clear();
    if (!o.noShadow) blobShadow(V.ctx, V, [0, 0, -1.25], 1.75, .45);
    const M = anim && TW_MOVES[anim.m];
    let order = null;
    if (M && anim.m !== 'S') {
      const near = V.P3(M.ax)[2] > V.P3(mul(M.ax, -1))[2];
      order = q => near ? q.grp : 1 - q.grp;
    }
    drawQuads(V, twQuads(st, anim, o.hl), order);
    if (o.arrow) {
      const A = TW_MOVES[o.arrow.t], a0 = frontAngle(V, A.ax, A.arc.c, A.arc.r), span = o.span || 1.7;
      arcArrow(V.ctx, V, A.ax, A.arc.c, A.arc.r, a0 - o.arrow.d * span / 2, a0 + o.arrow.d * span / 2, { a: o.arrowA, w: o.w });
    }
  }
  function twArrowChar(V, t, d) {
    const A = TW_MOVES[t], a0 = frontAngle(V, A.ax, A.arc.c, A.arc.r);
    const e1 = Math.abs(A.ax[2]) > .5 ? [1, 0, 0] : [0, 0, 1], e2 = cross(A.ax, e1);
    const pt = a => V.P3(add(A.arc.c, add(mul(e1, A.arc.r * Math.cos(a)), mul(e2, A.arc.r * Math.sin(a)))));
    const p = pt(a0 - .1 * d), q = pt(a0 + .1 * d), dx = q[0] - p[0], dy = q[1] - p[1];
    return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? '◀' : '▶') : (dy < 0 ? '▲' : '▼');
  }
  const TW_YAW = .72, TW_PITCH = .56;
  function startTwist(L, api) {
    const k = Math.min(8, 1 + Math.floor((L - 1) / 2));
    let st, hist;
    do {
      st = twNew(); hist = [];
      let last = null;
      for (let i = 0; i < k; i++) {
        if (k >= 2 && i > 0 && Math.random() < .5) { const d = pick([1, -1]); twApply(st, 'S', d); hist.push({ t: 'S', d, s: 1 }); }
        let t; do { t = pick(['U', 'R']); } while (t === last);
        const d = pick([1, -1]); twApply(st, t, d); hist.push({ t, d, s: 1 }); last = t;
      }
    } while (twSolved(st) || twPlan(hist).filter(m => m.t !== 'S').length < Math.min(k, 2));
    let anim = null, finished = false, hints = 0, turns = 0, won = 0;
    const HINT = 'Turn the cube until every side is one colour. The arrows show which way each button turns.';
    api.hint(HINT);
    const wrap = el('div', 'c2-wrap');
    const view = el('div', 'c2-tw-view');
    const V = makeView({ yaw: TW_YAW, pitch: TW_PITCH });
    const VB = makeView({ yaw: TW_YAW + Math.PI, pitch: -.5 });
    const back = el('div', 'c2-tw-back'); back.append(VB.cv, el('span', '', 'Other side'));
    view.append(V.cv, back);
    const pad = el('div', 'c2-tw-pad'), bar = el('div', 'c2-tw-bar');
    const undoB = el('button', 'btn c-card', '↩ Undo'), hintB = el('button', 'btn c-sun', '💡 Hint');
    undoB.type = hintB.type = 'button'; bar.append(undoB, hintB);
    wrap.append(view, pad, bar); api.stage.append(wrap);
    const btns = [];
    let lastW = 0;
    function layout() {
      const w = Math.min(stageW(api, 460), 460); if (w === lastW) return; lastW = w;
      const h = Math.round(clamp(w * .66, 210, 290));
      V.resize(w, h);
      V.fit(boxPts(-1.75, -1.75, -1.3, 1.75, 1.75, 1.2), { pad: 6 });
      const bw = Math.round(clamp(w * .27, 84, 112));
      VB.resize(bw, bw);
      VB.fit(boxPts(-1.1, -1.1, -1.1, 1.1, 1.1, 1.1), { pad: 4 });
      VB.cv.style.width = bw + 'px'; V.cv.style.width = w + 'px';
    }
    layout();
    // move buttons, each with a little picture of what turns
    for (const t of ['U', 'R', 'S']) {
      const ds = '◀▲'.includes(twArrowChar(V, t, 1)) ? [1, -1] : [-1, 1];
      ds.forEach((d, i) => {
        const ch = twArrowChar(V, t, d), b = el('button', 'btn c-card c2-mv');
        b.type = 'button';
        const IV = makeView({ yaw: TW_YAW, pitch: TW_PITCH }); IV.resize(58, 50);
        IV.fit(boxPts(-1.8, -1.8, -1.2, 1.8, 1.8, 1.2), { pad: 1 });
        twDraw(IV, twNew(), null, { hl: TW_MOVES[t], arrow: { t, d }, w: 3.5, span: 1.9 });
        const label = el('span', '', i === 0 ? ch + ' ' + TW_MOVES[t].name : TW_MOVES[t].name + ' ' + ch);
        if (i === 0) b.append(IV.cv, label); else b.append(label, IV.cv);
        b.setAttribute('aria-label', (t === 'S' ? 'Turn the whole cube ' : 'Turn the ' + TW_MOVES[t].name.toLowerCase() + ' ') + ({ '◀': 'left', '▶': 'right', '▲': 'up', '▼': 'down' }[ch]));
        b.onclick = () => press(t, d, 'play');
        btns.push({ t, d, b });
        pad.append(b);
      });
    }
    function glowBtn(t, d) {
      btns.forEach(x => x.b.classList.toggle('c2-glow', x.t === t && x.d === d));
      api.later(() => btns.forEach(x => x.b.classList.remove('c2-glow')), 900);
    }
    function press(t, d, kind) {
      if (finished || anim) return;
      anim = { m: t, d, a: 0, t0: now(), dur: t === 'S' ? 460 : 340, kind };
      tone(t === 'S' ? 330 : 440 + (d > 0 ? 0 : 60), .14, 'triangle', .1);
      if (kind === 'play') sfx.tap();
    }
    function settle() {
      const { m: t, d, kind } = anim;
      twApply(st, t, d); anim = null;
      if (kind === 'play') { hist.push({ t, d, s: 0 }); if (t !== 'S') turns++; }
      else if (kind === 'hint') {
        const e = hist[hist.length - 1];
        if (e && e.t === t && e.d === -d) hist.pop(); else hist.push({ t, d, s: 0 });
      }
      if (t !== 'S' && twSolved(st)) win();
      else if (kind !== 'hint') api.hint(HINT);
    }
    function win() {
      finished = true; won = now(); sfx.good();
      [523, 659, 784, 1047].forEach((f, i) => tone(f, .18, 'sine', .12, i * .1));
      api.hint('Every side is one colour. Lovely work!');
      toast(cheer());
      const extra = Math.max(0, turns - 2 * k);
      api.later(() => api.done(starsFor(hints * 2 + Math.floor(extra / 2), 1, 4)), 1500);
    }
    undoB.onclick = () => {
      if (finished || anim) return;
      const e = hist[hist.length - 1];
      if (!e || e.s) { sfx.soft(); wob(undoB); api.hint('Nothing to undo yet. Try a turn, or tap Hint.'); return; }
      hist.pop(); if (e.t !== 'S') turns = Math.max(0, turns - 1);
      press(e.t, -e.d, 'undo');
    };
    hintB.onclick = () => {
      if (finished || anim) return;
      const plan = twPlan(hist);
      if (!plan.length) return;
      const m = plan[0]; hints++;
      glowBtn(m.t, m.d);
      api.hint(m.t === 'S' ? 'Watch: the whole cube turns round. ' + plan.filter(x => x.t !== 'S').length + ' turns to go.'
        : 'Watch the glowing button. ' + plan.filter(x => x.t !== 'S').length + (plan.filter(x => x.t !== 'S').length === 1 ? ' turn' : ' turns') + ' to go.');
      press(m.t, m.d, 'hint');
    };
    animate(V, () => {
      layout();
      let a = null;
      if (anim) {
        anim.a = easeIO((now() - anim.t0) / anim.dur);
        a = anim;
      }
      if (won) V.yaw = TW_YAW + easeIO((now() - won) / 1400) * TAU;
      twDraw(V, st, a, a ? { arrow: { t: a.m, d: a.d }, arrowA: .85 * (1 - a.a * .6) } : null);
      twDraw(VB, st, a, { noShadow: true });
      if (anim && anim.a >= 1) settle();
    });
    V.cv._dbg = { st: () => st, hist, plan: () => twPlan(hist), busy: () => !!anim, finished: () => finished, hint: () => hintB.click(), k };
  }

  /* =========================================================
     6. COPY BUILD
     ========================================================= */
  function cbGen(L) {
    const n = Math.min(10, Math.round(3 + (L - 1) * .7));
    const nc = L <= 1 ? 1 : L <= 4 ? 2 : L <= 9 ? 3 : 4;
    const maxH = L <= 2 ? 2 : 3;
    const cols = shuffle([0, 1, 2, 3, 4]).slice(0, nc);
    const T = new Map();
    const k2 = (x, y) => x + ',' + y;
    for (let guard = 0; guard < 50; guard++) {
      T.clear();
      T.set(k2(1, 1), [pick(cols)]);
      let cnt = 1;
      while (cnt < n) {
        const opts = [];
        for (const [kk, c] of T) {
          const [x, y] = kk.split(',').map(Number);
          if (c.length < maxH) opts.push({ x, y, w: 2 });
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < 3 && ny < 3 && !T.has(k2(nx, ny))) opts.push({ x: nx, y: ny, w: 3 });
          }
        }
        if (!opts.length) break;
        const tot = opts.reduce((a, o) => a + o.w, 0); let r = Math.random() * tot, o = opts[0];
        for (const q of opts) { r -= q.w; if (r <= 0) { o = q; break; } }
        const kk = k2(o.x, o.y); if (!T.has(kk)) T.set(kk, []);
        T.get(kk).push(pick(cols)); cnt++;
      }
      if (cnt < n) continue;
      const used = new Set([...T.values()].flat());
      if (used.size < nc) {
        // make sure every palette colour is used once
        const flat = [...T.values()]; const miss = cols.filter(c => !used.has(c));
        for (const c of miss) { const col = pick(flat); col[randInt(col.length)] = c; }
        if (new Set([...T.values()].flat()).size < nc) continue;
      }
      if (L >= 2 && T.size < 2) continue;
      break;
    }
    return { T, cols, n, maxH };
  }
  function startCopyBuild(L, api) {
    const { T, cols, n } = cbGen(L);
    const B = new Map(); // 'x,y' -> colours bottom to top
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) { B.set(x + ',' + y, []); if (!T.has(x + ',' + y)) T.set(x + ',' + y, []); }
    let sel = cols[0], rm = false, rot = 0, mistakes = 0, hints = 0, finished = false, won = 0, hiCell = null;
    const YAW0 = .42, PITCH = .72;
    const drops = [];
    const HINT = cols.length > 1 ? 'Build a copy of the model. Tap a colour, then tap a square to put a cube there. Press and hold a square to take a cube off.'
      : 'Build a copy of the model. Tap a square to put a cube there. Press and hold a square to take a cube off.';
    api.hint(HINT);
    const wrap = el('div', 'c2-wrap');
    const views = el('div', 'c2-cb-views');
    const VT = makeView({ yaw: YAW0, pitch: PITCH }), VB = makeView({ yaw: YAW0, pitch: PITCH });
    const bT = el('div'), bB = el('div');
    bT.append(el('p', 'c2-lab', 'Copy this'), VT.cv); bB.append(el('p', 'c2-lab', 'Your build'), VB.cv);
    views.append(bT, bB);
    const pal = el('div', 'c2-cb-pal');
    const low = el('div', 'c2-cb-low'), grid = el('div', 'c2-cb-grid'), side = el('div', 'c2-cb-side');
    const offB = el('button', 'btn c-card c2-off', '✋ Take off'); offB.type = 'button';
    const tl = el('button', 'btn c-sky', '↶ Turn'), tr = el('button', 'btn c-sky', 'Turn ↷'), hb = el('button', 'btn c-sun', '💡 Hint');
    tl.type = tr.type = hb.type = 'button';
    side.append(tl, tr, offB, hb); low.append(grid, side);
    wrap.append(views, pal, low); api.stage.append(wrap);
    function renderPal() {
      pal.innerHTML = '';
      cols.forEach(c => {
        const b = el('button', 'tile c2-pc c-' + PAL[c].c + (!rm && sel === c ? ' on' : ''), PAL[c].s); b.type = 'button';
        b.setAttribute('aria-label', PAL[c].c + ' cubes');
        b.onclick = () => { if (finished) return; sel = c; rm = false; sfx.tap(); renderPal(); };
        pal.append(b);
      });
      offB.classList.toggle('on', rm);
      offB.onclick = () => { if (finished) return; rm = !rm; sfx.tap(); renderPal(); api.hint(rm ? 'Take off mode: tap a square to lift its top cube off. Tap a colour to build again.' : HINT); };
    }
    // display position -> world cell, following the view angle
    function cellAt(dc, dr) {
      const a = rot * Math.PI / 2, co = Math.round(Math.cos(a)), si = Math.round(Math.sin(a));
      for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
        const u = x - 1, v = y - 1, X = u * co - v * si, Y = u * si + v * co;
        if (X + 1 === dc && Y + 1 === dr) return x + ',' + y;
      }
      return null;
    }
    function renderGrid(dropK) {
      const cs = clamp(Math.floor((stageW(api, 560) - 118 - 14 - 16 - 16) / 3), 56, 84);
      grid.style.setProperty('--cs', cs + 'px');
      grid.innerHTML = '';
      for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
        const kk = cellAt(dc, dr), c = B.get(kk), h = c.length;
        const b = el('button', 'tile c2-cell ' + (h ? 'c-' + PAL[c[h - 1]].c : 'empty') + (kk === dropK ? ' drop' : '') + (kk === hiCell ? ' c2-glow' : ''), h ? PAL[c[h - 1]].s : '+');
        if (h > 1) b.append(el('b', '', String(h)));
        b.type = 'button'; b.dataset.k = kk;
        b.setAttribute('aria-label', h ? h + (h > 1 ? ' cubes' : ' cube') + ', top is ' + PAL[c[h - 1]].c : 'Empty square');
        let lp = null, longDone = false;
        b.addEventListener('pointerdown', () => { longDone = false; lp = api.later(() => { longDone = true; takeOff(kk, b); }, 550); });
        const cancel = () => { if (lp) clearTimeout(lp); lp = null; };
        b.addEventListener('pointerup', cancel); b.addEventListener('pointerleave', cancel); b.addEventListener('pointercancel', cancel);
        b.addEventListener('contextmenu', e => e.preventDefault());
        b.onclick = () => { cancel(); if (longDone) { longDone = false; return; } if (rm) takeOff(kk, b); else put(kk, b); };
        grid.append(b);
      }
    }
    const prefixOK = kk => { const b = B.get(kk), t = T.get(kk); return b.length <= t.length && b.every((c, i) => c === t[i]); };
    const isDone = () => [...B.keys()].every(kk => { const b = B.get(kk), t = T.get(kk); return b.length === t.length && prefixOK(kk); });
    const count = () => [...B.values()].reduce((a, c) => a + c.length, 0);
    function put(kk, b) {
      if (finished) return;
      const c = B.get(kk);
      if (c.length >= 4) { sfx.soft(); wob(b); api.hint('That tower is tall enough. Press and hold to take a cube off.'); return; }
      c.push(sel); hiCell = null;
      const [x, y] = kk.split(',').map(Number);
      drops.push({ x, y, z: c.length - 1, t0: now() });
      tone(392 + c.length * 70, .1, 'triangle', .11);
      if (!prefixOK(kk)) mistakes++;
      renderGrid(kk); after();
    }
    function takeOff(kk, b) {
      if (finished) return;
      const c = B.get(kk);
      if (!c.length) { wob(b); return; }
      c.pop(); hiCell = null; tone(300, .12, 'sine', .1);
      renderGrid(); after();
    }
    function after() {
      if (isDone()) {
        finished = true; won = now(); sfx.good(); toast(cheer());
        [523, 659, 784].forEach((f, i) => tone(f, .16, 'sine', .12, .1 + i * .1));
        api.hint('A perfect copy! Well built.');
        api.later(() => api.done(starsFor(mistakes + hints, 1, 3)), 1600);
        return;
      }
      if (!rm) api.hint(HINT + '  (' + count() + ' of ' + n + ' cubes)');
    }
    function doHint() {
      if (finished) return;
      hints++;
      // anything wrong to take off?
      for (const kk of B.keys()) if (!prefixOK(kk)) {
        hiCell = kk; rm = true; renderPal(); renderGrid();
        api.hint('The glowing square has a cube that does not match. Tap it to take the top cube off.');
        return;
      }
      for (const kk of B.keys()) {
        const b = B.get(kk), t = T.get(kk);
        if (b.length < t.length) {
          // build from the bottom up: prefer squares that need the lowest cube
          let best = kk, bh = b.length;
          for (const k2 of B.keys()) { const b2 = B.get(k2), t2 = T.get(k2); if (b2.length < t2.length && b2.length < bh) { best = k2; bh = b2.length; } }
          const c = T.get(best)[B.get(best).length];
          sel = c; rm = false; hiCell = best; renderPal(); renderGrid();
          api.hint('Put a ' + PAL[c].s + ' ' + PAL[c].c + ' cube on the glowing square.');
          return;
        }
      }
    }
    hb.onclick = () => { sfx.tap(); doHint(); };
    const turn = d => { if (finished) return; sfx.tap(); rot = (rot + d + 4) % 4; renderGrid(); };
    tl.onclick = () => turn(-1); tr.onclick = () => turn(1);
    // yaw for rotation r: rotating the view by -r*90deg keeps the grid mapping (X = u cos - v sin with a = r*90)
    let yaw = YAW0, lastW = 0;
    function layout() {
      const w = stageW(api, 560); if (w === lastW) return; lastW = w;
      const cw = Math.floor((Math.min(w, 560) - 10) / 2) - 8, ch = Math.round(clamp(cw * .8, 120, 200));
      const cams = [0, 1, 2, 3].map(i => [YAW0 + i * Math.PI / 2, PITCH]).concat([[YAW0 + Math.PI / 4, PITCH]]);
      for (const V of [VT, VB]) { V.resize(cw, ch); V.fit(boxPts(0, 0, -.35, 3, 3, 3), { cams, pad: 2 }); }
      renderGrid();
    }
    const items = (M, t, withDrops) => {
      const out = [];
      for (const [kk, c] of M) {
        const [x, y] = kk.split(',').map(Number);
        c.forEach((ci, z) => {
          const it = { x, y, z, col: HEX[PAL[ci].c], sym: PAL[ci].s, symAll: true };
          if (withDrops) {
            const d = drops.find(q => q.x === x && q.y === y && q.z === z);
            if (d) { const a = (t - d.t0) / 260; if (a < 1) it.off = [0, 0, (1 - ease(a)) * 1.6]; }
          }
          out.push(it);
        });
      }
      return out;
    };
    const under = M => (ctx, V) => {
      floorSlab(ctx, V, 0, 0, 3, 3, true);
      columnShadows(ctx, V, [...M].map(([kk, c]) => { const [x, y] = kk.split(',').map(Number); return [x, y, c.length]; }));
    };
    animate(VT, t => {
      layout();
      for (let i = drops.length - 1; i >= 0; i--) if (t - drops[i].t0 > 400) drops.splice(i, 1);
      // match the turn: grid mapping uses angle a = rot*90; the view must turn the other way
      const target = YAW0 + rot * Math.PI / 2;
      let dy = target - yaw; dy = ((dy + Math.PI) % TAU + TAU) % TAU - Math.PI;
      yaw += dy * Math.min(1, .16);
      const yv = won ? yaw + easeIO((t - won) / 1500) * TAU : yaw;
      VT.yaw = VB.yaw = yv;
      VT.draw(items(T, t), under(T));
      VB.draw(items(B, t, true), under(B));
    });
    renderPal(); layout(); renderGrid();
    VT.cv._dbg = { T, B, cellAt, sel: c => { sel = c; rm = false; renderPal(); }, finished: () => finished, rot: () => rot };
  }

  /* =========================================================
     7. COUNT THE CUBES
     ========================================================= */
  function ccGen(L) {
    let W, D, maxH, fill, lo, hi;
    if (L <= 1) { W = 2 + randInt(2); D = 1; maxH = 1; fill = 1; lo = 2; hi = 3; }
    else if (L === 2) { W = 2 + randInt(2); D = 1; maxH = 2; fill = 1; lo = 3; hi = 5; }
    else if (L === 3) { W = 2; D = 2; maxH = 2; fill = 1; lo = 4; hi = 6; }
    else if (L <= 5) { W = 3; D = 2; maxH = 2; fill = .85; lo = 5; hi = 9; }
    else if (L <= 8) { W = 3; D = 3; maxH = 3; fill = .8; lo = 7; hi = 13; }
    else { W = 3 + randInt(2); D = 3; maxH = 3 + (L >= 12 ? randInt(2) : 0); fill = .75; lo = 9; hi = 18; }
    for (let g = 0; g < 400; g++) {
      const h = [];
      for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) h.push(Math.random() < fill ? 1 + randInt(maxH) : 0);
      if (L === 2 && !h.some(v => v >= 2)) continue;
      const tot = h.reduce((a, b) => a + b, 0);
      if (tot < lo || tot > hi) continue;
      // keep it in one piece: every column touches another (or it is a single row)
      const at = (x, y) => x >= 0 && y >= 0 && x < W && y < D ? h[y * W + x] : 0;
      let ok = true;
      for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) if (at(x, y) && !(at(x + 1, y) || at(x - 1, y) || at(x, y + 1) || at(x, y - 1))) ok = false;
      if (!ok) continue;
      if (L >= 6 && !h.some(v => v >= 2)) continue;
      return { W, D, h, tot };
    }
    return { W: 2, D: 1, h: [1, 1], tot: 2 };
  }
  function startCount(L, api) {
    const total = 5, nOpt = L <= 2 ? 3 : 4;
    let round = 0, mistakes = 0;
    const wrap = el('div', 'c2-wrap');
    const V = makeView({ yaw: .5, pitch: .6 });
    const opts = el('div', 'c2-opts'), bar = el('div', 'c2-bar');
    const turnB = el('button', 'btn c-sky', '↻ Turn it round'); turnB.type = 'button'; bar.append(turnB);
    wrap.append(V.cv, opts, bar); api.stage.append(wrap);
    let P = null, cubes = [], yawT = .5, reveal = 0, busy = false, lastW = 0, colours = [];
    turnB.onclick = () => { if (busy) return; sfx.tap(); yawT += Math.PI / 2; };
    function layout(force) {
      const w = stageW(api, 520); if (w === lastW && !force) return; lastW = w;
      V.resize(w, Math.round(clamp(w * .78, 240, 330)));
      const H = Math.max(...P.h), ex = (n, m) => (n / 2 - .5) * m;
      V.fit(boxPts(-.4 - ex(P.W, .6), -.4 - ex(P.D, .6), -.4, P.W + .4 + ex(P.W, .6), P.D + .4 + ex(P.D, .6), H + (H - 1) * .6 + .2), { cams: [0, 1, 2, 3, 4, 5, 6, 7].map(i => [.5 + i * Math.PI / 4, .6]), pad: 8 });
    }
    function newRound() {
      api.rounds(total, round);
      P = ccGen(L); cubes = []; busy = false; reveal = 0;
      for (let y = 0; y < P.D; y++) for (let x = 0; x < P.W; x++) for (let z = 0; z < P.h[y * P.W + x]; z++) cubes.push({ x, y, z, c: randInt(5) });
      cubes.sort((a, b) => a.y - b.y || a.x - b.x || a.z - b.z);
      colours = cubes.map(c => c.c);
      layout(true);
      api.hint(L <= 2 ? 'How many cubes can you count? Tap the number.' : 'How many cubes are there? Some may be hidden at the back or underneath. Tap ↻ to turn it round.');
      const set = new Set([P.tot]);
      const offs = shuffle([-1, 1, 2, -2, 3]);
      for (const o of offs) { if (set.size >= nOpt) break; if (P.tot + o >= 1) set.add(P.tot + o); }
      opts.style.setProperty('--n', nOpt);
      opts.innerHTML = '';
      [...set].sort((a, b) => a - b).forEach(v => {
        const b = el('button', 'btn c-card c2-num', String(v)); b.type = 'button';
        b.onclick = () => choose(v, b);
        opts.append(b);
      });
    }
    function choose(v, b) {
      if (busy) return;
      if (v === P.tot) {
        busy = true; b.classList.add('c2-right'); sfx.good(); toast(cheer());
        reveal = now();
        cubes.forEach((c, i) => tone(330 * Math.pow(2, i / 12), .12, 'triangle', .1, .5 + i * .22));
        api.hint('Yes! There ' + (P.tot === 1 ? 'is 1 cube.' : 'are ' + P.tot + ' cubes.') + ' Watch them count.');
        round++;
        api.later(() => {
          if (round >= total) { api.rounds(total, round); api.done(starsFor(mistakes, 0, 2)); }
          else newRound();
        }, 1200 + cubes.length * 220 + 800);
      } else {
        mistakes++; b.classList.add('c2-nope'); sfx.soft(); wob(b);
        api.hint(v < P.tot ? 'There are more than that. Look for cubes hidden underneath or behind. Tap ↻ to turn it round.' : 'Not that many. Try counting again, one column at a time.');
      }
    }
    animate(V, t => {
      layout();
      V.yaw += (yawT - V.yaw) * .14;
      const showN = reveal ? Math.floor((t - reveal - 500) / 220) + 1 : 0;
      const k = reveal ? .6 * easeIO((t - reveal) / 450) : 0;
      const offOf = c => [(c.x + .5 - P.W / 2) * k, (c.y + .5 - P.D / 2) * k, c.z * k];
      const items = cubes.map((c, i) => ({ x: c.x, y: c.y, z: c.z, off: k ? offOf(c) : null, col: HEX[PAL[colours[i]].c], sym: V.s > 34 ? PAL[colours[i]].s : null, symAll: true, glow: i < showN && t - reveal - 500 - i * 220 < 300 ? .9 : 0 }));
      const cols = []; for (let y = 0; y < P.D; y++) for (let x = 0; x < P.W; x++) cols.push([x, y, P.h[y * P.W + x]]);
      V.draw(items, (ctx, VV) => { floorSlab(ctx, VV, -.3, -.3, P.W + .3, P.D + .3, false); columnShadows(ctx, VV, cols); }, ctx => {
        if (!reveal) return;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        cubes.forEach((c, i) => {
          if (i >= showN) return;
          const o = offOf(c), p = V.P(c.x + .5 + o[0], c.y + .5 + o[1], c.z + .5 + o[2]), r = Math.max(13, V.s * .27);
          const a = clamp((t - reveal - 500 - i * 220) / 160, 0, 1);
          ctx.globalAlpha = a;
          ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#18242C'; ctx.stroke();
          ctx.fillStyle = '#18242C'; ctx.font = '700 ' + Math.round(r * 1.15) + 'px Fredoka, sans-serif'; ctx.fillText(String(i + 1), p[0], p[1] + 1);
          ctx.globalAlpha = 1;
        });
      });
    });
    newRound();
    V.cv._dbg = { answer: () => P.tot, P: () => P };
  }

  /* =========================================================
     8. SHADOW MATCH
     ========================================================= */
  // silhouette as {w, h, set of 'c,r'} with rows from the top
  function shSil(P, view) {
    const { W, D, h } = P, H = Math.max(...h), s = new Set();
    const at = (x, y) => h[y * W + x];
    if (view === 'top') { for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) if (at(x, y)) s.add(x + ',' + y); return { w: W, h: D, s }; }
    if (view === 'front') { for (let x = 0; x < W; x++) { let m = 0; for (let y = 0; y < D; y++) m = Math.max(m, at(x, y)); for (let z = 0; z < m; z++) s.add(x + ',' + (H - 1 - z)); } return { w: W, h: H, s }; }
    for (let y = 0; y < D; y++) { let m = 0; for (let x = 0; x < W; x++) m = Math.max(m, at(x, y)); for (let z = 0; z < m; z++) s.add((D - 1 - y) + ',' + (H - 1 - z)); }
    return { w: D, h: H, s };
  }
  const silCells = S => [...S.s].map(k => k.split(',').map(Number));
  function silNorm(cells) {
    if (!cells.length) return '';
    const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1]));
    return cells.map(c => (c[0] - mx) + ',' + (c[1] - my)).sort().join(';');
  }
  function silConnected(cells) {
    if (!cells.length) return false;
    const set = new Set(cells.map(c => c.join(','))), seen = new Set([cells[0].join(',')]), q = [cells[0]];
    while (q.length) { const [x, y] = q.pop(); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (x + a) + ',' + (y + b); if (set.has(k) && !seen.has(k)) { seen.add(k); q.push([x + a, y + b]); } } }
    return seen.size === set.size;
  }
  // near misses: one cube more or less, mirrored, or the view from another side
  function shNear(P, view, S) {
    const cells = silCells(S), out = [];
    const has = new Set(S.s);
    if (view === 'top') {
      for (const [x, y] of cells) { const c = cells.filter(q => !(q[0] === x && q[1] === y)); if (silConnected(c)) out.push(c); }
      const cand = new Set();
      for (const [x, y] of cells) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (x + a) + ',' + (y + b); if (!has.has(k)) cand.add(k); }
      for (const k of cand) out.push(cells.concat([k.split(',').map(Number)]));
      out.push(cells.map(([x, y]) => [S.w - 1 - x, y]), cells.map(([x, y]) => [x, S.h - 1 - y]));
    } else {
      // skyline: column heights
      const hs = []; for (let c = 0; c < S.w; c++) { let m = 0; for (let r = 0; r < S.h; r++) if (has.has(c + ',' + r)) m = Math.max(m, S.h - r); hs.push(m); }
      const mk = arr => { const o = []; arr.forEach((m, c) => { for (let z = 0; z < m; z++) o.push([c, -z]); }); return o; };
      for (let c = 0; c < hs.length; c++) for (const d of [1, -1]) {
        const a = hs.slice(); a[c] += d;
        if (a[c] < 0 || a[c] > 4) continue;
        if (a[c] === 0 && c > 0 && c < hs.length - 1) continue;
        if (a.every(v => !v)) continue;
        out.push(mk(a));
      }
      for (let c = 0; c + 1 < hs.length; c++) if (hs[c] !== hs[c + 1]) { const a = hs.slice(); [a[c], a[c + 1]] = [a[c + 1], a[c]]; out.push(mk(a)); }
      out.push(mk(hs.slice().reverse()));
      const other = shSil(P, view === 'front' ? 'side' : 'front');
      out.push(silCells(other));
      // one extra column on the end
      out.push(mk(hs.concat([1])), mk([1].concat(hs)));
    }
    return out.filter(c => c.length && silConnected(c));
  }
  function shGen(L) {
    const views = L <= 2 ? ['front'] : L <= 4 ? ['front', 'side'] : ['front', 'side', 'top'];
    const view = pick(views);
    let W, D, maxH, lo, hi;
    if (L <= 1) { W = 2 + randInt(2); D = 1 + randInt(2); maxH = 2; lo = 2; hi = 3; }
    else if (L <= 3) { W = 3; D = 2; maxH = 2; lo = 3; hi = 5; }
    else if (L <= 6) { W = 3; D = 2 + randInt(2); maxH = 3; lo = 4; hi = 7; }
    else { W = 3; D = 3; maxH = 3; lo = 6; hi = 10; }
    for (let g = 0; g < 500; g++) {
      const h = []; for (let i = 0; i < W * D; i++) h.push(Math.random() < .7 ? 1 + randInt(maxH) : 0);
      const tot = h.reduce((a, b) => a + b, 0);
      if (tot < lo || tot > hi) continue;
      const cells = []; for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) if (h[y * W + x]) cells.push([x, y]);
      if (!silConnected(cells)) continue;
      // trim empty rows/columns so the model sits snugly
      const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const W2 = x1 - x0 + 1, D2 = y1 - y0 + 1, h2 = [];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) h2.push(h[y * W + x]);
      const P = { W: W2, D: D2, h: h2, tot };
      const S = shSil(P, view);
      if (view !== 'top' && S.w < 2) continue;
      if (L >= 3 && view === 'front' && silNorm(silCells(S)) === silNorm(silCells(shSil(P, 'side')))) { if (Math.random() < .6) continue; }
      const key = silNorm(silCells(S));
      const near = [], seen = new Set([key]);
      for (const c of shuffle(shNear(P, view, S))) { const k = silNorm(c); if (!seen.has(k)) { seen.add(k); near.push(c); } }
      const nOpt = L <= 4 ? 3 : 4;
      if (near.length < nOpt - 1) continue;
      return { P, view, S, opts: shuffle([{ cells: silCells(S), ok: true }].concat(near.slice(0, nOpt - 1).map(c => ({ cells: c, ok: false })))) };
    }
    return null;
  }
  function silEl(cells, G, q) {
    const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const ox = Math.floor((G.w - (x1 - x0 + 1)) / 2) - x0, oy = (G.bottom ? G.h - (y1 - y0 + 1) : Math.floor((G.h - (y1 - y0 + 1)) / 2)) - y0;
    const set = new Set(cells.map(([x, y]) => (x + ox) + ',' + (y + oy)));
    const box = el('div', 'c2-sil'); box.style.gridTemplateColumns = `repeat(${G.w}, var(--q))`; box.style.setProperty('--q', q + 'px');
    for (let r = 0; r < G.h; r++) for (let c = 0; c < G.w; c++) box.append(el('i', set.has(c + ',' + r) ? 'f' : 'e'));
    return box;
  }
  const SH_CAM = { front: [0, 0], side: [Math.PI / 2, 0], top: [0, Math.PI / 2 - .001] };
  const SH_WORD = { front: 'the FRONT', side: 'the SIDE', top: 'the TOP' };
  function startShadow(L, api) {
    const total = 5, YAW = .55, PITCH = .55;
    let round = 0, mistakes = 0, Q = null, busy = false, flip = 0, lastW = 0, cols = [];
    const wrap = el('div', 'c2-wrap');
    const V = makeView({ yaw: YAW, pitch: PITCH });
    const pics = el('div', 'c2-pics');
    wrap.append(V.cv, pics); api.stage.append(wrap);
    function layout(force) {
      const w = stageW(api, 520); if (w === lastW && !force) return; lastW = w;
      V.resize(w, Math.round(clamp(w * .62, 200, 280)));
      const { W, D, h } = Q.P, H = Math.max(...h);
      const cams = [[YAW, PITCH], SH_CAM.front, SH_CAM.side, SH_CAM.top, [YAW, .2], [YAW + .4, .3]];
      V.fit(boxPts(-.2, -.2, 0, W + .2, D + .2, H).concat(arrowPts()), { cams, pad: 8 });
    }
    function arrowPts() {
      const { W, D, h } = Q.P, H = Math.max(...h);
      if (Q.view === 'front') return [[W / 2, D + 2.5, H / 2], [W / 2, D + .7, H / 2]];
      if (Q.view === 'side') return [[W + 2.5, D / 2, H / 2], [W + .7, D / 2, H / 2]];
      return [[W / 2, D / 2, H + 2.2], [W / 2, D / 2, H + .5]];
    }
    function newRound() {
      api.rounds(total, round);
      do { Q = shGen(L); } while (!Q);
      busy = false; flip = 0; V.yaw = YAW; V.pitch = PITCH;
      cols = []; const { W, D, h } = Q.P;
      for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) for (let z = 0; z < h[y * W + x]; z++) cols.push({ x, y, z, c: randInt(5) });
      layout(true);
      api.hint('Look at the model from ' + SH_WORD[Q.view] + ', where the arrow is. Which shadow would it make?');
      const G = { w: 0, h: 0, bottom: Q.view !== 'top' };
      Q.opts.forEach(o => { const xs = o.cells.map(c => c[0]), ys = o.cells.map(c => c[1]); G.w = Math.max(G.w, Math.max(...xs) - Math.min(...xs) + 1); G.h = Math.max(G.h, Math.max(...ys) - Math.min(...ys) + 1); });
      const avail = (Math.min(stageW(api, 520), 520) - 12) / 2 - 12 - 16;
      const q = Math.floor(clamp(Math.min((avail - 3 * (G.w - 1)) / G.w, (110 - 3 * (G.h - 1)) / G.h), 14, 30));
      pics.innerHTML = '';
      Q.opts.forEach((o, i) => {
        const b = el('button', 'btn c-card c2-pic' + (Q.opts.length === 3 && i === 2 ? ' c2-solo' : ''));
        b.type = 'button'; b.setAttribute('aria-label', 'Shadow ' + (i + 1));
        b.append(silEl(o.cells, G, q));
        b.onclick = () => choose(o, b);
        pics.append(b);
      });
    }
    function choose(o, b) {
      if (busy) return;
      if (o.ok) {
        busy = true; flip = now(); b.classList.add('c2-right'); sfx.good(); toast(cheer());
        [440, 554, 659].forEach((f, i) => tone(f, .15, 'sine', .11, .1 + i * .1));
        api.hint('That is right! Watch the model turn to show its shadow from ' + SH_WORD[Q.view].toLowerCase() + '.');
        round++;
        api.later(() => { if (round >= total) { api.rounds(total, round); api.done(starsFor(mistakes, 0, 2)); } else newRound(); }, 2600);
      } else {
        mistakes++; b.classList.add('c2-nope'); sfx.soft(); wob(b);
        api.hint('Not quite. Imagine standing at ' + SH_WORD[Q.view].toLowerCase() + ' with the arrow, looking at the model. What outline would you see?');
      }
    }
    animate(V, t => {
      layout();
      const a = flip ? easeIO((t - flip - 200) / 1100) : 0, dark = flip ? clamp((t - flip - 900) / 600, 0, 1) : 0;
      const [cy, cp] = SH_CAM[Q.view];
      V.yaw = lerp(YAW, cy, a); V.pitch = lerp(PITCH, cp, a);
      const { W, D, h } = Q.P;
      const items = cols.map(c => ({ x: c.x, y: c.y, z: c.z, col: mixHex(HEX[PAL[c.c].c], HEX.shadow, dark), sym: dark < .3 && V.s > 30 ? PAL[c.c].s : null, symAll: true }));
      const sh = []; for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) sh.push([x, y, h[y * W + x]]);
      V.draw(items, (ctx, VV) => {
        if (a < .98) { ctx.globalAlpha = 1 - a; floorSlab(ctx, VV, -.2, -.2, W + .2, D + .2, false); columnShadows(ctx, VV, sh); ctx.globalAlpha = 1; }
      }, ctx => {
        if (flip) return;
        const [p0, p1] = arrowPts().map(V.P3);
        const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
        const bob = Math.sin(t / 260) * 4;
        ctx.save(); ctx.translate(p0[0] + Math.cos(ang) * bob, p0[1] + Math.sin(ang) * bob); ctx.rotate(ang);
        const L2 = Math.max(len, 40), w = 11;
        ctx.beginPath(); ctx.moveTo(0, -w); ctx.lineTo(L2 - 22, -w); ctx.lineTo(L2 - 22, -w - 12); ctx.lineTo(L2, 0); ctx.lineTo(L2 - 22, w + 12); ctx.lineTo(L2 - 22, w); ctx.lineTo(0, w); ctx.closePath();
        ctx.fillStyle = '#FFC234'; ctx.fill(); ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeStyle = '#18242C'; ctx.stroke();
        ctx.restore();
        ctx.font = '30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('👁️', p0[0] - Math.cos(ang) * 18, p0[1] - Math.sin(ang) * 18);
      });
    });
    newRound();
    V.cv._dbg = { Q: () => Q };
  }

  /* =========================================================
     9. FOLD IT
     ========================================================= */
  // every fixed hexomino that folds into a cube, found once by trying to fold it
  function foldNet(net, th) {
    const idx = new Map(net.map((p, i) => [p[0] + ',' + p[1], i]));
    const deg = net.map(([c, r]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => idx.has((c + a) + ',' + (r + b))).length);
    let root = 0; deg.forEach((d, i) => { if (d > deg[root] || (d === deg[root] && i < root)) root = i; });
    const T = Array(6).fill(null); T[root] = p => p;
    const q = [root], cs = Math.cos(th), sn = Math.sin(th);
    while (q.length) {
      const f = q.shift(), [c, r] = net[f];
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = idx.get((c + a) + ',' + (r + b));
        if (j == null || T[j]) continue;
        const o = [a, b, 0], h = [c + .5 + a * .5, r + .5 + b * .5, 0], tp = T[f];
        T[j] = p => {
          const w = sub(p, h), wo = dot(w, o), wz = w[2], wa = sub(sub(w, mul(o, wo)), [0, 0, wz]);
          const rw = add(wa, add(mul(add(mul(o, cs), [0, 0, -sn]), wo), mul(add(mul(o, sn), [0, 0, cs]), wz)));
          return tp(add(h, rw));
        };
        q.push(j);
      }
    }
    return { root, faces: net.map(([c, r], i) => { const o = T[i]([c, r, 0]), pu = T[i]([c + 1, r, 0]), pv = T[i]([c, r + 1, 0]); return { o, u: sub(pu, o), v: sub(pv, o) }; }) };
  }
  const NETS = (() => {
    const shapes = new Set([JSON.stringify([[0, 0]])]);
    let cur = [[[0, 0]]];
    for (let n = 1; n < 6; n++) {
      const next = new Map();
      for (const s of cur) {
        const set = new Set(s.map(p => p.join(',')));
        for (const [x, y] of s) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (set.has((x + a) + ',' + (y + b))) continue;
          const t = s.concat([[x + a, y + b]]);
          const mx = Math.min(...t.map(p => p[0])), my = Math.min(...t.map(p => p[1]));
          const nt = t.map(p => [p[0] - mx, p[1] - my]).sort((p, q) => p[1] - q[1] || p[0] - q[0]);
          next.set(JSON.stringify(nt), nt);
        }
      }
      cur = [...next.values()];
    }
    void shapes;
    return cur.filter(net => {
      const w = Math.max(...net.map(p => p[0])) + 1, h = Math.max(...net.map(p => p[1])) + 1;
      if (w < h) return false;
      const F = foldNet(net, Math.PI / 2);
      const ns = new Set(F.faces.map(f => vkey(cross(f.u, f.v))));
      return ns.size === 6;
    });
  })();
  const isRow4 = net => Math.max(...net.map(p => p[0])) === 3 && Math.max(...net.map(p => p[1])) === 2 && net.filter(p => p[1] === 1).length === 4;
  const isCross = net => isRow4(net) && (() => { const a = net.find(p => p[1] === 0)[0], b = net.find(p => p[1] === 2)[0]; return a === b && (a === 1 || a === 2); })();
  // the 24 turns of a cube, as 3x3 integer matrices (rows)
  const ROTS = (() => {
    const id = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const mm = (A, B) => A.map(r => [0, 1, 2].map(j => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
    const RX = [[1, 0, 0], [0, 0, -1], [0, 1, 0]], RZ = [[0, -1, 0], [1, 0, 0], [0, 0, 1]];
    const seen = new Map([[JSON.stringify(id), id]]), q = [id];
    while (q.length) { const m = q.shift(); for (const g of [RX, RZ]) { const n = mm(g, m), k = JSON.stringify(n); if (!seen.has(k)) { seen.set(k, n); q.push(n); } } }
    return [...seen.values()];
  })();
  const mv = (M, v) => M.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
  const VIEW_DIRS = [[0, 0, 1], [0, 1, 0], [1, 0, 0]]; // top, front, right in the standard view
  function cubeMap(net, content) {
    const F = foldNet(net, Math.PI / 2), m = new Map();
    F.faces.forEach((f, i) => m.set(vkey(cross(f.u, f.v)), content[i]));
    return m;
  }
  function canShow(map, tri) {
    return ROTS.some(M => VIEW_DIRS.every((d, i) => {
      const n = [0, 1, 2].map(j => M[0][j] * d[0] + M[1][j] * d[1] + M[2][j] * d[2]); // transpose
      return map.get(vkey(n)) === tri[i];
    }));
  }
  function triClass(map, tri) {
    const where = new Map([...map].map(([k, v]) => [v, k]));
    if (tri.some(s => !where.has(s))) return 'easy';
    const ns = tri.map(s => where.get(s).split(',').map(Number));
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) if (dot(ns[i], ns[j]) === -1) return 'medium';
    return canShow(map, tri) ? 'ok' : 'hard';
  }
  // geometry of the net at fold angle th, then the whole-cube quarter turns in word (the last one part-way)
  function foldGeom(net, content, th, word, part) {
    const F = foldNet(net, th), [rc, rr0] = net[F.root];
    const C = [rc + .5, rr0 + .5, -.5];
    let faces = F.faces.map((f, i) => ({ pts: [f.o, add(f.o, f.u), add(add(f.o, f.u), f.v), add(f.o, f.v)], ci: content[i] }));
    word.forEach((w, i) => {
      const ang = (i === word.length - 1 && part != null ? part : 1) * w.d * Math.PI / 2;
      faces.forEach(f => { f.pts = f.pts.map(p => add(C, rotV(sub(p, C), AX[w.ax], ang))); });
    });
    let mz = 1e9; faces.forEach(f => f.pts.forEach(p => { mz = Math.min(mz, p[2]); }));
    faces.forEach(f => { f.pts = f.pts.map(p => [p[0], p[1], p[2] - mz]); });
    return faces;
  }
  // which content shows on top, front and right after folding and turning
  function viewTri(faces) {
    return VIEW_DIRS.map(d => { const f = faces.find(f => { const n = cross(sub(f.pts[1], f.pts[0]), sub(f.pts[3], f.pts[0])); return vkey(n) === vkey(d); }); return f.ci; });
  }
  function drawFold(V, faces, o) {
    o = o || {};
    V.clear();
    const ctx = V.ctx, [sx, sy] = shadowDir(V);
    // shadow: everything dropped onto the floor, nudged away from the light
    ctx.beginPath();
    for (const f of faces) {
      const pts = [];
      f.pts.forEach(p => { const k = p[2] * .22 + .04; pts.push(V.P(p[0] + sx * k, p[1] + sy * k, 0)); });
      const hl = hull(pts); hl.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath();
    }
    ctx.fillStyle = 'rgba(0,20,26,.22)'; ctx.fill('nonzero');
    const quads = faces.map(f => ({ pts: f.pts, col: f.ci == null ? HEX.stone : HEX[PAL[f.ci].c], sym: f.ci == null ? '?' : PAL[f.ci].s, back: HEX.stone, one: !!o.closed, symSize: 64 }));
    drawQuads(V, quads);
  }
  function drawNet2D(cv, w, h, net, content) {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px';
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    const nw = Math.max(...net.map(p => p[0])) + 1, nh = Math.max(...net.map(p => p[1])) + 1;
    const s = Math.min((w - 8) / nw, (h - 10) / nh), ox = (w - s * nw) / 2, oy = (h - s * nh) / 2 - 2;
    net.forEach(([c, r], i) => {
      const x = ox + c * s, y = oy + r * s, p = PAL[content[i]], g = 1.5;
      ctx.fillStyle = shadeOf(HEX[p.c], .62); roundRect(ctx, x + g, y + g + 3, s - 2 * g, s - 2 * g, s * .14); ctx.fill();
      ctx.fillStyle = HEX[p.c]; roundRect(ctx, x + g, y + g, s - 2 * g, s - 2 * g - 2, s * .14); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.28)'; roundRect(ctx, x + g + 3, y + g + 3, s - 2 * g - 6, (s - 2 * g) * .38, s * .1); ctx.fill();
      ctx.fillStyle = 'rgba(24,36,44,.62)'; ctx.font = '700 ' + Math.round(s * .6) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.s, x + s / 2, y + s / 2 + 1);
    });
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function fdRound(L, mode) {
    const pool = L <= 2 ? NETS.filter(isCross) : L <= 5 ? NETS.filter(isRow4) : NETS;
    const net = pick(pool);
    const content = shuffle([0, 1, 2, 3, 4, 5, 6, 7]).slice(0, 6);
    const word = [];
    const nw = L <= 2 ? 0 : L <= 5 ? randInt(2) : randInt(3);
    for (let i = 0; i < nw; i++) word.push({ ax: pick(['x', 'y', 'z']), d: pick([1, -1]) });
    const faces = foldGeom(net, content, Math.PI / 2, word);
    const tri = viewTri(faces);
    const nOpt = L <= 7 ? 3 : 4;
    const classes = L <= 2 ? ['easy', 'easy', 'easy'] : L <= 4 ? ['easy', 'medium', 'medium'] : L <= 7 ? ['medium', 'hard', 'medium'] : ['medium', 'hard', 'hard'];
    const map = cubeMap(net, content);
    const opts = [{ ok: true, net, content, tri }];
    const seen = new Set([tri.join(',') + '|' + content.join(',') + JSON.stringify(net)]);
    for (let i = 0; i < nOpt - 1; i++) {
      const want = classes[i];
      let got = null;
      for (let g = 0; g < 4000 && !got; g++) {
        const cls = g < 3000 ? want : g < 3600 ? 'medium' : 'easy';
        if (mode === 'B') {
          // a cube that this net cannot make
          let t2;
          if (cls === 'hard' && Math.random() < .5) { t2 = tri.slice(); const i1 = randInt(3), i2 = (i1 + 1 + randInt(2)) % 3; [t2[i1], t2[i2]] = [t2[i2], t2[i1]]; }
          else t2 = shuffle([0, 1, 2, 3, 4, 5, 6, 7]).slice(0, 3);
          if (cls === 'easy' && L <= 2) { t2 = tri.slice(); const missing = [0, 1, 2, 3, 4, 5, 6, 7].filter(c => !content.includes(c)); t2[randInt(3)] = pick(missing); }
          if (new Set(t2).size < 3 || triClass(map, t2) !== cls) continue;
          const k = t2.join(',');
          if (seen.has(k)) continue;
          seen.add(k); got = { ok: false, tri: t2 };
        } else {
          // a net that cannot make this cube
          const n2 = L <= 5 ? net : pick(pool);
          let c2;
          if (cls === 'easy') { c2 = content.slice(); const missing = [0, 1, 2, 3, 4, 5, 6, 7].filter(c => !content.includes(c)); c2[content.indexOf(pick(tri))] = pick(missing); shuffleSome(c2, L); }
          else c2 = shuffle(content.slice());
          if (triClass(cubeMap(n2, c2), tri) !== cls) continue;
          const k = c2.join(',') + JSON.stringify(n2);
          if (seen.has(k)) continue;
          seen.add(k); got = { ok: false, net: n2, content: c2 };
        }
      }
      if (got) opts.push(got);
    }
    return { mode, net, content, word, tri, faces, opts: shuffle(opts), map };
  }
  function shuffleSome(c, L) { if (L >= 3 && Math.random() < .5) { const i = randInt(6), j = randInt(6); [c[i], c[j]] = [c[j], c[i]]; } }
  const FD_YAW = .68, FD_PITCH = .55;
  function startFold(L, api) {
    const total = 5;
    let round = 0, mistakes = 0, Q = null, busy = false, play = 0, lastW = 0;
    const wrap = el('div', 'c2-wrap');
    const V = makeView({ yaw: FD_YAW, pitch: FD_PITCH });
    const pics = el('div', 'c2-pics');
    wrap.append(V.cv, pics); api.stage.append(wrap);
    let fitFlat = null, fitCube = null;
    function fits() {
      const keep = [V.yaw, V.pitch];
      const flat = foldGeom(Q.net, Q.content, 0, []), cube = Q.faces;
      const pf = flat.flatMap(f => f.pts), pc = cube.flatMap(f => f.pts);
      V.yaw = .25; V.pitch = 1.05; V.fit(pf.concat(pf.map(p => [p[0], p[1], -.2])), { pad: 14 });
      fitFlat = { yaw: .25, pitch: 1.05, s: V.s, c: V.c.slice(), ox: V.ox, oy: V.oy };
      V.yaw = FD_YAW; V.pitch = FD_PITCH; V.fit(pc, { pad: 34 });
      fitCube = { yaw: FD_YAW, pitch: FD_PITCH, s: Math.min(V.s, fitFlat.s * 2.2), c: V.c.slice(), ox: V.ox, oy: V.oy };
      [V.yaw, V.pitch] = keep;
    }
    const setCam = (A, B, a) => { V.yaw = lerp(A.yaw, B.yaw, a); V.pitch = lerp(A.pitch, B.pitch, a); V.s = lerp(A.s, B.s, a); V.c = A.c.map((v, i) => lerp(v, B.c[i], a)); V.ox = lerp(A.ox, B.ox, a); V.oy = lerp(A.oy, B.oy, a); };
    function layout(force) {
      const w = stageW(api, 520); if (w === lastW && !force) return; lastW = w;
      V.resize(w, Math.round(clamp(w * .6, 190, 260)));
      fits();
    }
    function newRound() {
      api.rounds(total, round);
      Q = fdRound(L, round % 2 === 0 ? 'B' : 'A');
      busy = false; play = 0;
      layout(true);
      api.hint(Q.mode === 'B' ? 'If you fold this flat shape into a box, which cube do you get? Tap it.' : 'Which flat shape folds up into this cube? Tap it.');
      pics.innerHTML = '';
      const w = Math.min(stageW(api, 520), 520), pw = Math.floor((w - 12) / 2) - 16, ph = Math.round(clamp(pw * .78, 100, 150));
      Q.opts.forEach((o, i) => {
        const b = el('button', 'btn c-card c2-pic' + (Q.opts.length === 3 && i === 2 ? ' c2-solo' : ''));
        b.type = 'button'; b.setAttribute('aria-label', 'Choice ' + (i + 1));
        if (Q.mode === 'B') {
          const OV = makeView({ yaw: FD_YAW, pitch: FD_PITCH }); OV.resize(pw, ph);
          const faces = Q.faces.map(f => ({ pts: f.pts, ci: f.ci }));
          VIEW_DIRS.forEach((d, j) => { const f = faces.find(f => vkey(cross(sub(f.pts[1], f.pts[0]), sub(f.pts[3], f.pts[0]))) === vkey(d)); f.ci = o.tri[j]; });
          const pc = faces.flatMap(f => f.pts);
          OV.fit(pc, { pad: 6 });
          drawFold(OV, faces, { closed: true });
          b.append(OV.cv);
        } else {
          const cv = el('canvas', 'c2-cv'); drawNet2D(cv, pw, ph, o.net, o.content); b.append(cv);
        }
        b.onclick = () => choose(o, b);
        pics.append(b);
      });
    }
    function choose(o, b) {
      if (busy) return;
      if (o.ok) {
        busy = true; play = now(); b.classList.add('c2-right'); sfx.good(); toast(cheer());
        api.hint('Yes! Watch it fold up.');
        round++;
        const dur = 1700 + Q.word.length * 600 + 1100;
        [0, 1, 2, 3, 4].forEach(i => tone(392 + i * 70, .1, 'triangle', .09, .3 + i * .25));
        api.later(() => { if (round >= total) { api.rounds(total, round); api.done(starsFor(mistakes, 0, 2)); } else newRound(); }, dur);
      } else {
        mistakes++; b.classList.add('c2-nope'); sfx.soft(); wob(b);
        api.hint(Q.mode === 'B' ? 'Not that one. Check which pictures are on the flat shape, and which ones end up next to each other.' : 'Not that one. Check the flat shape has all three pictures, and that they would end up side by side.');
      }
    }
    animate(V, t => {
      layout();
      if (!play) {
        if (Q.mode === 'A') { setCam(fitCube, fitCube, 1); drawFold(V, Q.faces, { closed: true }); }
        else { setCam(fitFlat, fitFlat, 1); drawFold(V, foldGeom(Q.net, Q.content, 0, [])); }
        return;
      }
      const e = t - play;
      const fa = easeIO((e - 300) / 1400), cam = easeIO((e - 200) / 1300);
      setCam(fitFlat, fitCube, cam);
      let faces;
      if (fa < 1 || !Q.word.length) faces = foldGeom(Q.net, Q.content, fa * Math.PI / 2, []);
      else {
        const wt = (e - 1700) / 600, i = Math.min(Q.word.length - 1, Math.floor(wt));
        faces = foldGeom(Q.net, Q.content, Math.PI / 2, Q.word.slice(0, i + 1), easeIO(wt - i));
      }
      drawFold(V, faces, { closed: fa >= 1 });
    });
    newRound();
    V.cv._dbg = { Q: () => Q, NETS };
  }

  if (navigator.webdriver) window.__cube2test = { fdRound, triClass, cubeMap, canShow, viewTri, foldGeom, NETS, twNew, twApply, twSolved, twPlan, shGen, shSil, silNorm, silCells, cbGen, ccGen };
  register({ id: 'twist', cat: 'cube', order: 5, name: 'Cube Twist', icon: '🎲', desc: 'Turn the cube until each side is one colour', start: startTwist });
  register({ id: 'copybuild', cat: 'cube', order: 6, name: 'Copy Build', icon: '🏗️', desc: 'Build a copy of the little block model', start: startCopyBuild });
  register({ id: 'countcubes', cat: 'cube', order: 7, name: 'Count the Cubes', icon: '🔢', desc: 'Count every cube, even the hidden ones', start: startCount });
  register({ id: 'shadow', cat: 'cube', order: 8, name: 'Shadow Match', icon: '🔦', desc: 'Pick the shadow the model would make', start: startShadow });
  register({ id: 'fold', cat: 'cube', order: 9, name: 'Fold It', icon: '📦', desc: 'Match a flat shape to the cube it folds into', start: startFold });
})();
