/* CydArt core: utilities, layers, documents, history, selection, viewport rendering. */
window.CP = window.CP || {};
(function (CP) {
  'use strict';

  /* ---------------- utilities ---------------- */
  const U = CP.util = {};
  U.$ = (s, r = document) => r.querySelector(s);
  U.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  let _uid = 1;
  U.uid = () => 'id' + Date.now().toString(36) + (_uid++).toString(36);
  U.canvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    return c;
  };
  U.ctx = (c) => c.getContext('2d');
  U.clone = (src) => { const c = U.canvas(src.width, src.height); c.getContext('2d').drawImage(src, 0, 0); return c; };
  U.el = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const k in attrs) {
      const v = attrs[k];
      if (k === 'class') e.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (k === 'html') e.innerHTML = v;
      else if (v === true) e.setAttribute(k, '');
      else if (v !== false && v != null) e.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(kid));
    return e;
  };
  U.hexToRgb = (hex) => {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const n = parseInt(hex.slice(0, 6), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };
  U.rgbToHex = (r, g, b) => '#' + [r, g, b].map((v) => U.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  U.rgbToHsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6;
    }
    return [h, s, l];
  };
  U.hslToRgb = (h, s, l) => {
    if (s === 0) return [l * 255, l * 255, l * 255];
    const f = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255];
  };
  U.fmtBytes = (n) => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : n < 1073741824 ? (n / 1048576).toFixed(1) + ' MB' : (n / 1073741824).toFixed(2) + ' GB';
  /* Save a file. Inside the claude.ai viewer, use its downloads capability (zipping formats it doesn't allow). */
  const VIEWER_EXTS = ['gif', 'png', 'jpg', 'jpeg', 'webp', 'svg', 'pdf', 'zip', 'json', 'txt', 'html'];
  let dlCap;
  const viewerDownloads = () => {
    if (dlCap === undefined) dlCap = (window.claude && window.claude.use) ? Promise.race([window.claude.use('downloads').catch(() => null), new Promise((r) => setTimeout(() => r(null), 3000))]) : Promise.resolve(null);
    return dlCap;
  };
  /* Desktop app bridge: the app serves these pages from 127.0.0.1 with ?desktop=<token>. */
  CP.desktop = (() => {
    try {
      const m = location.search.match(/[?&]desktop=([\w-]+)/);
      if (m) { sessionStorage.setItem('cp-desktop', m[1]); return { token: m[1] }; }
      const t = sessionStorage.getItem('cp-desktop'); return t ? { token: t } : null;
    } catch (e) { return null; }
  })();
  CP.desktopCall = async (path, body, type, extraHeaders) => {
    const r = await fetch(location.origin + '/__desktop/' + path, { method: body ? 'POST' : 'GET', body, headers: Object.assign({ 'X-Cyd-Token': CP.desktop.token }, extraHeaders || {}) });
    if (!r.ok) throw new Error((await r.text()) || ('Desktop app error ' + r.status));
    return type ? new Blob([await r.arrayBuffer()], { type }) : r.json();
  };
  /* files the desktop app was asked to open (double-click, Open with, or a second launch) */
  CP.desktopFiles = async () => {
    if (!CP.desktop) return [];
    const list = await CP.desktopCall('launch');
    return Promise.all(list.map(async (f) => { const r = await fetch(location.origin + '/__desktop/file/' + f.id, { headers: { 'X-Cyd-Token': CP.desktop.token } }); return new File([await r.blob()], f.name, { lastModified: f.mtime || Date.now() }); }));
  };
  U.download = async (blob, name) => {
    if (CP.desktop) {
      try { const res = await CP.desktopCall('save?name=' + encodeURIComponent(name), blob); if (res && res.saved) CP.ui && CP.ui.toast('Saved ' + res.path, 4000); }
      catch (e) { CP.ui && CP.ui.error('Could not save', e); }
      return;
    }
    const cap = await viewerDownloads();
    if (cap) {
      let data = blob, filename = name;
      if (!VIEWER_EXTS.includes(U.ext(name))) {
        const fflate = await CP.loadZip();
        const zip = await new Promise((res, rej) => blob.arrayBuffer().then((b) => fflate.zip({ [name]: [new Uint8Array(b), { level: 0 }] }, (e, o) => (e ? rej(e) : res(o)))));
        data = new Blob([zip], { type: 'application/zip' }); filename = name + '.zip';
        CP.ui && CP.ui.toast(`${U.ext(name).toUpperCase()} files are delivered inside a .zip here`, 5000);
      }
      try { await cap.save({ filename, data }); } catch (e) { if (e && e.code !== 'declined') CP.ui && CP.ui.toast('Could not save: ' + (e.message || e.code)); }
      return;
    }
    const a = U.el('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 20000);
  };
  U.baseName = (n) => (n || 'Untitled').replace(/\.[^.]+$/, '');
  U.ext = (n) => ((n || '').match(/\.([^.]+)$/) || [, ''])[1].toLowerCase();
  U.loadScript = (src) => new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src));
    document.head.append(s);
  });
  U.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  U.raf = (fn) => { let q = false; return () => { if (q) return; q = true; requestAnimationFrame(() => { q = false; fn(); }); }; };

  /* checkerboard pattern for transparency */
  let checkerPattern = null;
  U.checker = (ctx) => {
    if (!checkerPattern) {
      const c = U.canvas(16, 16), g = c.getContext('2d');
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 16, 16);
      g.fillStyle = '#d6d9de'; g.fillRect(0, 0, 8, 8); g.fillRect(8, 8, 8, 8);
      checkerPattern = c;
    }
    return ctx.createPattern(checkerPattern, 'repeat');
  };

  /* ---------------- color state ---------------- */
  CP.colors = { fg: '#1d93cf', bg: '#ffffff', listeners: [] };
  CP.setColor = (which, hex) => { CP.colors[which] = hex; CP.colors.listeners.forEach((f) => f()); };
  CP.swapColors = () => { const t = CP.colors.fg; CP.colors.fg = CP.colors.bg; CP.colors.bg = t; CP.colors.listeners.forEach((f) => f()); };

  /* ---------------- layer ---------------- */
  class Layer {
    constructor(w, h, name = 'Layer') {
      this.id = U.uid();
      this.name = name;
      this.canvas = U.canvas(w, h);
      this.ctx = this.canvas.getContext('2d');
      this.visible = true;
      this.opacity = 1;
      this.blend = 'source-over';
      this.locked = false;
      this.dirty = true;
      this.ref = null; // history canvas this layer currently matches
    }
  }
  CP.Layer = Layer;

  CP.BLEND_MODES = [
    ['source-over', 'Normal'], ['multiply', 'Multiply'], ['screen', 'Screen'], ['overlay', 'Overlay'],
    ['darken', 'Darken'], ['lighten', 'Lighten'], ['color-dodge', 'Color Dodge'], ['color-burn', 'Color Burn'],
    ['hard-light', 'Hard Light'], ['soft-light', 'Soft Light'], ['difference', 'Difference'], ['exclusion', 'Exclusion'],
    ['hue', 'Hue'], ['saturation', 'Saturation'], ['color', 'Color'], ['luminosity', 'Luminosity'],
  ];

  /* ---------------- selection ---------------- */
  class Selection {
    constructor(w, h) {
      this.w = w; this.h = h;
      this.mask = U.canvas(w, h);
      this.mctx = this.mask.getContext('2d');
      this.outline = null;
      this.bounds = null;
    }
    static fromShape(w, h, drawFn) {
      const s = new Selection(w, h);
      s.mctx.fillStyle = '#000'; drawFn(s.mctx); s.update(); return s;
    }
    clone() { const s = new Selection(this.w, this.h); s.mctx.drawImage(this.mask, 0, 0); s.outline = this.outline; s.bounds = this.bounds && { ...this.bounds }; return s; }
    combine(other, mode) {
      // mode: replace | add | subtract | intersect
      const ops = { add: 'source-over', subtract: 'destination-out', intersect: 'destination-in' };
      this.mctx.globalCompositeOperation = ops[mode] || 'source-over';
      this.mctx.drawImage(other.mask, 0, 0);
      this.mctx.globalCompositeOperation = 'source-over';
      this.update();
    }
    invert() {
      const c = U.canvas(this.w, this.h), g = c.getContext('2d');
      g.fillStyle = '#000'; g.fillRect(0, 0, this.w, this.h);
      g.globalCompositeOperation = 'destination-out'; g.drawImage(this.mask, 0, 0);
      this.mctx.clearRect(0, 0, this.w, this.h); this.mctx.drawImage(c, 0, 0); this.update();
    }
    isEmpty() { return !this.bounds; }
    /* Build crisp outline segments (pixel-edge path) and bounds from the mask. */
    update() {
      const { w, h } = this;
      const d = this.mctx.getImageData(0, 0, w, h).data;
      let minX = w, minY = h, maxX = -1, maxY = -1;
      for (let y = 0; y < h; y++) {
        const row = y * w * 4;
        for (let x = 0; x < w; x++) if (d[row + x * 4 + 3] > 127) {
          if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
      if (maxX < 0) { this.bounds = null; this.outline = null; return; }
      this.bounds = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
      const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 127;
      const p = new Path2D(); let segs = 0;
      const x0 = Math.max(0, minX - 1), x1 = Math.min(w, maxX + 2), y0 = Math.max(0, minY - 1), y1 = Math.min(h, maxY + 2);
      // horizontal edges
      for (let y = y0; y <= y1; y++) {
        let run = -1;
        for (let x = x0; x <= x1; x++) {
          const edge = x < x1 && inside(x, y) !== inside(x, y - 1);
          if (edge && run < 0) run = x;
          if (!edge && run >= 0) { p.moveTo(run, y); p.lineTo(x, y); run = -1; segs++; }
        }
      }
      for (let x = x0; x <= x1; x++) {
        let run = -1;
        for (let y = y0; y <= y1; y++) {
          const edge = y < y1 && inside(x, y) !== inside(x - 1, y);
          if (edge && run < 0) run = y;
          if (!edge && run >= 0) { p.moveTo(x, run); p.lineTo(x, y); run = -1; segs++; }
        }
      }
      this.outline = p;
      this.segs = segs;
    }
  }
  CP.Selection = Selection;

  /* ---------------- document ---------------- */
  const HISTORY_MAX = 50;
  const HISTORY_PIXEL_BUDGET = 260e6;

  class Doc {
    constructor(w, h, name = 'Untitled') {
      this.id = U.uid();
      this.width = Math.round(w); this.height = Math.round(h);
      this.name = name;
      this.layers = [];
      this.active = 0;
      this.selection = null;
      this.history = [];
      this.hIndex = -1;
      this.zoom = 1; this.panX = 0; this.panY = 0;
      this.saved = true;
      this.preview = null;     // {canvas, op, alpha} drawn above active layer while a tool works
      this.override = null;    // canvas replacing the active layer (filter preview)
      this.composite = U.canvas(this.width, this.height);
      this.needsComposite = true;
      this.libraryId = null;
      this.lastSave = null;    // {format, opts}
      this.meta = {};
    }
    get layer() { return this.layers[this.active]; }
    addLayer(name, index) {
      const l = new Layer(this.width, this.height, name || 'Layer ' + (this.layers.length + 1));
      const i = index == null ? this.active + 1 : index;
      this.layers.splice(Math.min(i, this.layers.length), 0, l);
      this.active = this.layers.indexOf(l);
      this.changed();
      return l;
    }
    markDirty(layer = this.layer) { if (layer) layer.dirty = true; this.changed(); }
    changed() { this.needsComposite = true; this.saved = false; CP.requestRender && CP.requestRender(); }

    /* Copy-on-write snapshots: unchanged layers share the previous snapshot's canvas. */
    commit(label) {
      const prev = this.history[this.hIndex];
      const layers = this.layers.map((l) => {
        let ref = null;
        if (!l.dirty && l.ref && prev && prev.layers.some((p) => p.ref === l.ref)) ref = l.ref;
        if (!ref) { ref = U.clone(l.canvas); l.ref = ref; }
        l.dirty = false;
        return { id: l.id, name: l.name, visible: l.visible, opacity: l.opacity, blend: l.blend, locked: l.locked, ref };
      });
      this.history.splice(this.hIndex + 1);
      this.history.push({ label, w: this.width, h: this.height, active: this.active, layers });
      // enforce limits
      let total = 0; const seen = new Set();
      for (let i = this.history.length - 1; i >= 0; i--) {
        for (const l of this.history[i].layers) if (!seen.has(l.ref)) { seen.add(l.ref); total += l.ref.width * l.ref.height; }
        if ((total > HISTORY_PIXEL_BUDGET || this.history.length - i > HISTORY_MAX) && i < this.history.length - 1) {
          this.history.splice(0, i + 1); break;
        }
      }
      this.hIndex = this.history.length - 1;
      if (label !== 'Open' && label !== 'New') this.saved = false;
      CP.emit && CP.emit('history', this);
    }
    restore(i) {
      const s = this.history[i]; if (!s) return;
      const sizeChanged = s.w !== this.width || s.h !== this.height;
      this.width = s.w; this.height = s.h;
      const old = new Map(this.layers.map((l) => [l.id, l]));
      this.layers = s.layers.map((sl) => {
        let l = old.get(sl.id);
        if (!l || l.ref !== sl.ref || l.dirty || l.canvas.width !== s.w || l.canvas.height !== s.h) {
          l = l || new Layer(s.w, s.h, sl.name);
          l.id = sl.id;
          l.canvas.width = s.w; l.canvas.height = s.h;
          l.ctx = l.canvas.getContext('2d');
          l.ctx.clearRect(0, 0, s.w, s.h);
          l.ctx.drawImage(sl.ref, 0, 0);
          l.ref = sl.ref; l.dirty = false;
        }
        Object.assign(l, { name: sl.name, visible: sl.visible, opacity: sl.opacity, blend: sl.blend, locked: sl.locked });
        return l;
      });
      this.active = U.clamp(s.active, 0, this.layers.length - 1);
      this.hIndex = i;
      if (sizeChanged) { this.composite = U.canvas(this.width, this.height); this.selection = null; }
      if (this.selection && (this.selection.w !== this.width || this.selection.h !== this.height)) this.selection = null;
      this.changed();
      CP.emit && CP.emit('history', this);
      CP.emit && CP.emit('layers', this);
    }
    undo() { if (this.hIndex > 0) this.restore(this.hIndex - 1); }
    redo() { if (this.hIndex < this.history.length - 1) this.restore(this.hIndex + 1); }

    /* Render all visible layers into this.composite (and include tool previews). */
    renderComposite() {
      if (this.composite.width !== this.width || this.composite.height !== this.height) this.composite = U.canvas(this.width, this.height);
      const g = this.composite.getContext('2d');
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      g.clearRect(0, 0, this.width, this.height);
      this.layers.forEach((l, i) => {
        if (!l.visible) return;
        let src = l.canvas;
        if (i === this.active && (this.preview || this.override)) {
          src = this._scratch(l);
        }
        g.globalAlpha = l.opacity; g.globalCompositeOperation = l.blend;
        g.drawImage(src, 0, 0);
      });
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      this.needsComposite = false;
      return this.composite;
    }
    _scratch(l) {
      if (!this._scr || this._scr.width !== this.width || this._scr.height !== this.height) this._scr = U.canvas(this.width, this.height);
      const g = this._scr.getContext('2d');
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      g.clearRect(0, 0, this.width, this.height);
      g.drawImage(this.override || l.canvas, 0, 0);
      const p = this.preview;
      if (p) {
        let pc = p.canvas;
        if (this.selection && p.clip !== false) {
          if (!this._clip || this._clip.width !== this.width || this._clip.height !== this.height) this._clip = U.canvas(this.width, this.height);
          const cg = this._clip.getContext('2d');
          cg.globalCompositeOperation = 'source-over'; cg.clearRect(0, 0, this.width, this.height);
          cg.drawImage(pc, 0, 0); cg.globalCompositeOperation = 'destination-in'; cg.drawImage(this.selection.mask, 0, 0);
          cg.globalCompositeOperation = 'source-over';
          pc = this._clip;
        }
        if (p.replace) g.clearRect(0, 0, this.width, this.height);
        g.globalAlpha = p.alpha == null ? 1 : p.alpha;
        g.globalCompositeOperation = p.op || 'source-over';
        g.drawImage(pc, p.x || 0, p.y || 0);
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      return this._scr;
    }
    flattened() {
      const keepP = this.preview, keepO = this.override; this.preview = null; this.override = null;
      const c = U.canvas(this.width, this.height), g = c.getContext('2d');
      for (const l of this.layers) { if (!l.visible) continue; g.globalAlpha = l.opacity; g.globalCompositeOperation = l.blend; g.drawImage(l.canvas, 0, 0); }
      this.preview = keepP; this.override = keepO;
      return c;
    }
    /* Apply a canvas onto the active layer, clipped by the selection. */
    applyToLayer(src, { op = 'source-over', alpha = 1, layer = this.layer, replace = false } = {}) {
      let s = src;
      if (this.selection) {
        const c = U.canvas(this.width, this.height), g = c.getContext('2d');
        g.drawImage(src, 0, 0); g.globalCompositeOperation = 'destination-in'; g.drawImage(this.selection.mask, 0, 0);
        s = c;
        if (replace) {
          layer.ctx.globalCompositeOperation = 'destination-out';
          layer.ctx.drawImage(this.selection.mask, 0, 0);
          layer.ctx.globalCompositeOperation = 'source-over';
        }
      } else if (replace) layer.ctx.clearRect(0, 0, this.width, this.height);
      layer.ctx.globalAlpha = alpha; layer.ctx.globalCompositeOperation = op;
      layer.ctx.drawImage(s, 0, 0);
      layer.ctx.globalAlpha = 1; layer.ctx.globalCompositeOperation = 'source-over';
      this.markDirty(layer);
    }
    /* Resize every layer through a transform function (crop/rotate/resize). */
    transformAll(newW, newH, drawFn, label) {
      for (const l of this.layers) {
        const c = U.canvas(newW, newH), g = c.getContext('2d');
        g.imageSmoothingQuality = 'high';
        drawFn(g, l.canvas);
        l.canvas = c; l.ctx = g; l.dirty = true;
      }
      this.width = Math.round(newW); this.height = Math.round(newH);
      this.selection = null;
      this.composite = U.canvas(this.width, this.height);
      this.changed();
      if (label) this.commit(label);
      CP.emit('layers', this);
    }
  }
  CP.Doc = Doc;

  /* ---------------- events ---------------- */
  const handlers = {};
  CP.on = (ev, fn) => (handlers[ev] = handlers[ev] || []).push(fn);
  CP.emit = (ev, ...a) => (handlers[ev] || []).forEach((f) => { try { f(...a); } catch (e) { console.error(e); } });

  /* ---------------- documents & viewport ---------------- */
  CP.docs = [];
  CP.doc = null;
  CP.view = { showGrid: false, antsOffset: 0 };

  CP.addDoc = (doc, { fit = true } = {}) => {
    CP.docs.push(doc);
    CP.setDoc(doc);
    if (fit) requestAnimationFrame(() => CP.zoomFit());
    return doc;
  };
  CP.setDoc = (doc) => {
    CP.doc = doc;
    CP.emit('doc', doc); CP.emit('layers', doc); CP.emit('history', doc);
    CP.requestRender();
  };
  CP.closeDoc = (doc) => {
    const i = CP.docs.indexOf(doc); if (i < 0) return;
    CP.docs.splice(i, 1);
    if (CP.doc === doc) CP.setDoc(CP.docs[Math.min(i, CP.docs.length - 1)] || null);
    else CP.emit('doc', CP.doc);
  };

  CP.newDocFromCanvas = (canvas, name, extra = {}) => {
    const d = new Doc(canvas.width, canvas.height, name);
    const l = d.addLayer('Background'); l.ctx.drawImage(canvas, 0, 0);
    Object.assign(d, extra);
    d.commit('Open'); d.saved = true;
    return d;
  };

  /* Stage canvas */
  let stage, sctx, wrap;
  CP.initStage = (canvasEl, wrapEl) => {
    stage = canvasEl; sctx = stage.getContext('2d'); wrap = wrapEl;
    const ro = new ResizeObserver(() => CP.requestRender(true));
    ro.observe(wrap);
    setInterval(() => { if (CP.doc && CP.doc.selection && document.visibilityState === 'visible') { CP.view.antsOffset = (CP.view.antsOffset + 1) % 16; CP.requestRender(); } }, 120);
  };
  CP.stageSize = () => ({ w: wrap ? wrap.clientWidth : 800, h: wrap ? wrap.clientHeight : 600 });

  CP.screenToDoc = (sx, sy) => {
    const d = CP.doc; const r = stage.getBoundingClientRect();
    return { x: (sx - r.left - d.panX) / d.zoom, y: (sy - r.top - d.panY) / d.zoom };
  };
  CP.docToScreen = (x, y) => { const d = CP.doc; return { x: x * d.zoom + d.panX, y: y * d.zoom + d.panY }; };

  CP.zoomFit = () => {
    const d = CP.doc; if (!d) return;
    const { w, h } = CP.stageSize(); const pad = 40;
    d.zoom = Math.min((w - pad) / d.width, (h - pad) / d.height, 1);
    if (!isFinite(d.zoom) || d.zoom <= 0) d.zoom = 1;
    d.panX = (w - d.width * d.zoom) / 2; d.panY = (h - d.height * d.zoom) / 2;
    CP.emit('zoom', d); CP.requestRender();
  };
  CP.zoomTo = (z, cx, cy) => {
    const d = CP.doc; if (!d) return;
    const { w, h } = CP.stageSize();
    if (cx == null) { cx = w / 2; cy = h / 2; }
    z = U.clamp(z, 0.02, 64);
    const px = (cx - d.panX) / d.zoom, py = (cy - d.panY) / d.zoom;
    d.zoom = z; d.panX = cx - px * z; d.panY = cy - py * z;
    CP.emit('zoom', d); CP.requestRender();
  };
  const ZSTEPS = [0.02, 0.05, 0.0833, 0.125, 0.1667, 0.25, 0.333, 0.5, 0.667, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64];
  CP.zoomStep = (dir, cx, cy) => {
    const z = CP.doc.zoom;
    const next = dir > 0 ? ZSTEPS.find((s) => s > z * 1.001) : [...ZSTEPS].reverse().find((s) => s < z * 0.999);
    CP.zoomTo(next || z, cx, cy);
  };

  let renderQueued = false, sizeDirty = true;
  CP.requestRender = (resize) => {
    if (resize) sizeDirty = true;
    if (renderQueued) return; renderQueued = true;
    requestAnimationFrame(() => { renderQueued = false; render(); });
  };

  function render() {
    if (!stage) return;
    const dpr = window.devicePixelRatio || 1;
    const { w, h } = CP.stageSize();
    if (sizeDirty || stage.width !== Math.round(w * dpr) || stage.height !== Math.round(h * dpr)) {
      stage.width = Math.round(w * dpr); stage.height = Math.round(h * dpr);
      stage.style.width = w + 'px'; stage.style.height = h + 'px';
      sizeDirty = false;
    }
    const g = sctx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const d = CP.doc; if (!d) return;
    if (d.needsComposite) d.renderComposite();
    const x = d.panX, y = d.panY, dw = d.width * d.zoom, dh = d.height * d.zoom;
    // shadow + checker
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 24; g.shadowOffsetY = 6;
    g.fillStyle = '#fff'; g.fillRect(x, y, dw, dh);
    g.restore();
    g.save();
    g.beginPath(); g.rect(x, y, dw, dh); g.clip();
    g.fillStyle = U.checker(g); g.translate(x, y); g.fillRect(0, 0, dw, dh); g.translate(-x, -y);
    g.imageSmoothingEnabled = d.zoom < 2;
    g.imageSmoothingQuality = 'high';
    g.drawImage(d.composite, x, y, dw, dh);
    // pixel grid
    if (d.zoom >= 8 || CP.view.showGrid) {
      g.strokeStyle = 'rgba(128,128,128,0.35)'; g.lineWidth = 1;
      const step = d.zoom >= 8 ? 1 : Math.max(1, Math.round(50 / d.zoom / 10) * 10);
      g.beginPath();
      const sx = Math.max(0, Math.floor(-x / d.zoom / step) * step), ex = Math.min(d.width, Math.ceil((w - x) / d.zoom));
      const sy = Math.max(0, Math.floor(-y / d.zoom / step) * step), ey = Math.min(d.height, Math.ceil((h - y) / d.zoom));
      for (let i = sx; i <= ex; i += step) { const px = Math.round(x + i * d.zoom) + 0.5; g.moveTo(px, Math.max(y, 0)); g.lineTo(px, Math.min(y + dh, h)); }
      for (let i = sy; i <= ey; i += step) { const py = Math.round(y + i * d.zoom) + 0.5; g.moveTo(Math.max(x, 0), py); g.lineTo(Math.min(x + dw, w), py); }
      g.stroke();
    }
    g.restore();
    // selection marching ants
    if (d.selection && d.selection.outline) {
      g.save();
      const so = d.selOffset || { x: 0, y: 0 };
      g.translate(x + so.x * d.zoom, y + so.y * d.zoom); g.scale(d.zoom, d.zoom);
      g.lineWidth = 1 / d.zoom;
      g.strokeStyle = '#fff'; g.setLineDash([]); g.stroke(d.selection.outline);
      g.strokeStyle = '#000'; g.setLineDash([4 / d.zoom, 4 / d.zoom]); g.lineDashOffset = -CP.view.antsOffset / d.zoom;
      g.stroke(d.selection.outline);
      g.restore();
    }
    // tool overlay
    const tool = CP.tools && CP.tools.current;
    if (tool && tool.overlay) { g.save(); tool.overlay(g, d); g.restore(); }
    CP.emit('rendered', d);
  }
  CP.render = render;
})(window.CP);
