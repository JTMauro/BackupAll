// Small DOM toolkit: hyperscript, toasts, modals, context menus, formatting.
export function h(tag, props, ...children) {
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name || 'div');
  if (classes.length) el.className = classes.join(' ');
  if (props && (typeof props !== 'object' || props instanceof Node || Array.isArray(props))) {
    children.unshift(props);
    props = null;
  }
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className += (el.className ? ' ' : '') + v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k in el && k !== 'list' && k !== 'type') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function clear(el, ...children) {
  el.replaceChildren();
  append(el, children);
  return el;
}

export const api = (method, ...args) => window.api.call(method, ...args);

// Where popups go: inside the fullscreen element when something is fullscreen
// (anything outside it is invisible), otherwise the page body.
export function layer() {
  const fs = document.fullscreenElement || document.webkitFullscreenElement;
  return fs && fs.append ? fs : document.body;
  // (Desktop full screen is a window setting with the player on top, so popups go in <body>.)
}

// Inline SVG icons (stroke style).
const ICONS = {
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  'eye-off': 'M3 3l18 18M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.7 17.7 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  tv: 'M3 6h18v12H3zM8 21h8M12 18v3',
  film: 'M4 4h16v16H4zM8 4v16M16 4v16M4 8h4M4 12h4M4 16h4M16 8h4M16 12h4M16 16h4',
  series: 'M4 5h16v10H4zM7 19h10M9 15v4M15 15v4',
  guide: 'M3 4h18v16H3zM3 9h18M8 4v16',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 3',
  rec: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
  download: 'M12 3v12M7 10l5 5 5-5M4 19h16',
  grid: 'M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z',
  list: 'M4 6h16M4 12h16M4 18h16',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  playlist: 'M3 6h12M3 12h12M3 18h8M17 14l5 3-5 3z',
  play: 'M7 4l13 8-13 8z',
  pause: 'M7 5h3v14H7zM14 5h3v14h-3z',
  stop: 'M6 6h12v12H6z',
  prev: 'M19 5L9 12l10 7zM5 5v14',
  next: 'M5 5l10 7-10 7zM19 5v14',
  back10: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
  fwd10: 'M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5',
  volume: 'M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12',
  mute: 'M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6',
  cc: 'M3 5h18v14H3zM10 10.5a2 2 0 1 0 0 3M17 10.5a2 2 0 1 0 0 3',
  audio: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  cast: 'M2 16a6 6 0 0 1 6 6M2 12a10 10 0 0 1 10 10M2 20h.01M2 8V5a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-6',
  pip: 'M3 5h18v14H3zM12 12h7v5h-7z',
  popout: 'M14 3h7v7M21 3l-9 9M19 14v6H4V5h6',
  full: 'M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6',
  exitfull: 'M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6',
  more: 'M12 6h.01M12 12h.01M12 18h.01',
  x: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  folder: 'M3 6h6l2 2h10v11H3z',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  up: 'M12 19V5M5 12l7-7 7 7',
  down: 'M12 5v14M5 12l7 7 7-7',
  refresh: 'M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6',
  check: 'M5 13l4 4 10-10',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 3',
  ratio: 'M3 6h18v12H3zM7 10v4M17 10v4',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  external: 'M14 3h7v7M10 14L21 3M19 14v6H4V5h6',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7h.01',
  sleep: 'M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z',
  speed: 'M12 21a9 9 0 1 1 9-9M12 12l5-3',
  ontop: 'M12 2l3 7h-6zM5 13h14v8H5z',
  mini: 'M3 5h18v14H3zM13 13h6v4h-6z',
  layout: 'M3 3h18v18H3zM3 12h18M12 3v18',
  logo: 'M2.5 5.5h19v12h-19zM8 21h8M12 17.5V21M12 7.6a3 3 0 0 0-1.8 5.4c.4.3.6.7.6 1.1v.6h2.4v-.6c0-.4.2-.8.6-1.1A3 3 0 0 0 12 7.6zM10.9 15.9h2.2',
  filter: 'M3 5h18l-7 8.5V19l-4 2v-7.5z',
  compact: 'M4 5h16M4 9h16M4 13h16M4 17h16M4 21h16',
  'grid-s': 'M3 3h4v4H3zM10 3h4v4h-4zM17 3h4v4h-4zM3 10h4v4H3zM10 10h4v4h-4zM17 10h4v4h-4zM3 17h4v4H3zM10 17h4v4h-4zM17 17h4v4h-4z',
  'grid-l': 'M3 3h18v18H3zM3 12h18M12 3v18',
  'list-img': 'M3 5h5v4H3zM11 7h10M3 15h5v4H3zM11 17h10',
  heart: 'M12 21l-8.5-8.6a5 5 0 1 1 7.1-7.1L12 6.7l1.4-1.4a5 5 0 1 1 7.1 7.1z',
};

