// Valley Casino — Craps. Full layout: line bets with odds, come/don't come, place, field, big 6/8, hardways, props.
import * as K from './_kit.js';

const NUMS = [4, 5, 6, 8, 9, 10];
const NUM_WORD = { 4: '4', 5: '5', 6: 'SIX', 8: '8', 9: 'NINE', 10: '10' };
const ODDS_MULT = { 4: 3, 10: 3, 5: 4, 9: 4, 6: 5, 8: 5 }; // 3-4-5x odds
const LAY_MULT = 6;                                          // lay up to 6x flat (= 3-4-5x win)
const PLACE_TXT = { 4: '9 TO 5', 10: '9 TO 5', 5: '7 TO 5', 9: '7 TO 5', 6: '7 TO 6', 8: '7 TO 6' };
const placeProfit = (n, a) => Math.floor(n === 4 || n === 10 ? a * 9 / 5 : n === 5 || n === 9 ? a * 7 / 5 : a * 7 / 6);
const oddsProfit = (n, a) => Math.floor(n === 4 || n === 10 ? a * 2 : n === 5 || n === 9 ? a * 3 / 2 : a * 6 / 5);
const layProfit = (n, a) => Math.floor(n === 4 || n === 10 ? a / 2 : n === 5 || n === 9 ? a * 2 / 3 : a * 5 / 6);
const SUM_NAME = { 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Eleven', 12: 'Twelve' };

function label(id) {
  const fixed = { pass: 'Pass Line', passOdds: 'Pass odds', dp: "Don't Pass", dpOdds: "Don't Pass odds", come: 'Come', dc: "Don't Come", field: 'Field', big6: 'Big 6', big8: 'Big 8',
    any7: 'Any 7', craps: 'Any Craps', p2: 'Aces', p3: 'Ace-Deuce', p11: 'Yo 11', p12: 'Boxcars', horn: 'Horn', ce: 'C & E' };
  if (fixed[id]) return fixed[id];
  const m = id.match(/^(place|cb|co|db|do|hard)(\d+)$/); if (!m) return id;
  const n = m[2];
  return { place: `Place ${n}`, cb: `Come ${n}`, co: `Come ${n} odds`, db: `Don't Come ${n}`, do: `DC ${n} lay odds`, hard: `Hard ${n}` }[m[1]];
}

const RULES = `
<h3>Craps</h3>
<p><b>How to play.</b> Pick a chip, tap spots to bet, then <b>Roll</b> (or press <kbd>Space</kbd>). The first roll is the <b>come-out</b>: 7 or 11 wins the Pass Line, 2, 3 or 12 (craps) loses it. Any other number becomes the <b>point</b> and the puck flips <b>ON</b> over it. Roll the point again before a 7 and the Pass Line wins; a 7 first is a <b>seven-out</b> and the line loses.</p>
<p><b>Don't Pass</b> is the reverse: 2 or 3 wins, 7 or 11 loses, <b>12 is barred</b> (push). After a point, 7 wins and the point loses.</p>
<p><b>Come / Don't Come</b> work like Pass / Don't Pass but are made after a point is on. A come bet's next roll is its own come-out; if it rolls a point number the bet <b>travels</b> to that number box (shown inside the box). Tap the bet in the box to add odds.</p>
<p><b>Odds</b> pay true odds with no house edge. Pass/Come odds up to <b>3-4-5x</b> (3x on 4/10, 4x on 5/9, 5x on 6/8). Don't odds may lay up to 6x the flat bet. Come-bet odds are <b>off on the come-out</b> (returned if hit). Lay odds are always working.</p>
<p><b>Place bets, hardways</b> are <b>off on the come-out roll</b> and work only while a point is on. Big 6/8, field and props work on every roll.</p>
<p><b>Winning bets are paid and stay up</b> (line, place, field, props, hardways). Odds and come/don't come bets that win are paid and returned to you. Losing bets are cleared.</p>
<p><b>Taking bets down:</b> right-click a spot, or turn on <b>Take down</b> and tap it, or press <b>Clear</b> to take down everything removable. Pass Line and traveled Come bets are contract bets once a point is set and can't be removed.</p>
<p>Payouts are rounded down to whole dollars, so bet in full units (e.g. $6 on Place 6/8, $5 on 4/5/9/10, even odds on 5/9).</p>
<table>
<tr><th>Bet</th><th>Pays</th></tr>
<tr><td>Pass / Don't Pass / Come / Don't Come</td><td>1 to 1</td></tr>
<tr><td>Pass &amp; Come odds</td><td>4/10 2:1 · 5/9 3:2 · 6/8 6:5</td></tr>
<tr><td>Don't (lay) odds</td><td>4/10 1:2 · 5/9 2:3 · 6/8 5:6</td></tr>
<tr><td>Place 4 / 10</td><td>9 to 5</td></tr>
<tr><td>Place 5 / 9</td><td>7 to 5</td></tr>
<tr><td>Place 6 / 8</td><td>7 to 6</td></tr>
<tr><td>Big 6 / Big 8</td><td>1 to 1</td></tr>
<tr><td>Field 3, 4, 9, 10, 11</td><td>1 to 1</td></tr>
<tr><td>Field 2</td><td>2 to 1</td></tr>
<tr><td>Field 12</td><td>3 to 1</td></tr>
<tr><td>Hard 4 / Hard 10</td><td>7 to 1</td></tr>
<tr><td>Hard 6 / Hard 8</td><td>9 to 1</td></tr>
<tr><td>Any 7 (one roll)</td><td>4 to 1</td></tr>
<tr><td>Any Craps 2, 3, 12 (one roll)</td><td>7 to 1</td></tr>
<tr><td>Aces 2 / Boxcars 12 (one roll)</td><td>30 to 1</td></tr>
<tr><td>Ace-Deuce 3 / Yo 11 (one roll)</td><td>15 to 1</td></tr>
<tr><td>Horn (split 4 ways on 2, 3, 11, 12)</td><td>2/12 net 27:4 · 3/11 net 3:1</td></tr>
<tr><td>C &amp; E (split craps / eleven)</td><td>craps net 3:1 · 11 net 7:1</td></tr>
</table>`;

const CSS = `
.cr-screen .vc-rules[hidden]{display:none}
.cr-screen .cr-fit{position:relative;flex:none;margin:auto;padding:0;box-sizing:content-box;border:16px solid transparent}
.cr-screen .cr-board{position:absolute;left:0;top:0;transform-origin:0 0;display:grid;gap:8px;padding:12px;box-sizing:border-box;border-radius:28px;overflow:hidden;
  background:radial-gradient(ellipse at 45% 40%,#13894a 0%,#0c6a37 55%,#07502a 100%);
  box-shadow:0 0 0 10px #3b2312,0 0 0 13px #1c0f06,0 0 0 15px #a8842c,0 18px 40px rgba(0,0,0,.7),inset 0 0 60px rgba(0,0,0,.35)}
.cr-screen .cr-board::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.22;background-image:radial-gradient(rgba(255,255,255,.25) 1px,transparent 1.3px);background-size:3px 3px}
.cr-screen .cr-board{--wl:rgba(255,255,255,.92);--gd:#f2cf72}
.cr-screen .cr-land{width:1080px;grid-template-columns:84px 1fr 118px 272px;grid-template-rows:40px 196px 66px 80px 50px 70px;
  grid-template-areas:"puck hist hist props" "dcbar nums nums props" "dcbar come come props" "big field field props" "big dp dpodds props" "big pass passodds props"}
.cr-screen .cr-port{width:420px;grid-template-columns:1fr 1fr 1fr 1fr;grid-template-rows:44px 270px 86px 74px 48px 64px auto;
  grid-template-areas:"hist hist hist puck" "nums nums nums nums" "dcbar come come big" "field field field field" "dp dp dp dpodds" "pass pass pass passodds" "props props props props"}
.cr-screen .cr-area{position:relative;min-width:0;min-height:0;display:flex}
.cr-screen .cr-area>.vc-spot{flex:1}
.cr-screen .cr-board .vc-spot{min-width:0;min-height:0;border:2px solid var(--wl);border-radius:6px;background:rgba(0,0,0,.04);color:var(--gd);padding:4px;justify-content:center;gap:2px;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.cr-screen .cr-board .vc-spot:hover{background:rgba(255,255,255,.09)}
.cr-screen .cr-board .vc-spot.has{background:rgba(255,230,150,.07)}
.cr-screen .cr-board .vc-spot-l{font-family:"Bungee",Impact,sans-serif;font-weight:400;color:var(--gd);text-shadow:0 2px 0 rgba(0,0,0,.55);letter-spacing:.03em}
.cr-screen .cr-board .vc-spot small{color:#fff;font:700 10px "Chakra Petch",sans-serif;letter-spacing:.08em;opacity:.9}
.cr-screen .cr-board .vc-stack b{font-size:10px;padding:0 5px;z-index:3}
.cr-screen .cr-sm .vc-stack,.cr-screen .cr-num .vc-stack,.cr-screen .cr-props .vc-stack{width:26px;height:26px}
.cr-screen .cr-sm .vc-chip,.cr-screen .cr-num .vc-chip,.cr-screen .cr-props .vc-chip{--s:26px!important}
.cr-screen .cr-board .vc-stack .vc-chip{bottom:calc(var(--i)*2.5px)}
.cr-screen .cr-board .vc-stack.cr-odds b{background:#f2cf72;color:#1a1204}
.cr-screen .cr-na{opacity:.45}
.cr-screen .cr-takedown .vc-spot.has{cursor:not-allowed;box-shadow:0 0 0 2px #ff8a80 inset}
.cr-screen .cr-takedown .vc-spot.has:hover{background:rgba(255,80,80,.2)}
/* history + table total */
.cr-screen .cr-a-hist{align-items:center;gap:6px;padding:0 4px;overflow:hidden}
.cr-screen .cr-hl{font:400 10px "Press Start 2P",monospace;color:#fff;opacity:.75;flex:none}
.cr-screen .cr-hist{display:flex;gap:4px;flex:1;min-width:0;overflow:hidden}
.cr-screen .cr-h{flex:none;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font:700 13px "Chakra Petch",sans-serif;background:rgba(0,0,0,.45);color:#fff;border:1.5px solid rgba(255,255,255,.35)}
.cr-screen .cr-h.s7{background:#b3121f;border-color:#ff8a80}.cr-h.pt{background:#f2cf72;color:#1b1204;border-color:#fff}.cr-h.cx{color:#ffb4a8}.cr-h.hd{box-shadow:0 0 0 2px #f2cf72}
.cr-screen .cr-h:first-child{animation:crpop .4s}
@keyframes crpop{from{transform:scale(1.6)}to{transform:none}}
.cr-screen .cr-tot{flex:none;font:600 12px "Chakra Petch",sans-serif;color:#fff;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.3);border-radius:12px;padding:3px 10px;white-space:nowrap}
.cr-screen .cr-tot b{color:var(--gd)}
/* puck */
.cr-screen .cr-a-puck{align-items:center;justify-content:center}
.cr-screen .cr-puckhome{width:42px;height:42px;border-radius:50%;border:2px dashed rgba(255,255,255,.35);position:relative}
.cr-screen .cr-puck{position:absolute;left:-2px;top:-2px;z-index:6;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;font:400 13px "Bungee",Impact,sans-serif;pointer-events:none;
  background:radial-gradient(circle at 40% 35%,#3a3a3a,#050505);color:#fff;border:3px solid #fff;box-shadow:0 4px 8px rgba(0,0,0,.6);transition:transform .45s cubic-bezier(.3,.8,.3,1)}
.cr-screen .cr-puck.on{background:radial-gradient(circle at 40% 35%,#fff,#d9d9d9);color:#111;border-color:#111}
.cr-screen .cr-num .cr-puck{left:auto;right:-10px;top:-12px}
/* number boxes */
.cr-screen .cr-a-nums{display:grid;gap:6px}
.cr-screen .cr-land .cr-a-nums{grid-template-columns:repeat(6,1fr)}
.cr-screen .cr-port .cr-a-nums{grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr}
.cr-screen .cr-num{position:relative;display:grid;grid-template-rows:32px 1fr 54px;border:2px solid var(--wl);border-radius:6px;min-width:0}
.cr-screen .cr-port .cr-num{grid-template-rows:28px 1fr 50px}
.cr-screen .cr-num.cr-point{box-shadow:0 0 0 3px #f2cf72,0 0 22px rgba(242,207,114,.6);background:rgba(242,207,114,.07)}
.cr-screen .cr-num .vc-spot{border:0;border-radius:0}
.cr-screen .cr-num .cr-dcs{border-bottom:2px solid var(--wl)}
.cr-screen .cr-num .cr-lane{border-top:1.5px dashed rgba(255,255,255,.5)}
.cr-screen .cr-dcs .vc-spot-l,.cr-screen .cr-lane .vc-spot-l{position:absolute;left:5px;top:4px;font:700 9px "Chakra Petch",sans-serif;color:#fff;opacity:.55;text-shadow:none}
.cr-screen .cr-dcs .vc-stack{left:58%;bottom:auto;top:3px;transform:translateX(-50%)}
.cr-screen .cr-dcs .vc-stack.cr-odds{left:84%}
.cr-screen .cr-dcs .vc-stack b{top:auto;bottom:-4px;transform:translate(-50%,0)}
.cr-screen .cr-lane .vc-stack{left:32%;bottom:auto;top:6px;transform:translateX(-50%)}
.cr-screen .cr-lane .vc-stack.cr-odds{left:72%}
.cr-screen .cr-place .vc-spot-l{font-size:40px;line-height:1;margin-top:-18px}
.cr-screen .cr-place[data-n="6"] .vc-spot-l,.cr-screen .cr-place[data-n="9"] .vc-spot-l{font-size:27px}
.cr-screen .cr-place small{position:absolute;left:0;right:0;bottom:3px}
.cr-screen .cr-place .vc-stack{bottom:22px;transform:translateX(-50%)}
.cr-screen .cr-land .cr-place .vc-stack{bottom:30px}
.cr-screen .cr-land .cr-place .vc-spot-l{margin-top:-34px}
.cr-screen .cr-port .cr-place{align-items:flex-start;padding-left:8px}
.cr-screen .cr-port .cr-place .vc-spot-l{font-size:28px;margin:0}
.cr-screen .cr-port .cr-place[data-n="6"] .vc-spot-l,.cr-screen .cr-port .cr-place[data-n="9"] .vc-spot-l{font-size:20px;margin:4px 0}
.cr-screen .cr-port .cr-place small{position:static;font-size:9px!important}
.cr-screen .cr-port .cr-place .vc-stack{left:auto;right:8px;bottom:50%;transform:translateY(50%)}
.cr-screen .cr-port .cr-dw .vc-die{--ds:46px!important}
/* bars, lines */
.cr-screen .cr-a-dcbar .vc-spot-l{font-size:15px}
.cr-screen .cr-land .cr-a-dcbar .vc-spot{writing-mode:vertical-rl;transform:rotate(180deg)}
.cr-screen .cr-land .cr-a-dcbar .vc-spot-l{font-size:19px}
.cr-screen .cr-land .cr-a-dcbar .vc-stack{transform:translate(-50%,50%) rotate(180deg)}
.cr-screen .cr-port .cr-a-dcbar .vc-spot-l{font-size:11px}
.cr-screen .cr-bar12{display:inline-flex;gap:3px;align-items:center;font:700 11px "Chakra Petch",sans-serif;color:#fff;letter-spacing:.1em}
.cr-screen .cr-bar12 .vc-die{box-shadow:none}
.cr-screen .cr-a-come .vc-spot{background:linear-gradient(rgba(180,20,30,.0),rgba(180,20,30,0))}
.cr-screen .cr-a-come .vc-spot-l{font-size:44px;color:#e8473c;text-shadow:0 2px 0 rgba(0,0,0,.5),0 0 1px #fff;letter-spacing:.12em}
.cr-screen .cr-port .cr-a-come .vc-spot-l{font-size:34px}
.cr-screen .cr-a-come .vc-stack,.cr-screen .cr-a-dp .vc-stack,.cr-screen .cr-a-pass .vc-stack,.cr-screen .cr-a-field .vc-stack{left:auto;right:18%;transform:translate(0,50%)}
.cr-screen .cr-field .vc-spot-l{font-size:26px;color:#f2cf72}
.cr-screen .cr-fnums{display:flex;gap:10px;align-items:center;font:400 19px "Bungee",Impact,sans-serif;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.5)}
.cr-screen .cr-fnums i{font-style:normal;position:relative;display:grid;place-items:center;width:34px;height:34px;border:2px solid #f2cf72;border-radius:50%;color:#f2cf72;font-size:15px}
.cr-screen .cr-fnums i em{position:absolute;top:100%;font:700 8px "Chakra Petch",sans-serif;letter-spacing:.05em;color:#fff;white-space:nowrap;margin-top:1px}
.cr-screen .cr-port .cr-field .vc-spot-l{font-size:18px}.cr-port .cr-fnums{gap:6px;font-size:15px}.cr-port .cr-fnums i{width:28px;height:28px;font-size:12px}
.cr-screen .cr-field{padding-bottom:10px!important}
.cr-screen .cr-a-dp .vc-spot-l{font-size:20px}
.cr-screen .cr-port .cr-a-dp .vc-spot-l{font-size:15px}
.cr-screen .cr-a-pass .vc-spot{border-width:3px;border-radius:6px 6px 22px 22px}
.cr-screen .cr-a-pass .vc-spot-l{font-size:36px;letter-spacing:.14em}
.cr-screen .cr-port .cr-a-pass .vc-spot-l{font-size:24px}
.cr-screen .cr-oddsspot{align-items:flex-start!important;padding-left:8px!important}
.cr-screen .cr-oddsspot .vc-spot-l{font-size:13px}
.cr-screen .cr-oddsspot .vc-stack{left:auto;right:8px;transform:translateY(50%)}
.cr-screen .cr-port .cr-oddsspot .vc-spot-l{font-size:11px}
.cr-screen .cr-port .cr-oddsspot{padding-left:5px!important}
.cr-screen .cr-port .cr-oddsspot .vc-stack{right:4px;bottom:62%}
.cr-screen .cr-port .cr-a-come .vc-stack,.cr-screen .cr-port .cr-a-dp .vc-stack,.cr-screen .cr-port .cr-a-pass .vc-stack,.cr-screen .cr-port .cr-a-field .vc-stack{right:4%}
.cr-screen .cr-oddsspot small{font-size:9px!important}
.cr-screen .cr-big{display:flex;flex-direction:column;gap:6px;flex:1}
.cr-screen .cr-big .vc-spot{flex:1}
.cr-screen .cr-big .vc-spot-l{font-size:30px;line-height:1}
.cr-screen .cr-big .b6 .vc-spot-l{color:#e8473c}.cr-big .b8 .vc-spot-l{color:#f2cf72}
.cr-screen .cr-port .cr-big .vc-spot-l{font-size:20px}
.cr-screen .cr-big .vc-stack{left:auto;right:4px;transform:translateY(50%)}
.cr-screen .cr-land .cr-big .vc-spot{border-radius:6px 6px 6px 30px}
/* props */
.cr-screen .cr-props{flex:1;display:grid;gap:6px;padding:8px;border:3px solid #e8473c;border-radius:12px;background:rgba(0,0,0,.14)}
.cr-screen .cr-land .cr-props{grid-template-columns:1fr 1fr;grid-template-rows:20px repeat(7,1fr);grid-template-areas:"hd hd" "any7 any7" "hard6 hard10" "hard8 hard4" "p2 p12" "p3 p11" "craps craps" "horn ce"}
.cr-screen .cr-port .cr-props{grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(3,58px);grid-template-areas:"any7 craps horn ce" "hard4 hard6 hard8 hard10" "p2 p3 p11 p12"}
.cr-screen .cr-props-hd{grid-area:hd;text-align:center;font:400 12px "Bungee",Impact,sans-serif;color:#fff;letter-spacing:.12em;opacity:.85}
.cr-screen .cr-port .cr-props-hd{display:none}
.cr-screen .cr-props .vc-spot{border-color:rgba(255,255,255,.75)}
.cr-screen .cr-props .vc-spot-l{font-size:14px;color:#fff}
.cr-screen .cr-props .vc-spot small{color:#f2cf72}
.cr-screen .cr-props .cr-red .vc-spot-l{color:#ff6b5e;font-size:17px}
.cr-screen .cr-props .vc-stack{left:auto;right:3px;bottom:3px;transform:none}
.cr-screen .cr-props .vc-stack b{top:auto;bottom:100%;left:auto;right:-2px;transform:none}
.cr-screen .cr-port .cr-props .vc-spot-l{font-size:10px}
.cr-screen .cr-port .cr-props .cr-red .vc-spot-l{font-size:11px}
.cr-screen .cr-port .cr-props small{font-size:8px!important}
.cr-screen .cr-dd{display:inline-flex;gap:3px}
.cr-screen .cr-dd .vc-die{box-shadow:0 1px 2px rgba(0,0,0,.5)}
.cr-screen .cr-port .cr-dd .vc-die{--ds:13px!important}
/* dice layer */
.cr-screen .cr-dice{position:absolute;inset:0;pointer-events:none;z-index:8}
.cr-screen .cr-dw{position:absolute;left:0;top:0;will-change:transform;filter:drop-shadow(0 10px 8px rgba(0,0,0,.55));transition:opacity .6s}
.cr-screen .cr-dw .vc-die{--ds:62px}
.cr-screen .cr-board .vc-spot.cr-travel{animation:crtravel 1.2s}
@keyframes crtravel{0%,50%{background:rgba(242,207,114,.35);box-shadow:0 0 18px #f2cf72}100%{}}
.cr-screen .cr-ctl .vc-btn.cr-on{background:linear-gradient(#a3302a,#5d1410);border-color:#ff8a80;color:#fff}
@media (max-width:560px){.cr-screen .cr-ctl.vc-btn{padding:8px 12px}}
@media (max-width:560px){.cr-screen .vc-msg{min-height:2.7em;display:flex;align-items:center;justify-content:center;font-size:14px;padding:4px 12px}}
@media (max-width:560px){.cr-screen .vc-rack .vc-chip{--s:36px!important}.cr-screen .vc-rack{gap:3px}}
`;

let crStyled = false;
function injectCss() {
  if (crStyled || document.getElementById('cr-style')) { crStyled = true; return; }
  const s = document.createElement('style'); s.id = 'cr-style'; s.textContent = CSS; document.head.appendChild(s); crStyled = true;
}
const mini = (a, b, size = 16) => `<span class="cr-dd">${K.dieEl(a, { size }).outerHTML}${b ? K.dieEl(b, { size }).outerHTML : ''}</span>`;

export default {
  id: 'craps', title: 'Craps', kind: 'table',
  blurb: 'Roll the bones: pass line, odds, come bets, place numbers, hardways and props on a full craps layout.',
  mount(root, api) {
    injectCss();
    const t = K.table(root, api, { title: 'Craps', subtitle: 'Odds 3-4-5x · Field 12 pays triple', felt: 'green', rack: [1, 5, 25, 100, 500], rules: RULES });
    t.el.classList.add('cr-screen');
    const felt = t.felt; felt.style.justifyContent = 'flex-start'; felt.style.padding = '10px 8px';
    let dead = false, busy = false, takeDown = false, point = null, history = [];
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!dead) fn(); }, ms); timers.add(id); };
    const B = {};      // bet id -> dollars on the felt
    const spots = {};  // bet id -> { set, flash, el }
    const amt = id => B[id] || 0;

    // ------------------------------------------------------------ build the layout
    const fit = document.createElement('div'); fit.className = 'cr-fit';
    const board = document.createElement('div'); board.className = 'cr-board cr-land';
    fit.appendChild(board); felt.appendChild(fit);
    const area = name => { const d = document.createElement('div'); d.className = 'cr-area cr-a-' + name; d.style.gridArea = name; board.appendChild(d); return d; };
    const A = {}; ['hist', 'puck', 'nums', 'dcbar', 'come', 'big', 'field', 'dp', 'dpodds', 'pass', 'passodds', 'props'].forEach(n => A[n] = area(n));

    const mk = (id, lab, sub, cls, parent) => {
      const sp = K.betSpot(lab, () => onSpot(id), { cls, sub });
      sp.onRemove = () => removeBet(id);
      sp.el.setAttribute('aria-label', label(id));
      spots[id] = sp; if (parent) parent.appendChild(sp.el); return sp;
    };
    // second chip stack inside a spot (odds behind a come / don't come bet in a number box)
    const mkOdds = (id, host) => {
      const st = K.chipStack(0); st.el.classList.add('cr-odds'); host.el.appendChild(st.el);
      spots[id] = { el: host.el, set: a => st.set(a), flash: k => host.flash(k) };
    };

    // history + on-table total
    A.hist.innerHTML = `<span class="cr-hl">ROLLS</span><div class="cr-hist"></div><span class="cr-tot">On table <b>$0</b></span>`;
    const histEl = A.hist.querySelector('.cr-hist'), totEl = A.hist.querySelector('.cr-tot b');
    A.puck.innerHTML = `<div class="cr-puckhome"><div class="cr-puck">OFF</div></div>`;
    const puckHome = A.puck.querySelector('.cr-puckhome'), puck = A.puck.querySelector('.cr-puck');

    const numBox = {};
    for (const n of NUMS) {
      const box = document.createElement('div'); box.className = 'cr-num'; box.dataset.n = n; numBox[n] = box;
      const dcs = mk('db' + n, 'DC', '', 'cr-dcs', box); mkOdds('do' + n, dcs);
      dcs.el.title = `Don't Come bets on ${n} sit here. Tap to lay odds.`;
      const pl = mk('place' + n, NUM_WORD[n], 'PLACE ' + PLACE_TXT[n], 'cr-place', box); pl.el.dataset.n = n;
      pl.el.title = `Place ${n}: pays ${PLACE_TXT[n].toLowerCase()} (off on come-out)`;
      const lane = mk('cb' + n, 'COME', '', 'cr-lane', box); mkOdds('co' + n, lane);
      lane.el.title = `Come bets that travel to ${n} sit here. Tap to add odds.`;
      A.nums.appendChild(box);
    }
    mk('dc', `DON'T COME BAR <span class="cr-bar12">${mini(6, 6, 14)}</span>`, '', '', A.dcbar);
    mk('come', 'COME', '', '', A.come);
    mk('field', `<span class="cr-fnums"><i>2<em>DOUBLE</em></i>3 · 4 · 9 · 10 · 11<i>12<em>TRIPLE</em></i></span>FIELD`, '', 'cr-field', A.field);
    const big = document.createElement('div'); big.className = 'cr-big'; A.big.appendChild(big);
    mk('big6', '6', 'BIG', 'b6 cr-sm', big); mk('big8', '8', 'BIG', 'b8 cr-sm', big);
    mk('dp', `DON'T PASS BAR <span class="cr-bar12">${mini(6, 6, 14)}</span>`, '', '', A.dp);
    mk('dpOdds', 'LAY ODDS', "DON'T PASS", 'cr-oddsspot cr-sm', A.dpodds);
    mk('pass', 'PASS LINE', '', '', A.pass);
    mk('passOdds', 'ODDS', 'PASS LINE', 'cr-oddsspot cr-sm', A.passodds);

    const props = document.createElement('div'); props.className = 'cr-props'; A.props.appendChild(props);
    props.innerHTML = '<div class="cr-props-hd">PROPOSITION BETS</div>';
    const prop = (id, lab, sub, cls = '') => { const sp = mk(id, lab, sub, cls, props); sp.el.style.gridArea = id; };
    prop('any7', 'SEVEN', '4 TO 1', 'cr-red');
    prop('hard6', mini(3, 3), 'HARD 6 · 9 TO 1'); prop('hard10', mini(5, 5), 'HARD 10 · 7 TO 1');
    prop('hard8', mini(4, 4), 'HARD 8 · 9 TO 1'); prop('hard4', mini(2, 2), 'HARD 4 · 7 TO 1');
    prop('p2', mini(1, 1), '2 · 30 TO 1'); prop('p12', mini(6, 6), '12 · 30 TO 1');
    prop('p3', mini(1, 2), '3 · 15 TO 1'); prop('p11', mini(5, 6), '11 · 15 TO 1');
    prop('craps', 'ANY CRAPS', '7 TO 1', 'cr-red');
    prop('horn', 'HORN', '2·3·11·12'); prop('ce', 'C & E', 'CRAPS · ELEVEN');

    // dice layer
    const diceLayer = document.createElement('div'); diceLayer.className = 'cr-dice'; board.appendChild(diceLayer);
    const dice = [0, 1].map(i => { const w = document.createElement('div'); w.className = 'cr-dw'; const d = K.dieEl(i ? 4 : 3, { color: '#c8102e', size: 62 }); w.appendChild(d); diceLayer.appendChild(w); return { w, d }; });
    dice.forEach(o => o.w.style.opacity = '0');

    // ------------------------------------------------------------ controls
    const rollBtn = K.button('Roll <kbd>SPACE</kbd>', () => roll(), { primary: true, cls: 'cr-ctl' });
    const tdBtn = K.button('Take down', () => { takeDown = !takeDown; tdBtn.classList.toggle('cr-on', takeDown); tdBtn.innerHTML = takeDown ? 'Take down: ON' : 'Take down'; board.classList.toggle('cr-takedown', takeDown); hint(takeDown ? 'Tap a bet to take it down.' : 'Tap a spot to bet.'); }, { cls: 'cr-ctl', title: 'Toggle: tap bets to remove them (or right-click any bet)' });
    const clrBtn = K.button('Clear', () => clearAll(), { cls: 'cr-ctl', title: 'Take down every removable bet' });
    t.controls.append(rollBtn, tdBtn, clrBtn);
    t.bindKey(' ', rollBtn);
    const hint = (s, k = '') => t.msg(s, k);

    // ------------------------------------------------------------ scale-to-fit
    let scale = 1;
    const relayout = () => {
      if (dead) return;
      const aw = Math.max(200, felt.clientWidth - 48), ah = Math.max(160, felt.clientHeight - 52);
      const port = aw < 700 || aw / ah < 1.05;
      board.classList.toggle('cr-port', port); board.classList.toggle('cr-land', !port);
      const W = board.offsetWidth, H = board.offsetHeight;
      const sw = aw / W, sh = ah / H;
      scale = Math.min(1.45, port ? Math.min(sw, Math.max(sh, 0.8 * sw)) : Math.min(sw, sh));
      board.style.transform = `scale(${scale})`;
      fit.style.width = W * scale + 'px'; fit.style.height = H * scale + 'px';
      placePuck(false);
    };
    const ro = new ResizeObserver(relayout); ro.observe(felt);

    // ------------------------------------------------------------ betting
    const removable = id => {
      if (id === 'pass' && point !== null) return "The Pass Line is a contract bet once a point is set.";
      if (/^cb\d+$/.test(id)) return 'A Come bet on a number is a contract bet. Tap it to add or remove odds.';
      return '';
    };
    function onSpot(id) {
      if (busy || dead) return;
      // number-box sub-areas: the lane takes come odds, the DC strip takes lay odds
      let target = id;
      if (/^cb\d+$/.test(id)) target = 'co' + id.slice(2);
      if (/^db\d+$/.test(id)) target = 'do' + id.slice(2);
      if (takeDown) { removeBet(id); return; }
      addBet(target);
    }
    function addBet(id) {
      let v = t.rack.value, max = Infinity;
      const n = +(id.match(/\d+$/) || [0])[0];
      if (id === 'pass' || id === 'dp') { if (point !== null) return hint(id === 'pass' ? 'Line bets go up on the come-out roll. Use COME to bet now.' : "Don't Pass goes up on the come-out roll. Use DON'T COME now.", 'push'); }
      else if (id === 'come' || id === 'dc') { if (point === null) return hint('Come bets are made once a point is on. Use the Pass Line on the come-out.', 'push'); }
      else if (id === 'passOdds') { if (point === null || !amt('pass')) return hint('Pass odds need a Pass Line bet and a point.', 'push'); max = ODDS_MULT[point] * amt('pass') - amt('passOdds'); }
      else if (id === 'dpOdds') { if (point === null || !amt('dp')) return hint("Lay odds need a Don't Pass bet and a point.", 'push'); max = LAY_MULT * amt('dp') - amt('dpOdds'); }
      else if (/^co\d+$/.test(id)) { if (!amt('cb' + n)) return hint(`Bet the COME; if it rolls ${n} it moves here and you can add odds.`, 'push'); max = ODDS_MULT[n] * amt('cb' + n) - amt(id); }
      else if (/^do\d+$/.test(id)) { if (!amt('db' + n)) return hint(`Bet DON'T COME; if it rolls ${n} it moves here and you can lay odds.`, 'push'); max = LAY_MULT * amt('db' + n) - amt(id); }
      if (max <= 0) return hint(`Max odds reached on ${label(id).replace(/ (lay )?odds$/, '')}.`, 'push');
      v = Math.min(v, max);
      if (!api.bet(v)) return hint('Not enough chips for that bet.', 'lose');
      B[id] = amt(id) + v; K.sfx.chip(); render();
      hint(`${label(id)}: ${K.fmt(B[id])}` + (max !== Infinity ? ` (max ${K.fmt(B[id] + max - v)})` : ''));
    }
    function takeDownBet(id) { // returns refunded dollars, no UI
      let r = amt(id); B[id] = 0;
      if (id === 'dp') { r += amt('dpOdds'); B.dpOdds = 0; }
      if (/^db\d+$/.test(id)) { const o = 'do' + id.slice(2); r += amt(o); B[o] = 0; }
      if (r) api.win(r); return r;
    }
    function removeBet(id) {
      if (busy || dead) return;
      if (/^cb\d+$/.test(id) && amt('co' + id.slice(2))) id = 'co' + id.slice(2);
      if (!amt(id)) return;
      const why = removable(id); if (why) return hint(why, 'push');
      const r = takeDownBet(id); K.sfx.chips(2); render(); hint(`${label(id)} down — ${K.fmt(r)} back to you.`);
    }
    function clearAll() {
      if (busy) return; let r = 0;
      for (const id of Object.keys(B)) if (amt(id) && !removable(id)) r += takeDownBet(id);
      render();
      if (r) { K.sfx.chips(4); hint(`Took down ${K.fmt(r)}.` + (amt('pass') || Object.keys(B).some(k => /^cb/.test(k) && B[k]) ? ' Contract bets stay up.' : '')); }
      else hint('Nothing to take down.');
    }

    // ------------------------------------------------------------ render
    function render() {
      for (const id in spots) spots[id].set(amt(id));
      let tot = 0; for (const k in B) tot += B[k]; totEl.textContent = K.fmt(tot);
      const on = point !== null;
      spots.passOdds.el.classList.toggle('cr-na', !(on && amt('pass')));
      spots.dpOdds.el.classList.toggle('cr-na', !(on && amt('dp')));
      spots.come.el.classList.toggle('cr-na', !on); spots.dc.el.classList.toggle('cr-na', !on);
      for (const n of NUMS) numBox[n].classList.toggle('cr-point', point === n);
    }
    function placePuck(animate = true) {
      const parent = point === null ? puckHome : numBox[point];
      const before = puck.getBoundingClientRect();
      if (puck.parentNode !== parent) parent.appendChild(puck);
      puck.textContent = point === null ? 'OFF' : 'ON'; puck.classList.toggle('on', point !== null);
      if (!animate) return;
      const after = puck.getBoundingClientRect();
      const dx = (before.left - after.left) / scale, dy = (before.top - after.top) / scale;
      if (!dx && !dy) return;
      puck.style.transition = 'none'; puck.style.transform = `translate(${dx}px,${dy}px)`; void puck.offsetWidth;
      puck.style.transition = ''; puck.style.transform = '';
    }
    function pushHistory(d1, d2, cls) {
      history.unshift({ d1, d2, cls }); history = history.slice(0, 12);
      histEl.innerHTML = history.map(h => `<span class="cr-h ${h.cls}" title="${h.d1} + ${h.d2}">${h.d1 + h.d2}</span>`).join('');
    }

    // ------------------------------------------------------------ dice throw
    async function throwDice(v1, v2, fast) {
      const zoneTop = A.come.offsetTop, zoneBot = A.field.offsetTop + A.field.offsetHeight;
      const zl = A.field.offsetLeft, zr = A.field.offsetLeft + A.field.offsetWidth;
      const W = board.offsetWidth, ds = board.classList.contains('cr-port') ? 46 : 62;
      const ms = fast ? 40 : 950;
      const tx = zl + 10 + Math.random() * Math.max(10, zr - zl - 2 * ds - 50);
      const ty = zoneTop + 4 + Math.random() * Math.max(4, zoneBot - zoneTop - ds - 8);
      dice.forEach((o, i) => {
        const sx = W - ds - 10, sy = zoneTop + (zoneBot - zoneTop) / 2 + (i ? 20 : -40);
        o.w.style.opacity = '1';
        o.w.style.transition = 'none'; o.w.style.transform = `translate(${sx}px,${sy}px) rotate(0deg)`; void o.w.offsetWidth;
        const ex = tx + i * (ds + 10 + Math.random() * 18), ey = ty + (i ? (Math.random() * 30 - 15) : 0), rot = (i ? -1 : 1) * (360 + Math.random() * 400);
        o.w.style.transition = `transform ${ms}ms cubic-bezier(.16,.72,.28,1), opacity .4s`;
        o.w.style.transform = `translate(${ex}px,${ey}px) rotate(${rot}deg)`;
      });
      await Promise.all([dice[0].d.roll(v1, ms), dice[1].d.roll(v2, ms + (fast ? 0 : 60))]);
    }

    // ------------------------------------------------------------ roll + resolve
    async function roll() {
      if (busy || dead) return;
      busy = true; t.setBusy(true); rollBtn.disabled = true;
      let d1 = 1 + K.rand(6), d2 = 1 + K.rand(6);
      const f = window.__crapsForce;
      if (Array.isArray(f) && f.length) {
        if (Array.isArray(f[0])) [d1, d2] = f.shift(); else { [d1, d2] = f; window.__crapsForce = null; }
      }
      const fast = !!window.__crapsFast;
      hint('Dice are out…'); K.sfx.dice();
      await throwDice(d1, d2, fast);
      if (dead) return;
      resolve(d1, d2);
      busy = false; t.setBusy(false); rollBtn.disabled = false;
      later(() => { if (!busy) dice.forEach(o => o.w.style.opacity = '.5'); }, 2600);
    }

    function resolve(d1, d2) {
      const s = d1 + d2, hard = d1 === d2, comeOut = point === null, before = point;
      const R = []; let profit = 0, lost = 0, hitBig = false;
      const wonStay = (id, p, txt) => { if (p > 0) api.win(p); profit += p; R.push({ id, k: 'win', txt: txt || `${label(id)} pays ${K.fmt(p)}`, p }); };
      const wonTake = (id, total, p, txt) => { api.win(total); B[id] = 0; profit += p; R.push({ id, k: 'win', txt: txt || `${label(id)} pays ${K.fmt(p)}`, p }); };
      const lose = id => { if (!amt(id)) return; lost += amt(id); R.push({ id, k: 'lose', txt: `${label(id)} loses` }); B[id] = 0; };
      const ret = (id, why) => { if (!amt(id)) return; api.win(amt(id)); R.push({ id, k: 'push', txt: `${label(id)} returned${why ? ' (' + why + ')' : ''}` }); B[id] = 0; };

      // one-roll bets
      if (amt('field')) { if ([2, 3, 4, 9, 10, 11, 12].includes(s)) wonStay('field', amt('field') * (s === 2 ? 2 : s === 12 ? 3 : 1)); else lose('field'); }
      if (amt('any7')) { if (s === 7) wonStay('any7', amt('any7') * 4); else lose('any7'); }
      if (amt('craps')) { if (s === 2 || s === 3 || s === 12) wonStay('craps', amt('craps') * 7); else lose('craps'); }
      for (const [id, n, m] of [['p2', 2, 30], ['p3', 3, 15], ['p11', 11, 15], ['p12', 12, 30]]) if (amt(id)) { if (s === n) { wonStay(id, amt(id) * m); hitBig = true; } else lose(id); }
      if (amt('horn')) { const a = amt('horn'); if (s === 2 || s === 12) { wonStay('horn', Math.floor(a * 27 / 4)); hitBig = true; } else if (s === 3 || s === 11) wonStay('horn', a * 3); else lose('horn'); }
      if (amt('ce')) { const a = amt('ce'); if (s === 2 || s === 3 || s === 12) wonStay('ce', a * 3); else if (s === 11) wonStay('ce', a * 7); else lose('ce'); }
      // hardways (off on come-out)
      if (!comeOut) for (const n of [4, 6, 8, 10]) { const id = 'hard' + n; if (!amt(id)) continue; if (s === n && hard) { wonStay(id, amt(id) * (n === 4 || n === 10 ? 7 : 9)); hitBig = true; } else if (s === 7 || s === n) lose(id); }
      // big 6 / 8 (always working)
      for (const n of [6, 8]) { const id = 'big' + n; if (!amt(id)) continue; if (s === n) wonStay(id, amt(id)); else if (s === 7) lose(id); }
      // place bets (off on come-out)
      if (!comeOut) for (const n of NUMS) { const id = 'place' + n; if (!amt(id)) continue; if (s === n) wonStay(id, placeProfit(n, amt(id))); else if (s === 7) lose(id); }
      // come bets already on numbers (odds off on come-out)
      for (const n of NUMS) {
        const cb = 'cb' + n, co = 'co' + n, a = amt(cb), o = amt(co);
        if (a && s === n) {
          if (comeOut) { if (o) ret(co, 'odds off on come-out'); wonTake(cb, 2 * a, a); }
          else { const op = o ? oddsProfit(n, o) : 0; B[co] = 0; wonTake(cb, 2 * a + o + op, a + op, `Come ${n} pays ${K.fmt(a + op)}${o ? ' with odds' : ''}`); }
        } else if (a && s === 7) { lose(cb); if (comeOut) ret(co, 'odds off'); else lose(co); }
        const db = 'db' + n, dO = 'do' + n, b = amt(db), lo = amt(dO);
        if (b && s === 7) { const lp = lo ? layProfit(n, lo) : 0; B[dO] = 0; wonTake(db, 2 * b + lo + lp, b + lp, `Don't Come ${n} pays ${K.fmt(b + lp)}`); }
        else if (b && s === n) { lose(db); lose(dO); }
      }
      // pending come / don't come
      const travel = [];
      if (amt('come')) {
        const a = amt('come');
        if (s === 7 || s === 11) wonTake('come', 2 * a, a);
        else if (s === 2 || s === 3 || s === 12) lose('come');
        else { B['cb' + s] = a; B.come = 0; travel.push('cb' + s); R.push({ id: 'cb' + s, k: 'travel', txt: `Come moves to ${s}` }); }
      }
      if (amt('dc')) {
        const a = amt('dc');
        if (s === 2 || s === 3) wonTake('dc', 2 * a, a);
        else if (s === 12) R.push({ id: 'dc', k: 'push', txt: "Don't Come bars 12" });
        else if (s === 7 || s === 11) lose('dc');
        else { B['db' + s] = a; B.dc = 0; travel.push('db' + s); R.push({ id: 'db' + s, k: 'travel', txt: `Don't Come moves to ${s}` }); }
      }
      // line bets
      let call, histCls = '';
      if (comeOut) {
        if (s === 7 || s === 11) { if (amt('pass')) wonStay('pass', amt('pass')); lose('dp'); call = s === 7 ? 'Seven, front line winner!' : 'Yo-leven, front line winner!'; }
        else if (s === 2 || s === 3 || s === 12) {
          lose('pass'); if (s === 12) { if (amt('dp')) R.push({ id: 'dp', k: 'push', txt: "Don't Pass bars 12" }); } else if (amt('dp')) wonStay('dp', amt('dp'));
          call = (s === 2 ? 'Aces' : s === 3 ? 'Ace-deuce' : 'Boxcars') + ', craps!'; histCls = 'cx';
        } else { point = s; call = `The point is ${SUM_NAME[s].toLowerCase()}${hard ? ' (the hard way)' : ''}. Puck is ON.`; }
      } else if (s === point) {
        if (amt('pass')) wonStay('pass', amt('pass'));
        if (amt('passOdds')) { const o = amt('passOdds'), op = oddsProfit(s, o); wonTake('passOdds', o + op, op); }
        lose('dp'); lose('dpOdds');
        call = `${hard ? 'Hard ' + SUM_NAME[s].toLowerCase() : SUM_NAME[s]}! Winner on the pass line!`; histCls = 'pt'; point = null;
      } else if (s === 7) {
        lose('pass'); lose('passOdds');
        if (amt('dp')) wonStay('dp', amt('dp'));
        if (amt('dpOdds')) { const o = amt('dpOdds'), lp = layProfit(before, o); wonTake('dpOdds', o + lp, lp); }
        call = 'Seven out! Line away.'; point = null; histCls = 's7';
      } else {
        call = [4, 6, 8, 10].includes(s) ? (hard ? `Hard ${SUM_NAME[s].toLowerCase()}!` : `${SUM_NAME[s]}, easy.`) : s === 11 ? 'Yo-leven!' : s === 2 ? 'Aces!' : s === 3 ? 'Ace-deuce!' : s === 12 ? 'Boxcars!' : `${SUM_NAME[s]}.`;
      }
      if (s === 7 && !histCls) histCls = 's7';
      if (hard && [4, 6, 8, 10].includes(s)) histCls += ' hd';
      pushHistory(d1, d2, histCls.trim());
      render();
      if (point !== before) placePuck(true);
      // flashes
      for (const r of R) { const sp = spots[r.id]; if (!sp) continue; if (r.k === 'travel') { sp.el.classList.remove('cr-travel'); void sp.el.offsetWidth; sp.el.classList.add('cr-travel'); } else if (r.k !== 'push') sp.flash(r.k); }
      // message
      const wins = R.filter(r => r.k === 'win').sort((a, b) => b.p - a.p);
      const others = R.filter(r => r.k === 'travel' || r.k === 'push');
      const bits = [...wins.slice(0, 2).map(r => r.txt), ...others.slice(0, 1).map(r => r.txt)];
      if (wins.length > 2) bits.push(`+${wins.length - 2} more`);
      const net = profit - lost;
      let line = call + (bits.length ? ' ' + bits.join(' · ') : '');
      if (profit || lost) line += ` — net ${net >= 0 ? '+' : '−'}${K.fmt(Math.abs(net))}`;
      hint(line, net > 0 ? 'win' : net < 0 ? 'lose' : (profit ? 'win' : ''));
      if (profit >= 100 || (hitBig && profit >= 25)) { K.banner(t, '+' + K.fmt(profit), 'win'); K.sfx.bigWin(); }
      else if (profit > 0) K.sfx.win();
      else if (!comeOut && s === 7 && lost > 0) { K.banner(t, 'SEVEN OUT', 'lose'); K.sfx.lose(); }
      else if (lost > 0) K.sfx.lose();
      else if (travel.length) K.sfx.chips(2);
    }

    render(); relayout();
    hint('Pick a chip, bet the PASS LINE, then roll. Right-click (or Take down) to remove bets.');
    window.__craps = { get bets() { return { ...B }; }, get point() { return point; }, roll, get busy() { return busy; } };

    return {
      unmount() {
        dead = true; ro.disconnect(); timers.forEach(clearTimeout); timers.clear();
        if (window.__craps) delete window.__craps;
        t.destroy();
      }
    };
  }
};
