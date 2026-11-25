// Valley Casino — Sic Bo. Three dice under a glass dome, full Macau-style layout with lit winning areas.
import * as K from './_kit.js';

const TOTPAY = { 4: 60, 5: 30, 6: 17, 7: 12, 8: 8, 9: 6, 10: 6, 11: 6, 12: 6, 13: 8, 14: 12, 15: 17, 16: 30, 17: 60 };
const COMBOS = []; for (let i = 1; i <= 6; i++) for (let j = i + 1; j <= 6; j++) COMBOS.push([i, j]);
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const md = (n, cls = '') => `<i class="sb-md${cls ? ' ' + cls : ''}${n === 1 || n === 4 ? ' red' : ''}${n === 1 ? ' one' : ''}">${Array.from({ length: 9 }, (_, i) => `<b${PIPS[n].includes(i) ? ' class="on"' : ''}></b>`).join('')}</i>`;

// bet definitions: key -> { name, pay (to 1; singles are 1/2/3 by count), html }
const DEFS = {};
const def = (key, name, pay, html, cls = '') => { DEFS[key] = { key, name, pay, html, cls }; };
def('small', 'Small', 1, `<b class="sb-big">SMALL</b><span>4 – 10</span><em>1 to 1</em><small>lose on triples</small>`, 'sb-bs');
def('big', 'Big', 1, `<b class="sb-big">BIG</b><span>11 – 17</span><em>1 to 1</em><small>lose on triples</small>`, 'sb-bs');
def('odd', 'Odd', 1, `<b class="sb-mid">ODD</b><em>1 to 1</em>`, 'sb-oe');
def('even', 'Even', 1, `<b class="sb-mid">EVEN</b><em>1 to 1</em>`, 'sb-oe');
def('any', 'Any Triple', 30, `<b class="sb-mid">ANY TRIPLE</b><span class="sb-row">${[1, 2, 3, 4, 5, 6].map(n => md(n, 'xs')).join('')}</span><em>30 to 1</em>`, 'sb-any');
for (let n = 1; n <= 6; n++) {
  def('t' + n, `Triple ${n}s`, 180, `<span class="sb-row">${md(n) + md(n) + md(n)}</span><em>180 to 1</em>`, 'sb-tr');
  def('d' + n, `Double ${n}s`, 10, `<span class="sb-row">${md(n) + md(n)}</span><em>10 to 1</em>`, 'sb-db');
  def('s' + n, `Single ${n}`, 1, `<span class="sb-row">${md(n, 'lg')}</span><em>1 · 2 · 3 to 1</em>`, 'sb-sg');
}
for (let s = 4; s <= 17; s++) def('n' + s, `Total ${s}`, TOTPAY[s], `<b class="sb-num">${s}</b><em>${TOTPAY[s]} to 1</em>`, 'sb-tot');
for (const [i, j] of COMBOS) def(`c${i}${j}`, `${i} & ${j}`, 5, `<span class="sb-col">${md(i) + md(j)}</span><em>5 to 1</em>`, 'sb-cb');

// Layouts in board units: [key, x, y, w, h]
function wideLayout() {
  const L = [['small', 0, 0, 2, 2.2], ['big', 12, 0, 2, 2.2], ['any', 5, 0, 4, 2.2]];
  for (let i = 0; i < 3; i++) { L.push(['d' + (i + 1), 2 + i, 0, 1, 1.1], ['t' + (i + 1), 2 + i, 1.1, 1, 1.1], ['d' + (i + 4), 9 + i, 0, 1, 1.1], ['t' + (i + 4), 9 + i, 1.1, 1, 1.1]); }
  for (let s = 4; s <= 17; s++) L.push(['n' + s, s - 4, 2.2, 1, 1.25]);
  COMBOS.forEach(([i, j], k) => L.push([`c${i}${j}`, k * 14 / 15, 3.45, 14 / 15, 1.45]));
  L.push(['odd', 0, 4.9, 2, 1.2], ['even', 12, 4.9, 2, 1.2]);
  for (let n = 1; n <= 6; n++) L.push(['s' + n, 2 + (n - 1) * 10 / 6, 4.9, 10 / 6, 1.2]);
  return { W: 14, H: 6.1, L };
}
function narrowLayout() {
  const L = [['small', 0, 0, 1.5, 1.05], ['odd', 1.5, 0, 1.5, 1.05], ['even', 3, 0, 1.5, 1.05], ['big', 4.5, 0, 1.5, 1.05], ['any', 0, 1.05, 6, .72]];
  for (let n = 1; n <= 6; n++) L.push(['t' + n, n - 1, 1.77, 1, .9], ['d' + n, n - 1, 2.67, 1, .9], ['s' + n, n - 1, 8.07, 1, .95]);
  for (let s = 4; s <= 17; s++) { const r = s <= 10 ? 0 : 1, c = r ? s - 11 : s - 4; L.push(['n' + s, c * 6 / 7, 3.57 + r * .9, 6 / 7, .9]); }
  COMBOS.forEach(([i, j], k) => L.push([`c${i}${j}`, (k % 5) * 1.2, 5.37 + Math.floor(k / 5) * .9, 1.2, .9]));
  return { W: 6, H: 9.02, L };
}

