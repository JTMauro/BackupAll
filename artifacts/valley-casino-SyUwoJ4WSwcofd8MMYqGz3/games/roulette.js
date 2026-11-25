// Valley Casino — Roulette. American (0/00) or European (single 0, optional La Partage) wheel,
// full inside/outside layout with split/corner/street/line hit zones on the lines, canvas wheel with a real ball.
import * as K from './_kit.js';

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
// Real pocket order, clockwise. 37 stands for "00".
const WHEELS = {
  eu: [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26],
  us: [0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, 37, 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2]
};
const lab = n => n === 37 ? '00' : String(n);
const colOf = n => (n === 0 || n === 37) ? 'g' : RED.has(n) ? 'r' : 'b';
const COLNAME = { g: 'Green', r: 'Red', b: 'Black' };
const PAY = { straight: 35, split: 17, street: 11, trio: 11, corner: 8, four: 8, basket: 6, line: 5, dozen: 2, column: 2, even: 1 };
const TNAME = { straight: 'Straight', split: 'Split', street: 'Street', trio: 'Trio', corner: 'Corner', four: 'First Four', basket: 'Top Line', line: 'Six Line' };
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// Logical board coordinates: a = along the table (0..12 numbers, -1..0 zero, 12..13 columns),
// b = across (0..3 numbers with b=0 the 1-4-7 row, -1..0 dozens, -2..-1 even-money).
function buildDefs(us) {
  const defs = [];
  const add = (type, nums, rect, anchor, extra = {}) => {
    nums = nums.slice().sort((x, y) => x - y);
    const key = extra.key || type + ':' + nums.join('-');
    const name = extra.name || (TNAME[type] + ' ' + nums.map(lab).join(type === 'split' ? '/' : '-'));
    defs.push({ key, type, nums, pay: PAY[type], rect, anchor: anchor || [(rect[0] + rect[1]) / 2, (rect[2] + rect[3]) / 2], ...extra, name });
  };
  if (us) { add('straight', [0], [-1, 0, 0, 1.5], null, { cell: 'num', n: 0, name: 'Straight 0' }); add('straight', [37], [-1, 0, 1.5, 3], null, { cell: 'num', n: 37, name: 'Straight 00' }); }
  else add('straight', [0], [-1, 0, 0, 3], null, { cell: 'num', n: 0, name: 'Straight 0' });
  for (let n = 1; n <= 36; n++) { const a = Math.floor((n - 1) / 3), b = (n - 1) % 3; add('straight', [n], [a, a + 1, b, b + 1], null, { cell: 'num', n, name: 'Straight ' + n }); }
  for (let b = 0; b < 3; b++) add('column', range(1, 36).filter(n => (n - 1) % 3 === b), [12, 13, b, b + 1], null, { cell: 'out', text: '2 to 1', key: 'col' + (b + 1), name: ['1st', '2nd', '3rd'][b] + ' Column' });
  for (let d = 0; d < 3; d++) add('dozen', range(12 * d + 1, 12 * d + 12), [4 * d, 4 * d + 4, -1, 0], null, { cell: 'out', text: ['1st 12', '2nd 12', '3rd 12'][d], key: 'doz' + (d + 1), name: ['1st', '2nd', '3rd'][d] + ' Dozen' });
  [['1–18', n => n <= 18, 'low', '1–18'], ['EVEN', n => n % 2 === 0, 'even', 'Even'], ['', n => RED.has(n), 'red', 'Red'],
   ['', n => !RED.has(n), 'black', 'Black'], ['ODD', n => n % 2 === 1, 'odd', 'Odd'], ['19–36', n => n >= 19, 'high', '19–36']]
    .forEach(([text, f, key, name], i) => add('even', range(1, 36).filter(f), [2 * i, 2 * i + 2, -2, -1], null, { cell: 'out', text, key, name, dia: key === 'red' || key === 'black' ? key : '' }));
  const E = 0.2, z = { zone: 1 };
  for (let a = 0; a <= 10; a++) for (let b = 0; b <= 2; b++) { const n = 3 * a + b + 1; add('split', [n, n + 3], [a + 1 - E, a + 1 + E, b + E, b + 1 - E], [a + 1, b + .5], z); }
  for (let a = 0; a <= 11; a++) for (let b = 0; b <= 1; b++) { const n = 3 * a + b + 1; add('split', [n, n + 1], [a + E, a + 1 - E, b + 1 - E, b + 1 + E], [a + .5, b + 1], z); }
  for (let a = 0; a <= 10; a++) for (let b = 0; b <= 1; b++) { const n = 3 * a + b + 1; add('corner', [n, n + 1, n + 3, n + 4], [a + 1 - E, a + 1 + E, b + 1 - E, b + 1 + E], [a + 1, b + 1], z); }
  for (let a = 0; a <= 11; a++) add('street', [3 * a + 1, 3 * a + 2, 3 * a + 3], [a + E, a + 1 - E, -E, E], [a + .5, 0], z);
  for (let a = 0; a <= 10; a++) add('line', range(3 * a + 1, 3 * a + 6), [a + 1 - E, a + 1 + E, -E, E], [a + 1, 0], z);
  if (!us) {
    for (let b = 0; b <= 2; b++) add('split', [0, b + 1], [-E, E, b + E, b + 1 - E], [0, b + .5], z);
    add('trio', [0, 1, 2], [-E, E, 1 - E, 1 + E], [0, 1], z);
    add('trio', [0, 2, 3], [-E, E, 2 - E, 2 + E], [0, 2], z);
    add('four', [0, 1, 2, 3], [-E, E, -E, E], [0, 0], z);
  } else {
    const h = .09;
    add('split', [0, 1], [-E, E, E, 1 - E], [0, .5], z);
    add('split', [0, 2], [-E, E, 1 + E, 1.5 - h], [0, 1.27], z);
    add('split', [37, 2], [-E, E, 1.5 + h, 2 - E], [0, 1.73], z);
    add('split', [37, 3], [-E, E, 2 + E, 3 - E], [0, 2.5], z);
    add('trio', [0, 1, 2], [-E, E, 1 - E, 1 + E], [0, 1], z);
    add('trio', [0, 37, 2], [-E, E, 1.5 - h, 1.5 + h], [0, 1.5], z);
    add('trio', [37, 2, 3], [-E, E, 2 - E, 2 + E], [0, 2], z);
    add('split', [0, 37], [-1 + E, -E, 1.5 - E, 1.5 + E], [-.5, 1.5], z);
    add('basket', [0, 1, 2, 3, 37], [-E, E, -E, E], [0, 0], z);
  }
  return defs;
}

