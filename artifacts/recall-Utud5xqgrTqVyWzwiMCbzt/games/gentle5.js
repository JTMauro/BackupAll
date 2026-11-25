/* Recall: Gentle Games 5 — Famous Places, Dot to Dot, Colour by Number, My Life Book (gentle),
   Faces & Names and Quiz Night (memory). Every level is generated fresh; difficulty rises gently and levels off. */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor, runQuiz, store } = R;

  const mkBtn = (label, cls, fn) => { const b = el('button', 'btn ' + cls, label); b.type = 'button'; if (fn) b.onclick = fn; return b; };
  const finisher = api => { let d = false; return s => { if (d) return; d = true; api.done(Math.max(1, Math.min(3, Math.round(s)))); }; };
  const lvl = L => Math.max(1, Math.floor(+L || 1));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const chime = (n, base = 523) => { tone(base * Math.pow(1.06, n), .14, 'triangle', .12); };
  const circ = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
  const ell = (cx, cy, rx, ry) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;

  R.css(`
.g5-wrap{max-width:560px;margin:0 auto;display:grid;gap:14px}
.g5-row{display:flex;flex-wrap:wrap;justify-content:center;gap:12px}
.g5-row .btn{font-size:1.2rem}
.g5-card{background:var(--card);color:var(--ink);border-radius:24px;padding:14px;box-shadow:0 7px 0 var(--card-edge),0 14px 24px rgba(0,0,0,.28)}
.g5-pop{animation:g5-bounce .5s cubic-bezier(.3,1.6,.5,1)}
@keyframes g5-bounce{0%{transform:scale(.6)}60%{transform:scale(1.08)}100%{transform:scale(1)}}
@keyframes g5-glowk{0%,100%{box-shadow:0 0 0 5px var(--sun),0 6px 0 var(--d,var(--card-edge))}50%{box-shadow:0 0 0 9px #fff,0 6px 0 var(--d,var(--card-edge))}}
@keyframes g5-fadein{from{opacity:0;transform:translateY(8px)}}

/* Famous Places */
.g5-plpic{position:relative;aspect-ratio:4/3;border-radius:18px;overflow:hidden;display:grid;place-items:center;
  background:linear-gradient(180deg,var(--s1,#BFE6FF),var(--s2,#EEF9FF));box-shadow:inset 0 0 0 4px #fff}
.g5-plpic svg{width:100%;height:100%;display:block}
.g5-plemo{font-size:clamp(6.5rem,34vw,9.5rem);line-height:1;filter:drop-shadow(0 8px 8px rgba(0,0,0,.25));animation:g5-bounce .6s}
.g5-plopts{display:grid;gap:12px}
.g5-plbtn{width:100%;font-size:clamp(1.25rem,4.6vw,1.45rem)!important;min-height:64px}
.g5-plbtn.g5-nope{opacity:.35;pointer-events:none}
.g5-fact{display:grid;gap:10px;text-align:center;animation:g5-fadein .4s}
.g5-fact h3{font-size:clamp(1.5rem,5.6vw,1.9rem);color:var(--leaf-d)}
.g5-fact p{margin:0;font-size:1.25rem;line-height:1.4}
.g5-where{display:inline-block;justify-self:center;font:600 1.15rem var(--display);background:var(--peach);padding:.15em .9em;border-radius:999px}

/* Dot to Dot */
.g5-dtbox{position:relative;width:100%;max-width:400px;margin:0 auto;aspect-ratio:1;border-radius:22px;background:#FFFDF6;
  box-shadow:0 7px 0 var(--card-edge),0 14px 24px rgba(0,0,0,.28);touch-action:manipulation}
.g5-dtbox svg{width:100%;height:100%;display:block;cursor:pointer}
.g5-dtfill{opacity:0;transition:opacity 1s}
.g5-dtdone .g5-dtfill{opacity:1}
.g5-dtline{fill:none;stroke:#2B3A44;stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round}
.g5-dot circle.g5-dc{fill:var(--coral);stroke:#fff;stroke-width:1.2}
.g5-dot text{font:700 6px var(--body);fill:#18242C;paint-order:stroke;stroke:#FFFDF6;stroke-width:2px;text-anchor:middle;dominant-baseline:central;pointer-events:none}
.g5-dot.g5-hit circle.g5-dc{fill:var(--leaf)}
.g5-dot.g5-first circle.g5-dc{fill:var(--sky)}
.g5-ring{fill:none;stroke:var(--sun);stroke-width:2.2;opacity:0;transform-box:fill-box;transform-origin:center}
.g5-glow .g5-ring{animation:g5-ring 1.4s ease-out infinite}
@keyframes g5-ring{0%{opacity:1;transform:scale(.6)}100%{opacity:0;transform:scale(2.3)}}
.g5-dtdone .g5-dot{opacity:0;transition:opacity .8s}
.g5-dtdone .g5-dtline{stroke-width:1.2}
.g5-dtname{position:absolute;left:50%;bottom:10px;translate:-50% 0;white-space:nowrap;font:600 clamp(1.3rem,5vw,1.6rem) var(--display);background:var(--sun);color:var(--ink);
  padding:.2em .9em;border-radius:999px;box-shadow:0 5px 0 var(--sun-d);animation:g5-bounce .6s}

/* Colour by Number */
.g5-cnbox{position:relative;width:100%;max-width:380px;margin:0 auto;aspect-ratio:1;border-radius:20px;overflow:hidden;background:#fff;
  box-shadow:0 0 0 5px #fff,0 9px 0 5px var(--card-edge),0 16px 26px rgba(0,0,0,.3)}
.g5-cnbox svg{width:100%;height:100%;display:block}
.g5-reg{stroke:#38444C;stroke-width:.7;stroke-linejoin:round;cursor:pointer;transition:fill .35s}
.g5-reg.g5-shake{animation:g5-shake .4s}
.g5-reg.g5-help{animation:g5-blink .8s infinite}
@keyframes g5-shake{0%,100%{translate:0}25%{translate:-1.5px}75%{translate:1.5px}}
@keyframes g5-blink{50%{fill:#FFE27A}}
.g5-cnl{font:700 5.6px var(--body);fill:#18242C;text-anchor:middle;dominant-baseline:central;pointer-events:none;transition:opacity .3s}
.g5-cnl.g5-gone{opacity:0}
.g5-sw{display:flex;flex-wrap:wrap;justify-content:center;gap:12px}
.g5-swb{width:60px;height:60px;border-radius:18px;font:700 1.7rem var(--display);cursor:pointer;color:#18242C;position:relative;transition:transform .12s}
.g5-swb span{background:rgba(255,255,255,.88);border-radius:50%;width:38px;height:38px;display:grid;place-items:center}
.g5-swb.g5-on{transform:translateY(-6px);outline:5px solid #fff;outline-offset:3px}
.g5-swb.g5-fin span{background:var(--leaf);color:#fff}
.g5-spark{position:absolute;inset:0;pointer-events:none}
.g5-spark i{position:absolute;font-style:normal;font-size:1.8rem;animation:g5-tw 1.6s ease-in-out infinite;opacity:0}
@keyframes g5-tw{0%,100%{opacity:0;transform:scale(.4) rotate(0)}50%{opacity:1;transform:scale(1.2) rotate(30deg)}}
.g5-shine{position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.75) 48%,transparent 66%);background-size:250% 100%;animation:g5-sweep 1.4s ease-out 2}
@keyframes g5-sweep{from{background-position:120% 0}to{background-position:-30% 0}}

/* My Life Book */
.g5-lbpage{background:linear-gradient(90deg,#EFE3CB 0,#FFF9EF 14px);color:var(--ink);border-radius:8px 22px 22px 8px;padding:14px 14px 16px 24px;display:grid;gap:10px;
  box-shadow:inset 6px 0 10px -6px rgba(0,0,0,.35),0 7px 0 var(--card-edge),0 16px 26px rgba(0,0,0,.32);transform-origin:left center}
.g5-turnN{animation:g5-turnn .6s cubic-bezier(.25,.9,.35,1)}
.g5-turnP{animation:g5-turnp .6s cubic-bezier(.25,.9,.35,1)}
@keyframes g5-turnn{from{transform:perspective(1200px) rotateY(-75deg);opacity:.3}}
@keyframes g5-turnp{from{transform:perspective(1200px) rotateY(75deg);opacity:.3;transform-origin:right center}}
.g5-lbphoto{aspect-ratio:4/3;border-radius:10px;overflow:hidden;display:grid;place-items:center;background:#E9DFCB;box-shadow:0 0 0 6px #fff,0 6px 14px rgba(0,0,0,.25);
  rotate:-1.2deg;margin:6px 6px 4px}
.g5-lbphoto img{width:100%;height:100%;object-fit:cover;display:block}
.g5-scene{width:100%;height:100%;display:grid;place-items:center;align-content:center;gap:4px}
.g5-scene b{font-size:clamp(5rem,26vw,7.5rem);line-height:1;filter:drop-shadow(0 6px 6px rgba(0,0,0,.2))}
.g5-scene span{font-size:clamp(1.7rem,8vw,2.3rem);letter-spacing:.15em}
.g5-lbcap{font:600 clamp(1.45rem,5.6vw,1.8rem)/1.2 var(--display);text-align:center;color:#3B2A1A}
.g5-lbq{font-size:1.25rem;line-height:1.35;background:#fff;border-radius:16px;padding:10px 14px;box-shadow:0 3px 0 var(--card-edge)}
.g5-lbtag{justify-self:center;font:600 1.15rem var(--display);background:var(--sun);padding:.1em .8em;border-radius:999px}
.g5-lbnav{display:flex;align-items:center;justify-content:space-between;gap:10px;font:600 1.2rem var(--display)}
.g5-lbnav .btn{min-width:72px;font-size:1.6rem}
.g5-lbnav .btn[disabled]{opacity:.35;pointer-events:none}
.g5-slot{border:0;cursor:pointer;font:600 1.35rem/1.3 var(--display);color:var(--ink-soft);background:repeating-linear-gradient(45deg,#F1E7D3 0 12px,#E9DDC4 12px 24px)}
.g5-slot big{display:block;font-size:3.4rem}
.g5-lbin{width:100%;font:600 1.35rem var(--body);padding:12px 14px;border-radius:14px;border:3px solid var(--card-edge);background:#fff;color:var(--ink);min-height:56px}
.g5-lbin:focus{outline:4px solid var(--sky);outline-offset:1px}
.g5-chips{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.g5-chips .btn:last-child{grid-column:1 / -1}
.g5-slot.g5-lbphoto{aspect-ratio:16/10}
.g5-chip{font:600 1.15rem/1.15 var(--display)!important;min-height:56px;padding:.35em .5em!important;border-radius:16px;text-align:center}
.g5-chip.g5-on{--c:var(--sun);--d:var(--sun-d)}
.g5-cover{text-align:center;display:grid;gap:12px;justify-items:center}
.g5-cover .g5-bk{font-size:5rem;line-height:1}
.g5-cover h3{font-size:clamp(1.8rem,7vw,2.3rem);color:#3B2A1A}
.g5-cover p{margin:0;font-size:1.2rem;line-height:1.4}

/* Faces & Names */
.g5-meet{display:grid;justify-items:center;gap:8px;text-align:center}
.g5-meet .g5-face{width:min(220px,58vw)}
.g5-meet h3{font-size:clamp(2rem,8vw,2.6rem)}
.g5-meet p{margin:0;font-size:clamp(1.3rem,5vw,1.55rem);line-height:1.35}
.g5-face{display:block;border-radius:50%;box-shadow:0 0 0 5px #fff,0 8px 16px rgba(0,0,0,.28);overflow:hidden}
.g5-face svg{display:block;width:100%;height:auto}
.g5-fgrid{display:grid;grid-template-columns:repeat(var(--cols),1fr);gap:14px;max-width:calc(var(--cols) * 160px);margin:0 auto;width:100%}
.g5-fc{border:0;background:var(--card);border-radius:22px;padding:10px 8px 8px;display:grid;justify-items:center;gap:6px;cursor:pointer;color:var(--ink);
  box-shadow:0 6px 0 var(--card-edge),0 10px 16px rgba(0,0,0,.25);transition:transform .15s}
.g5-fc .g5-face{width:100%;max-width:120px}
.g5-fc .g5-fl{font:600 1.25rem var(--display);min-height:1.4em}
.g5-fc.g5-sel{transform:translateY(-6px);box-shadow:0 0 0 5px var(--sun),0 6px 0 var(--card-edge),0 12px 18px rgba(0,0,0,.3)}
.g5-fc.g5-ok{background:var(--good-bg);box-shadow:0 6px 0 var(--leaf-d);cursor:default}
.g5-fc.g5-glow{animation:g5-glowk 1s infinite}
.g5-fsum{font-size:1.15rem!important;line-height:1.2}
.g5-names{display:flex;flex-wrap:wrap;justify-content:center;gap:12px}
.g5-names .btn{font-size:1.35rem;min-width:110px}
.g5-names .btn.g5-sel{--c:var(--sun);--d:var(--sun-d);transform:translateY(-4px);outline:4px solid #fff;outline-offset:3px}

/* Quiz Night */
.g5-qcats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;max-width:560px;margin:0 auto}
.g5-qcat{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:96px;padding:8px 4px;border-radius:20px;cursor:pointer;
  font:600 1.1rem/1.1 var(--display);text-align:center}
.g5-qcat span{font-size:2.3rem;line-height:1}
.g5-qtag{display:block;font:600 1.15rem var(--display);color:var(--ink-soft);margin-bottom:6px}
`);

  /* =========================================================
     1. FAMOUS PLACES
     ========================================================= */
  const GND = (y, c) => `<rect x="0" y="${y}" width="200" height="${150 - y}" fill="${c}"/>`;
  const WAT = y => `<rect x="0" y="${y}" width="200" height="${150 - y}" fill="#3C8FD6"/><path d="M12 ${y + 9}q8-4 16 0t16 0M70 ${y + 17}q8-4 16 0t16 0M138 ${y + 10}q8-4 16 0t16 0" stroke="#9FD3FF" stroke-width="2" fill="none"/>`;
  const CLD = (x, y) => `<g fill="#fff" opacity=".92"><ellipse cx="${x}" cy="${y}" rx="17" ry="7"/><ellipse cx="${x + 9}" cy="${y - 5}" rx="10" ry="7"/></g>`;
  const arches = (x0, x1, y, h, w, gap, col) => { let s = ''; for (let x = x0; x + w <= x1; x += w + gap) s += `M${x} ${y + h}V${y + w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0V${y + h}Z`; return `<path d="${s}" fill="${col}"/>`; };
  const onion = (cx, by, w, h, col) => { const d = `M${cx - w * .3} ${by}C${cx - w * .75} ${by - h * .25} ${cx - w * .55} ${by - h * .6} ${cx} ${by - h}C${cx + w * .55} ${by - h * .6} ${cx + w * .75} ${by - h * .25} ${cx + w * .3} ${by}Z`; return `<path d="${d}" fill="${col}"/><path d="${d}" fill="none" stroke="#fff" stroke-width="1.4" stroke-dasharray="3 3" opacity=".8"/>`; };
  const mill = (cx, base, s) => {
    const hub = base - 56 * s; let sails = '';
    [20, 110, 200, 290].forEach(a => { sails += `<rect x="${cx - 3.5 * s}" y="${hub - 46 * s}" width="${7 * s}" height="${44 * s}" fill="#F1E8D4" stroke="#6B4F33" stroke-width="1.2" transform="rotate(${a} ${cx} ${hub})"/>`; });
    return `<path d="M${cx - 14 * s} ${base}L${cx + 14 * s} ${base}L${cx + 8 * s} ${hub}L${cx - 8 * s} ${hub}Z" fill="#7A5A3A"/><path d="M${cx - 10 * s} ${hub + 2 * s}Q${cx} ${hub - 14 * s} ${cx + 10 * s} ${hub + 2 * s}Z" fill="#4E3B28"/><rect x="${cx - 4 * s}" y="${base - 14 * s}" width="${8 * s}" height="${14 * s}" fill="#3B2A1A"/>${sails}<circle cx="${cx}" cy="${hub}" r="${3 * s}" fill="#3B2A1A"/>`;
  };
  const GG = (() => {
    let s = '';
    for (let x = 60; x <= 140; x += 8) { const t = (x - 52) / 96, y = (1 - t) * (1 - t) * 30 + 2 * t * (1 - t) * 100 + t * t * 30; s += `M${x} ${y.toFixed(1)}V95`; }
    for (let x = 8; x <= 44; x += 9) { const t = x / 52, y = (1 - t) * (1 - t) * 84 + 2 * t * (1 - t) * 72 + t * t * 30; s += `M${x} ${y.toFixed(1)}V95M${200 - x} ${y.toFixed(1)}V95`; }
    return s;
  })();
  const PISA = (() => { let s = ''; for (let y = 50; y < 130; y += 16) for (let x = 86; x <= 114; x += 7) s += `M${x} ${y + 3}V${y + 13}`; return s; })();
  const TULIPS = (() => { let s = ''; for (let x = 6; x < 200; x += 9) s += `<circle cx="${x}" cy="${143 + (x % 2) * 2}" r="3.4" fill="${['#F0563C', '#FFC234', '#F25A95'][(x / 9 | 0) % 3]}"/>`; return s; })();

  const ART = {
    bigben: CLD(40, 30) + GND(134, '#7BC67E') +
      `<rect x="16" y="100" width="70" height="34" fill="#D9B26F"/><rect x="20" y="90" width="7" height="12" fill="#D9B26F"/><rect x="62" y="90" width="7" height="12" fill="#D9B26F"/>` +
      `<path d="M24 108v14M32 108v14M40 108v14M48 108v14M56 108v14M64 108v14M72 108v14" stroke="#B08A4C" stroke-width="3.5"/>` +
      `<rect x="86" y="48" width="28" height="86" fill="#DDB774"/><path d="M93 86V134M100 86V134M107 86V134" stroke="#B8914F" stroke-width="1.6"/>` +
      `<rect x="82" y="44" width="36" height="40" fill="#E6C383"/><circle cx="100" cy="64" r="13" fill="#FFF8E1" stroke="#6B5126" stroke-width="2.5"/>` +
      `<path d="M100 64V55M100 64l6 4" stroke="#2B2B2B" stroke-width="2.4" stroke-linecap="round"/><path d="M84 44h32l-5-12h-22z" fill="#C99B55"/>` +
      `<path d="M89 32h22l-11-26z" fill="#4F5B66"/><path d="M100 7V0" stroke="#4F5B66" stroke-width="2"/>`,
    eiffel: CLD(152, 30) + GND(136, '#7BC67E') +
      `<path d="M97 6h6l4 42 8 40 26 48h-20q-21-30-42 0H59l26-48 8-40z" fill="#9C6B43"/>` +
      `<path d="M95 52l11 32M105 52l-11 32M98 14l4 30M102 14l-4 30" stroke="#C49A6C" stroke-width="1.5"/>` +
      `<rect x="89" y="46" width="22" height="5" rx="1" fill="#7A4F2E"/><rect x="80" y="86" width="40" height="6" rx="1" fill="#7A4F2E"/><path d="M100 0v7" stroke="#9C6B43" stroke-width="2"/>`,
    pyramids: `<circle cx="162" cy="30" r="14" fill="#FFC234"/>` + GND(124, '#E8C27A') +
      `<path d="M6 128L42 84L78 128z" fill="#D9AE60"/><path d="M42 84L78 128H56z" fill="#BE9248"/>` +
      `<path d="M128 128L162 90L196 128z" fill="#D9AE60"/><path d="M162 90L196 128H176z" fill="#BE9248"/>` +
      `<path d="M42 132L100 44L158 132z" fill="#E2B76A"/><path d="M100 44L158 132H116z" fill="#C49548"/>` +
      `<path d="M62 102H136M80 74H118" stroke="#CDA45A" stroke-width="1.4"/>` + GND(130, '#E8C27A'),
    opera: CLD(40, 28) + `<rect x="18" y="104" width="168" height="18" fill="#E8D7B5"/>` +
      `<g fill="#FFFFFF" stroke="#B9C4CF" stroke-width="2" stroke-linejoin="round"><path d="M34 106Q42 64 80 50Q66 80 70 106Z"/><path d="M66 106Q78 52 120 38Q102 74 106 106Z"/><path d="M102 106Q116 64 152 56Q138 84 140 106Z"/><path d="M136 106Q148 80 174 76Q164 92 168 106Z"/></g>` +
      `<path d="M52 104Q58 76 78 54M86 104Q94 66 116 42M120 104Q128 76 148 60" stroke="#D5DCE3" stroke-width="1.5" fill="none"/>` + WAT(120),
    pisa: CLD(40, 34) + GND(132, '#7BC67E') +
      `<g transform="rotate(7 100 132)"><rect x="80" y="34" width="40" height="99" fill="#F5EFE0" stroke="#C9BD9E" stroke-width="2"/><rect x="85" y="20" width="30" height="15" fill="#F5EFE0" stroke="#C9BD9E" stroke-width="2"/>` +
      `<path d="M80 50H120M80 66H120M80 82H120M80 98H120M80 114H120" stroke="#C9BD9E" stroke-width="2"/><path d="${PISA}" stroke="#D2C5A6" stroke-width="2.4" stroke-linecap="round"/>` +
      `<path d="M89 24v8M95 24v8M101 24v8M107 24v8M113 24v8" stroke="#D2C5A6" stroke-width="2"/></g>`,
    goldengate: CLD(160, 24) + `<path d="M0 114Q18 84 44 96Q60 104 66 116H0z" fill="#5E9E58"/><path d="M150 116Q170 86 200 92V116z" fill="#5E9E58"/>` + WAT(114) +
      `<path d="${GG}" stroke="#D9472B" stroke-width="1.2"/><path d="M0 84Q26 72 52 30Q100 100 148 30Q174 72 200 84" stroke="#C9402A" stroke-width="3" fill="none"/>` +
      `<rect x="48" y="26" width="9" height="94" fill="#D9472B"/><rect x="143" y="26" width="9" height="94" fill="#D9472B"/>` +
      `<path d="M46 40h13M46 58h13M46 76h13M141 40h13M141 58h13M141 76h13" stroke="#A9361F" stroke-width="4"/><rect x="0" y="94" width="200" height="7" fill="#C23E24"/>`,
    towerbridge: CLD(100, 22) + WAT(118) + `<path d="M0 74Q24 92 40 62M160 62Q176 92 200 74" stroke="#4A8BC9" stroke-width="3" fill="none"/>` +
      `<rect x="0" y="94" width="200" height="7" fill="#4A8BC9"/><rect x="40" y="44" width="30" height="78" fill="#D3C6A3"/><rect x="130" y="44" width="30" height="78" fill="#D3C6A3"/>` +
      `<path d="M38 44H72L55 18ZM128 44H162L145 18Z" fill="#5E6E7E"/><path d="M37 44h8l-4-13zM65 44h8l-4-13zM127 44h8l-4-13zM155 44h8l-4-13z" fill="#4C5A68"/>` +
      `<rect x="70" y="50" width="60" height="7" fill="#4A8BC9"/><rect x="70" y="61" width="60" height="3" fill="#4A8BC9"/>` +
      `<path d="M50 56v10M60 56v10M140 56v10M150 56v10M55 74v12M145 74v12" stroke="#7E7356" stroke-width="3" stroke-linecap="round"/>`,
    taj: GND(132, '#7BC67E') + `<rect x="92" y="132" width="16" height="18" fill="#6CC0F0"/><rect x="24" y="118" width="152" height="14" fill="#EDE6D6"/>` +
      `<rect x="30" y="62" width="7" height="56" fill="#FBF8F1" stroke="#D5CFC0"/><rect x="163" y="62" width="7" height="56" fill="#FBF8F1" stroke="#D5CFC0"/><path d="M28 62h11l-5.5-9zM161 62h11l-5.5-9z" fill="#E6DECC"/>` +
      `<rect x="60" y="72" width="80" height="46" fill="#FBF8F1" stroke="#D5CFC0" stroke-width="1.5"/><path d="M88 118V96Q100 80 112 96V118Z" fill="#D9D2C2"/>` +
      `<path d="M68 112v-10q5-7 10 0v10zM122 112v-10q5-7 10 0v10z" fill="#E3DCCB"/><rect x="82" y="64" width="36" height="9" fill="#F4EFE3"/>` +
      `<path d="M80 66Q74 40 100 28Q126 40 120 66Z" fill="#FBF8F1" stroke="#D5CFC0" stroke-width="1.5"/><path d="M100 28V15" stroke="#C9A64A" stroke-width="2"/>` +
      `<path d="M64 72q0-12 9-14q9 2 9 14zM118 72q0-12 9-14q9 2 9 14z" fill="#F4EFE3" stroke="#D5CFC0"/>`,
    colosseum: CLD(160, 24) + GND(126, '#7BC67E') +
      `<path d="M14 128V50Q60 40 112 38L132 40V54L150 58V76L170 80V96L186 100V128Z" fill="#DDAA6A"/>` +
      arches(20, 182, 106, 18, 10, 5, '#8C5A2E') + arches(20, 166, 82, 15, 10, 5, '#9A6638') + arches(20, 128, 60, 14, 10, 5, '#A87443') +
      `<path d="M14 102H186M14 79H170M14 57H130" stroke="#B9844A" stroke-width="2.5"/>`,
    greatwall: CLD(40, 26) + `<path d="M0 110Q30 70 70 88T140 62T200 70V150H0Z" fill="#6FAE5E"/><path d="M0 134Q40 104 80 116T150 96T200 104V150H0Z" fill="#4E9150"/>` +
      `<path d="M-4 120Q36 86 72 98T142 72T204 76" stroke="#BFA06E" stroke-width="11" fill="none" stroke-linecap="round"/>` +
      `<path d="M-4 113Q36 79 72 91T142 65T204 69" stroke="#BFA06E" stroke-width="5" stroke-dasharray="5 4" fill="none"/>` +
      `<rect x="62" y="80" width="18" height="22" fill="#CDAE7C"/><rect x="132" y="54" width="18" height="22" fill="#CDAE7C"/>` +
      `<path d="M62 80v-5h4v5h5v-5h4v5h5v-5M132 54v-5h4v5h5v-5h4v5h5v-5" stroke="#CDAE7C" stroke-width="2" fill="none"/>` +
      `<rect x="68" y="90" width="6" height="12" fill="#6B5636"/><rect x="138" y="64" width="6" height="12" fill="#6B5636"/>`,
    stonehenge: CLD(150, 26) + GND(112, '#7BC67E') + `<ellipse cx="100" cy="128" rx="92" ry="10" fill="#6AB46D"/>` +
      `<g fill="#9EA4AA" stroke="#7D848B" stroke-width="2"><rect x="30" y="66" width="14" height="48"/><rect x="56" y="66" width="14" height="48"/><rect x="26" y="58" width="48" height="10"/>` +
      `<rect x="84" y="60" width="16" height="54"/><rect x="108" y="60" width="16" height="54"/><rect x="80" y="52" width="48" height="10"/>` +
      `<rect x="140" y="70" width="14" height="44"/><rect x="164" y="70" width="14" height="44"/><rect x="136" y="62" width="46" height="9"/><rect x="8" y="114" width="30" height="9"/></g>`,
    arc: CLD(40, 22) + GND(130, '#C9C2B4') + `<circle cx="20" cy="120" r="11" fill="#5E9E58"/><circle cx="180" cy="120" r="11" fill="#5E9E58"/>` +
      `<path d="M52 132V40H148V132H120V88Q100 64 80 88V132Z" fill="#E7D6AD"/><rect x="48" y="32" width="104" height="16" fill="#D7C293"/><rect x="52" y="52" width="96" height="4" fill="#D7C293"/>` +
      `<rect x="58" y="62" width="16" height="22" fill="#D3BE8E"/><rect x="126" y="62" width="16" height="22" fill="#D3BE8E"/><path d="M56 40h88" stroke="#C4AD7A" stroke-width="2"/>`,
    stbasil: CLD(170, 24) + GND(132, '#C9C2B4') +
      `<rect x="54" y="76" width="16" height="26" fill="#D45E4A"/><rect x="130" y="76" width="16" height="26" fill="#D45E4A"/><rect x="72" y="60" width="14" height="42" fill="#E07055"/><rect x="114" y="60" width="14" height="42" fill="#E07055"/>` +
      `<rect x="92" y="44" width="16" height="58" fill="#D45E4A"/><path d="M90 46h20L100 16z" fill="#5BA35B"/>` +
      onion(62, 78, 22, 26, '#3E8ED0') + onion(138, 78, 22, 26, '#F2C23A') + onion(79, 62, 19, 23, '#3CB371') + onion(121, 62, 19, 23, '#E8673A') + onion(100, 18, 9, 11, '#F2C23A') +
      `<rect x="34" y="98" width="132" height="34" fill="#C2483A"/>` + arches(42, 160, 108, 22, 10, 6, '#F3E9D8'),
    redeemer: CLD(40, 40) + CLD(160, 70) + `<path d="M0 150L52 86Q76 54 100 60Q124 54 148 86L200 150Z" fill="#5E8F4F"/><path d="M0 134Q40 126 80 134T200 130V150H0z" fill="#3C8FD6"/>` +
      `<rect x="94" y="52" width="12" height="9" fill="#D9D3C7"/><path d="M95 54L97 28H103L105 54Z" fill="#F2EEE6"/><rect x="70" y="27" width="60" height="5" rx="2.5" fill="#F2EEE6"/><circle cx="100" cy="22" r="4.5" fill="#F2EEE6"/>`,
    windmills: CLD(150, 22) + GND(118, '#7BC67E') + `<rect x="0" y="126" width="200" height="10" fill="#3C8FD6"/>` + TULIPS + mill(160, 114, .6) + mill(70, 118, 1)
  };

  const PLACES = [
    { id: 'eiffel', name: 'The Eiffel Tower', tier: 1, reg: 'eu', where: 'Paris, France', fact: 'It was built for a great fair in 1889, and was once the tallest building in the world.' },
    { id: 'bigben', name: 'Big Ben', tier: 1, reg: 'uk', where: 'London, England', fact: 'Big Ben is really the name of the great bell inside the clock tower.' },
    { id: 'pyramids', name: 'The Pyramids', tier: 1, reg: 'af', where: 'Giza, Egypt', fact: 'They were built about 4,500 years ago for the kings of Ancient Egypt.', sky: '#FFE2A6,#FFF6DD' },
    { id: 'liberty', name: 'The Statue of Liberty', tier: 1, reg: 'am', emo: '🗽', where: 'New York, USA', fact: 'She was a gift from France, and has welcomed ships to New York since 1886.' },
    { id: 'taj', name: 'The Taj Mahal', tier: 1, reg: 'as', where: 'Agra, India', fact: 'An emperor built it from white marble in memory of his beloved wife.', sky: '#FFD9C2,#FFF3E8' },
    { id: 'pisa', name: 'The Leaning Tower of Pisa', tier: 1, reg: 'eu', where: 'Pisa, Italy', fact: 'It started to lean while it was still being built, over 800 years ago.' },
    { id: 'opera', name: 'Sydney Opera House', tier: 1, reg: 'oc', where: 'Sydney, Australia', fact: 'Its roofs look like sails on the harbour. It opened in 1973.' },
    { id: 'goldengate', name: 'The Golden Gate Bridge', tier: 1, reg: 'am', where: 'San Francisco, USA', fact: 'Its famous colour is called “International Orange”. It opened in 1937.' },
    { id: 'towerbridge', name: 'Tower Bridge', tier: 2, reg: 'uk', where: 'London, England', fact: 'The road in the middle lifts up to let tall ships sail along the Thames.' },
    { id: 'colosseum', name: 'The Colosseum', tier: 2, reg: 'eu', where: 'Rome, Italy', fact: 'This great stone arena is nearly 2,000 years old.' },
    { id: 'greatwall', name: 'The Great Wall of China', tier: 2, reg: 'as', where: 'China', fact: 'It winds for thousands of miles over hills and mountains.' },
    { id: 'stonehenge', name: 'Stonehenge', tier: 2, reg: 'uk', where: 'Wiltshire, England', fact: 'Its giant stones were raised about 4,500 years ago. Nobody knows quite how!' },
    { id: 'fuji', name: 'Mount Fuji', tier: 2, reg: 'as', emo: '🗻', where: 'Japan', fact: 'It is the highest mountain in Japan, and is often capped with snow.' },
    { id: 'londoneye', name: 'The London Eye', tier: 2, reg: 'uk', emo: '🎡', where: 'London, England', fact: 'This giant wheel beside the River Thames opened in the year 2000.' },
    { id: 'redeemer', name: 'Christ the Redeemer', tier: 2, reg: 'am', where: 'Rio de Janeiro, Brazil', fact: 'This huge statue stands on a mountain top, with arms open wide over the city.' },
    { id: 'arc', name: 'The Arc de Triomphe', tier: 3, reg: 'eu', where: 'Paris, France', fact: 'This grand arch stands at the top of the Champs-Élysées.' },
    { id: 'stbasil', name: 'St Basil’s Cathedral', tier: 3, reg: 'eu', where: 'Moscow, Russia', fact: 'Its colourful onion domes look like swirls of sweets.' },
    { id: 'windmills', name: 'The Dutch Windmills', tier: 3, reg: 'eu', where: 'Kinderdijk, the Netherlands', fact: 'Nineteen old windmills here once helped to pump water off the land.' },
    { id: 'moai', name: 'The Easter Island Statues', tier: 3, reg: 'oc', emo: '🗿', where: 'Easter Island, in the Pacific', fact: 'Hundreds of these giant stone figures, called moai, stand on the island.' },
    { id: 'tokyotower', name: 'Tokyo Tower', tier: 3, reg: 'as', emo: '🗼', not: ['eiffel'], where: 'Tokyo, Japan', fact: 'Painted orange and white, it was inspired by the Eiffel Tower.' },
    { id: 'torii', name: 'A Japanese Shrine Gate', tier: 3, reg: 'as', emo: '⛩️', where: 'Japan', fact: 'Gates like this, called torii, mark the way into a Shinto shrine.' }
  ];

  function startPlaces(L0, api) {
    const L = lvl(L0), done = finisher(api);
    const total = L <= 2 ? 5 : L <= 5 ? 6 : 8, maxTier = L <= 2 ? 1 : L <= 5 ? 2 : 3;
    let order = shuffle(PLACES.filter(p => p.tier <= maxTier));
    if (L >= 6) order = order.map(p => [p, p.tier + Math.random() * 2.2]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
    const qs = shuffle(order.slice(0, total));
    let i = 0, mistakes = 0;
    function show() {
      api.rounds(total, i); api.stage.innerHTML = '';
      const p = qs[i], clash = o => (p.not || []).includes(o.id) || (o.not || []).includes(p.id);
      const others = PLACES.filter(o => o !== p && !clash(o) && (L >= 3 || o.tier <= 2));
      let ds = L >= 6 ? shuffle(others.filter(o => o.reg === p.reg)).slice(0, 2) : [];
      const rest = shuffle(others.filter(o => !ds.includes(o)));
      while (ds.length < 2) ds.push(rest.shift());
      const opts = shuffle([p, ...ds]);
      const wrap = el('div', 'g5-wrap'), card = el('div', 'g5-card');
      const pic = el('div', 'g5-plpic', p.emo ? `<span class="g5-plemo">${p.emo}</span>` : `<svg viewBox="0 0 200 150" aria-hidden="true">${ART[p.id]}</svg>`);
      const sk = (p.sky || '#BFE6FF,#EEF9FF').split(','); pic.style.setProperty('--s1', sk[0]); pic.style.setProperty('--s2', sk[1]);
      pic.setAttribute('role', 'img'); pic.setAttribute('aria-label', 'A famous place');
      card.append(pic);
      const box = el('div', 'g5-plopts');
      let solved = false;
      opts.forEach(o => {
        const b = mkBtn(esc(o.name), 'c-card g5-plbtn', () => {
          if (solved) return;
          if (o === p) {
            solved = true; sfx.good(); i++; api.rounds(total, i);
            toast(cheer());
            api.hint(`Yes! It’s ${p.name}.`);
            box.innerHTML = '';
            const f = el('div', 'g5-card g5-fact', `<h3>✓ ${esc(p.name)}</h3><span class="g5-where">📍 ${esc(p.where)}</span><p>${esc(p.fact)}</p>`);
            const nx = mkBtn(i === total ? 'See my stars ★' : 'Next place →', 'c-leaf g5-plbtn', () => {
              sfx.tap(); if (i === total) { nx.disabled = true; done(starsFor(mistakes, 1, 3)); } else show();
            });
            box.append(f, nx);
          } else {
            mistakes++; b.classList.add('g5-nope'); sfx.soft(); wob(b);
            api.hint('Not that one. Have another look at the picture.');
          }
        });
        if (o === p) b.dataset.ok = '1';
        box.append(b);
      });
      wrap.append(card, box); api.stage.append(wrap);
      api.hint('What is this famous place? Tap its name.');
    }
    show();
  }

  /* =========================================================
     2. DOT TO DOT
     ========================================================= */
  const starPts = (() => { const a = []; for (let k = 0; k < 10; k++) { const r = k % 2 ? 19 : 44, t = -Math.PI / 2 + k * Math.PI / 5; a.push([50 + r * Math.cos(t), 54 + r * Math.sin(t)]); } return a; })();
  const flowerPts = (lo) => {
    const a = [];
    for (let k = 0; k < 5; k++) {
      const t = -Math.PI / 2 + k * 2 * Math.PI / 5, d = Math.PI / 15;
      if (lo) a.push([50 + 34 * Math.cos(t), 40 + 34 * Math.sin(t)]);
      else { a.push([50 + 34 * Math.cos(t - d), 40 + 34 * Math.sin(t - d)]); a.push([50 + 34 * Math.cos(t + d), 40 + 34 * Math.sin(t + d)]); }
      const u = t + Math.PI / 5; a.push([50 + 13 * Math.cos(u), 40 + 13 * Math.sin(u)]);
    }
    return a;
  };
  const DOTS = [
    { id: 'house', name: 'a house', emo: '🏠', col: ['#FF8A65', '#FFC234', '#F25A95'],
      pts: [[20, 90], [20, 50], [50, 18], [58, 26], [58, 14], [68, 14], [68, 36], [80, 48], [80, 90]], lo: [[20, 90], [20, 50], [50, 18], [80, 48], [80, 90]],
      decor: '<rect x="44" y="66" width="12" height="24" rx="2" fill="#8B5A3C"/><rect x="26" y="56" width="12" height="12" fill="#CFEFFF" stroke="#fff" stroke-width="2"/><rect x="62" y="56" width="12" height="12" fill="#CFEFFF" stroke="#fff" stroke-width="2"/>' },
    { id: 'car', name: 'a car', emo: '🚗', col: ['#45AEFF', '#F0563C', '#3CC46B'],
      pts: [[8, 74], [8, 58], [22, 54], [34, 38], [66, 38], [78, 54], [92, 58], [92, 74]],
      decor: '<path d="M37 42h12v12H29zM53 42h11l9 12H53z" fill="#CFEFFF"/><circle cx="28" cy="75" r="9" fill="#2B3A44"/><circle cx="72" cy="75" r="9" fill="#2B3A44"/><circle cx="28" cy="75" r="3.5" fill="#ccc"/><circle cx="72" cy="75" r="3.5" fill="#ccc"/>' },
    { id: 'kite', name: 'a kite', emo: '🪁', col: ['#F25A95', '#A98BFF', '#FFC234'],
      pts: [[50, 8], [80, 40], [50, 80], [20, 40]],
      decor: '<path d="M50 8V80M20 40H80" stroke="#fff" stroke-width="2"/><path d="M50 80q-6 6 0 10t0 8" stroke="#2B3A44" stroke-width="1.5" fill="none"/><path d="M46 88l4 2-4 2zM54 88l-4 2 4 2z" fill="#F0563C"/>' },
    { id: 'fish', name: 'a fish', emo: '🐟', col: ['#FF9A3C', '#45AEFF', '#FFC234'],
      pts: [[8, 50], [22, 36], [42, 28], [60, 32], [74, 44], [92, 28], [88, 50], [92, 72], [74, 56], [60, 68], [42, 72], [22, 64]],
      lo: [[8, 50], [40, 28], [74, 46], [92, 28], [92, 72], [74, 54], [40, 72]],
      decor: '<circle cx="24" cy="46" r="4.5" fill="#fff"/><circle cx="25" cy="46" r="2.2" fill="#2B3A44"/><path d="M44 40q6 10 0 20M54 40q6 10 0 20" stroke="#fff" stroke-width="2" fill="none" opacity=".8"/>' },
    { id: 'star', name: 'a star', emo: '⭐', col: ['#FFC234', '#FF9A3C'], pts: starPts,
      decor: '<circle cx="42" cy="52" r="2.5" fill="#2B3A44"/><circle cx="58" cy="52" r="2.5" fill="#2B3A44"/><path d="M44 60q6 5 12 0" stroke="#2B3A44" stroke-width="2" fill="none"/>' },
    { id: 'heart', name: 'a heart', emo: '❤️', col: ['#F0563C', '#F25A95'],
      pts: [[50, 88], [30, 70], [14, 52], [10, 36], [16, 22], [30, 15], [42, 18], [50, 30], [58, 18], [70, 15], [84, 22], [90, 36], [86, 52], [70, 70]],
      lo: [[50, 88], [12, 48], [14, 24], [32, 14], [50, 30], [68, 14], [86, 24], [88, 48]],
      decor: '<ellipse cx="30" cy="32" rx="6" ry="4" fill="#fff" opacity=".6"/>' },
    { id: 'cat', name: 'a cat', emo: '🐱', col: ['#FF9A3C', '#A98BFF', '#9AA4AE'],
      pts: [[50, 88], [30, 84], [16, 70], [14, 52], [20, 36], [16, 10], [38, 24], [50, 22], [62, 24], [84, 10], [80, 36], [86, 52], [84, 70], [70, 84]],
      lo: [[50, 88], [18, 74], [16, 40], [18, 10], [40, 24], [60, 24], [82, 10], [84, 40], [82, 74]],
      decor: '<ellipse cx="38" cy="50" rx="5" ry="6" fill="#B6F09A"/><ellipse cx="62" cy="50" rx="5" ry="6" fill="#B6F09A"/><ellipse cx="38" cy="50" rx="1.6" ry="5" fill="#2B3A44"/><ellipse cx="62" cy="50" rx="1.6" ry="5" fill="#2B3A44"/><path d="M46 60h8l-4 4z" fill="#F25A95"/><path d="M50 64q-5 6-9 2M50 64q5 6 9 2M30 62H10M30 66l-18 5M70 62h20M70 66l18 5" stroke="#2B3A44" stroke-width="1.4" fill="none"/>' },
    { id: 'boat', name: 'a boat', emo: '⛵', col: ['#F0563C', '#45AEFF', '#3CC46B'],
      pts: [[22, 84], [8, 66], [46, 66], [46, 10], [84, 62], [92, 66], [78, 84]],
      decor: '<path d="M46 10V66" stroke="#5A3A22" stroke-width="2.5"/><path d="M50 22L76 60H50z" fill="#fff" opacity=".85"/><circle cx="30" cy="74" r="3.5" fill="#fff"/><circle cx="50" cy="74" r="3.5" fill="#fff"/><circle cx="70" cy="74" r="3.5" fill="#fff"/><path d="M2 92q8-5 16 0t16 0 16 0 16 0 16 0 16 0" stroke="#45AEFF" stroke-width="2.5" fill="none"/>' },
    { id: 'tree', name: 'a fir tree', emo: '🌲', col: ['#3CC46B', '#2E9E55'],
      pts: [[44, 92], [44, 76], [16, 76], [34, 56], [24, 56], [40, 36], [32, 36], [50, 10], [68, 36], [60, 36], [76, 56], [66, 56], [84, 76], [56, 76], [56, 92]],
      lo: [[44, 92], [44, 76], [16, 76], [50, 10], [84, 76], [56, 76], [56, 92]],
      decor: '<rect x="44" y="76" width="12" height="16" fill="#8A5A35"/><circle cx="40" cy="48" r="3" fill="#F0563C"/><circle cx="60" cy="62" r="3" fill="#FFC234"/><circle cx="34" cy="68" r="3" fill="#45AEFF"/><circle cx="56" cy="32" r="3" fill="#F25A95"/><path d="M50 4l2 4 4 .5-3 3 1 4-4-2-4 2 1-4-3-3 4-.5z" fill="#FFC234"/>' },
    { id: 'teapot', name: 'a teapot', emo: '🫖', col: ['#45AEFF', '#F25A95', '#A98BFF'],
      pts: [[30, 84], [22, 70], [12, 66], [7, 54], [12, 44], [24, 46], [30, 38], [42, 33], [46, 24], [54, 24], [58, 33], [70, 38], [78, 46], [90, 30], [97, 36], [84, 60], [78, 72], [70, 84]],
      lo: [[30, 84], [22, 70], [8, 54], [24, 46], [44, 32], [56, 32], [78, 46], [92, 30], [84, 62], [70, 84]],
      decor: '<ellipse cx="17" cy="56" rx="5" ry="6" fill="#FFFDF6"/><circle cx="50" cy="20" r="4" fill="#fff" stroke="#2B3A44" stroke-width="1"/><path d="M34 40h32" stroke="#fff" stroke-width="2"/><circle cx="44" cy="60" r="4" fill="#fff"/><circle cx="56" cy="60" r="4" fill="#fff"/><circle cx="50" cy="68" r="4" fill="#fff"/>' },
    { id: 'flower', name: 'a flower', emo: '🌸', col: ['#F25A95', '#A98BFF', '#FF9A3C'], pts: flowerPts(false), lo: flowerPts(true),
      decor: '<path d="M50 56V97" stroke="#2E9E55" stroke-width="4"/><path d="M50 84q14-14 24-6-12 10-24 6z" fill="#3CC46B"/><circle cx="50" cy="40" r="10" fill="#FFC234"/>' },
    { id: 'butterfly', name: 'a butterfly', emo: '🦋', col: ['#A98BFF', '#45AEFF', '#FF9A3C'],
      pts: [[50, 30], [62, 14], [80, 8], [92, 18], [88, 38], [70, 48], [86, 58], [88, 76], [74, 88], [58, 76], [50, 62], [42, 76], [26, 88], [12, 76], [14, 58], [30, 48], [12, 38], [8, 18], [20, 8], [38, 14]],
      lo: [[50, 30], [78, 8], [92, 30], [70, 48], [88, 70], [70, 88], [50, 62], [30, 88], [12, 70], [30, 48], [8, 30], [22, 8]],
      decor: '<ellipse cx="50" cy="48" rx="4" ry="20" fill="#5A3A22"/><path d="M48 30q-6-14-12-16M52 30q6-14 12-16" stroke="#5A3A22" stroke-width="1.5" fill="none"/><circle cx="74" cy="26" r="6" fill="#FFC234"/><circle cx="26" cy="26" r="6" fill="#FFC234"/><circle cx="70" cy="70" r="4" fill="#fff"/><circle cx="30" cy="70" r="4" fill="#fff"/>' },
    { id: 'apple', name: 'an apple', emo: '🍎', col: ['#F0563C', '#3CC46B'],
      pts: [[50, 30], [62, 24], [76, 26], [86, 38], [88, 54], [82, 72], [70, 86], [58, 88], [50, 84], [42, 88], [30, 86], [18, 72], [12, 54], [14, 38], [24, 26], [38, 24]],
      lo: [[50, 30], [76, 24], [88, 48], [76, 80], [50, 84], [24, 80], [12, 48], [24, 24]],
      decor: '<path d="M50 30q0-14 6-20" stroke="#5A3A22" stroke-width="3" fill="none"/><path d="M54 18q12-10 20-4-10 10-20 4z" fill="#3CC46B"/><ellipse cx="30" cy="44" rx="5" ry="8" fill="#fff" opacity=".5"/>' },
    { id: 'mug', name: 'a mug', emo: '☕', col: ['#45AEFF', '#FFC234', '#F25A95'],
      pts: [[22, 28], [70, 28], [70, 38], [82, 38], [90, 50], [84, 64], [70, 68], [68, 84], [24, 84]],
      decor: '<ellipse cx="77" cy="52" rx="5" ry="7" fill="#FFFDF6"/><path d="M36 22q-4-6 0-12M48 22q-4-6 0-12M60 22q-4-6 0-12" stroke="#9AA4AE" stroke-width="2" fill="none"/><path d="M46 66c-8-6-8-14-2-14 2 0 2 2 2 2s0-2 2-2c6 0 6 8-2 14z" fill="#fff"/>' },
    { id: 'umbrella', name: 'an umbrella', emo: '☂️', col: ['#F0563C', '#A98BFF', '#45AEFF'],
      pts: [[8, 54], [14, 36], [28, 22], [50, 14], [72, 22], [86, 36], [92, 54], [78, 48], [64, 54], [50, 48], [36, 54], [22, 48]],
      lo: [[8, 54], [24, 24], [50, 14], [76, 24], [92, 54], [50, 48]],
      decor: '<path d="M50 48V86q0 6-6 6t-6-6" stroke="#5A3A22" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M50 14v-6" stroke="#5A3A22" stroke-width="3"/><path d="M50 16Q40 30 36 54M50 16Q60 30 64 54" stroke="#fff" stroke-width="1.5" fill="none" opacity=".7"/>' }
  ];
  function dotList(shape, n) {
    const base = (shape.lo && n < shape.pts.length) ? shape.lo : shape.pts;
    const a = base.map(p => p.slice());
    while (a.length < n) {
      let bi = 0, bd = -1;
      for (let k = 0; k < a.length; k++) { const p = a[k], q = a[(k + 1) % a.length], d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d > bd) { bd = d; bi = k; } }
      const p = a[bi], q = a[(bi + 1) % a.length];
      a.splice(bi + 1, 0, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]);
    }
    return a;
  }
  function inPoly(x, y, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
  function dotCount(L) { return Math.min(30, 6 + Math.round((L - 1) * 1.5)); }

  function startDots(L0, api) {
    const L = lvl(L0), done = finisher(api), total = 2, n = dotCount(L);
    const okShapes = DOTS.filter(s => (s.lo && n < s.pts.length ? s.lo : s.pts).length <= n);
    let good = okShapes.filter(s => (s.lo && n < s.pts.length ? s.lo : s.pts).length >= n * .45);
    if (good.length < total) good = okShapes;
    const picks = shuffle(good.slice()).slice(0, total);
    let round = 0, mistakes = 0;
    function play() {
      api.rounds(total, round); api.stage.innerHTML = '';
      const sh = picks[round], mirror = Math.random() < .5;
      const mapP = ([x, y]) => [mirror ? 94 - x * .88 : 6 + x * .88, 6 + y * .88];
      let pts = dotList(sh, n).map(mapP);
      const start = randInt(pts.length); pts = pts.slice(start).concat(pts.slice(0, start));
      if (Math.random() < .5) pts = [pts[0]].concat(pts.slice(1).reverse());
      const full = sh.pts.map(mapP), col = pick(sh.col);
      const tf = mirror ? 'translate(94 6) scale(-.88 .88)' : 'translate(6 6) scale(.88)';
      const dr = n > 20 ? 2.8 : n > 12 ? 3.2 : 3.6, fs = n > 20 ? 5 : 6;
      const box = el('div', 'g5-dtbox');
      let dotsSvg = '';
      const placed = [];
      pts.forEach(([x, y], k) => {
        const p = pts[(k - 1 + pts.length) % pts.length], q = pts[(k + 1) % pts.length];
        let tx = q[0] - p[0], ty = q[1] - p[1]; const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
        const off = dr + fs * .6;
        let ox = ty, oy = -tx; if (inPoly(x + ox * off, y + oy * off, pts)) { ox = -ox; oy = -oy; }
        let best = null, bs = -1e9;
        for (let a = 0; a < 16; a++) {
          const t = Math.atan2(oy, ox) + (a % 2 ? 1 : -1) * Math.ceil(a / 2) * Math.PI / 8;
          const cx = Math.max(4, Math.min(96, x + Math.cos(t) * off)), cy = Math.max(4, Math.min(96, y + Math.sin(t) * off));
          let m = 99;
          pts.forEach((q, j) => { if (j !== k) m = Math.min(m, Math.hypot(q[0] - cx, q[1] - cy) - dr); });
          placed.forEach(q => { m = Math.min(m, Math.hypot(q[0] - cx, (q[1] - cy) * 1.4) - fs * .5); });
          const sc = Math.min(m, fs * 1.1) - Math.ceil(a / 2) * .15 - (inPoly(cx, cy, pts) ? .4 : 0);
          if (sc > bs) { bs = sc; best = [cx, cy]; }
        }
        placed.push(best); const [lx, ly] = best;
        dotsSvg += `<g class="g5-dot${k === 0 ? ' g5-first' : ''}" data-k="${k}"><circle class="g5-ring" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${dr + .6}"/><circle class="g5-dc" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${dr}"/><text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" style="font-size:${fs}px">${k + 1}</text></g>`;
      });
      box.innerHTML = `<svg viewBox="0 0 100 100" role="img" aria-label="Numbered dots"><g class="g5-dtfill"><polygon points="${full.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="${col}"/><g transform="${tf}">${sh.decor}</g></g><polyline class="g5-dtline" points=""/>${dotsSvg}</svg>`;
      const wrap = el('div', 'g5-wrap'); wrap.append(box);
      const row = el('div', 'g5-row'); wrap.append(row);
      api.stage.append(wrap);
      const svg = box.querySelector('svg'), line = box.querySelector('.g5-dtline'), dotEls = [...box.querySelectorAll('.g5-dot')];
      let next = 0, token = 0, finished = false;
      const pause = L <= 2 ? 2500 : 4500;
      const say = () => api.hint(next === 0 ? 'Tap dot number 1 to start. Then tap the dots in order: 1, 2, 3…' : `Lovely. Now find number ${next + 1}.`);
      const helpBtn = mkBtn('💡 Show me the next dot', 'c-card', () => { sfx.tap(); glow(); });
      row.append(helpBtn);
      function glow() { dotEls.forEach(d => d.classList.remove('g5-glow')); if (!finished) dotEls[next].classList.add('g5-glow'); }
      function arm() { const t = ++token; api.later(() => { if (t === token && !finished) glow(); }, pause); }
      say(); arm();
      svg.addEventListener('click', e => {
        if (finished) return;
        const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height * 100;
        const dn = Math.hypot(pts[next][0] - x, pts[next][1] - y);
        let near = -1, nd = 99;
        pts.forEach((p, k) => { const d = Math.hypot(p[0] - x, p[1] - y); if (d < nd) { nd = d; near = k; } });
        if (dn < 9 || (near === next && dn < 14)) return hit();
        if (nd < 7 && near > next) { mistakes++; sfx.soft(); api.hint(`That’s number ${near + 1}. Look for number ${next + 1}.`); glow(); arm(); }
      });
      function hit() {
        const d = dotEls[next]; d.classList.add('g5-hit'); d.classList.remove('g5-glow');
        chime(Math.min(next, 24), 440);
        next++;
        line.setAttribute('points', pts.slice(0, next).map(p => p.map(v => v.toFixed(1)).join(',')).join(' '));
        dotEls.forEach(x => x.classList.remove('g5-glow'));
        if (next === pts.length) return finish();
        say(); arm();
      }
      function finish() {
        finished = true; token++;
        line.setAttribute('points', pts.concat([pts[0]]).map(p => p.map(v => v.toFixed(1)).join(',')).join(' '));
        api.later(() => {
          box.classList.add('g5-dtdone'); sfx.good(); [0, 1, 2].forEach(k => tone(660 + k * 130, .18, 'triangle', .11, k * .1));
          box.append(el('div', 'g5-dtname', `${sh.emo} It’s ${sh.name}!`));
          round++; api.rounds(total, round);
          api.hint(`It’s ${sh.name}! ${cheer()}`);
          row.innerHTML = '';
          row.append(mkBtn(round === total ? 'See my stars ★' : 'Next picture →', 'c-leaf', function () { sfx.tap(); if (round === total) { this.disabled = true; done(starsFor(mistakes, 1, 3)); } else play(); }));
        }, 350);
      }
    }
    play();
  }

  /* =========================================================
     3. COLOUR BY NUMBER
     ========================================================= */
  const band = (r1, r2) => `M${50 - r1} 84A${r1} ${r1} 0 0 1 ${50 + r1} 84H${50 + r2}A${r2} ${r2} 0 0 0 ${50 - r2} 84Z`;
  const PET = [0, 1, 2, 3, 4].map(k => { const t = -Math.PI / 2 + k * 2 * Math.PI / 5; return [50 + 15 * Math.cos(t), 34 + 15 * Math.sin(t), 50 + 19 * Math.cos(t), 34 + 19 * Math.sin(t)]; });
  const CN = [
    { name: 'a sailing boat', lv: 1, pal: [['Sky blue', '#8FD3FF'], ['Sea blue', '#2F7FD0'], ['Red', '#F0563C'], ['Yellow', '#FFC234']],
      regs: [[1, 'M0 0H100V64H0Z', [[12, 40]]], [4, circ(82, 18, 11), [[82, 18]]], [2, 'M0 64Q12 59 25 64T50 64T75 64T100 64V100H0Z', [[14, 90], [86, 90]]],
        [3, 'M16 66H84L73 84H27Z', [[50, 75]]], [4, 'M47 12V60H20Z', [[39, 48]]], [3, 'M52 20V60H76Z', [[60, 50]]]],
      top: '<path d="M49.5 9V66" stroke="#5A3A22" stroke-width="1.6"/>' },
    { name: 'a little house', lv: 1, pal: [['Sky blue', '#8FD3FF'], ['Green', '#3CC46B'], ['Yellow', '#FFD45A'], ['Red', '#E8503A'], ['Brown', '#9A6440']],
      regs: [[1, 'M0 0H100V72H0Z', [[12, 30]]], [3, circ(84, 16, 9), [[84, 16]]], [2, 'M0 72H100V100H0Z', [[12, 90], [88, 90]]], [4, 'M14 48L50 20L86 48Z', [[50, 39]]],
        [3, 'M22 48H78V88H22Z', [[32, 77]]], [5, 'M43 62H57V88H43Z', [[50, 76]]], [1, 'M27 52H40V64H27Z', [[33.5, 58]]], [1, 'M60 52H73V64H60Z', [[66.5, 58]]]] },
    { name: 'a flower pot', lv: 1, pal: [['Pink', '#F77FB0'], ['Yellow', '#FFC234'], ['Green', '#3CC46B'], ['Orange', '#F08A3C']], bg: '#E9F7F2',
      regs: [[3, 'M47 42H53V76H47Z M49 66Q34 52 24 60Q36 72 49 69Z M51 60Q66 46 76 54Q64 64 51 63Z', [[34, 62], [66, 56]]]]
        .concat(PET.map(p => [1, circ(p[0], p[1], 10), [[p[2], p[3]]]]))
        .concat([[2, circ(50, 34, 8), [[50, 34]]], [4, 'M28 74H72L65 97H35Z', [[50, 85]]]]) },
    { name: 'a happy cat', lv: 1, pal: [['Pale blue', '#CDEBFF'], ['Ginger', '#FF9A3C'], ['Pink', '#FF9FB8'], ['Green', '#5CCB7A']],
      regs: [[1, 'M0 0H100V100H0Z', [[10, 10], [90, 92]]], [2, 'M50 92C22 92 13 76 15 58C16 46 19 39 22 35L17 8L40 24Q50 21 60 24L83 8L78 35Q84 46 85 58C87 76 78 92 50 92Z', [[50, 84], [26, 70]]],
        [3, 'M22 33L19 14L37 25Z M78 33L81 14L63 25Z M44 61H56L50 68Z', [[25, 25], [75, 25]]], [4, ell(38, 50, 7.5, 8.5) + ell(62, 50, 7.5, 8.5), [[38, 50], [62, 50]]]],
      top: '<path d="M50 68q-5 7-10 3M50 68q5 7 10 3" stroke="#38444C" stroke-width="1.2" fill="none"/>',
      after: '<ellipse cx="38" cy="50" rx="2" ry="6" fill="#222"/><ellipse cx="62" cy="50" rx="2" ry="6" fill="#222"/><path d="M30 62H8M30 66l-20 6M70 62h22M70 66l20 6" stroke="#38444C" stroke-width="1.2"/>' },
    { name: 'a fish', lv: 2, pal: [['Sea blue', '#5BB8F5'], ['Orange', '#FF9A3C'], ['Yellow', '#FFD23F'], ['Green', '#3CC46B'], ['Sand', '#E8C27A']],
      regs: [[1, 'M0 0H100V100H0Z', [[10, 10], [60, 12]]], [5, 'M0 88Q20 80 40 88T80 86T100 88V100H0Z', [[50, 94]]], [4, 'M7 90Q1 62 14 42Q25 64 21 90Z', [[14, 72]]], [4, 'M80 90Q76 66 87 50Q97 68 93 90Z', [[87, 76]]],
        [3, 'M70 46L92 28V64Z', [[85, 46]]], [3, 'M34 33Q46 6 66 33Z', [[50, 26]]], [2, ell(48, 46, 26, 17), [[54, 50]]]],
      top: '<circle cx="32" cy="42" r="4" fill="#fff" stroke="#38444C" stroke-width=".7"/><circle cx="33" cy="42" r="2" fill="#222"/>',
      after: '<circle cx="18" cy="28" r="3" fill="none" stroke="#fff" stroke-width="1"/><circle cx="14" cy="18" r="2" fill="none" stroke="#fff" stroke-width="1"/>' },
    { name: 'some balloons', lv: 2, pal: [['Sky blue', '#9ED8FF'], ['Red', '#F0563C'], ['Yellow', '#FFC234'], ['Purple', '#A98BFF'], ['Green', '#3CC46B'], ['Cloud grey', '#D5DEE8']],
      regs: [[1, 'M0 0H100V84H0Z', [[8, 50], [92, 36]]], [6, ell(22, 16, 16, 8), [[22, 16]]], [6, ell(80, 12, 13, 7), [[80, 12]]], [5, 'M0 84Q50 72 100 84V100H0Z', [[16, 92], [84, 92]]],
        [2, ell(32, 44, 13, 16), [[32, 44]]], [3, ell(56, 36, 13, 16), [[56, 36]]], [4, ell(78, 52, 12, 15), [[78, 52]]]],
      top: '<path d="M32 60Q34 72 52 86M56 52Q52 70 52 86M78 67Q70 78 52 86" stroke="#38444C" stroke-width=".9" fill="none"/><path d="M30 61h4l-2-3zM54 53h4l-2-3zM76 68h4l-2-3z" fill="#38444C"/>' },
    { name: 'a tree on the hills', lv: 2, pal: [['Sky blue', '#8FD3FF'], ['Yellow', '#FFC234'], ['Light green', '#9BE07A'], ['Dark green', '#2E9E55'], ['Brown', '#8A5A35'], ['Red', '#E8503A']],
      regs: [[1, 'M0 0H100V100H0Z', [[88, 12], [10, 44]]], [2, circ(16, 16, 9), [[16, 16]]], [3, 'M0 62Q40 44 100 60V100H0Z', [[84, 66]]], [5, 'M46 50H56V84H46Z', [[51, 70]]],
        [4, 'M0 80Q50 64 100 84V100H0Z', [[20, 90], [76, 90]]], [3, ell(51, 34, 24, 20), [[40, 26]]], [6, circ(38, 40, 5.5) + circ(60, 26, 5.5) + circ(62, 44, 5.5), [[38, 40], [60, 26], [62, 44]]]] },
    { name: 'a cup of tea', lv: 2, pal: [['Pale yellow', '#FFE3A3'], ['Brown', '#B07A4A'], ['Blue', '#45AEFF'], ['Pink', '#F77FB0'], ['Tea brown', '#7A4A28']],
      regs: [[1, 'M0 0H100V70H0Z', [[10, 12], [90, 12]]], [2, 'M0 70H100V100H0Z', [[10, 90], [90, 92]]], [4, ell(48, 82, 36, 8), [[18, 82]]],
        [3, 'M24 44H72Q72 78 48 80Q24 78 24 44Z M71 50Q90 46 88 60Q86 74 66 72L68 65Q79 66 80 60Q81 54 71 57Z', [[32, 56]]], [5, ell(48, 44, 24, 5), [[48, 44]]],
        [4, 'M48 73C39 66 37 59 41 56C44 54 47 56 48 59C49 56 52 54 55 56C59 59 57 66 48 73Z', [[48, 63]]]],
      after: '<path d="M38 34q-4-6 0-12M48 34q-4-6 0-12M58 34q-4-6 0-12" stroke="#fff" stroke-width="2" fill="none"/>' },
    { name: 'a butterfly', lv: 3, pal: [['Pale yellow', '#FFF1B8'], ['Purple', '#A98BFF'], ['Pink', '#F77FB0'], ['Orange', '#FF9A3C'], ['Dark brown', '#5A3A22'], ['Green', '#3CC46B']],
      regs: [[1, 'M0 0H100V100H0Z', [[8, 8], [92, 8]]], [6, 'M0 88Q50 78 100 88V100H0Z', [[50, 94]]],
        [2, 'M48 46C38 20 18 10 10 20C4 30 14 46 48 50Z', [[34, 38]]], [2, 'M52 46C62 20 82 10 90 20C96 30 86 46 52 50Z', [[66, 38]]],
        [3, 'M48 53C26 54 12 66 18 78C26 90 42 80 48 58Z', [[30, 68]]], [3, 'M52 53C74 54 88 66 82 78C74 90 58 80 52 58Z', [[70, 68]]],
        [4, circ(22, 25, 6) + circ(78, 25, 6), [[22, 25], [78, 25]]], [5, ell(50, 52, 4.5, 22), [[50, 52]]]],
      top: '<path d="M48 31Q42 18 36 15M52 31Q58 18 64 15" stroke="#5A3A22" stroke-width="1.4" fill="none"/>' },
    { name: 'a rainbow', lv: 3, pal: [['Sky blue', '#8FD3FF'], ['Red', '#EE4B3B'], ['Orange', '#FF9A3C'], ['Yellow', '#FFD23F'], ['Green', '#5CCB7A'], ['Cloud grey', '#D5DEE8'], ['Dark green', '#2E9E55']],
      regs: [[1, 'M0 0H100V100H0Z', [[10, 12], [50, 76]]], [2, band(44, 36), [[50, 44]]], [3, band(36, 28), [[50, 52]]], [4, band(28, 20), [[50, 60]]], [5, band(20, 12), [[50, 68]]],
        [7, 'M0 84Q50 76 100 84V100H0Z', [[50, 93]]], [6, ell(14, 82, 15, 8) + ell(86, 82, 15, 8), [[14, 82], [86, 82]]]] }
  ];

  function startColourNum(L0, api) {
    const L = lvl(L0), done = finisher(api);
    const maxLv = L <= 1 ? 1 : L <= 3 ? 2 : 3, minLv = L >= 6 ? 2 : 1;
    const pic = pick(CN.filter(p => p.lv <= maxLv && p.lv >= minLv));
    const nCol = pic.pal.length;
    const numOf = [...Array(nCol)].map((_, k) => k + 1);
    if (L >= 3) shuffle(numOf);
    const regs = pic.regs.map(([c, d, labs]) => ({ c: c - 1, n: numOf[c - 1], d, labs }));
    let sel = -1, mistakes = 0, left = regs.length, finished = false;
    const wrap = el('div', 'g5-wrap'), box = el('div', 'g5-cnbox');
    let s = `<svg viewBox="0 0 100 100" role="img" aria-label="Picture to colour">${pic.bg ? `<rect width="100" height="100" fill="${pic.bg}"/>` : ''}`;
    regs.forEach((r, k) => { s += `<path class="g5-reg" data-k="${k}" data-n="${r.n}" d="${r.d}" fill="#FFFFFF" fill-rule="nonzero"/>`; });
    s += '<g pointer-events="none">' + (pic.top || '') + '</g>';
    s += '<g class="g5-after" pointer-events="none" opacity="0" style="transition:opacity .8s">' + (pic.after || '') + '</g>';
    regs.forEach((r, k) => r.labs.forEach(([x, y]) => { s += `<text class="g5-cnl" data-k="${k}" x="${x}" y="${y}">${r.n}</text>`; }));
    box.innerHTML = s + '</svg>';
    const swRow = el('div', 'g5-sw'), row = el('div', 'g5-row');
    wrap.append(box, swRow, row); api.stage.append(wrap);
    const paths = [...box.querySelectorAll('.g5-reg')];
    const sws = [];
    const order = [...Array(nCol)].map((_, c) => c).sort((a, b) => numOf[a] - numOf[b]);
    order.forEach(c => {
      const b = el('button', 'tile g5-swb', `<span>${numOf[c]}</span>`); b.type = 'button';
      b.style.setProperty('--c', pic.pal[c][1]); b.style.setProperty('--d', `color-mix(in srgb, ${pic.pal[c][1]} 65%, #000)`);
      b.setAttribute('aria-label', `Colour ${numOf[c]}: ${pic.pal[c][0]}`); b.dataset.n = numOf[c];
      b.onclick = () => choose(c);
      swRow.append(b); sws[c] = b;
    });
    const remaining = c => regs.filter((r, k) => r.c === c && !r.done).length;
    function choose(c) {
      if (finished) return;
      sel = c; sfx.tap(); paths.forEach(p => p.classList.remove('g5-help'));
      sws.forEach((b, k) => b.classList.toggle('g5-on', k === c));
      api.hint(remaining(c) ? `Colour ${numOf[c]} is ${pic.pal[c][0].toLowerCase()}. Tap every space with a ${numOf[c]}.` : `All the ${numOf[c]}s are done. Pick another number.`);
    }
    row.append(mkBtn('💡 Help', 'c-card', () => {
      if (finished) return;
      sfx.tap();
      let c = sel;
      if (c < 0 || !remaining(c)) { c = regs.find(r => !r.done).c; choose(c); }
      const k = regs.findIndex(r => r.c === c && !r.done);
      paths.forEach(p => p.classList.remove('g5-help')); paths[k].classList.add('g5-help');
      api.hint(`Here’s a space for colour ${numOf[c]}. Tap the flashing space.`);
    }));
    box.querySelector('svg').addEventListener('click', e => {
      const p = e.target.closest('.g5-reg'); if (!p || finished) return;
      const k = +p.dataset.k, r = regs[k]; if (r.done) return;
      if (sel < 0) { sfx.soft(); api.hint(`This space is number ${r.n}. First tap colour ${r.n} below.`); sws[r.c].classList.add('g5-pop'); api.later(() => sws[r.c].classList.remove('g5-pop'), 600); return; }
      if (r.c !== sel) {
        mistakes++; sfx.soft(); p.classList.remove('g5-shake'); void p.getBoundingClientRect(); p.classList.add('g5-shake');
        api.hint(`That space is number ${r.n}. Tap colour ${r.n} (${pic.pal[r.c][0].toLowerCase()}) first.`);
        return;
      }
      r.done = true; left--; p.classList.remove('g5-help'); p.setAttribute('fill', pic.pal[r.c][1]); p.style.cursor = 'default';
      box.querySelectorAll(`.g5-cnl[data-k="${k}"]`).forEach(t => t.classList.add('g5-gone'));
      chime(regs.length - left, 523);
      if (!remaining(sel)) { sws[sel].classList.add('g5-fin'); if (left) api.hint(`All the ${numOf[sel]}s are done. ${cheer()} Pick another number.`); }
      if (!left) finish();
    });
    function finish() {
      finished = true; sws.forEach(b => b.classList.remove('g5-on'));
      box.querySelector('.g5-after').setAttribute('opacity', '1');
      const sp = el('div', 'g5-spark');
      for (let k = 0; k < 14; k++) { const i = el('i', '', pick(['✨', '⭐', '✨', '🌟'])); i.style.left = (6 + randInt(84)) + '%'; i.style.top = (6 + randInt(84)) + '%'; i.style.animationDelay = (k * .11).toFixed(2) + 's'; sp.append(i); }
      box.append(el('div', 'g5-shine'), sp);
      sfx.good(); [0, 1, 2, 3].forEach(k => tone(587 + k * 147, .2, 'triangle', .1, k * .1));
      api.hint(`What a beautiful picture of ${pic.name}!`);
      toast('Beautiful!');
      api.later(() => done(starsFor(mistakes, 1, 4)), 1400);
    }
    api.hint('Pick a numbered colour below, then tap the spaces with that number.');
  }

  /* =========================================================
     4. MY LIFE BOOK (photos stay on this device)
     ========================================================= */
  const LB_KEY = 'lifebook', LB_MAX = 12;
  let LB_MEM = null;
  const LB_PROMPTS = [
    ['Our wedding day', '💒', 'What do you remember most about the day?'],
    ['My first home', '🏡', 'What was your favourite room there?'],
    ['Holidays at…', '🏖️', 'What did you love doing there?'],
    ['My school days', '🏫', 'Who was your favourite teacher?'],
    ['Our family', '👪', 'Who is in this picture?'],
    ['My first job', '💼', 'What was a usual day at work like?'],
    ['A special birthday', '🎂', 'How did you celebrate?'],
    ['My best friend', '🤝', 'How did you two meet?'],
    ['Our pet', '🐶', 'What was their name? What were they like?'],
    ['My garden', '🌷', 'What did you like to grow?'],
    ['A lovely day out', '🧺', 'Where did you go, and who came along?'],
    ['Christmas time', '🎄', 'What did you eat on Christmas Day?'],
    ['When I was little', '🧸', 'What games did you like to play?'],
    ['Where I grew up', '🏘️', 'What was your street like?'],
    ['Dancing days', '💃', 'Where did you go dancing?']
  ];
  const LB_GENERIC = ['What do you remember about this?', 'Who was there with you?', 'How did you feel that day?', 'What sounds or smells does this bring back?', 'What happened next?'];
  const LB_SAMPLES = [
    { cap: 'Holidays at the seaside', pic: '🏖️', bits: '🦀🍦⛱️🐚', bg: '#8FD3FF,#FFE3A3', q: 'Did you go to the seaside as a child? Which beach?' },
    { cap: 'Our wedding day', pic: '💒', bits: '💐🎂💍🕊️', bg: '#FFD6E4,#FFF4F8', q: 'What do you remember about a wedding you went to?' },
    { cap: 'My first home', pic: '🏡', bits: '🔑🪴🫖🛋️', bg: '#C9F2D9,#FFF6DE', q: 'What was your first home like?' },
    { cap: 'Our family pet', pic: '🐶', bits: '🦴🎾🐾🏠', bg: '#FFE0B8,#FFF6E9', q: 'Did you have a pet? What was it called?' },
    { cap: 'My school days', pic: '🏫', bits: '📚✏️🍎🔔', bg: '#D8E8FF,#FFF8E6', q: 'What was your school like? What did you enjoy?' },
    { cap: 'Christmas time', pic: '🎄', bits: '🎁⭐🍪❄️', bg: '#CFEFD6,#FFF0F0', q: 'What was Christmas like when you were young?' },
    { cap: 'A lovely day out', pic: '🎡', bits: '🍭🎠🚂🎈', bg: '#E5DBFF,#FFF5E0', q: 'Where did you like to go for a day out?' },
    { cap: 'In the garden', pic: '🌻', bits: '🌷🐝🍅🦋', bg: '#D5F5C8,#FFFBE0', q: 'Did you enjoy gardening? What did you grow?' }
  ];
  function lbLoad() {
    if (LB_MEM) return LB_MEM.slice();
    try { const a = store.get(LB_KEY, []); return Array.isArray(a) ? a.filter(p => p && typeof p.cap === 'string').slice(0, LB_MAX) : []; } catch (e) { return []; }
  }
  function lbSave(pages) {
    LB_MEM = pages.slice();
    try {
      store.set(LB_KEY, pages);
      const b = store.get(LB_KEY, null);
      if (!Array.isArray(b) || b.length !== pages.length) return false;
      return pages.every((p, k) => b[k] && b[k].cap === p.cap && (b[k].img || '').length === (p.img || '').length);
    } catch (e) { return false; }
  }
  function lbShrink(file) {
    return new Promise(res => {
      try {
        const fr = new FileReader();
        fr.onerror = () => res(null);
        fr.onload = () => {
          const img = new Image();
          img.onerror = () => res(null);
          img.onload = () => {
            try {
              const M = 600, k = Math.min(1, M / Math.max(img.naturalWidth, img.naturalHeight));
              const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(img.naturalWidth * k)); cv.height = Math.max(1, Math.round(img.naturalHeight * k));
              const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height);
              res(cv.toDataURL('image/jpeg', .72));
            } catch (e) { res(null); }
          };
          img.src = fr.result;
        };
        fr.readAsDataURL(file);
      } catch (e) { res(null); }
    });
  }
  const lbQuestion = (p, k) => { const m = LB_PROMPTS.find(x => p.cap.toLowerCase().startsWith(x[0].replace('…', '').trim().toLowerCase())); return p.q || (m ? m[2] : LB_GENERIC[k % LB_GENERIC.length]); };
  const lbPic = p => p.img ? `<img src="${p.img}" alt="${esc(p.cap)}">` : `<div class="g5-scene" style="background:linear-gradient(180deg,${(p.bg || '#FFE3A3,#FFF8E6').split(',').join(',')})"><b>${p.pic || '📖'}</b>${p.bits ? `<span>${p.bits}</span>` : ''}</div>`;

  function startLifeBook(L0, api) {
    const done = finisher(api);
    let pages = lbLoad(), finishedOnce = false;
    const root = el('div', 'g5-wrap'); api.stage.append(root);
    const input = el('input'); input.type = 'file'; input.accept = 'image/*'; input.hidden = true; input.className = 'g5-file';
    api.stage.append(input);
    const finBtn = () => mkBtn('✓ Finished', 'c-leaf', () => { if (finishedOnce) return; finishedOnce = true; sfx.good(); api.hint('What a lovely book. Thank you for sharing it.'); done(3); });
    function cover() {
      root.innerHTML = '';
      const pg = el('div', 'g5-lbpage g5-cover g5-turnP');
      if (pages.length) {
        pg.innerHTML = `<div class="g5-bk">📖</div><h3>My Life Book</h3><p>${pages.length} ${pages.length === 1 ? 'page' : 'pages'} of happy memories.</p>`;
        const r = el('div', 'g5-row');
        r.append(mkBtn('📖 Open the book', 'c-sun', () => { sfx.tap(); browse(pages, 0, 1, false); }));
        if (pages.length < LB_MAX) r.append(mkBtn('＋ Add a page', 'c-sky', () => { sfx.tap(); editor(); }));
        pg.append(r);
        api.hint('Open your book to look through it, or add a new page.');
      } else {
        pg.innerHTML = `<div class="g5-bk">📖</div><h3>My Life Book</h3><p>A keepsake book of your own photos and memories. Add a photo, give it a few words, and turn the pages together.</p>`;
        const r = el('div', 'g5-row');
        r.append(mkBtn('📷 Make a page', 'c-sun', () => { sfx.tap(); editor(); }), mkBtn('👀 Look at example pages', 'c-sky', () => { sfx.tap(); browse(LB_SAMPLES, 0, 1, true); }));
        pg.append(r);
        api.hint('Make your first page, or look at some example pages.');
      }
      pg.append(el('p', '', '🔒 Your photos stay only on this device.'));
      root.append(pg);
      const r2 = el('div', 'g5-row'); r2.append(finBtn()); root.append(r2);
    }
    function browse(list, k, dir, sample) {
      root.innerHTML = '';
      const p = list[k];
      const pg = el('div', 'g5-lbpage ' + (dir > 0 ? 'g5-turnN' : 'g5-turnP'));
      pg.innerHTML = `${sample ? '<span class="g5-lbtag">Example page</span>' : ''}<div class="g5-lbphoto">${lbPic(p)}</div><div class="g5-lbcap">${esc(p.cap)}</div><div class="g5-lbq">💬 ${esc(lbQuestion(p, k))}</div>`;
      tone(dir > 0 ? 330 : 294, .12, 'sine', .08); tone(dir > 0 ? 440 : 392, .12, 'sine', .06, .08);
      const nav = el('div', 'g5-lbnav');
      const prev = mkBtn('◀', 'c-card', () => { sfx.tap(); browse(list, k - 1, -1, sample); }), next = mkBtn('▶', 'c-sun', () => { sfx.tap(); browse(list, k + 1, 1, sample); });
      prev.setAttribute('aria-label', 'Previous page'); next.setAttribute('aria-label', 'Next page');
      if (k === 0) prev.disabled = true; if (k === list.length - 1) next.disabled = true;
      nav.append(prev, el('span', '', `Page ${k + 1} of ${list.length}`), next);
      const r = el('div', 'g5-row');
      r.append(mkBtn('🏠 Cover', 'c-card', () => { sfx.tap(); cover(); }));
      if (pages.length < LB_MAX) r.append(mkBtn(sample ? '📷 Make a page' : '＋ Add a page', 'c-sky', () => { sfx.tap(); editor(); }));
      if (!sample) {
        let armed = false;
        const rm = mkBtn('Remove page', 'c-card', () => {
          if (!armed) { armed = true; rm.textContent = 'Tap again to remove'; sfx.tap(); return; }
          pages.splice(k, 1); const ok = lbSave(pages); sfx.soft();
          api.hint(ok ? 'That page has been taken out.' : 'That page is taken out for now.');
          if (pages.length) browse(pages, Math.min(k, pages.length - 1), -1, false); else cover();
        });
        r.append(rm);
      }
      r.append(finBtn());
      root.append(pg, nav, r);
      api.hint(sample ? 'An example page. Use the arrows to turn the pages.' : 'Take your time with each page. Use the arrows to turn.');
    }
    function editor() {
      root.innerHTML = '';
      if (pages.length >= LB_MAX) { api.hint(`Your book is full (${LB_MAX} pages). Remove a page to make room.`); cover(); return; }
      let photo = '', pic = '📖';
      const pg = el('div', 'g5-lbpage g5-turnN');
      const slot = el('button', 'g5-lbphoto g5-slot'); slot.type = 'button';
      const drawSlot = () => { slot.innerHTML = photo ? `<img src="${photo}" alt="Your photo">` : `<span><big>📷</big>Tap to add a photo</span>`; };
      drawSlot();
      slot.onclick = () => { sfx.tap(); input.click(); };
      input.onchange = async () => {
        const f = input.files && input.files[0]; input.value = '';
        if (!f) return;
        api.hint('Getting your photo ready…');
        const d = await lbShrink(f);
        if (!slot.isConnected) return;
        if (!d) { api.hint('Sorry, that photo would not open. You could try a different one.'); return; }
        photo = d; drawSlot(); slot.classList.add('g5-pop'); sfx.good();
        api.hint('Lovely photo! Now choose some words for this page.');
      };
      const txt = el('input', 'g5-lbin'); txt.type = 'text'; txt.maxLength = 60; txt.placeholder = 'Type your own words…'; txt.setAttribute('aria-label', 'Words for this page');
      const chips = el('div', 'g5-chips');
      let off = 0;
      const drawChips = () => {
        chips.innerHTML = '';
        for (let j = 0; j < 4; j++) {
          const pr = LB_PROMPTS[(off + j) % LB_PROMPTS.length];
          const c = mkBtn(`${pr[1]} ${pr[0]}`, 'c-card g5-chip', () => {
            sfx.tap(); pic = pr[1]; chips.querySelectorAll('.g5-chip').forEach(x => x.classList.remove('g5-on')); c.classList.add('g5-on');
            if (pr[0].endsWith('…')) { txt.value = pr[0].replace('…', ' '); try { txt.focus(); txt.setSelectionRange(txt.value.length, txt.value.length); } catch (e) {} api.hint('Type where you went, then tap Save.'); }
            else { txt.value = pr[0]; api.hint('Good choice. Change the words if you like, then tap Save.'); }
          });
          chips.append(c);
        }
        chips.append(mkBtn('↻ More ideas', 'c-peach g5-chip', () => { sfx.tap(); off = (off + 4) % LB_PROMPTS.length; drawChips(); }));
      };
      drawChips();
      pg.append(slot, txt, chips);
      const r = el('div', 'g5-row');
      r.append(mkBtn('✓ Save this page', 'c-leaf', () => {
        const cap = txt.value.trim() || 'A happy memory';
        if (!photo && !txt.value.trim()) { sfx.soft(); api.hint('Add a photo or choose some words first. Then tap Save.'); return; }
        const pgObj = { cap, img: photo, pic: photo ? '' : pic, at: Date.now() };
        pages.push(pgObj);
        let ok = lbSave(pages);
        if (!ok && photo) {
          // keep it in the book for now; storage is probably full
          LB_MEM = pages.slice();
        }
        sfx.good(); toast(cheer());
        browse(pages, pages.length - 1, 1, false);
        api.hint(ok ? 'Saved in your book. You can look at it any time.' : 'This page is in your book for now, but this device couldn’t keep it for next time. That’s all right.');
      }), mkBtn('✕ Cancel', 'c-card', () => { sfx.tap(); if (pages.length) browse(pages, pages.length - 1, -1, false); else cover(); }));
      root.append(pg, r);
      api.hint('Tap the frame to add a photo. Then choose some words, or type your own.');
    }
    if (pages.length) browse(pages, 0, 1, false); else cover();
  }

  /* =========================================================
     5. FACES & NAMES
     ========================================================= */
  const FN_SKIN = ['#F7D7BE', '#EDBB95', '#D39B6F', '#A86F48', '#7A4B2C'];
  const FN_HAIR = { grey: '#B4BAC1', white: '#EEEEE8', brown: '#7A4A28', black: '#2B2420', ginger: '#D9672B', blonde: '#EFC45A' };
  const FN_LOOKS = [
    { g: 'f', hair: 'bob', hc: 'grey', skin: 0, glasses: 'round' },
    { g: 'f', hair: 'bun', hc: 'white', skin: 1, ear: 1 },
    { g: 'f', hair: 'curly', hc: 'black', skin: 3, ear: 1 },
    { g: 'f', hair: 'long', hc: 'ginger', skin: 0, hat: 'sun' },
    { g: 'f', hair: 'short', hc: 'blonde', skin: 1, glasses: 'square' },
    { g: 'f', hair: 'curly', hc: 'white', skin: 4, glasses: 'round' },
    { g: 'f', hair: 'bob', hc: 'brown', skin: 2, hat: 'beret' },
    { g: 'f', hair: 'long', hc: 'grey', skin: 2, ear: 1 },
    { g: 'm', hair: 'bald', hc: 'grey', skin: 1, glasses: 'round', beard: 'tache' },
    { g: 'm', hair: 'short', hc: 'black', skin: 4 },
    { g: 'm', hair: 'short', hc: 'white', skin: 0, hat: 'cap' },
    { g: 'm', hair: 'wave', hc: 'brown', skin: 2, beard: 'full' },
    { g: 'm', hair: 'bald', hc: 'white', skin: 3, beard: 'full', glasses: 'square' },
    { g: 'm', hair: 'wave', hc: 'ginger', skin: 0, glasses: 'square' },
    { g: 'm', hair: 'short', hc: 'grey', skin: 2, hat: 'bobble' }
  ];
  const FN_NAMES = { f: ['Rose', 'Mabel', 'Edith', 'Lily', 'Iris', 'Dorothy', 'Peggy', 'Joan', 'Elsie', 'Violet', 'Ruby', 'Betty', 'Nora', 'Pearl'],
    m: ['Arthur', 'Frank', 'George', 'Harold', 'Albert', 'Walter', 'Stanley', 'Fred', 'Bert', 'Ted', 'Sidney', 'Len', 'Percy', 'Alf'] };
  const FN_FACTS = ['loves gardening 🌻', 'bakes lovely cakes 🍰', 'plays the piano 🎹', 'keeps chickens 🐔', 'loves going fishing 🎣', 'sings in a choir 🎵', 'knits warm scarves 🧶',
    'has a dog called Biscuit 🐶', 'grows big tomatoes 🍅', 'loves to dance 💃', 'paints pictures 🎨', 'loves doing crosswords ✏️', 'grew up by the sea 🌊', 'makes the best jam 🍓',
    'feeds the birds every morning 🐦', 'rides a bicycle 🚲', 'reads detective stories 📚', 'loves old films 🎬', 'has a cat called Tibbles 🐱', 'enjoys a good cup of tea ☕'];
  const FN_BG = ['#FFD6A5', '#CDE7FF', '#D8F5C9', '#FFD1E0', '#E6DCFF', '#FFF0A8'];
  const FN_SHIRT = ['#45AEFF', '#F0563C', '#3CC46B', '#A98BFF', '#FF9A3C', '#F25A95'];
  function faceSVG(k, bg, shirt) {
    const skin = FN_SKIN[k.skin], hc = FN_HAIR[k.hc], ink = '#2A2A2A';
    let back = '', front = '', top = '';
    switch (k.hair) {
      case 'long': back = `<path d="M23 88Q15 40 30 25Q50 10 70 25Q85 40 77 88Z" fill="${hc}"/>`; front = `<path d="M28 46Q28 21 50 20Q72 21 72 46Q64 31 50 30Q36 31 28 46Z" fill="${hc}"/>`; break;
      case 'bob': back = `<path d="M24 68Q18 22 50 18Q82 22 76 68Q71 72 66 66L66 40H34L34 66Q29 72 24 68Z" fill="${hc}"/>`; front = `<path d="M27 47Q26 20 50 19Q74 20 73 47Q67 33 56 32Q48 37 40 33Q31 35 27 47Z" fill="${hc}"/>`; break;
      case 'bun': back = `<circle cx="50" cy="15" r="10" fill="${hc}"/>`; front = `<path d="M27 45Q26 21 50 20Q74 21 73 45Q66 30 50 30Q34 30 27 45Z" fill="${hc}"/>`; break;
      case 'curly': {
        let c = ''; for (let a = 160; a <= 380; a += 22) { const t = a * Math.PI / 180; c += `<circle cx="${(50 + 25 * Math.cos(t)).toFixed(1)}" cy="${(46 + 25 * Math.sin(t)).toFixed(1)}" r="9" fill="${hc}"/>`; }
        back = c; front = `<circle cx="38" cy="27" r="8" fill="${hc}"/><circle cx="50" cy="24" r="8" fill="${hc}"/><circle cx="62" cy="27" r="8" fill="${hc}"/>`; break;
      }
      case 'short': front = `<path d="M27 48Q25 19 50 18Q75 19 73 48Q72 35 66 31Q50 35 34 31Q28 35 27 48Z" fill="${hc}"/>`; break;
      case 'wave': front = `<path d="M27 48Q25 19 50 18Q75 19 73 48Q72 35 66 31Q50 35 34 31Q28 35 27 48Z" fill="${hc}"/><path d="M30 30Q36 12 58 15Q72 18 71 32Q58 22 30 30Z" fill="${hc}"/>`; break;
      case 'bald': front = `<path d="M26 54Q24 40 31 34L34 52ZM74 54Q76 40 69 34L66 52Z" fill="${hc}"/>`; break;
    }
    let s = `<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="${bg}"/>${back}`;
    s += `<path d="M12 100Q14 76 50 74Q86 76 88 100Z" fill="${shirt}"/><path d="M42 74l8 9 8-9" fill="#fff" opacity=".85"/><rect x="43" y="63" width="14" height="13" fill="${skin}"/>`;
    s += `<circle cx="27" cy="50" r="5.5" fill="${skin}"/><circle cx="73" cy="50" r="5.5" fill="${skin}"/><ellipse cx="50" cy="47" rx="23" ry="26" fill="${skin}"/>${front}`;
    s += `<path d="M36 41q5-3 10 0M54 41q5-3 10 0" stroke="${k.hc === 'white' || k.hc === 'grey' ? '#8A8F96' : hc}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    s += `<circle cx="41" cy="48" r="2.8" fill="${ink}"/><circle cx="59" cy="48" r="2.8" fill="${ink}"/><path d="M50 50q-3 6 0 7" stroke="#B57A5A" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    s += `<circle cx="36" cy="57" r="4" fill="#FF7A7A" opacity=".3"/><circle cx="64" cy="57" r="4" fill="#FF7A7A" opacity=".3"/>`;
    if (k.beard === 'full') s += `<path d="M27 52Q27 82 50 82Q73 82 73 52Q71 66 61 66Q50 61 39 66Q29 66 27 52Z" fill="${hc}"/>`;
    if (k.beard === 'tache' || k.beard === 'full') s += `<path d="M40 61Q45 56 50 59Q55 56 60 61Q55 63 50 61Q45 63 40 61Z" fill="${k.beard === 'full' ? '#8A8F96' : hc}"/>`;
    s += `<path d="M42 64Q50 70 58 64" stroke="${ink}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    if (k.glasses === 'round') s += `<g stroke="#333" stroke-width="2" fill="rgba(255,255,255,.18)"><circle cx="41" cy="48" r="7"/><circle cx="59" cy="48" r="7"/><path d="M48 48h4M34 47l-6-2M66 47l6-2" fill="none"/></g>`;
    if (k.glasses === 'square') s += `<g stroke="#5A2E1A" stroke-width="2.2" fill="rgba(255,255,255,.18)"><rect x="33" y="42" width="15" height="12" rx="2"/><rect x="52" y="42" width="15" height="12" rx="2"/><path d="M48 47h4M33 46l-5-1M67 46l5-1" fill="none"/></g>`;
    if (k.ear) s += `<circle cx="27" cy="58" r="2.6" fill="#F2C23A"/><circle cx="73" cy="58" r="2.6" fill="#F2C23A"/>`;
    if (k.hat === 'cap') top = `<path d="M25 38Q26 17 50 16Q74 17 75 38Z" fill="#6B7B5A"/><path d="M22 38Q50 30 80 38Q78 45 50 41Q24 45 22 38Z" fill="#55663F"/>`;
    if (k.hat === 'sun') top = `<ellipse cx="50" cy="31" rx="37" ry="8" fill="#F2D27A"/><path d="M32 31Q32 9 50 9Q68 9 68 31Z" fill="#F2D27A"/><rect x="32" y="24" width="36" height="5" fill="#F25A95"/>`;
    if (k.hat === 'beret') top = `<ellipse cx="45" cy="24" rx="27" ry="10" fill="#D9534F" transform="rotate(-8 45 24)"/><circle cx="46" cy="13" r="2.5" fill="#B33F3B"/>`;
    if (k.hat === 'bobble') top = `<path d="M26 38Q26 12 50 12Q74 12 74 38Z" fill="#45AEFF"/><rect x="25" y="33" width="50" height="8" rx="3" fill="#1D70C0"/><circle cx="50" cy="11" r="6" fill="#fff"/>`;
    return s + top + '</svg>';
  }
  function startFaces(L0, api) {
    const L = lvl(L0), done = finisher(api), n = Math.min(6, 2 + Math.floor((L - 1) / 2));
    const fl = shuffle(FN_LOOKS.filter(k => k.g === 'f')), ml = shuffle(FN_LOOKS.filter(k => k.g === 'm'));
    const nf = Math.max(1, Math.min(n - 1, Math.round(n / 2) + (Math.random() < .5 ? 0 : n % 2 ? -1 : 0)));
    const looks = shuffle(fl.slice(0, nf).concat(ml.slice(0, n - nf)));
    const fn = shuffle(FN_NAMES.f.slice()), mn = shuffle(FN_NAMES.m.slice()), facts = shuffle(FN_FACTS.slice()), bgs = shuffle(FN_BG.slice()), shirts = shuffle(FN_SHIRT.slice());
    const people = looks.map((k, i) => ({ k, name: k.g === 'f' ? fn.pop() : mn.pop(), fact: facts[i], svg: faceSVG(k, bgs[i], shirts[i]) }));
    let mistakes = 0;
    function meet(i) {
      api.stage.innerHTML = ''; api.rounds(n, i);
      const p = people[i];
      const card = el('div', 'g5-card g5-meet g5-pop', `<div class="g5-face">${p.svg}</div><h3>This is ${esc(p.name)}</h3><p>${esc(p.name)} ${esc(p.fact)}</p>`);
      const r = el('div', 'g5-row');
      if (i > 0) r.append(mkBtn('◀ Back', 'c-card', () => { sfx.tap(); meet(i - 1); }));
      r.append(mkBtn(i < n - 1 ? 'Meet the next person ▶' : 'See everyone ▶', 'c-sun', () => { sfx.tap(); if (i < n - 1) meet(i + 1); else everyone(); }));
      const w = el('div', 'g5-wrap'); w.append(card, r); api.stage.append(w);
      api.hint(`Say hello to ${p.name}. Take your time. Tap the button when you are ready.`);
      tone(523, .12, 'sine', .1); tone(659, .14, 'sine', .1, .1);
    }
    function everyone() {
      api.stage.innerHTML = ''; api.rounds(n, n);
      const g = el('div', 'g5-fgrid'); g.style.setProperty('--cols', n <= 3 ? n : n === 4 ? 2 : 3);
      people.forEach(p => g.append(el('div', 'g5-fc', `<span class="g5-face">${p.svg}</span><span class="g5-fl">${esc(p.name)}</span><span class="g5-fsum">${esc(p.fact)}</span>`)));
      const r = el('div', 'g5-row');
      r.append(mkBtn('◀ Meet them again', 'c-card', () => { sfx.tap(); meet(0); }), mkBtn('I’m ready ▶', 'c-leaf', () => { sfx.tap(); match(); }));
      const w = el('div', 'g5-wrap'); w.append(g, r); api.stage.append(w);
      api.hint('Here is everyone together. When you are ready, the names will be hidden and you can match them up.');
    }
    function match() {
      api.stage.innerHTML = '';
      const order = shuffle(people.map((p, i) => i)), nameOrder = shuffle(people.map((p, i) => i));
      let selName = -1, selFace = -1, matched = 0, helpStep = 0;
      api.rounds(n, 0);
      const g = el('div', 'g5-fgrid'); g.style.setProperty('--cols', n <= 3 ? n : n === 4 ? 2 : 3);
      const faceEls = [], nameEls = [];
      order.forEach(i => {
        const b = el('button', 'g5-fc', `<span class="g5-face">${people[i].svg}</span><span class="g5-fl">?</span>`); b.type = 'button'; b.dataset.k = i;
        b.setAttribute('aria-label', 'A face');
        b.onclick = () => { if (b.classList.contains('g5-ok')) return; sfx.tap(); selFace = i; faceEls.forEach(x => x && x.classList.toggle('g5-sel', x === b)); check(); };
        faceEls[i] = b; g.append(b);
      });
      const names = el('div', 'g5-names');
      nameOrder.forEach(i => {
        const b = mkBtn(esc(people[i].name), 'c-card', () => { sfx.tap(); selName = i; helpStep = 0; nameEls.forEach(x => x && x.classList.toggle('g5-sel', x === b)); check(); });
        b.dataset.k = i; nameEls[i] = b; names.append(b);
      });
      const r = el('div', 'g5-row');
      r.append(mkBtn('💡 Help', 'c-card', () => {
        sfx.tap();
        let i = selName; if (i < 0 || nameEls[i].hidden) i = people.findIndex((p, j) => !nameEls[j].hidden);
        selName = i; nameEls.forEach(x => x.classList.toggle('g5-sel', x === nameEls[i]));
        if (helpStep === 0) { helpStep = 1; api.hint(`A clue: ${people[i].name} ${people[i].fact}. Which face is ${people[i].name}?`); }
        else { mistakes++; faceEls[i].classList.add('g5-glow'); api.hint(`Here is ${people[i].name}. Tap the glowing face.`); }
      }));
      const w = el('div', 'g5-wrap'); w.append(g, names, r); api.stage.append(w);
      api.hint('Tap a name, then tap the face that goes with it.');
      function check() {
        if (selFace < 0 || selName < 0) { api.hint(selName >= 0 ? `Now tap ${people[selName].name}’s face.` : 'Now tap the name that goes with this face.'); return; }
        const f = selFace, nm = selName; selFace = selName = -1;
        faceEls.forEach(x => x.classList.remove('g5-sel')); nameEls.forEach(x => x.classList.remove('g5-sel'));
        if (f === nm) {
          const b = faceEls[f]; b.classList.remove('g5-glow'); b.classList.add('g5-ok', 'g5-pop'); b.querySelector('.g5-fl').textContent = '✓ ' + people[f].name;
          b.setAttribute('aria-label', people[f].name); nameEls[nm].hidden = true; matched++; api.rounds(n, matched);
          chime(matched * 2, 523); helpStep = 0;
          if (matched === n) { sfx.good(); api.hint('You matched everyone. Wonderful memory!'); api.later(() => done(starsFor(mistakes, 0, Math.max(1, Math.floor(n / 2)))), 600); }
          else api.hint(`Yes, that’s ${people[f].name}! ${cheer()}`);
        } else {
          mistakes++; sfx.soft(); wob(faceEls[f]);
          api.hint(`That’s not ${people[nm].name}. Have another look, or tap Help for a clue.`);
        }
      }
    }
    meet(0);
  }

  /* =========================================================
     6. QUIZ NIGHT
     ========================================================= */
  const QZ_CATS = [
    { id: 'nature', name: 'Nature', ic: '🌿', c: 'c-leaf' }, { id: 'food', name: 'Food & Cooking', ic: '🍳', c: 'c-orange' },
    { id: 'house', name: 'Around the House', ic: '🏠', c: 'c-peach' }, { id: 'geo', name: 'Geography', ic: '🌍', c: 'c-sky' },
    { id: 'animals', name: 'Animals', ic: '🐾', c: 'c-sun' }, { id: 'sport', name: 'Sports & Games', ic: '⚽', c: 'c-coral' },
    { id: 'music', name: 'Music', ic: '🎵', c: 'c-grape' }, { id: 'history', name: 'History', ic: '📜', c: 'c-berry' },
    { id: 'mixed', name: 'Mixed', ic: '🎲', c: 'c-mint' }
  ];
  // category|difficulty (e, m, h)|question|answer|wrong|wrong|wrong
  const QZ_RAW = `
nature|e|What colour are most leaves in summer?|Green|Blue|Purple|Pink
nature|e|Which season comes after winter?|Spring|Autumn|Summer|Harvest time
nature|e|What do bees make?|Honey|Milk|Jam|Butter
nature|e|What grows from an acorn?|An oak tree|A pine tree|A rose bush|A palm tree
nature|e|What falls from the sky as soft white flakes?|Snow|Sand|Leaves|Feathers
nature|e|What is the bright star we see in the daytime?|The Sun|The Moon|Mars|A comet
nature|e|What colour is the sky on a clear sunny day?|Blue|Green|Orange|Brown
nature|e|Which tall yellow flower has a big round face full of seeds?|Sunflower|Daffodil|Tulip|Bluebell
nature|e|What do we call the arch of colours in the sky after rain?|A rainbow|A halo|A comet|A cloud
nature|m|What does a caterpillar turn into?|A butterfly|A beetle|A bee|A frog
nature|m|What is a baby frog called?|A tadpole|A cub|A foal|A chick
nature|m|Which tree’s leaf is on the flag of Canada?|The maple|The oak|The birch|The willow
nature|m|Which month usually has the fewest days?|February|June|April|November
nature|m|How many colours are in a rainbow, as we usually count them?|Seven|Five|Nine|Three
nature|m|What do we call the fluffy white seed head of a dandelion?|A clock|A cone|A pod|A husk
nature|m|Which planet is known as the Red Planet?|Mars|Venus|Jupiter|Saturn
nature|m|What are clouds mostly made of?|Tiny drops of water|Smoke|Dust|Sand
nature|m|How long does it take the Earth to go round the Sun?|About a year|About a month|About a week|About a day
nature|m|Which tree gives us conkers?|The horse chestnut|The oak|The ash|The beech
nature|h|What gives leaves their green colour?|Chlorophyll|Pollen|Nectar|Resin
nature|h|What is the tallest kind of tree in the world?|The coast redwood|The oak|The baobab|The birch
nature|h|Bamboo is actually a type of what?|Grass|Tree|Fern|Moss
nature|h|What is the longest day of the year called?|The summer solstice|The spring equinox|The winter solstice|Michaelmas
nature|h|What is the yellow powder that bees carry from flower to flower?|Pollen|Sap|Resin|Chalk
food|e|What is toast made from?|Bread|Rice|Pasta|Cheese
food|e|Which vegetable can make you cry when you chop it?|An onion|A carrot|A potato|A pea
food|e|What are chips made from?|Potatoes|Carrots|Apples|Turnips
food|e|Which country does pizza first come from?|Italy|France|Mexico|China
food|e|What do we add to tea to make it sweeter?|Sugar|Salt|Pepper|Vinegar
food|e|What is cheese made from?|Milk|Eggs|Flour|Rice
food|e|Which grain do we use to make porridge?|Oats|Lentils|Peas|Beans
food|e|What colour is the inside of a ripe watermelon?|Red|Blue|Purple|Brown
food|e|Which fruit is used to make marmalade?|Oranges|Apples|Bananas|Grapes
food|m|Which spice gives curry a bright yellow colour?|Turmeric|Cinnamon|Pepper|Nutmeg
food|m|What is the main ingredient of guacamole?|Avocado|Pea|Cucumber|Spinach
food|m|What makes bread dough rise?|Yeast|Salt|Vinegar|Butter
food|m|Which nut is used to make marzipan?|Almond|Peanut|Walnut|Hazelnut
food|m|What are raisins made from?|Grapes|Plums|Apricots|Cherries
food|m|Paella is a famous rice dish from which country?|Spain|Italy|Greece|India
food|m|What is a Victoria sponge usually filled with?|Jam and cream|Cheese and pickle|Gravy|Mustard
food|m|At what temperature does water boil, at sea level?|100°C|50°C|80°C|150°C
food|m|What is the main ingredient of hummus?|Chickpeas|Potatoes|Rice|Carrots
food|m|Feta cheese comes from which country?|Greece|France|Holland|Switzerland
food|h|Which spice comes from the dried threads of a crocus flower?|Saffron|Paprika|Cumin|Ginger
food|h|Which pastry is used to make éclairs?|Choux|Puff|Shortcrust|Filo
food|h|What is béchamel?|A white sauce|A cake|A soup|A cheese
food|h|What does “al dente” mean when cooking pasta?|Firm to the bite|Very soft|Well browned|Served cold
food|h|Prunes are dried what?|Plums|Grapes|Figs|Dates
food|h|Stilton cheese comes from which country?|England|France|Italy|Spain
house|e|Where do we keep food cold?|The fridge|The oven|The sink|The bath
house|e|What do you use to sweep the floor?|A broom|A kettle|A ladle|A towel
house|e|Which room do we usually sleep in?|The bedroom|The kitchen|The garage|The hall
house|e|What do we boil water in for a cup of tea?|A kettle|A toaster|A vase|A bucket
house|e|What do you dry yourself with after a bath?|A towel|A pillow|A rug|A curtain
house|e|What do we put fresh flowers in?|A vase|A toaster|A wardrobe|A kettle
house|e|What do you use to bang in a nail?|A hammer|A saw|A spanner|A whisk
house|e|What do you need to sew on a button?|A needle and thread|A fork|A comb|A brush
house|e|What takes the creases out of clothes?|An iron|A sieve|A whisk|A kettle
house|m|What do we call the room in the roof of a house?|The attic|The cellar|The porch|The pantry
house|m|What is a colander used for?|Draining food|Weighing flour|Cutting bread|Whisking eggs
house|m|What is a tea cosy for?|Keeping the teapot warm|Cleaning cups|Holding sugar|Wiping spills
house|m|What swings inside a grandfather clock?|A pendulum|A spring|A bell|A fan
house|m|What is a hot water bottle usually made of?|Rubber|Glass|Wood|Paper
house|m|What do you put on a letter before you post it?|A stamp|A button|A ribbon|A bow
house|m|What is kept in a larder or pantry?|Food|Coats|Shoes|Tools
house|m|What does a thermostat control?|The temperature|The doorbell|The radio|The clock
house|h|In the old days, what was a mangle used for?|Squeezing water out of washing|Cooking stew|Cutting hair|Making butter
house|h|What was a darning mushroom used for mending?|Socks|Shoes|Pots|Windows
house|h|What was a coal scuttle used for?|Carrying coal|Holding flowers|Keeping bread|Catching rain
house|h|What does a spirit level check?|That something is straight|How hot it is|How heavy it is|How loud it is
house|h|What is a chaise longue?|A long sofa|A garden spade|A kitchen drawer|A tall lamp
geo|e|What is the capital city of France?|Paris|Rome|Madrid|Berlin
geo|e|What is the capital city of England?|London|Manchester|York|Bristol
geo|e|Which country is shaped like a boot?|Italy|Spain|Greece|Portugal
geo|e|What is the capital city of Italy?|Rome|Milan|Venice|Naples
geo|e|Which river flows through London?|The Thames|The Seine|The Severn|The Mersey
geo|e|What is the highest mountain in the world?|Mount Everest|Ben Nevis|Mont Blanc|Kilimanjaro
geo|e|Venice is famous for having lots of what?|Canals|Mountains|Deserts|Glaciers
geo|e|Which country is famous for tulips and windmills?|The Netherlands|Sweden|Greece|Egypt
geo|m|What is the capital city of Scotland?|Edinburgh|Glasgow|Aberdeen|Dundee
geo|m|What is the capital city of Wales?|Cardiff|Swansea|Bangor|Newport
geo|m|What is the capital city of Ireland?|Dublin|Cork|Galway|Limerick
geo|m|What is the capital city of Spain?|Madrid|Barcelona|Seville|Valencia
geo|m|What is the capital city of Japan?|Tokyo|Kyoto|Osaka|Beijing
geo|m|Which very long river flows through Egypt?|The Nile|The Amazon|The Thames|The Seine
geo|m|Which river flows through Paris?|The Seine|The Thames|The Rhine|The Danube
geo|m|What is the biggest ocean in the world?|The Pacific|The Atlantic|The Indian|The Arctic
geo|m|What is the largest desert in Africa?|The Sahara|The Gobi|The Atacama|The Mojave
geo|m|How many continents are there?|Seven|Five|Six|Nine
geo|m|The Great Barrier Reef lies off the coast of which country?|Australia|Brazil|Canada|Iceland
geo|m|Which is the coldest continent?|Antarctica|Europe|Africa|Asia
geo|h|What is the capital city of Australia?|Canberra|Sydney|Melbourne|Perth
geo|h|What is the capital city of Canada?|Ottawa|Toronto|Vancouver|Montreal
geo|h|What is the largest country in the world by area?|Russia|Canada|China|Brazil
geo|h|What is the largest island in the world?|Greenland|Iceland|Madagascar|Ireland
geo|h|Which sea lies between Europe and Africa?|The Mediterranean|The Caribbean|The Baltic|The Red Sea
animals|e|How many legs does a spider have?|Eight|Six|Four|Ten
animals|e|What sound does a cow make?|Moo|Woof|Baa|Oink
animals|e|Which animal is called the King of the Jungle?|The lion|The elephant|The zebra|The hippo
animals|e|What is a baby dog called?|A puppy|A kitten|A calf|A lamb
animals|e|Which animal has a very long neck?|The giraffe|The hippo|The rhino|The bear
animals|e|Which animal gives us wool?|The sheep|The cow|The pig|The horse
animals|e|Which animal has black and white stripes?|The zebra|The leopard|The camel|The lion
animals|e|Which animal has a long trunk?|The elephant|The giraffe|The kangaroo|The horse
animals|e|What is a baby cat called?|A kitten|A puppy|A foal|A cub
animals|m|What is a baby horse called?|A foal|A calf|A cub|A kid
animals|m|What do giant pandas mostly eat?|Bamboo|Fish|Grass|Berries
animals|m|Which of these animals can fly?|The bat|The mole|The mouse|The rabbit
animals|m|What is the largest animal that has ever lived?|The blue whale|The elephant|The giraffe|The shark
animals|m|What is a group of lions called?|A pride|A herd|A flock|A pack
animals|m|Which animal can change colour to match its surroundings?|The chameleon|The hedgehog|The badger|The owl
animals|m|What is the fastest land animal?|The cheetah|The lion|The horse|The greyhound
animals|m|What is a baby kangaroo called?|A joey|A cub|A kit|A pup
animals|m|How many legs does an insect have?|Six|Eight|Four|Ten
animals|m|Which bird is often a symbol of peace?|The dove|The crow|The parrot|The penguin
animals|m|Where do polar bears live?|The Arctic|Antarctica|The Sahara|The Amazon
animals|h|What is a male duck called?|A drake|A gander|A cob|A cockerel
animals|h|How many hearts does an octopus have?|Three|One|Two|Eight
animals|h|Which unusual mammal has a bill like a duck and lays eggs?|The platypus|The otter|The beaver|The seal
animals|h|How many humps does a dromedary camel have?|One|Two|Three|None
animals|h|What do we call an animal that eats only plants?|A herbivore|A carnivore|An omnivore|A predator
sport|e|In which game do you say “checkmate”?|Chess|Draughts|Snooker|Bingo
sport|e|How many sides does a dice have?|Six|Four|Eight|Five
sport|e|In which sport do you hit a small ball into a hole with a club?|Golf|Cricket|Hockey|Bowls
sport|e|What shape is a rugby ball?|Oval|Round|Square|Flat
sport|e|What do you shout when two matching cards are turned over together?|Snap!|Bingo!|Checkmate!|Howzat!
sport|e|Which sport is played at Wimbledon?|Tennis|Golf|Rowing|Cricket
sport|e|How often are the Summer Olympic Games usually held?|Every four years|Every year|Every two years|Every ten years
sport|e|Which game uses a racket and a shuttlecock?|Badminton|Tennis|Squash|Golf
sport|m|How many players does a football team have on the pitch?|Eleven|Nine|Seven|Fifteen
sport|m|How many cards are in a standard pack, without jokers?|52|48|54|60
sport|m|In cricket, how many balls are bowled in an over?|Six|Four|Eight|Ten
sport|m|In snooker, which ball is worth the most points?|The black|The pink|The blue|The red
sport|m|In tennis, what is a score of zero called?|Love|Nil|Duck|Zip
sport|m|Which chess piece moves only diagonally?|The bishop|The rook|The knight|The king
sport|m|In bingo, which number is “legs eleven”?|11|7|22|1
sport|m|How many holes are played in a full round of golf?|18|9|12|21
sport|m|What kind of flag is waved when a motor race ends?|A chequered flag|A green flag|A blue flag|A striped flag
sport|h|How many squares are on a chessboard?|64|36|100|48
sport|h|In cricket, what is a score of zero called?|A duck|A love|A nil|A zero hero
sport|h|In lawn bowls, what is the small target ball called?|The jack|The cue|The puck|The shuttle
sport|h|About how long is a marathon?|26 miles|10 miles|50 miles|100 miles
sport|h|On the British Monopoly board, which is the most expensive property?|Mayfair|Park Lane|Old Kent Road|The Strand
music|e|Which instrument has black and white keys?|The piano|The violin|The trumpet|The drum
music|e|Which instrument is Scotland famous for?|The bagpipes|The banjo|The sitar|The harp
music|e|How many musicians play in a duet?|Two|Three|Four|One
music|e|Who stands at the front and leads an orchestra?|The conductor|The captain|The referee|The usher
music|e|How do you play a drum?|By hitting it|By blowing into it|By plucking it|By bowing it
music|e|Which instrument has strings and is often shown with angels?|The harp|The tuba|The drum|The trumpet
music|e|In “do, re, mi”, which note comes next after “mi”?|Fa|So|La|Ti
music|e|How many strings does a standard guitar have?|Six|Four|Eight|Ten
music|m|How many strings does a violin have?|Four|Six|Two|Twelve
music|m|Which of these is a brass instrument?|The trumpet|The violin|The harp|The piano
music|m|Which of these is a woodwind instrument?|The clarinet|The trombone|The tuba|The drum
music|m|How many musicians play in a quartet?|Four|Three|Five|Six
music|m|Which city did the Beatles come from?|Liverpool|London|Manchester|Glasgow
music|m|Elvis Presley was called the King of what?|Rock and roll|Jazz|Opera|Folk
music|m|Which instrument did Louis Armstrong famously play?|The trumpet|The piano|The violin|The drums
music|m|How many beats are in each bar of a waltz?|Three|Two|Four|Six
music|m|What is the biggest instrument in the string family?|The double bass|The violin|The viola|The cello
music|m|Which singer was known as “Ol’ Blue Eyes”?|Frank Sinatra|Dean Martin|Bing Crosby|Perry Como
music|h|How many keys does a standard piano have?|88|52|66|100
music|h|Who wrote the music called “The Four Seasons”?|Vivaldi|Handel|Chopin|Strauss
music|h|Who wrote the music for the ballet “The Nutcracker”?|Tchaikovsky|Beethoven|Vivaldi|Handel
music|h|Who wrote “The Blue Danube” waltz?|Johann Strauss|Mozart|Bach|Tchaikovsky
music|h|Who wrote “Messiah”, with its famous Hallelujah chorus?|Handel|Bach|Haydn|Brahms
music|h|Which composer kept writing music after he lost his hearing?|Beethoven|Vivaldi|Chopin|Elgar
history|e|Who wrote the play “Romeo and Juliet”?|William Shakespeare|Charles Dickens|Jane Austen|Robert Burns
history|e|In which country are the Pyramids of Giza?|Egypt|Greece|Mexico|India
history|e|What were the metal suits worn by knights called?|Armour|Tunics|Kilts|Cloaks
history|e|Which country built the Great Wall?|China|Japan|India|Egypt
history|e|Which country did Queen Victoria rule?|The United Kingdom|France|Spain|Italy
history|e|Who painted the Mona Lisa?|Leonardo da Vinci|Pablo Picasso|Vincent van Gogh|Rembrandt
history|e|Who was the first person to walk on the Moon?|Neil Armstrong|Buzz Aldrin|Yuri Gagarin|John Glenn
history|m|In which year did people first land on the Moon?|1969|1959|1979|1949
history|m|What did the Wright brothers fly in 1903?|The first powered aeroplane|The first hot air balloon|The first rocket|The first helicopter
history|m|Who is said to have thought about gravity when an apple fell?|Isaac Newton|Charles Darwin|Albert Einstein|Galileo
history|m|Which famous nurse was called “the Lady with the Lamp”?|Florence Nightingale|Edith Cavell|Mary Seacole|Clara Barton
history|m|Who is famous for inventing the telephone?|Alexander Graham Bell|Thomas Edison|James Watt|John Logie Baird
history|m|The ancient Olympic Games began in which country?|Greece|Italy|Egypt|China
history|m|Which king of England had six wives?|Henry VIII|Richard III|George III|Charles I
history|m|The Statue of Liberty was a gift from which country?|France|Britain|Spain|Italy
history|m|What did the Romans build to carry water into their towns?|Aqueducts|Windmills|Lighthouses|Castles
history|m|Which queen ruled Ancient Egypt and met Julius Caesar?|Cleopatra|Boudicca|Victoria|Elizabeth
history|h|Who discovered penicillin?|Alexander Fleming|Louis Pasteur|Marie Curie|Isaac Newton
history|h|Who was the first woman to win a Nobel Prize?|Marie Curie|Florence Nightingale|Ada Lovelace|Amelia Earhart
history|h|Who was the first person to travel into space?|Yuri Gagarin|Neil Armstrong|John Glenn|Alan Shepard
history|h|In which year did the Berlin Wall come down?|1989|1979|1999|1969
history|h|What were the picture-writing symbols of Ancient Egypt called?|Hieroglyphs|Runes|Scrolls|Hymns
history|h|Who first flew alone, non-stop across the Atlantic, in 1927?|Charles Lindbergh|Amelia Earhart|Orville Wright|Louis Blériot
history|h|Who invented television pictures in the 1920s in Britain?|John Logie Baird|Alexander Graham Bell|Guglielmo Marconi|James Watt`;
  const QZ = QZ_RAW.trim().split('\n').map((ln, id) => { const [c, d, q, a, ...w] = ln.split('|'); return { id, c, d, q, a, w }; });
  const QZ_SEEN = [];
  function startQuiz(L0, api) {
    const L = lvl(L0), done = finisher(api), total = 8, nOpt = L <= 3 ? 3 : 4;
    const W = L <= 2 ? { e: 1, m: 0, h: 0 } : L <= 4 ? { e: .6, m: .4, h: 0 } : L <= 7 ? { e: .2, m: .6, h: .2 } : L <= 11 ? { e: 0, m: .55, h: .45 } : { e: 0, m: .35, h: .65 };
    const rank = { e: 0, m: 1, h: 2 };
    function choose(cat) {
      const pool = QZ.filter(q => cat === 'mixed' || q.c === cat);
      const used = new Set(), out = [];
      let lastCat = '';
      for (let k = 0; k < total; k++) {
        let r = Math.random(), want = 'e'; for (const d of ['e', 'm', 'h']) { if (r < W[d]) { want = d; break; } r -= W[d]; }
        const avail = pool.filter(q => !used.has(q.id));
        if (!avail.length) break;
        const score = q => Math.abs(rank[q.d] - rank[want]) * 10 + (QZ_SEEN.includes(q.id) ? 5 : 0) + (cat === 'mixed' && q.c === lastCat ? 3 : 0) + Math.random() * 2;
        const q = avail.reduce((b, x) => score(x) < score(b) ? x : b);
        used.add(q.id); out.push(q); lastCat = q.c;
      }
      out.forEach(q => { QZ_SEEN.push(q.id); if (QZ_SEEN.length > 60) QZ_SEEN.shift(); });
      return out;
    }
    function picker() {
      api.stage.innerHTML = '';
      api.hint('Pick a quiz category, or Mixed for a bit of everything. There’s no rush.');
      const g = el('div', 'g5-qcats');
      QZ_CATS.forEach(c => {
        const b = el('button', 'tile g5-qcat ' + c.c, `<span>${c.ic}</span>${esc(c.name)}`); b.type = 'button'; b.dataset.cat = c.id;
        b.onclick = () => { sfx.tap(); play(c); };
        g.append(b);
      });
      api.stage.append(g);
    }
    function play(cat) {
      const qs = choose(cat.id);
      runQuiz(api, qs.length, i => {
        const q = qs[i], cn = QZ_CATS.find(c => c.id === q.c);
        const choices = shuffle([q.a].concat(shuffle(q.w.slice()).slice(0, nOpt - 1)));
        return {
          hint: `${cat.id === 'mixed' ? cn.ic + ' ' + cn.name : cat.ic + ' ' + cat.name}: question ${i + 1} of ${qs.length}. Take your time.`,
          prompt: `<span class="g5-qtag">${cn.ic} ${esc(cn.name)}</span>${esc(q.q)}`,
          reveal: `<span class="g5-qtag">${cn.ic} ${esc(cn.name)}</span>${esc(q.q)}<br><span class="blank filled">✓ ${esc(q.a)}</span>`,
          answer: q.a, choices
        };
      });
    }
    picker();
  }

  /* ---------- register ---------- */
  register({ id: 'places', cat: 'gentle', gentle: true, order: 28, name: 'Famous Places', icon: '🗼', desc: 'Name famous landmarks from big pictures', start: startPlaces });
  register({ id: 'dots', cat: 'gentle', gentle: true, order: 29, name: 'Dot to Dot', icon: '✏️', desc: 'Join the dots to reveal a picture', start: startDots });
  register({ id: 'colournum', cat: 'gentle', gentle: true, order: 30, name: 'Colour by Number', icon: '🖍️', desc: 'Colour each space by its number', start: startColourNum });
  register({ id: 'lifebook', cat: 'gentle', gentle: true, order: 31, name: 'My Life Book', icon: '📖', desc: 'A keepsake book of your own photos', start: startLifeBook });
  register({ id: 'faces', cat: 'memory', order: 14, name: 'Faces & Names', icon: '🧑', desc: 'Meet some friendly faces, then match names', start: startFaces });
  register({ id: 'quiz', cat: 'memory', order: 15, name: 'Quiz Night', icon: '❓', desc: 'Gentle general knowledge, no timer', start: startQuiz });

})();
