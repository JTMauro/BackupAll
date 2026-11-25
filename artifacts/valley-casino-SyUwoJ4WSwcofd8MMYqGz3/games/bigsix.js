// Valley Casino — Big Six Wheel (Money Wheel). 54 segments, leather clapper ticking on the pegs.
import * as K from './_kit.js';

const SYM = {
  '1':     { label: '$1',    pay: 1,  count: 24, fill: '#f1e3ad', ink: '#14522c', name: '$1' },
  '2':     { label: '$2',    pay: 2,  count: 15, fill: '#2f6fd0', ink: '#fff',    name: '$2' },
  '5':     { label: '$5',    pay: 5,  count: 7,  fill: '#24934a', ink: '#fff',    name: '$5' },
  '10':    { label: '$10',   pay: 10, count: 4,  fill: '#e47b16', ink: '#fff',    name: '$10' },
  '20':    { label: '$20',   pay: 20, count: 2,  fill: '#c41d2c', ink: '#fff',    name: '$20' },
  'joker': { label: 'JOKER', pay: 45, count: 1,  fill: '#6a2bb3', ink: '#ffe08a', name: 'Joker' },
  'logo':  { label: 'VALLEY',pay: 45, count: 1,  fill: '#121212', ink: '#e8c46a', name: 'Casino Logo' }
};
const KEYS = ['1', '2', '5', '10', '20', 'joker', 'logo'];
// Spread the 54 segments around the wheel: rarest symbols first, each at evenly spaced ideal slots.
const SEGS = (() => {
  const N = 54, out = new Array(N).fill(null);
  const plan = [['joker', 0], ['logo', 27], ['20', 13], ['10', 6.5], ['5', 3], ['2', 1]];
  for (const [k, off] of plan) {
    const c = SYM[k].count;
    for (let i = 0; i < c; i++) {
      let p = Math.round(off + i * N / c) % N, d = 0;
      while (out[(p + d) % N] !== null && out[(p - d + N) % N] !== null) d++;
      out[out[(p + d) % N] === null ? (p + d) % N : (p - d + N) % N] = k;
    }
  }
  return out.map(k => k || '1');
})();
const N = SEGS.length, ST = Math.PI * 2 / N;

const RULES = `
<h3>Big Six Wheel</h3>
<p>Pick a chip, place bets on one or more symbols, then <b>Spin</b> (<kbd>Space</kbd>). The wheel is spun by hand and the leather
<b>clapper</b> at the top ticks over the pegs until it stops; the segment under the clapper wins. Each symbol pays its face value to one.</p>
<p><b>Undo</b> removes the last chip, <b>Clear</b> refunds all bets, <b>Rebet</b> repeats the last spin's bets, <b>Double</b> doubles them. Right-click a spot to take that bet back.</p>
<table>
<tr><th>Symbol</th><th>Segments (of 54)</th><th>Pays</th><th>House edge</th></tr>
<tr><td>$1</td><td>24</td><td>1 to 1</td><td>11.1%</td></tr>
<tr><td>$2</td><td>15</td><td>2 to 1</td><td>16.7%</td></tr>
<tr><td>$5</td><td>7</td><td>5 to 1</td><td>22.2%</td></tr>
<tr><td>$10</td><td>4</td><td>10 to 1</td><td>18.5%</td></tr>
<tr><td>$20</td><td>2</td><td>20 to 1</td><td>22.2%</td></tr>
<tr><td>Joker</td><td>1</td><td>45 to 1</td><td>14.8%</td></tr>
<tr><td>Casino Logo</td><td>1</td><td>45 to 1</td><td>14.8%</td></tr>
</table>
<p>Every winning bet returns its stake plus the payout. Results come from a cryptographic RNG; every one of the 54 segments is equally likely.</p>`;

