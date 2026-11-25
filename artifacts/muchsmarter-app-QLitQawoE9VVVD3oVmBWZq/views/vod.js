// Movies & Series: category rail, poster grid, and a details page with
// play/resume, trailer, favorites, downloads, seasons and episodes.
import { h, clear, icon, api, img, btn, menu, menuFrom, toast, errToast, lazyList, debounce, modal, viewSwitch, favButton, favoriteIds, confirmBox } from '../lib/dom.js';

import { sendToVlc } from '../lib/vlc.js';
import { channelFilter, adultToggle, hideAdultCats, adultModify } from '../lib/filterui.js';

export async function render(view, { app, route, params }) {
  if (!app.pl) { view.append(h('div.empty', h('h2', 'No playlist selected'), btn('Add playlist', () => app.navigate('playlists'), { cls: 'primary' }))); return; }
  if (params.details) return renderDetails(view, app, params.details, route);
  const type = route === 'movies' ? 'movie' : 'series';
  const summary = app.summary || (await app.loadPlaylist(app.pl));
  const lazyCats = summary.lazy && summary.lazy[type];
  const cats = [...(lazyCats ? [] : [{ id: '__all', name: 'All' }]), { id: '__fav', name: '★ Favorites' }, { id: '__recent', name: 'Recently watched' }, ...summary.categories[type]];
  let catId = params.categoryId || localStorage.getItem(`${type}-cat-${app.pl}`) || cats[0].id;
  if (!cats.some((c) => c.id === catId)) catId = cats[0].id;
  let search = '';
  const cf = channelFilter({ app, cats, kind: type, catLabel: () => (cats.find((c) => c.id === catId) || {}).name || (type === 'movie' ? 'Movies' : 'Series'), onChange: () => load() });
  // If the open category is adult-only and adult content is hidden, go to a safe one.
  const fixAdultCat = () => {
    if (app.settings.hideAdult === false || !(cats.find((c) => c.id === catId) || {}).adult) return;
    catId = cats.some((c) => c.id === '__all') ? '__all' : (hideAdultCats(app, cats).find((c) => !c.id.startsWith('__')) || cats[0]).id;
  };
  fixAdultCat();
  // "Hide adult" tick box (on by default): hides adult-rated titles and all-adult categories.
  const adultBtn = adultToggle(app, () => { fixAdultCat(); drawRail(); load(); });
  // Modify: tick titles to move to the bottom (adult) / mark not adult - remembered, part of Backup.
  const mod = adultModify(app, { getShown: () => shown, reload: () => load(), noun: type === 'movie' ? 'movies' : 'shows' });

  const rail = h('div.pane.cats');
  const grid = h('div.poster-grid');
  const sortSel = h('select.input.small', { onchange: () => load() },
    h('option', { value: 'added' }, 'Recently added'), h('option', { value: 'name' }, 'A–Z'), h('option', { value: 'rating' }, 'Top rated'), h('option', { value: '' }, 'Provider order'));
  const count = h('span.muted');
  const recentBar = h('div');
  view.append(h('div.vod-layout', rail, h('div.pane.vod-main',
    h('div.pane-top',
    h('div.pane-head', h('input.input.small', { type: 'search', placeholder: `Search ${type === 'movie' ? 'movies' : 'series'}`, oninput: debounce((e) => { search = e.target.value; load(); }, 250) }), cf.button, adultBtn, mod.button, sortSel, count, btn('VLC', () => listToVlc(), { iconName: 'external', cls: 'small', title: type === 'movie' ? 'Open these movies in VLC' : 'Open every episode of these shows in VLC' }), viewSwitch(route, grid, { fallback: 'medium' })),
    mod.bar,
    cf.chips,
    recentBar),
    grid)));

  const drawRail = () => clear(rail, hideAdultCats(app, cats).map((c) => h(`button.cat${c.id === catId ? '.active' : ''}`, {
    onclick: async () => { if (!(await app.unlock(c.id))) return; catId = c.id; localStorage.setItem(`${type}-cat-${app.pl}`, catId); drawRail(); load(); },
  }, app.isLocked(c.id) ? icon('lock', 14) : null, h('span', c.name))));
  drawRail();

  let lazy;
  async function load() {
    lazy && lazy.destroy();
    clear(grid, h('div.spinner'));
    let items;
    if (catId === '__fav' || catId === '__recent') {
      const src = catId === '__fav' ? await api('favorites', type) : await api('history', type);
      items = src.filter((f) => f.pl === app.pl).map((f) => f.item.type === 'episode' ? { id: String(f.item.seriesId).startsWith('s') ? f.item.seriesId : 's' + f.item.seriesId, type: 'series', name: f.item.seriesName, logo: f.item.logo } : f.item);
      const seen = new Set();
      items = items.filter((i) => !seen.has(i.id) && seen.add(i.id));
      if (search) items = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));
    } else {
      const r = await api('list', app.pl, { type, categoryId: catId === '__all' ? undefined : catId, search, sort: sortSel.value || undefined, limit: 50000 });
      items = r.items.filter((i) => !app.isLocked(i.categoryId));
    }
    items = await cf.apply(items);
    shown = items;
    count.textContent = `${items.length.toLocaleString()} titles`;
    clear(grid);
    clear(recentBar);
    if (catId === '__recent' && items.length) recentBar.append(h('div.recent-bar', h('span.muted', `${items.length} recently watched`), btn('Clear all', async () => {
      if (await confirmBox('Clear recently watched', `Remove every ${type === 'movie' ? 'movie' : 'show (and its watched episodes)'} from Recently watched?`, 'Clear', true)) { await api('clearHistory', type); toast('Recently watched cleared', 'info', 2000); load(); }
    }, { iconName: 'trash', cls: 'small danger' })));
    if (!items.length) { grid.append(h('div.empty.small', cf.activeCount() ? h('div', 'Nothing matches these filters. ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); cf.clear(); } }, 'Clear filters')) : 'Nothing here')); return; }
    const watched = type === 'movie' ? await api('watchedMap', app.pl, items.slice(0, 3000).map((i) => i.id)) : {};
    // Series: count watched episodes per show from the viewing history.
    epCounts = new Map();
    if (type === 'series') {
      for (const h0 of await api('history', 'series').catch(() => [])) {
        if (h0.pl !== app.pl || h0.item.type !== 'episode' || !h0.watched) continue;
        const sid = String(h0.item.seriesId || '');
        const k = sid.startsWith('s') ? sid : `s${sid}`;
        epCounts.set(k, (epCounts.get(k) || 0) + 1);
      }
    }
    favs = await favoriteIds(app.pl);
    lazy = lazyList(grid, items, (it) => mod.decorate(poster(it, watched[it.id]), it), { scroller: grid.parentElement, chunk: 60 });
  }

  let favs = new Set();
  let shown = [];
  const catName = () => (cats.find((c) => c.id === catId) || {}).name || (type === 'movie' ? 'Movies' : 'Series');
  async function listToVlc() {
    if (type === 'movie') { sendToVlc(app.pl, shown, `MuchSmarter - ${catName()}`); return; }
    // Series: gather the episodes of the shows on screen (filter first for big lists).
    const shows = shown.slice(0, 30);
    if (!shows.length) { toast('Nothing here to send to VLC.', 'warn'); return; }
    if (shown.length > 30) toast(`Sending the first 30 of ${shown.length} shows — filter or pick a category to choose others.`, 'info', 5000);
    const eps = [];
    for (const sh of shows) {
      try { const d = await api('details', app.pl, sh.id); for (const se of d.seasons || []) for (const e of se.episodes) eps.push({ ...e, seriesName: sh.name }); } catch (_) { /* skip show */ }
    }
    sendToVlc(app.pl, eps, `MuchSmarter - ${catName()}`);
  }
  let epCounts = new Map();
  function poster(it, w) {
    const open = () => app.navigate(route, { details: it });
    return h('div.poster', {
      role: 'button',
      tabIndex: 0,
      onclick: open,
      onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } },
      oncontextmenu: (e) => { e.preventDefault(); posterMenu(e, it); },
      title: it.name,
    },
    h('div.poster-img', img(it.logo, '', it.name), it.rating ? h('span.rating', `★ ${Number(it.rating).toFixed(1)}`) : null, w && w.watched ? h('span.watched', icon('check', 14)) : null,
      epCounts.get(it.id) ? h('span.watched-count', { title: 'Episodes you have watched' }, `✓ ${epCounts.get(it.id)} ep`) : null,
      favButton(app.pl, it, favs.has(it.id), { onChange: (on) => { if (on) favs.add(it.id); else favs.delete(it.id); if (catId === '__fav' && !on) load(); } }),
      catId === '__recent' ? h('button.cont-remove.recent-x', { title: 'Remove from Recently watched', 'aria-label': 'Remove from Recently watched', onclick: (e) => { e.stopPropagation(); forget(it); }, onkeydown: (e) => e.stopPropagation() }, icon('x', 14)) : null),
    w && w.position && w.duration ? h('div.progress', h('i', { style: { width: `${(w.position / w.duration) * 100}%` } })) : null,
    h('div.poster-text',
      h('div.poster-name', it.name),
      it.year || it.rating ? h('div.poster-year', [it.year, it.rating ? `★ ${Number(it.rating).toFixed(1)}` : null].filter(Boolean).join(' · ')) : null));
  }

  // Remove one title from Recently watched (a show: the show and every episode watched).
  async function forget(it) {
    if (it.type === 'series') await api('removeHistoryShow', app.pl, it.id);
    else await api('removeHistory', app.pl, it.id);
    toast(`Removed "${it.name}" from Recently watched`, 'info', 2000);
    if (catId === '__recent') load();
  }

  function posterMenu(e, it) {
    menu(e.clientX, e.clientY, [
      catId === '__recent' ? { label: 'Remove from Recently watched', icon: 'x', onClick: () => forget(it) } : null,
      it.type === 'movie' ? { label: 'Play', icon: 'play', onClick: () => app.play(app.pl, it) } : null,
      { label: 'Details', icon: 'info', onClick: () => app.navigate(route, { details: it }) },
      { label: it.type === 'movie' ? 'Open in VLC' : 'Open all episodes in VLC', icon: 'external', onClick: async () => { if (it.type === 'movie') { sendToVlc(app.pl, [it], it.name); return; } const d = await api('details', app.pl, it.id); sendToVlc(app.pl, (d.seasons || []).flatMap((se) => se.episodes.map((e) => ({ ...e, seriesName: it.name }))), it.name); } },
      { label: 'Toggle favorite', icon: 'star', onClick: async () => { const on = await api('toggleFavorite', app.pl, it.id); toast(on ? 'Added to favorites' : 'Removed from favorites'); } },
      it.type === 'movie' ? { label: 'Download', icon: 'download', onClick: () => queueDownload(app, it) } : null,
      it.type === 'movie' ? { label: 'Play in pop-out window', icon: 'popout', onClick: async () => { const info = await api('playInfo', app.pl, it.id); api('popout', { ...info, pl: app.pl, itemId: it.id, title: it.name, position: info.resume && info.resume.position }); } } : null,
    ]);
  }

  await load();
  return () => lazy && lazy.destroy();
}

