// Global search across every playlist (channels, movies, series) plus the TV guide.
import { h, clear, api, img, debounce, fmtTime, fmtDate, viewSwitch, favButton } from '../lib/dom.js';
import { progDialog } from './guide.js';

export async function render(view, { app, params }) {
  const input = h('input.input.big-search', { type: 'search', placeholder: 'Search everything…', value: params.q || '' });
  const out = h('div.search-results');
  view.append(h('div.page', h('div.page-top', h('div.page-head', h('h1', 'Search'), h('div.top-spacer'), viewSwitch('search', out, { fallback: 'list' })), input), out));
  if (app.searchBox && params.q) app.searchBox.value = params.q;

  const run = async () => {
    const q = input.value.trim();
    if (q.length < 2) { clear(out, h('div.empty.small', 'Type at least 2 characters.')); return; }
    clear(out, h('div.spinner'));
    const [r, guide, favList] = await Promise.all([api('searchAll', q), app.pl ? api('searchEpg', app.pl, q).catch(() => []) : [], api('favorites').catch(() => [])]);
    const favs = new Set(favList.map((f) => `${f.pl}|${f.item.id}`));
    // Each result opens on click and carries its own favorite star.
    const result = (it, open, title, sub, fav = true) => h('div.result', { role: 'button', tabIndex: 0, onclick: open, onkeydown: (e) => { if (e.key === 'Enter') open(); } },
      img(it.logo, 'result-img', it.name), h('div.result-text', h('b', title), h('div.muted', sub)), fav && it.pl ? favButton(it.pl, it, favs.has(`${it.pl}|${it.id}`)) : null);
    clear(out);
    const section = (title, items, render) => items.length ? h('section', h('h2', `${title} (${items.length})`), h('div.result-grid', items.map(render))) : null;
    out.append(
      section('Channels', r.live, (c) => result(c, () => app.navigate('live', { play: c }), c.name, c.plName)),
      section('Movies', r.movie, (m) => result(m, () => app.navigate('movies', { details: m }), m.name, [m.year, m.plName].filter(Boolean).join(' · '))),
      section('Series', r.series, (s) => result(s, () => app.navigate('series', { details: s }), s.name, s.plName)),
      section('On TV (guide)', guide.slice(0, 60), (p) => result({ ...p.channel }, () => progDialog(app, p.channel, p), p.title, `${p.channel.name} · ${fmtDate(p.start)} ${fmtTime(p.start)}`, false)));
    if (!out.children.length) out.append(h('div.empty.small', `No results for "${q}"`));
  };
  input.addEventListener('input', debounce(run, 300));
  input.focus();
  if (params.q) run();
}