const RULES = `
<h3>Roulette</h3>
<p>Pick a chip and tap the layout to bet. Tap a <b>number</b> for a straight-up bet, the <b>line between two numbers</b> for a split,
the <b>crossing of four numbers</b> for a corner, the <b>outer edge of a row</b> (next to the dozens) for a street, and the crossing on that edge
for a six line. On the zero: lines between 0 and 1/2/3 are splits, their corners are trios${''}, and the corner at 0/1 is the
<b>First Four</b> (European) or <b>Top Line</b> 0-00-1-2-3 (American). Then press <b>Spin</b> (or <kbd>Space</kbd>).</p>
<p>Right-click a bet to take it back. <b>Undo</b> removes the last chip, <b>Clear</b> refunds everything, <b>Rebet</b> repeats your last bets, <b>Double</b> doubles everything on the layout.</p>
<table>
<tr><th>Bet</th><th>Numbers</th><th>Pays</th></tr>
<tr><td>Straight up</td><td>1</td><td>35 to 1</td></tr>
<tr><td>Split</td><td>2</td><td>17 to 1</td></tr>
<tr><td>Street / Trio</td><td>3</td><td>11 to 1</td></tr>
<tr><td>Corner / First Four (0-1-2-3)</td><td>4</td><td>8 to 1</td></tr>
<tr><td>Top Line 0-00-1-2-3 (American)</td><td>5</td><td>6 to 1</td></tr>
<tr><td>Six Line</td><td>6</td><td>5 to 1</td></tr>
<tr><td>Dozen / Column</td><td>12</td><td>2 to 1</td></tr>
<tr><td>Red / Black, Odd / Even, 1–18 / 19–36</td><td>18</td><td>1 to 1</td></tr>
</table>
<p>0 and 00 lose every outside bet. <b>House edge:</b> American 5.26% (Top Line 7.89%), European 2.70%.
With <b>La Partage</b> (European only) half of every even-money bet is returned when the ball lands on 0 (rounded down to whole dollars), cutting the edge on those bets to 1.35%.</p>
<p>The wheel uses the real pocket order: European 0-32-15-19-4-21-2-25-17-34-6-27-13-36-11-30-8-23-10-5-24-16-33-1-20-14-31-9-22-18-29-7-28-12-35-3-26;
American 0-28-9-26-30-11-7-20-32-17-5-22-34-15-3-24-36-13-1-00-27-10-25-29-12-8-19-31-18-6-21-33-16-4-23-35-14-2. Results come from a cryptographic RNG.</p>`;

