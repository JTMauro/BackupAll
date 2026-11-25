// Backups: build the .msbackup text, keep the automatic copy in Documents\MuchSmarter Backups
// up to date, and offer it back after a reinstall.
import { api, debounce, toast, modal, h } from './dom.js';

const PREF_SKIP = /^(ms:|ms-audio|playlist$)/;

export async function buildBackup() {
  const info = await api('appInfo');
  const data = await api('backupData');
  const prefs = {};
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!PREF_SKIP.test(k)) prefs[k] = localStorage.getItem(k); } } catch (_) { /* storage blocked */ }
  try { prefs.playlist = localStorage.getItem('playlist'); prefs['ms-audio-compat'] = localStorage.getItem('ms-audio-compat'); } catch (_) { /* ignore */ }
  return { format: 'muchsmarter-backup', version: 1, created: new Date().toISOString(), app: info.version, platform: info.platform, prefs, ...data };
}

export function summarize(data) {
  const c = data.collections || {};
  return `${(c.playlists || []).length} playlist(s), ${(c.favorites || []).length} favorite(s), ${(c.history || []).length} recently viewed, ${(data.themes || []).length} theme(s)`;
}

export async function restoreBackup(data) {
  try { for (const [k, v] of Object.entries(data.prefs || {})) if (v != null) localStorage.setItem(k, v); } catch (_) { /* storage blocked */ }
  await api('restoreData', data);
}

let running = false;
export async function autoBackupNow({ quiet = true } = {}) {
  const s = await api('getSettings');
  const info = await api('backupInfo');
  if (info.manual || s.autoBackup === false || running || window.__msErasing) return null;
  // Never overwrite a good backup with an empty app (fresh install before restoring).
  const pls = await api('playlists');
  if (!pls.length) return null;
  running = true;
  try {
    const f = await api('autoBackup', JSON.stringify(await buildBackup()));
    if (!quiet) toast(`Backed up to ${f}`, 'success', 5000);
    return f;
  } catch (e) { if (!quiet) toast(`Backup failed: ${e.message}`, 'error'); return null; } finally { running = false; }
}

// Save shortly after anything changes, and once at start-up.
export function watchForChanges() {
  const later = debounce(() => autoBackupNow(), 20000);
  for (const ch of ['settings', 'library:favorites', 'library:history', 'recordings', 'themes']) window.api.on(ch, later);
  setTimeout(() => autoBackupNow(), 15000);
  window.addEventListener('beforeunload', () => { autoBackupNow(); });
}

// Fresh install / empty app: offer the automatic backup if one is there.
export async function offerRestore() {
  const info = await api('backupInfo').catch(() => null);
  if (!info || !info.exists) return false;
  const text = await api('readAutoBackup');
  let data;
  try { data = JSON.parse(text); } catch (_) { return false; }
  if (!data || data.format !== 'muchsmarter-backup') return false;
  return new Promise((resolve) => {
    let yes = false;
    modal('Restore your MuchSmarter backup?', h('div',
      h('p', `A backup from ${new Date(data.created).toLocaleString()} was found in ${info.dir}:`),
      h('p', h('b', summarize(data))),
      h('p.muted', 'Restore it to get your playlists, favorites, history, settings and themes back. The app restarts when done.')), {
      actions: [
        { label: 'Start fresh', onClick: () => {} },
        { label: 'Restore backup', primary: true, onClick: async () => { yes = true; toast('Restoring…', 'info', 3000); await restoreBackup(data); } },
      ],
      onClose: () => resolve(yes),
    });
  });
}

// "Back up before closing?" — asked by the desktop app when its window is closed.
let exitOpen = false;
export function watchExit() {
  if (!window.api.on) return;
  window.api.on('ask-exit', async () => {
    api('exitPromptShown').catch(() => {});
    if (exitOpen) return;
    exitOpen = true;
    const dontAsk = h('input', { type: 'checkbox' });
    const info = await api('backupInfo').catch(() => ({}));
    let choice = 'cancel';
    const status = h('p.muted.exit-status');
    const m = modal('Back up before closing?', h('div',
      h('p', 'Save your playlists, favorites, recently viewed, resume points, settings and themes, so you can get everything back after a reinstall or on a new computer.'),
      info.dir ? h('p.muted', `Saved to: ${info.dir}${info.saved ? ` (last backup ${new Date(info.saved).toLocaleString()})` : ''}`) : null,
      h('label.check-inline', dontAsk, " Don't ask me again (turn it back on in Settings → Backup & restore)"),
      status), {
      actions: [
        { label: 'Cancel', onClick: () => { choice = 'cancel'; } },
        { label: 'Close without backup', onClick: () => { choice = 'close'; } },
        { label: 'Back up & close', primary: true, close: false, onClick: async (close) => {
          choice = 'backup';
          status.textContent = 'Backing up…';
          try {
            const f = await api('autoBackup', JSON.stringify(await buildBackup()));
            status.textContent = f ? `Saved: ${f}` : 'Saved.';
          } catch (e) { status.textContent = `Backup failed: ${e.message}`; choice = 'cancel'; return; }
          close();
        } },
      ],
      onClose: async () => {
        exitOpen = false;
        if (dontAsk.checked) await api('setSettings', { askBackupOnExit: false }).catch(() => {});
        if (choice === 'cancel') api('cancelExit').catch(() => {});
        else api('confirmExit').catch(() => {});
      },
    });
    setTimeout(() => { const b = m.el.querySelector('.modal-actions .btn.primary'); if (b) b.focus(); }, 50);
  });
}