const CSS = `
.vc-screen .vc-rules[hidden]{display:none}
.b6-root{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:18px;padding:10px 14px;box-sizing:border-box}
.b6-root.wide{flex-direction:row}.b6-root.tall{flex-direction:column;gap:8px}
.b6-wheel{display:block;flex:none;filter:drop-shadow(0 16px 24px rgba(0,0,0,.6))}
.b6-panel{display:flex;flex-direction:column;gap:12px;align-items:stretch;min-width:0}
.b6-root.tall .b6-panel{width:100%;max-width:560px;gap:8px}
.b6-head{display:flex;justify-content:space-between;align-items:center;gap:10px}
.b6-head h4{margin:0;font:400 15px "Bungee",Impact,sans-serif;color:var(--gold);letter-spacing:.04em}
.b6-hist{display:flex;gap:3px;overflow:hidden;flex-wrap:nowrap;justify-content:flex-end;min-width:0}
.b6-hist span{flex:none;min-width:22px;height:22px;padding:0 3px;box-sizing:border-box;border-radius:4px;display:grid;place-items:center;font:700 10px "Chakra Petch",sans-serif;box-shadow:inset 0 0 0 1px rgba(255,255,255,.3)}
.b6-hist span:first-child{box-shadow:0 0 0 2px #ffe08a}
.b6-spots{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.b6-root.wide .b6-spots{grid-template-columns:repeat(4,minmax(96px,128px))}
.b6-spots .vc-spot{min-height:112px;padding:8px 4px 6px;border-radius:12px;background:rgba(0,0,0,.25);justify-content:space-between;gap:4px}
.b6-root.tall .b6-spots{gap:6px}.b6-root.tall .b6-spots .vc-spot{min-height:84px;padding:5px 2px 4px}
.b6-spots .vc-spot.has{background:rgba(255,224,138,.12)}
.b6-spots .vc-spot-l{width:100%;display:flex;justify-content:center}
.b6-tile{display:grid;place-items:center;width:84%;height:44px;border-radius:6px;font:400 18px "Bungee",Impact,sans-serif;box-shadow:inset 0 0 0 2px rgba(255,255,255,.35),0 3px 6px rgba(0,0,0,.4)}
.b6-root.tall .b6-tile{height:34px;font-size:14px}
.b6-tile.sm{font-size:12px;letter-spacing:.02em}.b6-root.tall .b6-tile.sm{font-size:9px}
.b6-spots .vc-spot small{font:700 12px "Chakra Petch",sans-serif;color:#ffe08a}
.b6-spots .vc-stack{bottom:auto;top:58%;transform:translate(-50%,-50%) scale(.9)}
.b6-root.tall .b6-spots .vc-stack{transform:translate(-50%,-50%) scale(.75)}
.b6-spots .vc-spot.lit{animation:b6lit 1s ease-in-out infinite;border-color:#ffe08a;box-shadow:0 0 0 2px #ffe08a,0 0 24px rgba(255,208,74,.8)}
@keyframes b6lit{50%{background:rgba(255,224,138,.35)}}
.b6-spots .vc-spot.dim{opacity:.55}
.b6-root.busy .b6-spots{pointer-events:none}
.b6-root.compact .b6-spots .vc-spot{min-height:64px;padding:4px 2px}.b6-root.compact .b6-tile{height:28px;font-size:13px}.b6-root.compact .b6-tile.sm{font-size:9px}.b6-root.compact .b6-spots .vc-stack{transform:translate(-50%,-50%) scale(.65)}.b6-root.compact .b6-odds{display:none}.b6-root.compact .b6-spots{gap:6px}
.b6-odds{font:600 12px "Chakra Petch",sans-serif;color:var(--dim);text-align:center}
`;
let styled = false;
function injectCSS() { if (styled) return; styled = true; const s = document.createElement('style'); s.id = 'b6-style'; s.textContent = CSS; document.head.appendChild(s); }

function wedge(g, r0, r1, a0, a1) { g.beginPath(); g.arc(0, 0, r1, a0, a1); g.arc(0, 0, r0, a1, a0, true); g.closePath(); }
function shade(hex, f) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const m = c => Math.max(0, Math.min(255, Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f))); return `rgb(${m(r)},${m(g)},${m(b)})`; }

