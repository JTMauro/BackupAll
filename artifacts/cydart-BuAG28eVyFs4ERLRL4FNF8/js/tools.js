/* CydArt tools: painting, retouching, selection, shapes, text, crop, transform, navigation. */
window.CP = window.CP || {};
(function (CP) {
  'use strict';
  const U = CP.util;

  const O = CP.toolOpts = {
    size: 24, opacity: 100, hardness: 75, flow: 100, smoothing: 25, pressure: true,
    tolerance: 32, contiguous: true, sampleAll: false, selMode: 'replace', feather: 0,
    shape: 'rect', shapeStyle: 'fill', strokeW: 6, radius: 24, shapeLayer: true,
    font: 'Montserrat, Segoe UI, sans-serif', fontSize: 64, bold: true, italic: false, align: 'left', textStroke: 0, textShadow: false,
    gradType: 'linear', gradMode: 'fg-bg', cropRatio: 'free', strength: 50, cloneAligned: true,
  };

  const T = CP.tools = { list: [], byId: {}, current: null, pointer: null };
  const add = (t) => { T.list.push(t); T.byId[t.id] = t; return t; };
  CP.selectTool = (id) => {
    const t = T.byId[id]; if (!t) return;
    if (T.current && T.current !== t && T.current.deactivate) T.current.deactivate();
    T.current = t; t.activate && t.activate();
    CP.emit('tool', t); CP.requestRender();
  };

  const toast = (m) => CP.ui && CP.ui.toast(m);
  function editable(d) {
    if (!d) return false;
    const l = d.layer;
    if (!l) { toast('Add a layer first'); return false; }
    if (l.locked) { toast('This layer is locked'); return false; }
    if (!l.visible) { toast('This layer is hidden'); return false; }
    return true;
  }
  function strokeCanvas(d) {
    if (!T._stroke || T._stroke.width !== d.width || T._stroke.height !== d.height) T._stroke = U.canvas(d.width, d.height);
    const g = T._stroke.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, d.width, d.height);
    return T._stroke;
  }
  function pickColor(d, p) {
    const x = Math.floor(p.x), y = Math.floor(p.y);
    if (x < 0 || y < 0 || x >= d.width || y >= d.height) return null;
    const src = O.sampleAll ? d.renderComposite() : d.layer.canvas;
    const px = src.getContext('2d').getImageData(x, y, 1, 1).data;
    return px[3] === 0 ? null : U.rgbToHex(px[0], px[1], px[2]);
  }

  /* ---------- brush dabs ---------- */
  const dabCache = new Map();
  function dab(size, hardness, color, aliased) {
    const key = size + '|' + hardness + '|' + color + '|' + (aliased ? 1 : 0);
    let c = dabCache.get(key); if (c) return c;
    if (dabCache.size > 60) dabCache.clear();
    const s = Math.max(1, Math.ceil(size)) + 2; c = U.canvas(s, s); const g = c.getContext('2d'), r = size / 2, m = s / 2;
    if (aliased) {
      const { r: R, g: G, b: B } = U.hexToRgb(color); const id = g.createImageData(s, s);
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { if (Math.hypot(x + 0.5 - m, y + 0.5 - m) <= Math.max(0.5, r)) { const i = (y * s + x) * 4; id.data[i] = R; id.data[i + 1] = G; id.data[i + 2] = B; id.data[i + 3] = 255; } }
      g.putImageData(id, 0, 0);
    } else if (hardness >= 99) { g.fillStyle = color; g.beginPath(); g.arc(m, m, r, 0, Math.PI * 2); g.fill(); }
    else {
      const { r: R, g: G, b: B } = U.hexToRgb(color);
      const gr = g.createRadialGradient(m, m, 0, m, m, r);
      gr.addColorStop(0, `rgba(${R},${G},${B},1)`); gr.addColorStop(Math.max(0, Math.min(0.99, hardness / 100)), `rgba(${R},${G},${B},1)`); gr.addColorStop(1, `rgba(${R},${G},${B},0)`);
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
    }
    dabCache.set(key, c); return c;
  }
  /* walks dabs from a to b at spacing, calling fn(x, y, pressure) */
  function walk(st, p, pressure, fn) {
    const sp = Math.max(0.5, st.size * (st.spacing || 0.12));
    let dx = p.x - st.lx, dy = p.y - st.ly, dist = Math.hypot(dx, dy);
    if (dist < sp) return;
    const n = Math.floor(dist / sp);
    for (let i = 1; i <= n; i++) {
      const t = (i * sp) / dist; const pr = U.lerp(st.lp, pressure, t);
      fn(st.lx + dx * t, st.ly + dy * t, pr);
    }
    const t = (n * sp) / dist; st.lx += dx * t; st.ly += dy * t; st.lp = U.lerp(st.lp, pressure, t);
  }
  const pressureOf = (e) => (O.pressure && e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 1);
  function smooth(st, p) {
    if (!O.smoothing) return p;
    const k = 1 - O.smoothing / 110;
    st.sx = U.lerp(st.sx, p.x, k); st.sy = U.lerp(st.sy, p.y, k);
    return { x: st.sx, y: st.sy };
  }
  function brushCursor(g, d) {
    const p = T.pointer; if (!p) return;
    const s = CP.docToScreen(p.x, p.y); const r = Math.max(1.5, (O.size / 2) * d.zoom);
    g.lineWidth = 1; g.strokeStyle = 'rgba(0,0,0,0.7)'; g.beginPath(); g.arc(s.x, s.y, r, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(s.x, s.y, r + 1, 0, Math.PI * 2); g.stroke();
  }

  /* ---------- paint brushes (stroke canvas → layer) ---------- */
  function paintTool(id, name, key, icon, { eraser = false, aliased = false, airbrush = false } = {}) {
    return add({
      id, name, key, icon, cursor: 'none', opts: aliased ? ['size', 'opacity', 'pressure'] : ['size', 'opacity', 'hardness', 'flow', 'smoothing', 'pressure'],
      down(p, e) {
        const d = CP.doc;
        if (e.altKey && !eraser) { const c = pickColor(d, p); if (c) CP.setColor('fg', c); return; }
        if (!editable(d)) return;
        const pr = pressureOf(e);
        const sc = strokeCanvas(d);
        this.st = { lx: p.x, ly: p.y, lp: pr, sx: p.x, sy: p.y, size: O.size, spacing: aliased ? 0.08 : airbrush ? 0.05 : 0.12, g: sc.getContext('2d'), color: eraser ? '#000000' : CP.colors.fg };
        d.preview = { canvas: sc, op: eraser ? 'destination-out' : 'source-over', alpha: O.opacity / 100 };
        this.stamp(p.x, p.y, pr);
        if (e.shiftKey && this.last) { this.st.lx = this.last.x; this.st.ly = this.last.y; walk(this.st, p, pr, (x, y, q) => this.stamp(x, y, q)); }
        d.changed();
      },
      stamp(x, y, pr) {
        const st = this.st; const size = Math.max(1, O.size * (O.pressure ? pr : 1));
        const dc = dab(aliased ? Math.round(size) : size, aliased ? 100 : O.hardness, st.color, aliased);
        st.g.globalAlpha = aliased ? 1 : (airbrush ? 0.08 : 1) * (O.flow / 100);
        if (aliased) st.g.drawImage(dc, Math.round(x - dc.width / 2), Math.round(y - dc.height / 2));
        else st.g.drawImage(dc, x - dc.width / 2, y - dc.height / 2);
      },
      move(p, e) {
        if (!this.st) return;
        const q = smooth(this.st, p);
        walk(this.st, q, pressureOf(e), (x, y, pr) => this.stamp(x, y, pr));
        CP.doc.changed();
      },
      up(p) {
        const d = CP.doc; if (!this.st) return;
        const pv = d.preview; d.preview = null;
        d.applyToLayer(pv.canvas, { op: pv.op, alpha: pv.alpha });
        d.commit(name);
        this.last = { x: this.st.lx, y: this.st.ly }; this.st = null;
      },
      overlay: brushCursor,
    });
  }

  const I = CP.icons = {
    move: 'M12 2l3 3h-2v6h6V9l3 3-3 3v-2h-6v6h2l-3 3-3-3h2v-6H5v2l-3-3 3-3v2h6V5H9z',
    rect: 'M4 4h16v16H4z', ellipse: 'M12 4a8 8 0 1 0 0 16 8 8 0 1 0 0-16z',
    lasso: 'M12 4c5 0 8 2.2 8 5s-3.5 5-8 5c-1.6 0-3-.3-4.2-.8C7 14 7 15.5 8.5 16.5 10 17.5 9 20 7 20',
    wand: 'M5 19L15 9M14 4v2M19 9h-2M17.5 5.5l-1.4 1.4M12 7l5 5',
    crop: 'M6 2v16h16M2 6h16v16',
    transform: 'M4 4h5M4 4v5M20 4h-5M20 4v5M4 20h5M4 20v-5M20 20h-5M20 20v-5M9 9h6v6H9z',
    brush: 'M18.4 2.6a2 2 0 0 1 2.8 2.8L11 15.6 8.4 13zM7 14.5c-2 0-3.5 1.6-3.5 3.5 0 1.2-.8 2-1.5 2.4 1 .4 2.3.6 3.5.6 2.4 0 4.5-1.6 4.5-4z',
    pencil: 'M3 21l1.5-5L16 4.5a2.1 2.1 0 0 1 3 3L7.5 19zM14 6.5l3 3',
    air: 'M5 21v-6h4v6M7 15V9M4 9h6M14 6h.01M17 4h.01M19 8h.01M16 10h.01M20 12h.01M13 3h.01',
    eraser: 'M16 3l5 5-11 11H5l-3-3zM9 19h12M6.5 10.5l7 7',
    fill: 'M5 11l7-7 7 7-7 7zM5 11h14M20 15s2 2.3 2 3.5a2 2 0 0 1-4 0c0-1.2 2-3.5 2-3.5z',
    gradient: 'M3 3h18v18H3zM3 21L21 3',
    clone: 'M9 3h6v4H9zM12 7v4M5 11h14v3H5zM7 14v7M17 14v7',
    smudge: 'M8 21c-2-3 1-5 0-8s-3-4-1-7c2-2 5 0 7 2l5 5-4 4-3-3',
    blurb: 'M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12z',
    dodge: 'M12 3a5 5 0 1 0 0 10 5 5 0 1 0 0-10zM12 13v8',
    burn: 'M8 3h8l-1 7a3 3 0 0 1-6 0zM12 13v8',
    text: 'M4 5V3h16v2M12 3v18M8 21h8',
    shape: 'M3 3h9v9H3zM17 12a5 5 0 1 0 0 10 5 5 0 1 0 0-10z',
    picker: 'M19.4 4.6a2 2 0 0 0-2.8 0L13 8.2l-1.3-1.3-1.4 1.4 1.3 1.3L4 17.2V20h2.8l7.6-7.6 1.3 1.3 1.4-1.4-1.3-1.3 3.6-3.6a2 2 0 0 0 0-2.8z',
    hand: 'M8 13V5a1.5 1.5 0 0 1 3 0v6M11 5V3.5a1.5 1.5 0 0 1 3 0V11M14 5a1.5 1.5 0 0 1 3 0v6M17 8a1.5 1.5 0 0 1 3 0v6a8 8 0 0 1-8 8h-1a7 7 0 0 1-5.6-2.8L3 15.8a1.5 1.5 0 0 1 2.4-1.8L8 16',
    zoom: 'M10 3a7 7 0 1 0 0 14 7 7 0 1 0 0-14zM21 21l-6-6M7 10h6M10 7v6',
    redeye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6z',
  };

  /* ---------- Move ---------- */
  add({
    id: 'move', name: 'Move', key: 'v', icon: I.move, cursor: 'move', opts: [],
    down(p) {
      const d = CP.doc; if (!editable(d)) return;
      this.start = p; const l = d.layer;
      if (d.selection) {
        const f = U.canvas(d.width, d.height), g = f.getContext('2d');
        g.drawImage(l.canvas, 0, 0); g.globalCompositeOperation = 'destination-in'; g.drawImage(d.selection.mask, 0, 0);
        l.ctx.globalCompositeOperation = 'destination-out'; l.ctx.drawImage(d.selection.mask, 0, 0); l.ctx.globalCompositeOperation = 'source-over';
        d.markDirty(l);
        this.mode = 'float'; d.preview = { canvas: f, x: 0, y: 0, clip: false };
      } else {
        this.mode = 'layer'; d.preview = { canvas: U.clone(l.canvas), x: 0, y: 0, replace: true, clip: false };
      }
    },
    move(p, e) {
      const d = CP.doc; if (!this.start || !d.preview) return;
      let dx = p.x - this.start.x, dy = p.y - this.start.y;
      if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      d.preview.x = Math.round(dx); d.preview.y = Math.round(dy);
      d.selOffset = this.mode === 'float' ? { x: d.preview.x, y: d.preview.y } : null;
      d.changed();
    },
    up() {
      const d = CP.doc; if (!this.start || !d.preview) { this.start = null; return; }
      const pv = d.preview; d.preview = null; d.selOffset = null; const l = d.layer;
      if (this.mode === 'layer') { l.ctx.clearRect(0, 0, d.width, d.height); l.ctx.drawImage(pv.canvas, pv.x, pv.y); }
      else {
        l.ctx.drawImage(pv.canvas, pv.x, pv.y);
        const s = new CP.Selection(d.width, d.height); s.mctx.drawImage(d.selection.mask, pv.x, pv.y); s.update(); d.selection = s.isEmpty() ? null : s;
      }
      d.markDirty(l); d.commit('Move'); this.start = null;
    },
    nudge(dx, dy) {
      const d = CP.doc; if (!editable(d)) return;
      this.down({ x: 0, y: 0 }); this.move({ x: dx, y: dy }, {}); this.up();
    },
  });

  /* ---------- Selection tools ---------- */
  function selMode(e, d) {
    if (d.selection && e.shiftKey && e.altKey) return 'intersect';
    if (d.selection && e.shiftKey) return 'add';
    if (d.selection && e.altKey) return 'subtract';
    return O.selMode;
  }
  function commitSelection(d, newSel, mode) {
    if (O.feather > 0 && newSel) {
      const b = CP.blurCanvas(newSel.mask, O.feather); newSel.mctx.clearRect(0, 0, d.width, d.height); newSel.mctx.drawImage(b, 0, 0); newSel.update();
    }
    if (mode === 'replace' || !d.selection) d.selection = newSel && !newSel.isEmpty() ? newSel : null;
    else { d.selection.combine(newSel, mode); if (d.selection.isEmpty()) d.selection = null; }
    CP.emit('selection', d); d.changed();
  }
  function shapeSelect(id, name, key, icon, ellipse) {
    return add({
      id, name, key, icon, cursor: 'crosshair', opts: ['selMode', 'feather'],
      down(p, e) { this.a = p; this.b = p; this.mode = selMode(e, CP.doc); },
      move(p, e) { if (!this.a) return; let b = { ...p }; if (e.shiftKey && this.mode !== 'add') { const s = Math.max(Math.abs(b.x - this.a.x), Math.abs(b.y - this.a.y)); b.x = this.a.x + Math.sign(b.x - this.a.x || 1) * s; b.y = this.a.y + Math.sign(b.y - this.a.y || 1) * s; } this.b = b; this.alt = e.altKey && this.mode !== 'subtract'; CP.requestRender(); },
      rect() { let { a, b } = this; let x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y); if (this.alt) { x = a.x - w; y = a.y - h; w *= 2; h *= 2; } return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) }; },
      up() {
        const d = CP.doc; if (!this.a) return;
        const r = this.rect(); this.a = null;
        if (r.w < 2 || r.h < 2) { if (this.mode === 'replace') { d.selection = null; CP.emit('selection', d); d.changed(); } return; }
        const s = CP.Selection.fromShape(d.width, d.height, (g) => { if (ellipse) { g.beginPath(); g.ellipse(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, r.h / 2, 0, 0, Math.PI * 2); g.fill(); } else g.fillRect(r.x, r.y, r.w, r.h); });
        commitSelection(d, s, this.mode);
      },
      overlay(g, d) {
        if (!this.a) return; const r = this.rect(); const s = CP.docToScreen(r.x, r.y);
        g.strokeStyle = '#38bdf8'; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.beginPath();
        if (ellipse) g.ellipse(s.x + r.w * d.zoom / 2, s.y + r.h * d.zoom / 2, r.w * d.zoom / 2, r.h * d.zoom / 2, 0, 0, Math.PI * 2); else g.rect(s.x, s.y, r.w * d.zoom, r.h * d.zoom);
        g.stroke(); g.fillStyle = 'rgba(56,189,248,0.1)'; g.fill();
        g.setLineDash([]); g.font = '12px sans-serif'; g.fillStyle = '#fff'; g.fillText(`${r.w} × ${r.h}`, s.x + 4, s.y - 6);
      },
    });
  }
  shapeSelect('select-rect', 'Rectangle Select', 'm', I.rect, false);
  shapeSelect('select-ellipse', 'Ellipse Select', 'm', I.ellipse, true);

  add({
    id: 'lasso', name: 'Lasso (click for points, drag for freehand)', key: 'l', icon: I.lasso, cursor: 'crosshair', opts: ['selMode', 'feather'],
    down(p, e) {
      if (!this.pts) { this.pts = [p]; this.mode = selMode(e, CP.doc); }
      else {
        const f = this.pts[0], d = CP.doc;
        if (Math.hypot(p.x - f.x, p.y - f.y) * d.zoom < 10 && this.pts.length > 2) { this.finish(); return; }
        this.pts.push(p);
      }
      this.dragging = true; this.dragStart = p;
    },
    move(p) { this.hover = p; if (this.dragging && this.pts && Math.hypot(p.x - this.dragStart.x, p.y - this.dragStart.y) > 2) { this.free = true; this.pts.push(p); } CP.requestRender(); },
    up() { this.dragging = false; if (this.free) { this.free = false; this.finish(); } },
    dbl() { this.finish(); },
    finish() {
      const d = CP.doc, pts = this.pts; this.pts = null; if (!pts || pts.length < 3) return;
      const s = CP.Selection.fromShape(d.width, d.height, (g) => { g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.closePath(); g.fill(); });
      commitSelection(d, s, this.mode); CP.requestRender();
    },
    keydown(e) { if (e.key === 'Enter' && this.pts) { this.finish(); return true; } if (e.key === 'Escape' && this.pts) { this.pts = null; CP.requestRender(); return true; } },
    deactivate() { this.pts = null; },
    overlay(g, d) {
      if (!this.pts) return; g.strokeStyle = '#38bdf8'; g.lineWidth = 1.5; g.beginPath();
      this.pts.forEach((q, i) => { const s = CP.docToScreen(q.x, q.y); i ? g.lineTo(s.x, s.y) : g.moveTo(s.x, s.y); });
      if (this.hover && !this.dragging) { const s = CP.docToScreen(this.hover.x, this.hover.y); g.lineTo(s.x, s.y); }
      g.stroke(); const f = CP.docToScreen(this.pts[0].x, this.pts[0].y); g.fillStyle = '#38bdf8'; g.beginPath(); g.arc(f.x, f.y, 4, 0, 7); g.fill();
    },
  });

  /* flood fill → mask */
  function floodMask(src, x0, y0, tol, contiguous) {
    const w = src.width, h = src.height; const d = src.getContext('2d').getImageData(0, 0, w, h).data;
    const mask = new Uint8Array(w * h); const i0 = (y0 * w + x0) * 4;
    const r0 = d[i0], g0 = d[i0 + 1], b0 = d[i0 + 2], a0 = d[i0 + 3]; const t = tol * 4;
    const match = (i) => { const j = i * 4; return Math.abs(d[j] - r0) + Math.abs(d[j + 1] - g0) + Math.abs(d[j + 2] - b0) + Math.abs(d[j + 3] - a0) <= t; };
    if (!contiguous) { for (let i = 0; i < w * h; i++) if (match(i)) mask[i] = 1; return mask; }
    const stack = [x0, y0];
    while (stack.length) {
      const y = stack.pop(); let x = stack.pop();
      let i = y * w + x; while (x >= 0 && !mask[i] && match(i)) { x--; i--; } x++; i++;
      let up = false, dn = false;
      while (x < w && !mask[i] && match(i)) {
        mask[i] = 1;
        if (y > 0) { const u = i - w; if (!mask[u] && match(u)) { if (!up) { stack.push(x, y - 1); up = true; } } else up = false; }
        if (y < h - 1) { const v = i + w; if (!mask[v] && match(v)) { if (!dn) { stack.push(x, y + 1); dn = true; } } else dn = false; }
        x++; i++;
      }
    }
    return mask;
  }
  function maskToCanvas(mask, w, h, color) {
    const c = U.canvas(w, h), g = c.getContext('2d'), id = g.createImageData(w, h), { r, g: G, b } = U.hexToRgb(color);
    for (let i = 0; i < mask.length; i++) if (mask[i]) { const j = i * 4; id.data[j] = r; id.data[j + 1] = G; id.data[j + 2] = b; id.data[j + 3] = 255; }
    g.putImageData(id, 0, 0); return c;
  }
  add({
    id: 'wand', name: 'Magic Wand', key: 'w', icon: I.wand, cursor: 'crosshair', opts: ['selMode', 'tolerance', 'contiguous', 'sampleAll', 'feather'],
    down(p, e) {
      const d = CP.doc, x = Math.floor(p.x), y = Math.floor(p.y); if (x < 0 || y < 0 || x >= d.width || y >= d.height) return;
      const src = O.sampleAll ? d.renderComposite() : d.layer.canvas;
      const m = floodMask(src, x, y, O.tolerance, O.contiguous);
      const s = new CP.Selection(d.width, d.height); s.mctx.drawImage(maskToCanvas(m, d.width, d.height, '#000000'), 0, 0); s.update();
      commitSelection(d, s, selMode(e, d));
    },
  });

  /* ---------- Crop ---------- */
  const RATIOS = { free: null, original: 'orig', '1:1': 1, '4:3': 4 / 3, '3:2': 3 / 2, '16:9': 16 / 9, '9:16': 9 / 16, '4:5': 4 / 5, '5:4': 5 / 4 };
  CP.CROP_RATIOS = Object.keys(RATIOS);
  add({
    id: 'crop', name: 'Crop', key: 'c', icon: I.crop, cursor: 'crosshair', opts: ['cropRatio', 'cropApply'],
    activate() { this.r = null; },
    ratio() { const r = RATIOS[O.cropRatio]; return r === 'orig' ? CP.doc.width / CP.doc.height : r; },
    hit(p) {
      if (!this.r) return null; const d = CP.doc, r = this.r, tol = 10 / d.zoom;
      const near = (a, b) => Math.abs(a - b) < tol;
      const L = near(p.x, r.x), R = near(p.x, r.x + r.w), Tt = near(p.y, r.y), B = near(p.y, r.y + r.h);
      const inX = p.x > r.x - tol && p.x < r.x + r.w + tol, inY = p.y > r.y - tol && p.y < r.y + r.h + tol;
      if (inX && inY) { const h = (Tt ? 'n' : B ? 's' : '') + (L ? 'w' : R ? 'e' : ''); if (h) return h; }
      if (p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h) return 'move';
      return null;
    },
    down(p) {
      this.drag = this.hit(p) || 'new'; this.start = p; this.orig = this.r ? { ...this.r } : null;
      if (this.drag === 'new') { this.r = { x: p.x, y: p.y, w: 0, h: 0 }; this.orig = { ...this.r }; }
    },
    move(p) {
      if (!this.drag) { const h = this.hit(p); CP.setCursor(h === 'move' ? 'move' : h ? h + '-resize' : 'crosshair'); return; }
      const o = this.orig, dx = p.x - this.start.x, dy = p.y - this.start.y, ar = this.ratio(); let r = { ...o };
      if (this.drag === 'move') { r.x = o.x + dx; r.y = o.y + dy; }
      else if (this.drag === 'new') {
        let w = p.x - o.x, h = p.y - o.y; if (ar) { h = Math.sign(h || 1) * Math.abs(w) / ar; }
        r = { x: w < 0 ? o.x + w : o.x, y: h < 0 ? o.y + h : o.y, w: Math.abs(w), h: Math.abs(h) };
      } else {
        const hd = this.drag;
        if (hd.includes('w')) { r.x = o.x + dx; r.w = o.w - dx; } if (hd.includes('e')) r.w = o.w + dx;
        if (hd.includes('n')) { r.y = o.y + dy; r.h = o.h - dy; } if (hd.includes('s')) r.h = o.h + dy;
        if (ar) { if (hd === 'n' || hd === 's') r.w = r.h * ar; else { const nh = r.w / ar; if (hd.includes('n')) r.y = o.y + o.h - nh; r.h = nh; } }
        if (r.w < 0) { r.x += r.w; r.w = -r.w; } if (r.h < 0) { r.y += r.h; r.h = -r.h; }
      }
      this.r = r; CP.requestRender(); CP.emit('cropchange');
    },
    up() { this.drag = null; if (this.r && (this.r.w < 3 || this.r.h < 3)) this.r = null; CP.requestRender(); CP.emit('cropchange'); },
    dbl() { this.apply(); },
    apply() {
      const d = CP.doc; if (!this.r) return;
      const r = { x: Math.round(this.r.x), y: Math.round(this.r.y), w: Math.round(this.r.w), h: Math.round(this.r.h) };
      this.r = null;
      d.transformAll(r.w, r.h, (g, src) => g.drawImage(src, -r.x, -r.y), 'Crop');
      CP.zoomFit(); CP.emit('cropchange');
    },
    keydown(e) { if (e.key === 'Enter' && this.r) { this.apply(); return true; } if (e.key === 'Escape' && this.r) { this.r = null; CP.requestRender(); CP.emit('cropchange'); return true; } },
    deactivate() { this.r = null; },
    overlay(g, d) {
      if (!this.r) return; const r = this.r, a = CP.docToScreen(r.x, r.y), w = r.w * d.zoom, h = r.h * d.zoom; const { w: W, h: H } = CP.stageSize();
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.rect(0, 0, W, H); g.rect(a.x, a.y, w, h); g.fill('evenodd');
      g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.strokeRect(a.x, a.y, w, h);
      g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1; g.beginPath();
      for (let i = 1; i < 3; i++) { g.moveTo(a.x + w * i / 3, a.y); g.lineTo(a.x + w * i / 3, a.y + h); g.moveTo(a.x, a.y + h * i / 3); g.lineTo(a.x + w, a.y + h * i / 3); } g.stroke();
      g.fillStyle = '#fff'; for (const [hx, hy] of [[0, 0], [0.5, 0], [1, 0], [0, 0.5], [1, 0.5], [0, 1], [0.5, 1], [1, 1]]) g.fillRect(a.x + w * hx - 4, a.y + h * hy - 4, 8, 8);
      g.font = '12px sans-serif'; g.fillText(`${Math.round(r.w)} × ${Math.round(r.h)}  ·  Enter to crop`, a.x + 4, a.y - 8);
    },
  });

  /* ---------- Free transform ---------- */
  add({
    id: 'transform', name: 'Free Transform (Ctrl+T)', key: '', icon: I.transform, cursor: 'default', opts: ['transformApply'],
    activate() { this.begin(); },
    begin() {
      const d = CP.doc; this.s = null; if (!d || !editable(d)) return;
      const l = d.layer;
      const content = U.clone(l.canvas); const base = U.clone(l.canvas);
      if (d.selection) {
        const g = content.getContext('2d'); g.globalCompositeOperation = 'destination-in'; g.drawImage(d.selection.mask, 0, 0);
        const bg = base.getContext('2d'); bg.globalCompositeOperation = 'destination-out'; bg.drawImage(d.selection.mask, 0, 0);
      } else base.getContext('2d').clearRect(0, 0, d.width, d.height);
      const b = contentBounds(content); if (!b) { toast('Nothing to transform on this layer'); return; }
      const src = U.canvas(b.w, b.h); src.getContext('2d').drawImage(content, -b.x, -b.y);
      this.s = { src, base, cx: b.x + b.w / 2, cy: b.y + b.h / 2, w: b.w, h: b.h, a: 0, ow: b.w, oh: b.h };
      this.pv = U.canvas(d.width, d.height);
      d.preview = { canvas: this.pv, replace: true, clip: false };
      this.draw();
    },
    draw() {
      const d = CP.doc, s = this.s, g = this.pv.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, d.width, d.height); g.drawImage(s.base, 0, 0);
      g.translate(s.cx, s.cy); g.rotate(s.a); g.imageSmoothingQuality = 'high'; g.drawImage(s.src, -s.w / 2, -s.h / 2, s.w, s.h); g.setTransform(1, 0, 0, 1, 0, 0);
      d.changed();
    },
    local(p) { const s = this.s, c = Math.cos(-s.a), si = Math.sin(-s.a), x = p.x - s.cx, y = p.y - s.cy; return { x: x * c - y * si, y: x * si + y * c }; },
    hit(p) {
      const s = this.s; if (!s) return null; const q = this.local(p), tol = 10 / CP.doc.zoom, hw = Math.abs(s.w) / 2, hh = Math.abs(s.h) / 2;
      const nx = Math.abs(q.x + hw) < tol ? 'w' : Math.abs(q.x - hw) < tol ? 'e' : '', ny = Math.abs(q.y + hh) < tol ? 'n' : Math.abs(q.y - hh) < tol ? 's' : '';
      if ((nx || ny) && Math.abs(q.x) < hw + tol && Math.abs(q.y) < hh + tol) return ny + nx;
      if (Math.abs(q.x) < hw && Math.abs(q.y) < hh) return 'move';
      return 'rotate';
    },
    down(p) { if (!this.s) this.begin(); if (!this.s) return; this.drag = this.hit(p); this.start = p; this.o = { ...this.s }; },
    move(p, e) {
      const s = this.s; if (!s) return;
      if (!this.drag) { const h = this.hit(p); CP.setCursor(h === 'move' ? 'move' : h === 'rotate' ? 'alias' : h ? h + '-resize' : 'default'); return; }
      const o = this.o;
      if (this.drag === 'move') { s.cx = o.cx + p.x - this.start.x; s.cy = o.cy + p.y - this.start.y; }
      else if (this.drag === 'rotate') { const a0 = Math.atan2(this.start.y - o.cy, this.start.x - o.cx), a1 = Math.atan2(p.y - o.cy, p.x - o.cx); s.a = o.a + a1 - a0; if (e.shiftKey) s.a = Math.round(s.a / (Math.PI / 12)) * (Math.PI / 12); }
      else {
        const q = this.local(p), hd = this.drag; let w = o.w, h = o.h;
        if (hd.includes('e')) w = q.x * 2; if (hd.includes('w')) w = -q.x * 2; if (hd.includes('s')) h = q.y * 2; if (hd.includes('n')) h = -q.y * 2;
        if (hd.length === 2 && !e.shiftKey) { const k = Math.max(w / o.w, h / o.h); w = o.w * k; h = o.h * k; }
        if (!e.altKey) { // anchor opposite side instead of centre
          const dw = w - o.w, dh = h - o.h, sx = hd.includes('e') ? 1 : hd.includes('w') ? -1 : 0, sy = hd.includes('s') ? 1 : hd.includes('n') ? -1 : 0;
          const lx = sx * dw / 2, ly = sy * dh / 2, c = Math.cos(o.a), si = Math.sin(o.a);
          s.cx = o.cx + lx * c - ly * si; s.cy = o.cy + lx * si + ly * c;
          w = o.w + dw; h = o.h + dh;
        }
        s.w = Math.abs(w) < 1 ? 1 : w; s.h = Math.abs(h) < 1 ? 1 : h;
      }
      this.draw(); CP.requestRender();
    },
    up() { this.drag = null; },
    apply() {
      const d = CP.doc; if (!this.s) return; const l = d.layer;
      l.ctx.clearRect(0, 0, d.width, d.height); l.ctx.drawImage(this.pv, 0, 0);
      d.preview = null; this.s = null; d.selection = null; d.markDirty(l); d.commit('Transform');
    },
    cancel() { const d = CP.doc; if (d) d.preview = null; this.s = null; d && d.changed(); },
    keydown(e) { if (e.key === 'Enter' && this.s) { this.apply(); CP.selectTool('move'); return true; } if (e.key === 'Escape' && this.s) { this.cancel(); CP.selectTool('move'); return true; } },
    deactivate() { if (this.s) this.apply(); },
    overlay(g, d) {
      const s = this.s; if (!s) return; const c = CP.docToScreen(s.cx, s.cy);
      g.translate(c.x, c.y); g.rotate(s.a); const w = s.w * d.zoom, h = s.h * d.zoom;
      g.strokeStyle = '#38bdf8'; g.lineWidth = 1.5; g.strokeRect(-w / 2, -h / 2, w, h);
      g.fillStyle = '#fff'; g.strokeStyle = '#0c6aa0';
      for (const [hx, hy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) { g.fillRect(hx * w / 2 - 4, hy * h / 2 - 4, 8, 8); g.strokeRect(hx * w / 2 - 4, hy * h / 2 - 4, 8, 8); }
      g.beginPath(); g.arc(0, 0, 4, 0, 7); g.stroke();
    },
  });
  function contentBounds(c) {
    const w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
  CP.contentBounds = contentBounds;

  /* ---------- painting ---------- */
  paintTool('brush', 'Brush', 'b', I.brush);
  paintTool('pencil', 'Pencil', 'n', I.pencil, { aliased: true });
  paintTool('airbrush', 'Airbrush', 'a', I.air, { airbrush: true });
  paintTool('eraser', 'Eraser', 'e', I.eraser, { eraser: true });

  add({
    id: 'fill', name: 'Paint Bucket', key: 'g', icon: I.fill, cursor: 'crosshair', opts: ['tolerance', 'contiguous', 'sampleAll', 'opacity'],
    down(p) {
      const d = CP.doc; if (!editable(d)) return; const x = Math.floor(p.x), y = Math.floor(p.y); if (x < 0 || y < 0 || x >= d.width || y >= d.height) return;
      const src = O.sampleAll ? d.renderComposite() : d.layer.canvas;
      const m = floodMask(src, x, y, O.tolerance, O.contiguous);
      d.applyToLayer(maskToCanvas(m, d.width, d.height, CP.colors.fg), { alpha: O.opacity / 100 }); d.commit('Fill');
    },
  });

  add({
    id: 'gradient', name: 'Gradient', key: 'g', icon: I.gradient, cursor: 'crosshair', opts: ['gradType', 'gradMode', 'opacity'],
    down(p) { if (!editable(CP.doc)) return; this.a = p; this.b = p; },
    move(p, e) {
      if (!this.a) return; let b = p;
      if (e.shiftKey) { const ang = Math.round(Math.atan2(p.y - this.a.y, p.x - this.a.x) / (Math.PI / 4)) * (Math.PI / 4), len = Math.hypot(p.x - this.a.x, p.y - this.a.y); b = { x: this.a.x + Math.cos(ang) * len, y: this.a.y + Math.sin(ang) * len }; }
      this.b = b; this.render();
    },
    render() {
      const d = CP.doc, sc = strokeCanvas(d), g = sc.getContext('2d'), { a, b } = this, len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      let gr;
      if (O.gradType === 'radial') gr = g.createRadialGradient(a.x, a.y, 0, a.x, a.y, len);
      else if (O.gradType === 'angle' && g.createConicGradient) gr = g.createConicGradient(Math.atan2(b.y - a.y, b.x - a.x), a.x, a.y);
      else if (O.gradType === 'reflected') { gr = g.createLinearGradient(a.x - (b.x - a.x), a.y - (b.y - a.y), b.x, b.y); }
      else gr = g.createLinearGradient(a.x, a.y, b.x, b.y);
      const fg = CP.colors.fg, rgb = U.hexToRgb(fg), end = O.gradMode === 'fg-transparent' ? `rgba(${rgb.r},${rgb.g},${rgb.b},0)` : CP.colors.bg;
      if (O.gradType === 'reflected') { gr.addColorStop(0, end); gr.addColorStop(0.5, fg); gr.addColorStop(1, end); }
      else { gr.addColorStop(0, fg); gr.addColorStop(1, end); }
      g.fillStyle = gr; g.fillRect(0, 0, d.width, d.height);
      d.preview = { canvas: sc, alpha: O.opacity / 100 }; d.changed();
    },
    up() {
      const d = CP.doc; if (!this.a) return; this.a = null;
      if (d.preview) { const pv = d.preview; d.preview = null; d.applyToLayer(pv.canvas, { alpha: pv.alpha }); d.commit('Gradient'); }
    },
    overlay(g) { if (!this.a) return; const a = CP.docToScreen(this.a.x, this.a.y), b = CP.docToScreen(this.b.x, this.b.y); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.fillStyle = '#38bdf8'; for (const q of [a, b]) { g.beginPath(); g.arc(q.x, q.y, 5, 0, 7); g.fill(); } },
  });

  /* ---------- retouch (direct pixel dabs) ---------- */
  function selAlpha(d, x, y, w, h) {
    if (!d.selection) return null;
    return d.selection.mctx.getImageData(x, y, w, h).data;
  }
  function retouchTool(id, name, key, icon, opts, apply) {
    return add({
      id, name, key, icon, cursor: 'none', opts,
      down(p, e) {
        const d = CP.doc; if (!editable(d)) return;
        if (this.alt && this.alt(p, e)) return;
        this.st = { lx: p.x, ly: p.y, lp: 1, sx: p.x, sy: p.y, size: O.size, spacing: 0.2 };
        if (this.begin && this.begin(p, e) === false) { this.st = null; return; }
        this.dab(p.x, p.y);
      },
      dab(x, y) {
        const d = CP.doc, r = O.size / 2, x0 = Math.max(0, Math.floor(x - r)), y0 = Math.max(0, Math.floor(y - r));
        const x1 = Math.min(d.width, Math.ceil(x + r)), y1 = Math.min(d.height, Math.ceil(y + r)), w = x1 - x0, h = y1 - y0; if (w <= 0 || h <= 0) return;
        const l = d.layer, id = l.ctx.getImageData(x0, y0, w, h), sa = selAlpha(d, x0, y0, w, h);
        const hard = O.hardness / 100, k = O.strength / 100;
        const wt = new Float32Array(w * h);
        for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
          const dist = Math.hypot(x0 + xx + 0.5 - x, y0 + yy + 0.5 - y) / r; if (dist >= 1) continue;
          let f = dist <= hard ? 1 : 1 - (dist - hard) / (1 - hard || 1); f *= k; if (sa) f *= sa[(yy * w + xx) * 4 + 3] / 255; wt[yy * w + xx] = f;
        }
        apply.call(this, id, wt, { x0, y0, w, h, l, d, x, y });
        l.ctx.putImageData(id, x0, y0); d.markDirty(l);
      },
      move(p) { if (!this.st) return; const q = smooth(this.st, p); walk(this.st, q, 1, (x, y) => this.dab(x, y)); },
      up() { if (!this.st) return; this.st = null; CP.doc.commit(name); },
      overlay: brushCursor,
    });
  }
  retouchTool('dodge', 'Dodge (lighten)', 'o', I.dodge, ['size', 'hardness', 'strength'], function (id, wt) {
    const d = id.data; for (let i = 0; i < wt.length; i++) { const f = wt[i] * 0.25; if (!f) continue; const j = i * 4; for (let c = 0; c < 3; c++) d[j + c] += (255 - d[j + c]) * f; }
  });
  retouchTool('burn', 'Burn (darken)', 'o', I.burn, ['size', 'hardness', 'strength'], function (id, wt) {
    const d = id.data; for (let i = 0; i < wt.length; i++) { const f = wt[i] * 0.25; if (!f) continue; const j = i * 4; for (let c = 0; c < 3; c++) d[j + c] -= d[j + c] * f; }
  });
  retouchTool('blurtool', 'Blur Brush', 'r', I.blurb, ['size', 'hardness', 'strength'], function (id, wt, ctx) {
    const pad = 4, { x0, y0, w, h, l, d } = ctx;
    const ex = Math.max(0, x0 - pad), ey = Math.max(0, y0 - pad), ew = Math.min(d.width, x0 + w + pad) - ex, eh = Math.min(d.height, y0 + h + pad) - ey;
    const big = U.canvas(ew, eh); big.getContext('2d').drawImage(l.canvas, -ex, -ey);
    const bd = CP.blurCanvas(big, 3).getContext('2d').getImageData(x0 - ex, y0 - ey, w, h).data, s = id.data;
    for (let i = 0; i < wt.length; i++) { const f = wt[i] * 0.6; if (!f) continue; const j = i * 4; for (let c = 0; c < 4; c++) s[j + c] = U.lerp(s[j + c], bd[j + c], f); }
  });
  retouchTool('sharpentool', 'Sharpen Brush', 'r', 'M12 3l9 18H3z', ['size', 'hardness', 'strength'], function (id, wt, ctx) {
    const { x0, y0, w, h, l, d } = ctx, pad = 4;
    const ex = Math.max(0, x0 - pad), ey = Math.max(0, y0 - pad), ew = Math.min(d.width, x0 + w + pad) - ex, eh = Math.min(d.height, y0 + h + pad) - ey;
    const big = U.canvas(ew, eh); big.getContext('2d').drawImage(l.canvas, -ex, -ey);
    const bd = CP.blurCanvas(big, 2).getContext('2d').getImageData(x0 - ex, y0 - ey, w, h).data, s = id.data;
    for (let i = 0; i < wt.length; i++) { const f = wt[i] * 0.5; if (!f) continue; const j = i * 4; for (let c = 0; c < 3; c++) s[j + c] += (s[j + c] - bd[j + c]) * f; }
  });
  const smudge = retouchTool('smudge', 'Smudge', 'r', I.smudge, ['size', 'hardness', 'strength'], function (id, wt, ctx) {
    const s = id.data, n = wt.length;
    if (!this.carry || this.carry.w !== ctx.w || this.carry.h !== ctx.h) { this.carry = { w: ctx.w, h: ctx.h, d: new Float32Array(s) }; return; }
    const c = this.carry.d;
    for (let i = 0; i < n; i++) { const f = wt[i]; const j = i * 4; for (let k = 0; k < 4; k++) { const v = U.lerp(s[j + k], c[j + k], f); s[j + k] = v; c[j + k] = U.lerp(c[j + k], v, 0.35); } }
  });
  smudge.begin = function () { this.carry = null; };
  retouchTool('redeye', 'Red-Eye Fix', 'j', I.redeye, ['size'], function (id, wt) {
    const d = id.data; for (let i = 0; i < wt.length; i++) { if (!wt[i]) continue; const j = i * 4, r = d[j], g = d[j + 1], b = d[j + 2]; if (r > 80 && r > (g + b) * 0.75) { const v = (g + b) / 2; d[j] = U.lerp(r, v, Math.min(1, wt[i] * 2)); } }
  });

  /* clone stamp */
  add({
    id: 'clone', name: 'Clone Stamp (Alt+click to set source)', key: 's', icon: I.clone, cursor: 'none', opts: ['size', 'opacity', 'hardness', 'cloneAligned', 'sampleAll'],
    down(p, e) {
      const d = CP.doc;
      if (e.altKey) { this.src = { x: p.x, y: p.y }; this.offset = null; toast('Clone source set'); return; }
      if (!this.src) { toast('Alt+click (Option+click) to set a clone source first'); return; }
      if (!editable(d)) return;
      if (!this.offset || !O.cloneAligned) this.offset = { x: this.src.x - p.x, y: this.src.y - p.y };
      this.snap = O.sampleAll ? U.clone(d.renderComposite()) : U.clone(d.layer.canvas);
      const sc = strokeCanvas(d);
      this.st = { lx: p.x, ly: p.y, lp: 1, sx: p.x, sy: p.y, size: O.size, spacing: 0.1, g: sc.getContext('2d') };
      d.preview = { canvas: sc, alpha: O.opacity / 100 };
      this.stamp(p.x, p.y); d.changed();
    },
    stamp(x, y) {
      const dc = dab(O.size, O.hardness, '#000000'), s = dc.width;
      if (!this.tmp || this.tmp.width !== s) this.tmp = U.canvas(s, s);
      const g = this.tmp.getContext('2d'); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, s, s);
      g.drawImage(this.snap, -(x + this.offset.x - s / 2), -(y + this.offset.y - s / 2));
      g.globalCompositeOperation = 'destination-in'; g.drawImage(dc, 0, 0);
      this.st.g.drawImage(this.tmp, x - s / 2, y - s / 2);
    },
    move(p) { if (!this.st) return; walk(this.st, smooth(this.st, p), 1, (x, y) => this.stamp(x, y)); CP.doc.changed(); },
    up() { const d = CP.doc; if (!this.st) return; const pv = d.preview; d.preview = null; d.applyToLayer(pv.canvas, { alpha: pv.alpha }); d.commit('Clone'); this.st = null; this.snap = null; },
    overlay(g, d) {
      brushCursor(g, d);
      if (this.src && T.pointer) {
        const sp = this.st && this.offset ? { x: T.pointer.x + this.offset.x, y: T.pointer.y + this.offset.y } : (this.offset && O.cloneAligned ? { x: T.pointer.x + this.offset.x, y: T.pointer.y + this.offset.y } : this.src);
        const s = CP.docToScreen(sp.x, sp.y); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(s.x - 6, s.y); g.lineTo(s.x + 6, s.y); g.moveTo(s.x, s.y - 6); g.lineTo(s.x, s.y + 6); g.stroke();
      }
    },
  });

  /* ---------- shapes ---------- */
  CP.SHAPES = [['rect', 'Rectangle'], ['roundrect', 'Rounded'], ['ellipse', 'Ellipse'], ['line', 'Line'], ['arrow', 'Arrow'], ['triangle', 'Triangle'], ['star', 'Star'], ['heart', 'Heart'], ['bubble', 'Speech bubble']];
  function shapePath(g, type, a, b, alt) {
    let x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
    if (alt) { x = a.x - w; y = a.y - h; w *= 2; h *= 2; }
    g.beginPath();
    switch (type) {
      case 'rect': g.rect(x, y, w, h); break;
      case 'roundrect': { const r = Math.min(O.radius, w / 2, h / 2); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); break; }
      case 'ellipse': g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); break;
      case 'line': g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); break;
      case 'arrow': { const ang = Math.atan2(b.y - a.y, b.x - a.x), hl = Math.max(12, O.strokeW * 4); g.moveTo(a.x, a.y); g.lineTo(b.x - Math.cos(ang) * hl * 0.6, b.y - Math.sin(ang) * hl * 0.6);
        g.moveTo(b.x, b.y); g.lineTo(b.x - hl * Math.cos(ang - 0.45), b.y - hl * Math.sin(ang - 0.45)); g.lineTo(b.x - hl * Math.cos(ang + 0.45), b.y - hl * Math.sin(ang + 0.45)); g.closePath(); break; }
      case 'triangle': g.moveTo(x + w / 2, y); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.closePath(); break;
      case 'star': { const cx = x + w / 2, cy = y + h / 2; for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.42 : 1, an = -Math.PI / 2 + i * Math.PI / 5; const px = cx + Math.cos(an) * w / 2 * r, py = cy + Math.sin(an) * h / 2 * r * 1.05; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); break; }
      case 'heart': { g.moveTo(x + w / 2, y + h * 0.3); g.bezierCurveTo(x + w / 2, y, x, y, x, y + h * 0.32); g.bezierCurveTo(x, y + h * 0.6, x + w / 2, y + h * 0.8, x + w / 2, y + h); g.bezierCurveTo(x + w / 2, y + h * 0.8, x + w, y + h * 0.6, x + w, y + h * 0.32); g.bezierCurveTo(x + w, y, x + w / 2, y, x + w / 2, y + h * 0.3); g.closePath(); break; }
      case 'bubble': { const r = Math.min(24, w / 4, h / 4), bh = h * 0.78; g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + bh, r); g.arcTo(x + w, y + bh, x, y + bh, r); g.lineTo(x + w * 0.38, y + bh); g.lineTo(x + w * 0.2, y + h); g.lineTo(x + w * 0.25, y + bh); g.arcTo(x, y + bh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); break; }
    }
  }
  add({
    id: 'shape', name: 'Shapes', key: 'u', icon: I.shape, cursor: 'crosshair', opts: ['shape', 'shapeStyle', 'strokeW', 'radius', 'opacity', 'shapeLayer'],
    down(p) { if (!CP.doc || (!O.shapeLayer && !editable(CP.doc))) return; this.a = p; this.b = p; },
    move(p, e) {
      if (!this.a) return; let b = { ...p };
      if (e.shiftKey) {
        if (O.shape === 'line' || O.shape === 'arrow') { const ang = Math.round(Math.atan2(p.y - this.a.y, p.x - this.a.x) / (Math.PI / 4)) * (Math.PI / 4), len = Math.hypot(p.x - this.a.x, p.y - this.a.y); b = { x: this.a.x + Math.cos(ang) * len, y: this.a.y + Math.sin(ang) * len }; }
        else { const s = Math.max(Math.abs(p.x - this.a.x), Math.abs(p.y - this.a.y)); b = { x: this.a.x + Math.sign(p.x - this.a.x || 1) * s, y: this.a.y + Math.sign(p.y - this.a.y || 1) * s }; }
      }
      this.b = b; this.alt = e.altKey; this.render();
    },
    render() {
      const d = CP.doc, sc = strokeCanvas(d), g = sc.getContext('2d');
      shapePath(g, O.shape, this.a, this.b, this.alt);
      const line = O.shape === 'line' || O.shape === 'arrow';
      g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = O.strokeW;
      if (line) { g.strokeStyle = CP.colors.fg; g.stroke(); if (O.shape === 'arrow') { g.fillStyle = CP.colors.fg; g.fill(); } }
      else {
        if (O.shapeStyle !== 'stroke') { g.fillStyle = CP.colors.fg; g.fill(); }
        if (O.shapeStyle !== 'fill') { g.strokeStyle = O.shapeStyle === 'both' ? CP.colors.bg : CP.colors.fg; g.stroke(); }
      }
      d.preview = { canvas: sc, alpha: O.opacity / 100, clip: !O.shapeLayer }; d.changed();
    },
    up() {
      const d = CP.doc; if (!this.a) return; this.a = null; const pv = d.preview; d.preview = null;
      if (!pv) { d.changed(); return; }
      if (O.shapeLayer) {
        const name = (CP.SHAPES.find((s) => s[0] === O.shape) || [0, 'Shape'])[1];
        const l = d.addLayer(name); l.ctx.globalAlpha = pv.alpha; l.ctx.drawImage(pv.canvas, 0, 0); l.ctx.globalAlpha = 1; d.markDirty(l);
        CP.emit('layers', d);
      } else d.applyToLayer(pv.canvas, { alpha: pv.alpha });
      d.commit('Shape');
    },
  });

  /* ---------- text ---------- */
  CP.FONTS = ['Montserrat, sans-serif', 'Inter, sans-serif', 'Arial, sans-serif', 'Helvetica, sans-serif', 'Georgia, serif', 'Times New Roman, serif', 'Courier New, monospace', 'Impact, sans-serif', 'Comic Sans MS, cursive', 'Trebuchet MS, sans-serif', 'Verdana, sans-serif', 'Chakra Petch, sans-serif', 'Playfair Display, serif', 'Pacifico, cursive', 'Bebas Neue, sans-serif', 'Permanent Marker, cursive', 'Lobster, cursive'];
  const fontStr = () => `${O.italic ? 'italic ' : ''}${O.bold ? '700 ' : '400 '}${O.fontSize}px ${O.font}`;
  add({
    id: 'text', name: 'Text', key: 't', icon: I.text, cursor: 'text', opts: ['font', 'fontSize', 'bold', 'italic', 'align', 'textStroke', 'textShadow'],
    down(p) {
      const d = CP.doc; if (!d) return;
      if (this.box) { this.commit(); return; }
      this.pos = p;
      const ta = U.el('textarea', { class: 'text-editor', spellcheck: 'false', placeholder: 'Type here', 'aria-label': 'Text' });
      this.box = ta; this.style();
      document.getElementById('stage-wrap').append(ta);
      ta.addEventListener('input', () => this.autosize());
      ta.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') { this.cancel(); } if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { this.commit(); } });
      setTimeout(() => ta.focus(), 0);
    },
    style() {
      const ta = this.box; if (!ta) return; const d = CP.doc; const s = CP.docToScreen(this.pos.x, this.pos.y);
      Object.assign(ta.style, { left: s.x + 'px', top: s.y + 'px', font: fontStr().replace(/(\d+)px/, (m, n) => n * d.zoom + 'px'), color: CP.colors.fg, textAlign: O.align, lineHeight: 1.2 });
      this.autosize();
    },
    autosize() { const ta = this.box; ta.style.width = '10px'; ta.style.height = '10px'; ta.style.width = Math.max(60, ta.scrollWidth + 8) + 'px'; ta.style.height = ta.scrollHeight + 'px'; },
    commit() {
      const d = CP.doc, ta = this.box; if (!ta) return; const text = ta.value; ta.remove(); this.box = null;
      if (!text.trim()) return;
      const l = d.addLayer(text.split('\n')[0].slice(0, 24) || 'Text'); const g = l.ctx;
      g.font = fontStr(); g.textBaseline = 'top'; g.textAlign = O.align; const lines = text.split('\n'), lh = O.fontSize * 1.2;
      const widths = lines.map((t) => g.measureText(t).width), maxW = Math.max(...widths);
      const ax = O.align === 'center' ? this.pos.x + maxW / 2 : O.align === 'right' ? this.pos.x + maxW : this.pos.x;
      if (O.textShadow) { g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = O.fontSize * 0.12; g.shadowOffsetY = O.fontSize * 0.06; }
      lines.forEach((t, i) => {
        const y = this.pos.y + i * lh + 2;
        if (O.textStroke > 0) { g.lineJoin = 'round'; g.lineWidth = O.textStroke * 2; g.strokeStyle = CP.colors.bg; g.strokeText(t, ax, y); }
        g.fillStyle = CP.colors.fg; g.fillText(t, ax, y);
      });
      d.markDirty(l); CP.emit('layers', d); d.commit('Text');
    },
    cancel() { if (this.box) { this.box.remove(); this.box = null; } },
    deactivate() { this.commit(); },
    keydown(e) { return false; },
  });
  CP.on('zoom', () => { const t = T.byId.text; if (t.box) t.style(); });
  CP.on('rendered', () => { const t = T.byId.text; if (t && t.box && CP.doc) { const s = CP.docToScreen(t.pos.x, t.pos.y); t.box.style.left = s.x + 'px'; t.box.style.top = s.y + 'px'; } });

  /* ---------- eyedropper, hand, zoom ---------- */
  add({
    id: 'picker', name: 'Eyedropper', key: 'i', icon: I.picker, cursor: 'crosshair', opts: ['sampleAll'],
    down(p, e) { this.pick(p, e); this.on = true; }, move(p, e) { if (this.on) this.pick(p, e); }, up() { this.on = false; },
    pick(p, e) { const c = pickColor(CP.doc, p); if (c) CP.setColor(e.altKey ? 'bg' : 'fg', c); },
  });
  add({
    id: 'hand', name: 'Hand (or hold Space)', key: 'h', icon: I.hand, cursor: 'grab', opts: [],
    down(p, e) { this.s = { x: e.clientX, y: e.clientY, px: CP.doc.panX, py: CP.doc.panY }; CP.setCursor('grabbing'); },
    move(p, e) { if (!this.s) return; const d = CP.doc; d.panX = this.s.px + e.clientX - this.s.x; d.panY = this.s.py + e.clientY - this.s.y; CP.requestRender(); CP.emit('zoom', d); },
    up() { this.s = null; CP.setCursor('grab'); },
  });
  add({
    id: 'zoom', name: 'Zoom (Alt to zoom out)', key: 'z', icon: I.zoom, cursor: 'zoom-in', opts: [],
    down(p, e) { const r = document.getElementById('stage').getBoundingClientRect(); CP.zoomStep(e.altKey ? -1 : 1, e.clientX - r.left, e.clientY - r.top); },
  });

  CP.toolGroups = [
    ['move', 'transform'], ['select-rect', 'select-ellipse', 'lasso', 'wand'], ['crop'],
    ['brush', 'pencil', 'airbrush'], ['eraser'], ['fill', 'gradient'], ['clone', 'redeye'], ['blurtool', 'sharpentool', 'smudge'], ['dodge', 'burn'],
    ['text'], ['shape'], ['picker'], ['hand', 'zoom'],
  ];
})(window.CP);
