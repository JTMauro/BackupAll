// Settings: general, home screen/themes, playback, captions, recording,
// downloads, guide, parental controls, shortcuts and about.
import { h, clear, api, btn, toast, prompt, icon, modal, confirmBox } from '../lib/dom.js';
import { BACKGROUNDS, ACCENTS, applyColors, systemColors, setBackgroundImage, hasBackgroundImage } from '../lib/theme.js';
import { buildBackup, summarize, restoreBackup, autoBackupNow } from '../lib/backup.js';
import { captionStyleDialog, BUFFER_CHOICES, bufferLabel, QUALITIES } from '../player/player.js';
import { themeDialog } from './home.js';

// Desktop-only settings (folders, ffmpeg, tray…) are hidden on phones.
const DESKTOP = (window.api.capabilities || {}).desktop !== false;

export async function render(view, { app }) {
  const info = await api('appInfo');
  let bInfo = await api('backupInfo').catch(() => null);
  const sInfo = await api('shareInfo').catch(() => null);
  const wrap = h('div.page.settings');
  view.append(wrap);
  let s = app.settings;

  const save = async (patch) => {
    s = app.settings = await api('setSettings', patch);
    toast('Saved', 'success', 1000);
  };
  const row = (label, control, hint) => h('div.set-row', h('div.set-label', h('div', label), hint ? h('small.muted', hint) : null), h('div.set-control', control));
  const select = (key, opts, map = (v) => v) => h('select.input', { onchange: (e) => save({ [key]: map(e.target.value) }) }, opts.map(([v, l]) => h('option', { value: v, selected: String(s[key]) === String(v) }, l)));
  const num = (key, min, max, step = 1) => h('input.input.num', { type: 'number', min, max, step, value: s[key], onchange: (e) => save({ [key]: Number(e.target.value) }) });
  const check = (key) => h('input.switch', { type: 'checkbox', checked: !!s[key], onchange: (e) => save({ [key]: e.target.checked }) });
  const text = (key, placeholder) => h('input.input', { value: s[key] || '', placeholder, onchange: (e) => save({ [key]: e.target.value.trim() }) });
  const folder = (key) => h('div.row', h('input.input', { value: s[key], readOnly: true }), btn('Change…', async () => { const d = await api('chooseFolder', 'Choose folder'); if (d) { await save({ [key]: d }); draw(); } }), btn('Open', () => api('openPath', s[key])));
  const fileSel = (key, label) => h('div.row', h('input.input', { value: s[key] || '', placeholder: label, onchange: (e) => save({ [key]: e.target.value.trim() }) }), btn('Browse…', async () => { const f = await api('chooseFile', []); if (f) { await save({ [key]: f }); draw(); } }));

  // Colour dots for the background and accent pickers.
  const colorDots = (kind) => {
    const isBg = kind === 'theme';
    const cur = isBg ? (s.theme || 'dark') : (s.accent || '#3d8bfd');
    const dot = (style, title, on, onClick, content) => h(`button.cdot${on ? '.on' : ''}`, { title, 'aria-label': title, style, onclick: onClick }, content || null);
    const custom = h('input.cdot-input', { type: 'color', value: isBg ? (s.bgColor || '#202833') : (/^#/.test(cur) ? cur : '#3d8bfd'),
      oninput: (e) => { const v = e.target.value; if (isBg) applyColors({ ...s, theme: 'custom', bgColor: v }); else applyColors({ ...s, accent: v }); },
      onchange: async (e) => { await save(isBg ? { theme: 'custom', bgColor: e.target.value } : { accent: e.target.value }); draw(); } });
    const pick = async (patch) => { await save(patch); draw(); };
    const sysC = systemColors();
    const dots = isBg
      ? BACKGROUNDS.filter((b) => !b.rainbow).map((b) => b.system
        ? dot({ background: 'linear-gradient(135deg, #f5f7fa 50%, #0d1117 50%)' }, 'Match Windows (light / dark)', cur === 'system', () => pick({ theme: 'system' }), icon('settings', 14))
        : dot({ background: b.bg }, b.name, cur === b.id, () => pick({ theme: b.id })))
      : [dot({ background: sysC.accent ? `conic-gradient(${sysC.accent} 0 75%, #fff 0)` : 'conic-gradient(#3d8bfd, #3fb950, #ffd23f, #f2545b, #b26bff, #3d8bfd)' }, sysC.accent ? 'Match Windows accent colour' : 'Match system accent colour (default blue if your system has none)', cur === 'system', () => pick({ accent: 'system' }), icon('settings', 14)),
        ...ACCENTS.map((c) => dot({ background: c }, c, cur.toLowerCase() === c, () => pick({ accent: c })))];
    const customOn = isBg ? cur === 'custom' : cur !== 'system' && !ACCENTS.includes(cur.toLowerCase());
    const main = h('div.cdots', dots, h(`label.cdot.cdot-custom${customOn ? '.on' : ''}`, { title: 'Any colour…', style: customOn ? { background: isBg ? s.bgColor : cur } : null }, icon('plus', 14), custom));
    if (!isBg) return main;
    // Rainbow row: deep shades, then soft (light) shades.
    const rainbow = h('div.cdots.cdots-sub', { title: 'Rainbow colours' }, BACKGROUNDS.filter((b) => b.rainbow).map((b) => dot({ background: b.bg }, b.name, cur === b.id, () => pick({ theme: b.id }))));
    return h('div', main, rainbow);
  };

  // Background picture: Windows wallpapers, any picture, or none.
  const usePicture = async (getUrl) => {
    try { const url = await getUrl(); if (url) { setBackgroundImage(url); s = app.settings = await api('getSettings'); applyColors(s); toast('Background picture set', 'success', 1500); draw(); } } catch (e) { toast(e.message || String(e), 'error', 5000); }
  };
  const wallpaperDialog = async () => {
    const grid = h('div.bg-pick-grid', h('div.spinner'));
    const m = modal('Windows backgrounds', h('div', h('p.muted', 'Pictures that came with Windows, and your current desktop wallpaper. Click one to use it.'), grid), {
      wide: true,
      actions: [{ label: 'Browse for a picture…', onClick: () => { usePicture(() => api('pickBackgroundImage')); } }, { label: 'Close', primary: true, onClick: () => {} }],
    });
    const list = await api('wallpapers').catch(() => []);
    clear(grid, list.length ? list.map((w) => h('button.bg-pick', { title: w.name, onclick: () => { m.close && m.close(); usePicture(() => api('setBackgroundImage', w.file)); } }, h('img', { src: w.thumb, alt: '' }), h('span', w.current ? `★ ${w.name}` : w.name)))
      : h('div.muted', 'No built-in backgrounds found here. Use “Browse for a picture…”.'));
  };

  const sections = {
    General: () => [
      row('Start screen', select('startPage', [['home', 'Home'], ['live', 'Live TV'], ['guide', 'TV Guide'], ['movies', 'Movies'], ['series', 'Series'], ['favorites', 'Favorites']])),
      row('Background colour', colorDots('theme'), 'Pick a dot, "Match Windows" to follow your Windows light/dark mode, or + for any colour.'),
      row('Accent colour', colorDots('accent'), 'Buttons, highlights and the progress bar.'),
      row('Colour pulse', check('colorPulse'), 'A soft glow in your accent colour that slowly drifts, so the background isn\'t one flat colour. Turn off for a plain background.'),
      row('Background picture', h('div.row',
        DESKTOP ? btn('Windows backgrounds…', () => wallpaperDialog(), { iconName: 'layout' }) : null,
        btn(DESKTOP ? 'Choose picture…' : 'Choose a picture…', () => usePicture(() => api('pickBackgroundImage')), { iconName: 'folder' }),
        hasBackgroundImage() && s.bgImage !== false ? btn('Remove', async () => { await api('setBackgroundImage', null); setBackgroundImage(null); s = app.settings = await api('getSettings'); applyColors(s); draw(); }, { iconName: 'x' }) : null),
        DESKTOP ? 'Use a Windows wallpaper (or your current one) or any picture behind the app. The colour above tints it.' : 'Any picture from this device, behind the app. The colour above tints it.'),
      hasBackgroundImage() && s.bgImage !== false ? row('Picture tint', select('bgDim', [['light', 'Light — picture shows strongly'], ['medium', 'Medium'], ['strong', 'Strong — easiest to read']])) : null,
      window.api.platform === 'android' ? row('Screen rotation', h('select.input', { onchange: async (e) => { await save({ orientation: e.target.value }); api('setOrientation', e.target.value, s.videoLandscape !== false); } },
        [['free', 'Turn with the phone (even with rotation lock on)'], ['auto', 'Follow my phone\'s rotation setting'], ['portrait', 'Always upright'], ['landscape', 'Always sideways']].map(([v, l]) => h('option', { value: v, selected: (s.orientation || 'free') === v }, l))), 'How MuchSmarter turns when you turn the phone.') : null,
      window.api.platform === 'android' ? row('Full-screen video turns sideways', h('input.switch', { type: 'checkbox', checked: s.videoLandscape !== false, onchange: async (e) => { await save({ videoLandscape: e.target.checked }); api('setOrientation', s.orientation || 'free', e.target.checked); } })) : null,
      row('Update library when the app starts', select('startupRefresh', [['ask', 'Ask me each time'], ['always', 'Always update'], ['never', 'Never — use the saved library (update with Refresh catalog)']]), 'Downloads the latest channels, movies and series from your provider.'),
      row('Clock', select('timeFormat', [['12h', '12-hour'], ['24h', '24-hour']])),
      DESKTOP ? row('Keep running in tray for recordings', check('closeToTray'), 'Closing the window won\'t stop scheduled recordings.') : null,
    ],
    'Backup & restore': () => [
      bInfo && !bInfo.manual ? row('Automatic backup', h('div.row', check('autoBackup'), btn('Back up now', async () => { await autoBackupNow({ quiet: false }); bInfo = await api('backupInfo'); draw(); }, { iconName: 'check' })),
        'Saves everything to one file a few seconds after any change. Restored automatically offered after a reinstall.') : null,
      bInfo && !bInfo.manual ? row('Backup folder', h('div.row', h('input.input', { value: bInfo.dir, readOnly: true }), btn('Open', () => api('openBackupFolder'), { iconName: 'folder' })),
        `Outside the app's folder, so installing, updating, uninstalling or replacing the app never deletes it.${bInfo.saved ? ` Last saved ${new Date(bInfo.saved).toLocaleString()}.` : ' Nothing saved yet.'}`) : null,
      DESKTOP ? row('Ask to back up when closing', check('askBackupOnExit'), 'When you close MuchSmarter: "Back up before closing?" — Back up & close, Close without backup, or Cancel.') : null,
      row('Export everything', btn(window.api.platform === 'android' ? 'Back up now' : 'Export backup…', () => exportBackup(), { iconName: 'download', cls: 'primary' }),
        `${window.api.platform === 'android' ? 'Saves to Downloads › MuchSmarter Backups on this phone. ' : ''}One .msbackup file with your settings, playlists & logins, favorites (with groups), recently viewed & resume points, recordings & series rules, downloads list, themes and screen layout choices.`),
      row('Restore', h('div.row',
        bInfo && !bInfo.manual && bInfo.exists ? btn('Restore latest automatic backup', () => restoreAuto(), { iconName: 'refresh', cls: 'primary' }) : null,
        btn('Restore from a backup file…', () => importBackup(), { iconName: 'folder' })),
        `After reinstalling (or on a new PC / phone): bring back everything from a backup. The app restarts when done.${bInfo && bInfo.exists && bInfo.saved ? ` Latest automatic backup: ${new Date(bInfo.saved).toLocaleString()}.` : ''}`),
      h('p.muted', '🔒 The backup contains your provider usernames and passwords. Keep it somewhere private.'),
      h('h3', 'Sharing MuchSmarter with someone'),
      h('p.muted', sInfo && sInfo.portable
        ? 'This is the no-install copy: your playlists, logins, favorites and history are inside its "data" folder. Don\'t share this folder — make a clean copy instead.'
        : 'Share the original installer or zip you downloaded: it never contains your playlists, logins or history. Your data stays on this computer.'),
      sInfo && sInfo.portable ? row('Make a clean copy to share', btn('Make clean copy…', async () => { const d = await api('makeCleanCopy'); if (d) toast(`Clean copy made: ${d} — no playlists, logins or history in it`, 'success', 7000); }, { iconName: 'folder', cls: 'primary' }),
        'Copies the program to a folder you pick (USB stick, Desktop…) without your data. The person you give it to starts with an empty app.') : null,
      row('Erase all my data from this computer', btn('Erase everything…', () => eraseAll(), { iconName: 'trash', cls: 'danger' }),
        'Removes playlists and logins, favorites, recently viewed, resume points, settings, themes and the recordings/downloads lists, then restarts empty. Video files you recorded or downloaded are not deleted.'),
    ],
    'Home screen & themes': () => {
      const l = { mode: '3d', quality: 'high', motion: true, ...(s.launcher || {}) };
      const setL = (patch) => save({ launcher: { ...l, ...patch } });
      return [
        row('Home screen style', h('select.input', { onchange: (e) => setL({ mode: e.target.value }) },
          h('option', { value: '3d', selected: l.mode === '3d' }, 'High-graphics 3D launcher'),
          h('option', { value: 'standard', selected: l.mode === 'standard' }, 'Standard screen')), 'Switch back to a simple screen any time.'),
        row('Graphics quality', h('select.input', { onchange: (e) => setL({ quality: e.target.value }) }, [['high', 'High'], ['medium', 'Balanced'], ['low', 'Low (older PCs)']].map(([v, n]) => h('option', { value: v, selected: l.quality === v }, n)))),
        row('Animations', h('input.switch', { type: 'checkbox', checked: l.motion, onchange: (e) => setL({ motion: e.target.checked }) })),
        row('Background theme', h('div.row',
          btn('Choose / create theme…', () => themeDialog(app), { iconName: 'layout', cls: 'primary' }),
          btn('Import theme…', () => api('importTheme').then(async (t) => { if (t) { await setL({ theme: t.id, mode: '3d' }); toast(`Installed "${t.name}"`, 'success'); } }).catch((e) => toast(e.message, 'error')), { iconName: 'download' }),
          btn('Theme template', () => api('themeTemplate'), { iconName: 'folder' })),
          'Built-in: Standard, Techno, Paleolithic, Futuristic, Aurora, Deep Ocean, Volcanic, Minimal. Import .smartertheme packages or design your own.'),
      ];
    },
    Playback: () => [
      row('Movies & episodes', select('vodMode', [['stream', 'Watch while it downloads (starts right away)'], ['download', 'Download first, then play from this computer (smoothest)']]), 'Both save the whole video to this computer. "Download first" waits until it\'s all there, then plays the finished file - no buffering at all. You can switch any video from the player\'s gear menu: "Download fully, then play from disk".'),
      DESKTOP ? row('Quality', select('quality', QUALITIES), 'Original plays what your provider sends. A lower choice re-encodes the video smaller on this computer - less data for the player (can help with very high-bitrate shows), but uses more of your computer\'s power. Also in the player\'s gear menu; the last choice is remembered.') : null,
      row('Player engine', select('engine', [['auto', 'Automatic (recommended)'], ['mpegts', 'MPEG-TS engine'], ['hls', 'HLS engine'], ['native', 'Native'], ...(DESKTOP ? [['compat', 'Compatibility (ffmpeg)']] : [])]), 'Automatic picks the best engine and falls back if a stream fails.'),
      DESKTOP ? row('Audio compatibility', select('audioCompat', [['auto', 'Auto-convert AC3 / EAC3 / DTS audio'], ['off', 'Off']])) : null,
      row('Buffering', select('prebuffer', BUFFER_CHOICES.map((n) => [n, bufferLabel(n)]), Number), 'Seconds of video held in reserve. More = fewer freezes on slow or busy connections, but a longer wait when you change channel. Also on the video screen\'s gear menu.'),
      row('Read-ahead (seconds)', num('bufferSeconds', 2, 60), 'How far ahead the player downloads.'),
      DESKTOP ? row('Keep buffering while paused', check('diskBuffer'), 'Saves the stream to a temporary file on this computer: movies and episodes keep downloading to the end, paused live TV keeps recording until the programme ends (max 4 hours). Deleted when you stop watching.') : null,
      row('Autoplay next episode', check('autoplayNext')),
      row('Offer to download when the feed keeps freezing', check('offerDownloadOnFreeze'), 'Movies & series: after a couple of freezes, offer to download the video and play it when it’s ready.'),
      row('Preferred audio language', text('preferredAudioLang', 'e.g. en, es, fr')),
      row('Preferred subtitle language', text('preferredSubLang', 'e.g. en')),
      DESKTOP ? row('External player', fileSel('externalPlayer', 'Path to VLC, mpv, PotPlayer…'), 'Leave empty to use VLC automatically (found in its usual install folder). Used by the VLC buttons and "Open in external player".') : null,
    ],
    'Captions & subtitles': () => [
      row('Show captions by default', h('input.switch', { type: 'checkbox', checked: s.captions.enabled, onchange: (e) => save({ captions: { ...s.captions, enabled: e.target.checked } }) }), 'Closed captions (CEA-608/708), provider subtitles, embedded and external SRT/VTT.'),
      row('Caption appearance', btn('Customize style…', () => captionStyleDialog(s), { iconName: 'cc' }), 'Size, font, colours, background opacity, edges, position.'),
      DESKTOP ? row('Live TV captions', h('select.input', { onchange: (e) => save({ captions: { ...s.captions, ccMode: e.target.value } }) },
        h('option', { value: 'auto', selected: s.captions.ccMode !== 'off' }, 'Use CC-capable mode when captions are on'),
        h('option', { value: 'off', selected: s.captions.ccMode === 'off' }, 'Never (lowest latency)'))) : null,
    ],
    Recording: () => [
      DESKTOP ? row('Recordings folder', folder('recordingsDir')) : null,
      DESKTOP ? row('File format', select('recordFormat', [['ts', 'MPEG-TS (.ts) — keeps all tracks & subtitles'], ['mkv', 'Matroska (.mkv)'], ['mp4', 'MP4 (.mp4)']])) : null,
      row('Start recordings early (minutes)', num('recordPaddingBefore', 0, 60)),
      row('End recordings late (minutes)', num('recordPaddingAfter', 0, 180)),
      row('"Record now" length when no guide (minutes)', num('recordNowMinutes', 5, 600, 5)),
      row('Max simultaneous recordings', num('maxConcurrentRecordings', 1, 10), 'Keep within your provider\'s connection limit.'),
      DESKTOP ? row('ffmpeg', h('div', fileSel('ffmpegPath', info.ffmpeg || 'Not found — set the path'), h('small.muted', info.ffmpeg ? `Using: ${info.ffmpeg}` : 'ffmpeg is needed for recording and compatibility playback.'))) : null,
    ],
    Downloads: () => [
      DESKTOP ? row('Downloads folder', folder('downloadsDir')) : null,
      DESKTOP ? row('Prepare downloads for smooth playback', check('optimizeDownloads'), 'After a download finishes, any video the player can’t play smoothly (MKV/AVI, AC3/DTS audio, MPEG-2, HEVC without hardware support…) gets a playback copy made once — keeps every audio language and subtitle. Uses extra disk space about the size of the video. The original is never changed.') : null,
      row('Simultaneous downloads', num('maxConcurrentDownloads', 1, 6)),
    ],
    'TV Guide': () => [
      row('Keep past days (catch-up)', num('epgPastDays', 0, 14)),
      row('Refresh guide every (hours)', num('epgRefreshHours', 1, 72)),
    ],
    'Parental controls': () => [
      row('Parental PIN', h('div.row',
        btn(s.parentalPin ? 'Change PIN' : 'Set PIN', async () => {
          if (s.parentalPin) { const old = await prompt('Current PIN', 'Enter current PIN', '', { type: 'password' }); if (old == null || !(await api('checkPin', old))) { toast('Wrong PIN', 'error'); return; } }
          const pin = await prompt('New PIN', '4+ digits', '', { type: 'password' });
          if (pin && pin.length >= 4) { await save({ parentalPin: pin }); draw(); }
        }, { iconName: 'lock' }),
        s.parentalPin ? btn('Remove PIN', async () => { const old = await prompt('Current PIN', 'Enter current PIN', '', { type: 'password' }); if (old != null && (await api('checkPin', old))) { await save({ parentalPin: '', lockedCategories: [] }); draw(); } else toast('Wrong PIN', 'error'); }) : null),
        'Right-click any category to lock it.'),
      row('Hide adult content', check('hideAdult')),
      row('Locked categories', h('span', `${s.lockedCategories.length}`)),
    ],
    'Keyboard shortcuts': () => [h('div.shortcuts', [
      ['Space / K', 'Play / pause'], ['F / double-click', 'Full screen'], ['M', 'Mute'], ['C', 'Captions on/off'], ['← / →', 'Back 10s / forward 30s'], ['↑ / ↓', 'Volume'],
      ['PgUp / PgDn', 'Previous / next channel'], ['0–9', 'Type a channel number'], ['P', 'Picture-in-picture'], ['R', 'Restart from here (frozen picture)'], ['A', 'Cycle aspect ratio'], ['I', 'Stream info'], ['Esc', 'Shrink player to mini'], ['Ctrl+K', 'Search'],
    ].map(([k, d]) => h('div.sc', h('kbd', k), h('span', d))))],
    About: () => [
      h('div.about-card',
        h('div.about-logo', icon('logo', 46)),
        h('div', h('div.about-name', info.name), h('div.about-ver', `Version ${info.version}`), h('div.muted', info.company || 'JTizzle Industries'))),
      row('Version', h('b', info.version), 'MAJOR.FEATURE.MINOR.BUILD — tell me this number if something seems missing, so we know which build you have.'),
      row('Built', h('span', info.built ? new Date(info.built).toLocaleString() : '—')),
      row('Platform', h('span', info.platform)),
      row('Company', h('span', info.company || 'JTizzle Industries')),
      info.copyright ? row('Copyright', h('span', info.copyright)) : null,
      window.__msErrors && window.__msErrors.length ? row('Start-up messages', h('pre.muted', { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '11px', margin: 0, maxHeight: '220px', overflow: 'auto' } }, `${(navigator.userAgent.match(/Chrome\/[\d.]+/) || [''])[0]}\n\n${window.__msErrors.join('\n\n')}`), 'If something doesn\'t work on this phone, a screenshot of this helps get it fixed.') : null,
      DESKTOP ? row('Data folder', btn('Open', () => api('openPath', info.userData), { iconName: 'folder' }), 'Your playlists, favorites, history and settings while the app runs.') : null,
      bInfo && !bInfo.manual ? row('Backup folder', h('div.row', btn('Open', () => api('openBackupFolder'), { iconName: 'folder' }), bInfo.exists ? btn('Restore…', () => restoreAuto(), { iconName: 'refresh' }) : null),
        `${bInfo.dir}${bInfo.saved ? ` — last backup ${new Date(bInfo.saved).toLocaleString()}` : ' — no backup yet'}. Kept outside the app, so reinstalling never deletes it.`) : null,
    ],
  };

  let active = localStorage.getItem('settings-tab') || 'General';
  if (!sections[active]) active = 'General';
  const draw = () => {
    s = app.settings;
    clear(wrap, h('div.page-head', h('h1', 'Settings')),
      h('div.settings-layout',
        h('div.settings-nav', Object.keys(sections).map((k) => h(`button.cat${k === active ? '.active' : ''}`, { onclick: () => { active = k; localStorage.setItem('settings-tab', k); draw(); } }, k))),
        h('div.settings-body', h('h2', active), sections[active]())));
  };
  draw();
  return window.api.on('settings', () => { if (document.activeElement && document.activeElement.tagName === 'INPUT') return; });
}

