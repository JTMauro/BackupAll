/* Recall: Cards (Solitaire, Pyramid Patience, Higher or Lower, Go Fish, Crazy Eights) */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor } = R;
  const TEST = !!window.__recallTest; // test hooks only exist when a test harness sets this before load

  /* ---------------- shared card toolkit ---------------- */
  const SU = ['♠', '♥', '♦', '♣'], SUN = ['spades', 'hearts', 'diamonds', 'clubs'];
  const RK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const RN = ['', 'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];
  const RNP = ['', 'Aces', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s', '10s', 'Jacks', 'Queens', 'Kings'];
  const AN = r => (r === 1 || r === 8 ? 'an ' : 'a ') + RN[r];
  const red = s => s === 1 || s === 2;
  const cid = c => c.s * 13 + c.r - 1;
  const RNK = id => id % 13 + 1, SUT = id => (id / 13) | 0, RED = id => { const s = (id / 13) | 0; return s === 1 || s === 2; };
  const newDeck = () => { const d = []; for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) d.push({ r, s }); return d; };
  const cname = c => RN[c.r] + ' of ' + SUN[c.s];
  const cshort = c => RK[c.r] + SU[c.s];
  const last = a => a[a.length - 1];
  const WORDS = ['', 'one', 'two', 'three', 'four'];
  const PALS = [{ n: 'Mabel', f: '👵', p: 'she' }, { n: 'Arthur', f: '👴', p: 'he' }, { n: 'Rosie', f: '👩‍🦳', p: 'she' },
    { n: 'Walter', f: '👨‍🦳', p: 'he' }, { n: 'Dot', f: '👵', p: 'she' }, { n: 'Frank', f: '🧓', p: 'he' }];

  /* one card drawing helper shared by every game */
  function cardEl(c, up = true, cls = '', tag = 'button') {
    const b = el(tag, 'kc-card ' + cls);
    if (tag === 'button') b.type = 'button';
    if (!c || !up) { b.classList.add('kc-back'); b.setAttribute('aria-label', 'Face-down card'); b.innerHTML = '<span class="kc-pat"></span>'; return b; }
    b.classList.add(red(c.s) ? 'kc-red' : 'kc-blk');
    if (c.r > 10) b.classList.add('kc-face');
    b.setAttribute('aria-label', cname(c));
    b.innerHTML = `<span class="kc-c"><b>${RK[c.r]}</b><i>${SU[c.s]}</i></span><span class="kc-big">${SU[c.s]}</span>`;
    return b;
  }
  function slotEl(label, cls = '') { const b = el('button', 'kc-slot ' + cls, label); b.type = 'button'; return b; }
  function btn(label, color, fn) { const b = el('button', 'btn ' + color, label); b.type = 'button'; b.onclick = fn; return b; }
  function oppBar(P) {
    const o = el('div', 'kc-opp');
    const face = el('span', 'tile c-rose kc-who', P.f);
    const info = el('div', 'kc-oinfo');
    o.append(face, info);
    return { o, face, info };
  }
  function fitCw(W, n, g, lo, hi) { return Math.max(lo, Math.min(hi, Math.floor((W - (n - 1) * g) / n))); }

  R.css(`
.kc-card{position:relative; flex:none; width:var(--cw); height:calc(var(--cw) * 1.4); padding:0; border:0; cursor:pointer;
  border-radius:calc(var(--cw) * .14); font-family:var(--display); color:var(--ink); -webkit-tap-highlight-color:transparent;
  background:linear-gradient(160deg, #fff 0%, #FFF9EF 55%, #F2E6CE 100%);
  box-shadow:inset 0 -3px 0 rgba(0,0,0,.07), inset 0 2px 0 #fff, 0 3px 0 #C6AF86, 0 6px 10px rgba(0,0,0,.3);
  transition:transform .16s, box-shadow .16s, filter .2s}
.kc-red{color:#D3203A} .kc-blk{color:#1B2530}
.kc-c{position:absolute; left:7%; top:3%; display:flex; align-items:baseline; gap:1px; line-height:1; font-weight:700; pointer-events:none}
.kc-c b{font-size:max(20px, calc(var(--cw) * .44)); letter-spacing:-.05em}
.kc-c i{font-style:normal; font-size:max(14px, calc(var(--cw) * .32))}
.kc-big{position:absolute; left:0; right:0; bottom:8%; text-align:center; line-height:1; font-size:calc(var(--cw) * .6); pointer-events:none}
.kc-face .kc-big{left:18%; right:18%; bottom:9%; padding:5% 0; border-radius:calc(var(--cw) * .12);
  background:linear-gradient(180deg, #FFE7A0, #F6C64F); box-shadow:inset 0 -3px 0 rgba(0,0,0,.12); font-size:calc(var(--cw) * .44)}
.kc-back{background:
  radial-gradient(circle at 50% 50%, rgba(255,255,255,.95) 0 11%, transparent 12%),
  radial-gradient(circle at 50% 50%, transparent 0 20%, rgba(255,255,255,.35) 21% 25%, transparent 26%),
  repeating-linear-gradient(45deg, rgba(255,255,255,.2) 0 3px, transparent 3px 9px),
  repeating-linear-gradient(-45deg, rgba(255,255,255,.2) 0 3px, transparent 3px 9px),
  linear-gradient(160deg, #FF94AC, #DD4877);
  box-shadow:inset 0 0 0 calc(var(--cw) * .06) #FFF9EF, inset 0 0 0 calc(var(--cw) * .09) #B83A62, 0 3px 0 #8F2C4B, 0 6px 10px rgba(0,0,0,.3)}
.kc-sel{transform:translateY(-7px); box-shadow:0 0 0 4px #FFD84A, 0 0 0 7px rgba(0,0,0,.25), 0 10px 16px rgba(0,0,0,.35); z-index:5}
.kc-tgt{animation:kc-glow 1s ease-in-out infinite}
.kc-hint{animation:kc-hglow .9s ease-in-out infinite; z-index:6}
@keyframes kc-glow{0%,100%{box-shadow:0 0 0 3px #fff, 0 0 0 8px rgba(255,255,255,.35)}50%{box-shadow:0 0 0 5px #fff, 0 0 0 14px rgba(255,255,255,.12)}}
@keyframes kc-hglow{0%,100%{box-shadow:0 0 0 4px #FFD84A, 0 0 0 9px rgba(255,216,74,.4)}50%{box-shadow:0 0 0 6px #FFD84A, 0 0 0 16px rgba(255,216,74,.1)}}
.kc-slot{flex:none; width:var(--cw); height:calc(var(--cw) * 1.4); padding:0; cursor:pointer; display:grid; place-items:center;
  border-radius:calc(var(--cw) * .14); border:3px dashed rgba(255,255,255,.45); background:rgba(0,0,0,.16);
  color:rgba(255,255,255,.7); font:700 max(20px, calc(var(--cw) * .48))/1 var(--display)}
.kc-slot.kc-sred{color:rgba(255,170,180,.9)}
.kc-in{animation:kc-in .3s cubic-bezier(.3,1.5,.5,1) backwards}
@keyframes kc-in{0%{transform:translateY(-14px) scale(.8); opacity:.4}100%{transform:none; opacity:1}}
.kc-flip{animation:kc-flip .4s ease-out backwards}
@keyframes kc-flip{0%{transform:rotateY(90deg)}100%{transform:rotateY(0)}}
.kc-gone{animation:kc-gone .35s ease-in forwards; pointer-events:none}
@keyframes kc-gone{to{transform:translateY(-30px) scale(.4); opacity:0}}
.kc-n{position:absolute; right:-6px; bottom:-8px; min-width:30px; padding:2px 6px; border-radius:999px; background:#18242C; color:#fff;
  font:700 18px/1.2 var(--display); box-shadow:0 2px 0 rgba(0,0,0,.3); pointer-events:none}
.kc-bar{display:flex; flex-wrap:wrap; justify-content:center; gap:10px 12px; margin-top:16px}
.kc-bar .btn{min-width:104px; min-height:56px; font-size:1.1rem; padding:.5em .9em}
.kc-bar .btn:disabled{opacity:.45; cursor:default}
.kc-note{text-align:center; margin:10px 0 0; font:600 1.05rem/1.3 var(--display); color:var(--on-table-soft)}
.kc-opp{display:flex; align-items:center; gap:12px; background:rgba(0,0,0,.18); border-radius:22px; padding:8px 12px; max-width:640px; margin:0 auto}
.kc-who{width:60px; height:60px; font-size:36px; flex:none; border-radius:22%}
.kc-who.kc-talk{animation:pop .5s}
.kc-oinfo{flex:1; min-width:0; display:flex; flex-wrap:wrap; align-items:center; gap:4px 12px}
.kc-oname{font:700 1.3rem/1.1 var(--display)}
.kc-ocount{font:600 1.05rem var(--display); color:var(--on-table-soft)}
.kc-backs{display:flex; --cw:30px; padding-top:2px}
.kc-backs .kc-card{margin-left:-18px; cursor:default; box-shadow:inset 0 0 0 2px #FFF9EF, inset 0 0 0 3px #B83A62, 0 2px 0 #8F2C4B}
.kc-backs .kc-card:first-child{margin-left:0}
.kc-row{display:flex; justify-content:center}
.kc-hand{display:flex; flex-direction:column; align-items:center; gap:12px; margin-top:16px}
.kc-hand .kc-row .kc-card{margin-left:calc(var(--cw) * -.36)}
.kc-hand .kc-row .kc-card:first-child{margin-left:0}
.kc-hand .kc-card.kc-ok{transform:translateY(-6px); box-shadow:0 0 0 3px #fff, 0 9px 14px rgba(0,0,0,.35)}
.kc-hand .kc-card.kc-no{filter:brightness(.8) saturate(.8)}
.kc-label{font:700 1.15rem var(--display); color:var(--on-table); margin:14px 0 0; text-align:center}

/* ---- Solitaire (so-) ---- */
.so-board{width:max-content; margin:0 auto}
.so-row{display:grid; grid-template-columns:repeat(7, var(--cw)); gap:var(--g); justify-content:center}
.so-cols{margin-top:14px}
.so-col{position:relative; cursor:pointer}
.so-col > *{position:absolute; left:0}
.so-col .kc-sel{transform:none}

/* ---- Pyramid (py-) ---- */
.py-pyr{position:relative; margin:0 auto}
.py-pyr .kc-card{position:absolute}
.py-pyr .kc-card.py-cov{filter:brightness(.78) saturate(.85); cursor:default}
.py-low{display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:14px 22px; margin-top:16px}
.py-pile{display:flex; gap:14px}
.py-bar{margin-top:0}
.py-low .kc-card, .py-low .kc-slot{position:relative}

/* ---- Higher or Lower (hl-) ---- */
.hl-rows{display:flex; flex-direction:column; align-items:center; gap:18px}
.hl-row{display:flex; gap:var(--g); justify-content:center}
.hl-row .kc-card{cursor:default}
.hl-cur{box-shadow:0 0 0 4px #FFD84A, 0 0 0 8px rgba(0,0,0,.2), 0 10px 16px rgba(0,0,0,.35); transform:translateY(-6px)}
.hl-bad{box-shadow:0 0 0 4px #A9C6FF, 0 6px 10px rgba(0,0,0,.3)}
.hl-btns .btn{min-width:150px; min-height:68px; font-size:1.35rem}

/* ---- Go Fish (gf-) ---- */
.gf-mid{display:flex; justify-content:center; align-items:center; gap:18px; margin-top:16px; min-height:calc(var(--cw) * 1.4 + 10px)}
.gf-mid .kc-card{position:relative}
.gf-grps{display:flex; flex-wrap:wrap; justify-content:center; gap:12px 10px; margin-top:8px}
.gf-grp{position:relative; border:0; padding:0; background:none; cursor:pointer; height:calc(var(--cw) * 1.4); border-radius:12px; transition:transform .16s}
.gf-grp .kc-card{position:absolute; top:0}
.gf-grp.gf-asked{transform:translateY(-8px)}
.gf-grp.gf-asked .kc-card{box-shadow:0 0 0 4px #FFD84A, 0 8px 14px rgba(0,0,0,.35)}
.gf-books{display:flex; flex-wrap:wrap; gap:6px; align-items:center}
.gf-book{display:inline-grid; place-items:center; min-width:38px; height:42px; padding:0 6px; border-radius:10px; background:var(--card); color:var(--ink);
  font:700 20px/1 var(--display); box-shadow:0 3px 0 var(--card-edge), 0 5px 8px rgba(0,0,0,.25)}
.gf-book.kc-in{animation:bounceIn .5s}
.gf-you{display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:6px 12px; margin-top:12px; font:700 1.15rem var(--display)}

/* ---- Crazy Eights (ce-) ---- */
.ce-mid{display:flex; justify-content:center; align-items:center; gap:16px; margin-top:16px}
.ce-mid .kc-card{position:relative}
.ce-suit{display:flex; flex-direction:column; align-items:center; gap:2px; padding:8px 12px; border-radius:18px; background:var(--card); color:var(--ink);
  box-shadow:0 4px 0 var(--card-edge), 0 8px 12px rgba(0,0,0,.25); font:600 1rem/1.1 var(--display); min-width:84px}
.ce-suit b{font-size:2.2rem; line-height:1}
.ce-suit.ce-r b{color:#D3203A}
.ce-pick{display:grid; grid-template-columns:repeat(4, minmax(64px, 110px)); gap:10px; justify-content:center; margin-top:16px}
.ce-pick .btn{flex-direction:column; gap:0; min-height:88px; padding:.4em .2em; font-size:1rem}
.ce-pick .btn b{font-size:2.4rem; line-height:1}
.ce-pick .ce-r b{color:#D3203A}
`);

  register({ id: 'solitaire', cat: 'cards', order: 1, name: 'Solitaire', icon: '🃏', desc: 'Build each suit up from Ace to King', gentle: true, start: startSolitaire });
  register({ id: 'pyramid', cat: 'cards', order: 2, name: 'Pyramid Patience', icon: '🔺', desc: 'Clear the pyramid in pairs that make 13', gentle: true, start: startPyramid });
  register({ id: 'higherlower', cat: 'cards', order: 3, name: 'Higher or Lower', icon: '↕️', desc: 'Guess if the next card is higher or lower', gentle: true, start: startHiLo });
  register({ id: 'gofish', cat: 'cards', order: 4, name: 'Go Fish', icon: '🎣', desc: 'Collect sets of four with a friendly player', gentle: true, start: startGoFish });
  register({ id: 'eights', cat: 'cards', order: 5, name: 'Crazy Eights', icon: '🎱', desc: 'Match the suit or number. Eights are wild!', start: startEights });

  /* =========================================================
     SOLITAIRE (Klondike, draw 1)
     ========================================================= */
  const FACEUP = [0, 2, 5, 9, 14, 20, 27]; // deal positions that land face up
  function klondikeFromOrder(d) {
    const t = []; let k = 0;
    for (let i = 0; i < 7; i++) { t.push([]); for (let j = 0; j <= i; j++) t[i].push({ r: d[k].r, s: d[k++].s, up: j === i }); }
    return { t, stock: d.slice(k).map(c => ({ r: c.r, s: c.s, up: false })), waste: [], f: [[], [], [], []] };
  }
  function kState(st) {
    return { cols: st.t.map(c => c.map(cid)), down: st.t.map(c => c.filter(x => !x.up).length), f: st.f.map(p => p.length),
      talon: st.stock.concat(st.waste).map(cid).sort((a, b) => a - b) };
  }
  /* Solver. The stock and waste are treated as one pool where any card can be reached, which is exactly
     true for draw-1 with unlimited turns of the pile. Once every tableau card is face up the game is
     always winnable (the lowest missing card is always on top of something), so that counts as solved. */
  function kMoves(s) {
    const { cols, down, f, talon } = s;
    const fOK = id => f[SUT(id)] === RNK(id) - 1;
    const safe = id => { const r = RNK(id); if (r <= 2) return true; const rd = RED(id); for (let q = 0; q < 4; q++) if (red(q) !== rd && f[q] < r - 1) return false; return true; };
    for (let i = 0; i < 7; i++) { const c = cols[i]; if (c.length) { const id = c[c.length - 1]; if (fOK(id) && safe(id)) return [{ k: 'tf', i, id }]; } }
    for (let j = 0; j < talon.length; j++) { const id = talon[j]; if (fOK(id) && safe(id)) return [{ k: 'lf', id }]; }
    const fits = (id, to) => { const tc = cols[to]; if (!tc.length) return RNK(id) === 13; const t = tc[tc.length - 1]; return RNK(t) === RNK(id) + 1 && RED(t) !== RED(id); };
    const firstEmpty = cols.findIndex(c => !c.length);
    const rev = [], tf = [], lf = [], lt = [], other = [];
    for (let i = 0; i < 7; i++) {
      const c = cols[i]; if (!c.length) continue;
      const top = c[c.length - 1];
      if (fOK(top)) (down[i] > 0 && c.length - 1 === down[i] ? rev : tf).push({ k: 'tf', i, id: top, w: down[i] + 1 });
      const s0 = down[i], head = c[s0];
      for (let to = 0; to < 7; to++) {
        if (to === i || (!cols[to].length && to !== firstEmpty)) continue;
        if (!fits(head, to)) continue;
        if (s0 > 0) rev.push({ k: 'tt', i, n: c.length - s0, to, w: down[i] });
        else if (RNK(head) !== 13) other.push({ k: 'tt', i, n: c.length, to, w: -1 });
      }
      for (let j = s0 + 1; j < c.length; j++) { // split a run so the card underneath can go up
        if (!fOK(c[j - 1])) continue;
        for (let to = 0; to < 7; to++) if (to !== i && cols[to].length && fits(c[j], to)) tf.push({ k: 'tt', i, n: c.length - j, to });
      }
    }
    const tried = new Set();
    for (let j = 0; j < talon.length; j++) {
      const id = talon[j];
      if (fOK(id)) lf.push({ k: 'lf', id });
      for (let to = 0; to < 7; to++) {
        if (!cols[to].length && to !== firstEmpty) continue;
        if (fits(id, to) && !tried.has(id + ':' + to)) { tried.add(id + ':' + to); lt.push({ k: 'lt', id, to }); }
      }
    }
    rev.sort((a, b) => b.w - a.w);
    return rev.concat(tf, lf, lt, other);
  }
  function kApply(s, m) {
    const cols = s.cols.slice(), down = s.down.slice(), f = s.f.slice(); let talon = s.talon;
    const fix = i => { if (!cols[i].length) down[i] = 0; else if (down[i] >= cols[i].length) down[i] = cols[i].length - 1; };
    if (m.k === 'tf') { cols[m.i] = cols[m.i].slice(0, -1); f[SUT(m.id)]++; fix(m.i); }
    else if (m.k === 'lf' || m.k === 'lt') {
      talon = talon.filter(x => x !== m.id);
      if (m.k === 'lf') f[SUT(m.id)]++; else cols[m.to] = cols[m.to].concat(m.id);
    } else { const c = cols[m.i]; cols[m.to] = cols[m.to].concat(c.slice(c.length - m.n)); cols[m.i] = c.slice(0, c.length - m.n); fix(m.i); }
    return { cols, down, f, talon };
  }
  function kSolve(s0, budget) {
    const seen = new Set(), path = []; let nodes = 0;
    const key = s => s.f.join('.') + '|' + s.talon.join(',') + '|' + s.cols.map((c, i) => s.down[i] + ':' + c.join(',')).sort().join('/');
    function dfs(s) {
      if (s.down.every(x => x === 0)) return true;
      if (++nodes > budget) return false;
      const k = key(s); if (seen.has(k)) return false; seen.add(k);
      for (const m of kMoves(s)) {
        path.push(m);
        if (dfs(kApply(s, m))) return true;
        path.pop();
        if (nodes > budget) return false;
      }
      return false;
    }
    const ok = dfs(s0);
    return { ok, nodes, path };
  }
  function sweeten(d, n) { // quietly lift a few low cards into face-up spots, for the easiest levels
    for (let q = 0; q < n; q++) {
      const lows = []; for (let i = 0; i < 28; i++) if (!FACEUP.includes(i) && d[i].r <= 2 + (q > 1 ? 1 : 0)) lows.push(i);
      const ups = FACEUP.filter(i => d[i].r > 4);
      if (!lows.length || !ups.length) break;
      const a = pick(lows), b = pick(ups); [d[a], d[b]] = [d[b], d[a]];
    }
    return d;
  }
  function pickKlondike(L) {
    const t = Math.min(1, (L - 1) / 12), want = L <= 2 ? 10 : L < 7 ? 6 : 4;
    const sols = [], t0 = Date.now(); let tries = 0;
    while (sols.length < want && (tries < 80 || !sols.length)) {
      tries++;
      const d = sweeten(shuffle(newDeck()), Math.max(0, 5 - L));
      const r = kSolve(kState(klondikeFromOrder(d)), 12000);
      if (r.ok) sols.push({ d, score: (r.nodes - r.path.length) * 2 + r.path.length + r.path.filter(m => m.k === 'lt').length * 3 });
      if (Date.now() - t0 > 1400 && sols.length) break;
    }
    sols.sort((a, b) => a.score - b.score);
    const idx = L >= 13 ? randInt(sols.length) : Math.max(0, Math.min(sols.length - 1, Math.round(t * (sols.length - 1) + (L > 1 ? Math.random() - .5 : 0))));
    return klondikeFromOrder(sols[idx].d);
  }

  function startSolitaire(L, api) {
    const W = api.stage.clientWidth || 340, g = W < 520 ? 5 : 9;
    const cw = fitCw(W, 7, g, 40, 62), ch = Math.round(cw * 1.4), colH = Math.round(ch * 4.8);
    let st = pickKlondike(L), hist = [], sel = null, hints = 0, undos = 0, finished = false, busy = false, mark = null;
    let fresh = new Set(), flipped = new Set();
    const board = el('div', 'so-board'); board.style.setProperty('--cw', cw + 'px'); board.style.setProperty('--g', g + 'px');
    const top = el('div', 'so-row'), cols = el('div', 'so-row so-cols');
    board.append(top, cols);
    const bar = el('div', 'kc-bar');
    const undoB = btn('↶ Undo', 'c-card', () => { if (busy || !hist.length) return; sfx.tap(); st = JSON.parse(hist.pop()); undos++; sel = null; mark = null; say(); render(); });
    const hintB = btn('💡 Hint', 'c-sun', () => { if (busy || finished) return; sfx.tap(); hints++; showHint(); });
    const finB = btn('✓ Finish for me', 'c-leaf', () => { if (busy || finished) return; sfx.good(); autoFinish(); });
    bar.append(undoB, hintB, finB);
    api.stage.append(board, bar);
    const say = () => api.hint('Build each suit from Ace up to King. Tap a card, then tap where it goes. Tap the deck for a new card.');
    say();

    const dk = d => d.kind + (d.i === undefined ? '' : d.i);
    const allUp = () => st.t.every(c => c.every(x => x.up));
    function cardsOf(src) { return src.kind === 'w' ? st.waste.slice(-1) : src.kind === 'f' ? st.f[src.i].slice(-1) : st.t[src.i].slice(src.k); }
    function legal(src, dst) {
      const cs = cardsOf(src), c = cs[0]; if (!c) return false;
      if (dst.kind === 'f') return cs.length === 1 && src.kind !== 'f' && dst.i === c.s && st.f[c.s].length === c.r - 1;
      if (src.kind === 't' && src.i === dst.i) return false;
      const col = st.t[dst.i]; if (!col.length) return c.r === 13;
      const t = last(col); return t.up && t.r === c.r + 1 && red(t.s) !== red(c.s);
    }
    function targets(src) {
      const out = []; for (let i = 0; i < 4; i++) if (legal(src, { kind: 'f', i })) out.push({ kind: 'f', i });
      for (let i = 0; i < 7; i++) if (legal(src, { kind: 't', i })) out.push({ kind: 't', i });
      return out;
    }
    function bestDst(src) {
      const ts = targets(src);
      const f = ts.find(d => d.kind === 'f'); if (f) return f;
      const t = ts.find(d => st.t[d.i].length); if (t) return t;
      const e = ts.find(d => !st.t[d.i].length);
      if (e && !(src.kind === 't' && src.k === 0)) return e;
      return null;
    }
    const save = () => hist.push(JSON.stringify(st));
    function doMove(src, dst) {
      save();
      const cs = src.kind === 'w' ? [st.waste.pop()] : src.kind === 'f' ? [st.f[src.i].pop()] : st.t[src.i].splice(src.k);
      if (dst.kind === 'f') st.f[dst.i].push(cs[0]); else st.t[dst.i].push(...cs);
      cs.forEach(c => fresh.add(c));
      if (src.kind === 't') { const col = st.t[src.i]; if (col.length && !last(col).up) { last(col).up = true; flipped.add(last(col)); tone(700, .12, 'triangle', .09, .08); } }
      sel = null; mark = null;
      if (dst.kind === 'f') tone(392 * Math.pow(2, (cs[0].r - 1) / 12), .16, 'sine', .13); else tone(480, .08, 'triangle', .09);
      render();
      if (st.f.every(p => p.length === 13)) win();
      else if (!busy && allUp() && dst.kind !== 'f' && !finB.dataset.said) { finB.dataset.said = '1'; api.hint('Every card is face up! Tap ✓ Finish for me, or carry on yourself.'); }
    }
    function draw() {
      if (busy || finished) return;
      sel = null; mark = null;
      if (st.stock.length) { save(); const c = st.stock.pop(); c.up = true; st.waste.push(c); fresh.add(c); tone(520, .07, 'triangle', .08); }
      else if (st.waste.length) { save(); st.stock = st.waste.reverse().map(c => (c.up = false, c)); st.waste = []; tone(330, .12, 'sine', .08); api.hint('The pile is turned back over. Tap it again for a card.'); }
      else { sfx.soft(); api.hint('The deck is empty. Move cards on the table instead.'); }
      render();
    }
    function auto(src) {
      const d = bestDst(src);
      if (d) { doMove(src, d); return; }
      sfx.soft(); sel = null; api.hint('That card has nowhere to go just now. Try another card, or tap 💡 Hint.'); render();
    }
    function select(src) { sel = src; mark = null; sfx.tap(); api.hint('Now tap a glowing place, or tap the card again to send it to the best spot.'); render(); }
    function tapSrc(src, alsoDst) {
      if (busy || finished) return;
      if (sel && dk(sel) === dk(src) && (src.kind !== 't' || sel.k === src.k)) { auto(sel); return; }
      if (sel && alsoDst && legal(sel, alsoDst)) { doMove(sel, alsoDst); return; }
      const c = cardsOf(src)[0];
      if (!c) { if (sel) { sfx.soft(); sel = null; render(); } return; }
      if (src.kind === 't' && !c.up) { sfx.soft(); sel = null; api.hint('That card is face down. It turns over when the cards on top of it move away.'); render(); return; }
      select(src);
    }
    function tapCol(i, k) {
      if (busy || finished) return;
      if (k < 0) { if (sel && legal(sel, { kind: 't', i })) doMove(sel, { kind: 't', i }); else if (sel) { sfx.soft(); sel = null; api.hint('That card can\'t go there. Only a King can go in an empty space.'); render(); } return; }
      tapSrc({ kind: 't', i, k }, { kind: 't', i });
    }
    function tapF(i) {
      if (busy || finished) return;
      if (sel && sel.kind !== 'f' && !legal(sel, { kind: 'f', i })) { sfx.soft(); api.hint('That pile needs ' + (st.f[i].length < 13 ? AN(st.f[i].length + 1) + ' of ' + SUN[i] : 'nothing more') + ' next.'); sel = null; render(); return; }
      tapSrc({ kind: 'f', i }, { kind: 'f', i });
    }
    function solverMove() {
      const r = kSolve(kState(st), 25000);
      if (!r.ok) return null;
      if (!r.path.length) return { finish: true };
      const m = r.path[0];
      if (m.k === 'tf') return { src: { kind: 't', i: m.i, k: st.t[m.i].length - 1 }, dst: { kind: 'f', i: SUT(m.id) } };
      if (m.k === 'tt') return { src: { kind: 't', i: m.i, k: st.t[m.i].length - m.n }, dst: { kind: 't', i: m.to } };
      const w = last(st.waste);
      if (w && cid(w) === m.id) return { src: { kind: 'w' }, dst: m.k === 'lf' ? { kind: 'f', i: SUT(m.id) } : { kind: 't', i: m.to } };
      return { draw: true };
    }
    function showHint() {
      sel = null;
      const m = solverMove();
      if (!m) {
        let back = 0;
        for (let b = hist.length - 1; b >= Math.max(0, hist.length - 12); b--) { back++; if (kSolve(kState(JSON.parse(hist[b])), 6000).ok) break; }
        mark = null; api.hint(back ? `This way looks stuck. Tap ↶ Undo ${back === 1 ? 'once' : back + ' times'} and try a different way.` : 'This way looks stuck. Tap ↶ Undo to go back.');
      } else if (m.finish) { mark = { fin: true }; api.hint('Every card is face up. Tap ✓ Finish for me!'); }
      else if (m.draw) { mark = { stock: true }; api.hint(st.stock.length ? 'Tap the deck to turn over a new card.' : 'Tap the empty deck space to turn the pile back over.'); }
      else {
        mark = m; const c = cardsOf(m.src)[0];
        const where = m.dst.kind === 'f' ? 'up to its pile at the top' : st.t[m.dst.i].length ? 'onto the ' + cshort(last(st.t[m.dst.i])) : 'into the empty space';
        api.hint(`Move the ${cshort(c)} ${where}.`);
      }
      render();
    }
    function autoFinish() {
      busy = true; sel = null; mark = null; api.hint('Here we go, tidying everything away…');
      (function step() {
        if (!api.stage.isConnected || finished) return;
        if (st.f.every(p => p.length === 13)) return;
        for (let i = 0; i < 7; i++) { const c = last(st.t[i]); if (c && st.f[c.s].length === c.r - 1) { doMove({ kind: 't', i, k: st.t[i].length - 1 }, { kind: 'f', i: c.s }); return api.later(step, 170); } }
        const w = last(st.waste);
        if (w && st.f[w.s].length === w.r - 1) { doMove({ kind: 'w' }, { kind: 'f', i: w.s }); return api.later(step, 170); }
        busy = false; draw(); busy = true; api.later(step, 110);
      })();
    }
    function win() {
      finished = true; busy = true; sel = null; mark = null; render();
      api.hint('All four piles are complete. ' + cheer() + '!');
      sfx.good(); [0, 1, 2, 3].forEach(i => tone(523 * Math.pow(2, i * 4 / 12), .2, 'sine', .12, i * .1));
      board.querySelectorAll('.so-row:first-child .kc-card').forEach(e => wob(e));
      api.done(starsFor(hints + Math.ceil(undos / 3), 2, 6));
    }
    function render() {
      top.innerHTML = ''; cols.innerHTML = '';
      const tg = new Set(sel ? targets(sel).map(dk) : []);
      const decorate = (e, d) => { if (tg.has(dk(d))) e.classList.add('kc-tgt'); if (mark && mark.dst && dk(mark.dst) === dk(d)) e.classList.add('kc-hint'); };
      const anim = (e, c) => { if (flipped.has(c)) e.classList.add('kc-flip'); else if (fresh.has(c)) e.classList.add('kc-in'); };
      const sk = st.stock.length ? cardEl(null, false) : slotEl(st.waste.length ? '↻' : '');
      if (st.stock.length) sk.append(el('em', 'kc-n', String(st.stock.length)));
      sk.setAttribute('aria-label', 'Deck'); if (mark && mark.stock) sk.classList.add('kc-hint');
      sk.onclick = draw;
      const w = last(st.waste); let we;
      if (w) { we = cardEl(w, true, sel && sel.kind === 'w' ? 'kc-sel' : ''); anim(we, w); if (mark && mark.src && mark.src.kind === 'w') we.classList.add('kc-hint'); we.onclick = () => tapSrc({ kind: 'w' }); }
      else { we = slotEl(''); we.style.opacity = '.5'; }
      top.append(sk, we, el('span'));
      for (let i = 0; i < 4; i++) {
        const p = st.f[i], c = last(p);
        const e = c ? cardEl(c, true, sel && sel.kind === 'f' && sel.i === i ? 'kc-sel' : '') : slotEl(SU[i], red(i) ? 'kc-sred' : '');
        if (c) anim(e, c);
        decorate(e, { kind: 'f', i }); e.onclick = () => tapF(i); top.append(e);
      }
      st.t.forEach((col, i) => {
        const ce = el('div', 'so-col'); ce.style.height = colH + 'px'; ce.onclick = () => tapCol(i, -1);
        const nd = col.filter(c => !c.up).length, nu = col.length - nd;
        let dd = ch * .16, du = ch * .36;
        const need = nd * dd + Math.max(0, nu - 1) * du, room = colH - ch;
        if (need > room) { const k = room / need; dd *= Math.max(.5, k); du = nu > 1 ? Math.max(ch * .22, (room - nd * dd) / (nu - 1)) : du; }
        if (!col.length) { const sl = slotEl('K'); sl.style.opacity = '.75'; decorate(sl, { kind: 't', i }); sl.onclick = ev => { ev.stopPropagation(); tapCol(i, -1); }; ce.append(sl); }
        let y = 0;
        col.forEach((c, k) => {
          const e = cardEl(c, c.up); e.style.top = Math.round(y) + 'px';
          if (sel && sel.kind === 't' && sel.i === i && k >= sel.k) e.classList.add('kc-sel');
          if (mark && mark.src && mark.src.kind === 't' && mark.src.i === i && k >= mark.src.k) e.classList.add('kc-hint');
          if (k === col.length - 1) decorate(e, { kind: 't', i });
          anim(e, c);
          e.onclick = ev => { ev.stopPropagation(); tapCol(i, k); };
          ce.append(e); y += c.up ? du : dd;
        });
        cols.append(ce);
      });
      fresh = new Set(); flipped = new Set();
      undoB.disabled = !hist.length || finished;
      finB.hidden = !(allUp() && !finished);
      if (mark && mark.fin) finB.classList.add('kc-hint'); else finB.classList.remove('kc-hint');
    }
    render();
    if (TEST) window.__kcSol = {
      st: () => st,
      bot() { if (finished) return 'won'; if (busy) return 'busy'; const m = solverMove(); if (!m) return 'stuck'; if (m.finish) { finB.click(); return 'finish'; } if (m.draw) { draw(); return 'draw'; } doMove(m.src, m.dst); return 'move'; }
    };
  }

  /* =========================================================
     PYRAMID PATIENCE
     ========================================================= */
  const PROW = [], PCH = [];
  for (let r = 0, i = 0; r < 7; r++) for (let c = 0; c <= r; c++, i++) { PROW[i] = [r, c]; PCH[i] = r < 6 ? [i + r + 1, i + r + 2] : null; }
  const PFULL = (1 << 28) - 1;
  const pFree = (i, pm) => !PCH[i] || (((pm >> PCH[i][0]) & 1) && ((pm >> PCH[i][1]) & 1));
  function pMoves(pr, tr, pm, tm) {
    const free = []; for (let i = 0; i < 28; i++) if (!((pm >> i) & 1) && pFree(i, pm)) free.push(i);
    for (const i of free) if (pr[i] === 13) return [{ a: i }];
    const out = [];
    for (let x = 0; x < free.length; x++) for (let y = x + 1; y < free.length; y++) if (pr[free[x]] + pr[free[y]] === 13) out.push({ a: free[x], b: free[y] });
    for (const i of free) { const need = 13 - pr[i]; for (let k = 0; k < tr.length; k++) if (!((tm >> k) & 1) && tr[k] === need) { out.push({ a: i, t: k }); break; } }
    return out;
  }
  function pApply(pm, tm, m) { pm |= 1 << m.a; if (m.b !== undefined) pm |= 1 << m.b; if (m.t !== undefined) tm |= 1 << m.t; return [pm, tm]; }
  function pSolve(pr, tr, pm0, tm0, budget) {
    const seen = new Set(), path = []; let nodes = 0;
    function dfs(pm, tm) {
      if (pm === PFULL) return true;
      if (++nodes > budget) return false;
      const k = pm * 16777216 + tm; if (seen.has(k)) return false; seen.add(k);
      for (const m of pMoves(pr, tr, pm, tm)) { path.push(m); const [a, b] = pApply(pm, tm, m); if (dfs(a, b)) return true; path.pop(); if (nodes > budget) return false; }
      return false;
    }
    return { ok: dfs(pm0, tm0), nodes, path };
  }
  function pPlayouts(pr, tr, n) {
    let wins = 0;
    for (let q = 0; q < n; q++) { let pm = 0, tm = 0, ms; while ((ms = pMoves(pr, tr, pm, tm)).length) [pm, tm] = pApply(pm, tm, pick(ms)); if (pm === PFULL) wins++; }
    return wins / n;
  }
  function pickPyramid(L) {
    const t = Math.min(1, (L - 1) / 12), want = L <= 2 ? 10 : 6, sols = [], t0 = Date.now(); let tries = 0;
    while (sols.length < want && (tries < 150 || !sols.length)) {
      tries++;
      const d = shuffle(newDeck()), pr = d.slice(0, 28).map(c => c.r), tr = d.slice(28).map(c => c.r);
      if (pSolve(pr, tr, 0, 0, 15000).ok) sols.push({ d, rate: pPlayouts(pr, tr, 30) });
      if (Date.now() - t0 > 1200 && sols.length) break;
    }
    sols.sort((a, b) => b.rate - a.rate);
    const idx = L >= 13 ? randInt(sols.length) : Math.max(0, Math.min(sols.length - 1, Math.round(t * (sols.length - 1) + (L > 1 ? Math.random() - .5 : 0))));
    return sols[idx].d;
  }

  function startPyramid(L, api) {
    const W = api.stage.clientWidth || 340, g = W < 520 ? 4 : 8;
    const cw = fitCw(W, 7, g, 40, 64), ch = Math.round(cw * 1.4), dy = Math.round(ch * .5);
    const d = pickPyramid(L);
    const pyr = d.slice(0, 28).map(c => ({ r: c.r, s: c.s }));
    const talon = d.slice(28).map((c, k) => ({ r: c.r, s: c.s, ti: k }));
    const pr = pyr.map(c => c.r), tr = talon.map(c => c.r);
    let st = { rem: Array(28).fill(false), stock: talon.slice().reverse(), waste: [], used: 0 };
    let hist = [], sel = null, hints = 0, undos = 0, wrong = 0, finished = false, mark = null, combo = 0, fresh = new Set();
    const wrap = el('div'); wrap.style.setProperty('--cw', cw + 'px');
    const pyrE = el('div', 'py-pyr'); pyrE.style.width = (7 * cw + 6 * g) + 'px'; pyrE.style.height = (6 * dy + ch) + 'px';
    const low = el('div', 'py-low');
    const bar = el('div', 'kc-bar py-bar');
    const undoB = btn('↶ Undo', 'c-card', () => { if (finished || !hist.length) return; sfx.tap(); st = JSON.parse(hist.pop()); undos++; sel = null; mark = null; combo = 0; say(); render(); });
    const hintB = btn('💡 Hint', 'c-sun', () => { if (finished) return; sfx.tap(); hints++; showHint(); });
    bar.append(undoB, hintB);
    const pile = el('div', 'py-pile'); low.append(pile, bar);
    wrap.append(pyrE, low, el('p', 'kc-note', 'Jack = 11 · Queen = 12 · King = 13 (goes alone)'));
    api.stage.append(wrap);
    const say = () => api.hint('Tap two uncovered cards that add up to 13. A King goes on its own. Tap the pile for more cards.');
    say();

    const pm = () => st.rem.reduce((m, x, i) => x ? m | (1 << i) : m, 0);
    const free = i => !st.rem[i] && pFree(i, pm());
    const cardOf = src => src.kind === 'p' ? pyr[src.i] : last(st.waste);
    const same = (a, b) => a && b && a.kind === b.kind && a.i === b.i;
    const save = () => hist.push(JSON.stringify(st));
    function remove(src) {
      if (src.kind === 'p') st.rem[src.i] = true; else { const c = st.waste.pop(); st.used |= 1 << c.ti; }
    }
    function cleared() {
      combo++; [0, 1].forEach(k => tone(440 * Math.pow(2, (combo + k * 4) / 12), .14, 'sine', .12, k * .08));
      if (st.rem.every(Boolean)) { finished = true; sel = null; mark = null; render(); api.hint('The whole pyramid is cleared. ' + cheer() + '!'); sfx.good(); api.done(starsFor(hints + wrong + Math.floor(undos / 2), 2, 6)); return true; }
      return false;
    }
    function tap(src) {
      if (finished) return;
      if (src.kind === 'p' && !free(src.i)) { sfx.soft(); api.hint('That card is still covered. Clear the two cards below it first.'); return; }
      const c = cardOf(src); if (!c) return;
      mark = null;
      if (c.r === 13) { save(); remove(src); sel = null; api.hint('A King goes on its own. ' + cheer() + '!'); if (!cleared()) render(); return; }
      if (!sel) { sel = src; sfx.tap(); api.hint(`Now tap ${AN(13 - c.r)} to go with the ${RN[c.r]}.`); render(); return; }
      if (same(sel, src)) { sel = null; say(); render(); return; }
      const a = cardOf(sel);
      if (a.r + c.r === 13) { save(); const s1 = sel; sel = null; if (s1.kind === 'w') { remove(s1); remove(src); } else { remove(src); remove(s1); } api.hint(`${a.r} and ${c.r} make 13. ${cheer()}!`); if (!cleared()) render(); return; }
      sfx.soft(); wrong++; combo = 0;
      api.hint(`${a.r} and ${c.r} make ${a.r + c.r}, not 13. Now tap ${AN(13 - c.r)} to go with the ${RN[c.r]}.`);
      sel = src; render();
    }
    function draw() {
      if (finished) return;
      sel = null; mark = null; combo = 0;
      if (st.stock.length) { save(); const c = st.stock.pop(); st.waste.push(c); fresh.add(c.ti); tone(520, .07, 'triangle', .08); say(); }
      else if (st.waste.length) { save(); st.stock = st.waste.reverse(); st.waste = []; tone(330, .12, 'sine', .08); api.hint('The pile is turned back over. Tap it for a card.'); }
      else { sfx.soft(); api.hint('No cards left in the pile. Pair up the pyramid cards.'); }
      render();
    }
    function solverMove() {
      const r = pSolve(pr, tr, pm(), st.used, 30000);
      if (!r.ok || !r.path.length) return null;
      const m = r.path[0], w = last(st.waste);
      if (m.t === undefined) return { a: { kind: 'p', i: m.a }, b: m.b === undefined ? null : { kind: 'p', i: m.b } };
      if (w && w.r === tr[m.t]) return { a: { kind: 'p', i: m.a }, b: { kind: 'w' } };
      return { draw: true, need: tr[m.t] };
    }
    function showHint() {
      sel = null; const m = solverMove();
      if (!m) {
        let back = 0;
        for (let b = hist.length - 1; b >= Math.max(0, hist.length - 12); b--) { back++; const h = JSON.parse(hist[b]); const p = h.rem.reduce((q, x, i) => x ? q | (1 << i) : q, 0); if (pSolve(pr, tr, p, h.used, 8000).ok) break; }
        mark = null; api.hint(`This way looks stuck. Tap ↶ Undo ${back <= 1 ? 'once' : back + ' times'} and try a different pair.`);
      } else if (m.draw) { mark = { stock: true }; api.hint(`Tap the pile to turn over cards until ${AN(m.need)} shows.`); }
      else { mark = m; const a = cardOf(m.a); api.hint(m.b ? `Try the ${RN[a.r]} with the ${RN[cardOf(m.b).r]}.` : `The ${RN[a.r]} can go on its own.`); }
      render();
    }
    function render() {
      pyrE.innerHTML = ''; pile.innerHTML = '';
      const isMark = src => mark && (same(mark.a, src) || same(mark.b, src));
      pyr.forEach((c, i) => {
        if (st.rem[i]) return;
        const [r, k] = PROW[i];
        const e = cardEl(c, true, free(i) ? '' : 'py-cov');
        e.style.left = Math.round((6 - r) * (cw + g) / 2 + k * (cw + g)) + 'px'; e.style.top = (r * dy) + 'px';
        if (same(sel, { kind: 'p', i })) e.classList.add('kc-sel');
        if (isMark({ kind: 'p', i })) e.classList.add('kc-hint');
        e.onclick = () => tap({ kind: 'p', i });
        pyrE.append(e);
      });
      const sk = st.stock.length ? cardEl(null, false) : slotEl(st.waste.length ? '↻' : '');
      if (st.stock.length) sk.append(el('em', 'kc-n', String(st.stock.length)));
      if (mark && mark.stock) sk.classList.add('kc-hint');
      sk.setAttribute('aria-label', 'Pile'); sk.onclick = draw;
      const w = last(st.waste); let we;
      if (w) { we = cardEl(w, true, same(sel, { kind: 'w' }) ? 'kc-sel' : ''); if (fresh.has(w.ti)) we.classList.add('kc-in'); if (isMark({ kind: 'w' })) we.classList.add('kc-hint'); we.onclick = () => tap({ kind: 'w' }); }
      else { we = slotEl(''); we.style.opacity = '.5'; }
      pile.append(sk, we);
      fresh = new Set();
      undoB.disabled = !hist.length || finished;
    }
    render();
    if (TEST) window.__kcPyr = {
      bot() { if (finished) return 'won'; const m = solverMove(); if (!m) return 'stuck'; if (m.draw) { draw(); return 'draw'; } tap(m.a); if (m.b) tap(m.b); return 'move'; }
    };
  }

  /* =========================================================
     HIGHER OR LOWER
     ========================================================= */
  function startHiLo(L, api) {
    const n = Math.min(4 + Math.floor((L - 1) / 2), 8);
    const base = Math.max(.6, .95 - (L - 1) * .035);
    let tries = 1, help = 0, pos = 0, row = [], busy = false, finished = false, bad = -1;
    const W = api.stage.clientWidth || 340, g = W < 520 ? 8 : 12;
    const per = n <= 5 ? n : Math.ceil(n / 2);
    const cw = fitCw(W, per, g, 52, 96);
    const rows = el('div', 'hl-rows'); rows.style.setProperty('--cw', cw + 'px'); rows.style.setProperty('--g', g + 'px');
    const bar = el('div', 'kc-bar hl-btns');
    const hiB = btn('▲ Higher', 'c-leaf', () => guess(1)), loB = btn('▼ Lower', 'c-sky', () => guess(-1));
    bar.append(hiB, loB);
    const note = el('p', 'kc-note');
    api.stage.append(rows, bar, note);
    function makeRow() {
      row = []; const p = Math.min(.97, base + help * .12);
      const first = L <= 2 ? pick([1, 2, 3, 11, 12, 13]) : 1 + randInt(13);
      row.push({ r: first, s: randInt(4) });
      for (let k = 1; k < n; k++) {
        const prev = row[k - 1].r; let r;
        if (Math.random() < p) { const up = prev < 7 || (prev === 7 && Math.random() < .5); r = up ? prev + 1 + randInt(13 - prev) : 1 + randInt(prev - 1); }
        else do r = 1 + randInt(13); while (r === prev);
        let s = randInt(4); while (row.some(c => c.r === r && c.s === s)) s = randInt(4);
        row.push({ r, s });
      }
      pos = 0; bad = -1;
    }
    function render(flip) {
      rows.innerHTML = '';
      for (let start = 0; start < n; start += per) {
        const re = el('div', 'hl-row');
        for (let k = start; k < Math.min(n, start + per); k++) {
          const up = k <= pos || k === bad;
          const e = cardEl(row[k], up, k === pos && bad < 0 ? 'hl-cur' : k === bad ? 'hl-bad' : '', 'div');
          if (k === flip) e.classList.add('kc-flip');
          re.append(e);
        }
        rows.append(re);
      }
      note.textContent = `Try ${tries} · Ace is low, King is high`;
      hiB.disabled = loB.disabled = busy;
    }
    function ask() { api.hint(`Is the next card higher or lower than the ${RN[row[pos].r]}?`); }
    function guess(dir) {
      if (busy || finished) return;
      const a = row[pos].r, b = row[pos + 1].r, ok = (b > a) === (dir > 0);
      if (ok) {
        pos++; tone(392 * Math.pow(2, (pos * 2) / 12), .16, 'sine', .13);
        render(pos);
        if (pos === n - 1) {
          finished = true; busy = true; render(); sfx.good();
          api.hint(`${RN[b]}: ${dir > 0 ? 'higher' : 'lower'}! You reached the end of the row. ${cheer()}!`);
          api.done(starsFor(tries - 1, 0, 2)); return;
        }
        api.hint(`Yes, the ${RN[b]} is ${dir > 0 ? 'higher' : 'lower'}. ${pos === n - 2 ? 'One more to go!' : 'Next one?'}`);
        wob(rows.querySelector('.hl-cur'));
      } else {
        sfx.soft(); bad = pos + 1; busy = true; render(bad);
        api.hint(`That one was ${AN(b)}, which is ${b > a ? 'higher' : 'lower'}. No harm done, here comes a fresh row.`);
        api.later(() => { tries++; help++; makeRow(); busy = false; render(0); ask(); }, 2200);
      }
    }
    makeRow(); render(0); ask();
  }

  /* =========================================================
     GO FISH
     ========================================================= */
  function startGoFish(L, api) {
    const P = pick(PALS), He = P.p === 'she' ? 'She' : 'He';
    const W = api.stage.clientWidth || 340, cw = W < 520 ? 52 : 64, step = Math.round(cw * .44);
    const deck = shuffle(newDeck());
    let you = deck.splice(0, 7), cpu = deck.splice(0, 7), pond = deck;
    const booksYou = [], booksCpu = [], memory = new Set();
    const smart = L <= 2 ? 0 : Math.min(.8, .2 + (L - 3) * .1);
    const kind = [0, .4, .3, .15][L] || 0; // quiet help on the easiest levels
    let turn = 'you', asked = 0, over = false, freshBook = null, freshCards = new Set(), cpuAsk = 0;
    const root = el('div'); root.style.setProperty('--cw', cw + 'px');
    const { o, face, info } = oppBar(P);
    const mid = el('div', 'gf-mid'), youRow = el('div', 'gf-you'), grps = el('div', 'gf-grps');
    root.append(o, mid, youRow, grps);
    api.stage.append(root);
    const plural = (n, r) => n === 1 ? AN(r) : WORDS[n] + ' ' + RNP[r];
    function books(hand, list) {
      const cnt = {}; hand.forEach(c => cnt[c.r] = (cnt[c.r] || 0) + 1);
      const made = Object.keys(cnt).filter(r => cnt[r] === 4).map(Number);
      made.forEach(r => { list.push(r); freshBook = r; for (let i = hand.length - 1; i >= 0; i--) if (hand[i].r === r) hand.splice(i, 1); });
      return made;
    }
    function endCheck() {
      if (booksYou.length + booksCpu.length < 13) return false;
      over = true; turn = 'over'; render();
      const a = booksYou.length, b = booksCpu.length;
      if (a > b) { sfx.good(); api.hint(`All the sets are down. You made ${a}, ${P.n} made ${b}. You win! ${cheer()}!`); api.later(() => api.done(a - b >= 3 ? 3 : 2), 1200); }
      else { sfx.soft(); api.hint(`All the sets are down. ${P.n} made ${b} and you made ${a}. What a lovely game, well played!`); api.later(() => api.done(1), 1500); }
      return true;
    }
    function yourTurn(msg) {
      if (endCheck()) return;
      turn = 'you';
      if (!you.length) {
        if (pond.length) { const c = pond.pop(); you.push(c); freshCards.add(c); api.hint((msg ? msg + ' ' : '') + 'Your hand was empty, so you took a card from the pond. Tap a card to ask for it.'); }
        else { api.hint('You have no cards left, so it\'s ' + P.n + '\'s turn.'); turn = 'cpu'; render(); api.later(cpuTurn, 1600); return; }
      } else api.hint((msg ? msg + ' ' : '') + `Your turn. Tap a card to ask ${P.n} for that kind.`);
      render();
    }
    function ask(r) {
      if (over) return;
      if (turn === 'fish') { sfx.soft(); api.hint('Tap the pond first to take a card.'); return; }
      if (turn !== 'you') { sfx.soft(); return; }
      turn = 'wait'; asked = r; memory.add(r); sfx.tap();
      api.hint(`You ask ${P.n}: "Have you got any ${RNP[r]}?"`); render();
      api.later(() => {
        const got = cpu.filter(c => c.r === r);
        if (got.length) {
          cpu = cpu.filter(c => c.r !== r); you.push(...got); got.forEach(c => freshCards.add(c)); sfx.good();
          const made = books(you, booksYou); if (made.length) { memory.delete(r); toast(cheer() + '! A set of four'); }
          yourTurn(`${P.n} gives you ${plural(got.length, r)}.${made.length ? ' That makes a set of four!' : ''} You get another go.`);
        } else {
          talk(); turn = pond.length ? 'fish' : 'cpu';
          if (pond.length) { api.hint(`${P.n} says: "Go fish!" Tap the pond to take a card.`); render(); }
          else { api.hint(`${P.n} says: "Go fish!" The pond is empty, so it's ${P.n}'s turn.`); render(); api.later(cpuTurn, 1800); }
        }
      }, 1000);
    }
    function fish() {
      if (turn !== 'fish' || over) return;
      if (Math.random() < kind) { const k = pond.findIndex(x => x.r === asked); if (k >= 0) pond.push(pond.splice(k, 1)[0]); }
      const c = pond.pop(); you.push(c); freshCards.add(c); tone(500, .1, 'triangle', .1);
      const made = books(you, booksYou); if (made.length) { memory.delete(made[0]); toast(cheer() + '! A set of four'); }
      const setMsg = made.length ? ' That makes a set of four!' : '';
      if (c.r === asked) { sfx.good(); yourTurn(`You fished ${AN(c.r)}, just what you asked for!${setMsg} Go again.`); return; }
      turn = 'cpu'; api.hint(`You fished the ${cname(c)}.${setMsg} Now it's ${P.n}'s turn.`); render();
      if (!endCheck()) api.later(cpuTurn, 1900);
    }
    function talk() { face.classList.remove('kc-talk'); void face.offsetWidth; face.classList.add('kc-talk'); }
    function cpuTurn() {
      if (over || !api.stage.isConnected) return;
      if (endCheck()) return;
      turn = 'cpu';
      if (!cpu.length) {
        if (pond.length) { cpu.push(pond.pop()); api.hint(`${P.n}'s hand is empty, so ${P.p} takes a card from the pond.`); render(); api.later(cpuTurn, 1700); }
        else yourTurn(`${P.n} has no cards left.`);
        return;
      }
      const ranks = [...new Set(cpu.map(c => c.r))], known = ranks.filter(r => memory.has(r));
      const r = known.length && Math.random() < smart ? pick(known) : pick(ranks);
      cpuAsk = r; talk(); tone(330, .12, 'sine', .08);
      api.hint(`${P.n} asks: "Have you got any ${RNP[r]}?"`); render();
      api.later(() => {
        const got = you.filter(c => c.r === r);
        if (got.length) {
          you = you.filter(c => c.r !== r); cpu.push(...got); memory.delete(r); cpuAsk = 0; tone(300, .15, 'sine', .08);
          const made = books(cpu, booksCpu);
          api.hint(`You hand over ${plural(got.length, r)}. ${P.n} says thank you${made.length ? ' and lays down a set of four' : ''}, and asks again.`); render();
          if (!endCheck()) api.later(cpuTurn, 2200);
        } else {
          cpuAsk = 0;
          if (!pond.length) { api.hint(`You say "Go fish!" The pond is empty.`); render(); api.later(() => yourTurn(), 1600); return; }
          const c = pond.pop(); cpu.push(c);
          const made = books(cpu, booksCpu);
          const setMsg = made.length ? ` ${He} lays down a set of four.` : '';
          if (c.r === r) { api.hint(`You say "Go fish!" ${P.n} fishes ${AN(r)}, just what ${P.p} wanted, so ${P.p} goes again.${setMsg}`); render(); if (!endCheck()) api.later(cpuTurn, 2400); }
          else { api.hint(`You say "Go fish!" ${P.n} takes a card from the pond.${setMsg}`); render(); api.later(() => yourTurn(), 1900); }
        }
      }, 1800);
    }
    function render() {
      info.innerHTML = '';
      const backs = el('div', 'kc-backs'); for (let k = 0; k < Math.min(cpu.length, 10); k++) backs.append(cardEl(null, false, '', 'span'));
      const bk = el('div', 'gf-books'); booksCpu.forEach(r => bk.append(el('span', 'gf-book' + (r === freshBook ? ' kc-in' : ''), RK[r])));
      info.append(el('span', 'kc-oname', P.n), el('span', 'kc-ocount', `${cpu.length} card${cpu.length === 1 ? '' : 's'} · ${booksCpu.length} set${booksCpu.length === 1 ? '' : 's'}`), backs, bk);
      mid.innerHTML = '';
      const pd = pond.length ? cardEl(null, false, turn === 'fish' ? 'kc-tgt' : '') : slotEl('');
      if (pond.length) pd.append(el('em', 'kc-n', String(pond.length)));
      pd.setAttribute('aria-label', 'Pond'); pd.onclick = () => { if (turn === 'fish') fish(); else { sfx.soft(); api.hint(turn === 'you' ? 'First tap one of your cards to ask for it.' : 'Wait a moment, it\'s ' + P.n + '\'s turn.'); } };
      mid.append(pd);
      if (turn === 'fish') { const fb = btn('🎣 Go fish', 'c-sky gf-fish', fish); fb.style.minHeight = '64px'; mid.append(fb); }
      else mid.append(el('span', 'kc-ocount', 'The pond'));
      youRow.innerHTML = '';
      youRow.append(el('span', '', `You · ${booksYou.length} set${booksYou.length === 1 ? '' : 's'}`));
      const yb = el('div', 'gf-books'); booksYou.forEach(r => yb.append(el('span', 'gf-book' + (r === freshBook ? ' kc-in' : ''), RK[r]))); youRow.append(yb);
      grps.innerHTML = '';
      const ranks = [...new Set(you.map(c => c.r))].sort((a, b) => a - b);
      ranks.forEach(r => {
        const cs = you.filter(c => c.r === r).sort((a, b) => a.s - b.s);
        const gb = el('button', 'gf-grp' + ((turn === 'wait' && r === asked) || r === cpuAsk ? ' gf-asked' : '')); gb.type = 'button';
        gb.style.width = (cw + (cs.length - 1) * step) + 'px';
        gb.setAttribute('aria-label', `Ask for ${RNP[r]} (you have ${cs.length})`);
        cs.forEach((c, k) => { const e = cardEl(c, true, freshCards.has(c) ? 'kc-in' : '', 'span'); e.style.left = (k * step) + 'px'; gb.append(e); });
        gb.onclick = () => ask(r);
        grps.append(gb);
      });
      if (!ranks.length) grps.append(el('p', 'kc-note', 'No cards in your hand'));
      freshCards = new Set(); freshBook = null;
    }
    books(you, booksYou); books(cpu, booksCpu);
    yourTurn();
  }

  /* =========================================================
     CRAZY EIGHTS
     ========================================================= */
  function startEights(L, api) {
    const P = pick(PALS), He = P.p === 'she' ? 'She' : 'He';
    const W = api.stage.clientWidth || 340, cw = W < 520 ? 54 : 68;
    const perRow = Math.max(4, Math.floor((W - cw) / (cw * .64)) + 1);
    let pile = shuffle(newDeck());
    let you = pile.splice(0, L <= 2 ? 5 : L <= 5 ? 6 : 7), cpu = pile.splice(0, 7);
    let i8 = pile.findIndex(c => c.r !== 8); const disc = [pile.splice(i8, 1)[0]];
    const kind = [0, .4, .3, .15][L] || 0; // quiet help on the easiest levels
    let suit = disc[0].s, turn = 'you', over = false, passes = 0, fresh = null, drawn = null;
    const root = el('div'); root.style.setProperty('--cw', cw + 'px');
    const { o, face, info } = oppBar(P);
    const mid = el('div', 'ce-mid'), hand = el('div', 'kc-hand');
    root.append(o, mid, el('p', 'kc-label', 'Your cards'), hand);
    api.stage.append(root);
    const top = () => last(disc);
    const ok = c => c.r === 8 || c.s === suit || c.r === top().r;
    const matchWords = () => `a ${SU[suit]} ${SUN[suit].slice(0, -1)}, ` + (top().r === 8 ? 'or an 8' : `${AN(top().r)} or an 8`);
    const sortHand = () => you.sort((a, b) => (a.r === 8) - (b.r === 8) || a.s - b.s || a.r - b.r);
    function talk() { face.classList.remove('kc-talk'); void face.offsetWidth; face.classList.add('kc-talk'); }
    function refill() {
      if (pile.length) return true;
      if (disc.length <= 1) return false;
      const t = disc.pop(); pile = shuffle(disc.splice(0)); disc.push(t); return true;
    }
    function finish(winner) {
      over = true; turn = 'over'; render();
      if (winner === 'you') { sfx.good(); api.hint(`Your last card is down. You win! ${cheer()}!`); api.later(() => api.done(cpu.length >= 3 ? 3 : 2), 1200); }
      else { sfx.soft(); api.hint(`${P.n} played ${P.p === 'she' ? 'her' : 'his'} last card and wins this time. Lovely game, well played!`); api.later(() => api.done(1), 1500); }
    }
    function stall() { // nobody can play and nothing can be drawn
      if (++passes < 3) return false;
      finish(you.length <= cpu.length ? 'you' : 'cpu'); return true;
    }
    function yourTurn(msg) {
      if (over) return;
      turn = 'you'; drawn = null;
      const can = you.some(ok);
      api.hint((msg ? msg + ' ' : '') + (can ? `Your turn. Play a glowing card: ${matchWords()}.` : 'Nothing matches, so tap the deck to draw a card.'));
      render();
    }
    function playYou(c) {
      if (turn !== 'you' || over) { if (!over) sfx.soft(); return; }
      if (drawn && c !== drawn) { sfx.soft(); api.hint(`Play the ${cname(drawn)} you just drew.`); return; }
      if (!ok(c)) { sfx.soft(); api.hint(`That one doesn't match. Look for ${matchWords()}.`); return; }
      you.splice(you.indexOf(c), 1); disc.push(c); fresh = c; passes = 0;
      tone(440 + c.r * 25, .12, 'triangle', .11);
      if (!you.length) { finish('you'); return; }
      if (c.r === 8) { turn = 'pick'; api.hint('An 8! Pick the suit you want to play on next.'); render(); return; }
      suit = c.s; turn = 'cpu'; api.hint(`You play the ${cname(c)}. Now it's ${P.n}'s turn.`); render(); api.later(cpuTurn, 1500);
    }
    function pickSuit(s) {
      if (turn !== 'pick') return;
      suit = s; sfx.good(); turn = 'cpu'; api.hint(`You choose ${SUN[s]} ${SU[s]}. Now it's ${P.n}'s turn.`); render(); api.later(cpuTurn, 1500);
    }
    function drawYou() {
      if (turn !== 'you' || over) return;
      if (drawn) { sfx.soft(); api.hint(`Play the ${cname(drawn)} you just drew.`); return; }
      if (you.some(ok)) { sfx.soft(); api.hint('You have a card that matches. Look for the glowing cards.'); return; }
      if (!refill()) { if (stall()) return; turn = 'cpu'; api.hint(`There are no cards left to draw, so it's ${P.n}'s turn.`); render(); api.later(cpuTurn, 1500); return; }
      if (Math.random() < kind) { const k = pile.findIndex(x => ok(x) && x.r !== 8); if (k >= 0) pile.push(pile.splice(k, 1)[0]); }
      const c = pile.pop(); you.push(c); fresh = c; sortHand(); tone(500, .1, 'triangle', .1);
      if (ok(c)) { drawn = c; passes = 0; api.hint(`You drew the ${cname(c)}. It matches, so tap it to play it!`); render(); }
      else { turn = 'cpu'; api.hint(`You drew the ${cname(c)}. No match, so it's ${P.n}'s turn.`); render(); api.later(cpuTurn, 1800); }
    }
    function cpuChoose() {
      const ps = cpu.filter(ok); if (!ps.length) return null;
      const plain = ps.filter(c => c.r !== 8);
      if (L <= 3) return plain.length ? pick(plain) : ps[0];
      if (!plain.length) return ps[0];
      const cnt = [0, 0, 0, 0]; cpu.forEach(c => cnt[c.s]++);
      return plain.sort((a, b) => cnt[b.s] - cnt[a.s])[0];
    }
    function cpuPlay(c) {
      cpu.splice(cpu.indexOf(c), 1); disc.push(c); fresh = c; passes = 0; talk(); tone(380 + c.r * 20, .12, 'triangle', .1);
      if (!cpu.length) { finish('cpu'); return; }
      if (c.r === 8) {
        const cnt = [0, 0, 0, 0]; cpu.forEach(x => { if (x.r !== 8) cnt[x.s]++; });
        suit = cnt.indexOf(Math.max(...cnt));
        yourTurn(`${P.n} plays an 8 and picks ${SUN[suit]} ${SU[suit]}.${cpu.length === 1 ? ` ${He} has one card left!` : ''}`);
      } else { suit = c.s; yourTurn(`${P.n} plays the ${cname(c)}.${cpu.length === 1 ? ` ${He} has one card left!` : ''}`); }
    }
    function cpuTurn() {
      if (over || !api.stage.isConnected) return;
      turn = 'cpu'; render();
      const c = cpuChoose(), holdBack = c && cpu.length > 1 && pile.length > 0 && Math.random() < kind;
      if (c && !holdBack) { cpuPlay(c); return; }
      if (!refill()) { if (stall()) return; yourTurn(`${P.n} can't play and there are no cards to draw.`); return; }
      const d = pile.pop(); cpu.push(d); talk(); tone(300, .12, 'sine', .08);
      if (holdBack) { api.hint(`${P.n} decides to keep ${P.p === 'she' ? 'her' : 'his'} cards and draws one instead.`); render(); api.later(() => yourTurn(`${P.n} drew a card.`), 1500); return; }
      api.hint(`${P.n} can't play, so ${P.p} draws a card.`); render();
      api.later(() => { if (ok(d)) cpuPlay(d); else yourTurn(`${P.n} couldn't play, so ${P.p} drew a card.`); }, 1500);
    }
    function render() {
      info.innerHTML = '';
      const backs = el('div', 'kc-backs'); for (let k = 0; k < Math.min(cpu.length, 12); k++) backs.append(cardEl(null, false, '', 'span'));
      info.append(el('span', 'kc-oname', P.n), el('span', 'kc-ocount', `${cpu.length} card${cpu.length === 1 ? '' : 's'}`), backs);
      mid.innerHTML = '';
      const can = turn === 'you' && !drawn && !you.some(ok);
      const pe = pile.length ? cardEl(null, false, can ? 'kc-tgt' : '') : slotEl(disc.length > 1 ? '↻' : '', can && disc.length > 1 ? 'kc-tgt' : '');
      if (pile.length) pe.append(el('em', 'kc-n', String(pile.length)));
      pe.setAttribute('aria-label', 'Deck'); pe.onclick = drawYou;
      const te = cardEl(top(), true, top() === fresh ? 'kc-in' : '', 'div');
      const chip = el('div', 'ce-suit' + (red(suit) ? ' ce-r' : ''), `<span>Play on</span><b>${SU[suit]}</b><span>${SUN[suit]}</span>`);
      mid.append(pe, te, chip);
      hand.innerHTML = '';
      if (turn === 'pick') {
        const pk = el('div', 'ce-pick');
        [1, 2, 0, 3].forEach(s => { const b = btn(`<b>${SU[s]}</b>${SUN[s]}`, 'c-card' + (red(s) ? ' ce-r' : ''), () => pickSuit(s)); b.setAttribute('aria-label', SUN[s]); pk.append(b); });
        hand.append(pk);
      } else {
        sortHand();
        for (let k = 0; k < you.length; k += perRow) {
          const re = el('div', 'kc-row');
          you.slice(k, k + perRow).forEach(c => {
            const good = turn === 'you' && (drawn ? c === drawn : ok(c));
            const e = cardEl(c, true, (good ? 'kc-ok' : turn === 'you' ? 'kc-no' : '') + (c === fresh ? ' kc-in' : ''));
            e.onclick = () => playYou(c); re.append(e);
          });
          hand.append(re);
        }
      }
      fresh = null;
    }
    sortHand();
    yourTurn(`Match the suit or the number. 8s are wild.`);
  }
})();
