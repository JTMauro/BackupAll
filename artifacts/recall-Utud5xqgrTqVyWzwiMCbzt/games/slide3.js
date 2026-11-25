/* Recall: more Slide & Fit games (Crate Pusher, Turn the Tiles, Marble Maze) and one Logic game (What Comes Next?).
   Every level is generated fresh. Crate Pusher and Marble Maze are checked with a breadth-first solver. */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor, CUBES } = R;

  /* ---------- shared bits ---------- */
  const ramp = (L, a, b, rate) => b + (a - b) * Math.exp(-(Math.max(1, L) - 1) / rate);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const rf = (a, b) => a + Math.random() * (b - a);
  function mkBtn(html, cls, fn) { const b = el('button', 'btn ' + cls, html); b.type = 'button'; b.onclick = fn; return b; }
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  const DNAME = ['up', 'right', 'down', 'left'], DARROW = ['▲', '▶', '▼', '◀'];
  const KEYDIR = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 };

  // Big arrow pad: row 1 = [left extra] ▲ [right extra], row 2 = ◀ ▼ ▶
  function arrowPad(onDir, leftBtn, rightBtn) {
    const pad = el('div', 's3-pad'), arrows = [];
    const mk = d => { const b = mkBtn(DARROW[d], 'c-sky s3-arw', () => onDir(d)); b.setAttribute('aria-label', 'Move ' + DNAME[d]); arrows[d] = b; return b; };
    pad.append(leftBtn, mk(0), rightBtn, mk(3), mk(2), mk(1));
    return { pad, arrows };
  }
  // Keyboard arrows and swipes, removed automatically once the game has gone.
  function hookKeys(api, onDir, onUndo) {
    const h = e => {
      if (!api.stage.isConnected) { document.removeEventListener('keydown', h); return; }
      if (e.key in KEYDIR) { e.preventDefault(); onDir(KEYDIR[e.key]); }
      else if ((e.key === 'z' || e.key === 'Z' || e.key === 'Backspace') && onUndo) { e.preventDefault(); onUndo(); }
    };
    document.addEventListener('keydown', h);
  }
  function hookSwipe(target, onDir, onTap) {
    let sx = 0, sy = 0, on = false;
    target.addEventListener('pointerdown', e => { on = true; sx = e.clientX; sy = e.clientY; });
    target.addEventListener('pointercancel', () => { on = false; });
    target.addEventListener('pointerup', e => {
      if (!on) return; on = false;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 30) onDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
      else if (onTap) onTap(e);
    });
  }
  function flashBtn(b) { if (!b) return; b.classList.remove('s3-tip'); void b.offsetWidth; b.classList.add('s3-tip'); }

  R.css(`
.s3-wrap{display:flex; flex-wrap:wrap; gap:16px 26px; justify-content:center; align-items:center; max-width:900px; margin:0 auto}
.s3-side{display:grid; gap:12px; justify-items:center}
.s3-pad{display:grid; grid-template-columns:repeat(3, 84px); grid-auto-rows:68px; gap:10px}
.s3-pad .btn{min-height:0; height:100%; padding:0; font-size:1.05rem}
.s3-pad .s3-arw{font-size:1.9rem}
.s3-pad .btn:disabled{opacity:.4; cursor:default}
.s3-info{max-width:300px; display:flex; align-items:center; justify-content:center; gap:12px; flex-wrap:wrap; font:600 1.2rem var(--display); color:var(--on-table-soft); margin:0}
.s3-info .btn{min-height:56px; font-size:1.05rem; padding:.5em .9em}
.s3-tip{animation:s3glow 1.2s 2}
@keyframes s3glow{50%{outline:5px solid #fff; outline-offset:3px; filter:brightness(1.12)}}

/* Crate Pusher */
.cr-board{position:relative; width:min(100%, calc(var(--w) * 54px)); aspect-ratio:var(--w) / var(--h); border-radius:18px; touch-action:none; cursor:pointer;
  background:#5B3A22; box-shadow:0 0 0 6px #4A2B15, 0 14px 26px rgba(0,0,0,.4)}
.cr-cell{position:absolute; width:calc(100% / var(--w)); height:calc(100% / var(--h))}
.cr-floor{background:linear-gradient(rgba(0,0,0,.07) 2px, transparent 2px) 0 0 / 100% 50%, linear-gradient(90deg, rgba(0,0,0,.1) 2px, transparent 2px), #EBCB98}
.cr-floor.alt{background-color:#E3C08A}
.cr-wall{padding:2px}
.cr-wall::before{content:""; display:block; width:100%; height:100%; border-radius:16%;
  background:linear-gradient(155deg, rgba(255,255,255,.3), rgba(255,255,255,0) 50%),
   linear-gradient(rgba(80,30,15,.35) 2px, transparent 2px) 0 0 / 100% 33.4%, #C8664A;
  box-shadow:inset 0 -4px 0 rgba(0,0,0,.22), inset 0 2px 0 rgba(255,255,255,.35), 0 3px 0 #873A25}
.cr-goal{display:grid; place-items:center}
.cr-goal::after{content:"★"; display:grid; place-items:center; width:72%; height:72%; border-radius:50%; font:700 clamp(.9rem, 4vw, 1.5rem)/1 var(--display); color:#B07A00;
  background:radial-gradient(circle, #FFF2B8 0 45%, #FFD24A 46% 100%); box-shadow:0 0 0 3px #fff, inset 0 -3px 0 rgba(0,0,0,.15)}
.cr-mark{position:absolute; z-index:1; pointer-events:none; display:grid; place-items:center}
.cr-mark::after{content:""; width:80%; height:80%; border-radius:50%; border:5px dashed #fff; background:rgba(60,196,107,.45); animation:s3pulse 1s infinite alternate}
@keyframes s3pulse{from{scale:.85} to{scale:1.05}}
.cr-crate{position:absolute; z-index:2; display:grid; place-items:center; transition:left .14s ease-out, top .14s ease-out; pointer-events:none}
.cr-box{display:grid; place-items:center; width:86%; height:86%; border-radius:12%; font:700 clamp(1rem, 4.6vw, 1.7rem)/1 var(--display); color:#fff;
  background:linear-gradient(45deg, transparent 43%, #8A5527 43% 57%, transparent 57%), linear-gradient(-45deg, transparent 43%, #8A5527 43% 57%, transparent 57%), linear-gradient(155deg, #E7AC68, #C98A4B);
  box-shadow:inset 0 0 0 5px #8A5527, inset 0 -5px 0 rgba(0,0,0,.2), 0 5px 0 #5E3415, 0 8px 10px rgba(0,0,0,.35)}
.cr-crate.on .cr-box{background:linear-gradient(155deg, #7BE39C, #3CC46B); box-shadow:inset 0 0 0 5px #1F8C46, inset 0 -5px 0 rgba(0,0,0,.2), 0 5px 0 #17683A, 0 8px 10px rgba(0,0,0,.35)}
.cr-crate.on .cr-box::after{content:"✓"; text-shadow:0 2px 0 rgba(0,0,0,.25)}
.cr-crate.land .cr-box{animation:bounceIn .35s}
.cr-crate .cr-arrow{position:absolute; inset:0; display:grid; place-items:center; font:700 clamp(1.4rem, 6vw, 2.2rem)/1 var(--display); color:#fff; text-shadow:0 0 6px #000, 0 2px 0 #000; animation:s3pulse .6s infinite alternate}
.cr-man{position:absolute; z-index:3; display:grid; place-items:center; transition:left .12s ease-out, top .12s ease-out; pointer-events:none}
.cr-man span{display:block; font-size:clamp(1.5rem, 7vw, 2.5rem); line-height:1; filter:drop-shadow(0 4px 2px rgba(0,0,0,.35)); transition:transform .12s}
.cr-man.flip span{transform:scaleX(-1)}
.cr-man.bump{animation:wobble .3s}
.cr-board.won .cr-crate .cr-box{animation:bounceIn .5s backwards}

/* Turn the Tiles */
.tn-wrap{display:flex; flex-wrap:wrap; gap:14px 24px; justify-content:center; align-items:center; max-width:820px; margin:0 auto}
.tn-prev{display:grid; justify-items:center; gap:6px; font:600 1.05rem var(--display); color:var(--on-table-soft)}
.tn-prev canvas{width:110px; height:110px; border-radius:12px; border:5px solid #fff; box-shadow:0 6px 0 rgba(0,0,0,.25)}
.tn-board{display:grid; grid-template-columns:repeat(var(--n), 1fr); gap:5px; width:min(100%, 420px); aspect-ratio:1; padding:8px; border-radius:20px;
  background:#5B3A22; box-shadow:0 0 0 5px #4A2B15, 0 14px 26px rgba(0,0,0,.4); transition:gap .5s, padding .5s}
.tn-t{position:relative; border:0; padding:0; background:none; cursor:pointer; min-width:0; transition:transform .26s cubic-bezier(.3,1.5,.5,1)}
.tn-t canvas{display:block; width:100%; height:100%; border-radius:8px; box-shadow:0 4px 0 rgba(0,0,0,.35)}
.tn-t.ok{cursor:default}
.tn-t.ok canvas{box-shadow:0 0 0 3px #fff, 0 4px 0 rgba(0,0,0,.25)}
.tn-t.lock{animation:bounceIn .4s}
.tn-board.won{gap:0; padding:5px}
.tn-board.won .tn-t canvas{border-radius:0; box-shadow:none}
.tn-left{font:600 1.2rem var(--display); color:var(--on-table-soft); margin:0}

/* Marble Maze */
.mm-tray{position:relative; width:min(100%, calc(var(--n) * 56px + 28px)); aspect-ratio:1; padding:14px; border-radius:26px; touch-action:none;
  background:repeating-linear-gradient(90deg, rgba(0,0,0,0) 0 9px, rgba(70,35,10,.12) 9px 11px), linear-gradient(160deg, #B97A42, #8A5225);
  box-shadow:inset 0 3px 0 rgba(255,255,255,.3), 0 9px 0 #5A3218, 0 18px 28px rgba(0,0,0,.4); transition:transform .25s ease-out}
.mm-tray.t0{transform:perspective(700px) rotateX(5deg)} .mm-tray.t2{transform:perspective(700px) rotateX(-5deg)}
.mm-tray.t1{transform:perspective(700px) rotateY(5deg)} .mm-tray.t3{transform:perspective(700px) rotateY(-5deg)}
.mm-floor{position:relative; width:100%; height:100%; border-radius:12px;
  background:linear-gradient(rgba(120,70,30,.13) 2px, transparent 2px) 0 0 / calc(100% / var(--n)) calc(100% / var(--n)),
   linear-gradient(90deg, rgba(120,70,30,.13) 2px, transparent 2px) 0 0 / calc(100% / var(--n)) calc(100% / var(--n)), #F2D7A6;
  box-shadow:inset 0 6px 12px rgba(0,0,0,.3)}
.mm-c{position:absolute; width:calc(100% / var(--n)); height:calc(100% / var(--n)); display:grid; place-items:center}
.mm-blk::before{content:""; width:86%; height:86%; border-radius:18%;
  background:linear-gradient(155deg, rgba(255,255,255,.35), rgba(255,255,255,0) 50%), repeating-linear-gradient(0deg, rgba(0,0,0,0) 0 6px, rgba(90,45,15,.15) 6px 8px), #9C5E2C;
  box-shadow:inset 0 -4px 0 rgba(0,0,0,.2), inset 0 2px 0 rgba(255,255,255,.35), 0 4px 0 #5A3218, 0 7px 8px rgba(0,0,0,.3)}
.mm-hole::before{content:""; width:76%; height:76%; border-radius:50%; background:radial-gradient(circle at 50% 40%, #000 0 50%, #2A1A0E 70%, #4A2B15 100%);
  box-shadow:0 0 0 5px var(--sun), 0 0 0 8px #fff, inset 0 5px 8px rgba(255,255,255,.12)}
.mm-hole::after{content:"⛳"; position:absolute; font-size:clamp(.9rem, 4vw, 1.4rem); translate:40% -45%}
.mm-dot{width:22%; height:22%; border-radius:50%; background:rgba(255,255,255,.75); box-shadow:0 0 0 3px rgba(12,97,112,.5)}
.mm-ball{position:absolute; z-index:2; width:calc(100% / var(--n)); height:calc(100% / var(--n)); display:grid; place-items:center; pointer-events:none}
.mm-ball i{position:relative; display:block; width:78%; height:78%; border-radius:50%; overflow:hidden;
  background:radial-gradient(circle at 35% 30%, #fff 0 9%, rgba(255,255,255,0) 26%), radial-gradient(circle at 50% 50%, #5FB8FF, #1D5FA8 80%);
  box-shadow:0 5px 6px rgba(0,0,0,.4), inset 0 -4px 6px rgba(0,0,0,.25)}
.mm-ball b{position:absolute; inset:0; border-radius:50%; background:conic-gradient(from 0deg, rgba(255,194,52,.0) 0 20%, rgba(255,194,52,.75) 20% 32%, rgba(255,194,52,0) 32% 70%, rgba(242,90,149,.6) 70% 80%, rgba(0,0,0,0) 80%); mix-blend-mode:screen}
.mm-ball.sink i{transition:transform .5s ease-in, opacity .5s; transform:scale(.25); opacity:.2}
.mm-ball.hit i{animation:mmsquash .22s}
@keyframes mmsquash{40%{transform:scale(1.12, .9)}}

/* What Comes Next? */
.nx-box{display:grid; gap:20px; justify-items:center; max-width:720px; margin:0 auto}
.nx-seq{display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:10px; padding:16px; border-radius:24px; background:rgba(0,0,0,.2); box-shadow:inset 0 4px 10px rgba(0,0,0,.25)}
.nx-it{width:var(--s); height:var(--s); display:grid; place-items:center; --s:clamp(54px, 14vw, 78px)}
.nx-it.big{--s:clamp(60px, 16vw, 86px)}
.nx-it.in{animation:bounceIn .35s backwards}
.nx-q{border-radius:20%; border:4px dashed rgba(255,255,255,.75); font:700 2.2rem var(--display); color:#fff; display:grid; place-items:center; animation:s3pulse 1s infinite alternate}
.nx-q.fill{border:0; animation:none}
.nx-cube{width:calc(100% * var(--z, 1)); height:calc(100% * var(--z, 1)); font:700 calc(var(--s) * .42 * var(--z, 1))/1 var(--display); border-radius:22%}
.nx-emo{font-size:calc(var(--s) * .72); line-height:1; filter:drop-shadow(0 4px 2px rgba(0,0,0,.3))}
.nx-num{width:100%; height:100%; font:700 calc(var(--s) * .44)/1 var(--display)}
.nx-dots{width:100%; height:100%; display:flex; flex-wrap:wrap; align-content:center; justify-content:center; gap:6%; padding:12%}
.nx-dots i{width:24%; aspect-ratio:1; border-radius:50%; background:var(--coral); box-shadow:inset 0 -2px 0 rgba(0,0,0,.25)}
.nx-arr{width:100%; height:100%; font:700 calc(var(--s) * .62)/1 var(--display)}
.nx-arr span{display:block; transform:rotate(var(--r))}
.nx-ch{display:flex; flex-wrap:wrap; justify-content:center; gap:16px}
.nx-op{width:clamp(80px, 22vw, 108px); height:clamp(80px, 22vw, 108px); border:0; border-radius:22px; cursor:pointer; display:grid; place-items:center; padding:8px;
  background:var(--card); box-shadow:0 7px 0 var(--card-edge), 0 12px 18px rgba(0,0,0,.28); transition:transform .08s, box-shadow .08s, opacity .3s}
.nx-op .nx-it{--s:clamp(58px, 16vw, 80px)}
.nx-op:active{transform:translateY(6px); box-shadow:0 1px 0 var(--card-edge)}
.nx-op.right{background:var(--good-bg); box-shadow:0 7px 0 var(--leaf-d), 0 0 0 5px var(--leaf); animation:bounceIn .4s}
.nx-op.nope{opacity:.35; cursor:default}
.nx-say{font:600 1.2rem var(--display); color:var(--on-table-soft); margin:0; text-align:center}
`);

  /* =========================================================
     1. CRATE PUSHER
     ========================================================= */
  register({ id: 'crates', cat: 'slide', order: 6, name: 'Crate Pusher', icon: '📦', desc: 'Push the crates onto the yellow star spots', start: startCrates });

  function crPlan(L) {
    if (L <= 1) return { w: 4, h: 4, n: 1, lo: 3, hi: 4, walls: randInt(2) };
    if (L === 2) return { w: 5, h: 4, n: 1, lo: 4, hi: 6, walls: 1 + randInt(2) };
    if (L === 3) return { w: 5, h: 5, n: 2, lo: 4, hi: 7, walls: 1 + randInt(2) };
    if (L <= 5) return { w: 5, h: 5, n: 2, lo: 5 + (L - 4) * 2, hi: 9 + (L - 4) * 2, walls: 2 + randInt(2) };
    const n = L < 9 ? 3 : (L % 3 === 0 ? 4 : 3);
    const lo = Math.round(ramp(L - 5, 8, 16, 7)) - (n === 4 ? 2 : 0);
    const big = L >= 9;
    return { w: big ? 6 : 5 + randInt(2), h: big ? 6 : 5, n, lo, hi: lo + 5, walls: 2 + randInt(big ? 4 : 3) };
  }
  // A level: rectangular room with a wall border, a few inner wall blocks.
  function crRoom(w, h, walls) {
    const W = w + 2, H = h + 2, N = W * H, floor = new Uint8Array(N);
    for (let y = 1; y <= h; y++) for (let x = 1; x <= w; x++) floor[y * W + x] = 1;
    let placed = 0;
    for (let t = 0; t < 60 && placed < walls; t++) {
      const c = (1 + randInt(h)) * W + 1 + randInt(w);
      if (!floor[c]) continue;
      floor[c] = 0;
      const cells = []; floor.forEach((f, i) => { if (f) cells.push(i); });
      const vis = crReach({ floor, W, N }, new Uint8Array(N), cells[0]);
      if (cells.some(i => !vis[i])) floor[c] = 1; else placed++;
    }
    return { floor, W, H, N };
  }
  function crReach(P, mask, start) {
    const { floor, W, N } = P, vis = new Uint8Array(N), q = new Int16Array(N), off = [-W, 1, W, -1];
    let h = 0, t = 0; vis[start] = 1; q[t++] = start; let min = start;
    while (h < t) {
      const p = q[h++];
      for (let d = 0; d < 4; d++) { const n = p + off[d]; if (floor[n] && !mask[n] && !vis[n]) { vis[n] = 1; q[t++] = n; if (n < min) min = n; } }
    }
    vis.min = min; return vis;
  }
  // Cells from which a crate could still reach a goal (crate pulled backwards from each goal).
  function crLive(P) {
    const { floor, W, N, goals } = P, off = [-W, 1, W, -1], live = new Uint8Array(N), q = goals.slice();
    goals.forEach(g => { live[g] = 1; });
    for (let h = 0; h < q.length; h++) {
      const x = q[h];
      for (let d = 0; d < 4; d++) { const y = x - off[d], z = x - 2 * off[d]; if (z >= 0 && z < N && floor[y] && floor[z] && !live[y]) { live[y] = 1; q.push(y); } }
    }
    return live;
  }
  // Breadth-first solver over pushes. Returns a shortest list of pushes [{from, d}],
  // null if it cannot be solved, or undefined if it gave up (too big to search).
  function crSolve(P, crates0, player0, cap = 90000) {
    const { floor, W, N, goalMask, live } = P, off = [-W, 1, W, -1];
    const win = cr => cr.every(c => goalMask[c]);
    const c0 = crates0.slice().sort((a, b) => a - b);
    if (win(c0)) return [];
    const mask = new Uint8Array(N);
    c0.forEach(c => { mask[c] = 1; });
    const k0 = crReach(P, mask, player0).min + ':' + c0.join(',');
    const seen = new Map([[k0, null]]), q = [{ cr: c0, p: player0, k: k0 }];
    for (let h = 0; h < q.length; h++) {
      if (seen.size > cap) return undefined;
      const s = q[h]; mask.fill(0); s.cr.forEach(c => { mask[c] = 1; });
      const vis = crReach(P, mask, s.p);
      for (let i = 0; i < s.cr.length; i++) for (let d = 0; d < 4; d++) {
        const c = s.cr[i], from = c - off[d], to = c + off[d];
        if (!vis[from] || !floor[to] || mask[to] || !live[to]) continue;
        const ncr = s.cr.slice(); ncr[i] = to; ncr.sort((a, b) => a - b);
        mask[c] = 0; mask[to] = 1;
        const k = crReach(P, mask, c).min + ':' + ncr.join(',');
        mask[c] = 1; mask[to] = 0;
        if (seen.has(k)) continue;
        seen.set(k, { prev: s.k, from: c, d });
        if (win(ncr)) {
          const path = []; let kk = k;
          for (;;) { const e = seen.get(kk); if (!e) break; path.unshift({ from: e.from, d: e.d }); kk = e.prev; }
          return path;
        }
        q.push({ cr: ncr, p: c, k });
      }
    }
    return null;
  }
  // Reverse play: start solved, pull crates away from the goals, then let the solver measure it.
  function crGen(plan, budget = 700) {
    const t0 = now(); let best = null;
    for (let tries = 0; tries < 3000; tries++) {
      const room = crRoom(plan.w, plan.h, plan.walls), { floor, W, N } = room, off = [-W, 1, W, -1];
      const cells = []; floor.forEach((f, i) => { if (f) cells.push(i); });
      const goals = shuffle(cells.slice()).slice(0, plan.n);
      const P = Object.assign(room, { goals, goalMask: new Uint8Array(N) });
      goals.forEach(g => { P.goalMask[g] = 1; });
      P.live = crLive(P);
      const cr = goals.slice(), mask = new Uint8Array(N); cr.forEach(c => { mask[c] = 1; });
      const free = cells.filter(c => !mask[c]);
      let player = pick(free), last = null;
      const K = plan.lo + randInt(plan.hi * 2);
      for (let s = 0; s < K; s++) {
        const vis = crReach(P, mask, player), opts = [];
        for (let i = 0; i < cr.length; i++) for (let d = 0; d < 4; d++) {
          const c = cr[i], p = c - off[d], p2 = c - 2 * off[d];
          if (vis[p] && floor[p2] && !mask[p2]) opts.push([i, d]);
        }
        if (!opts.length) break;
        let o = last && Math.random() < .5 ? opts.find(o => o[0] === last[0] && o[1] === last[1]) : null;
        if (!o) o = pick(opts);
        const c = cr[o[0]]; mask[c] = 0; cr[o[0]] = c - off[o[1]]; mask[cr[o[0]]] = 1; player = c - 2 * off[o[1]]; last = o;
      }
      const onGoal = cr.filter(c => P.goalMask[c]).length;
      if (onGoal >= cr.length || onGoal > (plan.n >= 3 ? 1 : 0)) continue;
      const vis = crReach(P, mask, player), region = cells.filter(c => vis[c] && !mask[c]);
      player = pick(region);
      const sol = crSolve(P, cr, player);
      if (!sol || !sol.length) continue;
      const m = sol.length, miss = m < plan.lo ? plan.lo - m : m > plan.hi ? m - plan.hi : 0;
      const cand = { P, crates: cr.slice(), player, min: m, miss };
      if (!best || miss < best.miss) best = cand;
      if (!miss || (now() - t0 > budget && best)) break;
    }
    return best;
  }

  function startCrates(L, api) {
    const plan = crPlan(L), G = crGen(plan), P = G.P, { floor, W, H, N, goalMask } = P, off = [-W, 1, W, -1];
    let crates = G.crates.slice(), player = G.player, pushes = 0, steps = 0, hints = 0, finished = false, history = [], walkTok = 0, face = 1;
    const HINT0 = 'Push every crate onto a yellow ★ spot. Use the arrows, swipe, or tap a square to walk there.';
    api.hint(HINT0);
    const wrap = el('div', 's3-wrap');
    const board = el('div', 'cr-board'); board.style.setProperty('--w', W); board.style.setProperty('--h', H);
    const pos = (e, c) => { e.style.left = (c % W) / W * 100 + '%'; e.style.top = Math.floor(c / W) / H * 100 + '%'; };
    for (let c = 0; c < N; c++) {
      const x = c % W, y = Math.floor(c / W);
      const e = el('div', 'cr-cell ' + (floor[c] ? 'cr-floor' + ((x + y) % 2 ? ' alt' : '') + (goalMask[c] ? ' cr-goal' : '') : 'cr-wall'));
      pos(e, c); board.append(e);
    }
    const crEls = crates.map(() => { const e = el('div', 'cr-cell cr-crate', '<span class="cr-box"></span>'); board.append(e); return e; });
    const man = el('div', 'cr-cell cr-man', '<span>👷</span>'); board.append(man);
    let mark = null;
    const side = el('div', 's3-side');
    const undoBtn = mkBtn('↶ Undo', 'c-card', undo), hintBtn = mkBtn('💡 Hint', 'c-sun', hint);
    const { pad, arrows } = arrowPad(d => { walkTok++; move(d); }, undoBtn, hintBtn);
    const info = el('div', 's3-info'), count = el('span'), restartBtn = mkBtn('↺ Start again', 'c-card', restart);
    info.append(count, restartBtn);
    side.append(pad, info);
    wrap.append(board, side); api.stage.append(wrap);

    const crateAt = c => crates.indexOf(c);
    function render(landed) {
      crates.forEach((c, i) => {
        pos(crEls[i], c);
        const on = !!goalMask[c]; crEls[i].classList.toggle('on', on);
        crEls[i].classList.toggle('land', i === landed && on);
      });
      pos(man, player); man.classList.toggle('flip', face === 3);
      const left = crates.filter(c => !goalMask[c]).length;
      count.textContent = `Pushes: ${pushes} · Crates to go: ${left}`;
      undoBtn.disabled = !history.length || finished;
    }
    function clearTip() { if (mark) { mark.remove(); mark = null; } crEls.forEach(e => { const a = e.querySelector('.cr-arrow'); if (a) a.remove(); }); }
    function bump() { man.classList.remove('bump'); void man.offsetWidth; man.classList.add('bump'); tone(180, .1, 'sine', .07); }
    function move(d, quiet) {
      if (finished) return false;
      if (d === 1 || d === 3) face = d;
      const t = player + off[d];
      if (!floor[t]) { bump(); render(); return false; }
      const ci = crateAt(t);
      if (ci >= 0) {
        const t2 = t + off[d];
        if (!floor[t2] || crateAt(t2) >= 0) { bump(); wob(crEls[ci]); render(); if (!quiet) api.hint('That crate can’t go that way. Something is behind it.'); return false; }
        history.push({ crates: crates.slice(), player, pushes });
        crates[ci] = t2; player = t; pushes++; steps++; clearTip();
        const on = crates.filter(c => goalMask[c]).length;
        if (goalMask[t2]) { tone(520 + on * 110, .16, 'triangle', .12); tone(780 + on * 110, .2, 'triangle', .1, .08); }
        else tone(330, .08, 'triangle', .1);
        render(ci);
        if (crates.every(c => goalMask[c])) { win(); return true; }
        if (!quiet) {
          const sol = crSolve(P, crates, player, 40000);
          if (sol === null) { api.hint('Oh! A crate is stuck now. Tap ↶ Undo to take that push back.'); flashBtn(undoBtn); }
          else if (goalMask[t2]) api.hint('On the spot! ' + (crates.length > 1 ? 'Keep going.' : ''));
          else api.hint(HINT0);
        }
        return true;
      }
      player = t; steps++; tone(440, .04, 'triangle', .04); render();
      return true;
    }
    function pathTo(target) {
      const mask = new Uint8Array(N); crates.forEach(c => { mask[c] = 1; });
      const prev = new Int16Array(N).fill(-1), q = [player]; prev[player] = player;
      for (let h = 0; h < q.length; h++) {
        const p = q[h]; if (p === target) break;
        for (let d = 0; d < 4; d++) { const n = p + off[d]; if (floor[n] && !mask[n] && prev[n] < 0) { prev[n] = p * 4 + d + 1000; q.push(n); } }
      }
      if (prev[target] < 0) return null;
      const dirs = []; let c = target;
      while (c !== player) { const v = prev[c] - 1000, p = Math.floor(v / 4); dirs.unshift(v % 4); c = p; }
      return dirs;
    }
    function walkTo(target, instant) {
      const dirs = pathTo(target);
      if (!dirs) { api.hint('The worker can’t get there. Try another square.'); sfx.soft(); return false; }
      const tok = ++walkTok;
      if (instant) { dirs.forEach(d => move(d, true)); return true; }
      dirs.forEach((d, i) => api.later(() => { if (tok === walkTok) move(d, true); }, i * 120));
      return true;
    }
    function tapCell(e) {
      if (finished) return;
      const r = board.getBoundingClientRect();
      const x = Math.floor((e.clientX - r.left) / r.width * W), y = Math.floor((e.clientY - r.top) / r.height * H);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const c = y * W + x;
      for (let d = 0; d < 4; d++) if (player + off[d] === c) { walkTok++; move(d); return; }
      if (!floor[c]) return;
      if (crateAt(c) >= 0) { wob(crEls[crateAt(c)]); api.hint('Walk right up to a crate, then step into it to push.'); return; }
      sfx.tap(); walkTo(c);
    }
    hookSwipe(board, d => { walkTok++; move(d); }, tapCell);
    hookKeys(api, d => { walkTok++; move(d); }, undo);

    function undo() {
      if (finished || !history.length) return;
      walkTok++; const h = history.pop(); crates = h.crates; player = h.player; pushes = h.pushes; clearTip();
      sfx.tap(); render(); api.hint(HINT0);
    }
    function restart() {
      if (finished) return;
      walkTok++; crates = G.crates.slice(); player = G.player; pushes = 0; history = []; clearTip();
      sfx.tap(); render(); api.hint('Back to the start. ' + HINT0);
    }
    function hint() {
      if (finished) return;
      walkTok++; clearTip();
      const sol = crSolve(P, crates, player);
      if (sol === null) { api.hint('A crate is stuck. Tap ↶ Undo to take that push back.'); flashBtn(undoBtn); sfx.soft(); return; }
      if (!sol || !sol.length) return;
      hints++; sfx.tap();
      const { from, d } = sol[0], stand = from - off[d], ci = crateAt(from);
      crEls[ci].append(el('span', 'cr-arrow', DARROW[d]));
      if (stand === player) { flashBtn(arrows[d]); api.hint(`Push this crate ${DNAME[d]}. Tap ${DARROW[d]}.`); }
      else {
        mark = el('div', 'cr-cell cr-mark'); pos(mark, stand); board.append(mark);
        api.hint(`Walk to the green circle (tap it), then push the crate ${DNAME[d]} with ${DARROW[d]}.`);
      }
    }
    function win() {
      finished = true; walkTok++; render(); board.classList.add('won');
      api.hint('Every crate is on its spot! ' + cheer());
      api.later(() => sfx.good(), 150);
      const extra = pushes - G.min + hints * 2;
      api.done(starsFor(extra, Math.max(1, Math.ceil(G.min * .3)), Math.max(5, G.min + 3)));
    }
    api.stage.__lab = {
      P, min: G.min, get crates() { return crates.slice(); }, get player() { return player; }, get finished() { return finished; },
      solveAndPlay() {
        const sol = crSolve(P, crates, player);
        for (const s of sol) { walkTo(s.from - off[s.d], true); move(s.d, true); }
        return sol.length;
      }
    };
    render();
  }

  /* =========================================================
     2. TURN THE TILES
     ========================================================= */
  register({ id: 'turntiles', cat: 'slide', order: 7, name: 'Turn the Tiles', icon: '🔄', desc: 'Turn each tile the right way up', start: startTurnTiles });

  /* --- little painting kit for the generated pictures --- */
  function circ(x, cx, cy, r, fill) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fillStyle = fill; x.fill(); }
  function vgrad(x, y0, y1, cols) { const g = x.createLinearGradient(0, y0, 0, y1); cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c)); return g; }
  function sky(x, S, h) { x.fillStyle = vgrad(x, 0, h, ['#2E9BEF', '#8FD3FF', '#E4F6FF']); x.fillRect(0, 0, S, h); }
  function sun(x, cx, cy, r) {
    x.save(); x.translate(cx, cy); x.fillStyle = '#FFE066';
    for (let i = 0; i < 12; i++) { x.rotate(Math.PI / 6); x.beginPath(); x.moveTo(-r * .22, -r * 1.12); x.lineTo(0, -r * 1.6); x.lineTo(r * .22, -r * 1.12); x.fill(); }
    x.restore();
    circ(x, cx, cy, r, '#FFC234'); circ(x, cx - r * .25, cy - r * .3, r * .45, 'rgba(255,255,255,.35)');
    circ(x, cx - r * .33, cy - r * .1, r * .1, '#7A4A00'); circ(x, cx + r * .33, cy - r * .1, r * .1, '#7A4A00');
    x.beginPath(); x.arc(cx, cy + r * .08, r * .45, .2 * Math.PI, .8 * Math.PI); x.strokeStyle = '#7A4A00'; x.lineWidth = r * .1; x.lineCap = 'round'; x.stroke();
  }
  function cloud(x, cx, cy, s) {
    [[-1, .15, .55], [-.4, -.25, .75], [.35, -.35, .7], [1, .1, .55], [0, .2, .7]].forEach(([dx, dy, r]) => circ(x, cx + dx * s, cy + dy * s + s * .12, r * s, 'rgba(160,200,230,.6)'));
    [[-1, .15, .55], [-.4, -.25, .75], [.35, -.35, .7], [1, .1, .55], [0, .2, .7]].forEach(([dx, dy, r]) => circ(x, cx + dx * s, cy + dy * s, r * s, '#fff'));
  }
  function hill(x, S, y, c1, c2, amp, ph, freq = 1.3) {
    x.beginPath(); x.moveTo(0, S); x.lineTo(0, y);
    for (let i = 0; i <= 40; i++) { const px = i / 40 * S; x.lineTo(px, y + Math.sin(i / 40 * Math.PI * 2 * freq + ph) * amp); }
    x.lineTo(S, S); x.closePath(); x.fillStyle = vgrad(x, y - amp, S, [c1, c2]); x.fill();
  }
  function flower(x, cx, cy, r, col) {
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + .3; circ(x, cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * .75, col); }
    circ(x, cx, cy, r * .6, '#FFD23F'); circ(x, cx - r * .15, cy - r * .2, r * .2, 'rgba(255,255,255,.6)');
  }
  function blades(x, S, y0, y1, col, n) {
    x.strokeStyle = col; x.lineWidth = S * .006; x.lineCap = 'round';
    for (let i = 0; i < n; i++) { const bx = Math.random() * S, by = rf(y0, y1), h = S * rf(.02, .04); x.beginPath(); x.moveTo(bx, by); x.quadraticCurveTo(bx + h * .2, by - h * .6, bx + h * .45, by - h); x.stroke(); }
  }
  function rect(x, a, b, w, h, fill) { x.fillStyle = fill; x.fillRect(a, b, w, h); }
  function tri(x, pts, fill) { x.beginPath(); x.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]); x.closePath(); x.fillStyle = fill; x.fill(); }
  function bird(x, cx, cy, s) { x.beginPath(); x.moveTo(cx - s, cy - s * .3); x.quadraticCurveTo(cx - s * .5, cy - s * .8, cx, cy); x.quadraticCurveTo(cx + s * .5, cy - s * .8, cx + s, cy - s * .3); x.strokeStyle = '#2B3A44'; x.lineWidth = s * .22; x.lineCap = 'round'; x.stroke(); }
  const BRIGHT = ['#FF6B4A', '#F25A95', '#A98BFF', '#FF9A3C', '#45AEFF', '#FFC234', '#FF8FA8'];

  function sceneCountry(x, S) {
    sky(x, S, S * .62); const sx = S * rf(.7, .84); sun(x, sx, S * .17, S * .08);
    cloud(x, S * rf(.18, .3), S * .13, S * .055); cloud(x, S * rf(.45, .58), S * .3, S * .04);
    bird(x, S * .42, S * .12, S * .025); bird(x, S * .5, S * .09, S * .02);
    hill(x, S, S * .48, '#8EDB8F', '#4FB86A', S * .05, rf(0, 6));
    hill(x, S, S * .62, '#62C96F', '#2F9C52', S * .03, rf(0, 6), .8);
    // path
    x.beginPath(); x.moveTo(S * .3, S * .74); x.quadraticCurveTo(S * .2, S * .88, S * .42, S); x.lineTo(S * .62, S); x.quadraticCurveTo(S * .35, S * .88, S * .38, S * .74); x.closePath(); x.fillStyle = '#F4D79B'; x.fill();
    // house
    const hx = S * .1, hy = S * .5, hw = S * .38, hh = S * .25, wall = pick(['#FFE7A8', '#FFD1DC', '#D6ECFF', '#FFF0D6']);
    rect(x, hx + hw * .68, hy - hh * .45, hw * .12, hh * .4, '#A0523A');
    circ(x, hx + hw * .78, hy - hh * .6, S * .025, 'rgba(255,255,255,.8)'); circ(x, hx + hw * .86, hy - hh * .8, S * .032, 'rgba(255,255,255,.7)');
    rect(x, hx, hy, hw, hh, wall);
    tri(x, [hx - hw * .08, hy + 2, hx + hw / 2, hy - hh * .62, hx + hw * 1.08, hy + 2], pick(['#E2553E', '#3F7FD9', '#8C5BD6']));
    rect(x, hx + hw * .4, hy + hh * .42, hw * .2, hh * .58, '#7A4A28'); circ(x, hx + hw * .56, hy + hh * .72, S * .007, '#FFC234');
    [[.1, .2], [.68, .2]].forEach(([a, b]) => { rect(x, hx + hw * a - 3, hy + hh * b - 3, hw * .22 + 6, hh * .32 + 6, '#fff'); rect(x, hx + hw * a, hy + hh * b, hw * .22, hh * .32, '#7FC8F5'); rect(x, hx + hw * (a + .1), hy + hh * b, 3, hh * .32, '#fff'); rect(x, hx + hw * a, hy + hh * (b + .15), hw * .22, 3, '#fff'); });
    // tree
    const tx = S * rf(.72, .82), ty = S * .73;
    rect(x, tx - S * .025, ty - S * .16, S * .05, S * .17, '#7A4A28');
    circ(x, tx - S * .07, ty - S * .2, S * .08, '#2F9C52'); circ(x, tx + S * .06, ty - S * .2, S * .08, '#2F9C52'); circ(x, tx, ty - S * .29, S * .1, '#3CC46B');
    [[-.06, -.24], [.04, -.3], [.07, -.18], [-.02, -.17]].forEach(([a, b]) => circ(x, tx + a * S, ty + b * S, S * .015, '#E8402A'));
    // flowers + grass
    blades(x, S, S * .66, S, '#2A8A48', 70);
    for (let i = 0; i < 14; i++) { const fx = rf(.03, .97) * S, fy = rf(.78, .97) * S; if (Math.abs(fx - S * .45) < S * .1) continue; flower(x, fx, fy, S * .014, pick(BRIGHT)); }
  }
  function sceneSea(x, S) {
    sky(x, S, S * .48); sun(x, S * rf(.12, .25), S * .15, S * .075);
    cloud(x, S * rf(.55, .7), S * .12, S * .05); bird(x, S * .45, S * .2, S * .025); bird(x, S * .52, S * .25, S * .02); bird(x, S * .82, S * .28, S * .022);
    x.fillStyle = vgrad(x, S * .45, S * .74, ['#2A8FE0', '#1C6FB8']); x.fillRect(0, S * .45, S, S * .3);
    x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = S * .006;
    for (let r = 0; r < 5; r++) for (let i = 0; i < 6; i++) { const wx = (i + (r % 2) * .5) * S / 5.5 + rf(-8, 8), wy = S * (.5 + r * .05); x.beginPath(); x.arc(wx, wy, S * .025, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); }
    // lighthouse on rocks
    const lx = S * .86; circ(x, lx, S * .5, S * .07, '#6B7680'); circ(x, lx - S * .06, S * .52, S * .05, '#57626B');
    tri(x, [lx - S * .045, S * .47, lx - S * .03, S * .2, lx + S * .03, S * .2, lx + S * .045, S * .47], '#fff');
    [.24, .32, .4].forEach(b => tri(x, [lx - S * .036, S * (b + .04), lx - S * .033, S * b, lx + S * .033, S * b, lx + S * .036, S * (b + .04)], '#E2553E'));
    rect(x, lx - S * .035, S * .15, S * .07, S * .05, '#FFE066'); tri(x, [lx - S * .045, S * .15, lx, S * .1, lx + S * .045, S * .15], '#E2553E');
    // boat
    const bx = S * rf(.25, .5), by = S * .6;
    tri(x, [bx - S * .12, by, bx + S * .12, by, bx + S * .08, by + S * .06, bx - S * .08, by + S * .06], '#C4432A');
    rect(x, bx - S * .005, by - S * .22, S * .01, S * .22, '#5A361C');
    tri(x, [bx + S * .01, by - S * .21, bx + S * .01, by - S * .02, bx + S * .12, by - S * .02], '#fff');
    tri(x, [bx - S * .01, by - S * .17, bx - S * .01, by - S * .02, bx - S * .09, by - S * .02], pick(['#FFC234', '#45AEFF', '#F25A95']));
    // beach
    x.beginPath(); x.moveTo(0, S * .76); x.quadraticCurveTo(S * .5, S * .7, S, S * .77); x.lineTo(S, S); x.lineTo(0, S); x.closePath(); x.fillStyle = vgrad(x, S * .7, S, ['#FFE7A6', '#F2C46B']); x.fill();
    for (let i = 0; i < 40; i++) circ(x, rf(0, S), rf(S * .8, S), S * .004, 'rgba(160,110,40,.35)');
    // umbrella
    const ux = S * rf(.62, .75), uy = S * .78;
    rect(x, ux - S * .006, uy - S * .02, S * .012, S * .18, '#6B4A2B');
    const cols = [pick(BRIGHT), '#fff'];
    for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(ux, uy); x.arc(ux, uy, S * .14, Math.PI + i * Math.PI / 6, Math.PI + (i + 1) * Math.PI / 6); x.closePath(); x.fillStyle = cols[i % 2]; x.fill(); }
    // towel, bucket, ball, starfish
    for (let i = 0; i < 5; i++) rect(x, S * .12 + i * S * .03, S * .86, S * .03, S * .1, i % 2 ? '#fff' : '#45AEFF');
    tri(x, [S * .38, S * .86, S * .46, S * .86, S * .445, S * .93, S * .395, S * .93], '#F25A95');
    circ(x, S * .9, S * .9, S * .04, '#FFC234'); x.beginPath(); x.moveTo(S * .9, S * .9); x.arc(S * .9, S * .9, S * .04, 0, Math.PI * .66); x.fillStyle = '#FF6B4A'; x.fill();
    x.save(); x.translate(S * .55, S * .93); x.fillStyle = '#FF9A3C'; for (let i = 0; i < 5; i++) { x.rotate(Math.PI * 2 / 5); x.beginPath(); x.ellipse(0, -S * .018, S * .009, S * .02, 0, 0, Math.PI * 2); x.fill(); } x.restore();
  }
  function balloon(x, cx, cy, r, cols) {
    x.save(); x.beginPath(); x.moveTo(cx, cy + r * 1.35); x.bezierCurveTo(cx - r * 1.5, cy + r * .4, cx - r * 1.2, cy - r * 1.1, cx, cy - r * 1.05);
    x.bezierCurveTo(cx + r * 1.2, cy - r * 1.1, cx + r * 1.5, cy + r * .4, cx, cy + r * 1.35); x.closePath(); x.clip();
    for (let i = 0; i < 6; i++) rect(x, cx - r * 1.2 + i * r * .4, cy - r * 1.2, r * .4 + 1, r * 2.7, cols[i % cols.length]);
    circ(x, cx - r * .4, cy - r * .45, r * .3, 'rgba(255,255,255,.35)'); x.restore();
    x.strokeStyle = '#5A361C'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx - r * .3, cy + r * 1.25); x.lineTo(cx - r * .22, cy + r * 1.7); x.moveTo(cx + r * .3, cy + r * 1.25); x.lineTo(cx + r * .22, cy + r * 1.7); x.stroke();
    rect(x, cx - r * .26, cy + r * 1.7, r * .52, r * .38, '#A0662F'); rect(x, cx - r * .26, cy + r * 1.7, r * .52, r * .08, '#7A4A28');
  }
  function sceneBalloons(x, S) {
    x.fillStyle = vgrad(x, 0, S * .8, ['#4FB2FF', '#9EDCFF', '#FFE9C7']); x.fillRect(0, 0, S, S);
    sun(x, S * .85, S * .13, S * .065);
    cloud(x, S * .2, S * .2, S * .05); cloud(x, S * .62, S * .45, S * .045); cloud(x, S * .9, S * .6, S * .04);
    hill(x, S, S * .78, '#8EDB8F', '#4FB86A', S * .04, rf(0, 6), 1.1);
    hill(x, S, S * .88, '#5CC46E', '#2F9C52', S * .025, rf(0, 6), .7);
    for (let i = 0; i < 4; i++) { const hx = S * (.1 + i * .23 + rf(-.03, .03)), hy = S * .82; rect(x, hx, hy, S * .07, S * .05, pick(['#FFE7A8', '#FFD1DC', '#fff'])); tri(x, [hx - S * .01, hy, hx + S * .035, hy - S * .04, hx + S * .08, hy], '#E2553E'); rect(x, hx + S * .027, hy + S * .02, S * .016, S * .03, '#7A4A28'); }
    blades(x, S, S * .9, S, '#257A3E', 30);
    const sets = shuffle([['#FF6B4A', '#FFC234'], ['#45AEFF', '#fff'], ['#F25A95', '#A98BFF'], ['#3CC46B', '#FFE066'], ['#FF9A3C', '#F25A95']]);
    balloon(x, S * .22, S * .42, S * .1, sets[0]); balloon(x, S * .55, S * .2, S * .085, sets[1]); balloon(x, S * .8, S * .4, S * .07, sets[2]);
    bird(x, S * .4, S * .55, S * .02); bird(x, S * .45, S * .6, S * .016);
  }
  function sceneGarden(x, S) {
    sky(x, S, S * .5); sun(x, S * rf(.1, .2), S * .14, S * .07); cloud(x, S * rf(.5, .7), S * .14, S * .05);
    // fence
    const fy = S * .34, fh = S * .26;
    rect(x, 0, fy + fh * .3, S, S * .03, '#E8DCC8'); rect(x, 0, fy + fh * .75, S, S * .03, '#E8DCC8');
    for (let i = 0; i < 11; i++) { const px = i * S / 10.5 + S * .01; rect(x, px, fy, S * .06, fh, '#FFF8EA'); tri(x, [px, fy, px + S * .03, fy - S * .04, px + S * .06, fy], '#FFF8EA'); rect(x, px + S * .05, fy, S * .01, fh, 'rgba(0,0,0,.08)'); }
    x.fillStyle = vgrad(x, S * .56, S, ['#6BD67A', '#2F9C52']); x.fillRect(0, S * .56, S, S * .44);
    blades(x, S, S * .6, S, '#257A3E', 80);
    for (let i = 0; i < 12; i++) flower(x, rf(.03, .97) * S, rf(.66, .98) * S, S * .012, pick(BRIGHT));
    // tall flowers
    const n = 6;
    for (let i = 0; i < n; i++) {
      const fx = S * (.08 + i * .165 + rf(-.02, .02)), top = S * rf(.3, .55), base = S * rf(.8, .95);
      x.strokeStyle = '#2A8A48'; x.lineWidth = S * .012; x.beginPath(); x.moveTo(fx, base); x.quadraticCurveTo(fx + S * .03, (top + base) / 2, fx, top); x.stroke();
      x.fillStyle = '#3CC46B'; x.beginPath(); x.ellipse(fx + S * .03, (top + base) / 2, S * .035, S * .014, -.5, 0, Math.PI * 2); x.fill();
      if (i % 3 === 1) { for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; x.fillStyle = '#FFC234'; x.beginPath(); x.ellipse(fx + Math.cos(a) * S * .04, top + Math.sin(a) * S * .04, S * .022, S * .01, a, 0, Math.PI * 2); x.fill(); } circ(x, fx, top, S * .028, '#7A4A28'); }
      else flower(x, fx, top, S * .03, BRIGHT[(i * 2 + randInt(3)) % BRIGHT.length]);
    }
    // butterfly
    const bx = S * rf(.6, .8), by = S * .2;
    x.fillStyle = '#F25A95'; x.beginPath(); x.ellipse(bx - S * .03, by - S * .015, S * .03, S * .022, -.4, 0, Math.PI * 2); x.ellipse(bx + S * .03, by - S * .015, S * .03, S * .022, .4, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#A98BFF'; x.beginPath(); x.ellipse(bx - S * .022, by + S * .02, S * .02, S * .015, .4, 0, Math.PI * 2); x.ellipse(bx + S * .022, by + S * .02, S * .02, S * .015, -.4, 0, Math.PI * 2); x.fill();
    rect(x, bx - S * .005, by - S * .03, S * .01, S * .06, '#2B3A44');
    // ladybird and watering can
    circ(x, S * .3, S * .93, S * .025, '#E8402A'); circ(x, S * .3 - S * .025, S * .93, S * .012, '#222'); circ(x, S * .305, S * .92, S * .005, '#222'); circ(x, S * .315, S * .94, S * .005, '#222');
    const wx = S * .72, wy = S * .88; rect(x, wx, wy, S * .1, S * .08, '#45AEFF'); tri(x, [wx + S * .1, wy + S * .05, wx + S * .17, wy - S * .03, wx + S * .18, wy - S * .02, wx + S * .1, wy + S * .07], '#45AEFF');
    x.strokeStyle = '#1D70C0'; x.lineWidth = S * .01; x.beginPath(); x.arc(wx + S * .02, wy + S * .03, S * .035, Math.PI * .6, Math.PI * 1.5); x.stroke();
  }
  const SCENES = [sceneCountry, sceneSea, sceneBalloons, sceneGarden];

  let TN_SAME = 16;
  function tnPlan(L) { return L <= 1 ? 2 : L <= 3 ? 3 : L <= 7 ? 4 : 5; }
  // Which quarter-turns leave a tile looking the same? Those count as correct too.
  function tnSame(src, n, S) {
    const k = 20, sm = document.createElement('canvas'); sm.width = sm.height = k;
    const sx = sm.getContext('2d', { willReadFrequently: true }), ts = S / n, out = [];
    for (let i = 0; i < n * n; i++) {
      sx.clearRect(0, 0, k, k); sx.drawImage(src, (i % n) * ts, Math.floor(i / n) * ts, ts, ts, 0, 0, k, k);
      const d = sx.getImageData(0, 0, k, k).data, set = [0];
      for (let r = 1; r < 4; r++) {
        let diff = 0;
        for (let y = 0; y < k; y++) for (let x = 0; x < k; x++) {
          // pixel (x, y) after rotating r quarter-turns clockwise comes from:
          const [ox, oy] = r === 1 ? [y, k - 1 - x] : r === 2 ? [k - 1 - x, k - 1 - y] : [k - 1 - y, x];
          const a = (y * k + x) * 4, b = (oy * k + ox) * 4;
          diff += Math.abs(d[a] - d[b]) + Math.abs(d[a + 1] - d[b + 1]) + Math.abs(d[a + 2] - d[b + 2]);
        }
        if (diff / (k * k * 3) < TN_SAME) set.push(r);
      }
      out.push(set);
    }
    return out;
  }

  function startTurnTiles(L, api) {
    const n = tnPlan(L), S = 600, ts = S / n;
    const src = document.createElement('canvas'); src.width = src.height = S;
    pick(SCENES)(src.getContext('2d'), S);
    const same = tnSame(src, n, S);
    const rot = same.map(set => { const opts = [1, 2, 3].filter(r => !set.includes(r)); return opts.length ? pick(opts) : 0; });
    let left = rot.filter(r => r).length, finished = false, combo = 0;
    api.hint('Tap a tile to turn it. Turn every tile until the picture looks right.');
    const wrap = el('div', 'tn-wrap');
    const prev = el('div', 'tn-prev'); const pc = document.createElement('canvas'); pc.width = pc.height = 220; pc.getContext('2d').drawImage(src, 0, 0, 220, 220);
    const leftTxt = el('p', 'tn-left');
    prev.append(pc, el('span', '', 'The finished picture'), leftTxt);
    const board = el('div', 'tn-board'); board.style.setProperty('--n', n);
    const tiles = rot.map((r, i) => {
      const b = el('button', 'tn-t' + (r ? '' : ' ok')); b.type = 'button'; b.setAttribute('aria-label', 'Picture tile ' + (i + 1));
      const c = document.createElement('canvas'); c.width = c.height = Math.ceil(ts);
      c.getContext('2d').drawImage(src, (i % n) * ts, Math.floor(i / n) * ts, ts, ts, 0, 0, c.width, c.height);
      b.append(c); b.style.transform = `rotate(${r * 90}deg)`; b.dataset.deg = r * 90;
      b.onclick = () => turn(i); board.append(b); return b;
    });
    wrap.append(prev, board); api.stage.append(wrap);
    const say = () => { leftTxt.textContent = left ? `Tiles to turn: ${left}` : 'All done!'; };
    function turn(i) {
      const b = tiles[i];
      if (finished || b.classList.contains('ok')) return;
      const deg = +b.dataset.deg + 90; b.dataset.deg = deg; b.style.transform = `rotate(${deg}deg)`;
      tone(400 + (deg / 90 % 4) * 60, .07, 'triangle', .08);
      if (same[i].includes((4 - (deg / 90) % 4) % 4)) {
        b.classList.add('ok'); left--; combo++; say();
        api.later(() => { b.classList.add('lock'); tone(560 + combo * 70, .14, 'triangle', .12); tone(840 + combo * 70, .18, 'sine', .1, .08); }, 240);
        if (!left) {
          finished = true;
          api.later(() => { board.classList.add('won'); sfx.good(); api.hint('The picture is whole again! ' + cheer()); }, 600);
          api.done(3);
        }
      }
    }
    api.stage.__lab = { n, same, setSame: v => { TN_SAME = v; }, get left() { return left; }, tap: i => turn(i), tiles };
    say();
    if (!left) { finished = true; board.classList.add('won'); api.done(3); }
  }

  /* =========================================================
     3. MARBLE MAZE
     ========================================================= */
  register({ id: 'marble', cat: 'slide', order: 8, name: 'Marble Maze', icon: '🔵', desc: 'Tilt the tray to roll the marble into the hole', start: startMarble });

  function mmPlan(L) {
    if (L <= 1) return { n: 5, lo: 2, hi: 2, dens: .12 };
    if (L === 2) return { n: 5, lo: 2, hi: 3, dens: .14 };
    if (L === 3) return { n: 6, lo: 3, hi: 4, dens: .15 };
    if (L <= 5) return { n: 6, lo: 3, hi: 5, dens: .16 };
    const lo = Math.round(ramp(L - 5, 4, 8, 7));
    return { n: L < 10 ? 7 : 8, lo, hi: lo + 2, dens: rf(.15, .21) };
  }
  // Roll from p in direction d until a block or the edge. Falls in if it passes over the hole.
  function mmRoll(n, blk, p, d, hole) {
    let x = p % n, y = Math.floor(p / n); const cells = [];
    for (;;) {
      const nx = x + DX[d], ny = y + DY[d];
      if (nx < 0 || ny < 0 || nx >= n || ny >= n || blk[ny * n + nx]) break;
      x = nx; y = ny; cells.push(y * n + x);
      if (y * n + x === hole) return { end: hole, cells, fell: true };
    }
    return { end: y * n + x, cells, fell: false };
  }
  function mmSolve(n, blk, start, hole) {
    const prev = new Map([[start, null]]), q = [start];
    for (let h = 0; h < q.length; h++) {
      const p = q[h];
      for (let d = 0; d < 4; d++) {
        const r = mmRoll(n, blk, p, d, hole);
        if (!r.cells.length || prev.has(r.end)) continue;
        prev.set(r.end, [p, d]);
        if (r.fell) { const path = []; let c = r.end; while (prev.get(c)) { path.unshift(prev.get(c)[1]); c = prev.get(c)[0]; } return path; }
        q.push(r.end);
      }
    }
    return null;
  }
  function mmGen(plan, budget = 500) {
    const { n, lo, hi, dens } = plan, t0 = now(); let best = null;
    for (let tries = 0; tries < 4000; tries++) {
      const blk = new Uint8Array(n * n);
      for (let i = 0; i < n * n; i++) if (Math.random() < dens) blk[i] = 1;
      const free = []; blk.forEach((b, i) => { if (!b) free.push(i); });
      if (free.length < 4) continue;
      const start = pick(free);
      // BFS over stopping points, ignoring the hole; record the fewest tilts to pass over every square
      const dist = new Map([[start, 0]]), q = [start], holeD = new Int16Array(n * n).fill(999);
      for (let h = 0; h < q.length; h++) {
        const p = q[h], k = dist.get(p);
        for (let d = 0; d < 4; d++) {
          const r = mmRoll(n, blk, p, d, -1);
          r.cells.forEach(c => { if (holeD[c] > k + 1) holeD[c] = k + 1; });
          if (r.cells.length && !dist.has(r.end)) { dist.set(r.end, k + 1); q.push(r.end); }
        }
      }
      const cands = free.filter(c => c !== start && holeD[c] >= lo && holeD[c] <= hi);
      let hole, m;
      if (cands.length) { hole = pick(cands); m = holeD[hole]; }
      else {
        const any = free.filter(c => c !== start && holeD[c] < 999); if (!any.length) continue;
        hole = any.reduce((a, c) => (Math.abs(holeD[c] - lo) < Math.abs(holeD[a] - lo) ? c : a)); m = holeD[hole];
      }
      const sol = mmSolve(n, blk, start, hole);
      if (!sol || sol.length !== m) continue;
      const miss = m < lo ? lo - m : m > hi ? m - hi : 0;
      if (!best || miss < best.miss) best = { blk, start, hole, min: m, miss };
      if (!miss || now() - t0 > budget) break;
    }
    return best;
  }

  function startMarble(L, api) {
    const plan = mmPlan(L), G = mmGen(plan), n = plan.n, { blk, hole } = G;
    let ball = G.start, moves = 0, hints = 0, rolling = false, finished = false, history = [];
    const HINT0 = 'Tap an arrow to tilt the tray. The marble rolls until it hits something. Roll it into the hole ⛳.';
    api.hint(HINT0);
    const wrap = el('div', 's3-wrap');
    const tray = el('div', 'mm-tray'); tray.style.setProperty('--n', n);
    const floorEl = el('div', 'mm-floor'); tray.append(floorEl);
    const at = (e, x, y) => { e.style.left = x / n * 100 + '%'; e.style.top = y / n * 100 + '%'; };
    for (let i = 0; i < n * n; i++) {
      if (blk[i] || i === hole) { const c = el('div', 'mm-c ' + (blk[i] ? 'mm-blk' : 'mm-hole')); at(c, i % n, Math.floor(i / n)); floorEl.append(c); }
    }
    const ballEl = el('div', 'mm-ball', '<i><b></b></i>'); floorEl.append(ballEl);
    const swirl = ballEl.querySelector('b');
    const side = el('div', 's3-side');
    const undoBtn = mkBtn('↶ Undo', 'c-card', undo), hintBtn = mkBtn('💡 Hint', 'c-sun', hint);
    const { pad, arrows } = arrowPad(d => tilt(d), undoBtn, hintBtn);
    const info = el('div', 's3-info'), count = el('span'), restartBtn = mkBtn('↺ Start again', 'c-card', restart);
    info.append(count, restartBtn); side.append(pad, info);
    wrap.append(tray, side); api.stage.append(wrap);
    hookSwipe(tray, d => tilt(d));
    hookKeys(api, d => tilt(d), undo);
    let spin = 0;
    function render() {
      at(ballEl, ball % n, Math.floor(ball / n));
      count.textContent = `Tilts: ${moves} · Fewest: ${G.min}`;
      undoBtn.disabled = !history.length || finished || rolling;
    }
    function tilt(d) {
      if (finished || rolling) return;
      const r = mmRoll(n, blk, ball, d, hole);
      tray.className = 'mm-tray t' + d;
      api.later(() => { if (!rolling) tray.className = 'mm-tray'; }, 380);
      if (!r.cells.length) { ballEl.classList.remove('hit'); void ballEl.offsetWidth; ballEl.classList.add('hit'); tone(200, .08, 'sine', .06); api.hint('The marble can’t roll that way. Try another arrow.'); return; }
      history.push({ ball, moves }); moves++; rolling = true; render();
      const x0 = ball % n, y0 = Math.floor(ball / n), x1 = r.end % n, y1 = Math.floor(r.end / n), dist = r.cells.length;
      const dur = 160 + dist * 85, t0 = now(), s0 = spin;
      tone(150, dur / 1000, 'triangle', .035);
      const step = () => {
        if (!api.stage.isConnected) return;
        const t = Math.min(1, (now() - t0) / dur), e = t * t * (1.6 - .6 * t); // speeds up, like on a slope
        at(ballEl, x0 + (x1 - x0) * e, y0 + (y1 - y0) * e);
        spin = s0 + (d === 1 || d === 2 ? 1 : -1) * e * dist * 110; swirl.style.transform = `rotate(${spin}deg)`;
        if (t < 1) requestAnimationFrame(step); else land(r);
      };
      requestAnimationFrame(step);
    }
    function land(r) {
      ball = r.end; rolling = false; tray.className = 'mm-tray';
      if (r.fell) {
        finished = true; ballEl.classList.add('sink'); render();
        [660, 520, 400, 300].forEach((f, i) => tone(f, .12, 'sine', .1, i * .07));
        api.later(() => { sfx.good(); api.hint('Plop! In the hole. ' + cheer()); }, 400);
        api.done(starsFor(moves - G.min + hints * 2, Math.max(1, Math.floor(G.min * .3)), G.min + 4));
        return;
      }
      ballEl.classList.remove('hit'); void ballEl.offsetWidth; ballEl.classList.add('hit'); tone(260, .07, 'square', .04);
      render();
      api.hint(HINT0);
    }
    function undo() {
      if (finished || rolling || !history.length) return;
      const h = history.pop(); ball = h.ball; moves = h.moves; sfx.tap(); render(); api.hint(HINT0);
    }
    function restart() {
      if (finished || rolling) return;
      ball = G.start; moves = 0; history = []; sfx.tap(); render(); api.hint('Back to the start. ' + HINT0);
    }
    function hint() {
      if (finished || rolling) return;
      const sol = mmSolve(n, blk, ball, hole);
      if (!sol || !sol.length) return;
      hints++; sfx.tap(); flashBtn(arrows[sol[0]]);
      api.hint(`Try tilting ${DNAME[sol[0]]}: tap ${DARROW[sol[0]]}.`);
    }
    api.stage.__lab = { n, blk, hole, min: G.min, get ball() { return ball; }, get rolling() { return rolling; }, get finished() { return finished; }, tilt, solve: () => mmSolve(n, blk, ball, hole) };
    render();
  }

  /* =========================================================
     4. WHAT COMES NEXT?
     ========================================================= */
  register({ id: 'nextup', cat: 'logic', order: 13, name: 'What Comes Next?', icon: '🔮', desc: 'Spot the pattern and pick what comes next', start: startNext });

  const NXC = [...CUBES, { c: 'orange', s: '◆' }, { c: 'grape', s: '✚' }];
  const CNAME = { coral: 'red', sky: 'blue', sun: 'yellow', leaf: 'green', berry: 'pink', orange: 'orange', grape: 'purple' };
  const EMO = [['🍎', '🍌', '🍇', '🍓', '🍐', '🍊'], ['🐶', '🐱', '🐰', '🐻', '🐸', '🐥'], ['☀️', '☁️', '☔', '⛄', '🌈', '⭐'], ['🌷', '🌻', '🌹', '🌼', '🍀', '🌵'], ['🚗', '🚂', '⛵', '🚲', '✈️', '🚌'], ['☕', '🍰', '🧁', '🍪', '🥐', '🍩']];
  const SHAPES = ['●', '★', '▲', '■', '♥', '◆'];
  const SIZES = [.42, .56, .7, .85, 1];
  const it = {
    cube: (col, z = 1) => ({ k: 'cube', c: col.c, s: col.s, z, key: 'c' + col.c + col.s + z, name: CNAME[col.c] }),
    shape: (s, c) => ({ k: 'cube', c, s, z: 1, key: 'c' + c + s + 1 }),
    emo: e => ({ k: 'emo', s: e, key: 'e' + e }),
    num: v => ({ k: 'num', s: String(v), key: 'n' + v, name: String(v) }),
    dots: v => ({ k: 'dots', v, key: 'd' + v }),
    arr: deg => ({ k: 'arr', deg, key: 'a' + ((deg % 360) + 360) % 360 })
  };
  function itemEl(x, big) {
    const w = el('span', 'nx-it' + (big ? ' big' : ''));
    if (x.k === 'cube') { const t = el('span', 'tile nx-cube c-' + x.c, x.s); t.style.setProperty('--z', x.z); w.append(t); }
    else if (x.k === 'emo') w.append(el('span', 'nx-emo', x.s));
    else if (x.k === 'num') w.append(el('span', 'tile nx-num c-card', x.s));
    else if (x.k === 'dots') w.append(el('span', 'tile nx-dots c-card', '<i></i>'.repeat(x.v)));
    else if (x.k === 'arr') { const t = el('span', 'tile nx-arr c-sky', `<span>⬆</span>`); t.style.setProperty('--r', x.deg + 'deg'); w.append(t); }
    return w;
  }
  // Build a repeating pattern (letters like 'AAB') of units, showing len items.
  function repeatPat(units, shape, len) {
    const seq = [...Array(len + 1)].map((_, i) => units[shape.charCodeAt(i % shape.length) - 65]);
    return { items: seq.slice(0, len), answer: seq[len] };
  }
  function unitLen(shape, L, minCycles = 2) { const u = shape.length; return u * minCycles + (L <= 1 ? 0 : randInt(u)); }

  const NX_TYPES = [
    { id: 'abCube', min: 1, make(L) { const cols = shuffle(NXC.slice()), u = [it.cube(cols[0]), it.cube(cols[1])]; return Object.assign(repeatPat(u, 'AB', unitLen('AB', L)), { pool: cols.slice(2, 5).map(c => it.cube(c)).concat(u), say: 'colours', help: 'units' }); } },
    { id: 'abEmo', min: 1, make(L) { const set = shuffle(pick(EMO).slice()), u = [it.emo(set[0]), it.emo(set[1])]; return Object.assign(repeatPat(u, 'AB', unitLen('AB', L)), { pool: set.slice(2).map(it.emo).concat(u), say: 'pictures' }); } },
    { id: 'abcCube', min: 2, make(L) { const cols = shuffle(NXC.slice()), u = cols.slice(0, 3).map(c => it.cube(c)); return Object.assign(repeatPat(u, 'ABC', unitLen('ABC', L)), { pool: cols.slice(3, 5).map(c => it.cube(c)).concat(u), say: 'colours', help: 'units' }); } },
    { id: 'aab', min: 2, make(L) { const shape = pick(L < 4 ? ['AAB'] : ['AAB', 'ABB']); if (Math.random() < .5) { const cols = shuffle(NXC.slice()), u = [it.cube(cols[0]), it.cube(cols[1])]; return Object.assign(repeatPat(u, shape, unitLen(shape, L)), { pool: cols.slice(2, 4).map(c => it.cube(c)).concat(u), say: 'colours', help: 'units' }); } const set = shuffle(pick(EMO).slice()), u = [it.emo(set[0]), it.emo(set[1])]; return Object.assign(repeatPat(u, shape, unitLen(shape, L)), { pool: set.slice(2, 4).map(it.emo).concat(u), say: 'pictures' }); } },
    { id: 'count1', min: 2, make() { const a = 1 + randInt(5), len = 4; const items = [...Array(len)].map((_, i) => it.num(a + i)); const ans = a + len; return { items, answer: it.num(ans), pool: [ans + 1, ans - 2, ans + 2, a].map(it.num), say: 'numbers', step: 1 }; } },
    { id: 'grow', min: 3, make() { const col = pick(NXC), down = Math.random() < .3, sz = down ? SIZES.slice().reverse() : SIZES; return { items: sz.slice(0, 4).map(z => it.cube(col, z)), answer: it.cube(col, sz[4]), pool: [it.cube(col, sz[0]), it.cube(col, sz[2]), it.cube(col, sz[1])], say: 'sizes', growHelp: down ? 'smaller' : 'bigger' }; } },
    { id: 'dots', min: 3, make(L) { const st = L >= 8 && Math.random() < .5 ? 2 : 1, a = 1, len = st === 2 ? 3 : 4; const items = [...Array(len)].map((_, i) => it.dots(a + i * st)); const ans = a + len * st; return { items, answer: it.dots(ans), pool: [ans - st, ans + 1, ans - 1, a].filter(v => v > 0 && v <= 9).map(it.dots), say: 'dots', step: st }; } },
    { id: 'count2', min: 3, make() { const a = 2 * randInt(5), len = 4; const items = [...Array(len)].map((_, i) => it.num(a + 2 * i)); const ans = a + 2 * len; return { items, answer: it.num(ans), pool: [ans - 1, ans + 1, ans + 2, ans - 2].map(it.num), say: 'numbers', step: 2 }; } },
    { id: 'shapes', min: 4, make(L) { const c = pick(['sun', 'sky', 'leaf', 'berry']), sh = shuffle(SHAPES.slice()), shape = pick(['AB', 'ABC']), u = sh.slice(0, shape.length).map(s => it.shape(s, c)); return Object.assign(repeatPat(u, shape, unitLen(shape, L)), { pool: sh.slice(3).map(s => it.shape(s, c)).concat(u), say: 'shapes' }); } },
    { id: 'abcEmo', min: 4, make(L) { const set = shuffle(pick(EMO).slice()), shape = pick(['ABC', 'ABB', 'AAB']), u = set.slice(0, 3).map(it.emo); return Object.assign(repeatPat(u, shape, unitLen(shape, L)), { pool: set.slice(3).map(it.emo).concat(u), say: 'pictures' }); } },
    { id: 'arrows', min: 5, make(L) { const a0 = 90 * randInt(4), st = L >= 12 && Math.random() < .4 ? 45 : (Math.random() < .3 && L >= 8 ? -90 : 90), len = 4; const items = [...Array(len)].map((_, i) => it.arr(a0 + st * i)); const ans = a0 + st * len; return { items, answer: it.arr(ans), pool: [ans + 90, ans + 180, ans - 90, ans + 45, ans - 45].map(it.arr), say: 'arrows', turn: true }; } },
    { id: 'count5', min: 5, make(L) { const opts = [[5, 5 * randInt(4)], [10, 10 * randInt(5)], [-1, 9 + randInt(5)], [3, 3 * randInt(3)]].slice(0, L >= 9 ? 4 : 3), [st, a] = pick(opts), len = 4; const items = [...Array(len)].map((_, i) => it.num(a + st * i)); const ans = a + st * len; return { items, answer: it.num(ans), pool: [ans + st, ans - st, ans + 1, ans - 1, ans + 2].filter(v => v >= 0).map(it.num), say: 'numbers', step: st }; } },
    { id: 'aabb', min: 6, make(L) { const cols = shuffle(NXC.slice()), shape = pick(['AABB', 'ABAC', 'ABCB']), u = cols.slice(0, 3).map(c => it.cube(c)); return Object.assign(repeatPat(u, shape, unitLen(shape, L)), { pool: cols.slice(3, 5).map(c => it.cube(c)).concat(u), say: 'colours', help: 'units' }); } },
    { id: 'two', min: 8, make() {
      const cols = shuffle(NXC.slice()).slice(0, 3), sh = shuffle(SHAPES.slice()).slice(0, 2), cp = Math.random() < .5 ? 3 : 2, len = 6 + randInt(2);
      const mk = i => it.shape(sh[i % 2], cols[i % cp].c), items = [...Array(len)].map((_, i) => mk(i)), ans = mk(len);
      const pool = [it.shape(sh[(len + 1) % 2], cols[len % cp].c), it.shape(sh[len % 2], cols[(len + 1) % cp].c), it.shape(sh[(len + 1) % 2], cols[(len + 1) % cp].c), it.shape(sh[len % 2], cols[(len + 2) % 3].c)];
      return { items, answer: ans, pool, say: 'two' };
    } }
  ];
  function nxMake(L, lastId) {
    const ok = NX_TYPES.filter(t => t.min <= L && t.id !== lastId);
    // newer patterns turn up a little more often once unlocked
    const w = ok.map(t => 1 + (L - t.min < 3 ? 1 : 0)), tot = w.reduce((a, b) => a + b, 0);
    let r = Math.random() * tot, t = ok[0];
    for (let i = 0; i < ok.length; i++) { r -= w[i]; if (r < 0) { t = ok[i]; break; } }
    const q = t.make(L); q.id = t.id;
    const nOpt = L <= 3 ? 3 : 4, seen = new Set([q.answer.key]), opts = [q.answer];
    for (const p of shuffle(q.pool.slice())) { if (opts.length >= nOpt) break; if (!seen.has(p.key)) { seen.add(p.key); opts.push(p); } }
    q.options = shuffle(opts);
    return q;
  }
  const SAY = { colours: 'Look at the colours.', pictures: 'Look at the pictures.', sizes: 'Look at the sizes.', numbers: 'Look at the numbers.', dots: 'Count the dots on each card.', shapes: 'Look at the shapes.', arrows: 'Watch which way the arrow points.', two: 'Look at the colour and the shape.' };
  function nxHelp(q) {
    if (q.help === 'units') return 'Not quite. Say the colours out loud: ' + q.items.slice(0, 5).map(x => x.name).join(', ') + '…';
    if (q.step !== undefined) return q.say === 'dots' ? `Not quite. Each card has ${q.step === 1 ? 'one more dot' : 'two more dots'}.` : q.step < 0 ? 'Not quite. The numbers go down by one each time.' : `Not quite. The numbers go up by ${q.step} each time.`;
    if (q.growHelp) return `Not quite. Each one is a little ${q.growHelp} than the last.`;
    if (q.turn) return 'Not quite. Watch how far the arrow turns each time.';
    if (q.say === 'two') return 'Not quite. The colours and the shapes each repeat in their own way.';
    return 'Not quite. Look at how the pattern repeats, then try again.';
  }

  function startNext(L, api) {
    const total = L <= 1 ? 4 : 5;
    let round = 0, mistakes = 0, lastId = null, streak = 0;
    function show() {
      api.rounds(total, round); api.stage.innerHTML = '';
      const q = nxMake(L, lastId); lastId = q.id;
      let wrong = 0, solved = false;
      api.hint(SAY[q.say] + ' What comes next? Tap your answer.');
      const box = el('div', 'nx-box'), seq = el('div', 'nx-seq');
      q.items.forEach((x, i) => { const e = itemEl(x); e.classList.add('in'); e.style.animationDelay = i * 70 + 'ms'; seq.append(e); });
      const slot = el('span', 'nx-it nx-q', '?'); seq.append(slot);
      const ch = el('div', 'nx-ch'), btns = [];
      q.options.forEach(o => {
        const b = el('button', 'nx-op'); b.type = 'button'; b.dataset.key = o.key; b.append(itemEl(o));
        b.onclick = () => {
          if (solved || b.classList.contains('nope')) return;
          if (o.key === q.answer.key) {
            solved = true; streak++; b.classList.add('right');
            slot.className = 'nx-it nx-q fill in'; slot.textContent = ''; slot.append(itemEl(o).firstChild);
            tone(523 + streak * 60, .14, 'triangle', .12); tone(784 + streak * 60, .2, 'triangle', .1, .1);
            api.hint('Yes! ' + cheer()); round++;
            api.later(() => { if (round === total) { api.rounds(total, round); api.done(starsFor(mistakes, 1, 3)); } else show(); }, 1500);
          } else {
            mistakes++; wrong++; streak = 0; b.classList.add('nope'); wob(b); sfx.soft();
            api.hint(nxHelp(q));
            if (wrong >= 2) { const other = btns.find(x => x.dataset.key !== q.answer.key && !x.classList.contains('nope')); if (other && btns.filter(x => !x.classList.contains('nope')).length > 2) other.classList.add('nope'); }
          }
        };
        btns.push(b); ch.append(b);
      });
      box.append(seq, el('p', 'nx-say', 'Pick one:'), ch); api.stage.append(box);
      api.stage.__lab = { answer: q.answer.key, id: q.id, round, items: q.items.map(x => x.key), options: q.options.map(x => x.key) };
    }
    show();
  }
})();
