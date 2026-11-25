/* Recall: Logic 6 (Lamp Rooms, Fence It, Islands, Frog Hop, Colour Rows) */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor, CUBES } = R;
  const TEST = !!window.__recallTest; // test hooks only exist when a test harness sets this before load

  R.css(`
/* ---- shared (l6-) ---- */
.l6-bar{display:flex; flex-wrap:wrap; justify-content:center; gap:12px 14px; margin-top:20px}
.l6-bar .btn{min-width:124px}
.l6-bar .btn:disabled{opacity:.42; cursor:default}
.l6-info{text-align:center; font:600 1.2rem/1.3 var(--display); margin:0 0 12px; color:var(--on-table)}
.l6-info b{color:var(--sun)}
.l6-glow{animation:l6Glow .9s ease-in-out 3}
@keyframes l6Glow{50%{box-shadow:0 0 0 5px #fff, 0 0 24px 8px rgba(255,255,255,.85)}}

/* ---- Lamp Rooms (lp-) ---- */
.lp-board{display:grid; gap:3px; margin:0 auto; width:max-content; padding:6px; border-radius:18px; background:#1B2730; box-shadow:0 7px 0 #0E161C, 0 14px 24px rgba(0,0,0,.32)}
.lp-cell{width:var(--cs); height:var(--cs); border:0; padding:0; border-radius:14%; cursor:pointer; display:grid; place-items:center; position:relative;
  background:#9DAEBA; box-shadow:inset 0 -4px 0 rgba(0,0,0,.16), inset 0 2px 0 rgba(255,255,255,.3); font-size:calc(var(--cs) * .58); line-height:1; transition:background .25s}
.lp-lit{background:#FFE58A; box-shadow:inset 0 -4px 0 rgba(196,138,0,.3), inset 0 0 14px rgba(255,255,255,.7)}
.lp-dot::before{content:''; width:20%; height:20%; border-radius:50%; background:rgba(255,255,255,.85); box-shadow:0 0 0 2px rgba(0,0,0,.15)}
.lp-lit.lp-dot::before{background:#B98A12}
.lp-cell.tile{box-shadow:inset 0 -4px 0 rgba(0,0,0,.16), inset 0 2px 0 rgba(255,255,255,.45), 0 3px 0 var(--d), 0 0 16px rgba(255,214,90,.8)}
.lp-bad{outline:4px solid #fff; outline-offset:-3px}
.lp-pop{animation:bounceIn .25s}
.lp-wall{cursor:default; background:#34444F; color:#fff; font:700 calc(var(--cs) * .52)/1 var(--display); box-shadow:inset 0 3px 0 rgba(255,255,255,.12), inset 0 -4px 0 rgba(0,0,0,.35)}
.lp-wall.lp-ok{color:#8BF0AE}
.lp-wall.lp-ok::after{content:'✓'; position:absolute; right:6%; top:4%; font-size:.45em}
.lp-wall.lp-over{background:var(--sun); color:var(--ink)}
.lp-win .lp-cell.tile{animation:bounceIn .5s backwards}
.lp-key{display:flex; flex-wrap:wrap; justify-content:center; gap:6px 16px; margin:12px 0 0; font:600 1.05rem var(--display); color:var(--on-table-soft)}
.lp-key span{display:inline-flex; align-items:center; gap:6px}
.lp-key i{display:inline-grid; place-items:center; width:28px; height:28px; border-radius:7px; font-style:normal; font-size:18px}

/* ---- Fence It (fn-) ---- */
.fn-board{position:relative; margin:0 auto; border-radius:22px; background:radial-gradient(circle at 30% 20%, #8ED46A, #5FAE45); box-shadow:0 7px 0 #3D7F2A, 0 14px 24px rgba(0,0,0,.3)}
.fn-num{position:absolute; display:grid; place-items:center; font:700 calc(var(--cs) * .5)/1 var(--display); color:#fff; text-shadow:0 2px 0 rgba(0,0,0,.28); pointer-events:none; transition:color .2s}
.fn-num span{display:grid; place-items:center; width:62%; height:62%; border-radius:50%; transition:background .25s}
.fn-num.fn-ok span{background:rgba(255,255,255,.3); color:#F2FFE8}
.fn-num.fn-over span{background:var(--sun); color:var(--ink); text-shadow:none; animation:bounceIn .25s}
.fn-e{position:absolute; pointer-events:none; border-radius:999px; display:grid; place-items:center; transition:background .15s}
.fn-e.fn-0{background:transparent}
.fn-e.fn-0.fn-h{background:repeating-linear-gradient(90deg, rgba(255,255,255,.55) 0 6px, transparent 6px 12px) center / 100% 3px no-repeat}
.fn-e.fn-0.fn-v{background:repeating-linear-gradient(180deg, rgba(255,255,255,.55) 0 6px, transparent 6px 12px) center / 3px 100% no-repeat}
.fn-e.fn-1{background:linear-gradient(180deg, #D18A4E, #9B5A27); box-shadow:0 3px 0 #5E3313, 0 5px 8px rgba(0,0,0,.25); z-index:1}
.fn-e.fn-1.fn-v{background:linear-gradient(90deg, #D18A4E, #9B5A27)}
.fn-e.fn-bad.fn-1{background:var(--coral); box-shadow:0 3px 0 var(--coral-d)}
.fn-e.fn-2::after{content:'✕'; font:700 calc(var(--cs) * .26)/1 var(--display); color:rgba(30,60,20,.65)}
.fn-e.fn-pop{animation:bounceIn .25s}
.fn-dot{position:absolute; border-radius:50%; background:#4A2B15; box-shadow:0 2px 0 rgba(0,0,0,.3); pointer-events:none; z-index:2; transition:transform .2s}
.fn-dot.fn-bad{background:var(--coral); transform:scale(1.7); box-shadow:0 0 0 3px #fff}
.fn-hit{position:absolute; border:0; padding:0; background:transparent; transform:rotate(45deg); cursor:pointer; border-radius:8px; z-index:3}
.fn-hit:active{background:rgba(255,255,255,.18)}
.fn-hit.l6-glow{background:rgba(255,255,255,.25)}
.fn-win .fn-e.fn-1{background:var(--sun); box-shadow:0 3px 0 var(--sun-d); animation:bounceIn .5s backwards}

/* ---- Islands (nk-) ---- */
.nk-board{display:grid; gap:3px; margin:0 auto; width:max-content; padding:6px; border-radius:18px; background:#0F4A70; box-shadow:0 7px 0 #082F49, 0 14px 24px rgba(0,0,0,.3)}
.nk-cell{width:var(--cs); height:var(--cs); border:0; padding:0; border-radius:14%; cursor:pointer; display:grid; place-items:center; position:relative;
  background:#E3ECEF; box-shadow:inset 0 -4px 0 rgba(0,0,0,.12), inset 0 2px 0 rgba(255,255,255,.5); font:700 calc(var(--cs) * .5)/1 var(--display); color:var(--ink); transition:background .2s}
.nk-sea{background:#3E9BE0; color:rgba(255,255,255,.75); box-shadow:inset 0 3px 6px rgba(0,0,0,.22)}
.nk-sea::before{content:'≈'; font-size:.9em}
.nk-land{background:#F3D48F}
.nk-land::before{content:''; width:22%; height:22%; border-radius:50%; background:#9A6A2E}
.nk-clue{cursor:default; background:linear-gradient(155deg, rgba(255,255,255,.45), rgba(255,255,255,0) 50%), #FFC95A; box-shadow:inset 0 -4px 0 rgba(0,0,0,.15), 0 3px 0 var(--sun-d)}
.nk-clue.nk-ok{background:#B9F0C8; box-shadow:inset 0 -4px 0 rgba(0,0,0,.12), 0 3px 0 var(--leaf-d)}
.nk-clue.nk-ok::after{content:'✓'; position:absolute; right:6%; top:4%; font-size:.5em; color:var(--leaf-d)}
.nk-clue.nk-over{background:var(--coral); color:#fff; animation:bounceIn .25s}
.nk-pool{background:#1F6FB0; outline:4px solid #fff; outline-offset:-4px}
.nk-fixed{cursor:default}
.nk-fixed::after{content:''; position:absolute; inset:10%; border:3px dashed rgba(255,255,255,.7); border-radius:inherit}
.nk-pop{animation:bounceIn .22s}
.nk-win .nk-land, .nk-win .nk-clue{animation:bounceIn .5s backwards}
.nk-key{display:flex; flex-wrap:wrap; justify-content:center; gap:6px 16px; margin:12px 0 0; font:600 1.05rem var(--display); color:var(--on-table-soft)}
.nk-key span{display:inline-flex; align-items:center; gap:6px}
.nk-key i{width:28px; height:28px; border-radius:7px; font-size:16px}

/* ---- Frog Hop (fh-) ---- */
.fh-pond{position:relative; margin:0 auto; border-radius:28px; background:linear-gradient(180deg, #49B3E0, #2A82B6); box-shadow:inset 0 4px 12px rgba(0,0,0,.2), 0 7px 0 #1B5F87, 0 14px 24px rgba(0,0,0,.3)}
.fh-pad{position:absolute; border-radius:50%; background:radial-gradient(circle at 35% 30%, #9BE277, #4DA83A 70%); box-shadow:0 5px 0 #2E7A26, 0 8px 10px rgba(0,0,0,.2)}
.fh-pad::after{content:''; position:absolute; right:8%; top:44%; width:22%; height:12%; background:#3593C8; border-radius:4px; rotate:-20deg}
.fh-pad.fh-gap{outline:3px dashed rgba(255,255,255,.75); outline-offset:3px}
.fh-pc{position:absolute; border:0; padding:0; cursor:pointer; display:grid; place-items:center; transition:left .32s ease, top .32s ease; z-index:2}
.fh-pc.tile{box-shadow:inset 0 -5px 0 rgba(0,0,0,.16), inset 0 2px 0 rgba(255,255,255,.45), 0 4px 0 var(--d), 0 8px 12px rgba(0,0,0,.28)}
.fh-frog{border-radius:14px}
.fh-toad{--c:#C08A52; --d:#7C5128; border-radius:999px}
.fh-em{font-size:min(calc(var(--ps) * .7), 40px); line-height:1}
.fh-frog .fh-em{transform:scaleX(-1)}
.fh-toad .fh-em{filter:sepia(1) saturate(1.5) hue-rotate(-15deg) brightness(.85)}
.fh-ar{position:absolute; bottom:-8px; left:50%; translate:-50% 0; width:24px; height:24px; border-radius:50%; background:#fff; color:var(--ink); font:700 14px/24px var(--display); text-align:center; box-shadow:0 2px 0 rgba(0,0,0,.25)}
.fh-hop{animation:fhHop .34s ease}
@keyframes fhHop{45%{translate:0 -38%; scale:1.08}}
.fh-stuck{opacity:.55}
.fh-win .fh-pc{animation:bounceIn .5s backwards}
.fh-sides{display:flex; justify-content:space-between; max-width:560px; margin:10px auto 0; font:600 1.05rem var(--display); color:var(--on-table-soft); gap:10px}

/* ---- Colour Rows (cq-) ---- */
.cq-board{display:grid; gap:4px; margin:0 auto; width:max-content; padding:8px; border-radius:20px; background:#3A2C55; box-shadow:0 7px 0 #22183A, 0 14px 24px rgba(0,0,0,.3)}
.cq-cell{width:var(--cs); height:var(--cs); font:700 calc(var(--cs) * .46)/1 var(--display); color:rgba(255,255,255,.95); text-shadow:0 2px 0 rgba(0,0,0,.2); border-radius:18%}
.cq-cell.tile{box-shadow:inset 0 -5px 0 rgba(0,0,0,.16), inset 0 2px 0 rgba(255,255,255,.45), 0 3px 0 var(--d)}
.cq-cell.cq-ok{outline:3px solid rgba(255,255,255,.9); outline-offset:-3px}
.cq-cell.cq-move{animation:bounceIn .25s}
.cq-arr{border:0; padding:0; border-radius:12px; background:rgba(255,255,255,.2); color:#fff; font:700 calc(var(--as) * .5)/1 var(--display); cursor:pointer; box-shadow:inset 0 -3px 0 rgba(0,0,0,.25); display:grid; place-items:center}
.cq-arr:active{background:rgba(255,255,255,.4)}
.cq-tgt{display:flex; align-items:center; justify-content:center; gap:12px; margin:0 auto 12px; font:600 1.1rem var(--display); color:var(--on-table)}
.cq-mini{display:grid; gap:2px; padding:5px; border-radius:10px; background:rgba(0,0,0,.28)}
.cq-mini i{width:20px; height:20px; border-radius:5px; font:700 12px/20px var(--display); text-align:center; font-style:normal; color:#fff; background:var(--c)}
.cq-win .cq-cell{animation:bounceIn .5s backwards}
`);

  register({ id: 'lamps', cat: 'logic', order: 24, name: 'Lamp Rooms', icon: '💡', desc: 'Place lamps to light every room', start: startLamps });
  register({ id: 'fence', cat: 'logic', order: 25, name: 'Fence It', icon: '🪵', desc: 'Draw one fence loop to fit the numbers', start: startFence });
  register({ id: 'islands', cat: 'logic', order: 26, name: 'Islands', icon: '🏝️', desc: 'Find the islands and the sea around them', start: startIslands });
  register({ id: 'froghop', cat: 'logic', order: 27, name: 'Frog Hop', icon: '🐸', desc: 'Swap the frogs and toads across the pond', start: startFrog });
  register({ id: 'colourrows', cat: 'logic', order: 28, name: 'Colour Rows', icon: '🌈', desc: 'Slide rows and columns to sort colours', start: startRows });

  /* ---------- shared bits ---------- */
  const stageW = api => Math.max(280, Math.min(api.stage.clientWidth || 340, 1000));
  const mkBtn = (cls, html, fn) => { const b = el('button', cls, html); b.type = 'button'; if (fn) b.onclick = fn; return b; };
  const now = () => (window.performance ? performance.now() : Date.now());
  const rise = k => { for (let i = 0; i < k; i++) tone(440 * Math.pow(1.19, i), .14, 'triangle', .1, i * .08); };
  // largest n (down to lo) whose cells stay at least min px across
  const fitN = (W, want, min, gap, lo = 3) => { let n = want; while (n > lo && n * min + (n - 1) * gap > W) n--; return n; };
  function ctlBar(undo, hint) {
    const u = mkBtn('btn c-card', '↶ Undo', undo), h = mkBtn('btn c-sun', '💡 Hint', hint), bar = el('div', 'l6-bar');
    bar.append(u, h); return { bar, u, h };
  }
  function glow(e) { e.classList.remove('l6-glow'); void e.offsetWidth; e.classList.add('l6-glow'); }
  const NB = {};
  function nbs(n) {
    if (NB[n]) return NB[n];
    const n4 = [];
    for (let i = 0; i < n * n; i++) {
      const r = (i / n) | 0, c = i % n, a = [];
      if (r > 0) a.push(i - n); if (r < n - 1) a.push(i + n); if (c > 0) a.push(i - 1); if (c < n - 1) a.push(i + 1);
      n4.push(a);
    }
    return (NB[n] = { n4 });
  }

  /* =========================================================
     1. LAMP ROOMS (light-up)
     ========================================================= */
  function lampSight(n, wall) {
    const sight = [];
    for (let i = 0; i < n * n; i++) {
      const s = [];
      if (!wall[i]) {
        const r = (i / n) | 0, c = i % n;
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          let rr = r + dr, cc = c + dc;
          while (rr >= 0 && cc >= 0 && rr < n && cc < n && !wall[rr * n + cc]) { s.push(rr * n + cc); rr += dr; cc += dc; }
        }
      }
      sight.push(s);
    }
    return sight;
  }
  // counts lamp layouts (up to limit); clue[i] = -1 for no number
  function solveLamps(n, wall, clue, limit = 2, budget = 120000, given = null) {
    const N = n * n, sight = lampSight(n, wall), { n4 } = nbs(n), whites = [], clues = [];
    for (let i = 0; i < N; i++) { if (!wall[i]) whites.push(i); else if (clue[i] >= 0) clues.push(i); }
    let count = 0, steps = 0, sol = null;
    function prop(st) {
      let ch = true;
      while (ch) {
        ch = false;
        for (const i of whites) if (st[i] === 1) for (const j of sight[i]) { if (st[j] === 1) return false; if (st[j] === -1) { st[j] = 0; ch = true; } }
        for (const w of clues) {
          let L = 0, U = 0;
          for (const j of n4[w]) if (!wall[j]) { if (st[j] === 1) L++; else if (st[j] === -1) U++; }
          const k = clue[w];
          if (L > k || L + U < k) return false;
          if (!U) continue;
          if (L === k) { for (const j of n4[w]) if (!wall[j] && st[j] === -1) st[j] = 0; ch = true; }
          else if (L + U === k) { for (const j of n4[w]) if (!wall[j] && st[j] === -1) st[j] = 1; ch = true; }
        }
        for (const i of whites) {
          if (st[i] === 1) continue;
          let lit = false, nc = 0, cand = -1;
          for (const j of sight[i]) { if (st[j] === 1) { lit = true; break; } if (st[j] === -1) { nc++; cand = j; } }
          if (lit) continue;
          if (st[i] === -1) { nc++; cand = i; }
          if (!nc) return false;
          if (nc === 1) { st[cand] = 1; ch = true; }
        }
      }
      return true;
    }
    function rec(st) {
      if (count >= limit || ++steps > budget) return;
      if (!prop(st)) return;
      let best = -1, bn = 99;
      for (const i of whites) {
        if (st[i] === 1) continue;
        let lit = false, nc = 0, cand = -1;
        for (const j of sight[i]) { if (st[j] === 1) { lit = true; break; } if (st[j] === -1) { nc++; if (cand < 0) cand = j; } }
        if (lit) continue;
        if (st[i] === -1) { nc++; if (cand < 0) cand = i; }
        if (nc < bn) { bn = nc; best = cand; }
      }
      if (best < 0) {
        const s2 = Int8Array.from(st, x => (x === 1 ? 1 : 0));
        for (const w of clues) { let L = 0; for (const j of n4[w]) if (s2[j]) L++; if (L !== clue[w]) return; }
        count++; sol = s2; return;
      }
      const a = st.slice(); a[best] = 1; rec(a);
      if (count >= limit) return;
      const b = st.slice(); b[best] = 0; rec(b);
    }
    const st0 = new Int8Array(N).fill(-1);
    for (let i = 0; i < N; i++) { if (wall[i]) st0[i] = 0; else if (given && given[i]) st0[i] = 1; }
    rec(st0);
    return { count: steps > budget ? 99 : count, sol };
  }
  function makeLamps(n, L) {
    const N = n * n, { n4 } = nbs(n), t0 = now();
    const frac = Math.min(.85, (L - 1) * .17);
    let last = null;
    for (let a = 0; a < 300; a++) {
      const wall = new Uint8Array(N), dens = .16 + Math.random() * .1;
      for (let i = 0; i < N; i++) if (!wall[i] && Math.random() < dens) { wall[i] = 1; wall[N - 1 - i] = 1; }
      const whites = [...Array(N).keys()].filter(i => !wall[i]);
      if (whites.length < N * .6) continue;
      const sight = lampSight(n, wall), lamp = new Uint8Array(N), lit = new Uint8Array(N);
      for (const i of shuffle(whites.slice())) if (!lit[i]) { lamp[i] = 1; lit[i] = 1; sight[i].forEach(j => { lit[j] = 1; }); }
      const clue = new Int8Array(N).fill(-1);
      for (let i = 0; i < N; i++) if (wall[i]) clue[i] = n4[i].filter(j => lamp[j]).length;
      last = { wall, clue, lamp };
      if (solveLamps(n, wall, clue).count !== 1) { if (now() - t0 > 900) break; continue; }
      for (const w of shuffle([...Array(N).keys()].filter(i => wall[i]))) {
        if (Math.random() >= frac) continue;
        const k = clue[w]; clue[w] = -1;
        if (solveLamps(n, wall, clue).count !== 1) clue[w] = k;
      }
      return { wall, clue, lamp, given: new Uint8Array(N) };
    }
    // very unlikely: pre-place lamps until the answer is the only one
    const { wall, clue, lamp } = last, given = new Uint8Array(N);
    for (const i of shuffle([...Array(N).keys()].filter(i => lamp[i]))) {
      given[i] = 1;
      if (solveLamps(n, wall, clue, 2, 300000, given).count === 1) break;
    }
    return { wall, clue, lamp, given };
  }
  function startLamps(L, api) {
    const W = Math.min(stageW(api), 600), g = 3;
    const want = L <= 2 ? 5 : L <= 4 ? 6 : L <= 8 ? 7 : 8;
    const n = fitN(W - 12, want, 40, g, 5), N = n * n;
    const P = makeLamps(n, L);
    const cs = Math.floor(Math.min(56, (W - 12 - (n - 1) * g) / n));
    const sight = lampSight(n, P.wall), { n4 } = nbs(n);
    const p = new Int8Array(N); // 0 empty, 1 lamp, 2 no-lamp dot
    for (let i = 0; i < N; i++) if (P.given[i]) p[i] = 1;
    const whites = [...Array(N).keys()].filter(i => !P.wall[i]);
    let mistakes = 0, hints = 0, finished = false; const hist = [];
    const base = 'Light every white square. A lamp 💡 shines along its row and column until a wall. Lamps must not shine on each other. A number says how many lamps touch that wall.';
    api.hint(base);
    const info = el('p', 'l6-info');
    const board = el('div', 'lp-board');
    board.style.cssText = `--cs:${cs}px; grid-template-columns:repeat(${n}, ${cs}px)`;
    const cells = [];
    for (let i = 0; i < N; i++) {
      const b = P.wall[i] ? el('div', 'lp-cell lp-wall') : mkBtn('lp-cell', '', () => tap(i));
      board.append(b); cells.push(b);
    }
    const key = el('div', 'lp-key', '<span>Tap: <i class="tile c-sun">💡</i> lamp, then <i class="lp-cell lp-dot" style="--cs:28px"></i> no lamp, then clear</span>');
    const C = ctlBar(undo, hint);
    api.stage.append(info, board, key, C.bar);
    const litArr = () => { const lit = new Uint8Array(N); for (let i = 0; i < N; i++) if (p[i] === 1) { lit[i] = 1; sight[i].forEach(j => { lit[j] = 1; }); } return lit; };
    const clash = i => p[i] === 1 && sight[i].some(j => p[j] === 1);
    const have = w => n4[w].filter(j => p[j] === 1).length;
    function render(pop) {
      const lit = litArr();
      cells.forEach((b, i) => {
        if (P.wall[i]) {
          const k = P.clue[i]; let cls = 'lp-cell lp-wall';
          if (k >= 0) { const h = have(i); if (h === k) cls += ' lp-ok'; else if (h > k) cls += ' lp-over'; }
          b.className = cls; b.textContent = k >= 0 ? String(k) : ''; return;
        }
        if (p[i] === 1) {
          b.className = 'lp-cell tile ' + (clash(i) ? 'c-coral lp-bad' : 'c-sun') + (pop === i ? ' lp-pop' : '');
          b.textContent = '💡'; b.setAttribute('aria-label', 'Lamp');
        } else {
          b.className = 'lp-cell' + (lit[i] ? ' lp-lit' : '') + (p[i] === 2 ? ' lp-dot' : '');
          b.textContent = ''; b.setAttribute('aria-label', (lit[i] ? 'Lit' : 'Dark') + ' square' + (p[i] === 2 ? ', no lamp' : ''));
        }
      });
      const nl = whites.filter(i => lit[i]).length;
      info.innerHTML = `Lit: <b>${nl}</b> of <b>${whites.length}</b> squares`;
      C.u.disabled = !hist.length || finished;
    }
    function tap(i) {
      if (finished) return;
      if (P.given[i]) { wob(cells[i]); return; }
      hist.push(p.slice());
      p[i] = (p[i] + 1) % 3;
      if (p[i] === 1) {
        const over = n4[i].some(w => P.wall[w] && P.clue[w] >= 0 && have(w) > P.clue[w]);
        if (clash(i)) { mistakes++; sfx.soft(); wob(cells[i]); api.hint('Oops, two lamps are shining on each other. Tap the red lamp to change it.'); }
        else if (over) { mistakes++; sfx.soft(); wob(cells[i]); api.hint('That wall now touches too many lamps. Tap the lamp again to change it.'); }
        else { tone(560 + randInt(4) * 40, .12, 'triangle', .11); api.hint(base); }
      } else sfx.tap();
      render(i); check();
    }
    function solvedNow() {
      const lit = litArr();
      if (!whites.every(i => lit[i])) return false;
      if (whites.some(clash)) return false;
      for (let i = 0; i < N; i++) if (P.wall[i] && P.clue[i] >= 0 && have(i) !== P.clue[i]) return false;
      return true;
    }
    function check() {
      if (!solvedNow()) return;
      finished = true; board.classList.add('lp-win'); render();
      rise(5); toast(cheer()); api.hint('Every room is bright. Lovely work!');
      api.done(starsFor(mistakes + hints, 1, 3));
    }
    function undo() { if (!hist.length || finished) return; p.set(hist.pop()); sfx.tap(); render(); api.hint(base); }
    function hint() {
      if (finished) return;
      let d = whites.find(i => p[i] === 1 && !P.lamp[i]);
      let msg = 'This lamp is not needed here, so it is gone now.';
      if (d === undefined) { d = whites.find(i => p[i] === 2 && P.lamp[i]); msg = 'A lamp belongs here.'; }
      if (d === undefined) { const miss = whites.filter(i => P.lamp[i] && p[i] !== 1); d = pick(miss); msg = 'Here is a lamp for you.'; }
      if (d === undefined) return;
      hist.push(p.slice()); hints++;
      p[d] = P.lamp[d] ? 1 : 2;
      sfx.tap(); render(d); glow(cells[d]); api.hint(msg);
      check();
    }
    render();
    if (TEST) api.stage.__auto = () => { for (const i of whites) if (P.lamp[i]) { let s = 0; while (p[i] !== 1 && s++ < 3) cells[i].click(); } };
    if (TEST) api.stage.__info = () => ({ n, cs, unique: solveLamps(n, P.wall, P.clue, 2, 2000000, P.given).count === 1, clues: [...P.clue].filter(x => x >= 0).length, givens: P.given.filter(Boolean).length });
  }

  /* =========================================================
     2. FENCE IT (slitherlink)
     ========================================================= */
  const FT = {};
  function fTopo(n) {
    if (FT[n]) return FT[n];
    const HN = (n + 1) * n, E = 2 * n * (n + 1), V = (n + 1) * (n + 1);
    const H = (r, c) => r * n + c, Vt = (r, c) => HN + r * (n + 1) + c;
    const vEdges = [], cEdges = [], ends = [], sides = [], geo = [];
    for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++) {
      const a = [];
      if (c > 0) a.push(H(r, c - 1)); if (c < n) a.push(H(r, c));
      if (r > 0) a.push(Vt(r - 1, c)); if (r < n) a.push(Vt(r, c));
      vEdges.push(a);
    }
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) cEdges.push([H(r, c), H(r + 1, c), Vt(r, c), Vt(r, c + 1)]);
    for (let r = 0; r <= n; r++) for (let c = 0; c < n; c++) {
      ends.push([r * (n + 1) + c, r * (n + 1) + c + 1]);
      sides.push([r > 0 ? (r - 1) * n + c : -1, r < n ? r * n + c : -1]);
      geo.push({ h: 1, r, c });
    }
    for (let r = 0; r < n; r++) for (let c = 0; c <= n; c++) {
      ends.push([r * (n + 1) + c, (r + 1) * (n + 1) + c]);
      sides.push([c > 0 ? r * n + c - 1 : -1, c < n ? r * n + c : -1]);
      geo.push({ h: 0, r, c });
    }
    return (FT[n] = { HN, E, V, vEdges, cEdges, ends, sides, geo });
  }
  function regionOK(n, ins) {
    const N = n * n, at = (r, c) => (r < 0 || c < 0 || r >= n || c >= n ? 0 : ins[r * n + c]);
    for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++) {
      const a = at(r - 1, c - 1), b = at(r - 1, c), x = at(r, c - 1), d = at(r, c);
      if ((a && d && !b && !x) || (b && x && !a && !d)) return false;
    }
    const seen = new Uint8Array(N), q = [], { n4 } = nbs(n);
    for (let i = 0; i < N; i++) {
      const r = (i / n) | 0, c = i % n;
      if (!ins[i] && (r === 0 || c === 0 || r === n - 1 || c === n - 1)) { seen[i] = 1; q.push(i); }
    }
    while (q.length) { const i = q.pop(); for (const j of n4[i]) if (!ins[j] && !seen[j]) { seen[j] = 1; q.push(j); } }
    for (let i = 0; i < N; i++) if (!ins[i] && !seen[i]) return false;
    return true;
  }
  function genRegion(n, target) {
    const N = n * n, { n4 } = nbs(n);
    for (let a = 0; a < 200; a++) {
      const ins = new Uint8Array(N); ins[randInt(N)] = 1; let size = 1;
      while (size < target) {
        const fr = shuffle([...Array(N).keys()].filter(i => !ins[i] && n4[i].some(j => ins[j])));
        let ok = false;
        for (const f of fr) { ins[f] = 1; if (regionOK(n, ins)) { ok = true; break; } ins[f] = 0; }
        if (!ok) break; size++;
      }
      if (size >= target) return ins;
    }
    return null;
  }
  // -1: a closed loop that leaves other fence out, 0: open, 1: one closed loop holding all fence
  function loopState(T, st) {
    const { E, vEdges, ends } = T;
    let total = 0; for (let e = 0; e < E; e++) if (st[e] === 1) total++;
    if (!total) return 0;
    const other = (e, v) => (ends[e][0] === v ? ends[e][1] : ends[e][0]);
    const next = (v, prev) => { for (const e of vEdges[v]) if (e !== prev && st[e] === 1) return e; return -1; };
    const seen = new Uint8Array(E);
    for (let e0 = 0; e0 < E; e0++) {
      if (st[e0] !== 1 || seen[e0]) continue;
      seen[e0] = 1; let len = 1, prev = e0, v = ends[e0][1], closed = false;
      for (;;) { const nx = next(v, prev); if (nx < 0) break; if (nx === e0) { closed = true; break; } if (seen[nx]) break; seen[nx] = 1; len++; v = other(nx, v); prev = nx; }
      if (closed) return len === total ? 1 : -1;
      prev = e0; v = ends[e0][0];
      for (;;) { const nx = next(v, prev); if (nx < 0 || seen[nx]) break; seen[nx] = 1; len++; v = other(nx, v); prev = nx; }
    }
    return 0;
  }
  function solveFence(n, clue, limit = 2, budget = 150000) {
    const T = fTopo(n), { E, V, vEdges, cEdges } = T, clues = [];
    for (let i = 0; i < n * n; i++) if (clue[i] >= 0) clues.push(i);
    let count = 0, steps = 0, sol = null;
    function prop(st) {
      let ch = true;
      while (ch) {
        ch = false;
        for (let v = 0; v < V; v++) {
          let c1 = 0, u = 0, ue = -1;
          for (const e of vEdges[v]) { if (st[e] === 1) c1++; else if (st[e] === -1) { u++; ue = e; } }
          if (c1 > 2) return false;
          if (!u) { if (c1 === 1) return false; continue; }
          if (c1 === 2) { for (const e of vEdges[v]) if (st[e] === -1) st[e] = 0; ch = true; }
          else if (c1 === 1 && u === 1) { st[ue] = 1; ch = true; }
          else if (c1 === 0 && u === 1) { st[ue] = 0; ch = true; }
        }
        for (const i of clues) {
          let c1 = 0, u = 0;
          for (const e of cEdges[i]) { if (st[e] === 1) c1++; else if (st[e] === -1) u++; }
          const k = clue[i];
          if (c1 > k || c1 + u < k) return false;
          if (!u) continue;
          if (c1 === k) { for (const e of cEdges[i]) if (st[e] === -1) st[e] = 0; ch = true; }
          else if (c1 + u === k) { for (const e of cEdges[i]) if (st[e] === -1) st[e] = 1; ch = true; }
        }
      }
      return true;
    }
    function rec(st) {
      if (count >= limit || ++steps > budget) return;
      if (!prop(st)) return;
      const ls = loopState(T, st);
      if (ls < 0) return;
      if (ls === 1) {
        const s2 = Int8Array.from(st, x => (x === 1 ? 1 : 0));
        for (const i of clues) { let c1 = 0; for (const e of cEdges[i]) c1 += s2[e]; if (c1 !== clue[i]) return; }
        count++; sol = s2; return;
      }
      let pe = -1;
      for (let v = 0; v < V && pe < 0; v++) {
        let c1 = 0, ue = -1;
        for (const e of vEdges[v]) { if (st[e] === 1) c1++; else if (st[e] === -1 && ue < 0) ue = e; }
        if (c1 === 1 && ue >= 0) pe = ue;
      }
      if (pe < 0) {
        let bk = -1;
        for (const i of clues) { if (clue[i] <= bk) continue; const ue = cEdges[i].find(e => st[e] === -1); if (ue !== undefined) { pe = ue; bk = clue[i]; } }
      }
      if (pe < 0) for (let e = 0; e < E; e++) if (st[e] === -1) { pe = e; break; }
      if (pe < 0) return;
      const a = st.slice(); a[pe] = 1; rec(a);
      if (count >= limit) return;
      const b = st.slice(); b[pe] = 0; rec(b);
    }
    rec(new Int8Array(E).fill(-1));
    return { count: steps > budget ? 99 : count, sol };
  }
  function makeFence(n, L) {
    const N = n * n, T = fTopo(n), t0 = now();
    const keep = Math.max(.25, .85 - (L - 1) * .11); // share of removable clues we leave in
    for (let a = 0; a < 80; a++) {
      const target = Math.max(2, Math.round(N * (.38 + Math.random() * .22)));
      const ins = genRegion(n, Math.min(target, N - 2)); if (!ins) continue;
      const loop = new Uint8Array(T.E);
      for (let e = 0; e < T.E; e++) { const [x, y] = T.sides[e]; loop[e] = (x >= 0 && ins[x] ? 1 : 0) !== (y >= 0 && ins[y] ? 1 : 0) ? 1 : 0; }
      const clue = new Int8Array(N);
      for (let i = 0; i < N; i++) clue[i] = T.cEdges[i].reduce((s, e) => s + loop[e], 0);
      if (solveFence(n, clue).count !== 1) continue;
      const order = shuffle([...Array(N).keys()]);
      for (const i of order) {
        if (Math.random() < keep) continue;
        const k = clue[i]; clue[i] = -1;
        if (solveFence(n, clue).count !== 1) clue[i] = k;
        if (now() - t0 > 1500) break;
      }
      return { loop, clue };
    }
    // fallback: the border of the whole board minus a corner, all clues shown
    const ins = new Uint8Array(N).fill(1); ins[0] = 0;
    const loop = new Uint8Array(T.E);
    for (let e = 0; e < T.E; e++) { const [x, y] = T.sides[e]; loop[e] = (x >= 0 && ins[x] ? 1 : 0) !== (y >= 0 && ins[y] ? 1 : 0) ? 1 : 0; }
    const clue = new Int8Array(N); for (let i = 0; i < N; i++) clue[i] = T.cEdges[i].reduce((s, e) => s + loop[e], 0);
    return { loop, clue };
  }
  function startFence(L, api) {
    const W = Math.min(stageW(api), 560);
    const want = L <= 1 ? 3 : L <= 3 ? 4 : L <= 5 ? 5 : 6;
    let n = want; while (n > 3 && W / (n + 1) < 44) n--;
    const P = makeFence(n, L), T = fTopo(n), N = n * n, E = T.E;
    const cs = Math.floor(Math.min(84, W / (n + 1))), pad = cs / 2;
    const th = Math.max(8, Math.round(cs * .17)), ds = Math.max(10, Math.round(cs * .2)), hs = Math.round(cs / Math.SQRT2);
    const p = new Int8Array(E); // 0 empty, 1 fence, 2 cross
    let mistakes = 0, hints = 0, finished = false; const hist = [];
    const base = 'Draw one closed fence loop along the dotted lines. Each number says how many of its four sides are fence. Tap a line: fence, then ✕ for no fence, then clear.';
    api.hint(base);
    const info = el('p', 'l6-info');
    const board = el('div', 'fn-board');
    board.style.cssText = `--cs:${cs}px; width:${(n + 1) * cs}px; height:${(n + 1) * cs}px`;
    const nums = [];
    for (let i = 0; i < N; i++) {
      const r = (i / n) | 0, c = i % n, d = el('div', 'fn-num', P.clue[i] >= 0 ? `<span>${P.clue[i]}</span>` : '');
      d.style.cssText = `left:${pad + c * cs}px; top:${pad + r * cs}px; width:${cs}px; height:${cs}px`;
      board.append(d); nums.push(d);
    }
    const bars = [], hits = [];
    for (let e = 0; e < E; e++) {
      const { h, r, c } = T.geo[e], b = el('div', 'fn-e ' + (h ? 'fn-h' : 'fn-v'));
      if (h) b.style.cssText = `left:${pad + c * cs}px; top:${pad + r * cs - th / 2}px; width:${cs}px; height:${th}px`;
      else b.style.cssText = `left:${pad + c * cs - th / 2}px; top:${pad + r * cs}px; width:${th}px; height:${cs}px`;
      board.append(b); bars.push(b);
    }
    const dots = [];
    for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++) {
      const d = el('div', 'fn-dot'); d.style.cssText = `left:${pad + c * cs - ds / 2}px; top:${pad + r * cs - ds / 2}px; width:${ds}px; height:${ds}px`;
      board.append(d); dots.push(d);
    }
    for (let e = 0; e < E; e++) {
      const { h, r, c } = T.geo[e], mx = pad + (h ? (c + .5) * cs : c * cs), my = pad + (h ? r * cs : (r + .5) * cs);
      const b = mkBtn('fn-hit', '', () => tap(e));
      b.style.cssText = `left:${mx - hs / 2}px; top:${my - hs / 2}px; width:${hs}px; height:${hs}px`;
      b.setAttribute('aria-label', (h ? 'Line across' : 'Line down') + ' at row ' + (r + 1) + ', column ' + (c + 1));
      board.append(b); hits.push(b);
    }
    const C = ctlBar(undo, hint);
    api.stage.append(info, board, C.bar);
    const deg = v => T.vEdges[v].reduce((s, e) => s + (p[e] === 1 ? 1 : 0), 0);
    const cnt = i => T.cEdges[i].reduce((s, e) => s + (p[e] === 1 ? 1 : 0), 0);
    function render(pop) {
      const badV = new Uint8Array(T.V);
      for (let v = 0; v < T.V; v++) { badV[v] = deg(v) > 2 ? 1 : 0; dots[v].classList.toggle('fn-bad', !!badV[v]); }
      bars.forEach((b, e) => {
        const bad = p[e] === 1 && (badV[T.ends[e][0]] || badV[T.ends[e][1]]);
        b.className = 'fn-e ' + (T.geo[e].h ? 'fn-h' : 'fn-v') + ' fn-' + p[e] + (bad ? ' fn-bad' : '') + (pop === e ? ' fn-pop' : '');
        hits[e].setAttribute('aria-pressed', String(p[e] === 1));
      });
      let done = 0, tot = 0;
      nums.forEach((d, i) => {
        const k = P.clue[i]; if (k < 0) return; tot++;
        const h = cnt(i); d.classList.toggle('fn-ok', h === k); d.classList.toggle('fn-over', h > k); if (h === k) done++;
      });
      info.innerHTML = `Numbers matched: <b>${done}</b> of <b>${tot}</b>`;
      C.u.disabled = !hist.length || finished;
    }
    function tap(e) {
      if (finished) return;
      hist.push(p.slice());
      p[e] = (p[e] + 1) % 3;
      if (p[e] === 1) {
        const [a, b] = T.ends[e], over = T.sides[e].some(i => i >= 0 && P.clue[i] >= 0 && cnt(i) > P.clue[i]);
        if (deg(a) > 2 || deg(b) > 2) { mistakes++; sfx.soft(); api.hint('Oops, the fence can’t branch. Each post joins just two pieces. Tap the red piece again to change it.'); }
        else if (over) { mistakes++; sfx.soft(); api.hint('That number now has too many fence sides. Tap the piece again to change it.'); }
        else { tone(480 + randInt(5) * 30, .1, 'triangle', .1); api.hint(base); }
      } else sfx.tap();
      render(e); check();
    }
    function solvedNow() {
      for (let i = 0; i < N; i++) if (P.clue[i] >= 0 && cnt(i) !== P.clue[i]) return false;
      for (let v = 0; v < T.V; v++) { const d = deg(v); if (d !== 0 && d !== 2) return false; }
      return loopState(T, Int8Array.from(p, x => (x === 1 ? 1 : 0))) === 1;
    }
    function check() {
      if (!solvedNow()) return;
      finished = true; for (let e = 0; e < E; e++) if (p[e] === 2) p[e] = 0;
      board.classList.add('fn-win'); render();
      rise(5); toast(cheer()); api.hint('The fence goes all the way round. Beautifully done!');
      api.done(starsFor(mistakes + hints, 1, 3));
    }
    function undo() { if (!hist.length || finished) return; p.set(hist.pop()); sfx.tap(); render(); api.hint(base); }
    function hint() {
      if (finished) return;
      const all = [...Array(E).keys()];
      let d = all.find(e => p[e] === 1 && !P.loop[e]), msg = 'This piece is not part of the fence, so it is crossed out now.';
      if (d === undefined) { d = all.find(e => p[e] === 2 && P.loop[e]); msg = 'This line does need a fence.'; }
      if (d === undefined) {
        // a missing piece next to the fence already drawn, if possible
        const miss = all.filter(e => P.loop[e] && p[e] !== 1);
        const near = miss.filter(e => T.ends[e].some(v => deg(v) === 1));
        d = near.length ? pick(near) : pick(miss); msg = 'Here is a piece of fence for you.';
      }
      if (d === undefined) return;
      hist.push(p.slice()); hints++;
      p[d] = P.loop[d] ? 1 : 2;
      sfx.tap(); render(d); glow(hits[d]); api.hint(msg);
      check();
    }
    render();
    if (TEST) api.stage.__auto = () => { for (let e = 0; e < E; e++) if (P.loop[e]) { let s = 0; while (p[e] !== 1 && s++ < 3) hits[e].click(); } };
    if (TEST) api.stage.__info = () => ({ n, cs, unique: solveFence(n, P.clue, 2, 2000000).count === 1, clues: [...P.clue].filter(x => x >= 0).length });
  }

  /* =========================================================
     3. ISLANDS (nurikabe)
     ========================================================= */
  function polyos(n, cell, size, allowed) {
    const { n4 } = nbs(n);
    let cur = [[cell]];
    for (let k = 1; k < size; k++) {
      const seen = new Set(), nx = [];
      for (const s of cur) {
        for (const x of s) for (const y of n4[x]) {
          if (!allowed[y] || s.includes(y)) continue;
          const t = s.concat(y).sort((a, b) => a - b), key = t.join(',');
          if (seen.has(key)) continue; seen.add(key); nx.push(t);
        }
      }
      cur = nx; if (!cur.length) break;
    }
    return cur.filter(s => s.length === size);
  }
  // given: 1 = known sea, 2 = known land
  function solveIslands(n, clue, given, limit = 2, budget = 150000) {
    const N = n * n, { n4 } = nbs(n), cl = [];
    for (let i = 0; i < N; i++) if (clue[i] > 0) cl.push(i);
    const shapes = cl.map(c => {
      const allowed = new Uint8Array(N).fill(1);
      for (const o of cl) if (o !== c) { allowed[o] = 0; n4[o].forEach(j => { allowed[j] = 0; }); }
      for (let i = 0; i < N; i++) if (given[i] === 1) allowed[i] = 0;
      return polyos(n, c, clue[c], allowed);
    });
    if (shapes.some(s => !s.length)) return { count: 0, sol: null };
    const order = cl.map((_, k) => k).sort((a, b) => shapes[a].length - shapes[b].length);
    const reach = cl.map((_, k) => { const s = new Set(); shapes[k].forEach(sh => sh.forEach(x => s.add(x))); return [...s]; });
    const rem = new Int16Array(N); reach.forEach(r => r.forEach(x => { rem[x]++; }));
    const occ = new Int16Array(N), block = new Int16Array(N);
    let count = 0, steps = 0, sol = null;
    const dead = i => !occ[i] && !rem[i];
    const fits = sh => { for (const x of sh) if (occ[x] || block[x]) return false; return true; };
    function bad() {
      for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) {
        const i = r * n + c;
        if (dead(i) && dead(i + 1) && dead(i + n) && dead(i + n + 1)) return true;
      }
      for (let i = 0; i < N; i++) if (given[i] === 2 && dead(i)) return true;
      return false;
    }
    function seaOK() {
      let start = -1, tot = 0;
      for (let i = 0; i < N; i++) if (!occ[i]) { tot++; if (start < 0) start = i; }
      if (start < 0) return false;
      const seen = new Uint8Array(N), q = [start]; seen[start] = 1; let got = 1;
      while (q.length) { const i = q.pop(); for (const j of n4[i]) if (!occ[j] && !seen[j]) { seen[j] = 1; got++; q.push(j); } }
      return got === tot;
    }
    function rec(k) {
      if (count >= limit || ++steps > budget) return;
      if (k === order.length) {
        if (!seaOK()) return;
        count++; sol = Uint8Array.from(occ, x => (x ? 1 : 0)); return;
      }
      const ci = order[k];
      for (const sh of shapes[ci]) {
        if (!fits(sh)) continue;
        for (const x of sh) { occ[x] = ci + 1; block[x]++; for (const y of n4[x]) block[y]++; }
        for (const x of reach[ci]) rem[x]--;
        let ok = !bad();
        if (ok) for (let j = k + 1; j < order.length && ok; j++) ok = shapes[order[j]].some(fits);
        if (ok) rec(k + 1);
        for (const x of reach[ci]) rem[x]++;
        for (const x of sh) { occ[x] = 0; block[x]--; for (const y of n4[x]) block[y]--; }
        if (count >= limit || steps > budget) return;
      }
    }
    rec(0);
    return { count: steps > budget ? 99 : count, sol };
  }
  function genIslands(n, maxS) {
    const N = n * n, { n4 } = nbs(n);
    const compSize = (land, c) => { const seen = new Set([c]), q = [c]; while (q.length) { const i = q.pop(); for (const j of n4[i]) if (land[j] && !seen.has(j)) { seen.add(j); q.push(j); } } return seen.size; };
    const seaConn = land => {
      let start = -1, tot = 0; for (let i = 0; i < N; i++) if (!land[i]) { tot++; if (start < 0) start = i; }
      if (start < 0) return false;
      const seen = new Uint8Array(N), q = [start]; seen[start] = 1; let got = 1;
      while (q.length) { const i = q.pop(); for (const j of n4[i]) if (!land[j] && !seen[j]) { seen[j] = 1; got++; q.push(j); } }
      return got === tot;
    };
    for (let a = 0; a < 200; a++) {
      const land = new Uint8Array(N); let fail = false;
      for (let guard = 0; guard < N * 4; guard++) {
        const pools = [];
        for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) { const i = r * n + c; if (!land[i] && !land[i + 1] && !land[i + n] && !land[i + n + 1]) pools.push(i); }
        if (!pools.length) break;
        const p0 = pick(pools); let ok = false;
        for (const c of shuffle([p0, p0 + 1, p0 + n, p0 + n + 1])) {
          land[c] = 1;
          if (compSize(land, c) <= maxS && seaConn(land)) { ok = true; break; }
          land[c] = 0;
        }
        if (!ok) { fail = true; break; }
      }
      if (fail) continue;
      const clue = new Int8Array(N), seen = new Uint8Array(N);
      for (let i = 0; i < N; i++) if (land[i] && !seen[i]) {
        const comp = [i]; seen[i] = 1;
        for (let q = 0; q < comp.length; q++) for (const j of n4[comp[q]]) if (land[j] && !seen[j]) { seen[j] = 1; comp.push(j); }
        clue[pick(comp)] = comp.length;
      }
      return { land, clue };
    }
    return null;
  }
  function makeIslands(n, maxS) {
    const N = n * n, t0 = now();
    let best = null;
    for (let a = 0; a < 60; a++) {
      const G = genIslands(n, maxS); if (!G) continue;
      const given = new Int8Array(N);
      let res = solveIslands(n, G.clue, given);
      if (res.count === 1) return { ...G, given };
      if (res.count === 99) { if (now() - t0 > 1200) break; continue; }
      // pin down a few squares until there is only one answer
      for (let g = 0; g < 6 && res.count === 2; g++) {
        const diff = [...Array(N).keys()].filter(i => !G.clue[i] && !given[i] && !!G.land[i] !== !!res.sol[i]);
        const seaD = diff.filter(i => !G.land[i]);
        const d = pick(seaD.length ? seaD : diff); if (d === undefined) break;
        given[d] = G.land[d] ? 2 : 1;
        res = solveIslands(n, G.clue, given);
      }
      if (res.count === 1) { const gc = given.filter(Boolean).length; if (!best || gc < best.gc) best = { ...G, given, gc }; if (gc <= 1) return best; }
      if (now() - t0 > 1200 && best) break;
    }
    if (best) return best;
    // fallback: show every sea square, so the answer is certain
    let G = null; while (!G) G = genIslands(n, Math.min(maxS, 3));
    const given = new Int8Array(N);
    for (let i = 0; i < N; i++) if (!G.land[i] && !G.clue[i]) given[i] = 1;
    return { ...G, given };
  }
  function startIslands(L, api) {
    const W = Math.min(stageW(api), 600), g = 3;
    const want = L <= 2 ? 5 : L <= 5 ? 6 : 7;
    const n = fitN(W - 12, want, 40, g, 5), N = n * n;
    const maxS = n <= 5 ? (L <= 1 ? 3 : 4) : L <= 4 ? 4 : 5;
    const P = makeIslands(n, maxS), { n4 } = nbs(n);
    const cs = Math.floor(Math.min(56, (W - 12 - (n - 1) * g) / n));
    const p = new Int8Array(N); // 0 blank, 1 sea, 2 island dot
    for (let i = 0; i < N; i++) if (P.given[i]) p[i] = P.given[i] === 1 ? 1 : 2;
    const fixed = i => !!P.clue[i] || !!P.given[i];
    let mistakes = 0, hints = 0, finished = false; const hist = [];
    const base = 'Each number is an island with that many squares. Islands never touch side by side. All the sea joins up, with no 2×2 pools of sea. Tap: sea, then island dot, then clear.';
    api.hint(base);
    const info = el('p', 'l6-info');
    const board = el('div', 'nk-board');
    board.style.cssText = `--cs:${cs}px; grid-template-columns:repeat(${n}, ${cs}px)`;
    const cells = [];
    for (let i = 0; i < N; i++) { const b = P.clue[i] ? el('div', 'nk-cell nk-clue', String(P.clue[i])) : mkBtn('nk-cell', '', () => tap(i)); board.append(b); cells.push(b); }
    const key = el('div', 'nk-key', '<span><i class="nk-cell nk-sea" style="--cs:28px"></i>Sea</span><span><i class="nk-cell nk-land" style="--cs:28px"></i>Island</span>');
    const C = ctlBar(undo, hint);
    api.stage.append(info, board, key, C.bar);
    const seaN = [...Array(N).keys()].filter(i => !P.land[i]).length;
    function pools() {
      const s = new Uint8Array(N);
      for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) {
        const i = r * n + c, q = [i, i + 1, i + n, i + n + 1];
        if (q.every(j => p[j] === 1)) q.forEach(j => { s[j] = 1; });
      }
      return s;
    }
    // islands as the player sees them: clue squares and dots joined side by side
    function clueState() {
      const st = {}, seen = new Uint8Array(N);
      for (let i = 0; i < N; i++) {
        if (!(P.clue[i] || p[i] === 2) || seen[i]) continue;
        const comp = [i]; seen[i] = 1;
        for (let q = 0; q < comp.length; q++) for (const j of n4[comp[q]]) if ((P.clue[j] || p[j] === 2) && !seen[j]) { seen[j] = 1; comp.push(j); }
        const cl = comp.filter(j => P.clue[j]);
        const closed = comp.every(j => n4[j].every(k => comp.includes(k) || p[k] === 1));
        cl.forEach(c => { st[c] = cl.length > 1 || comp.length > P.clue[c] ? 'over' : comp.length === P.clue[c] && closed ? 'ok' : ''; });
      }
      return st;
    }
    function render(pop) {
      const pl = pools(), cst = clueState();
      cells.forEach((b, i) => {
        if (P.clue[i]) { b.className = 'nk-cell nk-clue' + (cst[i] ? ' nk-' + cst[i] : ''); return; }
        b.className = 'nk-cell' + (p[i] === 1 ? ' nk-sea' : p[i] === 2 ? ' nk-land' : '') + (pl[i] ? ' nk-pool' : '') + (P.given[i] ? ' nk-fixed' : '') + (pop === i ? ' nk-pop' : '');
        b.setAttribute('aria-label', p[i] === 1 ? 'Sea' : p[i] === 2 ? 'Island' : 'Empty square');
      });
      const ns = [...p].filter(x => x === 1).length;
      info.innerHTML = `Sea squares: <b>${ns}</b> of <b>${seaN}</b>`;
      C.u.disabled = !hist.length || finished;
    }
    function tap(i) {
      if (finished || fixed(i)) { if (P.given[i]) wob(cells[i]); return; }
      const before = clueState();
      hist.push(p.slice());
      p[i] = (p[i] + 1) % 3;
      const after = clueState();
      if (p[i] === 1 && pools()[i]) { mistakes++; sfx.soft(); wob(cells[i]); api.hint('Oops, that makes a 2×2 pool of sea. The sea must stay narrow. Tap again to change it.'); }
      else if (p[i] === 2 && Object.keys(after).some(c => after[c] === 'over' && before[c] !== 'over')) { mistakes++; sfx.soft(); wob(cells[i]); api.hint('That island is now too big, or touches another island. Tap again to change it.'); }
      else { if (p[i] === 1) tone(330 + randInt(4) * 30, .12, 'sine', .1); else sfx.tap(); api.hint(base); }
      render(i); check();
    }
    const solvedNow = () => { for (let i = 0; i < N; i++) if ((p[i] === 1) !== !P.land[i]) return false; return true; };
    function check() {
      if (!solvedNow()) return;
      finished = true; for (let i = 0; i < N; i++) if (P.land[i] && !P.clue[i]) p[i] = 2;
      board.classList.add('nk-win'); render();
      rise(5); toast(cheer()); api.hint('All the islands are found, with the sea all around. Wonderful!');
      api.done(starsFor(mistakes + hints, 1, 3));
    }
    function undo() { if (!hist.length || finished) return; p.set(hist.pop()); sfx.tap(); render(); api.hint(base); }
    function hint() {
      if (finished) return;
      const all = [...Array(N).keys()].filter(i => !fixed(i));
      let d = all.find(i => p[i] === 1 && P.land[i]), msg = 'This square is part of an island, so it has a dot now.';
      if (d === undefined) { d = all.find(i => p[i] === 2 && !P.land[i]); msg = 'This square is sea.'; }
      if (d === undefined) { d = pick(all.filter(i => !P.land[i] && p[i] !== 1)); msg = 'Here is a sea square for you.'; }
      if (d === undefined) return;
      hist.push(p.slice()); hints++;
      p[d] = P.land[d] ? 2 : 1;
      sfx.tap(); render(d); glow(cells[d]); api.hint(msg);
      check();
    }
    render();
    if (TEST) api.stage.__auto = () => { for (let i = 0; i < N; i++) if (!fixed(i)) { const want = P.land[i] ? 2 : 1; let s = 0; while (p[i] !== want && s++ < 3) cells[i].click(); } };
    if (TEST) api.stage.__info = () => ({ n, cs, unique: solveIslands(n, P.clue, P.given, 2, 3000000).count === 1, givens: [...P.given].filter(Boolean).length });
  }

  /* =========================================================
     4. FROG HOP (frogs and toads)
     ========================================================= */
  function fhMoves(s) {
    const g = s.indexOf('_'), out = [];
    for (let i = 0; i < s.length; i++) {
      if (s[i] === 'F' && (g === i + 1 || g === i + 2)) out.push(i);
      if (s[i] === 'T' && (g === i - 1 || g === i - 2)) out.push(i);
    }
    return out;
  }
  const fhApply = (s, i) => { const a = s.split(''), g = s.indexOf('_'); a[g] = a[i]; a[i] = '_'; return a.join(''); };
  // first move of a shortest path to the goal, its length, or -1 if stuck
  function fhNext(s, goal) {
    if (s === goal) return { move: -1, dist: 0 };
    const prev = new Map([[s, null]]), q = [s];
    for (let h = 0; h < q.length; h++) {
      const u = q[h];
      for (const i of fhMoves(u)) {
        const v = fhApply(u, i); if (prev.has(v)) continue;
        prev.set(v, [u, i]); q.push(v);
        if (v === goal) {
          let x = v, mv = -1, d = 0;
          while (prev.get(x)) { const [pu, pi] = prev.get(x); mv = pi; x = pu; d++; }
          return { move: mv, dist: d };
        }
      }
    }
    return { move: -1, dist: -1 };
  }
  function startFrog(L, api) {
    let f, t;
    if (L <= 7) { f = t = Math.min(4, 1 + ((L - 1) >> 1)); }
    else { f = 3 + randInt(2); t = 3 + randInt(2); }
    const P = f + t + 1, start = 'F'.repeat(f) + '_' + 'T'.repeat(t), goal = 'T'.repeat(t) + '_' + 'F'.repeat(f);
    const best = fhNext(start, goal).dist; // the known shortest swap (f*t + f + t moves)
    let s = start, moves = 0, mistakes = 0, hints = 0, finished = false; const hist = [];
    const W = Math.min(stageW(api), 720);
    // one straight row of pads; on narrow screens the pieces get taller so they stay easy to tap
    const step = Math.min(84, Math.floor((W - 4) / P)), ps = Math.min(72, step - (step < 50 ? 2 : 6)), ph = Math.max(ps, Math.min(66, step + 24));
    const padW = step - 2, padH = Math.max(padW, ph - 6);
    const pondW = P * step + 4, pondH = ph + 34;
    const pos = i => [2 + step * (i + .5), pondH / 2];
    const base = `Swap the sides! Green frogs ▶ only go right and brown toads ◀ only go left. Tap one to step into the empty pad, or hop over one other.`;
    api.hint(base);
    const info = el('p', 'l6-info');
    const pond = el('div', 'fh-pond'); pond.style.cssText = `width:${pondW}px; height:${pondH}px; --ps:${ps}px`;
    const pads = [];
    for (let i = 0; i < P; i++) { const [x, y] = pos(i), d = el('div', 'fh-pad'); d.style.cssText = `left:${x - padW / 2}px; top:${y - padH / 2 + 6}px; width:${padW}px; height:${padH}px`; pond.append(d); pads.push(d); }
    // pieces keep their identity so they can glide between pads
    const pieces = [], at = [];
    for (let i = 0; i < P; i++) {
      if (start[i] === '_') continue;
      const fr = start[i] === 'F';
      const b = mkBtn('fh-pc tile ' + (fr ? 'fh-frog c-leaf' : 'fh-toad'), `<span class="fh-em">🐸</span><span class="fh-ar">${fr ? '▶' : '◀'}</span>`, () => tap(pieces.indexOf(b)));
      b.style.width = ps + 'px'; b.style.height = ph + 'px'; b.setAttribute('aria-label', fr ? 'Green frog, goes right' : 'Brown toad, goes left');
      pond.append(b); pieces.push(b); at.push(i);
    }
    const sides = el('div', 'fh-sides', `<span>◀ Toads end here</span><span>Frogs end here ▶</span>`);
    const C = ctlBar(undo, hint);
    api.stage.append(info, pond, sides, C.bar);
    function render(hop) {
      const g = s.indexOf('_');
      pads.forEach((d, i) => d.classList.toggle('fh-gap', i === g && !finished));
      pieces.forEach((b, k) => {
        const [x, y] = pos(at[k]); b.style.left = (x - ps / 2) + 'px'; b.style.top = (y - ph / 2 - 2) + 'px';
        if (hop === k) { b.classList.remove('fh-hop'); void b.offsetWidth; b.classList.add('fh-hop'); }
      });
      info.innerHTML = `Moves: <b>${moves}</b> · Fewest possible: <b>${best}</b>`;
      C.u.disabled = !hist.length || finished;
    }
    function move(i) { // i = pad index of the piece
      const k = at.indexOf(i), g = s.indexOf('_');
      hist.push({ s, at: at.slice() });
      const jump = Math.abs(g - i) === 2;
      s = fhApply(s, i); at[k] = g; moves++;
      tone(jump ? 620 : 520, .12, 'triangle', .11); if (jump) tone(780, .1, 'triangle', .08, .1);
      render(k);
    }
    function tap(k) {
      if (finished) return;
      const i = at[k];
      if (!fhMoves(s).includes(i)) {
        wob(pieces[k]); sfx.tap();
        api.hint(s[i] === 'F' ? 'That frog can’t move just now. It needs the empty pad right in front, or just one hop away.' : 'That toad can’t move just now. It needs the empty pad right in front, or just one hop away.');
        return;
      }
      move(i);
      if (s === goal) return win();
      const nx = fhNext(s, goal);
      if (nx.dist < 0) {
        mistakes++; sfx.soft();
        api.hint(fhMoves(s).length ? 'Hmm, this way will get stuck before the sides swap. Tap Undo to step back.' : 'No one can move now. Tap Undo to step back and try another way.');
      } else api.hint(base);
    }
    function win() {
      finished = true; pond.classList.add('fh-win'); render();
      rise(6); toast(cheer());
      api.hint(moves === best ? 'All swapped, in the fewest moves! Ribbit!' : 'All swapped across the pond. Ribbit!');
      api.done(starsFor(mistakes + hints, 1, 3));
    }
    function undo() { if (!hist.length || finished) return; const h = hist.pop(); s = h.s; at.splice(0, at.length, ...h.at); moves = Math.max(0, moves - 1); sfx.tap(); render(); api.hint(base); }
    function hint() {
      if (finished) return;
      const nx = fhNext(s, goal);
      hints++;
      if (nx.dist < 0) { sfx.tap(); undo(); api.hint('That way was stuck, so I stepped back one move. Tap Hint again for the next move.'); return; }
      const k = at.indexOf(nx.move); sfx.tap(); glow(pieces[k]); wob(pieces[k]);
      api.hint(`Try moving the glowing ${s[nx.move] === 'F' ? 'frog' : 'toad'}.`);
    }
    render();
    if (TEST) api.stage.__auto = () => { for (let guard = 0; guard < 200 && !finished; guard++) { const nx = fhNext(s, goal); if (nx.move < 0) break; pieces[at.indexOf(nx.move)].click(); } };
    if (TEST) api.stage.__info = () => ({ f, t, best, ps, ph, pondW });
  }

  /* =========================================================
     5. COLOUR ROWS (slide rows and columns)
     ========================================================= */
  function crSlide(g, n, m) { // m = {t:'r'|'c', i, d:+1|-1}
    const a = g.slice();
    for (let k = 0; k < n; k++) {
      if (m.t === 'r') a[m.i * n + ((k + m.d + n) % n)] = g[m.i * n + k];
      else a[((k + m.d + n) % n) * n + m.i] = g[k * n + m.i];
    }
    return a;
  }
  const crInv = m => ({ t: m.t, i: m.i, d: -m.d });
  const crSame = (a, b) => a.t === b.t && a.i === b.i && a.d === b.d;
  function startRows(L, api) {
    const T = [[3, 2], [3, 3], [4, 3], [4, 4], [4, 5], [5, 5], [5, 6], [5, 7]];
    const [n0, k0] = T[Math.min(L, T.length) - 1];
    const k = L > T.length ? 6 + randInt(3) : k0;
    const pattern = L >= 5 && L % 2 === 1;
    const W = Math.min(stageW(api), 600), gp = 4;
    let n = n0; const fitCs = m => Math.floor(Math.min(66, (W - 16 - (m + 1) * gp) / (m + 1.5)));
    while (n > 3 && fitCs(n) < 40) n--;
    const cs = fitCs(n), as = Math.max(40, Math.round(cs * .75));
    const cols = shuffle(CUBES.slice()).slice(0, n);
    // the goal: rows of one colour, or (higher levels) a pattern to copy
    let target = [];
    const kind = randInt(3);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) target.push(!pattern ? r : kind === 0 ? c : kind === 1 ? (r + c) % n : (r - c + n) % n);
    const solved = g => {
      if (pattern) return g.every((v, i) => v === target[i]);
      for (let r = 0; r < n; r++) for (let c = 1; c < n; c++) if (g[r * n + c] !== g[r * n]) return false;
      return true;
    };
    const allMoves = []; for (const t of ['r', 'c']) for (let i = 0; i < n; i++) for (const d of [1, -1]) allMoves.push({ t, i, d });
    let g, path;
    for (let a = 0; a < 200; a++) {
      g = target.slice(); path = [];
      for (let s = 0; s < k; s++) {
        const opts = allMoves.filter(m => (!path.length || !crSame(m, crInv(path[path.length - 1]))) && crSlide(g, n, m).some((v, i) => v !== g[i]));
        const m = pick(opts); g = crSlide(g, n, m); path.push(m);
      }
      if (!solved(g)) break;
    }
    let moves = 0, hints = 0, finished = false; const hist = [];
    const base = pattern ? 'Make the board match the little picture. Tap an arrow to slide that row or column one step. Tiles that slide off one end come back on the other.'
      : 'Make every row one colour. Tap an arrow to slide that row or column one step. Tiles that slide off one end come back on the other.';
    api.hint(base);
    const info = el('p', 'l6-info');
    const wrapT = el('div', 'cq-tgt');
    if (pattern) {
      const mini = el('div', 'cq-mini'); mini.style.gridTemplateColumns = `repeat(${n}, 20px)`;
      target.forEach(v => { const it = el('i', 'c-' + cols[v].c, cols[v].s); mini.append(it); });
      wrapT.append(el('span', '', 'Make this:'), mini);
    }
    const board = el('div', 'cq-board');
    board.style.cssText = `--cs:${cs}px; --as:${as}px; grid-template-columns:${as}px repeat(${n}, ${cs}px) ${as}px; grid-template-rows:${as}px repeat(${n}, ${cs}px) ${as}px`;
    const arrows = new Map(), cells = [];
    const arrow = (m, sym, label) => { const b = mkBtn('cq-arr', sym, () => doMove(m, true)); b.setAttribute('aria-label', label); arrows.set(m.t + m.i + m.d, b); return b; };
    board.append(el('span'));
    for (let c = 0; c < n; c++) board.append(arrow({ t: 'c', i: c, d: -1 }, '▲', 'Slide column ' + (c + 1) + ' up'));
    board.append(el('span'));
    for (let r = 0; r < n; r++) {
      board.append(arrow({ t: 'r', i: r, d: -1 }, '◀', 'Slide row ' + (r + 1) + ' left'));
      for (let c = 0; c < n; c++) { const d = el('div', 'cq-cell tile'); board.append(d); cells.push(d); }
      board.append(arrow({ t: 'r', i: r, d: 1 }, '▶', 'Slide row ' + (r + 1) + ' right'));
    }
    board.append(el('span'));
    for (let c = 0; c < n; c++) board.append(arrow({ t: 'c', i: c, d: 1 }, '▼', 'Slide column ' + (c + 1) + ' down'));
    board.append(el('span'));
    const C = ctlBar(undo, hint);
    if (pattern) api.stage.append(wrapT);
    api.stage.append(info, board, C.bar);
    function render(m) {
      cells.forEach((d, i) => {
        const v = g[i], r = (i / n) | 0;
        const ok = pattern ? v === target[i] : g.slice(r * n, r * n + n).every(x => x === g[r * n]);
        d.className = 'cq-cell tile c-' + cols[v].c + (ok && !finished ? ' cq-ok' : '') + (m && ((m.t === 'r' && r === m.i) || (m.t === 'c' && i % n === m.i)) ? ' cq-move' : '');
        d.textContent = cols[v].s;
      });
      let good = 0;
      if (pattern) good = g.filter((v, i) => v === target[i]).length;
      else for (let r = 0; r < n; r++) if (g.slice(r * n, r * n + n).every(x => x === g[r * n])) good++;
      info.innerHTML = pattern ? `Tiles in place: <b>${good}</b> of <b>${n * n}</b> · Moves: <b>${moves}</b>` : `Rows done: <b>${good}</b> of <b>${n}</b> · Moves: <b>${moves}</b>`;
      C.u.disabled = !hist.length || finished;
    }
    function apply(m) {
      g = crSlide(g, n, m);
      // the way back is kept as a list of moves: scramble first, then the player's own
      if (path.length && crSame(path[path.length - 1], crInv(m))) path.pop(); else path.push(m);
    }
    function doMove(m, byPlayer) {
      if (finished) return;
      apply(m); moves++; if (byPlayer) hist.push(m);
      tone(m.t === 'r' ? 500 : 420, .1, 'triangle', .1);
      render(m);
      if (solved(g)) {
        finished = true; board.classList.add('cq-win'); render();
        rise(5); toast(cheer()); api.hint(pattern ? 'A perfect match. Lovely!' : 'Every row is one colour. Lovely!');
        const extra = Math.max(0, moves - k);
        api.done(starsFor(hints + Math.floor(extra / 3), 1, 3));
        return;
      }
      api.hint(base);
    }
    function undo() {
      if (!hist.length || finished) return;
      const m = hist.pop(); apply(crInv(m)); moves = Math.max(0, moves - 1); sfx.tap(); render(crInv(m)); api.hint(base);
    }
    function hint() {
      if (finished || !path.length) return;
      const m = crInv(path[path.length - 1]), b = arrows.get(m.t + m.i + m.d);
      hints++; sfx.tap(); glow(b); wob(b);
      const where = m.t === 'r' ? `row ${m.i + 1} ${m.d > 0 ? 'right ▶' : 'left ◀'}` : `column ${m.i + 1} ${m.d > 0 ? 'down ▼' : 'up ▲'}`;
      api.hint(`Try sliding ${where}. Tap the glowing arrow.`);
    }
    render();
    if (TEST) api.stage.__auto = () => { for (let guard = 0; guard < 100 && !finished && path.length; guard++) { const m = crInv(path[path.length - 1]); arrows.get(m.t + m.i + m.d).click(); } };
    if (TEST) api.stage.__info = () => ({ n, k, cs, as, pattern });
  }
})();
