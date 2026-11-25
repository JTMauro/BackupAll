// Playlist / source management: Xtream Codes, M3U (URL or file), Stalker portal,
// extra XMLTV EPG sources, per-source user-agent and refresh options.
import { h, clear, icon, api, btn, modal, toast, errToast, confirmBox, passwordField, busyOverlay } from '../lib/dom.js';

export async function render(view, { app }) {
  const list = h('div.pl-list');
  view.append(h('div.page',
    h('div.page-head', h('h1', 'Playlists'), h('div.top-spacer'), btn('Add playlist', () => addDialog(app, draw), { iconName: 'plus', cls: 'primary' })),
    list));

  async function draw() {
    await app.refreshPlaylists();
    clear(list);
    if (!app.playlists.length) {
      list.append(h('div.empty', h('h2', 'Add your first playlist'), h('p', 'Supported: Xtream Codes API, M3U/M3U8 playlists (URL or file), Stalker/MAG portals, and XMLTV EPG guides.'), btn('Add playlist', () => addDialog(app, draw), { iconName: 'plus', cls: 'primary' })));
      return;
    }
    for (const p of app.playlists) {
      const epg = await api('epgInfo', p.id).catch(() => null);
      list.append(h(`div.pl-card${p.id === app.pl ? '.active' : ''}`,
        h('div.pl-kind', p.kind === 'xtream' ? 'XC' : p.kind === 'stalker' ? 'MAC' : 'M3U'),
        h('div.pl-info',
          h('div.pl-name', p.name, p.id === app.pl ? h('span.badge', 'ACTIVE') : null),
          h('div.muted', p.kind === 'xtream' ? `${p.server} · ${p.username}` : p.kind === 'stalker' ? `${p.portal} · ${p.mac}` : (p.url || p.file)),
          h('div.muted', epg ? `Guide: ${epg.channels} channels · updated ${new Date(epg.updated).toLocaleString()}${epg.errors && epg.errors.length ? ` · ${epg.errors.length} source error(s)` : ''}` : 'Guide: not loaded')),
        h('div.pl-actions',
          p.id !== app.pl ? btn('Use', () => { const b = busyOverlay(`Loading ${p.name}…`); app.loadPlaylist(p.id).then(() => { b.close(); toast(`Switched to ${p.name}`, 'success'); draw(); }).catch((e) => { b.close(); errToast(e); }); }) : null,
          btn('Refresh', () => { const b = busyOverlay(`Refreshing ${p.name} from your provider…`); app.loadPlaylist(p.id, true).then((r) => { b.close(); const miss = ((r && r.failed) || []).map((f) => ({ live: 'channels', movie: 'movies', series: 'series' }[f.type] || f.type)); if (miss.length) toast(`Refreshed, but the ${miss.join(' and ')} list couldn't be downloaded from your provider. Try again.`, 'error', 9000); else toast(r && r.counts ? `Refreshed · ${r.counts.live} channels, ${r.counts.movie} movies, ${r.counts.series} series` : 'Refreshed', 'success', 4000); api('refreshEpg', p.id).catch(() => {}); draw(); }).catch((e) => { b.close(); errToast(e); }); }, { iconName: 'refresh' }),
          btn('Edit', () => editDialog(app, p, draw), { iconName: 'edit' }),
          btn('', async () => { if (await confirmBox('Remove playlist', `Remove "${p.name}"? Favorites and history from it stay until you clear them.`, 'Remove', true)) { await api('removePlaylist', p.id); if (app.pl === p.id) { app.pl = null; localStorage.removeItem('playlist'); } draw(); } }, { iconName: 'trash', cls: 'danger', title: 'Remove' }))));
    }
  }
  draw();
}

function field(label, input, hint) {
  return h('label.field.wide', h('span', label), input, hint ? h('small.muted', hint) : null);
}

