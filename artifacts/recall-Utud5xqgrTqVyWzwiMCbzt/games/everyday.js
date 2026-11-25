/* Recall: Everyday Routines (gentle). Warm, familiar daily tasks with no failure, generous stars
   and big pictures: Set the Table, Dress for the Weather, Bake a Cake, Garden Grow, Then and Now.
   Every level is generated fresh; difficulty rises gently and levels off at a sensible cap. */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor } = R;

  const mkBtn = (label, cls, fn) => { const b = el('button', 'btn ' + cls, label); b.type = 'button'; if (fn) b.onclick = fn; return b; };
  const finisher = api => { let d = false; return s => { if (d) return; d = true; api.done(Math.max(1, Math.min(3, s))); }; };
  const lvl = L => Math.max(1, Math.floor(+L || 1));
  const chime = k => tone(523 * Math.pow(2, Math.min(k, 12) * 2 / 12), .2, 'triangle', .12);
  const fanfare = () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .3, 'sine', .11, i * .1));
  const svg = (vb, body, cls) => `<svg class="${cls || ''}" viewBox="${vb}" aria-hidden="true">${body}</svg>`;

  R.css(`
.ev-wrap{max-width:720px;margin:0 auto;display:grid;gap:14px}
.ev-row{display:flex;flex-wrap:wrap;justify-content:center;gap:12px}
.ev-panel{background:var(--card);color:var(--ink);border-radius:24px;padding:14px;box-shadow:0 7px 0 var(--card-edge),0 14px 26px rgba(0,0,0,.28)}
.ev-label{font:600 1.25rem/1.2 var(--display);color:var(--ink-soft);text-align:center;margin:0}
.ev-pop{animation:ev-bounce .5s cubic-bezier(.3,1.6,.5,1)}
.ev-glow{outline:6px solid var(--sun)!important;outline-offset:3px;animation:ev-glowk 1s infinite}
.ev-item{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-width:72px;min-height:80px;padding:6px 6px 4px;border-radius:18px;cursor:pointer;
  font:600 1rem/1.05 var(--display);text-align:center;transition:transform .15s,opacity .25s}
.ev-item .ev-pic{font-size:2.4rem;line-height:1;height:44px;display:grid;place-items:center}
.ev-item .ev-pic svg{height:44px;width:auto;max-width:60px}
.ev-item.ev-sel{transform:translateY(-8px);outline:5px solid #fff;outline-offset:3px}
.ev-item.ev-gone{animation:pop .4s forwards;pointer-events:none}
@keyframes ev-bounce{0%{transform:scale(.5)}60%{transform:scale(1.14)}100%{transform:scale(1)}}
@keyframes ev-glowk{0%,100%{outline-color:rgba(255,194,52,1)}50%{outline-color:rgba(255,255,255,.9)}}
@keyframes ev-float{0%,100%{translate:0 0}50%{translate:0 -8px}}
@keyframes ev-fall{from{transform:translateY(-30px);opacity:0}15%{opacity:1}to{transform:translateY(150px);opacity:0}}
@keyframes ev-blow{from{transform:translateX(-40px) rotate(0);opacity:0}20%{opacity:1}to{transform:translateX(320px) rotate(360deg);opacity:0}}
@keyframes ev-spin{to{rotate:360deg}}
@keyframes ev-sparkle{0%,100%{scale:.4;opacity:.2}50%{scale:1.2;opacity:1}}
@keyframes ev-drip{from{transform:translateY(-50px);opacity:0}30%{opacity:1}to{transform:translateY(30px);opacity:0}}
@keyframes ev-shine{0%{scale:.3;opacity:0}40%{scale:1.2;opacity:1}100%{scale:1;opacity:0}}
@keyframes ev-fly{from{transform:translate(-60px,0)}25%{transform:translate(25vw,-30px)}50%{transform:translate(45vw,10px)}75%{transform:translate(65vw,-25px)}to{transform:translate(90vw,0)}}

/* Set the Table */
.ev-guests{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;min-height:44px}
.ev-guest{width:44px;height:44px;font-size:1.6rem;border-radius:14px}
.ev-guest.ev-now{outline:4px solid #fff;outline-offset:2px}
.ev-guest.ev-ok{--c:var(--good-bg);--d:var(--leaf-d)}
.ev-cloth{position:relative;width:100%;max-width:460px;margin:0 auto;aspect-ratio:10/8;border-radius:22px;
  background:repeating-linear-gradient(0deg,var(--ca) 0 22px,transparent 22px 44px),repeating-linear-gradient(90deg,var(--ca) 0 22px,transparent 22px 44px),var(--cb);
  box-shadow:0 7px 0 var(--card-edge),0 14px 26px rgba(0,0,0,.28)}
.ev-cloth::before{content:"";position:absolute;inset:8px;border-radius:16px;background:rgba(255,255,255,.55)}
.ev-for{position:absolute;left:0;right:0;bottom:4px;text-align:center;font:600 1rem var(--display);color:var(--ink-soft)}
.ev-spot{position:absolute;display:grid;place-items:center;padding:3px;border:0;background:none;cursor:pointer;border-radius:14px}
.ev-spot::after{content:"";position:absolute;inset:3px;border:3px dashed rgba(24,36,44,.4);border-radius:12px}
.ev-spot svg{width:100%;height:100%;opacity:.22;filter:grayscale(1)}
.ev-spot.ev-noghost svg{opacity:0}
.ev-spot.ev-filled{cursor:default}
.ev-spot.ev-filled::after{border-color:transparent}
.ev-spot.ev-filled svg{opacity:1;filter:none;animation:ev-bounce .45s cubic-bezier(.3,1.6,.5,1)}
.ev-tray{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;min-height:86px;padding:10px;border-radius:20px;background:rgba(0,0,0,.16);box-shadow:inset 0 4px 10px rgba(0,0,0,.2)}
.ev-tray .ev-item svg{filter:drop-shadow(0 2px 1px rgba(0,0,0,.2))}

/* Dress for the Weather */
.ev-scene{position:relative;overflow:hidden;border-radius:24px;min-height:150px;display:grid;grid-template-columns:auto 1fr;align-items:center;gap:10px;padding:14px 16px;
  box-shadow:0 7px 0 rgba(0,0,0,.2),0 14px 26px rgba(0,0,0,.28);color:var(--ink)}
.ev-wbig{font-size:clamp(4rem,20vw,5.4rem);line-height:1;animation:ev-float 3s ease-in-out infinite;position:relative;z-index:1}
.ev-wbig.ev-sun{animation:ev-spin 18s linear infinite}
.ev-wtext{font:600 clamp(1.3rem,5vw,1.7rem)/1.2 var(--display);position:relative;z-index:1;text-wrap:balance}
.ev-wtext small{display:block;font:400 1.05rem/1.3 var(--body);color:var(--ink-soft);margin-top:4px}
.ev-part{position:absolute;top:0;font-size:1.4rem;animation:ev-fall 2.2s linear infinite;pointer-events:none}
.ev-part.ev-wind{top:auto;left:0;animation:ev-blow 3s linear infinite}
.ev-case{display:flex;align-items:center;gap:10px;min-height:76px;padding:8px 12px;border-radius:20px;color:#fff;
  background:linear-gradient(180deg,rgba(255,255,255,.18),transparent 50%),#8A5A35;box-shadow:inset 0 0 0 4px #5A361C,0 6px 0 #4A2B15,0 10px 16px rgba(0,0,0,.3)}
.ev-case b{font:600 1.15rem var(--display);flex:none}
.ev-packed{display:flex;flex-wrap:wrap;gap:6px;flex:1;min-height:52px;align-items:center;padding:4px 8px;border-radius:14px;background:rgba(255,255,255,.18)}
.ev-packed span{font-size:2.3rem;line-height:1;animation:ev-bounce .45s cubic-bezier(.3,1.6,.5,1)}
.ev-case.ev-shut{animation:ev-bounce .6s}
.ev-rail{position:relative;padding:20px 6px 6px;display:flex;flex-wrap:wrap;justify-content:center;gap:16px 10px}
.ev-rail::before{content:"";position:absolute;left:0;right:0;top:4px;height:8px;border-radius:6px;background:linear-gradient(180deg,var(--brass),var(--brass-d))}
.ev-rail .ev-item{position:relative;min-width:76px}
.ev-rail .ev-item::before{content:"";position:absolute;top:-18px;left:50%;width:14px;height:16px;margin-left:-7px;border:3px solid var(--brass-d);border-bottom:0;border-radius:8px 8px 0 0}
.ev-item.ev-nah{opacity:.4}

/* Bake */
.ev-recipe{padding:10px 12px}
.ev-recipe h3{font-size:1.25rem;text-align:center;margin:0 0 6px}
.ev-steps{display:flex;flex-wrap:wrap;justify-content:center;gap:6px}
.ev-step{position:relative;display:grid;justify-items:center;width:56px;font:600 .8rem/1 var(--display);color:var(--ink-soft)}
.ev-step .ev-sp{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;font-size:1.8rem;background:#fff;box-shadow:0 3px 0 var(--card-edge)}
.ev-step .ev-sp svg{height:38px;width:auto}
.ev-step i{position:absolute;left:-2px;top:-4px;width:22px;height:22px;border-radius:50%;background:var(--sky);color:#fff;font:700 .85rem/22px var(--display);font-style:normal;text-align:center}
.ev-step.ev-did .ev-sp{background:var(--good-bg);opacity:.75}
.ev-step.ev-did i{background:var(--leaf)}
.ev-step.ev-next .ev-sp{outline:4px solid var(--sun);outline-offset:2px}
.ev-hidecard{display:grid;place-items:center;gap:8px;min-height:90px;text-align:center;font:600 1.2rem var(--display);color:var(--ink-soft)}
.ev-bowl{position:relative;display:grid;place-items:center;min-height:118px;border-radius:24px;background:rgba(0,0,0,.16);box-shadow:inset 0 4px 10px rgba(0,0,0,.2);padding:10px}
.ev-mix{display:flex;flex-wrap:wrap;justify-content:center;gap:4px;max-width:300px;font-size:2rem;line-height:1}
.ev-mix > span{display:grid;place-items:center;width:44px;height:44px;animation:drop .3s ease-out}
.ev-mix svg{height:40px;width:auto}
.ev-bowlic{font-size:2.6rem;opacity:.7}
.ev-result{display:grid;justify-items:center;gap:4px;animation:ev-bounce .8s cubic-bezier(.3,1.6,.5,1)}
.ev-result .ev-rbig{font-size:clamp(5rem,24vw,7rem);line-height:1;filter:drop-shadow(0 8px 6px rgba(0,0,0,.3))}
.ev-result .ev-rbig svg{width:clamp(110px,30vw,150px);height:auto}
.ev-result b{font:600 1.5rem var(--display)}
.ev-spark{position:absolute;font-size:1.8rem;animation:ev-sparkle 1.2s ease-in-out infinite}
.ev-pantry{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}

/* Garden */
.ev-garden{display:grid;grid-template-columns:repeat(var(--cols),1fr);gap:10px 8px;max-width:calc(var(--cols) * 150px);margin:0 auto;width:100%;
  padding:12px 10px 8px;border-radius:24px;background:linear-gradient(180deg,#BFE9FF 0 55%,#7CCB6B 55%);box-shadow:0 7px 0 #3C8A3E,0 14px 26px rgba(0,0,0,.28);position:relative;overflow:hidden}
.ev-pot{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:150px;border:0;background:none;padding:0;cursor:pointer;border-radius:16px}
.ev-pot.ev-sel{background:rgba(255,255,255,.25)}
.ev-pot .ev-plant{height:84px;display:flex;align-items:flex-end;justify-content:center;font-size:3.2rem;line-height:1;margin-bottom:-12px;position:relative;z-index:1}
.ev-pot .ev-plant.ev-s2{font-size:2.4rem}
.ev-pot .ev-plant.ev-s4{font-size:3.6rem}
.ev-pot .ev-plant.ev-bloom{font-size:4rem}
.ev-pot .ev-plant > span{display:block;transform-origin:50% 100%}
.ev-pot .ev-plant .ev-grow{animation:ev-bounce .7s cubic-bezier(.3,1.6,.5,1)}
.ev-pot svg.ev-potsvg{width:84px;height:66px;filter:drop-shadow(0 5px 0 rgba(0,0,0,.18))}
.ev-need{position:absolute;top:2px;right:2px;width:40px;height:40px;border-radius:50%;background:#fff;display:grid;place-items:center;font-size:1.4rem;box-shadow:0 3px 0 rgba(0,0,0,.2);z-index:2;animation:ev-float 2s ease-in-out infinite}
.ev-need svg{width:28px;height:28px}
.ev-fx{position:absolute;left:50%;top:30px;margin-left:-14px;font-size:1.6rem;pointer-events:none;z-index:3}
.ev-fx.ev-d{animation:ev-drip .7s ease-in forwards}
.ev-fx.ev-s{top:0;margin-left:-22px;font-size:2.6rem;animation:ev-shine 1s ease-out forwards}
.ev-tools{display:flex;justify-content:center;gap:12px;flex-wrap:wrap}
.ev-tool{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:92px;min-height:84px;padding:6px 10px;border-radius:20px;font:600 1rem var(--display);cursor:pointer;transition:transform .15s}
.ev-tool .ev-pic{font-size:2.4rem;height:46px;display:grid;place-items:center}
.ev-tool .ev-pic svg{height:46px;width:auto}
.ev-tool.ev-sel{transform:translateY(-8px);outline:5px solid #fff;outline-offset:3px}
.ev-flyer{position:absolute;left:0;font-size:2rem;animation:ev-fly 3.2s ease-in-out forwards;pointer-events:none;z-index:4}

/* Then and Now */
.ev-tn{position:relative;display:grid;grid-template-columns:1fr 1fr;column-gap:34px;row-gap:10px;max-width:560px;margin:0 auto;width:100%}
.ev-tnh{font:600 1.2rem var(--display);text-align:center;color:var(--on-table-soft)}
.ev-col{display:grid;gap:10px;align-content:start}
.ev-card{position:relative;z-index:2;display:flex;align-items:center;gap:6px;min-height:66px;padding:6px 8px;border-radius:16px;cursor:pointer;text-align:left;font:600 1.02rem/1.1 var(--display);transition:transform .15s}
.ev-card .ev-pic{flex:none;width:50px;height:50px;display:grid;place-items:center;font-size:2.3rem;line-height:1}
.ev-card .ev-pic svg{width:50px;height:50px}
.ev-card.ev-sel{transform:scale(1.05);outline:5px solid #fff;outline-offset:2px;z-index:3}
.ev-card.ev-matched{--c:var(--good-bg);--d:var(--leaf-d);cursor:default}
.ev-card .ev-badge{position:absolute;top:-8px;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:.9rem;color:#fff;box-shadow:0 2px 0 rgba(0,0,0,.25);animation:ev-bounce .4s}
.ev-col.ev-old .ev-badge{right:-8px}
.ev-col.ev-new .ev-badge{left:-8px}
.ev-lines{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:1}
.ev-lines line{stroke-width:7;stroke-linecap:round;stroke-dasharray:400;stroke-dashoffset:400;animation:ev-draw .5s ease-out forwards}
@keyframes ev-draw{to{stroke-dashoffset:0}}
.ev-chat{display:flex;gap:12px;align-items:center;padding:12px 14px;font:400 1.15rem/1.35 var(--body);animation:ev-bounce .5s}
.ev-chat .ev-cbig{font-size:2.4rem;flex:none}
`);

  /* =========================================================
     Shared pictures (simple chunky SVG)
     ========================================================= */
  const SILVER = 'fill="#CBD3DA" stroke="#7F8C98" stroke-width="2"', HANDLE = 'fill="#8A5A35" stroke="#5A361C" stroke-width="2"';
  const ART = {
    plate: (rim = '#45AEFF') => svg('0 0 100 100', `<circle cx="50" cy="50" r="46" fill="#fff" stroke="#BFAE8C" stroke-width="3"/><circle cx="50" cy="50" r="32" fill="#FFFDF7" stroke="${rim}" stroke-width="5"/>`),
    sideplate: (rim = '#45AEFF') => svg('0 0 100 100', `<circle cx="50" cy="50" r="44" fill="#fff" stroke="#BFAE8C" stroke-width="3"/><circle cx="50" cy="50" r="28" fill="#FFFDF7" stroke="${rim}" stroke-width="5"/><rect x="18" y="44" width="64" height="9" rx="4" ${SILVER}/>`),
    knife: () => svg('0 0 24 100', `<path d="M8 60 L8 10 Q9 2 15 4 Q17 6 17 14 L17 60 Z" ${SILVER}/><rect x="6" y="58" width="12" height="40" rx="6" ${HANDLE}/>`),
    fork: () => svg('0 0 24 100', `<path d="M4 4 V24 M9.5 4 V24 M14.5 4 V24 M20 4 V24" stroke="#7F8C98" stroke-width="3" stroke-linecap="round"/><path d="M3 22 Q3 38 12 40 Q21 38 21 22 Z" ${SILVER}/><rect x="10" y="38" width="4" height="22" fill="#CBD3DA"/><rect x="6" y="56" width="12" height="42" rx="6" ${HANDLE}/>`),
    spoon: () => svg('0 0 24 100', `<ellipse cx="12" cy="18" rx="10" ry="16" ${SILVER}/><rect x="10.5" y="33" width="3" height="24" fill="#CBD3DA"/><rect x="6" y="54" width="12" height="44" rx="6" ${HANDLE}/>`),
    dessert: () => svg('0 0 100 28', `<rect x="4" y="9" width="44" height="10" rx="5" ${HANDLE}/><rect x="46" y="12.5" width="22" height="3" fill="#CBD3DA"/><ellipse cx="80" cy="14" rx="15" ry="10" ${SILVER}/>`),
    napkin: (col = '#F25A95') => svg('0 0 40 100', `<rect x="4" y="6" width="32" height="88" rx="4" fill="${col}" stroke="rgba(0,0,0,.3)" stroke-width="2"/><path d="M4 6 L36 6 L4 42 Z" fill="rgba(255,255,255,.4)"/><path d="M4 70 H36" stroke="rgba(255,255,255,.6)" stroke-width="3" stroke-dasharray="4 4"/>`),
    cup: (rim = '#45AEFF') => svg('0 0 100 80', `<ellipse cx="50" cy="66" rx="44" ry="11" fill="#fff" stroke="#BFAE8C" stroke-width="3"/><path d="M70 30 Q88 28 86 42 Q84 54 68 52" fill="none" stroke="${rim}" stroke-width="6"/><path d="M20 20 H76 V34 Q76 62 48 62 Q20 62 20 34 Z" fill="#fff" stroke="#BFAE8C" stroke-width="3"/><path d="M20 26 H76" stroke="${rim}" stroke-width="6"/>`),
    glass: () => svg('0 0 50 100', `<path d="M8 6 H42 Q42 40 25 44 Q8 40 8 6 Z" fill="rgba(170,220,255,.8)" stroke="#5E8FB0" stroke-width="2.5"/><path d="M10 20 H40" stroke="#fff" stroke-width="2" opacity=".7"/><rect x="23" y="43" width="4" height="40" fill="#9CC3DD"/><ellipse cx="25" cy="88" rx="17" ry="6" fill="#BFE0F5" stroke="#5E8FB0" stroke-width="2"/>`),
    bag: (word, col, ink = '#18242C') => svg('0 0 80 100', `<path d="M14 18 L22 8 H58 L66 18 V92 Q66 96 62 96 H18 Q14 96 14 92 Z" fill="${col}" stroke="rgba(0,0,0,.35)" stroke-width="3"/><path d="M14 18 H66" stroke="rgba(0,0,0,.25)" stroke-width="3"/><rect x="18" y="44" width="44" height="24" rx="4" fill="#fff" opacity=".85"/><text x="40" y="61.5" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="${word.length > 5 ? 10.5 : 13}" fill="${ink}">${word}</text>`),
    tin: () => svg('0 0 100 70', `<ellipse cx="50" cy="52" rx="44" ry="13" fill="#7F8C98"/><rect x="6" y="22" width="88" height="30" fill="#AEB8C2"/><ellipse cx="50" cy="22" rx="44" ry="13" fill="#D7DEE5" stroke="#7F8C98" stroke-width="3"/><ellipse cx="50" cy="24" rx="36" ry="9" fill="#F1E3C4"/>`),
    oven: () => svg('0 0 100 100', `<rect x="8" y="6" width="84" height="88" rx="10" fill="#F2F2EE" stroke="#7F8C98" stroke-width="3"/><rect x="8" y="6" width="84" height="20" rx="8" fill="#CBD3DA"/><circle cx="26" cy="16" r="5" fill="#18242C"/><circle cx="44" cy="16" r="5" fill="#18242C"/><circle cx="74" cy="16" r="5" fill="#FF6B4A"/><rect x="18" y="36" width="64" height="46" rx="6" fill="#4A2B15"/><rect x="24" y="42" width="52" height="34" rx="4" fill="#FF9A3C" opacity=".85"/><rect x="18" y="30" width="64" height="5" rx="2" fill="#7F8C98"/>`),
    cases: () => svg('0 0 100 80', `<path d="M14 28 L26 74 H74 L86 28 Z" fill="#F25A95" stroke="#AE2A5F" stroke-width="3"/><path d="M26 28 L34 74 M38 28 L42 74 M50 28 V74 M62 28 L58 74 M74 28 L66 74" stroke="#AE2A5F" stroke-width="2.5"/><ellipse cx="50" cy="28" rx="36" ry="8" fill="#FFD1E3" stroke="#AE2A5F" stroke-width="3"/>`),
    cutter: () => svg('0 0 100 100', `<circle cx="50" cy="50" r="38" fill="none" stroke="#AEB8C2" stroke-width="12"/><circle cx="50" cy="50" r="38" fill="none" stroke="#7F8C98" stroke-width="3" stroke-dasharray="6 5"/>`),
    kettle: () => svg('0 0 100 100', `<path d="M24 34 Q22 20 50 18 Q78 20 76 34 L82 84 Q82 90 74 90 H26 Q18 90 18 84 Z" fill="#45AEFF" stroke="#1D70C0" stroke-width="3"/><path d="M18 52 L4 40" stroke="#1D70C0" stroke-width="8" stroke-linecap="round"/><path d="M34 18 Q50 0 66 18" fill="none" stroke="#18242C" stroke-width="6"/><circle cx="50" cy="16" r="5" fill="#18242C"/><path d="M30 46 Q36 40 40 46" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/>`),
    scone: () => svg('0 0 120 100', `<ellipse cx="60" cy="80" rx="52" ry="14" fill="#fff" stroke="#BFAE8C" stroke-width="3"/><path d="M18 72 Q18 52 60 52 Q102 52 102 72 Q102 82 60 82 Q18 82 18 72 Z" fill="#E1A85A" stroke="#A86A28" stroke-width="3"/><path d="M20 56 Q60 44 100 56 L100 50 Q60 38 20 50 Z" fill="#D9263E"/><path d="M22 50 Q30 36 44 42 Q52 30 64 40 Q76 30 86 42 Q98 40 98 50 Q60 40 22 50 Z" fill="#FFFBF0" stroke="#E6DCC6" stroke-width="2"/><path d="M24 44 Q24 22 60 20 Q96 22 96 44 Q60 36 24 44 Z" fill="#E9B468" stroke="#A86A28" stroke-width="3"/>`),
    seeds: () => svg('0 0 80 100', `<rect x="10" y="6" width="60" height="88" rx="6" fill="#FFF9EF" stroke="#C28A00" stroke-width="3"/><rect x="10" y="6" width="60" height="18" rx="6" fill="#FFC234"/><circle cx="40" cy="52" r="15" fill="#F25A95"/><circle cx="40" cy="52" r="6" fill="#FFC234"/><path d="M40 67 V86 M40 78 Q30 72 26 78 M40 80 Q50 74 54 80" stroke="#1F8C46" stroke-width="4" fill="none" stroke-linecap="round"/>`),
    can: () => svg('0 0 110 90', `<path d="M70 44 L104 18" stroke="#1F8C46" stroke-width="8" stroke-linecap="round"/><ellipse cx="104" cy="17" rx="5" ry="8" fill="#1F8C46" transform="rotate(-38 104 17)"/><rect x="18" y="32" width="56" height="50" rx="8" fill="#3CC46B" stroke="#1F8C46" stroke-width="3"/><path d="M26 32 Q46 6 66 32" fill="none" stroke="#1F8C46" stroke-width="7"/><path d="M18 46 Q4 50 8 66 Q12 76 18 72" fill="none" stroke="#1F8C46" stroke-width="6"/><rect x="24" y="40" width="44" height="7" rx="3" fill="rgba(255,255,255,.4)"/>`),
    pot: () => svg('0 0 100 80', `<rect x="6" y="4" width="88" height="16" rx="5" fill="#D86A3C" stroke="#9A4422" stroke-width="3"/><path d="M12 20 H88 L78 76 H22 Z" fill="#E07B4A" stroke="#9A4422" stroke-width="3"/><ellipse cx="50" cy="8" rx="38" ry="4" fill="#5A361C"/><path d="M26 30 L30 68" stroke="rgba(255,255,255,.35)" stroke-width="5" stroke-linecap="round"/>`, 'ev-potsvg'),
    seedpot: () => svg('0 0 100 80', `<rect x="6" y="4" width="88" height="16" rx="5" fill="#D86A3C" stroke="#9A4422" stroke-width="3"/><path d="M12 20 H88 L78 76 H22 Z" fill="#E07B4A" stroke="#9A4422" stroke-width="3"/><ellipse cx="50" cy="8" rx="38" ry="4" fill="#5A361C"/><ellipse cx="38" cy="6" rx="4" ry="2.5" fill="#E9C67E"/><ellipse cx="52" cy="5" rx="4" ry="2.5" fill="#E9C67E"/><ellipse cx="64" cy="7" rx="4" ry="2.5" fill="#E9C67E"/><path d="M26 30 L30 68" stroke="rgba(255,255,255,.35)" stroke-width="5" stroke-linecap="round"/>`, 'ev-potsvg'),
    /* Then and Now */
    gramophone: () => svg('0 0 100 100', `<rect x="10" y="64" width="62" height="28" rx="4" fill="#8A5A35" stroke="#4A2B15" stroke-width="3"/><ellipse cx="41" cy="64" rx="28" ry="6" fill="#222"/><circle cx="41" cy="64" r="3" fill="#FFC234"/><path d="M60 60 L62 46 L66 40" stroke="#A47A35" stroke-width="5" fill="none"/><path d="M64 44 L74 30 Q80 10 96 4 Q100 26 86 40 Q78 44 68 44 Z" fill="#E9C67E" stroke="#A47A35" stroke-width="3"/><path d="M96 4 Q100 26 86 40" fill="none" stroke="#A47A35" stroke-width="6"/><circle cx="76" cy="80" r="4" fill="#E9C67E"/><path d="M76 80 H88" stroke="#E9C67E" stroke-width="4"/>`),
    mangle: () => svg('0 0 100 100', `<rect x="14" y="20" width="8" height="62" fill="#3B3B3B"/><rect x="66" y="20" width="8" height="62" fill="#3B3B3B"/><rect x="10" y="16" width="68" height="8" rx="3" fill="#3B3B3B"/><rect x="16" y="32" width="56" height="13" rx="6.5" fill="#F1E3C4" stroke="#8A5A35" stroke-width="2.5"/><rect x="16" y="46" width="56" height="13" rx="6.5" fill="#F1E3C4" stroke="#8A5A35" stroke-width="2.5"/><circle cx="84" cy="40" r="13" fill="none" stroke="#3B3B3B" stroke-width="5"/><path d="M84 27 V53 M71 40 H97" stroke="#3B3B3B" stroke-width="3"/><path d="M94 32 L98 24" stroke="#8A5A35" stroke-width="5" stroke-linecap="round"/><rect x="8" y="80" width="72" height="12" rx="4" fill="#AEB8C2" stroke="#7F8C98" stroke-width="2"/>`),
    phonebox: () => svg('0 0 100 100', `<path d="M24 18 Q50 2 76 18 V96 H24 Z" fill="#E0312B" stroke="#8E1A16" stroke-width="3"/><rect x="28" y="20" width="44" height="9" rx="2" fill="#FFF9EF"/><text x="50" y="27.5" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="6.5" fill="#18242C">TELEPHONE</text><g fill="#FFF3CF" stroke="#8E1A16" stroke-width="2"><rect x="31" y="34" width="11" height="12"/><rect x="44.5" y="34" width="11" height="12"/><rect x="58" y="34" width="11" height="12"/><rect x="31" y="48" width="11" height="12"/><rect x="44.5" y="48" width="11" height="12"/><rect x="58" y="48" width="11" height="12"/><rect x="31" y="62" width="11" height="12"/><rect x="44.5" y="62" width="11" height="12"/><rect x="58" y="62" width="11" height="12"/></g><rect x="20" y="92" width="60" height="6" fill="#8E1A16"/>`),
    typewriter: () => svg('0 0 100 100', `<rect x="28" y="10" width="44" height="34" fill="#fff" stroke="#BFAE8C" stroke-width="2"/><path d="M34 20 H66 M34 27 H62 M34 34 H58" stroke="#7F8C98" stroke-width="2.5"/><rect x="14" y="36" width="72" height="10" rx="5" fill="#3B3B3B"/><path d="M12 48 H88 L96 88 Q96 92 92 92 H8 Q4 92 4 88 Z" fill="#2E5D4B" stroke="#183A2E" stroke-width="3"/><g fill="#F1E3C4">${[0,1,2,3,4,5,6].map(i => `<circle cx="${20 + i * 10}" cy="62" r="3.5"/>`).join('')}${[0,1,2,3,4,5,6].map(i => `<circle cx="${17 + i * 11}" cy="73" r="3.5"/>`).join('')}</g><rect x="32" y="80" width="36" height="6" rx="3" fill="#F1E3C4"/>`),
    lamp: () => svg('0 0 100 100', `<ellipse cx="50" cy="90" rx="30" ry="7" fill="#A47A35"/><path d="M28 88 Q24 64 50 62 Q76 64 72 88 Z" fill="#E9C67E" stroke="#A47A35" stroke-width="3"/><rect x="40" y="54" width="20" height="10" rx="3" fill="#A47A35"/><path d="M38 54 Q30 36 40 18 H60 Q70 36 62 54 Z" fill="rgba(220,240,255,.75)" stroke="#7F8C98" stroke-width="2.5"/><path d="M50 50 Q42 40 50 26 Q58 40 50 50 Z" fill="#FFC234"/><path d="M50 48 Q46 42 50 34 Q54 42 50 48 Z" fill="#FF6B4A"/><rect x="38" y="12" width="24" height="7" rx="3" fill="#7F8C98"/><path d="M30 6 Q50 -2 70 6" stroke="#3B3B3B" stroke-width="3" fill="none"/>`),
    wireless: () => svg('0 0 100 100', `<path d="M10 92 V40 Q10 8 50 8 Q90 8 90 40 V92 Z" fill="#9A6236" stroke="#4A2B15" stroke-width="3"/><path d="M22 66 V42 Q22 20 50 20 Q78 20 78 42 V66 Z" fill="#E8D6AE" stroke="#4A2B15" stroke-width="2.5"/><path d="M32 24 V66 M41 21 V66 M50 20 V66 M59 21 V66 M68 24 V66" stroke="#9A6236" stroke-width="3"/><rect x="26" y="72" width="48" height="8" rx="3" fill="#FFF3CF" stroke="#4A2B15" stroke-width="2"/><circle cx="24" cy="86" r="4.5" fill="#4A2B15"/><circle cx="76" cy="86" r="4.5" fill="#4A2B15"/>`),
    washer: () => svg('0 0 100 100', `<rect x="12" y="6" width="76" height="90" rx="10" fill="#FFFFFF" stroke="#7F8C98" stroke-width="3"/><rect x="12" y="6" width="76" height="18" rx="9" fill="#E3E9EE"/><circle cx="26" cy="15" r="4.5" fill="#45AEFF"/><rect x="40" y="11" width="28" height="8" rx="3" fill="#18242C"/><circle cx="50" cy="60" r="26" fill="#CBD3DA" stroke="#7F8C98" stroke-width="3"/><circle cx="50" cy="60" r="19" fill="#7FC8FF"/><path d="M31 64 Q40 56 50 64 Q60 72 69 62 V66 Q60 82 50 79 Q36 78 31 66 Z" fill="#45AEFF"/><circle cx="44" cy="54" r="3" fill="#fff"/><circle cx="56" cy="50" r="2" fill="#fff"/>`),
    cart: () => svg('0 0 100 100', `<text x="2" y="66" font-size="52">🐴</text><rect x="56" y="40" width="40" height="22" rx="3" fill="#C9874A" stroke="#7A4A28" stroke-width="3"/><path d="M40 52 H58" stroke="#7A4A28" stroke-width="4"/><circle cx="76" cy="70" r="14" fill="none" stroke="#5A361C" stroke-width="5"/><path d="M76 56 V84 M62 70 H90" stroke="#5A361C" stroke-width="3"/>`)
  };

  /* =========================================================
     1. SET THE TABLE
     ========================================================= */
  const TABLE_ITEMS = {
    plate: { name: 'dinner plate', art: c => ART.plate(c.rim), rule: 'The dinner plate goes in the middle.' },
    fork: { name: 'fork', art: () => ART.fork(), rule: 'Forks go on the left of the plate.' },
    knife: { name: 'knife', art: () => ART.knife(), rule: 'The knife goes on the right of the plate.' },
    spoon: { name: 'soup spoon', art: () => ART.spoon(), rule: 'The soup spoon goes on the right, beside the knife.' },
    cup: { name: 'cup and saucer', art: c => ART.cup(c.rim), rule: 'The cup and saucer sit at the top right.' },
    napkin: { name: 'napkin', art: c => ART.napkin(c.napkin), rule: 'The napkin goes on the far left, beside the fork.' },
    glass: { name: 'glass', art: () => ART.glass(), rule: 'The glass stands at the top, above the knife.' },
    dessert: { name: 'pudding spoon', art: () => ART.dessert(), rule: 'The pudding spoon lies across the top of the plate.' },
    sideplate: { name: 'side plate', art: c => ART.sideplate(c.rim), rule: 'The side plate goes at the top left, for your bread roll.' }
  };
  const TABLE_ORDER = ['plate', 'fork', 'knife', 'spoon', 'cup', 'napkin', 'glass', 'dessert', 'sideplate'];
  const BOTTOM = [['napkin', 17], ['fork', 17], ['plate', 32], ['knife', 17], ['spoon', 17]];
  const TOP = { sideplate: ['fork', 22], dessert: ['plate', 32], glass: ['knife', 17], cup: ['spoon', 19] };
  const GUESTS = [['👵', 'Grandma'], ['👴', 'Grandad'], ['👩', 'Mum'], ['👨', 'Dad'], ['👧', 'little Rosie'], ['👦', 'young Tom'], ['🧓', 'Auntie May'], ['👱', 'Uncle Jim']];
  const CLOTHS = [['#FFD6CC', '#FFF3EE', '#45AEFF', '#F25A95'], ['#CDEBFF', '#F2FAFF', '#F25A95', '#FFC234'], ['#D7F3DE', '#F4FCF6', '#FF9A3C', '#45AEFF'], ['#FFE9B3', '#FFFBEF', '#3CC46B', '#A98BFF'], ['#E7DDFF', '#F8F4FF', '#FF6B4A', '#3CC46B']];

  function layoutSetting(items) {
    const pos = {};
    const bottom = BOTTOM.filter(b => items.includes(b[0]));
    const total = bottom.reduce((a, b) => a + b[1], 0);
    let x = (100 - total) / 2;
    bottom.forEach(([k, w]) => { pos[k] = { x, w, y: 33, h: 57 }; x += w; });
    Object.entries(TOP).forEach(([k, [anchor, w]]) => {
      if (!items.includes(k)) return;
      const a = pos[anchor] || pos.plate;
      pos[k] = { x: Math.max(0, Math.min(100 - w, a.x + a.w / 2 - w / 2)), w, y: 3, h: 29 };
    });
    return pos;
  }

  function startTable(L, api) {
    L = lvl(L);
    const done = finisher(api);
    const capped = L >= 8;
    const nItems = Math.min(3 + (L - 1), 9);
    const settings = L >= 10 ? 3 : L >= 5 ? 2 : 1;
    const ghosts = L <= 6;
    const guests = shuffle(GUESTS.slice()).slice(0, settings);
    let si = 0, mistakes = 0, combo = 0;

    const wrap = el('div', 'ev-wrap');
    const strip = el('div', 'ev-guests');
    const cloth = el('div', 'ev-cloth');
    const tray = el('div', 'ev-tray');
    wrap.append(strip, cloth, tray);
    api.stage.append(wrap);

    function drawStrip() {
      strip.innerHTML = '';
      if (settings < 2) { strip.hidden = true; return; }
      guests.forEach((g, i) => strip.append(el('span', 'tile ev-guest ' + (i < si ? 'ev-ok' : 'c-card') + (i === si ? ' ev-now' : ''), i < si ? '✓' : g[0])));
    }

    function playSetting() {
      api.rounds(settings, si);
      drawStrip();
      const [ca, cb, rim, napkin] = CLOTHS[(si + randInt(CLOTHS.length)) % CLOTHS.length];
      const look = { rim, napkin };
      cloth.style.setProperty('--ca', ca); cloth.style.setProperty('--cb', cb);
      let items;
      if (capped) {
        const extras = shuffle(['napkin', 'glass', 'dessert', 'sideplate']).slice(0, 2 + randInt(3));
        items = TABLE_ORDER.filter(k => ['plate', 'fork', 'knife', 'spoon', 'cup'].includes(k) || extras.includes(k));
      } else items = TABLE_ORDER.slice(0, nItems);
      const pos = layoutSetting(items);
      cloth.innerHTML = '';
      const guest = guests[si];
      cloth.append(el('div', 'ev-for', settings > 1 ? `${guest[0]} A place for ${guest[1]}` : 'Lay a place for dinner'));
      const spots = {}, wrongs = {};
      let sel = null, placed = 0;
      items.forEach(k => {
        const p = pos[k];
        const s = el('button', 'ev-spot' + (ghosts ? '' : ' ev-noghost'), TABLE_ITEMS[k].art(look));
        s.type = 'button'; s.dataset.k = k; s.setAttribute('aria-label', 'Place for the ' + TABLE_ITEMS[k].name);
        s.style.cssText = `left:${p.x}%;width:${p.w}%;top:${p.y}%;height:${p.h}%`;
        s.onclick = () => tapSpot(k, s);
        spots[k] = s; cloth.append(s);
      });
      tray.innerHTML = '';
      const tiles = {};
      shuffle(items.slice()).forEach(k => {
        const b = el('button', 'tile c-card ev-item', `<span class="ev-pic">${TABLE_ITEMS[k].art(look)}</span>${TABLE_ITEMS[k].name}`);
        b.type = 'button'; b.dataset.k = k;
        b.onclick = () => {
          if (sel) tiles[sel].classList.remove('ev-sel');
          if (sel === k) { sel = null; api.hint('Tap something on the tray, then tap its place on the table.'); return; }
          sel = k; b.classList.add('ev-sel'); sfx.tap();
          api.hint(`Now tap where the ${TABLE_ITEMS[k].name} goes.`);
        };
        tiles[k] = b; tray.append(b);
      });
      api.hint(si === 0 ? 'Tap something on the tray, then tap its place on the table.' : `Now lay a place for ${guest[1]}.`);

      function tapSpot(k, s) {
        if (s.classList.contains('ev-filled')) return;
        if (!sel) { api.hint('First tap something on the tray, then tap its place.'); wob(tray); return; }
        if (sel !== k) {
          mistakes++; combo = 0; sfx.soft(); wob(tiles[sel]);
          wrongs[sel] = (wrongs[sel] || 0) + 1;
          api.hint(TABLE_ITEMS[sel].rule + (wrongs[sel] >= 2 ? ' Look for the glowing place.' : ''));
          if (wrongs[sel] >= 2) spots[sel].classList.add('ev-glow');
          return;
        }
        s.classList.remove('ev-glow'); s.classList.add('ev-filled'); s.disabled = true;
        tiles[k].classList.remove('ev-sel'); tiles[k].classList.add('ev-gone');
        const t = tiles[k]; api.later(() => t.remove(), 400);
        sel = null; placed++; combo++; chime(combo);
        if (placed < items.length) { api.hint(`${cheer()} What goes next?`); return; }
        si++;
        api.rounds(settings, si); drawStrip();
        api.later(() => { sfx.good(); }, 250);
        if (si < settings) {
          api.hint(`Lovely! That place is ready for ${guest[1]}.`);
          api.later(playSetting, 1500);
        } else {
          api.hint(settings > 1 ? 'The table is all laid. Dinner is served!' : 'Lovely! The table is laid. Dinner is served!');
          api.later(() => { fanfare(); wob(cloth); }, 500);
          api.later(() => done(starsFor(mistakes, 2, 5)), 1200);
        }
      }
    }
    playSetting();
  }

  /* =========================================================
     2. DRESS FOR THE WEATHER
     ========================================================= */
  const CLOTHES = {
    sunhat: ['👒', 'sun hat', 'S'], shades: ['🕶️', 'sunglasses', 'S'], shorts: ['🩳', 'shorts', 'S'], tshirt: ['👕', 'T-shirt', 'S'],
    dress: ['👗', 'summer dress', 'S'], sandals: ['🩴', 'sandals', 'S'], swim: ['🩱', 'swimsuit', 'S'], cap: ['🧢', 'cap', 'S'],
    scarf: ['🧣', 'scarf', 'W'], gloves: ['🧤', 'gloves', 'W'], coat: ['🧥', 'warm coat', 'W'], boots: ['🥾', 'snow boots', 'W'],
    socks: ['🧦', 'thick socks', 'W'], jumper: ['🧶', 'woolly jumper', 'W'], wellies: ['👢', 'wellies', 'W'], brolly: ['☂️', 'umbrella', 'W'],
    trousers: ['👖', 'trousers', 'N']
  };
  const WEATHER = [
    { id: 'hot', big: '☀️', sun: true, text: 'A hot, sunny day at the seaside', sub: 'Pack for the beach!', sky: 'linear-gradient(180deg,#8FD3FF,#FFE58A)', part: '',
      good: ['sunhat', 'shades', 'shorts', 'tshirt', 'dress', 'sandals', 'swim'] },
    { id: 'warm', big: '🌤️', text: 'A warm spring afternoon in the park', sub: 'Light and comfy.', sky: 'linear-gradient(180deg,#A9DEFF,#D8F5C8)', part: '🌸',
      good: ['shades', 'tshirt', 'dress', 'cap', 'trousers'] },
    { id: 'rain', big: '🌧️', text: 'A wet and rainy Monday', sub: 'Keep nice and dry.', sky: 'linear-gradient(180deg,#9DB0C0,#D5E0E8)', part: '💧',
      good: ['coat', 'wellies', 'brolly', 'trousers'] },
    { id: 'snow', big: '❄️', text: 'A snowy winter morning', sub: 'Wrap up warm!', sky: 'linear-gradient(180deg,#CFE6FA,#FFFFFF)', part: '❄️',
      good: ['scarf', 'gloves', 'coat', 'boots', 'socks', 'jumper'] },
    { id: 'wind', big: '💨', text: 'A blustery, windy day', sub: 'Hold on to your hat!', sky: 'linear-gradient(180deg,#B8D4E8,#E8F1F7)', part: '🍂', wind: true,
      good: ['scarf', 'coat', 'jumper', 'trousers'] },
    { id: 'chilly', big: '🍂', text: 'A chilly autumn day', sub: 'Something cosy.', sky: 'linear-gradient(180deg,#F6C98A,#FCEBD2)', part: '🍁',
      good: ['scarf', 'coat', 'jumper', 'trousers', 'socks'] }
  ];

  function startWeather(L, api) {
    L = lvl(L);
    const done = finisher(api);
    const total = Math.min(2 + Math.floor((L - 1) / 3), 4);
    const want = L === 1 ? 2 : L <= 3 ? 3 : Math.min(4, 3 + (L >= 8 ? 1 : 0));
    const nDis = Math.min(4, 2 + Math.floor((L - 1) / 2));
    const order = shuffle(WEATHER.slice());
    let round = 0, mistakes = 0;

    const wrap = el('div', 'ev-wrap');
    api.stage.append(wrap);

    function play() {
      api.rounds(total, round);
      const w = order[round % order.length];
      const summer = w.id === 'hot' || w.id === 'warm';
      const need = Math.min(want, w.good.length);
      const good = shuffle(w.good.slice()).slice(0, need);
      const bad = shuffle(Object.keys(CLOTHES).filter(k => CLOTHES[k][2] === (summer ? 'W' : 'S'))).slice(0, nDis);
      const opts = shuffle(good.concat(bad));
      wrap.innerHTML = '';
      const scene = el('div', 'ev-scene');
      scene.style.background = w.sky;
      if (w.part) for (let i = 0; i < 6; i++) {
        const p = el('span', 'ev-part' + (w.wind ? ' ev-wind' : ''), w.part);
        if (w.wind) p.style.top = (10 + i * 22) + 'px'; else p.style.left = (8 + i * 16) + '%';
        p.style.animationDelay = (i * .37) + 's'; scene.append(p);
      }
      scene.append(el('div', 'ev-wbig' + (w.sun ? ' ev-sun' : ''), w.big), el('div', 'ev-wtext', `${w.text}<small>${w.sub}</small>`));
      const suitcase = el('div', 'ev-case', '<b>🧳 Case</b>');
      const packed = el('div', 'ev-packed');
      suitcase.append(packed);
      const rail = el('div', 'ev-rail');
      let got = 0;
      opts.forEach(k => {
        const [pic, name] = CLOTHES[k];
        const b = el('button', 'tile c-card ev-item', `<span class="ev-pic">${pic}</span>${name}`);
        b.type = 'button';
        b.onclick = () => {
          if (good.includes(k)) {
            got++; chime(got); b.classList.add('ev-gone'); b.disabled = true;
            packed.append(el('span', '', pic));
            if (got < need) { api.hint(`${cheer()} ${need - got} more to pack for ${w.text.toLowerCase()}.`); return; }
            rail.querySelectorAll('.ev-item:not(.ev-gone)').forEach(x => { x.classList.add('ev-nah'); x.disabled = true; });
            suitcase.classList.add('ev-shut'); sfx.good();
            round++; api.rounds(total, round);
            if (round < total) { api.hint('All packed! Off you go. Let’s see what the weather does next.'); api.later(play, 1700); }
            else { api.hint('All packed for every kind of weather. Well dressed!'); api.later(() => done(starsFor(mistakes, 1, 3)), 1300); }
          } else {
            if (b.classList.contains('ev-nah')) return;
            mistakes++; sfx.soft(); wob(b); b.classList.add('ev-nah');
            api.hint(`The ${name} would ${summer ? 'keep you too warm' : 'leave you too chilly'} today. Try something ${summer ? 'cool and light' : 'warm and cosy'}.`);
          }
        };
        rail.append(b);
      });
      wrap.append(scene, suitcase, rail);
      api.hint(`What would you wear? Tap ${need} things that suit ${w.text.toLowerCase()}.`);
    }
    play();
  }

  /* =========================================================
     3. BAKE A CAKE
     ========================================================= */
  const PANTRY = {
    flour: [() => ART.bag('FLOUR', '#F4EBD9'), 'flour'], sugar: [() => ART.bag('SUGAR', '#CDEBFF'), 'sugar'], icing: [() => ART.bag('ICING', '#FFD1E3'), 'icing sugar'],
    butter: ['🧈', 'butter'], eggs: ['🥚', 'eggs'], milk: ['🥛', 'milk'], mix: ['🥣', 'mix it up'], whisk: ['🥣', 'whisk it'],
    tin: [() => ART.tin(), 'into the tin'], oven: [() => ART.oven(), 'into the oven'], cool: ['🌬️', 'let it cool'],
    jam: ['🍓', 'jam'], cream: ['🍦', 'cream'], candles: ['🕯️', 'candles'], sprinkles: ['🍬', 'sprinkles'], cases: [() => ART.cases(), 'paper cases'],
    cutter: [() => ART.cutter(), 'cut out rounds'], kettle: [() => ART.kettle(), 'boil the kettle'], warmpot: ['🫖', 'warm the pot'], leaves: ['🍃', 'tea leaves'],
    pour: ['💧', 'pour on the water'], brew: ['⏳', 'let it brew'], cup: ['☕', 'pour a cup'], biscuit: ['🍪', 'a biscuit'],
    bread: ['🍞', 'bread'], cheese: ['🧀', 'cheese'], cucumber: ['🥒', 'cucumber'], tomato: ['🍅', 'tomato'], lettuce: ['🥬', 'lettuce'], cut: ['🔪', 'cut in triangles'],
    plate: ['🍽️', 'onto a plate'], pan: ['🍳', 'into the pan'], lemon: ['🍋', 'lemon'], apples: ['🍎', 'apples'], peel: ['🔪', 'peel and chop'],
    dish: ['🥘', 'into the dish'], rub: ['🤲', 'rub together'], custard: ['🍮', 'custard']
  };
  const pantryPic = k => { const p = PANTRY[k][0]; return typeof p === 'function' ? p() : p; };
  const RECIPES = [
    { name: 'Victoria sponge', a: 'a Victoria sponge', res: '🍰', steps: ['?butter', '?sugar', 'flour', 'eggs', 'mix', 'tin', 'oven', '?cool', '?jam'] },
    { name: 'birthday cake', a: 'a birthday cake', res: '🎂', steps: ['?butter', '?sugar', 'eggs', 'flour', 'mix', 'tin', 'oven', '?icing', 'candles'] },
    { name: 'fairy cakes', a: 'some fairy cakes', res: '🧁', steps: ['?butter', 'sugar', 'eggs', 'flour', 'mix', 'cases', 'oven', '?icing', '?sprinkles'] },
    { name: 'scones', a: 'some scones', res: () => ART.scone(), steps: ['flour', '?butter', '?sugar', 'milk', 'mix', 'cutter', 'oven', '?jam', '?cream'] },
    { name: 'pot of tea', a: 'a pot of tea', res: '🫖', steps: ['kettle', '?warmpot', 'leaves', 'pour', '?brew', '?milk', 'cup', '?sugar', '?biscuit'] },
    { name: 'plate of sandwiches', a: 'a plate of sandwiches', res: '🥪', steps: ['bread', 'butter', '?cheese', '?cucumber', '?tomato', '?lettuce', 'cut', '?plate'] },
    { name: 'pancakes', a: 'some pancakes', res: '🥞', steps: ['flour', 'eggs', 'milk', 'whisk', 'pan', '?lemon', '?sugar'] },
    { name: 'apple crumble', a: 'an apple crumble', res: '🥧', steps: ['apples', '?peel', '?sugar', 'dish', 'flour', 'butter', '?rub', 'oven', '?custard'] }
  ];
  function recipeSteps(r, n) {
    const core = r.steps.filter(s => s[0] !== '?').length;
    let extra = Math.max(0, n - core);
    return r.steps.filter(s => s[0] !== '?' || extra-- > 0).map(s => s.replace('?', ''));
  }

  function startBake(L, api) {
    L = lvl(L);
    const done = finisher(api);
    const n = Math.min(4 + (L - 1), 9);
    const nDis = L <= 2 ? 0 : Math.min(4, L - 2);
    const showNext = L <= 2, hideCard = L >= 6;
    const r = pick(RECIPES);
    const steps = recipeSteps(r, n);
    const usedPics = steps.map(k => String(pantryPic(k)));
    const dis = shuffle(Object.keys(PANTRY).filter(k => !steps.includes(k) && !usedPics.includes(String(pantryPic(k))))).slice(0, nDis);
    let at = 0, mistakes = 0, wrongHere = 0, peeks = 0;

    const wrap = el('div', 'ev-wrap');
    const card = el('div', 'ev-panel ev-recipe');
    const bowl = el('div', 'ev-bowl');
    const mix = el('div', 'ev-mix', '<span class="ev-bowlic">🥣</span>');
    bowl.append(mix);
    const pantry = el('div', 'ev-pantry');
    wrap.append(card, bowl, pantry);
    api.stage.append(wrap);
    api.rounds(steps.length, 0);

    let cardOpen = true, firstLook = hideCard;
    function drawCard() {
      card.innerHTML = '';
      if (!cardOpen) {
        const box = el('div', 'ev-hidecard', `📖 The recipe card is put away.`);
        box.append(mkBtn('👀 Peek at the recipe', 'c-sky', () => { peeks++; sfx.tap(); cardOpen = true; drawCard(); api.later(() => { cardOpen = false; drawCard(); }, 3500); }));
        card.append(box); return;
      }
      card.append(el('h3', '', `Recipe: ${r.name}`));
      const row = el('div', 'ev-steps');
      steps.forEach((k, i) => row.append(el('div', 'ev-step' + (i < at ? ' ev-did' : '') + (showNext && i === at ? ' ev-next' : ''), `<i>${i < at ? '✓' : i + 1}</i><span class="ev-sp">${pantryPic(k)}</span>${PANTRY[k][1]}`)));
      card.append(row);
      if (firstLook) { const go = el('div', 'ev-row'); go.style.marginTop = '8px'; card.append(go); go.append(mkBtn('I’ve read it. Let’s bake!', 'c-leaf', () => { sfx.tap(); firstLook = false; cardOpen = false; drawCard(); pantry.hidden = false; api.hint('Tap what comes first. Peek at the recipe if you need to.'); })); }
    }

    const tiles = {};
    shuffle(steps.concat(dis)).forEach(k => {
      const b = el('button', 'tile c-card ev-item', `<span class="ev-pic">${pantryPic(k)}</span>${PANTRY[k][1]}`);
      b.type = 'button';
      b.onclick = () => tap(k, b);
      tiles[k] = b; pantry.append(b);
    });
    pantry.hidden = firstLook;
    drawCard();
    api.hint(firstLook ? `Let’s make ${r.a}! Have a good look at the recipe, then tap the green button.` : `Let’s make ${r.a}! Tap each thing in the order on the recipe card.`);

    function tap(k, b) {
      if (k === steps[at]) {
        b.classList.remove('ev-glow'); b.classList.add('ev-gone'); b.disabled = true;
        mix.querySelector('.ev-bowlic')?.remove();
        mix.append(el('span', '', pantryPic(k)));
        at++; wrongHere = 0; chime(at); api.rounds(steps.length, at);
        if (cardOpen) drawCard();
        if (at < steps.length) { api.hint(`${cheer()} ${at === steps.length - 1 ? 'Just one more step.' : 'What comes next?'}`); return; }
        reveal();
        return;
      }
      mistakes++; wrongHere++; sfx.soft(); wob(b);
      api.hint(steps.includes(k) ? 'Not yet. That comes later. What comes next on the recipe?' : `We don’t need ${PANTRY[k][1]} for this recipe. Try something else.`);
      if (wrongHere >= 2) tiles[steps[at]].classList.add('ev-glow');
    }
    function reveal() {
      pantry.querySelectorAll('.ev-item').forEach(x => { x.disabled = true; x.style.opacity = '.4'; });
      api.hint(r.name === 'pot of tea' ? 'Pop the kettle on...' : 'Into the oven it goes... smells lovely!');
      api.later(() => {
        bowl.innerHTML = '';
        const res = typeof r.res === 'function' ? r.res() : r.res;
        bowl.append(el('div', 'ev-result', `<span class="ev-rbig">${res}</span><b>Your ${r.name}!</b>`));
        [['8%', '12%'], ['84%', '10%'], ['14%', '68%'], ['80%', '64%']].forEach(([x, y], i) => {
          const s = el('span', 'ev-spark', '✨'); s.style.left = x; s.style.top = y; s.style.animationDelay = (i * .25) + 's'; bowl.append(s);
        });
        fanfare();
        api.hint(`Ta-da! ${r.a[0].toUpperCase() + r.a.slice(1)}, all ready. Who would you share it with?`);
        api.later(() => done(starsFor(mistakes + Math.floor(peeks / 2), 1, 4)), 2200);
      }, 1100);
    }
  }

  /* =========================================================
     4. GARDEN GROW
     ========================================================= */
  const BLOOMS = ['🌻', '🌷', '🌹', '🌼', '🌸', '🪻', '🌺', '🥕', '🍅', '🥬', '🎃', '🍓'];
  const TOOLS = { seeds: ['seeds', () => ART.seeds()], water: ['water', () => ART.can()], sun: ['sunshine', () => '☀️'] };

  function startGarden(L, api) {
    L = lvl(L);
    const done = finisher(api);
    const nPots = Math.min([2, 3, 3, 4, 5][L - 1] || 6, 6);
    const plan = L <= 2 ? ['seeds', 'water', 'sun'] : L <= 5 ? ['seeds', 'water', 'sun', 'water'] : ['seeds', 'water', 'sun', 'water', 'sun'];
    const showNeeds = L <= 4;
    const kinds = shuffle(BLOOMS.slice()).slice(0, nPots);
    const pots = kinds.map(k => ({ k, st: 0, shown: showNeeds }));
    let tool = null, mistakes = 0, grown = 0, combo = 0;

    const wrap = el('div', 'ev-wrap');
    const garden = el('div', 'ev-garden');
    garden.style.setProperty('--cols', nPots === 4 ? 2 : Math.min(nPots, 3));
    const tools = el('div', 'ev-tools');
    wrap.append(garden, tools);
    api.stage.append(wrap);
    api.rounds(nPots, 0);

    const toolBtns = {};
    Object.entries(TOOLS).forEach(([k, [name, art]]) => {
      const b = el('button', 'tile c-' + (k === 'seeds' ? 'sun' : k === 'water' ? 'sky' : 'orange') + ' ev-tool', `<span class="ev-pic">${art()}</span>${name}`);
      b.type = 'button';
      b.onclick = () => {
        sfx.tap(); tool = tool === k ? null : k;
        Object.values(toolBtns).forEach(x => x.classList.remove('ev-sel'));
        if (tool) { b.classList.add('ev-sel'); api.hint(k === 'seeds' ? 'Now tap an empty pot to sow the seeds.' : k === 'water' ? 'Now tap a pot to give it a drink.' : 'Now tap a pot to give it some sunshine.'); }
      };
      toolBtns[k] = b; tools.append(b);
    });

    const potEls = pots.map((p, i) => {
      const b = el('button', 'ev-pot'); b.type = 'button';
      b.onclick = () => tapPot(i);
      garden.append(b); return b;
    });
    function plantHtml(p) {
      const last = plan.length;
      if (p.st === 0 || p.st === 1) return '';
      if (p.st >= last) return p.k;
      return p.st === 2 ? '🌱' : '🌿';
    }
    function drawPot(i, grow) {
      const p = pots[i], b = potEls[i], last = plan.length;
      const cls = p.st >= last ? 'ev-bloom' : p.st === 2 ? 'ev-s2' : p.st >= 4 ? 'ev-s4' : '';
      const need = p.st < last && p.shown ? `<span class="ev-need">${TOOLS[plan[p.st]][1]()}</span>` : '';
      b.innerHTML = `${need}<span class="ev-plant ${cls}"><span class="${grow ? 'ev-grow' : ''}">${plantHtml(p)}</span></span>${p.st >= 1 ? ART.seedpot() : ART.pot()}`;
      b.setAttribute('aria-label', p.st >= last ? 'A pot, fully grown' : p.st === 0 ? 'An empty pot' : 'A growing pot');
    }
    pots.forEach((_, i) => drawPot(i));
    api.hint('Tap the seeds, then tap a pot to plant them.');

    function tapPot(i) {
      const p = pots[i], b = potEls[i], last = plan.length;
      if (p.busy) return;
      if (p.st >= last) { api.hint('That one is all grown. Isn’t it lovely? Try another pot.'); return; }
      if (!tool) { api.hint('Pick the seeds, the watering can or the sunshine first.'); Object.values(toolBtns).forEach(wob); return; }
      const want = plan[p.st];
      if (tool !== want) {
        mistakes++; combo = 0; sfx.soft(); p.shown = true; drawPot(i); wob(b);
        api.hint(want === 'seeds' ? 'This pot needs some seeds first.' : want === 'water' ? 'This pot is thirsty. It needs some water.' : 'This pot would love some sunshine.');
        return;
      }
      if (tool === 'water') for (let d = 0; d < 3; d++) {
        const fx = el('span', 'ev-fx ev-d', '💧'); fx.style.marginLeft = (-30 + d * 18) + 'px'; fx.style.animationDelay = (d * .12) + 's'; b.append(fx);
      }
      if (tool === 'sun') b.append(el('span', 'ev-fx ev-s', '☀️'));
      if (tool === 'seeds') tone(330, .12, 'triangle', .1);
      combo++; p.busy = true;
      api.later(() => {
        p.busy = false; p.st++; drawPot(i, true); chime(combo);
        if (p.st >= last) {
          grown++; api.rounds(nPots, grown);
          api.later(() => sfx.good(), 200);
          if (grown === nPots) return finish();
          api.hint(`${cheer()} It has grown into ${/[🥕🍅🥬🎃🍓]/u.test(p.k) ? 'something tasty' : 'a beautiful flower'}!`);
        } else {
          api.hint(pick(['It’s growing!', 'Look, it’s coming up!', 'Lovely. Keep going.', 'Growing nicely.']));
        }
      }, tool === 'seeds' ? 150 : 600);
    }
    function finish() {
      api.hint('What a beautiful garden! The butterflies and bees have come to visit.');
      ['🦋', '🐝', '🦋'].forEach((f, j) => api.later(() => {
        const fl = el('span', 'ev-flyer', f); fl.style.top = (20 + j * 30) + '%'; garden.append(fl);
      }, j * 450));
      api.later(fanfare, 300);
      api.later(() => done(starsFor(mistakes, 3, 8)), 2600);
    }
  }

  /* =========================================================
     5. THEN AND NOW
     ========================================================= */
  const THENNOW = [
    { old: ['gramophone', () => ART.gramophone()], now: ['radio', '📻'], clue: 'A gramophone played music from records.', ask: 'Did you ever wind up a gramophone? What records did you play?' },
    { old: ['mangle', () => ART.mangle()], now: ['washing machine', () => ART.washer()], clue: 'A mangle squeezed the water out of the washing.', ask: 'Did you ever turn a mangle on wash day? Who did the washing in your house?' },
    { old: ['telephone box', () => ART.phonebox()], now: ['mobile phone', '📱'], clue: 'You went to the telephone box to make a call.', ask: 'Did you ever ring someone from a red telephone box? Who did you call?' },
    { old: ['typewriter', () => ART.typewriter()], now: ['computer', '💻'], clue: 'A typewriter was for typing letters.', ask: 'Did you ever use a typewriter? Did it go “ding” at the end of each line?' },
    { old: ['oil lamp', () => ART.lamp()], now: ['light bulb', '💡'], clue: 'An oil lamp lit up the room.', ask: 'Did you ever read by an oil lamp? What was it like when the electric lights came?' },
    { old: ['horse and cart', () => ART.cart()], now: ['car', '🚗'], clue: 'A horse and cart carried people and goods.', ask: 'Do you remember the milkman’s or the coalman’s horse and cart?' },
    { old: ['wireless set', () => ART.wireless()], now: ['television', '📺'], clue: 'Families gathered round the wireless for the news and shows.', ask: 'Did your family gather round the wireless? What did you listen to?' },
    { old: ['fountain pen', '🖋️'], now: ['biro', '🖊️'], clue: 'A fountain pen was filled with ink.', ask: 'Did you write with a fountain pen at school? Was it inky?' },
    { old: ['candle', '🕯️'], now: ['torch', '🔦'], clue: 'You carried a candle to light your way.', ask: 'Did you ever go up to bed by candlelight?' },
    { old: ['letter', '✉️'], now: ['email', '📧'], clue: 'A letter came by post.', ask: 'Did you ever write letters to a pen friend or a sweetheart?' },
    { old: ['steam train', '🚂'], now: ['fast train', '🚄'], clue: 'A steam train puffed along the line.', ask: 'Did you ever travel on a steam train? Where did you go?' },
    { old: ['ocean liner', '🚢'], now: ['aeroplane', '✈️'], clue: 'People crossed the ocean on a big ship.', ask: 'Did you ever go on a big ship? Where were you off to?' }
  ];
  const LINE_COLS = [['#FF6B4A', '●'], ['#45AEFF', '★'], ['#FFC234', '▲'], ['#3CC46B', '■'], ['#F25A95', '♥'], ['#A98BFF', '◆']];
  const picOf = p => typeof p === 'function' ? p() : p;

  function startThenNow(L, api) {
    L = lvl(L);
    const done = finisher(api);
    const n = Math.min([3, 4, 5, 5][L - 1] || 6, 6);
    const core = shuffle(THENNOW.slice(0, 8)), extra = shuffle(THENNOW.slice(8));
    const pairs = shuffle(L <= 3 ? core.slice(0, n) : core.slice(0, n - 1 - randInt(2)).concat(extra).slice(0, n));
    let sel = null, mistakes = 0, matched = 0;

    const wrap = el('div', 'ev-wrap');
    const board = el('div', 'ev-tn');
    const lines = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    lines.setAttribute('class', 'ev-lines');
    const oldCol = el('div', 'ev-col ev-old'), newCol = el('div', 'ev-col ev-new');
    board.append(el('div', 'ev-tnh', 'Then'), el('div', 'ev-tnh', 'Now'), oldCol, newCol, lines);
    const chat = el('div', '');
    wrap.append(board, chat);
    api.stage.append(wrap);
    api.rounds(n, 0);

    const cards = [];
    const mkCard = (pi, side) => {
      const [name, pic] = pairs[pi][side];
      const b = el('button', 'tile c-' + (side === 'old' ? 'peach' : 'card') + ' ev-card', `<span class="ev-pic">${picOf(pic)}</span><span>${name}</span>`);
      b.type = 'button';
      const c = { pi, side, b, done: false };
      b.onclick = () => tap(c);
      cards.push(c); return b;
    };
    shuffle(pairs.map((_, i) => i)).forEach(i => oldCol.append(mkCard(i, 'old')));
    shuffle(pairs.map((_, i) => i)).forEach(i => newCol.append(mkCard(i, 'now')));
    api.hint('Tap something from the old days, then tap the thing we use now.');

    function tap(c) {
      if (c.done) return;
      if (!sel || sel.side === c.side) {
        if (sel) sel.b.classList.remove('ev-sel');
        if (sel === c) { sel = null; return; }
        sel = c; c.b.classList.add('ev-sel'); sfx.tap();
        api.hint(c.side === 'old' ? `What do we use now instead of a ${pairs[c.pi].old[0]}?` : `What did people use before the ${pairs[c.pi].now[0]}?`);
        return;
      }
      const a = sel.side === 'old' ? sel : c, z = sel.side === 'old' ? c : sel;
      if (a.pi !== z.pi) {
        mistakes++; sfx.soft(); wob(c.b);
        api.hint(`Not quite. ${pairs[a.pi].clue} Which one does that job now?`);
        return;
      }
      sel.b.classList.remove('ev-sel'); sel = null;
      [a, z].forEach(x => { x.done = true; x.b.classList.add('ev-matched', 'ev-pop'); });
      const [col, sym] = LINE_COLS[matched % LINE_COLS.length];
      [a, z].forEach(x => { const s = el('span', 'ev-badge', sym); s.style.background = col; x.b.append(s); });
      drawLine(a.b, z.b, col);
      matched++; chime(matched); api.rounds(n, matched);
      const p = pairs[a.pi];
      chat.innerHTML = '';
      const talk = el('div', 'ev-panel ev-chat', `<span class="ev-cbig">💬</span><span><b>${p.old[0][0].toUpperCase() + p.old[0].slice(1)} → ${p.now[0]}.</b> ${p.ask}</span>`);
      chat.append(talk);
      if (matched < n) { api.hint(`${cheer()} Have a little chat, then find the next pair.`); return; }
      sfx.good();
      api.hint('All matched! Have a chat about the old days, then tap Finished.');
      const row = el('div', 'ev-row');
      row.style.marginTop = '12px';
      row.append(mkBtn('✓ Finished', 'c-leaf', () => { sfx.tap(); fanfare(); done(starsFor(mistakes, 1, 3)); }));
      chat.append(row);
    }
    function drawLine(ab, zb, col) {
      const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('x1', ab.offsetLeft + ab.offsetWidth - 6); ln.setAttribute('y1', ab.offsetTop + ab.offsetHeight / 2);
      ln.setAttribute('x2', zb.offsetLeft + 6); ln.setAttribute('y2', zb.offsetTop + zb.offsetHeight / 2);
      ln.setAttribute('stroke', col);
      lines.append(ln);
    }
  }

  /* ---------- register ---------- */
  [
    { id: 'table', order: 9, name: 'Set the Table', icon: '🍽️', desc: 'Lay the knives, forks and plates in place', start: startTable },
    { id: 'weather', order: 10, name: 'Dress for the Weather', icon: '🧣', desc: 'Pick the right clothes for the day', start: startWeather },
    { id: 'bake', order: 11, name: 'Bake a Cake', icon: '🎂', desc: 'Follow a picture recipe step by step', start: startBake },
    { id: 'garden', order: 12, name: 'Garden Grow', icon: '🌻', desc: 'Plant, water and watch your garden grow', start: startGarden },
    { id: 'thennow', order: 13, name: 'Then and Now', icon: '📻', desc: 'Match old things to the ones we use now', start: startThenNow }
  ].forEach(g => register(Object.assign({ cat: 'gentle', gentle: true }, g)));
})();
