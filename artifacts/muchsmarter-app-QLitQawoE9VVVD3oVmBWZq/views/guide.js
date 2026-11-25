// TV Guide grid: channels × time. Past programmes open catch-up, future ones
// can be recorded once or as a series rule.
import { h, clear, icon, api, img, btn, modal, toast, errToast, fmtTime, fmtDate } from '../lib/dom.js';
import { recordProgramDialog } from './recordings.js';
import { channelFilter, hideAdultCats } from '../lib/filterui.js';

const PX_PER_MIN = 6;
const ROW_H = 58;

export async function render(view, { app }) {
  if (!app.pl) { view.append(h('div.empty', h('h2', 'No playlist selected'))); return; }
  const summary = app.summary || (await app.loadPlaylist(app.pl));
  const epgInfo = await api('epgInfo', app.pl);
  const cats = [{ id: '__fav', name: '★ Favorites' }, { id: '__all', name: 'All channels' }, ...summary.categories.live];
  let catId = localStorage.getItem(`guide-cat-${app.pl}`) || '__all';
  let dayOffset = 0;
  const cf = channelFilter({ app, cats, catLabel: () => (cats.find((c) => c.id === catId) || {}).name || 'this list', onChange: () => load() });

  const catSel = h('select.input.small', { onchange: () => { catId = catSel.value; localStorage.setItem(`guide-cat-${app.pl}`, catId); load(); } }, hideAdultCats(app, cats).map((c) => h('option', { value: c.id, selected: c.id === catId }, c.name)));
  const dayLabel = h('span.day-label');
  const grid = h('div.guide-grid');
  const status = h('span.muted', epgInfo ? `Guide updated ${new Date(epgInfo.updated).toLocaleString()}` : 'No guide data yet');
  view.append(h('div.guide',
    h('div.pane-head',
      catSel,
      cf.button,
      btn('', () => { dayOffset--; load(); }, { iconName: 'prev', title: 'Previous day' }),
      dayLabel,
      btn('', () => { dayOffset++; load(); }, { iconName: 'next', title: 'Next day' }),
      btn('Now', () => { dayOffset = 0; load(); }, { iconName: 'clock' }),
      h('div.top-spacer'),
      status,
      btn('Update guide', async () => { status.textContent = 'Updating guide…'; try { const r = await api('refreshEpg', app.pl); status.textContent = r ? `Guide updated · ${r.sources.map((s) => s.programmes).reduce((a, b) => a + b, 0).toLocaleString()} programmes` : 'No EPG source — add one in Playlists'; load(); } catch (e) { errToast(e); } }, { iconName: 'refresh' })),
    cf.chips,
    grid));

  async function load() {
    clear(grid, h('div.spinner'));
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    const dayStart = base.getTime() + dayOffset * 86400000;
    const from = dayOffset === 0 ? Math.floor((Date.now() - 2 * 3600000) / 1800000) * 1800000 : dayStart;
    const to = dayStart + 86400000 + 3 * 3600000;
    dayLabel.textContent = fmtDate(dayStart);
    let channels;
    if (catId === '__fav') {
      const favs = (await api('favorites', 'live')).filter((f) => f.pl === app.pl);
      channels = (await api('list', app.pl, { type: 'live', ids: favs.map((f) => f.item.id), limit: 2000 })).items;
    } else {
      channels = (await api('list', app.pl, { type: 'live', categoryId: catId === '__all' ? undefined : catId, limit: 3000 })).items;
    }
    channels = await cf.apply(channels.filter((c) => !app.isLocked(c.categoryId)));
    const width = ((to - from) / 60000) * PX_PER_MIN;
    const times = h('div.g-times', { style: { width: `${width}px` } });
    for (let t = from; t < to; t += 1800000) times.append(h('div.g-time', { style: { left: `${((t - from) / 60000) * PX_PER_MIN}px` } }, fmtTime(t)));
    const nowLine = h('div.g-now', { style: { left: `${((Date.now() - from) / 60000) * PX_PER_MIN}px` } });
    const chanCol = h('div.g-chans');
    const body = h('div.g-body', { style: { width: `${width}px`, height: `${channels.length * ROW_H}px` } }, Date.now() > from && Date.now() < to ? nowLine : null);
    const scroller = h('div.g-scroll', h('div.g-corner'), h('div.g-head', times), chanCol, body);
    clear(grid, scroller);
    if (!channels.length) { grid.append(h('div.empty.small', cf.activeCount() ? 'No channels match these filters.' : 'No channels in this category')); return; }

    channels.forEach((c, i) => chanCol.append(h('button.g-chan', { style: { top: `${i * ROW_H}px` }, onclick: () => app.navigate('live', { play: c }), title: c.name }, h('span.chan-num', c.num || i + 1), img(c.logo, 'chan-logo', c.name), h('span.g-chan-name', c.name))));
    chanCol.style.height = `${channels.length * ROW_H}px`;

    // Fetch programmes for rows as they scroll into view.
    const loaded = new Set();
    const fill = async () => {
      const top = scroller.scrollTop;
      const first = Math.max(0, Math.floor(top / ROW_H) - 5);
      const last = Math.min(channels.length, first + Math.ceil(scroller.clientHeight / ROW_H) + 15);
      const need = channels.slice(first, last).filter((c) => !loaded.has(c.id));
      if (!need.length) return;
      need.forEach((c) => loaded.add(c.id));
      const map = await api('epgFor', app.pl, need.map((c) => c.id), from, to);
      for (const c of need) {
        const i = channels.indexOf(c);
        const progs = map[c.id] || [];
        if (!progs.length) body.append(h('div.g-prog.empty', { style: { top: `${i * ROW_H}px`, left: '0px', width: `${Math.min(width, 1200)}px` } }, 'No information'));
        for (const p of progs) {
          const left = Math.max(0, ((p.start - from) / 60000) * PX_PER_MIN);
          const right = Math.min(width, ((p.stop - from) / 60000) * PX_PER_MIN);
          if (right <= left) continue;
          const now = Date.now();
          const cls = p.stop < now ? '.past' : p.start <= now ? '.live' : '';
          body.append(h(`button.g-prog${cls}`, { style: { top: `${i * ROW_H}px`, left: `${left}px`, width: `${right - left - 2}px` }, title: `${p.title}\n${fmtTime(p.start)}–${fmtTime(p.stop)}`, onclick: () => progDialog(app, c, p) },
            h('div.g-prog-title', p.title), h('div.g-prog-time', `${fmtTime(p.start)} – ${fmtTime(p.stop)}`)));
        }
      }
    };
    scroller.addEventListener('scroll', () => { clearTimeout(scroller.t); scroller.t = setTimeout(fill, 120); });
    await fill();
    if (dayOffset === 0) scroller.scrollLeft = Math.max(0, ((Date.now() - from) / 60000) * PX_PER_MIN - 200);
  }

  const onEpg = () => load();
  document.addEventListener('epg-ready', onEpg);
  await load();
  return () => document.removeEventListener('epg-ready', onEpg);
}