function drawFace(R, dpr) {
  const c = document.createElement('canvas'); c.width = c.height = Math.ceil(2 * R * dpr); const g = c.getContext('2d'); g.scale(dpr, dpr); g.translate(R, R);
  // rim band
  wedge(g, R * .9, R * .985, 0, Math.PI * 2); const rg = g.createRadialGradient(0, 0, R * .9, 0, 0, R); rg.addColorStop(0, '#5a2c10'); rg.addColorStop(.5, '#8a4a1e'); rg.addColorStop(1, '#3a1a08'); g.fillStyle = rg; g.fill();
  for (let k = 0; k < N; k++) {
    const s = SYM[SEGS[k]], a = -Math.PI / 2 + k * ST;
    wedge(g, R * .27, R * .9, a - ST / 2, a + ST / 2);
    const sg = g.createRadialGradient(0, 0, R * .27, 0, 0, R * .9); sg.addColorStop(0, shade(s.fill, -.35)); sg.addColorStop(.55, s.fill); sg.addColorStop(1, shade(s.fill, .12));
    g.fillStyle = sg; g.fill();
    g.save(); g.rotate(a + Math.PI);
    const long = s.label.length > 3;
    g.fillStyle = s.ink; g.textBaseline = 'middle'; g.textAlign = 'center';
    g.font = `400 ${Math.round(R * (long ? .052 : .078))}px "Bungee", Impact, sans-serif`;
    g.fillText(s.label, -R * (long ? .62 : .7), 0);
    if (!long) { g.beginPath(); g.arc(-R * .42, 0, R * .012, 0, Math.PI * 2); g.globalAlpha = .55; g.fill(); g.globalAlpha = 1; }
    else { g.font = `${Math.round(R * .06)}px sans-serif`; g.fillText(SEGS[k] === 'joker' ? '★' : '♛', -R * .38, 0); }
    g.restore();
  }
  g.strokeStyle = 'rgba(255,240,200,.85)'; g.lineWidth = Math.max(1, R * .006);
  for (let k = 0; k < N; k++) { const a = -Math.PI / 2 + (k + .5) * ST; g.beginPath(); g.moveTo(Math.cos(a) * R * .27, Math.sin(a) * R * .27); g.lineTo(Math.cos(a) * R * .9, Math.sin(a) * R * .9); g.stroke(); }
  // pegs
  for (let k = 0; k < N; k++) {
    const a = -Math.PI / 2 + (k + .5) * ST, x = Math.cos(a) * R * .94, y = Math.sin(a) * R * .94;
    const pg = g.createRadialGradient(x - R * .006, y - R * .006, 0, x, y, R * .017); pg.addColorStop(0, '#fff'); pg.addColorStop(.5, '#c9ced6'); pg.addColorStop(1, '#5d636c');
    g.beginPath(); g.arc(x, y, R * .015, 0, Math.PI * 2); g.fillStyle = pg; g.fill();
  }
  g.beginPath(); g.arc(0, 0, R * .9, 0, Math.PI * 2); g.strokeStyle = '#e8c46a'; g.lineWidth = R * .01; g.stroke();
  return c;
}

