// Valley Casino — Video Poker machine (Jacks or Better 9/6, Bonus Poker, Double Double Bonus, Deuces Wild, Joker Poker).
import * as K from './_kit.js';

const RV = r => (r === 'JK' ? 0 : K.rankValue(r));
const ROYAL_MAX = 4000; // natural royal at 5 credits

// ---------------------------------------------------------------- pay tables (per credit; row[3] = royal bonus at max bet)
export const VARIANTS = {
  job: { name: 'Jacks or Better', tag: '9/6 Full Pay', deck: 52, rows: [
    ['royal', 'Royal Flush', 250, true], ['sf', 'Straight Flush', 50], ['quads', 'Four of a Kind', 25], ['fh', 'Full House', 9],
    ['flush', 'Flush', 6], ['straight', 'Straight', 4], ['trips', 'Three of a Kind', 3], ['twopair', 'Two Pair', 2], ['jacks', 'Jacks or Better', 1]] },
  bonus: { name: 'Bonus Poker', tag: '8/5', deck: 52, rows: [
    ['royal', 'Royal Flush', 250, true], ['sf', 'Straight Flush', 50], ['q_a', 'Four Aces', 80], ['q_24', 'Four 2s–4s', 40], ['q_5k', 'Four 5s–Ks', 25],
    ['fh', 'Full House', 8], ['flush', 'Flush', 5], ['straight', 'Straight', 4], ['trips', 'Three of a Kind', 3], ['twopair', 'Two Pair', 2], ['jacks', 'Jacks or Better', 1]] },
  ddb: { name: 'Double Double Bonus', tag: '9/6', deck: 52, rows: [
    ['royal', 'Royal Flush', 250, true], ['sf', 'Straight Flush', 50], ['q_a_k', 'Four Aces + 2–4', 400], ['q_24_k', 'Four 2s–4s + A–4', 160],
    ['q_a', 'Four Aces', 160], ['q_24', 'Four 2s–4s', 80], ['q_5k', 'Four 5s–Ks', 50], ['fh', 'Full House', 9], ['flush', 'Flush', 6],
    ['straight', 'Straight', 4], ['trips', 'Three of a Kind', 3], ['twopair', 'Two Pair', 1], ['jacks', 'Jacks or Better', 1]] },
  deuces: { name: 'Deuces Wild', tag: 'Full Pay', deck: 52, wild: c => c.r === '2', rows: [
    ['nroyal', 'Natural Royal', 250, true], ['deuces4', 'Four Deuces', 200], ['wroyal', 'Wild Royal', 25], ['five', 'Five of a Kind', 15],
    ['sf', 'Straight Flush', 9], ['quads', 'Four of a Kind', 5], ['fh', 'Full House', 3], ['flush', 'Flush', 2], ['straight', 'Straight', 2], ['trips', 'Three of a Kind', 1]] },
  joker: { name: 'Joker Poker', tag: 'Kings or Better', deck: 53, wild: c => c.r === 'JK', rows: [
    ['nroyal', 'Natural Royal', 250, true], ['five', 'Five of a Kind', 200], ['wroyal', 'Wild Royal', 100], ['sf', 'Straight Flush', 50],
    ['quads', 'Four of a Kind', 20], ['fh', 'Full House', 7], ['flush', 'Flush', 5], ['straight', 'Straight', 3], ['trips', 'Three of a Kind', 2],
    ['twopair', 'Two Pair', 1], ['kings', 'Kings or Better', 1]] }
};
export const payOf = (row, coins) => (row[3] && coins === 5 ? ROYAL_MAX : row[2] * coins);

// ---------------------------------------------------------------- evaluation
// Summarise a hand with wild cards removed: counts of natural ranks, suitedness, and whether the naturals fit in a
// straight window (wilds fill the gaps). Works for 0..4 wilds.
export function wildInfo(cards, isWild) {
  const nat = cards.filter(c => !isWild(c)), w = cards.length - nat.length;
  const vals = nat.map(c => RV(c.r)), cnt = {};
  vals.forEach(v => { cnt[v] = (cnt[v] || 0) + 1; });
  const cs = Object.values(cnt).sort((a, b) => b - a);
  const c1 = cs[0] || 0, c2 = cs[1] || 0;
  const suited = nat.every(c => c.s === nat[0].s);
  const distinct = c1 <= 1;
  const fits = lo => vals.every(v => (v >= lo && v <= lo + 4) || (lo === 1 && v === 14));
  let straight = false;
  if (distinct) for (let lo = 1; lo <= 10 && !straight; lo++) straight = fits(lo);
  return { w, nat, vals, cnt, c1, c2, suited, straight, royal: distinct && fits(10) };
}
const fhNeed = i => Math.max(0, 3 - i.c1) + Math.max(0, 2 - i.c2);

