/* Recall: Gentle Games 3. Warm, familiar, picture-led games with no failure and generous stars:
   Pair the Socks, Tea Orders, Flower Arranging, Months & Seasons, Bird Spotter.
   Every level is generated fresh; difficulty rises gently and levels off at a sensible cap. */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor } = R;

  const mkBtn = (label, cls, fn) => { const b = el('button', 'btn ' + cls, label); b.type = 'button'; if (fn) b.onclick = fn; return b; };
  const finisher = api => { let d = false; return s => { if (d) return; d = true; api.done(Math.max(1, Math.min(3, s))); }; };
  const lvl = L => Math.max(1, Math.floor(+L || 1));
  const chime = k => tone(523 * Math.pow(2, Math.min(k, 12) * 2 / 12), .2, 'triangle', .12);
  const fanfare = () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .28, 'sine', .1, i * .09));
  const clear = api => { api.stage.innerHTML = ''; };
  let uid = 0;
  const nid = p => 'g3' + p + (++uid);

  R.css(`
.g3-wrap{max-width:760px;margin:0 auto;display:grid;gap:14px}
.g3-row{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:12px}
.g3-panel{background:var(--card);color:var(--ink);border-radius:24px;padding:14px;box-shadow:0 7px 0 var(--card-edge),0 14px 26px rgba(0,0,0,.28)}
.g3-label{font:600 1.15rem/1.2 var(--display);color:var(--on-table-soft);text-align:center;margin:0}
.g3-pop{animation:g3-bounce .5s cubic-bezier(.3,1.6,.5,1)}
.g3-glow{outline:6px solid var(--sun)!important;outline-offset:3px;animation:g3-glowk 1s infinite}
.g3-help{min-height:56px!important;font-size:1.05rem!important}
.g3-bigbtn{font-size:1.35rem!important;min-height:72px!important;padding:.6em 1.3em!important}
@keyframes g3-bounce{0%{transform:scale(.5)}60%{transform:scale(1.14)}100%{transform:scale(1)}}
@keyframes g3-glowk{0%,100%{outline-color:rgba(255,194,52,1)}50%{outline-color:rgba(255,255,255,.9)}}
@keyframes g3-float{0%,100%{translate:0 0}50%{translate:0 -6px}}
@keyframes g3-steam{0%{opacity:0;transform:translateY(8px)}40%{opacity:.8}100%{opacity:0;transform:translateY(-14px)}}
@keyframes g3-fallk{from{transform:translateY(-20px)}to{transform:translateY(150px)}}
@keyframes g3-swing{0%,100%{rotate:-4deg}50%{rotate:4deg}}

/* Pair the Socks */
.g3-line{position:relative;display:flex;flex-wrap:wrap;justify-content:center;gap:0;padding:6px 8px 4px;border-radius:20px;background:linear-gradient(180deg,#9ED8FF,#D9F1FF);box-shadow:0 6px 0 #6FA9CC,0 12px 20px rgba(0,0,0,.25)}
.g3-slot{position:relative;width:76px;height:70px;display:flex;justify-content:center;align-items:flex-start;gap:2px;padding-top:6px}
.g3-slot::before{content:"";position:absolute;left:0;right:0;top:8px;height:3px;background:#F6EBD3;box-shadow:0 1px 0 rgba(0,0,0,.25)}
.g3-slot .g3-sock{width:31px;height:auto;transform-origin:50% 0;animation:g3-swing 2.6s ease-in-out infinite}
.g3-slot .g3-sock + .g3-sock{animation-delay:-1.3s}
.g3-hang{position:relative;display:flex;gap:3px;animation:g3-bounce .5s cubic-bezier(.3,1.6,.5,1)}
.g3-hang > span{position:relative;display:block}
.g3-hang > span::after{content:"";position:absolute;left:50%;top:-5px;width:8px;height:16px;margin-left:-4px;border-radius:3px;background:linear-gradient(90deg,#D9A066,#B07A42);box-shadow:0 2px 2px rgba(0,0,0,.3)}
.g3-basket{display:grid;grid-template-columns:repeat(auto-fill,minmax(66px,1fr));gap:8px 10px;padding:16px 14px 18px;border-radius:26px;
  background:repeating-linear-gradient(90deg,rgba(0,0,0,.1) 0 3px,transparent 3px 14px),repeating-linear-gradient(0deg,#D7A866 0 9px,#C48F4C 9px 18px);
  box-shadow:inset 0 8px 0 rgba(255,255,255,.25),inset 0 -10px 0 rgba(0,0,0,.15),0 7px 0 #8A5A2B,0 14px 26px rgba(0,0,0,.3)}
.g3-skb{position:relative;border:0;background:rgba(255,255,255,.35);border-radius:16px;padding:4px;cursor:pointer;min-height:84px;display:grid;place-items:center;
  transform:rotate(var(--r,0deg));transition:transform .15s, opacity .3s;box-shadow:0 3px 0 rgba(0,0,0,.12)}
.g3-skb svg{width:100%;max-width:60px;height:auto;filter:drop-shadow(0 3px 2px rgba(0,0,0,.25))}
.g3-skb.g3-sel{transform:translateY(-8px) scale(1.06);background:#fff;outline:5px solid #fff;outline-offset:2px;box-shadow:0 8px 14px rgba(0,0,0,.3)}
.g3-skb.g3-gone{animation:pop .45s forwards;pointer-events:none}
.g3-skb.g3-hide{visibility:hidden}

/* Tea Orders */
.g3-guests{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.g3-gcard{background:var(--card);color:var(--ink);border-radius:22px;padding:10px 10px 12px;display:grid;justify-items:center;gap:4px;text-align:center;box-shadow:0 6px 0 var(--card-edge),0 12px 20px rgba(0,0,0,.25)}
.g3-face{font-size:3rem;line-height:1.1}
.g3-gname{font:700 1.3rem/1 var(--display)}
.g3-bubble{position:relative;background:#fff;border:3px solid #E6D9C0;border-radius:18px;padding:6px 10px;font:600 1.05rem/1.25 var(--display);color:var(--ink)}
.g3-bubble::before{content:"";position:absolute;left:50%;top:-11px;margin-left:-9px;border:9px solid transparent;border-top:0;border-bottom-color:#E6D9C0}
.g3-icons{display:flex;justify-content:center;align-items:center;gap:4px;font-size:1.5rem;min-height:30px;flex-wrap:wrap}
.g3-lump{display:inline-block;width:18px;height:18px;border-radius:4px;background:linear-gradient(135deg,#fff,#E8E4DA);box-shadow:inset 0 -3px 0 rgba(0,0,0,.12),0 2px 0 #BDB4A2;vertical-align:middle}
.g3-strip{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}
.g3-chip{width:52px;height:52px;font-size:1.7rem;border-radius:16px}
.g3-chip.g3-now{outline:4px solid #fff;outline-offset:2px}
.g3-chip.g3-ok{--c:var(--good-bg);--d:var(--leaf-d);font:700 1.6rem var(--display);color:var(--leaf-d)}
.g3-serve{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:12px}
.g3-serve .g3-gcard{min-width:140px;max-width:220px}
.g3-cup{border:0;padding:0;background:none;cursor:pointer;width:min(100%,250px);border-radius:24px}
.g3-cup svg{display:block;width:100%;height:auto;filter:drop-shadow(0 8px 10px rgba(0,0,0,.3))}
.g3-steam{animation:g3-steam 2.2s ease-in-out infinite}
.g3-adds{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px}
.g3-adds .btn{min-height:60px;font-size:1.1rem;padding:.5em .6em}
.g3-adds .btn.g3-on{--c:var(--good-bg);--d:var(--leaf-d)}
.g3-adds .btn.g3-off{opacity:.55}
.g3-acts{display:flex;flex-wrap:wrap;justify-content:center;gap:12px}
.g3-acts .btn{flex:1 1 140px;font-size:1.2rem;min-height:64px}

/* Flower Arranging */
.g3-vases{display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-end;gap:10px 18px}
.g3-vcol{display:grid;gap:4px;justify-items:center}
.g3-vbox{position:relative;width:100%;aspect-ratio:200/150;border-radius:22px;background:linear-gradient(180deg,#FFF9EF,#F4E8D2);box-shadow:0 6px 0 var(--card-edge),0 12px 22px rgba(0,0,0,.28)}
.g3-vbox > svg{position:absolute;inset:0;width:100%;height:100%}
.g3-ex{width:min(60vw,220px)}
.g3-vtag{position:absolute;left:8px;bottom:8px;font:600 1rem/1 var(--display);color:var(--ink-soft);background:rgba(255,255,255,.8);padding:5px 9px;border-radius:999px;pointer-events:none;z-index:1}
.g3-mine{width:min(88vw,310px)}
.g3-spot{position:absolute;width:24%;aspect-ratio:1;transform:translate(-50%,-50%);border:0;padding:0;background:none;border-radius:50%;cursor:pointer;display:grid;place-items:center}
.g3-spot svg{width:100%;height:100%;overflow:visible}
.g3-mine .g3-spot.g3-empty{background:rgba(255,255,255,.75);box-shadow:inset 0 0 0 4px rgba(60,196,107,.75)}
.g3-mine .g3-spot.g3-empty::after{content:"+";font:700 1.6rem var(--display);color:var(--leaf-d)}
.g3-spot.g3-placed svg{animation:g3-bounce .5s cubic-bezier(.3,1.6,.5,1)}
.g3-ex .g3-spot{cursor:default;pointer-events:none}
.g3-spot.g3-look{outline:5px solid var(--sun);outline-offset:2px;animation:g3-glowk 1s infinite}
.g3-bucket{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;padding:14px 10px;border-radius:22px 22px 30px 30px;
  background:linear-gradient(90deg,#9AA7B1,#DCE3E8 30%,#B7C2CA 60%,#8C99A3);box-shadow:inset 0 6px 0 rgba(255,255,255,.4),0 6px 0 #6B7780,0 12px 22px rgba(0,0,0,.3)}
.g3-fb{display:flex;flex-direction:column;align-items:center;justify-content:center;width:94px;min-height:96px;padding:6px 4px;border-radius:18px;cursor:pointer;font:600 1rem/1.05 var(--display);text-align:center;transition:transform .15s}
.g3-fb svg{width:52px;height:52px;overflow:visible}
.g3-vhelp{position:absolute;right:8px;bottom:8px;min-height:56px;padding:.4em .8em;font-size:1.05rem;z-index:2}
.g3-fb.g3-sel{transform:translateY(-8px);outline:5px solid #fff;outline-offset:3px}

/* Months & Seasons */
.g3-q{background:var(--card);color:var(--ink);border-radius:24px;padding:16px;text-align:center;font:600 clamp(1.4rem,5vw,1.8rem)/1.25 var(--display);box-shadow:0 7px 0 var(--card-edge),0 14px 26px rgba(0,0,0,.28);text-wrap:balance}
.g3-q svg{display:block;width:100%;max-width:420px;height:auto;margin:0 auto;border-radius:16px}
.g3-q small{display:block;font:600 1.1rem/1.3 var(--display);color:var(--ink-soft);margin-top:6px}
.g3-big{font-size:3.4rem;line-height:1.1}
.g3-ch{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px}
.g3-ch .btn{min-height:68px;font-size:clamp(1.2rem,4.5vw,1.5rem)}
.g3-ch .btn.g3-right{--c:var(--leaf);--d:var(--leaf-d)}
.g3-ch .btn.g3-nope{opacity:.35;pointer-events:none}
.g3-seq{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;min-height:56px;padding:8px;border-radius:18px;background:rgba(0,0,0,.18);box-shadow:inset 0 4px 10px rgba(0,0,0,.2)}
.g3-seq span{display:grid;place-items:center;min-width:56px;height:44px;padding:0 10px;border-radius:12px;font:600 1.05rem var(--display)}
.g3-seq .g3-blank{background:rgba(255,255,255,.12);box-shadow:inset 0 0 0 3px rgba(255,255,255,.3);color:var(--on-table-soft)}
.g3-months{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
.g3-months .btn{min-height:62px;font-size:1.2rem;padding:.4em .3em}
.g3-months .btn.g3-gone{animation:pop .4s forwards;pointer-events:none}
.g3-match{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px;align-items:start}
.g3-match .g3-col{display:grid;gap:10px}
.g3-match .btn{min-height:64px;font-size:1.1rem;padding:.4em .5em;text-align:center}
.g3-match .btn.g3-sel{transform:translateY(-5px);outline:5px solid #fff;outline-offset:2px}
.g3-match .btn.g3-done{--c:var(--good-bg);--d:var(--leaf-d);pointer-events:none}
.g3-flake{animation:g3-fallk linear infinite}

/* Bird Spotter */
.g3-scene{border-radius:24px;overflow:hidden;box-shadow:0 7px 0 rgba(0,0,0,.25),0 14px 26px rgba(0,0,0,.3);max-width:440px;width:100%;margin:0 auto}
.g3-scene svg{display:block;width:100%;height:auto}
.g3-fact{background:var(--card);color:var(--ink);border-radius:22px;padding:12px 16px;display:grid;gap:10px;justify-items:center;text-align:center;box-shadow:0 7px 0 var(--card-edge),0 14px 26px rgba(0,0,0,.28);animation:g3-bounce .45s}
.g3-fact h3{font-size:clamp(1.5rem,5.5vw,1.9rem);color:var(--leaf-d)}
.g3-fact p{margin:0;font:400 clamp(1.15rem,4vw,1.3rem)/1.4 var(--body)}
.g3-fact .btn{min-width:200px;font-size:1.25rem}
`);

  /* =========================================================
     1. PAIR THE SOCKS
     ========================================================= */
  const SK_BASE = [['red', '#EF4B4B'], ['blue', '#3B8BEB'], ['yellow', '#FFC93C'], ['green', '#38B865'], ['pink', '#F784B4'], ['purple', '#9B78EE'], ['orange', '#FF9338'], ['teal', '#22B8A8'], ['grey', '#9AA4AE'], ['navy', '#2C4A8A']];
  const SK_ACC = [['white', '#FFFFFF'], ['black', '#1E2A33'], ['yellow', '#FFD447'], ['red', '#E8383D'], ['blue', '#2F7EE0'], ['green', '#2FAE5C']];
  const SK_PAT = { plain: 'no pattern', stripes: 'stripes', spots: 'spots', argyle: 'diamonds', zigzag: 'zigzags', checks: 'checks', hearts: 'hearts', stars: 'stars' };
  const PATS = Object.keys(SK_PAT);
  const SOCK = 'M14 4H46V50Q46 57 53 61Q63 67 61 77Q58 88 45 87L23 84Q10 81 11 68Z';
  const accOk = (b, a) => SK_BASE[b][0] !== SK_ACC[a][0] && !(b === 9 && a === 1) && !(b === 2 && a === 0);
  const skKey = d => `${d.b}|${d.p}|${d.a}|${d.h ? 1 : 0}`;
  const skNorm = d => { if (d.p === 'plain' && !d.h) d.a = 0; return d; };

  function sockSVG(d, cls) {
    const id = nid('sk'), base = SK_BASE[d.b][1], acc = SK_ACC[d.a][1];
    let p = '';
    if (d.p === 'stripes') for (let y = 18; y < 92; y += 13) p += `<rect x="0" y="${y}" width="70" height="6" fill="${acc}"/>`;
    if (d.p === 'spots') for (let r = 0, y = 20; y < 92; y += 12, r++) for (let x = r % 2 ? 8 : 14; x < 70; x += 12) p += `<circle cx="${x}" cy="${y}" r="3.6" fill="${acc}"/>`;
    if (d.p === 'argyle') for (let r = 0, y = 26; y < 100; y += 20, r++) for (let x = r % 2 ? 6 : 18; x < 76; x += 24) p += `<path d="M${x} ${y - 10}L${x + 8} ${y}L${x} ${y + 10}L${x - 8} ${y}Z" fill="${acc}"/>`;
    if (d.p === 'zigzag') for (let y = 22; y < 94; y += 15) { let s = `M-4 ${y}`; for (let x = 0; x < 76; x += 8) s += `L${x + 4} ${y + ((x / 8) % 2 ? -5 : 5)}`; p += `<path d="${s}" fill="none" stroke="${acc}" stroke-width="3.5" stroke-linejoin="round"/>`; }
    if (d.p === 'checks') for (let r = 0, y = 16; y < 92; y += 8, r++) for (let x = (r % 2) * 8; x < 72; x += 16) p += `<rect x="${x}" y="${y}" width="8" height="8" fill="${acc}" opacity=".75"/>`;
    if (d.p === 'hearts') for (let r = 0, y = 26; y < 92; y += 16, r++) for (let x = r % 2 ? 10 : 22; x < 72; x += 24) p += `<path transform="translate(${x} ${y}) scale(1.2)" d="M0 5C-7 0-6-6-2-6C0-6 0-4 0-3C0-4 0-6 2-6C6-6 7 0 0 5Z" fill="${acc}"/>`;
    if (d.p === 'stars') for (let r = 0, y = 26; y < 92; y += 16, r++) for (let x = r % 2 ? 10 : 22; x < 72; x += 24) p += `<path transform="translate(${x} ${y})" d="M0-6.5L1.9-2.1 6.5-2 2.9 1 4 5.6 0 3.1-4 5.6-2.9 1-6.5-2-1.9-2.1Z" fill="${acc}"/>`;
    let cuff = '';
    if (d.h) cuff = `<rect x="0" y="0" width="70" height="16" fill="${acc}"/><ellipse cx="17" cy="79" rx="12" ry="11" fill="${acc}"/><ellipse cx="57" cy="76" rx="10" ry="13" fill="${acc}"/>`;
    else cuff = `<rect x="0" y="0" width="70" height="16" fill="rgba(0,0,0,.16)"/>`;
    cuff += [20, 26, 32, 38].map(x => `<line x1="${x}" y1="5" x2="${x}" y2="15" stroke="rgba(0,0,0,.18)" stroke-width="2"/>`).join('');
    return `<svg class="g3-sock ${cls || ''}" viewBox="0 0 66 92" aria-hidden="true"><defs><clipPath id="${id}"><path d="${SOCK}"/></clipPath></defs>
      <g clip-path="url(#${id})"><rect width="70" height="96" fill="${base}"/>${p}${cuff}<rect x="16" y="18" width="5" height="44" rx="2.5" fill="rgba(255,255,255,.28)"/></g>
      <path d="${SOCK}" fill="none" stroke="rgba(24,36,44,.6)" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
  }

  function randSock() {
    const b = randInt(SK_BASE.length); let a; do a = randInt(SK_ACC.length); while (!accOk(b, a));
    return skNorm({ b, p: pick(PATS), a, h: Math.random() < .35 });
  }
  function makeSocks(n, sim) {
    const out = [], keys = new Set(); let guard = 0;
    while (out.length < n && guard++ < 20000) {
      let d;
      if (sim >= 3 && out.length && Math.random() < .65) {
        d = Object.assign({}, pick(out)); const m = randInt(3);
        if (m === 0) { do d.a = randInt(SK_ACC.length); while (!accOk(d.b, d.a)); if (d.p === 'plain') d.h = true; }
        else if (m === 1) d.h = !d.h;
        else d.p = pick(PATS.filter(x => x !== d.p && x !== 'plain'));
        skNorm(d);
      } else d = randSock();
      if (keys.has(skKey(d))) continue;
      if (sim === 0 && out.some(o => o.b === d.b || o.p === d.p)) continue;
      if (sim === 1 && out.some(o => o.b === d.b)) continue;
      if (sim === 2 && out.filter(o => o.b === d.b).length >= 2) continue;
      // two socks that differ only by a coloured accent are too hard to tell apart: keep accent-only differences light/dark
      if (out.some(o => o.b === d.b && o.p === d.p && o.h === d.h && o.a >= 2 && d.a >= 2)) continue;
      keys.add(skKey(d)); out.push(d);
    }
    return out;
  }
  function sockDiff(x, y) {
    const C = d => SK_BASE[d.b][0];
    const w = (p, who) => p === 'plain' ? `${who} is plain` : `${who} has ${SK_PAT[p]}`;
    if (x.b !== y.b) return `Not a pair: one sock is ${C(x)} and the other is ${C(y)}.`;
    if (x.p !== y.p) return `Close! Both ${C(x)}, but ${w(x.p, 'one')} and ${w(y.p, 'the other')}.`;
    if (x.h !== y.h) return 'So close! Look at the toes and heels. Only one has coloured ones.';
    return `So close! Look at the colour of the ${x.p === 'plain' ? 'toes and heels' : SK_PAT[x.p]}.`;
  }

  function startSocks(L, api) {
    L = lvl(L);
    const done = finisher(api);
    const nPairs = Math.min(3 + Math.floor((L - 1) / 2), 8);
    const sim = L <= 2 ? 0 : L <= 4 ? 1 : L <= 8 ? 2 : 3;
    const designs = makeSocks(nPairs, sim);
    const N = designs.length;
    const socks = shuffle(designs.flatMap((d, i) => [{ d, i }, { d, i }]));
    let sel = null, busy = false, paired = 0, mistakes = 0, combo = 0;

    const wrap = el('div', 'g3-wrap');
    const line = el('div', 'g3-line');
    const slots = [...Array(N)].map(() => { const s = el('div', 'g3-slot'); line.append(s); return s; });
    const basket = el('div', 'g3-basket');
    const help = mkBtn('💡 Help me find a pair', 'c-sky g3-help', () => {
      if (busy) return;
      const left = socks.filter(s => !s.gone);
      const target = sel ? sel.i : pick(left).i;
      mistakes++; sfx.tap();
      left.filter(s => s.i === target).forEach(s => { s.b.classList.add('g3-glow'); api.later(() => s.b.classList.remove('g3-glow'), 2600); });
      api.hint(sel ? 'The glowing sock is the partner. Tap it!' : 'These two glowing socks make a pair. Tap them both.');
    });
    const row = el('div', 'g3-row'); row.append(help);
    wrap.append(line, basket, row);
    api.stage.append(wrap);
    api.rounds(N, 0);
    api.hint('Tap two socks that match to peg them on the line.');

    socks.forEach(s => {
      const b = el('button', 'g3-skb', sockSVG(s.d));
      b.type = 'button'; b.style.setProperty('--r', (randInt(25) - 12) + 'deg');
      b.setAttribute('aria-label', `${SK_BASE[s.d.b][0]} sock with ${SK_PAT[s.d.p]}`);
      s.b = b; b.onclick = () => tap(s);
      basket.append(b);
    });

    function tap(s) {
      if (busy || s.gone) return;
      if (!sel) { sel = s; s.b.classList.add('g3-sel'); sfx.tap(); api.hint('Now find the sock that matches this one.'); return; }
      if (sel === s) { s.b.classList.remove('g3-sel'); sel = null; api.hint('Tap two socks that match to peg them on the line.'); return; }
      const a = sel; sel = null; s.b.classList.add('g3-sel');
      if (a.i === s.i) {
        busy = true; combo++; chime(combo + 2); sfx.good();
        [a, s].forEach(x => { x.gone = true; x.b.classList.remove('g3-sel', 'g3-glow'); x.b.classList.add('g3-gone'); });
        const slot = slots[paired]; paired++;
        api.later(() => {
          [a, s].forEach(x => x.b.classList.add('g3-hide'));
          const hang = el('div', 'g3-hang', `<span>${sockSVG(a.d)}</span><span>${sockSVG(a.d)}</span>`);
          slot.append(hang); api.rounds(N, paired);
          busy = false;
          if (paired === N) { fanfare(); api.hint('All the socks are pegged out to dry. Lovely job!'); api.later(() => done(starsFor(mistakes, 1, 4)), 900); }
          else { api.hint(combo >= 3 ? `${combo} pairs in a row! Keep going.` : 'Pegged out! Find another matching pair.'); if (combo >= 2) toast(cheer()); }
        }, 420);
      } else {
        busy = true; mistakes++; combo = 0; sfx.soft(); wob(a.b); wob(s.b);
        api.hint(sockDiff(a.d, s.d));
        api.later(() => { a.b.classList.remove('g3-sel'); s.b.classList.remove('g3-sel'); busy = false; }, 900);
      }
    }
  }

  /* =========================================================
     2. TEA ORDERS
     ========================================================= */
  const TEA_GUESTS = [['👵', 'Edna'], ['👴', 'Albert'], ['👩‍🦳', 'Mary'], ['👨‍🦳', 'George'], ['🧓', 'Stan'], ['👩', 'Peggy'], ['🧔', 'Frank'], ['👱‍♀️', 'Doris'], ['👨', 'Harold'], ['👩‍🦰', 'Joan'], ['👱‍♂️', 'Walter'], ['👩‍🦱', 'Betty']];
  const NUMW = ['no', 'one', 'two', 'three'];
  const lumps = n => [...Array(n)].map(() => '<span class="g3-lump"></span>').join('');

  function cupSVG(s) {
    const inside = '#F4EEE4', tea = !s.poured ? inside : s.milk ? '#C99363' : '#7A3E16';
    let extra = '';
    if (s.poured) extra += [80, 100, 120].map((x, i) => `<path class="g3-steam" style="animation-delay:${i * .6}s" d="M${x} 46q-7-9 0-17t0-17" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/>`).join('');
    if (s.lemon) extra += `<g transform="translate(112 64)"><ellipse rx="16" ry="6.5" fill="#FFE14D" stroke="#E6A800" stroke-width="2.5"/><path d="M-12 0H12M-7-4L7 4M7-4L-7 4" stroke="#F7C600" stroke-width="1.5"/></g>`;
    let saucerBits = '';
    for (let i = 0; i < s.sugar; i++) saucerBits += `<g transform="translate(${70 + i * 22} 128)"><rect x="-8" y="-8" width="16" height="15" rx="3" fill="#fff" stroke="#BDB4A2" stroke-width="2"/><path d="M-8-3H8" stroke="#E2DCCD" stroke-width="2"/></g>`;
    if (s.biscuit) saucerBits += `<g transform="translate(168 118)"><circle r="18" fill="#E2A65A" stroke="#B87A34" stroke-width="3"/><circle r="13" fill="none" stroke="#C98D44" stroke-width="2" stroke-dasharray="3 4"/>${[[-5, -4], [4, -5], [0, 3], [-6, 6], [6, 5]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="#9A6428"/>`).join('')}</g>`;
    return `<svg viewBox="0 0 200 150" aria-hidden="true">
      <ellipse cx="100" cy="130" rx="88" ry="17" fill="#FFFFFF" stroke="#D8CBB5" stroke-width="3"/><ellipse cx="100" cy="127" rx="54" ry="9" fill="#EFE6D6"/>
      <path d="M152 76Q184 72 180 96Q176 116 146 110" fill="none" stroke="#D8CBB5" stroke-width="13" stroke-linecap="round"/>
      <path d="M152 76Q184 72 180 96Q176 116 146 110" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"/>
      <path d="M44 62H156Q154 114 120 126H80Q46 114 44 62Z" fill="#FFFFFF" stroke="#D8CBB5" stroke-width="3"/>
      <path d="M47 80H153" stroke="#45AEFF" stroke-width="6"/><path d="M50 90H150" stroke="#F25A95" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round"/>
      <path d="M58 70Q60 100 80 116" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="100" cy="62" rx="56" ry="13" fill="#F9F4EC" stroke="#D8CBB5" stroke-width="3"/>
      <ellipse cx="100" cy="64" rx="49" ry="9" fill="${tea}"/>${s.poured && s.milk ? '<ellipse cx="88" cy="63" rx="14" ry="3" fill="rgba(255,255,255,.35)"/>' : ''}
      ${extra}${saucerBits}</svg>`;
  }

  function startTea(L, api) {
    L = lvl(L);
    const done = finisher(api);
    const nG = L <= 1 ? 1 : L <= 3 ? 2 : L <= 8 ? 3 : 4;
    const F = { sugarMax: L <= 1 ? 1 : L <= 5 ? 2 : 3, biscuit: L >= 3, lemon: L >= 4 };
    const guests = shuffle(TEA_GUESTS.slice()).slice(0, nG).map(([face, name]) => ({ face, name }));
    const used = new Set();
    guests.forEach(g => {
      let o, k, t = 0;
      do {
        const lemon = F.lemon && Math.random() < .3;
        o = { lemon, milk: !lemon && Math.random() < .62, sugar: randInt(F.sugarMax + 1), biscuit: F.biscuit && Math.random() < .5 };
        k = JSON.stringify(o);
      } while (used.has(k) && t++ < 60);
      used.add(k); g.o = o;
    });
    const words = o => {
      const a = [o.lemon ? 'a slice of lemon' : o.milk ? 'milk' : 'no milk', o.sugar === 0 ? 'no sugar' : NUMW[o.sugar] + (o.sugar === 1 ? ' sugar' : ' sugars')];
      if (F.biscuit) a.push(o.biscuit ? 'a biscuit' : 'no biscuit');
      const s = a.length === 2 ? `${a[0]} and ${a[1]}` : `${a[0]}, ${a[1]} and ${a[2]}`;
      return s[0].toUpperCase() + s.slice(1) + ', please.';
    };
    const icons = o => {
      const bits = (o.milk ? '🥛' : '') + (o.lemon ? '🍋' : '') + lumps(o.sugar) + (o.biscuit ? '🍪' : '');
      return bits || '☕';
    };
    let mistakes = 0, gi = 0;

    function intro() {
      clear(api); api.rounds(nG, 0);
      api.hint(nG === 1 ? 'Your guest is here. Remember how they take their tea.' : `Your ${nG} guests are here. Remember how each one takes their tea.`);
      const wrap = el('div', 'g3-wrap'), grid = el('div', 'g3-guests');
      guests.forEach((g, i) => {
        const c = el('div', 'g3-gcard g3-pop', `<div class="g3-face">${g.face}</div><div class="g3-gname">${g.name}</div><div class="g3-bubble">“${words(g.o)}”<div class="g3-icons">${icons(g.o)}</div></div>`);
        c.style.animationDelay = (i * .15) + 's'; grid.append(c);
      });
      const row = el('div', 'g3-row');
      row.append(mkBtn('☕ I’m ready to serve', 'c-leaf g3-bigbtn', () => { sfx.tap(); serve(); }));
      wrap.append(grid, row); api.stage.append(wrap);
      guests.forEach((g, i) => api.later(() => tone(660 + i * 90, .12, 'sine', .08), i * 150));
    }

    function serve() {
      clear(api); api.rounds(nG, gi);
      const g = guests[gi], s = { poured: false, milk: false, lemon: false, sugar: 0, biscuit: false };
      let tries = 0, reminded = false, busy = false;
      const wrap = el('div', 'g3-wrap');
      const strip = el('div', 'g3-strip');
      if (nG > 1) guests.forEach((x, i) => strip.append(el('span', 'tile g3-chip ' + (i < gi ? 'g3-ok' : 'c-card') + (i === gi ? ' g3-now' : ''), i < gi ? '✓' : x.face)));
      const sv = el('div', 'g3-serve');
      const card = el('div', 'g3-gcard', `<div class="g3-face">${g.face}</div><div class="g3-gname">${g.name}</div>`);
      const bub = el('div', 'g3-bubble'); bub.hidden = true; card.append(bub);
      const cup = el('button', 'g3-cup g3-glow', cupSVG(s)); cup.type = 'button'; cup.setAttribute('aria-label', 'Cup of tea');
      sv.append(card, cup);
      const adds = el('div', 'g3-adds');
      const btn = {};
      const add = (k, label, fn) => { btn[k] = mkBtn(label, 'c-card g3-off', () => { if (busy) return; if (!s.poured) { sfx.soft(); wob(cup); api.hint('Pour the tea first. Tap the cup.'); return; } fn(); draw(); }); adds.append(btn[k]); };
      add('milk', '🥛 Milk', () => { s.milk = !s.milk; if (s.milk) s.lemon = false; sfx.tap(); });
      add('sug', '<span class="g3-lump"></span> Add sugar', () => { if (s.sugar >= 3) { api.hint('That’s plenty of sugar! Three lumps is the most.'); sfx.soft(); return; } s.sugar++; tone(900 + s.sugar * 120, .08, 'square', .05); });
      add('take', '↩ Take a lump out', () => { if (s.sugar) s.sugar--; sfx.tap(); });
      if (F.lemon) add('lemon', '🍋 Lemon', () => { s.lemon = !s.lemon; if (s.lemon) s.milk = false; sfx.tap(); });
      if (F.biscuit) add('bisc', '🍪 Biscuit', () => { s.biscuit = !s.biscuit; sfx.tap(); });
      const acts = el('div', 'g3-acts');
      const remind = mkBtn('💬 Remind me', 'c-sky', () => {
        if (busy) return;
        if (!reminded) { reminded = true; mistakes++; }
        bub.innerHTML = `“${words(g.o)}”<div class="g3-icons">${icons(g.o)}</div>`; bub.hidden = false; bub.classList.remove('g3-pop'); void bub.offsetWidth; bub.classList.add('g3-pop');
        sfx.tap(); api.hint(`${g.name} says: “${words(g.o)}”`);
      });
      const serveB = mkBtn('✓ Serve the tea', 'c-leaf', check);
      acts.append(remind, serveB);
      wrap.append(strip, sv, adds, acts); api.stage.append(wrap);
      if (nG === 1) strip.remove();
      api.hint(`Here comes ${g.name}. Tap the cup to pour the tea.`);

      cup.onclick = () => {
        if (busy) return;
        if (!s.poured) { s.poured = true; cup.classList.remove('g3-glow'); [0, 1, 2, 3].forEach(i => tone(300 + i * 40, .15, 'sine', .05, i * .08)); draw(); api.hint(`Now make it just how ${g.name} likes it, then tap Serve.`); }
        else { sfx.tap(); wob(cup); }
      };
      function draw() {
        cup.innerHTML = cupSVG(s);
        Object.values(btn).forEach(b => b.classList.toggle('g3-off', !s.poured));
        btn.milk.classList.toggle('g3-on', s.milk);
        if (btn.lemon) btn.lemon.classList.toggle('g3-on', s.lemon);
        if (btn.bisc) btn.bisc.classList.toggle('g3-on', s.biscuit);
        btn.sug.innerHTML = `<span class="g3-lump"></span> Add sugar${s.sugar ? ` (${s.sugar})` : ''}`;
      }
      function check() {
        if (busy) return;
        if (!s.poured) { sfx.soft(); wob(cup); api.hint('Tap the cup to pour the tea first.'); return; }
        const o = g.o;
        const wrong = ['milk', 'lemon', 'sugar', 'biscuit'].find(k => (k === 'sugar' ? s.sugar !== o.sugar : !!s[k] !== !!o[k]));
        if (!wrong) {
          busy = true; gi++; sfx.good(); chime(gi + 3);
          bub.textContent = pick(['Lovely, thank you!', 'Just how I like it!', 'Perfect cuppa!', 'Ooh, wonderful!']); bub.hidden = false; bub.classList.add('g3-pop');
          card.classList.add('g3-pop'); toast(cheer());
          api.rounds(nG, gi);
          api.hint(`${g.name} is delighted with that cup of tea.`);
          api.later(() => { if (gi >= nG) { fanfare(); done(starsFor(mistakes, 1, 3)); } else serve(); }, 1700);
          return;
        }
        mistakes++; tries++; sfx.soft(); wob(cup);
        if (tries === 1) api.hint(`Nearly! Have another think about the ${wrong}.`);
        else {
          const n = g.name;
          const t = { milk: o.milk ? `${n} takes milk.` : `${n} doesn’t take milk.`, lemon: o.lemon ? `${n} likes a slice of lemon.` : `${n} doesn’t want lemon.`,
            sugar: o.sugar ? `${n} takes ${NUMW[o.sugar]} sugar${o.sugar > 1 ? 's' : ''}.` : `${n} doesn’t take sugar.`, biscuit: o.biscuit ? `${n} would love a biscuit.` : `${n} doesn’t want a biscuit today.` };
          api.hint(t[wrong] + ' Fix it, then tap Serve.');
        }
      }
      draw();
    }
    intro();
  }

  /* =========================================================
     3. FLOWER ARRANGING
     ========================================================= */
  const FL = {
    daisy: { s: 'daisy', p: '#FFFFFF', c: '#FFC234', n: 'white daisy' },
    pinkdaisy: { s: 'daisy', p: '#F98BB5', c: '#FFC234', n: 'pink daisy' },
    gerbera: { s: 'daisy', p: '#FF8A3C', c: '#5A361C', n: 'orange gerbera' },
    sunflower: { s: 'sun', p: '#FFC234', c: '#6B3F1D', n: 'sunflower' },
    tulipR: { s: 'tulip', p: '#EF4040', n: 'red tulip' },
    tulipP: { s: 'tulip', p: '#F78FB8', n: 'pink tulip' },
    tulipY: { s: 'tulip', p: '#FFD23F', n: 'yellow tulip' },
    roseR: { s: 'rose', p: '#D92B45', n: 'red rose' },
    roseP: { s: 'rose', p: '#FF9EC4', n: 'pink rose' },
    roseY: { s: 'rose', p: '#FFD84D', n: 'yellow rose' },
    poppy: { s: 'poppy', p: '#F2442E', c: '#1E2A33', n: 'poppy' },
    daff: { s: 'daff', p: '#FFE14D', c: '#FF9A3C', n: 'daffodil' },
    lav: { s: 'spike', p: '#9C7BF2', n: 'lavender' },
    corn: { s: 'frill', p: '#3D7FF0', c: '#24418C', n: 'cornflower' }
  };
  const FL_FAM = [['tulipR', 'tulipP', 'tulipY'], ['roseR', 'roseP', 'roseY'], ['daisy', 'pinkdaisy', 'gerbera', 'sunflower'], ['poppy', 'roseR', 'tulipR'], ['daff', 'tulipY', 'roseY', 'sunflower'], ['lav', 'corn', 'tulipP', 'roseP']];
  const ONE_PER_SHAPE = ['daisy', 'sunflower', 'tulipR', 'roseP', 'poppy', 'daff', 'lav', 'corn'];
  const LAYOUT = {
    3: [[54, 40], [100, 28], [146, 40]],
    4: [[30, 44], [77, 28], [123, 28], [170, 44]],
    5: [[54, 26], [100, 24], [146, 26], [77, 70], [123, 70]],
    6: [[30, 30], [77, 24], [123, 24], [170, 30], [54, 72], [146, 72]],
    7: [[30, 30], [77, 24], [123, 24], [170, 30], [52, 72], [100, 78], [148, 72]]
  };
  const SK = 'stroke="rgba(24,36,44,.3)" stroke-width="1.5"';
  function flowerHead(k) {
    const f = FL[k];
    if (f.s === 'daisy') return [...Array(12)].map((_, i) => `<ellipse transform="rotate(${i * 30}) translate(0 -12)" rx="5.5" ry="10.5" fill="${f.p}" ${SK}/>`).join('') + `<circle r="8" fill="${f.c}" ${SK}/>`;
    if (f.s === 'sun') return [...Array(14)].map((_, i) => `<path transform="rotate(${i * 360 / 14})" d="M0-24L5.5-10H-5.5Z" fill="${f.p}" ${SK}/>`).join('') + `<circle r="12" fill="${f.c}"/>` + [[-4, -4], [4, -3], [0, 4], [-5, 4], [5, 5], [0, -7]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#3A2410"/>`).join('');
    if (f.s === 'tulip') return `<path d="M-15-7Q-17 15 0 17Q17 15 15-7L9 2L5-14L0-3L-5-14L-9 2Z" fill="${f.p}" ${SK}/><path d="M0-3Q-2 8 0 15" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="2"/>`;
    if (f.s === 'rose') return `<circle r="17" fill="${f.p}" ${SK}/><path d="M0 0m-3 0a3 3 0 1 1 6 0a6 6 0 1 1-12 0a9 9 0 1 1 18 0a12 12 0 1 1-24 0" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="2.4"/>`;
    if (f.s === 'poppy') return [[-8, -8], [8, -8], [8, 8], [-8, 8]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="11" fill="${f.p}" ${SK}/>`).join('') + `<circle r="6.5" fill="${f.c}"/>` + [0, 60, 120, 180, 240, 300].map(a => `<circle transform="rotate(${a}) translate(0 -9)" r="1.6" fill="${f.c}"/>`).join('');
    if (f.s === 'daff') return [...Array(6)].map((_, i) => `<ellipse transform="rotate(${i * 60}) translate(0 -12)" rx="7" ry="12" fill="${f.p}" ${SK}/>`).join('') + `<circle r="9" fill="${f.c}" ${SK}/><circle r="5" fill="#E07A1C"/>`;
    if (f.s === 'spike') return `<path d="M0 22V-22" stroke="#3E9A4B" stroke-width="3"/>` + [...Array(9)].map((_, i) => `<ellipse cx="${i % 2 ? 4 : -4}" cy="${18 - i * 5}" rx="${5 - i * .3}" ry="4" fill="${f.p}" ${SK}/>`).join('');
    if (f.s === 'frill') return [...Array(10)].map((_, i) => `<path transform="rotate(${i * 36})" d="M-4-6L-6-20L-2-16L0-22L2-16L6-20L4-6Z" fill="${f.p}" ${SK}/>`).join('') + `<circle r="6" fill="${f.c}"/>`;
    return '';
  }
  const headSVG = k => `<svg viewBox="-25 -25 50 50" aria-hidden="true">${flowerHead(k)}</svg>`;
  function vaseSVG(spots, filled, vcol) {
    let stems = '';
    spots.forEach(([x, y], i) => {
      if (!filled[i]) return;
      const sx = 100 + (x - 100) * .16, mx = (x + sx) / 2 + (x < 100 ? 6 : x > 100 ? -6 : 0), my = (y + 104) / 2 + 6;
      stems += `<path d="M${sx} 108Q${mx} ${my} ${x} ${y + 10}" fill="none" stroke="#3E9A4B" stroke-width="4" stroke-linecap="round"/>`;
      if (i % 2 === 0) stems += `<ellipse transform="translate(${(mx + sx) / 2} ${(my + 108) / 2}) rotate(${x < 100 ? -40 : 40})" rx="9" ry="4" fill="#5CC46A"/>`;
    });
    return `<svg viewBox="0 0 200 150" aria-hidden="true">${stems}<g transform="translate(100 104) scale(.8) translate(-100 -120)">
      <path d="M73 120Q70 134 60 146Q46 174 76 177H124Q154 174 140 146Q130 134 127 120Z" fill="${vcol}" stroke="rgba(0,0,0,.25)" stroke-width="2.5"/>
      <path d="M66 150Q100 160 134 150" fill="none" stroke="rgba(255,255,255,.65)" stroke-width="5"/>
      <path d="M70 140Q62 156 70 170" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="100" cy="120" rx="28" ry="6.5" fill="${vcol}" stroke="rgba(0,0,0,.3)" stroke-width="2.5"/><ellipse cx="100" cy="121" rx="22" ry="4" fill="rgba(0,0,0,.3)"/></g></svg>`;
  }

  function startFlowers(L, api) {
    L = lvl(L);
    const done = finisher(api);
    const nSpots = Math.min(3 + Math.floor((L - 1) / 2), 7);
    const k = L <= 6 ? 3 : 4;
    const total = L <= 1 ? 3 : L <= 3 ? 4 : L <= 6 ? 5 : 6;
    let pool;
    if (L < 4) pool = shuffle(ONE_PER_SHAPE.slice());
    else {
      const fams = shuffle(FL_FAM.slice()).slice(0, 2);
      pool = [...new Set([...shuffle(fams[0].slice()), ...shuffle(fams[1].slice()), ...shuffle(Object.keys(FL))])];
    }
    const used = pool.slice(0, k), bucketTypes = shuffle(pool.slice(0, total));
    const spots = LAYOUT[nSpots];
    const target = shuffle(spots.map((_, i) => used[i % k]));
    const vcols = ['#45AEFF', '#F25A95', '#FFC234', '#3CC46B', '#A98BFF', '#FF9A3C'];
    const vc1 = pick(vcols), vc2 = pick(vcols.filter(c => c !== vc1));
    const filled = target.map(() => false);
    let sel = null, placed = 0, mistakes = 0, combo = 0;
    const wrongAt = target.map(() => 0);

    const wrap = el('div', 'g3-wrap');
    const vases = el('div', 'g3-vases');
    const exCol = el('div', 'g3-vcol'), myCol = el('div', 'g3-vcol');
    const ex = el('div', 'g3-vbox g3-ex'), mine = el('div', 'g3-vbox g3-mine');
    exCol.append(ex); myCol.append(mine);
    vases.append(exCol, myCol);
    const bucket = el('div', 'g3-bucket');
    wrap.append(vases, bucket); api.stage.append(wrap);

    ex.innerHTML = vaseSVG(spots, target.map(() => true), vc1) + '<span class="g3-vtag">Copy this</span>';
    mine.append(el('span', 'g3-vtag', 'Your vase'));
    const exSpots = spots.map(([x, y], i) => { const s = el('div', 'g3-spot', headSVG(target[i])); s.style.left = (x / 2) + '%'; s.style.top = (y / 1.5) + '%'; ex.append(s); return s; });
    const mySvgHolder = el('div'); mySvgHolder.style.cssText = 'position:absolute;inset:0'; mine.append(mySvgHolder);
    const drawMine = () => { mySvgHolder.innerHTML = vaseSVG(spots, filled, vc2); mySvgHolder.firstChild.style.cssText = 'width:100%;height:100%;display:block'; };
    drawMine();
    const mySpots = spots.map(([x, y], i) => {
      const s = el('button', 'g3-spot g3-empty'); s.type = 'button'; s.setAttribute('aria-label', 'Empty spot ' + (i + 1));
      s.style.left = (x / 2) + '%'; s.style.top = (y / 1.5) + '%';
      s.onclick = () => tapSpot(i); mine.append(s); return s;
    });
    const fbs = {};
    bucketTypes.forEach(t => {
      const b = el('button', 'tile c-card g3-fb', headSVG(t) + `<span>${FL[t].n}</span>`); b.type = 'button';
      b.onclick = () => {
        if (sel) fbs[sel].classList.remove('g3-sel');
        if (sel === t) { sel = null; api.hint('Pick a flower from the bucket.'); return; }
        sel = t; b.classList.add('g3-sel'); sfx.tap();
        api.hint(`You picked a ${FL[t].n}. Now tap the spot in your vase where it goes.`);
      };
      fbs[t] = b; bucket.append(b);
    });
    mine.append(mkBtn('💡 Help', 'c-sky g3-vhelp', helpMe));
    api.rounds(nSpots, 0);
    api.hint('Make your vase look like the example. Pick a flower from the bucket, then tap a spot.');

    function look(i) { exSpots[i].classList.add('g3-look'); api.later(() => exSpots[i].classList.remove('g3-look'), 1800); }
    function tapSpot(i) {
      if (filled[i]) return;
      look(i);
      if (!sel) { sfx.tap(); api.hint(`This spot needs a ${FL[target[i]].n}. Pick one from the bucket.`); fbs[target[i]].classList.add('g3-glow'); api.later(() => fbs[target[i]].classList.remove('g3-glow'), 2000); return; }
      if (sel === target[i]) {
        filled[i] = true; placed++; combo++;
        const s = mySpots[i]; s.classList.remove('g3-empty', 'g3-glow'); s.classList.add('g3-placed'); s.innerHTML = headSVG(sel); s.setAttribute('aria-label', FL[sel].n);
        drawMine(); sfx.good(); chime(combo + 2);
        api.rounds(nSpots, placed);
        if (placed === nSpots) {
          fbs[sel].classList.remove('g3-sel'); sel = null;
          fanfare(); toast(cheer()); api.hint('What a beautiful arrangement! Just like the example.');
          api.later(() => done(starsFor(mistakes, 1, 3)), 1200);
        } else {
          if (combo >= 3) toast(cheer());
          const more = target.some((t, j) => !filled[j] && t === sel);
          api.hint(more ? `Lovely! Is there another ${FL[sel].n} to place?` : 'Lovely! Pick the next flower from the bucket.');
          if (!more) { fbs[sel].classList.remove('g3-sel'); sel = null; }
        }
      } else {
        mistakes++; combo = 0; wrongAt[i]++; sfx.soft(); wob(mySpots[i]);
        if (wrongAt[i] >= 2) { api.hint(`This spot needs a ${FL[target[i]].n}. It’s glowing in the bucket.`); fbs[target[i]].classList.add('g3-glow'); api.later(() => fbs[target[i]].classList.remove('g3-glow'), 2400); }
        else api.hint(`Not quite. Look at the glowing flower in the example. That spot isn’t a ${FL[sel].n}.`);
      }
    }
    function helpMe() {
      const i = target.findIndex((_, j) => !filled[j]); if (i < 0) return;
      mistakes++; sfx.tap(); look(i);
      mySpots[i].classList.add('g3-glow'); api.later(() => mySpots[i].classList.remove('g3-glow'), 2400);
      fbs[target[i]].classList.add('g3-glow'); api.later(() => fbs[target[i]].classList.remove('g3-glow'), 2400);
      api.hint(`The glowing spot needs a ${FL[target[i]].n}. Pick it from the bucket, then tap the spot.`);
    }
  }

  /* =========================================================
     4. MONTHS & SEASONS
     ========================================================= */
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const SEASONS = [
    { k: 'spring', n: 'Spring', e: '🌷', c: 'c-leaf', sky: ['#9FD8FF', '#E6F7FF'], ground: '#7BD36B', extras: ['🌷', '🐑', '🐣', '🌼', '🐝'], why: 'blossom, lambs and new flowers' },
    { k: 'summer', n: 'Summer', e: '☀️', c: 'c-sun', sky: ['#4DB2FF', '#BDE6FF'], ground: '#58C04E', extras: ['🍦', '🏖️', '🍓', '🦋', '🌻'], why: 'hot sunshine, ice creams and long days' },
    { k: 'autumn', n: 'Autumn', e: '🍂', c: 'c-orange', sky: ['#F7C98B', '#FCE7C8'], ground: '#B98A45', extras: ['🎃', '🍄', '🌰', '🍎', '🍁'], why: 'falling leaves, conkers and pumpkins' },
    { k: 'winter', n: 'Winter', e: '❄️', c: 'c-sky', sky: ['#AFC6DA', '#EEF4FA'], ground: '#FFFFFF', extras: ['⛄', '🧣', '🧤', '🛷', '🎄'], why: 'snow, snowmen and cosy scarves' }
  ];
  const monthSeason = m => [3, 3, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3][m];
  const EVENTS = [
    { n: 'Christmas Day', e: '🎄', m: 11, s: 3, when: '25th December' },
    { n: 'New Year’s Day', e: '🎆', m: 0, s: 3, when: '1st January' },
    { n: 'Valentine’s Day', e: '💝', m: 1, s: 3, when: '14th February' },
    { n: 'St Patrick’s Day', e: '☘️', m: 2, s: 0, when: '17th March' },
    { n: 'Easter', e: '🐣', m: null, s: 0, when: 'in March or April, in spring' },
    { n: 'April Fools’ Day', e: '🤡', m: 3, s: 0, when: '1st April' },
    { n: 'Midsummer’s Day', e: '🌞', m: 5, s: 1, when: 'in late June' },
    { n: 'The summer holidays', e: '🏖️', m: null, s: 1, when: 'in July and August' },
    { n: 'Harvest festival', e: '🌾', m: null, s: 2, when: 'in September or October, in autumn' },
    { n: 'Halloween', e: '🎃', m: 9, s: 2, when: '31st October' },
    { n: 'Bonfire Night', e: '🎇', m: 10, s: 2, when: '5th November' },
    { n: 'Thanksgiving', e: '🦃', m: 10, s: 2, when: 'in November, in America' }
  ];

  function seasonScene(si, nExtras) {
    const S = SEASONS[si], id = nid('sky');
    let tree = `<path d="M58 132V78" stroke="#6B4022" stroke-width="13" stroke-linecap="round"/><path d="M58 96L40 76M58 88L76 68M58 80L56 58" stroke="#6B4022" stroke-width="6" stroke-linecap="round"/>`;
    const blobs = [[58, 56, 26], [36, 70, 18], [80, 68, 20], [46, 46, 18], [72, 44, 18]];
    if (si === 0) tree += blobs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#86D466"/>`).join('') + [...Array(16)].map(() => `<circle cx="${30 + randInt(58)}" cy="${34 + randInt(48)}" r="3.5" fill="#FFB7D2"/>`).join('');
    if (si === 1) tree += blobs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r + 3}" fill="#2F9E44"/>`).join('') + blobs.map(([x, y, r]) => `<circle cx="${x - 4}" cy="${y - 5}" r="${r * .5}" fill="#4CBF5E"/>`).join('');
    if (si === 2) tree += blobs.map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${['#F08A24', '#D9482B', '#F5B82E', '#E86A1F', '#C7452A'][i]}"/>`).join('');
    if (si === 3) tree += `<path d="M40 76L28 62M76 68L90 56M56 58L48 42M56 58L64 40" stroke="#6B4022" stroke-width="4" stroke-linecap="round"/><path d="M26 60L32 64M88 54L84 58M46 40L50 44M62 38L66 42" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`;
    let sky = '';
    if (si === 1) sky = `<circle cx="200" cy="30" r="18" fill="#FFD23F"/>` + [...Array(10)].map((_, i) => `<path transform="rotate(${i * 36} 200 30)" d="M200 4V-4" stroke="#FFD23F" stroke-width="4" stroke-linecap="round"/>`).join('');
    if (si === 0) sky = `<circle cx="196" cy="28" r="13" fill="#FFE27A"/><g fill="#fff"><circle cx="160" cy="34" r="11"/><circle cx="174" cy="30" r="14"/><circle cx="188" cy="36" r="10"/></g>`;
    if (si === 2) sky = `<g fill="#fff" opacity=".9"><circle cx="170" cy="30" r="12"/><circle cx="186" cy="26" r="15"/><circle cx="202" cy="32" r="11"/></g>` + [...Array(6)].map((_, i) => `<ellipse class="g3-flake" style="animation-duration:${4 + i % 3}s;animation-delay:-${i * .9}s" cx="${100 + i * 22}" cy="10" rx="4" ry="2.5" fill="${['#E86A1F', '#D9482B', '#F5B82E'][i % 3]}"/>`).join('');
    if (si === 3) sky = `<g fill="#DDE5EC"><circle cx="160" cy="30" r="13"/><circle cx="178" cy="24" r="17"/><circle cx="198" cy="32" r="12"/></g>` + [...Array(12)].map((_, i) => `<circle class="g3-flake" style="animation-duration:${4 + i % 4}s;animation-delay:-${i * .55}s" cx="${12 + i * 19}" cy="0" r="2.6" fill="#fff"/>`).join('');
    const spots = [[150, 128, 30], [196, 136, 28], [110, 138, 24], [222, 112, 22]];
    const ex = shuffle(S.extras.slice()).slice(0, nExtras).map((e, i) => `<text x="${spots[i][0]}" y="${spots[i][1]}" font-size="${spots[i][2]}" text-anchor="middle">${e}</text>`).join('');
    return `<svg viewBox="0 0 240 150" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${S.sky[0]}"/><stop offset="1" stop-color="${S.sky[1]}"/></linearGradient></defs>
      <rect width="240" height="150" fill="url(#${id})"/>${sky}<path d="M0 118Q60 104 120 116T240 112V150H0Z" fill="${S.ground}"/>${si === 3 ? '<path d="M0 118Q60 104 120 116T240 112" fill="none" stroke="#D5E3EE" stroke-width="3"/>' : ''}${tree}${ex}</svg>`;
  }

  function startMonths(L, api) {
    L = lvl(L);
    const done = finisher(api);
    const total = 5;
    let types = L <= 2 ? ['order', 'season', 'event', 'season', 'order'] : ['order', 'season', 'event', 'next', L >= 5 ? 'match' : 'event'];
    types = shuffle(types);
    const nOpts = L >= 6 ? 4 : 3;
    let round = 0, mistakes = 0;
    const evPool = shuffle(EVENTS.slice());
    const seasonPool = shuffle([0, 1, 2, 3]);
    const usedEv = new Set();
    const takeEv = f => { const e = evPool.find(x => !usedEv.has(x) && f(x)) || evPool.find(f); usedEv.add(e); return e; };

    function next() { round++; if (round >= total) { api.rounds(total, total); fanfare(); done(starsFor(mistakes, 1, 3)); } else show(); }
    function show() {
      clear(api); api.rounds(total, round);
      const t = types[round];
      if (t === 'order') orderRound();
      else if (t === 'season') seasonRound();
      else if (t === 'event') eventRound();
      else if (t === 'next') nextRound();
      else matchRound();
    }
    function choice({ hint, prompt, opts, answer, reveal, after }) {
      api.hint(hint);
      const wrap = el('div', 'g3-wrap'), pr = el('div', 'g3-q', prompt), ch = el('div', 'g3-ch');
      let solved = false;
      opts.forEach(o => {
        const b = mkBtn(o.html || o.label, o.cls || 'c-card');
        b.onclick = () => {
          if (solved) return;
          if (o.label === answer) {
            solved = true; b.classList.add('g3-right'); sfx.good(); toast(cheer());
            if (reveal) pr.innerHTML = reveal;
            api.hint(after || 'That’s right!');
            api.later(next, 1900);
          } else { mistakes++; b.classList.add('g3-nope'); sfx.soft(); api.hint('Not that one. Have another look.'); }
        };
        ch.append(b);
      });
      wrap.append(pr, ch); api.stage.append(wrap);
    }
    function monthOpts(ans, n, near, skip) {
      const set = new Set([ans]);
      const cand = shuffle(MONTHS.map((_, i) => i).filter(i => {
        const d = Math.min(Math.abs(i - ans), 12 - Math.abs(i - ans));
        return i !== ans && i !== skip && (near ? d <= 3 : d >= 3);
      }));
      while (set.size < n && cand.length) set.add(cand.shift());
      return [...set].sort((a, b) => a - b).map(i => ({ label: MONTHS[i] }));
    }
    function orderRound() {
      const n = Math.min(3 + Math.floor((L - 1) / 2), 12);
      let ms;
      if (L >= 8 && n < 12 && Math.random() < .5) ms = shuffle(MONTHS.map((_, i) => i)).slice(0, n).sort((a, b) => a - b);
      else { const st = randInt(12 - n + 1); ms = [...Array(n)].map((_, i) => st + i); }
      let pos = 0;
      api.hint(n === 12 ? 'Tap all twelve months in order, starting with January.' : 'Tap the months in order, from the start of the year.');
      const wrap = el('div', 'g3-wrap');
      const seq = el('div', 'g3-seq');
      const slots = ms.map(() => { const s = el('span', 'g3-blank', '?'); seq.append(s); return s; });
      const grid = el('div', 'g3-months');
      shuffle(ms.slice()).forEach(m => {
        const S = SEASONS[monthSeason(m)];
        const b = mkBtn(`${S.e} ${MONTHS[m]}`, S.c);
        b.onclick = () => {
          if (m === ms[pos]) {
            b.classList.add('g3-gone'); chime(pos);
            slots[pos].className = 'tile ' + S.c; slots[pos].textContent = MONTHS[m].slice(0, 3); slots[pos].classList.add('g3-pop');
            pos++;
            if (pos === ms.length) { sfx.good(); toast(cheer()); api.hint('All in order. Well done!'); api.later(next, 1500); }
            else api.hint(`Yes, ${MONTHS[m]}. Which comes next?`);
          } else {
            mistakes++; sfx.soft(); wob(b);
            api.hint(pos === 0 ? `Not yet. Which of these comes first in the year?` : `Not yet. Which comes next after ${MONTHS[ms[pos - 1]]}?`);
          }
        };
        grid.append(b);
      });
      wrap.append(seq, grid); api.stage.append(wrap);
    }
    function seasonRound() {
      const si = seasonPool.length ? seasonPool.shift() : randInt(4);
      const nEx = L <= 3 ? 3 : L <= 7 ? 2 : 1;
      const S = SEASONS[si];
      choice({
        hint: 'Look at the picture. Which season is this?', prompt: seasonScene(si, nEx), answer: S.n,
        opts: SEASONS.map(x => ({ label: x.n, html: `${x.e} ${x.n}` })),
        reveal: seasonScene(si, nEx) + `<small>${S.n}: ${S.why}.</small>`, after: `Yes, it’s ${S.n.toLowerCase()}!`
      });
    }
    function eventRound() {
      const useMonth = Math.random() < .55;
      const e = useMonth ? takeEv(x => x.m !== null) : takeEv(() => true);
      if (e.m !== null && useMonth) {
        choice({
          hint: `When is ${e.n}? Pick the month.`, prompt: `<div class="g3-big">${e.e}</div>${e.n}`, answer: MONTHS[e.m],
          opts: monthOpts(e.m, nOpts, L >= 6), reveal: `<div class="g3-big">${e.e}</div>${e.n}<small>${e.when}</small>`, after: `Yes, ${e.n} is in ${MONTHS[e.m]}.`
        });
      } else {
        const S = SEASONS[e.s];
        choice({
          hint: `Which season is ${e.n} in?`, prompt: `<div class="g3-big">${e.e}</div>${e.n}`, answer: S.n,
          opts: SEASONS.map(x => ({ label: x.n, html: `${x.e} ${x.n}` })), reveal: `<div class="g3-big">${e.e}</div>${e.n}<small>${e.when}</small>`, after: `Yes, ${e.n} is in ${S.n.toLowerCase()}.`
        });
      }
    }
    function nextRound() {
      const before = L >= 8 && Math.random() < .5, m = randInt(12), ans = (m + (before ? 11 : 1)) % 12;
      choice({
        hint: `Which month comes ${before ? 'just before' : 'straight after'} ${MONTHS[m]}?`,
        prompt: before ? `<span class="g3-big">🗓️</span><br>? → ${MONTHS[m]}` : `<span class="g3-big">🗓️</span><br>${MONTHS[m]} → ?`,
        answer: MONTHS[ans], opts: monthOpts(ans, nOpts, L >= 6, m),
        reveal: before ? `<span class="g3-big">🗓️</span><br>${MONTHS[ans]} → ${MONTHS[m]}` : `<span class="g3-big">🗓️</span><br>${MONTHS[m]} → ${MONTHS[ans]}`,
        after: before ? `Yes, ${MONTHS[ans]} comes before ${MONTHS[m]}.` : `Yes, ${MONTHS[ans]} comes after ${MONTHS[m]}.`
      });
    }
    function matchRound() {
      const n = L >= 10 ? 4 : 3;
      const byMonth = Math.random() < .5;
      let evs;
      if (byMonth) {
        const seen = new Set(); evs = shuffle(EVENTS.filter(e => e.m !== null)).filter(e => !seen.has(e.m) && seen.add(e.m)).slice(0, n);
      } else {
        const seen = new Set(); evs = shuffle(EVENTS.slice()).filter(e => !seen.has(e.s) && seen.add(e.s)).slice(0, n);
      }
      const ansOf = e => byMonth ? MONTHS[e.m] : SEASONS[e.s].n;
      api.hint(`Match each one to its ${byMonth ? 'month' : 'season'}. Tap one on the left, then its partner on the right.`);
      const wrap = el('div', 'g3-wrap'), board = el('div', 'g3-match'), L1 = el('div', 'g3-col'), R1 = el('div', 'g3-col');
      board.append(L1, R1);
      let sel = null, left = n;
      const lb = new Map();
      evs.forEach(e => {
        const b = mkBtn(`${e.e} ${e.n}`, 'c-card');
        b.onclick = () => { if (sel) lb.get(sel).classList.remove('g3-sel'); sel = e; b.classList.add('g3-sel'); sfx.tap(); api.hint(`When is ${e.n}? Tap its ${byMonth ? 'month' : 'season'}.`); };
        lb.set(e, b); L1.append(b);
      });
      shuffle(evs.slice()).forEach(e => {
        const S = byMonth ? SEASONS[monthSeason(e.m)] : SEASONS[e.s];
        const b = mkBtn(`${S.e} ${ansOf(e)}`, S.c);
        b.onclick = () => {
          if (!sel) { sfx.tap(); wob(b); api.hint('First tap one of the special days on the left.'); return; }
          if (ansOf(sel) === ansOf(e)) {
            const a = lb.get(sel); a.classList.remove('g3-sel'); a.classList.add('g3-done'); b.classList.add('g3-done');
            a.innerHTML += ' ✓'; left--; chime(n - left + 2); sfx.good();
            api.hint(`Yes! ${sel.n}: ${sel.when}.`); sel = null;
            if (!left) { toast(cheer()); api.later(next, 1700); }
          } else { mistakes++; sfx.soft(); wob(b); api.hint(`${sel.n} isn’t in ${ansOf(e)}. Try another.`); }
        };
        R1.append(b);
      });
      wrap.append(board); api.stage.append(wrap);
    }
    show();
  }

  /* =========================================================
     5. BIRD SPOTTER
     ========================================================= */
  const INK = '#18242C';
  function perch(o) {
    const c = Object.assign({ belly: o.body, head: o.body, wing: o.body, tail: o.wing || o.body, beak: '#3A3A3A', legs: '#8A6A4F', beakLen: 14, beakW: 9, tailLen: 40, tailUp: 0, scale: 1, ground: 'branch' }, o);
    const id = nid('bd');
    const bl = c.beakLen, bw = c.beakW;
    let s = '';
    const gx = c.ground;
    // tail
    s += `<g transform="rotate(${c.tailUp} 128 100)"><path d="M122 92L${132 + c.tailLen} ${102 + c.tailLen * .2}L${128 + c.tailLen} ${118 + c.tailLen * .25}L120 108Z" fill="${c.tail}" stroke="rgba(0,0,0,.2)" stroke-width="2"/>${c.tailTip ? `<path d="M${130 + c.tailLen * .8} ${104 + c.tailLen * .2}L${132 + c.tailLen} ${102 + c.tailLen * .2}L${128 + c.tailLen} ${118 + c.tailLen * .25}L${126 + c.tailLen * .8} ${114 + c.tailLen * .25}Z" fill="${c.tailTip}"/>` : ''}</g>`;
    if (c.vent) s += `<ellipse cx="124" cy="114" rx="10" ry="7" fill="${c.vent}"/>`;
    // legs
    if (gx !== 'trunk') s += `<path d="M92 122L89 ${gx === 'grass' ? 140 : 132}M108 122L110 ${gx === 'grass' ? 140 : 132}" stroke="${c.legs}" stroke-width="4.5" stroke-linecap="round"/><path d="M80 ${gx === 'grass' ? 140 : 132}H96M102 ${gx === 'grass' ? 140 : 132}H118" stroke="${c.legs}" stroke-width="4" stroke-linecap="round"/>`;
    // body, neck, head
    s += `<defs><clipPath id="${id}"><ellipse cx="100" cy="98" rx="40" ry="30"/><ellipse cx="78" cy="84" rx="22" ry="18"/><circle cx="66" cy="70" r="24"/></clipPath></defs>`;
    s += `<ellipse cx="100" cy="98" rx="40" ry="30" fill="${c.body}"/><ellipse cx="78" cy="84" rx="22" ry="18" fill="${c.head}"/><circle cx="66" cy="70" r="24" fill="${c.head}"/>`;
    let k = `<ellipse cx="90" cy="116" rx="36" ry="22" fill="${c.belly}"/>`;
    if (c.robinBib) k += `<ellipse cx="66" cy="90" rx="25" ry="27" fill="${c.robinBib}"/>`;
    if (c.throat) k += `<ellipse cx="56" cy="88" rx="13" ry="10" fill="${c.throat}"/>`;
    if (c.bib) k += `<ellipse cx="58" cy="90" rx="10" ry="11" fill="${c.bib}"/>`;
    if (c.cheek) k += `<ellipse cx="68" cy="76" rx="14" ry="9" fill="${c.cheek}"/>`;
    if (c.face) k += `<ellipse cx="46" cy="72" rx="14" ry="13" fill="${c.face}"/>`;
    if (c.cap) k += `<ellipse cx="70" cy="51" rx="25" ry="${c.capH || 13}" fill="${c.cap}"/>`;
    if (c.brow) k += `<path d="M50 61Q66 56 86 64" fill="none" stroke="${c.brow}" stroke-width="4" stroke-linecap="round"/>`;
    if (c.stripe) k += `<path d="M44 68Q64 66 88 72" fill="none" stroke="${c.stripe}" stroke-width="5" stroke-linecap="round"/>`;
    if (c.moust) k += `<path d="M46 80Q64 90 88 80" fill="none" stroke="${c.moust}" stroke-width="5" stroke-linecap="round"/>`;
    if (c.collar) k += `<path d="M48 88Q68 104 92 84" fill="none" stroke="${c.collar}" stroke-width="5" stroke-linecap="round"/>`;
    if (c.neck) k += `<ellipse cx="80" cy="88" rx="16" ry="12" fill="${c.neck[0]}"/><ellipse cx="86" cy="92" rx="10" ry="7" fill="${c.neck[1]}" opacity=".85"/>`;
    if (c.nape) k += `<ellipse cx="88" cy="66" rx="7" ry="8" fill="${c.nape}"/>`;
    if (c.spots) k += [...Array(26)].map(() => `<circle cx="${62 + randInt(76)}" cy="${78 + randInt(48)}" r="1.8" fill="${c.spots}"/>`).join('');
    s += `<g clip-path="url(#${id})">${k}</g>`;
    // wing
    s += `<path d="M90 86Q122 72 148 102Q130 118 102 110Q86 102 90 86Z" fill="${c.wing}" stroke="rgba(0,0,0,.18)" stroke-width="2"/>`;
    if (c.patch) s += `<ellipse cx="104" cy="92" rx="12" ry="7" transform="rotate(10 104 92)" fill="${c.patch}"/>`;
    if (c.wingbar) s += `<path d="M106 96Q120 94 132 104" fill="none" stroke="${c.wingbar}" stroke-width="5" stroke-linecap="round"/>`;
    if (c.wingbar2) s += `<path d="M100 102Q116 100 126 110" fill="none" stroke="${c.wingbar2}" stroke-width="4" stroke-linecap="round"/>`;
    if (c.streak) s += `<path d="M104 90L118 94M110 100L126 104M100 98L112 104M120 90L134 98" stroke="${c.streak}" stroke-width="3" stroke-linecap="round"/>`;
    if (c.wingTip) s += `<path d="M132 92Q146 100 150 104Q140 110 128 108Z" fill="${c.wingTip}"/><circle cx="140" cy="103" r="2.5" fill="#fff"/>`;
    // crest
    if (c.crest) s += `<path d="M58 52Q74 18 98 36Q84 42 84 58Z" fill="${c.crest}"/>`;
    // eye, beak
    if (c.eyeRing) s += `<circle cx="58" cy="66" r="7.5" fill="${c.eyeRing}"/>`;
    s += `<circle cx="58" cy="66" r="5" fill="${INK}"/><circle cx="56.3" cy="64.3" r="1.8" fill="#fff"/>`;
    s += `<path d="M47 ${72 - bw / 2}L${47 - bl} ${73}L47 ${72 + bw / 2}Z" fill="${c.beak}" stroke="rgba(0,0,0,.25)" stroke-width="1.5" stroke-linejoin="round"/>`;
    if (c.beakSpot) s += `<circle cx="${47 - bl * .55}" cy="${74.5}" r="2.4" fill="${c.beakSpot}"/>`;
    if (c.cere) s += `<ellipse cx="46" cy="70" rx="4" ry="2.5" fill="${c.cere}"/>`;
    const bird = `<g transform="translate(100 98) scale(${c.scale}) translate(-100 -98)">${s}</g>`;
    let bg = '';
    if (gx === 'branch') bg = `<path d="M8 136Q100 126 196 138" stroke="#7A4A28" stroke-width="11" stroke-linecap="round" fill="none"/><path d="M160 134Q176 116 190 118" stroke="#7A4A28" stroke-width="6" stroke-linecap="round" fill="none"/><ellipse cx="184" cy="114" rx="10" ry="5" fill="#5CC46A" transform="rotate(-25 184 114)"/><ellipse cx="30" cy="128" rx="10" ry="5" fill="#5CC46A" transform="rotate(20 30 128)"/>`;
    if (gx === 'grass') bg = `<path d="M0 140Q100 132 200 140V170H0Z" fill="#6CC75A"/>` + [...Array(14)].map((_, i) => `<path d="M${8 + i * 14} 146l3-10l3 10" fill="#4FAE45"/>`).join('');
    if (gx === 'post') bg = `<rect x="66" y="132" width="68" height="40" rx="5" fill="#9C6B3F"/><rect x="62" y="128" width="76" height="10" rx="4" fill="#B98250"/><path d="M0 154Q50 148 100 154T200 152V170H0Z" fill="#4FA8E0"/>`;
    if (gx === 'trunk') return { bg, bird: `<rect x="14" y="0" width="40" height="170" fill="#8A5A34"/><path d="M24 20V60M40 80V130M30 140V170M46 10V40" stroke="#6B4022" stroke-width="3"/><path d="M52 104l12 4M52 116l12-2" stroke="#4A4A4A" stroke-width="4" stroke-linecap="round"/><g transform="translate(-14 4) rotate(40 100 98)">${bird}</g>` };
    return { bg, bird };
  }
  function swim(o) {
    let s = `<path d="M0 116Q50 110 100 116T200 114V170H0Z" fill="#5AB8EE"/>`;
    const tl = o.tail || o.body;
    s += `<path d="M150 104L178 88L172 110Z" fill="${tl}"/>`;
    if (o.curl) s += `<path d="M160 98q8-12 0-14" fill="none" stroke="${o.curl}" stroke-width="3.5" stroke-linecap="round"/>`;
    s += `<ellipse cx="116" cy="112" rx="56" ry="23" fill="${o.body}"/>`;
    if (o.chest) s += `<ellipse cx="78" cy="110" rx="20" ry="17" fill="${o.chest}"/>`;
    if (o.wing) s += `<path d="M96 102Q130 90 166 104Q140 116 104 114Z" fill="${o.wing}" stroke="rgba(0,0,0,.12)" stroke-width="2"/>`;
    if (o.spec) s += `<path d="M128 104L148 104L146 110L128 110Z" fill="${o.spec}"/>`;
    s += `<path d="${o.neckPath}" fill="none" stroke="${o.neck || o.head}" stroke-width="${o.neckW || 16}" stroke-linecap="round"/>`;
    const [hx, hy, hr] = o.headAt;
    s += `<circle cx="${hx}" cy="${hy}" r="${hr}" fill="${o.head}"/>`;
    if (o.collar) s += `<path d="${o.collar}" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    if (o.strap) s += `<ellipse cx="${hx + 2}" cy="${hy + 3}" rx="${hr * .6}" ry="${hr * .45}" fill="#fff"/>`;
    s += `<circle cx="${hx - hr * .35}" cy="${hy - hr * .25}" r="3.6" fill="${INK}"/><circle cx="${hx - hr * .35 - 1}" cy="${hy - hr * .25 - 1.2}" r="1.3" fill="#fff"/>`;
    const bx = hx - hr + 2, by = hy + 1;
    s += `<path d="M${bx + 2} ${by - 5}Q${bx - o.bill} ${by - 5} ${bx - o.bill} ${by}Q${bx - o.bill} ${by + 5} ${bx + 2} ${by + 4}Z" fill="${o.billC}" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/>`;
    if (o.knob) s += `<path d="M${bx + 2} ${by - 6}L${bx - 3} ${by - 5}L${bx - 2} ${by + 3}L${bx + 3} ${by + 3}Z" fill="${INK}"/>`;
    s += `<path d="M20 128q10-5 20 0M150 136q10-5 20 0M60 148q10-5 20 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>`;
    s += `<path d="M58 124Q116 134 172 122" stroke="rgba(255,255,255,.6)" stroke-width="3" fill="none"/>`;
    return { bg: '', bird: s };
  }
  function owl() {
    let s = `<path d="M10 140Q100 130 190 142" stroke="#5A361C" stroke-width="12" stroke-linecap="round" fill="none"/>`;
    s += `<path d="M64 46L58 18L80 38ZM136 46L142 18L120 38Z" fill="#7E5530"/>`;
    s += `<ellipse cx="100" cy="88" rx="46" ry="54" fill="#9A6B3F"/>`;
    s += `<ellipse cx="58" cy="96" rx="14" ry="34" fill="#7E5530" transform="rotate(10 58 96)"/><ellipse cx="142" cy="96" rx="14" ry="34" fill="#7E5530" transform="rotate(-10 142 96)"/>`;
    s += `<ellipse cx="100" cy="108" rx="28" ry="30" fill="#E7CFA6"/>` + [[90, 100], [110, 100], [100, 112], [88, 122], [112, 122], [100, 132]].map(([x, y]) => `<path d="M${x - 5} ${y}l5 4l5-4" stroke="#9A6B3F" stroke-width="2.5" fill="none" stroke-linecap="round"/>`).join('');
    s += `<circle cx="80" cy="66" r="21" fill="#F3E1BF"/><circle cx="120" cy="66" r="21" fill="#F3E1BF"/>`;
    s += `<circle cx="80" cy="66" r="13" fill="#F7A600"/><circle cx="120" cy="66" r="13" fill="#F7A600"/><circle cx="80" cy="66" r="7.5" fill="${INK}"/><circle cx="120" cy="66" r="7.5" fill="${INK}"/><circle cx="77" cy="63" r="2.6" fill="#fff"/><circle cx="117" cy="63" r="2.6" fill="#fff"/>`;
    s += `<path d="M94 78L106 78L100 92Z" fill="#E9B44C" stroke="#B5832A" stroke-width="1.5"/>`;
    s += `<path d="M84 140v6M90 140v6M110 140v6M116 140v6" stroke="#F2A93B" stroke-width="5" stroke-linecap="round"/>`;
    return { bg: `<circle cx="168" cy="30" r="16" fill="#FFF3C4"/><circle cx="160" cy="26" r="13" fill="#2B3A67"/>` + [[30, 24], [52, 50], [180, 70], [150, 50], [20, 80]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="#fff"/>`).join(''), bird: s };
  }
  const BIRDS = [
    { k: 'robin', n: 'Robin', g: ['brown', 'red'], easy: 1, draw: () => perch({ body: '#8A6A4F', wing: '#7A5A40', belly: '#F4EDE2', robinBib: '#F26B2A', beak: '#2B2B2B', beakLen: 12, beakW: 7, scale: .95 }), fact: 'Robins sing all year round, even in winter, and love to follow gardeners to snap up worms.' },
    { k: 'bluetit', n: 'Blue tit', g: ['blue', 'small'], easy: 1, draw: () => perch({ body: '#A9BC5C', belly: '#FFD84A', head: '#FFFFFF', cap: '#2F8CE6', capH: 11, stripe: '#1E2A44', collar: '#1E2A44', wing: '#4D8FD8', wingbar: '#FFFFFF', tail: '#4D8FD8', beak: '#2B2B2B', beakLen: 8, beakW: 7, scale: .85 }), fact: 'Blue tits love nest boxes, and the parents can bring their chicks hundreds of caterpillars a day.' },
    { k: 'blackbird', n: 'Blackbird', g: ['black'], easy: 1, draw: () => perch({ body: '#1E1E22', wing: '#2B2B31', beak: '#FF9E1B', eyeRing: '#FFB31A', legs: '#4A3A2A', beakLen: 16, beakW: 8, tailLen: 46 }), fact: 'Only the male blackbird is black with an orange beak. The female is brown, and both sing lovely evening songs.' },
    { k: 'sparrow', n: 'Sparrow', g: ['brown', 'small'], easy: 1, draw: () => perch({ body: '#A87A50', belly: '#DDD6C8', cap: '#8E8E8E', capH: 11, cheek: '#E6E0D4', bib: '#1E1E1E', wing: '#8C5A33', streak: '#3B2A1A', wingbar: '#F4EFE6', tail: '#7A5030', beak: '#3B3B3B', beakLen: 9, beakW: 9, scale: .9 }), fact: 'House sparrows love company. They chatter in noisy groups and enjoy a good dust bath.' },
    { k: 'pigeon', n: 'Pigeon', g: ['grey'], easy: 1, draw: () => perch({ body: '#8E97A6', head: '#7F889A', wing: '#A6AFBD', wingbar: '#3E4450', wingbar2: '#3E4450', neck: ['#4FAF8E', '#9B6BC4'], tail: '#6B7384', tailTip: '#2E333C', beak: '#3B3B3B', cere: '#F1F1F1', beakLen: 9, beakW: 6, eyeRing: '#F08A24', legs: '#E06A7A', ground: 'grass', scale: 1.05 }), fact: 'Pigeons can find their way home from hundreds of miles away. They carried messages in both World Wars.' },
    { k: 'crow', n: 'Crow', g: ['black'], easy: 1, draw: () => perch({ body: '#17171E', wing: '#22222C', beak: '#111116', legs: '#111116', beakLen: 22, beakW: 13, tailLen: 42, ground: 'grass', scale: 1.1 }), fact: 'Crows are very clever. They can remember people’s faces and even use sticks as tools.' },
    { k: 'magpie', n: 'Magpie', g: ['black'], draw: () => perch({ body: '#18181E', belly: '#FFFFFF', wing: '#1E2338', patch: '#FFFFFF', tail: '#1B2A4A', tailLen: 58, beak: '#111116', legs: '#111116', beakLen: 15, beakW: 9, ground: 'grass' }), fact: 'Magpies are clever birds that can recognise themselves in a mirror. Some people salute them for luck.' },
    { k: 'starling', n: 'Starling', g: ['black'], draw: () => perch({ body: '#22302E', wing: '#2E4240', spots: '#F2E6C8', beak: '#F2C230', legs: '#C9776A', beakLen: 16, beakW: 7, tailLen: 30, ground: 'grass' }), fact: 'Starlings gather in huge swirling flocks called murmurations, and they are brilliant copycats of other sounds.' },
    { k: 'seagull', n: 'Seagull', g: ['grey', 'water'], easy: 1, draw: () => perch({ body: '#FFFFFF', wing: '#A9B4BF', wingTip: '#1E2A33', tail: '#FFFFFF', beak: '#F5C431', beakSpot: '#E0302C', beakLen: 18, beakW: 9, eyeRing: '#F5C431', legs: '#F09AA0', ground: 'post', scale: 1.05 }), fact: 'Gull chicks peck the red spot on a parent’s beak to ask for their dinner.' },
    { k: 'woodpecker', n: 'Woodpecker', g: ['red'], draw: () => perch({ body: '#1E1E22', belly: '#F3EFE6', head: '#F3EFE6', cap: '#1E1E22', capH: 11, moust: '#1E1E22', nape: '#E0302C', wing: '#1E1E22', patch: '#FFFFFF', wingbar: '#FFFFFF', vent: '#E0302C', beak: '#3A3A3A', beakLen: 20, beakW: 8, tailLen: 30, ground: 'trunk' }), fact: 'Woodpeckers drum on tree trunks to say “this is my patch”, and use long sticky tongues to find insects.' },
    { k: 'cardinal', n: 'Cardinal', g: ['red'], draw: () => perch({ body: '#D6232C', wing: '#B51E25', crest: '#D6232C', face: '#1E1E22', beak: '#F07A2E', beakLen: 13, beakW: 13, tailLen: 46 }), fact: 'Cardinals are a favourite in America. The bright red one is the male, and he often feeds seeds to his partner.' },
    { k: 'bluejay', n: 'Blue jay', g: ['blue'], draw: () => perch({ body: '#4A86D8', belly: '#E8ECF0', cheek: '#F2F4F7', throat: '#F2F4F7', crest: '#4A86D8', collar: '#1E1E22', wing: '#3E7BD6', wingbar: '#FFFFFF', wingbar2: '#1E1E22', tail: '#3E7BD6', beak: '#1E1E22', beakLen: 14, beakW: 9, tailLen: 48 }), fact: 'Blue jays are noisy and clever, and they can copy the call of a hawk.' },
    { k: 'goldfinch', n: 'Goldfinch', g: ['red', 'small'], draw: () => perch({ body: '#C9A57A', belly: '#F3EBDD', head: '#FFFFFF', cap: '#1E1E22', capH: 10, face: '#E0302C', wing: '#1E1E22', wingbar: '#FFD21F', tail: '#1E1E22', beak: '#F1D7C0', beakLen: 13, beakW: 8, scale: .85 }), fact: 'A group of goldfinches is called a charm. They love nibbling seeds from thistles.' },
    { k: 'wren', n: 'Wren', g: ['brown', 'small'], draw: () => perch({ body: '#9A6A42', belly: '#C9A37E', wing: '#8A5C36', streak: '#5A3A20', brow: '#E8D5B9', tail: '#8A5C36', tailUp: -62, tailLen: 30, beak: '#4A3A2A', beakLen: 12, beakW: 5, scale: .78 }), fact: 'The wren is one of our smallest birds, but it has one of the loudest songs for its size.' },
    { k: 'kingfisher', n: 'Kingfisher', g: ['blue'], draw: () => perch({ body: '#1F8FD8', belly: '#F2832A', cheek: '#F2832A', throat: '#FFFFFF', wing: '#1A7CC0', tail: '#1A7CC0', tailLen: 22, beak: '#1E1E22', beakLen: 28, beakW: 8, legs: '#E8642A', scale: .92 }), fact: 'Kingfishers dive into rivers to catch little fish. A flash of their bright blue is a lucky sight.' },
    { k: 'owl', n: 'Owl', g: ['brown'], easy: 1, night: 1, draw: owl, fact: 'Owls fly almost silently thanks to soft, fringed feathers, and they can turn their heads a long way round.' },
    { k: 'duck', n: 'Duck', g: ['water'], easy: 1, draw: () => swim({ body: '#C9C2B6', chest: '#7A3E22', wing: '#B3AA9C', spec: '#2E5FBF', tail: '#F2F2F2', curl: '#1E1E22', head: '#1F7A4A', neck: '#1F7A4A', neckPath: 'M80 104Q72 88 74 74', neckW: 15, headAt: [72, 66, 16], collar: 'M68 90Q78 94 86 90', bill: 22, billC: '#F2C230' }), fact: 'The male mallard has the shiny green head. The female is speckled brown, and she does most of the quacking.' },
    { k: 'swan', n: 'Swan', g: ['water'], easy: 1, draw: () => swim({ body: '#FFFFFF', wing: '#F1F1F1', head: '#FFFFFF', neckPath: 'M84 106Q56 84 70 62Q82 42 66 36', neckW: 14, headAt: [62, 36, 12], bill: 20, billC: '#F07A2E', knob: 1 }), fact: 'Swans often stay with the same partner for life, and their fluffy grey babies are called cygnets.' },
    { k: 'goose', n: 'Goose', g: ['water'], draw: () => swim({ body: '#8A6E52', chest: '#E8DFD0', wing: '#76593F', head: '#1E1E22', neck: '#1E1E22', neckPath: 'M82 104Q72 80 70 54', neckW: 13, headAt: [68, 48, 13], strap: 1, bill: 17, billC: '#1E1E22', tail: '#1E1E22' }), fact: 'Geese fly in a V shape to save energy, honking to keep in touch with each other.' }
  ];
  function birdScene(b) {
    const { bg, bird } = b.draw();
    const id = nid('bs');
    const sky = b.night ? ['#1F2C55', '#3A4E86'] : b.k === 'duck' || b.k === 'swan' || b.k === 'goose' || b.k === 'seagull' ? ['#A6DBFF', '#E6F6FF'] : ['#BFE6C9', '#F2FBEF'];
    return `<svg viewBox="0 0 200 170" role="img" aria-label="A bird"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs><rect width="200" height="170" fill="url(#${id})"/>${b.night ? '' : '<g fill="#fff" opacity=".7"><circle cx="150" cy="26" r="10"/><circle cx="162" cy="22" r="13"/><circle cx="176" cy="28" r="9"/></g>'}${bg}${bird}</svg>`;
  }

  function startBirds(L, api) {
    L = lvl(L);
    const done = finisher(api);
    const total = 5;
    const pool = shuffle(BIRDS.filter(b => L <= 2 ? b.easy : true));
    const picks = pool.slice(0, total);
    let round = 0, mistakes = 0;
    function show() {
      clear(api); api.rounds(total, round);
      const b = picks[round];
      let others;
      const rest = BIRDS.filter(x => x !== b);
      if (L >= 5) {
        const sim = shuffle(rest.filter(x => x.g.some(g => b.g.includes(g))));
        others = [...new Set([...sim, ...shuffle(rest.slice())])].slice(0, 2);
      } else if (L <= 2) {
        others = shuffle(rest.filter(x => x.easy && !x.g.some(g => b.g.includes(g)))).slice(0, 2);
        if (others.length < 2) others = shuffle(rest.slice()).slice(0, 2);
      } else others = shuffle(rest.slice()).slice(0, 2);
      const opts = shuffle([b, ...others]);
      api.hint('Which bird is this? Pick its name.');
      const wrap = el('div', 'g3-wrap');
      const scene = el('div', 'g3-scene g3-pop', birdScene(b));
      const ch = el('div', 'g3-ch');
      let solved = false;
      opts.forEach(o => {
        const btn = mkBtn(o.n, 'c-card');
        btn.onclick = () => {
          if (solved) return;
          if (o === b) {
            solved = true; btn.classList.add('g3-right'); sfx.good(); toast(cheer());
            [0, 1, 2].forEach(i => tone(1400 + i * 260 + randInt(80), .09, 'sine', .07, i * .11));
            round++; api.rounds(total, round);
            api.hint(`Yes, it’s a ${b.n.toLowerCase()}!`);
            api.later(() => {
              ch.remove();
              const fact = el('div', 'g3-fact', `<h3>${b.n}</h3><p>${b.fact}</p>`);
              fact.append(mkBtn(round >= total ? 'Finish ★' : 'Next bird →', 'c-leaf', () => { sfx.tap(); if (round >= total) { fanfare(); done(starsFor(mistakes, 1, 3)); } else show(); }));
              wrap.append(fact);
              api.hint('Here’s a fun fact. Tap the green button when you’re ready.');
            }, 700);
          } else {
            mistakes++; btn.classList.add('g3-nope'); sfx.soft();
            api.hint(`Not a ${o.n.toLowerCase()}. Have another look.`);
          }
        };
        ch.append(btn);
      });
      wrap.append(scene, ch); api.stage.append(wrap);
    }
    show();
  }

  /* ========================================================= */
  [
    { id: 'socks', order: 18, name: 'Pair the Socks', icon: '🧦', desc: 'Find matching socks and peg them out', start: startSocks },
    { id: 'tea', order: 19, name: 'Tea Orders', icon: '🫖', desc: 'Remember how each guest takes their tea', start: startTea },
    { id: 'flowers', order: 20, name: 'Flower Arranging', icon: '💐', desc: 'Copy the vase of flowers', start: startFlowers },
    { id: 'months', order: 21, name: 'Months & Seasons', icon: '🗓️', desc: 'Months in order, seasons and special days', start: startMonths },
    { id: 'birds', order: 22, name: 'Bird Spotter', icon: '🐦', desc: 'Name the garden birds from the pictures', start: startBirds }
  ].forEach(g => register(Object.assign({ cat: 'gentle', gentle: true }, g)));
})();
