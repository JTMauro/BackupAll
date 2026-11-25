/* CydArt file formats: open almost anything, save almost anything.
   - Browser-native decoders for PNG/JPEG/GIF/WebP/BMP/ICO/SVG/AVIF.
   - ag-psd for layered Photoshop files.
   - ImageMagick (WebAssembly, loaded on demand) for everything else: HEIC/HEIF, camera RAW, TIFF, JPEG XL, JPEG 2000, TGA, DDS, EXR, HDR, PCX, XCF and 270+ more. */
window.CP = window.CP || {};
(function (CP) {
  'use strict';
  const U = CP.util;
  /* app root = folder above js/, so pages in subfolders (lite/) find lib/ too */
  const ROOT = (() => { try { return new URL('..', document.currentScript.src).href; } catch (e) { return './'; } })();
  CP.ROOT = ROOT;

  /* Bundled copies first (offline, desktop app), pinned CDN copies as fallback. */
  const ROOT_ = (() => { try { return new URL('..', document.currentScript.src).href; } catch (e) { return './'; } })();
  const CDN = 'https://cdn.jsdelivr.net/npm/';
  const LIBS = {
    magick: [ROOT_ + 'vendor/magick-wasm.js', CDN + '@imagemagick/magick-wasm@0.0.46/dist/index.js'],
    magickWasm: CDN + '@imagemagick/magick-wasm@0.0.46/dist/x86/magick.wasm',
    psd: [ROOT_ + 'vendor/ag-psd.js', CDN + 'ag-psd@34.1.0/dist/bundle.js'],
    exifr: [ROOT_ + 'vendor/exifr.js', CDN + 'exifr@7.1.3/dist/full.umd.js'],
    fflate: [ROOT_ + 'vendor/fflate.js', CDN + 'fflate@0.8.2/umd/index.js'],
    heif: [ROOT_ + 'vendor/libheif.mjs', CDN + 'libheif-js@1.19.8/libheif-wasm/libheif-bundle.mjs'],
  };
  async function loadAny(urls) { let err; for (const u of urls) { try { await U.loadScript(u); return; } catch (e) { err = e; } } throw err; }
  async function importAny(urls) { let err; for (const u of urls) { try { return await import(u); } catch (e) { err = e; } } throw err; }
  CP.LIBS = LIBS;

  const NATIVE_EXT = ['png', 'jpg', 'jpeg', 'jpe', 'jfif', 'pjpeg', 'pjp', 'gif', 'webp', 'bmp', 'ico', 'cur', 'svg', 'avif', 'apng'];
  const RAW_EXT = ['cr2', 'cr3', 'crw', 'nef', 'nrw', 'arw', 'srf', 'sr2', 'dng', 'orf', 'rw2', 'raf', 'pef', 'srw', 'raw', 'rwl', 'mrw', 'kdc', 'dcr', '3fr', 'erf', 'mef', 'mos', 'x3f', 'iiq'];
  /* formats ImageMagick can't sniff from content: pass the hint explicitly */
  const HINTS = { tga: 'Tga', icb: 'Tga', vda: 'Tga', vst: 'Tga', pcx: 'Pcx', dds: 'Dds', exr: 'Exr', hdr: 'Hdr', xcf: 'Xcf', sgi: 'Sgi', rgb: 'Sgi', ppm: 'Ppm', pgm: 'Pgm', pbm: 'Pbm', pnm: 'Pnm', pam: 'Pam', jxl: 'Jxl', jp2: 'Jp2', j2k: 'J2k', jpf: 'Jp2', jpx: 'Jp2', heic: 'Heic', heif: 'Heif', hif: 'Heif', tif: 'Tiff', tiff: 'Tiff', psb: 'Psb', wbmp: 'Wbmp', xbm: 'Xbm', xpm: 'Xpm', cut: 'Cut', fits: 'Fits', fit: 'Fits', mng: 'Mng', jng: 'Jng', pict: 'Pict', pct: 'Pict', sun: 'Sun', ras: 'Sun', dpx: 'Dpx', cin: 'Cin', miff: 'Miff', otb: 'Otb', palm: 'Palm', qoi: 'Qoi' };
  RAW_EXT.forEach((e) => { HINTS[e] = 'Dng'; });

  CP.OPEN_ACCEPT = 'image/*,.heic,.heif,.hif,.psd,.psb,.tif,.tiff,.jxl,.jp2,.j2k,.tga,.dds,.exr,.hdr,.pcx,.xcf,.ppm,.pgm,.pbm,.qoi,.svg,.ico,.' + RAW_EXT.join(',.');

  /* ---------- ImageMagick loader (one time, ~15 MB, cached by the browser) ---------- */
  let magickP = null;
  async function readWithProgress(res, total, onProgress) {
    if (!res.body || !res.body.getReader) return new Uint8Array(await res.arrayBuffer());
    const reader = res.body.getReader(); const chunks = []; let got = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); got += value.length; onProgress && onProgress(Math.min(1, got / total)); }
    const out = new Uint8Array(got); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; } return out;
  }
  /* Prefer the bundled compressed engine (works offline and inside sandboxed viewers), else the CDN copy. */
  async function fetchWasm(onProgress) {
    try {
      const r = await fetch(ROOT + 'lib/magick.gz.wasm');
      if (r.ok && typeof DecompressionStream !== 'undefined') {
        const gz = await readWithProgress(r, 5.4e6, onProgress);
        const stream = new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'));
        return new Uint8Array(await new Response(stream).arrayBuffer());
      }
    } catch (e) { /* fall through to CDN */ }
    const res = await fetch(LIBS.magickWasm);
    if (!res.ok) throw new Error('Could not download the format engine');
    return readWithProgress(res, +res.headers.get('content-length') || 15.5e6, onProgress);
  }
  CP.loadMagick = (onProgress) => {
    if (!magickP) {
      magickP = (async () => {
        const mod = await importAny(LIBS.magick);
        const bytes = await fetchWasm(onProgress);
        await mod.initializeImageMagick(bytes);
        return mod;
      })();
      magickP.catch(() => { magickP = null; });
    }
    return magickP;
  };
  async function magick(label) {
    let t = null;
    const p = CP.loadMagick((f) => {
      if (!t) t = CP.ui && CP.ui.progress('Loading the universal format engine (one time)…');
      t && t.set(f);
    });
    try { return await p; } finally { t && t.done(); }
  }

  /* ---------- decoding ---------- */
  function canvasFromImage(img, w, h) {
    const c = U.canvas(w || img.naturalWidth || img.width, h || img.naturalHeight || img.height);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c;
  }
  async function decodeNative(blob, ext) {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image(); img.decoding = 'async'; img.src = url;
      await img.decode();
      let w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h) { w = 1024; h = 1024; } // svg without intrinsic size
      if (ext === 'svg' && Math.max(w, h) < 1024) { const s = 1024 / Math.max(w, h); w = Math.round(w * s); h = Math.round(h * s); }
      return canvasFromImage(img, w, h);
    } finally { URL.revokeObjectURL(url); }
  }
  async function decodeMagick(bytes, ext) {
    const M = await magick();
    const { ImageMagick, MagickFormat, MagickReadSettings } = M;
    let out = null;
    const handle = (img) => {
      try { img.autoOrient(); } catch (e) {}
      img.depth = 8;
      const w = img.width, h = img.height;
      img.write(MagickFormat.Rgba, (data) => {
        const c = U.canvas(w, h);
        c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data.slice(0, w * h * 4)), w, h), 0, 0);
        out = c;
      });
    };
    try { ImageMagick.read(bytes, handle); }
    catch (e) {
      const hint = HINTS[ext];
      if (!hint || !MagickFormat[hint]) throw e;
      ImageMagick.read(bytes, new MagickReadSettings({ format: MagickFormat[hint] }), handle);
    }
    if (!out) throw new Error('No image found in file');
    return out;
  }
  /* HEIC/HEIF (iPhone photos): libheif with its HEVC decoder (~1.5 MB, loaded on demand) */
  let heifP = null;
  async function decodeHeif(bytes) {
    if (!heifP) { heifP = importAny(LIBS.heif).then((m) => (typeof m.default === 'function' ? m.default() : m.default)); heifP.catch(() => { heifP = null; }); }
    const lib = await heifP;
    const dec = new lib.HeifDecoder();
    const imgs = dec.decode(bytes);
    if (!imgs || !imgs.length) throw new Error('No image found in this HEIC file');
    const im = imgs[0], w = im.get_width(), h = im.get_height();
    const id = new ImageData(w, h);
    await new Promise((res, rej) => im.display(id, (r) => (r ? res() : rej(new Error('HEIC decode failed')))));
    const c = U.canvas(w, h); c.getContext('2d').putImageData(id, 0, 0);
    try { imgs.forEach((x) => x.free && x.free()); } catch (e) {}
    return c;
  }
  const isHeif = (bytes, ext) => ['heic', 'heif', 'hif'].includes(ext) || (bytes.length > 12 && String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp' && /^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(String.fromCharCode(...bytes.slice(8, 12))));

  async function decodePsd(buf) {
    await loadAny(LIBS.psd);
    const psd = window.agPsd.readPsd(buf, { skipThumbnail: true });
    const layers = [];
    const walk = (nodes, hiddenParent) => {
      for (const n of nodes || []) {
        if (n.children) { walk(n.children, hiddenParent || n.hidden); continue; }
        if (!n.canvas) continue;
        layers.push({
          name: n.name || 'Layer', canvas: n.canvas, left: n.left || 0, top: n.top || 0,
          opacity: n.opacity == null ? 1 : n.opacity, visible: !(n.hidden || hiddenParent),
          blend: psdBlendToCanvas(n.blendMode),
        });
      }
    };
    walk(psd.children);
    return { width: psd.width, height: psd.height, layers, composite: psd.canvas };
  }
  const psdBlendToCanvas = (m) => {
    if (!m || m === 'normal' || m === 'pass through') return 'source-over';
    const v = m.replace(/ /g, '-');
    return CP.BLEND_MODES.some((b) => b[0] === v) ? v : 'source-over';
  };
  const canvasBlendToPsd = (m) => (m === 'source-over' ? 'normal' : m.replace(/-/g, ' '));

  /* Main entry: File/Blob → Doc */
  CP.decodeFile = async (file, name) => {
    name = name || file.name || 'Image';
    const ext = U.ext(name);
    const type = (file.type || '').toLowerCase();
    // Photoshop with layers
    if (ext === 'psd' || type === 'image/vnd.adobe.photoshop') {
      try {
        const p = await decodePsd(await file.arrayBuffer());
        const d = new CP.Doc(p.width, p.height, U.baseName(name));
        if (!p.layers.length && p.composite) { const l = d.addLayer('Background'); l.ctx.drawImage(p.composite, 0, 0); }
        for (const pl of p.layers) {
          const l = d.addLayer(pl.name); l.ctx.drawImage(pl.canvas, pl.left, pl.top);
          l.opacity = pl.opacity; l.visible = pl.visible; l.blend = pl.blend;
        }
        d.active = d.layers.length - 1;
        d.commit('Open'); d.saved = true; d.sourceFormat = 'PSD';
        return d;
      } catch (e) { console.warn('ag-psd failed, falling back', e); }
    }
    let canvas = null, engine = 'native';
    const nativeLikely = NATIVE_EXT.includes(ext) || /^image\/(png|jpeg|gif|webp|bmp|svg\+xml|avif|x-icon|vnd\.microsoft\.icon)$/.test(type);
    if (nativeLikely) { try { canvas = await decodeNative(file, ext); } catch (e) { canvas = null; } }
    if (!canvas) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (isHeif(bytes, ext)) { try { canvas = await decodeHeif(bytes); engine = 'libheif'; } catch (e) { console.warn('libheif failed, trying ImageMagick', e); } }
      if (!canvas) { engine = 'magick'; canvas = await decodeMagick(bytes, ext); }
    }
    const d = CP.newDocFromCanvas(canvas, U.baseName(name));
    d.sourceFormat = (ext || type.split('/')[1] || '').toUpperCase();
    d.sourceEngine = engine;
    return d;
  };
  /* Decode to a single canvas (thumbnails, viewer) */
  CP.decodeToCanvas = async (blob, name) => {
    const ext = U.ext(name || blob.name || '');
    if (ext === 'psd') { try { const p = await decodePsd(await blob.arrayBuffer()); if (p.composite) return p.composite; } catch (e) {} }
    if (NATIVE_EXT.includes(ext) || /^image\/(png|jpeg|gif|webp|bmp|svg\+xml|avif)$/.test(blob.type || '')) {
      try { return await decodeNative(blob, ext); } catch (e) {}
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (isHeif(bytes, ext)) { try { return await decodeHeif(bytes); } catch (e) { console.warn(e); } }
    return decodeMagick(bytes, ext);
  };
  CP.isNativeViewable = (name, type) => NATIVE_EXT.includes(U.ext(name)) || /^image\/(png|jpeg|gif|webp|bmp|svg\+xml|avif)$/.test(type || '');

  CP.readExif = async (blob) => {
    try { await loadAny(LIBS.exifr); return await window.exifr.parse(blob, { tiff: true, exif: true, gps: true, ifd0: true, xmp: false, icc: false, iptc: true }); }
    catch (e) { return null; }
  };

  /* ---------- encoding ---------- */
  /* engine: native (canvas.toBlob) | magick | psd | svg */
  CP.SAVE_FORMATS = [
    { id: 'png', label: 'PNG', ext: 'png', mime: 'image/png', engine: 'native', alpha: true, desc: 'Lossless, transparency. Best for graphics and edits.' },
    { id: 'jpeg', label: 'JPEG', ext: 'jpg', mime: 'image/jpeg', engine: 'native', quality: 92, desc: 'Photos. Small files, no transparency.' },
    { id: 'webp', label: 'WebP', ext: 'webp', mime: 'image/webp', engine: 'native', magick: 'WebP', quality: 90, alpha: true, desc: 'Modern web format. Small files with transparency.' },
    { id: 'avif', label: 'AVIF', ext: 'avif', mime: 'image/avif', engine: 'magick', magick: 'Avif', quality: 70, alpha: true, desc: 'Next-gen HEIF-family format. Excellent compression.' },
    { id: 'heif', label: 'HEIF (AV1)', ext: 'heif', mime: 'image/heif', engine: 'magick', magick: 'Avif', quality: 75, alpha: true, desc: 'HEIF container with AV1 compression. Opens on recent iPhone, Mac, Windows and Android.' },
    { id: 'heic', label: 'HEIC (HEVC)', ext: 'heic', mime: 'image/heic', engine: 'desktop', quality: 90, alpha: true,
      get disabled() { return !CP.desktop; },
      get desc() { return CP.desktop ? 'True HEIC, the iPhone format. Saved by the CydArt desktop app.' : 'CydArt opens HEIC files. Saving true HEIC needs the CydArt desktop app (Windows installer); web browsers have no HEVC encoder. Use HEIF (AV1) or AVIF here.'; } },
    { id: 'psd', label: 'Photoshop PSD (layers)', ext: 'psd', mime: 'image/vnd.adobe.photoshop', engine: 'psd', alpha: true, layers: true, desc: 'Keeps every layer, opacity and blend mode. Best way to save work in progress.' },
    { id: 'tiff', label: 'TIFF', ext: 'tif', mime: 'image/tiff', engine: 'magick', magick: 'Tiff', alpha: true, desc: 'Lossless, used for print and archiving.' },
    { id: 'gif', label: 'GIF', ext: 'gif', mime: 'image/gif', engine: 'magick', magick: 'Gif', alpha: true, desc: '256 colors. Simple graphics.' },
    { id: 'bmp', label: 'BMP', ext: 'bmp', mime: 'image/bmp', engine: 'magick', magick: 'Bmp', alpha: true, desc: 'Uncompressed Windows bitmap.' },
    { id: 'ico', label: 'ICO (icon)', ext: 'ico', mime: 'image/x-icon', engine: 'magick', magick: 'Ico', alpha: true, maxSize: 256, desc: 'Windows/website icon (scaled to 256 px max).' },
    { id: 'jxl', label: 'JPEG XL', ext: 'jxl', mime: 'image/jxl', engine: 'magick', magick: 'Jxl', quality: 90, alpha: true, desc: 'Next-gen JPEG successor.' },
    { id: 'jp2', label: 'JPEG 2000', ext: 'jp2', mime: 'image/jp2', engine: 'magick', magick: 'Jp2', quality: 90, alpha: true, desc: 'Used in film, medical and archival.' },
    { id: 'tga', label: 'TGA (Targa)', ext: 'tga', mime: 'image/x-tga', engine: 'magick', magick: 'Tga', alpha: true, desc: 'Game and video textures.' },
    { id: 'dds', label: 'DDS', ext: 'dds', mime: 'image/vnd-ms.dds', engine: 'magick', magick: 'Dds', alpha: true, desc: 'DirectX game textures.' },
    { id: 'pdf', label: 'PDF', ext: 'pdf', mime: 'application/pdf', engine: 'magick', magick: 'Pdf', quality: 92, desc: 'Single-page PDF document.' },
    { id: 'svg', label: 'SVG (embedded image)', ext: 'svg', mime: 'image/svg+xml', engine: 'svg', alpha: true, desc: 'SVG file wrapping the picture; scales in design tools.' },
    { id: 'exr', label: 'OpenEXR', ext: 'exr', mime: 'image/x-exr', engine: 'magick', magick: 'Exr', alpha: true, desc: 'High dynamic range for VFX.' },
    { id: 'hdr', label: 'Radiance HDR', ext: 'hdr', mime: 'image/vnd.radiance', engine: 'magick', magick: 'Hdr', desc: 'High dynamic range.' },
    { id: 'pcx', label: 'PCX', ext: 'pcx', mime: 'image/x-pcx', engine: 'magick', magick: 'Pcx', desc: 'Legacy PC Paintbrush.' },
    { id: 'ppm', label: 'PPM / Netpbm', ext: 'ppm', mime: 'image/x-portable-pixmap', engine: 'magick', magick: 'Ppm', desc: 'Simple uncompressed format.' },
    { id: 'qoi', label: 'QOI', ext: 'qoi', mime: 'image/qoi', engine: 'magick', magick: 'Qoi', alpha: true, desc: 'Quite OK Image: fast lossless.' },
  ];

  const toBlob = (c, mime, q) => new Promise((res) => c.toBlob(res, mime, q));
  function flattenOn(canvas, color) {
    const c = U.canvas(canvas.width, canvas.height), g = c.getContext('2d');
    g.fillStyle = color; g.fillRect(0, 0, c.width, c.height); g.drawImage(canvas, 0, 0); return c;
  }

  async function encodeMagick(canvas, fmt, opts) {
    const M = await magick();
    const { ImageMagick, MagickFormat, MagickReadSettings } = M;
    let c = canvas;
    if (fmt.maxSize && Math.max(c.width, c.height) > fmt.maxSize) {
      const s = fmt.maxSize / Math.max(c.width, c.height);
      const r = U.canvas(c.width * s, c.height * s), g = r.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, r.width, r.height); c = r;
    }
    if (!fmt.alpha || opts.flatten) c = flattenOn(c, opts.matte || '#ffffff');
    const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let out = null;
    ImageMagick.read(new Uint8Array(data.buffer), new MagickReadSettings({ format: MagickFormat.Rgba, width: c.width, height: c.height }), (img) => {
      if (opts.quality != null) img.quality = opts.quality;
      if (fmt.id === 'tiff') { try { img.settings.compression = M.CompressionMethod ? M.CompressionMethod.LZW : undefined; } catch (e) {} }
      img.write(MagickFormat[fmt.magick], (bytes) => { out = new Blob([bytes.slice()], { type: fmt.mime }); });
    });
    return out;
  }

  async function encodePsd(doc) {
    await loadAny(LIBS.psd);
    const psd = {
      width: doc.width, height: doc.height,
      canvas: doc.flattened(),
      children: doc.layers.map((l) => ({
        name: l.name, canvas: l.canvas, left: 0, top: 0, opacity: l.opacity, hidden: !l.visible, blendMode: canvasBlendToPsd(l.blend),
      })),
    };
    const buf = window.agPsd.writePsd(psd, { generateThumbnail: true });
    return new Blob([buf], { type: 'image/vnd.adobe.photoshop' });
  }

  /* opts: {quality 1-100, flatten, matte, scale} */
  CP.encodeDoc = async (doc, fmtId, opts = {}) => {
    const fmt = CP.SAVE_FORMATS.find((f) => f.id === fmtId);
    if (!fmt || fmt.disabled) throw new Error(fmt ? fmt.desc : 'Unknown format');
    if (fmt.engine === 'psd') return encodePsd(doc);
    let canvas = doc.flattened();
    if (opts.scale && opts.scale !== 1) {
      const r = U.canvas(canvas.width * opts.scale, canvas.height * opts.scale), g = r.getContext('2d');
      g.imageSmoothingQuality = 'high'; g.drawImage(canvas, 0, 0, r.width, r.height); canvas = r;
    }
    return CP.encodeCanvas(canvas, fmtId, opts);
  };
  CP.encodeCanvas = async (canvas, fmtId, opts = {}) => {
    const fmt = CP.SAVE_FORMATS.find((f) => f.id === fmtId);
    if (!fmt || fmt.disabled) throw new Error(fmt ? fmt.desc : 'Unknown format');
    const q = opts.quality != null ? opts.quality : fmt.quality;
    if (fmt.engine === 'svg') {
      const png = await toBlob(canvas, 'image/png');
      const b64 = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(png); });
      const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}"><image width="${canvas.width}" height="${canvas.height}" xlink:href="${b64}"/></svg>`;
      return new Blob([svg], { type: fmt.mime });
    }
    if (fmt.engine === 'psd') {
      const d = CP.newDocFromCanvas(canvas, 'x'); return encodePsd(d);
    }
    if (fmt.engine === 'desktop') {
      const png = await toBlob(canvas, 'image/png');
      return CP.desktopCall('heic?q=' + (q || 90), png, fmt.mime);
    }
    if (fmt.engine === 'desktop') {
      const png = await toBlob(canvas, 'image/png');
      return CP.desktopCall('heic?q=' + (q || 90), png, fmt.mime);
    }
    if (fmt.engine === 'native') {
      const src = fmt.alpha && !opts.flatten ? canvas : flattenOn(canvas, opts.matte || '#ffffff');
      const b = await toBlob(src, fmt.mime, q != null ? q / 100 : undefined);
      if (b && b.type === fmt.mime) return b;
      if (fmt.magick) return encodeMagick(canvas, fmt, { ...opts, quality: q });
      throw new Error('This browser cannot write ' + fmt.label);
    }
    return encodeMagick(canvas, fmt, { ...opts, quality: q });
  };

  CP.loadZip = async () => { await loadAny(LIBS.fflate); return window.fflate; };
})(window.CP);