function makeWheel(canvas) {
  const ctx = canvas.getContext('2d');
  const W = { w: 0, h: 0, dpr: 1, th: -K.rand(N) * ST, anim: null, flap: 0, flapV: 0, lastPeg: null, time: 0, win: -1, glow: 0 };
  let face = null;
  W.resize = px => {
    px = Math.max(160, Math.round(px)); if (px === W.w) return;
    W.w = px; W.h = Math.round(px * 1.06); W.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W.w * W.dpr); canvas.height = Math.round(W.h * W.dpr); canvas.style.width = W.w + 'px'; canvas.style.height = W.h + 'px';
    W.rebuild();
  };
  W.rebuild = () => { if (W.w) face = drawFace(W.w * .43, W.dpr); };
  W.spin = (k, T) => new Promise(res => {
    const jitter = (Math.random() * 2 - 1) * .32 * ST;
    const target = -k * ST + jitter, turns = 2 + Math.random() * 1.2;
    let D = ((target - W.th) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) + Math.PI * 2 * Math.floor(turns);
    W.anim = { t: 0, T, th0: W.th, D, res, k }; W.win = -1;
  });
  W.step = dt => {
    W.time += dt; W.glow += dt;
    const A = W.anim;
    if (A) {
      A.t += dt; const u = Math.min(1, A.t / A.T);
      // fast hand-spun start, long decay that the clapper slows at the end
      const e = 1 - Math.pow(1 - u, 3.2);
      W.th = A.th0 + A.D * e;
      if (u >= 1) { W.th = A.th0 + A.D; W.anim = null; W.win = A.k; W.glow = 0; A.res(); }
    }
    // clapper: nearest peg position relative to the top, in segment units
    const p = W.th / ST + .5, pr = Math.round(p), d = p - pr;
    if (W.lastPeg !== null && pr !== W.lastPeg) { K.sfx.tick(); W.flapV += 6; }
    W.lastPeg = pr;
    const push = d < 0 && d > -.42 ? (d + .42) / .42 : 0;
    W.flapV += (-140 * W.flap - 10 * W.flapV) * dt; W.flap += W.flapV * dt;
    if (W.flap < push) { W.flap = push; W.flapV = Math.max(0, W.flapV); }
  };
  W.draw = () => {
    if (!face) return;
    const S = W.w, R = S * .43, cx = S / 2, cy = W.h - S / 2, d = W.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(d, 0, 0, d, cx * d, cy * d);
    // outer frame with bulbs
    ctx.beginPath(); ctx.arc(0, 0, R * 1.08, 0, Math.PI * 2); const fg = ctx.createRadialGradient(0, 0, R * .98, 0, 0, R * 1.08);
    fg.addColorStop(0, '#6b4a14'); fg.addColorStop(.35, '#e8c46a'); fg.addColorStop(.7, '#a8842c'); fg.addColorStop(1, '#3a2a08'); ctx.fillStyle = fg; ctx.fill();
    const nb = 36, chase = Math.floor(W.time * (W.anim ? 14 : 3));
    for (let i = 0; i < nb; i++) {
      const a = i * Math.PI * 2 / nb, x = Math.cos(a) * R * 1.035, y = Math.sin(a) * R * 1.035;
      let on = W.anim ? (i + chase) % 3 === 0 : W.win >= 0 && W.glow < 4 ? Math.floor(W.glow * 6) % 2 === i % 2 : (i + chase) % 6 < 3;
      ctx.beginPath(); ctx.arc(x, y, R * .022, 0, Math.PI * 2);
      ctx.fillStyle = on ? '#fff6c8' : '#7a5a1a'; if (on) { ctx.shadowColor = '#ffd04a'; ctx.shadowBlur = R * .05; } ctx.fill(); ctx.shadowBlur = 0;
    }
    ctx.save(); ctx.rotate(W.th); ctx.drawImage(face, -R, -R, 2 * R, 2 * R);
    if (W.win >= 0) {
      const a = -Math.PI / 2 + W.win * ST, p = .5 + .5 * Math.sin(W.glow * 6);
      wedge(ctx, R * .27, R * .9, a - ST / 2, a + ST / 2); ctx.fillStyle = `rgba(255,255,255,${.12 + .18 * p})`; ctx.fill();
      ctx.lineWidth = R * .014; ctx.strokeStyle = '#ffe08a'; ctx.shadowColor = '#ffd04a'; ctx.shadowBlur = R * .08; ctx.stroke(); ctx.shadowBlur = 0;
    }
    ctx.restore();
    // hub (stationary medallion)
    const hg = ctx.createRadialGradient(-R * .06, -R * .08, R * .02, 0, 0, R * .27); hg.addColorStop(0, '#fff3c4'); hg.addColorStop(.45, '#d8b25a'); hg.addColorStop(1, '#6b4a14');
    ctx.beginPath(); ctx.arc(0, 0, R * .27, 0, Math.PI * 2); ctx.fillStyle = hg; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, R * .215, 0, Math.PI * 2); ctx.fillStyle = '#5a0d16'; ctx.fill(); ctx.lineWidth = R * .01; ctx.strokeStyle = '#ffe08a'; ctx.stroke();
    ctx.fillStyle = '#ffe08a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `400 ${Math.round(R * .075)}px "Bungee", Impact, sans-serif`; ctx.fillText('BIG SIX', 0, -R * .03);
    ctx.font = `600 ${Math.round(R * .045)}px "Chakra Petch", sans-serif`; ctx.fillText('VALLEY CASINO', 0, R * .06);
    // clapper (leather flapper on a brass bracket above the wheel)
    const py = -R * 1.13, len = R * .26;
    ctx.save(); ctx.translate(0, py); ctx.rotate(-W.flap * .42);
    ctx.beginPath(); ctx.moveTo(-R * .03, 0); ctx.lineTo(R * .03, 0); ctx.lineTo(R * .012, len); ctx.quadraticCurveTo(0, len + R * .02, -R * .012, len); ctx.closePath();
    const lg = ctx.createLinearGradient(-R * .03, 0, R * .03, 0); lg.addColorStop(0, '#3a1a08'); lg.addColorStop(.5, '#9a5a28'); lg.addColorStop(1, '#3a1a08');
    ctx.fillStyle = lg; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = R * .03; ctx.shadowOffsetY = R * .01; ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.restore();
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-R * .07, py - R * .05, R * .14, R * .07, R * .02) : ctx.rect(-R * .07, py - R * .05, R * .14, R * .07);
    const bg = ctx.createLinearGradient(0, py - R * .05, 0, py + R * .02); bg.addColorStop(0, '#fff3c4'); bg.addColorStop(1, '#8a6418'); ctx.fillStyle = bg; ctx.fill();
    ctx.beginPath(); ctx.arc(0, py, R * .018, 0, Math.PI * 2); ctx.fillStyle = '#3a2a08'; ctx.fill();
    // glare
    const gl = ctx.createLinearGradient(-R, -R, R * .3, R * .3); gl.addColorStop(0, 'rgba(255,255,255,.14)'); gl.addColorStop(.5, 'rgba(255,255,255,0)');
    ctx.beginPath(); ctx.arc(0, 0, R * .9, 0, Math.PI * 2); ctx.fillStyle = gl; ctx.fill();
  };
  return W;
}

