// Home: an immersive 3D launcher (floating menu over a WebGL scene) or a
// standard dashboard. Users switch between them and pick/design themes.
import { h, clear, icon, api, btn, modal, img, fmtDur, toast, errToast, prompt, confirmBox, viewSwitch, favButton, getView, menuFrom } from '../lib/dom.js';

const TILES = [
  { id: 'live', label: 'Live TV', icon: 'tv', big: true },
  { id: 'movies', label: 'Movies', icon: 'film', big: true },
  { id: 'series', label: 'Series', icon: 'series', big: true },
  { id: 'guide', label: 'TV Guide', icon: 'guide' },
  { id: 'favorites', label: 'Favorites', icon: 'star' },
  { id: 'history', label: 'Recently Viewed', icon: 'history' },
  { id: 'recordings', label: 'Recordings', icon: 'rec' },
  { id: 'downloads', label: 'Downloads', icon: 'download' },
  { id: 'search', label: 'Search', icon: 'search' },
  { id: 'multiview', label: 'Multi-View', icon: 'grid' },
  { id: 'playlists', label: 'Playlists', icon: 'playlist' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export const DEFAULT_LAUNCHER = { mode: '3d', theme: 'standard', quality: 'high', motion: true, custom: [] };

function launcherSettings(app) {
  return { ...DEFAULT_LAUNCHER, ...(app.settings.launcher || {}) };
}

async function saveLauncher(app, patch) {
  const l = { ...launcherSettings(app), ...patch };
  app.settings = await api('setSettings', { launcher: l });
  return l;
}

export async function render(view, { app }) {
  const l = launcherSettings(app);
  if (l.mode === '3d') return render3d(view, app, l);
  return renderStandard(view, app);
}

async function stats(app) {
  const [recs, dls, favs, hist, cont] = await Promise.all([api('recordings'), api('downloads'), api('favorites'), api('history'), api('continueWatching')]);
  const c = (app.summary && app.summary.counts) || {};
  return {
    live: c.live ? `${c.live.toLocaleString()} channels` : '',
    movies: c.movie ? `${c.movie.toLocaleString()} movies` : '',
    series: c.series ? `${c.series.toLocaleString()} shows` : '',
    favorites: favs.length ? `${favs.length} saved` : '',
    history: hist.length ? `${hist.length} item${hist.length === 1 ? '' : 's'}` : '',
    recordings: (() => { const n = recs.filter((r) => r.status === 'recording').length; const s = recs.filter((r) => r.status === 'scheduled').length; return n ? `● ${n} recording now` : s ? `${s} scheduled` : ''; })(),
    downloads: (() => { const n = dls.filter((d) => d.status === 'downloading' || d.status === 'queued').length; return n ? `${n} in progress` : dls.length ? `${dls.filter((d) => d.status === 'done').length} ready` : ''; })(),
    playlists: `${app.playlists.length} source${app.playlists.length === 1 ? '' : 's'}`,
    cont,
  };
}

// ---- 3D launcher ----------------------------------------------------------------
async function render3d(view, app, l) {
  document.body.classList.add('launcher-3d');
  const { THEMES, Backdrop } = await import('./scenes.js');
  const all = await allThemes(l);
  const theme = all[l.theme] || THEMES.standard;
  const p = theme.palette;
  const tileStyle = theme.tiles && theme.tiles.style && theme.tiles.style !== 'auto' ? theme.tiles.style : '';

  const canvas = h('canvas.l3d-canvas');
  const media = await mediaLayer(theme);
  const stage = h('div.l3d-stage');
  const clock = h('div.l3d-clock');
  const date = h('div.l3d-date');
  const t = theme.tiles || {};
  const root = h('div.launcher3d', { 'data-scene': theme.scene, 'data-tiles': tileStyle || null, style: { '--l-primary': p.primary, '--l-accent': p.accent, '--l-sky1': p.sky1, '--l-sky2': p.sky2, '--l-text': p.text || '#fff', '--l-radius': t.radius != null ? `${t.radius}px` : '', '--l-tile-opacity': t.opacity ?? '', '--l-glow': t.glow ?? '', '--l-font': t.font || (t.fontFile ? 'MuchSmarterThemeFont' : '') } },
    media,
    canvas,
    h('div.l3d-vignette'),
    h('header.l3d-head',
      h('div.l3d-brand', h('div.l3d-logo', icon('logo', 30)), h('div', h('div.l3d-name', 'MUCHSMARTER'))),
      h('div.l3d-time', clock, date),
      h('div.l3d-tools',
        h('button.l3d-tool', { title: 'Refresh catalog (channels, movies, series & guide)', onclick: async () => { await app.refreshCatalog(); app.navigate('home'); } }, icon('refresh', 18), h('span', 'Refresh')),
        h('button.l3d-tool', { title: 'Themes & backgrounds', onclick: () => themeDialog(app, () => app.navigate('home')) }, icon('layout', 18), h('span', 'Themes')),
        h('button.l3d-tool', { title: 'Switch to the standard screen', onclick: async () => { await saveLauncher(app, { mode: 'standard' }); app.navigate('home'); } }, icon('list', 18), h('span', 'Standard view')))),
    stage,
    h('div.l3d-cont'));
  view.append(root);

  let backdrop = null;
  try {
    backdrop = new Backdrop(canvas, { sceneName: theme.scene, palette: p, quality: l.quality, particles: theme.particles, motion: l.motion && !matchMedia('(prefers-reduced-motion: reduce)').matches });
    backdrop.start();
  } catch (e) {
    console.warn('WebGL unavailable', e);
    root.classList.add('no-webgl');
  }

  // Floating tiles arranged on a gentle curved arc.
  const s = await stats(app).catch(() => ({}));
  const tiles = TILES.map((t, i) => {
    const el = h(`button.l3d-tile${t.big ? '.big' : ''}`, { 'data-route': t.id, style: { '--i': i, '--delay': `${(i * 0.37) % 3}s` }, onclick: () => app.navigate(t.id) },
      h('div.l3d-tile-inner',
        h('div.l3d-icon', icon(t.icon, t.big ? 46 : 30)),
        h('div.l3d-label', t.label),
        s[t.id] ? h('div.l3d-stat', s[t.id]) : null),
      h('div.l3d-shine'));
    return el;
  });
  const row1 = h('div.l3d-row.big-row', tiles.filter((_, i) => TILES[i].big));
  const row2 = h('div.l3d-row', tiles.filter((_, i) => !TILES[i].big));
  stage.append(h('div.l3d-world', row1, row2));

  // Continue watching ribbon.
  if (s.cont && s.cont.length) {
    const contBox = root.querySelector('.l3d-cont');
    const drawCont = (list) => {
      if (!list.length) { clear(contBox); return; }
      clear(contBox, h('div.l3d-cont-title', 'Continue watching',
        h('button.l3d-cont-clear', { title: 'Remove everything from Continue watching', onclick: async () => { if (await confirmBox('Clear Continue watching', 'Remove every item from Continue watching? Your resume points are kept if you open them again.', 'Clear', true)) { await api('clearContinue'); drawCont([]); } } }, 'Clear all')),
        h('div.l3d-cont-row', list.slice(0, 6).map((c) => h('div.l3d-card', { role: 'button', tabIndex: 0, onclick: () => app.play(c.pl, c.item), onkeydown: (e) => { if (e.key === 'Enter') app.play(c.pl, c.item); } },
          contRemove(c, async () => drawCont(await api('continueWatching'))),
          img(c.item.logo, 'l3d-card-img', c.item.name),
        h('div.l3d-card-name', c.item.type === 'episode' ? `${c.item.seriesName} S${c.item.season}E${c.item.episode}` : c.item.name),
          h('div.l3d-card-bar', h('i', { style: { width: `${Math.min(100, (c.position / (c.duration || 1)) * 100)}%` } }))))));
    };
    drawCont(s.cont);
  }

  // Mouse parallax tilts the whole floating world.
  const world = stage.querySelector('.l3d-world');
  const onMove = (e) => {
    const r = root.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    world.style.setProperty('--rx', `${-y * 8}deg`);
    world.style.setProperty('--ry', `${x * 12}deg`);
    backdrop && backdrop.setMouse(x, y);
  };
  root.addEventListener('mousemove', onMove);

  // Keyboard / remote navigation across tiles.
  let focus = 0;
  const focusTile = (i) => { focus = (i + tiles.length) % tiles.length; tiles[focus].focus(); };
  const onKey = (e) => {
    if (document.querySelector('.modal-back')) return;
    const bigCount = TILES.filter((t) => t.big).length;
    if (e.key === 'ArrowRight') { focusTile(focus + 1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { focusTile(focus - 1); e.preventDefault(); }
    else if (e.key === 'ArrowDown' && focus < bigCount) { focusTile(bigCount + Math.round((focus / bigCount) * (tiles.length - bigCount))); e.preventDefault(); }
    else if (e.key === 'ArrowUp' && focus >= bigCount) { focusTile(Math.min(bigCount - 1, Math.floor(((focus - bigCount) / (tiles.length - bigCount)) * bigCount))); e.preventDefault(); }
  };
  tiles.forEach((t, i) => t.addEventListener('focus', () => { focus = i; }));
  document.addEventListener('keydown', onKey);
  setTimeout(() => tiles[0].focus({ preventScroll: true }), 50);

  // Drop a .smartertheme / theme.json anywhere on the launcher to install it.
  root.addEventListener('dragover', (e) => { e.preventDefault(); root.classList.add('drop'); });
  root.addEventListener('dragleave', () => root.classList.remove('drop'));
  root.addEventListener('drop', async (e) => {
    e.preventDefault();
    root.classList.remove('drop');
    const f = e.dataTransfer.files[0];
    if (!f) return;
    try {
      const th = await api('importTheme', window.api.pathForFile(f));
      await saveLauncher(app, { theme: th.id, mode: '3d' });
      toast(`Installed theme "${th.name}"`, 'success');
      app.navigate('home');
    } catch (err) { errToast(err); }
  });

  const tick = () => {
    const d = new Date();
    clock.textContent = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: app.settings.timeFormat !== '24h' });
    date.textContent = d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  };
  tick();
  const timer = setInterval(tick, 10000);

  return () => {
    clearInterval(timer);
    document.removeEventListener('keydown', onKey);
    document.body.classList.remove('launcher-3d');
    backdrop && backdrop.dispose();
    media && media.querySelector('video') && media.querySelector('video').pause();
  };
}

// Built-in + user-designed + installed (imported) themes, keyed by id.
async function allThemes(l) {
  const { THEMES } = await import('./scenes.js');
  const all = {};
  for (const [id, t] of Object.entries(THEMES)) all[id] = { id, ...t };
  for (const c of l.custom || []) all[c.id] = c;
  for (const t of await api('themes').catch(() => [])) all[t.id] = t;
  return all;
}

// Image / video background for uploaded themes (served through the local media server).
async function mediaLayer(theme) {
  const a = theme.assets || {};
  const bg = theme.background || {};
  const src = async (ref) => (!ref ? '' : /^(https?:|data:)/i.test(ref) ? ref : api('variant', { file: ref }));
  if (a.font) {
    try {
      const face = new FontFace('MuchSmarterThemeFont', `url("${await src(a.font)}")`);
      document.fonts.add(await face.load());
    } catch (_) { /* bad font file */ }
  }
  if (!a.video && !a.image) return null;
  const style = { objectFit: bg.fit || 'cover', filter: bg.blur ? `blur(${bg.blur}px)` : '' };
  const el = a.video
    ? h('video.l3d-media-el', { src: await src(a.video), autoplay: true, loop: true, muted: true, playsInline: true, style })
    : h(`img.l3d-media-el${bg.kenBurns !== false ? '.kenburns' : ''}`, { src: await src(a.image), alt: '', style });
  if (a.video) el.muted = true;
  return h('div.l3d-media', el, h('div.l3d-media-dim', { style: { opacity: bg.dim ?? 0.35 } }));
}

// ---- Theme picker / custom theme designer --------------------------------------------
export async function themeDialog(app, onChange) {
  const { THEMES } = await import('./scenes.js');
  let l = launcherSettings(app);
  const body = h('div.theme-dialog');
  let installed = await api('themes').catch(() => []);
  const thumbSrc = {};
  for (const t of installed) if (t.assets && t.assets.image) thumbSrc[t.id] = /^(https?:|data:)/.test(t.assets.image) ? t.assets.image : await api('variant', { file: t.assets.image });
  const reload = async () => { installed = await api('themes').catch(() => []); for (const t of installed) if (t.assets && t.assets.image && !thumbSrc[t.id]) thumbSrc[t.id] = /^(https?:|data:)/.test(t.assets.image) ? t.assets.image : await api('variant', { file: t.assets.image }); };
  const draw = () => {
    const all = [...Object.entries(THEMES).map(([id, t]) => ({ id, ...t })), ...(l.custom || []), ...installed];
    const current = all.find((t) => t.id === l.theme);
    clear(body,
      h('h3', 'Background'),
      h('div.theme-grid', all.map((t) => h(`button.theme-card${l.theme === t.id ? '.on' : ''}`, {
        onclick: async () => { l = await saveLauncher(app, { theme: t.id, mode: '3d' }); draw(); onChange && onChange(); },
        style: { background: `${thumbSrc[t.id] ? `linear-gradient(transparent, #0008), url("${thumbSrc[t.id]}") center/cover, ` : ''}radial-gradient(circle at 70% 30%, ${t.palette.primary}55, transparent 50%), radial-gradient(circle at 20% 80%, ${t.palette.accent}55, transparent 50%), linear-gradient(160deg, ${t.palette.sky2}, ${t.palette.sky1})` },
      }, h('span.theme-name', t.name), t.installed ? h('span.theme-tag', t.author ? `by ${t.author}` : 'Imported') : t.custom ? h('span.theme-tag', 'Custom') : null))),
      h('div.theme-actions',
        btn('Create your own…', () => customThemeDialog(app, null, async (nl) => { l = nl; draw(); onChange && onChange(); }), { iconName: 'plus', cls: 'primary' }),
        btn('Import theme…', async () => {
          try {
            const th = await api('importTheme');
            if (!th) return;
            await reload();
            l = await saveLauncher(app, { theme: th.id, mode: '3d' });
            toast(`Installed "${th.name}"`, 'success');
            draw(); onChange && onChange();
          } catch (e) { errToast(e); }
        }, { iconName: 'download', title: 'Install a .smartertheme package or theme.json' }),
        current ? btn('Export / share', () => api('exportTheme', current).then((f) => f && toast('Theme exported', 'success')).catch(errToast), { iconName: 'external' }) : null,
        btn('Theme template', () => api('themeTemplate').then((d) => d && toast('Template created — see THEME_FORMAT.md inside', 'success')).catch(errToast), { iconName: 'folder', title: 'Create a starter theme folder you can edit and zip' }),
        current && current.custom && !current.installed ? btn('Edit this theme', () => customThemeDialog(app, current, async (nl) => { l = nl; draw(); onChange && onChange(); }), { iconName: 'edit' }) : null,
        current && current.custom ? btn('Delete this theme', async () => {
          if (!(await confirmBox('Delete theme', `Delete "${current.name}"?`, 'Delete', true))) return;
          if (current.installed) { await api('removeTheme', current.id); await reload(); l = await saveLauncher(app, { theme: 'standard' }); }
          else l = await saveLauncher(app, { custom: l.custom.filter((c) => c.id !== l.theme), theme: 'standard' });
          draw(); onChange && onChange();
        }, { iconName: 'trash', cls: 'danger' }) : null),
      h('p.muted', 'Tip: drag a .smartertheme file onto the home screen to install it.'),
      h('h3', 'Graphics'),
      h('div.form-grid',
        h('label.field', h('span', 'Home screen style'), h('select.input', { onchange: async (e) => { l = await saveLauncher(app, { mode: e.target.value }); onChange && onChange(); } },
          h('option', { value: '3d', selected: l.mode === '3d' }, 'High-graphics 3D launcher'),
          h('option', { value: 'standard', selected: l.mode === 'standard' }, 'Standard screen'))),
        h('label.field', h('span', 'Quality'), h('select.input', { onchange: async (e) => { l = await saveLauncher(app, { quality: e.target.value }); onChange && onChange(); } },
          ['high', 'medium', 'low'].map((q) => h('option', { value: q, selected: l.quality === q }, { high: 'High (bloom, max particles)', medium: 'Balanced', low: 'Low (older PCs)' }[q])))),
        h('label.field.check', h('input', { type: 'checkbox', checked: l.motion, onchange: async (e) => { l = await saveLauncher(app, { motion: e.target.checked }); onChange && onChange(); } }), h('span', 'Animate background and floating menu'))));
  };
  draw();
  modal('Themes & backgrounds', body, { wide: true });
}

function customThemeDialog(app, existing, done) {
  const base = existing || { id: `custom-${Date.now().toString(36)}`, name: 'My theme', scene: 'standard', custom: true, palette: { sky1: '#0b1026', sky2: '#2a1650', primary: '#4f8cff', accent: '#b26bff', particles: '#ffffff' } };
  const t = JSON.parse(JSON.stringify(base));
  const preview = h('div.theme-preview');
  const paint = () => {
    const p = t.palette;
    preview.style.background = `radial-gradient(circle at 70% 30%, ${p.primary}66, transparent 50%), radial-gradient(circle at 20% 80%, ${p.accent}66, transparent 50%), linear-gradient(160deg, ${p.sky2}, ${p.sky1})`;
    preview.style.setProperty('--l-primary', p.primary);
    preview.style.setProperty('--l-accent', p.accent);
  };
  preview.append(h('div.theme-preview-tile', icon('tv', 28), h('span', 'Live TV')), h('div.theme-preview-tile', icon('film', 28), h('span', 'Movies')));
  const mediaName = h('span.muted', (t.background && (t.background.image || t.background.video) || 'None').split(/[\\/]/).pop());
  const color = (key, label) => h('label.field', h('span', label), h('input', { type: 'color', value: t.palette[key], oninput: (e) => { t.palette[key] = e.target.value; paint(); } }));
  const body = h('div.custom-theme',
    preview,
    h('div.form-grid',
      h('label.field', h('span', 'Name'), h('input.input', { value: t.name, oninput: (e) => { t.name = e.target.value; } })),
      h('label.field', h('span', 'Scene style'), h('select.input', { onchange: (e) => { t.scene = e.target.value; } },
        [['standard', 'Floating shapes & stars'], ['techno', 'Neon grid (Techno)'], ['paleolithic', 'Stone age: standing stones & mammoths (Paleolithic)'], ['volcano', 'Erupting volcano & hellfire (Volcanic)'], ['futuristic', 'Holo tunnel (Futuristic)'], ['aurora', 'Aurora sky'], ['ocean', 'Underwater'], ['image', 'My picture'], ['video', 'My video']].map(([v, n]) => h('option', { value: v, selected: t.scene === v }, n)))),
      h('div.field', h('span', 'Background picture / video'), h('div.row', mediaName,
        btn('Choose…', async () => {
          const f = await api('chooseFile', [{ name: 'Images & videos', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'mp4', 'webm', 'm4v'] }]);
          if (!f) return;
          const isVideo = /\.(mp4|webm|m4v)$/i.test(f);
          t.scene = isVideo ? 'video' : 'image';
          t.background = { ...(t.background || {}), image: isVideo ? '' : f, video: isVideo ? f : '', dim: 0.35, kenBurns: true };
          t.assets = { image: t.background.image, video: t.background.video };
          mediaName.textContent = f.split(/[\\/]/).pop();
          body.querySelector('select').value = t.scene;
        }))),
      h('label.field', h('span', 'Particles over picture'), h('select.input', { onchange: (e) => { t.particles = { ...(t.particles || {}), type: e.target.value }; } },
        ['none', 'stars', 'embers', 'snow', 'bubbles', 'rain'].map((v) => h('option', { value: v, selected: (t.particles && t.particles.type) === v }, v[0].toUpperCase() + v.slice(1))))),
      h('label.field', h('span', 'Tile style'), h('select.input', { onchange: (e) => { t.tiles = { ...(t.tiles || {}), style: e.target.value }; } },
        [['auto', 'Match scene'], ['glass', 'Glass'], ['neon', 'Neon'], ['stone', 'Stone'], ['holo', 'Hologram'], ['flat', 'Flat']].map(([v, n]) => h('option', { value: v, selected: ((t.tiles && t.tiles.style) || 'auto') === v }, n)))),
      color('sky1', 'Background top'),
      color('sky2', 'Background bottom'),
      color('primary', 'Primary glow'),
      color('accent', 'Accent'),
      color('particles', 'Particles / stars')));
  paint();
  modal(existing ? 'Edit theme' : 'Create your own theme', body, {
    wide: true,
    actions: [
      { label: 'Cancel', onClick: () => {} },
      {
        label: 'Save & use',
        primary: true,
        onClick: async () => {
          const l = launcherSettings(app);
          const custom = [...(l.custom || []).filter((c) => c.id !== t.id), { ...t, custom: true }];
          const nl = await saveLauncher(app, { custom, theme: t.id, mode: '3d' });
          done && done(nl);
        },
      },
    ],
  });
}

// ✕ on a Continue watching card: hides it there (the resume point is kept).
function contRemove(c, after) {
  return h('button.cont-remove', {
    title: 'Remove from Continue watching',
    'aria-label': 'Remove from Continue watching',
    onclick: async (e) => {
      e.stopPropagation();
      await api('removeContinue', c.pl, c.item.id);
      toast(`Removed "${c.item.type === 'episode' ? c.item.seriesName : c.item.name}" from Continue watching`, 'info', 2000);
      after && after();
    },
    onkeydown: (e) => e.stopPropagation(),
  }, icon('x', 14));
}

// ✕ on a Recently viewed card. Episodes ask: just this episode, or the whole show.
function histRemove(e, after) {
  const it = e.item;
  const show = it.type === 'episode' || it.type === 'series';
  const name = it.type === 'episode' ? it.seriesName : it.name;
  const removeOne = async () => { await api('removeHistory', e.pl, it.id); toast(`Removed "${it.type === 'episode' ? `${name} S${it.season}E${it.episode}` : name}" from Recently viewed`, 'info', 2000); after && after(); };
  const removeShow = async () => { await api('removeHistoryShow', e.pl, it.type === 'series' ? it.id : it.seriesId); toast(`Removed "${name}" from Recently viewed`, 'info', 2000); after && after(); };
  return h('button.cont-remove', {
    title: 'Remove from Recently viewed',
    'aria-label': 'Remove from Recently viewed',
    onclick: (ev) => {
      ev.stopPropagation();
      if (!show) return removeOne();
      menuFrom(ev.currentTarget, [
        it.type === 'episode' ? { label: `Remove this episode (S${it.season}E${it.episode})`, icon: 'x', onClick: removeOne } : null,
        { label: `Remove the whole show "${name}"`, icon: 'trash', onClick: removeShow },
      ].filter(Boolean));
    },
    onkeydown: (ev) => ev.stopPropagation(),
  }, icon('x', 14));
}

// ---- Standard home -------------------------------------------------------------------
async function renderStandard(view, app) {
  const s = await stats(app).catch(() => ({ cont: [] }));
  const [favs, hist] = await Promise.all([api('favorites'), api('history')]);
  const favSet = new Set(favs.map((f) => `${f.pl}|${f.item.id}`));
  const rails = [];
  const open = (e) => (e.item.type === 'series' ? app.navigate('series', { details: e.item }) : app.play(e.pl, e.item));
  const card = (e) => h('div.mini-card', { role: 'button', tabIndex: 0, onclick: () => open(e), onkeydown: (ev) => { if (ev.key === 'Enter') open(e); } },
    h('div.mini-card-thumb', img(e.item.logo, 'mini-card-img', e.item.name), e.item.type !== 'episode' ? favButton(e.pl, e.item, favSet.has(`${e.pl}|${e.item.id}`)) : null),
    h('div.mini-card-name', e.item.type === 'episode' ? `${e.item.seriesName} · S${e.item.season}E${e.item.episode}` : e.item.name),
    e.position && e.duration ? h('div.progress', h('i', { style: { width: `${(e.position / e.duration) * 100}%` } })) : null);
  const acct = app.summary && app.summary.account;
  function rail(cards) { const r = h('div.h-scroll', { 'data-view': getView('home', 'medium') }, cards); rails.push(r); return r; }
  clear(view,
    h('div.home-std',
      h('div.home-head',
        h('h1', 'Welcome back'),
        h('div.home-head-actions',
          btn('Refresh catalog', async () => { await app.refreshCatalog(); app.navigate('home'); }, { iconName: 'refresh' }),
          btn('3D launcher', async () => { await saveLauncher(app, { mode: '3d' }); app.navigate('home'); }, { iconName: 'layout' }),
          btn('Themes', () => themeDialog(app, () => app.navigate('home')), { iconName: 'edit' }))),
      h('div.tile-row', TILES.slice(0, 8).map((t) => h('button.home-tile', { onclick: () => app.navigate(t.id) }, icon(t.icon, 28), h('span', t.label), s[t.id] ? h('small', s[t.id]) : null))),
      s.cont && s.cont.length || favs.length || hist.length ? h('div.home-view-row', h('div.top-spacer'), viewSwitch('home', [], { fallback: 'medium', onChange: (v) => rails.forEach((r) => { r.dataset.view = v; }) })) : null,
      s.cont && s.cont.length ? h('section.cont-section', h('div.section-head', h('h2', 'Continue watching'), btn('Clear all', async (e) => { if (await confirmBox('Clear Continue watching', 'Remove every item from Continue watching? Your resume points are kept if you open them again.', 'Clear', true)) { await api('clearContinue'); e.target.closest('section').remove(); } }, { iconName: 'x', cls: 'small' })),
        rail(s.cont.map((e) => { const c = card(e); c.querySelector('.mini-card-thumb').append(contRemove(e, () => { const sec = c.closest('section'); c.remove(); if (sec && !sec.querySelector('.mini-card')) sec.remove(); })); return c; }))) : null,
      favs.length ? h('section', h('h2', 'Favorites'), rail(favs.slice(0, 30).map(card))) : null,
      hist.length ? h('section.cont-section', h('div.section-head', h('h2', 'Recently viewed'), btn('Clear all', async (e) => { if (await confirmBox('Clear recently viewed', 'Remove everything from Recently viewed?', 'Clear', true)) { await api('clearHistory'); e.target.closest('section').remove(); } }, { iconName: 'x', cls: 'small' })),
        rail(hist.slice(0, 30).map((e) => { const c = card(e); c.querySelector('.mini-card-thumb').append(histRemove(e, () => { const sec = c.closest('section'); c.remove(); if (sec && !sec.querySelector('.mini-card')) sec.remove(); })); return c; }))) : null,
      acct ? h('section.account', h('h2', 'Subscription'), h('div.kv',
        h('span', 'Status'), h('b', acct.status || '—'),
        h('span', 'Expires'), h('b', acct.expires ? new Date(acct.expires).toLocaleDateString() : 'Unlimited'),
        acct.maxConnections ? [h('span', 'Connections'), h('b', `${acct.activeConnections} / ${acct.maxConnections}`)] : null)) : null,
      !app.playlists.length ? h('div.empty', h('h2', 'No playlists yet'), h('p', 'Add an Xtream Codes login, M3U playlist or Stalker portal to get started.'), btn('Add playlist', () => app.navigate('playlists'), { cls: 'primary', iconName: 'plus' })) : null));
}
