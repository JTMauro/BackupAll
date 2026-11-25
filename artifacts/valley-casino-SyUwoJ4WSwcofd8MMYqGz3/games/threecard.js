// Valley Casino — Three Card Poker (Ante/Play, Pair Plus, 6-Card Bonus).
import * as K from './_kit.js';

const RV = K.rankValue;
// ---------------------------------------------------------------- 3-card evaluator
// cat: 0 high card, 1 pair, 2 flush, 3 straight, 4 three of a kind, 5 straight flush (in 3-card poker a straight beats a flush).
export const TC_NAMES = ['High Card', 'Pair', 'Flush', 'Straight', 'Three of a Kind', 'Straight Flush'];
export function eval3(cards) {
  const v = cards.map(c => RV(c.r)).sort((a, b) => b - a);
  const flush = cards.every(c => c.s === cards[0].s);
  let hi = 0;
  if (v[0] !== v[1] && v[1] !== v[2]) {
    if (v[0] - v[2] === 2) hi = v[0];
    else if (v[0] === 14 && v[1] === 3 && v[2] === 2) hi = 3; // A-2-3 is the lowest straight
  }
  let cat, kick;
  if (hi && flush) { cat = 5; kick = [hi]; }
  else if (v[0] === v[2]) { cat = 4; kick = [v[0]]; }
  else if (hi) { cat = 3; kick = [hi]; }
  else if (flush) { cat = 2; kick = v; }
  else if (v[0] === v[1] || v[1] === v[2]) { const p = v[1], k = v[0] === v[1] ? v[2] : v[0]; cat = 1; kick = [p, k]; }
  else { cat = 0; kick = v; }
  let score = cat; for (let i = 0; i < 3; i++) score = score * 15 + (kick[i] || 0);
  return { cat, name: TC_NAMES[cat], score, hi: v[0], kick, cards };
}
export const qualifies = e => e.cat >= 1 || e.hi >= 12;
const RN = { 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace' };
const plural = v => (v === 6 ? 'Sixes' : RN[v] + 's');
export function describe3(e) {
  switch (e.cat) {
    case 5: return e.kick[0] === 14 ? 'Mini Royal (A-K-Q suited)' : `${RN[e.kick[0]]}-High Straight Flush`;
    case 4: return `Three ${plural(e.kick[0])}`;
    case 3: return `${RN[e.kick[0]]}-High Straight`;
    case 2: return `${RN[e.kick[0]]}-High Flush`;
    case 1: return `Pair of ${plural(e.kick[0])}`;
    default: return `${RN[e.kick[0]]} High`;
  }
}
export const PAIRPLUS = { 5: 40, 4: 30, 3: 6, 2: 4, 1: 1 };
export const ANTEBONUS = { 5: 5, 4: 4, 3: 1 };
export const SIXCARD = { 9: 1000, 8: 200, 7: 100, 6: 20, 5: 15, 4: 10, 3: 7 };

// Settle a hand. bets: {ante, pp, six}; play: amount of Play bet (0 = folded / no ante). Returns per-wager totals returned.
export function settle3(bets, play, pCards, dCards) {
  const pe = eval3(pCards), de = eval3(dCards), q = qualifies(de);
  const r = { pe, de, q, ante: 0, play: 0, bonus: 0, pp: 0, six: 0, sixHand: null, outcome: '' };
  if (bets.pp) r.pp = PAIRPLUS[pe.cat] ? bets.pp * (1 + PAIRPLUS[pe.cat]) : 0;
  if (bets.six) { const e6 = K.evalHand(pCards.concat(dCards)); r.sixHand = e6; r.six = SIXCARD[e6.cat] ? bets.six * (1 + SIXCARD[e6.cat]) : 0; }
  if (bets.ante) {
    if (!play) { r.outcome = 'fold'; }
    else {
      if (ANTEBONUS[pe.cat]) r.bonus = bets.ante * ANTEBONUS[pe.cat]; // paid regardless of the dealer's hand
      if (!q) { r.outcome = 'noqual'; r.ante = bets.ante * 2; r.play = play; }
      else if (pe.score > de.score) { r.outcome = 'win'; r.ante = bets.ante * 2; r.play = play * 2; }
      else if (pe.score === de.score) { r.outcome = 'tie'; r.ante = bets.ante; r.play = play; }
      else r.outcome = 'lose';
    }
  }
  r.total = r.ante + r.play + r.bonus + r.pp + r.six;
  return r;
}

const parseCard = t => ({ r: t.slice(0, -1).toUpperCase(), s: t.slice(-1).toLowerCase() });

// ---------------------------------------------------------------- styles
const CSS = `
.tc-screen .vc-rules[hidden]{display:none}
.tc-screen .vc-felt{justify-content:flex-start;gap:clamp(6px,1.4vh,14px)}
.tc-wrap{margin:auto 0;width:min(900px,100%);display:grid;grid-template-columns:1fr auto 1fr;grid-template-areas:"pl table pr";align-items:center;gap:16px}
.tc-table{grid-area:table;display:flex;flex-direction:column;align-items:center;gap:clamp(6px,1.4vh,14px)}
.tc-seat{display:flex;flex-direction:column;align-items:center;gap:6px}
.tc-lbl{font:400 11px "Press Start 2P",monospace;color:var(--gold);letter-spacing:.08em;text-shadow:0 2px 0 #000}
.tc-tag{min-height:24px;font:700 13px "Chakra Petch",sans-serif;padding:3px 10px;border-radius:12px;background:rgba(0,0,0,.45);border:1px solid var(--line);color:#fff;white-space:nowrap}
.tc-tag:empty{visibility:hidden}
.tc-tag.good{color:#7dff9a;border-color:#7dff9a}.tc-tag.bad{color:#ff8a80;border-color:#ff8a80}
.tc-screen .vc-card{--w:clamp(58px,min(19vw,12vh),96px)}
.tc-screen .vc-hand{min-height:calc(clamp(58px,min(19vw,12vh),96px)*1.4)}
.tc-screen .vc-hand.spread{gap:clamp(6px,1vw,12px)}
.tc-arc{font:400 clamp(10px,1.5vw,14px) "Bungee",Impact,sans-serif;color:rgba(232,196,106,.85);text-align:center;letter-spacing:.06em;line-height:1.35;padding:4px 18px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);border-radius:50%/12px}
.tc-arc small{display:block;font:600 11px "Chakra Petch",sans-serif;color:var(--dim);letter-spacing:.08em}
.tc-spots{display:flex;gap:clamp(8px,2vw,22px);align-items:flex-end;justify-content:center;flex-wrap:wrap}
.tc-screen .vc-spot{width:clamp(74px,11vw,96px);height:clamp(74px,11vw,96px);min-width:0;border-radius:50%;justify-content:flex-start;padding-top:9px;font-size:11px}
.tc-screen .vc-spot small{font-size:9px}.tc-screen .vc-spot.has small{visibility:hidden}
.tc-screen .vc-spot.pp{border-color:#c79bff;color:#e6d4ff}.tc-screen .vc-spot.six{border-color:#7fd0ff;color:#d4efff}
.tc-screen .vc-spot.play{border-style:dashed;cursor:default}
.tc-screen .vc-spot .vc-stack{bottom:42%}
.tc-plaque{background:rgba(0,0,0,.42);border:1px solid var(--line);border-radius:10px;padding:8px 10px;font:600 12px/1.45 "Chakra Petch",sans-serif;min-width:150px}
.tc-plaque h4{margin:0 0 4px;font:400 11px "Bungee",Impact;color:var(--gold);letter-spacing:.04em}
.tc-plaque div{display:flex;justify-content:space-between;gap:10px;color:var(--dim)}.tc-plaque div b{color:#fff}
.tc-plaque div.hit{color:#0b0a08;background:#ffe08a;border-radius:4px;padding:0 4px;margin:0 -4px}.tc-plaque div.hit b{color:#000}
.tc-pl{grid-area:pl;justify-self:end;display:grid;gap:10px}.tc-pr{grid-area:pr;justify-self:start;display:grid;gap:10px}
.tc-screen .vc-btn kbd{font-size:8px}
@media (max-width:820px){.tc-wrap{grid-template-columns:1fr;grid-template-areas:"table"}.tc-pl,.tc-pr{display:none}}
@media (max-width:560px){.tc-screen .vc-btn kbd{display:none}.tc-arc small{display:none}.tc-screen .vc-bottom{gap:8px}.tc-screen .vc-btn{padding:9px 12px}}
`;
function injectCSS() {
  if (document.getElementById('tc-style')) return;
  const s = document.createElement('style'); s.id = 'tc-style'; s.textContent = CSS; document.head.appendChild(s);
}
const RULES = `<h3>Three Card Poker</h3>
<p>Place an <b>Ante</b> (to play against the dealer) and/or a <b>Pair Plus</b> bet; the <b>6-Card Bonus</b> is optional. You and the dealer each get three cards.
After looking at yours, either <b>Fold</b> (lose the Ante) or <b>Play</b> by adding a Play bet equal to the Ante.</p>
<p>The dealer needs <b>Queen-high or better</b> to qualify. If the dealer doesn't qualify, the Ante pays 1:1 and the Play bet pushes.
If the dealer qualifies, the higher hand wins: Ante and Play both pay 1:1 (ties push).</p>
<p><b>Hand ranks (3 cards):</b> Straight Flush › Three of a Kind › <b>Straight</b> › Flush › Pair › High Card. A-2-3 is a straight (the lowest); A-K-Q is the highest.</p>
<table><tr><th>Ante Bonus <small>(paid when you Play, even if the dealer wins)</small></th><th>Pays</th></tr><tr><td>Straight Flush</td><td>5 to 1</td></tr><tr><td>Three of a Kind</td><td>4 to 1</td></tr><tr><td>Straight</td><td>1 to 1</td></tr></table><br>
<table><tr><th>Pair Plus <small>(your 3 cards only)</small></th><th>Pays</th></tr><tr><td>Straight Flush</td><td>40 to 1</td></tr><tr><td>Three of a Kind</td><td>30 to 1</td></tr><tr><td>Straight</td><td>6 to 1</td></tr><tr><td>Flush</td><td>4 to 1</td></tr><tr><td>Pair</td><td>1 to 1</td></tr></table><br>
<table><tr><th>6-Card Bonus <small>(best 5 of your 3 + dealer's 3)</small></th><th>Pays</th></tr><tr><td>Royal Flush</td><td>1000 to 1</td></tr><tr><td>Straight Flush</td><td>200 to 1</td></tr><tr><td>Four of a Kind</td><td>100 to 1</td></tr><tr><td>Full House</td><td>20 to 1</td></tr><tr><td>Flush</td><td>15 to 1</td></tr><tr><td>Straight</td><td>10 to 1</td></tr><tr><td>Three of a Kind</td><td>7 to 1</td></tr></table>
<p><b>Betting:</b> pick a chip, tap a circle to add it (right-click a circle to take it back). <b>Keys:</b> Space/Enter = Deal / Play · F = Fold · R = Rebet · C = Clear.</p>`;

// ---------------------------------------------------------------- game
export default {
  id: 'threecard', title: 'Three Card Poker', kind: 'table',
  blurb: 'Beat the dealer with three cards — plus Pair Plus and the 6-Card Bonus.',
  mount(root, api) {
    injectCSS();
    const t = K.table(root, api, { title: 'Three Card Poker', subtitle: 'Dealer qualifies with Queen-high', felt: 'purple', rules: RULES });
    t.el.classList.add('tc-screen');
    let alive = true, phase = 'bet'; // bet | busy | decide | done
    let bets = { ante: 0, pp: 0, six: 0 }, last = null, play = 0;
    let pCards = [], dCards = [], forced = null;
    const timers = new Set();
    const sleep = ms => new Promise(r => { const id = setTimeout(() => { timers.delete(id); r(); }, ms); timers.add(id); });
    const MAX = 5000;

    const wrap = document.createElement('div'); wrap.className = 'tc-wrap';
    wrap.innerHTML = `
      <div class="tc-pl"><div class="tc-plaque pp-pl"><h4>Pair Plus</h4></div></div>
      <div class="tc-table">
        <div class="tc-seat"><span class="tc-lbl">DEALER</span><div class="vc-hand spread d-hand"></div><div class="tc-tag d-tag"></div></div>
        <div class="tc-arc">Dealer plays with Queen high or better<small>Ante bonus pays even if the dealer wins</small></div>
        <div class="tc-seat"><div class="tc-tag p-tag"></div><div class="vc-hand spread p-hand"></div></div>
        <div class="tc-spots"></div>
      </div>
      <div class="tc-pr"><div class="tc-plaque ab-pl"><h4>Ante Bonus</h4></div><div class="tc-plaque six-pl"><h4>6-Card Bonus</h4></div></div>`;
    t.felt.appendChild(wrap);
    const $ = s => wrap.querySelector(s);
    const dHand = $('.d-hand'), pHand = $('.p-hand'), dTag = $('.d-tag'), pTag = $('.p-tag');
    const plaque = (sel, rows) => { const p = $(sel); rows.forEach(([n, pay, k]) => { const d = document.createElement('div'); d.dataset.k = k; d.innerHTML = `<span>${n}</span><b>${pay}</b>`; p.appendChild(d); }); return p; };
    const ppPl = plaque('.pp-pl', [['Straight Flush', '40:1', 5], ['Three of a Kind', '30:1', 4], ['Straight', '6:1', 3], ['Flush', '4:1', 2], ['Pair', '1:1', 1]]);
    const abPl = plaque('.ab-pl', [['Straight Flush', '5:1', 5], ['Three of a Kind', '4:1', 4], ['Straight', '1:1', 3]]);
    const sixPl = plaque('.six-pl', [['Royal Flush', '1000:1', 9], ['Straight Flush', '200:1', 8], ['Four of a Kind', '100:1', 7], ['Full House', '20:1', 6], ['Flush', '15:1', 5], ['Straight', '10:1', 4], ['Three of a Kind', '7:1', 3]]);
    const hitPlaque = (p, k) => p.querySelectorAll('div').forEach(d => d.classList.toggle('hit', k != null && +d.dataset.k === k));

    // ---- bet spots
    const spots = {
      pp: K.betSpot('Pair Plus', s => addBet('pp'), { cls: 'pp', sub: 'up to 40:1' }),
      ante: K.betSpot('Ante', s => addBet('ante'), { sub: '1:1' }),
      play: K.betSpot('Play', null, { cls: 'play', sub: '= Ante' }),
      six: K.betSpot('6-Card', s => addBet('six'), { cls: 'six', sub: 'Bonus' })
    };
    ['pp', 'ante', 'six'].forEach(k => { spots[k].onRemove = () => removeBet(k); });
    $('.tc-spots').append(spots.pp.el, spots.ante.el, spots.play.el, spots.six.el);

    function addBet(k) {
      if (phase !== 'bet') return;
      if (!bets.ante && !bets.pp && !bets.six) clearTable();
      const v = t.rack.value;
      if (bets[k] + v > MAX) { t.msg(`Table max is ${K.fmt(MAX)} per bet.`, 'push'); return; }
      if (!api.bet(v)) { t.msg(`Not enough chips for a ${K.fmt(v)} chip.`, 'lose'); api.toast && api.toast('Not enough chips'); return; }
      bets[k] += v; spots[k].set(bets[k]); K.sfx.chip(); syncButtons();
      t.msg(k === 'six' && !bets.ante ? '6-Card Bonus uses your 3 cards + the dealer\'s 3.' : `Total bet ${K.fmt(bets.ante + bets.pp + bets.six)}. Deal when ready.`);
    }
    function removeBet(k) {
      if (phase !== 'bet' || !bets[k]) return;
      api.win(bets[k]); bets[k] = 0; spots[k].set(0); K.sfx.chip(); syncButtons();
    }
    function clearBets() { ['ante', 'pp', 'six'].forEach(k => { if (bets[k]) api.win(bets[k]); bets[k] = 0; spots[k].set(0); }); syncButtons(); }

    // ---- controls
    const bClear = K.button('Clear<kbd>C</kbd>', () => { if (phase === 'bet') { clearBets(); t.msg('Bets cleared.'); } });
    const bRebet = K.button('Rebet<kbd>R</kbd>', rebet);
    const bDeal = K.button('Deal<kbd>SPACE</kbd>', deal, { primary: true });
    const bFold = K.button('Fold<kbd>F</kbd>', () => decide(false));
    const bPlay = K.button('Play', () => decide(true), { primary: true });
    t.controls.append(bClear, bRebet, bDeal, bFold, bPlay);
    function syncButtons() {
      const bet = phase === 'bet', dec = phase === 'decide';
      bClear.hidden = bRebet.hidden = bDeal.hidden = !bet;
      bFold.hidden = bPlay.hidden = !dec;
      bClear.disabled = !(bets.ante || bets.pp || bets.six);
      bDeal.disabled = !(bets.ante || bets.pp);
      bRebet.disabled = !last || (bets.ante || bets.pp || bets.six) > 0 || api.balance < last.ante + last.pp + last.six;
      bRebet.innerHTML = last ? `Rebet ${K.fmt(last.ante + last.pp + last.six)}<kbd>R</kbd>` : 'Rebet<kbd>R</kbd>';
      bPlay.innerHTML = `Play ${K.fmt(bets.ante)}<kbd>SPACE</kbd>`; bPlay.disabled = api.balance < bets.ante;
      t.setBusy(!bet);
    }
    function rebet() {
      if (phase !== 'bet' || !last || bets.ante || bets.pp || bets.six) return;
      const sum = last.ante + last.pp + last.six;
      if (!api.bet(sum)) { t.msg('Not enough chips to rebet.', 'lose'); return; }
      clearTable(); bets = { ...last }; ['ante', 'pp', 'six'].forEach(k => spots[k].set(bets[k])); K.sfx.chips(4); syncButtons();
      t.msg(`Rebet ${K.fmt(sum)}. Deal when ready.`);
    }
    function clearTable() {
      dHand.innerHTML = ''; pHand.innerHTML = ''; dTag.textContent = ''; pTag.textContent = ''; dTag.className = 'tc-tag d-tag'; pTag.className = 'tc-tag p-tag';
      spots.play.set(0); hitPlaque(ppPl, null); hitPlaque(abPl, null); hitPlaque(sixPl, null);
    }

    function draw(deck) { if (forced && forced.length) { const c = forced.shift(); const i = deck.findIndex(d => d.r === c.r && d.s === c.s); if (i >= 0) deck.splice(i, 1); return c; } return deck.pop(); }
    async function deal() {
      if (phase !== 'bet' || !(bets.ante || bets.pp)) return;
      phase = 'busy'; play = 0; last = { ...bets }; syncButtons(); clearTable();
      const shoe = new K.Shoe(1); const deck = shoe.cards;
      // order: player, dealer, player, dealer...
      const seq = []; for (let i = 0; i < 6; i++) seq.push(draw(deck));
      pCards = [seq[0], seq[2], seq[4]]; dCards = [seq[1], seq[3], seq[5]];
      t.msg('Dealing…');
      for (let i = 0; i < 3; i++) {
        await K.dealTo(pHand, pCards[i]); if (!alive) return;
        await K.dealTo(dHand, null, { faceDown: true }); if (!alive) return;
      }
      const pe = eval3(pCards);
      pTag.textContent = describe3(pe);
      if (pe.cat >= 1) pTag.classList.add('good');
      if (bets.ante) {
        phase = 'decide'; syncButtons();
        t.msg(`You have ${describe3(pe)}. ${pe.cat >= 1 || pe.hi >= 13 || (pe.hi === 12 && (pe.kick[1] > 6 || (pe.kick[1] === 6 && pe.kick[2] >= 4))) ? 'Strategy says play' : 'Below Q-6-4, strategy says fold'} — Play ${K.fmt(bets.ante)} or Fold?`);
      } else {
        await showdown(false);
      }
    }
    async function decide(doPlay) {
      if (phase !== 'decide') return;
      if (doPlay) {
        if (!api.bet(bets.ante)) { t.msg('Not enough chips to cover the Play bet.', 'lose'); return; }
        play = bets.ante; spots.play.set(play); K.sfx.chips(3);
      }
      phase = 'busy'; syncButtons();
      await showdown(!doPlay);
    }
    async function showdown(folded) {
      const r = settle3(bets, play, pCards, dCards);
      if (r.total) api.win(r.total);   // settle first, animate after
      const settled = { ...bets }; bets = { ante: 0, pp: 0, six: 0 };
      if (folded) { spots.ante.set(0); spots.ante.flash('lose'); pTag.classList.add('bad'); t.msg('You fold — Ante lost. Revealing the dealer…', 'lose'); await sleep(400); }
      else t.msg('Dealer reveals…');
      const els = [...dHand.children];
      for (let i = 0; i < 3; i++) { if (!alive) return; K.flipCard(els[i], dCards[i]); await sleep(260); }
      await sleep(250); if (!alive) return;
      dTag.textContent = describe3(r.de) + (settled.ante && !folded ? (r.q ? ' · qualifies' : ' · does not qualify') : '');
      const parts = []; let net = r.total - settled.ante - settled.pp - settled.six - play;
      if (settled.ante && !folded) {
        if (r.outcome === 'win') { dTag.classList.add('bad'); pTag.classList.add('good'); parts.push(`You win ${K.fmt(settled.ante + play)} on Ante & Play`); [...pHand.children].forEach(e => e.classList.add('hl')); spots.ante.flash('win'); spots.play.flash('win'); }
        else if (r.outcome === 'noqual') { dTag.classList.add('bad'); parts.push(`Dealer doesn't qualify — Ante pays ${K.fmt(settled.ante)}, Play pushes`); spots.ante.flash('win'); }
        else if (r.outcome === 'tie') parts.push('Tie — Ante & Play push');
        else { dTag.classList.add('good'); pTag.classList.add('bad'); parts.push('Dealer wins Ante & Play'); [...dHand.children].forEach(e => e.classList.add('hl')); spots.ante.flash('lose'); spots.play.flash('lose'); }
        if (r.bonus) { parts.push(`Ante Bonus +${K.fmt(r.bonus)}`); hitPlaque(abPl, r.pe.cat); }
      }
      if (settled.pp) {
        if (r.pp) { parts.push(`Pair Plus +${K.fmt(r.pp - settled.pp)}`); spots.pp.flash('win'); hitPlaque(ppPl, r.pe.cat); }
        else { parts.push('Pair Plus loses'); spots.pp.flash('lose'); }
      }
      if (settled.six) {
        if (r.six) { parts.push(`6-Card ${r.sixHand.name} +${K.fmt(r.six - settled.six)}`); spots.six.flash('win'); hitPlaque(sixPl, r.sixHand.cat); }
        else { parts.push(`6-Card ${r.sixHand.name.toLowerCase()} loses`); spots.six.flash('lose'); }
      }
      // show what's left on the table: winnings stacked in the spots for a moment
      spots.ante.set(r.ante + r.bonus); spots.play.set(r.play); spots.pp.set(r.pp); spots.six.set(r.six);
      const kind = net > 0 ? 'win' : net < 0 ? 'lose' : 'push';
      t.msg((folded ? 'Folded. ' : '') + parts.join(' · ') + `. Net ${net >= 0 ? '+' : '−'}${K.fmt(Math.abs(net))}.`, kind);
      if (net > 0) { (net >= 20 * (settled.ante + settled.pp + settled.six) ? K.sfx.bigWin() : K.sfx.win()); K.banner(t, r.pe.cat >= 4 ? r.pe.name.toUpperCase() + '!' : '+' + K.fmt(net)); }
      else if (net < 0) K.sfx.lose(); else K.sfx.push();
      await sleep(1400); if (!alive) return;
      ['ante', 'play', 'pp', 'six'].forEach(k => spots[k].set(0));
      phase = 'bet'; syncButtons();
    }

    const onKey = e => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase(); let act = null;
      if (k === ' ' || k === 'enter') act = phase === 'bet' ? (bets.ante || bets.pp ? deal : (!bRebet.disabled ? () => { rebet(); deal(); } : null)) : phase === 'decide' ? () => { if (!bPlay.disabled) decide(true); } : null;
      else if (k === 'f') act = () => decide(false);
      else if (k === 'r') act = rebet;
      else if (k === 'c') act = () => { if (phase === 'bet') clearBets(); };
      if (!act) return;
      e.preventDefault();
      if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) document.activeElement.blur();
      if (!e.repeat) act();
    };
    window.addEventListener('keydown', onKey);
    const unBal = api.onBalance ? api.onBalance(() => { if (alive && phase === 'bet') syncButtons(); }) : null;
    // scale the layout down to fit short screens (landscape phones, small laptops)
    const fit = () => { if (!alive) return; wrap.style.zoom = ''; const cs = getComputedStyle(t.felt), avail = t.felt.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 4, need = wrap.offsetHeight; if (avail > 0 && need > avail) wrap.style.zoom = Math.max(.5, avail / need).toFixed(3); };
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => fit()) : null; if (ro) ro.observe(t.felt);
    syncButtons(); fit();
    t.msg('Pick a chip and tap Ante and/or Pair Plus, then Deal.');

    return {
      unmount() {
        alive = false;
        if (phase === 'bet') clearBets();
        else if (bets.ante || bets.pp || bets.six) { const r = settle3(bets, 0, pCards, dCards); if (r.total) api.win(r.total); bets = { ante: 0, pp: 0, six: 0 }; } // leaving mid-hand = fold; side bets still settle
        timers.forEach(clearTimeout); timers.clear();
        window.removeEventListener('keydown', onKey); if (unBal) unBal(); if (ro) ro.disconnect();
        t.destroy();
      },
      _force(list) { forced = list.map(c => (typeof c === 'string' ? parseCard(c) : c)); }, // order: p1,d1,p2,d2,p3,d3
      _state: () => ({ phase, bets: { ...bets }, play, pCards, dCards })
    };
  }
};
