// Valley Casino — Baccarat (Punto Banco). 8-deck shoe, full third-card tableau, Player / Banker (5% commission) /
// Tie 8:1 / Player Pair & Banker Pair 11:1, squeeze reveal, bead plate + big road scoreboard.
// Debug hooks (dev only): window.__bacStack = ['9h','2c',...] forces the next cards drawn
// (order: P1, B1, P2, B2, then third cards). window.__vcFast = true shortens animations.
import * as K from './_kit.js';

export const cardPt = c => c.r === 'A' ? 1 : ['10', 'J', 'Q', 'K'].includes(c.r) ? 0 : +c.r;
export const bacValue = cards => cards.reduce((s, c) => s + cardPt(c), 0) % 10;
// Banker third-card rule. b = banker two-card total, p3 = point value of the Player's third card, or null if the Player stood.
export function bankerDraws(b, p3) {
  if (p3 == null) return b <= 5;
  if (b <= 2) return true;
  if (b === 3) return p3 !== 8;
  if (b === 4) return p3 >= 2 && p3 <= 7;
  if (b === 5) return p3 >= 4 && p3 <= 7;
  if (b === 6) return p3 === 6 || p3 === 7;
  return false;
}
// Play out one coup with a draw() function. Returns cards, totals, winner.
export function coup(draw) {
  const p = [draw()], b = [draw()]; p.push(draw()); b.push(draw());
  const p2 = bacValue(p), b2 = bacValue(b), natural = p2 >= 8 || b2 >= 8;
  let p3 = null;
  if (!natural) {
    if (p2 <= 5) { const c = draw(); p.push(c); p3 = cardPt(c); }
    if (bankerDraws(b2, p3)) b.push(draw());
  }
  const pt = bacValue(p), bt = bacValue(b);
  return { p, b, pt, bt, natural, winner: pt > bt ? 'P' : bt > pt ? 'B' : 'T', pPair: p[0].r === p[1].r, bPair: b[0].r === b[1].r };
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
<h3>Baccarat · Punto Banco</h3>
<p>Bet on which hand finishes closer to 9: <b>Player</b> or <b>Banker</b> — or that they <b>Tie</b>. Aces count 1, 2–9 face value,
10/J/Q/K count 0; only the last digit of a total counts (7 + 8 = 5). The dealer follows fixed drawing rules — you make no decisions after betting.</p>
<table>
<tr><th>Bet</th><th>Pays</th></tr>
<tr><td>Player</td><td>1 to 1</td></tr>
<tr><td>Banker</td><td>1 to 1 less 5% commission (0.95 to 1)</td></tr>
<tr><td>Tie</td><td>8 to 1 (Player and Banker bets push on a tie)</td></tr>
<tr><td>Player Pair / Banker Pair (first two cards same rank)</td><td>11 to 1</td></tr>
</table>
<h3>Drawing rules</h3>
<p>If either hand has 8 or 9 on two cards (a <b>natural</b>), both stand. Otherwise the Player draws on 0–5 and stands on 6–7.</p>
<p>If the Player stood, the Banker draws on 0–5 and stands on 6–7. If the Player drew a third card, the Banker acts on its total and that card:</p>
<table>
<tr><th>Banker total</th><th>Banker draws when Player's 3rd card is</th></tr>
<tr><td>0, 1, 2</td><td>always draws</td></tr>
<tr><td>3</td><td>anything except 8</td></tr>
<tr><td>4</td><td>2 – 7</td></tr>
<tr><td>5</td><td>4 – 7</td></tr>
<tr><td>6</td><td>6 – 7</td></tr>
<tr><td>7</td><td>stands</td></tr>
</table>
<h3>House rules</h3>
<ul><li>8 decks; a burn ritual starts each shoe and a cut card sits near the end. The scoreboard resets with every new shoe.</li>
<li>Commission is exact: whole dollars are taken from Banker wins and any cents are kept in the commission box until they add up to a dollar.</li>
<li>Limits: Player/Banker $5–$10,000, Tie and Pairs $1–$1,000.</li></ul>
<h3>Scoreboard</h3>
<p><b>Bead plate</b>: every hand in order, top to bottom. <b>Big road</b>: a new column each time the winner changes; green slashes mark ties. Dots mark pairs (red: banker pair, blue: player pair).</p>
<h3>Keys</h3><p><b>Enter</b> deal / rebet &amp; deal · <b>U</b> undo chip · <b>C</b> clear. Right-click a bet to take it back.</p>`;

let styled = false;
function injectStyle() {
  if (styled) return; styled = true;
  const s = document.createElement('style'); s.id = 'bac-style';
  s.textContent = `
.bac .vc-felt{justify-content:flex-start;gap:10px;padding:8px 12px 10px}
.bac-wrap{box-sizing:border-box;width:min(940px,100%);flex:none;display:flex;flex-direction:column;align-items:center;justify-content:space-between;gap:10px}
.bac-board{width:100%;display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.6fr);gap:8px;background:#f7f3ea;border-radius:10px;padding:6px;box-shadow:0 4px 14px rgba(0,0,0,.45),inset 0 0 0 2px #c9a34a;color:#222}
.bac-board-h{grid-column:1/-1;display:flex;gap:12px;align-items:center;font:700 12px "Chakra Petch",sans-serif;padding:0 4px;flex-wrap:wrap}
.bac-board-h b{font-weight:700}.bac-board-h .p{color:#1d4fd8}.bac-board-h .b{color:#c8102e}.bac-board-h .t{color:#13843b}.bac-board-h .n{margin-left:auto;color:#665}
.bac-grid{position:relative;--c:clamp(13px,2.1vw,22px);display:grid;grid-template-rows:repeat(6,var(--c));grid-auto-flow:column;grid-auto-columns:var(--c);overflow-x:auto;overflow-y:hidden;scrollbar-width:thin;
  background-image:linear-gradient(#d9d2c2 1px,transparent 1px),linear-gradient(90deg,#d9d2c2 1px,transparent 1px);background-size:var(--c) var(--c);border:1px solid #d9d2c2;min-height:calc(var(--c)*6 + 2px)}
.bac-road{grid-auto-flow:row}
.bac-bead{position:relative;margin:1px;border-radius:50%;display:grid;place-items:center;font:700 calc(var(--c)*.52) "Chakra Petch",sans-serif;color:#fff}
.bac-bead.P{background:#1d4fd8}.bac-bead.B{background:#c8102e}.bac-bead.T{background:#13843b}
.bac-bead.new,.bac-rc.new{animation:bacnew .6s}
@keyframes bacnew{0%{transform:scale(0)}60%{transform:scale(1.35)}100%{transform:scale(1)}}
.bac-dot{position:absolute;width:30%;height:30%;border-radius:50%;border:1px solid #fff}
.bac-dot.bp{left:-4%;top:-4%;background:#c8102e}.bac-dot.pp{right:-4%;bottom:-4%;background:#1d4fd8}
.bac-rc{position:relative;margin:2px;border-radius:50%;border:2.5px solid}
.bac-rc.P{border-color:#1d4fd8}.bac-rc.B{border-color:#c8102e}
.bac-rc i{position:absolute;left:50%;top:-15%;width:2px;height:130%;background:#13843b;transform:rotate(45deg)}
.bac-rc em{position:absolute;inset:0;display:grid;place-items:center;font:700 calc(var(--c)*.45) sans-serif;color:#13843b;font-style:normal}
.bac-hands{width:100%;display:grid;grid-template-columns:1fr auto 1fr;align-items:start;gap:8px}
.bac-side{display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px 6px 10px;border-radius:14px;border:2px solid rgba(255,255,255,.12);background:rgba(0,0,0,.14);transition:box-shadow .3s,border-color .3s,background .3s;min-width:0}
.bac-head{display:flex;align-items:center;gap:10px;font:400 clamp(13px,2vw,18px) "Bungee",Impact,sans-serif;letter-spacing:.04em}
.bac-p .bac-head span{color:#8fb5ff}.bac-b .bac-head span{color:#ff8f8f}
.bac-tot{display:grid;place-items:center;width:clamp(30px,4vw,40px);height:clamp(30px,4vw,40px);border-radius:50%;font:700 clamp(16px,2.4vw,22px) "Chakra Petch",sans-serif;background:rgba(0,0,0,.6);border:2px solid rgba(255,255,255,.4);color:#fff;transition:transform .2s}
.bac-tot:empty{opacity:.25}
.bac-tot.bump{animation:bacbump .4s}@keyframes bacbump{50%{transform:scale(1.35)}}
.bac-p .bac-tot{border-color:#5d8bff}.bac-b .bac-tot{border-color:#ff5d5d}
.bac-cards{min-height:calc(var(--cw)*1.4);--cw:clamp(52px,8.4vw,86px);gap:6px;align-items:center;flex-wrap:nowrap}
.bac-cards .vc-card{--w:var(--cw)}
.bac-third{transform:rotate(90deg);margin:0 calc(var(--w)*.2)!important}
.bac-side.win{border-color:#ffe08a;box-shadow:0 0 22px rgba(255,224,138,.5);background:rgba(255,224,138,.08)}
.bac-side.nat .bac-head::after{content:"NATURAL";font:9px "Press Start 2P",monospace;color:#ffe08a;margin-left:4px}
.bac-vs{align-self:center;font:400 12px "Press Start 2P",monospace;color:rgba(255,255,255,.35)}
.bac-sqz .vc-card-in{transition:none!important}
.bac-cover{position:absolute;inset:0;z-index:3;border-radius:calc(var(--w)*.09);background:repeating-linear-gradient(45deg,#1b3f8c 0 4px,#132f6d 4px 8px);border:calc(var(--w)*.06) solid #f7f2e8;box-shadow:0 3px 8px rgba(0,0,0,.45),inset 0 0 12px rgba(0,0,0,.35);pointer-events:none}
.bac-cover::after{content:"V";position:absolute;inset:0;display:grid;place-items:center;font-family:"Bungee",Impact;color:rgba(232,196,106,.85);font-size:calc(var(--w)*.4)}
.bac .vc-back{background:repeating-linear-gradient(45deg,#1b3f8c 0 4px,#132f6d 4px 8px)}
.bac-lift{z-index:4;transform:scale(1.18) translateY(-6px);transition:transform .25s;filter:drop-shadow(0 10px 12px rgba(0,0,0,.55))}
.bac-third.bac-lift{transform:rotate(90deg) scale(1.18)}
.bac-spots{width:100%;display:grid;gap:8px;grid-template-columns:1fr 1.2fr 1fr}
.bac-spots .vc-spot{min-height:clamp(64px,9vh,92px);border-radius:14px;justify-content:center;gap:2px}
.bac-spots .vc-spot .vc-spot-l{font:400 clamp(12px,1.8vw,17px) "Bungee",Impact,sans-serif}
.bac-spots .vc-spot small{font:600 11px "Chakra Petch",sans-serif}
.bac-spots .vc-spot.has .vc-spot-l,.bac-spots .vc-spot.has small{opacity:.25}
.bac-spots .bac-sP,.bac-spots .bac-sB{grid-column:span 1}
.bac-big{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:8px}
.bac-big .vc-spot{min-height:clamp(78px,12vh,120px)}
.vc-spot.bac-sP{border-color:#5d8bff;background:rgba(40,80,200,.18)}.vc-spot.bac-sP .vc-spot-l{color:#bcd0ff}
.vc-spot.bac-sB{border-color:#ff5d5d;background:rgba(200,30,40,.18)}.vc-spot.bac-sB .vc-spot-l{color:#ffc4c4}
.vc-spot.bac-sT{border-color:#5fd88a;background:rgba(20,140,60,.18)}.vc-spot.bac-sT .vc-spot-l{color:#bff5d0}
.vc-spot.bac-sPP,.vc-spot.bac-sBP{border-style:dashed}
.bac-info{width:100%;display:flex;justify-content:space-between;align-items:center;gap:8px;font:600 12px "Chakra Petch",sans-serif;color:var(--dim);flex-wrap:wrap}
.bac-info .vc-btn{min-height:30px}
.bac-shoe{display:flex;align-items:center;gap:6px}.bac-shoe i{display:inline-block;width:70px;height:6px;border-radius:3px;background:rgba(0,0,0,.5);overflow:hidden;position:relative}
.bac-shoe i b{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#e8c46a,#fff3c8);transition:width .3s}
.vc-spot.push{animation:bacpush 1.4s}@keyframes bacpush{0%,50%{background:rgba(255,224,138,.3)}}
.bac.bac-locked .vc-rack{opacity:.35;pointer-events:none;filter:grayscale(.5)}
@media (max-width:560px){
  .bac .vc-btn kbd{display:none}
  .bac.bac-locked .vc-rack-slot{display:none}
  .bac-board{grid-template-columns:minmax(0,1fr) minmax(0,1.5fr);padding:4px;gap:5px}
  .bac-grid{--c:14px}
  .bac-hands{grid-template-columns:1fr 1fr}.bac-vs{display:none}
  .bac-cards{--cw:48px;gap:3px}.bac-third{margin:0 10px!important}
  .bac-side{padding:6px 2px 8px}
}
@media (max-height:700px){.bac-grid{--c:clamp(12px,1.7vw,16px)}.bac-wrap{gap:7px}.bac-side{padding:5px 6px 7px;gap:5px}.bac-cards{--cw:clamp(48px,7vw,74px)}}
@media (max-height:470px){.bac-grid{--c:11px}.bac-board-h{font-size:11px}.bac .vc-msg{padding:3px 12px;font-size:14px}.bac .vc-bottom{padding-top:6px;padding-bottom:6px}}
@media (max-height:470px){.bac .vc-ttl small{display:none}.bac .vc-top{padding-top:5px;padding-bottom:5px}.bac .vc-btn kbd{display:none}.bac .vc-btn{min-height:38px;padding:7px 11px}.bac .vc-rack .vc-chip{--s:34px!important}.bac .vc-rack{padding:2px 6px}.bac.bac-locked .vc-rack-slot{display:none}.bac .vc-bottom{gap:6px 10px}}
@media (prefers-reduced-motion:reduce){.bac-bead.new,.bac-rc.new,.bac-tot.bump{animation:none}}
`;
  document.head.appendChild(s);
}

const LIM = { P: 10000, B: 10000, T: 1000, PP: 1000, BP: 1000 }, MINB = { P: 5, B: 5, T: 1, PP: 1, BP: 1 };
const NAMES = { P: 'Player', B: 'Banker', T: 'Tie', PP: 'Player Pair', BP: 'Banker Pair' };
const DECKS = 8;

export default {
  id: 'baccarat', title: 'Baccarat', kind: 'table',
  blurb: 'Punto Banco from an 8-deck shoe — Player, Banker or Tie, with a squeeze reveal and live scoreboard.',
  mount(root, api) {
    injectStyle();
    const scr = K.table(root, api, { title: 'Baccarat', subtitle: 'Punto Banco · 8 decks · Banker pays 0.95 to 1 · Tie 8 to 1', felt: 'blue', rack: [1, 5, 25, 100, 500, 1000], rules: RULES });
    scr.el.classList.add('bac');
    scr.felt.innerHTML = `
      <div class="bac-wrap">
        <div class="bac-board" aria-label="Scoreboard">
          <div class="bac-board-h"><span class="p">P <b class="cP">0</b></span><span class="b">B <b class="cB">0</b></span><span class="t">T <b class="cT">0</b></span><span class="pp" style="color:#1d4fd8">P-pair <b class="cPP">0</b></span><span class="bp" style="color:#c8102e">B-pair <b class="cBP">0</b></span><span class="n">Hand <b class="cN">0</b></span></div>
          <div class="bac-grid bac-beads" title="Bead plate"></div>
          <div class="bac-grid bac-road" title="Big road"></div>
        </div>
        <div class="bac-hands">
          <div class="bac-side bac-p"><div class="bac-head"><span>PLAYER</span><b class="bac-tot"></b></div><div class="vc-hand spread bac-cards"></div></div>
          <div class="bac-vs">VS</div>
          <div class="bac-side bac-b"><div class="bac-head"><span>BANKER</span><b class="bac-tot"></b></div><div class="vc-hand spread bac-cards"></div></div>
        </div>
        <div class="bac-spots"></div>
        <div class="bac-info"><span class="bac-shoe" title="Cards left in the shoe"><i><b></b></i><span class="bac-shoe-n"></span></span><span class="bac-comm"></span></div>
      </div>`;
    const $ = s => scr.felt.querySelector(s);
    const tableEl = $('.bac-wrap');
    const pSide = $('.bac-p'), bSide = $('.bac-b'), pCards = pSide.querySelector('.bac-cards'), bCards = bSide.querySelector('.bac-cards');
    const pTot = pSide.querySelector('.bac-tot'), bTot = bSide.querySelector('.bac-tot');
    const beadsEl = $('.bac-beads'), roadEl = $('.bac-road'), commEl = $('.bac-comm'), shoeBar = $('.bac-shoe i b'), shoeN = $('.bac-shoe-n'), info = $('.bac-info');

    // ------------------------------------------------------------ state
    const shoe = new K.Shoe(DECKS, .05);
    let phase = 'bet', busy = false, dead = false, lastBets = null, history = [], needBurn = true, cutOut = false;
    let owedCents = 0, commTotal = 0, results = [];
    let squeezeOn = true; try { squeezeOn = localStorage.getItem('bac-squeeze') !== '0'; } catch (e) { }
    const bets = { P: 0, B: 0, T: 0, PP: 0, BP: 0 };
    const timers = new Set();
    const fast = () => !!window.__vcFast;
    const sleep = ms => new Promise(r => { const t = setTimeout(() => { timers.delete(t); r(); }, fast() ? Math.min(ms, 30) : ms); timers.add(t); });
    const msg = (t, k = '') => { if (!dead) scr.msg(t, k); };
    const sumBets = b => b ? Object.values(b).reduce((a, c) => a + c, 0) : 0;

    const sqBtn = K.button('', () => { squeezeOn = !squeezeOn; try { localStorage.setItem('bac-squeeze', squeezeOn ? '1' : '0'); } catch (e) { } paintSq(); }, { cls: 'ghost', title: 'Slow, dramatic card reveals' });
    const paintSq = () => { sqBtn.textContent = 'Squeeze: ' + (squeezeOn ? 'On' : 'Off'); sqBtn.setAttribute('aria-pressed', squeezeOn); };
    paintSq(); info.insertBefore(sqBtn, commEl);

    // ------------------------------------------------------------ shoe
    function updateShoe() {
      const n = shoe.cards.length; shoeBar.style.width = (n / (DECKS * 52) * 100) + '%';
      shoeN.textContent = `${n} cards${cutOut ? ' · cut card out' : ''}`;
    }
    function draw() {
      const st = window.__bacStack;
      if (Array.isArray(st) && st.length) return parseCard(st.shift());
      const c = shoe.draw(); if (!cutOut && shoe.needsShuffle) cutOut = true; updateShoe(); return c;
    }
    async function newShoe(first) {
      if (!first) { msg('Cut card reached — shuffling a fresh 8-deck shoe…'); K.sfx.chips(6); await sleep(1100); shoe.reset(); }
      cutOut = false; results = []; drawBoard();
      // burn ritual: flip the first card, burn that many more (10s and faces burn 10)
      const bc = shoe.draw(), n = cardPt(bc) || 10;
      for (let i = 0; i < n; i++) shoe.draw();
      updateShoe();
      const el = await K.dealTo(pCards, bc, { fast: fast() });
      msg(`New shoe — burn card ${bc.r}${K.SUIT_CH[bc.s]}, ${n} cards burned`);
      await sleep(1200); el.remove();
    }

    // ------------------------------------------------------------ scoreboard
    function drawBoard(animateLast = false) {
      const c = { P: 0, B: 0, T: 0, PP: 0, BP: 0 };
      results.forEach(r => { c[r.w]++; if (r.pp) c.PP++; if (r.bp) c.BP++; });
      for (const k of Object.keys(c)) $('.c' + k).textContent = c[k];
      $('.cN').textContent = results.length;
      // bead plate
      const cells = Math.max(results.length, 6 * 12);
      let h = '';
      for (let i = 0; i < cells; i++) {
        const r = results[i];
        h += r ? `<div class="bac-bead ${r.w}${animateLast && i === results.length - 1 ? ' new' : ''}" title="${NAMES[r.w]} ${r.pt}–${r.bt}">${r.w}${r.bp ? '<i class="bac-dot bp"></i>' : ''}${r.pp ? '<i class="bac-dot pp"></i>' : ''}</div>` : '<div></div>';
      }
      beadsEl.innerHTML = h;
      // big road
      const occ = new Set(), cellsR = []; let col = -1, row = 0, startCol = -1, last = null, leadTies = 0;
      for (const r of results) {
        if (r.w === 'T') { if (cellsR.length) cellsR[cellsR.length - 1].ties++; else leadTies++; continue; }
        if (r.w !== last) { startCol++; col = startCol; row = 0; while (occ.has(col + ',0')) { col++; startCol = col; } last = r.w; }
        else if (row + 1 < 6 && !occ.has(col + ',' + (row + 1))) row++;
        else col++;
        occ.add(col + ',' + row);
        cellsR.push({ w: r.w, col, row, ties: 0, pp: r.pp, bp: r.bp });
      }
      if (cellsR.length && leadTies) cellsR[0].ties += leadTies;
      const maxCol = cellsR.reduce((m, c) => Math.max(m, c.col), 0);
      roadEl.style.gridTemplateColumns = `repeat(${Math.max(maxCol + 2, 24)},var(--c))`;
      roadEl.innerHTML = cellsR.map((c, i) => `<div class="bac-rc ${c.w}${animateLast && i === cellsR.length - 1 ? ' new' : ''}" style="grid-column:${c.col + 1};grid-row:${c.row + 1}">${c.ties ? '<i></i>' : ''}${c.ties > 1 ? `<em>${c.ties}</em>` : ''}${c.bp ? '<i class="bac-dot bp"></i>' : ''}${c.pp ? '<i class="bac-dot pp"></i>' : ''}</div>`).join('');
      requestAnimationFrame(() => { // keep the latest result in view (right edge), not the empty tail of the grid
        const show = (box, sel) => { const l = box.querySelectorAll(sel); const e = l[l.length - 1]; box.scrollLeft = e ? Math.max(0, e.offsetLeft + e.offsetWidth * 2 - box.clientWidth) : 0; };
        show(beadsEl, '.bac-bead'); show(roadEl, '.bac-rc');
      });
    }
    function paintComm() {
      commEl.textContent = `Commission paid ${K.fmt(commTotal)}${owedCents ? ` · box $${(owedCents / 100).toFixed(2)}` : ''}`;
    }

    // ------------------------------------------------------------ bet spots
    const spots = {
      PP: K.betSpot('P Pair', () => addChip('PP'), { cls: 'bac-sPP', sub: '11 : 1' }),
      T: K.betSpot('Tie', () => addChip('T'), { cls: 'bac-sT', sub: '8 : 1' }),
      BP: K.betSpot('B Pair', () => addChip('BP'), { cls: 'bac-sBP', sub: '11 : 1' }),
      P: K.betSpot('Player', () => addChip('P'), { cls: 'bac-sP', sub: '1 : 1' }),
      B: K.betSpot('Banker', () => addChip('B'), { cls: 'bac-sB', sub: '0.95 : 1 · 5% comm.' }),
    };
    const spotsEl = $('.bac-spots'), big = document.createElement('div'); big.className = 'bac-big';
    spotsEl.append(spots.PP.el, spots.T.el, spots.BP.el, big); big.append(spots.P.el, spots.B.el);
    for (const k of Object.keys(spots)) spots[k].onRemove = () => removeSpot(k);

    function addChip(k, v = scr.rack.value) {
      if (phase !== 'bet' || busy) return;
      if (bets[k] + v > LIM[k]) { msg(`Table limit on ${NAMES[k]} is ${K.fmt(LIM[k])}`, 'lose'); return; }
      if (!api.bet(v)) { msg(`Not enough chips for a ${K.fmt(v)} chip`, 'lose'); return; }
      bets[k] += v; history.push([k, v]); spots[k].set(bets[k]); K.sfx.chip();
      msg(Object.keys(bets).filter(x => bets[x]).map(x => `${NAMES[x]} ${K.fmt(bets[x])}`).join(' · ') + ' — press Deal');
      render();
    }
    function removeSpot(k) {
      if (phase !== 'bet' || busy || !bets[k]) return;
      api.win(bets[k]); bets[k] = 0; spots[k].set(0); history = history.filter(h => h[0] !== k); K.sfx.chips(2); render();
    }
    function undo() {
      if (phase !== 'bet' || busy || !history.length) return;
      const [k, v] = history.pop(); bets[k] -= v; api.win(v); spots[k].set(bets[k]); K.sfx.chip(); render();
    }
    function clearBets() {
      if (phase !== 'bet' || busy) return;
      const t = sumBets(bets); if (t) { api.win(t); K.sfx.chips(3); }
      for (const k in bets) { bets[k] = 0; spots[k].set(0); } history = [];
      msg('Bets cleared — choose a chip and place a bet'); render();
    }
    function rebet(andDeal) {
      if (phase !== 'bet' || busy || !lastBets || sumBets(bets)) return;
      if (sumBets(lastBets) > api.balance) { msg(`Not enough chips to rebet ${K.fmt(sumBets(lastBets))}`, 'lose'); return; }
      for (const k in lastBets) if (lastBets[k]) { api.bet(lastBets[k]); bets[k] = lastBets[k]; history.push([k, lastBets[k]]); spots[k].set(bets[k]); }
      K.sfx.chips(4);
      if (andDeal) deal(); else { msg(`Rebet ${K.fmt(sumBets(bets))} — press Deal`); render(); }
    }
    function betProblem() {
      if (!sumBets(bets)) return 'Place a bet first';
      for (const k of ['P', 'B']) if (bets[k] && bets[k] < MINB[k]) return `Minimum ${NAMES[k]} bet is ${K.fmt(MINB[k])}`;
      return '';
    }

    // ------------------------------------------------------------ reveal
    async function reveal(el, card, dramatic) {
      if (!dramatic || !squeezeOn || fast() || !el.animate) { K.flipCard(el, card); await sleep(380); return; }
      el.classList.add('bac-sqz', 'bac-lift');
      const cover = document.createElement('div'); cover.className = 'bac-cover'; el.appendChild(cover);
      K.flipCard(el, card);
      const F = 'polygon(0% 0%,100% 0%,100% 100%,100% 100%,0% 100%)';
      const P1 = 'polygon(0% 0%,100% 0%,100% 74%,78% 100%,0% 100%)';
      const P2 = 'polygon(0% 0%,100% 0%,100% 50%,58% 100%,0% 100%)';
      const G = 'polygon(0% 0%,0% 0%,0% 0%,0% 0%,0% 0%)';
      const a = cover.animate([{ clipPath: F }, { clipPath: P1, offset: .3 }, { clipPath: P1, offset: .5 }, { clipPath: P2, offset: .72 }, { clipPath: P2, offset: .8 }, { clipPath: G }],
        { duration: 1700, easing: 'ease-in-out', fill: 'forwards' });
      const t = setTimeout(() => K.sfx.flip(), 500); timers.add(t);
      try { await a.finished; } catch (e) { }
      cover.remove(); el.classList.remove('bac-lift');
      await sleep(120); el.classList.remove('bac-sqz');
    }
    const setTot = (el, cards) => { el.textContent = bacValue(cards); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); };

    // ------------------------------------------------------------ round
    async function deal() {
      if (phase !== 'bet' || busy) return;
      const prob = betProblem(); if (prob) { msg(prob, 'lose'); return; }
      busy = true; phase = 'deal'; lastBets = { ...bets }; history = []; render();
      pSide.classList.remove('win', 'nat'); bSide.classList.remove('win', 'nat');
      if (pCards.children.length || bCards.children.length) {
        [...pCards.children, ...bCards.children].forEach(c => { c.style.transition = 'transform .3s ease-in, opacity .3s'; c.style.transform = 'translate(0,-40vh) rotate(20deg)'; c.style.opacity = '0'; });
        await sleep(320);
      }
      pCards.innerHTML = ''; bCards.innerHTML = ''; pTot.textContent = ''; bTot.textContent = '';
      if (needBurn || cutOut || shoe.needsShuffle) { await newShoe(needBurn); needBurn = false; }
      const c = coup(draw);
      msg('No more bets — dealing');
      const els = {};
      els.p0 = await K.dealTo(pCards, null, { faceDown: true, fast: fast() });
      els.b0 = await K.dealTo(bCards, null, { faceDown: true, fast: fast() });
      els.p1 = await K.dealTo(pCards, null, { faceDown: true, fast: fast() });
      els.b1 = await K.dealTo(bCards, null, { faceDown: true, fast: fast() });
      await sleep(250);
      msg('Player’s cards…');
      await reveal(els.p0, c.p[0], false); await reveal(els.p1, c.p[1], true); setTot(pTot, c.p.slice(0, 2));
      msg(`Player shows ${bacValue(c.p.slice(0, 2))} — Banker’s cards…`);
      await reveal(els.b0, c.b[0], false); await reveal(els.b1, c.b[1], true); setTot(bTot, c.b.slice(0, 2));
      const p2 = bacValue(c.p.slice(0, 2)), b2 = bacValue(c.b.slice(0, 2));
      if (c.natural) {
        if (p2 >= 8) pSide.classList.add('nat'); if (b2 >= 8) bSide.classList.add('nat');
        msg(`Natural ${Math.max(p2, b2)}! Both hands stand`); await sleep(700);
      } else {
        if (c.p.length === 3) {
          msg(`Player has ${p2} — draws a third card`); await sleep(450);
          const el = await K.dealTo(pCards, null, { faceDown: true, fast: fast() }); el.classList.add('bac-third');
          await sleep(200); await reveal(el, c.p[2], true); setTot(pTot, c.p);
        } else { msg(`Player stands on ${p2}`); await sleep(600); }
        if (c.b.length === 3) {
          msg(`Banker has ${b2}${c.p.length === 3 ? ` against a Player third card of ${cardPt(c.p[2])}` : ''} — Banker draws`); await sleep(600);
          const el = await K.dealTo(bCards, null, { faceDown: true, fast: fast() }); el.classList.add('bac-third');
          await sleep(200); await reveal(el, c.b[2], true); setTot(bTot, c.b);
        } else { msg(`Banker stands on ${b2}`); await sleep(600); }
      }
      settle(c);
    }
    function settle(c) {
      const w = c.winner, stake = sumBets(bets);
      let ret = 0, comm = 0; const notes = [];
      if (bets.P) { if (w === 'P') ret += bets.P * 2; else if (w === 'T') ret += bets.P; }
      if (bets.B) {
        if (w === 'B') {
          owedCents += bets.B * 5;
          comm = Math.min(Math.floor(owedCents / 100), bets.B); owedCents -= comm * 100; commTotal += comm;
          ret += bets.B * 2 - comm;
        } else if (w === 'T') ret += bets.B;
      }
      if (bets.T && w === 'T') { ret += bets.T * 9; notes.push(`Tie pays ${K.fmt(bets.T * 8)}`); }
      if (bets.PP && c.pPair) { ret += bets.PP * 12; notes.push(`Player Pair pays ${K.fmt(bets.PP * 11)}`); }
      if (bets.BP && c.bPair) { ret += bets.BP * 12; notes.push(`Banker Pair pays ${K.fmt(bets.BP * 11)}`); }
      if (ret) api.win(ret);
      // flashes
      const won = { P: w === 'P', B: w === 'B', T: w === 'T', PP: c.pPair, BP: c.bPair };
      for (const k in bets) if (bets[k]) spots[k].flash(won[k] ? 'win' : (w === 'T' && (k === 'P' || k === 'B')) ? 'push' : 'lose');
      if (w !== 'T') (w === 'P' ? pSide : bSide).classList.add('win'); else { pSide.classList.add('win'); bSide.classList.add('win'); }
      // narration
      const net = ret - stake;
      const head = w === 'T' ? `Tie at ${c.pt}` : `${w === 'P' ? 'Player' : 'Banker'} wins ${Math.max(c.pt, c.bt)} to ${Math.min(c.pt, c.bt)}`;
      let tail;
      if (net > 0) tail = `you win ${K.fmt(net)}`;
      else if (net < 0) tail = ret ? `you lose ${K.fmt(-net)} net` : `you lose ${K.fmt(stake)}`;
      else tail = 'push, bets returned';
      if (comm || (bets.B && w === 'B' && owedCents)) notes.push(`${K.fmt(comm)} commission${owedCents ? ` (+$${(owedCents / 100).toFixed(2)} in box)` : ''}`);
      if (w === 'T' && (bets.P || bets.B)) notes.push('Player/Banker push');
      msg(`${head} — ${tail}${notes.length ? ' · ' + notes.join(' · ') : ''}`, net > 0 ? 'win' : net < 0 ? 'lose' : 'push');
      if (net > 0) { K.banner(scr, w === 'T' && bets.T ? 'TIE! +' + K.fmt(net) : '+' + K.fmt(net), 'win'); net >= stake * 5 ? K.sfx.bigWin() : K.sfx.win(); }
      else if (net < 0) { K.banner(scr, `${w === 'P' ? 'PLAYER' : w === 'B' ? 'BANKER' : 'TIE'} ${Math.max(c.pt, c.bt)}`, 'lose'); K.sfx.lose(); }
      else { K.banner(scr, w === 'T' ? 'TIE · PUSH' : 'PUSH', 'push'); K.sfx.push(); }
      results.push({ w, pt: c.pt, bt: c.bt, pp: c.pPair, bp: c.bPair }); drawBoard(true); paintComm();
      for (const k in bets) { bets[k] = 0; spots[k].set(0); }
      phase = 'bet'; busy = false; render();
      window.__bacLast = { ...c, p: c.p.map(x => x.r + x.s), b: c.b.map(x => x.r + x.s), ret, stake, comm };
    }

    // ------------------------------------------------------------ controls
    const kb = k => `<kbd>${k}</kbd>`;
    const B = {
      undo: K.button('Undo', undo, { title: 'Remove last chip (U)' }),
      clear: K.button('Clear' + kb('C'), clearBets, { title: 'Take back all bets' }),
      rebet: K.button('Rebet', () => rebet(false), { title: 'Place the same bets as last hand' }),
      rebetDeal: K.button('Rebet &amp; Deal' + kb('↵'), () => rebet(true), { primary: true }),
      deal: K.button('Deal' + kb('↵'), deal, { primary: true }),
    };
    Object.values(B).forEach(b => scr.controls.appendChild(b));
    const keymap = [['Enter', B.deal], ['Enter', B.rebetDeal], ['u', B.undo], ['Backspace', B.undo], ['c', B.clear]];
    const onKey = e => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      for (const [kk, b] of keymap) if (kk === k && !b.disabled && !b.hidden && b.isConnected) { e.preventDefault(); b.click(); return; }
    };
    window.addEventListener('keydown', onKey);
    function render() {
      if (dead) return;
      const betP = phase === 'bet' && !busy, total = sumBets(bets), reb = phase === 'bet' && !total && !!lastBets;
      B.undo.disabled = !betP || !history.length; B.clear.disabled = !betP || !total;
      B.rebet.hidden = B.rebetDeal.hidden = !reb; B.deal.hidden = reb;
      B.rebet.disabled = B.rebetDeal.disabled = !betP || !lastBets || sumBets(lastBets) > api.balance;
      B.deal.disabled = !betP || !total;
      scr.setBusy(!betP); scr.el.classList.toggle('bac-locked', !betP);
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
    updateShoe(); drawBoard(); paintComm(); render(); queueFit();
    msg('Choose a chip and bet on Player, Banker or Tie — then Deal');

    return {
      unmount() {
        dead = true;
        timers.forEach(t => clearTimeout(t)); timers.clear();
        cancelAnimationFrame(fitRaf); if (ro) ro.disconnect(); else window.removeEventListener('resize', queueFit);
        window.removeEventListener('keydown', onKey);
        const t = sumBets(bets); if (t) api.win(t); // chips not yet settled go back to the player
        scr.destroy();
      }
    };
  }
};
