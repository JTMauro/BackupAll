/* CydArt editor UI: menus, actions, toolbar, options, panels, dialogs, input handling. */
window.CP = window.CP || {};
(function (CP) {
  'use strict';
  const U = CP.util, el = U.el, O = CP.toolOpts;
  const $ = (s) => document.querySelector(s);
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const K = (s) => (isMac ? s.replace('Ctrl+', '⌘').replace('Alt+', '⌥').replace('Shift+', '⇧') : s);
  const need = () => { if (!CP.doc) { CP.ui.toast('Open an image or start a new canvas first'); return false; } return true; };
  const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  CP.setCursor = (c) => { const s = $('#stage'); if (s) s.style.cursor = c; };

  /* ======================= actions ======================= */
  const A = CP.act = {};

  /* --- file --- */
  A.open = async () => { const files = await CP.ui.pickFiles({ multiple: true }); if (files.length) CP.openFiles(files); };
  CP.openFiles = async (files, { toLibrary } = {}) => {
    if (CP.routeMedia && files.some((f) => CP.media.isMedia(f.name, f.type))) { CP.routeMedia(Array.from(files)); return; }
    const addLib = toLibrary != null ? toLibrary : CP.app.mode === 'photo' && CP.prefs.autoLibrary;
    let last = null;
    for (const f of files) {
      const t = CP.ui.progress('Opening ' + f.name + '…');
      try {
        const d = await CP.decodeFile(f);
        if (addLib && CP.lib.available) { const [rec] = await CP.lib.addFiles([f], { silent: true }); if (rec) d.libraryId = rec.id; }
        last = d; CP.addDoc(d, { fit: false });
      } catch (e) { CP.ui.error('Could not open ' + f.name, e); }
      finally { t.done(); }
    }
    if (last) { if (CP.app.mode === 'home' || (CP.app.mode === 'photo' && CP.app.photoSub !== 'editor')) CP.app.openEditor(CP.app.mode === 'draw' ? 'draw' : 'photo'); requestAnimationFrame(() => CP.zoomFit()); }
  };
  A.newDoc = () => newDocDialog();
  A.place = async () => {
    if (!need()) return; const [f] = await CP.ui.pickFiles(); if (!f) return;
    try {
      const c = await CP.decodeToCanvas(f, f.name), d = CP.doc, l = d.addLayer(U.baseName(f.name));
      const s = Math.min(1, d.width / c.width, d.height / c.height);
      l.ctx.imageSmoothingQuality = 'high'; l.ctx.drawImage(c, (d.width - c.width * s) / 2, (d.height - c.height * s) / 2, c.width * s, c.height * s);
      d.markDirty(l); d.commit('Place image'); CP.emit('layers', d); CP.selectTool('transform');
    } catch (e) { CP.ui.error('Could not place image', e); }
  };
  A.saveAs = () => need() && saveDialog();
  A.save = () => {
    if (!need()) return; const d = CP.doc;
    if (d.libraryId || CP.app.mode === 'photo') return CP.lib.saveDoc(d);
    if (d.lastSave) return doSave(d, d.lastSave.fmt, d.lastSave.opts);
    saveDialog();
  };
  A.saveLibrary = () => need() && CP.lib.saveDoc(CP.doc);
  A.saveLibraryCopy = () => need() && CP.lib.saveDoc(CP.doc, { asNew: true });
  A.quickPng = () => need() && doSave(CP.doc, 'png', {});
  A.quickJpg = () => need() && doSave(CP.doc, 'jpeg', { quality: 92 });
  A.print = () => {
    if (!need()) return; const url = CP.doc.flattened().toDataURL('image/png');
    const w = window.open('', '_blank'); if (!w) { CP.ui.toast('Allow pop-ups to print'); return; }
    w.document.write(`<title>Print</title><style>@page{margin:10mm}body{margin:0;display:grid;place-items:center;min-height:100vh}img{max-width:100%;max-height:100vh}</style><img src="${url}" onload="setTimeout(()=>print(),200)">`); w.document.close();
  };
  A.close = async () => { if (!CP.doc) return; if (!CP.doc.saved && !(await CP.ui.confirm(`Close "${CP.doc.name}" without saving?`, 'Close'))) return; CP.closeDoc(CP.doc); };

  /* --- edit --- */
  A.undo = () => { if (CP.doc) { const t = CP.tools.current; if (t && t.s && t.cancel) t.cancel(); CP.doc.undo(); } };
  A.redo = () => CP.doc && CP.doc.redo();
  const selectionCanvas = (d, merged) => {
    const src = merged ? d.flattened() : d.layer.canvas; let c = U.clone(src);
    if (d.selection) { const g = c.getContext('2d'); g.globalCompositeOperation = 'destination-in'; g.drawImage(d.selection.mask, 0, 0); const b = d.selection.bounds; const r = U.canvas(b.w, b.h); r.getContext('2d').drawImage(c, -b.x, -b.y); return { canvas: r, x: b.x, y: b.y }; }
    return { canvas: c, x: 0, y: 0 };
  };
  CP.clip = null;
  async function copyToSystem(c) {
    try { const b = await new Promise((r) => c.toBlob(r, 'image/png')); await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); } catch (e) { /* internal clipboard still works */ }
  }
  A.copy = (merged) => { if (!need()) return; const s = selectionCanvas(CP.doc, merged === true); CP.clip = s; copyToSystem(s.canvas); CP.ui.toast('Copied'); };
  A.copyMerged = () => A.copy(true);
  A.cut = () => { if (!need()) return; A.copy(); A.clear(); };
  A.clear = () => {
    if (!need()) return; const d = CP.doc, l = d.layer; if (l.locked) return CP.ui.toast('Layer is locked');
    if (d.selection) { l.ctx.globalCompositeOperation = 'destination-out'; l.ctx.drawImage(d.selection.mask, 0, 0); l.ctx.globalCompositeOperation = 'source-over'; }
    else l.ctx.clearRect(0, 0, d.width, d.height);
    d.markDirty(l); d.commit('Clear');
  };
  async function readClipboardImage() {
    try {
      const items = await navigator.clipboard.read();
      for (const it of items) { const t = it.types.find((x) => x.startsWith('image/')); if (t) return await it.getType(t); }
    } catch (e) {}
    return null;
  }
  CP.pasteBlob = async (blob, asNewDoc) => {
    const c = await CP.decodeToCanvas(blob, blob.name || 'clipboard.png');
    if (asNewDoc || !CP.doc) { const d = CP.newDocFromCanvas(c, 'Pasted image'); CP.addDoc(d); if (CP.app.mode !== 'draw' && CP.app.mode !== 'photo') CP.app.openEditor('draw'); return; }
    pasteCanvas(c);
  };
  function pasteCanvas(c, x, y) {
    const d = CP.doc, l = d.addLayer('Pasted');
    if (x == null) { x = Math.round((d.width - c.width) / 2); y = Math.round((d.height - c.height) / 2); }
    l.ctx.drawImage(c, x, y); d.markDirty(l); d.commit('Paste'); CP.emit('layers', d);
  }
  A.paste = async () => {
    const b = await readClipboardImage();
    if (b) return CP.pasteBlob(b, false);
    if (CP.clip) { if (!CP.doc) { CP.addDoc(CP.newDocFromCanvas(CP.clip.canvas, 'Pasted image')); return; } pasteCanvas(CP.clip.canvas, CP.clip.x, CP.clip.y); return; }
    CP.ui.toast(`Nothing to paste. Copy an image first, or press ${K('Ctrl+V')}.`);
  };
  A.pasteNew = async () => { const b = await readClipboardImage(); if (b) return CP.pasteBlob(b, true); if (CP.clip) { CP.addDoc(CP.newDocFromCanvas(CP.clip.canvas, 'Pasted image')); return; } CP.ui.toast('Clipboard has no image'); };
  A.fillFg = () => fillWith(CP.colors.fg); A.fillBg = () => fillWith(CP.colors.bg);
  function fillWith(color) { if (!need()) return; const d = CP.doc, c = U.canvas(d.width, d.height), g = c.getContext('2d'); g.fillStyle = color; g.fillRect(0, 0, d.width, d.height); d.applyToLayer(c); d.commit('Fill'); }
  A.stroke = async () => {
    if (!need() || !CP.doc.selection) return CP.ui.toast('Make a selection first');
    const w = +(await CP.ui.prompt('Stroke selection', 'Width in pixels', '4')); if (!w) return;
    const d = CP.doc, m = d.selection.mask, out = U.canvas(d.width, d.height), g = out.getContext('2d');
    // dilate mask by drawing it offset around a circle, then subtract original → outer stroke
    const steps = Math.max(8, Math.round(w * 3));
    for (let i = 0; i < steps; i++) { const a = (i / steps) * Math.PI * 2; g.drawImage(m, Math.cos(a) * w, Math.sin(a) * w); }
    g.globalCompositeOperation = 'destination-out'; g.drawImage(m, 0, 0);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = CP.colors.fg; g.fillRect(0, 0, d.width, d.height);
    const l = d.layer; l.ctx.drawImage(out, 0, 0); d.markDirty(l); d.commit('Stroke');
  };

  /* --- select --- */
  A.selectAll = () => { if (!need()) return; const d = CP.doc; d.selection = CP.Selection.fromShape(d.width, d.height, (g) => g.fillRect(0, 0, d.width, d.height)); d.changed(); };
  A.deselect = () => { if (!CP.doc) return; CP.doc.selection = null; CP.doc.changed(); };
  A.invertSel = () => { if (!need()) return; const d = CP.doc; if (!d.selection) return A.selectAll(); d.selection.invert(); if (d.selection.isEmpty()) d.selection = null; d.changed(); };
  A.selectLayer = () => { if (!need()) return; const d = CP.doc, s = new CP.Selection(d.width, d.height); s.mctx.drawImage(d.layer.canvas, 0, 0); s.update(); d.selection = s.isEmpty() ? null : s; d.changed(); };
  A.featherSel = async () => { const d = CP.doc; if (!d || !d.selection) return CP.ui.toast('Make a selection first'); const r = +(await CP.ui.prompt('Feather selection', 'Radius (px)', '8')); if (!r) return; const b = CP.blurCanvas(d.selection.mask, r); d.selection.mctx.clearRect(0, 0, d.width, d.height); d.selection.mctx.drawImage(b, 0, 0); d.selection.update(); d.changed(); };
  A.growSel = async (shrink) => {
    const d = CP.doc; if (!d || !d.selection) return CP.ui.toast('Make a selection first');
    const r = +(await CP.ui.prompt(shrink ? 'Shrink selection' : 'Grow selection', 'Pixels', '4')); if (!r) return;
    const m = d.selection.mask, c = U.canvas(d.width, d.height), g = c.getContext('2d');
    if (shrink) { g.fillRect(0, 0, d.width, d.height); g.globalCompositeOperation = 'destination-out'; g.drawImage(m, 0, 0); const inv = U.clone(c); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, d.width, d.height); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; g.drawImage(inv, Math.cos(a) * r, Math.sin(a) * r); } const grownInv = U.clone(c); g.clearRect(0, 0, d.width, d.height); g.drawImage(m, 0, 0); g.globalCompositeOperation = 'destination-out'; g.drawImage(grownInv, 0, 0); }
    else for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; g.drawImage(m, Math.cos(a) * r, Math.sin(a) * r); }
    d.selection.mctx.clearRect(0, 0, d.width, d.height); d.selection.mctx.drawImage(c, 0, 0); d.selection.update(); if (d.selection.isEmpty()) d.selection = null; d.changed();
  };

  /* --- image --- */
  A.resize = () => need() && resizeDialog();
  A.canvasSize = () => need() && canvasSizeDialog();
  const rot = (deg) => { const d = CP.doc; const w = deg % 180 ? d.height : d.width, h = deg % 180 ? d.width : d.height; d.transformAll(w, h, (g, s) => { g.translate(w / 2, h / 2); g.rotate(deg * Math.PI / 180); g.drawImage(s, -s.width / 2, -s.height / 2); }, 'Rotate'); CP.zoomFit(); };
  A.rotCW = () => need() && rot(90); A.rotCCW = () => need() && rot(270); A.rot180 = () => need() && rot(180);
  A.rotArb = async () => {
    if (!need()) return; const a = +(await CP.ui.prompt('Rotate image', 'Degrees (clockwise)', '15')); if (!a) return;
    const d = CP.doc, r = a * Math.PI / 180, w = Math.ceil(Math.abs(d.width * Math.cos(r)) + Math.abs(d.height * Math.sin(r))), h = Math.ceil(Math.abs(d.width * Math.sin(r)) + Math.abs(d.height * Math.cos(r)));
    d.transformAll(w, h, (g, s) => { g.translate(w / 2, h / 2); g.rotate(r); g.drawImage(s, -s.width / 2, -s.height / 2); }, 'Rotate'); CP.zoomFit();
  };
  const flip = (h, layerOnly) => {
    const d = CP.doc; const f = (g, s) => { g.translate(h ? s.width : 0, h ? 0 : s.height); g.scale(h ? -1 : 1, h ? 1 : -1); g.drawImage(s, 0, 0); };
    if (layerOnly) { const l = d.layer, c = U.canvas(d.width, d.height), g = c.getContext('2d'); f(g, l.canvas); l.ctx.clearRect(0, 0, d.width, d.height); l.ctx.drawImage(c, 0, 0); d.markDirty(l); d.commit('Flip layer'); }
    else d.transformAll(d.width, d.height, f, 'Flip');
  };
  A.flipH = () => need() && flip(true); A.flipV = () => need() && flip(false);
  A.flipLayerH = () => need() && flip(true, true); A.flipLayerV = () => need() && flip(false, true);
  A.cropSel = () => { const d = CP.doc; if (!d || !d.selection) return CP.ui.toast('Make a selection first'); const b = d.selection.bounds; d.transformAll(b.w, b.h, (g, s) => g.drawImage(s, -b.x, -b.y), 'Crop to selection'); CP.zoomFit(); };
  A.trim = () => { if (!need()) return; const d = CP.doc, b = CP.contentBounds(d.flattened()); if (!b) return; d.transformAll(b.w, b.h, (g, s) => g.drawImage(s, -b.x, -b.y), 'Trim'); CP.zoomFit(); };
  A.flatten = () => { if (!need()) return; const d = CP.doc, f = d.flattened(); d.layers = [d.layers[0]]; const l = d.layers[0]; l.ctx.clearRect(0, 0, d.width, d.height); l.ctx.drawImage(f, 0, 0); Object.assign(l, { name: 'Background', opacity: 1, blend: 'source-over', visible: true }); d.active = 0; d.markDirty(l); d.commit('Flatten'); CP.emit('layers', d); };

  /* --- layers --- */
  A.newLayer = () => { if (!need()) return; CP.doc.addLayer(); CP.doc.commit('New layer'); CP.emit('layers', CP.doc); };
  A.dupLayer = () => { if (!need()) return; const d = CP.doc, src = d.layer, l = d.addLayer(src.name + ' copy'); l.ctx.drawImage(src.canvas, 0, 0); Object.assign(l, { opacity: src.opacity, blend: src.blend }); d.commit('Duplicate layer'); CP.emit('layers', d); };
  A.layerViaCopy = () => { if (!need()) return; const d = CP.doc, s = selectionCanvas(d), l = d.addLayer('Layer via copy'); l.ctx.drawImage(s.canvas, s.x, s.y); d.commit('Layer via copy'); CP.emit('layers', d); };
  A.delLayer = () => { if (!need()) return; const d = CP.doc; if (d.layers.length < 2) return CP.ui.toast('A picture needs at least one layer'); d.layers.splice(d.active, 1); d.active = Math.max(0, d.active - 1); d.changed(); d.commit('Delete layer'); CP.emit('layers', d); };
  A.mergeDown = () => {
    if (!need()) return; const d = CP.doc; if (d.active === 0) return CP.ui.toast('No layer below to merge into');
    const top = d.layer, below = d.layers[d.active - 1];
    below.ctx.globalAlpha = top.opacity; below.ctx.globalCompositeOperation = top.blend; below.ctx.drawImage(top.canvas, 0, 0); below.ctx.globalAlpha = 1; below.ctx.globalCompositeOperation = 'source-over';
    d.layers.splice(d.active, 1); d.active--; d.markDirty(below); d.commit('Merge down'); CP.emit('layers', d);
  };
  A.mergeVisible = () => { if (!need()) return; const d = CP.doc, f = d.flattened(); d.layers = d.layers.filter((l) => !l.visible); const l = new CP.Layer(d.width, d.height, 'Merged'); l.ctx.drawImage(f, 0, 0); d.layers.push(l); d.active = d.layers.length - 1; d.changed(); d.commit('Merge visible'); CP.emit('layers', d); };
  A.layerUp = () => { const d = CP.doc; if (!d || d.active >= d.layers.length - 1) return; const [l] = d.layers.splice(d.active, 1); d.layers.splice(++d.active, 0, l); d.changed(); d.commit('Move layer'); CP.emit('layers', d); };
  A.layerDown = () => { const d = CP.doc; if (!d || d.active <= 0) return; const [l] = d.layers.splice(d.active, 1); d.layers.splice(--d.active, 0, l); d.changed(); d.commit('Move layer'); CP.emit('layers', d); };
  A.layerProps = () => need() && layerPropsDialog(CP.doc.layer);

  /* --- view --- */
  A.zoomIn = () => CP.doc && CP.zoomStep(1); A.zoomOut = () => CP.doc && CP.zoomStep(-1);
  A.zoomFit = () => CP.zoomFit(); A.zoom100 = () => CP.doc && CP.zoomTo(1);
  A.toggleGrid = () => { CP.view.showGrid = !CP.view.showGrid; CP.requestRender(); };
  A.fullscreen = () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); };
  A.togglePanels = () => $('#panels').classList.toggle('open');
  A.shortcuts = () => shortcutsDialog();
  A.photoWorkspace = () => CP.app.setWorkspace('photo'); A.drawWorkspace = () => CP.app.setWorkspace('draw');

  /* ======================= menus ======================= */
  const filterItems = (group) => Object.values(CP.filters).filter((f) => f.group === group).map((f) => [f.name + (f.instant ? '' : '…'), () => openFilter(f.id)]);
  const MENUS = () => [
    ['File', [
      ['New…', A.newDoc, K('Ctrl+N')], ['Open…', A.open, K('Ctrl+O')], ['Place image as layer…', A.place], '-',
      ['Save', A.save, K('Ctrl+S')], ['Save As / Export…', A.saveAs, K('Ctrl+Shift+S')], ['Quick export PNG', A.quickPng], ['Quick export JPEG', A.quickJpg], '-',
      ['Save to Library', A.saveLibrary], ['Save to Library as copy', A.saveLibraryCopy], '-', ['Print…', A.print, K('Ctrl+P')], ['Close image', A.close, K('Ctrl+W')],
    ]],
    ['Edit', [
      ['Undo', A.undo, K('Ctrl+Z'), { disabled: !CP.doc || CP.doc.hIndex <= 0 }], ['Redo', A.redo, K('Ctrl+Shift+Z'), { disabled: !CP.doc || CP.doc.hIndex >= CP.doc.history.length - 1 }], '-',
      ['Cut', A.cut, K('Ctrl+X')], ['Copy', A.copy, K('Ctrl+C')], ['Copy merged', A.copyMerged, K('Ctrl+Shift+C')], ['Paste as layer', A.paste, K('Ctrl+V')], ['Paste as new image', A.pasteNew, K('Ctrl+Alt+V')], '-',
      ['Fill with foreground', A.fillFg, K('Alt+Backspace')], ['Fill with background', A.fillBg, K('Ctrl+Backspace')], ['Stroke selection…', A.stroke], ['Clear', A.clear, 'Delete'], '-',
      ['Free transform', () => CP.selectTool('transform'), K('Ctrl+T')],
    ]],
    ['Select', [['All', A.selectAll, K('Ctrl+A')], ['Deselect', A.deselect, K('Ctrl+D')], ['Invert', A.invertSel, K('Ctrl+Shift+I')], ['Layer contents', A.selectLayer], '-', ['Feather…', A.featherSel], ['Grow…', () => A.growSel(false)], ['Shrink…', () => A.growSel(true)]]],
    ['Image', [
      ['Resize image…', A.resize, K('Ctrl+Alt+I')], ['Canvas size…', A.canvasSize, K('Ctrl+Alt+C')], '-',
      ['Rotate 90° clockwise', A.rotCW], ['Rotate 90° counter-clockwise', A.rotCCW], ['Rotate 180°', A.rot180], ['Rotate by angle…', A.rotArb], '-',
      ['Flip horizontal', A.flipH], ['Flip vertical', A.flipV], '-', ['Crop to selection', A.cropSel], ['Trim transparent edges', A.trim], ['Flatten image', A.flatten],
    ]],
    ['Adjust', filterItems('adjust')],
    ['Filter', filterItems('filter')],
    ['Layer', [
      ['New layer', A.newLayer, K('Ctrl+Shift+N')], ['Duplicate layer', A.dupLayer], ['Layer via copy', A.layerViaCopy, K('Ctrl+J')], ['Delete layer', A.delLayer], '-',
      ['Merge down', A.mergeDown, K('Ctrl+E')], ['Merge visible', A.mergeVisible, K('Ctrl+Shift+E')], '-',
      ['Move layer up', A.layerUp, K('Ctrl+]')], ['Move layer down', A.layerDown, K('Ctrl+[')], ['Flip layer horizontal', A.flipLayerH], ['Flip layer vertical', A.flipLayerV], '-', ['Layer properties…', A.layerProps],
    ]],
    ['View', [
      ['Zoom in', A.zoomIn, K('Ctrl++')], ['Zoom out', A.zoomOut, K('Ctrl+-')], ['Fit on screen', A.zoomFit, K('Ctrl+0')], ['Actual pixels', A.zoom100, K('Ctrl+1')], '-',
      ['Grid', A.toggleGrid, "Ctrl+'", { check: CP.view.showGrid }], ['Full screen', A.fullscreen, 'F11'], ['Show/hide panels', A.togglePanels, 'Tab'], '-',
      ['Photo workspace', A.photoWorkspace, '', { check: CP.app && CP.app.workspace === 'photo' }], ['Draw workspace', A.drawWorkspace, '', { check: CP.app && CP.app.workspace === 'draw' }],
    ]],
    ['About', CP.app.aboutItems()],
  ];
  function buildMenubar() {
    const mb = $('#menubar'); mb.innerHTML = '';
    for (const [name] of MENUS()) {
      const b = el('button', { class: 'menu-btn', role: 'menuitem', 'aria-haspopup': 'true', type: 'button' }, name);
      const open = () => { const items = MENUS().find((m) => m[0] === name)[1]; const r = b.getBoundingClientRect(); CP.ui.contextMenu(r.left, r.bottom + 2, items, { owner: b }); };
      b.onclick = () => (b.classList.contains('open') ? CP.ui.closeMenu() : open());
      b.onpointerenter = () => { if (document.querySelector('.menu-btn.open') && !b.classList.contains('open')) open(); };
      b.onkeydown = (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); open(); } };
      mb.append(b);
    }
    const panelsBtn = el('button', { class: 'menu-btn', style: { marginLeft: 'auto' }, type: 'button', 'aria-label': 'Show panels' }, 'Panels');
    panelsBtn.onclick = A.togglePanels; panelsBtn.classList.add('panels-toggle'); mb.append(panelsBtn);
  }

  /* ======================= toolbar ======================= */
  const groupChoice = {};
  function buildToolbar() {
    const tb = $('#toolbar'); tb.innerHTML = '';
    const ws = CP.app.workspace;
    const groups = CP.toolGroups.filter((g) => ws === 'draw' || !['clone'].includes('x'));
    groups.forEach((g, gi) => {
      const id = groupChoice[gi] && g.includes(groupChoice[gi]) ? groupChoice[gi] : g[0];
      const t = CP.tools.byId[id];
      const b = el('button', { class: 'tool-btn' + (g.length > 1 ? ' more' : ''), type: 'button', 'data-group': gi, 'data-tool': id, title: t.name + (t.key ? ` (${t.key.toUpperCase()})` : ''), 'aria-label': t.name, html: svg(t.icon) });
      b.onclick = () => CP.selectTool(b.dataset.tool);
      const showGroup = (e) => { e.preventDefault(); if (g.length < 2) return; const r = b.getBoundingClientRect(); CP.ui.contextMenu(r.right + 4, r.top, g.map((tid) => [CP.tools.byId[tid].name, () => { groupChoice[gi] = tid; buildToolbar(); CP.selectTool(tid); }, (CP.tools.byId[tid].key || '').toUpperCase()])); };
      b.oncontextmenu = showGroup;
      let hold; b.onpointerdown = (e) => { hold = setTimeout(() => showGroup(e), 450); }; b.onpointerup = b.onpointerleave = () => clearTimeout(hold);
      tb.append(b);
      if ([0, 2, 4, 8, 10].includes(gi)) tb.append(el('div', { class: 'tool-sep' }));
    });
    const sp = el('div', { class: 'swatch-pair' },
      el('button', { class: 'fgc', type: 'button', title: 'Foreground color', 'aria-label': 'Foreground color', onclick: () => pickColorDialog('fg') }),
      el('button', { class: 'bgc', type: 'button', title: 'Background color', 'aria-label': 'Background color', onclick: () => pickColorDialog('bg') }),
      el('button', { class: 'swap', type: 'button', title: 'Swap colors (X)', 'aria-label': 'Swap colors', onclick: CP.swapColors }, '⇄'));
    tb.append(sp); updateSwatches(); markTool();
  }
  function updateSwatches() { const f = $('.swatch-pair .fgc'), b = $('.swatch-pair .bgc'); if (f) { f.style.background = CP.colors.fg; b.style.background = CP.colors.bg; } }
  CP.colors.listeners.push(updateSwatches);
  function markTool() {
    const cur = CP.tools.current;
    document.querySelectorAll('.tool-btn').forEach((b) => {
      const gi = +b.dataset.group, g = CP.toolGroups[gi];
      if (cur && g.includes(cur.id) && b.dataset.tool !== cur.id) { groupChoice[gi] = cur.id; b.dataset.tool = cur.id; b.innerHTML = svg(cur.icon); b.title = cur.name; b.setAttribute('aria-label', cur.name); }
      b.classList.toggle('on', !!cur && b.dataset.tool === cur.id); b.setAttribute('aria-pressed', !!cur && b.dataset.tool === cur.id);
    });
  }

  /* ======================= options bar ======================= */
  function seg(label, key, options) {
    const s = el('div', { class: 'seg', role: 'group', 'aria-label': label });
    options.forEach(([v, l]) => { const b = el('button', { type: 'button', class: O[key] === v ? 'on' : '', 'aria-pressed': O[key] === v }, l); b.onclick = () => { O[key] = v; buildOptbar(); }; s.append(b); });
    return el('div', { class: 'opt' }, label ? el('span', {}, label) : null, s);
  }
  function range(label, key, min, max, suffix = '') {
    const v = el('span', { class: 'val' }, O[key] + suffix);
    const r = el('input', { type: 'range', min, max, value: O[key], 'aria-label': label });
    r.oninput = () => { O[key] = +r.value; v.textContent = r.value + suffix; CP.requestRender(); };
    return el('label', { class: 'opt' }, el('span', {}, label), r, v);
  }
  const check = (label, key) => { const c = el('input', { type: 'checkbox', checked: !!O[key] }); c.onchange = () => { O[key] = c.checked; }; return el('label', { class: 'opt' }, c, el('span', {}, label)); };
  const OPT = {
    size: () => range('Size', 'size', 1, 500, 'px'), opacity: () => range('Opacity', 'opacity', 1, 100, '%'), hardness: () => range('Hardness', 'hardness', 0, 100, '%'),
    flow: () => range('Flow', 'flow', 1, 100, '%'), smoothing: () => range('Smoothing', 'smoothing', 0, 100, '%'), strength: () => range('Strength', 'strength', 1, 100, '%'),
    tolerance: () => range('Tolerance', 'tolerance', 0, 255), feather: () => range('Feather', 'feather', 0, 100, 'px'), strokeW: () => range('Line', 'strokeW', 1, 100, 'px'), radius: () => (O.shape === 'roundrect' ? range('Corner', 'radius', 0, 200, 'px') : null),
    pressure: () => check('Pen pressure', 'pressure'), contiguous: () => check('Contiguous', 'contiguous'), sampleAll: () => check('All layers', 'sampleAll'), cloneAligned: () => check('Aligned', 'cloneAligned'),
    shapeLayer: () => check('New layer', 'shapeLayer'), bold: () => check('Bold', 'bold'), italic: () => check('Italic', 'italic'), textShadow: () => check('Shadow', 'textShadow'),
    textStroke: () => range('Outline', 'textStroke', 0, 30, 'px'),
    selMode: () => seg('', 'selMode', [['replace', 'New'], ['add', 'Add'], ['subtract', 'Subtract'], ['intersect', 'Intersect']]),
    shapeStyle: () => (O.shape === 'line' || O.shape === 'arrow' ? null : seg('', 'shapeStyle', [['fill', 'Fill'], ['stroke', 'Outline'], ['both', 'Both']])),
    gradType: () => seg('', 'gradType', [['linear', 'Linear'], ['radial', 'Radial'], ['angle', 'Angle'], ['reflected', 'Reflected']]),
    gradMode: () => seg('', 'gradMode', [['fg-bg', 'FG → BG'], ['fg-transparent', 'FG → Clear']]),
    align: () => seg('', 'align', [['left', 'Left'], ['center', 'Center'], ['right', 'Right']]),
    shape: () => { const s = el('select', { 'aria-label': 'Shape' }, CP.SHAPES.map(([v, l]) => el('option', { value: v, selected: O.shape === v }, l))); s.onchange = () => { O.shape = s.value; buildOptbar(); }; return el('label', { class: 'opt' }, el('span', {}, 'Shape'), s); },
    font: () => { const s = el('select', { 'aria-label': 'Font' }, CP.FONTS.map((f) => el('option', { value: f, selected: O.font === f, style: { fontFamily: f } }, f.split(',')[0]))); s.onchange = () => { O.font = s.value; CP.tools.byId.text.style(); }; return el('label', { class: 'opt' }, el('span', {}, 'Font'), s); },
    fontSize: () => { const n = el('input', { type: 'number', min: 4, max: 1000, value: O.fontSize, 'aria-label': 'Font size' }); n.oninput = () => { O.fontSize = +n.value || 12; CP.tools.byId.text.style(); }; return el('label', { class: 'opt' }, el('span', {}, 'Size'), n); },
    cropRatio: () => { const s = el('select', { 'aria-label': 'Aspect ratio' }, CP.CROP_RATIOS.map((r) => el('option', { value: r, selected: O.cropRatio === r }, r === 'free' ? 'Free' : r === 'original' ? 'Original ratio' : r))); s.onchange = () => { O.cropRatio = s.value; }; return el('label', { class: 'opt' }, el('span', {}, 'Ratio'), s); },
    cropApply: () => { const t = CP.tools.byId.crop; return el('div', { class: 'opt' }, el('button', { class: 'btn sm primary', type: 'button', onclick: () => t.apply() }, 'Crop'), el('button', { class: 'btn sm', type: 'button', onclick: () => { t.r = null; CP.requestRender(); } }, 'Cancel'), el('span', {}, 'Drag on the image, then press Enter')); },
    transformApply: () => { const t = CP.tools.byId.transform; return el('div', { class: 'opt' }, el('button', { class: 'btn sm primary', type: 'button', onclick: () => { t.apply(); CP.selectTool('move'); } }, 'Apply'), el('button', { class: 'btn sm', type: 'button', onclick: () => { t.cancel(); CP.selectTool('move'); } }, 'Cancel'), el('span', {}, 'Drag corners to scale (Shift: free), outside to rotate')); },
  };
  function buildOptbar() {
    const ob = $('#optbar'), t = CP.tools.current; ob.innerHTML = ''; if (!t) return;
    ob.append(el('span', { class: 'tname' }, t.name.replace(/\s*\(.*\)/, '')));
    for (const k of t.opts || []) { const n = OPT[k] && OPT[k](); if (n) ob.append(n); }
    if (t.id === 'move') ob.append(el('span', { class: 'opt' }, 'Drag to move the layer or selection. Arrow keys nudge.'));
    if (t.id === 'clone') ob.append(el('span', { class: 'opt' }, isMac ? 'Option+click sets the source' : 'Alt+click sets the source'));
    if (['brush', 'pencil', 'airbrush'].includes(t.id)) ob.append(el('span', { class: 'opt' }, (isMac ? 'Option' : 'Alt') + '+click picks a color · [ ] change size'));
  }
  CP.on('doc', () => { const t = CP.tools.current; if (t && (t.id === 'transform' || t.id === 'crop')) CP.selectTool('move'); });
  CP.on('tool', () => { buildOptbar(); markTool(); CP.setCursor(CP.tools.current.cursor || 'default'); });

  /* ======================= panels ======================= */
  const panelState = (() => { try { return JSON.parse(localStorage.getItem('cp-panels') || '{}'); } catch (e) { return {}; } })();
  function panel(id, title, body, acts) {
    const p = el('section', { class: 'panel' + (panelState[id] ? ' closed' : ''), 'data-panel': id });
    const head = el('button', { class: 'panel-head', type: 'button', 'aria-expanded': !panelState[id] }, title);
    head.onclick = (e) => { if (e.target.closest('.acts')) return; p.classList.toggle('closed'); panelState[id] = p.classList.contains('closed'); head.setAttribute('aria-expanded', !panelState[id]); try { localStorage.setItem('cp-panels', JSON.stringify(panelState)); } catch (err) {} };
    if (acts) head.append(el('span', { class: 'acts' }, acts));
    p.append(head, el('div', { class: 'panel-body' }, body)); return p;
  }
  function buildPanels() {
    const ps = $('#panels'); ps.innerHTML = '';
    if (CP.app.workspace === 'photo') {
      ps.append(panel('histo', 'Histogram', histoPanel()), panel('looks', 'Looks', looksPanel()), panel('quick', 'Quick adjust', quickPanel()), panel('layers', 'Layers', layersPanel()), panel('history', 'History', historyPanel()), panel('info', 'Info', infoPanel()));
    } else {
      ps.append(panel('color', 'Color', colorPanel()), panel('brushes', 'Brush presets', brushPanel()), panel('layers', 'Layers', layersPanel()), panel('history', 'History', historyPanel()), panel('nav', 'Navigator', navPanel()));
    }
    refreshPanels();
  }
  CP.buildPanels = buildPanels;

  /* color */
  let hsv = { h: 0.55, s: 0.8, v: 0.8 };
  function colorPanel() {
    const sv = el('div', { class: 'cp-sv' }), svc = U.canvas(240, 140), svk = el('div', { class: 'cp-knob' }); sv.append(svc, svk);
    const hue = el('div', { class: 'cp-hue' }), hc = U.canvas(240, 14), hk = el('div', { class: 'cp-knob' }); hue.append(hc, hk);
    const hex = el('input', { type: 'text', 'aria-label': 'Hex color', maxlength: 7 });
    const native = el('input', { type: 'color', 'aria-label': 'System color picker', style: { width: '40px', height: '34px', padding: '0', border: '0', background: 'none' } });
    const sw = el('div', { class: 'swatches' });
    const SW = ['#000000', '#ffffff', '#7f7f7f', '#c3c3c3', '#ed1c24', '#ff7f27', '#fff200', '#22b14c', '#00a2e8', '#3f48cc', '#a349a4', '#ffaec9', '#b97a57', '#ffc90e', '#b5e61d', '#99d9ea', '#7092be', '#c8bfe7', '#0096dc', '#cddb28'];
    SW.forEach((c) => { const b = el('button', { type: 'button', style: { background: c }, 'aria-label': c, title: c + ' (right-click: background)' }); b.onclick = () => CP.setColor('fg', c); b.oncontextmenu = (e) => { e.preventDefault(); CP.setColor('bg', c); }; sw.append(b); });
    const draw = () => {
      const g = svc.getContext('2d'), [r, gg, b] = U.hslToRgb(hsv.h, 1, 0.5);
      g.fillStyle = `rgb(${r},${gg},${b})`; g.fillRect(0, 0, 240, 140);
      let gr = g.createLinearGradient(0, 0, 240, 0); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 240, 140);
      gr = g.createLinearGradient(0, 0, 0, 140); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, 240, 140);
      const hg = hc.getContext('2d'), hgr = hg.createLinearGradient(0, 0, 240, 0); for (let i = 0; i <= 6; i++) hgr.addColorStop(i / 6, `hsl(${i * 60},100%,50%)`); hg.fillStyle = hgr; hg.fillRect(0, 0, 240, 14);
      svk.style.left = hsv.s * 100 + '%'; svk.style.top = (1 - hsv.v) * 100 + '%'; hk.style.left = hsv.h * 100 + '%';
      hex.value = CP.colors.fg.toUpperCase(); native.value = CP.colors.fg;
    };
    const fromHsv = () => { const { h, s, v } = hsv, i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s); const [r, g, b] = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6]; CP.colors.fg = U.rgbToHex(r * 255, g * 255, b * 255); CP.colors.listeners.forEach((fn) => fn !== syncFromColor && fn()); draw(); };
    const syncFromColor = () => { const { r, g, b } = U.hexToRgb(CP.colors.fg); const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255, dd = mx - mn; let h = hsv.h; if (dd) { const R = r / 255, G = g / 255, B = b / 255; h = mx === R ? ((G - B) / dd + 6) % 6 : mx === G ? (B - R) / dd + 2 : (R - G) / dd + 4; h /= 6; } hsv = { h, s: mx ? dd / mx : 0, v: mx }; draw(); };
    const drag = (target, fn) => { target.addEventListener('pointerdown', (e) => { target.setPointerCapture(e.pointerId); fn(e); const mv = (ev) => fn(ev); target.addEventListener('pointermove', mv); target.addEventListener('pointerup', () => target.removeEventListener('pointermove', mv), { once: true }); }); };
    drag(sv, (e) => { const r = sv.getBoundingClientRect(); hsv.s = U.clamp((e.clientX - r.left) / r.width, 0, 1); hsv.v = 1 - U.clamp((e.clientY - r.top) / r.height, 0, 1); fromHsv(); });
    drag(hue, (e) => { const r = hue.getBoundingClientRect(); hsv.h = U.clamp((e.clientX - r.left) / r.width, 0, 0.9999); fromHsv(); });
    hex.onchange = () => { let v = hex.value.trim(); if (!v.startsWith('#')) v = '#' + v; if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v)) CP.setColor('fg', v.length === 4 ? '#' + [...v.slice(1)].map((c) => c + c).join('') : v.toLowerCase()); };
    native.oninput = () => CP.setColor('fg', native.value);
    CP.colors.listeners.push(syncFromColor); setTimeout(syncFromColor, 0);
    return el('div', {}, sv, hue, el('div', { class: 'cp-row' }, hex, native), sw);
  }
  function pickColorDialog(which) {
    const inp = el('input', { type: 'color', value: CP.colors[which], style: { width: '100%', height: '120px', border: '0', background: 'none' }, 'aria-label': 'Color' });
    CP.ui.dialog({ title: which === 'fg' ? 'Foreground color' : 'Background color', body: inp, buttons: [['Cancel'], ['OK', () => CP.setColor(which, inp.value), 'primary']] });
  }
  /* brush presets */
  function brushPanel() {
    const P = [['Fine liner', 'pencil', { size: 2, opacity: 100 }], ['Ink pen', 'brush', { size: 6, hardness: 95, opacity: 100, flow: 100, smoothing: 45 }], ['Soft round', 'brush', { size: 40, hardness: 0, opacity: 100, flow: 60 }],
      ['Marker', 'brush', { size: 22, hardness: 85, opacity: 60, flow: 100 }], ['Watercolor', 'brush', { size: 60, hardness: 10, opacity: 35, flow: 30 }], ['Airbrush', 'airbrush', { size: 80, hardness: 0, flow: 50, opacity: 100 }],
      ['Pixel art', 'pencil', { size: 1, opacity: 100 }], ['Big eraser', 'eraser', { size: 120, hardness: 50, opacity: 100 }], ['Soft eraser', 'eraser', { size: 60, hardness: 0, opacity: 60 }]];
    const g = el('div', { class: 'looks' });
    P.forEach(([n, tool, o]) => { const c = U.canvas(90, 60), x = c.getContext('2d'); x.strokeStyle = '#38bdf8'; x.lineCap = 'round'; x.globalAlpha = (o.opacity || 100) / 100; x.lineWidth = Math.min(24, Math.max(1.5, o.size / 3)); if ((o.hardness ?? 100) < 50) { x.shadowColor = '#38bdf8'; x.shadowBlur = 8; } x.beginPath(); x.moveTo(10, 42); x.bezierCurveTo(30, 5, 55, 60, 80, 18); x.stroke();
      const b = el('button', { class: 'look', type: 'button' }, c, el('span', {}, n)); b.onclick = () => { Object.assign(O, o); CP.selectTool(tool); }; g.append(b); });
    return g;
  }
  /* layers */
  let layersBox;
  function layersPanel() {
    layersBox = el('div');
    return layersBox;
  }
  function renderLayers() {
    if (!layersBox) return; const d = CP.doc; layersBox.innerHTML = '';
    if (!d) { layersBox.append(el('p', { class: 'muted sm' }, 'No image open')); return; }
    const l = d.layer;
    const blend = el('select', { 'aria-label': 'Blend mode' }, CP.BLEND_MODES.map(([v, n]) => el('option', { value: v, selected: l && l.blend === v }, n)));
    blend.onchange = () => { l.blend = blend.value; d.changed(); d.commit('Blend mode'); };
    const op = el('input', { type: 'range', min: 0, max: 100, value: l ? Math.round(l.opacity * 100) : 100, 'aria-label': 'Layer opacity' }); const opv = el('span', {}, (l ? Math.round(l.opacity * 100) : 100) + '%');
    op.oninput = () => { l.opacity = op.value / 100; opv.textContent = op.value + '%'; d.changed(); }; op.onchange = () => d.commit('Opacity');
    layersBox.append(el('div', { class: 'layer-props' }, blend, op, opv));
    const list = el('div', { class: 'layer-list' });
    d.layers.forEach((ly, i) => {
      const th = U.canvas(40, 30), tg = th.getContext('2d'), s = Math.min(40 / d.width, 30 / d.height); th.width = Math.max(1, Math.round(d.width * s)); th.height = Math.max(1, Math.round(d.height * s)); tg.drawImage(ly.canvas, 0, 0, th.width, th.height);
      const eye = el('button', { class: 'icon-btn', type: 'button', 'aria-label': ly.visible ? 'Hide layer' : 'Show layer', title: ly.visible ? 'Hide' : 'Show', html: svg(ly.visible ? 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6z' : 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3 3.6M6.3 6.3C3.6 8.1 2 12 2 12s4 7 10 7a9.6 9.6 0 0 0 4.4-1') });
      eye.onclick = (e) => { e.stopPropagation(); ly.visible = !ly.visible; d.changed(); d.commit(ly.visible ? 'Show layer' : 'Hide layer'); renderLayers(); };
      const lock = el('button', { class: 'icon-btn' + (ly.locked ? ' on' : ''), type: 'button', 'aria-label': ly.locked ? 'Unlock layer' : 'Lock layer', title: ly.locked ? 'Unlock' : 'Lock', html: svg(ly.locked ? 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3' : 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 7.5-2') });
      lock.onclick = (e) => { e.stopPropagation(); ly.locked = !ly.locked; renderLayers(); };
      const name = el('span', { class: 'lname' }, ly.name);
      const row = el('div', { class: 'layer' + (i === d.active ? ' on' : '') + (ly.visible ? '' : ' hiddenl'), draggable: 'true', role: 'button', tabindex: '0', 'aria-label': 'Layer ' + ly.name }, eye, el('span', { class: 'lthumb' }, th), name, lock);
      row.onclick = () => { d.active = i; CP.emit('layers', d); };
      row.ondblclick = () => { const inp = el('input', { type: 'text', value: ly.name, 'aria-label': 'Layer name' }); name.innerHTML = ''; name.append(inp); inp.focus(); inp.select(); const done = () => { ly.name = inp.value || ly.name; d.commit('Rename layer'); renderLayers(); }; inp.onblur = done; inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') inp.blur(); }; };
      row.oncontextmenu = (e) => { e.preventDefault(); d.active = i; CP.emit('layers', d); CP.ui.contextMenu(e.clientX, e.clientY, [['Properties…', A.layerProps], ['Duplicate', A.dupLayer], ['Merge down', A.mergeDown], ['Delete', A.delLayer], '-', ['Select layer contents', A.selectLayer], ['Flip horizontal', A.flipLayerH], ['Flip vertical', A.flipLayerV]]); };
      row.ondragstart = (e) => { e.dataTransfer.setData('text/cp-layer', String(i)); };
      row.ondragover = (e) => { e.preventDefault(); row.classList.add('drag-over'); }; row.ondragleave = () => row.classList.remove('drag-over');
      row.ondrop = (e) => { e.preventDefault(); const from = +e.dataTransfer.getData('text/cp-layer'); if (isNaN(from) || from === i) return; const [m] = d.layers.splice(from, 1); d.layers.splice(i, 0, m); d.active = i; d.changed(); d.commit('Reorder layers'); CP.emit('layers', d); };
      list.append(row);
    });
    layersBox.append(list);
    const ab = (label, d2, fn) => el('button', { class: 'icon-btn', type: 'button', title: label, 'aria-label': label, onclick: fn, html: svg(d2) });
    layersBox.append(el('div', { class: 'layer-acts' }, ab('New layer', 'M12 5v14M5 12h14', A.newLayer), ab('Duplicate', 'M8 8h12v12H8zM4 16V4h12', A.dupLayer), ab('Move up', 'M12 19V5M6 11l6-6 6 6', A.layerUp), ab('Move down', 'M12 5v14M6 13l6 6 6-6', A.layerDown), ab('Merge down', 'M12 4v12M7 11l5 5 5-5M5 20h14', A.mergeDown), ab('Properties', 'M4 6h16M4 12h10M4 18h6', A.layerProps), ab('Delete layer', 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13', A.delLayer)));
  }
  /* history */
  let histBox;
  function historyPanel() { histBox = el('div', { class: 'hist' }); return histBox; }
  function renderHistory() {
    if (!histBox) return; histBox.innerHTML = ''; const d = CP.doc; if (!d) return;
    d.history.forEach((h, i) => { const b = el('button', { type: 'button', class: i === d.hIndex ? 'on' : i > d.hIndex ? 'future' : '' }, h.label); b.onclick = () => d.restore(i); histBox.append(b); });
    const on = histBox.querySelector('.on'); on && on.scrollIntoView({ block: 'nearest' });
  }
  /* histogram */
  let histoCv;
  function histoPanel() { histoCv = el('canvas', { class: 'histo', width: 256, height: 80, 'aria-label': 'Histogram' }); return histoCv; }
  const renderHisto = U.debounce(() => { if (!histoCv || !CP.doc) return; CP.drawHistogram(histoCv, CP.histogram(CP.doc.renderComposite())); }, 250);
  /* looks */
  let looksBox, looksFor = null;
  function looksPanel() { looksBox = el('div', { class: 'looks' }); return looksBox; }
  function renderLooks() {
    if (!looksBox) return; const d = CP.doc; if (!d) { looksBox.innerHTML = '<p class="muted sm">Open a photo to see looks</p>'; looksFor = null; return; }
    if (looksFor === d.id + ':' + d.hIndex) return; looksFor = d.id + ':' + d.hIndex;
    looksBox.innerHTML = '';
    const src = d.layer.canvas, s = 120 / Math.max(src.width, src.height), small = U.canvas(src.width * s, src.height * s); small.getContext('2d').drawImage(src, 0, 0, small.width, small.height);
    CP.LOOKS.forEach((lk) => {
      const c = U.canvas(small.width, small.height); c.getContext('2d').drawImage(CP.applyLook(small, lk), 0, 0);
      const b = el('button', { class: 'look', type: 'button', title: 'Apply ' + lk.name }, c, el('span', {}, lk.name));
      b.onclick = () => {
        if (lk.id === 'none') return; if (!d.layer || d.layer.locked) return CP.ui.toast('Layer is locked');
        const t = CP.ui.progress('Applying ' + lk.name + '…');
        setTimeout(() => { try { const out = CP.applyLook(d.layer.canvas, lk); d.applyToLayer(out, { replace: true }); d.commit('Look: ' + lk.name); } finally { t.done(); } }, 20);
      };
      looksBox.append(b);
    });
  }
  /* quick adjust (photo) */
  const QA = [['exposure', 'Exposure', -100, 100], ['contrast', 'Contrast', -100, 100], ['highlights', 'Highlights', -100, 100], ['shadows', 'Shadows', -100, 100], ['saturation', 'Saturation', -100, 100], ['vibrance', 'Vibrance', -100, 100], ['temp', 'Temperature', -100, 100], ['tint', 'Tint', -100, 100], ['sharpen', 'Sharpen', 0, 100], ['vignette', 'Vignette', 0, 100]];
  let qa = Object.fromEntries(QA.map((q) => [q[0], 0])), qaBase = null, qaRows = [];
  function quickRun(src) {
    let c = src; const F = CP.filters;
    if (qa.exposure || qa.contrast) c = F.brightness.apply(F.exposure.apply(c, { e: qa.exposure / 50, o: 0, g: 1 }), { b: 0, c: qa.contrast * 0.6 });
    if (qa.highlights || qa.shadows) c = F.shadowshigh.apply(c, { s: qa.shadows, h: qa.highlights });
    if (qa.saturation || qa.vibrance) c = F.vibrance.apply(c, { v: qa.vibrance, s: qa.saturation });
    if (qa.temp || qa.tint) c = F.temperature.apply(c, { t: qa.temp * 0.6, n: qa.tint * 0.6 });
    if (qa.sharpen) c = F.sharpen.apply(c, { a: qa.sharpen * 1.5, r: 1.2, t: 2 });
    if (qa.vignette) c = F.vignette.apply(c, { a: qa.vignette * 0.8, sz: 60, f: 60 });
    return c;
  }
  const quickPreview = U.debounce(() => {
    const d = CP.doc; if (!d || !qaBase) return;
    const src = qaBase.small || qaBase.full; const out = quickRun(src);
    let o = out; if (qaBase.small) { o = U.canvas(d.width, d.height); const g = o.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(out, 0, 0, d.width, d.height); }
    if (d.selection) { const m = U.clone(d.layer.canvas), g = m.getContext('2d'); const t = U.clone(o); const tg = t.getContext('2d'); tg.globalCompositeOperation = 'destination-in'; tg.drawImage(d.selection.mask, 0, 0); g.globalCompositeOperation = 'destination-out'; g.drawImage(d.selection.mask, 0, 0); g.globalCompositeOperation = 'source-over'; g.drawImage(t, 0, 0); o = m; }
    d.override = o; d.changed();
  }, 30);
  function quickPanel() {
    qaRows = [];
    const box = el('div', { class: 'qa' });
    QA.forEach(([k, label, min, max]) => {
      const v = el('span', { class: 'v' }, String(qa[k])); const r = el('input', { type: 'range', min, max, value: qa[k], 'aria-label': label });
      r.oninput = () => {
        const d = CP.doc; if (!d || !d.layer) return;
        if (!qaBase) { const full = d.layer.canvas; let small = null; const px = full.width * full.height; if (px > 2.2e6) { const s = Math.sqrt(2.2e6 / px); small = U.canvas(full.width * s, full.height * s); small.getContext('2d').drawImage(full, 0, 0, small.width, small.height); } qaBase = { full, small, doc: d, layer: d.layer }; }
        qa[k] = +r.value; v.textContent = r.value; quickPreview();
      };
      r.ondblclick = () => { r.value = 0; r.oninput(); };
      qaRows.push([r, v, k]);
      box.append(el('label', {}, el('span', {}, label), r, v));
    });
    box.append(el('div', { class: 'row gap', style: { marginTop: '4px' } },
      el('button', { class: 'btn sm primary', type: 'button', onclick: quickApply }, 'Apply'), el('button', { class: 'btn sm', type: 'button', onclick: quickReset }, 'Reset'),
      el('button', { class: 'btn sm ghost', type: 'button', onclick: () => { const d = CP.doc; if (!d) return; const out = CP.filters.autolevels.apply(d.layer.canvas); d.applyToLayer(out, { replace: true }); d.commit('Auto enhance'); } }, 'Auto')));
    return box;
  }
  function quickApply() {
    const d = CP.doc; if (!d || !qaBase) return;
    const t = CP.ui.progress('Applying adjustments…');
    setTimeout(() => { try { d.override = null; const out = quickRun(qaBase.layer.canvas); d.applyToLayer(out, { replace: true, layer: qaBase.layer }); d.commit('Quick adjust'); quickReset(true); } finally { t.done(); } }, 20);
  }
  function quickReset(keepNothing) { qa = Object.fromEntries(QA.map((q) => [q[0], 0])); qaRows.forEach(([r, v]) => { r.value = 0; v.textContent = '0'; }); if (qaBase && qaBase.doc) { qaBase.doc.override = null; qaBase.doc.changed(); } qaBase = null; }
  CP.on('doc', () => { if (qaBase && qaBase.doc !== CP.doc) { qaBase.doc.override = null; quickReset(); } });
  CP.on('history', () => { if (qaBase && CP.doc && qaBase.doc === CP.doc && qaBase.layer !== CP.doc.layer) quickReset(); });
  /* info & navigator */
  let infoBox, navCv;
  function infoPanel() { infoBox = el('div', { class: 'muted sm' }); return infoBox; }
  function renderInfo() { if (!infoBox) return; const d = CP.doc; infoBox.innerHTML = d ? `<div>${d.width} × ${d.height} px · ${(d.width * d.height / 1e6).toFixed(1)} MP</div><div>${d.layers.length} layer${d.layers.length > 1 ? 's' : ''}${d.sourceFormat ? ' · opened from ' + d.sourceFormat : ''}</div><div>${d.libraryId ? 'In your Library' : 'Not in Library'}</div>` : 'No image'; }
  function navPanel() {
    navCv = el('canvas', { class: 'navthumb', width: 260, height: 160, 'aria-label': 'Navigator: click to move the view' });
    const go = (e) => { const d = CP.doc; if (!d) return; const r = navCv.getBoundingClientRect(), s = Math.min(navCv.width / d.width, navCv.height / d.height), ox = (navCv.width - d.width * s) / 2, oy = (navCv.height - d.height * s) / 2; const px = ((e.clientX - r.left) * navCv.width / r.width - ox) / s, py = ((e.clientY - r.top) * navCv.height / r.height - oy) / s; const { w, h } = CP.stageSize(); d.panX = w / 2 - px * d.zoom; d.panY = h / 2 - py * d.zoom; CP.requestRender(); };
    navCv.addEventListener('pointerdown', (e) => { go(e); navCv.setPointerCapture(e.pointerId); navCv.onpointermove = go; navCv.onpointerup = () => (navCv.onpointermove = null); });
    return navCv;
  }
  const renderNav = U.debounce(() => {
    if (!navCv || !CP.doc) return; const d = CP.doc, g = navCv.getContext('2d'), W = navCv.width, H = navCv.height, s = Math.min(W / d.width, H / d.height), ox = (W - d.width * s) / 2, oy = (H - d.height * s) / 2;
    g.clearRect(0, 0, W, H); g.drawImage(d.composite, ox, oy, d.width * s, d.height * s);
    const { w, h } = CP.stageSize(); g.strokeStyle = '#38bdf8'; g.lineWidth = 2; g.strokeRect(ox + (-d.panX / d.zoom) * s, oy + (-d.panY / d.zoom) * s, (w / d.zoom) * s, (h / d.zoom) * s);
  }, 120);
  function refreshPanels() { renderLayers(); renderHistory(); renderHisto(); renderLooks(); renderInfo(); renderNav(); }
  CP.on('layers', () => { renderLayers(); renderInfo(); });
  CP.on('history', () => { renderHistory(); renderLayers(); renderHisto(); renderLooks(); renderInfo(); updateStatus(); renderDocbar(); });
  CP.on('doc', () => { refreshPanels(); renderDocbar(); updateStatus(); $('#stage-empty').hidden = !!CP.doc; });
  CP.on('zoom', () => { updateStatus(); renderNav(); });

  /* ======================= docbar & status ======================= */
  function renderDocbar() {
    const db = $('#docbar'); db.innerHTML = '';
    CP.docs.forEach((d) => {
      const t = el('div', { class: 'doctab' + (d === CP.doc ? ' on' : ''), role: 'tab', 'aria-selected': d === CP.doc, tabindex: '0' }, d.saved ? null : el('span', { class: 'dot', title: 'Unsaved changes' }), d.name);
      const x = el('button', { class: 'x', type: 'button', 'aria-label': 'Close ' + d.name, title: 'Close' }, '×');
      x.onclick = async (e) => { e.stopPropagation(); if (!d.saved && !(await CP.ui.confirm(`Close "${d.name}" without saving?`, 'Close'))) return; CP.closeDoc(d); };
      t.append(x); t.onclick = () => CP.setDoc(d); t.onkeydown = (e) => { if (e.key === 'Enter') CP.setDoc(d); }; db.append(t);
    });
    const nb = el('button', { class: 'doctab', type: 'button', title: 'New canvas', 'aria-label': 'New canvas' }, '+'); nb.onclick = A.newDoc; db.append(nb);
  }
  let posEl;
  function updateStatus() {
    const sb = $('#statusbar'); const d = CP.doc;
    if (!sb.firstChild) {
      posEl = el('span'); sb.append(el('span', { id: 'st-size' }), posEl, el('span', { id: 'st-sel' }),
        el('div', { class: 'zoomctl' }, el('button', { type: 'button', 'aria-label': 'Zoom out', onclick: A.zoomOut }, '−'), el('span', { id: 'st-zoom' }), el('button', { type: 'button', 'aria-label': 'Zoom in', onclick: A.zoomIn }, '+'), el('button', { type: 'button', onclick: A.zoomFit, title: 'Fit' }, 'Fit'), el('button', { type: 'button', onclick: A.zoom100, title: 'Actual pixels' }, '1:1')));
    }
    $('#st-size').textContent = d ? `${d.width} × ${d.height}px` : '';
    $('#st-zoom').textContent = d ? Math.round(d.zoom * 100) + '%' : '–';
    $('#st-sel').textContent = d && d.selection && d.selection.bounds ? `Selection ${d.selection.bounds.w} × ${d.selection.bounds.h}` : '';
  }
  CP.on('selection', updateStatus);

  /* ======================= stage input ======================= */
  function initStageInput() {
    const stage = $('#stage'), wrap = $('#stage-wrap');
    CP.initStage(stage, wrap);
    let active = null, spaceDown = false, panDrag = null; const pointers = new Map(); let pinch = null;
    stage.addEventListener('pointerdown', (e) => {
      const d = CP.doc; if (!d) return; stage.focus({ preventScroll: true });
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) { // pinch zoom/pan on touch
        if (active && active.up) { try { active.up(CP.screenToDoc(e.clientX, e.clientY), e); } catch (er) {} if (d.preview) { d.preview = null; d.changed(); } }
        active = null; const [a, b] = [...pointers.values()]; pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, zoom: d.zoom, panX: d.panX, panY: d.panY }; return;
      }
      if (e.button === 1 || spaceDown || (e.button === 0 && e.pointerType === 'mouse' && CP.tools.current.id === 'hand')) { if (e.button === 1 || spaceDown) { panDrag = { x: e.clientX, y: e.clientY, px: d.panX, py: d.panY }; stage.setPointerCapture(e.pointerId); CP.setCursor('grabbing'); return; } }
      if (e.button === 2) return;
      stage.setPointerCapture(e.pointerId);
      active = CP.tools.current; const p = CP.screenToDoc(e.clientX, e.clientY);
      try { active.down && active.down(p, e); } catch (err) { CP.ui.error('Tool error', err); active = null; }
    });
    stage.addEventListener('pointermove', (e) => {
      const d = CP.doc; if (!d) return;
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size === 2) {
        const [a, b] = [...pointers.values()], dist = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, r = stage.getBoundingClientRect();
        const z = U.clamp(pinch.zoom * dist / pinch.dist, 0.02, 64), px = (pinch.cx - r.left - pinch.panX) / pinch.zoom, py = (pinch.cy - r.top - pinch.panY) / pinch.zoom;
        d.zoom = z; d.panX = cx - r.left - px * z; d.panY = cy - r.top - py * z; CP.requestRender(); CP.emit('zoom', d); return;
      }
      const p = CP.screenToDoc(e.clientX, e.clientY); CP.tools.pointer = p;
      if (posEl) posEl.textContent = `${Math.floor(p.x)}, ${Math.floor(p.y)}`;
      if (panDrag) { d.panX = panDrag.px + e.clientX - panDrag.x; d.panY = panDrag.py + e.clientY - panDrag.y; CP.requestRender(); CP.emit('zoom', d); return; }
      const t = active || CP.tools.current;
      const evs = e.getCoalescedEvents && active ? e.getCoalescedEvents() : [e];
      try { for (const ev of evs.length ? evs : [e]) { if (t.move) t.move(CP.screenToDoc(ev.clientX, ev.clientY), ev); } } catch (err) { console.error(err); }
      if (t.overlay) CP.requestRender();
    });
    const end = (e) => {
      pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null;
      if (panDrag) { panDrag = null; CP.setCursor(spaceDown ? 'grab' : CP.tools.current.cursor || 'default'); return; }
      if (!active) return; const t = active; active = null;
      try { t.up && t.up(CP.screenToDoc(e.clientX, e.clientY), e); } catch (err) { CP.ui.error('Tool error', err); }
    };
    stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
    stage.addEventListener('pointerleave', () => { CP.tools.pointer = null; CP.requestRender(); });
    stage.addEventListener('dblclick', (e) => { const t = CP.tools.current; if (t.dbl) t.dbl(CP.screenToDoc(e.clientX, e.clientY), e); });
    stage.addEventListener('contextmenu', (e) => {
      e.preventDefault(); if (!CP.doc) return;
      CP.ui.contextMenu(e.clientX, e.clientY, [['Undo', A.undo, K('Ctrl+Z')], ['Redo', A.redo], '-', ['Copy', A.copy], ['Paste', A.paste], ['Select all', A.selectAll], ['Deselect', A.deselect], ['Invert selection', A.invertSel], '-', ['New layer', A.newLayer], ['Free transform', () => CP.selectTool('transform')], ['Fit on screen', A.zoomFit]]);
    });
    wrap.addEventListener('wheel', (e) => {
      const d = CP.doc; if (!d) return; e.preventDefault(); const r = stage.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey || CP.prefs.wheelZoom) { const k = Math.exp(-e.deltaY * (e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 50 ? 0.01 : 0.0025)); CP.zoomTo(d.zoom * k, e.clientX - r.left, e.clientY - r.top); }
      else { d.panX -= e.shiftKey ? e.deltaY : e.deltaX; d.panY -= e.shiftKey ? 0 : e.deltaY; CP.requestRender(); CP.emit('zoom', d); }
    }, { passive: false });
    document.addEventListener('keydown', (e) => { if (e.code === 'Space' && !e.repeat && !isTyping(e) && CP.app.inEditor()) { spaceDown = true; CP.setCursor('grab'); e.preventDefault(); } });
    document.addEventListener('keyup', (e) => { if (e.code === 'Space') { spaceDown = false; CP.setCursor(CP.tools.current.cursor || 'default'); } });
  }
  const isTyping = (e) => e.target.closest && e.target.closest('input, textarea, select, [contenteditable]');

  /* ======================= keyboard shortcuts ======================= */
  function onKey(e) {
    if (isTyping(e) || document.querySelector('.dlg-back') || !CP.app.inEditor()) return;
    const t = CP.tools.current; if (t && t.keydown && t.keydown(e)) { e.preventDefault(); return; }
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    const map = {
      'z': () => (e.shiftKey ? A.redo() : A.undo()), 'y': A.redo, 'o': A.open, 'n': () => (e.shiftKey ? A.newLayer() : A.newDoc()), 's': () => (e.shiftKey ? A.saveAs() : A.save()),
      'c': () => (e.altKey ? A.canvasSize() : e.shiftKey ? A.copyMerged() : A.copy()), 'x': A.cut, 'v': () => (e.altKey ? A.pasteNew() : A.paste()), 'a': A.selectAll, 'd': A.deselect, 'i': () => (e.shiftKey ? A.invertSel() : e.altKey ? A.resize() : null),
      'j': A.layerViaCopy, 'e': () => (e.shiftKey ? A.mergeVisible() : A.mergeDown()), 't': () => CP.selectTool('transform'), 'w': A.close, 'p': A.print,
      '0': A.zoomFit, '1': A.zoom100, '=': A.zoomIn, '+': A.zoomIn, '-': A.zoomOut, ']': A.layerUp, '[': A.layerDown, "'": A.toggleGrid, 'backspace': A.fillBg,
    };
    if (mod && map[k]) { e.preventDefault(); map[k](); return; }
    if (mod) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); if (e.altKey) A.fillFg(); else A.clear(); return; }
    if (e.key === 'Escape') { if (CP.doc && CP.doc.selection) A.deselect(); return; }
    if (e.key === 'Tab') { e.preventDefault(); A.togglePanels(); return; }
    if (e.key === '?') { A.shortcuts(); return; }
    if (k === 'x') { CP.swapColors(); return; }
    if (k === 'd') { CP.setColor('fg', '#000000'); CP.setColor('bg', '#ffffff'); return; }
    if (e.key === '[' || e.key === ']') { O.size = U.clamp(Math.round(O.size * (e.key === ']' ? 1.15 : 0.87)) + (e.key === ']' ? 1 : -1), 1, 500); buildOptbar(); CP.requestRender(); return; }
    if (t && t.id === 'move' && e.key.startsWith('Arrow')) { e.preventDefault(); const s = e.shiftKey ? 10 : 1; t.nudge(e.key === 'ArrowLeft' ? -s : e.key === 'ArrowRight' ? s : 0, e.key === 'ArrowUp' ? -s : e.key === 'ArrowDown' ? s : 0); return; }
    if (/^[0-9]$/.test(k) && t && t.opts && t.opts.includes('opacity')) { O.opacity = k === '0' ? 100 : +k * 10; buildOptbar(); return; }
    const cands = CP.tools.list.filter((x) => x.key === k); if (!cands.length) return;
    const i = cands.indexOf(t); CP.selectTool((e.shiftKey || i >= 0 ? cands[(i + 1) % cands.length] : cands[0]).id);
  }

  /* ======================= dialogs ======================= */
  function newDocDialog(preset) {
    const w = el('input', { type: 'number', min: 1, max: 20000, value: preset ? preset[1] : 1920, 'aria-label': 'Width' });
    const h = el('input', { type: 'number', min: 1, max: 20000, value: preset ? preset[2] : 1080, 'aria-label': 'Height' });
    const bg = el('select', { 'aria-label': 'Background' }, el('option', { value: 'white' }, 'White'), el('option', { value: 'transparent' }, 'Transparent'), el('option', { value: 'bg' }, 'Background color'), el('option', { value: 'black' }, 'Black'));
    const name = el('input', { type: 'text', value: 'Untitled', 'aria-label': 'Name' });
    const presets = el('div', { class: 'row gap', style: { flexWrap: 'wrap' } }, CP.app.PRESETS.map(([n, pw, ph]) => el('button', { class: 'chip', type: 'button', onclick: () => { w.value = pw; h.value = ph; } }, n)));
    CP.ui.dialog({
      title: 'New canvas', body: el('div', { class: 'stack' }, presets, el('label', { class: 'field' }, el('span', {}, 'Name'), name), el('label', { class: 'field' }, el('span', {}, 'Width (px)'), w), el('label', { class: 'field' }, el('span', {}, 'Height (px)'), h), el('label', { class: 'field' }, el('span', {}, 'Background'), bg)),
      buttons: [['Cancel'], ['Create', () => CP.app.createDoc(+w.value, +h.value, bg.value, name.value), 'primary']],
    });
  }
  CP.newDocDialog = newDocDialog;

  function saveDialog() {
    const d = CP.doc; let fmt = d.lastSave ? d.lastSave.fmt : (d.layers.length > 1 ? 'psd' : 'png');
    const name = el('input', { type: 'text', value: d.name, 'aria-label': 'File name' });
    const grid = el('div', { class: 'fmt-grid', role: 'radiogroup', 'aria-label': 'Format' });
    const desc = el('div', { class: 'note' });
    const qRow = CP.ui.slider({ label: 'Quality', min: 1, max: 100, value: 90, onInput: () => est() });
    const scRow = CP.ui.slider({ label: 'Scale %', min: 5, max: 400, value: 100, onInput: () => est() });
    const matte = el('input', { type: 'color', value: '#ffffff', 'aria-label': 'Background for formats without transparency' });
    const matteRow = el('label', { class: 'param' }, el('span', {}, 'Fill transparency'), matte, el('span'));
    const info = el('p', { class: 'muted sm' });
    const qVal = () => +qRow.querySelector('input[type=range]').value, scVal = () => +scRow.querySelector('input[type=range]').value / 100;
    let estTimer; const est = () => { clearTimeout(estTimer); info.textContent = `Output: ${Math.round(d.width * scVal())} × ${Math.round(d.height * scVal())} px`; };
    const draw = () => {
      grid.innerHTML = '';
      CP.SAVE_FORMATS.forEach((f) => {
        const b = el('button', { type: 'button', class: (f.id === fmt ? 'on ' : '') + (f.disabled ? 'dis' : ''), role: 'radio', 'aria-checked': f.id === fmt }, f.label, el('small', {}, '.' + f.ext + (f.layers ? ' · layers' : '') + (f.disabled ? ' · open only' : '')));
        b.onclick = () => { fmt = f.id; draw(); }; grid.append(b);
      });
      const f = CP.SAVE_FORMATS.find((x) => x.id === fmt);
      desc.textContent = f.desc; qRow.hidden = f.quality == null; if (f.quality != null && !d.lastSave) qRow.setValue(f.quality);
      scRow.hidden = f.engine === 'psd'; matteRow.hidden = !!f.alpha || f.engine === 'psd'; est();
    };
    draw();
    CP.ui.dialog({
      title: 'Save As / Export', wide: true,
      body: el('div', { class: 'stack' }, el('label', { class: 'field' }, el('span', {}, 'File name'), name), grid, desc, qRow, scRow, matteRow, info,
        el('p', { class: 'muted sm' }, 'Tip: PSD keeps your layers so you can keep editing later. Ctrl+S saves to your Library.')),
      buttons: [['Cancel'], ['Save to Library', () => { CP.lib.saveDoc(d); }], ['Download', () => {
        const f = CP.SAVE_FORMATS.find((x) => x.id === fmt); if (f.disabled) { CP.ui.toast(f.desc, 7000); return false; }
        d.name = name.value.trim() || d.name;
        const opts = { quality: f.quality != null ? qVal() : undefined, scale: scVal(), matte: matte.value };
        d.lastSave = { fmt, opts }; doSave(d, fmt, opts);
      }, 'primary']],
    });
  }
  async function doSave(d, fmt, opts) {
    const f = CP.SAVE_FORMATS.find((x) => x.id === fmt);
    const t = CP.ui.progress(`Saving ${f.label}…`);
    try {
      const blob = await CP.encodeDoc(d, fmt, opts);
      const fname = U.baseName(d.name) + '.' + f.ext;
      if (window.showSaveFilePicker && CP.prefs.useSavePicker) {
        try { const h = await showSaveFilePicker({ suggestedName: fname, types: [{ description: f.label, accept: { [f.mime]: ['.' + f.ext] } }] }); const w = await h.createWritable(); await w.write(blob); await w.close(); }
        catch (e) { if (e.name === 'AbortError') return; U.download(blob, fname); }
      } else U.download(blob, fname);
      d.saved = true; CP.emit('doc', d); CP.ui.toast(`Saved ${fname} (${U.fmtBytes(blob.size)})`);
    } catch (e) { CP.ui.error('Could not save', e); }
    finally { t.done(); }
  }

  function resizeDialog() {
    const d = CP.doc, ar = d.width / d.height;
    const w = el('input', { type: 'number', min: 1, max: 30000, value: d.width, 'aria-label': 'Width' }), h = el('input', { type: 'number', min: 1, max: 30000, value: d.height, 'aria-label': 'Height' });
    const pct = el('input', { type: 'number', min: 1, max: 1000, value: 100, 'aria-label': 'Percent' }); const lock = el('input', { type: 'checkbox', checked: true });
    w.oninput = () => { if (lock.checked) h.value = Math.round(w.value / ar); pct.value = Math.round(w.value / d.width * 100); };
    h.oninput = () => { if (lock.checked) w.value = Math.round(h.value * ar); pct.value = Math.round(h.value / d.height * 100); };
    pct.oninput = () => { w.value = Math.round(d.width * pct.value / 100); h.value = Math.round(d.height * pct.value / 100); };
    CP.ui.dialog({ title: 'Resize image', body: el('div', { class: 'stack' }, el('label', { class: 'field' }, el('span', {}, 'Width'), w, el('span', {}, 'px')), el('label', { class: 'field' }, el('span', {}, 'Height'), h, el('span', {}, 'px')), el('label', { class: 'field' }, el('span', {}, 'Percent'), pct, el('span', {}, '%')), el('label', { class: 'opt' }, lock, el('span', {}, 'Keep proportions'))),
      buttons: [['Cancel'], ['Resize', () => {
        const nw = +w.value, nh = +h.value; if (!(nw > 0 && nh > 0)) return false;
        d.transformAll(nw, nh, (g, s) => { // step down in halves for quality
          let src = s; while (src.width / 2 > nw && src.height / 2 > nh) { const t = U.canvas(src.width / 2, src.height / 2), tg = t.getContext('2d'); tg.imageSmoothingQuality = 'high'; tg.drawImage(src, 0, 0, t.width, t.height); src = t; }
          g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, nw, nh);
        }, 'Resize'); CP.zoomFit();
      }, 'primary']] });
  }
  function canvasSizeDialog() {
    const d = CP.doc; const w = el('input', { type: 'number', min: 1, max: 30000, value: d.width, 'aria-label': 'Width' }), h = el('input', { type: 'number', min: 1, max: 30000, value: d.height, 'aria-label': 'Height' });
    let anchor = [0.5, 0.5]; const grid = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,32px)', gap: '4px' }, role: 'radiogroup', 'aria-label': 'Anchor' });
    const drawA = () => { grid.innerHTML = ''; for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) { const on = anchor[0] === x / 2 && anchor[1] === y / 2; const b = el('button', { type: 'button', class: 'chip' + (on ? ' on' : ''), style: { width: '32px', height: '32px', padding: 0 }, role: 'radio', 'aria-checked': on, 'aria-label': `Anchor ${x},${y}` }, on ? '●' : ''); b.onclick = () => { anchor = [x / 2, y / 2]; drawA(); }; grid.append(b); } };
    drawA();
    CP.ui.dialog({ title: 'Canvas size', body: el('div', { class: 'stack' }, el('label', { class: 'field' }, el('span', {}, 'Width'), w, el('span', {}, 'px')), el('label', { class: 'field' }, el('span', {}, 'Height'), h, el('span', {}, 'px')), el('div', { class: 'field' }, el('span', {}, 'Anchor'), grid)),
      buttons: [['Cancel'], ['Apply', () => { const nw = +w.value, nh = +h.value; const ox = (nw - d.width) * anchor[0], oy = (nh - d.height) * anchor[1]; d.transformAll(nw, nh, (g, s) => g.drawImage(s, Math.round(ox), Math.round(oy)), 'Canvas size'); CP.zoomFit(); }, 'primary']] });
  }
  function layerPropsDialog(l) {
    const d = CP.doc; const name = el('input', { type: 'text', value: l.name, 'aria-label': 'Layer name' });
    const bl = el('select', { 'aria-label': 'Blend mode' }, CP.BLEND_MODES.map(([v, n]) => el('option', { value: v, selected: l.blend === v }, n)));
    const orig = { o: l.opacity, b: l.blend };
    const op = CP.ui.slider({ label: 'Opacity %', min: 0, max: 100, value: Math.round(l.opacity * 100), onInput: (v) => { l.opacity = v / 100; d.changed(); } });
    bl.onchange = () => { l.blend = bl.value; d.changed(); };
    CP.ui.dialog({ title: 'Layer properties', body: el('div', { class: 'stack' }, el('label', { class: 'field' }, el('span', {}, 'Name'), name), el('label', { class: 'field' }, el('span', {}, 'Blend mode'), bl), op),
      buttons: [['Cancel', () => { l.opacity = orig.o; l.blend = orig.b; d.changed(); }], ['OK', () => { l.name = name.value || l.name; d.commit('Layer properties'); CP.emit('layers', d); }, 'primary']] });
  }
  function shortcutsDialog() {
    const rows = [['B / N / A', 'Brush / Pencil / Airbrush'], ['E', 'Eraser'], ['V', 'Move'], [K('Ctrl+T'), 'Free transform'], ['M', 'Rectangle / ellipse select'], ['L', 'Lasso'], ['W', 'Magic wand'], ['C', 'Crop'], ['G', 'Fill / gradient'], ['S', 'Clone stamp'], ['T', 'Text'], ['U', 'Shapes'], ['I', 'Eyedropper'], ['H / Space', 'Pan'], ['Z', 'Zoom'],
      ['[ ]', 'Brush size'], ['1–0', 'Opacity 10–100%'], ['X', 'Swap colors'], ['D', 'Default colors'], [K('Ctrl+Z') + ' / ' + K('Ctrl+Shift+Z'), 'Undo / redo'], [K('Ctrl+S'), 'Save'], [K('Ctrl+Shift+S'), 'Save as / export'], [K('Ctrl+O'), 'Open'], [K('Ctrl+N'), 'New'], [K('Ctrl+J'), 'Layer via copy'], [K('Ctrl+E'), 'Merge down'], [K('Ctrl+D'), 'Deselect'], [K('Ctrl+0'), 'Fit'], ['Tab', 'Panels'], ['Shift+click', 'Straight brush line'], [isMac ? 'Option+click' : 'Alt+click', 'Pick color / clone source']];
    const g = el('div', { class: 'kbd-grid' }); rows.forEach(([k, v]) => g.append(el('span', {}, el('kbd', {}, k)), el('span', {}, v)));
    CP.ui.dialog({ title: 'Keyboard shortcuts', body: g });
  }

  /* --- filter dialog with live preview --- */
  function openFilter(id) {
    if (!need()) return; const d = CP.doc, f = CP.filters[id], l = d.layer;
    if (l.locked) return CP.ui.toast('This layer is locked');
    if (f.instant) { const t = CP.ui.progress(f.name + '…'); setTimeout(() => { try { d.applyToLayer(f.apply(l.canvas, {}), { replace: true }); d.commit(f.name); } finally { t.done(); } }, 20); return; }
    const params = CP.filterDefaults(f);
    const src = l.canvas, px = src.width * src.height, small = px > 1.6e6 ? (() => { const s = Math.sqrt(1.6e6 / px), c = U.canvas(src.width * s, src.height * s); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); return { c, s }; })() : null;
    let previewOn = true;
    const preview = U.debounce(() => {
      if (!previewOn) { d.override = null; d.changed(); return; }
      try {
        const scaled = small ? scaleParams(f, params, small.s) : params;
        let out = f.apply(small ? small.c : src, scaled);
        if (small) { const o = U.canvas(d.width, d.height), g = o.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(out, 0, 0, d.width, d.height); out = o; }
        if (d.selection) { const m = U.clone(src), g = m.getContext('2d'), t = U.clone(out), tg = t.getContext('2d'); tg.globalCompositeOperation = 'destination-in'; tg.drawImage(d.selection.mask, 0, 0); g.globalCompositeOperation = 'destination-out'; g.drawImage(d.selection.mask, 0, 0); g.globalCompositeOperation = 'source-over'; g.drawImage(t, 0, 0); out = m; }
        d.override = out; d.changed();
      } catch (e) { console.error(e); }
    }, 40);
    let body;
    if (f.custom === 'levels') body = levelsUI(params, preview, src);
    else if (f.custom === 'curves') body = curvesUI(params, preview, src);
    else {
      body = el('div');
      (f.params || []).forEach((p) => {
        if (p.type === 'check') { const c = el('input', { type: 'checkbox', checked: !!params[p.id] }); c.onchange = () => { params[p.id] = c.checked; preview(); }; body.append(el('label', { class: 'param' }, el('span', {}, p.label), c, el('span'))); }
        else if (p.type === 'select') { const s = el('select', { 'aria-label': p.label }, p.options.map(([v, n]) => el('option', { value: v, selected: params[p.id] === v }, n))); s.onchange = () => { params[p.id] = s.value; preview(); }; body.append(el('label', { class: 'param' }, el('span', {}, p.label), s, el('span'))); }
        else if (p.type === 'color') { const c = el('input', { type: 'color', value: params[p.id], 'aria-label': p.label }); c.oninput = () => { params[p.id] = c.value; preview(); }; body.append(el('label', { class: 'param' }, el('span', {}, p.label), c, el('span'))); }
        else body.append(CP.ui.slider({ label: p.label, min: p.min, max: p.max, step: p.step || 1, value: params[p.id], onInput: (v) => { params[p.id] = v; preview(); } }));
      });
      if (!(f.params || []).length) body.append(el('p', { class: 'muted' }, 'No settings. Click Apply.'));
    }
    const pv = el('input', { type: 'checkbox', checked: true }); pv.onchange = () => { previewOn = pv.checked; preview(); };
    const wrap = el('div', { class: 'stack' }, body, el('label', { class: 'opt' }, pv, el('span', {}, 'Preview')), small ? el('p', { class: 'muted sm' }, 'Preview is shown at reduced resolution; Apply uses full resolution.') : null);
    let applied = false;
    CP.ui.dialog({ title: f.name, body: wrap, wide: !!f.custom,
      buttons: [['Reset', () => { Object.assign(params, CP.filterDefaults(f)); CP.ui.closeMenu(); setTimeout(() => openFilter(id), 0); return true; }], ['Cancel'], ['Apply', () => {
        applied = true; const t = CP.ui.progress('Applying ' + f.name + '…');
        setTimeout(() => { try { d.override = null; const out = f.apply(src, params); d.applyToLayer(out, { replace: true, layer: l }); d.commit(f.name); } catch (e) { CP.ui.error('Filter failed', e); } finally { t.done(); } }, 20);
      }, 'primary']],
      onClose: () => { if (!applied) { d.override = null; d.changed(); } } });
    preview();
  }
  CP.openFilter = openFilter;
  function scaleParams(f, p, s) { const q = { ...p }; for (const k of ['r', 'd', 's']) if (typeof q[k] === 'number' && ['blur', 'motionblur', 'pixelate', 'sharpen', 'glow', 'halftone', 'sketch'].includes(f.id)) q[k] = Math.max(f.id === 'pixelate' || f.id === 'halftone' ? 2 : 0.5, q[k] * s); return q; }

  function levelsUI(params, preview, src) {
    const hc = el('canvas', { class: 'histo', width: 256, height: 100 }); CP.drawHistogram(hc, CP.histogram(src), 'l');
    const rows = [['inB', 'Input black', 0, 254, 1], ['gamma', 'Midtones (gamma)', 0.1, 4, 0.01], ['inW', 'Input white', 1, 255, 1], ['outB', 'Output black', 0, 255, 1], ['outW', 'Output white', 0, 255, 1]];
    return el('div', { class: 'stack' }, hc, ...rows.map(([k, label, min, max, step]) => CP.ui.slider({ label, min, max, step, value: params[k], onInput: (v) => { params[k] = v; preview(); } })));
  }
  function curvesUI(params, preview, src) {
    let ch = 'rgb'; const cv = el('canvas', { class: 'curves-canvas', width: 512, height: 512, 'aria-label': 'Curve editor: drag points, double-click to remove' });
    const h = CP.histogram(src);
    const tabs = el('div', { class: 'seg' }, [['rgb', 'RGB'], ['r', 'Red'], ['g', 'Green'], ['b', 'Blue']].map(([v, n]) => { const b = el('button', { type: 'button', class: v === ch ? 'on' : '' }, n); b.onclick = () => { ch = v; tabs.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); draw(); }; return b; }));
    const S = 512, toC = (p) => [p[0] / 255 * S, S - p[1] / 255 * S];
    function draw() {
      const g = cv.getContext('2d'); g.clearRect(0, 0, S, S);
      const hist = ch === 'rgb' ? h.l : h[ch]; let mx = 1; for (let i = 2; i < 254; i++) mx = Math.max(mx, hist[i]);
      g.fillStyle = 'rgba(150,170,190,0.25)'; for (let i = 0; i < 256; i++) { const v = Math.min(1, hist[i] / mx) * S; g.fillRect(i * 2, S - v, 2, v); }
      g.strokeStyle = 'rgba(150,170,190,0.25)'; g.lineWidth = 1; g.beginPath(); for (let i = 1; i < 4; i++) { g.moveTo(i * S / 4, 0); g.lineTo(i * S / 4, S); g.moveTo(0, i * S / 4); g.lineTo(S, i * S / 4); } g.moveTo(0, S); g.lineTo(S, 0); g.stroke();
      const lut = CP.curveLut(params[ch]); g.strokeStyle = { rgb: '#e8eef6', r: '#ff6b6b', g: '#5be37d', b: '#5aa2ff' }[ch]; g.lineWidth = 3; g.beginPath();
      for (let i = 0; i < 256; i++) { const y = S - lut[i] / 255 * S; i ? g.lineTo(i * 2, y) : g.moveTo(0, y); } g.stroke();
      g.fillStyle = '#fff'; params[ch].forEach((p) => { const [x, y] = toC(p); g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); });
    }
    let dragI = -1;
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [U.clamp((e.clientX - r.left) / r.width * 255, 0, 255), U.clamp(255 - (e.clientY - r.top) / r.height * 255, 0, 255)]; };
    cv.addEventListener('pointerdown', (e) => {
      const p = pos(e), pts = params[ch]; dragI = pts.findIndex((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 14);
      if (dragI < 0) { pts.push(p); pts.sort((a, b) => a[0] - b[0]); dragI = pts.indexOf(p); }
      cv.setPointerCapture(e.pointerId); draw(); preview();
    });
    cv.addEventListener('pointermove', (e) => { if (dragI < 0) return; const p = pos(e), pts = params[ch]; const lo = dragI > 0 ? pts[dragI - 1][0] + 1 : 0, hi = dragI < pts.length - 1 ? pts[dragI + 1][0] - 1 : 255; pts[dragI] = [U.clamp(p[0], lo, hi), p[1]]; draw(); preview(); });
    cv.addEventListener('pointerup', () => { dragI = -1; });
    cv.addEventListener('dblclick', (e) => { const p = pos(e), pts = params[ch]; const i = pts.findIndex((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 14); if (i > 0 && i < pts.length - 1) { pts.splice(i, 1); draw(); preview(); } });
    draw();
    return el('div', { class: 'curves-box' }, tabs, cv, el('p', { class: 'muted sm' }, 'Click to add a point, drag to shape, double-click a point to remove it.'));
  }

  /* ======================= init ======================= */
  CP.initEditor = () => {
    buildMenubar(); buildToolbar(); initStageInput();
    CP.selectTool('brush');
    document.addEventListener('keydown', onKey);
    $('#se-open').onclick = A.open; $('#se-new').onclick = A.newDoc;
    updateStatus(); renderDocbar();
    CP.on('doc', () => buildMenubar());
    CP.on('history', U.debounce(buildMenubar, 300));
  };
  CP.editorWorkspaceChanged = () => { buildToolbar(); buildPanels(); buildMenubar(); };
})(window.CP);
