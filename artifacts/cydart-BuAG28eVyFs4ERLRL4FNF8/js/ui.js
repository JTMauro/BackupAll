/* CydArt UI helpers: toasts, progress, dialogs, menus, file pickers. */
window.CP = window.CP || {};
(function (CP) {
  'use strict';
  const U = CP.util, el = U.el;
  const ui = CP.ui = {};

  ui.toast = (msg, ms = 2800, cls = '') => {
    const t = el('div', { class: 'toast ' + cls, role: 'status' }, msg);
    document.getElementById('toasts').append(t);
    setTimeout(() => t.remove(), ms);
    return t;
  };
  ui.error = (msg, e) => { console.error(e); ui.toast(`${msg}${e ? ': ' + (e.message || e) : ''}`, 6000, 'err'); };
  ui.progress = (msg) => {
    const bar = el('i'); const t = el('div', { class: 'toast', role: 'status' }, el('div', {}, msg), el('div', { class: 'bar' }, bar));
    let shown = false; const timer = setTimeout(() => { document.getElementById('toasts').append(t); shown = true; }, 250);
    return { set: (f) => { bar.style.width = Math.round(U.clamp(f, 0, 1) * 100) + '%'; }, done: () => { clearTimeout(timer); if (shown) setTimeout(() => t.remove(), 300); } };
  };

  /* modal dialog. buttons: [[label, fn?, cls?]]; fn returning false keeps it open */
  ui.dialog = ({ title, body, buttons = [['Close']], wide = false, onClose }) => {
    const prevFocus = document.activeElement;
    const back = el('div', { class: 'dlg-back' });
    const close = () => { back.remove(); document.removeEventListener('keydown', onKey, true); onClose && onClose(); prevFocus && prevFocus.focus && prevFocus.focus(); };
    const foot = el('div', { class: 'dlg-foot' });
    const dlg = el('div', { class: 'dlg' + (wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      el('div', { class: 'dlg-head' }, el('h2', {}, title), el('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: close, html: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>' })),
      el('div', { class: 'dlg-body' }, body), foot);
    let primary = null;
    for (const [label, fn, cls] of buttons) {
      const b = el('button', { class: 'btn ' + (cls || ''), type: 'button' }, label);
      b.onclick = async () => { if (fn) { const r = await fn(); if (r === false) return; } close(); };
      if (cls && cls.includes('primary')) primary = b;
      foot.append(b);
    }
    if (!buttons.length) foot.remove();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      if (e.key === 'Enter' && primary && !e.target.closest('textarea') && !e.target.closest('button')) { e.preventDefault(); primary.click(); }
      if (e.key === 'Tab') { // keep focus inside
        const f = [...dlg.querySelectorAll('button,input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled && x.offsetParent);
        if (!f.length) return; const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    back.addEventListener('pointerdown', (e) => { if (e.target === back) close(); });
    back.append(dlg); document.body.append(back);
    setTimeout(() => { const f = dlg.querySelector('.dlg-body input, .dlg-body select, .dlg-body textarea') || primary || dlg.querySelector('button'); f && f.focus(); }, 30);
    return { close, el: dlg };
  };
  ui.prompt = (title, label, value = '') => new Promise((res) => {
    const inp = el('input', { type: 'text', value, 'aria-label': label });
    let done = false;
    ui.dialog({ title, body: el('label', { class: 'field full' }, el('span', {}, label), inp), buttons: [['Cancel'], ['OK', () => { done = true; res(inp.value.trim()); }, 'primary']], onClose: () => { if (!done) res(null); } });
    setTimeout(() => inp.select(), 40);
  });
  ui.confirm = (msg, ok = 'OK') => new Promise((res) => {
    let done = false;
    ui.dialog({ title: 'Please confirm', body: el('p', {}, msg), buttons: [['Cancel'], [ok, () => { done = true; res(true); }, 'primary']], onClose: () => { if (!done) res(false); } });
  });

  /* context / dropdown menu. items: [[label, fn, shortcut?, {disabled, check}]] | '-' | {head} */
  let openMenu = null;
  ui.closeMenu = () => { if (openMenu) { openMenu.remove(); openMenu = null; document.querySelectorAll('.menu-btn.open').forEach((b) => b.classList.remove('open')); } };
  ui.contextMenu = (x, y, items, { owner } = {}) => {
    ui.closeMenu();
    const m = el('div', { class: 'menu', role: 'menu' });
    for (const it of items) {
      if (it === '-') { m.append(el('div', { class: 'menu-sep', role: 'separator' })); continue; }
      if (it && it.head) { m.append(el('div', { class: 'menu-head' }, it.head)); continue; }
      const [label, fn, key, o = {}] = it;
      const b = el('button', { class: 'menu-item', role: 'menuitem', type: 'button', disabled: !!o.disabled },
        o.check != null ? el('span', { style: { width: '14px', display: 'inline-block' } }, o.check ? '✓' : '') : null, label, key ? el('span', { class: 'k' }, key) : null);
      b.onclick = () => { ui.closeMenu(); fn && fn(); };
      m.append(b);
    }
    document.body.append(m);
    const r = m.getBoundingClientRect();
    m.style.left = Math.max(4, Math.min(x, innerWidth - r.width - 4)) + 'px';
    m.style.top = Math.max(4, Math.min(y, innerHeight - r.height - 4)) + 'px';
    openMenu = m; if (owner) owner.classList.add('open');
    m.addEventListener('keydown', (e) => {
      const f = [...m.querySelectorAll('.menu-item:not(:disabled)')]; const i = f.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); f[(i + 1) % f.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); f[(i - 1 + f.length) % f.length].focus(); }
      if (e.key === 'Escape') { ui.closeMenu(); owner && owner.focus(); }
    });
    setTimeout(() => { const f = m.querySelector('.menu-item:not(:disabled)'); f && owner && f.focus(); }, 0);
    return m;
  };
  document.addEventListener('pointerdown', (e) => { if (openMenu && !openMenu.contains(e.target) && !e.target.closest('.menu-btn')) ui.closeMenu(); }, true);
  window.addEventListener('blur', () => ui.closeMenu());

  ui.pickFiles = ({ multiple = false, accept = CP.OPEN_ACCEPT, directory = false } = {}) => new Promise((res) => {
    const inp = el('input', { type: 'file', accept: directory ? null : accept, multiple: multiple || directory, style: { display: 'none' } });
    if (directory) { inp.webkitdirectory = true; inp.setAttribute('webkitdirectory', ''); }
    inp.onchange = () => {
      let files = Array.from(inp.files || []);
      if (directory) files = files.filter((f) => /^image\//.test(f.type) || (CP.media && CP.media.isMedia(f.name, f.type)) || /\.(heic|heif|hif|psd|psb|tiff?|jxl|jp2|tga|dds|exr|hdr|pcx|xcf|qoi|cr2|cr3|nef|arw|dng|orf|rw2|raf|pef|srw|raw)$/i.test(f.name));
      res(files); inp.remove();
    };
    inp.addEventListener('cancel', () => { res([]); inp.remove(); });
    document.body.append(inp); inp.click();
  });

  /* slider row used by tool options and dialogs */
  ui.slider = ({ label, min, max, step = 1, value, onInput, cls = 'param', fmt = (v) => v }) => {
    const r = el('input', { type: 'range', min, max, step, value, 'aria-label': label });
    const n = el('input', { type: 'number', min, max, step, value, 'aria-label': label + ' value' });
    const set = (v, from) => { v = U.clamp(+v, +min, +max); if (from !== r) r.value = v; if (from !== n) n.value = fmt(v); onInput(v); };
    r.oninput = () => set(r.value, r); n.onchange = () => set(n.value, n);
    const row = el('label', { class: cls }, el('span', {}, label), r, n);
    row.setValue = (v) => { r.value = v; n.value = fmt(v); };
    return row;
  };
})(window.CP);
