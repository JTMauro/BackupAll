// Valley Casino — shared kit for every game screen: table layout, cards, chips, dice, sounds, RNG.
// Each game is an ES module in games/ that does:
//   import * as K from './_kit.js';
//   export default { id, title, kind, blurb, mount(root, api) { ...; return { unmount() {} }; } };
// The host passes `api`:
//   api.balance        -> current chip balance in whole dollars (getter)
//   api.bet(d)         -> takes d dollars from the balance; returns false (and does nothing) if short
//   api.win(d)         -> pays d dollars back to the balance (stake + winnings, i.e. total returned)
//   api.toast(msg)     -> short message on the floor HUD
//   api.exit()         -> leave the game and return to the casino floor
//   api.onBalance(fn)  -> fn(balance) whenever the balance changes; returns an unsubscribe function

// ---------------------------------------------------------------- randomness (crypto, unbiased)
export function rand(n) {
  const a = new Uint32Array(1), lim = Math.floor(0x100000000 / n) * n;
  do crypto.getRandomValues(a); while (a[0] >= lim);
  return a[0] % n;
}
export const pick = arr => arr[rand(arr.length)];
export function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = rand(i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
export const wait = ms => new Promise(r => setTimeout(r, ms));
export const fmt = d => '$' + Math.round(d).toLocaleString('en-US');

// ---------------------------------------------------------------- cards
export const SUITS = ['s', 'h', 'd', 'c'];
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const SUIT_CH = { s: '♠', h: '♥', d: '♦', c: '♣' };
export const rankValue = r => RANKS.indexOf(r) + 2; // 2..14 (ace high)
export class Shoe {
  constructor(decks = 1, cutFrac = .25) { this.decks = decks; this.cutFrac = cutFrac; this.reset(); }
  reset() { this.cards = []; for (let d = 0; d < this.decks; d++) for (const s of SUITS) for (const r of RANKS) this.cards.push({ r, s }); shuffle(this.cards); this.cut = Math.floor(this.cards.length * this.cutFrac); }
  draw() { if (!this.cards.length) this.reset(); return this.cards.pop(); }
  get needsShuffle() { return this.cards.length <= this.cut; }
}
// Card element. card.r: '2'..'10','J','Q','K','A'; card.s: 's','h','d','c'. Pass faceDown to show the back.
// Use flipCard(el, card) to turn a face-down card over with an animation.
export function cardEl(card, { faceDown = false, small = false } = {}) {
  const el = document.createElement('div');
  el.className = 'vc-card' + (small ? ' sm' : '') + (faceDown ? ' down' : '');
  el.innerHTML = `<div class="vc-card-in"><div class="vc-face"></div><div class="vc-back"></div></div>`;
  if (card) paintFace(el, card);
  return el;
}
function paintFace(el, card) {
  const red = card.s === 'h' || card.s === 'd', ch = SUIT_CH[card.s], face = el.querySelector('.vc-face');
  face.classList.toggle('red', red);
  const court = { J: 'J', Q: 'Q', K: 'K' }[card.r];
  const pips = { A: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10 }[card.r];
  let mid = '';
  if (court) mid = `<div class="vc-court"><span>${court}</span><i>${ch}</i></div>`;
  else if (pips === 1) mid = `<div class="vc-ace">${ch}</div>`;
  else mid = `<div class="vc-pips p${pips}">${Array.from({ length: pips }, (_, i) => `<i class="q${i}">${ch}</i>`).join('')}</div>`;
  face.innerHTML = `<div class="vc-ix tl"><b>${card.r}</b><i>${ch}</i></div>${mid}<div class="vc-ix br"><b>${card.r}</b><i>${ch}</i></div>`;
  el.dataset.card = card.r + card.s;
}
export function flipCard(el, card) { if (card) paintFace(el, card); el.classList.remove('down'); sfx.flip(); }
// Deal: animate a card element into a container (slides from the top as if from the shoe).
export async function dealTo(container, card, opts = {}) {
  const el = cardEl(card, opts); el.classList.add('deal'); container.appendChild(el); sfx.card();
  await wait(opts.fast ? 120 : 260); el.classList.remove('deal'); return el;
}
// Poker hand evaluation (5 to 7 cards). Returns { cat: 0..9, name, score } — higher score wins.
// cat: 0 high card, 1 pair, 2 two pair, 3 trips, 4 straight, 5 flush, 6 full house, 7 quads, 8 straight flush, 9 royal flush.
export const HAND_NAMES = ['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush', 'Royal Flush'];
export function evalHand(cards) {
  if (cards.length > 5) { let best = null; for (const c5 of combos(cards, 5)) { const e = evalHand(c5); if (!best || e.score > best.score) best = e; } return best; }
  const v = cards.map(c => rankValue(c.r)).sort((a, b) => b - a);
  const flush = cards.length === 5 && cards.every(c => c.s === cards[0].s);
  const uniq = [...new Set(v)];
  let straightHi = 0;
  if (uniq.length === 5) { if (v[0] - v[4] === 4) straightHi = v[0]; else if (v[0] === 14 && v[1] === 5) straightHi = 5; }
  const counts = {}; v.forEach(x => counts[x] = (counts[x] || 0) + 1);
  const groups = Object.entries(counts).map(([k, n]) => [n, +k]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  let cat, kick;
  if (straightHi && flush) { cat = straightHi === 14 ? 9 : 8; kick = [straightHi]; }
  else if (groups[0][0] === 4) { cat = 7; kick = groups.map(g => g[1]); }
  else if (groups[0][0] === 3 && groups[1] && groups[1][0] >= 2) { cat = 6; kick = groups.map(g => g[1]); }
  else if (flush) { cat = 5; kick = v; }
  else if (straightHi) { cat = 4; kick = [straightHi]; }
  else if (groups[0][0] === 3) { cat = 3; kick = groups.map(g => g[1]); }
  else if (groups[0][0] === 2 && groups[1] && groups[1][0] === 2) { cat = 2; kick = groups.map(g => g[1]); }
  else if (groups[0][0] === 2) { cat = 1; kick = groups.map(g => g[1]); }
  else { cat = 0; kick = v; }
  let score = cat; for (let i = 0; i < 5; i++) score = score * 15 + (kick[i] || 0);
  return { cat, name: HAND_NAMES[cat], score, cards };
}
export function* combos(arr, k, start = 0, acc = []) {
  if (acc.length === k) { yield acc.slice(); return; }
  for (let i = start; i <= arr.length - (k - acc.length); i++) { acc.push(arr[i]); yield* combos(arr, k, i + 1, acc); acc.pop(); }
}

// ---------------------------------------------------------------- chips
export const CHIP_COLORS = { 1: '#f2f2f2', 5: '#d32f2f', 10: '#1e5bd8', 25: '#2e9d4a', 100: '#1b1b1b', 500: '#7b3fbf', 1000: '#f0b400', 5000: '#d45d9e' };
export function chipEl(value, { size = 44 } = {}) {
  const el = document.createElement('div'); el.className = 'vc-chip';
  el.style.setProperty('--c', CHIP_COLORS[value] || '#888'); el.style.setProperty('--s', size + 'px');
  if (value === 1 || value === 1000) el.classList.add('light');
  el.innerHTML = `<span>${value >= 1000 ? value / 1000 + 'K' : value}</span>`;
  return el;
}
// Break an amount into chip denominations (largest first) for stacking on a bet spot.
export function chipBreakdown(amt) {
  const out = []; for (const v of [5000, 1000, 500, 100, 25, 10, 5, 1]) while (amt >= v && out.length < 12) { out.push(v); amt -= v; }
  return out;
}
// A stack shown on a bet spot. Call stack.set(amount) to redraw. Element: stack.el
export function chipStack(amount = 0) {
  const el = document.createElement('div'); el.className = 'vc-stack';
  const st = { el, amount: 0, set(a) {
    st.amount = a; el.innerHTML = ''; if (!a) { el.hidden = true; return; } el.hidden = false;
    chipBreakdown(a).reverse().forEach((v, i) => { const c = chipEl(v, { size: 34 }); c.style.setProperty('--i', i); el.appendChild(c); });
    const lab = document.createElement('b'); lab.textContent = fmt(a); el.appendChild(lab);
  } };
  st.set(amount); return st;
}
// Chip rack the player picks a denomination from. Returns { el, get value() }.
export function chipRack(values = [1, 5, 25, 100, 500], initial) {
  const el = document.createElement('div'); el.className = 'vc-rack'; el.setAttribute('role', 'radiogroup'); el.setAttribute('aria-label', 'Chip value');
  let value = initial || values[Math.min(1, values.length - 1)];
  const btns = values.map(v => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'vc-rack-b'; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', fmt(v) + ' chip');
    b.appendChild(chipEl(v)); b.addEventListener('click', () => { value = v; sync(); sfx.chip(); }); el.appendChild(b); return [v, b];
  });
  const sync = () => btns.forEach(([v, b]) => { b.classList.toggle('sel', v === value); b.setAttribute('aria-checked', v === value); });
  sync();
  return { el, get value() { return value; }, set value(v) { value = v; sync(); } };
}

// ---------------------------------------------------------------- dice
// Die element showing n (1..6). die.roll(n) animates a tumble and lands on n.
export function dieEl(n = 1, { color = '#c8102e', size = 54 } = {}) {
  const el = document.createElement('div'); el.className = 'vc-die'; el.style.setProperty('--dc', color); el.style.setProperty('--ds', size + 'px');
  const draw = v => { el.dataset.v = v; el.innerHTML = Array.from({ length: 9 }, (_, i) => `<i class="${DIE_PIPS[v].includes(i) ? 'on' : ''}"></i>`).join(''); };
  draw(n);
  el.roll = async (v, ms = 900) => {
    el.classList.add('rolling'); const t0 = performance.now();
    while (performance.now() - t0 < ms) { draw(1 + rand(6)); await wait(70); }
    draw(v); el.classList.remove('rolling'); el.classList.add('land'); setTimeout(() => el.classList.remove('land'), 300);
  };
  return el;
}
const DIE_PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

// ---------------------------------------------------------------- sound (WebAudio, no files)
let ac = null, muted = false;
function ctx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } if (ac && ac.state === 'suspended') ac.resume(); return ac; }
export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }
// The shared AudioContext (created on first use, resumed if suspended). The floor uses it for ambience and music.
export function audioCtx() { return ctx(); }
export function tone(freq, dur = .1, { type = 'sine', vol = .15, delay = 0, slide = 0 } = {}) {
  const a = ctx(); if (!a || muted) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .02);
}
function noise(dur = .05, { vol = .2, delay = 0, hp = 1000, lp = 8000 } = {}) {
  const a = ctx(); if (!a || muted) return;
  const t = a.currentTime + delay, n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
  const s = a.createBufferSource(); s.buffer = buf;
  const f1 = a.createBiquadFilter(); f1.type = 'highpass'; f1.frequency.value = hp;
  const f2 = a.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = lp;
  const g = a.createGain(); g.gain.value = vol; s.connect(f1).connect(f2).connect(g).connect(a.destination); s.start(t);
}
export const sfx = {
  chip() { noise(.04, { vol: .35, hp: 2500 }); tone(3200 + Math.random() * 600, .05, { type: 'triangle', vol: .05 }); },
  chips(n = 4) { for (let i = 0; i < n; i++) { noise(.035, { vol: .3, hp: 2500, delay: i * .045 }); } },
  card() { noise(.07, { vol: .3, hp: 1500, lp: 6000 }); },
  flip() { noise(.05, { vol: .25, hp: 2000 }); },
  dice() { for (let i = 0; i < 7; i++) noise(.03, { vol: .35, hp: 600, lp: 3000, delay: i * .06 + Math.random() * .03 }); },
  tick() { tone(1800, .02, { type: 'square', vol: .04 }); },
  ball() { noise(.02, { vol: .15, hp: 3000 }); },
  reelStop() { tone(140, .08, { type: 'square', vol: .1 }); noise(.04, { vol: .2, hp: 400, lp: 2000 }); },
  button() { tone(880, .05, { type: 'square', vol: .06 }); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .14, { type: 'triangle', vol: .12, delay: i * .08 })); },
  bigWin() { for (let i = 0; i < 14; i++) tone([523, 659, 784, 1047, 1319][i % 5], .12, { type: 'square', vol: .07, delay: i * .07 }); this.chips(10); },
  lose() { tone(330, .18, { type: 'triangle', vol: .08 }); tone(247, .3, { type: 'triangle', vol: .08, delay: .15 }); },
  push() { tone(600, .12, { type: 'triangle', vol: .07 }); }
};

