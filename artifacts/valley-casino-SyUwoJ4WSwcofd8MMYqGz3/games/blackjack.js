// Valley Casino — Blackjack. 6-deck shoe, S17, 3:2, DAS, split to 4 hands, late surrender, insurance / even money,
// Perfect Pairs and 21+3 side bets, basic-strategy hints.
// Debug hooks (dev only): window.__bjStack = ['As','Kh',...] forces the next cards drawn (in deal order:
// player, dealer up, player, dealer hole, then hits). window.__vcFast = true shortens animations.
import * as K from './_kit.js';

const TEN = new Set(['10', 'J', 'Q', 'K']);
const pts = c => c.r === 'A' ? 11 : TEN.has(c.r) ? 10 : +c.r;

export function bjValue(cards) {
  let t = 0, aces = 0;
  for (const c of cards) { if (c.r === 'A') { aces++; t += 1; } else t += TEN.has(c.r) ? 10 : +c.r; }
  const soft = aces > 0 && t + 10 <= 21;
  return { total: soft ? t + 10 : t, soft, low: t };
}
export function perfectPairs(a, b) {
  if (!a || !b || a.r !== b.r) return null;
  if (a.s === b.s) return { name: 'Perfect Pair', mult: 25 };
  const red = x => x.s === 'h' || x.s === 'd';
  return red(a) === red(b) ? { name: 'Coloured Pair', mult: 12 } : { name: 'Mixed Pair', mult: 6 };
}
export function twentyOnePlus3(cs) {
  const v = cs.map(c => K.rankValue(c.r)).sort((x, y) => x - y);
  const flush = cs.every(c => c.s === cs[0].s), trips = v[0] === v[2];
  const straight = (v[1] === v[0] + 1 && v[2] === v[1] + 1) || (v[0] === 2 && v[1] === 3 && v[2] === 14);
  if (trips && flush) return { name: 'Suited Trips', mult: 100 };
  if (straight && flush) return { name: 'Straight Flush', mult: 40 };
  if (trips) return { name: 'Three of a Kind', mult: 30 };
  if (straight) return { name: 'Straight', mult: 10 };
  if (flush) return { name: 'Flush', mult: 5 };
  return null;
}
// Basic strategy for 6 decks, S17, DAS, late surrender. Returns 'H' | 'S' | 'D' | 'P' | 'R'.
export function basicStrategy(cards, up, { canDouble = true, canSplit = true, canSurrender = true } = {}) {
  const d = pts(up), v = bjValue(cards), two = cards.length === 2;
  if (two && canSplit && pts(cards[0]) === pts(cards[1])) {
    const r = pts(cards[0]);
    const sp = { 11: true, 10: false, 9: [2, 3, 4, 5, 6, 8, 9].includes(d), 8: true, 7: d <= 7, 6: d <= 6, 5: false, 4: d === 5 || d === 6, 3: d <= 7, 2: d <= 7 }[r];
    if (sp) return 'P';
  }
  if (two && canSurrender && !v.soft) {
    if (v.total === 16 && d >= 9 && !(pts(cards[0]) === 8 && canSplit)) return 'R';
    if (v.total === 15 && d === 10) return 'R';
  }
  const D = ok => ok && canDouble;
  if (v.soft) {
    const t = v.total;
    if (t >= 20) return 'S';
    if (t === 19) return D(d === 6) ? 'D' : 'S';
    if (t === 18) { if (d <= 6) return D(true) ? 'D' : 'S'; return d <= 8 ? 'S' : 'H'; }
    if (t === 17) return D(d >= 3 && d <= 6) ? 'D' : 'H';
    if (t >= 15) return D(d >= 4 && d <= 6) ? 'D' : 'H';
    if (t >= 13) return D(d === 5 || d === 6) ? 'D' : 'H';
    return 'H';
  }
  const t = v.total;
  if (t >= 17) return 'S';
  if (t >= 13) return d <= 6 ? 'S' : 'H';
  if (t === 12) return d >= 4 && d <= 6 ? 'S' : 'H';
  if (t === 11) return D(d <= 10) ? 'D' : 'H';
  if (t === 10) return D(d <= 9) ? 'D' : 'H';
  if (t === 9) return D(d >= 3 && d <= 6) ? 'D' : 'H';
  return 'H';
}

function parseCard(s) {
  if (s && typeof s === 'object') return { r: String(s.r), s: s.s };
  s = String(s).trim();
  let r = s.slice(0, -1).toUpperCase(), su = s.slice(-1).toLowerCase();
  if (r === 'T' || r === '1') r = '10';
  if (!K.RANKS.includes(r)) r = 'A';
  if (!K.SUITS.includes(su)) su = 's';
  return { r, s: su };
}

const RULES = `
<h3>Blackjack</h3>
<p>Beat the dealer by getting closer to 21 without going over. Cards 2–10 count face value, J/Q/K count 10, aces count 1 or 11.
A soft total (shown like <b>7/17</b>) contains an ace counted as 11.</p>
<table>
<tr><th>Bet</th><th>Pays</th></tr>
<tr><td>Win</td><td>1 to 1</td></tr>
<tr><td>Blackjack (ace + 10-value, first two cards)</td><td>3 to 2</td></tr>
<tr><td>Insurance (offered when dealer shows an ace)</td><td>2 to 1</td></tr>
<tr><td>Even money (your blackjack vs dealer ace)</td><td>1 to 1, paid at once</td></tr>
<tr><td>Late surrender</td><td>half your bet returned</td></tr>
<tr><th colspan="2">Perfect Pairs (your first two cards)</th></tr>
<tr><td>Perfect pair (same suit)</td><td>25 to 1</td></tr><tr><td>Coloured pair (same colour)</td><td>12 to 1</td></tr><tr><td>Mixed pair</td><td>6 to 1</td></tr>
<tr><th colspan="2">21+3 (your two cards + dealer up card)</th></tr>
<tr><td>Suited trips</td><td>100 to 1</td></tr><tr><td>Straight flush</td><td>40 to 1</td></tr><tr><td>Three of a kind</td><td>30 to 1</td></tr>
<tr><td>Straight</td><td>10 to 1</td></tr><tr><td>Flush</td><td>5 to 1</td></tr>
</table>
<h3>House rules</h3>
<ul>
<li>6 decks, cut card about ¾ of the way through; the shoe is reshuffled after the cut card comes out.</li>
<li>Dealer stands on all 17s, including soft 17. Dealer peeks for blackjack with an ace or 10 showing.</li>
<li>Double down on any first two cards, including after a split.</li>
<li>Split pairs of equal value up to 3 times (4 hands). Split aces receive one card each and cannot be re-split; 21 on a split hand is not a blackjack.</li>
<li>Late surrender on your first two cards (not after a split).</li>
<li>Table limits: main bet $1–$5,000; side bets $1–$100 (need a main bet).</li>
<li>Odd bets: 3:2 and surrender half-dollars are kept as change and added to your next payout.</li>
</ul>
<h3>Keys</h3>
<p><b>Enter</b> deal / rebet &amp; deal · <b>H</b> hit · <b>S</b> stand · <b>D</b> double · <b>P</b> split · <b>R</b> surrender · <b>I</b>/<b>N</b>/<b>E</b> insurance · <b>?</b> hint · <b>U</b> undo chip. Right-click a bet to take it back.</p>`;

