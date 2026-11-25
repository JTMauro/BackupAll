/* Recall: Logic 5 and two word games (Camping Trip, Boats in the Bay, Cross Sums, Word Chain, Hidden Words) */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor, store } = R;
  const TEST = !!window.__recallTest; // test hooks only exist when a test harness sets this before load

  R.css(`
/* ---- shared (l5-) ---- */
.l5-bar{display:flex; flex-wrap:wrap; justify-content:center; gap:12px 14px; margin-top:20px}
.l5-bar .btn{min-width:130px}
.l5-info{text-align:center; font:600 1.25rem/1.3 var(--display); margin:0 0 14px; color:var(--on-table)}
.l5-info b{color:var(--sun)}
.l5-clue{display:grid; place-items:center; font:700 max(20px, calc(var(--cs) * .46))/1 var(--display); color:#fff; border-radius:12px; transition:background .25s, color .25s; position:relative}
.l5-clue.l5-ok{background:rgba(255,255,255,.22); color:#EFFFE4}
.l5-clue.l5-ok::after{content:'✓'; position:absolute; right:2px; top:0; font-size:.5em; color:#EFFFE4}
.l5-clue.l5-over{background:var(--sun); color:var(--ink); animation:bounceIn .25s}

/* ---- Camping Trip (tn-) ---- */
.tn-board{display:grid; gap:var(--g); margin:0 auto; width:max-content; padding:var(--g); border-radius:20px; background:#4E7E2E; box-shadow:0 7px 0 #335A1B, 0 14px 24px rgba(0,0,0,.3)}
.tn-cell{width:var(--cs); height:var(--cs); border:0; padding:0; border-radius:18%; cursor:pointer; display:grid; place-items:center; font-size:calc(var(--cs) * .6); line-height:1; position:relative}
.tn-cell.tile{box-shadow:inset 0 -4px 0 rgba(0,0,0,.16), inset 0 2px 0 rgba(255,255,255,.45), 0 3px 0 var(--d)}
.tn-empty{background:#B9E58C; box-shadow:inset 0 -4px 0 rgba(0,0,0,.12), inset 0 2px 0 rgba(255,255,255,.45)}
.tn-grass{background:#86C556; box-shadow:inset 0 3px 5px rgba(0,0,0,.2)}
.tn-grass::before{content:''; width:24%; height:24%; border-radius:50%; background:rgba(255,255,255,.8)}
.tn-tree{cursor:default}
.tn-tent{animation:bounceIn .25s}
.tn-bad{outline:4px solid #fff; outline-offset:-3px}
.tn-fixed{cursor:default}
.tn-fixed::after{content:''; position:absolute; right:6%; bottom:6%; width:16%; height:16%; border-radius:50%; background:#fff; box-shadow:0 0 0 2px rgba(0,0,0,.2)}
.tn-win .tn-tent, .tn-win .tn-tree{animation:bounceIn .5s backwards}
.tn-key{display:flex; flex-wrap:wrap; justify-content:center; gap:6px 16px; margin:14px 0 0; font:600 1.1rem var(--display); color:var(--on-table-soft)}
.tn-key span{display:inline-flex; align-items:center; gap:6px}
.tn-key i{display:inline-grid; place-items:center; width:30px; height:30px; border-radius:8px; font-style:normal; font-size:20px}

/* ---- Boats in the Bay (bt-) ---- */
.bt-board{display:grid; gap:var(--g); margin:0 auto; width:max-content; padding:var(--g); border-radius:20px; background:#175A85; box-shadow:0 7px 0 #0D3C5C, 0 14px 24px rgba(0,0,0,.3)}
.bt-cell{width:var(--cs); height:var(--cs); border:0; padding:0; border-radius:16%; cursor:pointer; display:grid; place-items:center; position:relative; font:700 calc(var(--cs) * .5)/1 var(--display)}
.bt-unk{background:#D7EEFF; box-shadow:inset 0 -4px 0 rgba(0,0,0,.12), inset 0 2px 0 rgba(255,255,255,.5)}
.bt-water{background:#4AA8E8; color:rgba(255,255,255,.85); box-shadow:inset 0 3px 6px rgba(0,0,0,.22)}
.bt-boat{background:linear-gradient(160deg, rgba(255,255,255,.4), rgba(255,255,255,0) 50%), var(--coral); box-shadow:inset 0 -4px 0 rgba(0,0,0,.18), 0 3px 0 var(--coral-d); animation:bounceIn .22s}
.bt-boat::before{content:''; width:26%; height:26%; border-radius:50%; background:rgba(255,255,255,.7)}
.bt-bad{background:linear-gradient(160deg, rgba(255,255,255,.4), rgba(255,255,255,0) 50%), var(--berry); outline:4px solid #fff; outline-offset:-3px}
.bt-fixed{cursor:default}
.bt-fixed::after{content:''; position:absolute; inset:10%; border:3px dashed rgba(255,255,255,.7); border-radius:inherit}
.bt-fleet{display:flex; flex-wrap:wrap; justify-content:center; gap:10px 16px; margin:14px auto 0; max-width:520px}
.bt-ship{display:flex; gap:3px; padding:5px; border-radius:12px; background:rgba(0,0,0,.18); transition:background .3s}
.bt-ship i{width:24px; height:24px; border-radius:6px; background:var(--coral); box-shadow:inset 0 -3px 0 rgba(0,0,0,.18)}
.bt-ship i:first-child{border-radius:50% 6px 6px 50%}
.bt-ship i:last-child{border-radius:6px 50% 50% 6px}
.bt-ship i:only-child{border-radius:50%}
.bt-ship.bt-got{background:var(--leaf)}
.bt-ship.bt-got i{background:#fff}
.bt-win .bt-boat{animation:bounceIn .5s backwards}

/* ---- Cross Sums (ks-) ---- */
.ks-board{display:grid; gap:var(--g); margin:0 auto; width:max-content; padding:var(--g); border-radius:20px; background:#26343E; box-shadow:0 7px 0 #141D24, 0 14px 24px rgba(0,0,0,.3)}
.ks-blk{width:var(--cs); height:var(--cs); border-radius:14%; background:#3A4A55; position:relative; overflow:hidden}
.ks-clue{background:linear-gradient(to top right, transparent calc(50% - 1.5px), rgba(255,255,255,.45) 50%, transparent calc(50% + 1.5px)), #3A4A55}
.ks-a, .ks-d{position:absolute; font:700 max(18px, calc(var(--cs) * .36))/1 var(--display); color:#fff; transition:color .25s}
.ks-a{top:9%; right:9%}
.ks-d{bottom:9%; left:9%}
.ks-a.ks-ok, .ks-d.ks-ok{color:#8BF0AE}
.ks-a.ks-bad, .ks-d.ks-bad{color:var(--sun)}
.ks-cell{width:var(--cs); height:var(--cs); border:0; padding:0; border-radius:14%; background:var(--card); color:var(--sky-d); cursor:pointer;
  font:700 calc(var(--cs) * .6)/1 var(--display); display:grid; place-items:center; box-shadow:inset 0 -4px 0 rgba(0,0,0,.1)}
.ks-cell.ks-peer{background:#FFEFC9}
.ks-cell.ks-sel{background:var(--sun); box-shadow:inset 0 -4px 0 var(--sun-d), 0 0 0 3px #fff}
.ks-cell.ks-giv{color:var(--ink); background:#E9DDC5; cursor:default}
.ks-cell.ks-wrong{color:var(--coral-d); background:#FFD9CC}
.ks-cell.ks-new{animation:bounceIn .25s}
.ks-win .ks-cell{animation:bounceIn .45s backwards; background:var(--good-bg)}
.ks-pad{display:grid; grid-template-columns:repeat(5, minmax(56px, 1fr)); gap:10px; max-width:440px; margin:18px auto 0}
.ks-key{min-height:60px; font-size:1.9rem; padding:0}
.ks-key.ks-wide{grid-column:span 5; font-size:1.2rem}

/* ---- Word Chain (wc-) ---- */
.wc-wrap{max-width:640px; margin:0 auto; display:grid; gap:16px}
.wc-chain{display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:8px 4px; min-height:44px}
.wc-link{display:inline-flex; align-items:center; gap:5px; padding:5px 10px; border-radius:14px; background:rgba(255,255,255,.16); font:600 1.2rem/1.1 var(--display); color:#fff; animation:bounceIn .3s backwards}
.wc-link b{color:var(--sun)}
.wc-arrow{color:var(--on-table-soft); font:700 1.3rem var(--display)}
.wc-now{background:var(--card); color:var(--ink); border-radius:26px; padding:14px 12px; display:grid; justify-items:center; gap:10px; box-shadow:0 7px 0 var(--card-edge), 0 14px 26px rgba(0,0,0,.28)}
.wc-pic{font-size:3.2rem; line-height:1}
.wc-letters{display:flex; gap:5px; justify-content:center}
.wc-l{width:var(--ls); height:calc(var(--ls) * 1.12); font:700 calc(var(--ls) * .62)/1 var(--display); border-radius:22%}
.wc-l.wc-last{animation:wcBob 1.3s ease-in-out infinite}
@keyframes wcBob{50%{translate:0 -6px}}
.wc-choices{display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:14px}
.wc-ch{flex-direction:column; min-height:100px; gap:4px; font-size:1.45rem; padding:.4em .3em}
.wc-ch .wc-e{font-size:2.3rem; line-height:1}
.wc-ch.wc-right{--c:var(--leaf); --d:var(--leaf-d)}
.wc-ch.wc-nope{opacity:.32; pointer-events:none}

/* ---- Hidden Words (hw-) ---- */
.hw-wrap{max-width:760px; margin:0 auto; display:grid; gap:18px}
.hw-cat{justify-self:center; display:flex; align-items:center; gap:10px; padding:8px 18px; border-radius:18px; background:var(--card); color:var(--ink); font:600 1.3rem var(--display); box-shadow:0 5px 0 var(--card-edge)}
.hw-cat span{font-size:1.8rem; line-height:1}
.hw-sent{display:flex; flex-wrap:wrap; justify-content:center; gap:14px 14px; padding:16px 8px; border-radius:24px; background:rgba(0,0,0,.18); box-shadow:inset 0 4px 10px rgba(0,0,0,.2)}
.hw-word{display:flex; gap:3px; align-items:flex-end}
.hw-t{width:var(--ts); height:calc(var(--ts) * 1.15); font:700 calc(var(--ts) * .6)/1 var(--display); border-radius:22%; cursor:pointer; padding:0; transition:translate .12s}
.hw-t.hw-a{--c:var(--sun); --d:var(--sun-d); translate:0 -7px}
.hw-t.hw-found{--c:var(--leaf); --d:var(--leaf-d); animation:bounceIn .4s backwards; color:#fff}
.hw-t.hw-glow{outline:4px dashed #fff; outline-offset:3px}
.hw-p{font:700 calc(var(--ts) * .7)/1 var(--display); color:#fff; padding-bottom:2px}
.hw-sent.hw-done .hw-t:not(.hw-found){opacity:.4}
.hw-found-word{justify-self:center; font:700 1.8rem var(--display); color:var(--sun); letter-spacing:.08em; min-height:1.3em; animation:bounceIn .35s}
`);

  register({ id: 'tents', cat: 'logic', order: 21, name: 'Camping Trip', icon: '⛺', desc: 'Pitch one tent beside every tree', start: startTents });
  register({ id: 'boats', cat: 'logic', order: 22, name: 'Boats in the Bay', icon: '⛵', desc: 'Find the hidden boats from the numbers', start: startBoats });
  register({ id: 'crosssums', cat: 'logic', order: 23, name: 'Cross Sums', icon: '➗', desc: 'Fill in numbers that add up to the clues', start: startCross });
  register({ id: 'chain', cat: 'words', order: 13, name: 'Word Chain', icon: '🔗', desc: 'Each word starts with the last letter', gentle: true, start: startChain });
  register({ id: 'hiddenwords', cat: 'words', order: 14, name: 'Hidden Words', icon: '🔍', desc: 'Spot the word hiding inside a sentence', start: startHidden });

  /* ---------- shared bits ---------- */
  const stageW = api => Math.max(280, Math.min(api.stage.clientWidth || 340, 1000));
  const mkBtn = (cls, html, fn) => { const b = el('button', cls, html); b.type = 'button'; if (fn) b.onclick = fn; return b; };
  const now = () => (window.performance ? performance.now() : Date.now());
  const NB = {};
  function nbs(n) { // cached 4- and 8-neighbour lists for an n x n board
    if (NB[n]) return NB[n];
    const N = n * n, n4 = [], n8 = [];
    for (let i = 0; i < N; i++) {
      const r = (i / n) | 0, c = i % n, a = [], b = [];
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
        b.push(rr * n + cc); if (!dr || !dc) a.push(rr * n + cc);
      }
      n4.push(a); n8.push(b);
    }
    return (NB[n] = { n4, n8 });
  }
  // biggest square board (up to want) whose cells stay at least min px across, with a clue column
  const fitSq = (W, want, min, gap, clue) => { let n = want; while (n > 5 && n * min + (n + 2) * gap + clue > W) n--; return n; };
  const sizeCells = (W, n, gap, clueF, max) => Math.floor(Math.min(max, (W - (n + 2) * gap) / (n + clueF)));

  // a board with column clues on top and row clues on the left
  function clueBoard(cls, n, cs, g, R, C, mkCell) {
    const board = el('div', cls);
    const cw = Math.round(cs * .72);
    board.style.cssText = `--g:${g}px; --cs:${cs}px; grid-template-columns:${cw}px repeat(${n}, ${cs}px); grid-template-rows:${cw}px repeat(${n}, ${cs}px)`;
    board.append(el('span'));
    const colC = C.map(v => { const s = el('span', 'l5-clue', String(v)); board.append(s); return s; });
    const rowC = [], cells = [];
    for (let r = 0; r < n; r++) {
      const s = el('span', 'l5-clue', String(R[r])); board.append(s); rowC.push(s);
      for (let c = 0; c < n; c++) { const b = mkCell(r * n + c); board.append(b); cells.push(b); }
    }
    function marks(have) { // have: {r:[], c:[]}
      rowC.forEach((s, r) => { s.classList.toggle('l5-ok', have.r[r] === R[r]); s.classList.toggle('l5-over', have.r[r] > R[r]); });
      colC.forEach((s, c) => { s.classList.toggle('l5-ok', have.c[c] === C[c]); s.classList.toggle('l5-over', have.c[c] > C[c]); });
    }
    return { board, cells, marks };
  }
  const lineCounts = (n, isOn) => { const r = Array(n).fill(0), c = Array(n).fill(0); for (let i = 0; i < n * n; i++) if (isOn(i)) { r[(i / n) | 0]++; c[i % n]++; } return { r, c }; };

  /* =========================================================
     1. CAMPING TRIP (tents and trees)
     ========================================================= */
  function genTents(n, k) {
    const N = n * n, { n4, n8 } = nbs(n);
    for (let t = 0; t < 300; t++) {
      const tent = new Uint8Array(N), tree = new Uint8Array(N); let placed = 0;
      for (const c of shuffle([...Array(N).keys()])) {
        if (placed >= k) break;
        if (tree[c] || tent[c] || n8[c].some(j => tent[j])) continue;
        const opts = n4[c].filter(j => !tent[j] && !tree[j]);
        if (!opts.length) continue;
        tent[c] = 1; tree[pick(opts)] = 1; placed++;
      }
      if (placed === k) return { tent, tree };
    }
    return null;
  }
  // counts tent layouts (up to limit) that fit the trees and numbers; given: 1 tent, 2 grass
  function solveTents(n, tree, R, C, given, limit = 2) {
    const N = n * n, { n4, n8 } = nbs(n), cand = [], isC = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (!tree[i] && n4[i].some(j => tree[j])) { cand.push(i); isC[i] = 1; }
    const st = new Int8Array(N), rc = new Int32Array(n), cc = new Int32Array(n), rr = new Int32Array(n), cr = new Int32Array(n);
    cand.forEach(i => { rr[(i / n) | 0]++; cr[i % n]++; });
    const trees = []; for (let i = 0; i < N; i++) if (tree[i]) trees.push(i);
    const tN = {}; trees.forEach(t => { tN[t] = n4[t].filter(j => isC[j]); });
    const adjT = []; for (let i = 0; i < N; i++) adjT.push(n4[i].filter(j => tree[j]));
    let count = 0; const sols = [];
    for (let r = 0; r < n; r++) if (rr[r] < R[r]) return { count: 0, sols };
    for (let c = 0; c < n; c++) if (cr[c] < C[c]) return { count: 0, sols };
    function matchOK() {
      const owner = new Map();
      const tryT = (t, seen) => {
        for (const j of tN[t]) {
          if (st[j] !== 1 || seen.has(j)) continue; seen.add(j);
          if (!owner.has(j) || tryT(owner.get(j), seen)) { owner.set(j, t); return true; }
        }
        return false;
      };
      return trees.every(t => tryT(t, new Set()));
    }
    function rec(x) {
      if (count >= limit) return;
      if (x === cand.length) {
        for (let r = 0; r < n; r++) if (rc[r] !== R[r]) return;
        for (let c = 0; c < n; c++) if (cc[c] !== C[c]) return;
        if (!matchOK()) return;
        count++; sols.push(cand.filter(i => st[i] === 1));
        return;
      }
      const i = cand[x], r = (i / n) | 0, c = i % n, g = given ? given[i] : 0;
      rr[r]--; cr[c]--;
      if (g !== 2 && rc[r] < R[r] && cc[c] < C[c] && !n8[i].some(j => st[j] === 1)) {
        st[i] = 1; rc[r]++; cc[c]++;
        rec(x + 1);
        rc[r]--; cc[c]--;
      }
      if (g !== 1) {
        st[i] = 2;
        if (rc[r] + rr[r] >= R[r] && cc[c] + cr[c] >= C[c] && adjT[i].every(t => tN[t].some(j => st[j] !== 2))) rec(x + 1);
      }
      st[i] = 0; rr[r]++; cr[c]++;
    }
    rec(0);
    return { count, sols };
  }
  function makeTents(n, k) {
    const N = n * n, t0 = now();
    let P = null, R, C, given = null;
    for (let a = 0; a < 60; a++) {
      P = genTents(n, k);
      R = Array(n).fill(0); C = Array(n).fill(0);
      for (let i = 0; i < N; i++) if (P.tent[i]) { R[(i / n) | 0]++; C[i % n]++; }
      if (solveTents(n, P.tree, R, C, null).count === 1) return { n, k, ...P, R, C, given: new Int8Array(N) };
      if (now() - t0 > 160) break;
    }
    // not unique yet: pin down a few squares (as pre-placed tents or grass) until it is
    given = new Int8Array(N);
    for (let guard = 0; guard < N; guard++) {
      const res = solveTents(n, P.tree, R, C, given);
      if (res.count === 1) break;
      const alt = new Set(res.sols.find(s => s.length !== k || s.some(i => !P.tent[i])) || []);
      const diff = [...Array(N).keys()].filter(i => !P.tree[i] && !given[i] && (!!P.tent[i]) !== alt.has(i));
      const tentsFirst = diff.filter(i => P.tent[i]);
      const d = pick(tentsFirst.length ? tentsFirst : diff);
      given[d] = P.tent[d] ? 1 : 2;
    }
    return { n, k, ...P, R, C, given };
  }
  function startTents(L, api) {
    const T = [[5, 4], [5, 5], [6, 6], [6, 7], [7, 8], [7, 9], [8, 10], [8, 11], [8, 12]];
    const [n0, k0] = T[Math.min(L, T.length) - 1];
    const W = Math.min(stageW(api), 620), g = 4;
    const n = fitSq(W, n0, 36, g, 30);
    const k = n === n0 ? k0 + (L > T.length ? randInt(2) : 0) : Math.round(k0 * n * n / (n0 * n0));
    const P = makeTents(n, k), N = n * n;
    const cs = sizeCells(W, n, g, .72, 66);
    const p = new Int8Array(N); // 0 empty, 1 grass, 2 tent
    for (let i = 0; i < N; i++) if (P.given[i]) p[i] = P.given[i] === 1 ? 2 : 1;
    let mistakes = 0, hints = 0, finished = false;
    const base = 'Put one tent ⛺ next to each tree 🌳 (above, below or beside). Tents never touch, not even at corners. The numbers say how many tents are in each row and column.';
    api.hint(base);
    const info = el('p', 'l5-info', `Trees: <b>${k}</b> · Tap a square: grass, then tent, then clear`);
    const B = clueBoard('tn-board', n, cs, g, P.R, P.C, i => mkBtn('tn-cell', '', () => tap(i)));
    const key = el('div', 'tn-key', '<span><i class="tn-cell tn-grass" style="--cs:30px"></i>No tent here</span><span><i class="tile c-orange">⛺</i>Tent</span>');
    const bar = el('div', 'l5-bar');
    bar.append(mkBtn('btn c-sun', '💡 Hint', hint));
    api.stage.append(info, B.board, key, bar);
    const { n8 } = nbs(n);
    const bad = i => p[i] === 2 && n8[i].some(j => p[j] === 2);
    function render(pop) {
      B.cells.forEach((b, i) => {
        const fixed = !!P.given[i];
        if (P.tree[i]) { b.className = 'tn-cell tn-tree tile c-leaf'; b.textContent = '🌳'; b.setAttribute('aria-label', 'Tree'); return; }
        if (p[i] === 2) { b.className = 'tn-cell tile ' + (bad(i) ? 'c-coral tn-bad' : 'c-orange') + (pop === i ? ' tn-tent' : ''); b.textContent = '⛺'; b.setAttribute('aria-label', 'Tent'); }
        else if (p[i] === 1) { b.className = 'tn-cell tn-grass'; b.textContent = ''; b.setAttribute('aria-label', 'No tent'); }
        else { b.className = 'tn-cell tn-empty'; b.textContent = ''; b.setAttribute('aria-label', 'Empty square'); }
        if (fixed) b.classList.add('tn-fixed');
      });
      B.marks(lineCounts(n, i => p[i] === 2));
    }
    function tap(i) {
      if (finished || P.tree[i] || P.given[i]) return;
      p[i] = (p[i] + 1) % 3;
      if (p[i] === 2) {
        if (bad(i)) { mistakes++; sfx.soft(); wob(B.cells[i]); api.hint('Oops, tents can’t touch each other, not even at the corners. Tap again to move it.'); }
        else { tone(520, .12, 'triangle', .11); api.hint(base); }
      } else sfx.tap();
      render(i);
      check();
    }
    function check() {
      let ok = true, tents = 0;
      for (let i = 0; i < N; i++) { if (p[i] === 2) tents++; if ((p[i] === 2) !== !!P.tent[i]) ok = false; }
      if (ok) {
        finished = true; B.board.classList.add('tn-win'); render();
        sfx.good(); toast(cheer()); api.hint('Every tent is up. Happy camping!');
        api.done(starsFor(mistakes + hints, 1, 3));
      } else if (tents === k) api.hint('All the tents are up, but one is not quite right. Check the numbers, or tap Hint.');
    }
    function hint() {
      if (finished) return;
      let d = -1;
      for (let i = 0; i < N && d < 0; i++) if (p[i] === 2 && !P.tent[i]) d = i;
      if (d < 0) { const miss = [...Array(N).keys()].filter(i => P.tent[i] && p[i] !== 2); d = pick(miss); }
      hints++; p[d] = P.tent[d] ? 2 : 1; P.given[d] = P.tent[d] ? 1 : 2;
      sfx.tap(); render(d); wob(B.cells[d]);
      api.hint(P.tent[d] ? 'Here is a tent for you.' : 'That square has no tent, so it is grass now.');
      check();
    }
    render();
    if (TEST) api.stage.__auto = () => { for (let i = 0; i < N; i++) if (!P.tree[i] && !P.given[i]) { const want = P.tent[i] ? 2 : 1; let s = 0; while (p[i] !== want && s++ < 3) B.cells[i].click(); } };
    if (TEST) api.stage.__info = () => ({ n, k, unique: solveTents(n, P.tree, P.R, P.C, P.given).count === 1, givens: [...P.given].filter(Boolean).length });
  }

  /* =========================================================
     2. BOATS IN THE BAY (battleship solitaire)
     ========================================================= */
  const POSC = {};
  function boatPositions(n, len) {
    const key = n + ':' + len; if (POSC[key]) return POSC[key];
    const out = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (c + len <= n) out.push([...Array(len)].map((_, k) => r * n + c + k));
      if (len > 1 && r + len <= n) out.push([...Array(len)].map((_, k) => (r + k) * n + c));
    }
    return (POSC[key] = out);
  }
  function placeFleet(n, fleet) {
    const N = n * n, { n8 } = nbs(n);
    for (let t = 0; t < 400; t++) {
      const boat = new Uint8Array(N), block = new Uint8Array(N); let ok = true;
      for (const len of fleet) {
        const opts = boatPositions(n, len).filter(cs => cs.every(i => !block[i]));
        if (!opts.length) { ok = false; break; }
        const cs = pick(opts);
        cs.forEach(i => { boat[i] = 1; block[i] = 1; n8[i].forEach(j => { block[j] = 1; }); });
      }
      if (ok) return boat;
    }
    return null;
  }
  // counts boat layouts (up to limit) matching the numbers and givens (1 water, 2 boat)
  function solveBoats(n, fleet, R, C, given, limit = 2, budget = 400000) {
    const N = n * n, { n8 } = nbs(n);
    const block = new Uint8Array(N), occ = new Uint8Array(N), rc = new Int32Array(n), cc = new Int32Array(n);
    const gBoat = [], sols = []; for (let i = 0; i < N; i++) if (given[i] === 2) gBoat.push(i);
    let count = 0, steps = 0;
    const POS = {}; fleet.forEach(len => { POS[len] = boatPositions(n, len); });
    function feasible() {
      for (const i of gBoat) if (!occ[i] && block[i]) return false;
      for (let r = 0; r < n; r++) {
        const need = R[r] - rc[r]; if (!need) continue;
        let av = 0; for (let c = 0; c < n; c++) { const i = r * n + c; if (!block[i] && given[i] !== 1) av++; }
        if (av < need) return false;
      }
      for (let c = 0; c < n; c++) {
        const need = C[c] - cc[c]; if (!need) continue;
        let av = 0; for (let r = 0; r < n; r++) { const i = r * n + c; if (!block[i] && given[i] !== 1) av++; }
        if (av < need) return false;
      }
      return true;
    }
    function put(cs, d) { cs.forEach(i => { occ[i] += d; rc[(i / n) | 0] += d; cc[i % n] += d; block[i] += d; n8[i].forEach(j => { block[j] += d; }); }); }
    function rec(b, minIdx) {
      if (count >= limit || ++steps > budget) return;
      if (b === fleet.length) {
        for (let r = 0; r < n; r++) if (rc[r] !== R[r]) return;
        for (let c = 0; c < n; c++) if (cc[c] !== C[c]) return;
        if (gBoat.some(i => !occ[i])) return;
        count++; sols.push(Uint8Array.from(occ)); return;
      }
      const len = fleet[b], list = POS[len], start = b > 0 && fleet[b - 1] === len ? minIdx : 0;
      for (let p = start; p < list.length; p++) {
        const cs = list[p];
        let ok = true;
        for (const i of cs) if (block[i] || given[i] === 1) { ok = false; break; }
        if (!ok) continue;
        put(cs, 1);
        let fits = true;
        for (const i of cs) if (rc[(i / n) | 0] > R[(i / n) | 0] || cc[i % n] > C[i % n]) { fits = false; break; }
        if (fits && feasible()) rec(b + 1, p + 1);
        put(cs, -1);
        if (count >= limit || steps > budget) return;
      }
    }
    rec(0, 0);
    return { count, sols, exhausted: steps > budget };
  }
  function makeBoats(n, fleet, g0) {
    const N = n * n;
    for (let a = 0; a < 20; a++) {
      const boat = placeFleet(n, fleet); if (!boat) continue;
      const R = Array(n).fill(0), C = Array(n).fill(0);
      for (let i = 0; i < N; i++) if (boat[i]) { R[(i / n) | 0]++; C[i % n]++; }
      const given = new Int8Array(N);
      // a few starting clues, mostly boat parts
      const bs = shuffle([...Array(N).keys()].filter(i => boat[i])), ws = shuffle([...Array(N).keys()].filter(i => !boat[i]));
      for (let k = 0; k < g0; k++) { if (k % 3 === 2 && ws.length) given[ws.pop()] = 1; else if (bs.length) given[bs.pop()] = 2; }
      let ok = false;
      for (let guard = 0; guard < N; guard++) {
        const res = solveBoats(n, fleet, R, C, given);
        if (res.count === 1 && !res.exhausted) { ok = true; break; }
        let d;
        const alt = res.sols.find(s => s.some((v, i) => !!v !== !!boat[i]));
        if (alt) {
          const diff = [...Array(N).keys()].filter(i => !given[i] && !!alt[i] !== !!boat[i]);
          const bd = diff.filter(i => boat[i]); d = pick(bd.length ? bd : diff);
        } else { // search ran long: give away a boat part to narrow it
          const free = [...Array(N).keys()].filter(i => !given[i] && boat[i]); if (!free.length) break; d = pick(free);
        }
        given[d] = boat[d] ? 2 : 1;
      }
      if (ok) return { n, fleet, boat, R, C, given };
    }
    return null;
  }
  function startBoats(L, api) {
    const T = [[6, [3, 2, 1, 1], 4], [6, [3, 2, 2, 1], 3], [6, [3, 2, 2, 1, 1], 3], [7, [3, 2, 2, 1, 1, 1], 3], [7, [3, 3, 2, 2, 1, 1], 2],
      [7, [4, 3, 2, 2, 1, 1], 2], [8, [3, 3, 2, 2, 2, 1, 1], 2], [8, [4, 3, 2, 2, 1, 1, 1], 2], [8, [4, 3, 3, 2, 2, 1, 1], 1]];
    let [n, fleet, g0] = T[Math.min(L, T.length) - 1];
    const W = Math.min(stageW(api), 620), g = 4;
    const nf = fitSq(W, n, 36, g, 30);
    if (nf < n) { n = nf; fleet = n === 6 ? (L >= 3 ? [3, 2, 2, 1, 1] : [3, 2, 1, 1]) : (L >= 7 ? [4, 3, 2, 2, 1, 1] : [3, 3, 2, 2, 1, 1]); }
    if (L > T.length) g0 = randInt(2) + 1;
    fleet = fleet.slice().sort((a, b) => b - a);
    const P = makeBoats(n, fleet, g0) || makeBoats(6, [3, 2, 1, 1], 4);
    n = P.n; fleet = P.fleet;
    const N = n * n, { n4, n8 } = nbs(n), total = fleet.reduce((a, b) => a + b, 0);
    const cs = sizeCells(W, n, g, .72, 64);
    const p = new Int8Array(N); // 0 unknown, 1 water, 2 boat
    for (let i = 0; i < N; i++) if (P.given[i]) p[i] = P.given[i];
    let mistakes = 0, hints = 0, finished = false;
    const base = 'Find the hidden boats. The numbers say how many boat squares are in each row and column. Boats never touch, not even at corners.';
    api.hint(base);
    const info = el('p', 'l5-info', 'Tap a square: water, then boat, then clear');
    const B = clueBoard('bt-board', n, cs, g, P.R, P.C, i => mkBtn('bt-cell', '', () => tap(i)));
    const fleetBox = el('div', 'bt-fleet');
    const ships = fleet.map(len => { const s = el('div', 'bt-ship', '<i></i>'.repeat(len)); fleetBox.append(s); return s; });
    const bar = el('div', 'l5-bar');
    bar.append(mkBtn('btn c-sun', '💡 Hint', hint));
    api.stage.append(info, B.board, fleetBox, bar);
    const bad = i => p[i] === 2 && n8[i].some(j => p[j] === 2 && !n4[i].includes(j));
    function shape(i) { // round the open ends of a boat (given parts show their real shape)
      const r = (i / n) | 0, c = i % n, on = P.given[i] ? (j => !!P.boat[j]) : (j => p[j] === 2);
      const U = r > 0 && on(i - n), D = r < n - 1 && on(i + n), Lf = c > 0 && on(i - 1), Rt = c < n - 1 && on(i + 1);
      const rd = (a, b) => (a || b) ? '14%' : '50%';
      return `${rd(U, Lf)} ${rd(U, Rt)} ${rd(D, Rt)} ${rd(D, Lf)}`;
    }
    function render(pop) {
      B.cells.forEach((b, i) => {
        b.style.borderRadius = '';
        if (p[i] === 2) { b.className = 'bt-cell ' + (bad(i) ? 'bt-bad' : 'bt-boat'); b.style.borderRadius = shape(i); b.textContent = ''; b.setAttribute('aria-label', 'Boat'); }
        else if (p[i] === 1) { b.className = 'bt-cell bt-water'; b.textContent = '〰'; b.setAttribute('aria-label', 'Water'); }
        else { b.className = 'bt-cell bt-unk'; b.textContent = ''; b.setAttribute('aria-label', 'Unknown square'); }
        if (P.given[i]) b.classList.add('bt-fixed');
      });
      B.marks(lineCounts(n, i => p[i] === 2));
      // tick off finished boats in the fleet list
      const seen = new Uint8Array(N), lens = [];
      for (let i = 0; i < N; i++) {
        if (p[i] !== 2 || seen[i]) continue;
        const q = [i], comp = []; seen[i] = 1;
        while (q.length) { const x = q.pop(); comp.push(x); n8[x].forEach(j => { if (p[j] === 2 && !seen[j]) { seen[j] = 1; q.push(j); } }); }
        const rows = new Set(comp.map(x => (x / n) | 0)), cols = new Set(comp.map(x => x % n));
        const sealed = comp.every(x => n4[x].every(j => p[j] !== 0));
        if (sealed && (rows.size === 1 || cols.size === 1) && comp.length === Math.max(rows.size, cols.size)) lens.push(comp.length);
      }
      const pool = lens;
      ships.forEach((s, k) => { const j = pool.indexOf(fleet[k]); const got = j >= 0; if (got) pool.splice(j, 1); s.classList.toggle('bt-got', got); });
    }
    function tap(i) {
      if (finished || P.given[i]) return;
      p[i] = (p[i] + 1) % 3;
      if (p[i] === 2) {
        if (bad(i)) { mistakes++; sfx.soft(); wob(B.cells[i]); api.hint('Boats can’t touch at the corners. Tap again to change it.'); }
        else { tone(440 + 40 * n8[i].filter(j => p[j] === 2).length, .12, 'triangle', .11); api.hint(base); }
      } else sfx.tap();
      render(i);
      check();
    }
    function check() {
      let ok = true, have = 0;
      for (let i = 0; i < N; i++) { if (p[i] === 2) have++; if ((p[i] === 2) !== !!P.boat[i]) ok = false; }
      if (ok) {
        finished = true; B.board.classList.add('bt-win');
        for (let i = 0; i < N; i++) if (!p[i]) p[i] = 1;
        render(); B.cells.forEach((b, i) => { if (p[i] === 2) b.style.animationDelay = randInt(300) + 'ms'; });
        sfx.good(); toast(cheer()); api.hint('You found every boat in the bay!');
        api.done(starsFor(mistakes + hints, 1, 3));
      } else if (have === total) api.hint('That is the right number of boat squares, but one is in the wrong place. Check the numbers, or tap Hint.');
    }
    function hint() {
      if (finished) return;
      let d = -1;
      for (let i = 0; i < N && d < 0; i++) if (p[i] === 2 && !P.boat[i]) d = i;
      if (d < 0) d = pick([...Array(N).keys()].filter(i => P.boat[i] && p[i] !== 2));
      hints++; p[d] = P.boat[d] ? 2 : 1; P.given[d] = p[d];
      sfx.tap(); render(d); wob(B.cells[d]);
      api.hint(P.boat[d] ? 'There is part of a boat here.' : 'That square is just water.');
      check();
    }
    render();
    if (TEST) api.stage.__auto = () => { for (let i = 0; i < N; i++) if (!P.given[i]) { const want = P.boat[i] ? 2 : 1; let s = 0; while (p[i] !== want && s++ < 3) B.cells[i].click(); } };
    if (TEST) api.stage.__info = () => ({ n, fleet, unique: solveBoats(n, fleet, P.R, P.C, P.given, 2, 5e6).count === 1, givens: [...P.given].filter(Boolean).length });
  }

  /* =========================================================
     3. CROSS SUMS (kakuro)
     ========================================================= */
  // runs on an h x w interior; each run: { cells:[interior idx], dir:'a'|'d', clue:[fullRow, fullCol] }
  function ksRuns(white, h, w) {
    const runs = [];
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      const i = r * w + c;
      if (white[i] && (c === 0 || !white[i - 1]) && c + 1 < w && white[i + 1]) {
        const cells = []; for (let k = c; k < w && white[r * w + k]; k++) cells.push(r * w + k);
        runs.push({ cells, dir: 'a', clue: [r + 1, c] });
      }
      if (white[i] && (r === 0 || !white[i - w]) && r + 1 < h && white[i + w]) {
        const cells = []; for (let k = r; k < h && white[k * w + c]; k++) cells.push(k * w + c);
        runs.push({ cells, dir: 'd', clue: [r, c + 1] });
      }
    }
    return runs;
  }
  function ksMask(h, w, lo, hi, p, both) {
    for (let t = 0; t < 4000; t++) {
      const white = [...Array(h * w)].map(() => Math.random() < p);
      const idx = white.map((v, i) => v ? i : -1).filter(i => i >= 0);
      if (idx.length < 3) continue;
      const runs = ksRuns(white, h, w);
      if (runs.length < lo || runs.length > hi || runs.some(r => r.cells.length > 4)) continue;
      const inRun = new Set(runs.flatMap(r => r.cells));
      if (idx.some(i => !inRun.has(i))) continue;
      if (both) { const cnt = {}; runs.forEach(r => r.cells.forEach(i => { cnt[i] = (cnt[i] || 0) + 1; })); if (idx.some(i => cnt[i] < 2)) continue; }
      // connected
      const seen = new Set([idx[0]]), q = [idx[0]];
      while (q.length) { const x = q.pop(), r = (x / w) | 0, c = x % w; [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([a, b]) => { const j = a * w + b; if (a >= 0 && b >= 0 && a < h && b < w && white[j] && !seen.has(j)) { seen.add(j); q.push(j); } }); }
      if (seen.size !== idx.length) continue;
      return { white, runs, cells: idx, h, w };
    }
    return null;
  }
  function ksSetup(M, w) {
    const of = {}; M.cells.forEach(i => { of[i] = []; });
    M.runs.forEach((run, k) => run.cells.forEach(i => of[i].push(k)));
    return of;
  }
  function ksFill(M, of, bias) {
    const val = {};
    const used = M.runs.map(() => 0);
    const order = M.cells;
    function rec(x) {
      if (x === order.length) return true;
      const i = order[x];
      // lean towards low or high digits: sums like 3 (1+2) or 17 (8+9) have only one way to make them
      for (const d of [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => [d, Math.random() * (1 + Math.abs(d - 5) * bias)]).sort((a, b) => b[1] - a[1]).map(x => x[0])) {
        const bit = 1 << d;
        if (of[i].some(k => used[k] & bit)) continue;
        of[i].forEach(k => { used[k] |= bit; }); val[i] = d;
        if (rec(x + 1)) return true;
        of[i].forEach(k => { used[k] &= ~bit; });
      }
      return false;
    }
    rec(0);
    return val;
  }
  // smallest / largest sum of k distinct digits not in mask
  function ksBounds(mask, k) {
    let lo = 0, hi = 0, a = 0, b = 0;
    for (let d = 1; d <= 9 && a < k; d++) if (!(mask & (1 << d))) { lo += d; a++; }
    for (let d = 9; d >= 1 && b < k; d--) if (!(mask & (1 << d))) { hi += d; b++; }
    return a < k ? [Infinity, -Infinity] : [lo, hi];
  }
  function ksSolve(M, of, sums, given, limit = 2, budget = 200000) {
    const used = M.runs.map(() => 0), tot = M.runs.map(() => 0), left = M.runs.map(r => r.cells.length);
    const val = {}, sols = []; let count = 0, steps = 0;
    const cands = i => {
      const out = [];
      for (const d of (given[i] ? [given[i]] : [1, 2, 3, 4, 5, 6, 7, 8, 9])) {
        const bit = 1 << d;
        if (of[i].some(k => used[k] & bit)) continue;
        let ok = true;
        for (const k of of[i]) {
          const l = left[k] - 1, rest = sums[k] - tot[k] - d;
          if (l === 0) { if (rest !== 0) { ok = false; break; } }
          else { const [lo, hi] = ksBounds(used[k] | bit, l); if (rest < lo || rest > hi) { ok = false; break; } }
        }
        if (ok) out.push(d);
      }
      return out;
    };
    function rec(n) {
      if (count >= limit || ++steps > budget) return;
      if (n === M.cells.length) { count++; sols.push({ ...val }); return; }
      let best = -1, bc = null;
      for (const i of M.cells) { if (val[i]) continue; const c = cands(i); if (!c.length) return; if (!bc || c.length < bc.length) { best = i; bc = c; if (c.length === 1) break; } }
      const i = best;
      for (const d of bc) {
        const bit = 1 << d;
        of[i].forEach(k => { used[k] |= bit; tot[k] += d; left[k]--; }); val[i] = d;
        rec(n + 1);
        of[i].forEach(k => { used[k] &= ~bit; tot[k] -= d; left[k]++; }); delete val[i];
        if (count >= limit || steps > budget) return;
      }
    }
    rec(0);
    return { count, sols, exhausted: steps > budget };
  }
  function makeCross(h, w, lo, hi, p, both) {
    const t0 = now();
    let M, of, sol, sums;
    const sumsOf = v => M.runs.map(r => r.cells.reduce((s, i) => s + v[i], 0));
    for (let a = 0; a < 5000 && now() - t0 < 90; a++) {
      if (a % 20 === 0) { M = ksMask(h, w, lo, hi, p, both) || ksMask(h, w, lo, hi, p) || ksMask(2, 2, 2, 3, .75); of = ksSetup(M); }
      sol = ksFill(M, of, a % 3 ? 1.5 : 0);
      sums = sumsOf(sol);
      const res = ksSolve(M, of, sums, {});
      if (res.count === 1 && !res.exhausted) return { M, of, sol, sums, given: {} };
    }
    // nudge single squares of the last fill until only one answer is left
    let res = ksSolve(M, of, sums, {}, 40, 60000), score = res.exhausted ? 99 : res.count;
    while (score > 1 && now() - t0 < 300) {
      const alt = res.sols.find(s => M.cells.some(i => s[i] !== sol[i]));
      const diff = alt ? M.cells.filter(i => alt[i] !== sol[i]) : M.cells;
      const i = pick(diff);
      const busy = new Set(of[i].flatMap(k => M.runs[k].cells).filter(j => j !== i).map(j => sol[j]));
      const opts = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => d !== sol[i] && !busy.has(d)));
      const old = sol[i]; let best = null;
      for (const d of opts) {
        sol[i] = d; sums = sumsOf(sol);
        const r2 = ksSolve(M, of, sums, {}, 40, 60000), s2 = r2.exhausted ? 99 : r2.count;
        if (s2 <= score && (!best || s2 < best.s)) best = { d, s: s2, r: r2 };
        if (s2 === 1) break;
      }
      if (best) { sol[i] = best.d; score = best.s; res = best.r; } else sol[i] = old;
      sums = sumsOf(sol);
    }
    const given = {};
    for (let guard = 0; guard < M.cells.length && score > 1; guard++) {
      const res = ksSolve(M, of, sums, given);
      if (res.count === 1 && !res.exhausted) break;
      const alt = res.sols.find(s => M.cells.some(i => s[i] !== sol[i]));
      const diff = M.cells.filter(i => !given[i] && (!alt || alt[i] !== sol[i]));
      const d = pick(diff); given[d] = sol[d];
    }
    return { M, of, sol, sums, given };
  }
  function startCross(L, api) {
    const T = [[2, 2, 2, 3, .8], [2, 3, 3, 4, .8], [3, 3, 4, 5, .75], [3, 3, 5, 6, .8], [3, 4, 5, 7, .78], [4, 4, 6, 8, .75], [4, 4, 7, 9, .8], [4, 5, 8, 10, .78], [5, 5, 9, 12, .78]];
    const [h0, w0, lo, hi, pr] = T[Math.min(L, T.length) - 1];
    const P = makeCross(h0, w0, lo, hi, pr, L >= 4), { M, of, sol, sums, given } = P, h = M.h, w = M.w;
    const W = Math.min(stageW(api), 560), g = 4, cols = w + 1, rows = h + 1;
    const cs = Math.floor(Math.min(70, (W - (cols + 1) * g) / cols));
    const cur = {}; M.cells.forEach(i => { cur[i] = given[i] || 0; });
    let sel = M.cells.find(i => !given[i]), mistakes = 0, hints = 0, finished = false;
    const runDone = M.runs.map(() => 0); // 0 open, 1 right, 2 wrong
    const board = el('div', 'ks-board');
    board.style.cssText = `--g:${g}px; --cs:${cs}px; grid-template-columns:repeat(${cols}, ${cs}px)`;
    const full = [...Array(rows * cols)].map(() => null), cells = {}, clueEls = M.runs.map(() => null);
    const clueAt = {}; M.runs.forEach((run, k) => { const key = run.clue[0] * cols + run.clue[1]; (clueAt[key] = clueAt[key] || []).push(k); });
    for (let R0 = 0; R0 < rows; R0++) for (let C0 = 0; C0 < cols; C0++) {
      const key = R0 * cols + C0, ii = R0 > 0 && C0 > 0 ? (R0 - 1) * w + C0 - 1 : -1;
      if (ii >= 0 && M.white[ii]) {
        const b = mkBtn('ks-cell', '', () => select(ii)); cells[ii] = b; board.append(b); full[key] = b; continue;
      }
      const ks = clueAt[key];
      const d = el('div', 'ks-blk' + (ks ? ' ks-clue' : ''));
      (ks || []).forEach(k => { const s = el('span', M.runs[k].dir === 'a' ? 'ks-a' : 'ks-d', String(sums[k])); s.title = M.runs[k].dir === 'a' ? 'adds up going across' : 'adds up going down'; d.append(s); clueEls[k] = s; });
      board.append(d); full[key] = d;
    }
    const pad = el('div', 'ks-pad');
    const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => { const b = mkBtn('btn c-card ks-key', String(d), () => enter(d)); pad.append(b); return b; });
    pad.append(mkBtn('btn c-peach ks-key', '⌫', () => enter(0)));
    pad.append(mkBtn('btn c-sun ks-key ks-wide', '💡 Hint', hint));
    api.stage.append(board, pad);
    const words = ['', '', 'two', 'three', 'four', 'five'];
    function selHint() {
      if (sel == null) return;
      const parts = of[sel].map(k => `${M.runs[k].dir === 'a' ? 'Across' : 'Down'}: ${words[M.runs[k].cells.length] || M.runs[k].cells.length} squares make ${sums[k]}`);
      api.hint(parts.join('. ') + '. No number twice in a line.');
    }
    function render(pop) {
      const peers = new Set(sel == null ? [] : of[sel].flatMap(k => M.runs[k].cells));
      M.cells.forEach(i => {
        const b = cells[i], v = cur[i];
        const dup = v && of[i].some(k => M.runs[k].cells.some(j => j !== i && cur[j] === v));
        b.className = 'ks-cell' + (given[i] ? ' ks-giv' : '') + (peers.has(i) ? ' ks-peer' : '') + (i === sel ? ' ks-sel' : '') + (dup ? ' ks-wrong' : '') + (pop === i ? ' ks-new' : '');
        b.textContent = v ? String(v) : '';
        b.setAttribute('aria-label', v ? 'Square with ' + v : 'Empty square');
      });
      M.runs.forEach((run, k) => {
        clueEls[k].classList.toggle('ks-ok', runDone[k] === 1);
        clueEls[k].classList.toggle('ks-bad', runDone[k] === 2);
      });
    }
    function select(i) {
      if (finished) return;
      if (given[i]) { sfx.soft(); wob(cells[i]); api.hint('That number was given to you. Pick an empty square.'); return; }
      sel = i; sfx.tap(); selHint(); render();
    }
    let combo = 0;
    function enter(d, quiet) {
      if (finished || sel == null || given[sel]) return;
      const i = sel, before = cur[i];
      if (before === d) return;
      cur[i] = d;
      const dupe = d && of[i].some(k => M.runs[k].cells.some(j => j !== i && cur[j] === d));
      if (dupe) { if (!quiet) mistakes++; combo = 0; sfx.soft(); wob(cells[i]); api.hint(`There is already a ${d} in that line. Try a different number.`); }
      else if (d) { tone(420 + d * 35, .1, 'triangle', .1); selHint(); }
      else sfx.tap();
      // re-check the runs through this square
      of[i].forEach(k => {
        const run = M.runs[k], vals = run.cells.map(j => cur[j]);
        const was = runDone[k];
        if (vals.every(Boolean)) {
          const ok = vals.reduce((a, b) => a + b, 0) === sums[k] && new Set(vals).size === vals.length;
          runDone[k] = ok ? 1 : 2;
          if (was !== runDone[k]) {
            if (ok) { combo++; tone(520 + combo * 60, .16, 'sine', .12, .08); clueEls[k].animate([{ scale: 1 }, { scale: 1.5 }, { scale: 1 }], { duration: 400 }); }
            else { if (!quiet) mistakes++; combo = 0; sfx.soft(); api.hint(`That line adds up to ${vals.reduce((a, b) => a + b, 0)}, but it needs ${sums[k]}. Try changing a number.`); }
          }
        } else runDone[k] = 0;
      });
      // hop to the next empty square in the same line
      if (d && !dupe && !quiet) {
        const nextEmpty = of[i].flatMap(k => M.runs[k].cells).find(j => !cur[j] && !given[j]);
        if (nextEmpty != null && runDone.every(x => x !== 2)) { sel = nextEmpty; selHint(); }
      }
      render(i);
      check();
    }
    function check() {
      if (M.cells.every(i => cur[i] === sol[i])) {
        finished = true; sel = null; render(); board.classList.add('ks-win');
        M.cells.forEach((i, k) => { cells[i].style.animationDelay = k * 40 + 'ms'; });
        sfx.good(); toast(cheer()); api.hint('Every line adds up. Lovely work!');
        api.done(starsFor(mistakes + hints, 1, 3));
      }
    }
    function hint() {
      if (finished) return;
      let i = sel != null && !given[sel] && cur[sel] !== sol[sel] ? sel : M.cells.find(j => cur[j] && cur[j] !== sol[j]);
      if (i == null) i = pick(M.cells.filter(j => cur[j] !== sol[j]));
      hints++; sel = i;
      const d = sol[i];
      cur[i] = 0; // enter() checks the run fresh
      enter(d, true);
      api.hint(`This square is ${d}.`);
    }
    selHint(); render();
    if (TEST) api.stage.__auto = () => M.cells.forEach(i => { if (!given[i]) { cells[i].click(); keys[sol[i] - 1].click(); } });
    if (TEST) api.stage.__info = () => ({ h, w, cells: M.cells.length, runs: M.runs.length, unique: ksSolve(M, of, sums, given).count === 1, givens: Object.keys(given).length });
  }

  if (TEST) R._l5 = { makeCross, ksSolve, makeTents, makeBoats, solveBoats, makeChain };

  /* =========================================================
     4. WORD CHAIN
     ========================================================= */
  // [word, picture, theme] — a: animals, f: food and drink, t: things
  const WC_SRC = {
    a: 'CAT🐱 DOG🐶 COW🐮 PIG🐷 HEN🐔 OWL🦉 BEE🐝 ANT🐜 FOX🦊 BAT🦇 RAT🐀 YAK🐃 FISH🐟 BIRD🐦 DUCK🦆 FROG🐸 BEAR🐻 LION🦁 GOAT🐐 LAMB🐑 CRAB🦀 DEER🦌 SWAN🦢 WOLF🐺 DOVE🕊️ PONY🐴 SEAL🦭 WORM🪱 BOAR🐗 HORSE🐎 SHEEP🐑 MOUSE🐭 TIGER🐯 ZEBRA🦓 CAMEL🐫 SNAKE🐍 WHALE🐳 SHARK🦈 SNAIL🐌 EAGLE🦅 PANDA🐼 OTTER🦦 LLAMA🦙 CHICK🐥 BUNNY🐰 KOALA🐨 HIPPO🦛 RHINO🦏 SKUNK🦨 RABBIT🐇 MONKEY🐒 TURTLE🐢 PARROT🦜 SPIDER🕷️ KITTEN🐈 TURKEY🦃 DONKEY🫏 BEETLE🪲 BADGER🦡 PENGUIN🐧 OCTOPUS🐙 DOLPHIN🐬 GIRAFFE🦒 CHICKEN🐔 LOBSTER🦞 GORILLA🦍 ROOSTER🐓 PEACOCK🦚 UNICORN🦄 ELEPHANT🐘 KANGAROO🦘 HEDGEHOG🦔 SQUIRREL🐿️ FLAMINGO🦩 LADYBIRD🐞 LEOPARD🐆 OYSTER🦪 IGUANA🦎',
    f: 'EGG🥚 PIE🥧 JAM🍓 HAM🍖 YAM🍠 NUT🥜 TEA🍵 CAKE🍰 MILK🥛 CORN🌽 PEAR🍐 RICE🍚 SOUP🍲 KIWI🥝 TACO🌮 BREAD🍞 APPLE🍎 LEMON🍋 MELON🍈 GRAPE🍇 PEACH🍑 ONION🧅 PIZZA🍕 HONEY🍯 CANDY🍬 PASTA🍝 SALAD🥗 BACON🥓 MANGO🥭 JUICE🧃 OLIVE🫒 DONUT🍩 CHIPS🍟 SUSHI🍣 TOAST🍞 CHEESE🧀 CARROT🥕 BANANA🍌 CHERRY🍒 POTATO🥔 COOKIE🍪 BUTTER🧈 ORANGE🍊 TOMATO🍅 MUFFIN🧁 GARLIC🧄 PEPPER🌶️ COFFEE☕ NOODLES🍜 PEANUT🥜 WAFFLE🧇 PRETZEL🥨 PANCAKE🥞 POPCORN🍿 PUMPKIN🎃 AVOCADO🥑 LETTUCE🥬 CUSTARD🍮 COCONUT🥥 SANDWICH🥪 BROCCOLI🥦 CUCUMBER🥒 MUSHROOM🍄 LOLLIPOP🍭 YOGHURT🥛 OATS🥣 ICING🎂 STEW🍲 RAISIN🍇 TART🥧 DATE🌴',
    t: 'CAR🚗 BUS🚌 VAN🚐 HAT🎩 MAP🗺️ PEN🖊️ BOX📦 BED🛏️ KEY🔑 CUP☕ BAG👜 KITE🪁 BELL🔔 BOOK📖 DRUM🥁 SOCK🧦 COAT🧥 SHOE👞 RING💍 DOOR🚪 SOAP🧼 TENT⛺ GIFT🎁 BALL⚽ BIKE🚲 TAXI🚕 BOAT⛵ SHIP🚢 LAMP💡 YOYO🪀 YARN🧶 SOFA🛋️ TRAIN🚂 PLANE✈️ TRUCK🚚 HOUSE🏠 CLOCK🕰️ SPOON🥄 KNIFE🔪 CHAIR🪑 PIANO🎹 BRUSH🖌️ DRESS👗 GLOVE🧤 SCARF🧣 CROWN👑 RADIO📻 PHONE📞 WATCH⌚ TORCH🔦 MEDAL🏅 BROOM🧹 CANOE🛶 SHIRT👕 JEANS👖 IGLOO🧊 ROBOT🤖 PENCIL✏️ CANDLE🕯️ GUITAR🎸 ROCKET🚀 CASTLE🏰 BASKET🧺 ANCHOR⚓ BRIDGE🌉 CAMERA📷 TICKET🎟️ TROPHY🏆 PUZZLE🧩 HAMMER🔨 MAGNET🧲 LADDER🪜 MIRROR🪞 WINDOW🪟 SPONGE🧽 BUCKET🪣 TEAPOT🫖 VIOLIN🎻 BALLOON🎈 TRACTOR🚜 TRUMPET🎺 UMBRELLA☂️ ENVELOPE✉️ NEEDLE🪡 THREAD🧵 TELESCOPE🔭 TEDDY🧸 OAR🚣 ARMCHAIR🪑 HELMET⛑️ GLASSES👓 SANDAL👡 PURSE👛 RULER📏 LOCK🔒'
  };
  const WC = [];
  Object.entries(WC_SRC).forEach(([th, s]) => s.trim().split(/\s+/).forEach(tok => { const m = tok.match(/^([A-Z]+)(.+)$/); if (m && m[1].length <= 8) WC.push({ w: m[1], e: m[2], th }); }));
  function makeChain(N, theme, maxLen = 8) {
    const pool = WC.filter(x => (!theme || x.th === theme) && x.w.length <= maxLen);
    const byFirst = {}; pool.forEach(x => { (byFirst[x.w[0]] = byFirst[x.w[0]] || []).push(x); });
    for (let t = 0; t < 300; t++) {
      const chain = [pick(pool)], used = new Set([chain[0].w]);
      const dfs = () => {
        if (chain.length === N) return true;
        const last = chain[chain.length - 1].w, nexts = shuffle((byFirst[last[last.length - 1]] || []).filter(x => !used.has(x.w)));
        for (const x of nexts.slice(0, 6)) { chain.push(x); used.add(x.w); if (dfs()) return true; chain.pop(); used.delete(x.w); }
        return false;
      };
      if (dfs()) return chain;
    }
    return null;
  }
  function startChain(L, api) {
    const N = [4, 4, 5, 5, 6, 6, 7][Math.min(L, 7) - 1], nOpt = L <= 2 ? 3 : 4;
    const theme = L >= 4 ? pick(['a', 'f', 't']) : null;
    const TH = { a: 'animals', f: 'food and drink', t: 'everyday things' };
    const chain = makeChain(N, theme, L <= 2 ? 5 : 8) || makeChain(N, null);
    const W = Math.min(stageW(api), 640);
    let at = 0, mistakes = 0, combo = 0;
    const wrap = el('div', 'wc-wrap'), strip = el('div', 'wc-chain'), nowBox = el('div', 'wc-now'), choices = el('div', 'wc-choices');
    wrap.append(strip, nowBox, choices); api.stage.append(wrap);
    function drawStrip() {
      strip.innerHTML = '';
      chain.slice(0, at + 1).forEach((x, k) => {
        if (k) strip.append(el('span', 'wc-arrow', '→'));
        const w = x.w, first = k ? `<b>${w[0]}</b>${w.slice(1)}` : w;
        strip.append(el('span', 'wc-link', `<span>${x.e}</span><span>${k === at ? first.replace(/(.)$/, '<b>$1</b>') : first}</span>`));
      });
    }
    function show() {
      api.rounds(N - 1, at);
      drawStrip();
      const cur = chain[at], last = cur.w[cur.w.length - 1], ls = Math.floor(Math.min(54, (Math.min(W, 640) - 60) / cur.w.length - 5));
      nowBox.innerHTML = '';
      const letters = el('div', 'wc-letters'); letters.style.setProperty('--ls', ls + 'px');
      [...cur.w].forEach((ch, k) => letters.append(el('span', 'wc-l tile ' + (k === cur.w.length - 1 ? 'c-sun wc-last' : 'c-card'), ch)));
      nowBox.append(el('div', 'wc-pic', cur.e), letters);
      const right = chain[at + 1];
      api.hint((L <= 4 ? `${cur.w} ends with ${last}. Which word starts with ${last}?` : `Which word starts with the last letter of ${cur.w}?`) + (theme ? ` (A chain of ${TH[theme]}.)` : ''));
      // distractors: different first letters; later levels use the same theme and some sneaky near-misses
      const pool = WC.filter(x => x.w[0] !== last && !chain.includes(x) && (!theme || x.th === theme || L < 6));
      const opts = [right], firsts = new Set([last]);
      const tricky = L >= 5 ? shuffle(pool.filter(x => x.w.endsWith(last) || x.w[0] === cur.w[0])) : [];
      for (const x of tricky.concat(shuffle(pool.slice()))) { if (opts.length >= nOpt) break; if (firsts.has(x.w[0])) continue; firsts.add(x.w[0]); opts.push(x); }
      choices.innerHTML = '';
      let solved = false;
      shuffle(opts).forEach(x => {
        const b = mkBtn('btn c-card wc-ch', `<span class="wc-e">${x.e}</span><span>${x.w}</span>`, () => {
          if (solved) return;
          if (x === right) {
            solved = true; b.classList.add('wc-right'); combo++;
            tone(440 + combo * 70, .14, 'triangle', .12); tone(660 + combo * 70, .16, 'sine', .1, .1);
            at++;
            if (at === N - 1) {
              api.rounds(N - 1, at); drawStrip(); sfx.good(); toast(cheer());
              api.hint(`A chain of ${N} words. Well linked!`);
              nowBox.innerHTML = ''; nowBox.append(el('div', 'wc-pic', chain.map(c => c.e).join(' ')));
              choices.innerHTML = '';
              api.done(starsFor(mistakes, 0, 2));
            } else api.later(show, 900);
          } else {
            mistakes++; combo = 0; b.classList.add('wc-nope'); sfx.soft(); wob(b);
            api.hint(`${x.w} starts with ${x.w[0]}. We need a word that starts with ${last}.`);
          }
        });
        b.setAttribute('aria-label', x.w);
        choices.append(b);
      });
    }
    show();
    if (TEST) api.stage.__auto = () => { const go = () => { if (at >= N - 1) return; const want = chain[at + 1].w; [...choices.children].find(b => b.getAttribute('aria-label') === want).click(); }; go(); };
    if (TEST) api.stage.__info = () => ({ N, at, words: chain.map(c => c.w) });
  }

  /* =========================================================
     5. HIDDEN WORDS
     ========================================================= */
  // "Sentence|hidden word". Every word crosses a gap between words.
  const HW_CATS = {
    animal: { label: 'animal', icon: '🐾', list: [
      'She never stops smiling.|hen', 'The cab at the station was late.|bat', 'Eric attends choir every week.|cat', 'Always do good deeds.|dog',
      'Grow lettuce in the garden.|owl', 'The new plan took shape.|ant', 'Marco won the egg and spoon race.|cow', 'Cora made a lovely cake.|ram',
      'Please be extra careful on the stairs.|bee', 'Mabel kindly baked us a pie.|elk', 'Some museums open on Sundays.|emu', 'Always say a kind word.|yak',
      'Would you like a pear?|ape', 'Our attic is full of old toys.|rat', 'Grandad cheered as if Oxford had won.|fox', 'Close all the windows, please.|seal',
      'Will Amber come to tea?|lamb', 'Sit next to Adam at dinner.|toad', 'We can go at noon.|goat', 'Which are your slippers?|hare',
      'The bee loves the lavender.|eel', 'The day was perfect for a picnic.|wasp', 'The magician waved his wand.|swan', 'Erica melted the butter.|camel',
      'We got terrific news today.|otter'] },
    food: { label: 'food', icon: '🍎', list: [
      'Meg gave me a hug.|egg', 'Sarah, am I too early?|ham', 'Bob unpacked the car.|bun', 'The children loved their ice lollies.|rice',
      'Keep early hours and rest well.|pear', 'Will I meet you at the shop?|lime', 'Dinner will be an hour or so.|bean', 'Rebecca kept the photos safe.|cake',
      'Grandma is also up early today.|soup', 'We help each other.|peach', 'The frog can hop easily.|pea', 'Fred ate all his greens.|date',
      'Bob reads the paper every morning.|bread', 'Pam intends to bake today.|mint', 'Let Arthur choose the film.|tart'] },
    colour: { label: 'colour', icon: '🎨', list: [
      'We are delighted for you.|red', 'Where do you like to walk?|red', 'Pat and Joe went fishing.|tan', 'A big old oak tree grew there.|gold',
      'Kate always sings in the bath.|teal', 'Pam, Bernard is here.|amber'] },
    body: { label: 'part of the body', icon: '✋', list: [
      'We are going out.|ear', 'The car moved slowly.|arm', 'Nicole got a new puppy.|leg', 'We went to Edinburgh by train.|toe',
      'This soup is rich in flavour.|chin', 'Ali packed a bag.|lip', 'Juno sent a lovely card.|nose', 'We had fish and chips on Friday.|hand',
      'Wash in warm soapy water.|shin', 'The elephant sprayed water.|heel', 'Bob rowed across the lake.|brow', 'We loved his kindness.|skin',
      'Fresh air is good for you.|hair', 'She added sugar to the tea.|head', 'The artist painted the sea.|heart'] },
    home: { label: 'thing in the house', icon: '🏠', list: [
      'We walked up and down the pier.|pan', 'Come on Marc, up you get!|cup', 'We met Sam at the shop.|mat', 'Be daring and try something new.|bed',
      'The shop is also far from here.|sofa', 'My cousin in Peru got married.|rug', 'It is nice to help others.|pot', 'That apple looks lovely.|tap',
      'The club in town has a dance.|bin', 'This card is for Kate.|fork', 'Cousin Kim came to stay.|sink', 'I love nature walks.|oven',
      'Do order the pudding!|door', 'Make yourself at home.|key', 'Have you heard of any good films?|fan', 'Ali did a lovely drawing.|lid',
      'Tom opened the window.|mop', 'Look at that ray of sunshine!|tray', 'We stayed up late last night.|plate'] }
  };
  const HW = [];
  Object.entries(HW_CATS).forEach(([cat, o]) => o.list.forEach(s => { const [text, word] = s.split('|'); HW.push({ cat, text, word: word.toUpperCase() }); }));
  // drop anything where the word does not really cross a gap
  const hwLetters = t => t.toUpperCase().replace(/[^A-Z ]/g, '');
  const hwOK = x => { const s = hwLetters(x.text); for (let i = 0; i < s.length; i++) { let k = i, j = 0; while (j < x.word.length && k < s.length) { if (s[k] === ' ') { k++; continue; } if (s[k] !== x.word[j]) break; k++; j++; } if (j === x.word.length && s.slice(i, k).includes(' ') && s[i] !== ' ') return true; } return false; };
  const HWV = HW.filter(hwOK);
  const letters0 = t => t.replace(/[^A-Za-z]/g, '').length;
  function startHidden(L, api) {
    const total = L <= 2 ? 4 : 5;
    const maxLen = L === 1 ? 3 : L === 2 ? 4 : 9, minLen = L >= 6 ? 4 : 3;
    const showLen = L < 5;
    let seen = []; try { seen = store.get('hw-seen', []) || []; } catch (e) { seen = []; }
    let pool = HWV.filter(x => x.word.length <= maxLen && x.word.length >= minLen);
    if (pool.length < total) pool = HWV.slice();
    const fresh = pool.filter(x => !seen.includes(x.text));
    const picks = []; const order = shuffle(fresh.length >= total ? fresh : pool.slice());
    // vary the categories
    const cats = new Set();
    for (const x of order) { if (picks.length >= total) break; if (!cats.has(x.cat) || cats.size >= 5) { picks.push(x); cats.add(x.cat); } }
    for (const x of order) { if (picks.length >= total) break; if (!picks.includes(x)) picks.push(x); }
    try { store.set('hw-seen', seen.concat(picks.map(x => x.text)).slice(-40)); } catch (e) { /* fine */ }
    const W = Math.min(stageW(api), 760);
    let round = 0, mistakes = 0, helps = 0;
    function show() {
      api.rounds(total, round); api.stage.innerHTML = '';
      const q = picks[round], cat = HW_CATS[q.cat], lenTxt = showLen ? `${q.word.length}-letter ` : '';
      api.hint(`Find the ${lenTxt}${cat.label} hiding in this sentence. Tap its first letter, then its last letter.`);
      const wrap = el('div', 'hw-wrap'), tag = el('div', 'hw-cat', `<span>${cat.icon}</span>Find the ${cat.label}`);
      const sent = el('div', 'hw-sent'), found = el('div', 'hw-found-word', '');
      const words = q.text.split(/\s+/), letters = [], tiles = [], wordOf = [];
      const longest = Math.max(...words.map(w => w.replace(/[^A-Za-z]/g, '').length));
      const ts = Math.floor(Math.max(30, Math.min(letters0(q.text) > 20 ? 38 : 46, (W - 24) / longest - 3)));
      sent.style.setProperty('--ts', ts + 'px');
      words.forEach((w, wi) => {
        const g = el('span', 'hw-word');
        [...w].forEach(ch => {
          if (/[A-Za-z]/.test(ch)) {
            const k = letters.length; letters.push(ch.toUpperCase()); wordOf.push(wi);
            const b = mkBtn('hw-t tile c-card', ch.toUpperCase(), () => tap(k)); b.setAttribute('aria-label', 'Letter ' + ch.toUpperCase());
            tiles.push(b); g.append(b);
          } else g.append(el('span', 'hw-p', ch));
        });
        sent.append(g);
      });
      const bar = el('div', 'l5-bar'), helpB = mkBtn('btn c-sun', '💡 Help', help);
      bar.append(helpB);
      wrap.append(tag, sent, found, bar); api.stage.append(wrap);
      const str = letters.join('');
      // where the answer sits (first spot that crosses a word gap)
      const starts = []; for (let i = str.indexOf(q.word); i >= 0; i = str.indexOf(q.word, i + 1)) if (wordOf[i] !== wordOf[i + q.word.length - 1]) starts.push(i);
      let a = -1, done = false, helpLvl = 0, wrongs = 0;
      function tap(k) {
        if (done) return;
        if (a < 0) { a = k; tiles[k].classList.add('hw-a'); sfx.tap(); api.hint('Now tap the last letter of the hidden word.'); return; }
        if (a === k) { tiles[k].classList.remove('hw-a'); a = -1; sfx.tap(); api.hint(`Tap the first letter of the hidden ${cat.label}.`); return; }
        const lo = Math.min(a, k), hi = Math.max(a, k), got = str.slice(lo, hi + 1);
        tiles[a].classList.remove('hw-a'); a = -1;
        if (got === q.word) {
          done = true;
          for (let j = lo; j <= hi; j++) { tiles[j].classList.add('hw-found'); tiles[j].style.animationDelay = (j - lo) * 80 + 'ms'; tone(500 + (j - lo) * 80, .12, 'triangle', .1, (j - lo) * .08); }
          sent.classList.add('hw-done'); found.textContent = q.word;
          toast(cheer()); api.hint(`Yes! “${q.word.toLowerCase()}” was hiding there.`);
          round++;
          api.later(() => { if (round === total) { api.rounds(total, round); sfx.good(); api.done(starsFor(mistakes + helps, 1, 3)); } else show(); }, 1700);
        } else {
          mistakes++; wrongs++; sfx.soft(); wob(sent);
          api.hint(`That spells ${got}. Look for a ${q.word.length}-letter ${cat.label}. It runs across two words.`);
          if (wrongs >= 2 && helpLvl === 0) { helpLvl = 1; tiles[starts[0]].classList.add('hw-glow'); api.hint(`Here’s a clue: it starts with the glowing letter ${q.word[0]}.`); }
        }
      }
      function help() {
        if (done) return;
        helps++; sfx.tap();
        if (helpLvl === 0) { helpLvl = 1; tiles[starts[0]].classList.add('hw-glow'); api.hint(`It starts with the glowing letter ${q.word[0]}. It is a ${q.word.length}-letter ${cat.label}.`); }
        else { helpLvl = 2; for (let j = 0; j < q.word.length; j++) tiles[starts[0] + j].classList.add('hw-glow'); api.hint(`It is ${q.word.toLowerCase()}. Tap the first and last glowing letters.`); }
      }
      if (TEST) api.stage.__auto = () => { tiles[starts[0]].click(); tiles[starts[0] + q.word.length - 1].click(); };
    }
    show();
    if (TEST) api.stage.__info = () => ({ total, valid: HWV.length, all: HW.length, round });
  }
})();