function winners(d) {
  const [a, b, c] = d, s = a + b + c, cnt = [0, 0, 0, 0, 0, 0, 0]; d.forEach(x => cnt[x]++);
  const triple = a === b && b === c, W = {};
  if (!triple) { W[s <= 10 ? 'small' : 'big'] = 1; W[s % 2 ? 'odd' : 'even'] = 1; }
  else { W['t' + a] = 180; W.any = 30; }
  for (let n = 1; n <= 6; n++) { if (cnt[n] >= 2) W['d' + n] = 10; if (cnt[n]) W['s' + n] = cnt[n]; }
  if (TOTPAY[s]) W['n' + s] = TOTPAY[s];
  for (const [i, j] of COMBOS) if (cnt[i] && cnt[j]) W[`c${i}${j}`] = 5;
  return W;
}

const RULES = `
<h3>Sic Bo</h3>
<p>Three dice are shaken under a glass dome. Pick a chip, tap the layout to bet, then <b>Roll</b> (<kbd>Space</kbd>). After the roll every winning area on the
table lights up, as on Macau tables. Winning bets return the stake plus the payout.</p>
<p>Right-click a spot to take that bet back. <b>Undo</b> removes the last chip, <b>Clear</b> refunds everything, <b>Rebet</b> repeats the last roll's bets, <b>Double</b> doubles them.</p>
<table>
<tr><th>Bet</th><th>Wins when</th><th>Pays</th></tr>
<tr><td>Small / Big</td><td>Total 4–10 / 11–17, <b>loses on any triple</b></td><td>1 to 1</td></tr>
<tr><td>Odd / Even</td><td>Total is odd / even, loses on any triple</td><td>1 to 1</td></tr>
<tr><td>Specific triple</td><td>All three dice show that number</td><td>180 to 1</td></tr>
<tr><td>Any triple</td><td>All three dice match</td><td>30 to 1</td></tr>
<tr><td>Specific double</td><td>At least two dice show that number</td><td>10 to 1</td></tr>
<tr><td>Total 4 or 17</td><td rowspan="1">Sum of the dice</td><td>60 to 1</td></tr>
<tr><td>Total 5 or 16</td><td></td><td>30 to 1</td></tr>
<tr><td>Total 6 or 15</td><td></td><td>17 to 1</td></tr>
<tr><td>Total 7 or 14</td><td></td><td>12 to 1</td></tr>
<tr><td>Total 8 or 13</td><td></td><td>8 to 1</td></tr>
<tr><td>Total 9, 10, 11 or 12</td><td></td><td>6 to 1</td></tr>
<tr><td>Two-dice combination</td><td>Both numbers appear</td><td>5 to 1</td></tr>
<tr><td>Single number</td><td>Number on one / two / three dice</td><td>1 / 2 / 3 to 1</td></tr>
</table>
<p>Dice come from a cryptographic RNG. House edge: Small/Big 2.78%, single numbers 7.87%, totals 9.7–18.1%, any triple 13.9%, specific triple 16.2%.</p>`;

