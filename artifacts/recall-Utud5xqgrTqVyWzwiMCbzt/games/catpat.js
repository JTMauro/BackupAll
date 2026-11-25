/* Recall: Category Patience. Open a category with its gold card, then sort picture cards onto it. */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer } = R;
  const TEST = !!window.__recallTest; // test hooks only exist when a test harness sets this before load

  /* ---------------- categories: [full name, short card label, icon, items] ---------------- */
  const CATS = [
    ['Fruit', 'Fruit', '🧺', '🍎 Apple,🍐 Pear,🍊 Orange,🍋 Lemon,🍇 Grapes,🍒 Cherry,🍌 Banana,🍑 Peach,🍈 Melon,🥝 Kiwi'],
    ['Animals', 'Animals', '🐾', '🐶 Dog,🐱 Cat,🐰 Rabbit,🐴 Horse,🐮 Cow,🐷 Pig,🐑 Sheep,🐭 Mouse,🦊 Fox,🐻 Bear'],
    ['Flowers', 'Flowers', '💐', '🌹 Rose,🌷 Tulip,🌼 Daisy,🌻 Sunflower,🌸 Blossom,🌺 Hibiscus,🏵️ Rosette,🍀 Clover'],
    ['In the Kitchen', 'Kitchen', '🧂', '🫖 Teapot,🍳 Pan,🥄 Spoon,🍴 Cutlery,🔪 Knife,☕ Cup,🥣 Bowl,🍽️ Plate'],
    ['Clothes', 'Clothes', '👚', '👔 Shirt,👗 Dress,🎩 Hat,🧣 Scarf,🧤 Gloves,🧦 Socks,🧥 Coat,👞 Shoes,👖 Jeans'],
    ['Weather', 'Weather', '⛅', '☀️ Sun,🌧️ Rain,❄️ Snow,☁️ Cloud,🌈 Rainbow,⛈️ Storm,🌬️ Wind,🌫️ Fog,☂️ Umbrella'],
    ['Transport', 'Transport', '🚦', '🚗 Car,🚌 Bus,🚂 Train,⛵ Boat,✈️ Plane,🚲 Bike,🚕 Taxi,🚚 Lorry,🚜 Tractor'],
    ['Music', 'Music', '🎵', '🎹 Piano,🎸 Guitar,🎻 Violin,🥁 Drum,🎺 Trumpet,🎷 Sax,📻 Radio,💿 Record,🔔 Bell'],
    ['Garden', 'Garden', '🏡', '🌳 Tree,🌿 Herbs,🐝 Bee,🐞 Ladybird,🐌 Snail,🌱 Seedling,🍂 Leaves,🍄 Mushroom,🌵 Cactus'],
    ['Seaside', 'Seaside', '🏖️', '🐚 Shell,🦀 Crab,🌊 Waves,🐟 Fish,🐳 Whale,🐬 Dolphin,🐙 Octopus,⚓ Anchor,🏝️ Island'],
    ['Sweets & Cakes', 'Sweets', '🎂', '🍰 Cake,🧁 Cupcake,🍩 Donut,🍪 Biscuit,🍭 Lolly,🍬 Toffee,🍫 Chocs,🥧 Pie,🍦 Ice cream,🍯 Honey'],
    ['Sports', 'Sports', '🏆', '⚽ Football,🎾 Tennis,⛳ Golf,🏏 Cricket,🎳 Bowling,🏉 Rugby,🎱 Snooker,🥊 Boxing,🎯 Darts'],
    ['Birds', 'Birds', '🐦', '🦉 Owl,🦆 Duck,🐤 Chick,🦢 Swan,🦅 Eagle,🦜 Parrot,🦚 Peacock,🐧 Penguin,🐓 Rooster,🕊️ Dove'],
    ['Colours', 'Colours', '🎨', '🔴 Red,🔵 Blue,🟢 Green,🟡 Yellow,🟣 Purple,🟤 Brown,⚫ Black,⚪ White'],
    ['Vegetables', 'Veg', '🥗', '🥕 Carrot,🥔 Potato,🌽 Corn,🥦 Broccoli,🧅 Onion,🧄 Garlic,🍅 Tomato,🥒 Cucumber,🍆 Aubergine'],
    ['At Home', 'Home', '🏠', '🛏️ Bed,🪑 Chair,🛋️ Sofa,💡 Lamp,🕰️ Clock,🚪 Door,🛁 Bath,🔑 Key,🧸 Teddy']
  ].map(([n, s, i, list]) => ({ n, s, i, items: list.split(',').map(x => { const p = x.indexOf(' '); return [x.slice(0, p), x.slice(p + 1)]; }) }));
  /* colour + shape pairs (the CUBES five, then three more shapes) so colour is never the only clue */
  const STY = [{ c: 'coral', s: '●' }, { c: 'sky', s: '★' }, { c: 'sun', s: '▲' }, { c: 'leaf', s: '■' },
    { c: 'berry', s: '♥' }, { c: 'grape', s: '◆' }, { c: 'orange', s: '✚' }, { c: 'mint', s: '▼' }];

  /* ---------------- levels ---------------- */
  const TABLE = [null,
    { nc: 3, size: 4, slots: 2, downs: [0, 1, 1], rec: -1 },
    { nc: 3, size: 5, slots: 2, downs: [1, 1, 1], rec: -1 },
    { nc: 4, size: 4, slots: 3, downs: [0, 1, 1, 2], rec: -1 },
    { nc: 4, size: 5, slots: 3, downs: [1, 1, 2, 2], rec: -1 },
    { nc: 5, size: 5, slots: 3, downs: [1, 2, 2, 2], rec: -1 },
    { nc: 5, size: 6, slots: 3, downs: [1, 1, 2, 2, 3], rec: 3 },
    { nc: 6, size: 5, slots: 4, downs: [1, 2, 2, 3, 3], rec: 3 },
    { nc: 6, size: 6, slots: 4, downs: [1, 2, 3, 3, 3], rec: 2 },
    { nc: 7, size: 5, slots: 4, downs: [2, 2, 3, 3, 3], rec: 2 }];
  function params(L) {
    if (L < TABLE.length) { const t = TABLE[L]; return { ...t, downs: t.downs.slice() }; }
    const [nc, size] = pick([[6, 5], [6, 6], [6, 7], [7, 5], [7, 6], [8, 5]]); // 6-8 categories of 5-7 cards
    const downs = [0, 0, 0, 0, 0].map(() => 2 + randInt(3)).sort((a, b) => a - b);
    return { nc, size, slots: 4, downs, rec: 2 };
  }
  function easier(P) {
    P = { ...P, downs: P.downs.slice() };
    if (P.rec !== -1) P.rec = -1;
    else if (P.downs.some(d => d > 1)) { const i = P.downs.indexOf(Math.max(...P.downs)); P.downs[i]--; }
    else if (P.nc > 3) P.nc--;
    return P;
  }

  /* ---------------- deal ---------------- */
  function mkDeal(P) {
    const sty = shuffle(STY.slice());
    const cats = shuffle(CATS.map((_, i) => i)).slice(0, P.nc).map((ci, d) => {
      const C = CATS[ci]; return { n: C.n, s: C.s, i: C.i, items: shuffle(C.items.slice()).slice(0, P.size - 1), st: sty[d], size: P.size };
    });
    const cards = []; cats.forEach((c, d) => { cards.push({ cat: d, k: -1 }); c.items.forEach((_, k) => cards.push({ cat: d, k })); });
    const order = shuffle(cards.map((_, i) => i));
    const cols = [], down = []; let p = 0;
    P.downs.forEach(dn => { cols.push(order.slice(p, p + dn + 1)); down.push(dn); p += dn + 1; });
    const s = { cols, down, stock: order.slice(p), waste: [], slot: Array(P.slots).fill(-1), cnt: Array(P.slots).fill(0), gone: cats.map(() => 0), rec: P.rec };
    return { cats, cards, s };
  }
  const ctx = D => ({ CAT: D.cards.map(c => c.cat), GOLD: D.cards.map(c => c.k < 0), SIZE: D.cats.map(c => c.size) });
  const clone = s => ({ cols: s.cols.map(c => c.slice()), down: s.down.slice(), stock: s.stock.slice(), waste: s.waste.slice(), slot: s.slot.slice(), cnt: s.cnt.slice(), gone: s.gone.slice(), rec: s.rec });
  const top = a => a[a.length - 1];

  /* ---------------- rules (shared by the game and the solver) ---------------- */
  function canCol(X, s, id, to, from) {
    if (to === from) return false;
    const c = s.cols[to]; return !c.length || X.CAT[top(c)] === X.CAT[id];
  }
  function canSlot(X, s, id, j) { return X.GOLD[id] ? s.slot[j] === -1 : s.slot[j] === X.CAT[id]; }
  function liftCol(s, i) { // remove the top card, turning over the card beneath if needed
    const id = s.cols[i].pop(), n = s.cols[i].length;
    if (s.down[i] >= n) s.down[i] = Math.max(0, n - 1);
    return id;
  }
  function place(X, s, id, d) { // returns the category completed, or -1
    if (d.k === 'c') { s.cols[d.to].push(id); return -1; }
    const j = d.j;
    if (X.GOLD[id]) { s.slot[j] = X.CAT[id]; s.cnt[j] = 1; } else s.cnt[j]++;
    if (s.cnt[j] >= X.SIZE[s.slot[j]]) { const c = s.slot[j]; s.gone[c] = 1; s.slot[j] = -1; s.cnt[j] = 0; return c; }
    return -1;
  }
  /* take a card from the stock/waste by turning the pile exactly as a player would; returns the taps used */
  function takeTalon(s, id) {
    if (s.waste.length && top(s.waste) === id) { s.waste.pop(); return 0; }
    let a = 0, p = s.stock.indexOf(id);
    if (p < 0) {
      while (s.stock.length) { s.waste.push(s.stock.pop()); a++; }
      s.stock = s.waste.reverse(); s.waste = []; if (s.rec > 0) s.rec--; a++;
      p = s.stock.indexOf(id);
    }
    while (s.stock.length - 1 > p) { s.waste.push(s.stock.pop()); a++; }
    s.stock.pop(); return a + 1;
  }
  function talonCost(s, id) {
    if (s.waste.length && top(s.waste) === id) return 0;
    const p = s.stock.indexOf(id); if (p >= 0) return s.stock.length - p;
    if (s.rec === 0) return -1;
    return s.stock.length + 2 + s.waste.indexOf(id);
  }

  /* ---------------- solver: DFS with memo over the whole state ----------------
     Moves are "macro" moves: a talon move turns the pile until the card is on top and plays it.
     With unlimited turns of the pile any talon card can be reached and the rest keep their order,
     so the talon is remembered as a set; with limited turns its exact order is part of the state. */
  function moves(X, s) {
    const nC = s.cols.length, emptyCol = s.cols.findIndex(c => !c.length), emptySlot = s.slot.indexOf(-1);
    const openJ = id => X.GOLD[id] ? -1 : s.slot.indexOf(X.CAT[id]);
    for (let i = 0; i < nC; i++) if (s.cols[i].length) { const id = top(s.cols[i]), j = openJ(id); if (j >= 0) return [{ t: 'c', i, id, d: { k: 's', j } }]; }
    const tal = [];
    for (const id of s.stock.concat(s.waste)) { const c = talonCost(s, id); if (c >= 0) tal.push({ id, c }); }
    tal.sort((a, b) => a.c - b.c);
    const tItems = tal.filter(x => openJ(x.id) >= 0);
    if (tItems.length && (tItems[0].c === 0 || s.rec === -1)) return [{ t: 't', id: tItems[0].id, d: { k: 's', j: openJ(tItems[0].id) } }];
    const A = [], B = [], C = [], Dm = [], E = [];
    for (let i = 0; i < nC; i++) {
      const col = s.cols[i]; if (!col.length) continue;
      const id = top(col), n = col.length, reveal = s.down[i] > 0 && s.down[i] === n - 1;
      if (X.GOLD[id] && emptySlot >= 0) A.push({ t: 'c', i, id, d: { k: 's', j: emptySlot }, w: s.down[i] });
      const under = n > 1 ? col[n - 2] : -1;
      if (!reveal && under >= 0 && X.CAT[under] === X.CAT[id]) continue; // splitting a same-category run never helps
      for (let to = 0; to < nC; to++) {
        if (!s.cols[to].length && (to !== emptyCol || n === 1)) continue;
        if (!canCol(X, s, id, to, i)) continue;
        (reveal ? C : E).push({ t: 'c', i, id, d: { k: 'c', to }, w: s.down[i] });
      }
    }
    for (const { id } of tal) {
      if (X.GOLD[id] && emptySlot >= 0) B.push({ t: 't', id, d: { k: 's', j: emptySlot } });
      const j = openJ(id); if (j >= 0) B.push({ t: 't', id, d: { k: 's', j } });
      for (let to = 0; to < nC; to++) {
        if (!s.cols[to].length && to !== emptyCol) continue;
        if (canCol(X, s, id, to, -1)) Dm.push({ t: 't', id, d: { k: 'c', to } });
      }
    }
    A.sort((a, b) => b.w - a.w); C.sort((a, b) => b.w - a.w);
    return A.concat(B, C, Dm, E);
  }
  function apply(X, s0, m) {
    const s = clone(s0); let a = 1;
    if (m.t === 'c') liftCol(s, m.i); else a = takeTalon(s, m.id) + 1;
    place(X, s, m.id, m.d);
    return { s, a };
  }
  function key(s) {
    const cols = s.cols.map((c, i) => s.down[i] + ':' + c.join(',')).sort().join('/');
    const sl = s.slot.map((c, j) => c + ':' + s.cnt[j]).sort().join(',');
    const t = s.rec === -1 ? s.stock.concat(s.waste).sort((a, b) => a - b).join(',') : s.stock.join(',') + '|' + s.waste.join(',') + '|' + s.rec;
    return sl + '#' + cols + '#' + t;
  }
  function solve(X, s0, budget) {
    const seen = new Set(), path = []; let nodes = 0;
    function dfs(s) {
      if (s.gone.every(Boolean)) return true;
      if (++nodes > budget) return false;
      const k = key(s); if (seen.has(k)) return false; seen.add(k);
      for (const m of moves(X, s)) {
        path.push(m);
        if (dfs(apply(X, s, m).s)) return true;
        path.pop();
        if (nodes > budget) return false;
      }
      return false;
    }
    const ok = dfs(s0);
    let acts = 0; if (ok) { let s = s0; for (const m of path) { const r = apply(X, s, m); acts += r.a; s = r.s; } }
    return { ok, nodes, path, acts };
  }
  function makeGame(L) {
    let P = params(L), t0 = Date.now(), tries = 0;
    const want = L <= 3 ? 5 : L <= 6 ? 3 : 1, found = [];
    while (found.length < want) {
      tries++;
      const D = mkDeal(P), X = ctx(D), r = solve(X, D.s, 5000);
      if (r.ok) found.push({ D, X, r, P, score: r.acts + r.nodes / 40 });
      if (Date.now() - t0 > 200) { if (found.length) break; P = easier(P); t0 = Date.now() - 120; }
    }
    found.sort((a, b) => a.score - b.score);
    const g = L <= 6 ? found[0] : pick(found);
    g.tries = tries; g.ms = Date.now() - t0;
    return g;
  }

  /* ---------------- look ---------------- */
  R.css(`
.cp-root{--g:6px; margin:0 auto; width:max-content; max-width:100%}
.cp-wide{display:grid; grid-template-columns:auto auto; gap:22px; align-items:start}
.cp-side{display:flex; flex-direction:column; align-items:center; gap:14px; padding:12px; border-radius:22px; background:rgba(0,0,0,.14)}
.cp-card{position:relative; display:block; flex:none; width:var(--cw); height:var(--ch); padding:0; border:0; cursor:pointer;
  border-radius:calc(var(--cw) * .14); font-family:var(--display); color:var(--ink); -webkit-tap-highlight-color:transparent;
  background:linear-gradient(160deg, #fff 0%, #FFF9EF 55%, #F2E6CE 100%);
  box-shadow:inset 0 -3px 0 rgba(0,0,0,.07), 0 3px 0 #C6AF86, 0 6px 10px rgba(0,0,0,.3);
  transition:transform .16s, box-shadow .16s}
.cp-strip{position:absolute; left:0; right:0; top:0; height:calc(var(--ch) * .27); display:flex; align-items:center; justify-content:space-between;
  padding:0 9%; border-radius:calc(var(--cw) * .14) calc(var(--cw) * .14) 0 0; background:var(--sc); color:var(--sk, #fff);
  box-shadow:inset 0 -3px 0 var(--sd); pointer-events:none}
.cp-strip b{font-size:calc(var(--ch) * .2); line-height:1; text-shadow:0 1px 0 rgba(0,0,0,.25)}
.cp-strip i{font-style:normal; font-size:calc(var(--ch) * .17); line-height:1}
.cp-pic{position:absolute; left:0; right:0; top:29%; text-align:center; font-size:calc(var(--cw) * .5); line-height:1.15; pointer-events:none}
.cp-word{position:absolute; left:3px; right:3px; bottom:5%; text-align:center; font-weight:700; line-height:1.05; white-space:nowrap; letter-spacing:-.01em; pointer-events:none}
.cp-coral{--sc:var(--coral); --sd:var(--coral-d)} .cp-sky{--sc:var(--sky); --sd:var(--sky-d)}
.cp-sun{--sc:var(--sun); --sd:var(--sun-d); --sk:#3A2410} .cp-leaf{--sc:var(--leaf); --sd:var(--leaf-d)}
.cp-berry{--sc:var(--berry); --sd:var(--berry-d)} .cp-grape{--sc:var(--grape); --sd:var(--grape-d)}
.cp-orange{--sc:var(--orange); --sd:var(--orange-d); --sk:#3A2410} .cp-mint{--sc:var(--mint); --sd:var(--mint-d); --sk:#123A30}
.cp-gold{background:radial-gradient(circle at 30% 30%, rgba(255,255,255,.7), transparent 40%), linear-gradient(160deg, #FFF0B0 0%, #FFD24F 50%, #E7A21C 100%);
  box-shadow:inset 0 0 0 3px #FFF4C8, inset 0 -4px 0 rgba(150,90,0,.25), 0 3px 0 #A06A0C, 0 6px 10px rgba(0,0,0,.3); color:#4A2E00}
.cp-gold .cp-pic{filter:drop-shadow(0 2px 0 rgba(150,90,0,.35))}
.cp-back{background:
  radial-gradient(circle at 50% 50%, rgba(255,255,255,.95) 0 10%, transparent 11%),
  radial-gradient(circle at 50% 50%, transparent 0 19%, rgba(255,255,255,.35) 20% 24%, transparent 25%),
  repeating-linear-gradient(45deg, rgba(255,255,255,.2) 0 3px, transparent 3px 9px),
  repeating-linear-gradient(-45deg, rgba(255,255,255,.2) 0 3px, transparent 3px 9px),
  linear-gradient(160deg, #7FC8FF, #2E7FD0);
  box-shadow:inset 0 0 0 calc(var(--cw) * .06) #FFF9EF, inset 0 0 0 calc(var(--cw) * .09) #2A67A8, 0 3px 0 #1D4F86, 0 6px 10px rgba(0,0,0,.3)}
.cp-sel{transform:translateY(-6px); box-shadow:0 0 0 4px #FFD84A, 0 0 0 7px rgba(0,0,0,.25), 0 10px 16px rgba(0,0,0,.35); z-index:5}
.cp-tgt{animation:cp-glow 1s ease-in-out infinite}
.cp-hint{animation:cp-hglow .9s ease-in-out infinite; z-index:6}
@keyframes cp-glow{0%,100%{box-shadow:0 0 0 3px #fff, 0 0 0 8px rgba(255,255,255,.35)}50%{box-shadow:0 0 0 5px #fff, 0 0 0 14px rgba(255,255,255,.12)}}
@keyframes cp-hglow{0%,100%{box-shadow:0 0 0 4px #FFD84A, 0 0 0 9px rgba(255,216,74,.4)}50%{box-shadow:0 0 0 6px #FFD84A, 0 0 0 16px rgba(255,216,74,.1)}}
.cp-slot{flex:none; position:relative; width:var(--cw); height:var(--ch); padding:0; cursor:pointer; display:grid; place-items:center;
  border-radius:calc(var(--cw) * .14); border:3px dashed rgba(255,255,255,.5); background:rgba(0,0,0,.18);
  color:rgba(255,255,255,.75); font:700 calc(var(--cw) * .42)/1 var(--display)}
.cp-slot.cp-star{color:#FFD45C}
.cp-slots{display:flex; justify-content:center; gap:var(--g); padding:8px 10px; border-radius:20px; background:rgba(0,0,0,.16);
  box-shadow:inset 0 3px 0 rgba(0,0,0,.12)}
.cp-hole{position:relative; flex:none; width:var(--cw); height:var(--ch)}
.cp-hole > *{position:absolute; left:0; top:0}
.cp-n{position:absolute; right:-7px; top:-9px; min-width:34px; padding:2px 7px; border-radius:999px; background:#18242C; color:#fff;
  font:700 17px/1.25 var(--display); text-align:center; box-shadow:0 2px 0 rgba(0,0,0,.3); pointer-events:none; z-index:2}
.cp-n.cp-nl{right:auto; top:auto; left:-7px; bottom:-9px}
.cp-cols{display:grid; grid-template-columns:repeat(var(--n), var(--cw)); gap:var(--g); justify-content:center; margin-top:12px}
.cp-col{position:relative; cursor:pointer}
.cp-col > *{position:absolute; left:0}
.cp-col .cp-sel{transform:translateY(-4px)}
.cp-low{display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:10px 14px; margin-top:12px}
.cp-pile{display:flex; gap:var(--g)}
.cp-info{display:flex; flex-direction:column; align-items:center; gap:6px}
.cp-count{display:flex; align-items:baseline; gap:6px; font:600 1.05rem/1.1 var(--display); color:var(--on-table-soft); white-space:nowrap}
.cp-count b{font-size:1.5rem; color:var(--on-table)}
.cp-btns{display:flex; gap:8px}
.cp-btns .btn{min-width:72px; min-height:56px; padding:.3em .6em; font-size:1.05rem}
.cp-btns .btn:disabled{opacity:.45; cursor:default}
.cp-in{animation:cp-in .3s cubic-bezier(.3,1.5,.5,1) backwards}
@keyframes cp-in{0%{transform:translateY(-14px) scale(.8); opacity:.4}100%{transform:none; opacity:1}}
.cp-flip{animation:cp-flip .4s ease-out backwards}
@keyframes cp-flip{0%{transform:rotateY(90deg)}100%{transform:rotateY(0)}}
.cp-open{animation:bounceIn .5s}
.cp-clear{animation:cp-clear 1s ease-in forwards; pointer-events:none; z-index:8}
@keyframes cp-clear{0%{transform:scale(1)}25%{transform:scale(1.18) rotate(-4deg)}45%{transform:scale(1.12) rotate(4deg)}100%{transform:translateY(-60px) scale(.3) rotate(20deg); opacity:0}}
.cp-spark{position:absolute; left:50%; top:45%; font-size:26px; pointer-events:none; z-index:9; animation:cp-spark .9s ease-out forwards}
@keyframes cp-spark{0%{transform:translate(-50%,-50%) scale(.3); opacity:1}100%{transform:translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1.1); opacity:0}}
`);

  register({ id: 'catpatience', cat: 'cards', order: 26, name: 'Category Patience', icon: '🗂️', desc: 'Sort picture cards into their categories', gentle: true, start: startCatPat });

  function startCatPat(L, api) {
    const G = makeGame(L), D = G.D, X = G.X;
    let s = clone(D.s);
    const sol = G.r.acts, slack = 3 + Math.ceil(sol * .15), aim = sol + slack, ok2 = Math.round(sol * 1.5) + slack * 2;
    let moves_ = 0, hist = [], sel = null, mark = null, finished = false, flash = null, streak = 0;
    let fresh = new Set(), flipped = new Set(), opened = -1;
    const nCol = s.cols.length, nSlot = s.slot.length;
    const W = api.stage.clientWidth || 340, wide = W >= 640;
    const g = wide ? 10 : 6;
    const cw = wide ? Math.max(70, Math.min(96, Math.floor((W - 2 * 96 - 70 - (nCol - 1) * g) / nCol)))
      : Math.max(50, Math.min(80, Math.floor((W - (nCol - 1) * g) / nCol)));
    const ch = Math.round(cw * 1.3), colH = Math.round(ch * (1 + Math.max(...s.down) * .13 + (wide ? 1.5 : 1.35)));

    const root = el('div', 'cp-root ' + (wide ? 'cp-wide' : 'cp-narrow'));
    root.style.cssText = `--cw:${cw}px; --ch:${ch}px; --g:${g}px; --n:${nCol}`;
    const slotsRow = el('div', 'cp-slots'), colsRow = el('div', 'cp-cols'), pile = el('div', 'cp-pile'), info = el('div', 'cp-info');
    const count = el('div', 'cp-count'), btns = el('div', 'cp-btns');
    const mkBtn = (label, color, fn) => { const b = el('button', 'btn ' + color, label); b.type = 'button'; b.onclick = fn; return b; };
    const undoB = mkBtn('↶ Undo', 'c-card', () => { if (finished || !hist.length) return; sfx.tap(); s = JSON.parse(hist.pop()); sel = null; mark = null; streak = 0; say(); render(); });
    const hintB = mkBtn('💡 Hint', 'c-sun', () => { if (finished) return; sfx.tap(); showHint(); });
    btns.append(undoB, hintB); info.append(count, btns);
    if (wide) { const side = el('div', 'cp-side'), main = el('div', 'cp-main'); side.append(pile, info); main.append(slotsRow, colsRow); root.append(side, main); }
    else { const low = el('div', 'cp-low'); low.append(pile, info); root.append(slotsRow, colsRow, low); }
    api.stage.append(root);
    api.rounds(D.cats.length, 0);

    const C = id => D.cats[D.cards[id].cat];
    const word = id => { const c = D.cards[id]; return c.k < 0 ? 'gold ' + D.cats[c.cat].n + ' card' : D.cats[c.cat].items[c.k][1]; };
    const nameOf = cat => D.cats[cat].n;
    function say() {
      if (s.slot.every(x => x === -1) && !s.gone.some(Boolean)) api.hint('Find a gold card and put it in an empty space at the top. Then sort matching cards onto it. Tap the blue pile for more cards.');
      else api.hint('Sort each card onto its gold category. Cards of one kind can also stack in a column. Tap the pile for more cards.');
    }
    say();

    function cardEl(id, cls = '') {
      const c = D.cards[id], K = D.cats[c.cat], gold = c.k < 0;
      const [e, w] = gold ? [K.i, K.s] : K.items[c.k];
      const b = el('button', 'cp-card cp-' + K.st.c + (gold ? ' cp-gold ' : ' ') + cls);
      b.type = 'button';
      const fs = Math.max(12, Math.min(cw * .24, cw * 1.6 / Math.max(4, [...w].length)));
      b.innerHTML = `<span class="cp-strip"><b>${K.st.s}</b><i>${gold ? '★' : e}</i></span><span class="cp-pic">${e}</span><span class="cp-word" style="font-size:${fs.toFixed(1)}px">${w}</span>`;
      b.setAttribute('aria-label', gold ? 'Gold card: ' + K.n : w + ', ' + K.n);
      if (flipped.has(id)) b.classList.add('cp-flip'); else if (fresh.has(id)) b.classList.add('cp-in');
      return b;
    }
    const backEl = () => { const b = el('button', 'cp-card cp-back'); b.type = 'button'; b.setAttribute('aria-label', 'Face-down card'); return b; };
    const slotEl = (label, cls = '') => { const b = el('button', 'cp-slot ' + cls, label); b.type = 'button'; return b; };

    /* ----- moves ----- */
    const srcId = src => src.t === 'w' ? top(s.waste) : top(s.cols[src.i]);
    const dk = d => d.k + (d.k === 's' ? d.j : d.to);
    function legal(src, d) {
      const id = srcId(src); if (id === undefined) return false;
      return d.k === 's' ? canSlot(X, s, id, d.j) : canCol(X, s, id, d.to, src.t === 'c' ? src.i : -1);
    }
    function targets(src) {
      const out = [];
      for (let j = 0; j < nSlot; j++) if (legal(src, { k: 's', j })) out.push({ k: 's', j });
      for (let to = 0; to < nCol; to++) if (legal(src, { k: 'c', to })) out.push({ k: 'c', to });
      return out;
    }
    function bestDst(src) {
      const ts = targets(src);
      const sl = ts.find(d => d.k === 's'); if (sl) return sl;
      const c = ts.find(d => s.cols[d.to].length); if (c) return c;
      const e = ts.find(d => !s.cols[d.to].length);
      if (e && !(src.t === 'c' && s.cols[src.i].length === 1)) return e;
      return null;
    }
    const save = () => hist.push(JSON.stringify(s));
    function doMove(src, d) {
      save(); moves_++;
      let id;
      if (src.t === 'w') id = s.waste.pop();
      else { const before = s.down[src.i]; id = liftCol(s, src.i); if (s.down[src.i] < before) { flipped.add(top(s.cols[src.i])); tone(700, .12, 'triangle', .09, .08); } }
      const cat = D.cards[id].cat, wasGold = X.GOLD[id];
      const done = place(X, s, id, d);
      fresh.add(id); sel = null; mark = null;
      if (d.k === 's') {
        streak++;
        tone(392 * Math.pow(2, Math.min(streak - 1, 12) / 12), .16, 'sine', .13);
        if (wasGold) { opened = d.j; api.hint(`${nameOf(cat)} is open. Put the ${nameOf(cat).toLowerCase()} cards on it.`); }
      } else { streak = 0; tone(480, .08, 'triangle', .09); }
      if (done >= 0) celebrate(d.j, done);
      render();
      if (s.gone.every(Boolean)) win();
    }
    function celebrate(j, cat) {
      flash = { j, cat };
      const gone = s.gone.filter(Boolean).length;
      api.rounds(D.cats.length, gone);
      [0, 1, 2, 3].forEach(i => tone(523 * Math.pow(2, (i * 4 + Math.min(gone, 6)) / 12), .2, 'sine', .12, .1 + i * .09));
      if (!s.gone.every(Boolean)) { toast(cheer() + '! ' + nameOf(cat) + ' done'); api.hint(`${nameOf(cat)} is complete! That space is free again.`); }
    }
    function draw() {
      if (finished) return;
      sel = null; mark = null; streak = 0;
      if (s.stock.length) { save(); moves_++; const id = s.stock.pop(); s.waste.push(id); fresh.add(id); tone(520, .07, 'triangle', .08); }
      else if (s.waste.length && s.rec !== 0) {
        save(); moves_++; s.stock = s.waste.reverse(); s.waste = []; if (s.rec > 0) s.rec--;
        tone(330, .12, 'sine', .08);
        api.hint('The pile is turned back over.' + (s.rec > 0 ? ` You can turn it over ${s.rec === 1 ? 'one more time' : s.rec + ' more times'}.` : s.rec === 0 ? ' That was the last time it can be turned over.' : ''));
      } else if (s.waste.length) { sfx.soft(); api.hint('The pile can’t be turned over again. Use the cards on the table, or tap ↶ Undo.'); }
      else { sfx.soft(); api.hint('The pile is empty. Move the cards on the table instead.'); }
      render();
    }
    function auto(src) {
      const d = bestDst(src);
      if (d) return doMove(src, d);
      const id = srcId(src); sfx.soft(); sel = null;
      if (X.GOLD[id]) api.hint('Every space at the top is in use. Finish a category first to free a space.');
      else if (!s.slot.includes(X.CAT[id])) api.hint(`First open ${nameOf(X.CAT[id])}: find its gold card.`);
      else api.hint('That card has nowhere to go just now. Try another card, or tap 💡 Hint.');
      render();
    }
    function select(src) {
      sel = src; mark = null; sfx.tap();
      api.hint(targets(src).length ? `The ${word(srcId(src))}. Tap a glowing place, or tap it again to send it to the best spot.` : `The ${word(srcId(src))} has nowhere to go yet. Try another card.`);
      render();
    }
    const same = (a, b) => a && b && a.t === b.t && (a.t === 'w' || a.i === b.i);
    function tapWaste() {
      if (finished) return;
      if (!s.waste.length) { if (sel) { sel = null; render(); } return; }
      if (same(sel, { t: 'w' })) return auto(sel);
      select({ t: 'w' });
    }
    function tapCol(i) {
      if (finished) return;
      if (same(sel, { t: 'c', i })) return auto(sel);
      if (sel && legal(sel, { k: 'c', to: i })) return doMove(sel, { k: 'c', to: i });
      if (s.cols[i].length) return select({ t: 'c', i });
      if (sel) { sfx.soft(); sel = null; api.hint('That card can’t go there.'); render(); }
      else api.hint('This column is empty. Any card can go here.');
    }
    function tapSlot(j) {
      if (finished) return;
      if (!sel) { sfx.tap(); api.hint(s.slot[j] === -1 ? 'Put a gold card here to open a category.' : `This is ${nameOf(s.slot[j])}. Find more ${nameOf(s.slot[j]).toLowerCase()} cards for it.`); return; }
      if (legal(sel, { k: 's', j })) return doMove(sel, { k: 's', j });
      const id = srcId(sel); sfx.soft(); sel = null;
      if (X.GOLD[id]) api.hint('That space is in use. A gold card goes in an empty space.');
      else if (s.slot[j] === -1) api.hint(`Only a gold card can go in an empty space. First open ${nameOf(X.CAT[id])} with its gold card.`);
      else api.hint(`That pile is ${nameOf(s.slot[j])}. The ${word(id)} belongs in ${nameOf(X.CAT[id])}.`);
      render();
    }

    /* ----- hints ----- */
    function solverMove() {
      const r = solve(X, s, 20000);
      if (!r.ok) return null;
      const m = r.path[0];
      if (m.t === 'c') return { src: { t: 'c', i: m.i }, d: m.d };
      if (top(s.waste) === m.id) return { src: { t: 'w' }, d: m.d };
      return { draw: true };
    }
    function showHint() {
      sel = null;
      const m = solverMove();
      if (!m) {
        let back = 0;
        for (let b = hist.length - 1; b >= Math.max(0, hist.length - 15); b--) { back++; if (solve(X, JSON.parse(hist[b]), 4000).ok) break; }
        mark = null; api.hint(back ? `This way looks stuck. Tap ↶ Undo ${back === 1 ? 'once' : back + ' times'} and try a different way.` : 'This way looks stuck. Tap ↶ Undo to go back.');
      } else if (m.draw) { mark = { stock: true }; api.hint(s.stock.length ? 'Tap the blue pile to turn over a new card.' : 'Tap the empty pile space to turn the cards back over.'); }
      else {
        mark = m; const id = srcId(m.src);
        const where = m.d.k === 's' ? (X.GOLD[id] ? 'into an empty space at the top' : `onto ${nameOf(X.CAT[id])} at the top`)
          : s.cols[m.d.to].length ? 'onto the ' + word(top(s.cols[m.d.to])) : 'into the empty column';
        api.hint(`Move the ${word(id)} ${where}.`);
      }
      render();
    }
    function win() {
      finished = true; sel = null; mark = null;
      const stars = moves_ <= aim ? 3 : moves_ <= ok2 ? 2 : 1;
      api.hint(`Every category is sorted, in ${moves_} moves. ${cheer()}!`);
      sfx.good();
      api.later(() => { slotsRow.querySelectorAll('.cp-card').forEach(e => wob(e)); }, 200);
      api.later(() => api.done(stars), 900);
    }

    /* ----- drawing ----- */
    function render() {
      slotsRow.innerHTML = ''; colsRow.innerHTML = ''; pile.innerHTML = '';
      const tg = new Set(sel ? targets(sel).map(dk) : []);
      const deco = (e, d) => { if (tg.has(dk(d))) e.classList.add('cp-tgt'); if (mark && mark.d && dk(mark.d) === dk(d)) e.classList.add('cp-hint'); };
      for (let j = 0; j < nSlot; j++) {
        const hole = el('div', 'cp-hole'), cat = s.slot[j];
        let e;
        if (cat < 0) { e = slotEl('★', 'cp-star'); e.setAttribute('aria-label', 'Empty space for a gold card'); }
        else {
          const gid = D.cards.findIndex(c => c.cat === cat && c.k < 0);
          e = cardEl(gid, opened === j ? 'cp-open' : '');
          e.append(el('em', 'cp-n', s.cnt[j] + '/' + D.cats[cat].size));
          e.setAttribute('aria-label', `${nameOf(cat)}: ${s.cnt[j]} of ${D.cats[cat].size} cards`);
        }
        deco(e, { k: 's', j }); e.onclick = () => tapSlot(j); hole.append(e);
        if (flash && flash.j === j) {
          const gid = D.cards.findIndex(c => c.cat === flash.cat && c.k < 0), f = cardEl(gid, 'cp-clear');
          hole.append(f);
          for (let q = 0; q < 6; q++) { const sp = el('span', 'cp-spark', q % 2 ? '✨' : '⭐'); const a = q / 6 * Math.PI * 2; sp.style.setProperty('--dx', Math.round(Math.cos(a) * 60) + 'px'); sp.style.setProperty('--dy', Math.round(Math.sin(a) * 60) + 'px'); hole.append(sp); }
        }
        slotsRow.append(hole);
      }
      opened = -1; flash = null;
      s.cols.forEach((col, i) => {
        const ce = el('div', 'cp-col'); ce.style.height = colH + 'px'; ce.onclick = () => tapCol(i);
        const nd = s.down[i], nu = col.length - nd;
        let dd = ch * .13, du = ch * .3;
        const need = nd * dd + Math.max(0, nu - 1) * du, room = colH - ch;
        if (need > room) { const k = room / need; dd *= Math.max(.5, k); du = nu > 1 ? Math.max(ch * .18, (room - nd * dd) / (nu - 1)) : du; }
        if (!col.length) { const sl = slotEl('＋'); sl.setAttribute('aria-label', 'Empty column'); deco(sl, { k: 'c', to: i }); ce.append(sl); }
        let y = 0;
        col.forEach((id, k) => {
          const up = k >= nd, last = k === col.length - 1;
          const e = up ? cardEl(id) : backEl();
          e.style.top = Math.round(y) + 'px';
          if (last) {
            if (sel && sel.t === 'c' && sel.i === i) e.classList.add('cp-sel');
            if (mark && mark.src && mark.src.t === 'c' && mark.src.i === i) e.classList.add('cp-hint');
            deco(e, { k: 'c', to: i });
          }
          ce.append(e); y += up ? du : dd;
        });
        colsRow.append(ce);
      });
      let sk;
      if (s.stock.length) { sk = backEl(); sk.append(el('em', 'cp-n', String(s.stock.length))); sk.setAttribute('aria-label', 'Pile of cards, ' + s.stock.length + ' left'); }
      else { sk = slotEl(s.waste.length && s.rec !== 0 ? '↻' : ''); sk.setAttribute('aria-label', 'Turn the pile over'); }
      if (s.rec >= 0 && (s.stock.length || s.waste.length)) sk.append(el('em', 'cp-n cp-nl', '↻' + s.rec));
      if (mark && mark.stock) sk.classList.add('cp-hint');
      sk.onclick = draw;
      let we;
      if (s.waste.length) {
        const w = top(s.waste); we = cardEl(w, same(sel, { t: 'w' }) ? 'cp-sel' : '');
        if (mark && mark.src && mark.src.t === 'w') we.classList.add('cp-hint');
        we.onclick = tapWaste;
      } else { we = slotEl(''); we.style.opacity = '.5'; we.setAttribute('aria-label', 'Empty'); }
      pile.append(sk, we);
      count.innerHTML = `<b>${moves_}</b> move${moves_ === 1 ? '' : 's'} <span>· ★★★ by ${aim}</span>`;
      undoB.disabled = !hist.length || finished;
      fresh = new Set(); flipped = new Set();
    }
    render();

    if (TEST) window.__cpBot = {
      st: () => s, info: () => ({ sol, aim, moves: moves_, finished, tries: G.tries, ms: G.ms, P: G.P }),
      bot() {
        if (finished) return 'won';
        const m = solverMove(); if (!m) return 'stuck';
        if (m.draw) { draw(); return 'draw'; }
        if (!legal(m.src, m.d)) return 'illegal';
        doMove(m.src, m.d); return 'move';
      }
    };
  }

  if (TEST) window.__cpCore = { params, mkDeal, ctx, solve, makeGame, CATS };
})();