export function icon(name, size = 18) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', name === 'rec' || name === 'play' || name === 'pause' || name === 'star-on' ? 'currentColor' : 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.classList.add('icon');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', ICONS[name === 'star-on' ? 'star' : name] || ICONS.info);
  svg.append(p);
  return svg;
}

export function btn(label, onClick, { iconName, cls = '', title, disabled } = {}) {
  return h(`button.btn${cls ? '.' + cls.split(' ').join('.') : ''}`, { onclick: onClick, title: title || (typeof label === 'string' ? label : ''), disabled }, iconName ? icon(iconName) : null, label ? h('span', label) : null);
}

// Centered "working on it" screen (spinner + message) shown over everything, e.g. while a
// playlist connects. Returns { set(text), close() }. After 5 s it also counts the seconds.
// With onCancel, a Cancel button appears after 10 s (stops waiting; the work itself may go on).
export function busyOverlay(text, { onCancel } = {}) {
  const msg = h('div.busy-msg', text);
  const sub = h('div.busy-sub');
  const cancel = onCancel ? h('button.btn.small.busy-cancel', { hidden: true, onclick: () => { close(); onCancel(); } }, 'Cancel') : null;
  const el = h('div.busy-overlay', { role: 'alert', 'aria-live': 'polite', 'aria-busy': 'true' }, h('div.busy-box', h('div.spinner'), msg, sub, cancel));
  document.body.append(el);
  const t0 = Date.now();
  const timer = setInterval(() => {
    const sec = Math.round((Date.now() - t0) / 1000);
    if (sec >= 5) sub.textContent = `${sec} s — big playlists can take a minute`;
    if (cancel && sec >= 10) cancel.hidden = false;
  }, 1000);
  const close = () => { clearInterval(timer); el.remove(); };
  return { set: (t) => { msg.textContent = t; }, close };
}

// A password box with a "show password" eye button.
export function passwordField(input) {
  input.type = 'password';
  const b = h('button.icon-btn.pw-eye', { type: 'button', title: 'Show password', 'aria-label': 'Show password', 'aria-pressed': 'false' }, icon('eye', 18));
  b.onclick = () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    b.title = show ? 'Hide password' : 'Show password';
    b.setAttribute('aria-label', b.title);
    b.setAttribute('aria-pressed', String(show));
    b.replaceChildren(icon(show ? 'eye-off' : 'eye', 18));
    input.focus();
  };
  return h('div.pw-wrap', input, b);
}

export function iconBtn(name, onClick, title, cls = '') {
  return h(`button.icon-btn${cls ? '.' + cls : ''}`, { onclick: onClick, title, 'aria-label': title }, icon(name));
}

// ---- Toasts --------------------------------------------------------------
export function toast(msg, kind = 'info', ms = 3500) {
  let host = document.getElementById('toasts');
  if (!host) { host = h('div'); host.id = 'toasts'; }
  if (host.parentNode !== layer()) layer().append(host);
  const t = h(`div.toast.${kind}`, msg);
  host.append(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}

export function errToast(e) {
  toast(String((e && e.message) || e).replace(/^Error invoking remote method 'api': (Error: )?/, ''), 'error', 6000);
}

// ---- Modal -----------------------------------------------------------------
export function modal(title, body, { actions = [], wide, onClose } = {}) {
  const close = () => { back.remove(); document.removeEventListener('keydown', onKey, true); onClose && onClose(); };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  const back = h('div.modal-back', { onmousedown: (e) => { if (e.target === back) close(); } },
    h(`div.modal${wide ? '.wide' : ''}`, { role: 'dialog', 'aria-label': title },
      h('div.modal-head', h('h2', title), iconBtn('x', close, 'Close')),
      h('div.modal-body', body),
      actions.length ? h('div.modal-actions', actions.map((a) => btn(a.label, async () => { const r = await a.onClick(close); if (r !== false && a.close !== false) close(); }, { cls: a.primary ? 'primary' : a.danger ? 'danger' : '' }))) : null));
  layer().append(back);
  document.addEventListener('keydown', onKey, true);
  const first = back.querySelector('input, select, textarea');
  if (first) setTimeout(() => first.focus(), 30);
  return { close, el: back };
}

export function prompt(title, label, value = '', { placeholder = '', type = 'text' } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const input = h('input.input', { value, placeholder, type, onkeydown: (e) => { if (e.key === 'Enter') { done = true; m.close(); resolve(input.value); } } });
    const m = modal(title, h('label.field', h('span', label), input), {
      actions: [{ label: 'Cancel', onClick: () => {} }, { label: 'OK', primary: true, onClick: () => { done = true; resolve(input.value); } }],
      onClose: () => { if (!done) resolve(null); },
    });
  });
}