// ---- Backup & restore ------------------------------------------------------------
async function exportBackup() {
  try {
    const backup = await buildBackup();
    const text = JSON.stringify(backup);
    const name = `MuchSmarter-backup-${new Date().toISOString().slice(0, 10)}.msbackup`;
    if ((window.api.capabilities || {}).demo) {
      // Inside Claude the page can't save files: show the backup to copy instead.
      const ta = h('textarea.input', { rows: 8, readOnly: true, style: { width: '100%', fontFamily: 'monospace', fontSize: '11px' } }, text);
      modal('Backup', h('div', h('p', summarize(backup)), ta), { actions: [{ label: 'Copy', primary: true, onClick: () => { navigator.clipboard.writeText(text).catch(() => { ta.select(); document.execCommand('copy'); }); toast('Backup copied', 'success'); } }] });
      return;
    }
    const where = await api('saveBackup', text, name);
    if (where && window.api.platform === 'android' && /^Downloads\//.test(where)) {
      // Phones: say exactly where it went, and offer to send a copy somewhere too.
      modal('Backup saved', h('div', h('p', summarize(backup)), h('p', 'Saved on this phone in ', h('b', where.replace(/\//g, ' › ')), '. Open the Files app → Downloads to find it. It stays there even if you uninstall MuchSmarter.'),
        h('p.muted', 'To restore (after a reinstall or on another phone): Settings › Backup & restore › Restore from a backup file…, then pick this file.')), {
        actions: [{ label: 'Share a copy…', onClick: () => { api('shareBackup', text, name).catch(() => {}); } }, { label: 'OK', primary: true, onClick: () => {} }],
      });
    } else if (where) toast(`Backup saved: ${summarize(backup)}`, 'success', 5000);
  } catch (e) { toast(`Backup failed: ${e.message}`, 'error', 6000); }
}

async function restoreAuto() {
  try {
    const text = await api('readAutoBackup');
    let data;
    try { data = JSON.parse(text); } catch (_) { throw new Error('No automatic backup was found.'); }
    if (!data || data.format !== 'muchsmarter-backup') throw new Error('No automatic backup was found.');
    const ok = await confirmBox('Restore automatic backup', `Backup from ${new Date(data.created).toLocaleString()}: ${summarize(data)}. This replaces what is in the app now. Continue?`, 'Restore', true);
    if (!ok) return;
    await restoreBackup(data);
    toast('Backup restored — restarting…', 'success', 3000);
  } catch (e) { toast(e.message, 'error', 6000); }
}

async function importBackup() {
  try {
    const text = await api('openBackup');
    if (!text) return;
    let data;
    try { data = JSON.parse(text); } catch (_) { throw new Error('That file is not a MuchSmarter backup.'); }
    if (data.format !== 'muchsmarter-backup') throw new Error('That file is not a MuchSmarter backup.');
    const ok = await confirmBox('Restore backup', `Backup from ${new Date(data.created).toLocaleString()} (${data.platform || 'unknown'}): ${summarize(data)}. This replaces what is in the app now. Continue?`, 'Restore', true);
    if (!ok) return;
    await restoreBackup(data);
    toast('Backup restored — restarting…', 'success', 3000);
  } catch (e) { toast(e.message, 'error', 6000); }
}

async function eraseAll() {
  const alsoBackups = h('input', { type: 'checkbox' });
  const ok = await new Promise((resolve) => {
    let yes = false;
    modal('Erase all my data?', h('div',
      h('p', 'This removes from this computer: playlists and their logins, favorites, recently viewed and resume points, settings, themes, hidden channels and the recordings / downloads lists. MuchSmarter then restarts empty, like a new install.'),
      h('p.muted', 'Video files you recorded or downloaded stay where they are.'),
      (window.api.capabilities || {}).desktop === false ? null : h('label.check-inline', alsoBackups, ' Also delete my backups in Documents\\MuchSmarter Backups')), {
      actions: [{ label: 'Cancel', onClick: () => {} }, { label: 'Erase everything', danger: true, onClick: () => { yes = true; } }],
      onClose: () => resolve(yes),
    });
  });
  if (!ok) return;
  window.__msErasing = true;
  try { localStorage.clear(); } catch (_) { /* ignore */ }
  await api('eraseAllData', { backups: alsoBackups.checked });
  toast('Erasing and restarting…', 'info', 3000);
}
