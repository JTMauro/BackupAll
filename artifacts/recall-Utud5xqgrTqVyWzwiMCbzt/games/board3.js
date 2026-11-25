/* Recall: more board games against a friendly computer (cat 'cards', orders 20-23).
   Mancala, Chinese Checkers, Backgammon, Chess. Prefix: .b3- */
(function () {
  const { register, el, randInt, pick, wob, tone, sfx, toast, cheer } = R;
  // Test hook: when window.__b3auto is set, the computer also plays the player's side (through the same tap handlers).
  const AUTO = () => !!window.__b3auto;

  R.css(`
.b3-wrap{display:flex; flex-direction:column; align-items:center; gap:12px; width:100%; max-width:460px; margin:0 auto; color:var(--on-table)}
.b3-score{display:flex; align-items:center; justify-content:center; gap:8px 10px; flex-wrap:wrap; font:600 1.05rem/1.1 var(--display)}
.b3-chip{display:inline-flex; align-items:center; gap:8px; background:rgba(0,0,0,.22); padding:5px 14px 5px 5px; border-radius:999px; transition:background .25s, box-shadow .25s}
.b3-chip.on{background:rgba(255,255,255,.2); box-shadow:0 0 0 3px #fff}
.b3-chip b{font-size:1.3rem}
.b3-ball{--s:34px; width:var(--s); height:var(--s); border-radius:50%; display:grid; place-items:center; flex:none; color:#fff;
  font:700 calc(var(--s) * .5)/1 var(--display); text-shadow:0 1px 0 rgba(0,0,0,.35);
  background:radial-gradient(circle at 34% 28%, rgba(255,255,255,.8) 0 9%, rgba(255,255,255,0) 38%), radial-gradient(circle at 50% 58%, var(--c) 0 52%, var(--d) 100%);
  box-shadow:0 3px 0 var(--d), 0 5px 8px rgba(0,0,0,.35)}
.b3-bar{display:flex; gap:10px; justify-content:center; align-items:center; flex-wrap:wrap}
.b3-bar .btn{min-height:58px; padding:.6em .95em}
.btn.b3-off{opacity:.4; pointer-events:none}
.btn.b3-go{animation:b3-pulse .7s ease-in-out infinite alternate}
@keyframes b3-pulse{to{transform:scale(1.08)}}
@keyframes b3-glow{from{box-shadow:0 0 0 3px #fff, 0 0 6px 2px rgba(255,255,255,.5)} to{box-shadow:0 0 0 4px #fff, 0 0 16px 6px rgba(255,255,255,.85)}}
@keyframes b3-drop{from{transform:translateY(-14px) scale(1.35); opacity:.2}}
@keyframes b3-slide{from{transform:translate(var(--dx), var(--dy))}}
@keyframes b3-land{from{transform:translateY(-12px) scale(1.18)}}
@keyframes b3-flash{50%{filter:brightness(1.6)}}

/* mancala */
.b3-mc{display:grid; gap:9px; width:min(100%, 430px); padding:11px; border-radius:28px; container-type:inline-size;
  background:linear-gradient(165deg, #C2834F, #8A5530 55%, #5A361C);
  box-shadow:inset 0 -6px 0 rgba(0,0,0,.25), inset 0 3px 0 rgba(255,255,255,.25), 0 9px 0 var(--wood-d), 0 18px 26px rgba(0,0,0,.4)}
.b3-row{display:grid; grid-template-columns:repeat(6, 1fr); gap:6px}
.b3-pit, .b3-store{position:relative; border:0; padding:0; cursor:pointer; color:var(--ink);
  background:radial-gradient(ellipse at 50% 38%, #3E2412 0 35%, #64391D 80%);
  box-shadow:inset 0 7px 10px rgba(0,0,0,.6), inset 0 -2px 0 rgba(255,255,255,.18), 0 2px 0 rgba(255,255,255,.22)}
.b3-pit{aspect-ratio:1 / 1.15; min-height:56px; border-radius:46%}
.b3-store{height:clamp(58px, 16cqw, 74px); border-radius:38px; cursor:default}
.b3-store .b3-lab{position:absolute; top:50%; translate:0 -50%; font:600 1rem/1 var(--display); color:rgba(255,255,255,.55); pointer-events:none}
.b3-st{position:absolute; width:3.9cqw; aspect-ratio:1; border-radius:50%; translate:-50% -50%;
  background:radial-gradient(circle at 35% 30%, rgba(255,255,255,.85) 0 12%, rgba(255,255,255,0) 45%), radial-gradient(circle at 50% 60%, var(--c) 0 50%, var(--d) 100%);
  box-shadow:0 2px 2px rgba(0,0,0,.5)}
.b3-st.new{animation:b3-drop .3s cubic-bezier(.3,1.5,.5,1)}
.b3-n{position:absolute; right:-5px; bottom:-7px; min-width:30px; height:30px; padding:0 6px; border-radius:15px; z-index:2;
  background:var(--card); color:var(--ink); font:700 1.1rem/30px var(--display); text-align:center; box-shadow:0 3px 0 var(--card-edge), 0 4px 6px rgba(0,0,0,.3)}
.b3-store .b3-n{right:12px; bottom:auto; top:50%; translate:0 -50%; min-width:40px; height:40px; font-size:1.4rem; line-height:40px; border-radius:20px}
.b3-store.cpu .b3-n{right:auto; left:12px}
.b3-store.you .b3-lab{left:16px} .b3-store.cpu .b3-lab{right:16px}
.b3-pit.b3-play{animation:b3-glow .7s ease-in-out infinite alternate}
.b3-pit.hot, .b3-store.hot{animation:b3-flash .35s}
.b3-pit.capt{box-shadow:inset 0 0 0 4px var(--sun), inset 0 7px 10px rgba(0,0,0,.6), 0 0 16px 4px rgba(255,194,52,.8)}
.b3-pit.hand{box-shadow:inset 0 0 0 4px #fff, inset 0 7px 10px rgba(0,0,0,.6)}
.b3-mc .b3-who{display:flex; justify-content:space-between; font:600 .95rem/1 var(--display); color:rgba(255,255,255,.75); padding:0 6px}

/* chinese checkers */
.b3-cc{position:relative; width:min(100%, 420px); container-type:inline-size; cursor:pointer; touch-action:manipulation; -webkit-tap-highlight-color:transparent}
.b3-cc svg{position:absolute; inset:0; width:100%; height:100%; overflow:visible; pointer-events:none}
.b3-hole, .b3-mb, .b3-mk{position:absolute; translate:-50% -50%; border-radius:50%; pointer-events:none}
.b3-hole{width:calc(var(--u) * .46); aspect-ratio:1; background:#4A2B15; box-shadow:inset 0 2px 3px rgba(0,0,0,.6), 0 1px 0 rgba(255,255,255,.3)}
.b3-hole.ty{box-shadow:0 0 0 2px var(--sky), inset 0 2px 3px rgba(0,0,0,.6)}
.b3-hole.tc{box-shadow:0 0 0 2px var(--coral), inset 0 2px 3px rgba(0,0,0,.6)}
.b3-mb{--s:calc(var(--u) * .88); z-index:3; transition:left .2s ease-in-out, top .2s ease-in-out}
.b3-mb.b3-ball{font-size:calc(var(--u) * .45)}
.b3-mb.can{animation:b3-glow .7s ease-in-out infinite alternate}
.b3-mb.sel{z-index:5; transform:scale(1.18); box-shadow:0 0 0 4px #fff, 0 0 18px 6px rgba(255,255,255,.9), 0 8px 10px rgba(0,0,0,.45)}
.b3-mb.hintm{box-shadow:0 0 0 4px var(--sun), 0 0 16px 6px rgba(255,194,52,.9)}
.b3-mb.moving{z-index:6}
.b3-mk{width:calc(var(--u) * .5); aspect-ratio:1; z-index:4; background:rgba(255,255,255,.9); box-shadow:0 0 0 3px rgba(255,255,255,.4), 0 0 12px 4px rgba(255,255,255,.7); animation:b3-pulse .6s ease-in-out infinite alternate}
.b3-mk.hop{background:var(--sun); box-shadow:0 0 0 3px rgba(255,194,52,.5), 0 0 14px 5px rgba(255,194,52,.85)}
.b3-mk.hintm{background:var(--sun); outline:3px solid #fff}

/* backgammon */
.b3-bg{display:grid; grid-template-columns:repeat(6, 1fr) .8fr repeat(6, 1fr) 1.1fr; grid-template-rows:1fr 4% 1fr; width:min(100%, 420px); aspect-ratio:1.22;
  padding:8px; border-radius:16px; container-type:inline-size; background:linear-gradient(160deg, #A86E40, #5A361C);
  box-shadow:inset 0 -5px 0 rgba(0,0,0,.25), 0 8px 0 var(--wood-d), 0 16px 24px rgba(0,0,0,.35)}
.b3-pt{position:relative; border:0; padding:0 4%; margin:0; display:flex; flex-direction:column; align-items:center; background:#2E6B45; cursor:pointer; min-width:0; overflow:visible}
.b3-pt.bot{flex-direction:column-reverse}
.b3-pt::before{content:""; position:absolute; inset:0 6%; background:var(--tc); clip-path:polygon(0 0, 100% 0, 50% 86%)}
.b3-pt.bot::before{clip-path:polygon(0 100%, 100% 100%, 50% 14%)}
.b3-pt.a{--tc:#F3E2BF} .b3-pt.b{--tc:#C9934B}
.b3-felt{background:#2E6B45}
.b3-mid{grid-row:2; background:#2E6B45}
.b3-barc{grid-column:7; grid-row:1 / 4; display:flex; flex-direction:column; justify-content:space-between; align-items:center; padding:4px 3%; border:0; cursor:pointer;
  background:linear-gradient(90deg, #6B4122, #8A5530 50%, #6B4122); box-shadow:inset 0 0 6px rgba(0,0,0,.5)}
.b3-tray{grid-column:14; grid-row:1 / 4; display:flex; flex-direction:column; justify-content:space-between; align-items:center; margin-left:5px; padding:5px 3px; border:0; border-radius:8px; cursor:pointer;
  background:#3E2412; box-shadow:inset 0 3px 6px rgba(0,0,0,.6); color:#fff; font:700 1.1rem/1 var(--display)}
.b3-tray .b3-offs{display:flex; flex-direction:column; gap:1px; width:100%; align-items:center}
.b3-tray .b3-offs.y{flex-direction:column-reverse}
.b3-slab{width:86%; height:.9cqw; min-height:3px; border-radius:2px; background:var(--c); box-shadow:0 1px 0 var(--d)}
.b3-ck{position:relative; z-index:1; width:100%; aspect-ratio:1; flex:none; border-radius:50%; display:grid; place-items:center; color:#fff;
  font:700 3.3cqw/1 var(--display); text-shadow:0 1px 0 rgba(0,0,0,.35);
  background:radial-gradient(circle at 34% 28%, rgba(255,255,255,.75) 0 9%, rgba(255,255,255,0) 38%), radial-gradient(circle, var(--c) 0 56%, var(--d) 58% 64%, var(--c) 66%);
  box-shadow:inset 0 -2px 0 rgba(0,0,0,.2), 0 2px 0 var(--d), 0 3px 4px rgba(0,0,0,.45)}
.b3-ck.big{font-size:4.2cqw}
.b3-ck.can{animation:b3-glow .7s ease-in-out infinite alternate; z-index:2}
.b3-ck.sel{z-index:3; transform:scale(1.15); box-shadow:0 0 0 3px #fff, 0 0 14px 5px rgba(255,255,255,.9)}
.b3-ck.land{animation:b3-land .3s cubic-bezier(.3,1.5,.5,1)}
.b3-dot{position:relative; z-index:2; width:80%; aspect-ratio:1; flex:none; margin:10%; border-radius:50%; background:rgba(255,255,255,.92); box-shadow:0 0 0 3px rgba(255,255,255,.4), 0 0 12px 4px rgba(255,255,255,.8); animation:b3-pulse .6s ease-in-out infinite alternate}
.b3-tray.dest{box-shadow:inset 0 0 0 3px #fff, 0 0 14px 4px rgba(255,255,255,.8)}
.b3-tray.dest .b3-offs.y::before{content:""; width:70%; aspect-ratio:1; border-radius:50%; background:rgba(255,255,255,.92); animation:b3-pulse .6s ease-in-out infinite alternate}
.b3-dice{display:flex; gap:10px; align-items:center; min-height:62px}
.b3-die{width:56px; height:56px; display:grid; grid-template:repeat(3, 1fr) / repeat(3, 1fr); padding:9px; border-radius:22%;
  background:linear-gradient(150deg, #fff 30%, #EFE4CC); box-shadow:inset 0 -5px 0 rgba(0,0,0,.08), 0 5px 0 #CDBB97, 0 9px 12px rgba(0,0,0,.3); transition:opacity .3s, transform .3s}
.b3-die.sm{width:46px; height:46px; padding:7px}
.b3-die i{width:76%; height:76%; margin:auto; border-radius:50%; background:radial-gradient(circle at 40% 35%, #5A6772, #18242C 70%); visibility:hidden}
.b3-die i.on{visibility:visible}
.b3-die.cpu i{background:radial-gradient(circle at 40% 35%, #FF9C86, var(--coral-d) 70%)}
.b3-die.used{opacity:.3; transform:scale(.85)}
.b3-die.roll{animation:b3-roll .55s ease-out}
@keyframes b3-roll{0%{transform:translateY(-26px) rotate(-200deg) scale(.7)} 60%{transform:translateY(4px) rotate(10deg)} 100%{transform:none}}

/* chess */
.b3-ch{display:grid; grid-template-columns:repeat(8, 1fr); width:min(100%, 420px); padding:9px; border-radius:16px; container-type:inline-size;
  background:linear-gradient(160deg, #A86E40, #5A361C); box-shadow:inset 0 -5px 0 rgba(0,0,0,.25), 0 8px 0 var(--wood-d), 0 16px 24px rgba(0,0,0,.35)}
.b3-sq{position:relative; aspect-ratio:1; border:0; padding:0; display:grid; place-items:center; background:#F6E7C8; cursor:pointer; min-width:0}
.b3-sq.dk{background:#5E9C76}
.b3-sq.last{background:#FFE27A} .b3-sq.dk.last{background:#C9C24E}
.b3-sq.chk{background:radial-gradient(circle, #FF6B4A 0 40%, #F6E7C8 75%)} .b3-sq.dk.chk{background:radial-gradient(circle, #FF6B4A 0 40%, #5E9C76 75%)}
.b3-pc{display:grid; place-items:center; width:100%; height:100%; font:400 calc(100cqw / 8 * .74)/1 'DejaVu Sans', 'Segoe UI Symbol', 'Noto Sans Symbols 2', 'Apple Symbols', serif; pointer-events:none; user-select:none}
.b3-pc.w{color:#FFF9EF; -webkit-text-stroke:1.2px #18242C; text-shadow:0 2px 0 #18242C, 0 4px 5px rgba(0,0,0,.45)}
.b3-pc.k{color:#22303A; -webkit-text-stroke:.6px #000; text-shadow:0 2px 0 rgba(255,255,255,.35), 0 4px 5px rgba(0,0,0,.45)}
.b3-pc.slide{animation:b3-slide .32s ease-out; position:relative; z-index:3}
.b3-pc.land{animation:b3-land .3s cubic-bezier(.3,1.5,.5,1)}
.b3-sq.sel{box-shadow:inset 0 0 0 4px #fff, inset 0 0 14px 4px rgba(255,255,255,.8)}
.b3-sq.sel .b3-pc{transform:translateY(-4px) scale(1.12)}
.b3-sq.dest::after{content:""; position:absolute; width:34%; height:34%; border-radius:50%; background:rgba(255,255,255,.88); box-shadow:0 0 0 3px rgba(24,36,44,.25), 0 0 10px 3px rgba(255,255,255,.6); animation:b3-pulse .6s ease-in-out infinite alternate}
.b3-sq.dest.cap::after{width:88%; height:88%; background:none; box-shadow:inset 0 0 0 5px rgba(255,194,52,.95), 0 0 10px 3px rgba(255,194,52,.6)}
.b3-sq.hintsq{box-shadow:inset 0 0 0 5px var(--sun), inset 0 0 16px 6px rgba(255,194,52,.85)}
.b3-ch .b3-pc.w.mine{cursor:pointer}
`);

  const YOU = { c: 'sky', s: '★' }, CPU = { c: 'coral', s: '●' };
  const ball = (who, size, extra = '') => `<span class="b3-ball c-${who.c} ${extra}" style="--s:${size}px">${who.s}</span>`;
  function button(label, cls, fn) { const b = el('button', 'btn ' + cls, label); b.type = 'button'; b.onclick = fn; return b; }
  function finisher(api) {
    let doneYet = false;
    return (stars, ms = 1800) => { if (doneYet) return; doneYet = true; api.stage.dataset.turn = 'over'; api.later(() => api.done(stars), ms); };
  }
  function scoreRow(iy, ic, ny = 'You', nc = 'Computer') {
    const row = el('div', 'b3-score');
    const a = el('span', 'b3-chip', `${iy}<span>${ny}</span><b>0</b>`), b = el('span', 'b3-chip', `${ic}<span>${nc}</span><b>0</b>`);
    row.append(a, b);
    return {
      el: row,
      set(y, c) { a.querySelector('b').textContent = y; b.querySelector('b').textContent = c; },
      turn(t) { a.classList.toggle('on', t === 'you'); b.classList.toggle('on', t === 'cpu'); }
    };
  }
  const noisy = (n) => (Math.random() - .5) * 2 * n;

  register({ id: 'mancala', cat: 'cards', order: 20, name: 'Mancala', icon: '🫘', desc: 'Sow stones round the board into your store', gentle: true, start: startMancala });
  register({ id: 'chinesechk', cat: 'cards', order: 21, name: 'Chinese Checkers', icon: '✡️', desc: 'Hop your marbles across the star', start: startChinese });
  register({ id: 'backgammon', cat: 'cards', order: 22, name: 'Backgammon', icon: '🎲', desc: 'Roll and race your checkers home', start: startBackgammon });
  register({ id: 'chess', cat: 'cards', order: 23, name: 'Chess', icon: '♞', desc: 'A gentle game of chess with Undo and Hints', start: startChess });

  /* =========================================================
     MANCALA (Kalah rules). Pits 0-5 yours (bottom, left to right), 6 your store,
     7-12 computer's (top, right to left), 13 computer's store.
     ========================================================= */
  const kSum = (b, side) => side === 0 ? b[0] + b[1] + b[2] + b[3] + b[4] + b[5] : b[7] + b[8] + b[9] + b[10] + b[11] + b[12];
  const kMoves = (b, side) => [0, 1, 2, 3, 4, 5].map(i => side === 0 ? i : i + 7).filter(i => b[i] > 0);
  function kSow(b, i) {
    const n = b.slice(), side = i < 6 ? 0 : 1, skip = side === 0 ? 13 : 6, store = side === 0 ? 6 : 13, path = [];
    let k = n[i], p = i; n[i] = 0;
    while (k) { p = (p + 1) % 14; if (p === skip) continue; n[p]++; k--; path.push(p); }
    const extra = p === store; let cap = 0;
    const ownPit = side === 0 ? p < 6 : p > 6 && p < 13;
    if (!extra && ownPit && n[p] === 1 && n[12 - p] > 0) { cap = n[12 - p] + 1; n[store] += cap; n[p] = 0; n[12 - p] = 0; }
    return { b: n, path, last: p, extra, cap };
  }
  const kOver = b => kSum(b, 0) === 0 || kSum(b, 1) === 0;
  function kSweep(b) { const n = b.slice(); n[6] += kSum(b, 0); n[13] += kSum(b, 1); for (let i = 0; i < 13; i++) if (i !== 6) n[i] = 0; return n; }
  function kSearch(b, side, d) { // value for the computer (side 1)
    if (kOver(b)) { const f = kSweep(b); return (f[13] - f[6]) * 4; }
    if (d <= 0) return b[13] - b[6];
    let best = side ? -Infinity : Infinity;
    for (const m of kMoves(b, side)) {
      const r = kSow(b, m), v = kSearch(r.b, r.extra ? side : 1 - side, d - 1);
      best = side ? Math.max(best, v) : Math.min(best, v);
    }
    return best;
  }
  function kChoose(b, side, L) {
    const depth = L <= 1 ? 1 : L <= 3 ? 2 : L <= 6 ? 3 : 5;
    const rnd = Math.max(0, .45 - .08 * (L - 1)), noise = Math.max(.25, 2.6 - .3 * L);
    const ms = kMoves(b, side);
    if (Math.random() < rnd) return pick(ms);
    let best = -Infinity, m = ms[0];
    for (const x of ms) {
      const r = kSow(b, x);
      const v = (side ? 1 : -1) * kSearch(r.b, r.extra ? side : 1 - side, depth - 1) + (r.extra ? .8 : 0) + noisy(noise);
      if (v > best) { best = v; m = x; }
    }
    return m;
  }

  function startMancala(L, api) {
    const S = L <= 1 ? 3 : 4;
    let b = Array(14).fill(S); b[6] = b[13] = 0;
    let turn = 'none', undos = 0;
    const stack = [], finish = finisher(api);
    const score = scoreRow(ball(YOU, 34), ball(CPU, 34));
    const board = el('div', 'b3-mc');
    const pits = [];
    const mkPit = i => { const p = el('button', 'b3-pit'); p.type = 'button'; p.onclick = () => tap(i); pits[i] = p; return p; };
    const storeC = el('div', 'b3-store cpu', '<span class="b3-lab">● Computer’s store</span>'), storeY = el('div', 'b3-store you', '<span class="b3-lab">Your store ★</span>');
    pits[13] = storeC; pits[6] = storeY;
    const rowC = el('div', 'b3-row'), rowY = el('div', 'b3-row');
    for (let i = 12; i >= 7; i--) rowC.append(mkPit(i));
    for (let i = 0; i < 6; i++) rowY.append(mkPit(i));
    board.append(storeC, rowC, rowY, storeY);
    const undoBtn = button('↶ Undo', 'c-card', undo);
    const bar = el('div', 'b3-bar'); bar.append(undoBtn);
    const wrap = el('div', 'b3-wrap'); wrap.append(score.el, board, bar); api.stage.append(wrap);
    const COLS = ['coral', 'sun', 'leaf', 'sky', 'berry', 'grape', 'orange', 'mint'];
    const hash = x => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

    function renderPit(i, fresh) {
      const p = pits[i], n = b[i], isStore = i === 6 || i === 13;
      p.querySelectorAll('.b3-st, .b3-n').forEach(x => x.remove());
      const vis = Math.min(n, isStore ? 40 : 15);
      let h = '';
      for (let k = 0; k < vis; k++) {
        let x, y;
        if (isStore) { x = (i === 13 ? 28 : 8) + hash(k + 1) * 62; y = 24 + hash(k + 50) * 52; }
        else { const a = k * 2.39996, rad = 33 * Math.sqrt((k + .4) / 15); x = 50 + rad * Math.cos(a); y = 48 + rad * Math.sin(a) * .95; }
        const c = COLS[(k * 5 + i * 3) % 8];
        h += `<span class="b3-st c-${c}${fresh && k === vis - 1 ? ' new' : ''}" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%"></span>`;
      }
      p.insertAdjacentHTML('beforeend', h + `<span class="b3-n">${n}</span>`);
      p.setAttribute('aria-label', (i < 6 ? 'Your pit, ' : i === 6 ? 'Your store, ' : i === 13 ? 'Computer’s store, ' : 'Computer’s pit, ') + n + ' stones');
    }
    function render() {
      for (let i = 0; i < 14; i++) renderPit(i);
      const can = turn === 'you' ? new Set(kMoves(b, 0)) : new Set();
      for (let i = 0; i < 6; i++) pits[i].classList.toggle('b3-play', can.has(i));
      score.set(b[6], b[13]); score.turn(turn);
      undoBtn.classList.toggle('b3-off', !(turn === 'you' && stack.length > 1));
      api.stage.dataset.turn = turn;
    }
    function yourTurn(msg) {
      turn = 'you'; stack.push(b.slice()); render();
      api.hint((msg ? msg + ' ' : '') + 'Your turn. Tap a glowing pit on the bottom row. Stones go round to the right, one in each pit, then into your store.');
      if (AUTO()) api.later(() => tap(kChoose(b, 0, 4)), 150);
    }
    function tap(i) {
      if (turn !== 'you') return;
      if (i > 5 || i === 6) return;
      if (!b[i]) { sfx.soft(); wob(pits[i]); api.hint('That pit is empty. Pick a pit with stones in it.'); return; }
      sfx.tap(); sow(i, 0);
    }
    function sow(i, side) {
      turn = side ? 'cpu-move' : 'you-move'; render();
      const r = kSow(b, i);
      b[i] = 0; renderPit(i); pits[i].classList.add('hand');
      const spd = Math.max(130, 280 - r.path.length * 10);
      let j = 0;
      const step = () => {
        const q = r.path[j]; b[q]++; renderPit(q, true);
        pits[q].classList.remove('hot'); void pits[q].offsetWidth; pits[q].classList.add('hot');
        tone(392 * Math.pow(2, Math.min(j, 14) / 12), .09, 'triangle', .09);
        j++;
        if (j < r.path.length) api.later(step, spd);
        else api.later(() => { pits[i].classList.remove('hand'); after(r, side); }, 320);
      };
      api.later(step, 220);
    }
    function after(r, side) {
      let msg = '';
      if (r.cap) {
        const p = r.last;
        pits[p].classList.add('capt'); pits[12 - p].classList.add('capt');
        tone(660, .1, 'triangle', .12); api.later(() => tone(880, .14, 'triangle', .1), 100);
        if (!side) toast(cheer() + ' +' + r.cap);
        api.later(() => { pits[p].classList.remove('capt'); pits[12 - p].classList.remove('capt'); b = r.b; render(); next(); }, 750);
        msg = side ? `The computer captured ${r.cap} stones.` : `You captured ${r.cap} stones!`;
      } else { b = r.b; render(); next(); }
      function next() {
        if (kOver(b)) return end();
        if (r.extra) {
          if (!side) { sfx.good(); yourTurn('Landed in your store, so you get another go!'); }
          else cpuTurn((msg ? msg + ' ' : '') + 'The computer landed in its store, so it goes again…');
        } else if (side) yourTurn(msg || 'The computer has moved.');
        else cpuTurn(msg);
      }
    }
    function cpuTurn(pre) {
      turn = 'cpu'; render(); api.hint((pre ? pre + ' ' : '') + 'The computer is choosing a pit…');
      api.later(() => sow(kChoose(b, 1, L), 1), 1100);
    }
    function undo() {
      if (turn !== 'you' || stack.length < 2) return;
      sfx.tap(); undos++; stack.pop(); b = stack.pop(); yourTurn('Taken back.');
    }
    function end() {
      turn = 'over';
      const leftY = kSum(b, 0), leftC = kSum(b, 1);
      b = kSweep(b); render();
      const tail = leftY || leftC ? (leftY ? ' Your last stones go into your store.' : ' The computer’s last stones go into its store.') : '';
      if (b[6] > b[13]) { sfx.good(); toast(cheer()); api.hint(`One side is empty, so the game ends.${tail} You win, ${b[6]} to ${b[13]}!`); finish(undos <= 1 ? 3 : 2); }
      else if (b[6] < b[13]) { sfx.soft(); api.hint(`One side is empty, so the game ends.${tail} The computer wins ${b[13]} to ${b[6]}. Lovely game, though!`); finish(1); }
      else { api.hint(`The game ends.${tail} It’s a draw, ${b[6]} each!`); finish(2); }
    }
    yourTurn(S === 3 ? 'Three stones in each pit to start.' : '');
  }

  /* =========================================================
     CHINESE CHECKERS (two players on a star board)
     ========================================================= */
  const CC_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
  const ccCache = {};
  function ccGeom(n) {
    if (ccCache[n]) return ccCache[n];
    const cells = [], idx = new Map();
    for (let r = -2 * n; r <= 2 * n; r++) for (let q = -2 * n; q <= 2 * n; q++) {
      const x = q, z = r, y = -q - r;
      if ((x >= -n && y >= -n && z >= -n) || (x <= n && y <= n && z <= n)) { idx.set(q + ',' + r, cells.length); cells.push({ q, r, px: q + r / 2, py: r * .8660254 }); }
    }
    const nb = cells.map(c => CC_DIRS.map(([dq, dr]) => { const k = idx.get((c.q + dq) + ',' + (c.r + dr)); return k === undefined ? -1 : k; }));
    const W = 3 * n + 1, H = 4 * n * .8660254 + 1, minPx = -1.5 * n, minPy = -2 * n * .8660254;
    const g = { n, cells, nb, W, H, X: c => c.px - minPx + .5, Y: c => c.py - minPy + .5 };
    g.top = cells.map((c, i) => i).filter(i => cells[i].r < -n);
    g.bot = cells.map((c, i) => i).filter(i => cells[i].r > n);
    return (ccCache[n] = g);
  }
  function ccDests(G, pos, c) {
    const res = new Map();
    for (let d = 0; d < 6; d++) { const a = G.nb[c][d]; if (a >= 0 && !pos[a]) res.set(a, { path: [c, a], hop: false }); }
    const seen = new Set([c]), queue = [[c, [c]]];
    while (queue.length) {
      const [x, path] = queue.shift();
      for (let d = 0; d < 6; d++) {
        const o = G.nb[x][d]; if (o < 0 || !pos[o] || o === c) continue;
        const l = G.nb[o][d]; if (l < 0 || pos[l] || seen.has(l)) continue;
        seen.add(l); const p2 = path.concat(l);
        if (!res.has(l)) res.set(l, { path: p2, hop: true });
        queue.push([l, p2]);
      }
    }
    return res;
  }
  function ccMoves(G, pos, s) {
    const out = [];
    for (let c = 0; c < pos.length; c++) if (pos[c] === s) for (const [t, v] of ccDests(G, pos, c)) out.push({ f: c, t, path: v.path, hop: v.hop });
    return out;
  }
  function ccCost(G, c, s) { // lower is better
    const cell = G.cells[c], d = s === 1 ? cell.r + 2 * G.n : 2 * G.n - cell.r;
    return d + .02 * d * d + .3 * Math.abs(cell.px);
  }
  function ccGain(G, m, s) { return ccCost(G, m.f, s) - ccCost(G, m.t, s); }
  function ccChoose(G, pos, s, L, last) {
    const ms = ccMoves(G, pos, s);
    if (!ms.length) return null;
    const rnd = Math.max(0, .3 - .05 * L), noise = Math.max(.15, 2 - .25 * L);
    const fwd = ms.filter(m => ccGain(G, m, s) > .5);
    if (fwd.length && Math.random() < rnd) return pick(fwd);
    let best = -Infinity, bm = ms[0];
    for (const m of ms) {
      let v = ccGain(G, m, s) + noisy(noise);
      if (last && m.f === last.t && m.t === last.f) v -= 2;
      if (L >= 4) {
        pos[m.f] = 0; pos[m.t] = s;
        let b2 = 0; for (const m2 of ccMoves(G, pos, s)) b2 = Math.max(b2, ccGain(G, m2, s));
        pos[m.t] = 0; pos[m.f] = s;
        v += .5 * b2;
      }
      if (v > best) { best = v; bm = m; }
    }
    return bm;
  }
  function ccWon(G, pos, s) {
    const T = s === 1 ? G.top : G.bot;
    return T.every(i => pos[i]) && T.some(i => pos[i] === s);
  }

  function startChinese(L, api) {
    const n = L <= 2 ? 3 : 4, G = ccGeom(n), K = G.top.length;
    let pos = Array(G.cells.length).fill(0);
    G.bot.forEach(i => { pos[i] = 1; }); G.top.forEach(i => { pos[i] = -1; });
    let turn = 'none', sel = null, dests = null, undos = 0, plies = 0, hintM = null;
    const lastM = { 1: null, '-1': null };
    const stack = [], finish = finisher(api), CAP = n === 3 ? 220 : 320;
    const score = scoreRow(ball(YOU, 34), ball(CPU, 34));
    const board = el('div', 'b3-cc');
    board.style.aspectRatio = `${G.W} / ${G.H}`;
    board.style.setProperty('--u', `calc(100cqw / ${G.W})`);
    // star background
    const cube = (x, y, z) => ({ px: x + z / 2, py: z * .8660254 });
    const N = n, tips = [[2 * N, -N, -N], [N, N, -2 * N], [-N, 2 * N, -N], [-2 * N, N, N], [-N, -N, 2 * N], [N, -2 * N, N]];
    const inner = [[N, 0, -N], [0, N, -N], [-N, N, 0], [-N, 0, N], [0, -N, N], [N, -N, 0]];
    const pts = [];
    const XY = p => `${(p.px + 1.5 * n + .5).toFixed(2)},${(p.py + 2 * n * .8660254 + .5).toFixed(2)}`;
    for (let k = 0; k < 6; k++) { pts.push(XY(cube(...tips[k]))); pts.push(XY(cube(...inner[k]))); }
    const tri = (t, a, b2) => [t, a, b2].map(v => XY(cube(...v))).join(' ');
    const poly = pts.join(' ');
    board.innerHTML = `<svg viewBox="0 0 ${G.W} ${G.H}" preserveAspectRatio="none">
      <polygon points="${poly}" transform="translate(0 .35)" fill="#4A2B15" stroke="#4A2B15" stroke-width="1.6" stroke-linejoin="round"/>
      <polygon points="${poly}" fill="#B87A48" stroke="#B87A48" stroke-width="1.5" stroke-linejoin="round"/>
      <polygon points="${tri(tips[1], inner[0], inner[1])}" fill="var(--sky)" opacity=".35" stroke="var(--sky)" stroke-opacity=".35" stroke-width=".9" stroke-linejoin="round"/>
      <polygon points="${tri(tips[4], inner[3], inner[4])}" fill="var(--coral)" opacity=".35" stroke="var(--coral)" stroke-opacity=".35" stroke-width=".9" stroke-linejoin="round"/>
    </svg>`;
    const at = (e, c) => { e.style.left = (G.X(G.cells[c]) / G.W * 100) + '%'; e.style.top = (G.Y(G.cells[c]) / G.H * 100) + '%'; };
    G.cells.forEach((c, i) => { const h = el('span', 'b3-hole' + (c.r < -n ? ' ty' : c.r > n ? ' tc' : '')); at(h, i); board.append(h); });
    const marbles = [];
    pos.forEach((s, i) => { if (s) { const m = { s, cell: i, el: el('span', `b3-mb b3-ball c-${s === 1 ? YOU.c : CPU.c}`, s === 1 ? YOU.s : CPU.s) }; at(m.el, i); board.append(m.el); marbles.push(m); } });
    const mkLayer = el('div'); board.append(mkLayer);
    board.onclick = e => {
      if (turn !== 'you') return;
      const rc = board.getBoundingClientRect();
      const x = (e.clientX - rc.left) / rc.width * G.W, y = (e.clientY - rc.top) / rc.height * G.H;
      const cands = new Set(movable());
      if (dests) for (const t of dests.keys()) cands.add(t);
      let best = null, bd = 1e9, near = null, nd = 1e9;
      G.cells.forEach((c, i) => {
        const d = Math.hypot(G.X(c) - x, G.Y(c) - y);
        if (d < nd) { nd = d; near = i; }
        if (cands.has(i) && d < bd) { bd = d; best = i; }
      });
      tapCell(bd < .78 ? best : nd < .6 ? near : null);
    };
    const undoBtn = button('↶ Undo', 'c-card', undo), hintBtn = button('💡 Hint', 'c-sun', hint);
    const bar = el('div', 'b3-bar'); bar.append(undoBtn, hintBtn);
    const wrap = el('div', 'b3-wrap'); wrap.append(score.el, board, bar); api.stage.append(wrap);

    function movable() { const s = new Set(); if (turn === 'you') for (const m of ccMoves(G, pos, 1)) s.add(m.f); return [...s]; }
    function inHome(s) { return (s === 1 ? G.top : G.bot).filter(i => pos[i] === s).length; }
    function render() {
      const can = new Set(sel === null ? movable() : []);
      marbles.forEach(m => {
        m.el.classList.toggle('can', can.has(m.cell));
        m.el.classList.toggle('sel', sel === m.cell);
        m.el.classList.toggle('hintm', !!hintM && hintM.f === m.cell);
      });
      mkLayer.innerHTML = '';
      if (dests) for (const [t, v] of dests) { const k = el('span', 'b3-mk' + (v.hop ? ' hop' : '') + (hintM && hintM.t === t ? ' hintm' : '')); at(k, t); mkLayer.append(k); }
      score.set(inHome(1) + '/' + K, inHome(-1) + '/' + K); score.turn(turn);
      undoBtn.classList.toggle('b3-off', !(turn === 'you' && (stack.length > 1 || sel !== null)));
      hintBtn.classList.toggle('b3-off', turn !== 'you');
      api.stage.dataset.turn = turn;
    }
    function yourTurn(msg) {
      turn = 'you'; sel = null; dests = null; hintM = null;
      stack.push(pos.slice());
      if (!ccMoves(G, pos, 1).length) { api.hint('You have no moves, so the computer goes again.'); return cpuTurn(); }
      api.hint((msg ? msg + ' ' : '') + 'Your turn. Tap a glowing ★ marble, then a glowing spot. Fill the blue point at the top!');
      render();
      if (AUTO()) api.later(() => { const m = ccChoose(G, pos, 1, 5, lastM[1]); tapCell(m.f); api.later(() => tapCell(m.t), 60); }, 120);
    }
    function tapCell(c) {
      if (turn !== 'you') return;
      if (c !== null && dests && dests.has(c)) { const v = dests.get(c); doMove({ f: sel, t: c, path: v.path, hop: v.hop }, 1); return; }
      if (c !== null && pos[c] === 1) {
        const d = ccDests(G, pos, c);
        if (!d.size) { sfx.soft(); api.hint('That marble is boxed in just now. Try another.'); return; }
        if (sel === c) { sel = null; dests = null; render(); return; }
        sel = c; dests = d; sfx.tap(); render();
        api.hint('Now tap a glowing spot. Yellow spots are hops over other marbles.');
        return;
      }
      sfx.soft();
      api.hint(sel === null ? 'Tap one of your glowing ★ marbles first.' : 'Tap one of the glowing spots, or another ★ marble.');
    }
    function doMove(m, s) {
      turn = s === 1 ? 'you-move' : 'cpu-move'; sel = null; dests = null; hintM = null;
      const mb = marbles.find(x => x.cell === m.f);
      pos[m.f] = 0; pos[m.t] = s; mb.cell = m.t; lastM[s] = m; plies++;
      render(); mb.el.classList.add('moving');
      let k = 1;
      const step = () => {
        at(mb.el, m.path[k]); tone((s === 1 ? 440 : 330) * Math.pow(2, (k - 1) * 2 / 12), .1, 'triangle', .1);
        k++;
        if (k < m.path.length) api.later(step, 230);
        else api.later(() => { mb.el.classList.remove('moving'); arrived(m, s); }, 260);
      };
      step();
    }
    function arrived(m, s) {
      const hops = m.path.length - 1;
      if (ccWon(G, pos, s)) return end(s);
      if (plies >= CAP) { const a = inHome(1), b = inHome(-1); return end(a > b ? 1 : b > a ? -1 : 0, true); }
      if (s === 1) {
        if (m.hop && hops >= 3) { toast(cheer() + ` ${hops} hops!`); sfx.good(); }
        cpuTurn(m.hop && hops >= 2 ? `A ${hops}-hop jump!` : '');
      } else yourTurn(m.hop ? (hops > 1 ? `The computer hopped ${hops} times.` : 'The computer hopped.') : 'The computer moved one step.');
    }
    function cpuTurn(pre) {
      turn = 'cpu'; render(); api.hint((pre ? pre + ' ' : '') + 'The computer is thinking…');
      api.later(() => {
        const m = ccChoose(G, pos, -1, L, lastM[-1]);
        if (!m) { yourTurn('The computer can’t move.'); return; }
        doMove(m, -1);
      }, 900);
    }
    function undo() {
      if (turn !== 'you') return;
      if (sel !== null) { sfx.tap(); sel = null; dests = null; render(); return; }
      if (stack.length < 2) return;
      sfx.tap(); undos++; stack.pop(); pos = stack.pop();
      const cells = { 1: [], '-1': [] }; pos.forEach((s, i) => { if (s) cells[s].push(i); });
      marbles.forEach(m => { m.cell = cells[m.s].shift(); at(m.el, m.cell); });
      yourTurn('Taken back.');
    }
    function hint() {
      if (turn !== 'you') return;
      sfx.tap(); undos += .5;
      const m = ccChoose(G, pos, 1, 9, lastM[1]); if (!m) return;
      hintM = m; sel = m.f; dests = ccDests(G, pos, m.f); render();
      api.hint('Try this marble. The spot with the white ring is a good place to go.');
    }
    function end(w, cap) {
      turn = 'over'; sel = null; dests = null; render();
      if (w === 1) { sfx.good(); toast(cheer()); api.hint(cap ? 'A long game! You have more marbles home, so you win!' : 'All your marbles are home. You win!'); finish(undos <= 2 ? 3 : 2); }
      else if (w === -1) { sfx.soft(); api.hint(cap ? 'A long game! The computer has more marbles home this time. Well played!' : 'The computer filled its point first. Well played, though!'); finish(1); }
      else { api.hint('A long game, and it’s a draw!'); finish(2); }
    }
    yourTurn(n === 3 ? 'A small star to start, 6 marbles each.' : '');
  }

  /* =========================================================
     BACKGAMMON. Points 1-24; you (+) move 24 -> 1 and bear off below 1,
     the computer (-) moves 1 -> 24 and bears off above 24. Your bar = 25, its bar = 0.
     ========================================================= */
  const bgClone = st => ({ p: st.p.slice(), by: st.by, bc: st.bc, oy: st.oy, oc: st.oc });
  function bgHome(st, s) {
    if (s > 0) { if (st.by) return false; for (let i = 7; i <= 24; i++) if (st.p[i] > 0) return false; }
    else { if (st.bc) return false; for (let i = 1; i <= 18; i++) if (st.p[i] < 0) return false; }
    return true;
  }
  function bgBehind(st, s, i) {
    if (s > 0) { for (let j = i + 1; j <= 24; j++) if (st.p[j] > 0) return true; }
    else { for (let j = 1; j < i; j++) if (st.p[j] < 0) return true; }
    return false;
  }
  function bgSteps(st, s, d) {
    const out = [], p = st.p, bar = s > 0 ? st.by : st.bc;
    if (bar) { const f = s > 0 ? 25 : 0, t = s > 0 ? 25 - d : d; if (p[t] * s >= -1) out.push({ f, t, d }); return out; }
    const home = bgHome(st, s);
    for (let i = 1; i <= 24; i++) {
      if (p[i] * s <= 0) continue;
      const t = s > 0 ? i - d : i + d;
      if (t >= 1 && t <= 24) { if (p[t] * s >= -1) out.push({ f: i, t, d }); }
      else if (home) { const exact = s > 0 ? t === 0 : t === 25; if (exact || !bgBehind(st, s, i)) out.push({ f: i, t: s > 0 ? 0 : 25, d }); }
    }
    return out;
  }
  function bgApply(st, s, m) {
    const n = bgClone(st); n.hit = false;
    if (s > 0 ? m.f === 25 : m.f === 0) { if (s > 0) n.by--; else n.bc--; } else n.p[m.f] -= s;
    if (s > 0 ? m.t === 0 : m.t === 25) { if (s > 0) n.oy++; else n.oc++; }
    else { if (n.p[m.t] * s === -1) { n.p[m.t] = 0; if (s > 0) n.bc++; else n.by++; n.hit = true; } n.p[m.t] += s; }
    return n;
  }
  const bgKey = st => st.p.join(',') + '|' + st.by + ',' + st.bc + ',' + st.oy + ',' + st.oc;
  function bgMaxUse(st, s, rem, memo = new Map()) {
    if (!rem.length) return 0;
    const key = bgKey(st) + '#' + rem.join('');
    if (memo.has(key)) return memo.get(key);
    let best = 0;
    const tried = new Set();
    for (let k = 0; k < rem.length && best < rem.length; k++) {
      const d = rem[k]; if (tried.has(d)) continue; tried.add(d);
      const r2 = rem.slice(0, k).concat(rem.slice(k + 1));
      for (const m of bgSteps(st, s, d)) { best = Math.max(best, 1 + bgMaxUse(bgApply(st, s, m), s, r2, memo)); if (best === rem.length) break; }
    }
    memo.set(key, best);
    return best;
  }
  // Legal single steps now, given remaining dice (enforces "use as many dice as possible" and "the higher die" rule).
  function bgLegal(st, s, rem) {
    const memo = new Map(), max = bgMaxUse(st, s, rem, memo);
    if (!max) return [];
    const out = [], tried = new Set();
    for (let k = 0; k < rem.length; k++) {
      const d = rem[k]; if (tried.has(d)) continue; tried.add(d);
      const r2 = rem.slice(0, k).concat(rem.slice(k + 1));
      for (const m of bgSteps(st, s, d)) if (1 + bgMaxUse(bgApply(st, s, m), s, r2, memo) === max) out.push(m);
    }
    if (max === 1 && rem.length === 2 && rem[0] !== rem[1]) { const hi = Math.max(rem[0], rem[1]); if (out.some(m => m.d === hi)) return out.filter(m => m.d === hi); }
    return out;
  }
  // All distinct legal end positions for a full turn, each with one move sequence.
  function bgTurns(st, s, dice) {
    const res = new Map(), seen = new Set();
    let maxUsed = 0;
    (function rec(cur, rem, seq) {
      const key = bgKey(cur) + '#' + rem.join('');
      if (seen.has(key)) return; seen.add(key);
      let any = false; const tried = new Set();
      for (let k = 0; k < rem.length; k++) {
        const d = rem[k]; if (tried.has(d)) continue; tried.add(d);
        const r2 = rem.slice(0, k).concat(rem.slice(k + 1));
        for (const m of bgSteps(cur, s, d)) { any = true; const nx = bgApply(cur, s, m); rec(nx, r2, seq.concat([Object.assign({ hit: nx.hit }, m)])); }
      }
      if (!any) {
        maxUsed = Math.max(maxUsed, seq.length);
        const fk = bgKey(cur); const old = res.get(fk);
        if (!old || old.seq.length < seq.length) res.set(fk, { seq, st: cur });
      }
    })(st, dice, []);
    let out = [...res.values()].filter(r => r.seq.length === maxUsed);
    if (maxUsed === 1 && dice.length === 2 && dice[0] !== dice[1]) { const hi = Math.max(...dice); if (out.some(r => r.seq[0].d === hi)) out = out.filter(r => r.seq[0].d === hi); }
    return maxUsed ? out : [];
  }
  function bgPips(st) {
    let y = st.by * 25, c = st.bc * 25;
    for (let i = 1; i <= 24; i++) { const v = st.p[i]; if (v > 0) y += v * i; else if (v < 0) c += -v * (25 - i); }
    return [y, c];
  }
  function bgEval(st, s) {
    const [py, pc] = bgPips(st);
    let sc = s > 0 ? pc - py : py - pc;
    sc += 3 * (s > 0 ? st.oy - st.oc : st.oc - st.oy);
    let rearY = st.by ? 25 : 0, rearC = st.bc ? 0 : 25;
    for (let i = 1; i <= 24; i++) { if (st.p[i] > 0) rearY = Math.max(rearY, i); if (st.p[i] < 0) rearC = Math.min(rearC, i); }
    if (rearY > rearC) { // still in contact
      for (let i = 1; i <= 24; i++) {
        const v = st.p[i] * s; if (v <= 0) continue;
        if (v >= 2) { const homeB = s > 0 ? i <= 7 : i >= 18; sc += homeB ? 4.5 : 2.5; continue; }
        // a blot: how close is the nearest enemy checker that could hit it?
        let near = 99;
        if (s > 0) { if (st.bc) near = Math.min(near, i); for (let j = 1; j < i; j++) if (st.p[j] < 0) near = Math.min(near, i - j); }
        else { if (st.by) near = Math.min(near, 25 - i); for (let j = i + 1; j <= 24; j++) if (st.p[j] > 0) near = Math.min(near, j - i); }
        if (near <= 6) sc -= 7; else if (near <= 12) sc -= 3;
      }
    }
    return sc;
  }
  function bgChoose(st, s, dice, L) {
    const outs = bgTurns(st, s, dice);
    if (!outs.length) return null;
    const noise = Math.max(1, 15 - 2.5 * L);
    let best = -Infinity, pickd = outs[0];
    for (const o of outs) { const v = bgEval(o.st, s) + noisy(noise); if (v > best) { best = v; pickd = o; } }
    return pickd;
  }
  const PIPS = { 1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const dieHTML = (v, cls) => `<span class="b3-die ${cls}">${[...Array(9)].map((_, k) => `<i class="${PIPS[v].includes(k) ? 'on' : ''}"></i>`).join('')}</span>`;

  function startBackgammon(L, api) {
    let st = { p: Array(25).fill(0), by: 0, bc: 0, oy: 0, oc: 0 };
    st.p[24] = 2; st.p[13] = 5; st.p[8] = 3; st.p[6] = 5;
    st.p[1] = -2; st.p[12] = -5; st.p[17] = -3; st.p[19] = -5;
    let turn = 'none', dice = [], used = [], who = 'you', sel = null, legal = [], moved = 0, undos = 0, landed = new Set();
    const hist = [], finish = finisher(api);
    const score = scoreRow(ball(YOU, 34), ball(CPU, 34));
    const board = el('div', 'b3-bg');
    const ptEl = [];
    const place = (i, col, row) => {
      const b = el('button', 'b3-pt ' + (row === 3 ? 'bot ' : '') + (i % 2 ? 'a' : 'b')); b.type = 'button';
      b.style.gridColumn = col; b.style.gridRow = row; b.onclick = () => tap(i); ptEl[i] = b; board.append(b);
    };
    for (let k = 0; k < 6; k++) { place(13 + k, k + 1, 1); place(19 + k, k + 8, 1); place(12 - k, k + 1, 3); place(6 - k, k + 8, 3); }
    const midL = el('div', 'b3-mid'); midL.style.gridColumn = '1 / 7';
    const midR = el('div', 'b3-mid'); midR.style.gridColumn = '8 / 14';
    const barEl = el('button', 'b3-barc'); barEl.type = 'button'; barEl.onclick = () => tap(25);
    const tray = el('button', 'b3-tray'); tray.type = 'button'; tray.onclick = () => tap(0);
    board.append(midL, midR, barEl, tray);
    const diceEl = el('div', 'b3-dice');
    const rollBtn = button('🎲 Roll', 'c-leaf', () => { if (turn === 'roll') { sfx.tap(); roll(); } });
    const undoBtn = button('↶ Undo', 'c-card', undo);
    const bar = el('div', 'b3-bar'); bar.append(diceEl, rollBtn, undoBtn);
    const wrap = el('div', 'b3-wrap'); wrap.append(score.el, board, bar); api.stage.append(wrap);

    const remDice = () => dice.filter((d, k) => !used[k]);
    const ck = (s, extra = '', label) => `<span class="b3-ck c-${s > 0 ? YOU.c : CPU.c} ${extra}">${label == null ? (s > 0 ? YOU.s : CPU.s) : label}</span>`;
    function stackHTML(count, s, i, opts) {
      let h = ''; const show = Math.min(count, 5);
      for (let k = 0; k < show; k++) {
        const top = k === show - 1;
        let cls = '';
        if (top && opts.can) cls += ' can';
        if (top && opts.sel) cls += ' sel';
        if (top && landed.has(i)) cls += ' land';
        h += ck(s, cls + (top && count > 5 ? ' big' : ''), top && count > 5 ? count : null);
      }
      if (opts.dest) h += '<span class="b3-dot"></span>';
      return h;
    }
    function render() {
      const mine = turn === 'you';
      const from = new Set(mine ? legal.map(m => m.f) : []);
      const to = new Set(mine && sel !== null ? legal.filter(m => m.f === sel).map(m => m.t) : []);
      for (let i = 1; i <= 24; i++) {
        const v = st.p[i];
        ptEl[i].innerHTML = stackHTML(Math.abs(v), v > 0 ? 1 : -1, i, { can: from.has(i) && sel === null, sel: sel === i, dest: to.has(i) });
        ptEl[i].setAttribute('aria-label', `Point ${i}: ` + (v ? `${Math.abs(v)} ${v > 0 ? 'yours' : 'computer’s'}` : 'empty'));
      }
      barEl.innerHTML = `<span style="display:flex;flex-direction:column;width:100%">${stackHTML(st.bc, -1, 'bc', {})}</span><span style="display:flex;flex-direction:column-reverse;width:100%">${stackHTML(st.by, 1, 25, { can: from.has(25) && sel === null, sel: sel === 25 })}</span>`;
      barEl.setAttribute('aria-label', `Bar: ${st.by} yours, ${st.bc} computer’s`);
      tray.innerHTML = `<span class="b3-offs">${'<i class="b3-slab c-coral"></i>'.repeat(st.oc)}${st.oc ? `<span>${st.oc}</span>` : ''}</span><span class="b3-offs y">${'<i class="b3-slab c-sky"></i>'.repeat(st.oy)}${st.oy ? `<span>${st.oy}</span>` : ''}</span>`;
      tray.classList.toggle('dest', to.has(0));
      tray.setAttribute('aria-label', `Borne off: you ${st.oy}, computer ${st.oc}`);
      const rolling = diceEl.dataset.roll === '1'; diceEl.dataset.roll = '';
      diceEl.innerHTML = dice.map((v, k) => dieHTML(v, (dice.length > 2 ? 'sm ' : '') + (used[k] ? 'used ' : '') + (who === 'cpu' ? 'cpu ' : '') + (rolling ? 'roll' : ''))).join('');
      rollBtn.hidden = turn !== 'roll';
      rollBtn.classList.toggle('b3-go', turn === 'roll');
      undoBtn.classList.toggle('b3-off', !canUndo());
      score.set(st.oy + '/15', st.oc + '/15'); score.turn(turn === 'roll' || turn === 'you' || turn === 'you-move' ? 'you' : turn === 'cpu' ? 'cpu' : '');
      api.stage.dataset.turn = turn;
      landed = new Set();
    }
    function canUndo() { return (turn === 'you' && moved > 0) || ((turn === 'you' || turn === 'roll') && hist.length > (turn === 'you' ? 1 : 0)); }
    function rollDice() { const a = 1 + randInt(6), b = 1 + randInt(6); return a === b ? [a, a, a, a] : [a, b]; }
    function yourRoll(msg) {
      turn = 'roll'; who = 'you'; sel = null; legal = []; render();
      api.hint((msg ? msg + ' ' : '') + 'Your turn. Tap Roll to throw the dice.');
      if (AUTO()) api.later(() => rollBtn.click(), 100);
    }
    function roll() {
      dice = rollDice(); used = dice.map(() => false); moved = 0; turn = 'none';
      diceEl.dataset.roll = '1'; render(); rattle();
      api.later(() => startTurn(), 650);
    }
    function rattle() { for (let k = 0; k < 6; k++) tone(260 + randInt(160), .04, 'square', .035, k * .08); }
    function dname() { return dice.length > 2 ? `double ${dice[0]}s` : `${dice[0]} and ${dice[1]}`; }
    function startTurn(restored) {
      const outs = bgTurns(st, 1, dice);
      if (!outs.length) { turn = 'none'; render(); api.hint(`You rolled ${dname()}, but no move is possible. Over to the computer.`); api.later(() => cpuTurn(), 2200); return; }
      if (outs.length === 1) {
        turn = 'you-move'; render(); api.hint(`You rolled ${dname()}. There is only one way to play it, so here it goes.`);
        const seq = outs[0].seq; let k = 0;
        const go = () => { stepMove(seq[k], 1); render(); k++; if (k < seq.length) api.later(go, 650); else api.later(endYour, 800); };
        api.later(go, 900); return;
      }
      if (!restored) hist.push({ st: bgClone(st), dice: dice.slice() });
      turn = 'you'; moved = 0; refresh();
      api.hint(`You rolled ${dname()}${dice.length > 2 ? ' (four moves)' : ''}. Tap a glowing checker, then a white spot to move it.`);
      if (AUTO()) autoPlay();
    }
    function refresh() { legal = bgLegal(st, 1, remDice()); sel = null; render(); }
    function autoPlay() {
      const o = bgChoose(st, 1, remDice(), 5); if (!o) return;
      const m = o.seq[0];
      api.later(() => { if (sel !== m.f) { sel = null; tap(m.f); } api.later(() => tap(m.t), 60); }, 120);
    }
    function useDie(d) { const k = dice.findIndex((v, j) => !used[j] && v === d); used[k] = true; }
    function stepMove(m, s) {
      const nx = bgApply(st, s, m); st = nx; useDie(m.d); landed.add(m.t === 0 || m.t === 25 ? -1 : m.t);
      if (nx.hit) { tone(660, .1, 'triangle', .12); api.later(() => tone(880, .12, 'triangle', .1), 90); }
      else tone(s > 0 ? 440 : 330, .08, 'triangle', .1);
      if (s > 0 && (m.t === 0)) tone(990, .12, 'sine', .08, .05);
      return nx.hit;
    }
    function tap(i) {
      if (turn !== 'you') return;
      if (sel !== null) {
        const opts = legal.filter(m => m.f === sel && m.t === i);
        if (opts.length) {
          const m = opts.reduce((a, b) => (b.d < a.d ? b : a));
          const hit = stepMove(m, 1); moved++;
          if (hit) { sfx.good(); toast('Hit! ' + cheer()); }
          legal = bgLegal(st, 1, remDice()); sel = null;
          if (st.oy === 15) { render(); return end('you'); }
          if (!legal.length) { turn = 'you-move'; render(); api.hint('All moved. Over to the computer…'); api.later(endYour, 900); return; }
          // keep the same checker selected if it can carry on
          if (legal.some(x => x.f === m.t)) sel = m.t;
          render(); api.hint(sel !== null ? 'Move it again, or tap another glowing checker.' : 'Now use your other dice. Tap a glowing checker.');
          if (AUTO()) autoPlay();
          return;
        }
        if (i === sel) { sel = null; render(); api.hint('Tap a glowing checker to move.'); return; }
      }
      if (legal.some(m => m.f === i)) { sel = i; sfx.tap(); render(); api.hint(i === 25 ? 'Bring it back in: tap a white spot on the top right.' : 'Now tap a white spot to move there.'); return; }
      sfx.soft();
      if (st.by && i !== 25) api.hint('You have a checker on the bar (the middle strip). It must come back in first: tap the bar.');
      else if (i === 0) api.hint(bgHome(st, 1) ? 'Tap a glowing checker first, then tap here to take it off.' : 'You can take checkers off once all of yours are in the bottom right corner.');
      else api.hint('That one can’t move with these dice. Try a glowing checker.');
      if (ptEl[i]) wob(ptEl[i]);
    }
    function endYour() {
      if (st.oy === 15) return end('you');
      cpuTurn();
    }
    function cpuTurn() {
      turn = 'cpu'; who = 'cpu'; sel = null; legal = []; dice = []; render();
      api.hint('The computer rolls the dice…');
      api.later(() => {
        dice = rollDice(); used = dice.map(() => false); diceEl.dataset.roll = '1'; render(); rattle();
        api.later(() => {
          const o = bgChoose(st, -1, dice, L);
          if (!o) { api.hint(`The computer rolled ${dname()} but can’t move.`); api.later(() => yourRoll(), 1800); return; }
          api.hint(`The computer rolled ${dname()}.`);
          let k = 0, hits = 0, offs = 0;
          const go = () => {
            const m = o.seq[k]; if (stepMove(m, -1)) hits++; if (m.t === 25) offs++;
            render(); k++;
            if (st.oc === 15) return end('cpu');
            if (k < o.seq.length) api.later(go, 700);
            else {
              const msg = hits ? `The computer hit ${hits > 1 ? hits + ' of your checkers' : 'one of your checkers'}. It goes on the bar and comes back in next turn.` : offs ? `The computer took ${offs} off.` : 'The computer has moved.';
              if (hits) sfx.soft();
              api.later(() => yourRoll(msg), 900);
            }
          };
          api.later(go, 700);
        }, 700);
      }, 900);
    }
    function undo() {
      if (!canUndo()) return;
      sfx.tap(); undos++;
      if (turn === 'you' && moved > 0) { const h = hist[hist.length - 1]; st = bgClone(h.st); dice = h.dice.slice(); used = dice.map(() => false); moved = 0; refresh(); api.hint('Taken back. Have another go with the same dice.'); return; }
      if (turn === 'you') hist.pop();
      const h = hist[hist.length - 1]; st = bgClone(h.st); dice = h.dice.slice(); used = dice.map(() => false); who = 'you';
      startTurn(true); api.hint('Taken back to your last turn, with the same dice. Tap a glowing checker.');
    }
    function end(w) {
      turn = 'over'; sel = null; legal = []; render();
      if (w === 'you') { sfx.good(); toast(cheer()); api.hint('All 15 of your checkers are off. You win!'); finish(undos <= 3 ? 3 : 2); }
      else { sfx.soft(); api.hint(`The computer got all its checkers off first. You had ${st.oy} off. Good game!`); finish(1); }
    }
    yourRoll('Move your ★ checkers round to the bottom right, then take them off.');
  }

  /* =========================================================
     CHESS. Board index 0..63, row 0 at the top (computer's side).
     Pieces: 1 pawn, 2 knight, 3 bishop, 4 rook, 5 queen, 6 king; + yours (white), - computer (black).
     ========================================================= */
  const KD = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  const BD = [[1, 1], [1, -1], [-1, 1], [-1, -1]], RD = [[1, 0], [-1, 0], [0, 1], [0, -1]], QD = BD.concat(RD);
  const VAL = [0, 100, 320, 330, 500, 900, 0];
  const GLYPH = ['', '♟', '♞', '♝', '♜', '♛', '♚'];
  const PNAME = ['', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
  function chAttacked(b, sq, by) {
    const r = sq >> 3, c = sq & 7;
    const pr = r + (by > 0 ? 1 : -1);
    if (pr >= 0 && pr < 8) for (const dc of [-1, 1]) { const cc = c + dc; if (cc >= 0 && cc < 8 && b[pr * 8 + cc] === by) return true; }
    for (const [dr, dc] of KD) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === 2 * by) return true; }
    for (const [dr, dc] of QD) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === 6 * by) return true; }
    for (const [dr, dc] of BD) { let rr = r + dr, cc = c + dc; while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { const v = b[rr * 8 + cc]; if (v) { if (v === 3 * by || v === 5 * by) return true; break; } rr += dr; cc += dc; } }
    for (const [dr, dc] of RD) { let rr = r + dr, cc = c + dc; while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { const v = b[rr * 8 + cc]; if (v) { if (v === 4 * by || v === 5 * by) return true; break; } rr += dr; cc += dc; } }
    return false;
  }
  const chKing = (b, s) => b.indexOf(6 * s);
  const chInCheck = S => chAttacked(S.b, chKing(S.b, S.turn), -S.turn);
  function chPseudo(S, capsOnly) {
    const b = S.b, s = S.turn, out = [];
    for (let sq = 0; sq < 64; sq++) {
      const v = b[sq]; if (v * s <= 0) continue;
      const t = Math.abs(v), r = sq >> 3, c = sq & 7;
      if (t === 1) {
        const dir = s > 0 ? -1 : 1, last = s > 0 ? 0 : 7, start = s > 0 ? 6 : 1, r1 = r + dir;
        if (r1 < 0 || r1 > 7) continue;
        if (!capsOnly && !b[r1 * 8 + c]) {
          out.push({ f: sq, t: r1 * 8 + c, promo: r1 === last ? 5 : 0 });
          if (r === start && !b[(r + 2 * dir) * 8 + c]) out.push({ f: sq, t: (r + 2 * dir) * 8 + c, promo: 0 });
        }
        for (const dc of [-1, 1]) {
          const cc = c + dc; if (cc < 0 || cc > 7) continue;
          const to = r1 * 8 + cc;
          if (b[to] * s < 0) out.push({ f: sq, t: to, promo: r1 === last ? 5 : 0, cap: Math.abs(b[to]) });
          else if (to === S.ep) out.push({ f: sq, t: to, promo: 0, ep: true, cap: 1 });
        }
      } else if (t === 2 || t === 6) {
        for (const [dr, dc] of t === 2 ? KD : QD) {
          const rr = r + dr, cc = c + dc; if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
          const to = rr * 8 + cc, w = b[to];
          if (w * s > 0) continue;
          if (capsOnly && !w) continue;
          out.push({ f: sq, t: to, cap: w ? Math.abs(w) : 0 });
        }
        if (t === 6 && !capsOnly) {
          const home = s > 0 ? 60 : 4, ks = s > 0 ? 1 : 4, qs = s > 0 ? 2 : 8;
          if (sq === home && !chAttacked(b, home, -s)) {
            if ((S.castle & ks) && !b[home + 1] && !b[home + 2] && b[home + 3] === 4 * s && !chAttacked(b, home + 1, -s) && !chAttacked(b, home + 2, -s)) out.push({ f: sq, t: home + 2, castle: 1 });
            if ((S.castle & qs) && !b[home - 1] && !b[home - 2] && !b[home - 3] && b[home - 4] === 4 * s && !chAttacked(b, home - 1, -s) && !chAttacked(b, home - 2, -s)) out.push({ f: sq, t: home - 2, castle: 2 });
          }
        }
      } else {
        for (const [dr, dc] of t === 3 ? BD : t === 4 ? RD : QD) {
          let rr = r + dr, cc = c + dc;
          while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
            const to = rr * 8 + cc, w = b[to];
            if (w * s > 0) break;
            if (w || !capsOnly) out.push({ f: sq, t: to, cap: w ? Math.abs(w) : 0 });
            if (w) break;
            rr += dr; cc += dc;
          }
        }
      }
    }
    return out;
  }
  function chMake(S, m) {
    const b = S.b.slice(), v = b[m.f], s = Math.sign(v);
    let cap = b[m.t];
    b[m.t] = v; b[m.f] = 0;
    if (m.ep) { const cs = m.t + (s > 0 ? 8 : -8); cap = b[cs]; b[cs] = 0; }
    if (m.promo) b[m.t] = m.promo * s;
    if (m.castle) { if (m.t > m.f) { b[m.f + 1] = b[m.f + 3]; b[m.f + 3] = 0; } else { b[m.f - 1] = b[m.f - 4]; b[m.f - 4] = 0; } }
    let castle = S.castle;
    if (v === 6) castle &= ~3; if (v === -6) castle &= ~12;
    for (const [sq, bit] of [[63, 1], [56, 2], [7, 4], [0, 8]]) if (m.f === sq || m.t === sq) castle &= ~bit;
    const ep = Math.abs(v) === 1 && Math.abs(m.t - m.f) === 16 ? (m.f + m.t) / 2 : -1;
    const half = Math.abs(v) === 1 || cap ? 0 : S.half + 1;
    return { b, turn: -S.turn, castle, ep, half };
  }
  function chLegal(S, capsOnly) {
    return chPseudo(S, capsOnly).filter(m => { const N = chMake(S, m); return !chAttacked(N.b, chKing(N.b, S.turn), -S.turn); });
  }
  function chEval(S) { // white's view
    const b = S.b; let sc = 0, mat = 0;
    for (let sq = 0; sq < 64; sq++) { const v = b[sq]; if (v && Math.abs(v) !== 1 && Math.abs(v) !== 6) mat += VAL[Math.abs(v)]; }
    const endg = mat < 2600;
    for (let sq = 0; sq < 64; sq++) {
      const v = b[sq]; if (!v) continue;
      const t = Math.abs(v), s = Math.sign(v), r = s > 0 ? sq >> 3 : 7 - (sq >> 3), c = sq & 7;
      const ctr = Math.abs(3.5 - r) + Math.abs(3.5 - c);
      let p = VAL[t];
      if (t === 1) p += (6 - r) * (endg ? 12 : 5) + (c >= 2 && c <= 5 && r >= 3 && r <= 4 ? 12 : 0);
      else if (t === 2) p -= ctr * 8;
      else if (t === 3) p -= ctr * 4 + (r === 7 ? 8 : 0);
      else if (t === 4) p += r === 1 ? 12 : 0;
      else if (t === 5) p -= ctr * 2;
      else if (t === 6) p += endg ? -ctr * 8 : (r === 7 ? 10 : -(7 - r) * 15) + (r === 7 && (c <= 2 || c >= 6) ? 15 : 0);
      sc += s * p;
    }
    return sc;
  }
  function chQuiesce(S, a, be, qd) {
    const stand = chEval(S) * S.turn;
    if (qd <= 0 || stand >= be) return stand;
    if (stand > a) a = stand;
    const ms = chLegal(S, true).sort((x, y) => (y.cap * 10 - Math.abs(S.b[y.f])) - (x.cap * 10 - Math.abs(S.b[x.f])));
    for (const m of ms) { const v = -chQuiesce(chMake(S, m), -be, -a, qd - 1); if (v >= be) return v; if (v > a) a = v; }
    return a;
  }
  function chSearch(S, d, a, be, ply, q) {
    if (d <= 0) return q ? chQuiesce(S, a, be, 4) : chEval(S) * S.turn;
    const ms = chLegal(S);
    if (!ms.length) return chInCheck(S) ? -100000 + ply : 0;
    if (S.half >= 100) return 0;
    ms.sort((x, y) => (y.cap || 0) * 10 + (y.promo || 0) - ((x.cap || 0) * 10 + (x.promo || 0)));
    for (const m of ms) { const v = -chSearch(chMake(S, m), d - 1, -be, -a, ply + 1, q); if (v > a) a = v; if (a >= be) break; }
    return a;
  }
  function chChoose(S, L, strong) {
    const ms = chLegal(S);
    if (!ms.length) return null;
    const depth = strong ? 2 : L <= 2 ? 1 : L <= 5 ? 2 : 3, q = strong || L >= 4;
    const blunder = strong ? 0 : L <= 1 ? .3 : L <= 2 ? .15 : L <= 3 ? .07 : 0;
    const margin = strong ? 8 : L <= 1 ? 220 : L <= 2 ? 140 : L <= 3 ? 80 : L <= 5 ? 40 : L <= 8 ? 20 : 8;
    if (Math.random() < blunder) return pick(ms);
    const sc = ms.map(m => -chSearch(chMake(S, m), depth - 1, -Infinity, Infinity, 1, q));
    const best = Math.max(...sc);
    if (best > 50000) return ms[sc.indexOf(best)]; // take a mate when there is one
    const ok = ms.filter((m, k) => sc[k] >= best - margin);
    return pick(ok);
  }
  const chKey = S => S.b.join('') + S.turn + ':' + S.castle + ':' + S.ep;
  function chInsufficient(b) {
    const rest = b.filter(v => v && Math.abs(v) !== 6);
    return !rest.length || (rest.length === 1 && (Math.abs(rest[0]) === 2 || Math.abs(rest[0]) === 3));
  }

  function startChess(L, api) {
    const back = [4, 2, 3, 5, 6, 3, 2, 4];
    let S = { b: Array(64).fill(0), turn: 1, castle: 15, ep: -1, half: 0 };
    for (let c = 0; c < 8; c++) { S.b[c] = -back[c]; S.b[8 + c] = -1; S.b[48 + c] = 1; S.b[56 + c] = back[c]; }
    let turn = 'none', sel = null, legal = [], last = null, slide = null, hintM = null, undos = 0, hints = 0, promoTo = 5;
    let keys = [chKey(S)];
    const stack = [], finish = finisher(api);
    const cap = { 1: 0, '-1': 0 };
    const score = scoreRow(`<span class="b3-ball c-card" style="--s:34px;color:#18242C;text-shadow:none;font-size:22px">♙</span>`, `<span class="b3-ball c-card" style="--s:34px;color:#18242C;text-shadow:none;font-size:22px">♟</span>`);
    const board = el('div', 'b3-ch');
    const sqs = [...Array(64)].map((_, i) => { const s = el('button', 'b3-sq' + (((i >> 3) + (i & 7)) % 2 ? ' dk' : '')); s.type = 'button'; s.onclick = () => tap(i); board.append(s); return s; });
    const PROMOS = [5, 4, 3, 2];
    const promoBtn = button('', 'c-card', () => { sfx.tap(); promoTo = PROMOS[(PROMOS.indexOf(promoTo) + 1) % 4]; render(); api.hint(`When a pawn reaches the far side it will become a ${PNAME[promoTo]}.`); });
    const undoBtn = button('↶ Undo', 'c-card', undo), hintBtn = button('💡 Hint', 'c-sun', hint);
    const bar = el('div', 'b3-bar'); bar.append(undoBtn, hintBtn, promoBtn);
    const wrap = el('div', 'b3-wrap'); wrap.append(score.el, board, bar); api.stage.append(wrap);

    function render() {
      const chk = S.turn && chInCheck(S) ? chKing(S.b, S.turn) : -1;
      const to = new Map(); if (sel !== null) legal.filter(m => m.f === sel).forEach(m => to.set(m.t, m));
      sqs.forEach((q, i) => {
        const v = S.b[i];
        if (v) {
          let cls = 'b3-pc ' + (v > 0 ? 'w' : 'k');
          let style = '';
          if (slide && slide.t === i) { cls += ' slide'; style = `--dx:${((slide.f & 7) - (i & 7)) * 100}%;--dy:${((slide.f >> 3) - (i >> 3)) * 100}%`; }
          else if (slide && slide.rook === i) { cls += ' land'; }
          q.innerHTML = `<span class="${cls}" style="${style}">${GLYPH[Math.abs(v)]}︎</span>`;
        } else q.innerHTML = '';
        q.setAttribute('aria-label', v ? (v > 0 ? 'Your ' : 'Computer’s ') + PNAME[Math.abs(v)] : 'Empty square');
        q.classList.toggle('sel', sel === i);
        q.classList.toggle('dest', to.has(i));
        q.classList.toggle('cap', to.has(i) && !!(S.b[i] || to.get(i).ep));
        q.classList.toggle('last', !!last && (last.f === i || last.t === i));
        q.classList.toggle('chk', chk === i);
        q.classList.toggle('hintsq', !!hintM && (hintM.f === i || hintM.t === i));
      });
      slide = null;
      score.set(cap[1], cap[-1]); score.turn(turn);
      undoBtn.classList.toggle('b3-off', !(turn === 'you' && (stack.length > 0 || sel !== null)));
      hintBtn.classList.toggle('b3-off', turn !== 'you');
      promoBtn.textContent = 'Pawn → ' + GLYPH[promoTo] + '︎';
      api.stage.dataset.turn = turn;
    }
    function yourTurn(msg) {
      turn = 'you'; sel = null; hintM = null; legal = chLegal(S);
      if (gameOver()) return;
      const inChk = chInCheck(S);
      api.hint((msg ? msg + ' ' : '') + (inChk ? 'Check! Your king is under attack: protect it. ' : 'Your turn. ') + 'Tap one of your white pieces, then a glowing square.');
      render();
      if (inChk) tone(300, .2, 'sine', .08);
      if (AUTO()) api.later(() => { const m = chChoose(S, 4, false); tap(m.f); api.later(() => tap(m.t), 50); }, 100);
    }
    function gameOver() {
      const ms = chLegal(S), side = S.turn;
      if (!ms.length) {
        if (chInCheck(S)) return end(side > 0 ? 'cpu' : 'you', 'Checkmate!'), true;
        return end('draw', 'Stalemate: no legal moves, but not in check. It’s a draw!'), true;
      }
      if (S.half >= 100) return end('draw', 'Fifty moves with no capture or pawn move. It’s a draw!'), true;
      const k = keys[keys.length - 1]; if (keys.filter(x => x === k).length >= 3) return end('draw', 'The same position three times. It’s a draw!'), true;
      if (chInsufficient(S.b)) return end('draw', 'Not enough pieces left to checkmate. It’s a draw!'), true;
      return false;
    }
    function tap(i) {
      if (turn !== 'you') return;
      if (sel !== null) {
        const m = legal.find(x => x.f === sel && x.t === i);
        if (m) { play(m.promo ? Object.assign({}, m, { promo: promoTo }) : m); return; }
      }
      if (S.b[i] > 0) {
        if (sel === i) { sel = null; render(); return; }
        if (!legal.some(m => m.f === i)) { sfx.soft(); wob(sqs[i]); api.hint(chInCheck(S) ? 'That piece can’t help your king. Try another.' : 'That piece can’t move just now. Try another.'); return; }
        sel = i; hintM = null; sfx.tap(); render(); api.hint('Now tap a glowing square. A yellow ring means you take a piece.');
        return;
      }
      if (sel !== null) { sfx.soft(); api.hint('That square isn’t one of the glowing ones. Tap a glowing square, or another piece.'); }
    }
    function play(m) {
      stack.push({ S, keys: keys.slice(), last, cap: { 1: cap[1], '-1': cap[-1] } });
      move(m, 1);
      if (!gameOver()) cpuTurn();
    }
    function move(m, s) {
      const v = S.b[m.f], taken = m.ep ? 1 : Math.abs(S.b[m.t]);
      S = chMake(S, m); keys.push(chKey(S)); last = m; sel = null; hintM = null;
      slide = { f: m.f, t: m.t, rook: m.castle ? (m.t > m.f ? m.t - 1 : m.t + 1) : -1 };
      if (taken) { cap[s]++; tone(660, .1, 'triangle', .12); api.later(() => tone(880, .12, 'triangle', .1), 90); }
      else tone(s > 0 ? 440 : 330, .08, 'triangle', .1);
      turn = s > 0 ? 'cpu' : 'you';
      render();
      return { v, taken };
    }
    function cpuTurn() {
      turn = 'cpu'; render(); api.hint('The computer is thinking…');
      api.later(() => {
        const m = chChoose(S, L, false);
        const { v, taken } = move(m, -1);
        if (gameOver()) return;
        const what = PNAME[Math.abs(v)];
        let msg = m.castle ? 'The computer castled.' : taken ? `The computer’s ${what} took your ${PNAME[taken]}.` : `The computer moved its ${what}.`;
        if (m.promo) msg = 'The computer’s pawn became a queen.';
        if (taken) sfx.soft();
        api.later(() => yourTurn(msg), 250);
      }, 700);
    }
    function undo() {
      if (turn !== 'you') return;
      if (sel !== null) { sfx.tap(); sel = null; render(); return; }
      if (!stack.length) return;
      sfx.tap(); undos++;
      const u = stack.pop(); S = u.S; keys = u.keys; last = u.last; cap[1] = u.cap[1]; cap[-1] = u.cap[-1];
      yourTurn('Taken back.');
    }
    function hint() {
      if (turn !== 'you') return;
      sfx.tap(); hints++;
      const m = chChoose(S, 9, true); if (!m) return;
      hintM = m; sel = m.f; render();
      api.hint(`Try moving this ${PNAME[S.b[m.f]]} to the square with the yellow frame.`);
    }
    function end(w, why) {
      turn = 'over'; sel = null; render();
      const help = undos + hints;
      if (w === 'you') { sfx.good(); toast(cheer()); api.hint(why + ' You win! Splendid.'); finish(help <= 3 ? 3 : 2); }
      else if (w === 'cpu') { sfx.soft(); api.hint(why + ' The computer won this time. A good game, though!'); finish(1); }
      else { api.hint(why); finish(2); }
    }
    yourTurn('You play white, at the bottom.');
  }
})();
