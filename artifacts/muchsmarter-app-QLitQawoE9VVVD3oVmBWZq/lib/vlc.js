// "Open in VLC": one item, or the whole list on screen as an .m3u playlist.
import { api, toast } from './dom.js';

export async function sendToVlc(pl, items, name) {
  if ((window.api.capabilities || {}).demo) { toast('Sending to VLC needs the installed MuchSmarter app — inside Claude the page cannot start other programs.', 'info', 5000); return; }
  const list = (items || []).filter((i) => i && i.id && i.type !== 'series');
  if (!list.length) { toast('Nothing here to send to VLC.', 'warn'); return; }
  toast(list.length > 1 ? `Sending ${list.length} items to VLC…` : `Opening "${list[0].name}" in VLC…`, 'info', 2500);
  try {
    const r = await api('exportPlaylist', pl, list.map(({ id, type, name: n, logo, seriesName, season, episode }) => ({ id, type, name: n, logo, seriesName, season, episode })), name);
    if (r && r.player === 'share') return;
    toast(`Sent ${r.count} item${r.count === 1 ? '' : 's'} to ${r.player || 'VLC'}`, 'success', 3000);
  } catch (e) { toast(e.message, 'error', 7000); }
}