// Returns the pay-row key for a final 5-card hand in the given variant, or null for a losing hand.
export function classify(vid, cards) {
  if (vid === 'deuces') {
    const i = wildInfo(cards, VARIANTS.deuces.wild);
    if (i.w === 0 && i.suited && i.royal) return 'nroyal';
    if (i.w === 4) return 'deuces4';
    if (i.suited && i.royal) return 'wroyal';
    if (i.c1 + i.w >= 5) return 'five';
    if (i.suited && i.straight) return 'sf';
    if (i.c1 + i.w >= 4) return 'quads';
    if (fhNeed(i) <= i.w) return 'fh';
    if (i.suited) return 'flush';
    if (i.straight) return 'straight';
    if (i.c1 + i.w >= 3) return 'trips';
    return null;
  }
  if (vid === 'joker') {
    const i = wildInfo(cards, VARIANTS.joker.wild);
    if (i.w === 0 && i.suited && i.royal) return 'nroyal';
    if (i.c1 + i.w >= 5) return 'five';
    if (i.suited && i.royal) return 'wroyal';
    if (i.suited && i.straight) return 'sf';
    if (i.c1 + i.w >= 4) return 'quads';
    if (fhNeed(i) <= i.w) return 'fh';
    if (i.suited) return 'flush';
    if (i.straight) return 'straight';
    if (i.c1 + i.w >= 3) return 'trips';
    if (i.w === 0 && i.c1 === 2 && i.c2 === 2) return 'twopair';
    if (i.w === 0 && i.c1 === 2 && Object.keys(i.cnt).some(k => i.cnt[k] === 2 && +k >= 13)) return 'kings';
    if (i.w === 1 && i.vals.some(v => v >= 13)) return 'kings';
    return null;
  }
  const e = K.evalHand(cards), cnt = {};
  cards.forEach(c => { const v = RV(c.r); cnt[v] = (cnt[v] || 0) + 1; });
  const rankWith = n => +Object.keys(cnt).find(k => cnt[k] === n);
  switch (e.cat) {
    case 9: return 'royal';
    case 8: return 'sf';
    case 7: {
      if (vid === 'job') return 'quads';
      const q = rankWith(4), k = rankWith(1);
      if (vid === 'ddb') {
        if (q === 14 && k >= 2 && k <= 4) return 'q_a_k';
        if (q <= 4 && (k === 14 || k <= 4)) return 'q_24_k';
      }
      return q === 14 ? 'q_a' : q <= 4 ? 'q_24' : 'q_5k';
    }
    case 6: return 'fh';
    case 5: return 'flush';
    case 4: return 'straight';
    case 3: return 'trips';
    case 2: return 'twopair';
    case 1: return rankWith(2) >= 11 ? 'jacks' : null;
    default: return null;
  }
}

function newDeck(n) {
  const d = []; for (const s of K.SUITS) for (const r of K.RANKS) d.push({ r, s });
  if (n === 53) d.push({ r: 'JK', s: 'j' });
  return K.shuffle(d);
}
// parse 'As','10h','2c','JK' → card
const parseCard = t => (t.toUpperCase() === 'JK' ? { r: 'JK', s: 'j' } : { r: t.slice(0, -1).toUpperCase(), s: t.slice(-1).toLowerCase() });

