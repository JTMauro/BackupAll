/* Recall: Peg Solitaire, Sea Battle, Number Target and Shape Packing.
   Every level is generated fresh and is solvable by construction:
   pegs are built by reverse jumps from one peg, number targets are built from the tiles,
   packing boxes are cut into pieces. */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor } = R;

  const ramp = (L, a, b, rate) => b + (a - b) * Math.exp(-(Math.max(1, L) - 1) / rate);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function mkBtn(html, cls, fn) { const b = el('button', 'btn ' + cls, html); b.type = 'button'; b.onclick = fn; return b; }
  const PAL = [{ c: 'coral', s: '●' }, { c: 'sky', s: '★' }, { c: 'sun', s: '▲' }, { c: 'leaf', s: '■' }, { c: 'berry', s: '♥' }, { c: 'orange', s: '◆' }, { c: 'grape', s: '✚' }, { c: 'mint', s: '⬟' }];

  R.css(`
.p6-wrap{max-width:620px; margin:0 auto; display:grid; gap:16px; justify-items:center}
.p6-ctl{display:flex; flex-wrap:wrap; gap:12px; justify-content:center; width:100%}
.p6-ctl .btn{font-size:1.15rem; min-width:120px}
.p6-ctl .btn:disabled{opacity:.4; cursor:default}
.p6-ctl .btn.glow{animation:p6glow 1s infinite alternate}
.p6-info{font:600 1.25rem var(--display); color:var(--on-table-soft); text-align:center; margin:0}
@keyframes p6glow{to{box-shadow:0 6px 0 var(--d), 0 0 0 6px #fff, 0 10px 18px rgba(0,0,0,.25)}}

/* Peg Solitaire */
.pg-frame{width:min(100%, calc(var(--w) * 64px + 28px)); padding:14px; border-radius:30px;
  background:linear-gradient(180deg,#A86A3A,#7A4622); box-shadow:inset 0 3px 0 rgba(255,255,255,.25), 0 8px 0 #4E2C14, 0 16px 26px rgba(0,0,0,.35)}
.pg-board{display:grid; grid-template-columns:repeat(var(--w), 1fr); aspect-ratio:var(--w) / var(--h); padding:4px; border-radius:18px;
  background:repeating-linear-gradient(90deg, rgba(110,60,20,0) 0 9px, rgba(110,60,20,.13) 9px 11px), #DDAE70; box-shadow:inset 0 4px 10px rgba(0,0,0,.3)}
.pg-h{position:relative; border:0; background:none; padding:0; display:grid; place-items:center; cursor:pointer; min-width:0}
.pg-h.off{pointer-events:none}
.pg-h:not(.off)::before{content:""; position:absolute; width:46%; height:46%; border-radius:50%; background:#6B3E1C; box-shadow:inset 0 4px 4px rgba(0,0,0,.55), 0 2px 0 rgba(255,255,255,.4)}
.pg-peg{position:relative; z-index:1; width:78%; height:78%; border-radius:50%;
  background:radial-gradient(circle at 34% 28%, rgba(255,255,255,.85) 0 11%, rgba(255,255,255,0) 13%), radial-gradient(circle at 40% 35%, var(--c) 0 55%, var(--d) 100%);
  box-shadow:0 5px 0 var(--d), 0 9px 10px rgba(0,0,0,.35); transition:transform .15s}
.pg-h.sel .pg-peg{transform:translateY(-8px) scale(1.06); box-shadow:0 0 0 4px #fff, 0 12px 0 var(--d), 0 18px 14px rgba(0,0,0,.35)}
.pg-h.tip .pg-peg{box-shadow:0 0 0 5px var(--sun), 0 5px 0 var(--d), 0 9px 10px rgba(0,0,0,.35)}
.pg-h.to::after{content:"⬤"; position:absolute; z-index:2; display:grid; place-items:center; width:64%; height:64%; border-radius:50%; color:#fff; font-size:clamp(.7rem, 2.6vw, 1rem);
  background:var(--leaf); box-shadow:0 0 0 4px #fff, 0 4px 0 var(--leaf-d); animation:p6pulse .8s infinite alternate}
.pg-h.over .pg-peg{filter:brightness(.88)}
.pg-peg.land{animation:bounceIn .35s}
.pg-peg.gone{position:absolute; animation:pop .35s forwards}
@keyframes p6pulse{to{scale:1.12}}

/* Sea Battle */
.sb-wrap{display:flex; flex-wrap:wrap; gap:14px 24px; justify-content:center; align-items:flex-start; max-width:920px; margin:0 auto}
.sb-main{display:grid; gap:8px; justify-items:center; width:min(100%, 440px)}
.sb-side{display:flex; gap:12px; align-items:flex-start; justify-content:center; flex-wrap:wrap; width:min(100%, 400px)}
.sb-cap{font:600 1.2rem var(--display); color:var(--on-table); margin:0; text-align:center}
.sb-sea{display:grid; grid-template-columns:repeat(var(--n), 1fr); gap:3px; padding:7px; border-radius:20px; aspect-ratio:1; width:100%;
  background:radial-gradient(120% 90% at 30% 10%, #5CC2FF, #1F79C4 70%); box-shadow:inset 0 4px 12px rgba(0,0,0,.35), 0 0 0 4px rgba(255,255,255,.22), 0 12px 20px rgba(0,0,0,.3)}
.sb-sea.wait{filter:saturate(.7) brightness(.9)}
.sb-mine{width:150px; padding:5px; gap:2px; border-radius:14px}
.sb-c{position:relative; border:0; padding:0; min-width:0; border-radius:22%; background:rgba(255,255,255,.13); display:grid; place-items:center; cursor:pointer;
  font:700 clamp(1rem, 4.6vw, 1.6rem) var(--display); color:var(--ink)}
.sb-mine .sb-c{cursor:default; font-size:.85rem; border-radius:18%}
.sb-c.tile{background:linear-gradient(155deg, rgba(255,255,255,.42), rgba(255,255,255,0) 48%), var(--c); box-shadow:inset 0 -4px 0 rgba(0,0,0,.16), inset 0 2px 0 rgba(255,255,255,.5), 0 3px 0 var(--d)}
.sb-mine .sb-c.tile{box-shadow:inset 0 -2px 0 rgba(0,0,0,.16), 0 2px 0 var(--d)}
.sb-c.miss::after{content:""; width:34%; height:34%; border-radius:50%; background:#fff; box-shadow:0 0 0 4px rgba(255,255,255,.35)}
.sb-c.splash::before{content:""; position:absolute; inset:0; border-radius:50%; border:4px solid #fff; animation:sbring .7s ease-out forwards}
.sb-c.boom{animation:sbboom .5s}
.sb-c.aim{outline:4px solid var(--sun); outline-offset:1px; z-index:1}
@keyframes sbring{from{scale:.2; opacity:1}to{scale:1.6; opacity:0}}
@keyframes sbboom{0%{scale:.4}50%{scale:1.3}100%{scale:1}}
.sb-fleet{display:grid; gap:7px; justify-items:start}
.sb-fleet h4{margin:0; font:600 1.1rem var(--display); color:var(--on-table-soft)}
.sb-ship{display:flex; gap:3px}
.sb-ship i{width:20px; height:20px; border-radius:5px; background:linear-gradient(155deg, rgba(255,255,255,.45), rgba(255,255,255,0) 55%), var(--card); box-shadow:0 3px 0 var(--card-edge)}
.sb-ship.sunk i{background:var(--coral); box-shadow:0 3px 0 var(--coral-d)}
.sb-ship.sunk::after{content:"sunk"; font:600 .95rem var(--display); color:var(--on-table-soft); margin-left:6px}
.sb-sidecol{display:grid; gap:10px; justify-items:center; max-width:170px}
.sb-sidecol .btn{font-size:1.05rem; padding:.5em .8em; white-space:normal; text-align:center}

/* Number Target */
.nt-goal{display:flex; align-items:center; gap:14px; font:600 1.35rem var(--display)}
.nt-goal .tile{min-width:104px; height:86px; padding:0 .3em; font:700 2.9rem var(--display); border-radius:22px}
.nt-tiles{display:flex; flex-wrap:wrap; gap:16px 14px; justify-content:center; min-height:92px; width:100%; max-width:520px}
.nt-t{width:78px; height:78px; font:700 2.2rem var(--display); cursor:pointer; transition:transform .15s}
.nt-t.sel{transform:translateY(-10px); box-shadow:inset 0 -6px 0 rgba(0,0,0,.14), 0 0 0 5px #fff, 0 12px 0 var(--d), 0 18px 18px rgba(0,0,0,.28)}
.nt-t.new{animation:bounceIn .4s}
.nt-t.tip, .nt-op.tip{outline:5px dashed #fff; outline-offset:5px}
.nt-t.win{animation:p6pulse .4s 4 alternate}
.nt-ops{display:flex; gap:14px; justify-content:center; flex-wrap:wrap; width:100%}
.nt-op{min-width:80px; padding:.3em .55em; font:700 2.8rem/1 var(--body)}
.nt-op.on{transform:translateY(-4px); box-shadow:0 0 0 5px #fff, 0 10px 0 var(--d), 0 14px 18px rgba(0,0,0,.25)}
.nt-work{display:flex; flex-wrap:wrap; gap:8px; justify-content:center; min-height:38px}
.nt-work span{background:rgba(0,0,0,.24); border-radius:999px; padding:.2em .85em; font:600 1.2rem var(--display); color:var(--on-table); animation:bounceIn .3s}

/* Shape Packing */
.pk-box{display:grid; grid-template-columns:repeat(var(--w), 1fr); aspect-ratio:var(--w) / var(--h); width:min(100%, calc(var(--w) * 66px + 24px)); padding:10px; border-radius:20px;
  background:linear-gradient(180deg,#B9844F,#8D5B2E); box-shadow:inset 0 0 0 4px rgba(0,0,0,.18), inset 0 6px 14px rgba(0,0,0,.35), 0 8px 0 #5A361C, 0 14px 22px rgba(0,0,0,.35)}
.pk-c{border:3px solid transparent; padding:2px; background:none; min-width:0; cursor:pointer; display:grid}
.pk-c > span{display:grid; place-items:center; border-radius:20%; background:rgba(0,0,0,.16); font:700 clamp(1rem, 4.5vw, 1.5rem) var(--display); color:var(--ink)}
.pk-c > span.tile{background:linear-gradient(155deg, rgba(255,255,255,.42), rgba(255,255,255,0) 48%), var(--c); box-shadow:inset 0 -4px 0 rgba(0,0,0,.16), inset 0 2px 0 rgba(255,255,255,.5), 0 3px 0 var(--d)}
.pk-c > span.pv{background:var(--c); opacity:.8; outline:3px solid #fff; outline-offset:-3px; animation:bounceIn .2s}
.pk-c > span.bad{background:rgba(255,107,74,.55); outline:3px dashed #fff; outline-offset:-3px}
.pk-c > span.ghost{background:rgba(255,255,255,.28)}
.pk-c > span.land{animation:bounceIn .3s}
.pk-c > span.win{animation:p6pulse .35s 2 alternate}
.p6-ctl.pk-ctl{gap:10px}
.p6-ctl.pk-ctl .btn{min-width:0; flex:1 1 0; max-width:150px; padding:.6em .5em}
.pk-tray{display:flex; flex-wrap:wrap; gap:10px; justify-content:center; width:100%; max-width:600px; min-height:60px}
.pk-slot{min-width:76px; min-height:76px; border:0; border-radius:18px; background:rgba(0,0,0,.2); cursor:pointer; display:grid; place-items:center; padding:9px;
  box-shadow:inset 0 3px 8px rgba(0,0,0,.25); transition:transform .12s}
.pk-slot.sel{background:rgba(255,255,255,.28); box-shadow:inset 0 0 0 4px #fff; transform:translateY(-6px)}
.pk-mini{display:grid; gap:3px}
.pk-mini i{width:clamp(13px, 4vw, 19px); aspect-ratio:1; border-radius:5px}
.pk-mini i.on{background:linear-gradient(155deg, rgba(255,255,255,.45), rgba(255,255,255,0) 55%), var(--c); box-shadow:0 3px 0 var(--d)}
.pk-mini.turn{animation:bounceIn .25s}
`);

  /* =========================================================
     1. PEG SOLITAIRE
     ========================================================= */
  register({ id: 'pegs', cat: 'slide', order: 10, name: 'Peg Solitaire', icon: '🪀', desc: 'Jump pegs over each other until one is left', start: startPegs });

  const PG_BOARDS = {
    sq3: ['ooo', 'ooo', 'ooo'],
    r34: ['oooo', 'oooo', 'oooo'],
    sq4: ['oooo', 'oooo', 'oooo', 'oooo'],
    c5: ['.ooo.', 'ooooo', 'ooooo', 'ooooo', '.ooo.'],
    eng: ['..ooo..', '..ooo..', 'ooooooo', 'ooooooo', 'ooooooo', '..ooo..', '..ooo..']
  };
  function pgPlan(L) {
    if (L <= 1) return { b: 'sq3', n: 2 };
    if (L === 2) return { b: 'r34', n: 3 };
    if (L === 3) return { b: 'sq4', n: 4 };
    if (L === 4) return { b: 'c5', n: 5 };
    if (L === 5) return { b: 'c5', n: 6 };
    if (L === 6) return { b: 'eng', n: 7 };
    return { b: L % 5 === 0 && L < 15 ? 'c5' : 'eng', n: Math.round(ramp(L - 5, 7, 14, 6)) + randInt(2) };
  }
  function pgGeometry(rows) {
    const H = rows.length, W = rows[0].length, ok = [], J = [];
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) ok.push(rows[r][c] === 'o');
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      if (!ok[r * W + c]) continue;
      for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const r3 = r + 2 * dr, c3 = c + 2 * dc;
        if (r3 < 0 || c3 < 0 || r3 >= H || c3 >= W) continue;
        const over = (r + dr) * W + c + dc, to = r3 * W + c3;
        if (ok[over] && ok[to]) J.push([r * W + c, over, to]);
      }
    }
    return { W, H, ok, J };
  }
  // forward jump j=[from,over,to]; reverse generation un-jumps from a single peg
  function pgGenerate(G, n, centre) {
    const cells = G.ok.map((v, i) => v ? i : -1).filter(i => i >= 0);
    for (let t = 0; t < 500; t++) {
      const p = new Array(G.ok.length).fill(0);
      p[centre && Math.random() < .5 ? Math.floor(G.ok.length / 2) : pick(cells)] = 1;
      const rev = []; let good = true;
      for (let k = 0; k < n; k++) {
        const cand = G.J.filter(j => p[j[2]] && !p[j[1]] && !p[j[0]]);
        if (!cand.length) { good = false; break; }
        const j = pick(cand); p[j[2]] = 0; p[j[1]] = 1; p[j[0]] = 1; rev.push(j);
      }
      if (good) return { pegs: p, sol: rev.reverse() };
    }
    return null;
  }
  // depth-first solver with a memo of dead positions; returns moves, null (unsolvable) or undefined (gave up)
  function pgSolve(G, start, limit = 250000) {
    const p = start.slice(), dead = new Set(), path = []; let nodes = 0;
    function rec(count) {
      if (count === 1) return true;
      if (++nodes > limit) throw 0;
      const key = p.join('');
      if (dead.has(key)) return false;
      for (const j of G.J) {
        if (!p[j[0]] || !p[j[1]] || p[j[2]]) continue;
        p[j[0]] = 0; p[j[1]] = 0; p[j[2]] = 1; path.push(j);
        if (rec(count - 1)) return true;
        p[j[0]] = 1; p[j[1]] = 1; p[j[2]] = 0; path.pop();
      }
      dead.add(key); return false;
    }
    try { return rec(p.reduce((a, b) => a + b, 0)) ? path.slice() : null; } catch (e) { return undefined; }
  }
  R.p6 = Object.assign(R.p6 || {}, { pgGeometry, pgGenerate, pgSolve, pgPlan, PG_BOARDS });

  function startPegs(L, api) {
    const plan = pgPlan(L), G = pgGeometry(PG_BOARDS[plan.b]), { W, H, J } = G;
    const gen = pgGenerate(G, plan.n, plan.b === 'eng');
    let pegs = gen.pegs.slice();
    const solNext = new Map(); { const q = pegs.slice(); gen.sol.forEach(j => { solNext.set(q.join(''), j); q[j[0]] = 0; q[j[1]] = 0; q[j[2]] = 1; }); }
    let hist = [], sel = null, tip = null, hints = 0, undos = 0, finished = false, busy = false;
    const count = () => pegs.reduce((a, b) => a + b, 0);
    const movesFrom = i => J.filter(j => j[0] === i && pegs[j[1]] && !pegs[j[2]]);
    const allMoves = () => J.filter(j => pegs[j[0]] && pegs[j[1]] && !pegs[j[2]]);

    api.hint('Tap a peg. Then tap a green spot to jump over a neighbour. Aim for one peg left.');
    const wrap = el('div', 'p6-wrap');
    const frame = el('div', 'pg-frame'), board = el('div', 'pg-board');
    frame.style.setProperty('--w', W); board.style.setProperty('--w', W); board.style.setProperty('--h', H);
    frame.append(board);
    const info = el('p', 'p6-info');
    const undoBtn = mkBtn('↶ Undo', 'c-card', () => undo());
    const hintBtn = mkBtn('💡 Hint', 'c-sun', () => giveHint());
    const ctl = el('div', 'p6-ctl'); ctl.append(undoBtn, hintBtn);
    wrap.append(frame, info, ctl); api.stage.append(wrap);
    const cellEls = G.ok.map((ok, i) => {
      const b = el('button', 'pg-h' + (ok ? '' : ' off')); b.type = 'button';
      if (ok) b.onclick = () => tap(i); else b.tabIndex = -1;
      board.append(b); return b;
    });

    function render(fx) {
      const tos = sel !== null ? movesFrom(sel).filter(j => !tip || tip[0] !== sel || j[2] === tip[2]) : [];
      cellEls.forEach((b, i) => {
        if (!G.ok[i]) return;
        b.className = 'pg-h' + (sel === i ? ' sel' : '') + (tos.some(j => j[2] === i) ? ' to' : '') + (tos.some(j => j[1] === i) ? ' over' : '') + (tip && tip[0] === i && sel !== i ? ' tip' : '');
        b.innerHTML = '';
        if (pegs[i]) {
          const pg = el('span', 'pg-peg c-coral'); if (fx && fx.land === i) pg.classList.add('land');
          b.append(pg); b.setAttribute('aria-label', 'Peg');
        } else b.setAttribute('aria-label', tos.some(j => j[2] === i) ? 'Jump here' : 'Empty hole');
        if (fx && fx.gone === i) b.append(el('span', 'pg-peg c-coral gone'));
      });
      const c = count();
      info.textContent = c === 1 ? 'One peg left!' : `Pegs left: ${c}`;
      undoBtn.disabled = !hist.length || finished;
      hintBtn.disabled = finished;
    }
    function tap(i) {
      if (finished || busy) return;
      if (pegs[i]) {
        if (sel === i) { sel = null; sfx.tap(); render(); return; }
        if (!movesFrom(i).length) { sel = null; sfx.soft(); wob(cellEls[i]); api.hint('That peg has no jump just now. Pick a peg next to another peg, with an empty hole beyond.'); render(); return; }
        sel = i; sfx.tap(); api.hint('Now tap a green spot. The peg jumps over its neighbour, and the neighbour is taken off.'); render(); return;
      }
      if (sel === null) { api.hint('Tap a peg first, then tap a green spot.'); return; }
      const j = movesFrom(sel).find(m => m[2] === i);
      if (!j) { sfx.soft(); wob(cellEls[i]); api.hint('A peg can only jump over one neighbour into an empty hole. Try a green spot.'); return; }
      jump(j);
    }
    function jump(j) {
      pegs[j[0]] = 0; pegs[j[1]] = 0; pegs[j[2]] = 1; hist.push(j); sel = null; tip = null;
      tone(330 + hist.length * 28, .12, 'triangle', .12); tone(520 + hist.length * 28, .1, 'sine', .07, .08);
      render({ land: j[2], gone: j[1] });
      afterMove();
    }
    function afterMove() {
      const c = count();
      if (c === 1) {
        finished = true; render(); sfx.good();
        api.hint(cheer() + ' Just one peg left on the board!');
        api.later(() => api.done(starsFor(hints * 2 + undos, 1, 4)), 600);
      } else if (!allMoves().length) {
        sfx.soft(); hintBtn.classList.add('glow'); undoBtn.classList.add('glow');
        api.hint(`No more jumps, with ${c} pegs left. Tap Undo or Hint to go back and try another way.`);
      } else {
        api.hint(c === 2 ? 'Two pegs left. One more jump!' : 'Lovely. Tap a peg to make the next jump.');
      }
    }
    function undoOnce() {
      const j = hist.pop(); if (!j) return false;
      pegs[j[0]] = 1; pegs[j[1]] = 1; pegs[j[2]] = 0; return true;
    }
    function undo() {
      if (finished || busy || !hist.length) return;
      undoOnce(); undos++; sel = null; tip = null; sfx.tap();
      hintBtn.classList.remove('glow'); undoBtn.classList.remove('glow');
      api.hint('Taken back. Tap a peg to jump.'); render({ land: -1 });
    }
    function giveHint() {
      if (finished || busy) return;
      hints++; sfx.tap(); hintBtn.classList.remove('glow'); undoBtn.classList.remove('glow');
      let back = 0, move = null;
      for (;;) {
        const key = pegs.join('');
        if (solNext.has(key)) { move = solNext.get(key); break; }
        const s = pgSolve(G, pegs);
        if (s && s.length) { move = s[0]; break; }
        if (!undoOnce()) break;
        back++;
      }
      if (!move) return;
      tip = move; sel = move[0];
      api.hint((back ? `I took back ${back} jump${back > 1 ? 's' : ''}. ` : '') + 'Try this: the lifted peg jumps into the green spot.');
      render();
    }
    render();
  }

  /* =========================================================
     2. SEA BATTLE
     ========================================================= */
  register({ id: 'seabattle', cat: 'cards', order: 25, name: 'Sea Battle', icon: '🚢', desc: 'Find and sink the computer’s hidden boats', start: startSea });

  function sbPlan(L) {
    if (L <= 1) return { n: 6, ships: [3, 2, 2], ai: 0 };
    if (L === 2) return { n: 6, ships: [3, 3, 2], ai: 0 };
    if (L === 3) return { n: 7, ships: [3, 3, 2, 2], ai: 0 };
    if (L <= 5) return { n: 7, ships: [4, 3, 2, 2], ai: 1 };
    if (L <= 9) return { n: 8, ships: [4, 3, 3, 2], ai: 1 };
    return { n: 8, ships: [5, 4, 3, 2, 2], ai: L >= 14 ? 2 : 1 };
  }
  function sbFleet(n, sizes) {
    const N = n * n;
    const nb8 = i => { const r = Math.floor(i / n), c = i % n, out = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc; if (rr >= 0 && cc >= 0 && rr < n && cc < n) out.push(rr * n + cc); } return out; };
    for (let t = 0; t < 1000; t++) {
      const at = new Array(N).fill(-1), ships = []; let good = true;
      for (let k = 0; k < sizes.length && good; k++) {
        const len = sizes[k]; let placed = false;
        for (let a = 0; a < 120 && !placed; a++) {
          const hz = Math.random() < .5, r = randInt(hz ? n : n - len + 1), c = randInt(hz ? n - len + 1 : n);
          const cells = [...Array(len)].map((_, i) => hz ? r * n + c + i : (r + i) * n + c);
          if (cells.every(x => at[x] < 0 && (t > 700 || nb8(x).every(y => at[y] < 0)))) { cells.forEach(x => { at[x] = k; }); ships.push({ cells, len, hits: 0, sunk: false }); placed = true; }
        }
        if (!placed) good = false;
      }
      if (good) return { at, ships };
    }
    return null;
  }
  R.p6 = Object.assign(R.p6 || {}, { sbFleet, sbPlan });

  function startSea(L, api) {
    const P = sbPlan(L), n = P.n, N = n * n;
    let me = sbFleet(n, P.ships), cpu = sbFleet(n, P.ships);
    const myShots = new Array(N).fill(0), cpuShots = new Array(N).fill(0);
    let turn = 'me', started = false, finished = false;
    const totalCells = P.ships.reduce((a, b) => a + b, 0);
    const nb4 = i => { const r = Math.floor(i / n), c = i % n; return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < n && b < n).map(([a, b]) => a * n + b); };

    api.hint('Tap a square on the computer’s sea to fire. Find all its hidden boats!');
    const wrap = el('div', 'sb-wrap');
    const main = el('div', 'sb-main'), side = el('div', 'sb-side');
    const sea = el('div', 'sb-sea'); sea.style.setProperty('--n', n);
    const mine = el('div', 'sb-sea sb-mine'); mine.style.setProperty('--n', n);
    main.append(el('p', 'sb-cap', '🎯 The computer’s sea'), sea);
    const mineCol = el('div', 'sb-sidecol'); mineCol.append(el('p', 'sb-cap', '🚢 Your boats'), mine);
    const fleetCol = el('div', 'sb-sidecol');
    const theirFleet = el('div', 'sb-fleet'), myFleet = el('div', 'sb-fleet');
    const shuffleBtn = mkBtn('🔀 Shuffle my ships', 'c-sky', () => {
      if (started || finished) return; me = sbFleet(n, P.ships); sfx.tap(); render(); wob(mine);
    });
    fleetCol.append(theirFleet, shuffleBtn);
    side.append(mineCol, fleetCol);
    wrap.append(main, side); api.stage.append(wrap);
    const seaEls = [], mineEls = [];
    for (let i = 0; i < N; i++) {
      const b = el('button', 'sb-c'); b.type = 'button'; b.onclick = () => fire(i); seaEls.push(b); sea.append(b);
      const m = el('span', 'sb-c'); mineEls.push(m); mine.append(m);
    }

    function fleetHtml(fleet, title) {
      return `<h4>${title}</h4>` + fleet.ships.map(s => `<div class="sb-ship${s.sunk ? ' sunk' : ''}">${'<i></i>'.repeat(s.len)}</div>`).join('');
    }
    function render(fx = {}) {
      seaEls.forEach((b, i) => {
        const s = myShots[i], k = cpu.at[i], sunk = k >= 0 && cpu.ships[k].sunk;
        b.className = 'sb-c' + (s === 1 ? ' miss' : '') + (s === 2 ? ' tile ' + (sunk ? 'c-coral' : 'c-orange') : '') + (fx.sea === i ? (s === 2 ? ' boom' : ' splash') : '');
        b.textContent = s === 2 ? (sunk ? '✖' : '✸') : '';
        b.setAttribute('aria-label', s === 0 ? 'Fire here' : s === 1 ? 'Splash, missed' : sunk ? 'Sunk boat' : 'Hit');
      });
      mineEls.forEach((b, i) => {
        const s = cpuShots[i], k = me.at[i];
        b.className = 'sb-c' + (k >= 0 ? ' tile ' + (s === 2 ? 'c-coral' : 'c-card') : '') + (s === 1 ? ' miss' : '') + (fx.mine === i ? (s === 2 ? ' boom aim' : ' splash aim') : '');
        b.textContent = k >= 0 ? (s === 2 ? '✸' : '■') : '';
      });
      sea.classList.toggle('wait', turn !== 'me' && !finished);
      theirFleet.innerHTML = fleetHtml(cpu, 'Boats to find');
      shuffleBtn.hidden = started;
      if (started) { myFleet.innerHTML = fleetHtml(me, 'Your boats'); if (!myFleet.isConnected) fleetCol.append(myFleet); }
    }
    function shoot(fleet, shots, i) {
      const k = fleet.at[i];
      if (k < 0) { shots[i] = 1; return { hit: false }; }
      shots[i] = 2; const s = fleet.ships[k]; s.hits++;
      if (s.hits === s.len) s.sunk = true;
      return { hit: true, sunk: s.sunk, len: s.len, all: fleet.ships.every(x => x.sunk) };
    }
    function fire(i) {
      if (finished) return;
      if (turn !== 'me') { api.hint('The computer is taking its turn. Your go is coming.'); return; }
      if (myShots[i]) { sfx.soft(); wob(seaEls[i]); api.hint('You have fired there already. Pick a fresh square.'); return; }
      started = true;
      const res = shoot(cpu, myShots, i);
      render({ sea: i });
      let msg;
      if (!res.hit) { msg = 'Splash! Nothing there.'; tone(330, .14, 'sine', .1); tone(220, .22, 'sine', .08, .07); }
      else if (res.sunk) { msg = `You sank a boat of ${res.len}!`; [392, 494, 587, 784].forEach((f, k) => tone(f, .14, 'triangle', .12, k * .09)); }
      else { msg = 'A hit! Part of a boat is there.'; tone(140, .25, 'square', .1); tone(523, .14, 'triangle', .1, .1); }
      if (res.all) {
        finished = true; render(); sfx.good();
        const taken = cpuShots.filter(x => x === 2).length;
        api.hint(`${msg} You found every one of the computer’s boats. ${cheer()}`);
        api.later(() => api.done(taken * 2 < totalCells ? 3 : 2), 1400);
        return;
      }
      turn = 'cpu'; render();
      api.hint(msg + ' Now the computer takes its turn…');
      api.later(cpuTurn, 1500);
    }
    function cpuPick() {
      const free = []; for (let i = 0; i < N; i++) if (!cpuShots[i]) free.push(i);
      if (P.ai >= 1) {
        const open = []; for (let i = 0; i < N; i++) if (cpuShots[i] === 2 && !me.ships[me.at[i]].sunk) open.push(i);
        if (open.length && (P.ai >= 2 || Math.random() < .7)) {
          let cand = [];
          if (P.ai >= 2) open.forEach(h => {
            const r = Math.floor(h / n), c = h % n;
            [[0, 1], [1, 0], [0, -1], [-1, 0]].forEach(([dr, dc]) => {
              const br = r - dr, bc = c - dc, fr = r + dr, fc = c + dc;
              if (br >= 0 && bc >= 0 && br < n && bc < n && open.includes(br * n + bc) && fr >= 0 && fc >= 0 && fr < n && fc < n && !cpuShots[fr * n + fc]) cand.push(fr * n + fc);
            });
          });
          if (!cand.length) cand = [...new Set(open.flatMap(nb4))].filter(x => !cpuShots[x]);
          if (cand.length) return pick(cand);
        }
        if (P.ai >= 2 && Math.random() < .8) { const par = free.filter(i => (Math.floor(i / n) + i % n) % 2 === 0); if (par.length) return pick(par); }
      }
      return pick(free);
    }
    function cpuTurn() {
      if (finished) return;
      const i = cpuPick(), res = shoot(me, cpuShots, i);
      render({ mine: i });
      let msg;
      if (!res.hit) { msg = 'The computer’s shot splashed into the sea.'; tone(300, .14, 'sine', .08); tone(200, .22, 'sine', .06, .07); }
      else if (res.sunk) { msg = `The computer sank your boat of ${res.len}.`; tone(196, .3, 'triangle', .1); tone(147, .4, 'triangle', .08, .15); }
      else { msg = 'The computer hit one of your boats.'; tone(150, .22, 'square', .08); }
      if (res.all) {
        finished = true; render();
        api.hint(msg + ' It found all your boats this time. A good game, well played! Have another go.');
        api.later(() => api.done(1), 1800);
        return;
      }
      api.hint(msg);
      api.later(() => { turn = 'me'; render(); api.hint(msg + ' Your turn: tap a square on the computer’s sea.'); }, 900);
    }
    render();
  }

  /* =========================================================
     3. NUMBER TARGET
     ========================================================= */
  register({ id: 'numtarget', cat: 'numbers', order: 6, name: 'Number Target', icon: '🎯', desc: 'Combine number tiles to make the target', start: startNumTarget });

  const NT_ROUNDS = 3;
  function ntPlan(L) {
    if (L <= 1) return { tiles: 3, steps: 1, ops: '+', max: 9, cap: 20, min: 3 };
    if (L === 2) return { tiles: 4, steps: 1, ops: '+', max: 9, cap: 20, min: 5 };
    if (L === 3) return { tiles: 4, steps: 2, ops: '+', max: 9, cap: 30, min: 8 };
    if (L === 4) return { tiles: 4, steps: 2, ops: '+−', max: 10, cap: 30, min: 5 };
    if (L === 5) return { tiles: 5, steps: 2, ops: '+−×', max: 10, cap: 50, min: 8 };
    if (L <= 7) return { tiles: 5, steps: 3, ops: '+−×', max: 10, cap: 60, min: 10 };
    if (L <= 10) return { tiles: 6, steps: 3, ops: '+−×', max: 10, cap: 80, min: 12, big: L >= 9 };
    return { tiles: 6, steps: 3 + randInt(2), ops: '+−×', max: 10, cap: 100, min: 15, big: true };
  }
  const ntApply = (a, op, b) => op === '+' ? a + b : op === '−' ? Math.abs(a - b) : a * b;
  function ntOneStep(vals, target, ops) {
    for (let i = 0; i < vals.length; i++) for (let j = i + 1; j < vals.length; j++) for (const op of ops) if (ntApply(vals[i], op, vals[j]) === target) return true;
    return false;
  }
  function ntGenerate(P) {
    for (let t = 0; t < 5000; t++) {
      const tiles = [...Array(P.tiles)].map(() => 1 + randInt(P.max));
      if (P.big && Math.random() < .6) tiles[0] = pick([10, 20, 25]);
      const order = shuffle([...tiles.keys()]);
      let cur = tiles[order[0]], k = 1, ok = true; const steps = [];
      for (let s = 0; s < P.steps; s++) {
        const b = tiles[order[k++]]; let done = false;
        for (const op of shuffle([...P.ops])) {
          if (op === '−' && cur === b) continue;
          if (op === '×' && (cur < 2 || b < 2 || cur * b > P.cap)) continue;
          if (op === '+' && cur + b > P.cap) continue;
          const r = ntApply(cur, op, b);
          const [x, y] = op === '−' ? [Math.max(cur, b), Math.min(cur, b)] : [cur, b];
          steps.push({ a: x, op, b: y, r }); cur = r; done = true; break;
        }
        if (!done) { ok = false; break; }
      }
      if (!ok || tiles.includes(cur) || cur < P.min || cur > P.cap) continue;
      if (P.steps >= 2 && ntOneStep(tiles, cur, P.ops)) continue;
      return { tiles: shuffle(tiles), target: cur, steps };
    }
    return { tiles: [2, 3, 5], target: 5 + 3, steps: [{ a: 5, op: '+', b: 3, r: 8 }] };
  }
  // small DFS solver: returns a list of steps {a,op,b,r} or null
  function ntSolve(vals, target, ops) {
    const seen = new Set();
    function rec(v) {
      if (v.includes(target)) return [];
      if (v.length < 2) return null;
      const key = v.slice().sort((a, b) => a - b).join(',');
      if (seen.has(key)) return null; seen.add(key);
      for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) for (const op of ops) {
        const a = Math.max(v[i], v[j]), b = Math.min(v[i], v[j]);
        if (op === '−' && a === b) continue;
        const r = ntApply(a, op, b);
        const rest = v.filter((_, k) => k !== i && k !== j); rest.push(r);
        const s = rec(rest);
        if (s) return [{ a, op, b, r }, ...s];
      }
      return null;
    }
    return rec(vals.slice());
  }
  R.p6 = Object.assign(R.p6 || {}, { ntGenerate, ntSolve, ntPlan, ntApply });

  function startNumTarget(L, api) {
    let round = 0, hints = 0, slips = 0, finished = false;
    let P, puz, tiles, hist, sel, op, tip, uid = 0, busy = false;
    const wrap = el('div', 'p6-wrap');
    const goal = el('div', 'nt-goal');
    const tilesEl = el('div', 'nt-tiles');
    const opsEl = el('div', 'nt-ops');
    const work = el('div', 'nt-work');
    const undoBtn = mkBtn('↶ Undo', 'c-card', () => undo());
    const hintBtn = mkBtn('💡 Hint', 'c-sun', () => giveHint());
    const ctl = el('div', 'p6-ctl'); ctl.append(undoBtn, hintBtn);
    wrap.append(goal, tilesEl, opsEl, work, ctl); api.stage.append(wrap);
    api.rounds(NT_ROUNDS, 0);

    function newRound() {
      P = ntPlan(L); puz = ntGenerate(P);
      tiles = puz.tiles.map(v => ({ v, id: uid++, fresh: true }));
      hist = []; sel = null; op = null; tip = null; busy = false;
      goal.innerHTML = '';
      goal.append(el('span', '', 'Make'), el('span', 'tile c-sun', String(puz.target)));
      opsEl.innerHTML = '';
      [...P.ops].forEach(o => { const b = mkBtn(o, 'nt-op c-grape', () => pickOp(o)); b.dataset.op = o; b.setAttribute('aria-label', o === '+' ? 'add' : o === '−' ? 'take away' : 'times'); opsEl.append(b); });
      api.hint(P.steps === 1 ? `Tap two tiles that add up to ${puz.target}: tap a tile, then +, then another tile.` : `Make ${puz.target}. Tap a tile, then a sign, then another tile. The answer becomes a new tile.`);
      render();
    }
    function render() {
      tilesEl.innerHTML = '';
      tiles.forEach(t => {
        const b = el('button', 'tile nt-t ' + (t.v === puz.target ? 'c-leaf win' : t.made ? 'c-orange' : 'c-sky') + (sel === t.id ? ' sel' : '') + (t.fresh ? ' new' : '') + (tip && (tip.ta === t.id || (tip.tb === t.id && op === tip.op && sel === tip.ta)) ? ' tip' : ''), String(t.v));
        b.type = 'button'; t.fresh = false; b.onclick = () => pickTile(t.id); tilesEl.append(b);
      });
      opsEl.querySelectorAll('.nt-op').forEach(b => {
        b.classList.toggle('on', b.dataset.op === op);
        b.classList.toggle('tip', !!(tip && sel === tip.ta && !op && b.dataset.op === tip.op));
      });
      work.innerHTML = hist.map(h => `<span>${h.a} ${h.op} ${h.b} = ${h.r}</span>`).join('');
      undoBtn.disabled = !hist.length || busy || finished;
      hintBtn.disabled = busy || finished;
    }
    function pickTile(id) {
      if (busy || finished) return;
      if (sel === null) { sel = id; sfx.tap(); api.hint('Now tap a sign: ' + [...P.ops].join(' ') + '.'); render(); return; }
      if (sel === id) { sel = null; op = null; sfx.tap(); api.hint('Tap a tile to start.'); render(); return; }
      if (!op) { sel = id; sfx.tap(); api.hint('Now tap a sign: ' + [...P.ops].join(' ') + '.'); render(); return; }
      combine(sel, op, id);
    }
    function pickOp(o) {
      if (busy || finished) return;
      if (sel === null) { sfx.soft(); api.hint('First tap a number tile, then the sign.'); return; }
      op = op === o ? null : o; sfx.tap();
      if (op) api.hint(`Now tap another tile to ${o === '+' ? 'add it' : o === '−' ? 'take it away' : 'multiply'}.`);
      render();
    }
    function combine(ia, o, ib) {
      const A = tiles.find(t => t.id === ia), B = tiles.find(t => t.id === ib);
      const a = Math.max(A.v, B.v), b = Math.min(A.v, B.v), r = ntApply(a, o, b);
      if (o === '−' && r === 0) { slips++; sfx.soft(); wob(tilesEl); api.hint(`${a} − ${b} makes nothing. Try a different tile or sign.`); op = null; render(); return; }
      const pos = tiles.indexOf(A);
      hist.push({ a, op: o, b, r, before: tiles.slice() });
      tiles = tiles.filter(t => t !== A && t !== B);
      tiles.splice(Math.min(pos, tiles.length), 0, { v: r, id: uid++, fresh: true, made: true });
      sel = null; op = null; tip = null;
      tone(440 + hist.length * 70, .12, 'triangle', .12);
      render();
      if (r === puz.target) {
        busy = true; render(); sfx.good();
        round++; api.rounds(NT_ROUNDS, round);
        api.hint(`${a} ${o} ${b} = ${r}. ${cheer()} That’s the target!`);
        if (round >= NT_ROUNDS) { finished = true; api.later(() => api.done(starsFor(hints + slips, 0, 2)), 900); }
        else { if (round === 1) toast(cheer()); api.later(newRound, 1500); }
        return;
      }
      if (tiles.length < 2) api.hint(`Not quite: that makes ${r}, not ${puz.target}. Tap Undo to try another way.`);
      else api.hint(`${a} ${o} ${b} = ${r}. Keep going: tap a tile.`);
    }
    function undo() {
      if (busy || finished || !hist.length) return;
      tiles = hist.pop().before; sel = null; op = null; tip = null; sfx.tap();
      api.hint('Taken back. Tap a tile to try again.'); render();
    }
    function giveHint() {
      if (busy || finished) return;
      hints++; sfx.tap();
      let back = 0, step = null;
      for (;;) {
        const vals = tiles.map(t => t.v);
        // follow the generating solution where it still fits
        for (let i = puz.steps.length - 1; i >= 0 && !step; i--) {
          const s = puz.steps[i], ia = vals.indexOf(s.a), ib = vals.findIndex((v, k) => v === s.b && k !== ia);
          if (ia < 0 || ib < 0) continue;
          const rest = vals.filter((_, k) => k !== ia && k !== ib).concat(s.r);
          if (ntSolve(rest, puz.target, P.ops)) step = s;
        }
        if (!step) { const s = ntSolve(vals, puz.target, P.ops); if (s && s.length) step = s[0]; }
        if (step || !hist.length) break;
        tiles = hist.pop().before; back++;
      }
      if (!step) return;
      const A = tiles.find(t => t.v === step.a), B = tiles.find(t => t.v === step.b && t !== A);
      tip = { ta: A.id, tb: B.id, op: step.op }; sel = A.id; op = null;
      api.hint((back ? 'I took a step back. ' : '') + `Try ${step.a} ${step.op} ${step.b}: tap the sign, then the glowing tile.`);
      render();
      opsEl.querySelectorAll('.nt-op').forEach(b => b.classList.toggle('tip', b.dataset.op === step.op));
      tilesEl.querySelectorAll('.nt-t')[tiles.indexOf(B)].classList.add('tip');
    }
    newRound();
  }

  /* =========================================================
     4. SHAPE PACKING
     ========================================================= */
  register({ id: 'packing', cat: 'slide', order: 11, name: 'Shape Packing', icon: '📦', desc: 'Fit all the shapes into the box exactly', start: startPacking });

  function pkPlan(L) {
    const T = [null,
      { w: 3, h: 2, k: 2, max: 3, min: 3, rot: false },
      { w: 4, h: 2, k: 3, max: 4, min: 2, rot: false },
      { w: 3, h: 3, k: 3, max: 4, min: 2, rot: true },
      { w: 4, h: 3, k: 3, max: 5, min: 3, rot: true },
      { w: 4, h: 3, k: 4, max: 4, min: 2, rot: true },
      { w: 4, h: 4, k: 4, max: 5, min: 3, rot: true },
      { w: 5, h: 4, k: 5, max: 5, min: 3, rot: true }];
    if (L <= 7) return T[Math.max(1, L)];
    const opts = [{ w: 5, h: 4, k: 5, max: 5, min: 3 }, { w: 5, h: 5, k: 6, max: 5, min: 3 }, { w: 6, h: 4, k: 6, max: 5, min: 3 }];
    if (L >= 11) opts.push({ w: 6, h: 5, k: 7, max: 5, min: 3 }, { w: 6, h: 5, k: 7, max: 5, min: 3 });
    return Object.assign({ rot: true }, pick(opts));
  }
  const pkNorm = cells => { const mr = Math.min(...cells.map(x => x[0])), mc = Math.min(...cells.map(x => x[1])); return cells.map(([r, c]) => [r - mr, c - mc]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); };
  const pkRot = cells => pkNorm(cells.map(([r, c]) => [c, -r]));
  const pkFlip = cells => pkNorm(cells.map(([r, c]) => [r, -c]));
  function pkCut(P) {
    const { w, h, k } = P, N = w * h;
    const nb = i => { const r = Math.floor(i / w), c = i % w; return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < h && b < w).map(([a, b]) => a * w + b); };
    for (let t = 0; t < 4000; t++) {
      const own = new Array(N).fill(-1), size = new Array(k).fill(1);
      shuffle([...Array(N).keys()]).slice(0, k).forEach((c, i) => { own[c] = i; });
      for (;;) {
        const front = [];
        for (let i = 0; i < N; i++) if (own[i] < 0) nb(i).forEach(j => { if (own[j] >= 0 && size[own[j]] < P.max) front.push([i, own[j]]); });
        if (!front.length) break;
        const small = Math.min(...front.map(f => size[f[1]]));
        const [cell, p] = Math.random() < .7 ? pick(front.filter(f => size[f[1]] === small)) : pick(front);
        own[cell] = p; size[p]++;
      }
      if (own.some(x => x < 0) || size.some(s => s < P.min)) continue;
      return own;
    }
    return null;
  }
  R.p6 = Object.assign(R.p6 || {}, { pkCut, pkPlan, pkNorm, pkRot, pkFlip });

  function startPacking(L, api) {
    const P = pkPlan(L), { w, h } = P, N = w * h;
    let own = pkCut(P);
    if (!own) own = [...Array(N).keys()].map(i => Math.floor(i / w) < 1 ? 0 : 1);
    const cols = shuffle(PAL.slice());
    const pieces = [...new Set(own)].map((id, k) => {
      const abs = own.map((o, i) => o === id ? [Math.floor(i / w), i % w] : null).filter(Boolean);
      const sol = pkNorm(abs);
      let cells = sol;
      if (P.rot) { for (let t = randInt(4); t > 0; t--) cells = pkRot(cells); if (Math.random() < .4) cells = pkFlip(cells); }
      return { id: k, own: id, cells, c: cols[k % cols.length].c, s: cols[k % cols.length].s, placed: null, turned: false };
    });
    shuffle(pieces);
    let sel = null, preview = null, tries = 0, outline = false, finished = false;
    const grid = () => { const g = new Array(N).fill(null); pieces.forEach(p => { if (p.placed) p.placed.keys.forEach(i => { g[i] = p; }); }); return g; };

    api.hint('Tap a shape below, then tap the box where it should go. Fill the box exactly.');
    const wrap = el('div', 'p6-wrap');
    const box = el('div', 'pk-box'); box.style.setProperty('--w', w); box.style.setProperty('--h', h);
    const turnBtn = mkBtn('↻ Turn', 'c-sky', () => orient(pkRot));
    const flipBtn = mkBtn('⇋ Flip', 'c-grape', () => orient(pkFlip));
    const placeBtn = mkBtn('✓ Put in', 'c-leaf', () => { if (preview && preview.ok) place(); });
    const ctl = el('div', 'p6-ctl pk-ctl'); ctl.append(turnBtn, flipBtn, placeBtn);
    const tray = el('div', 'pk-tray');
    wrap.append(box, ctl, tray); api.stage.append(wrap);
    wrap.p6 = { pieces, own, w, h }; // read by automated tests only
    const cellEls = [];
    for (let i = 0; i < N; i++) { const b = el('button', 'pk-c'); b.type = 'button'; b.append(el('span')); b.onclick = () => tapCell(i); cellEls.push(b); box.append(b); }

    function render(fx = {}) {
      const g = grid(), sp = sel !== null ? pieces[sel] : null;
      const ghost = outline && sp ? own.map((o, i) => o === sp.own && !g[i]) : null;
      cellEls.forEach((b, i) => {
        const s = b.firstChild, p = g[i], r = Math.floor(i / w), c = i % w;
        s.className = p ? 'tile c-' + p.c : ghost && ghost[i] ? 'ghost' : '';
        s.textContent = p ? p.s : '';
        s.style.removeProperty('--c');
        if (fx.land && fx.land.includes(i)) s.classList.add('land');
        if (fx.win) s.classList.add('win');
        const line = (rr, cc) => rr >= 0 && cc >= 0 && rr < h && cc < w && own[rr * w + cc] !== own[i] ? 'rgba(255,246,200,.9)' : 'transparent';
        b.style.borderStyle = 'dashed';
        b.style.borderColor = outline ? [line(r - 1, c), line(r, c + 1), line(r + 1, c), line(r, c - 1)].join(' ') : 'transparent';
        b.setAttribute('aria-label', p ? 'Filled' : 'Empty square');
      });
      if (preview) preview.keys.forEach(i => {
        const s = cellEls[i].firstChild;
        if (preview.ok) { s.className = 'pv'; s.style.setProperty('--c', `var(--${sp.c})`); }
        else if (!g[i]) s.className = 'bad';
      });
      tray.innerHTML = '';
      pieces.forEach((p, k) => {
        if (p.placed) return;
        const b = el('button', 'pk-slot' + (sel === k ? ' sel' : '')); b.type = 'button';
        const hh = Math.max(...p.cells.map(x => x[0])) + 1, ww = Math.max(...p.cells.map(x => x[1])) + 1;
        const m = el('span', 'pk-mini c-' + p.c + (p.turned ? ' turn' : '')); p.turned = false;
        m.style.gridTemplateColumns = `repeat(${ww}, auto)`;
        for (let r = 0; r < hh; r++) for (let c = 0; c < ww; c++) m.append(el('i', p.cells.some(x => x[0] === r && x[1] === c) ? 'on' : ''));
        b.append(m); b.setAttribute('aria-label', `Shape of ${p.cells.length} squares`);
        b.onclick = () => pickPiece(k); tray.append(b);
      });
      turnBtn.disabled = flipBtn.disabled = sel === null || finished;
      placeBtn.disabled = !(preview && preview.ok);
    }
    function pickPiece(k) {
      if (finished) return;
      sfx.tap(); sel = sel === k ? null : k; preview = null;
      if (sel !== null) api.hint('Turn or flip it if you like, then tap the box where it should go.');
      render();
    }
    function orient(fn) {
      if (sel === null || finished) return;
      const p = pieces[sel]; p.cells = fn(p.cells); p.turned = true; tone(520, .07, 'triangle', .08);
      if (preview) aim(preview.at, true); else render();
    }
    function aim(i, quiet) {
      const g = grid(), cells = pieces[sel].cells, r = Math.floor(i / w), c = i % w;
      const fits = (r0, c0) => cells.every(([pr, pc]) => pr + r0 >= 0 && pc + c0 >= 0 && pr + r0 < h && pc + c0 < w && !g[(pr + r0) * w + pc + c0]);
      const cr = Math.round(Math.max(...cells.map(x => x[0])) / 2), cc = Math.round(Math.max(...cells.map(x => x[1])) / 2);
      let best = null;
      cells.forEach(([pr, pc]) => {
        const r0 = r - pr, c0 = c - pc; if (!fits(r0, c0)) return;
        const d = Math.abs(r0 - (r - cr)) + Math.abs(c0 - (c - cc));
        if (!best || d < best.d) best = { r0, c0, d };
      });
      if (best) preview = { ok: true, r0: best.r0, c0: best.c0, at: i };
      else preview = { ok: false, at: i, r0: clamp(r - cr, 0, Math.max(0, h - 1 - Math.max(...cells.map(x => x[0])))), c0: clamp(c - cc, 0, Math.max(0, w - 1 - Math.max(...cells.map(x => x[1])))) };
      preview.keys = cells.map(([pr, pc]) => (pr + preview.r0) * w + pc + preview.c0).filter(k => k >= 0 && k < N);
      if (preview.ok) { tone(500, .06, 'triangle', .06); api.hint('Tap the shadow again, or ✓ Put in.'); }
      else if (!quiet) { miss('It won’t fit just there. Try turning it, or another spot.'); }
      else api.hint('It won’t fit just there. Keep turning, or tap another spot.');
      render();
    }
    function miss(text) {
      tries++; sfx.soft(); api.hint(text);
      if (tries >= 3 && !outline) { outline = true; api.hint(text + ' Faint lines now show where the shapes go.'); }
    }
    function tapCell(i) {
      if (finished) return;
      const g = grid();
      if (sel === null) {
        if (g[i]) { // lift a placed piece back out
          const p = g[i]; p.placed = null; sel = pieces.indexOf(p); preview = null; tries++; sfx.tap();
          const first = tries >= 3 && !outline; if (tries >= 3) outline = true;
          api.hint('Lifted out. Turn it, or tap where it should go.' + (first ? ' Faint lines now show where the shapes go.' : '')); render(); return;
        }
        api.hint('First tap a shape below, then tap the box.'); sfx.soft(); return;
      }
      if (preview && preview.ok && preview.keys.includes(i)) { place(); return; }
      aim(i);
    }
    function place() {
      const p = pieces[sel]; p.placed = { keys: preview.keys }; const landed = preview.keys;
      sel = null; preview = null;
      const done = pieces.every(x => x.placed);
      tone(392 + pieces.filter(x => x.placed).length * 60, .12, 'triangle', .12);
      render({ land: landed });
      if (done) {
        finished = true; sfx.good(); render({ win: true });
        api.hint(cheer() + ' The box is packed exactly.');
        api.later(() => api.done(starsFor(tries, 2, 5)), 800);
        return;
      }
      api.hint('Good. Tap the next shape. Tap a shape in the box to lift it out again.');
    }
    render();
  }
})();
