/* CydArt adjustments and filters. Each works on a canvas and returns a new canvas. */
window.CP = window.CP || {};
(function (CP) {
  'use strict';
  const U = CP.util;
  const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

  function getData(c) { return c.getContext('2d').getImageData(0, 0, c.width, c.height); }
  function fromData(id) { const c = U.canvas(id.width, id.height); c.getContext('2d').putImageData(id, 0, 0); return c; }
  /* per-pixel mapper helper */
  function mapPixels(src, fn) {
    const id = getData(src), d = id.data;
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] === 0) continue; fn(d, i); }
    return fromData(id);
  }
  function lutApply(src, lr, lg, lb) {
    lg = lg || lr; lb = lb || lr;
    return mapPixels(src, (d, i) => { d[i] = lr[d[i]]; d[i + 1] = lg[d[i + 1]]; d[i + 2] = lb[d[i + 2]]; });
  }
  const makeLut = (f) => { const l = new Uint8ClampedArray(256); for (let i = 0; i < 256; i++) l[i] = f(i); return l; };

  /* ---------- blur (3-pass box ≈ gaussian, premultiplied) ---------- */
  function boxBlurH(s, t, w, h, r) {
    const iarr = 1 / (r + r + 1);
    for (let i = 0; i < h; i++) {
      for (let ch = 0; ch < 4; ch++) {
        let ti = i * w, li = ti, ri = ti + r;
        const fv = s[ti * 4 + ch], lv = s[(ti + w - 1) * 4 + ch]; let val = (r + 1) * fv;
        for (let j = 0; j < r; j++) val += s[(ti + Math.min(j, w - 1)) * 4 + ch];
        for (let j = 0; j <= r; j++) { val += (ri < i * w + w ? s[ri * 4 + ch] : lv) - fv; t[ti * 4 + ch] = val * iarr; ri++; ti++; }
        for (let j = r + 1; j < w - r; j++) { val += s[ri * 4 + ch] - s[li * 4 + ch]; t[ti * 4 + ch] = val * iarr; ri++; li++; ti++; }
        for (let j = Math.max(w - r, r + 1); j < w; j++) { val += lv - s[li * 4 + ch]; t[ti * 4 + ch] = val * iarr; li++; ti++; }
      }
    }
  }
  function boxBlurV(s, t, w, h, r) {
    const iarr = 1 / (r + r + 1);
    for (let i = 0; i < w; i++) {
      for (let ch = 0; ch < 4; ch++) {
        let ti = i, li = ti, ri = ti + r * w;
        const fv = s[ti * 4 + ch], lv = s[(ti + w * (h - 1)) * 4 + ch]; let val = (r + 1) * fv;
        for (let j = 0; j < r; j++) val += s[(ti + Math.min(j, h - 1) * w) * 4 + ch];
        for (let j = 0; j <= r; j++) { val += (ri < w * h ? s[ri * 4 + ch] : lv) - fv; t[ti * 4 + ch] = val * iarr; ri += w; ti += w; }
        for (let j = r + 1; j < h - r; j++) { val += s[ri * 4 + ch] - s[li * 4 + ch]; t[ti * 4 + ch] = val * iarr; li += w; ri += w; ti += w; }
        for (let j = Math.max(h - r, r + 1); j < h; j++) { val += lv - s[li * 4 + ch]; t[ti * 4 + ch] = val * iarr; li += w; ti += w; }
      }
    }
  }
  function blurData(id, radius) {
    const w = id.width, h = id.height, d = id.data, n = w * h * 4;
    if (radius < 0.5) return id;
    const a = new Float32Array(n), b = new Float32Array(n);
    for (let i = 0; i < n; i += 4) { const al = d[i + 3] / 255; a[i] = d[i] * al; a[i + 1] = d[i + 1] * al; a[i + 2] = d[i + 2] * al; a[i + 3] = d[i + 3]; }
    // box sizes for 3-pass gaussian
    const sigma = radius / 2, nb = 3;
    const wIdeal = Math.sqrt((12 * sigma * sigma / nb) + 1); let wl = Math.floor(wIdeal); if (wl % 2 === 0) wl--;
    const m = Math.round((12 * sigma * sigma - nb * wl * wl - 4 * nb * wl - 3 * nb) / (-4 * wl - 4));
    for (let k = 0; k < nb; k++) {
      const r = Math.max(0, ((k < m ? wl : wl + 2) - 1) / 2) | 0;
      if (r < 1) continue;
      const rr = Math.min(r, Math.floor((Math.min(w, h) - 1) / 2));
      if (rr < 1) continue;
      boxBlurH(a, b, w, h, rr); boxBlurV(b, a, w, h, rr);
    }
    const out = new ImageData(w, h), o = out.data;
    for (let i = 0; i < n; i += 4) { const al = a[i + 3]; o[i + 3] = al; if (al > 0) { const k = 255 / al; o[i] = a[i] * k; o[i + 1] = a[i + 1] * k; o[i + 2] = a[i + 2] * k; } }
    return out;
  }
  CP.blurCanvas = (src, radius) => fromData(blurData(getData(src), radius));

  function convolve(src, kernel, divisor = 1, offset = 0, keepAlpha = true) {
    const id = getData(src), w = id.width, h = id.height, s = id.data;
    const out = new ImageData(w, h), o = out.data, k = kernel, side = Math.round(Math.sqrt(k.length)), half = side >> 1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0; const di = (y * w + x) * 4;
      for (let ky = 0; ky < side; ky++) for (let kx = 0; kx < side; kx++) {
        const sy = Math.min(h - 1, Math.max(0, y + ky - half)), sx = Math.min(w - 1, Math.max(0, x + kx - half));
        const si = (sy * w + sx) * 4, wt = k[ky * side + kx];
        r += s[si] * wt; g += s[si + 1] * wt; b += s[si + 2] * wt;
      }
      o[di] = r / divisor + offset; o[di + 1] = g / divisor + offset; o[di + 2] = b / divisor + offset; o[di + 3] = keepAlpha ? s[di + 3] : 255;
    }
    return fromData(out);
  }

  /* ---------- histogram ---------- */
  CP.histogram = (canvas) => {
    let c = canvas;
    const maxPx = 600 * 600;
    if (c.width * c.height > maxPx) { const s = Math.sqrt(maxPx / (c.width * c.height)); const r = U.canvas(c.width * s, c.height * s); r.getContext('2d').drawImage(c, 0, 0, r.width, r.height); c = r; }
    const d = getData(c).data; const r = new Uint32Array(256), g = new Uint32Array(256), b = new Uint32Array(256), l = new Uint32Array(256);
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 8) continue; r[d[i]]++; g[d[i + 1]]++; b[d[i + 2]]++; l[(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0]++; }
    return { r, g, b, l };
  };
  CP.drawHistogram = (cv, h, mode = 'rgb') => {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    const chans = mode === 'rgb' ? [['r', 'rgba(255,70,70,0.55)'], ['g', 'rgba(70,220,90,0.55)'], ['b', 'rgba(70,140,255,0.55)']] : [['l', 'rgba(200,210,225,0.85)']];
    let max = 1; for (const [k] of chans) for (let i = 2; i < 254; i++) max = Math.max(max, h[k][i]);
    g.globalCompositeOperation = 'lighter';
    for (const [k, col] of chans) {
      g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
      for (let i = 0; i < 256; i++) g.lineTo(i / 255 * W, H - Math.min(1, h[k][i] / max) * H);
      g.lineTo(W, H); g.closePath(); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  };

  /* ---------- curve helper (monotone cubic through points) ---------- */
  CP.curveLut = (pts) => {
    const p = [...pts].sort((a, b) => a[0] - b[0]); const n = p.length;
    const lut = new Uint8ClampedArray(256);
    if (n < 2) { for (let i = 0; i < 256; i++) lut[i] = i; return lut; }
    const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
    const dx = [], dy = [], m = [];
    for (let i = 0; i < n - 1; i++) { dx.push(xs[i + 1] - xs[i] || 1e-6); dy.push(ys[i + 1] - ys[i]); m.push(dy[i] / dx[i]); }
    const t = [m[0]];
    for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
    t.push(m[n - 2]);
    for (let i = 0; i < n - 1; i++) { if (m[i] === 0) { t[i] = t[i + 1] = 0; continue; } const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b; if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; } }
    for (let x = 0; x < 256; x++) {
      let y;
      if (x <= xs[0]) y = ys[0]; else if (x >= xs[n - 1]) y = ys[n - 1];
      else {
        let i = 0; while (x > xs[i + 1]) i++;
        const h = dx[i], u = (x - xs[i]) / h, u2 = u * u, u3 = u2 * u;
        y = (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * t[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * t[i + 1];
      }
      lut[x] = clamp255(Math.round(y));
    }
    return lut;
  };

  /* ---------- definitions ---------- */
  const F = CP.filters = {};
  const def = (id, o) => { F[id] = { id, ...o }; };

  /* Adjustments */
  def('brightness', { group: 'adjust', name: 'Brightness / Contrast', params: [{ id: 'b', label: 'Brightness', min: -100, max: 100, def: 0 }, { id: 'c', label: 'Contrast', min: -100, max: 100, def: 0 }],
    apply: (s, p) => { const b = p.b * 1.6, c = p.c, f = (259 * (c * 2.55 + 255)) / (255 * (259 - c * 2.55)); return lutApply(s, makeLut((v) => f * (v + b - 128) + 128)); } });
  def('exposure', { group: 'adjust', name: 'Exposure', params: [{ id: 'e', label: 'Exposure (stops)', min: -3, max: 3, step: 0.05, def: 0 }, { id: 'o', label: 'Offset', min: -50, max: 50, def: 0 }, { id: 'g', label: 'Gamma', min: 0.2, max: 3, step: 0.01, def: 1 }],
    apply: (s, p) => lutApply(s, makeLut((v) => { let x = (v / 255) * Math.pow(2, p.e) + p.o / 255; x = Math.max(0, x); return 255 * Math.pow(Math.min(1, x), 1 / p.g); })) });
  def('huesat', { group: 'adjust', name: 'Hue / Saturation', params: [{ id: 'h', label: 'Hue', min: -180, max: 180, def: 0 }, { id: 's', label: 'Saturation', min: -100, max: 100, def: 0 }, { id: 'l', label: 'Lightness', min: -100, max: 100, def: 0 }, { id: 'colorize', label: 'Colorize', type: 'check', def: false }],
    apply: (s, p) => mapPixels(s, (d, i) => {
      let [h, sa, l] = U.rgbToHsl(d[i], d[i + 1], d[i + 2]);
      if (p.colorize) { h = ((p.h + 180) / 360); sa = Math.max(0, 0.25 + p.s / 200); }
      else { h = (h + p.h / 360 + 1) % 1; sa = p.s > 0 ? sa + (1 - sa) * (p.s / 100) * sa * 1.5 : sa * (1 + p.s / 100); sa = Math.min(1, Math.max(0, sa)); }
      l = p.l > 0 ? l + (1 - l) * p.l / 100 : l * (1 + p.l / 100);
      const [r, g, b] = U.hslToRgb(h, sa, l); d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }) });
  def('vibrance', { group: 'adjust', name: 'Vibrance', params: [{ id: 'v', label: 'Vibrance', min: -100, max: 100, def: 30 }, { id: 's', label: 'Saturation', min: -100, max: 100, def: 0 }],
    apply: (s, p) => mapPixels(s, (d, i) => {
      const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), avg = (r + g + b) / 3;
      const amt = ((Math.abs(mx - avg) * 2 / 255) * -1 + 1) * p.v / 100 * 1.5 + p.s / 100;
      d[i] = r + (r - avg) * amt; d[i + 1] = g + (g - avg) * amt; d[i + 2] = b + (b - avg) * amt;
    }) });
  def('temperature', { group: 'adjust', name: 'Temperature / Tint', params: [{ id: 't', label: 'Temperature', min: -100, max: 100, def: 0 }, { id: 'n', label: 'Tint', min: -100, max: 100, def: 0 }],
    apply: (s, p) => { const t = p.t * 0.6, n = p.n * 0.5; return lutApply(s, makeLut((v) => v + t), makeLut((v) => v - n), makeLut((v) => v - t)); } });
  def('colorbalance', { group: 'adjust', name: 'Color Balance', params: [{ id: 'cr', label: 'Cyan ↔ Red', min: -100, max: 100, def: 0 }, { id: 'mg', label: 'Magenta ↔ Green', min: -100, max: 100, def: 0 }, { id: 'yb', label: 'Yellow ↔ Blue', min: -100, max: 100, def: 0 }, { id: 'range', label: 'Tones', type: 'select', options: [['mid', 'Midtones'], ['sh', 'Shadows'], ['hi', 'Highlights']], def: 'mid' }],
    apply: (s, p) => {
      const wgt = (v) => { const x = v / 255; return p.range === 'sh' ? Math.max(0, 1 - x * 2.2) : p.range === 'hi' ? Math.max(0, x * 2.2 - 1.2) : 1 - Math.abs(x - 0.5) * 2; };
      return lutApply(s, makeLut((v) => v + p.cr * 0.8 * wgt(v)), makeLut((v) => v + p.mg * 0.8 * wgt(v)), makeLut((v) => v + p.yb * 0.8 * wgt(v)));
    } });
  def('shadowshigh', { group: 'adjust', name: 'Shadows / Highlights', params: [{ id: 's', label: 'Shadows', min: -100, max: 100, def: 35 }, { id: 'h', label: 'Highlights', min: -100, max: 100, def: -20 }],
    apply: (s, p) => lutApply(s, makeLut((v) => { const x = v / 255; const sh = Math.pow(1 - x, 3) * p.s / 100 * 0.6, hi = Math.pow(x, 3) * p.h / 100 * 0.6; return 255 * (x + sh + hi); })) });
  def('levels', { group: 'adjust', name: 'Levels', custom: 'levels', params: [{ id: 'inB', def: 0 }, { id: 'inW', def: 255 }, { id: 'gamma', def: 1 }, { id: 'outB', def: 0 }, { id: 'outW', def: 255 }],
    apply: (s, p) => lutApply(s, makeLut((v) => { let x = (v - p.inB) / Math.max(1, p.inW - p.inB); x = Math.min(1, Math.max(0, x)); x = Math.pow(x, 1 / p.gamma); return p.outB + x * (p.outW - p.outB); })) });
  def('curves', { group: 'adjust', name: 'Curves', custom: 'curves', params: [{ id: 'rgb', def: [[0, 0], [255, 255]] }, { id: 'r', def: [[0, 0], [255, 255]] }, { id: 'g', def: [[0, 0], [255, 255]] }, { id: 'b', def: [[0, 0], [255, 255]] }],
    apply: (s, p) => { const m = CP.curveLut(p.rgb), r = CP.curveLut(p.r), g = CP.curveLut(p.g), b = CP.curveLut(p.b); return lutApply(s, makeLut((v) => r[m[v]]), makeLut((v) => g[m[v]]), makeLut((v) => b[m[v]])); } });
  def('autolevels', { group: 'adjust', name: 'Auto Enhance', instant: true,
    apply: (s) => { const h = CP.histogram(s); const lim = (arr) => { let tot = 0; for (const v of arr) tot += v; const cut = tot * 0.005; let lo = 0, hi = 255, acc = 0; while (lo < 255 && (acc += arr[lo]) < cut) lo++; acc = 0; while (hi > 0 && (acc += arr[hi]) < cut) hi--; return [lo, Math.max(lo + 1, hi)]; };
      const mk = (a) => { const [lo, hi] = lim(a); return makeLut((v) => (v - lo) * 255 / (hi - lo)); }; return lutApply(s, mk(h.r), mk(h.g), mk(h.b)); } });
  def('autocontrast', { group: 'adjust', name: 'Auto Contrast', instant: true,
    apply: (s) => { const h = CP.histogram(s).l; let tot = 0; for (const v of h) tot += v; const cut = tot * 0.005; let lo = 0, hi = 255, acc = 0; while (lo < 255 && (acc += h[lo]) < cut) lo++; acc = 0; while (hi > 0 && (acc += h[hi]) < cut) hi--; hi = Math.max(lo + 1, hi); return lutApply(s, makeLut((v) => (v - lo) * 255 / (hi - lo))); } });
  def('invert', { group: 'adjust', name: 'Invert', instant: true, apply: (s) => lutApply(s, makeLut((v) => 255 - v)) });
  def('grayscale', { group: 'adjust', name: 'Black & White', params: [{ id: 'r', label: 'Reds', min: -50, max: 150, def: 40 }, { id: 'g', label: 'Greens', min: -50, max: 150, def: 40 }, { id: 'b', label: 'Blues', min: -50, max: 150, def: 20 }],
    apply: (s, p) => { const t = p.r + p.g + p.b || 1; const wr = p.r / t, wg = p.g / t, wb = p.b / t; return mapPixels(s, (d, i) => { const v = d[i] * wr + d[i + 1] * wg + d[i + 2] * wb; d[i] = d[i + 1] = d[i + 2] = v; }); } });
  def('sepia', { group: 'adjust', name: 'Sepia', params: [{ id: 'a', label: 'Amount', min: 0, max: 100, def: 80 }],
    apply: (s, p) => { const a = p.a / 100; return mapPixels(s, (d, i) => { const r = d[i], g = d[i + 1], b = d[i + 2];
      d[i] = U.lerp(r, r * 0.393 + g * 0.769 + b * 0.189, a); d[i + 1] = U.lerp(g, r * 0.349 + g * 0.686 + b * 0.168, a); d[i + 2] = U.lerp(b, r * 0.272 + g * 0.534 + b * 0.131, a); }); } });
  def('threshold', { group: 'adjust', name: 'Threshold', params: [{ id: 't', label: 'Level', min: 1, max: 254, def: 128 }],
    apply: (s, p) => mapPixels(s, (d, i) => { const v = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) >= p.t ? 255 : 0; d[i] = d[i + 1] = d[i + 2] = v; }) });
  def('posterize', { group: 'adjust', name: 'Posterize', params: [{ id: 'n', label: 'Levels', min: 2, max: 32, def: 6 }],
    apply: (s, p) => { const n = p.n - 1; return lutApply(s, makeLut((v) => Math.round(v / 255 * n) / n * 255)); } });
  def('duotone', { group: 'adjust', name: 'Duotone', params: [{ id: 'dark', label: 'Shadows', type: 'color', def: '#10213a' }, { id: 'light', label: 'Highlights', type: 'color', def: '#7fe3ff' }],
    apply: (s, p) => { const a = U.hexToRgb(p.dark), b = U.hexToRgb(p.light); return mapPixels(s, (d, i) => { const t = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255; d[i] = U.lerp(a.r, b.r, t); d[i + 1] = U.lerp(a.g, b.g, t); d[i + 2] = U.lerp(a.b, b.b, t); }); } });

  /* Filters */
  def('blur', { group: 'filter', name: 'Gaussian Blur', params: [{ id: 'r', label: 'Radius', min: 0, max: 100, step: 0.5, def: 4 }], apply: (s, p) => CP.blurCanvas(s, p.r) });
  def('motionblur', { group: 'filter', name: 'Motion Blur', params: [{ id: 'a', label: 'Angle', min: -180, max: 180, def: 0 }, { id: 'd', label: 'Distance', min: 1, max: 200, def: 20 }],
    apply: (s, p) => { const c = U.canvas(s.width, s.height), g = c.getContext('2d'); const n = Math.min(48, Math.max(4, Math.round(p.d / 2))); const a = p.a * Math.PI / 180;
      for (let i = 0; i < n; i++) { const t = (i / (n - 1) - 0.5) * p.d; g.globalAlpha = 1 / (i + 1); g.drawImage(s, Math.cos(a) * t, Math.sin(a) * t); } return c; } });
  def('sharpen', { group: 'filter', name: 'Sharpen (Unsharp Mask)', params: [{ id: 'a', label: 'Amount', min: 0, max: 300, def: 80 }, { id: 'r', label: 'Radius', min: 0.5, max: 20, step: 0.5, def: 1.5 }, { id: 't', label: 'Threshold', min: 0, max: 64, def: 2 }],
    apply: (s, p) => { const o = getData(s), b = blurData(getData(s), p.r * 2), d = o.data, bd = b.data, k = p.a / 100;
      for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) { const diff = d[i + c] - bd[i + c]; if (Math.abs(diff) >= p.t) d[i + c] = clamp255(d[i + c] + diff * k); }
      return fromData(o); } });
  def('noise', { group: 'filter', name: 'Add Noise / Grain', params: [{ id: 'a', label: 'Amount', min: 0, max: 100, def: 15 }, { id: 'mono', label: 'Monochrome', type: 'check', def: true }],
    apply: (s, p) => { const a = p.a * 1.6; return mapPixels(s, (d, i) => { if (p.mono) { const n = (Math.random() - 0.5) * a; d[i] += n; d[i + 1] += n; d[i + 2] += n; } else { d[i] += (Math.random() - 0.5) * a; d[i + 1] += (Math.random() - 0.5) * a; d[i + 2] += (Math.random() - 0.5) * a; } }); } });
  def('denoise', { group: 'filter', name: 'Reduce Noise', params: [{ id: 's', label: 'Strength', min: 1, max: 100, def: 40 }],
    apply: (s, p) => { // edge-preserving: blend toward blur where local difference is small
      const o = getData(s), b = blurData(getData(s), 2 + p.s / 20), d = o.data, bd = b.data, t = 6 + p.s * 0.6;
      for (let i = 0; i < d.length; i += 4) { const diff = Math.abs(d[i] - bd[i]) + Math.abs(d[i + 1] - bd[i + 1]) + Math.abs(d[i + 2] - bd[i + 2]); const w = Math.max(0, 1 - diff / (t * 3)); for (let c = 0; c < 3; c++) d[i + c] = U.lerp(d[i + c], bd[i + c], w); }
      return fromData(o); } });
  def('pixelate', { group: 'filter', name: 'Pixelate', params: [{ id: 's', label: 'Cell size', min: 2, max: 128, def: 12 }],
    apply: (s, p) => { const sm = U.canvas(Math.max(1, s.width / p.s), Math.max(1, s.height / p.s)); const g1 = sm.getContext('2d'); g1.imageSmoothingQuality = 'high'; g1.drawImage(s, 0, 0, sm.width, sm.height);
      const c = U.canvas(s.width, s.height), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(sm, 0, 0, c.width, c.height); return c; } });
  def('emboss', { group: 'filter', name: 'Emboss', params: [], apply: (s) => convolve(s, [-2, -1, 0, -1, 1, 1, 0, 1, 2]) });
  def('edges', { group: 'filter', name: 'Find Edges', params: [], apply: (s) => convolve(s, [-1, -1, -1, -1, 8, -1, -1, -1, -1], 1, 0) });
  def('sketch', { group: 'filter', name: 'Pencil Sketch', params: [{ id: 'r', label: 'Detail', min: 1, max: 30, def: 8 }],
    apply: (s, p) => { const gray = F.grayscale.apply(s, { r: 30, g: 59, b: 11 }); const inv = F.invert.apply(gray); const bl = CP.blurCanvas(inv, p.r);
      const a = getData(gray), b = getData(bl), d = a.data, bd = b.data; for (let i = 0; i < d.length; i += 4) { const v = bd[i] >= 255 ? 255 : Math.min(255, d[i] * 255 / (255 - bd[i])); d[i] = d[i + 1] = d[i + 2] = v; } return fromData(a); } });
  def('vignette', { group: 'filter', name: 'Vignette', params: [{ id: 'a', label: 'Amount', min: -100, max: 100, def: 50 }, { id: 'sz', label: 'Size', min: 10, max: 100, def: 60 }, { id: 'f', label: 'Feather', min: 5, max: 100, def: 60 }],
    apply: (s, p) => { const c = U.clone(s), g = c.getContext('2d'), w = c.width, h = c.height, R = Math.hypot(w, h) / 2;
      const gr = g.createRadialGradient(w / 2, h / 2, R * (p.sz / 100) * (1 - p.f / 100), w / 2, h / 2, R * Math.min(1.2, (p.sz / 100) + p.f / 200));
      const col = p.a > 0 ? '0,0,0' : '255,255,255'; gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(1, `rgba(${col},${Math.abs(p.a) / 100})`);
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = gr; g.fillRect(0, 0, w, h); return c; } });
  def('glow', { group: 'filter', name: 'Soft Glow', params: [{ id: 'r', label: 'Radius', min: 1, max: 60, def: 12 }, { id: 'a', label: 'Strength', min: 0, max: 100, def: 45 }],
    apply: (s, p) => { const b = CP.blurCanvas(s, p.r), c = U.clone(s), g = c.getContext('2d'); g.globalCompositeOperation = 'screen'; g.globalAlpha = p.a / 100; g.drawImage(b, 0, 0); g.globalCompositeOperation = 'destination-in'; g.globalAlpha = 1; g.drawImage(s, 0, 0); return c; } });
  def('oilpaint', { group: 'filter', name: 'Oil Paint', params: [{ id: 'r', label: 'Brush size', min: 1, max: 6, def: 3 }, { id: 'l', label: 'Levels', min: 8, max: 40, def: 20 }],
    apply: (s, p) => { const id = getData(s), w = id.width, h = id.height, d = id.data, out = new ImageData(w, h), o = out.data, L = p.l, r = p.r;
      const cnt = new Int32Array(L), sr = new Int32Array(L), sg = new Int32Array(L), sb = new Int32Array(L);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        cnt.fill(0); sr.fill(0); sg.fill(0); sb.fill(0);
        for (let dy = -r; dy <= r; dy++) { const yy = y + dy; if (yy < 0 || yy >= h) continue; for (let dx = -r; dx <= r; dx++) { const xx = x + dx; if (xx < 0 || xx >= w) continue; const i = (yy * w + xx) * 4; const lv = ((d[i] + d[i + 1] + d[i + 2]) / 3 * (L - 1) / 255) | 0; cnt[lv]++; sr[lv] += d[i]; sg[lv] += d[i + 1]; sb[lv] += d[i + 2]; } }
        let mx = 0, mi = 0; for (let k = 0; k < L; k++) if (cnt[k] > mx) { mx = cnt[k]; mi = k; }
        const oi = (y * w + x) * 4; o[oi] = sr[mi] / mx; o[oi + 1] = sg[mi] / mx; o[oi + 2] = sb[mi] / mx; o[oi + 3] = d[oi + 3];
      } return fromData(out); } });
  def('twirl', { group: 'filter', name: 'Twirl', params: [{ id: 'a', label: 'Angle', min: -720, max: 720, def: 180 }, { id: 'r', label: 'Radius %', min: 5, max: 100, def: 60 }],
    apply: (s, p) => distort(s, (x, y, cx, cy, R) => { const dx = x - cx, dy = y - cy, dist = Math.hypot(dx, dy); if (dist >= R) return [x, y]; const t = (R - dist) / R, ang = Math.atan2(dy, dx) + t * t * p.a * Math.PI / 180; return [cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist]; }, p.r) });
  def('bulge', { group: 'filter', name: 'Pinch / Bulge', params: [{ id: 'a', label: 'Amount', min: -100, max: 100, def: 50 }, { id: 'r', label: 'Radius %', min: 5, max: 100, def: 60 }],
    apply: (s, p) => distort(s, (x, y, cx, cy, R) => { const dx = x - cx, dy = y - cy, dist = Math.hypot(dx, dy); if (dist >= R || dist === 0) return [x, y]; const k = Math.pow(dist / R, p.a > 0 ? 1 + p.a / 100 : 1 / (1 - p.a / 100)) * R / dist; return [cx + dx * k, cy + dy * k]; }, p.r) });
  def('halftone', { group: 'filter', name: 'Halftone Dots', params: [{ id: 's', label: 'Dot size', min: 3, max: 40, def: 8 }],
    apply: (s, p) => { const id = getData(s), d = id.data, w = s.width, h = s.height, c = U.canvas(w, h), g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#111';
      for (let y = 0; y < h; y += p.s) for (let x = 0; x < w; x += p.s) { const i = (Math.min(h - 1, y + (p.s >> 1)) * w + Math.min(w - 1, x + (p.s >> 1))) * 4; const v = 1 - (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255; g.beginPath(); g.arc(x + p.s / 2, y + p.s / 2, v * p.s * 0.7, 0, 7); g.fill(); }
      g.globalCompositeOperation = 'destination-in'; g.drawImage(s, 0, 0); return c; } });

  function distort(src, fn, radiusPct) {
    const id = getData(src), w = id.width, h = id.height, s = id.data, out = new ImageData(w, h), o = out.data;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 * radiusPct / 100;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const [sx, sy] = fn(x, y, cx, cy, R); const di = (y * w + x) * 4;
      const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
      if (x0 < 0 || y0 < 0 || x0 >= w - 1 || y0 >= h - 1) { const xi = U.clamp(Math.round(sx), 0, w - 1), yi = U.clamp(Math.round(sy), 0, h - 1), si = (yi * w + xi) * 4; for (let c = 0; c < 4; c++) o[di + c] = s[si + c]; continue; }
      const i00 = (y0 * w + x0) * 4, i10 = i00 + 4, i01 = i00 + w * 4, i11 = i01 + 4;
      for (let c = 0; c < 4; c++) o[di + c] = (s[i00 + c] * (1 - fx) + s[i10 + c] * fx) * (1 - fy) + (s[i01 + c] * (1 - fx) + s[i11 + c] * fx) * fy;
    }
    return fromData(out);
  }

  /* One-click photo looks (Photo mode presets) */
  CP.LOOKS = [
    { id: 'none', name: 'Original', steps: [] },
    { id: 'vivid', name: 'Vivid', steps: [['vibrance', { v: 45, s: 8 }], ['brightness', { b: 3, c: 12 }]] },
    { id: 'warm', name: 'Golden', steps: [['temperature', { t: 28, n: 4 }], ['vibrance', { v: 20, s: 0 }]] },
    { id: 'cool', name: 'Arctic', steps: [['temperature', { t: -30, n: -4 }], ['brightness', { b: 4, c: 6 }]] },
    { id: 'film', name: 'Film', steps: [['curves', { rgb: [[0, 22], [64, 58], [190, 200], [255, 240]], r: [[0, 0], [255, 255]], g: [[0, 0], [255, 255]], b: [[0, 10], [255, 238]] }], ['noise', { a: 7, mono: true }]] },
    { id: 'fade', name: 'Faded', steps: [['levels', { inB: 0, inW: 255, gamma: 1.1, outB: 38, outW: 235 }], ['vibrance', { v: -20, s: -10 }]] },
    { id: 'drama', name: 'Drama', steps: [['shadowshigh', { s: 30, h: -40 }], ['brightness', { b: -4, c: 30 }], ['vignette', { a: 45, sz: 60, f: 60 }]] },
    { id: 'noir', name: 'Noir', steps: [['grayscale', { r: 45, g: 35, b: 20 }], ['brightness', { b: -3, c: 35 }], ['vignette', { a: 40, sz: 65, f: 55 }]] },
    { id: 'mono', name: 'Mono', steps: [['grayscale', { r: 40, g: 40, b: 20 }]] },
    { id: 'sepia', name: 'Vintage', steps: [['sepia', { a: 70 }], ['levels', { inB: 0, inW: 255, gamma: 1, outB: 25, outW: 240 }], ['vignette', { a: 35, sz: 70, f: 60 }]] },
    { id: 'cyd', name: 'Cydni Blue', steps: [['duotone', { dark: '#0b1d33', light: '#9ce8ff' }]] },
    { id: 'pop', name: 'Pop', steps: [['vibrance', { v: 70, s: 25 }], ['brightness', { b: 0, c: 25 }]] },
  ];
  CP.applyLook = (canvas, look) => look.steps.reduce((c, [id, p]) => F[id].apply(c, p), canvas);
  CP.filterDefaults = (f) => Object.fromEntries((f.params || []).map((p) => [p.id, Array.isArray(p.def) ? p.def.map((x) => [...x]) : p.def]));
})(window.CP);