// ---------------------------------------------------------------- styles
const CSS = `
.vp-screen{--vpY:#ffe600;--vpR:#ff3b30}
.vp-screen .vc-rules[hidden]{display:none}
.vp-screen .vc-felt{justify-content:flex-start;padding:10px 12px;background:radial-gradient(ellipse at 50% 0%,rgba(120,60,200,.35),transparent 60%)}
.vp-cab{margin:auto 0;width:min(840px,100%);display:flex;flex-direction:column;gap:clamp(5px,1vh,12px);padding:clamp(8px,min(1.4vw,1.6vh),16px);border-radius:20px;box-sizing:border-box;
  background:linear-gradient(160deg,#3a3a46,#16161c 45%,#24242c);border:1px solid #6d6d78;
  box-shadow:0 0 0 3px #050505,0 0 0 6px #b8902f,0 0 0 7px #f3d27e,0 24px 60px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.25)}
.vp-marq{position:relative;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 12px;border-radius:12px;
  background:linear-gradient(#3b0a5c,#1a0230);border:2px solid #f3d27e;box-shadow:inset 0 0 18px rgba(255,0,200,.35)}
.vp-marq b{display:block;font:400 clamp(13px,min(2.6vw,3vh),24px) "Bungee",Impact,sans-serif;color:#fff;text-shadow:0 0 8px #ff4fd8,0 0 18px #ff00aa,0 2px 0 #000;letter-spacing:.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vp-marq small{display:block;font:700 10px "Chakra Petch",sans-serif;color:#ffd6f5;letter-spacing:.18em;text-transform:uppercase}
.vp-bulbs{position:absolute;inset:-5px;border-radius:15px;pointer-events:none;
  background:radial-gradient(circle,#fff6b0 0 2px,transparent 2.6px) 0 0/14px 14px;-webkit-mask:linear-gradient(#000,#000) content-box,linear-gradient(#000,#000);
  -webkit-mask-composite:xor;mask-composite:exclude;padding:4px;animation:vpbulb 1s steps(2) infinite}
@keyframes vpbulb{50%{background-position:7px 0}}
.vp-sels{display:flex;gap:6px;flex:none}
.vp-sel{font:700 12px "Chakra Petch",sans-serif;color:#1d1404;background:linear-gradient(#ffe9a3,#d8a83a);border:1px solid #fff2c4;border-radius:8px;padding:6px 8px;min-height:34px;cursor:pointer;max-width:46vw}
.vp-sel:disabled{opacity:.5;cursor:not-allowed}
.vp-pay{background:linear-gradient(#0a2bb0,#061a7a);border:3px solid #f3d27e;border-radius:8px;padding:4px 2px;box-shadow:inset 0 0 20px rgba(0,0,0,.5)}
.vp-pay table{width:100%;border-collapse:collapse;table-layout:fixed;font:700 clamp(10px,min(1.45vw,1.75vh),15px)/1.14 "Chakra Petch",sans-serif;color:var(--vpY);text-transform:uppercase;text-shadow:1px 1px 0 #000;font-variant-numeric:tabular-nums}
.vp-pay col.n{width:38%}
.vp-pay td{padding:0 clamp(3px,.8vw,10px);text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vp-pay td:first-child{text-align:left}
.vp-pay td.on{background:#c40018;color:#fff8b0}
.vp-pay tr.hit td{animation:vphit .45s steps(2) infinite}
.vp-pay tr.dealt td:first-child{color:#fff}
@keyframes vphit{0%{background:#ffe600;color:#c40018;text-shadow:none}50%{}}
.vp-crt{position:relative;overflow:hidden;border-radius:16px/22px;padding:clamp(6px,1.2vh,12px) clamp(6px,1.4vw,16px) clamp(6px,1vh,10px);border:5px solid #050505;
  background:radial-gradient(ellipse at 50% 35%,#2350ee 0%,#0c2196 55%,#040d48 100%);box-shadow:0 0 0 2px #555,inset 0 0 50px rgba(0,0,10,.7)}
.vp-crt::after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;
  background:repeating-linear-gradient(rgba(0,0,0,0) 0 2px,rgba(0,0,0,.16) 2px 3px),radial-gradient(ellipse at 30% 0%,rgba(255,255,255,.14),transparent 50%)}
.vp-status{position:relative;z-index:1;text-align:center;min-height:1.6em;font:400 clamp(10px,min(1.7vw,2vh),16px)/1.5 "Press Start 2P",monospace;color:var(--vpY);text-shadow:2px 2px 0 #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vp-status.red{color:#ff6a5e}.vp-status.blink{animation:vpblink .7s steps(2) infinite}
@keyframes vpblink{50%{opacity:.25}}
.vp-cards{position:relative;z-index:1;display:grid;grid-template-columns:repeat(5,auto);justify-content:center;gap:clamp(4px,1.2vw,14px);margin:4px 0}
.vp-screen .vc-card{--w:clamp(48px,min(14vw,12.5vh),124px)}
.vp-slot{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;background:none;border:0;padding:0;cursor:pointer;color:inherit;-webkit-tap-highlight-color:transparent}
.vp-slot:disabled{cursor:default}
.vp-held{font:400 clamp(9px,1.4vw,13px)/1 "Press Start 2P",monospace;color:var(--vpY);text-shadow:2px 2px 0 #000;visibility:hidden;height:1em}
.vp-slot.held .vp-held{visibility:visible}
.vp-slot.held .vc-card{transform:translateY(-3px)}.vp-slot.held .vc-face{box-shadow:0 0 0 3px var(--vpY),0 0 16px rgba(255,230,0,.6)}
.vp-slot .vc-card{transition:transform .15s}
.vp-slot.lose .vc-card{filter:brightness(.55) saturate(.6)}
.vp-tag{position:absolute;left:50%;bottom:-2px;transform:translate(-50%,0);z-index:2;font:400 8px/1 "Press Start 2P",monospace;padding:3px 4px;border-radius:3px;background:#ff3b30;color:#fff;box-shadow:0 1px 0 #000;pointer-events:none;white-space:nowrap}
.vp-tag.dealer{background:#ffe600;color:#000}
.vp-joker{background:linear-gradient(160deg,#fff,#f5eefc)!important;color:#5a1a9a}
.vp-jk{position:absolute;inset:14% 14%;border-radius:6px;display:grid;place-items:center;align-content:center;gap:2px;background:radial-gradient(circle at 50% 40%,#ffe7a0,#f0b400 40%,#7b3fbf 75%);color:#fff;text-shadow:0 1px 2px #000}
.vp-jk i{font-style:normal;font-size:calc(var(--w)*.36);line-height:1}.vp-jk b{font:400 calc(var(--w)*.12) "Bungee",Impact;letter-spacing:.04em}
.vp-meter{position:relative;z-index:1;display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:8px;font:400 clamp(9px,1.4vw,14px)/1.4 "Press Start 2P",monospace;text-shadow:2px 2px 0 #000}
.vp-meter span{display:block;color:#ff6a5e;font-size:.75em}.vp-meter b{font-weight:400;color:var(--vpY);font-variant-numeric:tabular-nums}
.vp-meter .r{text-align:right}.vp-meter .c{text-align:center}
.vp-meter .win b{color:#7dff9a}
.vp-holds{display:grid;grid-template-columns:repeat(5,1fr);gap:clamp(4px,1vw,10px)}
.vp-screen .vp-key{font:400 clamp(11px,1.6vw,15px)/1.1 "Bungee",Impact,sans-serif;letter-spacing:.03em;border-radius:10px;min-height:46px;padding:8px 10px;text-transform:uppercase;border:2px solid #000;
  color:#2a1800;background:radial-gradient(ellipse at 50% 30%,#fffbd0,#ffd21a 45%,#d99a00);box-shadow:0 4px 0 #6b4a00,0 0 16px rgba(255,210,26,.55),inset 0 -3px 0 rgba(0,0,0,.2)}
.vp-screen .vp-key.r{color:#fff;background:radial-gradient(ellipse at 50% 30%,#ffb0a8,#ff2d1f 45%,#a80d00);box-shadow:0 4px 0 #5a0700,0 0 18px rgba(255,60,40,.6),inset 0 -3px 0 rgba(0,0,0,.25);text-shadow:0 1px 0 #000}
.vp-screen .vp-key.g{color:#fff;background:radial-gradient(ellipse at 50% 30%,#b8ffc4,#22c24a 45%,#0b7024);box-shadow:0 4px 0 #04400f,0 0 16px rgba(40,220,90,.55),inset 0 -3px 0 rgba(0,0,0,.25);text-shadow:0 1px 0 #000}
.vp-screen .vp-key.b{color:#fff;background:radial-gradient(ellipse at 50% 30%,#bcd4ff,#3a78ff 45%,#1438a8);box-shadow:0 4px 0 #0a1d5c,0 0 16px rgba(60,120,255,.5),inset 0 -3px 0 rgba(0,0,0,.25);text-shadow:0 1px 0 #000}
.vp-screen .vp-key:active:not(:disabled){transform:translateY(3px);box-shadow:0 1px 0 #000}
.vp-screen .vp-key:disabled{opacity:1;filter:grayscale(.85) brightness(.45);box-shadow:0 4px 0 #222}
.vp-screen .vp-key.on{outline:3px solid #fff;outline-offset:1px}
.vp-screen .vp-key kbd{font:8px "Press Start 2P",monospace;opacity:.6;margin-left:4px}
.vp-screen .vp-hold{min-height:clamp(36px,5vh,44px);padding:4px 2px;font-size:clamp(10px,1.4vw,14px)}
.vp-screen .vp-deal{min-width:120px;font-size:clamp(14px,2vw,18px)}
.vp-screen .vc-controls{gap:8px}
@media (max-width:560px){.vp-marq-t{display:none}.vp-sels{flex:1}.vp-sels .vp-var{flex:1;max-width:none}.vp-screen .vp-key kbd{display:none}.vp-screen .vp-deal{min-width:96px}.vp-marq{padding:5px 8px}.vp-sel{font-size:11px;padding:5px 4px}.vp-marq small{display:none}
  .vp-screen .vc-bottom{padding:8px 8px}.vp-screen .vp-key{padding:8px 8px}.vp-pay col.n{width:40%}}
`;
function injectCSS() {
  if (document.getElementById('vp-style')) return;
  const s = document.createElement('style'); s.id = 'vp-style'; s.textContent = CSS; document.head.appendChild(s);
}

