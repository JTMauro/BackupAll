/* Recall: more1.js — gentle everyday games
   I Spy, Listen and Remember, Make a Sandwich, Picture Sudoku, Laundry Day */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor } = R;

  /* difficulty grows from 0 at level 1 towards max, then levels off */
  const ease = (L, max, k) => Math.round(max * (1 - Math.exp(-(Math.max(1, L) - 1) / k)));
  const btn = (label, cls, fn) => { const b = el('button', 'btn ' + cls, label); b.type = 'button'; b.onclick = fn; return b; };
  const listJoin = a => a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const rise = k => tone(523 * Math.pow(1.1225, Math.min(k, 12)), .16, 'triangle', .12);

  R.css(`
/* ---------- shared ---------- */
.m1-row{display:flex; flex-wrap:wrap; gap:10px; justify-content:center; align-items:center}
.m1-panel{background:var(--card); color:var(--ink); border-radius:22px; box-shadow:0 6px 0 var(--card-edge), 0 12px 20px rgba(0,0,0,.28)}
@keyframes m1-glow{0%,100%{opacity:.55; scale:1}50%{opacity:1; scale:1.08}}
@keyframes m1-in{from{scale:.4; opacity:0}60%{scale:1.12}to{scale:1}}
@keyframes m1-hop{0%{translate:0 0}40%{translate:0 -18px}100%{translate:0 0}}

/* ---------- I Spy ---------- */
.isp-wrap{width:min(560px, 100%); margin:0 auto; display:flex; flex-direction:column; gap:12px}
.isp-top{display:flex; gap:10px; align-items:stretch}
.isp-spy{flex:1; display:flex; align-items:center; gap:12px; padding:8px 14px; min-height:70px}
.isp-spy .tile{width:58px; height:58px; font-size:34px; flex:none; border-radius:16px}
.isp-spy small{display:block; font:600 1.05rem/1 var(--display); color:var(--ink-soft)}
.isp-spy b{display:block; font:700 clamp(1.25rem, 5vw, 1.55rem)/1.1 var(--display)}
.isp-spy.new{animation:m1-in .45s ease-out}
.isp-top .btn{flex:none; min-width:84px; flex-direction:column; gap:0; font-size:1.05rem}
.isp-scene{position:relative; width:100%; aspect-ratio:4/3; border-radius:22px; overflow:hidden; cursor:pointer; container-type:inline-size;
  box-shadow:0 0 0 5px #5A361C, 0 0 0 9px var(--brass), 0 14px 26px rgba(0,0,0,.4); touch-action:manipulation; -webkit-user-select:none; user-select:none}
.isp-scene > *{pointer-events:none}
.isp-d{position:absolute}
.isp-e{position:absolute; transform:translate(-50%, -50%) rotate(var(--r, 0deg)); line-height:1; filter:drop-shadow(0 .35cqw .2cqw rgba(0,0,0,.35)); transition:scale .3s}
.isp-cov{position:absolute; transform:translate(-50%, -50%) rotate(var(--r, 0deg)); border-radius:40% 40% 30% 30%; box-shadow:0 .5cqw 0 rgba(0,0,0,.18), inset 0 .6cqw 0 rgba(255,255,255,.35); transition:translate .6s ease-in, opacity .6s}
.isp-cov.gone{translate:0 8cqw; opacity:0}
.isp-e.found{animation:m1-hop .5s; filter:drop-shadow(0 0 1.4cqw #FFE9A0) drop-shadow(0 0 .6cqw #FFC234)}
.isp-ring{position:absolute; transform:translate(-50%, -50%); border-radius:50%; border:.9cqw solid var(--sun); box-shadow:0 0 0 .5cqw rgba(255,255,255,.7), 0 0 3cqw var(--sun); animation:m1-in .4s}
.isp-glow{position:absolute; transform:translate(-50%, -50%); border-radius:50%; background:radial-gradient(circle, rgba(255,246,190,.55) 0%, rgba(255,214,90,.45) 55%, rgba(255,194,52,.2) 70%); border:.8cqw dashed #FFB800; box-shadow:0 0 3cqw #FFD447, inset 0 0 3cqw #FFE27A; animation:m1-glow 1.4s ease-in-out infinite}
.isp-miss{position:absolute; transform:translate(-50%, -50%); width:9cqw; height:9cqw; border-radius:50%; border:.7cqw solid #fff; opacity:.9; animation:pop .7s forwards}
.isp-win{background:linear-gradient(#BFE6FF, #8FD0FF); border:1.2cqw solid #F7F1E4; border-radius:1.5cqw; box-shadow:0 .6cqw 0 rgba(0,0,0,.2)}
.isp-win::after{content:""; position:absolute; inset:0; background:linear-gradient(90deg, transparent 47%, #F7F1E4 47% 53%, transparent 53%), linear-gradient(0deg, transparent 47%, #F7F1E4 47% 53%, transparent 53%)}
.isp-cur{background:repeating-linear-gradient(90deg, #E2557B 0 2cqw, #C9416A 2cqw 4cqw); border-radius:0 0 2cqw 2cqw}
.isp-shelf{background:linear-gradient(#A8713F, #7A4A28); border-radius:.8cqw; box-shadow:0 .8cqw 0 rgba(0,0,0,.25)}
.isp-rug{border-radius:50%; background:repeating-radial-gradient(circle, #D9504A 0 2.5cqw, #F2C14E 2.5cqw 4cqw, #4C8FD6 4cqw 5.5cqw)}
.isp-sun{border-radius:50%; background:radial-gradient(circle, #FFF3A0, #FFC234 70%); box-shadow:0 0 4cqw #FFE27A}
.isp-big{font-size:var(--s); line-height:1; opacity:.95; transform:translate(-50%, -50%)}

/* ---------- Listen and Remember ---------- */
.lsn-wrap{width:min(560px, 100%); margin:0 auto; display:flex; flex-direction:column; gap:14px; align-items:center}
.lsn-radio{width:100%; padding:16px; display:flex; flex-direction:column; align-items:center; gap:10px; text-align:center}
.lsn-spk{width:84px; height:84px; font-size:46px; border-radius:24px; position:relative}
.lsn-spk.on::before, .lsn-spk.on::after{content:""; position:absolute; inset:-8px; border-radius:30px; border:4px solid var(--sun); animation:m1-glow 1s ease-in-out infinite}
.lsn-spk.on::after{inset:-18px; border-radius:36px; animation-delay:.3s; opacity:.6}
.lsn-why{margin:0; font:600 1.1rem/1.3 var(--body); color:var(--ink-soft); max-width:34ch}
.lsn-cap{display:flex; flex-wrap:wrap; gap:8px; justify-content:center; min-height:52px}
.lsn-cap span{color:var(--ink); display:inline-flex; align-items:center; gap:6px; background:#FFF1C9; border-radius:14px; padding:6px 12px; font:600 1.25rem var(--display); box-shadow:0 3px 0 var(--sun-d); animation:m1-in .35s}
.lsn-cap span i{font-style:normal; font-size:1.5rem}
.lsn-top{display:flex; gap:10px; align-items:center; justify-content:center; flex-wrap:wrap; width:100%}
.lsn-bask{display:flex; align-items:center; gap:8px; padding:6px 14px; min-height:64px; font:700 1.25rem var(--display)}
.lsn-bask .got{display:flex; gap:2px; font-size:30px; min-width:40px}
.lsn-bask .got span{animation:m1-in .4s}
.lsn-shelf{width:100%; display:grid; grid-template-columns:repeat(var(--cols, 3), 1fr); gap:12px 10px; padding:14px 12px 18px; border-radius:20px;
  background:linear-gradient(#F4E3C1, #E8D0A4);
  box-shadow:0 0 0 6px #5A361C, 0 12px 22px rgba(0,0,0,.35)}
.lsn-item{display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; min-height:88px; padding:6px 4px; border:0; border-radius:18px; cursor:pointer; font:600 1.05rem/1.1 var(--display)}
.lsn-item .e{font-size:38px; line-height:1}
.lsn-item.took{opacity:.35; transform:scale(.88); box-shadow:none}
.lsn-item.took::after{content:"✓"; position:absolute}
.lsn-item{position:relative}
.lsn-item.took::after{top:4px; right:8px; color:var(--leaf-d); font:700 1.5rem var(--display)}
.lsn-say{position:fixed; left:50%; top:30%; transform:translateX(-50%); z-index:30}

/* ---------- Make a Sandwich ---------- */
.sdw-wrap{width:min(560px, 100%); margin:0 auto; display:flex; flex-direction:column; gap:12px}
.sdw-cust{display:flex; gap:10px; align-items:stretch}
.sdw-who{display:flex; align-items:center; gap:10px; padding:8px 12px; flex:1; position:relative; animation:m1-in .45s}
.sdw-face{width:62px; height:62px; font-size:40px; flex:none; border-radius:50%}
.sdw-who b{display:block; font:700 1.1rem/1.15 var(--display)}
.sdw-who small{display:block; font:600 1rem var(--display); color:var(--ink-soft)}
.sdw-who .pics{font-size:24px; letter-spacing:2px; line-height:1.2}
.sdw-who.wait{flex:0 0 auto; width:32%; padding:6px; opacity:.85; flex-direction:column; justify-content:center; gap:2px; text-align:center}
.sdw-who.wait .sdw-face{width:48px; height:48px; font-size:30px}
.sdw-who.wait b{font-size:1rem}
.sdw-who.happy::after{content:"♥"; position:absolute; right:10px; top:-6px; color:var(--berry); font:700 2.2rem var(--display); animation:m1-in .5s}
.sdw-bench{position:relative; height:186px; border-radius:22px; background:linear-gradient(180deg, rgba(255,255,255,.08), rgba(0,0,0,.12)); display:flex; align-items:flex-end; justify-content:center; overflow:hidden}
.sdw-plate{position:relative; width:230px; height:22px; margin-bottom:10px; border-radius:50%; background:radial-gradient(ellipse at 50% 40%, #fff 0 55%, #E3E8EC 56% 100%); box-shadow:0 6px 0 #B9C2C9, 0 10px 14px rgba(0,0,0,.3)}
.sdw-stack{position:absolute; left:50%; bottom:20px; transform:translateX(-50%); display:flex; flex-direction:column-reverse; align-items:center}
.sdw-l{flex:none; width:190px; margin-top:-3px; animation:sdw-drop .45s cubic-bezier(.3,1.5,.6,1)}
@keyframes sdw-drop{from{translate:0 -120px; opacity:0}60%{opacity:1}}
.sdw-l.bread-white{height:30px; background:linear-gradient(#FBEBC6, #F2D9A0); border:4px solid #C98B47; border-radius:9px}
.sdw-l.bread-brown{height:30px; background:linear-gradient(#B9783F, #9A5E2C); border:4px solid #6D3E18; border-radius:9px}
.sdw-l.top{border-radius:44px 44px 9px 9px; height:36px}
.sdw-l.cheese{width:198px; height:16px; background:radial-gradient(circle closest-side, #F2B700 0 50%, transparent 56%) 6px 4px/28px 12px, #FFD447; border-radius:3px; box-shadow:inset 0 -4px 0 #E6A800}
.sdw-l.tomato{width:184px; height:18px; background:radial-gradient(circle closest-side, #E8432F 0 72%, #FF8A70 76% 90%, transparent 94%) 0 0/34px 18px repeat-x}
.sdw-l.ham{width:200px; height:16px; background:#F4A3A8; border-radius:12px; box-shadow:inset 0 -4px 0 #D9767D, inset 0 3px 0 #FFD0D3}
.sdw-l.lettuce{width:208px; height:18px; background:radial-gradient(circle at 50% 100%, #6CC24A 0 60%, transparent 62%) 0 0/24px 18px repeat-x, linear-gradient(transparent 50%, #4FA334 50%)}
.sdw-l.cucumber{width:186px; height:16px; background:radial-gradient(circle closest-side, #DDF3B8 0 45%, #3E9A3E 50% 88%, transparent 92%) 0 0/30px 16px repeat-x}
.sdw-l.egg{width:186px; height:18px; background:radial-gradient(circle closest-side, #FFC234 0 38%, #fff 42% 88%, transparent 92%) 0 0/34px 18px repeat-x}
.sdw-l.chicken{width:192px; height:17px; background:#E8B97A; border-radius:9px; box-shadow:inset 0 -4px 0 #C98F4A, inset 0 3px 0 #F6D7A8}
.sdw-pz{position:absolute; left:50%; bottom:8px; width:150px; height:150px; transform:translateX(-50%)}
.sdw-pz > div{position:absolute; border-radius:50%; animation:sdw-drop .45s cubic-bezier(.3,1.5,.6,1)}
.sdw-pz .base{inset:0; background:radial-gradient(circle, #F6D79A 0 70%, #D99A4E 72% 100%); box-shadow:0 6px 0 #A9692A}
.sdw-pz .sauce{inset:13px; background:radial-gradient(circle at 40% 35%, #F05A3A, #C9301B)}
.sdw-pz .cheese{inset:18px; background:radial-gradient(circle at 30% 30%, #FFE680 0 14%, transparent 15%), radial-gradient(circle at 65% 40%, #FFE680 0 16%, transparent 17%), radial-gradient(circle at 45% 70%, #FFE680 0 18%, transparent 19%), radial-gradient(circle at 72% 72%, #FFE680 0 12%, transparent 13%), radial-gradient(circle at 25% 62%, #FFE680 0 12%, transparent 13%), rgba(255,226,120,.55)}
.sdw-pz .top{inset:0; border-radius:0; background:none; font-size:26px}
.sdw-pz .top span{position:absolute; transform:translate(-50%, -50%)}
.sdw-ghost{position:absolute; left:50%; bottom:60px; font-size:52px; animation:sdw-off 1.1s ease-in forwards; pointer-events:none}
@keyframes sdw-off{0%{transform:translate(-50%, -110px); opacity:0}25%{transform:translate(-50%, 0); opacity:1}55%{transform:translate(-50%, 0) rotate(0)}100%{transform:translate(170px, 30px) rotate(70deg); opacity:0}}
.sdw-tray{display:grid; grid-template-columns:repeat(var(--cols, 4), 1fr); gap:10px}
.sdw-ing{display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; min-height:80px; padding:6px 2px; border:0; border-radius:18px; cursor:pointer; font:600 1rem/1.05 var(--display); text-align:center}
.sdw-ing .e{font-size:32px; line-height:1}
.sdw-ing:active{transform:translateY(4px)}
.sdw-served{animation:sdw-serve .8s ease-in forwards}
@keyframes sdw-serve{to{translate:0 -160px; scale:.4; opacity:0}}

/* ---------- Picture Sudoku ---------- */
.psu-wrap{width:min(560px, 100%); margin:0 auto; display:flex; flex-wrap:wrap; gap:16px; justify-content:center; align-items:center}
.psu-board{display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:8px; border-radius:20px; background:#5A361C; box-shadow:0 0 0 4px var(--brass), 0 14px 24px rgba(0,0,0,.4); width:min(316px, 100%)}
.psu-box{display:grid; grid-template-columns:1fr 1fr; gap:5px; padding:5px; border-radius:14px; background:#EADBC0}
.psu-cell{aspect-ratio:1; min-width:56px; border:0; border-radius:14px; display:grid; place-items:center; font-size:clamp(30px, 9vw, 40px); cursor:pointer; padding:0; position:relative}
.psu-cell.blank{background:rgba(255,255,255,.65); box-shadow:inset 0 3px 6px rgba(0,0,0,.18)}
.psu-cell.given{box-shadow:inset 0 -5px 0 rgba(0,0,0,.14), inset 0 3px 0 rgba(255,255,255,.5), 0 4px 0 var(--d)}
.psu-cell.given::after{content:""; position:absolute; inset:0; border-radius:14px; background:rgba(255,255,255,.18)}
.psu-cell.placed{animation:m1-in .4s}
.psu-cell.peer{filter:brightness(1.05)}
.psu-cell.blank.peer{background:rgba(255,246,214,.95)}
.psu-cell.sel{outline:5px solid var(--sun); outline-offset:-2px; box-shadow:0 0 0 4px #fff, 0 0 18px var(--sun)}
.psu-cell.sel.blank::before{content:"?"; font:700 1.8rem var(--display); color:var(--sun-d)}
.psu-cell.glow{animation:m1-glow 1s ease-in-out infinite}
.psu-cell.win{animation:m1-hop .5s}
.psu-side{display:flex; flex-direction:column; gap:10px; align-items:center}
.psu-pal{display:grid; grid-template-columns:repeat(4, 64px); gap:10px}
@media (min-width:640px){ .psu-pal{grid-template-columns:repeat(2, 72px)} }
.psu-pick{width:64px; height:64px; font-size:36px; border-radius:18px; cursor:pointer; padding:0}
@media (min-width:640px){ .psu-pick{width:72px; height:72px} }

/* ---------- Laundry Day ---------- */
.lnd-wrap{width:min(560px, 100%); margin:0 auto; display:flex; flex-direction:column; gap:14px; align-items:center}
.lnd-line{position:relative; width:100%; height:12px}
.lnd-item{display:flex; flex-direction:column; align-items:center; gap:4px; padding:10px 18px 8px; min-width:200px; animation:m1-in .45s}
.lnd-item svg{width:130px; height:130px; filter:drop-shadow(0 5px 3px rgba(0,0,0,.25))}
.lnd-item b{font:600 1.3rem var(--display)}
.lnd-item.fly{animation:lnd-fly .5s ease-in forwards}
@keyframes lnd-fly{to{translate:var(--fx, 0) 170px; scale:.25; opacity:0}}
.lnd-left{font:600 1.1rem var(--display); color:var(--on-table-soft); margin:0}
.lnd-baskets{display:flex; gap:10px; justify-content:center; width:100%}
.lnd-bask{flex:1 1 0; max-width:170px; min-height:120px; border:0; border-radius:20px; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:2px; padding:8px 4px; font:700 1.1rem/1.1 var(--display)}
.lnd-bask svg{width:74px; height:56px}
.lnd-bask .n{font:600 .95rem var(--display); color:var(--ink-soft)}
.lnd-bask.bump{animation:m1-hop .4s}
.lnd-table{width:100%; display:grid; grid-template-columns:repeat(auto-fit, minmax(124px, 1fr)); gap:12px; padding:14px; border-radius:22px; background:repeating-linear-gradient(45deg, #F7EFE0 0 14px, #EFE2C8 14px 28px); box-shadow:0 0 0 6px #C9A06A, 0 12px 22px rgba(0,0,0,.3)}
.lnd-cloth{position:relative; border:0; background:none; cursor:pointer; min-height:120px; display:flex; flex-direction:column; align-items:center; justify-content:center; perspective:500px; padding:4px; border-radius:16px}
.lnd-cloth .fl{position:relative; width:104px; height:104px; transition:transform .35s ease-in-out}
.lnd-cloth .fl > div{position:absolute; inset:0; transition:transform .5s ease-in-out; transform-origin:50% 50%}
.lnd-cloth .fl svg{width:104px; height:104px; filter:drop-shadow(0 4px 2px rgba(0,0,0,.2))}
.lnd-cloth .fl .a{clip-path:inset(0 0 50% 0)}
.lnd-cloth .fl .b{clip-path:inset(50% 0 0 0)}
.lnd-cloth.f1 .fl{transform:scaleX(.6)}
.lnd-cloth.f2 .fl .b{transform:rotateX(180deg); filter:brightness(.85)}
.lnd-cloth .done{width:104px; height:80px; animation:m1-in .45s}
.lnd-cloth small{font:600 1rem/1.1 var(--display); color:var(--ink); text-align:center}
.lnd-socks{width:100%; display:grid; grid-template-columns:repeat(var(--cols, 4), 1fr); gap:10px}
.lnd-sock{border:0; border-radius:18px; min-height:84px; padding:4px; cursor:pointer; display:grid; place-items:center; transition:translate .15s}
.lnd-sock svg{width:66px; height:76px; filter:drop-shadow(0 3px 2px rgba(0,0,0,.25))}
.lnd-sock.flip svg{transform:scaleX(-1)}
.lnd-sock.sel{translate:0 -8px; box-shadow:0 0 0 5px var(--sun), 0 12px 0 var(--d), 0 16px 20px rgba(0,0,0,.3)}
.lnd-sock.gone{animation:pop .5s forwards; pointer-events:none}
.lnd-sock.hintme{animation:m1-glow 1s ease-in-out infinite}
.lnd-pairs{display:flex; flex-wrap:wrap; gap:0; justify-content:center; min-height:44px; font-size:30px}
.lnd-pairs svg{width:44px; height:50px; margin-right:8px; animation:m1-in .4s}
.lnd-pairs svg:nth-child(odd){transform:scaleX(-1); margin-right:-22px}
`);

  register({ id: 'ispy', cat: 'gentle', gentle: true, order: 37, name: 'I Spy', icon: '🔎', desc: 'Find the hidden things in a cosy room', start: startISpy });
  register({ id: 'listen', cat: 'gentle', gentle: true, order: 38, name: 'Listen and Remember', icon: '👂', desc: 'Hear a shopping list, then fetch it', start: startListen });
  register({ id: 'sandwich', cat: 'gentle', gentle: true, order: 39, name: 'Make a Sandwich', icon: '🥪', desc: 'Make sandwiches and pizzas to order', start: startSandwich });
  register({ id: 'picsudoku', cat: 'gentle', gentle: true, order: 40, name: 'Picture Sudoku', icon: '🍓', desc: 'Fill the grid so no picture repeats', start: startPicSudoku });
  register({ id: 'laundry', cat: 'gentle', gentle: true, order: 41, name: 'Laundry Day', icon: '🧺', desc: 'Sort, fold and pair the washing', start: startLaundry });

  /* =========================================================
     I SPY
     Scene coordinates: x 0..100 across, y 0..75 down (a 4:3 picture).
     ========================================================= */
  const ISPY_SCENES = [
    { name: 'the living room',
      bg: 'linear-gradient(180deg, transparent 62%, #6E4425 62% 63.5%, #B57A4A 63.5%), repeating-linear-gradient(90deg, #F8E7C8 0 3.2cqw, #F0D7AE 3.2cqw 6.4cqw)',
      decor: [['win', 6, 6, 24, 22], ['cur', 4, 4, 28, 5], ['shelf', 62, 24, 34, 2.2], ['shelf', 62, 42, 34, 2.2], ['rug', 22, 54, 56, 18], ['big', 40, 46, 0, 0, '🛋️', 30]],
      cover: ['#E06A8E', 'repeating-linear-gradient(45deg, rgba(255,255,255,.25) 0 1cqw, transparent 1cqw 2cqw)'],
      items: [['👓', 'a pair of glasses'], ['📖', 'a book'], ['🕰️', 'a clock'], ['🧶', 'a ball of wool'], ['🐈', 'a cat'], ['🪴', 'a pot plant'], ['📻', 'a radio'], ['☕', 'a cup of tea'], ['🕯️', 'a candle'], ['🖼️', 'a picture'], ['🔑', 'a key'], ['🧸', 'a teddy bear'], ['🎩', 'a top hat'], ['🗞️', 'a newspaper'], ['🧦', 'a sock'], ['🍪', 'a biscuit'], ['✂️', 'some scissors'], ['🎲', 'a dice'], ['💡', 'a light bulb'], ['📮', 'a post box'], ['🎻', 'a violin'], ['🧵', 'a reel of thread'], ['🐕', 'a dog'], ['🥧', 'a pie']] },
    { name: 'the kitchen',
      bg: 'linear-gradient(180deg, transparent 52%, #9A5E2C 52% 56%, #C98B47 56% 64%, transparent 64%), linear-gradient(180deg, transparent 64%, #E8E1D0 64%), repeating-linear-gradient(0deg, #DDEFF7 0 5.6cqw, #fff 5.6cqw 6cqw), repeating-linear-gradient(90deg, transparent 0 5.6cqw, #fff 5.6cqw 6cqw)',
      decor: [['win', 36, 5, 28, 20], ['shelf', 4, 20, 26, 2.2], ['shelf', 70, 20, 26, 2.2]],
      cover: ['#6FB7E8', 'repeating-linear-gradient(90deg, rgba(255,255,255,.55) 0 1cqw, transparent 1cqw 3cqw)'],
      items: [['🫖', 'a teapot'], ['🍳', 'a frying pan'], ['🥄', 'a spoon'], ['🍞', 'a loaf of bread'], ['🥚', 'an egg'], ['🍎', 'an apple'], ['🧀', 'some cheese'], ['🥛', 'a glass of milk'], ['🍌', 'a banana'], ['🧂', 'the salt'], ['🍯', 'a pot of honey'], ['🥕', 'a carrot'], ['⏲️', 'a kitchen timer'], ['🧁', 'a cupcake'], ['🍋', 'a lemon'], ['🥫', 'a tin of soup'], ['🍅', 'a tomato'], ['🫙', 'a jar'], ['🧽', 'a sponge'], ['🍽️', 'a plate'], ['🥐', 'a croissant'], ['🍐', 'a pear'], ['🐭', 'a mouse'], ['🥣', 'a bowl']] },
    { name: 'the garden shed',
      bg: 'linear-gradient(180deg, transparent 68%, #8C8C84 68%), repeating-linear-gradient(90deg, #A7744A 0 7cqw, #8F5F38 7cqw 7.6cqw)',
      decor: [['win', 64, 6, 26, 20], ['shelf', 6, 22, 40, 2.2], ['shelf', 6, 44, 40, 2.2], ['big', 82, 58, 0, 0, '🪜', 22]],
      cover: ['#5E9E46', 'radial-gradient(circle at 30% 30%, rgba(255,255,255,.25) 0 20%, transparent 21%) 0 0/3cqw 3cqw'],
      items: [['🔨', 'a hammer'], ['🪛', 'a screwdriver'], ['🧤', 'some gloves'], ['🪣', 'a bucket'], ['🌻', 'a sunflower'], ['🐌', 'a snail'], ['🕷️', 'a spider'], ['🔧', 'a spanner'], ['🪚', 'a saw'], ['🧰', 'a toolbox'], ['🥾', 'a boot'], ['🌱', 'a seedling'], ['🐦', 'a bird'], ['🚲', 'a bicycle'], ['🧺', 'a basket'], ['🔦', 'a torch'], ['🐞', 'a ladybird'], ['🔩', 'a nut and bolt'], ['🪴', 'a flower pot'], ['🍓', 'a strawberry'], ['🐸', 'a frog'], ['⛏️', 'a pick'], ['🥕', 'a carrot'], ['🐝', 'a bee']] },
    { name: 'the seaside',
      bg: 'linear-gradient(180deg, #8FD3FF 0 30%, #2E9BD6 30% 34%, #47B3E6 34% 44%, #F7F3E2 44% 46%, #F1D48E 46%)',
      decor: [['sun', 80, 4, 12, 12], ['big', 18, 35, 0, 0, '⛵', 9]],
      cover: ['#E9C877', 'radial-gradient(circle, rgba(140,100,40,.25) 0 12%, transparent 13%) 0 0/2cqw 2cqw'],
      items: [['🐚', 'a sea shell'], ['🦀', 'a crab'], ['⛱️', 'a sun umbrella'], ['🪣', 'a bucket'], ['🍦', 'an ice cream'], ['🐟', 'a fish'], ['🕶️', 'some sunglasses'], ['🩴', 'a flip-flop'], ['🪁', 'a kite'], ['🏐', 'a beach ball'], ['🧴', 'the sun cream'], ['👒', 'a sun hat'], ['🐕', 'a dog'], ['🦞', 'a lobster'], ['⚓', 'an anchor'], ['🏰', 'a sandcastle'], ['🐢', 'a turtle'], ['🍉', 'a slice of melon'], ['🎏', 'a flag'], ['🦆', 'a duck'], ['🥤', 'a drink'], ['🐙', 'an octopus'], ['🌂', 'a brolly'], ['🍭', 'a lolly']] },
    { name: 'the bedroom',
      bg: 'linear-gradient(180deg, transparent 64%, #C77A9A 64%), radial-gradient(circle, #E9D7F5 0 18%, transparent 20%) 0 0/5cqw 5cqw, linear-gradient(#D7C2EE, #CDB4E8)',
      decor: [['win', 8, 6, 22, 22], ['cur', 6, 4, 26, 5], ['shelf', 64, 22, 32, 2.2], ['big', 52, 52, 0, 0, '🛏️', 30]],
      cover: ['#7FB8E6', 'repeating-linear-gradient(0deg, rgba(255,255,255,.35) 0 1cqw, transparent 1cqw 2.4cqw)'],
      items: [['🧸', 'a teddy bear'], ['👓', 'a pair of glasses'], ['⏰', 'an alarm clock'], ['🥿', 'a slipper'], ['📚', 'some books'], ['🕯️', 'a candle'], ['🪞', 'a mirror'], ['👗', 'a dress'], ['🎀', 'a ribbon'], ['👜', 'a handbag'], ['💍', 'a ring'], ['🧦', 'a sock'], ['🪥', 'a toothbrush'], ['🖼️', 'a photo'], ['🧣', 'a scarf'], ['🐈', 'a cat'], ['🪮', 'a comb'], ['👒', 'a hat'], ['📿', 'some beads'], ['🌸', 'a flower'], ['🧴', 'a bottle of lotion'], ['💐', 'a bunch of flowers'], ['🎁', 'a present'], ['🪭', 'a fan']] }
  ];

  function startISpy(L, api) {
    const sc = ISPY_SCENES[(L - 1 + randInt(2)) % ISPY_SCENES.length];
    const nFind = L <= 2 ? 3 : L <= 5 ? 4 : 5;
    const nObj = Math.min(sc.items.length, 9 + ease(L, 13, 8));
    const size = 13 - ease(L, 5, 9);                 // emoji size in % of picture width (13 → 8)
    const tol = Math.max(10, size * .95, L <= 2 ? 14 : 0);   // generous tap radius
    const hideN = L < 3 ? 0 : L < 6 ? 1 : Math.min(nFind - 1, 2 + ease(L, 2, 10));
    const hideFrac = L < 3 ? 0 : Math.min(.45, .3 + ease(L, 15, 10) / 100);

    // place objects with rejection sampling so nothing overlaps
    const pool = shuffle(sc.items.slice()).slice(0, nObj);
    const objs = [];
    pool.forEach(([e, name]) => {
      const s = size * (.85 + Math.random() * .35);
      let best = null;
      for (let t = 0; t < 400; t++) {
        const x = s / 2 + 3 + Math.random() * (94 - s), y = s / 2 + 3 + Math.random() * (69 - s);
        const ok = objs.every(o => Math.hypot(o.x - x, o.y - y) > (o.s + s) / 2 * 1.05);
        if (ok) { best = { x, y }; break; }
      }
      if (!best) return;
      objs.push({ e, name, s, x: best.x, y: best.y, r: L >= 4 ? randInt(41) - 20 : randInt(17) - 8 });
    });
    const targets = shuffle(objs.slice()).slice(0, nFind);
    // partly hide some targets (and a few others, so the hidden ones don't stand out)
    const hidden = new Set(targets.slice(0, hideN));
    if (hideN) shuffle(objs.filter(o => !targets.includes(o))).slice(0, hideN).forEach(o => hidden.add(o));

    const wrap = el('div', 'isp-wrap');
    const top = el('div', 'isp-top'), spy = el('div', 'isp-spy m1-panel');
    const hintB = btn('<span style="font-size:1.6rem">💡</span>Hint', 'c-sun', () => doHint());
    top.append(spy, hintB);
    const scene = el('div', 'isp-scene'); scene.style.background = sc.bg;
    sc.decor.forEach(([k, x, y, w, h, e, s]) => {
      const d = el('div', 'isp-d isp-' + k);
      d.style.left = x + '%'; d.style.top = (y / .75) + '%';
      if (k === 'big') { d.textContent = e; d.style.setProperty('--s', s + 'cqw'); }
      else { d.style.width = w + '%'; d.style.height = (h / .75) + '%'; }
      scene.append(d);
    });
    objs.forEach(o => {
      o.node = el('span', 'isp-e', o.e);
      Object.assign(o.node.style, { left: o.x + '%', top: (o.y / .75) + '%', fontSize: o.s + 'cqw' });
      o.node.style.setProperty('--r', o.r + 'deg');
      o.node.dataset.name = o.name;
      scene.append(o.node);
      if (hidden.has(o)) {
        // a cushion / towel / leaf / sand / blanket covers part of it, from below or a side
        const side = pick(['b', 'b', 'l', 'r']), cw = o.s * (side === 'b' ? 1.3 : 1.0), ch = o.s * (side === 'b' ? hideFrac * 1.15 + .1 : 1.3);
        let cx = o.x, cy = o.y;
        if (side === 'b') cy = o.y + o.s / 2 - ch / 2 + .2 * o.s * (1 - hideFrac);
        else cx = o.x + (side === 'l' ? -1 : 1) * (o.s / 2 - cw / 2 + o.s * (1 - hideFrac) * .9);
        const c = el('div', 'isp-cov');
        Object.assign(c.style, { left: cx + '%', top: (cy / .75) + '%', width: cw + '%', height: (ch / .75) + '%', background: sc.cover[1] + ', ' + sc.cover[0] });
        c.style.setProperty('--r', (randInt(21) - 10) + 'deg');
        scene.append(c); o.cover = c;
      }
    });
    wrap.append(top, scene); api.stage.append(wrap);

    let ti = 0, mistakes = 0, hints = 0, missesHere = 0, hintLevel = 0, glow = null, busy = false;
    function prompt() {
      const t = targets[ti];
      spy.className = 'isp-spy m1-panel'; void spy.offsetWidth; spy.classList.add('new');
      spy.innerHTML = `<span class="tile c-sun">${t.e}</span><span><small>I spy…</small><b>${t.name}</b></span>`;
      scene.dataset.want = t.name;
      api.hint(`I spy ${t.name}. Can you find it in ${sc.name}? Tap it.`);
      api.rounds(nFind, ti); missesHere = 0; hintLevel = 0;
    }
    function toUnits(e) {
      const r = scene.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * 100, y: (e.clientY - r.top) / r.height * 75 };
    }
    function mark(cls, x, y, d) {
      const m = el('div', cls); Object.assign(m.style, { left: x + '%', top: (y / .75) + '%' });
      if (d) { m.style.width = d + '%'; m.style.height = (d / .75) + '%'; }
      scene.append(m); return m;
    }
    scene.addEventListener('click', e => {
      if (busy || ti >= nFind) return;
      const p = toUnits(e), t = targets[ti], td = Math.hypot(p.x - t.x, p.y - t.y);
      // what did they tap? (the nearest thing, if the tap is on or close to it)
      let near = null, nd = 1e9;
      objs.forEach(o => { const d = Math.hypot(p.x - o.x, p.y - o.y); if (d < nd && d < o.s * .75 && !o.done) { nd = d; near = o; } });
      if (td <= tol * .6 || (td <= tol && (!near || near === t))) return found(t);
      const m = mark('isp-miss', p.x, p.y); api.later(() => m.remove(), 800);
      missesHere++;
      if (near) {
        mistakes++; sfx.soft(); wob(near.node);
        api.hint(`That’s ${near.name}. Keep looking for ${t.name}.`);
      } else { sfx.tap(); api.hint(`Nothing there. Keep looking for ${t.name}.`); }
      if (missesHere >= 4 && hintLevel === 0) { api.hint(`Let me help. ${cap(t.name)} is somewhere in the glow.`); showGlow(1); }
    });
    function showGlow(lvl) {
      const t = targets[ti]; if (glow) glow.remove();
      const rad = lvl === 1 ? 26 : 14, off = lvl === 1 ? 8 : 2;
      const a = Math.random() * Math.PI * 2;
      glow = mark('isp-glow', t.x + Math.cos(a) * off, t.y + Math.sin(a) * off, rad * 2);
      hintLevel = lvl;
    }
    function doHint() {
      if (busy || ti >= nFind) return;
      sfx.tap(); hints++;
      showGlow(Math.min(2, hintLevel + 1));
      api.hint(hintLevel === 1 ? `Look where it glows. ${cap(targets[ti].name)} is in there.` : `It’s right in the middle of the glow.`);
    }
    function found(t) {
      busy = true; t.done = true; if (glow) { glow.remove(); glow = null; }
      if (t.cover) t.cover.classList.add('gone');
      t.node.classList.add('found');
      mark('isp-ring', t.x, t.y, t.s * 1.6);
      rise(ti * 2); api.later(() => rise(ti * 2 + 2), 120); sfx.good();
      ti++; api.rounds(nFind, ti);
      if (ti >= nFind) {
        api.hint('You found them all. Well spotted!');
        api.later(() => api.done(starsFor(mistakes + hints, 1, 4)), 900);
      } else {
        toast(cheer());
        api.later(() => { busy = false; prompt(); }, 900);
      }
    }
    prompt();
  }

  /* =========================================================
     LISTEN AND REMEMBER
     ========================================================= */
  const LS_ITEMS = [['🍞', 'bread'], ['🥛', 'milk'], ['🥚', 'eggs'], ['🍎', 'apples'], ['🧀', 'cheese'], ['🍵', 'tea'], ['🧈', 'butter'], ['🍌', 'bananas'],
    ['🥕', 'carrots'], ['🥬', 'a cabbage'], ['🍯', 'honey'], ['🍪', 'biscuits'], ['🥔', 'potatoes'], ['🍅', 'tomatoes'], ['🐟', 'fish'], ['🍊', 'oranges'],
    ['🍋', 'lemons'], ['🎂', 'a cake'], ['🧅', 'onions'], ['🍇', 'grapes'], ['🍐', 'pears'], ['🍗', 'chicken'], ['🌭', 'sausages'], ['🍚', 'rice'],
    ['🍒', 'cherries'], ['🍓', 'strawberries'], ['🌽', 'sweetcorn'], ['🍄', 'mushrooms'], ['☕', 'coffee'], ['🥦', 'broccoli'], ['🍫', 'chocolate'], ['🥒', 'a cucumber']];
  const LS_INTROS = ['Could you pop to the shop for me? I need', 'Here’s the shopping list. Please get', 'We’re running low. Could you fetch', 'For tea tonight, I need', 'Please could you buy'];
  function startListen(L, api) {
    const listN = Math.min(6, 2 + ease(L, 4, 7)), total = 3;
    const shelfN = Math.min(12, L <= 1 ? 6 : listN * 2 + 2);
    const pool = shuffle(LS_ITEMS.slice());
    let round = 0, mistakes = 0, replays = 0, list = [], phase = 'listen', voiceOK = null;
    try { if ('speechSynthesis' in window) speechSynthesis.getVoices(); } catch (e) {}

    const sentence = () => `${pick(LS_INTROS)} ${listJoin(list.map(x => x[1]))}.`;
    const estMs = text => 900 + text.split(/\s+/).length * 430;
    /* try to speak; returns '' when speaking or a reason why not */
    function speakList(text) {
      if (!('speechSynthesis' in window)) return 'This device can’t read aloud, so here is the list to read instead.';
      const ok = R.say(text, .82);
      if (!ok) return 'The sound is switched off, so here is the list to read instead.';
      let voices = []; try { voices = speechSynthesis.getVoices(); } catch (e) {}
      if (!voices.length && !speechSynthesis.speaking && !speechSynthesis.pending) return 'No reading voice was found on this device, so here is the list to read instead.';
      return '';
    }
    function capsFor(box, items, stepMs) {
      box.innerHTML = '';
      items.forEach((x, k) => api.later(() => { if (box.isConnected) box.append(el('span', '', `<i>${x[0]}</i>${x[1]}`)); }, stepMs * k));
    }

    function newRound() {
      api.rounds(total, round); api.stage.innerHTML = ''; phase = 'listen';
      const start = (round * listN) % Math.max(1, pool.length - listN);
      list = pool.slice(start, start + listN);
      const text = sentence();
      const wrap = el('div', 'lsn-wrap'), radio = el('div', 'lsn-radio m1-panel');
      const spk = el('div', 'tile c-sky lsn-spk', '🔊'), why = el('p', 'lsn-why', 'Listen carefully…'), caps = el('div', 'lsn-cap');
      radio.append(spk, why, caps); wrap.append(radio); api.stage.append(wrap);
      api.hint(`Listen to the shopping list. ${list.length} things to remember.`);
      api.later(() => {
        const reason = speakList(text);
        voiceOK = !reason;
        if (voiceOK) {
          spk.classList.add('on'); why.textContent = 'Listen carefully…';
          const dur = estMs(text);
          capsFor(caps, list, (dur - 900) / list.length * .9 + 0);
          api.later(() => { spk.classList.remove('on'); why.textContent = 'Got that? Off to the shelf!'; }, dur);
          api.later(() => shop(text), dur + 1300);
        } else {
          spk.textContent = '📝'; why.textContent = reason;
          caps.innerHTML = list.map(x => `<span><i>${x[0]}</i>${x[1]}</span>`).join('');
          if ('speechSynthesis' in window && /switched off/.test(reason)) {
            const on = btn('🔈 Turn sound on', 'c-card', () => { R.unmute(); sfx.tap(); on.remove(); why.textContent = 'Sound is on now. You’ll hear the list next time.'; });
            radio.append(on);
          }
          api.hint(`Read the list and remember it. ${list.length} things.`);
          api.later(() => shop(text), 2600 + list.length * 1300);
        }
      }, 1100);
    }

    function shop(text) {
      if (phase === 'shop') return;
      phase = 'shop'; api.stage.innerHTML = '';
      const want = new Set(list.map(x => x[1])), got = [];
      const others = shuffle(pool.filter(x => !want.has(x[1]))).slice(0, shelfN - list.length);
      const items = shuffle(list.concat(others));
      const wrap = el('div', 'lsn-wrap'), topRow = el('div', 'lsn-top');
      const bask = el('div', 'lsn-bask m1-panel', `🧺 <span class="got"></span><span class="cnt">0 of ${list.length}</span>`);
      const again = btn('🔊 Hear it again', 'c-sky', () => hearAgain());
      topRow.append(bask, again);
      const caps = el('div', 'lsn-cap'); caps.style.minHeight = '0';
      const cols = items.length <= 6 ? 3 : 4;
      const shelf = el('div', 'lsn-shelf'); shelf.style.setProperty('--cols', cols);
      items.forEach(([e, w]) => {
        const b = el('button', 'lsn-item tile c-card', `<span class="e">${e}</span><span>${w}</span>`); b.type = 'button';
        b.dataset.item = w;
        b.onclick = () => {
          if (b.classList.contains('took') || phase !== 'shop') return;
          if (want.has(w)) {
            b.classList.add('took'); got.push(e); rise(got.length * 2); sfx.good();
            bask.querySelector('.got').append(el('span', '', e));
            bask.querySelector('.cnt').textContent = `${got.length} of ${list.length}`;
            if (got.length === list.length) {
              phase = 'done'; round++; api.rounds(total, round);
              api.hint('That’s everything on the list. Thank you!');
              toast(cheer());
              if (round >= total) api.later(() => api.done(starsFor(mistakes + Math.floor(replays / 2), 1, 3)), 1000);
              else api.later(newRound, 1700);
            } else api.hint(`Yes, ${w}! ${list.length - got.length} more to find.`);
          } else {
            mistakes++; sfx.soft(); wob(b);
            api.hint(`Hmm, we didn’t need ${w}. Tap “Hear it again” if you like.`);
          }
        };
        shelf.append(b);
      });
      wrap.append(topRow, caps, shelf); api.stage.append(wrap);
      api.hint(`Tap the ${list.length} things from the list.`);
      function hearAgain() {
        if (phase !== 'shop') return;
        replays++; sfx.tap();
        const reason = voiceOK === false ? 'x' : speakList(text);
        const show = reason ? 2200 + list.length * 900 : estMs(text);
        caps.innerHTML = '';
        if (reason) { caps.innerHTML = list.map(x => `<span><i>${x[0]}</i>${x[1]}</span>`).join(''); }
        else capsFor(caps, list, (show - 900) / list.length * .9);
        api.later(() => { if (caps.isConnected) caps.innerHTML = ''; }, show + 400);
      }
    }
    newRound();
  }

  /* =========================================================
     MAKE A SANDWICH
     ========================================================= */
  const SW = {
    'bread-white': { e: '🍞', n: 'white bread', short: 'White bread', layer: 'bread-white' },
    'bread-brown': { e: '🍞', n: 'brown bread', short: 'Brown bread', layer: 'bread-brown' },
    cheese: { e: '🧀', n: 'cheese', short: 'Cheese', layer: 'cheese', pz: '🧀' },
    tomato: { e: '🍅', n: 'tomato', short: 'Tomato', layer: 'tomato', pz: '🍅' },
    ham: { e: '🥓', n: 'ham', short: 'Ham', layer: 'ham', pz: '🥓' },
    lettuce: { e: '🥬', n: 'lettuce', short: 'Lettuce', layer: 'lettuce' },
    cucumber: { e: '🥒', n: 'cucumber', short: 'Cucumber', layer: 'cucumber' },
    egg: { e: '🥚', n: 'egg', short: 'Egg', layer: 'egg' },
    chicken: { e: '🍗', n: 'chicken', short: 'Chicken', layer: 'chicken', pz: '🍗' },
    base: { e: '🫓', n: 'pizza base', short: 'Pizza base' },
    sauce: { e: '🥫', n: 'tomato sauce', short: 'Sauce' },
    mozz: { e: '🧀', n: 'cheese', short: 'Cheese' },
    mushroom: { e: '🍄', n: 'mushroom', short: 'Mushroom', pz: '🍄' },
    pepper: { e: '🫑', n: 'pepper', short: 'Pepper', pz: '🫑' },
    olive: { e: '🫒', n: 'olives', short: 'Olives', pz: '🫒' },
    pineapple: { e: '🍍', n: 'pineapple', short: 'Pineapple', pz: '🍍' },
    onion: { e: '🧅', n: 'onion', short: 'Onion', pz: '🧅' }
  };
  const SW_FILL = ['cheese', 'tomato', 'ham', 'lettuce', 'cucumber', 'egg', 'chicken'];
  const SW_TOP = ['mushroom', 'pepper', 'ham', 'olive', 'pineapple', 'onion', 'tomato', 'chicken'];
  const SW_PEOPLE = [['👵', 'Mrs Jones'], ['👴', 'Mr Patel'], ['🧓', 'Arthur'], ['👩‍🦳', 'Edna'], ['👨‍🦳', 'Mr Brown'], ['👩', 'Mrs Lee'], ['👨', 'Sid'], ['👧', 'Little Rosie'], ['🧑‍🦰', 'Joan'], ['👦', 'Young Tom']];
  const PZ_SPOTS = [[30, 32], [62, 28], [72, 58], [44, 52], [28, 66], [54, 76], [50, 30], [78, 40], [36, 44], [64, 70]];

  function makeOrder(L) {
    const k = Math.min(3, 1 + ease(L, 2, 5));
    const pizza = L >= 2 && randInt(L >= 4 ? 2 : 3) === 0;
    if (pizza) {
      const tops = shuffle(SW_TOP.slice()).slice(0, Math.max(1, k - (L < 4 ? 1 : 0)));
      return { pizza: true, tops, text: `${cap(listJoin(tops.map(t => SW[t].n)))} pizza`, stages: [['base'], ['sauce'], ['mozz'], tops.slice()] };
    }
    const bread = pick(['bread-white', 'bread-brown']), fills = shuffle(SW_FILL.slice()).slice(0, k);
    return { pizza: false, bread, tops: fills, text: `${cap(listJoin(fills.map(t => SW[t].n)))} on ${SW[bread].n}`, stages: [[bread], fills.slice(), [bread]] };
  }

  function startSandwich(L, api) {
    const nOrders = L < 4 ? 3 : 4, twoAtOnce = L >= 4;
    const extra = Math.min(3, 1 + ease(L, 2, 6));
    const people = shuffle(SW_PEOPLE.slice());
    const orders = [...Array(nOrders)].map((_, i) => Object.assign(makeOrder(L), { who: people[i] }));
    let oi = 0, mistakes = 0, stage = 0, left = [], busy = false, layersN = 0;

    const wrap = el('div', 'sdw-wrap'), cust = el('div', 'sdw-cust'), bench = el('div', 'sdw-bench'), tray = el('div', 'sdw-tray');
    wrap.append(cust, bench, tray); api.stage.append(wrap);

    function custCard(o, waiting) {
      const c = el('div', 'sdw-who m1-panel' + (waiting ? ' wait' : ''));
      const face = `<span class="tile c-peach sdw-face">${o.who[0]}</span>`;
      if (waiting) c.innerHTML = `${face}<small>Next</small><b>${o.text}</b>`;
      else c.innerHTML = `${face}<span><small>${o.who[1]} would like:</small><b>${o.text}, please!</b><span class="pics">${(o.pizza ? [] : [o.bread]).concat(o.tops).map(t => SW[t].e).join('')}</span></span>`;
      c.dataset.want = JSON.stringify(o.stages);
      return c;
    }
    function begin() {
      const o = orders[oi]; stage = 0; left = o.stages[0].slice(); layersN = 0; busy = false;
      cust.innerHTML = ''; cust.append(custCard(o));
      if (twoAtOnce && orders[oi + 1]) cust.append(custCard(orders[oi + 1], true));
      bench.innerHTML = '';
      if (o.pizza) { const pz = el('div', 'sdw-pz'); bench.append(pz); }
      else { bench.append(el('div', 'sdw-plate')); bench.append(el('div', 'sdw-stack')); }
      // tray: what's needed plus a few friendly distractors
      let keys;
      if (o.pizza) {
        const dis = shuffle(SW_TOP.filter(t => !o.tops.includes(t))).slice(0, Math.max(1, Math.min(extra, 5 - o.tops.length)));
        keys = ['base', 'sauce', 'mozz'].concat(shuffle(o.tops.concat(dis)));
      } else {
        const dis = shuffle(SW_FILL.filter(t => !o.tops.includes(t))).slice(0, extra);
        keys = ['bread-white', 'bread-brown'].concat(shuffle(o.tops.concat(dis)));
      }
      tray.innerHTML = ''; tray.style.setProperty('--cols', keys.length <= 6 ? 3 : 4);
      keys.forEach(k => {
        const b = el('button', 'sdw-ing tile ' + (k.startsWith('bread') ? (k === 'bread-brown' ? 'c-orange' : 'c-card') : 'c-card'), `<span class="e">${SW[k].e}</span><span>${SW[k].short}</span>`);
        b.type = 'button'; b.dataset.ing = k; b.onclick = () => add(k, b); tray.append(b);
      });
      api.rounds(nOrders, oi);
      api.hint(o.pizza ? `Make ${o.who[1]} ${/^[aeiou]/i.test(o.text) ? 'an' : 'a'} ${o.text.toLowerCase()}. Start with the base, then sauce and cheese, then the toppings.`
        : `Make ${o.who[1]} ${o.text.toLowerCase()}. Bread first, then the filling, then bread on top.`);
    }
    function addLayer(o, k) {
      layersN++;
      if (o.pizza) {
        const pz = bench.querySelector('.sdw-pz');
        if (k === 'base') pz.append(el('div', 'base'));
        else if (k === 'sauce') pz.append(el('div', 'sauce'));
        else if (k === 'mozz') pz.append(el('div', 'cheese'));
        else {
          const t = el('div', 'top'), n = o.tops.indexOf(k), spots = PZ_SPOTS.filter((_, i) => i % o.tops.length === n);
          spots.forEach(([x, y]) => { const s = el('span', '', SW[k].pz); s.style.left = x + '%'; s.style.top = y + '%'; t.append(s); });
          pz.append(t);
        }
      } else {
        const st = bench.querySelector('.sdw-stack');
        const l = el('div', 'sdw-l ' + SW[k].layer + (k.startsWith('bread') && stage === 2 ? ' top' : ''));
        st.append(l);
      }
    }
    function slideOff(k, why) {
      mistakes++; sfx.soft();
      const g = el('div', 'sdw-ghost', SW[k].e); bench.append(g); api.later(() => g.remove(), 1200);
      api.hint(why);
    }
    function add(k, b) {
      if (busy) return;
      const o = orders[oi], name = o.who[1];
      if (left.includes(k)) {
        left.splice(left.indexOf(k), 1); addLayer(o, k);
        sfx.tap(); rise(layersN * 2);
        if (!left.length) {
          stage++;
          if (stage >= o.stages.length) return serve();
          left = o.stages[stage].slice();
        }
        const nextNames = left.map(x => SW[x].n);
        api.hint(o.pizza ? `Lovely. Next: ${listJoin(nextNames)}.` : stage === 2 ? `Now the ${SW[o.bread].n} on top.` : `Lovely. Now add the ${listJoin(nextNames)}.`);
        return;
      }
      // a gentle reason why it slid off
      const inOrder = o.stages.some(s => s.includes(k));
      let why;
      if (!inOrder) {
        if (k.startsWith('bread')) why = `${name} asked for ${SW[o.bread].n}.`;
        else why = `${name} didn’t ask for ${SW[k].n}. Have another look at the order.`;
      } else if (o.pizza) why = `Not yet. First the ${listJoin(left.map(x => SW[x].n))}.`;
      else if (stage === 0) why = `Start with a slice of ${SW[o.bread].n} at the bottom.`;
      else if (stage === 1 && k === o.bread) why = `Put the ${listJoin(left.map(x => SW[x].n))} in before the top slice.`;
      else why = `That’s already on. Next: ${listJoin(left.map(x => SW[x].n))}.`;
      slideOff(k, why); wob(b);
    }
    function serve() {
      busy = true;
      const o = orders[oi], who = cust.firstChild;
      api.later(() => { (bench.querySelector('.sdw-pz') || bench.querySelector('.sdw-stack')).classList.add('sdw-served'); who.classList.add('happy'); sfx.good(); tone(1318, .12, 'sine', .1, .1); tone(1568, .2, 'sine', .1, .22); }, 450);
      api.hint(`${o.who[1]} says: “Thank you, that looks delicious!”`);
      oi++; api.rounds(nOrders, oi);
      if (oi >= nOrders) api.later(() => api.done(starsFor(mistakes, 1, 3)), 1600);
      else { api.later(() => toast(cheer()), 500); api.later(begin, 1900); }
    }
    begin();
  }

  /* =========================================================
     PICTURE SUDOKU (4×4, 2×2 boxes)
     ========================================================= */
  const PS_SETS = [['🍎', '🍌', '🍇', '🍊'], ['🌻', '🌷', '🌹', '🌼'], ['🐶', '🐱', '🐰', '🐦'], ['☕', '🍰', '🍪', '🧁'], ['⛵', '🚂', '🚗', '🎈']];
  const PS_COL = ['c-coral', 'c-sun', 'c-grape', 'c-sky'];
  const psPeers = i => { const r = i >> 2, c = i & 3, out = []; for (let j = 0; j < 16; j++) { const rr = j >> 2, cc = j & 3; if (j !== i && (rr === r || cc === c || ((rr >> 1) === (r >> 1) && (cc >> 1) === (c >> 1)))) out.push(j); } return out; };
  const PS_PEERS = [...Array(16)].map((_, i) => psPeers(i));
  function psCount(g, limit = 2) {
    const i = g.indexOf(-1); if (i < 0) return 1;
    let n = 0;
    for (let v = 0; v < 4 && n < limit; v++) {
      if (PS_PEERS[i].some(j => g[j] === v)) continue;
      g[i] = v; n += psCount(g, limit - n); g[i] = -1;
    }
    return n;
  }
  function psValid(sol) { return sol.every((v, i) => v >= 0 && !PS_PEERS[i].some(j => sol[j] === v)); }
  function psSolved() {
    // base pattern, then shuffle symbols, rows in bands, bands, columns in stacks, stacks, and maybe transpose
    let g = [...Array(16)].map((_, i) => ((i >> 2) * 2 + ((i >> 2) >> 1) + (i & 3)) % 4);
    const sym = shuffle([0, 1, 2, 3]); g = g.map(v => sym[v]);
    const band = shuffle([0, 1]), rows = [];
    band.forEach(b => shuffle([0, 1]).forEach(r => rows.push(b * 2 + r)));
    const stack = shuffle([0, 1]), cols = [];
    stack.forEach(s => shuffle([0, 1]).forEach(c => cols.push(s * 2 + c)));
    let out = [...Array(16)].map((_, i) => g[rows[i >> 2] * 4 + cols[i & 3]]);
    if (randInt(2)) out = [...Array(16)].map((_, i) => out[(i & 3) * 4 + (i >> 2)]);
    return out;
  }
  function psMake(blanks) {
    for (let tries = 0; tries < 50; tries++) {
      const sol = psSolved(); if (!psValid(sol)) continue;
      const g = sol.slice(); let removed = 0;
      for (const i of shuffle([...Array(16)].map((_, k) => k))) {
        if (removed >= blanks) break;
        const v = g[i]; g[i] = -1;
        if (psCount(g.slice()) === 1) removed++; else g[i] = v;
      }
      if (removed === blanks && psCount(g.slice()) === 1) return { sol, puz: g };
    }
    return null;
  }

  function startPicSudoku(L, api) {
    const blanks = L <= 1 ? 2 + randInt(2) : Math.min(10, 3 + ease(L, 7, 6) + (L >= 8 ? randInt(2) : 0));
    const made = psMake(blanks) || psMake(Math.min(blanks, 8));
    const { sol, puz } = made;
    const pics = PS_SETS[(L - 1 + randInt(PS_SETS.length)) % PS_SETS.length];
    const cur = puz.slice(), cells = [];
    let sel = -1, mistakes = 0, hints = 0, hintCell = -1, finished = false;
    const blanksLeft = () => cur.filter(v => v < 0).length;

    const wrap = el('div', 'psu-wrap'), board = el('div', 'psu-board');
    const boxes = [0, 1, 2, 3].map(() => { const b = el('div', 'psu-box'); board.append(b); return b; });
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const i = r * 4 + c, b = el('button', 'psu-cell'); b.type = 'button';
      boxes[(r >> 1) * 2 + (c >> 1)].append(b);
      b.onclick = () => choose(i);
      cells[i] = b;
    }
    // boxes hold their cells in reading order within each 2×2, matching the loop above
    const side = el('div', 'psu-side'), pal = el('div', 'psu-pal');
    pics.forEach((p, v) => { const b = el('button', 'tile psu-pick ' + PS_COL[v], p); b.type = 'button'; b.dataset.v = v; b.setAttribute('aria-label', 'Picture ' + (v + 1)); b.onclick = () => place(v, b); pal.append(b); });
    const hintB = btn('💡 Hint', 'c-sun', () => doHint());
    side.append(pal, hintB);
    wrap.append(board, side); api.stage.append(wrap);

    function draw() {
      cells.forEach((b, i) => {
        const v = cur[i], peer = sel >= 0 && PS_PEERS[sel].includes(i);
        b.className = 'psu-cell' + (v < 0 ? ' blank' : ' tile ' + PS_COL[v] + (puz[i] >= 0 ? ' given' : '')) + (i === sel ? ' sel' : '') + (peer ? ' peer' : '') + (i === hintCell ? ' glow' : '');
        b.textContent = v < 0 ? '' : pics[v];
        b.setAttribute('aria-label', v < 0 ? 'Empty square' : 'Picture ' + (v + 1));
      });
    }
    function firstBlank(from) { for (let k = 0; k < 16; k++) { const i = (from + k) % 16; if (cur[i] < 0) return i; } return -1; }
    function choose(i) {
      if (finished) return;
      if (cur[i] >= 0) { sfx.tap(); api.hint(puz[i] >= 0 ? 'That picture was already there. Tap an empty square.' : 'You’ve filled that one. Tap an empty square.'); return; }
      sfx.tap(); sel = i; draw();
      api.hint('Now tap the picture that belongs here. Each row, column and square has one of each.');
    }
    function place(v, pb) {
      if (finished) return;
      if (sel < 0 || cur[sel] >= 0) { sel = firstBlank(0); draw(); api.hint('First tap an empty square, then a picture.'); return; }
      const i = sel;
      if (sol[i] === v) {
        cur[i] = v; if (hintCell === i) hintCell = -1;
        rise(16 - blanksLeft()); sfx.good();
        const left = blanksLeft();
        sel = left ? firstBlank(i + 1) : -1; draw();
        cells[i].classList.add('placed');
        api.rounds(puz.filter(x => x < 0).length, puz.filter(x => x < 0).length - left);
        if (!left) return win();
        api.hint(left === 1 ? 'Just one square left!' : `Lovely! ${left} squares left. The next one is ready.`);
      } else {
        mistakes++; sfx.soft(); wob(pb);
        const r = i >> 2, c = i & 3;
        const inRow = [0, 1, 2, 3].some(k => cur[r * 4 + k] === v), inCol = [0, 1, 2, 3].some(k => cur[k * 4 + c] === v);
        api.hint(inRow ? `There’s already a ${pics[v]} in this row. Try another picture.` : inCol ? `There’s already a ${pics[v]} in this column. Try another picture.`
          : PS_PEERS[i].some(j => cur[j] === v) ? `There’s already a ${pics[v]} in this little square. Try another.` : 'That one doesn’t work out here in the end. Try another picture.');
      }
    }
    function doHint() {
      if (finished) return;
      sfx.tap(); hints++;
      // pick the blank with fewest possibilities (often only one fits)
      let best = -1, bc = 9;
      cur.forEach((v, i) => { if (v >= 0) return; const n = [0, 1, 2, 3].filter(x => !PS_PEERS[i].some(j => cur[j] === x)).length; if (n < bc) { bc = n; best = i; } });
      if (hintCell === best) { // second press: fill it in
        cur[best] = sol[best]; hintCell = -1; sel = firstBlank(best + 1); draw(); cells[best].classList.add('placed'); sfx.good();
        const left = blanksLeft(); api.rounds(puz.filter(x => x < 0).length, puz.filter(x => x < 0).length - left);
        if (!left) return win();
        api.hint('I’ve popped that one in for you.'); return;
      }
      hintCell = best; sel = best; draw();
      api.hint(bc === 1 ? 'Only one picture fits in the glowing square. Look along its row and column. Tap Hint again and I’ll fill it in.' : 'Try the glowing square. Tap Hint again and I’ll fill it in.');
    }
    function win() {
      finished = true; sel = -1; draw();
      api.hint('Every row, column and square is complete. Beautiful!');
      cells.forEach((b, i) => api.later(() => { b.classList.add('win'); tone(523 + i * 40, .1, 'triangle', .07); }, 60 * i));
      api.later(() => api.done(starsFor(mistakes + hints, 1, 3)), 1300);
    }
    api.rounds(puz.filter(x => x < 0).length, 0);
    sel = firstBlank(0); draw();
    api.hint('Fill the empty squares so each row, column and little square has one of each picture. Tap a square, then a picture.');
  }

  /* =========================================================
     LAUNDRY DAY
     ========================================================= */
  let svgId = 0;
  function patDef(pat, fill) {
    if (!pat) return ['', fill];
    const id = 'm1p' + (++svgId);
    const body = pat === 'stripes' ? `<rect width="10" height="10" fill="${fill}"/><rect width="10" height="4" fill="rgba(255,255,255,.75)"/>`
      : pat === 'dots' ? `<rect width="10" height="10" fill="${fill}"/><circle cx="5" cy="5" r="2.2" fill="rgba(255,255,255,.85)"/>`
      : pat === 'lace' ? `<rect width="10" height="10" fill="${fill}"/><circle cx="5" cy="5" r="3" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="1"/><circle cx="0" cy="0" r="1.2" fill="rgba(255,255,255,.9)"/><circle cx="10" cy="10" r="1.2" fill="rgba(255,255,255,.9)"/>`
      : `<rect width="10" height="10" fill="${fill}"/><path d="M0 10 L10 0" stroke="rgba(0,0,0,.18)" stroke-width="3"/>`;
    return [`<defs><pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse">${body}</pattern></defs>`, `url(#${id})`];
  }
  const CLOTH_PATHS = {
    tshirt: 'M30 14 L42 9 Q50 18 58 9 L70 14 L92 32 L81 45 L70 37 L70 91 L30 91 L30 37 L19 45 L8 32 Z',
    shirt: 'M30 12 L42 8 L50 16 L58 8 L70 12 L92 30 L82 42 L70 34 L70 92 L30 92 L30 34 L18 42 L8 30 Z',
    jumper: 'M30 12 L42 8 Q50 15 58 8 L70 12 L90 60 L78 66 L70 40 L70 92 L30 92 L30 40 L22 66 L10 60 Z',
    trousers: 'M27 8 H73 L79 93 H57 L50 38 L43 93 H21 Z',
    dress: 'M38 8 L44 8 Q50 16 56 8 L62 8 L61 32 L84 92 H16 L39 32 Z',
    vest: 'M34 8 H42 Q50 24 58 8 H66 L67 30 Q73 35 73 42 V92 H27 V42 Q27 35 33 30 Z',
    towel: 'M14 12 H86 V88 H14 Z',
    pillow: 'M10 24 Q50 18 90 24 Q94 50 90 76 Q50 82 10 76 Q6 50 10 24 Z',
    scarf: 'M10 30 Q30 20 50 30 T90 30 L90 46 Q70 36 50 46 T10 46 Z M66 44 L78 92 L66 92 L58 48 Z',
    blouse: 'M32 12 L43 9 Q50 20 57 9 L68 12 L88 34 L80 44 L68 36 L68 84 Q59 92 50 86 Q41 92 32 84 L32 36 L20 44 L12 34 Z'
  };
  function clothSVG(type, fill, pat, stroke = 'rgba(0,0,0,.35)') {
    const [defs, f] = patDef(pat, fill);
    let extra = '';
    if (type === 'shirt') extra = `<path d="M42 8 L50 22 L58 8" fill="none" stroke="${stroke}" stroke-width="2.5"/><g fill="${stroke}"><circle cx="50" cy="34" r="2"/><circle cx="50" cy="50" r="2"/><circle cx="50" cy="66" r="2"/><circle cx="50" cy="82" r="2"/></g>`;
    if (type === 'jumper') extra = `<path d="M30 86 H70 M74 60 L84 56" stroke="${stroke}" stroke-width="3" fill="none"/>`;
    if (type === 'towel') extra = `<rect x="14" y="20" width="72" height="6" fill="rgba(0,0,0,.15)"/><rect x="14" y="74" width="72" height="6" fill="rgba(0,0,0,.15)"/>`;
    if (type === 'trousers') extra = `<path d="M27 16 H73" stroke="${stroke}" stroke-width="2.5"/>`;
    if (type === 'blouse' || type === 'scarf') extra = `<g fill="#fff" opacity=".9">${[20, 32, 44, 56, 68, 80].map(x => `<circle cx="${x}" cy="${type === 'scarf' ? 34 : 50}" r="2.2"/>`).join('')}</g>`;
    return `<svg viewBox="0 0 100 100" aria-hidden="true">${defs}<path d="${CLOTH_PATHS[type]}" fill="${f}" stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round"/>${extra}</svg>`;
  }
  function foldedSVG(fill, pat) {
    const [defs, f] = patDef(pat, fill);
    return `<svg viewBox="0 0 100 80" class="done" aria-hidden="true">${defs}<rect x="16" y="22" width="68" height="44" rx="6" fill="${f}" stroke="rgba(0,0,0,.35)" stroke-width="2.5"/><path d="M16 38 H84" stroke="rgba(0,0,0,.25)" stroke-width="2.5"/><rect x="16" y="14" width="68" height="12" rx="5" fill="${f}" stroke="rgba(0,0,0,.35)" stroke-width="2.5"/></svg>`;
  }
  function sockSVG(fill, pat, heel) {
    const [defs, f] = patDef(pat, fill);
    return `<svg viewBox="0 0 80 92" aria-hidden="true">${defs}<path d="M24 6 H52 V50 Q52 58 58 62 L70 70 Q78 78 72 86 Q66 92 56 86 L32 72 Q22 66 24 54 Z" fill="${f}" stroke="rgba(0,0,0,.4)" stroke-width="2.5" stroke-linejoin="round"/>
      <rect x="24" y="6" width="28" height="10" rx="3" fill="${heel}" stroke="rgba(0,0,0,.4)" stroke-width="2.5"/>
      <path d="M58 62 Q76 70 72 86 Q66 92 56 86 Z" fill="${heel}" opacity=".95"/></svg>`;
  }
  const BASKET_SVG = c => `<svg viewBox="0 0 100 76" aria-hidden="true"><path d="M8 26 H92 L82 72 H18 Z" fill="${c}" stroke="rgba(0,0,0,.35)" stroke-width="3"/><path d="M14 38 H86 M16 50 H84 M18 62 H82" stroke="rgba(0,0,0,.2)" stroke-width="3"/><path d="M28 26 Q50 2 72 26" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="4"/></svg>`;
  const LD_WHITES = [['tshirt', 'white T-shirt'], ['shirt', 'white shirt'], ['vest', 'white vest'], ['towel', 'white towel'], ['pillow', 'white pillowcase']];
  const LD_COLOURS = [['jumper', 'red jumper', '#E8483A', ''], ['trousers', 'blue trousers', '#3C6FD1', ''], ['tshirt', 'green T-shirt', '#3CB15F', ''], ['dress', 'yellow dress', '#FFC234', 'dots'],
    ['towel', 'striped towel', '#F25A95', 'stripes'], ['shirt', 'orange shirt', '#FF8A2A', ''], ['jumper', 'purple jumper', '#8E63E0', ''], ['tshirt', 'stripy top', '#2E9BD6', 'stripes']];
  const LD_DELICATE = [['scarf', 'silk scarf', '#F7A6C4', 'lace'], ['blouse', 'lace blouse', '#F3D9E8', 'lace'], ['dress', 'silk nightie', '#BFA6F0', 'lace'], ['blouse', 'satin top', '#9ED8E8', 'lace']];
  const LD_SOCKS = [['#E8483A', '', '#fff'], ['#3C6FD1', '', '#FFC234'], ['#3CB15F', 'stripes', '#1F8C46'], ['#FFC234', 'dots', '#C28A00'], ['#8E63E0', '', '#fff'],
    ['#E8483A', 'stripes', '#C4432A'], ['#3C6FD1', 'dots', '#1D70C0'], ['#F25A95', '', '#AE2A5F'], ['#FF8A2A', 'stripes', '#C46512'], ['#3CB15F', 'dots', '#fff']];

  function startLaundry(L, api) {
    const nSort = 4 + ease(L, 4, 6), useDel = L >= 3, nFold = 2 + ease(L, 2, 6), nPairs = Math.min(6, 2 + ease(L, 4, 7));
    let mistakes = 0;
    // a pile with at least one of each kind
    const kinds = useDel ? ['w', 'c', 'd'] : ['w', 'c'];
    const pile = [];
    const src = { w: shuffle(LD_WHITES.slice()), c: shuffle(LD_COLOURS.slice()), d: shuffle(LD_DELICATE.slice()) };
    const take = k => { const a = src[k], x = a.shift(); a.push(x); return k === 'w' ? { k, type: x[0], name: x[1], fill: '#FFFFFF', pat: '' } : { k, type: x[0], name: x[1], fill: x[2], pat: x[3] }; };
    kinds.forEach(k => pile.push(take(k)));
    while (pile.length < nSort) pile.push(take(L >= 3 && randInt(5) === 0 ? 'd' : randInt(2) ? 'w' : 'c'));
    shuffle(pile);
    const BK = { w: ['⚪ Whites', '#F4F4F4', 'c-card'], c: ['🌈 Colours', '#F7B267', 'c-sun'], d: ['🎀 Delicates', '#F7C6D9', 'c-rose'] };
    const KIND_WORD = { w: 'white, so it goes in Whites', c: 'colourful, so it goes in Colours', d: 'delicate, so it goes in Delicates' };
    const phases = 3;

    /* ---- 1. sort ---- */
    function sortPhase() {
      api.rounds(phases, 0); api.stage.innerHTML = '';
      const wrap = el('div', 'lnd-wrap'), spot = el('div'), leftP = el('p', 'lnd-left'), baskets = el('div', 'lnd-baskets');
      const counts = { w: 0, c: 0, d: 0 };
      const bBtns = {};
      kinds.forEach(k => {
        const b = el('button', 'lnd-bask tile ' + BK[k][2], `${BASKET_SVG(BK[k][1])}<span>${BK[k][0]}</span><span class="n">0</span>`);
        b.type = 'button'; b.dataset.k = k; b.onclick = () => drop(k, b); baskets.append(b); bBtns[k] = b;
      });
      wrap.append(spot, leftP, baskets); api.stage.append(wrap);
      let idx = 0, card = null, busy = false;
      function show() {
        const it = pile[idx];
        card = el('div', 'lnd-item m1-panel', `${clothSVG(it.type, it.fill, it.pat)}<b>${it.name}</b>`); card.dataset.k = it.k;
        spot.innerHTML = ''; spot.append(card);
        leftP.textContent = `${pile.length - idx} in the pile`;
        api.hint(idx === 0 ? `Sort the washing. Which basket does the ${it.name} go in? Tap the basket.` : `And the ${it.name}?`);
      }
      function drop(k, b) {
        if (busy || idx >= pile.length) return;
        const it = pile[idx];
        if (k !== it.k) { mistakes++; sfx.soft(); wob(card); api.hint(`The ${it.name} is ${KIND_WORD[it.k]}.`); return; }
        busy = true; counts[k]++; b.querySelector('.n').textContent = counts[k]; sfx.good(); rise(idx * 2);
        const i = kinds.indexOf(k); card.style.setProperty('--fx', ((i - (kinds.length - 1) / 2) * 110) + 'px'); card.classList.add('fly');
        b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
        idx++;
        api.later(() => { busy = false; if (idx < pile.length) show(); else { toast('All sorted!'); api.hint('All sorted. Into the wash it goes!'); api.later(foldPhase, 1200); } }, 520);
      }
      show();
    }

    /* ---- 2. fold ---- */
    function foldPhase() {
      api.rounds(phases, 1); api.stage.innerHTML = '';
      const foldable = pile.filter(p => ['tshirt', 'shirt', 'jumper', 'towel', 'trousers', 'blouse', 'dress'].includes(p.type));
      const items = shuffle(foldable.slice()).slice(0, nFold);
      while (items.length < nFold) items.push(Object.assign({}, pick(LD_COLOURS).reduce((a, v, j) => (a[['type', 'name', 'fill', 'pat'][j]] = v, a), {})));
      const wrap = el('div', 'lnd-wrap'), table = el('div', 'lnd-table'); table.style.setProperty('--cols', items.length <= 2 ? 2 : items.length === 3 ? 3 : 2);
      let folded = 0;
      items.forEach(it => {
        const svg = clothSVG(it.type, it.fill, it.pat);
        const b = el('button', 'lnd-cloth', `<div class="fl"><div class="a">${svg}</div><div class="b">${svg}</div></div><small>${it.name}</small>`); b.type = 'button';
        b.onclick = () => {
          if (b.dataset.f) return; b.dataset.f = '1';
          sfx.tap(); b.classList.add('f1'); tone(440, .08, 'triangle', .08);
          api.later(() => { b.classList.add('f2'); tone(587, .1, 'triangle', .08); }, 380);
          api.later(() => {
            b.querySelector('.fl').outerHTML = foldedSVG(it.fill, it.pat);
            folded++; sfx.good(); rise(folded * 2);
            if (folded === items.length) { api.hint('Neatly folded. Now for the socks!'); toast(cheer()); api.later(sockPhase, 1300); }
            else api.hint(`Lovely and neat. ${items.length - folded} more to fold.`);
          }, 950);
        };
        table.append(b);
      });
      wrap.append(table); api.stage.append(wrap);
      api.hint('The washing is dry. Tap each one to fold it.');
    }

    /* ---- 3. pair the socks ---- */
    function sockPhase() {
      api.rounds(phases, 2); api.stage.innerHTML = '';
      // at higher levels use look-alike socks (same colour, different pattern)
      let designs = shuffle(LD_SOCKS.map((s, i) => i));
      if (L >= 6) { const sim = [0, 5, 1, 6, 2, 9, 3]; designs = sim.concat(designs.filter(i => !sim.includes(i))); }
      designs = designs.slice(0, nPairs);
      const socks = shuffle(designs.flatMap(d => [{ d, f: false }, { d, f: true }]));
      const wrap = el('div', 'lnd-wrap'), done = el('div', 'lnd-pairs'), grid = el('div', 'lnd-socks');
      grid.style.setProperty('--cols', socks.length <= 4 ? 4 : socks.length <= 6 ? 3 : 4);
      let sel = null, pairs = 0, misses = 0;
      const btns = socks.map(s => {
        const [fill, pat, heel] = LD_SOCKS[s.d];
        const b = el('button', 'lnd-sock tile c-card' + (s.f ? ' flip' : ''), sockSVG(fill, pat, heel)); b.type = 'button'; b.dataset.p = s.d;
        b.onclick = () => {
          if (b.classList.contains('gone')) return;
          if (!sel) { sel = b; b.classList.add('sel'); sfx.tap(); api.hint('Now tap the sock that matches it.'); return; }
          if (sel === b) { b.classList.remove('sel'); sel = null; sfx.tap(); api.hint('Tap a sock, then its partner.'); return; }
          const a = sel; sel = null; a.classList.remove('sel');
          if (a.dataset.p === b.dataset.p) {
            a.classList.add('gone'); b.classList.add('gone'); pairs++; sfx.good(); rise(pairs * 2);
            grid.querySelectorAll('.hintme').forEach(x => x.classList.remove('hintme'));
            done.insertAdjacentHTML('beforeend', sockSVG(fill, pat, heel) + sockSVG(fill, pat, heel));
            if (pairs === designs.length) { api.hint('Every sock has its partner. Laundry done!'); api.later(() => api.done(starsFor(mistakes, 1, 3)), 1100); }
            else api.hint(`A pair! ${designs.length - pairs} more to match.`);
          } else {
            mistakes++; misses++; sfx.soft(); wob(a); wob(b);
            api.hint('Those two don’t match. Look at the colour and the pattern.');
            if (misses >= 2) { // quietly help
              const p = btns.find(x => !x.classList.contains('gone')).dataset.p;
              btns.filter(x => x.dataset.p === p && !x.classList.contains('gone')).forEach(x => x.classList.add('hintme'));
              misses = 0;
            }
          }
        };
        grid.append(b); return b;
      });
      wrap.append(grid, done); api.stage.append(wrap);
      api.hint('Pair up the socks. Tap a sock, then the one that matches it.');
    }
    sortPhase();
  }
})();
