/* CydArt Converter: batch-convert photos, videos and audio between formats.
   Photos: any readable image -> any CydArt picture format (resize optional).
   Videos/audio: any readable file -> any video, animation or audio format (FFmpeg). */
window.CP = window.CP || {};
(function (CP) {
  'use strict';
  const U = CP.util, el = U.el, M = CP.media;
  const C = CP.converter = {};
  const kindOf = (f) => (M.isAudio(f.name, f.type) ? 'audio' : M.isVideo(f.name, f.type) ? 'video' : 'photo');
  const store = { get(k, d) { try { const v = localStorage.getItem('cp-conv-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('cp-conv-' + k, JSON.stringify(v)); } catch (e) {} } };

  C.open = (initial = []) => {
    const items = [];
    const list = el('div', { class: 'cv-list', role: 'list', 'aria-label': 'Files to convert' });
    const empty = el('div', { class: 'cv-drop' }, el('b', {}, 'Drop photos, videos or music here'), el('span', {}, 'Or add files or a whole folder. Any mix of formats is fine.'));
    const addBtn = el('button', { class: 'btn sm raised primary', type: 'button' }, 'Add files');
    const folderBtn = el('button', { class: 'btn sm raised', type: 'button' }, 'Add folder');
    const clearBtn = el('button', { class: 'btn sm ghost', type: 'button' }, 'Clear list');

    /* output choices, remembered between uses */
    const picFmts = CP.SAVE_FORMATS.filter((f) => !f.disabled);
    const photoFmt = el('select', { 'aria-label': 'Photo output format' }, picFmts.map((f) => el('option', { value: f.id }, `${f.label} (.${f.ext})`)));
    photoFmt.value = store.get('photo', 'jpeg');
    const photoQ = el('input', { type: 'range', min: 1, max: 100, value: store.get('photoQ', 90), 'aria-label': 'Photo quality' }); const photoQv = el('span', { class: 'cv-val' }, photoQ.value);
    photoQ.oninput = () => { photoQv.textContent = photoQ.value; };
    const photoSize = el('select', { 'aria-label': 'Photo size' }, [[0, 'Keep original size'], [4096, 'Longest side 4096 px'], [2048, 'Longest side 2048 px'], [1920, 'Longest side 1920 px'], [1280, 'Longest side 1280 px'], [1080, 'Longest side 1080 px'], [800, 'Longest side 800 px'], [512, 'Longest side 512 px']].map(([v, n]) => el('option', { value: v }, n)));
    photoSize.value = store.get('photoSize', 0);
    const vidFmts = M.EXPORT_FORMATS.filter((f) => !f.frames);
    const groupSel = (label, filter, val) => {
      const s = el('select', { 'aria-label': label });
      for (const [g, gname] of M.GROUPS) { const og = el('optgroup', { label: gname }); vidFmts.filter((f) => f.group === g && filter(f)).forEach((f) => og.append(el('option', { value: f.id, disabled: !M.available(f) }, `${f.label} (.${f.ext})${M.available(f) ? '' : ' · desktop app'}`))); if (og.children.length) s.append(og); }
      s.value = val; if (!s.value) s.selectedIndex = 0; return s;
    };
    const videoFmt = groupSel('Video output format', () => true, store.get('video', 'mp4'));
    const videoSize = el('select', { 'aria-label': 'Video resolution' }, [[0, 'Keep original resolution'], [2160, 'Up to 2160p (4K)'], [1080, 'Up to 1080p'], [720, 'Up to 720p'], [480, 'Up to 480p'], [360, 'Up to 360p']].map(([v, n]) => el('option', { value: v }, n)));
    videoSize.value = store.get('videoSize', 0);
    const audioFmt = groupSel('Audio output format', (f) => f.group === 'audio', store.get('audio', 'mp3'));
    const photoDesc = el('p', { class: 'muted sm' }), videoDesc = el('p', { class: 'muted sm' });
    const describe = () => {
      const pf = picFmts.find((f) => f.id === photoFmt.value); photoDesc.textContent = pf ? pf.desc : ''; photoQ.parentElement.hidden = !pf || pf.quality == null;
      const vf = vidFmts.find((f) => f.id === videoFmt.value); videoDesc.textContent = vf ? vf.desc : ''; videoSize.parentElement.hidden = vf && vf.group === 'audio';
    };
    photoFmt.onchange = videoFmt.onchange = describe;
    const secPhoto = el('section', { class: 'cv-sec' }, el('h4', {}, 'Photos to'), el('label', { class: 'field' }, el('span', {}, 'Format'), photoFmt), el('label', { class: 'field' }, el('span', {}, 'Quality'), photoQ, photoQv), el('label', { class: 'field' }, el('span', {}, 'Size'), photoSize), photoDesc);
    const secVideo = el('section', { class: 'cv-sec' }, el('h4', {}, 'Videos to'), el('label', { class: 'field' }, el('span', {}, 'Format'), videoFmt), el('label', { class: 'field' }, el('span', {}, 'Resolution'), videoSize), videoDesc);
    const secAudio = el('section', { class: 'cv-sec' }, el('h4', {}, 'Music & audio to'), el('label', { class: 'field' }, el('span', {}, 'Format'), audioFmt));
    const note = el('p', { class: 'muted sm' }, CP.desktop ? 'Videos convert with the built-in FFmpeg engine.' : 'Video conversion runs in your browser and can be slow for long videos. The CydArt desktop app converts much faster.');
    const outMode = el('select', { 'aria-label': 'How to save' }, el('option', { value: 'zip' }, 'One ZIP file'), el('option', { value: 'each' }, 'Save each file separately'));
    outMode.value = store.get('out', 'zip');
    const summary = el('span', { class: 'muted sm' });

    const render = () => {
      list.innerHTML = '';
      empty.hidden = items.length > 0;
      for (const it of items) {
        const status = el('span', { class: 'cv-status ' + (it.state || '') }, it.msg || (it.state === 'done' ? 'Done' : it.state === 'error' ? 'Failed' : 'Ready'));
        const rm = el('button', { class: 'icon-btn sm', type: 'button', 'aria-label': 'Remove ' + it.file.name, title: 'Remove' }, '×'); rm.onclick = () => { items.splice(items.indexOf(it), 1); render(); };
        list.append(el('div', { class: 'cv-row', role: 'listitem' }, el('span', { class: 'cv-kind ' + it.kind }, it.kind === 'photo' ? 'Photo' : it.kind === 'video' ? 'Video' : 'Audio'), el('span', { class: 'cv-name', title: it.file.name }, it.file.name), el('span', { class: 'cv-size' }, U.fmtBytes(it.file.size)), status, busy ? null : rm));
      }
      const n = (k) => items.filter((i) => i.kind === k).length;
      secPhoto.hidden = !n('photo'); secVideo.hidden = !n('video'); secAudio.hidden = !n('audio');
      summary.textContent = items.length ? `${items.length} file${items.length > 1 ? 's' : ''}: ${n('photo')} photo, ${n('video')} video, ${n('audio')} audio` : '';
      describe();
    };
    const add = (files) => { for (const f of files) if (f && f.size) items.push({ file: f, kind: kindOf(f) }); render(); };
    addBtn.onclick = async () => add(await CP.ui.pickFiles({ multiple: true }));
    folderBtn.onclick = async () => add(await CP.ui.pickFiles({ directory: true }));
    clearBtn.onclick = () => { if (!busy) { items.length = 0; render(); } };

    const body = el('div', { class: 'cv' },
      el('div', { class: 'cv-left' }, el('div', { class: 'row gap', style: { flexWrap: 'wrap' } }, addBtn, folderBtn, clearBtn, summary), empty, list),
      el('div', { class: 'cv-right' }, secPhoto, secVideo, secAudio, el('label', { class: 'field' }, el('span', {}, 'Save as'), outMode), note));
    body.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); body.classList.add('over'); });
    body.addEventListener('dragleave', (e) => { if (!body.contains(e.relatedTarget)) body.classList.remove('over'); });
    body.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); body.classList.remove('over'); add([...e.dataTransfer.files]); });

    let busy = false, cancelled = false;
    const dlg = CP.ui.dialog({ title: 'Convert photos & videos', wide: true, body,
      buttons: [['Close', () => { if (busy) { cancelled = true; return false; } }], ['Convert', () => { run(); return false; }, 'primary']],
      onClose: () => { cancelled = true; } });
    dlg.el.classList.add('cv-dlg');
    const convertBtn = [...dlg.el.querySelectorAll('.dlg-foot .btn')].pop();

    async function run() {
      if (busy) return;
      if (!items.length) return CP.ui.toast('Add some files first');
      const pf = picFmts.find((f) => f.id === photoFmt.value), vf = vidFmts.find((f) => f.id === videoFmt.value), af = vidFmts.find((f) => f.id === audioFmt.value);
      if (items.some((i) => i.kind === 'video') && !M.available(vf)) return CP.ui.toast(vf.label + ' needs the CydArt desktop app');
      store.set('photo', photoFmt.value); store.set('photoQ', +photoQ.value); store.set('photoSize', +photoSize.value); store.set('video', videoFmt.value); store.set('videoSize', +videoSize.value); store.set('audio', audioFmt.value); store.set('out', outMode.value);
      busy = true; cancelled = false; convertBtn.disabled = true; convertBtn.textContent = 'Converting…';
      const outputs = []; const used = new Set();
      const uniq = (base, ext) => { let n = `${base}.${ext}`, k = 2; while (used.has(n.toLowerCase())) n = `${base} (${k++}).${ext}`; used.add(n.toLowerCase()); return n; };
      for (const it of items) { if (it.state !== 'done') { it.state = ''; it.msg = 'Waiting'; } }
      render();
      for (const it of items) {
        if (cancelled) break;
        if (it.state === 'done') continue;
        it.state = 'busy'; it.msg = 'Converting…'; render();
        try {
          let blob, ext;
          if (it.kind === 'photo') {
            let c = await CP.decodeToCanvas(it.file, it.file.name);
            const max = +photoSize.value;
            if (max && Math.max(c.width, c.height) > max) { const s = max / Math.max(c.width, c.height), r = U.canvas(c.width * s, c.height * s), g = r.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, r.width, r.height); c = r; }
            blob = await CP.encodeCanvas(c, pf.id, { quality: pf.quality != null ? +photoQ.value : undefined }); ext = pf.ext;
          } else {
            const f = it.kind === 'audio' ? af : vf;
            blob = await M.convert(it.file, f.id, it.file.name, { height: it.kind === 'video' ? +videoSize.value : 0 }); ext = f.ext;
          }
          const name = uniq(U.baseName(it.file.name), ext);
          outputs.push({ name, blob });
          it.state = 'done'; it.msg = `Done · ${U.fmtBytes(blob.size)}`;
          if (outMode.value === 'each') await U.download(blob, name);
        } catch (e) { console.error(e); it.state = 'error'; it.msg = 'Failed: ' + (e.message || e); }
        render();
      }
      if (outputs.length && outMode.value === 'zip') {
        if (outputs.length === 1) await U.download(outputs[0].blob, outputs[0].name);
        else {
          const fflate = await CP.loadZip(), files = {};
          for (const o of outputs) files[o.name] = [new Uint8Array(await o.blob.arrayBuffer()), { level: 0 }];
          const zip = await new Promise((res, rej) => fflate.zip(files, (e, out) => (e ? rej(e) : res(out))));
          await U.download(new Blob([zip], { type: 'application/zip' }), `CydArt converted ${new Date().toISOString().slice(0, 10)}.zip`);
        }
      }
      const failed = items.filter((i) => i.state === 'error').length;
      CP.ui.toast(cancelled ? 'Conversion stopped' : failed ? `${outputs.length} converted, ${failed} failed` : `Converted ${outputs.length} file${outputs.length === 1 ? '' : 's'}`, 5000);
      busy = false; convertBtn.disabled = false; convertBtn.textContent = 'Convert'; render();
    }
    add(initial); render();
    return { add };
  };
})(window.CP);
