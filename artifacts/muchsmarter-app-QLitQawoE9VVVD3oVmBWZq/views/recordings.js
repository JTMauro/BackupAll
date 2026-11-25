// Recordings: in progress, scheduled (future TV), completed library, and series rules.
import { h, clear, icon, iconBtn, api, btn, modal, toast, errToast, fmtTime, fmtDate, fmtBytes, fmtDur, confirmBox, prompt, menuFrom, viewSwitch } from '../lib/dom.js';

const STATUS = { recording: 'Recording', scheduled: 'Scheduled', done: 'Completed', partial: 'Partial', failed: 'Failed', missed: 'Missed', cancelled: 'Cancelled' };

export async function render(view, { app }) {
  let tab = localStorage.getItem('rec-tab') || 'library';
  let list = await api('recordings');
  let rules = await api('recordingRules');
  const tabs = h('div.tabs');
  const body = h('div.rec-body');
  const views = viewSwitch('recordings', body, { fallback: 'list' });
  const selected = new Set();
  const bulk = h('div.dl-bulk');
  let shownIds = [];
  view.append(h('div.page',
    h('div.page-top', h('div.page-head', h('h1', 'Recordings'), h('div.top-spacer'),
      btn('Manual recording', () => manualDialog(app), { iconName: 'plus', cls: 'primary' }),
      btn('Open folder', async () => api('openPath', (await api('getSettings')).recordingsDir), { iconName: 'folder' })),
    h('div.rec-tabs-row', tabs, views), bulk), body));

  const draw = () => {
    const counts = {
      library: list.filter((r) => ['done', 'partial'].includes(r.status)).length,
      active: list.filter((r) => r.status === 'recording').length,
      scheduled: list.filter((r) => r.status === 'scheduled').length,
      rules: rules.length,
      issues: list.filter((r) => ['failed', 'missed'].includes(r.status)).length,
    };
    clear(tabs, [['library', 'Library'], ['active', 'Recording now'], ['scheduled', 'Scheduled'], ['rules', 'Series rules'], ['issues', 'Failed']].map(([id, label]) =>
      h(`button.tab${tab === id ? '.active' : ''}`, { onclick: () => { tab = id; localStorage.setItem('rec-tab', id); draw(); } }, label, counts[id] ? h('span.count', counts[id]) : null)));
    clear(body);
    drawBulk();
    if (tab === 'rules') return drawRules();
    const filt = { library: ['done', 'partial'], active: ['recording'], scheduled: ['scheduled'], issues: ['failed', 'missed', 'cancelled'] }[tab];
    let items = list.filter((r) => filt.includes(r.status));
    items.sort((a, b) => (tab === 'scheduled' ? a.start - b.start : (b.startedAt || b.start) - (a.startedAt || a.start)));
    if (!items.length) {
      body.append(h('div.empty.small', tab === 'scheduled' ? 'Nothing scheduled. Pick a programme in the TV Guide or Live TV to record it.' : 'Nothing here yet.'));
      return;
    }
    shownIds = items.map((r) => r.id);
    body.append(h('div.rec-select-row', btn('Select all', () => { shownIds.forEach((id) => selected.add(id)); draw(); }, { iconName: 'check', cls: 'small', title: 'Select every recording shown' }),
      selected.size ? btn('Select none', () => { selected.clear(); draw(); }, { iconName: 'x', cls: 'small' }) : null));
    for (const r of items) body.append(row(r));
  };

  // Actions for the ticked recordings.
  const drawBulk = () => {
    for (const id of [...selected]) if (!list.some((r) => r.id === id)) selected.delete(id);
    clear(bulk);
    if (!selected.size || tab === 'rules') return;
    const sel = list.filter((r) => selected.has(r.id));
    bulk.append(h('span', `${selected.size} selected`),
      sel.some((r) => ['recording', 'scheduled'].includes(r.status)) ? btn('Stop / cancel', () => { sel.filter((r) => ['recording', 'scheduled'].includes(r.status)).forEach((r) => api('cancelRecording', r.id)); }, { iconName: 'stop' }) : null,
      btn('Remove from list', async () => { if (await confirmBox('Remove recordings', `Remove ${sel.length} recording(s) from the list? The video files stay on disk.`, 'Remove', true)) { for (const r of sel) await api('removeRecording', r.id, false); selected.clear(); } }, { iconName: 'x' }),
      sel.some((r) => (r.files || []).length) ? btn('Delete files', async () => { if (await confirmBox('Delete recordings', `Permanently delete ${sel.length} recording(s) and their files from disk?`, 'Delete', true)) { for (const r of sel) await api('removeRecording', r.id, true); selected.clear(); } }, { iconName: 'trash', cls: 'danger' }) : null,
      btn('Select none', () => { selected.clear(); draw(); }, { iconName: 'x' }));
  };

  const row = (r) => h(`div.rec-row.${r.status}${selected.has(r.id) ? '.sel' : ''}`,
    h('input.dl-check', { type: 'checkbox', checked: selected.has(r.id), title: 'Select', onchange: (e) => { if (e.target.checked) selected.add(r.id); else selected.delete(r.id); draw(); } }),
    h('div.rec-icon', icon(r.status === 'recording' ? 'rec' : r.status === 'scheduled' ? 'clock' : 'film', 22)),
    h('div.rec-info',
      h('div.rec-title', r.title, r.repeat && r.repeat !== 'none' ? h('span.badge', r.repeat) : null, r.ruleId ? h('span.badge', 'series') : null),
      h('div.muted', `${r.channelName} · ${fmtDate(r.start)} ${fmtTime(r.start)} – ${fmtTime(r.end)}`),
      r.status === 'recording' ? h('div.rec-live', h('span.rec-dot'), ` ${fmtBytes(r.bytes || 0)}${r.outTime ? ' · ' + fmtDur(r.outTime) : ''}`, h('div.progress.thin', h('i', { style: { width: `${Math.min(100, ((Date.now() - r.start) / (r.end - r.start)) * 100)}%` } }))) : null,
      r.size ? h('div.muted', fmtBytes(r.size)) : null,
      r.error ? h('div.error-text', r.error) : r.lastError && r.status !== 'done' ? h('div.muted', `Reconnected after: ${r.lastError}`) : null),
    h('div.rec-actions',
      (r.files || []).length && r.status !== 'scheduled' ? iconBtn('play', () => app.playFile(r.files[0], r.title), 'Play') : null,
      r.status === 'recording' ? iconBtn('stop', () => api('cancelRecording', r.id), 'Stop recording') : null,
      ['recording', 'scheduled'].includes(r.status) ? btn('Extend', (e) => menuFrom(e.currentTarget, extendItems(r)), { iconName: 'plus', cls: 'small', title: 'Record longer: 30-minute steps, up to 4 hours' }) : null,
      iconBtn('more', (e) => menuFrom(e.currentTarget, [
        (r.files || []).length ? { label: 'Play in pop-out window', icon: 'popout', onClick: () => api('popout', { file: r.files[0], title: r.title }) } : null,
        (r.files || []).length ? { label: 'Show in folder', icon: 'folder', onClick: () => api('showInFolder', r.files[0]) } : null,
        (r.files || []).length && r.status !== 'recording' ? { label: 'Rename', icon: 'edit', onClick: async () => { const t = await prompt('Rename recording', 'Title', r.title); if (t) api('renameRecording', r.id, t).catch(errToast); } } : null,
        r.status === 'scheduled' ? { label: 'Cancel', icon: 'x', onClick: () => api('cancelRecording', r.id) } : null,
        { label: 'Remove from list', icon: 'x', onClick: () => api('removeRecording', r.id, false) },
        (r.files || []).length ? { label: 'Delete file', icon: 'trash', onClick: async () => { if (await confirmBox('Delete recording', `Delete "${r.title}" from disk?`, 'Delete', true)) api('removeRecording', r.id, true); } } : null,
      ]), 'More')));

  const drawRules = () => {
    body.append(h('div.rule-add', btn('Add series rule', () => ruleDialog(app), { iconName: 'plus' })));
    if (!rules.length) body.append(h('div.empty.small', 'Series rules automatically record every airing that matches a title (e.g. "The Simpsons") as the guide updates.'));
    for (const r of rules) body.append(h('div.rec-row', h('div.rec-icon', icon('series', 22)), h('div.rec-info', h('div.rec-title', r.title), h('div.muted', `${r.channelName || 'Any channel'}${r.newOnly ? ' · new episodes only' : ''}${r.exact ? ' · exact title' : ''}`)),
      h('div.rec-actions', iconBtn('trash', () => api('removeRecordingRule', r.id).then(async () => { rules = await api('recordingRules'); draw(); }), 'Delete rule'))));
  };

  draw();
  const off1 = window.api.on('recordings', (l) => { list = l; draw(); });
  const off2 = window.api.on('recording:progress', (p) => { const r = list.find((x) => x.id === p.id); if (r) { Object.assign(r, p); if (tab === 'active') draw(); } });
  const refreshRules = async () => { rules = await api('recordingRules'); draw(); };
  document.addEventListener('rules-changed', refreshRules);
  return () => { off1(); off2(); document.removeEventListener('rules-changed', refreshRules); };
}

