/* Recall: Gentle Games (made with people living with dementia in mind).
   Picture-led, conversational, no failure, generous stars. Every level is generated fresh,
   difficulty rises gently and plateaus at a sensible cap. */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor, store } = R;

  const mkBtn = (label, cls, fn) => { const b = el('button', 'btn ' + cls, label); b.type = 'button'; if (fn) b.onclick = fn; return b; };
  const finisher = api => { let d = false; return s => { if (d) return; d = true; api.done(Math.max(1, Math.min(3, s))); }; };
  const lvl = L => Math.max(1, Math.floor(+L || 1));

  R.css(`
.gt-wrap{max-width:720px;margin:0 auto;display:grid;gap:22px}
.gt-row{display:flex;flex-wrap:wrap;justify-content:center;gap:14px}
.gt-panel{background:var(--card);color:var(--ink);border-radius:26px;padding:20px;box-shadow:0 7px 0 var(--card-edge),0 14px 26px rgba(0,0,0,.28)}
.gt-label{font:600 1.3rem/1.25 var(--display);color:var(--ink-soft);text-align:center;margin:0}
.gt-small{font-size:1.25rem;color:var(--on-table-soft);text-align:center;margin:0}
.gt-bigbtn{font-size:1.4rem!important;min-height:76px!important;padding:.7em 1.4em!important}
.gt-pop{animation:gt-bounce .5s cubic-bezier(.3,1.6,.5,1)}
.gt-chip{display:inline-block;font:600 1.25rem var(--display);background:var(--peach);color:var(--ink);padding:.2em .9em;border-radius:999px}
@keyframes gt-bounce{0%{transform:scale(.6)}60%{transform:scale(1.12)}100%{transform:scale(1)}}
@keyframes gt-glowk{0%,100%{outline-color:rgba(255,194,52,1)}50%{outline-color:rgba(255,255,255,.9)}}
@keyframes gt-flipk{from{transform:rotateY(90deg)}to{transform:none}}
@keyframes gt-float{0%,100%{translate:0 0}50%{translate:0 -8px}}

/* Picture Match */
.gt-ref{display:grid;justify-items:center;gap:6px;padding:16px 20px 20px}
.gt-big{font-size:clamp(5rem,26vw,8rem);line-height:1.1}
.gt-opts{display:grid;grid-template-columns:repeat(var(--cols),1fr);gap:clamp(12px,3vw,20px);max-width:calc(var(--cols) * 160px);margin:0 auto;width:100%}
.gt-opt{aspect-ratio:1;font-size:clamp(3.4rem,15vw,5.2rem);cursor:pointer;border-radius:24px;padding:0;line-height:1;transition:opacity .25s}
.gt-opt.gt-right{--c:var(--good-bg);--d:var(--leaf-d)}
.gt-opt.gt-nope{opacity:.35}

/* Jigsaw */
.gt-jtop{display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap}
.gt-thumb{width:112px;flex:none;aspect-ratio:4/3;border-radius:12px;background-size:100% 100%;box-shadow:0 0 0 4px #fff,0 8px 16px rgba(0,0,0,.3)}
.gt-jboard{position:relative;width:100%;max-width:640px;margin:0 auto;aspect-ratio:4/3;display:grid;grid-template-columns:repeat(var(--cols),1fr);grid-template-rows:repeat(var(--rows),1fr);border-radius:18px;background:var(--card);box-shadow:0 7px 0 var(--card-edge),0 14px 26px rgba(0,0,0,.3)}
.gt-jguide{position:absolute;inset:0;border-radius:18px;background-size:100% 100%;opacity:.3;pointer-events:none}
.gt-piece{position:relative;border:0;padding:0;cursor:pointer;background-size:calc(var(--cols) * 100%) calc(var(--rows) * 100%);border-radius:12px;transform:scale(.86);
  box-shadow:0 0 0 3px #fff,0 6px 0 rgba(0,0,0,.25),0 10px 16px rgba(0,0,0,.3);transition:transform .2s cubic-bezier(.3,1.5,.5,1)}
.gt-piece.gt-sel{transform:scale(.95) translateY(-6px);box-shadow:0 0 0 6px var(--sun),0 12px 18px rgba(0,0,0,.4);z-index:2}
.gt-piece.gt-lock{transform:none;border-radius:0;box-shadow:none;cursor:default}
.gt-piece.gt-new{animation:gt-lockb .6s cubic-bezier(.3,1.6,.5,1);z-index:3}
.gt-piece.gt-moved{animation:gt-bounce .35s}
.gt-piece.gt-target{outline:6px solid var(--sun);outline-offset:-6px;animation:gt-glowk 1s infinite}
.gt-jboard.gt-whole .gt-piece{transform:none;border-radius:0;box-shadow:none}
@keyframes gt-lockb{0%{transform:scale(.86)}50%{transform:scale(1.12)}100%{transform:scale(1)}}

/* Sing-Along Bingo */
.gt-sbar{display:flex;flex-wrap:wrap;justify-content:center;gap:14px}
.gt-sbar .btn{font-size:1.3rem;min-height:68px}
.gt-sbar .btn[disabled]{opacity:.45;pointer-events:none}
.gt-notes{text-align:center;font-size:2rem;min-height:1.3em;line-height:1.3;margin:-8px 0}
.gt-notes span{display:inline-block;animation:gt-float 1s infinite}
.gt-notes span:nth-child(2){animation-delay:.25s}.gt-notes span:nth-child(3){animation-delay:.5s}
.gt-bingo{display:grid;grid-template-columns:repeat(var(--cols),1fr);gap:clamp(10px,2.5vw,16px);max-width:calc(var(--cols) * 210px);margin:0 auto;width:100%}
.gt-song{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:124px;padding:10px 6px;border-radius:20px;cursor:pointer;
  font:600 1.25rem/1.12 var(--display);text-align:center;hyphens:manual}
.gt-song .gt-se{font-size:clamp(2.4rem,10vw,3.4rem);line-height:1}
.gt-song.gt-marked{--c:var(--good-bg);--d:var(--leaf-d)}
.gt-song.gt-marked::after{content:"✓";position:absolute;right:6px;top:2px;font:700 2.4rem var(--display);color:var(--leaf-d);animation:gt-bounce .5s}
.gt-song.gt-glow{outline:6px solid var(--sun);outline-offset:4px;animation:gt-glowk 1s infinite}
.gt-song.gt-line{outline:6px solid #fff;outline-offset:4px}

/* Picture Dominoes */
.gt-ends{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;font:600 1.35rem var(--display)}
.gt-endpic{width:78px;height:78px;font-size:3rem;border-radius:20px}
.gt-chain{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:10px 8px;padding:16px 10px;border-radius:24px;background:rgba(0,0,0,.18);box-shadow:inset 0 4px 10px rgba(0,0,0,.2);min-height:100px}
.gt-dom{--s:46px;display:inline-flex;align-items:center;position:relative;padding:5px;border:0;border-radius:calc(var(--s) * .3);color:var(--ink);
  background:linear-gradient(160deg,#FFFFFF,#F1E7D3);box-shadow:inset 0 -5px 0 rgba(0,0,0,.08),inset 0 2px 0 #fff,0 6px 0 #BFAE8C,0 10px 16px rgba(0,0,0,.32)}
.gt-dom .gt-h{display:grid;place-items:center;width:var(--s);height:var(--s);font-size:calc(var(--s) * .66);line-height:1;border-radius:10px}
.gt-dom .gt-h + .gt-h{border-left:3px solid #D5C6A8}
.gt-dom::after{content:"";position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#FFE9A8,#C28A00)}
.gt-dom .gt-h.gt-open{background:rgba(255,194,52,.4);box-shadow:inset 0 0 0 3px var(--sun-d)}
.gt-hand{display:flex;flex-wrap:wrap;justify-content:center;gap:20px 16px}
.gt-hand .gt-dom{--s:clamp(56px,16vw,72px);cursor:pointer;transition:transform .08s}
.gt-hand .gt-dom:active{transform:translateY(4px)}
.gt-dom.gt-in{animation:gt-bounce .5s}
.gt-dom.gt-help{outline:5px solid var(--sun);outline-offset:4px;animation:gt-glowk 1s infinite}

/* Photo Pairs */
.gt-ppgrid{display:grid;grid-template-columns:repeat(var(--cols),1fr);gap:clamp(10px,2.5vw,16px);max-width:calc(var(--cols) * 170px);margin:0 auto;width:100%}
.gt-pc{aspect-ratio:1;perspective:900px;background:none;border:0;padding:0;cursor:pointer;transition:transform .15s}
.gt-pin{position:relative;display:block;width:100%;height:100%;transition:transform .5s cubic-bezier(.3,1.3,.5,1);transform-style:preserve-3d}
.gt-pc.gt-down .gt-pin{transform:rotateY(180deg)}
.gt-face,.gt-back{position:absolute;inset:0;border-radius:18px;backface-visibility:hidden;-webkit-backface-visibility:hidden;display:grid;place-items:center;overflow:hidden;
  box-shadow:inset 0 -6px 0 rgba(0,0,0,.12),0 6px 0 var(--d),0 10px 16px rgba(0,0,0,.25)}
.gt-face{--d:var(--card-edge);background:var(--card);font-size:clamp(2.4rem,11vw,4rem);padding:7px}
.gt-face img{width:100%;height:100%;object-fit:cover;border-radius:12px;display:block}
.gt-back{--d:var(--berry-d);transform:rotateY(180deg);color:#fff;font-size:2.2rem;
  background:radial-gradient(circle,rgba(255,255,255,.5) 0 16%,transparent 17%),repeating-linear-gradient(45deg,rgba(255,255,255,.18) 0 10px,transparent 10px 20px),var(--berry)}
.gt-pc.gt-sel{transform:translateY(-6px)}
.gt-pc.gt-sel .gt-face{box-shadow:0 0 0 6px var(--sun),0 6px 0 var(--d),0 12px 18px rgba(0,0,0,.35)}
.gt-pc.gt-done{cursor:default}
.gt-pc.gt-done .gt-face{--d:var(--leaf-d);background:var(--good-bg);animation:gt-bounce .45s}
.gt-pc.gt-done .gt-face::after{content:"✓";position:absolute;right:6px;top:6px;width:36px;height:36px;display:grid;place-items:center;border-radius:50%;background:var(--leaf);color:#fff;font:700 1.4rem var(--display)}
.gt-thumbs{display:flex;flex-wrap:wrap;justify-content:center;gap:12px}
.gt-thumbs img{width:76px;height:76px;object-fit:cover;border-radius:14px;box-shadow:0 0 0 3px #fff,0 6px 12px rgba(0,0,0,.3)}
.gt-preview{font-size:clamp(2.6rem,11vw,3.4rem);letter-spacing:.1em;text-align:center;line-height:1.2}

/* Snap Together */
.gt-table{display:flex;justify-content:center;align-items:flex-end;gap:clamp(14px,5vw,40px)}
.gt-spot{display:grid;justify-items:center;gap:8px;font:600 1.25rem var(--display);color:var(--on-table-soft)}
.gt-scard{width:clamp(136px,40vw,210px);aspect-ratio:3/4;display:grid;place-items:center;border-radius:22px;font-size:clamp(4rem,19vw,6.4rem);line-height:1}
.gt-scard.gt-last{width:clamp(110px,31vw,170px);font-size:clamp(3.2rem,15vw,5rem)}
.gt-empty{width:clamp(110px,31vw,170px);aspect-ratio:3/4;border-radius:22px;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 4px rgba(255,255,255,.3)}
.gt-empty.gt-bigempty{width:clamp(136px,40vw,210px)}
.gt-scard.gt-flip{animation:gt-flipk .45s ease-out}
.gt-scard.gt-snapped{--c:var(--good-bg);--d:var(--leaf-d);animation:gt-bounce .5s}
.gt-snapbtn{font-size:clamp(2rem,8vw,2.6rem)!important;min-height:96px!important;min-width:min(100%,240px)}
.gt-deck{text-align:center;font:600 1.3rem var(--display);margin:0}

/* Talk About It */
.gt-themes{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,150px),1fr));gap:16px}
.gt-theme{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:16px 8px;min-height:132px;font:600 1.3rem/1.15 var(--display);border-radius:22px;cursor:pointer;text-align:center}
.gt-theme span{font-size:3rem;line-height:1}
.gt-talk{display:grid;gap:14px;justify-items:center;text-align:center}
.gt-talk .gt-big{animation:gt-bounce .6s}
.gt-talk h3{font-size:clamp(1.7rem,6vw,2.3rem)}
.gt-qs{list-style:none;margin:0;padding:0;display:grid;gap:12px;width:100%}
.gt-qs li{background:#fff;border-radius:20px;padding:14px 18px;font:400 clamp(1.25rem,4.4vw,1.45rem)/1.4 var(--body);text-align:left;box-shadow:0 4px 0 var(--card-edge)}
.gt-qs li::before{content:"💬";margin-right:.45em}

/* Colour In */
.gt-cwrap{display:grid;gap:18px;max-width:560px;margin:0 auto}
.gt-svgbox{background:#fff;border-radius:26px;padding:10px;box-shadow:0 7px 0 var(--card-edge),0 14px 26px rgba(0,0,0,.28)}
.gt-svgbox svg{display:block;width:100%;height:auto;touch-action:manipulation}
.gt-rg{stroke:#1B2730;stroke-width:5;stroke-linejoin:round;cursor:pointer;transition:fill .25s}
.gt-ln{fill:none;stroke:#1B2730;stroke-width:5;stroke-linecap:round;pointer-events:none}
.gt-sw{display:flex;flex-wrap:wrap;justify-content:center;gap:12px}
.gt-swatch{width:60px;height:60px;border-radius:30%;cursor:pointer;font:700 1.6rem var(--display);color:var(--ink);text-shadow:0 0 4px #fff,0 0 2px #fff;transition:transform .12s}
.gt-swatch.gt-on{transform:translateY(-6px) scale(1.1);outline:5px solid #fff;outline-offset:3px}
.gt-cname{text-align:center;font:600 1.3rem var(--display);margin:0}
`);

  /* =========================================================
     1. PICTURE MATCH
     ========================================================= */
  const MATCH = [
    { name: 'In the garden', groups: [
      ['🌻 sunflower', '🌼 daisy', '🌸 blossom', '🌺 hibiscus', '🌷 tulip', '🌹 rose'],
      ['🌳 tree', '🌲 fir tree', '🌴 palm tree', '🌵 cactus'],
      ['🐝 bee', '🐞 ladybird', '🦋 butterfly', '🐛 caterpillar', '🐌 snail'],
      ['🍎 apple', '🍏 green apple', '🍐 pear', '🍅 tomato', '🍓 strawberry']] },
    { name: 'Pets', groups: [
      ['🐶 puppy', '🐕 dog', '🐩 poodle', '🦮 guide dog'],
      ['🐱 kitten', '🐈 cat', '🐯 tiger', '🦁 lion'],
      ['🐦 bird', '🐤 little chick', '🐥 baby chick', '🦜 parrot'],
      ['🐟 fish', '🐠 tropical fish', '🐡 blowfish', '🐢 tortoise'],
      ['🐰 rabbit', '🐇 bunny', '🐹 hamster', '🐭 mouse']] },
    { name: 'In the kitchen', groups: [
      ['☕ cup of coffee', '🍵 cup of tea', '🫖 teapot', '🥛 glass of milk'],
      ['🍞 loaf of bread', '🥐 croissant', '🥖 French stick', '🥯 bagel'],
      ['🍰 slice of cake', '🧁 cupcake', '🎂 birthday cake', '🍪 biscuit'],
      ['🍳 frying pan', '🥘 pan of stew', '🍲 pot of soup', '🥣 bowl'],
      ['🥄 spoon', '🍴 knife and fork', '🥢 chopsticks', '🍽️ dinner plate']] },
    { name: 'At the seaside', groups: [
      ['🐚 shell', '🦀 crab', '🦞 lobster', '🦐 prawn'],
      ['⛵ sailing boat', '🚤 speedboat', '🛶 canoe', '🚢 ship'],
      ['🏖️ beach', '🏝️ island', '⛱️ beach umbrella', '🌊 wave'],
      ['🍦 ice cream', '🍧 ice treat', '🍨 bowl of ice cream', '🍭 lollipop'],
      ['🐳 whale', '🐬 dolphin', '🦭 seal', '🐙 octopus']] }
  ];
  const parsePic = s => { const i = s.indexOf(' '); return { e: s.slice(0, i), n: s.slice(i + 1) }; };

  function startMatch(L0, api) {
    const L = lvl(L0), total = 6, done = finisher(api);
    const nOpt = L <= 1 ? 2 : L <= 3 ? 3 : 4;
    // how alike the options are: 0 = different themes, 1 = same theme, 2 = very alike. Plateaus at level 7.
    const alike = r => L <= 2 ? 0 : L <= 4 ? 1 : L <= 6 ? (r % 2 ? 2 : 1) : 2;
    const themes = shuffle(MATCH.slice());
    let round = 0, mistakes = 0, last = '';
    const root = el('div', 'gt-wrap'); api.stage.append(root);
    function make(theme, mode) {
      const g = pick(theme.groups);
      let ans; do ans = pick(g); while (ans === last && g.length > 1); last = ans;
      let pool;
      if (mode === 0) pool = MATCH.filter(t => t !== theme).flatMap(t => t.groups.map(gr => pick(gr)));
      else if (mode === 1) pool = theme.groups.filter(x => x !== g).map(gr => pick(gr));
      else pool = g.filter(x => x !== ans);
      shuffle(pool);
      const opts = [ans];
      for (const p of pool) { if (opts.length >= nOpt) break; if (!opts.some(o => parsePic(o).e === parsePic(p).e)) opts.push(p); }
      return { ans, opts: shuffle(opts) };
    }
    function show() {
      api.rounds(total, round); root.innerHTML = '';
      const theme = themes[round % themes.length], q = make(theme, alike(round)), a = parsePic(q.ans);
      api.hint('Look at the big picture. Tap the one that is the same.');
      const ref = el('div', 'gt-panel gt-ref', `<span class="gt-chip">${theme.name}</span><div class="gt-big" aria-label="${a.n}">${a.e}</div><p class="gt-label">Find this one</p>`);
      const grid = el('div', 'gt-opts'); grid.style.setProperty('--cols', q.opts.length === 3 ? 3 : 2);
      let solved = false;
      q.opts.forEach(o => {
        const p = parsePic(o), b = el('button', 'tile c-card gt-opt', p.e); b.type = 'button'; b.setAttribute('aria-label', p.n);
        b.onclick = () => {
          if (solved || b.classList.contains('gt-nope')) return;
          if (o === q.ans) {
            solved = true; b.classList.add('gt-right', 'gt-pop'); sfx.good();
            ref.querySelector('.gt-big').classList.add('gt-pop');
            ref.querySelector('.gt-label').textContent = `Yes, the ${a.n}!`;
            api.hint(`${cheer()} They match.`); round++;
            api.later(() => { if (round === total) { api.rounds(total, round); done(starsFor(mistakes, 3, 8)); } else show(); }, 1700);
          } else { mistakes++; b.classList.add('gt-nope'); wob(b); sfx.soft(); toast('Not that one. Have another look.'); }
        };
        grid.append(b);
      });
      root.append(ref, grid);
    }
    show();
  }

  /* =========================================================
     2. JIGSAW (a fresh random scene every time)
     ========================================================= */
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  function paintScene(W, H) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const rnd = (a, b) => a + Math.random() * (b - a);
    const emoji = (e, X, Y, s) => { x.font = `${s}px ${EMOJI_FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e, X, Y); };
    const circle = (X, Y, r, c) => { x.beginPath(); x.arc(X, Y, r, 0, Math.PI * 2); x.fillStyle = c; x.fill(); };
    const mood = pick(['day', 'day', 'sunset', 'spring']);
    const skies = { day: ['#3FA9F5', '#CDEFFF'], sunset: ['#FF8E6B', '#FFE3A3'], spring: ['#7CC8FF', '#F4F9D9'] };
    const g = x.createLinearGradient(0, 0, 0, H * .65); g.addColorStop(0, skies[mood][0]); g.addColorStop(1, skies[mood][1]);
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const sunLeft = Math.random() < .5, sx = sunLeft ? rnd(.1, .2) * W : rnd(.8, .9) * W, sy = rnd(.12, .2) * H;
    // rainbow
    if (Math.random() < .8) {
      const rx = sunLeft ? rnd(.6, .75) * W : rnd(.25, .4) * W, ry = H * .66, R0 = W * rnd(.3, .4), bw = W * .022;
      ['#FF5A4E', '#FF9A3C', '#FFD23F', '#3CC46B', '#45AEFF', '#A98BFF'].forEach((c, i) => { x.beginPath(); x.arc(rx, ry, R0 - i * bw, Math.PI, Math.PI * 2); x.lineWidth = bw; x.strokeStyle = c; x.globalAlpha = .75; x.stroke(); });
      x.globalAlpha = 1;
    }
    // sun with rays
    x.strokeStyle = '#FFC234'; x.lineWidth = 8; x.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; x.beginPath(); x.moveTo(sx + Math.cos(a) * W * .075, sy + Math.sin(a) * W * .075); x.lineTo(sx + Math.cos(a) * W * .1, sy + Math.sin(a) * W * .1); x.stroke(); }
    circle(sx, sy, W * .06, '#FFD23F');
    // clouds
    for (let c = 0, n = 2 + randInt(2); c < n; c++) {
      const cx = W * (.25 + c * .27 + rnd(-.06, .06)), cy = H * rnd(.08, .3), s = W * rnd(.04, .055);
      x.globalAlpha = .95; [[0, 0, 1.2], [-1.2, .3, .9], [1.2, .3, .9], [-.4, -.5, .9], [.6, -.4, .8]].forEach(([dx, dy, r]) => circle(cx + dx * s, cy + dy * s, r * s, '#FFFFFF')); x.globalAlpha = 1;
    }
    emoji(pick(['🐦', '🦅', '🎈', '🪁', '🦋']), W * rnd(.4, .6), H * rnd(.12, .22), W * .06);
    // hills
    x.fillStyle = pick(['#8FD694', '#A6DB8C', '#7FCDA0']);
    x.beginPath(); x.moveTo(0, H * rnd(.52, .6)); x.quadraticCurveTo(W * rnd(.25, .45), H * rnd(.32, .42), W * .7, H * .55); x.quadraticCurveTo(W * .85, H * .5, W, H * rnd(.5, .58)); x.lineTo(W, H); x.lineTo(0, H); x.fill();
    emoji('🐑', W * rnd(.12, .3), H * .56, W * .055); emoji(pick(['🐄', '🐑', '🐎']), W * rnd(.7, .9), H * .56, W * .05);
    x.fillStyle = pick(['#57C26A', '#4DB45F', '#62C463']);
    x.beginPath(); x.moveTo(0, H * rnd(.68, .74)); x.quadraticCurveTo(W * rnd(.4, .6), H * rnd(.55, .6), W, H * rnd(.66, .72)); x.lineTo(W, H); x.lineTo(0, H); x.fill();
    // house and tree on opposite sides
    const houseLeft = Math.random() < .5, hx = W * (houseLeft ? rnd(.2, .32) : rnd(.6, .72)), base = H * .76, hw = W * .2, hh = H * .17;
    const tx = W * (houseLeft ? rnd(.72, .86) : rnd(.12, .26));
    // path
    x.fillStyle = '#E8C98B'; x.beginPath(); x.moveTo(hx - hw * .08, base); x.lineTo(hx + hw * .08, base); x.lineTo(hx + hw * .35, H); x.lineTo(hx - hw * .3, H); x.fill();
    // chimney + smoke
    x.fillStyle = '#8E5B3A'; x.fillRect(hx + hw * .2, base - hh - H * .14, hw * .12, H * .1);
    x.globalAlpha = .7; [0, 1, 2].forEach(i => circle(hx + hw * .26 + i * 10, base - hh - H * .17 - i * 18, 10 + i * 4, '#FFFFFF')); x.globalAlpha = 1;
    x.fillStyle = pick(['#FF8A65', '#FFD166', '#7EC8F7', '#F7A1C4', '#C5A3FF']); x.fillRect(hx - hw / 2, base - hh, hw, hh);
    x.fillStyle = pick(['#C4432A', '#6F4FD0', '#1D70C0', '#AE2A5F']);
    x.beginPath(); x.moveTo(hx - hw * .62, base - hh); x.lineTo(hx, base - hh - H * .13); x.lineTo(hx + hw * .62, base - hh); x.fill();
    x.fillStyle = '#7A4A26'; x.fillRect(hx - hw * .09, base - hh * .55, hw * .18, hh * .55);
    circle(hx + hw * .05, base - hh * .28, 3, '#FFC234');
    [-1, 1].forEach(s => { const wx = hx + s * hw * .3, wy = base - hh * .62; x.fillStyle = '#FFF6C7'; x.fillRect(wx - hw * .1, wy - hh * .17, hw * .2, hh * .34); x.strokeStyle = '#FFFFFF'; x.lineWidth = 4; x.strokeRect(wx - hw * .1, wy - hh * .17, hw * .2, hh * .34); x.beginPath(); x.moveTo(wx, wy - hh * .17); x.lineTo(wx, wy + hh * .17); x.moveTo(wx - hw * .1, wy); x.lineTo(wx + hw * .1, wy); x.stroke(); });
    // tree
    x.fillStyle = '#8E5B3A'; x.fillRect(tx - W * .018, H * .55, W * .036, H * .22);
    const leaf = pick(['#2E9E4F', '#279447', '#3AAE5A']);
    [[0, -.04, .08], [-.05, .01, .06], [.05, .01, .06]].forEach(([dx, dy, r]) => circle(tx + dx * W, H * .52 + dy * H, r * W, leaf));
    const fruit = pick(['#FF4D4D', '#FF9A3C', '#FFD23F', '#F25A95']);
    for (let i = 0; i < 6; i++) circle(tx + rnd(-.08, .08) * W, H * (.48 + rnd(0, .08)), 7, fruit);
    // pond with a duck, on the side of the tree
    if (Math.random() < .7) {
      const px = tx + (houseLeft ? -1 : 1) * W * .02, py = H * .87;
      x.fillStyle = '#5BB8F0'; x.beginPath(); x.ellipse(px, py, W * .12, H * .05, 0, 0, Math.PI * 2); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 3; x.beginPath(); x.ellipse(px, py, W * .08, H * .025, 0, 0, Math.PI * 2); x.stroke();
      emoji('🦆', px, py - H * .03, W * .05);
    }
    // fence
    x.fillStyle = '#FFFFFF';
    const fx0 = houseLeft ? hx + hw * .5 : 0, fx1 = houseLeft ? W : hx - hw * .5;
    for (let fx = fx0 + 8; fx < fx1 - 8; fx += 26) x.fillRect(fx, H * .76, 10, H * .07);
    x.fillRect(fx0, H * .78, Math.max(0, fx1 - fx0), 6);
    // flowers
    const cols = ['#FF5A4E', '#FFD23F', '#F25A95', '#A98BFF', '#FF9A3C', '#FFFFFF'];
    for (let i = 0; i < 9; i++) {
      const fx = W * (i + .5) / 9 + rnd(-12, 12), fy = H * rnd(.9, .96);
      if (Math.abs(fx - hx) < hw * .3) continue;
      x.strokeStyle = '#2E8B45'; x.lineWidth = 4; x.beginPath(); x.moveTo(fx, fy); x.lineTo(fx, H); x.stroke();
      const c = pick(cols); for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5; circle(fx + Math.cos(a) * 11, fy + Math.sin(a) * 11, 9, c); }
      circle(fx, fy, 7, '#FFC234');
    }
    const extras = shuffle(['🌷', '🌻', '🌼', '🐝', '🐞', '🦋', '🍄', '🐈']).slice(0, 3);
    extras.forEach((e, i) => emoji(e, W * (.15 + i * .35 + rnd(-.05, .05)), H * rnd(.82, .88), W * .055));
    return cv.toDataURL('image/jpeg', .9);
  }

  function startJigsaw(L0, api) {
    const L = lvl(L0), done = finisher(api);
    const [cols, rows] = [[2, 2], [3, 2], [3, 3], [4, 3]][Math.min(L, 4) - 1];
    const n = cols * rows, url = paintScene(800, 600);
    let pos; do pos = shuffle([...Array(n).keys()]); while (pos.some((p, s) => p === s));
    let sel = null, slips = 0, finished = false, fresh = new Set(), moved = new Set(), target = null;
    const root = el('div', 'gt-wrap');
    const top = el('div', 'gt-jtop', `<div class="gt-thumb" style="background-image:url(${url})" role="img" aria-label="The finished picture"></div><p class="gt-label" style="color:var(--on-table);max-width:11ch;text-align:left">This is the picture we are making</p>`);
    const board = el('div', 'gt-jboard'); board.style.setProperty('--cols', cols); board.style.setProperty('--rows', rows);
    const helpBtn = mkBtn('💡 Show me one', 'c-sun', help);
    root.append(top, board, el('div', 'gt-row')); root.lastChild.append(helpBtn);
    api.stage.append(root);
    api.hint('Tap a piece, then tap where it should go. The pieces swap places.');
    const correct = () => pos.filter((p, s) => p === s).length;
    function render() {
      board.innerHTML = `<div class="gt-jguide" style="background-image:url(${url})"></div>`;
      pos.forEach((p, s) => {
        const b = el('button', 'gt-piece'); b.type = 'button';
        b.style.gridArea = `${Math.floor(s / cols) + 1} / ${s % cols + 1}`;
        b.style.backgroundImage = `url(${url})`;
        const pc = p % cols, pr = Math.floor(p / cols);
        b.style.backgroundPosition = `${cols > 1 ? pc / (cols - 1) * 100 : 0}% ${rows > 1 ? pr / (rows - 1) * 100 : 0}%`;
        b.dataset.slot = s; b.dataset.piece = p;
        b.setAttribute('aria-label', p === s ? 'Piece in place' : 'Puzzle piece');
        if (p === s) b.classList.add('gt-lock');
        if (fresh.has(s)) b.classList.add('gt-new'); else if (moved.has(s)) b.classList.add('gt-moved');
        if (sel === s) b.classList.add('gt-sel');
        if (target === s) b.classList.add('gt-target');
        b.onclick = () => tap(s);
        board.append(b);
      });
      fresh = new Set(); moved = new Set();
      api.rounds(n, correct());
    }
    function tap(s) {
      if (finished || pos[s] === s) return;
      if (sel === null) { sel = s; sfx.tap(); render(); return; }
      if (sel === s) { sel = null; target = null; render(); return; }
      const a = sel; sel = null; target = null;
      [pos[a], pos[s]] = [pos[s], pos[a]];
      const now = [a, s].filter(k => pos[k] === k);
      if (now.length) {
        now.forEach((k, i) => { fresh.add(k); tone(520 + correct() * 40 + i * 80, .18, 'triangle', .13, i * .1); });
        if (correct() < n) toast(cheer());
      } else { slips++; tone(440, .1, 'triangle', .08); }
      [a, s].forEach(k => moved.add(k));
      render();
      if (correct() === n) {
        finished = true; board.classList.add('gt-whole'); helpBtn.disabled = true; helpBtn.style.visibility = 'hidden';
        api.hint('You made the picture! Isn’t it lovely?'); sfx.good();
        done(slips <= n ? 3 : 2);
      } else api.hint(now.length ? 'That piece is in the right place. Keep going!' : 'Tap a piece, then tap where it should go.');
    }
    function help() {
      if (finished) return;
      const s = pos.findIndex((p, k) => p !== k); if (s < 0) return;
      sel = pos.indexOf(s); target = s; sfx.tap();
      api.hint('Now tap the glowing space to put that piece there.');
      render();
    }
    render();
  }

  /* =========================================================
     3. SING-ALONG BINGO (public-domain melodies)
     ========================================================= */
  const SONGS = [
    { id: 'twinkle', e: '⭐', t: 'Twinkle Twinkle', full: 'Twinkle, Twinkle, Little Star', beat: .42,
      n: 'C5 C5 G5 G5 A5 A5 G5:2 F5 F5 E5 E5 D5 D5 C5:2' },
    { id: 'birthday', e: '🎂', t: 'Happy Birthday', full: 'Happy Birthday to You', beat: .38,
      n: 'G4:.75 G4:.25 A4 G4 C5 B4:2 G4:.75 G4:.25 A4 G4 D5 C5:2 G4:.75 G4:.25 G5 E5 C5 B4 A4:2 F5:.75 F5:.25 E5 C5 D5 C5:3' },
    { id: 'jingle', e: '🔔', t: 'Jingle Bells', full: 'Jingle Bells', beat: .28,
      n: 'E5 E5 E5:2 E5 E5 E5:2 E5 G5 C5:1.5 D5:.5 E5:4 F5 F5 F5:1.5 F5:.5 F5 E5 E5 E5:.5 E5:.5 E5 D5 D5 E5 D5:2 G5:2' },
    { id: 'daisy', e: '🚲', t: 'Daisy Bell', full: 'Daisy Bell (A Bicycle Built for Two)', beat: .22,
      n: 'G5:3 E5:3 C5:3 G4:3 A4 B4 C5 A4:2 C5 G4:6 D5:3 G5:3 E5:3 C5:3 A4 B4 C5 D5:2 E5 D5:6' },
    { id: 'clementine', e: '⛏️', t: 'Clementine', full: 'Oh My Darling, Clementine', beat: .32,
      n: 'C5:.75 C5:.25 C5 G4 E5:.75 E5:.25 E5 C5 C5:.75 E5:.25 G5:1.5 G5:.5 F5:.5 E5:.5 D5:3 D5:.75 E5:.25 F5 F5 E5:.75 D5:.25 E5 C5 C5:.75 E5:.25 D5:1.5 G4:.5 B4:.5 D5:.5 C5:3' },
    { id: 'auld', e: '🥂', t: 'Auld Lang Syne', full: 'Auld Lang Syne', beat: .4,
      n: 'G4 C5:1.5 C5:.5 C5 E5 D5:1.5 C5:.5 D5 E5 C5:1.5 C5:.5 E5 G5 A5:3 A5 G5:1.5 E5:.5 E5 C5 D5:1.5 C5:.5 D5 E5 C5:1.5 A4:.5 A4 G4 C5:3' },
    { id: 'row', e: '🚣', t: 'Row Your Boat', full: 'Row, Row, Row Your Boat', beat: .17,
      n: 'C5:3 C5:3 C5:2 D5 E5:3 E5:2 D5 E5:2 F5 G5:6 C6 C6 C6 G5 G5 G5 E5 E5 E5 C5 C5 C5 G5:2 F5 E5:2 D5 C5:6' },
    { id: 'oldmac', e: '🐄', t: 'Old Mac&shy;Donald', full: 'Old MacDonald Had a Farm', beat: .3,
      n: 'C5 C5 C5 G4 A4 A4 G4:2 E5 E5 D5 D5 C5:3 G4 C5 C5 C5 G4 A4 A4 G4:2 E5 E5 D5 D5 C5:3' },
    { id: 'london', e: '🌉', t: 'London Bridge', full: 'London Bridge Is Falling Down', beat: .3,
      n: 'G5:1.5 A5:.5 G5 F5 E5 F5 G5:2 D5 E5 F5:2 E5 F5 G5:2 G5:1.5 A5:.5 G5 F5 E5 F5 G5:2 D5:2 G5:2 E5 C5:2' },
    { id: 'range', e: '🦬', t: 'Home on the Range', full: 'Home on the Range', beat: .3,
      n: 'G4 G4 C5:2 D5 E5:2 C5:.5 B4:.5 A4:2 F4 F4 F4:3 E4 F4 G4:2 C5 C5 C5 B4 C5 D5:3' },
    { id: 'saints', e: '🎺', t: 'The Saints', full: 'When the Saints Go Marching In', beat: .24,
      n: 'C5 E5 F5 G5:4 C5 E5 F5 G5:4 C5 E5 F5 G5:2 E5:2 C5:2 E5:2 D5:4 E5 F5 G5:2 E5:2 C5:2 D5:2 C5:4' },
    { id: 'mountain', e: '⛰️', t: 'Round the Mountain', full: 'She’ll Be Coming Round the Mountain', beat: .3,
      n: 'G4:.5 A4:.5 C5 C5 C5 C5 A4 G4 E4 G4 C5:3 C5:.5 D5:.5 E5 E5 E5 E5 G5 E5 D5 C5 D5:3' }
  ];
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const noteFreq = s => { const m = /^([A-G])(#|b)?(\d)$/.exec(s); const midi = 12 * (+m[3] + 1) + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); return 440 * Math.pow(2, (midi - 69) / 12); };
  const parseTune = s => s.trim().split(/\s+/).map(t => { const [nm, b] = t.split(':'); return { f: nm === 'R' ? 0 : noteFreq(nm), b: b ? +b : 1 }; });
  const LINES9 = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const isMuted = () => R.isMuted();

  function startSingalong(L0, api) {
    const L = lvl(L0), done = finisher(api);
    const size = L <= 1 ? 4 : L === 2 ? 6 : 9, cols = size === 9 ? 3 : 2;
    const card = shuffle(SONGS.slice()).slice(0, size);
    const marked = new Set();
    let current = null, playTok = 0, misses = 0, missesThis = 0, finished = false, played = 0;
    const root = el('div', 'gt-wrap'); api.stage.append(root);
    const bar = el('div', 'gt-sbar');
    const playBtn = mkBtn('▶ Play a song', 'c-leaf', () => { if (!finished) nextSong(); });
    const againBtn = mkBtn('↻ Play it again', 'c-sky', () => { if (current && !finished) playTune(current); });
    againBtn.disabled = true; bar.append(playBtn, againBtn);
    const notes = el('div', 'gt-notes');
    const grid = el('div', 'gt-bingo'); grid.style.setProperty('--cols', cols);
    root.append(bar, notes, grid);
    if (isMuted()) {
      const soundRow = el('div', 'gt-row');
      soundRow.append(mkBtn('🔊 Turn the sound on', 'c-sun', () => { R.unmute(); soundRow.remove(); sfx.good(); }));
      root.prepend(soundRow);
    }
    const btns = card.map((s, i) => {
      const b = el('button', 'tile c-card gt-song', `<span class="gt-se" aria-hidden="true">${s.e}</span><span>${s.t}</span>`); b.type = 'button';
      b.setAttribute('aria-label', s.full); b.dataset.song = s.id;
      b.onclick = () => tapCard(i, b); grid.append(b); return b;
    });
    api.hint(size === 9 ? 'Tap “Play a song” and listen. Find it on your card. Get a line of three to win!' : 'Tap “Play a song” and listen. Find it on your card and tap it.');
    api.rounds(size === 9 ? 3 : size, 0);
    function nextSong() {
      if (current) { toast('Find this one first. Tap “Play it again” to hear it.'); return; }
      const left = card.filter(s => !marked.has(s.id));
      current = pick(left); missesThis = 0; played++;
      api.stage.dataset.song = current.id;
      againBtn.disabled = false; playBtn.disabled = true;
      playTune(current);
    }
    function playTune(song) {
      const tok = ++playTok, seq = parseTune(song.n);
      let t = 250;
      notes.innerHTML = '<span>🎵</span><span>🎶</span><span>🎵</span>';
      api.hint('Listen… Sing along if you know it!');
      seq.forEach(nt => {
        const at = t, dur = Math.max(.14, nt.b * song.beat * .92);
        api.later(() => { if (tok !== playTok || !nt.f) return; tone(nt.f, dur, 'triangle', .17); tone(nt.f / 2, dur, 'sine', .05); }, at);
        t += nt.b * song.beat * 1000;
      });
      api.later(() => { if (tok !== playTok) return; notes.innerHTML = ''; if (current === song) api.hint('Which song was that? Tap it on your card.'); }, t + 200);
    }
    function tapCard(i, b) {
      const s = card[i];
      if (finished || marked.has(s.id)) return;
      if (!current) { wob(b); toast('Tap “Play a song” first'); return; }
      if (s === current) {
        playTok++; notes.innerHTML = '';
        marked.add(s.id); b.classList.remove('gt-glow'); b.classList.add('gt-marked'); sfx.good();
        api.hint(`Yes! “${s.full}”. ${cheer()}`);
        current = null; delete api.stage.dataset.song; againBtn.disabled = true; playBtn.disabled = false;
        const win = checkWin();
        api.rounds(size === 9 ? 3 : size, size === 9 ? bestLine() : marked.size);
        if (win) {
          finished = true; playBtn.disabled = true;
          if (win !== true) win.forEach(k => btns[k].classList.add('gt-line'));
          api.later(() => api.hint(size === 9 ? 'Bingo! A whole line. Wonderful singing!' : 'Bingo! Your card is full. Wonderful singing!'), 900);
          done(starsFor(misses, 3, 8));
        }
      } else {
        misses++; missesThis++; wob(b); sfx.soft();
        if (missesThis >= 2) {
          const k = card.indexOf(current); btns[k].classList.add('gt-glow');
          api.hint('It’s the glowing one. Tap it!');
        } else toast('Not this one. Shall we listen again?');
      }
    }
    function bestLine() { return Math.max(...LINES9.map(l => l.filter(k => marked.has(card[k].id)).length)); }
    function checkWin() {
      if (size !== 9) return marked.size === size;
      return LINES9.find(l => l.every(k => marked.has(card[k].id))) || false;
    }
  }

  /* =========================================================
     4. PICTURE DOMINOES (dealt from a valid chain)
     ========================================================= */
  const DOM_PICS = ['🌻', '🐶', '🍎', '⛵', '🫖', '🐱', '🌈', '🎈', '🐟', '🍰', '🚗', '🐦', '🌷', '🍓', '☀️', '🐑', '🏠', '🔔', '🦋', '🍋'];
  function startDominoes(L0, api) {
    const L = lvl(L0), done = finisher(api);
    const handN = Math.min(2 + L, 8);
    const pics = shuffle(DOM_PICS.slice()).slice(0, handN + 2);   // all different, so each domino fits in exactly one place
    const all = [...Array(handN + 1)].map((_, i) => [pics[i], pics[i + 1]]);
    const k = randInt(all.length);
    const chain = [all[k].slice()];
    const hand = shuffle(all.filter((_, i) => i !== k).map(d => L >= 3 && Math.random() < .5 ? [d[1], d[0]] : d.slice()));
    let mistakes = 0, played = 0, justAdded = null;
    const root = el('div', 'gt-wrap'); api.stage.append(root);
    const ends = el('div', 'gt-ends'), chainBox = el('div', 'gt-chain'), handBox = el('div', 'gt-hand');
    const helpRow = el('div', 'gt-row'); helpRow.append(mkBtn('💡 Show me one', 'c-sun', help));
    root.append(ends, chainBox, el('p', 'gt-small', 'Your dominoes'), handBox, helpRow);
    const domHTML = (d, cls = '') => `<span class="gt-h ${cls === 'L' ? 'gt-open' : ''}">${d[0]}</span><span class="gt-h ${cls === 'R' ? 'gt-open' : ''}">${d[1]}</span>`;
    const left = () => chain[0][0], right = () => chain[chain.length - 1][1];
    function render() {
      ends.innerHTML = `<span>Find</span><span class="tile c-sun gt-endpic">${left()}</span><span>or</span><span class="tile c-sun gt-endpic">${right()}</span>`;
      chainBox.innerHTML = '';
      chain.forEach((d, i) => {
        const cls = chain.length === 1 ? '' : i === 0 ? 'L' : i === chain.length - 1 ? 'R' : '';
        const s = el('span', 'gt-dom' + (d === justAdded ? ' gt-in' : ''), domHTML(d, cls));
        if (chain.length === 1) s.querySelectorAll('.gt-h').forEach(h => h.classList.add('gt-open'));
        chainBox.append(s);
      });
      handBox.innerHTML = '';
      hand.forEach(d => {
        const b = el('button', 'gt-dom', domHTML(d)); b.type = 'button'; b.dataset.a = d[0]; b.dataset.b = d[1];
        b.setAttribute('aria-label', 'Domino'); b.onclick = () => play(d, b); handBox.append(b);
      });
      api.rounds(handN, played);
      if (hand.length) api.hint(`Find a domino with ${left()} or ${right()} on it. Tap it to add it.`);
    }
    function play(d, b) {
      let placed = null;
      if (d.includes(left())) { placed = d[1] === left() ? d.slice() : [d[1], d[0]]; chain.unshift(placed); }
      else if (d.includes(right())) { placed = d[0] === right() ? d.slice() : [d[1], d[0]]; chain.push(placed); }
      if (!placed) { mistakes++; wob(b); sfx.soft(); toast('That one doesn’t fit yet'); return; }
      hand.splice(hand.indexOf(d), 1); played++; justAdded = placed;
      tone(500 + played * 50, .16, 'triangle', .13); tone(750 + played * 50, .2, 'triangle', .1, .08);
      render();
      if (!hand.length) { api.hint('All your dominoes are on the table. Well done!'); helpRow.remove(); done(starsFor(mistakes, 3, 8)); }
      else toast(cheer());
    }
    function help() {
      const i = hand.findIndex(d => d.includes(left()) || d.includes(right()));
      const b = handBox.children[i]; if (!b) return;
      b.classList.add('gt-help'); sfx.tap(); api.hint('This one fits. Tap it!');
    }
    render();
  }

  /* =========================================================
     5. PHOTO PAIRS (the player's own photos, kept on this device)
     ========================================================= */
  const PP_KEY = 'gentle-photos';
  const PP_EMOJI = ['🌻', '🐶', '🏡', '⛵', '🫖', '🎂', '🐱', '🌈', '🍓', '🦋', '🚂', '🌷'];
  function loadPhotos() {
    try { const a = store.get(PP_KEY, []); return Array.isArray(a) ? a.filter(s => typeof s === 'string' && s.startsWith('data:image/')).slice(0, 8) : []; } catch (e) { return []; }
  }
  function savePhotos(list) {
    try { store.set(PP_KEY, list); const back = store.get(PP_KEY, []); return Array.isArray(back) && back.length === list.length; } catch (e) { return false; }
  }
  function shrinkPhoto(file) {
    return new Promise(res => {
      try {
        const fr = new FileReader();
        fr.onerror = () => res(null);
        fr.onload = () => {
          const img = new Image();
          img.onerror = () => res(null);
          img.onload = () => {
            try {
              const S = 160, cv = document.createElement('canvas'); cv.width = cv.height = S;
              const side = Math.min(img.naturalWidth, img.naturalHeight);
              cv.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, S, S);
              res(cv.toDataURL('image/jpeg', .72));
            } catch (e) { res(null); }
          };
          img.src = fr.result;
        };
        fr.readAsDataURL(file);
      } catch (e) { res(null); }
    });
  }
  function startPhotos(L0, api) {
    const L = lvl(L0), done = finisher(api);
    const pairsN = [3, 4, 4, 5, 6][Math.min(L, 5) - 1], faceDown = L >= 3;
    let photos = loadPhotos(), removeArmed = false;
    const root = el('div', 'gt-wrap'); api.stage.append(root);
    const input = el('input'); input.type = 'file'; input.accept = 'image/*'; input.multiple = true; input.hidden = true;
    api.stage.append(input);
    input.onchange = async () => {
      const files = [...(input.files || [])].slice(0, 8); input.value = '';
      if (!files.length) return;
      api.hint('Getting your photos ready…');
      const got = (await Promise.all(files.map(shrinkPhoto))).filter(Boolean);
      if (!root.isConnected) return;
      if (!got.length) { toast('Sorry, those photos would not open'); setup(); return; }
      photos = got.concat(photos).slice(0, 8);
      toast(savePhotos(photos) ? 'Photos added' : 'Added for now, but not saved');
      setup();
    };
    const addBtn = (label, cls) => mkBtn(label, cls, () => { sfx.tap(); input.click(); });
    function setup() {
      root.innerHTML = ''; removeArmed = false;
      const panel = el('div', 'gt-panel gt-wrap');
      if (!photos.length) {
        api.hint('Add your own family photos, or play with our pictures.');
        panel.append(el('div', 'gt-preview', PP_EMOJI.slice(0, 4).join('')), el('p', 'gt-label', 'Use your own photos to make the pairs. Family, pets and favourite places work well.'));
        const r = el('div', 'gt-row'); r.append(addBtn('📷 Add your own photos', 'c-sun gt-bigbtn')); panel.append(r);
        const r2 = el('div', 'gt-row'); r2.append(mkBtn('▶ Play with our pictures', 'c-leaf', () => { sfx.tap(); play(); })); panel.append(r2);
      } else {
        api.hint('Here are your photos. Tap Play when you are ready.');
        const th = el('div', 'gt-thumbs'); photos.forEach(p => { const im = el('img'); im.src = p; im.alt = 'Your photo'; th.append(im); });
        panel.append(th);
        const r = el('div', 'gt-row'); r.append(mkBtn('▶ Play with my photos', 'c-leaf gt-bigbtn', () => { sfx.tap(); play(); })); panel.append(r);
        const r2 = el('div', 'gt-row');
        r2.append(addBtn('📷 Add more photos', 'c-sun'));
        const rm = mkBtn('Remove my photos', 'c-card', () => {
          if (!removeArmed) { removeArmed = true; rm.textContent = 'Tap again to remove'; return; }
          photos = []; savePhotos([]); toast('Photos removed'); setup();
        });
        r2.append(rm); panel.append(r2);
      }
      panel.append(el('p', 'gt-label', '🔒 Your photos stay only on this device. Up to 8 are kept.'));
      root.append(panel);
    }
    function play() {
      root.innerHTML = '';
      const pool = shuffle(photos.slice()).map(p => ({ img: p })).concat(shuffle(PP_EMOJI.slice()).map(e => ({ e }))).slice(0, pairsN);
      const cards = shuffle(pool.flatMap((f, k) => [{ f, k }, { f, k }]));
      const grid = el('div', 'gt-ppgrid'); grid.style.setProperty('--cols', cards.length <= 6 ? 3 : 4);
      root.append(grid);
      let sel = [], lock = faceDown, found = 0, mistakes = 0;
      api.rounds(pairsN, 0);
      const els = cards.map(c => {
        const b = el('button', 'gt-pc'); b.type = 'button'; b.dataset.k = c.k;
        const face = c.f.img ? `<img src="${c.f.img}" alt="">` : c.f.e;
        b.innerHTML = `<span class="gt-pin"><span class="gt-face">${face}</span><span class="gt-back">♥</span></span>`;
        b.setAttribute('aria-label', c.f.img ? 'Photo' : 'Picture');
        b.onclick = () => tap(c, b); grid.append(b); return b;
      });
      if (faceDown) {
        api.hint('Have a good look at the pictures…');
        api.later(() => { els.forEach(b => b.classList.add('gt-down')); lock = false; sfx.tap(); api.hint('Now they are turned over. Tap two cards to find a pair.'); }, 3500);
      } else api.hint('Tap two pictures that are the same.');
      function tap(c, b) {
        if (lock || b.classList.contains('gt-done')) return;
        if (sel.some(s => s.b === b)) { if (!faceDown) { b.classList.remove('gt-sel'); sel = sel.filter(s => s.b !== b); } return; }
        sfx.tap(); sel.push({ c, b });
        if (faceDown) b.classList.remove('gt-down'); else b.classList.add('gt-sel');
        if (sel.length < 2) return;
        const [x, y] = sel; sel = []; lock = true;
        if (x.c.k === y.c.k) {
          api.later(() => {
            [x, y].forEach(s => { s.b.classList.remove('gt-sel'); s.b.classList.add('gt-done'); });
            found++; api.rounds(pairsN, found); tone(520 + found * 60, .16, 'triangle', .13); tone(780 + found * 60, .2, 'triangle', .1, .09);
            lock = false;
            if (found === pairsN) { api.hint('All the pairs are found. Lovely!'); done(faceDown ? starsFor(mistakes, pairsN * 2, pairsN * 4) : starsFor(mistakes, 3, 8)); }
            else toast(cheer());
          }, faceDown ? 500 : 200);
        } else {
          mistakes++;
          api.later(() => {
            sfx.soft(); toast(faceDown ? 'Not a pair. They’ll turn back over.' : 'Those two are different');
            [x, y].forEach(s => s.b.classList.remove('gt-sel'));
            if (!faceDown) { [x, y].forEach(s => wob(s.b)); lock = false; }
          }, faceDown ? 700 : 150);
          if (faceDown) api.later(() => { [x, y].forEach(s => s.b.classList.add('gt-down')); lock = false; }, 1700);
        }
      }
    }
    setup();
  }

  /* =========================================================
     6. SNAP TOGETHER (turn-based, never a race)
     ========================================================= */
  const SNAP_PICS = ['🍎', '🌻', '🐶', '⛵', '🎈', '🐱', '🍰', '🚗', '🌈', '🐟', '🫖', '☀️', '🦋', '🍓', '🏠', '🐑', '🔔', '🌷'];
  const SNAP_ALIKE = [['🍎', '🍏'], ['🐶', '🐕'], ['🌻', '🌼'], ['🐱', '🐈'], ['🫖', '☕'], ['🚗', '🚙'], ['🐟', '🐠'], ['🌷', '🌹'], ['🍓', '🍒'], ['🎈', '🎀'], ['☀️', '⭐'], ['🏠', '🏡']];
  function startSnap(L0, api) {
    const L = lvl(L0), done = finisher(api), N = 12;
    const k = L <= 2 ? 4 : 5, alikeChance = L <= 2 ? 0 : Math.min(.5, .15 * (L - 2));
    let at; do at = shuffle([...Array(N - 1)].map((_, i) => i + 1)).slice(0, k).sort((a, b) => a - b); while (at.some((p, i) => i && p - at[i - 1] < 2));
    const set = shuffle(SNAP_PICS.slice()).slice(0, L <= 1 ? 6 : 9);
    const deck = [];
    for (let i = 0; i < N; i++) {
      if (at.includes(i)) { deck.push(deck[i - 1]); continue; }
      let c;
      const pair = i && SNAP_ALIKE.find(p => p.includes(deck[i - 1]));
      if (pair && Math.random() < alikeChance) c = pair.find(e => e !== deck[i - 1]);
      else do c = pick(set); while (i && c === deck[i - 1]);
      deck.push(c);
    }
    let idx = -1, slips = 0, snaps = 0, nudged = -1, snapped = new Set(), finished = false;
    const root = el('div', 'gt-wrap'); api.stage.append(root);
    const table = el('div', 'gt-table'), info = el('p', 'gt-deck');
    const row = el('div', 'gt-row');
    const turnBtn = mkBtn('🂠 Turn the first card', 'c-sky gt-bigbtn', turn);
    const snapBtn = mkBtn('Snap!', 'c-coral gt-snapbtn', snap);
    row.append(turnBtn, snapBtn);
    root.append(table, info, row);
    api.hint('Tap “Turn the first card” to start. Take your time.');
    const matchShowing = () => idx >= 1 && deck[idx] === deck[idx - 1] && !snapped.has(idx);
    function render(flip) {
      table.innerHTML = '';
      const lastSpot = el('div', 'gt-spot'), newSpot = el('div', 'gt-spot');
      if (idx >= 1) lastSpot.append(el('div', 'tile c-card gt-scard gt-last' + (snapped.has(idx) ? ' gt-snapped' : ''), deck[idx - 1])); else lastSpot.append(el('div', 'gt-empty'));
      lastSpot.append(el('span', '', 'Last card'));
      if (idx >= 0) newSpot.append(el('div', 'tile c-card gt-scard' + (flip ? ' gt-flip' : '') + (snapped.has(idx) ? ' gt-snapped' : ''), deck[idx])); else newSpot.append(el('div', 'gt-empty gt-bigempty'));
      newSpot.append(el('span', '', 'New card'));
      table.append(lastSpot, newSpot);
      const left = N - 1 - idx;
      info.textContent = left > 0 ? `${left} card${left === 1 ? '' : 's'} left · Snaps: ${snaps}` : `No cards left · Snaps: ${snaps}`;
      api.rounds(N, idx + 1);
      if (idx >= 0) turnBtn.textContent = '🂠 Turn the next card';
    }
    function turn() {
      if (finished) return;
      if (matchShowing()) {
        if (nudged !== idx) { nudged = idx; slips++; }
        sfx.soft(); toast('Look, they match!'); api.hint('These two are the same. Tap the big “Snap!” button.'); wob(snapBtn); return;
      }
      if (idx >= N - 1) return;
      idx++; tone(380, .08, 'triangle', .07); render(true);
      if (matchShowing()) api.hint('Are these two the same? If they are, tap “Snap!”');
      else if (idx === N - 1) { api.hint('That was the last card.'); finish(); }
      else api.hint('Do they match? If not, turn the next card.');
    }
    function snap() {
      if (finished) return;
      if (idx < 1) { toast('Turn a card first'); return; }
      if (matchShowing()) {
        snapped.add(idx); snaps++; render(false);
        tone(660, .12, 'square', .07); [784, 988, 1175].forEach((f, i) => tone(f + snaps * 20, .2, 'triangle', .12, .08 + i * .08));
        toast('Snap! ' + cheer()); api.hint('Snap! They match. Turn the next card when you are ready.');
        if (idx === N - 1) finish();
      } else { slips++; sfx.soft(); toast('Not this time'); api.hint('Those two are different. Turn the next card.'); }
    }
    function finish() {
      finished = true; turnBtn.disabled = true; snapBtn.disabled = true;
      api.later(() => api.hint(`All done! You found ${snaps} snap${snaps === 1 ? '' : 's'}.`), 600);
      done(starsFor(slips, 3, 7));
    }
    render(false);
  }

  /* =========================================================
     7. TALK ABOUT IT (reminiscence cards, no scoring)
     ========================================================= */
  const TALK = [
    { e: '🏖️', name: 'The seaside', cards: [
      ['🏖️', 'A day at the beach', ['Did you ever go to the seaside as a child? What did you take for a picnic?', 'Do you like sand between your toes, or a comfy deckchair?']],
      ['🍦', 'Ice cream by the sea', ['What is your favourite ice cream flavour?', 'Ice cream or fish and chips by the sea?']],
      ['🐚', 'Shells and pebbles', ['Do you like collecting shells or pretty pebbles?', 'What do you think you can hear in a seashell?']],
      ['⛵', 'Boats in the harbour', ['Have you ever been out on a boat? How did it feel?', 'Would you choose a sailing boat or a rowing boat?']],
      ['🎡', 'The pier', ['What would you do first on a pier: the rides, the arcade or a stroll?', 'Do you like the sound of the seagulls?']],
      ['🌊', 'Paddling in the waves', ['Is the sea too cold for you, or do you love a paddle?', 'Tell me about a beach you like.']]] },
    { e: '🏫', name: 'School days', cards: [
      ['🏫', 'The schoolroom', ['What do you think makes a good teacher?', 'Did you like school, or were you happier at home time?']],
      ['✏️', 'Pencils and paper', ['Do you like writing, drawing or sums best?', 'What do you think of joined-up handwriting?']],
      ['⚽', 'Playtime', ['What games do children play in the playground?', 'Skipping, marbles or ball games: which sounds most fun?']],
      ['🥪', 'Lunchtime', ['What would you like in a packed lunch?', 'Were school dinners ever any good?']],
      ['🎒', 'The walk to school', ['How did children get to school when you were young?', 'What might you see on the way?']],
      ['📚', 'Stories', ['Do you like being read a story?', 'What kind of books do you enjoy?']]] },
    { e: '💃', name: 'Dancing', cards: [
      ['💃', 'Let’s dance', ['Do you like dancing? What music gets your feet tapping?', 'Who would you like to dance with?']],
      ['🕺', 'On the dance floor', ['Are you a quick-stepper or a slow-dancer?', 'What would you wear for a night out dancing?']],
      ['🎶', 'The band', ['Would you rather dance to a big band or to records?', 'What song makes you want to get up and dance?']],
      ['👠', 'Dancing shoes', ['What makes a good pair of dancing shoes?', 'Have you ever danced until your feet ached?']],
      ['🪩', 'A night out', ['Where did people go dancing in your town?', 'What is the best part of a night out?']],
      ['🤝', 'May I have this dance?', ['How would someone ask you to dance?', 'Do you like to lead, or to follow?']]] },
    { e: '🍳', name: 'The kitchen', cards: [
      ['🍳', 'Breakfast', ['What is your favourite breakfast?', 'Do you like your eggs fried, boiled or scrambled?']],
      ['🫖', 'A cup of tea', ['How do you like your tea? Milk? Sugar?', 'Is tea nicer in a mug or a cup and saucer?']],
      ['🍰', 'Baking day', ['What smells best coming out of the oven?', 'Do you like to lick the spoon?']],
      ['🥧', 'Sunday dinner', ['What would be on your plate for a perfect Sunday dinner?', 'Who would you invite to share it?']],
      ['🍲', 'Warming food', ['What do you like to eat on a cold day?', 'Is there a dish that tastes like home to you?']],
      ['🧺', 'Picnic food', ['What would you pack for a picnic?', 'What is the best sandwich filling?']]] },
    { e: '🚗', name: 'Cars and trips', cards: [
      ['🚗', 'Going for a drive', ['Do you like going for a drive? Where is a nice place to go?', 'Do you like to drive, or to be driven?']],
      ['🚌', 'On the bus', ['Do you like to sit at the front or the back of the bus?', 'What can you see out of the window?']],
      ['🚂', 'A train journey', ['Do you like travelling by train?', 'Where would you like to go on a train today?']],
      ['🗺️', 'A day out', ['What makes a lovely day out?', 'Would you choose the countryside or the city?']],
      ['🧳', 'Packing a case', ['What do you always pack for a trip?', 'Do you pack light, or take everything?']],
      ['🚲', 'Bicycles', ['Have you ever ridden a bike?', 'What would you put in the basket on the front?']]] },
    { e: '🌻', name: 'The garden', cards: [
      ['🌻', 'Flowers', ['Do you like big bright flowers or small dainty ones?', 'What is your favourite flower?']],
      ['🍅', 'Growing food', ['Have you ever grown tomatoes, beans or potatoes?', 'What tastes best fresh from the garden?']],
      ['🌹', 'Roses', ['Do you like the smell of roses?', 'What colour rose would you choose?']],
      ['🐦', 'Birds in the garden', ['Which birds do you like to see?', 'Would you put out crumbs for the birds?']],
      ['🪑', 'Sitting outside', ['Where is a nice place to sit outside?', 'What do you like to listen to in the garden?']],
      ['🌦️', 'Sun and showers', ['Do you like the fresh smell after the rain?', 'What do you like to do on a sunny day?']]] },
    { e: '🐶', name: 'Pets', cards: [
      ['🐶', 'Dogs', ['Do you like dogs? Big ones or little ones?', 'What makes a dog such a good friend?']],
      ['🐱', 'Cats', ['Are you a cat person or a dog person?', 'Why do you think cats love a sunny windowsill?']],
      ['🦜', 'Budgies and parrots', ['Would you like a bird that sings or one that talks?', 'What would you teach a parrot to say?']],
      ['🐟', 'Goldfish', ['Would a goldfish make a good pet?', 'What would you name a goldfish?']],
      ['🐰', 'Rabbits', ['What do you think rabbits like to eat?', 'Should rabbits live indoors or in the garden?']],
      ['🐴', 'Horses and ponies', ['Have you ever stroked a horse?', 'Would you like to ride a pony along the beach?']]] },
    { e: '🎄', name: 'Holidays and festivals', cards: [
      ['🎄', 'Winter celebrations', ['What do you like best about the winter festivities?', 'Which decorations do you like?']],
      ['🎁', 'Presents', ['Do you like giving presents or getting them?', 'What makes a present special?']],
      ['🎂', 'Birthdays', ['What is your favourite kind of birthday cake?', 'How do you like to celebrate a birthday?']],
      ['🎆', 'Fireworks', ['Do you like fireworks, or are they too loud?', 'Which colours look best in the night sky?']],
      ['🐣', 'Springtime', ['What do you like about spring?', 'Do you like chocolate eggs?']],
      ['🎉', 'A party', ['What makes a good party?', 'At a party, do you like to dance or to chat?']]] },
    { e: '🎵', name: 'Music', cards: [
      ['🎵', 'A favourite song', ['Is there a song that always makes you smile?', 'Shall we sing a little of it together?']],
      ['🎹', 'The piano', ['Do you like the sound of the piano?', 'Has anyone in your family played an instrument?']],
      ['📻', 'The radio', ['What do you like to listen to on the radio?', 'Do you like music in the morning?']],
      ['🎺', 'Brass bands', ['Do you like a brass band in the park?', 'Which instrument would you like to play?']],
      ['🎤', 'Singers', ['Who is a singer you love to listen to?', 'Do you sing in the bath or in the kitchen?']],
      ['💿', 'Records', ['Records, tapes or the radio: which do you like best?', 'What would you play to cheer someone up?']]] },
    { e: '💼', name: 'Work', cards: [
      ['💼', 'A day’s work', ['Tell me about a job you have done.', 'What makes a good day at work?']],
      ['🔨', 'Making and mending', ['Do you like making or fixing things?', 'What tools do you like to use?']],
      ['🥖', 'Shops and bakers', ['Which shop would you like to work in?', 'What would a perfect bakery sell?']],
      ['🧶', 'Sewing and knitting', ['Do you like sewing or knitting?', 'What would you make for someone you love?']],
      ['🚜', 'On the farm', ['Would you like to work on a farm?', 'Which animals would you look after?']],
      ['☕', 'Tea break', ['What is the best part of a tea break?', 'Do you like a biscuit with your tea? Which one?']]] }
  ];
  function startTalk(L0, api) {
    const done = finisher(api), total = 6;
    const root = el('div', 'gt-wrap'); api.stage.append(root);
    let deck = [], i = 0;
    function choose() {
      root.innerHTML = ''; api.rounds(total, 0);
      api.hint('What would you like to talk about? Pick a picture.');
      const grid = el('div', 'gt-themes');
      TALK.forEach(t => {
        const b = el('button', 'tile c-card gt-theme', `<span aria-hidden="true">${t.e}</span>${t.name}`); b.type = 'button';
        b.onclick = () => { sfx.tap(); deck = shuffle(t.cards.slice()); i = 0; card(); };
        grid.append(b);
      });
      root.append(grid);
    }
    function card() {
      root.innerHTML = ''; api.rounds(total, i);
      const [e, title, qs] = deck[i % deck.length];
      api.hint('Have a chat about this picture. There are no right answers.');
      const panel = el('div', 'gt-panel gt-talk', `<div class="gt-big" aria-hidden="true">${e}</div><h3>${title}</h3>`);
      const ul = el('ul', 'gt-qs'); qs.forEach(q => ul.append(el('li', '', q))); panel.append(ul);
      const r = el('div', 'gt-row');
      const last = i === total - 1;
      r.append(mkBtn(last ? '✓ All done' : 'Next card →', 'c-leaf gt-bigbtn', () => {
        sfx.tap(); i++;
        if (i >= total) { api.rounds(total, total); api.hint('Thank you for a lovely chat!'); toast('What a lovely chat!'); r.remove(); done(3); }
        else card();
      }));
      if (!last) r.append(mkBtn('Pick another topic', 'c-card', () => { sfx.tap(); choose(); }));
      root.append(panel, r);
    }
    choose();
  }

  /* =========================================================
     8. COLOUR IN (bold outlines, big regions, no right or wrong)
     ========================================================= */
  const P = d => `<path class="gt-rg" d="${d}"/>`;
  const C = (x, y, r) => `<circle class="gt-rg" cx="${x}" cy="${y}" r="${r}"/>`;
  const E = (x, y, rx, ry, t = '') => `<ellipse class="gt-rg" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"${t ? ` transform="${t}"` : ''}/>`;
  const Rc = (x, y, w, h, r = 0) => `<rect class="gt-rg" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`;
  const Ln = d => `<path class="gt-ln" d="${d}"/>`;
  const BG = Rc(4, 4, 392, 392, 18);
  const PICS = [
    { name: 'a flower', idea: 'Maybe a sunny yellow middle?', svg: BG + P('M4 330 Q200 296 396 330 L396 392 Q396 396 392 396 L8 396 Q4 396 4 392 Z') + Rc(190, 190, 20, 150, 8) +
      P('M200 292 Q140 245 112 288 Q155 322 200 292 Z') + P('M200 262 Q262 214 290 254 Q246 292 200 262 Z') +
      [0, 60, 120, 180, 240, 300].map(a => E(200, 92, 36, 52, `rotate(${a} 200 150)`)).join('') + C(200, 150, 42) + C(345, 58, 30) },
    { name: 'a house', idea: 'What colour is your front door?', svg: BG + C(62, 62, 34) + E(300, 70, 60, 26) + P('M4 318 Q200 296 396 318 L396 392 Q396 396 392 396 L8 396 Q4 396 4 392 Z') +
      Rc(256, 92, 32, 70) + P('M76 182 L200 86 L324 182 Z') + Rc(100, 182, 200, 150) + P('M180 332 L180 270 Q202 246 224 270 L224 332 Z') +
      Rc(118, 206, 50, 44, 6) + Rc(234, 206, 50, 44, 6) + P('M182 336 L222 336 L252 396 L152 396 Z') + Ln('M143 206 V250 M118 228 H168 M259 206 V250 M234 228 H284') },
    { name: 'a fish', idea: 'Fish can be every colour of the rainbow!', svg: BG + P('M4 344 Q100 322 200 344 T396 344 L396 392 Q396 396 392 396 L8 396 Q4 396 4 392 Z') +
      P('M58 344 Q36 300 62 258 Q84 218 58 176 Q102 216 86 262 Q70 304 92 344 Z') + P('M286 200 L366 138 L366 262 Z') + P('M150 140 Q204 74 254 142 Z') +
      E(190, 200, 112, 72) + P('M176 132 Q158 200 176 268 L206 270 Q188 200 206 130 Z') + P('M196 214 Q232 236 214 262 Q192 246 196 214 Z') +
      C(126, 184, 17) + C(122, 184, 7) + C(96, 104, 13) + C(78, 64, 10) + C(104, 34, 8) + Ln('M86 214 q12 7 24 0') },
    { name: 'a teapot', idea: 'Perhaps a pretty pattern on the band?', svg: BG + Rc(4, 322, 392, 74, 0) +
      P('M282 176 C352 164 360 290 280 286 L280 260 C328 262 326 196 282 202 Z') + P('M124 214 Q78 204 62 156 L42 162 Q58 244 122 272 Z') +
      E(200, 246, 96, 80) + P('M108 232 Q200 260 292 232 L294 256 Q200 286 106 256 Z') + P('M138 172 Q200 116 262 172 Z') + C(200, 124, 15) +
      Ln('M180 92 q-12 -18 0 -34 q12 -16 0 -34 M222 92 q-12 -18 0 -34 q12 -16 0 -34') },
    { name: 'a butterfly', idea: 'Try two different colours on each wing.', svg: BG +
      P('M194 190 C120 76 36 88 58 172 C70 214 140 216 194 206 Z') + P('M206 190 C280 76 364 88 342 172 C330 214 260 216 206 206 Z') +
      P('M194 212 C128 222 76 284 118 318 C150 342 186 290 194 232 Z') + P('M206 212 C272 222 324 284 282 318 C250 342 214 290 206 232 Z') +
      C(110, 150, 20) + C(290, 150, 20) + C(140, 280, 14) + C(260, 280, 14) + E(200, 222, 14, 76) + C(200, 136, 18) +
      Ln('M193 122 Q174 84 156 72 M207 122 Q226 84 244 72') },
    { name: 'a sailing boat', idea: 'A bright flag at the top?', svg: Rc(4, 4, 392, 260, 18) + C(70, 70, 34) + E(318, 64, 48, 20) +
      P('M4 258 Q54 242 104 258 T204 258 T304 258 T396 258 L396 392 Q396 396 392 396 L8 396 Q4 396 4 392 Z') +
      Rc(195, 50, 10, 200) + P('M210 76 L210 238 L326 238 Z') + P('M190 98 L190 238 L104 238 Z') + P('M205 50 L205 76 L244 63 Z') +
      P('M84 250 L324 250 L292 304 L118 304 Z') + Ln('M40 340 q20 -12 40 0 t40 0 M250 360 q20 -12 40 0 t40 0') },
    { name: 'a hot air balloon', idea: 'Stripes look lovely on a balloon.', svg: BG + E(80, 300, 60, 22) + E(330, 120, 50, 20) +
      P('M4 340 Q120 300 220 340 T396 330 L396 392 Q396 396 392 396 L8 396 Q4 396 4 392 Z') +
      P('M200 42 C116 42 88 150 152 232 L180 252 C164 200 168 84 200 42 Z') + P('M200 42 C284 42 312 150 248 232 L220 252 C236 200 232 84 200 42 Z') +
      P('M200 42 C168 84 164 200 180 252 L220 252 C236 200 232 84 200 42 Z') + Rc(176, 296, 48, 40, 6) + Ln('M180 252 L184 296 M220 252 L216 296') },
    { name: 'a cupcake', idea: 'Choose a colour for the cherry on top!', svg: BG +
      P('M120 210 L280 210 L256 340 L144 340 Z') + Ln('M160 214 L170 338 M200 214 V338 M240 214 L230 338') +
      P('M110 214 Q96 170 140 160 Q146 112 200 112 Q254 112 260 160 Q304 170 290 214 Z') + C(200, 98, 20) + Ln('M200 78 q8 -20 24 -24') +
      C(150, 186, 8) + C(250, 186, 8) + C(200, 150, 8) + C(60, 70, 22) + C(340, 320, 22) }
  ];
  const STAR = (x, y, s) => P(`M${x} ${y - s} L${x + s * .29} ${y - s * .4} L${x + s * .95} ${y - s * .31} L${x + s * .48} ${y + s * .15} L${x + s * .59} ${y + s * .81} L${x} ${y + s * .5} L${x - s * .59} ${y + s * .81} L${x - s * .48} ${y + s * .15} L${x - s * .95} ${y - s * .31} L${x - s * .29} ${y - s * .4} Z`);
  const HEART = (x, y, s) => P(`M${x} ${y + s * .8} C${x - s * 1.3} ${y - s * .1} ${x - s * .6} ${y - s} ${x} ${y - s * .3} C${x + s * .6} ${y - s} ${x + s * 1.3} ${y - s * .1} ${x} ${y + s * .8} Z`);
  const SWATCHES = [['Red', '#FF5A4E'], ['Orange', '#FF9A3C'], ['Yellow', '#FFD23F'], ['Green', '#3CC46B'], ['Dark green', '#1F8C46'], ['Sky blue', '#7CC8FF'],
    ['Blue', '#2F6FD6'], ['Purple', '#A98BFF'], ['Pink', '#F79AC0'], ['Brown', '#9A6B45'], ['Grey', '#A7B0B6'], ['White', '#FFFFFF']];
  let colourLast = -1;
  function startColour(L0, api) {
    const L = lvl(L0), done = finisher(api);
    let picIdx = (L - 1) % PICS.length;
    if (L > PICS.length || picIdx === colourLast) { do picIdx = randInt(PICS.length); while (picIdx === colourLast && PICS.length > 1); }
    let colour = pick(SWATCHES.slice(0, 9)), undo = [], fills = 0;
    const root = el('div', 'gt-cwrap'); api.stage.append(root);
    const box = el('div', 'gt-svgbox'), name = el('p', 'gt-cname'), sw = el('div', 'gt-sw'), row = el('div', 'gt-row');
    root.append(box, name, sw, row);
    function drawPic() {
      const pic = PICS[picIdx]; colourLast = picIdx; undo = [];
      const mirror = Math.random() < .5;
      // a little extra to colour on later levels: corner stars and hearts (kept clear of the middle)
      const nExtra = L <= 2 ? 0 : Math.min(4, 1 + Math.floor((L - 3) / 3));
      const corners = shuffle([[38, 362], [362, 362], [38, 38], [362, 38]]).slice(0, nExtra);
      const extras = corners.map(([x, y]) => (Math.random() < .5 ? STAR : HEART)(x, y, 22)).join('');
      box.innerHTML = `<svg viewBox="0 0 400 400" role="img" aria-label="Picture of ${pic.name} to colour in"><g${mirror ? ' transform="translate(400 0) scale(-1 1)"' : ''}>${pic.svg}</g>${extras}</svg>`;
      box.querySelectorAll('.gt-rg').forEach(r => {
        r.setAttribute('fill', '#FFFFFF');
        r.addEventListener('click', () => {
          const prev = r.getAttribute('fill'); if (prev === colour[1]) return;
          undo.push([r, prev]); r.setAttribute('fill', colour[1]); fills++;
          tone(420 + (fills % 8) * 45, .12, 'triangle', .1);
          if (fills === 6) toast(cheer());
        });
      });
      api.hint(`Colour in ${pic.name}. Pick a colour, then tap a space to fill it. ${pic.idea}`);
    }
    function drawSwatches() {
      sw.innerHTML = '';
      SWATCHES.forEach(s => {
        const b = el('button', 'tile gt-swatch' + (s === colour ? ' gt-on' : ''), s === colour ? '✓' : ''); b.type = 'button';
        b.style.setProperty('--c', s[1]); b.style.setProperty('--d', `color-mix(in srgb, ${s[1]} 68%, #000)`);
        b.setAttribute('aria-label', s[0]); b.setAttribute('aria-pressed', s === colour);
        b.onclick = () => { colour = s; sfx.tap(); drawSwatches(); };
        sw.append(b);
      });
      name.textContent = 'Colour: ' + colour[0];
    }
    row.append(
      mkBtn('↶ Undo', 'c-card', () => { const u = undo.pop(); if (u) { u[0].setAttribute('fill', u[1]); sfx.tap(); } else toast('Nothing to undo'); }),
      mkBtn('🖼️ Another picture', 'c-sky', () => { sfx.tap(); let n; do n = randInt(PICS.length); while (n === picIdx); picIdx = n; drawPic(); }),
      mkBtn('✓ Finished!', 'c-leaf', () => { sfx.good(); api.hint('What a beautiful picture!'); done(3); })
    );
    drawPic(); drawSwatches();
  }

  /* ---------- register ---------- */
  [
    { id: 'match', order: 1, name: 'Picture Match', icon: '🖼️', desc: 'Find the picture that is the same', start: startMatch },
    { id: 'jigsaw', order: 2, name: 'Jigsaw', icon: '🧩', desc: 'Swap the pieces to make a picture', start: startJigsaw },
    { id: 'singalong', order: 3, name: 'Sing-Along Bingo', icon: '🎵', desc: 'Listen to a tune and find the song', start: startSingalong },
    { id: 'dominoes', order: 4, name: 'Picture Dominoes', icon: '🎲', desc: 'Match the pictures to add a domino', start: startDominoes },
    { id: 'photopairs', order: 5, name: 'Photo Pairs', icon: '📷', desc: 'Find pairs with your own photos', start: startPhotos },
    { id: 'snap', order: 6, name: 'Snap Together', icon: '🃏', desc: 'Turn the cards and spot a match', start: startSnap },
    { id: 'talk', order: 7, name: 'Talk About It', icon: '💬', desc: 'Picture cards to chat about together', start: startTalk },
    { id: 'colour', order: 8, name: 'Colour In', icon: '🎨', desc: 'Tap to fill a picture with colour', start: startColour }
  ].forEach(g => register(Object.assign({ cat: 'gentle', gentle: true }, g)));
})();