export function progDialog(app, c, p) {
  const now = Date.now();
  const past = p.stop < now;
  const live = p.start <= now && p.stop > now;
  const canCatchup = past && c.catchup && now - p.start < c.catchup.days * 86400000;
  const m = modal(p.title, h('div.prog-dialog',
    h('div.prog-dialog-head', img(p.icon || c.logo, 'prog-img', c.name), h('div',
      h('div.muted', `${c.name} · ${fmtDate(p.start)} ${fmtTime(p.start)} – ${fmtTime(p.stop)}`),
      p.ep ? h('div', p.ep) : null,
      p.cat ? h('div.badge', p.cat) : null,
      p.rating ? h('div.badge', p.rating) : null)),
    p.sub ? h('h3', p.sub) : null,
    p.desc ? h('p', p.desc) : h('p.muted', 'No description.'),
    h('div.details-actions',
      live ? btn('Watch live', () => { m.close(); app.navigate('live', { play: c }); }, { iconName: 'play', cls: 'primary' }) : null,
      canCatchup ? btn('Watch from archive', () => { m.close(); app.play(app.pl, c, { catchup: p }); }, { iconName: 'play', cls: 'primary' }) : null,
      canCatchup ? btn('Save from archive', () => api('recordCatchup', { pl: app.pl, itemId: c.id, title: p.title, start: p.start, end: p.stop }).then(() => toast('Saving programme from archive', 'success')).catch(errToast), { iconName: 'download' }) : null,
      live ? btn('Record now', () => api('recordNow', app.pl, c.id).then(() => { toast('Recording', 'success'); m.close(); }).catch(errToast), { iconName: 'rec' }) : null,
      !past ? btn('Record…', () => { m.close(); recordProgramDialog(app, c, p); }, { iconName: 'rec' }) : null,
      !past ? btn('Record series', () => api('addRecordingRule', { pl: app.pl, itemId: c.id, title: p.title, newOnly: false }).then(() => { toast(`Recording every "${p.title}" on ${c.name}`, 'success'); m.close(); }).catch(errToast), { iconName: 'series' }) : null)), { wide: true });
}

export { icon };