const CSS = `
.vc-screen .vc-rules[hidden]{display:none}
.rl-root{position:absolute;inset:0;display:flex;gap:14px;padding:10px 14px;box-sizing:border-box}
.rl-root.docked{flex-direction:row;align-items:stretch}
.rl-root.ovl{flex-direction:column;gap:8px;padding:8px 12px}
.rl-side{flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}
.rl-root.ovl .rl-side{display:none}
.rl-main{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;gap:8px}
.rl-bar{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;justify-content:space-between;min-height:34px}
.rl-opts{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.rl-seg{display:flex;border:1px solid var(--gold2);border-radius:8px;overflow:hidden;background:rgba(0,0,0,.4)}
.rl-seg button{font:600 12px "Chakra Petch",sans-serif;color:var(--dim);background:none;border:0;padding:7px 10px;cursor:pointer;min-height:34px}
.rl-seg button.on{background:linear-gradient(#f3d27e,#c99a34);color:#1d1404}
.rl-lp{display:flex;align-items:center;gap:6px;font:600 12px "Chakra Petch",sans-serif;color:var(--dim);cursor:pointer;padding:4px 8px;border:1px solid rgba(232,196,106,.3);border-radius:8px;background:rgba(0,0,0,.3);min-height:34px;box-sizing:border-box}
.rl-lp input{accent-color:#e8c46a;width:16px;height:16px;margin:0}
.rl-lp[hidden]{display:none}
.rl-hist{display:flex;gap:4px;align-items:center;overflow:hidden;max-width:100%;flex-wrap:nowrap}
.rl-h{flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font:700 11px "Chakra Petch",sans-serif;color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.35),0 1px 2px #000}
.rl-h.r{background:#b5121b}.rl-h.b{background:#151515}.rl-h.g{background:#0d8a3c}
.rl-h:first-child{width:32px;height:32px;font-size:14px;box-shadow:0 0 0 2px #ffe08a,0 0 10px rgba(255,224,138,.6)}
.rl-info{display:grid;gap:8px;justify-items:center;width:100%}
.rl-hc{display:flex;gap:14px;font:600 11px "Chakra Petch",sans-serif;color:var(--dim);letter-spacing:.06em}
.rl-hc div{display:flex;gap:4px;align-items:center}
.rl-hc .rl-h{width:22px;height:22px;font-size:10px}.rl-hc .rl-h:first-child{width:22px;height:22px;font-size:10px;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.35)}
.rl-mq{flex:none;width:132px;display:flex;flex-direction:column;gap:6px;padding:8px 8px 10px;box-sizing:border-box;border-radius:10px;background:linear-gradient(#0b0b10,#040406);
  box-shadow:0 0 0 2px #a8842c,0 0 0 4px #2a2116,0 12px 26px rgba(0,0,0,.6),inset 0 0 18px rgba(0,0,0,.9);font-family:"Press Start 2P",monospace;color:#ffe08a;overflow:hidden;min-height:0}
.rl-root.ovl .rl-mq.dock{display:none}
.rl-mq-h{text-align:center;font-size:7px;letter-spacing:.12em;color:#e8c46a;padding-bottom:5px;border-bottom:1px solid rgba(232,196,106,.3)}
.rl-mq-h b{display:block;font-size:9px;color:#fff;margin-top:4px;font-weight:400}
.rl-mq-list{flex:1;min-height:0;display:flex;flex-direction:column;gap:2px;overflow:hidden}
.rl-mq-row{display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center;font-size:12px;line-height:1;min-height:16px;font-variant-numeric:tabular-nums}
.rl-mq-row span{text-align:center}
.rl-mq-row .b{grid-column:1;color:#e8e8e8;text-shadow:0 0 6px rgba(255,255,255,.55)}
.rl-mq-row .g{grid-column:2;color:#3dff7a;text-shadow:0 0 6px #1aff5a}
.rl-mq-row .r{grid-column:3;color:#ff3b3b;text-shadow:0 0 6px #ff1a1a}
.rl-mq-row:first-child{font-size:18px;min-height:24px;padding:2px 0 4px;border-bottom:1px dashed rgba(232,196,106,.25);margin-bottom:2px}
.rl-mq-row:first-child span{animation:rlmq 1s steps(2) 4}
@keyframes rlmq{50%{opacity:.25}}
.rl-mq-empty{font-size:7px;color:var(--dim);text-align:center;line-height:1.8;padding-top:10px}
.rl-mq-st{display:grid;gap:5px;font-size:6.5px;letter-spacing:.04em;color:#cbbf9f;border-top:1px solid rgba(232,196,106,.3);padding-top:6px}
.rl-mq-bar{display:flex;height:9px;border-radius:2px;overflow:hidden;background:#1a1a1a}
.rl-mq-bar i{display:block;height:100%}
.rl-mq-lab{display:flex;justify-content:space-between;margin-top:2px}
.rl-mq-hc{display:grid;gap:4px}.rl-mq-hc div{display:flex;align-items:center;gap:3px}
.rl-mq-hc em{font-style:normal;width:30px}
.rl-mq-hc span{flex:1;text-align:center;font-size:8px;padding:2px 0;border-radius:2px;background:#16161c}
.rl-mq-hc .r{color:#ff5050}.rl-mq-hc .b{color:#f0f0f0}.rl-mq-hc .g{color:#3dff7a}
.rl-mqb{font:600 12px "Chakra Petch",sans-serif;color:#ffe08a;background:rgba(0,0,0,.45);border:1px solid var(--gold2);border-radius:8px;padding:6px 10px;min-height:34px;cursor:pointer}
.rl-root.docked .rl-mqb{display:none}
.rl-mqov{position:absolute;inset:0;z-index:30;display:grid;place-items:center;background:rgba(0,0,0,.6)}
.rl-mqov[hidden]{display:none}
.rl-mqov .rl-mq{width:min(220px,80vw);height:min(560px,92%)}
.rl-mqov .rl-mq-row{font-size:15px;min-height:20px}.rl-mqov .rl-mq-row:first-child{font-size:22px}
.rl-mqov .rl-mq-st{font-size:8px}
.rl-wheel{display:block;border-radius:50%;filter:drop-shadow(0 14px 22px rgba(0,0,0,.6))}
.rl-boardwrap{flex:1;min-height:0;position:relative}
.rl-board{position:absolute;border-radius:6px;box-shadow:0 0 0 3px rgba(232,196,106,.55),0 10px 30px rgba(0,0,0,.5);background:rgba(0,0,0,.08);font-family:"Chakra Petch",sans-serif}
.rl-root.busy .rl-board{pointer-events:none}
.rl-cell{position:absolute;box-sizing:border-box;display:grid;place-items:center;color:#fff;cursor:pointer;outline:1px solid rgba(255,255,255,.8);outline-offset:-.5px;transition:filter .15s,box-shadow .15s}
.rl-cell.num{font-family:"Bungee",Impact,sans-serif;font-size:1.2em;text-shadow:0 1px 2px #000}
.rl-cell.r{background:linear-gradient(160deg,#d42232,#8e0f1a)}.rl-cell.b{background:linear-gradient(160deg,#2e2e2e,#0a0a0a)}.rl-cell.g{background:linear-gradient(160deg,#18a556,#0a6b35)}
.rl-cell.out{font-weight:700;font-size:.95em;letter-spacing:.05em;background:rgba(255,255,255,.02);text-shadow:0 1px 1px #000;white-space:nowrap}
.rl-cell:hover,.rl-cell.hl{filter:brightness(1.35);box-shadow:inset 0 0 0 2px #ffe08a}
.rl-cell.out:hover,.rl-cell.out.hl{background:rgba(255,224,138,.18)}
.rl-cell.won{animation:rlwon 1s ease-in-out 3;box-shadow:inset 0 0 0 3px #ffe08a,0 0 18px #ffd04a;z-index:2}
@keyframes rlwon{50%{filter:brightness(1.8)}}
.rl-dia{width:1.6em;height:1.6em;transform:scaleX(.62) rotate(45deg);border-radius:2px;box-shadow:0 0 0 1.5px rgba(255,255,255,.8)}
.rl-dia.red{background:#c41a28}.rl-dia.black{background:#111}
.rl-zone{position:absolute;z-index:3;cursor:pointer;border-radius:40%}
.rl-zone:hover{background:radial-gradient(circle,rgba(255,224,138,.85) 0 22%,transparent 26%)}
.rl-deco{position:absolute;display:grid;place-items:center;color:rgba(232,196,106,.6);font:400 .8em "Bungee",Impact,sans-serif;text-align:center;line-height:1.1;pointer-events:none}
.rl-chips{position:absolute;inset:0;pointer-events:none;z-index:4}
.rl-chip{position:absolute;width:0;height:0}
.rl-chip .vc-stack{transform:translate(-50%,50%) scale(var(--cs,1));transition:opacity .4s,filter .4s}
.rl-chip .vc-stack b{font-size:12px}
.rl-chip.lost .vc-stack{opacity:.25;filter:grayscale(1)}
.rl-chip.win .vc-stack .vc-chip{box-shadow:0 0 0 2px #7dff9a,0 0 12px #7dff9a}
.rl-dolly{position:absolute;z-index:5;width:0;height:0;pointer-events:none}
.rl-dolly i{position:absolute;left:-12px;top:-30px;width:24px;height:30px;border-radius:12px 12px 6px 6px;background:radial-gradient(circle at 40% 30%,#fff,#e8dcc0 45%,#a8842c);box-shadow:0 6px 8px rgba(0,0,0,.6),inset 0 -6px 0 #c9a24a;animation:rldrop .45s cubic-bezier(.3,1.6,.5,1)}
.rl-dolly i::after{content:"";position:absolute;left:50%;top:-6px;width:10px;height:10px;margin-left:-5px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#fff,#e8c46a)}
@keyframes rldrop{from{transform:translateY(-40px);opacity:0}}
.rl-ov{position:absolute;inset:0;z-index:9;display:grid;place-items:center;background:rgba(0,0,0,.62);transition:opacity .35s}
.rl-ov.hide{opacity:0;pointer-events:none}
.rl-ovres{position:absolute;left:0;right:0;bottom:6%;text-align:center;font:400 22px "Bungee",Impact,sans-serif;color:#ffe08a;text-shadow:0 2px 0 #000}
`;
let styled = false;
function injectCSS() { if (styled) return; styled = true; const s = document.createElement('style'); s.id = 'rl-style'; s.textContent = CSS; document.head.appendChild(s); }