export function confirmBox(title, text, okLabel = 'OK', danger = false) {
  return new Promise((resolve) => {
    let done = false;
    modal(title, h('p', text), {
      actions: [{ label: 'Cancel', onClick: () => {} }, { label: okLabel, primary: !danger, danger, onClick: () => { done = true; resolve(true); } }],
      onClose: () => { if (!done) resolve(false); },
    });
  });
}

// ---- Context menu --------------------------------------------------------
export function menu(x, y, items) {
  document.querySelectorAll('.ctx-menu').forEach((m) => m.remove());
  const m = h('div.ctx-menu', { role: 'menu' }, items.filter(Boolean).map((it) => it === '-' ? h('div.sep') :
    h(`button.ctx-item${it.checked ? '.checked' : ''}`, { disabled: it.disabled, onclick: () => { m.remove(); it.onClick && it.onClick(); } },
      it.icon ? icon(it.icon, 16) : h('span.ico-space'), h('span', it.label), it.hint ? h('small', it.hint) : null)));
  layer().append(m);
  const r = m.getBoundingClientRect();
  m.style.left = Math.max(4, Math.min(x, innerWidth - r.width - 4)) + 'px';
  m.style.top = Math.max(4, Math.min(y, innerHeight - r.height - 4)) + 'px';
  const off = (e) => { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('mousedown', off, true); } };
  setTimeout(() => document.addEventListener('mousedown', off, true));
  return m;
}

export function menuFrom(btnEl, items) {
  const r = btnEl.getBoundingClientRect();
  return menu(r.left, r.bottom + 4, items);
}