export async function queueDownload(app, item, subfolder) {
  const n = await api('download', [{ pl: app.pl, itemId: item.id, title: item.type === 'episode' ? `${item.seriesName} - S${String(item.season).padStart(2, '0')}E${String(item.episode).padStart(2, '0')} - ${item.name}` : item.name, subfolder: subfolder || (item.type === 'episode' ? item.seriesName : 'Movies'), kind: item.type, logo: item.logo }]);
  toast(n ? 'Added to downloads' : 'Already in downloads', n ? 'success' : 'info');
}

async function renderDetails(view, app, item, route) {
  view.append(h('div.spinner'));
  let d;
  try { d = await api('details', app.pl, item.id); } catch (e) { clear(view, h('div.empty', h('h2', 'Could not load details'), h('p', e.message), btn('Back', () => app.navigate(route)))); return; }
  const it = { ...item, ...d.item };
  const favs = await api('favorites');
  let fav = favs.some((f) => f.pl === app.pl && f.item.id === it.id);
  const favBtn = btn(fav ? 'Favorited' : 'Favorite', async () => { fav = await api('toggleFavorite', app.pl, it.id); favBtn.querySelector('span').textContent = fav ? 'Favorited' : 'Favorite'; favBtn.classList.toggle('on', fav); }, { iconName: 'star', cls: fav ? 'on' : '' });
  const meta = [it.year || (d.releaseDate || '').slice(0, 4), d.duration, d.genre, d.rating ? `★ ${d.rating}` : it.rating ? `★ ${it.rating}` : ''].filter(Boolean).join('  ·  ');
  const actions = h('div.details-actions');
  const head = h('div.details-head', { style: d.backdrop ? { backgroundImage: `linear-gradient(90deg, var(--bg) 25%, transparent), url("${d.backdrop}")` } : {} },
    h('button.back', { onclick: () => app.navigate(route) }, icon('prev', 16), ' Back'),
    h('div.details-wrap',
      img(d.poster || it.logo, 'details-poster', it.name),
      h('div.details-info',
        h('h1', it.name),
        meta ? h('div.details-meta', meta) : null,
        d.plot ? h('p.details-plot', d.plot) : null,
        d.director ? h('div.kv-line', h('b', 'Director: '), d.director) : null,
        d.cast ? h('div.kv-line', h('b', 'Cast: '), d.cast) : null,
        actions)));
  clear(view, h('div.details', head));

  if (it.type === 'movie') {
    const pos = await api('watchedMap', app.pl, [it.id]);
    const w = pos[it.id];
    actions.append(...[
      btn(w && w.position ? `Resume ${Math.floor(w.position / 60)} min` : 'Play', () => app.play(app.pl, { ...it, subtitles: d.subtitles }), { iconName: 'play', cls: 'primary big' }),
      w && w.position ? btn('Start over', async () => { await api('savePosition', app.pl, it.id, 0, w.duration); app.play(app.pl, it); }, { iconName: 'back10' }) : null,
      d.trailer ? btn('Trailer', () => api('openExternal', d.trailer), { iconName: 'film' }) : null,
      favBtn,
      btn('Download', () => queueDownload(app, it), { iconName: 'download' }),
      btn('VLC', () => sendToVlc(app.pl, [it], it.name), { iconName: 'external', title: 'Open in VLC' }),
      btn('Pop out', async () => { const info = await api('playInfo', app.pl, it.id); api('popout', { ...info, pl: app.pl, itemId: it.id, title: it.name, position: info.resume && info.resume.position }); }, { iconName: 'popout' }),
      btn(w && w.watched ? 'Mark unwatched' : 'Mark watched', async () => { await api('markWatched', app.pl, it.id, !(w && w.watched)); app.navigate(route, { details: item }); }, { iconName: 'check' })].filter(Boolean));
    return;
  }

  // Series: seasons + episodes.
  actions.append(...[favBtn, d.trailer ? btn('Trailer', () => api('openExternal', d.trailer), { iconName: 'film' }) : null].filter(Boolean));
  const seasons = d.seasons || [];
  if (!seasons.length) { view.firstChild.append(h('div.empty.small', 'No episodes available')); return; }
  const allEpisodes = seasons.flatMap((s) => s.episodes);
  const wmap = await api('watchedMap', app.pl, allEpisodes.map((e) => e.id));
  // "Continue" button picks the first unwatched / in-progress episode.
  const nextEp = allEpisodes.find((e) => wmap[e.id] && wmap[e.id].position > 0 && !wmap[e.id].watched) || allEpisodes.find((e) => !(wmap[e.id] && wmap[e.id].watched)) || allEpisodes[0];
  actions.prepend(btn(`${wmap[nextEp.id] ? 'Continue' : 'Play'} S${nextEp.season}E${nextEp.episode}`, () => playEp(nextEp), { iconName: 'play', cls: 'primary big' }));
  let cur = Number(localStorage.getItem(`season-${it.id}`)) || (nextEp && nextEp.season) || seasons[0].num;
  if (!seasons.some((s) => s.num === cur)) cur = seasons[0].num;
  const tabs = h('div.season-tabs');
  const list = h('div.episodes');
  let hideWatched = localStorage.getItem('hide-watched') === '1';
  const isWatched = (e) => !!(wmap[e.id] && wmap[e.id].watched);
  const seriesStat = h('div.series-progress');
  const setMany = async (eps, watched) => {
    await api('markWatchedMany', app.pl, eps.map((e) => ({ ...e, seriesName: it.name, seriesId: it.id })), watched);
    for (const e of eps) wmap[e.id] = { ...(wmap[e.id] || {}), watched, position: 0 };
    toast(`${eps.length} episode(s) marked ${watched ? 'watched' : 'unwatched'}`, 'success', 1800);
    draw();
  };
  const seasonMenu = (ev) => {
    const s = seasons.find((x) => x.num === cur);
    menuFrom(ev.currentTarget, [
      { label: `Mark ${s.name || 'Season ' + s.num} watched`, icon: 'check', onClick: () => setMany(s.episodes, true) },
      { label: `Mark ${s.name || 'Season ' + s.num} unwatched`, icon: 'x', onClick: () => setMany(s.episodes, false) },
      '-',
      { label: 'Mark whole series watched', icon: 'check', onClick: () => setMany(allEpisodes, true) },
      { label: 'Mark whole series unwatched', icon: 'x', onClick: () => setMany(allEpisodes, false) },
      { label: `Mark everything before S${nextUp().season}E${nextUp().episode} watched`, icon: 'history', onClick: () => setMany(allEpisodes.slice(0, allEpisodes.indexOf(nextUp())), true) },
    ]);
  };
  const nextUp = () => allEpisodes.find((e) => wmap[e.id] && wmap[e.id].position > 0 && !isWatched(e)) || allEpisodes.find((e) => !isWatched(e)) || allEpisodes[0];
  const hideBox = h('label.check-inline', h('input', { type: 'checkbox', checked: hideWatched, onchange: (e) => { hideWatched = e.target.checked; localStorage.setItem('hide-watched', hideWatched ? '1' : '0'); draw(); } }), ' Hide watched');
  const body = h('div.season-wrap', seriesStat, h('div.season-bar', tabs, hideBox, btn('Watched…', seasonMenu, { iconName: 'check', title: 'Mark a season or the whole series watched / unwatched' }), viewSwitch('episodes', list, { fallback: 'list' }),
    btn('VLC', (ev) => menuFrom(ev.currentTarget, [
      { label: 'Open this season in VLC', icon: 'external', onClick: () => { const s = seasons.find((x) => x.num === cur); sendToVlc(app.pl, s.episodes.map((e) => ({ ...e, seriesName: it.name })), `${it.name} - ${s.name || 'Season ' + s.num}`); } },
      { label: 'Open the whole series in VLC', icon: 'external', onClick: () => sendToVlc(app.pl, allEpisodes.map((e) => ({ ...e, seriesName: it.name })), it.name) },
      { label: 'Open unwatched episodes in VLC', icon: 'external', onClick: () => sendToVlc(app.pl, allEpisodes.filter((e) => !isWatched(e)).map((e) => ({ ...e, seriesName: it.name })), `${it.name} - unwatched`) },
    ]), { iconName: 'external', title: 'Open episodes in VLC' }),
    btn('Download season', () => { const s = seasons.find((x) => x.num === cur); api('download', s.episodes.map((e) => ({ pl: app.pl, itemId: e.id, title: `${it.name} - S${String(e.season).padStart(2, '0')}E${String(e.episode).padStart(2, '0')} - ${e.name}`, subfolder: `${it.name}/Season ${e.season}`, kind: 'episode', logo: e.logo || it.logo }))).then((n) => toast(`${n} episode(s) queued`, 'success')); }, { iconName: 'download' }),
    btn('Download all', () => api('download', allEpisodes.map((e) => ({ pl: app.pl, itemId: e.id, title: `${it.name} - S${String(e.season).padStart(2, '0')}E${String(e.episode).padStart(2, '0')} - ${e.name}`, subfolder: `${it.name}/Season ${e.season}`, kind: 'episode', logo: e.logo || it.logo }))).then((n) => toast(`${n} episode(s) queued`, 'success')), { iconName: 'download' })), list);
  view.firstChild.append(body);

  function playEp(e) {
    const idx = allEpisodes.indexOf(e);
    app.play(app.pl, { ...e, seriesName: it.name }, { queue: { list: allEpisodes.map((x) => ({ ...x, seriesName: it.name })), index: idx }, autoNext: true });
  }

  const draw = () => {
    const totalW = allEpisodes.filter(isWatched).length;
    const nu = nextUp();
    clear(seriesStat,
      h('div.sp-text', h('b', `${totalW} of ${allEpisodes.length} episodes watched`), totalW < allEpisodes.length ? h('span.muted', ` · Up next: S${nu.season}E${nu.episode} ${nu.name || ''}`) : h('span.muted', ' · All caught up ✓')),
      h('div.progress', h('i', { style: { width: `${(totalW / Math.max(1, allEpisodes.length)) * 100}%` } })));
    clear(tabs, seasons.map((s) => {
      const n = s.episodes.filter(isWatched).length;
      return h(`button.tab${s.num === cur ? '.active' : ''}${n === s.episodes.length ? '.done' : ''}`, { onclick: () => { cur = s.num; localStorage.setItem(`season-${it.id}`, cur); draw(); }, title: `${n} of ${s.episodes.length} watched` },
        s.name || `Season ${s.num}`, h('span.tab-count', n === s.episodes.length ? ' ✓' : ` ${n}/${s.episodes.length}`));
    }));
    const s = seasons.find((x) => x.num === cur);
    const shown = hideWatched ? s.episodes.filter((e) => !isWatched(e)) : s.episodes;
    if (!shown.length) { clear(list, h('div.empty.small', 'Every episode in this season is watched. Untick “Hide watched” to see them.')); return; }
    clear(list, shown.map((e) => {
      const w = wmap[e.id];
      const watched = !!(w && w.watched);
      const inProg = !watched && w && w.position > 0 && w.duration;
      const status = watched ? h('span.ep-badge.watched', icon('check', 12), ' Watched')
        : inProg ? h('span.ep-badge.progress-badge', `${Math.round((w.position / w.duration) * 100)}% · ${Math.max(1, Math.round((w.duration - w.position) / 60))} min left`)
          : e === nu ? h('span.ep-badge.next', 'Up next') : h('span.ep-badge.new', 'Not watched');
      return h(`div.episode${watched ? '.watched' : ''}${e === nu ? '.up-next' : ''}`,
        h('button.ep-thumb', { onclick: () => playEp(e) }, img(e.logo || it.logo, '', e.name), h('span.ep-play', icon('play', 26)), watched ? h('span.ep-check', icon('check', 16)) : null, inProg ? h('div.progress', h('i', { style: { width: `${(w.position / w.duration) * 100}%` } })) : null),
        h('div.ep-info', h('div.ep-title', `${e.episode}. ${e.name}`), h('div.ep-meta', status, [e.duration, e.rating ? `★ ${e.rating}` : ''].filter(Boolean).join(' · ')), e.plot ? h('p.ep-plot', e.plot) : null),
        h('div.ep-actions',
          h(`button.icon-btn.ep-watch${watched ? '.on' : ''}`, { title: watched ? 'Mark unwatched' : 'Mark watched', 'aria-pressed': String(watched), onclick: async () => { await api('markWatched', app.pl, e.id, !watched, { ...e, seriesName: it.name, seriesId: it.id }); wmap[e.id] = { ...(w || {}), watched: !watched, position: 0 }; draw(); } }, icon('check')),
          h('button.icon-btn', { title: 'Open in VLC', onclick: () => sendToVlc(app.pl, [{ ...e, seriesName: it.name }], `${it.name} S${e.season}E${e.episode}`) }, icon('external')),
          h('button.icon-btn', { title: 'Download episode', onclick: () => queueDownload(app, { ...e, seriesName: it.name }, `${it.name}/Season ${e.season}`) }, icon('download')),
          h('button.icon-btn', { title: 'Pop out', onclick: async () => { const info = await api('playInfo', app.pl, e.id); api('popout', { ...info, pl: app.pl, itemId: e.id, title: `${it.name} S${e.season}E${e.episode}` }); } }, icon('popout'))));
    }));
  };
  draw();
}

export { modal };
