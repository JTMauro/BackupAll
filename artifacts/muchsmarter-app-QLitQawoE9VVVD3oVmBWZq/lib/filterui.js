// Shared channel-filter UI for Live TV and the TV Guide: the Filter button, the chips
// row above the list, and the filter panel. Choices are shared by both screens and
// remembered per playlist.
import { h, clear, icon, api, modal, prompt, toast } from './dom.js';
import { FACETS, VOD_FACETS, classify, classifyVod, matches, facetCounts } from './chanfilter.js';

// kind: 'live' (channels), 'movie' or 'series'.
export function channelFilter({ app, cats, catLabel, onChange, kind = 'live' }) {
  const live = kind === 'live';
  const FACETS_K = live ? FACETS : VOD_FACETS;
  const noun = live ? 'channel' : kind === 'movie' ? 'movie' : 'show';
  const KEY = live ? `live-filters-${app.pl}` : `${kind}-filters-${app.pl}`;
  let filters = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; } })();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(filters)); } catch (_) { /* ignore */ } };
  const activeCount = () => Object.values(filters).reduce((n, v) => n + (v ? v.length : 0), 0);
  const hiddenSet = () => new Set(app.settings.hiddenChannels || []);
  let base = []; // [{ c, v }] before filtering
  let shown = 0;

  const badge = h('span.f-badge');
  const button = h('button.btn.small.filter-btn', { title: live ? 'Filter channels by country, language, genre, quality, provider…' : `Filter ${noun}s by genre, year, rating, watched, country, language…`, onclick: () => openPanel() }, icon('filter', 15), h('span', 'Filter'), badge);
  const chips = h('div.filter-chips');
  const changed = () => { save(); onChange(); };

  // Classify a channel list and return the channels that pass the filters (and aren't hidden).
  async function apply(channels) {
    const [favList, histList] = await Promise.all([api('favorites', kind), api('history', kind)]);
    const favs = new Set(favList.filter((f) => f.pl === app.pl).map((f) => f.item.id));
    const names = new Map(cats.map((c) => [c.id, c.name]));
    if (!live) {
      // Movies: watched / in progress; Series: started (any episode watched or begun).
      let watch = {};
      if (kind === 'movie') watch = await api('watchedMap', app.pl, channels.map((c) => c.id)).catch(() => ({}));
      else for (const e of histList) if (e.pl === app.pl && e.item.type === 'episode') { const sid = String(e.item.seriesId || ''); watch[sid.startsWith('s') ? sid : `s${sid}`] = true; }
      const recents = new Set(histList.filter((f) => f.pl === app.pl).map((f) => (f.item.type === 'episode' ? (String(f.item.seriesId).startsWith('s') ? f.item.seriesId : `s${f.item.seriesId}`) : f.item.id)));
      base = channels.map((c) => ({ c, v: classifyVod(c, { pl: app.pl, catName: names.get(c.categoryId) || '', favs, recents, watch }) }));
      const out = base.filter(({ v }) => matches(v, filters)).map((x) => x.c);
      shown = out.length;
      drawChips();
      return out;
    }
    const recents = new Set(histList.filter((f) => f.pl === app.pl).map((f) => f.item.id));
    const hidden = hiddenSet();
    base = channels.map((c) => ({ c, v: classify(c, { pl: app.pl, catName: names.get(c.categoryId) || '', favs, recents, hidden }) }));
    const showHidden = (filters.personal || []).includes('Hidden channels');
    const out = base.filter(({ c, v }) => (showHidden || !hidden.has(`${app.pl}|${c.id}`)) && matches(v, filters)).map((x) => x.c);
    shown = out.length;
    drawChips();
    return out;
  }

  function drawChips() {
    const n = activeCount();
    badge.textContent = n ? String(n) : '';
    button.classList.toggle('on', n > 0);
    const list = [];
    for (const [f, label] of FACETS_K) for (const val of filters[f] || []) {
      list.push(h('button.f-chip', { title: `${label}: ${val} — click to remove`, onclick: () => { filters[f] = filters[f].filter((x) => x !== val); if (!filters[f].length) delete filters[f]; changed(); } }, h('small', label.split(' /')[0]), ` ${val} `, icon('x', 12)));
    }
    clear(chips, list.length ? [...list, h('button.f-clear', { onclick: () => { filters = {}; changed(); } }, 'Clear all'), h('span.muted.f-count', `${shown.toLocaleString()} ${noun}${shown === 1 ? '' : 's'}`)] : null);
    chips.hidden = !list.length;
  }

  function openPanel() {
    const body = h('div.filter-panel');
    const footer = h('div.f-foot.muted');
    const draw = () => {
      const now = base.filter(({ v }) => matches(v, filters)).length;
      clear(footer, `${now.toLocaleString()} of ${base.length.toLocaleString()} ${noun}s in “${catLabel()}” match.`);
      clear(body, FACETS_K.map(([f, label]) => {
        // Counts reflect every other active filter, so you see what each choice would leave.
        const others = { ...filters }; delete others[f];
        const counts = facetCounts(base.filter(({ v }) => matches(v, others)).map((x) => x.v), FACETS_K)[f];
        const vals = [...new Set([...counts.keys(), ...(filters[f] || [])])].sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0) || a.localeCompare(b));
        const sel = new Set(filters[f] || []);
        const sec = h('section.f-sec', h('h3', label, sel.size ? h('button.f-sec-clear', { onclick: () => { delete filters[f]; changed(); draw(); } }, 'clear') : null));
        if (!vals.length) { sec.append(h('div.muted', f === 'region' ? 'No local (state / city) channels found in this list.' : 'Nothing to filter here.')); return sec; }
        const list = h('div.f-vals');
        const fill = (all) => clear(list, (all ? vals : vals.slice(0, 24)).map((val) => h(`button.f-val${sel.has(val) ? '.on' : ''}`, {
          onclick: () => { const cur = new Set(filters[f] || []); if (cur.has(val)) cur.delete(val); else cur.add(val); if (cur.size) filters[f] = [...cur]; else delete filters[f]; changed(); draw(); },
        }, val, h('span.f-n', String(counts.get(val) || 0)))), !all && vals.length > 24 ? h('button.f-more', { onclick: () => fill(true) }, `+ ${vals.length - 24} more`) : null);
        fill(false);
        sec.append(list);
        return sec;
      }));
    };
    draw();
    modal(`Filter ${noun}s`, h('div', h('p.muted', live
      ? 'Pick any choices. Several in one group show channels matching any of them; choices in different groups narrow it down. The same filters apply in Live TV and the TV Guide. Most details are read from channel and category names, so channels your provider labels poorly may land under “Not stated”.'
      : `Pick any choices. Several in one group show ${noun}s matching any of them; choices in different groups narrow it down. Details come from the title, year, rating, date added and category names your provider sends, so poorly labelled titles may land under “Not stated”.`), body, footer), {
      wide: true,
      actions: [{ label: 'Clear all', onClick: () => { filters = {}; changed(); } }, { label: 'Done', primary: true, onClick: () => {} }],
    });
  }

  return { button, chips, apply, openPanel, activeCount, clear: () => { filters = {}; changed(); } };
}