const CSS = `
.vc-screen .vc-rules[hidden]{display:none}
.sb-root{position:absolute;inset:0;display:flex;gap:16px;padding:10px 14px;box-sizing:border-box}
.sb-root.docked{flex-direction:row;align-items:center}
.sb-root.ovl{flex-direction:column;gap:8px;padding:8px 12px}
.sb-side{flex:none;display:flex;flex-direction:column;align-items:center;gap:12px}
.sb-root.ovl .sb-side{display:none}
.sb-strip{display:none;align-items:center;gap:10px;justify-content:space-between;min-height:40px}
.sb-root.ovl .sb-strip{display:flex}
.sb-last{display:flex;white-space:nowrap;flex:none;align-items:center;gap:6px;font:400 16px "Bungee",Impact,sans-serif;color:var(--gold)}
.sb-last .sb-md{font-size:24px}
.sb-tag{font:700 11px "Chakra Petch",sans-serif;padding:2px 6px;border-radius:6px;background:rgba(0,0,0,.5);color:#fff;letter-spacing:.05em}
.sb-tag.B{background:#b5121b}.sb-tag.S{background:#1e5bd8}.sb-tag.T{background:#b8860b}
.sb-hist{display:flex;gap:4px;overflow:hidden;flex-wrap:nowrap;min-width:0}
.sb-hist span{flex:none;font:700 11px "Chakra Petch",sans-serif;min-width:26px;height:26px;border-radius:50%;display:grid;place-items:center;color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.3)}
.sb-hist span.B{background:#8e1019}.sb-hist span.S{background:#163f9a}.sb-hist span.T{background:#a07408}
.sb-hist span:first-child{box-shadow:0 0 0 2px #ffe08a}
.sb-histcol{display:grid;gap:4px;width:100%}
.sb-histcol div{display:flex;align-items:center;gap:6px;font:600 12px "Chakra Petch",sans-serif;color:var(--dim);padding:3px 8px;background:rgba(0,0,0,.25);border-radius:6px}
.sb-histcol div:first-child{color:#fff;background:rgba(232,196,106,.18)}
.sb-histcol .sb-md{font-size:16px}
.sb-histcol>div>b{margin-left:auto;color:var(--gold);font-weight:700}
.sb-dome{--d:240px;position:relative;width:var(--d);height:var(--d);flex:none}
.sb-plate{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 50% 45%,#8a1420 0%,#5a0b14 60%,#2a0408 100%);box-shadow:0 0 0 calc(var(--d)*.03) #c9a24a,0 0 0 calc(var(--d)*.045) #5a3d0c,0 18px 30px rgba(0,0,0,.6),inset 0 0 calc(var(--d)*.12) rgba(0,0,0,.6)}
.sb-plate::after{content:"";position:absolute;inset:12%;border-radius:50%;border:1px dashed rgba(232,196,106,.35)}
.sb-dice{position:absolute;inset:0}
.sb-dice .vc-die{position:absolute;box-sizing:border-box;padding:calc(var(--ds)*.12);gap:calc(var(--ds)*.04);transform:translate(-50%,-50%) rotate(var(--r,0deg));transition:left .35s,top .35s}
.sb-dice .vc-die.rolling{animation:sbtumble .16s linear infinite}
.sb-dice .vc-die.land{animation:none}
@keyframes sbtumble{0%{transform:translate(-50%,-50%) rotate(0)}50%{transform:translate(-50%,-62%) rotate(180deg) scale(.92)}100%{transform:translate(-50%,-50%) rotate(360deg)}}
.sb-dice .vc-die i.on,.sb-md b.on{background:radial-gradient(circle at 40% 35%,#555,#000 70%)}
.sb-dice .vc-die[data-v="1"] i.on,.sb-dice .vc-die[data-v="4"] i.on,.sb-md.red b.on{background:radial-gradient(circle at 40% 35%,#ff6b6b,#b0000f 70%)}
.sb-dice .vc-die[data-v="1"] i.on{transform:scale(1.7)}
.sb-dice .vc-die.win{box-shadow:0 0 0 3px #ffe08a,0 0 18px #ffd04a}
.sb-glass{position:absolute;inset:-4%;border-radius:50%;pointer-events:none;
  background:radial-gradient(circle at 32% 26%,rgba(255,255,255,.55) 0 6%,rgba(255,255,255,.12) 14%,transparent 30%),radial-gradient(circle at 50% 50%,transparent 58%,rgba(200,230,255,.18) 70%,rgba(255,255,255,.35) 78%,transparent 80%);
  box-shadow:inset 0 0 0 2px rgba(255,255,255,.25),inset 0 -10px 30px rgba(180,220,255,.15)}
.sb-glass::after{content:"";position:absolute;left:42%;top:-6%;width:16%;height:9%;border-radius:40% 40% 20% 20%;background:linear-gradient(#f3d27e,#8a6418);box-shadow:0 3px 6px rgba(0,0,0,.5)}
.sb-dome.shake{animation:sbshake .12s linear infinite}
@keyframes sbshake{0%{transform:translate(0,0) rotate(0)}25%{transform:translate(-5px,-7px) rotate(-3deg)}50%{transform:translate(4px,-3px) rotate(2deg)}75%{transform:translate(-3px,5px) rotate(-1deg)}100%{transform:translate(0,0)}}
.sb-sum{font:400 22px "Bungee",Impact,sans-serif;color:var(--gold);text-shadow:0 2px 0 #000;min-height:1.2em;text-align:center}
.sb-main{flex:1;min-width:0;min-height:0;position:relative;align-self:stretch}
.sb-board{position:absolute;font-family:"Chakra Petch",sans-serif;border-radius:10px;background:rgba(0,0,0,.12);box-shadow:0 0 0 3px rgba(232,196,106,.5),0 12px 30px rgba(0,0,0,.45)}
.sb-board .vc-spot{position:absolute;min-width:0;min-height:0;box-sizing:border-box;padding:.15em .1em;border-radius:.35em;border:1px solid rgba(255,255,255,.55);display:flex;align-items:center;justify-content:center;font-size:1em;background:rgba(255,255,255,.03)}
.sb-board .vc-spot-l{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.12em;text-transform:none;letter-spacing:0;line-height:1}
.sb-board .vc-spot em{font-style:normal;font-weight:700;font-size:.72em;color:#ffe08a;white-space:nowrap}
.sb-board .vc-spot span{font-size:.8em;color:var(--dim);white-space:nowrap}
.sb-board .vc-spot small{font-size:.6em;color:var(--dim);white-space:nowrap}
.sb-big{font:400 1.6em "Bungee",Impact,sans-serif;color:#fff}
.sb-mid{font:400 1.05em "Bungee",Impact,sans-serif;color:#fff;white-space:nowrap}
.sb-num{font:400 1.45em "Bungee",Impact,sans-serif;color:#fff}
.sb-bs{background:linear-gradient(160deg,rgba(181,18,27,.35),rgba(0,0,0,.15))!important}
.sb-bs.sb-k-small{background:linear-gradient(160deg,rgba(30,91,216,.4),rgba(0,0,0,.15))!important}
.sb-any{background:linear-gradient(160deg,rgba(232,196,106,.25),rgba(0,0,0,.1))!important}
.sb-tr{background:rgba(232,196,106,.08)!important}
.sb-row{display:flex;gap:.12em;align-items:center}
.sb-col{display:flex;flex-direction:column;gap:.1em;align-items:center}
.sb-root.ovl:not(.wideb) .sb-col{flex-direction:row}
.sb-md{--m:1em;display:inline-grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);width:var(--m);height:var(--m);padding:calc(var(--m)*.12);gap:calc(var(--m)*.05);box-sizing:border-box;border-radius:20%;background:linear-gradient(145deg,#fff,#e4e0d4);box-shadow:0 1px 2px rgba(0,0,0,.6);font-style:normal;flex:none}
.sb-md b{border-radius:50%}.sb-md.one b.on{transform:scale(1.5)}
.sb-board .sb-md{--m:1.5em}.sb-board .sb-md.lg{--m:2.5em}.sb-board .sb-md.xs{--m:1.05em}.sb-board .sb-tr .sb-md{--m:1.22em}
.sb-root.ovl:not(.wideb) .sb-board .sb-tr .sb-md{--m:1.12em}
.sb-board .vc-stack{transform:translate(-50%,50%) scale(var(--cs,1));z-index:2}
.sb-board .vc-spot.lit{border-color:#ffe08a;background:rgba(255,224,138,.28)!important;box-shadow:0 0 0 2px #ffe08a,0 0 22px rgba(255,208,74,.85);z-index:1;animation:sblit 1.2s ease-in-out infinite}
@keyframes sblit{50%{background:rgba(255,224,138,.45)}}
.sb-board .vc-spot.off{opacity:.55}
.sb-ov{position:absolute;inset:0;z-index:9;display:grid;place-items:center;align-content:center;gap:14px;background:rgba(0,0,0,.6);transition:opacity .35s}
.sb-ov.hide{opacity:0;pointer-events:none}
`;
let styled = false;
function injectCSS() { if (styled) return; styled = true; const s = document.createElement('style'); s.id = 'sb-style'; s.textContent = CSS; document.head.appendChild(s); }

