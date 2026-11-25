/* Recall: more Memory games (What's Changed?, Vanishing Shelf, Dinner Seats, Tower Recall, Dot Flash, Echo Drums) */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor, CUBES } = R;

  R.css(`
/* ---- shared ---- */
.m2-tools{display:flex; justify-content:center; flex-wrap:wrap; gap:12px; min-height:60px}
.m2-tools .btn{font-size:1.25rem}
.m2-big{font-size:1.4rem!important; min-height:68px; padding-inline:1.5em}

/* ---- What's Changed? (wc-) ---- */
.wc-wrap{max-width:440px; margin:0 auto; display:grid; gap:14px}
.wc-room{position:relative; overflow:hidden; border-radius:22px; padding:12px 10px 0;
  background:repeating-linear-gradient(90deg, #FBE9CB 0 18px, #F5DDB5 18px 36px);
  box-shadow:inset 0 -46px 0 #B98457, 0 8px 0 #7A4A28, 0 16px 26px rgba(0,0,0,.3)}
.wc-row{display:grid; grid-template-columns:repeat(var(--n), 1fr); gap:4px; padding:0 6px; position:relative; z-index:1}
.wc-zone{margin-bottom:12px}
.wc-win{position:relative; margin:0 18px; border:6px solid #fff; border-bottom:0; border-radius:16px 16px 0 0; padding-top:8px;
  background:linear-gradient(180deg, #8FD0FF, #D9F2FF 80%)}
.wc-win::before{content:""; position:absolute; top:0; bottom:0; left:50%; width:6px; translate:-50% 0; background:#fff}
.wc-win::after{content:"☁️"; position:absolute; top:2px; left:8%; font-size:22px; opacity:.6; z-index:0}
.wc-win .wc-row{padding:0 2px}
.wc-ledge{height:12px; border-radius:5px; position:relative; z-index:2}
.wc-sill{background:#fff; box-shadow:0 5px 0 #CDBBA0; margin:0 8px}
.wc-plank{background:linear-gradient(#C98B52, #A86B38); box-shadow:0 6px 0 #6E4422, 0 10px 10px rgba(0,0,0,.15)}
.wc-cloth{height:20px; background:repeating-linear-gradient(90deg, #FF6B4A 0 14px, #FFF4E6 14px 28px); box-shadow:0 5px 0 #C4432A}
.wc-legs{display:flex; justify-content:space-between; padding:0 22px; height:32px}
.wc-legs i{width:14px; background:#7A4A28; border-radius:0 0 5px 5px}
.wc-slot{height:58px; min-width:0; padding:0 0 1px; border:0; border-radius:14px; background:transparent; cursor:pointer;
  display:grid; place-items:end center; font-size:clamp(34px, 10vw, 44px); line-height:1; transition:background .2s, box-shadow .2s}
.wc-slot span{display:block; transition:filter .3s; filter:drop-shadow(0 3px 2px rgba(0,0,0,.25))}
.wc-slot.wc-got{background:rgba(60,196,107,.32); box-shadow:inset 0 0 0 4px var(--leaf)}
.wc-slot.wc-got span{animation:bounceIn .35s}
.wc-slot.wc-glow{animation:wc-glow 1.1s ease-in-out infinite}
@keyframes wc-glow{50%{background:rgba(255,236,150,.75); box-shadow:inset 0 0 0 4px #fff}}
.wc-blind{position:absolute; inset:0; z-index:5; display:grid; place-items:center; font:700 1.6rem var(--display); color:#5A361C;
  background:repeating-linear-gradient(180deg, #F2D38E 0 16px, #DDB866 16px 19px); transform:translateY(-102%); transition:transform .55s ease-in-out}
.wc-room.wc-shut .wc-blind{transform:none}
.wc-shut .wc-slot, .wc-look .wc-slot{pointer-events:none}

/* ---- Vanishing Shelf (vs-) ---- */
.vs-wrap{max-width:460px; margin:0 auto; display:grid; gap:16px}
.vs-case{position:relative; overflow:hidden; background:linear-gradient(180deg, #B97A45, #8E5A30); border-radius:22px; padding:14px 12px 4px;
  box-shadow:inset 0 0 0 6px #6E4422, 0 10px 22px rgba(0,0,0,.3)}
.vs-row{display:grid; grid-template-columns:repeat(var(--n), 1fr); gap:6px; padding:0 8px; position:relative; margin-bottom:18px}
.vs-row::after{content:""; position:absolute; left:-4px; right:-4px; bottom:-12px; height:12px; background:#E2B07A; border-radius:4px; box-shadow:0 5px 0 #6E4422}
.vs-spot{height:66px; display:grid; place-items:end center; font-size:clamp(38px, 11vw, 50px); line-height:1; position:relative; z-index:1}
.vs-spot span{filter:drop-shadow(0 3px 2px rgba(0,0,0,.3))}
.vs-spot.vs-gap::before{content:""; position:absolute; inset:6px 4px 2px; border:3px dashed rgba(255,255,255,.6); border-radius:14px}
.vs-spot.vs-back span{animation:bounceIn .4s}
.vs-spot.vs-back{border-radius:14px; background:rgba(60,196,107,.4)}
.vs-cloth{position:absolute; inset:0; z-index:5; display:grid; place-items:center; font:700 1.6rem var(--display); color:#fff;
  background:repeating-linear-gradient(45deg, #A98BFF 0 22px, #9677F0 22px 44px); transform:translateY(-102%); transition:transform .5s ease-in-out}
.vs-case.vs-shut .vs-cloth{transform:none}
.vs-opts{display:grid; grid-template-columns:repeat(var(--k), minmax(0, 92px)); justify-content:center; gap:12px}
.vs-opt{aspect-ratio:1; min-height:64px; padding:0; cursor:pointer; font-size:clamp(36px, 10vw, 46px); animation:bounceIn .3s backwards; transition:opacity .25s}
.vs-opt.vs-no{opacity:.3; pointer-events:none}
.vs-opt.vs-yes{--c:var(--leaf); --d:var(--leaf-d)}

/* ---- Dinner Seats (ds-) ---- */
.ds-wrap{max-width:440px; margin:0 auto; display:grid; gap:10px; justify-items:center}
.ds-row{display:flex; justify-content:center; gap:8px}
.ds-chair{width:76px; height:100px; padding:0; border:0; cursor:pointer; position:relative; border-radius:16px;
  background:linear-gradient(180deg, #D79A62, #B9773F); box-shadow:inset 0 0 0 5px #9A5E2E, 0 6px 0 #6E4422, 0 10px 14px rgba(0,0,0,.28);
  display:grid; place-items:center; font-size:30px; transition:box-shadow .2s}
.ds-chair > .ds-empty{opacity:.5}
.ds-chair.ds-glow{animation:wc-glow 1.1s ease-in-out infinite}
.ds-table{width:min(100%, var(--tw)); height:66px; border-radius:40px; display:flex; justify-content:space-around; align-items:center; padding:0 14px;
  background:radial-gradient(ellipse at 50% 40%, #FFFFFF, #F1E6D2); box-shadow:0 7px 0 #CDBBA0, 0 14px 20px rgba(0,0,0,.28); font-size:28px}
.ds-g{width:68px; height:90px; padding:2px 0 0; border:0; border-radius:16px; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:flex-start;
  position:relative; transition:transform .2s, box-shadow .2s}
.ds-g .h{font-size:24px; line-height:1; height:22px; position:relative; z-index:1; filter:drop-shadow(0 2px 1px rgba(0,0,0,.25))}
.ds-g .f{font-size:34px; line-height:1}
.ds-g .n{font:700 1.2rem/1.1 var(--display); margin-top:2px; white-space:nowrap}
.ds-g .s{position:absolute; top:4px; right:6px; font-size:.95rem; opacity:.7}
.ds-chair .ds-g{pointer-events:none; animation:bounceIn .3s}
.ds-g.ds-sel{transform:translateY(-8px); box-shadow:inset 0 -6px 0 rgba(0,0,0,.14), 0 6px 0 var(--d), 0 0 0 5px #fff, 0 14px 22px rgba(0,0,0,.35)}
.ds-wait{width:100%; min-height:110px; display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:10px 8px; padding:12px 8px;
  border-radius:20px; background:rgba(0,0,0,.18)}
.ds-wait .ds-g{animation:bounceIn .35s backwards}
.ds-look .ds-chair{pointer-events:none}

/* ---- Tower Recall (tr-) ---- */
.tr-wrap{max-width:460px; margin:0 auto; display:grid; gap:14px; justify-items:center}
.tr-towers{display:flex; gap:clamp(20px, 8vw, 50px); align-items:flex-end; justify-content:center}
.tr-tower{display:flex; flex-direction:column; align-items:center}
.tr-col{display:flex; flex-direction:column-reverse; align-items:center; gap:4px; padding:10px 12px 6px; border-radius:18px; transition:background .3s}
.tr-col.tr-active{background:rgba(255,255,255,.14); box-shadow:inset 0 0 0 3px rgba(255,255,255,.5)}
.tr-base{width:calc(var(--s) + 44px); height:16px; border-radius:6px; background:linear-gradient(#C98B52, #A86B38); box-shadow:0 6px 0 #6E4422, 0 10px 12px rgba(0,0,0,.25)}
.tr-slot{width:var(--s); height:var(--s); border-radius:20%; outline:3px dashed rgba(255,255,255,.4); outline-offset:-5px; display:grid; place-items:center}
.tr-slot:has(.tr-cube){outline-color:transparent}
.tr-cube{width:var(--s); height:var(--s); font:700 calc(var(--s) * .5) var(--display); color:rgba(24,36,44,.75); animation:drop .3s ease-out, bounceIn .3s}
.tr-hide .tr-cube{animation:pop .4s forwards}
.tr-pal{display:flex; flex-wrap:wrap; justify-content:center; gap:12px}
.tr-pc{width:64px; height:64px; padding:0; cursor:pointer; font:700 1.9rem var(--display); color:rgba(24,36,44,.75); animation:bounceIn .3s backwards}

/* ---- Dot Flash (df-) ---- */
.df-wrap{max-width:440px; margin:0 auto; display:grid; gap:16px; justify-items:center}
.df-board{position:relative; width:min(100%, 340px); min-height:250px; border-radius:26px; padding:14px; display:grid; gap:12px;
  grid-template-columns:repeat(var(--gc), auto); justify-content:center; align-content:center; place-items:center;
  background:var(--card); box-shadow:0 7px 0 var(--card-edge), 0 14px 24px rgba(0,0,0,.3); overflow:hidden}
.df-group{display:grid; grid-template-columns:repeat(3, var(--cs)); grid-auto-rows:var(--cs); gap:3px; padding:7px; border-radius:18px;
  background:var(--gb); rotate:var(--r); animation:bounceIn .35s backwards}
.df-cell{display:grid; place-items:center; font-size:calc(var(--cs) * .82); line-height:1}
.df-dot{width:86%; height:86%; border-radius:50%; font:700 calc(var(--cs) * .42) var(--display); color:rgba(24,36,44,.6)}
.df-cover{position:absolute; inset:0; display:grid; place-items:center; background:repeating-linear-gradient(45deg, #FFF3DC 0 20px, #FBE8C4 20px 40px);
  font:700 4rem var(--display); color:var(--orange-d); transform:scale(0); transition:transform .3s; border-radius:26px}
.df-board.df-shut .df-cover{transform:none}
.df-nums{display:grid; grid-template-columns:repeat(var(--k), minmax(0, 88px)); gap:12px; justify-content:center; width:100%}
.df-num{min-height:76px; font-size:2.3rem; padding:0; animation:bounceIn .3s backwards}
.df-num.df-no{opacity:.3; pointer-events:none}
.df-num.df-yes{--c:var(--leaf); --d:var(--leaf-d)}

/* ---- Echo Drums (ed-) ---- */
.ed-wrap{max-width:460px; margin:0 auto; display:grid; gap:16px; justify-items:center}
.ed-kit{display:flex; flex-wrap:wrap; justify-content:center; align-items:flex-end; gap:16px 12px; max-width:400px}
.ed-drum{width:var(--w); height:calc(var(--w) * 1.12); border:0; padding:0; background:transparent; cursor:pointer; position:relative; transition:transform .09s}
.ed-body{position:absolute; left:3px; right:3px; top:calc(var(--w) * .26); bottom:6px; border-radius:0 0 22px 22px / 0 0 16px 16px; overflow:hidden;
  background:linear-gradient(90deg, rgba(0,0,0,.2), rgba(255,255,255,.32) 32%, rgba(255,255,255,0) 55%, rgba(0,0,0,.24)), var(--c);
  box-shadow:0 6px 0 var(--d), 0 12px 16px rgba(0,0,0,.3)}
.ed-body::before{content:""; position:absolute; left:0; right:0; top:26%; bottom:22%;
  background:repeating-linear-gradient(60deg, transparent 0 10px, rgba(255,255,255,.75) 10px 13px, transparent 13px 20px),
             repeating-linear-gradient(-60deg, transparent 0 10px, rgba(255,255,255,.75) 10px 13px, transparent 13px 20px)}
.ed-body::after{content:""; position:absolute; left:0; right:0; bottom:0; height:14%; background:var(--d)}
.ed-top{position:absolute; left:0; right:0; top:0; height:calc(var(--w) * .52); border-radius:50%; display:grid; place-items:center;
  background:radial-gradient(circle at 50% 40%, #FFFFFF, #F2E5C9 70%); font:700 calc(var(--w) * .3) var(--display); color:var(--d);
  box-shadow:inset 0 -4px 0 rgba(0,0,0,.1), 0 0 0 6px var(--c), 0 3px 0 6px var(--d); transition:box-shadow .1s, background .1s; z-index:1}
.ed-drum.ed-lit{transform:translateY(5px) scale(1.05)}
.ed-drum.ed-lit .ed-top{background:#fff; box-shadow:inset 0 -4px 0 rgba(0,0,0,.1), 0 0 0 6px var(--c), 0 3px 0 6px var(--d), 0 0 34px 14px rgba(255,255,255,.85)}
.ed-watch .ed-drum{pointer-events:none}
.ed-beads{display:flex; flex-wrap:wrap; justify-content:center; gap:8px; min-height:22px}
.ed-beads i{width:20px; height:20px; border-radius:50%; background:rgba(255,255,255,.22)}
.ed-beads i.on{background:var(--sun); box-shadow:0 3px 0 var(--sun-d); animation:bounceIn .25s}
`);

  register({ id: 'changed', cat: 'memory', order: 8, name: 'What’s Changed?', icon: '🛋️', desc: 'Study the room, then spot what changed', start: startChanged });
  register({ id: 'vanish', cat: 'memory', order: 9, name: 'Vanishing Shelf', icon: '🫙', desc: 'Something left the shelf. What was it?', gentle: true, start: startVanish });
  register({ id: 'seats', cat: 'memory', order: 10, name: 'Dinner Seats', icon: '🍽️', desc: 'Remember where each guest sat', start: startSeats });
  register({ id: 'tower', cat: 'memory', order: 11, name: 'Tower Recall', icon: '🗼', desc: 'Watch the tower grow, then build it again', start: startTower });
  register({ id: 'dotflash', cat: 'memory', order: 12, name: 'Dot Flash', icon: '🔴', desc: 'Have a look, then say how many', start: startDots });
  register({ id: 'drums', cat: 'memory', order: 13, name: 'Echo Drums', icon: '🥁', desc: 'Listen to the drums, then play it back', start: startDrums });

  /* difficulty grows from 0 at level 1 towards max, then levels off */
  const ease = (L, max, k) => Math.round(max * (1 - Math.exp(-(Math.max(1, L) - 1) / k)));
  const btn = (label, cls, fn) => { const b = el('button', 'btn ' + cls, label); b.type = 'button'; b.onclick = fn; return b; };
  const SYM = { coral: '●', sky: '★', sun: '▲', leaf: '■', berry: '♥', orange: '◆', grape: '✿', peach: '⬟' };
  const combo = k => tone(440 * Math.pow(2, Math.min(k, 12) / 12 * 2), .16, 'triangle', .12);

  /* =========================================================
     WHAT'S CHANGED?
     ========================================================= */
  const WC_ITEMS = ['🪴', '🕰️', '📻', '🫖', '☕', '🍎', '🍋', '🧸', '📚', '🕯️', '🏺', '🌷', '🌻', '🧶', '🎩', '🍰', '🫙', '🧁', '🎁', '🔔',
    '⏰', '🪆', '🦆', '🐈', '🍐', '🧦', '🎈', '🪀', '🍓', '🐟', '🌵', '🍇'];
  const WC_NOCOL = new Set(['🕰️', '☕', '🫙', '🎩', '🕯️', '📻', '📚']);
  function startChanged(L, api) {
    const total = 3;
    const nChanges = L <= 4 ? 1 : L <= 10 ? 2 : 3;
    const twoShelves = L >= 6;
    const zones = [{ k: 'sill', n: 3 }, { k: 'shelf', n: 4 }].concat(twoShelves ? [{ k: 'shelf', n: 4 }] : [], [{ k: 'table', n: 3 }]);
    const nSlots = zones.reduce((a, z) => a + z.n, 0);
    const nItems = Math.min(nSlots - 3, 4 + ease(L, 7, 6));
    const types = L <= 2 ? ['move', 'swap'] : ['move', 'swap', 'colour'];
    let round = 0, mistakes = 0, misses = 0, phase = 'wait', state = [], changes = [];

    const wrap = el('div', 'wc-wrap'), room = el('div', 'wc-room');
    const slots = [];
    zones.forEach(z => {
      const row = el('div', 'wc-row'); row.style.setProperty('--n', z.n);
      for (let i = 0; i < z.n; i++) {
        const idx = slots.length, b = el('button', 'wc-slot', '<span></span>'); b.type = 'button';
        b.onclick = () => tap(idx); row.append(b); slots.push(b);
      }
      const zone = el('div', 'wc-zone');
      if (z.k === 'sill') { const w = el('div', 'wc-win'); w.append(row); zone.append(w, el('div', 'wc-ledge wc-sill')); }
      else if (z.k === 'shelf') zone.append(row, el('div', 'wc-ledge wc-plank'));
      else { zone.style.marginBottom = '0'; zone.append(row, el('div', 'wc-ledge wc-cloth'), el('div', 'wc-legs', '<i></i><i></i>')); }
      room.append(zone);
    });
    const blind = el('div', 'wc-blind', '✨ Changing…'); room.append(blind);
    const tools = el('div', 'm2-tools');
    const ready = btn('I’m ready ✓', 'c-leaf m2-big', () => { if (phase === 'look') { sfx.tap(); hideAndChange(); } });
    const help = btn('💡 Help me', 'c-card', () => {
      if (phase !== 'find') return; sfx.tap(); mistakes++; glowOne();
    });
    tools.append(ready, help);
    wrap.append(room, tools); api.stage.append(wrap);

    function render() {
      state.forEach((s, i) => {
        const sp = slots[i].firstChild;
        sp.textContent = s ? s.e : '';
        sp.style.filter = s && s.h ? `hue-rotate(${s.h}deg) saturate(1.6) drop-shadow(0 3px 2px rgba(0,0,0,.25))` : '';
        slots[i].dataset.item = s ? s.e + (s.h ? ':' + s.h : '') : '';
        slots[i].setAttribute('aria-label', s ? 'Item ' + s.e : 'Empty space');
      });
    }
    function newRound() {
      api.rounds(total, round); phase = 'look'; misses = 0;
      slots.forEach(b => b.classList.remove('wc-got', 'wc-glow'));
      const items = shuffle(WC_ITEMS.slice()).slice(0, nItems);
      // make sure at least one item can change colour when colour is on offer
      state = Array(nSlots).fill(null);
      const where = shuffle([...Array(nSlots).keys()]).slice(0, nItems);
      where.forEach((p, j) => { state[p] = { e: items[j], h: 0 }; });
      render(); room.classList.remove('wc-shut'); room.classList.add('wc-look');
      ready.hidden = false; help.hidden = true;
      api.hint('Have a good look at the room. Tap “I’m ready” when you know where things are.');
    }
    function makeChanges() {
      changes = []; const used = new Set();
      for (let c = 0; c < nChanges; c++) {
        const full = () => state.map((s, i) => i).filter(i => state[i] && !used.has(i));
        const empty = () => state.map((s, i) => i).filter(i => !state[i] && !used.has(i));
        let opts = shuffle(types.slice()), made = false;
        for (const t of opts) {
          if (t === 'move') {
            const a = full(), b = empty(); if (!a.length || !b.length) continue;
            const x = pick(a), y = pick(b); state[y] = state[x]; state[x] = null;
            changes.push({ t, slots: [x, y], show: [y] }); used.add(x); used.add(y); made = true;
          } else if (t === 'swap') {
            const a = full(); if (a.length < 2) continue;
            shuffle(a); const [x, y] = a; [state[x], state[y]] = [state[y], state[x]];
            changes.push({ t, slots: [x, y], show: [x, y] }); used.add(x); used.add(y); made = true;
          } else {
            const a = full().filter(i => !WC_NOCOL.has(state[i].e)); if (!a.length) continue;
            const x = pick(a); state[x] = { e: state[x].e, h: 120 + randInt(5) * 25 };
            changes.push({ t, slots: [x], show: [x] }); used.add(x); made = true;
          }
          if (made) break;
        }
      }
      changes.forEach(c => { c.found = false; });
    }
    function hideAndChange() {
      phase = 'hide'; ready.hidden = true; room.classList.add('wc-shut');
      tone(330, .25, 'sine', .08); tone(262, .3, 'sine', .08, .2);
      api.hint('Changing something…');
      api.later(() => { makeChanges(); render(); }, 800);
      api.later(() => {
        room.classList.remove('wc-shut', 'wc-look'); phase = 'find'; help.hidden = false;
        tone(392, .15, 'triangle', .1); tone(523, .2, 'triangle', .1, .12);
        hintLeft();
      }, 1300);
    }
    function hintLeft() {
      const left = changes.filter(c => !c.found).length;
      if (changes.length === 1) api.hint('One thing has changed. It may have moved, swapped places or changed colour. Tap it.');
      else api.hint(left === changes.length ? `${left} things have changed. Tap each one.` : left === 1 ? 'One more thing has changed. Can you find it?' : `${left} more things have changed.`);
    }
    function glowOne() {
      const c = changes.find(x => !x.found); if (!c) return;
      c.show.forEach(i => slots[i].classList.add('wc-glow'));
      api.hint('Look at the glowing spot. What’s different there?');
    }
    function tap(i) {
      if (phase !== 'find') return;
      const c = changes.find(x => !x.found && x.slots.includes(i));
      if (c) {
        c.found = true; misses = 0;
        c.slots.forEach(k => { slots[k].classList.remove('wc-glow'); if (state[k]) slots[k].classList.add('wc-got'); });
        if (!c.slots.some(k => state[k])) slots[i].classList.add('wc-got');
        const n = changes.filter(x => x.found).length; combo(n * 3);
        const what = c.t === 'move' ? 'It moved!' : c.t === 'swap' ? 'They swapped places!' : 'It changed colour!';
        if (changes.every(x => x.found)) {
          phase = 'wait'; help.hidden = true; round++; api.rounds(total, round);
          api.later(() => { sfx.good(); toast(cheer()); }, 200);
          api.hint(what + ' Well spotted.');
          if (round === total) api.done(starsFor(mistakes, 1, 3)); else api.later(newRound, 1900);
        } else { api.hint(what + ' ' + (changes.filter(x => !x.found).length === 1 ? 'One more to find.' : 'Keep looking.')); }
        return;
      }
      if (changes.some(x => x.found && x.slots.includes(i))) return;
      wob(slots[i]); sfx.soft();
      if (!state[i]) { api.hint('That space was empty before too. Look at the things in the room.'); return; }
      mistakes++; misses++;
      if (misses >= 3) glowOne(); else api.hint('That one hasn’t changed. Have another look.');
    }
    api.later(newRound, 300);
  }

  /* =========================================================
     VANISHING SHELF
     ========================================================= */
  const VS_SETS = [
    { n: 'pantry', items: ['🍯', '🫙', '🥫', '🍞', '🧀', '🥚', '🍪', '🫖', '🥛', '🧂'] },
    { n: 'fruit', items: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍇', '🍓', '🍒', '🥝', '🍑'] },
    { n: 'toy', items: ['🧸', '🪀', '🪁', '🎈', '🪆', '🚂', '⚽', '🎲', '🧩', '🦆'] },
    { n: 'garden', items: ['🌷', '🌻', '🌹', '🌼', '🪴', '🍄', '🐝', '🐞', '🦋', '🐌'] },
    { n: 'sewing box', items: ['🧶', '🧵', '✂️', '🧦', '🧤', '🧣', '👒', '🎀', '👓', '🪡'] }
  ];
  function startVanish(L, api) {
    const total = 4;
    const n = 3 + ease(L, 5, 6);                 // 3 .. 8 things on the shelf
    const k = L <= 2 ? 3 : L <= 7 ? 4 : 6;       // answer choices
    const reshuffle = L >= 5;                     // higher levels: no gap, the rest move about
    const sneaky = L >= 8;                        // one choice is still on the shelf
    const startSet = randInt(VS_SETS.length);
    let round = 0, mistakes = 0, phase = 'wait', shelf = [], gone = null, gapAt = -1;

    const wrap = el('div', 'vs-wrap'), cse = el('div', 'vs-case'), cloth = el('div', 'vs-cloth', '✨ Abracadabra…');
    const tools = el('div', 'm2-tools'), opts = el('div', 'vs-opts');
    const ready = btn('I’m ready ✓', 'c-leaf m2-big', () => { if (phase === 'look') { sfx.tap(); vanish(); } });
    tools.append(ready);
    wrap.append(cse, opts, tools); api.stage.append(wrap);
    let spots = [];

    function drawShelf() {
      cse.innerHTML = ''; spots = [];
      const per = shelf.length <= 4 ? shelf.length : Math.ceil(shelf.length / 2);
      for (let r = 0; r * per < shelf.length; r++) {
        const row = el('div', 'vs-row'); row.style.setProperty('--n', per);
        shelf.slice(r * per, r * per + per).forEach(e => {
          const s = el('div', 'vs-spot' + (e ? '' : ' vs-gap'), `<span>${e || ''}</span>`); s.dataset.item = e || '';
          row.append(s); spots.push(s);
        });
        cse.append(row);
      }
      cse.append(cloth);
    }
    function newRound() {
      api.rounds(total, round); phase = 'look'; opts.innerHTML = ''; ready.hidden = false;
      const set = VS_SETS[(startSet + round) % VS_SETS.length];
      shelf = shuffle(set.items.slice()).slice(0, n); gone = null; gapAt = -1;
      cse.classList.remove('vs-shut'); drawShelf();
      api.hint(`Here is the ${set.n} shelf. Have a good look, then tap “I’m ready”.`);
    }
    function vanish() {
      phase = 'hide'; ready.hidden = true; cse.classList.add('vs-shut'); tone(520, .3, 'sine', .07); tone(390, .35, 'sine', .07, .2);
      api.hint('Something is disappearing…');
      api.later(() => {
        const set = VS_SETS[(startSet + round) % VS_SETS.length];
        gapAt = randInt(shelf.length); gone = shelf[gapAt];
        if (reshuffle) { shelf = shuffle(shelf.filter((_, i) => i !== gapAt)); gapAt = -1; } else shelf[gapAt] = null;
        drawShelf(); cse.classList.add('vs-shut');
        const others = shuffle(set.items.filter(e => !shelf.includes(e) && e !== gone));
        const choices = [gone];
        if (sneaky) choices.push(pick(shelf.filter(Boolean)));
        const still = shuffle(shelf.filter(e => e && !choices.includes(e)));
        while (choices.length < k) choices.push(others.length ? others.pop() : still.pop());
        shuffle(choices);
        opts.style.setProperty('--k', k === 6 ? 3 : k); opts.innerHTML = '';
        choices.forEach((e, j) => {
          const b = el('button', 'vs-opt tile c-card', e); b.type = 'button'; b.dataset.item = e; b.style.animationDelay = (j * .06) + 's';
          b.onclick = () => choose(e, b); opts.append(b);
        });
      }, 700);
      api.later(() => {
        cse.classList.remove('vs-shut'); phase = 'pick';
        api.hint(reshuffle ? 'One thing has gone, and the rest moved about. Which one is missing?' : 'One thing has gone from the shelf. Which one was it?');
      }, 1200);
    }
    function choose(e, b) {
      if (phase !== 'pick') return;
      if (e === gone) {
        phase = 'wait'; b.classList.add('vs-yes'); sfx.good();
        if (gapAt >= 0) { shelf[gapAt] = gone; } else { gapAt = randInt(shelf.length + 1); shelf.splice(gapAt, 0, gone); }
        drawShelf(); spots[gapAt].classList.add('vs-back');
        round++; api.rounds(total, round); toast(cheer());
        api.hint('Yes! The ' + gone + ' is back on the shelf.');
        if (round === total) api.done(starsFor(mistakes, 1, 3)); else api.later(newRound, 1800);
      } else {
        mistakes++; sfx.soft(); b.classList.add('vs-no'); wob(b);
        const s = spots.find(x => x.dataset.item === e);
        if (s) { wob(s); api.hint('That one is still on the shelf, look! Try another.'); }
        else api.hint('That one wasn’t on the shelf. Try another.');
      }
    }
    api.later(newRound, 300);
  }

  /* =========================================================
     DINNER SEATS
     ========================================================= */
  const DS_GUESTS = [
    { n: 'Ada', f: '👵', h: '👒', c: 'berry' }, { n: 'Bert', f: '👴', h: '🎩', c: 'sky' }, { n: 'Cora', f: '👩‍🦰', h: '🎀', c: 'sun' },
    { n: 'Dan', f: '🧔', h: '🧢', c: 'leaf' }, { n: 'Elsie', f: '👱‍♀️', h: '👑', c: 'grape' }, { n: 'Fred', f: '👨‍🦳', h: '🎓', c: 'orange' },
    { n: 'Gwen', f: '👩', h: '🌸', c: 'peach' }, { n: 'Harry', f: '🧓', h: '⭐', c: 'coral' }
  ];
  function startSeats(L, api) {
    const total = 2;
    const nG = 2 + ease(L, 4, 6);                                  // 2 .. 6 guests
    const nC = Math.min(8, nG + (L >= 9 ? 2 : L >= 4 ? 1 : 0));     // spare chairs later on
    let round = 0, mistakes = 0, phase = 'wait', guests = [], seatOf = [], seated = [], sel = -1, wrongFor = 0;

    function guestEl(g, tag) {
      const e = el(tag, 'ds-g tile c-' + g.c, `<span class="h">${g.h}</span><span class="f">${g.f}</span><span class="n">${g.n}</span><span class="s">${SYM[g.c]}</span>`);
      if (tag === 'button') e.type = 'button';
      e.setAttribute('aria-label', g.n); e.dataset.name = g.n; return e;
    }
    let chairs = [], wait, ready, help, wrap;
    function build() {
      api.stage.innerHTML = '';
      wrap = el('div', 'ds-wrap ds-look');
      const top = Math.ceil(nC / 2), rows = [el('div', 'ds-row'), el('div', 'ds-row')];
      chairs = [...Array(nC)].map((_, i) => {
        const b = el('button', 'ds-chair', ''); b.type = 'button'; b.setAttribute('aria-label', 'Chair ' + (i + 1)); b.dataset.chair = i;
        b.onclick = () => tapChair(i); rows[i < top ? 0 : 1].append(b); return b;
      });
      const table = el('div', 'ds-table', [...Array(top)].map((_, i) => i === Math.floor(top / 2) && top > 1 ? '🕯️' : '🍽️').join(''));
      table.style.setProperty('--tw', (top * 84) + 'px');
      wait = el('div', 'ds-wait');
      ready = btn('I’m ready ✓', 'c-leaf m2-big', () => { if (phase === 'look') { sfx.tap(); standUp(); } });
      help = btn('💡 Help me', 'c-card', () => { if (phase !== 'seat') return; sfx.tap(); helpMe(); });
      const tools = el('div', 'm2-tools'); tools.append(help); help.hidden = true;
      wrap.append(rows[0], table, rows[1], wait, tools); api.stage.append(wrap);
    }
    function drawChairs() {
      chairs.forEach((b, i) => {
        b.innerHTML = ''; b.classList.remove('ds-glow');
        const gi = seated[i];
        if (gi >= 0) b.append(guestEl(guests[gi], 'span')); else b.append(el('span', 'ds-empty', '🪑'));
      });
    }
    function newRound() {
      api.rounds(total, round); phase = 'look'; sel = -1;
      guests = shuffle(DS_GUESTS.slice()).slice(0, nG);
      const order = shuffle([...Array(nC).keys()]);
      seatOf = guests.map((_, i) => order[i]);
      seated = Array(nC).fill(-1); seatOf.forEach((c, gi) => { seated[c] = gi; });
      build(); drawChairs(); wait.append(ready);
      api.hint('Dinner is served! Remember who is sitting where, then tap “I’m ready”.');
    }
    function standUp() {
      phase = 'up'; seated = Array(nC).fill(-1); drawChairs(); wait.innerHTML = '';
      tone(392, .15, 'triangle', .08); tone(330, .2, 'triangle', .08, .12);
      shuffle(guests.map((_, i) => i)).forEach((gi, j) => {
        const b = guestEl(guests[gi], 'button'); b.style.animationDelay = (j * .08) + 's';
        b.onclick = () => tapGuest(gi); wait.append(b);
      });
      wrap.classList.remove('ds-look'); help.hidden = false;
      phase = 'seat'; api.hint('Everyone got up! Tap a guest, then tap the chair where they sat.');
    }
    function guestBtn(gi) { return [...wait.children].find(b => b.dataset.name === guests[gi].n); }
    function tapGuest(gi) {
      if (phase !== 'seat') return;
      sfx.tap(); sel = gi; wrongFor = 0;
      [...wait.children].forEach(b => b.classList.toggle('ds-sel', b.dataset.name === guests[gi].n));
      chairs.forEach(c => c.classList.remove('ds-glow'));
      api.hint(`Where did ${guests[gi].n} sit? Tap the chair.`);
    }
    function tapChair(ci) {
      if (phase !== 'seat') return;
      if (sel < 0) { sfx.soft(); api.hint('First tap a guest, then tap their chair.'); return; }
      if (seated[ci] >= 0) return;
      const g = guests[sel];
      if (seatOf[sel] === ci) {
        seated[ci] = sel; guestBtn(sel).remove(); sel = -1; drawChairs();
        const done = seated.filter(x => x >= 0).length; combo(done * 2);
        if (done === nG) {
          phase = 'wait'; help.hidden = true; round++; api.rounds(total, round);
          api.later(() => { sfx.good(); toast(cheer()); }, 250);
          api.hint('Everyone is back in their seat. Lovely dinner!');
          if (round === total) api.done(starsFor(mistakes, 1, 4)); else api.later(newRound, 2000);
        } else api.hint(`Yes, that was ${g.n}’s seat! Who’s next?`);
      } else {
        mistakes++; wrongFor++; sfx.soft(); wob(chairs[ci]);
        if (wrongFor >= 2) { chairs[seatOf[sel]].classList.add('ds-glow'); api.hint(`${g.n} sat in the glowing chair.`); }
        else api.hint(`Hmm, I don’t think ${g.n} sat there. Try another chair.`);
      }
    }
    function helpMe() {
      mistakes++;
      if (sel < 0) { const left = guests.map((_, i) => i).filter(i => seated[seatOf[i]] < 0); tapGuest(left[0]); }
      chairs[seatOf[sel]].classList.add('ds-glow'); api.hint(`${guests[sel].n} sat in the glowing chair.`);
    }
    api.later(newRound, 300);
  }

  /* =========================================================
     TOWER RECALL
     ========================================================= */
  function startTower(L, api) {
    const total = 3;
    const two = L >= 8;
    const h = two ? 3 + ease(L - 7, 2, 6) : 2 + ease(L, 5, 6);   // one tower 2..7, then two towers 3..5 each
    const nCol = L <= 2 ? 3 : L <= 5 ? 4 : 5;
    const pal = CUBES.slice(0, nCol);
    const size = h >= 6 ? 44 : h >= 5 ? 50 : 56;
    let round = 0, mistakes = 0, phase = 'wait', target = [], built = [], cur = 0, misses = 0;

    const wrap = el('div', 'tr-wrap'), towers = el('div', 'tr-towers'), palette = el('div', 'tr-pal'), tools = el('div', 'm2-tools');
    wrap.style.setProperty('--s', size + 'px');
    const ready = btn('I’m ready ✓', 'c-leaf m2-big', () => { if (phase === 'look') { sfx.tap(); hide(); } });
    const again = btn('👀 Show me again', 'c-card', () => { if (phase === 'build') { sfx.tap(); mistakes++; showAgain(); } });
    tools.append(ready, again);
    wrap.append(towers, palette, tools); api.stage.append(wrap);
    let cols = [];

    function makeTower() {
      const t = [];
      while (t.length < h) {
        const x = randInt(nCol);
        if (t.length >= 2 && t[t.length - 1] === x && t[t.length - 2] === x) continue;
        t.push(x);
      }
      if (h >= 3 && new Set(t).size === 1) t[1] = (t[1] + 1) % nCol;
      return t;
    }
    function draw(full) {
      towers.innerHTML = ''; cols = [];
      target.forEach((t, ti) => {
        const tw = el('div', 'tr-tower'), col = el('div', 'tr-col' + (!full && ti === cur && phase === 'build' ? ' tr-active' : ''));
        for (let i = 0; i < h; i++) {
          const s = el('div', 'tr-slot'); col.append(s);
          const ci = full ? t[i] : built[ti][i];
          if (ci !== undefined) s.append(cubeEl(ci, false));
        }
        tw.append(col, el('div', 'tr-base')); towers.append(tw); cols.push(col);
      });
    }
    function cubeEl(ci, anim) {
      const c = el('div', 'tr-cube tile c-' + pal[ci].c, pal[ci].s); c.dataset.c = pal[ci].c;
      if (!anim) c.style.animation = 'none';
      return c;
    }
    function newRound() {
      api.rounds(total, round); phase = 'show'; ready.hidden = true; again.hidden = true; palette.innerHTML = '';
      target = two ? [makeTower(), makeTower()] : [makeTower()];
      built = target.map(() => []); cur = 0; misses = 0;
      draw(false);
      api.hint(two ? 'Watch the two towers being built…' : 'Watch the tower being built, from the bottom up…');
      let k = 0;
      target.forEach((t, ti) => t.forEach((ci, i) => {
        api.later(() => {
          cols[ti].children[i].append(cubeEl(ci, true)); tone(330 * Math.pow(2, (i + ti * 2) / 12 * 2), .14, 'triangle', .11);
        }, 400 + (k++) * 650);
      }));
      api.later(() => {
        phase = 'look'; ready.hidden = false;
        api.hint(two ? 'Remember both towers. Tap “I’m ready” to hide them.' : 'Remember the colours, bottom to top. Tap “I’m ready” to hide it.');
      }, 400 + k * 650);
    }
    function hide() {
      phase = 'hide'; ready.hidden = true; towers.classList.add('tr-hide'); tone(440, .2, 'sine', .07); tone(330, .25, 'sine', .07, .15);
      api.later(() => { towers.classList.remove('tr-hide'); startBuild(); }, 450);
    }
    function startBuild() {
      phase = 'build'; draw(false); again.hidden = false; misses = 0;
      palette.innerHTML = '';
      pal.forEach((p, i) => {
        const b = el('button', 'tr-pc tile c-' + p.c, p.s); b.type = 'button'; b.dataset.c = p.c; b.style.animationDelay = (i * .05) + 's';
        b.setAttribute('aria-label', p.c + ' cube'); b.onclick = () => place(i, b); palette.append(b);
      });
      buildHint();
    }
    function buildHint() {
      const pos = built[cur].length;
      const where = two ? (cur === 0 ? 'the left tower' : 'the right tower') : 'the tower';
      api.hint(pos === 0 ? `Build ${where} again. Tap the bottom cube’s colour first.` : `Good. What colour came next on ${where}?`);
    }
    function showAgain() {
      phase = 'look2'; draw(true); palette.style.visibility = 'hidden'; again.hidden = true;
      const back = btn('Hide it again ✓', 'c-leaf m2-big', () => { sfx.tap(); back.remove(); palette.style.visibility = ''; phase = 'build'; draw(false); again.hidden = false; buildHint(); });
      tools.append(back);
      api.hint('Here it is again. Take your time, then hide it.');
    }
    function place(i, b) {
      if (phase !== 'build') return;
      const pos = built[cur].length;
      if (target[cur][pos] === i) {
        built[cur].push(i); misses = 0;
        cols[cur].children[pos].append(cubeEl(i, true)); combo(pos + cur * 3 + 2);
        if (built[cur].length === h) {
          if (cur < target.length - 1) {
            cur++; sfx.good(); draw(false);
            api.hint('That tower is right! Now build the right tower.'); return;
          }
          phase = 'wait'; again.hidden = true; round++; api.rounds(total, round);
          api.later(() => { sfx.good(); toast(cheer()); }, 250);
          api.hint(two ? 'Both towers are just right!' : 'That’s the tower, just right!');
          if (round === total) api.done(starsFor(mistakes, 1, 3)); else api.later(newRound, 1900);
        } else buildHint();
      } else {
        mistakes++; misses++; sfx.soft(); wob(b);
        if (misses >= 2) { const want = pal[target[cur][pos]]; wob(palette.children[target[cur][pos]]); api.hint(`It was the ${want.s} one. Tap it.`); }
        else api.hint('Not that colour. Have a think, or tap “Show me again”.');
      }
    }
    api.later(newRound, 300);
  }

  /* =========================================================
     DOT FLASH
     ========================================================= */
  const DF_PATTERNS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const DF_THINGS = ['🍎', '🐤', '🌼', '⭐', '🐞', '🍓', '🧁', '🐟', '🎈', '🍪'];
  const DF_TINT = ['#FFE3DA', '#DDEEFF', '#FFF0C2', '#DDF6E5'];
  function startDots(L, api) {
    const total = 5;
    let round = 0, mistakes = 0, phase = 'wait', count = 0;
    const wrap = el('div', 'df-wrap'), board = el('div', 'df-board'), nums = el('div', 'df-nums'), tools = el('div', 'm2-tools');
    const hideB = btn('Hide them ✓', 'c-leaf m2-big', () => { if (phase === 'look') { sfx.tap(); hide(); } });
    const again = btn('👀 Look again', 'c-card', () => { if (phase === 'pick') { sfx.tap(); mistakes++; look(true); } });
    tools.append(hideB, again);
    wrap.append(board, nums, tools); api.stage.append(wrap);

    function plan() {
      // groups get more numerous and bigger, but each stays small enough to see at a glance
      const g = L <= 2 ? 1 : L <= 5 ? 2 : L <= 9 ? 3 : 3 + randInt(2);
      const maxG = L === 1 ? 3 : L === 2 ? 4 : L <= 5 ? 3 + (L >= 4 ? 1 : 0) : L <= 9 ? 4 : 5;
      const minG = L <= 2 ? 1 : L <= 9 ? 1 : 2;
      let sizes;
      do { sizes = [...Array(g)].map(() => minG + randInt(maxG - minG + 1)); } while (sizes.reduce((a, b) => a + b, 0) > 16);
      return sizes;
    }
    function draw(sizes, dots) {
      board.innerHTML = '';
      const g = sizes.length, gc = g === 1 ? 1 : 2;
      board.style.setProperty('--gc', gc);
      const cs = g === 1 ? 54 : 34;
      const thing = pick(DF_THINGS);
      const slots = g === 3 ? shuffle([0, 1, 2, 3]).slice(0, 3).sort() : [...Array(g).keys()];
      const cells = [...Array(g === 1 ? 1 : g === 2 ? 2 : 4)].map(() => el('div', ''));
      sizes.forEach((n, gi) => {
        const grp = el('div', 'df-group');
        grp.style.setProperty('--cs', cs + 'px'); grp.style.setProperty('--gb', DF_TINT[gi % 4]);
        grp.style.setProperty('--r', (randInt(13) - 6) + 'deg'); grp.style.animationDelay = (gi * .08) + 's';
        const on = new Set(DF_PATTERNS[n]), cube = CUBES[(gi + round) % CUBES.length];
        for (let i = 0; i < 9; i++) {
          const c = el('div', 'df-cell');
          if (on.has(i)) {
            if (dots) { const d = el('span', 'df-dot tile df-item c-' + cube.c, cube.s); c.append(d); }
            else c.append(el('span', 'df-item', thing));
          }
          grp.append(c);
        }
        cells[slots[gi]] = grp;
      });
      cells.forEach(c => board.append(c));
      board.append(el('div', 'df-cover', '?'));
      board.setAttribute('aria-label', count + ' things');
    }
    function newRound() {
      api.rounds(total, round); nums.innerHTML = ''; again.hidden = true;
      const sizes = plan(); count = sizes.reduce((a, b) => a + b, 0);
      board.dataset.count = count;
      draw(sizes, round % 2 === 0);
      look(false);
    }
    function look(repeat) {
      phase = 'look'; board.classList.remove('df-shut'); hideB.hidden = false; again.hidden = true; nums.hidden = true;
      api.hint(repeat ? 'Here they are again. Hide them when you are ready.'
        : L <= 2 ? 'How many can you see? Tap “Hide them” when you know.'
        : 'How many altogether? Count the little groups, then tap “Hide them”.');
    }
    function hide() {
      phase = 'pick'; board.classList.add('df-shut'); hideB.hidden = true; again.hidden = false; nums.hidden = false;
      tone(500, .12, 'triangle', .07);
      if (!nums.children.length) {
        const k = L <= 2 ? 3 : 4;
        const set = new Set([count]);
        const near = shuffle([-2, -1, 1, 2].map(d => count + d).filter(x => x >= 1));
        while (set.size < k && near.length) set.add(near.pop());
        let x = count + 3; while (set.size < k) set.add(x++);
        nums.style.setProperty('--k', k);
        [...set].sort((a, b) => a - b).forEach((v, j) => {
          const b = el('button', 'btn c-sun df-num', String(v)); b.type = 'button'; b.dataset.v = v; b.style.animationDelay = (j * .06) + 's';
          b.onclick = () => choose(v, b); nums.append(b);
        });
      }
      api.hint('How many were there? Tap the number.');
    }
    function choose(v, b) {
      if (phase !== 'pick') return;
      if (v === count) {
        phase = 'wait'; b.classList.add('df-yes'); board.classList.remove('df-shut'); again.hidden = true;
        sfx.good(); round++; api.rounds(total, round); toast(cheer());
        api.hint(`Yes, ${count}!`);
        if (round === total) api.done(starsFor(mistakes, 1, 3)); else api.later(newRound, 1700);
      } else {
        mistakes++; sfx.soft(); b.classList.add('df-no');
        api.hint('Not quite. Let’s have another look.');
        api.later(() => { if (phase === 'pick') look(true); }, 900);
      }
    }
    api.later(newRound, 300);
  }

  /* =========================================================
     ECHO DRUMS
     ========================================================= */
  const ED_DRUMS = [
    { c: 'coral', s: '●', name: 'big red drum', w: 104, play: d => { tone(70, .38, 'sine', .4, d); tone(105, .14, 'sine', .22, d); tone(160, .04, 'triangle', .08, d); } },
    { c: 'sun', s: '▲', name: 'yellow drum', w: 96, play: d => { tone(115, .28, 'sine', .34, d); tone(175, .1, 'sine', .16, d); tone(260, .04, 'triangle', .07, d); } },
    { c: 'leaf', s: '■', name: 'green drum', w: 92, play: d => { tone(185, .2, 'sine', .28, d); tone(280, .07, 'triangle', .1, d); } },
    { c: 'sky', s: '★', name: 'blue drum', w: 86, play: d => { tone(620, .07, 'square', .05, d); tone(930, .05, 'triangle', .08, d); } },
    { c: 'berry', s: '♥', name: 'pink drum', w: 80, play: d => { tone(1050, .05, 'square', .045, d); tone(1580, .04, 'triangle', .07, d); } }
  ];
  function startDrums(L, api) {
    const total = 3;
    const nD = L <= 3 ? 3 : L <= 7 ? 4 : 5;
    const use = nD === 3 ? [0, 2, 4] : nD === 4 ? [0, 1, 3, 4] : [0, 1, 2, 3, 4];
    const drums = use.map(i => ED_DRUMS[i]);
    const base = 2 + ease(L, 4, 7);                  // 2 .. 6, plus one per round, so up to 8
    const swing = L >= 4;                            // later rhythms mix quick and slow beats
    let round = 0, mistakes = 0, phase = 'wait', seq = [], gaps = [], pos = 0;

    const wrap = el('div', 'ed-wrap ed-watch'), kit = el('div', 'ed-kit'), beads = el('div', 'ed-beads'), tools = el('div', 'm2-tools');
    const btns = drums.map((d, i) => {
      const b = el('button', 'ed-drum c-' + d.c, `<span class="ed-body"></span><span class="ed-top">${d.s}</span>`); b.type = 'button';
      b.style.setProperty('--w', d.w + 'px'); b.setAttribute('aria-label', d.name); b.dataset.i = i;
      b.onclick = () => hit(i); kit.append(b); return b;
    });
    const replay = btn('🔁 Play it again', 'c-card', () => { if (phase === 'play') { sfx.tap(); listen(true); } });
    const sound = btn('🔊 Turn sound on', 'c-sun', () => { R.unmute(); sound.hidden = true; });
    sound.hidden = !R.isMuted();
    tools.append(replay, sound);
    wrap.append(beads, kit, tools); api.stage.append(wrap);

    function flash(i, ms) {
      const b = btns[i]; b.classList.remove('ed-lit'); void b.offsetWidth; b.classList.add('ed-lit'); drums[i].play(0);
      api.later(() => b.classList.remove('ed-lit'), ms);
    }
    function setBeads(n) { beads.innerHTML = seq.map((_, k) => `<i class="${k < n ? 'on' : ''}"></i>`).join(''); }
    function newRound() {
      api.rounds(total, round);
      const len = Math.min(8, base + round);
      seq = []; gaps = [];
      while (seq.length < len) {
        let x = randInt(nD);
        if (seq.length >= 2 && seq[seq.length - 1] === x && seq[seq.length - 2] === x) continue;
        seq.push(x); gaps.push(swing && randInt(3) === 0 ? 380 : 720);
      }
      if (len >= 3 && new Set(seq).size === 1) seq[1] = (seq[1] + 1) % nD;
      listen(false);
    }
    function listen(again) {
      phase = 'listen'; pos = 0; wrap.classList.add('ed-watch'); replay.hidden = true; setBeads(0);
      api.hint(again ? 'Listen again…' : 'Watch and listen to the drums…');
      let t = 700;
      seq.forEach((d, k) => { api.later(() => { flash(d, 260); setBeads(k + 1); }, t); t += gaps[k]; });
      api.later(() => {
        phase = 'play'; wrap.classList.remove('ed-watch'); replay.hidden = false; setBeads(0);
        api.hint(`Your turn! Play the ${seq.length} beats back.`);
      }, t + 300);
    }
    function hit(i) {
      if (phase !== 'play') { return; }
      flash(i, 200);
      if (i === seq[pos]) {
        pos++; setBeads(pos);
        if (pos === seq.length) {
          phase = 'wait'; replay.hidden = true; round++; api.rounds(total, round);
          api.later(() => { sfx.good(); toast(cheer()); }, 350);
          api.hint('Ba-dum! That was it exactly.');
          if (round === total) api.done(starsFor(mistakes, 1, 3)); else api.later(newRound, 1900);
        }
      } else {
        mistakes++; phase = 'wait'; sfx.soft(); wob(btns[i]);
        api.hint('Not quite. Let’s listen to it again.');
        api.later(() => listen(true), 1300);
      }
    }
    api.later(newRound, 400);
  }
})();
