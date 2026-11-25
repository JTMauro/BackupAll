/* Recall: Cards & Board Games, batch 3 (Shut the Box, Cribbage, Beggar My Neighbour, Word Board) */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, store } = R;
  const TEST = !!window.__recallTest; // test hooks only exist when a test harness sets this before load

  /* ---------------- shared toolkit (k3-) ---------------- */
  const SU = ['♠', '♥', '♦', '♣'], SUN = ['spades', 'hearts', 'diamonds', 'clubs'];
  const RK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const RN = ['', 'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];
  const AN = r => (r === 1 || r === 8 ? 'an ' : 'a ') + RN[r];
  const NUMW = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];
  const red = s => s === 1 || s === 2;
  const newDeck = () => { const d = []; for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) d.push({ r, s }); return d; };
  const cname = c => RN[c.r] + ' of ' + SUN[c.s];
  const cshort = c => `<span class="${red(c.s) ? 'k3-r' : ''}">${RK[c.r]}${SU[c.s]}</span>`;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const PALS = [{ n: 'Ivy', f: '👵', p: 'she' }, { n: 'Stanley', f: '👴', p: 'he' }, { n: 'Peggy', f: '👩‍🦳', p: 'she' },
    { n: 'Albert', f: '👨‍🦳', p: 'he' }, { n: 'Joan', f: '👵', p: 'she' }, { n: 'Harold', f: '🧓', p: 'he' }];

  function cardEl(c, up = true, cls = '', tag = 'button') {
    const b = el(tag, 'k3-card ' + cls);
    if (tag === 'button') b.type = 'button';
    if (!c || !up) { b.classList.add('k3-back'); b.setAttribute('aria-label', 'Face-down card'); return b; }
    b.classList.add(red(c.s) ? 'k3-red' : 'k3-blk');
    if (c.r > 10) b.classList.add('k3-face');
    b.setAttribute('aria-label', cname(c));
    b.innerHTML = `<span class="k3-c"><b>${RK[c.r]}</b><i>${SU[c.s]}</i></span><span class="k3-big">${SU[c.s]}</span>`;
    return b;
  }
  function btn(label, color, fn) { const b = el('button', 'btn ' + color, label); b.type = 'button'; b.onclick = fn; return b; }
  function oppBar(P) {
    const o = el('div', 'k3-opp'), face = el('span', 'tile c-rose k3-who', P.f), info = el('div', 'k3-oinfo');
    o.append(face, info);
    return { o, face, info };
  }
  function talk(face) { face.classList.remove('k3-talk'); void face.offsetWidth; face.classList.add('k3-talk'); }

  /* a chunky 3D die that tumbles to a face */
  const PIPS = { 1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const FACE_AT = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };
  function makeDie(size) {
    const w = el('div', 'k3-die'); w.style.setProperty('--ds', size + 'px');
    const cube = el('div', 'k3-cube'); w.append(cube);
    [[1, 'rotateY(0deg)'], [6, 'rotateY(180deg)'], [2, 'rotateY(90deg)'], [5, 'rotateY(-90deg)'], [3, 'rotateX(90deg)'], [4, 'rotateX(-90deg)']].forEach(([n, t]) => {
      const f = el('div', 'k3-dface'); f.style.transform = t + ' translateZ(calc(var(--ds) / 2))';
      for (let i = 0; i < 9; i++) f.append(el('i', PIPS[n].includes(i) ? 'on' : ''));
      cube.append(f);
    });
    let ax = 0, ay = 0;
    const set = () => { cube.style.transform = `rotateX(-20deg) rotateY(24deg) rotateX(${ax}deg) rotateY(${ay}deg)`; };
    set();
    return {
      el: w,
      roll(n) {
        const [fx, fy] = FACE_AT[n];
        ax = Math.ceil(ax / 360) * 360 + 360 * (1 + randInt(2)) + fx;
        ay = Math.ceil(ay / 360) * 360 + 360 * (1 + randInt(2)) + fy;
        w.classList.remove('k3-off', 'k3-hop'); void w.offsetWidth; w.classList.add('k3-hop'); set();
      },
      off(on) { w.classList.toggle('k3-off', on); }
    };
  }
  function rattle() { for (let i = 0; i < 5; i++) tone(180 + randInt(140), .05, 'square', .04, i * .09); }

  R.css(`
.k3-card{position:relative; flex:none; width:var(--cw); height:calc(var(--cw) * 1.4); padding:0; border:0; cursor:pointer;
  border-radius:calc(var(--cw) * .14); font-family:var(--display); color:var(--ink); -webkit-tap-highlight-color:transparent;
  background:linear-gradient(160deg, #fff 0%, #FFF9EF 55%, #F2E6CE 100%);
  box-shadow:inset 0 -3px 0 rgba(0,0,0,.07), inset 0 2px 0 #fff, 0 3px 0 #C6AF86, 0 6px 10px rgba(0,0,0,.3);
  transition:transform .16s, box-shadow .16s, filter .2s}
.k3-red{color:#D3203A} .k3-blk{color:#1B2530} .k3-r{color:#D3203A}
.k3-c{position:absolute; left:7%; top:3%; display:flex; align-items:baseline; gap:1px; line-height:1; font-weight:700; pointer-events:none}
.k3-c b{font-size:max(20px, calc(var(--cw) * .44)); letter-spacing:-.05em}
.k3-c i{font-style:normal; font-size:max(14px, calc(var(--cw) * .32))}
.k3-big{position:absolute; left:0; right:0; bottom:8%; text-align:center; line-height:1; font-size:calc(var(--cw) * .6); pointer-events:none}
.k3-face .k3-big{left:18%; right:18%; bottom:9%; padding:5% 0; border-radius:calc(var(--cw) * .12);
  background:linear-gradient(180deg, #FFE7A0, #F6C64F); box-shadow:inset 0 -3px 0 rgba(0,0,0,.12); font-size:calc(var(--cw) * .44)}
.k3-back{background:
  radial-gradient(circle at 50% 50%, rgba(255,255,255,.95) 0 11%, transparent 12%),
  radial-gradient(circle at 50% 50%, transparent 0 20%, rgba(255,255,255,.35) 21% 25%, transparent 26%),
  repeating-linear-gradient(45deg, rgba(255,255,255,.2) 0 3px, transparent 3px 9px),
  repeating-linear-gradient(-45deg, rgba(255,255,255,.2) 0 3px, transparent 3px 9px),
  linear-gradient(160deg, #FF94AC, #DD4877);
  box-shadow:inset 0 0 0 calc(var(--cw) * .06) #FFF9EF, inset 0 0 0 calc(var(--cw) * .09) #B83A62, 0 3px 0 #8F2C4B, 0 6px 10px rgba(0,0,0,.3)}
.k3-sel{transform:translateY(-10px); box-shadow:0 0 0 4px #FFD84A, 0 0 0 7px rgba(0,0,0,.25), 0 10px 16px rgba(0,0,0,.35); z-index:5}
.k3-tgt{animation:k3-glow 1s ease-in-out infinite}
@keyframes k3-glow{0%,100%{box-shadow:0 0 0 3px #fff, 0 0 0 8px rgba(255,255,255,.35)}50%{box-shadow:0 0 0 5px #fff, 0 0 0 14px rgba(255,255,255,.12)}}
.k3-ok{transform:translateY(-6px); box-shadow:0 0 0 3px #fff, 0 9px 14px rgba(0,0,0,.35)}
.k3-no{filter:brightness(.78) saturate(.75)}
.k3-in{animation:k3-in .32s cubic-bezier(.3,1.5,.5,1) backwards}
@keyframes k3-in{0%{transform:translateY(-14px) scale(.8); opacity:.4}100%{transform:none; opacity:1}}
.k3-n{position:absolute; right:-6px; bottom:-8px; min-width:30px; padding:2px 6px; border-radius:999px; background:#18242C; color:#fff;
  font:700 18px/1.2 var(--display); box-shadow:0 2px 0 rgba(0,0,0,.3); pointer-events:none; text-align:center}
.k3-bar{display:flex; flex-wrap:wrap; justify-content:center; gap:10px 12px; margin-top:14px}
.k3-bar .btn{min-width:96px; min-height:56px; font-size:1.1rem; padding:.5em .9em}
.k3-bar .btn:disabled{opacity:.45; cursor:default}
.k3-opp{display:flex; align-items:center; gap:12px; background:rgba(0,0,0,.18); border-radius:22px; padding:8px 12px; max-width:640px; margin:0 auto}
.k3-who{width:56px; height:56px; font-size:34px; flex:none; border-radius:22%}
.k3-who.k3-talk{animation:pop .5s}
.k3-oinfo{flex:1; min-width:0; display:flex; flex-wrap:wrap; align-items:center; gap:4px 12px}
.k3-oname{font:700 1.3rem/1.1 var(--display)}
.k3-ocount{font:600 1.05rem var(--display); color:var(--on-table-soft)}
.k3-backs{display:flex; --cw:28px; padding-top:2px}
.k3-backs .k3-card{margin-left:-17px; cursor:default; box-shadow:inset 0 0 0 2px #FFF9EF, inset 0 0 0 3px #B83A62, 0 2px 0 #8F2C4B}
.k3-backs .k3-card:first-child{margin-left:0}
.k3-die{position:relative; width:var(--ds); height:var(--ds); perspective:420px; flex:none; cursor:pointer; transition:opacity .3s, filter .3s}
.k3-die::after{content:''; position:absolute; left:8%; right:8%; bottom:-14px; height:12px; border-radius:50%; background:rgba(0,0,0,.28); filter:blur(3px); z-index:-1}
.k3-die.k3-off{opacity:.25; filter:grayscale(.6)}
.k3-die.k3-hop{animation:k3-hop .95s ease-out}
@keyframes k3-hop{0%{translate:0 0}25%{translate:0 -34px}50%{translate:0 0}68%{translate:0 -12px}84%{translate:0 0}92%{translate:0 -4px}100%{translate:0 0}}
.k3-cube{position:relative; width:100%; height:100%; transform-style:preserve-3d; transition:transform .95s cubic-bezier(.2,.75,.3,1)}
.k3-dface{position:absolute; inset:0; border-radius:20%; display:grid; grid-template-columns:repeat(3,1fr); grid-template-rows:repeat(3,1fr); padding:13%;
  background:linear-gradient(150deg, #FF8C70, var(--coral) 60%, #E8553A); box-shadow:inset 0 0 0 2px rgba(255,255,255,.35), inset 0 -5px 0 rgba(0,0,0,.14);
  backface-visibility:hidden}
.k3-dface i{display:block; margin:auto; width:72%; height:72%; border-radius:50%}
.k3-dface i.on{background:radial-gradient(circle at 38% 35%, #fff, #F3E8DA 70%); box-shadow:inset 0 2px 2px rgba(0,0,0,.25)}

/* ---- Shut the Box (sx-) ---- */
.sx-wrap{max-width:660px; margin:0 auto; display:flex; flex-direction:column; align-items:center; gap:14px}
.sx-top{display:flex; gap:8px 10px; justify-content:center; flex-wrap:wrap}
.sx-chip{background:rgba(0,0,0,.2); border-radius:999px; padding:.3em .9em; font:600 1.1rem var(--display); white-space:nowrap}
.sx-chip.sx-on{background:var(--sun); color:var(--ink); box-shadow:0 3px 0 var(--sun-d)}
.sx-box{padding:14px 12px 16px; border-radius:22px; background:linear-gradient(180deg, #A9693A, #7A4A28);
  box-shadow:inset 0 3px 0 rgba(255,255,255,.22), inset 0 -6px 0 rgba(0,0,0,.25), 0 8px 0 var(--wood-d), 0 14px 22px rgba(0,0,0,.35)}
.sx-flaps{display:flex; flex-wrap:wrap; gap:6px; justify-content:center}
.sx-flap{width:var(--fw); height:calc(var(--fw) * 1.3); border:0; padding:0; cursor:pointer; border-radius:12px; font:700 calc(var(--fw) * .55)/1 var(--display); color:var(--ink);
  background:linear-gradient(180deg, #FFFDF6, #F3E3C2); box-shadow:inset 0 -5px 0 rgba(0,0,0,.1), inset 0 2px 0 #fff, 0 5px 0 #B48A55, 0 8px 10px rgba(0,0,0,.3);
  transform-origin:50% 100%; transition:transform .15s, box-shadow .15s; -webkit-tap-highlight-color:transparent}
.sx-flap.sx-ok{animation:sx-glow 1.1s ease-in-out infinite}
@keyframes sx-glow{0%,100%{box-shadow:0 0 0 3px #fff, 0 5px 0 #B48A55, 0 0 0 7px rgba(255,255,255,.3)}50%{box-shadow:0 0 0 4px #fff, 0 5px 0 #B48A55, 0 0 0 12px rgba(255,255,255,.1)}}
.sx-flap.sx-sel{background:linear-gradient(180deg, #FFE98F, var(--sun)); transform:translateY(-6px); animation:none;
  box-shadow:0 0 0 4px #fff, 0 9px 0 var(--sun-d), 0 14px 14px rgba(0,0,0,.3)}
.sx-flap.sx-hint{outline:4px dashed #FFD84A; outline-offset:4px}
.sx-flap.sx-shut{background:linear-gradient(180deg, #4A2B15, #5E3A1E); color:rgba(255,255,255,.2); box-shadow:inset 0 6px 10px rgba(0,0,0,.55); cursor:default; animation:none}
.sx-flap.sx-fold{animation:sx-fold .55s ease-in}
@keyframes sx-fold{0%{transform:perspective(320px) rotateX(0)}55%{transform:perspective(320px) rotateX(-82deg)}100%{transform:perspective(320px) rotateX(0)}}
.sx-flap.sx-up{animation:bounceIn .5s backwards}
.sx-dice{display:flex; align-items:center; gap:14px 18px; justify-content:center; flex-wrap:wrap; min-height:96px; padding-top:8px}
.sx-sum{font:700 1.6rem/1.1 var(--display); min-width:4.2em; text-align:center}
.sx-roll{min-height:64px; font-size:1.35rem}
.sx-modes{display:flex; flex-wrap:wrap; gap:12px; justify-content:center}
.sx-modes .btn{min-height:68px; font-size:1.2rem; flex:1 1 220px; max-width:300px}

/* ---- Cribbage (cx-) ---- */
.cx-wrap{max-width:640px; margin:0 auto}
.cx-board{margin:10px auto 0; padding:6px 10px 8px; border-radius:16px; background:linear-gradient(180deg, #B07240, #7A4A28);
  box-shadow:inset 0 2px 0 rgba(255,255,255,.2), 0 5px 0 var(--wood-d), 0 10px 14px rgba(0,0,0,.3); width:max-content; max-width:100%}
.cx-lab{display:flex; align-items:baseline; gap:10px; font:600 1.05rem/1.25 var(--display); color:#FFF3DC; margin-top:2px}
.cx-lab b{font-size:1.2rem} .cx-lab span + b + span{margin-left:auto}
.cx-track{position:relative; margin:3px 0}
.cx-hole{position:absolute; width:5px; height:5px; margin:-2.5px 0 0 -2.5px; border-radius:50%; background:#3A1F0C; box-shadow:0 1px 0 rgba(255,255,255,.25)}
.cx-hole.cx-big{width:10px; height:10px; margin:-5px 0 0 -5px}
.cx-peg{position:absolute; width:12px; height:12px; margin:-6px 0 0 -6px; border-radius:50%; z-index:2; box-shadow:0 2px 0 rgba(0,0,0,.45);
  transition:left .9s cubic-bezier(.3,1.25,.5,1), top .9s cubic-bezier(.3,1.25,.5,1)}
.cx-t0 .cx-peg{background:radial-gradient(circle at 35% 30%, #DDF0FF, var(--sky) 55%, var(--sky-d))}
.cx-t1 .cx-peg{background:radial-gradient(circle at 35% 30%, #FFE0D6, var(--coral) 55%, var(--coral-d))}
.cx-mid{display:flex; justify-content:center; align-items:flex-start; gap:12px; margin-top:12px; min-height:calc(var(--cw) * 1.4 + 34px)}
.cx-stack{display:flex; flex-direction:column; align-items:center; flex:none; position:relative}
.cx-stack .k3-card{position:relative}
.cx-cap{font:600 1rem/1.15 var(--display); color:var(--on-table-soft); text-align:center; margin-top:6px; max-width:calc(var(--cw) + 30px)}
.cx-play{display:flex; flex-direction:column; align-items:center; flex:1; min-width:0}
.cx-seq{display:flex; min-height:calc(var(--cw) * 1.4)}
.cx-seq .k3-card{margin-left:calc(var(--cw) * -.58); cursor:default}
.cx-seq .k3-card:first-child{margin-left:0}
.cx-seq .cx-cpu{transform:translateY(-6px)}
.cx-count{font:700 1.35rem/1.2 var(--display); margin-top:6px}
.cx-chips{display:flex; flex-wrap:wrap; gap:6px; justify-content:center; align-content:flex-start}
.cx-chip{background:var(--card); color:var(--ink); border-radius:12px; padding:3px 10px; font:600 1.05rem/1.3 var(--display); box-shadow:0 3px 0 var(--card-edge); animation:bounceIn .45s backwards}
.cx-chip b{color:var(--leaf-d)}
.cx-total{font:700 1.4rem var(--display); width:100%; text-align:center}
.cx-hand{display:flex; justify-content:center; align-items:flex-end; margin-top:14px; min-height:calc(var(--cw) * 1.4 + 10px)}
.cx-hand .k3-card + .k3-card{margin-left:calc(var(--cw) * -.2)}
.cx-hand .cx-gap{margin-left:14px !important}
.cx-who{font:700 1.1rem var(--display); text-align:center; margin-top:10px}
.cx-quiz .btn{min-width:72px; font-size:1.5rem}

/* ---- Beggar My Neighbour (bn-) ---- */
.bn-wrap{max-width:560px; margin:0 auto; display:flex; flex-direction:column; align-items:center; gap:8px}
.bn-row{display:flex; align-items:center; justify-content:center; gap:16px}
.bn-pile{position:relative; border:0; background:none; padding:0; cursor:pointer; width:calc(var(--cw) + 10px); height:calc(var(--cw) * 1.4 + 8px); -webkit-tap-highlight-color:transparent}
.bn-pile .k3-card{position:absolute; left:0; top:0; cursor:inherit}
.bn-pile.bn-empty{opacity:.4}
.bn-lab{font:600 1.1rem/1.25 var(--display); text-align:left; min-width:120px}
.bn-lab b{display:block; font-size:1.5rem}
.bn-mid{position:relative; width:100%; height:calc(var(--cw) * 1.4 + 36px)}
.bn-mid .k3-card{position:absolute; left:50%; top:50%; margin:calc(var(--cw) * -.7) 0 0 calc(var(--cw) * -.5); cursor:default}
.bn-mid .bn-num{position:absolute; right:8px; bottom:4px; font:600 1.05rem var(--display); color:var(--on-table-soft)}
.bn-fT{animation:bn-ft .4s cubic-bezier(.3,1.3,.5,1) backwards}
.bn-fB{animation:bn-fb .4s cubic-bezier(.3,1.3,.5,1) backwards}
@keyframes bn-ft{0%{translate:0 -170px; scale:.75}100%{translate:0 0; scale:1}}
@keyframes bn-fb{0%{translate:0 170px; scale:.75}100%{translate:0 0; scale:1}}
.bn-court{animation:bn-court .7s ease-out}
@keyframes bn-court{0%{scale:1}40%{scale:1.22}100%{scale:1}}
.bn-sU .k3-card{animation:bn-su .5s ease-in forwards}
.bn-sD .k3-card{animation:bn-sd .5s ease-in forwards}
@keyframes bn-su{to{translate:0 -190px; scale:.6; opacity:0}}
@keyframes bn-sd{to{translate:0 190px; scale:.6; opacity:0}}
.bn-debt{display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:center; min-height:44px; font:600 1.1rem var(--display)}
.bn-coin{width:30px; height:30px; border-radius:50%; display:grid; place-items:center; font:700 16px var(--display); color:var(--ink);
  background:radial-gradient(circle at 35% 30%, #FFF0B0, var(--sun) 60%); box-shadow:0 3px 0 var(--sun-d)}
.bn-coin.bn-paid{opacity:.28}
.bn-note{font:600 1.05rem var(--display); color:var(--on-table-soft); text-align:center}

/* ---- Word Board (wq-) ---- */
.wq-wrap{max-width:600px; margin:0 auto; display:flex; flex-direction:column; align-items:center; gap:10px}
.wq-top{display:flex; align-items:center; justify-content:center; gap:10px; width:100%}
.wq-sc{flex:1 1 0; min-width:0; max-width:180px; background:rgba(0,0,0,.2); border-radius:16px; padding:6px 8px; text-align:center; font:600 1.05rem/1.15 var(--display)}
.wq-sc b{display:block; font-size:1.75rem; line-height:1.1}
.wq-sc small{display:block; font-size:.95rem; color:var(--on-table-soft)}
.wq-sc.wq-on{background:var(--sun); color:var(--ink); box-shadow:0 4px 0 var(--sun-d)}
.wq-sc.wq-on small{color:var(--ink-soft)}
.wq-map{position:relative; flex:none; display:grid; gap:1px; padding:4px; border-radius:10px; background:#073F4D; cursor:pointer; border:0;
  box-shadow:0 4px 0 rgba(0,0,0,.3); -webkit-tap-highlight-color:transparent}
.wq-map i{display:block; width:var(--mc); height:var(--mc); border-radius:1px; background:#1C7987}
.wq-map i.p2{background:#7CC8F0} .wq-map i.p3{background:#FF8A6A} .wq-map i.t{background:var(--sun)} .wq-map i.n{background:#fff}
.wq-view{position:absolute; border:2px solid #fff; border-radius:3px; box-shadow:0 0 0 1px rgba(0,0,0,.5); pointer-events:none; transition:left .25s, top .25s}
.wq-board{display:grid; gap:3px; padding:5px; border-radius:16px; background:#073F4D; box-shadow:0 6px 0 rgba(0,0,0,.3), 0 12px 18px rgba(0,0,0,.25)}
.wq-cell{width:var(--cs); height:var(--cs); border:0; padding:0; border-radius:9px; background:#1C7987; color:#fff; cursor:pointer; position:relative;
  display:grid; place-items:center; font:700 calc(var(--cs) * .32)/1 var(--display); -webkit-tap-highlight-color:transparent}
.wq-DL{background:#8ED3F5; color:#0B3A5E} .wq-TL{background:#2F86D6; color:#fff}
.wq-DW{background:#FFB0C2; color:#6A1630} .wq-TW{background:#FF7A55; color:#fff} .wq-ST{background:#FFB0C2; color:#C2185B; font-size:calc(var(--cs) * .55)}
.wq-cell.wq-aim{box-shadow:inset 0 0 0 3px rgba(255,255,255,.7)}
.wq-tile{background:linear-gradient(155deg, #FFFDF5, #FBE7BC); color:var(--ink); font-size:calc(var(--cs) * .56);
  box-shadow:inset 0 -4px 0 rgba(0,0,0,.12), inset 0 2px 0 #fff, 0 3px 0 #B48A55}
.wq-tile i{position:absolute; right:4px; bottom:2px; font:700 max(12px, calc(var(--cs) * .25))/1 var(--display); font-style:normal; color:var(--ink-soft)}
.wq-tile.wq-pend{background:linear-gradient(155deg, #FFF3A8, var(--sun)); box-shadow:0 0 0 3px #fff, inset 0 -4px 0 rgba(0,0,0,.12), 0 3px 0 var(--sun-d); animation:bounceIn .35s}
.wq-tile.wq-last{box-shadow:0 0 0 3px var(--mint), inset 0 -4px 0 rgba(0,0,0,.12), 0 3px 0 #B48A55}
.wq-tile.wq-drop{animation:bounceIn .45s}
.wq-rack{display:flex; gap:5px; justify-content:center; padding:7px 8px; border-radius:16px; background:linear-gradient(180deg, #A9693A, #7A4A28);
  box-shadow:inset 0 2px 0 rgba(255,255,255,.2), 0 5px 0 var(--wood-d), 0 9px 14px rgba(0,0,0,.3); min-height:72px; align-items:center}
.wq-rt{position:relative; width:var(--rs); height:58px; border:0; padding:0; border-radius:10px; cursor:pointer; font:700 1.8rem/1 var(--display); color:var(--ink);
  background:linear-gradient(155deg, #FFFDF5, #FBE7BC); box-shadow:inset 0 -4px 0 rgba(0,0,0,.12), inset 0 2px 0 #fff, 0 4px 0 #8C6238; transition:transform .15s; -webkit-tap-highlight-color:transparent}
.wq-rt i{position:absolute; right:4px; bottom:3px; font:700 13px/1 var(--display); font-style:normal; color:var(--ink-soft)}
.wq-rt.wq-sel{transform:translateY(-9px); background:linear-gradient(155deg, #FFF3A8, var(--sun)); box-shadow:0 0 0 3px #fff, 0 6px 0 var(--sun-d), 0 10px 12px rgba(0,0,0,.3)}
.wq-side{display:flex; flex-direction:column; align-items:center; gap:10px}
.wq-wide{max-width:none; display:grid; grid-template-columns:auto 250px; grid-template-areas:'top top' 'board side'; gap:12px 18px; justify-content:center; align-items:start}
.wq-wide .wq-top{grid-area:top} .wq-wide .wq-board{grid-area:board} .wq-wide .wq-side{grid-area:side}
.wq-wide .wq-rack{flex-wrap:wrap; width:100%} .wq-wide .wq-btns .btn{flex:1 1 100px}
.wq-btns{display:flex; flex-wrap:wrap; justify-content:center; gap:8px}
.wq-btns .btn{min-height:56px; min-width:0; padding:.4em .7em; font-size:1.05rem}
.wq-btns .wq-play{font-size:1.2rem; padding:.4em 1em}
.wq-btns .btn:disabled{opacity:.45; cursor:default}
`);

  register({ id: 'shutbox', cat: 'cards', order: 27, name: 'Shut the Box', icon: '🎲', desc: 'Roll the dice and shut the numbered flaps', gentle: true, start: startShut });
  register({ id: 'cribbage', cat: 'cards', order: 28, name: 'Cribbage', icon: '📍', desc: 'Fifteens, pairs and runs, pegged on a board', start: startCrib });
  register({ id: 'beggar', cat: 'cards', order: 29, name: 'Beggar My Neighbour', icon: '🤴', desc: 'Turn cards; court cards make your friend pay', gentle: true, start: startBeggar });
  register({ id: 'wordboard', cat: 'cards', order: 30, name: 'Word Board', icon: '🔤', desc: 'Build crossing words with letter tiles', start: startWordBoard });

  /* =========================================================
     SHUT THE BOX
     ========================================================= */
  function startShut(L, api) {
    const N = L <= 1 ? 6 : 9;
    const P = PALS[(L + randInt(3)) % PALS.length];
    const smart = Math.min(.85, .1 + (L - 1) * .1);
    const W = api.stage.clientWidth || 340;
    const cols = W >= N * 72 + 40 ? N : Math.ceil(N / 2);
    const fw = Math.max(54, Math.min(74, Math.floor((W - 28 - (cols - 1) * 6) / cols)));
    const key = 'sx-best-' + N, prevBest = store.get(key, null);
    const open = []; for (let i = 1; i <= N; i++) open[i] = true;
    let sel = [], roll = 0, dice = [0, 0], oneDie = false, phase = 'mode', who = 0, mode = '', scores = [null, null], mistakes = 0, over = false, hintSet = null;
    const root = el('div', 'sx-wrap'); root.style.setProperty('--fw', fw + 'px');
    const top = el('div', 'sx-top'), box = el('div', 'sx-box'), flapsRow = el('div', 'sx-flaps'), diceRow = el('div', 'sx-dice'), bar = el('div', 'k3-bar');
    flapsRow.style.width = (cols * fw + (cols - 1) * 6) + 'px';
    box.append(flapsRow);
    const d1 = makeDie(60), d2 = makeDie(60), sumEl = el('div', 'sx-sum', '&nbsp;');
    const rollB = btn('🎲 Roll', 'c-sun sx-roll', () => { if (who === 0) doRoll(); });
    d1.el.onclick = d2.el.onclick = () => { if (who === 0 && phase === 'roll') doRoll(); };
    diceRow.append(d1.el, d2.el, sumEl, rollB);
    root.append(top, box, diceRow, bar); api.stage.append(root);
    const flapEls = [];
    for (let i = 1; i <= N; i++) {
      const b = el('button', 'sx-flap', String(i)); b.type = 'button'; b.setAttribute('aria-label', 'Flap ' + i);
      b.onclick = () => tapFlap(i); b.addEventListener('animationend', e => { if (e.animationName === 'sx-fold' || e.animationName === 'bounceIn') b.classList.remove('sx-fold', 'sx-up'); });
      flapEls[i] = b; flapsRow.append(b);
    }
    const openList = () => { const a = []; for (let i = 1; i <= N; i++) if (open[i]) a.push(i); return a; };
    const openSum = () => openList().reduce((s, x) => s + x, 0);
    function combos(target) {
      const os = openList(), list = [];
      for (let m = 1; m < 1 << os.length; m++) { let s = 0; const set = []; for (let j = 0; j < os.length; j++) if (m >> j & 1) { s += os[j]; set.push(os[j]); } if (s === target) list.push(set); }
      return list;
    }
    const bestOf = list => list.slice().sort((a, b) => a.length - b.length || Math.max(...b) - Math.max(...a))[0];
    function validFlaps() {
      const s = new Set(); if (phase !== 'pick') return s;
      combos(roll).forEach(cb => { if (sel.every(x => cb.includes(x))) cb.forEach(x => { if (!sel.includes(x)) s.add(x); }); });
      return s;
    }
    const nameOf = p => p === 0 ? 'You' : P.n;
    function render() {
      const v = who === 0 ? validFlaps() : new Set();
      for (let i = 1; i <= N; i++) {
        const b = flapEls[i], keep = ['sx-fold', 'sx-up'].filter(c => b.classList.contains(c));
        b.className = 'sx-flap' + (open[i] ? '' : ' sx-shut') + (sel.includes(i) ? ' sx-sel' : '') + (v.has(i) ? ' sx-ok' : '') + (hintSet && hintSet.includes(i) && !sel.includes(i) ? ' sx-hint' : '') + (keep.length ? ' ' + keep.join(' ') : '');
      }
      top.innerHTML = '';
      if (mode === 'cpu') {
        [0, 1].forEach(p => top.append(el('span', 'sx-chip' + (who === p && !over ? ' sx-on' : ''), (p ? P.f + ' ' : '🙂 ') + nameOf(p) + ': ' + (scores[p] == null ? (who === p ? 'playing' : '–') : scores[p]))));
      } else if (mode === 'best') {
        top.append(el('span', 'sx-chip sx-on', '🙂 Flaps open: ' + openSum()));
        top.append(el('span', 'sx-chip', '🏆 Best: ' + (prevBest == null ? 'none yet' : prevBest)));
      }
      top.append(el('span', 'sx-chip', 'Lower is better'));
      rollB.hidden = !(phase === 'roll' && who === 0);
      diceRow.hidden = phase === 'mode';
      bar.innerHTML = '';
      if (phase === 'mode') {
        const m = el('div', 'sx-modes');
        m.append(btn(`${P.f} Play against ${P.n}`, 'c-rose', () => choose('cpu')), btn('🏆 Beat my best score', 'c-sky', () => choose('best')));
        bar.append(m);
      } else if (phase === 'pick' && who === 0) {
        bar.append(btn('💡 Hint', 'c-sky', showHint), btn('↺ Clear', 'c-card', () => { sel = []; sfx.tap(); api.hint(`Tap flaps that add up to ${roll}.`); render(); }));
      }
    }
    function choose(m) {
      mode = m; phase = 'roll'; who = 0; sfx.tap();
      api.hint(m === 'cpu' ? `You go first. Tap Roll to roll the dice. ${P.n} will try to beat your total.` : 'Tap Roll to roll the dice. Shut as many flaps as you can.');
      render();
    }
    function doRoll() {
      if (phase !== 'roll' || over) return;
      phase = 'rolling'; hintSet = null; sel = [];
      oneDie = openSum() <= 6;
      dice = [1 + randInt(6), oneDie ? 0 : 1 + randInt(6)]; roll = dice[0] + dice[1];
      d1.roll(dice[0]); if (oneDie) d2.off(true); else d2.roll(dice[1]);
      rattle(); sumEl.innerHTML = '&nbsp;';
      if (who === 1) api.hint(`${P.n} rolls the dice…`);
      else if (oneDie) api.hint('Only 6 or less is left open, so you roll just one die.');
      render();
      api.later(afterRoll, 1050);
    }
    function afterRoll() {
      sumEl.textContent = oneDie ? 'Rolled ' + roll : `${dice[0]} + ${dice[1]} = ${roll}`;
      tone(520, .12, 'triangle', .1);
      const list = combos(roll);
      if (!list.length) { endRound(); return; }
      phase = 'pick';
      if (who === 0) {
        if (L <= 1) hintSet = bestOf(list);
        api.hint(`You rolled ${roll}. Tap flaps that add up to ${roll}. The glowing ones will work.`);
        render();
      } else { render(); cpuPick(list); }
    }
    function tapFlap(i) {
      if (over || who !== 0) return;
      if (phase === 'roll') { sfx.soft(); api.hint('Roll the dice first. Tap Roll.'); wob(rollB); return; }
      if (phase !== 'pick') return;
      if (!open[i]) { sfx.soft(); api.hint('That flap is already shut.'); return; }
      if (sel.includes(i)) { sel = sel.filter(x => x !== i); sfx.tap(); api.hint(`Tap flaps that add up to ${roll}.`); render(); return; }
      if (!validFlaps().has(i)) {
        sfx.soft(); mistakes++; wob(flapEls[i]);
        api.hint(sel.length ? `${i} won't fit with the flaps you've picked. Tap a glowing flap, or Clear.` : `${i} can't help make ${roll}. Try a glowing flap.`);
        return;
      }
      sel.push(i); tone(440 + sel.length * 90, .14, 'triangle', .12);
      const s = sel.reduce((a, b) => a + b, 0);
      if (s === roll) shutSel();
      else { api.hint(`${s} so far. ${roll - s} more to make ${roll}.`); render(); }
    }
    function shutSel() {
      phase = 'shutting';
      const list = sel.slice();
      list.forEach((i, k) => { open[i] = false; flapEls[i].classList.add('sx-fold'); tone(300 - k * 30, .1, 'sine', .12, k * .08); });
      sel = []; hintSet = null; render();
      if (who === 0) api.hint(`${cheer()} You shut ${list.join(' and ')}.`);
      api.later(() => {
        if (over) return;
        if (!openSum()) { shutAll(); return; }
        phase = 'roll';
        if (who === 0) api.hint('Lovely. Roll again!');
        render();
        if (who === 1) api.later(doRoll, 900);
      }, 800);
    }
    function cpuPick(list) {
      const cb = Math.random() < smart ? bestOf(list) : pick(list);
      api.hint(`${P.n} rolled ${roll} and shuts ${cb.join(' and ')}.`);
      cb.forEach((x, k) => api.later(() => { sel.push(x); tone(440 + k * 90, .12, 'triangle', .1); render(); }, 700 + k * 550));
      api.later(shutSel, 900 + cb.length * 550);
    }
    function endRound() {
      const sc = openSum(); scores[who] = sc; phase = 'end'; render();
      if (who === 0) {
        if (mode === 'best') { finish(); return; }
        sfx.soft();
        api.hint(`No flaps add up to ${roll}. Your total is ${sc}. Now it's ${P.n}'s turn to beat ${sc}.`);
        api.later(() => {
          for (let i = 1; i <= N; i++) { open[i] = true; flapEls[i].classList.add('sx-up'); }
          who = 1; phase = 'roll'; d2.off(false); sumEl.innerHTML = '&nbsp;'; render();
          api.later(doRoll, 900);
        }, 2600);
      } else {
        api.hint(`${P.n} can't make ${roll}, so ${P.p} finishes on ${sc}.`);
        api.later(finish, 1600);
      }
    }
    function shutAll() {
      scores[who] = 0; phase = 'end';
      if (who === 0) { sfx.win(); toast('You shut the box! ' + cheer()); for (let i = 1; i <= N; i++) flapEls[i].classList.add('sx-up'); }
      else tone(660, .2, 'triangle', .1);
      render(); api.later(finish, 1200);
    }
    function finish() {
      if (over) return; over = true; render();
      const you = scores[0];
      let stars, msg;
      if (mode === 'best') {
        const isBest = prevBest == null || you < prevBest;
        if (prevBest == null || you <= prevBest) store.set(key, you);
        if (you === 0) { stars = 3; msg = 'You shut the whole box. Perfect!'; }
        else if (isBest && prevBest != null) { stars = 3; msg = `A new best score: ${you}! (It was ${prevBest}.)`; sfx.good(); }
        else { stars = you <= Math.round(N * (N + 1) / 2 * .2) ? 3 : 2; msg = `You finished with ${you}.` + (prevBest == null ? ' That is your first best score.' : ` Your best is ${Math.min(prevBest, you)}.`); }
      } else {
        const them = scores[1];
        if (you === 0) { stars = 3; msg = 'You shut the box. You win!'; }
        else if (them === 0) { stars = 1; msg = `${P.n} shut the whole box! Lucky ${P.p === 'she' ? 'her' : 'him'}. Well played, have another go.`; }
        else if (you < them) { stars = them - you >= 5 ? 3 : 2; msg = `You win, ${you} to ${them}! ${cheer()}`; sfx.good(); }
        else if (you === them) { stars = 2; msg = `A tie, ${you} each. How about that!`; }
        else { stars = 1; msg = `${P.n} wins this time, ${them} to ${you}. That was fun, well played!`; }
      }
      api.hint(msg);
      api.later(() => api.done(stars), 1800);
    }
    function showHint() {
      const list = combos(roll).filter(cb => sel.every(x => cb.includes(x)));
      const b = bestOf(list.length ? list : combos(roll));
      if (!list.length) sel = [];
      hintSet = b; sfx.tap(); api.hint(`Try shutting ${b.join(' and ')}. That makes ${roll}.`); render();
    }
    api.hint(`Shut the Box! Roll the dice, then shut flaps that add up to the roll. How would you like to play?`);
    render();
    if (TEST) window.__k3Shut = {
      bot(m = 'cpu') {
        if (over) return 'over';
        if (phase === 'mode') { choose(m); return 'move'; }
        if (who !== 0) return 'wait';
        if (phase === 'roll') { doRoll(); return 'move'; }
        if (phase !== 'pick') return 'wait';
        const list = combos(roll).filter(cb => sel.every(x => cb.includes(x)));
        const nx = bestOf(list).find(x => !sel.includes(x)); tapFlap(nx); return 'move';
      }
    };
  }

  /* =========================================================
     CRIBBAGE
     ========================================================= */
  const cval = c => Math.min(10, c.r);
  function scoreHand(cards, starter, isCrib) {
    const all = starter ? cards.concat([starter]) : cards.slice(), items = []; let tot = 0;
    const add = (label, pts, cs, kind) => { tot += pts; items.push({ label, pts, tot, cs, kind }); };
    const n = all.length;
    for (let m = 1; m < 1 << n; m++) { let s = 0; const cs = []; for (let j = 0; j < n; j++) if (m >> j & 1) { s += cval(all[j]); cs.push(all[j]); } if (s === 15) add('fifteen', 2, cs, 'f'); }
    const byR = {}; all.forEach(c => (byR[c.r] = byR[c.r] || []).push(c));
    for (let r = 1; r <= 13; r++) { const g = byR[r]; if (g && g.length > 1) add(g.length === 2 ? 'a pair' : g.length === 3 ? 'three of a kind' : 'four of a kind', [0, 0, 2, 6, 12][g.length], g, 'p'); }
    for (let r = 1; r <= 13;) {
      if (!byR[r]) { r++; continue; }
      let e = r; while (e < 13 && byR[e + 1]) e++;
      const len = e - r + 1;
      if (len >= 3) {
        let mult = 1; const cs = []; for (let k = r; k <= e; k++) { mult *= byR[k].length; cs.push(...byR[k]); }
        add((mult === 1 ? 'a run of ' : mult === 2 ? 'a double run of ' : mult === 3 ? 'a triple run of ' : 'a double double run of ') + NUMW[len], len * mult, cs, 'r');
      }
      r = e + 1;
    }
    if (cards.length === 4 && cards.every(c => c.s === cards[0].s)) {
      if (starter && starter.s === cards[0].s) add('a flush of five', 5, all, 'x');
      else if (!isCrib) add('a flush of four', 4, cards, 'x');
    }
    if (starter) { const j = cards.find(c => c.r === 11 && c.s === starter.s); if (j) add('his nobs', 1, [j], 'n'); }
    return { total: tot, items };
  }
  function callOut(res) {
    if (!res.total) return 'No points this time.';
    const parts = res.items.map(it => it.kind === 'f' ? 'fifteen ' + it.tot : it.label + ' is ' + it.tot);
    return cap(parts.join(', ')) + '.';
  }
  function pegScore(seq, count) {
    let pts = 0; const why = [];
    if (count === 15) { pts += 2; why.push('fifteen for 2'); }
    if (count === 31) { pts += 2; why.push('thirty-one for 2'); }
    const last = seq[seq.length - 1]; let k = 1;
    for (let i = seq.length - 2; i >= 0 && seq[i].c.r === last.c.r; i--) k++;
    if (k >= 2) { pts += [0, 0, 2, 6, 12][k]; why.push(k === 2 ? 'a pair for 2' : k === 3 ? 'three of a kind for 6' : 'four of a kind for 12'); }
    for (let len = seq.length; len >= 3; len--) {
      const rs = seq.slice(-len).map(x => x.c.r).sort((a, b) => a - b); let ok = true;
      for (let i = 1; i < len; i++) if (rs[i] !== rs[i - 1] + 1) { ok = false; break; }
      if (ok) { pts += len; why.push(`a run of ${NUMW[len]} for ${len}`); break; }
    }
    return { pts, why };
  }
  function discardChoices(h, own) {
    const out = [];
    for (let i = 0; i < h.length; i++) for (let j = i + 1; j < h.length; j++) {
      const keep = h.filter((_, k) => k !== i && k !== j);
      let v = scoreHand(keep, null, false).total;
      const a = h[i], b = h[j]; let cv = 0;
      if (cval(a) + cval(b) === 15) cv += 2; if (a.r === b.r) cv += 2; if (Math.abs(a.r - b.r) === 1) cv += 1; if (a.r === 5) cv += 1; if (b.r === 5) cv += 1;
      v += own ? cv : -cv;
      // keeping fives and middling cards helps a little
      v += keep.filter(c => c.r === 5).length * .5;
      out.push({ i, j, v });
    }
    return out.sort((x, y) => y.v - x.v);
  }

  function startCrib(L, api) {
    const P = pick(PALS), They = cap(P.p);
    const target = L <= 6 ? 61 : 121, autoCount = L <= 3, smart = Math.min(.85, .15 + (L - 1) * .1);
    const W = api.stage.clientWidth || 340, cw = W < 520 ? 50 : 60;
    const score = [0, 0], backS = [0, 0];
    let dealer = 1, hands = [[], []], crib = [], starter = null, deck = [], phase = 'discard', sel = [];
    let ph = [[], []], seq = [], count = 0, lastP = -1, goF = [false, false], turn = 0, over = false, mistakes = 0, busy = false;
    let showList = [], showI = 0, shown = null, freshSeq = null;
    const root = el('div', 'cx-wrap'); root.style.setProperty('--cw', cw + 'px');
    const { o, face, info } = oppBar(P);
    const board = el('div', 'cx-board'), mid = el('div', 'cx-mid'), whoRow = el('div', 'cx-who'), handRow = el('div', 'cx-hand'), bar = el('div', 'k3-bar');
    root.append(o, board, mid, whoRow, handRow, bar); api.stage.append(root);
    const nm = p => p === 0 ? 'You' : P.n;

    /* peg board */
    const rows = (target - 1) / 30, BW = Math.min(W, 620) - 24, gg = 4, hs = Math.max(7, (BW - 36 - 5 * gg) / 30);
    const hx = i => i <= 0 ? 6 : i >= target ? 18 + 30 * hs + 5 * gg + 6 : 18 + ((i - 1) % 30) * hs + Math.floor(((i - 1) % 30) / 5) * gg + hs / 2;
    const hy = i => i <= 0 ? hs / 2 : i >= target ? (rows - 1) * hs + hs / 2 : Math.floor((i - 1) / 30) * hs + hs / 2;
    const tracks = [0, 1].map(p => {
      const lab = el('div', 'cx-lab'), t = el('div', 'cx-track cx-t' + p);
      t.style.height = rows * hs + 'px'; t.style.width = (36 + 30 * hs + 5 * gg) + 'px';
      let html = ''; for (let i = 0; i <= target; i++) html += `<i class="cx-hole${i === 0 || i === target ? ' cx-big' : ''}" style="left:${hx(i).toFixed(1)}px;top:${hy(i).toFixed(1)}px"></i>`;
      t.innerHTML = html;
      const pegs = [el('b', 'cx-peg'), el('b', 'cx-peg')]; t.append(...pegs);
      board.append(lab, t);
      return { t, lab, pegs, front: 0 };
    });
    function placePegs() {
      tracks.forEach((tr, p) => {
        const f = tr.pegs[tr.front], b = tr.pegs[1 - tr.front];
        f.style.left = hx(score[p]) + 'px'; f.style.top = hy(score[p]) + 'px';
        b.style.left = (backS[p] === 0 && score[p] === 0 ? hx(0) : hx(backS[p])) + 'px'; b.style.top = (backS[p] === 0 && score[p] === 0 ? hy(0) + hs * (rows > 2 ? 1.2 : .9) : hy(backS[p])) + 'px';
        tr.lab.innerHTML = p === 0 ? `<span>🔵 You</span><b>${score[0]}</b><span>of ${target}</span>` : `<span>🔺 ${P.n}</span><b>${score[1]}</b><span></span>`;
      });
    }
    placePegs();
    function award(p, pts) {
      if (!pts || over) return false;
      const tr = tracks[p];
      backS[p] = score[p]; score[p] = Math.min(target, score[p] + pts); tr.front = 1 - tr.front;
      for (let k = 0; k < Math.min(pts, 6); k++) tone((p ? 392 : 523) + k * 60, .09, 'triangle', .09, k * .07);
      placePegs();
      if (score[p] >= target) { gameOver(p); return true; }
      return false;
    }
    function gameOver(p) {
      over = true; busy = true; bar.innerHTML = '';
      const d = Math.abs(score[0] - score[1]);
      if (p === 0) { sfx.win(); toast('You pegged out! ' + cheer()); api.hint(`You reach ${target} and win the game, ${score[0]} to ${score[1]}! ${cheer()}`); api.later(() => api.done(mistakes <= 1 || d >= 15 ? 3 : 2), 2400); }
      else { sfx.soft(); api.hint(`${P.n} reaches ${target} first, ${score[1]} to ${score[0]}. What a good game. Well played!`); api.later(() => api.done(1), 2600); }
    }

    function deal() {
      deck = shuffle(newDeck());
      hands = [deck.splice(0, 6), deck.splice(0, 6)];
      hands.forEach(h => h.sort((a, b) => a.r - b.r || a.s - b.s));
      crib = []; starter = null; sel = []; seq = []; count = 0; lastP = -1; goF = [false, false]; shown = null; busy = false;
      phase = 'discard';
      api.hint(`New deal. It's ${dealer === 0 ? 'your' : P.n + "'s"} crib. Tap two cards to put in the crib, then tap "Put in crib".`);
      render();
    }
    function cpuDiscard() {
      const ch = discardChoices(hands[1], dealer === 1);
      const c = Math.random() < smart ? ch[0] : ch[randInt(Math.ceil(ch.length / 2))];
      const d = [hands[1][c.i], hands[1][c.j]];
      hands[1] = hands[1].filter(x => !d.includes(x));
      return d;
    }
    function putInCrib() {
      if (phase !== 'discard' || sel.length !== 2 || busy) return;
      sfx.tap();
      crib = sel.slice().concat(cpuDiscard());
      hands[0] = hands[0].filter(x => !sel.includes(x)); sel = [];
      phase = 'cut'; talk(face);
      api.hint(`${P.n} puts two cards in the crib too. Now tap the pack to turn up the starter card.`);
      render();
    }
    function cut() {
      if (phase !== 'cut' || busy) return;
      starter = deck.splice(randInt(deck.length - 4) + 2, 1)[0];
      tone(600, .12, 'triangle', .1);
      phase = 'peg'; busy = true;
      ph = [hands[0].slice(), hands[1].slice()];
      let msg = `The starter is the ${cname(starter)}.`;
      render();
      if (starter.r === 11) { msg += ` A Jack! "Two for his heels" to ${dealer === 0 ? 'you' : P.n}.`; if (award(dealer, 2)) return; }
      api.hint(msg + ` Now play cards in turn, counting up to 31.`);
      api.later(() => { busy = false; nextTurn(1 - dealer); }, 1800);
    }
    const canPlay = p => ph[p].some(c => cval(c) + count <= 31);
    function resetCount() { seq = []; count = 0; goF = [false, false]; }
    function nextTurn(p) {
      if (over) return;
      if (!ph[0].length && !ph[1].length) {
        let msg = '';
        if (count > 0 && count !== 31 && lastP >= 0) { msg = `${lastP === 0 ? 'You get' : P.n + ' gets'} one for last card. `; if (award(lastP, 1)) return; }
        phase = 'pegdone'; render();
        api.hint(msg + 'All the cards are played. Time to count the hands!');
        api.later(startShow, 2200);
        return;
      }
      if (canPlay(p)) {
        turn = p;
        if (p === 0) { api.hint(`${goF[1] ? P.n + ' said "Go". ' : ''}Your turn. The count is ${count}. Tap a card to play.`); render(); }
        else { render(); api.later(cpuPlay, 1200); }
        return;
      }
      const q = 1 - p;
      if (canPlay(q)) {
        if (!goF[p]) {
          goF[p] = true;
          if (ph[p].length) api.hint(p === 0 ? `You can't play without going over 31, so you say "Go".` : `${P.n} can't play, so ${P.p} says "Go".`);
          if (p === 1) talk(face);
        }
        turn = q; busy = true; render(); api.later(() => { busy = false; nextTurn(q); }, ph[p].length ? 1500 : 300);
        return;
      }
      // nobody can play: the go point
      let msg = '';
      if (count !== 31 && lastP >= 0) msg = `Nobody can play, so ${lastP === 0 ? 'you get' : P.n + ' gets'} one for the go. `;
      const lp = lastP;
      if (msg && award(lp, 1)) return;
      api.hint(msg + 'The count starts again from nought.');
      busy = true; render();
      api.later(() => { resetCount(); busy = false; render(); nextTurn(1 - lp); }, 1900);
    }
    function play(p, c) {
      ph[p] = ph[p].filter(x => x !== c);
      seq.push({ c, p }); count += cval(c); lastP = p; freshSeq = c;
      tone(p ? 392 : 494, .1, 'triangle', .1);
      const { pts, why } = pegScore(seq, count);
      let msg = `${p === 0 ? 'You play' : P.n + ' plays'} the ${cname(c)}. Count ${count}.`;
      if (pts) msg += ` ${cap(why.join(' and '))}${why.length > 1 ? ', ' + pts + ' in all' : ''}!`;
      api.hint(msg); render();
      if (pts) { if (p === 0) sfx.good(); if (award(p, pts)) return; }
      busy = true;
      if (count === 31) api.later(() => { resetCount(); busy = false; render(); nextTurn(1 - p); }, 1900);
      else api.later(() => { busy = false; nextTurn(1 - p); }, pts ? 1500 : 900);
    }
    function cpuPlay() {
      if (over) return;
      const ok = ph[1].filter(c => cval(c) + count <= 31);
      let c;
      if (Math.random() < smart) {
        let best = -99;
        ok.forEach(x => {
          const nc = count + cval(x); let v = pegScore(seq.concat({ c: x, p: 1 }), nc).pts;
          if (nc === 5 || nc === 21) v -= 1; v += Math.random() * .5;
          if (v > best) { best = v; c = x; }
        });
      } else c = pick(ok);
      talk(face); play(1, c);
    }
    function youPlay(c) {
      if (over || busy || phase !== 'peg' || turn !== 0) { sfx.soft(); return; }
      if (cval(c) + count > 31) { sfx.soft(); mistakes++; wob(handRow); api.hint(`That would take the count past 31. Try a smaller card.`); return; }
      play(0, c);
    }

    /* the show */
    function startShow() {
      if (over) return;
      phase = 'show';
      showList = [{ p: 1 - dealer, cards: hands[1 - dealer], crib: false }, { p: dealer, cards: hands[dealer], crib: false }, { p: dealer, cards: crib, crib: true }];
      showI = 0; showStep();
    }
    function showStep() {
      if (over) return;
      const it = showList[showI], res = scoreHand(it.cards, starter, it.crib);
      const label = it.crib ? (it.p === 0 ? 'Your crib' : P.n + "'s crib") : (it.p === 0 ? 'Your hand' : P.n + "'s hand");
      shown = { it, res, label, revealed: false };
      if (it.p === 0 && !autoCount) {
        shown.quiz = true;
        const t = res.total, opts = new Set([t]);
        [t + 2, t - 2, t + 1, t + 4, t - 1, t + 3].forEach(x => { if (opts.size < 3 && x >= 0) opts.add(x); });
        shown.opts = shuffle([...opts]);
        api.hint(`${label}, with the starter. How many points does it make? Look for fifteens, pairs and runs.`);
        render();
      } else reveal();
    }
    function answer(x) {
      if (!shown || shown.revealed) return;
      if (x === shown.res.total) { sfx.good(); shown.pre = `Yes, ${x}! ${cheer()} `; }
      else { sfx.soft(); mistakes++; shown.pre = `Nearly! It makes ${shown.res.total}. `; }
      reveal();
    }
    function reveal() {
      shown.revealed = true;
      const { it, res } = shown;
      api.hint((shown.pre || '') + `${shown.label}: ` + callOut(res) + (res.total ? ` That's ${res.total} point${res.total === 1 ? '' : 's'}.` : ''));
      render();
      if (res.total && it.p === 0) sfx.good();
      award(it.p, res.total);
    }
    function nextShow() {
      if (over) return;
      sfx.tap(); showI++;
      if (showI < showList.length) showStep();
      else { dealer = 1 - dealer; deal(); }
    }

    function render() {
      info.innerHTML = '';
      const backs = el('div', 'k3-backs'); const nb = phase === 'discard' ? 6 : phase === 'peg' || phase === 'pegdone' ? ph[1].length : phase === 'cut' ? 4 : 0;
      for (let k = 0; k < nb; k++) backs.append(cardEl(null, false, '', 'span'));
      info.append(el('span', 'k3-oname', P.n), el('span', 'k3-ocount', dealer === 1 ? 'deals · crib' : 'plays first'), backs);
      // middle
      mid.innerHTML = '';
      const pack = el('div', 'cx-stack');
      const pk = starter ? cardEl(starter, true, '') : cardEl(null, false, phase === 'cut' ? 'k3-tgt' : '');
      pk.onclick = () => { if (phase === 'cut') cut(); };
      pack.append(pk, el('div', 'cx-cap', starter ? 'Starter' : phase === 'cut' ? 'Tap to cut' : 'Pack'));
      const cribS = el('div', 'cx-stack');
      cribS.append(crib.length && !(phase === 'show' && shown && shown.it.crib) ? cardEl(null, false, '', 'span') : el('span', 'k3-card', ''), el('div', 'cx-cap', dealer === 0 ? 'Your crib' : P.n + "'s crib"));
      if (!crib.length || (phase === 'show' && shown && shown.it.crib)) cribS.firstChild.style.cssText = 'background:rgba(0,0,0,.16);box-shadow:inset 0 0 0 3px rgba(255,255,255,.3)';
      const pl = el('div', 'cx-play');
      if (phase === 'show' && shown) {
        const chips = el('div', 'cx-chips');
        if (shown.revealed) {
          shown.res.items.forEach((itm, k) => { const c = el('span', 'cx-chip', `${itm.cs.map(cshort).join(' ')} · ${cap(itm.label)} <b>${itm.tot}</b>`); c.style.animationDelay = (k * .25) + 's'; chips.append(c); });
          chips.append(el('div', 'cx-total', shown.res.total ? `= ${shown.res.total} point${shown.res.total === 1 ? '' : 's'}` : 'No points'));
        } else chips.append(el('div', 'cx-total', 'How many points?'));
        pl.append(chips);
      } else {
        const s = el('div', 'cx-seq');
        seq.forEach(x => s.append(cardEl(x.c, true, (x.p ? 'cx-cpu' : '') + (x.c === freshSeq ? ' k3-in' : ''), 'span')));
        pl.append(s, el('div', 'cx-count', phase === 'peg' || phase === 'pegdone' ? 'Count: ' + count : phase === 'discard' ? 'Choose 2 for the crib' : '&nbsp;'));
      }
      freshSeq = null;
      mid.append(pack, pl, cribS);
      // hand row
      handRow.innerHTML = ''; whoRow.textContent = '';
      if (phase === 'show' && shown) {
        whoRow.textContent = shown.label + ' + starter';
        shown.it.cards.slice().sort((a, b) => a.r - b.r).forEach(c => handRow.append(cardEl(c, true, '', 'span')));
        const s = cardEl(starter, true, 'cx-gap', 'span'); handRow.append(s);
      } else {
        const cards = phase === 'discard' || phase === 'cut' ? hands[0] : ph[0];
        whoRow.textContent = phase === 'discard' ? 'Your cards' : 'Your hand';
        cards.forEach(c => {
          let cls = '';
          if (phase === 'discard' && sel.includes(c)) cls = 'k3-sel';
          if (phase === 'peg' && turn === 0 && !busy) cls = cval(c) + count <= 31 ? 'k3-ok' : 'k3-no';
          const b = cardEl(c, true, cls);
          b.onclick = () => {
            if (phase === 'discard') { if (sel.includes(c)) sel = sel.filter(x => x !== c); else { sel.push(c); if (sel.length > 2) sel.shift(); } sfx.tap(); render(); }
            else if (phase === 'peg') youPlay(c);
            else if (phase === 'cut') { sfx.soft(); api.hint('Tap the pack to turn up the starter card.'); }
          };
          handRow.append(b);
        });
      }
      // buttons
      bar.innerHTML = ''; bar.className = 'k3-bar';
      if (over) return;
      if (phase === 'discard') {
        const pb = btn('📥 Put in crib', 'c-leaf', putInCrib); pb.disabled = sel.length !== 2;
        bar.append(pb, btn('💡 Hint', 'c-sky', () => {
          const ch = discardChoices(hands[0], dealer === 0)[0]; sel = [hands[0][ch.i], hands[0][ch.j]]; sfx.tap();
          api.hint(`Try putting the ${cname(sel[0])} and the ${cname(sel[1])} in the crib. You keep the best points.`); render();
        }));
      } else if (phase === 'cut') bar.append(btn('✂️ Cut the pack', 'c-sun', cut));
      else if (phase === 'show' && shown) {
        if (!shown.revealed && shown.quiz) { bar.className = 'k3-bar cx-quiz'; shown.opts.forEach(x => bar.append(btn(String(x), 'c-card', () => answer(x)))); bar.append(btn('Show me', 'c-sky', () => { shown.pre = ''; sfx.tap(); reveal(); })); }
        else if (shown.revealed) bar.append(btn(showI < 2 ? 'Next ▶' : 'Next deal ▶', 'c-leaf', nextShow));
      }
    }
    deal();
    if (TEST) window.__k3Crib = {
      bot() {
        if (over) return 'over';
        if (busy) return 'wait';
        if (phase === 'discard') { const ch = discardChoices(hands[0], dealer === 0)[0]; sel = [hands[0][ch.i], hands[0][ch.j]]; putInCrib(); return 'move'; }
        if (phase === 'cut') { cut(); return 'move'; }
        if (phase === 'peg' && turn === 0) { const ok = ph[0].filter(c => cval(c) + count <= 31); if (!ok.length) return 'wait'; youPlay(pick(ok)); return 'move'; }
        if (phase === 'show' && shown) { if (!shown.revealed) { answer(shown.res.total); return 'move'; } nextShow(); return 'move'; }
        return 'wait';
      },
      state: () => ({ score: score.slice(), phase, target, revealed: !!(shown && shown.revealed) }), scoreHand, pegScore
    };
  }

  /* =========================================================
     BEGGAR MY NEIGHBOUR
     ========================================================= */
  function startBeggar(L, api) {
    const P = pick(PALS), Pp = P.p === 'she' ? 'her' : 'his';
    const capT = 110 + Math.min(50, (L - 1) * 6);
    const W = api.stage.clientWidth || 340, cw = W < 400 ? 60 : W < 520 ? 66 : 78;
    const pay = c => c.r === 11 ? 1 : c.r === 12 ? 2 : c.r === 13 ? 3 : c.r === 1 ? 4 : 0;
    const deck = shuffle(newDeck());
    let piles = [deck.slice(0, 26), deck.slice(26)];
    if (L <= 2) { const cv = p => piles[p].reduce((s, c) => s + pay(c), 0); if (cv(1) > cv(0)) piles = [piles[1], piles[0]]; }
    let center = [], turn = 0, debt = 0, debtFull = 0, claim = -1, flips = 0, over = false, busy = false, autoOn = false, fresh = null, sweep = -1;
    const root = el('div', 'bn-wrap'); root.style.setProperty('--cw', cw + 'px');
    const { o, face, info } = oppBar(P);
    const topRow = el('div', 'bn-row'), mid = el('div', 'bn-mid'), debtRow = el('div', 'bn-debt'), botRow = el('div', 'bn-row'), note = el('div', 'bn-note'), bar = el('div', 'k3-bar');
    bar.style.marginTop = '4px';
    bar.style.alignItems = 'center'; root.append(o, topRow, mid, debtRow, botRow, bar); api.stage.append(root);
    const cpuPile = el('div', 'bn-pile'), youPile = el('button', 'bn-pile'); youPile.type = 'button'; youPile.setAttribute('aria-label', 'Turn your top card');
    const cpuLab = el('div', 'bn-lab'), youLab = el('div', 'bn-lab');
    topRow.append(cpuPile, cpuLab); botRow.append(youPile, youLab);
    youPile.onclick = () => { if (turn === 0 && !busy && !over) flip(0); else if (!over) { sfx.soft(); api.hint(busy ? 'Just a moment…' : `Wait for ${P.n} to turn ${Pp} card.`); } };
    const autoB = btn('▶ Turn for me', 'c-sky', () => { autoOn = !autoOn; sfx.tap(); render(); if (autoOn && turn === 0 && !busy) api.later(() => flip(0), 400); });
    bar.append(autoB, note);
    const nm = p => p === 0 ? 'You' : P.n;
    function flip(p) {
      if (over || busy || turn !== p) return;
      if (!piles[p].length) { end(); return; }
      const c = piles[p].pop(); center.push({ c, p, rot: randInt(26) - 13, dx: randInt(24) - 12 }); flips++; fresh = c;
      const v = pay(c);
      if (v) {
        debt = debtFull = v; claim = p; turn = 1 - p;
        tone(520, .1, 'triangle', .12); tone(780, .16, 'triangle', .12, .1);
        if (p === 1) talk(face);
        api.hint(`${p === 0 ? 'You turn' : P.n + ' turns'} ${AN(c.r)}! ${p === 0 ? P.n + ' must' : 'You must'} pay ${NUMW[v]} card${v > 1 ? 's' : ''}.`);
      } else if (debt > 0) {
        debt--; tone(300, .08, 'sine', .1);
        if (debt === 0) {
          busy = true; render();
          api.hint(`No court card! ${claim === 0 ? 'You win' : P.n + ' wins'} the pile of ${center.length} cards.`);
          if (claim === 0) sfx.good(); else tone(330, .2, 'sine', .08);
          api.later(() => { sweep = claim; render(); api.later(() => collect(claim), 520); }, 900);
          return;
        }
        api.hint(`${p === 0 ? 'You pay' : P.n + ' pays'}… ${debt} more to go.`);
      } else { turn = 1 - p; tone(p ? 392 : 440, .07, 'triangle', .08); if (p === 0 && !autoOn) api.hint(`You turn the ${cname(c)}. ${P.n}'s turn.`); }
      render(); next();
    }
    function collect(p) {
      piles[p] = center.map(x => x.c).reverse().concat(piles[p]);
      center = []; debt = 0; claim = -1; turn = p; busy = false; sweep = -1; fresh = null;
      render(); next();
    }
    function next() {
      if (over || busy) return;
      if (!piles[turn].length) { end(); return; }
      if (flips >= capT && debt === 0) { end(true); return; }
      if (turn === 1) api.later(() => flip(1), debt > 0 ? 650 : 750);
      else if (autoOn) api.later(() => flip(0), 550);
      else if (debt > 0) api.hint(`You owe ${debt} card${debt > 1 ? 's' : ''}. Tap your pile to pay.`);
      else if (!center.length) api.hint('Your turn. Tap your pile to turn a card.');
    }
    function end(capped) {
      if (over) return; over = true; autoOn = false;
      if (!capped) { const w = piles[0].length ? 0 : 1; piles[w] = piles[w].concat(center.map(x => x.c)); center = []; }
      render();
      const a = piles[0].length, b = piles[1].length;
      let stars, msg;
      if (!capped) {
        if (a > b) { stars = 3; msg = `${P.n} has run out of cards. You win the lot! ${cheer()}`; sfx.win(); }
        else { stars = 1; msg = `You've run out of cards, so ${P.n} wins. What a game! Have another go.`; sfx.soft(); }
      } else {
        msg = `That's time for this game! You have ${a} cards and ${P.n} has ${b}. `;
        if (a > b) { stars = a - b >= 10 ? 3 : 2; msg += `You win! ${cheer()}`; sfx.good(); }
        else if (a === b) { stars = 2; msg += 'A dead heat!'; }
        else { stars = 1; msg += `${P.n} wins this time. Well played!`; sfx.soft(); }
      }
      api.hint(msg); api.later(() => api.done(stars), 2200);
    }
    function pileView(box, n, glow) {
      box.innerHTML = '';
      box.classList.toggle('bn-empty', !n);
      const k = Math.min(4, Math.ceil(n / 7));
      for (let i = 0; i < Math.max(1, k); i++) { const c = cardEl(null, false, i === k - 1 && glow ? 'k3-tgt' : '', 'span'); c.style.left = i * 2 + 'px'; c.style.top = -i * 2 + 'px'; box.append(c); }
      const cnt = el('em', 'k3-n', String(n)); box.append(cnt);
    }
    function render() {
      info.innerHTML = '';
      info.append(el('span', 'k3-oname', P.n), el('span', 'k3-ocount', turn === 1 && !over ? (debt ? 'is paying…' : 'is turning…') : 'is waiting'));
      pileView(cpuPile, piles[1].length, false);
      pileView(youPile, piles[0].length, turn === 0 && !busy && !over);
      cpuLab.innerHTML = `${P.n}'s pile<b>${piles[1].length} cards</b>`;
      youLab.innerHTML = `Your pile<b>${piles[0].length} cards</b>`;
      mid.innerHTML = ''; mid.className = 'bn-mid' + (sweep === 0 ? ' bn-sD' : sweep === 1 ? ' bn-sU' : '');
      center.slice(-6).forEach(x => {
        const c = cardEl(x.c, true, x.c === fresh ? (x.p ? 'bn-fT' : 'bn-fB') + (pay(x.c) ? ' bn-court' : '') : '', 'span');
        c.style.rotate = x.rot + 'deg'; c.style.translate = x.dx + 'px 0'; mid.append(c);
      });
      if (center.length) mid.append(el('span', 'bn-num', center.length + ' in the middle'));
      fresh = null;
      debtRow.innerHTML = '';
      if (debtFull && debt >= 0 && claim >= 0) {
        debtRow.append(el('span', '', `${claim === 0 ? P.n + ' pays' : 'You pay'}:`));
        for (let i = 0; i < debtFull; i++) debtRow.append(el('span', 'bn-coin' + (i < debtFull - debt ? ' bn-paid' : ''), '♦'));
      }
      note.textContent = over ? '' : `Turns left: ${Math.max(0, capT - flips)}`;
      autoB.textContent = autoOn ? '⏸ Stop turning' : '▶ Turn for me';
      autoB.className = 'btn ' + (autoOn ? 'c-sun' : 'c-sky');
      autoB.hidden = over;
    }
    api.hint(`Take turns turning cards. Jack, Queen, King or Ace? Your friend must pay 1, 2, 3 or 4 cards. Tap your pile to start.`);
    render();
    if (TEST) window.__k3Beg = { bot() { if (over) return 'over'; if (busy || turn !== 0) return 'wait'; flip(0); return 'move'; }, state: () => ({ a: piles[0].length, b: piles[1].length, c: center.length, flips }) };
  }

  /* =========================================================
     WORD BOARD
     ========================================================= */
  const WQ_VAL = { A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10 };
  const WQ_BAG = { A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 8, J: 1, K: 1, L: 4, M: 2, N: 6, O: 8, P: 2, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1 };
  const WQ_TWO = 'AM AN AS AT AX BE BY DO GO HA HE HI HO IF IN IS IT LO MA ME MY NO OF OH ON OR OW OX PA SO TO UP US WE'.split(' ');
  const WQ_NOPL = new Set('THE THEM THEY THEN THAN THAT THIS THESE THOSE THERE THEIR WHAT WHEN WHERE WHICH WHILE WHO WHOM WHOSE WHY HOW FROM INTO ONTO UPON WITH ONCE ONLY ALSO VERY MUCH MANY MORE MOST SOME SUCH EACH BOTH EVEN EVER NEVER JUST QUITE RATHER ABOUT ABOVE AFTER AGAIN AHEAD ALONG ALOUD AMONG AWAY BEEN BEING BELOW CANNOT COULD WOULD SHALL SHOULD SINCE UNTIL UNLESS WITHIN YOUR OUR HER HIS ITS YOU SHE ANY ALL AND BUT FOR NOR NOT OFF OUT OWN TOO WAS WERE HAS HAD HIM ARE DID GOT WHY YES YET NOW HERE OVER UNDER FEW NEW OLD BIG SAD BAD ODD SHY SLY DRY ILL'.split(' '));
  const VOW = new Set('AEIOU');
  let WQ = null;
  function wqDict() {
    if (WQ) return WQ;
    const set = new Set(WQ_TWO), list = [];
    WQ_SRC.forEach(s => s.trim().split(/\s+/).forEach(w => { w = w.toUpperCase(); if (/^[A-Z]+$/.test(w) && !WQ_BAD.has(w) && !set.has(w)) { set.add(w); list.push(w); } }));
    WQ_TWO.forEach(w => list.push(w));
    const accept = w => {
      if (set.has(w)) return true;
      if (w.length >= 4 && w.endsWith('S')) { const b = w.slice(0, -1); return set.has(b) && b.length >= 3 && !WQ_NOPL.has(b) && !/(S|X|Z|SH|CH)$/.test(b); }
      return false;
    };
    WQ = { set, list, accept };
    return WQ;
  }
  function wqPrem(n) {
    const m = (n - 1) / 2, g = [];
    const T = {
      5: { TW: ['5,5', '0,5'], TL: ['1,3'], DL: ['1,1', '0,2', '2,5'] },
      7: { TW: ['7,7', '0,7'], TL: ['1,5', '3,6'], DL: ['1,1', '0,3', '4,7', '2,5'] }
    }[m];
    for (let r = 0; r < n; r++) {
      g.push([]);
      for (let c = 0; c < n; c++) {
        const dr = Math.abs(r - m), dc = Math.abs(c - m), a = Math.min(dr, dc), b = Math.max(dr, dc), k = a + ',' + b;
        let p = '';
        if (!dr && !dc) p = 'ST';
        else if (T.TW.includes(k)) p = 'TW';
        else if (dr === dc && dr >= 2 && dr <= m - 1) p = 'DW';
        else if (T.TL.includes(k)) p = 'TL';
        else if (T.DL.includes(k)) p = 'DL';
        g[r].push(p);
      }
    }
    return g;
  }
  const PREM_LABEL = { DL: '2L', TL: '3L', DW: '2W', TW: '3W', ST: '★' };

  function startWordBoard(L, api) {
    const D = wqDict();
    const n = L <= 5 ? 11 : 15, m = (n - 1) / 2;
    const P = pick(PALS);
    const kind = L <= 2 ? [.12, .4] : L <= 5 ? [.3, .6] : [.45, .78];
    const bagSize = n === 11 ? 52 : 76, maxTurns = n === 11 ? 9 : 12;
    const W = api.stage.clientWidth || 340;
    const k = W < 400 ? 6 : 7, wide = W >= 680;
    const cs = Math.min(56, Math.floor((Math.min(W, 420) - 10 - (k - 1) * 3) / k));
    const rs = wide ? 50 : Math.min(54, Math.floor((Math.min(W, 420) - 16 - 6 * 5) / 7));
    const mc = n === 11 ? 7 : 5;
    const grid = [...Array(n)].map(() => Array(n).fill(null)), prem = wqPrem(n);
    // the tile bag, scaled from a full set; rare letters only on the big board
    let bag = [];
    Object.keys(WQ_BAG).forEach(ch => { let c = WQ_BAG[ch] * bagSize / 96; c = n === 11 && 'JXZV'.includes(ch) ? (ch === 'V' ? 1 : 0) : Math.max(1, Math.round(c)); for (let i = 0; i < c; i++) bag.push(ch); });
    shuffle(bag);
    let tid = 0;
    const racks = [[], []], scores = [0, 0], turns = [0, 0];
    let lastMsg = '', pend = [], selT = null, turn = 0, over = false, busy = false, passes = 0, last = new Set(), dropped = new Set(), hintsUsed = 0, badTries = 0;
    let wr = Math.max(0, m - Math.floor(k / 2)), wc = wr;
    const root = el('div', 'wq-wrap' + (wide ? ' wq-wide' : '')); root.style.cssText = `--cs:${cs}px;--rs:${rs}px;--mc:${mc}px`;
    const topRow = el('div', 'wq-top'), scY = el('div', 'wq-sc'), scC = el('div', 'wq-sc'), map = el('button', 'wq-map'), boardEl = el('div', 'wq-board'), rackEl = el('div', 'wq-rack'), btns = el('div', 'wq-btns');
    map.type = 'button'; map.setAttribute('aria-label', 'Board map: tap to look at another part of the board');
    map.style.gridTemplateColumns = `repeat(${n}, var(--mc))`;
    topRow.append(scY, map, scC);
    boardEl.style.gridTemplateColumns = `repeat(${k}, var(--cs))`;
    const side = el('div', 'wq-side'); side.append(rackEl, btns);
    root.append(topRow, boardEl, side); api.stage.append(root);
    const mapCells = []; for (let i = 0; i < n * n; i++) { const c = el('i'); mapCells.push(c); map.append(c); }
    const view = el('span', 'wq-view'); map.append(view);
    map.onclick = e => {
      const r = map.getBoundingClientRect(), y = (e.clientY - r.top) / r.height, x = (e.clientX - r.left) / r.width;
      centerOn(Math.floor(y * n), Math.floor(x * n)); sfx.tap(); render();
    };
    const cells = [];
    for (let i = 0; i < k * k; i++) { const b = el('button', 'wq-cell'); b.type = 'button'; const ri = Math.floor(i / k), ci = i % k; b.onclick = () => tapCell(wr + ri, wc + ci); cells.push(b); boardEl.append(b); }
    const playB = btn('✓ Play word', 'c-leaf wq-play', playWord), backB = btn('↩ Back', 'c-card', takeBack), mixB = btn('🔀 Mix', 'c-card', () => { shuffle(racks[0]); sfx.tap(); render(); });
    const hintB = btn('💡 Hint', 'c-sky', giveHint), swapB = btn('🔄 Swap', 'c-peach', swapTiles);
    btns.append(playB, backB, mixB, hintB, swapB);

    function centerOn(r, c) { wr = Math.max(0, Math.min(n - k, r - Math.floor(k / 2))); wc = Math.max(0, Math.min(n - k, c - Math.floor(k / 2))); }
    function draw(p) {
      const rk = racks[p];
      while (rk.length < 7 && bag.length) rk.push({ ch: bag.pop(), id: ++tid });
      // keep a kind mix of vowels and consonants
      const v = rk.filter(t => VOW.has(t.ch)).length;
      const fix = (want) => { const bi = bag.findIndex(ch => VOW.has(ch) === want); const ri = rk.findIndex(t => VOW.has(t.ch) !== want); if (bi >= 0 && ri >= 0) { const old = rk[ri].ch; rk[ri] = { ch: bag[bi], id: ++tid }; bag[bi] = old; shuffle(bag); } };
      if (rk.length >= 5 && v < 2) { fix(true); if (v < 1) fix(true); }
      else if (rk.length >= 5 && rk.length - v < 2) fix(false);
    }
    draw(0); draw(1);
    const boardEmpty = () => grid.every(row => row.every(x => !x));
    function evaluate(placed) {
      if (!placed.length) return { ok: false, msg: 'Tap a letter on your rack, then a square on the board.' };
      const pm = new Map(placed.map(t => [t.r * n + t.c, t.ch]));
      const get = (r, c) => (r < 0 || c < 0 || r >= n || c >= n) ? null : (pm.get(r * n + c) || (grid[r][c] && grid[r][c].ch) || null);
      const rows = new Set(placed.map(t => t.r)), cols = new Set(placed.map(t => t.c));
      if (rows.size > 1 && cols.size > 1) return { ok: false, msg: 'Your letters need to be in one straight line, across or down.' };
      let dir;
      if (placed.length > 1) dir = rows.size === 1 ? [0, 1] : [1, 0];
      else { const t = placed[0]; dir = get(t.r, t.c - 1) || get(t.r, t.c + 1) ? [0, 1] : [1, 0]; }
      let r = placed[0].r, c = placed[0].c;
      while (get(r - dir[0], c - dir[1])) { r -= dir[0]; c -= dir[1]; }
      const main = []; while (get(r, c)) { main.push([r, c]); r += dir[0]; c += dir[1]; }
      if (!placed.every(t => main.some(([a, b]) => a === t.r && b === t.c))) return { ok: false, msg: 'Your letters need to join up, with no gaps.' };
      const words = [];
      if (main.length >= 2) words.push(main);
      const pd = [dir[1], dir[0]];
      for (const t of placed) {
        let a = t.r, b = t.c; while (get(a - pd[0], b - pd[1])) { a -= pd[0]; b -= pd[1]; }
        const w = []; while (get(a, b)) { w.push([a, b]); a += pd[0]; b += pd[1]; }
        if (w.length >= 2) words.push(w);
      }
      if (!words.length) return { ok: false, msg: 'A word needs at least two letters.' };
      if (boardEmpty()) { if (!pm.has(m * n + m)) return { ok: false, msg: 'The first word must cover the ★ star in the middle.' }; }
      else if (!words.some(w => w.some(([a, b]) => !pm.has(a * n + b)))) return { ok: false, msg: 'Your word needs to join on to the letters already on the board.' };
      let total = 0; const list = [];
      for (const w of words) {
        const s = w.map(([a, b]) => get(a, b)).join('');
        if (!D.accept(s)) return { ok: false, bad: s, msg: `${s} isn't in my word list. Try moving a letter, or tap Hint.` };
        let sum = 0, mult = 1;
        for (const [a, b] of w) {
          let v = WQ_VAL[get(a, b)];
          if (pm.has(a * n + b)) { const p = prem[a][b]; if (p === 'DL') v *= 2; if (p === 'TL') v *= 3; if (p === 'DW' || p === 'ST') mult *= 2; if (p === 'TW') mult *= 3; }
          sum += v;
        }
        total += sum * mult; list.push(s);
      }
      if (placed.length === 7) total += 30;
      return { ok: true, words: list, score: total };
    }
    function findMoves(rack) {
      const cnt = {}; rack.forEach(t => cnt[t.ch] = (cnt[t.ch] || 0) + 1);
      const empty = boardEmpty(), onBoard = new Set(); grid.forEach(row => row.forEach(x => x && onBoard.add(x.ch)));
      const moves = [];
      for (const w of D.list) {
        if (w.length > n) continue;
        const need = {}; for (const ch of w) need[ch] = (need[ch] || 0) + 1;
        let miss = 0, ok = true;
        for (const ch in need) { const ex = need[ch] - (cnt[ch] || 0); if (ex > 0) { if (empty || !onBoard.has(ch)) { ok = false; break; } miss += ex; } }
        if (!ok || miss >= w.length) continue;
        const len = w.length;
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          for (let r = 0; r + dr * (len - 1) < n; r++) for (let c = 0; c + dc * (len - 1) < n; c++) {
            if (empty && !(dr ? c === m && r <= m && r + len > m : r === m && c <= m && c + len > m)) continue;
            const br = r - dr, bc = c - dc, ar = r + dr * len, ac = c + dc * len;
            if (br >= 0 && bc >= 0 && grid[br][bc]) continue;
            if (ar < n && ac < n && grid[ar][ac]) continue;
            const used = {}, placed = []; let good = true, old = false, near = false;
            for (let i = 0; i < len; i++) {
              const rr = r + dr * i, cc = c + dc * i, g = grid[rr][cc], ch = w[i];
              if (g) { if (g.ch !== ch) { good = false; break; } old = true; }
              else {
                used[ch] = (used[ch] || 0) + 1; if (used[ch] > (cnt[ch] || 0)) { good = false; break; }
                placed.push({ r: rr, c: cc, ch });
                if (!near) near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([x, y]) => { const a = rr + x, b = cc + y; return a >= 0 && b >= 0 && a < n && b < n && grid[a][b]; });
              }
            }
            if (!good || !placed.length || (!empty && !old && !near)) continue;
            const ev = evaluate(placed);
            if (ev.ok) moves.push({ placed, score: ev.score, words: ev.words });
          }
        }
      }
      return moves;
    }
    function commit(p, placed, ev) {
      last = new Set(); dropped = new Set();
      placed.forEach(t => { grid[t.r][t.c] = { ch: t.ch, by: p }; last.add(t.r * n + t.c); dropped.add(t.r * n + t.c); });
      const ids = new Set(placed.map(t => t.id)), rk = racks[p];
      if (p === 0) racks[0] = rk.filter(t => !ids.has(t.id));
      else placed.forEach(t => { const i = racks[1].findIndex(x => x.ch === t.ch); racks[1].splice(i, 1); });
      scores[p] += ev.score; turns[p]++; passes = 0;
      draw(p);
    }
    function render() {
      scY.className = 'wq-sc' + (turn === 0 && !over ? ' wq-on' : '');
      scC.className = 'wq-sc' + (turn === 1 && !over ? ' wq-on' : '');
      scY.innerHTML = `🙂 You<b>${scores[0]}</b><small>turn ${Math.min(maxTurns, turns[0] + (turn === 0 && !over ? 1 : 0))} of ${maxTurns}</small>`;
      scC.innerHTML = `${P.f} ${P.n}<b>${scores[1]}</b><small>${bag.length} tiles left</small>`;
      const pm = new Map(pend.map(t => [t.r * n + t.c, t]));
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        const x = mapCells[r * n + c], g = grid[r][c], p = prem[r][c];
        x.className = pm.has(r * n + c) ? 'n' : g ? 't' : p === 'DW' || p === 'TW' || p === 'ST' ? 'p3' : p ? 'p2' : '';
      }
      const step = mc + 1;
      view.style.cssText = `left:${4 + wc * step - 2}px;top:${4 + wr * step - 2}px;width:${k * step + 3}px;height:${k * step + 3}px`;
      for (let i = 0; i < k * k; i++) {
        const r = wr + Math.floor(i / k), c = wc + i % k, b = cells[i], g = grid[r][c], pt = pm.get(r * n + c), p = prem[r][c];
        if (g || pt) {
          const ch = g ? g.ch : pt.ch;
          b.className = 'wq-cell wq-tile' + (pt ? ' wq-pend' : '') + (g && last.has(r * n + c) ? ' wq-last' : '') + (g && dropped.has(r * n + c) ? ' wq-drop' : '');
          b.innerHTML = `${ch}<i>${WQ_VAL[ch]}</i>`; b.setAttribute('aria-label', ch + (pt ? ', tap to take back' : ''));
        } else {
          b.className = 'wq-cell' + (p ? ' wq-' + p : '') + (selT && turn === 0 ? ' wq-aim' : '');
          b.textContent = PREM_LABEL[p] || ''; b.setAttribute('aria-label', p ? { DL: 'double letter', TL: 'triple letter', DW: 'double word', TW: 'triple word', ST: 'star, double word' }[p] : 'empty square');
        }
      }
      dropped = new Set();
      rackEl.innerHTML = '';
      const used = new Set(pend.map(t => t.id));
      racks[0].forEach(t => {
        if (used.has(t.id)) return;
        const b = el('button', 'wq-rt' + (selT === t ? ' wq-sel' : ''), `${t.ch}<i>${WQ_VAL[t.ch]}</i>`); b.type = 'button';
        b.onclick = () => { if (over) return; if (turn !== 0 || busy) { sfx.soft(); api.hint(`Wait a moment, it's ${P.n}'s turn.`); return; } selT = selT === t ? null : t; sfx.tap(); if (selT) api.hint(`Now tap a square for the ${t.ch}. Tap the little map to see other parts of the board.`); render(); };
        rackEl.append(b);
      });
      const mine = turn === 0 && !busy && !over;
      playB.disabled = !mine || !pend.length; backB.disabled = !mine || !pend.length;
      mixB.disabled = hintB.disabled = !mine; swapB.disabled = !mine;
      swapB.textContent = bag.length ? '🔄 Swap' : '⏭ Pass';
      api.rounds(maxTurns, turns[0]);
    }
    function tapCell(r, c) {
      if (over) return;
      if (turn !== 0 || busy) { sfx.soft(); api.hint(`Wait a moment, it's ${P.n}'s turn.`); return; }
      const pi = pend.findIndex(t => t.r === r && t.c === c);
      if (pi >= 0) { pend.splice(pi, 1); sfx.tap(); api.hint('Letter back on your rack.'); render(); return; }
      if (grid[r][c]) { sfx.soft(); api.hint('That square already has a letter. Tap an empty square.'); return; }
      if (!selT) { sfx.soft(); api.hint('First tap a letter on your rack, then tap a square.'); wob(rackEl); return; }
      pend.push({ r, c, ch: selT.ch, id: selT.id }); tone(500 + pend.length * 60, .1, 'triangle', .1);
      const left = racks[0].filter(t => !pend.some(p => p.id === t.id));
      selT = null;
      api.hint(pend.length === 1 ? 'Add more letters to make a word, then tap Play word.' : `Letters: ${wordGuess()}. Tap Play word when you're ready.` + (left.length ? '' : ''));
      render();
    }
    function wordGuess() { return pend.slice().sort((a, b) => a.r - b.r || a.c - b.c).map(t => t.ch).join(''); }
    function takeBack() { pend = []; selT = null; sfx.tap(); api.hint('Letters back on your rack.'); render(); }
    function playWord() {
      if (turn !== 0 || busy || over || !pend.length) return;
      const ev = evaluate(pend);
      if (!ev.ok) { sfx.soft(); badTries++; api.hint(ev.msg); boardEl.classList.add('wobble'); api.later(() => boardEl.classList.remove('wobble'), 500); return; }
      commit(0, pend, ev); pend = []; selT = null;
      sfx.good(); if (ev.score >= 20) toast(cheer() + ' ' + ev.score + ' points');
      api.hint(`${ev.words.join(', ')}: ${ev.score} points! ${cheer()}`);
      afterTurn(0);
    }
    function swapTiles() {
      if (turn !== 0 || busy || over) return;
      pend = []; selT = null; sfx.tap();
      if (bag.length) { const old = racks[0].map(t => t.ch); racks[0] = []; draw(0); bag.push(...old); shuffle(bag); api.hint('You swapped your letters for new ones.'); }
      else api.hint('You pass this turn.');
      turns[0]++; passes++; afterTurn(0);
    }
    function giveHint() {
      if (turn !== 0 || busy || over) return;
      const mv = findMoves(racks[0]);
      if (!mv.length) { sfx.soft(); api.hint(`I can't see a word either. Tap ${bag.length ? 'Swap for new letters' : 'Pass'}.`); wob(swapB); return; }
      mv.sort((a, b) => b.score - a.score);
      const ch = mv[randInt(Math.min(3, mv.length))];
      pend = []; const used = new Set();
      ch.placed.forEach(t => { const tile = racks[0].find(x => x.ch === t.ch && !used.has(x.id)); used.add(tile.id); pend.push({ r: t.r, c: t.c, ch: t.ch, id: tile.id }); });
      const rs2 = ch.placed.map(t => t.r), cs2 = ch.placed.map(t => t.c);
      centerOn(Math.round((Math.min(...rs2) + Math.max(...rs2)) / 2), Math.round((Math.min(...cs2) + Math.max(...cs2)) / 2));
      hintsUsed++; sfx.tap(); api.hint(`How about ${ch.words[0]}? I've put the letters out. Tap Play word.`);
      render();
    }
    function afterTurn(p) {
      busy = true; render();
      if (endCheck(p)) return;
      turn = 1 - p;
      api.later(() => {
        busy = false;
        if (turn === 1) cpuTurn();
        else { api.hint(lastMsg || 'Your turn.'); render(); }
      }, p === 0 ? 1300 : 600);
    }
    function endCheck(p) {
      const outOfTiles = !bag.length && !racks[p].length;
      if (!(outOfTiles || passes >= 4 || (turns[0] >= maxTurns && turns[1] >= maxTurns))) return false;
      over = true; busy = true; render();
      const a = scores[0], b = scores[1];
      api.later(() => {
        if (a > b) { sfx.win(); api.hint(`That's the game! You win, ${a} to ${b}. ${cheer()}`); api.later(() => api.done(a - b >= 15 ? 3 : 2), 2000); }
        else if (a === b) { api.hint(`That's the game! A tie at ${a} each. Lovely!`); api.later(() => api.done(2), 2000); }
        else { sfx.soft(); api.hint(`That's the game! ${P.n} wins, ${b} to ${a}. Some lovely words, well played!`); api.later(() => api.done(1), 2200); }
      }, 1200);
      return true;
    }
    function cpuTurn() {
      if (over) return;
      busy = true; api.hint(`${P.n} is thinking…`); render();
      api.later(() => {
        const mv = findMoves(racks[1]).sort((a, b) => a.score - b.score);
        if (!mv.length) {
          if (bag.length) { const old = racks[1].map(t => t.ch); racks[1] = []; draw(1); bag.push(...old); shuffle(bag); lastMsg = `${P.n} swapped ${P.p === 'she' ? 'her' : 'his'} letters. Your turn.`; }
          else lastMsg = `${P.n} passes. Your turn.`;
          turns[1]++; passes++; api.hint(lastMsg); afterTurn(1); return;
        }
        const q = kind[0] + Math.random() * (kind[1] - kind[0]);
        const ch = mv[Math.floor(q * (mv.length - 1))];
        const rs2 = ch.placed.map(t => t.r), cs2 = ch.placed.map(t => t.c);
        centerOn(Math.round((Math.min(...rs2) + Math.max(...rs2)) / 2), Math.round((Math.min(...cs2) + Math.max(...cs2)) / 2));
        commit(1, ch.placed, { score: ch.score });
        tone(440, .12, 'triangle', .1); tone(587, .14, 'triangle', .1, .12);
        lastMsg = `${P.n} played ${ch.words.join(', ')} for ${ch.score} points. Your turn!`;
        api.hint(lastMsg);
        afterTurn(1);
      }, 1400);
    }
    api.hint(`Make words on the board. Your first word must cover the ★. Tap a letter, then a square.`);
    render();
    if (TEST) window.__k3Word = {
      bot() {
        if (over) return 'over';
        if (turn !== 0 || busy) return 'wait';
        const mv = findMoves(racks[0]).sort((a, b) => b.score - a.score);
        if (!mv.length) { swapTiles(); return 'move'; }
        giveHint(); if (!pend.length) { swapTiles(); return 'move'; }
        playWord(); return 'move';
      },
      state: () => ({ scores: scores.slice(), bag: bag.length, turns: turns.slice() }), findMoves: () => findMoves(racks[0]).length, D
    };
  }

  /* word list, copied from games/words2.js */
  const WQ_SRC = [
    // 3 letters
    `ace act add age ago aid aim air ale all and ant any ape apt arc are ark arm art ash ask ate awe axe bad bag ban bar bat bay bed bee beg bet bib bid big bin bit boa bob bog bow box boy bud bug bun bus but buy bye cab can cap car cat cob cod cog cot cow coy cry cub cue cup cut dab dad dam day den dew did dig dim din dip doe dog don dot dry dub due dug dye ear eat ebb eel egg elf elk elm emu end era eve ewe eye fan far fat fed fee few fig fin fir fit fix flu fly foe fog for fox fry fun fur gap gas gel gem get gin got gum gut guy gym had ham has hat hay hem hen her hew hid him hip his hit hog hop hot how hub hue hug hum hut ice icy ill imp ink inn ion ire irk its ivy jab jam jar jaw jay jet jig job jog jot joy jug keg key kid kin kit lab lad lag lap law lay led leg let lid lie lip lit log lot low mad man map mat may men met mid mix mob mop mud mug mum nab nag nap net new nib nil nip nod nor not now nun nut oak oar oat odd off oil old one opt orb ore our out owe owl own pad pal pan pat paw pay pea peg pen pet pew pie pig pin pit ply pod pop pot pry pub pun pup put rag ram ran rap rat raw ray red rib rid rig rim rip rob rod roe rot row rub rug rum run rut rye sad sag sap sat saw say sea see set sew she shy sip sir sit six ski sky sly sob son sow soy spa spy sty sub sum sun sup tab tag tan tap tar tax tea tee ten the tie tin tip toe ton too top tot tow toy try tub tug two urn use van vat vet via vow wad wag was wax way web wed wee wet who why wig win wit woe wok won woo wow yak yam yap yes yet yew you zap zip zoo`,
    // 4 letters
    `able ache acid acre aged aide ajar also alto arch area army atom aunt away axle baby back bait bake bald bale ball band bang bank bare bark barn base bash bath bead beak beam bean bear beat beef been beer bell belt bend bent best bike bill bind bird bite blow blue blur boar boat body boil bold bolt bond bone book boom boot bore born boss both bowl brag brim brow bulb bulk bull bump bunk buoy burn bush busy buzz cafe cage cake calf call calm came camp cane cape card care cart case cash cast cave chat chef chin chip chop city clad clan clap claw clay clip club clue coal coat code coil coin cola cold colt comb come cone cook cool cope copy cord core cork corn cost cosy cozy crab crew crib crop crow cube curb cure curl cute daft damp dare dark darn dart dash date dawn deaf deal dear debt deck deed deep deer dent desk dial dice diet dime dine dirt dish dive dock doll dome done door dose dote dove down doze drab drag draw drew drip drop drum dual duck duel duke dull dump dune dusk dust duty each earl earn ease east easy echo edge edit epic even ever evil exit face fact fade fail fair fall fame fare farm fast fate fawn fear feed feel feet fell felt fern file fill film find fine fire firm fish fist fizz flag flap flat flea fled flee flew flip flow foal foam foil fold folk fond food fool foot fork form fort foul four fowl free fret frog from fuel full fury fuss gain gale game gasp gate gave gaze gear germ gift girl give glad glee glow glue glum gnat gnaw goal goat goes gold golf gone good gown grab grim grin grip grow grub gull gust hail hair half hall halo halt hand hang hard hare harm harp hate have hawk haze hazy head heal heap hear heat heel heir held helm help herb herd here hero hide high hike hill hilt hint hire hive hoax hold hole holy home hood hoof hook hoop hope horn hose host hour howl huge hump hunt hurt hush husk hymn icon idea idle inch into iron isle item jade jazz jeep jest join joke jolt jump june july just kale keen keep kelp kept kerb kick kind king kiss kite knee knew knit knot know lace lack lady laid lake lamb lamp land lane lark lash lass last late lawn lazy lead leaf leak lean leap left lend lens less liar lick life lift like lily limb lime limp line link lion list live load loaf loan lobe lock loft long look loop lord lose loss lost loud love luck lump lung lure lush made maid mail main make male malt mane many mare mark mash mask mast mate math maze meal mean meat meek meet melt mend menu mesh mess mice mild mile milk mill mind mine mint miss mist moan moat mock mode mole mood moon moor mope more moss most moth move much muff mule must nail name navy near neat neck need nest news next nice nine nook noon nose note numb oath obey okay once only ooze opal open oval oven over pace pack page paid pail pain pair pale palm pane pant park part pass past path pave pawn peak peal pear peas peat peck peel peep pelt perk pest pier pile pill pine pink pint pipe pity plan play plea plod plot plug plum plus poem poet poke pole poll polo pond pony pool poor pork port pose posh post pour pram pray prey prop puck puff pull puma pump punt pure purr push quit quiz race rack raft rage raid rail rain rake ramp rang rank rare rash rate rave read real reap rear reed reef reel rein rely rent rest rice rich ride ring rink ripe rise risk road roam roar robe rock rode role roll romp roof room root rope rose rosy ruby rude ruin rule rung rush rust sack safe sage said sail sake sale salt same sand sang sank sash save scan scar seal seam sear seat seed seek seem seen self sell send sent sewn shed shin ship shoe shoo shop shot show shut side sigh sign silk sill sing sink size skin skip slab slam slap slat sled slid slim slip slot slow slug slur smog smug snag snap snip snow snug soak soap soar sock sofa soft soil sold sole solo some song soon soot sore sort soul soup sour span sped spin spit spot spur stab stag star stay stem step stew stir stop stub stun such suit sulk sung sunk sure surf swan swap sway swim tack tail take tale talk tall tame tank tape tart task taxi team tear teen tell tend tent term test text than that thaw them then they thin this tick tide tidy tied tier tile till time tint tiny tire toad tofu told toll tone tong took tool toot tour town tram trap tray tree trek trim trio trip trot true tuba tube tuck tuna tune turn tusk twig twin type ugly undo unit upon used user vale vane vase vast veal veil vein verb very vest veto view vine vole vote wade wage wail wait wake walk wall wand wane want ward warm warn warp wart wash wasp wave wavy weak wear weed week weep well went were west what whey when whip wick wide wife wild will wilt wind wine wing wink wipe wire wiry wise wish with woke wolf wood wool word wore work worm worn wove wrap yard yarn yawn year yell yelp yoga yolk your zeal zero zinc zone zoom`,
    // 5 letters
    `about above acorn actor adult after again agree ahead alarm album alert alike alive allow alone along aloud alter amber among angel anger angle angry ankle apple apron arena argue arise aroma arrow aside awake award aware bacon badge bagel baker basic basin batch beach beard beast began begin being belly below bench berry birth black blade blame bland blank blaze blend bless blind blink block blond bloom blown blush board boast bonus boost booth bound braid brain brake brand brass brave bread break brick bride brief bring brisk broad brook broom broth brown brush buddy build built bunch bunny burst cabin cable camel canal candy canoe cargo carol carry carve catch cause cedar chain chair chalk charm chart chase cheap check cheek cheer chess chest chick chief child chill chime china chirp choir chord chore cider claim clamp clasp class clean clear clerk click cliff climb cling cloak clock close cloth cloud clown coach coast cocoa comet comic coral couch cough could count court cover craft crane crash crate crawl crazy cream creek crest crisp cross crowd crown crumb crush crust curly curve cycle daily dairy daisy dance depth diary dirty ditch dizzy dodge doing dough dozen draft drain drama drank drawn dream dress dried drift drill drink drive drove dryer eager eagle early earth eight elbow elder empty enjoy enter equal error event every exact extra fable faint fairy faith false fancy feast fence ferry fetch fever field fifth fifty final first flake flame flash flask float flock flood floor flour flute focus foggy force forty found frame fresh fried front frost froze fruit fudge funny fuzzy ghost giant glass globe glory glove going goose grace grade grain grand grant grape grasp grass gravy great green greet grill grind group grown guard guess guest guide habit happy harsh hatch heard heart heavy hedge hello hippo hobby honey horse hotel hound house human hurry ideal igloo image index inner ivory jeans jelly jewel joint jolly judge juice juicy kayak knead kneel knelt knife knock known koala label ladle large later laugh layer learn leash least leave ledge lemon level light lilac limit linen liver llama local lodge lofty logic loose lorry lucky lunch magic major maker mango manor maple march marsh match maybe mayor medal melon mercy merry metal might minor minus mixed model moist money month moose moral motor mount mouse mouth movie muddy music nanny nerve never night ninth noble noise noisy north novel nurse ocean offer often olive onion opera orbit order other otter ought ounce outer owner paint panda panel paper party pasta paste patch pause peace peach pearl pedal penny perch petal phone photo piano piece pilot pinch pizza place plain plane plant plate plaza plump point polar porch pouch pound power press price pride prime print prize proof proud prove pupil puppy purse quack queen quest quick quiet quilt quite radio rainy raise rally ranch range rapid raven reach ready relax reply rhyme rider ridge right rinse river roast robin robot rocky rough round route royal rugby ruler rural sadly saint salad salty sandy sauce scale scarf scene scent scone scoop score scout scrap seven shade shake shall shape share shark sharp shave shawl sheep sheet shelf shell shine shiny shirt shock shore short shout shown sight silly since skate skill skirt slate sleep slice slide slope small smart smell smile smoke snack snail snake sneak snore solid solve sorry sound south space spade spare spark speak spell spend spice spicy spill spine spoke spoon sport spray stack staff stage stair stamp stand stare start state steak steam steel steep steer stick stiff still sting stock stone stood stool store stork storm story stove straw strip stuck study stuff stump sugar sunny super sweat sweep sweet swept swift swing sword table taste teach teeth thank their theme there these thick thing think third thorn those three threw throw thumb tiger tight timer tired title toast today tooth topic torch total touch tough towel tower trace track trade trail train treat trend trial tribe trick tried truck truly trunk trust truth tulip tummy twice twist uncle under until upper upset usual value video visit vital vivid voice wagon waist watch water weary weave wedge whale wheat wheel where which while white whole whose width witch woman women world worry worse worst worth would wrist write wrong wrote yacht yield young youth zebra`,
    // 6 letters
    `action advice afraid almost always amount anchor animal answer anyone appear arrive artist asleep autumn badger bakery ballet banana barrel basket batter beauty become beetle before behind belong beside better beyond bishop border borrow bottle bottom bought branch breath breeze bridge bright broken bubble bucket budget bundle burrow butter button cactus camera candle cannot carpet carrot castle cattle cellar cereal chance change chapel cheese cherry choose chosen church circle circus clever closet clover coffee colour column comedy common cookie copper corner cotton cousin cradle credit cruise cuddle custom dancer danger decide degree desert design detail dinner direct doctor dollar donkey double dragon drawer driver during easily eating effect effort eighty either eleven empire energy engine enough entire escape expect fabric family famous farmer father fellow fiddle finger finish flight flower follow forest forget fossil freeze fridge friend frozen gallon garage garden garlic gentle ginger global golden ground growth guitar hammer handle happen harbor health heaven helmet helper hidden hockey hollow honest hungry hunter insect inside invent island jacket jigsaw jockey jumble jungle kettle kitten ladder leader league lesson letter liquid listen little lively locket lonely lovely magnet manner marble market meadow memory middle minute mirror mitten modern moment monkey mother muffin muscle museum nature nearby nearly needle nephew nobody noodle normal notice number object office orange oyster paddle palace parade parcel parent parrot peanut pebble pencil people pepper pickle picnic pigeon pillow pirate planet plenty pocket poetry police polite potato powder pretty prince pudding puddle puppet purple puzzle rabbit racket rather reader reason recipe record remain remind repair report rescue return ribbon riddle rocket rubber saddle safety sailor salmon sample school screen season second secret shadow shovel shower silent silver simple singer sister sleeve slowly smooth sneeze soccer spider spirit spring square stable statue steady sticky stream street string stripe strong summer sunset supper supply switch symbol tablet talent teapot temple tennis thirty thread throat ticket timber tomato tongue travel trophy turkey turnip turtle twelve twenty unless valley velvet violin voyage waiter walnut walrus warmth wealth weekly weight widely window winner winter wisdom within wizard wonder wooden writer yellow`
  ];
  const WQ_BAD = new Set(('ASS ARSE BUM POO POOP FART TIT PISS SHIT CRAP FUCK FUK FCK CUNT COCK DICK KNOB NOB PRAT TWAT WANK SEX BOOB SLUT HOE FAG NAZI KKK ' +
    'DIE DIED KILL DEAD PUKE SPUNK JIZZ PORN NUDE BITCH PENIS GAY HOMO RAPE NIG PAKI SPAZ TURD PUS POX SUCK DAMN HELL GUN WAR TOMB GRAVE').split(' '));
})();
