/* Recall: Cards 2 (Clock Patience, FreeCell, Spider, Old Maid, Rummy) */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor } = R;
  const TEST = !!window.__recallTest; // test hooks only exist when a test harness sets this before load

  /* ---------------- shared card toolkit (same look as cards.js, own k2- prefix) ---------------- */
  const SU = ['♠', '♥', '♦', '♣'], SUN = ['spades', 'hearts', 'diamonds', 'clubs'];
  const RK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const RN = ['', 'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];
  const RNP = ['', 'Aces', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s', '10s', 'Jacks', 'Queens', 'Kings'];
  const AN = r => (r === 1 || r === 8 ? 'an ' : 'a ') + RN[r];
  const red = s => s === 1 || s === 2;
  const RNK = id => id % 13 + 1, SUT = id => (id / 13) | 0, RED = id => red((id / 13) | 0);
  const C = id => ({ r: RNK(id), s: SUT(id) });
  const newDeck = () => { const d = []; for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) d.push({ r, s }); return d; };
  const cname = c => c.om ? 'Old Maid' : RN[c.r] + ' of ' + SUN[c.s];
  const cshort = c => (typeof c === 'number' ? (c = C(c), RK[c.r] + SU[c.s]) : c.om ? 'Old Maid' : RK[c.r] + SU[c.s]);
  const last = a => a[a.length - 1];
  const PALS = [{ n: 'Edna', f: '👵', p: 'she' }, { n: 'Harold', f: '👴', p: 'he' }, { n: 'Peggy', f: '👩‍🦳', p: 'she' },
    { n: 'Stanley', f: '👨‍🦳', p: 'he' }, { n: 'Ivy', f: '👵', p: 'she' }, { n: 'Bert', f: '🧓', p: 'he' }];

  function cardEl(c, up = true, cls = '', tag = 'button') {
    if (typeof c === 'number') c = C(c);
    const b = el(tag, 'k2-card ' + cls);
    if (tag === 'button') b.type = 'button';
    if (!c || !up) { b.classList.add('k2-back'); b.setAttribute('aria-label', 'Face-down card'); b.innerHTML = '<span class="k2-pat"></span>'; return b; }
    if (c.om) { b.classList.add('k2-om', 'k2-blk'); b.setAttribute('aria-label', 'The Old Maid'); b.innerHTML = '<span class="k2-c"><b>Q</b><i>♠</i></span><span class="k2-big">👒</span>'; return b; }
    b.classList.add(red(c.s) ? 'k2-red' : 'k2-blk');
    if (c.r > 10) b.classList.add('k2-face');
    b.setAttribute('aria-label', cname(c));
    b.innerHTML = `<span class="k2-c"><b>${RK[c.r]}</b><i>${SU[c.s]}</i></span><span class="k2-big">${SU[c.s]}</span>`;
    return b;
  }
  function slotEl(label, cls = '') { const b = el('button', 'k2-slot ' + cls, label); b.type = 'button'; return b; }
  function btn(label, color, fn) { const b = el('button', 'btn ' + color, label); b.type = 'button'; b.onclick = fn; return b; }
  function oppBar(P) {
    const o = el('div', 'k2-opp');
    const face = el('span', 'tile c-rose k2-who', P.f);
    const info = el('div', 'k2-oinfo');
    o.append(face, info);
    return { o, face, info };
  }
  function talk(face) { face.classList.remove('k2-talk'); void face.offsetWidth; face.classList.add('k2-talk'); }
  function fitCw(W, n, g, lo, hi) { return Math.max(lo, Math.min(hi, Math.floor((W - (n - 1) * g) / n))); }
  function fanStep(W, n, cw, max = .8) { return n > 1 ? Math.max(cw * .22, Math.min(cw * max, (W - 6 - cw) / (n - 1))) : 0; }
  function sparkle(base = 523) { [0, 1, 2, 3].forEach(i => tone(base * Math.pow(2, i * 4 / 12), .2, 'sine', .12, i * .1)); }

  /* a tiny best-first search shared by the FreeCell and Spider solvers */
  function Heap() {
    const a = [];
    return {
      get size() { return a.length; },
      push(p, v) { a.push([p, v]); let i = a.length - 1; while (i > 0) { const j = (i - 1) >> 1; if (a[j][0] <= a[i][0]) break; [a[i], a[j]] = [a[j], a[i]]; i = j; } },
      pop() {
        const top = a[0], e = a.pop();
        if (a.length) { a[0] = e; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m; } }
        return top[1];
      }
    };
  }
  function bestFirst(s0, P, budget) {
    const seen = new Set([P.key(s0)]), nodes = [{ s: s0, p: -1, m: null, g: 0 }], H = Heap();
    H.push(P.h(s0), 0); let n = 0;
    while (H.size) {
      const idx = H.pop(), nd = nodes[idx];
      if (P.goal(nd.s)) { const path = []; for (let k = idx; nodes[k].p >= 0; k = nodes[k].p) path.unshift(nodes[k].m); return { ok: true, path, nodes: n }; }
      if (++n > budget) break;
      for (const m of P.moves(nd.s)) {
        const s2 = P.apply(nd.s, m), k = P.key(s2);
        if (seen.has(k)) continue; seen.add(k);
        nodes.push({ s: s2, p: idx, m, g: nd.g + 1 }); H.push(P.h(s2) + (nd.g + 1) * P.w, nodes.length - 1);
      }
      nd.s = nd.p < 0 ? nd.s : null; // expanded states are no longer needed; keeps memory low
    }
    return { ok: false, path: [], nodes: n };
  }

  R.css(`
.k2-card{position:relative; flex:none; width:var(--cw); height:calc(var(--cw) * 1.4); padding:0; border:0; cursor:pointer;
  border-radius:calc(var(--cw) * .14); font-family:var(--display); color:var(--ink); -webkit-tap-highlight-color:transparent;
  background:linear-gradient(160deg, #fff 0%, #FFF9EF 55%, #F2E6CE 100%);
  box-shadow:inset 0 -3px 0 rgba(0,0,0,.07), inset 0 2px 0 #fff, 0 3px 0 #C6AF86, 0 6px 10px rgba(0,0,0,.3);
  transition:transform .16s, box-shadow .16s, filter .2s}
.k2-red{color:#D3203A} .k2-blk{color:#1B2530}
.k2-c{position:absolute; left:7%; top:3%; display:flex; align-items:baseline; gap:1px; line-height:1; font-weight:700; pointer-events:none}
.k2-c b{font-size:max(20px, calc(var(--cw) * .44)); letter-spacing:-.05em}
.k2-c i{font-style:normal; font-size:max(14px, calc(var(--cw) * .32))}
.k2-big{position:absolute; left:0; right:0; bottom:8%; text-align:center; line-height:1; font-size:calc(var(--cw) * .6); pointer-events:none}
.k2-face .k2-big{left:18%; right:18%; bottom:9%; padding:5% 0; border-radius:calc(var(--cw) * .12);
  background:linear-gradient(180deg, #FFE7A0, #F6C64F); box-shadow:inset 0 -3px 0 rgba(0,0,0,.12); font-size:calc(var(--cw) * .44)}
.k2-om{background:linear-gradient(160deg, #FFF4FB 0%, #FFE0EE 60%, #F7C4DA 100%)}
.k2-om .k2-big{left:12%; right:12%; bottom:7%; padding:6% 0; border-radius:50%; font-size:calc(var(--cw) * .5);
  background:radial-gradient(circle, #fff 0 55%, #FFB7D2 56%); box-shadow:0 0 0 2px #D35C8C}
.k2-back{background:
  radial-gradient(circle at 50% 50%, rgba(255,255,255,.95) 0 11%, transparent 12%),
  radial-gradient(circle at 50% 50%, transparent 0 20%, rgba(255,255,255,.35) 21% 25%, transparent 26%),
  repeating-linear-gradient(45deg, rgba(255,255,255,.2) 0 3px, transparent 3px 9px),
  repeating-linear-gradient(-45deg, rgba(255,255,255,.2) 0 3px, transparent 3px 9px),
  linear-gradient(160deg, #FF94AC, #DD4877);
  box-shadow:inset 0 0 0 calc(var(--cw) * .06) #FFF9EF, inset 0 0 0 calc(var(--cw) * .09) #B83A62, 0 3px 0 #8F2C4B, 0 6px 10px rgba(0,0,0,.3)}
.k2-sel{transform:translateY(-7px); box-shadow:0 0 0 4px #FFD84A, 0 0 0 7px rgba(0,0,0,.25), 0 10px 16px rgba(0,0,0,.35); z-index:5}
.k2-tgt{animation:k2-glow 1s ease-in-out infinite}
.k2-hint{animation:k2-hglow .9s ease-in-out infinite; z-index:6}
@keyframes k2-glow{0%,100%{box-shadow:0 0 0 3px #fff, 0 0 0 8px rgba(255,255,255,.35)}50%{box-shadow:0 0 0 5px #fff, 0 0 0 14px rgba(255,255,255,.12)}}
@keyframes k2-hglow{0%,100%{box-shadow:0 0 0 4px #FFD84A, 0 0 0 9px rgba(255,216,74,.4)}50%{box-shadow:0 0 0 6px #FFD84A, 0 0 0 16px rgba(255,216,74,.1)}}
.k2-slot{flex:none; width:var(--cw); height:calc(var(--cw) * 1.4); padding:0; cursor:pointer; display:grid; place-items:center;
  border-radius:calc(var(--cw) * .14); border:3px dashed rgba(255,255,255,.45); background:rgba(0,0,0,.16);
  color:rgba(255,255,255,.7); font:700 max(20px, calc(var(--cw) * .48))/1 var(--display)}
.k2-slot.k2-sred{color:rgba(255,170,180,.9)}
.k2-in{animation:k2-in .3s cubic-bezier(.3,1.5,.5,1) backwards}
@keyframes k2-in{0%{transform:translateY(-14px) scale(.8); opacity:.4}100%{transform:none; opacity:1}}
.k2-flip{animation:k2-flip .4s ease-out backwards}
@keyframes k2-flip{0%{transform:rotateY(90deg)}100%{transform:rotateY(0)}}
.k2-n{position:absolute; right:-6px; bottom:-8px; min-width:30px; padding:2px 6px; border-radius:999px; background:#18242C; color:#fff;
  font:700 18px/1.2 var(--display); font-style:normal; box-shadow:0 2px 0 rgba(0,0,0,.3); pointer-events:none}
.k2-bar{display:flex; flex-wrap:wrap; justify-content:center; gap:10px 12px; margin-top:16px}
.k2-bar .btn{min-width:104px; min-height:56px; font-size:1.1rem; padding:.5em .9em}
.k2-bar .btn:disabled{opacity:.45; cursor:default}
.k2-note{text-align:center; margin:10px 0 0; font:600 1.05rem/1.3 var(--display); color:var(--on-table-soft)}
.k2-opp{display:flex; align-items:center; gap:12px; background:rgba(0,0,0,.18); border-radius:22px; padding:8px 12px; max-width:640px; margin:0 auto 10px}
.k2-opp.k2-on{box-shadow:0 0 0 3px #FFD84A}
.k2-who{width:56px; height:56px; font-size:34px; flex:none; border-radius:22%}
.k2-who.k2-talk{animation:pop .5s}
.k2-oinfo{flex:1; min-width:0; display:flex; flex-wrap:wrap; align-items:center; gap:4px 12px}
.k2-oname{font:700 1.3rem/1.1 var(--display)}
.k2-ocount{font:600 1.05rem var(--display); color:var(--on-table-soft)}
.k2-backs{display:flex; --cw:30px; padding-top:2px}
.k2-backs .k2-card{margin-left:-18px; cursor:default; box-shadow:inset 0 0 0 2px #FFF9EF, inset 0 0 0 3px #B83A62, 0 2px 0 #8F2C4B}
.k2-backs .k2-card:first-child{margin-left:0}
.k2-fan{display:flex; justify-content:center; padding-top:8px}
.k2-lbl{font:700 1.1rem var(--display); color:var(--on-table-soft); text-align:center; margin:8px 0 0}
.k2-row{display:grid; gap:var(--g); justify-content:center}
.k2-cols{margin-top:12px}
.k2-col{position:relative; cursor:pointer}
.k2-col > *{position:absolute; left:0}

/* Clock Patience */
.k2-dial{position:relative; margin:0 auto; border-radius:50%;
  background:radial-gradient(circle, #FFF6DF 0 40%, #F6E6BF 41% 70%, #E9C67E 71% 72%, #FFF6DF 73%);
  box-shadow:0 0 0 7px var(--brass), 0 0 0 11px var(--brass-d), 0 10px 0 11px #5A361C, 0 20px 26px rgba(0,0,0,.4)}
.k2-pile{position:absolute}
.k2-pile > *{position:absolute; left:0}
.k2-hr{position:absolute; left:0; right:0; top:50%; transform:translateY(-50%); text-align:center; font:700 max(20px, calc(var(--cw) * .42))/1 var(--display); color:#8F2C4B;
  text-shadow:0 0 6px #fff, 0 0 3px #fff; pointer-events:none}
.k2-low{display:flex; justify-content:center; align-items:center; gap:16px; margin-top:22px; flex-wrap:wrap}
.k2-hand{display:flex; flex-direction:column; align-items:center; gap:4px; font:700 1.05rem var(--display); color:var(--on-table-soft)}
.k2-hand .k2-card, .k2-hand .k2-slot{position:relative}
.k2-low .btn{min-height:60px; font-size:1.15rem}

/* Old Maid + Rummy */
.k2-mid{display:flex; justify-content:center; align-items:flex-start; gap:18px; margin:12px 0 4px}
.k2-mid .k2-card, .k2-mid .k2-slot{position:relative}
.k2-pair{position:relative; height:calc(var(--cw) * 1.4)}
.k2-pair .k2-card{position:absolute; top:0; cursor:default}
.k2-g{position:relative}
.k2-g0{box-shadow:0 0 0 4px #3CC46B, 0 6px 10px rgba(0,0,0,.3)}
.k2-g1{box-shadow:0 0 0 4px #45AEFF, 0 6px 10px rgba(0,0,0,.3)}
.k2-g2{box-shadow:0 0 0 4px #A98BFF, 0 6px 10px rgba(0,0,0,.3)}
.k2-gb{position:absolute; left:50%; bottom:-12px; transform:translateX(-50%); width:28px; height:28px; border-radius:50%; display:grid; place-items:center;
  font:700 17px/1 var(--display); color:#fff; box-shadow:0 2px 0 rgba(0,0,0,.3); pointer-events:none; font-style:normal}
.k2-g0 .k2-gb{background:#1F8C46} .k2-g1 .k2-gb{background:#1D70C0} .k2-g2 .k2-gb{background:#6F4FD0}
.k2-meldok{animation:bounceIn .5s}
`);

  register({ id: 'clockpat', cat: 'cards', order: 15, name: 'Clock Patience', icon: '🕰️', desc: 'Turn the cards round the clock face', gentle: true, start: startClock });
  register({ id: 'freecell', cat: 'cards', order: 16, name: 'FreeCell', icon: '🗃️', desc: 'Use four spare cells to sort every suit', start: startFreeCell });
  register({ id: 'spider', cat: 'cards', order: 17, name: 'Spider', icon: '🕸️', desc: 'Build runs from King down to Ace', start: startSpider });
  register({ id: 'oldmaid', cat: 'cards', order: 18, name: 'Old Maid', icon: '👒', desc: 'Make pairs, and pass on the Old Maid!', gentle: true, start: startOldMaid });
  register({ id: 'rummy', cat: 'cards', order: 19, name: 'Rummy', icon: '🎴', desc: 'Make sets and runs before your friend', start: startRummy });

  /* =========================================================
     CLOCK PATIENCE
     ========================================================= */
  function clockDeal() { const d = shuffle(newDeck()), p = []; for (let i = 0; i < 13; i++) p.push({ down: d.slice(i * 4, i * 4 + 4), up: [] }); return p; }
  function clockSim(piles) {
    const p = piles.map(x => ({ down: x.down.slice(), up: [] })); let n = 0, cur = p[12].down.pop();
    for (;;) { n++; const q = p[cur.r - 1]; q.up.push(cur); if (!q.down.length) break; cur = q.down.pop(); }
    return n;
  }
  function startClock(L, api) {
    const W = api.stage.clientWidth || 340, S = Math.min(W - 4, 420);
    const cw = Math.max(38, Math.min(54, Math.round(S * .122))), ch = Math.round(cw * 1.4), hw = Math.max(56, Math.round(cw * 1.3));
    const lucky = Math.random() < (L <= 2 ? 1 : L <= 5 ? .6 : .3);
    let piles = clockDeal();
    for (let t = 0; lucky && t < 5000 && clockSim(piles) < 52; t++) piles = clockDeal();
    let cur = null, placed = 0, kings = 0, over = false, busy = false, auto = false, fresh = null, landed = -1;
    const dial = el('div', 'k2-dial'); dial.style.width = dial.style.height = S + 'px'; dial.style.setProperty('--cw', cw + 'px');
    const low = el('div', 'k2-low'), hand = el('div', 'k2-hand'); hand.style.setProperty('--cw', hw + 'px');
    const autoB = btn('▶ Play for me', 'c-sky', () => { if (over) return; sfx.tap(); auto = !auto; autoB.textContent = auto ? '⏸ Pause' : '▶ Play for me'; if (auto && cur && !busy) api.later(place, 500); else say(); });
    low.append(hand, autoB);
    api.stage.append(dial, low);
    api.rounds(4, 0);
    const Rr = S / 2 - ch / 2 - 10;
    const pos = i => { if (i === 12) return [S / 2 - cw / 2, S / 2 - ch / 2 + 6]; const a = (i + 1) * Math.PI / 6; return [S / 2 + Rr * Math.sin(a) - cw / 2, S / 2 - Rr * Math.cos(a) - ch / 2 + 6]; };
    const where = r => r === 13 ? 'the middle' : r === 12 ? "twelve o'clock" : ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'][r - 1] + " o'clock";
    function say() {
      if (over || !cur) return;
      api.hint(auto ? `Playing for you… the ${cshort(cur)} goes to ${where(cur.r)}.`
        : `Your card is the ${cshort(cur)}. ${cur.r === 13 ? 'Kings go in the middle' : 'It goes to ' + where(cur.r)}. Tap the glowing pile${placed < 3 ? ', or tap your card' : ''}.`);
    }
    function turnFrom(i) { cur = piles[i].down.pop(); fresh = cur; tone(620, .1, 'triangle', .08); render(); say(); if (auto) api.later(place, 750); }
    function place() {
      if (over || busy || !cur) return;
      const i = cur.r - 1; piles[i].up.push(cur); placed++; landed = i;
      if (cur.r === 13) { kings++; api.rounds(4, kings); }
      tone(330 * Math.pow(2, placed / 26), .14, 'sine', .11);
      cur = null; render();
      if (!piles[i].down.length) return end();
      busy = true; api.later(() => { busy = false; if (!over) turnFrom(i); }, auto ? 420 : 520);
    }
    function tapPile(i) {
      if (over || busy || !cur) return;
      if (i === cur.r - 1) { sfx.tap(); place(); return; }
      sfx.soft(); api.hint(`Nearly! The ${cshort(cur)} goes to ${where(cur.r)}. Look for the glowing pile.`);
    }
    function end() {
      over = true; auto = false; autoB.hidden = true; render();
      if (placed === 52) {
        api.hint(`Every card is turned, all the way round the clock! ${cheer()}!`); sfx.good(); sparkle();
        dial.querySelectorAll('.k2-card').forEach((e, k) => api.later(() => wob(e), k * 40));
        api.later(() => api.done(3), 1400);
      } else {
        api.hint(`The fourth King is home, so the clock stops here. You turned ${placed} of the 52 cards. What a lovely, peaceful game!`); sfx.good();
        api.later(() => api.done(2), 1800);
      }
    }
    function render() {
      dial.innerHTML = '';
      piles.forEach((p, i) => {
        const [x, y] = pos(i), pe = el('div', 'k2-pile'); pe.style.left = x + 'px'; pe.style.top = y + 'px'; pe.style.width = cw + 'px'; pe.style.height = ch + 'px';
        const nd = p.down.length;
        for (let j = 0; j < nd; j++) {
          const b = cardEl(null, false, '', 'span'); b.style.top = (-(nd - 1 - j) * 4 - (p.up.length ? 6 : 0)) + 'px';
          if (j === nd - 1 && !p.up.length) b.append(el('span', 'k2-hr', RK[i + 1]));
          pe.append(b);
        }
        let top;
        if (p.up.length) { top = cardEl(last(p.up), true, i === landed ? 'k2-in' : ''); pe.append(top); }
        else if (!nd) { top = slotEl(RK[i + 1]); pe.append(top); }
        if (cur && !over && i === cur.r - 1 && !auto) pe.lastChild.classList.add('k2-tgt');
        pe.onclick = () => tapPile(i);
        dial.append(pe);
      });
      landed = -1;
      hand.innerHTML = '';
      if (cur) { const c = cardEl(cur, true, cur === fresh ? 'k2-flip' : ''); c.onclick = () => { if (!auto) { sfx.tap(); place(); } }; hand.append(c); }
      else { const s = slotEl(''); s.style.opacity = '.5'; hand.append(s); }
      hand.append(el('span', '', over ? (placed === 52 ? 'All done!' : 'Finished') : 'Your card'));
      fresh = null;
    }
    render();
    api.hint('The cards are dealt round the clock. Turning the first card from the middle…');
    api.later(() => turnFrom(12), 900);
    if (TEST) window.__k2Clock = { bot() { if (over) return 'over'; if (busy || !cur) return 'wait'; place(); return 'move'; }, lucky };
  }

  /* =========================================================
     FREECELL
     ========================================================= */
  const fcFits = (a, b) => RNK(b) === RNK(a) + 1 && RED(a) !== RED(b); // card a may sit on card b
  function fcRunStart(col) { let k = col.length - 1; if (k < 0) return 0; while (k > 0 && fcFits(col[k], col[k - 1])) k--; return k; }
  function fcCap(s, toEmpty) { const fc = s.l.filter(x => x < 0).length; let e = s.c.filter(c => !c.length).length; if (toEmpty) e--; return (fc + 1) * Math.pow(2, Math.max(0, e)); }
  function fcSafe(s, id) { const r = RNK(id); if (r <= 2) return true; const rd = RED(id); for (let q = 0; q < 4; q++) if (red(q) !== rd && s.f[q] < r - 1) return false; return true; }
  const fcClone = s => ({ c: s.c.map(x => x.slice()), l: s.l.slice(), f: s.f.slice() });
  function fcApply(s, m) {
    let cards;
    if (m.from.t === 'c') cards = s.c[m.from.i].splice(s.c[m.from.i].length - m.n); else { cards = [s.l[m.from.i]]; s.l[m.from.i] = -1; }
    if (m.to.t === 'c') s.c[m.to.i].push(...cards); else if (m.to.t === 'l') s.l[m.to.i] = cards[0]; else s.f[SUT(cards[0])]++;
    return cards;
  }
  function fcOrdered(s) { return s.c.every(col => fcRunStart(col) === 0); }
  function fcAutoOne(s, force) {
    const ok = id => s.f[SUT(id)] === RNK(id) - 1 && (force || fcSafe(s, id));
    for (let i = 0; i < 4; i++) { const id = s.l[i]; if (id >= 0 && ok(id)) return { from: { t: 'l', i }, to: { t: 'f', i: SUT(id) }, n: 1 }; }
    let best = null;
    for (let i = 0; i < 8; i++) { const col = s.c[i]; if (col.length) { const id = last(col); if (ok(id) && (!best || RNK(id) < RNK(last(s.c[best.from.i])))) best = { from: { t: 'c', i }, to: { t: 'f', i: SUT(id) }, n: 1 }; } }
    return best;
  }
  function fcAuto(s) { let m; while ((m = fcAutoOne(s, fcOrdered(s)))) fcApply(s, m); return s; }
  const fcWon = s => s.f.every(x => x === 13);
  function fcMoves(s) {
    const out = [], free = s.l.indexOf(-1), empty = s.c.findIndex(c => !c.length);
    const fOK = id => s.f[SUT(id)] === RNK(id) - 1;
    for (let i = 0; i < 4; i++) { const id = s.l[i]; if (id >= 0 && fOK(id)) out.push({ from: { t: 'l', i }, to: { t: 'f', i: SUT(id) }, n: 1 }); }
    for (let i = 0; i < 8; i++) { const col = s.c[i]; if (col.length && fOK(last(col))) out.push({ from: { t: 'c', i }, to: { t: 'f', i: SUT(last(col)) }, n: 1 }); }
    const cap = fcCap(s, false), capE = fcCap(s, true);
    for (let i = 0; i < 8; i++) {
      const col = s.c[i]; if (!col.length) continue;
      const rs = fcRunStart(col);
      for (let j = 0; j < 8; j++) {
        if (j === i || !s.c[j].length) continue;
        const t = last(s.c[j]);
        for (let k = rs; k < col.length; k++) if (fcFits(col[k], t)) { if (col.length - k <= cap) out.push({ from: { t: 'c', i }, to: { t: 'c', i: j }, n: col.length - k }); break; }
      }
      if (empty >= 0 && rs > 0) out.push({ from: { t: 'c', i }, to: { t: 'c', i: empty }, n: Math.min(col.length - rs, capE) });
    }
    for (let i = 0; i < 4; i++) {
      const id = s.l[i]; if (id < 0) continue;
      for (let j = 0; j < 8; j++) if (s.c[j].length && fcFits(id, last(s.c[j]))) out.push({ from: { t: 'l', i }, to: { t: 'c', i: j }, n: 1 });
      if (empty >= 0) out.push({ from: { t: 'l', i }, to: { t: 'c', i: empty }, n: 1 });
    }
    if (free >= 0) for (let i = 0; i < 8; i++) if (s.c[i].length) out.push({ from: { t: 'c', i }, to: { t: 'l', i: free }, n: 1 });
    return out;
  }
  const FCP = {
    w: .3,
    key: s => s.c.map(c => String.fromCharCode(...c.map(x => x + 48))).sort().join('|') + '#' + s.l.filter(x => x >= 0).sort((a, b) => a - b).join(',') + '#' + s.f.join(','),
    goal: fcWon,
    moves: fcMoves,
    apply: (s, m) => { const t = fcClone(s); fcApply(t, m); return fcAuto(t); },
    h(s) {
      let h = (52 - s.f[0] - s.f[1] - s.f[2] - s.f[3]) * 3;
      for (const col of s.c) for (let j = 1; j < col.length; j++) if (!fcFits(col[j], col[j - 1])) h += 2;
      for (let q = 0; q < 4; q++) if (s.f[q] < 13) { const id = q * 13 + s.f[q]; for (const col of s.c) { const k = col.indexOf(id); if (k >= 0) { h += (col.length - 1 - k) * 1.5; break; } } }
      h += s.l.filter(x => x >= 0).length - s.c.filter(c => !c.length).length * 2;
      return h;
    }
  };
  const fcSolve = (s, budget) => bestFirst(fcAuto(fcClone(s)), FCP, budget);
  function fcLayout(d) { const c = [[], [], [], [], [], [], [], []]; d.forEach((id, k) => c[k % 8].push(id)); return { c, l: [-1, -1, -1, -1], f: [0, 0, 0, 0] }; }
  function fcSweeten(d, n) { // quietly lift low cards near the bottom of the columns, for the easiest levels
    for (let q = 0; q < n; q++) {
      const lows = [], spots = []; for (let k = 0; k < 40; k++) if (RNK(d[k]) <= 3) lows.push(k);
      for (let k = 32; k < 52; k++) if (RNK(d[k]) > 4) spots.push(k);
      if (!lows.length || !spots.length) break;
      const a = pick(lows), b = pick(spots); [d[a], d[b]] = [d[b], d[a]];
    }
    return d;
  }
  function fcPick(L) {
    const want = L <= 1 ? 6 : L === 2 ? 3 : 1, sw = L <= 1 ? 8 : L === 2 ? 4 : 0, t0 = Date.now();
    let best = null, found = 0;
    for (let tries = 0; tries < 60; tries++) {
      const d = fcSweeten(shuffle([...Array(52).keys()]), sw), s = fcLayout(d), r = fcSolve(s, 12000);
      if (r.ok) { const score = r.nodes + r.path.length * 4; found++; if (!best || score < best.score) best = { s, score }; if (found >= want) break; }
      if (Date.now() - t0 > 1500 && best) break;
    }
    return best.s;
  }

  function startFreeCell(L, api) {
    const W = api.stage.clientWidth || 340, g = W < 520 ? 4 : 8;
    const cw = fitCw(W, 8, g, 34, 60), ch = Math.round(cw * 1.4), colH = Math.round(ch * 4.6), minOff = Math.max(23, Math.round(ch * .25));
    let st = fcPick(L), hist = [], sel = null, mark = null, hints = 0, undos = 0, busy = false, finished = false, fresh = new Set();
    const board = el('div'); board.style.setProperty('--cw', cw + 'px'); board.style.setProperty('--g', g + 'px');
    const top = el('div', 'k2-row'), cols = el('div', 'k2-row k2-cols');
    top.style.gridTemplateColumns = cols.style.gridTemplateColumns = `repeat(8, ${cw}px)`;
    board.append(top, cols);
    const bar = el('div', 'k2-bar');
    const undoB = btn('↶ Undo', 'c-card', () => { if (busy || finished || !hist.length) return; sfx.tap(); st = JSON.parse(hist.pop()); undos++; sel = null; mark = null; say(); render(); });
    const hintB = btn('💡 Hint', 'c-sun', () => { if (busy || finished) return; sfx.tap(); hints++; showHint(); });
    bar.append(undoB, hintB);
    api.stage.append(board, bar);
    const say = () => api.hint('Build each suit up from the Ace in the top right. Tap a card, then tap where it goes. Columns go down in alternate colours.');
    const nm = id => cshort(id);
    function selCards(src) { return src.t === 'c' ? st.c[src.i].slice(src.k) : [st.l[src.i]]; }
    const fromOf = src => src.t === 'c' ? { t: 'c', i: src.i } : { t: 'l', i: src.i };
    function moveFor(src, dst) {
      const cards = selCards(src);
      if (dst.t === 'f') {
        if (cards.length > 1) return { err: 'Only one card at a time can go up to the home piles.' };
        const id = cards[0]; if (st.f[SUT(id)] !== RNK(id) - 1) return { err: `The ${SUN[SUT(id)]} home pile needs ${AN(st.f[SUT(id)] + 1)} next.` };
        return { m: { from: fromOf(src), to: { t: 'f', i: SUT(id) }, n: 1 } };
      }
      if (dst.t === 'l') {
        if (src.t === 'l') return { err: 'That card is already in a spare cell.' };
        if (st.l[dst.i] >= 0) return { err: 'That spare cell is full. Each one holds a single card.' };
        if (cards.length > 1) return { err: 'A spare cell holds just one card. Tap the bottom card on its own.' };
        return { m: { from: fromOf(src), to: { t: 'l', i: dst.i }, n: 1 } };
      }
      if (src.t === 'c' && src.i === dst.i) return { err: 'Pick a different column.' };
      const col = st.c[dst.i];
      if (!col.length) {
        if (src.t === 'c' && src.k === 0) return { err: 'Those cards already make a whole column.' };
        const cap = fcCap(st, true);
        if (cards.length > cap) return { err: `You can move ${cap} card${cap > 1 ? 's' : ''} into an empty column just now. Tap a card lower down.` };
        return { m: { from: fromOf(src), to: { t: 'c', i: dst.i }, n: cards.length } };
      }
      const t = last(col), off = cards.findIndex(id => fcFits(id, t));
      if (off < 0) return { err: RNK(t) === 1 ? 'Nothing goes on an Ace in the columns. Aces go up to the home piles.' : `The ${nm(t)} needs a ${RED(t) ? 'black' : 'red'} ${RK[RNK(t) - 1]} on it.` };
      const n = cards.length - off, cap = fcCap(st, false);
      if (n > cap) return { err: `That's ${n} cards. You can move ${cap} at a time just now. Empty a spare cell first.` };
      return { m: { from: fromOf(src), to: { t: 'c', i: dst.i }, n } };
    }
    function targets(src) {
      const out = [];
      for (let q = 0; q < 4; q++) if (moveFor(src, { t: 'f', i: q }).m) out.push('f' + q);
      for (let q = 0; q < 4; q++) if (moveFor(src, { t: 'l', i: q }).m) out.push('l' + q);
      for (let j = 0; j < 8; j++) if (moveFor(src, { t: 'c', i: j }).m) out.push('c' + j);
      return out;
    }
    const save = () => hist.push(JSON.stringify(st));
    function doMove(m) {
      save(); const cards = fcApply(st, m); cards.forEach(id => fresh.add(id));
      sel = null; mark = null;
      if (m.to.t === 'f') tone(392 * Math.pow(2, (RNK(cards[0]) - 1) / 12), .16, 'sine', .13); else tone(480, .08, 'triangle', .09);
      render(); runAuto();
    }
    function runAuto() {
      const m = fcAutoOne(st, fcOrdered(st));
      if (m) { busy = true; const c = fcApply(st, m); fresh.add(c[0]); tone(392 * Math.pow(2, (RNK(c[0]) - 1) / 12), .14, 'sine', .11); render(); api.later(runAuto, 170); return; }
      busy = false; render();
      if (fcWon(st)) win();
    }
    function autoGo() {
      const src = sel, cards = selCards(src);
      const order = [{ t: 'f', i: SUT(cards[0]) }];
      for (let j = 0; j < 8; j++) if (st.c[j].length) order.push({ t: 'c', i: j });
      for (let j = 0; j < 8; j++) if (!st.c[j].length) order.push({ t: 'c', i: j });
      if (cards.length === 1 && src.t === 'c') { const q = st.l.indexOf(-1); if (q >= 0) order.push({ t: 'l', i: q }); }
      for (const d of order) { const r = moveFor(src, d); if (r.m) { doMove(r.m); return; } }
      sfx.soft(); sel = null; api.hint('That has nowhere to go just now. Try another card, or tap 💡 Hint.'); render();
    }
    function tryTo(dst) {
      const r = moveFor(sel, dst);
      if (r.m) { doMove(r.m); return; }
      sfx.soft(); sel = null; api.hint(r.err); render();
    }
    function pickUp(src) { sel = src; mark = null; sfx.tap(); const n = selCards(src).length; api.hint(`${n > 1 ? 'Those ' + n + ' cards are' : 'The ' + nm(selCards(src)[0]) + ' is'} picked up. Tap a glowing place, or tap ${n > 1 ? 'them' : 'it'} again to send ${n > 1 ? 'them' : 'it'} to the best spot.`); render(); }
    function tapCard(i, k) {
      if (busy || finished) return;
      if (sel) {
        if (sel.t === 'c' && sel.i === i) { if (sel.k === k) return autoGo(); }
        else return tryTo({ t: 'c', i });
      }
      if (k < fcRunStart(st.c[i])) { sfx.soft(); sel = null; api.hint('Only the cards in order at the bottom of a column can move. Try a lower card.'); render(); return; }
      pickUp({ t: 'c', i, k });
    }
    function tapCol(i) { if (busy || finished) return; if (sel) tryTo({ t: 'c', i }); }
    function tapCell(i) {
      if (busy || finished) return;
      if (sel) { if (sel.t === 'l' && sel.i === i) return autoGo(); if (st.l[i] < 0 || sel.t === 'c') return tryTo({ t: 'l', i }); }
      if (st.l[i] >= 0) pickUp({ t: 'l', i });
    }
    function tapF(q) { if (busy || finished) return; if (sel) tryTo({ t: 'f', i: q }); else { sfx.soft(); api.hint(st.f[q] < 13 ? `This home pile needs ${AN(st.f[q] + 1)} of ${SUN[q]} next.` : 'This pile is complete!'); } }
    function describe(m) {
      const cards = m.from.t === 'c' ? st.c[m.from.i].slice(-m.n) : [st.l[m.from.i]];
      const what = m.n > 1 ? `the ${m.n} cards from the ${nm(cards[0])} down` : 'the ' + nm(cards[0]);
      if (m.to.t === 'f') return `Move ${what} up to its home pile.`;
      if (m.to.t === 'l') return `Put ${what} in a spare cell.`;
      return st.c[m.to.i].length ? `Move ${what} onto the ${nm(last(st.c[m.to.i]))}.` : `Move ${what} into the empty column.`;
    }
    function solverMove() { const r = fcSolve(st, 15000); return r.ok ? r.path[0] || null : undefined; }
    function showHint() {
      sel = null; const m = solverMove();
      if (m === undefined) {
        let back = 0;
        for (let b = hist.length - 1; b >= Math.max(0, hist.length - 10); b--) { back++; if (fcSolve(JSON.parse(hist[b]), 5000).ok) break; }
        mark = null; api.hint(`This way looks stuck. Tap ↶ Undo ${back <= 1 ? 'once' : back + ' times'} and try another way.`);
      } else if (m) { mark = m; api.hint(describe(m)); }
      render();
    }
    function win() {
      if (finished) return; finished = true; sel = null; mark = null; render();
      api.hint('Every suit is home, from Ace to King. ' + cheer() + '!');
      sfx.good(); sparkle(); top.querySelectorAll('.k2-card').forEach(e => wob(e));
      api.done(Math.max(2, starsFor(hints + Math.floor(undos / 2), 1, 4)));
    }
    function render() {
      top.innerHTML = ''; cols.innerHTML = '';
      const tg = new Set(sel ? targets(sel) : []);
      const deco = (e, key) => { if (tg.has(key)) e.classList.add('k2-tgt'); if (mark && (mark.to.t + mark.to.i) === key) e.classList.add('k2-hint'); };
      for (let q = 0; q < 4; q++) {
        const id = st.l[q], e = id >= 0 ? cardEl(id, true, (sel && sel.t === 'l' && sel.i === q ? 'k2-sel ' : '') + (fresh.has(id) ? 'k2-in' : '')) : slotEl('');
        if (id >= 0 && mark && mark.from.t === 'l' && mark.from.i === q) e.classList.add('k2-hint');
        deco(e, 'l' + q); e.setAttribute('aria-label', id >= 0 ? cshort(id) + ' in a spare cell' : 'Empty spare cell'); e.onclick = () => tapCell(q); top.append(e);
      }
      for (let q = 0; q < 4; q++) {
        const e = st.f[q] ? cardEl(q * 13 + st.f[q] - 1, true, fresh.has(q * 13 + st.f[q] - 1) ? 'k2-in' : '') : slotEl(SU[q], red(q) ? 'k2-sred' : '');
        deco(e, 'f' + q); e.onclick = () => tapF(q); top.append(e);
      }
      st.c.forEach((col, i) => {
        const ce = el('div', 'k2-col'); ce.onclick = () => tapCol(i);
        let du = Math.max(minOff, ch * .32); if (col.length > 1 && (col.length - 1) * du > colH - ch) du = Math.max(minOff, (colH - ch) / (col.length - 1));
        ce.style.height = Math.max(colH, ch + (col.length - 1) * du) + 'px';
        if (!col.length) { const sl = slotEl(''); sl.style.opacity = '.7'; deco(sl, 'c' + i); ce.append(sl); }
        col.forEach((id, k) => {
          const e = cardEl(id, true, fresh.has(id) ? 'k2-in' : '');
          e.style.top = Math.round(k * du) + 'px';
          if (sel && sel.t === 'c' && sel.i === i && k >= sel.k) e.classList.add('k2-sel');
          if (mark && mark.from.t === 'c' && mark.from.i === i && k >= col.length - mark.n) e.classList.add('k2-hint');
          if (k === col.length - 1) deco(e, 'c' + i);
          e.onclick = ev => { ev.stopPropagation(); tapCard(i, k); };
          ce.append(e);
        });
        cols.append(ce);
      });
      fresh = new Set();
      undoB.disabled = !hist.length || finished;
    }
    say(); render(); busy = true; api.later(runAuto, 700);
    if (TEST) window.__k2FC = {
      st: () => st,
      bot() { if (finished) return 'won'; if (busy) return 'busy'; const m = solverMove(); if (!m) return 'stuck'; doMove(m); return 'move'; }
    };
  }

  /* =========================================================
     SPIDER
     ========================================================= */
  const spNat = (a, b) => SUT(a) === SUT(b) && RNK(b) === RNK(a) + 1; // a sits on b, same suit, one lower
  function spRunStart(col, d) { let k = col.length - 1; while (k > d && spNat(col[k], col[k - 1])) k--; return k; }
  function spTidy(s, i) {
    const col = s.c[i];
    if (col.length >= 13 && col.length - 13 >= s.d[i]) {
      const b = col.length - 13; let ok = RNK(col[b]) === 13;
      for (let k = b + 1; ok && k < col.length; k++) ok = spNat(col[k], col[k - 1]);
      if (ok) { s.out.push(SUT(col[b])); col.length = b; }
    }
    if (col.length && s.d[i] >= col.length) s.d[i] = col.length - 1;
    if (!col.length) s.d[i] = 0;
  }
  const spClone = s => ({ c: s.c.map(x => x.slice()), d: s.d.slice(), k: s.k, out: s.out.slice(), stock: s.stock, runs: s.runs });
  function spApply(s, m) {
    if (m.deal) { const row = s.stock[s.k++]; row.forEach((id, i) => s.c[i].push(id)); s.c.forEach((_, i) => spTidy(s, i)); return; }
    const cards = s.c[m.i].splice(s.c[m.i].length - m.n); s.c[m.j].push(...cards); spTidy(s, m.i); spTidy(s, m.j);
  }
  function spMoves(s) {
    const out = [], empty = s.c.findIndex(c => !c.length);
    for (let i = 0; i < s.c.length; i++) {
      const col = s.c[i]; if (!col.length) continue;
      const m = spRunStart(col, s.d[i]), head = col[m], n = col.length - m;
      const onFit = m > s.d[i] && RNK(col[m - 1]) === RNK(head) + 1;
      for (let j = 0; j < s.c.length; j++) {
        if (j === i || !s.c[j].length) continue;
        const t = last(s.c[j]), k = col.length - (RNK(t) - 1 - RNK(col[col.length - 1])) - 1; // the one card in the run that fits
        if (k < m || k >= col.length) continue;
        if (k === m && onFit && SUT(t) !== SUT(head)) continue;
        out.push({ i, j, n: col.length - k });
      }
      if (empty >= 0 && m > 0) { out.push({ i, j: empty, n }); if (n > 1) out.push({ i, j: empty, n: 1 }); }
    }
    if (s.k < s.stock.length) out.push({ deal: true });
    return out;
  }
  const SPP = {
    w: .15,
    key: s => s.c.map((c, i) => String.fromCharCode(33 + s.d[i], ...c.map(x => x + 48))).sort().join('') + s.k,
    goal: s => s.out.length === s.runs,
    moves: spMoves,
    apply: (s, m) => { const t = spClone(s); spApply(t, m); return t; },
    h(s) {
      let h = (s.runs - s.out.length) * 40 + (s.stock.length - s.k) * s.c.length * 2;
      s.c.forEach((col, i) => {
        h += s.d[i] * 6;
        for (let k = s.d[i] + 1; k < col.length; k++) h += spNat(col[k], col[k - 1]) ? 0 : RNK(col[k - 1]) === RNK(col[k]) + 1 ? 2 : 3;
        if (!col.length) h -= 10;
      });
      return h;
    }
  };
  const spSolve = (s, budget) => bestFirst(spClone(s), SPP, budget);
  function spCfg(L) {
    if (L <= 1) return { C: 6, R: 3, D: 2, S: 1, up: 2 };
    if (L === 2) return { C: 7, R: 4, D: 3, S: 1, up: 2 };
    if (L === 3) return { C: 8, R: 5, D: 3, S: 1, up: 1 };
    if (L <= 5) return { C: 8, R: 6, D: 4, S: 1, up: 1 };
    if (L <= 9) return { C: 8, R: 4, D: 3, S: 2, up: 2 };
    return { C: 8, R: 5, D: 3, S: 2, up: 2 };
  }
  function spDeal(cfg) {
    const deck = []; for (let r = 0; r < cfg.R; r++) { const s = cfg.S === 1 ? 0 : r % 2; for (let k = 0; k < 13; k++) deck.push(s * 13 + k); }
    shuffle(deck);
    const T = deck.length - cfg.D * cfg.C, c = []; for (let i = 0; i < cfg.C; i++) c.push([]);
    for (let k = 0; k < T; k++) c[k % cfg.C].push(deck[k]);
    const stock = []; for (let r = 0; r < cfg.D; r++) stock.push(deck.slice(T + r * cfg.C, T + (r + 1) * cfg.C));
    return { c, d: c.map(col => Math.max(0, col.length - cfg.up)), k: 0, out: [], stock, runs: cfg.R };
  }
  function spPicker(L) { // one deal per step, so the screen stays responsive while we look for a winnable shuffle
    let cfg = spCfg(L), best = null, found = 0, tries = 0;
    const want = L <= 2 ? 4 : 1, t0 = Date.now();
    return function step() {
      const s = spDeal(cfg), r = spSolve(s, cfg.S === 2 ? 8000 : 15000); tries++;
      if (r.ok) { found++; const score = r.nodes + r.path.length * 3; if (!best || score < best.score) best = { s, score, path: r.path }; }
      if (best && (found >= want || Date.now() - t0 > 1500 || tries > 80)) return best;
      if (Date.now() - t0 > 1200 && !best) cfg = spCfg(cfg.S === 2 ? 6 : 2); // fall back to a gentler deal rather than keep waiting
      return null;
    };
  }
  function spPick(L) { const step = spPicker(L); let r; while (!(r = step())); return r; }
  function spPlan(s, path, plan = new Map()) { let t = spClone(s); for (const m of path) { plan.set(SPP.key(t), m); t = SPP.apply(t, m); } return plan; }

  function startSpider(L, api) {
    const W = api.stage.clientWidth || 340, step = spPicker(L);
    api.hint('Shuffling the cards…');
    const tick = () => { const r = step(); if (r) play(r); else api.later(tick, 20); };
    api.later(tick, 40); // let the message paint first
  function play(picked) {
    let st = picked.s, plan = spPlan(st, picked.path); // the checked solution doubles as a fast hint book
    const NC = st.c.length, g = W < 520 ? 4 : 8, cw = fitCw(W, NC, g, 34, 60), ch = Math.round(cw * 1.4), colH = Math.round(ch * 5.2), minOff = Math.max(23, Math.round(ch * .25));
    let hist = [], sel = null, mark = null, hints = 0, undos = 0, finished = false, busy = false, fresh = new Set(), freshAll = false;
    const board = el('div'); board.style.setProperty('--cw', cw + 'px'); board.style.setProperty('--g', g + 'px');
    const top = el('div', 'k2-row'), cols = el('div', 'k2-row k2-cols');
    top.style.gridTemplateColumns = cols.style.gridTemplateColumns = `repeat(${NC}, ${cw}px)`;
    board.append(top, cols);
    const bar = el('div', 'k2-bar');
    const undoB = btn('↶ Undo', 'c-card', () => { if (busy || finished || !hist.length) return; sfx.tap(); st = JSON.parse(hist.pop()); undos++; sel = null; mark = null; say(); render(); });
    const hintB = btn('💡 Hint', 'c-sun', () => { if (busy || finished) return; sfx.tap(); hints++; showHint(); });
    bar.append(undoB, hintB);
    api.stage.append(board, bar);
    const two = st.c.flat().concat(st.stock.flat()).some(id => SUT(id) === 1);
    const say = () => api.hint(`Build down from King to Ace${two ? ' in the same suit' : ''}. A full run clears away! Tap a card, then tap where it goes. Tap the deck for more cards.`);
    api.rounds(st.runs, 0);
    const nm = id => cshort(id);
    function legalFrom(i, k) { const col = st.c[i]; return k >= st.d[i] && k >= spRunStart(col, st.d[i]); }
    function moveFor(src, j) {
      if (src.i === j) return { err: 'Pick a different column.' };
      const col = st.c[src.i], cards = col.slice(src.k), dst = st.c[j];
      if (!dst.length) { if (src.k === 0) return { err: 'Those cards already make a whole column.' }; return { m: { i: src.i, j, n: cards.length } }; }
      const t = last(dst), off = cards.findIndex(id => RNK(t) === RNK(id) + 1);
      if (off < 0) return { err: RNK(t) === 1 ? 'Nothing goes on an Ace.' : `The ${nm(t)} needs a ${RK[RNK(t) - 1]} on it.` };
      return { m: { i: src.i, j, n: cards.length - off } };
    }
    const save = () => hist.push(JSON.stringify(st));
    function after(prevOut) {
      sel = null; mark = null;
      api.rounds(st.runs, st.out.length);
      if (st.out.length > prevOut) {
        sfx.good(); sparkle(440); if (st.out.length < st.runs) toast(cheer() + '! A full run');
        api.hint(st.out.length < st.runs ? `A full run from King to Ace, cleared away! ${st.runs - st.out.length} to go.` : 'Every run is complete!');
      }
      render();
      if (st.out.length === st.runs) win();
    }
    function doMove(m) {
      save(); const o = st.out.length, moved = st.c[m.i].slice(-m.n); spApply(st, m);
      moved.forEach((_, q) => fresh.add(m.j + ':' + (st.c[m.j].length - m.n + q)));
      tone(480, .08, 'triangle', .09); after(o);
    }
    function deal() {
      if (busy || finished) return;
      sel = null; mark = null;
      if (st.k >= st.stock.length) { sfx.soft(); api.hint('The deck is empty. Move cards on the table instead.'); render(); return; }
      save(); const o = st.out.length; spApply(st, { deal: true }); freshAll = true;
      [0, 1, 2].forEach(q => tone(500 + q * 60, .07, 'triangle', .07, q * .05));
      if (st.out.length === o) api.hint(`A new row of cards is dealt. ${st.stock.length - st.k ? (st.stock.length - st.k) + ' more in the deck.' : 'The deck is now empty.'}`);
      after(o);
    }
    function autoGo() {
      const src = sel, cards = st.c[src.i].slice(src.k), opts = [];
      for (let j = 0; j < NC; j++) { if (!st.c[j].length) continue; const r = moveFor(src, j); if (r.m) opts.push({ r, same: SUT(last(st.c[j])) === SUT(st.c[src.i][st.c[src.i].length - r.m.n]) }); }
      opts.sort((a, b) => b.same - a.same || b.r.m.n - a.r.m.n);
      if (opts.length) return doMove(opts[0].r.m);
      const e = st.c.findIndex(c => !c.length);
      if (e >= 0 && src.k > 0) return doMove({ i: src.i, j: e, n: cards.length });
      sfx.soft(); sel = null; api.hint('That has nowhere to go just now. Try another card, or tap 💡 Hint.'); render();
    }
    function tapCard(i, k) {
      if (busy || finished) return;
      if (sel) {
        if (sel.i === i) { if (sel.k === k) return autoGo(); }
        else { const r = moveFor(sel, i); if (r.m) return doMove(r.m); sfx.soft(); sel = null; api.hint(r.err); render(); return; }
      }
      if (k < st.d[i]) { sfx.soft(); sel = null; api.hint('That card is face down. It turns over when the cards on top of it move away.'); render(); return; }
      if (!legalFrom(i, k)) { sfx.soft(); sel = null; api.hint(`Only cards in order${two ? ' and the same suit' : ''} can move together. Try a lower card.`); render(); return; }
      sel = { i, k }; mark = null; sfx.tap();
      api.hint('Picked up! Tap a glowing column, or tap the card again to send it to the best spot.'); render();
    }
    function tapCol(i) { if (busy || finished || !sel) return; const r = moveFor(sel, i); if (r.m) return doMove(r.m); sfx.soft(); sel = null; api.hint(r.err); render(); }
    function solverMove() {
      const k = SPP.key(st); if (plan.has(k)) return plan.get(k);
      const r = spSolve(st, 15000); if (!r.ok) return undefined;
      spPlan(st, r.path, plan); return r.path[0] || null;
    }
    function showHint() {
      sel = null; let m = solverMove();
      if (m === undefined) { // no sure path found: suggest the most promising move instead
        const opts = spMoves(st).filter(x => !x.deal).map(x => ({ x, h: SPP.h(SPP.apply(st, x)) })).sort((a, b) => a.h - b.h);
        m = opts.length && opts[0].h < SPP.h(st) ? opts[0].x : st.k < st.stock.length ? { deal: true } : opts.length ? opts[0].x : null;
      }
      if (!m) { mark = null; api.hint(hist.length ? 'This way looks stuck. Tap ↶ Undo a few times and try another way.' : 'Try moving any card in order.'); }
      else if (m && m.deal) { mark = { deal: true }; api.hint('Tap the deck to deal a new row of cards.'); }
      else if (m) {
        mark = m; const col = st.c[m.i], head = col[col.length - m.n];
        api.hint(`Move ${m.n > 1 ? 'the cards from the ' + nm(head) + ' down' : 'the ' + nm(head)} ${st.c[m.j].length ? 'onto the ' + nm(last(st.c[m.j])) : 'into the empty column'}.`);
      }
      render();
    }
    function win() {
      if (finished) return; finished = true; busy = true;
      api.hint('Every run is complete and the table is clear. ' + cheer() + '!');
      sparkle(); top.querySelectorAll('.k2-card').forEach(e => wob(e));
      api.done(Math.max(2, starsFor(hints + Math.floor(undos / 3), 2, 6)));
    }
    function render() {
      top.innerHTML = ''; cols.innerHTML = '';
      const left = st.stock.length - st.k;
      const sk = left ? cardEl(null, false) : slotEl('');
      if (left) sk.append(el('em', 'k2-n', String(left)));
      sk.setAttribute('aria-label', 'Deck: deal a new row'); if (mark && mark.deal) sk.classList.add('k2-hint'); sk.onclick = deal;
      top.append(sk);
      const done = el('div', 'k2-done'); done.style.cssText = `grid-column:2 / span ${NC - 1}; display:flex; align-items:center; gap:4px; padding-left:8px`;
      for (let q = 0; q < st.runs; q++) {
        const s = st.out[q];
        const e = s === undefined ? slotEl('') : cardEl(s * 13 + 12, true, q === st.out.length - 1 ? 'k2-in' : '', 'span');
        e.style.marginLeft = q ? -Math.round(cw * .5) + 'px' : '0'; if (s === undefined) e.style.opacity = '.35'; e.style.cursor = 'default';
        done.append(e);
      }
      top.append(done);
      const tg = new Set(); if (sel) for (let j = 0; j < NC; j++) if (moveFor(sel, j).m) tg.add(j);
      st.c.forEach((col, i) => {
        const ce = el('div', 'k2-col'); ce.onclick = () => tapCol(i);
        const nd = st.d[i], nu = col.length - nd; let dd = ch * .14, du = Math.max(minOff, ch * .32);
        const need = nd * dd + Math.max(0, nu - 1) * du, room = colH - ch;
        if (need > room) { dd = Math.max(8, dd * Math.min(1, room / need)); if (nu > 1) du = Math.max(minOff, Math.min(du, (room - nd * dd) / (nu - 1))); }
        ce.style.height = Math.max(colH, ch + nd * dd + Math.max(0, nu - 1) * du) + 'px';
        if (!col.length) { const sl = slotEl(''); sl.style.opacity = '.7'; if (tg.has(i)) sl.classList.add('k2-tgt'); if (mark && mark.j === i) sl.classList.add('k2-hint'); ce.append(sl); }
        let y = 0;
        col.forEach((id, k) => {
          const up = k >= nd, e = cardEl(id, up, freshAll && k === col.length - 1 ? 'k2-in' : fresh.has(i + ':' + k) ? 'k2-in' : (up && k === nd && hist.length && k === col.length - 1 ? 'k2-flip' : ''));
          e.style.top = Math.round(y) + 'px'; y += up ? du : dd;
          if (sel && sel.i === i && k >= sel.k) e.classList.add('k2-sel');
          if (mark && !mark.deal && mark.i === i && k >= col.length - mark.n) e.classList.add('k2-hint');
          if (k === col.length - 1) { if (tg.has(i)) e.classList.add('k2-tgt'); if (mark && mark.j === i) e.classList.add('k2-hint'); }
          e.onclick = ev => { ev.stopPropagation(); tapCard(i, k); };
          ce.append(e);
        });
        cols.append(ce);
      });
      fresh = new Set(); freshAll = false;
      undoB.disabled = !hist.length || finished;
    }
    say(); render();
    if (TEST) window.__k2Sp = {
      st: () => st,
      bot() { if (finished) return 'won'; const m = solverMove(); if (!m) return 'stuck'; if (m.deal) deal(); else doMove(m); return 'move'; }
    };
  }
  }

  /* =========================================================
     OLD MAID
     ========================================================= */
  function startOldMaid(L, api) {
    const W = api.stage.clientWidth || 340;
    const nF = L >= 4 ? 2 : 1, nR = L <= 1 ? 6 : L === 2 ? 8 : L <= 5 ? 10 : 13;
    const ranks = []; for (let r = 1; ranks.length < nR - 1; r++) if (r !== 12) ranks.push(r); ranks.push(12);
    const deck = [];
    ranks.forEach(r => { for (let s = 0; s < 4; s++) { if (r === 12 && s === 3) continue; deck.push({ r, s, om: r === 12 && s === 0 }); } });
    shuffle(deck);
    const pals = shuffle(PALS.slice()).slice(0, nF);
    const players = [{ n: 'You', hand: [], you: true }].concat(pals.map(P => ({ n: P.n, P, hand: [] })));
    deck.forEach((c, k) => players[k % players.length].hand.push(c));
    const helpYou = [0, .6, .45, .3][L] || 0, takeOM = [0, .6, .45, .35][L] || 0; // quiet kindness on the easiest levels
    const cwBig = W < 520 ? 54 : 66, cwMid = W < 520 ? 44 : 52;
    let phase = 'deal', over = false, src = 1, fresh = null, picking = -1, pairs = 0, lastPair = null, firstOut = -1, bars = [];
    const root = el('div'); api.stage.append(root);
    const active = () => players.filter(p => p.hand.length).length;
    const nextFrom = i => { for (let q = 1; q <= players.length; q++) { const j = (i + q) % players.length; if (j !== i && players[j].hand.length) return j; } return -1; };
    const sortYou = () => players[0].hand.sort((a, b) => (a.om ? 99 : a.r) - (b.om ? 99 : b.r) || a.s - b.s);
    function pairUp(p) {
      const made = [];
      for (;;) {
        const seen = {}; let found = null;
        for (const c of p.hand) { if (c.om) continue; if (seen[c.r]) { found = [seen[c.r], c]; break; } seen[c.r] = c; }
        if (!found) break;
        p.hand = p.hand.filter(c => c !== found[0] && c !== found[1]); made.push(found); pairs++; lastPair = found;
      }
      return made;
    }
    const nm = p => p.you ? 'you' : p.n;
    const outCheck = (p, idx) => { if (!p.hand.length && firstOut < 0) firstOut = idx; };
    const JOKES = ['"Ooh, that\'s a nice one!"', '"Shuffle, shuffle…"', '"I\'ll never tell where she is!"', '"Hmm, which one shall I pick?"', '"Lovely game, this."'];
    function begin() {
      const made = players.map(pairUp);
      players.forEach((p, i) => outCheck(p, i));
      sortYou(); sfx.good();
      api.hint(`Pairs go into the middle: you put down ${made[0].length} pair${made[0].length === 1 ? '' : 's'}${pals.map((P, k) => `, ${P.n} ${made[k + 1].length}`).join('')}.`);
      render();
      api.later(() => turn(0), 2000);
    }
    function turn(i) {
      if (over || !api.stage.isConnected) return;
      if (active() <= 1) return end();
      if (!players[i].hand.length) return turn((i + 1) % players.length);
      src = nextFrom(i);
      if (i === 0) {
        phase = 'you';
        api.hint(`Your turn! Tap one of ${players[src].n}'s cards to take it.`);
        render();
      } else {
        phase = 'cpu'; render();
        api.hint(`${players[i].n}'s turn: ${players[i].P.p} takes a card from ${nm(players[src])}${src === 0 ? 'r hand' : ''}…`);
        api.later(() => cpuTake(i), 1300);
      }
    }
    function after(taker, from, c, msg) {
      const tp = players[taker], made = pairUp(tp); if (taker === 0) sortYou();
      outCheck(players[from], from); outCheck(tp, taker);
      let m = msg;
      if (made.length) { m += taker === 0 ? ` It makes a pair of ${RNP[c.r]}! Into the middle they go.` : ` ${tp.P.p === 'she' ? 'She' : 'He'} makes a pair of ${RNP[c.r]}.`; tone(660, .1, 'sine', .1); tone(880, .14, 'sine', .1, .1); }
      if (!players[from].hand.length && active() > 1) m += ` ${players[from].you ? 'You have' : players[from].n + ' has'} no cards left. Out!`;
      if (!tp.hand.length && active() > 1) m += ` ${tp.you ? 'You have' : tp.n + ' has'} no cards left. Out! 🎉`;
      api.hint(m); render();
      api.later(() => turn((taker + 1) % players.length), 2000);
    }
    function youTake(k) {
      if (phase !== 'you' || over) return;
      const sp = players[src];
      if (sp.hand[k].om && sp.hand.length > 1 && Math.random() < helpYou) { const o = (k + 1 + randInt(sp.hand.length - 1)) % sp.hand.length; [sp.hand[k], sp.hand[o]] = [sp.hand[o], sp.hand[k]]; }
      const c = sp.hand.splice(k, 1)[0]; players[0].hand.push(c); fresh = c; phase = 'wait';
      if (c.om) { sfx.soft(); talk(bars[src - 1]); }
      else tone(520, .1, 'triangle', .1);
      after(0, src, c, c.om ? `Oh dear, you picked up the Old Maid! 👒 Don't worry, you can pass her on.` : `You took the ${cshort(c)} from ${sp.n}.`);
    }
    function cpuTake(i) {
      if (over || !api.stage.isConnected) return;
      const sp = players[src], me = players[i];
      let k = randInt(sp.hand.length);
      if (src === 0) { const o = sp.hand.findIndex(c => c.om); if (o >= 0 && Math.random() < takeOM) k = o; }
      const go = () => {
        const c = sp.hand.splice(k, 1)[0]; me.hand.push(c); picking = -1;
        shuffle(me.hand); talk(bars[i - 1]);
        let msg;
        if (src === 0) msg = c.om ? `${me.n} took the Old Maid from you! 😄 "Oh, you rascal!"` : `${me.n} took your ${cshort(c)}.`;
        else msg = `${me.n} took a card from ${sp.n}. ${pick(JOKES)}`;
        if (c.om && src === 0) sfx.good(); else tone(400, .1, 'triangle', .08);
        after(i, src, c, msg);
      };
      if (src === 0) { picking = k; render(); api.later(go, 1000); } else go();
    }
    function end() {
      over = true; phase = 'over';
      const loser = players.findIndex(p => p.hand.length);
      render();
      if (loser === 0) { sfx.soft(); api.hint('You\'re left holding the Old Maid! 👒 She\'s lovely company. What a fun game, well played!'); api.later(() => api.done(1), 2200); }
      else {
        sfx.good(); sparkle();
        api.hint(`${loser > 0 ? players[loser].n + ' is' : 'Someone is'} left holding the Old Maid! 😄 You win. ${cheer()}!`);
        api.later(() => api.done(firstOut === 0 || nF === 1 ? 3 : 2), 1800);
      }
    }
    function fan(hand, up, cw, onTap, opts = {}) {
      const row = el('div', 'k2-fan'); row.style.setProperty('--cw', cw + 'px');
      const step = fanStep(W, hand.length, cw, up ? .78 : .7);
      hand.forEach((c, k) => {
        const e = cardEl(c, up, (c === fresh ? 'k2-in ' : '') + (k === opts.lift ? 'k2-sel ' : '') + (opts.glow ? 'k2-tgt' : ''), onTap ? 'button' : 'span');
        if (k) e.style.marginLeft = Math.round(step - cw) + 'px';
        if (onTap) { e.onclick = () => onTap(k); e.setAttribute('aria-label', `Take card ${k + 1} of ${hand.length}`); }
        row.append(e);
      });
      return row;
    }
    function render() {
      root.innerHTML = ''; bars = [];
      players.slice(1).forEach((p, j) => {
        const { o, face, info } = oppBar(p.P); bars.push(face);
        const n = p.hand.length;
        info.append(el('span', 'k2-oname', p.n), el('span', 'k2-ocount', n ? `${n} card${n === 1 ? '' : 's'}` : (over ? 'Out' : 'Out! 🎉')));
        const showBig = phase === 'you' && src === j + 1;
        if (over && n) { info.append(el('span', 'k2-ocount', 'has the Old Maid 👒')); }
        if (!showBig && n) { const b = el('div', 'k2-backs'); for (let k = 0; k < Math.min(n, 12); k++) b.append(cardEl(null, false, '', 'span')); info.append(b); }
        if (showBig) o.classList.add('k2-on');
        root.append(o);
        if (showBig) { const f = fan(p.hand, false, cwBig, youTake, { glow: true }); f.style.marginBottom = "14px"; root.append(f); }
        if (over && n) root.append(fan(p.hand, true, cwMid, null));
      });
      const mid = el('div', 'k2-mid'); mid.style.setProperty('--cw', cwMid + 'px');
      if (lastPair) {
        const pr = el('div', 'k2-pair'); pr.style.width = Math.round(cwMid * 1.5) + 'px';
        lastPair.forEach((c, q) => { const e = cardEl(c, true, 'k2-in', 'span'); e.style.left = Math.round(q * cwMid * .5) + 'px'; e.style.transform = `rotate(${q ? 8 : -6}deg)`; pr.append(e); });
        mid.append(pr);
      }
      mid.append(el('div', 'k2-ocount', `${pairs} pair${pairs === 1 ? '' : 's'}<br>in the middle`));
      root.append(mid);
      const you = players[0];
      root.append(el('p', 'k2-lbl', you.hand.length ? 'Your cards' : (over ? 'You have no cards: you\'re safe!' : 'You have no cards left!')));
      if (you.hand.length) root.append(fan(you.hand, true, cwBig, null, { lift: picking }));
      fresh = null;
    }
    render();
    api.hint('Dealing the cards…');
    api.later(begin, 1200);
    if (TEST) window.__k2OM = { bot() { if (over) return 'over'; if (phase !== 'you') return 'wait'; youTake(randInt(players[src].hand.length)); return 'move'; }, players: () => players };
  }

  /* =========================================================
     RUMMY (7 cards)
     ========================================================= */
  function meldsOf(h) {
    const cands = [], byR = {};
    h.forEach((c, i) => (byR[c.r] = byR[c.r] || []).push(i));
    for (const r in byR) {
      const ix = byR[r];
      if (ix.length === 4) { cands.push(ix.slice()); for (let x = 0; x < 4; x++) cands.push(ix.filter((_, q) => q !== x)); }
      else if (ix.length === 3) cands.push(ix.slice());
    }
    for (let s = 0; s < 4; s++) {
      const ix = h.map((c, i) => i).filter(i => h[i].s === s).sort((a, b) => h[a].r - h[b].r);
      for (let a = 0; a < ix.length; a++) for (let b = a + 1; b < ix.length && h[ix[b]].r === h[ix[b - 1]].r + 1; b++) if (b - a >= 2) cands.push(ix.slice(a, b + 1));
    }
    let best = [], bestN = 0;
    (function dfs(start, used, chosen, n) {
      if (n > bestN) { bestN = n; best = chosen.slice(); }
      for (let k = start; k < cands.length; k++) {
        const m = cands[k]; if (m.some(i => used & (1 << i))) continue;
        let u = used; m.forEach(i => u |= 1 << i); chosen.push(m); dfs(k + 1, u, chosen, n + m.length); chosen.pop();
      }
    })(0, 0, [], 0);
    return { groups: best, n: bestN };
  }
  function rmScore(h) {
    const { groups, n } = meldsOf(h), used = new Set(groups.flat());
    const loose = h.filter((_, i) => !used.has(i)); let part = 0;
    for (let a = 0; a < loose.length; a++) for (let b = a + 1; b < loose.length; b++) {
      const x = loose[a], y = loose[b];
      if (x.r === y.r) part += 3; else if (x.s === y.s && Math.abs(x.r - y.r) <= 2) part += 3 - Math.abs(x.r - y.r);
    }
    return n * 10 + part - loose.reduce((t, c) => t + c.r, 0) * .05;
  }
  function rmBestDiscard(h) { let bi = 0, bs = -1e9; h.forEach((c, i) => { const s = rmScore(h.filter((_, q) => q !== i)); if (s > bs) { bs = s; bi = i; } }); return { i: bi, score: bs }; }

  function startRummy(L, api) {
    const W = api.stage.clientWidth || 340, P = pick(PALS), He = P.p === 'she' ? 'She' : 'He';
    const cw = W < 520 ? 52 : 64;
    const smart = Math.min(.85, .25 + (L - 1) * .1), help = [0, .45, .35, .25][L] || .12, noWinBefore = L <= 1 ? 6 : L <= 3 ? 4 : 0;
    const deck = shuffle(newDeck());
    let you = deck.splice(0, 7), cpu = deck.splice(0, 7), disc = [deck.pop()], stock = deck;
    let phase = 'draw', sel = null, turnNo = 1, hints = 0, over = false, fresh = null, mark = null, reveal = false, okFlash = 0;
    const root = el('div'); root.style.setProperty('--cw', cw + 'px');
    const { o, face, info } = oppBar(P);
    const mid = el('div', 'k2-mid'), handBox = el('div'), note = el('p', 'k2-note');
    const bar = el('div', 'k2-bar');
    const discB = btn('⬇ Discard', 'c-coral', () => discard());
    const hintB = btn('💡 Hint', 'c-sun', () => { if (over || phase === 'cpu') return; sfx.tap(); hints++; showHint(); });
    bar.append(discB, hintB);
    root.append(o, mid, handBox, note, bar);
    api.stage.append(root);
    const full = h => meldsOf(h).n === h.length;
    function refill() { if (!stock.length) { const t = disc.pop(); stock = shuffle(disc); disc = [t]; api.toast('The discard pile is shuffled into a new deck'); } }
    function yourTurn(msg) {
      phase = 'draw'; sel = null; mark = null;
      api.hint((msg ? msg + ' ' : '') + 'Your turn: take a card from the deck or the discard pile.'); render();
    }
    function draw(fromDisc) {
      if (over) return;
      if (phase !== 'draw') { sfx.soft(); api.hint(phase === 'discard' ? 'You have your card. Now tap a card to let go of, then tap Discard.' : `Wait a moment, it's ${P.n}'s turn.`); return; }
      let c;
      if (fromDisc) c = disc.pop();
      else {
        refill();
        const boost = turnNo > 12 ? .7 : help;
        if (Math.random() < boost) { // quietly bring a useful card to the top
          const base = rmScore(you); let bi = -1, bs = base;
          stock.forEach((x, k) => { const s = rmBestDiscard(you.concat([x])).score; if (s > bs + 2) { bs = s; bi = k; } });
          if (bi >= 0) stock.push(stock.splice(bi, 1)[0]);
        }
        c = stock.pop();
      }
      you.push(c); fresh = c; phase = 'discard'; mark = null; tone(520, .1, 'triangle', .1);
      if (full(you)) return youWin(`Every card is in a set or a run!`);
      api.hint(`You took the ${cshort(c)}. Now tap a card you don't need, then tap Discard.`); render();
    }
    function tapHand(c) {
      if (over) return;
      if (phase !== 'discard') { sfx.soft(); api.hint(phase === 'draw' ? 'First take a card from the deck or the discard pile.' : `Wait a moment, it's ${P.n}'s turn.`); return; }
      sel = sel === c ? null : c; mark = null; sfx.tap();
      api.hint(sel ? `The ${cshort(sel)} is ready to go. Tap ⬇ Discard, or pick a different card.` : 'Tap a card you don\'t need, then tap Discard.'); render();
    }
    function discard() {
      if (over || phase !== 'discard') return;
      if (!sel) { sfx.soft(); api.hint('First tap the card you want to let go of.'); return; }
      const c = sel; you = you.filter(x => x !== c); disc.push(c); sel = null; mark = null; tone(360, .1, 'sine', .09);
      if (full(you)) return youWin('All seven cards are in sets and runs!');
      phase = 'cpu'; api.hint(`You put down the ${cshort(c)}. Now it's ${P.n}'s turn…`); render();
      api.later(cpuTurn, 1400);
    }
    function youWin(msg) {
      over = true; phase = 'over'; sel = null; render(); sfx.good(); sparkle();
      handBox.querySelectorAll('.k2-card').forEach((e, k) => api.later(() => wob(e), k * 60));
      api.hint(`Rummy! ${msg} You win. ${cheer()}!`);
      api.later(() => api.done(hints <= 1 ? 3 : 2), 1800);
    }
    function cpuTurn() {
      if (over || !api.stage.isConnected) return;
      talk(face);
      const top = last(disc), base = rmBestDiscard(cpu.concat([top]));
      const useful = meldsOf(cpu.concat([top])).n > meldsOf(cpu).n || base.score > rmScore(cpu) + 4;
      let took;
      if (top && useful && Math.random() < smart + .1) { took = disc.pop(); api.hint(`${P.n} takes the ${cshort(took)} from the discard pile.`); }
      else { refill(); took = stock.pop(); api.hint(`${P.n} takes a card from the deck.`); }
      cpu.push(took); tone(420, .1, 'triangle', .08); render();
      api.later(() => {
        if (over || !api.stage.isConnected) return;
        let k;
        if (Math.random() < smart) k = rmBestDiscard(cpu).i;
        else { const used = new Set(meldsOf(cpu).groups.flat()), loose = cpu.map((_, i) => i).filter(i => !used.has(i)); k = loose.length ? pick(loose) : randInt(cpu.length); }
        if (turnNo < noWinBefore && full(cpu.filter((_, q) => q !== k))) { // early on, the friend is a little dreamy
          const opts = cpu.map((_, i) => i).filter(i => !full(cpu.filter((_, q) => q !== i))); if (opts.length) k = pick(opts);
        }
        const c = cpu.splice(k, 1)[0]; disc.push(c); fresh = c; talk(face); tone(330, .1, 'sine', .08);
        if (full(cpu)) {
          over = true; phase = 'over'; reveal = true; render(); sfx.soft();
          api.hint(`${P.n} puts down the ${cshort(c)} and says "Rummy!" ${He} made all ${P.p === 'she' ? 'her' : 'his'} sets this time. What a lovely game, well played!`);
          api.later(() => api.done(1), 2400); return;
        }
        turnNo++;
        yourTurn(`${P.n} puts down the ${cshort(c)}.`);
      }, 1500);
    }
    function showHint() {
      if (phase === 'draw') {
        const top = last(disc), better = top && rmBestDiscard(you.concat([top])).score > rmScore(you) + 4;
        mark = better ? 'disc' : 'stock';
        api.hint(better ? `Take the ${cshort(top)} from the discard pile. It goes nicely with your cards.` : 'Take a card from the deck. The discard pile won\'t help just now.');
      } else if (phase === 'discard') {
        const b = rmBestDiscard(you); mark = you[b.i]; sel = null;
        api.hint(`Let go of the ${cshort(you[b.i])}. It doesn't fit with your other cards yet.`);
      }
      render();
    }
    function handRow(h, tappable) {
      const { groups } = meldsOf(h), used = new Set(groups.flat());
      const order = []; groups.forEach((g, gi) => g.slice().sort((a, b) => h[a].r - h[b].r).forEach(i => order.push({ c: h[i], g: gi })));
      h.map((c, i) => i).filter(i => !used.has(i)).sort((a, b) => h[a].s - h[b].s || h[a].r - h[b].r).forEach(i => order.push({ c: h[i], g: -1 }));
      const n = order.length, gaps = groups.length * 8, step = n > 1 ? Math.max(cw * .3, Math.min(cw * .82, (W - 6 - cw - gaps) / (n - 1))) : 0;
      const row = el('div', 'k2-fan'); row.style.paddingBottom = '14px';
      order.forEach((x, k) => {
        const e = cardEl(x.c, true, (x.c === fresh ? 'k2-in ' : '') + (x.c === sel ? 'k2-sel ' : '') + (x.c === mark ? 'k2-hint ' : '') + (x.g >= 0 ? 'k2-g k2-g' + (x.g % 3) : ''), tappable ? 'button' : 'span');
        if (x.g >= 0) e.append(el('em', 'k2-gb', ['●', '★', '▲'][x.g % 3]));
        if (k) e.style.marginLeft = Math.round(step - cw + (x.g !== order[k - 1].g ? 8 : 0)) + 'px';
        if (tappable) e.onclick = () => tapHand(x.c);
        row.append(e);
      });
      return { row, n: used.size };
    }
    function render() {
      info.innerHTML = '';
      info.append(el('span', 'k2-oname', P.n), el('span', 'k2-ocount', `${cpu.length} cards`));
      if (reveal) { info.append(el('span', 'k2-ocount', 'Rummy! ✨')); }
      else { const b = el('div', 'k2-backs'); cpu.forEach(() => b.append(cardEl(null, false, '', 'span'))); info.append(b); }
      handBox.innerHTML = '';
      if (reveal) { const r = handRow(cpu, false); r.row.style.setProperty('--cw', Math.round(cw * .85) + 'px'); handBox.append(el('p', 'k2-lbl', `${P.n}'s cards`), r.row); }
      mid.innerHTML = '';
      const sk = stock.length ? cardEl(null, false, phase === 'draw' ? 'k2-tgt' : '') : slotEl('↻');
      if (stock.length) sk.append(el('em', 'k2-n', String(stock.length)));
      if (mark === 'stock') sk.classList.add('k2-hint');
      sk.setAttribute('aria-label', 'Deck'); sk.onclick = () => draw(false);
      const top = last(disc), de = top ? cardEl(top, true, (top === fresh ? 'k2-in ' : '') + (phase === 'draw' ? 'k2-tgt ' : '') + (mark === 'disc' ? 'k2-hint' : '')) : slotEl('');
      de.onclick = () => top ? draw(true) : null;
      const wrap = (e, t) => { const w = el('div', 'k2-hand'); w.append(e, el('span', '', t)); return w; };
      mid.append(wrap(sk, 'Deck'), wrap(de, 'Discard'));
      const r = handRow(you, true);
      handBox.append(r.row);
      note.textContent = r.n ? `${r.n} of your ${you.length} cards are in sets or runs.` : 'Sets are 3 or 4 of a kind. Runs are 3 or more in a row, same suit.';
      discB.disabled = !(phase === 'discard' && sel); discB.hidden = over; hintB.hidden = over;
      fresh = null;
    }
    yourTurn('Make sets (3 or 4 of a kind) and runs (3 or more in a row in one suit).');
    if (TEST) window.__k2Rm = {
      bot() {
        if (over) return 'over';
        if (phase === 'draw') { const top = last(disc); draw(!!top && rmBestDiscard(you.concat([top])).score > rmScore(you) + 4); return 'draw'; }
        if (phase === 'discard') { sel = you[rmBestDiscard(you).i]; discard(); return 'discard'; }
        return 'wait';
      }
    };
  }

  if (TEST) window.__k2 = { SPP, bestFirst, spClone, fcSolve, fcLayout, spSolve, spDeal, spCfg, spPick, fcPick, meldsOf, clockSim, clockDeal };
})();
