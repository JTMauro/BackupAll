// Valley Casino — Ultimate Texas Hold'em (player vs dealer, Ante = Blind, Trips side bet).
import * as K from './_kit.js';

export const BLIND = { 9: 500, 8: 50, 7: 10, 6: 3, 5: 1.5, 4: 1 };
export const TRIPS = { 9: 50, 8: 40, 7: 30, 6: 8, 5: 7, 4: 4, 3: 3 };
const RN = { 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace' };
const PL = v => (v === 6 ? 'Sixes' : RN[v] + 's');
// Descriptive name of an evalHand() result, e.g. "Two Pair, Kings & Sevens".
export function describe(e) {
  const vals = e.cards.map(c => K.rankValue(c.r)), cnt = {};
  vals.forEach(v => { cnt[v] = (cnt[v] || 0) + 1; });
  const g = Object.entries(cnt).map(([v, n]) => [n, +v]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const hi = Math.max(...vals), sHi = vals.includes(14) && vals.includes(5) && !vals.includes(13) ? 5 : hi;
  switch (e.cat) {
    case 9: return 'Royal Flush';
    case 8: return `${RN[sHi]}-High Straight Flush`;
    case 7: return `Four ${PL(g[0][1])}`;
    case 6: return `${PL(g[0][1])} Full of ${PL(g[1][1])}`;
    case 5: return `${RN[hi]}-High Flush`;
    case 4: return `${RN[sHi]}-High Straight`;
    case 3: return `Three ${PL(g[0][1])}`;
    case 2: return `Two Pair, ${PL(g[0][1])} & ${PL(g[1][1])}`;
    case 1: return `Pair of ${PL(g[0][1])}`;
    default: return `${RN[hi]} High`;
  }
}
// Settle: bets {ante, blind, trips}; play = Play bet (0 if folded). Returns totals returned per wager.
export function settleUTH(bets, play, folded, pHole, dHole, board) {
  const pe = K.evalHand(pHole.concat(board)), de = K.evalHand(dHole.concat(board)), q = de.cat >= 1;
  const r = { pe, de, q, ante: 0, blind: 0, play: 0, trips: 0, outcome: '' };
  if (bets.trips && TRIPS[pe.cat]) r.trips = bets.trips * (1 + TRIPS[pe.cat]);
  if (folded) r.outcome = 'fold';
  else if (pe.score > de.score) {
    r.outcome = 'win'; r.play = play * 2; r.ante = q ? bets.ante * 2 : bets.ante;
    r.blind = bets.blind + (BLIND[pe.cat] ? Math.floor(bets.blind * BLIND[pe.cat]) : 0);
  } else if (pe.score === de.score) { r.outcome = 'tie'; r.ante = bets.ante; r.blind = bets.blind; r.play = play; }
  else { r.outcome = 'lose'; r.ante = q ? 0 : bets.ante; }
  r.total = r.ante + r.blind + r.play + r.trips;
  return r;
}
const parseCard = t => ({ r: t.slice(0, -1).toUpperCase(), s: t.slice(-1).toLowerCase() });

const CSS = `
.uh-screen .vc-rules[hidden]{display:none}
.uh-screen .vc-felt{justify-content:flex-start;gap:clamp(4px,1vh,12px)}
.uh-wrap{margin:auto 0;width:min(980px,100%);display:grid;grid-template-columns:1fr auto 1fr;grid-template-areas:"pl table pr";align-items:center;gap:16px}
.uh-table{grid-area:table;display:flex;flex-direction:column;align-items:center;gap:clamp(4px,1.1vh,12px)}
.uh-seat{display:flex;flex-direction:column;align-items:center;gap:5px}
.uh-lbl{font:400 10px "Press Start 2P",monospace;color:var(--gold);letter-spacing:.08em;text-shadow:0 2px 0 #000}
.uh-tag{min-height:24px;box-sizing:border-box;font:700 13px "Chakra Petch",sans-serif;padding:3px 10px;border-radius:12px;background:rgba(0,0,0,.45);border:1px solid var(--line);color:#fff;white-space:nowrap}
.uh-tag:empty{visibility:hidden}.uh-tag.good{color:#7dff9a;border-color:#7dff9a}.uh-tag.bad{color:#ff8a80;border-color:#ff8a80}
.uh-tag.d{border-color:#6fd3ff}
.uh-screen .vc-card{--w:clamp(50px,min(14.5vw,10.5vh),88px)}
.uh-screen .vc-hand{min-height:calc(clamp(50px,min(14.5vw,10.5vh),88px)*1.4)}
.uh-screen .vc-hand.spread{gap:clamp(5px,.9vw,10px)}
.uh-board{position:relative;padding:clamp(6px,1vh,10px) clamp(8px,1.4vw,16px);border:2px solid rgba(232,196,106,.35);border-radius:14px;background:rgba(0,0,0,.14)}
.uh-board::before{content:"COMMUNITY";position:absolute;left:50%;top:-8px;transform:translateX(-50%);font:400 8px "Press Start 2P",monospace;color:var(--gold);background:var(--felt);padding:1px 6px;border-radius:4px;white-space:nowrap}
.uh-screen .vc-card.uh-p .vc-face{box-shadow:0 0 0 3px #ffd84a,0 0 16px #ffb300}
.uh-screen .vc-card.uh-d .vc-face{box-shadow:0 0 0 3px #6fd3ff,0 0 16px #2aa0ff}
.uh-screen .vc-card.uh-p.uh-d .vc-face{box-shadow:0 0 0 3px #ffd84a,0 0 0 6px #6fd3ff,0 0 18px #ffb300}
.uh-screen .vc-card.uh-x{filter:brightness(.72) saturate(.45)}
.uh-screen .vc-card{transition:filter .3s}
.uh-legend{display:flex;gap:12px;font:600 11px "Chakra Petch",sans-serif;color:var(--dim)}.uh-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:4px;vertical-align:-1px}
.uh-legend[hidden]{display:none}
.uh-spots{display:flex;gap:clamp(6px,1.6vw,18px);align-items:center;justify-content:center}
.uh-eq{font:400 18px "Bungee",Impact;color:var(--gold);text-shadow:0 2px 0 #000}
.uh-screen .vc-spot{width:clamp(70px,9.5vw,92px);height:clamp(70px,9.5vw,92px);min-width:0;border-radius:50%;padding-top:9px;font-size:11px}
.uh-screen .vc-spot small{font-size:9px}.uh-screen .vc-spot.has small{visibility:hidden}
.uh-screen .vc-spot.trips{border-color:#ffb36b;color:#ffe2c4}.uh-screen .vc-spot.play{border-style:dashed;cursor:default;border-radius:14px}
.uh-screen .vc-spot .vc-stack{bottom:42%}
.uh-plaque{background:rgba(0,0,0,.42);border:1px solid var(--line);border-radius:10px;padding:8px 10px;font:600 12px/1.45 "Chakra Petch",sans-serif;min-width:150px}
.uh-plaque h4{margin:0 0 4px;font:400 11px "Bungee",Impact;color:var(--gold);letter-spacing:.04em}
.uh-plaque div{display:flex;justify-content:space-between;gap:10px;color:var(--dim)}.uh-plaque div b{color:#fff}
.uh-plaque div.hit{color:#0b0a08;background:#ffe08a;border-radius:4px;padding:0 4px;margin:0 -4px}.uh-plaque div.hit b{color:#000}
.uh-plaque p{margin:6px 0 0;font-size:11px;color:var(--dim);max-width:170px}
.uh-pl{grid-area:pl;justify-self:end}.uh-pr{grid-area:pr;justify-self:start}
.uh-screen .vc-btn kbd{font-size:8px}
.uh-screen .vc-btn.uh-bet{background:linear-gradient(#5ad17a,#1f8a40);border-color:#b8ffc8;color:#04210d}
@media (max-width:900px){.uh-wrap{grid-template-columns:1fr;grid-template-areas:"table"}.uh-pl,.uh-pr{display:none}}
@media (max-width:560px){.uh-screen .vc-btn kbd{display:none}.uh-screen .vc-bottom{gap:8px;padding:8px}.uh-screen .vc-btn{padding:9px 11px}.uh-legend{font-size:10px}}
`;
function injectCSS() {
  if (document.getElementById('uh-style')) return;
  const s = document.createElement('style'); s.id = 'uh-style'; s.textContent = CSS; document.head.appendChild(s);
}
const RULES = `<h3>Ultimate Texas Hold'em</h3>
<p>Bet equal <b>Ante</b> and <b>Blind</b> wagers (tapping either adds the chip to both); <b>Trips</b> is an optional side bet. You and the dealer each get two cards and share five community cards; best five-card hand from seven wins.</p>
<p><b>Your one Play bet:</b> before the flop you may <b>Bet 4× or 3×</b> the Ante, or check. After the flop you may <b>Bet 2×</b>, or check. After the river you must <b>Bet 1×</b> or <b>Fold</b> (losing Ante and Blind). Once you bet, the remaining cards are dealt with no further decisions.</p>
<p>The dealer <b>qualifies with a pair or better</b>. If the dealer doesn't qualify, the Ante pushes. If you beat the dealer: Play pays 1:1, Ante pays 1:1 (or pushes if the dealer didn't qualify), Blind pays from the table below. If the dealer wins, you lose Play and Blind (and Ante, if the dealer qualified). Ties push.</p>
<table><tr><th>Blind <small>(when you win)</small></th><th>Pays</th></tr><tr><td>Royal Flush</td><td>500 to 1</td></tr><tr><td>Straight Flush</td><td>50 to 1</td></tr><tr><td>Four of a Kind</td><td>10 to 1</td></tr><tr><td>Full House</td><td>3 to 1</td></tr><tr><td>Flush</td><td>3 to 2</td></tr><tr><td>Straight</td><td>1 to 1</td></tr><tr><td>Anything else</td><td>Push</td></tr></table><br>
<table><tr><th>Trips <small>(your hand, win or lose vs dealer — even if you fold)</small></th><th>Pays</th></tr><tr><td>Royal Flush</td><td>50 to 1</td></tr><tr><td>Straight Flush</td><td>40 to 1</td></tr><tr><td>Four of a Kind</td><td>30 to 1</td></tr><tr><td>Full House</td><td>8 to 1</td></tr><tr><td>Flush</td><td>7 to 1</td></tr><tr><td>Straight</td><td>4 to 1</td></tr><tr><td>Three of a Kind</td><td>3 to 1</td></tr></table>
<p>Fractional Blind payouts (3:2 on an odd bet) are rounded down. Gold outline = your best five cards, blue = dealer's.</p>
<p><b>Keys:</b> Space/Enter = Deal / Check · 4, 3, 2, 1 = Bet that multiple · F = Fold · R = Rebet · C = Clear (betting) / Check.</p>`;

export default {
  id: 'holdem', title: "Ultimate Texas Hold'em", kind: 'table',
  blurb: 'Heads-up hold\'em against the dealer — raise 4× preflop, Blind pays up to 500:1.',
  mount(root, api) {
    injectCSS();
    const t = K.table(root, api, { title: "Ultimate Texas Hold'em", subtitle: 'Dealer qualifies with a pair', felt: 'green', rules: RULES });
    t.el.classList.add('uh-screen');
    let alive = true, phase = 'bet'; // bet | busy | pre | flop | river
    let bets = { ante: 0, blind: 0, trips: 0 }, play = 0, last = null;
    let pHole = [], dHole = [], board = [], forced = null, shown = 0;
    let elOf = new Map();
    const timers = new Set();
    const sleep = ms => new Promise(r => { const id = setTimeout(() => { timers.delete(id); r(); }, ms); timers.add(id); });
    const MAX = 2500;

    const wrap = document.createElement('div'); wrap.className = 'uh-wrap';
    wrap.innerHTML = `
      <div class="uh-pl"><div class="uh-plaque bl-pl"><h4>Blind Pays</h4></div></div>
      <div class="uh-table">
        <div class="uh-seat"><span class="uh-lbl">DEALER</span><div class="vc-hand spread d-hand"></div><div class="uh-tag d d-tag"></div></div>
        <div class="uh-board"><div class="vc-hand spread b-hand"></div></div>
        <div class="uh-legend" hidden><span><i style="background:#ffd84a"></i>Your best 5</span><span><i style="background:#6fd3ff"></i>Dealer's best 5</span></div>
        <div class="uh-seat"><div class="uh-tag p-tag"></div><div class="vc-hand spread p-hand"></div></div>
        <div class="uh-spots"></div>
      </div>
      <div class="uh-pr"><div class="uh-plaque tr-pl"><h4>Trips Pays</h4></div></div>`;
    t.felt.appendChild(wrap);
    const $ = s => wrap.querySelector(s);
    const dHand = $('.d-hand'), bHand = $('.b-hand'), pHand = $('.p-hand'), dTag = $('.d-tag'), pTag = $('.p-tag'), legend = $('.uh-legend');
    const plaque = (sel, rows, note) => { const p = $(sel); rows.forEach(([n, pay, k]) => { const d = document.createElement('div'); d.dataset.k = k; d.innerHTML = `<span>${n}</span><b>${pay}</b>`; p.appendChild(d); }); if (note) p.insertAdjacentHTML('beforeend', `<p>${note}</p>`); return p; };
    const blPl = plaque('.bl-pl', [['Royal Flush', '500:1', 9], ['Straight Flush', '50:1', 8], ['Four of a Kind', '10:1', 7], ['Full House', '3:1', 6], ['Flush', '3:2', 5], ['Straight', '1:1', 4]], 'Paid when you beat the dealer. Lower hands push.');
    const trPl = plaque('.tr-pl', [['Royal Flush', '50:1', 9], ['Straight Flush', '40:1', 8], ['Four of a Kind', '30:1', 7], ['Full House', '8:1', 6], ['Flush', '7:1', 5], ['Straight', '4:1', 4], ['Three of a Kind', '3:1', 3]], 'Pays on your hand alone. Dealer qualifies with a pair.');
    const hitPlaque = (p, k) => p.querySelectorAll('div').forEach(d => d.classList.toggle('hit', k != null && +d.dataset.k === k));

    const spots = {
      trips: K.betSpot('Trips', () => addTrips(), { cls: 'trips', sub: 'up to 50:1' }),
      ante: K.betSpot('Ante', () => addAnte(), { sub: '1:1' }),
      blind: K.betSpot('Blind', () => addAnte(), { sub: 'pays table' }),
      play: K.betSpot('Play', null, { cls: 'play', sub: '1× – 4×' })
    };
    spots.trips.onRemove = () => { if (phase === 'bet' && bets.trips) { api.win(bets.trips); bets.trips = 0; spots.trips.set(0); sync(); } };
    spots.ante.onRemove = spots.blind.onRemove = () => { if (phase === 'bet' && bets.ante) { api.win(bets.ante * 2); bets.ante = bets.blind = 0; spots.ante.set(0); spots.blind.set(0); sync(); } };
    const eq = document.createElement('span'); eq.className = 'uh-eq'; eq.textContent = '=';
    $('.uh-spots').append(spots.trips.el, spots.ante.el, eq, spots.blind.el, spots.play.el);

    const anyBet = () => bets.ante || bets.trips;
    function freshTable() {
      if (shown) { dHand.innerHTML = bHand.innerHTML = pHand.innerHTML = ''; dTag.textContent = pTag.textContent = ''; dTag.className = 'uh-tag d d-tag'; pTag.className = 'uh-tag p-tag'; legend.hidden = true; hitPlaque(blPl, null); hitPlaque(trPl, null); spots.play.set(0); shown = 0; }
    }
    function addAnte() {
      if (phase !== 'bet') return; freshTable();
      const v = t.rack.value;
      if (bets.ante + v > MAX) { t.msg(`Table max Ante is ${K.fmt(MAX)}.`, 'push'); return; }
      if (!api.bet(v * 2)) { t.msg(`Ante + Blind needs ${K.fmt(v * 2)} — not enough chips.`, 'lose'); return; }
      bets.ante += v; bets.blind += v; spots.ante.set(bets.ante); spots.blind.set(bets.blind); K.sfx.chips(2); sync();
      t.msg(`Ante ${K.fmt(bets.ante)} + Blind ${K.fmt(bets.blind)}. Max Play bet will be ${K.fmt(bets.ante * 4)}. Deal when ready.`);
    }
    function addTrips() {
      if (phase !== 'bet') return; freshTable();
      const v = t.rack.value;
      if (bets.trips + v > MAX) { t.msg(`Table max Trips is ${K.fmt(MAX)}.`, 'push'); return; }
      if (!api.bet(v)) { t.msg('Not enough chips.', 'lose'); return; }
      bets.trips += v; spots.trips.set(bets.trips); K.sfx.chip(); sync();
      t.msg(bets.ante ? `Trips ${K.fmt(bets.trips)}. Deal when ready.` : `Trips ${K.fmt(bets.trips)} — you also need an Ante to play.`);
    }
    function clearBets() {
      const back = bets.ante + bets.blind + bets.trips; if (back) api.win(back);
      bets = { ante: 0, blind: 0, trips: 0 }; ['ante', 'blind', 'trips'].forEach(k => spots[k].set(0)); sync();
    }
    function rebet() {
      if (phase !== 'bet' || !last || anyBet()) return false;
      const sum = last.ante * 2 + last.trips;
      if (!api.bet(sum)) { t.msg('Not enough chips to rebet.', 'lose'); return false; }
      freshTable(); bets = { ...last }; ['ante', 'blind', 'trips'].forEach(k => spots[k].set(bets[k])); K.sfx.chips(4); sync();
      t.msg(`Rebet ${K.fmt(sum)}. Deal when ready.`); return true;
    }

    // ---- controls
    const B = {
      clear: K.button('Clear<kbd>C</kbd>', () => { if (phase === 'bet') { clearBets(); t.msg('Bets cleared.'); } }),
      rebet: K.button('Rebet<kbd>R</kbd>', rebet),
      deal: K.button('Deal<kbd>SPACE</kbd>', () => deal(), { primary: true }),
      check: K.button('Check<kbd>SPACE</kbd>', () => check()),
      fold: K.button('Fold<kbd>F</kbd>', () => fold()),
      b4: K.button('Bet 4×', () => raise(4), { cls: 'uh-bet' }),
      b3: K.button('Bet 3×', () => raise(3), { cls: 'uh-bet' }),
      b2: K.button('Bet 2×', () => raise(2), { cls: 'uh-bet' }),
      b1: K.button('Bet 1×', () => raise(1), { cls: 'uh-bet' })
    };
    t.controls.append(B.clear, B.rebet, B.deal, B.fold, B.check, B.b1, B.b2, B.b3, B.b4);
    const show = { bet: ['clear', 'rebet', 'deal'], pre: ['check', 'b3', 'b4'], flop: ['check', 'b2'], river: ['fold', 'b1'], busy: [] };
    function sync() {
      const vis = show[phase] || [];
      Object.entries(B).forEach(([k, b]) => { b.hidden = !vis.includes(k); });
      B.clear.disabled = !anyBet(); B.deal.disabled = !bets.ante;
      const lsum = last ? last.ante * 2 + last.trips : 0;
      B.rebet.disabled = !last || anyBet() || api.balance < lsum; B.rebet.innerHTML = last ? `Rebet ${K.fmt(lsum)}<kbd>R</kbd>` : 'Rebet<kbd>R</kbd>';
      [1, 2, 3, 4].forEach(m => { const b = B['b' + m]; b.innerHTML = `Bet ${m}× ${K.fmt(bets.ante * m)}<kbd>${m}</kbd>`; b.disabled = api.balance < bets.ante * m; });
      t.setBusy(phase !== 'bet');
    }

    function draw(deck) { if (forced && forced.length) { const c = forced.shift(); const i = deck.findIndex(d => d.r === c.r && d.s === c.s); if (i >= 0) deck.splice(i, 1); return c; } return deck.pop(); }
    async function deal() {
      if (phase !== 'bet') return;
      if (!bets.ante && !rebet()) return;
      phase = 'busy'; play = 0; last = { ...bets }; freshTable(); sync(); shown = 1; elOf = new Map();
      const deck = new K.Shoe(1).cards;
      // forced order: p1, d1, p2, d2, board1..5
      const seq = []; for (let i = 0; i < 9; i++) seq.push(draw(deck));
      pHole = [seq[0], seq[2]]; dHole = [seq[1], seq[3]]; board = seq.slice(4);
      t.msg('Dealing…');
      for (let i = 0; i < 2; i++) {
        elOf.set(pHole[i], await K.dealTo(pHand, pHole[i])); if (!alive) return;
        elOf.set(dHole[i], await K.dealTo(dHand, null, { faceDown: true })); if (!alive) return;
      }
      for (let i = 0; i < 5; i++) { elOf.set(board[i], await K.dealTo(bHand, null, { faceDown: true, fast: true })); if (!alive) return; }
      pTag.textContent = holeDesc();
      phase = 'pre'; sync();
      t.msg(`You hold ${holeDesc()}. Bet 4× or 3× now (${K.fmt(bets.ante * 4)} / ${K.fmt(bets.ante * 3)}), or check.`);
    }
    function holeDesc() {
      const [a, b] = pHole, va = K.rankValue(a.r), vb = K.rankValue(b.r);
      if (va === vb) return `Pocket ${PL(va)}`;
      const [h, l] = va > vb ? [a, b] : [b, a];
      return `${h.r === '10' ? 'T' : h.r}-${l.r === '10' ? 'T' : l.r} ${a.s === b.s ? 'suited' : 'offsuit'}`;
    }
    async function revealBoard(n) {
      for (let i = shown - 1; i < n; i++) { if (!alive) return; K.flipCard(elOf.get(board[i]), board[i]); await sleep(240); }
      shown = n + 1;
    }
    async function check() {
      if (phase === 'pre') {
        phase = 'busy'; sync(); t.msg('Check. The flop…');
        await revealBoard(3); if (!alive) return;
        const e = K.evalHand(pHole.concat(board.slice(0, 3)));
        pTag.textContent = describe(e);
        phase = 'flop'; sync(); t.msg(`Flop: you have ${describe(e)}. Bet 2× (${K.fmt(bets.ante * 2)}) or check.`);
      } else if (phase === 'flop') {
        phase = 'busy'; sync(); t.msg('Check. Turn and river…');
        await revealBoard(5); if (!alive) return;
        const e = K.evalHand(pHole.concat(board));
        pTag.textContent = describe(e);
        phase = 'river'; sync(); t.msg(`River: you have ${describe(e)}. Bet 1× (${K.fmt(bets.ante)}) or fold.`);
      }
    }
    async function raise(m) {
      const ok = (phase === 'pre' && m >= 3) || (phase === 'flop' && m === 2) || (phase === 'river' && m === 1);
      if (!ok) return;
      if (!api.bet(bets.ante * m)) { t.msg('Not enough chips for that bet.', 'lose'); return; }
      play = bets.ante * m; spots.play.set(play); K.sfx.chips(4);
      phase = 'busy'; sync(); t.msg(`You bet ${m}× — ${K.fmt(play)} on Play.${shown < 6 ? ' Running out the board…' : ''}`);
      await showdown(false);
    }
    async function fold() {
      if (phase !== 'river') return;
      phase = 'busy'; sync(); await showdown(true);
    }
    async function showdown(folded) {
      const r = settleUTH(bets, play, folded, pHole, dHole, board);
      if (r.total) api.win(r.total); // settle first, animate after
      const s = { ...bets }, staked = s.ante + s.blind + s.trips + play; bets = { ante: 0, blind: 0, trips: 0 };
      if (folded) { spots.ante.set(0); spots.blind.set(0); spots.ante.flash('lose'); spots.blind.flash('lose'); pTag.classList.add('bad'); t.msg('You fold — Ante and Blind lost.', 'lose'); }
      await revealBoard(5); if (!alive) return;
      await sleep(250);
      for (const c of dHole) { if (!alive) return; K.flipCard(elOf.get(c), c); await sleep(280); }
      await sleep(250); if (!alive) return;
      // highlight best five for each
      const pSet = new Set(r.pe.cards), dSet = new Set(r.de.cards);
      for (const [c, el] of elOf) { el.classList.toggle('uh-p', pSet.has(c)); el.classList.toggle('uh-d', dSet.has(c)); el.classList.toggle('uh-x', !pSet.has(c) && !dSet.has(c)); }
      legend.hidden = false;
      pTag.textContent = describe(r.pe); dTag.textContent = describe(r.de) + (r.q ? '' : ' · no qualify');
      const parts = [];
      if (!folded) {
        if (r.outcome === 'win') {
          pTag.classList.add('good'); dTag.classList.add('bad');
          parts.push(`You win with ${describe(r.pe)}`);
          parts.push(`Play +${K.fmt(play)}`);
          parts.push(r.q ? `Ante +${K.fmt(s.ante)}` : 'Ante pushes (dealer didn\'t qualify)');
          parts.push(BLIND[r.pe.cat] ? `Blind +${K.fmt(r.blind - s.blind)}` : 'Blind pushes');
          if (BLIND[r.pe.cat]) hitPlaque(blPl, r.pe.cat);
          spots.play.flash('win'); if (r.q) spots.ante.flash('win'); if (BLIND[r.pe.cat]) spots.blind.flash('win');
        } else if (r.outcome === 'tie') { parts.push(`Tie — both ${describe(r.pe)}. Everything pushes`); }
        else {
          pTag.classList.add('bad'); dTag.classList.add('good');
          parts.push(`Dealer wins with ${describe(r.de)}`);
          parts.push(r.q ? 'Ante, Blind & Play lose' : 'Ante pushes (dealer didn\'t qualify), Blind & Play lose');
          spots.play.flash('lose'); spots.blind.flash('lose'); if (r.q) spots.ante.flash('lose');
        }
      } else parts.push(`Folded (dealer had ${describe(r.de)})`);
      if (s.trips) {
        if (r.trips) { parts.push(`Trips +${K.fmt(r.trips - s.trips)}`); hitPlaque(trPl, r.pe.cat); spots.trips.flash('win'); }
        else { parts.push('Trips loses'); spots.trips.flash('lose'); }
      }
      spots.ante.set(r.ante); spots.blind.set(r.blind); spots.play.set(r.play); spots.trips.set(r.trips);
      const net = r.total - staked, kind = net > 0 ? 'win' : net < 0 ? 'lose' : 'push';
      t.msg(parts.join(' · ') + `. Net ${net >= 0 ? '+' : '−'}${K.fmt(Math.abs(net))}.`, kind);
      if (net > 0) { if (r.pe.cat >= 6) { K.sfx.bigWin(); K.banner(t, r.pe.name.toUpperCase() + '!'); } else { K.sfx.win(); K.banner(t, '+' + K.fmt(net)); } }
      else if (net < 0) K.sfx.lose(); else { K.sfx.push(); K.banner(t, 'PUSH', 'push'); }
      await sleep(1500); if (!alive) return;
      ['ante', 'blind', 'play', 'trips'].forEach(k => spots[k].set(0));
      phase = 'bet'; sync();
    }

    const onKey = e => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase(); let act = null;
      if (k === ' ' || k === 'enter') act = phase === 'bet' ? deal : (phase === 'pre' || phase === 'flop') ? check : null;
      else if (/^[1-4]$/.test(k)) act = () => { const b = B['b' + k]; if (!b.hidden && !b.disabled) raise(+k); };
      else if (k === 'f') act = fold;
      else if (k === 'r') act = rebet;
      else if (k === 'c') act = phase === 'bet' ? () => clearBets() : check;
      if (!act) return;
      e.preventDefault();
      if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) document.activeElement.blur();
      if (!e.repeat) act();
    };
    window.addEventListener('keydown', onKey);
    const unBal = api.onBalance ? api.onBalance(() => { if (alive && phase === 'bet') sync(); }) : null;
    // scale the layout down to fit short screens (landscape phones, small laptops)
    const fit = () => { if (!alive) return; wrap.style.zoom = ''; const cs = getComputedStyle(t.felt), avail = t.felt.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 4, need = wrap.offsetHeight; if (avail > 0 && need > avail) wrap.style.zoom = Math.max(.5, avail / need).toFixed(3); };
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => fit()) : null; if (ro) ro.observe(t.felt);
    sync(); fit();
    t.msg('Pick a chip, tap Ante (Blind matches it), add Trips if you like, then Deal.');

    return {
      unmount() {
        alive = false;
        if (phase === 'bet') clearBets();
        else if (bets.ante || bets.trips) { const r = settleUTH(bets, 0, true, pHole, dHole, board); if (r.total) api.win(r.total); bets = { ante: 0, blind: 0, trips: 0 }; } // leaving mid-hand = fold; Trips still settles
        timers.forEach(clearTimeout); timers.clear();
        window.removeEventListener('keydown', onKey); if (unBal) unBal(); if (ro) ro.disconnect();
        t.destroy();
      },
      _force(list) { forced = list.map(c => (typeof c === 'string' ? parseCard(c) : c)); }, // p1,d1,p2,d2,b1..b5
      _state: () => ({ phase, bets: { ...bets }, play, pHole, dHole, board })
    };
  }
};