// ---------------------------------------------------------------- wheel (canvas)
const FILL = { r: '#b5121b', b: '#161616', g: '#0d8a3c' }, POCKET = { r: '#6e0a10', b: '#060606', g: '#06562a' };
function wedge(g, r0, r1, a0, a1) { g.beginPath(); g.arc(0, 0, r1, a0, a1); g.arc(0, 0, r0, a1, a0, true); g.closePath(); }
function ring(g, r, w, style) { g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.lineWidth = w; g.strokeStyle = style; g.stroke(); }
function mkCanvas(S, dpr) { const c = document.createElement('canvas'); c.width = c.height = Math.round(S * dpr); const g = c.getContext('2d'); g.scale(dpr, dpr); g.translate(S / 2, S / 2); return [c, g]; }
function drawBowl(S, dpr) {
  const [c, g] = mkCanvas(S, dpr), R = S / 2;
  let gr = g.createRadialGradient(0, 0, R * .7, 0, 0, R);
  gr.addColorStop(0, '#6b3818'); gr.addColorStop(.7, '#4a240e'); gr.addColorStop(1, '#1e0c04');
  g.beginPath(); g.arc(0, 0, R * .995, 0, Math.PI * 2); g.fillStyle = gr; g.fill();
  ring(g, R * .962, R * .012, '#c9a24a');
  gr = g.createRadialGradient(0, 0, R * .77, 0, 0, R * .95);
  gr.addColorStop(0, '#8a6c40'); gr.addColorStop(.35, '#d9c59a'); gr.addColorStop(.75, '#f0e3c2'); gr.addColorStop(1, '#b09062');
  wedge(g, R * .772, R * .948, 0, Math.PI * 2); g.fillStyle = gr; g.fill();
  ring(g, R * .948, R * .01, '#3a1d0b');
  // deflectors (canoes)
  for (let i = 0; i < 8; i++) {
    g.save(); g.rotate(i * Math.PI / 4 + Math.PI / 8); g.translate(R * .83, 0); if (i % 2) g.rotate(Math.PI / 2);
    g.beginPath(); g.moveTo(-R * .028, 0); g.lineTo(0, -R * .011); g.lineTo(R * .028, 0); g.lineTo(0, R * .011); g.closePath();
    const dg = g.createLinearGradient(0, -R * .011, 0, R * .011); dg.addColorStop(0, '#fff6d0'); dg.addColorStop(1, '#a8842c');
    g.fillStyle = dg; g.fill(); g.restore();
  }
  ring(g, R * .772, R * .02, 'rgba(0,0,0,.55)');
  return c;
}
function drawRotor(order, S, dpr) {
  const [c, g] = mkCanvas(S, dpr), R = S / 2, N = order.length, st = Math.PI * 2 / N;
  for (let k = 0; k < N; k++) {
    const a = -Math.PI / 2 + k * st, cc = colOf(order[k]);
    wedge(g, R * .62, R * .765, a - st / 2, a + st / 2); g.fillStyle = FILL[cc]; g.fill();
    wedge(g, R * .47, R * .62, a - st / 2, a + st / 2);
    const pg = g.createRadialGradient(0, 0, R * .47, 0, 0, R * .62); pg.addColorStop(0, POCKET[cc]); pg.addColorStop(1, FILL[cc]);
    g.fillStyle = pg; g.fill();
  }
  g.strokeStyle = '#e9d9a8'; g.lineWidth = Math.max(1, R * .007);
  for (let k = 0; k < N; k++) {
    const a = -Math.PI / 2 + (k - .5) * st;
    g.beginPath(); g.moveTo(Math.cos(a) * R * .47, Math.sin(a) * R * .47); g.lineTo(Math.cos(a) * R * .765, Math.sin(a) * R * .765); g.stroke();
  }
  ring(g, R * .762, R * .012, '#d8b960'); ring(g, R * .62, R * .008, '#d8b960'); ring(g, R * .47, R * .014, '#cfd3d8');
  g.fillStyle = '#fff'; g.font = `700 ${Math.round(R * .074)}px "Chakra Petch", system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let k = 0; k < N; k++) { g.save(); g.rotate(-Math.PI / 2 + k * st + Math.PI / 2); g.fillText(lab(order[k]), 0, -R * .692); g.restore(); }
  // cone
  let gr = g.createRadialGradient(-R * .1, -R * .1, R * .02, 0, 0, R * .47);
  gr.addColorStop(0, '#a8682e'); gr.addColorStop(.6, '#6b3a17'); gr.addColorStop(1, '#3a1d0a');
  g.beginPath(); g.arc(0, 0, R * .463, 0, Math.PI * 2); g.fillStyle = gr; g.fill();
  ring(g, R * .3, R * .006, 'rgba(232,196,106,.6)'); ring(g, R * .16, R * .02, '#c9a24a');
  for (let i = 0; i < 4; i++) {
    g.save(); g.rotate(i * Math.PI / 2 + Math.PI / 4);
    const tg = g.createLinearGradient(0, -R * .03, 0, R * .03); tg.addColorStop(0, '#fff3c4'); tg.addColorStop(.5, '#d8b25a'); tg.addColorStop(1, '#7a5a18');
    g.fillStyle = tg; g.fillRect(0, -R * .022, R * .34, R * .044);
    g.beginPath(); g.arc(R * .36, 0, R * .04, 0, Math.PI * 2); g.fill(); g.restore();
  }
  gr = g.createRadialGradient(-R * .03, -R * .03, R * .01, 0, 0, R * .1); gr.addColorStop(0, '#fffbe6'); gr.addColorStop(.5, '#e8c46a'); gr.addColorStop(1, '#8a6418');
  g.beginPath(); g.arc(0, 0, R * .09, 0, Math.PI * 2); g.fillStyle = gr; g.fill();
  return c;
}

function makeWheel(canvas) {
  const ctx = canvas.getContext('2d');
  const W = { order: WHEELS.eu, size: 0, dpr: 1, rotor: Math.random() * 6.283, speed: .35, ball: null, anim: null, win: -1, glow: 0, trail: [] };
  let bowl = null, rotorImg = null;
  const build = () => { if (!W.size) return; bowl = drawBowl(W.size, W.dpr); rotorImg = drawRotor(W.order, W.size, W.dpr); };
  W.rebuild = build;
  W.setType = t => { W.order = WHEELS[t]; W.ball = null; W.win = -1; W.trail = []; build(); };
  W.resize = px => {
    px = Math.max(140, Math.round(px)); if (px === W.size) return;
    W.size = px; W.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = canvas.height = Math.round(px * W.dpr); canvas.style.width = canvas.style.height = px + 'px'; build();
  };
  W.spin = (k, T) => new Promise(res => {
    W.anim = { t: 0, T, k, D: Math.PI * 2 * (6 + Math.random() * 1.5), res, bi: -1, di: null };
    W.win = -1; W.speed = 1.8; W.trail = []; K.sfx.ball();
  });
  const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const TRACK = .862, POCK = .548;
  W.step = dt => {
    W.speed += (.3 - W.speed) * (1 - Math.exp(-dt / 3.2)); W.rotor += W.speed * dt;
    W.glow += dt;
    const A = W.anim; if (!A) return;
    A.t += dt; const u = Math.min(1, A.t / A.T), N = W.order.length, st = Math.PI * 2 / N;
    const alpha = -Math.PI / 2 + A.k * st;
    let psi = alpha + A.D * Math.pow(1 - u, 4), r;
    const ud = .6;
    if (u < ud) r = TRACK - .03 * smooth(.42, ud, u);
    else {
      const s = (u - ud) / (1 - ud);
      const fall = 1 - smooth(0, .22, s);
      let bounce = 0;
      if (s > .22 && s < .72) { const q = (s - .22) / .5; bounce = .2 * Math.abs(Math.sin(q * Math.PI * 3.5)) * (1 - q) * (1 - q); psi += .05 * Math.sin(q * 23) * (1 - q); }
      r = POCK + (TRACK - .03 - POCK) * Math.min(1, fall + bounce * .9);
      const bi = s > .22 ? Math.floor((s - .22) / .5 * 3.5) : -1;
      if (bi !== A.bi && bi >= 0 && bi < 4) { A.bi = bi; K.sfx.ball(); setTimeout(() => K.sfx.ball(), 40); }
    }
    const abs = W.rotor + psi;
    if (u > .25 && u < ud + .05) { const di = Math.floor(abs / (Math.PI / 4)); if (A.di !== null && di !== A.di && Math.random() < .6) K.sfx.ball(); A.di = di; }
    W.ball = { psi, r };
    if (u >= 1) { W.ball = { psi: alpha, r: POCK }; W.win = A.k; W.glow = 0; W.anim = null; W.trail = []; A.res(); }
  };
  W.draw = () => {
    if (!W.size || !bowl) return;
    const S = W.size, R = S / 2, d = W.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bowl, 0, 0);
    ctx.setTransform(d, 0, 0, d, R * d, R * d);
    ctx.save(); ctx.rotate(W.rotor); ctx.drawImage(rotorImg, -R, -R, S, S);
    if (W.win >= 0) {
      const st = Math.PI * 2 / W.order.length, a = -Math.PI / 2 + W.win * st, p = .55 + .45 * Math.sin(W.glow * 5);
      wedge(ctx, R * .47, R * .765, a - st / 2, a + st / 2);
      ctx.lineWidth = R * .014; ctx.strokeStyle = `rgba(255,224,138,${.6 + .4 * p})`; ctx.shadowColor = '#ffd04a'; ctx.shadowBlur = R * .06 * p; ctx.stroke(); ctx.shadowBlur = 0;
    }
    ctx.restore();
    if (W.ball) {
      const phi = W.rotor + W.ball.psi, rr = W.ball.r * R, br = R * .03;
      const x = Math.cos(phi) * rr, y = Math.sin(phi) * rr;
      W.trail.push([x, y]); if (W.trail.length > 5) W.trail.shift();
      if (W.anim) W.trail.forEach(([tx, ty], i) => { ctx.beginPath(); ctx.arc(tx, ty, br * .9, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${.05 + i * .05})`; ctx.fill(); });
      ctx.beginPath(); ctx.arc(x + br * .25, y + br * .35, br, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fill();
      const bg = ctx.createRadialGradient(x - br * .35, y - br * .4, br * .1, x, y, br);
      bg.addColorStop(0, '#fff'); bg.addColorStop(.6, '#ecebe6'); bg.addColorStop(1, '#9a9890');
      ctx.beginPath(); ctx.arc(x, y, br, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill();
    }
    // glass glare
    const gl = ctx.createLinearGradient(-R, -R, R * .2, R * .2); gl.addColorStop(0, 'rgba(255,255,255,.12)'); gl.addColorStop(.5, 'rgba(255,255,255,0)');
    ctx.beginPath(); ctx.arc(0, 0, R * .99, 0, Math.PI * 2); ctx.fillStyle = gl; ctx.fill();
  };
  return W;
}