function rulesHTML() {
  const tbl = v => `<table><tr><th>${v.name} <small>(${v.tag})</small></th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr>${v.rows.map(r =>
    `<tr><td>${r[1]}</td>${[1, 2, 3, 4, 5].map(c => `<td>${payOf(r, c)}</td>`).join('')}</tr>`).join('')}</table>`;
  return `<h3>Video Poker</h3>
  <p>Pick a game and a denomination ($1, $5 or $25 per credit), choose 1–5 credits with <b>Bet One</b> or press <b>Bet Max</b> (bets 5 and deals).
  You get five cards; tap the cards (or press <b>1–5</b>) to <b>HOLD</b> the ones you want, then <b>Draw</b> to replace the rest. The final hand pays from the pay table, in credits × your denomination.
  A Royal Flush pays 250 per credit — or <b>4000</b> at max bet, so always play 5 credits.</p>
  <p><b>Wild cards:</b> in Deuces Wild every 2 is wild; in Joker Poker (53-card deck) the Joker is wild. A wild card becomes whatever makes the best paying hand.</p>
  <p><b>Double Up:</b> after any win you may risk it: beat the dealer's card by picking one of four face-down cards (aces high). Win doubles, tie pushes, lower loses the win.</p>
  <p><b>Keys:</b> Space/Enter = Deal/Draw · 1–5 = Hold · B = Bet One · M = Bet Max · D = Double Up.</p>
  ${Object.values(VARIANTS).map(tbl).join('<br>')}`;
}

