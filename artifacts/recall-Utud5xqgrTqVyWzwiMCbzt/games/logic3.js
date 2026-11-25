/* Recall: Logic 3 (Mirror Draw, Greater Than Grid, Cage Sums) */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor } = R;
  const TEST = !!window.__recallTest; // test hooks only exist when a test harness sets this before load

  R.css(`
/* ---- shared (l3-) ---- */
.l3-bar{display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:12px; margin-top:20px}
.l3-pad{display:grid; grid-template-columns:repeat(auto-fit, minmax(58px, 1fr)); gap:10px; max-width:470px; margin:20px auto 0}
.l3-key{min-height:62px; font-size:1.9rem; padding:0}
.l3-key.l3-full{opacity:.35}
.l3-help{font-size:1.2rem; padding:0 .6em; grid-column:span 2}
@keyframes l3Bump{0%{scale:1}40%{scale:1.16}100%{scale:1}}

/* ---- Mirror Draw (mr-) ---- */
.mr-board{display:grid; gap:4px; padding:10px; margin:0 auto; width:max-content; border-radius:20px; background:rgba(0,0,0,.22); box-shadow:inset 0 4px 12px rgba(0,0,0,.3)}
.mr-cell{width:var(--cs); height:var(--cs); border:0; padding:0; border-radius:18%; display:grid; place-items:center; cursor:pointer;
  font:700 calc(var(--cs) * .46)/1 var(--display); color:rgba(24,36,44,.62); background:rgba(255,255,255,.9); box-shadow:inset 0 -3px 0 rgba(0,0,0,.12); transition:background .2s}
.mr-src{background:rgba(255,255,255,.16); box-shadow:inset 0 2px 4px rgba(0,0,0,.18); cursor:default}
.mr-cell.mr-f{background:linear-gradient(155deg, rgba(255,255,255,.42), rgba(255,255,255,0) 50%), var(--c); box-shadow:inset 0 -4px 0 rgba(0,0,0,.18), 0 3px 0 var(--d)}
.mr-new{animation:bounceIn .25s}
.mr-bad{outline:4px dashed #FFC2B2; outline-offset:-3px}
.mr-cell.mr-bad:not(.mr-f){background:#FFE3DA}
.mr-ping{animation:l3Bump .6s}
.mr-glow{animation:mrGlow 1.4s ease-in-out infinite alternate}
@keyframes mrGlow{from{box-shadow:inset 0 -4px 0 rgba(0,0,0,.18), 0 3px 0 var(--d), 0 0 0 0 rgba(255,244,190,0)} to{box-shadow:inset 0 -4px 0 rgba(0,0,0,.18), 0 3px 0 var(--d), 0 0 16px 5px rgba(255,244,190,.9)}}
.mr-line{border-radius:6px; pointer-events:none; box-shadow:0 0 10px rgba(255,255,255,.55)}
.mr-lv{width:6px; justify-self:center; background:repeating-linear-gradient(180deg, #fff 0 10px, rgba(255,255,255,.25) 10px 16px)}
.mr-lh{height:6px; align-self:center; background:repeating-linear-gradient(90deg, #fff 0 10px, rgba(255,255,255,.25) 10px 16px)}
.mr-sw{width:60px; height:60px; font-size:1.8rem; border:0; padding:0; cursor:pointer; transition:translate .15s}
.mr-sw.mr-on{outline:4px solid #fff; outline-offset:3px; translate:0 -7px}

/* ---- Greater Than Grid (gt-) ---- */
.gt-board{display:grid; padding:10px; margin:0 auto; width:max-content; border-radius:18px; background:#5B4A35; box-shadow:0 7px 0 #3B2F21, 0 14px 24px rgba(0,0,0,.3)}
.gt-cell{width:var(--cs); height:var(--cs); border:0; padding:0; border-radius:10px; background:var(--card); color:var(--ink); cursor:pointer;
  font:700 calc(var(--cs) * .58)/1 var(--display); display:grid; place-items:center; box-shadow:inset 0 -3px 0 rgba(0,0,0,.1)}
.gt-cell.gt-mine{color:var(--sky-d)}
.gt-cell.gt-peer{background:#FFEFC9}
.gt-cell.gt-sel{background:var(--sun); box-shadow:inset 0 -3px 0 var(--sun-d), 0 0 0 3px #fff}
.gt-cell.gt-wrong{color:var(--coral-d); background:#FFE0D6}
.gt-new{animation:bounceIn .3s}
.gt-glow{animation:l3Bump .5s backwards; background:var(--good-bg)}
.gt-sign{display:grid; place-items:center; font:700 var(--sf)/1 var(--display); color:var(--sun); pointer-events:none; text-shadow:0 2px 0 rgba(0,0,0,.4); transition:color .3s}
.gt-sign span{display:block}
.gt-sign.gt-v span{rotate:90deg}
.gt-sign.gt-ok{color:#9AF2B5}

/* ---- Cage Sums (cg-) ---- */
.cg-board{display:grid; margin:0 auto; width:max-content; padding:6px; border-radius:16px; background:#2E3D47; box-shadow:0 7px 0 #18242C, 0 14px 24px rgba(0,0,0,.3)}
.cg-cell{position:relative; width:var(--cs); height:var(--cs); border:0 solid #2E3D47; padding:calc(var(--cs) * .16) 0 0; background:var(--bg); color:var(--ink); cursor:pointer;
  font:700 calc(var(--cs) * .5)/1 var(--display); display:grid; place-items:center}
.cg-lab{position:absolute; left:4px; top:3px; font:700 var(--lf)/1 var(--display); color:#2E3D47; pointer-events:none; white-space:nowrap}
.cg-cell.cg-mine{color:var(--sky-d)}
.cg-cell.cg-mate{box-shadow:inset 0 0 0 999px rgba(255,194,52,.2)}
.cg-cell.cg-sel{box-shadow:inset 0 0 0 999px rgba(255,194,52,.85), inset 0 0 0 3px #fff}
.cg-cell.cg-wrong{color:var(--coral-d); box-shadow:inset 0 0 0 999px rgba(255,180,160,.6)}
.cg-new{animation:bounceIn .3s}
.cg-done{animation:l3Bump .5s backwards}
.cg-solved .cg-cell{box-shadow:inset 0 0 0 999px rgba(60,196,107,.22)}
`);

  register({ id: 'mirror', cat: 'logic', order: 14, name: 'Mirror Draw', icon: '🪞', desc: 'Paint the other half as a mirror picture', start: startMirror });
  register({ id: 'greater', cat: 'logic', order: 15, name: 'Greater Than Grid', icon: '🔼', desc: 'Fill rows so the < and > signs are true', start: startGreater });
  register({ id: 'cages', cat: 'logic', order: 16, name: 'Cage Sums', icon: '➕', desc: 'Fill the grid so each shape adds up', start: startCages });

  /* ---------- shared bits ---------- */
  const stageW = api => Math.max(280, Math.min(api.stage.clientWidth || 340, 1000));
  const mkBtn = (cls, html, fn) => { const b = el('button', cls, html); b.type = 'button'; if (fn) b.onclick = fn; return b; };
  const lvl = L => Math.max(1, Math.floor(+L || 1));
  const single = m => m && !(m & (m - 1));
  const bitVal = m => 31 - Math.clz32(m);
  const lowVal = m => 31 - Math.clz32(m & -m);
  const pc = m => { let n = 0; while (m) { m &= m - 1; n++; } return n; };
  const plural = (n, a, b) => n === 1 ? a : b;

  // rows and columns of an N x N grid, and each cell's peers
  const GEO = {};
  function geo(N) {
    if (GEO[N]) return GEO[N];
    const units = [], peers = [];
    for (let r = 0; r < N; r++) units.push([...Array(N)].map((_, c) => r * N + c));
    for (let c = 0; c < N; c++) units.push([...Array(N)].map((_, r) => r * N + c));
    for (let i = 0; i < N * N; i++) { const r = (i / N) | 0, c = i % N, p = []; for (let k = 0; k < N; k++) { if (k !== c) p.push(r * N + k); if (k !== r) p.push(k * N + c); } peers.push(p); }
    return (GEO[N] = { units, peers });
  }

  // a random filled Latin square, values 1..N
  function latin(N) {
    const g = Array(N * N).fill(0), rm = Array(N).fill(0), cm = Array(N).fill(0);
    const vals = [...Array(N)].map((_, k) => k + 1);
    (function fill(i) {
      if (i === N * N) return true;
      const r = (i / N) | 0, c = i % N;
      for (const v of shuffle(vals.slice())) {
        const b = 1 << v; if ((rm[r] | cm[c]) & b) continue;
        g[i] = v; rm[r] |= b; cm[c] |= b;
        if (fill(i + 1)) return true;
        rm[r] &= ~b; cm[c] &= ~b;
      }
      g[i] = 0; return false;
    })(0);
    return g;
  }

  // candidate propagation shared by both number puzzles: naked singles and hidden singles in rows/columns
  function latinStep(N, cand) {
    const { units, peers } = geo(N);
    let changed = false;
    for (let i = 0; i < N * N; i++) {
      const m = cand[i]; if (!m) return -1;
      if (single(m)) for (const j of peers[i]) if (cand[j] & m) { cand[j] &= ~m; changed = true; if (!cand[j]) return -1; }
    }
    for (const u of units) for (let v = 1; v <= N; v++) {
      const b = 1 << v; let n = 0, at = -1;
      for (const i of u) if (cand[i] & b) { n++; at = i; }
      if (!n) return -1;
      if (n === 1 && cand[at] !== b) { cand[at] = b; changed = true; }
    }
    return changed ? 1 : 0;
  }

  // big number buttons plus a hint key
  function numPad(api, N, onNum, onHelp) {
    const pad = el('div', 'l3-pad'); if (N <= 4) pad.style.maxWidth = '380px';
    const keys = [...Array(N)].map((_, k) => { const b = mkBtn('btn c-sky l3-key', k + 1, () => onNum(k + 1)); b.setAttribute('aria-label', 'Number ' + (k + 1)); pad.append(b); return b; });
    const help = mkBtn('btn c-sun l3-key l3-help', '💡 Help', onHelp); help.setAttribute('aria-label', 'Help me with one square');
    pad.append(help);
    return { pad, keys };
  }

  /* =========================================================
     1. MIRROR DRAW
     ========================================================= */
  const MR_COL = [{ c: 'coral', s: '●', n: 'red' }, { c: 'sky', s: '★', n: 'blue' }, { c: 'sun', s: '▲', n: 'yellow' }, { c: 'leaf', s: '■', n: 'green' }, { c: 'berry', s: '♥', n: 'pink' }];
  // sizes grow slowly; past the cap, more colours and busier pictures make it harder (sizes are then clamped to the screen)
  const MR_T = [null,
    { m: 'v', h: 3, w: 3, k: 2, d: .35, x: .85 },
    { m: 'v', h: 4, w: 3, k: 2, d: .4, x: .85 },
    { m: 'h', h: 3, w: 4, k: 2, d: .4, x: .8 },
    { m: 'v', h: 4, w: 3, k: 3, d: .45, x: .78 },
    { m: 'h', h: 3, w: 5, k: 3, d: .45, x: .75 },
    { m: 'b', h: 3, w: 3, k: 2, d: .45, x: .75 },
    { m: 'v', h: 5, w: 4, k: 3, d: .5, x: .7 },
    { m: 'h', h: 4, w: 5, k: 3, d: .5, x: .7 },
    { m: 'b', h: 3, w: 4, k: 3, d: .5, x: .65 },
    { m: 'v', h: 6, w: 5, k: 4, d: .5, x: .6 },
    { m: 'h', h: 4, w: 6, k: 4, d: .5, x: .6 },
    { m: 'b', h: 4, w: 4, k: 4, d: .5, x: .55 }];
  function mrParams(L) {
    if (L < MR_T.length) return Object.assign({ flip: L >= 4 && randInt(2) === 1 }, MR_T[L]);
    const b = pick(MR_T.slice(7)), t = Math.min(1, (L - MR_T.length) / 12);
    return Object.assign({}, b, { k: 4 + (Math.random() < t ? 1 : 0), d: .45 + Math.random() * .12, x: .6 - t * .25 + Math.random() * .08, flip: randInt(2) === 1 });
  }
  // a blobby pixel picture: h x w, each cell -1 (empty) or a colour index 0..k-1
  function mrPattern(h, w, k, d, x) {
    const n = h * w, want = Math.max(k + 2, Math.round(n * d)), g = Array(n).fill(-1);
    const nb = i => { const r = (i / w) | 0, c = i % w, o = []; if (r) o.push(i - w); if (r < h - 1) o.push(i + w); if (c) o.push(i - 1); if (c < w - 1) o.push(i + 1); return o; };
    shuffle([...Array(n).keys()]).slice(0, k).forEach((i, ci) => { g[i] = ci; });
    let filled = k, guard = 0;
    while (filled < want && guard++ < 5000) {
      const on = g.map((v, i) => v >= 0 ? i : -1).filter(i => i >= 0);
      const from = pick(on), free = nb(from).filter(j => g[j] < 0);
      if (!free.length) { if (Math.random() < .1) { const e = g.map((v, i) => v < 0 ? i : -1).filter(i => i >= 0); if (e.length) { g[pick(e)] = randInt(k); filled++; } } continue; }
      g[pick(free)] = Math.random() < x ? g[from] : randInt(k); filled++;
    }
    return g;
  }

  function startMirror(L, api) {
    L = lvl(L);
    const P = mrParams(L), { k, m } = P;
    // never let squares drop below about 44px: shrink the board to the space we really have
    const lineT = 14, gap = 4, MIN = 44;
    const Wd = Math.min(api.stage.clientWidth || 330, 640) - 20, Hd = 470;
    const fit = (len, line) => Math.max(2, Math.floor((len + gap - (line ? lineT + gap : 0)) / (MIN + gap)));
    const maxC = fit(Wd, m !== 'h'), maxR = fit(Hd, m !== 'v');
    const w = Math.max(2, Math.min(P.w, m !== 'h' ? Math.floor(maxC / 2) : maxC));
    const h = Math.max(2, Math.min(P.h, m !== 'v' ? Math.floor(maxR / 2) : maxR));
    const mc = m !== 'h', mrow = m !== 'v'; // mirror across a vertical line (columns) / horizontal line (rows)
    const R = mrow ? 2 * h : h, C = mc ? 2 * w : w;
    const cols = shuffle(MR_COL.slice()).slice(0, k);
    const pat = mrPattern(h, w, k, P.d, P.x);
    // where the source sits: left/top normally, right/bottom when flipped (single-line modes only)
    const srcRight = mc && m === 'v' && P.flip, srcBottom = mrow && m === 'h' && P.flip;
    const inSrcR = r => !mrow || (srcBottom ? r >= h : r < h);
    const inSrcC = c => !mc || (srcRight ? c >= w : c < w);
    const srcOf = (r, c) => [inSrcR(r) ? r : R - 1 - r, inSrcC(c) ? c : C - 1 - c];
    const patAt = (r, c) => pat[(srcBottom ? r - h : r) * w + (srcRight ? c - w : c)];
    const isSrc = [], exp = [], cur = [], srcIdx = [];
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const i = r * C + c, [sr, sc] = srcOf(r, c);
      isSrc[i] = sr === r && sc === c; srcIdx[i] = sr * C + sc;
      exp[i] = patAt(sr, sc); cur[i] = isSrc[i] ? exp[i] : -1;
    }
    const targets = cur.map((_, i) => i).filter(i => !isSrc[i]);
    const needFilled = targets.filter(i => exp[i] >= 0).length;
    let sel = 0, mistakes = 0, finished = false;
    const bad = new Set();
    const intro = m === 'b' ? 'Copy the corner picture into the other three corners, as reflections across both dotted lines.'
      : 'Copy the picture across the dotted line, like a reflection in a mirror.';
    api.hint(intro + ' Pick a colour, then tap squares. Tap again to clear.');

    const cs = Math.floor(Math.max(MIN, Math.min(64, (Wd - gap * (C - 1) - (mc ? lineT + gap : 0)) / C, (Hd - gap * (R - 1) - (mrow ? lineT + gap : 0)) / R)));
    const board = el('div', 'mr-board');
    const track = (n, half, on) => [...Array(n)].map((_, x) => cs + 'px').map((t, x) => on && x === half ? lineT + 'px ' + t : t).join(' ');
    board.style.cssText = `--cs:${cs}px; gap:${gap}px; grid-template-columns:${track(C, w, mc)}; grid-template-rows:${track(R, h, mrow)}`;
    const gpos = (x, half, on) => x + 1 + (on && x >= half ? 1 : 0);
    const cells = [];
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const i = r * C + c;
      const b = isSrc[i] ? el('div', 'mr-cell mr-src') : mkBtn('mr-cell', '', () => tap(i));
      b.style.gridRow = gpos(r, h, mrow); b.style.gridColumn = gpos(c, w, mc);
      cells[i] = b; board.append(b); paint(i);
    }
    if (mc) { const ln = el('div', 'mr-line mr-lv'); ln.style.gridColumn = String(w + 1); ln.style.gridRow = '1 / -1'; board.append(ln); }
    if (mrow) { const ln = el('div', 'mr-line mr-lh'); ln.style.gridRow = String(h + 1); ln.style.gridColumn = '1 / -1'; board.append(ln); }

    const bar = el('div', 'l3-bar');
    const sws = cols.map((co, ci) => {
      const b = mkBtn('tile mr-sw c-' + co.c, co.s, () => { sel = ci; sfx.tap(); tone(440 + ci * 90, .1, 'triangle', .08); showSel(); api.hint(`${cap(co.n)} it is. Tap the squares that should be ${co.n}.`); });
      b.setAttribute('aria-label', co.n); bar.append(b); return b;
    });
    const chk = mkBtn('btn c-card', '✓ Check', check); bar.append(chk);
    api.stage.append(board, bar);
    showSel();

    function cap(s) { return s[0].toUpperCase() + s.slice(1); }
    function showSel() { sws.forEach((b, ci) => b.classList.toggle('mr-on', ci === sel)); }
    function paint(i) {
      const b = cells[i], v = cur[i];
      b.className = 'mr-cell' + (isSrc[i] ? ' mr-src' : '') + (v >= 0 ? ' mr-f c-' + cols[v].c : '') + (bad.has(i) ? ' mr-bad' : '');
      b.textContent = v >= 0 ? cols[v].s : '';
      if (!isSrc[i]) { const [r, c] = [(i / C) | 0, i % C]; b.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}, ${v >= 0 ? cols[v].n : 'empty'}`); }
    }
    function tap(i) {
      if (finished) return;
      cur[i] = cur[i] === sel ? -1 : sel;
      bad.delete(i); paint(i);
      if (cur[i] >= 0) { cells[i].classList.add('mr-new'); tone(500 + sel * 70, .09, 'triangle', .1); } else sfx.tap();
      const s = cells[srcIdx[i]]; s.classList.remove('mr-ping'); void s.offsetWidth; s.classList.add('mr-ping');
      if (targets.every(j => cur[j] === exp[j])) return win();
      const n = targets.filter(j => cur[j] >= 0).length;
      if (n >= needFilled) api.hint('Nearly there! Something is not quite right yet. Press Check to see which squares.');
    }
    function check() {
      if (finished) return;
      const wrong = targets.filter(j => cur[j] >= 0 && cur[j] !== exp[j]);
      const missing = targets.filter(j => cur[j] < 0 && exp[j] >= 0).length;
      if (wrong.length) {
        mistakes += wrong.length; sfx.soft();
        wrong.forEach(j => { bad.add(j); paint(j); wob(cells[j]); });
        api.hint(`${wrong.length} ${plural(wrong.length, 'square is', 'squares are')} marked with a dotted ring. ${plural(wrong.length, 'It does', 'They do')} not match the other side. Tap to change.` + (missing ? ` ${missing} more ${plural(missing, 'square needs', 'squares need')} colour.` : ''));
      } else {
        tone(660, .15, 'triangle', .1);
        api.hint(`All good so far! ${missing} more ${plural(missing, 'square needs', 'squares need')} colour.`);
      }
    }
    function win() {
      finished = true; sfx.good(); toast(cheer());
      targets.filter(j => cur[j] >= 0).forEach((j, n) => { cells[j].style.animationDelay = (n * .04) + 's'; cells[j].classList.add('mr-glow'); });
      [523, 659, 784].forEach((f, n) => tone(f, .18, 'triangle', .1, .15 + n * .12));
      api.hint('A perfect mirror picture!');
      api.done(starsFor(mistakes, 1, 4));
    }
    if (TEST) api.stage.__auto = () => { targets.forEach(j => { if (exp[j] >= 0) { sws[exp[j]].click(); cells[j].click(); } }); };
  }

  /* =========================================================
     2. GREATER THAN GRID
     ========================================================= */
  const GT_T = [null,
    { N: 4, g: 8, q: 5 }, { N: 4, g: 5, q: 5 }, { N: 5, g: 9, q: 8 }, { N: 5, g: 7, q: 8 }, { N: 5, g: 5, q: 7 },
    { N: 6, g: 10, q: 12 }, { N: 6, g: 8, q: 11 }, { N: 6, g: 6, q: 11 }, { N: 6, g: 5, q: 10 }, { N: 6, g: 4, q: 10 }];
  function gtParams(L) { return L < GT_T.length ? GT_T[L] : { N: 6, g: 3 + randInt(3), q: 9 + randInt(3) }; }

  // logic solver: rows/columns singles plus inequality bounds. Returns the grid if it solves fully.
  function gtLogic(N, giv, ineq) {
    const ALL = (1 << (N + 1)) - 2, cand = giv.map(v => v ? 1 << v : ALL);
    for (let it = 0; it < 200; it++) {
      let ch = latinStep(N, cand); if (ch < 0) return null;
      for (const q of ineq) { // value[a] < value[b]
        const a = cand[q.a], b = cand[q.b];
        const na = a & ((1 << bitVal(b)) - 1), nb = b & ~((1 << (lowVal(a) + 1)) - 1);
        if (!na || !nb) return null;
        if (na !== a || nb !== b) { cand[q.a] = na; cand[q.b] = nb; ch = 1; }
      }
      if (!ch) break;
    }
    return cand.every(single) ? cand.map(bitVal) : null;
  }
  // brute-force counter (stops at lim)
  function gtCount(N, giv, ineq, lim) {
    const g = giv.slice(), rm = Array(N).fill(0), cm = Array(N).fill(0), con = [...Array(N * N)].map(() => []);
    ineq.forEach(q => { con[q.a].push([q.b, true]); con[q.b].push([q.a, false]); });
    g.forEach((v, i) => { if (v) { rm[(i / N) | 0] |= 1 << v; cm[i % N] |= 1 << v; } });
    let n = 0;
    (function dfs(i) {
      if (i === N * N) { n++; return n >= lim; }
      if (giv[i]) return dfs(i + 1);
      const r = (i / N) | 0, c = i % N;
      for (let v = 1; v <= N; v++) {
        const b = 1 << v; if ((rm[r] | cm[c]) & b) continue;
        if (con[i].some(([j, less]) => g[j] && (less ? !(v < g[j]) : !(v > g[j])))) continue;
        g[i] = v; rm[r] |= b; cm[c] |= b;
        if (dfs(i + 1)) return true;
        g[i] = 0; rm[r] &= ~b; cm[c] &= ~b;
      }
      return false;
    })(0);
    return n;
  }
  function genGreater(P) {
    const { N } = P;
    for (let tries = 0; tries < 30; tries++) {
      const sol = latin(N), all = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const i = r * N + c;
        if (c < N - 1) all.push({ p: i, o: i + 1, v: false });
        if (r < N - 1) all.push({ p: i, o: i + N, v: true });
      }
      all.forEach(q => { if (sol[q.p] < sol[q.o]) { q.a = q.p; q.b = q.o; } else { q.a = q.o; q.b = q.p; } });
      const giv = sol.slice();
      let ineq = all.slice(), nG = N * N;
      const clues = shuffle([...giv.keys()].map(i => ({ g: i })).concat(all.map(q => ({ q }))));
      for (const cl of clues) {
        if (cl.g !== undefined) {
          if (nG <= P.g) continue;
          const keep = giv[cl.g]; giv[cl.g] = 0;
          if (gtLogic(N, giv, ineq)) nG--; else giv[cl.g] = keep;
        } else {
          if (ineq.length <= P.q) continue;
          const nx = ineq.filter(q => q !== cl.q);
          if (gtLogic(N, giv, nx)) ineq = nx;
        }
      }
      const ls = gtLogic(N, giv, ineq);
      if (ls && ls.every((v, i) => v === sol[i]) && gtCount(N, giv, ineq, 2) === 1) return { N, sol, giv, ineq };
    }
    return null;
  }

  function startGreater(L, api) {
    L = lvl(L);
    const pz = genGreater(gtParams(L)) || genGreater({ N: 4, g: 8, q: 5 });
    const { N, sol, giv, ineq } = pz;
    const cur = giv.slice(), { peers, units } = geo(N);
    let sel = -1, mistakes = 0, finished = false, busy = false;
    api.hint(`Tap an empty square, then a number. Every row and column holds 1 to ${N} once. The pointy end of a sign points to the smaller number.`);
    const Wd = Math.min(stageW(api), 600);
    const sg = N >= 6 ? 16 : 20;
    const cs = Math.floor(Math.max(34, Math.min(N <= 4 ? 76 : 66, (Wd - 20 - sg * (N - 1)) / N)));
    const sf = Math.max(22, Math.round(cs * .5));
    const board = el('div', 'gt-board');
    const tr = [...Array(2 * N - 1)].map((_, k) => (k % 2 ? sg : cs) + 'px').join(' ');
    board.style.cssText = `--cs:${cs}px; --sf:${sf}px; grid-template-columns:${tr}; grid-template-rows:${tr}`;
    const cells = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const i = r * N + c, b = mkBtn('gt-cell', giv[i] || '', () => select(i));
      b.style.gridRow = 2 * r + 1; b.style.gridColumn = 2 * c + 1;
      b.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}`);
      cells[i] = b; board.append(b);
    }
    const signs = ineq.map(q => {
      const r = (q.p / N) | 0, c = q.p % N, less = q.a === q.p; // p is left/top
      const s = el('div', 'gt-sign' + (q.v ? ' gt-v' : ''), `<span>${less ? '&lt;' : '&gt;'}</span>`);
      s.style.gridRow = q.v ? 2 * r + 2 : 2 * r + 1; s.style.gridColumn = q.v ? 2 * c + 1 : 2 * c + 2;
      board.append(s); return { q, s };
    });
    const { pad, keys } = numPad(api, N, place, help);
    api.stage.append(board, pad);

    function render() {
      cells.forEach((b, i) => {
        let cls = 'gt-cell';
        if (cur[i] && !giv[i]) cls += ' gt-mine';
        if (sel >= 0) { if (i === sel) cls += ' gt-sel'; else if (peers[sel].includes(i)) cls += ' gt-peer'; }
        ['gt-wrong', 'gt-new', 'gt-glow'].forEach(k => { if (b.classList.contains(k)) cls += ' ' + k; });
        b.className = cls;
      });
      signs.forEach(({ q, s }) => s.classList.toggle('gt-ok', !!(cur[q.a] && cur[q.b])));
      keys.forEach((k, v) => k.classList.toggle('l3-full', cur.filter(x => x === v + 1).length === N));
    }
    function select(i) {
      if (finished || busy) return;
      sel = i; sfx.tap(); render();
      api.hint(cur[i] ? (giv[i] ? 'That number was there from the start. Pick an empty square.' : 'That one is done. Pick an empty square.') : 'Now tap a number below.');
    }
    function put(i, v) {
      const b = cells[i]; cur[i] = v; b.textContent = v; b.classList.add('gt-new'); api.later(() => b.classList.remove('gt-new'), 400);
      const doneU = units.filter(u => u.includes(i) && u.every(j => cur[j])).length;
      tone(doneU ? 600 + doneU * 120 : 520, doneU ? .2 : .1, 'triangle', .11);
      render();
      if (cur.every(Boolean)) {
        finished = true; sfx.good(); toast(cheer()); api.hint('Every number is in place!');
        cells.forEach((c, n) => { if (!giv[n]) { c.style.animationDelay = (n * .03) + 's'; c.classList.add('gt-glow'); } });
        api.done(starsFor(mistakes, N >= 6 ? 1 : 0, N >= 6 ? 4 : 2));
        return true;
      }
      return false;
    }
    function place(v) {
      if (finished || busy) return;
      if (sel < 0 || cur[sel]) { sfx.soft(); api.hint('First tap an empty square, then tap a number.'); return; }
      if (sol[sel] === v) { if (!put(sel, v)) api.hint('Lovely. Pick another empty square.'); return; }
      mistakes++; busy = true;
      const b = cells[sel]; b.textContent = v; b.classList.add('gt-wrong'); wob(b); sfx.soft();
      const r = (sel / N) | 0;
      const clash = peers[sel].find(j => cur[j] === v);
      const broke = ineq.find(q => (q.a === sel && cur[q.b] && !(v < cur[q.b])) || (q.b === sel && cur[q.a] && !(v > cur[q.a])));
      api.hint(clash !== undefined ? `There is already a ${v} in that ${((clash / N) | 0) === r ? 'row' : 'column'}. Try another number.`
        : broke ? 'That does not fit the sign next to it. The pointy end points to the smaller number.'
        : 'Not that one here. Look at the signs and the other numbers.');
      api.later(() => { b.textContent = ''; b.classList.remove('gt-wrong'); busy = false; render(); }, 1100);
    }
    function help() {
      if (finished || busy) return;
      let i = sel >= 0 && !cur[sel] ? sel : -1;
      if (i < 0) { // the empty square with fewest choices
        let best = 99; cur.forEach((v, j) => { if (!v) { const n = pc(peers[j].reduce((m, p) => cur[p] ? m & ~(1 << cur[p]) : m, (1 << (N + 1)) - 2)); if (n < best) { best = n; i = j; } } });
      }
      if (i < 0) return;
      mistakes++; sel = i; sfx.tap();
      if (!put(i, sol[i])) api.hint(`Here is one: a ${sol[i]} goes there. Keep going!`);
    }
    render();
    if (TEST) api.stage.__auto = () => { cur.forEach((v, i) => { if (!v) { cells[i].click(); keys[sol[i] - 1].click(); } }); };
  }

  /* =========================================================
     3. CAGE SUMS
     ========================================================= */
  const CG_T = [null,
    { N: 3, s: [1, 2, 2, 2] }, { N: 4, s: [1, 2, 2, 2] }, { N: 4, s: [2, 2, 2, 3] }, { N: 5, s: [1, 2, 2, 3] }, { N: 5, s: [2, 2, 3, 3] },
    { N: 6, s: [1, 2, 2, 3, 3] }, { N: 6, s: [2, 2, 3, 3] }, { N: 6, s: [2, 2, 3, 3, 4] }];
  function cgParams(L) {
    if (L < CG_T.length) return Object.assign({ x: 0 }, CG_T[L]);
    return { N: 6, s: [2, 2, 3, 3, 4], x: Math.min(.4, .2 + (L - 9) * .04) }; // some multiply cages from level 9
  }
  const cgVal = (cg, vals) => cg.op === 'x' ? vals.reduce((a, b) => a * b, 1) : vals.reduce((a, b) => a + b, 0);

  // logic solver: rows/columns singles plus "which numbers can make this shape's total"
  function cgLogic(N, cages) {
    const ALL = (1 << (N + 1)) - 2, cand = Array(N * N).fill(ALL);
    for (let it = 0; it < 200; it++) {
      let ch = latinStep(N, cand); if (ch < 0) return null;
      for (const cg of cages) {
        const cl = cg.cells, ok = cl.map(() => 0), vals = [];
        (function en(k) {
          if (k === cl.length) { if (cgVal(cg, vals) === cg.t) vals.forEach((v, j) => { ok[j] |= 1 << v; }); return; }
          const i = cl[k];
          for (let v = 1; v <= N; v++) {
            if (!(cand[i] & (1 << v))) continue;
            let clash = false;
            for (let j = 0; j < k; j++) if (vals[j] === v && (((cl[j] / N) | 0) === ((i / N) | 0) || cl[j] % N === i % N)) { clash = true; break; }
            if (clash) continue;
            vals[k] = v; en(k + 1);
          }
          vals.length = k;
        })(0);
        cl.forEach((i, j) => { const n = cand[i] & ok[j]; if (!n) ch = -1; else if (n !== cand[i]) { cand[i] = n; if (ch >= 0) ch = 1; } });
        if (ch < 0) return null;
      }
      if (!ch) break;
    }
    return { cand, solved: cand.every(single) };
  }
  // brute-force counter (stops at lim)
  function cgCount(N, cages, lim) {
    const g = Array(N * N).fill(0), rm = Array(N).fill(0), cm = Array(N).fill(0), of = [];
    cages.forEach((cg, k) => cg.cells.forEach(i => { of[i] = k; }));
    const st = cages.map(cg => ({ left: cg.cells.length, acc: cg.op === 'x' ? 1 : 0 }));
    let n = 0;
    (function dfs(i) {
      if (i === N * N) { n++; return n >= lim; }
      const r = (i / N) | 0, c = i % N, cg = cages[of[i]], s = st[of[i]];
      for (let v = 1; v <= N; v++) {
        const b = 1 << v; if ((rm[r] | cm[c]) & b) continue;
        const acc = cg.op === 'x' ? s.acc * v : s.acc + v, left = s.left - 1;
        if (cg.op === 'x') { if (cg.t % acc || (!left && acc !== cg.t)) continue; }
        else if (acc + left > cg.t || acc + left * N < cg.t) continue;
        const pa = s.acc; s.acc = acc; s.left = left; g[i] = v; rm[r] |= b; cm[c] |= b;
        if (dfs(i + 1)) return true;
        s.acc = pa; s.left = left + 1; g[i] = 0; rm[r] &= ~b; cm[c] &= ~b;
      }
      return false;
    })(0);
    return n;
  }
  function cgPartition(N, P, sol) {
    const of = Array(N * N).fill(-1), cages = [];
    const nb = i => { const r = (i / N) | 0, c = i % N, o = []; if (r) o.push(i - N); if (r < N - 1) o.push(i + N); if (c) o.push(i - 1); if (c < N - 1) o.push(i + 1); return o; };
    for (const start of shuffle([...Array(N * N).keys()])) {
      if (of[start] >= 0) continue;
      const want = pick(P.s), cells = [start]; of[start] = cages.length;
      while (cells.length < want) {
        const fr = cells.flatMap(nb).filter(j => of[j] < 0);
        if (!fr.length) break;
        const j = pick(fr); of[j] = cages.length; cells.push(j);
      }
      cages.push({ cells });
    }
    cages.forEach(cg => { cg.op = cg.cells.length === 2 && Math.random() < P.x ? 'x' : '+'; cg.t = cgVal(cg, cg.cells.map(i => sol[i])); });
    return { cages, nb };
  }
  // pull one square out of its cage as a single-square cage; the rest splits into connected pieces
  function cgSplit(cages, x, sol, nb) {
    const k = cages.findIndex(cg => cg.cells.includes(x)), old = cages[k];
    cages.splice(k, 1);
    cages.push({ cells: [x], op: '+', t: sol[x] });
    const rest = old.cells.filter(i => i !== x), seen = new Set();
    rest.forEach(s => {
      if (seen.has(s)) return;
      const comp = [s]; seen.add(s);
      for (let q = 0; q < comp.length; q++) nb(comp[q]).forEach(j => { if (rest.includes(j) && !seen.has(j)) { seen.add(j); comp.push(j); } });
      const cg = { cells: comp, op: comp.length >= 2 ? old.op : '+' }; cg.t = cgVal(cg, comp.map(i => sol[i])); cages.push(cg);
    });
  }
  function genCages(P) {
    const { N } = P, sol = latin(N), { cages, nb } = cgPartition(N, P, sol);
    for (let guard = 0; guard < N * N; guard++) {
      const res = cgLogic(N, cages);
      if (res && res.solved) break;
      const open = [...Array(N * N).keys()].filter(i => !res || !single(res.cand[i]));
      const inBig = open.filter(i => cages.find(cg => cg.cells.includes(i)).cells.length > 1);
      cgSplit(cages, pick(inBig.length ? inBig : open), sol, nb);
    }
    const res = cgLogic(N, cages);
    if (!res || !res.solved || res.cand.some((m, i) => bitVal(m) !== sol[i]) || cgCount(N, cages, 2) !== 1) return null;
    cages.forEach(cg => cg.cells.sort((a, b) => a - b));
    return { N, sol, cages };
  }

  const CG_BG = ['#FFF1CF', '#D8EEFF', '#DDF6E5', '#FDE0EC', '#ECE4FF', '#FFE4D2'];
  function startCages(L, api) {
    L = lvl(L);
    const P = cgParams(L);
    // make a handful and keep the one with the fewest ready-filled single squares
    let pz = null;
    for (let t = 0; t < 14; t++) {
      const q = genCages(P); if (!q) continue;
      q.ones = q.cages.filter(cg => cg.cells.length === 1).length;
      if (!pz || q.ones < pz.ones) pz = q;
    }
    for (let t = 0; !pz && t < 50; t++) pz = genCages({ N: 3, s: [1, 2, 2], x: 0 });
    const { N, sol, cages } = pz;
    const of = []; cages.forEach((cg, k) => cg.cells.forEach(i => { of[i] = k; }));
    const giv = Array(N * N).fill(0); // single-square shapes are filled in for the player
    cages.forEach(cg => { if (cg.cells.length === 1) giv[cg.cells[0]] = sol[cg.cells[0]]; });
    const cur = giv.slice(), { peers, units } = geo(N);
    let sel = -1, mistakes = 0, finished = false, busy = false;
    const hasX = cages.some(cg => cg.op === 'x');
    api.hint(`Tap a square, then a number. The numbers in each thick-edged shape add up to its small number${hasX ? ' (a × means multiply)' : ''}. No number repeats in a row or column.`);

    // colour the shapes so neighbours differ
    const col = [];
    cages.forEach((cg, k) => {
      const used = new Set();
      cg.cells.forEach(i => peers[i].forEach(j => { if (Math.abs(((j / N) | 0) - ((i / N) | 0)) + Math.abs(j % N - i % N) === 1 && of[j] !== k && col[of[j]] !== undefined) used.add(col[of[j]]); }));
      let c = 0; while (used.has(c) && c < CG_BG.length - 1) c++; col[k] = c;
    });
    const Wd = Math.min(stageW(api), 560);
    const cs = Math.floor(Math.max(44, Math.min(N <= 3 ? 92 : N <= 4 ? 80 : 72, (Wd - 12) / N)));
    const lf = Math.max(16, Math.round(cs * .3));
    const board = el('div', 'cg-board');
    board.style.cssText = `--cs:${cs}px; --lf:${lf}px; grid-template-columns:repeat(${N}, ${cs}px)`;
    const cells = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const i = r * N + c, k = of[i];
      const b = mkBtn('cg-cell', '', () => select(i));
      const edge = (rr, cc) => rr < 0 || cc < 0 || rr >= N || cc >= N ? 0 : of[rr * N + cc] !== k ? 3 : 1;
      const bw = [edge(r - 1, c), edge(r, c + 1), edge(r + 1, c), edge(r, c - 1)];
      b.style.borderWidth = bw.map(x => x + 'px').join(' ');
      b.style.borderColor = bw.map(x => x === 1 ? 'rgba(46,61,71,.22)' : '#2E3D47').join(' ');
      b.style.setProperty('--bg', CG_BG[col[k]]);
      const cg = cages[k];
      b.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}, shape totals ${cg.t}${cg.op === 'x' ? ' multiplied' : ''}`);
      cells[i] = b; board.append(b);
    }
    cages.forEach(cg => { const lab = el('span', 'cg-lab', cg.t + (cg.op === 'x' ? '×' : '')); cells[cg.cells[0]].lab = lab; });
    const { pad, keys } = numPad(api, N, place, help);
    api.stage.append(board, pad);

    function setText(i) { const b = cells[i]; b.textContent = cur[i] || ''; if (b.lab) b.prepend(b.lab); }
    function render() {
      cells.forEach((b, i) => {
        let cls = 'cg-cell';
        if (cur[i] && !giv[i]) cls += ' cg-mine';
        if (sel >= 0) { if (i === sel) cls += ' cg-sel'; else if (of[i] === of[sel]) cls += ' cg-mate'; }
        ['cg-wrong', 'cg-new', 'cg-done'].forEach(k => { if (b.classList.contains(k)) cls += ' ' + k; });
        b.className = cls;
      });
      keys.forEach((k, v) => k.classList.toggle('l3-full', cur.filter(x => x === v + 1).length === N));
    }
    cells.forEach((_, i) => setText(i));
    function select(i) {
      if (finished || busy) return;
      sel = i; sfx.tap(); render();
      const cg = cages[of[i]];
      api.hint(cur[i] ? (giv[i] ? 'A one-square shape is already filled in. Pick an empty square.' : 'That one is done. Pick an empty square.')
        : `This shape ${cg.op === 'x' ? 'multiplies to' : 'adds up to'} ${cg.t}. Tap a number below.`);
    }
    function put(i, v) {
      const b = cells[i]; cur[i] = v; setText(i); b.classList.add('cg-new'); api.later(() => b.classList.remove('cg-new'), 400);
      const cg = cages[of[i]], doneU = units.filter(u => u.includes(i) && u.every(j => cur[j])).length;
      if (cg.cells.every(j => cur[j])) {
        cg.cells.forEach((j, n) => { cells[j].style.animationDelay = (n * .06) + 's'; cells[j].classList.add('cg-done'); api.later(() => cells[j].classList.remove('cg-done'), 900); });
        [587, 740, 880].slice(0, 1 + Math.min(2, doneU)).forEach((f, n) => tone(f, .16, 'triangle', .1, n * .09));
      } else tone(doneU ? 600 + doneU * 120 : 520, .12, 'triangle', .1);
      render();
      if (cur.every(Boolean)) {
        finished = true; sfx.good(); toast(cheer()); board.classList.add('cg-solved'); api.hint('Every shape adds up!');
        api.done(starsFor(mistakes, N >= 6 ? 1 : 0, N >= 6 ? 4 : 2));
        return true;
      }
      return false;
    }
    function place(v) {
      if (finished || busy) return;
      if (sel < 0 || cur[sel]) { sfx.soft(); api.hint('First tap an empty square, then tap a number.'); return; }
      if (sol[sel] === v) { if (!put(sel, v)) api.hint('Lovely. Pick another empty square.'); return; }
      mistakes++; busy = true;
      const b = cells[sel], i = sel, cg = cages[of[i]], r = (i / N) | 0;
      b.textContent = v; if (b.lab) b.prepend(b.lab); b.classList.add('cg-wrong'); wob(b); sfx.soft();
      const clash = peers[i].find(j => cur[j] === v);
      const others = cg.cells.filter(j => j !== i);
      const filledVals = others.filter(j => cur[j]).map(j => cur[j]).concat(v);
      const full = others.every(j => cur[j]);
      const over = cg.op === 'x' ? (full ? cgVal(cg, filledVals) !== cg.t : cg.t % cgVal(cg, filledVals) !== 0) : (full ? cgVal(cg, filledVals) !== cg.t : cgVal(cg, filledVals) >= cg.t);
      api.hint(clash !== undefined ? `There is already a ${v} in that ${((clash / N) | 0) === r ? 'row' : 'column'}. Try another number.`
        : over ? `That will not make ${cg.t} for this shape. Try another number.`
        : `Not that one here. Think about what this shape needs to make ${cg.t}.`);
      api.later(() => { setText(i); b.classList.remove('cg-wrong'); busy = false; render(); }, 1100);
    }
    function help() {
      if (finished || busy) return;
      let i = sel >= 0 && !cur[sel] ? sel : -1;
      if (i < 0) { // finish the emptiest-nearly-done shape first
        let best = 99; cur.forEach((v, j) => { if (!v) { const n = cages[of[j]].cells.filter(x => !cur[x]).length; if (n < best) { best = n; i = j; } } });
      }
      if (i < 0) return;
      mistakes++; sel = i; sfx.tap();
      if (!put(i, sol[i])) api.hint(`Here is one: a ${sol[i]} goes there. Keep going!`);
    }
    render();
    if (TEST) {
      api.stage.__auto = () => { cur.forEach((v, i) => { if (!v) { cells[i].click(); keys[sol[i] - 1].click(); } }); };
      api.stage.__cages = { N, cages, sol };
    }
  }

  if (TEST) window.__logic3 = { genGreater, gtParams, gtLogic, gtCount, genCages, cgParams, cgLogic, cgCount, mrParams, mrPattern };
})();
