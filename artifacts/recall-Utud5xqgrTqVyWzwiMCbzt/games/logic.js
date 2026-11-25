/* Recall: Logic Grids (Picture Grid, Number Place, Colour Paths, Paint Flood, Code Breaker, Safe Squares, Island Bridges) */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor, CUBES } = R;
  const PAL = CUBES.concat([{ c: 'orange', s: '◆' }, { c: 'grape', s: '✚' }]);
  const NAMES = { coral: 'red', sky: 'blue', sun: 'yellow', leaf: 'green', berry: 'pink', orange: 'orange', grape: 'purple' };

  R.css(`
/* ---- shared (lo-) ---- */
.lo-bar{display:flex; flex-wrap:wrap; justify-content:center; gap:12px 14px; margin-top:24px}
.lo-bar .btn{min-width:120px}
.lo-on{outline:4px solid #fff; outline-offset:3px}
.lo-info{text-align:center; font:600 1.3rem var(--display); margin:16px 0 0; color:var(--on-table)}
.lo-info b{color:var(--sun)}

/* ---- Picture Grid (pg-) ---- */
.pg-wrap{display:flex; justify-content:center}
.pg-grid{display:grid; gap:3px; font-family:var(--display)}
.pg-cc{display:flex; flex-direction:column; justify-content:flex-end; align-items:center; font:700 var(--fs)/1.08 var(--display); padding-bottom:5px; transition:opacity .3s}
.pg-rc{display:flex; justify-content:flex-end; align-items:center; gap:.38em; font:700 var(--fs)/1 var(--display); padding-right:7px; white-space:nowrap; transition:opacity .3s}
.pg-dim{opacity:.38}
.pg-cell{width:var(--cs); height:var(--cs); border:0; padding:0; border-radius:20%; cursor:pointer; display:grid; place-items:center;
  background:rgba(255,255,255,.9); box-shadow:inset 0 -3px 0 rgba(0,0,0,.13); font:700 calc(var(--cs) * .5)/1 var(--display); color:var(--ink-soft); transition:background .3s, opacity .4s}
.pg-cell.pg-f{background:linear-gradient(155deg, rgba(255,255,255,.38), rgba(255,255,255,0) 50%), var(--fc, #2E3D47); box-shadow:inset 0 -4px 0 rgba(0,0,0,.25), 0 2px 0 rgba(0,0,0,.2); animation:bounceIn .2s}
.pg-cell.pg-x{background:rgba(255,255,255,.25); color:rgba(255,255,255,.8)}
.pg-cell.pg-oops{background:#FFE0D6; color:var(--coral-d)}
.pg-solved .pg-cell.pg-x{opacity:0}
.pg-solved .pg-cell.pg-f{animation:bounceIn .45s backwards}
.pg-sep5{box-shadow:inset 0 -3px 0 rgba(0,0,0,.13), 3px 0 0 rgba(255,255,255,.45)}

/* ---- Number Place (sd-) ---- */
.sd-board{display:grid; gap:var(--bg); padding:var(--bg); margin:0 auto; width:max-content; border-radius:18px; background:#5B4A35; box-shadow:0 7px 0 #3B2F21, 0 14px 24px rgba(0,0,0,.3)}
.sd-box{display:grid; gap:var(--cg)}
.sd-cell{width:var(--cs); height:var(--cs); border:0; padding:0; border-radius:8px; background:var(--card); color:var(--ink); cursor:pointer;
  font:700 calc(var(--cs) * .58)/1 var(--display); display:grid; place-items:center; box-shadow:inset 0 -3px 0 rgba(0,0,0,.1)}
.sd-cell.sd-mine{color:var(--sky-d)}
.sd-cell.sd-peer{background:#FFEFC9}
.sd-cell.sd-same{background:#CFE9FF}
.sd-cell.sd-sel{background:var(--sun); box-shadow:inset 0 -3px 0 var(--sun-d), 0 0 0 3px #fff}
.sd-cell.sd-wrong{color:var(--coral-d); background:#FFE0D6}
.sd-cell.sd-new{animation:bounceIn .3s}
.sd-pad{display:grid; grid-template-columns:repeat(auto-fit, minmax(60px, 1fr)); gap:12px; max-width:560px; margin:24px auto 0}
.sd-key{min-height:66px; font-size:2rem; padding:0}
.sd-key.sd-full{opacity:.35}

/* ---- Colour Paths (cp-) ---- */
.cp-board{position:relative; display:grid; gap:var(--g); margin:0 auto; width:max-content; padding:var(--g); border-radius:20px; background:rgba(0,0,0,.2); box-shadow:inset 0 4px 10px rgba(0,0,0,.25)}
.cp-cell{width:var(--cs); height:var(--cs); border:0; padding:0; border-radius:16%; cursor:pointer; background:rgba(255,255,255,.14); box-shadow:inset 0 -3px 0 rgba(0,0,0,.15); display:grid; place-items:center; position:relative; z-index:1}
.cp-cell.cp-p{background:color-mix(in srgb, var(--c) 40%, transparent)}
.cp-dot{position:relative; z-index:3; width:100%; height:100%; font:700 calc(var(--cs) * .48)/1 var(--display); border-radius:22%}
.cp-dot.cp-cur{outline:4px solid #fff; outline-offset:2px; animation:bounceIn .3s}
.cp-svg{position:absolute; left:var(--g); top:var(--g); pointer-events:none; z-index:2; overflow:visible}

/* ---- Paint Flood (pf-) ---- */
.pf-board{display:grid; margin:0 auto; width:max-content; border-radius:16px; overflow:hidden; box-shadow:0 7px 0 rgba(0,0,0,.28), 0 14px 24px rgba(0,0,0,.3)}
.pf-cell{width:var(--cs); height:var(--cs); border:0; padding:0; cursor:pointer; display:grid; place-items:center; color:rgba(24,36,44,.55);
  font:700 calc(var(--cs) * .42)/1 var(--display); background:linear-gradient(155deg, rgba(255,255,255,.3), rgba(255,255,255,0) 60%), var(--c); transition:background .25s}
.pf-cell.pf-new{animation:bounceIn .35s backwards}
.pf-pal{display:flex; flex-wrap:wrap; justify-content:center; gap:14px; margin-top:24px}
.pf-sw{width:68px; height:68px; font-size:2rem; cursor:pointer; transition:translate .15s}
.pf-sw.lo-on{translate:0 -8px}

/* ---- Code Breaker (kb-) ---- */
.kb-wrap{max-width:620px; margin:0 auto; display:grid; gap:12px}
.kb-row{display:flex; align-items:center; justify-content:center; gap:10px; flex-wrap:wrap}
.kb-pegs{display:flex; gap:8px}
.kb-peg{width:var(--ps); height:var(--ps); font:700 calc(var(--ps) * .5)/1 var(--display); border-radius:22%}
.kb-hid{--c:#2E3D47; --d:#18242C; color:#fff}
.kb-slot{--c:rgba(255,255,255,.14); --d:rgba(0,0,0,.2); outline:3px dashed rgba(255,255,255,.55); outline-offset:-8px; cursor:pointer; border:0; padding:0}
.kb-slot.kb-full{outline:0; animation:bounceIn .2s}
.kb-fb{display:flex; align-items:center; gap:4px; min-width:100px; min-height:52px; padding:4px 12px; border-radius:14px; background:var(--card); color:var(--ink); font:700 2rem/1 var(--body); box-shadow:0 4px 0 var(--card-edge)}
.kb-fb .kb-none{font:600 1.05rem var(--display); color:var(--ink-soft)}
.kb-n{font:700 1.1rem var(--display); color:var(--on-table-soft); min-width:1.6em; text-align:right}
.kb-legend{display:flex; flex-wrap:wrap; justify-content:center; gap:2px 18px; text-align:center; font:600 1.1rem var(--display); color:var(--on-table-soft); margin:2px 0 0}
.kb-legend b{font:700 1.5rem var(--body); color:var(--on-table)}
.kb-cur{padding:12px; border-radius:20px; background:rgba(0,0,0,.18)}
.kb-pal{display:flex; flex-wrap:wrap; justify-content:center; gap:12px; margin-top:6px}
.kb-pal .tile{width:64px; height:64px; font-size:1.9rem; cursor:pointer}
.kb-pal .kb-used{opacity:.3}

/* ---- Safe Squares (ss-) ---- */
.ss-board{display:grid; gap:var(--g); margin:0 auto; width:max-content; padding:var(--g); border-radius:18px; background:#6B4E2E; box-shadow:0 7px 0 #47331D, 0 14px 24px rgba(0,0,0,.3)}
.ss-cell{width:var(--cs); height:var(--cs); border:0; padding:0; cursor:pointer; display:grid; place-items:center; font:700 calc(var(--cs) * .56)/1 var(--display); border-radius:18%}
.ss-cell.tile{box-shadow:inset 0 -4px 0 rgba(0,0,0,.16), inset 0 2px 0 rgba(255,255,255,.45), 0 3px 0 var(--d)}
.ss-open{background:#F3E6CC; box-shadow:inset 0 2px 4px rgba(0,0,0,.18); animation:bounceIn .25s backwards; cursor:default}
.ss-ouch{background:#F7D6E6}
.ss-cell svg{width:78%; height:78%}
.ss-flag{font-size:calc(var(--cs) * .5)}

/* ---- Island Bridges (ib-) ---- */
.ib-board{position:relative; margin:0 auto; border-radius:22px; background:radial-gradient(circle at 30% 20%, rgba(255,255,255,.12), transparent 60%), rgba(0,0,0,.2); box-shadow:inset 0 4px 12px rgba(0,0,0,.28)}
.ib-svg{position:absolute; inset:0; width:100%; height:100%; pointer-events:none}
.ib-isl{position:absolute; transform:translate(-50%, -50%); background:none; border:0; padding:0; cursor:pointer; display:grid; place-items:center; z-index:2}
.ib-isl .tile{width:86%; height:86%; border-radius:50%; font:700 calc(var(--cs) * .44)/1 var(--display); transition:transform .15s}
.ib-isl.ib-sel .tile{transform:scale(1.12); outline:4px solid #fff; outline-offset:2px}
.ib-isl.ib-can .tile{outline:3px dashed rgba(255,255,255,.85); outline-offset:3px}
`);

  register({ id: 'picgrid', cat: 'logic', order: 1, name: 'Picture Grid', icon: '🖼️', desc: 'Use the number clues to paint a picture', start: startPic });
  register({ id: 'sudoku', cat: 'logic', order: 2, name: 'Number Place', icon: '🔢', desc: 'Fill the grid so no number repeats', start: startSudoku });
  register({ id: 'paths', cat: 'logic', order: 3, name: 'Colour Paths', icon: '〰️', desc: 'Join matching dots and fill the board', start: startPaths });
  register({ id: 'flood', cat: 'logic', order: 4, name: 'Paint Flood', icon: '🎨', desc: 'Paint the whole board one colour', start: startFlood });
  register({ id: 'codebreak', cat: 'logic', order: 5, name: 'Code Breaker', icon: '🔐', desc: 'Work out the hidden row of colours', start: startCode });
  register({ id: 'safe', cat: 'logic', order: 6, name: 'Safe Squares', icon: '🌱', desc: 'Uncover the garden, avoid the thistles', start: startSafe });
  register({ id: 'bridges', cat: 'logic', order: 7, name: 'Island Bridges', icon: '🌉', desc: 'Join every island with the right bridges', start: startBridges });

  /* ---------- shared bits ---------- */
  const stageW = api => Math.max(280, Math.min(api.stage.clientWidth || 340, 1000));
  const mkBtn = (cls, html, fn) => { const b = el('button', cls, html); b.type = 'button'; if (fn) b.onclick = fn; return b; };
  const nb4 = (i, n) => { const r = (i / n) | 0, c = i % n, o = []; if (r) o.push(i - n); if (r < n - 1) o.push(i + n); if (c) o.push(i - 1); if (c < n - 1) o.push(i + 1); return o; };
  const nb8 = (i, n) => { const r = (i / n) | 0, c = i % n, o = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < n && cc >= 0 && cc < n) o.push(rr * n + cc); } return o; };
  // biggest board size (up to want) whose cells stay at least ~40px across the space we really have
  const fitN = (W, want, min, gap) => { let n = want; while (n > 4 && n * min + (n + 1) * gap > W) n--; return n; };
  const TEST = !!window.__recallTest; // test hooks only exist when a test harness sets this before load
  const vary = (L, cap) => Math.min(L, cap); // levels plateau at a cap; puzzles still vary as they are generated fresh
  function toggleBar(items, onPick) {
    const bar = el('div', 'lo-bar');
    const bs = items.map((it, i) => mkBtn('btn ' + it.cls, it.label, () => { sfx.tap(); set(i); onPick(i); }));
    function set(i) { bs.forEach((b, k) => b.classList.toggle('lo-on', k === i)); }
    bar.append(...bs); set(0);
    return { bar, set };
  }

  /* =========================================================
     1. PICTURE GRID (nonogram)
     ========================================================= */
  const PCOL = { r: 'var(--coral)', o: 'var(--orange)', y: 'var(--sun)', g: 'var(--leaf)', b: 'var(--sky)', p: 'var(--berry)', v: 'var(--grape)', e: 'var(--peach)', k: '#9A6A3E', n: '#2E3D47', w: '#FFFFFF' };
  const PICS = {
    5: [
      ['a heart', ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..']],
      ['a house', ['..r..', '.rrr.', 'rrrrr', '.yky.', '.yky.']],
      ['a cup', ['bbbb.', 'bbbbb', 'bbbbb', 'bbbb.', 'kkkk.']],
      ['a flower', ['.ppp.', 'ppypp', '.ppp.', 'g.g.g', '.ggg.']],
      ['a tree', ['..g..', '.ggg.', 'ggggg', '..k..', '..k..']]
    ],
    6: [
      ['a sailing boat', ['..r...', '..rr..', '..rrr.', '..k...', 'kkkkkk', '.kkkk.']],
      ['a mushroom', ['.rrrr.', 'rrwrrr', 'rrrrwr', '..ee..', '..ee..', '.eeee.']],
      ['a cat', ['o....o', 'oo..oo', 'oooooo', 'onoono', 'oooooo', '..oo..']]
    ],
    7: [
      ['an umbrella', ['...v...', '.vvvvv.', 'vvvvvvv', '...k...', '...k...', '...k.k.', '....k..']],
      ['an apple', ['....g..', '...kg..', '.rrkrr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..r.r..']],
      ['a fish', ['.......', '..bbb.b', '.bbbbbb', 'bnbbbb.', '.bbbbbb', '..bbb.b', '.......']]
    ],
    8: [
      ['a house', ['...rr...', '..rrrr..', '.rrrrrr.', 'rrrrrrrr', '.yyyyyy.', '.ybyyky.', '.ybyyky.', '.yyyyky.']],
      ['a tulip', ['.p.pp.p.', '.pppppp.', '.pppppp.', '..pppp..', '...gg...', 'g..gg...', 'gg.gg.g.', '.gggggg.']],
      ['a cup of tea', ['.v..v...', '..v..v..', '.v..v...', 'bbbbbb..', 'bbbbbbbb', 'bbbbbb.b', '.bbbb.b.', 'kkkkkkk.']]
    ],
    10: [
      ['a heart', ['.rr....rr.', 'rrrr..rrrr', 'rrrrrrrrrr', 'rrrrrrrrrr', 'rrrrrrrrrr', '.rrrrrrrr.', '..rrrrrr..', '...rrrr...', '....rr....', '..........']],
      ['an apple tree', ['....gg....', '...gggg...', '..gggggg..', '.gggrgggg.', '..gggggg..', '.ggggggrg.', 'gggggggggg', '....kk....', '....kk....', '..kkkkkk..']],
      ['a sailing boat', ['....r.....', '....rr....', '....rrr...', '...yrrrr..', '..yyrrrrr.', '.yyyrrrrrr', '....k.....', 'kkkkkkkkkk', '.kkkkkkkk.', '..kkkkkk..']],
      ['a cat', ['o........o', 'oo......oo', 'oooooooooo', 'o.oooooo.o', 'oooooooooo', 'oooooooooo', 'ooo.pp.ooo', '.oooooooo.', '..oooooo..', '...oooo...']]
    ]
  };
  const runs = a => { const o = []; let k = 0; a.forEach(v => { if (v) k++; else if (k) { o.push(k); k = 0; } }); if (k) o.push(k); return o; };
  function lineSolve(n, clue, known) {
    const can1 = Array(n).fill(false), can0 = Array(n).fill(false), cur = Array(n).fill(0);
    let any = false;
    const rest = clue.map((_, b) => clue.slice(b + 1).reduce((a, x) => a + x + 1, 0));
    (function rec(b, start) {
      if (b === clue.length) {
        for (let i = start; i < n; i++) if (known[i] === 1) return;
        any = true;
        for (let i = 0; i < n; i++) { if (cur[i]) can1[i] = true; else can0[i] = true; }
        return;
      }
      const len = clue[b];
      for (let p = start; p + len + rest[b] <= n; p++) {
        if (p > start && known[p - 1] === 1) break;
        let ok = true;
        for (let i = p; i < p + len; i++) if (known[i] === 0) { ok = false; break; }
        if (ok && p + len < n && known[p + len] === 1) ok = false;
        if (ok) { for (let i = p; i < p + len; i++) cur[i] = 1; rec(b + 1, p + len + 1); for (let i = p; i < p + len; i++) cur[i] = 0; }
      }
    })(0, 0);
    return any ? { can1, can0 } : null;
  }
  function nonoSolvable(sol, n) {
    const rc = [], cc = [];
    for (let r = 0; r < n; r++) rc.push(runs(sol.slice(r * n, r * n + n)));
    for (let c = 0; c < n; c++) cc.push(runs([...Array(n)].map((_, r) => sol[r * n + c])));
    const g = Array(n * n).fill(-1);
    let changed = true;
    while (changed) {
      changed = false;
      for (let t = 0; t < 2 * n; t++) {
        const idx = [...Array(n)].map((_, k) => t < n ? t * n + k : k * n + (t - n));
        const res = lineSolve(n, t < n ? rc[t] : cc[t - n], idx.map(i => g[i]));
        if (!res) return false;
        idx.forEach((i, k) => { if (g[i] === -1 && res.can1[k] !== res.can0[k]) { g[i] = res.can1[k] ? 1 : 0; changed = true; } });
      }
    }
    return g.every(v => v !== -1);
  }
  // random symmetric "blob" pictures, coloured by connected part, kept only if line-solvable
  function genPicture(n, minBusy = 0) {
    for (let t = 0; t < 400; t++) {
      let g = Array(n * n).fill(0);
      const half = Math.ceil(n / 2), dens = .45 + Math.random() * .2;
      for (let r = 0; r < n; r++) for (let c = 0; c < half; c++) { const v = Math.random() < dens ? 1 : 0; g[r * n + c] = v; g[r * n + n - 1 - c] = v; }
      for (let s = 0; s < (n <= 6 ? randInt(2) : 2); s++) g = g.map((v, i) => { const k = nb8(i, n).filter(j => g[j]).length; return k >= 5 ? 1 : k <= 2 ? 0 : v; });
      const fill = g.filter(Boolean).length / (n * n);
      if (fill < .35 || fill > .72) continue;
      const lines = [...Array(2 * n)].map((_, t) => runs([...Array(n)].map((_, k) => g[t < n ? t * n + k : k * n + t - n])));
      if (lines.filter(c => c.length >= 2).length < minBusy || lines.some(c => !c.length)) continue;
      if (!nonoSolvable(g, n)) continue;
      const cols = shuffle(['r', 'o', 'y', 'g', 'b', 'p', 'v']), art = Array(n * n).fill('.');
      let part = 0;
      g.forEach((v, i) => {
        if (!v || art[i] !== '.') return;
        const ch = cols[part++ % cols.length], st = [i]; art[i] = ch;
        while (st.length) { const x = st.pop(); nb4(x, n).forEach(j => { if (g[j] && art[j] === '.') { art[j] = ch; st.push(j); } }); }
      });
      return ['a pattern', [...Array(n)].map((_, r) => art.slice(r * n, r * n + n).join(''))];
    }
    return pick(PICS[n] || PICS[5]);
  }
  function startPic(L, api) {
    // pick the biggest size (up to the level's size) whose cells stay big enough on this screen, counting clue space
    const want = [5, 5, 6, 7, 8, 8, 10][Math.min(L, 7) - 1], Wd = stageW(api);
    const clueTxt = c => c.length ? c : [0];
    let n, entry, fs, clueW, cs, rowC, colC, colOf, sol, picName;
    for (const size of [10, 8, 7, 6, 5].filter(x => x <= want)) {
      const hand = (PICS[size] || []).filter(p => p.ok ?? (p.ok = nonoSolvable(p[1].join('').split('').map(ch => ch !== '.'), size)));
      const capped = size < want;
      const tries = shuffle(hand.slice()).filter(() => !capped || L <= 4).slice(0, 2).concat([...Array(size === 5 ? 6 : 12)].map(() => null));
      if (!capped && L > 6 && Math.random() < .7) tries.unshift(null);
      for (let ti = 0; ti < tries.length; ti++) {
        const t = tries[ti];
        const e = t || genPicture(size, Math.min(size, 2 + Math.floor(L / 3)));
        let art = e[1].map(r => r.split(''));
        if (randInt(2)) art = art.map(r => r.slice().reverse());
        const co = art.flat(), so = co.map(ch => ch !== '.');
        const rc = [...Array(size)].map((_, r) => runs(so.slice(r * size, r * size + size)));
        const cc = [...Array(size)].map((_, c) => runs([...Array(size)].map((_, r) => so[r * size + c])));
        const f = size <= 5 ? 24 : size <= 6 ? 22 : 20;
        const rowLen = Math.max(...rc.map(c => clueTxt(c).reduce((a, x) => a + String(x).length, 0) + (clueTxt(c).length - 1) * .65));
        const cw = Math.ceil(rowLen * f * .62 + 12);
        const c2 = Math.floor(Math.min(62, (Wd - cw - 3 * size - 2) / size));
        // generated pictures must not be too plain: several lines need two or more blocks
        const busy = rc.concat(cc).filter(c => c.length >= 2).length;
        if (!t && busy < Math.min(size, 2 + Math.floor(L / 3)) && !(size === 5 && ti === tries.length - 1)) continue;
        if (c2 >= 40 || size === 5) { n = size; entry = e; fs = f; clueW = cw; cs = c2; rowC = rc; colC = cc; colOf = co; sol = so; picName = e[0]; break; }
      }
      if (n) break;
    }
    const st = Array(n * n).fill(0); // 0 blank, 1 filled, 2 marked empty
    let mode = 0, mistakes = 0, left = sol.filter(Boolean).length, finished = false;

    api.hint('The numbers say how many squares in a row to fill. Tap a square to fill it.');
    const colH = Math.max(...colC.map(c => clueTxt(c).length)) * fs * 1.08 + 8;
    const grid = el('div', 'pg-grid');
    grid.style.cssText = `grid-template-columns:${clueW}px repeat(${n}, ${cs}px); grid-template-rows:${colH}px; --cs:${cs}px; --fs:${fs}px`;
    grid.append(el('div'));
    const ccEls = colC.map(c => { const d = el('div', 'pg-cc', clueTxt(c).map(x => `<span>${x}</span>`).join('')); grid.append(d); return d; });
    const rcEls = [], cells = [];
    for (let r = 0; r < n; r++) {
      const d = el('div', 'pg-rc', clueTxt(rowC[r]).map(x => `<span>${x}</span>`).join('')); rcEls.push(d); grid.append(d);
      for (let c = 0; c < n; c++) {
        const i = r * n + c;
        const b = mkBtn('pg-cell', '', () => tap(i)); b.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}`);
        cells.push(b); grid.append(b);
      }
    }
    const wrap = el('div', 'pg-wrap'); wrap.append(grid);
    const tg = toggleBar([{ cls: 'c-leaf', label: '■ Fill' }, { cls: 'c-card', label: '✕ Mark empty' }], i => {
      mode = i; api.hint(i ? 'Tap squares you know stay empty.' : 'Tap a square to fill it.');
    });
    api.stage.append(wrap, tg.bar);

    function paint(i) {
      const b = cells[i]; b.className = 'pg-cell' + (st[i] === 1 ? ' pg-f' : st[i] === 2 ? ' pg-x' : '');
      b.textContent = st[i] === 2 ? '✕' : '';
    }
    function lineIdx(t) { return [...Array(n)].map((_, k) => t < n ? t * n + k : k * n + (t - n)); }
    function checkLine(t) {
      const idx = lineIdx(t);
      if (idx.every(i => !sol[i] || st[i] === 1)) {
        const was = (t < n ? rcEls[t] : ccEls[t - n]).classList.contains('pg-dim');
        (t < n ? rcEls[t] : ccEls[t - n]).classList.add('pg-dim');
        idx.forEach(i => { if (!st[i]) { st[i] = 2; paint(i); } });
        return !was;
      }
      return false;
    }
    let combo = 0;
    function fill(i) {
      st[i] = 1; left--; paint(i);
      const r = (i / n) | 0, c = i % n;
      const a = checkLine(r), b2 = checkLine(n + c);
      if (a || b2) { combo++; tone(520 + Math.min(combo, 8) * 50, .14, 'triangle', .12); } else tone(440, .07, 'triangle', .07);
      if (!left) win();
    }
    function tap(i) {
      if (finished || st[i]) return;
      if (mode === 0) {
        if (sol[i]) fill(i);
        else { mistakes++; combo = 0; st[i] = 2; cells[i].className = 'pg-cell pg-oops'; cells[i].textContent = '✕'; wob(cells[i]); sfx.soft(); toast('That one stays empty'); api.later(() => paint(i), 1100); }
      } else {
        if (!sol[i]) { st[i] = 2; paint(i); sfx.tap(); }
        else { mistakes++; combo = 0; wob(cells[i]); sfx.soft(); toast('That one is part of the picture'); fill(i); }
      }
    }
    function win() {
      finished = true;
      grid.classList.add('pg-solved');
      cells.forEach((b, i) => { if (sol[i]) { b.style.setProperty('--fc', PCOL[colOf[i]] || 'var(--sky)'); b.style.animationDelay = (((i / n) | 0) + (i % n)) * 35 + 'ms'; b.classList.remove('pg-f'); void b.offsetWidth; b.classList.add('pg-f'); } });
      sfx.good(); api.hint(`You painted ${picName}!`); toast(cheer());
      api.later(() => api.done(starsFor(mistakes, n <= 6 ? 0 : 1, n <= 6 ? 2 : 4)), 1100);
    }
    if (TEST) api.stage.__auto = () => { tg.set(0); mode = 0; sol.forEach((v, i) => { if (v && !st[i]) cells[i].click(); }); };
  }

  /* =========================================================
     2. NUMBER PLACE (sudoku)
     ========================================================= */
  function sdSetup(N, bh, bw) {
    const units = [];
    for (let r = 0; r < N; r++) units.push([...Array(N)].map((_, c) => r * N + c));
    for (let c = 0; c < N; c++) units.push([...Array(N)].map((_, r) => r * N + c));
    for (let br = 0; br < N; br += bh) for (let bc = 0; bc < N; bc += bw) { const u = []; for (let r = 0; r < bh; r++) for (let c = 0; c < bw; c++) u.push((br + r) * N + bc + c); units.push(u); }
    const peers = [...Array(N * N)].map((_, i) => [...new Set(units.filter(u => u.includes(i)).flat())].filter(j => j !== i));
    return { units, peers };
  }
  function sdSolved(N, bh, bw) {
    const base = (r, c) => (bw * (r % bh) + Math.floor(r / bh) + c) % N;
    const rows = shuffle([...Array(N / bh).keys()]).flatMap(b => shuffle([...Array(bh).keys()]).map(x => b * bh + x));
    const cols = shuffle([...Array(N / bw).keys()]).flatMap(s => shuffle([...Array(bw).keys()]).map(x => s * bw + x));
    const dig = shuffle([...Array(N)].map((_, k) => k + 1)), tr = bh === bw && randInt(2);
    const g = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) g.push(tr ? dig[base(rows[c], cols[r])] : dig[base(rows[r], cols[c])]);
    return g;
  }
  // solves using only naked and hidden singles: success means a unique, gentle puzzle
  function sdSingles(g0, N, S) {
    const g = g0.slice(), full = (1 << N) - 1;
    for (;;) {
      let prog = false, empty = 0;
      const cand = g.map((v, i) => { if (v) return 0; let m = full; for (const p of S.peers[i]) if (g[p]) m &= ~(1 << (g[p] - 1)); return m; });
      for (let i = 0; i < g.length; i++) if (!g[i]) { empty++; const m = cand[i]; if (!m) return false; if (!(m & (m - 1))) { g[i] = 32 - Math.clz32(m); prog = true; } }
      if (!empty) return true;
      if (prog) continue;
      for (const u of S.units) for (let v = 1; v <= N; v++) {
        if (u.some(i => g[i] === v)) continue;
        const pl = u.filter(i => !g[i] && (cand[i] & (1 << (v - 1))));
        if (pl.length === 1) { g[pl[0]] = v; prog = true; }
      }
      if (!prog) return false;
    }
  }
  function sdPuzzle(N, bh, bw, clues) {
    const S = sdSetup(N, bh, bw), sol = sdSolved(N, bh, bw), g = sol.slice();
    let count = N * N;
    for (const i of shuffle([...Array(N * N).keys()])) {
      if (count <= clues) break;
      const v = g[i]; g[i] = 0;
      if (sdSingles(g, N, S)) count--; else g[i] = v;
    }
    return { sol, giv: g, S };
  }
  function startSudoku(L, api) {
    const sp = L <= 2 ? { N: 4, bh: 2, bw: 2, clues: L === 1 ? 11 : 9 }
      : L <= 5 ? { N: 6, bh: 2, bw: 3, clues: [24, 22, 20][L - 3] }
      : { N: 9, bh: 3, bw: 3, clues: Math.max(34, 46 - (vary(L, 12) - 6) * 2) + randInt(2) };
    const { N, bh, bw } = sp, { sol, giv } = sdPuzzle(N, bh, bw, sp.clues);
    const cur = giv.slice();
    let sel = -1, mistakes = 0, finished = false, busy = false;
    api.hint('Tap an empty square, then tap a number. Each row, column and box holds every number once.');
    const Wd = Math.min(stageW(api), 600);
    const bgap = N === 9 ? 4 : 8, cg = N === 9 ? 2 : 4;
    const cs = Math.floor(Math.min(N === 4 ? 84 : 64, (Wd - bgap * (N / bw + 1) - cg * (N - N / bw)) / N));
    const board = el('div', 'sd-board');
    board.style.cssText = `--bg:${bgap}px; --cg:${cg}px; --cs:${cs}px; grid-template-columns:repeat(${N / bw}, auto)`;
    const cells = [];
    const boxes = [];
    for (let k = 0; k < N; k++) { const bx = el('div', 'sd-box'); bx.style.gridTemplateColumns = `repeat(${bw}, auto)`; boxes.push(bx); board.append(bx); }
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const i = r * N + c, b = mkBtn('sd-cell', giv[i] || '', () => select(i));
      b.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}`);
      cells[i] = b; boxes[Math.floor(r / bh) * (N / bw) + Math.floor(c / bw)].append(b);
    }
    const pad = el('div', 'sd-pad'); if (N === 4) pad.style.maxWidth = '360px';
    const keys = [...Array(N)].map((_, k) => { const b = mkBtn('btn c-sky sd-key', k + 1, () => place(k + 1)); pad.append(b); return b; });
    api.stage.append(board, pad);
    const S = sdSetup(N, bh, bw);
    function render() {
      cells.forEach((b, i) => {
        let cls = 'sd-cell';
        if (cur[i] && !giv[i]) cls += ' sd-mine';
        if (sel >= 0) { if (i === sel) cls += ' sd-sel'; else if (cur[sel] && cur[i] === cur[sel]) cls += ' sd-same'; else if (S.peers[sel].includes(i)) cls += ' sd-peer'; }
        if (b.classList.contains('sd-wrong')) cls += ' sd-wrong';
        if (b.classList.contains('sd-new')) cls += ' sd-new';
        b.className = cls;
      });
      keys.forEach((k, v) => k.classList.toggle('sd-full', cur.filter(x => x === v + 1).length === N));
    }
    function select(i) { if (finished || busy) return; sel = i; sfx.tap(); render(); if (cur[i]) api.hint(giv[i] ? 'That number was there from the start. Pick an empty square.' : 'That one is done. Pick an empty square.'); else api.hint('Now tap a number below.'); }
    function place(v) {
      if (finished || busy) return;
      if (sel < 0 || cur[sel]) { toast('Tap an empty square first'); sfx.soft(); return; }
      const b = cells[sel];
      if (sol[sel] === v) {
        cur[sel] = v; b.textContent = v; b.classList.add('sd-new'); api.later(() => b.classList.remove('sd-new'), 400);
        const doneUnits = S.units.filter(u => u.includes(sel) && u.every(j => cur[j])).length;
        if (doneUnits) { tone(600 + doneUnits * 120, .2, 'triangle', .12); } else tone(520, .1, 'triangle', .1);
        render();
        if (cur.every(Boolean)) { finished = true; sfx.good(); toast(cheer()); api.hint('Every number is in place!'); api.done(starsFor(mistakes, N === 9 ? 1 : 0, N === 9 ? 4 : 2)); }
        else api.hint('Lovely. Pick another empty square.');
      } else {
        mistakes++; busy = true; b.textContent = v; b.classList.add('sd-wrong'); wob(b); sfx.soft();
        const clash = S.peers[sel].some(j => cur[j] === v);
        toast(clash ? `There is already a ${v} in that line or box` : 'Not that one here');
        api.later(() => { b.textContent = ''; b.classList.remove('sd-wrong'); busy = false; render(); }, 1100);
      }
    }
    render();
    if (TEST) api.stage.__auto = () => { cur.forEach((v, i) => { if (!v) { cells[i].click(); keys[sol[i] - 1].click(); } }); };
  }

  /* =========================================================
     3. COLOUR PATHS
     ========================================================= */
  function hamPath(n) {
    const L = n * n, p = [], idx = new Int32Array(L);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) p.push(r * n + (r % 2 ? n - 1 - c : c));
    const reidx = () => p.forEach((v, k) => { idx[v] = k; });
    reidx();
    for (let it = 0; it < L * 40; it++) {
      if (randInt(2)) { p.reverse(); reidx(); }
      const end = p[L - 1], x = pick(nb4(end, n)), j = idx[x];
      if (j === L - 2) continue;
      const tail = p.splice(j + 1).reverse(); p.push(...tail);
      for (let k = j + 1; k < L; k++) idx[p[k]] = k;
    }
    return p;
  }
  function genPaths(n, k) {
    const p = hamPath(n), L = n * n, lens = Array(k).fill(3);
    for (let r = L - 3 * k; r > 0; r--) lens[randInt(k)]++;
    shuffle(lens);
    const out = []; let at = 0;
    lens.forEach(len => { out.push(p.slice(at, at + len)); at += len; });
    return out;
  }
  function startPaths(L, api) {
    const spec = [[4, 2 + randInt(2)], [5, 3 + randInt(2)], [5, 4], [6, 4 + randInt(2)], [6, 5], [7, 5 + randInt(2)], [7, 6 + randInt(2)]][vary(L, 7) - 1];
    const Wp = Math.min(stageW(api), 620), n = fitN(Wp, spec[0], 38, spec[0] <= 5 ? 7 : 3);
    // on a narrow screen the board stops growing, so add colours instead
    const k = Math.min(spec[1] + Math.max(0, Math.min(L, 9) - 5) * (n < spec[0] ? 1 : 0), Math.floor(n * n / 5)), sol = genPaths(n, k);
    const dotAt = Array(n * n).fill(-1);
    sol.forEach((s, c) => { dotAt[s[0]] = c; dotAt[s[s.length - 1]] = c; });
    let paths = sol.map(() => []), cur = -1, hints = 0, finished = false;
    api.hint('Tap a dot, then tap the squares next to it to draw a line to its partner. Fill every square.');
    const Wd = Wp, g = n <= 5 ? 7 : n < spec[0] || Wd < 340 ? 3 : 5;
    const cs = Math.floor(Math.min(84, (Wd - g * (n + 1)) / n));
    const board = el('div', 'cp-board');
    board.style.cssText = `--g:${g}px; --cs:${cs}px; grid-template-columns:repeat(${n}, ${cs}px)`;
    const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
    const span = n * cs + (n - 1) * g;
    svg.setAttribute('class', 'cp-svg'); svg.setAttribute('width', span); svg.setAttribute('height', span); svg.setAttribute('viewBox', `0 0 ${span} ${span}`);
    const cells = [...Array(n * n)].map((_, i) => { const b = mkBtn('cp-cell', '', () => tap(i)); b.setAttribute('aria-label', dotAt[i] >= 0 ? NAMES[PAL[dotAt[i]].c] + ' dot' : 'Square'); board.append(b); return b; });
    board.append(svg);
    const info = el('p', 'lo-info');
    const bar = el('div', 'lo-bar');
    bar.append(mkBtn('btn c-sun', '💡 Show a line', helpLine), mkBtn('btn c-card', '↺ Clear all', () => { if (finished) return; paths = sol.map(() => []); cur = -1; sfx.tap(); render(); }));
    api.stage.append(board, info, bar);
    const center = i => [(i % n) * (cs + g) + cs / 2, ((i / n) | 0) * (cs + g) + cs / 2];
    const adj = (a, b) => nb4(a, n).includes(b);
    const owner = () => { const o = Array(n * n).fill(-1); paths.forEach((p, c) => p.forEach(i => { o[i] = c; })); return o; };
    const complete = c => paths[c].length > 1 && dotAt[paths[c][paths[c].length - 1]] === c;
    function render() {
      const o = owner();
      cells.forEach((b, i) => {
        const d = dotAt[i];
        if (d >= 0) {
          b.className = 'cp-cell'; b.innerHTML = `<span class="cp-dot tile c-${PAL[d].c}${d === cur && !complete(d) ? ' cp-cur' : ''}">${PAL[d].s}</span>`;
        } else {
          b.className = 'cp-cell' + (o[i] >= 0 ? ' cp-p c-' + PAL[o[i]].c : ''); b.innerHTML = '';
        }
      });
      svg.innerHTML = paths.map((p, c) => p.length > 1 ? `<polyline points="${p.map(i => center(i).join(',')).join(' ')}" fill="none" style="stroke:var(--${PAL[c].c}-d)" stroke-width="${cs * .34}" stroke-linecap="round" stroke-linejoin="round" transform="translate(0,3)"/><polyline points="${p.map(i => center(i).join(',')).join(' ')}" fill="none" style="stroke:var(--${PAL[c].c})" stroke-width="${cs * .34}" stroke-linecap="round" stroke-linejoin="round"/>` : '').join('');
      const joined = sol.filter((_, c) => complete(c)).length, filled = o.filter(x => x >= 0).length;
      info.innerHTML = `Joined <b>${joined}</b> of ${k} · Filled <b>${filled}</b> of ${n * n}`;
    }
    function check() {
      const all = sol.every((_, c) => complete(c));
      if (all && owner().every(x => x >= 0)) {
        finished = true; cur = -1; render(); sfx.good(); toast(cheer()); api.hint('Every dot is joined and the board is full!');
        api.done(starsFor(hints, 0, 1));
      } else if (all) api.hint('All joined! Now every square needs a line through it. Try longer routes.');
    }
    function tap(i) {
      if (finished) return;
      const d = dotAt[i], o = owner()[i];
      if (cur >= 0 && paths[cur].length && !complete(cur) && adj(i, paths[cur][paths[cur].length - 1]) && o !== cur) {
        if (d >= 0 && d !== cur) { wob(cells[i]); sfx.soft(); toast('That dot is a different colour'); return; }
        if (o >= 0) paths[o] = paths[o].slice(0, paths[o].indexOf(i));
        paths[cur].push(i);
        if (complete(cur)) { tone(660, .12, 'sine', .14); tone(990, .2, 'sine', .14, .1); api.hint('Joined! Tap another dot.'); }
        else tone(400 + Math.min(paths[cur].length, 14) * 30, .08, 'triangle', .09);
        render(); check(); return;
      }
      if (d >= 0) {
        const p = paths[d], at = p.indexOf(i);
        if (at < 0) paths[d] = [i];
        else if (cur === d && at < p.length - 1) paths[d] = p.slice(0, at + 1);
        cur = d; sfx.tap(); api.hint(`Now tap the squares next to the ${NAMES[PAL[d].c]} ${PAL[d].s} line to make it longer.`);
        render(); return;
      }
      if (o >= 0) { cur = o; paths[o] = paths[o].slice(0, paths[o].indexOf(i) + 1); sfx.tap(); render(); return; }
      wob(cells[i]); sfx.soft();
      toast(cur < 0 ? 'Tap a coloured dot to start' : 'Tap a square next to the end of the line');
    }
    function helpLine() {
      if (finished) return;
      const c = sol.findIndex((s, c2) => paths[c2].join() !== s.join() && paths[c2].join() !== s.slice().reverse().join());
      if (c < 0) return;
      hints++;
      const set = new Set(sol[c]);
      paths = paths.map((p, c2) => { if (c2 === c) return sol[c].slice(); const cut = p.findIndex(x => set.has(x)); return cut < 0 ? p : p.slice(0, cut); });
      cur = -1; sfx.good(); toast('Here’s one line'); render(); check();
    }
    render();
    if (TEST) api.stage.__auto = () => sol.forEach(s => s.forEach(i => cells[i].click()));
  }

  /* =========================================================
     4. PAINT FLOOD
     ========================================================= */
  function comps(col, n) {
    const id = Array(n * n).fill(-1), list = [];
    for (let i = 0; i < n * n; i++) {
      if (id[i] >= 0) continue;
      const k = list.length, st = [i], cs = []; id[i] = k;
      while (st.length) { const x = st.pop(); cs.push(x); nb4(x, n).forEach(j => { if (id[j] < 0 && col[j] === col[i]) { id[j] = k; st.push(j); } }); }
      list.push(cs);
    }
    return { id, list };
  }
  function floodGreedy(col0, n) {
    let col = col0.slice(), moves = [];
    for (let guard = 0; guard < 200; guard++) {
      const { id, list } = comps(col, n);
      if (list.length === 1) return moves;
      let best = null, bs = -1;
      list.forEach((cs, k) => {
        const nbr = new Map();
        cs.forEach(x => nb4(x, n).forEach(j => { if (id[j] !== k) { const c = col[j]; if (!nbr.has(c)) nbr.set(c, new Set()); nbr.get(c).add(id[j]); } }));
        nbr.forEach((s, c) => { let sc = s.size * 1000 + [...s].reduce((a, q) => a + list[q].length, cs.length) + Math.random(); if (sc > bs) { bs = sc; best = [cs[0], c]; } });
      });
      const [cell, c] = best, { list: l2, id: id2 } = { list, id };
      l2[id2[cell]].forEach(x => { col[x] = c; });
      moves.push(best);
    }
    return moves;
  }
  function genFlood(n, nc, R0) {
    for (let t = 0; t < 200; t++) {
      const reg = Array(n * n).fill(-1), seeds = shuffle([...Array(n * n).keys()]).slice(0, R0);
      seeds.forEach((s, k) => { reg[s] = k; });
      let left = n * n - R0;
      while (left) for (const i of shuffle([...Array(n * n).keys()])) {
        if (reg[i] >= 0) continue;
        const ns = nb4(i, n).filter(j => reg[j] >= 0);
        if (ns.length && Math.random() < .5) { reg[i] = reg[pick(ns)]; left--; }
      }
      const rc = Array(R0).fill(-1);
      shuffle([...Array(R0).keys()]).forEach(k => {
        const used = new Set();
        reg.forEach((v, i) => { if (v === k) nb4(i, n).forEach(j => { if (reg[j] !== k && rc[reg[j]] >= 0) used.add(rc[reg[j]]); }); });
        const free = [...Array(nc).keys()].filter(c => !used.has(c));
        rc[k] = free.length ? pick(free) : randInt(nc);
      });
      const col = reg.map(v => rc[v]);
      if (new Set(col).size < nc || comps(col, n).list.length < Math.max(3, R0 - 2)) continue;
      return col;
    }
    return [...Array(n * n)].map(() => randInt(nc));
  }
  function startFlood(L, api) {
    const S = [[5, 3, 6], [5, 3, 8], [6, 4, 10], [7, 4, 13], [7, 5, 15], [8, 5, 17], [8, 5, 19], [9, 5, 21], [9, 6, 23]][vary(L, 9) - 1];
    const Wf = Math.min(stageW(api), 600), n = fitN(Wf - 4, S[0], 40, 0);
    // smaller board on a narrow screen: keep it challenging with more colours and patches for the space
    const nc = n < S[0] ? Math.min(6, S[1] + (L >= 6 ? 1 : 0)) : S[1];
    const R0 = Math.min(Math.round(S[2] * (n * n) / (S[0] * S[0])) + (n < S[0] ? Math.min(L, 12) - 4 : 0), Math.floor(n * n / 2.5)) + randInt(3);
    let col = genFlood(n, nc, R0);
    let best = Infinity; for (let t = 0; t < 25; t++) best = Math.min(best, floodGreedy(col, n).length);
    const target = best + (L <= 2 ? 1 : 1 + (L >= 6 ? 1 : 0));
    let moves = 0, pickC = -1, finished = false, history = [];
    api.hint('Pick a colour below, then tap a patch on the board to paint it. Make the whole board one colour.');
    const Wd = Wf, cs = Math.floor(Math.min(64, (Wd - 4) / n));
    const board = el('div', 'pf-board'); board.style.cssText = `--cs:${cs}px; grid-template-columns:repeat(${n}, ${cs}px)`;
    const cells = [...Array(n * n)].map((_, i) => { const b = mkBtn('pf-cell', '', () => tap(i)); board.append(b); return b; });
    const info = el('p', 'lo-info');
    const pal = el('div', 'pf-pal');
    const sw = [...Array(nc)].map((_, c) => { const b = mkBtn(`tile pf-sw c-${PAL[c].c}`, PAL[c].s, () => choose(c)); b.setAttribute('aria-label', NAMES[PAL[c].c]); pal.append(b); return b; });
    const bar = el('div', 'lo-bar');
    bar.append(mkBtn('btn c-card', '↶ Undo', () => { if (finished || !history.length) return; col = history.pop(); moves--; sfx.tap(); render(); }));
    api.stage.append(info, board, pal, bar);
    function render(changed, from) {
      const { id } = comps(col, n);
      cells.forEach((b, i) => {
        b.style.setProperty('--c', `var(--${PAL[col[i]].c})`);
        const r = (i / n) | 0, c = i % n, line = '3px solid rgba(24,36,44,.35)';
        b.style.borderTop = r && id[i - n] !== id[i] ? line : '0'; b.style.borderLeft = c && id[i - 1] !== id[i] ? line : '0';
        b.textContent = PAL[col[i]].s;
        b.setAttribute('aria-label', NAMES[PAL[col[i]].c]);
        if (changed && changed.has(i)) { const d = Math.abs(r - ((from / n) | 0)) + Math.abs(c - from % n); b.classList.remove('pf-new'); void b.offsetWidth; b.style.animationDelay = d * 40 + 'ms'; b.classList.add('pf-new'); }
      });
      info.innerHTML = `Moves <b>${moves}</b> · Goal: ${target} or fewer`;
    }
    function choose(c) { if (finished) return; pickC = c; sfx.tap(); sw.forEach((b, k) => b.classList.toggle('lo-on', k === c)); api.hint(`Now tap a patch to paint it ${NAMES[PAL[c].c]} ${PAL[c].s}.`); }
    function tap(i) {
      if (finished) return;
      if (pickC < 0) { wob(pal); sfx.soft(); toast('Pick a colour first'); return; }
      if (col[i] === pickC) { sfx.soft(); toast('That patch is already that colour'); return; }
      const { id, list } = comps(col, n), before = list.length;
      history.push(col.slice());
      const ch = new Set(list[id[i]]);
      ch.forEach(x => { col[x] = pickC; });
      moves++;
      const after = comps(col, n);
      after.list[after.id[i]].forEach(x => ch.add(x));
      const merged = before - after.list.length;
      tone(440 + Math.min(merged, 6) * 80, .14, 'triangle', .12); if (merged >= 3) tone(880, .2, 'sine', .1, .1);
      render(ch, i);
      if (after.list.length === 1) {
        finished = true; sfx.good(); toast(moves <= target ? cheer() : 'All one colour!'); api.hint(`All one colour in ${moves} moves!`);
        api.done(moves <= target ? 3 : moves <= target + 2 ? 2 : 1);
      }
    }
    render();
    if (TEST) api.stage.__auto = () => floodGreedy(col, n).forEach(([cell, c]) => { sw[c].click(); cells[cell].click(); });
  }

  /* =========================================================
     5. CODE BREAKER
     ========================================================= */
  function score(code, guess) {
    let black = 0; const a = {}, b = {};
    code.forEach((c, i) => { if (c === guess[i]) black++; else { a[c] = (a[c] || 0) + 1; b[guess[i]] = (b[guess[i]] || 0) + 1; } });
    let white = 0; for (const c in a) white += Math.min(a[c], b[c] || 0);
    return [black, white];
  }
  function startCode(L, api) {
    const [P, C, rep] = [[3, 4, false], [3, 5, false], [4, 5, false], [4, 6, false], [4, 6, true], [5, 6, false], [5, 6, true]][vary(L, 7) - 1];
    const code = rep ? [...Array(P)].map(() => randInt(C)) : shuffle([...Array(C).keys()]).slice(0, P);
    const guesses = [];
    let cur = Array(P).fill(-1), finished = false;
    api.hint(`Guess the hidden row of ${P} colours. Tap colours to fill your row, then tap Check.` + (rep ? ' A colour can be used more than once.' : ''));
    const Wd = Math.min(stageW(api), 620), ps = Math.floor(Math.min(64, (Wd - 24 - (P - 1) * 8) / P));
    const wrap = el('div', 'kb-wrap'); wrap.style.setProperty('--ps', ps + 'px');
    const secret = el('div', 'kb-row'), hist = el('div', 'kb-wrap'), curBox = el('div', 'kb-cur kb-row');
    const legend = el('p', 'kb-legend', '<span><b>●</b> right colour, right place</span><span><b>○</b> right colour, wrong place</span>');
    const pal = el('div', 'kb-pal'), bar = el('div', 'lo-bar');
    const sp = el('div', 'kb-pegs');
    for (let k = 0; k < P; k++) sp.append(el('span', 'kb-peg tile kb-hid', '?'));
    secret.append(sp);
    const slots = cur.map((_, k) => { const b = mkBtn('kb-peg tile kb-slot', '', () => { if (finished || cur[k] < 0) return; cur[k] = -1; sfx.tap(); render(); }); return b; });
    const sb = el('div', 'kb-pegs'); sb.append(...slots); curBox.append(sb);
    const pb = [...Array(C)].map((_, c) => { const b = mkBtn(`tile c-${PAL[c].c}`, PAL[c].s, () => add(c)); b.setAttribute('aria-label', NAMES[PAL[c].c]); pal.append(b); return b; });
    const checkB = mkBtn('btn c-leaf', '✓ Check', check), clearB = mkBtn('btn c-card', '✕ Clear row', () => { if (finished) return; cur.fill(-1); sfx.tap(); render(); });
    bar.append(checkB, clearB);
    wrap.append(secret, legend, hist, curBox, pal, bar);
    api.stage.append(wrap);
    function render() {
      slots.forEach((b, k) => {
        const c = cur[k];
        b.className = 'kb-peg tile kb-slot' + (c >= 0 ? ` kb-full c-${PAL[c].c}` : '');
        b.textContent = c >= 0 ? PAL[c].s : ''; b.setAttribute('aria-label', c >= 0 ? NAMES[PAL[c].c] + ', tap to remove' : 'Empty space');
      });
      pb.forEach((b, c) => b.classList.toggle('kb-used', !rep && cur.includes(c)));
      checkB.style.opacity = cur.includes(-1) ? .45 : 1;
    }
    function add(c) {
      if (finished) return;
      if (!rep && cur.includes(c)) { sfx.soft(); toast('Each colour is used only once'); return; }
      const k = cur.indexOf(-1);
      if (k < 0) { sfx.soft(); toast('Your row is full. Tap Check.'); return; }
      cur[k] = c; tone(420 + k * 70, .1, 'triangle', .1); render();
    }
    function check() {
      if (finished) return;
      if (cur.includes(-1)) { sfx.soft(); toast('Fill every space first'); return; }
      const g = cur.slice(), [bl, wh] = score(code, g);
      guesses.push(g);
      const row = el('div', 'kb-row');
      row.append(el('span', 'kb-n', guesses.length + '.'));
      const pegs = el('div', 'kb-pegs'); g.forEach(c => pegs.append(el('span', `kb-peg tile c-${PAL[c].c}`, PAL[c].s))); row.append(pegs);
      const fb = el('div', 'kb-fb', bl + wh ? '●'.repeat(bl) + '○'.repeat(wh) : '<span class="kb-none">none</span>');
      fb.setAttribute('aria-label', `${bl} right place, ${wh} wrong place`);
      row.append(fb); row.style.animation = 'bounceIn .3s'; hist.append(row);
      if (bl === P) {
        finished = true; sfx.good(); toast(cheer());
        sp.innerHTML = ''; code.forEach((c, k) => { const s = el('span', `kb-peg tile c-${PAL[c].c}`, PAL[c].s); s.style.animation = `bounceIn .4s ${k * .12}s backwards`; sp.append(s); });
        api.hint(`You cracked it in ${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'}!`);
        const a = P === 3 ? 4 : P === 4 ? 6 : 7;
        api.done(starsFor(guesses.length, a, a + 3));
      } else {
        bl ? tone(520 + bl * 90, .15, 'sine', .12) : sfx.tap();
        api.hint(bl + wh ? `${bl} in the right place, ${wh} in the wrong place. Try another row.` : 'None of those colours are in the code. Try others.');
        render();
      }
    }
    render();
    if (TEST) api.stage.__auto = () => {
      let cands = [];
      const all = (pre) => { if (pre.length === P) { if (rep || new Set(pre).size === P) cands.push(pre); return; } for (let c = 0; c < C; c++) all(pre.concat(c)); };
      all([]);
      for (let t = 0; t < 30 && !finished; t++) {
        const g = cands[0];
        cur.fill(-1); g.forEach(c => pb[c].click()); checkB.click();
        const sc = score(code, g).join();
        cands = cands.filter(x => score(x, g).join() === sc);
      }
    };
  }

  /* =========================================================
     6. SAFE SQUARES (gentle minesweeper)
     ========================================================= */
  const THISTLE = '<svg viewBox="0 0 40 40" aria-hidden="true"><g stroke="#6F4FD0" stroke-width="3" stroke-linecap="round"><path d="M20 4v11M11 7l6 9M29 7l-6 9M6 14l9 5M34 14l-9 5"/></g><ellipse cx="20" cy="19" rx="10" ry="6" fill="#A98BFF"/><path d="M11 21 Q20 35 29 21 Z" fill="#3CC46B" stroke="#1F8C46" stroke-width="2"/><path d="M20 30v8" stroke="#1F8C46" stroke-width="3" stroke-linecap="round"/></svg>';
  function safeSolvable(mine, n, s) {
    const st = Array(n * n).fill(0), cnt = mine.map((_, i) => nb8(i, n).filter(j => mine[j]).length);
    const open = i => { const q = [i]; while (q.length) { const x = q.pop(); if (st[x]) continue; if (mine[x]) return false; st[x] = 1; if (!cnt[x]) nb8(x, n).forEach(j => { if (!st[j]) q.push(j); }); } return true; };
    open(s);
    for (let guard = 0; guard < 500; guard++) {
      let prog = false; const cons = [];
      for (let i = 0; i < n * n; i++) {
        if (st[i] !== 1 || !cnt[i]) continue;
        const ns = nb8(i, n), H = ns.filter(j => !st[j]), F = ns.filter(j => st[j] === 2).length;
        if (!H.length) continue;
        if (F === cnt[i]) { H.forEach(open); prog = true; }
        else if (F + H.length === cnt[i]) { H.forEach(j => { st[j] = 2; }); prog = true; }
        else cons.push({ H, need: cnt[i] - F });
      }
      if (!prog) {
        outer: for (const A of cons) for (const B of cons) {
          if (A === B || A.H.length >= B.H.length || !A.H.every(x => B.H.includes(x))) continue;
          const diff = B.H.filter(x => !A.H.includes(x)), need = B.need - A.need;
          if (need === 0) { diff.forEach(open); prog = true; break outer; }
          if (need === diff.length) { diff.forEach(j => { st[j] = 2; }); prog = true; break outer; }
        }
      }
      if (!prog) break;
    }
    return mine.every((m, i) => m || st[i] === 1);
  }
  function startSafe(L, api) {
    const [n0, m0] = [[6, 4], [6, 5], [7, 7], [7, 8], [8, 9], [8, 10], [9, 12], [9, 13]][vary(L, 8) - 1];
    const Ws = Math.min(stageW(api), 620), n = fitN(Ws, n0, 38, n0 <= 7 ? 5 : 3);
    // if the board is capped by screen width, keep the thistle density rising instead
    const m = n === n0 ? m0 + (L >= 8 ? randInt(2) : 0) : Math.round(n * n * Math.min(.11 + .012 * (L - 1), .2)) + randInt(2);
    let mine = null, cnt = null, st = Array(n * n).fill(0); // 0 hidden, 1 open, 2 flagged, 3 ouch
    let flagMode = false, mistakes = 0, finished = false, first = -1;
    api.hint(`There are ${m} thistles hidden in the garden. Tap a square to dig. Numbers show how many thistles touch that square.`);
    const Wd = Ws, g = n * 38 + (n + 1) * 5 <= Wd ? 5 : 3, cs = Math.floor(Math.min(68, (Wd - g * (n + 1)) / n));
    const board = el('div', 'ss-board'); board.style.cssText = `--g:${g}px; --cs:${cs}px; grid-template-columns:repeat(${n}, ${cs}px)`;
    const cells = [...Array(n * n)].map((_, i) => { const b = mkBtn('ss-cell', '', () => tap(i)); board.append(b); return b; });
    const info = el('p', 'lo-info');
    const tg = toggleBar([{ cls: 'c-sun', label: '👆 Dig' }, { cls: 'c-card', label: '🚩 Flag' }], i => { flagMode = !!i; api.hint(i ? 'Tap a square where you think a thistle is, to put a flag on it.' : 'Tap a square to dig it up.'); });
    api.stage.append(info, board, tg.bar);
    const NUMC = ['', 'var(--sky-d)', 'var(--leaf-d)', 'var(--coral-d)', 'var(--grape-d)', 'var(--berry-d)', 'var(--orange-d)', 'var(--ink)', 'var(--ink)'];
    function generate(s) {
      first = s;
      const ban = new Set([s, ...nb8(s, n)]);
      for (let t = 0; t < 400; t++) {
        mine = Array(n * n).fill(false);
        shuffle([...Array(n * n).keys()].filter(i => !ban.has(i))).slice(0, m).forEach(i => { mine[i] = true; });
        if (safeSolvable(mine, n, s)) break;
      }
      cnt = mine.map((_, i) => nb8(i, n).filter(j => mine[j]).length);
    }
    function render() {
      cells.forEach((b, i) => {
        const s = st[i];
        if (s === 1) { b.className = 'ss-cell ss-open'; b.textContent = cnt[i] || ''; b.style.color = NUMC[cnt[i]]; b.setAttribute('aria-label', cnt[i] ? cnt[i] + ' thistles nearby' : 'Clear'); }
        else if (s === 3) { b.className = 'ss-cell ss-open ss-ouch'; b.innerHTML = THISTLE; b.setAttribute('aria-label', 'Thistle'); }
        else { b.className = 'ss-cell tile c-leaf'; b.innerHTML = s === 2 ? '<span class="ss-flag">🚩</span>' : ''; b.setAttribute('aria-label', s === 2 ? 'Flagged square' : 'Grass'); }
        if (s === 1) b.style.animationDelay = '0ms';
      });
      const flags = st.filter(x => x === 2 || x === 3).length;
      info.innerHTML = `Thistles: <b>${m}</b> · Flags and found: <b>${flags}</b>`;
    }
    function openFrom(i) {
      const q = [i]; let k = 0;
      while (q.length) {
        const x = q.shift(); if (st[x] === 1) continue;
        st[x] = 1; k++;
        if (!cnt[x]) nb8(x, n).forEach(j => { if (st[j] !== 1 && !mine[j]) q.push(j); });
      }
      return k;
    }
    function tap(i) {
      if (finished || st[i] === 1 || st[i] === 3) return;
      if (flagMode) { st[i] = st[i] === 2 ? 0 : 2; sfx.tap(); render(); return; }
      if (st[i] === 2) { sfx.soft(); toast('Switch to Flag to lift that flag'); wob(cells[i]); return; }
      if (!mine) generate(i);
      if (mine[i]) { st[i] = 3; mistakes++; sfx.soft(); toast('Ouch, a thistle!'); render(); wob(cells[i]); return; }
      const k = openFrom(i);
      tone(480 + Math.min(k, 12) * 30, .12, 'triangle', .11);
      render();
      if (mine.every((mm, j) => mm || st[j] === 1)) {
        finished = true;
        mine.forEach((mm, j) => { if (mm && st[j] !== 3) { cells[j].className = 'ss-cell ss-open'; cells[j].innerHTML = THISTLE; cells[j].style.animationDelay = randInt(400) + 'ms'; } });
        sfx.good(); toast(cheer()); api.hint('The whole garden is safe and sound!');
        api.done(starsFor(mistakes, 0, 1));
      }
    }
    render();
    if (TEST) api.stage.__auto = () => { if (!mine) cells[((n / 2) | 0) * n + ((n / 2) | 0)].click(); for (let j = 0; j < n * n; j++) if (!mine[j] && st[j] !== 1) cells[j].click(); };
    if (TEST) api.stage.__info = () => ({ solvable: mine ? safeSolvable(mine, n, first) : null });
  }

  /* =========================================================
     7. ISLAND BRIDGES
     ========================================================= */
  const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  function genBridges(n, k, extra = .25, dbl = .35) {
    for (let t = 0; t < 600; t++) {
      const isl = [], at = Array(n * n).fill(-1), occ = Array(n * n).fill(null), sol = new Map();
      const add = (r, c) => { at[r * n + c] = isl.length; isl.push({ r, c }); };
      add(randInt(n), randInt(n));
      for (let tries = 0; isl.length < k && tries < 500; tries++) {
        const a = randInt(isl.length), { r, c } = isl[a], [dr, dc] = pick(DIRS), d = 2 + randInt(n - 2);
        const r2 = r + dr * d, c2 = c + dc * d;
        if (r2 < 0 || c2 < 0 || r2 >= n || c2 >= n) continue;
        const j = r2 * n + c2;
        if (at[j] >= 0 || occ[j]) continue;
        let ok = true;
        for (let s = 1; s < d; s++) { const x = (r + dr * s) * n + c + dc * s; if (at[x] >= 0 || occ[x]) { ok = false; break; } }
        if (!ok || nb4(j, n).some(x => at[x] >= 0)) continue;
        for (let s = 1; s < d; s++) occ[(r + dr * s) * n + c + dc * s] = dr ? 'v' : 'h';
        add(r2, c2);
        sol.set(a + '-' + (isl.length - 1), Math.random() < dbl ? 2 : 1);
      }
      if (isl.length < k) continue;
      // a few extra bridges make loops
      isl.forEach((A, a) => DIRS.slice(0, 2).forEach(([dr, dc]) => {
        let r = A.r + dr, c = A.c + dc; const cellsBetween = [];
        while (r < n && c < n && at[r * n + c] < 0) { cellsBetween.push(r * n + c); r += dr; c += dc; }
        if (r >= n || c >= n) return;
        const b = at[r * n + c], key = Math.min(a, b) + '-' + Math.max(a, b);
        if (sol.has(key) || (a < b ? sol.has(a + '-' + b) : sol.has(b + '-' + a)) || cellsBetween.some(x => occ[x]) || Math.random() > extra) return;
        cellsBetween.forEach(x => { occ[x] = dr ? 'v' : 'h'; });
        sol.set(key, 1);
      }));
      const norm = new Map();
      sol.forEach((v, key) => { const [a, b] = key.split('-').map(Number); norm.set(Math.min(a, b) + '-' + Math.max(a, b), v); });
      isl.forEach((I, i) => { I.need = 0; norm.forEach((v, key) => { const [a, b] = key.split('-').map(Number); if (a === i || b === i) I.need += v; }); });
      return { isl, at, sol: norm };
    }
    return null;
  }
  function startBridges(L, api) {
    const S = [[5, 4 + randInt(2)], [5, 5 + randInt(2)], [6, 6 + randInt(2)], [7, 8], [7, 9 + randInt(2)], [8, 11], [8, 12 + randInt(2)], [9, 14 + randInt(2)]][vary(L, 8) - 1];
    const Wb = Math.min(stageW(api), 620), n = fitN(Wb, S[0], 40, 0), capped = n < S[0];
    // a narrower board holds fewer islands, so add more loops and double bridges instead
    const k = Math.min(S[1], { 4: 5, 5: 6, 6: 8, 7: 10, 8: 13, 9: 16 }[n]);
    const extra = capped ? Math.min(.25 + .03 * (L - 5), .5) : .25, dbl = capped ? Math.min(.35 + .03 * (L - 5), .55) : .35;
    let G = null; for (let t = 0; t < 20 && !G; t++) G = genBridges(n, k, extra, dbl);
    const { isl, at, sol } = G;
    const br = new Map(); // "a-b" (a<b) -> 1|2
    let sel = -1, hints = 0, finished = false;
    api.hint('Tap an island, then another in a straight line, to build a bridge. Tap again for a double bridge, and a third time to remove it.');
    const Wd = Wb, cs = Math.floor(Math.min(80, Wd / n)), size = cs * n;
    const board = el('div', 'ib-board'); board.style.cssText = `width:${size}px; height:${size}px; --cs:${cs}px`;
    const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'ib-svg'); svg.setAttribute('viewBox', `0 0 ${n} ${n}`); board.append(svg);
    const btns = isl.map((I, i) => {
      const b = mkBtn('ib-isl', `<span class="tile c-card">${I.need}</span>`, () => tap(i));
      b.style.cssText = `left:${(I.c + .5) * cs}px; top:${(I.r + .5) * cs}px; width:${cs}px; height:${cs}px`;
      board.append(b); return b;
    });
    const bar = el('div', 'lo-bar');
    bar.append(mkBtn('btn c-sun', '💡 Help me', help), mkBtn('btn c-card', '↺ Clear all', () => { if (finished) return; br.clear(); sel = -1; sfx.tap(); render(); }));
    api.stage.append(board, bar);
    const key = (a, b) => Math.min(a, b) + '-' + Math.max(a, b);
    const between = (a, b) => { const A = isl[a], B = isl[b], out = []; const dr = Math.sign(B.r - A.r), dc = Math.sign(B.c - A.c); let r = A.r + dr, c = A.c + dc; while (r !== B.r || c !== B.c) { out.push(r * n + c); r += dr; c += dc; } return out; };
    function partner(a, b) { // b is the next island in line from a?
      const A = isl[a], B = isl[b];
      if (A.r !== B.r && A.c !== B.c) return false;
      return between(a, b).every(x => at[x] < 0);
    }
    function crossing(a, b, m) {
      const mine = new Set(between(a, b)), vert = isl[a].c === isl[b].c, out = [];
      m.forEach((v, kk) => { const [x, y] = kk.split('-').map(Number); if (kk === key(a, b)) return; if ((isl[x].c === isl[y].c) === vert) return; if (between(x, y).some(c => mine.has(c))) out.push(kk); });
      return out;
    }
    const have = i => { let s = 0; br.forEach((v, kk) => { const [x, y] = kk.split('-').map(Number); if (x === i || y === i) s += v; }); return s; };
    function connected() {
      const seen = new Set([0]), q = [0];
      while (q.length) { const x = q.pop(); br.forEach((v, kk) => { const [a, b] = kk.split('-').map(Number); const o = a === x ? b : b === x ? a : -1; if (o >= 0 && !seen.has(o)) { seen.add(o); q.push(o); } }); }
      return seen.size === isl.length;
    }
    function render() {
      let s = '';
      br.forEach((v, kk) => {
        const [a, b] = kk.split('-').map(Number), A = isl[a], B = isl[b], vert = A.c === B.c;
        const offs = v === 2 ? [-.11, .11] : [0];
        offs.forEach(o => {
          const x1 = A.c + .5 + (vert ? o : 0), y1 = A.r + .5 + (vert ? 0 : o), x2 = B.c + .5 + (vert ? o : 0), y2 = B.r + .5 + (vert ? 0 : o);
          s += `<line x1="${x1}" y1="${y1 + .04}" x2="${x2}" y2="${y2 + .04}" stroke="#7A5A33" stroke-width=".11" stroke-linecap="round"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#FFE3A3" stroke-width=".11" stroke-linecap="round"/>`;
        });
      });
      svg.innerHTML = s;
      btns.forEach((b, i) => {
        const h = have(i), need = isl[i].need;
        b.className = 'ib-isl' + (i === sel ? ' ib-sel' : '') + (sel >= 0 && i !== sel && partner(sel, i) ? ' ib-can' : '');
        b.firstChild.className = 'tile ' + (h === need ? 'c-leaf' : h > need ? 'c-peach' : 'c-card');
        b.setAttribute('aria-label', `Island needing ${need} bridges, has ${h}`);
      });
    }
    function check() {
      if (!isl.every((I, i) => have(i) === I.need)) return;
      if (!connected()) { api.hint('Every number is right, but all the islands must join up into one group.'); return; }
      finished = true; sel = -1; render(); sfx.good(); toast(cheer()); api.hint('All the islands are joined!');
      api.done(starsFor(hints, 0, 1));
    }
    function tap(i) {
      if (finished) return;
      if (sel < 0 || sel === i) { sel = sel === i ? -1 : i; sfx.tap(); render(); api.hint(sel < 0 ? 'Tap an island to start a bridge.' : 'Now tap an island with a dashed ring.'); return; }
      if (!partner(sel, i)) { sel = i; sfx.tap(); render(); api.hint('Bridges go straight across or straight down. Tap an island with a dashed ring.'); return; }
      const kk = key(sel, i), v = ((br.get(kk) || 0) + 1) % 3;
      if (v && crossing(sel, i, br).length) { sfx.soft(); toast('Bridges can’t cross'); wob(btns[i]); return; }
      if (v) br.set(kk, v); else br.delete(kk);
      v ? tone(500 + v * 120, .14, 'triangle', .12) : tone(330, .12, 'triangle', .08);
      sel = -1; render(); api.hint('Tap an island to start another bridge.'); check();
    }
    function help() {
      if (finished) return;
      let fix = null;
      sol.forEach((v, kk) => { if (!fix && br.get(kk) !== v) fix = [kk, v]; });
      if (!fix) br.forEach((v, kk) => { if (!fix && !sol.has(kk)) fix = [kk, 0]; });
      if (!fix) return;
      hints++;
      const [kk, v] = fix, [a, b] = kk.split('-').map(Number);
      crossing(a, b, br).forEach(x => br.delete(x));
      if (v) br.set(kk, v); else br.delete(kk);
      sel = -1; sfx.good(); toast(v ? 'Here’s a bridge' : 'That bridge isn’t needed'); render(); check();
    }
    render();
    if (TEST) api.stage.__auto = () => sol.forEach((v, kk) => { const [a, b] = kk.split('-').map(Number); for (let t = 0; t < v; t++) { btns[a].click(); btns[b].click(); } });
  }
})();