// ---------------------------------------------------------------- game
export default {
  id: 'roulette', title: 'Roulette', kind: 'table',
  blurb: 'American or European wheel with the full layout — splits, corners, streets, dozens and La Partage.',
  mount(root, api) {
    injectCSS();
    const t = K.table(root, api, { title: 'Roulette', subtitle: 'Straight up pays 35 to 1', felt: 'green', rack: [1, 5, 25, 100, 500, 1000], rules: RULES });
    let dead = false; const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!dead) fn(); }, ms); timers.add(id); return id; };
    const fast = () => !!window.__fast;
    let type = 'eu', partage = true;
    try { const s = JSON.parse(localStorage.getItem('vc-roulette') || '{}'); if (s.type === 'us' || s.type === 'eu') type = s.type; if (typeof s.partage === 'boolean') partage = s.partage; } catch (e) { }
    const save = () => { try { localStorage.setItem('vc-roulette', JSON.stringify({ type, partage })); } catch (e) { } };

    const rootEl = document.createElement('div'); rootEl.className = 'rl-root';
    rootEl.innerHTML = `<div class="rl-mq dock" role="region" aria-label="Last numbers board"></div><div class="rl-side"><div class="rl-wslot"></div><div class="rl-info"><div class="rl-hslot"></div><div class="rl-hc"></div></div></div>
      <div class="rl-main"><div class="rl-bar"><div class="rl-opts"><div class="rl-seg" role="group" aria-label="Wheel type"><button type="button" data-t="eu">European 0</button><button type="button" data-t="us">American 00</button></div>
      <label class="rl-lp"><input type="checkbox"> La Partage</label><button type="button" class="rl-mqb">History board</button></div><div class="rl-hslot2"></div></div><div class="rl-boardwrap"><div class="rl-board"></div></div></div>
      <div class="rl-mqov" hidden><div class="rl-mq" role="dialog" aria-label="Last numbers board"></div></div><div class="rl-ov hide"><div class="rl-ovslot"></div><div class="rl-ovres"></div></div>`;
    t.felt.appendChild(rootEl);
    const $ = s => rootEl.querySelector(s);
    const board = $('.rl-board'), wrap = $('.rl-boardwrap'), ov = $('.rl-ov'), ovRes = $('.rl-ovres');
    const canvas = document.createElement('canvas'); canvas.className = 'rl-wheel';
    const hist = document.createElement('div'); hist.className = 'rl-hist'; hist.setAttribute('aria-label', 'Recent results');
    const hc = $('.rl-hc'), lpBox = $('.rl-lp'), lpIn = $('.rl-lp input');
    const wheel = makeWheel(canvas); wheel.setType(type);
    const histKey = () => 'vc-roulette-hist-' + type;
    const loadHist = () => {
      let h = null; try { h = JSON.parse(localStorage.getItem(histKey()) || 'null'); } catch (e) { }
      if (!Array.isArray(h) || !h.length) { const n = type === 'us' ? 38 : 37; h = Array.from({ length: 16 }, () => K.rand(n)); } // earlier spins at this table
      return h.filter(x => Number.isInteger(x) && x >= 0 && x <= (type === 'us' ? 37 : 36)).slice(0, 200);
    };
    const saveHist = () => { try { localStorage.setItem(histKey(), JSON.stringify(history.slice(0, 200))); } catch (e) { } };
    const mqDock = $('.rl-mq.dock'), mqOv = $('.rl-mqov'), mqPop = $('.rl-mqov .rl-mq');
    $('.rl-mqb').addEventListener('click', () => { K.sfx.button(); mqOv.hidden = false; });
    mqOv.addEventListener('click', () => { mqOv.hidden = true; });

    let defs = [], defMap = new Map(), cellByNum = new Map(), chipEls = new Map(), orient = 'h', docked = true;
    let pending = null, bets = new Map(), actions = [], lastBets = null, history = loadHist(), spinning = false, showingResult = false, dollyEl = null, ovTimer = null;

    // --- board
    function buildBoard() {
      board.innerHTML = ''; chipEls.clear(); cellByNum.clear(); dollyEl = null;
      defs = buildDefs(type === 'us'); defMap = new Map(defs.map(d => [d.key, d]));
      for (const d of defs) {
        const el = document.createElement('div'); el.dataset.bet = d.key; d.el = el;
        if (d.cell === 'num') { el.className = 'rl-cell num ' + colOf(d.n); el.textContent = lab(d.n); cellByNum.set(d.n, el); el.setAttribute('aria-label', 'Straight ' + lab(d.n)); }
        else if (d.cell === 'out') { el.className = 'rl-cell out'; if (d.dia) el.innerHTML = `<span class="rl-dia ${d.dia}"></span>`; else el.textContent = d.text; el.setAttribute('aria-label', d.name); }
        else { el.className = 'rl-zone'; el.title = d.name + ' · ' + d.pay + ' to 1'; el.setAttribute('aria-label', d.name); }
        el.setAttribute('role', 'button');
        board.appendChild(el);
      }
      const deco = document.createElement('div'); deco.className = 'rl-deco'; deco.dataset.rect = '-1,0,-2,0'; deco.innerHTML = type === 'us' ? 'DOUBLE<br>ZERO' : 'SINGLE<br>ZERO'; board.appendChild(deco);
      const deco2 = document.createElement('div'); deco2.className = 'rl-deco'; deco2.dataset.rect = '12,13,-2,0'; deco2.innerHTML = 'VALLEY<br>♛'; board.appendChild(deco2);
      const chips = document.createElement('div'); chips.className = 'rl-chips'; board.appendChild(chips);
      board._chips = chips;
      layoutBoard();
    }
    let geo = null;
    function layoutBoard() {
      const ww = wrap.clientWidth, wh = wrap.clientHeight; if (!ww || !wh) return;
      const h = orient === 'h'; let Ua, Ub;
      if (h) { Ua = ww / 14; Ub = wh / 5; Ub = Math.min(Ub, Ua * 1.25); Ua = Math.min(Ua, Ub * 1.7); }
      else { Ub = ww / 5; Ua = wh / 14; Ub = Math.min(Ub, Ua * 2.1); Ua = Math.min(Ua, Ub * 1.2); }
      const bw = h ? 14 * Ua : 5 * Ub, bh = h ? 5 * Ub : 14 * Ua;
      Object.assign(board.style, { width: bw + 'px', height: bh + 'px', left: (ww - bw) / 2 + 'px', top: Math.max(0, (wh - bh) / 2) + 'px', fontSize: Math.min(Ua, Ub) * .3 + 'px' });
      board.style.setProperty('--cs', Math.max(.5, Math.min(1, Math.min(Ua, Ub) / 54)).toFixed(3));
      const R = ([a0, a1, b0, b1]) => h ? [(a0 + 1) * Ua, (3 - b1) * Ub, (a1 - a0) * Ua, (b1 - b0) * Ub] : [(b0 + 2) * Ub, (a0 + 1) * Ua, (b1 - b0) * Ub, (a1 - a0) * Ua];
      geo = { P: ([a, b]) => h ? [(a + 1) * Ua, (3 - b) * Ub] : [(b + 2) * Ub, (a + 1) * Ua] };
      const place = (el, r) => { const [l, tp, w, ht] = R(r); Object.assign(el.style, { left: l + 'px', top: tp + 'px', width: w + 'px', height: ht + 'px' }); };
      for (const d of defs) { place(d.el, d.rect); if (d.cell === 'out' && !h && d.type === 'dozen') d.el.style.writingMode = 'vertical-rl'; else d.el.style.writingMode = ''; }
      board.querySelectorAll('.rl-deco').forEach(el => place(el, el.dataset.rect.split(',').map(Number)));
      for (const [key, c] of chipEls) posChip(c.el, defMap.get(key));
      if (dollyEl) posChip(dollyEl, dollyEl._def);
    }
    function posChip(el, d) { const [x, y] = geo.P(d.anchor); el.style.left = x + 'px'; el.style.top = y + 'px'; }
    function setChip(key, amt) {
      let c = chipEls.get(key);
      if (!amt) { if (c) { c.el.remove(); chipEls.delete(key); } return; }
      if (!c) { const el = document.createElement('div'); el.className = 'rl-chip'; const st = K.chipStack(0); el.appendChild(st.el); board._chips.appendChild(el); c = { el, st }; chipEls.set(key, c); posChip(el, defMap.get(key)); }
      c.st.set(amt);
    }
    function clearResultView() {
      if (!showingResult) return; showingResult = false;
      for (const key of [...chipEls.keys()]) if (!bets.has(key)) setChip(key, 0);
      chipEls.forEach(c => c.el.classList.remove('lost', 'win'));
      board.querySelectorAll('.won').forEach(e => e.classList.remove('won'));
    }
    const total = m => { let s = 0; for (const v of m.values()) s += v; return s; };

    // --- highlight covered numbers on hover
    let hl = [];
    const unhl = () => { hl.forEach(e => e.classList.remove('hl')); hl = []; };
    board.addEventListener('pointerover', e => {
      const el = e.target.closest('[data-bet]'); unhl(); if (!el || e.pointerType === 'touch') return;
      const d = defMap.get(el.dataset.bet); if (!d) return;
      hl = d.nums.map(n => cellByNum.get(n)).filter(Boolean); if (d.cell === 'out') hl.push(d.el); hl.forEach(x => x.classList.add('hl'));
    });
    board.addEventListener('pointerleave', unhl);

    // --- betting
    function place(key) {
      if (spinning) return;
      const v = t.rack.value;
      clearResultView();
      if (!api.bet(v)) { t.msg(`Not enough chips for a ${K.fmt(v)} chip.`, 'lose'); return; }
      bets.set(key, (bets.get(key) || 0) + v); actions.push([[key, v]]); setChip(key, bets.get(key)); K.sfx.chip();
      const d = defMap.get(key);
      t.msg(`${d.name} — ${K.fmt(bets.get(key))} (pays ${d.pay} to 1) · Total bet ${K.fmt(total(bets))}`);
      sync();
    }
    function removeBet(key) {
      if (spinning || !bets.has(key)) return;
      const amt = bets.get(key); bets.delete(key); api.win(amt); setChip(key, 0);
      actions = actions.map(g => g.filter(([k]) => k !== key)).filter(g => g.length);
      K.sfx.chips(2); t.msg(`Took back ${K.fmt(amt)} from ${defMap.get(key).name}.`); sync();
    }
    board.addEventListener('click', e => { const el = e.target.closest('[data-bet]'); if (el) place(el.dataset.bet); });
    board.addEventListener('contextmenu', e => { const el = e.target.closest('[data-bet]'); e.preventDefault(); if (el) removeBet(el.dataset.bet); });

    function addGroup(map, what) {
      const sum = total(map); if (!sum) return;
      clearResultView();
      if (!api.bet(sum)) { t.msg(`Not enough chips to ${what} (${K.fmt(sum)} needed).`, 'lose'); return; }
      const g = [];
      for (const [k, v] of map) { if (!defMap.has(k)) continue; bets.set(k, (bets.get(k) || 0) + v); g.push([k, v]); setChip(k, bets.get(k)); }
      actions.push(g); K.sfx.chips(5); t.msg(`${what === 'double' ? 'Doubled' : 'Rebet'} — total bet ${K.fmt(total(bets))}.`); sync();
    }
    const undo = () => {
      const g = actions.pop(); if (!g) return; let back = 0;
      for (const [k, v] of g) { const left = (bets.get(k) || 0) - v; if (left > 0) bets.set(k, left); else bets.delete(k); setChip(k, left > 0 ? left : 0); back += v; }
      api.win(back); K.sfx.chip(); t.msg(`Undo — ${K.fmt(back)} returned.`); sync();
    };
    const clear = () => {
      const sum = total(bets); if (!sum) return;
      for (const k of bets.keys()) setChip(k, 0);
      bets.clear(); actions = []; api.win(sum); K.sfx.chips(4); t.msg(`Bets cleared — ${K.fmt(sum)} returned.`); sync();
    };

    // --- controls
    const bClear = K.button('Clear<kbd>C</kbd>', clear), bUndo = K.button('Undo<kbd>Z</kbd>', undo);
    const bRebet = K.button('Rebet<kbd>R</kbd>', () => lastBets && addGroup(lastBets, 'rebet'));
    const bDouble = K.button('Double<kbd>D</kbd>', () => addGroup(new Map(bets), 'double'));
    const bSpin = K.button('Spin<kbd>Space</kbd>', () => spin(), { primary: true });
    [bClear, bUndo, bRebet, bDouble, bSpin].forEach(b => t.controls.appendChild(b));
    t.bindKey('c', bClear); t.bindKey('z', bUndo); t.bindKey('r', bRebet); t.bindKey('d', bDouble); t.bindKey(' ', bSpin);
    function sync() {
      const has = bets.size > 0;
      bClear.disabled = bUndo.disabled = !has || spinning; bDouble.disabled = !has || spinning;
      bUndo.disabled = !actions.length || spinning;
      bRebet.disabled = spinning || !lastBets || !lastBets.size;
      bSpin.disabled = spinning;
      rootEl.classList.toggle('busy', spinning);
      rootEl.querySelectorAll('.rl-seg button').forEach(b => { b.classList.toggle('on', b.dataset.t === type); b.disabled = spinning; });
      lpBox.hidden = type !== 'eu'; lpIn.checked = partage; lpIn.disabled = spinning;
    }

    // --- wheel type
    rootEl.querySelector('.rl-seg').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || spinning || b.dataset.t === type) return;
      K.sfx.button();
      const sum = total(bets); if (sum) { api.win(sum); bets.clear(); actions = []; }
      type = b.dataset.t; save(); lastBets = null; history = loadHist(); showingResult = false;
      wheel.setType(type); buildBoard(); renderHist(); sync();
      t.msg(`${type === 'us' ? 'American double-zero' : 'European single-zero'} wheel.${sum ? ' Bets returned (' + K.fmt(sum) + ').' : ''} Place your bets.`);
    });
    lpIn.addEventListener('change', () => { partage = lpIn.checked; save(); t.msg(partage ? 'La Partage on: half of even-money bets come back on 0.' : 'La Partage off.'); });

    // --- history
    function renderBoard() {
      const rows = history.slice(0, 18).map(n => `<div class="rl-mq-row"><span class="${colOf(n)}">${lab(n)}</span></div>`).join('');
      const recent = history.slice(0, 100), N = recent.length;
      const pct = f => N ? Math.round(recent.filter(f).length / N * 100) : 0;
      const red = pct(n => colOf(n) === 'r'), blk = pct(n => colOf(n) === 'b'), zer = Math.max(0, 100 - red - blk);
      const num = n => n > 0 && n < 37;
      const odd = pct(n => num(n) && n % 2), even = pct(n => num(n) && !(n % 2));
      const lo = pct(n => num(n) && n <= 18), hi = pct(n => num(n) && n > 18);
      const d1 = pct(n => num(n) && n <= 12), d2 = pct(n => n > 12 && n <= 24), d3 = pct(n => n > 24 && n < 37);
      const cnt = new Map(); recent.forEach(n => cnt.set(n, (cnt.get(n) || 0) + 1));
      const all = [...Array(37).keys()].concat(type === 'us' ? [37] : []);
      const since = n => { const i = history.indexOf(n); return i < 0 ? 1e9 : i; };
      const hot = all.filter(n => cnt.get(n)).sort((a, b) => cnt.get(b) - cnt.get(a) || since(a) - since(b)).slice(0, 4);
      const cold = all.slice().sort((a, b) => (cnt.get(a) || 0) - (cnt.get(b) || 0) || since(b) - since(a)).slice(0, 4);
      const cell = n => `<span class="${colOf(n)}">${lab(n)}</span>`;
      const bar = (parts, labs) => `<div><div class="rl-mq-bar">${parts.map(([v, c]) => `<i style="width:${v}%;background:${c}"></i>`).join('')}</div><div class="rl-mq-lab">${labs.map(l => `<span>${l}</span>`).join('')}</div></div>`;
      const html = `<div class="rl-mq-h">LAST NUMBERS<b>${type === 'us' ? 'DOUBLE ZERO' : 'SINGLE ZERO'}</b></div>
        <div class="rl-mq-list">${rows || '<div class="rl-mq-empty">NO SPINS YET</div>'}</div>
        <div class="rl-mq-st"><div style="text-align:center">LAST ${N} SPINS</div>
          ${bar([[red, '#d42232'], [zer, '#18a556'], [blk, '#e8e8e8']], [`R ${red}%`, `0 ${zer}%`, `B ${blk}%`])}
          ${bar([[odd, '#e8c46a'], [100 - odd - even, '#18a556'], [even, '#7ab6ff']], [`ODD ${odd}`, `EVEN ${even}`])}
          ${bar([[lo, '#e8c46a'], [100 - lo - hi, '#18a556'], [hi, '#7ab6ff']], [`1-18 ${lo}`, `19-36 ${hi}`])}
          ${bar([[d1, '#e8c46a'], [d2, '#c58aff'], [d3, '#7ab6ff'], [100 - d1 - d2 - d3, '#18a556']], [`1ST ${d1}`, `2ND ${d2}`, `3RD ${d3}`])}
          <div class="rl-mq-hc"><div><em>HOT</em>${hot.map(cell).join('')}</div><div><em>COLD</em>${cold.map(cell).join('')}</div></div>
        </div>`;
      mqDock.innerHTML = html; mqPop.innerHTML = html;
    }
    function renderHist() {
      renderBoard();
      hist.innerHTML = history.slice(0, docked ? 12 : 10).map(n => `<span class="rl-h ${colOf(n)}">${lab(n)}</span>`).join('');
      if (true) { hc.innerHTML = ''; return; }
      const recent = history.slice(0, 100), cnt = new Map();
      recent.forEach(n => cnt.set(n, (cnt.get(n) || 0) + 1));
      const all = [...Array(37).keys()].concat(type === 'us' ? [37] : []);
      const since = n => { const i = history.indexOf(n); return i < 0 ? 1e9 : i; };
      const hot = all.filter(n => cnt.get(n)).sort((a, b) => cnt.get(b) - cnt.get(a) || since(a) - since(b)).slice(0, 4);
      const cold = all.slice().sort((a, b) => (cnt.get(a) || 0) - (cnt.get(b) || 0) || since(b) - since(a)).slice(0, 4);
      const chip = n => `<span class="rl-h ${colOf(n)}">${lab(n)}</span>`;
      hc.innerHTML = `<div>HOT ${hot.map(chip).join('')}</div><div>COLD ${cold.map(chip).join('')}</div>`;
    }

    // --- layout
    function layout() {
      if (dead) return;
      const fw = t.felt.clientWidth, fh = t.felt.clientHeight;
      docked = fw >= 900 && fh >= 380;
      rootEl.classList.toggle('docked', docked); rootEl.classList.toggle('ovl', !docked);
      if (docked) {
        const side = Math.min(fh - 110, (fw - 146) * .36, 520);
        wheel.resize(side); $('.rl-wslot').appendChild(canvas); $('.rl-hslot').appendChild(hist); orient = 'h';
      } else {
        wheel.resize(Math.min(fw - 24, fh - 70, 560)); $('.rl-ovslot').appendChild(canvas); $('.rl-hslot2').appendChild(hist);
        const ww = Math.max(1, fw - 24), wh = Math.max(1, fh - 60); orient = ww > wh * 1.15 ? 'h' : 'v';
      }
      renderHist(); layoutBoard();
    }
    const ro = new ResizeObserver(() => layout()); ro.observe(t.felt);

    // --- animation loop
    let raf = 0, last = performance.now();
    const loop = now => { const dt = Math.min(.05, (now - last) / 1000); last = now; wheel.step(dt); if (docked || !ov.classList.contains('hide')) wheel.draw(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!dead) wheel.rebuild(); });

    // --- spin & settle
    async function spin() {
      if (spinning) return;
      clearResultView();
      spinning = true; sync(); unhl();
      if (dollyEl) { dollyEl.remove(); dollyEl = null; }
      const order = WHEELS[type];
      let n;
      const f = window.__force; window.__force = undefined;
      if (f !== undefined && f !== null) { n = f === '00' ? 37 : +f; if (!order.includes(n)) n = order[K.rand(order.length)]; }
      else n = order[K.rand(order.length)];
      const k = order.indexOf(n); pending = n;
      t.msg(bets.size ? 'No more bets! The ball is spinning…' : 'Spinning with no bets on the table…');
      if (!docked) { clearTimeout(ovTimer); ovRes.textContent = ''; ov.classList.remove('hide'); }
      await wheel.spin(k, fast() ? 1.2 : 7.5);
      if (dead) return;
      settle(n);
    }
    function payout(n) {
      let ret = 0;
      for (const [key, amt] of bets) { const d = defMap.get(key); if (d.nums.includes(n)) ret += amt * (d.pay + 1); else if (type === 'eu' && partage && n === 0 && d.type === 'even') ret += Math.floor(amt / 2); }
      return ret;
    }
    function settle(n) {
      pending = null;
      const c = colOf(n), zero = n === 0 || n === 37;
      let ret = 0, staked = total(bets), winners = [], half = 0;
      for (const [key, amt] of bets) {
        const d = defMap.get(key), ce = chipEls.get(key);
        if (d.nums.includes(n)) { const r = amt * (d.pay + 1); ret += r; winners.push(d.name); ce && ce.el.classList.add('win'); }
        else if (type === 'eu' && partage && n === 0 && d.type === 'even') { const h = Math.floor(amt / 2); ret += h; half += h; ce && ce.el.classList.add('lost'); }
        else ce && ce.el.classList.add('lost');
        if (d.cell === 'out' && d.nums.includes(n)) d.el.classList.add('won');
      }
      const cell = cellByNum.get(n); if (cell) cell.classList.add('won');
      // dolly
      const dd = defMap.get('straight:' + n);
      dollyEl = document.createElement('div'); dollyEl.className = 'rl-dolly'; dollyEl.innerHTML = '<i></i>'; dollyEl._def = dd; board.appendChild(dollyEl); posChip(dollyEl, dd);
      history.unshift(n); if (history.length > 200) history.pop(); saveHist(); renderHist();
      if (ret > 0) api.win(ret);
      const desc = zero ? `${lab(n)} Green` : `${n} ${COLNAME[c]} · ${n % 2 ? 'Odd' : 'Even'} · ${n <= 18 ? '1–18' : '19–36'}`;
      const net = ret - staked;
      let text;
      if (!staked) text = `${desc}.`;
      else if (winners.length) {
        const w = winners.length > 3 ? winners.slice(0, 3).join(', ') + ` +${winners.length - 3} more` : winners.join(', ');
        text = `${desc} — winner${winners.length > 1 ? 's' : ''}: ${w}. Paid ${K.fmt(ret)}${half ? ` (incl. ${K.fmt(half)} La Partage)` : ''} · ${net >= 0 ? 'net +' + K.fmt(net) : 'net −' + K.fmt(-net)}.`;
      } else if (half) text = `${desc} — La Partage returns ${K.fmt(half)} of your even-money bets.`;
      else text = `${desc} — no winners. House takes ${K.fmt(staked)}.`;
      t.msg(text, staked ? (net > 0 ? 'win' : net === 0 ? 'push' : 'lose') : '');
      if (staked && net > 0) { K.banner(t, '+' + K.fmt(net), 'win'); if (net >= staked * 10) K.sfx.bigWin(); else K.sfx.win(); }
      else if (staked && ret > 0) K.sfx.push(); else if (staked) K.sfx.lose();
      ovRes.textContent = desc;
      if (staked) lastBets = new Map(bets);
      bets = new Map(); actions = []; showingResult = true; spinning = false; sync();
      if (!docked) { clearTimeout(ovTimer); ovTimer = later(() => ov.classList.add('hide'), fast() ? 200 : 2200); }
      later(() => { if (showingResult) clearResultView(); }, fast() ? 300 : 3500);
    }
    ov.addEventListener('click', () => { if (!spinning) ov.classList.add('hide'); });

    buildBoard(); sync(); layout();
    t.msg('Place your bets — tap numbers, lines between them for splits, crossings for corners. Space to spin.');

    return {
      unmount() {
        dead = true; cancelAnimationFrame(raf); ro.disconnect(); timers.forEach(clearTimeout); timers.clear(); clearTimeout(ovTimer);
        // refund anything still on the layout (bets are only lost on a spin)
        if (spinning && pending !== null) { const r = payout(pending); if (r) api.win(r); }
        else { const sum = total(bets); if (sum) api.win(sum); }
        bets.clear();
        t.destroy();
      }
    };
  }
};
