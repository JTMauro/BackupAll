// Downloads manager: queue control, folders, rename/move, drag-to-reorder,
// filters, sorting, search and bulk actions.
import { h, clear, icon, iconBtn, api, btn, toast, errToast, fmtBytes, fmtDate, prompt, confirmBox, menuFrom, img, modal, viewSwitch } from '../lib/dom.js';

const STATE_LABEL = { queued: 'Queued', downloading: 'Downloading', paused: 'Paused', done: 'Completed', failed: 'Failed' };

export async function render(view, { app }) {
  let list = await api('downloads');
  const progress = {};
  let filter = localStorage.getItem('dl-filter') || 'all';
  let sort = localStorage.getItem('dl-sort') || 'queue';
  let groupByFolder = localStorage.getItem('dl-group') === '1';
  let search = '';
  const selected = new Set();

  const toolbar = h('div.dl-toolbar');
  const bulk = h('div.dl-bulk');
  const body = h('div.dl-list');
  const views = viewSwitch('downloads', body, { fallback: 'list' });
  view.append(h('div.page',
    h('div.page-top', h('div.page-head', h('h1', 'Downloads'), h('div.top-spacer'),
      btn('Pause all', () => api('pauseAllDownloads'), { iconName: 'pause' }),
      btn('Resume all', () => api('resumeAllDownloads'), { iconName: 'play' }),
      btn('Clear completed', () => api('clearFinishedDownloads'), { iconName: 'check', title: 'Remove finished items from the list (files stay on disk)' }),
      btn('Open folder', async () => api('openPath', (await api('getSettings')).downloadsDir), { iconName: 'folder' })),
    toolbar, bulk), body));

  const drawToolbar = () => clear(toolbar,
    h('div.seg', [['all', 'All'], ['active', 'Active'], ['done', 'Completed'], ['failed', 'Failed']].map(([id, label]) => {
      const n = list.filter((d) => matches(d, id)).length;
      return h(`button.seg-btn${filter === id ? '.active' : ''}`, { onclick: () => { filter = id; localStorage.setItem('dl-filter', id); draw(); } }, label, h('span.count', n));
    })),
    h('input.input.small', { type: 'search', placeholder: 'Search downloads', value: search, oninput: (e) => { search = e.target.value; drawList(); } }),
    h('select.input.small', { onchange: (e) => { sort = e.target.value; localStorage.setItem('dl-sort', sort); drawList(); } },
      [['queue', 'Queue order'], ['name', 'Name'], ['date', 'Newest first'], ['size', 'Largest first'], ['type', 'Movies / Episodes']].map(([v, l]) => h('option', { value: v, selected: sort === v }, l))),
    btn('Select all', () => { shown().forEach((d) => selected.add(d.id)); draw(); }, { iconName: 'check', cls: 'small', title: 'Select every download shown (with the current filter and search)' }),
    selected.size ? btn('Select none', () => { selected.clear(); draw(); }, { iconName: 'x', cls: 'small' }) : null,
    h('label.check-inline', h('input', { type: 'checkbox', checked: groupByFolder, onchange: (e) => { groupByFolder = e.target.checked; localStorage.setItem('dl-group', groupByFolder ? '1' : '0'); drawList(); } }), ' Group by folder'),
    h('div.top-spacer'), views);

  function matches(d, f) {
    if (f === 'active') return ['queued', 'downloading', 'paused'].includes(d.status);
    if (f === 'done') return d.status === 'done';
    if (f === 'failed') return d.status === 'failed';
    return true;
  }

  const drawBulk = () => {
    clear(bulk);
    if (!selected.size) return;
    bulk.append(h('span', `${selected.size} selected`),
      btn('Move to folder…', () => moveSelected(), { iconName: 'folder' }),
      btn('Pause', () => [...selected].forEach((id) => api('pauseDownload', id)), { iconName: 'pause' }),
      btn('Resume', () => [...selected].forEach((id) => api('resumeDownload', id)), { iconName: 'play' }),
      btn('Move to top', () => [...selected].reverse().forEach((id) => api('reorderDownload', id, 'top')), { iconName: 'up' }),
      btn('Remove', async () => { if (await confirmBox('Remove downloads', `Remove ${selected.size} item(s)? Unfinished parts are deleted; completed files stay on disk.`, 'Remove', true)) { for (const id of selected) await api('cancelDownload', id); selected.clear(); } }, { iconName: 'x' }),
      btn('Delete files', async () => { if (await confirmBox('Delete files', `Permanently delete ${selected.size} file(s) from disk?`, 'Delete', true)) { for (const id of selected) await api('deleteDownload', id); selected.clear(); } }, { iconName: 'trash', cls: 'danger' }),
      btn('Select none', () => { selected.clear(); draw(); }, { iconName: 'x' }));
  };

  async function moveSelected(ids = [...selected]) {
    const folders = await api('downloadFolders');
    const input = h('input.input', { placeholder: 'Folder name (e.g. Kids, Action/2024). Leave empty for the main folder.', list: 'dl-folders' });
    const dl = h('datalist', { id: 'dl-folders' }, folders.map((f) => h('option', { value: f })));
    modal('Move to folder', h('div', input, dl, folders.length ? h('div.chips', folders.map((f) => h('button.chip', { onclick: () => { input.value = f; } }, icon('folder', 14), f))) : null), {
      actions: [{ label: 'Cancel', onClick: () => {} }, { label: 'Move', primary: true, onClick: async () => {
        for (const id of ids) await api('moveDownload', id, input.value.trim()).catch(errToast);
        toast(`Moved ${ids.length} item(s)`, 'success');
      } }],
    });
  }

  function sorted(items) {
    const s = [...items];
    if (sort === 'name') s.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'date') s.sort((a, b) => (b.finishedAt || b.created) - (a.finishedAt || a.created));
    else if (sort === 'size') s.sort((a, b) => (b.total || b.received || 0) - (a.total || a.received || 0));
    else if (sort === 'type') s.sort((a, b) => (a.kind || '').localeCompare(b.kind || '') || a.title.localeCompare(b.title));
    return s;
  }

  // The downloads currently shown (filter + search), in display order.
  function shown() {
    let items = list.filter((d) => matches(d, filter));
    if (search) items = items.filter((d) => `${d.title} ${d.subfolder || ''}`.toLowerCase().includes(search.toLowerCase()));
    return sorted(items);
  }

  function drawList() {
    clear(body);
    const items = shown();
    if (!items.length) {
      body.append(h('div.empty.small', list.length ? 'No downloads match.' : 'No downloads yet. Use the download button on any movie, episode or season.'));
      return;
    }
    if (groupByFolder) {
      const groups = new Map();
      for (const d of items) { const f = d.subfolder || 'Main folder'; if (!groups.has(f)) groups.set(f, []); groups.get(f).push(d); }
      for (const [folder, ds] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        const size = ds.reduce((n, d) => n + (d.total || d.received || 0), 0);
        body.append(h('div.dl-group', icon('folder', 16), h('b', folder), h('span.muted', `${ds.length} item(s) · ${fmtBytes(size)}`),
          h('div.top-spacer'),
          iconBtn('edit', async () => { const name = await prompt('Rename folder', 'New folder name', folder === 'Main folder' ? '' : folder); if (name != null) for (const d of ds) await api('moveDownload', d.id, name.trim()).catch(errToast); }, 'Rename folder (moves its items)'),
          iconBtn('check', () => { ds.forEach((d) => selected.add(d.id)); draw(); }, 'Select all in folder')));
        ds.forEach((d) => body.append(row(d)));
      }
    } else {
      items.forEach((d) => body.append(row(d)));
    }
  }

  function row(d) {
    const p = progress[d.id] || {};
    const received = p.received ?? d.received ?? 0;
    const total = p.total || d.total || 0;
    const pct = total ? Math.min(100, (received / total) * 100) : 0;
    const draggable = sort === 'queue' && !groupByFolder && d.status !== 'done';
    const el = h(`div.dl-row.${d.status}${selected.has(d.id) ? '.sel' : ''}`, { 'data-id': d.id, draggable },
      h('input.dl-check', { type: 'checkbox', checked: selected.has(d.id), onchange: (e) => { if (e.target.checked) selected.add(d.id); else selected.delete(d.id); el.classList.toggle('sel', e.target.checked); drawBulk(); drawToolbar(); } }),
      draggable ? h('span.drag-handle', { title: 'Drag to reorder' }, '⋮⋮') : h('span.drag-space'),
      img(d.logo, 'dl-thumb', d.title),
      h('div.dl-info',
        h('div.dl-title', d.title),
        h('div.muted', [STATE_LABEL[d.status] || d.status, d.subfolder ? `📁 ${d.subfolder}` : null, total ? `${fmtBytes(received)} / ${fmtBytes(total)}` : received ? fmtBytes(received) : null, d.status === 'downloading' && p.speed ? `${fmtBytes(p.speed)}/s` : null, d.status === 'downloading' && p.speed && total ? `${Math.ceil((total - received) / p.speed / 60)} min left` : null, d.finishedAt ? fmtDate(d.finishedAt) : null].filter(Boolean).join(' · ')),
        ['downloading', 'paused', 'queued'].includes(d.status) ? h('div.progress', h('i', { style: { width: `${pct}%` } })) : null,
        d.error ? h('div.error-text', d.error) : null,
        d.status === 'queued' && d.waiting ? h('div.muted', `⏳ ${d.waiting}`) : null,
        d.status === 'done' ? optLine(d) : null),
      h('div.dl-actions',
        d.status === 'done' ? iconBtn('play', () => playDownload(d), 'Play') : null,
        d.status === 'downloading' && d.file && (window.api.capabilities || {}).desktop !== false ? iconBtn('play', () => { toast('Playing while it downloads — if you catch up with the download it waits a moment.', 'info', 4000); app.playFile(d.file, d.title); }, 'Play while it downloads') : null,
        d.status === 'downloading' || d.status === 'queued' ? iconBtn('pause', () => api('pauseDownload', d.id), 'Pause') : null,
        d.status === 'paused' ? iconBtn('play', () => api('resumeDownload', d.id), 'Resume') : null,
        d.status === 'failed' ? iconBtn('refresh', () => api('retryDownload', d.id), 'Retry') : null,
        iconBtn('more', (e) => menuFrom(e.currentTarget, [
          d.status === 'done' ? { label: 'Play in pop-out window', icon: 'popout', onClick: () => api('popout', { file: d.file, title: d.title }) } : null,
          d.status === 'done' ? { label: 'Show in folder', icon: 'folder', onClick: () => api('showInFolder', d.file) } : null,
          d.status === 'done' && (window.api.capabilities || {}).desktop !== false ? { label: 'Prepare again for smooth playback', icon: 'refresh', onClick: () => api('optimizeDownload', d.id).then(() => toast('Preparing for smooth playback…', 'info')) } : null,
          { label: 'Rename…', icon: 'edit', onClick: async () => { const t = await prompt('Rename', 'New name', d.title); if (t && t.trim()) api('renameDownload', d.id, t.trim()).catch(errToast); } },
          { label: 'Move to folder…', icon: 'folder', onClick: () => moveSelected([d.id]) },
          d.status !== 'done' ? '-' : null,
          d.status !== 'done' ? { label: 'Move to top of queue', icon: 'up', onClick: () => api('reorderDownload', d.id, 'top') } : null,
          d.status !== 'done' ? { label: 'Move up', icon: 'up', onClick: () => api('reorderDownload', d.id, 'up') } : null,
          d.status !== 'done' ? { label: 'Move down', icon: 'down', onClick: () => api('reorderDownload', d.id, 'down') } : null,
          d.status !== 'done' ? { label: 'Move to bottom', icon: 'down', onClick: () => api('reorderDownload', d.id, 'bottom') } : null,
          '-',
          { label: d.status === 'done' ? 'Remove from list (keep file)' : 'Cancel & remove', icon: 'x', onClick: () => api('cancelDownload', d.id) },
          d.status === 'done' ? { label: 'Delete file', icon: 'trash', onClick: async () => { if (await confirmBox('Delete file', `Delete "${d.title}" from disk?`, 'Delete', true)) api('deleteDownload', d.id); } } : null,
        ]), 'More')));
    if (draggable) {
      el.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', d.id); el.classList.add('dragging'); });
      el.addEventListener('dragend', () => el.classList.remove('dragging'));
      el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drop-target'); });
      el.addEventListener('dragleave', () => el.classList.remove('drop-target'));
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.classList.remove('drop-target');
        const from = e.dataTransfer.getData('text/plain');
        if (from && from !== d.id) api('reorderDownload', from, list.findIndex((x) => x.id === d.id));
      });
    }
    return el;
  }

  const draw = () => { drawToolbar(); drawBulk(); drawList(); };
  // Smooth-playback copies (desktop): status per download, updated live.
  let opt = {};
  const OPT_TEXT = { queued: '⏳ Waiting to prepare for smooth playback', working: '⚙ Preparing for smooth playback', ready: '✓ Ready for smooth playback', 'not-needed': '✓ Plays as is', failed: '⚠ Couldn’t prepare (plays as is)' };
  function optLine(d) {
    const o = opt[d.id];
    if (!o) return null;
    return h(`div.dl-opt.${o.status}`, OPT_TEXT[o.status] || '', o.status === 'working' && o.pct ? ` ${o.pct}%` : '', o.status === 'working' ? h('div.progress.thin', h('i', { style: { width: `${o.pct || 0}%` } })) : null);
  }
  async function playDownload(d) {
    try {
      const r = await api('playDownload', d.id);
      if (r.preparing) toast('Still preparing this one for smooth playback — playing the original for now.', 'info', 4000);
      app.playFile(r.file, d.title, { subtitles: r.subtitles });
    } catch (e) { errToast(e); }
  }
  api('optimizeInfo').then((o) => { opt = o || {}; draw(); }).catch(() => {});
  const off3 = window.api.on('download:optimize', (x) => { opt[x.id] = x; const el = body.querySelector(`.dl-row[data-id="${CSS.escape(x.id)}"] .dl-opt`); if (el && x.status === 'working') { el.firstChild.textContent = OPT_TEXT.working; } draw(); });

  draw();
  const off1 = window.api.on('downloads', (l) => { list = l; for (const id of [...selected]) if (!l.some((d) => d.id === id)) selected.delete(id); draw(); });
  const off2 = window.api.on('download:progress', (p) => {
    progress[p.id] = p;
    const el = body.querySelector(`.dl-row[data-id="${CSS.escape(p.id)}"]`);
    const d = list.find((x) => x.id === p.id);
    if (el && d) el.replaceWith(row(d));
  });
  return () => { off1(); off2(); off3(); };
}
