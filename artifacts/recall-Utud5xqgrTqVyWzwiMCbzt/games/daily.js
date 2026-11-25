/* Recall: Everyday Games. Corner Shop, What Time Is It?, Fish Pond, Finish the Song (gentle),
   plus Opposites and Rhyme Time (words). Every level is generated fresh; difficulty rises gently,
   then levels off and keeps varying. Money is US dollars and cents. */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor } = R;

  const mkBtn = (label, cls, fn) => { const b = el('button', 'btn ' + cls, label); b.type = 'button'; if (fn) b.onclick = fn; return b; };
  const finisher = api => { let d = false; return s => { if (d) return; d = true; api.done(Math.max(1, Math.min(3, Math.round(s)))); }; };
  const lvl = L => Math.max(1, Math.floor(+L || 1));
  const mod = (a, n) => ((a % n) + n) % n;
  const rise = n => [523, 659, 784, 1047].slice(0, n).forEach((f, i) => tone(f, .2, 'triangle', .12, i * .09));

  R.css(`
.dy-wrap{max-width:720px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr);gap:16px}
.dy-panel{background:var(--card);color:var(--ink);border-radius:24px;padding:14px 16px;box-shadow:0 7px 0 var(--card-edge),0 14px 26px rgba(0,0,0,.28)}
.dy-row{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:12px}
.dy-label{font:600 1.25rem/1.25 var(--display);color:var(--ink-soft);text-align:center;margin:0}
.dy-chip{display:inline-flex;align-items:center;gap:.35em;font:600 1.25rem var(--display);background:var(--peach);color:var(--ink);padding:.15em .8em;border-radius:999px}
.dy-pop{animation:dy-bounce .5s cubic-bezier(.3,1.6,.5,1)}
.dy-glow{outline:6px solid var(--sun);outline-offset:4px;animation:dy-glowk 1s infinite}
.dy-wrap .btn[disabled]{opacity:.4;pointer-events:none}
@keyframes dy-bounce{0%{transform:scale(.6)}60%{transform:scale(1.12)}100%{transform:scale(1)}}
@keyframes dy-glowk{0%,100%{outline-color:rgba(255,194,52,1)}50%{outline-color:rgba(255,255,255,.9)}}

/* Corner Shop */
.dy-shop{padding:0;overflow:hidden}
.dy-awning{height:26px;background:repeating-linear-gradient(90deg,var(--coral) 0 28px,#fff 28px 56px);border-radius:24px 24px 0 0;
  -webkit-mask:radial-gradient(14px at 14px 100%,#0000 98%,#000) 0 0/28px 100%;mask:radial-gradient(14px at 14px 100%,#0000 98%,#000) 0 0/28px 100%}
.dy-say{display:flex;align-items:center;gap:10px;padding:6px 14px 0}
.dy-keeper{font-size:2.6rem;line-height:1}
.dy-bubble{flex:1;background:#fff;border-radius:16px;padding:6px 12px;font:600 1.25rem/1.25 var(--display);box-shadow:0 3px 0 var(--card-edge)}
.dy-items{display:flex;flex-wrap:wrap;justify-content:center;gap:10px 16px;padding:8px 10px 10px}
.dy-item{display:grid;justify-items:center;gap:2px}
.dy-item .e{font-size:clamp(2.6rem,11vw,3.2rem);line-height:1.1}
.dy-item .n{font-size:1rem;color:var(--ink-soft)}
.dy-tag{font:700 1.3rem var(--display);background:var(--sun);border-radius:10px;padding:0 .5em;box-shadow:0 3px 0 var(--sun-d)}
.dy-total{text-align:center;font:700 1.4rem var(--display);padding:6px;background:linear-gradient(#C99060,#A9703F);color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.3)}
.dy-tray{background:rgba(0,0,0,.2);border-radius:20px;padding:8px 10px 12px;box-shadow:inset 0 4px 10px rgba(0,0,0,.25)}
.dy-tray p{margin:0 0 6px;text-align:center;font:600 1.2rem var(--display);color:var(--on-table)}
.dy-trayc{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;min-height:64px;align-items:center}
.dy-money{display:grid;place-items:center;flex:none;font:700 1.15rem var(--display);color:#2A2010;line-height:1}
.dy-coin{width:var(--z,58px);height:var(--z,58px);border-radius:50%;
  background:radial-gradient(circle at 34% 30%,rgba(255,255,255,.75) 0 14%,rgba(255,255,255,0) 42%),var(--mc);
  box-shadow:inset 0 0 0 4px rgba(0,0,0,.1),inset 0 -4px 0 rgba(0,0,0,.18),0 5px 0 var(--md),0 8px 12px rgba(0,0,0,.3)}
.dy-ag{--mc:#D7DDE2;--md:#87929B}
.dy-cu{--mc:#E39A62;--md:#9C5427}
.dy-note{width:96px;height:58px;border-radius:10px;font-size:1.35rem;color:#1E4D27;
  background:radial-gradient(ellipse at 50% 50%,rgba(255,255,255,.55) 0 22%,transparent 23%),linear-gradient(135deg,#B9E4B4,#8CCB8C);
  box-shadow:inset 0 0 0 4px #E8F6E4,inset 0 0 0 6px #5E9E63,0 5px 0 #3F7A48,0 8px 12px rgba(0,0,0,.3)}
.dy-mbtn{background:none;border:0;padding:0;cursor:pointer;border-radius:14px;transition:transform .08s}
.dy-mbtn:active{transform:translateY(4px)}
.dy-mbtn.dy-in{animation:dy-bounce .35s}
.dy-purse{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:12px 14px}
.dy-copts{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:14px}
.dy-copt{font-size:1.7rem;min-height:72px}
.dy-copt.dy-ok{--c:var(--leaf);--d:var(--leaf-d)}
.dy-copt.dy-no{opacity:.32;pointer-events:none}
.dy-paid{display:flex;align-items:center;justify-content:center;gap:12px;font:600 1.25rem var(--display);color:var(--on-table)}

/* Clock */
.dy-clkwrap{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:14px 22px}
.dy-clock{display:block;width:clamp(230px,68vw,290px);height:auto;filter:drop-shadow(0 8px 0 #3A2410) drop-shadow(0 14px 16px rgba(0,0,0,.35));touch-action:manipulation;cursor:pointer}
.dy-clock .dy-hh,.dy-clock .dy-mh{transform-box:view-box;transform-origin:100px 100px;transition:transform .45s cubic-bezier(.3,1.25,.5,1)}
.dy-ctx{display:flex;align-items:center;justify-content:center;gap:10px;font:600 1.3rem/1.2 var(--display);text-align:center;color:var(--ink);background:var(--card);border-radius:18px;padding:8px 14px;box-shadow:0 5px 0 var(--card-edge)}
.dy-ctx .e{font-size:2rem}
.dy-ctl{display:grid;gap:12px;justify-items:center;min-width:250px}
.dy-hrow{display:grid;grid-template-columns:62px 1fr 62px;gap:8px;align-items:center;width:100%;max-width:300px}
.dy-hrow .btn{min-height:62px;padding:0;font-size:2rem}
.dy-hsel{min-height:62px;border-radius:16px;border:0;cursor:pointer;font:600 1.15rem/1.1 var(--display);color:var(--ink);background:var(--card);box-shadow:0 5px 0 var(--card-edge);padding:4px 6px}
.dy-hsel small{display:block;font:400 .95rem var(--body);color:var(--ink-soft)}
.dy-hsel[aria-pressed="true"]{background:var(--sun);box-shadow:0 5px 0 var(--sun-d),0 0 0 4px #fff}
.dy-readout{font:600 1.25rem var(--display);color:var(--on-table);text-align:center;margin:0;min-height:1.3em}
.dy-topts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;width:100%;max-width:420px}
.dy-topt{flex-direction:column;gap:2px;min-height:76px;font-size:1.3rem;padding:.4em .5em}
.dy-topt small{font:400 1rem var(--body);color:var(--ink-soft)}
.dy-topt.dy-ok{--c:var(--leaf);--d:var(--leaf-d)}
.dy-topt.dy-no{opacity:.32;pointer-events:none}

/* Fish Pond */
.dy-pond{display:block;width:100%;max-width:620px;margin:0 auto;aspect-ratio:4/3;border-radius:28px;touch-action:manipulation;cursor:pointer;
  box-shadow:0 0 0 8px #6E8F4E,0 0 0 14px #4E6B35,0 14px 26px rgba(0,0,0,.4)}
.dy-task{display:flex;align-items:center;justify-content:center;gap:10px;font:600 1.3rem/1.2 var(--display)}
.dy-task canvas{width:72px;height:44px;flex:none}
.dy-nums{display:flex;justify-content:center;gap:14px}
.dy-nums .btn{min-width:84px;min-height:72px;font-size:2rem}
.dy-nums .btn.dy-ok{--c:var(--leaf);--d:var(--leaf-d)}
.dy-nums .btn.dy-no{opacity:.32;pointer-events:none}

/* Finish the Song */
.dy-song{display:grid;gap:10px;justify-items:center;text-align:center;padding:16px 16px 18px}
.dy-line{font:600 clamp(1.45rem,5.6vw,1.9rem)/1.3 var(--display);margin:0;text-wrap:balance}
.dy-next{font:600 clamp(1.3rem,5vw,1.7rem)/1.3 var(--display);margin:0;color:var(--leaf-d);text-wrap:balance}
.dy-gap{display:inline-block;min-width:5em;border-bottom:5px solid var(--coral);line-height:1}
.dy-lopts{display:grid;gap:12px}
.dy-lopt{font:600 1.25rem/1.25 var(--display);min-height:68px;text-align:center;padding:.5em .8em}
.dy-lopt.dy-ok{--c:var(--leaf);--d:var(--leaf-d)}
.dy-lopt.dy-no{opacity:.32;pointer-events:none}
.dy-notes{font-size:1.8rem;min-height:1.2em;line-height:1.2}
.dy-notes span{display:inline-block;animation:dy-float 1s infinite}
.dy-notes span:nth-child(2){animation-delay:.25s}
@keyframes dy-float{0%,100%{translate:0 0}50%{translate:0 -8px}}

/* Opposites */
.dy-ogrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:clamp(10px,2.5vw,16px);max-width:640px;width:100%;margin:0 auto;width:100%}
.dy-ocard{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:96px;padding:8px 4px;border-radius:20px;cursor:pointer;transition:transform .15s}
.dy-ocard .e{font-size:clamp(2.2rem,9vw,2.8rem);line-height:1.1}
.dy-ocard .w{font:600 1.3rem/1.1 var(--display)}
.dy-ocard.dy-sel{transform:translateY(-6px);box-shadow:0 0 0 6px var(--sun),0 6px 0 var(--d),0 12px 18px rgba(0,0,0,.35)}
.dy-ocard.dy-done{cursor:default;animation:dy-bounce .45s}
.dy-ocard .s{position:absolute;right:6px;top:4px;font:700 1.1rem var(--display);opacity:.8}

/* Rhyme Time */
.dy-ref{display:grid;justify-items:center;gap:2px;padding:12px 16px 14px}
.dy-big{font-size:clamp(4rem,20vw,5.6rem);line-height:1.1}
.dy-word{font:700 clamp(1.8rem,7vw,2.3rem)/1.1 var(--display);letter-spacing:.04em}
.dy-ropts{display:grid;grid-template-columns:repeat(var(--cols),1fr);gap:clamp(10px,3vw,16px);max-width:calc(var(--cols) * 170px);margin:0 auto;width:100%}
.dy-ropt{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:112px;border-radius:22px;cursor:pointer;transition:opacity .25s}
.dy-ropt .e{font-size:clamp(2.6rem,11vw,3.4rem);line-height:1.1}
.dy-ropt .w{font:600 1.35rem var(--display)}
.dy-ropt.dy-ok{--c:var(--good-bg);--d:var(--leaf-d)}
.dy-ropt.dy-no{opacity:.32;pointer-events:none}
`);

  /* =========================================================
     1. CORNER SHOP (US dollars and cents)
     ========================================================= */
  const MONEY = {
    1: { t: '1¢', cls: 'dy-coin dy-cu', z: 56 }, 5: { t: '5¢', cls: 'dy-coin dy-ag', z: 62 },
    10: { t: '10¢', cls: 'dy-coin dy-ag', z: 56 }, 25: { t: '25¢', cls: 'dy-coin dy-ag', z: 68 },
    100: { t: '$1', cls: 'dy-note' }, 500: { t: '$5', cls: 'dy-note' }, 1000: { t: '$10', cls: 'dy-note' }, 2000: { t: '$20', cls: 'dy-note' }
  };
  const fmt = c => c >= 100 ? '$' + (c / 100).toFixed(2) : c + '¢';
  const moneyEl = v => { const m = MONEY[v], e = el('span', 'dy-money ' + m.cls, m.t); if (m.z) e.style.setProperty('--z', m.z + 'px'); return e; };
  const SHOP = [['🍎', 'apple'], ['🍌', 'bananas'], ['🥛', 'milk'], ['🍞', 'bread'], ['🧀', 'cheese'], ['🥚', 'eggs'], ['🍪', 'cookies'],
    ['📰', 'newspaper'], ['🧈', 'butter'], ['🍯', 'honey'], ['🥕', 'carrots'], ['🍊', 'orange'], ['🍬', 'candy'], ['🌹', 'a rose'],
    ['🧼', 'soap'], ['🥫', 'soup'], ['🍋', 'lemon'], ['🍅', 'tomatoes'], ['🍐', 'pear'], ['🧁', 'cupcake'], ['🍫', 'chocolate'], ['🥒', 'cucumber'], ['💌', 'card']];
  const KEEPERS = ['🧓', '👵', '👴', '👨‍🦳', '👩‍🦳'];

  function shopCfg(L, r) {
    const c = Math.min(L, 9), change = r % 2 === 1;
    if (c === 1) return { kind: 'pay', n: 1, lo: 10, hi: 50, step: 5, coins: [5, 10, 25] };
    if (c === 2) return { kind: 'pay', n: 1, lo: 30, hi: 95, step: 5, coins: [5, 10, 25] };
    if (c === 3) return { kind: 'pay', n: 2, lo: 20, hi: 75, step: 5, coins: [5, 10, 25, 100] };
    if (c === 4) return change ? { kind: 'change', n: 1, lo: 20, hi: 95, step: 5, opts: 3 } : { kind: 'pay', n: 2, lo: 25, hi: 95, step: 5, coins: [5, 10, 25, 100] };
    if (c === 5) return change ? { kind: 'change', n: 2, lo: 50, hi: 225, step: 5, opts: 3 } : { kind: 'pay', n: 2, lo: 50, hi: 200, step: 5, coins: [5, 10, 25, 100, 500] };
    if (c <= 7) return change ? { kind: 'change', n: 2 + randInt(2), lo: 50, hi: 300, step: 5, opts: 4 } : { kind: 'pay', n: 2, lo: 40, hi: 350, step: 5, coins: [5, 10, 25, 100, 500] };
    return change ? { kind: 'change', n: 2 + randInt(2), lo: 35, hi: 450, step: 1, opts: 4 } : { kind: 'pay', n: 2 + randInt(2), lo: 30, hi: 300, step: 1, coins: [1, 5, 10, 25, 100, 500] };
  }
  function genPrice(cfg) {
    if (cfg.step === 1) { const k = Math.ceil(cfg.lo / 10) + randInt(Math.floor((cfg.hi - cfg.lo) / 10)); return Math.random() < .6 ? k * 10 - 1 : k * 10 + 5; }
    return cfg.lo + cfg.step * randInt(Math.floor((cfg.hi - cfg.lo) / cfg.step) + 1);
  }

  function startShop(L0, api) {
    const L = lvl(L0), total = 4, done = finisher(api), keeper = pick(KEEPERS);
    let round = 0, mistakes = 0;
    const root = el('div', 'dy-wrap'); api.stage.append(root);
    const pool = shuffle(SHOP.slice());
    function counter(items, say) {
      const p = el('div', 'dy-panel dy-shop');
      const bubble = el('div', 'dy-bubble', say);
      const s = el('div', 'dy-say'); s.append(el('span', 'dy-keeper', keeper), bubble);
      const it = el('div', 'dy-items');
      items.forEach(x => it.append(el('div', 'dy-item', `<span class="e" aria-hidden="true">${x.e}</span><span class="dy-tag">${fmt(x.p)}</span><span class="n">${x.n}</span>`)));
      p.append(el('div', 'dy-awning'), s, it);
      if (items.length > 1) p.append(el('div', 'dy-total', `Total: ${fmt(items.reduce((a, x) => a + x.p, 0))}`));
      return { p, bubble, it };
    }
    function next() {
      api.rounds(total, round); root.innerHTML = '';
      const cfg = shopCfg(L, round);
      const items = [];
      for (let i = 0; i < cfg.n; i++) { const [e, n] = pool[(round * 3 + i) % pool.length]; items.push({ e, n, p: genPrice(cfg) }); }
      const sum = items.reduce((a, x) => a + x.p, 0);
      api.stage.dataset.kind = cfg.kind; api.stage.dataset.total = sum;
      (cfg.kind === 'pay' ? payRound : changeRound)(cfg, items, sum);
    }
    function finishRound(c) {
      round++; c.it.classList.add('dy-pop'); toast(cheer());
      api.later(() => { if (round === total) { api.rounds(total, round); done(starsFor(mistakes, 1, 3)); } else next(); }, 1700);
    }
    function payRound(cfg, items, sum) {
      const c = counter(items, `That’s ${fmt(sum)}, please.`);
      const placed = [];
      let over = false, solved = false;
      const tray = el('div', 'dy-tray'), lbl = el('p'), box = el('div', 'dy-trayc');
      tray.append(lbl, box);
      const purse = el('div', 'dy-purse'), purseBtns = {};
      cfg.coins.forEach(v => {
        const b = el('button', 'dy-mbtn'); b.type = 'button'; b.setAttribute('aria-label', 'Put down ' + MONEY[v].t); b.dataset.v = v;
        b.append(moneyEl(v)); b.onclick = () => add(v); purse.append(b); purseBtns[v] = b;
      });
      const help = mkBtn('💡 Help me', 'c-sun', helpMe);
      purse.append(help);
      root.append(c.p, tray, purse);
      const now = () => placed.reduce((a, v) => a + v, 0);
      const clearGlow = () => root.querySelectorAll('.dy-glow').forEach(x => x.classList.remove('dy-glow'));
      function render() {
        box.innerHTML = '';
        placed.forEach((v, i) => {
          const b = el('button', 'dy-mbtn'); b.type = 'button'; b.setAttribute('aria-label', 'Take back ' + MONEY[v].t);
          b.append(moneyEl(v)); b.onclick = () => removeAt(i); if (i === placed.length - 1) b.classList.add('dy-in'); box.append(b);
        });
        lbl.textContent = placed.length ? `On the counter: ${fmt(now())}` : 'Tap your money to put it on the counter';
      }
      function add(v) { if (solved) return; clearGlow(); placed.push(v); placed.sort((a, b) => b - a); tone(440 + Math.min(placed.length, 10) * 40, .1, 'triangle', .1); render(); check(); }
      function removeAt(i) { if (solved) return; clearGlow(); placed.splice(i, 1); tone(380, .08, 'triangle', .07); render(); check(); }
      function check() {
        const s = now();
        if (s === sum) {
          solved = true; sfx.good(); rise(4); c.bubble.textContent = 'Thank you! That’s just right.';
          api.hint(`${cheer()} You paid exactly ${fmt(sum)}.`); help.disabled = true; finishRound(c);
        } else if (s > sum) {
          if (!over) { over = true; mistakes++; sfx.soft(); }
          api.hint(`That’s a little too much. Tap a coin on the counter to take it back.`);
        } else { over = false; api.hint(placed.length ? `Pay ${fmt(sum)}. You need ${fmt(sum - s)} more.` : `Pay ${fmt(sum)}. Tap the coins${cfg.coins.some(v => v >= 100) ? ' and notes' : ''} to put them on the counter.`); }
      }
      function helpMe() {
        if (solved) return; clearGlow(); mistakes += .5;
        const s = now();
        if (s > sum) {
          const over = s - sum, idx = placed.reduce((best, v, i) => v >= over && (best < 0 || v < placed[best]) ? i : best, -1);
          const k = idx < 0 ? 0 : idx; box.children[k].classList.add('dy-glow');
          api.hint('Take back the glowing coin.');
        } else {
          const r = sum - s, v = cfg.coins.filter(x => x <= r).sort((a, b) => b - a)[0];
          purseBtns[v].classList.add('dy-glow'); api.hint(`Try the glowing ${MONEY[v].t}.`);
        }
      }
      render(); check();
    }
    function changeRound(cfg, items, sum) {
      const paid = [100, 500, 1000, 2000].find(n => n > sum), change = paid - sum;
      const c = counter(items, `That’s ${fmt(sum)}, please.`);
      const pd = el('div', 'dy-paid'); pd.append(el('span', '', 'You hand over'), moneyEl(paid));
      const deltas = shuffle(cfg.step === 1 ? [1, 10, 25, 50, 100] : [5, 10, 25, 50, 100]);
      const opts = new Set([change]);
      for (const d of deltas) {
        if (opts.size >= cfg.opts) break;
        const cand = shuffle([change + d, change - d]).find(x => x > 0 && x < paid && !opts.has(x));
        if (cand) opts.add(cand);
      }
      const grid = el('div', 'dy-copts'); let solved = false;
      [...opts].sort((a, b) => a - b).forEach(v => {
        const b = mkBtn(fmt(v), 'c-card dy-copt'); b.dataset.v = v;
        b.onclick = () => {
          if (solved) return;
          if (v === change) { solved = true; b.classList.add('dy-ok'); sfx.good(); c.bubble.textContent = `Here’s your change: ${fmt(change)}. Thank you!`; api.hint(`${cheer()} ${fmt(paid)} take away ${fmt(sum)} leaves ${fmt(change)}.`); finishRound(c); }
          else { mistakes++; b.classList.add('dy-no'); wob(b); sfx.soft(); api.hint(`Not quite. The shopping costs ${fmt(sum)} and you gave ${fmt(paid)}. Try another.`); }
        };
        grid.append(b);
      });
      root.append(c.p, pd, grid);
      api.hint(`You pay with ${MONEY[paid].t}. How much change do you get back?`);
    }
    next();
  }

  /* =========================================================
     2. WHAT TIME IS IT?
     ========================================================= */
  const say = (h, m) => { const H = mod(h, 12) || 12, N = mod(h + 1, 12) || 12; if (m === 0) return `${H} o’clock`; if (m === 30) return `half past ${H}`; if (m === 15) return `quarter past ${H}`; if (m === 45) return `quarter to ${N}`; return m < 30 ? `${m} past ${H}` : `${60 - m} to ${N}`; };
  const digi = (h, m) => `${mod(h, 12) || 12}:${String(m).padStart(2, '0')}`;
  const EVENTS = [
    { e: '⏰', t: 'Time to get up', h: [7, 8] }, { e: '🥣', t: 'Time for breakfast', h: [7, 8, 9] }, { e: '📰', t: 'The newspaper comes', h: [7, 8] },
    { e: '☕', t: 'Time for a cup of tea', h: [10, 11, 3, 4] }, { e: '🍽️', t: 'Time for lunch', h: [12, 1] }, { e: '🚌', t: 'The bus comes', h: [9, 10, 11, 2, 3] },
    { e: '📻', t: 'The radio show starts', h: [9, 10, 2, 7] }, { e: '🍰', t: 'Time for cake', h: [3, 4] }, { e: '🌷', t: 'Time to water the garden', h: [5, 6, 9] },
    { e: '🍲', t: 'Time for dinner', h: [5, 6] }, { e: '📺', t: 'The film starts', h: [7, 8] }, { e: '🛏️', t: 'Time for bed', h: [9, 10] },
    { e: '📞', t: 'Time to phone a friend', h: [11, 2, 4] }, { e: '🚶', t: 'Time for a walk', h: [10, 2, 3] }, { e: '🎂', t: 'The party starts', h: [2, 3, 4] },
    { e: '💇', t: 'The hairdresser', h: [10, 11, 2] }, { e: '🛒', t: 'Time to go shopping', h: [9, 10, 11] }, { e: '🎵', t: 'The singing group', h: [2, 3] }];
  const clkStep = L => L <= 1 ? 60 : L === 2 ? 30 : L === 3 ? 15 : 5;
  function clockMinute(L) {
    if (L <= 1) return 0;
    if (L === 2) return pick([0, 30, 30]);
    if (L === 3) return pick([0, 15, 30, 45, 15, 45]);
    return Math.random() < (L >= 6 ? .7 : .5) ? pick([5, 10, 20, 25, 35, 40, 50, 55]) : pick([0, 15, 30, 45]);
  }
  function clockSvg() {
    let s = '<svg class="dy-clock" viewBox="0 0 200 200" role="img" aria-label="Clock face">' +
      '<circle cx="100" cy="100" r="98" fill="#7A4A28"/><circle cx="100" cy="100" r="92" fill="#E9C67E"/><circle cx="100" cy="100" r="86" fill="#FFF9EF"/>';
    for (let i = 0; i < 60; i++) {
      const a = i * Math.PI / 30, big = i % 5 === 0, r1 = 83, r2 = big ? 74 : 79, sx = Math.sin(a), cx = Math.cos(a);
      s += `<line x1="${(100 + sx * r1).toFixed(1)}" y1="${(100 - cx * r1).toFixed(1)}" x2="${(100 + sx * r2).toFixed(1)}" y2="${(100 - cx * r2).toFixed(1)}" stroke="${big ? '#18242C' : '#9AA4AB'}" stroke-width="${big ? 3 : 1.5}" stroke-linecap="round"/>`;
    }
    for (let n = 1; n <= 12; n++) { const a = n * Math.PI / 6; s += `<text x="${(100 + Math.sin(a) * 62).toFixed(1)}" y="${(100 - Math.cos(a) * 62 + 7).toFixed(1)}" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="21" fill="#18242C">${n}</text>`; }
    s += '<g class="dy-hh"><line x1="100" y1="112" x2="100" y2="54" stroke="#18242C" stroke-width="11" stroke-linecap="round"/></g>' +
      '<g class="dy-mh"><line x1="100" y1="116" x2="100" y2="26" stroke="#C4432A" stroke-width="6" stroke-linecap="round"/><circle cx="100" cy="30" r="5" fill="#C4432A"/></g>' +
      '<circle cx="100" cy="100" r="9" fill="#E9C67E" stroke="#A47A35" stroke-width="3"/></svg>';
    return s;
  }

  function startClock(L0, api) {
    const L = lvl(L0), total = 6, done = finisher(api), step = clkStep(L), nOpt = L <= 2 ? 3 : 4;
    let round = 0, mistakes = 0, lastKey = '';
    const root = el('div', 'dy-wrap'); api.stage.append(root);
    function newTime() {
      let ev, h, m, key;
      do { ev = pick(EVENTS); h = pick(ev.h); m = clockMinute(L); if (m >= 35 && L >= 3) h = mod(h - 1, 12) || 12; key = h + ':' + m; } while (key === lastKey);
      lastKey = key; return { ev, h, m };
    }
    function face(holder) {
      holder.innerHTML = clockSvg();
      const svg = holder.querySelector('svg'), hh = svg.querySelector('.dy-hh'), mh = svg.querySelector('.dy-mh');
      return { svg, set(tot) { hh.style.transform = `rotate(${tot / 2}deg)`; mh.style.transform = `rotate(${tot * 6}deg)`; } };
    }
    function next() {
      api.rounds(total, round); root.innerHTML = '';
      const q = newTime();
      api.stage.dataset.target = q.h + ':' + q.m; api.stage.dataset.mode = round % 2 ? 'set' : 'read';
      (round % 2 ? setRound : readRound)(q);
    }
    function after(msg) {
      round++; toast(cheer());
      api.hint(msg);
      api.later(() => { if (round === total) { api.rounds(total, round); done(starsFor(mistakes, 1, 3)); } else next(); }, 1900);
    }
    function readRound(q) {
      const ctx = el('div', 'dy-ctx', `<span class="e" aria-hidden="true">${q.ev.e}</span><span>${q.ev.t}…</span>`);
      const wrap = el('div', 'dy-clkwrap'), holder = el('div'), side = el('div', 'dy-topts');
      wrap.append(holder, side); root.append(ctx, wrap);
      const f = face(holder); f.set(q.h * 60 + q.m);
      // distractors: hour off by one, other minutes, swapped hands
      const allowedM = L <= 1 ? [0] : L === 2 ? [0, 30] : L === 3 ? [0, 15, 30, 45] : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
      const cands = [[q.h + 1, q.m], [q.h - 1, q.m]];
      allowedM.filter(x => x !== q.m).forEach(x => cands.push([q.h, x], [q.h - 1, x]));
      if (q.m) cands.unshift([q.m / 5, mod(q.h, 12) * 5]);
      if (L <= 1) cands.push([q.h + 2, 0], [q.h - 2, 0], [q.h + 6, 0]);
      const seen = new Set([say(q.h, q.m)]), opts = [[q.h, q.m]];
      const head = cands.slice(0, 2), rest = shuffle(cands.slice(2));
      for (const [h, m] of shuffle(head).concat(rest)) {
        if (opts.length >= nOpt) break;
        if (!allowedM.includes(m)) continue;
        const k = say(h, m); if (seen.has(k)) continue; seen.add(k); opts.push([h, m]);
      }
      let solved = false;
      shuffle(opts).forEach(([h, m]) => {
        const b = mkBtn(`<span>${say(h, m)}</span><small>${digi(h, m)}</small>`, 'c-card dy-topt'); b.dataset.ans = (h === q.h && m === q.m) ? '1' : '';
        b.onclick = () => {
          if (solved) return;
          if (h === q.h && m === q.m) { solved = true; b.classList.add('dy-ok'); sfx.good(); ctx.innerHTML = `<span class="e" aria-hidden="true">${q.ev.e}</span><span>${q.ev.t}: ${say(q.h, q.m)}</span>`; ctx.classList.add('dy-pop'); after(`Yes! It’s ${say(q.h, q.m)}.`); }
          else { mistakes++; b.classList.add('dy-no'); wob(b); sfx.soft(); api.hint(q.m === 0 ? 'Look at the short hand. Which number is it pointing to?' : 'The short hand shows the hour, the long hand shows the minutes. Try another.'); }
        };
        side.append(b);
      });
      api.hint('What time does the clock say? Tap the right time.');
    }
    function setRound(q) {
      const target = mod(q.h, 12) * 60 + q.m;
      let tot; do tot = (randInt(12)) * 60 + (step < 60 ? step * randInt(60 / step) : 0); while (mod(tot, 720) === target);
      let active = step < 60 ? 'm' : 'h', wrong = 0, solved = false;
      const ctx = el('div', 'dy-ctx', `<span class="e" aria-hidden="true">${q.ev.e}</span><span>${q.ev.t}: ${say(q.h, q.m)}</span>`);
      const wrap = el('div', 'dy-clkwrap'), holder = el('div'), ctl = el('div', 'dy-ctl');
      wrap.append(holder, ctl); root.append(ctx, wrap);
      const f = face(holder); f.set(tot);
      const sel = {};
      function row(which, label, sub, d) {
        const r = el('div', 'dy-hrow');
        const s = el('button', 'dy-hsel', `${label}<small>${sub}</small>`); s.type = 'button';
        s.onclick = () => { active = which; sfx.tap(); mark(); };
        sel[which] = s;
        r.append(mkBtn('−', 'c-sky', () => move(-d)), s, mkBtn('+', 'c-sky', () => move(d)));
        r.firstChild.setAttribute('aria-label', 'Back ' + label); r.lastChild.setAttribute('aria-label', 'Forward ' + label);
        r.firstChild.dataset.k = which + '-'; r.lastChild.dataset.k = which + '+';
        return r;
      }
      const readout = el('p', 'dy-readout');
      ctl.append(row('h', 'Hour', 'short hand', 60));
      if (step < 60) ctl.append(row('m', 'Minutes', 'long hand', step));
      if (L <= 3) ctl.append(readout);
      const ok = mkBtn('✓ That’s it', 'c-leaf', check), show = mkBtn('Show me', 'c-sun', showMe);
      show.hidden = true; ok.dataset.k = 'ok';
      const br = el('div', 'dy-row'); br.append(ok, show); ctl.append(br);
      function mark() { Object.keys(sel).forEach(k => sel[k].setAttribute('aria-pressed', String(k === active))); }
      function upd() { f.set(tot); const t = mod(tot, 720); readout.textContent = 'Now: ' + say(Math.floor(t / 60), t % 60); api.stage.dataset.now = mod(tot, 720); }
      function move(d) { if (solved) return; tot += d; active = d === 60 || d === -60 ? 'h' : 'm'; mark(); tone(d > 0 ? 620 : 500, .07, 'triangle', .08); upd(); }
      f.svg.addEventListener('pointerdown', e => {
        if (solved) return;
        const r = f.svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 200 - 100, y = (e.clientY - r.top) / r.height * 200 - 100;
        if (Math.hypot(x, y) < 18) return;
        const ang = mod(Math.atan2(x, -y) * 180 / Math.PI, 360);
        if (active === 'h') { const curH = Math.floor(mod(tot, 720) / 60), tgtH = Math.round(ang / 30) % 12; let dh = mod(tgtH - curH, 12); if (dh > 6) dh -= 12; tot += dh * 60; }
        else { const curM = mod(tot, 60), tgtM = (Math.round(ang / 6 / step) * step) % 60; tot += tgtM - curM; }
        tone(560, .07, 'triangle', .08); upd();
      });
      function check() {
        if (solved) return;
        if (mod(tot, 720) === target) {
          solved = true; ok.disabled = true; show.hidden = true; sfx.good(); rise(3); ctx.classList.add('dy-pop');
          after(`${cheer()} ${q.ev.t}: ${say(q.h, q.m)}.`);
          return;
        }
        mistakes++; wrong++; sfx.soft(); wob(holder);
        const t = mod(tot, 720), hOk = Math.floor(t / 60) === Math.floor(target / 60), mOk = t % 60 === q.m;
        const num = q.m === 0 ? 12 : q.m / 5;
        if (!mOk) api.hint(`Nearly. The long hand shows the minutes. For ${say(q.h, q.m)} it points at the ${num}.`);
        else if (!hOk) api.hint(q.m === 0 ? `Nearly. The short hand shows the hour. Point it at the ${mod(q.h, 12) || 12}.` : `Nearly. The short hand shows the hour. It should be just past the ${mod(q.h, 12) || 12}.`);
        if (wrong >= 2) show.hidden = false;
      }
      function showMe() { if (solved) return; tot += mod(target - mod(tot, 720), 720) > 360 ? mod(target - mod(tot, 720), 720) - 720 : mod(target - mod(tot, 720), 720); upd(); api.hint('There it is. Tap “That’s it”.'); }
      mark(); upd();
      api.hint(`Set the clock to ${say(q.h, q.m)}. Tap + and −, or tap the clock face.`);
    }
    next();
  }

  /* =========================================================
     3. FISH POND (canvas)
     ========================================================= */
  const FISH = [
    { id: 'gold', name: 'gold', col: '#FFC234', dk: '#B98200', sym: '★' },
    { id: 'orange', name: 'orange', col: '#FF8A3C', dk: '#B5560E', sym: '●' },
    { id: 'blue', name: 'blue', col: '#5BB8FF', dk: '#1D70C0', sym: '■' },
    { id: 'pink', name: 'pink', col: '#F56FA4', dk: '#AE2A5F', sym: '♥' },
    { id: 'white', name: 'white', col: '#F7F4EC', dk: '#9D978A', sym: '▲' }];
  const PW = 480, PH = 360, FLEN = 86;
  function drawFish(x, f, t) {
    const L = f.len, wig = Math.sin(t * 3.2 + f.ph) * .32;
    x.save(); x.translate(f.x, f.y); x.rotate(f.a);
    x.fillStyle = 'rgba(0,20,30,.22)'; x.beginPath(); x.ellipse(5, 9, L * .5, L * .2, 0, 0, Math.PI * 2); x.fill();
    x.save(); x.translate(-L * .4, 0); x.rotate(wig);
    x.fillStyle = f.t.dk; x.beginPath(); x.moveTo(4, 0); x.quadraticCurveTo(-L * .2, -L * .3, -L * .34, -L * .24); x.quadraticCurveTo(-L * .24, 0, -L * .34, L * .24); x.quadraticCurveTo(-L * .2, L * .3, 4, 0); x.fill();
    x.restore();
    x.fillStyle = f.t.dk;
    [-1, 1].forEach(sg => { x.beginPath(); x.ellipse(L * .08, sg * L * .21, L * .13, L * .06, sg * (.6 + wig * .5), 0, Math.PI * 2); x.fill(); });
    x.fillStyle = f.t.col; x.beginPath(); x.ellipse(0, 0, L * .5, L * .22, 0, 0, Math.PI * 2); x.fill();
    x.globalAlpha = .35; x.fillStyle = '#fff'; x.beginPath(); x.ellipse(L * .05, -L * .07, L * .3, L * .06, 0, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1;
    x.lineWidth = 3; x.strokeStyle = f.t.dk; x.beginPath(); x.ellipse(0, 0, L * .5, L * .22, 0, 0, Math.PI * 2); x.stroke();
    [-1, 1].forEach(sg => { x.fillStyle = '#fff'; x.beginPath(); x.arc(L * .34, sg * L * .1, 5.5, 0, Math.PI * 2); x.fill(); x.fillStyle = '#18242C'; x.beginPath(); x.arc(L * .36, sg * L * .1, 3, 0, Math.PI * 2); x.fill(); });
    x.restore();
    x.fillStyle = '#18242C'; x.font = `700 ${Math.round(L * .26)}px Fredoka, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(f.t.sym, f.x, f.y + 1);
  }
  function badge(x, X, Y, fill, txt) {
    x.fillStyle = fill; x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.arc(X, Y, 15, 0, Math.PI * 2); x.fill(); x.stroke();
    x.fillStyle = '#fff'; x.font = '700 18px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, X, Y + 1);
  }
  function pondBackdrop() {
    const cv = document.createElement('canvas'); cv.width = PW * 2; cv.height = PH * 2;
    const x = cv.getContext('2d'); x.scale(2, 2);
    const g = x.createRadialGradient(PW * .5, PH * .45, 30, PW * .5, PH * .5, PW * .7); g.addColorStop(0, '#3FB6BE'); g.addColorStop(1, '#16707C');
    x.fillStyle = g; x.fillRect(0, 0, PW, PH);
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(${pick(['20,60,70', '60,120,110', '240,250,240'])},${.06 + Math.random() * .1})`; x.beginPath(); x.ellipse(Math.random() * PW, Math.random() * PH, 6 + Math.random() * 14, 4 + Math.random() * 8, Math.random() * 3, 0, Math.PI * 2); x.fill(); }
    x.strokeStyle = 'rgba(255,255,255,.08)'; x.lineWidth = 2;
    for (let i = 0; i < 14; i++) { const cx = Math.random() * PW, cy = Math.random() * PH; x.beginPath(); x.arc(cx, cy, 20 + Math.random() * 40, Math.random() * 6, Math.random() * 6 + 1.2); x.stroke(); }
    const spots = shuffle([[40, 40], [PW - 44, 42], [36, PH - 40], [PW - 40, PH - 38], [PW * .5, 22], [PW * .5, PH - 20]]).slice(0, 4);
    spots.forEach(([px, py], i) => {
      const r = 30 + Math.random() * 10, a0 = Math.random() * 6;
      x.fillStyle = 'rgba(0,30,20,.25)'; x.beginPath(); x.arc(px + 4, py + 6, r, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#3CC46B'; x.beginPath(); x.moveTo(px, py); x.arc(px, py, r, a0 + .35, a0 + Math.PI * 2 - .1); x.closePath(); x.fill();
      x.strokeStyle = '#1F8C46'; x.lineWidth = 2; x.stroke();
      x.strokeStyle = 'rgba(255,255,255,.25)'; for (let k = 0; k < 5; k++) { const a = a0 + .8 + k * 1.1; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * r * .85, py + Math.sin(a) * r * .85); x.stroke(); }
      if (i % 2 === 0) { x.fillStyle = '#FFB3CF'; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; x.beginPath(); x.ellipse(px + Math.cos(a) * 8, py + Math.sin(a) * 8, 9, 5, a, 0, Math.PI * 2); x.fill(); } x.fillStyle = '#FFE066'; x.beginPath(); x.arc(px, py, 5, 0, Math.PI * 2); x.fill(); }
    });
    return cv;
  }

  function startPond(L0, api) {
    const L = lvl(L0), total = 4, done = finisher(api), c = Math.min(L, 8);
    let round = 0, mistakes = 0, fish = [], task = null, ripples = [], last = 0, spawnT = 0;
    const speed = 18 + c * 2.2;
    const root = el('div', 'dy-wrap');
    const taskBar = el('div', 'dy-panel dy-task'), mini = document.createElement('canvas'), taskTxt = el('span');
    mini.width = 144; mini.height = 88; taskBar.append(mini, taskTxt);
    const cv = document.createElement('canvas'); cv.className = 'dy-pond';
    const dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = PW * dpr; cv.height = PH * dpr;
    const x = cv.getContext('2d'), bg = pondBackdrop();
    const nums = el('div', 'dy-nums');
    root.append(taskBar, cv, nums); api.stage.append(root);
    cv._pond = { get fish() { return fish; }, get task() { return task; }, W: PW, H: PH };

    function drawMini(t) {
      const m = mini.getContext('2d'); m.setTransform(2, 0, 0, 2, 0, 0); m.clearRect(0, 0, 72, 44);
      drawFish(m, { x: 40, y: 22, a: 0, len: 56, ph: 0, t }, 0);
    }
    function makeFish(type) {
      let fx, fy, tries = 0;
      do { fx = 60 + Math.random() * (PW - 120); fy = 60 + Math.random() * (PH - 120); tries++; } while (tries < 40 && fish.some(o => Math.hypot(o.x - fx, o.y - fy) < 90));
      return { x: fx, y: fy, a: Math.random() * Math.PI * 2, v: speed * (.8 + Math.random() * .4), turn: 0, turnTo: 0, tt: 0, ph: Math.random() * 6, len: FLEN * (.92 + Math.random() * .16), t: type, fed: false, num: 0, joy: 0 };
    }
    function next() {
      api.rounds(total, round); nums.innerHTML = ''; fish = [];
      const kind = round % 2 ? 'count' : 'feed';
      const types = shuffle(FISH.slice()), tgt = types[0], others = types.slice(1, c <= 1 ? 2 : c <= 3 ? 3 : 4);
      let nT, nO;
      if (kind === 'feed') { nT = c <= 1 ? 2 : c <= 3 ? 3 : c <= 5 ? 4 : 3 + randInt(3); nO = c <= 1 ? 2 : c === 2 ? 3 : c === 3 ? 4 : Math.min(9 - nT, 4 + randInt(2)); }
      else { nT = c <= 1 ? 1 + randInt(3) : c === 2 ? 2 + randInt(3) : c === 3 ? 2 + randInt(4) : 3 + randInt(4); nO = c <= 1 ? 2 : c === 2 ? 3 : Math.min(10 - nT, 3 + randInt(3)); }
      for (let i = 0; i < nT; i++) fish.push(makeFish(tgt));
      for (let i = 0; i < nO; i++) fish.push(makeFish(others[i % others.length]));
      task = { kind, tgt, n: nT, fed: 0, counted: 0, solved: false };
      drawMini(tgt);
      if (kind === 'feed') {
        taskTxt.textContent = `Feed the ${nT} ${tgt.name} fish (${tgt.sym})`;
        api.hint(`Feed the ${nT} ${tgt.name} fish. Tap each one as it swims by.`);
      } else {
        taskTxt.textContent = `How many ${tgt.name} fish (${tgt.sym})?`;
        api.hint(`Count the ${tgt.name} fish. Tap each one to number it, then tap the answer.`);
        const opts = new Set([nT]); const near = shuffle([nT - 1, nT + 1, nT + 2, nT - 2].filter(v => v >= 1));
        while (opts.size < 3) opts.add(near.shift());
        [...opts].sort((a, b) => a - b).forEach(v => {
          const b = mkBtn(String(v), 'c-card'); b.dataset.v = v;
          b.onclick = () => {
            if (task.solved) return;
            if (v === nT) { task.solved = true; b.classList.add('dy-ok'); sfx.good(); rise(3); fish.filter(f => f.t === tgt).forEach((f, i) => { f.joy = 1.2; if (!f.num) f.num = ++task.counted; }); finish(`Yes, ${nT} ${tgt.name} fish! ${cheer()}`); }
            else { mistakes++; b.classList.add('dy-no'); wob(b); sfx.soft(); api.hint(`Not quite. Tap each ${tgt.name} fish to number it, then try again.`); }
          };
          nums.append(b);
        });
      }
    }
    function finish(msg) {
      round++; api.hint(msg); toast(cheer());
      api.later(() => { if (round === total) { api.rounds(total, round); done(starsFor(mistakes, 1, 3)); } else next(); }, 2000);
    }
    cv.addEventListener('pointerdown', e => {
      const r = cv.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * PW, py = (e.clientY - r.top) / r.height * PH;
      ripples.push({ x: px, y: py, r: 6, life: 1 });
      if (!task || task.solved) return;
      const near = fish.map(f => ({ f, d: Math.hypot(f.x - px, f.y - py) })).filter(o => o.d < 62).sort((a, b) => a.d - b.d);
      if (!near.length) return;
      const want = task.kind === 'feed' ? near.find(o => o.f.t === task.tgt && !o.f.fed) : near.find(o => o.f.t === task.tgt && !o.f.num);
      const hit = (want || near[0]).f;
      if (task.kind === 'feed') {
        if (hit.t === task.tgt && !hit.fed) {
          hit.fed = true; hit.joy = 1.2; task.fed++;
          for (let k = 0; k < 5; k++) ripples.push({ x: hit.x + (Math.random() - .5) * 30, y: hit.y + (Math.random() - .5) * 30, r: 2, life: 1, food: true });
          tone(520 + task.fed * 70, .16, 'triangle', .13); tone(780 + task.fed * 70, .2, 'sine', .08, .08);
          api.rounds(total, round);
          if (task.fed === task.n) { task.solved = true; sfx.good(); finish(`All ${task.n} ${task.tgt.name} fish are fed. ${cheer()}`); }
          else api.hint(`Yum! ${task.n - task.fed} more ${task.tgt.name} fish to feed.`);
        } else if (hit.t === task.tgt) { api.hint('That one has had its food. Find a hungry one.'); sfx.tap(); }
        else { mistakes++; sfx.soft(); hit.joy = .4; api.hint(`That’s ${/^[aeiou]/.test(hit.t.name) ? 'an' : 'a'} ${hit.t.name} fish (${hit.t.sym}). Look for the ${task.tgt.name} ones with ${task.tgt.sym}.`); }
      } else {
        if (hit.t === task.tgt && !hit.num) { hit.num = ++task.counted; hit.joy = .8; tone(500 + hit.num * 60, .14, 'triangle', .12); api.hint(`That’s ${hit.num}. Keep counting, then tap the answer.`); }
        else if (hit.t !== task.tgt) { sfx.tap(); api.hint(`That’s ${/^[aeiou]/.test(hit.t.name) ? 'an' : 'a'} ${hit.t.name} fish. We’re counting ${task.tgt.name} ones (${task.tgt.sym}).`); }
      }
    });

    function step(dt) {
      fish.forEach(f => {
        f.tt -= dt; if (f.tt <= 0) { f.turnTo = (Math.random() - .5) * .9; f.tt = 1.5 + Math.random() * 2.5; }
        f.turn += (f.turnTo - f.turn) * Math.min(1, dt * 1.5);
        const m = 58; let want = null;
        if (f.x < m || f.x > PW - m || f.y < m || f.y > PH - m) want = Math.atan2(PH / 2 - f.y, PW / 2 - f.x);
        if (want !== null) { let d = want - f.a; d = Math.atan2(Math.sin(d), Math.cos(d)); f.a += Math.max(-1.4 * dt, Math.min(1.4 * dt, d)); }
        else f.a += f.turn * dt;
        fish.forEach(o => { if (o === f) return; const dx = f.x - o.x, dy = f.y - o.y, d = Math.hypot(dx, dy); if (d < 70 && d > 0.01) { f.x += dx / d * 14 * dt; f.y += dy / d * 14 * dt; } });
        const v = f.v * (1 + f.joy * .6); f.joy = Math.max(0, f.joy - dt * .8);
        f.x = Math.max(30, Math.min(PW - 30, f.x + Math.cos(f.a) * v * dt));
        f.y = Math.max(26, Math.min(PH - 26, f.y + Math.sin(f.a) * v * dt));
      });
      spawnT -= dt; if (spawnT <= 0) { spawnT = 1.4 + Math.random() * 1.6; ripples.push({ x: Math.random() * PW, y: Math.random() * PH, r: 4, life: 1 }); }
      ripples.forEach(r => { r.r += dt * (r.food ? 10 : 26); r.life -= dt * (r.food ? .7 : .45); });
      ripples = ripples.filter(r => r.life > 0);
    }
    function draw(t) {
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.drawImage(bg, 0, 0, PW, PH);
      ripples.forEach(r => {
        if (r.food) { x.fillStyle = `rgba(150,90,40,${r.life})`; x.beginPath(); x.arc(r.x, r.y, 3.5, 0, Math.PI * 2); x.fill(); return; }
        x.strokeStyle = `rgba(255,255,255,${r.life * .5})`; x.lineWidth = 2; x.beginPath(); x.arc(r.x, r.y, r.r, 0, Math.PI * 2); x.stroke();
      });
      fish.forEach(f => drawFish(x, f, t));
      fish.forEach(f => {
        if (f.fed) badge(x, f.x, f.y - f.len * .36, '#1F8C46', '✓');
        else if (f.num) badge(x, f.x, f.y - f.len * .36, '#C46512', String(f.num));
      });
    }
    function frame(now) {
      if (!api.stage.isConnected || !cv.isConnected || !cv.offsetParent) return;
      const t = now / 1000, dt = Math.min(.05, last ? t - last : 0); last = t;
      step(dt); draw(t);
      requestAnimationFrame(frame);
    }
    next(); draw(0); requestAnimationFrame(frame);
  }

  /* =========================================================
     4. FINISH THE SONG (public-domain songs, all published before 1929)
     ========================================================= */
  const SONGS = [
    { t: 'Daisy Bell', e: '🚲', f: 1, beat: .22, tune: 'G5:3 E5:3 C5:3 G4:3 A4 B4 C5 A4:2 C5 G4:6 D5:3 G5:3 E5:3 C5:3 A4 B4 C5 D5:2 E5 D5:6',
      p: [['Daisy, Daisy, give me your answer, do', 'I’m half crazy, all for the love of you'], ['It won’t be a stylish marriage', 'I can’t afford a carriage'], ['But you’ll look sweet upon the seat', 'Of a bicycle built for two']] },
    { t: 'Take Me Out to the Ball Game', e: '⚾', f: 1, beat: .26, tune: 'C5:2 C6 A5 G5 E5 G5:3 D5:3 C5:2 C6 A5 G5 E5 G5:6',
      p: [['Take me out to the ball game', 'Take me out with the crowd'], ['Buy me some peanuts and Cracker Jack', 'I don’t care if I never get back']] },
    { t: 'Clementine', e: '⛏️', f: 1, beat: .32, tune: 'C5:.75 C5:.25 C5 G4 E5:.75 E5:.25 E5 C5 C5:.75 E5:.25 G5:1.5 G5:.5 F5:.5 E5:.5 D5:3',
      p: [['Oh my darling, oh my darling, oh my darling Clementine', 'You are lost and gone forever, dreadful sorry, Clementine'], ['In a cavern, in a canyon, excavating for a mine', 'Dwelt a miner, forty-niner, and his daughter Clementine']] },
    { t: 'She’ll Be Coming Round the Mountain', e: '⛰️', f: 2, beat: .3, tune: 'G4:.5 A4:.5 C5 C5 C5 C5 A4 G4 E4 G4 C5:3',
      p: [['She’ll be coming round the mountain, she’ll be coming round the mountain', 'She’ll be coming round the mountain when she comes']] },
    { t: 'Home on the Range', e: '🦬', f: 1, beat: .3, tune: 'G4 G4 C5:2 D5 E5:2 C5:.5 B4:.5 A4:2 F4 F4 F4:3',
      p: [['Oh, give me a home where the buffalo roam', 'Where the deer and the antelope play'], ['Where seldom is heard a discouraging word', 'And the skies are not cloudy all day']] },
    { t: 'Twinkle, Twinkle, Little Star', e: '⭐', f: 1, beat: .42, tune: 'C5 C5 G5 G5 A5 A5 G5:2 F5 F5 E5 E5 D5 D5 C5:2',
      p: [['Twinkle, twinkle, little star', 'How I wonder what you are'], ['Up above the world so high', 'Like a diamond in the sky']] },
    { t: 'Row, Row, Row Your Boat', e: '🚣', f: 1, beat: .17, tune: 'C5:3 C5:3 C5:2 D5 E5:3 E5:2 D5 E5:2 F5 G5:6',
      p: [['Row, row, row your boat', 'Gently down the stream'], ['Merrily, merrily, merrily, merrily', 'Life is but a dream']] },
    { t: 'Old MacDonald', e: '🐄', f: 1, beat: .3, tune: 'C5 C5 C5 G4 A4 A4 G4:2 E5 E5 D5 D5 C5:3',
      p: [['Old MacDonald had a farm', 'E-I-E-I-O'], ['With a moo-moo here and a moo-moo there', 'Here a moo, there a moo, everywhere a moo-moo']] },
    { t: 'Auld Lang Syne', e: '🥂', f: 1, beat: .4, tune: 'G4 C5:1.5 C5:.5 C5 E5 D5:1.5 C5:.5 D5 E5 C5:1.5 C5:.5 E5 G5 A5:3',
      p: [['Should auld acquaintance be forgot', 'And never brought to mind?'], ['We’ll take a cup o’ kindness yet', 'For auld lang syne']] },
    { t: 'Pack Up Your Troubles', e: '🎒', f: 2,
      p: [['Pack up your troubles in your old kit-bag', 'And smile, smile, smile'], ['What’s the use of worrying?', 'It never was worthwhile']] },
    { t: 'It’s a Long Way to Tipperary', e: '🛤️', f: 2,
      p: [['It’s a long way to Tipperary', 'It’s a long way to go'], ['Goodbye, Piccadilly', 'Farewell, Leicester Square']] },
    { t: 'Let Me Call You Sweetheart', e: '💕', f: 2,
      p: [['Let me call you sweetheart', 'I’m in love with you'], ['Let me hear you whisper', 'That you love me too']] },
    { t: 'By the Light of the Silvery Moon', e: '🌙', f: 2,
      p: [['By the light of the silvery moon', 'I want to spoon'], ['To my honey I’ll croon love’s tune', 'Honey moon, keep a-shining in June']] },
    { t: 'Shine On, Harvest Moon', e: '🌕', f: 2,
      p: [['Shine on, shine on, harvest moon, up in the sky', 'I ain’t had no lovin’ since January, February, June or July']] },
    { t: 'In the Good Old Summertime', e: '☀️', f: 2,
      p: [['In the good old summertime, in the good old summertime', 'Strolling through the shady lanes with your baby mine'], ['You hold her hand and she holds yours', 'And that’s a very good sign']] },
    { t: 'Down by the Old Mill Stream', e: '🌊', f: 2,
      p: [['Down by the old mill stream', 'Where I first met you'], ['With your eyes of blue', 'Dressed in gingham too']] },
    { t: 'Happy Birthday', e: '🎂', f: 1, beat: .38, tune: 'G4:.75 G4:.25 A4 G4 C5 B4:2 G4:.75 G4:.25 A4 G4 D5 C5:2',
      p: [['Happy birthday to you, happy birthday to you', 'Happy birthday, dear friend, happy birthday to you']] },
    { t: 'Jingle Bells', e: '🔔', f: 1, beat: .28, tune: 'E5 E5 E5:2 E5 E5 E5:2 E5 G5 C5:1.5 D5:.5 E5:4',
      p: [['Dashing through the snow', 'In a one-horse open sleigh'], ['Jingle bells, jingle bells', 'Jingle all the way'], ['Oh, what fun it is to ride', 'In a one-horse open sleigh']] },
    { t: 'Swanee River', e: '🛶', f: 2, beat: .3, tune: 'E5:1.5 D5:.5 C5 E5 D5 C5 C6:2 A5 C6:3 G5:2 E5 C5 D5:4',
      p: [['Way down upon the Swanee River', 'Far, far away'], ['There’s where my heart is turning ever', 'There’s where the old folks stay']] },
    { t: 'My Bonnie Lies over the Ocean', e: '⛵', f: 1, beat: .3, tune: 'G4 E5:1.5 D5:.5 C5 D5 C5 A4 G4 E4:3 G4 E5:1.5 D5:.5 C5 C5 B4 C5 D5:4',
      p: [['My Bonnie lies over the ocean', 'My Bonnie lies over the sea'], ['Bring back, bring back', 'Bring back my Bonnie to me']] },
    { t: 'Oh! Susanna', e: '🪕', f: 2,
      p: [['Oh, Susanna, oh don’t you cry for me', 'For I come from Alabama with my banjo on my knee']] },
    { t: 'I’ve Been Working on the Railroad', e: '🚂', f: 2,
      p: [['I’ve been working on the railroad, all the live-long day', 'I’ve been working on the railroad, just to pass the time away']] },
    { t: 'Yankee Doodle', e: '🪶', f: 1, beat: .24, tune: 'C5 C5 D5 E5 C5 E5 D5 G4 C5 C5 D5 E5 C5:2 B4:2 C5 C5 D5 E5 F5 E5 D5 C5 B4 G4 A4 B4 C5:2 C5:2',
      p: [['Yankee Doodle went to town', 'A-riding on a pony'], ['Stuck a feather in his cap', 'And called it macaroni']] },
    { t: 'Polly Wolly Doodle', e: '🎶', f: 2,
      p: [['Oh, I went down South for to see my Sal', 'Sing Polly wolly doodle all the day']] },
    { t: 'When Irish Eyes Are Smiling', e: '☘️', f: 2,
      p: [['When Irish eyes are smiling', 'Sure, ’tis like the morn in spring'], ['In the lilt of Irish laughter', 'You can hear the angels sing']] }
  ];
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const noteFreq = s => { const m = /^([A-G])(#|b)?(\d)$/.exec(s); const midi = 12 * (+m[3] + 1) + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); return 440 * Math.pow(2, (midi - 69) / 12); };
  const parseTune = s => s.trim().split(/\s+/).map(t => { const [nm, b] = t.split(':'); return { f: nm === 'R' ? 0 : noteFreq(nm), b: b ? +b : 1 }; });

  function startSong(L0, api) {
    const L = lvl(L0), total = 5, done = finisher(api);
    const famous = SONGS.filter(s => s.f === 1), pool = shuffle((L <= 1 ? famous : SONGS).slice()).slice(0, total);
    let round = 0, mistakes = 0, playTok = 0;
    const root = el('div', 'dy-wrap'); api.stage.append(root);
    function playTune(song, notes) {
      const tok = ++playTok, seq = parseTune(song.tune); let t = 150;
      notes.innerHTML = '<span>🎵</span><span>🎶</span><span>🎵</span>';
      seq.forEach(nt => {
        const at = t, dur = Math.max(.14, nt.b * song.beat * .92);
        api.later(() => { if (tok !== playTok || !nt.f) return; tone(nt.f, dur, 'triangle', .17); tone(nt.f / 2, dur, 'sine', .05); }, at);
        t += nt.b * song.beat * 1000;
      });
      api.later(() => { if (tok === playTok) notes.innerHTML = ''; }, t + 200);
    }
    function show() {
      playTok++; api.rounds(total, round); root.innerHTML = '';
      const song = pool[round], pi = L <= 2 ? 0 : randInt(song.p.length), [line, ans] = song.p[pi];
      const others = shuffle(SONGS.filter(s => s !== song).flatMap(s => s.p.map(p => p[1])));
      const opts = [ans];
      if (L >= 4) { const same = shuffle(song.p.map(p => p[1]).concat(song.p.map(p => p[0]))).find(x => x !== ans && x !== line); if (same) opts.push(same); }
      for (const o of others) { if (opts.length >= 3) break; if (!opts.includes(o)) opts.push(o); }
      const panel = el('div', 'dy-panel dy-song');
      panel.append(el('span', 'dy-chip', `<span aria-hidden="true">${song.e}</span> ${song.t}`), el('p', 'dy-line', `“${line}…”`));
      const gap = el('p', 'dy-next', '<span class="dy-gap">&nbsp;</span>'); panel.append(gap);
      const notes = el('div', 'dy-notes'), after = el('div', 'dy-row');
      const list = el('div', 'dy-lopts');
      let solved = false;
      api.stage.dataset.answer = ans;
      shuffle(opts).forEach(o => {
        const b = mkBtn(o, 'c-card dy-lopt'); b.textContent = o;
        b.onclick = () => {
          if (solved) return;
          if (o === ans) {
            solved = true; b.classList.add('dy-ok'); sfx.good(); gap.textContent = `“${ans}”`; gap.classList.add('dy-pop');
            round++; api.rounds(total, round); toast(cheer());
            list.hidden = true;
            api.hint(song.tune ? `${cheer()} Tap “Hear the tune” to sing along, or go on.` : `${cheer()} Sing it if you like, then go on.`);
            if (song.tune) after.append(mkBtn('▶ Hear the tune', 'c-sun', () => { if (R.isMuted()) R.unmute(); playTune(song, notes); }));
            const nx = mkBtn(round === total ? 'Finish ★' : 'Next song →', 'c-leaf', () => { if (round === total) { playTok++; done(starsFor(mistakes, 1, 3)); nx.disabled = true; } else show(); });
            nx.dataset.k = 'next'; after.append(nx);
          } else { mistakes++; b.classList.add('dy-no'); wob(b); sfx.soft(); api.hint('Not that one. Try singing it in your head. Pick another.'); }
        };
        list.append(b);
      });
      root.append(panel, notes, list, after);
      api.hint('Here’s the start of a song. Which line comes next?');
    }
    show();
  }

  /* =========================================================
     5. OPPOSITES
     ========================================================= */
  const OPP = [['hot', '🔥', 'cold', '🧊'], ['up', '⬆️', 'down', '⬇️'], ['big', '🐘', 'small', '🐭', 'size'], ['day', '☀️', 'night', '🌙'],
    ['happy', '😀', 'sad', '😢'], ['open', '🔓', 'closed', '🔒'], ['fast', '🐇', 'slow', '🐢'], ['old', '👴', 'young', '👶'],
    ['tall', '🦒', 'short', '🐧', 'size'], ['wet', '🌧️', 'dry', '🏜️'], ['loud', '📢', 'quiet', '🤫'], ['stop', '🛑', 'go', '🟢'],
    ['left', '⬅️', 'right', '➡️'], ['heavy', '🏋️', 'light', '🎈'], ['sweet', '🍬', 'sour', '🍋'], ['awake', '⏰', 'asleep', '😴'],
    ['in', '📥', 'out', '📤'], ['summer', '🏖️', 'winter', '⛄'], ['black', '⚫', 'white', '⚪'], ['hard', '🪨', 'soft', '🧸'], ['thick', '📚', 'thin', '📄']];
  const PAIRCOL = ['coral', 'sky', 'sun', 'leaf', 'berry', 'grape'], PAIRSYM = ['●', '★', '▲', '■', '♥', '◆'];
  function startOpposites(L0, api) {
    const L = lvl(L0), done = finisher(api), n = Math.min(6, 3 + Math.floor((L - 1) / 2));
    const chosen = [], groups = new Set();
    for (const p of shuffle(OPP.slice())) { if (chosen.length >= n) break; if (p[4] && groups.has(p[4])) continue; if (p[4]) groups.add(p[4]); chosen.push(p); }
    const cards = shuffle(chosen.flatMap((p, k) => [{ w: p[0], e: p[1], k }, { w: p[2], e: p[3], k }]));
    let sel = null, matched = 0, mistakes = 0, wrongRun = 0;
    const root = el('div', 'dy-wrap'), grid = el('div', 'dy-ogrid');
    root.append(grid); api.stage.append(root);
    api.hint('Tap a word, then tap its opposite.'); api.rounds(n, 0);
    const btns = cards.map(cd => {
      const b = el('button', 'tile c-card dy-ocard', `<span class="e" aria-hidden="true">${cd.e}</span><span class="w">${cd.w}</span>`); b.type = 'button';
      b.dataset.k = cd.k; b.onclick = () => tap(cd, b); grid.append(b); return b;
    });
    function tap(cd, b) {
      if (cd.done) return;
      grid.querySelectorAll('.dy-glow').forEach(x => x.classList.remove('dy-glow'));
      if (!sel) { sel = { cd, b }; b.classList.add('dy-sel'); sfx.tap(); api.hint(`What is the opposite of “${cd.w}”?`); return; }
      if (sel.cd === cd) { b.classList.remove('dy-sel'); sel = null; sfx.tap(); api.hint('Tap a word, then tap its opposite.'); return; }
      if (sel.cd.k === cd.k) {
        const col = PAIRCOL[matched % PAIRCOL.length], sym = PAIRSYM[matched % PAIRSYM.length];
        [sel, { cd, b }].forEach(o => { o.cd.done = true; o.b.classList.remove('dy-sel', 'c-card'); o.b.classList.add('dy-done', 'c-' + col); o.b.append(el('span', 's', sym)); });
        matched++; wrongRun = 0; tone(520 + matched * 60, .16, 'triangle', .13); tone(780 + matched * 60, .2, 'triangle', .1, .09);
        const a = sel.cd.w, z = cd.w; sel = null; api.rounds(n, matched);
        if (matched === n) { sfx.good(); api.hint(`${cheer()} All the opposites are matched.`); api.later(() => done(starsFor(mistakes, 1, 3)), 600); }
        else api.hint(`Yes! “${a}” and “${z}” are opposites. Tap another word.`);
      } else {
        mistakes++; wrongRun++; sfx.soft(); wob(b);
        api.hint(`“${cd.w}” isn’t the opposite of “${sel.cd.w}”. Try another.`);
        if (wrongRun >= 2) { const k = sel.cd.k; btns.forEach((x, i) => { if (cards[i].k === k && cards[i] !== sel.cd) x.classList.add('dy-glow'); }); }
      }
    }
  }

  /* =========================================================
     6. RHYME TIME
     ========================================================= */
  const RHYMES = [
    [['cat', '🐱'], ['hat', '🎩'], ['bat', '🦇'], ['rat', '🐀']], [['dog', '🐶'], ['frog', '🐸'], ['log', '🪵']],
    [['bee', '🐝'], ['tree', '🌳'], ['key', '🔑'], ['tea', '🍵']], [['car', '🚗'], ['star', '⭐'], ['guitar', '🎸']],
    [['boat', '⛵'], ['goat', '🐐'], ['coat', '🧥']], [['cake', '🎂'], ['snake', '🐍'], ['lake', '🏞️']],
    [['clock', '🕰️'], ['sock', '🧦'], ['rock', '🪨'], ['lock', '🔒']], [['bed', '🛏️'], ['bread', '🍞'], ['sled', '🛷']],
    [['snail', '🐌'], ['whale', '🐳'], ['mail', '📬']], [['ring', '💍'], ['king', '🤴'], ['sing', '🎤']],
    [['crown', '👑'], ['clown', '🤡']], [['house', '🏠'], ['mouse', '🐭']], [['bear', '🐻'], ['pear', '🍐'], ['chair', '🪑']],
    [['fox', '🦊'], ['box', '📦']], [['pan', '🍳'], ['van', '🚐'], ['man', '👨']], [['pie', '🥧'], ['tie', '👔'], ['eye', '👁️']],
    [['moon', '🌙'], ['spoon', '🥄'], ['balloon', '🎈']], [['bell', '🔔'], ['shell', '🐚']], [['train', '🚂'], ['rain', '🌧️'], ['plane', '✈️']],
    [['corn', '🌽'], ['horn', '📯'], ['unicorn', '🦄']], [['hen', '🐔'], ['pen', '🖊️'], ['ten', '🔟']], [['dice', '🎲'], ['rice', '🍚']],
    [['sun', '☀️'], ['one', '1️⃣'], ['run', '🏃']], [['fish', '🐟'], ['dish', '🍽️']], [['kite', '🪁'], ['light', '💡'], ['night', '🌃']],
    [['nose', '👃'], ['rose', '🌹']], [['door', '🚪'], ['four', '4️⃣']], [['shoe', '👞'], ['two', '2️⃣'], ['canoe', '🛶']],
    [['egg', '🥚'], ['leg', '🦵']], [['nine', '9️⃣'], ['wine', '🍷']], [['heart', '❤️'], ['cart', '🛒'], ['dart', '🎯']],
    [['bone', '🦴'], ['phone', '📞'], ['cone', '🍦']], [['book', '📖'], ['cook', '🧑‍🍳']]];
  function startRhyme(L0, api) {
    const L = lvl(L0), total = 6, done = finisher(api), nOpt = L <= 3 ? 3 : 4;
    const order = shuffle(RHYMES.map((g, i) => i));
    let round = 0, mistakes = 0;
    const root = el('div', 'dy-wrap'); api.stage.append(root);
    function show() {
      api.rounds(total, round); root.innerHTML = '';
      const gi = order[round % order.length], g = shuffle(RHYMES[gi].slice()), [pw, pe] = g[0], ans = g[1];
      let pool = shuffle(RHYMES.filter((x, i) => i !== gi).map(x => pick(x)));
      if (L >= 3) pool.sort((a, b) => ((b[0][0] === pw[0]) + (b[0].slice(-1) === pw.slice(-1))) - ((a[0][0] === pw[0]) + (a[0].slice(-1) === pw.slice(-1))));
      const opts = shuffle([ans, ...pool.slice(0, nOpt - 1)]);
      const ref = el('div', 'dy-panel dy-ref', `<div class="dy-big" aria-hidden="true">${pe}</div><div class="dy-word">${pw}</div>`);
      const grid = el('div', 'dy-ropts'); grid.style.setProperty('--cols', nOpt === 4 ? 2 : 3);
      let solved = false;
      api.stage.dataset.answer = ans[0];
      opts.forEach(([w, e]) => {
        const b = el('button', 'tile c-card dy-ropt', `<span class="e" aria-hidden="true">${e}</span><span class="w">${w}</span>`); b.type = 'button'; b.dataset.w = w;
        b.onclick = () => {
          if (solved) return;
          if (w === ans[0]) {
            solved = true; b.classList.add('dy-ok', 'dy-pop'); sfx.good(); ref.classList.add('dy-pop'); round++; toast(cheer());
            api.hint(`Yes! “${pw}” and “${w}” rhyme.`);
            api.later(() => { if (round === total) { api.rounds(total, round); done(starsFor(mistakes, 1, 3)); } else show(); }, 1600);
          } else { mistakes++; b.classList.add('dy-no'); wob(b); sfx.soft(); api.hint(`Say them out loud: “${pw}”, “${w}”. They don’t sound the same at the end. Try another.`); }
        };
        grid.append(b);
      });
      root.append(ref, grid);
      api.hint(`Which word rhymes with “${pw}”?`);
    }
    show();
  }

  /* ---------- register ---------- */
  register({ id: 'shop', cat: 'gentle', gentle: true, order: 14, name: 'Corner Shop', icon: '🏪', desc: 'Pay for the shopping with coins and notes', start: startShop });
  register({ id: 'clock', cat: 'gentle', gentle: true, order: 15, name: 'What Time Is It?', icon: '🕰️', desc: 'Read the clock and set the hands', start: startClock });
  register({ id: 'pond', cat: 'gentle', gentle: true, order: 16, name: 'Fish Pond', icon: '🐟', desc: 'Feed and count the fish in a calm pond', start: startPond });
  register({ id: 'song', cat: 'gentle', gentle: true, order: 17, name: 'Finish the Song', icon: '🎤', desc: 'Pick the next line of an old favourite', start: startSong });
  register({ id: 'opposites', cat: 'words', order: 4, name: 'Opposites', icon: '↕️', desc: 'Match each word with its opposite', start: startOpposites });
  register({ id: 'rhyme', cat: 'words', order: 5, name: 'Rhyme Time', icon: '🎩', desc: 'Find the word that rhymes', start: startRhyme });
})();