// ---------------------------------------------------------------- table screen layout
// table(root, api, opts) builds the standard screen and returns handles:
//   { el, felt, msg(text, tone?), controls, rack?, setBusy(bool), help(html) }
// opts: { title, subtitle, felt: 'green'|'blue'|'red'|'purple'|'black', rack: [chip values] | false, rules: html }
// `felt` is the main play area (flex column, centered); put your layout in it.
// `controls` is the bottom bar for action buttons; use K.button(label, onClick, {primary, key}).
// msg(text, 'win'|'lose'|'push'|'') shows the dealer/status line.
export function table(root, api, opts = {}) {
  injectStyles();
  root.innerHTML = '';
  const el = document.createElement('div'); el.className = 'vc-screen felt-' + (opts.felt || 'green');
  el.innerHTML = `
    <header class="vc-top">
      <div class="vc-ttl"><b></b><small></small></div>
      <div class="vc-bal" aria-live="polite"><span>CHIPS</span><b></b></div>
      <div class="vc-topbtns"><button type="button" class="vc-btn ghost vc-rules-b">Rules</button><button type="button" class="vc-btn ghost vc-leave">Leave table</button></div>
    </header>
    <main class="vc-felt"></main>
    <div class="vc-msg" aria-live="polite"></div>
    <footer class="vc-bottom"><div class="vc-rack-slot"></div><div class="vc-controls"></div></footer>
    <div class="vc-rules" hidden><div class="vc-rules-in"><button type="button" class="vc-btn ghost vc-rules-x" aria-label="Close rules">Close</button><div class="vc-rules-body"></div></div></div>`;
  root.appendChild(el);
  el.querySelector('.vc-ttl b').textContent = opts.title || '';
  el.querySelector('.vc-ttl small').textContent = opts.subtitle || '';
  const balEl = el.querySelector('.vc-bal b');
  const setBal = b => { balEl.textContent = fmt(b); };
  setBal(api.balance);
  const unsub = api.onBalance ? api.onBalance(setBal) : null;
  const rules = el.querySelector('.vc-rules');
  el.querySelector('.vc-rules-body').innerHTML = opts.rules || '<p>No rules provided.</p>';
  el.querySelector('.vc-rules-b').addEventListener('click', () => { rules.hidden = !rules.hidden; });
  el.querySelector('.vc-rules-x').addEventListener('click', () => { rules.hidden = true; });
  el.querySelector('.vc-leave').addEventListener('click', () => api.exit());
  const msgEl = el.querySelector('.vc-msg');
  let rack = null;
  if (opts.rack !== false) { rack = chipRack(opts.rack || [1, 5, 25, 100, 500]); el.querySelector('.vc-rack-slot').appendChild(rack.el); }
  const keyHandlers = [];
  const onKey = e => { if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; for (const h of keyHandlers) if (h.key === e.key.toLowerCase() || h.key === e.code) { const b = h.btn; if (!b.disabled && !b.hidden && b.isConnected) { e.preventDefault(); b.click(); } return; } };
  window.addEventListener('keydown', onKey);
  return {
    el, felt: el.querySelector('.vc-felt'), controls: el.querySelector('.vc-controls'), rack,
    msg(text, kind = '') { msgEl.textContent = text; msgEl.className = 'vc-msg ' + kind; },
    setBusy(b) { el.classList.toggle('busy', b); },
    // register a keyboard shortcut for a button (key: 'd', ' ', 'Enter', etc.)
    bindKey(key, btn) { keyHandlers.push({ key: key.length === 1 ? key.toLowerCase() : key, btn }); },
    destroy() { window.removeEventListener('keydown', onKey); if (unsub) unsub(); root.innerHTML = ''; }
  };
}
export function button(label, onClick, { primary = false, cls = '', title = '' } = {}) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'vc-btn' + (primary ? ' primary' : '') + (cls ? ' ' + cls : ''); b.innerHTML = label;
  if (title) b.title = title;
  b.addEventListener('click', e => { sfx.button(); onClick(e); }); return b;
}
// A bet spot: a labelled, clickable area that holds a chip stack. Clicking calls onClick(spot).
// spot.el, spot.stack, spot.amount, spot.set(amount), spot.flash('win'|'lose')
export function betSpot(label, onClick, { cls = '', sub = '' } = {}) {
  const el = document.createElement('button'); el.type = 'button'; el.className = 'vc-spot ' + cls;
  el.innerHTML = `<span class="vc-spot-l">${label}</span>${sub ? `<small>${sub}</small>` : ''}`;
  const stack = chipStack(0); el.appendChild(stack.el);
  const spot = { el, stack, get amount() { return stack.amount; }, set(a) { stack.set(a); el.classList.toggle('has', a > 0); },
    flash(kind) { el.classList.remove('win', 'lose'); void el.offsetWidth; el.classList.add(kind); setTimeout(() => el.classList.remove(kind), 1600); } };
  el.addEventListener('click', e => onClick && onClick(spot, e));
  el.addEventListener('contextmenu', e => { e.preventDefault(); if (spot.onRemove) spot.onRemove(spot); });
  return spot;
}
// Big floating "+$250" / "BLACKJACK!" banner over the screen.
export function banner(screen, text, kind = 'win') {
  const b = document.createElement('div'); b.className = 'vc-banner ' + kind; b.textContent = text;
  (screen.el || screen).appendChild(b); setTimeout(() => b.remove(), 1900);
}

