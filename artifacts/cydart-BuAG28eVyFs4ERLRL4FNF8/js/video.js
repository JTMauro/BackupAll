/* CydArt Video: player + timeline editor.
   Tracks: Titles (T1), Overlay (V2: picture-in-picture, logos, green screen), Main (V1: magnetic, transitions), Music (A1).
   Export: WebCodecs H.264/VP9 + AAC/Opus into MP4/WebM, then FFmpeg for MOV/MKV/AVI/WMV/GIF/MP3/WAV/M4A. */
window.CP = window.CP || {};
(function (CP) {
  'use strict';
  const U = CP.util, el = U.el, M = CP.media;
  const $ = (s, r = document) => r.querySelector(s);
  const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  const V = CP.video = { media: [], playlist: [], sub: 'player' };

  /* ======================= project model ======================= */
  const ASPECTS = [['16:9', 1920, 1080, 'Landscape · YouTube'], ['9:16', 1080, 1920, 'Vertical · Reels, TikTok, Shorts'], ['1:1', 1080, 1080, 'Square'], ['4:5', 1080, 1350, 'Portrait · Instagram feed'], ['4:3', 1440, 1080, 'Classic'], ['21:9', 2560, 1080, 'Cinema wide']];
  const TRACKS = [['t1', 'Titles'], ['v2', 'Overlay'], ['v1', 'Main'], ['a1', 'Music']];
  const LOOKS = { none: '', vivid: 'saturate(1.35) contrast(1.1)', warm: 'sepia(.22) saturate(1.25) hue-rotate(-8deg)', cool: 'hue-rotate(12deg) saturate(1.1) brightness(1.03)', film: 'contrast(.92) brightness(1.06) saturate(.85) sepia(.12)',
    drama: 'contrast(1.35) saturate(1.1) brightness(.92)', fade: 'contrast(.82) brightness(1.1) saturate(.8)', bw: 'grayscale(1) contrast(1.1)', noir: 'grayscale(1) contrast(1.55) brightness(.88)', vintage: 'sepia(.45) contrast(.92) brightness(1.04) saturate(.8)',
    cyd: 'grayscale(.55) sepia(.35) hue-rotate(165deg) saturate(1.7)', pop: 'saturate(1.7) contrast(1.15)' };
  const LOOK_NAMES = { none: 'Original', vivid: 'Vivid', warm: 'Golden', cool: 'Arctic', film: 'Film', drama: 'Drama', fade: 'Faded', bw: 'Mono', noir: 'Noir', vintage: 'Vintage', cyd: 'Cydni Blue', pop: 'Pop' };
  const TRANS = [['none', 'Cut'], ['cross', 'Crossfade'], ['black', 'Fade through black'], ['white', 'Flash (white)'], ['wipel', 'Wipe left'], ['wiper', 'Wipe right'], ['wipeu', 'Wipe up'], ['slidel', 'Slide left'], ['slideu', 'Push up'], ['zoom', 'Zoom in'], ['circle', 'Circle reveal'], ['blur', 'Blur dissolve'], ['spin', 'Spin']];
  const TITLE_STYLES = [['bold', 'Big bold'], ['lower', 'Lower third'], ['neon', 'Neon glow'], ['cinema', 'Cinematic'], ['box', 'Boxed'], ['outline', 'Outline'], ['sub', 'Subtitle']];
  const ANIM_IN = [['fade', 'Fade'], ['pop', 'Pop'], ['slide', 'Slide up'], ['type', 'Typewriter'], ['wipe', 'Wipe'], ['none', 'None']];
  const ANIM_OUT = [['fade', 'Fade'], ['slide', 'Slide down'], ['none', 'None']];

  let P = newProject();
  function newProject() { return { name: 'My video', w: 1920, h: 1080, fps: 30, bg: '#000000', clips: [], inPt: null, outPt: null }; }
  const media = (id) => V.media.find((m) => m.id === id);
  const len = (c) => (c.type === 'video' || c.type === 'audio' ? (c.out - c.in) / c.speed : c.dur);
  const end = (c) => c.start + len(c);
  const duration = () => P.clips.reduce((m, c) => Math.max(m, end(c)), 0);
  const v1 = () => P.clips.filter((c) => c.track === 'v1');
  function layout() {
    let t = 0, prev = null;
    for (const c of v1()) {
      if (prev && c.trans.type !== 'none') { const o = Math.min(c.trans.dur, len(prev) / 2, len(c) / 2); t -= o; c._ov = o; } else c._ov = 0;
      c.start = Math.max(0, t); t = c.start + len(c); prev = c;
    }
  }
  function mkClip(m, track, extra = {}) {
    const type = m.kind === 'audio' ? 'audio' : m.kind === 'image' ? 'image' : m.kind === 'title' ? 'title' : 'video';
    return Object.assign({
      id: U.uid(), type, mediaId: m.id, track, start: 0, in: 0, out: m.duration || 0, dur: type === 'image' ? 4 : 3, speed: 1, volume: 1, muted: false, fadeIn: 0, fadeOut: 0,
      look: { preset: 'none', brightness: 0, contrast: 0, saturation: 0, hue: 0, temp: 0, blur: 0, vignette: 0 },
      tf: { fit: track === 'v2' ? 'fit' : 'fill', zoom: track === 'v2' ? 0.35 : 1, x: track === 'v2' ? 30 : 0, y: track === 'v2' ? -28 : 0, rot: 0, flip: false, opacity: 1, kenburns: type === 'image' && track === 'v1' },
      trans: { type: 'none', dur: 0.8 }, chroma: { on: false, color: '#00ff00', tol: 90, soft: 50 }, crop: { l: 0, t: 0, r: 0, b: 0 },
    }, extra);
  }

  /* ---------- history ---------- */
  const hist = { stack: [], i: -1 };
  const snap = () => JSON.stringify({ name: P.name, w: P.w, h: P.h, fps: P.fps, bg: P.bg, inPt: P.inPt, outPt: P.outPt, clips: P.clips.map((c) => { const o = { ...c }; delete o._ov; return o; }) });
  function commit(label) { layout(); hist.stack.splice(hist.i + 1); hist.stack.push(snap()); if (hist.stack.length > 120) hist.stack.shift(); hist.i = hist.stack.length - 1; V.dirty = true; renderAll(); }
  function restore(i) { if (i < 0 || i >= hist.stack.length) return; hist.i = i; const s = JSON.parse(hist.stack[i]); Object.assign(P, s); if (sel && !P.clips.some((c) => c.id === sel)) sel = null; layout(); syncElements(true); renderAll(); }
  V.undo = () => restore(hist.i - 1); V.redo = () => restore(hist.i + 1);

  /* ======================= media ======================= */
  V.addMedia = async (files, { toTimeline = false } = {}) => {
    const added = [];
    for (const f of Array.from(files)) {
      const name = f.name || 'clip';
      const kind = M.isAudio(name, f.type) ? 'audio' : M.isVideo(name, f.type) ? 'video' : (/^image\//.test(f.type) || CP.OPEN_ACCEPT.includes('.' + U.ext(name))) ? 'image' : null;
      if (!kind) { CP.ui.toast(`${name} isn't a video, audio or image file`); continue; }
      const m = { id: U.uid(), name, kind, file: f, duration: 0, w: 0, h: 0, thumbs: [] };
      try {
        if (kind === 'image') {
          const c = await CP.decodeToCanvas(f, name);
          const b = await new Promise((r) => c.toBlob(r, 'image/png'));
          m.url = URL.createObjectURL(b); m.blob = b; m.w = c.width; m.h = c.height; m.img = await loadImg(m.url); m.thumb = thumbOf(c);
        } else {
          const src = await M.playable(f, name);
          Object.assign(m, { url: src.url, blob: src.blob, duration: src.duration, w: src.width, h: src.height, converted: src.converted });
          if (kind === 'video') makeThumbs(m);
        }
        V.media.push(m); added.push(m);
      } catch (e) { CP.ui.error('Could not open ' + name, e); }
    }
    renderBin();
    if (toTimeline) for (const m of added) appendToTimeline(m, false);
    if (toTimeline && added.length) commit('Add clips');
    return added;
  };
  const loadImg = (url) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  function thumbOf(c) { const s = Math.min(1, 160 / c.width), t = U.canvas(c.width * s, c.height * s); t.getContext('2d').drawImage(c, 0, 0, t.width, t.height); return t; }
  async function makeThumbs(m) {
    const n = Math.max(2, Math.min(24, Math.ceil(m.duration / 2)));
    const v = document.createElement('video'); v.muted = true; v.src = m.url; v.preload = 'auto';
    await new Promise((r) => { v.onloadeddata = r; v.onerror = r; });
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) * m.duration / n;
      await new Promise((r) => { v.onseeked = r; v.currentTime = Math.min(t, m.duration - 0.05); setTimeout(r, 2000); });
      if (!v.videoWidth) break;
      const s = 96 / v.videoHeight, c = U.canvas(v.videoWidth * s, 96); c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      m.thumbs.push({ t, c }); if (i === 0) { m.thumb = c; renderBin(); }
    }
    v.removeAttribute('src'); v.load();
    renderTimeline();
  }
  async function audioBuffer(m) {
    if (m.audioBuf !== undefined) return m.audioBuf;
    try { const ab = await (await fetch(m.url)).arrayBuffer(); m.audioBuf = await new OfflineAudioContext(2, 1, 48000).decodeAudioData(ab); }
    catch (e) { m.audioBuf = null; }
    return m.audioBuf;
  }
  async function peaksOf(m) {
    if (m.peaks) return m.peaks; const b = await audioBuffer(m); if (!b) return (m.peaks = []);
    const d = b.getChannelData(0), n = 600, step = Math.floor(d.length / n), p = [];
    for (let i = 0; i < n; i++) { let mx = 0; for (let j = i * step; j < (i + 1) * step; j += 16) mx = Math.max(mx, Math.abs(d[j] || 0)); p.push(mx); }
    m.peaks = p; renderTimeline(); return p;
  }
  function appendToTimeline(m, doCommit = true) {
    if (m.kind === 'audio') { P.clips.push(mkClip(m, 'a1', { start: P.clips.filter((c) => c.track === 'a1').reduce((t, c) => Math.max(t, end(c)), 0) })); peaksOf(m); }
    else P.clips.push(mkClip(m, 'v1'));
    if (doCommit) commit('Add clip');
  }

  /* ======================= elements for preview ======================= */
  const els = new Map(); // clip id → media element
  function elFor(c) {
    if (c.type === 'image' || c.type === 'title') return null;
    let e = els.get(c.id); const m = media(c.mediaId); if (!m) return null;
    if (!e || e._src !== m.url) {
      e = document.createElement(c.type === 'audio' ? 'audio' : 'video');
      e.preload = 'auto'; e.playsInline = true; e.src = m.url; e._src = m.url; e.muted = false;
      e.addEventListener('seeked', () => requestDraw()); e.addEventListener('loadeddata', () => requestDraw());
      els.set(c.id, e);
    }
    return e;
  }
  function cleanupEls() { for (const [id, e] of els) if (!P.clips.some((c) => c.id === id)) { e.pause(); e.removeAttribute('src'); e.load(); els.delete(id); } }

  /* ======================= rendering ======================= */
  const layers = [];
  const layer = (i, w, h) => { let c = layers[i]; if (!c || c.width !== w || c.height !== h) { c = layers[i] = U.canvas(w, h); } const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, w, h); return c; };
  const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  const back = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  function lookFilter(c, scale) {
    const L = c.look; let f = LOOKS[L.preset] || '';
    if (L.brightness) f += ` brightness(${1 + L.brightness / 100})`; if (L.contrast) f += ` contrast(${1 + L.contrast / 100})`;
    if (L.saturation) f += ` saturate(${1 + L.saturation / 100})`; if (L.hue) f += ` hue-rotate(${L.hue}deg)`; if (L.blur) f += ` blur(${L.blur * scale}px)`;
    return f.trim() || 'none';
  }
  function fadeAlpha(c, T) { const t = T - c.start, l = len(c); let a = 1; if (c.fadeIn > 0 && t < c.fadeIn) a *= t / c.fadeIn; if (c.fadeOut > 0 && t > l - c.fadeOut) a *= (l - t) / c.fadeOut; return U.clamp(a, 0, 1); }
  function chromaKey(g, w, h, c) {
    const id = g.getImageData(0, 0, w, h), d = id.data, k = U.hexToRgb(c.chroma.color), tol = c.chroma.tol, soft = Math.max(1, c.chroma.soft);
    const kg = k.g > k.r && k.g > k.b, kb = k.b > k.r && k.b > k.g;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const dist = Math.sqrt((d[i] - k.r) ** 2 + (d[i + 1] - k.g) ** 2 + (d[i + 2] - k.b) ** 2);
      if (dist < tol) d[i + 3] = 0;
      else if (dist < tol + soft) { d[i + 3] = d[i + 3] * (dist - tol) / soft; if (kg) d[i + 1] = Math.min(d[i + 1], (d[i] + d[i + 2]) / 2 + 10); if (kb) d[i + 2] = Math.min(d[i + 2], (d[i] + d[i + 1]) / 2 + 10); }
    }
    g.putImageData(id, 0, 0);
  }
  /* draw one visual clip into a layer the size of the frame */
  function drawClip(c, T, W, H, scale, src, li) {
    const L = layer(li, W, H), g = L.getContext('2d');
    const fw = src.videoWidth || src.naturalWidth || src.width, fh = src.videoHeight || src.naturalHeight || src.height;
    if (!fw || !fh) return null;
    const cr = c.crop || { l: 0, t: 0, r: 0, b: 0 };
    const cx0 = fw * cr.l / 100, cy0 = fh * cr.t / 100, sw = Math.max(1, fw * (1 - (cr.l + cr.r) / 100)), sh = Math.max(1, fh * (1 - (cr.t + cr.b) / 100));
    const u = U.clamp((T - c.start) / Math.max(0.001, len(c)), 0, 1), tf = c.tf;
    let s = tf.fit === 'fill' ? Math.max(W / sw, H / sh) : tf.fit === 'stretch' ? 1 : Math.min(W / sw, H / sh);
    s *= tf.zoom; if (tf.kenburns) s *= 1 + 0.14 * u;
    const dw = tf.fit === 'stretch' ? W * tf.zoom : sw * s, dh = tf.fit === 'stretch' ? H * tf.zoom : sh * s;
    let cx = W / 2 + tf.x / 100 * W, cy = H / 2 + tf.y / 100 * H; if (tf.kenburns) { cx -= W * 0.03 * u; cy -= H * 0.02 * u; }
    g.save(); g.translate(cx, cy); if (tf.rot) g.rotate(tf.rot * Math.PI / 180); if (tf.flip) g.scale(-1, 1);
    g.filter = lookFilter(c, scale); g.imageSmoothingQuality = 'high';
    g.drawImage(src, cx0, cy0, sw, sh, -dw / 2, -dh / 2, dw, dh); g.filter = 'none';
    if (c.look.temp) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = Math.min(0.35, Math.abs(c.look.temp) / 300); g.fillStyle = c.look.temp > 0 ? '#ff8a00' : '#0080ff'; g.fillRect(-dw / 2, -dh / 2, dw, dh); }
    if (c.look.vignette) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 1; const r = Math.hypot(dw, dh) / 2, gr = g.createRadialGradient(0, 0, r * 0.35, 0, 0, r); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${c.look.vignette / 100})`); g.fillStyle = gr; g.fillRect(-dw / 2, -dh / 2, dw, dh); }
    g.restore();
    if (c.chroma.on) chromaKey(g, W, H, c);
    return L;
  }
  function drawLayer(g, L, alpha, W, H, xf) {
    if (!L || alpha <= 0) return; g.save(); g.globalAlpha = U.clamp(alpha, 0, 1);
    if (xf) xf(g); g.drawImage(L, 0, 0, W, H); g.restore();
  }
  function transition(g, A, B, a, b, p, type, W, H, scale) {
    const e = ease(p);
    switch (type) {
      case 'black': case 'white': { if (p < 0.5) drawLayer(g, A, a, W, H); else drawLayer(g, B, b, W, H); g.save(); g.fillStyle = type === 'black' ? '#000' : '#fff'; g.globalAlpha = 1 - Math.abs(p - 0.5) * 2; g.fillRect(0, 0, W, H); g.restore(); break; }
      case 'wipel': case 'wiper': case 'wipeu': { drawLayer(g, A, a, W, H); g.save(); g.beginPath(); if (type === 'wipel') g.rect(W * (1 - e), 0, W * e, H); else if (type === 'wiper') g.rect(0, 0, W * e, H); else g.rect(0, H * (1 - e), W, H * e); g.clip(); drawLayer(g, B, b, W, H); g.restore(); break; }
      case 'slidel': drawLayer(g, A, a, W, H, (x) => x.translate(-W * e, 0)); drawLayer(g, B, b, W, H, (x) => x.translate(W * (1 - e), 0)); break;
      case 'slideu': drawLayer(g, A, a, W, H, (x) => x.translate(0, -H * e)); drawLayer(g, B, b, W, H, (x) => x.translate(0, H * (1 - e))); break;
      case 'zoom': drawLayer(g, A, a * (1 - e), W, H, (x) => { const s = 1 + 0.3 * e; x.translate(W / 2, H / 2); x.scale(s, s); x.translate(-W / 2, -H / 2); }); drawLayer(g, B, b * e, W, H, (x) => { const s = 1.3 - 0.3 * e; x.translate(W / 2, H / 2); x.scale(s, s); x.translate(-W / 2, -H / 2); }); break;
      case 'circle': { drawLayer(g, A, a, W, H); g.save(); g.beginPath(); g.arc(W / 2, H / 2, Math.hypot(W, H) / 2 * e, 0, Math.PI * 2); g.clip(); drawLayer(g, B, b, W, H); g.restore(); break; }
      case 'blur': g.save(); g.filter = `blur(${12 * scale * Math.sin(p * Math.PI)}px)`; drawLayer(g, A, a, W, H); drawLayer(g, B, b * e, W, H); g.restore(); break;
      case 'spin': drawLayer(g, A, a * (1 - e), W, H, (x) => { x.translate(W / 2, H / 2); x.rotate(e * Math.PI); x.scale(1 - e * 0.8, 1 - e * 0.8); x.translate(-W / 2, -H / 2); }); drawLayer(g, B, b * e, W, H, (x) => { x.translate(W / 2, H / 2); x.rotate((e - 1) * Math.PI); x.scale(0.2 + e * 0.8, 0.2 + e * 0.8); x.translate(-W / 2, -H / 2); }); break;
      default: drawLayer(g, A, a, W, H); drawLayer(g, B, b * e, W, H);
    }
  }
  function wrapLines(g, text, maxW) {
    const out = [];
    for (const para of String(text).split('\n')) {
      let line = ''; for (const word of para.split(' ')) { const t = line ? line + ' ' + word : word; if (g.measureText(t).width > maxW && line) { out.push(line); line = word; } else line = t; } out.push(line);
    }
    return out;
  }
  function drawTitle(g, c, T, W, H) {
    const x = c.text, t = T - c.start, l = len(c), inD = Math.min(0.6, l / 3), outD = Math.min(0.5, l / 3);
    const pin = U.clamp(t / inD, 0, 1), pout = U.clamp((l - t) / outD, 0, 1);
    let alpha = 1, dy = 0, sc = 1, chars = Infinity, wipe = 1;
    if (x.animIn === 'fade') alpha *= pin; else if (x.animIn === 'pop') { sc = 0.4 + 0.6 * back(pin); alpha *= Math.min(1, pin * 2); } else if (x.animIn === 'slide') { dy = (1 - ease(pin)) * H * 0.08; alpha *= pin; } else if (x.animIn === 'type') chars = Math.floor(U.clamp(t / Math.max(0.3, l * 0.5), 0, 1) * x.text.length); else if (x.animIn === 'wipe') wipe = ease(pin);
    if (x.animOut === 'fade') alpha *= pout; else if (x.animOut === 'slide') { dy += (1 - ease(pout)) * H * 0.08; alpha *= pout; }
    if (alpha <= 0) return;
    const size = H * x.size / 100, text = x.text.slice(0, chars);
    g.save(); g.globalAlpha = alpha;
    const weight = x.style === 'cinema' || x.style === 'sub' ? 600 : 800;
    g.font = `${x.style === 'cinema' ? 'italic ' : ''}${weight} ${size}px ${x.font}`; g.textBaseline = 'middle';
    const lines = wrapLines(g, text, W * 0.86), lh = size * 1.18, blockH = lines.length * lh;
    let cy = x.pos === 'top' ? H * 0.16 + blockH / 2 : x.pos === 'bottom' ? H * 0.82 - blockH / 2 : H / 2;
    if (x.style === 'lower') cy = H * 0.8 - blockH / 2;
    if (x.style === 'sub') cy = H * 0.88 - blockH / 2;
    cy += dy;
    if (x.style === 'cinema') { const bar = H * 0.11 * Math.min(pin, pout); g.save(); g.globalAlpha = 1; g.fillStyle = '#000'; g.fillRect(0, 0, W, bar); g.fillRect(0, H - bar, W, bar); g.restore(); }
    g.translate(W / 2, cy); g.scale(sc, sc); g.translate(-W / 2, -cy);
    if (wipe < 1) { g.beginPath(); g.rect(0, 0, W * wipe, H); g.clip(); }
    const left = x.style === 'lower'; g.textAlign = left ? 'left' : 'center';
    const tx = left ? W * 0.08 : W / 2;
    const widths = lines.map((ln) => g.measureText(ln).width), maxW = Math.max(...widths, 1);
    if (x.style === 'lower') { const pad = size * 0.45; g.fillStyle = 'rgba(10,14,20,.78)'; g.fillRect(tx - pad, cy - blockH / 2 - pad * 0.6, maxW + pad * 2, blockH + pad * 1.2); g.fillStyle = x.accent; g.fillRect(tx - pad, cy - blockH / 2 - pad * 0.6, size * 0.16, blockH + pad * 1.2); }
    if (x.style === 'box') { const pad = size * 0.5; g.fillStyle = x.accent; roundRect(g, W / 2 - maxW / 2 - pad, cy - blockH / 2 - pad * 0.55, maxW + pad * 2, blockH + pad * 1.1, size * 0.3); g.fill(); }
    if (x.style === 'sub') { const pad = size * 0.35; g.fillStyle = 'rgba(0,0,0,.6)'; roundRect(g, W / 2 - maxW / 2 - pad, cy - blockH / 2 - pad * 0.4, maxW + pad * 2, blockH + pad * 0.8, size * 0.15); g.fill(); }
    lines.forEach((ln, i) => {
      const y = cy - blockH / 2 + lh * (i + 0.5);
      if (x.style === 'neon') { g.shadowColor = x.accent; g.shadowBlur = size * 0.5; g.fillStyle = x.color; g.fillText(ln, tx, y); g.shadowBlur = size * 0.2; g.fillText(ln, tx, y); }
      else if (x.style === 'outline') { g.lineJoin = 'round'; g.lineWidth = size * 0.08; g.strokeStyle = x.color; g.strokeText(ln, tx, y); }
      else { if (x.style === 'bold' || x.style === 'cinema') { g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = size * 0.15; g.shadowOffsetY = size * 0.04; } g.fillStyle = x.color; g.fillText(ln, tx, y); }
      g.shadowBlur = 0; g.shadowOffsetY = 0;
    });
    g.restore();
  }
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  const active = (c, T) => T >= c.start - 1e-6 && T < end(c) - 1e-6;
  /* compose the frame at time T into g (W×H, scale = W / project width). srcOf(clip) gives the media element. */
  function composeFrame(g, T, W, H, srcOf) {
    const scale = W / P.w;
    g.save(); g.fillStyle = P.bg; g.fillRect(0, 0, W, H);
    const main = v1().filter((c) => active(c, T));
    const srcFor = (c) => (c.type === 'image' ? (media(c.mediaId) || {}).img : srcOf(c));
    if (main.length >= 2) {
      const [A, B] = main.slice(-2), p = U.clamp((T - B.start) / Math.max(0.001, B._ov || 0.001), 0, 1);
      const la = srcFor(A) && drawClip(A, T, W, H, scale, srcFor(A), 0), lb = srcFor(B) && drawClip(B, T, W, H, scale, srcFor(B), 1);
      transition(g, la, lb, A.tf.opacity * fadeAlpha(A, T), B.tf.opacity * fadeAlpha(B, T), p, B.trans.type, W, H, scale);
    } else if (main.length === 1) { const c = main[0], s = srcFor(c); if (s) drawLayer(g, drawClip(c, T, W, H, scale, s, 0), c.tf.opacity * fadeAlpha(c, T), W, H); }
    for (const c of P.clips) if (c.track === 'v2' && active(c, T)) { const s = srcFor(c); if (s) drawLayer(g, drawClip(c, T, W, H, scale, s, 2), c.tf.opacity * fadeAlpha(c, T), W, H); }
    for (const c of P.clips) if (c.track === 't1' && active(c, T)) drawTitle(g, c, T, W, H);
    g.restore();
  }

  /* ======================= preview playback ======================= */
  let T = 0, playing = false, t0 = 0, raf = 0, sel = null, pps = 60, drawQueued = false;
  const pv = () => $('#ve-canvas');
  function previewSize() {
    const host = $('#ve-stage'); if (!host) return [P.w / 2, P.h / 2];
    const maxW = Math.max(160, host.clientWidth - 24), maxH = Math.max(120, host.clientHeight - 24), s = Math.min(maxW / P.w, maxH / P.h);
    return [Math.round(P.w * s), Math.round(P.h * s)];
  }
  function draw() {
    drawQueued = false; const c = pv(); if (!c || $('#video').hidden) return;
    const [w, h] = previewSize(), dpr = Math.min(2, devicePixelRatio || 1), iw = Math.min(Math.round(w * dpr), P.w), ih = Math.round(iw * P.h / P.w);
    if (c.width !== iw || c.height !== ih) { c.width = iw; c.height = ih; }
    c.style.width = w + 'px'; c.style.height = h + 'px';
    composeFrame(c.getContext('2d'), T, iw, ih, (cl) => { const e = elFor(cl); return e && e.readyState >= 2 ? e : null; });
    updateClock();
  }
  function requestDraw() { if (!drawQueued) { drawQueued = true; requestAnimationFrame(draw); } }
  function syncElements(force) {
    for (const c of P.clips) {
      const e = elFor(c); if (!e) continue;
      if (active(c, T)) {
        const target = c.in + (T - c.start) * c.speed;
        e.playbackRate = U.clamp(c.speed, 0.0625, 16);
        e.volume = c.muted ? 0 : U.clamp(c.volume * fadeAlpha(c, T), 0, 1);
        if (playing) { if (e.paused) { e.currentTime = target; e.play().catch(() => {}); } else if (Math.abs(e.currentTime - target) > 0.3) e.currentTime = target; }
        else { if (!e.paused) e.pause(); if (force || Math.abs(e.currentTime - target) > 0.02) e.currentTime = target; }
      } else if (!e.paused) e.pause();
    }
  }
  function tick(now) {
    if (!playing) return;
    T = (now - t0) / 1000;
    const d = duration();
    if (T >= d) { T = d; pause(); }
    syncElements(); draw(); movePlayhead();
    raf = requestAnimationFrame(tick);
  }
  function play() { if (!P.clips.length) return; if (T >= duration() - 0.05) T = 0; playing = true; t0 = performance.now() - T * 1000; syncElements(true); raf = requestAnimationFrame(tick); updateTransport(); }
  function pause() { playing = false; cancelAnimationFrame(raf); for (const e of els.values()) e.pause(); updateTransport(); requestDraw(); }
  V.togglePlay = () => (playing ? pause() : play());
  function seek(t) { T = U.clamp(t, 0, Math.max(0, duration())); if (playing) t0 = performance.now() - T * 1000; syncElements(true); requestDraw(); movePlayhead(); }
  V.seek = seek;
  function updateClock() { const c = $('#ve-clock'); if (c) c.textContent = M.fmtTime(T, true) + ' / ' + M.fmtTime(duration(), true); }
  function updateTransport() { const b = $('#ve-play'); if (b) { b.innerHTML = svg(playing ? 'M7 5h4v14H7zM13 5h4v14h-4z' : 'M7 5v14l12-7z'); b.setAttribute('aria-label', playing ? 'Pause' : 'Play'); } }

  /* ======================= editing operations ======================= */
  const selected = () => P.clips.find((c) => c.id === sel);
  function split() {
    let c = selected(); if (!c || !active(c, T)) c = v1().find((x) => active(x, T)) || P.clips.find((x) => active(x, T)); if (!c) return CP.ui.toast('Move the playhead over a clip to split it');
    const at = T - c.start; if (at < 0.05 || len(c) - at < 0.05) return;
    const d = JSON.parse(JSON.stringify(c)); d.id = U.uid(); d.trans = { type: 'none', dur: 0.8 }; d.fadeIn = 0; c.fadeOut = 0;
    if (c.type === 'video' || c.type === 'audio') { const sp = c.in + at * c.speed; c.out = sp; d.in = sp; } else { d.dur = c.dur - at; c.dur = at; }
    d.start = T; P.clips.splice(P.clips.indexOf(c) + 1, 0, d); sel = d.id; commit('Split');
  }
  function del() { const c = selected(); if (!c) return; P.clips.splice(P.clips.indexOf(c), 1); sel = null; cleanupEls(); commit('Delete'); }
  function dup() { const c = selected(); if (!c) return; const d = JSON.parse(JSON.stringify(c)); d.id = U.uid(); if (c.track !== 'v1') d.start = end(c); P.clips.splice(P.clips.indexOf(c) + 1, 0, d); sel = d.id; commit('Duplicate'); }
  function addTitle(style = 'bold') {
    const m = { id: 'title', kind: 'title' };
    const c = mkClip(m, 't1', { type: 'title', start: T, dur: 3, text: { text: 'Your title here', style, font: 'Montserrat, Arial, sans-serif', size: style === 'sub' ? 5 : style === 'lower' ? 6 : 10, color: '#ffffff', accent: '#0096dc', pos: style === 'bold' || style === 'neon' || style === 'outline' ? 'center' : 'bottom', animIn: style === 'type' ? 'type' : 'pop', animOut: 'fade' } });
    P.clips.push(c); sel = c.id; commit('Add title');
  }
  async function frameCanvas(full = true) {
    const W = full ? P.w : pv().width, H = full ? P.h : pv().height, c = U.canvas(W, H);
    composeFrame(c.getContext('2d'), T, W, H, (cl) => { const e = elFor(cl); return e && e.readyState >= 2 ? e : null; });
    return c;
  }
  function markIn() { P.inPt = T; if (P.outPt != null && P.outPt <= T) P.outPt = null; commit('Mark in'); CP.ui.toast('Scene start marked at ' + M.fmtTime(T, true)); }
  function markOut() { P.outPt = T; if (P.inPt != null && P.inPt >= T) P.inPt = null; commit('Mark out'); CP.ui.toast('Scene end marked at ' + M.fmtTime(T, true) + '. Export → Marked scene.'); }
  function clearMarks() { P.inPt = P.outPt = null; commit('Clear marks'); }
  async function saveFrame() { const c = await frameCanvas(); M.saveFrameDialog(c, P.name + ' ' + M.fmtTime(T, true).replace(/[:.]/g, '-')); }
  async function copyFrame() { const c = await frameCanvas(); c.toBlob((b) => navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]).then(() => CP.ui.toast('Frame copied'), () => CP.ui.toast('Copying is not available here')), 'image/png'); }
  async function snapshotToPhoto() {
    const c = await frameCanvas(); const d = CP.newDocFromCanvas(c, P.name + ' frame ' + M.fmtTime(T).replace(/:/g, '-'));
    CP.app.openEditor('photo'); CP.addDoc(d); CP.ui.toast('Frame opened in the Photo editor');
  }
  async function freezeFrame() {
    const c = await frameCanvas(); const b = await new Promise((r) => c.toBlob(r, 'image/png'));
    const m = { id: U.uid(), name: 'Freeze ' + M.fmtTime(T), kind: 'image', blob: b, url: URL.createObjectURL(b), w: c.width, h: c.height, thumb: thumbOf(c), thumbs: [] };
    m.img = await loadImg(m.url); V.media.push(m);
    const at = v1().find((x) => active(x, T));
    if (at && T - at.start > 0.05) { sel = at.id; split(); }
    const idx = at ? P.clips.indexOf(P.clips.find((x) => x.id === sel) || at) : P.clips.length;
    const nc = mkClip(m, 'v1', { dur: 2, tf: { fit: 'fill', zoom: 1, x: 0, y: 0, rot: 0, flip: false, opacity: 1, kenburns: false } });
    P.clips.splice(idx, 0, nc); sel = nc.id; renderBin(); commit('Freeze frame');
  }

  /* ======================= export ======================= */
  async function seekEl(e, t) {
    if (e.readyState >= 2 && Math.abs(e.currentTime - t) < 0.0005) return;
    await new Promise((res) => { const done = () => { e.removeEventListener('seeked', done); clearTimeout(tm); res(); }; const tm = setTimeout(done, 4000); e.addEventListener('seeked', done); e.currentTime = t; });
  }
  async function pickVideoCodec(fmt, w, h, fps, bitrate) {
    const cands = fmt === 'webm' ? ['vp09.00.40.08', 'vp09.00.31.08', 'vp8'] : ['avc1.640034', 'avc1.640033', 'avc1.64002A', 'avc1.4D4033', 'avc1.42E033'];
    for (const codec of cands) {
      const cfg = { codec, width: w, height: h, bitrate, framerate: fps, latencyMode: 'quality' };
      if (codec.startsWith('avc')) cfg.avc = { format: 'avc' };
      try { const r = await VideoEncoder.isConfigSupported(cfg); if (r.supported) return r.config; } catch (e) {}
      cfg.hardwareAcceleration = 'prefer-software';
      try { const r = await VideoEncoder.isConfigSupported(cfg); if (r.supported) return r.config; } catch (e) {}
    }
    return null;
  }
  async function pickAudioCodec(fmt) {
    const cands = fmt === 'webm' ? ['opus'] : ['mp4a.40.2', 'opus'];
    for (const codec of cands) { const cfg = { codec, sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 }; try { const r = await AudioEncoder.isConfigSupported(cfg); if (r.supported) return r.config; } catch (e) {} }
    return null;
  }
  async function mixAudio(total, from = 0) {
    const sr = 48000, n = Math.max(1, Math.ceil(total * sr)), oac = new OfflineAudioContext(2, n, sr); let any = false;
    for (const c of P.clips) {
      if (c.muted || !(c.type === 'video' || c.type === 'audio') || c.volume <= 0) continue;
      const m = media(c.mediaId); const buf = m && await audioBuffer(m); if (!buf) continue;
      const src = oac.createBufferSource(); src.buffer = buf; src.playbackRate.value = c.speed;
      const l = len(c), s = c.start - from;            // clip start relative to the export range
      if (s + l <= 0 || s >= total) continue;
      const gn = oac.createGain(), skip = Math.max(0, -s), at = Math.max(0, s);
      const envAt = (t) => { const u = t - s; let a = c.volume; if (c.fadeIn > 0 && u < c.fadeIn) a *= u / c.fadeIn; if (c.fadeOut > 0 && u > l - c.fadeOut) a *= (l - u) / c.fadeOut; return Math.max(0, a); };
      gn.gain.setValueAtTime(envAt(at), at);
      if (c.fadeIn > 0 && s + c.fadeIn > at) gn.gain.linearRampToValueAtTime(c.volume, s + c.fadeIn);
      if (c.fadeOut > 0) { const fo = Math.max(at, s + l - c.fadeOut); gn.gain.setValueAtTime(envAt(fo), fo); gn.gain.linearRampToValueAtTime(0, s + l); }
      src.connect(gn).connect(oac.destination); src.start(at, c.in + skip * c.speed); src.stop(s + l); any = true;
    }
    return any ? oac.startRendering() : null;
  }
  V.exportVideo = async ({ fmt = 'mp4', short = 1080, fps = P.fps, quality = 'high', onProgress, signal, range }) => {
    if (!window.VideoEncoder) throw new Error('This browser cannot export video (WebCodecs is missing). Use Chrome, Edge or the CydArt desktop app.');
    const from = range ? range[0] : 0, total = range ? range[1] - range[0] : duration(); if (!(total > 0)) throw new Error('Nothing to export: the timeline or the chosen range is empty');
    const container = fmt === 'webm' ? 'webm' : 'mp4';
    const s = short ? Math.min(1, short / Math.min(P.w, P.h)) : 1;
    const W = Math.round(P.w * s / 2) * 2, H = Math.round(P.h * s / 2) * 2;
    const bpp = { high: 0.12, medium: 0.07, small: 0.04 }[quality] || 0.1, bitrate = Math.round(W * H * fps * bpp);
    const vcfg = await pickVideoCodec(container, W, H, fps, bitrate); if (!vcfg) throw new Error('No video encoder available for ' + container.toUpperCase());
    const acfg = await pickAudioCodec(container);
    await CP.util.loadScript(CP.ROOT + 'vendor/' + (container === 'webm' ? 'webm-muxer.js' : 'mp4-muxer.js'));
    const audio = acfg ? await mixAudio(total, from) : null;
    const Mx = container === 'webm' ? window.WebMMuxer : window.Mp4Muxer;
    const muxOpts = container === 'webm'
      ? { target: new Mx.ArrayBufferTarget(), video: { codec: vcfg.codec.startsWith('vp09') ? 'V_VP9' : 'V_VP8', width: W, height: H, frameRate: fps }, audio: audio ? { codec: 'A_OPUS', sampleRate: 48000, numberOfChannels: 2 } : undefined, firstTimestampBehavior: 'offset' }
      : { target: new Mx.ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H, frameRate: fps }, audio: audio ? { codec: acfg.codec.startsWith('mp4a') ? 'aac' : 'opus', sampleRate: 48000, numberOfChannels: 2 } : undefined, fastStart: 'in-memory', firstTimestampBehavior: 'offset' };
    const mux = new Mx.Muxer(muxOpts);
    let err = null;
    const venc = new VideoEncoder({ output: (ch, meta) => mux.addVideoChunk(ch, meta), error: (e) => { err = e; } });
    venc.configure(vcfg);
    // dedicated, muted elements for frame-accurate seeking
    const xel = new Map();
    for (const c of P.clips) if (c.type === 'video') { const e = document.createElement('video'); e.muted = true; e.preload = 'auto'; e.src = media(c.mediaId).url; xel.set(c.id, e); }
    await Promise.all([...xel.values()].map((e) => new Promise((r) => { if (e.readyState >= 2) r(); else { e.onloadeddata = r; e.onerror = r; setTimeout(r, 8000); } })));
    const cv = U.canvas(W, H), g = cv.getContext('2d', { alpha: false });
    const frames = Math.ceil(total * fps);
    try {
      for (let i = 0; i < frames; i++) {
        if (signal && signal.aborted) throw new Error('Export cancelled');
        if (err) throw err;
        const t = from + i / fps;
        await Promise.all(P.clips.filter((c) => c.type === 'video' && active(c, t)).map((c) => seekEl(xel.get(c.id), Math.min(media(c.mediaId).duration - 0.001, c.in + (t - c.start) * c.speed + 0.0005))));
        composeFrame(g, t, W, H, (c) => xel.get(c.id));
        const fr = new VideoFrame(cv, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
        venc.encode(fr, { keyFrame: i % (fps * 2) === 0 }); fr.close();
        while (venc.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 4));
        onProgress && onProgress((i + 1) / frames * (audio ? 0.92 : 1));
      }
      await venc.flush(); venc.close();
      if (audio) {
        const aenc = new AudioEncoder({ output: (ch, meta) => mux.addAudioChunk(ch, meta), error: (e) => { err = e; } });
        aenc.configure(acfg);
        const chunk = 4800, L = audio.getChannelData(0), R = audio.getChannelData(1);
        for (let off = 0; off < audio.length; off += chunk) {
          const n = Math.min(chunk, audio.length - off), data = new Float32Array(n * 2); data.set(L.subarray(off, off + n), 0); data.set(R.subarray(off, off + n), n);
          const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(off / 48000 * 1e6), data });
          aenc.encode(ad); ad.close();
          if (aenc.encodeQueueSize > 20) await new Promise((r) => setTimeout(r, 2));
        }
        await aenc.flush(); aenc.close();
      }
      if (err) throw err;
      mux.finalize();
      onProgress && onProgress(1);
      return new Blob([mux.target.buffer], { type: container === 'webm' ? 'video/webm' : 'video/mp4' });
    } finally {
      try { if (venc.state !== 'closed') venc.close(); } catch (e) {}
      for (const e of xel.values()) { e.removeAttribute('src'); e.load(); }
    }
  };
  /* render frames to pictures in a ZIP */
  V.exportFrames = async ({ pic = 'png', every = 1, short = 1080, fps = P.fps, range, onProgress, signal }) => {
    const from = range ? range[0] : 0, total = range ? range[1] - range[0] : duration(); if (!(total > 0)) throw new Error('Nothing to export');
    const s = short ? Math.min(1, short / Math.min(P.w, P.h)) : 1, W = Math.round(P.w * s), H = Math.round(P.h * s);
    const f = CP.SAVE_FORMATS.find((x) => x.id === pic), fflate = await CP.loadZip(), files = {};
    const xel = new Map();
    for (const c of P.clips) if (c.type === 'video') { const e = document.createElement('video'); e.muted = true; e.preload = 'auto'; e.src = media(c.mediaId).url; xel.set(c.id, e); }
    await Promise.all([...xel.values()].map((e) => new Promise((r) => { if (e.readyState >= 2) r(); else { e.onloadeddata = r; e.onerror = r; setTimeout(r, 8000); } })));
    const cv = U.canvas(W, H), g = cv.getContext('2d'), step = every > 0 ? every : 1 / fps, n = Math.max(1, Math.floor(total / step + 1e-6));
    try {
      for (let i = 0; i < n; i++) {
        if (signal && signal.aborted) throw new Error('Export cancelled');
        const t = from + i * step;
        await Promise.all(P.clips.filter((c) => c.type === 'video' && active(c, t)).map((c) => seekEl(xel.get(c.id), Math.min(media(c.mediaId).duration - 0.001, c.in + (t - c.start) * c.speed + 0.0005))));
        composeFrame(g, t, W, H, (c) => xel.get(c.id));
        const b = await CP.encodeCanvas(cv, pic, { quality: f.quality });
        files[`${P.name} ${String(i + 1).padStart(5, '0')}.${f.ext}`] = [new Uint8Array(await b.arrayBuffer()), { level: 0 }];
        onProgress && onProgress((i + 1) / n);
      }
    } finally { for (const e of xel.values()) { e.removeAttribute('src'); e.load(); } }
    const zip = await new Promise((res, rej) => fflate.zip(files, (e, o) => (e ? rej(e) : res(o))));
    return new Blob([zip], { type: 'application/zip' });
  };
  function exportDialog() {
    if (!P.clips.length) return CP.ui.toast('Add some clips to the timeline first');
    pause();
    let fmt = 'mp4';
    const grid = el('div', { class: 've-fmts' }), desc = el('div', { class: 'note' });
    const drawFmts = () => {
      grid.innerHTML = '';
      for (const [g, gname] of M.GROUPS) {
        const row = el('div', { class: 'fmt-grid', role: 'radiogroup', 'aria-label': gname });
        M.EXPORT_FORMATS.filter((f) => f.group === g).forEach((f) => { const ok = M.available(f); const b = el('button', { type: 'button', class: (f.id === fmt ? 'on ' : '') + (ok ? '' : 'dis'), role: 'radio', 'aria-checked': f.id === fmt }, f.label, el('small', {}, '.' + f.ext + (ok ? '' : ' · desktop app'))); b.onclick = () => { fmt = f.id; drawFmts(); }; row.append(b); });
        grid.append(el('h4', { class: 've-fmt-h' }, gname), row);
      }
      const f = M.EXPORT_FORMATS.find((x) => x.id === fmt); desc.textContent = f.desc; framesBox.hidden = !f.frames;
    };
    const sel = selected();
    const scopes = [['all', `Whole video (${M.fmtTime(duration())})`]];
    if (P.inPt != null || P.outPt != null) { const [a, b] = markRange(); scopes.push(['range', `Marked scene ${M.fmtTime(a, true)} – ${M.fmtTime(b, true)}`]); }
    if (sel) scopes.push(['clip', `Selected clip only (${M.fmtTime(sel.start, true)} – ${M.fmtTime(end(sel), true)})`]);
    const scope = el('select', { 'aria-label': 'What to export' }, scopes.map(([v, n]) => el('option', { value: v, selected: v === (P.inPt != null || P.outPt != null ? 'range' : 'all') }, n)));
    const res = el('select', { 'aria-label': 'Resolution' }, [[2160, '4K (2160p)'], [1440, '1440p'], [1080, '1080p (Full HD)'], [720, '720p'], [480, '480p'], [360, '360p']].filter(([v]) => v <= Math.min(P.w, P.h) || v === 1080).map(([v, n]) => el('option', { value: v, selected: v === Math.min(1080, Math.min(P.w, P.h)) }, n)));
    const fps = el('select', { 'aria-label': 'Frame rate' }, [24, 25, 30, 50, 60].map((f) => el('option', { value: f, selected: f === P.fps }, f + ' fps')));
    const q = el('select', { 'aria-label': 'Quality' }, [['high', 'High'], ['medium', 'Medium'], ['small', 'Small file']].map(([v, n]) => el('option', { value: v }, n)));
    const pic = el('select', { 'aria-label': 'Picture format' }, CP.SAVE_FORMATS.filter((f) => !f.disabled && f.id !== 'psd').map((f) => el('option', { value: f.id }, f.label)));
    const every = el('select', { 'aria-label': 'Which frames' }, [[0, 'Every frame'], [0.5, '2 per second'], [1, '1 per second'], [5, 'Every 5 seconds']].map(([v, n]) => el('option', { value: v, selected: v === 1 }, n)));
    const framesBox = el('div', { class: 'row gap', style: { flexWrap: 'wrap' } }, el('label', { class: 'opt' }, el('span', {}, 'Pictures'), pic), el('label', { class: 'opt' }, el('span', {}, 'Frames'), every));
    const name = el('input', { type: 'text', value: P.name, 'aria-label': 'File name' });
    drawFmts();
    CP.ui.dialog({ title: 'Export video', wide: true,
      body: el('div', { class: 'stack' }, el('label', { class: 'field' }, el('span', {}, 'File name'), name), el('label', { class: 'field' }, el('span', {}, 'Export'), scope), grid, desc, framesBox,
        el('div', { class: 'row gap', style: { flexWrap: 'wrap' } }, el('label', { class: 'opt' }, el('span', {}, 'Resolution'), res), el('label', { class: 'opt' }, el('span', {}, 'Frame rate'), fps), el('label', { class: 'opt' }, el('span', {}, 'Quality'), q)),
        el('p', { class: 'muted sm' }, 'Exporting renders every frame, so it takes a little while. Formats other than MP4 and WebM go through a conversion step afterwards.')),
      buttons: [['Cancel'], ['Export', () => {
        const f = M.EXPORT_FORMATS.find((x) => x.id === fmt); if (!M.available(f)) { CP.ui.toast(f.label + ' needs the CydArt desktop app', 5000); return false; }
        const range = scope.value === 'range' ? markRange() : scope.value === 'clip' && sel ? [sel.start, end(sel)] : null;
        runExport({ fmt, short: +res.value, fps: +fps.value, quality: q.value, name: name.value.trim() || P.name, range, pic: pic.value, every: +every.value });
      }, 'primary']] });
  }
  function markRange() { const d = duration(); let a = P.inPt == null ? 0 : P.inPt, b = P.outPt == null ? d : P.outPt; if (b < a) [a, b] = [b, a]; return [U.clamp(a, 0, d), U.clamp(b, 0, d)]; }
  async function runExport(o) {
    const f = M.EXPORT_FORMATS.find((x) => x.id === o.fmt), ac = new AbortController();
    const bar = el('i'), label = el('span', {}, 'Rendering…');
    const box = el('div', { class: 'stack' }, label, el('div', { class: 'toast-bar' }, bar));
    const dlg = CP.ui.dialog({ title: 'Exporting ' + f.label, body: box, buttons: [['Cancel', () => { ac.abort(); }]] });
    const t0 = performance.now();
    const prog = (p) => { bar.style.width = Math.round(p * 100) + '%'; const el2 = (performance.now() - t0) / 1000; label.textContent = `Rendering… ${Math.round(p * 100)}%` + (p > 0.03 ? ` · about ${M.fmtTime(el2 / p - el2)} left` : ''); };
    try {
      let out;
      if (f.frames) out = await V.exportFrames({ pic: o.pic, every: o.every, short: o.short, fps: o.fps, range: o.range, signal: ac.signal, onProgress: prog });
      else {
        const base = await V.exportVideo({ fmt: f.id === 'webm' ? 'webm' : 'mp4', short: o.short, fps: o.fps, quality: f.native ? o.quality : 'high', range: o.range, signal: ac.signal, onProgress: prog });
        out = base;
        if (!f.native) { label.textContent = 'Converting to ' + f.label + '…'; bar.style.width = '100%'; out = await M.convert(base, f.id, 'export.mp4'); }
      }
      dlg.close();
      await U.download(out, o.name + '.' + f.ext);
      CP.ui.toast(`Exported ${o.name}.${f.ext} (${U.fmtBytes(out.size)})`, 5000);
    } catch (e) { dlg.close(); if (!/cancel/i.test(e.message)) CP.ui.error('Export failed', e); else CP.ui.toast('Export cancelled'); }
  }

  /* ======================= project files (.cydvideo) ======================= */
  async function saveProject() {
    const fflate = await CP.loadZip(); const files = {};
    const used = V.media.filter((m) => P.clips.some((c) => c.mediaId === m.id));
    for (const m of used) files['media/' + m.id] = [new Uint8Array(await (m.blob || m.file).arrayBuffer()), { level: 0 }];
    files['project.json'] = fflate.strToU8(JSON.stringify({ app: 'CydArt Video', version: CP.VERSION, project: JSON.parse(snap()), media: used.map((m) => ({ id: m.id, name: m.name, kind: m.kind, duration: m.duration, w: m.w, h: m.h })) }));
    const zip = await new Promise((res, rej) => fflate.zip(files, (e, o) => (e ? rej(e) : res(o))));
    await U.download(new Blob([zip], { type: 'application/zip' }), P.name + '.cydvideo.zip'); V.dirty = false;
  }
  async function openProject(file) {
    const fflate = await CP.loadZip(); const t = CP.ui.progress('Opening project…');
    try {
      const data = await new Promise(async (res, rej) => fflate.unzip(new Uint8Array(await file.arrayBuffer()), (e, o) => (e ? rej(e) : res(o))));
      const meta = JSON.parse(fflate.strFromU8(data['project.json']));
      if (meta.app !== 'CydArt Video') throw new Error('Not a CydArt video project');
      for (const mm of meta.media) {
        if (V.media.some((m) => m.id === mm.id)) continue;
        const blob = new Blob([data['media/' + mm.id]]); const m = { ...mm, blob, file: new File([blob], mm.name), thumbs: [] };
        m.url = URL.createObjectURL(blob);
        if (m.kind === 'image') { m.img = await loadImg(m.url); m.thumb = thumbOf(m.img); } else if (m.kind === 'video') makeThumbs(m); else peaksOf(m);
        V.media.push(m);
      }
      Object.assign(P, meta.project); hist.stack = []; hist.i = -1; sel = null; commit('Open project'); renderBin(); seek(0);
    } catch (e) { CP.ui.error('Could not open the project', e); } finally { t.done(); }
  }

  /* ======================= UI ======================= */
  let built = false, player = null;
  V.mount = () => {
    if (built) return; built = true;
    const root = $('#video');
    root.innerHTML = `
      <div class="vview" id="vp-view">
        <aside class="vp-list" aria-label="Opened videos"><div class="vp-list-head">Videos <button class="icon-btn sm" id="vp-add" aria-label="Open videos" title="Open videos">+</button></div><div id="vp-items"></div></aside>
        <div class="vp-main" id="vp-host"><div class="vp-empty" id="vp-empty"><h2>Play any video</h2><p>MP4, MOV, MKV, AVI, WMV, WebM, MPEG, 3GP, FLV and more. Formats this ${CP.desktop ? 'PC' : 'browser'} can't play directly are converted automatically.</p><div class="row gap"><button class="btn primary raised" id="vp-open">Open videos</button><button class="btn raised" id="vp-toedit">Video editor</button></div></div></div>
      </div>
      <div class="vview" id="ve-view" hidden>
        <div class="ve-top">
          <input id="ve-name" type="text" aria-label="Project name" value="${P.name}">
          <select id="ve-aspect" aria-label="Aspect ratio">${ASPECTS.map(([k, w, h, d]) => `<option value="${k}">${k} · ${d}</option>`).join('')}</select>
          <select id="ve-fps" aria-label="Frame rate">${[24, 25, 30, 50, 60].map((f) => `<option value="${f}" ${f === 30 ? 'selected' : ''}>${f} fps</option>`).join('')}</select>
          <label class="opt" title="Background color"><span>Background</span><input type="color" id="ve-bg" value="#000000"></label>
          <span class="ve-sp"></span>
          <button class="icon-btn" id="ve-undo" title="Undo (Ctrl+Z)" aria-label="Undo">${svg('M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3')}</button>
          <button class="icon-btn" id="ve-redo" title="Redo (Ctrl+Shift+Z)" aria-label="Redo">${svg('M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h3')}</button>
          <button class="btn sm raised" id="ve-projmenu">Project</button>
          <button class="btn primary raised" id="ve-export">Export</button>
        </div>
        <div class="ve-mid">
          <aside class="ve-bin" aria-label="Media">
            <div class="ve-bin-acts"><button class="btn sm primary raised" id="ve-import">Import media</button><button class="btn sm raised" id="ve-title">Title</button></div>
            <div class="ve-bin-list" id="ve-bin"></div>
          </aside>
          <section class="ve-center">
            <div class="ve-stage" id="ve-stage"><canvas id="ve-canvas" aria-label="Video preview"></canvas><div class="ve-drop" id="ve-drop">Import videos, music or photos, or drop them here</div></div>
            <div class="ve-transport">
              <button class="icon-btn" id="ve-start" title="Go to start (Home)" aria-label="Go to start">${svg('M6 5v14M18 6l-9 6 9 6z')}</button>
              <button class="icon-btn" id="ve-fb" title="Back one frame (←)" aria-label="Back one frame">${svg('M18 5v14M14 5l-9 7 9 7z')}</button>
              <button class="icon-btn big" id="ve-play" title="Play / pause (Space)" aria-label="Play">${svg('M7 5v14l12-7z')}</button>
              <button class="icon-btn" id="ve-ff" title="Forward one frame (→)" aria-label="Forward one frame">${svg('M6 5v14M10 5l9 7-9 7z')}</button>
              <span class="ve-clock" id="ve-clock">0:00.00 / 0:00.00</span>
              <span class="ve-sp"></span>
              <button class="btn sm" id="ve-split" title="Split at playhead (S)">Split</button>
              <button class="btn sm" id="ve-freeze" title="Insert a freeze frame">Freeze frame</button>
              <button class="btn sm" id="ve-in" title="Mark scene start (I)">Mark in</button>
              <button class="btn sm" id="ve-out" title="Mark scene end (O)">Mark out</button>
              <button class="btn sm" id="ve-shot" title="Save or edit this frame as a picture">Screenshot</button>
              <button class="btn sm" id="ve-del" title="Delete clip (Delete)">Delete</button>
            </div>
          </section>
          <aside class="ve-insp" id="ve-insp" aria-label="Clip settings"></aside>
        </div>
        <div class="ve-tl" id="ve-tl">
          <div class="ve-tl-bar"><span class="muted sm">Drag clips to reorder · drag edges to trim · S splits at the playhead</span><span class="ve-sp"></span><label class="opt">Zoom <input type="range" id="ve-zoom" min="8" max="400" value="60" aria-label="Timeline zoom"></label></div>
          <div class="ve-tl-scroll" id="ve-tl-scroll">
            <div class="ve-tl-inner" id="ve-tl-inner">
              <canvas class="ve-ruler" id="ve-ruler" height="26"></canvas>
              ${TRACKS.map(([k, n]) => `<div class="ve-lane" data-track="${k}"><span class="ve-lane-name">${n}</span></div>`).join('')}
              <div class="ve-playhead" id="ve-playhead"></div>
            </div>
          </div>
        </div>
      </div>`;
    wireUI(); hist.stack = [snap()]; hist.i = 0; renderAll();
  };

  function setSub(sub) {
    V.sub = sub; $('#vp-view').hidden = sub !== 'player'; $('#ve-view').hidden = sub !== 'editor';
    document.querySelectorAll('#video-sub .subtab').forEach((b) => b.classList.toggle('on', b.dataset.sub === sub));
    if (sub === 'player') pause(); else { player && player.stop(); requestDraw(); setTimeout(() => { renderTimeline(); requestDraw(); }, 30); }
  }
  V.setSub = setSub;
  V.show = (sub) => { V.mount(); setSub(sub || V.sub || 'player'); };
  V.leave = () => { if (!built) return; pause(); player && player.stop(); };

  /* ---------- player view ---------- */
  function playlistAdd(files) {
    for (const f of files) V.playlist.push({ id: U.uid(), file: f, name: f.name || 'video' });
    renderPlaylist();
    if (files.length) playItem(V.playlist[V.playlist.length - files.length]);
  }
  function playItem(it) {
    $('#vp-empty') && ($('#vp-empty').hidden = true);
    if (!player) player = new CP.Player($('#vp-host'), { onEdit: (cur) => { V.show('editor'); V.addMedia([cur.file], { toTimeline: true }); }, onSnapshot: (c, name) => { CP.app.openEditor('photo'); CP.addDoc(CP.newDocFromCanvas(c, name)); }, onEnded: () => { const i = V.playlist.indexOf(V.current); if (V.playlist[i + 1]) playItem(V.playlist[i + 1]); } });
    V.current = it; player.load(it.file, it.name); renderPlaylist(); player.root.focus();
  }
  function renderPlaylist() {
    const box = $('#vp-items'); if (!box) return; box.innerHTML = '';
    if (!V.playlist.length) box.append(el('p', { class: 'muted sm pad' }, 'No videos yet'));
    V.playlist.forEach((it) => {
      const b = el('button', { class: 'vp-item' + (it === V.current ? ' on' : ''), type: 'button', title: it.name }, el('span', { class: 'vp-thumb' }), el('span', { class: 'vp-name' }, it.name));
      b.onclick = () => playItem(it);
      b.oncontextmenu = (e) => { e.preventDefault(); CP.ui.contextMenu(e.clientX, e.clientY, [['Play', () => playItem(it)], ['Edit in the Video editor', () => { V.show('editor'); V.addMedia([it.file], { toTimeline: true }); }], ['Convert…', () => CP.converter.open([it.file])], ['Remove from list', () => { V.playlist.splice(V.playlist.indexOf(it), 1); renderPlaylist(); }]]); };
      box.append(b);
      if (it.thumb) b.firstChild.append(it.thumb); else if (!it.thumbing) { it.thumbing = true; const u = URL.createObjectURL(it.file); M.grabFrame(u, 1, 120).then((c) => { it.thumb = c; b.firstChild.append(c); }).catch(() => {}).finally(() => URL.revokeObjectURL(u)); }
    });
  }
  function convertDialog(it) {
    const sel2 = el('select', { 'aria-label': 'Format' }, M.EXPORT_FORMATS.filter((f) => f.id !== 'webm').map((f) => el('option', { value: f.id }, f.label)));
    CP.ui.dialog({ title: 'Convert ' + it.name, body: el('div', { class: 'stack' }, el('label', { class: 'field' }, el('span', {}, 'Format'), sel2), el('p', { class: 'muted sm' }, 'The original is not changed.')),
      buttons: [['Cancel'], ['Convert', async () => {
        try {
          const f = M.EXPORT_FORMATS.find((x) => x.id === sel2.value);
          let src = it.file; if (f.id === 'mp4' && U.ext(it.name) !== 'mp4') src = await M.transcode(it.file, it.name);
          const out = f.native ? src : await M.convert(it.file, f.id, it.name);
          await U.download(out, U.baseName(it.name) + '.' + f.ext);
        } catch (e) { CP.ui.error('Conversion failed', e); }
      }, 'primary']] });
  }
  V.openFiles = (files, { edit = false } = {}) => {
    V.show(edit ? 'editor' : 'player');
    if (edit) V.addMedia(files, { toTimeline: true }); else playlistAdd(files);
  };

  /* ---------- editor view ---------- */
  function wireUI() {
    $('#vp-add').onclick = $('#vp-open').onclick = async () => { const f = await CP.ui.pickFiles({ multiple: true, accept: M.ACCEPT }); if (f.length) playlistAdd(f); };
    $('#vp-toedit').onclick = () => setSub('editor');
    $('#ve-import').onclick = async () => { const f = await CP.ui.pickFiles({ multiple: true, accept: M.ACCEPT + ',image/*,.heic,.heif' }); if (f.length) V.addMedia(f, { toTimeline: !P.clips.length }); };
    $('#ve-title').onclick = (e) => { const r = e.currentTarget.getBoundingClientRect(); CP.ui.contextMenu(r.left, r.bottom + 4, TITLE_STYLES.map(([k, n]) => [n, () => addTitle(k)])); };
    $('#ve-play').onclick = V.togglePlay; $('#ve-start').onclick = () => seek(0);
    $('#ve-fb').onclick = () => { pause(); seek(T - 1 / P.fps); }; $('#ve-ff').onclick = () => { pause(); seek(T + 1 / P.fps); };
    $('#ve-split').onclick = split; $('#ve-del').onclick = del; $('#ve-freeze').onclick = freezeFrame;
    $('#ve-in').onclick = () => markIn(); $('#ve-out').onclick = () => markOut();
    $('#ve-shot').onclick = (e) => { const r = e.currentTarget.getBoundingClientRect(); CP.ui.contextMenu(r.left, r.top - 150, [['Save frame as picture…', saveFrame], ['Edit frame in Photo', snapshotToPhoto], ['Copy frame', copyFrame], ['Insert freeze frame', freezeFrame]]); };
    $('#ve-undo').onclick = V.undo; $('#ve-redo').onclick = V.redo; $('#ve-export').onclick = exportDialog;
    $('#ve-projmenu').onclick = (e) => { const r = e.currentTarget.getBoundingClientRect(); CP.ui.contextMenu(r.left, r.bottom + 4, [['New project', async () => { if (P.clips.length && !(await CP.ui.confirm('Start a new project? Unsaved changes to this one are lost.'))) return; pause(); P = Object.assign(P, newProject()); P.clips = []; sel = null; cleanupEls(); hist.stack = [snap()]; hist.i = 0; seek(0); renderAll(); }], ['Save project (.cydvideo.zip)', saveProject], ['Open project…', async () => { const f = await CP.ui.pickFiles({ accept: '.zip' }); if (f[0]) openProject(f[0]); }]]); };
    $('#ve-name').onchange = (e) => { P.name = e.target.value || 'My video'; commit('Rename'); };
    $('#ve-aspect').onchange = (e) => { const a = ASPECTS.find((x) => x[0] === e.target.value); P.w = a[1]; P.h = a[2]; commit('Aspect'); requestDraw(); };
    $('#ve-fps').onchange = (e) => { P.fps = +e.target.value; commit('Frame rate'); };
    $('#ve-bg').oninput = (e) => { P.bg = e.target.value; requestDraw(); }; $('#ve-bg').onchange = () => commit('Background');
    $('#ve-zoom').oninput = (e) => { pps = +e.target.value; renderTimeline(); };
    new ResizeObserver(() => { if (!$('#ve-view').hidden) { requestDraw(); renderRuler(); } }).observe($('#ve-stage'));
    // drag & drop files into the editor / player
    for (const [zone, fn] of [[$('#ve-view'), (f) => V.addMedia(f, { toTimeline: true })], [$('#vp-view'), playlistAdd]]) {
      zone.addEventListener('dragover', (e) => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); e.stopPropagation(); zone.classList.add('drop'); } });
      zone.addEventListener('dragleave', (e) => { if (!zone.contains(e.relatedTarget)) zone.classList.remove('drop'); });
      zone.addEventListener('drop', (e) => { if (!e.dataTransfer.files.length) return; e.preventDefault(); e.stopPropagation(); zone.classList.remove('drop'); fn([...e.dataTransfer.files]); });
    }
    // timeline pointer: seek on ruler/background
    const scroll = $('#ve-tl-scroll'), inner = $('#ve-tl-inner');
    inner.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.ve-clip')) return;
      const go = (ev) => { const r = inner.getBoundingClientRect(); seek((ev.clientX - r.left - 90) / pps); };
      go(e); sel = e.target.closest('.ve-lane') ? null : sel; renderInspector(); renderTimeline();
      inner.setPointerCapture(e.pointerId); inner.onpointermove = go; inner.onpointerup = () => { inner.onpointermove = null; };
    });
    scroll.addEventListener('wheel', (e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); pps = U.clamp(pps * Math.exp(-e.deltaY * 0.002), 8, 400); $('#ve-zoom').value = pps; renderTimeline(); } }, { passive: false });
    // lanes accept media dragged from the bin
    document.querySelectorAll('.ve-lane').forEach((lane) => {
      lane.addEventListener('dragover', (e) => { if ([...e.dataTransfer.types].includes('text/cp-media')) { e.preventDefault(); lane.classList.add('over'); } });
      lane.addEventListener('dragleave', () => lane.classList.remove('over'));
      lane.addEventListener('drop', (e) => {
        lane.classList.remove('over'); const id = e.dataTransfer.getData('text/cp-media'); if (!id) return; e.preventDefault(); e.stopPropagation();
        const m = media(id), track = lane.dataset.track, r = $('#ve-tl-inner').getBoundingClientRect(), t = Math.max(0, (e.clientX - r.left - 90) / pps);
        if (track === 't1') { const save = T; T = t; addTitle(); T = save; return; }
        if ((m.kind === 'audio') !== (track === 'a1')) return CP.ui.toast(m.kind === 'audio' ? 'Drop music on the Music track' : 'Drop videos and photos on Main or Overlay');
        const c = mkClip(m, track, { start: t });
        if (track === 'v1') { const idx = v1().findIndex((x) => x.start + len(x) / 2 > t); const target = idx < 0 ? null : v1()[idx]; if (target) P.clips.splice(P.clips.indexOf(target), 0, c); else P.clips.push(c); } else P.clips.push(c);
        if (m.kind === 'audio') peaksOf(m);
        sel = c.id; commit('Add clip');
      });
    });
  }
  V.key = (e) => {
    const tg = e.target && e.target.closest ? e.target : null;
    if ($('#video').hidden || V.sub !== 'editor' || (tg && tg.closest('input, textarea, select, .vp')) || document.querySelector('.dlg-back')) return false;
    const k = e.key, mod = e.ctrlKey || e.metaKey;
    if (mod && k.toLowerCase() === 'z') { e.shiftKey ? V.redo() : V.undo(); return true; }
    if (mod && k.toLowerCase() === 'y') { V.redo(); return true; }
    if (mod && k.toLowerCase() === 'd') { dup(); return true; }
    if (mod && k.toLowerCase() === 's') { saveProject(); return true; }
    if (mod) return false;
    const map = { ' ': V.togglePlay, s: split, S: split, Delete: del, Backspace: del, ArrowLeft: () => { pause(); seek(T - (e.shiftKey ? 1 : 1 / P.fps)); }, ArrowRight: () => { pause(); seek(T + (e.shiftKey ? 1 : 1 / P.fps)); },
      Home: () => seek(0), End: () => seek(duration()), i: markIn, I: markIn, o: markOut, O: markOut, x: clearMarks, X: clearMarks, '+': () => { pps = Math.min(400, pps * 1.25); renderTimeline(); }, '=': () => { pps = Math.min(400, pps * 1.25); renderTimeline(); }, '-': () => { pps = Math.max(8, pps / 1.25); renderTimeline(); }, t: () => addTitle(), Escape: () => { sel = null; renderAll(); } };
    if (map[k]) { map[k](); return true; }
    return false;
  };

  function renderAll() { if (!built) return; renderBin(); renderTimeline(); renderInspector(); requestDraw(); const n = $('#ve-name'); if (n && document.activeElement !== n) n.value = P.name; const a = $('#ve-aspect'); if (a) { const x = ASPECTS.find(([, w, h]) => w === P.w && h === P.h); if (x) a.value = x[0]; } $('#ve-drop').hidden = P.clips.length > 0; $('#ve-undo').disabled = hist.i <= 0; $('#ve-redo').disabled = hist.i >= hist.stack.length - 1; }
  function renderBin() {
    const box = $('#ve-bin'); if (!box) return; box.innerHTML = '';
    if (!V.media.length) box.append(el('p', { class: 'muted sm pad' }, 'Import videos, music and photos. Then click + or drag them onto the timeline.'));
    for (const m of V.media) {
      const th = el('span', { class: 've-bin-th' }); if (m.thumb) th.append(cloneCanvas(m.thumb)); else th.append(el('span', { class: 've-bin-kind' }, m.kind === 'audio' ? '♪' : m.kind.toUpperCase()));
      const add = el('button', { class: 'icon-btn sm', type: 'button', 'aria-label': 'Add ' + m.name + ' to the timeline', title: 'Add to timeline' }, '+'); add.onclick = (e) => { e.stopPropagation(); appendToTimeline(m); };
      const it = el('div', { class: 've-bin-item', draggable: 'true', title: m.name }, th, el('span', { class: 've-bin-name' }, m.name), el('span', { class: 've-bin-meta' }, (m.kind === 'image' ? 'Photo' : M.fmtTime(m.duration)) + (m.converted ? ' · converted' : '')), add);
      it.ondragstart = (e) => { e.dataTransfer.setData('text/cp-media', m.id); e.dataTransfer.effectAllowed = 'copy'; };
      it.ondblclick = () => appendToTimeline(m);
      it.oncontextmenu = (e) => { e.preventDefault(); CP.ui.contextMenu(e.clientX, e.clientY, [['Add to Main', () => appendToTimeline(m)], m.kind !== 'audio' ? ['Add as overlay at playhead', () => { const c = mkClip(m, 'v2', { start: T }); P.clips.push(c); sel = c.id; commit('Overlay'); }] : null, ['Remove from project', () => { P.clips = P.clips.filter((c) => c.mediaId !== m.id); V.media.splice(V.media.indexOf(m), 1); cleanupEls(); commit('Remove media'); }]].filter(Boolean)); };
      box.append(it);
    }
  }
  const cloneCanvas = (c) => { const n = U.canvas(c.width, c.height); n.getContext('2d').drawImage(c, 0, 0); return n; };
  function renderRuler() {
    const cv = $('#ve-ruler'); if (!cv) return; const total = Math.max(duration() + 10, 30), W = Math.round(90 + total * pps);
    $('#ve-tl-inner').style.width = W + 'px'; cv.width = W; cv.style.width = W + 'px';
    const g = cv.getContext('2d'), css = getComputedStyle(document.documentElement);
    g.clearRect(0, 0, W, 26); g.fillStyle = css.getPropertyValue('--dim') || '#9fb0c3'; g.strokeStyle = css.getPropertyValue('--line2') || '#3a4757'; g.font = '11px IBM Plex Sans, sans-serif';
    const step = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300].find((s) => s * pps >= 70) || 600;
    g.beginPath();
    for (let t = 0; t <= total; t += step / 5) { const x = 90 + t * pps + 0.5, major = Math.abs(t / step - Math.round(t / step)) < 1e-6; g.moveTo(x, major ? 8 : 18); g.lineTo(x, 26); if (major) g.fillText(M.fmtTime(t, step < 1), x + 3, 16); }
    g.stroke();
    if (P.inPt != null || P.outPt != null) {
      const [a, b] = markRange(); g.fillStyle = 'rgba(205,219,40,.35)'; g.fillRect(90 + a * pps, 0, Math.max(2, (b - a) * pps), 26);
      g.fillStyle = '#cddb28'; if (P.inPt != null) g.fillRect(90 + P.inPt * pps - 1, 0, 3, 26); if (P.outPt != null) g.fillRect(90 + P.outPt * pps - 1, 0, 3, 26);
    }
  }
  function movePlayhead() { const ph = $('#ve-playhead'); if (ph) ph.style.left = (90 + T * pps) + 'px'; updateClock(); if (playing) { const sc = $('#ve-tl-scroll'), x = 90 + T * pps; if (x > sc.scrollLeft + sc.clientWidth - 40) sc.scrollLeft = x - 120; } }
  function renderTimeline() {
    if (!built) return; layout(); renderRuler();
    document.querySelectorAll('.ve-lane').forEach((lane) => lane.querySelectorAll('.ve-clip').forEach((x) => x.remove()));
    for (const c of P.clips) {
      const lane = document.querySelector(`.ve-lane[data-track="${c.track}"]`); if (!lane) continue;
      const m = media(c.mediaId), w = Math.max(6, len(c) * pps);
      const label = c.type === 'title' ? '“' + c.text.text + '”' : (m ? m.name : 'Missing media');
      const d = el('div', { class: `ve-clip ${c.type}${c.id === sel ? ' sel' : ''}`, style: { left: (90 + c.start * pps) + 'px', width: w + 'px' }, 'data-id': c.id, tabindex: '0', role: 'button', 'aria-label': label },
        el('span', { class: 've-h l', 'aria-hidden': 'true' }), el('span', { class: 've-clip-lbl' }, label, c.speed !== 1 ? ` · ${c.speed}×` : '', c.look.preset !== 'none' ? ' · ' + LOOK_NAMES[c.look.preset] : '', c.chroma.on ? ' · green screen' : ''), el('span', { class: 've-h r', 'aria-hidden': 'true' }));
      if (c.track === 'v1' && c.trans.type !== 'none' && c._ov) d.append(el('span', { class: 've-trans', title: (TRANS.find((t) => t[0] === c.trans.type) || [])[1], style: { width: (c._ov * pps) + 'px' } }));
      if ((c.type === 'video' || c.type === 'image') && m) d.prepend(filmstrip(c, m, w));
      if (c.type === 'audio' && m) d.prepend(waveform(c, m, w));
      wireClip(d, c); lane.append(d);
    }
    movePlayhead(); updateClock();
  }
  function filmstrip(c, m, w) {
    const h = 44, cv = el('canvas', { class: 've-strip', width: Math.min(4000, Math.ceil(w)), height: h }), g = cv.getContext('2d');
    if (c.type === 'image' && m.thumb) { const tw = m.thumb.width * h / m.thumb.height; for (let x = 0; x < cv.width; x += tw) g.drawImage(m.thumb, x, 0, tw, h); return cv; }
    if (!m.thumbs.length) return cv;
    const tw = m.thumbs[0].c.width * h / m.thumbs[0].c.height;
    for (let x = 0; x < cv.width; x += tw) { const st = c.in + (x / pps) * c.speed; let best = m.thumbs[0]; for (const t of m.thumbs) if (Math.abs(t.t - st) < Math.abs(best.t - st)) best = t; g.drawImage(best.c, x, 0, tw, h); }
    return cv;
  }
  function waveform(c, m, w) {
    const h = 44, cv = el('canvas', { class: 've-strip', width: Math.min(4000, Math.ceil(w)), height: h }), g = cv.getContext('2d');
    const p = m.peaks; if (!p) { peaksOf(m); return cv; } if (!p.length || !m.duration) return cv;
    g.fillStyle = 'rgba(255,255,255,.55)';
    for (let x = 0; x < cv.width; x += 2) { const st = c.in + (x / pps) * c.speed, i = Math.floor(st / m.duration * p.length), v = (p[i] || 0) * h * 0.9 * c.volume; g.fillRect(x, (h - v) / 2, 1.5, Math.max(1, v)); }
    return cv;
  }
  function wireClip(d, c) {
    d.addEventListener('pointerdown', (e) => {
      e.stopPropagation(); if (e.button !== 0) return;
      if (sel !== c.id) { sel = c.id; renderInspector(); document.querySelectorAll('.ve-clip.sel').forEach((x) => x.classList.remove('sel')); d.classList.add('sel'); }
      const handle = e.target.classList.contains('ve-h') ? (e.target.classList.contains('l') ? 'l' : 'r') : null;
      const x0 = e.clientX, orig = JSON.parse(JSON.stringify(c)), m = media(c.mediaId); let moved = false;
      d.setPointerCapture(e.pointerId);
      d.onpointermove = (ev) => {
        const dt = (ev.clientX - x0) / pps; if (Math.abs(ev.clientX - x0) > 3) moved = true; if (!moved) return;
        if (handle === 'l') {
          if (c.type === 'video' || c.type === 'audio') { const ni = U.clamp(orig.in + dt * c.speed, 0, orig.out - 0.1); c.in = ni; if (c.track !== 'v1') c.start = orig.start + (ni - orig.in) / c.speed; }
          else { const nd = U.clamp(orig.dur - dt, 0.2, 600); if (c.track !== 'v1') c.start = orig.start + (orig.dur - nd); c.dur = nd; }
        } else if (handle === 'r') {
          if (c.type === 'video' || c.type === 'audio') c.out = U.clamp(orig.out + dt * c.speed, orig.in + 0.1, m ? m.duration : orig.out);
          else c.dur = U.clamp(orig.dur + dt, 0.2, 600);
        } else if (c.track === 'v1') {
          const t = orig.start + dt + len(c) / 2, others = v1().filter((x) => x !== c), idx = others.findIndex((x) => x.start + len(x) / 2 > t);
          P.clips.splice(P.clips.indexOf(c), 1); if (idx < 0) P.clips.push(c); else P.clips.splice(P.clips.indexOf(others[idx]), 0, c);
        } else {
          let ns = Math.max(0, orig.start + dt);
          const snaps = [T, ...P.clips.filter((x) => x !== c).flatMap((x) => [x.start, end(x)])];
          for (const s of snaps) { if (Math.abs(ns - s) * pps < 8) ns = s; else if (Math.abs(ns + len(c) - s) * pps < 8) ns = s - len(c); }
          c.start = ns;
          const lane = document.elementFromPoint(ev.clientX, ev.clientY); const tr = lane && lane.closest('.ve-lane') && lane.closest('.ve-lane').dataset.track;
          if (tr && tr !== c.track && ((tr === 'v2' && (c.type === 'video' || c.type === 'image')))) c.track = tr;
        }
        layout(); d.style.left = (90 + c.start * pps) + 'px'; d.style.width = Math.max(6, len(c) * pps) + 'px';
        if (c.track === 'v1' && !handle) renderTimelineSoon(); else requestDraw();
      };
      d.onpointerup = (ev) => {
        d.onpointermove = null;
        if (moved) { const lane = document.elementFromPoint(ev.clientX, ev.clientY); const tr = lane && lane.closest('.ve-lane') && lane.closest('.ve-lane').dataset.track; if (tr === 'v1' && c.track === 'v2') { c.track = 'v1'; c.tf = { ...c.tf, fit: 'fill', zoom: 1, x: 0, y: 0 }; } commit(handle ? 'Trim' : 'Move'); syncElements(true); }
        else { const r = $('#ve-tl-inner').getBoundingClientRect(); seek((ev.clientX - r.left - 90) / pps); }
      };
    });
    d.addEventListener('keydown', (e) => { if (e.key === 'Enter') { sel = c.id; renderInspector(); } });
  }
  let tlSoon = 0; function renderTimelineSoon() { cancelAnimationFrame(tlSoon); tlSoon = requestAnimationFrame(() => { renderTimeline(); requestDraw(); }); }

  /* ---------- inspector ---------- */
  function row(label, input, val) { return el('label', { class: 've-row' }, el('span', {}, label), input, val || el('span')); }
  function slider(label, get, set, min, max, step = 1, fmt = (v) => v) {
    const v = el('span', { class: 've-val' }, fmt(get())); const r = el('input', { type: 'range', min, max, step, value: get(), 'aria-label': label });
    r.oninput = () => { set(+r.value); v.textContent = fmt(+r.value); layout(); syncElements(true); requestDraw(); }; r.onchange = () => commit(label);
    r.ondblclick = () => { r.value = min < 0 ? 0 : (label === 'Speed' || label === 'Zoom' ? 1 : label === 'Opacity' || label === 'Volume' ? 1 : min); r.oninput(); r.onchange(); };
    return row(label, r, v);
  }
  function selectRow(label, opts, get, set) { const s = el('select', { 'aria-label': label }, opts.map(([v, n]) => el('option', { value: v, selected: get() === v }, n))); s.onchange = () => { set(s.value); commit(label); }; return row(label, s); }
  function checkRow(label, get, set) { const c = el('input', { type: 'checkbox', checked: !!get() }); c.onchange = () => { set(c.checked); commit(label); }; return row(label, c); }
  function section(title, ...kids) { return el('details', { class: 've-sec', open: true }, el('summary', {}, title), ...kids); }
  function renderInspector() {
    const box = $('#ve-insp'); if (!box) return; box.innerHTML = '';
    const c = selected();
    if (!c) {
      box.append(el('h3', {}, 'Project'), el('p', { class: 'muted sm' }, `${P.w} × ${P.h} · ${P.fps} fps · ${M.fmtTime(duration())}`),
        el('p', { class: 'muted sm' }, 'Select a clip on the timeline to trim it, change speed, add a transition, color look, green screen, titles and more.'),
        el('div', { class: 've-tips' }, el('b', {}, 'Tips'), el('ul', {}, el('li', {}, 'Put a logo or a second video on Overlay for picture-in-picture.'), el('li', {}, 'Film against green, put it on Overlay and turn on Green screen.'), el('li', {}, 'Press S to split at the playhead, Delete to remove.'), el('li', {}, 'Ctrl+wheel zooms the timeline.'))));
      return;
    }
    const m = media(c.mediaId);
    box.append(el('h3', {}, c.type === 'title' ? 'Title' : (m ? m.name : 'Clip')), el('p', { class: 'muted sm' }, `${c.track === 'v1' ? 'Main' : c.track === 'v2' ? 'Overlay' : c.track === 't1' ? 'Titles' : 'Music'} · ${M.fmtTime(len(c), true)}`));
    if (c.type === 'title') {
      const ta = el('textarea', { rows: 3, 'aria-label': 'Title text' }, c.text.text); ta.oninput = () => { c.text.text = ta.value; requestDraw(); }; ta.onchange = () => commit('Title text');
      box.append(section('Text', ta,
        selectRow('Style', TITLE_STYLES, () => c.text.style, (v) => { c.text.style = v; }),
        selectRow('Font', CP.FONTS.map((f) => [f, f.split(',')[0]]), () => c.text.font, (v) => { c.text.font = v; }),
        slider('Size', () => c.text.size, (v) => { c.text.size = v; }, 2, 25, 0.5, (v) => v + '%'),
        row('Color', colorIn(() => c.text.color, (v) => { c.text.color = v; })), row('Accent', colorIn(() => c.text.accent, (v) => { c.text.accent = v; })),
        selectRow('Position', [['top', 'Top'], ['center', 'Center'], ['bottom', 'Bottom']], () => c.text.pos, (v) => { c.text.pos = v; }),
        selectRow('Animate in', ANIM_IN, () => c.text.animIn, (v) => { c.text.animIn = v; }), selectRow('Animate out', ANIM_OUT, () => c.text.animOut, (v) => { c.text.animOut = v; }),
        slider('Duration', () => c.dur, (v) => { c.dur = v; }, 0.5, 30, 0.1, (v) => v.toFixed(1) + ' s')));
    } else {
      const clipSec = [];
      if (c.type === 'video' || c.type === 'audio') {
        clipSec.push(slider('Speed', () => c.speed, (v) => { c.speed = v; }, 0.25, 4, 0.05, (v) => v.toFixed(2) + '×'));
        const presets = el('div', { class: 've-chips' }, [['Slow-mo', 0.5], ['Super slow', 0.25], ['Normal', 1], ['Fast', 2], ['Timelapse', 4]].map(([n, s]) => { const b = el('button', { class: 'chip' + (c.speed === s ? ' on' : ''), type: 'button' }, n); b.onclick = () => { c.speed = s; commit('Speed'); syncElements(true); }; return b; }));
        clipSec.push(presets, slider('Volume', () => c.volume, (v) => { c.volume = v; }, 0, 2, 0.05, (v) => Math.round(v * 100) + '%'), checkRow('Mute', () => c.muted, (v) => { c.muted = v; }));
      }
      if (c.type === 'image') clipSec.push(slider('Duration', () => c.dur, (v) => { c.dur = v; }, 0.2, 60, 0.1, (v) => v.toFixed(1) + ' s'));
      clipSec.push(slider('Fade in', () => c.fadeIn, (v) => { c.fadeIn = v; }, 0, 5, 0.1, (v) => v.toFixed(1) + ' s'), slider('Fade out', () => c.fadeOut, (v) => { c.fadeOut = v; }, 0, 5, 0.1, (v) => v.toFixed(1) + ' s'));
      box.append(section('Clip', ...clipSec));
      if (c.track === 'v1' && v1().indexOf(c) > 0) box.append(section('Transition into this clip', selectRow('Type', TRANS, () => c.trans.type, (v) => { c.trans.type = v; }), slider('Length', () => c.trans.dur, (v) => { c.trans.dur = v; }, 0.2, 3, 0.1, (v) => v.toFixed(1) + ' s')));
      if (c.type !== 'audio') {
        const looks = el('div', { class: 've-looks' }, Object.keys(LOOKS).map((k) => { const b = el('button', { class: 'chip' + (c.look.preset === k ? ' on' : ''), type: 'button' }, LOOK_NAMES[k]); b.onclick = () => { c.look.preset = k; commit('Look'); }; return b; }));
        box.append(section('Look', looks,
          slider('Brightness', () => c.look.brightness, (v) => { c.look.brightness = v; }, -100, 100), slider('Contrast', () => c.look.contrast, (v) => { c.look.contrast = v; }, -100, 100),
          slider('Saturation', () => c.look.saturation, (v) => { c.look.saturation = v; }, -100, 100), slider('Hue', () => c.look.hue, (v) => { c.look.hue = v; }, -180, 180, 1, (v) => v + '°'),
          slider('Temperature', () => c.look.temp, (v) => { c.look.temp = v; }, -100, 100), slider('Blur', () => c.look.blur, (v) => { c.look.blur = v; }, 0, 30), slider('Vignette', () => c.look.vignette, (v) => { c.look.vignette = v; }, 0, 100)));
        const cr = (c.crop = c.crop || { l: 0, t: 0, r: 0, b: 0 });
        const mm = media(c.mediaId), sw0 = (mm && mm.w) || P.w, sh0 = (mm && mm.h) || P.h;
        const aspectCrop = (ar) => { if (!ar) { Object.assign(cr, { l: 0, t: 0, r: 0, b: 0 }); return; } const src = sw0 / sh0; if (src > ar) { const keep = ar / src, side = (1 - keep) / 2 * 100; Object.assign(cr, { l: side, r: side, t: 0, b: 0 }); } else { const keep = src / ar, side = (1 - keep) / 2 * 100; Object.assign(cr, { t: side, b: side, l: 0, r: 0 }); } };
        const cchips = el('div', { class: 've-chips' }, [['None', 0], ['16:9', 16 / 9], ['9:16', 9 / 16], ['1:1', 1], ['4:5', 4 / 5], ['4:3', 4 / 3], ['21:9', 21 / 9]].map(([n, ar]) => { const b = el('button', { class: 'chip', type: 'button' }, n); b.onclick = () => { aspectCrop(ar); commit('Crop'); }; return b; }));
        box.append(section('Crop', cchips,
          slider('Left', () => cr.l, (v) => { cr.l = Math.min(v, 95 - cr.r); }, 0, 90, 0.5, (v) => v + '%'), slider('Right', () => cr.r, (v) => { cr.r = Math.min(v, 95 - cr.l); }, 0, 90, 0.5, (v) => v + '%'),
          slider('Top', () => cr.t, (v) => { cr.t = Math.min(v, 95 - cr.b); }, 0, 90, 0.5, (v) => v + '%'), slider('Bottom', () => cr.b, (v) => { cr.b = Math.min(v, 95 - cr.t); }, 0, 90, 0.5, (v) => v + '%'),
          el('p', { class: 'muted sm' }, 'Crop trims the edges of this clip. Pick a shape to center-crop to it, then fine-tune. Use Fit / Zoom below to size it in the frame.')));
        box.append(section('Position & size',
          selectRow('Fit', [['fill', 'Fill frame'], ['fit', 'Fit inside'], ['stretch', 'Stretch']], () => c.tf.fit, (v) => { c.tf.fit = v; }),
          slider('Zoom', () => c.tf.zoom, (v) => { c.tf.zoom = v; }, 0.1, 3, 0.01, (v) => Math.round(v * 100) + '%'),
          slider('Left / right', () => c.tf.x, (v) => { c.tf.x = v; }, -60, 60), slider('Up / down', () => c.tf.y, (v) => { c.tf.y = v; }, -60, 60),
          slider('Rotate', () => c.tf.rot, (v) => { c.tf.rot = v; }, -180, 180, 1, (v) => v + '°'), slider('Opacity', () => c.tf.opacity, (v) => { c.tf.opacity = v; }, 0, 1, 0.01, (v) => Math.round(v * 100) + '%'),
          checkRow('Mirror', () => c.tf.flip, (v) => { c.tf.flip = v; }), checkRow('Ken Burns zoom', () => c.tf.kenburns, (v) => { c.tf.kenburns = v; })));
        box.append(section('Green screen', checkRow('Remove background color', () => c.chroma.on, (v) => { c.chroma.on = v; }), row('Key color', colorIn(() => c.chroma.color, (v) => { c.chroma.color = v; })),
          slider('Tolerance', () => c.chroma.tol, (v) => { c.chroma.tol = v; }, 10, 250), slider('Softness', () => c.chroma.soft, (v) => { c.chroma.soft = v; }, 1, 150),
          el('p', { class: 'muted sm' }, 'Works best on the Overlay track, over a background clip on Main.')));
      }
    }
    box.append(el('div', { class: 've-insp-acts' }, btn('Split', split), btn('Duplicate', dup), btn('Delete', del, 'danger')));
  }
  const btn = (t, fn, cls = '') => el('button', { class: 'btn sm ' + cls, type: 'button', onclick: fn }, t);
  function colorIn(get, set) { const i = el('input', { type: 'color', value: get() }); i.oninput = () => { set(i.value); requestDraw(); }; i.onchange = () => commit('Color'); return i; }

  CP.on('video-shown', () => { requestDraw(); renderTimeline(); });
  V.preview = { composeFrame, get P() { return P; }, get T() { return T; } };
})(window.CP);