// ---- Formatting ------------------------------------------------------------
let use12h = true;
export function setTimeFormat(f) { use12h = f !== '24h'; }
export function fmtTime(ms) {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: use12h });
}
export function fmtDate(ms) {
  const d = new Date(ms);
  const today = new Date();
  const diff = Math.round((new Date(d.toDateString()) - new Date(today.toDateString())) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}
export function fmtDur(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const hh = Math.floor(sec / 3600);
  const mm = Math.floor((sec % 3600) / 60);
  const ss = sec % 60;
  return hh ? `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${mm}:${String(ss).padStart(2, '0')}`;
}
export function fmtBytes(n) {
  if (!n) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i > 1 ? 1 : 0)} ${u[i]}`;
}

export function img(src, cls = '', fallbackText = '') {
  const fb = h(`div.img-fallback${cls ? '.' + cls : ''}`, (fallbackText || '?').trim().slice(0, 2).toUpperCase());
  if (!src) return fb;
  const el = h(`img${cls ? '.' + cls : ''}`, { src, loading: 'lazy', decoding: 'async', alt: '', referrerPolicy: 'no-referrer' });
  el.onerror = () => el.replaceWith(fb);
  return el;
}

export function debounce(fn, ms = 250) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// Render a long list in chunks as the user scrolls (keeps 10k+ channel lists snappy).
// Virtual list: only the rows on screen (plus a few above and below) exist in the page;
// two empty spacer blocks stand in for everything above and below, so the scrollbar
// covers the whole list and even 50,000 posters scroll smoothly. Works for one-column
// lists and multi-column grids (rows and columns are measured from the items, again
// after a resize or view-mode switch). Made items are cached so scrolling back is instant.
export function lazyList(container, items, render, { chunk = 80, scroller } = {}) {
  const sc = scroller || container;
  const cache = new Map(); // index -> element
  const CACHE_MAX = 800;
  const spacer = () => h('div.lz-space', { 'aria-hidden': 'true', style: { gridColumn: '1 / -1', margin: '0', padding: '0', border: '0', flex: 'none' } });
  const topSp = spacer(); const botSp = spacer();
  let from = 0; let to = 0; // rendered range [from, to)
  let cols = 1; let rowH = 40; let gap = 0; let padTop = 0;
  let raf = 0; let dead = false; let measured = false; let fixes = 0; let forceNext = false; let lastW = 0;
  sc.style.overflowAnchor = 'none';

  const el = (i) => {
    let e = cache.get(i);
    if (!e) {
      e = render(items[i], i);
      if (cache.size >= CACHE_MAX) { for (const k of cache.keys()) { if (k < from - chunk || k >= to + chunk) { cache.delete(k); if (cache.size < CACHE_MAX * 0.75) break; } } }
      cache.set(i, e);
    }
    return e;
  };
  const readStyle = () => { const cs = getComputedStyle(container); gap = parseFloat(cs.rowGap) || 0; padTop = parseFloat(cs.paddingTop) || 0; };
  // Spacer for n rows: the grid gap after it is part of a row, so take one gap off.
  const setSpace = (sp, n) => { if (n > 0) { sp.style.display = ''; sp.style.height = `${Math.max(0, n * rowH - gap)}px`; } else { sp.style.display = 'none'; sp.style.height = '0px'; } };
  const itemKids = () => [...container.children].filter((k) => k !== topSp && k !== botSp);
  // Columns and row stride from what is rendered.
  const measure = () => {
    const kids = itemKids().filter((k) => k.getClientRects().length);
    if (!kids.length || !kids[0].offsetHeight) return false; // not on screen / laid out yet
    const top0 = kids[0].offsetTop;
    let c = 0; while (c < kids.length && Math.abs(kids[c].offsetTop - top0) < 2) c++;
    cols = Math.max(1, c);
    rowH = kids.length > cols ? kids[cols].offsetTop - top0 : kids[0].offsetHeight + gap;
    if (!(rowH > 0)) rowH = 40;
    return true;
  };
  const rows = () => Math.ceil(items.length / cols);
  // Where the first item row starts inside the scroll area's content.
  const listTop = () => (sc === container ? 0 : container.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop) + padTop;

  const draw = (nf, nt) => {
    from = nf; to = nt;
    const frag = document.createDocumentFragment();
    frag.append(topSp);
    for (let i = from; i < to; i++) frag.append(el(i));
    frag.append(botSp);
    container.replaceChildren(frag);
    setSpace(topSp, Math.floor(from / cols));
    setSpace(botSp, Math.max(0, rows() - Math.ceil(to / cols)));
  };
  const paint = (force) => {
    raf = 0;
    if (dead || !container.isConnected) return;
    if (!measured) { refresh(); return; }
    const viewTop = sc.scrollTop - listTop();
    // Never more than a window's worth, even if the list is briefly unconstrained.
    const viewH = Math.min(sc.clientHeight || window.innerHeight, window.innerHeight);
    const extra = Math.max(2, Math.ceil(600 / rowH));
    const r0 = Math.max(0, Math.floor(viewTop / rowH) - extra);
    const r1 = Math.min(rows(), Math.ceil((viewTop + viewH) / rowH) + extra);
    const nf = Math.min(items.length, r0 * cols);
    const nt = Math.min(items.length, Math.max(nf, r1 * cols));
    if (!force && nf === from && nt === to) return;
    draw(nf, nt);
    // Rows can change height after they appear (e.g. "now playing" filled in): re-check.
    const kids = itemKids();
    if (kids.length > cols) {
      const stride = kids[cols].offsetTop - kids[0].offsetTop;
      if (stride > 0 && Math.abs(stride - rowH) > 1 && fixes++ < 20) { rowH = stride; schedule(true); }
    }
  };
  const schedule = (force) => { if (force === true) forceNext = true; if (!raf && !dead) raf = requestAnimationFrame(() => { const f = forceNext; forceNext = false; paint(f); }); };

  // (Re)measure from the current position, e.g. after a view-mode switch or resize.
  function refresh() {
    if (dead || !container.isConnected) return;
    // Remember which item is at the top of the view, to keep it there after re-measuring.
    const anchor = measured ? Math.min(items.length - 1, Math.max(0, Math.floor((sc.scrollTop - listTop()) / rowH) * cols)) : -1;
    readStyle();
    const first = anchor >= 0 ? anchor : Math.min(from, Math.max(0, items.length - 1));
    draw(first, Math.min(items.length, first + Math.max(chunk, 24)));
    const was = measured;
    measured = measure();
    if (!measured) return; // tried again once it has a size
    lastW = container.clientWidth;
    setSpace(topSp, Math.floor(first / cols));
    if (was && anchor >= 0) sc.scrollTop = listTop() + Math.floor(anchor / cols) * rowH;
    paint(true);
  }

  readStyle();
  draw(0, Math.min(items.length, chunk));
  measured = measure();
  if (measured) { lastW = container.clientWidth; paint(true); }

  sc.addEventListener('scroll', schedule, { passive: true });
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { const w = container.clientWidth; if (!measured || Math.abs(w - lastW) > 1) refresh(); else schedule(); }) : null;
  if (ro) { ro.observe(container); if (sc !== container) ro.observe(sc); }
  const mo = new MutationObserver(() => requestAnimationFrame(refresh));
  mo.observe(container, { attributes: true, attributeFilter: ['data-view', 'class'] });

  return {
    destroy: () => { dead = true; sc.removeEventListener('scroll', schedule); ro && ro.disconnect(); mo.disconnect(); if (raf) cancelAnimationFrame(raf); cache.clear(); topSp.remove(); botSp.remove(); },
    // Scroll so item i is visible (it may not be in the page yet).
    scrollToIndex: (i, block = 'nearest') => {
      if (i < 0 || i >= items.length) return null;
      const y = listTop() + Math.floor(i / cols) * rowH;
      const h0 = sc.clientHeight;
      if (block === 'center') sc.scrollTop = y - h0 / 2 + rowH / 2;
      else if (y < sc.scrollTop) sc.scrollTop = y;
      else if (y + rowH > sc.scrollTop + h0) sc.scrollTop = y + rowH - h0;
      paint(false);
      return cache.get(i) || null;
    },
    element: (i) => cache.get(i) || null,
    // Every item element made so far (on screen or cached), e.g. to update a highlight.
    forEach: (fn) => cache.forEach((e, i) => fn(e, i)),
    refresh,
  };
}

// ---- View modes (list / compact / small / medium / large icons) -----------------
export const VIEW_MODES = [
  { id: 'list', label: 'List', icon: 'list-img' },
  { id: 'compact', label: 'Compact', icon: 'compact' },
  { id: 'small', label: 'Small icons', icon: 'grid-s' },
  { id: 'medium', label: 'Medium icons', icon: 'grid' },
  { id: 'large', label: 'Large icons', icon: 'grid-l' },
];

export function getView(area, fallback = 'medium') {
  try { const v = localStorage.getItem(`view:${area}`); if (VIEW_MODES.some((m) => m.id === v)) return v; } catch (_) { /* storage blocked */ }
  return fallback;
}

// A row of icon buttons that switches how one area lays out its items.
// `targets` are the containers that get data-view; onChange runs after a switch.
export function viewSwitch(area, targets, { fallback = 'medium', onChange } = {}) {
  const list = [].concat(targets);
  let cur = getView(area, fallback);
  const apply = () => { list.forEach((t) => { if (t) t.dataset.view = cur; }); bar.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.mode === cur)); };
  const bar = h('div.view-switch', { role: 'group', 'aria-label': 'View' }, VIEW_MODES.map((m) =>
    h('button.vs-btn', { 'data-mode': m.id, title: m.label, 'aria-label': m.label, onclick: () => { cur = m.id; try { localStorage.setItem(`view:${area}`, cur); } catch (_) { /* ignore */ } apply(); onChange && onChange(cur); } }, icon(m.icon, 16))));
  apply();
  bar.add = (el) => { list.push(el); apply(); };
  return bar;
}

// ---- Favorite star on any item (works before opening it) -------------------------
export function favButton(pl, item, on, { onChange } = {}) {
  const b = h(`button.fav-btn${on ? '.on' : ''}`, {
    title: on ? 'Remove from favorites' : 'Add to favorites',
    'aria-label': on ? 'Remove from favorites' : 'Add to favorites',
    'aria-pressed': String(!!on),
    onclick: async (e) => {
      e.stopPropagation(); e.preventDefault();
      try {
        const now = await api('toggleFavorite', pl, item.id);
        b.classList.toggle('on', now);
        b.replaceChildren(icon(now ? 'star-on' : 'star', 16));
        b.title = now ? 'Remove from favorites' : 'Add to favorites';
        b.setAttribute('aria-pressed', String(now));
        toast(now ? `★ Added "${item.name}" to favorites` : `Removed "${item.name}" from favorites`, 'info', 1600);
        onChange && onChange(now);
      } catch (err) { errToast(err); }
    },
    ondblclick: (e) => e.stopPropagation(),
    onkeydown: (e) => e.stopPropagation(),
  }, icon(on ? 'star-on' : 'star', 16));
  return b;
}

// Set of favorite item ids for one playlist.
export async function favoriteIds(pl) {
  try { return new Set((await api('favorites')).filter((f) => f.pl === pl).map((f) => f.item.id)); } catch (_) { return new Set(); }
}