export default {
  id: 'sicbo', title: 'Sic Bo', kind: 'table',
  blurb: 'Three dice under the dome — Big/Small, triples at 180 to 1, totals and combos on a lit Macau layout.',
  mount(root, api) {
    injectCSS();
    const t = K.table(root, api, { title: 'Sic Bo', subtitle: 'Big · Small · Triples pay 180 to 1', felt: 'teal', rack: [1, 5, 25, 100, 500], rules: RULES });
    let dead = false; const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!dead) fn(); }, ms); timers.add(id); };
    const el = document.createElement('div'); el.className = 'sb-root';
    el.innerHTML = `<div class="sb-side"><div class="sb-domeslot"></div><div class="sb-sum"></div><div class="sb-histcol"></div></div>
      <div class="sb-strip"><div class="sb-last"></div><div class="sb-hist"></div></div>
      <div class="sb-main"><div class="sb-board"></div></div>
      <div class="sb-ov hide"><div class="sb-ovslot"></div><div class="sb-sum sb-ovsum"></div></div>`;
    t.felt.appendChild(el);
    const $ = s => el.querySelector(s);
    const board = $('.sb-board'), main = $('.sb-main'), ov = $('.sb-ov');
    const dome = document.createElement('div'); dome.className = 'sb-dome';
    dome.innerHTML = `<div class="sb-plate"></div><div class="sb-dice"></div><div class="sb-glass"></div>`;
    const diceBox = dome.querySelector('.sb-dice');
    const SPOTS = [[38, 34], [64, 40], [48, 64]];
    let faces = [1 + K.rand(6), 1 + K.rand(6), 1 + K.rand(6)];
    const dice = faces.map((v, i) => { const d = K.dieEl(v, { color: '#f6f3ea' }); d.style.left = SPOTS[i][0] + '%'; d.style.top = SPOTS[i][1] + '%'; d.style.setProperty('--r', (K.rand(60) - 30) + 'deg'); diceBox.appendChild(d); return d; });

    let bets = new Map(), actions = [], lastBets = null, rolling = false, pending = null, history = [], lit = false, docked = true;
    const total = m => { let s = 0; for (const v of m.values()) s += v; return s; };
    const spots = {};
    for (const key in DEFS) {
      const d = DEFS[key];
      const sp = K.betSpot(d.html, () => place(key), { cls: d.cls + ' sb-k-' + key });
      sp.el.dataset.bet = key; sp.el.setAttribute('aria-label', `${d.name}, pays ${key[0] === 's' && key.length === 2 ? '1, 2 or 3' : d.pay} to 1`);
      sp.el.title = sp.el.getAttribute('aria-label'); sp.onRemove = () => removeBet(key);
      spots[key] = sp; board.appendChild(sp.el);
    }
    const unlight = () => { if (!lit) return; lit = false; for (const k in spots) spots[k].el.classList.remove('lit', 'off'); dice.forEach(d => d.classList.remove('win')); };
    const render = k => spots[k].set(bets.get(k) || 0);
    function place(k) {
      if (rolling) return; unlight();
      const v = t.rack.value;
      if (!api.bet(v)) { t.msg(`Not enough chips for a ${K.fmt(v)} chip.`, 'lose'); return; }
      bets.set(k, (bets.get(k) || 0) + v); actions.push([[k, v]]); render(k); K.sfx.chip();
      const d = DEFS[k];
      t.msg(`${d.name}: ${K.fmt(bets.get(k))} (pays ${k[0] === 's' && k.length === 2 ? '1/2/3' : d.pay} to 1) · Total bet ${K.fmt(total(bets))}`); sync();
    }
    function removeBet(k) {
      if (rolling || !bets.has(k)) return; const a = bets.get(k); bets.delete(k); api.win(a); render(k);
      actions = actions.map(g => g.filter(([x]) => x !== k)).filter(g => g.length); K.sfx.chips(2); t.msg(`Took back ${K.fmt(a)} from ${DEFS[k].name}.`); sync();
    }
    function addGroup(map, what) {
      const sum = total(map); if (!sum || rolling) return; unlight();
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
    const bRoll = K.button('Roll<kbd>Space</kbd>', () => roll(), { primary: true });
    [bClear, bUndo, bRebet, bDouble, bRoll].forEach(b => t.controls.appendChild(b));
    t.bindKey('c', bClear); t.bindKey('z', bUndo); t.bindKey('r', bRebet); t.bindKey('d', bDouble); t.bindKey(' ', bRoll);
    function sync() {
      const has = bets.size > 0;
      bClear.disabled = bDouble.disabled = !has || rolling; bUndo.disabled = !actions.length || rolling;
      bRebet.disabled = rolling || !lastBets; bRoll.disabled = rolling || !has; t.setBusy(rolling);
    }

    const tagOf = d => { const s = d[0] + d[1] + d[2]; return d[0] === d[1] && d[1] === d[2] ? 'T' : s <= 10 ? 'S' : 'B'; };
    function renderHist() {
      $('.sb-hist').innerHTML = history.slice(0, 12).map(d => `<span class="${tagOf(d)}">${d[0] + d[1] + d[2]}</span>`).join('');
      $('.sb-histcol').innerHTML = history.slice(0, 5).map(d => `<div>${d.map(n => md(n)).join('')}<span class="sb-tag ${tagOf(d)}">${{ T: 'TRIPLE', S: 'SMALL', B: 'BIG' }[tagOf(d)]}</span><b>${d[0] + d[1] + d[2]}</b></div>`).join('');
      const d = history[0];
      $('.sb-last').innerHTML = d ? `${d.map(n => md(n)).join('')}<span>= ${d[0] + d[1] + d[2]}</span><span class="sb-tag ${tagOf(d)}">${{ T: 'TRIPLE', S: 'SMALL', B: 'BIG' }[tagOf(d)]}</span>` : '<span style="font-size:13px;color:var(--dim)">Place your bets</span>';
      el.querySelectorAll('.sb-side .sb-sum, .sb-ovsum').forEach(s => s.textContent = d ? `${d.join(' · ')} = ${d[0] + d[1] + d[2]}` : '');
    }

    async function roll() {
      if (rolling || !bets.size) { if (!bets.size) t.msg('Place a bet first.'); return; }
      unlight(); rolling = true; sync();
      let r;
      const f = window.__force; window.__force = undefined;
      if (Array.isArray(f) && f.length === 3 && f.every(x => x >= 1 && x <= 6)) r = f.map(Number);
      else r = [1 + K.rand(6), 1 + K.rand(6), 1 + K.rand(6)];
      pending = r;
      const fast = !!window.__fast;
      t.msg('No more bets! Shaking the dice…');
      if (!docked) { ov.classList.remove('hide'); el.querySelector('.sb-ovsum').textContent = ''; }
      el.querySelector('.sb-side .sb-sum').textContent = '';
      dome.classList.add('shake'); K.sfx.dice();
      const shakeMs = fast ? 150 : 1100;
      const tm = setTimeout(() => { if (!dead) K.sfx.dice(); }, shakeMs / 2); timers.add(tm);
      await Promise.all(dice.map((d, i) => d.roll(r[i], shakeMs + (fast ? 50 : 250 + i * 180))));
      if (dead) return;
      dome.classList.remove('shake');
      // scatter the dice naturally inside the dome
      const base = [[34 + K.rand(8), 32 + K.rand(8)], [58 + K.rand(8), 36 + K.rand(10)], [42 + K.rand(12), 60 + K.rand(8)]];
      dice.forEach((d, i) => { d.style.left = base[i][0] + '%'; d.style.top = base[i][1] + '%'; d.style.setProperty('--r', (K.rand(70) - 35) + 'deg'); });
      K.sfx.reelStop();
      settle(r);
    }
    function settle(r) {
      pending = null;
      const W = winners(r), s = r[0] + r[1] + r[2], triple = r[0] === r[1] && r[1] === r[2];
      let ret = 0, staked = total(bets); const won = [];
      for (const [k, a] of bets) if (W[k]) { ret += a * (W[k] + 1); won.push(DEFS[k].name + (k[0] === 's' && k.length === 2 && W[k] > 1 ? ` ×${W[k]}` : '')); }
      if (ret) api.win(ret);
      lit = true;
      for (const k in spots) { spots[k].el.classList.toggle('lit', !!W[k]); spots[k].el.classList.toggle('off', !W[k]); if (bets.has(k) && !W[k]) spots[k].flash('lose'); }
      if (triple) dice.forEach(d => d.classList.add('win'));
      history.unshift(r); if (history.length > 60) history.pop(); renderHist();
      const desc = `${r.join(' · ')} = ${s}${triple ? ' — TRIPLE ' + r[0] + 's!' : ` — ${s <= 10 ? 'Small' : 'Big'}, ${s % 2 ? 'Odd' : 'Even'}`}`;
      const net = ret - staked;
      if (won.length) {
        const w = won.length > 4 ? won.slice(0, 4).join(', ') + ` +${won.length - 4} more` : won.join(', ');
        t.msg(`${desc}. Winners: ${w}. Paid ${K.fmt(ret)} (${net >= 0 ? 'net +' + K.fmt(net) : 'net −' + K.fmt(-net)}).`, net > 0 ? 'win' : net === 0 ? 'push' : 'lose');
      } else t.msg(`${desc}. No winning bets — house takes ${K.fmt(staked)}.`, 'lose');
      if (net > 0) { K.banner(t, (triple && W['t' + r[0]] && bets.has('t' + r[0]) ? 'TRIPLE! ' : '') + '+' + K.fmt(net), 'win'); if (net >= staked * 8) K.sfx.bigWin(); else K.sfx.win(); }
      else if (ret) K.sfx.push(); else K.sfx.lose();
      lastBets = new Map(bets);
      const ks = [...bets.keys()]; bets.clear(); actions = [];
      later(() => { if (!rolling) ks.forEach(x => { if (!bets.has(x)) render(x); }); }, window.__fast ? 100 : 1800);
      if (!docked) later(() => ov.classList.add('hide'), window.__fast ? 100 : 1500);
      rolling = false; sync();
    }
    ov.addEventListener('click', () => { if (!rolling) ov.classList.add('hide'); });

    function layout() {
      if (dead) return;
      const fw = t.felt.clientWidth, fh = t.felt.clientHeight;
      docked = fw >= 900 && fh >= 400;
      el.classList.toggle('docked', docked); el.classList.toggle('ovl', !docked);
      if (docked) { const d = Math.min(fh * .5, fw * .2, 300); dome.style.setProperty('--d', d + 'px'); dice.forEach(x => x.style.setProperty('--ds', d * .23 + 'px')); $('.sb-domeslot').appendChild(dome); $('.sb-side').style.width = Math.max(d + 20, 230) + 'px'; }
      else { const d = Math.min(fw - 80, fh - 140, 320); dome.style.setProperty('--d', d + 'px'); dice.forEach(x => x.style.setProperty('--ds', d * .23 + 'px')); $('.sb-ovslot').appendChild(dome); }
      const mw = main.clientWidth, mh = main.clientHeight; if (!mw || !mh) return;
      const wideB = docked || mw > mh * 1.2;
      el.classList.toggle('wideb', wideB);
      const { W, H, L } = wideB ? wideLayout() : narrowLayout();
      const u = Math.min(mw / W, mh / H), bw = u * W, bh = u * H;
      Object.assign(board.style, { width: bw + 'px', height: bh + 'px', left: (mw - bw) / 2 + 'px', top: (mh - bh) / 2 + 'px', fontSize: u * (wideB ? .27 : .26) + 'px' });
      board.style.setProperty('--cs', Math.max(.5, Math.min(.9, u / 70)).toFixed(3));
      for (const [k, x, y, w, h] of L) Object.assign(spots[k].el.style, { left: x * u + 'px', top: y * u + 'px', width: w * u + 'px', height: h * u + 'px' });
    }
    const ro = new ResizeObserver(layout); ro.observe(t.felt);
    sync(); renderHist(); layout();
    t.msg('Pick a chip and bet on the layout, then roll the dice. Space to roll.');
    return {
      unmount() {
        dead = true; ro.disconnect(); timers.forEach(clearTimeout); timers.clear();
        if (rolling && pending) { const W = winners(pending); let r = 0; for (const [k, a] of bets) if (W[k]) r += a * (W[k] + 1); if (r) api.win(r); }
        else { const s = total(bets); if (s) api.win(s); }
        bets.clear(); t.destroy();
      }
    };
  }
};
