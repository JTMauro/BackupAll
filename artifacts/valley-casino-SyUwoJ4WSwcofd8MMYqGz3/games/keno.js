// Valley Keno — 80-number board, pick 1–10 spots, 20 balls drawn one at a time, multi-game repeat.
import * as K from './_kit.js';

// Vegas-style pay table: pays per $1 bet (total returned) by spots picked → catches.
export const PAYS = {
  1: { 1: 3 },
  2: { 2: 13 },
  3: { 2: 1, 3: 46 },
  4: { 2: 1, 3: 5, 4: 120 },
  5: { 3: 2, 4: 18, 5: 750 },
  6: { 3: 1, 4: 5, 5: 100, 6: 1800 },
  7: { 3: 1, 4: 2, 5: 16, 6: 300, 7: 5000 },
  8: { 5: 12, 6: 98, 7: 1652, 8: 25000 },
  9: { 4: 1, 5: 4, 6: 44, 7: 260, 8: 4000, 9: 40000 },
  10: { 0: 2, 5: 2, 6: 20, 7: 132, 8: 960, 9: 3800, 10: 100000 }
};
const BETS = [1, 2, 5, 10, 25, 50, 100];
const RACES = [1, 5, 10];
// Exact return per spot count (hypergeometric: 20 of 80 drawn).
const choose = (n, k) => { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
export const probCatch = (spots, k) => choose(20, k) * choose(60, spots - k) / choose(80, spots);
export const RTP = Object.fromEntries(Object.entries(PAYS).map(([n, t]) => [n, Object.entries(t).reduce((a, [k, p]) => a + probCatch(+n, +k) * p, 0)]));

function injectKn() {
  if (document.getElementById('kn-style')) return;
  const s = document.createElement('style'); s.id = 'kn-style';
  s.textContent = `
.kn-wrap{display:flex;gap:18px;align-items:stretch;justify-content:center;width:100%;max-width:980px}
.kn-boardbox{flex:0 1 600px;min-width:0;padding:10px;border-radius:14px;background:linear-gradient(#0d0b14,#05040a);box-shadow:inset 0 0 0 1px rgba(232,196,106,.45),0 10px 30px rgba(0,0,0,.6)}
.kn-board{display:grid;grid-template-columns:repeat(10,1fr);gap:clamp(3px,.6vw,6px)}
.kn-split{grid-column:1/-1;height:2px;margin:2px 0;background:linear-gradient(90deg,transparent,#e8c46a,transparent);opacity:.7}
.kn-n{position:relative;aspect-ratio:1;min-width:0;border:0;border-radius:8px;cursor:pointer;padding:0;display:grid;place-items:center;
  font:700 clamp(13px,2.1vw,19px) "Chakra Petch",system-ui,sans-serif;color:#d9d2ff;background:linear-gradient(#26223a,#14111f);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 2px 0 #000;transition:background .2s,color .2s,transform .12s}
.kn-n:hover:not(:disabled){background:linear-gradient(#36305a,#1d1930)}.kn-n:active:not(:disabled){transform:scale(.94)}
.kn-n:disabled{cursor:default}
.kn-n:focus-visible{outline:2px solid #fff;outline-offset:1px}
.kn-n.pick{color:#1d1404;background:radial-gradient(circle at 50% 35%,#fff3c4,#f0c24a 55%,#a8782a);box-shadow:0 0 0 2px #ffe08a,0 0 10px rgba(255,208,74,.55)}
.kn-n.pick::after{content:"";position:absolute;inset:12%;border-radius:50%;border:2px solid rgba(160,20,20,.75);transform:rotate(-8deg)}
.kn-n.drawn{color:#fff;background:radial-gradient(circle at 50% 35%,#7ad0ff,#1e5bd8 60%,#0a2a7a);animation:kn-lit .35s ease-out}
.kn-n.hit{color:#fff;background:radial-gradient(circle at 50% 35%,#b6ffc6,#18b44a 55%,#056a24);box-shadow:0 0 0 2px #9dffb0,0 0 18px #3bff6a;animation:kn-hit .6s ease-out}
.kn-n.hit::after{border-color:rgba(255,255,255,.9)}
@keyframes kn-lit{0%{transform:scale(1.35);filter:brightness(1.8)}100%{transform:none}}
@keyframes kn-hit{0%{transform:scale(1.5) rotate(-8deg);filter:brightness(2)}60%{transform:scale(.95)}100%{transform:none}}
.kn-side{flex:0 0 260px;display:flex;flex-direction:column;gap:10px;min-width:0}
.kn-ballbox{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:14px;background:rgba(0,0,0,.45);box-shadow:inset 0 0 0 1px rgba(232,196,106,.35)}
.kn-ball{--bc:#d32f2f;flex:none;width:76px;height:76px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 34% 28%,#fff 0 6%,color-mix(in srgb,var(--bc) 60%,#fff) 18%,var(--bc) 52%,color-mix(in srgb,var(--bc) 45%,#000) 100%);box-shadow:0 6px 14px rgba(0,0,0,.6)}
.kn-ball span{width:58%;height:58%;border-radius:50%;background:#fff;display:grid;place-items:center;font:700 22px "Chakra Petch",sans-serif;color:#111;box-shadow:inset 0 -2px 4px rgba(0,0,0,.25)}
.kn-ball.idle{--bc:#4a4560}.kn-ball.idle span{color:#999}
.kn-ball.pop{animation:kn-pop .32s cubic-bezier(.3,1.6,.5,1)}
@keyframes kn-pop{0%{transform:translateY(-30px) scale(.4) rotate(-90deg);opacity:0}100%{transform:none;opacity:1}}
.kn-stat{display:grid;gap:2px;font-size:13px;color:var(--dim)}.kn-stat b{font:400 16px "Press Start 2P",monospace;color:var(--gold)}.kn-stat .kn-hits{color:#7dff9a}
.kn-pays{padding:8px 12px;border-radius:14px;background:rgba(0,0,0,.45);box-shadow:inset 0 0 0 1px rgba(232,196,106,.35)}
.kn-pays h4{margin:0 0 4px;font:400 13px "Bungee",Impact,sans-serif;color:var(--gold);letter-spacing:.04em;display:flex;justify-content:space-between}.kn-pays h4 small{font:600 11px "Chakra Petch",sans-serif;color:var(--dim)}
.kn-pays table{width:100%;border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums}.kn-pays td{padding:2px 6px}.kn-pays td+td{text-align:right}
.kn-pays th{font-size:10px;color:var(--dim);text-align:left;padding:0 6px;font-weight:600;letter-spacing:.1em}.kn-pays th+th{text-align:right}
.kn-pays tr.now td{background:rgba(125,255,154,.18);color:#fff}.kn-pays tr.won td{background:rgba(125,255,154,.4);color:#fff;font-weight:700}
.kn-pays .kn-empty{color:var(--dim);font-size:13px;padding:6px 0}
.kn-tray{display:flex;flex-wrap:wrap;gap:4px;min-height:52px;padding:8px;border-radius:14px;background:rgba(0,0,0,.35);align-content:flex-start}
.kn-tray i{font:700 11px/22px "Chakra Petch",sans-serif;font-style:normal;width:22px;height:22px;border-radius:50%;text-align:center;color:#111;background:radial-gradient(circle at 35% 30%,#fff,#ccc);animation:kn-pop .25s}
.kn-tray i.h{background:radial-gradient(circle at 35% 30%,#d6ffe0,#3bd86a);box-shadow:0 0 6px #3bff6a}
.kn-race{font-size:13px;color:var(--dim);text-align:center;min-height:1.2em}.kn-race b{color:var(--gold)}
.kn-grp{display:flex;align-items:center;gap:6px}.kn-grp>span{font-size:10px;letter-spacing:.12em;color:var(--dim);font-weight:700}
.kn-val{min-width:58px;text-align:center;font:400 13px "Press Start 2P",monospace;color:var(--gold)}
.kn-seg{display:flex;border-radius:8px;overflow:hidden}.kn-seg .vc-btn{border-radius:0;min-width:46px;padding:8px 10px}.kn-seg .vc-btn.on{background:linear-gradient(#f3d27e,#c99a34);color:#1d1404}
.kn-rules table td,.kn-rules table th{text-align:right}.kn-rules table td:first-child,.kn-rules table th:first-child{text-align:left}
.kn-rules .kn-rt{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}
.kn-rules .kn-rt div{background:rgba(255,255,255,.04);border-radius:8px;padding:6px 8px}.kn-rules .kn-rt b{color:var(--gold)}
@media (max-width:760px){.kn-wrap{flex-direction:column;align-items:center;gap:10px}.kn-boardbox{width:100%;flex:none;padding:7px}
  .kn-side{flex:none;width:100%;display:grid;grid-template-columns:auto 1fr;gap:8px}.kn-ballbox{grid-row:1;padding:8px}.kn-ball{width:58px;height:58px}.kn-ball span{font-size:17px}
  .kn-pays{grid-row:1/3;grid-column:2;padding:6px 8px}.kn-pays table{font-size:12px}.kn-tray{grid-column:1;min-height:0;padding:6px;gap:3px}.kn-tray i{width:18px;height:18px;font-size:9px;line-height:18px}
  .kn-race{grid-column:1/-1}.kn-n{border-radius:6px}}
@media (prefers-reduced-motion:reduce){.kn-n.drawn,.kn-n.hit,.kn-ball.pop,.kn-tray i{animation:none}}
`;
  document.head.appendChild(s);
}

const BALL_COLORS = ['#d32f2f', '#f57c00', '#f9c80e', '#2e9d4a', '#1e5bd8', '#7b3fbf', '#d45d9e', '#00897b'];

function rulesHtml() {
  const rows = Object.entries(PAYS).map(([n, t]) => `<div><b>${n} spot${n > 1 ? 's' : ''}</b> · return ${(RTP[n] * 100).toFixed(1)}%<table>${Object.entries(t).sort((a, b) => b[0] - a[0]).map(([k, p]) => `<tr><td>Catch ${k}</td><td>${p.toLocaleString()}</td></tr>`).join('')}</table></div>`).join('');
  return `<div class="kn-rules"><h3>Valley Keno</h3>
  <p>Mark 1 to 10 numbers (“spots”) from 1–80, or press <b>Quick Pick</b>. Choose your bet ($1–$100) and how many consecutive games to play with the same ticket, then press <b>Play</b>. Twenty balls are drawn; every drawn number you marked is a <b>catch</b>.</p>
  <p>Payouts are per $1 bet and include your stake. The pay table depends on how many spots you marked. Space or Enter plays; press Space during a draw to speed it up. Q = quick pick, C = clear.</p>
  <h3>Pay tables</h3><div class="kn-rt">${rows}</div>
  <p>Balls are drawn with a cryptographic RNG. Returns shown are exact (hypergeometric) for each ticket size.</p></div>`;
}

export default {
  id: 'keno', title: 'Valley Keno', kind: 'keno', blurb: 'Pick up to 10 numbers, watch 20 balls drop. Catch all 10 for 100,000 to 1.',
  mount(root, api) {
    injectKn();
    const T = K.table(root, api, { title: 'Valley Keno', subtitle: 'Pick 1–10 spots · 20 balls drawn', felt: 'purple', rack: false, rules: rulesHtml() });
    let alive = true;
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms); timers.add(id); return id; };
    const sleep = ms => new Promise(r => later(r, ms));

    const picks = new Set();
    let betIdx = 2, racesIdx = 0, playing = false, stopAfter = false, fast = false;
    let drawn = [], drawnSet = new Set(), lastHits = -1, lastWon = 0;

    T.felt.innerHTML = `
      <div class="kn-wrap">
        <div class="kn-boardbox"><div class="kn-board" role="group" aria-label="Keno board"></div></div>
        <aside class="kn-side">
          <div class="kn-ballbox"><div class="kn-ball idle" aria-live="polite"><span>–</span></div>
            <div class="kn-stat"><span>DRAWN</span><b class="kn-dc">0/20</b><span>CATCHES</span><b class="kn-hits">0</b></div></div>
          <div class="kn-pays"></div>
          <div class="kn-tray" aria-label="Drawn numbers"></div>
          <div class="kn-race"></div>
        </aside>
      </div>`;
    const $ = s => T.felt.querySelector(s);
    const board = $('.kn-board'), ballEl = $('.kn-ball'), tray = $('.kn-tray'), paysEl = $('.kn-pays'), raceEl = $('.kn-race');
    const tiles = [];
    for (let n = 1; n <= 80; n++) {
      if (n === 41) { const d = document.createElement('div'); d.className = 'kn-split'; board.appendChild(d); }
      const b = document.createElement('button'); b.type = 'button'; b.className = 'kn-n'; b.textContent = n; b.setAttribute('aria-pressed', 'false'); b.dataset.n = n;
      b.addEventListener('click', () => toggle(n)); board.appendChild(b); tiles[n] = b;
    }

    // ---------------------------------------------------------------- controls
    const clearBtn = K.button('Clear', () => { if (playing) return; picks.clear(); resetDraw(); sync(); });
    const qpBtn = K.button('Quick Pick', () => quickPick());
    const betDn = K.button('&minus;', () => { if (!playing && betIdx > 0) { betIdx--; K.sfx.chip(); sync(); } });
    const betUp = K.button('+', () => { if (!playing && betIdx < BETS.length - 1) { betIdx++; K.sfx.chip(); sync(); } });
    const betVal = document.createElement('b'); betVal.className = 'kn-val';
    const betGrp = document.createElement('div'); betGrp.className = 'kn-grp'; betGrp.innerHTML = '<span>BET</span>'; betGrp.append(betDn, betVal, betUp);
    const raceGrp = document.createElement('div'); raceGrp.className = 'kn-grp'; raceGrp.innerHTML = '<span>GAMES</span>';
    const seg = document.createElement('div'); seg.className = 'kn-seg'; raceGrp.appendChild(seg);
    const raceBtns = RACES.map((r, i) => { const b = K.button('×' + r, () => { if (!playing) { racesIdx = i; sync(); } }); seg.appendChild(b); return b; });
    const playBtn = K.button('Play', () => { if (playing) { stopAfter = true; playBtn.disabled = true; playBtn.textContent = 'Stopping…'; } else play(); }, { primary: true });
    playBtn.style.minWidth = '110px';
    T.controls.append(clearBtn, qpBtn, betGrp, raceGrp, playBtn);
    T.bindKey('q', qpBtn); T.bindKey('c', clearBtn);
    const onKey = e => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (!T.el.querySelector('.vc-rules').hidden) { if (e.key === 'Escape') T.el.querySelector('.vc-rules').hidden = true; return; }
      if (e.code === 'Space' || e.key === 'Enter') {
        if (e.target && e.target.tagName === 'BUTTON' && e.key === 'Enter') return; // let focused buttons act
        e.preventDefault(); if (e.repeat) return;
        if (playing) fast = true; else play();
      }
    };
    window.addEventListener('keydown', onKey);

    const bet = () => BETS[betIdx];
    function sync(prompt = true) {
      tiles.forEach((b, n) => { if (!b) return; const on = picks.has(n); b.classList.toggle('pick', on); b.setAttribute('aria-pressed', on); b.disabled = playing; });
      betVal.textContent = K.fmt(bet());
      raceBtns.forEach((b, i) => { b.classList.toggle('on', i === racesIdx); b.disabled = playing; });
      betDn.disabled = playing || betIdx === 0; betUp.disabled = playing || betIdx === BETS.length - 1;
      clearBtn.disabled = qpBtn.disabled = playing;
      if (!playing) { playBtn.disabled = picks.size === 0; playBtn.textContent = 'Play'; }
      else if (!stopAfter) { playBtn.disabled = RACES[racesIdx] === 1; playBtn.textContent = RACES[racesIdx] > 1 ? 'Stop' : 'Drawing…'; }
      renderPays();
      if (!playing && prompt) {
        const n = picks.size, r = RACES[racesIdx];
        T.msg(n ? `${n} spot${n > 1 ? 's' : ''} · ${K.fmt(bet())} per game${r > 1 ? ` × ${r} games = ${K.fmt(bet() * r)}` : ''} — press Play` : 'Pick 1 to 10 numbers, or press Quick Pick.');
      }
    }
    function renderPays(hits = -1, won = false) {
      const n = picks.size;
      if (!n) { paysEl.innerHTML = `<h4>PAYS <small>per ${K.fmt(bet())}</small></h4><div class="kn-empty">Pick numbers to see what they pay.</div>`; return; }
      const t = PAYS[n];
      paysEl.innerHTML = `<h4>${n} SPOT${n > 1 ? 'S' : ''} <small>return ${(RTP[n] * 100).toFixed(1)}%</small></h4><table><tr><th>CATCH</th><th>PAYS</th></tr>${Object.entries(t).sort((a, b) => b[0] - a[0]).map(([k, p]) => `<tr class="${+k === hits ? (won ? 'won' : 'now') : ''}"><td>${k} of ${n}</td><td>${K.fmt(p * bet())}</td></tr>`).join('')}</table>`;
    }
    function toggle(n) {
      if (playing) return;
      if (drawn.length) resetDraw();
      if (picks.has(n)) { picks.delete(n); K.sfx.tick(); }
      else { if (picks.size >= 10) { T.msg('Ten spots maximum — tap a number to unmark it.', 'lose'); K.sfx.lose(); return; } picks.add(n); K.sfx.chip(); }
      sync();
    }
    function quickPick() {
      if (playing) return;
      resetDraw();
      const n = picks.size >= 1 && picks.size <= 10 ? picks.size : 8;
      picks.clear(); const nums = K.shuffle(Array.from({ length: 80 }, (_, i) => i + 1)).slice(0, n);
      nums.forEach(x => picks.add(x)); sync();
      nums.forEach(x => tiles[x].classList.remove('pick'));
      nums.forEach((x, i) => later(() => { if (picks.has(x)) tiles[x].classList.add('pick'); K.sfx.tick(); }, i * 45));
    }
    function resetDraw() {
      drawn = []; drawnSet = new Set(); tray.innerHTML = '';
      tiles.forEach(b => b && b.classList.remove('drawn', 'hit'));
      ballEl.className = 'kn-ball idle'; ballEl.firstElementChild.textContent = '–';
      $('.kn-dc').textContent = '0/20'; $('.kn-hits').textContent = '0';
    }

    // ---------------------------------------------------------------- play
    async function play() {
      if (playing || !alive) return;
      if (!picks.size) { T.msg('Pick at least one number first.', 'lose'); return; }
      const races = RACES[racesIdx]; let total = 0, played = 0;
      playing = true; stopAfter = false; sync();
      for (let g = 0; g < races && alive; g++) {
        if (stopAfter) break;
        if (!api.bet(bet())) { T.msg(`Not enough chips for another ${K.fmt(bet())} game.`, 'lose'); K.sfx.lose(); break; }
        played++;
        raceEl.innerHTML = races > 1 ? `Game <b>${g + 1}</b> of ${races} · won so far <b>${K.fmt(total)}</b>` : '';
        const won = await drawGame(); if (!alive) return;
        total += won;
        raceEl.innerHTML = races > 1 ? `Game <b>${g + 1}</b> of ${races} · won so far <b>${K.fmt(total)}</b>` : '';
        if (g < races - 1 && !stopAfter) await sleep(won ? 2200 : 1300);
      }
      if (!alive) return;
      playing = false; fast = false;
      if (played > 1) { raceEl.innerHTML = `${played} games · staked <b>${K.fmt(played * bet())}</b> · won <b>${K.fmt(total)}</b>`; }
      sync(false); renderPays(lastHits, lastWon > 0);
      if (played > 1) T.msg(total > 0 ? `${played} games paid ${K.fmt(total)} in total.` : `${played} games — no wins this time.`, total > 0 ? 'win' : 'lose');
    }
    async function drawGame() {
      resetDraw(); fast = false;
      const balls = K.shuffle(Array.from({ length: 80 }, (_, i) => i + 1)).slice(0, 20);
      let hits = 0; const n = picks.size;
      T.msg('Drawing…', ''); renderPays(0);
      for (let i = 0; i < 20; i++) {
        if (!alive) return 0;
        const x = balls[i]; drawn.push(x); drawnSet.add(x);
        const hit = picks.has(x); if (hit) hits++;
        ballEl.className = 'kn-ball'; void ballEl.offsetWidth; ballEl.classList.add('pop');
        ballEl.style.setProperty('--bc', BALL_COLORS[Math.floor((x - 1) / 10)]); ballEl.firstElementChild.textContent = x;
        tiles[x].classList.add(hit ? 'hit' : 'drawn');
        const t = document.createElement('i'); t.textContent = x; if (hit) t.className = 'h'; tray.appendChild(t);
        $('.kn-dc').textContent = `${i + 1}/20`; $('.kn-hits').textContent = hits;
        K.sfx.ball(); K.tone(300 + x * 6, .07, { type: 'triangle', vol: .06 });
        if (hit) { K.tone(1046, .14, { type: 'triangle', vol: .1, delay: .04 }); K.tone(1568, .12, { type: 'sine', vol: .07, delay: .1 }); }
        renderPays(hits);
        await sleep(fast ? 70 : hit ? 520 : 330);
      }
      const mult = (PAYS[n][hits] || 0), won = mult * bet(); lastHits = hits; lastWon = won;
      renderPays(hits, won > 0);
      if (won > 0) {
        api.win(won);
        T.msg(`Caught ${hits} of ${n} — pays ${K.fmt(won)}!`, 'win');
        if (mult >= 50) { K.banner(T, `+${K.fmt(won)}`); K.sfx.bigWin(); } else K.sfx.win();
      } else { T.msg(`Caught ${hits} of ${n}. No win.`, 'lose'); K.sfx.lose(); }
      return won;
    }

    sync();
    return {
      unmount() { alive = false; timers.forEach(clearTimeout); timers.clear(); window.removeEventListener('keydown', onKey); T.destroy(); }
    };
  }
};
