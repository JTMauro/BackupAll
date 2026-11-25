// Favorites and Recently Viewed. Every entry can be removed on its own; lists can
// be filtered by type, searched, cleared, and favorites can be grouped/reordered.
import { h, clear, icon, iconBtn, api, btn, img, toast, prompt, confirmBox, menuFrom, fmtDate, fmtTime, viewSwitch, favButton } from '../lib/dom.js';

const TYPES = [['all', 'All'], ['live', 'Channels'], ['movie', 'Movies'], ['series', 'Series']];

export async function render(view, { app, route }) {
  const isFav = route === 'favorites';
  let type = localStorage.getItem(`${route}-type`) || 'all';
  let search = '';
  let groupFilter = '';
  const head = h('div.page-head');
  const toolbar = h('div.dl-toolbar');
  const body = h('div.lib-list');
  const views = viewSwitch(route, body, { fallback: 'list' });
  const selected = new Set(); // keys "pl|itemId"
  const bulk = h('div.dl-bulk');
  view.append(h('div.page', h('div.page-top', head, toolbar, bulk), body));

  const load = () => api(isFav ? 'favorites' : 'history');

  async function draw() {
    let entries = await load();
    const favSet = isFav ? null : new Set((await api('favorites')).map((f) => `${f.pl}|${f.item.id}`));
    const playlists = new Map(app.playlists.map((p) => [p.id, p.name]));
    const groups = isFav ? [...new Set(entries.map((e) => e.group).filter(Boolean))].sort() : [];
    clear(head, h('h1', isFav ? 'Favorites' : 'Recently Viewed'), h('div.top-spacer'),
      entries.length ? btn(type === 'all' ? 'Clear all' : `Clear ${TYPES.find((t) => t[0] === type)[1].toLowerCase()}`, async () => {
        if (await confirmBox(isFav ? 'Clear favorites' : 'Clear history', `Remove ${type === 'all' ? 'everything' : 'all ' + TYPES.find((t) => t[0] === type)[1].toLowerCase()} from ${isFav ? 'favorites' : 'recently viewed'}?`, 'Clear', true)) {
          await api(isFav ? 'clearFavorites' : 'clearHistory', type === 'all' ? undefined : type);
          draw();
        }
      }, { iconName: 'trash', cls: 'danger' }) : null);
    const matchType = (e) => type === 'all' || e.item.type === type || (type === 'series' && (e.item.type === 'episode' || e.item.type === 'series'));
    clear(toolbar,
      h('div.seg', TYPES.map(([id, label]) => h(`button.seg-btn${type === id ? '.active' : ''}`, { onclick: () => { type = id; localStorage.setItem(`${route}-type`, id); draw(); } }, label, h('span.count', entries.filter((e) => id === 'all' || e.item.type === id || (id === 'series' && e.item.type === 'episode')).length)))),
      h('input.input.small', { type: 'search', placeholder: 'Search', value: search, oninput: (e) => { search = e.target.value; drawItems(); } }),
      groups.length ? h('select.input.small', { onchange: (e) => { groupFilter = e.target.value; drawItems(); } }, h('option', { value: '' }, 'All groups'), groups.map((g) => h('option', { value: g, selected: g === groupFilter }, g))) : null,
      h('div.top-spacer'), views);

    const keyOf = (e) => `${e.pl}|${e.item.id}`;
    const shownList = () => {
      let list = entries.filter(matchType);
      if (search) list = list.filter((e) => e.item.name.toLowerCase().includes(search.toLowerCase()) || (e.item.seriesName || '').toLowerCase().includes(search.toLowerCase()));
      if (groupFilter) list = list.filter((e) => e.group === groupFilter);
      return list;
    };
    // Actions for the ticked items, plus Select all / Select none.
    function drawBulk() {
      for (const k of [...selected]) if (!entries.some((e) => keyOf(e) === k)) selected.delete(k);
      bulk.classList.toggle('quiet', !selected.size);
      clear(bulk,
        btn('Select all', () => { shownList().forEach((e) => selected.add(keyOf(e))); drawItems(); }, { iconName: 'check', cls: 'small', title: 'Select everything shown (with the current type, search and group)' }),
        selected.size ? [
          h('span', `${selected.size} selected`),
          btn(isFav ? 'Remove from favorites' : 'Remove from recently viewed', async () => {
            const sel = entries.filter((e) => selected.has(keyOf(e)));
            if (!(await confirmBox('Remove selected', `Remove ${sel.length} item(s) from ${isFav ? 'favorites' : 'recently viewed'}?`, 'Remove', true))) return;
            for (const e of sel) await api(isFav ? 'removeFavorite' : 'removeHistory', e.pl, e.item.id);
            selected.clear();
            toast(`Removed ${sel.length} item(s)`);
            draw();
          }, { iconName: 'trash', cls: 'danger small' }),
          isFav ? btn('Move to group…', async () => { const g = await prompt('Favorite group', 'Group name (empty for none)', ''); if (g == null) return; for (const e of entries.filter((x) => selected.has(keyOf(x)))) await api('setFavoriteGroup', e.pl, e.item.id, g.trim()); draw(); }, { iconName: 'folder', cls: 'small' }) : null,
          btn('Select none', () => { selected.clear(); drawItems(); }, { iconName: 'x', cls: 'small' }),
        ] : null);
    }

    function drawItems() {
      const list = shownList();
      drawBulk();
      clear(body);
      if (!list.length) {
        body.append(h('div.empty.small', isFav ? 'No favorites yet. Use the ★ button on any channel, movie or series.' : 'Nothing watched yet.'));
        return;
      }
      for (const e of list) body.append(row(e));
    }

    function row(e) {
      const it = e.item;
      const title = it.type === 'episode' ? `${it.seriesName} · S${it.season}E${it.episode} · ${it.name}` : it.name;
      const typeLabel = { live: 'Channel', movie: 'Movie', series: 'Series', episode: 'Episode' }[it.type] || it.type;
      const open = () => {
        if (e.pl !== app.pl) app.loadPlaylist(e.pl).catch(() => {});
        if (it.type === 'series') app.navigate('series', { details: it });
        else if (it.type === 'live') app.navigate('live', { play: it });
        else app.play(e.pl, it);
      };
      return h(`div.lib-row${selected.has(keyOf(e)) ? '.sel' : ''}`,
        h('input.dl-check', { type: 'checkbox', checked: selected.has(keyOf(e)), title: 'Select', onchange: (ev) => { if (ev.target.checked) selected.add(keyOf(e)); else selected.delete(keyOf(e)); drawItems(); } }),
        h('button.lib-thumb', { onclick: open, title: 'Play' }, img(it.logo, '', it.name), h('span.ep-play', icon('play', 22))),
        h('div.lib-info',
          h('div.lib-title', title),
          h('div.muted', [typeLabel, playlists.size > 1 ? playlists.get(e.pl) : null, isFav ? (e.group ? `📁 ${e.group}` : null) : `${fmtDate(e.viewed)} ${fmtTime(e.viewed)}`, !isFav && e.count > 1 ? `${e.count}× viewed` : null].filter(Boolean).join(' · ')),
          e.position && e.duration ? h('div.progress', h('i', { style: { width: `${(e.position / e.duration) * 100}%` } })) : null),
        h('div.lib-actions',
          isFav ? iconBtn('more', (ev) => menuFrom(ev.currentTarget, [
            { label: 'Move to group…', icon: 'folder', onClick: async () => { const g = await prompt('Favorite group', 'Group name (empty for none)', e.group || ''); if (g != null) { await api('setFavoriteGroup', e.pl, it.id, g.trim()); draw(); } } },
            { label: 'Move to top', icon: 'up', onClick: async () => { await api('moveFavorite', e.pl, it.id, 'top'); draw(); } },
            { label: 'Move up', icon: 'up', onClick: async () => { await api('moveFavorite', e.pl, it.id, 'up'); draw(); } },
            { label: 'Move down', icon: 'down', onClick: async () => { await api('moveFavorite', e.pl, it.id, 'down'); draw(); } },
          ]), 'Organize') : null,
          !isFav ? favButton(e.pl, it, favSet.has(`${e.pl}|${it.id}`)) : null,
          !isFav && (it.type === 'episode' || it.type === 'series')
            ? iconBtn('x', (ev) => menuFrom(ev.currentTarget, [
              it.type === 'episode' ? { label: `Remove this episode (S${it.season}E${it.episode})`, icon: 'x', onClick: async () => { await api('removeHistory', e.pl, it.id); toast('Episode removed from recently viewed'); draw(); } } : null,
              { label: `Remove the whole show “${it.seriesName || it.name}”`, icon: 'trash', onClick: async () => { await api('removeHistoryShow', e.pl, it.type === 'series' ? it.id : it.seriesId); toast(`Removed “${it.seriesName || it.name}” from recently viewed`); draw(); } },
            ].filter(Boolean)), 'Remove from recently viewed', 'remove')
            : iconBtn('x', async () => {
              await api(isFav ? 'removeFavorite' : 'removeHistory', e.pl, it.id);
              toast(isFav ? 'Removed from favorites' : 'Removed from recently viewed');
              draw();
            }, isFav ? 'Remove from favorites' : 'Remove from recently viewed', 'remove')));
    }
    drawItems();
  }

  await draw();
  const off = window.api.on(isFav ? 'library:favorites' : 'library:history', () => draw());
  return off;
}
