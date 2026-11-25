/* Recall: Cards & Board Games, batch 2: Bingo, Dice Pairs, Tile Match, Dominoes (double six) */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, CUBES } = R;

  R.css(`
/* shared */
.b2-wrap{display:flex;flex-direction:column;align-items:center;gap:12px;max-width:640px;margin:0 auto;color:var(--on-table)}
.b2-row{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
.b2-row .btn{min-height:58px;padding:.5em .9em;font-size:1.1rem}
.b2-chip{display:inline-flex;align-items:center;gap:6px;font:600 1.1rem var(--display);background:rgba(0,0,0,.22);padding:.3em .8em;border-radius:999px;white-space:nowrap}
.b2-chip b{font-size:1.3rem;color:var(--sun)}
.b2-pips{display:grid;grid-template:repeat(3,1fr)/repeat(3,1fr);width:100%;height:100%}
.b2-pips i{border-radius:50%;margin:14%}
.b2-pips i.on{background:radial-gradient(circle at 35% 30%,#5A6670,#141C22 70%);box-shadow:inset 0 2px 1px rgba(0,0,0,.4)}
.b2-glow{animation:b2-glowk 1s ease-in-out infinite}
@keyframes b2-glowk{50%{box-shadow:0 0 0 6px var(--sun),0 0 26px 8px rgba(255,194,52,.8)}}
@keyframes b2-in{from{transform:translateY(-30px) scale(.6);opacity:0}}
@keyframes b2-pop{0%{transform:scale(1)}40%{transform:scale(1.2)}100%{transform:scale(0);opacity:0}}

/* Bingo */
.b2-btop{display:flex;align-items:center;gap:14px;width:100%;justify-content:center}
.b2-ball{--c:var(--sun);--d:var(--sun-d);flex:none;width:96px;height:96px;border-radius:50%;display:grid;place-items:center;
  background:radial-gradient(circle at 32% 26%,#fff 0 7%,var(--c) 38%,var(--d) 100%);box-shadow:0 8px 0 rgba(0,0,0,.18),0 12px 20px rgba(0,0,0,.35)}
.b2-ball b{display:grid;place-items:center;width:62%;height:62%;border-radius:50%;background:#fff;color:var(--ink);font:700 2.1rem/1 var(--display);box-shadow:inset 0 -3px 0 rgba(0,0,0,.12)}
.b2-ball.b2-new{animation:b2-roll .7s cubic-bezier(.3,1.4,.5,1)}
@keyframes b2-roll{from{transform:translateX(-90px) rotate(-300deg);opacity:0}}
.b2-ball.b2-empty{--c:#9FB8BC;--d:#6E8A8E}
.b2-call{min-width:0;flex:1 1 auto;max-width:300px}
.b2-call .b2-phrase{font:700 1.45rem/1.15 var(--display)}
.b2-call .b2-say{font:600 1.15rem var(--display);color:var(--on-table-soft)}
.b2-recent{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.b2-recent span{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#fff;color:var(--ink);font:700 1rem var(--display);box-shadow:0 3px 0 rgba(0,0,0,.25);opacity:.85}
.b2-card{display:grid;grid-template-columns:repeat(var(--n),var(--cs));gap:7px;padding:10px;border-radius:22px;background:linear-gradient(180deg,#FFF9EF,#F1E4CB);box-shadow:0 7px 0 var(--card-edge),0 14px 24px rgba(0,0,0,.3)}
.b2-cell{position:relative;width:var(--cs);height:var(--cs);border-radius:16px;font:700 var(--cf)/1 var(--display);cursor:pointer;padding:0}
.b2-cell.b2-free{font-size:1rem;cursor:default}
.b2-cell.b2-mk::after{content:"";position:absolute;inset:12%;border-radius:50%;background:radial-gradient(circle at 40% 35%,rgba(255,143,168,.85),rgba(242,90,149,.78));box-shadow:0 0 0 3px rgba(174,42,95,.45)}
.b2-cell.b2-mk::before{content:"✓";position:absolute;right:3px;top:1px;z-index:2;font:700 1rem var(--display);color:var(--berry-d)}
.b2-cell span{position:relative;z-index:1}
.b2-cell.b2-glow{outline:5px solid var(--sun);outline-offset:2px}
.b2-cell.b2-win{outline:5px solid var(--leaf);outline-offset:1px}
.b2-players{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.b2-bingobtn{font-size:1.4rem!important}
.b2-bingobtn.b2-ready{animation:b2-glowk 1s ease-in-out infinite}

/* Dice Pairs */
.b2-dice{display:flex;gap:10px;justify-content:center;padding:12px 6px 22px;border-radius:24px;background:rgba(0,0,0,.18);box-shadow:inset 0 4px 10px rgba(0,0,0,.25);position:relative}
.b2-dice.b2-rosie{background:rgba(242,90,149,.22)}
.b2-die{position:relative;width:60px;height:60px;padding:6px;border-radius:15px;cursor:pointer;transition:transform .15s}
.b2-die.b2-blank{font:700 1.8rem var(--display);color:var(--ink-soft)}
.b2-die.b2-held{--c:var(--sun);--d:var(--sun-d);transform:translateY(-8px)}
.b2-die.b2-held::after{content:"KEEP";position:absolute;left:50%;bottom:-26px;transform:translateX(-50%);font:700 .8rem var(--display);color:var(--sun);letter-spacing:.05em}
.b2-die.b2-roll{animation:b2-tumble .5s cubic-bezier(.3,1.3,.5,1)}
@keyframes b2-tumble{0%{transform:rotate(-200deg) scale(.5);opacity:.3}}
.b2-dlabel{font:600 1rem var(--display);color:var(--on-table-soft);margin:-4px 0 -6px}
.b2-boxes{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;width:100%}
.b2-box{grid-column:span 3}
.b2-box.b2-num{grid-column:span 2;padding:6px 6px}
.b2-box.b2-num small{display:none}
.b2-box.b2-num .b2-bv{min-width:38px;font-size:1.25rem;padding:2px 3px}
@media (min-width:600px){.b2-box{grid-column:span 2}.b2-box.b2-num{grid-column:span 1}}
.b2-box{display:flex;align-items:center;justify-content:space-between;gap:6px;min-height:58px;padding:6px 10px;border:0;border-radius:14px;cursor:pointer;text-align:left;
  background:var(--card);color:var(--ink);box-shadow:0 5px 0 var(--card-edge),0 8px 12px rgba(0,0,0,.25)}
.b2-box .b2-bn{font:600 1.05rem/1.1 var(--display)}
.b2-box small{display:block;font:600 .8rem var(--body);color:var(--ink-soft)}
.b2-box .b2-bv{flex:none;min-width:46px;text-align:center;font:700 1.4rem var(--display);padding:2px 6px;border-radius:10px;background:#F1E6D2}
.b2-box .b2-bv.b2-zero{color:#9A8F7E}
.b2-box.b2-good .b2-bv{background:var(--good-bg);color:var(--leaf-d)}
.b2-box.b2-sel{box-shadow:0 0 0 5px var(--sun),0 5px 0 var(--card-edge),0 8px 12px rgba(0,0,0,.25);transform:translateY(-3px)}
.b2-box.b2-used{background:#DCD3C2;cursor:default;box-shadow:0 3px 0 #B9AD97}
.b2-box.b2-used .b2-bv{background:transparent;color:var(--ink)}
.b2-box.b2-used .b2-bv::after{content:" ✓";font-size:.9rem;color:var(--leaf-d)}
.b2-box .b2-mini{display:inline-block;width:26px;height:26px;padding:2px;margin-right:4px;vertical-align:middle;border-radius:6px;background:#fff;box-shadow:0 2px 0 var(--card-edge)}
.b2-rolls{display:flex;gap:5px;margin-left:4px}
.b2-rolls i{width:12px;height:12px;border-radius:50%;background:rgba(0,0,0,.25)}
.b2-rolls i.on{background:var(--ink)}

/* Tile Match */
.b2-tmboard{position:relative;margin:4px auto 0}
.b2-tm{position:absolute;width:var(--tw);height:var(--th);border:0;padding:0;border-radius:12px;cursor:pointer;display:grid;place-items:center;
  font-size:calc(var(--tw) * .6);line-height:1;color:var(--ink);
  background:linear-gradient(150deg,#FFFFFF,#FFF4DF 55%,#F3E3C3);
  box-shadow:inset 0 -3px 0 rgba(0,0,0,.06),inset 0 2px 0 #fff,3px 4px 0 #D9B98A,6px 8px 0 #A9875A,6px 10px 12px rgba(0,0,0,.35);transition:transform .12s,filter .2s,left .4s,top .4s}
.b2-tm span{filter:drop-shadow(0 2px 1px rgba(0,0,0,.2))}
.b2-tm.b2-stuck{filter:brightness(.72) saturate(.7)}
.b2-tm.b2-sel{background:linear-gradient(150deg,#FFF6CF,var(--sun));transform:translateY(-6px);box-shadow:inset 0 2px 0 #fff,3px 4px 0 var(--sun-d),6px 8px 0 #8E6500,6px 14px 16px rgba(0,0,0,.4)}
.b2-tm.b2-hintt{animation:b2-glowk 1s ease-in-out infinite}
.b2-tm.b2-gone{animation:b2-pop .45s forwards;pointer-events:none}
.b2-tm.b2-hide{visibility:hidden}

/* Dominoes */
.b2-dom{--s:28px;display:inline-flex;align-items:center;padding:3px;border:0;border-radius:calc(var(--s) * .3);color:var(--ink);flex:none;
  background:linear-gradient(160deg,#FFFFFF,#F1E7D3);box-shadow:inset 0 -3px 0 rgba(0,0,0,.08),inset 0 2px 0 #fff,0 4px 0 #BFAE8C,0 6px 10px rgba(0,0,0,.3)}
.b2-dom.b2-v{flex-direction:column}
.b2-dom .b2-half{display:block;width:var(--s);height:var(--s);padding:2px}
.b2-dom .b2-half + .b2-half{border-left:2px solid #CDBB98}
.b2-dom.b2-v .b2-half + .b2-half{border-left:0;border-top:2px solid #CDBB98}
.b2-dom.b2-in{animation:b2-in .45s cubic-bezier(.3,1.5,.5,1)}
.b2-chain{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:8px 5px;padding:12px 8px;width:100%;min-height:86px;border-radius:22px;background:rgba(0,0,0,.2);box-shadow:inset 0 4px 10px rgba(0,0,0,.25)}
.b2-chain .b2-dom.b2-endL,.b2-chain .b2-dom.b2-endR{box-shadow:0 0 0 3px var(--sun),0 4px 0 #BFAE8C}
.b2-chain p{margin:0;font:600 1.15rem var(--display);color:var(--on-table-soft)}
.b2-ends{display:flex;gap:12px;justify-content:center;width:100%}
.b2-end{display:flex;align-items:center;gap:8px;min-height:60px;padding:6px 12px;border:0;border-radius:16px;font:600 1.05rem var(--display);color:var(--ink);background:var(--card);box-shadow:0 5px 0 var(--card-edge);cursor:default}
.b2-end .b2-face{display:block;width:40px;height:40px;padding:3px;background:#fff;border-radius:8px;box-shadow:0 2px 0 #BFAE8C}
.b2-end.b2-pickme{cursor:pointer;background:var(--sun);box-shadow:0 5px 0 var(--sun-d);animation:b2-glowk 1s ease-in-out infinite}
.b2-hand{display:flex;flex-wrap:wrap;justify-content:center;gap:14px 10px}
.b2-hand .b2-dom{--s:clamp(44px,12vw,52px);cursor:pointer;transition:transform .12s,filter .2s,opacity .2s}
.b2-hand .b2-dom.b2-can{box-shadow:0 0 0 4px var(--sun),0 5px 0 #BFAE8C,0 8px 14px rgba(0,0,0,.35)}
.b2-hand .b2-dom.b2-cant{filter:brightness(.78);opacity:.85}
.b2-hand .b2-dom.b2-chosen{transform:translateY(-10px);box-shadow:0 0 0 5px var(--leaf),0 5px 0 #BFAE8C,0 12px 16px rgba(0,0,0,.4)}
.b2-opp{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center}
.b2-back{display:inline-block;width:20px;height:36px;border-radius:5px;background:repeating-linear-gradient(45deg,rgba(255,255,255,.22) 0 5px,transparent 5px 10px),var(--berry);box-shadow:0 3px 0 var(--berry-d)}
.b2-opp .b2-dom{--s:24px}
.b2-lbl{margin:0;font:600 1.1rem var(--display);color:var(--on-table-soft)}
`);

  const mkBtn = (label, cls, fn) => { const b = el('button', 'btn ' + cls, label); b.type = 'button'; b.onclick = fn; return b; };
  const PIPS = { 0: [], 1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const pips = (n, horiz) => { const on = n === 6 && horiz ? [0, 1, 2, 6, 7, 8] : PIPS[n]; return '<span class="b2-pips">' + [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => on.includes(i) ? '<i class="on"></i>' : '<i></i>').join('') + '</span>'; };
  const lvl = L => Math.max(1, Math.floor(+L || 1));
  const FRIENDS = ['Rosie', 'Bert', 'Mabel', 'Stan', 'Ivy', 'Alf'];

  /* =========================================================
     1. BINGO (traditional calls; the player usually wins at low levels)
     ========================================================= */
  const CALLS = ['',
    "Kelly's eye", 'One little duck', 'Cup of tea', 'Knock at the door', 'Man alive', 'Half a dozen', 'Lucky seven', 'Garden gate', "Doctor's orders", 'Cock and hen',
    'Legs eleven', 'One dozen', 'Unlucky for some', "Valentine's Day", 'Young and keen', 'Sweet sixteen', 'Dancing queen', 'Coming of age', 'Goodbye teens', 'One score',
    'Key of the door', 'Two little ducks', 'Thee and me', 'Two dozen', 'Duck and dive', 'Pick and mix', 'Gateway to heaven', 'Duck and its mate', 'Rise and shine', 'Dirty Gertie',
    'Get up and run', 'Buckle my shoe', 'All the threes', 'Ask for more', 'Jump and jive', 'Three dozen', 'More than eleven', 'Christmas cake', 'Thirty-nine steps', 'Naughty forty',
    'Time for fun', 'Winnie the Pooh', 'Down on your knees', 'Droopy drawers', 'Halfway there', 'Up to tricks', 'Four and seven', 'Four dozen', 'Nick nick', 'Half a century',
    'Tweak of the thumb', 'Deck of cards', 'Stuck in the tree', 'Clean the floor', 'Snakes alive', 'Was she worth it?', 'Five and seven', 'Make them wait', 'Brighton line', 'Five dozen',
    "Baker's bun", 'Tickety-boo', 'Tickle me', 'Red raw', 'Old age pension', 'Clickety click', 'Made in heaven', 'Saving grace', 'Either way up', 'Three score and ten',
    'Bang on the drum', 'Six dozen', 'Queen bee', 'Hit the floor', 'Strive and strive', 'Trombones', 'Sunset strip', "Heaven's gate", 'One more time', 'Eight and blank',
    'Stop and run', 'Straight on through', 'Time for tea', 'Seven dozen', 'Staying alive', 'Between the sticks', 'Torquay in Devon', 'Two fat ladies', 'Nearly there', 'Top of the shop'];

  function startBingo(L0, api) {
    const L = lvl(L0);
    const size = L === 1 ? 3 : 5, cells = size * size, mid = size === 5 ? 12 : -1;
    const goal = L <= 4 ? 'line' : L <= 9 ? 'two' : 'full';
    const N = size === 3 ? 27 : goal === 'full' ? 45 : goal === 'two' ? 60 : 50, per = N / size;
    const goalTxt = { line: 'a line: across, down or corner to corner', two: 'two lines', full: 'every number on your card' }[goal];
    const LINES = [];
    for (let i = 0; i < size; i++) { LINES.push([...Array(size)].map((_, k) => i * size + k)); LINES.push([...Array(size)].map((_, k) => k * size + i)); }
    LINES.push([...Array(size)].map((_, k) => k * size + k), [...Array(size)].map((_, k) => k * size + size - 1 - k));
    const makeCard = () => {
      const card = Array(cells);
      for (let c = 0; c < size; c++) {
        const nums = shuffle([...Array(per)].map((_, i) => c * per + i + 1)).slice(0, size).sort((a, b) => a - b);
        for (let r = 0; r < size; r++) card[r * size + c] = nums[r];
      }
      if (mid >= 0) card[mid] = 0;
      return card;
    };
    const needFor = has => {
      if (goal === 'full') { let n = 0; for (let i = 0; i < cells; i++) if (!has(i)) n++; return n; }
      const ln = LINES.map(l => l.filter(i => !has(i)).length).sort((a, b) => a - b);
      return goal === 'line' ? ln[0] : ln[0] + ln[1];
    };
    const order = shuffle([...Array(N)].map((_, i) => i + 1)), pos = {};
    order.forEach((n, i) => { pos[n] = i; });
    const finishAt = card => { for (let k = 0; k < N; k++) if (!needFor(i => card[i] === 0 || pos[card[i]] <= k)) return k; return N; };
    const me = makeCard(), myAt = finishAt(me);
    const nComp = L <= 4 ? 1 : 2, grace = L <= 2 ? 6 : L <= 5 ? 3 : L <= 8 ? 1 : -999;
    const names = shuffle(FRIENDS.slice());
    const comps = [...Array(nComp)].map((_, k) => {
      let best = null, at = -1;
      for (let t = 0; t < 400; t++) { const c = makeCard(), f = finishAt(c); if (f > at) { best = c; at = f; } if (f >= myAt + grace) break; }
      return { name: names[k], card: best, at };
    });

    const called = [], calledSet = new Set(), marked = new Set(mid >= 0 ? [mid] : []);
    let mistakes = 0, over = false, auto = false, autoTok = 0, forceGlow = false;
    const calledAt = {};
    const root = el('div', 'b2-wrap'); api.stage.append(root);
    const top = el('div', 'b2-btop'), ball = el('div', 'b2-ball b2-empty', '<b>?</b>'), call = el('div', 'b2-call');
    top.append(ball, call);
    const players = el('div', 'b2-players');
    const grid = el('div', 'b2-card');
    grid.style.setProperty('--n', size); grid.style.setProperty('--cs', size === 3 ? '84px' : '56px'); grid.style.setProperty('--cf', size === 3 ? '2.2rem' : '1.55rem');
    const nextB = mkBtn('🎱 Next ball', 'c-sun', () => { sfx.tap(); callNext(); });
    const bingoB = mkBtn('Bingo!', 'c-berry b2-bingobtn', claim);
    const autoB = mkBtn('', 'c-card', () => { sfx.tap(); auto = !auto; autoTok++; renderAuto(); if (auto) callNext(); });
    const ctr = el('div', 'b2-row'); ctr.append(nextB, bingoB, autoB);
    root.append(top, grid, players, ctr);
    const btns = me.map((v, i) => {
      const b = el('button', 'b2-cell tile ' + (v ? 'c-card' : 'c-leaf b2-free'), v ? `<span>${v}</span>` : '<span>★<br>FREE</span>');
      b.type = 'button'; b.setAttribute('aria-label', v ? 'Number ' + v : 'Free space');
      b.onclick = () => mark(i, b); grid.append(b); return b;
    });
    const renderAuto = () => { autoB.textContent = auto ? '⏸ Auto: on' : '▶ Auto: off'; };
    renderAuto();
    const mineDone = () => needFor(i => marked.has(i)) === 0;
    const calledDone = () => needFor(i => me[i] === 0 || calledSet.has(me[i])) === 0;
    function render() {
      const now = Date.now();
      btns.forEach((b, i) => {
        const v = me[i];
        b.classList.toggle('b2-mk', marked.has(i) && v !== 0);
        const missed = v && calledSet.has(v) && !marked.has(i) && (forceGlow || called.length - 1 - pos[v] >= 2 || now - calledAt[v] > 8000);
        b.classList.toggle('b2-glow', !!missed);
      });
      bingoB.classList.toggle('b2-ready', mineDone() && !over);
      players.innerHTML = '';
      comps.forEach(c => {
        const need = needFor(i => c.card[i] === 0 || calledSet.has(c.card[i]));
        players.append(el('span', 'b2-chip', `🙂 ${c.name} needs <b>${need}</b>`));
      });
      players.append(el('span', 'b2-chip', `Balls: <b>${called.length}</b>`));
    }
    function callNext() {
      if (over) return;
      if (called.length >= N) { api.hint('All the balls are out. Mark your numbers and tap Bingo!'); return; }
      const n = order[called.length]; called.push(n); calledSet.add(n); calledAt[n] = Date.now();
      const col = Math.min(size - 1, Math.floor((n - 1) / per));
      ball.className = 'b2-ball c-' + CUBES[col].c; ball.innerHTML = `<b>${n}</b>`; void ball.offsetWidth; ball.classList.add('b2-new');
      const prev = called.slice(-6, -1).reverse();
      call.innerHTML = `<div class="b2-phrase">“${CALLS[n]}”</div><div class="b2-say">Number ${n}</div>` +
        (prev.length ? `<div class="b2-recent">${prev.map(p => `<span>${p}</span>`).join('')}</div>` : '');
      tone(392, .12, 'triangle', .1); tone(523, .18, 'triangle', .1, .1);
      const have = me.includes(n);
      api.hint(`${CALLS[n]}, number ${n}. ` + (calledDone() ? 'You have got it! Mark your numbers and tap Bingo!' : have ? 'You have it! Tap it on your card.' : 'Look for it on your card.'));
      render();
      api.later(render, 8200);
      comps.forEach(c => { if (c.at === called.length - 1) api.later(() => compClaim(c), 2800); });
      if (auto) { const t = ++autoTok; api.later(() => { if (t === autoTok && auto && !over) callNext(); }, 7000); }
    }
    function mark(i, b) {
      if (over || me[i] === 0 || marked.has(i)) return;
      const v = me[i];
      if (!calledSet.has(v)) { mistakes++; sfx.soft(); wob(b); api.hint(`${v} hasn't been called yet. Tap Next ball for another number.`); return; }
      marked.add(i); tone(500 + marked.size * 30, .14, 'triangle', .12);
      render();
      if (mineDone()) { api.hint('That makes ' + (goal === 'full' ? 'a full card' : goal === 'two' ? 'two lines' : 'a line') + '! Tap the big Bingo! button.'); tone(784, .2, 'sine', .12, .12); }
      else api.hint('Marked. ' + (calledDone() ? 'Mark the glowing numbers too.' : 'Tap Next ball when you are ready.'));
    }
    function claim() {
      if (over) return;
      if (mineDone()) {
        over = true; auto = false; autoTok++;
        LINES.forEach(l => { if (l.every(i => marked.has(i))) l.forEach(i => btns[i].classList.add('b2-win')); });
        if (goal === 'full') btns.forEach(b => b.classList.add('b2-win'));
        bingoB.classList.remove('b2-ready'); sfx.good(); toast('Bingo! ' + cheer());
        api.hint('Bingo! You won the game. Well played!');
        api.done(mistakes <= 2 ? 3 : 2);
        return;
      }
      mistakes++; sfx.soft(); wob(bingoB);
      if (calledDone()) { forceGlow = true; render(); api.hint('So close! Mark the glowing numbers first, then tap Bingo!'); }
      else api.hint(`Not yet. You need ${goalTxt}. Keep going!`);
    }
    function compClaim(c) {
      if (over) return;
      over = true; auto = false; autoTok++; render();
      sfx.soft(); api.hint(`${c.name} calls “Bingo!” ${c.name} got there first this time. What a lovely game. Have another go!`);
      api.done(1);
    }
    api.hint(`Tap Next ball to call a number. Mark it if it's on your card. Get ${goalTxt}, then tap Bingo!`);
    call.innerHTML = '<div class="b2-phrase">Eyes down!</div><div class="b2-say">Tap Next ball to start</div>';
    render();
  }

  /* =========================================================
     2. DICE PAIRS (five dice, three rolls, choose a box; friendly Rosie)
     ========================================================= */
  const DP_ALL = [
    { id: 'pair', name: 'A pair', tip: 'Two the same', f: a => a.max >= 2 ? 10 : 0 },
    { id: 'two', name: 'Two pairs', tip: 'Two and two', f: a => a.pairs >= 2 || a.max >= 4 ? 15 : 0 },
    { id: 'three', name: 'Three the same', tip: 'Three alike', f: a => a.max >= 3 ? 20 : 0 },
    { id: 'full', name: 'Full house', tip: 'Three and two', f: a => (a.has3 && a.has2) || a.max === 5 ? 25 : 0 },
    { id: 'small', name: 'Small run', tip: '4 in a row', f: a => a.run >= 4 ? 30 : 0 },
    { id: 'large', name: 'Big run', tip: '5 in a row', f: a => a.run >= 5 ? 40 : 0 },
    { id: 'same', name: 'All the same', tip: 'Five alike', f: a => a.max === 5 ? 50 : 0 },
    { id: 'chance', name: 'Chance', tip: 'Add them all up', f: a => a.sum }
  ].concat([1, 2, 3, 4, 5, 6].map(k => ({ id: 'n' + k, face: k, name: k + 's', tip: 'Add the ' + k + 's', f: a => a.cnt[k] * k })));
  const DP_BY = Object.fromEntries(DP_ALL.map(b => [b.id, b]));
  function dpAnal(d) {
    const cnt = [0, 0, 0, 0, 0, 0, 0]; d.forEach(v => cnt[v]++);
    let run = 0, cur = 0; for (let v = 1; v <= 6; v++) { cur = cnt[v] ? cur + 1 : 0; run = Math.max(run, cur); }
    return { cnt, run, sum: d.reduce((a, b) => a + b, 0), max: Math.max(...cnt), pairs: cnt.filter(c => c >= 2).length, has3: cnt.includes(3), has2: cnt.includes(2) };
  }
  function startDice(L0, api) {
    const L = lvl(L0);
    const ids = ['pair', 'three', 'full', 'small', 'chance'];
    if (L >= 2) ids.splice(1, 0, 'two');
    if (L >= 3) ids.splice(ids.indexOf('chance'), 0, 'large', 'same');
    if (L >= 4) ids.push('n4', 'n5', 'n6');
    if (L >= 5) ids.push('n1', 'n2', 'n3');
    if (L >= 5) { const tail = ids.splice(ids.indexOf('n4')); tail.sort(); ids.push(...tail); }
    const boxes = ids.map(id => DP_BY[id]);
    const rName = pick(FRIENDS), rRolls = L <= 2 ? 1 : L <= 5 ? 2 : 3, rSloppy = L <= 2 ? .65 : L <= 4 ? .35 : L <= 6 ? .15 : 0;
    let dice = [0, 0, 0, 0, 0], held = [false, false, false, false, false], rollsLeft = 3, sel = null, phase = 'me';
    const used = {}, rUsed = {}; let my = 0, rs = 0, turn = 0;
    const root = el('div', 'b2-wrap'); api.stage.append(root);
    const scores = el('div', 'b2-row'), dlabel = el('p', 'b2-dlabel'), diceBox = el('div', 'b2-dice'), ctr = el('div', 'b2-row'), card = el('div', 'b2-boxes');
    const rollB = mkBtn('', 'c-sun', roll);
    ctr.append(rollB);
    root.append(scores, dlabel, diceBox, ctr, card);
    const dieEls = dice.map((_, i) => { const b = el('button', 'b2-die tile c-card'); b.type = 'button'; b.onclick = () => hold(i); diceBox.append(b); return b; });
    function render(rolled) {
      scores.innerHTML = `<span class="b2-chip">You: <b>${my}</b></span><span class="b2-chip">🙂 ${rName}: <b>${rs}</b></span>`;
      dlabel.textContent = phase === 'rosie' ? rName + "'s dice" : 'Your dice';
      diceBox.classList.toggle('b2-rosie', phase === 'rosie');
      dieEls.forEach((b, i) => {
        b.className = 'b2-die tile ' + (held[i] ? 'c-sun b2-held' : phase === 'rosie' ? 'c-rose' : 'c-card') + (dice[i] ? '' : ' b2-blank') + (rolled && rolled[i] ? ' b2-roll' : '');
        b.innerHTML = dice[i] ? pips(dice[i]) : '?';
        b.setAttribute('aria-label', dice[i] ? 'Die showing ' + dice[i] + (held[i] ? ', kept' : '') : 'Die not rolled');
      });
      rollB.innerHTML = `🎲 Roll <span class="b2-rolls">${[0, 1, 2].map(k => `<i class="${k < rollsLeft ? 'on' : ''}"></i>`).join('')}</span>`;
      rollB.disabled = phase !== 'me' || rollsLeft === 0; rollB.style.opacity = rollB.disabled ? .5 : 1;
      rollB.classList.toggle('b2-glow', phase === 'me' && rollsLeft === 3);
      const a = dice[0] ? dpAnal(dice) : null;
      card.innerHTML = '';
      boxes.forEach(bx => {
        const done = used[bx.id] != null, v = done ? used[bx.id] : a && phase === 'me' ? bx.f(a) : null;
        const b = el('button', 'b2-box' + (bx.face ? ' b2-num' : '') + (done ? ' b2-used' : '') + (sel === bx.id ? ' b2-sel' : '') + (!done && v > 0 ? ' b2-good' : ''));
        b.type = 'button';
        const icon = bx.face ? `<span class="b2-mini">${pips(bx.face)}</span>` : '';
        b.innerHTML = `<span><span class="b2-bn">${icon}${bx.name}</span><small>${bx.tip}</small></span><span class="b2-bv${v === 0 ? ' b2-zero' : ''}">${v == null ? '–' : v}</span>`;
        b.onclick = () => choose(bx);
        card.append(b);
      });
      api.rounds(boxes.length, turn);
    }
    function roll() {
      if (phase !== 'me' || rollsLeft === 0) return;
      const rolled = dice.map((_, i) => !held[i] || !dice[i]);
      dice = dice.map((v, i) => rolled[i] ? 1 + randInt(6) : v);
      if (rollsLeft === 3) held = [false, false, false, false, false];
      rollsLeft--; sel = null;
      [0, 1, 2].forEach(k => tone(300 + randInt(200), .05, 'square', .04, k * .07));
      render(rolled);
      const best = Math.max(...boxes.filter(b => used[b.id] == null).map(b => b.f(dpAnal(dice))));
      api.hint(rollsLeft ? `Tap dice to keep them, then roll again (${rollsLeft} left). Or tap a box to score.` : 'No rolls left. Tap a box to score' + (best > 0 ? '. The green ones score points.' : '. Any box is fine.'));
    }
    function hold(i) {
      if (phase !== 'me' || !dice[i]) return;
      if (rollsLeft === 0) { api.hint('No rolls left. Tap a box to score.'); return; }
      held[i] = !held[i]; tone(held[i] ? 660 : 440, .08, 'triangle', .08); render();
    }
    function choose(bx) {
      if (phase !== 'me' || used[bx.id] != null) return;
      if (!dice[0]) { sfx.soft(); api.hint('Tap Roll first to throw the dice.'); wob(rollB); return; }
      const v = bx.f(dpAnal(dice));
      if (sel !== bx.id) { sel = bx.id; sfx.tap(); render(); api.hint(`Score ${v} in ${bx.name}? Tap it again to choose it.`); return; }
      used[bx.id] = v; my += v; turn++; sel = null;
      if (v > 0) { sfx.good(); if (v >= 25) toast(cheer()); } else tone(330, .15, 'sine', .08);
      phase = 'rosie'; dice = [0, 0, 0, 0, 0]; held = [false, false, false, false, false]; rollsLeft = 0;
      render(); api.hint(`${v} in ${bx.name}. Now it's ${rName}'s turn…`);
      api.later(rosieTurn, 1200);
    }
    function rosieTurn() {
      let r = 0;
      const step = () => {
        const rolled = dice.map((_, i) => !held[i]);
        dice = dice.map((v, i) => held[i] ? v : 1 + randInt(6)); r++;
        [0, 1, 2].forEach(k => tone(300 + randInt(200), .05, 'square', .035, k * .07));
        render(rolled);
        if (r < rRolls) {
          const a = dpAnal(dice); let keep = 0;
          for (let v = 6; v >= 1; v--) if (a.cnt[v] > (a.cnt[keep] || 0)) keep = v;
          held = dice.map(v => v === keep && a.cnt[keep] >= 2);
          api.hint(held.some(Boolean) ? `${rName} keeps the ${keep}s and rolls again…` : `${rName} rolls again…`);
          api.later(() => { render(); api.later(step, 700); }, 900);
        } else api.later(rosieScore, 1100);
      };
      api.hint(`${rName} rolls the dice…`);
      step();
    }
    function rosieScore() {
      const a = dpAnal(dice), open = boxes.filter(b => rUsed[b.id] == null);
      let bx = open.reduce((m, b) => b.f(a) > m.f(a) ? b : m, open[0]);
      if (Math.random() < rSloppy) bx = pick(open);
      const v = bx.f(a); rUsed[bx.id] = v; rs += v;
      tone(520, .14, 'triangle', .08);
      render(); api.hint(`${rName} puts ${v} in ${bx.name}.`);
      api.later(() => {
        if (turn === boxes.length) return finish();
        phase = 'me'; dice = [0, 0, 0, 0, 0]; held = [false, false, false, false, false]; rollsLeft = 3;
        render(); api.hint('Your turn. Tap Roll to throw the dice.');
      }, 1600);
    }
    function finish() {
      phase = 'over'; render();
      const zeros = boxes.filter(b => used[b.id] === 0).length;
      if (my > rs) { sfx.good(); api.hint(`You scored ${my} and ${rName} scored ${rs}. You win!`); api.done(zeros <= boxes.length / 3 ? 3 : 2); }
      else if (my === rs) { api.hint(`You both scored ${my}. A draw! Well played.`); api.done(2); }
      else { api.hint(`You scored ${my}. ${rName} scored ${rs} this time. Good game! Have another go.`); api.done(1); }
    }
    render();
    api.hint('Tap Roll to throw the dice. You get 3 rolls, then choose a box.');
  }

  /* =========================================================
     3. TILE MATCH (layered picture tiles, dealt backwards so it is always solvable)
     ========================================================= */
  const TM_PICS = ['🌻', '🌷', '🌹', '🍎', '🍋', '🍇', '🍓', '🐦', '🦉', '🦆', '🐟', '🦋', '🍄', '⭐', '🌙', '🐝', '🐞', '🍐', '🦜', '🍒', '🌈', '🐌'];
  function tmShape(L, narrow) {
    let spec;
    if (L === 1) spec = [4, 3, 1]; else if (L === 2) spec = [4, 3, 2]; else if (L === 3) spec = [5, 3, 2];
    else if (L === 4) spec = [5, 4, 2]; else if (L === 5) spec = [5, 4, 3];
    else spec = pick(narrow ? [[5, 5, 3], [5, 4, 3], [5, 5, 2], [4, 5, 2]] : [[6, 4, 3], [5, 5, 3], [6, 5, 2], [6, 4, 2]]);
    const [cols, rows, layers] = spec, pos = [];
    const cut = L >= 6 && Math.random() < .5;
    // layers sit squarely on the one below, each one column narrower at both sides (and a row shorter from layer 2)
    for (let z = 0; z < layers; z++) {
      const ri = z >= 2 ? 1 : 0;
      for (let r = ri; r < rows - ri; r++) for (let c = z; c < cols - z; c++) {
        if (cut && z === 0 && (c === 0 || c === cols - 1) && (r === 0 || r === rows - 1)) continue;
        pos.push({ x: 2 * c, y: 2 * r, z });
      }
    }
    if (pos.length % 2) pos.pop();
    return pos;
  }
  const tmCovered = (t, live) => live.some(o => o !== t && o.z > t.z && Math.abs(o.x - t.x) < 2 && Math.abs(o.y - t.y) < 2);
  const tmSide = (t, live, dx) => live.some(o => o !== t && o.z === t.z && o.x === t.x + dx && Math.abs(o.y - t.y) < 2);
  const tmFree = (t, live) => !tmCovered(t, live) && (!tmSide(t, live, -2) || !tmSide(t, live, 2));
  function tmDeal(list) {  // remove free pairs from the full layout; doing it forwards is always a solution
    for (let t = 0; t < 300; t++) {
      let live = list.slice(); const pairs = []; let ok = true;
      while (live.length) {
        const fr = shuffle(live.filter(p => tmFree(p, live)));
        if (fr.length < 2) { ok = false; break; }
        pairs.push([fr[0], fr[1]]); live = live.filter(p => p !== fr[0] && p !== fr[1]);
      }
      if (ok) return pairs;
    }
    return null;
  }
  function startTiles(L0, api) {
    const L = lvl(L0);
    const narrow = (api.stage.clientWidth || 360) < 430;
    let tiles, pairs;
    do { tiles = tmShape(L, narrow); pairs = tmDeal(tiles); } while (!pairs);
    const kinds = shuffle(TM_PICS.slice()).slice(0, Math.min(pairs.length, L <= 2 ? 6 : L <= 4 ? 10 : 14));
    shuffle(pairs.map((_, i) => kinds[i % kinds.length])).forEach((p, i) => { pairs[i][0].pic = p; pairs[i][1].pic = p; });
    const layers = Math.max(...tiles.map(t => t.z)) + 1;
    const TW = 56, TH = 68, DX = 6, DY = 9;
    const baseCols = Math.max(...tiles.map(t => t.x)) / 2 + 1;
    let sel = null, mistakes = 0, helps = 0, combo = 0, finished = false;
    const undo = [];
    const root = el('div', 'b2-wrap'); api.stage.append(root);
    const board = el('div', 'b2-tmboard');
    board.style.setProperty('--tw', TW + 'px'); board.style.setProperty('--th', TH + 'px');
    const sizeBoard = () => {
      const lv = tiles.filter(t => !t.gone), mx = Math.max(...lv.map(t => t.x), 0), my = Math.max(...lv.map(t => t.y), 0);
      board.style.width = (Math.max(mx, (baseCols - 1) * 2) / 2 * TW + TW + (layers - 1) * DX + 8) + 'px';
      board.style.height = (my / 2 * TH + TH + (layers - 1) * DY + 12) + 'px';
    };
    const placeEl = t => {
      t.el.style.left = (t.x / 2 * TW - t.z * DX + (layers - 1) * DX) + 'px';
      t.el.style.top = (t.y / 2 * TH - t.z * DY + (layers - 1) * DY) + 'px';
      t.el.style.zIndex = t.z * 1000 + t.y * 20 + t.x;
      t.el.dataset.x = t.x; t.el.dataset.y = t.y; t.el.dataset.z = t.z;
    };
    const info = el('div', 'b2-row'), ctr = el('div', 'b2-row');
    const hintB = mkBtn('💡 Hint', 'c-sun', hint), shufB = mkBtn('🔀 Shuffle', 'c-sky', reshuffle), undoB = mkBtn('↶ Undo', 'c-card', doUndo);
    ctr.append(hintB, shufB, undoB);
    root.append(info, board, ctr);
    tiles.forEach(t => {
      const b = el('button', 'b2-tm', `<span>${t.pic}</span>`); b.type = 'button';
      b.onclick = () => tap(t);
      t.el = b; placeEl(t); board.append(b);
    });
    sizeBoard();
    const live = () => tiles.filter(t => !t.gone);
    const freeMatch = () => { const lv = live(), fr = lv.filter(t => tmFree(t, lv)); for (let i = 0; i < fr.length; i++) for (let j = i + 1; j < fr.length; j++) if (fr[i].pic === fr[j].pic) return [fr[i], fr[j]]; return null; };
    function render() {
      const lv = live();
      tiles.forEach(t => {
        t.el.classList.toggle('b2-stuck', !t.gone && !tmFree(t, lv));
        t.el.classList.toggle('b2-sel', t === sel);
        t.el.setAttribute('aria-label', t.pic + (tmFree(t, lv) ? '' : ', stuck'));
      });
      info.innerHTML = `<span class="b2-chip">Tiles left: <b>${lv.length}</b></span>`;
      api.rounds(pairs.length, (tiles.length - lv.length) / 2);
    }
    const clearHints = () => tiles.forEach(t => t.el.classList.remove('b2-hintt'));
    function tap(t) {
      if (finished || t.gone) return;
      clearHints(); shufB.classList.remove('b2-glow');
      const lv = live();
      if (!tmFree(t, lv)) { sfx.soft(); wob(t.el); api.hint('That tile is stuck. Pick a bright tile: nothing on top, and free on the left or right.'); return; }
      if (!sel) { sel = t; sfx.tap(); render(); api.hint('Now tap another ' + t.pic + ' that is free.'); return; }
      if (sel === t) { sel = null; render(); api.hint('Tap two matching bright tiles to clear them.'); return; }
      if (sel.pic !== t.pic) { mistakes++; combo = 0; sfx.soft(); wob(t.el); sel = t; render(); api.hint('Those two are different. Now find another ' + t.pic + '.'); return; }
      const a = sel, b = t; sel = null; combo++;
      a.gone = b.gone = true; undo.push([a, b]);
      [a, b].forEach(x => x.el.classList.add('b2-gone'));
      tone(520 + Math.min(combo, 8) * 60, .14, 'triangle', .12); tone(780 + Math.min(combo, 8) * 60, .18, 'triangle', .1, .08);
      api.later(() => [a, b].forEach(x => { if (x.gone) x.el.classList.add('b2-hide'); }), 460);
      render();
      if (!live().length) { finished = true; sfx.good(); api.hint('Every tile is cleared. Wonderful!'); api.done(mistakes + helps <= 2 ? 3 : mistakes + helps <= 6 ? 2 : 1 + (mistakes + helps <= 12)); return; }
      if (combo >= 3 && combo % 3 === 0) toast(cheer());
      if (!freeMatch()) { shufB.classList.add('b2-glow'); api.hint('No free pairs left. Tap Shuffle to mix the tiles, or Undo.'); }
      else api.hint(cheer() + ' Find another pair of bright tiles.');
    }
    function hint() {
      clearHints(); const m = freeMatch(); helps++; sfx.tap();
      if (m) { m.forEach(t => t.el.classList.add('b2-hintt')); sel = null; render(); api.hint('These two match. Tap them both.'); }
      else { shufB.classList.add('b2-glow'); api.hint('No free pairs right now. Tap Shuffle to mix the tiles.'); }
    }
    function reshuffle() {
      if (finished) return;
      const lv = live(); if (lv.length < 2) return;
      let np = tmDeal(lv), spread = false;
      if (!np) {  // the leftover tiles block each other: lay them out flat, which can always be dealt
        lv.sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x).forEach((t, i) => { t.x = 2 * (i % baseCols); t.y = 2 * Math.floor(i / baseCols); t.z = 0; placeEl(t); });
        sizeBoard(); np = tmDeal(lv); spread = true; undo.length = 0;
      }
      const picsPairs = []; const cnt = {};
      lv.forEach(t => { cnt[t.pic] = (cnt[t.pic] || 0) + 1; });
      Object.keys(cnt).forEach(p => { for (let k = 0; k < cnt[p] / 2; k++) picsPairs.push(p); });
      shuffle(picsPairs).forEach((p, i) => { np[i][0].pic = p; np[i][1].pic = p; });
      lv.forEach(t => { t.el.innerHTML = `<span>${t.pic}</span>`; t.el.style.animation = 'none'; void t.el.offsetWidth; t.el.style.animation = 'b2-in .4s'; });
      helps++; sel = null; clearHints(); shufB.classList.remove('b2-glow');
      tone(440, .1, 'triangle', .08); tone(660, .1, 'triangle', .08, .08);
      render(); api.hint((spread ? 'I spread the tiles out for you. ' : 'All mixed up. ') + 'Find two matching bright tiles.');
    }
    function doUndo() {
      if (finished) return;
      const u = undo.pop(); if (!u) { api.hint('Nothing to undo yet.'); return; }
      u.forEach(t => { t.gone = false; t.el.classList.remove('b2-gone', 'b2-hide'); });
      sel = null; combo = 0; clearHints(); sfx.tap(); render(); api.hint('Put back. Find two matching bright tiles.');
    }
    render();
    api.hint('Tap two matching bright tiles to clear them. A tile is free with nothing on top and an open side.');
  }

  /* =========================================================
     4. DOMINOES (double six, block game against a friendly computer)
     ========================================================= */
  const domSum = h => h.reduce((s, d) => s + d[0] + d[1], 0);
  const fits = (d, v) => d[0] === v || d[1] === v;
  function domSim(h0, c0, cpick) {
    const h = h0.slice(), c = c0.slice(); let Lv = null, Rv = null, turn = 0, passes = 0;
    for (let g = 0; g < 200; g++) {
      const hand = turn ? c : h;
      const ok = hand.filter(d => Lv === null || fits(d, Lv) || fits(d, Rv));
      if (ok.length) {
        const d = turn ? cpick(ok) : pick(ok);
        if (Lv === null) { Lv = d[0]; Rv = d[1]; } else if (fits(d, Lv)) Lv = d[0] === Lv ? d[1] : d[0]; else Rv = d[0] === Rv ? d[1] : d[0];
        hand.splice(hand.indexOf(d), 1); passes = 0;
        if (!hand.length) return turn ? 'c' : 'p';
      } else if (++passes >= 2) { const a = domSum(h), b = domSum(c); return a < b ? 'p' : a > b ? 'c' : 'd'; }
      turn ^= 1;
    }
    return 'd';
  }
  function startDominoes(L0, api) {
    const L = lvl(L0), n = L === 1 ? 5 : 7, rName = pick(FRIENDS);
    const cpick = ok => {
      if (L <= 3) return ok.reduce((m, d) => d[0] + d[1] < m[0] + m[1] ? d : m, ok[0]);
      if (L <= 6) return ok[0];
      return ok.reduce((m, d) => d[0] + d[1] > m[0] + m[1] ? d : m, ok[0]);
    };
    const need = L <= 3 ? 4 : L <= 6 ? 2 : 0;
    let hand, comp;
    for (let t = 0; t < 250; t++) {
      const set = []; for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) set.push([a, b]);
      shuffle(set); hand = set.slice(0, n); comp = set.slice(n, 2 * n);
      let w = 0; for (let k = 0; k < 4; k++) if (domSim(hand, comp, cpick) === 'p') w++;
      if (w >= need) break;
    }
    hand.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
    let chain = [], passes = 0, phase = 'me', chosen = null, mistakes = 0, tok = 0, fresh = null;
    const snaps = [];
    const root = el('div', 'b2-wrap'); api.stage.append(root);
    const opp = el('div', 'b2-opp'), chainBox = el('div', 'b2-chain'), ends = el('div', 'b2-ends'), handBox = el('div', 'b2-hand'), ctr = el('div', 'b2-row');
    const knockB = mkBtn('✊ Knock (pass)', 'c-coral', knock), undoB = mkBtn('↶ Undo', 'c-card', doUndo);
    ctr.append(knockB, undoB);
    root.append(opp, chainBox, ends, el('p', 'b2-lbl', 'Your dominoes'), handBox, ctr);
    const Lv = () => chain[0][0], Rv = () => chain[chain.length - 1][1];
    const domEl = (d, tag, vert) => {
      const dbl = d[0] === d[1], v = vert != null ? vert : dbl;
      const e = el(tag, 'b2-dom' + (v ? ' b2-v' : ''), `<span class="b2-half">${pips(d[0], !v)}</span><span class="b2-half">${pips(d[1], !v)}</span>`);
      return e;
    };
    const canPlay = d => !chain.length || fits(d, Lv()) || fits(d, Rv());
    function render(reveal) {
      opp.innerHTML = '';
      opp.append(el('span', 'b2-chip', `🙂 ${rName}: <b>${comp.length}</b> left`));
      const backs = el('span', 'b2-row'); backs.style.gap = '4px';
      comp.forEach(d => backs.append(reveal ? domEl(d, 'span', true) : el('span', 'b2-back')));
      opp.append(backs);
      chainBox.innerHTML = '';
      if (!chain.length) chainBox.append(el('p', '', 'Play any domino to start'));
      chain.forEach((d, i) => {
        const e = domEl(d, 'span');
        if (i === 0) e.classList.add('b2-endL'); if (i === chain.length - 1) e.classList.add('b2-endR');
        if (d === fresh) e.classList.add('b2-in');
        chainBox.append(e);
      });
      ends.innerHTML = '';
      if (chain.length) {
        [['L', '◀ Left end', Lv()], ['R', 'Right end ▶', Rv()]].forEach(([side, lab, v]) => {
          const pickable = chosen && fits(chosen, v);
          const b = el('button', 'b2-end' + (pickable ? ' b2-pickme' : ''), `${side === 'L' ? lab : ''}<span class="b2-face">${pips(v, true)}</span>${side === 'R' ? lab : ''}`);
          b.type = 'button'; b.setAttribute('aria-label', (side === 'L' ? 'Left' : 'Right') + ' end, ' + v);
          b.onclick = () => { if (chosen && pickable) place(chosen, side); };
          ends.append(b);
        });
      }
      handBox.innerHTML = '';
      hand.forEach(d => {
        const b = domEl(d, 'button', true); b.type = 'button';
        b.setAttribute('aria-label', `Domino ${d[0]} and ${d[1]}`);
        if (phase === 'me') b.classList.add(canPlay(d) ? 'b2-can' : 'b2-cant');
        if (d === chosen) b.classList.add('b2-chosen');
        b.onclick = () => tapDom(d, b);
        handBox.append(b);
      });
      const stuck = phase === 'me' && !hand.some(canPlay);
      knockB.hidden = !stuck; knockB.classList.toggle('b2-glow', stuck);
      undoB.hidden = !snaps.length || phase === 'over';
    }
    function tapDom(d, b) {
      if (phase !== 'me') { if (phase === 'comp') api.hint(`Wait a moment, ${rName} is taking a turn.`); return; }
      if (!canPlay(d)) { mistakes++; sfx.soft(); wob(b); api.hint(chain.length ? `That one doesn't fit. Look for a ${Lv()} or a ${Rv()}. The glowing ones fit.` : 'Pick any domino.'); return; }
      if (!chain.length) return place(d, 'R');
      const fl = fits(d, Lv()), fr = fits(d, Rv());
      if (fl && fr && Lv() !== Rv()) { chosen = d; sfx.tap(); render(); api.hint('It fits at both ends. Tap the left end or the right end.'); return; }
      place(d, fl ? 'L' : 'R');
    }
    const snap = () => snaps.push({ hand: hand.slice(), comp: comp.slice(), chain: chain.slice(), passes });
    function put(d, side, who) {
      let o;
      if (!chain.length) { o = d.slice(); chain.push(o); }
      else if (side === 'L') { const v = Lv(); o = d[1] === v ? d.slice() : [d[1], d[0]]; chain.unshift(o); }
      else { const v = Rv(); o = d[0] === v ? d.slice() : [d[1], d[0]]; chain.push(o); }
      who.splice(who.indexOf(d), 1); fresh = o; passes = 0;
    }
    function place(d, side) {
      snap(); chosen = null;
      put(d, side, hand);
      tone(480 + (n - hand.length) * 40, .12, 'triangle', .12); tone(720 + (n - hand.length) * 40, .16, 'triangle', .1, .07);
      if (!hand.length) { phase = 'over'; render(); sfx.good(); toast(cheer()); api.hint('Domino! You played them all. You win!'); return api.done(mistakes <= 1 ? 3 : 2); }
      compNext(`${rName} is thinking…`);
    }
    function knock() {
      if (phase !== 'me' || hand.some(canPlay)) return;
      snap(); knockSound(); passes++;
      if (passes >= 2) return blocked();
      compNext(`You knock. ${rName} is thinking…`);
    }
    const knockSound = () => { tone(160, .07, 'square', .07); tone(160, .07, 'square', .07, .18); };
    function compNext(msg) {
      phase = 'comp'; render(); api.hint(msg);
      const t = ++tok; api.later(() => { if (t === tok) compTurn(); }, 1400);
    }
    function compTurn() {
      const ok = comp.filter(canPlay);
      if (ok.length) {
        const d = cpick(ok), side = !chain.length ? 'R' : fits(d, Lv()) && fits(d, Rv()) ? pick(['L', 'R']) : fits(d, Lv()) ? 'L' : 'R';
        put(d, side, comp); tone(400, .12, 'sine', .1);
        if (!comp.length) { phase = 'over'; render(true); sfx.soft(); api.hint(`${rName} played the last domino and wins this time. A lovely game! Have another go.`); return api.done(1); }
        phase = 'me'; render();
        api.hint(`${rName} played ${d[0]}–${d[1]}. Your turn: ` + (hand.some(canPlay) ? 'tap a glowing domino.' : "you can't go, so tap Knock."));
      } else {
        knockSound(); passes++;
        if (passes >= 2) return blocked();
        phase = 'me'; render();
        api.hint(`${rName} knocks: no domino fits. Your turn: ` + (hand.some(canPlay) ? 'tap a glowing domino.' : 'tap Knock.'));
      }
    }
    function blocked() {
      phase = 'over'; render(true);
      const a = domSum(hand), b = domSum(comp);
      const msg = `Nobody can go. Your spots add up to ${a}, ${rName}'s to ${b}. `;
      if (a < b) { sfx.good(); api.hint(msg + 'Fewest spots wins: you win!'); api.done(mistakes <= 1 ? 3 : 2); }
      else if (a === b) { api.hint(msg + "It's a draw. Well played!"); api.done(2); }
      else { api.hint(msg + `${rName} wins this time. Good game!`); api.done(1); }
    }
    function doUndo() {
      if (phase === 'over' || !snaps.length) return;
      const s = snaps.pop(); tok++;
      hand = s.hand; comp = s.comp; chain = s.chain; passes = s.passes; chosen = null; fresh = null; phase = 'me';
      sfx.tap(); render(); api.hint('Taken back. Your turn: ' + (hand.some(canPlay) ? 'tap a glowing domino.' : 'tap Knock.'));
    }
    render();
    api.hint(`You go first. Tap any domino to start. Match the spots at either end. First to play all ${n} wins!`);
  }

  [
    { id: 'bingo', order: 11, name: 'Bingo', icon: '🎱', desc: 'Mark the numbers called and shout Bingo!', gentle: true, start: startBingo },
    { id: 'dicepairs', order: 12, name: 'Dice Pairs', icon: '🎲', desc: 'Roll five dice and fill your score card', start: startDice },
    { id: 'tilematch', order: 13, name: 'Tile Match', icon: '🌸', desc: 'Clear the stack by matching free tiles', gentle: true, start: startTiles },
    { id: 'dominoes6', order: 14, name: 'Dominoes', icon: '🁫', desc: 'Match the spots against a friend', start: startDominoes }
  ].forEach(g => register(Object.assign({ cat: 'cards' }, g)));
})();
