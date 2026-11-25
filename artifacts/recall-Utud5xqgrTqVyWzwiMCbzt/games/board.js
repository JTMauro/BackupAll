/* Recall: board games against a friendly computer (cat 'cards', orders 6-10).
   Noughts & Crosses, Four in a Row, Draughts, Snakes & Ladders, Ludo. Prefix: .bd- */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer } = R;

  R.css(`
.bd-wrap{display:flex; flex-direction:column; align-items:center; gap:12px; width:100%; max-width:460px; margin:0 auto; color:var(--on-table)}
.bd-score{display:flex; align-items:center; justify-content:center; gap:8px 10px; flex-wrap:wrap; font:600 1.05rem/1.1 var(--display)}
.bd-chip{display:inline-flex; align-items:center; gap:8px; background:rgba(0,0,0,.22); padding:5px 14px 5px 5px; border-radius:999px; transition:background .25s, box-shadow .25s}
.bd-chip.on{background:rgba(255,255,255,.2); box-shadow:0 0 0 3px #fff}
.bd-chip .bd-cv{font-size:1.3rem}
.bd-mid{font:600 1rem var(--display); color:var(--on-table-soft); padding:0 4px; order:3; flex-basis:100%; text-align:center; margin-top:-2px}
.bd-mid:empty{display:none}
.bd-chip .bd-mk{width:34px; height:34px; padding:4px; border-radius:50%; background:var(--card)}
.bd-ctr{--s:40px; position:relative; width:var(--s); height:var(--s); border-radius:50%; display:grid; place-items:center; flex:none; color:#fff;
  font:700 calc(var(--s) * .52)/1 var(--display); text-shadow:0 2px 0 rgba(0,0,0,.3);
  background:radial-gradient(circle at 34% 28%, rgba(255,255,255,.6) 0 12%, rgba(255,255,255,0) 38%), radial-gradient(circle, var(--c) 0 55%, var(--d) 56% 62%, var(--c) 63%);
  box-shadow:inset 0 -3px 0 rgba(0,0,0,.18), 0 4px 0 var(--d), 0 7px 10px rgba(0,0,0,.35)}
.bd-bar{display:flex; align-items:center; justify-content:center; gap:12px; flex-wrap:wrap}
.bd-bar .btn{min-height:58px}
.btn.bd-off{opacity:.4; pointer-events:none}
@keyframes bd-pulse{to{transform:scale(1.07)}}
@keyframes bd-glow{from{box-shadow:0 0 0 3px #fff, 0 0 6px 2px rgba(255,255,255,.5), 0 4px 0 var(--d)} to{box-shadow:0 0 0 4px #fff, 0 0 18px 7px rgba(255,255,255,.85), 0 4px 0 var(--d)}}
@keyframes bd-must{from{box-shadow:0 0 0 3px var(--sun), 0 0 6px 2px rgba(255,194,52,.6), 0 4px 0 var(--d)} to{box-shadow:0 0 0 5px var(--sun), 0 0 20px 8px rgba(255,194,52,.95), 0 4px 0 var(--d)}}
@keyframes bd-land{from{transform:translateY(-14px) scale(1.2)}}
@keyframes bd-hopk{40%{transform:translateY(-45%) scale(1.08)}}

/* dice */
.bd-die{--ds:66px; position:relative; width:var(--ds); height:var(--ds); perspective:420px; flex:none; cursor:pointer; background:none; border:0; padding:0; margin:4px 6px 10px}
.bd-cube{position:absolute; inset:0; transform-style:preserve-3d; transition:transform 1s cubic-bezier(.15,.8,.3,1.05)}
.bd-face{position:absolute; inset:0; border-radius:20%; display:grid; grid-template:repeat(3,1fr)/repeat(3,1fr); padding:13%;
  background:linear-gradient(150deg, #fff 30%, #EFE4CC); box-shadow:inset 0 0 0 3px #E2D2B2, inset 0 -6px 0 rgba(0,0,0,.07); backface-visibility:hidden; -webkit-backface-visibility:hidden}
.bd-face i{width:74%; height:74%; margin:auto; border-radius:50%; background:radial-gradient(circle at 40% 35%, #5A6772, #18242C 70%); visibility:hidden}
.bd-face i.on{visibility:visible}
.bd-face.f1 i.on{background:radial-gradient(circle at 40% 35%, #FF8C72, var(--coral-d) 70%); width:90%; height:90%}
.bd-f1{transform:translateZ(calc(var(--ds) / 2))}
.bd-f6{transform:rotateY(180deg) translateZ(calc(var(--ds) / 2))}
.bd-f2{transform:rotateY(90deg) translateZ(calc(var(--ds) / 2))}
.bd-f5{transform:rotateY(-90deg) translateZ(calc(var(--ds) / 2))}
.bd-f3{transform:rotateX(90deg) translateZ(calc(var(--ds) / 2))}
.bd-f4{transform:rotateX(-90deg) translateZ(calc(var(--ds) / 2))}
.bd-dshadow{position:absolute; left:8%; right:8%; bottom:-14px; height:14px; border-radius:50%; background:rgba(0,0,0,.3); filter:blur(3px); transition:transform .5s}
.bd-die.rolling{animation:bd-dhop 1s ease-out}
.bd-die.rolling .bd-dshadow{animation:bd-dsh 1s ease-out}
@keyframes bd-dhop{20%{translate:0 -34px} 45%{translate:0 0} 60%{translate:0 -10px} 75%{translate:0 0}}
@keyframes bd-dsh{20%{transform:scale(.6); opacity:.5} 45%{transform:none}}
.bd-die.bd-play{filter:drop-shadow(0 0 10px rgba(255,255,255,.75))}

/* noughts & crosses */
.bd-ttt{display:grid; grid-template-columns:repeat(3,1fr); gap:12px; width:min(100%, 330px); padding:14px; border-radius:26px;
  background:linear-gradient(160deg, rgba(255,255,255,.28), rgba(255,255,255,0) 50%), var(--grape);
  box-shadow:inset 0 -6px 0 rgba(0,0,0,.15), 0 8px 0 var(--grape-d), 0 16px 24px rgba(0,0,0,.3)}
.bd-cell{aspect-ratio:1; min-height:56px; border-radius:20%; cursor:pointer; padding:14%; transition:transform .1s}
.bd-cell:active{transform:translateY(3px)}
.bd-cell svg{width:100%; height:100%; overflow:visible; animation:bounceIn .35s cubic-bezier(.3,1.5,.5,1)}
.bd-cell.win{--c:var(--good-bg); --d:var(--leaf-d); animation:bd-pulse .7s ease-in-out infinite alternate}
.bd-mk path, .bd-mk circle{fill:none; stroke-linecap:round}
.bd-mk .sh{stroke:var(--d)} .bd-mk .fg{stroke:var(--c)}

/* four in a row */
.bd-four{display:grid; grid-template-columns:repeat(7,1fr); width:min(100%, 400px); padding:8px; border-radius:22px; container-type:inline-size;
  background:linear-gradient(160deg, rgba(255,255,255,.42), rgba(255,255,255,0) 45%), var(--sun);
  box-shadow:inset 0 -6px 0 rgba(0,0,0,.12), 0 8px 0 var(--sun-d), 0 16px 24px rgba(0,0,0,.3)}
.bd-col{display:grid; grid-template-rows:repeat(6,auto); border:0; background:none; padding:0; cursor:pointer; border-radius:14px; transition:background .15s}
.bd-col.bd-play:active{background:rgba(255,255,255,.35)}
.bd-hole{aspect-ratio:1; position:relative; margin:8%; border-radius:50%; background:var(--table-deep); box-shadow:inset 0 5px 7px rgba(0,0,0,.55), 0 2px 0 rgba(255,255,255,.55)}
.bd-hole .bd-ctr{position:absolute; inset:2%; width:auto; height:auto; font-size:6cqw; z-index:2}
.bd-ctr.fall{z-index:5; animation:bd-fall var(--t) linear both}
@keyframes bd-fall{0%{transform:translateY(var(--y)); animation-timing-function:cubic-bezier(.5,0,1,.6)} 78%{transform:translateY(0); animation-timing-function:ease-out} 88%{transform:translateY(-14%); animation-timing-function:ease-in} 100%{transform:translateY(0)}}
.bd-ctr.win{animation:bd-glow .6s ease-in-out infinite alternate; z-index:3}

/* draughts */
.bd-dr{display:grid; grid-template-columns:repeat(var(--n),1fr); width:min(100%, 410px); padding:10px; border-radius:18px; container-type:inline-size;
  background:linear-gradient(160deg, #A86E40, #5A361C); box-shadow:inset 0 -5px 0 rgba(0,0,0,.25), 0 8px 0 var(--wood-d), 0 16px 24px rgba(0,0,0,.35)}
.bd-sq{aspect-ratio:1; border:0; padding:0; display:grid; place-items:center; position:relative; background:#F6E7C8; cursor:pointer}
.bd-sq.dk{background:linear-gradient(150deg, #4FA06D, #2F7A4C)}
.bd-dr .bd-ctr{width:80%; height:80%; font-size:calc(100cqw / var(--n) * .4)}
.bd-ctr .bd-crown{position:absolute; top:-26%; left:50%; translate:-50% 0; font-size:150%; line-height:1; text-shadow:0 2px 0 rgba(0,0,0,.25); pointer-events:none}
.bd-ctr.king{box-shadow:inset 0 0 0 3px var(--sun), inset 0 -3px 0 rgba(0,0,0,.18), 0 4px 0 var(--d), 0 7px 10px rgba(0,0,0,.35)}
.bd-sq.bd-play .bd-ctr{animation:bd-glow .7s ease-in-out infinite alternate}
.bd-sq.must .bd-ctr{animation:bd-must .6s ease-in-out infinite alternate}
.bd-sq.sel .bd-ctr{transform:translateY(-8px) scale(1.16); animation:bd-glow .5s ease-in-out infinite alternate}
.bd-sq.must.sel .bd-ctr{animation:bd-must .5s ease-in-out infinite alternate}
.bd-sq.bd-target::after{content:""; position:absolute; width:46%; height:46%; border-radius:50%; background:rgba(255,255,255,.85); box-shadow:0 0 0 4px rgba(255,255,255,.4), 0 0 14px 4px rgba(255,255,255,.6); animation:bd-pulse .6s ease-in-out infinite alternate}
.bd-sq.bd-target.jump::after{background:var(--sun); box-shadow:0 0 0 4px rgba(255,194,52,.45), 0 0 16px 6px rgba(255,194,52,.8)}
.bd-sq.victim::before{content:"✕"; position:absolute; inset:0; display:grid; place-items:center; z-index:3; color:#fff; font:700 calc(100cqw / var(--n) * .55)/1 var(--display); text-shadow:0 0 6px #000, 0 2px 0 #000}
.bd-ctr.land{animation:bd-land .3s cubic-bezier(.3,1.5,.5,1)}
.bd-ctr.poof{animation:pop .45s forwards}

/* snakes & ladders */
.bd-snl{position:relative; width:min(100%, 410px); aspect-ratio:1; padding:7px; border-radius:18px; container-type:inline-size;
  background:linear-gradient(160deg, #A86E40, #5A361C); box-shadow:inset 0 -5px 0 rgba(0,0,0,.25), 0 8px 0 var(--wood-d), 0 16px 24px rgba(0,0,0,.35)}
.bd-snl svg{display:block; width:100%; height:100%; border-radius:10px}
.bd-snl .bd-lay{position:absolute; inset:7px; pointer-events:none}
.bd-tok{position:absolute; width:9%; height:9%; translate:-50% -50%; transition:left .17s ease-out, top .17s ease-out, margin .3s; z-index:4}
.bd-tok.slide{transition:left 1s ease-in-out, top 1s ease-in-out, margin .3s}
.bd-tok .bd-ctr{width:100%; height:100%; font-size:4.6cqw}
.bd-tok.hop .bd-ctr{animation:bd-hopk .17s ease-out}
.bd-tok.me{z-index:5}

/* ludo */
.bd-ludo{position:relative; display:grid; grid-template-columns:repeat(7,1fr); gap:3px; width:min(100%, 390px); padding:8px; border-radius:20px; container-type:inline-size;
  background:linear-gradient(160deg, rgba(255,255,255,.3), rgba(255,255,255,0) 45%), var(--grape); box-shadow:inset 0 -6px 0 rgba(0,0,0,.15), 0 8px 0 var(--grape-d), 0 16px 24px rgba(0,0,0,.3)}
.bd-lc{aspect-ratio:1; border-radius:22%; display:grid; place-items:center; font:700 6cqw/1 var(--display); color:rgba(24,36,44,.35)}
.bd-lc.tr{background:linear-gradient(155deg, #fff, var(--card)); box-shadow:inset 0 -4px 0 rgba(0,0,0,.08), 0 3px 0 var(--card-edge)}
.bd-lc.yy{background:color-mix(in srgb, var(--sky) 35%, #fff); box-shadow:inset 0 0 0 3px var(--sky)}
.bd-lc.yc{background:color-mix(in srgb, var(--coral) 35%, #fff); box-shadow:inset 0 0 0 3px var(--coral)}
.bd-lc.ly{background:var(--sky); box-shadow:inset 0 -4px 0 rgba(0,0,0,.12), 0 3px 0 var(--sky-d); color:rgba(255,255,255,.8)}
.bd-lc.lc{background:var(--coral); box-shadow:inset 0 -4px 0 rgba(0,0,0,.12), 0 3px 0 var(--coral-d); color:rgba(255,255,255,.8)}
.bd-lc.sy{background:color-mix(in srgb, var(--sky) 55%, #fff); box-shadow:inset 0 -4px 0 rgba(0,0,0,.08), 0 3px 0 var(--sky-d); color:#fff}
.bd-lc.sc{background:color-mix(in srgb, var(--coral) 55%, #fff); box-shadow:inset 0 -4px 0 rgba(0,0,0,.08), 0 3px 0 var(--coral-d); color:#fff}
.bd-lc.hm{background:linear-gradient(155deg, rgba(255,255,255,.5), rgba(255,255,255,0) 50%), var(--sun); box-shadow:inset 0 -4px 0 rgba(0,0,0,.12), 0 3px 0 var(--sun-d); font-size:8cqw}
.bd-lo{position:absolute; inset:8px; pointer-events:none}
.bd-lt{position:absolute; width:13.4%; height:13.4%; translate:-50% -50%; border:0; background:none; padding:0; display:grid; place-items:center; transition:left .2s ease-out, top .2s ease-out; z-index:3; pointer-events:auto; cursor:pointer}
.bd-lt .bd-ctr{width:78%; height:78%; font-size:5.5cqw}
.bd-lt.small .bd-ctr{width:58%; height:58%; font-size:4cqw}
.bd-lt.hop .bd-ctr{animation:bd-hopk .2s ease-out}
.bd-lt.bd-play{z-index:6}
.bd-lt.bd-play .bd-ctr{animation:bd-glow .6s ease-in-out infinite alternate}
`);

  const YOU = { c: 'sky', s: '★' }, CPU = { c: 'coral', s: '●' };
  const ctrHTML = (who, extra = '', inner) => `<span class="bd-ctr c-${who.c} ${extra}">${inner == null ? who.s : inner}</span>`;

  /* ---------- shared pieces ---------- */
  function scoreRow(mid, icons) {
    const row = el('div', 'bd-score');
    const mk = (who, name, ic) => el('span', 'bd-chip', `${ic || ctrHTML(who).replace('class="bd-ctr', 'style="--s:34px" class="bd-ctr')}<span>${name}</span><b class="bd-cv">0</b>`);
    const a = mk(YOU, 'You', icons && icons[0]), b = mk(CPU, 'Computer', icons && icons[1]), m = el('span', 'bd-mid', mid || '');
    row.append(a, m, b);
    return {
      el: row, mid: m,
      set(you, cpu) { a.querySelector('.bd-cv').textContent = you; b.querySelector('.bd-cv').textContent = cpu; },
      turn(t) { a.classList.toggle('on', t === 'you'); b.classList.toggle('on', t === 'cpu'); }
    };
  }
  function button(label, cls, fn) { const b = el('button', 'btn ' + cls, label); b.type = 'button'; b.onclick = fn; return b; }
  function finisher(api) {
    let doneYet = false;
    return (stars, ms = 1600) => { if (doneYet) return; doneYet = true; api.stage.dataset.turn = 'over'; api.later(() => api.done(stars), ms); };
  }

  const PIPS = { 1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const SHOW = { 1: [0, 0], 6: [0, -180], 2: [0, -90], 5: [0, 90], 3: [-90, 0], 4: [90, 0] };
  function makeDie(api, onTap) {
    const b = el('button', 'bd-die'); b.type = 'button'; b.setAttribute('aria-label', 'Dice: tap to roll');
    const cube = el('span', 'bd-cube');
    for (let v = 1; v <= 6; v++) cube.append(el('span', `bd-face bd-f${v} f${v}`, [...Array(9)].map((_, k) => `<i class="${PIPS[v].includes(k) ? 'on' : ''}"></i>`).join('')));
    b.append(el('span', 'bd-dshadow'), cube);
    let spins = 0;
    const set = v => { const [x, y] = SHOW[v]; cube.style.transform = `rotateX(-16deg) rotateY(20deg) rotateX(${x + 360 * spins}deg) rotateY(${y + 360 * spins}deg)`; };
    set(1 + randInt(6));
    b.onclick = () => onTap && onTap();
    return {
      el: b,
      roll(v, cb) {
        spins += 2; b.classList.remove('rolling'); void b.offsetWidth; b.classList.add('rolling'); set(v);
        for (let k = 0; k < 7; k++) tone(260 + randInt(160), .04, 'square', .035, k * .11);
        api.later(() => { b.classList.remove('rolling'); tone(520 + v * 40, .14, 'triangle', .12); cb(); }, 1050);
      },
      play(on) { b.classList.toggle('bd-play', on); }
    };
  }

  register({ id: 'noughts', cat: 'cards', order: 6, name: 'Noughts & Crosses', icon: '❌', desc: 'Get three in a row before the computer', gentle: true, start: startNoughts });
  register({ id: 'four', cat: 'cards', order: 7, name: 'Four in a Row', icon: '🔵', desc: 'Drop counters to line up four', start: startFour });
  register({ id: 'draughts', cat: 'cards', order: 8, name: 'Draughts', icon: '⛀', desc: 'Jump the computer’s pieces to win', start: startDraughts });
  register({ id: 'snakes', cat: 'cards', order: 9, name: 'Snakes & Ladders', icon: '🐍', desc: 'Roll the dice, climb up, slide down', gentle: true, start: startSnakes });
  register({ id: 'ludo', cat: 'cards', order: 10, name: 'Ludo', icon: '🎲', desc: 'Race your counters round and home', start: startLudo });

  /* =========================================================
     NOUGHTS & CROSSES
     ========================================================= */
  const LINES3 = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const WHERE3 = ['in the top left corner', 'at the top', 'in the top right corner', 'on the left', 'in the middle', 'on the right', 'in the bottom left corner', 'at the bottom', 'in the bottom right corner'];
  const svgX = '<svg class="bd-mk c-sky" viewBox="0 0 100 100"><path class="sh" d="M24 30L76 82M76 30L24 82" stroke-width="20"/><path class="fg" d="M24 24L76 76M76 24L24 76" stroke-width="20"/></svg>';
  const svgO = '<svg class="bd-mk c-coral" viewBox="0 0 100 100"><circle class="sh" cx="50" cy="56" r="28" stroke-width="18"/><circle class="fg" cx="50" cy="50" r="28" stroke-width="18"/></svg>';
  function line3(b) { for (const l of LINES3) if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return l; return null; }
  function mm3(b, p, depth) {
    const l = line3(b); if (l) return b[l[0]] === 'O' ? 10 - depth : depth - 10;
    if (b.every(Boolean)) return 0;
    let best = p === 'O' ? -99 : 99;
    for (let i = 0; i < 9; i++) if (!b[i]) {
      b[i] = p; const s = mm3(b, p === 'O' ? 'X' : 'O', depth + 1); b[i] = null;
      best = p === 'O' ? Math.max(best, s) : Math.min(best, s);
    }
    return best;
  }
  function startNoughts(L, api) {
    const rnd = Math.max(0, .6 - .05 * (L - 1)), smart = L >= 7;
    let b, turn = 'none', games = 0, wins = 0, losses = 0, starter = 'you';
    const finish = finisher(api);
    const score = scoreRow('Game 1 of 3', [svgX, svgO]);
    const grid = el('div', 'bd-ttt');
    const cells = [...Array(9)].map((_, i) => { const c = el('button', 'bd-cell tile c-card'); c.type = 'button'; c.setAttribute('aria-label', 'Empty square'); c.onclick = () => tap(i); grid.append(c); return c; });
    const wrap = el('div', 'bd-wrap'); wrap.append(score.el, grid); api.stage.append(wrap);
    function render() {
      cells.forEach((c, i) => {
        const want = b[i] || '';
        if (c.dataset.v !== want) { c.dataset.v = want; c.innerHTML = want === 'X' ? svgX : want === 'O' ? svgO : ''; c.setAttribute('aria-label', want ? (want === 'X' ? 'Your cross' : 'Computer’s nought') : 'Empty square'); }
        c.classList.toggle('bd-play', turn === 'you' && !b[i]);
        c.classList.remove('win');
      });
      score.set(wins, losses); score.turn(turn);
    }
    function setTurn(t) { turn = t; api.stage.dataset.turn = t; render(); }
    function newGame() {
      b = Array(9).fill(null); turn = 'none'; render();
      api.rounds(3, games); score.mid.textContent = `Game ${games + 1} of 3`;
      if (starter === 'you') { setTurn('you'); api.hint('You are ✕. Tap a square to put your cross there. Get three in a row!'); }
      else { api.hint('The computer goes first this time.'); cpuTurn(); }
    }
    function tap(i) {
      if (turn !== 'you') return;
      if (b[i]) { sfx.soft(); wob(cells[i]); api.hint('That square is taken. Pick an empty one.'); return; }
      b[i] = 'X'; tone(520, .12, 'triangle', .12); setTurn('cpu');
      if (!check()) cpuTurn();
    }
    function sensible() {
      const empty = b.map((v, i) => v ? -1 : i).filter(i => i >= 0);
      for (const p of ['O', 'X']) for (const i of empty) { b[i] = p; const w = line3(b); b[i] = null; if (w) return i; }
      if (!b[4] && Math.random() < .6) return 4;
      const corners = [0, 2, 6, 8].filter(i => !b[i]);
      return corners.length && Math.random() < .6 ? pick(corners) : pick(empty);
    }
    function cpuMove() {
      const empty = b.map((v, i) => v ? -1 : i).filter(i => i >= 0);
      if (Math.random() < rnd) return pick(empty);
      if (!smart) return sensible();
      let best = -99, opts = [];
      for (const i of empty) { b[i] = 'O'; const s = mm3(b, 'X', 1); b[i] = null; if (s > best) { best = s; opts = [i]; } else if (s === best) opts.push(i); }
      return pick(opts);
    }
    function cpuTurn() {
      setTurn('cpu'); if (b.some(Boolean)) api.hint('The computer is thinking…');
      api.later(() => {
        const m = cpuMove(); b[m] = 'O'; tone(392, .12, 'triangle', .1); render();
        if (!check()) { setTurn('you'); api.hint(`The computer put its ◯ ${WHERE3[m]}. Your turn.`); }
      }, 1000);
    }
    function check() {
      const l = line3(b), full = b.every(Boolean);
      if (!l && !full) return false;
      setTurn('none'); games++;
      if (l) {
        l.forEach(i => cells[i].classList.add('win'));
        if (b[l[0]] === 'X') { wins++; sfx.good(); toast(cheer()); api.hint('Three in a row. You win this game!'); }
        else { losses++; sfx.soft(); api.hint('The computer got three in a row this time.'); }
      } else { sfx.soft(); api.hint('It’s a draw. Nobody got three in a row.'); }
      score.set(wins, losses); api.rounds(3, games);
      api.later(() => {
        if (wins >= 2 || losses >= 2 || games >= 3) {
          const stars = wins > losses ? (losses ? 2 : 3) : wins === losses ? 2 : 1;
          api.hint(wins > losses ? `You won ${wins} game${wins > 1 ? 's' : ''} to ${losses}. Well played!` : wins === losses ? 'All square. A very close match!' : 'The computer won this time. Lovely playing, though!');
          finish(stars, 900);
        } else { starter = starter === 'you' ? 'cpu' : 'you'; newGame(); }
      }, 2000);
      return true;
    }
    newGame();
  }

  /* =========================================================
     FOUR IN A ROW
     ========================================================= */
  const FR = 6, FC = 7, ORDER = [3, 2, 4, 1, 5, 0, 6];
  const WINDOWS = [];
  for (let r = 0; r < FR; r++) for (let c = 0; c < FC; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const w = []; for (let k = 0; k < 4; k++) { const rr = r + dr * k, cc = c + dc * k; if (rr < 0 || rr >= FR || cc < 0 || cc >= FC) break; w.push(rr * FC + cc); }
    if (w.length === 4) WINDOWS.push(w);
  }
  const dropRow = (bd, c) => { for (let r = FR - 1; r >= 0; r--) if (!bd[r * FC + c]) return r; return -1; };
  function fourAt(bd, i) {
    const p = bd[i]; if (!p) return null;
    const r = Math.floor(i / FC), c = i % FC;
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const line = [i];
      for (const s of [1, -1]) { let rr = r + dr * s, cc = c + dc * s; while (rr >= 0 && rr < FR && cc >= 0 && cc < FC && bd[rr * FC + cc] === p) { line.push(rr * FC + cc); rr += dr * s; cc += dc * s; } }
      if (line.length >= 4) return line;
    }
    return null;
  }
  function eval4(bd, p) {
    const o = 3 - p; let s = 0;
    for (let r = 0; r < FR; r++) { const v = bd[r * FC + 3]; if (v === p) s += 3; else if (v === o) s -= 3; }
    for (const w of WINDOWS) {
      let a = 0, b = 0; for (const i of w) { if (bd[i] === p) a++; else if (bd[i] === o) b++; }
      if (a && b) continue;
      if (a === 3) s += 6; else if (a === 2) s += 2;
      if (b === 3) s -= 6; else if (b === 2) s -= 2;
    }
    return s;
  }
  function nega4(bd, depth, al, be, p) {
    let best = -Infinity, any = false;
    for (const c of ORDER) {
      const r = dropRow(bd, c); if (r < 0) continue; any = true;
      const i = r * FC + c; bd[i] = p;
      const s = fourAt(bd, i) ? 1000 + depth : depth <= 1 ? -eval4(bd, 3 - p) : -nega4(bd, depth - 1, -be, -al, 3 - p);
      bd[i] = 0;
      if (s > best) best = s; if (best > al) al = best; if (al >= be) break;
    }
    return any ? best : 0;
  }
  function startFour(L, api) {
    const depth = Math.min(6, 1 + Math.floor(L / 2.5)), rnd = Math.max(.04, .45 - .05 * (L - 1)), noise = Math.max(1.5, 6 - L * .4);
    const bd = Array(FR * FC).fill(0), hist = [];
    let turn = 'none', undos = 0;
    const finish = finisher(api);
    const score = scoreRow('');
    score.el.querySelectorAll('.bd-cv').forEach(x => x.remove());
    const board = el('div', 'bd-four'), holes = [], cols = [];
    for (let c = 0; c < FC; c++) {
      const col = el('button', 'bd-col'); col.type = 'button'; col.setAttribute('aria-label', 'Column ' + (c + 1));
      for (let r = 0; r < FR; r++) { const h = el('span', 'bd-hole'); holes[r * FC + c] = h; col.append(h); }
      col.onclick = () => tap(c); cols.push(col); board.append(col);
    }
    const undoBtn = button('↶ Undo', 'c-card', undo);
    const wrap = el('div', 'bd-wrap'); wrap.append(score.el, board, el('div', 'bd-bar')); wrap.lastChild.append(undoBtn);
    api.stage.append(wrap);
    function setTurn(t) {
      turn = t; api.stage.dataset.turn = t; score.turn(t);
      cols.forEach((col, c) => col.classList.toggle('bd-play', t === 'you' && dropRow(bd, c) >= 0));
      undoBtn.classList.toggle('bd-off', !(t === 'you' && hist.some(h => h.p === 2)));
    }
    function put(c, p) {
      const r = dropRow(bd, c), i = r * FC + c; bd[i] = p; hist.push({ i, p });
      const who = p === 2 ? YOU : CPU;
      holes[i].innerHTML = ctrHTML(who, 'fall');
      const cc = holes[i].firstChild; cc.style.setProperty('--y', `${-(r + 1) * 122}%`); cc.style.setProperty('--t', (.3 + r * .06) + 's');
      api.later(() => tone(p === 2 ? 300 : 240, .1, 'sine', .14), 280 + r * 50);
      return i;
    }
    function tap(c) {
      if (turn !== 'you') return;
      if (dropRow(bd, c) < 0) { sfx.soft(); wob(cols[c]); api.hint('That column is full. Try another one.'); return; }
      const i = put(c, 2); setTurn('cpu');
      if (!after(i, 2)) cpuTurn();
    }
    function cpuTurn() {
      setTurn('cpu'); api.hint('The computer is thinking…');
      api.later(() => {
        const legal = ORDER.filter(c => dropRow(bd, c) >= 0);
        let c;
        if (Math.random() < rnd) c = pick(legal);
        else {
          let best = -Infinity;
          for (const k of legal) {
            const r = dropRow(bd, k), i = r * FC + k; bd[i] = 1;
            let s = fourAt(bd, i) ? 5000 : depth <= 1 ? -eval4(bd, 2) : -nega4(bd, depth - 1, -Infinity, Infinity, 2);
            bd[i] = 0; s += Math.random() * noise;
            if (s > best) { best = s; c = k; }
          }
        }
        const i = put(c, 1);
        if (!after(i, 1)) { setTurn('you'); api.hint(`The computer dropped its ● in column ${c + 1}. Your turn: tap a column.`); }
      }, 1000);
    }
    function after(i, p) {
      const line = fourAt(bd, i);
      if (line) {
        setTurn('none');
        api.later(() => line.forEach(k => { const x = holes[k].firstChild; x.classList.remove('fall'); x.classList.add('win'); }), 600);
        if (p === 2) { api.later(() => { sfx.good(); toast(cheer()); }, 500); api.hint('Four in a row. You win!'); finish(undos <= 1 ? 3 : 2); }
        else { api.later(() => sfx.soft(), 500); api.hint('The computer made four in a row this time. Good game!'); finish(1); }
        return true;
      }
      if (bd.every(Boolean)) { setTurn('none'); api.hint('The board is full. It’s a draw!'); finish(2); return true; }
      return false;
    }
    function undo() {
      if (turn !== 'you' || !hist.some(h => h.p === 2)) return;
      sfx.tap(); undos++;
      let h; do { h = hist.pop(); bd[h.i] = 0; holes[h.i].innerHTML = ''; } while (h.p !== 2);
      setTurn('you'); api.hint('Taken back. Your turn: tap a column.');
    }
    setTurn('you');
    api.hint('You are the blue ★ counters. Tap a column to drop one in. Get four in a row!');
  }

  /* =========================================================
     DRAUGHTS
     ========================================================= */
  function startDraughts(L, api) {
    const N = L <= 1 ? 6 : 8, rows = N === 6 ? 2 : 3;
    const depth = L <= 2 ? 1 : L <= 5 ? 2 : L <= 8 ? 3 : 4;
    const rnd = Math.max(.05, .4 - .05 * (L - 1)), noise = Math.max(1.5, 8 - L);
    let bd = Array(N * N).fill(0);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if ((r + c) % 2) { if (r < rows) bd[r * N + c] = -1; if (r >= N - rows) bd[r * N + c] = 1; }
    let turn = 'none', moves = [], sel = null, prefix = null, cands = null, sinceCap = 0, undos = 0;
    const stack = [];
    const finish = finisher(api);
    const score = scoreRow('');
    const board = el('div', 'bd-dr'); board.style.setProperty('--n', N);
    const sqs = [...Array(N * N)].map((_, i) => { const s = el('button', 'bd-sq' + ((Math.floor(i / N) + i % N) % 2 ? ' dk' : '')); s.type = 'button'; s.onclick = () => tap(i); board.append(s); return s; });
    const undoBtn = button('↶ Undo', 'c-card', undo);
    const bar = el('div', 'bd-bar'); bar.append(undoBtn);
    const wrap = el('div', 'bd-wrap'); wrap.append(score.el, board, bar); api.stage.append(wrap);

    const dirs = (side, king) => king ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : [[side === 1 ? -1 : 1, -1], [side === 1 ? -1 : 1, 1]];
    function jumps(b, i, side, king, path, caps, out) {
      let found = false; const r = Math.floor(i / N), c = i % N;
      for (const [dr, dc] of dirs(side, king)) {
        const r2 = r + 2 * dr, c2 = c + 2 * dc; if (r2 < 0 || r2 >= N || c2 < 0 || c2 >= N) continue;
        const m = (r + dr) * N + c + dc, t = r2 * N + c2;
        if (b[m] * side < 0 && !b[t] && !caps.includes(m)) {
          found = true;
          const crown = !king && r2 === (side === 1 ? 0 : N - 1);
          const pv = b[i]; b[i] = 0; b[t] = pv;
          if (crown) out.push({ path: [...path, t], caps: [...caps, m] });
          else jumps(b, t, side, king, [...path, t], [...caps, m], out);
          b[t] = 0; b[i] = pv;
        }
      }
      if (!found && caps.length) out.push({ path, caps });
    }
    function gen(b, side) {
      const js = [], ss = [];
      for (let i = 0; i < N * N; i++) {
        if (b[i] * side <= 0) continue;
        const king = Math.abs(b[i]) === 2;
        jumps(b, i, side, king, [i], [], js);
        if (js.length) continue;
        const r = Math.floor(i / N), c = i % N;
        for (const [dr, dc] of dirs(side, king)) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < N && cc >= 0 && cc < N && !b[rr * N + cc]) ss.push({ path: [i, rr * N + cc], caps: [] }); }
      }
      return js.length ? js : ss;
    }
    function apply(b, m) {
      const n = b.slice(), p = n[m.path[0]], t = m.path[m.path.length - 1];
      n[m.path[0]] = 0; m.caps.forEach(k => { n[k] = 0; }); n[t] = p;
      const r = Math.floor(t / N); if (Math.abs(p) === 1 && r === (p > 0 ? 0 : N - 1)) n[t] = 2 * p;
      return n;
    }
    function evalB(b) {
      let s = 0;
      for (let i = 0; i < N * N; i++) {
        const v = b[i]; if (!v) continue; const r = Math.floor(i / N);
        const val = Math.abs(v) === 2 ? 16 : 10 + (v > 0 ? (N - 1 - r) : r) * .4;
        s += v < 0 ? val : -val;
      }
      return s;
    }
    function search(b, side, d, al, be) {
      const ms = gen(b, side);
      if (!ms.length) return side === -1 ? -1000 - d : 1000 + d;
      if (d <= 0) return evalB(b);
      if (side === -1) { let best = -Infinity; for (const m of ms) { best = Math.max(best, search(apply(b, m), 1, d - 1, al, be)); al = Math.max(al, best); if (al >= be) break; } return best; }
      let best = Infinity; for (const m of ms) { best = Math.min(best, search(apply(b, m), -1, d - 1, al, be)); be = Math.min(be, best); if (al >= be) break; } return best;
    }
    const count = side => bd.filter(v => v * side > 0).length;

    function render(fx = {}) {
      const must = turn === 'you' && moves.length && moves[0].caps.length > 0;
      const movable = new Set(turn === 'you' && !prefix ? moves.map(m => m.path[0]) : []);
      let targets = new Set(), victims = new Set();
      if (turn === 'you') {
        if (prefix) { cands.forEach(m => { targets.add(m.path[prefix.length]); victims.add(m.caps[prefix.length - 1]); }); }
        else if (sel !== null) moves.filter(m => m.path[0] === sel).forEach(m => { targets.add(m.path[1]); if (m.caps.length) victims.add(m.caps[0]); });
      }
      const cur = prefix ? prefix[prefix.length - 1] : sel;
      sqs.forEach((s, i) => {
        const v = bd[i];
        if (v) {
          const who = v > 0 ? YOU : CPU, king = Math.abs(v) === 2;
          s.innerHTML = ctrHTML(who, (king ? 'king ' : '') + (fx.land === i ? 'land' : ''), (king ? '<span class="bd-crown">👑</span>' : '') + who.s);
          s.setAttribute('aria-label', (v > 0 ? 'Your ' : 'Computer’s ') + (king ? 'king' : 'piece'));
        } else if (fx.poof && fx.poof.i === i) { s.innerHTML = ctrHTML(fx.poof.v > 0 ? YOU : CPU, 'poof'); s.setAttribute('aria-label', 'Empty square'); }
        else { s.innerHTML = ''; s.setAttribute('aria-label', (Math.floor(i / N) + i % N) % 2 ? 'Empty square' : 'Light square'); }
        s.classList.toggle('bd-play', movable.has(i) && cur !== i);
        s.classList.toggle('must', must && (movable.has(i) || cur === i));
        s.classList.toggle('sel', cur === i && turn === 'you');
        s.classList.toggle('bd-target', targets.has(i));
        s.classList.toggle('jump', targets.has(i) && must);
        s.classList.toggle('victim', victims.has(i));
      });
      score.set(count(1), count(-1)); score.turn(turn === 'you' || turn === 'cpu' ? turn : '');
      undoBtn.classList.toggle('bd-off', !(turn === 'you' && (stack.length > 1 || prefix || sel !== null)));
      api.stage.dataset.turn = turn;
    }
    function snapshot() { stack.push({ bd: bd.slice(), sinceCap }); }
    function yourTurn(msg) {
      turn = 'you'; moves = gen(bd, 1); sel = null; prefix = null; cands = null;
      if (!moves.length) return end('cpu');
      snapshot();
      api.hint((msg ? msg + ' ' : '') + (moves[0].caps.length ? 'You must jump! Tap a glowing piece, then the yellow square.' : 'Your turn. Tap one of your ★ pieces, then tap where it should go.'));
      render();
    }
    function tap(i) {
      if (turn !== 'you') return;
      if (prefix) {
        if (cands.some(m => m.path[prefix.length] === i)) hop(i);
        else { sfx.soft(); api.hint('Keep jumping! Tap the yellow square.'); }
        return;
      }
      if (moves.some(m => m.path[0] === i)) { sel = sel === i ? null : i; sfx.tap(); render(); if (sel !== null) api.hint(moves[0].caps.length ? 'Now tap the yellow square to jump.' : 'Now tap a glowing square to move there.'); return; }
      if (sel !== null && moves.some(m => m.path[0] === sel && m.path[1] === i)) { prefix = [sel]; cands = moves.filter(m => m.path[0] === sel); hop(i); return; }
      if (bd[i] > 0) { sfx.soft(); wob(sqs[i]); api.hint(moves[0].caps.length ? 'You must jump this turn. Try a glowing piece.' : 'That piece can’t move just now. Try a glowing one.'); }
      else if (sel !== null) { sfx.soft(); api.hint('Tap one of the glowing squares, or pick another piece.'); }
    }
    function step(from, to, cap) {
      const v = bd[from]; bd[to] = v; bd[from] = 0; let poof = null;
      if (cap != null) { poof = { i: cap, v: bd[cap] }; bd[cap] = 0; tone(660, .1, 'triangle', .12); api.later(() => tone(880, .12, 'triangle', .1), 90); }
      else tone(v > 0 ? 440 : 330, .08, 'triangle', .1);
      return poof;
    }
    function crownIfNeeded(t) {
      const r = Math.floor(t / N), v = bd[t];
      if (Math.abs(v) === 1 && r === (v > 0 ? 0 : N - 1)) { bd[t] = 2 * v; return true; }
      return false;
    }
    function hop(i) {
      const k = prefix.length; prefix.push(i);
      cands = cands.filter(m => m.path[k] === i);
      const poof = step(prefix[k - 1], i, cands[0].caps.length ? cands[0].caps[k - 1] : null);
      const doneMove = cands.find(m => m.path.length === prefix.length);
      if (doneMove) {
        const crowned = crownIfNeeded(i), m = doneMove;
        sinceCap = m.caps.length ? 0 : sinceCap + 1;
        turn = 'cpu'; prefix = null; cands = null; sel = null; render({ land: i, poof });
        if (crowned) { toast('Crowned! 👑'); sfx.good(); }
        else if (m.caps.length > 1) toast(cheer());
        if (!checkEnd(-1)) cpuTurn(m.caps.length ? `You jumped ${m.caps.length > 1 ? m.caps.length + ' pieces' : 'a piece'}!` : '');
      } else { render({ land: i, poof }); api.hint('Keep jumping! Tap the next yellow square.'); }
    }
    function checkEnd(next) {
      if (!count(next) || !gen(bd, next).length) { end(next === 1 ? 'cpu' : 'you'); return true; }
      if (sinceCap >= 50) { const a = count(1), b = count(-1); end(a > b ? 'you' : b > a ? 'cpu' : 'draw', true); return true; }
      return false;
    }
    function cpuTurn(pre) {
      turn = 'cpu'; render(); api.hint((pre ? pre + ' ' : '') + 'The computer is thinking…');
      api.later(() => {
        const ms = gen(bd, -1); let m;
        if (Math.random() < rnd) m = pick(ms);
        else { let best = -Infinity; for (const x of ms) { const s = search(apply(bd, x), 1, depth - 1, -Infinity, Infinity) + Math.random() * noise; if (s > best) { best = s; m = x; } } }
        const go = k => {
          const poof = step(m.path[k - 1], m.path[k], m.caps.length ? m.caps[k - 1] : null);
          const last = k === m.path.length - 1;
          const crowned = last && crownIfNeeded(m.path[k]);
          render({ land: m.path[k], poof });
          if (!last) { api.later(() => go(k + 1), 600); return; }
          sinceCap = m.caps.length ? 0 : sinceCap + 1;
          if (m.caps.length) sfx.soft();
          if (checkEnd(1)) return;
          const msg = m.caps.length ? `The computer jumped ${m.caps.length > 1 ? m.caps.length + ' of your pieces' : 'one of your pieces'}.` : crowned ? 'The computer got a king.' : 'The computer moved.';
          api.later(() => yourTurn(msg), 350);
        };
        go(1);
      }, 900);
    }
    function undo() {
      if (turn !== 'you') return;
      if (!prefix && sel === null && stack.length < 2) return;
      sfx.tap();
      if (!prefix && sel !== null) { sel = null; render(); api.hint('Pick a piece to move.'); return; }
      if (!prefix) { stack.pop(); undos++; }
      const s = stack.pop(); bd = s.bd.slice(); sinceCap = s.sinceCap;
      yourTurn('Taken back.');
    }
    function end(w, slow) {
      turn = 'over'; render();
      if (w === 'you') { sfx.good(); toast(cheer()); api.hint(slow ? 'Time’s up, and you have more pieces. You win!' : 'The computer can’t move. You win!'); finish(undos <= 2 ? 3 : 2); }
      else if (w === 'cpu') { sfx.soft(); api.hint(slow ? 'Time’s up. The computer has more pieces this time. Good game!' : 'The computer won this one. Well played, though!'); finish(1); }
      else { api.hint('Time’s up, and you have the same number of pieces. A draw!'); finish(2); }
    }
    yourTurn(N === 6 ? 'A small board to start.' : '');
  }

  /* =========================================================
     SNAKES & LADDERS
     ========================================================= */
  const sqXY = n => { const r = Math.floor((n - 1) / 10), k = (n - 1) % 10, c = r % 2 ? 9 - k : k; return [c * 10 + 5, (9 - r) * 10 + 5]; };
  const rowOf = n => Math.floor((n - 1) / 10);
  function genSnL(L) {
    const used = new Set([1, 100]), lad = [], snk = [];
    const nL = 5 + randInt(2), nS = 4 + Math.min(2, Math.floor((L + randInt(4)) / 5));
    const segs = [];
    const cross = (p, q) => {
      const [a, b] = p.map(sqXY), [c, d] = q.map(sqXY), o = (u, v, w) => Math.sign((v[0] - u[0]) * (w[1] - u[1]) - (v[1] - u[1]) * (w[0] - u[0]));
      return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
    };
    const fits = (x, y, g) => { const cx = Math.abs(sqXY(x)[0] - sqXY(y)[0]); return cx <= 40 && (g > 500 || !segs.some(sg => cross(sg, [x, y]))); };
    let g = 0;
    while (lad.length < nL && g++ < 800) {
      const a = 2 + randInt(78), b = Math.min(99, a + 9 + randInt(26));
      if (rowOf(b) <= rowOf(a) || used.has(a) || used.has(b) || lad.some(([x]) => Math.abs(x - a) < 3) || !fits(a, b, g)) continue;
      segs.push([a, b]);
      lad.push([a, b]); used.add(a); used.add(b);
    }
    g = 0;
    while (snk.length < nS && g++ < 800) {
      const h = 14 + randInt(85), t = h - 8 - randInt(Math.min(24, h - 11));
      if (t < 2 || rowOf(t) >= rowOf(h) || used.has(h) || used.has(t) || snk.some(([x]) => Math.abs(x - h) < 4) || !fits(h, t, g)) continue;
      segs.push([h, t]);
      snk.push([h, t]); used.add(h); used.add(t);
    }
    return { lad, snk };
  }
  const SQCOL = ['#FFE7A0', '#C9EBFF', '#CFF3D9', '#FFD6E2', '#E6DCFF'];
  const SNCOL = ['leaf', 'berry', 'orange', 'grape', 'sky'];
  function drawSnL(map) {
    let s = '<svg viewBox="0 0 100 100" aria-hidden="true">';
    for (let n = 1; n <= 100; n++) {
      const [x, y] = sqXY(n), r = rowOf(n), c = (x - 5) / 10;
      s += `<rect x="${x - 5}" y="${y - 5}" width="10" height="10" fill="${SQCOL[(r * 2 + c) % 5]}"/>`;
      s += `<text x="${x - 4.1}" y="${y - 1.6}" font-size="2.9" font-family="Fredoka, sans-serif" font-weight="600" fill="rgba(24,36,44,.5)">${n}</text>`;
    }
    { const [x, y] = sqXY(100); s += `<text x="${x}" y="${y + 3}" font-size="6" text-anchor="middle">🏆</text>`; }
    map.lad.forEach(([a, b]) => {
      const [x1, y1] = sqXY(a), [x2, y2] = sqXY(b), dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), px = -dy / len * 2.1, py = dx / len * 2.1;
      const rail = (o, col, w, sh) => `<line x1="${x1 + px * o}" y1="${y1 + py * o + sh}" x2="${x2 + px * o}" y2="${y2 + py * o + sh}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
      let rungs = ''; const nR = Math.max(2, Math.floor(len / 3.4));
      for (let k = 1; k < nR; k++) { const t = k / nR, cx = x1 + dx * t, cy = y1 + dy * t; rungs += `<line x1="${cx + px}" y1="${cy + py}" x2="${cx - px}" y2="${cy - py}" stroke="#D99A5B" stroke-width="1.1" stroke-linecap="round"/>`; }
      s += `<g>${rail(1, '#4A2B15', 1.7, .5)}${rail(-1, '#4A2B15', 1.7, .5)}${rungs}${rail(1, '#A8662F', 1.3, 0)}${rail(-1, '#A8662F', 1.3, 0)}</g>`;
    });
    map.snk.forEach(([h, t], k) => {
      const [x1, y1] = sqXY(h), [x2, y2] = sqXY(t), dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
      const waves = Math.max(1.5, len / 15), col = SNCOL[k % SNCOL.length];
      const pts = []; for (let j = 0; j <= 40; j++) { const t2 = j / 40, a = 2.6 * Math.sin(t2 * waves * Math.PI * 2) * Math.min(1, t2 * 5) * (1 - t2 * .4); pts.push([x1 + dx * t2 + nx * a, y1 + dy * t2 + ny * a]); }
      const d = 'M' + pts.map(p => p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' L');
      s += `<g><path d="${d}" fill="none" style="stroke:var(--${col}-d)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 .5)"/>
        <path d="${d}" fill="none" style="stroke:var(--${col})" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${d}" fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".9" stroke-dasharray="1.2 2.6" stroke-linecap="round"/>
        <ellipse cx="${x1}" cy="${y1}" rx="3.4" ry="3" style="fill:var(--${col});stroke:var(--${col}-d)" stroke-width=".5"/>
        <circle cx="${x1 - 1.2}" cy="${y1 - .8}" r="1" fill="#fff"/><circle cx="${x1 + 1.2}" cy="${y1 - .8}" r="1" fill="#fff"/>
        <circle cx="${x1 - 1.05}" cy="${y1 - .6}" r=".5" fill="#18242C"/><circle cx="${x1 + 1.35}" cy="${y1 - .6}" r=".5" fill="#18242C"/>
        <path d="M${x1 - 1.3} ${y1 + .9} Q${x1} ${y1 + 2.1} ${x1 + 1.3} ${y1 + .9}" fill="none" stroke="#18242C" stroke-width=".45" stroke-linecap="round"/>
        <circle cx="${x1 - 2.1}" cy="${y1 + .7}" r=".55" fill="rgba(255,120,150,.6)"/><circle cx="${x1 + 2.1}" cy="${y1 + .7}" r=".55" fill="rgba(255,120,150,.6)"/></g>`;
    });
    return s + '</svg>';
  }
  function startSnakes(L, api) {
    const map = genSnL(L);
    const jumpTo = {}; map.lad.forEach(([a, b]) => { jumpTo[a] = b; }); map.snk.forEach(([h, t]) => { jumpTo[h] = t; });
    const pos = { you: 1, cpu: 1 };
    let turn = 'none';
    const finish = finisher(api);
    const score = scoreRow('');
    const board = el('div', 'bd-snl', drawSnL(map));
    const lay = el('div', 'bd-lay'); board.append(lay);
    const toks = { you: el('div', 'bd-tok me', ctrHTML(YOU)), cpu: el('div', 'bd-tok', ctrHTML(CPU)) };
    lay.append(toks.cpu, toks.you);
    const die = makeDie(api, roll);
    const rollBtn = button('🎲 Roll', 'c-sun bd-roll', roll);
    const bar = el('div', 'bd-bar'); bar.append(die.el, rollBtn);
    const wrap = el('div', 'bd-wrap'); wrap.append(score.el, board, bar); api.stage.append(wrap);
    function place() {
      ['you', 'cpu'].forEach(s => {
        const [x, y] = sqXY(Math.min(100, pos[s])), t = toks[s]; t.style.left = x + '%'; t.style.top = y + '%';
        const same = pos.you === pos.cpu; t.style.margin = same ? (s === 'you' ? '-1.6% 0 0 -2.2%' : '1.6% 0 0 2.2%') : '0';
      });
      score.set(Math.min(100, pos.you), Math.min(100, pos.cpu));
    }
    function setTurn(t) {
      turn = t; api.stage.dataset.turn = t; score.turn(t);
      const mine = t === 'you'; die.play(mine); rollBtn.classList.toggle('bd-off', !mine); rollBtn.classList.toggle('bd-play', mine);
    }
    function roll() {
      if (turn !== 'you') return;
      setTurn('rolling'); score.turn('you'); sfx.tap();
      const v = 1 + randInt(6);
      die.roll(v, () => { api.hint(`You rolled ${v}!`); move('you', v, () => next('you', v)); });
    }
    function move(side, v, cb) {
      const target = Math.min(100, pos[side] + v); let k = 0;
      toks[side].classList.remove('slide');
      const hopOne = () => {
        pos[side]++; k++; const t = toks[side];
        t.classList.remove('hop'); void t.offsetWidth; t.classList.add('hop'); place();
        tone(380 + pos[side] * 4, .07, 'triangle', .09);
        if (pos[side] < target) api.later(hopOne, 230); else api.later(land, 380);
      };
      const land = () => {
        const to = jumpTo[pos[side]];
        if (to) {
          const up = to > pos[side], who = side === 'you' ? 'You' : 'The computer';
          api.hint(up ? `A ladder! ${who} climb${side === 'you' ? '' : 's'} up to ${to}.` : `Oops, a snake! ${who} slide${side === 'you' ? '' : 's'} down to ${to}.`);
          if (up) [0, 1, 2, 3].forEach(i => tone(440 + i * 110, .12, 'triangle', .1, i * .12)); else [0, 1, 2].forEach(i => tone(500 - i * 90, .14, 'sine', .1, i * .14));
          toks[side].classList.add('slide'); pos[side] = to; place();
          api.later(cb, 1300);
        } else cb();
      };
      if (pos[side] >= 100) return cb();
      hopOne();
    }
    function next(side, v) {
      if (pos[side] >= 100) {
        setTurn('none');
        if (side === 'you') { sfx.good(); toast(cheer()); api.hint('You reached square 100. You win!'); finish(3); }
        else { api.hint('The computer reached 100 first. What a fun race, and well played!'); finish(2); }
        return;
      }
      if (side === 'you') {
        setTurn('cpu'); api.hint(`You are on square ${pos.you}. Now the computer rolls…`);
        api.later(() => {
          const w = 1 + randInt(6);
          die.roll(w, () => { api.hint(`The computer rolled ${w}.`); move('cpu', w, () => next('cpu', w)); });
        }, 1100);
      } else {
        setTurn('you'); api.hint(`The computer is on square ${pos.cpu}. Your turn: tap the dice to roll.`);
      }
    }
    place(); setTurn('you');
    api.hint('Race to square 100! Ladders take you up, snakes slide you down. Tap the dice to roll.');
  }

  /* =========================================================
     LUDO (simplified: 7x7 board, one lap, home lane)
     ========================================================= */
  const LOOP = [[6, 3], [6, 2], [6, 1], [6, 0], [5, 0], [4, 0], [3, 0], [2, 0], [1, 0], [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [6, 5], [6, 4]];
  const LEND = 26, SAFE = [1, 13];
  const LSIDE = {
    you: { who: YOU, off: 1, lane: [[5, 3], [4, 3]], yard: [[4, 1], [4, 2], [5, 1], [5, 2]] },
    cpu: { who: CPU, off: 13, lane: [[1, 3], [2, 3]], yard: [[1, 4], [1, 5], [2, 4], [2, 5]] }
  };
  function startLudo(L, api) {
    const n = L <= 1 ? 2 : L <= 3 ? 3 : 4;
    const rnd = Math.max(.08, .6 - .08 * (L - 1));
    const st = { you: Array(n).fill(-1), cpu: Array(n).fill(-1) };
    let turn = 'none', tries = 0, picking = null, roll = 0;
    const finish = finisher(api);
    const score = scoreRow('');
    const board = el('div', 'bd-ludo');
    const kind = {};
    LOOP.forEach(([r, c], i) => { kind[r * 7 + c] = i === 1 ? 'sy' : i === 13 ? 'sc' : 'tr'; });
    LSIDE.you.lane.forEach(([r, c]) => { kind[r * 7 + c] = 'ly'; }); LSIDE.cpu.lane.forEach(([r, c]) => { kind[r * 7 + c] = 'lc'; });
    LSIDE.you.yard.forEach(([r, c]) => { kind[r * 7 + c] = 'yy'; }); LSIDE.cpu.yard.forEach(([r, c]) => { kind[r * 7 + c] = 'yc'; });
    kind[24] = 'hm';
    for (let i = 0; i < 49; i++) {
      const k = kind[i] || '';
      board.append(el('div', 'bd-lc ' + k, k === 'hm' ? '🏠' : k === 'sy' || k === 'sc' ? '✦' : k === 'ly' ? '▲' : k === 'lc' ? '▼' : ''));
    }
    const lay = el('div', 'bd-lo'); board.append(lay);
    const toks = { you: [], cpu: [] };
    ['cpu', 'you'].forEach(s => { for (let k = 0; k < n; k++) { const t = el('button', 'bd-lt', ctrHTML(LSIDE[s].who)); t.type = 'button'; t.setAttribute('aria-label', s === 'you' ? 'Your counter' : 'Computer’s counter'); t.onclick = () => tapTok(s, k); lay.append(t); toks[s].push(t); } });
    const die = makeDie(api, doRoll);
    const rollBtn = button('🎲 Roll', 'c-sun bd-roll', doRoll);
    const bar = el('div', 'bd-bar'); bar.append(die.el, rollBtn);
    const wrap = el('div', 'bd-wrap'); wrap.append(score.el, board, bar); api.stage.append(wrap);

    const cellOf = (s, p, k) => p < 0 ? LSIDE[s].yard[k] : p < 24 ? LOOP[(LSIDE[s].off + p) % 24] : p < LEND ? LSIDE[s].lane[p - 24] : [3, 3];
    const loopIdx = (s, p) => p >= 0 && p < 24 ? (LSIDE[s].off + p) % 24 : -1;
    const other = s => s === 'you' ? 'cpu' : 'you';
    const home = s => st[s].filter(p => p >= LEND).length;
    const OFFS = [[-.2, -.2], [.2, .2], [.2, -.2], [-.2, .2]];
    function place() {
      const groups = {};
      ['you', 'cpu'].forEach(s => st[s].forEach((p, k) => { const [r, c] = cellOf(s, p, k), key = r * 7 + c; (groups[key] = groups[key] || []).push([s, k]); }));
      Object.entries(groups).forEach(([key, list]) => {
        const r = Math.floor(key / 7), c = key % 7;
        list.forEach(([s, k], j) => {
          const o = list.length > 1 ? OFFS[j % 4] : [0, 0], t = toks[s][k];
          t.style.left = ((c + .5 + o[0]) / 7 * 100) + '%'; t.style.top = ((r + .5 + o[1]) / 7 * 100) + '%';
          t.classList.toggle('small', list.length > 1);
        });
      });
      score.set(`${home('you')}/${n}`, `${home('cpu')}/${n}`);
    }
    function setTurn(t) {
      turn = t; api.stage.dataset.turn = t; score.turn(t === 'you' || t === 'pick' ? 'you' : t === 'cpu' ? 'cpu' : '');
      const r = t === 'you'; die.play(r); rollBtn.classList.toggle('bd-off', !r); rollBtn.classList.toggle('bd-play', r);
      ['you', 'cpu'].forEach(s => toks[s].forEach((x, k) => x.classList.toggle('bd-play', t === 'pick' && s === 'you' && picking && picking.some(m => m.from === st.you[k]))));
    }
    function legal(s, v) {
      const seen = new Set(), out = [];
      st[s].forEach(p => {
        if (seen.has(p) || p >= LEND) return; seen.add(p);
        if (p < 0) { if (v === 6) out.push({ from: -1, to: 0 }); } else out.push({ from: p, to: Math.min(LEND, p + v) });
      });
      return out;
    }
    function beginTurn(s, msg) {
      tries = 0; picking = null;
      if (s === 'you') { setTurn('you'); api.hint((msg ? msg + ' ' : '') + 'Your turn: tap the dice to roll.'); }
      else { setTurn('cpu'); api.hint((msg ? msg + ' ' : '') + 'The computer’s turn…'); api.later(() => doRollFor('cpu'), 1000); }
    }
    function doRoll() { if (turn === 'you') { sfx.tap(); doRollFor('you'); } }
    function doRollFor(s) {
      setTurn(s === 'you' ? 'rolling' : 'cpu'); if (s === 'you') score.turn('you');
      roll = 1 + randInt(6);
      die.roll(roll, () => rolled(s, roll));
    }
    function rolled(s, v) {
      const ms = legal(s, v), who = s === 'you' ? 'You' : 'The computer';
      if (!ms.length) {
        const noneOut = st[s].every(p => p < 0 || p >= LEND);
        if (noneOut && ++tries < 3) {
          api.hint(`${who} rolled ${v}. A 6 is needed to come out. ${s === 'you' ? 'Roll again!' : 'It rolls again…'}`);
          if (s === 'you') setTurn('you'); else api.later(() => doRollFor('cpu'), 1200);
          return;
        }
        api.hint(`${who} rolled ${v}. ${noneOut ? 'No 6 this time.' : 'No move this time.'}`);
        api.later(() => beginTurn(other(s), ''), 1400);
        return;
      }
      if (s === 'cpu') { const m = cpuPick(ms); api.later(() => moveTok(s, m, v), 700); return; }
      if (ms.length === 1) { api.hint(`You rolled ${v}.`); api.later(() => moveTok(s, ms[0], v), 600); return; }
      picking = ms; setTurn('pick');
      api.hint(`You rolled ${v}. Tap a glowing counter to move it.`);
    }
    function tapTok(s, k) {
      if (turn !== 'pick' || s !== 'you') { if (turn === 'you') api.hint('Tap the dice to roll first.'); return; }
      const m = picking.find(x => x.from === st.you[k]);
      if (!m) { sfx.soft(); wob(toks.you[k]); api.hint(`That one can’t move with a ${roll}. Tap a glowing counter.`); return; }
      picking = null; setTurn('moving'); sfx.tap(); moveTok('you', m, roll);
    }
    function cpuPick(ms) {
      if (Math.random() < rnd) return pick(ms);
      let best = -Infinity, bm = ms[0];
      ms.forEach(m => {
        let sc = m.to * .5 + Math.random() * 2;
        if (m.from < 0) sc += 20;
        if (m.to >= LEND) sc += 30;
        const li = loopIdx('cpu', m.to);
        if (li >= 0 && !SAFE.includes(li) && st.you.some(p => loopIdx('you', p) === li)) sc += 45;
        if (li >= 0 && !SAFE.includes(li) && L >= 3 && st.you.some(p => { const q = loopIdx('you', p); return q >= 0 && ((li - q + 24) % 24) >= 1 && ((li - q + 24) % 24) <= 6; })) sc -= 8;
        if (sc > best) { best = sc; bm = m; }
      });
      return bm;
    }
    function moveTok(s, m, v) {
      setTurn(s === 'you' ? 'moving' : 'cpu');
      const k = st[s].indexOf(m.from), t = toks[s][k];
      const hopTo = p => { st[s][k] = p; t.classList.remove('hop'); void t.offsetWidth; t.classList.add('hop'); place(); tone(360 + p * 12, .07, 'triangle', .09); };
      const steps = m.from < 0 ? [0] : []; for (let p = m.from + 1; p <= m.to && m.from >= 0; p++) steps.push(p);
      steps.forEach((p, j) => api.later(() => hopTo(p), j * 240));
      api.later(() => arrive(s, k, m, v), steps.length * 240 + 250);
    }
    function arrive(s, k, m, v) {
      const p = st[s][k], o = other(s), li = loopIdx(s, p), mine = s === 'you';
      let msg = m.from < 0 ? (mine ? 'You brought a counter out.' : 'The computer brought a counter out.') : p >= LEND ? (mine ? 'One of your counters is home!' : 'A computer counter got home.') : (mine ? `You moved ${v}.` : `The computer moved ${v}.`);
      if (p >= LEND) { if (mine) { sfx.good(); toast('Home! 🏠'); } else tone(500, .15, 'triangle', .1); }
      if (li >= 0 && !SAFE.includes(li)) {
        const hit = st[o].map((q, j) => loopIdx(o, q) === li ? j : -1).filter(j => j >= 0);
        if (hit.length) {
          hit.forEach(j => { st[o][j] = -1; }); place();
          if (mine) { sfx.good(); toast('Bumped! 💥'); msg = 'You sent a computer counter back to its start!'; }
          else { sfx.soft(); msg = 'The computer sent one of your counters back to start. Never mind!'; }
        }
      }
      if (home(s) === n) {
        setTurn('none');
        if (mine) { toast(cheer()); api.hint('All your counters are home. You win!'); finish(3); }
        else { api.hint(`The computer got all its counters home first. You got ${home('you')} home. Good game!`); finish(1); }
        return;
      }
      if (v === 6) { api.later(() => beginTurn(s, msg + ' A six means another go!'), 700); }
      else api.later(() => beginTurn(o, msg), 700);
    }
    place(); beginTurn('you', `Get all your ★ counters round the board and home to 🏠. Roll a 6 to bring one out.`);
  }
})();
