// Multi-View: watch up to 9 channels at once. Click a tile to give it audio,
// double-click to make it full screen.
import { h, clear, icon, api, btn, modal, toast, errToast } from '../lib/dom.js';
import { Player } from '../player/player.js';

const LAYOUTS = { 1: '1fr', 2: '1fr 1fr', 4: '1fr 1fr', 6: '1fr 1fr 1fr', 9: '1fr 1fr 1fr' };

export async function render(view, { app }) {
  if (app.player.source) app.closePlayer();
  let slots = JSON.parse(localStorage.getItem('multiview') || '[]');
  let layout = Number(localStorage.getItem('mv-layout')) || 4;
  const players = [];
  const grid = h('div.mv-grid');
  const layoutBtns = h('div.seg');
  view.append(h('div.page.mv-page', h('div.page-head', h('h1', 'Multi-View'), h('div.top-spacer'), layoutBtns,
    btn('Clear', () => { slots = []; save(); draw(); }, { iconName: 'trash' })), grid));

  const save = () => localStorage.setItem('multiview', JSON.stringify(slots));

  function draw() {
    players.splice(0).forEach((p) => p.destroy());
    clear(layoutBtns, Object.keys(LAYOUTS).map((n) => h(`button.seg-btn${layout === Number(n) ? '.active' : ''}`, { onclick: () => { layout = Number(n); localStorage.setItem('mv-layout', n); draw(); } }, `${n}`)));
    grid.style.gridTemplateColumns = LAYOUTS[layout];
    clear(grid);
    for (let i = 0; i < layout; i++) {
      const slot = slots[i];
      const cell = h('div.mv-cell');
      grid.append(cell);
      if (!slot) {
        cell.append(h('button.mv-add', { onclick: () => pickChannel(i) }, icon('plus', 32), h('span', 'Add channel')));
        continue;
      }
      const p = new Player({ compact: true, multiview: true, muted: i !== 0, onClose: () => { slots.splice(i, 1); save(); draw(); } });
      players.push(p);
      cell.append(p.el, h('div.mv-label', slot.item.name));
      cell.addEventListener('click', () => focus(i), true);
      api('playInfo', slot.pl, slot.item.id, { noHistory: true }).then((info) => p.load({ ...info, pl: slot.pl, itemId: slot.item.id, item: slot.item, title: slot.item.name })).catch(errToast);
    }
    focus(0);
  }

  function focus(i) {
    players.forEach((p, j) => { p.video.muted = j !== i; p.el.parentElement.classList.toggle('mv-focus', j === i); });
  }

  async function pickChannel(i) {
    if (!app.pl) { toast('Select a playlist first'); return; }
    const q = h('input.input', { placeholder: 'Search channels…' });
    const res = h('div.pick-list');
    const m = modal('Add channel', h('div', q, res), { wide: true });
    const search = async () => {
      const r = await api('list', app.pl, { type: 'live', search: q.value, limit: 60 });
      clear(res, r.items.map((c) => h('button.pick', { onclick: () => { slots[i] = { pl: app.pl, item: c }; save(); m.close(); draw(); } }, c.name)));
    };
    q.addEventListener('input', search);
    search();
  }

  draw();
  return () => players.forEach((p) => p.destroy());
}
