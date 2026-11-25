// The arcade cabinets in the game room. Walking up to one and pressing E opens it full screen:
// a single-game cabinet starts its game, a multi-game cabinet (the MILITARY machine) shows a game menu first.
const Reg = window.ArcadeRegistry;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// load a built-in game's code on demand (from the single-file build's packed assets, or from games/)
function loadGame(meta) {
  if (Reg.get(meta.id)) return Promise.resolve(Reg.get(meta.id));
  const packed = document.getElementById('asset:games/' + meta.file);
  return new Promise((ok, fail) => {
    const s = document.createElement('script');
    const done = () => Reg.get(meta.id) ? ok(Reg.get(meta.id)) : fail(new Error(meta.file + ' did not load'));
    if (packed) { s.textContent = packed.textContent; document.head.appendChild(s); done(); return; }
    s.src = 'games/' + meta.file; s.onload = done; s.onerror = () => fail(new Error('Could not load ' + meta.file)); document.head.appendChild(s);
  });
}
const manifest = id => (window.GAME_MANIFEST || []).find(g => g.id === id) || (Reg.get(id) && { id, file: id + '.js', ...Reg.get(id) });

export function createArcade({ onLeave }) {
  const root = $('#arcade');
  root.innerHTML = `
    <div class="cab">
      <header class="cab-marquee" id="cab-marquee"></header>
      <div class="cab-screen" id="cab-screen">
        <div class="cab-menu" id="cab-menu"></div>
        <canvas id="cab-game" hidden></canvas>
      </div>
      <footer class="cab-panel"><span id="cab-hint"></span><span class="cab-btns"><button type="button" class="cab-leave" id="cab-full">Full screen</button><button type="button" class="cab-leave" id="cab-leave">Step away (Esc)</button></span></footer>
    </div>`;
  const menuEl = $('#cab-menu', root), canvas = $('#cab-game', root), screen = $('#cab-screen', root);
  let cab = null, list = [], sel = 0, running = null, loading = false;

  function fit() {
    if (!running) return;
    const d = running.def, W = screen.clientWidth, H = screen.clientHeight, k = Math.min(W / d.width, H / d.height);
    canvas.style.width = Math.floor(d.width * k) + 'px'; canvas.style.height = Math.floor(d.height * k) + 'px';
  }
  addEventListener('resize', fit);

  function renderMenu() {
    let h = `<div class="cab-title">${esc(cab.menuTitle || cab.title)}</div><div class="cab-sub">SELECT GAME &middot; ARROWS + ENTER</div>`;
    let lastGroup = null;
    list.forEach((g, i) => {
      if (g.group !== lastGroup) { h += `<div class="cab-group">${esc(g.group)}</div>`; lastGroup = g.group; }
      h += `<button type="button" class="cab-item${i === sel ? ' sel' : ''}" data-i="${i}"><span class="ci-t">${esc(g.title)}</span><span class="ci-m">${esc(g.year)} ${esc(g.maker)}</span></button>`;
    });
    menuEl.innerHTML = h;
    const it = menuEl.querySelector('.cab-item.sel'); if (it) it.scrollIntoView({ block: 'nearest' });
    $('#cab-hint', root).textContent = 'Arrows: choose · Enter: play · Esc: step away';
  }
  menuEl.addEventListener('click', e => { const b = e.target.closest('.cab-item'); if (!b) return; sel = +b.dataset.i; renderMenu(); play(list[sel]); });

  async function play(g) {
    if (running || loading) return;
    loading = true;
    let def;
    try { def = await loadGame(g); } catch (err) { loading = false; $('#cab-hint', root).textContent = err.message; return; }
    loading = false;
    if (!cab) return;
    menuEl.hidden = true; canvas.hidden = false;
    screen.classList.toggle('vector', !!def.vector);
    running = { def, h: Reg.run(def.id, canvas, { onExit: stopGame }) };
    $('#cab-hint', root).textContent = `${def.title} · ${def.controls || ''} · Esc: ${list.length > 1 ? 'back to the menu' : 'step away'}`;
    fit(); Reg.audio.unlock();
  }
  function stopGame() {
    if (!running) return;
    running.h.stop(); running = null;
    canvas.hidden = true;
    if (list.length > 1) { menuEl.hidden = false; renderMenu(); } else leave();
  }
  function leave() {
    if (document.fullscreenElement === root) try { document.exitFullscreen(); } catch (e) { }
    if (running) { running.h.stop(); running = null; }
    root.classList.remove('on'); setTimeout(() => { if (!root.classList.contains('on')) root.hidden = true; }, 350);
    cab = null; onLeave();
  }
  $('#cab-leave', root).addEventListener('click', leave);
  $('#cab-full', root).addEventListener('click', () => window.toggleFullscreen && window.toggleFullscreen(root));

  addEventListener('keydown', e => {
    if (!cab) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); if (running && list.length > 1) stopGame(); else leave(); return; }
    if (running) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); sel = (sel + 1) % list.length; renderMenu(); Reg.audio.tone(880, .03, { vol: .06 }); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); sel = (sel - 1 + list.length) % list.length; renderMenu(); Reg.audio.tone(880, .03, { vol: .06 }); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(list[sel]); }
  }, true);

  return {
    open(c) {
      cab = c;
      list = c.games.map(([id, group]) => { const m = manifest(id); return m && { ...m, group }; }).filter(Boolean);
      sel = 0;
      const mq = $('#cab-marquee', root); mq.textContent = c.title; mq.style.setProperty('--mq', c.color);
      root.hidden = false; requestAnimationFrame(() => root.classList.add('on'));
      Reg.audio.unlock();
      if (list.length === 1) { menuEl.hidden = true; play(list[0]); } else { menuEl.hidden = false; canvas.hidden = true; renderMenu(); }
    },
    get open_() { return !!cab; }
  };
}