export function addDialog(app, done) {
  let kind = 'xtream';
  const tabs = h('div.seg');
  const form = h('div.form-grid');
  const inputs = {};
  const inp = (k, attrs = {}) => (inputs[k] = h('input.input', attrs));
  const draw = () => {
    clear(tabs, [['xtream', 'Xtream Codes'], ['m3u', 'M3U URL'], ['m3ufile', 'M3U file'], ['stalker', 'Stalker / MAC']].map(([id, l]) => h(`button.seg-btn${kind === id ? '.active' : ''}`, { onclick: () => { kind = id; draw(); } }, l)));
    clear(form,
      field('Playlist name', inp('name', { placeholder: 'My IPTV', value: (inputs.name && inputs.name.value) || '' })),
      kind === 'xtream' ? [
        field('Server URL', inp('server', { placeholder: 'http://example.com:8080' }), 'Include http:// and the port if your provider gave one.'),
        field('Username', inp('username', { autocomplete: 'off' })),
        field('Password', passwordField(inp('password', { type: 'password', autocomplete: 'off', value: (inputs.password && inputs.password.value) || '' }))),
      ] : null,
      kind === 'm3u' ? [
        field('M3U URL', inp('url', { placeholder: 'http://example.com/get.php?username=…&password=…&type=m3u_plus' }), 'Xtream get.php links are automatically upgraded to the full Xtream API (movies, series, catch-up).'),
      ] : null,
      kind === 'm3ufile' ? [
        h('div.field.wide', h('span', 'M3U file'), h('div.row', inp('file', { readOnly: true, placeholder: 'Choose a .m3u / .m3u8 file' }), btn('Browse…', async () => { const f = await api('chooseFile', [{ name: 'Playlists', extensions: ['m3u', 'm3u8', 'txt'] }]); if (f) inputs.file.value = f; }))),
      ] : null,
      kind === 'stalker' ? [
        field('Portal URL', inp('portal', { placeholder: 'http://portal.example.com/c/' })),
        field('MAC address', inp('mac', { placeholder: '00:1A:79:XX:XX:XX' })),
        field('Serial number (optional)', inp('serial')),
      ] : null,
      field('EPG / XMLTV URL (optional)', inp('epgUrl', { placeholder: 'http://example.com/xmltv.xml.gz — separate several with commas' }), 'Provider guides are used automatically; add extra sources here.'),
      h('details.wide', h('summary', 'Advanced'),
        h('div.form-grid',
          field('User-Agent (optional)', inp('userAgent', { placeholder: 'Leave empty for default' })),
          kind === 'xtream' ? h('label.field', h('span', 'Live stream format'), inputs.liveFormat = h('select.input', h('option', { value: 'ts' }, 'MPEG-TS (.ts)'), h('option', { value: 'm3u8' }, 'HLS (.m3u8)'))) : null,
          h('label.field', h('span', 'Auto refresh'), inputs.refreshHours = h('select.input', [6, 12, 24, 48, 168].map((n) => h('option', { value: n, selected: n === 24 }, n < 168 ? `Every ${n} hours` : 'Weekly')))))));
  };
  draw();
  const status = h('div.muted');
  modal('Add playlist', h('div', tabs, form, status), {
    wide: true,
    actions: [
      { label: 'Cancel', onClick: () => {} },
      {
        label: 'Add & load',
        primary: true,
        onClick: async () => {
          const v = (k) => (inputs[k] ? inputs[k].value.trim() : '');
          const cfg = { name: v('name') || 'My IPTV', epgUrl: v('epgUrl'), userAgent: v('userAgent'), refreshHours: Number(v('refreshHours')) || 24 };
          if (kind === 'xtream') Object.assign(cfg, { kind: 'xtream', server: v('server'), username: v('username'), password: inputs.password.value, liveFormat: v('liveFormat') || 'ts' });
          else if (kind === 'm3u') Object.assign(cfg, { kind: 'm3u', url: v('url') });
          else if (kind === 'm3ufile') Object.assign(cfg, { kind: 'm3u', file: v('file') });
          else Object.assign(cfg, { kind: 'stalker', portal: v('portal'), mac: v('mac'), serial: v('serial') });
          if (kind === 'xtream' && (!cfg.server || !cfg.username)) { toast('Server and username are required', 'error'); return false; }
          if (kind === 'm3u' && !cfg.url) { toast('Enter a playlist URL', 'error'); return false; }
          if (kind === 'm3ufile' && !cfg.file) { toast('Choose a file', 'error'); return false; }
          if (kind === 'stalker' && (!cfg.portal || !/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(cfg.mac))) { toast('Enter the portal URL and a MAC like 00:1A:79:12:34:56', 'error'); return false; }
          status.textContent = 'Connecting and loading channels…';
          let cancelled = false;
          const busy = busyOverlay(kind === 'm3ufile' ? 'Reading your playlist file…' : 'Connecting to your provider…', {
            onCancel: () => { cancelled = true; status.textContent = 'Stopped waiting. Check the server address, username and password, then try again.'; },
          });
          try {
            const id = await api('addPlaylist', cfg);
            if (cancelled) { done && done(); return false; }
            busy.set('Connected — loading channels, movies and series…');
            await app.loadPlaylist(id);
            busy.close();
            if (cancelled) return false;
            toast('Playlist added', 'success');
            done && done();
            app.navigate('home');
          } catch (e) { busy.close(); if (cancelled) return false; status.textContent = ''; errToast(e); return false; }
        },
      },
    ],
  });
}