// Schedule a specific programme (or a manual time window) for a channel.
export function recordProgramDialog(app, channel, prog) {
  const start = prog ? prog.start : Date.now();
  const end = prog ? prog.stop : Date.now() + 3600000;
  const toLocal = (ms) => { const d = new Date(ms - new Date().getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };
  const title = h('input.input', { value: prog ? prog.title : channel.name });
  const s = h('input.input', { type: 'datetime-local', value: toLocal(start) });
  const e = h('input.input', { type: 'datetime-local', value: toLocal(end) });
  const pre = h('input.input', { type: 'number', min: 0, max: 60, value: app.settings.recordPaddingBefore });
  const post = h('input.input', { type: 'number', min: 0, max: 180, value: app.settings.recordPaddingAfter });
  const repeat = h('select.input', ['none', 'daily', 'weekdays', 'weekly'].map((r) => h('option', { value: r }, { none: 'Once', daily: 'Every day', weekdays: 'Weekdays', weekly: 'Every week' }[r])));
  modal(`Record on ${channel.name}`, h('div.form-grid',
    h('label.field.wide', h('span', 'Title'), title),
    h('label.field', h('span', 'Start'), s),
    h('label.field', h('span', 'End'), e),
    h('label.field', h('span', 'Start early (min)'), pre),
    h('label.field', h('span', 'End late (min)'), post),
    h('label.field', h('span', 'Repeat'), repeat)), {
    actions: [
      { label: 'Cancel', onClick: () => {} },
      prog ? { label: 'Record all episodes', onClick: () => api('addRecordingRule', { pl: app.pl, itemId: channel.id, channelName: channel.name, title: prog.title }).then(() => toast(`Series rule added for "${prog.title}"`, 'success')).catch(errToast) } : null,
      {
        label: 'Schedule', primary: true, onClick: async () => {
          const st = new Date(s.value).getTime();
          const en = new Date(e.value).getTime();
          if (!(en > st)) { toast('End must be after start', 'error'); return false; }
          try {
            await api('scheduleRecording', { pl: app.pl, itemId: channel.id, title: title.value, desc: prog && prog.desc, start: st, end: en, preMin: Number(pre.value), postMin: Number(post.value), repeat: repeat.value });
            toast(`Scheduled: ${title.value}`, 'success');
          } catch (err) { errToast(err); return false; }
        },
      },
    ].filter(Boolean),
  });
}

// Manual recording: pick a channel by name, then a time window.
async function manualDialog(app) {
  if (!app.pl) return;
  const q = h('input.input', { placeholder: 'Type a channel name…' });
  const results = h('div.pick-list');
  const m = modal('Manual recording', h('div', q, results), { wide: true });
  q.addEventListener('input', async () => {
    const r = await api('list', app.pl, { type: 'live', search: q.value, limit: 30 });
    clear(results, r.items.map((c) => h('button.pick', { onclick: () => { m.close(); recordProgramDialog(app, c); } }, c.name)));
  });
}

function ruleDialog(app) {
  const title = h('input.input', { placeholder: 'Programme title, e.g. "Jeopardy"' });
  const exact = h('input', { type: 'checkbox' });
  const newOnly = h('input', { type: 'checkbox' });
  modal('New series rule', h('div.form-grid',
    h('label.field.wide', h('span', 'Title contains'), title),
    h('label.field.check', exact, h('span', 'Exact title match')),
    h('label.field.check', newOnly, h('span', 'New episodes only (skip reruns)')),
    h('p.muted.wide', 'Matches are searched across all channels in the current playlist. To limit to one channel, use "Record series" from the guide.')), {
    actions: [{ label: 'Cancel', onClick: () => {} }, { label: 'Add rule', primary: true, onClick: async () => {
      if (!title.value.trim()) return false;
      await api('addRecordingRule', { pl: app.pl, title: title.value.trim(), exact: exact.checked, newOnly: newOnly.checked });
      toast('Rule added', 'success');
      document.dispatchEvent(new CustomEvent('rules-changed'));
    } }],
  });
}

// "Extend" choices: 30-minute steps up to 4 hours in total.
const durLabel = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr${m % 60 ? ' 30 min' : ''}`);
export function extendItems(r) {
  const used = r.extendedMin || 0;
  const room = 240 - used;
  const steps = [];
  for (let m = 30; m <= 240; m += 30) steps.push(m);
  return [
    { label: used ? `Extended by ${durLabel(used)} so far (max 4 hr)` : `Ends ${fmtTime(r.end)} — record longer:`, disabled: true },
    ...steps.map((m) => ({ label: `+ ${durLabel(m)}  (until ${fmtTime(r.end + m * 60000)})`, disabled: m > room,
      onClick: () => api('extendRecording', r.id, m).then(() => toast(`"${r.title}" now records until ${fmtTime(r.end + m * 60000)}`, 'success')).catch(errToast) })),
  ];
}