let styled = false;
function injectStyle() {
  if (styled) return; styled = true;
  const s = document.createElement('style'); s.id = 'bj-style';
  s.textContent = `
.bj .vc-felt{justify-content:flex-start;padding:8px 10px 10px;gap:0}
.bj-table{position:relative;box-sizing:border-box;width:min(980px,100%);flex:none;display:flex;flex-direction:column;align-items:center;justify-content:space-between;gap:6px;padding:6px 0 4px}
.bj-table::before{content:"";position:absolute;left:1%;right:1%;top:-14px;bottom:0;border:2px solid rgba(232,196,106,.55);border-top:0;border-radius:0 0 50% 50%/0 0 62% 62%;pointer-events:none;
  box-shadow:inset 0 -18px 50px rgba(0,0,0,.28),0 10px 0 -4px rgba(60,30,10,.0)}
.bj-table::after{content:"";position:absolute;left:5%;right:5%;top:-14px;bottom:5%;border:1px dashed rgba(232,196,106,.22);border-top:0;border-radius:0 0 50% 50%/0 0 62% 62%;pointer-events:none}
.bj-top{position:relative;width:100%;display:flex;justify-content:center;min-height:calc(clamp(52px,8.4vw,86px)*1.4 + 26px)}
.bj-dealer{display:flex;flex-direction:column;align-items:center;gap:4px}
.bj-lab{font:400 11px "Press Start 2P",monospace;letter-spacing:.1em;color:rgba(246,239,224,.55)}
.bj-tot{font:700 14px "Chakra Petch",sans-serif;min-width:34px;text-align:center;padding:2px 9px;border-radius:12px;background:rgba(0,0,0,.65);border:1px solid rgba(232,196,106,.5);color:#fff;font-variant-numeric:tabular-nums;transition:background .2s}
.bj-tot:empty{visibility:hidden}
.bj-tot.bust{background:#8d1b1b;border-color:#ff8a80}.bj-tot.bj{background:linear-gradient(#f3d27e,#c99a34);color:#1d1404;border-color:#ffe6a0}.bj-tot.t21{background:#1d6b35;border-color:#7dff9a}
.bj-shoe{position:absolute;right:3%;top:0;display:grid;justify-items:center;gap:3px}
.bj-shoe-box{position:relative;width:26px;height:64px;border-radius:4px 4px 6px 6px;background:linear-gradient(90deg,#2b1c10,#4a3220 50%,#2b1c10);border:1px solid #a8842c;overflow:hidden;box-shadow:0 3px 8px rgba(0,0,0,.5)}
.bj-shoe-fill{position:absolute;left:3px;right:3px;bottom:3px;background:repeating-linear-gradient(0deg,#f7f2e8 0 1px,#c9bfa6 1px 2px);transition:height .3s;border-radius:2px}
.bj-shoe-cut{position:absolute;left:0;right:0;height:3px;background:#ffd04a;box-shadow:0 0 4px #ffd04a}
.bj-shoe small{font:9px "Press Start 2P",monospace;color:var(--dim)}
.bj-shoe.cut .bj-shoe-box{border-color:#ffd04a;box-shadow:0 0 10px #ffd04a}
.bj-discard{position:absolute;left:3%;top:0;width:30px;height:42px;border-radius:4px;background:repeating-linear-gradient(45deg,#8c1020 0 3px,#6d0a18 3px 6px);border:2px solid #f7f2e8;opacity:.0;transition:opacity .3s;transform:rotate(-8deg)}
.bj-discard.on{opacity:.85}
.bj-arc{width:min(580px,96%);height:auto;display:block;margin:-4px 0 -6px;pointer-events:none;overflow:visible}
.bj-arc text{font-family:"Bungee",Impact,sans-serif;fill:#e8c46a;letter-spacing:2px}
.bj-arc .a1{font-size:25px;fill:#f1d488;filter:drop-shadow(0 2px 0 rgba(0,0,0,.6))}.bj-arc .a2{font-size:15px;fill:rgba(246,239,224,.8)}.bj-arc .a3{font-size:11px;fill:rgba(232,196,106,.65);letter-spacing:3px}
.bj-arc .band{fill:none;stroke:rgba(232,196,106,.4);stroke-width:1.2}
.bj-ins{position:relative;height:0;width:100%}
.bj-ins .vc-stack{left:50%;bottom:auto;top:-40px;transform:translate(-50%,0)}
.bj-hands{display:flex;justify-content:center;align-items:flex-end;gap:10px 18px;flex-wrap:wrap;width:100%;min-height:calc(clamp(52px,8.4vw,86px)*1.4 + 50px)}
.bj-hands.many{gap:8px 10px}.bj-hands.many .vc-card{--w:clamp(42px,6vw,64px)}
.bj-hbox{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 8px 4px;border-radius:12px;border:2px solid transparent;transition:border-color .2s,box-shadow .2s,opacity .3s}
.bj-hbox.act{border-color:#ffe08a;box-shadow:0 0 18px rgba(255,224,138,.45);background:rgba(255,224,138,.06)}
.bj-hbox.over{opacity:.62}
.bj-hbox.dbl{padding-right:calc(clamp(42px,6vw,64px)*.45)}
.bj-hbet{font:700 12px "Chakra Petch",sans-serif;color:#ffe08a;background:rgba(0,0,0,.6);padding:1px 8px;border-radius:9px;white-space:nowrap}
.bj-hbet:empty{display:none}
.bj-res{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) rotate(-8deg);z-index:3;font:400 clamp(12px,1.8vw,17px) "Bungee",Impact,sans-serif;padding:3px 10px;border-radius:7px;white-space:nowrap;pointer-events:none;
  background:rgba(0,0,0,.78);border:2px solid currentColor;animation:bjpop .35s cubic-bezier(.3,1.6,.5,1)}
.bj-res.win{color:#7dff9a}.bj-res.lose{color:#ff8a80}.bj-res.push{color:#ffe08a}.bj-res.bj{color:#ffd04a;background:rgba(40,25,0,.85)}
@keyframes bjpop{from{transform:translate(-50%,-50%) rotate(-8deg) scale(.3);opacity:0}}
.bj-dbl{transform:rotate(90deg) translateX(8%);margin-left:calc(var(--w)*-.05)!important}
.bj-hand .vc-card{transition:transform .35s}
.bj-sweep .vc-card{transition:transform .32s ease-in,opacity .32s;transform:translate(-40vw,-30vh) rotate(-30deg);opacity:0}
.bj-peek .vc-card-in{animation:bjpeek .7s ease-in-out}
@keyframes bjpeek{0%,100%{transform:rotateY(180deg)}45%,60%{transform:rotateY(180deg) rotateX(-28deg) translateY(-4px)}}
.bj-spots{position:relative;display:flex;align-items:center;justify-content:center;gap:clamp(14px,4vw,40px);padding-bottom:4px}
.bj-spots .vc-spot{border-color:rgba(246,239,224,.6)}
.vc-spot.bj-main{width:clamp(84px,12vw,108px);height:clamp(84px,12vw,108px);border-radius:50%;border:3px solid rgba(232,196,106,.85);background:radial-gradient(circle,rgba(255,255,255,.07),rgba(0,0,0,.12));box-shadow:inset 0 0 0 5px rgba(0,0,0,.15),0 0 0 4px rgba(232,196,106,.15);justify-content:center}
.vc-spot.bj-main .vc-spot-l{font:400 11px "Bungee",Impact;color:rgba(232,196,106,.9)}
.vc-spot.bj-main.has .vc-spot-l,.vc-spot.bj-side.has .vc-spot-l,.vc-spot.bj-side.has small{opacity:0}
.vc-spot.bj-side{width:clamp(62px,9vw,80px);height:clamp(62px,9vw,80px);border-radius:50%;justify-content:center;border-style:dashed;font-size:11px}
.vc-spot.bj-side small{font-size:9px}
.bj .vc-stack b{font-size:11px}
.bj-shuffle{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);z-index:6;display:flex;gap:4px;pointer-events:none}
.bj-shuffle i{width:46px;height:64px;border-radius:5px;border:3px solid #f7f2e8;background:repeating-linear-gradient(45deg,#8c1020 0 4px,#6d0a18 4px 8px);box-shadow:0 4px 10px rgba(0,0,0,.5)}
.bj-shuffle i:nth-child(1){animation:bjrifL .45s ease-in-out infinite alternate}.bj-shuffle i:nth-child(2){animation:bjrifR .45s ease-in-out infinite alternate}
@keyframes bjrifL{from{transform:translateX(-30px) rotate(-12deg)}to{transform:translateX(18px) rotate(4deg)}}
@keyframes bjrifR{from{transform:translateX(30px) rotate(12deg)}to{transform:translateX(-18px) rotate(-4deg)}}
.bj .vc-btn.bj-hinted{box-shadow:0 0 0 3px #7dff9a,0 0 18px #7dff9a}
.bj.bj-locked .vc-rack{opacity:.35;pointer-events:none;filter:grayscale(.5)}
.bj-change{position:absolute;left:3%;bottom:4px;font:600 11px "Chakra Petch";color:var(--dim)}
@media (max-width:560px){
  .bj .vc-btn kbd{display:none}
  .bj .vc-btn{padding:9px 12px;min-height:44px}
  .bj.bj-locked .vc-rack-slot{display:none}
  .bj-arc .a1{font-size:27px}.bj-arc .a2{font-size:17px}.bj-arc .a3{display:none}
  .bj-shoe{right:1%}.bj-discard{left:1%}
  .bj-hbox{padding:4px 4px 3px}
  .bj .vc-card{--w:62px}.bj-hands.many .vc-card{--w:44px}
}
@media (max-height:860px) and (min-width:561px){.bj .vc-card{--w:clamp(52px,7vw,78px)}.bj-hands.many .vc-card{--w:clamp(42px,5.4vw,60px)}}
@media (max-height:700px) and (min-width:561px){.bj-arc{width:min(440px,70%)}.bj .vc-card{--w:clamp(48px,6vw,66px)}}
@media (max-height:600px){.bj-arc .a3,.bj-arc .band{display:none}.bj-arc{width:min(420px,70%);margin:-10px 0 -34px}.bj-hands{min-height:0}}
@media (max-height:470px){.bj-arc{display:none}.bj-lab{display:none}.bj-top{min-height:0}.bj .vc-msg{padding:3px 12px;font-size:14px}.bj .vc-bottom{padding-top:6px;padding-bottom:6px}}
@media (max-height:470px){.bj .vc-ttl small{display:none}.bj .vc-top{padding-top:5px;padding-bottom:5px}.bj .vc-btn kbd{display:none}.bj .vc-btn{min-height:38px;padding:7px 11px}.bj .vc-rack .vc-chip{--s:34px!important}.bj .vc-rack{padding:2px 6px}.bj.bj-locked .vc-rack-slot{display:none}.bj .vc-bottom{gap:6px 10px}}
@media (prefers-reduced-motion:reduce){.bj-shuffle i,.bj-peek .vc-card-in,.bj-res{animation:none}}
`;
  document.head.appendChild(s);
}