function editDialog(app, p, done) {
  const name = h('input.input', { value: p.name });
  const epgUrl = h('input.input', { value: p.epgUrl || '' });
  const ua = h('input.input', { value: p.userAgent || '' });
  const server = h('input.input', { value: p.server || p.url || p.portal || '' });
  const user = h('input.input', { value: p.username || '' });
  const pass = h('input.input', { type: 'password', placeholder: p.hasPassword ? '(unchanged)' : '' });
  const useProv = h('input', { type: 'checkbox', checked: p.useProviderEpg !== false });
  const fmt = h('select.input', h('option', { value: 'ts', selected: p.liveFormat !== 'm3u8' }, 'MPEG-TS (.ts)'), h('option', { value: 'm3u8', selected: p.liveFormat === 'm3u8' }, 'HLS (.m3u8)'));
  modal(`Edit ${p.name}`, h('div.form-grid',
    field('Name', name),
    p.kind !== 'm3u' || p.url ? field(p.kind === 'xtream' ? 'Server URL' : p.kind === 'stalker' ? 'Portal URL' : 'M3U URL', server) : null,
    p.kind === 'xtream' ? [field('Username', user), field('Password', passwordField(pass))] : null,
    p.kind === 'xtream' ? h('label.field', h('span', 'Live format'), fmt) : null,
    field('Extra EPG URLs', epgUrl),
    h('label.field.check.wide', useProv, h('span', 'Also use the provider\'s own guide')),
    field('User-Agent', ua)), {
    wide: true,
    actions: [{ label: 'Cancel', onClick: () => {} }, { label: 'Save', primary: true, onClick: async () => {
      const patch = { name: name.value, epgUrl: epgUrl.value, userAgent: ua.value, useProviderEpg: useProv.checked };
      if (p.kind === 'xtream') Object.assign(patch, { server: server.value, username: user.value, liveFormat: fmt.value, ...(pass.value ? { password: pass.value } : {}) });
      else if (p.kind === 'stalker') patch.portal = server.value;
      else if (p.url) patch.url = server.value;
      await api('updatePlaylist', p.id, patch);
      if (p.id === app.pl) await app.loadPlaylist(p.id, true).catch(errToast);
      api('refreshEpg', p.id).catch(() => {});
      done && done();
    } }],
  });
}

export { icon };
