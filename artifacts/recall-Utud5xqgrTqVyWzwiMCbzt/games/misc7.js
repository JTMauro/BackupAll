/* Recall: misc7. Bird Feeder, Breathe with the Balloon, Chair Exercises (relax); Capital Cities, Saying Meanings (words). */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor, store } = R;

  R.css(`
.m7-wrap{display:flex; flex-direction:column; align-items:center; gap:12px; width:100%; max-width:760px; margin:0 auto; color:var(--on-table)}
.m7-row{display:flex; flex-wrap:wrap; justify-content:center; gap:10px; width:100%}
.m7-row .btn{min-height:60px; font-size:1.15rem; padding:.4em .9em}
.m7-fin{flex:1 1 170px; max-width:340px}
.m7-note{background:#FFF3C4; color:var(--ink); border-radius:16px; padding:8px 14px; font:700 1.25rem/1.3 var(--body); text-align:center; box-shadow:0 4px 0 #D9C27A; width:100%; max-width:560px; box-sizing:border-box}

/* ---- Bird Feeder ---- */
.m7-bf{display:grid; grid-template-columns:1fr; gap:12px; width:100%; max-width:820px; margin:0 auto}
@media (min-width:700px){ .m7-bf{grid-template-columns:1.35fr 1fr; align-items:start} }
.m7-scene{display:block; width:100%; height:auto; border-radius:22px; background:#BFE6FF; user-select:none; -webkit-user-select:none; touch-action:manipulation;
  box-shadow:0 0 0 5px rgba(255,255,255,.2), 0 9px 0 5px rgba(0,0,0,.22), 0 18px 30px rgba(0,0,0,.3)}
.m7-side{display:flex; flex-direction:column; gap:12px}
.m7-food{display:grid; grid-template-columns:repeat(3, 1fr); gap:9px}
.m7-food .btn{flex-direction:column; gap:3px; min-height:76px; font-size:1.12rem; padding:.3em .2em}
.m7-food .btn b{font-size:1.75rem; line-height:1}
.m7-seen{background:rgba(0,0,0,.2); border-radius:18px; padding:8px 10px 10px}
.m7-seen h4{margin:0 0 6px; font:600 1.3rem var(--display); color:var(--on-table)}
.m7-chips{display:flex; flex-wrap:wrap; gap:7px}
.m7-chip{display:inline-flex; align-items:center; gap:3px; background:var(--card); color:var(--ink); border:0; border-radius:999px; padding:2px 12px 2px 4px; min-height:44px;
  font:700 1.2rem var(--body); box-shadow:0 3px 0 var(--card-edge); animation:bounceIn .5s; cursor:pointer}
.m7-chip svg{width:40px; height:34px}
.m7-none{font:1.2rem/1.3 var(--body); color:var(--on-table-soft)}
.m7-b{transition:transform 1.9s cubic-bezier(.35,.75,.4,1)}
.m7-b .m7-lbl{opacity:0; transition:opacity .5s}
.m7-b.m7-here .m7-lbl{opacity:1}
.m7-bp{transform-box:fill-box; transform-origin:65% 95%}
.m7-peck .m7-bp{animation:m7-peck 1.3s ease-in-out infinite}
.m7-hop .m7-bp{animation:m7-hop .5s ease-in-out 2}
.m7-wing{transform-box:fill-box; transform-origin:30% 30%}
.m7-fly .m7-wing{animation:m7-flap .16s linear infinite alternate}
@keyframes m7-peck{0%,45%,100%{transform:rotate(0)} 60%{transform:rotate(-24deg)} 72%{transform:rotate(-4deg)} 82%{transform:rotate(-22deg)}}
@keyframes m7-hop{50%{transform:translateY(-8px)}}
@keyframes m7-flap{from{transform:scaleY(1)} to{transform:scaleY(-.6)}}
.m7-layer{animation:drop .5s ease-out}

/* ---- Breathe ---- */
.m7-sky{position:relative; width:100%; max-width:440px; height:360px; border-radius:26px; overflow:hidden;
  background:linear-gradient(180deg, #DCD3F7 0%, #C9E4F5 60%, #D8F0E8 100%);
  box-shadow:0 0 0 5px rgba(255,255,255,.22), 0 9px 0 5px rgba(0,0,0,.18), 0 18px 30px rgba(0,0,0,.25)}
.m7-cloud{position:absolute; background:#fff; opacity:.55; border-radius:999px; filter:blur(1px); animation:m7-drift 40s linear infinite}
@keyframes m7-drift{from{transform:translateX(-30px)} 50%{transform:translateX(30px)} to{transform:translateX(-30px)}}
.m7-bwrap{position:absolute; left:50%; top:34px; width:190px; height:300px; margin-left:-95px; transform-origin:50% 42%; transform:scale(.5); transition:transform 1.2s ease-in-out}
.m7-ball{position:absolute; left:0; top:0; width:190px; height:220px; border-radius:50% 50% 47% 47% / 55% 55% 45% 45%;
  background:radial-gradient(circle at 32% 28%, #FFE4EE 0 8%, #F7A9C4 30%, #E6789F 70%, #C95883 100%);
  box-shadow:inset -14px -18px 30px rgba(120,30,70,.25), 0 14px 30px rgba(110,60,120,.25)}
.m7-knot{position:absolute; left:83px; top:214px; width:0; height:0; border-left:12px solid transparent; border-right:12px solid transparent; border-bottom:16px solid #C95883}
.m7-string{position:absolute; left:94px; top:228px}
.m7-glow{position:absolute; left:50%; top:50%; width:260px; height:260px; margin:-150px 0 0 -130px; border-radius:50%; background:radial-gradient(circle, rgba(255,255,255,.75), rgba(255,255,255,0) 65%); opacity:.4; transition:opacity 4s ease-in-out}
.m7-words{font:600 clamp(1.9rem, 7vw, 2.6rem)/1.15 var(--display); color:#fff; text-align:center; min-height:1.2em; transition:opacity .9s; text-shadow:0 2px 0 rgba(0,0,0,.15)}
.m7-sub{font:1.25rem/1.3 var(--body); color:var(--on-table-soft); text-align:center}
.m7-pick{display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:10px; width:100%; max-width:520px}
.m7-pick .btn{flex-direction:column; min-height:96px; font-size:clamp(.95rem, 3.6vw, 1.3rem); padding:.4em .3em; min-width:0}
.m7-pick .btn b{font-size:2.2rem; line-height:1}
.m7-calm{--c:#B9A8F0; --d:#7E6BC4}
.m7-calm2{--c:#A9DCEB; --d:#5FA3B8}

/* ---- Chair Exercises ---- */
.m7-cx{display:grid; grid-template-columns:1fr; gap:10px; width:100%; max-width:820px; margin:0 auto; color:var(--on-table)}
@media (min-width:700px){ .m7-cx{grid-template-columns:1.1fr 1fr; align-items:center} }
.m7-fig{display:block; width:100%; max-width:250px; height:auto; margin:0 auto; background:radial-gradient(circle at 50% 40%, #FFF9EF, #F3E3C6); border-radius:24px;
  box-shadow:0 0 0 5px rgba(255,255,255,.2), 0 8px 0 5px rgba(0,0,0,.2), 0 16px 26px rgba(0,0,0,.25)}
.m7-panel{display:flex; flex-direction:column; align-items:center; gap:10px; text-align:center}
.m7-top{display:flex; align-items:center; justify-content:center; gap:14px; width:100%}
.m7-top>div:last-child{text-align:left}
.m7-mv{font:600 clamp(1.6rem, 6vw, 2.1rem)/1.1 var(--display); color:#fff}
.m7-step{font:1.2rem var(--body); color:var(--on-table-soft)}
.m7-cnt{display:grid; place-items:center; flex:none; width:100px; height:100px; border-radius:28px; font:600 3rem var(--display); color:var(--ink); text-align:center}
.m7-cnt.m7-small{font-size:1.3rem; line-height:1.1; padding:6px}
.m7-cnt.m7-bump{animation:m7-bump .45s ease-out}
@keyframes m7-bump{40%{transform:scale(1.15)}}
.m7-fig g{transform-box:view-box}
.m7-sh{transition:transform .4s}
.m7-do-sh .m7-sh{animation:m7-shroll var(--beat) ease-in-out infinite}
@keyframes m7-shroll{0%,100%{transform:translate(0,0)} 30%{transform:translate(0,-11px)} 55%{transform:translate(0,-6px) scale(1, .98)} 75%{transform:translate(0,2px)}}
.m7-armL{transform-origin:84px 120px} .m7-armR{transform-origin:156px 120px}
.m7-do-arms .m7-armL{animation:m7-raiseL var(--beat) ease-in-out infinite}
.m7-do-arms .m7-armR{animation:m7-raiseR var(--beat) ease-in-out infinite}
@keyframes m7-raiseL{0%,100%{transform:rotate(0)} 45%,55%{transform:rotate(152deg)}}
@keyframes m7-raiseR{0%,100%{transform:rotate(0)} 45%,55%{transform:rotate(-152deg)}}
.m7-face{transition:transform .5s}
.m7-do-neck .m7-face{animation:m7-turn var(--beat) ease-in-out infinite}
@keyframes m7-turn{0%,100%{transform:translateX(0)} 25%,32%{transform:translateX(-9px)} 68%,75%{transform:translateX(9px)}}
.m7-hup{display:none}
.m7-do-hands .m7-hup{display:inline} .m7-do-hands .m7-armL, .m7-do-hands .m7-armR{display:none}
.m7-open{opacity:0} .m7-fist{opacity:1}
.m7-do-hands .m7-open{animation:m7-open var(--beat) steps(1) infinite}
.m7-do-hands .m7-fist{animation:m7-fist var(--beat) steps(1) infinite}
@keyframes m7-open{0%{opacity:0} 50%{opacity:1}}
@keyframes m7-fist{0%{opacity:1} 50%{opacity:0}}
.m7-do-march .m7-legL{animation:m7-march var(--beat) ease-in-out infinite}
.m7-do-march .m7-legR{animation:m7-march var(--beat) ease-in-out infinite; animation-delay:calc(var(--beat) / -2)}
@keyframes m7-march{0%,50%,100%{transform:translateY(0)} 25%{transform:translateY(-18px)}}
.m7-do-ankR .m7-legR, .m7-do-ankL .m7-legL{animation:m7-ankle var(--beat) linear infinite}
@keyframes m7-ankle{0%,100%{transform:translate(6px,-9px)} 25%{transform:translate(0,-15px)} 50%{transform:translate(-6px,-9px)} 75%{transform:translate(0,-4px)}}

/* ---- Quizzes ---- */
.m7-quiz{display:flex; flex-direction:column; gap:14px; width:100%; max-width:640px; margin:0 auto}
.m7-card{background:var(--card); color:var(--ink); border-radius:24px; padding:14px 16px; text-align:center;
  box-shadow:inset 0 -5px 0 rgba(0,0,0,.08), 0 6px 0 var(--card-edge), 0 12px 20px rgba(0,0,0,.25); animation:bounceIn .4s}
.m7-flag{font-size:3.6rem; line-height:1.05}
.m7-country{font:600 clamp(1.7rem, 6.5vw, 2.2rem)/1.1 var(--display)}
.m7-map{display:block; width:100%; max-width:360px; height:auto; margin:6px auto 0; border-radius:12px; background:#A9D8F2}
.m7-region{font:700 1.2rem var(--body); color:var(--ink-soft); margin-top:4px}
.m7-say{font:600 clamp(1.45rem, 5.6vw, 1.95rem)/1.25 var(--display); padding:6px 2px}
.m7-ask{font:1.2rem var(--body); color:var(--ink-soft); margin-top:4px}
.m7-opts{display:grid; grid-template-columns:1fr 1fr; gap:12px}
.m7-opts.m7-one{grid-template-columns:1fr}
.m7-opt{min-height:72px; font-size:clamp(1.25rem, 4.6vw, 1.55rem); line-height:1.15; padding:.45em .6em}
.m7-one .m7-opt{font:600 1.25rem/1.25 var(--body); min-height:68px; text-align:left; justify-content:flex-start}
.m7-opt.m7-no{opacity:.32; pointer-events:none}
.m7-opt.m7-yes{--c:var(--leaf); --d:var(--leaf-d); color:#fff}
.m7-fact{background:var(--good-bg); color:var(--ink); border-radius:20px; padding:14px 16px; font:1.25rem/1.35 var(--body); text-align:left;
  box-shadow:0 5px 0 #A9D9B8; animation:bounceIn .4s}
.m7-fact b{font-family:var(--display); font-weight:600}
.m7-next{align-self:center; min-width:200px; font-size:1.3rem}
`);

  register({ id: 'birdfeeder', cat: 'relax', gentle: true, order: 13, name: 'Bird Feeder', icon: '🐦', desc: 'Fill the feeder and watch the garden birds', start: startBirds });
  register({ id: 'breathe', cat: 'relax', gentle: true, order: 14, name: 'Breathe with the Balloon', icon: '🎈', desc: 'Slow, calm breathing with a gentle balloon', start: startBreathe });
  register({ id: 'chairex', cat: 'relax', gentle: true, order: 15, name: 'Chair Exercises', icon: '🪑', desc: 'Very gentle moves to do in your chair', start: startChair });
  register({ id: 'capitals', cat: 'words', order: 17, name: 'Capital Cities', icon: '🌍', desc: 'Pick the capital city of each country', start: startCapitals });
  register({ id: 'meanings', cat: 'words', order: 18, name: 'Saying Meanings', icon: '💬', desc: 'Match old sayings to what they mean', start: startMeanings });

  const rand = (a, b) => a + Math.random() * (b - a);
  const NS = 'http://www.w3.org/2000/svg';
  function finishBtn(api, label, parent, cls) {
    let fin = false;
    const b = el('button', 'btn c-mint m7-fin ' + (cls || ''), label); b.type = 'button';
    b.onclick = () => { if (fin) return; fin = true; sfx.good(); try { speechSynthesis.cancel(); } catch (e) { } api.done(3); };
    parent.append(b); return b;
  }
  function btn(parent, html, cls, fn) {
    const b = el('button', 'btn ' + cls, html); b.type = 'button'; b.onclick = () => fn(b); parent.append(b); return b;
  }
  /* a soft gliding note through the shared audio bus (falls back to R.tone) */
  function glide(f0, f1, dur, vol, delay = 0, type = 'sine') {
    const A = R.audio && R.audio();
    if (!A || !A.ctx || !A.bus) { tone(f0, dur, type, vol, delay); return null; }
    const { ctx, bus } = A, t = ctx.currentTime + delay + .01;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(.03, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + .05);
    return o;
  }

  /* =========================================================
     1. BIRD FEEDER
     ========================================================= */
  const FOODS = {
    seeds: { name: 'Seeds', icon: '🌻', col: '#C9A15E', cls: 'c-sun' },
    nuts: { name: 'Nuts', icon: '🥜', col: '#E4C48E', cls: 'c-peach' },
    fat: { name: 'Fat balls', icon: '🟤', col: '#A9824F', cls: 'c-orange' }
  };
  const BIRDS = {
    robin: { name: 'Robin', foods: ['fat', 'seeds'], spots: ['trayL', 'trayR', 'groundL', 'groundR'], fact: 'Robins sing all year round, even in winter.',
      back: '#8C6A48', belly: '#F3E9DA', wing: '#7A5A3C', head: '#8C6A48', tail: '#7A5A3C', beak: '#3B2F28', legs: '#9C7A5A',
      extra: '<ellipse cx="-15" cy="-22" rx="11" ry="13" fill="#EE6A2C"/>' },
    bluetit: { name: 'Blue tit', foods: ['nuts', 'fat', 'seeds'], spots: ['perchL', 'perchR'], fact: 'Blue tits can hang upside down to feed.', s: .85,
      back: '#8FB060', belly: '#F6D73A', wing: '#3E8EDB', head: '#FFFFFF', tail: '#3E8EDB', beak: '#2A2A2A', legs: '#6A7C93',
      extra: '<path d="M-24,-28 A10,10 0 0 1 -4,-28 Z" fill="#3E8EDB"/><path d="M-25,-29 L-5,-26" stroke="#1E2B4A" stroke-width="2.6"/><path d="M-6,-24 Q-14,-15 -22,-21" stroke="#1E2B4A" stroke-width="2.6" fill="none"/>' },
    goldfinch: { name: 'Goldfinch', foods: ['seeds'], spots: ['perchL', 'perchR'], fact: 'A group of goldfinches is called a charm.', s: .88,
      back: '#C9A57A', belly: '#F2E6D4', wing: '#1E1E1E', head: '#FFFFFF', tail: '#1E1E1E', beak: '#F1DCC0', legs: '#C7A88A',
      wingbar: '#F7D000', extra: '<path d="M-12,-38 A10,10 0 0 1 -4,-25 L-10,-26 Z" fill="#1E1E1E"/><circle cx="-21" cy="-28" r="6" fill="#D8262A"/>' },
    sparrow: { name: 'Sparrow', foods: ['seeds', 'fat'], spots: ['perchL', 'perchR', 'trayL', 'trayR', 'groundL', 'groundR'], fact: 'House sparrows love to chatter together in hedges.', s: .9,
      back: '#9A6B3F', belly: '#D2C8B6', wing: '#86592F', head: '#9A6B3F', tail: '#7A5230', beak: '#4A3E36', legs: '#B08A68', wingbar: '#F4EEE2',
      extra: '<path d="M-24,-29 A10,10 0 0 1 -6,-33 L-12,-30 Z" fill="#8E8E8E"/><circle cx="-17" cy="-25" r="5" fill="#D9D3C8"/><ellipse cx="-21" cy="-19" rx="4" ry="5" fill="#222"/><path d="M0,-24 l8,-3 M2,-19 l9,-3 M6,-27 l8,-2" stroke="#4E3420" stroke-width="2"/>' },
    blackbird: { name: 'Blackbird', foods: ['fat', 'seeds'], spots: ['groundL', 'groundR', 'trayL', 'trayR'], fact: 'Only the male blackbird is black. The female is brown.', s: 1.12,
      back: '#222226', belly: '#2E2E33', wing: '#18181B', head: '#222226', tail: '#18181B', beak: '#F5A300', legs: '#4A3A2A', ring: '#F5A300' },
    woodpecker: { name: 'Woodpecker', foods: ['nuts', 'fat'], spots: ['perchL', 'perchR'], fact: 'Woodpeckers drum on trees to send messages to each other.', s: 1.05, beakLen: 12,
      back: '#1C1C1C', belly: '#F1ECE2', wing: '#1C1C1C', head: '#F6F2EA', tail: '#1C1C1C', beak: '#3A3A3A', legs: '#5A5A5A', wingbar: '#FFFFFF',
      under: '<ellipse cx="8" cy="-6" rx="7" ry="5" fill="#D0202A"/>',
      extra: '<path d="M-24,-29 A10,10 0 0 1 -4,-29 Z" fill="#1C1C1C"/><circle cx="-6" cy="-31" r="4" fill="#D0202A"/><path d="M-6,-24 Q-14,-17 -24,-20" stroke="#1C1C1C" stroke-width="3" fill="none"/>' },
    cardinal: { name: 'Cardinal', foods: ['seeds'], spots: ['trayL', 'trayR', 'perchL', 'perchR', 'groundL', 'groundR'], fact: 'Male cardinals are bright red. Females are a softer brown.',
      back: '#D11F2A', belly: '#E0353E', wing: '#B5161F', head: '#D9242E', tail: '#A9141C', beak: '#F26B2A', legs: '#9C6A5A', crest: '#D9242E', beakW: 6,
      extra: '<path d="M-26,-33 Q-21,-31 -20,-25 Q-22,-19 -27,-20 Z" fill="#1A1A1A"/>' },
    bluejay: { name: 'Blue jay', foods: ['nuts', 'seeds'], spots: ['trayL', 'trayR', 'groundL', 'groundR'], fact: 'Blue jays can copy the call of a hawk.', s: 1.1,
      back: '#3D7FD6', belly: '#EEF1F5', wing: '#3D7FD6', head: '#3D7FD6', tail: '#3D7FD6', beak: '#222', legs: '#3A3A44', crest: '#3D7FD6', wingbar: '#FFFFFF',
      extra: '<circle cx="-17" cy="-25" r="6" fill="#F2F4F8"/><path d="M-7,-20 Q-16,-12 -25,-20" stroke="#111" stroke-width="2.6" fill="none"/><path d="M4,-22 l3,7 M9,-23 l3,7 M14,-22 l3,6" stroke="#111" stroke-width="2"/>' }
  };
  const BIRD_IDS = Object.keys(BIRDS);

  function birdArt(b) {
    const bl = b.beakLen || 8, bw = b.beakW || 4;
    return `<path d="M12,-15 L35,-6 L33,0 L10,-8 Z" fill="${b.tail}"/>` +
      `<path d="M-3,-5 L-5,1 M-7,1 L-2,1 M4,-5 L4,1 M1,1 L7,1" stroke="${b.legs}" stroke-width="2.4" stroke-linecap="round" fill="none"/>` +
      `<ellipse cx="0" cy="-16" rx="17" ry="13" fill="${b.back}"/>` +
      `<ellipse cx="-5" cy="-12" rx="12" ry="9" fill="${b.belly}"/>` + (b.under || '') +
      `<g class="m7-wing"><ellipse cx="5" cy="-17" rx="12" ry="7" transform="rotate(-14 5 -17)" fill="${b.wing}"/>` +
      (b.wingbar ? `<path d="M-2,-17 Q5,-14 13,-19" stroke="${b.wingbar}" stroke-width="3" fill="none" stroke-linecap="round"/>` : '') + '</g>' +
      (b.crest ? `<path d="M-15,-35 L-4,-47 L-7,-32 Z" fill="${b.crest}"/>` : '') +
      `<circle cx="-14" cy="-28" r="10" fill="${b.head}"/>` + (b.extra || '') +
      `<circle cx="-17" cy="-30" r="2.6" fill="#111" ${b.ring ? `stroke="${b.ring}" stroke-width="1.6"` : ''}/><circle cx="-17.8" cy="-30.8" r=".9" fill="#fff"/>` +
      `<path d="M-23,${-30 - bw / 2} L${-23 - bl},-28 L-23,${-26 + bw / 4} Z" fill="${b.beak}"/>`;
  }
  function birdIcon(id) {
    return `<svg viewBox="-36 -50 76 56" aria-hidden="true"><g>${birdArt(BIRDS[id])}</g></svg>`;
  }
  /* bird songs: [startHz, endHz, seconds, gapAfter] */
  const SONGS = {
    robin: [[3300, 2600, .12, .05], [2700, 3600, .1, .07], [2300, 2900, .14, .05], [3700, 3000, .09, .04], [2900, 2500, .16, 0]],
    bluetit: [[5000, 5300, .11, .07], [5000, 5300, .11, .07], [3200, 2600, .06, .04], [3200, 2600, .06, .04], [3200, 2600, .06, 0]],
    goldfinch: [[3600, 4300, .05, .03], [4100, 3500, .05, .03], [3300, 4400, .06, .03], [4500, 3800, .04, .03], [3700, 4200, .05, .04], [4000, 3400, .06, 0]],
    sparrow: [[2800, 3600, .08, .12], [3500, 2700, .08, .18], [2900, 3600, .08, .12], [3500, 2700, .08, 0]],
    blackbird: [[1700, 2200, .26, .06], [2200, 1900, .22, .05], [1600, 2100, .3, .08], [2400, 2000, .18, 0]],
    woodpecker: [[3000, 2100, .06, .3]],
    cardinal: [[4000, 2000, .22, .05], [4000, 2000, .22, .05], [2500, 3200, .09, .03], [2500, 3200, .09, .03], [2500, 3200, .09, 0]],
    bluejay: [[2600, 2000, .18, .12], [2600, 2000, .18, 0]]
  };
  function sing(id, vol = .045) {
    let t = 0; const type = id === 'blackbird' ? 'triangle' : 'sine';
    (SONGS[id] || SONGS.sparrow).forEach(([a, b, d, g]) => { glide(a, b, d, id === 'bluejay' ? vol * .8 : vol, t, id === 'bluejay' ? 'triangle' : type); t += d + g; });
    if (id === 'woodpecker') for (let k = 0; k < 9; k++) tone(300 - k * 6, .035, 'triangle', .06 - k * .004, t + k * .055);
  }
  const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };

  function startBirds(level, api) {
    const SPOT = {
      perchL: { x: 140, y: 150, flip: true }, perchR: { x: 220, y: 150, flip: false },
      trayL: { x: 150, y: 196, flip: true }, trayR: { x: 210, y: 196, flip: false },
      groundL: { x: 78, y: 270, flip: true }, groundR: { x: 284, y: 270, flip: false }
    };
    const season = ((level - 1) % 3 + 3) % 3;
    const grass = ['#7CCB5A', '#69BF4C', '#8BB34A'][season], hedge = ['#3E9A4E', '#2F8A45', '#7C9A3A'][season];
    const flowers = [['#FF8FA8', '#FFC234', '#FFFFFF'], ['#FF6B4A', '#A98BFF', '#FFC234'], ['#FF9A3C', '#C4432A', '#FFC234']][season];
    let fl = '';
    for (let k = 0; k < 12; k++) { const x = 22 + k * 29 + randInt(10), y = 244 + randInt(10); if (x > 125 && x < 235 && y < 252) continue; fl += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 14}" stroke="#2F7A3A" stroke-width="2"/><circle cx="${x}" cy="${y}" r="5" fill="${flowers[k % 3]}"/><circle cx="${x}" cy="${y}" r="1.8" fill="#FFE066"/>`; }

    const root = el('div', 'm7-bf'); api.stage.append(root);
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 360 300'); svg.setAttribute('class', 'm7-scene'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'A garden with a bird feeder');
    svg.innerHTML = `
<defs><linearGradient id="m7sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9FD6FF"/><stop offset="1" stop-color="#E4F5FF"/></linearGradient>
<clipPath id="m7tube"><rect x="162" y="62" width="36" height="128" rx="13"/></clipPath></defs>
<rect width="360" height="300" fill="url(#m7sky)"/>
<circle cx="300" cy="46" r="22" fill="#FFE68A" opacity=".85"/>
<g fill="#fff" opacity=".8"><ellipse cx="70" cy="50" rx="34" ry="11"/><ellipse cx="92" cy="42" rx="20" ry="11"/><ellipse cx="250" cy="90" rx="26" ry="8"/></g>
<path d="M0,215 Q30,180 70,200 Q110,175 150,205 L210,205 Q250,178 290,198 Q330,180 360,200 L360,250 L0,250 Z" fill="${hedge}"/>
<rect y="242" width="360" height="58" fill="${grass}"/>
<path d="M0,246 Q90,236 180,246 T360,244" stroke="rgba(255,255,255,.25)" stroke-width="3" fill="none"/>
${fl}
<path d="M-10,22 Q90,30 180,24 Q270,16 370,30" stroke="#6B4423" stroke-width="13" fill="none" stroke-linecap="round"/>
<g fill="${hedge}"><ellipse cx="60" cy="22" rx="14" ry="6" transform="rotate(-20 60 22)"/><ellipse cx="120" cy="32" rx="13" ry="6" transform="rotate(25 120 32)"/><ellipse cx="250" cy="16" rx="14" ry="6" transform="rotate(-15 250 16)"/><ellipse cx="315" cy="30" rx="13" ry="6" transform="rotate(20 315 30)"/></g>
<line x1="180" y1="24" x2="180" y2="52" stroke="#555" stroke-width="2.5"/>
<g class="m7-feeder">
  <path d="M154,62 Q180,38 206,62 Z" fill="#2F8A45"/><rect x="152" y="58" width="56" height="8" rx="4" fill="#257039"/>
  <rect x="162" y="62" width="36" height="128" rx="13" fill="rgba(235,248,255,.55)"/>
  <g class="m7-fill" clip-path="url(#m7tube)"></g>
  <rect x="162" y="62" width="36" height="128" rx="13" fill="none" stroke="#8DB8C8" stroke-width="3"/>
  <rect x="168" y="68" width="6" height="110" rx="3" fill="rgba(255,255,255,.55)"/>
  <rect x="128" y="146" width="104" height="6" rx="3" fill="#8A5A2B"/>
  <path d="M124,190 L236,190 L228,202 L132,202 Z" fill="#2F8A45"/><rect x="122" y="186" width="116" height="6" rx="3" fill="#257039"/>
</g>
<g class="m7-birds"></g>
<rect x="5" y="5" width="350" height="290" rx="18" fill="none" stroke="#F4EAD8" stroke-width="10"/>
<rect x="0" y="0" width="360" height="300" rx="22" fill="none" stroke="#B88A5A" stroke-width="5"/>`;
    root.append(svg);
    const fillG = svg.querySelector('.m7-fill'), birdsG = svg.querySelector('.m7-birds');

    const side = el('div', 'm7-side'); root.append(side);
    const food = el('div', 'm7-food'); side.append(food);
    const seenBox = el('div', 'm7-seen', '<h4>Birds seen today</h4>'), chips = el('div', 'm7-chips');
    seenBox.append(chips); side.append(seenBox);
    const ctl = el('div', 'm7-row'); side.append(ctl);
    finishBtn(api, '✓ I’m finished', ctl);

    let saved = store.get('m7-birds', null);
    if (!saved || saved.d !== todayKey()) saved = { d: todayKey(), list: [] };
    saved.list = saved.list.filter(id => BIRDS[id]);
    function drawSeen() {
      chips.innerHTML = '';
      if (!saved.list.length) { chips.append(el('div', 'm7-none', 'None yet. Fill the feeder and wait a moment.')); return; }
      saved.list.forEach(id => {
        const c = el('button', 'm7-chip', birdIcon(id) + BIRDS[id].name); c.type = 'button';
        c.onclick = () => { sing(id); api.hint(`${BIRDS[id].name}: ${BIRDS[id].fact}`); R.say(BIRDS[id].name); };
        chips.append(c);
      });
    }
    function markSeen(id) {
      if (saved.list.includes(id)) return false;
      saved.list.push(id); store.set('m7-birds', saved); drawSeen(); return true;
    }
    drawSeen();

    /* feeder contents: layers of { f: food, u: units left (1..3) } from the bottom up */
    const layers = [];
    const MAXL = 6, LH = 20;
    function drawFill(newTop) {
      let y = 190, html = '';
      layers.forEach((L, k) => {
        const h = LH * L.u / 3; y -= h;
        const col = FOODS[L.f].col, anim = newTop && k === layers.length - 1 ? ' class="m7-layer"' : '';
        let bits = '';
        if (L.f === 'seeds') for (let i = 0; i < 6 * L.u; i++) bits += `<ellipse cx="${165 + (i * 7 + k * 3) % 31}" cy="${y + 3 + (i * 5) % Math.max(4, h - 4)}" rx="2.2" ry="1.4" fill="${i % 2 ? '#3A2E22' : '#F1E3C2'}"/>`;
        if (L.f === 'nuts') for (let i = 0; i < 3 * L.u; i++) bits += `<path d="M${166 + (i * 11 + k * 4) % 26},${y + 4 + (i * 4) % Math.max(4, h - 6)} l6,-2 l3,5 l-6,2 Z" fill="#C79A5A"/>`;
        if (L.f === 'fat') for (let i = 0; i < L.u; i++) bits += `<circle cx="${171 + i * 9}" cy="${y + h / 2}" r="${Math.min(8, h / 2)}" fill="#B58A55"/><circle cx="${169 + i * 9}" cy="${y + h / 2 - 2}" r="1.6" fill="#7A5A30"/>`;
        html += `<g${anim}><rect x="160" y="${y}" width="40" height="${h + .5}" fill="${col}"/>${bits}</g>`;
      });
      fillG.innerHTML = html;
    }
    function has(f) { return layers.some(L => L.f === f); }
    function eat(foods) {
      for (let k = layers.length - 1; k >= 0; k--) if (foods.includes(layers[k].f)) { const f = layers[k].f; if (--layers[k].u <= 0) layers.splice(k, 1); drawFill(); return f; }
      return null;
    }

    Object.keys(FOODS).forEach(f => {
      btn(food, `<b>${FOODS[f].icon}</b>${FOODS[f].name}`, FOODS[f].cls, b => {
        if (layers.length >= MAXL) { sfx.soft(); api.hint('The feeder is full. Watch for the birds coming to eat.'); return; }
        layers.push({ f, u: 3 }); drawFill(true); wob(b);
        for (let i = 0; i < 6; i++) tone(1800 + randInt(1400), .03, 'triangle', .04, i * .05);
        api.hint(`You added ${FOODS[f].name.toLowerCase()}. ${layers.length >= MAXL ? 'The feeder is full!' : 'Add more, or wait for the birds.'}`);
        if (!started) { started = true; api.later(visit, 1800); }
      });
    });

    /* visiting birds */
    const here = {}; // spot -> bird record
    let started = false, hinted = false;
    const maxBirds = Math.min(4, 2 + Math.floor((level - 1) / 3));
    function visit() {
      if (!svg.isConnected) return;
      const free = Object.keys(SPOT).filter(s => !here[s]);
      const count = Object.keys(here).length;
      if (count < maxBirds && layers.length) {
        let cand = BIRD_IDS.filter(id => BIRDS[id].foods.some(has) && BIRDS[id].spots.some(s => free.includes(s)) && !Object.values(here).some(h => h.id === id));
        const fresh = cand.filter(id => !saved.list.includes(id));
        if (fresh.length && Math.random() < .65) cand = fresh;
        if (cand.length) arrive(pick(cand), free);
      } else if (!layers.length && !count) {
        api.hint('The feeder is empty. Tap Seeds, Nuts or Fat balls to fill it.');
      }
      api.later(visit, 2600 + randInt(2600));
    }
    function arrive(id, free) {
      const B = BIRDS[id], spot = pick(B.spots.filter(s => free.includes(s))), P = SPOT[spot], s = B.s || 1;
      const fromLeft = P.x < 180;
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'm7-b m7-fly');
      const sx = fromLeft ? -50 : 410, sy = 40 + randInt(60);
      g.style.transition = 'none';
      g.style.transform = `translate(${sx}px,${sy}px)`;
      const lx = P.flip ? -22 : 22, nm = B.name, lw = nm.length * 10.5 + 18;
      g.innerHTML = `<g transform="scale(${P.flip ? -s * 1.25 : s * 1.25},${s * 1.25})"><g class="m7-bp">${birdArt(B)}</g></g>` +
        `<g class="m7-lbl"><rect x="${lx - lw / 2}" y="5" width="${lw}" height="24" rx="12" fill="rgba(255,255,255,.92)"/><text x="${lx}" y="23" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="600" font-size="18" fill="#18242C">${nm}</text></g>` +
        `<rect x="-46" y="-64" width="92" height="68" fill="transparent"/>`;
      birdsG.append(g);
      const rec = { id, g, spot, gone: false };
      here[spot] = rec;
      g.getBoundingClientRect();
      g.style.transition = '';
      g.style.transform = `translate(${P.x}px,${P.y}px)`;
      g.style.cursor = 'pointer';
      g.addEventListener('click', () => { if (rec.gone) return; sing(id); R.say(nm); api.hint(`${nm}: ${B.fact}`); g.classList.remove('m7-peck'); g.classList.add('m7-hop'); api.later(() => { g.classList.remove('m7-hop'); if (!rec.gone) g.classList.add('m7-peck'); }, 1000); });
      api.later(() => {
        if (!g.isConnected) return;
        g.classList.remove('m7-fly'); g.classList.add('m7-here', 'm7-peck');
        const f = eat(B.foods) || pick(B.foods);
        const isNew = markSeen(id);
        sing(id);
        const where = spot.startsWith('ground') ? 'is pecking up the bits that fell' : `is eating the ${FOODS[f].name.toLowerCase()}`;
        api.hint(`${isNew ? 'Look! ' : ''}A ${nm.toLowerCase()} ${where}.${hinted ? '' : ' Tap a bird to hear it.'}`);
        hinted = true;
        if (isNew) { toast(`New bird: ${nm}!`); }
        let pecks = 2 + randInt(3);
        const peckSound = () => { if (rec.gone || !g.isConnected) return; tone(2200 + randInt(500), .02, 'triangle', .03); if (--pecks > 0) api.later(peckSound, 1300); };
        api.later(peckSound, 800);
        api.later(() => { if (Math.random() < .6) sing(id, .035); }, 4000 + randInt(2000));
        api.later(() => leave(rec), 8000 + randInt(5000));
      }, 1900);
    }
    function leave(rec) {
      if (rec.gone) return; rec.gone = true;
      const { g, spot } = rec, P = SPOT[spot];
      g.classList.remove('m7-peck', 'm7-here'); g.classList.add('m7-fly');
      g.style.transform = `translate(${P.x < 180 ? -60 : 420}px,${20 + randInt(50)}px)`;
      api.later(() => { g.remove(); if (here[spot] === rec) delete here[spot]; }, 2000);
    }
    api.hint('Tap Seeds, Nuts or Fat balls to fill the bird feeder.');
  }

  /* =========================================================
     2. BREATHE WITH THE BALLOON
     ========================================================= */
  function startBreathe(level, api) {
    const IN = 4000, OUT = 6000;
    const root = el('div', 'm7-wrap'); api.stage.append(root);
    choose();

    function choose() {
      root.innerHTML = '';
      api.hint('How long would you like to breathe with the balloon?');
      root.append(el('div', 'm7-sub', 'Sit comfortably. Breathe in as the balloon grows, and out as it shrinks.'));
      const p = el('div', 'm7-pick'); root.append(p);
      [[1, 'c-sky'], [3, 'm7-calm'], [5, 'm7-calm2']].forEach(([m, c]) => btn(p, `<b>${m}</b>${m === 1 ? 'minute' : 'minutes'}`, c, () => { sfx.tap(); run(m); }));
      const row = el('div', 'm7-row'); root.append(row);
      finishBtn(api, '✓ I’m finished', row);
    }

    function run(mins) {
      const total = Math.round(mins * 60000 / (IN + OUT));
      let n = 0, token = 0, paused = false, soundOn = true;
      root.innerHTML = '';
      const sky = el('div', 'm7-sky');
      sky.innerHTML = `<div class="m7-cloud" style="left:30px;top:40px;width:90px;height:26px"></div><div class="m7-cloud" style="right:26px;top:110px;width:70px;height:20px;animation-duration:55s"></div><div class="m7-cloud" style="left:60px;bottom:40px;width:60px;height:18px;animation-duration:48s"></div><div class="m7-glow"></div>`;
      const bw = el('div', 'm7-bwrap', `<div class="m7-ball"></div><div class="m7-knot"></div><svg class="m7-string" width="30" height="80" viewBox="0 0 30 80"><path d="M2,0 Q14,20 4,40 Q-6,60 8,80" stroke="#8C7AA8" stroke-width="2.5" fill="none"/></svg>`);
      sky.append(bw); root.append(sky);
      const glow = sky.querySelector('.m7-glow');
      const words = el('div', 'm7-words', 'Get ready…'), sub = el('div', 'm7-sub', `${mins} minute${mins > 1 ? 's' : ''} of calm breathing`);
      root.append(words, sub);
      const row = el('div', 'm7-row'); root.append(row);
      const pb = btn(row, '⏸ Pause', 'c-card', () => { sfx.tap(); paused ? resume() : pause(); });
      const sb = btn(row, '🔈 Sound on', 'c-card', () => { soundOn = !soundOn; sb.textContent = soundOn ? '🔈 Sound on' : '🔇 Sound off'; sfx.tap(); });
      finishBtn(api, '✓ I’m finished', row);
      api.hint('Get comfortable. We’ll start in a moment.');
      api.rounds(0, 0);
      let osc = [];
      function hum(up, dur) {
        if (!soundOn) return;
        const A = R.audio && R.audio(); if (!A || !A.ctx || !A.bus) return;
        const { ctx, bus } = A, t = ctx.currentTime + .02, s = dur / 1000;
        [[1, .05], [1.5, .015]].forEach(([m, v]) => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime((up ? 196 : 293.66) * m, t);
          o.frequency.linearRampToValueAtTime((up ? 293.66 : 196) * m, t + s);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(v, t + Math.min(1.2, s * .3));
          g.gain.linearRampToValueAtTime(v * .7, t + s * .8);
          g.gain.linearRampToValueAtTime(0.0001, t + s);
          o.connect(g); g.connect(bus); o.start(t); o.stop(t + s + .05); osc.push(o);
        });
      }
      function hush() { osc.forEach(o => { try { o.stop(); } catch (e) { } }); osc = []; }
      function set(scale, ms) { bw.style.transition = `transform ${ms}ms ease-in-out`; bw.style.transform = `scale(${scale})`; }
      function breatheIn(tk) {
        if (tk !== token || !root.isConnected) return;
        n++; sub.textContent = `Breath ${n} of ${total}`;
        words.style.opacity = 0;
        api.later(() => { if (tk === token) { words.textContent = 'Breathe in…'; words.style.opacity = 1; } }, 300);
        api.hint('Breathe in slowly as the balloon grows.');
        set(1, IN); glow.style.opacity = .9; hum(true, IN);
        api.later(() => breatheOut(tk), IN);
      }
      function breatheOut(tk) {
        if (tk !== token || !root.isConnected) return;
        words.style.opacity = 0;
        api.later(() => { if (tk === token) { words.textContent = '…and out…'; words.style.opacity = 1; } }, 300);
        api.hint('And breathe out gently as it shrinks.');
        set(.5, OUT); glow.style.opacity = .3; hum(false, OUT);
        api.later(() => { if (tk !== token) return; n >= total ? end() : breatheIn(tk); }, OUT);
      }
      function pause() {
        paused = true; token++; hush(); pb.textContent = '▶ Carry on';
        set(.62, 1200); words.textContent = 'Resting…'; words.style.opacity = 1;
        api.hint('Paused. Tap Carry on when you are ready.');
      }
      function resume() {
        paused = false; pb.textContent = '⏸ Pause'; set(.5, 1200);
        const tk = ++token; words.textContent = 'Get ready…'; api.later(() => breatheIn(tk), 1500);
      }
      function end() {
        token++; pb.remove();
        set(.75, 2500); bw.style.animation = '';
        words.textContent = 'Well done.'; sub.textContent = 'Lovely, calm breathing. Rest here as long as you like.';
        api.hint('All done. Tap “I’m finished” when you are ready, or breathe again.');
        [392, 493.88, 587.33].forEach((f, i) => tone(f, 2.2, 'sine', .06, i * .25));
        btn(row, '↻ Breathe again', 'm7-calm', () => { sfx.tap(); choose(); });
        row.append(row.querySelector('.m7-fin'));
      }
      const tk0 = ++token; set(.5, 600);
      api.later(() => breatheIn(tk0), 2200);
    }
  }

  /* =========================================================
     3. CHAIR EXERCISES
     ========================================================= */
  const MOVES = [
    { id: 'sh', name: 'Shoulder rolls', say: 'Slowly lift your shoulders up, roll them back, and let them drop.', reps: 5, beat: 3200 },
    { id: 'arms', name: 'Arm raises', say: 'Lift both arms slowly up high, then gently lower them.', reps: 5, beat: 4200 },
    { id: 'hands', name: 'Open and close hands', say: 'Hold your hands up. Squeeze them into a fist, then stretch your fingers wide.', reps: 6, beat: 2600 },
    { id: 'neck', name: 'Gentle neck turns', say: 'Slowly turn your head to look one way, then the other. Nice and gentle.', reps: 4, beat: 5200 },
    { id: 'ank', name: 'Ankle circles', say: 'Lift one foot a little and draw slow circles with your toes.', reps: 6, beat: 3000 },
    { id: 'march', name: 'Seated marching', say: 'Sit tall. Lift one knee a little, then the other, as if marching.', reps: 8, beat: 1700 }
  ];
  function figureSVG() {
    const skin = '#F2C9A0', jumper = '#E2574C', jd = '#C2433A', trou = '#3B4A7A', shoe = '#5A3A24';
    const leg = (x, cls) => `<g class="${cls}"><rect x="${x}" y="190" width="32" height="20" rx="10" fill="${trou}"/><rect x="${x + 3}" y="198" width="26" height="50" rx="10" fill="${trou}"/><ellipse cx="${x + 16}" cy="250" rx="19" ry="8" fill="${shoe}"/></g>`;
    const hand = (x, y) => `<g class="m7-fist"><circle cx="${x}" cy="${y}" r="10" fill="${skin}" stroke="#D9A97E" stroke-width="1.5"/><path d="M${x - 6},${y - 3} h12 M${x - 6},${y + 2} h12" stroke="#D9A97E" stroke-width="1.5"/></g>` +
      `<g class="m7-open"><circle cx="${x}" cy="${y + 2}" r="9" fill="${skin}"/>${[-8, -3, 2, 7].map(d => `<rect x="${x + d - 2}" y="${y - 16}" width="5" height="14" rx="2.5" fill="${skin}"/>`).join('')}<rect x="${x + (x < 120 ? 7 : -12)}" y="${y - 2}" width="5" height="11" rx="2.5" transform="rotate(${x < 120 ? -40 : 40} ${x} ${y})" fill="${skin}"/></g>`;
    return `<svg class="m7-fig" viewBox="0 0 240 270" role="img" aria-label="A friendly person sitting on a chair">
<ellipse cx="120" cy="260" rx="96" ry="8" fill="rgba(0,0,0,.12)"/>
<rect x="60" y="66" width="120" height="122" rx="18" fill="#C0763A"/><rect x="70" y="76" width="100" height="100" rx="12" fill="#D08A4C"/>
<rect x="56" y="196" width="11" height="62" rx="4" fill="#9A5A28"/><rect x="173" y="196" width="11" height="62" rx="4" fill="#9A5A28"/>
<rect x="46" y="182" width="148" height="20" rx="8" fill="#A65F2A"/>
${leg(82, 'm7-legL')}${leg(126, 'm7-legR')}
<rect x="78" y="110" width="84" height="80" rx="26" fill="${jumper}"/>
<path d="M104,110 L120,128 L136,110" fill="none" stroke="${jd}" stroke-width="3"/>
<g class="m7-sh">
 <g class="m7-armL"><path d="M86,122 L76,178" stroke="${jumper}" stroke-width="20" stroke-linecap="round"/><circle cx="76" cy="186" r="9" fill="${skin}"/></g>
 <g class="m7-armR"><path d="M154,122 L164,178" stroke="${jumper}" stroke-width="20" stroke-linecap="round"/><circle cx="164" cy="186" r="9" fill="${skin}"/></g>
 <g class="m7-hup"><path d="M86,122 L62,152 L60,112" stroke="${jumper}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M154,122 L178,152 L180,112" stroke="${jumper}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none"/>${hand(60, 98)}${hand(180, 98)}</g>
</g>
 <rect x="111" y="94" width="18" height="18" rx="6" fill="${skin}"/>
 <g class="m7-head">
  <circle cx="120" cy="72" r="28" fill="${skin}"/>
  <path d="M92,70 Q90,40 120,40 Q150,40 148,70 Q144,52 120,52 Q98,52 92,70 Z" fill="#D9D9DE"/>
  <circle cx="92" cy="76" r="5" fill="${skin}"/><circle cx="148" cy="76" r="5" fill="${skin}"/>
  <g class="m7-face">
   <circle cx="110" cy="72" r="8" fill="none" stroke="#6A4A3A" stroke-width="2"/><circle cx="130" cy="72" r="8" fill="none" stroke="#6A4A3A" stroke-width="2"/><path d="M118,72 h4" stroke="#6A4A3A" stroke-width="2"/>
   <circle cx="110" cy="72" r="2.8" fill="#2A2A2A"/><circle cx="130" cy="72" r="2.8" fill="#2A2A2A"/>
   <circle cx="104" cy="84" r="4" fill="#F4A3A0" opacity=".7"/><circle cx="136" cy="84" r="4" fill="#F4A3A0" opacity=".7"/>
   <path d="M111,86 Q120,94 129,86" stroke="#8A3A2A" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  </g>
 </g>
</svg>`;
  }
  function startChair(level, api) {
    const drop = ((level - 1) % 6 + 6) % 6;
    let routine = MOVES.filter((m, i) => i !== (drop === 0 ? 2 : drop));
    if (routine.length > 5) routine = routine.slice(0, 5);
    let voice = true, idx = -1, token = 0, paused = false;

    const root = el('div', 'm7-cx'); api.stage.append(root);
    const figBox = el('div', '', figureSVG()); root.append(figBox);
    const fig = figBox.querySelector('svg');
    const panel = el('div', 'm7-panel'); root.append(panel);
    const mv = el('div', 'm7-mv', 'Chair exercises'), step = el('div', 'm7-step', `${routine.length} gentle moves, sitting down`);
    const cnt = el('div', 'tile c-sun m7-cnt m7-small', 'Ready?');
    const note = el('div', 'm7-note', 'Only do what feels comfortable. Stop if anything hurts.');
    const top = el('div', 'm7-top'), tx = el('div'); tx.append(mv, step); top.append(cnt, tx);
    panel.append(top, note);
    const row = el('div', 'm7-row'); panel.append(row);
    const go = btn(row, '▶ Start', 'c-leaf', () => { sfx.tap(); if (idx < 0) next(); else if (paused) resume(); else pause(); });
    const vb = btn(row, '🔊 Voice on', 'c-card', () => { voice = !voice; vb.textContent = voice ? '🔊 Voice on' : '🔇 Voice off'; sfx.tap(); if (!voice) try { speechSynthesis.cancel(); } catch (e) { } });
    const skip = btn(row, 'Next move ▶', 'c-sky', () => { sfx.tap(); next(); });
    skip.style.display = 'none';
    finishBtn(api, '✓ Finished', row);
    api.hint('Sit comfortably with your feet flat on the floor. Tap Start when you are ready.');
    api.rounds(routine.length, 0);

    const speak = t => { if (voice) R.say(t, .85); };
    function setCount(t, small) { cnt.textContent = t; cnt.classList.toggle('m7-small', !!small); cnt.classList.remove('m7-bump'); void cnt.offsetWidth; cnt.classList.add('m7-bump'); }
    function pose(cls, beat) {
      fig.setAttribute('class', 'm7-fig' + (cls ? ' m7-do-' + cls : ''));
      if (beat) fig.style.setProperty('--beat', beat + 'ms');
    }
    function next() {
      const tk = ++token; paused = false;
      idx++;
      if (idx >= routine.length) return finish();
      const M = routine[idx];
      go.textContent = '⏸ Pause'; skip.style.display = '';
      mv.textContent = M.name; step.textContent = `Move ${idx + 1} of ${routine.length}`;
      api.rounds(routine.length, idx);
      pose(M.id === 'ank' ? 'ankR' : M.id, M.beat);
      setCount('Watch me first', true);
      api.hint(M.say); speak(M.name + '. ' + M.say);
      api.later(() => count(tk, M, 1), Math.max(4500, M.beat + 1500));
    }
    function count(tk, M, i) {
      if (tk !== token || !root.isConnected) return;
      if (i > M.reps) {
        api.rounds(routine.length, idx + 1);
        pose('', 0); setCount('Rest', true);
        sfx.good();
        const last = idx === routine.length - 1;
        api.hint(last ? 'Lovely! That was the last move.' : `Lovely! Have a little rest. Next: ${routine[idx + 1].name.toLowerCase()}.`);
        speak(last ? 'Lovely. That was the last move.' : 'Lovely. Have a little rest.');
        api.later(() => { if (tk === token) next(); }, last ? 2500 : 5000);
        return;
      }
      if (M.id === 'ank' && i === Math.floor(M.reps / 2) + 1) { pose('ankL', M.beat); api.hint('Now the other foot. Slow circles.'); }
      setCount(i + '…');
      tone(440 + i * 30, .14, 'triangle', .07);
      speak(String(i));
      api.later(() => count(tk, M, i + 1), M.beat);
    }
    function pause() {
      paused = true; token++; go.textContent = '▶ Carry on'; pose('', 0); setCount('Paused', true);
      try { speechSynthesis.cancel(); } catch (e) { }
      api.hint('Paused. Have a rest, then tap Carry on.');
    }
    function resume() { idx--; next(); }
    function finish() {
      token++; pose('', 0); mv.textContent = 'All done!'; step.textContent = 'Well done for moving today.';
      setCount('🌟', true); cnt.style.fontSize = '3rem';
      go.remove(); skip.remove();
      api.rounds(routine.length, routine.length);
      api.hint('All done! Well done. Tap “Finished” when you are ready.');
      speak('All done. Well done!');
      [523.25, 659.25, 783.99].forEach((f, i) => tone(f, .5, 'triangle', .08, i * .15));
    }
  }

  /* =========================================================
     QUIZ ENGINE (shared by Capital Cities and Saying Meanings)
     ========================================================= */
  function quiz(api, items, Q) {
    let i = 0, mistakes = 0;
    const total = items.length;
    function show() {
      api.rounds(total, i); api.stage.innerHTML = '';
      const it = items[i], wrap = el('div', 'm7-quiz'), card = el('div', 'm7-card', Q.prompt(it));
      const opts = el('div', 'm7-opts' + (Q.one ? ' m7-one' : ''));
      wrap.append(card, opts); api.stage.append(wrap);
      api.hint(Q.ask(it));
      let wrong = 0, solved = false;
      shuffle(Q.choices(it).slice()).forEach(c => {
        const b = el('button', 'btn c-card m7-opt'); b.type = 'button'; b.textContent = c;
        b.onclick = () => {
          if (solved) return;
          if (c === Q.answer(it)) {
            solved = true; b.classList.add('m7-yes'); sfx.good(); toast(cheer());
            tone(660, .12, 'triangle', .08, .1); tone(880, .18, 'triangle', .08, .2);
            api.hint(Q.right(it));
            api.later(() => {
              opts.replaceWith(el('div', 'm7-fact', Q.fact(it)));
              const nb = el('button', 'btn c-leaf m7-next', i + 1 === total ? 'Finish ★' : 'Next ▶'); nb.type = 'button';
              nb.onclick = () => { sfx.tap(); i++; if (i === total) { api.rounds(total, i); api.done(starsFor(mistakes, 1, 3)); } else show(); };
              wrap.append(nb);
            }, 700);
          } else {
            mistakes++; wrong++; sfx.soft(); wob(b); b.classList.add('m7-no');
            api.hint(wrong > 1 ? 'Nearly there. Try one of the others.' : 'Not quite. Have another look.');
          }
        };
        opts.append(b);
      });
    }
    show();
  }

  /* =========================================================
     4. CAPITAL CITIES
     ========================================================= */
  // [country, flag, capital, decoys (cities in that country), region, lat, lon, tier, fact]
  const CAPS = [
    ['France', '🇫🇷', 'Paris', ['Lyon', 'Marseille', 'Nice'], 'Europe', 46.5, 2.5, 1, 'The Eiffel Tower was built in Paris for the World’s Fair of 1889.'],
    ['Italy', '🇮🇹', 'Rome', ['Milan', 'Venice', 'Naples'], 'Europe', 42.8, 12.5, 1, 'Rome has a whole little country inside it: Vatican City.'],
    ['Spain', '🇪🇸', 'Madrid', ['Barcelona', 'Seville', 'Valencia'], 'Europe', 40.2, -3.7, 1, 'Madrid sits almost in the very middle of Spain.'],
    ['Germany', '🇩🇪', 'Berlin', ['Munich', 'Hamburg', 'Frankfurt'], 'Europe', 51, 10, 1, 'The Brandenburg Gate in Berlin was finished in 1791.'],
    ['Ireland', '🇮🇪', 'Dublin', ['Cork', 'Galway', 'Limerick'], 'Europe', 53.2, -8, 1, 'The River Liffey flows right through the middle of Dublin.'],
    ['United Kingdom', '🇬🇧', 'London', ['Manchester', 'Birmingham', 'Liverpool'], 'Europe', 53.5, -2, 1, 'Big Ben is really the name of the great bell inside London’s famous clock tower.'],
    ['United States', '🇺🇸', 'Washington, D.C.', ['New York', 'Los Angeles', 'Chicago'], 'North America', 39, -98, 1, 'The White House in Washington, D.C. has 132 rooms.'],
    ['Japan', '🇯🇵', 'Tokyo', ['Osaka', 'Kyoto', 'Hiroshima'], 'Asia', 36.5, 138.5, 1, 'Before Tokyo, Kyoto was Japan’s capital for over a thousand years.'],
    ['Greece', '🇬🇷', 'Athens', ['Thessaloniki', 'Sparta', 'Corfu'], 'Europe', 39.3, 22, 1, 'The Parthenon has stood on a hill above Athens for about 2,500 years.'],
    ['Egypt', '🇪🇬', 'Cairo', ['Alexandria', 'Luxor', 'Aswan'], 'Africa', 26.8, 30, 1, 'The Great Pyramids stand at Giza, just outside Cairo.'],
    ['China', '🇨🇳', 'Beijing', ['Shanghai', 'Hong Kong', 'Guangzhou'], 'Asia', 35, 104, 1, 'Beijing’s Forbidden City was home to China’s emperors for about 500 years.'],
    ['Russia', '🇷🇺', 'Moscow', ['St Petersburg', 'Kazan', 'Novosibirsk'], 'Europe and Asia', 60, 90, 1, 'Moscow’s Red Square is home to the colourful onion domes of St Basil’s Cathedral.'],
    ['Portugal', '🇵🇹', 'Lisbon', ['Porto', 'Faro', 'Braga'], 'Europe', 39.6, -8, 2, 'Little yellow trams have rattled up Lisbon’s steep hills for over 100 years.'],
    ['Netherlands', '🇳🇱', 'Amsterdam', ['Rotterdam', 'Utrecht', 'Eindhoven'], 'Europe', 52.2, 5.5, 2, 'Amsterdam has about 165 canals and around 1,500 bridges.'],
    ['India', '🇮🇳', 'New Delhi', ['Mumbai', 'Kolkata', 'Bangalore'], 'Asia', 22, 79, 2, 'The Taj Mahal is a few hours from New Delhi, in the city of Agra.'],
    ['Austria', '🇦🇹', 'Vienna', ['Salzburg', 'Innsbruck', 'Graz'], 'Europe', 47.5, 14.5, 2, 'Mozart lived in Vienna and wrote many of his most famous pieces there.'],
    ['Norway', '🇳🇴', 'Oslo', ['Bergen', 'Trondheim', 'Stavanger'], 'Europe', 61, 9, 2, 'Every year since 1947, Oslo has sent a Christmas tree to Trafalgar Square in London.'],
    ['Sweden', '🇸🇪', 'Stockholm', ['Gothenburg', 'Malmö', 'Uppsala'], 'Europe', 62, 15, 2, 'Stockholm is built on 14 islands joined by bridges.'],
    ['Denmark', '🇩🇰', 'Copenhagen', ['Aarhus', 'Odense', 'Aalborg'], 'Europe', 56, 10, 2, 'The Little Mermaid statue sits by the water in Copenhagen.'],
    ['Mexico', '🇲🇽', 'Mexico City', ['Cancún', 'Guadalajara', 'Acapulco'], 'North America', 23.6, -102.5, 2, 'Mexico City was built on the site of an old Aztec city that stood on a lake.'],
    ['Belgium', '🇧🇪', 'Brussels', ['Antwerp', 'Bruges', 'Ghent'], 'Europe', 50.6, 4.6, 2, 'Brussels is famous for its waffles and chocolate.'],
    ['Poland', '🇵🇱', 'Warsaw', ['Kraków', 'Gdańsk', 'Wrocław'], 'Europe', 52, 19.5, 2, 'The composer Chopin grew up in Warsaw.'],
    ['Hungary', '🇭🇺', 'Budapest', ['Debrecen', 'Szeged', 'Pécs'], 'Europe', 47.2, 19.5, 2, 'Budapest grew from the towns of Buda and Pest, on either side of the River Danube.'],
    ['Czech Republic', '🇨🇿', 'Prague', ['Brno', 'Ostrava', 'Plzeň'], 'Europe', 49.8, 15.5, 2, 'Prague’s famous astronomical clock is over 600 years old.'],
    ['Argentina', '🇦🇷', 'Buenos Aires', ['Córdoba', 'Rosario', 'Mendoza'], 'South America', -34, -64, 2, 'Buenos Aires is often called the home of the tango.'],
    ['Thailand', '🇹🇭', 'Bangkok', ['Phuket', 'Chiang Mai', 'Pattaya'], 'Asia', 15.5, 101, 2, 'Bangkok’s full name in Thai is one of the longest place names in the world.'],
    ['South Korea', '🇰🇷', 'Seoul', ['Busan', 'Incheon', 'Daegu'], 'Asia', 36.3, 127.8, 2, 'About half of all the people in South Korea live in and around Seoul.'],
    ['Cuba', '🇨🇺', 'Havana', ['Santiago de Cuba', 'Varadero', 'Trinidad'], 'Caribbean', 21.8, -79, 2, 'Havana is famous for its colourful old American cars from the 1950s.'],
    ['Jamaica', '🇯🇲', 'Kingston', ['Montego Bay', 'Ocho Rios', 'Negril'], 'Caribbean', 18.1, -77.3, 2, 'The reggae star Bob Marley lived in Kingston, and his old home is now a museum.'],
    ['Kenya', '🇰🇪', 'Nairobi', ['Mombasa', 'Kisumu', 'Nakuru'], 'Africa', 0.2, 37.9, 2, 'Nairobi has a national park with lions and giraffes, right beside the city.'],
    ['Peru', '🇵🇪', 'Lima', ['Cusco', 'Arequipa', 'Trujillo'], 'South America', -9.5, -75, 2, 'Lima sits on the Pacific coast, and the Andes mountains rise behind it.'],
    ['Australia', '🇦🇺', 'Canberra', ['Sydney', 'Melbourne', 'Perth'], 'Oceania', -25, 134, 3, 'Canberra was built to be the capital because Sydney and Melbourne both wanted the job.'],
    ['Canada', '🇨🇦', 'Ottawa', ['Toronto', 'Vancouver', 'Montreal'], 'North America', 58, -100, 3, 'In winter, Ottawa’s Rideau Canal freezes into a skating rink nearly 8 km long.'],
    ['Switzerland', '🇨🇭', 'Bern', ['Zurich', 'Geneva', 'Basel'], 'Europe', 46.8, 8.2, 3, 'A bear is the symbol of Bern, and it appears on the city’s flag.'],
    ['New Zealand', '🇳🇿', 'Wellington', ['Auckland', 'Christchurch', 'Queenstown'], 'Oceania', -41.5, 173, 3, 'Wellington is the most southerly capital city of any country in the world.'],
    ['Brazil', '🇧🇷', 'Brasília', ['Rio de Janeiro', 'São Paulo', 'Salvador'], 'South America', -10, -52, 3, 'Brasília was built from scratch in about four years, and opened in 1960.'],
    ['Turkey', '🇹🇷', 'Ankara', ['Istanbul', 'Izmir', 'Antalya'], 'Europe and Asia', 39, 35, 3, 'Many people guess Istanbul, but Ankara has been the capital since 1923.'],
    ['Morocco', '🇲🇦', 'Rabat', ['Casablanca', 'Marrakesh', 'Fez'], 'Africa', 31.8, -6.5, 3, 'Many people guess Marrakesh or Casablanca, but the capital is Rabat, on the Atlantic coast.'],
    ['Finland', '🇫🇮', 'Helsinki', ['Tampere', 'Turku', 'Oulu'], 'Europe', 63, 26, 3, 'Turku was Finland’s capital until 1812, when Helsinki took over.'],
    ['Iceland', '🇮🇸', 'Reykjavík', ['Akureyri', 'Húsavík', 'Selfoss'], 'Europe', 64.9, -18.5, 3, 'Reykjavík is the most northerly capital city of any country in the world.'],
    ['Chile', '🇨🇱', 'Santiago', ['Valparaíso', 'Concepción', 'Antofagasta'], 'South America', -33.4, -70.6, 3, 'Santiago sits in a valley with the snowy Andes mountains rising behind it.']
  ];
  const LAND = [
    [[-168, 66], [-140, 70], [-95, 72], [-80, 63], [-62, 58], [-55, 50], [-66, 44], [-76, 35], [-81, 26], [-83, 29], [-90, 30], [-97, 27], [-97, 19], [-91, 16], [-87, 15], [-83, 9], [-78, 8], [-86, 12], [-92, 15], [-105, 20], [-112, 30], [-118, 34], [-124, 40], [-125, 49], [-136, 58], [-153, 58], [-165, 62]],
    [[-55, 60], [-44, 60], [-22, 70], [-20, 80], [-40, 83], [-66, 78], [-56, 71]],
    [[-80, 9], [-61, 11], [-50, 1], [-35, -6], [-40, -22], [-48, -28], [-58, -38], [-65, -42], [-68, -53], [-75, -50], [-73, -37], [-71, -18], [-81, -5]],
    [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [0, 50], [5, 53], [9, 57], [5, 62], [14, 68], [28, 71], [40, 67], [41, 50], [30, 46], [27, 41], [23, 37], [16, 38], [12, 44], [8, 44], [3, 42], [-5, 36]],
    [[-6, 50], [2, 51], [0, 54], [-2, 58], [-6, 58], [-5, 54], [-3, 53], [-5, 52]],
    [[-10, 52], [-6, 52], [-6, 55], [-9, 55]],
    [[-24, 65], [-14, 64], [-14, 66], [-22, 67]],
    [[-17, 21], [-10, 30], [-5, 35], [10, 37], [20, 32], [32, 31], [35, 28], [43, 12], [51, 12], [40, -2], [40, -15], [35, -25], [28, -34], [18, -34], [12, -17], [13, -6], [9, 4], [-8, 4], [-17, 14]],
    [[27, 41], [36, 36], [35, 30], [43, 13], [52, 15], [57, 23], [62, 25], [67, 24], [73, 20], [77, 8], [80, 15], [88, 22], [92, 21], [98, 16], [100, 5], [104, 1], [106, 10], [109, 12], [108, 21], [118, 24], [122, 30], [121, 39], [127, 40], [130, 43], [141, 52], [142, 60], [160, 62], [170, 66], [180, 68], [180, 72], [140, 73], [110, 77], [80, 73], [68, 69], [55, 68], [40, 67], [41, 50], [30, 46]],
    [[130, 31], [135, 34], [140, 36], [142, 40], [141, 44], [145, 44], [141, 46], [139, 39], [132, 34]],
    [[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [146, -39], [138, -35], [130, -32], [116, -35], [114, -27]],
    [[172, -35], [178, -38], [174, -41], [171, -46], [167, -46], [172, -41]],
    [[95, 5], [105, -6], [115, -8], [120, -9], [108, -7], [100, -1]],
    [[-85, 22], [-77, 20], [-74, 20], [-80, 23]]
  ];
  const LAND_PATH = LAND.map(p => 'M' + p.map(([lo, la]) => `${(lo + 180).toFixed(0)},${(90 - la).toFixed(0)}`).join('L') + 'Z').join('');
  function worldMap(lat, lon) {
    const x = lon + 180, y = 90 - lat;
    return `<svg class="m7-map" viewBox="0 6 360 140" aria-hidden="true"><path d="${LAND_PATH}" fill="#8FCB6E" stroke="#5E9E48" stroke-width="1" stroke-linejoin="round"/>
<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="#E5383B" stroke-width="2.5"><animate attributeName="r" values="5;14;5" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;.2;1" dur="2s" repeatCount="indefinite"/></circle>
<circle cx="${x}" cy="${y}" r="4.5" fill="#E5383B" stroke="#fff" stroke-width="1.5"/></svg>`;
  }
  function startCapitals(level, api) {
    const L = Math.max(1, level);
    const nOpt = L >= 4 ? 4 : 3, total = L <= 1 ? 5 : 6;
    const maxTier = L <= 2 ? 1 : L <= 5 ? 2 : 3;
    const pool = CAPS.filter(c => c[7] <= maxTier);
    const recent = store.get('m7-caps', []);
    let picks = shuffle(pool.filter(c => !recent.includes(c[0]))).slice(0, total);
    if (picks.length < total) picks = picks.concat(shuffle(pool.filter(c => !picks.includes(c))).slice(0, total - picks.length));
    if (L >= 3 && L <= 5) { const easy = shuffle(CAPS.filter(c => c[7] === 1 && !picks.includes(c))); for (let k = 0; k < 2 && picks.filter(c => c[7] === 1).length < 2; k++) picks[picks.length - 1 - k] = easy[k]; }
    picks.sort((a, b) => a[7] - b[7]);
    store.set('m7-caps', recent.concat(picks.map(c => c[0])).slice(-24));
    quiz(api, picks, {
      prompt: c => `<div class="m7-flag">${c[1]}</div><div class="m7-country">${c[0]}</div>${worldMap(c[5], c[6])}<div class="m7-region">📍 ${c[4]}</div>`,
      ask: c => `What is the capital city of ${c[0] === 'United States' || c[0] === 'United Kingdom' || c[0] === 'Netherlands' || c[0] === 'Czech Republic' ? 'the ' + c[0] : c[0]}?`,
      choices: c => [c[2]].concat(shuffle(c[3].slice()).slice(0, nOpt - 1)),
      answer: c => c[2],
      right: c => `Yes! ${c[2]} is the capital.`,
      fact: c => `<b>${c[2]}</b> is the capital of ${c[0]}.<br>${c[8]}`
    });
  }

  /* =========================================================
     5. SAYING MEANINGS
     ========================================================= */
  // [saying, meaning, group (meanings in the same group are never shown together)]
  const SAYINGS = [
    ['Don’t count your chickens before they hatch', 'Don’t rely on something before it happens', 'pre'],
    ['Every cloud has a silver lining', 'Something good can come out of a bad time', 'hope'],
    ['The early bird catches the worm', 'People who start early get the best chances', 'early'],
    ['Too many cooks spoil the broth', 'Too many people in charge can ruin a job', 'team'],
    ['A stitch in time saves nine', 'Fix a small problem now to stop a bigger one later', 'prompt'],
    ['Don’t put all your eggs in one basket', 'Don’t risk everything on just one thing', 'risk'],
    ['Actions speak louder than words', 'What you do matters more than what you say', 'act'],
    ['Look before you leap', 'Think carefully before you act', 'care'],
    ['Better late than never', 'Doing something late is better than not doing it at all', 'late'],
    ['When in Rome, do as the Romans do', 'Follow the customs of the place you are in', 'rome'],
    ['Birds of a feather flock together', 'People who are alike like to be together', 'alike'],
    ['A watched pot never boils', 'Waiting for something makes it seem to take longer', 'wait'],
    ['Don’t judge a book by its cover', 'Don’t judge something just by how it looks', 'looks'],
    ['The pen is mightier than the sword', 'Words can be more powerful than force', 'pen'],
    ['Many hands make light work', 'A job is easier when everyone helps', 'team'],
    ['Rome wasn’t built in a day', 'Big things take time to do', 'slow'],
    ['Absence makes the heart grow fonder', 'We miss people more when they are away', 'away'],
    ['Two heads are better than one', 'It helps to have someone to think things through with', 'team'],
    ['Practice makes perfect', 'Doing something often makes you good at it', 'practice'],
    ['Where there’s a will, there’s a way', 'If you really want something, you will find a way', 'will'],
    ['Let sleeping dogs lie', 'Don’t stir up an old trouble', 'stir'],
    ['You can’t have your cake and eat it', 'You can’t have it both ways', 'cake'],
    ['A bird in the hand is worth two in the bush', 'What you have is worth more than what you might get', 'risk'],
    ['Don’t cry over spilt milk', 'Don’t get upset about something that can’t be undone', 'milk'],
    ['Out of sight, out of mind', 'We soon forget things we don’t see', 'away'],
    ['Strike while the iron is hot', 'Act quickly while you have a good chance', 'chance'],
    ['Make hay while the sun shines', 'Make the most of a good time while it lasts', 'chance'],
    ['An apple a day keeps the doctor away', 'Eating healthy food helps keep you well', 'health'],
    ['All that glitters is not gold', 'Not everything that looks good really is good', 'looks'],
    ['Curiosity killed the cat', 'Being too nosy can get you into trouble', 'nosy'],
    ['Every dog has its day', 'Everyone gets their moment of success', 'day'],
    ['It’s raining cats and dogs', 'It is raining very heavily', 'rain'],
    ['Once in a blue moon', 'Very rarely', 'rare'],
    ['Barking up the wrong tree', 'Looking for the answer in the wrong place', 'wrong'],
    ['Let the cat out of the bag', 'Give away a secret by mistake', 'secret'],
    ['Bite the bullet', 'Face up to something unpleasant', 'brave'],
    ['Spill the beans', 'Tell a secret', 'secret'],
    ['A piece of cake', 'Something very easy', 'easy'],
    ['Under the weather', 'Feeling a bit unwell', 'ill'],
    ['Hit the nail on the head', 'Say or do something exactly right', 'right'],
    ['Kill two birds with one stone', 'Get two things done with one action', 'two'],
    ['The ball is in your court', 'It is your turn to decide or act', 'turn'],
    ['Burn the midnight oil', 'Work late into the night', 'late2'],
    ['It costs an arm and a leg', 'It is very expensive', 'cost'],
    ['Once bitten, twice shy', 'After a bad time, you are more careful', 'care'],
    ['Beggars can’t be choosers', 'If you are given help, you can’t be fussy', 'fussy'],
    ['Honesty is the best policy', 'It is always best to tell the truth', 'truth'],
    ['Necessity is the mother of invention', 'People find clever answers when they really need them', 'need'],
    ['You can lead a horse to water, but you can’t make it drink', 'You can offer help, but you can’t force someone to take it', 'horse'],
    ['Look after the pennies and the pounds will look after themselves', 'Save small amounts and they grow into a lot', 'small'],
    ['Great minds think alike', 'Clever people often have the same ideas', 'alike'],
    ['Blood is thicker than water', 'Family comes first', 'family'],
    ['There’s no place like home', 'Home is the best place to be', 'home'],
    ['Time flies when you’re having fun', 'Happy times seem to pass quickly', 'time'],
    ['Don’t bite the hand that feeds you', 'Don’t be unkind to those who help you', 'kind'],
    ['Fortune favours the brave', 'Taking a bold chance often pays off', 'risk'],
    ['Slow and steady wins the race', 'Steady effort beats rushing', 'slow'],
    ['Better safe than sorry', 'It is wiser to be careful than to regret it later', 'care'],
    ['A penny for your thoughts', 'What are you thinking about?', 'think'],
    ['All’s well that ends well', 'If it ends happily, the troubles along the way don’t matter', 'end'],
    ['Laughter is the best medicine', 'Laughing helps you feel better', 'laugh'],
    ['It takes two to tango', 'When two people quarrel, both share the blame', 'blame'],
    ['The grass is always greener on the other side', 'Other people’s lives always seem better than ours', 'envy'],
    ['Don’t throw the baby out with the bathwater', 'Don’t get rid of the good along with the bad', 'baby'],
    ['More haste, less speed', 'Rushing leads to mistakes and slows you down', 'slow'],
    ['Waste not, want not', 'If you don’t waste things, you will always have enough', 'small'],
    ['A leopard can’t change its spots', 'People don’t really change their nature', 'change'],
    ['Hold your horses', 'Wait a moment and slow down', 'slow'],
    ['Keep your chin up', 'Stay cheerful when things are hard', 'hope'],
    ['Easy come, easy go', 'Things gained easily are easily lost', 'easygo'],
    ['The more the merrier', 'It is more fun with more people', 'team'],
    ['No news is good news', 'If you hear nothing, things are probably fine', 'news'],
    ['Many a true word is spoken in jest', 'Jokes often have some truth in them', 'jest'],
    ['Every little helps', 'Even small amounts add up', 'small']
  ];
  function startMeanings(level, api) {
    const L = Math.max(1, level), total = Math.min(8, 5 + Math.floor((L - 1) / 3));
    const range = L <= 2 ? 30 : L <= 5 ? 50 : SAYINGS.length;
    const pool = SAYINGS.slice(0, range), recent = store.get('m7-mean', []);
    let picks = shuffle(pool.filter(s => !recent.includes(s[0]))).slice(0, total);
    if (picks.length < total) picks = picks.concat(shuffle(pool.filter(s => !picks.includes(s))).slice(0, total - picks.length));
    store.set('m7-mean', recent.concat(picks.map(s => s[0])).slice(-40));
    quiz(api, picks, {
      one: true,
      prompt: s => `<div class="m7-say">“${s[0]}”</div><div class="m7-ask">What does this saying mean?</div>`,
      ask: () => 'Tap the meaning that fits the saying.',
      choices: s => {
        const others = shuffle(SAYINGS.filter(o => o[2] !== s[2]).slice());
        const out = [s[1]], used = new Set([s[2]]);
        for (const o of others) { if (out.length >= 3) break; if (used.has(o[2])) continue; used.add(o[2]); out.push(o[1]); }
        return out;
      },
      answer: s => s[1],
      right: () => `${cheer()} That’s what it means.`,
      fact: s => `It means: <b>${s[1]}${/[?.]$/.test(s[1]) ? '' : '.'}</b>`
    });
  }
})();
