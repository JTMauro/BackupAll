/* Recall: extra Memory games (Light Grid, Number Recall, Path Memory, Shopping Basket) */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor, CUBES } = R;

  R.css(`
/* ---- Light Grid (lg-) ---- */
.lg-board{display:grid; grid-template-columns:repeat(var(--n), 1fr); gap:clamp(8px, 2.4vw, 14px); max-width:calc(var(--n) * 100px); margin:8px auto 0}
.lg-cell{--c:#3E9DAA; --d:#0A4A57; aspect-ratio:1; padding:0; cursor:pointer; font:700 clamp(1.6rem, 7vw, 2.6rem) var(--display); color:var(--ink);
  transition:transform .15s, filter .15s, box-shadow .2s}
.lg-cell span{opacity:0; transition:opacity .2s}
.lg-cell.lg-on{--c:var(--sun); --d:var(--sun-d); transform:scale(1.05); filter:saturate(1.15);
  box-shadow:inset 0 -6px 0 rgba(0,0,0,.14), inset 0 3px 0 rgba(255,255,255,.5), 0 6px 0 var(--d), 0 0 0 5px #fff, 0 0 36px 10px rgba(255,236,150,.75)}
.lg-cell.lg-on span{opacity:1}
.lg-cell.lg-got{--c:var(--leaf); --d:var(--leaf-d); transform:none; box-shadow:inset 0 -6px 0 rgba(0,0,0,.14), inset 0 3px 0 rgba(255,255,255,.5), 0 6px 0 var(--d), 0 12px 18px rgba(0,0,0,.28); animation:bounceIn .3s}
.lg-cell.lg-got span{opacity:1}
.lg-watch .lg-cell{pointer-events:none}
.lg-tools, .nr-tools, .sb-tools, .pm-tools{display:flex; justify-content:center; flex-wrap:wrap; gap:14px; margin-top:26px; min-height:60px}
.lg-left, .pm-left{text-align:center; font:600 1.4rem var(--display); margin:0 0 14px; color:var(--on-table)}

/* ---- Number Recall (nr-) ---- */
.nr-wrap{max-width:560px; margin:0 auto; display:grid; gap:20px; justify-items:center}
.nr-back{display:flex; align-items:center; gap:12px; background:var(--card); color:var(--ink); border-radius:20px; padding:12px 18px;
  font:700 1.35rem/1.25 var(--display); box-shadow:0 6px 0 var(--card-edge), 0 12px 20px rgba(0,0,0,.25); animation:bounceIn .35s; text-align:left}
.nr-back b{display:inline-grid; place-items:center; width:52px; height:52px; flex:none; border-radius:14px; background:var(--berry); color:#fff; font-size:1.8rem; box-shadow:0 4px 0 var(--berry-d)}
.nr-row{display:flex; justify-content:center; gap:clamp(6px, 2vw, 12px); width:100%; padding:6px 0 10px}
.nr-dig{width:min(72px, calc((100% - (var(--len) - 1) * 10px) / var(--len))); aspect-ratio:1/1.12; flex:none;
  font:700 clamp(1.5rem, calc(36vw / var(--len) + .6rem), 3rem) var(--display); animation:bounceIn .35s backwards}
.nr-slot{--c:rgba(255,255,255,.14); --d:rgba(0,0,0,.18); color:var(--on-table); outline:3px dashed rgba(255,255,255,.55); outline-offset:-9px; animation:none}
.nr-slot.nr-fill{--c:var(--card); --d:var(--card-edge); color:var(--ink); outline:0; animation:bounceIn .25s}
.nr-slot.nr-ok{--c:var(--leaf); --d:var(--leaf-d); color:var(--ink); outline:0; animation:bounceIn .35s backwards}
.nr-pad{display:grid; grid-template-columns:repeat(3, 1fr); gap:14px; width:min(100%, 360px)}
.nr-key{min-height:68px; font-size:2rem; padding:0}
.nr-key.nr-small{font-size:1.25rem}
.nr-ready{font-size:1.4rem; min-height:72px; padding-inline:1.6em}

/* ---- Path Memory (pm-) ---- */
.pm-scene{perspective:900px; padding:6px 0 20px}
.pm-board{display:grid; grid-template-columns:repeat(var(--cols), 1fr); gap:clamp(8px, 2.2vw, 14px); max-width:max(calc(var(--cols) * 74px), min(calc(var(--cols) * 96px), calc((100svh - 490px) * var(--cols) / var(--rows)))); margin:0 auto;
  transform:rotateX(12deg); transform-origin:50% 50%}
.pm-t{--c:var(--sky); --d:var(--sky-d); aspect-ratio:1; padding:0; cursor:pointer; font-size:clamp(1.5rem, 7vw, 2.4rem); line-height:1;
  animation:pm-float 3.2s ease-in-out infinite; animation-delay:calc(var(--i) * -.37s); transition:filter .2s, box-shadow .2s}
@keyframes pm-float{0%,100%{translate:0 0} 50%{translate:0 -6px}}
.pm-t.pm-lit{--c:var(--sun); --d:var(--sun-d); box-shadow:inset 0 -6px 0 rgba(0,0,0,.14), inset 0 3px 0 rgba(255,255,255,.5), 0 6px 0 var(--d), 0 0 0 5px #fff, 0 0 34px 10px rgba(255,236,150,.8)}
.pm-t.pm-walk{--c:var(--leaf); --d:var(--leaf-d)}
.pm-t.pm-here{box-shadow:inset 0 -6px 0 rgba(0,0,0,.14), inset 0 3px 0 rgba(255,255,255,.5), 0 6px 0 var(--d), 0 0 0 5px #fff, 0 12px 18px rgba(0,0,0,.28)}
.pm-t.pm-pop{animation:bounceIn .3s, pm-float 3.2s ease-in-out infinite}
.pm-t.pm-fade{opacity:.85}
.pm-watch .pm-t{pointer-events:none}
.pm-key{display:flex; justify-content:center; flex-wrap:wrap; gap:8px 22px; font:600 1.25rem var(--display); color:var(--on-table-soft); margin:0 0 6px}

/* ---- Shopping Basket (sb-) ---- */
.sb-wrap{max-width:720px; margin:0 auto; display:grid; gap:20px}
.sb-note{justify-self:center; width:min(100%, 380px); background:#FFFDF6; color:var(--ink); border-radius:10px 10px 22px 22px; padding:22px 24px 18px;
  box-shadow:0 6px 0 var(--card-edge), 0 14px 26px rgba(0,0,0,.3); transform:rotate(-1.2deg); animation:bounceIn .35s;
  background-image:repeating-linear-gradient(to bottom, transparent 0 55px, #CFE3F0 55px 57px); background-position:0 62px; position:relative}
.sb-note::before{content:""; position:absolute; top:-12px; left:50%; width:90px; height:26px; translate:-50% 0; rotate:2deg; background:rgba(255,194,52,.85); border-radius:4px}
.sb-note h3{font:700 1.6rem var(--display); margin:0 0 6px; color:var(--coral-d)}
.sb-note ul{list-style:none; margin:0; padding:0}
.sb-note li{display:flex; align-items:center; gap:14px; min-height:57px; font:600 1.55rem var(--display)}
.sb-note li .e{font-size:2.2rem; width:1.3em; text-align:center}
.sb-note li.sb-tick{color:var(--leaf-d)}
.sb-note li.sb-tick::after{content:"✓"; margin-left:auto; font-size:1.8rem}
.sb-basket{display:flex; align-items:center; gap:12px; flex-wrap:wrap; padding:12px 18px; border-radius:20px; background:rgba(0,0,0,.2); min-height:76px; font:600 1.3rem var(--display)}
.sb-basket .sb-in{display:flex; flex-wrap:wrap; gap:6px; font-size:2.2rem; line-height:1}
.sb-basket .sb-in span{animation:bounceIn .35s}
.sb-shelf{background:linear-gradient(180deg, #B97A45, #8E5A30); border-radius:22px; padding:16px 14px 6px; box-shadow:inset 0 0 0 6px #6E4422, 0 10px 22px rgba(0,0,0,.3)}
.sb-sign{justify-self:center; width:fit-content; max-width:100%; margin:0 auto 14px; padding:6px 18px; border-radius:12px; background:var(--card); color:var(--coral-d); font:700 1.3rem var(--display); box-shadow:0 4px 0 var(--card-edge); text-align:center}
.sb-grid{display:grid; grid-template-columns:repeat(auto-fill, minmax(min(100%, 96px), 1fr)); gap:0 12px}
.sb-spot{position:relative; padding:0 2px 26px}
.sb-spot::after{content:""; position:absolute; left:-8px; right:-8px; bottom:10px; height:12px; background:#E2B07A; border-radius:4px; box-shadow:0 5px 0 #6E4422}
.sb-item{width:100%; aspect-ratio:1/1.05; display:flex; flex-direction:column; gap:2px; align-items:center; justify-content:center; padding:6px 4px; cursor:pointer; border-radius:18px;
  font:600 1.25rem/1.1 var(--display); position:relative; z-index:1; transition:opacity .3s, translate .3s}
.sb-item .e{font-size:clamp(2.2rem, 9vw, 2.8rem); line-height:1}
.sb-item.sb-taken{opacity:0; translate:0 -30px; pointer-events:none}
`);

  register({ id: 'grid', cat: 'memory', order: 4, name: 'Light Grid', icon: '💡', desc: 'Remember which squares lit up', start: startGrid });
  register({ id: 'numrecall', cat: 'memory', order: 5, name: 'Number Recall', icon: '🔢', desc: 'Remember a number, then type it in', start: startNum });
  register({ id: 'path', cat: 'memory', order: 6, name: 'Path Memory', icon: '🚩', desc: 'Watch the glowing path, then walk it', start: startPath });
  register({ id: 'basket', cat: 'memory', order: 7, name: 'Shopping Basket', icon: '🧺', desc: 'Remember the list, then fill your basket', gentle: true, start: startBasket });

  /* Endless levels: difficulty eases up towards a cap and then plateaus.
     ease(L, max, k) grows from 0 at level 1 towards max, slowing as it goes. */
  const ease = (L, max, k) => Math.round(max * (1 - Math.exp(-(Math.max(1, L) - 1) / k)));
  const btn = (label, cls, fn) => { const b = el('button', 'btn ' + cls, label); b.type = 'button'; b.onclick = fn; return b; };

  /* =========================================================
     LIGHT GRID
     ========================================================= */
  function startGrid(L, api) {
    // squares to remember: 2 at level 1, rising gently to a cap of 8
    const count = 2 + ease(L, 6, 8), total = 4;
    // smallest comfortable grid (3..5); from level 6 the size sometimes varies within the cap
    let n = Math.min(5, Math.max(3, Math.ceil(Math.sqrt(count * 2.4))));
    if (L >= 6 && n < 5 && randInt(2)) n++;
    const viewMs = 2600 + count * 700;
    let round = 0, mistakes = 0, misses = 0, target = new Set(), found = new Set(), phase = 'wait';
    const left = el('p', 'lg-left', '&nbsp;');
    const board = el('div', 'lg-board lg-watch'); board.style.setProperty('--n', n);
    const cells = [...Array(n * n)].map((_, i) => {
      const b = el('button', 'lg-cell tile', '<span>★</span>'); b.type = 'button'; b.setAttribute('aria-label', 'Square ' + (i + 1));
      b.onclick = () => tap(i, b); board.append(b); return b;
    });
    const again = btn('👀 Show me again', 'c-card', () => { if (phase !== 'play') return; mistakes++; sfx.tap(); show(true); });
    const tools = el('div', 'lg-tools'); tools.append(again); again.hidden = true;
    api.stage.append(left, board, tools);

    function setLeft() { const r = target.size - found.size; left.textContent = r ? (r === 1 ? '1 square to find' : r + ' squares to find') : 'All found!'; }
    function show(repeat) {
      phase = 'show'; board.classList.add('lg-watch'); again.hidden = true;
      api.hint(repeat ? 'Here they are again. Take your time.' : 'Look at the squares that light up. Try to remember where they are.');
      const todo = [...target].filter(i => !found.has(i));
      todo.forEach((i, j) => api.later(() => { cells[i].classList.add('lg-on'); tone(520 + j * 60, .2, 'triangle', .1); }, 250 + j * 160));
      const hold = (repeat ? viewMs * .75 : viewMs) + todo.length * 160;
      api.later(() => todo.forEach(i => cells[i].classList.remove('lg-on')), hold);
      api.later(() => {
        phase = 'play'; misses = 0; board.classList.remove('lg-watch'); again.hidden = false;
        api.hint('Now tap the squares that were lit.'); setLeft();
      }, hold + 450);
    }
    function nextRound() {
      api.rounds(total, round);
      cells.forEach(c => c.classList.remove('lg-on', 'lg-got'));
      target = new Set(shuffle([...Array(n * n).keys()]).slice(0, count)); found = new Set();
      setLeft(); show(false);
    }
    function tap(i, b) {
      if (phase !== 'play' || found.has(i)) return;
      if (target.has(i)) {
        found.add(i); b.classList.add('lg-got'); tone(440 + found.size * 80, .16, 'triangle', .13); setLeft();
        if (found.size === target.size) {
          phase = 'wait'; again.hidden = true; round++; api.rounds(total, round);
          api.later(() => { sfx.good(); toast(cheer()); }, 200);
          api.hint(round === total ? 'You remembered them all!' : 'Yes, that’s all of them!');
          if (round === total) api.done(starsFor(mistakes, 1, 3)); else api.later(nextRound, 1700);
        }
      } else {
        mistakes++; misses++; wob(b); sfx.soft();
        if (misses >= 3) { toast('Let’s have another look'); phase = 'wait'; api.later(() => show(true), 900); }
        else toast('Not that one. Try another.');
      }
    }
    api.later(nextRound, 400);
  }

  /* =========================================================
     NUMBER RECALL
     ========================================================= */
  const NR_COLORS = ['coral', 'sky', 'sun', 'leaf', 'berry', 'orange', 'grape'];
  function startNum(L, api) {
    // digits: 2 at level 1, rising gently to a cap of 7
    const len = 2 + ease(L, 5, 7), total = 4;
    // from level 5, one or two rounds (never the first) ask for the number backwards
    const back = new Set(L >= 5 ? shuffle([1, 2, 3]).slice(0, L >= 10 ? 1 + randInt(2) : 1) : []);
    let round = 0, mistakes = 0, tries = 0, num = '', typed = '', phase = 'wait', isBack = false;

    function makeNum(d) {
      let s;
      do { s = String(1 + randInt(9)); while (s.length < d) s += randInt(10); } while (/(\d)\1\1/.test(s));
      return s;
    }
    const wantStr = () => isBack ? [...num].reverse().join('') : num;
    const banner = () => {
      const b = el('div', 'nr-back', '<b aria-hidden="true">⬅</b><span>Backwards this time!<br>Type the last number first.</span>');
      return b;
    };

    function newRound() {
      api.rounds(total, round);
      isBack = back.has(round);
      num = makeNum(isBack ? Math.max(3, len - 1) : len); tries = 0;
      showNum();
    }
    function showNum() {
      phase = 'show'; typed = ''; api.stage.innerHTML = '';
      const wrap = el('div', 'nr-wrap');
      if (isBack) wrap.append(banner());
      const row = el('div', 'nr-row'); row.style.setProperty('--len', num.length);
      [...num].forEach((d, i) => { const c = el('span', 'nr-dig tile c-' + NR_COLORS[i % NR_COLORS.length], d); c.style.animationDelay = (i * .08) + 's'; row.append(c); });
      row.setAttribute('aria-label', 'The number is ' + [...num].join(' '));
      const ready = btn('I’m ready ✓', 'c-leaf nr-ready', () => { if (phase === 'show') { sfx.tap(); askNum(); } });
      wrap.append(row, ready); api.stage.append(wrap);
      api.hint(isBack ? 'Remember this number. You will type it BACKWARDS. Tap “I’m ready” when you are.'
                      : 'Remember this number. Tap “I’m ready” when you are.');
    }
    function askNum() {
      phase = 'type'; typed = ''; api.stage.innerHTML = '';
      const wrap = el('div', 'nr-wrap');
      if (isBack) wrap.append(banner());
      const row = el('div', 'nr-row'); row.style.setProperty('--len', num.length);
      const slots = [...num].map(() => { const s = el('span', 'nr-dig tile nr-slot', ''); row.append(s); return s; });
      const pad = el('div', 'nr-pad');
      const press = d => {
        if (phase !== 'type' || typed.length >= num.length) return;
        typed += d; const s = slots[typed.length - 1]; s.textContent = d; s.classList.add('nr-fill');
        tone(400 + typed.length * 50, .1, 'triangle', .1);
        if (typed.length === num.length) { phase = 'check'; api.later(check, 450); }
      };
      const undo = () => {
        if (phase !== 'type' || !typed.length) return;
        const s = slots[typed.length - 1]; s.textContent = ''; s.classList.remove('nr-fill'); typed = typed.slice(0, -1); sfx.tap();
      };
      ['1', '2', '3', '4', '5', '6', '7', '8', '9'].forEach(d => pad.append(btn(d, 'c-card nr-key', () => press(d))));
      const del = btn('⌫', 'c-peach nr-key', undo); del.setAttribute('aria-label', 'Rub out');
      const look = btn('👀 Look again', 'c-sky nr-key nr-small', () => { if (phase !== 'type') return; mistakes++; sfx.tap(); showNum(); });
      pad.append(del, btn('0', 'c-card nr-key', () => press('0')), look);
      wrap.append(row, pad); api.stage.append(wrap);
      api.hint(isBack ? 'Type the number BACKWARDS, starting with the last number.' : 'Type the number you saw.');

      function check() {
        const want = wantStr();
        if (typed === want) {
          slots.forEach((s, i) => { s.classList.remove('nr-fill'); s.classList.add('nr-ok'); s.style.animationDelay = (i * .07) + 's'; tone(520 + i * 70, .14, 'triangle', .11, i * .07); });
          round++; api.rounds(total, round); toast(cheer());
          api.hint(isBack ? 'Yes! Backwards and all.' : 'Yes, that’s the number!');
          api.later(() => sfx.good(), num.length * 70 + 100);
          if (round === total) api.done(starsFor(mistakes, 0, 2)); else api.later(newRound, 1800);
        } else {
          mistakes++; tries++; sfx.soft(); wob(row);
          if (tries < 2) {
            phase = 'wait'; api.hint('Not quite. Let’s look at the number again.'); toast('Nearly! Have another look.');
            api.later(showNum, 1500);
          } else {
            phase = 'wait';
            slots.forEach((s, i) => { s.textContent = want[i]; s.classList.remove('nr-fill'); s.classList.add('nr-ok'); });
            api.hint(`Here’s the answer: ${[...want].join(' ')}. On to the next one.`);
            round++; api.rounds(total, round);
            if (round === total) api.later(() => api.done(starsFor(mistakes, 0, 2)), 1800); else api.later(newRound, 3000);
          }
        }
      }
    }
    api.later(newRound, 300);
  }

  /* =========================================================
     PATH MEMORY
     ========================================================= */
  function pmNbrs(i, cols, rows) {
    const x = i % cols, y = Math.floor(i / cols), out = [];
    if (x > 0) out.push(i - 1); if (x < cols - 1) out.push(i + 1);
    if (y > 0) out.push(i - cols); if (y < rows - 1) out.push(i + cols);
    return out;
  }
  function pmRoute(cols, rows, steps) {
    for (let t = 0; t < 5000; t++) {
      let cur = randInt(cols * rows); const route = [cur], seen = new Set(route);
      while (route.length <= steps) {
        const opts = pmNbrs(cur, cols, rows).filter(x => !seen.has(x));
        if (!opts.length) break;
        cur = pick(opts); route.push(cur); seen.add(cur);
      }
      if (route.length === steps + 1) return route;
    }
    // fallback: a snake along the rows (always valid)
    const snake = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) snake.push(y * cols + (y % 2 ? cols - 1 - x : x));
    return snake.slice(0, steps + 1);
  }
  function startPath(L, api) {
    // steps: 3 at level 1, rising gently to a cap of 10; grid width capped at 5 so tiles stay big
    const steps = 3 + ease(L, 7, 7), total = 3;
    // 5 columns only when the stage is wide enough to keep tiles at 56px or more
    const wide = (api.stage.clientWidth || 400) >= 420;
    const [cols, rows] = steps <= 4 ? [4, 4]
      : steps <= 6 ? (wide ? pick([[5, 5], [4, 5]]) : pick([[4, 5], [4, 4]]))
      : (wide ? pick([[5, 5], [5, 6], [4, 6]]) : pick([[4, 5], [4, 6]]));
    let round = 0, mistakes = 0, route = [], pos = 0, phase = 'wait', lit = new Set();
    const left = el('p', 'pm-left', '&nbsp;');
    const keyRow = el('div', 'pm-key', '<span>🚩 Start</span><span>🏁 Finish</span>');
    const scene = el('div', 'pm-scene'), board = el('div', 'pm-board pm-watch'); board.style.setProperty('--cols', cols); board.style.setProperty('--rows', rows);
    scene.append(board);
    const tiles = [...Array(cols * rows)].map((_, i) => {
      const b = el('button', 'pm-t tile', ''); b.type = 'button'; b.style.setProperty('--i', (i * 7) % 11);
      b.onclick = () => tap(i, b); board.append(b); return b;
    });
    const again = btn('👀 Show me the path', 'c-card', () => { if (phase !== 'play') return; mistakes++; sfx.tap(); replay('Here’s the path again. Watch the glowing squares.'); });
    const tools = el('div', 'pm-tools'); tools.append(again); again.hidden = true;
    api.stage.append(keyRow, left, scene, tools);

    function render() {
      tiles.forEach((b, i) => {
        const k = route.indexOf(i), walked = k >= 0 && k <= pos && phase !== 'show';
        b.classList.toggle('pm-lit', lit.has(i));
        b.classList.toggle('pm-walk', walked && !lit.has(i));
        b.classList.toggle('pm-here', phase === 'play' && i === route[pos]);
        let face = '';
        if (k === 0) face = '🚩'; else if (k === steps) face = '🏁';
        else if (lit.has(i)) face = '★'; else if (walked) face = '👣';
        b.textContent = face;
        b.setAttribute('aria-label', k === 0 ? 'Start flag' : k === steps ? 'Finish flag' : 'Tile');
      });
    }
    function setLeft() { const r = steps - pos; left.textContent = r ? (r === 1 ? '1 step to go' : r + ' steps to go') : 'You made it!'; }
    function replay(msg) {
      phase = 'show'; board.classList.add('pm-watch'); again.hidden = true; lit = new Set(); render();
      api.hint(msg);
      const gap = 800;
      route.forEach((t, k) => api.later(() => {
        lit.add(t); render(); tiles[t].classList.remove('pm-pop'); void tiles[t].offsetWidth; tiles[t].classList.add('pm-pop');
        tone(392 * Math.pow(2, k / 12 * 2), .22, 'triangle', .12);
      }, 500 + k * gap));
      const end = 500 + route.length * gap + 1300;
      api.later(() => { lit = new Set(); phase = 'play'; board.classList.remove('pm-watch'); again.hidden = false; render(); setLeft();
        api.hint(pos === 0 ? 'Now walk the path. Start at the 🚩 and tap the next square.' : 'Carry on from the white square. Tap the next step.'); }, end);
    }
    function nextRound() {
      api.rounds(total, round); route = pmRoute(cols, rows, steps); pos = 0; phase = 'wait'; lit = new Set();
      tiles.forEach(t => t.classList.remove('pm-pop')); render(); setLeft();
      replay('Watch the path glow from the 🚩 to the 🏁.');
    }
    function tap(i, b) {
      if (phase !== 'play' || i === route[pos]) return;
      if (!pmNbrs(route[pos], cols, rows).includes(i)) { wob(b); sfx.soft(); toast('Tap a square next to the white one'); return; }
      if (pos > 0 && i === route[pos - 1]) { wob(b); sfx.soft(); toast('That’s where you came from'); return; }
      if (i === route[pos + 1]) {
        pos++; tone(392 * Math.pow(2, pos / 12 * 2), .18, 'triangle', .13);
        b.classList.remove('pm-pop'); void b.offsetWidth; b.classList.add('pm-pop');
        render(); setLeft();
        if (pos === steps) {
          phase = 'wait'; again.hidden = true; round++; api.rounds(total, round);
          api.later(() => { sfx.good(); toast(cheer()); }, 200);
          api.hint('You reached the finish!');
          if (round === total) api.done(starsFor(mistakes, 0, 2)); else api.later(nextRound, 1800);
        }
      } else {
        mistakes++; wob(b); sfx.soft(); toast('Not that way. Let’s watch again.');
        phase = 'wait'; api.later(() => replay('Here’s the path again. Watch the glowing squares.'), 1000);
      }
    }
    api.later(nextRound, 400);
  }

  /* =========================================================
     SHOPPING BASKET
     ========================================================= */
  const SB_ITEMS = [
    ['🍞', 'Bread'], ['🥛', 'Milk'], ['🥚', 'Eggs'], ['🍎', 'Apples'], ['🍌', 'Bananas'], ['🧀', 'Cheese'], ['☕', 'Coffee'], ['🥕', 'Carrots'],
    ['🥔', 'Potatoes'], ['🍅', 'Tomatoes'], ['🧈', 'Butter'], ['🐟', 'Fish'], ['🍗', 'Chicken'], ['🧅', 'Onions'], ['🍋', 'Lemons'], ['🍇', 'Grapes'],
    ['🍪', 'Biscuits'], ['🍰', 'Cake'], ['🍯', 'Honey'], ['🍚', 'Rice'], ['🧼', 'Soap'], ['💐', 'Flowers'], ['🍊', 'Oranges'], ['🍐', 'Pears'],
    ['🌽', 'Corn'], ['🥦', 'Broccoli'], ['🍓', 'Berries'], ['🍬', 'Sweets'], ['📰', 'Paper'], ['🧂', 'Salt'], ['🥐', 'Croissant'], ['🥧', 'Pie'],
    ['🥬', 'Lettuce'], ['🥒', 'Cucumber'], ['🍦', 'Ice cream'], ['🕯️', 'Candles']
  ];
  const SB_SHOPS = ['The Corner Shop', 'The Market Stall', 'The Village Store', 'The Farm Shop', 'The Grocer’s', 'The High Street Shop'];
  function startBasket(L, api) {
    // list: 2 items at level 1, rising gently to 6; shelf: list plus as many distractors, then a few more, capped at 12
    const listN = 2 + ease(L, 4, 6), shelfN = Math.min(12, listN * 2 + (L >= 4 ? randInt(3) : 0)), total = 3;
    const pool = shuffle(SB_ITEMS.slice());
    let round = 0, mistakes = 0, peeks = 0;

    function noteFor(list, got) {
      const n = el('div', 'sb-note');
      n.append(el('h3', '', 'Shopping list'));
      const ul = el('ul');
      list.forEach(([e, w]) => { const li = el('li', got && got.has(w) ? 'sb-tick' : '', `<span class="e">${e}</span><span>${w}</span>`); ul.append(li); });
      n.append(ul); return n;
    }
    function newRound() {
      api.rounds(total, round); api.stage.innerHTML = '';
      const start = (round * listN) % (pool.length - shelfN);
      const list = pool.slice(start, start + listN);
      const others = shuffle(pool.filter(x => !list.includes(x))).slice(0, shelfN - listN);
      const wrap = el('div', 'sb-wrap'), tools = el('div', 'sb-tools');
      tools.append(btn('I’ve got it. Let’s shop! 🛒', 'c-leaf', () => { sfx.tap(); shop(list, others); }));
      wrap.append(noteFor(list), tools); api.stage.append(wrap);
      api.hint('Here is your shopping list. Take your time to remember it.');
    }
    function shop(list, others) {
      api.stage.innerHTML = '';
      const got = new Set(), want = new Set(list.map(x => x[1]));
      let peekBox = null, finished = false;
      const wrap = el('div', 'sb-wrap');
      const basket = el('div', 'sb-basket', `<span>🧺 <span class="sb-lft"></span></span><span class="sb-in"></span>`);
      const setLeft = () => { const r = want.size - got.size; basket.querySelector('.sb-lft').textContent = r ? r + ' to find' : 'All done!'; };
      const shelf = el('div', 'sb-shelf'), grid = el('div', 'sb-grid');
      shelf.append(el('div', 'sb-sign', pick(SB_SHOPS)), grid);
      shuffle([...list, ...others]).forEach(([e, w]) => {
        const spot = el('div', 'sb-spot');
        const b = el('button', 'sb-item tile c-card', `<span class="e">${e}</span><span>${w}</span>`); b.type = 'button';
        b.onclick = () => {
          if (finished || got.has(w)) return;
          if (want.has(w)) {
            got.add(w); b.classList.add('sb-taken'); tone(520 + got.size * 70, .16, 'triangle', .13);
            basket.querySelector('.sb-in').append(el('span', '', e)); setLeft();
            if (peekBox) { const fresh = noteFor(list, got); peekBox.replaceWith(fresh); peekBox = fresh; }
            if (got.size === want.size) {
              finished = true; round++; api.rounds(total, round); peekBtn.hidden = true;
              api.later(() => { sfx.good(); toast(cheer()); }, 200);
              api.hint('Everything on the list is in your basket!');
              if (round === total) api.done(starsFor(mistakes + peeks, 1, 3)); else api.later(newRound, 1800);
            } else toast(cheer());
          } else { mistakes++; wob(b); sfx.soft(); toast('That one wasn’t on the list'); }
        };
        spot.append(b); grid.append(spot);
      });
      const tools = el('div', 'sb-tools');
      const peekBtn = btn('📝 Show the list again', 'c-sun', () => {
        if (finished) return;
        sfx.tap();
        if (peekBox) { peekBox.remove(); peekBox = null; peekBtn.textContent = '📝 Show the list again'; return; }
        peeks++; peekBox = noteFor(list, got); wrap.insertBefore(peekBox, basket); peekBtn.textContent = 'Hide the list';
        toast('Here’s your list');
        peekBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
      tools.append(peekBtn);
      setLeft();
      wrap.append(basket, shelf, tools); api.stage.append(wrap);
      api.hint('Tap the things that were on your list to put them in the basket.');
    }
    newRound();
  }
})();