// ---------------------------------------------------------------- styles
let styled = false;
export function injectStyles() {
  if (styled) return; styled = true;
  const s = document.createElement('style'); s.id = 'vc-kit';
  s.textContent = `
.vc-screen{--gold:#e8c46a;--gold2:#a8842c;--ink:#0b0a08;--txt:#f6efe0;--dim:#c9bfa6;--felt:#0e5a34;--felt2:#073a20;--line:rgba(232,196,106,.45);
  position:absolute;inset:0;display:grid;grid-template-rows:auto 1fr auto auto;color:var(--txt);font-family:"Chakra Petch",system-ui,sans-serif;font-size:15px;
  background:radial-gradient(ellipse at 50% 38%,var(--felt) 0%,var(--felt2) 78%,#020604 100%);overflow:hidden;user-select:none;-webkit-user-select:none;touch-action:manipulation}
.vc-screen::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.18;background-image:radial-gradient(rgba(255,255,255,.35) 1px,transparent 1.4px);background-size:4px 4px;mix-blend-mode:overlay}
.felt-blue{--felt:#14407a;--felt2:#091f40}.felt-red{--felt:#7a1420;--felt2:#3a0810}.felt-purple{--felt:#4a1d74;--felt2:#200a38}.felt-black{--felt:#1d1a22;--felt2:#060509}.felt-teal{--felt:#0d5b5b;--felt2:#042a2a}
.vc-top{position:relative;z-index:2;display:flex;align-items:center;gap:12px;padding:10px max(16px,env(safe-area-inset-left,0px));padding-top:max(10px,env(safe-area-inset-top,0px));background:linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.15));border-bottom:1px solid var(--line)}
.vc-ttl{display:grid;min-width:0;flex:1}.vc-ttl b{font-family:"Bungee",Impact,sans-serif;font-weight:400;font-size:clamp(16px,2.6vw,24px);color:var(--gold);text-shadow:0 2px 0 #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vc-ttl small{font-size:12px;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vc-bal{display:grid;justify-items:end;gap:4px;line-height:1.15;background:rgba(0,0,0,.5);border:1px solid var(--line);border-radius:8px;padding:5px 12px}
.vc-bal span{font-family:"Press Start 2P",monospace;font-size:7px;color:var(--dim);letter-spacing:.08em}.vc-bal b{font-family:"Press Start 2P",monospace;font-weight:400;font-size:14px;color:var(--gold);font-variant-numeric:tabular-nums}
.vc-topbtns{display:flex;gap:6px}
.vc-felt{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:12px 16px;min-height:0;overflow:auto}
.vc-msg{position:relative;z-index:2;text-align:center;min-height:1.4em;padding:6px 16px;font-size:clamp(14px,2vw,18px);font-weight:600;color:var(--txt);text-shadow:0 1px 2px #000}
.vc-msg.win{color:#7dff9a}.vc-msg.lose{color:#ff8a80}.vc-msg.push{color:#ffe08a}
.vc-bottom{position:relative;z-index:2;display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;justify-content:center;padding:10px 16px;padding-bottom:max(12px,env(safe-area-inset-bottom,0px));background:linear-gradient(rgba(0,0,0,.15),rgba(0,0,0,.6));border-top:1px solid var(--line)}
.vc-controls{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.vc-btn{font:600 14px "Chakra Petch",system-ui,sans-serif;color:var(--txt);background:linear-gradient(#3a3226,#1f1a12);border:1px solid var(--gold2);border-radius:8px;padding:10px 16px;min-height:42px;cursor:pointer;letter-spacing:.02em;box-shadow:0 2px 0 #000}
.vc-btn:hover:not(:disabled){border-color:var(--gold);color:#fff}.vc-btn:active:not(:disabled){transform:translateY(1px)}
.vc-btn.primary{background:linear-gradient(#f3d27e,#c99a34);color:#1d1404;border-color:#ffe6a0}.vc-btn.primary:hover:not(:disabled){filter:brightness(1.08);color:#000}
.vc-btn.ghost{background:rgba(0,0,0,.35);min-height:34px;padding:6px 10px;font-size:12px}
.vc-btn:disabled{opacity:.38;cursor:not-allowed}.vc-btn kbd{font:9px "Press Start 2P",monospace;opacity:.7;margin-left:6px}
.vc-btn:focus-visible,.vc-spot:focus-visible,.vc-rack-b:focus-visible{outline:2px solid #fff;outline-offset:2px}
.busy .vc-spot{pointer-events:none}
.vc-rules[hidden]{display:none!important}
.vc-rules{position:absolute;inset:0;z-index:20;background:rgba(0,0,0,.72);display:grid;place-items:center;padding:16px}
.vc-rules-in{position:relative;width:min(640px,100%);max-height:100%;overflow:auto;background:#17130c;border:1px solid var(--gold2);border-radius:12px;padding:18px 20px;line-height:1.5}
.vc-rules-x{position:sticky;top:0;float:right}.vc-rules-body h3{font-family:"Bungee",Impact;font-weight:400;color:var(--gold);margin:.2em 0 .5em}.vc-rules-body table{border-collapse:collapse;width:100%;font-size:14px}
.vc-rules-body td,.vc-rules-body th{border-bottom:1px solid rgba(232,196,106,.2);padding:4px 6px;text-align:left}.vc-rules-body th{color:var(--gold)}
/* cards */
.vc-card{--w:clamp(52px,8.4vw,86px);width:var(--w);aspect-ratio:5/7;perspective:600px;flex:none;position:relative}
.vc-card.sm{--w:clamp(40px,6vw,60px)}
.vc-card-in{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .45s cubic-bezier(.3,.7,.3,1)}
.vc-card.down .vc-card-in{transform:rotateY(180deg)}
.vc-face,.vc-back{position:absolute;inset:0;border-radius:calc(var(--w)*.09);backface-visibility:hidden;-webkit-backface-visibility:hidden;box-shadow:0 3px 8px rgba(0,0,0,.45)}
.vc-face{background:linear-gradient(160deg,#fff,#f1ede4);color:#111;font-family:Georgia,"Times New Roman",serif;overflow:hidden}
.vc-face.red{color:#c4111f}
.vc-back{transform:rotateY(180deg);background:repeating-linear-gradient(45deg,#8c1020 0 4px,#6d0a18 4px 8px);border:calc(var(--w)*.06) solid #f7f2e8}
.vc-back::after{content:"V";position:absolute;inset:0;display:grid;place-items:center;font-family:"Bungee",Impact;color:rgba(232,196,106,.85);font-size:calc(var(--w)*.4)}
.vc-ix{position:absolute;display:grid;justify-items:center;line-height:.9;font-size:calc(var(--w)*.2)}.vc-ix b{font-weight:700;letter-spacing:-.05em}.vc-ix i{font-style:normal;font-size:.85em}
.vc-ix.tl{left:6%;top:5%}.vc-ix.br{right:6%;bottom:5%;transform:rotate(180deg)}
.vc-ace{position:absolute;inset:0;display:grid;place-items:center;font-size:calc(var(--w)*.55)}
.vc-court{position:absolute;inset:18% 20%;border:1px solid currentColor;border-radius:4px;display:grid;place-items:center;background:linear-gradient(160deg,rgba(232,196,106,.35),rgba(232,196,106,.08))}
.vc-court span{font-size:calc(var(--w)*.42);font-weight:700;line-height:1}.vc-court i{font-style:normal;font-size:calc(var(--w)*.22);position:absolute;bottom:6%}
.vc-pips{position:absolute;inset:16% 22%;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(5,1fr);font-size:calc(var(--w)*.17);place-items:center}
.vc-pips i{font-style:normal;line-height:1}
.p2 .q0{grid-area:1/2}.p2 .q1{grid-area:5/2;transform:rotate(180deg)}
.p3 .q0{grid-area:1/2}.p3 .q1{grid-area:3/2}.p3 .q2{grid-area:5/2;transform:rotate(180deg)}
.p4 .q0{grid-area:1/1}.p4 .q1{grid-area:1/3}.p4 .q2{grid-area:5/1;transform:rotate(180deg)}.p4 .q3{grid-area:5/3;transform:rotate(180deg)}
.p5 .q0{grid-area:1/1}.p5 .q1{grid-area:1/3}.p5 .q2{grid-area:3/2}.p5 .q3{grid-area:5/1;transform:rotate(180deg)}.p5 .q4{grid-area:5/3;transform:rotate(180deg)}
.p6 .q0{grid-area:1/1}.p6 .q1{grid-area:1/3}.p6 .q2{grid-area:3/1}.p6 .q3{grid-area:3/3}.p6 .q4{grid-area:5/1;transform:rotate(180deg)}.p6 .q5{grid-area:5/3;transform:rotate(180deg)}
.p7 .q0{grid-area:1/1}.p7 .q1{grid-area:1/3}.p7 .q2{grid-area:2/2}.p7 .q3{grid-area:3/1}.p7 .q4{grid-area:3/3}.p7 .q5{grid-area:5/1;transform:rotate(180deg)}.p7 .q6{grid-area:5/3;transform:rotate(180deg)}
.p8 .q0{grid-area:1/1}.p8 .q1{grid-area:1/3}.p8 .q2{grid-area:2/2}.p8 .q3{grid-area:3/1}.p8 .q4{grid-area:3/3}.p8 .q5{grid-area:4/2;transform:rotate(180deg)}.p8 .q6{grid-area:5/1;transform:rotate(180deg)}.p8 .q7{grid-area:5/3;transform:rotate(180deg)}
.p9 .q0{grid-area:1/1}.p9 .q1{grid-area:1/3}.p9 .q2{grid-area:2/1}.p9 .q3{grid-area:2/3}.p9 .q4{grid-area:3/2}.p9 .q5{grid-area:4/1;transform:rotate(180deg)}.p9 .q6{grid-area:4/3;transform:rotate(180deg)}.p9 .q7{grid-area:5/1;transform:rotate(180deg)}.p9 .q8{grid-area:5/3;transform:rotate(180deg)}
.p10 .q0{grid-area:1/1}.p10 .q1{grid-area:1/3}.p10 .q2{grid-area:2/1}.p10 .q3{grid-area:2/3}.p10 .q4{grid-area:2/2;transform:translateY(-40%)}.p10 .q5{grid-area:4/2;transform:translateY(40%) rotate(180deg)}.p10 .q6{grid-area:4/1;transform:rotate(180deg)}.p10 .q7{grid-area:4/3;transform:rotate(180deg)}.p10 .q8{grid-area:5/1;transform:rotate(180deg)}.p10 .q9{grid-area:5/3;transform:rotate(180deg)}
.vc-card.deal{animation:vcdeal .26s ease-out}
@keyframes vcdeal{from{transform:translate(30vw,-40vh) rotate(-25deg);opacity:0}to{transform:none;opacity:1}}
.vc-card.hl .vc-face{box-shadow:0 0 0 3px #ffe08a,0 0 18px #ffd04a}
.vc-card.dim{filter:brightness(.55)}
.vc-hand{display:flex;justify-content:center;gap:0;min-height:calc(clamp(52px,8.4vw,86px)*1.4)}
.vc-hand .vc-card+.vc-card{margin-left:calc(var(--w)*-.42)}
.vc-hand.spread{gap:8px}.vc-hand.spread .vc-card+.vc-card{margin-left:0}
/* chips */
.vc-chip{--s:44px;width:var(--s);height:var(--s);border-radius:50%;flex:none;position:relative;display:grid;place-items:center;
  background:radial-gradient(circle,var(--c) 0 52%,transparent 53%),repeating-conic-gradient(var(--c) 0 22.5deg,#fff 22.5deg 45deg);
  box-shadow:0 2px 0 rgba(0,0,0,.6),0 3px 6px rgba(0,0,0,.45),inset 0 0 0 calc(var(--s)*.06) rgba(0,0,0,.25)}
.vc-chip::before{content:"";position:absolute;inset:18%;border-radius:50%;border:1.5px dashed rgba(255,255,255,.75)}
.vc-chip span{position:relative;font:700 calc(var(--s)*.3)/1 "Chakra Petch",sans-serif;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.8)}
.vc-chip.light{background:radial-gradient(circle,var(--c) 0 52%,transparent 53%),repeating-conic-gradient(var(--c) 0 22.5deg,#2a6ad8 22.5deg 45deg)}
.vc-chip.light span{color:#222;text-shadow:none}.vc-chip.light::before{border-color:rgba(0,0,0,.4)}
.vc-rack{display:flex;gap:6px;padding:4px 8px;background:rgba(0,0,0,.4);border:1px solid var(--line);border-radius:30px}
.vc-rack-b{background:none;border:0;padding:2px;border-radius:50%;cursor:pointer;transition:transform .12s}
.vc-rack-b.sel{transform:translateY(-6px)}.vc-rack-b.sel .vc-chip{box-shadow:0 0 0 3px #fff,0 0 16px #ffe08a,0 6px 8px rgba(0,0,0,.5)}
.vc-stack{position:absolute;left:50%;bottom:50%;transform:translate(-50%,50%);width:34px;height:34px;pointer-events:none}
.vc-stack .vc-chip{position:absolute;left:0;bottom:calc(var(--i)*3px)}
.vc-stack b{position:absolute;left:50%;top:100%;transform:translate(-50%,6px);font:700 11px "Chakra Petch",sans-serif;background:rgba(0,0,0,.75);color:#ffe08a;padding:1px 6px;border-radius:8px;white-space:nowrap}
/* bet spots */
.vc-spot{position:relative;font:600 13px "Chakra Petch",sans-serif;color:var(--txt);background:rgba(255,255,255,.04);border:2px solid rgba(255,255,255,.55);border-radius:10px;cursor:pointer;
  display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:6px 4px;min-height:58px;min-width:58px;text-align:center;transition:background .15s}
.vc-spot:hover{background:rgba(255,255,255,.12)}.vc-spot.has{background:rgba(255,224,138,.1)}
.vc-spot-l{text-transform:uppercase;letter-spacing:.04em;text-shadow:0 1px 1px #000;line-height:1.1}.vc-spot small{font-size:11px;color:var(--dim)}
.vc-spot.win{animation:vcwin 1.5s}.vc-spot.lose{animation:vclose 1.2s}
@keyframes vcwin{0%,60%{background:rgba(125,255,154,.35);box-shadow:0 0 20px #7dff9a}100%{}}@keyframes vclose{0%,50%{background:rgba(255,80,80,.3)}100%{}}
/* dice */
.vc-die{--ds:54px;--dc:#c8102e;width:var(--ds);height:var(--ds);border-radius:18%;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);padding:calc(var(--ds)*.12);gap:calc(var(--ds)*.04);box-sizing:border-box;
  background:linear-gradient(145deg,color-mix(in srgb,var(--dc) 70%,#fff),var(--dc) 45%,color-mix(in srgb,var(--dc) 70%,#000));box-shadow:0 4px 10px rgba(0,0,0,.5),inset 0 0 6px rgba(255,255,255,.3)}
.vc-die i{border-radius:50%}.vc-die i.on{background:radial-gradient(circle at 40% 35%,#fff,#ddd 60%,#999)}
.vc-die.rolling{animation:vcroll .14s linear infinite}.vc-die.land{animation:vcland .3s}
@keyframes vcroll{0%{transform:rotate(0) translateY(0)}50%{transform:rotate(180deg) translateY(-6px)}100%{transform:rotate(360deg)}}
@keyframes vcland{0%{transform:scale(1.25)}100%{transform:scale(1)}}
/* banners */
.vc-banner{position:absolute;left:50%;top:42%;z-index:15;transform:translate(-50%,-50%);font-family:"Bungee",Impact;font-size:clamp(28px,7vw,72px);pointer-events:none;white-space:nowrap;
  color:#ffe08a;text-shadow:0 0 18px #ffb300,0 4px 0 #000;animation:vcban 1.9s ease-out forwards}
.vc-banner.lose{color:#ff8a80;text-shadow:0 0 18px #f00,0 4px 0 #000}.vc-banner.push{color:#fff;text-shadow:0 0 14px #88f,0 4px 0 #000}
@keyframes vcban{0%{opacity:0;transform:translate(-50%,-50%) scale(.6)}15%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}25%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-70%)}}
@media (max-width:560px){.vc-topbtns .vc-btn{padding:5px 7px}.vc-chip{--s:38px}.vc-ttl small{display:none}}
@media (prefers-reduced-motion:reduce){.vc-card.deal,.vc-banner,.vc-die.rolling{animation:none}}
`;
  document.head.appendChild(s);
}
