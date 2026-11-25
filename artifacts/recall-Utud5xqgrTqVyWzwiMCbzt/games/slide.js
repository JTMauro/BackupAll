/* Recall: Slide & Fit games (plus Colour Pour for Sorting).
   Every level is generated fresh by an algorithm and is solvable by construction or by a solver. */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor, CUBES } = R;

  /* ---------- shared bits ---------- */
  // Smooth difficulty curve: starts at a, eases toward the cap b and plateaus.
  const ramp = (L, a, b, rate) => b + (a - b) * Math.exp(-(Math.max(1, L) - 1) / rate);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const COLS7 = [...CUBES, { c: 'orange', s: '◆' }, { c: 'grape', s: '✚' }];
  function mkBtn(html, cls, fn) { const b = el('button', 'btn ' + cls, html); b.type = 'button'; b.onclick = fn; return b; }

  R.css(`
.sl-wrap{max-width:560px; margin:0 auto; display:grid; gap:18px; justify-items:center}
.sl-ctl{display:flex; flex-wrap:wrap; gap:12px; justify-content:center; width:100%}
.sl-ctl .btn{font-size:1.15rem}
.sl-ctl .btn:disabled{opacity:.4; cursor:default}
.sl-info{font:600 1.25rem var(--display); color:var(--on-table-soft); text-align:center; margin:0}

/* Number Slide */
.sl-board{position:relative; width:min(100%, calc(var(--cols) * 112px)); aspect-ratio:var(--cols) / var(--rows); border-radius:26px;
  background:rgba(0,0,0,.24); box-shadow:inset 0 5px 14px rgba(0,0,0,.35), 0 0 0 4px rgba(255,255,255,.18)}
.sl-in{position:absolute; inset:8px}
.sl-t{position:absolute; width:calc(100% / var(--cols)); height:calc(100% / var(--rows)); padding:5px; background:none; border:0; cursor:pointer; transition:left .17s ease-out, top .17s ease-out}
.sl-t .tile{width:100%; height:100%; font:700 clamp(1.7rem, 8vw, 2.7rem) var(--display); border-radius:18%}
.sl-t.ok .tile{box-shadow:inset 0 -6px 0 rgba(0,0,0,.14), inset 0 3px 0 rgba(255,255,255,.5), 0 6px 0 var(--d), 0 0 0 4px rgba(255,255,255,.75), 0 12px 18px rgba(0,0,0,.28)}
.sl-t.win .tile{animation:bounceIn .45s backwards}
.sl-peek{position:absolute; inset:0; border-radius:26px; background:#073F4D; display:grid; place-items:center; animation:bounceIn .3s}
.sl-peek .sl-in{inset:8px}
.sl-peek .sl-t{cursor:default}
.sl-tag{position:absolute; top:-18px; left:50%; translate:-50% 0; z-index:3; white-space:nowrap; background:var(--sun); color:var(--ink); font:700 1.05rem var(--display); padding:.3em .9em; border-radius:999px; box-shadow:0 4px 0 var(--sun-d)}

/* Free the Block */
.ub-frame{position:relative; width:min(100%, 440px); padding:12px; border-radius:24px;
  background:linear-gradient(180deg,#9A6235,#7A4622); box-shadow:inset 0 3px 0 rgba(255,255,255,.25), 0 8px 0 #4E2C14, 0 16px 26px rgba(0,0,0,.35)}
.ub-board{position:relative; aspect-ratio:1; border-radius:12px; background:
  linear-gradient(rgba(0,0,0,.12) 2px, transparent 2px) 0 0 / calc(100% / 6) calc(100% / 6),
  linear-gradient(90deg, rgba(0,0,0,.12) 2px, transparent 2px) 0 0 / calc(100% / 6) calc(100% / 6), #E9C894;
  box-shadow:inset 0 4px 10px rgba(0,0,0,.35)}
.ub-exit{position:absolute; right:-8px; top:calc(12px + (100% - 24px) * 2 / 6); height:calc((100% - 24px) / 6); width:22px; border-radius:0 10px 10px 0;
  background:var(--leaf); box-shadow:0 4px 0 var(--leaf-d); display:grid; place-items:center; color:#fff; font:700 1.3rem/1 var(--display)}
.ub-b{position:absolute; padding:4px; background:none; border:0; cursor:pointer; transition:left .16s ease-out, top .16s ease-out, transform .5s ease-in}
.ub-face{display:grid; place-items:center; width:100%; height:100%; border-radius:14px; font:700 1.5rem var(--display); color:rgba(60,30,10,.55);
  background:linear-gradient(155deg, rgba(255,255,255,.35), rgba(255,255,255,0) 50%), repeating-linear-gradient(var(--grain,90deg), rgba(110,60,20,.0) 0 7px, rgba(110,60,20,.14) 7px 9px), var(--w,#C98A4B);
  box-shadow:inset 0 -5px 0 rgba(0,0,0,.16), inset 0 3px 0 rgba(255,255,255,.45), 0 5px 0 var(--wd,#8A5527), 0 9px 12px rgba(0,0,0,.3)}
.ub-b.v .ub-face{--grain:0deg}
.ub-b.gold .ub-face{--w:var(--sun); --wd:var(--sun-d); color:var(--ink); font-size:1.9rem}
.ub-b.sel .ub-face{outline:5px solid #fff; outline-offset:-1px; filter:brightness(1.08)}
.ub-b.sel{z-index:2}
.ub-b.out{transform:translateX(160%)}
.ub-dot{position:absolute; background:none; border:0; padding:0; cursor:pointer; display:grid; place-items:center; z-index:1}
.ub-dot::after{content:""; width:38%; height:38%; border-radius:50%; background:rgba(255,255,255,.85); box-shadow:0 0 0 4px rgba(12,97,112,.45); animation:bounceIn .25s}
.ub-dot.tip::after{background:var(--leaf); box-shadow:0 0 0 6px #fff}
.ub-arrows{display:flex; gap:16px; justify-content:center; min-height:72px}
.ub-arrows .btn{min-width:96px; font-size:1.8rem}
.ub-arrows .btn.tip{outline:5px solid #fff; outline-offset:3px}

/* Car Park */
.cp-lot{position:relative; width:min(100%, calc(var(--cols) * 86px)); aspect-ratio:var(--cols) / var(--rows); border-radius:18px; overflow:hidden;
  background:
   linear-gradient(90deg, rgba(255,255,255,.22) 3px, transparent 3px) 0 0 / calc(100% / var(--cols)) 100%,
   linear-gradient(rgba(255,255,255,.08) 2px, transparent 2px) 0 0 / 100% calc(100% / var(--rows)), #45525C;
  box-shadow:0 0 0 8px #8C9AA3, 0 0 0 12px #6A7780, 0 14px 26px rgba(0,0,0,.4)}
.cp-car{position:absolute; background:none; border:0; padding:0; cursor:pointer; filter:drop-shadow(0 5px 0 rgba(0,0,0,.38));
  transition:transform .55s cubic-bezier(.5,0,.9,.5), opacity .55s}
.cp-car.bump{transition:transform .14s ease-out}
.cp-car.gone{opacity:0; pointer-events:none}
.cp-rot{position:absolute; left:0; top:0; width:100%; height:100%}
.cp-car.h .cp-rot{left:25%; top:-50%; width:50%; height:200%}
.cp-body{position:absolute; left:14%; right:14%; top:5%; bottom:5%; border-radius:34% 34% 26% 26% / 18% 18% 13% 13%;
  background:linear-gradient(90deg, rgba(0,0,0,.18), rgba(255,255,255,.4) 38%, rgba(255,255,255,0) 60%, rgba(0,0,0,.16)), var(--c);
  box-shadow:inset 0 0 0 3px var(--d), inset 0 7px 0 rgba(255,255,255,.35)}
.cp-wh{position:absolute; top:17%; bottom:17%; width:15%; border-radius:5px; background:linear-gradient(#20262B 0 24%, transparent 24% 76%, #20262B 76%)}
.cp-wh.l{left:5%} .cp-wh.r{right:5%}
.cp-ws{position:absolute; left:14%; right:14%; top:16%; height:15%; border-radius:30% 30% 12% 12%; background:linear-gradient(170deg,#E6F7FF,#7FC4EE); box-shadow:inset 0 -3px 0 rgba(0,0,0,.15)}
.cp-rw{position:absolute; left:18%; right:18%; bottom:8%; height:10%; border-radius:12% 12% 30% 30%; background:linear-gradient(170deg,#D7F0FF,#79B9E2)}
.cp-lt{position:absolute; top:2%; width:20%; height:5%; border-radius:50%; background:#FFF4B0; box-shadow:0 0 6px #FFE76A}
.cp-lt.l{left:12%} .cp-lt.r{right:12%}
.cp-arw{position:absolute; left:50%; top:52%; translate:-50% -50%; width:62%; aspect-ratio:1; border-radius:50%; background:#fff; color:var(--ink);
  display:grid; place-items:center; font:700 clamp(1.1rem, 5vw, 1.6rem)/1 var(--display); box-shadow:0 3px 0 rgba(0,0,0,.2)}

/* Block Fit */
.bf-grid{display:grid; grid-template-columns:repeat(var(--n), 1fr); gap:3px; width:min(100%, 470px); aspect-ratio:1; padding:8px; border-radius:20px;
  background:rgba(0,0,0,.25); box-shadow:inset 0 4px 12px rgba(0,0,0,.3)}
.bf-c{border:0; padding:0; border-radius:22%; background:rgba(255,255,255,.13); cursor:pointer; display:grid; place-items:center; font:700 clamp(.8rem, 3.6vw, 1.3rem) var(--display); min-width:0}
.bf-c.alt{background:rgba(255,255,255,.24)}
.bf-c.tile{border-radius:22%; box-shadow:inset 0 -4px 0 rgba(0,0,0,.16), inset 0 2px 0 rgba(255,255,255,.5), 0 3px 0 var(--d)}
.bf-c.pv{background:var(--c); opacity:.8; outline:3px solid #fff; outline-offset:-3px; animation:bounceIn .2s}
.bf-c.bad{background:rgba(255,107,74,.45); outline:3px dashed #fff; outline-offset:-3px}
.bf-c.pop{animation:pop .42s forwards}
.bf-c.land{animation:bounceIn .25s}
.bf-tray{display:flex; gap:12px; justify-content:center; width:100%; max-width:470px}
.bf-slot{flex:1 1 0; min-width:0; min-height:110px; max-width:150px; border:0; border-radius:20px; background:rgba(0,0,0,.2); cursor:pointer; display:grid; place-items:center; padding:10px;
  box-shadow:inset 0 3px 8px rgba(0,0,0,.25); transition:transform .12s}
.bf-slot.sel{background:rgba(255,255,255,.28); box-shadow:inset 0 0 0 4px #fff; transform:translateY(-6px)}
.bf-slot.new{animation:bounceIn .35s}
.bf-mini{display:grid; gap:3px}
.bf-mini i{width:clamp(14px, 4.6vw, 22px); aspect-ratio:1; border-radius:5px}
.bf-mini i.on{background:linear-gradient(155deg, rgba(255,255,255,.45), rgba(255,255,255,0) 55%), var(--c); box-shadow:0 3px 0 var(--d)}

/* Shape Puzzle */
.tg-name{display:flex; align-items:center; gap:10px; font:600 1.4rem var(--display)}
.tg-name span{font-size:2rem}
.tg-svg{display:block; width:min(100%, var(--w)); height:auto; touch-action:manipulation; cursor:pointer; overflow:visible}
.tg-pc{filter:drop-shadow(0 .06px 0 rgba(0,0,0,.3))}
.tg-tray{display:flex; flex-wrap:wrap; gap:12px; justify-content:center; width:100%}
.tg-p{width:92px; height:92px; border:0; border-radius:20px; background:rgba(0,0,0,.2); padding:10px; cursor:pointer; display:grid; place-items:center;
  box-shadow:inset 0 3px 8px rgba(0,0,0,.25); transition:transform .12s}
.tg-p svg{width:100%; height:100%; overflow:visible}
.tg-p.sel{background:rgba(255,255,255,.3); box-shadow:inset 0 0 0 4px #fff; transform:translateY(-6px)}
.tg-p.used{visibility:hidden}
.tg-land{animation:bounceIn .3s}

/* Colour Pour */
.po-row{display:flex; flex-wrap:wrap; justify-content:center; gap:22px 16px; max-width:640px; margin:30px auto 0}
.po-b{position:relative; width:68px; background:none; border:0; padding:0; cursor:pointer; transition:translate .18s}
.po-b.sel{translate:0 -22px}
.po-glass{position:relative; display:flex; flex-direction:column-reverse; gap:4px; padding:6px 6px 8px; height:calc(4 * 50px + 22px); border-radius:12px 12px 30px 30px;
  background:linear-gradient(90deg, rgba(255,255,255,.08), rgba(255,255,255,.28) 30%, rgba(255,255,255,.08) 60%), rgba(255,255,255,.08);
  box-shadow:inset 0 0 0 4px rgba(255,255,255,.6), 0 8px 16px rgba(0,0,0,.25)}
.po-b.sel .po-glass{box-shadow:inset 0 0 0 5px #fff, 0 0 0 4px rgba(255,255,255,.35), 0 12px 20px rgba(0,0,0,.3)}
.po-b::before{content:""; position:absolute; left:50%; top:-12px; translate:-50% 0; width:44%; height:16px; border-radius:6px 6px 0 0; background:rgba(255,255,255,.35); box-shadow:inset 0 0 0 3px rgba(255,255,255,.6)}
.po-l{height:50px; flex:none; font-size:1.5rem; border-radius:10px}
.po-glass .po-l:first-child{border-radius:10px 10px 22px 22px}
.po-l.drop{animation:drop .25s ease-out}
.po-b.full .po-glass{box-shadow:inset 0 0 0 4px var(--leaf), 0 0 0 4px rgba(60,196,107,.5), 0 8px 16px rgba(0,0,0,.25); animation:bounceIn .4s}
.po-b.stay .po-glass{animation:none}
.po-b.full::after{content:"✓"; position:absolute; left:50%; bottom:-36px; translate:-50% 0; font:700 1.5rem var(--display); color:var(--leaf)}
`);

  /* =========================================================
     1. NUMBER SLIDE
     ========================================================= */
  register({ id: 'slide15', cat: 'slide', order: 1, name: 'Number Slide', icon: '🔢', desc: 'Slide the tiles back into number order', start: startSlide15 });

  function slidePlan(L) {
    if (L <= 1) return [2, 3, 5 + randInt(3)];
    if (L === 2) return [3, 3, 8 + randInt(3)];
    if (L === 3) return [3, 3, 13 + randInt(5)];
    return [4, 4, Math.round(ramp(L - 3, 12, 46, 7)) + randInt(6)];
  }
  function slideScramble(rows, cols, mv) {
    const N = rows * cols;
    const nb = i => { const r = Math.floor(i / cols), c = i % cols, o = []; if (r) o.push(i - cols); if (r < rows - 1) o.push(i + cols); if (c) o.push(i - 1); if (c < cols - 1) o.push(i + 1); return o; };
    let arr;
    do {
      arr = [...Array(N)].map((_, i) => (i + 1) % N);
      let g = N - 1, prev = -1;
      for (let k = 0; k < mv; k++) { const n = pick(nb(g).filter(x => x !== prev)); arr[g] = arr[n]; arr[n] = 0; prev = g; g = n; }
    } while (arr.every((v, i) => v === (i + 1) % N));
    return arr;
  }

  function startSlide15(L, api) {
    const [rows, cols, mv] = slidePlan(L), N = rows * cols;
    let arr = slideScramble(rows, cols, mv), moves = 0, finished = false, peeking = false;
    const rowCol = ['coral', 'sky', 'sun', 'leaf'];
    const isSolved = () => arr.every((v, i) => v === (i + 1) % N);
    api.hint('Tap a tile beside the gap to slide it. Put the numbers in order, 1, 2, 3…');
    const wrap = el('div', 'sl-wrap');
    const board = el('div', 'sl-board'); board.style.setProperty('--cols', cols); board.style.setProperty('--rows', rows);
    const inner = el('div', 'sl-in'); board.append(inner);
    const tiles = {};
    for (let v = 1; v < N; v++) {
      const b = el('button', 'sl-t', `<span class="tile c-${rowCol[Math.floor((v - 1) / cols)]}">${v}</span>`);
      b.type = 'button'; b.setAttribute('aria-label', 'Tile ' + v); b.onclick = () => tap(v, b);
      tiles[v] = b; inner.append(b);
    }
    const info = el('p', 'sl-info');
    const peekBtn = mkBtn('👀 Show me the finished board', 'c-sun', togglePeek);
    const ctl = el('div', 'sl-ctl'); ctl.append(peekBtn);
    wrap.append(board, info, ctl); api.stage.append(wrap);
    let peekEl = null;
    function place() {
      arr.forEach((v, i) => {
        if (!v) return;
        const t = tiles[v]; t.style.left = (i % cols) / cols * 100 + '%'; t.style.top = Math.floor(i / cols) / rows * 100 + '%';
        t.classList.toggle('ok', v === i + 1);
      });
      info.textContent = 'Moves: ' + moves;
    }
    function tap(v, b) {
      if (finished || peeking) return;
      let i = arr.indexOf(v), g = arr.indexOf(0);
      const sameRow = Math.floor(i / cols) === Math.floor(g / cols), sameCol = i % cols === g % cols;
      if (!sameRow && !sameCol) { wob(b); sfx.soft(); toast('Pick a tile in line with the gap'); return; }
      const step = sameRow ? (i > g ? 1 : -1) : (i > g ? cols : -cols);
      let n = 0;
      while (g !== i) { arr[g] = arr[g + step]; arr[g + step] = 0; g += step; n++; }
      moves++; tone(440 + n * 40, .09, 'triangle', .09); place();
      if (isSolved()) {
        finished = true; peekBtn.disabled = true;
        api.hint('All in order! ' + cheer());
        api.later(() => { sfx.good(); Object.values(tiles).forEach((t, k) => { t.style.animationDelay = k * 40 + 'ms'; t.classList.add('win'); }); }, 200);
        api.done(moves <= mv * 2 + 4 ? 3 : moves <= mv * 5 + 10 ? 2 : 1);
      }
    }
    function togglePeek() {
      if (finished) return;
      sfx.tap(); peeking = !peeking;
      if (peeking) {
        peekEl = el('div', 'sl-peek'); const pin = el('div', 'sl-in');
        for (let v = 1; v < N; v++) {
          const t = el('span', 'sl-t', `<span class="tile c-${rowCol[Math.floor((v - 1) / cols)]}">${v}</span>`);
          t.style.left = ((v - 1) % cols) / cols * 100 + '%'; t.style.top = Math.floor((v - 1) / cols) / rows * 100 + '%'; pin.append(t);
        }
        peekEl.append(el('span', 'sl-tag', 'The finished board'), pin); board.append(peekEl);
        peekBtn.innerHTML = '↩ Back to my puzzle'; api.hint('This is how it looks when it’s finished. The gap ends up in the corner.');
      } else {
        peekEl.remove(); peekEl = null; peekBtn.innerHTML = '👀 Show me the finished board';
        api.hint('Tap a tile beside the gap to slide it. Put the numbers in order, 1, 2, 3…');
      }
    }
    api.stage.__lab = { get arr() { return arr.slice(); }, rows, cols, tiles };
    place();
  }

  /* =========================================================
     2. FREE THE BLOCK
     ========================================================= */
  register({ id: 'unblock', cat: 'slide', order: 2, name: 'Free the Block', icon: '🪵', desc: 'Slide the wooden blocks to free the gold one', start: startUnblock });

  // blocks: [{h, fix, len}], block 0 is the gold block (horizontal, row 2). pos[i] = leftmost col / top row.
  function ubOcc(blocks, pos) {
    const g = new Int8Array(36).fill(-1);
    for (let i = 0; i < blocks.length; i++) { const b = blocks[i]; for (let k = 0; k < b.len; k++) g[b.h ? b.fix * 6 + pos[i] + k : (pos[i] + k) * 6 + b.fix] = i; }
    return g;
  }
  function ubMoves(blocks, pos) {
    const g = ubOcc(blocks, pos), out = [];
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i], at = k => b.h ? g[b.fix * 6 + k] : g[k * 6 + b.fix];
      for (let p = pos[i] - 1; p >= 0 && at(p) === -1; p--) out.push([i, p]);
      for (let p = pos[i] + b.len; p < 6 && at(p) === -1; p++) out.push([i, p - b.len + 1]);
    }
    return out;
  }
  const ubKey = pos => String.fromCharCode.apply(null, pos.map(p => p + 65));
  function ubSolve(blocks, pos0, cap = 200000) { // shortest list of moves [i, newPos]
    if (pos0[0] === 4) return [];
    const seen = new Map([[ubKey(pos0), null]]), q = [pos0];
    for (let h = 0; h < q.length && q.length < cap; h++) {
      const pos = q[h];
      for (const [i, p] of ubMoves(blocks, pos)) {
        const np = pos.slice(); np[i] = p; const k = ubKey(np);
        if (seen.has(k)) continue;
        seen.set(k, [pos, i, p]);
        if (i === 0 && p === 4) {
          const path = []; let cur = np;
          for (;;) { const e = seen.get(ubKey(cur)); if (!e) break; path.unshift([e[1], e[2]]); cur = e[0]; }
          return path;
        }
        q.push(np);
      }
    }
    return null;
  }
  function ubRandom(nb) {
    const blocks = [{ h: true, fix: 2, len: 2 }], pos = [randInt(3)];
    let g = ubOcc(blocks, pos);
    for (let t = 0; t < 300 && blocks.length < nb + 1; t++) {
      const h = Math.random() < .5, len = Math.random() < .28 ? 3 : 2, fix = randInt(6), p = randInt(7 - len);
      if (h && fix === 2) continue;
      let ok = true; for (let k = 0; k < len; k++) if (g[h ? fix * 6 + p + k : (p + k) * 6 + fix] !== -1) ok = false;
      if (!ok) continue;
      blocks.push({ h, fix, len }); pos.push(p); g = ubOcc(blocks, pos);
    }
    return { blocks, pos };
  }
  function ubAnalyse(blocks, pos0, cap) {
    const idx = new Map([[ubKey(pos0), 0]]), states = [pos0], adj = [];
    for (let s = 0; s < states.length; s++) {
      const pos = states[s], nbs = [];
      for (const [i, p] of ubMoves(blocks, pos)) {
        const np = pos.slice(); np[i] = p; const k = ubKey(np);
        let j = idx.get(k);
        if (j === undefined) { j = states.length; idx.set(k, j); states.push(np); if (states.length > cap) return null; }
        nbs.push(j);
      }
      adj.push(nbs);
    }
    const dist = new Int16Array(states.length).fill(-1), q = [];
    states.forEach((p, i) => { if (p[0] === 4) { dist[i] = 0; q.push(i); } });
    if (!q.length) return null;
    for (let h = 0; h < q.length; h++) for (const j of adj[q[h]]) if (dist[j] < 0) { dist[j] = dist[q[h]] + 1; q.push(j); }
    return { states, dist };
  }
  function ubBand(L) {
    if (L <= 1) return [1 + (Math.random() < .7 ? 1 : 0), 2];
    const lo = Math.round(ramp(L, 2, 12, 7));
    return [lo, lo + 1 + Math.floor(lo / 4)];
  }
  function ubMutate({ blocks, pos }) {
    const B = blocks.map(b => Object.assign({}, b)), P = pos.slice(), op = randInt(3);
    if ((op === 0 && B.length > 2) || B.length > 13) { const i = 1 + randInt(B.length - 1); B.splice(i, 1); P.splice(i, 1); }
    else {
      if (op === 2 && B.length > 1) { const i = 1 + randInt(B.length - 1); B.splice(i, 1); P.splice(i, 1); }
      const g = ubOcc(B, P);
      for (let t = 0; t < 60; t++) {
        const h = Math.random() < .5, len = Math.random() < .35 ? 3 : 2, fix = randInt(6), p = randInt(7 - len);
        if (h && fix === 2) continue;
        let ok = true; for (let k = 0; k < len; k++) if (g[h ? fix * 6 + p + k : (p + k) * 6 + fix] !== -1) ok = false;
        if (ok) { B.push({ h, fix, len }); P.push(p); break; }
      }
    }
    return { blocks: B, pos: P };
  }
  // Random placement + full state-space BFS, with hill-climbing on the hardest state found.
  // Keeps a start state whose minimum number of moves falls in [lo, hi] (BFS layers are contiguous,
  // so any component whose farthest state is >= lo contains states at exactly lo).
  function ubGen(lo, hi, budget = 1500) {
    const t0 = now(); let best = null, cur = null, stale = 0;
    for (let tries = 0; ; tries++) {
      if (++stale > 50) { cur = null; stale = 0; }
      const cand = (!cur || Math.random() < .08) ? ubRandom(clamp(Math.round(1.5 + lo * .6 + Math.random() * 4 - 2), 1, 13)) : ubMutate(cur);
      const a = ubAnalyse(cand.blocks, cand.pos, 40000);
      if (a) {
        const c = []; let mi = 0;
        a.dist.forEach((d, i) => { if (d >= lo && d <= hi) c.push(i); if (d > a.dist[mi]) mi = i; });
        if (c.length) { const i = pick(c); return { blocks: cand.blocks, pos: a.states[i], min: a.dist[i] }; }
        const top = { blocks: cand.blocks, pos: a.states[mi], min: a.dist[mi] };
        if (!cur || top.min >= cur.min) { if (cur && top.min > cur.min) stale = 0; cur = top; }
        if (top.min >= 1 && (!best || top.min > best.min)) best = top;
      }
      if (best && now() - t0 > budget) return best;
    }
  }

  function startUnblock(L, api) {
    const [lo, hi] = ubBand(L);
    const P = ubGen(lo, hi), blocks = P.blocks, minMoves = P.min;
    let pos = P.pos.slice(), sel = null, moves = 0, last = -1, hints = 0, finished = false, history = [], tip = null;
    api.hint('Tap a block, then tap an arrow or a dot to slide it. Get the gold ★ block out through the green exit.');
    const wrap = el('div', 'sl-wrap');
    const frame = el('div', 'ub-frame'), board = el('div', 'ub-board');
    frame.append(board, el('div', 'ub-exit', '›'));
    const arrows = el('div', 'ub-arrows');
    const info = el('p', 'sl-info');
    const ctl = el('div', 'sl-ctl');
    const undoBtn = mkBtn('↶ Undo', 'c-card', undo), hintBtn = mkBtn('💡 Hint', 'c-sun', hint);
    ctl.append(undoBtn, hintBtn);
    wrap.append(frame, arrows, info, ctl); api.stage.append(wrap);
    const WOOD = [['#C98A4B', '#8A5527'], ['#D9A066', '#9C6534'], ['#B9773C', '#7C4A1E'], ['#E0AE73', '#A06B3A']];
    const els = blocks.map((b, i) => {
      const e = el('button', 'ub-b' + (b.h ? ' h' : ' v') + (i === 0 ? ' gold' : ''), `<span class="ub-face">${i === 0 ? '★' : b.h ? '⇆' : '⇅'}</span>`);
      e.type = 'button'; e.setAttribute('aria-label', i === 0 ? 'Gold block' : 'Wooden block');
      if (i) { const w = WOOD[i % WOOD.length]; e.style.setProperty('--w', w[0]); e.style.setProperty('--wd', w[1]); }
      e.style.width = (b.h ? b.len : 1) / 6 * 100 + '%'; e.style.height = (b.h ? 1 : b.len) / 6 * 100 + '%';
      e.onclick = () => select(i);
      board.append(e); return e;
    });
    function range(i) { // reachable positions for block i
      const b = blocks[i], g = ubOcc(blocks, pos), at = k => b.h ? g[b.fix * 6 + k] : g[k * 6 + b.fix], out = [];
      for (let p = pos[i] - 1; p >= 0 && at(p) === -1; p--) out.push({ cell: p, np: p });
      for (let p = pos[i] + b.len; p < 6 && at(p) === -1; p++) out.push({ cell: p, np: p - b.len + 1 });
      return out;
    }
    function render() {
      blocks.forEach((b, i) => {
        const r = b.h ? b.fix : pos[i], c = b.h ? pos[i] : b.fix;
        els[i].style.left = c / 6 * 100 + '%'; els[i].style.top = r / 6 * 100 + '%';
        els[i].classList.toggle('sel', sel === i);
      });
      board.querySelectorAll('.ub-dot').forEach(d => d.remove());
      arrows.innerHTML = '';
      if (sel !== null && !finished) {
        const b = blocks[sel], rg = range(sel);
        rg.forEach(o => {
          const d = el('button', 'ub-dot' + (tip && tip[0] === sel && tip[1] === o.np ? ' tip' : '')); d.type = 'button'; d.setAttribute('aria-label', 'Slide here');
          const r = b.h ? b.fix : o.cell, c = b.h ? o.cell : b.fix;
          Object.assign(d.style, { left: c / 6 * 100 + '%', top: r / 6 * 100 + '%', width: 100 / 6 + '%', height: 100 / 6 + '%' });
          d.onclick = () => moveTo(sel, o.np);
          board.append(d);
        });
        const back = rg.some(o => o.np < pos[sel]), fwd = rg.some(o => o.np > pos[sel]);
        const mk = (lab, ok, d, aria) => {
          const a = mkBtn(lab, 'c-card', () => moveTo(sel, pos[sel] + d)); a.disabled = !ok; a.setAttribute('aria-label', aria);
          if (tip && tip[0] === sel && Math.sign(tip[1] - pos[sel]) === d) a.classList.add('tip');
          arrows.append(a);
        };
        if (b.h) { mk('◀', back, -1, 'Slide left'); mk('▶', fwd, 1, 'Slide right'); }
        else { mk('▲', back, -1, 'Slide up'); mk('▼', fwd, 1, 'Slide down'); }
      }
      info.textContent = `Moves: ${moves}  ·  Best possible: ${minMoves}`;
      undoBtn.disabled = !history.length || finished;
    }
    function select(i) {
      if (finished) return;
      sfx.tap(); sel = sel === i ? null : i;
      if (sel !== null && !range(sel).length) { wob(els[i]); toast('That one is stuck for now'); }
      render();
    }
    function moveTo(i, np) {
      if (finished || np === pos[i]) return;
      if (!range(i).some(o => o.np === np)) { sfx.soft(); wob(els[i]); return; }
      history.push({ pos: pos.slice(), moves, last });
      if (last !== i) moves++;
      last = i; pos[i] = np; tip = null;
      tone(300 + np * 50, .09, 'triangle', .1);
      render();
      if (pos[0] === 4) win();
    }
    function win() {
      finished = true; sel = null; render();
      api.hint('The gold block is free! ' + cheer());
      api.later(() => { els[0].classList.add('out'); tone(523, .15, 'triangle', .12); tone(784, .25, 'triangle', .12, .12); }, 200);
      const extra = moves - minMoves + hints * 2;
      api.done(starsFor(extra, Math.max(2, Math.ceil(minMoves * .4)), Math.max(6, Math.ceil(minMoves * 1.5))));
    }
    function undo() {
      if (!history.length || finished) return;
      const h = history.pop(); pos = h.pos; moves = h.moves; last = h.last; tip = null; sfx.tap(); render();
    }
    function hint() {
      if (finished) return;
      const path = ubSolve(blocks, pos);
      if (!path || !path.length) return;
      hints++; tip = path[0]; sel = tip[0]; sfx.tap(); render(); wob(els[sel]);
      api.hint('Try sliding the block with the white outline. The green dot shows where.');
    }
    api.stage.__lab = { blocks, get pos() { return pos.slice(); }, minMoves, moveTo: (i, p) => moveTo(i, p) };
    render();
  }

  /* =========================================================
     3. CAR PARK
     ========================================================= */
  register({ id: 'carpark', cat: 'slide', order: 3, name: 'Car Park', icon: '🚗', desc: 'Drive every car out of the car park', start: startCarPark });

  const CP_DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // up right down left
  // Built backwards: each new car must have a clear lane to the edge past the cars already placed,
  // so removing cars in reverse order always works (and removing a car never blocks another).
  function cpGen(C, Rr, n) {
    let best = [];
    for (let a = 0; a < 40 && best.length < n; a++) {
      const cars = [], occ = new Array(C * Rr).fill(-1);
      for (let t = 0; t < 3000 && cars.length < n; t++) {
        const d = randInt(4), [dx, dy] = CP_DIRS[d], hx = randInt(C), hy = randInt(Rr), tx = hx - dx, ty = hy - dy;
        if (tx < 0 || ty < 0 || tx >= C || ty >= Rr) continue;
        if (occ[hy * C + hx] >= 0 || occ[ty * C + tx] >= 0) continue;
        let x = hx + dx, y = hy + dy, clear = true;
        while (x >= 0 && y >= 0 && x < C && y < Rr) { if (occ[y * C + x] >= 0) { clear = false; break; } x += dx; y += dy; }
        if (!clear) continue;
        occ[hy * C + hx] = occ[ty * C + tx] = cars.length;
        cars.push({ d, hx, hy, tx, ty });
      }
      if (cars.length > best.length) best = cars;
    }
    return best;
  }
  function cpPlan(L) {
    const C = L <= 2 ? 4 : 5, Rr = L <= 1 ? 4 : L <= 2 ? 5 : L <= 3 ? 5 : L <= 5 ? 6 : 7;
    const n = Math.min(Math.round(ramp(L, 3, 15, 5)) + randInt(2), Math.floor(C * Rr * .44));
    return [C, Rr, n];
  }

  function startCarPark(L, api) {
    const [C, Rr, n] = cpPlan(L);
    const cars = cpGen(C, Rr, n), occ = new Array(C * Rr).fill(-1);
    cars.forEach((c, i) => { occ[c.hy * C + c.hx] = occ[c.ty * C + c.tx] = i; });
    let left = cars.length, bumps = 0, finished = false;
    api.hint('Tap a car to drive it out the way its arrow points. Empty the car park!');
    api.rounds(cars.length, 0);
    const wrap = el('div', 'sl-wrap');
    const lot = el('div', 'cp-lot'); lot.style.setProperty('--cols', C); lot.style.setProperty('--rows', Rr);
    const info = el('p', 'sl-info');
    wrap.append(lot, info); api.stage.append(wrap);
    const colours = ['coral', 'sky', 'sun', 'leaf', 'berry', 'orange', 'grape', 'peach'];
    const els = cars.map((c, i) => {
      const h = c.d % 2 === 1, x = Math.min(c.hx, c.tx), y = Math.min(c.hy, c.ty);
      const e = el('button', 'cp-car c-' + colours[i % colours.length] + (h ? ' h' : ''));
      e.type = 'button'; e.setAttribute('aria-label', 'Car facing ' + ['up', 'right', 'down', 'left'][c.d]);
      Object.assign(e.style, { left: x / C * 100 + '%', top: y / Rr * 100 + '%', width: (h ? 2 : 1) / C * 100 + '%', height: (h ? 1 : 2) / Rr * 100 + '%' });
      const rot = el('span', 'cp-rot', '<span class="cp-wh l"></span><span class="cp-wh r"></span><span class="cp-body"><span class="cp-lt l"></span><span class="cp-lt r"></span><span class="cp-ws"></span><span class="cp-rw"></span><span class="cp-arw">▲</span></span>');
      rot.style.transform = `rotate(${c.d * 90}deg)`;
      e.append(rot); e.onclick = () => tap(i);
      lot.append(e); return e;
    });
    const setInfo = () => { info.textContent = left ? `${left} car${left === 1 ? '' : 's'} left` : 'All gone!'; };
    setInfo();
    function shift(i, cells, extra = 0) { // translate along the car's direction, in units of its own length (2 cells)
      const [dx, dy] = CP_DIRS[cars[i].d], f = (cells * 50 + extra) + '%';
      els[i].style.transform = `translate(${dx ? (dx > 0 ? f : '-' + f) : '0'}, ${dy ? (dy > 0 ? f : '-' + f) : '0'})`;
    }
    function tap(i) {
      if (finished || !els[i] || els[i].classList.contains('gone') || els[i].dataset.busy) return;
      const c = cars[i], [dx, dy] = CP_DIRS[c.d];
      let x = c.hx + dx, y = c.hy + dy, free = 0, blocker = -1;
      while (x >= 0 && y >= 0 && x < C && y < Rr) { const o = occ[y * C + x]; if (o >= 0) { blocker = o; break; } free++; x += dx; y += dy; }
      if (blocker < 0) {
        occ[c.hy * C + c.hx] = occ[c.ty * C + c.tx] = -1;
        shift(i, free + 2.6); els[i].classList.add('gone');
        tone(180, .3, 'sawtooth', .04); tone(260, .3, 'triangle', .1, .08); tone(390, .2, 'triangle', .08, .2);
        left--; api.rounds(cars.length, cars.length - left); setInfo();
        if (!left) {
          finished = true; api.hint('The car park is empty! ' + cheer());
          api.later(() => sfx.good(), 400);
          api.done(starsFor(bumps, Math.floor(cars.length / 6), 2 + Math.floor(cars.length / 4)));
        } else if (Math.random() < .2) toast(cheer());
      } else {
        bumps++; els[i].dataset.busy = 1; els[i].classList.add('bump');
        shift(i, free, 12); sfx.soft(); tone(620, .08, 'square', .03, .05); tone(620, .08, 'square', .03, .2);
        api.later(() => { wob(els[blocker]); }, 120);
        api.later(() => { els[i].style.transform = ''; }, 170);
        api.later(() => { els[i].classList.remove('bump'); delete els[i].dataset.busy; }, 330);
        toast('Something’s in the way');
      }
    }
    api.stage.__lab = { cars, tap, get left() { return left; } };
  }

  /* =========================================================
     4. BLOCK FIT
     ========================================================= */
  register({ id: 'blockfit', cat: 'slide', order: 4, name: 'Block Fit', icon: '🟦', desc: 'Fit block shapes in to clear full lines', start: startBlockFit });

  const BF_SHAPES = { // [pattern, first level it appears, weight]
    one: ['x', 1, 2], two: ['xx', 1, 4], three: ['xxx', 1, 4], corner: ['xx/x.', 1, 3],
    sq: ['xx/xx', 2, 3], four: ['xxxx', 2, 3], ell: ['xxx/x..', 3, 3], tee: ['xxx/.x.', 3, 2],
    ess: ['xx./.xx', 4, 2], bigl: ['xxx/x../x..', 5, 1], five: ['xxxxx', 5, 1], plus: ['.x./xxx/.x.', 6, 1]
  };
  const bfParse = p => p.split('/').flatMap((row, r) => [...row].map((ch, c) => ch === 'x' ? [r, c] : null).filter(Boolean));
  const bfNorm = cells => { const mr = Math.min(...cells.map(x => x[0])), mc = Math.min(...cells.map(x => x[1])); return cells.map(([r, c]) => [r - mr, c - mc]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); };
  const bfRot = cells => bfNorm(cells.map(([r, c]) => [c, -r]));
  function bfPiece(L, smallOnly) {
    const pool = Object.values(BF_SHAPES).filter(s => s[1] <= L && (!smallOnly || bfParse(s[0]).length <= 3));
    const tot = pool.reduce((a, s) => a + s[2], 0); let r = Math.random() * tot, s = pool[0];
    for (const p of pool) { r -= p[2]; if (r < 0) { s = p; break; } }
    let cells = bfNorm(bfParse(s[0])); for (let k = randInt(4); k > 0; k--) cells = bfRot(cells);
    const col = pick(COLS7);
    return { cells, c: col.c, s: col.s };
  }
  function bfPlan(L) {
    const n = L <= 2 ? 6 : L === 3 ? 7 : L === 4 ? 8 : 9;
    return { n, boxes: n === 9, goal: L <= 1 ? 3 : Math.round(ramp(L, 3, 12, 6)) + (L > 4 ? randInt(2) : 0) };
  }

  function startBlockFit(L, api) {
    const { n, boxes, goal } = bfPlan(L);
    const grid = new Array(n * n).fill(null);
    let tray = [null, null, null], sel = null, preview = null, cleared = 0, mistakes = 0, rescues = 0, finished = false, busy = false;
    api.hint(`Tap a shape below, then tap the board to place it. Fill a whole ${boxes ? 'row, column or 3×3 box' : 'row or column'} to clear it.`);
    api.rounds(goal, 0);
    const wrap = el('div', 'sl-wrap');
    const board = el('div', 'bf-grid'); board.style.setProperty('--n', n);
    const info = el('p', 'sl-info');
    const trayEl = el('div', 'bf-tray');
    const placeBtn = mkBtn('✓ Place it here', 'c-leaf', () => { if (preview && preview.ok) place(); });
    const ctl = el('div', 'sl-ctl'); ctl.append(placeBtn);
    wrap.append(board, ctl, trayEl, info); api.stage.append(wrap);
    const cellEls = [];
    for (let i = 0; i < n * n; i++) {
      const b = el('button', 'bf-c'); b.type = 'button';
      b.onclick = () => tapCell(Math.floor(i / n), i % n);
      cellEls.push(b); board.append(b);
    }
    const inBox = i => boxes && ((Math.floor(Math.floor(i / n) / 3) + Math.floor((i % n) / 3)) % 2 === 1);
    const fits = (cells, r0, c0) => cells.every(([r, c]) => r + r0 >= 0 && c + c0 >= 0 && r + r0 < n && c + c0 < n && !grid[(r + r0) * n + c + c0]);
    const anyFit = p => { for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (fits(p.cells, r, c)) return true; return false; };
    function render() {
      cellEls.forEach((b, i) => {
        const g = grid[i];
        b.className = 'bf-c' + (g ? ' tile c-' + g.c : inBox(i) ? ' alt' : '');
        b.textContent = g ? g.s : '';
        b.style.removeProperty('--c');
      });
      if (preview) preview.keys.forEach(i => {
        const b = cellEls[i];
        if (preview.ok) { b.className = 'bf-c pv'; b.style.setProperty('--c', `var(--${tray[sel].c})`); }
        else if (!grid[i]) b.className = 'bf-c bad';
      });
      trayEl.innerHTML = '';
      tray.forEach((p, k) => {
        const s = el('button', 'bf-slot' + (sel === k ? ' sel' : '') + (p && p.fresh ? ' new' : '')); s.type = 'button';
        if (p) {
          p.fresh = false;
          const h = Math.max(...p.cells.map(x => x[0])) + 1, w = Math.max(...p.cells.map(x => x[1])) + 1;
          const m = el('span', 'bf-mini c-' + p.c); m.style.gridTemplateColumns = `repeat(${w}, auto)`;
          for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) m.append(el('i', p.cells.some(x => x[0] === r && x[1] === c) ? 'on' : ''));
          s.append(m); s.setAttribute('aria-label', `Shape of ${p.cells.length} block${p.cells.length > 1 ? 's' : ''}`);
          s.onclick = () => pickSlot(k);
        } else { s.disabled = true; s.setAttribute('aria-label', 'Empty'); }
        trayEl.append(s);
      });
      placeBtn.disabled = !(preview && preview.ok);
      info.textContent = `Lines cleared: ${cleared} of ${goal}`;
    }
    function pickSlot(k) {
      if (finished || busy || !tray[k]) return;
      sfx.tap(); sel = sel === k ? null : k; preview = null;
      if (sel !== null) api.hint('Now tap the board where it should go. Tap the shadow again, or the green button, to drop it in.');
      render();
    }
    function tapCell(r, c) {
      if (finished || busy) return;
      if (sel === null) { toast('First pick a shape below'); return; }
      const idx = r * n + c;
      if (preview && preview.keys.includes(idx)) {
        if (preview.ok) { place(); return; }
        mistakes++; sfx.soft(); toast('It won’t fit there'); return;
      }
      const cells = tray[sel].cells;
      const cr = Math.round((Math.max(...cells.map(x => x[0]))) / 2), cc = Math.round((Math.max(...cells.map(x => x[1]))) / 2);
      // try placements that cover the tapped cell, closest to centred
      let best = null;
      cells.forEach(([pr, pc]) => {
        const r0 = r - pr, c0 = c - pc;
        if (!fits(cells, r0, c0)) return;
        const d = Math.abs(r0 - (r - cr)) + Math.abs(c0 - (c - cc));
        if (!best || d < best.d) best = { r0, c0, d };
      });
      if (best) preview = { ok: true, r0: best.r0, c0: best.c0 };
      else preview = { ok: false, r0: clamp(r - cr, 0, n - 1 - Math.max(...cells.map(x => x[0]))), c0: clamp(c - cc, 0, n - 1 - Math.max(...cells.map(x => x[1]))) };
      preview.keys = cells.map(([pr, pc]) => (pr + preview.r0) * n + pc + preview.c0);
      if (preview.ok) tone(500, .06, 'triangle', .06); else { sfx.soft(); toast('That spot is taken'); }
      render();
    }
    function place() {
      const p = tray[sel];
      preview.keys.forEach(i => { grid[i] = { c: p.c, s: p.s }; });
      const landed = preview.keys; tray[sel] = null; sel = null; preview = null;
      tone(392, .1, 'triangle', .1);
      render(); landed.forEach(i => cellEls[i].classList.add('land'));
      // find full lines
      const units = [];
      for (let r = 0; r < n; r++) units.push([...Array(n)].map((_, c) => r * n + c));
      for (let c = 0; c < n; c++) units.push([...Array(n)].map((_, r) => r * n + c));
      if (boxes) for (let br = 0; br < 3; br++) for (let bc = 0; bc < 3; bc++) units.push([...Array(9)].map((_, k) => (br * 3 + Math.floor(k / 3)) * n + bc * 3 + k % 3));
      const full = units.filter(u => u.every(i => grid[i]));
      if (full.length) {
        busy = true;
        const set = new Set(full.flat());
        set.forEach(i => cellEls[i].classList.add('pop'));
        full.forEach((_, k) => tone(523 * Math.pow(1.19, k), .2, 'triangle', .13, k * .12));
        cleared += full.length; api.rounds(goal, Math.min(cleared, goal));
        toast(full.length >= 3 ? 'Super combo!' : full.length === 2 ? 'Double clear!' : cheer());
        api.later(() => {
          set.forEach(i => { grid[i] = null; });
          busy = false;
          if (cleared >= goal) { finished = true; render(); api.hint('Goal reached! ' + cheer()); sfx.good(); api.done(starsFor(mistakes + rescues, 1, 3)); }
          else afterTurn();
        }, 430);
      } else afterTurn();
    }
    function afterTurn() {
      if (tray.every(p => !p)) tray = [0, 1, 2].map(() => Object.assign(bfPiece(L), { fresh: true }));
      const live = tray.filter(Boolean);
      if (!live.some(anyFit)) {
        rescues++;
        tray = tray.map(p => {
          if (!p || anyFit(p)) return p;
          for (let t = 0; t < 30; t++) { const q = bfPiece(1, true); if (anyFit(q)) return Object.assign(q, { fresh: true }); }
          return Object.assign({ cells: [[0, 0]], c: 'sun', s: '▲' }, { fresh: true });
        });
        toast('Here are some smaller shapes');
      }
      api.hint(`Tap a shape below, then tap the board to place it. Fill a whole ${boxes ? 'row, column or 3×3 box' : 'row or column'} to clear it.`);
      render();
    }
    api.stage.__lab = { n, get grid() { return grid.map(Boolean); }, get tray() { return tray; }, pickSlot, tapCell, get cleared() { return cleared; }, goal };
    afterTurn();
  }

  /* =========================================================
     5. SHAPE PUZZLE (tangram-style, on a quarter-square triangle grid)
     ========================================================= */
  register({ id: 'tangram', cat: 'slide', order: 5, name: 'Shape Puzzle', icon: '🔷', desc: 'Fit the shapes together to fill the picture', start: startTangram });

  // A quarter is [x, y, q]: square (x,y) split by its diagonals into q = 0 top, 1 right, 2 bottom, 3 left.
  const TG_BASE = {
    st: [[0, 0, 0], [0, 0, 1]],
    sq: [[0, 0, 0], [0, 0, 1], [0, 0, 2], [0, 0, 3]],
    mt: [[0, 0, 0], [0, 0, 1], [1, 0, 3], [1, 0, 0]],
    pg: [[0, 0, 0], [0, 0, 1], [1, 0, 3], [1, 0, 2]],
    lt: [[0, 0, 0], [0, 0, 1], [1, 0, 0], [1, 0, 1], [1, 0, 2], [1, 0, 3], [1, 1, 0], [1, 1, 1]]
  };
  const tgKey = (x, y, q) => (y * 64 + x) * 4 + q;
  const tgNorm = qs => { const mx = Math.min(...qs.map(a => a[0])), my = Math.min(...qs.map(a => a[1])); return qs.map(([x, y, q]) => [x - mx, y - my, q]).sort((a, b) => tgKey(...a) - tgKey(...b)); };
  const tgRot = qs => qs.map(([x, y, q]) => [-y - 1, x, (q + 1) % 4]);
  const tgFlip = qs => qs.map(([x, y, q]) => [-x - 1, y, q === 1 ? 3 : q === 3 ? 1 : q]);
  const tgOrient = (type, o) => { let qs = TG_BASE[type]; if (o >= 4) qs = tgFlip(qs); for (let k = 0; k < o % 4; k++) qs = tgRot(qs); return tgNorm(qs); };
  const TG_OR = {}; // type -> [{o, qs}] unique orientations
  Object.keys(TG_BASE).forEach(t => {
    const seen = new Set(); TG_OR[t] = [];
    for (let o = 0; o < 8; o++) { const qs = tgOrient(t, o), k = JSON.stringify(qs); if (!seen.has(k)) { seen.add(k); TG_OR[t].push({ o, qs }); } }
  });
  const TG_CENT = [[.5, 1 / 6], [5 / 6, .5], [.5, 5 / 6], [1 / 6, .5]];
  function tgTri(x, y, q) {
    const P = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]], C = [x + .5, y + .5];
    return [P[q], P[(q + 1) % 4], C];
  }
  function tgInPoly(px, py, poly) {
    let ins = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) ins = !ins;
    }
    return ins;
  }
  function tgFromPoly(poly) {
    const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]), out = [];
    for (let y = Math.floor(Math.min(...ys)); y < Math.max(...ys); y++) for (let x = Math.floor(Math.min(...xs)); x < Math.max(...xs); x++)
      for (let q = 0; q < 4; q++) if (tgInPoly(x + TG_CENT[q][0], y + TG_CENT[q][1], poly)) out.push([x, y, q]);
    return out;
  }
  // Hand-made silhouettes, each built from real pieces (so each is solvable as designed).
  const TG_DESIGNS = [
    { name: 'A little house', emoji: '🏠', pieces: [['sq', [[0, 1], [1, 1], [1, 2], [0, 2]]], ['sq', [[1, 1], [2, 1], [2, 2], [1, 2]]], ['mt', [[0, 1], [1, 0], [2, 1]]]] },
    { name: 'A fish', emoji: '🐟', pieces: [['mt', [[1, 1], [2, 0], [3, 1]]], ['mt', [[1, 1], [3, 1], [2, 2]]], ['mt', [[0, 0], [1, 1], [0, 2]]]] },
    { name: 'A bird', emoji: '🐦', pieces: [['sq', [[1, 1], [2, 1], [2, 2], [1, 2]]], ['st', [[2, 1], [3, 1], [2, 2]]], ['lt', [[1, -1], [1, 1], [3, 1]]], ['st', [[0, 1], [1, 1], [1, 2]]]] },
    { name: 'A sailing boat', emoji: '⛵', pieces: [['st', [[0, 2], [1, 2], [1, 3]]], ['sq', [[1, 2], [2, 2], [2, 3], [1, 3]]], ['st', [[2, 2], [3, 2], [2, 3]]], ['lt', [[1, 0], [1, 2], [3, 2]]]] },
    { name: 'A barn', emoji: '🏡', pieces: [['lt', [[0, 2], [2, 0], [2, 2]]], ['lt', [[2, 0], [4, 2], [2, 2]]], ['sq', [[1, 2], [2, 2], [2, 3], [1, 3]]], ['sq', [[2, 2], [3, 2], [3, 3], [2, 3]]]] },
    { name: 'A whale', emoji: '🐋', pieces: [['lt', [[1, 0], [3, 0], [3, 2]]], ['lt', [[1, 0], [1, 2], [3, 2]]], ['mt', [[3, 0], [4, 1], [3, 2]]], ['st', [[0, 0], [1, 0], [1, 1]]], ['st', [[0, 2], [1, 1], [1, 2]]]] },
    { name: 'A ship', emoji: '🚢', pieces: [['st', [[0, 2], [1, 2], [1, 3]]], ['sq', [[1, 2], [2, 2], [2, 3], [1, 3]]], ['sq', [[2, 2], [3, 2], [3, 3], [2, 3]]], ['st', [[3, 2], [4, 2], [3, 3]]], ['mt', [[1, 2], [2, 1], [3, 2]]]] },
    { name: 'A tall house', emoji: '🏘️', pieces: [['sq', [[0, 2], [1, 2], [1, 3], [0, 3]]], ['sq', [[1, 2], [2, 2], [2, 3], [1, 3]]], ['sq', [[0, 3], [1, 3], [1, 4], [0, 4]]], ['sq', [[1, 3], [2, 3], [2, 4], [1, 4]]], ['mt', [[0, 2], [1, 1], [2, 2]]]] },
    { name: 'A duck', emoji: '🦆', pieces: [['st', [[0, 2], [1, 2], [1, 3]]], ['sq', [[1, 2], [2, 2], [2, 3], [1, 3]]], ['sq', [[2, 2], [3, 2], [3, 3], [2, 3]]], ['sq', [[2, 1], [3, 1], [3, 2], [2, 2]]], ['st', [[3, 1], [4, 1], [3, 2]]], ['st', [[0, 1], [0, 2], [1, 2]]]] },
    { name: 'A cat', emoji: '🐱', pieces: [['sq', [[0, 0], [1, 0], [1, 1], [0, 1]]], ['sq', [[1, 0], [2, 0], [2, 1], [1, 1]]], ['st', [[0, -1], [0, 0], [1, 0]]], ['st', [[2, -1], [2, 0], [1, 0]]], ['lt', [[0, 1], [2, 1], [0, 3]]], ['pg', [[1, 2], [2, 2], [1, 3], [0, 3]]]] },
    { name: 'A turtle', emoji: '🐢', pieces: [['lt', [[0, 2], [2, 0], [2, 2]]], ['lt', [[2, 0], [4, 2], [2, 2]]], ['st', [[3, 1], [4, 1], [4, 2]]], ['sq', [[4, 1], [5, 1], [5, 2], [4, 2]]], ['st', [[0, 2], [1, 2], [1, 3]]], ['st', [[3, 2], [4, 2], [3, 3]]]] }
  ];
  function tgShift(pieces) { // pieces: [{type, qs}] absolute; normalise so min x,y = 0
    const all = pieces.flatMap(p => p.qs), mx = Math.min(...all.map(a => a[0])), my = Math.min(...all.map(a => a[1]));
    return pieces.map(p => ({ type: p.type, qs: p.qs.map(([x, y, q]) => [x - mx, y - my, q]) }));
  }
  function tgFromDesign(d) {
    return { name: d.name, emoji: d.emoji, sol: tgShift(d.pieces.map(([type, poly]) => ({ type, qs: tgFromPoly(poly) }))) };
  }
  const TG_W = { lt: 3, mt: 2, sq: 2, st: 3, pg: 1 };
  function tgEdges(qs) { // edge-key -> count over a set of quarters
    const m = new Map();
    qs.forEach(([x, y, q]) => { const t = tgTri(x, y, q); for (let i = 0; i < 3; i++) { const a = t[i], b = t[(i + 1) % 3]; const k = [a, b].map(p => p[0] * 2 + ',' + p[1] * 2).sort().join('|'); m.set(k, (m.get(k) || 0) + 1); } });
    return m;
  }
  // Random silhouette: grow a cluster of pieces, each new piece sharing edges with the cluster.
  function tgGenerate(n) {
    const bag = Object.entries(TG_W).flatMap(([t, w]) => Array(w).fill(t));
    const pieces = [], occ = new Set();
    const add = (type, qs) => { pieces.push({ type, qs }); qs.forEach(a => occ.add(tgKey(...a))); };
    const t0 = pick(bag); add(t0, pick(TG_OR[t0]).qs.map(([x, y, q]) => [x + 20, y + 20, q]));
    while (pieces.length < n) {
      const all = pieces.flatMap(p => p.qs), uni = tgEdges(all);
      const bx = [Math.min(...all.map(a => a[0])), Math.max(...all.map(a => a[0])), Math.min(...all.map(a => a[1])), Math.max(...all.map(a => a[1]))];
      let best = null;
      for (let t = 0; t < 80; t++) {
        const type = pick(bag), qs0 = pick(TG_OR[type]).qs, anchor = pick(all);
        const ox = anchor[0] + randInt(5) - 2, oy = anchor[1] + randInt(5) - 2;
        const qs = qs0.map(([x, y, q]) => [x + ox, y + oy, q]);
        if (qs.some(a => occ.has(tgKey(...a)))) continue;
        let shared = 0; tgEdges(qs).forEach((c, k) => { if (c === 1 && uni.get(k) === 1) shared++; });
        if (!shared) continue;
        const w = Math.max(bx[1], ...qs.map(a => a[0])) - Math.min(bx[0], ...qs.map(a => a[0])) + 1;
        const h = Math.max(bx[3], ...qs.map(a => a[1])) - Math.min(bx[2], ...qs.map(a => a[1])) + 1;
        const score = shared * 1.5 - Math.max(w, h) * 1.2 - Math.abs(w - h) * .4 + Math.random();
        if (!best || score > best.score) best = { type, qs, score };
      }
      if (best) add(best.type, best.qs);
    }
    return { name: 'A mystery shape', emoji: '✨', sol: tgShift(pieces) };
  }
  // Exact-cover check: can these piece types fill exactly this region?
  function tgSolvable(region, types, limit = { n: 0 }) {
    if (!region.size) return types.length === 0;
    if (++limit.n > 60000) return true; // give up searching; assume fine (never reached for these sizes)
    let first = Infinity; region.forEach(k => { if (k < first) first = k; });
    const fq = first & 3, fs = first >> 2, fx = fs % 64, fy = Math.floor(fs / 64);
    const tried = new Set();
    for (let i = 0; i < types.length; i++) {
      const t = types[i]; if (tried.has(t)) continue; tried.add(t);
      for (const { qs } of TG_OR[t]) {
        if (qs[0][2] !== fq) continue;
        const ox = fx - qs[0][0], oy = fy - qs[0][1];
        const keys = qs.map(([x, y, q]) => (x + ox < 0 || y + oy < 0) ? -1 : tgKey(x + ox, y + oy, q));
        if (!keys.every(k => region.has(k))) continue;
        keys.forEach(k => region.delete(k));
        const rest = types.slice(); rest.splice(i, 1);
        const ok = tgSolvable(region, rest, limit);
        keys.forEach(k => region.add(k));
        if (ok) return true;
      }
    }
    return false;
  }
  function tgPuzzle(L) {
    if (L <= TG_DESIGNS.length) return tgFromDesign(TG_DESIGNS[L - 1]);
    const n = clamp(Math.round(ramp(L - TG_DESIGNS.length, 4, 7, 6)) + randInt(2), 4, 7);
    return tgGenerate(n);
  }
  const TG_COL = ['coral', 'sky', 'sun', 'leaf', 'berry', 'orange', 'grape'];
  const tgPts = t => t.map(p => p.join(',')).join(' ');
  function tgSvgPiece(qs, col, sym, extraCls = '') {
    const ed = tgEdges(qs); let path = '';
    ed.forEach((c, k) => { if (c === 1) { const [a, b] = k.split('|').map(s => s.split(',').map(v => v / 2)); path += `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`; } });
    const cx = qs.reduce((a, [x, , q]) => a + x + TG_CENT[q][0], 0) / qs.length, cy = qs.reduce((a, [, y, q]) => a + y + TG_CENT[q][1], 0) / qs.length;
    return `<g class="tg-pc ${extraCls}" style="fill:var(--${col}); stroke:var(--${col})">${qs.map(a => `<polygon points="${tgPts(tgTri(...a))}" stroke-width=".03" stroke-linejoin="round"/>`).join('')}` +
      `<path d="${path}" fill="none" style="stroke:var(--${col}-d)" stroke-width=".07" stroke-linecap="round"/>` +
      `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="${qs.length <= 2 ? .3 : .42}" style="fill:rgba(24,36,44,.6); stroke:none; font-family:var(--display)">${sym}</text></g>`;
  }

  function startTangram(L, api) {
    const P = tgPuzzle(L), sol = P.sol;
    const all = sol.flatMap(p => p.qs), W = Math.max(...all.map(a => a[0])) + 1, H = Math.max(...all.map(a => a[1])) + 1;
    const silKeys = new Set(all.map(a => tgKey(...a)));
    const pieces = shuffle(sol.map((p, i) => {
      const ors = TG_OR[p.type], match = ors.findIndex(o => JSON.stringify(o.qs) === JSON.stringify(tgNorm(p.qs)));
      return { type: p.type, oi: L <= 2 ? Math.max(0, match) : randInt(ors.length), placed: null, col: TG_COL[i % TG_COL.length], sym: COLS7[i % COLS7.length].s };
    }));
    let sel = null, wrong = 0, hintOn = false, finished = false;
    api.hint('Tap a shape, turn it with the big button if needed, then tap where it goes in the picture.');
    api.rounds(pieces.length, 0);
    const wrap = el('div', 'sl-wrap');
    const title = el('div', 'tg-name', `<span>${P.emoji}</span>${P.name}`);
    const pad = .45, vw = W + pad * 2, vh = H + pad * 2;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `${-pad} ${-pad} ${vw} ${vh}`); svg.setAttribute('class', 'tg-svg');
    svg.style.setProperty('--w', Math.min(460, vw * 95) + 'px');
    svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'The picture to fill');
    const ctl = el('div', 'sl-ctl');
    const turnBtn = mkBtn('⟳ Turn', 'c-sky', () => turn(false)), flipBtn = mkBtn('⇋ Flip', 'c-grape', () => turn(true));
    turnBtn.style.minWidth = '130px'; turnBtn.style.fontSize = '1.4rem';
    ctl.append(turnBtn, flipBtn);
    const tray = el('div', 'tg-tray');
    wrap.append(title, svg, tray, ctl); api.stage.append(wrap);
    const placedKeys = () => new Set(pieces.filter(p => p.placed).flatMap(p => p.placed.map(a => tgKey(...a))));
    function render() {
      const outline = tgEdges(all); let opath = '';
      outline.forEach((c, k) => { if (c === 1) { const [a, b] = k.split('|').map(s => s.split(',').map(v => v / 2)); opath += `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`; } });
      let hint = '';
      if (hintOn) sol.forEach(p => { const e = tgEdges(p.qs); e.forEach((c, k) => { if (c === 1) { const [a, b] = k.split('|').map(s => s.split(',').map(v => v / 2)); hint += `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`; } }); });
      svg.innerHTML = `<g style="fill:#0A4450; stroke:#0A4450">${all.map(a => `<polygon points="${tgPts(tgTri(...a))}" stroke-width=".03"/>`).join('')}</g>` +
        `<path d="${opath}" fill="none" stroke="rgba(255,255,255,.75)" stroke-width=".06" stroke-dasharray=".14 .1" stroke-linecap="round"/>` +
        (hintOn ? `<path d="${hint}" fill="none" stroke="rgba(255,255,255,.45)" stroke-width=".04" stroke-dasharray=".08 .08"/>` : '') +
        pieces.map(p => p.placed ? tgSvgPiece(p.placed, p.col, p.sym, p.fresh ? 'tg-land' : '') : '').join('');
      pieces.forEach(p => { p.fresh = false; });
      tray.innerHTML = '';
      pieces.forEach((p, i) => {
        const b = el('button', 'tg-p' + (sel === i ? ' sel' : '') + (p.placed ? ' used' : '')); b.type = 'button';
        b.setAttribute('aria-label', 'Shape ' + (i + 1));
        const qs = TG_OR[p.type][p.oi].qs, w = Math.max(...qs.map(a => a[0])) + 1, h = Math.max(...qs.map(a => a[1])) + 1, s = Math.max(w, h, 2);
        b.innerHTML = `<svg viewBox="${(w - s) / 2 - .1} ${(h - s) / 2 - .1} ${s + .2} ${s + .2}">${tgSvgPiece(qs, p.col, p.sym)}</svg>`;
        b.onclick = () => { if (finished) return; sfx.tap(); sel = sel === i ? null : i; render(); };
        tray.append(b);
      });
      turnBtn.disabled = flipBtn.disabled = sel === null || finished;
    }
    function turn(flip) {
      if (sel === null || finished) return;
      const p = pieces[sel], ors = TG_OR[p.type], cur = ors[p.oi].o;
      const target = flip ? (cur >= 4 ? cur - 4 : cur + 4) : (cur >= 4 ? 4 + (cur + 1) % 4 : (cur + 1) % 4);
      const want = JSON.stringify(tgOrient(p.type, target));
      p.oi = Math.max(0, ors.findIndex(o => JSON.stringify(o.qs) === want));
      tone(flip ? 470 : 520, .08, 'triangle', .08); render();
    }
    function bad(msg) {
      wrong++; sfx.soft(); toast(msg);
      if (wrong >= 2 && !hintOn) { hintOn = true; api.hint('Look for the faint lines in the picture. They show where each shape goes.'); }
      render();
    }
    function tryPlace(gx, gy) {
      const sx = Math.floor(gx), sy = Math.floor(gy), u = gx - sx, v = gy - sy;
      const d = [v, 1 - u, 1 - v, u], tq = d.indexOf(Math.min(...d)), tk = tgKey(sx, sy, tq);
      const owner = pieces.findIndex(p => p.placed && p.placed.some(a => tgKey(...a) === tk));
      if (owner >= 0) { // lift a placed piece back to the tray
        pieces[owner].placed = null; sel = owner; sfx.tap(); api.rounds(pieces.length, pieces.filter(p => p.placed).length); render(); return;
      }
      if (sel === null) { if (silKeys.has(tk)) toast('First tap a shape below'); return; }
      if (!silKeys.has(tk)) { toast('Tap inside the picture'); return; }
      const p = pieces[sel], taken = placedKeys();
      const free = new Set([...silKeys].filter(k => !taken.has(k)));
      const rest = pieces.filter((x, i) => i !== sel && !x.placed).map(x => x.type);
      const options = oi => {
        const qs = TG_OR[p.type][oi].qs, out = [];
        qs.forEach(([x, y, q]) => {
          if (q !== tq) return;
          const ox = sx - x, oy = sy - y, pl = qs.map(([a, b, c]) => [a + ox, b + oy, c]);
          if (pl.some(a => a[0] < 0 || a[1] < 0 || !free.has(tgKey(...a)))) return;
          const cx = pl.reduce((s, [a, , c]) => s + a + TG_CENT[c][0], 0) / pl.length, cy = pl.reduce((s, [, b, c]) => s + b + TG_CENT[c][1], 0) / pl.length;
          out.push({ pl, d: Math.hypot(cx - gx, cy - gy) });
        });
        return out.sort((a, b) => a.d - b.d);
      };
      const good = o => { const reg = new Set(free); o.pl.forEach(a => reg.delete(tgKey(...a))); return tgSolvable(reg, rest); };
      const mine = options(p.oi), ok = mine.find(good);
      if (ok) {
        p.placed = ok.pl; p.fresh = true; sel = null;
        const n = pieces.filter(x => x.placed).length; api.rounds(pieces.length, n);
        tone(440 + n * 70, .14, 'triangle', .12);
        if (n === pieces.length) {
          finished = true; render(); api.hint(`You made ${P.name.toLowerCase()}! ${cheer()}`);
          api.later(() => sfx.good(), 250);
          api.done(starsFor(wrong, 1, 3));
          return;
        }
        api.hint('Good. Pick the next shape.'); render(); return;
      }
      const other = TG_OR[p.type].some((_, oi) => oi !== p.oi && options(oi).some(good));
      bad(other ? 'Nearly! Try turning it first' : 'Not quite there. Try another spot');
    }
    svg.addEventListener('click', e => {
      if (finished) return;
      const r = svg.getBoundingClientRect();
      tryPlace(-pad + (e.clientX - r.left) / r.width * vw, -pad + (e.clientY - r.top) / r.height * vh);
    });
    api.stage.__lab = { sol, pieces, tryPlace, get sel() { return sel; }, set sel(v) { sel = v; }, render };
    render();
  }

  /* =========================================================
     6. COLOUR POUR (Sorting)
     ========================================================= */
  register({ id: 'pour', cat: 'sorting', order: 2, name: 'Colour Pour', icon: '🧪', desc: 'Pour the colours so each bottle holds one', start: startPour });

  const PO_CAP = 4;
  const poTopRun = b => { if (!b.length) return 0; let k = 1; while (k < b.length && b[b.length - 1 - k] === b[b.length - 1]) k++; return k; };
  const poCan = (a, b) => a.length > 0 && b.length < PO_CAP && (!b.length || b[b.length - 1] === a[a.length - 1]);
  function poPour(bs, i, j) { const n = Math.min(poTopRun(bs[i]), PO_CAP - bs[j].length); for (let k = 0; k < n; k++) bs[j].push(bs[i].pop()); return n; }
  const poDone = bs => bs.every(b => !b.length || (b.length === PO_CAP && b.every(x => x === b[0])));
  // Depth-first solver with memo on the canonical (sorted) state. Returns a move list or null.
  function poSolve(start, limit = 150000) {
    const seen = new Set(); let count = 0;
    const key = bs => bs.map(b => b.join('')).sort().join('|');
    const path = [];
    function dfs(bs) {
      if (poDone(bs)) return true;
      if (++count > limit) return false;
      const k = key(bs); if (seen.has(k)) return false; seen.add(k);
      for (let i = 0; i < bs.length; i++) {
        const a = bs[i]; if (!a.length) continue;
        const run = poTopRun(a);
        if (run === a.length && a.length === PO_CAP) continue; // already sorted
        let emptyTried = false;
        for (let j = 0; j < bs.length; j++) {
          if (i === j || !poCan(a, bs[j])) continue;
          if (!bs[j].length) { if (run === a.length || emptyTried) continue; emptyTried = true; }
          const nb = bs.map(b => b.slice()); poPour(nb, i, j); path.push([i, j]);
          if (dfs(nb)) return true;
          path.pop();
        }
      }
      return false;
    }
    return dfs(start.map(b => b.slice())) ? path.slice() : null;
  }
  function poPlan(L) { return { nc: L <= 1 ? 2 : clamp(Math.round(ramp(L, 2, 7, 5)), 3, 7), ne: L <= 1 ? 1 : 2 }; }
  function poGen(nc, ne) {
    for (let t = 0; ; t++) {
      const layers = shuffle([...Array(nc)].flatMap((_, c) => Array(PO_CAP).fill(c)));
      const bs = [...Array(nc)].map((_, i) => layers.slice(i * PO_CAP, (i + 1) * PO_CAP));
      for (let e = 0; e < ne; e++) bs.push([]);
      if (bs.filter(b => b.length && b.every(x => x === b[0])).length > (nc > 3 ? 1 : 0) || poDone(bs)) continue;
      if (poSolve(bs) || t > 60) return bs;
    }
  }

  function startPour(L, api) {
    const { nc, ne } = poPlan(L);
    let bs = poGen(nc, ne), sel = null, moves = 0, mistakes = 0, extraUsed = false, finished = false, history = [];
    const doneBottles = new Set();
    api.hint('Tap a bottle, then tap another to pour. Pour only onto the same colour or into an empty bottle.');
    const wrap = el('div', 'sl-wrap');
    const row = el('div', 'po-row');
    const info = el('p', 'sl-info');
    const ctl = el('div', 'sl-ctl');
    const undoBtn = mkBtn('↶ Undo', 'c-card', undo), extraBtn = mkBtn('🧴 Extra bottle', 'c-sky', extra);
    ctl.append(undoBtn, extraBtn);
    wrap.append(row, info, ctl); api.stage.append(wrap);
    const isFull = b => b.length === PO_CAP && b.every(x => x === b[0]);
    function render(dropTo, dropN) {
      row.innerHTML = '';
      bs.forEach((b, i) => {
        const e = el('button', 'po-b' + (sel === i ? ' sel' : '') + (isFull(b) ? ' full' : '')); e.type = 'button';
        e.setAttribute('aria-label', b.length ? 'Bottle with ' + b.length + ' layers' : 'Empty bottle');
        const g = el('span', 'po-glass');
        b.forEach((c, k) => { const l = el('span', 'po-l tile c-' + COLS7[c].c, COLS7[c].s); if (i === dropTo && k >= b.length - dropN) l.classList.add('drop'); g.append(l); });
        if (doneBottles.has(i)) e.classList.add('stay');
        e.append(g); e.onclick = () => tap(i, e); row.append(e);
      });
      bs.forEach((b, i) => { if (isFull(b)) doneBottles.add(i); else doneBottles.delete(i); });
      info.textContent = 'Pours: ' + moves;
      undoBtn.disabled = !history.length || finished; extraBtn.disabled = extraUsed || finished;
    }
    function anyMove() { for (let i = 0; i < bs.length; i++) for (let j = 0; j < bs.length; j++) if (i !== j && poCan(bs[i], bs[j]) && !isFull(bs[i])) return true; return false; }
    function tap(i, e) {
      if (finished) return;
      if (sel === null) {
        if (!bs[i].length) { sfx.soft(); toast('That bottle is empty'); wob(e); return; }
        sel = i; sfx.tap(); render(); return;
      }
      if (sel === i) { sel = null; render(); return; }
      const a = bs[sel], b = bs[i];
      if (!poCan(a, b)) {
        mistakes++; sfx.soft(); wob(e);
        toast(b.length >= PO_CAP ? 'That bottle is full' : 'Only onto the same colour');
        sel = null; render(); return;
      }
      history.push(bs.map(x => x.slice()));
      const was = isFull(b), n = poPour(bs, sel, i); sel = null; moves++;
      for (let k = 0; k < n; k++) tone(330 + (b.length - n + k) * 90, .12, 'sine', .1, k * .07);
      render(i, n);
      if (!was && isFull(b)) { api.later(() => tone(880, .2, 'triangle', .12), n * 70 + 60); toast(cheer()); }
      if (poDone(bs)) {
        finished = true; render(); api.hint('Every bottle is one colour! ' + cheer());
        api.later(() => sfx.good(), 300);
        api.done(starsFor(mistakes + (extraUsed ? 2 : 0), 1, 4));
      } else if (!anyMove()) api.hint('No more pours fit. Try Undo, or add an Extra bottle.');
      else api.hint('Tap a bottle, then tap another to pour. Pour only onto the same colour or into an empty bottle.');
    }
    function undo() { if (!history.length || finished) return; bs = history.pop(); sel = null; sfx.tap(); render(); }
    function extra() {
      if (extraUsed || finished) return;
      extraUsed = true; bs.push([]); history = history.map(h => h.concat([[]])); sfx.good(); toast('Here’s an extra bottle'); render();
    }
    api.stage.__lab = { get bs() { return bs.map(b => b.slice()); }, tap: i => tap(i, row.children[i]), solve: () => poSolve(bs) };
    render();
  }

  // Engines exposed for automated checks (not used by the app itself).
  R.slideLab = { ubGen, ubSolve, ubBand, cpGen, cpPlan, bfPlan, tgPuzzle, tgSolvable, tgKey, TG_DESIGNS, tgFromDesign, TG_OR, tgNorm, poGen, poSolve, poPlan, slidePlan };
})();