// Small "Hide adult" tick box for Live TV, Movies and Series (on by default). It is the
// same setting as Settings > Parental controls > Hide adult content. Showing adult content
// asks for the parental PIN when one is set.
export function adultToggle(app, onChange) {
  const box = h('span.adult-box', { 'aria-hidden': 'true' }, icon('check', 12));
  const el = h('button.adult-toggle', {
    type: 'button',
    role: 'checkbox',
    onclick: async () => {
      const hide = app.settings.hideAdult !== false;
      if (hide && app.settings.parentalPin) {
        const pin = await prompt('Parental lock', 'Enter PIN to show adult content', '', { type: 'password' });
        if (pin == null) return;
        if (!(await api('checkPin', pin))) { toast('Wrong PIN', 'error'); return; }
      }
      app.settings = await api('setSettings', { hideAdult: !hide });
      draw();
      toast(hide ? 'Adult content is shown' : 'Adult content is hidden', 'info', 2000);
      onChange && onChange();
    },
    'aria-label': 'Hide adult content',
  }, h('span.adult-a', 'A'), box);
  const draw = () => {
    const on = app.settings.hideAdult !== false;
    el.classList.toggle('on', on);
    el.setAttribute('aria-checked', String(on));
    el.title = on ? 'Hide adult: on — adult channels, movies and series are hidden. Click to show them.' : 'Hide adult: off — adult content is showing. Click to hide it.';
  };
  draw();
  return el;
}

