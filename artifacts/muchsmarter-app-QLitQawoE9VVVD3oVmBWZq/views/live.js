// Live TV: categories | channels (with now-playing) | player + programme list.
import { h, clear, icon, iconBtn, api, img, menu, toast, errToast, lazyList, debounce, fmtTime, fmtDate, btn, viewSwitch, favButton, modal, confirmBox } from '../lib/dom.js';
import { recordProgramDialog } from './recordings.js';
import { sendToVlc } from '../lib/vlc.js';
import { channelFilter, adultToggle, hideAdultCats, adultModify } from '../lib/filterui.js';

export async function render(view, { app, params }) {
  if (!app.pl) { view.append(h('div.empty', h('h2', 'No playlist selected'), btn('Add playlist', () => app.navigate('playlists'), { cls: 'primary' }))); return; }
  const summary = app.summary || (await app.loadPlaylist(app.pl));
  const cats = [{ id: '__all', name: 'All channels' }, { id: '__fav', name: '★ Favorites' }, { id: '__recent', name: 'Recently watched' }, ...summary.categories.live];
  let catId = params.categoryId || localStorage.getItem(`live-cat-${app.pl}`) || '__all';
  let channels = [];
  let selected = null;
  let filter = '';
  // Channel filters (country, language, genre…): shared with the TV Guide, remembered per playlist.
  const cf = channelFilter({ app, cats, catLabel: () => (cats.find((c) => c.id === catId) || {}).name || 'this list', onChange: () => loadChannels() });
  // If the open category is adult-only and adult content is hidden, go to a safe one.
  const fixAdultCat = () => {
    if (app.settings.hideAdult === false || !(cats.find((c) => c.id === catId) || {}).adult) return;
    catId = cats.some((c) => c.id === '__all') ? '__all' : (hideAdultCats(app, cats).find((c) => !c.id.startsWith('__')) || cats[0]).id;
  };
  fixAdultCat();
  // "Hide adult" tick box (on by default): hides adult-rated titles and all-adult categories.
  const adultBtn = adultToggle(app, () => { fixAdultCat(); drawCats(); loadChannels(); });
  // Modify: tick channels to move to the bottom (adult) / mark not adult - remembered, part of Backup.
  const mod = adultModify(app, { getShown: () => channels, reload: () => loadChannels(), noun: 'channels' });
  const hiddenSet = () => new Set(app.settings.hiddenChannels || []);

  const catList = h('div.pane.cats');
  const chanList = h('div.pane.chans');
  const recentBar = h('div');
  const playerHost = h('div.live-player');
  const epgBox = h('div.live-epg');
  const chanSearch = h('input.input.small', { type: 'search', placeholder: 'Search channels', oninput: debounce((e) => { filter = e.target.value; loadChannels(); }, 200) });
  const sortSel = h('select.input.small', { onchange: () => loadChannels() }, h('option', { value: 'number' }, 'Sort: Number'), h('option', { value: 'name' }, 'Sort: A–Z'));
  view.append(h('div.live-layout',
    catList,
    h('div.pane.chan-pane', h('div.pane-top', h('div.pane-head', chanSearch, cf.button, adultBtn, mod.button, sortSel, btn('VLC', () => sendToVlc(app.pl, channels, `MuchSmarter - ${(cats.find((c) => c.id === catId) || {}).name || 'Live TV'}`), { iconName: 'external', cls: 'small', title: 'Open this channel list in VLC' }), viewSwitch('live', chanList, { fallback: 'list' })), mod.bar, cf.chips, recentBar), chanList),
    h('div.pane.player-pane', playerHost,
      // Phones: switch the area under the player between channels and the programme guide.
      h('div.phone-switch', h('button.seg-btn.active', { 'data-show': 'chans', onclick: (e) => phoneShow(e, 'chans') }, 'Channels'), h('button.seg-btn', { 'data-show': 'epg', onclick: (e) => phoneShow(e, 'epg') }, 'Guide')),
      epgBox)));
  function phoneShow(e, what) {
    const layout = view.querySelector('.live-layout');
    layout.classList.toggle('epg-open', what === 'epg');
    view.querySelectorAll('.phone-switch .seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.show === what));
  }

  // Categories ---------------------------------------------------------------
  const drawCats = () => clear(catList, hideAdultCats(app, cats).map((c) => h(`button.cat${c.id === catId ? '.active' : ''}`, {
    onclick: async () => { if (!(await app.unlock(c.id))) return; catId = c.id; localStorage.setItem(`live-cat-${app.pl}`, catId); drawCats(); loadChannels(); },
    oncontextmenu: (e) => { e.preventDefault(); catMenu(e, c); },
  }, app.isLocked(c.id) ? icon('lock', 14) : null, h('span', c.name))));
  const catMenu = (e, c) => {
    if (c.id.startsWith('__')) return;
    const key = `${app.pl}:${c.id}`;
    const locked = app.settings.lockedCategories.includes(key);
    menu(e.clientX, e.clientY, [{ label: locked ? 'Remove parental lock' : 'Lock with parental PIN', icon: 'lock', onClick: async () => {
      if (!app.settings.parentalPin) { toast('Set a parental PIN in Settings first', 'warn'); return; }
      const list = locked ? app.settings.lockedCategories.filter((k) => k !== key) : [...app.settings.lockedCategories, key];
      app.settings = await api('setSettings', { lockedCategories: list });
      drawCats();
    } }]);
  };
  drawCats();

  // Channels -------------------------------------------------------------------
  let lazy;
  async function loadChannels() {
    lazy && lazy.destroy(); lazy = null;
    clear(chanList, h('div.spinner'));
    if (catId === '__fav' || catId === '__recent') {
      const src = catId === '__fav' ? await api('favorites', 'live') : await api('history', 'live');
      const ids = src.filter((f) => f.pl === app.pl).map((f) => f.item.id);
      const r = await api('list', app.pl, { type: 'live', ids, limit: 5000, search: filter });
      const order = new Map(ids.map((id, i) => [id, i]));
      channels = r.items.sort((a, b) => order.get(a.id) - order.get(b.id));
    } else {
      const r = await api('list', app.pl, { type: 'live', categoryId: catId === '__all' ? undefined : catId, search: filter, limit: 20000, sort: sortSel.value });
      channels = r.items.filter((c) => !app.isLocked(c.categoryId));
    }
    channels = await cf.apply(channels);
    const favs = new Set((await api('favorites', 'live')).filter((f) => f.pl === app.pl).map((f) => f.item.id));
    clear(chanList);
    clear(recentBar);
    if (catId === '__recent' && channels.length) recentBar.append(h('div.recent-bar', h('span.muted', `${channels.length} recently watched`), btn('Clear all', async () => {
      if (await confirmBox('Clear recently watched', 'Remove every channel from Recently watched?', 'Clear', true)) { await api('clearHistory', 'live'); loadChannels(); }
    }, { iconName: 'trash', cls: 'small danger' })));
    if (!channels.length) { chanList.append(h('div.empty.small', cf.activeCount() ? h('div', 'No channels match these filters. ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); cf.clear(); } }, 'Clear filters')) : 'No channels here')); return; }
    lazy = lazyList(chanList, channels, (c, i) => mod.decorate(chanRow(c, i, favs.has(c.id)), c), { scroller: chanList, chunk: 60 });
    fillNowPlaying();
  }

  function chanRow(c, i, fav) {
    const row = h(`div.chan${selected && selected.id === c.id ? '.active' : ''}`, {
      'data-id': c.id,
      tabIndex: 0,
      onclick: () => select(c, i),
      ondblclick: () => app.player.toggleFullscreen(),
      onkeydown: (e) => { if (e.key === 'Enter') select(c, i); },
      oncontextmenu: (e) => { e.preventDefault(); channelMenu(e, c, fav); },
    },
    h('span.chan-num', c.num || i + 1),
    img(c.logo, 'chan-logo', c.name),
    h('div.chan-text', h('div.chan-name', c.name, c.catchup ? h('span.badge', { title: `Catch-up: ${c.catchup.days} days` }, 'CATCH-UP') : null), h('div.chan-now')),
    favButton(app.pl, c, fav, { onChange: () => { if (catId === '__fav') loadChannels(); } }),
    catId === '__recent' ? h('button.icon-btn.chan-x', { title: 'Remove from Recently watched', 'aria-label': 'Remove from Recently watched', onclick: (e) => { e.stopPropagation(); forget(c); } }, icon('x', 14)) : null);
    return row;
  }

  // Now-playing titles are fetched for visible rows in batches.
  async function fillNowPlaying() {
    const rows = [...chanList.querySelectorAll('.chan')].filter((r) => !r.dataset.filled).slice(0, 200);
    if (!rows.length) return;
    rows.forEach((r) => { r.dataset.filled = '1'; });
    const map = await api('nowNext', app.pl, rows.map((r) => r.dataset.id)).catch(() => ({}));
    const now = Date.now();
    for (const r of rows) {
      const nn = map[r.dataset.id];
      const el = r.querySelector('.chan-now');
      if (!nn || !nn.now) continue;
      const pct = ((now - nn.now.start) / (nn.now.stop - nn.now.start)) * 100;
      clear(el, h('span', nn.now.title), h('div.progress.thin', h('i', { style: { width: `${pct}%` } })));
    }
  }
  chanList.addEventListener('scroll', debounce(fillNowPlaying, 300));

  async function forget(c) {
    await api('removeHistory', app.pl, c.id);
    toast(`Removed ${c.name} from Recently watched`, 'info', 2000);
    if (catId === '__recent') loadChannels();
  }

  function channelMenu(e, c, fav) {
    menu(e.clientX, e.clientY, [
      catId === '__recent' ? { label: 'Remove from Recently watched', icon: 'x', onClick: () => forget(c) } : null,
      { label: 'Play', icon: 'play', onClick: () => select(c) },
      { label: fav ? 'Remove from favorites' : 'Add to favorites', icon: 'star', onClick: async () => { await api('toggleFavorite', app.pl, c.id); loadChannels(); } },
      '-',
      { label: 'Record now', icon: 'rec', onClick: () => api('recordNow', app.pl, c.id).then(() => toast(`Recording ${c.name}`, 'success')).catch(errToast) },
      { label: 'Schedule recording…', icon: 'clock', onClick: () => recordProgramDialog(app, c) },
      '-',
      { label: 'Open in pop-out window', icon: 'popout', onClick: async () => { const info = await api('playInfo', app.pl, c.id); api('popout', { ...info, pl: app.pl, itemId: c.id, title: c.name }); } },
      { label: 'Open mini player (always on top)', icon: 'mini', onClick: async () => { const info = await api('playInfo', app.pl, c.id); api('popout', { ...info, pl: app.pl, itemId: c.id, title: c.name, mini: true }); } },
      { label: 'Add to Multi-View', icon: 'grid', onClick: () => { const mv = JSON.parse(localStorage.getItem('multiview') || '[]'); mv.push({ pl: app.pl, item: c }); localStorage.setItem('multiview', JSON.stringify(mv.slice(-9))); toast('Added to Multi-View'); } },
      { label: hiddenSet().has(`${app.pl}|${c.id}`) ? 'Unhide channel' : 'Hide channel', icon: 'x', onClick: async () => {
        const set = hiddenSet(); const k = `${app.pl}|${c.id}`;
        const was = set.has(k);
        if (was) set.delete(k); else set.add(k);
        app.settings = await api('setSettings', { hiddenChannels: [...set] });
        toast(was ? `${c.name} is visible again` : `${c.name} hidden — see it again with Filters → Personal choices → Hidden channels`, 'info', 4000);
        loadChannels();
      } },
      { label: 'Open in VLC', icon: 'external', onClick: () => sendToVlc(app.pl, [c], c.name) },
      { label: 'Open in external player', icon: 'external', onClick: async () => { const info = await api('playInfo', app.pl, c.id, { noHistory: true }); api('external', info.url, info.headers, c.name).catch(errToast); } },
    ]);
  }

  // Highlight the playing channel (rows off screen are updated too) and optionally scroll to it.
  function markActive(id, scroll) {
    if (lazy) lazy.forEach((r) => r.classList.toggle('active', r.dataset.id === id));
    else chanList.querySelectorAll('.chan').forEach((r) => r.classList.toggle('active', r.dataset.id === id));
    if (scroll && lazy) lazy.scrollToIndex(channels.findIndex((x) => x.id === id));
  }

  async function select(c, index) {
    selected = c;
    markActive(c.id, false);
    const i = index ?? channels.findIndex((x) => x.id === c.id);
    await app.play(app.pl, c, { host: playerHost, queue: { list: channels, index: i } });
    loadEpg(c);
  }

  // Programme list for the selected channel (past = catch-up, future = record).
  async function loadEpg(c) {
    clear(epgBox, h('div.spinner'));
    const from = Date.now() - (c.catchup ? c.catchup.days * 86400000 : 2 * 3600000);
    const to = Date.now() + 2 * 86400000;
    let list = ((await api('epgFor', app.pl, [c.id], from, to)) || {})[c.id] || [];
    if (!list.length) list = await api('providerEpg', app.pl, c.id).catch(() => []);
    if (selected !== c) return;
    clear(epgBox);
    if (!list.length) { epgBox.append(h('div.empty.small', 'No programme guide for this channel. Add an EPG URL in Playlists.')); return; }
    const now = Date.now();
    let lastDay = '';
    let nowEl = null;
    for (const p of list) {
      const day = fmtDate(p.start);
      if (day !== lastDay) { epgBox.append(h('div.epg-day', day)); lastDay = day; }
      const past = p.stop < now;
      const live = p.start <= now && p.stop > now;
      const canCatchup = past && c.catchup && now - p.start < c.catchup.days * 86400000;
      const row = h(`div.prog${live ? '.live' : ''}${past ? '.past' : ''}`,
        h('div.prog-time', fmtTime(p.start)),
        h('div.prog-info', h('div.prog-title', p.title, p.ep ? h('small', ` ${p.ep}`) : null, p.isNew ? h('span.badge.new', 'NEW') : null, p.cc ? h('span.badge', 'CC') : null),
          p.desc ? h('div.prog-desc', p.desc) : null,
          live ? h('div.progress.thin', h('i', { style: { width: `${((now - p.start) / (p.stop - p.start)) * 100}%` } })) : null),
        h('div.prog-actions',
          canCatchup ? iconBtn('play', () => app.play(app.pl, c, { host: playerHost, catchup: p }), 'Watch from archive (catch-up)') : null,
          canCatchup ? iconBtn('download', () => api('recordCatchup', { pl: app.pl, itemId: c.id, title: p.title, start: p.start, end: p.stop }).then(() => toast('Saving from archive…', 'success')).catch(errToast), 'Download this programme from the archive') : null,
          live ? iconBtn('rec', () => api('recordNow', app.pl, c.id).then(() => toast('Recording', 'success')).catch(errToast), 'Record now', 'rec') : null,
          !past && !live ? iconBtn('rec', () => recordProgramDialog(app, c, p), 'Record this programme', 'rec') : null));
      epgBox.append(row);
      if (live) nowEl = row;
    }
    if (nowEl) nowEl.scrollIntoView({ block: 'center' });
  }

  const onEpg = () => { if (lazy) lazy.forEach((r) => delete r.dataset.filled); chanList.querySelectorAll('.chan').forEach((r) => delete r.dataset.filled); fillNowPlaying(); if (selected) loadEpg(selected); };
  document.addEventListener('epg-ready', onEpg);
  const onStep = (e) => { if (e.detail.item.type === 'live') { selected = e.detail.item; loadEpg(selected); markActive(selected.id, true); } };
  document.addEventListener('queue-step', onStep);

  // Channel-number zapping: type digits anywhere on this view.
  let digits = '';
  let digitTimer;
  const onKey = (e) => {
    if (/^\d$/.test(e.key) && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      digits += e.key;
      app.player.flash(`Channel ${digits}`);
      clearTimeout(digitTimer);
      digitTimer = setTimeout(() => {
        const c = channels.find((x) => String(x.num) === digits);
        digits = '';
        if (c) select(c);
      }, 1200);
    }
  };
  document.addEventListener('keydown', onKey);

  await loadChannels();
  // If something is already playing (mini player), bring it back inline.
  if (app.nowPlaying && app.nowPlaying.item.type === 'live' && app.playerMode === 'mini') {
    playerHost.append(app.player.el);
    app.setPlayerMode('inline');
    app.player.play();
    selected = app.nowPlaying.item;
    loadEpg(selected);
  } else if (params.play) {
    select(params.play);
  } else {
    playerHost.append(h('div.player-placeholder', icon('tv', 48), h('p', 'Select a channel to start watching'), h('small', 'Tip: type a channel number, PgUp/PgDn to zap, F for full screen')));
  }

  return () => {
    document.removeEventListener('epg-ready', onEpg);
    document.removeEventListener('queue-step', onStep);
    document.removeEventListener('keydown', onKey);
    lazy && lazy.destroy();
  };
}