let uid = 0;
const MAX_MAIN = 5000, MAX_SIDE = 100, DECKS = 6;

export default {
  id: 'blackjack', title: 'Blackjack', kind: 'table',
  blurb: 'Six-deck blackjack: 3:2 naturals, dealer stands on 17, split, double, surrender and side bets.',
  mount(root, api) {
    injectStyle();
    const scr = K.table(root, api, { title: 'Blackjack', subtitle: '6 decks · Dealer stands on soft 17 · Blackjack pays 3:2', felt: 'green', rack: [1, 5, 25, 100, 500], rules: RULES });
    scr.el.classList.add('bj');
    const id = 'bj' + (++uid);
    scr.felt.innerHTML = `
      <div class="bj-table">
        <div class="bj-top">
          <div class="bj-discard" title="Discard tray"></div>
          <div class="bj-dealer"><span class="bj-lab">DEALER</span><div class="vc-hand bj-hand bj-dhand"></div><div class="bj-tot bj-dtot"></div></div>
          <div class="bj-shoe" title="Shoe"><div class="bj-shoe-box"><i class="bj-shoe-fill"></i><i class="bj-shoe-cut"></i></div><small class="bj-shoe-n"></small></div>
        </div>
        <svg class="bj-arc" viewBox="0 0 640 136" aria-label="Blackjack pays 3 to 2. Dealer stands on all 17s. Insurance pays 2 to 1.">
          <defs>
            <path id="${id}a1" d="M 40 26 Q 320 110 600 26"/>
            <path id="${id}a2" d="M 70 58 Q 320 136 570 58"/>
            <path id="${id}a3" d="M 110 92 Q 320 160 530 92"/>
          </defs>
          <path class="band" d="M 96 76 Q 320 146 544 76"/><path class="band" d="M 128 108 Q 320 172 512 108"/>
          <text class="a1"><textPath href="#${id}a1" startOffset="50%" text-anchor="middle">BLACKJACK PAYS 3 TO 2</textPath></text>
          <text class="a2"><textPath href="#${id}a2" startOffset="50%" text-anchor="middle">DEALER STANDS ON ALL 17s</textPath></text>
          <text class="a3"><textPath href="#${id}a3" startOffset="50%" text-anchor="middle">INSURANCE PAYS 2 TO 1</textPath></text>
        </svg>
        <div class="bj-ins"></div>
        <div class="bj-hands"></div>
        <div class="bj-spots"></div>
        <div class="bj-change"></div>
      </div>`;
    const $ = s => scr.felt.querySelector(s);
    const dHandEl = $('.bj-dhand'), dTotEl = $('.bj-dtot'), handsEl = $('.bj-hands'), spotsEl = $('.bj-spots'), tableEl = $('.bj-table');
    const shoeEl = $('.bj-shoe'), shoeFill = $('.bj-shoe-fill'), shoeCut = $('.bj-shoe-cut'), shoeN = $('.bj-shoe-n'), discardEl = $('.bj-discard'), changeEl = $('.bj-change');
    const insStack = K.chipStack(0); $('.bj-ins').appendChild(insStack.el);

    // ------------------------------------------------------------ state
    const shoe = new K.Shoe(DECKS, .25);
    let phase = 'bet', busy = false, hands = [], dealer = [], holeEl = null, holeHidden = false, active = 0;
    let insurance = 0, change = 0, lastBets = null, cutOut = false, choiceResolve = null, insOffer = null;
    let roundStake = 0, roundReturn = 0, dead = false, firstShoe = true;
    const bets = { main: 0, pp: 0, t3: 0 }; let history = [];
    const timers = new Set();
    const fast = () => !!window.__vcFast;
    const sleep = ms => new Promise(r => { const t = setTimeout(() => { timers.delete(t); r(); }, fast() ? Math.min(ms, 40) : ms); timers.add(t); });
    const msg = (t, k = '') => { if (!dead) scr.msg(t, k); };

    // ------------------------------------------------------------ money
    function pay(x) { // credit stake + winnings; half-dollars carried as change
      if (!(x > 0)) return;
      roundReturn += x;
      const tot = x + change, whole = Math.floor(tot + 1e-9);
      change = Math.round((tot - whole) * 100) / 100;
      if (whole > 0) api.win(whole);
      changeEl.textContent = change > 0 ? `Change held: $${change.toFixed(2)}` : '';
    }
    function stake(x) { if (!api.bet(x)) return false; roundStake += x; return true; }

    // ------------------------------------------------------------ shoe
    function updateShoe() {
      const n = shoe.cards.length, tot = DECKS * 52;
      shoeFill.style.height = `calc(${(n / tot) * 100}% - 6px)`;
      shoeCut.style.bottom = `calc(${(shoe.cut / tot) * 100}% + 2px)`;
      shoeCut.style.display = cutOut ? 'none' : '';
      shoeN.textContent = Math.round(n / 52 * 10) / 10 + 'D';
      shoeEl.title = `${n} cards left in the shoe`;
      shoeEl.classList.toggle('cut', cutOut);
    }
    function draw() {
      const st = window.__bjStack;
      if (Array.isArray(st) && st.length) return parseCard(st.shift());
      const c = shoe.draw();
      if (!cutOut && shoe.needsShuffle) cutOut = true;
      updateShoe();
      return c;
    }
    async function shuffleAnim(text) {
      const sh = document.createElement('div'); sh.className = 'bj-shuffle'; sh.innerHTML = '<i></i><i></i>';
      tableEl.appendChild(sh); msg(text);
      for (let i = 0; i < 4; i++) { K.sfx.chips(3); await sleep(300); }
      sh.remove();
      shoe.reset(); cutOut = false; discardEl.classList.remove('on'); updateShoe();
    }

    // ------------------------------------------------------------ bet spots
    const spots = {
      pp: K.betSpot('Perfect<br>Pairs', () => addChip('pp'), { cls: 'bj-side', sub: 'up to 25:1' }),
      main: K.betSpot('Bet', () => addChip('main'), { cls: 'bj-main' }),
      t3: K.betSpot('21+3', () => addChip('t3'), { cls: 'bj-side', sub: 'up to 100:1' }),
    };
    spotsEl.append(spots.pp.el, spots.main.el, spots.t3.el);
    for (const k of Object.keys(spots)) spots[k].onRemove = () => removeSpot(k);
    spots.pp.el.title = 'Perfect Pairs side bet: your first two cards form a pair';
    spots.t3.el.title = '21+3 side bet: your two cards plus the dealer up card make a poker hand';

    function addChip(k, v = scr.rack.value) {
      if (phase !== 'bet' || busy) return;
      const max = k === 'main' ? MAX_MAIN : MAX_SIDE;
      if (bets[k] + v > max) { msg(`Table limit: ${k === 'main' ? 'main bet' : 'side bets'} max ${K.fmt(max)}`, 'lose'); return; }
      if (!api.bet(v)) { msg(`Not enough chips for a ${K.fmt(v)} chip`, 'lose'); return; }
      bets[k] += v; history.push([k, v]); spots[k].set(bets[k]); K.sfx.chip();
      if (k !== 'main' && !bets.main) msg('Side bets need a main bet too — tap the circle'); else msg(`Bet ${K.fmt(bets.main)}${bets.pp ? ` · Perfect Pairs ${K.fmt(bets.pp)}` : ''}${bets.t3 ? ` · 21+3 ${K.fmt(bets.t3)}` : ''} — press Deal`);
      render();
    }
    function removeSpot(k) {
      if (phase !== 'bet' || busy || !bets[k]) return;
      api.win(bets[k]); bets[k] = 0; spots[k].set(0); history = history.filter(h => h[0] !== k); K.sfx.chips(2); render();
    }
    function undo() {
      if (phase !== 'bet' || !history.length) return;
      const [k, v] = history.pop(); bets[k] -= v; api.win(v); spots[k].set(bets[k]); K.sfx.chip(); render();
    }
    function clearBets() {
      if (phase !== 'bet') return;
      const t = bets.main + bets.pp + bets.t3; if (t) api.win(t);
      bets.main = bets.pp = bets.t3 = 0; history = []; Object.values(spots).forEach(s => s.set(0)); if (t) K.sfx.chips(3);
      msg('Bets cleared — pick a chip and tap the circle'); render();
    }
    const sumBets = b => b ? b.main + b.pp + b.t3 : 0;
    function rebet(andDeal) {
      if (phase !== 'bet' || busy || !lastBets || sumBets(bets)) return;
      if (sumBets(lastBets) > api.balance) { msg(`Not enough chips to rebet ${K.fmt(sumBets(lastBets))}`, 'lose'); return; }
      for (const k of ['main', 'pp', 't3']) if (lastBets[k]) { api.bet(lastBets[k]); bets[k] = lastBets[k]; history.push([k, lastBets[k]]); spots[k].set(bets[k]); }
      K.sfx.chips(4);
      if (andDeal) deal(); else { msg(`Rebet ${K.fmt(sumBets(bets))} — press Deal`); render(); }
    }

    // ------------------------------------------------------------ hands
    function newHand(bet) {
      const box = document.createElement('div'); box.className = 'bj-hbox';
      box.innerHTML = `<div class="bj-tot"></div><div class="vc-hand bj-hand"></div><div class="bj-hbet"></div>`;
      return { cards: [], bet, doubled: false, fromSplit: false, splitAces: false, done: false, surrendered: false, result: null,
        box, handEl: box.querySelector('.vc-hand'), totEl: box.querySelector('.bj-tot'), betEl: box.querySelector('.bj-hbet') };
    }
    const isBJ = h => h.cards.length === 2 && !h.fromSplit && bjValue(h.cards).total === 21;
    function handLabel(cards, natural) {
      if (!cards.length) return '';
      const v = bjValue(cards);
      if (natural && cards.length === 2 && v.total === 21) return 'BJ';
      if (v.soft && v.total < 21) return `${v.low}/${v.total}`;
      return String(v.total);
    }
    function paintTot(el, cards, natural) {
      const v = bjValue(cards), lab = handLabel(cards, natural);
      el.textContent = lab; el.classList.toggle('bust', v.total > 21); el.classList.toggle('bj', lab === 'BJ'); el.classList.toggle('t21', lab === '21');
    }
    function updateHand(h) {
      paintTot(h.totEl, h.cards, !h.fromSplit);
      h.betEl.textContent = h.bet ? K.fmt(h.bet) + (h.doubled ? ' · DOUBLED' : '') : '';
    }
    function updateDealer() { if (holeHidden) paintTot(dTotEl, dealer.slice(0, 1), false); else paintTot(dTotEl, dealer, true); }
    function layoutHands() {
      queueFit();
      hands.forEach(h => handsEl.appendChild(h.box));
      handsEl.classList.toggle('many', hands.length > 2);
      hands.forEach((h, i) => { h.box.classList.toggle('act', phase === 'play' && i === active && hands.length >= 1); h.box.classList.toggle('over', phase === 'play' && hands.length > 1 && i !== active); });
      spots.main.set(phase === 'bet' ? bets.main : hands.reduce((s, h) => s + (h.surrendered ? 0 : h.bet), 0));
    }
    function tag(h, text, kind) {
      h.box.querySelector('.bj-res')?.remove();
      const t = document.createElement('div'); t.className = 'bj-res ' + kind; t.textContent = text; h.box.appendChild(t);
    }
    async function give(h, { dbl = false } = {}) {
      const c = draw(); h.cards.push(c);
      const el = await K.dealTo(h.handEl, c, { fast: fast() });
      if (dbl) el.classList.add('bj-dbl');
      updateHand(h); return c;
    }
    async function giveDealer(faceDown = false) {
      const c = draw(); dealer.push(c);
      const el = await K.dealTo(dHandEl, faceDown ? null : c, { faceDown, fast: fast() });
      if (faceDown) { holeEl = el; holeHidden = true; }
      updateDealer(); return c;
    }
    async function revealHole() {
      if (!holeHidden) return;
      holeHidden = false; K.flipCard(holeEl, dealer[1]); updateDealer(); await sleep(450);
    }

    // ------------------------------------------------------------ round
    async function sweep() {
      if (!dHandEl.children.length && !handsEl.children.length) return;
      tableEl.classList.add('bj-sweep'); await sleep(330); tableEl.classList.remove('bj-sweep');
      dHandEl.innerHTML = ''; handsEl.innerHTML = ''; dTotEl.textContent = ''; discardEl.classList.add('on');
    }
    async function deal() {
      if (phase !== 'bet' || busy || !bets.main) return;
      busy = true; phase = 'deal'; lastBets = { ...bets }; history = []; hands = [];
      roundStake = bets.main + bets.pp + bets.t3; roundReturn = 0; insurance = 0; insStack.set(0);
      render();
      await sweep();
      if (firstShoe) { firstShoe = false; }
      else if (cutOut || shoe.needsShuffle) await shuffleAnim('Cut card reached — shuffling a fresh 6-deck shoe…');
      hands = [newHand(bets.main)]; dealer = []; holeEl = null; holeHidden = false; active = 0;
      layoutHands(); msg('Dealing…');
      await give(hands[0]); await giveDealer(); await give(hands[0]); await giveDealer(true);
      const h = hands[0], up = dealer[0], pBJ = isBJ(h);
      const notes = [];
      // side bets
      if (bets.pp) {
        const r = perfectPairs(h.cards[0], h.cards[1]);
        if (r) { pay(bets.pp * (r.mult + 1)); spots.pp.flash('win'); notes.push(`${r.name}! Perfect Pairs pays ${K.fmt(bets.pp * r.mult)}`); }
        else { spots.pp.flash('lose'); notes.push('Perfect Pairs loses'); }
        bets.pp = 0;
      }
      if (bets.t3) {
        const r = twentyOnePlus3([h.cards[0], h.cards[1], up]);
        if (r) { pay(bets.t3 * (r.mult + 1)); spots.t3.flash('win'); notes.push(`${r.name}! 21+3 pays ${K.fmt(bets.t3 * r.mult)}`); }
        else { spots.t3.flash('lose'); notes.push('21+3 loses'); }
        bets.t3 = 0;
      }
      if (notes.length) {
        const won = notes.some(n => n.includes('pays'));
        msg(notes.join(' · '), won ? 'win' : ''); if (won) K.sfx.win();
        await sleep(won ? 1300 : 800);
      }
      bets.pp = bets.t3 = 0; spots.pp.set(0); spots.t3.set(0);

      // insurance / even money
      if (up.r === 'A') {
        const cost = Math.floor(h.bet / 2);
        insOffer = { pBJ, cost }; phase = 'insurance'; busy = false; render();
        msg(pBJ ? 'You have blackjack and the dealer shows an ace — take even money?' : `Dealer shows an ace — insurance for ${K.fmt(cost)}?`);
        const choice = await new Promise(r => { choiceResolve = r; });
        choiceResolve = null; busy = true; phase = 'deal'; insOffer = null; render();
        if (choice === 'even') {
          await revealHole(); pay(h.bet * 2); h.result = 'even'; tag(h, 'EVEN MONEY', 'win'); spots.main.flash('win');
          return finish(`Even money — paid ${K.fmt(h.bet)} on your blackjack`, 'win', 'EVEN MONEY');
        }
        if (choice === 'ins' && cost >= 1 && stake(cost)) { insurance = cost; insStack.set(cost); K.sfx.chips(2); }
      }
      // dealer peek
      if (up.r === 'A' || TEN.has(up.r)) {
        msg('Dealer checks for blackjack…');
        holeEl.classList.add('bj-peek'); await sleep(800); holeEl.classList.remove('bj-peek');
        if (bjValue(dealer).total === 21) {
          await revealHole();
          let txt = 'Dealer has blackjack';
          if (insurance) { pay(insurance * 3); txt += ` — insurance pays ${K.fmt(insurance * 2)}`; insStack.set(0); }
          if (pBJ) { pay(h.bet); h.result = 'push'; tag(h, 'PUSH', 'push'); txt += ' — your blackjack pushes'; }
          else { h.result = 'lose'; tag(h, 'LOSE', 'lose'); spots.main.flash('lose'); if (!insurance) txt += ` — you lose ${K.fmt(h.bet)}`; }
          return finish(txt, null, 'DEALER BLACKJACK');
        }
        if (insurance) { msg(`No dealer blackjack — insurance loses ${K.fmt(insurance)}`, 'lose'); insStack.set(0); insurance = 0; await sleep(900); }
        else { msg('Dealer does not have blackjack'); await sleep(450); }
      }
      if (pBJ) {
        await revealHole();
        const prof = h.bet * 1.5; pay(h.bet + prof); h.result = 'bj'; tag(h, 'BLACKJACK', 'bj'); spots.main.flash('win');
        return finish(`Blackjack! Paid 3 to 2 — you win ${K.fmt(prof)}${prof % 1 ? ' (+50¢ change)' : ''}`, 'win', 'BLACKJACK!', true);
      }
      phase = 'play'; busy = false; active = 0; layoutHands(); render();
      const v = bjValue(h.cards);
      msg(`You have ${handLabel(h.cards)} against a dealer ${up.r === 'A' ? 'ace' : pts(up)} — hit or stand?`);
    }
    function choose(c) { if (phase === 'insurance' && choiceResolve) choiceResolve(c); }

    const cur = () => hands[active];
    const canDouble = h => phase === 'play' && h && h.cards.length === 2 && !h.splitAces && api.balance >= h.bet;
    const canSplit = h => phase === 'play' && h && h.cards.length === 2 && pts(h.cards[0]) === pts(h.cards[1]) && hands.length < 4 && !h.splitAces && api.balance >= h.bet;
    const canSurr = h => phase === 'play' && h && hands.length === 1 && !h.fromSplit && h.cards.length === 2;

    async function act(kind) {
      if (phase !== 'play' || busy) return;
      const h = cur(); if (!h) return;
      busy = true; render(); clearHint();
      const nm = hands.length > 1 ? `Hand ${active + 1}: ` : '';
      if (kind === 'hit') {
        await give(h); const v = bjValue(h.cards);
        if (v.total > 21) { h.done = true; h.result = 'bust'; tag(h, 'BUST', 'lose'); K.sfx.lose(); msg(`${nm}Bust with ${v.total}`, 'lose'); await sleep(600); }
        else if (v.total === 21) { h.done = true; msg(`${nm}21!`); await sleep(300); }
        else msg(`${nm}${handLabel(h.cards)} — hit or stand?`);
      } else if (kind === 'stand') {
        h.done = true; msg(`${nm}Stand on ${bjValue(h.cards).total}`);
      } else if (kind === 'double') {
        if (!canDouble(h) || !stake(h.bet)) { busy = false; render(); return msg('Not enough chips to double', 'lose'); }
        h.bet *= 2; h.doubled = true; h.box.classList.add('dbl'); updateHand(h); layoutHands(); K.sfx.chips(3);
        await give(h, { dbl: true }); const v = bjValue(h.cards); h.done = true;
        if (v.total > 21) { h.result = 'bust'; tag(h, 'BUST', 'lose'); K.sfx.lose(); msg(`${nm}Doubled and bust with ${v.total}`, 'lose'); }
        else msg(`${nm}Doubled to ${K.fmt(h.bet)} — ${v.total}`);
        await sleep(600);
      } else if (kind === 'split') {
        if (!canSplit(h) || !stake(h.bet)) { busy = false; render(); return msg('Not enough chips to split', 'lose'); }
        const aces = h.cards[0].r === 'A';
        const nh = newHand(h.bet); nh.fromSplit = h.fromSplit = true; nh.splitAces = h.splitAces = aces;
        nh.cards.push(h.cards.pop()); nh.handEl.appendChild(h.handEl.lastElementChild);
        hands.splice(active + 1, 0, nh); layoutHands(); updateHand(h); updateHand(nh); K.sfx.chips(3);
        msg(aces ? 'Splitting aces — one card each' : `Split into ${hands.length} hands`);
        await sleep(300);
        await give(h);
        if (aces) { h.done = true; await give(nh); nh.done = true; await sleep(500); }
        else if (bjValue(h.cards).total === 21) { h.done = true; await sleep(300); }
        else msg(`Hand ${active + 1}: ${handLabel(h.cards)} — hit or stand?`);
      } else if (kind === 'surrender') {
        if (!canSurr(h)) { busy = false; render(); return; }
        h.surrendered = true; h.done = true; h.result = 'surr'; pay(h.bet / 2); tag(h, 'SURRENDER', 'push'); layoutHands();
        msg(`Surrendered — ${K.fmt(Math.floor(h.bet / 2))}${h.bet % 2 ? '.50' : ''} returned`, 'push'); await sleep(500);
      }
      busy = false;
      await advance();
    }
    async function advance() {
      busy = true;
      while (active < hands.length && hands[active].done) {
        active++;
        if (active < hands.length) {
          const h = hands[active]; layoutHands();
          if (h.cards.length === 1) {
            await give(h);
            if (h.splitAces || bjValue(h.cards).total === 21) { h.done = true; await sleep(300); }
          }
          if (!h.done) msg(`Hand ${active + 1}: ${handLabel(h.cards)} — hit or stand?`);
        }
      }
      if (active >= hands.length) return dealerPlay();
      busy = false; layoutHands(); render();
    }
    async function dealerPlay() {
      phase = 'dealer'; busy = true; layoutHands(); render();
      await revealHole();
      const live = hands.filter(h => !h.surrendered && h.result !== 'bust');
      if (live.length) {
        while (bjValue(dealer).total < 17) { msg(`Dealer has ${handLabel(dealer)} — draws`); await sleep(350); await giveDealer(); }
      }
      const dv = bjValue(dealer).total, dBust = dv > 21;
      const outs = [];
      for (const [i, h] of hands.entries()) {
        let o;
        if (h.surrendered) o = 'surr';
        else if (h.result === 'bust') o = 'lose';
        else { const pv = bjValue(h.cards).total; o = dBust || pv > dv ? 'win' : pv === dv ? 'push' : 'lose'; }
        if (o === 'win') { pay(h.bet * 2); tag(h, 'WIN +' + K.fmt(h.bet), 'win'); }
        else if (o === 'push') { pay(h.bet); tag(h, 'PUSH', 'push'); }
        else if (o === 'lose' && h.result !== 'bust') tag(h, 'LOSE', 'lose');
        h.result = h.result || o; outs.push([i, o, h]);
      }
      const dTxt = !live.length ? '' : dBust ? `Dealer busts with ${dv}` : `Dealer stands on ${dv}`;
      let txt;
      const net = roundReturn - roundStake;
      if (hands.length === 1) {
        const [, o, h] = outs[0];
        if (o === 'surr') txt = `Surrendered — half your bet back, you lose ${K.fmt(h.bet / 2)}${h.bet % 2 ? '.50' : ''} (dealer had ${dv})`;
        else if (h.result === 'bust' && !live.length) txt = `Bust — you lose ${K.fmt(h.bet)}`;
        else txt = `${dTxt} — ` + (o === 'win' ? `you win ${K.fmt(h.bet)}` : o === 'push' ? `push, ${K.fmt(h.bet)} returned` : `you lose ${K.fmt(h.bet)}`);
      } else {
        const w = { win: 'wins', push: 'pushes', lose: 'loses', surr: 'surrendered' };
        txt = (dTxt ? dTxt + ' — ' : 'All hands bust — ') + outs.map(([i, o]) => `H${i + 1} ${w[o]}`).join(', ');
      }
      if (outs.some(o => o[1] === 'win')) spots.main.flash('win'); else if (outs.every(o => o[1] === 'lose')) spots.main.flash('lose');
      return finish(txt);
    }
    function finish(txt, kindOverride, bannerText, big) {
      const net = Math.round((roundReturn - roundStake) * 100) / 100;
      const kind = kindOverride || (net > 0 ? 'win' : net < 0 ? 'lose' : 'push');
      if (hands.length > 1 || roundStake !== (hands[0] && hands[0].bet)) txt += ` · net ${net >= 0 ? '+' : '−'}${K.fmt(Math.abs(net))}`;
      msg(txt, kind);
      if (net > 0) { K.banner(scr, bannerText || '+' + K.fmt(net), 'win'); big ? K.sfx.bigWin() : K.sfx.win(); }
      else if (net < 0) { K.banner(scr, bannerText || 'DEALER WINS', 'lose'); K.sfx.lose(); }
      else { K.banner(scr, bannerText || 'PUSH', 'push'); K.sfx.push(); }
      phase = 'bet'; busy = false; bets.main = 0; spots.main.set(0); insStack.set(0);
      hands.forEach(h => h.box.classList.remove('act', 'over'));
      render();
      if (api.balance < 1 && !lastBets) msg('Out of chips — visit the cashier', 'lose');
    }

    // ------------------------------------------------------------ hints
    function clearHint() { Object.values(B).forEach(b => b.classList.remove('bj-hinted')); }
    function hint() {
      const h = cur(); if (phase !== 'play' || !h) return;
      const a = basicStrategy(h.cards, dealer[0], { canDouble: canDouble(h), canSplit: canSplit(h), canSurrender: canSurr(h) });
      const map = { H: ['Hit', B.hit], S: ['Stand', B.stand], D: ['Double down', B.double], P: ['Split', B.split], R: ['Surrender', B.surr] };
      clearHint(); map[a][1].classList.add('bj-hinted');
      msg(`Basic strategy says: ${map[a][0]} (${handLabel(h.cards)} vs dealer ${dealer[0].r === 'A' ? 'ace' : pts(dealer[0])})`);
    }

    // ------------------------------------------------------------ controls
    const kb = k => `<kbd>${k}</kbd>`;
    const B = {
      undo: K.button('Undo', undo, { title: 'Remove last chip (U)' }),
      clear: K.button('Clear', clearBets, { title: 'Take back all bets' }),
      rebet: K.button('Rebet', () => rebet(false), { title: 'Place the same bets as last hand' }),
      rebetDeal: K.button('Rebet &amp; Deal' + kb('↵'), () => rebet(true), { primary: true }),
      deal: K.button('Deal' + kb('↵'), deal, { primary: true }),
      ins: K.button('Insurance' + kb('I'), () => choose('ins')),
      even: K.button('Even money' + kb('E'), () => choose('even'), { primary: true }),
      noins: K.button('No thanks' + kb('N'), () => choose('no')),
      hit: K.button('Hit' + kb('H'), () => act('hit'), { primary: true }),
      stand: K.button('Stand' + kb('S'), () => act('stand'), { primary: true }),
      double: K.button('Double' + kb('D'), () => act('double')),
      split: K.button('Split' + kb('P'), () => act('split')),
      surr: K.button('Surrender' + kb('R'), () => act('surrender')),
      hint: K.button('Hint' + kb('?'), hint, { cls: 'ghost', title: 'Basic strategy suggestion' }),
    };
    Object.values(B).forEach(b => scr.controls.appendChild(b));
    const keymap = [['Enter', B.deal], ['Enter', B.rebetDeal], ['i', B.ins], ['e', B.even], ['n', B.noins], ['h', B.hit], ['s', B.stand], ['d', B.double],
      ['p', B.split], ['r', B.surr], ['?', B.hint], ['/', B.hint], ['u', B.undo], ['Backspace', B.undo], ['c', B.clear]];
    const onKey = e => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      for (const [kk, b] of keymap) if (kk === k && !b.disabled && !b.hidden && b.isConnected) { e.preventDefault(); b.click(); return; }
    };
    window.addEventListener('keydown', onKey);
    const show = (b, on) => { b.hidden = !on; };

    function render() {
      if (dead) return;
      const betP = phase === 'bet', insP = phase === 'insurance', playP = phase === 'play' && !busy;
      const total = sumBets(bets), h = cur();
      show(B.undo, betP); B.undo.disabled = busy || !history.length;
      show(B.clear, betP); B.clear.disabled = busy || !total;
      const reb = betP && !total && !!lastBets;
      show(B.rebet, reb); show(B.rebetDeal, reb); B.rebet.disabled = B.rebetDeal.disabled = busy || !lastBets || sumBets(lastBets) > api.balance;
      show(B.deal, betP && !reb); B.deal.disabled = busy || !bets.main;
      show(B.ins, insP && insOffer && !insOffer.pBJ); B.ins.disabled = !insOffer || insOffer.cost < 1 || api.balance < insOffer.cost;
      if (insOffer) B.ins.innerHTML = `Insurance ${K.fmt(insOffer.cost)}` + kb('I');
      show(B.even, insP && insOffer && insOffer.pBJ); show(B.noins, insP);
      const play = !betP && !insP;
      for (const k of ['hit', 'stand', 'double', 'split', 'surr', 'hint']) show(B[k], play);
      B.hit.disabled = B.stand.disabled = B.hint.disabled = !playP;
      B.double.disabled = !playP || !canDouble(h);
      B.split.disabled = !playP || !canSplit(h);
      B.surr.disabled = !playP || !canSurr(h);
      scr.setBusy(!betP || busy);
      scr.el.classList.toggle('bj-locked', !betP);
    }


    // ------------------------------------------------------------ fit the layout to the felt height (scale down when short)
    let fitRaf = 0;
    function fit() {
      if (dead) return;
      const el = tableEl, felt = scr.felt, cs = getComputedStyle(felt);
      const avail = felt.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      el.style.transform = ''; el.style.marginBottom = ''; el.style.minHeight = '0px';
      const nat = el.offsetHeight;
      if (avail > 0 && nat > avail + 1) {
        const s = Math.max(.35, avail / nat);
        el.style.transformOrigin = '50% 0'; el.style.transform = `scale(${s})`;
        el.style.minHeight = nat + 'px'; el.style.marginBottom = (avail - nat) + 'px';
      } else el.style.minHeight = Math.max(avail, 0) + 'px';
    }
    const queueFit = () => { cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(fit); };
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(queueFit) : null;
    if (ro) ro.observe(scr.felt); else window.addEventListener('resize', queueFit);

    // ------------------------------------------------------------ boot
    updateShoe(); render(); queueFit();
    msg('Pick a chip, tap the circle to bet, then Deal');
    window.__bjState = () => ({ phase, busy, change, insurance, hands: hands.map(h => ({ cards: h.cards.map(c => c.r + c.s), bet: h.bet, result: h.result, done: h.done })), dealer: dealer.map(c => c.r + c.s), bets: { ...bets }, shoe: shoe.cards.length, cutOut });

    return {
      unmount() {
        dead = true;
        timers.forEach(t => clearTimeout(t)); timers.clear();
        cancelAnimationFrame(fitRaf); if (ro) ro.disconnect(); else window.removeEventListener('resize', queueFit);
        window.removeEventListener('keydown', onKey);
        // return chips still sitting on the layout (not yet in play)
        if (phase === 'bet') { const t = sumBets(bets); if (t) api.win(t); }
        else { // leaving mid-hand: unresolved wagers are returned
          const t = hands.filter(h => !h.result).reduce((s, h) => s + h.bet, 0) + insurance + bets.pp + bets.t3 + (hands.length ? 0 : bets.main);
          if (t) api.win(t);
        }
        if (window.__bjState) delete window.__bjState;
        scr.destroy();
      }
    };
  }
};