// ---------------------------------------------------------------- game
export default {
  id: 'videopoker', title: 'Video Poker', kind: 'machine',
  blurb: 'Five classic poker machines — hold, draw and chase the 4,000-credit royal.',
  mount(root, api) {
    injectCSS();
    const t = K.table(root, api, { title: 'Video Poker', subtitle: 'Valley Casino · 5-credit machine', felt: 'black', rack: false, rules: rulesHTML() });
    t.el.classList.add('vp-screen');

    let alive = true, vid = 'job', denom = 1, coins = 5;
    let state = 'idle'; // idle | busy | hold | double
    let hand = [], held = [false, false, false, false, false], deck = [];
    let pending = null;     // { hand } between a paid deal and the draw resolving (settled on unmount)
    let lastWin = 0;        // dollars available to double
    let dd = null;          // double-up state
    let forced = [];        // debug: next cards to come off the deck
    let roll = null;        // win roll-up controller
    const timers = new Set();
    const sleep = ms => new Promise(r => { const id = setTimeout(() => { timers.delete(id); r(); }, ms); timers.add(id); });

    // ---- build cabinet
    const cab = document.createElement('div'); cab.className = 'vp-cab';
    cab.innerHTML = `
      <div class="vp-marq"><div class="vp-bulbs"></div><div class="vp-marq-t" style="min-width:0"><b class="vp-name"></b><small class="vp-tagline"></small></div>
        <div class="vp-sels"><select class="vp-sel vp-var" aria-label="Game">${Object.entries(VARIANTS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}</select>
        <select class="vp-sel vp-den" aria-label="Denomination"><option value="1">$1</option><option value="5">$5</option><option value="25">$25</option></select></div></div>
      <div class="vp-pay"><table></table></div>
      <div class="vp-crt">
        <div class="vp-status"></div>
        <div class="vp-cards"></div>
        <div class="vp-meter"><div class="win"><span>WIN</span><b class="m-win">0</b></div><div class="c"><span>BET</span><b class="m-bet">5</b></div><div class="r"><span>CREDIT</span><b class="m-cr">0</b></div></div>
      </div>
      <div class="vp-holds"></div>`;
    t.felt.appendChild(cab);
    const $ = s => cab.querySelector(s);
    const payTbl = $('.vp-pay table'), statusEl = $('.vp-status'), cardsEl = $('.vp-cards');
    const mWin = $('.m-win'), mBet = $('.m-bet'), mCr = $('.m-cr'), selVar = $('.vp-var'), selDen = $('.vp-den');

    const slots = [];
    for (let i = 0; i < 5; i++) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'vp-slot'; b.setAttribute('aria-label', 'Card ' + (i + 1));
      b.innerHTML = `<span class="vp-held">HELD</span><div class="vp-box"></div>`;
      b.addEventListener('click', () => onSlot(i));
      cardsEl.appendChild(b);
      const s = { b, box: b.querySelector('.vp-box'), el: null };
      s.el = K.cardEl(null, { faceDown: true }); s.box.appendChild(s.el);
      slots.push(s);
    }
    const holdBtns = [0, 1, 2, 3, 4].map(i => {
      const h = K.button('Hold', () => onSlot(i), { cls: 'vp-key vp-hold' }); $('.vp-holds').appendChild(h); return h;
    });
    const bBetOne = K.button('Bet One<kbd>B</kbd>', betOne, { cls: 'vp-key' });
    const bBetMax = K.button('Bet Max<kbd>M</kbd>', betMax, { cls: 'vp-key' });
    const bDouble = K.button('Double<kbd>D</kbd>', doubleUp, { cls: 'vp-key g' });
    const bDeal = K.button('Deal', () => primary(), { cls: 'vp-key r vp-deal' });
    t.controls.append(bBetOne, bBetMax, bDouble, bDeal);

    // ---- rendering helpers
    const V = () => VARIANTS[vid];
    function renderPay(hitKey = null, dealtKey = null) {
      const v = V();
      payTbl.innerHTML = `<colgroup><col class="n"><col><col><col><col><col></colgroup>` + v.rows.map(r =>
        `<tr data-k="${r[0]}" class="${r[0] === hitKey ? 'hit' : r[0] === dealtKey ? 'dealt' : ''}"><td>${r[1]}</td>${[1, 2, 3, 4, 5].map(c => `<td class="${c === coins ? 'on' : ''}">${payOf(r, c)}</td>`).join('')}</tr>`).join('');
      $('.vp-name').textContent = v.name; $('.vp-tagline').textContent = v.tag + ' · ' + K.fmt(denom) + ' credits';
      if (v !== lastFitV) { lastFitV = v; fit(); }
    }
    let lastFitV = null;
    let shownCredits = null; // while rolling up
    function credits() { return Math.floor(api.balance / denom); }
    function renderMeter() {
      mBet.textContent = coins;
      mCr.textContent = (shownCredits != null ? shownCredits : credits()).toLocaleString('en-US');
    }
    function setWin(cr) { mWin.textContent = cr.toLocaleString('en-US'); }
    function status(text, cls = '') { statusEl.textContent = text; statusEl.className = 'vp-status ' + cls; }
    function renderButtons() {
      const idle = state === 'idle';
      bBetOne.disabled = !idle; bBetMax.disabled = !idle; selVar.disabled = !idle; selDen.disabled = !idle;
      bDouble.disabled = !(idle && lastWin > 0 && api.balance >= lastWin);
      bDeal.disabled = !(idle || state === 'hold');
      bDeal.innerHTML = state === 'hold' ? 'Draw<kbd>SPACE</kbd>' : 'Deal<kbd>SPACE</kbd>';
      holdBtns.forEach((h, i) => { h.disabled = !(state === 'hold' || (state === 'double' && i > 0)); h.innerHTML = state === 'double' ? (i ? 'Pick' : 'Dealer') : 'Hold'; h.classList.toggle('on', state === 'hold' && held[i]); });
      slots.forEach((s, i) => { s.b.disabled = !(state === 'hold' || (state === 'double' && i > 0)); s.b.classList.toggle('held', state === 'hold' && held[i]); });
    }
    function paintJoker(el) {
      const f = el.querySelector('.vc-face'); f.className = 'vc-face vp-joker';
      f.innerHTML = `<div class="vc-ix tl"><b>J</b><i>★</i></div><div class="vp-jk"><i>★</i><b>JOKER</b></div><div class="vc-ix br"><b>J</b><i>★</i></div>`;
      el.dataset.card = 'JK';
    }
    function makeCard(card) {
      const el = K.cardEl(card.r === 'JK' ? null : card, { faceDown: true });
      if (card.r === 'JK') paintJoker(el);
      return el;
    }
    function setTag(i, text, cls = '') {
      const old = slots[i].b.querySelector('.vp-tag'); if (old) old.remove();
      if (!text) return;
      const tg = document.createElement('span'); tg.className = 'vp-tag ' + cls; tg.textContent = text; slots[i].b.appendChild(tg);
    }
    function wildTags(cardsArr) {
      const w = V().wild;
      cardsArr.forEach((c, i) => setTag(i, w && c && w(c) ? 'WILD' : ''));
    }
    // flip the given slots face down, swap in new cards and turn them up one by one
    async function showCards(idx, cardsArr) {
      idx.forEach(i => slots[i].el.classList.add('down'));
      if (idx.length) await sleep(200);
      for (const i of idx) {
        if (!alive) return;
        const el = makeCard(cardsArr[i]); slots[i].box.replaceChildren(el); slots[i].el = el;
        slots[i].b.classList.remove('lose');
        await sleep(30); K.flipCard(el); await sleep(110);
      }
      await sleep(240);
    }
    function drawCard() {
      if (forced.length) {
        const c = forced.shift(), k = deck.findIndex(d => d.r === c.r && d.s === c.s);
        if (k >= 0) deck.splice(k, 1);
        return c;
      }
      return deck.pop();
    }
    const handName = key => (V().rows.find(r => r[0] === key) || [])[1] || '';

    // ---- roll-up of the win meter and credits
    function rollUp(winCr, fromCredits) {
      finishRoll();
      return new Promise(res => {
        let n = 0; const step = Math.max(1, Math.ceil(winCr / 70));
        const done = () => { clearInterval(id); timers.delete(id); roll = null; setWin(winCr); shownCredits = null; renderMeter(); res(); };
        const id = setInterval(() => {
          n = Math.min(winCr, n + step); setWin(n); shownCredits = fromCredits + n; renderMeter(); K.tone(700 + (n % 12) * 60, .03, { type: 'square', vol: .04 });
          if (n >= winCr) done();
        }, 38);
        timers.add(id); roll = { done };
      });
    }
    function finishRoll() { if (roll) roll.done(); }

    // ---- actions
    function primary() { if (state === 'idle') deal(); else if (state === 'hold') draw(); }
    function betOne() {
      if (state !== 'idle') return; finishRoll();
      coins = coins % 5 + 1; K.sfx.chip(); renderPay(); renderMeter(); status(`BET ${coins} CREDIT${coins > 1 ? 'S' : ''}`);
      t.msg(coins < 5 ? `Betting ${coins} × ${K.fmt(denom)}. Max bet (5) pays 4,000 for a royal.` : `Max bet: ${K.fmt(5 * denom)} per hand.`);
    }
    function betMax() { if (state !== 'idle') return; coins = 5; renderPay(); renderMeter(); deal(); }
    async function deal() {
      if (state !== 'idle') return;
      finishRoll();
      const cost = coins * denom;
      if (!api.bet(cost)) {
        status('INSUFFICIENT CREDITS', 'red blink'); t.msg(`You need ${K.fmt(cost)} to play ${coins} × ${K.fmt(denom)}. Lower the bet or denomination.`, 'lose'); K.sfx.lose(); return;
      }
      state = 'busy'; lastWin = 0; dd = null; setWin(0); held = [false, false, false, false, false];
      deck = newDeck(V().deck); hand = [0, 1, 2, 3, 4].map(drawCard);
      pending = { hand: hand.slice() };
      renderPay(); renderMeter(); renderButtons(); status(''); slots.forEach((_, i) => setTag(i, ''));
      t.msg(`${coins} credit${coins > 1 ? 's' : ''} × ${K.fmt(denom)} — dealing…`);
      await showCards([0, 1, 2, 3, 4], hand);
      if (!alive) return;
      wildTags(hand);
      const dealtKey = classify(vid, hand);
      renderPay(null, dealtKey);
      status(dealtKey ? handName(dealtKey).toUpperCase() : 'HOLD CARDS, THEN DRAW', dealtKey ? '' : '');
      state = 'hold'; renderButtons();
      t.msg(dealtKey ? `Dealt ${handName(dealtKey)} — hold your cards (tap or 1–5) and Draw.` : 'Tap cards (or press 1–5) to hold, then Draw.');
    }
    function toggleHold(i) {
      if (state !== 'hold') return;
      held[i] = !held[i]; K.tone(held[i] ? 1100 : 700, .05, { type: 'square', vol: .07 }); renderButtons();
    }
    function onSlot(i) { if (state === 'hold') toggleHold(i); else if (state === 'double') pickDouble(i); }
    async function draw() {
      if (state !== 'hold') return;
      state = 'busy'; renderButtons();
      const idx = [0, 1, 2, 3, 4].filter(i => !held[i]);
      idx.forEach(i => { hand[i] = drawCard(); });
      const key = classify(vid, hand), row = V().rows.find(r => r[0] === key);
      const winCr = row ? payOf(row, coins) : 0, before = credits();
      if (winCr) api.win(winCr * denom);  // pay now: the result is decided
      pending = null;
      slots.forEach((_, i) => setTag(i, ''));
      t.msg(idx.length ? `Drawing ${idx.length} card${idx.length > 1 ? 's' : ''}…` : 'Standing pat…');
      await showCards(idx, hand);
      if (!alive) return;
      wildTags(hand); held = [false, false, false, false, false];
      if (winCr) {
        lastWin = winCr * denom;
        renderPay(key); status(row[1].toUpperCase());
        const big = winCr >= 25 * coins;
        if (big) { K.sfx.bigWin(); K.banner(t, row[1].toUpperCase() + '!'); } else K.sfx.win();
        t.msg(`${row[1]}! Pays ${winCr.toLocaleString()} credit${winCr > 1 ? 's' : ''} (${K.fmt(lastWin)}).${api.balance >= lastWin ? ' Double up or Deal again.' : ''}`, 'win');
        state = 'idle'; shownCredits = before; renderButtons(); renderMeter();
        await rollUp(winCr, before);
        if (!alive) return;
        if (!big && lastWin) K.banner(t, '+' + K.fmt(lastWin));
      } else {
        renderPay(); status('GAME OVER', 'red'); slots.forEach(s => s.b.classList.add('lose'));
        t.msg(`No win. ${credits() >= coins ? 'Deal again?' : 'Not enough credits for this bet.'}`, 'lose');
        state = 'idle';
      }
      renderButtons(); renderMeter();
    }

    // ---- double up: beat the dealer's card
    async function doubleUp() {
      if (state !== 'idle' || !lastWin) return;
      finishRoll();
      const amt = lastWin;
      if (!api.bet(amt)) { t.msg('Not enough chips to double.', 'lose'); return; }
      state = 'busy'; renderButtons();
      deck = newDeck(52);
      const dealer = drawCard(), picks = [drawCard(), drawCard(), drawCard(), drawCard()];
      dd = { amt, dealer, picks };
      renderPay(); status('DOUBLE UP?  PICK A HIGHER CARD', 'blink');
      t.msg(`Risking ${K.fmt(amt)} to win ${K.fmt(amt * 2)} — pick a card higher than the dealer's (keys 2–5).`);
      slots.forEach((_, i) => setTag(i, ''));
      // all down, dealer up
      slots.forEach(s => s.el.classList.add('down')); await sleep(220);
      for (let i = 0; i < 5; i++) { const el = K.cardEl(i === 0 ? dealer : null, { faceDown: true }); slots[i].box.replaceChildren(el); slots[i].el = el; slots[i].b.classList.remove('lose'); }
      await sleep(40); K.flipCard(slots[0].el); setTag(0, 'DEALER', 'dealer');
      await sleep(300);
      if (!alive) return;
      state = 'double'; renderButtons();
    }
    async function pickDouble(i) {
      if (state !== 'double' || i < 1 || !dd) return;
      state = 'busy'; renderButtons();
      const { amt, dealer, picks } = dd, mine = picks[i - 1];
      const dv = K.rankValue(dealer.r), mv = K.rankValue(mine.r);
      const res = mv > dv ? 'win' : mv === dv ? 'push' : 'lose';
      if (res === 'win') api.win(amt * 2); else if (res === 'push') api.win(amt);
      dd = null;
      K.flipCard(slots[i].el, mine); setTag(i, 'YOU', '');
      await sleep(450);
      for (let k = 1; k < 5; k++) if (k !== i) { K.flipCard(slots[k].el, picks[k - 1]); slots[k].b.classList.add('lose'); }
      await sleep(350);
      if (!alive) return;
      if (res === 'win') {
        lastWin = amt * 2; setWin(lastWin / denom); status('YOU WIN!  DOUBLE AGAIN?'); K.sfx.win(); K.banner(t, '+' + K.fmt(lastWin));
        t.msg(`Your ${mine.r} beats the dealer's ${dealer.r} — win ${K.fmt(lastWin)}. Double again or Deal to collect.`, 'win');
      } else if (res === 'push') {
        lastWin = amt; status('PUSH — DOUBLE AGAIN?'); K.sfx.push();
        t.msg(`Tie (${mine.r} vs ${mine.r}) — your ${K.fmt(amt)} is safe. Double again or Deal.`, 'push');
      } else {
        lastWin = 0; setWin(0); status('GAME OVER', 'red'); K.sfx.lose(); slots[i].b.classList.add('lose');
        t.msg(`Your ${mine.r} loses to the dealer's ${dealer.r}. The ${K.fmt(amt)} win is gone.`, 'lose');
      }
      state = 'idle'; renderButtons(); renderMeter();
    }

    // ---- selects & keys
    selVar.addEventListener('change', () => {
      if (state !== 'idle') { selVar.value = vid; return; }
      vid = selVar.value; lastWin = 0; setWin(0); renderPay(); renderButtons(); selVar.blur();
      const wildNote = vid === 'deuces' ? ' All deuces are wild — minimum pay is Three of a Kind.' : vid === 'joker' ? ' 53-card deck, the Joker is wild — Kings or Better pays.' : '';
      status(V().name.toUpperCase()); t.msg(`${V().name} (${V().tag}).${wildNote}`);
      slots.forEach((s, i) => { s.el.classList.add('down'); setTag(i, ''); s.b.classList.remove('lose'); });
    });
    selDen.addEventListener('change', () => {
      if (state !== 'idle') { selDen.value = String(denom); return; }
      denom = +selDen.value; lastWin = 0; setWin(0); renderPay(); renderMeter(); renderButtons(); selDen.blur();
      t.msg(`Denomination ${K.fmt(denom)} per credit — max bet ${K.fmt(denom * 5)}.`);
    });
    const onKey = e => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      let act = null;
      if (k === ' ' || k === 'enter') act = () => primary();
      else if (/^[1-5]$/.test(k)) act = () => onSlot(+k - 1);
      else if (k === 'b') act = betOne;
      else if (k === 'm') act = betMax;
      else if (k === 'd') act = () => { if (!bDouble.disabled) doubleUp(); };
      if (!act) return;
      e.preventDefault();
      if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) document.activeElement.blur();
      if (!e.repeat) act();
    };
    window.addEventListener('keydown', onKey);
    const unBal = api.onBalance ? api.onBalance(() => { if (alive) { renderMeter(); renderButtons(); } }) : null;

    // scale the layout down to fit short screens (landscape phones, small laptops)
    const fit = () => { if (!alive) return; cab.style.zoom = ''; const cs = getComputedStyle(t.felt), avail = t.felt.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 4, need = cab.offsetHeight; if (avail > 0 && need > avail) cab.style.zoom = Math.max(.5, avail / need).toFixed(3); };
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => fit()) : null; if (ro) ro.observe(t.felt);
    renderPay(); renderMeter(); renderButtons(); setWin(0); fit();
    status('PLAY 5 CREDITS', 'blink');
    t.msg('Choose a game and denomination, then Deal (or Bet Max).');

    return {
      unmount() {
        alive = false;
        // settle anything in flight fairly: a dealt hand stands pat, a pending double-up returns the stake
        if (pending) { const key = classify(vid, pending.hand), row = V().rows.find(r => r[0] === key); if (row) api.win(payOf(row, coins) * denom); pending = null; }
        if (dd) { api.win(dd.amt); dd = null; }
        timers.forEach(id => { clearTimeout(id); clearInterval(id); }); timers.clear();
        window.removeEventListener('keydown', onKey); if (unBal) unBal(); if (ro) ro.disconnect();
        t.destroy();
      },
      // debug / test hooks
      _force(list) { forced = list.map(c => (typeof c === 'string' ? parseCard(c) : c)); },
      _state: () => ({ state, vid, denom, coins, hand: hand.slice(), held: held.slice(), lastWin }),
      _set(o) { if (state !== 'idle') return false; if (o.vid) { vid = o.vid; selVar.value = vid; } if (o.denom) { denom = o.denom; selDen.value = String(denom); } if (o.coins) coins = o.coins; renderPay(); renderMeter(); renderButtons(); return true; }
    };
  }
};
