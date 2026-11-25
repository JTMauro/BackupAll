/* Recall extra games: Merge Up (numbers) and Word Search (words) */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor, store } = R;

  R.css(`
/* ---------- Merge Up ---------- */
.mu-top{display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:10px 16px; margin:0 auto 16px; font:600 1.3rem var(--display)}
.mu-goal{width:68px; height:68px; font:700 1.7rem var(--display); border-radius:20%}
.mu-board{--g:10px; position:relative; width:min(100%, 440px); aspect-ratio:1; margin:0 auto; border-radius:24px;
  background:rgba(0,0,0,.22); box-shadow:inset 0 4px 14px rgba(0,0,0,.32); touch-action:none; user-select:none; -webkit-user-select:none;
  --fs:calc(min(100vw - 32px, 440px) / var(--n) * .42)}
.mu-cell,.mu-tile{position:absolute;
  left:calc(var(--g) + (100% - var(--g)) * var(--x) / var(--n)); top:calc(var(--g) + (100% - var(--g)) * var(--y) / var(--n));
  width:calc((100% - var(--g)) / var(--n) - var(--g)); height:calc((100% - var(--g)) / var(--n) - var(--g))}
.mu-cell{border-radius:18%; background:rgba(255,255,255,.1); box-shadow:inset 0 3px 0 rgba(0,0,0,.12)}
.mu-tile{border-radius:18%; z-index:1; font:700 var(--fs)/1 var(--display); transition:left .12s ease-out, top .12s ease-out}
.mu-tile.d3{font-size:calc(var(--fs) * .78)}
.mu-tile.new{animation:bounceIn .22s ease-out}
.mu-tile.merged{animation:mu-pop .28s ease-out; z-index:2}
.mu-tile.gone{animation:pop .32s forwards; z-index:0}
@keyframes mu-pop{0%{scale:1} 45%{scale:1.22} 100%{scale:1}}
.mu-v2{--c:var(--sky); --d:var(--sky-d)}
.mu-v4{--c:var(--leaf); --d:var(--leaf-d)}
.mu-v8{--c:var(--sun); --d:var(--sun-d)}
.mu-v16{--c:var(--orange); --d:var(--orange-d)}
.mu-v32{--c:var(--coral); --d:var(--coral-d)}
.mu-v64{--c:var(--berry); --d:var(--berry-d)}
.mu-v128{--c:var(--grape); --d:var(--grape-d)}
.mu-v256,.mu-vbig{--c:#FFE066; --d:#C28A00; background:radial-gradient(circle at 30% 25%, #fff 0 6%, transparent 7%), linear-gradient(155deg, #FFF3B0, #FFC234 55%, #FF9A3C)}
.mu-pad{display:flex; justify-content:center; gap:12px; margin:24px auto 0}
.mu-arrow{width:72px; height:72px; padding:0; font-size:2rem; border-radius:20px}
.mu-tools{display:flex; flex-wrap:wrap; justify-content:center; gap:14px; margin-top:20px}
.mu-tools .btn[disabled]{opacity:.4; pointer-events:none}
.mu-tidy{animation:bounceIn .3s}

/* ---------- Word Search ---------- */
.ws-wrap{display:flex; flex-wrap:wrap; justify-content:center; align-items:flex-start; gap:20px; max-width:960px; margin:0 auto}
.ws-board{flex:0 1 auto; width:min(100%, calc(var(--n) * 58px + 16px)); padding:8px; border-radius:22px; background:var(--card);
  box-shadow:0 7px 0 var(--card-edge), 0 14px 26px rgba(0,0,0,.28);
  --fs:calc(min(100vw - 48px, var(--n) * 58px) / var(--n) * .6)}
.ws-grid{position:relative; display:grid; grid-template-columns:repeat(var(--n), 1fr); aspect-ratio:1}
.ws-bands{position:absolute; inset:0; width:100%; height:100%; pointer-events:none; overflow:visible}
.ws-bands line{stroke-width:.76; stroke-linecap:round; opacity:.6}
.ws-bands line.new{animation:ws-draw .35s ease-out}
@keyframes ws-draw{from{opacity:0}}
.ws-cell{position:relative; z-index:1; min-width:0; aspect-ratio:1; padding:0; border:0; border-radius:12px; background:none; cursor:pointer;
  display:grid; place-items:center; color:var(--ink); font:700 var(--fs)/1 var(--display)}
.ws-cell.sel{background:var(--sun); box-shadow:inset 0 0 0 3px var(--sun-d), 0 0 0 3px #fff; animation:bounceIn .2s}
.ws-cell.hint{animation:ws-glow .8s 3}
@keyframes ws-glow{50%{background:var(--sun); scale:1.18}}
.ws-list{flex:1 1 200px; max-width:660px; display:flex; flex-wrap:wrap; gap:10px; align-content:flex-start; justify-content:center}
.ws-theme{flex-basis:100%; text-align:center; font:600 1.3rem var(--display); color:var(--on-table)}
.ws-word{display:flex; align-items:center; gap:10px; padding:8px 14px 8px 8px; border-radius:16px; background:rgba(0,0,0,.2);
  font:700 1.35rem/1 var(--display); letter-spacing:.05em}
.ws-tick{width:36px; height:36px; flex:none; display:grid; place-items:center; border-radius:10px; background:rgba(255,255,255,.18); font-size:1.6rem; line-height:1}
.ws-word.found{background:var(--wc); color:var(--ink); animation:bounceIn .3s}
.ws-word.found .ws-tick{background:#fff; color:var(--leaf-d)}
.ws-tools{flex-basis:100%; display:flex; justify-content:center}
@media (max-width:520px){ .ws-list{gap:8px} .ws-word{font-size:1.15rem; gap:8px; padding:6px 10px 6px 6px} .ws-tick{width:30px; height:30px; font-size:1.35rem} .ws-theme{font-size:1.15rem} }
@media (min-width:760px){ .ws-board{order:-1} .ws-list{justify-content:flex-start} .ws-theme{text-align:left} }
`);

  register({ id: 'merge', cat: 'numbers', order: 3, name: 'Merge Up', icon: '🔢', desc: 'Slide matching cubes together to grow them', gentle: false, start: startMerge });
  register({ id: 'wordsearch', cat: 'words', order: 3, name: 'Word Search', icon: '🔠', desc: 'Find the hidden words in the letters', gentle: true, start: startWordSearch });

  /* =========================================================
     MERGE UP
     ========================================================= */
  function startMerge(L, api) {
    L = Math.max(1, Math.floor(L) || 1);
    const n = L <= 1 ? 3 : 4;
    const target = [32, 64, 128, 256][Math.min(L, 4) - 1];
    const steps = Math.log2(target) - 1;
    let tiles = [], nextId = 1, busy = false, finished = false, tidies = 0, history = null;
    const els = new Map();

    const top = el('div', 'mu-top', `<span>Make a</span><span class="tile mu-goal mu-v${target}">${target}</span><span>cube</span>`);
    const board = el('div', 'mu-board'); board.style.setProperty('--n', n);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const cell = el('div', 'mu-cell'); cell.style.setProperty('--x', c); cell.style.setProperty('--y', r); board.append(cell); }
    const pad = el('div', 'mu-pad');
    [['left', '◀', 'Slide left'], ['up', '▲', 'Slide up'], ['down', '▼', 'Slide down'], ['right', '▶', 'Slide right']].forEach(([d, s, lab]) => {
      const b = el('button', 'btn c-card mu-arrow press', s); b.type = 'button'; b.setAttribute('aria-label', lab);
      b.onclick = () => move(d); pad.append(b);
    });
    const tools = el('div', 'mu-tools');
    const undoBtn = el('button', 'btn c-card', '↶ Undo'); undoBtn.type = 'button'; undoBtn.onclick = undo;
    const tidyBtn = el('button', 'btn c-sun mu-tidy', '🧹 Tidy up'); tidyBtn.type = 'button'; tidyBtn.hidden = true; tidyBtn.onclick = tidy;
    tools.append(undoBtn, tidyBtn);
    api.stage.append(top, board, pad, tools);

    const at = (r, c) => tiles.find(t => t.r === r && t.c === c);
    const maxV = () => tiles.reduce((m, t) => Math.max(m, t.v), 0);
    const cls = v => 'mu-tile tile ' + (v <= 256 ? 'mu-v' + v : 'mu-vbig') + (v >= 100 ? ' d3' : '');
    const BASE_HINT = 'Swipe the board, or tap an arrow, to slide every cube. Two the same join together.';

    function paint(t, e) { e.className = cls(t.v); e.textContent = t.v; e.dataset.v = t.v; place(t, e); }
    function place(t, e) { e.style.setProperty('--x', t.c); e.style.setProperty('--y', t.r); e.dataset.r = t.r; e.dataset.c = t.c; }
    function addEl(t, anim) { const e = el('div'); paint(t, e); if (anim) e.classList.add(anim); els.set(t.id, e); board.append(e); return e; }
    function redrawAll() { els.forEach(e => e.remove()); els.clear(); tiles.forEach(t => addEl(t)); }

    function spawn() {
      const free = [];
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!at(r, c)) free.push([r, c]);
      if (!free.length) return;
      const [r, c] = pick(free);
      const t = { id: nextId++, v: Math.random() < .1 ? 4 : 2, r, c };
      tiles.push(t); addEl(t, 'new');
    }
    function canMove() {
      if (tiles.length < n * n) return true;
      for (const t of tiles) { const rt = at(t.r, t.c + 1), dn = at(t.r + 1, t.c); if ((rt && rt.v === t.v) || (dn && dn.v === t.v)) return true; }
      return false;
    }
    function status() {
      api.rounds(steps, Math.max(0, Math.log2(maxV()) - 1));
      undoBtn.disabled = !history;
      const stuck = !canMove();
      if (stuck && tidyBtn.hidden) api.later(() => { try { tidyBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {} }, 200);
      tidyBtn.hidden = !stuck;
      if (stuck) api.hint('The board is full. Tap “Tidy up” to clear away some small cubes' + (history ? ', or Undo your last move.' : '.'));
      else api.hint(BASE_HINT);
    }

    function move(dir) {
      if (busy || finished) return;
      const before = tiles.map(t => ({ ...t }));
      const rev = dir === 'right' || dir === 'down', horiz = dir === 'left' || dir === 'right';
      let moved = false; const merges = [], dead = [];
      tiles.forEach(t => { t.merged = false; });
      for (let line = 0; line < n; line++) {
        const pos = [...Array(n)].map((_, k) => { const k2 = rev ? n - 1 - k : k; return horiz ? [line, k2] : [k2, line]; });
        const items = pos.map(([r, c]) => at(r, c)).filter(Boolean);
        let out = 0, last = null;
        items.forEach(t => {
          if (last && last.v === t.v && !last.merged) {
            t.r = last.r; t.c = last.c; last.v *= 2; last.merged = true; merges.push(last); dead.push(t); moved = true;
          } else {
            const [r, c] = pos[out++]; if (t.r !== r || t.c !== c) moved = true; t.r = r; t.c = c; last = t;
          }
        });
      }
      if (!moved) { tone(300, .12, 'sine', .06); wob(board); return; }
      history = { tiles: before, nextId };
      busy = true; sfx.tap();
      tiles.forEach(t => place(t, els.get(t.id)));
      tiles = tiles.filter(t => !dead.includes(t));
      api.later(() => {
        dead.forEach(t => { els.get(t.id).remove(); els.delete(t.id); });
        merges.sort((a, b) => a.v - b.v).forEach((t, k) => {
          const e = els.get(t.id); paint(t, e); e.classList.remove('new', 'merged'); void e.offsetWidth; e.classList.add('merged');
          const f = 260 + Math.log2(t.v) * 70;
          tone(f, .16, 'triangle', .12, k * .08); tone(f * 1.5, .14, 'sine', .07, k * .08 + .06);
        });
        if (merges.length >= 2) toast(cheer());
        if (maxV() >= target) { win(); return; }
        spawn(); busy = false; status();
      }, 130);
    }

    function win() {
      finished = true; busy = true; tidyBtn.hidden = true; undoBtn.disabled = true;
      api.rounds(steps, steps);
      const big = tiles.find(t => t.v >= target), e = els.get(big.id);
      api.hint(`You made the ${target} cube!`);
      api.later(() => { e.classList.remove('merged'); void e.offsetWidth; e.classList.add('merged'); sfx.good(); }, 250);
      api.done(starsFor(tidies, 0, L >= 4 ? 3 : 2));
    }

    function undo() {
      if (busy || finished || !history) return;
      tiles = history.tiles.map(t => ({ ...t })); nextId = history.nextId; history = null;
      sfx.tap(); redrawAll(); status();
    }

    function tidy() {
      if (busy || finished) return;
      busy = true; tidies++; history = null; tidyBtn.hidden = true;
      const top1 = maxV(), want = Math.ceil(n * n / 3);
      const vals = [...new Set(tiles.map(t => t.v))].sort((a, b) => a - b);
      const gone = [];
      for (const v of vals) {
        if (gone.length >= want || v === top1) break;
        tiles.filter(t => t.v === v).forEach(t => gone.push(t));
      }
      if (!gone.length) gone.push(...tiles.filter(t => t.v !== top1).slice(0, want));
      tiles = tiles.filter(t => !gone.includes(t));
      gone.forEach((t, k) => { const e = els.get(t.id); els.delete(t.id); e.classList.add('gone'); tone(700 - k * 40, .1, 'triangle', .07, k * .05); api.later(() => e.remove(), 340); });
      toast('All tidy!');
      api.later(() => { busy = false; status(); }, 360);
    }

    // swipe
    let sx = null, sy = null;
    board.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
    board.addEventListener('pointerup', e => {
      if (sx === null) return;
      const dx = e.clientX - sx, dy = e.clientY - sy; sx = sy = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    });
    board.addEventListener('pointercancel', () => { sx = sy = null; });
    // keyboard
    const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    function onKey(e) {
      if (!board.isConnected) { document.removeEventListener('keydown', onKey); return; }
      const d = KEYS[e.key]; if (!d) return;
      e.preventDefault(); move(d);
    }
    document.addEventListener('keydown', onKey);

    spawn(); spawn();
    status();
  }

  /* =========================================================
     WORD SEARCH
     ========================================================= */
  const WS_THEMES = [
    { name: 'Flowers', icon: '🌸', words: ['ROSE', 'DAISY', 'TULIP', 'LILY', 'POPPY', 'PANSY', 'IRIS', 'LUPIN', 'ORCHID', 'VIOLET', 'DAHLIA', 'ASTER', 'CROCUS', 'BLUEBELL', 'DAFFODIL', 'SNOWDROP', 'LILAC', 'HEATHER'] },
    { name: 'Food', icon: '🍲', words: ['BREAD', 'CHEESE', 'APPLE', 'SOUP', 'PIE', 'CAKE', 'JAM', 'EGG', 'HAM', 'PEAS', 'RICE', 'BUTTER', 'SCONE', 'HONEY', 'PASTA', 'PEAR', 'TOAST', 'GRAVY', 'CARROT', 'BISCUIT', 'PORRIDGE'] },
    { name: 'Animals', icon: '🐾', words: ['CAT', 'DOG', 'COW', 'PIG', 'HORSE', 'SHEEP', 'GOAT', 'DUCK', 'HEN', 'FOX', 'RABBIT', 'MOUSE', 'OWL', 'DONKEY', 'LAMB', 'BEAR', 'LION', 'TIGER', 'ZEBRA', 'MONKEY', 'ELEPHANT', 'GIRAFFE'] },
    { name: 'The seaside', icon: '🏖️', words: ['SAND', 'SEA', 'WAVE', 'SHELL', 'CRAB', 'PIER', 'BOAT', 'BEACH', 'SPADE', 'BUCKET', 'TIDE', 'GULL', 'ROCK', 'SUN', 'TOWEL', 'KITE', 'DECKCHAIR', 'HARBOUR', 'PICNIC'] },
    { name: 'The garden', icon: '🌳', words: ['RAKE', 'HOSE', 'SHED', 'TREE', 'SEEDS', 'POND', 'BENCH', 'HEDGE', 'LAWN', 'PATH', 'FENCE', 'WORM', 'BIRD', 'TROWEL', 'GNOME', 'BARROW', 'PATIO', 'BULBS', 'GREENHOUSE'] },
    { name: 'Sport', icon: '⚽', words: ['GOLF', 'TENNIS', 'BALL', 'GOAL', 'BAT', 'NET', 'RUGBY', 'BOWLS', 'DARTS', 'SNOOKER', 'CRICKET', 'RACE', 'SWIM', 'TEAM', 'CUP', 'MEDAL', 'BOXING', 'HOCKEY'] },
    { name: 'Music', icon: '🎵', words: ['PIANO', 'DRUM', 'SONG', 'BAND', 'HARP', 'FLUTE', 'VIOLIN', 'GUITAR', 'TUNE', 'NOTE', 'CHOIR', 'DANCE', 'BANJO', 'TRUMPET', 'ORGAN', 'SING', 'BELL', 'HYMN'] }
  ];
  // Short words that random filler letters must never spell (checked in all directions).
  const WS_BAD = ['ASS', 'ARSE', 'BUM', 'POO', 'POOP', 'FART', 'TIT', 'PISS', 'SHIT', 'CRAP', 'FUCK', 'FUK', 'FCK', 'CUNT', 'COCK', 'DICK', 'KNOB', 'NOB',
    'PRAT', 'TWAT', 'WANK', 'SEX', 'BOOB', 'SLUT', 'HOE', 'FAG', 'NAZI', 'KKK', 'DIE', 'KILL', 'DEAD', 'PUKE', 'SPUNK', 'JIZZ', 'PORN', 'NUDE', 'BITCH', 'PENIS', 'GAY', 'HOMO', 'RAPE', 'NIG', 'PAKI', 'SPAZ', 'TURD', 'PUS', 'POX'];
  const WS_FILL = 'AAAABBCCDDEEEEEFFGGHHIIIILLMMNNNOOOOPPRRRSSSSTTTTUUWWYK';
  const WS_COLS = ['--sun', '--leaf', '--sky', '--berry', '--orange', '--grape', '--coral', '--peach'];


  function wsBuild(L) {
    const [n, count] = [[6, 3], [7, 4], [8, 5], [8, 6], [9, 7], [10, 8]][Math.min(L, 6) - 1];
    const dirs = [[0, 1], [1, 0]];
    if (L >= 4) dirs.push([1, 1]);
    if (L >= 6) dirs.push([-1, 1]);
    const maxLen = Math.min(n, L <= 1 ? 5 : L <= 2 ? 6 : n);
    const lastTheme = store.get('ws-theme', '');
    const themes = shuffle(WS_THEMES.filter(t => t.name !== lastTheme));
    for (let attempt = 0; attempt < 400; attempt++) {
      const theme = themes[attempt % themes.length];
      const pool = shuffle(theme.words.filter(w => w.length >= 3 && w.length <= maxLen));
      const words = [];
      for (const w of pool) { if (words.length === count) break; if (words.some(x => x.includes(w) || w.includes(x))) continue; words.push(w); }
      if (words.length < count) continue;
      const grid = Array(n * n).fill(null), placed = [];
      const order = words.slice().sort((a, b) => b.length - a.length);
      let ok = true;
      for (let wi = 0; wi < order.length && ok; wi++) {
        const w = order[wi]; let done = false;
        for (let tries = 0; tries < 300 && !done; tries++) {
          // make sure diagonal levels actually include a diagonal word
          const d = (wi === 0 && L >= 4) ? dirs[2 + randInt(dirs.length - 2)] : pick(dirs);
          const r0 = randInt(n), c0 = randInt(n), rE = r0 + d[0] * (w.length - 1), cE = c0 + d[1] * (w.length - 1);
          if (rE < 0 || rE >= n || cE < 0 || cE >= n) continue;
          const cells = [...w].map((_, k) => (r0 + d[0] * k) * n + c0 + d[1] * k);
          if (cells.some((ci, k) => grid[ci] !== null && (L < 3 || grid[ci] !== w[k]))) continue;
          cells.forEach((ci, k) => { grid[ci] = w[k]; });
          placed.push({ w, cells }); done = true;
        }
        ok = done;
      }
      if (!ok) continue;
      const filler = []; grid.forEach((ch, i) => { if (ch === null) filler.push(i); });
      filler.forEach(i => { grid[i] = pick(WS_FILL); });
      // scrub rude words that touch filler letters
      let clean = false;
      for (let k = 0; k < 600 && !clean; k++) {
        const bad = wsFindBad(grid, n, new Set(filler));
        if (!bad.length) clean = true; else bad.forEach(i => { grid[i] = pick(WS_FILL); });
      }
      if (!clean || wsFindBad(grid, n, new Set(grid.map((_, i) => i))).length) continue;
      store.set('ws-theme', theme.name);
      return { n, dirs, theme, words, grid, placed };
    }
    return null;
  }
  // returns filler cells that are part of a blocked word, in any of the 8 directions
  function wsFindBad(grid, n, filler) {
    const out = new Set();
    const lines = [];
    for (let r = 0; r < n; r++) lines.push([...Array(n)].map((_, c) => r * n + c));
    for (let c = 0; c < n; c++) lines.push([...Array(n)].map((_, r) => r * n + c));
    for (let s = -(n - 1); s < n; s++) {
      const a = [], b = [];
      for (let r = 0; r < n; r++) { const c = r + s; if (c >= 0 && c < n) a.push(r * n + c); const c2 = s + n - 1 - r; if (c2 >= 0 && c2 < n) b.push(r * n + c2); }
      if (a.length >= 3) lines.push(a); if (b.length >= 3) lines.push(b);
    }
    lines.forEach(line => [line, line.slice().reverse()].forEach(ln => {
      const s = ln.map(i => grid[i]).join('');
      WS_BAD.forEach(bw => {
        let p = s.indexOf(bw);
        while (p >= 0) { ln.slice(p, p + bw.length).forEach(i => { if (filler.has(i)) out.add(i); }); p = s.indexOf(bw, p + 1); }
      });
    }));
    return [...out];
  }
  R.wsBuild = wsBuild; R.wsFindBad = wsFindBad; // exposed for testing

  function startWordSearch(L, api) {
    L = Math.max(1, Math.floor(L) || 1);
    const P = wsBuild(L) || wsBuild(1);
    const { n, dirs, theme, words, grid } = P;
    const found = words.map(() => false);
    let first = null, mistakes = 0, hints = 0, nFound = 0, finished = false;
    const BASE = 'Tap the first letter of a word, then tap its last letter.';
    api.hint(BASE); api.rounds(words.length, 0);

    const wrap = el('div', 'ws-wrap');
    const list = el('div', 'ws-list');
    list.append(el('div', 'ws-theme', `${theme.icon} ${theme.name}: find ${words.length} words`));
    const chips = words.map(w => { const c = el('div', 'ws-word', `<span class="ws-tick" aria-hidden="true"></span><span>${w}</span>`); list.append(c); return c; });
    const board = el('div', 'ws-board'); board.style.setProperty('--n', n);
    const gEl = el('div', 'ws-grid');
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'ws-bands'); svg.setAttribute('viewBox', `0 0 ${n} ${n}`); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
    gEl.append(svg);
    const cells = grid.map((ch, i) => {
      const b = el('button', 'ws-cell', ch); b.type = 'button'; b.dataset.i = i;
      b.setAttribute('aria-label', `${ch}, row ${Math.floor(i / n) + 1}, column ${i % n + 1}`);
      b.onclick = () => tap(i); gEl.append(b); return b;
    });
    board.append(gEl);
    const tools = el('div', 'ws-tools');
    const hintBtn = el('button', 'btn c-card', '💡 Show me a letter'); hintBtn.type = 'button'; hintBtn.onclick = giveHint;
    tools.append(hintBtn);
    wrap.append(list, board, tools);
    api.stage.append(wrap);

    function lineBetween(a, b) {
      const ra = Math.floor(a / n), ca = a % n, rb = Math.floor(b / n), cb = b % n, dr = rb - ra, dc = cb - ca;
      const len = Math.max(Math.abs(dr), Math.abs(dc));
      for (const [y, x] of dirs) if (dr === y * len && dc === x * len) return [...Array(len + 1)].map((_, k) => (ra + y * k) * n + ca + x * k);
      return null;
    }
    function select(i) { first = i; cells[i].classList.add('sel'); }
    function clearSel() { if (first !== null) cells[first].classList.remove('sel'); first = null; }

    function tap(i) {
      if (finished) return;
      if (first === null) { select(i); sfx.tap(); api.hint('Now tap the last letter of that word.'); return; }
      if (first === i) { clearSel(); api.hint(BASE); return; }
      const a = first; clearSel();
      const line = lineBetween(a, i) || lineBetween(i, a);
      if (!line) { select(i); sfx.tap(); toast('Starting from this letter'); api.hint('Now tap the last letter of that word.'); return; }
      const word = line.map(k => grid[k]).join('');
      const idx = words.findIndex((w, k) => !found[k] && w === word);
      if (idx < 0) {
        api.hint(BASE);
        if (words.includes(word)) { toast('You found that one already'); return; }
        mistakes++; sfx.soft(); wob(board); toast('That’s not one of the words'); return;
      }
      found[idx] = true; nFound++;
      const col = `var(${WS_COLS[idx % WS_COLS.length]})`;
      const s = line[0], e = line[line.length - 1];
      const ln = document.createElementNS(svgNS, 'line');
      ln.setAttribute('x1', s % n + .5); ln.setAttribute('y1', Math.floor(s / n) + .5);
      ln.setAttribute('x2', e % n + .5); ln.setAttribute('y2', Math.floor(e / n) + .5);
      ln.setAttribute('class', 'new'); ln.style.stroke = col; svg.append(ln);
      chips[idx].style.setProperty('--wc', col); chips[idx].classList.add('found'); chips[idx].querySelector('.ws-tick').textContent = '✓';
      line.forEach((k, j) => tone(440 + j * 55 + nFound * 20, .1, 'triangle', .09, j * .05));
      api.rounds(words.length, nFound);
      if (nFound === words.length) {
        finished = true; hintBtn.disabled = true; api.hint('You found every word!');
        api.later(() => sfx.good(), 300);
        api.done(starsFor(mistakes + hints, 1, 4));
      } else { toast(cheer()); api.hint(`${words.length - nFound} more to find. ` + BASE); }
    }

    function giveHint() {
      if (finished) return;
      const left = words.map((w, k) => k).filter(k => !found[k]);
      const k = pick(left);
      const pl = P.placed.find(p => p.w === words[k]);
      hints++; sfx.tap(); clearSel();
      const c = cells[pl.cells[0]]; c.classList.remove('hint'); void c.offsetWidth; c.classList.add('hint');
      api.hint(`${words[k]} starts with the glowing ${words[k][0]}. Tap it, then the last letter.`);
      api.later(() => c.classList.remove('hint'), 2600);
    }
  }
})();