// Category rail: adult categories are hidden while "A" is ticked, otherwise listed last.
export const hideAdultCats = (app, cats) => (app.settings.hideAdult !== false ? cats.filter((c) => !c.adult) : [...cats.filter((c) => !c.adult), ...cats.filter((c) => c.adult)]);

// "Modify": tick titles the automatic adult detection missed (or got wrong) and move them to the
// bottom / mark them not adult. Your choices are remembered per title (survive refreshes, part of
// Backup). getShown() = the titles on screen; reload() redraws the list afterwards.
export function adultModify(app, { getShown, reload, noun = 'titles' }) {
  let on = false;
  const picked = new Set();
  const bar = h('div.dl-bulk.modify-bar');
  const button = h('button.btn.small.modify-btn', {
    type: 'button',
    title: 'Pick titles to move to the bottom (adult) or mark as not adult',
    onclick: () => { on = !on; picked.clear(); draw(); reload(); },
  }, 'Modify');
  const mkBtn = (label, fn, cls = '') => h(`button.btn.small${cls}`, { type: 'button', onclick: fn }, label);
  async function apply(value, what) {
    if (!picked.size) { toast(`Tick some ${noun} first`, 'warn', 2500); return; }
    const n = await api('markAdult', app.pl, [...picked], value);
    toast(`${n} ${n === 1 ? noun.replace(/s$/, '') : noun} ${what}`, 'success', 3000);
    picked.clear(); draw(); reload();
  }
  function draw() {
    button.classList.toggle('active', on);
    button.textContent = on ? 'Done' : 'Modify';
    clear(bar);
    bar.hidden = !on;
    if (!on) return;
    bar.append(...[
      h('span.muted', picked.size ? `${picked.size} selected` : `Tap ${noun} to tick them`),
      mkBtn('Select all', () => { for (const it of getShown()) picked.add(it.id); draw(); refreshTicks(); }),
      picked.size ? mkBtn('Select none', () => { picked.clear(); draw(); refreshTicks(); }) : null,
      mkBtn('Move to bottom (adult)', () => apply(true, 'moved to the bottom (adult)'), '.primary'),
      mkBtn('Not adult', () => apply(false, 'marked not adult')),
      mkBtn('Back to automatic', () => apply(null, 'set back to automatic')),
    ].filter(Boolean));
    if (app.settings.hideAdult !== false) bar.append(h('span.muted.small', 'Adult titles are hidden - untick "A" to see and change them.'));
  }
  // Re-mark tiles / rows already on screen.
  function refreshTicks() {
    document.querySelectorAll('[data-pick-id]').forEach((el) => el.classList.toggle('picked', picked.has(el.dataset.pickId)));
  }
  // Called by the list for each tile / row: in Modify mode a click ticks it instead of opening it.
  function decorate(el, it) {
    if (!on) return el;
    el.dataset.pickId = it.id;
    el.classList.add('pickable');
    el.classList.toggle('picked', picked.has(it.id));
    if (it.adult) el.append(h('span.adult-tag', { title: it.adultMark === true ? 'You moved this to the bottom' : 'Treated as adult' }, it.adultMark === true ? '18+ (you)' : '18+'));
    else if (it.adultMark === false) el.append(h('span.adult-tag.not', 'Not adult (you)'));
    el.addEventListener('click', (e) => {
      e.preventDefault(); e.stopImmediatePropagation();
      if (picked.has(it.id)) picked.delete(it.id); else picked.add(it.id);
      el.classList.toggle('picked', picked.has(it.id));
      draw();
    }, true);
    return el;
  }
  draw();
  return { button, bar, decorate, isOn: () => on };
}