export default {
  id: 'bigsix', title: 'Big Six Wheel', kind: 'table',
  blurb: 'The Money Wheel: 54 segments, a ticking leather clapper and Joker or Logo paying 45 to 1.',
  mount(root, api) {
    injectCSS();
    const t = K.table(root, api, { title: 'Big Six Wheel', subtitle: 'Money Wheel · Joker & Logo pay 45 to 1', felt: 'red', rack: [1, 5, 25, 100, 500], rules: RULES });
    let dead = false; const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!dead) fn(); }, ms); timers.add(id); };
    const el = document.createElement('div'); el.className = 'b6-root';
    el.innerHTML = `<canvas class="b6-wheel" aria-label="Big Six wheel"></canvas><div class="b6-panel"><div class="b6-head"><h4>Place your bets</h4><div class="b6-hist" aria-label="Recent results"></div></div><div class="b6-spots"></div><div class="b6-odds">Each symbol pays its face value · Joker &amp; Logo 45 to 1</div></div>`;
    t.felt.appendChild(el);
    const canvas = el.querySelector('canvas'), histEl = el.querySelector('.b6-hist'), spotsEl = el.querySelector('.b6-spots');
    const wheel = makeWheel(canvas);
    let bets = new Map(), actions = [], lastBets = null, spinning = false, pending = null, history = [], lit = false;
    const total = m => { let s = 0; for (const v of m.values()) s += v; return s; };

    const spots = {};
    for (const k of KEYS) {
      const s = SYM[k], long = s.label.length > 3;
      const sp = K.betSpot(`<span class="b6-tile${long ? ' sm' : ''}" style="background:${s.fill};color:${s.ink}">${long ? (k === 'joker' ? '★ JOKER' : '♛ LOGO') : s.label}</span>`, () => place(k), { sub: `${s.pay} to 1` });
      sp.el.dataset.bet = k; sp.el.setAttribute('aria-label', `${s.name}, pays ${s.pay} to 1`);
      sp.onRemove = () => removeBet(k);
      spots[k] = sp; spotsEl.appendChild(sp.el);
    }
    const unlight = () => { if (!lit) return; lit = false; for (const k of KEYS) spots[k].el.classList.remove('lit', 'dim'); };
    const render = k => spots[k].set(bets.get(k) || 0);
    function place(k) {
      if (spinning) return; unlight();
      const v = t.rack.value;
      if (!api.bet(v)) { t.msg(`Not enough chips for a ${K.fmt(v)} chip.`, 'lose'); return; }
      bets.set(k, (bets.get(k) || 0) + v); actions.push([[k, v]]); render(k); K.sfx.chip();
      t.msg(`${SYM[k].name}: ${K.fmt(bets.get(k))} (pays ${SYM[k].pay} to 1) · Total bet ${K.fmt(total(bets))}`); sync();
    }
    function removeBet(k) {
      if (spinning || !bets.has(k)) return; const a = bets.get(k); bets.delete(k); api.win(a); render(k);
      actions = actions.map(g => g.filter(([x]) => x !== k)).filter(g => g.length); K.sfx.chips(2); t.msg(`Took back ${K.fmt(a)} from ${SYM[k].name}.`); sync();
    }
    function addGroup(map, what) {
      const sum = total(map); if (!sum || spinning) return; unlight();
      if (!api.bet(sum)) { t.msg(`Not enough chips to ${what} (${K.fmt(sum)} needed).`, 'lose'); return; }
      const g = []; for (const [k, v] of map) { bets.set(k, (bets.get(k) || 0) + v); g.push([k, v]); render(k); }
      actions.push(g); K.sfx.chips(5); t.msg(`${what === 'double' ? 'Doubled' : 'Rebet'} — total bet ${K.fmt(total(bets))}.`); sync();
    }
    const undo = () => {
      const g = actions.pop(); if (!g) return; let back = 0;
      for (const [k, v] of g) { const left = (bets.get(k) || 0) - v; if (left > 0) bets.set(k, left); else bets.delete(k); render(k); back += v; }
      api.win(back); K.sfx.chip(); t.msg(`Undo — ${K.fmt(back)} returned.`); sync();
    };
    const clear = () => { const sum = total(bets); if (!sum) return; const ks = [...bets.keys()]; bets.clear(); ks.forEach(render); actions = []; api.win(sum); K.sfx.chips(4); t.msg(`Bets cleared — ${K.fmt(sum)} returned.`); sync(); };

    const bClear = K.button('Clear<kbd>C</kbd>', clear), bUndo = K.button('Undo<kbd>Z</kbd>', undo);
    const bRebet = K.button('Rebet<kbd>R</kbd>', () => lastBets && addGroup(lastBets, 'rebet'));
    const bDouble = K.button('Double<kbd>D</kbd>', () => addGroup(new Map(bets), 'double'));
    const bSpin = K.button('Spin<kbd>Space</kbd>', () => spin(), { primary: true });
    [bClear, bUndo, bRebet, bDouble, bSpin].forEach(b => t.controls.appendChild(b));
    t.bindKey('c', bClear); t.bindKey('z', bUndo); t.bindKey('r', bRebet); t.bindKey('d', bDouble); t.bindKey(' ', bSpin);
    function sync() {
      const has = bets.size > 0;
      bClear.disabled = bDouble.disabled = !has || spinning; bUndo.disabled = !actions.length || spinning;
      bRebet.disabled = spinning || !lastBets; bSpin.disabled = spinning || !has;
      el.classList.toggle('busy', spinning); t.setBusy(spinning);
    }
    function renderHist() {
      histEl.innerHTML = history.slice(0, 10).map(k => `<span style="background:${SYM[k].fill};color:${SYM[k].ink}">${k === 'joker' ? '★' : k === 'logo' ? '♛' : SYM[k].label}</span>`).join('');
    }

    function payout(k) { const a = bets.get(k) || 0; return a ? a * (SYM[k].pay + 1) : 0; }
    async function spin() {
      if (spinning || !bets.size) { if (!bets.size) t.msg('Place a bet on a symbol first.'); return; }
      unlight(); spinning = true; sync();
      let idx;
      const f = window.__force; window.__force = undefined;
      if (f !== undefined && f !== null) { const fk = String(f); idx = /^\d+$/.test(fk) && +fk >= 0 && +fk < N && !SYM[fk] ? +fk : SEGS.indexOf(fk); if (idx < 0) idx = K.rand(N); }
      else idx = K.rand(N);
      pending = idx;
      t.msg('The wheel is spinning… no more bets!');
      await wheel.spin(idx, window.__fast ? 1 : 6.5 + Math.random() * 1.5);
      if (dead) return;
      settle(idx);
    }
    function settle(idx) {
      pending = null;
      const k = SEGS[idx], s = SYM[k], staked = total(bets), ret = payout(k), net = ret - staked;
      if (ret) api.win(ret);
      lit = true;
      for (const x of KEYS) { spots[x].el.classList.toggle('lit', x === k); spots[x].el.classList.toggle('dim', x !== k); if (bets.has(x)) spots[x].flash(x === k ? 'win' : 'lose'); }
      history.unshift(k); if (history.length > 50) history.pop(); renderHist();
      const head = k === 'joker' ? 'JOKER!' : k === 'logo' ? 'Casino Logo!' : `${s.label} wins`;
      if (ret) t.msg(`${head} ${K.fmt(bets.get(k))} on ${s.name} pays ${s.pay} to 1 — you collect ${K.fmt(ret)} (${net >= 0 ? 'net +' + K.fmt(net) : 'net −' + K.fmt(-net)}).`, net > 0 ? 'win' : net === 0 ? 'push' : 'lose');
      else t.msg(`${head} (${s.pay} to 1). No bet on ${s.name} — house takes ${K.fmt(staked)}.`, 'lose');
      if (net > 0) { K.banner(t, s.pay >= 20 && ret ? `${s.pay === 45 ? (k === 'joker' ? 'JOKER' : 'LOGO') : '$20'} +${K.fmt(net)}` : '+' + K.fmt(net), 'win'); if (s.pay >= 10) K.sfx.bigWin(); else K.sfx.win(); }
      else if (ret) K.sfx.push(); else K.sfx.lose();
      lastBets = new Map(bets);
      const ks = [...bets.keys()]; bets.clear(); actions = [];
      later(() => { if (!spinning) ks.forEach(x => { if (!bets.has(x)) render(x); }); }, window.__fast ? 100 : 1600);
      spinning = false; sync();
    }

    function layout() {
      if (dead) return;
      const fw = t.felt.clientWidth, fh = t.felt.clientHeight;
      const wide = fw >= 760 && fw > fh * 1.1;
      el.classList.toggle('wide', wide); el.classList.toggle('tall', !wide); el.classList.toggle('compact', wide && fh < 520);
      if (wide) wheel.resize(Math.min((fh - 24) / 1.06, fw - 580, 640));
      else wheel.resize(Math.min(fw - 28, (fh - 16 - el.querySelector('.b6-panel').offsetHeight - 10) / 1.06, 560));
    }
    const ro = new ResizeObserver(layout); ro.observe(t.felt);
    let raf = 0, last = performance.now();
    const loop = now => { const dt = Math.min(.05, (now - last) / 1000); last = now; wheel.step(dt); wheel.draw(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!dead) wheel.rebuild(); });
    sync(); layout(); renderHist();
    t.msg('Pick a chip, bet on a symbol, then spin the wheel. Space to spin.');
    return {
      unmount() {
        dead = true; cancelAnimationFrame(raf); ro.disconnect(); timers.forEach(clearTimeout); timers.clear();
        if (spinning && pending !== null) { const r = payout(SEGS[pending]); if (r) api.win(r); }
        else { const s = total(bets); if (s) api.win(s); }
        bets.clear(); t.destroy();
      }
    };
  }
};
