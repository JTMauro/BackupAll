/* Recall looking games, batch 2: Spot the Difference, Colour Clash, Bubble Trail, Shade Line-Up */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor } = R;

  R.css(`
/* ---------- shared ---------- */
.l2-bar{display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:10px 14px; margin:12px auto 0}
.l2-pill{display:inline-flex; align-items:center; gap:8px; min-height:56px; padding:6px 16px; border-radius:999px; background:rgba(0,0,0,.2);
  font:600 1.25rem/1 var(--display); color:var(--on-table)}
.l2-bar .btn{min-height:56px; font-size:1.2rem}
.l2-bar .btn[disabled]{opacity:.4; pointer-events:none}

/* ---------- Spot the Difference ---------- */
.sd-pics{display:grid; grid-template-columns:1fr; gap:12px; width:min(100%, 430px); margin:0 auto}
@media (min-width:700px){ .sd-pics{grid-template-columns:1fr 1fr; width:min(100%, 960px); gap:18px} }
.sd-pic{position:relative; container-type:inline-size; aspect-ratio:3/2; border-radius:20px; overflow:hidden; cursor:pointer; user-select:none; -webkit-user-select:none;
  border:5px solid #fff; box-shadow:0 7px 0 var(--card-edge), 0 14px 24px rgba(0,0,0,.3); -webkit-tap-highlight-color:transparent}
.sd-pic.garden{background:radial-gradient(circle at 92% 14%, #FFE680 0 5%, transparent 5.5%), linear-gradient(#A9E1FF 0 27%, #8FDB76 27% 30%, #6CC95A 30%)}
.sd-pic.seaside{background:linear-gradient(#AEE2FF 0 26%, #3FB3E0 26% 52%, #FFF2C8 52% 55%, #F6DC9A 55%)}
.sd-pic.kitchen{background:linear-gradient(transparent 0 26%, #A0663A 26% 29%, transparent 29%), repeating-linear-gradient(90deg, transparent 0 10%, rgba(255,255,255,.55) 10% 10.6%),
  linear-gradient(#FFE9C4 0 52%, #C98A52 52% 56%, #E3B07A 56%)}
.sd-pic.living{background:repeating-linear-gradient(90deg, #F7D6E0 0 6%, #F2C6D4 6% 12%) 0 0/100% 60% no-repeat, linear-gradient(#F7D6E0 0 60%, #8E5A33 60% 62%, #B07A4F 62%)}
.sd-it{position:absolute; transform:translate(-50%, -50%); font-size:10.5cqw; line-height:1; pointer-events:none; filter:drop-shadow(0 .5cqw 0 rgba(0,0,0,.18))}
.sd-ring{position:absolute; width:18cqw; aspect-ratio:1; transform:translate(-50%, -50%); border-radius:50%; pointer-events:none;
  border:1.3cqw solid var(--leaf); box-shadow:0 0 0 .7cqw #fff, inset 0 0 0 .7cqw #fff; animation:bounceIn .35s cubic-bezier(.3,1.5,.5,1)}
.sd-ring.hint{border-color:var(--sun); border-style:dashed; animation:sd-pulse .9s ease-in-out infinite}
@keyframes sd-pulse{50%{scale:1.2; opacity:.55}}
.sd-miss{position:absolute; width:8cqw; aspect-ratio:1; transform:translate(-50%, -50%); border-radius:50%; pointer-events:none;
  background:rgba(255,255,255,.65); animation:sd-fade .6s forwards}
@keyframes sd-fade{from{scale:.4; opacity:1} to{scale:1.6; opacity:0}}
.sd-pic.wobble{animation:wobble .4s}

/* ---------- Colour Clash ---------- */
.cc-box{max-width:640px; margin:0 auto; display:grid; gap:18px}
.cc-screen{position:relative; border-radius:30px; padding:22px 12px; text-align:center; background:radial-gradient(120% 90% at 50% 40%, #3A4048, #1E2228);
  border:8px solid #6B4423; box-shadow:inset 0 0 30px rgba(0,0,0,.6), 0 7px 0 #4A2B15, 0 14px 26px rgba(0,0,0,.3)}
.cc-word{display:inline-block; font:700 clamp(3.2rem, 15vw, 5.2rem)/1.1 var(--display); letter-spacing:.06em; animation:bounceIn .35s cubic-bezier(.3,1.5,.5,1)}
.cc-cap{display:block; margin-top:6px; font:600 1.05rem var(--display); color:#C9D2D8}
.cc-opts{display:grid; grid-template-columns:repeat(3, 1fr); gap:14px}
.cc-opt{flex-direction:column; gap:6px; min-height:96px; padding:10px 6px; font:700 1.3rem/1 var(--display); color:#1B1B1B}
.cc-dot{width:40px; height:40px; border-radius:50%; background:rgba(255,255,255,.35); box-shadow:inset 0 -4px 0 rgba(0,0,0,.18); display:grid; place-items:center; font-size:1.4rem}
.cc-opt.nope{opacity:.3; pointer-events:none}
.cc-opt.right{outline:5px solid #fff; outline-offset:3px; animation:bounceIn .3s}

/* ---------- Bubble Trail ---------- */
.bt-area{position:relative; container-type:inline-size; width:min(100%, 420px); aspect-ratio:1; margin:0 auto; border-radius:26px; overflow:hidden;
  background:radial-gradient(circle at 30% 20%, rgba(255,255,255,.18), transparent 60%), linear-gradient(#5CC6E8, #2E8FBF);
  box-shadow:inset 0 4px 14px rgba(0,0,0,.25), 0 7px 0 rgba(0,0,0,.2)}
.bt-svg{position:absolute; inset:0; width:100%; height:100%; pointer-events:none}
.bt-svg polyline{fill:none; stroke:rgba(255,255,255,.85); stroke-width:6; stroke-linecap:round; stroke-linejoin:round; vector-effect:non-scaling-stroke}
.bt-b{position:absolute; transform:translate(-50%, -50%); width:var(--d); aspect-ratio:1; border-radius:50%; border:0; padding:0; cursor:pointer;
  display:grid; place-items:center; font:700 calc(var(--dn) * .42cqw)/1 var(--display); color:var(--ink);
  background:radial-gradient(circle at 32% 28%, #fff 0 9%, rgba(255,255,255,.4) 10% 22%, transparent 40%), var(--c);
  box-shadow:inset 0 -6px 0 rgba(0,0,0,.16), inset 0 0 0 3px rgba(255,255,255,.55), 0 6px 0 var(--d2), 0 10px 14px rgba(0,0,0,.25);
  animation:bounceIn .4s cubic-bezier(.3,1.5,.5,1) backwards}
.bt-b.num{--c:var(--sun); --d2:var(--sun-d)}
.bt-b.let{--c:var(--peach); --d2:var(--peach-d)}
.bt-b.got{--c:rgba(255,255,255,.25); --d2:transparent; color:rgba(255,255,255,.9); box-shadow:inset 0 0 0 4px rgba(255,255,255,.8); pointer-events:none; animation:bt-pop .35s}
@keyframes bt-pop{0%{scale:1} 40%{scale:1.25} 100%{scale:1}}
.bt-b.glow{animation:bt-glow 1s ease-in-out infinite; z-index:2}
@keyframes bt-glow{50%{scale:1.15; box-shadow:0 0 0 6px #fff, 0 0 30px 10px rgba(255,255,255,.8)}}

/* ---------- Shade Line-Up ---------- */
.sh-pool{display:grid; grid-template-columns:repeat(var(--cols), 1fr); gap:14px; width:min(100%, calc(var(--cols) * 100px)); margin:0 auto; min-height:80px}
.sh-tile{aspect-ratio:1; padding:0; cursor:pointer; border-radius:20%; transition:translate .15s}
.sh-tile .sh-n{display:grid; place-items:center; min-width:2.2em; height:1.6em; padding:0 .3em; border-radius:999px; background:rgba(255,255,255,.92); color:var(--ink);
  font:700 1.25rem/1 var(--display); box-shadow:0 2px 0 rgba(0,0,0,.2)}
.sh-tile.gone{visibility:hidden; pointer-events:none}
.sh-tile.glow{animation:bt-glow 1s ease-in-out infinite}
.sh-label{display:flex; justify-content:space-between; width:min(100%, 520px); margin:18px auto 6px; font:600 1.1rem var(--display); color:var(--on-table-soft)}
.sh-tray{display:grid; grid-template-columns:repeat(var(--n), 1fr); gap:6px; width:min(100%, 520px); margin:0 auto; padding:10px; border-radius:20px;
  background:rgba(0,0,0,.18); box-shadow:inset 0 4px 10px rgba(0,0,0,.2)}
.sh-slot{aspect-ratio:1; max-height:64px; border-radius:22%; background:rgba(255,255,255,.12); box-shadow:inset 0 0 0 3px rgba(255,255,255,.25)}
.sh-slot.full{background:var(--c); box-shadow:inset 0 -4px 0 rgba(0,0,0,.15), 0 4px 0 var(--d); animation:bounceIn .3s cubic-bezier(.3,1.5,.5,1)}
`);

  register({ id: 'spotdiff', cat: 'looking', order: 3, name: 'Spot the Difference', icon: '🖼️', desc: 'Find what changed between two pictures', gentle: true, start: startSpot });
  register({ id: 'clash', cat: 'looking', order: 4, name: 'Colour Clash', icon: '🎨', desc: 'Tap the colour of the ink, not the word', start: startClash });
  register({ id: 'trail', cat: 'looking', order: 5, name: 'Bubble Trail', icon: '🫧', desc: 'Pop the bubbles in order', start: startTrail });
  register({ id: 'shades', cat: 'looking', order: 6, name: 'Shade Line-Up', icon: '🌈', desc: 'Line up colours from light to dark', start: startShades });

  const btn = (cls, html, fn) => { const b = el('button', 'btn ' + cls, html); b.type = 'button'; b.onclick = fn; return b; };

  /* =========================================================
     SPOT THE DIFFERENCE
     ========================================================= */
  const SCENES = [
    { cls: 'garden', name: 'garden', top: ['☀️', '☁️', '🐦', '🦋', '🎈', '🐝', '🌈'], low: ['🌻', '🌷', '🌳', '🍄', '🐌', '🐞', '🌹', '🐇', '🪴', '🐈', '🏡', '🌼', '🐸', '🦔', '🍓'] },
    { cls: 'seaside', name: 'seaside', top: ['☀️', '☁️', '🕊️', '🪁', '🎈', '✈️', '🌈'], low: ['🐚', '🦀', '⛱️', '🏰', '🪣', '🌴', '🐬', '⛵', '🍦', '⚓', '🐟', '🦭', '🩴', '🐙', '🏐'] },
    { cls: 'kitchen', name: 'kitchen', top: ['🫖', '🕰️', '🪴', '🍯', '🧂', '🥫', '🫙'], low: ['🍎', '🍌', '🥖', '🧀', '☕', '🍳', '🥛', '🍰', '🍪', '🍋', '🍐', '🥕', '🍅', '🍇', '🥚'] },
    { cls: 'living', name: 'living room', top: ['🖼️', '🕰️', '💡', '📻', '🪟', '🎏', '🧭'], low: ['🛋️', '🪑', '📚', '🧶', '🐈', '🐕', '🪴', '📺', '🧸', '🎁', '🕯️', '👞', '☕', '🎩', '🧦'] }
  ];
  // items whose colour change is easy to see
  const RECOLOUR = new Set(['🎈', '🌷', '🌹', '🍄', '🐞', '🍓', '🦋', '🌻', '🪁', '⛱️', '🪣', '🐬', '🍦', '🐟', '🐙', '🍎', '🍋', '🍅', '🍐', '🥕', '🍇', '🧶', '🎁', '🧸', '🧦', '📕', '🫖', '🎏', '🛋️', '🏐']);
  const COLS = 5, ROWS = 4, TOL = .12;

  function makeSpot(L) {
    const d = Math.min(3 + Math.floor((L - 1) / 3), 6);
    const n = Math.min(8 + Math.floor((L - 1) / 2), 13);
    const types = L <= 1 ? ['miss', 'swap'] : L <= 2 ? ['miss', 'swap', 'colour'] : ['miss', 'swap', 'colour', 'move'];
    const sc = pick(SCENES);
    const slot = (c, r) => ({ c, r, x: 8 + (c + .5) / COLS * 84 + (randInt(5) - 2), y: 9 + (r + .5) / ROWS * 82 + (randInt(5) - 2) });
    const topSlots = shuffle([...Array(COLS)].map((_, c) => slot(c, 0)));
    const lowSlots = shuffle([...Array(COLS * (ROWS - 1))].map((_, k) => slot(k % COLS, 1 + Math.floor(k / COLS))));
    const nTop = Math.min(2 + randInt(2), n - 4), nLow = n - nTop;
    const topE = shuffle(sc.top.slice()), lowE = shuffle(sc.low.slice());
    const items = [];
    for (let i = 0; i < nTop; i++) items.push({ e: topE.pop(), top: true, s: topSlots.pop() });
    for (let i = 0; i < nLow; i++) items.push({ e: lowE.pop(), top: false, s: lowSlots.pop() });
    // left and right copies
    const A = items.map(it => ({ e: it.e, x: it.s.x, y: it.s.y, f: '' }));
    const B = items.map(it => ({ e: it.e, x: it.s.x, y: it.s.y, f: '' }));
    const diffs = [];
    shuffle([...items.keys()]).slice(0, d).forEach(i => {
      const it = items[i];
      let t = pick(types);
      if (t === 'colour' && !RECOLOUR.has(it.e)) t = 'swap';
      if (t === 'move' && !(it.top ? topSlots : lowSlots).length) t = 'swap';
      const flip = randInt(2) === 1;           // which picture holds the change
      const [P, Q] = flip ? [A, B] : [B, A];
      const pos = { x: it.s.x, y: it.s.y };
      if (t === 'miss') P[i].e = '';
      else if (t === 'colour') P[i].f = `hue-rotate(${pick([120, 160, 200])}deg) saturate(1.3)`;
      else if (t === 'swap') { const pool = it.top ? topE : lowE; P[i].e = pool.length ? pool.pop() : ''; }
      else {
        const pool = it.top ? topSlots : lowSlots;
        // prefer a free spot that is near the old one so it reads as "moved"
        pool.sort((a, b) => Math.hypot(a.c - it.s.c, a.r - it.s.r) - Math.hypot(b.c - it.s.c, b.r - it.s.r));
        const to = pool.splice(Math.min(pool.length - 1, randInt(2)), 1)[0];
        P[i].x = to.x; P[i].y = to.y;
      }
      diffs.push({ t, a: { x: A[i].x, y: A[i].y }, b: { x: B[i].x, y: B[i].y }, got: false, pos });
    });
    return { sc, A, B, diffs };
  }

  function startSpot(L, api) {
    const pz = makeSpot(L), D = pz.diffs.length;
    let found = 0, mistakes = 0, over = false;
    api.rounds(D, 0);
    api.hint(`These two pictures of a ${pz.sc.name} are nearly the same. Tap ${D} things that are different.`);
    const wrap = el('div', 'sd-wrap'), pics = el('div', 'sd-pics');
    const mk = (list, side) => {
      const p = el('div', 'sd-pic ' + pz.sc.cls); p.setAttribute('role', 'img'); p.setAttribute('aria-label', 'Picture ' + (side === 'a' ? 'one' : 'two'));
      list.forEach(it => { if (!it.e) return; const s = el('span', 'sd-it', it.e); s.style.left = it.x + '%'; s.style.top = it.y + '%'; if (it.f) s.style.filter = it.f; p.append(s); });
      p.addEventListener('click', ev => tap(p, ev));
      p._sd = pz.diffs; return p;
    };
    const pa = mk(pz.A, 'a'), pb = mk(pz.B, 'b');
    pics.append(pa, pb);
    const count = el('span', 'l2-pill', `🔍 Found <b class="sd-c">0</b> of ${D}`);
    const hintB = btn('c-sun', '💡 Hint', () => { sfx.tap(); showHint(); });
    const bar = el('div', 'l2-bar'); bar.append(count, hintB);
    wrap.append(pics, bar); api.stage.append(wrap);

    const ring = (p, at, cls) => { const r = el('span', 'sd-ring' + (cls ? ' ' + cls : '')); r.style.left = at.x + '%'; r.style.top = at.y + '%'; p.append(r); return r; };
    function tap(p, ev) {
      if (over) return;
      const rc = p.getBoundingClientRect();
      const x = (ev.clientX - rc.left) / rc.width * 100, y = (ev.clientY - rc.top) / rc.height * 100;
      const dist = at => Math.hypot((x - at.x) / 100, (y - at.y) / 100 * (rc.height / rc.width));
      let best = null, bd = 1e9;
      pz.diffs.forEach(df => { const m = Math.min(dist(df.a), dist(df.b)); if (m < bd) { bd = m; best = df; } });
      if (best && bd < TOL) {
        if (best.got) return;
        best.got = true; found++;
        pa.querySelectorAll('.sd-ring.hint').forEach(r => r.remove()); pb.querySelectorAll('.sd-ring.hint').forEach(r => r.remove());
        ring(pa, best.a); ring(pb, best.b);
        tone(520 + found * 70, .16, 'triangle', .13); tone(660 + found * 70, .2, 'triangle', .12, .12);
        api.rounds(D, found); count.querySelector('.sd-c').textContent = found;
        if (found === D) {
          over = true; hintB.disabled = true; sfx.good(); api.hint('You found every difference!');
          api.later(() => api.done(starsFor(mistakes, 2, 5)), 900);
        } else { toast(cheer()); api.hint(`Well spotted! ${D - found} more to find.`); }
      } else {
        mistakes++; sfx.soft();
        const m = el('span', 'sd-miss'); m.style.left = x + '%'; m.style.top = y + '%'; p.append(m); api.later(() => m.remove(), 700);
        api.hint('Not quite there. Look at both pictures, bit by bit. The Hint button can help.');
      }
    }
    function showHint() {
      if (over) return;
      const df = pz.diffs.find(x => !x.got); if (!df) return;
      if (!pa.querySelector('.sd-ring.hint')) mistakes++;
      pa.querySelectorAll('.sd-ring.hint').forEach(r => r.remove()); pb.querySelectorAll('.sd-ring.hint').forEach(r => r.remove());
      const r1 = ring(pa, df.a, 'hint'), r2 = ring(pb, df.b, 'hint');
      api.hint('Look inside the flashing circle. What is different? Tap it.');
      api.later(() => { r1.remove(); r2.remove(); }, 5000);
    }
  }

  /* =========================================================
     COLOUR CLASH
     ========================================================= */
  const INKS = [
    { n: 'RED', c: '#FF4D4D', s: '●' },
    { n: 'BLUE', c: '#4FA3FF', s: '★' },
    { n: 'GREEN', c: '#3DDC6E', s: '■' },
    { n: 'YELLOW', c: '#FFD43B', s: '▲' },
    { n: 'PURPLE', c: '#C08CFF', s: '♥' },
    { n: 'ORANGE', c: '#FF9A3C', s: '◆' }
  ];
  function startClash(L, api) {
    const total = 8, k = L <= 1 ? 3 : L <= 3 ? 4 : L <= 6 ? 5 : 6;
    const matchFirst = L <= 1 ? 3 : L === 2 ? 1 : 0;
    const palette = shuffle(INKS.slice()).slice(0, k);
    const order = INKS.filter(c => palette.includes(c));      // keep a stable, familiar order
    let i = 0, mistakes = 0, lastInk = null;
    function round() {
      api.rounds(total, i); api.stage.innerHTML = '';
      const match = i < matchFirst || (L >= 4 && randInt(7) === 0);
      let ink; do ink = pick(order); while (ink === lastInk && order.length > 1); lastInk = ink;
      const word = match ? ink : pick(order.filter(c => c !== ink));
      const opts = L >= 6 ? shuffle(order.slice()) : order;
      api.hint(match && i < matchFirst ? 'What colour is this word painted in? Tap that colour.'
        : i === matchFirst && matchFirst ? 'Now it gets tricky! Tap the colour of the paint, not what the word says.'
          : 'Tap the colour of the paint, not what the word says.');
      const box = el('div', 'cc-box');
      const scr = el('div', 'cc-screen', `<span class="cc-word" style="color:${ink.c}">${word.n}</span><span class="cc-cap">What colour is the paint?</span>`);
      const grid = el('div', 'cc-opts'); grid.style.gridTemplateColumns = `repeat(${k === 4 ? 2 : 3}, 1fr)`;
      let solved = false;
      opts.forEach(c => {
        const b = btn('cc-opt', `<span class="cc-dot">${c.s}</span>${c.n[0] + c.n.slice(1).toLowerCase()}`, () => {
          if (solved) return;
          if (c === ink) {
            solved = true; b.classList.add('right'); sfx.good(); i++;
            if (i % 3 === 0 || i === total) toast(cheer());
            api.later(() => { if (i === total) { api.rounds(total, i); api.done(starsFor(mistakes, 1, 3)); } else round(); }, 1000);
          } else {
            mistakes++; b.classList.add('nope'); sfx.soft(); wob(scr);
            api.hint(c === word && !match ? `The word says ${word.n}, but look at the paint colour. Try again.` : 'Not that one. Look at the colour of the letters.');
          }
        });
        b.style.setProperty('--c', c.c); b.style.setProperty('--d', 'rgba(0,0,0,.35)'); b.setAttribute('aria-label', c.n.toLowerCase());
        b._ink = c.n;
        grid.append(b);
      });
      scr._ink = ink.n;
      box.append(scr, grid); api.stage.append(box);
    }
    round();
  }

  /* =========================================================
     BUBBLE TRAIL
     ========================================================= */
  const ABC = 'ABCDEFGH';
  function trailLabels(L) {
    if (L <= 4) return [...Array(4 + L)].map((_, k) => String(k + 1));      // 5..8 numbers
    const n = Math.min(6 + (L - 5), 12), out = [];
    for (let k = 0; out.length < n; k++) { out.push(String(k + 1)); if (out.length < n) out.push(ABC[k]); }
    return out;
  }
  function placeBubbles(n, g, jit) {
    const cells = shuffle([...Array(g * g).keys()]).slice(0, n);
    const cell = 100 / g;
    // squeeze into 5..95% so bubbles and their shadows never touch the edge
    const m = v => 5 + v * .9;
    return cells.map(c => ({ x: m((c % g + .5) * cell + (Math.random() * 2 - 1) * jit), y: m((Math.floor(c / g) + .5) * cell + (Math.random() * 2 - 1) * jit) }));
  }
  function startTrail(L, api) {
    const total = 2, labels = trailLabels(L), n = labels.length;
    const g = n <= 9 ? 3 : 4, D = g === 3 ? 22 : 17.5, jit = g === 3 ? 2 : 1.2;
    const amp = L >= 6 ? (g === 3 ? 1.5 : 1) : 0;      // gentle float on later levels; spacing keeps them apart
    const alt = labels.includes('A');
    let r = 0, mistakes = 0;
    function board() {
      api.rounds(total, r); api.stage.innerHTML = '';
      const area = el('div', 'bt-area');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'bt-svg'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none');
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline'); svg.append(line); area.append(svg);
      const pos = placeBubbles(n, g, jit);
      let next = 0, miss = 0;
      const path = [];
      const bubbles = labels.map((lab, k) => {
        const b = el('button', 'bt-b ' + (/\d/.test(lab) ? 'num' : 'let'), lab); b.type = 'button';
        b.style.setProperty('--d', D + '%'); b.style.animationDelay = (k * .05) + 's';
        const p = { b, lab, k, hx: pos[k].x, hy: pos[k].y, x: pos[k].x, y: pos[k].y, ph: Math.random() * 6.28, sp: .5 + Math.random() * .4, got: false };
        b.style.left = p.x + '%'; b.style.top = p.y + '%';
        b.onclick = () => hit(p);
        area.append(b); return p;
      });
      area._bt = bubbles;
      const help = el('div', 'l2-bar');
      const hintB = btn('c-sun', '💡 Show me', () => { sfx.tap(); glow(true); });
      help.append(hintB);
      api.stage.append(area, help);
      area.style.setProperty('--dn', D);
      const say = () => api.hint(next === 0
        ? (alt ? 'Pop the bubbles in order: 1, A, 2, B, 3, C… Start with 1.' : `Pop the bubbles in order, from 1 to ${n}. Start with 1.`)
        : `Lovely. Now find ${labels[next]}.`);
      say();
      function glow(cost) {
        bubbles.forEach(p => p.b.classList.remove('glow'));
        const p = bubbles[next]; if (!p) return;
        if (cost) mistakes++;
        p.b.classList.add('glow');
      }
      function hit(p) {
        if (p.got) return;
        if (p.k !== next) {
          mistakes++; miss++; sfx.soft(); wob(p.b);
          api.hint(`That one is ${p.lab}. We need ${labels[next]} next.`);
          if (miss >= 2) glow(false);
          return;
        }
        miss = 0; p.got = true; p.b.classList.remove('glow'); p.b.classList.add('got');
        p.b.textContent = p.lab; path.push(p); next++;
        line.setAttribute('points', path.map(q => q.x.toFixed(2) + ',' + q.y.toFixed(2)).join(' '));
        tone(392 * Math.pow(2, Math.min(next, 14) / 12 * 1.4), .16, 'triangle', .13);
        if (next === n) {
          r++; api.rounds(total, r); sfx.good(); toast(cheer()); hintB.disabled = true;
          api.hint(r === total ? 'All popped. Wonderful!' : 'A whole trail! Here comes another.');
          if (r === total) api.later(() => api.done(starsFor(mistakes, 1, 3)), 800); else api.later(board, 1500);
        } else say();
      }
      if (amp) {
        const t0 = performance.now();
        const step = now => {
          if (!area.isConnected) return;
          const t = (now - t0) / 1000;
          bubbles.forEach(p => {
            if (p.got) return;
            p.x = p.hx + Math.sin(t * p.sp + p.ph) * amp; p.y = p.hy + Math.cos(t * p.sp * .8 + p.ph) * amp;
            p.b.style.left = p.x + '%'; p.b.style.top = p.y + '%';
          });
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }
    board();
  }

  /* =========================================================
     SHADE LINE-UP
     ========================================================= */
  const HUES = [{ h: 25, n: 'red' }, { h: 55, n: 'orange' }, { h: 145, n: 'green' }, { h: 250, n: 'blue' }, { h: 305, n: 'purple' }, { h: 200, n: 'teal' }, { h: 350, n: 'pink' }];
  function shadeSet(L) {
    const n = Math.min(4 + Math.floor(L / 2), 8);
    const LO = .3, HI = .95;
    let step = Math.max(.055, .2 - (L - 1) * .013);
    step = Math.min(step, (HI - LO) / (n - 1));
    const range = step * (n - 1), top = HI - Math.random() * (HI - LO - range);
    return [...Array(n)].map((_, k) => +(top - k * step).toFixed(3));   // lightest first
  }
  function startShades(L, api) {
    const total = 3, nums = L <= 4;
    const hues = shuffle(HUES.slice());
    let r = 0, mistakes = 0;
    function round() {
      api.rounds(total, r); api.stage.innerHTML = '';
      const ls = shadeSet(L), n = ls.length, hu = hues[r % hues.length];
      const col = l => `oklch(${l} ${(.05 + .12 * Math.min(1, (1 - l) * 2.2)).toFixed(3)} ${hu.h})`;
      const edge = l => `oklch(${Math.max(.15, l - .2)} .1 ${hu.h})`;
      let next = 0, miss = 0;
      api.hint(nums ? 'Tap the lightest colour first, then the next lightest, down to the darkest. The numbers go up as it gets darker.'
        : 'Tap the lightest colour first, then the next lightest, all the way to the darkest.');
      const cols = n <= 4 ? 4 : n <= 6 ? 3 : 4;
      const pool = el('div', 'sh-pool'); pool.style.setProperty('--cols', cols);
      const tiles = shuffle(ls.map((l, k) => ({ l, k }))).map(t => {
        const b = el('button', 'tile sh-tile', nums ? `<span class="sh-n">${Math.round((1 - t.l) * 100)}</span>` : '');
        b.type = 'button'; b.style.setProperty('--c', col(t.l)); b.style.setProperty('--d', edge(t.l));
        b.setAttribute('aria-label', 'Shade ' + Math.round((1 - t.l) * 100));
        b._rank = t.k; b.onclick = () => tap(b, t);
        pool.append(b); return b;
      });
      const label = el('div', 'sh-label', '<span>☀️ Lightest</span><span>Darkest 🌑</span>');
      const tray = el('div', 'sh-tray'); tray.style.setProperty('--n', n);
      const slots = ls.map(() => { const s = el('div', 'sh-slot'); tray.append(s); return s; });
      const bar = el('div', 'l2-bar'), hintB = btn('c-sun', '💡 Show me', () => { sfx.tap(); glow(true); });
      bar.append(hintB);
      api.stage.append(pool, label, tray, bar);
      function glow(cost) {
        tiles.forEach(b => b.classList.remove('glow'));
        const b = tiles.find(x => x._rank === next); if (!b) return;
        if (cost) mistakes++;
        b.classList.add('glow');
      }
      function tap(b, t) {
        if (b.classList.contains('gone') || next >= n) return;
        if (t.k !== next) {
          mistakes++; miss++; sfx.soft(); wob(b);
          api.hint(t.k > next ? 'That one is a bit too dark. Find a lighter one.' : 'Try another one.');
          if (miss >= 2) glow(false);
          return;
        }
        miss = 0; b.classList.remove('glow'); b.classList.add('gone');
        const s = slots[next]; s.style.setProperty('--c', col(t.l)); s.style.setProperty('--d', edge(t.l)); s.classList.add('full');
        tone(330 * Math.pow(2, next * 2 / 12), .15, 'triangle', .13);
        next++;
        if (next === n) {
          r++; api.rounds(total, r); sfx.good(); toast(cheer()); hintB.disabled = true;
          api.hint(r === total ? 'All lined up. Beautiful!' : 'Lovely line-up! Here comes another colour.');
          if (r === total) api.later(() => api.done(starsFor(mistakes, 1, 3)), 900); else api.later(round, 1600);
        } else if (next === 1) api.hint('Good. Now the next lightest.');
      }
    }
    round();
  }
})();
