/* Recall: Logic 2 (Light Flip, Pipe Flow, Balance Scales, Who Lives Where?, Train Tracks) */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor, CUBES } = R;
  const PAL = CUBES.concat([{ c: 'orange', s: '◆' }, { c: 'grape', s: '✚' }]);
  const NAMES = { coral: 'red', sky: 'blue', sun: 'yellow', leaf: 'green', berry: 'pink', orange: 'orange', grape: 'purple' };
  const TEST = !!window.__recallTest; // test hooks only exist when a test harness sets this before load

  R.css(`
/* ---- shared (l2-) ---- */
.l2-bar{display:flex; flex-wrap:wrap; justify-content:center; gap:12px 14px; margin-top:20px}
.l2-bar .btn{min-width:120px}
.l2-info{text-align:center; font:600 1.25rem var(--display); margin:14px 0 0; color:var(--on-table)}
.l2-info b{color:var(--sun)}
.l2-sel{outline:4px solid #fff; outline-offset:3px}
@keyframes l2-ring{0%,100%{box-shadow:0 0 0 4px #fff, 0 0 0 10px rgba(255,255,255,.35)}50%{box-shadow:0 0 0 6px #fff, 0 0 0 16px rgba(255,255,255,.12)}}

/* ---- Light Flip (lf-) ---- */
.lf-board{display:grid; gap:var(--g); margin:0 auto; width:max-content; padding:calc(var(--g) * 1.6); border-radius:24px;
  background:linear-gradient(180deg, #4A3323, #34231A); box-shadow:inset 0 2px 0 rgba(255,255,255,.12), 0 7px 0 #22160E, 0 14px 24px rgba(0,0,0,.3)}
.lf-cell{width:var(--cs); height:var(--cs); padding:0; cursor:pointer; --c:#55636D; --d:#2E3A42; border-radius:24%; transition:background .25s, box-shadow .25s}
.lf-cell.lf-on{--c:var(--sun); --d:var(--sun-d);
  box-shadow:inset 0 -6px 0 rgba(0,0,0,.14), inset 0 3px 0 rgba(255,255,255,.5), 0 6px 0 var(--d), 0 0 calc(var(--cs) * .4) calc(var(--cs) * .08) rgba(255,205,80,.7)}
.lf-bulb{width:48%; height:48%; border-radius:50%; background:#2B353C; border:3px solid rgba(255,255,255,.22); box-shadow:inset 0 4px 8px rgba(0,0,0,.6); transition:all .25s}
.lf-on .lf-bulb{background:radial-gradient(circle at 38% 32%, #fff 0 18%, #FFF6C4 32%, #FFD84A 70%); border-color:#fff; box-shadow:0 0 calc(var(--cs) * .25) calc(var(--cs) * .06) rgba(255,246,190,.95)}
.lf-flip{animation:lf-flip .35s backwards}
@keyframes lf-flip{0%{scale:1}35%{scale:.82}70%{scale:1.08}100%{scale:1}}
.lf-cell.lf-hint{animation:l2-ring 1s infinite}
.lf-win{animation:lf-win .6s backwards}
@keyframes lf-win{0%{scale:1}40%{scale:1.18; filter:brightness(1.3)}100%{scale:1}}

/* ---- Pipe Flow (pp-) ---- */
.pp-wrap{display:flex; justify-content:center; align-items:flex-start}
.pp-taps{display:grid; gap:4px; padding:8px 0}
.pp-tapc{width:40px; height:var(--cs); position:relative}
.pp-tapc .pp-icon{position:absolute; left:-4px; top:50%; translate:0 -78%; font-size:30px; line-height:1; filter:drop-shadow(0 3px 2px rgba(0,0,0,.3))}
.pp-stub{position:absolute; right:-8px; top:calc(50% - var(--cs) * .19); width:30px; height:calc(var(--cs) * .38); background:#5E6D78; border-radius:6px 0 0 6px; display:grid; align-items:center}
.pp-stub i{display:block; height:42%; margin-left:4px; background:#C9D3DA; transition:background .25s}
.pp-stub.pp-wet i{background:var(--sky)}
.pp-board{display:grid; gap:4px; padding:8px; border-radius:20px; background:#3D7A3A; box-shadow:inset 0 3px 0 rgba(255,255,255,.15), 0 7px 0 #285326, 0 14px 24px rgba(0,0,0,.3)}
.pp-cell{position:relative; width:var(--cs); height:var(--cs); border:0; padding:0; border-radius:14%; cursor:pointer; overflow:hidden;
  background:linear-gradient(155deg, rgba(255,255,255,.25), rgba(255,255,255,0) 55%), #7CC46A; box-shadow:inset 0 -4px 0 rgba(0,0,0,.14)}
.pp-cell.pp-grass{cursor:default; background:#6DB25C; display:grid; place-items:center; font-size:calc(var(--cs) * .32); opacity:.9}
.pp-rot{position:absolute; inset:0; transition:transform .22s cubic-bezier(.3,1.4,.5,1)}
.pp-rot svg{width:100%; height:100%; display:block}
.pp-cell path{fill:none}
.pp-out path{stroke:#5E6D78} .pp-out circle{fill:#5E6D78}
.pp-fl{fill:#8E9CA6}
.pp-in path{stroke:#C9D3DA; transition:stroke .25s} .pp-in circle{fill:#C9D3DA; transition:fill .25s}
.pp-flow{stroke:#fff; opacity:0; stroke-dasharray:5 13; transition:opacity .25s}
.pp-wet .pp-in path{stroke:var(--sky)} .pp-wet .pp-in circle{fill:var(--sky)}
.pp-wet .pp-flow{opacity:.75; animation:pp-run .7s linear infinite}
@keyframes pp-run{to{stroke-dashoffset:-18}}
.pp-pot{position:absolute; inset:0; display:grid; place-items:center; font-size:calc(var(--cs) * .44); pointer-events:none; filter:drop-shadow(0 3px 2px rgba(0,0,0,.3))}
.pp-pot.pp-bloom{animation:bounceIn .5s}
.pp-cell.pp-hint{outline:4px solid #fff; outline-offset:-4px}

/* ---- Balance Scales (bs-) ---- */
.bs-scales{display:flex; flex-wrap:wrap; justify-content:center; gap:12px; max-width:640px; margin:0 auto}
.bs-scale{width:calc(50% - 6px); max-width:150px; padding:6px 4px 2px; border-radius:20px; background:var(--card); box-shadow:0 6px 0 var(--card-edge), 0 10px 18px rgba(0,0,0,.25); transition:box-shadow .2s, transform .2s}
.bs-scale svg{display:block; width:100%; height:auto; overflow:visible}
.bs-scale.bs-glow{box-shadow:0 6px 0 var(--sun-d), 0 0 0 5px var(--sun), 0 10px 22px rgba(0,0,0,.3); transform:translateY(-4px)}
.bs-beam, .bs-pan{transition:transform .9s cubic-bezier(.3,1.5,.5,1); transform-box:view-box}
.bs-beam{transform-origin:70px 30px}
.bs-q{text-align:center; font:700 1.5rem var(--display); margin:18px 0 10px; color:var(--on-table)}
.bs-items{display:flex; flex-wrap:wrap; justify-content:center; gap:8px; max-width:420px; margin:0 auto}
.bs-item{width:clamp(54px, calc((100% - 32px) / 5), 62px); aspect-ratio:1; font-size:34px; cursor:pointer; padding:0}
.bs-item.bs-used{opacity:.25; pointer-events:none}
.bs-item.bs-right{--c:var(--leaf); --d:var(--leaf-d); animation:bounceIn .4s}
.bs-order{display:grid; width:max-content; margin:0 auto 16px; gap:4px}
.bs-slots{display:flex; gap:8px}
.bs-ends{display:flex; justify-content:space-between}
.bs-lab{font:700 1.15rem var(--display); color:var(--on-table-soft)}
.bs-slot{width:54px; height:54px; border-radius:18px; border:3px dashed rgba(255,255,255,.55); display:grid; place-items:center; font-size:34px}
.bs-slot.bs-full{border:0; background:var(--card); box-shadow:0 5px 0 var(--card-edge); animation:bounceIn .35s}

/* ---- Who Lives Where? (wh-) ---- */
.wh-clues{display:grid; gap:8px; max-width:760px; margin:0 auto 16px}
@media (min-width:600px){ .wh-clues{grid-template-columns:1fr 1fr} }
.wh-clue{display:flex; align-items:center; gap:8px; padding:6px 12px; min-height:48px; border-radius:16px; background:var(--card); color:var(--ink);
  font:600 1.08rem/1.25 var(--body); box-shadow:0 4px 0 var(--card-edge); transition:background .25s, box-shadow .25s}
.wh-clue .wh-tick{flex:none; width:28px; height:28px; border-radius:50%; display:grid; place-items:center; font:700 1.1rem var(--display); background:#EFE5D2; color:transparent; transition:all .25s}
.wh-clue.wh-ok{background:var(--good-bg)}
.wh-clue.wh-ok .wh-tick{background:var(--leaf); color:#fff}
.wh-clue.wh-bad{background:#FFE0D6; box-shadow:0 4px 0 var(--coral-d), 0 0 0 4px var(--coral)}
.wh-pet{font-size:1.6rem; line-height:1; vertical-align:-4px}
.wh-chip{display:inline-grid; width:30px; height:30px; border-radius:9px; font:700 .95rem var(--body); vertical-align:-7px;
  box-shadow:inset 0 -3px 0 rgba(0,0,0,.15), 0 3px 0 var(--d)}
.wh-street{display:flex; justify-content:center; gap:var(--hg); padding:0 6px 10px; border-bottom:10px solid #9BA5AD; border-radius:0 0 6px 6px; width:max-content; margin:0 auto}
.wh-house{width:var(--hw); border:0; padding:0; background:none; cursor:pointer; display:flex; flex-direction:column; align-items:center; position:relative}
.wh-roof{width:112%; height:calc(var(--hw) * .42); background:linear-gradient(180deg, #D0603F, #A8432A); clip-path:polygon(50% 0, 100% 100%, 0 100%); display:grid; place-items:end center; padding-bottom:2px;
  font:700 1rem var(--display); color:#fff}
.wh-body{width:100%; height:calc(var(--hw) * 1.12); background:var(--card); border-radius:0 0 10px 10px; box-shadow:0 5px 0 var(--card-edge), 0 10px 16px rgba(0,0,0,.25);
  display:flex; flex-direction:column; align-items:center; justify-content:space-between; padding:6px 0 0}
.wh-win{width:calc(var(--hw) * .62); height:calc(var(--hw) * .52); border-radius:12px; border:3px dashed #CBBFA8; display:grid; place-items:center; font-size:calc(var(--hw) * .4); line-height:1}
.wh-win.wh-full{border:3px solid #CBBFA8; background:#E8F4FF; animation:bounceIn .3s}
.wh-door{width:calc(var(--hw) * .42); height:calc(var(--hw) * .46); border-radius:10px 10px 0 0; font:700 calc(var(--hw) * .22)/1 var(--body);
  box-shadow:inset 0 -4px 0 rgba(0,0,0,.15), inset 0 3px 0 rgba(255,255,255,.5)}
.wh-house.wh-can .wh-win{border-color:var(--sun-d); background:#FFF4CF}
.wh-house.wh-picked .wh-win{outline:4px solid var(--sun); outline-offset:2px}
.wh-tray{display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:12px; margin-top:18px; min-height:68px}
.wh-res{width:64px; height:64px; font-size:38px; padding:0; cursor:pointer; transition:translate .15s}
.wh-res.l2-sel{translate:0 -8px}
.wh-solved .wh-win{animation:bounceIn .5s backwards}

/* ---- Train Tracks (tt-) ---- */
.tt-board{position:relative; display:grid; gap:4px; margin:0 auto; width:max-content; padding:8px; border-radius:20px; background:#3D7A3A;
  box-shadow:inset 0 3px 0 rgba(255,255,255,.15), 0 7px 0 #285326, 0 14px 24px rgba(0,0,0,.3)}
.tt-cell{position:relative; width:var(--cs); height:var(--cs); border:0; padding:0; border-radius:14%; cursor:pointer; overflow:hidden;
  background:linear-gradient(155deg, rgba(255,255,255,.25), rgba(255,255,255,0) 55%), #8ACB72; box-shadow:inset 0 -4px 0 rgba(0,0,0,.14)}
.tt-cell.tt-fix{background:linear-gradient(155deg, rgba(255,255,255,.18), rgba(255,255,255,0) 55%), #6FB45C; cursor:default}
.tt-cell.tt-fix::after{content:""; position:absolute; right:7%; top:7%; width:12%; height:12%; border-radius:50%; background:#3E6E35; box-shadow:inset 0 1px 0 rgba(255,255,255,.3)}
.tt-cell.tt-empty{box-shadow:inset 0 -4px 0 rgba(0,0,0,.14), inset 0 0 0 3px rgba(255,255,255,.45)}
.tt-cell svg{position:absolute; inset:0; width:100%; height:100%}
.tt-cell path{fill:none}
.tt-ties{stroke:#8B5A2B}
.tt-rail{stroke:#66727C; transition:stroke .25s}
.tt-lit .tt-rail{stroke:#F2B705}
.tt-new{animation:bounceIn .22s}
.tt-emo{position:absolute; inset:0; display:grid; place-items:center; font-size:calc(var(--cs) * .5); line-height:1; pointer-events:none; filter:drop-shadow(0 3px 2px rgba(0,0,0,.3))}
.tt-pass{font-size:calc(var(--cs) * .4); place-items:start end; padding:3px 4px}
.tt-pass.tt-gone{animation:pop .4s forwards}
.tt-cell.tt-hint{outline:4px solid #fff; outline-offset:-4px}
.tt-train{position:absolute; z-index:5; width:var(--cs); height:var(--cs); margin:calc(var(--cs) / -2) 0 0 calc(var(--cs) / -2); display:grid; place-items:center;
  font-size:calc(var(--cs) * .62); line-height:1; pointer-events:none; transition:left .32s linear, top .32s linear; filter:drop-shadow(0 4px 3px rgba(0,0,0,.35))}
.tt-train span{display:block; transition:transform .2s}
`);

  register({ id: 'flip', cat: 'logic', order: 8, name: 'Light Flip', icon: '💡', desc: 'Tap the lamps to switch them all on', start: startFlip });
  register({ id: 'pipes', cat: 'logic', order: 9, name: 'Pipe Flow', icon: '🚰', desc: 'Turn the pipes to water the flowers', start: startPipes });
  register({ id: 'scales', cat: 'logic', order: 10, name: 'Balance Scales', icon: '⚖️', desc: 'Read the scales to find the heaviest', start: startScales });
  register({ id: 'houses', cat: 'logic', order: 11, name: 'Who Lives Where?', icon: '🏘️', desc: 'Use the clues to find each pet’s home', start: startHouses });
  register({ id: 'tracks', cat: 'logic', order: 12, name: 'Train Tracks', icon: '🚂', desc: 'Lay track to take the train to the sea', start: startTracks });

  /* ---------- shared bits ---------- */
  const stageW = api => Math.max(280, Math.min(api.stage.clientWidth || 340, 1000));
  const mkBtn = (cls, html, fn) => { const b = el('button', cls, html); b.type = 'button'; if (fn) b.onclick = fn; return b; };
  const nb4 = (i, n) => { const r = (i / n) | 0, c = i % n, o = []; if (r) o.push(i - n); if (r < n - 1) o.push(i + n); if (c) o.push(i - 1); if (c < n - 1) o.push(i + 1); return o; };
  const range = n => [...Array(n).keys()];
  const reanim = (e, cls, delay) => { e.classList.remove(cls); void e.offsetWidth; e.style.animationDelay = (delay || 0) + 'ms'; e.classList.add(cls); };
  // directions as bits: N=1 E=2 S=4 W=8
  const DIRS = [1, 2, 4, 8], OPP = { 1: 4, 2: 8, 4: 1, 8: 2 }, DRC = { 1: [-1, 0], 2: [0, 1], 4: [1, 0], 8: [0, -1] };
  const rotCW = m => ((m << 1) | (m >> 3)) & 15;
  const rotN = (m, k) => { for (let i = 0; i < k; i++) m = rotCW(m); return m; };
  const bits = m => DIRS.filter(d => m & d);
  const step = (i, d, Rr, C) => { const r = ((i / C) | 0) + DRC[d][0], c = i % C + DRC[d][1]; return r < 0 || r >= Rr || c < 0 || c >= C ? -1 : r * C + c; };
  const dirTo = (a, b, Rr, C) => DIRS.find(d => step(a, d, Rr, C) === b);
  // keep tall boards inside short (laptop) screens without shrinking tap targets below ~56px
  const fitH = (cs, rows, extra) => Math.min(cs, Math.max(56, Math.floor((innerHeight - extra) / rows)));

  /* =========================================================
     1. LIGHT FLIP
     ========================================================= */
  // minimal set of presses that toggles exactly the cells in `need`, solved over GF(2)
  function gfSolve(n, need) {
    const N = n * n, rows = range(N).map(i => { let m = 0; [i].concat(nb4(i, n)).forEach(j => { m |= 1 << j; }); return { m, b: need[i] ? 1 : 0 }; });
    const piv = []; let r = 0;
    for (let c = 0; c < N && r < N; c++) {
      let p = -1; for (let k = r; k < N; k++) if ((rows[k].m >> c) & 1) { p = k; break; }
      if (p < 0) continue;
      [rows[r], rows[p]] = [rows[p], rows[r]];
      for (let k = 0; k < N; k++) if (k !== r && ((rows[k].m >> c) & 1)) { rows[k].m ^= rows[r].m; rows[k].b ^= rows[r].b; }
      piv.push(c); r++;
    }
    for (let k = r; k < N; k++) if (rows[k].b) return null;
    const free = range(N).filter(c => !piv.includes(c));
    let best = null;
    for (let f = 0; f < (1 << free.length); f++) {
      let x = 0; free.forEach((c, q) => { if ((f >> q) & 1) x |= 1 << c; });
      for (let q = 0; q < r; q++) { let v = rows[q].b; free.forEach(fc => { if (((rows[q].m >> fc) & 1) && ((x >> fc) & 1)) v ^= 1; }); if (v) x |= 1 << piv[q]; }
      const w = range(N).filter(j => (x >> j) & 1);
      if (!best || w.length < best.length) best = w;
    }
    return best;
  }
  function startFlip(L, api) {
    const T = [[3, 1, 2], [3, 2, 3], [3, 3, 4], [4, 3, 4], [4, 4, 5], [4, 5, 6], [5, 5, 7], [5, 6, 8], [5, 7, 9]];
    const [n, k0, k1] = T[Math.min(L, T.length) - 1], N = n * n;
    const area = i => [i].concat(nb4(i, n));
    let on;
    // work backwards from all lamps on, so it is always solvable
    for (;;) {
      on = Array(N).fill(1);
      shuffle(range(N)).slice(0, k0 + randInt(k1 - k0 + 1)).forEach(p => area(p).forEach(j => { on[j] ^= 1; }));
      if (on.some(v => !v)) break;
    }
    const start = on.slice(), par = gfSolve(n, on.map(v => 1 - v)).length;
    let taps = 0, hints = 0, finished = false, hintAt = -1;
    api.hint('Tap a lamp to switch it and the lamps next to it. Turn every lamp on.');
    const Wd = Math.min(stageW(api), 520), g = n <= 3 ? 10 : n === 4 ? 8 : 6;
    const cs = fitH(Math.floor(Math.min(n <= 3 ? 92 : 80, (Wd - g * 3.2 - g * (n - 1) - 4) / n)), n, 380);
    const board = el('div', 'lf-board');
    board.style.cssText = `--g:${g}px; --cs:${cs}px; grid-template-columns:repeat(${n}, ${cs}px)`;
    const cells = range(N).map(i => { const b = mkBtn('tile lf-cell', '<span class="lf-bulb"></span>', () => press(i)); board.append(b); return b; });
    const info = el('p', 'l2-info'), bar = el('div', 'l2-bar');
    bar.append(mkBtn('btn c-sun', '💡 Hint', hint), mkBtn('btn c-card', '↺ Start again', () => {
      if (finished) return; on = start.slice(); hintAt = -1; sfx.tap(); render(range(N), -1); api.hint('Back to the start. Turn every lamp on.');
    }));
    api.stage.append(board, info, bar);
    function render(changed, from) {
      cells.forEach((b, i) => {
        b.classList.toggle('lf-on', !!on[i]); b.classList.toggle('lf-hint', i === hintAt);
        b.setAttribute('aria-label', `Lamp ${i + 1}, ${on[i] ? 'on' : 'off'}`);
        if (changed && changed.includes(i)) reanim(b, 'lf-flip', i === from ? 0 : 70);
      });
      info.innerHTML = `Lamps on <b>${on.filter(Boolean).length}</b> of ${N}`;
    }
    function press(i) {
      if (finished) return;
      const a = area(i); a.forEach(j => { on[j] ^= 1; });
      taps++; hintAt = -1;
      const lit = on.filter(Boolean).length;
      tone(300 + lit / N * 520, .12, 'triangle', .12);
      render(a, i);
      if (lit === N) return win();
      api.hint(N - lit <= 2 ? `Nearly there! ${N - lit === 1 ? 'One lamp is' : 'Two lamps are'} still off.` : 'Tap a lamp again to undo it. Turn every lamp on.');
    }
    function hint() {
      if (finished) return;
      const s = gfSolve(n, on.map(v => 1 - v));
      if (!s || !s.length) return;
      hints++; hintAt = pick(s); sfx.tap(); render();
      api.hint('Try tapping the lamp with the white ring.');
    }
    function win() {
      finished = true;
      cells.forEach((b, i) => reanim(b, 'lf-win', (((i / n) | 0) + (i % n)) * 70));
      [0, 1, 2, 3].forEach(k => tone(523 * Math.pow(1.26, k), .2, 'sine', .12, k * .1));
      sfx.good(); toast(cheer()); api.hint('Every lamp is shining!');
      api.later(() => api.done(starsFor(Math.max(0, taps - par) + hints * 2, 2, 6)), 1100);
    }
    render();
    if (TEST) api.stage.__auto = () => gfSolve(n, on.map(v => 1 - v)).forEach(i => cells[i].click());
  }

  /* =========================================================
     2. PIPE FLOW
     ========================================================= */
  const ARM = { 1: 'M50 50V0', 2: 'M50 50H100', 4: 'M50 50V100', 8: 'M50 50H0' };
  const FLANGE = { 1: [27, 0, 46, 9], 2: [91, 27, 9, 46], 4: [27, 91, 46, 9], 8: [0, 27, 9, 46] };
  function pipeSVG(m) {
    const d = bits(m).map(b => ARM[b]).join(' ');
    const fl = bits(m).map(b => { const [x, y, w, h] = FLANGE[b]; return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/>`; }).join('');
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><g class="pp-out"><path d="${d}" stroke-width="38"/><circle cx="50" cy="50" r="19"/></g>` +
      `<g class="pp-fl">${fl}</g><g class="pp-in"><path d="${d}" stroke-width="16"/><circle cx="50" cy="50" r="8"/></g><path class="pp-flow" d="${d}" stroke-width="6"/></svg>`;
  }
  function startPipes(L, api) {
    const SP = [[2, 3, 'p', 3, 4], [3, 3, 'p', 4, 6], [3, 4, 'p', 6, 8], [3, 4, 't', 1], [4, 4, 't', 2], [4, 5, 't', 2], [5, 5, 't', 3], [6, 5, 't', 3]];
    let [Rr, C, kind, a, b] = SP[Math.min(L, SP.length) - 1];
    const Wd = Math.min(stageW(api), 560), side = 40 + 16;
    while (C > 3 && (Wd - side - 4 * (C - 1)) / C < 52) C--;
    const cs = fitH(Math.floor(Math.min(84, (Wd - side - 4 * (C - 1)) / C)), Rr, 360);
    const N = Rr * C, r0 = randInt(Rr), root = r0 * C;
    const sol = Array(N).fill(0), parent = Array(N).fill(-1), depth = Array(N).fill(-1);
    depth[root] = 0;
    const link = (x, j) => { const d = dirTo(x, j, Rr, C); sol[x] |= d; sol[j] |= OPP[d]; parent[j] = x; depth[j] = depth[x] + 1; };
    let flowers;
    if (kind === 'p') {
      // a single winding pipe from the tap to one flower
      let path = [root];
      for (let t = 0; t < 500; t++) {
        path = [root]; const seen = new Set(path), want = a + randInt(b - a + 1);
        while (path.length < want) {
          const opts = DIRS.map(d => step(path[path.length - 1], d, Rr, C)).filter(j => j >= 0 && !seen.has(j));
          if (!opts.length) break;
          const nx = pick(opts); path.push(nx); seen.add(nx);
        }
        if (path.length >= a) break;
      }
      path.forEach((c, k) => { if (k) link(path[k - 1], c); });
      flowers = [path[path.length - 1]];
    } else {
      // a random spanning tree over every square, rooted at the tap
      const inT = new Set([root]);
      while (inT.size < N) {
        const cand = [];
        inT.forEach(x => DIRS.forEach(d => { const j = step(x, d, Rr, C); if (j >= 0 && !inT.has(j)) cand.push([x, j]); }));
        const [x, j] = pick(cand); link(x, j); inT.add(j);
      }
      const leaves = range(N).filter(i => i !== root && bits(sol[i]).length === 1).sort((p, q) => depth[q] - depth[p]);
      flowers = shuffle(leaves.slice(0, Math.max(a, Math.ceil(leaves.length / 2)))).slice(0, a);
    }
    sol[root] |= 8;
    const isFlower = range(N).map(i => flowers.includes(i));
    // the squares water must pass through, nearest the tap first
    const needSet = new Set(); flowers.forEach(f => { for (let x = f; x >= 0; x = parent[x]) needSet.add(x); });
    const needed = [...needSet].sort((p, q) => depth[p] - depth[q]);
    const cur = sol.slice();
    const flow = () => {
      const dist = Array(N).fill(-1); if (!(cur[root] & 8)) return dist;
      dist[root] = 0; const q = [root];
      while (q.length) { const x = q.shift(); bits(cur[x]).forEach(d => { const j = step(x, d, Rr, C); if (j >= 0 && dist[j] < 0 && (cur[j] & OPP[d])) { dist[j] = dist[x] + 1; q.push(j); } }); }
      return dist;
    };
    // scramble by turning pieces, so turning them back always works
    for (let t = 0; t < 50; t++) {
      for (let i = 0; i < N; i++) cur[i] = sol[i];
      const pool = L <= 1 ? shuffle(needed.slice()).slice(0, 2) : L === 2 ? shuffle(needed.slice()).slice(0, 3 + randInt(2)) : range(N).filter(i => sol[i]);
      pool.forEach(i => { const o = [1, 2, 3].filter(k => rotN(sol[i], k) !== sol[i]); if (o.length) cur[i] = rotN(sol[i], pick(o)); });
      const d = flow(); if (!flowers.every(f => d[f] >= 0)) break;
    }
    const taps0 = i => { for (let k = 0; k < 4; k++) if (rotN(cur[i], k) === sol[i]) return k; return 0; };
    const par = needed.reduce((s, i) => s + taps0(i), 0);
    let taps = 0, hints = 0, finished = false, wasWet = Array(N).fill(false);
    api.hint(flowers.length > 1 ? `Tap the pipes to turn them. Get water from the tap 🚰 to all ${flowers.length} seedlings 🌱.` : 'Tap the pipes to turn them. Get water from the tap 🚰 to the seedling 🌱.');
    const wrap = el('div', 'pp-wrap'); wrap.style.setProperty('--cs', cs + 'px');
    const tapsCol = el('div', 'pp-taps'); tapsCol.style.gridTemplateRows = `repeat(${Rr}, ${cs}px)`;
    let stub = null;
    for (let r = 0; r < Rr; r++) {
      const t = el('div', 'pp-tapc');
      if (r === r0) { t.innerHTML = '<span class="pp-stub"><i></i></span><span class="pp-icon">🚰</span>'; stub = t.firstChild; }
      tapsCol.append(t);
    }
    const board = el('div', 'pp-board'); board.style.gridTemplateColumns = `repeat(${C}, ${cs}px)`;
    const ang = Array(N).fill(0), rots = [], pots = [];
    const cells = range(N).map(i => {
      if (!sol[i]) { const g = mkBtn('pp-cell pp-grass', pick(['', '', '🌼', '🍀'])); g.setAttribute('aria-label', 'Grass'); g.onclick = () => wob(g); board.append(g); return g; }
      const btn = mkBtn('pp-cell', '', () => turn(i));
      const rot = el('div', 'pp-rot', pipeSVG(cur[i])); rots[i] = rot; btn.append(rot);
      if (isFlower[i]) { const p = el('span', 'pp-pot', '🌱'); pots[i] = p; btn.append(p); }
      btn.setAttribute('aria-label', isFlower[i] ? 'Seedling pipe' : 'Pipe');
      board.append(btn); return btn;
    });
    wrap.append(tapsCol, board);
    const bar = el('div', 'l2-bar'); bar.append(mkBtn('btn c-sun', '💡 Hint', hint));
    api.stage.append(wrap, bar);
    function render() {
      const dist = flow();
      stub.classList.toggle('pp-wet', !!(cur[root] & 8));
      let newly = 0;
      cells.forEach((c, i) => {
        if (!sol[i]) return;
        const wet = dist[i] >= 0;
        c.classList.toggle('pp-wet', wet);
        c.querySelectorAll('.pp-in path, .pp-in circle').forEach(e => { e.style.transitionDelay = wet && !wasWet[i] ? dist[i] * 60 + 'ms' : '0ms'; });
        if (isFlower[i] && wet !== wasWet[i]) {
          pots[i].textContent = wet ? '🌻' : '🌱';
          if (wet) { newly++; reanim(pots[i], 'pp-bloom', dist[i] * 60); }
        }
        wasWet[i] = wet;
      });
      if (newly) tone(660, .16, 'sine', .14, .15), tone(880, .2, 'sine', .12, .28);
      return dist;
    }
    function turn(i, quiet) {
      if (finished) return;
      cur[i] = rotCW(cur[i]); ang[i] += 90; rots[i].style.transform = `rotate(${ang[i]}deg)`;
      if (!quiet) { taps++; tone(380 + randInt(4) * 40, .07, 'triangle', .09); cells.forEach(c => c.classList.remove('pp-hint')); }
      const dist = render();
      const got = flowers.filter(f => dist[f] >= 0).length;
      if (got === flowers.length) {
        finished = true; const far = Math.max(...dist);
        api.hint(flowers.length > 1 ? 'The water reached every seedling. They’re blooming!' : 'The water reached the seedling. It’s blooming!');
        api.later(() => { sfx.good(); toast(cheer()); }, Math.min(far * 60, 900) + 200);
        api.later(() => api.done(starsFor(Math.max(0, taps - par) + hints * 3, Math.max(2, par >> 1), par + 6)), Math.min(far * 60, 900) + 1300);
      } else if (!quiet) api.hint(got ? `${got} of ${flowers.length} seedlings have water. Keep going!` : 'Tap the pipes to turn them. Join them up from the tap 🚰.');
    }
    function hint() {
      if (finished) return;
      const i = needed.find(x => cur[x] !== sol[x]);
      if (i == null) return;
      hints++; sfx.tap();
      const k = taps0(i);
      for (let s = 0; s < k; s++) turn(i, true);
      cells[i].classList.add('pp-hint');
      if (!finished) api.hint('I turned one pipe the right way for you.');
    }
    render();
    if (TEST) api.stage.__auto = () => needed.forEach(i => { while (!finished && cur[i] !== sol[i]) cells[i].click(); });
  }

  /* =========================================================
     3. BALANCE SCALES
     ========================================================= */
  const FRUIT = ['🍎', '🍐', '🍊', '🍋', '🍑', '🥝', '🍌', '🍇'];
  function scaleSVG(left, right) {
    return `<svg viewBox="0 0 140 104" aria-hidden="true">
<rect x="48" y="92" width="44" height="9" rx="4" fill="#A47A35"/><rect x="66" y="30" width="8" height="64" rx="3" fill="#C9A35A"/>
<g class="bs-beam"><rect x="16" y="27" width="108" height="7" rx="3.5" fill="#A47A35"/></g>
<circle cx="70" cy="30" r="6" fill="#E9C67E" stroke="#A47A35" stroke-width="2"/>
<g class="bs-pan bs-pl"><path d="M21 31 L5 70 M21 31 L37 70" stroke="#8a6a3a" stroke-width="1.6"/><text x="21" y="64" font-size="27" text-anchor="middle">${left}</text><path d="M2 69 H40 Q38 79 21 79 Q4 79 2 69Z" fill="#E9C67E" stroke="#A47A35" stroke-width="2"/></g>
<g class="bs-pan bs-pr"><path d="M119 31 L103 70 M119 31 L135 70" stroke="#8a6a3a" stroke-width="1.6"/><text x="119" y="64" font-size="27" text-anchor="middle">${right}</text><path d="M100 69 H138 Q136 79 119 79 Q102 79 100 69Z" fill="#E9C67E" stroke="#A47A35" stroke-width="2"/></g>
</svg>`;
  }
  function startScales(L, api) {
    const total = 3;
    let round = 0, mistakes = 0, busy = false;
    api.rounds(total, 0);
    const spec = () => {
      const T = [[2, 'h'], [3, 'h'], [3, 'o'], [4, 'h'], [4, 'o'], [5, 'h'], [5, 'o']];
      if (L <= T.length) { const s = T[L - 1]; return L >= 4 && s[1] === 'h' && !randInt(3) ? [s[0], 'l'] : s; }
      return [pick([4, 5, 5]), pick(['h', 'l', 'o', 'o'])];
    };
    function startRound() {
      busy = false;
      api.stage.innerHTML = '';
      const [n, mode] = spec(), items = shuffle(FRUIT.slice()).slice(0, n); // items[rank]: rank 0 is heaviest
      const clues = [];
      // clues are made so the answer follows from them, and only from them
      if (mode === 'o') for (let i = 0; i < n - 1; i++) clues.push([i, i + 1]);
      else if (mode === 'h') for (let i = 1; i < n; i++) clues.push([randInt(i), i]);
      else for (let i = 0; i < n - 1; i++) clues.push([i, i + 1 + randInt(n - 1 - i)]);
      shuffle(clues);
      const wrap = el('div', 'bs-scales'), scales = [];
      clues.forEach(([h, l], k) => {
        const hl = randInt(2), s = el('div', 'bs-scale', scaleSVG(items[hl ? h : l], items[hl ? l : h]));
        s.setAttribute('aria-label', `${items[h]} is heavier than ${items[l]}`);
        wrap.append(s); scales.push(s);
        api.later(() => {
          const a = hl ? -13 : 13, dy = 50 * Math.sin(a * Math.PI / 180);
          s.querySelector('.bs-beam').style.transform = `rotate(${a}deg)`;
          s.querySelector('.bs-pl').style.transform = `translateY(${-dy}px)`;
          s.querySelector('.bs-pr').style.transform = `translateY(${dy}px)`;
          tone(300 - k * 20, .12, 'sine', .07);
        }, 250 + k * 280);
      });
      const q = n === 2 ? 'Which is heavier?' : mode === 'h' ? 'Which is heaviest?' : mode === 'l' ? 'Which is lightest?' : 'Put them in order, heaviest first.';
      api.hint(mode === 'o' ? 'The heavier side of a scale goes down. Tap the fruit from heaviest to lightest.' : 'The heavier side of a scale goes down. ' + q);
      const qEl = el('p', 'bs-q', q);
      let placed = 0, slots = [];
      const order = el('div', 'bs-order');
      if (mode === 'o') {
        const row = el('div', 'bs-slots');
        slots = range(n).map(() => { const s = el('span', 'bs-slot'); row.append(s); return s; });
        order.append(row, el('div', 'bs-ends', '<span class="bs-lab">⬆ heaviest</span><span class="bs-lab">lightest ⬆</span>'));
      }
      const itemsEl = el('div', 'bs-items');
      shuffle(range(n)).forEach(r => {
        const b = mkBtn('tile c-card bs-item', items[r], () => choose(r, b)); b.dataset.rank = r;
        b.setAttribute('aria-label', items[r]); itemsEl.append(b);
      });
      api.stage.append(wrap, qEl);
      if (mode === 'o') api.stage.append(order);
      api.stage.append(itemsEl);
      const show = (h, l) => {
        scales.forEach(s => s.classList.remove('bs-glow'));
        const k = clues.findIndex(c => c[0] === h && c[1] === l);
        if (k >= 0) scales[k].classList.add('bs-glow');
      };
      function choose(r, b) {
        if (busy) return;
        if (mode === 'o') {
          if (r === placed) {
            b.classList.add('bs-used'); slots[placed].textContent = items[r]; slots[placed].classList.add('bs-full');
            tone(440 + placed * 90, .14, 'triangle', .12); placed++;
            scales.forEach(s => s.classList.remove('bs-glow'));
            if (placed === n) return roundWon();
            api.hint(placed === n - 1 ? 'And the last one is the lightest.' : 'Good. Which is the heaviest of the ones left?');
          } else {
            mistakes++; wob(b); sfx.soft(); show(r - 1, r);
            api.hint(`Look at the shining scale: ${items[r - 1]} is heavier than ${items[r]}.`);
          }
          return;
        }
        const ok = mode === 'l' ? r === n - 1 : r === 0;
        if (ok) { b.classList.add('bs-right'); return roundWon(); }
        mistakes++; wob(b); sfx.soft();
        if (mode === 'l') { const c = clues.find(c2 => c2[0] === r); show(c[0], c[1]); api.hint(`Look at the shining scale: ${items[c[1]]} is lighter than ${items[r]}.`); }
        else { const c = clues.find(c2 => c2[1] === r); show(c[0], c[1]); api.hint(`Look at the shining scale: ${items[c[0]]} is heavier than ${items[r]}.`); }
      }
      function roundWon() {
        busy = true; round++; api.rounds(total, round); sfx.good();
        scales.forEach((s, k) => { s.classList.add('bs-glow'); api.later(() => s.classList.remove('bs-glow'), 300 + k * 80); });
        api.hint(mode === 'o' ? `Yes! ${range(n).map(r => items[r]).join(' ')}` : `Yes! The ${items[mode === 'l' ? n - 1 : 0]} is the ${n === 2 ? 'heavier' : mode === 'l' ? 'lightest' : 'heaviest'}.`);
        if (round === total) { toast(cheer()); api.later(() => api.done(starsFor(mistakes, 0, 2)), 900); }
        else { toast(cheer()); api.later(startRound, 1600); }
      }
      if (TEST) api.stage.__auto = () => { if (mode === 'o') range(n).forEach(r => itemsEl.querySelector(`[data-rank="${r}"]`).click()); else itemsEl.querySelector(`[data-rank="${mode === 'l' ? n - 1 : 0}"]`).click(); };
    }
    startRound();
  }

  /* =========================================================
     4. WHO LIVES WHERE?
     ========================================================= */
  const PETS = ['🐱', '🐶', '🐰', '🐦', '🐢', '🐹'];
  function perms(k) { const out = []; (function rec(p, used) { if (p.length === k) { out.push(p.slice()); return; } for (let h = 0; h < k; h++) if (!used[h]) { used[h] = 1; p.push(h); rec(p, used); p.pop(); used[h] = 0; } })([], []); return out; }
  // p[a] = house of resident a (or -1). Returns true / false, or null if not known yet.
  function whTrue(c, p, k) {
    const pa = p[c.a], pb = c.b == null ? 0 : p[c.b];
    if (pa < 0 || pb < 0) return null;
    switch (c.t) {
      case 'in': return pa === c.h;
      case 'notin': return pa !== c.h;
      case 'next': return Math.abs(pa - pb) === 1;
      case 'notnext': return Math.abs(pa - pb) > 1;
      case 'left': return pa < pb;
      case 'end': return pa === 0 || pa === k - 1;
    }
  }
  function whGen(k, L) {
    const P = perms(k);
    const minC = k === 2 ? 2 : k === 3 ? 3 : 4, maxC = k === 2 ? 2 : k === 3 ? 4 : L >= 10 ? 7 : 6;
    const maxIn = k === 2 ? 2 : L >= 10 ? 0 : L >= 7 ? 1 : 2;
    const W = { in: L <= 2 ? 6 : L <= 5 ? 2 : 1, notin: 2, next: 3, notnext: 1.5, left: 2.5, end: 2 };
    for (let t = 0; t < 600; t++) {
      const relax = t > 400, sol = shuffle(range(k)), all = [];
      for (let a = 0; a < k; a++) {
        all.push({ t: 'in', a, h: sol[a] });
        for (let h = 0; h < k; h++) if (h !== sol[a]) all.push({ t: 'notin', a, h });
        if (k >= 3 && (sol[a] === 0 || sol[a] === k - 1)) all.push({ t: 'end', a });
        for (let b = 0; b < k; b++) {
          if (b === a) continue;
          if (a < b && k >= 3 && Math.abs(sol[a] - sol[b]) === 1) all.push({ t: 'next', a, b });
          if (a < b && k >= 3 && Math.abs(sol[a] - sol[b]) > 1) all.push({ t: 'notnext', a, b });
          if (k >= 3 && sol[a] < sol[b]) all.push({ t: 'left', a, b });
        }
      }
      const pool = all.map(c => ({ c, w: Math.pow(Math.random(), 1 / W[c.t]) })).sort((x, y) => y.w - x.w).map(x => x.c);
      let cand = P, chosen = [];
      for (const c of pool) {
        if (cand.length === 1) break;
        if (!relax && c.t === 'in' && chosen.filter(x => x.t === 'in').length >= maxIn) continue;
        const nc = cand.filter(p => whTrue(c, p, k));
        if (nc.length < cand.length) { chosen.push(c); cand = nc; }
      }
      if (cand.length !== 1) continue;
      // drop clues that are not needed, then top up gently to the minimum count
      for (const c of shuffle(chosen.slice())) { const rest = chosen.filter(x => x !== c); if (P.filter(p => rest.every(x => whTrue(x, p, k))).length === 1) chosen = rest; }
      for (const c of pool) { if (chosen.length >= minC) break; if (!chosen.includes(c) && (k === 2 || c.t !== 'in')) chosen.push(c); }
      if (chosen.length > maxC && !relax) continue;
      return { sol, clues: shuffle(chosen) };
    }
  }
  function startHouses(L, api) {
    const k = L <= 2 ? 2 : L <= 5 ? 3 : 4, total = k === 2 ? 3 : k === 3 ? 2 : 1;
    let round = 0, mistakes = 0, hints = 0;
    api.rounds(total, 0);
    function startRound() {
      api.stage.innerHTML = '';
      const { sol, clues } = whGen(k, L), pets = shuffle(PETS.slice()).slice(0, k), cols = shuffle(PAL.slice(0, 5)).slice(0, k);
      const p = Array(k).fill(-1);
      let sel = -1, finished = false;
      api.hint('Read the clues. Tap a pet, then tap the house where it lives.');
      const E = a => `<span class="wh-pet">${pets[a]}</span>`;
      const chip = h => `${NAMES[cols[h].c]} <span class="wh-chip tile c-${cols[h].c}">${cols[h].s}</span>`;
      const say = c => ({
        in: () => `${E(c.a)} lives in the ${chip(c.h)} house`,
        notin: () => `${E(c.a)} does <b>not</b> live in the ${chip(c.h)} house`,
        next: () => `${E(c.a)} lives next door to ${E(c.b)}`,
        notnext: () => `${E(c.a)} does <b>not</b> live next door to ${E(c.b)}`,
        left: () => `${E(c.a)} lives further left than ${E(c.b)}`,
        end: () => `${E(c.a)} lives in a house at one end of the street`
      })[c.t]();
      const clueBox = el('div', 'wh-clues');
      const clueEls = clues.map(c => { const d = el('div', 'wh-clue', `<span class="wh-tick">✓</span><span>${say(c)}</span>`); clueBox.append(d); return d; });
      const Wd = Math.min(stageW(api), 620), hg = k === 4 ? 10 : 16;
      const hw = Math.floor(Math.min(110, (Wd - 24 - hg * (k - 1)) / k / 1.12));
      const street = el('div', 'wh-street'); street.style.cssText = `--hw:${hw}px; --hg:${hg}px`;
      const houses = range(k).map(h => {
        const b = mkBtn('wh-house', `<span class="wh-roof">${h + 1}</span><span class="wh-body"><span class="wh-win"></span><span class="wh-door tile c-${cols[h].c}">${cols[h].s}</span></span>`, () => tapHouse(h));
        street.append(b); return b;
      });
      const tray = el('div', 'wh-tray');
      const resEls = pets.map((e, a) => { const b = mkBtn('tile c-card wh-res', e, () => tapRes(a)); b.setAttribute('aria-label', 'Pet ' + e); return b; });
      const hintB = mkBtn('btn c-sun', '💡 Hint', hint);
      const bar = el('div', 'l2-bar'); bar.style.marginTop = '14px'; bar.append(hintB);
      api.stage.append(clueBox, street, tray, bar);
      const occ = h => p.indexOf(h);
      function render() {
        tray.innerHTML = '';
        resEls.forEach((b, a) => { b.classList.toggle('l2-sel', a === sel); if (p[a] < 0) tray.append(b); });
        if (!tray.children.length) tray.append(el('span', 'bs-lab', finished ? '' : 'Every pet has a home'));
        houses.forEach((b, h) => {
          const o = occ(h), w = b.querySelector('.wh-win');
          w.textContent = o >= 0 ? pets[o] : ''; w.classList.toggle('wh-full', o >= 0);
          b.classList.toggle('wh-can', sel >= 0 && o < 0); b.classList.toggle('wh-picked', o >= 0 && o === sel);
          b.setAttribute('aria-label', `House ${h + 1}, ${NAMES[cols[h].c]} door${o >= 0 ? ', ' + pets[o] : ', empty'}`);
        });
        clues.forEach((c, i) => { clueEls[i].classList.toggle('wh-ok', whTrue(c, p, k) === true); clueEls[i].classList.remove('wh-bad'); });
      }
      function tapRes(a) { if (finished) return; sel = sel === a ? -1 : a; sfx.tap(); render(); if (sel >= 0) api.hint(`Now tap the house where ${pets[a]} lives.`); }
      function tapHouse(h) {
        if (finished) return;
        const o = occ(h);
        if (sel < 0) {
          if (o >= 0) { sel = o; sfx.tap(); render(); api.hint(`Tap another house to move ${pets[o]}, or tap it again to send it back.`); }
          else { wob(houses[h]); sfx.soft(); api.hint('Tap a pet first, then tap a house.'); }
          return;
        }
        if (o === sel) { p[sel] = -1; sel = -1; sfx.tap(); render(); api.hint('Tap a pet, then tap the house where it lives.'); return; }
        const from = p[sel];
        if (o >= 0) p[o] = from; // swap, or back to the tray
        p[sel] = h; sel = -1;
        tone(500 + h * 60, .1, 'triangle', .11);
        render(); check();
      }
      function check() {
        if (p.includes(-1)) { api.hint('Good. Tap the next pet, then its house.'); return; }
        const bad = clues.map((c, i) => whTrue(c, p, k) ? -1 : i).filter(i => i >= 0);
        if (!bad.length) return won();
        mistakes++; sfx.soft();
        bad.forEach(i => clueEls[i].classList.add('wh-bad'));
        api.hint(bad.length === 1 ? 'Nearly! The clue in red is not true yet. Tap a pet in a house to move it.' : 'Not quite. The clues in red are not true yet. Tap a pet in a house to move it.');
      }
      function hint() {
        if (finished) return;
        const a = shuffle(range(k)).find(x => p[x] !== sol[x]);
        if (a == null) return;
        hints++;
        const o = occ(sol[a]); if (o >= 0) p[o] = p[a];
        p[a] = sol[a]; sel = -1; sfx.tap(); render();
        wob(houses[sol[a]]);
        api.hint(`${pets[a]} lives in house ${sol[a] + 1}.`);
        check();
      }
      function won() {
        finished = true; round++; api.rounds(total, round);
        street.classList.add('wh-solved');
        houses.forEach((b, h) => { b.querySelector('.wh-win').style.animationDelay = h * 120 + 'ms'; tone(523 * Math.pow(1.19, h), .18, 'sine', .12, h * .12); });
        sfx.good(); toast(cheer()); api.hint('Everyone is home. Well worked out!');
        render();
        if (round === total) api.later(() => api.done(starsFor(mistakes + hints, 0, 2)), 1100);
        else api.later(startRound, 1800);
      }
      render();
      if (TEST) api.stage.__auto = () => range(k).forEach(a => { if (p[a] !== sol[a]) { resEls[a].click(); if (p[a] >= 0) { /* picked from house */ } houses[sol[a]].click(); } });
    }
    startRound();
  }

  /* =========================================================
     5. TRAIN TRACKS
     ========================================================= */
  const PIECES = [5, 10, 6, 12, 9, 3];
  function trackD(m, off) {
    const r = 50 + off;
    if (m === 5) return `M${r} 0V100`;
    if (m === 10) return `M0 ${r}H100`;
    if (m === 1) return `M${r} 0V56`;
    if (m === 4) return `M${r} 44V100`;
    if (m === 2) return `M44 ${r}H100`;
    if (m === 8) return `M0 ${r}H56`;
    const cx = m & 2 ? 100 : 0, cy = m & 1 ? 0 : 100;
    const pv = [cx === 100 ? 100 - r : r, cy], ph = [cx, cy === 0 ? r : 100 - r];
    return `M${pv[0]} ${pv[1]}Q${pv[0]} ${ph[1]} ${ph[0]} ${ph[1]}`;
  }
  const trackSVG = m => m ? `<svg viewBox="0 0 100 100" aria-hidden="true"><path class="tt-ties" d="${trackD(m, 0)}" stroke-width="34" stroke-dasharray="7 8"/>` +
    `<path class="tt-rail" d="${trackD(m, -12)}" stroke-width="5.5"/><path class="tt-rail" d="${trackD(m, 12)}" stroke-width="5.5"/></svg>` : '';
  function startTracks(L, api) {
    const T = [[3, 3, 4, 5, 1, 0, 0], [3, 4, 5, 7, 2, 0, 0], [4, 4, 6, 8, 3, 0, 1], [4, 4, 7, 9, 4, 1, 1], [4, 5, 8, 11, 5, 1, 2], [5, 5, 9, 13, 6, 2, 2], [5, 5, 11, 15, 8, 2, 3], [6, 5, 12, 17, 9 + randInt(2), 2 + randInt(2), 3]];
    let [Rr, C, lo, hi, miss, npass, ntree] = T[Math.min(L, T.length) - 1];
    const Wd = Math.min(stageW(api), 560);
    while (C > 3 && (Wd - 16 - 4 * (C - 1)) / C < 54) { C--; lo = Math.min(lo, Rr * C - 3); hi = Math.min(hi, Rr * C - 2); }
    const cs = fitH(Math.floor(Math.min(84, (Wd - 16 - 4 * (C - 1)) / C)), Rr, 380), N = Rr * C;
    // a route first, then hide some of its pieces
    let path;
    for (let t = 0; ; t++) {
      const s = randInt(N); path = [s]; const seen = new Set(path), want = lo + randInt(hi - lo + 1);
      while (path.length < want) {
        const opts = DIRS.map(d => step(path[path.length - 1], d, Rr, C)).filter(j => j >= 0 && !seen.has(j));
        if (!opts.length) break;
        const nx = pick(opts); path.push(nx); seen.add(nx);
      }
      if (path.length >= lo || t > 3000) break;
    }
    const sol = Array(N).fill(0);
    path.forEach((c, k) => { if (k) { const d = dirTo(path[k - 1], c, Rr, C); sol[path[k - 1]] |= d; sol[c] |= OPP[d]; } });
    const st = path[0], ds = path[path.length - 1], inner = path.slice(1, -1);
    const missing = new Set(shuffle(inner.slice()).slice(0, Math.max(1, Math.min(miss, inner.length))));
    const fixed = range(N).map(i => i === st || i === ds || (sol[i] && !missing.has(i)));
    const pass = shuffle([...missing]).slice(0, Math.min(npass, missing.size - 1 >= 1 ? missing.size - 1 : 0));
    const off = range(N).filter(i => !sol[i]);
    const tree = range(N).map(() => false); shuffle(off).slice(0, ntree).forEach(i => { tree[i] = true; });
    const okDir = (i, d) => { const j = step(i, d, Rr, C); if (j < 0 || tree[j]) return false; if (fixed[j]) return !!(sol[j] & OPP[d]); return true; };
    const opts = range(N).map(i => PIECES.filter(m => bits(m).every(d => okDir(i, d))));
    const cur = range(N).map(i => fixed[i] ? sol[i] : 0);
    const people = ['👵', '👴', '🧑', '👩', '👧'];
    let hints = 0, finished = false;
    api.hint('Tap the empty squares to lay track. Join the station 🚉 to the seaside 🏖️.' + (pass.length ? ' Pick up every passenger on the way.' : ''));
    const board = el('div', 'tt-board'); board.style.cssText = `--cs:${cs}px; grid-template-columns:repeat(${C}, ${cs}px)`;
    const passEl = [];
    const cells = range(N).map(i => {
      const b = mkBtn('tt-cell' + (fixed[i] ? ' tt-fix' : ''), '', () => tap(i));
      if (tree[i]) b.append(el('span', 'tt-emo', '🌳'));
      if (i === st) b.append(el('span', 'tt-emo', '🚉'));
      if (i === ds) b.append(el('span', 'tt-emo', '🏖️'));
      if (pass.includes(i)) { const pe = el('span', 'tt-emo tt-pass', pick(people)); passEl[i] = pe; }
      b.setAttribute('aria-label', i === st ? 'Station' : i === ds ? 'Seaside' : tree[i] ? 'Tree' : fixed[i] ? 'Fixed track' : 'Empty square');
      board.append(b); return b;
    });
    const info = el('p', 'l2-info');
    const bar = el('div', 'l2-bar'); bar.append(mkBtn('btn c-sun', '💡 Hint', hint));
    api.stage.append(board, info, bar);
    function draw(i) {
      const b = cells[i];
      b.querySelector('svg')?.remove();
      if (cur[i]) b.insertAdjacentHTML('afterbegin', trackSVG(cur[i]));
      b.classList.toggle('tt-empty', !cur[i] && !tree[i]);
      if (passEl[i] && !passEl[i].isConnected) b.append(passEl[i]);
    }
    function route() {
      const r = [st]; let i = st, d = sol[st];
      for (let g = 0; g <= N; g++) {
        const j = step(i, d, Rr, C);
        if (j < 0 || !(cur[j] & OPP[d]) || r.includes(j)) return { r, ok: false };
        r.push(j);
        if (j === ds) return { r, ok: true };
        d = cur[j] & ~OPP[d]; i = j;
        if (!d || (d & (d - 1))) return { r, ok: false };
      }
      return { r, ok: false };
    }
    function render() {
      const { r, ok } = route();
      cells.forEach((b, i) => b.classList.toggle('tt-lit', r.includes(i)));
      const got = pass.filter(x => r.includes(x)).length;
      info.innerHTML = pass.length ? `Passengers on the line <b>${got}</b> of ${pass.length}` : ok ? 'The line is joined!' : `Track from the station: <b>${r.length - 1}</b> ${r.length === 2 ? 'piece' : 'pieces'}`;
      return { r, ok, got };
    }
    function tap(i) {
      if (finished) return;
      if (tree[i]) { wob(cells[i]); sfx.soft(); api.hint('Trains can’t go through trees. Go around them.'); return; }
      if (fixed[i]) { wob(cells[i]); sfx.soft(); api.hint('That piece is fixed. Tap an empty square.'); return; }
      const o = opts[i], k = o.indexOf(cur[i]);
      cur[i] = k + 1 < o.length ? o[k + 1] : 0;
      cells.forEach(c => c.classList.remove('tt-hint'));
      draw(i); reanim(cells[i], 'tt-new');
      after(true);
    }
    function after(sound) {
      const { r, ok, got } = render();
      if (sound) tone(360 + Math.min(r.length, 16) * 28, .08, 'triangle', .1);
      if (ok && got === pass.length) return win(r);
      if (ok) api.hint('The line reaches the seaside, but it must pass every passenger. Try another way.');
      else api.hint('Tap a square again to change its piece. The gold track shows how far the train can go.');
    }
    function hint() {
      if (finished) return;
      const i = path.find(x => !fixed[x] && cur[x] !== sol[x]);
      if (i == null) return;
      hints++; sfx.tap(); cur[i] = sol[i]; draw(i); reanim(cells[i], 'tt-new'); cells[i].classList.add('tt-hint');
      after(false);
    }
    function win(r) {
      finished = true;
      api.hint('All aboard! Off to the seaside.');
      const cen = i => [cells[i].offsetLeft + cs / 2, cells[i].offsetTop + cs / 2];
      const mk = e => { const t = el('div', 'tt-train', `<span>${e}</span>`); board.append(t); return t; };
      const train = mk('🚂'), cars = [];
      const place = (t, i, prev) => { const [x, y] = cen(i); t.style.left = x + 'px'; t.style.top = y + 'px'; if (prev != null) { const dx = (i % C) - (prev % C); if (dx) t.firstChild.style.transform = dx > 0 ? 'scaleX(-1)' : ''; } };
      place(train, r[0], null); train.style.transition = 'none';
      if (cells[r[1]] && r[1] % C > r[0] % C) train.firstChild.style.transform = 'scaleX(-1)';
      void train.offsetWidth; train.style.transition = '';
      const dt = 340;
      for (let k = 1; k < r.length; k++) api.later(() => {
        place(train, r[k], r[k - 1]);
        cars.forEach((c, j) => { if (k - 1 - j >= 0) place(c, r[k - 1 - j], r[Math.max(0, k - 2 - j)]); });
        tone(220 + (k % 2) * 30, .06, 'square', .04);
        if (passEl[r[k]]) {
          passEl[r[k]].classList.add('tt-gone'); tone(660 + cars.length * 110, .14, 'sine', .12);
          const c = mk('🚃'); c.style.transition = 'none'; place(c, r[Math.max(0, k - 1 - cars.length)], null); c.firstChild.style.transform = train.firstChild.style.transform; void c.offsetWidth; c.style.transition = ''; cars.push(c);
        }
      }, k * dt);
      api.later(() => { sfx.good(); toast(cheer()); [0, 1].forEach(j => tone(784, .16, 'sine', .12, j * .2)); }, r.length * dt);
      api.later(() => api.done(starsFor(hints, 0, 1)), r.length * dt + 1000);
    }
    range(N).forEach(draw); render();
    if (TEST) api.stage.__auto = () => path.forEach(i => { if (!fixed[i]) { let g = 0; while (cur[i] !== sol[i] && g++ < 10) cells[i].click(); } });
  }
})();
