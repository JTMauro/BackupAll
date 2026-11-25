/* Recall: Logic 4 (Tower Shift, Matchstick Maths, Light Beam, Measuring Jugs, River Crossing).
   Every level is generated fresh. Tower Shift uses the recursive optimal-move rule, Matchstick Maths
   enumerates every one-stick fix, Light Beam is built from a solved beam path, and the Jugs and
   River puzzles are checked (and hinted) with a breadth-first search. */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor, CUBES } = R;
  const TEST = !!window.__recallTest; // test hooks only exist when a test harness sets this before load
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function mkBtn(html, cls, fn) { const b = el('button', 'btn ' + cls, html); b.type = 'button'; b.onclick = fn; return b; }
  function tip(...els) { els.forEach(b => { if (!b) return; b.classList.remove('l4-tip'); void b.getBoundingClientRect(); b.classList.add('l4-tip'); }); }
  function untip(root) { root.querySelectorAll('.l4-tip').forEach(e => e.classList.remove('l4-tip')); }
  function rise(n) { for (let i = 0; i < n; i++) tone(440 * Math.pow(1.19, i), .14, 'triangle', .1, i * .08); }

  R.css(`
/* ---- shared (l4-) ---- */
.l4-bar{display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:12px; margin-top:16px}
.l4-bar .btn{min-height:58px; font-size:1.08rem; padding:.5em .95em}
.l4-bar .btn:disabled{opacity:.4; cursor:default}
.l4-info{font:600 1.15rem/1.3 var(--display); color:var(--on-table-soft); text-align:center; margin:12px 0 0}
.l4-info b{color:var(--on-table)}
.l4-tip{animation:l4glow 1.1s 3}
@keyframes l4glow{50%{outline:5px solid #fff; outline-offset:3px; filter:brightness(1.15)}}

/* ---- Tower Shift (hn-) ---- */
.hn-board{position:relative; width:min(100%, 540px); margin:0 auto; border-radius:22px; background:rgba(0,0,0,.16); box-shadow:inset 0 4px 12px rgba(0,0,0,.25)}
.hn-peg{position:absolute; top:0; bottom:0; width:33.333%; border:0; padding:0; background:none; cursor:pointer; border-radius:20px}
.hn-peg::before{content:""; position:absolute; left:50%; bottom:16px; width:14px; margin-left:-7px; height:var(--rod); border-radius:8px 8px 0 0;
  background:linear-gradient(90deg, #8A5527, #D59A5C 40%, #8A5527); box-shadow:0 0 0 2px rgba(0,0,0,.12)}
.hn-peg::after{content:""; position:absolute; left:6%; right:6%; bottom:4px; height:16px; border-radius:9px; background:linear-gradient(#C98A4B, #8A5527); box-shadow:0 4px 0 #5E3415}
.hn-peg.goal::after{background:linear-gradient(#FFE07A, #FFC234); box-shadow:0 4px 0 var(--sun-d), 0 0 14px rgba(255,226,120,.8)}
.hn-peg.sel{background:rgba(255,255,255,.12)}
.hn-disc{position:absolute; height:var(--dh); transform:translateX(-50%); border-radius:14px; pointer-events:none; font:700 1.15rem/1 var(--display);
  transition:left .2s ease-in-out, bottom .2s ease-in-out; z-index:2}
.hn-disc.up{z-index:3; filter:drop-shadow(0 0 8px rgba(255,255,255,.7))}
.hn-disc span{text-shadow:0 1px 0 rgba(255,255,255,.4)}
.hn-labels{display:grid; grid-template-columns:repeat(3, 1fr); width:min(100%, 540px); margin:8px auto 0; text-align:center; font:600 1.05rem var(--display); color:var(--on-table-soft)}
.hn-labels .g{color:var(--sun)}
.hn-board.won .hn-disc{animation:bounceIn .5s backwards}

/* ---- Matchstick Maths (mt-) ---- */
.mt-box{max-width:760px; margin:0 auto; display:grid; gap:12px; justify-items:center}
.mt-pane{width:100%; padding:14px 10px; border-radius:24px; background:linear-gradient(160deg, #2E4A3A, #1F3529); box-shadow:inset 0 0 0 5px #6B4A2A, 0 8px 0 #4A2B15, 0 16px 24px rgba(0,0,0,.35)}
.mt-svg{display:block; width:100%; height:auto; margin:0 auto; touch-action:manipulation; cursor:pointer; overflow:visible}
.mt-edge{stroke:#93652B; stroke-width:14; stroke-linecap:round}
.mt-wood{stroke:#F7DCA6; stroke-width:9; stroke-linecap:round}
.mt-head{fill:#E5432E; stroke:#9E2416; stroke-width:2}
.mt-fixed .mt-wood{stroke:#E8CC96}
.mt-slot{stroke:rgba(255,255,255,.16); stroke-width:8; stroke-linecap:round; stroke-dasharray:1 9}
.mt-svg.lifting .mt-slot{stroke:rgba(255,236,150,.6); animation:mtBlink 1s infinite alternate}
@keyframes mtBlink{from{opacity:.45} to{opacity:1}}
.mt-st{transition:transform .15s}
.mt-up{transform:translate(0, -7px); filter:drop-shadow(0 0 5px #FFE38A) drop-shadow(0 0 2px #fff)}
.mt-new{animation:mtPop .35s; transform-box:fill-box; transform-origin:center}
@keyframes mtPop{from{transform:scale(1.5); opacity:.3}}
.mt-slot.mt-tip{stroke:#FFE38A; stroke-dasharray:none; animation:mtBlink .5s infinite alternate}
.mt-st.mt-tip{animation:mtGlow .55s 5 alternate}
@keyframes mtGlow{to{filter:drop-shadow(0 0 7px #fff) drop-shadow(0 0 4px #FFE38A)}}
.mt-good .mt-wood{stroke:#B8F5C9}
.mt-read{margin:0; font:700 clamp(1.3rem, 5vw, 1.7rem) var(--display); background:var(--card); color:var(--ink); padding:.35em .9em; border-radius:999px; box-shadow:0 5px 0 var(--card-edge)}
.mt-read .no{color:var(--coral-d)} .mt-read .ok{color:var(--leaf-d)}

/* ---- Light Beam (bm-) ---- */
.bm-board{position:relative; display:grid; grid-template-columns:repeat(var(--w), 1fr); grid-template-rows:repeat(var(--h), 1fr); width:min(100%, calc(var(--w) * 66px)); aspect-ratio:var(--w) / var(--h); margin:0 auto;
  padding:0; border-radius:18px; overflow:hidden; background:#16263A; box-shadow:0 0 0 6px #2B3F59, 0 14px 26px rgba(0,0,0,.45)}
.bm-c{position:relative; display:grid; place-items:center; border:0; padding:0; background:none; min-width:0; min-height:0;
  background-image:linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)}
.bm-c.alt{background-color:rgba(255,255,255,.03)}
.bm-mc{cursor:pointer}
.bm-mc::before{content:""; position:absolute; inset:9%; border-radius:50%; background:radial-gradient(circle at 40% 35%, #5A7A9E, #33506F); box-shadow:inset 0 -4px 0 rgba(0,0,0,.3), 0 3px 0 #1B2C40}
.bm-mir{position:relative; width:17%; height:112%; border-radius:6px; transition:rotate .25s cubic-bezier(.3,1.5,.5,1); z-index:1;
  background:linear-gradient(90deg, #8FB7D9, #F4FBFF 45%, #B9D4EA 60%, #6E95B8); box-shadow:0 0 0 2px #2F4D6E, 0 4px 6px rgba(0,0,0,.4)}
.bm-lamp{width:84%; height:84%; font:700 clamp(1.1rem, 5vw, 1.7rem)/1 var(--display); border-radius:22%; box-shadow:inset 0 -4px 0 rgba(0,0,0,.15), 0 4px 0 var(--sun-d), 0 0 18px rgba(255,220,120,.8)}
.bm-lamp span{display:block; color:#7A4D00}
.bm-lc::before{content:""; position:absolute; inset:8%; border-radius:50%; border:3px dashed rgba(255,216,74,.7)}
.bm-lan{font-size:clamp(1.4rem, 7vw, 2.3rem); line-height:1; filter:saturate(.5) brightness(1.15) opacity(.7); transition:filter .3s; z-index:1}
.bm-lan.lit{filter:drop-shadow(0 0 10px #FFD84A) drop-shadow(0 0 4px #fff); animation:bounceIn .35s}
.bm-rock{width:84%; height:84%; border-radius:22%; background:linear-gradient(155deg, #A08A78, #6F5D50); box-shadow:inset 0 -4px 0 rgba(0,0,0,.25), inset 0 2px 0 rgba(255,255,255,.3), 0 4px 0 #43362D}
.bm-svg{position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:2}
.bm-halo{fill:none; stroke:#FFD84A; stroke-opacity:.55; stroke-width:.26; stroke-linecap:round; stroke-linejoin:round}
.bm-core{fill:none; stroke:#FFFBE0; stroke-width:.08; stroke-linecap:round; stroke-linejoin:round; stroke-dasharray:.35 .15; animation:bmFlow .6s linear infinite}
@keyframes bmFlow{to{stroke-dashoffset:-.5}}
.bm-board.won .bm-halo{stroke:#8DF5A8}
.bm-c.l4-tip::before{box-shadow:0 0 0 4px #fff, 0 0 16px #fff}

/* ---- Measuring Jugs (jg-) ---- */
.jg-box{display:grid; gap:12px; justify-items:center; max-width:640px; margin:0 auto}
.jg-goal{display:flex; align-items:center; gap:12px; font:600 1.3rem var(--display)}
.jg-goal .tile{width:64px; height:64px; font:700 2rem var(--display)}
.jg-row{display:flex; justify-content:center; align-items:flex-end; gap:clamp(10px, 4vw, 26px); padding-top:12px}
.jg-jug{display:flex; flex-direction:column; align-items:center; gap:6px; border:0; padding:6px 4px; background:none; cursor:pointer; border-radius:18px; transition:translate .18s, rotate .25s}
.jg-jug.sel{translate:0 -12px; background:rgba(255,255,255,.12)}
.jg-jug.tilt-r{rotate:14deg} .jg-jug.tilt-l{rotate:-14deg}
.jg-glass{position:relative; width:clamp(70px, 20vw, 86px); height:calc(var(--cap) * 15px + 26px); border-radius:10px 10px 24px 24px; overflow:hidden;
  background:linear-gradient(90deg, rgba(255,255,255,.08), rgba(255,255,255,.28) 30%, rgba(255,255,255,.1) 60%), rgba(180,225,240,.18);
  box-shadow:inset 0 0 0 4px rgba(255,255,255,.8), 0 8px 0 rgba(0,0,0,.2)}
.jg-jug.sel .jg-glass{box-shadow:inset 0 0 0 4px #fff, 0 0 0 4px var(--sun), 0 8px 0 rgba(0,0,0,.2)}
.jg-water{position:absolute; left:0; right:0; bottom:0; transition:height .6s ease-in-out; background:linear-gradient(#5FC6FF, #1D70C0)}
.jg-water.none::before{opacity:0}
.jg-water::before{content:""; position:absolute; left:-50%; width:200%; top:-7px; height:14px;
  background:radial-gradient(ellipse 12px 7px at 12px 7px, #5FC6FF 98%, transparent) 0 0 / 24px 14px repeat-x; animation:jgWave 1.6s linear infinite}
@keyframes jgWave{to{transform:translateX(24px)}}
.jg-tick{position:absolute; left:4px; width:14px; height:3px; border-radius:2px; background:rgba(255,255,255,.75); z-index:1}
.jg-amt{position:absolute; inset:0; display:grid; place-items:center; z-index:2; font:700 2rem/1 var(--display); color:#fff; text-shadow:0 2px 0 rgba(0,0,0,.35), 0 0 6px rgba(0,0,0,.4)}
.jg-cap{font:600 1.05rem var(--display); color:var(--on-table-soft); white-space:nowrap}
.jg-jug.win .jg-glass{box-shadow:inset 0 0 0 4px #fff, 0 0 0 5px var(--leaf), 0 0 22px rgba(120,255,160,.8)}
.jg-jug.win .jg-amt{animation:bounceIn .45s}
.jg-acts{display:flex; flex-wrap:wrap; justify-content:center; gap:12px}
.jg-acts .btn{min-height:60px; font-size:1.12rem; padding:.5em .95em}
.jg-acts .btn:disabled{opacity:.4; cursor:default}

/* ---- River Crossing (rv-) ---- */
.rv-box{max-width:560px; margin:0 auto}
.rv-rules{display:flex; flex-wrap:wrap; justify-content:center; gap:6px 10px; margin:0 0 10px}
.rv-rules .rv-note{flex-basis:100%; background:none; padding:0; text-align:center; color:var(--on-table-soft)}
.rv-rules span{background:rgba(0,0,0,.2); border-radius:999px; padding:.2em .75em; font:600 1.05rem var(--display); color:var(--on-table)}
.rv-scene{border-radius:22px; overflow:hidden; box-shadow:0 8px 0 rgba(0,0,0,.25), 0 16px 26px rgba(0,0,0,.35)}
.rv-bank{position:relative; display:flex; flex-wrap:wrap; justify-content:center; align-content:center; gap:8px; min-height:84px; padding:10px 10px 10px 54px;
  background:radial-gradient(circle at 20% 30%, rgba(255,255,255,.12) 0 3px, transparent 4px) 0 0 / 22px 18px, linear-gradient(#7FD66C, #4DAE48)}
.rv-bank.far{background:radial-gradient(circle at 20% 30%, rgba(255,255,255,.12) 0 3px, transparent 4px) 0 0 / 22px 18px, linear-gradient(#5DBE52, #8ADF74)}
.rv-tag{position:absolute; left:8px; top:50%; translate:0 -50%; font-size:1.7rem; line-height:1}
.rv-river{position:relative; height:116px; background:repeating-linear-gradient(170deg, rgba(255,255,255,0) 0 22px, rgba(255,255,255,.13) 22px 25px), linear-gradient(#3EA9E6, #1F79BC)}
.rv-boat{position:absolute; left:50%; transform:translateX(-50%); display:flex; justify-content:center; align-items:flex-end; gap:6px; min-width:150px; height:74px; padding:0 18px 12px;
  top:calc(100% - 80px); transition:top .7s ease-in-out}
.rv-boat.far{top:6px}
.rv-boat::before{content:""; position:absolute; left:0; right:0; bottom:0; height:30px; border-radius:6px 6px 40px 40px;
  background:linear-gradient(#B9783F, #7A4A28); box-shadow:inset 0 3px 0 rgba(255,255,255,.3), 0 4px 0 #4A2B15}
.rv-boat .rv-seat{position:relative; width:50px; height:50px; border-radius:50%; background:rgba(0,0,0,.18); border:3px dashed rgba(255,255,255,.55)}
.rv-boat .rv-ch{position:relative}
.rv-ch{width:60px; height:60px; font-size:35px; line-height:1; cursor:pointer; padding:0}
.rv-ch.hop{animation:bounceIn .35s}
.rv-ch.bad{--c:#FFD3C7; --d:var(--coral-d)}
.rv-ch.dim{opacity:.55}
.rv-bank.far.allhere{box-shadow:inset 0 0 0 4px #fff}
`);

  /* =========================================================
     1. TOWER SHIFT
     ========================================================= */
  register({ id: 'hanoi', cat: 'slide', order: 9, name: 'Tower Shift', icon: '🗼', desc: 'Move the tower to the gold peg, one disc at a time', start: startHanoi });

  const HN_COL = [CUBES[0], CUBES[1], CUBES[2], CUBES[3], CUBES[4], { c: 'orange', s: '◆' }, { c: 'grape', s: '✿' }];
  const PEG = ['left', 'middle', 'right'];
  // Moves needed to bring discs 0..k-1 (0 = smallest) onto peg t, from any legal position.
  function hnCount(pos, k, t) {
    if (k <= 0) return 0;
    const d = k - 1;
    if (pos[d] === t) return hnCount(pos, d, t);
    return hnCount(pos, d, 3 - pos[d] - t) + 1 + (Math.pow(2, d) - 1);
  }
  // The optimal next move for discs 0..k-1 to reach peg t (largest misplaced disc decides).
  function hnNext(pos, k, t) {
    if (k <= 0) return null;
    const d = k - 1;
    if (pos[d] === t) return hnNext(pos, d, t);
    const aux = 3 - pos[d] - t;
    if (hnCount(pos, d, aux) === 0) return { disc: d, from: pos[d], to: t };
    return hnNext(pos, d, aux);
  }
  function hnPlan(L) {
    if (L <= 1) return { n: 2, mix: false };
    if (L <= 3) return { n: 3, mix: false };
    if (L <= 5) return { n: 4, mix: false, anyGoal: L === 5 };
    if (L <= 7) return { n: 4, mix: true, lo: 9, hi: 15, anyGoal: true };
    if (L <= 10) return { n: 5, mix: L !== 9, lo: 14, hi: 24, anyGoal: true };
    if (L <= 14) return { n: 5 + randInt(2), mix: true, lo: 20, hi: 34, anyGoal: true };
    // cap: 6 discs (sometimes the full tower), and now and then a 7-disc puzzle part-way done
    const r = randInt(5);
    if (r === 0) return { n: 6, mix: false, anyGoal: true };
    if (r === 1 && L >= 18) return { n: 7, mix: true, lo: 30, hi: 50, anyGoal: true };
    return { n: 6, mix: true, lo: 26, hi: 44, anyGoal: true };
  }
  function hnGen(p) {
    const n = p.n;
    if (!p.mix) {
      const from = p.anyGoal ? randInt(2) * 2 : 0, goal = p.anyGoal ? pick([0, 1, 2].filter(x => x !== from)) : 2;
      return { pos: Array(n).fill(from), goal, min: Math.pow(2, n) - 1 };
    }
    let best = null;
    for (let t = 0; t < 600; t++) {
      const pos = [...Array(n)].map(() => randInt(3)), goal = randInt(3);
      const m = hnCount(pos, n, goal);
      if (m < 3) continue;
      const miss = m < p.lo ? p.lo - m : m > p.hi ? m - p.hi : 0;
      if (!best || miss < best.miss) best = { pos, goal, min: m, miss };
      if (!miss) break;
    }
    return best;
  }

  function startHanoi(L, api) {
    const p = hnPlan(L), G = hnGen(p), n = p.n, goal = G.goal, min0 = G.min;
    let pos = G.pos.slice(), sel = null, flying = null, moves = 0, hints = 0, history = [], finished = false;
    const DH = n >= 6 ? 28 : 32, BASE = 20, LIFT = 66, H = LIFT + n * DH + BASE + 8;
    const HINT0 = 'Move every disc onto the gold peg. Tap a peg to lift its top disc, then tap another peg to drop it. A big disc can’t go on a smaller one.';
    api.hint(HINT0);
    const board = el('div', 'hn-board'); board.style.height = H + 'px'; board.style.setProperty('--dh', DH + 'px');
    const pegs = [0, 1, 2].map(i => {
      const b = el('button', 'hn-peg' + (i === goal ? ' goal' : '')); b.type = 'button';
      b.style.left = (i * 33.333) + '%'; b.style.setProperty('--rod', (n * DH + 22) + 'px');
      b.setAttribute('aria-label', PEG[i] + ' peg' + (i === goal ? ', the goal' : ''));
      b.onclick = () => tap(i); board.append(b); return b;
    });
    const discs = [...Array(n)].map((_, i) => {
      const d = el('div', 'hn-disc tile c-' + HN_COL[i].c, '<span>' + HN_COL[i].s + '</span>');
      d.style.width = (33.333 * (0.34 + 0.62 * (i + 1) / n)) + '%'; board.append(d); return d;
    });
    const labels = el('div', 'hn-labels', [0, 1, 2].map(i => i === goal ? '<span class="g">★ Goal</span>' : '<span></span>').join(''));
    const info = el('p', 'l4-info');
    const undoBtn = mkBtn('↶ Undo', 'c-card', undo), hintBtn = mkBtn('💡 Hint', 'c-sun', hint);
    const bar = el('div', 'l4-bar'); bar.append(undoBtn, hintBtn);
    api.stage.append(board, labels, info, bar);

    const stackOf = q => pos.map((pp, i) => pp === q ? i : -1).filter(i => i >= 0).sort((a, b) => b - a); // bottom first
    const topOf = q => { const s = stackOf(q); return s.length ? s[s.length - 1] : -1; };
    function render() {
      [0, 1, 2].forEach(q => {
        stackOf(q).forEach((d, k) => {
          const e = discs[d], up = (sel === q && k === stackOf(q).length - 1) || flying === d;
          e.style.left = ((q + 0.5) * 33.333) + '%';
          e.style.bottom = (up ? H - LIFT + 10 : BASE + k * DH) + 'px';
          e.classList.toggle('up', up);
        });
        pegs[q].classList.toggle('sel', sel === q);
      });
      info.innerHTML = `Moves: <b>${moves}</b> · Fewest possible: <b>${min0}</b>`;
      undoBtn.disabled = !history.length || finished;
    }
    function tap(q) {
      if (finished) return;
      untip(api.stage);
      if (sel === null) {
        const t = topOf(q);
        if (t < 0) { wob(pegs[q]); api.hint('That peg is empty. Tap a peg with discs on it.'); return; }
        sel = q; tone(392 + (n - t) * 40, .1, 'triangle', .1); render();
        api.hint('Now tap the peg to drop it on.'); return;
      }
      if (sel === q) { sel = null; sfx.tap(); render(); api.hint(HINT0); return; }
      const d = topOf(sel), under = topOf(q);
      if (under >= 0 && under < d) {
        wob(discs[d]); wob(discs[under]); tone(170, .12, 'sine', .08);
        api.hint('Bump! A bigger disc can’t sit on a smaller one. Try another peg.'); return;
      }
      history.push(pos.slice()); pos[d] = q; sel = null; moves++;
      flying = d; render();
      api.later(() => { flying = null; render(); tone(330 + (n - d) * 45, .12, 'triangle', .11); }, 210);
      if (pos.every(x => x === goal)) {
        finished = true; render();
        api.later(() => { board.classList.add('won'); rise(4); api.hint(cheer() + ' The whole tower is on the gold peg.'); }, 300);
        api.done(starsFor(Math.max(0, moves - min0) + hints * 2, Math.max(1, Math.round(min0 * .1)), Math.max(4, Math.round(min0 * .5))));
        return;
      }
      api.hint(HINT0);
    }
    function undo() {
      if (!history.length || finished) return;
      pos = history.pop(); sel = null; moves = Math.max(0, moves - 1); sfx.tap(); untip(api.stage); render(); api.hint(HINT0);
    }
    function nextMove() { return hnNext(pos, n, goal); }
    function hint() {
      if (finished) return;
      const m = nextMove(); if (!m) return;
      hints++; sfx.tap();
      if (sel !== null && sel !== m.from) { sel = null; render(); }
      tip(pegs[m.from], pegs[m.to]);
      api.hint(`Move the ${HN_COL[m.disc].s} ${HN_COL[m.disc].c} disc from the ${PEG[m.from]} peg to the ${PEG[m.to]} peg.`);
    }
    render();
    if (TEST) window.__l4cur = { min: min0, step() { const m = nextMove(); if (!m) return false; if (sel !== null && sel !== m.from) tap(sel); if (sel === null) tap(m.from); tap(m.to); return true; } };
  }

  /* =========================================================
     2. MATCHSTICK MATHS
     ========================================================= */
  register({ id: 'matches', cat: 'logic', order: 17, name: 'Matchstick Maths', icon: '🔥', desc: 'Move one matchstick to make the sum right', start: startMatches });

  // segments: 0 top, 1 upper right, 2 lower right, 3 bottom, 4 lower left, 5 upper left, 6 middle
  const MT_DIG = [63, 6, 91, 79, 102, 109, 125, 7, 127, 111];
  const MT_OF = {}; MT_DIG.forEach((m, d) => { MT_OF[m] = d; });
  const DW = 60, OW = 56, GAP = 16, GH = 110;
  function mtLayout(a, op, b, c) {
    const glyphs = [];
    const num = (v, part) => String(v).split('').forEach(ch => glyphs.push({ t: 'd', part, mask: MT_DIG[+ch] }));
    num(a, 0); glyphs.push({ t: 'op', mask: op === '+' ? 3 : 1 }); num(b, 1); glyphs.push({ t: 'eq' }); num(c, 2);
    let x = 12;
    const slots = [], state = [];
    glyphs.forEach((g, gi) => {
      g.x = x;
      if (g.t === 'd') {
        const x0 = x + 6, x1 = x + 54, y0 = 8, ym = 55, y1 = 102;
        const segs = [[x0 + 5, y0, x1 - 5, y0], [x1, y0 + 5, x1, ym - 5], [x1, ym + 5, x1, y1 - 5], [x0 + 5, y1, x1 - 5, y1], [x0, ym + 5, x0, y1 - 5], [x0, y0 + 5, x0, ym - 5], [x0 + 5, ym, x1 - 5, ym]];
        segs.forEach((s, k) => { slots.push({ g: gi, k, s }); state.push((g.mask >> k) & 1); });
        x += DW;
      } else if (g.t === 'op') {
        slots.push({ g: gi, k: 0, s: [x + 9, 55, x + 47, 55] }); state.push(1);
        slots.push({ g: gi, k: 1, s: [x + 28, 36, x + 28, 74] }); state.push(g.mask >> 1 & 1);
        x += OW;
      } else x += OW;
      x += GAP;
    });
    return { glyphs, slots, state, w: x - GAP + 12 };
  }
  function mtParse(L, st) {
    const nums = [[], [], []]; let op = null, ok = true;
    const masks = L.glyphs.map(() => 0);
    L.slots.forEach((s, i) => { if (st[i]) masks[s.g] |= 1 << s.k; });
    L.glyphs.forEach((g, gi) => {
      if (g.t === 'd') { const d = MT_OF[masks[gi]]; if (d === undefined) ok = false; else nums[g.part].push(d); }
      else if (g.t === 'op') { op = masks[gi] === 3 ? '+' : masks[gi] === 1 ? '−' : null; if (!op) ok = false; }
    });
    if (!ok) return { ok: false };
    if (nums.some(a => a.length > 1 && a[0] === 0)) return { ok: false, lead: true };
    const [a, b, c] = nums.map(a => +a.join(''));
    return { ok: true, a, b, c, op, truth: op === '+' ? a + b === c : a - b === c, text: `${a} ${op} ${b} = ${c}` };
  }
  function mtMoves(L, st, keep) {
    const out = [];
    st.forEach((f, i) => {
      if (!f) return;
      st.forEach((g, j) => {
        if (g) return;
        const ns = st.slice(); ns[i] = 0; ns[j] = 1;
        const P = mtParse(L, ns);
        if (keep(P)) out.push({ from: i, to: j, st: ns, P });
      });
    });
    return out;
  }
  function mtEq(L) {
    const r = randInt(2), plus = r === 0;
    if (L <= 2) {
      if (plus) { const a = 1 + randInt(8), b = randInt(10 - a); return [a, '+', b, a + b]; }
      const a = 2 + randInt(8), b = 1 + randInt(a); return [a, '−', b, a - b];
    }
    if (L <= 5 && randInt(3)) {
      if (plus) { const a = 2 + randInt(8), b = Math.max(10 - a, 1) + randInt(a); return [a, '+', b, a + b]; }
      const a = 10 + randInt(9), b = a - 9 + randInt(9); return [a, '−', b, a - b];
    }
    if (L <= 5) return mtEq(2);
    if (L <= 8 || randInt(3) === 0) {
      if (plus) { const a = 10 + randInt(40), b = 1 + randInt(9); return [a, '+', b, a + b]; }
      const a = 11 + randInt(80), b = 1 + randInt(9); return [a, '−', b, a - b];
    }
    if (plus) { const a = 10 + randInt(45), b = 10 + randInt(40); return [a, '+', b, a + b]; }
    const a = 30 + randInt(69), b = 10 + randInt(a - 19); return [a, '−', b, a - b];
  }
  function mtGen(L) {
    for (let t = 0; t < 400; t++) {
      const e = mtEq(L); if (e[3] < 0 || e[3] > 99) continue;
      const lay = mtLayout(...e);
      const back = mtMoves(lay, lay.state, P => P.ok && !P.truth);
      if (!back.length) continue;
      const m = pick(back);
      const fixes = mtMoves(lay, m.st, P => P.ok && P.truth);
      if (!fixes.length) continue; // cannot happen (the reverse move always works), but stay safe
      return { lay, st: m.st, fixes, answer: e };
    }
    return null;
  }

  function startMatches(L, api) {
    const ROUNDS = 3;
    let round = 0, mistakes = 0, hints = 0, G = null, st = null, lifted = -1, busy = false, fresh = -1, finished = false;
    const box = el('div', 'mt-box'), pane = el('div', 'mt-pane'), read = el('p', 'mt-read');
    const hintBtn = mkBtn('💡 Hint', 'c-sun', hint), bar = el('div', 'l4-bar'); bar.append(hintBtn);
    box.append(pane, read, bar); api.stage.append(box);
    const HINT0 = 'This sum is wrong. Move one matchstick to fix it: tap a stick to lift it, then tap an empty space.';
    let svg = null;
    function newRound() {
      G = mtGen(L); st = G.st.slice(); lifted = -1; fresh = -1; busy = false;
      api.rounds(ROUNDS, round); api.hint(HINT0); draw(); showRead(false);
    }
    function stick(s, cls) {
      const [x1, y1, x2, y2] = s;
      return `<g class="mt-st ${cls}"><line class="mt-edge" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><line class="mt-wood" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><circle class="mt-head" cx="${x2}" cy="${y2}" r="7.5"/></g>`;
    }
    function draw(good) {
      const lay = G.lay;
      let h = '';
      lay.slots.forEach((s, i) => {
        if (st[i]) return;
        h += `<line class="mt-slot" data-i="${i}" x1="${s.s[0]}" y1="${s.s[1]}" x2="${s.s[2]}" y2="${s.s[3]}"/>`;
      });
      lay.slots.forEach((s, i) => {
        if (!st[i]) return;
        const c = (i === lifted ? 'mt-up' : '') + (i === fresh ? ' mt-new' : '');
        h = h + stick(s.s, c).replace('<g ', `<g data-i="${i}" `);
      });
      lay.glyphs.forEach(g => { if (g.t === 'eq') h += `<g class="mt-fixed">${stick([g.x + 9, 45, g.x + 47, 45], '')}${stick([g.x + 9, 66, g.x + 47, 66], '')}</g>`; });
      pane.innerHTML = `<svg class="mt-svg${lifted >= 0 ? ' lifting' : ''}${good ? ' mt-good' : ''}" viewBox="0 -6 ${lay.w} ${GH + 10}" style="max-width:${Math.round(lay.w * 1.25)}px" role="img" aria-label="Matchstick sum">${h}</svg>`;
      svg = pane.firstChild;
      svg.addEventListener('click', onTap);
    }
    function showRead(after) {
      const P = mtParse(G.lay, st);
      if (!P.ok) read.innerHTML = 'That reads: <span class="no">? (not a number)</span>';
      else read.innerHTML = `${after ? 'Now it says' : 'It says'} ${P.text} <span class="${P.truth ? 'ok' : 'no'}">${P.truth ? '✓' : '✗'}</span>`;
    }
    function nearest(ev) {
      const r = svg.getBoundingClientRect(), lay = G.lay;
      const x = (ev.clientX - r.left) / r.width * lay.w, y = (ev.clientY - r.top) / r.height * (GH + 10) - 6;
      let best = -1, bd = 1e9;
      lay.slots.forEach((s, i) => {
        if (lifted < 0 && !st[i]) return;
        const [x1, y1, x2, y2] = s.s, dx = x2 - x1, dy = y2 - y1;
        const t = clamp(((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy), 0, 1);
        // the + sign's two sticks cross: a tap on the middle means the upright one (the one worth moving)
        const d = Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)) + (lay.glyphs[s.g].t === 'op' && s.k === 0 ? 2 : 0);
        if (d < bd) { bd = d; best = i; }
      });
      return bd < 34 ? best : -1;
    }
    function onTap(ev) { if (busy || finished) return; const i = nearest(ev); if (i >= 0) act(i); }
    function act(i) {
      fresh = -1;
      if (st[i]) {
        if (lifted === i) { lifted = -1; sfx.tap(); api.hint(HINT0); }
        else { lifted = i; tone(520, .08, 'triangle', .1); api.hint('Now tap an empty space to put the matchstick there. Tap it again to put it back.'); }
        draw(); return;
      }
      if (lifted < 0) { api.hint('First tap a matchstick to lift it.'); return; }
      const from = lifted; st[from] = 0; st[i] = 1; lifted = -1; fresh = i;
      tone(620, .1, 'triangle', .1);
      const P = mtParse(G.lay, st);
      draw(P.ok && P.truth); showRead(true);
      if (P.ok && P.truth) {
        busy = true; round++; api.rounds(ROUNDS, round); rise(3 + round);
        api.hint(cheer() + ' ' + P.text + ' is right!');
        if (round >= ROUNDS) { finished = true; api.done(starsFor(mistakes + hints, 1, 3)); }
        else api.later(newRound, 1500);
        return;
      }
      busy = true; mistakes++; sfx.soft();
      api.hint(P.ok ? `Not quite: ${P.text} isn’t right yet. Let’s put that stick back and try another.` : 'That doesn’t make a proper number. Let’s put that stick back and try another.');
      api.later(() => { st[i] = 0; st[from] = 1; fresh = from; busy = false; draw(); showRead(false); api.hint(HINT0); }, 1700);
    }
    function hint() {
      if (busy || finished) return;
      hints++; sfx.tap();
      const f = G.fixes.find(f => f.from === lifted && st[f.from]) || G.fixes[0];
      if (lifted !== f.from) {
        if (lifted >= 0) { lifted = -1; draw(); }
        tip(svg.querySelector(`g[data-i="${f.from}"]`)); svg.querySelector(`g[data-i="${f.from}"]`).classList.add('mt-tip');
        api.hint('Try lifting the glowing matchstick.');
      } else {
        svg.querySelector(`line[data-i="${f.to}"]`).classList.add('mt-tip');
        api.hint('Now put it in the glowing space.');
      }
    }
    newRound();
    if (TEST) window.__l4cur = {
      get G() { return G; }, parse: s => mtParse(G.lay, s),
      step() { if (busy || finished) return false; const f = G.fixes[0]; if (lifted !== f.from) act(f.from); act(f.to); return true; },
      wrong() { const w = mtMoves(G.lay, st, P => !(P.ok && P.truth))[0]; act(w.from); act(w.to); }
    };
  }

  /* =========================================================
     3. LIGHT BEAM
     ========================================================= */
  register({ id: 'beam', cat: 'logic', order: 18, name: 'Light Beam', icon: '🔦', desc: 'Turn the mirrors to light the lanterns', start: startBeam });

  const BX = [0, 1, 0, -1], BY = [-1, 0, 1, 0], BARROW = ['▲', '▶', '▼', '◀'];
  // '/' sends right→up, '\' sends right→down
  const bmTurn = (d, o) => o === 0 ? [1, 0, 3, 2][d] : [3, 2, 1, 0][d];
  function bmPlan(L) {
    if (L <= 1) return { w: 4, h: 4, turns: 1, lan: 1, dec: 0, rocks: 0, wrong: 1 };
    if (L === 2) return { w: 4, h: 4, turns: 2, lan: 1, dec: 0, rocks: 0, wrong: 1 };
    if (L === 3) return { w: 5, h: 5, turns: 2, lan: 1, dec: 1, rocks: 0, wrong: 2 };
    if (L === 4) return { w: 5, h: 5, turns: 3, lan: 1, dec: 1, rocks: 1, wrong: 2 };
    if (L === 5) return { w: 5, h: 5, turns: 3, lan: 2, dec: 2, rocks: 1, wrong: 2 };
    if (L <= 7) return { w: 6, h: 6, turns: 3 + randInt(2), lan: 2, dec: 2, rocks: 1 + randInt(2), wrong: 3 };
    if (L <= 11) return { w: 6, h: 6, turns: 4 + randInt(2), lan: 2 + randInt(2), dec: 2 + randInt(2), rocks: 1 + randInt(3), wrong: 3 };
    return { w: 6, h: 6, turns: 5 + randInt(2), lan: 2 + randInt(2), dec: 3 + randInt(2), rocks: 1 + randInt(3), wrong: 4 };
  }
  function bmTrace(B, orient) {
    const { w, h, cell, lamp } = B;
    let x = lamp % w, y = Math.floor(lamp / w), d = B.dir;
    const pts = [[x + .5, y + .5]], seen = new Set(), lit = new Set(), hits = [];
    for (let s = 0; s < 200; s++) {
      const nx = x + BX[d], ny = y + BY[d];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) { pts.push([x + .5 + BX[d] * .5, y + .5 + BY[d] * .5]); break; }
      const c = ny * w + nx, t = cell[c];
      if (t === 'rock' || t === 'lamp') { pts.push([x + .5 + BX[d] * .5, y + .5 + BY[d] * .5]); break; }
      x = nx; y = ny;
      if (t === 'lan') lit.add(c);
      if (t === 'mir') {
        const k = c * 4 + d; if (seen.has(k)) { pts.push([x + .5, y + .5]); break; } seen.add(k);
        hits.push(c); d = bmTurn(d, orient[c]); pts.push([x + .5, y + .5]);
      }
    }
    return { pts, lit, hits };
  }
  function bmGen(p) {
    const { w, h } = p, N = w * h;
    for (let tries = 0; tries < 3000; tries++) {
      const cell = Array(N).fill(null), sol = {}, onPath = new Set(), turnCells = [];
      const side = p.turns <= 1 && p.w <= 4 ? 3 : randInt(4); // lamp sits on this edge, shining inward
      const along = randInt(side % 2 ? h : w);
      let x = side === 1 ? w - 1 : side === 3 ? 0 : along, y = side === 0 ? 0 : side === 2 ? h - 1 : along;
      if (side === 1 || side === 3) y = along;
      let d = (side + 2) % 4;
      const lamp = y * w + x; cell[lamp] = 'lamp'; onPath.add(lamp);
      let ok = true, end = -1;
      for (let t = 0; t <= p.turns && ok; t++) {
        const run = []; let cx = x, cy = y;
        for (;;) {
          cx += BX[d]; cy += BY[d];
          if (cx < 0 || cy < 0 || cx >= w || cy >= h) break;
          const c = cy * w + cx; if (cell[c]) break;
          run.push(c);
        }
        const cand = run.map((c, i) => ({ c, i })).filter(o => !onPath.has(o.c));
        if (t < p.turns) {
          const opts = [];
          cand.forEach(o => {
            const ox = o.c % w, oy = Math.floor(o.c / w);
            [(d + 1) % 4, (d + 3) % 4].forEach(nd => { const tx = ox + BX[nd], ty = oy + BY[nd]; if (tx >= 0 && ty >= 0 && tx < w && ty < h && !cell[ty * w + tx]) opts.push({ o, nd }); });
          });
          if (!opts.length) { ok = false; break; }
          const ch = pick(opts);
          for (let i = 0; i <= ch.o.i; i++) onPath.add(run[i]);
          const c = ch.o.c; cell[c] = 'mir'; sol[c] = bmTurn(d, 0) === ch.nd ? 0 : 1; turnCells.push(c);
          x = c % w; y = Math.floor(c / w); d = ch.nd;
        } else {
          const far = cand.filter(o => o.i >= 1 || run.length === 1);
          if (!far.length) { ok = false; break; }
          const ch = pick(far); end = ch.c;
          for (let i = 0; i <= ch.i; i++) onPath.add(run[i]);
        }
      }
      if (!ok) continue;
      const B = { w, h, cell, lamp, dir: (side + 2) % 4 };
      cell[end] = 'lan';
      const solTrace = bmTrace(B, sol);
      const pathCells = [...new Set(solTrace.pts.map(([px, py]) => Math.floor(py) * w + Math.floor(px)).filter(c => c >= 0 && c < N))];
      const free = pathCells.filter(c => !cell[c]);
      shuffle(free).slice(0, p.lan - 1).forEach(c => { cell[c] = 'lan'; });
      // everything on the beam's full route (including the run after the last lantern) stays clear
      const route = new Set();
      { let cx = B.lamp % w, cy = Math.floor(B.lamp / w), dd = B.dir; for (let s = 0; s < 200; s++) { route.add(cy * w + cx); cx += BX[dd]; cy += BY[dd]; if (cx < 0 || cy < 0 || cx >= w || cy >= h) break; const c = cy * w + cx; if (cell[c] === 'mir') dd = bmTurn(dd, sol[c]); } }
      const empty = shuffle([...Array(N).keys()].filter(c => !cell[c] && !route.has(c)));
      const decoys = empty.slice(0, p.dec); decoys.forEach(c => { cell[c] = 'mir'; sol[c] = randInt(2); });
      empty.slice(p.dec, p.dec + p.rocks).forEach(c => { cell[c] = 'rock'; });
      const lans = cell.map((t, c) => t === 'lan' ? c : -1).filter(c => c >= 0);
      if (lans.length !== p.lan) continue;
      if (!lans.every(c => bmTrace(B, sol).lit.has(c))) continue;
      // scramble: flip enough path mirrors, randomise the decoys, and make sure it isn't already solved
      for (let s = 0; s < 40; s++) {
        const orient = Object.assign({}, sol);
        const want = Math.min(p.wrong, turnCells.length);
        shuffle(turnCells.slice()).forEach((c, i) => { if (i < want || Math.random() < .35) orient[c] = 1 - sol[c]; });
        decoys.forEach(c => { orient[c] = randInt(2); });
        const tr = bmTrace(B, orient);
        if (lans.every(c => tr.lit.has(c))) continue;
        return Object.assign(B, { sol, orient, turnCells, lans, need: turnCells.filter(c => orient[c] !== sol[c]).length });
      }
    }
    return null;
  }

  function startBeam(L, api) {
    let p = bmPlan(L), B = null;
    for (let k = 0; !B && k < 6; k++) { B = bmGen(p); if (!B) p = Object.assign({}, p, { turns: Math.max(1, p.turns - 1), lan: Math.max(1, p.lan - (k % 2)) }); }
    const { w, h, cell, sol, turnCells, lans } = B, orient = B.orient, rot = {};
    Object.keys(orient).forEach(c => { rot[c] = orient[c] ? 135 : 45; });
    let taps = 0, hints = 0, finished = false;
    const multi = lans.length > 1;
    const HINT0 = multi ? `Tap the mirrors to turn them. Guide the beam to light all ${lans.length} lanterns.` : 'Tap the mirrors to turn them. Guide the beam to light the lantern.';
    api.hint(HINT0);
    const board = el('div', 'bm-board'); board.style.setProperty('--w', w); board.style.setProperty('--h', h);
    const cells = cell.map((t, c) => {
      const x = c % w, y = Math.floor(c / w);
      const e = el(t === 'mir' ? 'button' : 'div', 'bm-c' + ((x + y) % 2 ? ' alt' : '') + (t === 'mir' ? ' bm-mc' : ''));
      if (t === 'mir') { e.type = 'button'; e.setAttribute('aria-label', 'Mirror'); e.innerHTML = '<span class="bm-mir"></span>'; e.onclick = () => turn(c); }
      else if (t === 'lamp') e.innerHTML = `<span class="bm-lamp tile c-sun"><span>${BARROW[B.dir]}</span></span>`;
      else if (t === 'lan') { e.classList.add('bm-lc'); e.innerHTML = '<span class="bm-lan">🏮</span>'; }
      else if (t === 'rock') e.innerHTML = '<span class="bm-rock"></span>';
      board.append(e); return e;
    });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'bm-svg'); svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.setAttribute('preserveAspectRatio', 'none');
    board.append(svg);
    const info = el('p', 'l4-info');
    const hintBtn = mkBtn('💡 Hint', 'c-sun', hint), bar = el('div', 'l4-bar'); bar.append(hintBtn);
    api.stage.append(board, info, bar);

    function render() {
      Object.keys(rot).forEach(c => { const m = cells[c].firstChild; if (m) m.style.rotate = rot[c] + 'deg'; });
      const tr = bmTrace(B, orient), pts = tr.pts.map(p => p.map(v => v.toFixed(3)).join(',')).join(' ');
      svg.innerHTML = `<polyline class="bm-halo" points="${pts}"/><polyline class="bm-core" points="${pts}"/>`;
      let n = 0;
      lans.forEach(c => { const on = tr.lit.has(c), e = cells[c].firstChild; if (on) n++; if (on && !e.classList.contains('lit')) { e.classList.add('lit'); tone(660 + n * 120, .18, 'triangle', .1); } else if (!on) e.classList.remove('lit'); });
      info.innerHTML = multi ? `Lanterns lit: <b>${n}</b> of <b>${lans.length}</b>` : (n ? '<b>The lantern is lit!</b>' : 'The lantern is waiting for light');
      return n === lans.length;
    }
    function turn(c) {
      if (finished) return;
      untip(api.stage);
      orient[c] = 1 - orient[c]; rot[c] += 90; taps++;
      tone(380 + randInt(4) * 30, .07, 'square', .05);
      if (render()) {
        finished = true; board.classList.add('won'); rise(4);
        api.hint(cheer() + (multi ? ' Every lantern is glowing.' : ' The lantern is glowing.'));
        api.done(starsFor(Math.max(0, taps - B.need) + hints * 2, 2, 6));
      } else api.hint(HINT0);
    }
    function nextFix() { return turnCells.find(c => orient[c] !== sol[c]); }
    function hint() {
      if (finished) return;
      const c = nextFix(); if (c === undefined) return;
      hints++; sfx.tap(); tip(cells[c]);
      api.hint('Follow the beam to the glowing mirror and tap it to turn it.');
    }
    render();
    if (TEST) window.__l4cur = { B, step() { const c = nextFix(); if (c === undefined) return false; turn(c); return true; } };
  }

  /* =========================================================
     4. MEASURING JUGS
     ========================================================= */
  register({ id: 'jugs', cat: 'logic', order: 19, name: 'Measuring Jugs', icon: '🫗', desc: 'Fill, pour and empty to measure just right', start: startJugs });

  function jgApply(caps, s, a) {
    const n = s.slice();
    if (a.t === 'fill') n[a.i] = caps[a.i];
    else if (a.t === 'empty') n[a.i] = 0;
    else { const m = Math.min(n[a.i], caps[a.j] - n[a.j]); n[a.i] -= m; n[a.j] += m; }
    return n;
  }
  function jgActs(caps, s) {
    const out = [];
    caps.forEach((c, i) => {
      if (s[i] < c) out.push({ t: 'fill', i });
      if (s[i] > 0) out.push({ t: 'empty', i });
      caps.forEach((_, j) => { if (i !== j && s[i] > 0 && s[j] < caps[j]) out.push({ t: 'pour', i, j }); });
    });
    return out;
  }
  // BFS: shortest action list from s to any state where a jug holds exactly T (T null: full distance map).
  function jgBFS(caps, s0, T) {
    const k0 = s0.join(','), prev = new Map([[k0, null]]), q = [s0], dist = new Map([[k0, 0]]);
    if (T != null && s0.includes(T)) return [];
    for (let h = 0; h < q.length; h++) {
      const s = q[h], ks = s.join(',');
      for (const a of jgActs(caps, s)) {
        const n = jgApply(caps, s, a), k = n.join(',');
        if (prev.has(k)) continue;
        prev.set(k, { ks, a }); dist.set(k, dist.get(ks) + 1); q.push(n);
        if (T != null && n.includes(T)) {
          const path = []; let kk = k;
          while (prev.get(kk)) { const e = prev.get(kk); path.unshift(e.a); kk = e.ks; }
          return path;
        }
      }
    }
    return T == null ? { dist, states: q } : null;
  }
  // With two jugs new amounts come in fill-and-pour pairs (even step counts); three jugs allow odd ones.
  function jgPlan(L) {
    if (L <= 2) return { d: 2, three: false };
    if (L === 3) return { d: 3, three: true };
    if (L <= 5) return { d: 4, three: false };
    if (L === 6) return { d: 5, three: true };
    if (L <= 11) return pick([{ d: 6, three: false }, { d: 5, three: true }, { d: 6, three: true }]);
    return pick([{ d: 6, three: false }, { d: 8, three: false }, { d: 6, three: true }, { d: 7, three: true }]);
  }
  function jgGen(p) {
    let best = null;
    for (let t = 0; t < 300; t++) {
      let caps;
      if (p.three) { const a = 2 + randInt(4); const b = a + 1 + randInt(3); const c = b + 1 + randInt(Math.max(1, 10 - b)); caps = [a, b, Math.min(10, c)]; if (caps[2] <= caps[1]) continue; }
      else { const a = 2 + randInt(6), b = a + 1 + randInt(Math.max(1, 10 - a)); caps = [a, Math.min(10, b)]; if (caps[1] <= caps[0]) continue; }
      const { dist, states } = jgBFS(caps, caps.map(() => 0), null), byT = {};
      states.forEach(s => { const d = dist.get(s.join(',')); s.forEach(v => { if (v > 0 && !caps.includes(v) && (byT[v] === undefined || d < byT[v])) byT[v] = d; }); });
      const Ts = Object.keys(byT).map(Number);
      if (!Ts.length) continue;
      const exact = Ts.filter(T => byT[T] === p.d);
      if (exact.length) { const T = pick(exact); return { caps, T, min: p.d, exact: true }; }
      const T = Ts.reduce((a, b) => Math.abs(byT[a] - p.d) < Math.abs(byT[b] - p.d) || (Math.abs(byT[a] - p.d) === Math.abs(byT[b] - p.d) && byT[a] < byT[b]) ? a : b);
      if (!best || Math.abs(byT[T] - p.d) < Math.abs(best.min - p.d)) best = { caps, T, min: byT[T] };
    }
    return best;
  }

  function startJugs(L, api) {
    const p = jgPlan(L), G = jgGen(p), caps = G.caps, T = G.T, min0 = G.min;
    let s = caps.map(() => 0), sel = -1, moves = 0, hints = 0, history = [], finished = false;
    const HINT0 = `Measure exactly ${T} litres in any jug. Tap a jug, then tap 🚰 to fill it, the sink to empty it, or another jug to pour into it.`;
    api.hint(HINT0);
    const box = el('div', 'jg-box');
    const goal = el('div', 'jg-goal', `<span>Goal:</span><span class="tile c-leaf">${T}</span><span>litres</span>`);
    const row = el('div', 'jg-row');
    const jugs = caps.map((c, i) => {
      const b = el('button', 'jg-jug'); b.type = 'button'; b.setAttribute('aria-label', `The ${c} litre jug`);
      const glass = el('span', 'jg-glass'); glass.style.setProperty('--cap', c);
      for (let k = 1; k < c; k++) { const tk = el('i', 'jg-tick'); tk.style.bottom = (k / c * 100) + '%'; glass.append(tk); }
      const water = el('span', 'jg-water'), amt = el('span', 'jg-amt');
      glass.append(water, amt);
      b.append(glass, el('span', 'jg-cap', `holds ${c}`));
      b.onclick = () => tapJug(i); row.append(b);
      return { b, water, amt };
    });
    const acts = el('div', 'jg-acts');
    const fillBtn = mkBtn('🚰 Fill from tap', 'c-sky', () => act('fill')), emptyBtn = mkBtn('Empty in sink ⤵', 'c-card', () => act('empty'));
    acts.append(fillBtn, emptyBtn);
    const info = el('p', 'l4-info');
    const undoBtn = mkBtn('↶ Undo', 'c-card', undo), hintBtn = mkBtn('💡 Hint', 'c-sun', hint), bar = el('div', 'l4-bar'); bar.append(undoBtn, hintBtn);
    box.append(goal, row, acts, info, bar); api.stage.append(box);
    const name = i => `${caps[i]} litre jug`;

    function render() {
      jugs.forEach((j, i) => {
        j.water.style.height = (s[i] / caps[i] * 100) + '%'; j.water.classList.toggle('none', !s[i]); j.amt.textContent = s[i];
        j.b.classList.toggle('sel', sel === i); j.b.classList.toggle('win', finished && s[i] === T);
      });
      fillBtn.disabled = emptyBtn.disabled = sel < 0 || finished;
      undoBtn.disabled = !history.length || finished;
      info.innerHTML = `Steps: <b>${moves}</b> · Fewest possible: <b>${min0}</b>`;
    }
    function tapJug(i) {
      if (finished) return;
      untip(api.stage);
      if (sel < 0) { sel = i; sfx.tap(); render(); api.hint(`The ${name(i)} is picked. Tap 🚰 to fill it, the sink to empty it, or another jug to pour into it.`); return; }
      if (sel === i) { sel = -1; sfx.tap(); render(); api.hint(HINT0); return; }
      act('pour', i);
    }
    function act(t, j) {
      if (finished || sel < 0) return;
      untip(api.stage);
      const i = sel, a = t === 'pour' ? { t, i, j } : { t, i };
      if (t === 'fill' && s[i] === caps[i]) { wob(jugs[i].b); api.hint('That jug is already full.'); return; }
      if (t === 'empty' && s[i] === 0) { wob(jugs[i].b); api.hint('That jug is already empty.'); return; }
      if (t === 'pour' && s[i] === 0) { wob(jugs[i].b); api.hint(`The ${name(i)} is empty, so there’s nothing to pour.`); sel = -1; render(); return; }
      if (t === 'pour' && s[j] === caps[j]) { wob(jugs[j].b); api.hint(`The ${name(j)} is already full.`); return; }
      doAct(a);
    }
    function doAct(a) {
      history.push(s.slice()); s = jgApply(caps, s, a); moves++; sel = -1;
      if (a.t === 'fill') [0, 1, 2].forEach(k => tone(300 + k * 90, .12, 'sine', .09, k * .12));
      else if (a.t === 'empty') [0, 1, 2].forEach(k => tone(500 - k * 90, .12, 'sine', .08, k * .1));
      else {
        const jb = jugs[a.i].b; jb.classList.add(a.j > a.i ? 'tilt-r' : 'tilt-l');
        api.later(() => jb.classList.remove('tilt-r', 'tilt-l'), 650);
        [0, 1, 2, 3].forEach(k => tone(620 - k * 50, .08, 'triangle', .07, k * .09));
      }
      const words = a.t === 'fill' ? `Filled the ${name(a.i)}.` : a.t === 'empty' ? `Emptied the ${name(a.i)}.` : `Poured the ${name(a.i)} into the ${name(a.j)}.`;
      if (s.includes(T)) {
        finished = true; render(); rise(4);
        api.hint(`${cheer()} Exactly ${T} litres!`);
        api.done(starsFor(Math.max(0, moves - min0) + hints, 1, 4));
        return;
      }
      render(); api.hint(words + ' What next? Tap a jug.');
    }
    function undo() { if (!history.length || finished) return; s = history.pop(); moves = Math.max(0, moves - 1); sel = -1; sfx.tap(); untip(api.stage); render(); api.hint(HINT0); }
    function hint() {
      if (finished) return;
      const path = jgBFS(caps, s, T); if (!path || !path.length) return;
      const a = path[0]; hints++; sfx.tap(); untip(api.stage);
      sel = a.i; render();
      if (a.t === 'fill') { tip(fillBtn); api.hint(`Fill the ${name(a.i)} from the tap. I’ve picked it: now tap 🚰.`); }
      else if (a.t === 'empty') { tip(emptyBtn); api.hint(`Empty the ${name(a.i)}. I’ve picked it: now tap the sink.`); }
      else { tip(jugs[a.j].b); api.hint(`Pour the ${name(a.i)} into the ${name(a.j)}. I’ve picked it: now tap the glowing jug.`); }
    }
    render();
    if (TEST) window.__l4cur = { caps, T, min: min0, step() { const pth = jgBFS(caps, s, T); if (!pth || !pth.length) return false; const a = pth[0]; sel = a.i; if (a.t === 'pour') act('pour', a.j); else act(a.t); return true; } };
  }

  /* =========================================================
     5. RIVER CROSSING
     ========================================================= */
  register({ id: 'river', cat: 'logic', order: 20, name: 'River Crossing', icon: '⛵', desc: 'Ferry everyone safely across the river', start: startRiver });

  const C = {
    farmer: { e: '🧑‍🌾', n: 'Farmer', row: 1 }, fox: { e: '🦊', n: 'Fox' }, goose: { e: '🪿', n: 'Goose' }, grain: { e: '🌾', n: 'Grain' },
    dog: { e: '🐶', n: 'Dog' }, cat: { e: '🐱', n: 'Cat' }, mouse: { e: '🐭', n: 'Mouse' }, fish: { e: '🐟', n: 'Fish' },
    rabbit: { e: '🐰', n: 'Rabbit' }, carrot: { e: '🥕', n: 'Carrots' },
    mum: { e: '👩', n: 'Mum', row: 1, w: 2 }, dad: { e: '👨', n: 'Dad', row: 1, w: 2 }, girl: { e: '👧', n: 'Girl', row: 1, w: 1 }, boy: { e: '👦', n: 'Boy', row: 1, w: 1 },
    cook: { e: '🧑‍🍳', n: 'Cook', row: 1 }, pup: { e: '🐕', n: 'Hungry dog', row: 1 }
  };
  const eat = (a, b, verb) => ({ t: 'eat', a, b, guard: ['farmer'], show: `${C[a].e} ${verb} ${C[b].e}`, say: `the ${C[a].n.toLowerCase()} would ${verb.replace(/s$/, '')} the ${C[b].n.toLowerCase()}` });
  const RV = [
    { id: 'catfish', chars: ['farmer', 'cat', 'fish'], cap: 2, rules: [eat('cat', 'fish', 'eats')], note: 'Only the farmer can row. The boat holds 2.' },
    { id: 'dcm3', chars: ['farmer', 'dog', 'cat', 'mouse'], cap: 3, rules: [eat('dog', 'cat', 'chases'), eat('cat', 'mouse', 'chases')], note: 'Only the farmer can row. The boat holds 3.' },
    { id: 'classic', chars: ['farmer', 'fox', 'goose', 'grain'], cap: 2, rules: [eat('fox', 'goose', 'eats'), eat('goose', 'grain', 'eats')], note: 'Only the farmer can row. The boat holds 2.' },
    { id: 'dcm2', chars: ['farmer', 'dog', 'cat', 'mouse'], cap: 2, rules: [eat('dog', 'cat', 'chases'), eat('cat', 'mouse', 'chases')], note: 'Only the farmer can row. The boat holds 2.' },
    { id: 'picnic1', chars: ['mum', 'girl', 'boy'], cap: 2, maxW: 2, rules: [], note: 'Everyone can row. The boat holds one grown-up, or two children.' },
    { id: 'cooks2', chars: ['cook', 'cook', 'pup', 'pup'], cap: 2, rules: [{ t: 'many', many: 'pup', few: 'cook', show: 'Never more 🐕 than 🧑‍🍳 on a bank, or the pies get pinched!', say: 'the hungry dogs would outnumber the cooks and pinch the pies' }], note: 'Everyone can row. The boat holds 2.' },
    { id: 'farm3', chars: ['farmer', 'dog', 'rabbit', 'carrot', 'cat'], cap: 3, rules: [eat('dog', 'rabbit', 'chases'), eat('rabbit', 'carrot', 'eats'), eat('dog', 'cat', 'chases')], note: 'Only the farmer can row. The boat holds 3.' },
    { id: 'geese3', chars: ['farmer', 'fox', 'goose', 'goose', 'grain'], cap: 3, rules: [eat('fox', 'goose', 'eats'), eat('goose', 'grain', 'eats')], note: 'Only the farmer can row. The boat holds 3.' },
    { id: 'picnic2', chars: ['mum', 'dad', 'girl', 'boy'], cap: 2, maxW: 2, rules: [], note: 'Everyone can row. The boat holds one grown-up, or two children.' },
    { id: 'cooks3', chars: ['cook', 'cook', 'cook', 'pup', 'pup', 'pup'], cap: 2, rules: [{ t: 'many', many: 'pup', few: 'cook', show: 'Never more 🐕 than 🧑‍🍳 on a bank, or the pies get pinched!', say: 'the hungry dogs would outnumber the cooks and pinch the pies' }], note: 'Everyone can row. The boat holds 2.' }
  ];
  const RV_BY = {}; RV.forEach(v => { RV_BY[v.id] = v; });
  function rvBad(V, side) { // returns {rule, bank, who:[indices]} for the first broken rule
    for (const bank of [0, 1]) {
      const here = V.chars.map((k, i) => side[i] === bank ? i : -1).filter(i => i >= 0), kinds = here.map(i => V.chars[i]);
      for (const r of V.rules) {
        if (r.t === 'eat') {
          if (kinds.includes(r.a) && kinds.includes(r.b) && !r.guard.some(g => kinds.includes(g)))
            return { r, bank, who: here.filter(i => V.chars[i] === r.a || V.chars[i] === r.b) };
        } else {
          const m = kinds.filter(k => k === r.many).length, f = kinds.filter(k => k === r.few).length;
          if (f > 0 && m > f) return { r, bank, who: here };
        }
      }
    }
    return null;
  }
  function rvLoads(V, side, boat) { // every legal boatload leaving bank `boat`
    const idx = V.chars.map((k, i) => side[i] === boat ? i : -1).filter(i => i >= 0), out = [];
    for (let m = 1; m < (1 << idx.length); m++) {
      const S = idx.filter((_, b) => m >> b & 1);
      if (S.length > V.cap) continue;
      if (!S.some(i => C[V.chars[i]].row)) continue;
      if (V.maxW && S.reduce((a, i) => a + (C[V.chars[i]].w || 1), 0) > V.maxW) continue;
      out.push(S);
    }
    return out;
  }
  function rvBFS(V, side0, boat0) {
    const key = (s, b) => s.join('') + b, k0 = key(side0, boat0), prev = new Map([[k0, null]]), q = [[side0, boat0]];
    if (side0.every(x => x === 1)) return [];
    for (let h = 0; h < q.length; h++) {
      const [s, b] = q[h], ks = key(s, b);
      for (const S of rvLoads(V, s, b)) {
        const n = s.slice(); S.forEach(i => { n[i] = 1 - b; });
        if (rvBad(V, n)) continue;
        const k = key(n, 1 - b); if (prev.has(k)) continue;
        prev.set(k, { ks, S }); q.push([n, 1 - b]);
        if (n.every(x => x === 1)) { const path = []; let kk = k; while (prev.get(kk)) { const e = prev.get(kk); path.unshift(e.S); kk = e.ks; } return path; }
      }
    }
    return null;
  }
  function rvPick(L) {
    if (L <= 1) return 'catfish';
    if (L === 2) return pick(['dcm3', 'farm3', 'geese3']);
    if (L === 3) return pick(['classic', 'dcm2']);
    if (L === 4) return pick(['picnic1', 'cooks2', 'farm3', 'geese3']);
    if (L === 5) return pick(['classic', 'dcm2', 'picnic1', 'cooks2']);
    if (L <= 8) return pick(['classic', 'dcm2', 'cooks2', 'picnic2']);
    return pick(['classic', 'dcm2', 'picnic2', 'picnic2', 'cooks3', 'cooks3']);
  }
  function startRiver(L, api) {
    const V = RV_BY[rvPick(L)], n = V.chars.length;
    const best = rvBFS(V, Array(n).fill(0), 0), min0 = best ? best.length : 0;
    let side = Array(n).fill(0), boatSide = 0, inBoat = [], crossings = 0, mistakes = 0, hints = 0, history = [], busy = false, finished = false, hop = new Set();
    const HINT0 = 'Get everyone to the far side. Tap someone to put them in the boat, then tap “Row across”.';
    api.hint(HINT0);
    const box = el('div', 'rv-box');
    const rules = el('div', 'rv-rules');
    V.rules.forEach(r => rules.append(el('span', '', r.show)));
    const watch = V.chars.includes('farmer') && V.rules.length ? 'Only while the farmer 🧑‍🌾 is away. ' : '';
    rules.append(el('span', 'rv-note', watch + V.note));
    const scene = el('div', 'rv-scene');
    const far = el('div', 'rv-bank far'), river = el('div', 'rv-river'), near = el('div', 'rv-bank');
    const boat = el('div', 'rv-boat');
    river.append(boat); scene.append(far, river, near);
    const info = el('p', 'l4-info');
    const rowBtn = mkBtn('⛵ Row across', 'c-leaf', row), undoBtn = mkBtn('↶ Undo', 'c-card', undo), hintBtn = mkBtn('💡 Hint', 'c-sun', hint);
    const bar = el('div', 'l4-bar'); bar.append(rowBtn, undoBtn, hintBtn);
    box.append(rules, scene, info, bar); api.stage.append(box);
    const nm = i => 'the ' + C[V.chars[i]].n.toLowerCase();
    const list = S => S.length === 1 ? nm(S[0]) : S.slice(0, -1).map(nm).join(', ') + ' and ' + nm(S[S.length - 1]);
    const chBtns = [];
    function chBtn(i, bad) {
      const ch = C[V.chars[i]];
      const b = el('button', 'tile c-card rv-ch' + (hop.has(i) ? ' hop' : '') + (bad && bad.includes(i) ? ' bad' : '') + (side[i] !== boatSide && !inBoat.includes(i) && !(bad && bad.includes(i)) ? ' dim' : ''), ch.e);
      b.type = 'button'; b.setAttribute('aria-label', ch.n); b.onclick = () => tapCh(i); chBtns[i] = b; return b;
    }
    function render(bad) {
      far.innerHTML = '<span class="rv-tag">🏁</span>'; near.innerHTML = '<span class="rv-tag">🏠</span>'; boat.innerHTML = '';
      for (let i = 0; i < n; i++) if (!inBoat.includes(i)) (side[i] ? far : near).append(chBtn(i, bad));
      inBoat.forEach(i => boat.append(chBtn(i, bad)));
      for (let k = inBoat.length; k < V.cap; k++) boat.append(el('span', 'rv-seat'));
      boat.classList.toggle('far', boatSide === 1);
      far.classList.toggle('allhere', side.every(x => x === 1) && !inBoat.length);
      rowBtn.disabled = busy || finished || !inBoat.length;
      undoBtn.disabled = busy || finished || !history.length;
      info.innerHTML = `Crossings: <b>${crossings}</b> · Fewest possible: <b>${min0}</b>`;
      hop.clear();
    }
    function tapCh(i) {
      if (busy || finished) return;
      untip(api.stage);
      if (inBoat.includes(i)) { inBoat = inBoat.filter(x => x !== i); hop.add(i); sfx.tap(); render(); api.hint(HINT0); return; }
      if (side[i] !== boatSide) { wob(chBtns[i]); api.hint(`The boat is on the other side. Only someone on the ${boatSide ? 'far' : 'near'} side can get in.`); return; }
      if (inBoat.length >= V.cap) { wob(boat); api.hint(`The boat is full. It holds ${V.cap}.`); return; }
      if (V.maxW) {
        const w = inBoat.concat(i).reduce((a, k) => a + (C[V.chars[k]].w || 1), 0);
        if (w > V.maxW) { wob(boat); api.hint('Too heavy! The boat holds one grown-up, or two children.'); return; }
      }
      inBoat.push(i); hop.add(i); tone(440 + inBoat.length * 80, .1, 'triangle', .1); render();
      api.hint(inBoat.some(k => C[V.chars[k]].row) ? 'Tap “Row across” when you’re ready, or add someone else.' : (V.chars.includes('farmer') ? 'Someone needs to row: only the farmer can.' : 'Tap “Row across” when you’re ready.'));
    }
    function row() {
      if (busy || finished || !inBoat.length) return;
      untip(api.stage);
      if (!inBoat.some(i => C[V.chars[i]].row)) { wob(boat); sfx.soft(); api.hint('Only the farmer can row the boat. Put the farmer in too.'); return; }
      const before = { side: side.slice(), boatSide }, S = inBoat.slice();
      busy = true; boatSide = 1 - boatSide; crossings++; render();
      [0, 1, 2].forEach(k => tone(260 + k * 30, .16, 'sine', .07, k * .22));
      api.later(() => {
        S.forEach(i => { side[i] = boatSide; hop.add(i); }); inBoat = [];
        const bad = rvBad(V, side);
        if (bad) {
          mistakes++; sfx.soft(); render(bad.who);
          bad.who.forEach(i => wob(chBtns[i]));
          const away = V.chars.includes('farmer') ? 'With the farmer away, ' : 'Oh dear: ';
          api.hint(`${away}${bad.r.say}! Let’s row back and try another way.`);
          api.later(() => {
            boatSide = before.boatSide; inBoat = S.slice(); S.forEach(i => { side[i] = before.side[i]; }); render();
            api.later(() => { inBoat = []; side = before.side.slice(); crossings--; busy = false; S.forEach(i => hop.add(i)); render(); api.hint(HINT0); }, 750);
          }, 2200);
          return;
        }
        history.push(before); busy = false;
        if (side.every(x => x === 1)) {
          finished = true; render(); rise(5);
          api.hint(cheer() + ' Everyone is safely across.');
          api.done(starsFor(Math.max(0, crossings - min0) + mistakes * 2 + hints, 1, 5));
          return;
        }
        render(); api.hint('Safe! Who goes next? Tap someone to put them in the boat.');
      }, 760);
    }
    function undo() {
      if (busy || finished || !history.length) return;
      const h = history.pop(); side = h.side; boatSide = h.boatSide; inBoat = []; crossings = Math.max(0, crossings - 1);
      sfx.tap(); untip(api.stage); render(); api.hint(HINT0);
    }
    function nextLoad() { const path = rvBFS(V, side, boatSide); return path && path.length ? path[0] : null; }
    function hint() {
      if (busy || finished) return;
      const S = nextLoad(); if (!S) return;
      hints++; sfx.tap();
      const out = inBoat.filter(i => !S.includes(i));
      if (out.length) { inBoat = inBoat.filter(i => S.includes(i)); out.forEach(i => hop.add(i)); render(); }
      S.forEach(i => tip(chBtns[i]));
      api.hint(S.length === 1 ? `Next: ${list(S)} rows across alone. Put them in the boat, then row.` : `Next: take ${list(S)} across. Put them in the boat, then row.`);
      if (S.every(i => inBoat.includes(i))) tip(rowBtn);
    }
    render();
    if (TEST) window.__l4cur = { V, min: min0, step() { if (busy || finished) return false; const S = nextLoad(); if (!S) return false; inBoat = []; S.forEach(i => tapCh(i)); row(); return true; }, get busy() { return busy; }, bad() { if (busy) return; inBoat = []; const S = rvLoads(V, side, boatSide).find(S => rvBad(V, side.map((x, i) => S.includes(i) ? 1 - x : x))); if (S) { S.forEach(i => tapCh(i)); row(); } return !!S; } };
  }

  if (TEST) R._l4 = { hnCount, hnNext, mtLayout, mtParse, mtMoves, mtGen, bmGen, bmTrace, jgBFS, jgGen, jgPlan, rvBFS, RV };
})();
