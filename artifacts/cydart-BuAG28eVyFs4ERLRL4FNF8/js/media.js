/* CydArt media layer: video/audio detection, "play anything" (native first, then FFmpeg),
   frame grabs and format conversion. Shared by CydArt (Video tab), CydArt Lite and the Library. */
window.CP = window.CP || {};
(function (CP) {
  'use strict';
  const U = CP.util;
  const M = CP.media = {};

  M.VIDEO_EXT = ['mp4', 'm4v', 'mov', 'qt', 'webm', 'mkv', 'mk3d', 'avi', 'wmv', 'asf', 'flv', 'f4v', 'f4p', 'mpg', 'mpeg', 'm1v', 'm2v', 'mpe', 'mpv', 'm2p', 'ps', 'vob', 'evo', 'ts', 'mts', 'm2ts', 'tp', 'trp', 'mod', 'tod', 'vro', '3gp', '3g2', 'ogv', 'ogm', 'divx', 'xvid', 'mxf', 'dv', 'dif', 'rm', 'rmvb', 'wtv', 'dvr-ms', 'nut', 'nsv', 'amv', 'ivf', 'obu', 'mjpeg', 'mjpg', 'gifv', 'hevc', 'h264', 'h265', '264', '265', 'avc', 'y4m', 'yuv', 'bik', 'roq', 'smk', 'swf', 'insv', 'lrv'];
  M.AUDIO_EXT = ['mp3', 'mp2', 'wav', 'w64', 'm4a', 'm4b', 'aac', 'ogg', 'oga', 'opus', 'spx', 'flac', 'alac', 'ape', 'wv', 'tta', 'mpc', 'wma', 'aiff', 'aif', 'aifc', 'caf', 'au', 'snd', 'amr', 'awb', 'ac3', 'eac3', 'dts', 'mka', 'mid', 'dsf', 'dff', 'gsm', 'voc', 'ra'];
  M.ACCEPT = 'video/*,audio/*,' + M.VIDEO_EXT.concat(M.AUDIO_EXT).map((e) => '.' + e).join(',');
  CP.OPEN_ACCEPT = (CP.OPEN_ACCEPT || 'image/*') + ',' + M.ACCEPT; // Open dialogs show videos too
  M.isVideo = (name, type) => /^video\//.test(type || '') || M.VIDEO_EXT.includes(U.ext(name || ''));
  M.isAudio = (name, type) => (/^audio\//.test(type || '') || M.AUDIO_EXT.includes(U.ext(name || ''))) && !M.isVideo(name, type);
  M.isMedia = (name, type) => M.isVideo(name, type) || M.isAudio(name, type);
  M.fmtTime = (s, frac) => {
    if (!isFinite(s)) s = 0; s = Math.max(0, s);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const ss = frac ? sec.toFixed(2).padStart(5, '0') : String(Math.floor(sec)).padStart(2, '0');
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + ss;
  };

  /* ---------- FFmpeg (WebAssembly) for the web version ---------- */
  let ffP = null;
  M.loadFFmpeg = () => {
    if (!ffP) {
      ffP = (async () => {
        const t = CP.ui && CP.ui.progress('Loading the video engine (one time, about 10 MB)…');
        try {
          const { FFmpeg } = await import(CP.ROOT + 'vendor/ffmpeg/index.js');
          const r = await fetch(CP.ROOT + 'lib/ffmpeg-core.gz.wasm');
          if (!r.ok) throw new Error('Could not load the video engine');
          const total = 10.3e6; const reader = r.body.getReader(); const chunks = []; let got = 0;
          for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); got += value.length; t && t.set(Math.min(0.95, got / total)); }
          const wasm = await new Response(new Blob(chunks).stream().pipeThrough(new DecompressionStream('gzip'))).blob();
          const ff = new FFmpeg();
          await ff.load({
            coreURL: CP.ROOT + 'vendor/ffmpeg/ffmpeg-core.js',
            wasmURL: URL.createObjectURL(new Blob([wasm], { type: 'application/wasm' })),
          });
          return ff;
        } finally { t && t.done(); }
      })();
      ffP.catch(() => { ffP = null; });
    }
    return ffP;
  };
  let ffBusy = Promise.resolve();
  async function ffRun(input, inName, args, outName, label) {
    const run = async () => {
      const ff = await M.loadFFmpeg();
      const t = CP.ui && CP.ui.progress(label || 'Converting video…');
      const onProg = ({ progress }) => t && t.set(progress);
      ff.on('progress', onProg);
      try {
        await ff.writeFile(inName, new Uint8Array(await input.arrayBuffer()));
        const code = await ff.exec(['-i', inName, ...args, outName]);
        if (code !== 0) throw new Error('The video engine could not convert this file');
        const data = await ff.readFile(outName);
        return new Blob([data.buffer]);
      } finally {
        ff.off('progress', onProg); t && t.done();
        try { await ff.deleteFile(inName); } catch (e) {} try { await ff.deleteFile(outName); } catch (e) {}
      }
    };
    const p = ffBusy.then(run, run); ffBusy = p.catch(() => {}); return p;
  }

  /* ---------- conversion targets ---------- */
  /* Every output format. group: video | pro | web | audio. native = the editor renders it directly (no FFmpeg pass).
     desktopOnly = needs the desktop app's FFmpeg (encoder missing in the web build). */
  const AAC = ['-c:a', 'aac', '-b:a', '192k'];
  M.EXPORT_FORMATS = [
    { id: 'mp4', group: 'video', label: 'MP4 · H.264', ext: 'mp4', mime: 'video/mp4', native: true, args: ['-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', ...AAC, '-movflags', '+faststart'], desc: 'Plays everywhere: phones, PCs, YouTube, Teams, social media.' },
    { id: 'hevc', group: 'video', label: 'MP4 · H.265 / HEVC', ext: 'mp4', mime: 'video/mp4', args: ['-c:v', 'libx265', '-preset', 'medium', '-crf', '24', '-pix_fmt', 'yuv420p', '-tag:v', 'hvc1', ...AAC, '-movflags', '+faststart'], desc: 'Half the size of H.264 at the same quality. The iPhone format.' },
    { id: 'webm', group: 'video', label: 'WebM · VP9', ext: 'webm', mime: 'video/webm', native: true, args: ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '32', '-row-mt', '1', '-c:a', 'libopus', '-b:a', '160k'], desc: 'Open web format. Small files.' },
    { id: 'av1', group: 'video', label: 'MP4 · AV1', ext: 'mp4', mime: 'video/mp4', desktopOnly: true, args: ['-c:v', 'libsvtav1', '-crf', '32', '-preset', '8', '-pix_fmt', 'yuv420p', ...AAC], desc: 'Newest, smallest files. Recent browsers and phones. Desktop app only.' },
    { id: 'mov', group: 'video', label: 'MOV · QuickTime', ext: 'mov', mime: 'video/quicktime', args: ['-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', ...AAC, '-movflags', '+faststart'], desc: 'Apple QuickTime container.' },
    { id: 'm4v', group: 'video', label: 'M4V · iTunes', ext: 'm4v', mime: 'video/x-m4v', args: ['-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', ...AAC], desc: 'Apple devices and iTunes.' },
    { id: 'mkv', group: 'video', label: 'MKV · Matroska', ext: 'mkv', mime: 'video/x-matroska', args: ['-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', ...AAC], desc: 'Flexible container for archiving.' },
    { id: 'avi', group: 'video', label: 'AVI · MPEG-4', ext: 'avi', mime: 'video/x-msvideo', args: ['-c:v', 'mpeg4', '-q:v', '3', '-c:a', 'libmp3lame', '-b:a', '192k'], desc: 'Older Windows and DVD players.' },
    { id: 'wmv', group: 'video', label: 'WMV · Windows Media', ext: 'wmv', mime: 'video/x-ms-wmv', args: ['-c:v', 'wmv2', '-b:v', '6M', '-c:a', 'wmav2', '-b:a', '192k'], desc: 'Windows Media Player and PowerPoint.' },
    { id: 'mpg', group: 'video', label: 'MPEG-2 · DVD', ext: 'mpg', mime: 'video/mpeg', args: ['-c:v', 'mpeg2video', '-q:v', '3', '-c:a', 'mp2', '-b:a', '224k'], desc: 'DVD-style MPEG-2 program stream.' },
    { id: 'ts', group: 'video', label: 'TS · MPEG transport', ext: 'ts', mime: 'video/mp2t', args: ['-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', ...AAC, '-f', 'mpegts'], desc: 'Broadcast and set-top boxes.' },
    { id: 'm2ts', group: 'video', label: 'M2TS · AVCHD / Blu-ray', ext: 'm2ts', mime: 'video/mp2t', args: ['-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'ac3', '-b:a', '384k', '-f', 'mpegts', '-mpegts_m2ts_mode', '1'], desc: 'Camcorders and Blu-ray.' },
    { id: '3gp', group: 'video', label: '3GP · Mobile', ext: '3gp', mime: 'video/3gpp', args: ['-c:v', 'libx264', '-profile:v', 'baseline', '-vf', 'scale=-2:min(480\\,ih)', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '44100', '-b:a', '96k'], desc: 'Small files for older phones.' },
    { id: 'flv', group: 'video', label: 'FLV · Flash Video', ext: 'flv', mime: 'video/x-flv', args: ['-c:v', 'flv', '-q:v', '3', '-c:a', 'libmp3lame', '-ar', '44100', '-b:a', '160k'], desc: 'Legacy Flash video.' },
    { id: 'ogv', group: 'video', label: 'OGV · Theora', ext: 'ogv', mime: 'video/ogg', args: ['-c:v', 'libtheora', '-q:v', '7', '-c:a', 'libvorbis', '-q:a', '5'], desc: 'Open Ogg video.' },
    { id: 'prores', group: 'pro', label: 'MOV · ProRes 422 HQ', ext: 'mov', mime: 'video/quicktime', args: ['-c:v', 'prores_ks', '-profile:v', '3', '-pix_fmt', 'yuv422p10le', '-c:a', 'pcm_s16le'], desc: 'Editing master for Final Cut, Premiere, DaVinci. Very large files.' },
    { id: 'dnxhr', group: 'pro', label: 'MOV · DNxHR HQ', ext: 'mov', mime: 'video/quicktime', args: ['-c:v', 'dnxhd', '-profile:v', 'dnxhr_hq', '-pix_fmt', 'yuv422p', '-c:a', 'pcm_s16le'], desc: 'Editing master for Avid and Premiere. Very large files.' },
    { id: 'ffv1', group: 'pro', label: 'MKV · FFV1 lossless', ext: 'mkv', mime: 'video/x-matroska', args: ['-c:v', 'ffv1', '-level', '3', '-c:a', 'flac'], desc: 'Lossless archive: no quality loss at all.' },
    { id: 'mjpeg', group: 'pro', label: 'AVI · Motion JPEG', ext: 'avi', mime: 'video/x-msvideo', args: ['-c:v', 'mjpeg', '-q:v', '3', '-pix_fmt', 'yuvj420p', '-c:a', 'pcm_s16le'], desc: 'Every frame a JPEG. Easy to scrub and edit.' },
    { id: 'gif', group: 'web', label: 'GIF · animated', ext: 'gif', mime: 'image/gif', args: ['-vf', 'fps=15,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse', '-loop', '0'], desc: 'Silent looping animation, 480 px wide.' },
    { id: 'webpa', group: 'web', label: 'WebP · animated', ext: 'webp', mime: 'image/webp', args: ['-vf', 'fps=15,scale=640:-1:flags=lanczos', '-c:v', 'libwebp_anim', '-quality', '75', '-loop', '0', '-an'], desc: 'Animated WebP: much smaller than GIF, full color.' },
    { id: 'apng', group: 'web', label: 'APNG · animated PNG', ext: 'png', mime: 'image/apng', args: ['-vf', 'fps=12,scale=480:-1:flags=lanczos', '-f', 'apng', '-plays', '0', '-an'], desc: 'Animated PNG with full color and transparency.' },
    { id: 'frames', group: 'web', label: 'Image sequence (ZIP)', ext: 'zip', mime: 'application/zip', frames: true, desc: 'Every frame (or a few per second) as pictures in any photo format, in a ZIP.' },
    { id: 'mp3', group: 'audio', label: 'MP3', ext: 'mp3', mime: 'audio/mpeg', args: ['-vn', '-c:a', 'libmp3lame', '-b:a', '192k'], desc: 'Soundtrack as MP3.' },
    { id: 'm4a', group: 'audio', label: 'M4A · AAC', ext: 'm4a', mime: 'audio/mp4', args: ['-vn', ...AAC], desc: 'Soundtrack as AAC (Apple, Android).' },
    { id: 'aac', group: 'audio', label: 'AAC (raw)', ext: 'aac', mime: 'audio/aac', args: ['-vn', ...AAC, '-f', 'adts'], desc: 'Raw AAC stream.' },
    { id: 'wav', group: 'audio', label: 'WAV', ext: 'wav', mime: 'audio/wav', args: ['-vn', '-c:a', 'pcm_s16le'], desc: 'Uncompressed.' },
    { id: 'flac', group: 'audio', label: 'FLAC · lossless', ext: 'flac', mime: 'audio/flac', args: ['-vn', '-c:a', 'flac'], desc: 'Lossless, smaller than WAV.' },
    { id: 'alac', group: 'audio', label: 'ALAC · Apple lossless', ext: 'm4a', mime: 'audio/mp4', args: ['-vn', '-c:a', 'alac'], desc: 'Lossless for Apple Music.' },
    { id: 'ogg', group: 'audio', label: 'OGG · Vorbis', ext: 'ogg', mime: 'audio/ogg', args: ['-vn', '-c:a', 'libvorbis', '-q:a', '5'], desc: 'Open audio format.' },
    { id: 'opus', group: 'audio', label: 'Opus', ext: 'opus', mime: 'audio/opus', args: ['-vn', '-c:a', 'libopus', '-b:a', '160k'], desc: 'Best quality per size for speech and music.' },
    { id: 'aiff', group: 'audio', label: 'AIFF', ext: 'aiff', mime: 'audio/aiff', args: ['-vn', '-c:a', 'pcm_s16be'], desc: 'Uncompressed (Mac).' },
    { id: 'wma', group: 'audio', label: 'WMA', ext: 'wma', mime: 'audio/x-ms-wma', args: ['-vn', '-c:a', 'wmav2', '-b:a', '192k'], desc: 'Windows Media Audio.' },
    { id: 'ac3', group: 'audio', label: 'AC-3 · Dolby Digital', ext: 'ac3', mime: 'audio/ac3', args: ['-vn', '-c:a', 'ac3', '-b:a', '384k'], desc: 'Surround-ready Dolby Digital.' },
  ];
  M.GROUPS = [['video', 'Video'], ['pro', 'Editing & archive'], ['web', 'Animation & frames'], ['audio', 'Audio only']];
  M.available = (f) => !(f.desktopOnly && !CP.desktop);
  /* convert any video/audio to a format. opts.height scales the picture (keeps aspect). */
  M.convert = async (blob, fmtId, srcName = 'input.mp4', opts = {}) => {
    const f = M.EXPORT_FORMATS.find((x) => x.id === fmtId);
    if (!f || f.frames) throw new Error('Unknown format');
    if (!M.available(f)) throw new Error(f.label + ' needs the CydArt desktop app');
    let args = f.args.slice();
    if (opts.height && !args.includes('-vn')) {
      const sc = `scale=-2:min(${opts.height}\\,ih)`, vi = args.indexOf('-vf');
      if (vi >= 0) args[vi + 1] = args[vi + 1].replace(/scale=(?:\\,|[^,\[])+/, `scale=-2:min(${opts.height}\\,ih)`); else args = ['-vf', sc, ...args];
    }
    if (CP.desktop) return CP.desktopCall('convert?to=' + f.id + '&ext=' + f.ext + '&name=' + encodeURIComponent(srcName), blob, f.mime, { 'X-Cyd-Args': encodeURIComponent(JSON.stringify(args)) });
    const out = await ffRun(blob, 'in.' + (U.ext(srcName) || 'mp4'), args, 'out.' + f.ext, 'Converting to ' + f.label + '…');
    return new Blob([out], { type: f.mime });
  };
  /* save a canvas (a video frame) in any photo format */
  M.saveFrameDialog = (canvas, name) => {
    const el = U.el; let fmt = 'png';
    const grid = el('div', { class: 'fmt-grid', role: 'radiogroup', 'aria-label': 'Picture format' }), desc = el('div', { class: 'note' });
    const q = CP.ui.slider({ label: 'Quality', min: 1, max: 100, value: 92, onInput: () => {} });
    const draw = () => { grid.innerHTML = ''; CP.SAVE_FORMATS.forEach((f) => { const b = el('button', { type: 'button', class: (f.id === fmt ? 'on ' : '') + (f.disabled ? 'dis' : ''), role: 'radio', 'aria-checked': f.id === fmt }, f.label, el('small', {}, '.' + f.ext)); b.onclick = () => { fmt = f.id; draw(); }; grid.append(b); }); const f = CP.SAVE_FORMATS.find((x) => x.id === fmt); desc.textContent = f.desc; q.hidden = f.quality == null; };
    draw();
    CP.ui.dialog({ title: 'Save frame as picture', wide: true, body: el('div', { class: 'stack' }, el('p', { class: 'muted sm' }, `${name} · ${canvas.width} × ${canvas.height} px`), grid, desc, q),
      buttons: [['Cancel'], ['Save', async () => {
        const f = CP.SAVE_FORMATS.find((x) => x.id === fmt); if (f.disabled) { CP.ui.toast(f.desc, 7000); return false; }
        const t = CP.ui.progress('Saving ' + f.label + '…');
        try { const b = await CP.encodeCanvas(canvas, fmt, { quality: f.quality != null ? +q.querySelector('input').value : undefined }); await U.download(b, name + '.' + f.ext); }
        catch (e) { CP.ui.error('Could not save', e); } finally { t.done(); }
      }, 'primary']] });
  };

  /* make any video playable in this browser: H.264/AAC MP4 */
  M.transcode = async (file, name) => {
    name = name || file.name || 'video';
    if (CP.desktop) return CP.desktopCall('transcode?name=' + encodeURIComponent(name), file, 'video/mp4');
    const isA = M.isAudio(name, file.type);
    const args = isA ? ['-vn', '-c:a', 'aac', '-b:a', '192k'] : ['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart'];
    const out = await ffRun(file, 'in.' + (U.ext(name) || 'bin'), args, isA ? 'out.m4a' : 'out.mp4', 'Preparing ' + name + ' for playback…');
    return new Blob([out], { type: isA ? 'audio/mp4' : 'video/mp4' });
  };

  /* load metadata; resolves {el, duration, width, height} or rejects if this browser can't play it */
  M.probe = (url, kind = 'video', timeout = 8000) => new Promise((res, rej) => {
    const el = document.createElement(kind === 'audio' ? 'audio' : 'video');
    el.preload = 'metadata'; el.muted = true; el.playsInline = true; el.crossOrigin = 'anonymous';
    let done = false;
    const finish = (ok, err) => { if (done) return; done = true; clearTimeout(tm); el.onloadedmetadata = el.onerror = null; ok ? res({ el, duration: el.duration, width: el.videoWidth || 0, height: el.videoHeight || 0 }) : rej(err || new Error('Cannot play')); };
    const tm = setTimeout(() => finish(false, new Error('Timed out')), timeout);
    el.onloadedmetadata = () => {
      if (kind === 'video' && !el.videoWidth) { // audio only, or a codec the browser can't decode
        el.onloadeddata = () => finish(el.videoWidth > 0 || el.duration > 0, new Error('No picture'));
        return setTimeout(() => finish(el.videoWidth > 0, new Error('No picture')), 1500);
      }
      finish(true);
    };
    el.onerror = () => finish(false, new Error('Cannot play'));
    el.src = url;
  });
  /* Returns a playable source for a File/Blob: {url, duration, width, height, converted} */
  M.playable = async (file, name) => {
    name = name || file.name || 'video';
    const kind = M.isAudio(name, file.type) ? 'audio' : 'video';
    const direct = URL.createObjectURL(file);
    try {
      const p = await M.probe(direct, kind);
      // some browsers report a duration for files they can only partly play (HEVC without hardware support)
      if (kind === 'video' && !p.width) throw new Error('no picture');
      return { url: direct, duration: p.duration, width: p.width, height: p.height, converted: false, blob: file };
    } catch (e) {
      URL.revokeObjectURL(direct);
      const conv = await M.transcode(file, name);
      const url = URL.createObjectURL(conv);
      const p = await M.probe(url, kind, 15000);
      return { url, duration: p.duration, width: p.width, height: p.height, converted: true, blob: conv };
    }
  };

  /* grab one frame as a canvas (thumbnails, snapshots) */
  M.grabFrame = (url, t, maxW = 320) => new Promise((res, rej) => {
    const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.playsInline = true;
    const tm = setTimeout(() => rej(new Error('Timed out')), 10000);
    v.onloadedmetadata = () => { v.currentTime = Math.min(Math.max(0, t), Math.max(0, v.duration - 0.05)); };
    v.onseeked = () => {
      clearTimeout(tm);
      const s = Math.min(1, maxW / v.videoWidth), c = U.canvas(v.videoWidth * s, v.videoHeight * s);
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); v.removeAttribute('src'); v.load(); res(c);
    };
    v.onerror = () => { clearTimeout(tm); rej(new Error('Cannot read video')); };
    v.src = url;
  });
  M.frameOf = (videoEl) => { const c = U.canvas(videoEl.videoWidth, videoEl.videoHeight); c.getContext('2d').drawImage(videoEl, 0, 0); return c; };
})(window.CP);
