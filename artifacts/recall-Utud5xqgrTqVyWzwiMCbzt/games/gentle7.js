/* Recall: Gentle Games 7. What's Wrong Here?, Rock Pooling, Window Spotting and Seasonal Decorating.
   Picture-led, unhurried and impossible to fail. Scenes are drawn with inline SVG, emoji and canvas. */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, cheer, starsFor } = R;

  const lvl = L => Math.max(1, Math.floor(+L || 1));
  const mkBtn = (label, cls, fn) => { const b = el('button', 'btn ' + cls, label); b.type = 'button'; if (fn) b.onclick = fn; return b; };
  let uid = 0;
  const nid = p => 'g7' + p + (++uid);
  const rnd = (a, b) => a + Math.random() * (b - a);
  function burst(box, x, y, n, chars) {
    for (let i = 0; i < n; i++) {
      const s = el('span', 'g7-spark', pick(chars || ['✨', '⭐', '💫']));
      const a = Math.PI * 2 * i / n + Math.random() * .5, d = 34 + Math.random() * 56;
      s.style.left = x + '%'; s.style.top = y + '%';
      s.style.setProperty('--dx', (Math.cos(a) * d).toFixed(1) + 'px'); s.style.setProperty('--dy', (Math.sin(a) * d).toFixed(1) + 'px');
      s.addEventListener('animationend', () => s.remove());
      box.append(s);
    }
  }
  const rising = k => { tone(523 * Math.pow(1.122, Math.min(k, 10)), .16, 'triangle', .13); tone(784 * Math.pow(1.122, Math.min(k, 10)), .2, 'sine', .08, .07); };

  R.css(`
.g7-wrap{max-width:640px;margin:0 auto;display:grid;gap:12px;justify-items:center}
.g7-row{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:10px}
.g7-pill{font:600 1.2rem/1 var(--display);background:rgba(0,0,0,.22);color:var(--on-table);padding:.6em 1em;border-radius:999px;white-space:nowrap}
.g7-spark{position:absolute;pointer-events:none;font-size:24px;line-height:1;z-index:20;animation:g7-spark .85s ease-out forwards}
@keyframes g7-spark{0%{opacity:1;transform:translate(-50%,-50%) scale(.4)}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(1.25)}}
@keyframes g7-pop{0%{transform:translate(-50%,-50%) scale(.2);opacity:0}60%{transform:translate(-50%,-50%) scale(1.18);opacity:1}100%{transform:translate(-50%,-50%) scale(1)}}

/* ---------- What's Wrong Here? ---------- */
.g7w-scene{position:relative;width:min(100%,600px);aspect-ratio:4/3;border-radius:22px;overflow:hidden;cursor:pointer;container-type:inline-size;
  box-shadow:0 0 0 6px #FFF9EF,0 7px 0 6px var(--card-edge),0 16px 28px rgba(0,0,0,.35);touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.g7w-bg{position:absolute;inset:0;width:100%;height:100%;display:block}
.g7w-it{position:absolute;transform:translate(-50%,-50%) rotate(var(--r,0deg));font-size:calc(var(--s) * 1cqw);line-height:1;pointer-events:none;filter:drop-shadow(0 2px 1px rgba(0,0,0,.25))}
.g7w-it svg{display:block}
.g7w-rel{position:relative;display:inline-block}
.g7w-on{position:absolute;font-style:normal;line-height:1}
.g7w-bub{position:absolute;left:62%;top:-48%;font:700 .36em/1 var(--display);background:#fff;color:var(--ink);padding:.28em .45em;border-radius:1em;white-space:nowrap;box-shadow:0 2px 0 rgba(0,0,0,.2)}
.g7w-chalk{font:600 1em/1 var(--display);color:#F4F7EE;white-space:nowrap;letter-spacing:.04em;text-shadow:0 0 2px rgba(255,255,255,.4)}
.g7w-it.g7w-flat{filter:none}
.g7w-ring{position:absolute;width:calc(var(--d) * 1cqw);aspect-ratio:1;border-radius:50%;border:5px solid #FF3D7F;box-shadow:0 0 0 3px #fff,inset 0 0 0 3px #fff;transform:translate(-50%,-50%);pointer-events:none;animation:g7-pop .45s cubic-bezier(.3,1.6,.5,1);z-index:3}
.g7w-ring::after{content:"✓";position:absolute;right:-6px;top:-8px;width:26px;height:26px;border-radius:50%;background:var(--leaf);color:#fff;font:700 17px/26px var(--display);text-align:center;box-shadow:0 2px 0 var(--leaf-d)}
.g7w-glow{position:absolute;width:calc(var(--d) * 1cqw);aspect-ratio:1;border-radius:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:2;
  background:radial-gradient(circle,rgba(255,240,140,.55),rgba(255,240,140,0) 70%);animation:g7w-glow 1s ease-in-out infinite}
@keyframes g7w-glow{50%{transform:translate(-50%,-50%) scale(1.25);opacity:.6}}
.g7w-note{position:absolute;z-index:4;max-width:62cqw;width:max-content;background:#fff;color:var(--ink);font:700 clamp(17px,4.4cqw,24px)/1.2 var(--display);text-align:center;
  padding:.45em .7em;border-radius:16px;box-shadow:0 4px 0 var(--card-edge),0 8px 16px rgba(0,0,0,.3);pointer-events:none;animation:g7w-note .4s cubic-bezier(.3,1.6,.5,1);transition:opacity .4s}
@keyframes g7w-note{from{opacity:0;scale:.6}}
.g7w-tap{position:absolute;width:44px;height:44px;border-radius:50%;border:4px solid rgba(255,255,255,.85);transform:translate(-50%,-50%);pointer-events:none;animation:g7w-tap .5s ease-out forwards;z-index:5}
@keyframes g7w-tap{to{width:70px;height:70px;opacity:0}}

/* ---------- Rock Pooling ---------- */
.g7r-pool{position:relative;width:min(100%,560px);aspect-ratio:4/3;container-type:inline-size;border-radius:44% 40% 42% 38% / 38% 44% 36% 42%;
  background:radial-gradient(circle at 20% 15%,#B9B0A2 0 6%,transparent 7%),radial-gradient(circle at 85% 80%,#A39A8C 0 7%,transparent 8%),radial-gradient(circle at 90% 20%,#C9BFAE 0 5%,transparent 6%),linear-gradient(160deg,#A79D8E,#7C7366);
  box-shadow:inset 0 6px 0 rgba(255,255,255,.25),inset 0 -8px 0 rgba(0,0,0,.2),0 8px 0 #554D42,0 16px 26px rgba(0,0,0,.35)}
.g7r-water{position:absolute;inset:6% 5%;border-radius:46% 42% 44% 40% / 40% 46% 38% 44%;overflow:hidden;
  background:radial-gradient(circle at 25% 80%,#E9D7A6 0 9%,transparent 10%),radial-gradient(circle at 75% 75%,#E3CF9C 0 8%,transparent 9%),radial-gradient(ellipse at 50% 40%,#84E2E6 0%,#3FB5C9 55%,#1F8AA6 100%);
  box-shadow:inset 0 10px 18px rgba(0,40,60,.35)}
.g7r-caus{position:absolute;inset:-25%;pointer-events:none;z-index:6;opacity:.55;
  background:repeating-radial-gradient(circle at 30% 40%,rgba(255,255,255,0) 0 18px,rgba(255,255,255,.22) 21px 23px,rgba(255,255,255,0) 26px 40px),
             repeating-radial-gradient(circle at 70% 60%,rgba(255,255,255,0) 0 24px,rgba(255,255,255,.16) 27px 29px,rgba(255,255,255,0) 32px 50px);
  animation:g7r-drift 10s ease-in-out infinite alternate}
@keyframes g7r-drift{from{transform:translate(-3%,-2%) rotate(0deg)}to{transform:translate(3%,3%) rotate(4deg)}}
.g7r-spot{position:absolute;width:21cqw;height:17cqw;transform:translate(-50%,-50%)}
.g7r-thing{position:absolute;left:50%;top:52%;transform:translate(-50%,-50%);font-size:10cqw;line-height:1;visibility:hidden;filter:drop-shadow(0 2px 2px rgba(0,0,0,.3))}
.g7r-thing svg{width:1em;height:1em;display:block}
.g7r-thing.show{visibility:visible;animation:g7-pop .4s cubic-bezier(.3,1.6,.5,1),g7r-bob 2.2s ease-in-out .4s infinite}
.g7r-thing.gone{animation:g7r-catch .7s ease-in forwards}
@keyframes g7r-bob{50%{translate:0 -6%}}
@keyframes g7r-catch{0%{transform:translate(-50%,-50%) scale(1)}40%{transform:translate(-50%,-120%) scale(1.3)}100%{transform:translate(60%,-200%) scale(0);opacity:0}}
.g7r-sand{font:700 7cqw/1 var(--display);color:#C7A86A;letter-spacing:.1em}
.g7r-cover{position:absolute;inset:-6% -4%;border:0;background:none;padding:0;cursor:pointer;z-index:4;transition:transform .45s cubic-bezier(.3,1.4,.5,1),opacity .45s;-webkit-tap-highlight-color:transparent}
.g7r-cover svg{width:100%;height:100%;display:block;overflow:visible}
.g7r-cover.up{transform:translate(34%,-48%) rotate(20deg) scale(.82);opacity:.5;pointer-events:none}
.g7r-cover.wobble{animation:g7r-wig .5s ease-in-out 3}
@keyframes g7r-wig{25%{transform:rotate(-8deg)}75%{transform:rotate(8deg)}}
.g7r-sway{transform-origin:50px 74px;animation:g7r-sway 3.4s ease-in-out infinite}
@keyframes g7r-sway{50%{transform:rotate(5deg)}}
.g7r-ripple{position:absolute;width:10cqw;aspect-ratio:1;border-radius:50%;border:3px solid rgba(255,255,255,.8);transform:translate(-50%,-50%);pointer-events:none;z-index:7;animation:g7r-rip .9s ease-out forwards}
@keyframes g7r-rip{to{width:34cqw;opacity:0}}
.g7r-bar{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap}
.g7r-bucket{position:relative;width:96px;height:86px;flex:none}
.g7r-bucket::before{content:"";position:absolute;left:14px;right:14px;top:-4px;height:44px;border:5px solid #6F7A84;border-bottom:0;border-radius:50px 50px 0 0}
.g7r-pail{position:absolute;left:4px;right:4px;top:22px;bottom:0;clip-path:polygon(0 0,100% 0,86% 100%,14% 100%);overflow:hidden;
  background:linear-gradient(90deg,rgba(255,255,255,.35),rgba(255,255,255,0) 40%),repeating-linear-gradient(90deg,#FF6B4A 0 14px,#FFC234 14px 28px)}
.g7r-fill{position:absolute;left:0;right:0;bottom:0;height:0;background:linear-gradient(#7FE0E6cc,#2A9CC0ee);transition:height .6s cubic-bezier(.3,1.4,.5,1)}
.g7r-rim{position:absolute;left:0;right:0;top:18px;height:10px;border-radius:6px;background:#E2E7EB;box-shadow:0 3px 0 #9AA4AD}
.g7r-bin{position:absolute;left:8px;right:8px;top:0;height:26px;display:flex;justify-content:center;font-size:22px;line-height:1;z-index:2}
.g7r-bin span{margin:0 -4px;animation:g7-pop .4s ease-out;transform:none!important}
.g7r-bin span svg{width:22px;height:22px}

/* ---------- Window Spotting ---------- */
.g7t-win{position:relative;width:min(100%,600px);padding:12px;border-radius:30px;background:linear-gradient(160deg,#A8693A,#7A4A28 60%,#5A361C);
  box-shadow:inset 0 4px 0 rgba(255,255,255,.25),inset 0 -6px 0 rgba(0,0,0,.25),0 7px 0 #3E2412,0 16px 26px rgba(0,0,0,.35)}
.g7t-win canvas{display:block;width:100%;aspect-ratio:520/320;border-radius:20px;cursor:pointer;touch-action:manipulation;background:#A6DDFF;box-shadow:inset 0 0 0 3px rgba(0,0,0,.2)}
.g7t-glass{position:absolute;inset:12px;border-radius:20px;pointer-events:none;background:linear-gradient(115deg,rgba(255,255,255,.18) 0 12%,rgba(255,255,255,0) 13% 30%,rgba(255,255,255,.1) 31% 36%,rgba(255,255,255,0) 37%);box-shadow:inset 0 0 0 4px rgba(255,255,255,.15)}
.g7t-slots{display:flex;gap:8px;align-items:center}
.g7t-slot{width:58px;height:58px;border-radius:18px;font-size:34px;filter:grayscale(1);opacity:.45}
.g7t-slot svg{width:40px;height:40px}
.g7t-slot.on{filter:none;opacity:1;--c:var(--good-bg);--d:var(--leaf);animation:g7-pop2 .45s cubic-bezier(.3,1.6,.5,1)}
@keyframes g7-pop2{0%{transform:scale(.4)}60%{transform:scale(1.2)}100%{transform:scale(1)}}

/* ---------- Seasonal Decorating ---------- */
.g7s-wrap{display:grid;gap:12px;justify-items:center;max-width:860px;margin:0 auto}
.g7s-pick{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.g7s-pick .tile{width:58px;height:58px;font-size:32px;cursor:pointer;border-radius:18px;transition:transform .15s}
.g7s-pick .tile.on{outline:5px solid var(--sun);outline-offset:2px;transform:translateY(-3px)}
.g7s-main{display:grid;gap:12px;justify-items:center;width:100%}
@media (min-width:700px){.g7s-main{grid-template-columns:minmax(0,360px) minmax(0,330px);justify-content:center;align-items:center;gap:22px}}
.g7s-base{position:relative;width:min(100%,290px);aspect-ratio:1;border-radius:26px;overflow:hidden;container-type:inline-size;
  box-shadow:0 0 0 6px #FFF9EF,0 7px 0 6px var(--card-edge),0 16px 28px rgba(0,0,0,.35)}
@media (min-width:700px){.g7s-base{width:100%}}
.g7s-base > svg.g7s-bsvg{position:absolute;inset:0;width:100%;height:100%;display:block}
.g7s-pl{position:absolute;transform:translate(-50%,-50%);font-size:calc(var(--s) * 1cqw);line-height:1;border:0;background:none;padding:.08em;cursor:pointer;
  filter:drop-shadow(0 2px 2px rgba(0,0,0,.3));animation:g7-pop .45s cubic-bezier(.3,1.6,.5,1);-webkit-tap-highlight-color:transparent}
.g7s-pl svg{display:block}
.g7s-pl.out{animation:g7s-out .3s ease-in forwards;pointer-events:none}
@keyframes g7s-out{to{transform:translate(-50%,-50%) scale(0) rotate(30deg);opacity:0}}
.g7s-ov{inset:0;transform:none;padding:0;pointer-events:none;animation:g7s-fade .4s ease-out}
.g7s-ov svg{width:100%;height:100%}
.g7s-ov svg *{pointer-events:visiblePainted}
@keyframes g7s-fade{from{opacity:0}}
.g7s-ov.out{animation:g7s-fadeout .3s ease-in forwards}
@keyframes g7s-fadeout{to{opacity:0}}
.g7s-tw{animation:g7s-tw 1.4s ease-in-out infinite}
.g7s-tw:nth-child(2n){animation-delay:.5s}.g7s-tw:nth-child(3n){animation-delay:.9s}
@keyframes g7s-tw{50%{opacity:.35}}
.g7s-egg{cursor:pointer}
.g7s-egg.sel .g7s-ring{stroke:#fff;stroke-width:1.6;stroke-dasharray:3 2;animation:g7s-dash 1.2s linear infinite}
@keyframes g7s-dash{to{stroke-dashoffset:-10}}
.g7s-pal{display:grid;grid-template-columns:repeat(5,58px);gap:8px;justify-content:center}
@media (min-width:700px){.g7s-pal{grid-template-columns:repeat(5,60px)}}
.g7s-it{position:relative;width:58px;height:58px;border-radius:18px;font-size:32px;cursor:pointer;padding:0}
.g7s-it svg{width:42px;height:42px}
.g7s-it.on{--c:var(--good-bg);outline:4px solid var(--leaf);outline-offset:1px}
.g7s-side{display:grid;gap:12px;justify-items:center}
`);

  /* =====================================================================
     1. WHAT'S WRONG HERE?
     ===================================================================== */
  const svgW = (vb, w, h, body) => `<svg viewBox="${vb}" width="${w}em" height="${h}em" aria-hidden="true">${body}</svg>`;
  function clockSvg(bad) {
    const nums = bad ? ['12', '3', '6', '13'] : ['12', '3', '6', '9'], pos = [[50, 25], [77, 52], [50, 80], [25, 52]];
    return svgW('0 0 100 100', 1, 1, `<circle cx="50" cy="50" r="47" fill="#C4432A"/><circle cx="50" cy="50" r="39" fill="#FFFDF5"/>` +
      nums.map((n, i) => `<text x="${pos[i][0]}" y="${pos[i][1]}" text-anchor="middle" dominant-baseline="middle" font-family="Fredoka,sans-serif" font-weight="700" font-size="${n.length > 1 ? 19 : 22}" fill="#18242C">${n}</text>`).join('') +
      `<path d="M50 50 L50 33 M50 50 L63 58" stroke="#18242C" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="50" r="4" fill="#18242C"/>`);
  }
  function picSvg(bad) {
    return svgW('0 0 100 80', 1.2, .96, `<rect x="2" y="2" width="96" height="76" rx="5" fill="#9C6538"/><rect x="10" y="10" width="80" height="60" fill="#9FD8FF"/>
      <g${bad ? ' transform="rotate(180 50 40)"' : ''}><rect x="10" y="52" width="80" height="18" fill="#5CC46B"/><circle cx="74" cy="25" r="8" fill="#FFC234"/>
      <rect x="27" y="36" width="24" height="17" fill="#FF8FA8"/><path d="M23 37 L39 24 L55 37Z" fill="#C4432A"/><rect x="35" y="43" width="7" height="10" fill="#7A4A28"/></g>`);
  }
  function teapotSvg(bad) {
    const sR = `<path d="M84 60 Q100 58 112 34" stroke="#1D70C0" stroke-width="10" fill="none" stroke-linecap="round"/>`;
    const sL = `<path d="M36 60 Q20 58 8 34" stroke="#1D70C0" stroke-width="10" fill="none" stroke-linecap="round"/>`;
    const handle = `<path d="M34 44 C10 42 10 74 36 72" stroke="#1D70C0" stroke-width="8" fill="none"/>`;
    return svgW('0 0 120 90', 1.33, 1, (bad ? sL : handle) + sR + `<ellipse cx="60" cy="60" rx="30" ry="25" fill="#45AEFF"/><ellipse cx="60" cy="37" rx="17" ry="5" fill="#1D70C0"/><circle cx="60" cy="29" r="6" fill="#1D70C0"/>
      <circle cx="49" cy="56" r="4" fill="#fff"/><circle cx="64" cy="66" r="4" fill="#fff"/><circle cx="72" cy="52" r="3" fill="#fff"/><ellipse cx="47" cy="49" rx="7" ry="4" fill="rgba(255,255,255,.45)"/>`);
  }
  function trafficSvg(bad) {
    const c = bad ? ['#3CC46B', '#FFC234', '#FF4A3A'] : ['#FF4A3A', '#FFC234', '#3CC46B'];
    return svgW('0 0 40 110', .4, 1.1, `<rect x="17" y="60" width="6" height="50" fill="#56616B"/><rect x="4" y="2" width="32" height="66" rx="8" fill="#2B3138"/>` +
      c.map((col, i) => `<circle cx="20" cy="${15 + i * 20}" r="8" fill="${col}"/>`).join(''));
  }
  function carSvg(bad) {
    const wheels = bad ? `<rect x="21" y="43" width="22" height="22" fill="#2B3138"/><rect x="79" y="43" width="22" height="22" fill="#2B3138"/>`
      : `<circle cx="32" cy="54" r="11" fill="#2B3138"/><circle cx="90" cy="54" r="11" fill="#2B3138"/><circle cx="32" cy="54" r="4" fill="#ccc"/><circle cx="90" cy="54" r="4" fill="#ccc"/>`;
    return svgW('0 0 120 70', 1.4, .82, `<path d="M8 50 L12 32 L36 28 L46 12 L84 12 L96 28 L112 32 L114 50Z" fill="#FF6B4A"/><path d="M50 16 L80 16 L90 28 L42 28Z" fill="#CDEFFF"/><rect x="8" y="44" width="106" height="6" fill="#C4432A"/>` + wheels);
  }
  const E = (ch, extra) => `<span class="g7w-rel">${ch}${extra || ''}</span>`;
  const on = (ch, l, t, r, s) => `<i class="g7w-on" style="left:${l}%;top:${t}%;font-size:${s || .36}em;transform:translate(-50%,-50%) rotate(${r || 0}deg)">${ch}</i>`;
  const bub = w => `<b class="g7w-bub">${w}</b>`;
  const chalk = t => `<span class="g7w-chalk">${t}</span>`;

  const MIST = [
    { k: 'fishtree', t: ['ground', 'sand'], note: () => 'Fish don’t climb trees!', make: sc => ({ html: E(sc.tree, on('🐟', 34, 28, -50) + on('🐟', 64, 44, 40)), s: 18 }) },
    { k: 'carrot', t: ['ground'], note: () => 'Carrots grow in the ground, not on trees!', make: () => ({ html: E('🌳', on('🥕', 30, 32, 20) + on('🥕', 64, 26, -20) + on('🥕', 50, 50, 10)), s: 18 }) },
    { k: 'clock', t: ['wall'], note: () => 'That clock has a 13 on it!', make: () => ({ html: clockSvg(true), s: 16 }) },
    { k: 'pic', t: ['wall'], note: () => 'That picture is upside down!', make: () => ({ html: picSvg(true), s: 14 }) },
    { k: 'woof', t: ['floor', 'ground', 'sand'], note: () => 'Cats don’t say woof!', make: () => ({ html: E('🐈', bub('Woof!')), s: 12 }) },
    { k: 'snow', t: ['sand', 'ground', 'hearth'], note: t => t === 'hearth' ? 'A snowman by the fire? He’ll melt!' : t === 'sand' ? 'Snow on a sunny beach?' : 'A snowman on a summer’s day?', make: () => ({ html: E('⛄', on('❄️', -8, 10, 0, .34) + on('❄️', 104, 30, 0, .3)), s: 12 }) },
    { k: 'teapot', t: ['table'], note: () => 'That teapot has two spouts and no handle!', make: () => ({ html: teapotSvg(true), s: 11 }) },
    { k: 'shoe', t: ['table'], note: () => 'Shoes don’t go on the table!', make: () => ({ html: E('👞'), s: 11 }) },
    { k: 'pig', t: ['sky'], note: () => 'Pigs can’t fly!', make: () => ({ html: E('🐖'), s: 11 }) },
    { k: 'moon', t: ['sky'], note: () => 'The moon, out in the daytime?', make: () => ({ html: E('🌙'), s: 10 }) },
    { k: 'boat', t: ['road'], note: () => 'Boats don’t sail on roads!', make: () => ({ html: E('⛵'), s: 12 }) },
    { k: 'sqcar', t: ['road'], note: () => 'Square wheels won’t roll!', make: () => ({ html: carSvg(true), s: 11 }) },
    { k: 'traffic', t: ['post'], note: () => 'Red should be at the top!', make: () => ({ html: trafficSvg(true), s: 16 }) },
    { k: 'house', t: ['ground'], only: ['street'], note: () => 'That house is upside down!', make: () => ({ html: E('🏠'), s: 13, rot: 180 }) },
    { k: 'cow', t: ['floor'], note: (t, sc) => sc.id === 'class' ? 'A cow at school? Moo!' : 'A cow in the house? Moo!', make: () => ({ html: E('🐄'), s: 13 }) },
    { k: 'plant', t: ['floor', 'table'], note: () => 'That plant is upside down!', make: () => ({ html: E('🪴'), s: 11, rot: 180 }) },
    { k: 'flower', t: ['ground'], only: ['garden'], note: () => 'That flower is growing upside down!', make: () => ({ html: E('🌻'), s: 12, rot: 180 }) },
    { k: 'cowswim', t: ['water'], note: () => 'Cows don’t go swimming!', make: () => ({ html: E('🐄'), s: 12 }) },
    { k: 'carsea', t: ['water'], note: () => 'A car in the water? Splash!', make: () => ({ html: E('🚗'), s: 12 }) },
    { k: 'sum', t: ['board'], make: () => { const a = 1 + randInt(4), b = 1 + randInt(4); return { html: chalk(`${a} + ${b} = ${a + b + 1}`), s: 6.5, flat: true, note: `${a} + ${b} makes ${a + b}, not ${a + b + 1}!` }; } },
    { k: 'abc', t: ['board'], make: () => {
      const i = randInt(5), s = 'ABCDEFGH'.slice(i, i + 4).split('');
      return { html: chalk(`${s[0]} ${s[1]} ${s[3]} ${s[2]}`), s: 6.5, flat: true, note: `${s[2]} comes before ${s[3]}!` };
    } },
  ];
  const D = (ch, s, extra) => () => ({ html: E(ch, extra), s });
  const DECOY = {
    ground: [sc => ({ html: E(sc.tree, on(sc.tree === '🌴' ? '🥥' : '🍎', 40, 34) + on(sc.tree === '🌴' ? '🥥' : '🍎', 62, 46)), s: 18 }), D('🐕', 12), D('🌷', 10), D('🐈', 12, bub('Miaow!')), D('🌻', 12)],
    sand: [D('⛱️', 13), D('🪣', 10), D('🦀', 10), D('🐚', 9), () => ({ html: E('🌴', on('🥥', 42, 34) + on('🥥', 58, 40)), s: 18 })],
    sky: [D('🐦', 9), D('☁️', 13), D('🎈', 10)],
    wall: [() => ({ html: clockSvg(false), s: 16 }), () => ({ html: picSvg(false), s: 14 })],
    table: [() => ({ html: teapotSvg(false), s: 11 }), D('🍎', 9), D('📚', 10), D('☕', 9), D('🍞', 10)],
    floor: [D('🐕', 12), D('🧸', 11), D('🐈', 12, bub('Miaow!')), D('🪴', 11)],
    road: [D('🚗', 12), D('🚌', 13), D('🚲', 11), () => ({ html: carSvg(false), s: 11 })],
    water: [D('⛵', 12), D('🦆', 10)],
    post: [() => ({ html: trafficSvg(false), s: 16 })],
    board: [() => { const a = 1 + randInt(4), b = 1 + randInt(4); return { html: chalk(`${a} + ${b} = ${a + b}`), s: 6.5, flat: true }; },
      () => { const i = randInt(5); return { html: chalk('ABCDEFGH'.slice(i, i + 4).split('').join(' ')), s: 6.5, flat: true }; }],
    hearth: [D('🔥', 12)],
  };
  const pickets = (y1, y2) => { let s = ''; for (let x = 4; x < 400; x += 22) s += `<path d="M${x} ${y2} V${y1 + 6} L${x + 6} ${y1} L${x + 12} ${y1 + 6} V${y2}Z" fill="#FFF9EF"/>`; return s + `<rect y="${y1 + 12}" width="400" height="5" fill="#EADFCB"/>`; };
  const houses = () => [[8, 82, 72, '#FFB892', '#C4432A'], [96, 92, 56, '#A98BFF', '#6F4FD0'], [196, 80, 76, '#FFE08A', '#C46512'], [284, 108, 62, '#9FE0C8', '#2A9C80']]
    .map(([x, w, y, c, r]) => `<rect x="${x}" y="${y}" width="${w}" height="${172 - y}" fill="${c}"/><path d="M${x - 6} ${y} L${x + w / 2} ${y - 26} L${x + w + 6} ${y}Z" fill="${r}"/>` +
      `<rect x="${x + 12}" y="${y + 14}" width="18" height="18" fill="#CDEFFF" stroke="#fff" stroke-width="3"/><rect x="${x + w - 30}" y="${y + 14}" width="18" height="18" fill="#CDEFFF" stroke="#fff" stroke-width="3"/>`).join('');
  const SCENES = [
    { id: 'kitchen', name: 'in this kitchen', tree: '🌳', slots: [['wall', 205, 68], ['wall', 325, 66], ['table', 190, 152], ['table', 270, 152], ['table', 350, 152], ['floor', 60, 255], ['floor', 252, 262], ['sky', 80, 76]],
      bg: `<rect width="400" height="215" fill="#FCE7C4"/><path d="M0 130 H400" stroke="#F3D4A2" stroke-width="2"/><rect y="215" width="400" height="85" fill="#C98F5E"/><path d="M0 242H400M0 270H400" stroke="#B07A4C" stroke-width="3"/>
        <rect y="208" width="400" height="8" fill="#E8C99A"/><rect x="30" y="30" width="100" height="92" rx="6" fill="#A6DDFF" stroke="#fff" stroke-width="7"/>
        <path d="M22 24 Q44 70 28 128 L14 128 L14 24Z" fill="#FF8FA8"/><path d="M138 24 Q116 70 132 128 L146 128 L146 24Z" fill="#FF8FA8"/><rect x="10" y="18" width="140" height="8" rx="4" fill="#C4432A"/>
        <rect x="150" y="175" width="240" height="14" rx="4" fill="#A8693A"/><rect x="162" y="189" width="12" height="74" fill="#7A4A28"/><rect x="366" y="189" width="12" height="74" fill="#7A4A28"/>` },
    { id: 'garden', name: 'in this garden', tree: '🌳', slots: [['sky', 60, 46], ['sky', 170, 38], ['sky', 272, 52], ['ground', 50, 205], ['ground', 140, 252], ['ground', 228, 200], ['ground', 335, 182], ['water', 310, 255]],
      bg: `<rect width="400" height="170" fill="#A6DDFF"/><circle cx="352" cy="44" r="24" fill="#FFD447"/><path d="M0 150 Q100 112 200 140 T400 128 V175 H0Z" fill="#8FD28A"/>
        <rect y="165" width="400" height="135" fill="#62C25E"/>${pickets(138, 168)}<ellipse cx="310" cy="258" rx="64" ry="22" fill="#4FA8E8"/><ellipse cx="296" cy="252" rx="22" ry="5" fill="rgba(255,255,255,.4)"/>` },
    { id: 'street', name: 'on this street', tree: '🌳', slots: [['sky', 58, 30], ['sky', 196, 24], ['sky', 330, 26], ['ground', 66, 162], ['ground', 196, 166], ['ground', 296, 162], ['post', 368, 156], ['road', 110, 236], ['road', 272, 236]],
      bg: `<rect width="400" height="175" fill="#A6DDFF"/>${houses()}<rect y="170" width="400" height="30" fill="#D9D4CC"/><rect y="200" width="400" height="72" fill="#5C6670"/>
        <path d="M0 236 H400" stroke="#fff" stroke-width="4" stroke-dasharray="26 18"/><rect y="272" width="400" height="28" fill="#D9D4CC"/>` },
    { id: 'class', name: 'in this classroom', tree: '🌳', slots: [['board', 210, 52], ['board', 210, 98], ['wall', 55, 72], ['wall', 358, 72], ['table', 115, 168], ['table', 285, 168], ['floor', 60, 264], ['floor', 200, 266], ['floor', 345, 264]],
      bg: `<rect width="400" height="215" fill="#DCEFD0"/><rect x="112" y="18" width="196" height="112" rx="6" fill="#A8693A"/><rect x="120" y="26" width="180" height="96" fill="#2F5D46"/><rect x="120" y="122" width="180" height="6" fill="#7A4A28"/>
        <rect y="215" width="400" height="85" fill="#D7A86E"/><path d="M0 245H400M0 275H400" stroke="#C0915A" stroke-width="3"/>
        <rect x="55" y="190" width="120" height="12" rx="3" fill="#45AEFF"/><rect x="64" y="202" width="8" height="48" fill="#56616B"/><rect x="158" y="202" width="8" height="48" fill="#56616B"/>
        <rect x="225" y="190" width="120" height="12" rx="3" fill="#45AEFF"/><rect x="234" y="202" width="8" height="48" fill="#56616B"/><rect x="328" y="202" width="8" height="48" fill="#56616B"/>` },
    { id: 'beach', name: 'on this beach', tree: '🌴', slots: [['sky', 170, 44], ['sky', 290, 38], ['sky', 372, 78], ['water', 110, 166], ['water', 245, 170], ['water', 360, 168], ['sand', 60, 248], ['sand', 172, 262], ['sand', 282, 245], ['sand', 360, 262]],
      bg: `<rect width="400" height="140" fill="#A6DDFF"/><circle cx="60" cy="44" r="24" fill="#FFD447"/><rect y="130" width="400" height="84" fill="#3FA2DE"/>
        <path d="M0 150 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="#BDE8FF" stroke-width="3" fill="none"/>
        <path d="M0 186 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="#BDE8FF" stroke-width="3" fill="none"/>
        <path d="M0 204 Q200 186 400 206 V300 H0Z" fill="#F5D99A"/><circle cx="120" cy="286" r="3" fill="#E0BE78"/><circle cx="240" cy="290" r="3" fill="#E0BE78"/>` },
    { id: 'living', name: 'in this living room', tree: '🌳', slots: [['wall', 58, 70], ['wall', 200, 58], ['sky', 330, 73], ['hearth', 200, 190], ['table', 300, 210], ['table', 364, 210], ['floor', 60, 262], ['floor', 168, 270]],
      bg: `<rect width="400" height="215" fill="#F7DCE5"/>${[...Array(16)].map((_, i) => `<rect x="${i * 26 + 8}" width="8" height="215" fill="#F1C9D6"/>`).join('')}
        <rect x="280" y="28" width="100" height="90" rx="6" fill="#A6DDFF" stroke="#fff" stroke-width="7"/>
        <rect x="140" y="112" width="120" height="103" fill="#B5523B"/><path d="M140 140H260M140 168H260M140 196H260" stroke="#9C4430" stroke-width="2"/><path d="M162 215 V162 Q200 132 238 162 V215Z" fill="#3A2410"/><rect x="130" y="104" width="140" height="12" rx="3" fill="#7A4A28"/>
        <rect y="215" width="400" height="85" fill="#9C6538"/><ellipse cx="120" cy="264" rx="104" ry="26" fill="#FF9A3C"/><ellipse cx="120" cy="264" rx="80" ry="17" fill="#FFC234"/>
        <rect x="270" y="232" width="120" height="10" rx="3" fill="#7A4A28"/><rect x="280" y="242" width="7" height="40" fill="#5A361C"/><rect x="373" y="242" width="7" height="40" fill="#5A361C"/>` },
  ];

  function buildScene(sc, n) {
    let best = null;
    for (let tries = 0; tries < 40; tries++) {
      const slots = shuffle(sc.slots.map((s, i) => ({ t: s[0], x: s[1], y: s[2], i })));
      const pool = shuffle(MIST.filter(m => !m.only || m.only.includes(sc.id)));
      const used = new Set(), picks = [];
      for (const m of pool) {
        if (picks.length >= n) break;
        const s = slots.find(s => !used.has(s.i) && m.t.includes(s.t));
        if (s) { used.add(s.i); picks.push({ m, s }); }
      }
      const res = { picks, free: slots.filter(s => !used.has(s.i)) };
      if (!best || picks.length > best.picks.length) best = res;
      if (picks.length >= n) break;
    }
    return best;
  }

  register({ id: 'wronghere', cat: 'gentle', order: 45, name: 'What’s Wrong Here?', icon: '🤪', desc: 'Spot the silly mistakes in a funny picture', gentle: true, start: startWrong });

  function startWrong(level, api) {
    const L = lvl(level);
    const n = Math.min(6, 3 + Math.floor((L - 1) / 3));
    const nDecoy = Math.min(5, 1 + Math.floor(L / 2));
    const total = 2;
    let round = 0, misses = 0, hints = 0;
    const order = shuffle(SCENES.slice());
    const wrap = el('div', 'g7-wrap'); api.stage.append(wrap);
    api.rounds(total, 0);
    play(order[0]);

    function play(sc) {
      wrap.innerHTML = '';
      const box = el('div', 'g7w-scene');
      box.innerHTML = `<svg class="g7w-bg" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">${sc.bg}</svg>`;
      const put = (o, s) => {
        const d = el('div', 'g7w-it' + (o.flat ? ' g7w-flat' : ''), o.html);
        d.style.setProperty('--s', o.s); if (o.rot) d.style.setProperty('--r', o.rot + 'deg');
        d.style.left = (s.x / 4) + '%'; d.style.top = (s.y / 3) + '%';
        box.append(d); return d;
      };
      const { picks, free } = buildScene(sc, n);
      const items = picks.map(p => { const o = p.m.make(sc, p.s.t); put(o, p.s); return { x: p.s.x, y: p.s.y, s: o.s, note: o.note || p.m.note(p.s.t, sc), found: false }; });
      const decoys = [];
      let left = nDecoy;
      free.forEach(s => {
        if (s.t !== 'hearth' && left <= 0) return;
        if (s.t !== 'hearth') left--;
        const o = pick(DECOY[s.t])(sc); put(o, s); decoys.push({ x: s.x, y: s.y });
      });
      const N = items.length;
      box._wh = items;
      let found = 0, glow = null, noteEl = null;
      const count = el('div', 'g7-pill');
      const setCount = () => { count.textContent = `Found ${found} of ${N}`; };
      setCount();
      const hintB = mkBtn('💡 Hint', 'c-sun', () => {
        const rest = items.filter(i => !i.found); if (!rest.length) return;
        hints++; sfx.tap(); const it = pick(rest);
        if (glow) glow.remove();
        glow = el('div', 'g7w-glow'); glow.style.setProperty('--d', it.s + 16); glow.style.left = (it.x / 4) + '%'; glow.style.top = (it.y / 3) + '%';
        box.append(glow); const g = glow;
        api.later(() => { g.remove(); if (glow === g) glow = null; }, 3200);
        api.hint('Look where it’s glowing. Something silly is there!');
      });
      wrap.append(box, el('div', 'g7-row'));
      wrap.lastChild.append(hintB, count);
      api.hint(`Something is silly ${sc.name}! Find ${N} funny mistakes and tap them.`);

      box.addEventListener('click', e => {
        if (found >= N) return;
        const r = box.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width * 400, y = (e.clientY - r.top) / r.height * 300;
        const tap = el('div', 'g7w-tap'); tap.style.left = (x / 4) + '%'; tap.style.top = (y / 3) + '%'; box.append(tap); tap.addEventListener('animationend', () => tap.remove());
        let bestI = null, bd = 1e9;
        items.forEach(it => { const d = Math.hypot(it.x - x, it.y - y), tol = it.s >= 16 ? 66 : 56; if (d < tol && d < bd) { bd = d; bestI = it; } });
        if (bestI && !bestI.found) return hit(bestI);
        if (bestI && bestI.found) { sfx.tap(); api.hint('You found that one already. Well spotted!'); return; }
        const nearDecoy = decoys.some(d => Math.hypot(d.x - x, d.y - y) < 46);
        misses++; sfx.soft(); wob(box);
        api.hint(nearDecoy ? 'That one looks just right to me. Keep looking!' : 'Nothing silly just there. Have another look.');
      });

      function hit(it) {
        it.found = true; found++; setCount();
        if (glow) { glow.remove(); glow = null; }
        rising(found); sfx.good();
        const ring = el('div', 'g7w-ring'); ring.style.setProperty('--d', it.s * .85 + 7); ring.style.left = (it.x / 4) + '%'; ring.style.top = (it.y / 3) + '%'; box.append(ring);
        burst(box, it.x / 4, it.y / 3, 7);
        if (noteEl) noteEl.remove();
        const note = el('div', 'g7w-note', it.note); noteEl = note;
        const nx = Math.max(24, Math.min(76, it.x / 4));
        note.style.left = nx + '%'; note.style.transform = 'translateX(-50%)';
        const off = (it.s * .85 + 7) / 2 * 1.333 + 2; // half the ring in % of height
        if (it.y < 150) note.style.top = (it.y / 3 + off) + '%'; else { note.style.bottom = (100 - it.y / 3 + off) + '%'; }
        box.append(note);
        api.later(() => { note.style.opacity = '0'; api.later(() => note.remove(), 450); }, 2800);
        const rest = N - found;
        api.hint(it.note + (rest ? `  ${rest} more to find.` : ''));
        if (!rest) {
          api.later(() => { sfx.win(); R.toast(cheer()); round++; api.rounds(total, round); api.hint('You found every silly thing!'); }, 900);
          api.later(() => { if (round >= total) api.done(starsFor(misses + hints, 2, 5)); else play(order[round]); }, 3200);
        }
      }
    }
  }

  /* =====================================================================
     2. ROCK POOLING
     ===================================================================== */
  const starPts = (() => { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 19 : 46; p.push((50 + r * Math.cos(a)).toFixed(1) + ',' + (52 + r * Math.sin(a)).toFixed(1)); } return p.join(' '); })();
  const starfish = `<svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="${starPts}" fill="#FF8A3C" stroke="#C4561A" stroke-width="4" stroke-linejoin="round"/><circle cx="50" cy="52" r="6" fill="#FFC27A"/><circle cx="50" cy="28" r="3" fill="#FFC27A"/><circle cx="72" cy="45" r="3" fill="#FFC27A"/><circle cx="63" cy="72" r="3" fill="#FFC27A"/><circle cx="37" cy="72" r="3" fill="#FFC27A"/><circle cx="28" cy="45" r="3" fill="#FFC27A"/></svg>`;
  const CRE = [
    { k: 'crab', one: 'crab', many: 'crabs', html: '🦀' },
    { k: 'star', one: 'starfish', many: 'starfish', html: starfish },
    { k: 'shell', one: 'shell', many: 'shells', html: '🐚' },
    { k: 'fish', one: 'little fish', many: 'little fish', html: '🐠' },
    { k: 'shrimp', one: 'shrimp', many: 'shrimps', html: '🦐' },
  ];
  function rockSvg() {
    const c = pick(['#8C969B', '#A1958A', '#7F8C93', '#9AA19A', '#A89C8C']);
    const p = pick(['M8 62 C4 40 20 18 44 14 C66 10 92 24 94 48 C96 66 80 72 50 72 C26 72 10 70 8 62Z', 'M6 60 C6 36 26 20 50 20 C76 20 96 34 94 56 C92 70 74 72 50 72 C24 72 6 70 6 60Z', 'M10 64 C2 44 16 16 40 18 C52 8 82 14 90 36 C100 56 86 72 52 72 C30 74 14 72 10 64Z']);
    return `<svg viewBox="0 0 100 80" aria-hidden="true"><ellipse cx="50" cy="72" rx="44" ry="7" fill="rgba(0,0,0,.25)"/><path d="${p}" fill="${c}"/><path d="M8 62 C30 70 70 72 94 52 C92 66 80 72 50 72 C26 72 10 70 8 62Z" fill="rgba(0,0,0,.2)"/>
      <ellipse cx="38" cy="30" rx="16" ry="7" fill="rgba(255,255,255,.35)" transform="rotate(-15 38 30)"/><circle cx="66" cy="42" r="3.5" fill="#EEE8D8"/><circle cx="72" cy="48" r="2.5" fill="#EEE8D8"/><circle cx="30" cy="52" r="3" fill="#EEE8D8"/><path d="M56 26 l5 -6 l5 6z" fill="#D9CFC0"/></svg>`;
  }
  function weedSvg() {
    const g = pick([['#2F9E5A', '#4CC274', '#1F7A44'], ['#7BA83A', '#A3C94B', '#5E8A2A'], ['#C4563A', '#E07A55', '#963C26']]);
    return `<svg viewBox="0 0 100 80" aria-hidden="true"><ellipse cx="50" cy="73" rx="42" ry="7" fill="rgba(0,0,0,.22)"/><g class="g7r-sway">
      <path d="M50 74 C18 70 4 48 12 20 C24 44 34 52 50 60Z" fill="${g[0]}"/><path d="M50 74 C82 70 96 48 88 18 C76 42 66 52 50 60Z" fill="${g[0]}"/>
      <path d="M50 74 C32 60 28 30 42 4 C52 30 58 50 50 74Z" fill="${g[1]}"/><path d="M50 74 C68 60 74 32 62 8 C54 32 46 52 50 74Z" fill="${g[2]}"/>
      <ellipse cx="50" cy="64" rx="38" ry="14" fill="${g[2]}"/><ellipse cx="40" cy="58" rx="14" ry="5" fill="${g[1]}" opacity=".7"/></g></svg>`;
  }

  register({ id: 'rockpool', cat: 'gentle', order: 46, name: 'Rock Pooling', icon: '🦀', desc: 'Lift stones and seaweed to find sea creatures', gentle: true, start: startPool });

  function startPool(level, api) {
    const L = lvl(level);
    const nCover = Math.min(12, 6 + Math.floor((L - 1) / 2));
    const N = Math.min(4, 2 + Math.floor((L - 1) / 4));
    const rounds = 3, totalCatch = N * rounds;
    const kinds = shuffle(CRE.slice());
    let round = 0, caught = 0, misses = 0;
    const wrap = el('div', 'g7-wrap'); api.stage.append(wrap);
    const pool = el('div', 'g7r-pool'), water = el('div', 'g7r-water');
    pool.append(water);
    const bar = el('div', 'g7r-bar');
    const bucket = el('div', 'g7r-bucket', '<div class="g7r-pail"><div class="g7r-fill"></div></div><div class="g7r-rim"></div><div class="g7r-bin"></div>');
    const count = el('div', 'g7-pill');
    let spots = [];
    const hintB = mkBtn('💡 Hint', 'c-sun', () => {
      const s = spots.find(s => s.c === kinds[round] && !s.up);
      if (!s) return;
      misses += .5; sfx.tap(); wob(s.cover);
      api.hint(`Try under the wobbly one!`);
    });
    bar.append(hintB, bucket, count);
    wrap.append(pool, bar);
    const setCount = () => { count.textContent = `🪣 ${caught} / ${totalCatch}`; bucket.querySelector('.g7r-fill').style.height = (8 + 70 * caught / totalCatch) + '%'; };
    setCount(); api.rounds(rounds, 0);
    deal();

    function deal() {
      water.innerHTML = '<div class="g7r-caus"></div>';
      const target = kinds[round];
      const others = kinds.filter(k => k !== target);
      const nOther = Math.min(nCover - N - 1, 2 + Math.floor(L / 3));
      const contents = shuffle([...Array(N).fill(target), ...[...Array(nOther)].map(() => pick(others)), ...Array(Math.max(0, nCover - N - nOther)).fill(null)]);
      const cols = nCover <= 6 ? 3 : 4, rows = Math.ceil(nCover / cols);
      const cells = shuffle([...Array(cols * rows)].map((_, i) => i)).slice(0, nCover).sort((a, b) => a - b);
      spots = contents.map((c, i) => {
        const cell = cells[i], cx = cell % cols, cy = Math.floor(cell / cols);
        const x = 12 + (cx + .5) * 76 / cols + rnd(-2.5, 2.5), y = 15 + (cy + .5) * 70 / rows + rnd(-3, 3);
        const sp = el('div', 'g7r-spot'); sp.style.left = x + '%'; sp.style.top = y + '%';
        const thing = el('div', 'g7r-thing', c ? c.html : '<span class="g7r-sand">· ∘ ·</span>');
        const cover = el('button', 'g7r-cover', Math.random() < .5 ? rockSvg() : weedSvg());
        cover.type = 'button'; cover.setAttribute('aria-label', 'Lift this');
        sp.append(thing, cover); water.append(sp);
        const s = { c, x, y, thing, cover, up: false };
        cover.onclick = () => lift(s);
        return s;
      });
      let found = 0;
      water._rp = { spots, target };
      api.hint(`Find ${N} ${N === 1 ? target.one : target.many}! Tap the stones and seaweed to look underneath.`);

      function ripple(s) { const r = el('div', 'g7r-ripple'); r.style.left = s.x + '%'; r.style.top = s.y + '%'; water.append(r); r.addEventListener('animationend', () => r.remove()); }
      function lift(s) {
        if (s.up || found >= N) return;
        s.up = true; s.cover.classList.add('up'); s.thing.classList.add('show'); ripple(s);
        tone(330, .14, 'sine', .08); tone(495, .16, 'sine', .06, .06);
        if (s.c === target) {
          found++; caught++; rising(caught); sfx.good();
          const left = N - found;
          api.hint(`You found ${found === 1 ? 'a' : 'another'} ${target.one}! ` + (left ? `${left} more to find.` : 'That’s all of them!'));
          api.later(() => {
            s.thing.classList.add('gone');
            const bin = bucket.querySelector('.g7r-bin'); const sp = el('span', '', target.html); bin.append(sp);
            while (bin.children.length > 5) bin.firstChild.remove();
            setCount(); wob(bucket); tone(880, .1, 'sine', .08);
          }, 650);
          if (!left) {
            api.later(() => { sfx.win(); R.toast(cheer()); round++; api.rounds(rounds, round); api.hint(`All ${N} ${target.many} are in the bucket!`); }, 1200);
            api.later(() => { if (round >= rounds) api.done(starsFor(Math.floor(misses), Math.round(rounds * (nCover - N) * .6), Math.round(rounds * (nCover - N) * 1.1))); else deal(); }, 3200);
          }
        } else {
          misses++;
          if (s.c) { sfx.tap(); api.hint(`A ${s.c.one}! Lovely, but we’re looking for ${target.many}.`); }
          else { sfx.soft(); api.hint(`Just sand under that one. Try another.`); }
          api.later(() => { if (!s.thing.isConnected) return; s.up = false; s.cover.classList.remove('up'); s.thing.classList.remove('show'); }, s.c ? 1700 : 1200);
        }
      }
    }
  }

  /* =====================================================================
     3. WINDOW SPOTTING
     ===================================================================== */
  const TW = 520, TH = 320;
  const EMO = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const TT = {
    cow: { row: 'front', r: 34, h: 30, one: 'cow', many: 'cows', icon: '🐄' },
    sheep: { row: 'front', r: 32, h: 26, one: 'sheep', many: 'sheep', icon: '🐑' },
    horse: { row: 'front', r: 34, h: 30, one: 'horse', many: 'horses', icon: '🐎' },
    tractor: { row: 'front', r: 32, h: 26, one: 'tractor', many: 'tractors', icon: '🚜' },
    windmill: { row: 'back', r: 46, h: 54, one: 'windmill', many: 'windmills' },
    church: { row: 'back', r: 40, h: 36, one: 'church', many: 'churches', icon: '⛪' },
    village: { row: 'back', r: 42, h: 22, one: 'little village', many: 'villages' },
    lake: { row: 'back', r: 50, h: 4, one: 'lake', many: 'lakes' },
    balloon: { row: 'sky', r: 40, h: 0, one: 'hot-air balloon', many: 'hot-air balloons' },
    tree: { row: 'any', r: 0, h: 0 },
  };
  TT.windmill.icon = `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M15 38 L17 18 L23 18 L25 38Z" fill="#F4EBDD" stroke="#8A6A4A" stroke-width="1.5"/><path d="M16 18 Q20 11 24 18Z" fill="#B5523B"/><g stroke="#7A4A28" stroke-width="3.2" stroke-linecap="round"><path d="M20 15 L7 3 M20 15 L33 3 M20 15 L8 27 M20 15 L32 27"/></g><circle cx="20" cy="15" r="2.4" fill="#5A361C"/></svg>`;
  TT.balloon.icon = `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2 C31 2 36 10 35 17 C34 24 25 28 23 31 H17 C15 28 6 24 5 17 C4 10 9 2 20 2Z" fill="#FF6B4A"/><path d="M20 2 C25 6 26 22 22 31 H18 C14 22 15 6 20 2Z" fill="#FFC234"/><path d="M17 31 L16 34 M23 31 L24 34" stroke="#5A361C"/><rect x="15" y="33" width="10" height="6" rx="1.5" fill="#A8693A"/></svg>`;
  const TARGETS = ['cow', 'sheep', 'windmill', 'church', 'balloon', 'horse'];
  const ROWS = {
    sky: { speed: 9, gap: [220, 380], pool: ['balloon'], start: .4 },
    back: { speed: 17, gap: [110, 190], pool: ['windmill', 'church', 'village', 'lake', 'tree', 'tree', 'windmill', 'church'] },
    front: { speed: 26, gap: [86, 150], pool: ['cow', 'sheep', 'horse', 'tractor', 'tree', 'cow', 'sheep', 'tree'] },
  };
  const FIELD = ['#7CC96B', '#9BD46F', '#E6D27A', '#6DB85E', '#C7DE7A', '#B4D86A'];

  register({ id: 'trainride', cat: 'gentle', order: 47, name: 'Window Spotting', icon: '🚂', desc: 'Spot cows and windmills from a train window', gentle: true, start: startTrain });

  function startTrain(level, api) {
    const L = lvl(level);
    const N = Math.min(4, 2 + Math.floor((L - 1) / 4));
    const rounds = 3;
    const spd = 1 + Math.min(.45, (L - 1) * .03);
    const order = L === 1 ? ['cow', ...shuffle(TARGETS.filter(t => t !== 'cow')).slice(0, 2)] : shuffle(TARGETS.slice()).slice(0, 3);
    let round = 0, found = 0, misses = 0, target = order[0], running = true, speedNow = 1, speedGoal = 1, t = 0, done = false;

    const wrap = el('div', 'g7-wrap'); api.stage.append(wrap);
    const win = el('div', 'g7t-win'); const cv = el('canvas'); win.append(cv, el('div', 'g7t-glass'));
    const row2 = el('div', 'g7-row'); const slots = el('div', 'g7t-slots');
    const stopB = mkBtn('✋ Stop the train', 'c-sky', () => { running = !running; speedGoal = running ? 1 : 0; stopB.textContent = running ? '✋ Stop the train' : '▶ Off we go'; sfx.tap(); if (running) toot(); });
    const helpB = mkBtn('👀 Help', 'c-sun', () => {
      sfx.tap();
      const vis = objs.filter(o => o.type === target && !o.spotted && o.x > 30 && o.x < TW - 30);
      if (vis.length) { vis.sort((a, b) => a.x - b.x); vis[0].help = t + 3; api.hint(`Look where it’s glowing! Tap the ${TT[target].one}.`); }
      else api.hint(`A ${TT[target].one} is coming along soon. Keep watching!`);
    });
    row2.append(slots, stopB, helpB);
    wrap.append(win, row2);

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = TW * dpr; cv.height = TH * dpr;
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const objs = [];
    const rowState = {};
    Object.keys(ROWS).forEach(k => rowState[k] = { gap: 0, since: 0 });
    let fields = [], fx = -20; // field patches
    while (fx < TW + 200) { const w = rnd(110, 210); fields.push({ x: fx, w, c: pick(FIELD), stripes: Math.random() < .5 }); fx += w; }
    const clouds = [...Array(4)].map((_, i) => ({ x: i * 150 + rnd(0, 80), y: rnd(24, 80), s: rnd(.7, 1.2) }));
    let hillOff = 0, hill2Off = 0, meadowOff = 0, fenceOff = 0;

    function spawn(rowK, x) {
      const row = ROWS[rowK], st = rowState[rowK];
      let type;
      const tgtHere = row.pool.includes(target);
      if (tgtHere && (st.since > TW * .55 || Math.random() < .4)) type = target;
      else { const others = row.pool.filter(p => p !== target); type = pick(others.length ? others : row.pool); }
      if (rowK === 'sky' && target !== 'balloon' && Math.random() < .5) { st.gap = rnd(row.gap[0], row.gap[1]); return; }
      if (type === target) st.since = 0;
      const o = { type, row: rowK, x, spotted: false, help: 0, sail: Math.random() * 6,
        y: rowK === 'sky' ? rnd(38, 88) : rowK === 'back' ? 206 : 274, cols: shuffle(['#FF6B4A', '#FFC234', '#45AEFF', '#3CC46B', '#F25A95', '#A98BFF']).slice(0, 2), tree: pick(['🌳', '🌲', '🌳']) };
      objs.push(o);
      st.gap = rnd(row.gap[0], row.gap[1]) * (rowK === 'sky' && target === 'balloon' ? .7 : 1);
    }
    // pre-populate the view
    Object.keys(ROWS).forEach(k => { let x = rnd(10, 60); while (x < TW + 40) { spawn(k, x); x += rowState[k].gap; } rowState[k].gap = x - TW - 40; });

    function drawSlots() {
      slots.innerHTML = '';
      for (let i = 0; i < N; i++) { const s = el('div', 'tile g7t-slot c-card' + (i < found ? ' on' : ''), TT[target].icon); slots.append(s); }
    }
    function startRound() {
      found = 0; target = order[round]; drawSlots(); api.rounds(rounds, round);
      Object.values(rowState).forEach(s => s.since = TW);
      api.hint(`Spot ${N} ${TT[target].many}! Tap them as they go by.`);
    }
    function toot() { tone(392, .22, 'triangle', .1); tone(523, .3, 'triangle', .1, .2); }
    startRound(); toot();

    cv.addEventListener('pointerdown', e => {
      if (done || found >= N) return;
      const r = cv.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width * TW, y = (e.clientY - r.top) / r.height * TH;
      let best = null, bd = 1e9;
      objs.forEach(o => {
        const d = TT[o.type]; if (!d.r) return;
        const cy = o.y - d.h, dist = Math.hypot(o.x - x, cy - y);
        const tol = d.r + (o.type === target ? 36 : 6);
        const score = dist - (o.type === target && !o.spotted ? 30 : 0);
        if (dist < tol && score < bd) { bd = score; best = o; }
      });
      if (!best) return;
      if (best.type === target && !best.spotted) {
        best.spotted = true; best.pop = t; found++; rising(found); sfx.good(); drawSlots();
        if (found >= N) {
          done = round + 1 >= rounds;
          api.hint(`Lovely! You spotted ${N} ${TT[target].many}.`);
          api.later(() => { sfx.win(); R.toast(cheer()); }, 400);
          api.later(() => { round++; if (round >= rounds) { api.rounds(rounds, rounds); api.done(starsFor(misses, 3, 6)); } else startRound(); }, 2400);
        } else api.hint(`Well spotted! ${N - found} more ${N - found === 1 ? TT[target].one : TT[target].many} to find.`);
      } else if (best.type === target) { sfx.tap(); api.hint('You spotted that one already!'); }
      else { misses++; sfx.soft(); api.hint(`That’s a ${TT[best.type].one}. Can you see a ${TT[target].one}?`); }
    });
    cv._tr = { objs, get target() { return target; }, TW, TH, TT };

    let last = performance.now();
    function frame(now) {
      if (!cv.isConnected) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
      speedNow += (speedGoal - speedNow) * Math.min(1, dt * 1.8);
      const k = speedNow * spd * dt;
      // scroll
      hillOff += 3 * k; hill2Off += 6 * k; meadowOff += 26 * k; fenceOff += 40 * k;
      clouds.forEach(c => { c.x -= 4 * k; if (c.x < -90) { c.x = TW + rnd(20, 120); c.y = rnd(24, 80); } });
      fields.forEach(f => f.x -= 17 * k);
      if (fields[0].x + fields[0].w < -10) fields.shift();
      const lf = fields[fields.length - 1]; if (lf.x + lf.w < TW + 60) fields.push({ x: lf.x + lf.w, w: rnd(110, 210), c: pick(FIELD.filter(c => c !== lf.c)), stripes: Math.random() < .5 });
      Object.keys(ROWS).forEach(rk => {
        const d = ROWS[rk].speed * k, st = rowState[rk];
        st.gap -= d; st.since += d;
        if (st.gap <= 0) spawn(rk, TW + 50);
      });
      for (let i = objs.length - 1; i >= 0; i--) { const o = objs[i]; o.x -= ROWS[o.row].speed * k; if (o.x < -80) objs.splice(i, 1); }
      draw();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    function emoji(ch, x, y, size) { ctx.font = `${size}px ${EMO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(ch, x, y); }
    function drawWindmill(x, y, s, ang) {
      ctx.fillStyle = '#F4EBDD'; ctx.strokeStyle = '#8A6A4A'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 16 * s, y); ctx.lineTo(x - 9 * s, y - 60 * s); ctx.lineTo(x + 9 * s, y - 60 * s); ctx.lineTo(x + 16 * s, y); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#B5523B'; ctx.beginPath(); ctx.moveTo(x - 12 * s, y - 58 * s); ctx.quadraticCurveTo(x, y - 80 * s, x + 12 * s, y - 58 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7A4A28'; ctx.fillRect(x - 4 * s, y - 14 * s, 8 * s, 14 * s);
      const hx = x, hy = y - 64 * s;
      for (let i = 0; i < 4; i++) {
        const a = ang + i * Math.PI / 2;
        ctx.save(); ctx.translate(hx, hy); ctx.rotate(a);
        ctx.fillStyle = '#FFFDF5'; ctx.strokeStyle = '#7A4A28'; ctx.lineWidth = 1.5;
        ctx.fillRect(3 * s, -4 * s, 36 * s, 8 * s); ctx.strokeRect(3 * s, -4 * s, 36 * s, 8 * s);
        ctx.beginPath(); for (let j = 1; j < 5; j++) { ctx.moveTo(3 * s + j * 7 * s, -4 * s); ctx.lineTo(3 * s + j * 7 * s, 4 * s); } ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = '#5A361C'; ctx.beginPath(); ctx.arc(hx, hy, 4 * s, 0, 7); ctx.fill();
    }
    function drawBalloon(o) {
      const x = o.x, y = o.y + Math.sin(t * .8 + o.sail) * 4, r = 28;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(x, y + r * 1.45); ctx.bezierCurveTo(x - r * 1.3, y + r * .5, x - r * 1.15, y - r, x, y - r); ctx.bezierCurveTo(x + r * 1.15, y - r, x + r * 1.3, y + r * .5, x, y + r * 1.45); ctx.closePath();
      ctx.fillStyle = o.cols[0]; ctx.fill(); ctx.clip();
      ctx.fillStyle = o.cols[1]; for (let i = -2; i <= 2; i += 2) ctx.fillRect(x + i * r * .3 - r * .15, y - r - 2, r * .3, r * 3);
      ctx.restore();
      ctx.strokeStyle = '#5A361C'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 7, y + r * 1.3); ctx.lineTo(x - 7, y + r * 1.7); ctx.moveTo(x + 7, y + r * 1.3); ctx.lineTo(x + 7, y + r * 1.7); ctx.stroke();
      ctx.fillStyle = '#A8693A'; ctx.fillRect(x - 8, y + r * 1.65, 16, 11);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(x - r * .45, y - r * .3, 5, 10, -.3, 0, 7); ctx.fill();
    }
    function drawObj(o) {
      const d = TT[o.type];
      switch (o.type) {
        case 'cow': emoji('🐄', o.x, o.y, 62); break;
        case 'sheep': emoji('🐑', o.x, o.y, 56); break;
        case 'horse': emoji('🐎', o.x, o.y, 62); break;
        case 'tractor': emoji('🚜', o.x, o.y, 54); break;
        case 'tree': emoji(o.tree, o.x, o.y + 2, o.row === 'back' ? 46 : 60); break;
        case 'church': emoji('⛪', o.x, o.y, 70); break;
        case 'village': emoji('🏡', o.x - 22, o.y, 40); emoji('🏠', o.x + 20, o.y + 2, 36); break;
        case 'windmill': drawWindmill(o.x, o.y, 1.22, t * .7 + o.sail); break;
        case 'balloon': drawBalloon(o); break;
        case 'lake':
          ctx.fillStyle = '#4FA8E8'; ctx.beginPath(); ctx.ellipse(o.x, o.y - 4, 62, 12, 0, 0, 7); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(o.x - 30, o.y - 6); ctx.lineTo(o.x - 8, o.y - 6); ctx.moveTo(o.x + 12, o.y - 1); ctx.lineTo(o.x + 34, o.y - 1); ctx.stroke();
          emoji('🦆', o.x + 18 + Math.sin(t + o.sail) * 4, o.y - 6, 20); break;
      }
      const cy = o.type === 'balloon' ? o.y + Math.sin(t * .8 + o.sail) * 4 + 6 : o.y - d.h;
      if (o.spotted) {
        const age = t - (o.pop || 0), sc = age < .35 ? .5 + age / .35 * .7 : 1.2 - Math.min(.2, (age - .35));
        ctx.strokeStyle = '#FFD34D'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(o.x, cy, (d.r + 6) * sc, 0, 7); ctx.stroke();
        ctx.fillStyle = '#3CC46B'; ctx.beginPath(); ctx.arc(o.x + d.r * .8, cy - d.r * .8, 11, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `700 15px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✓', o.x + d.r * .8, cy - d.r * .8 + 1);
      } else if (o.help > t) {
        ctx.strokeStyle = `rgba(255,255,255,${.6 + .4 * Math.sin(t * 8)})`; ctx.lineWidth = 5; ctx.setLineDash([10, 7]);
        ctx.beginPath(); ctx.arc(o.x, cy, d.r + 12 + Math.sin(t * 6) * 4, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    function draw() {
      const g = ctx.createLinearGradient(0, 0, 0, 170); g.addColorStop(0, '#7FC8FF'); g.addColorStop(1, '#DDF3FF');
      ctx.fillStyle = g; ctx.fillRect(0, 0, TW, TH);
      ctx.fillStyle = '#FFE27A'; ctx.beginPath(); ctx.arc(440, 46, 24, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      clouds.forEach(c => { ctx.beginPath(); ctx.ellipse(c.x, c.y, 30 * c.s, 11 * c.s, 0, 0, 7); ctx.ellipse(c.x - 16 * c.s, c.y + 3, 18 * c.s, 9 * c.s, 0, 0, 7); ctx.ellipse(c.x + 14 * c.s, c.y - 6 * c.s, 18 * c.s, 12 * c.s, 0, 0, 7); ctx.fill(); });
      objs.filter(o => o.row === 'sky').forEach(drawObj);
      // far hills
      ctx.fillStyle = '#B5DDA8'; ctx.beginPath(); ctx.moveTo(0, 180);
      for (let x = 0; x <= TW; x += 10) ctx.lineTo(x, 146 + 12 * Math.sin((x + hillOff) / 70) + 7 * Math.sin((x + hillOff) / 29));
      ctx.lineTo(TW, 180); ctx.fill();
      ctx.fillStyle = '#93CC80'; ctx.beginPath(); ctx.moveTo(0, 185);
      for (let x = 0; x <= TW; x += 10) ctx.lineTo(x, 160 + 8 * Math.sin((x + hill2Off) / 55 + 1) + 5 * Math.sin((x + hill2Off) / 23));
      ctx.lineTo(TW, 185); ctx.fill();
      // fields
      fields.forEach(f => {
        ctx.fillStyle = f.c; ctx.fillRect(f.x, 168, f.w + 1, 82);
        if (f.stripes) { ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 3; ctx.beginPath(); for (let y = 176; y < 250; y += 9) { ctx.moveTo(f.x + 4, y); ctx.lineTo(f.x + f.w - 4, y); } ctx.stroke(); }
        ctx.fillStyle = '#3E8E3A'; ctx.beginPath(); ctx.ellipse(f.x, 209, 5, 41, 0, 0, 7); ctx.fill();
      });
      objs.filter(o => o.row === 'back').sort((a, b) => (a.type === 'lake' ? -1 : 0) - (b.type === 'lake' ? -1 : 0)).forEach(drawObj);
      // meadow
      ctx.fillStyle = '#6CBF5B'; ctx.fillRect(0, 246, TW, 48);
      ctx.strokeStyle = '#4FA548'; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = -(meadowOff % 34); x < TW; x += 34) { ctx.moveTo(x, 262); ctx.lineTo(x + 3, 255); ctx.moveTo(x + 17, 284); ctx.lineTo(x + 20, 277); }
      ctx.stroke();
      objs.filter(o => o.row === 'front').forEach(drawObj);
      // fence and hedge
      ctx.fillStyle = '#3E8E3A'; ctx.fillRect(0, 296, TW, 24);
      ctx.fillStyle = '#4FA548'; for (let x = -(fenceOff % 26); x < TW + 26; x += 26) { ctx.beginPath(); ctx.arc(x, 298, 14, Math.PI, 0); ctx.fill(); }
      ctx.fillStyle = '#A8693A'; ctx.fillRect(0, 290, TW, 5);
      for (let x = -(fenceOff % 60); x < TW + 60; x += 60) ctx.fillRect(x, 282, 7, 38);
    }
  }

  /* =====================================================================
     4. SEASONAL DECORATING
     ===================================================================== */
  const sv = (vb, body, w, h) => `<svg viewBox="${vb}"${w ? ` width="${w}em" height="${h}em"` : ''} aria-hidden="true">${body}</svg>`;
  const bauble = c => sv('0 0 40 46', `<rect x="16" y="0" width="8" height="8" rx="2" fill="#C9A24A"/><circle cx="20" cy="26" r="18" fill="${c}"/><path d="M4 24 Q20 32 36 24" stroke="rgba(255,255,255,.55)" stroke-width="2.5" fill="none"/><circle cx="13" cy="19" r="5" fill="rgba(255,255,255,.6)"/>`, 1, 1.15);
  const lights = () => sv('0 0 100 34', `<path d="M2 6 Q50 30 98 6" stroke="#2F5D46" stroke-width="2" fill="none"/>` +
    [[14, 13, '#FF4A3A'], [32, 19, '#FFC234'], [50, 21, '#45AEFF'], [68, 19, '#3CC46B'], [86, 13, '#F25A95']].map(([x, y, c]) => `<ellipse class="g7s-tw" cx="${x}" cy="${y + 6}" rx="4.5" ry="6.5" fill="${c}"/>`).join(''), 1, .34);
  const tinsel = c => sv('0 0 100 22', `<path d="M2 4 Q50 30 98 4" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round" stroke-dasharray="1 3.2"/><path d="M2 4 Q50 30 98 4" stroke="${c}" stroke-width="3" fill="none" opacity=".7"/>`, 1, .22);
  const scoop = c => sv('0 0 40 34', `<path d="M3 24 C1 8 14 1 20 1 C28 1 39 8 37 24 C34 22 33 30 29 27 C26 25 25 32 20 28 C16 32 14 25 11 27 C7 30 6 22 3 24Z" fill="${c}"/><ellipse cx="13" cy="10" rx="6" ry="3.5" fill="rgba(255,255,255,.45)" transform="rotate(-20 13 10)"/>`, 1, .85);
  const wafer = sv('0 0 20 40', `<rect x="3" y="2" width="14" height="36" rx="2" fill="#E8B866" transform="rotate(12 10 20)"/><path d="M5 10 H17 M5 18 H17 M5 26 H17" stroke="#C48A3A" stroke-width="1.6" transform="rotate(12 10 20)"/>`, .5, 1);
  const sprinkles = sv('0 0 40 30', [[6, 8, 20, '#FF4A3A'], [16, 4, -30, '#45AEFF'], [28, 9, 50, '#FFC234'], [10, 20, -60, '#3CC46B'], [22, 17, 10, '#F25A95'], [33, 22, -20, '#A98BFF'], [20, 26, 70, '#FF9A3C']].map(([x, y, r, c]) => `<rect x="${x}" y="${y}" width="7" height="3" rx="1.5" fill="${c}" transform="rotate(${r} ${x + 3} ${y + 1})"/>`).join(''), 1, .75);
  const carve = body => body.replace(/<(path|circle|polygon|ellipse)/g, '<$1 fill="#FFD34D" stroke="#7A3300" stroke-width="1.6" stroke-linejoin="round"');
  const eyes = {
    round: sv('0 0 60 20', carve('<circle cx="14" cy="10" r="7"/><circle cx="46" cy="10" r="7"/>'), 1, .34),
    tri: sv('0 0 60 20', carve('<polygon points="6,17 14,2 22,17"/><polygon points="38,17 46,2 54,17"/>'), 1, .34),
    happy: sv('0 0 60 20', carve('<path d="M5 15 Q14 0 23 15 Q14 8 5 15Z"/><path d="M37 15 Q46 0 55 15 Q46 8 37 15Z"/>'), 1, .34),
  };
  const noses = { tri: sv('0 0 20 20', carve('<polygon points="10,3 17,16 3,16"/>'), 1, 1), heart: sv('0 0 20 20', carve('<path d="M10 17 C2 11 2 4 6.5 4 C8.5 4 10 6 10 7 C10 6 11.5 4 13.5 4 C18 4 18 11 10 17Z"/>'), 1, 1) };
  const mouths = {
    smile: sv('0 0 60 24', carve('<path d="M3 5 Q30 34 57 5 Q30 18 3 5Z"/>'), 1, .4),
    teeth: sv('0 0 60 24', carve('<path d="M3 4 Q30 34 57 4 L50 9 L46 5 L40 12 L34 8 L28 13 L22 8 L16 12 L11 6 L8 9Z"/>'), 1, .4),
  };
  const witch = sv('0 0 40 40', `<ellipse cx="20" cy="34" rx="19" ry="5" fill="#2B2238"/><path d="M8 34 L22 2 L30 34Z" fill="#3A2F4F"/><rect x="9" y="27" width="21" height="5" fill="#A98BFF"/><rect x="17" y="27" width="5" height="5" fill="#FFC234"/>`, 1, 1);
  const ribbon = c => sv('0 0 100 100', `<path d="M24.6 52 Q50 59 75.4 52 L76 61 Q50 68 24 61Z" fill="${c}"/><path d="M24.6 54 Q50 61 75.4 54" stroke="rgba(255,255,255,.5)" stroke-width="1" fill="none"/>`);
  const ribIcon = c => sv('0 0 40 40', `<path d="M4 14 Q20 22 36 14 L36 24 Q20 32 4 24Z" fill="${c}"/><circle cx="20" cy="22" r="5" fill="${c}" stroke="#fff" stroke-width="1.5"/>`, 1, 1);

  // Easter egg patterns, drawn inside a clip path
  function patBody(p, cx, cy, w, h) {
    let s = `<rect x="${cx - w * 1.3}" y="${cy - h - 2}" width="${w * 2.6}" height="${h * 2 + 4}" fill="${p.c2}"/>`;
    const x0 = cx - w * 1.3, x1 = cx + w * 1.3;
    if (p.pat === 'stripes') for (let y = cy - h + 3; y < cy + h; y += 7) s += `<rect x="${x0}" y="${y}" width="${w * 2.6}" height="3.4" fill="${p.c1}"/>`;
    if (p.pat === 'dots') for (let y = cy - h + 3, r = 0; y < cy + h; y += 6, r++) for (let x = x0 + (r % 2) * 3; x < x1; x += 6) s += `<circle cx="${x}" cy="${y}" r="1.8" fill="${p.c1}"/>`;
    if (p.pat === 'zigzag') for (let y = cy - h + 4; y < cy + h; y += 8) { let d = `M${x0} ${y}`; for (let x = x0, k = 0; x < x1; x += 4, k++) d += ` L${x + 4} ${y + (k % 2 ? 0 : 3.5)}`; s += `<path d="${d}" stroke="${p.c1}" stroke-width="2" fill="none"/>`; }
    if (p.pat === 'wavy') for (let y = cy - h + 4; y < cy + h; y += 7) { let d = `M${x0} ${y}`; for (let x = x0; x < x1; x += 8) d += ` q2 -3 4 0 t4 0`; s += `<path d="${d}" stroke="${p.c1}" stroke-width="2" fill="none"/>`; }
    if (p.pat === 'hearts' || p.pat === 'stars') { const ch = p.pat === 'hearts' ? '♥' : '★'; for (let y = cy - h + 6, r = 0; y < cy + h + 4; y += 7, r++) for (let x = x0 + (r % 2) * 3.5; x < x1; x += 7) s += `<text x="${x}" y="${y}" font-size="6" text-anchor="middle" fill="${p.c1}">${ch}</text>`; }
    return s;
  }
  const eggPath = (cx, cy, w, h) => `M${cx} ${cy - h} C${cx + w} ${cy - h} ${cx + w * 1.18} ${cy + h * .9} ${cx} ${cy + h} C${cx - w * 1.18} ${cy + h * .9} ${cx - w} ${cy - h} ${cx} ${cy - h}Z`;
  const eggIcon = p => { const id = nid('ec'); return sv('0 0 40 40', `<clipPath id="${id}"><path d="${eggPath(20, 20, 12, 17)}"/></clipPath><g clip-path="url(#${id})">${patBody(p, 20, 20, 12, 17)}</g><path d="${eggPath(20, 20, 12, 17)}" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.2"/>`, 1, 1); };

  const THEMES = [
    { id: 'xmas', name: 'Christmas tree', icon: '🎄', bg: 'linear-gradient(#2B4C7E,#3E6BA8 70%)', what: 'tree',
      base: `<rect y="86" width="100" height="14" fill="#C98F5E"/><polygon points="50,40 9,85 91,85" fill="#21843F"/><polygon points="50,24 17,61 83,61" fill="#28914A"/><polygon points="50,10 25,41 75,41" fill="#2E9E52"/>
        <rect x="45" y="85" width="10" height="5" fill="#7A4A28"/><path d="M36 88 H64 L61 98 H39Z" fill="#C4432A"/><circle cx="12" cy="12" r=".8" fill="#fff"/><circle cx="86" cy="22" r=".8" fill="#fff"/><circle cx="20" cy="34" r=".6" fill="#fff"/><circle cx="90" cy="8" r=".7" fill="#fff"/>`,
      sets: { tree: [[50, 31], [42, 36], [58, 36], [50, 45], [36, 52], [64, 52], [27, 57], [73, 57], [50, 55], [43, 64], [58, 64], [30, 72], [70, 72], [20, 79], [80, 79], [50, 75], [39, 80], [62, 80]],
        tinsel: [[50, 37, .6], [50, 57, .85], [50, 79, 1.1]], floor: [[16, 91], [84, 91], [27, 94], [73, 94]] },
      slots: { top: [50, 9] },
      items: [
        { n: 'red bauble', icon: bauble('#FF4A3A'), s: 8, set: 'tree' }, { n: 'blue bauble', icon: bauble('#45AEFF'), s: 8, set: 'tree' },
        { n: 'gold bauble', icon: bauble('#FFC234'), s: 8, set: 'tree' }, { n: 'purple bauble', icon: bauble('#A98BFF'), s: 8, set: 'tree' },
        { n: 'lights', icon: lights(), s: 22, set: 'tree' }, { n: 'gold tinsel', icon: tinsel('#FFC234'), s: 56, set: 'tinsel', z: 1 },
        { n: 'silver tinsel', icon: tinsel('#AEBFCC'), s: 56, set: 'tinsel', z: 1 }, { n: 'star', icon: '⭐', s: 15, slot: 'top' },
        { n: 'bell', icon: '🔔', s: 8, set: 'tree' }, { n: 'present', icon: '🎁', s: 13, set: 'floor' },
      ], hint: 'Tap a decoration to hang it on the tree. Tap one on the tree to take it off.' },
    { id: 'easter', name: 'Easter eggs', icon: '🥚', bg: 'linear-gradient(#BDE6FF,#E6F7FF 70%)', what: 'eggs', eggs: [[24, 58, 13, 17], [50, 51, 15, 20], [76, 58, 13, 17]],
      base: `<circle cx="86" cy="14" r="8" fill="#FFE27A"/><path d="M0 74 Q25 66 50 72 T100 70 V100 H0Z" fill="#5CC46B"/><path d="M0 84 Q30 78 60 84 T100 82 V100 H0Z" fill="#4CB35C"/>`,
      sets: { grass: [[10, 87], [36, 90], [64, 90], [90, 87], [50, 94], [22, 95], [78, 95]], air: [[14, 18], [50, 14], [30, 28], [70, 26], [62, 10]] },
      slots: {},
      items: [
        { n: 'red stripes', pat: 'stripes', c1: '#FF6B4A', c2: '#FFE08A' }, { n: 'blue dots', pat: 'dots', c1: '#fff', c2: '#45AEFF' },
        { n: 'purple zigzags', pat: 'zigzag', c1: '#A98BFF', c2: '#FFF1B8' }, { n: 'pink hearts', pat: 'hearts', c1: '#F25A95', c2: '#FFD6E4' },
        { n: 'yellow stars', pat: 'stars', c1: '#FFC234', c2: '#3CC46B' }, { n: 'orange waves', pat: 'wavy', c1: '#FF9A3C', c2: '#C8F0FF' },
        { n: 'chick', icon: '🐣', s: 10, set: 'grass', z: 3 }, { n: 'bunny', icon: '🐰', s: 11, set: 'grass', z: 3 },
        { n: 'tulip', icon: '🌷', s: 9, set: 'grass', z: 3 }, { n: 'butterfly', icon: '🦋', s: 9, set: 'air' },
      ], hint: 'Tap a pattern to paint the egg with the dotted ring. Tap an egg to choose it.' },
    { id: 'pumpkin', name: 'Halloween pumpkin', icon: '🎃', bg: 'linear-gradient(#2B2147,#4A3570 75%)', what: 'pumpkin',
      base: `<circle cx="84" cy="16" r="9" fill="#FFF3C4"/><circle cx="80" cy="13" r="9" fill="#3B2C5C"/><rect y="88" width="100" height="12" fill="#3E2A4F"/>
        <ellipse cx="50" cy="62" rx="40" ry="28" fill="#F27B12"/><ellipse cx="50" cy="62" rx="27" ry="28" fill="#FF8A1F"/><ellipse cx="50" cy="62" rx="12" ry="28" fill="#FF9A3C"/>
        <path d="M23 40 Q16 62 23 85 M77 40 Q84 62 77 85 M37 35 Q33 62 37 89 M63 35 Q67 62 63 89" stroke="#D96A0C" stroke-width="1.2" fill="none"/>
        <path d="M47 36 Q45 28 52 22 L56 25 Q51 29 53 36Z" fill="#5E7A2A"/><path d="M53 27 Q62 20 66 26 Q58 26 54 30Z" fill="#7BA83A"/>`,
      sets: { air: [[14, 16], [30, 9], [66, 9], [12, 36], [88, 38]], ground: [[8, 91], [92, 91], [22, 94], [78, 94]] },
      slots: { eyes: [50, 54], nose: [50, 64], mouth: [50, 75], top: [50, 25] },
      items: [
        { n: 'round eyes', icon: eyes.round, s: 34, slot: 'eyes' }, { n: 'triangle eyes', icon: eyes.tri, s: 34, slot: 'eyes' }, { n: 'happy eyes', icon: eyes.happy, s: 34, slot: 'eyes' },
        { n: 'triangle nose', icon: noses.tri, s: 10, slot: 'nose' }, { n: 'heart nose', icon: noses.heart, s: 10, slot: 'nose' },
        { n: 'big smile', icon: mouths.smile, s: 40, slot: 'mouth' }, { n: 'toothy grin', icon: mouths.teeth, s: 40, slot: 'mouth' },
        { n: 'witch’s hat', icon: witch, s: 26, slot: 'top' }, { n: 'bat', icon: '🦇', s: 10, set: 'air' }, { n: 'candle', icon: '🕯️', s: 9, set: 'ground' },
      ], hint: 'Tap the eyes, nose and mouth to carve a friendly face. Tap one again to take it off.' },
    { id: 'sundae', name: 'Ice cream sundae', icon: '🍨', bg: 'linear-gradient(#FFE9A8,#FFF6DA 70%)', what: 'sundae',
      base: `<rect y="88" width="100" height="12" fill="#FFB892"/><path d="M0 88 H100" stroke="#fff" stroke-width="1.5" stroke-dasharray="4 4"/>
        <path d="M16 56 H84 Q82 77 57 81 H43 Q18 77 16 56Z" fill="rgba(205,239,255,.75)" stroke="#9FD3F0" stroke-width="1.5"/><rect x="47" y="80" width="6" height="8" fill="#BFE6F7"/><ellipse cx="50" cy="89" rx="16" ry="3" fill="#BFE6F7"/>
        <path d="M22 60 Q26 72 36 76" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/>`,
      sets: { scoop: [[35, 52], [65, 52], [50, 38]], tops: [[30, 42], [70, 42], [40, 30], [60, 30], [50, 50], [24, 52], [76, 52]] },
      slots: { top: [50, 21] }, seq: { scoop: true },
      items: [
        { n: 'strawberry scoop', icon: scoop('#FF8FB1'), s: 30, set: 'scoop', z: 1 }, { n: 'vanilla scoop', icon: scoop('#FFF3D1'), s: 30, set: 'scoop', z: 1 },
        { n: 'chocolate scoop', icon: scoop('#8B5A2B'), s: 30, set: 'scoop', z: 1 }, { n: 'mint scoop', icon: scoop('#9BE8C5'), s: 30, set: 'scoop', z: 1 },
        { n: 'lemon scoop', icon: scoop('#FFE36E'), s: 30, set: 'scoop', z: 1 }, { n: 'cherry', icon: '🍒', s: 12, slot: 'top', z: 4 },
        { n: 'wafer', icon: wafer, s: 18, set: 'tops', z: 3 }, { n: 'strawberry', icon: '🍓', s: 9, set: 'tops', z: 3 },
        { n: 'sprinkles', icon: sprinkles, s: 10, set: 'tops', z: 3 }, { n: 'banana', icon: '🍌', s: 10, set: 'tops', z: 3 },
      ], hint: 'Tap the scoops and toppings to build a sundae. Tap one in the glass to take it off.' },
    { id: 'bonnet', name: 'Spring bonnet', icon: '👒', bg: 'linear-gradient(#D7F5C8,#F4FFE9 70%)', what: 'bonnet',
      base: `<ellipse cx="50" cy="66" rx="46" ry="16" fill="#E2BC6E"/><ellipse cx="50" cy="66" rx="40" ry="12" fill="none" stroke="#C9A055" stroke-width=".8" stroke-dasharray="2 2"/><ellipse cx="50" cy="66" rx="33" ry="9" fill="none" stroke="#C9A055" stroke-width=".8" stroke-dasharray="2 2"/>
        <path d="M24 62 Q24 26 50 26 Q76 26 76 62Z" fill="#F0D08C"/><path d="M27 48 Q50 42 73 48 M25 56 Q50 50 75 56 M30 38 Q50 32 70 38" stroke="#D9B46A" stroke-width=".9" fill="none" stroke-dasharray="2 2"/>`,
      sets: { hat: [[30, 52], [40, 48], [60, 48], [70, 52], [50, 46], [18, 66], [82, 66], [33, 72], [67, 72], [50, 76], [44, 36], [58, 34]], air: [[14, 18], [86, 20], [20, 88], [80, 88]] },
      slots: { band: null, bow: [76, 58], top: [50, 22] },
      items: [
        { n: 'pink ribbon', icon: ribIcon('#FF8FA8'), place: ribbon('#FF8FA8'), overlay: true, slot: 'band', z: 1 },
        { n: 'blue ribbon', icon: ribIcon('#45AEFF'), place: ribbon('#45AEFF'), overlay: true, slot: 'band', z: 1 },
        { n: 'yellow ribbon', icon: ribIcon('#FFC234'), place: ribbon('#FFC234'), overlay: true, slot: 'band', z: 1 },
        { n: 'bow', icon: '🎀', s: 14, slot: 'bow', z: 3 }, { n: 'blossom', icon: '🌸', s: 10, set: 'hat', z: 2 }, { n: 'daisy', icon: '🌼', s: 10, set: 'hat', z: 2 },
        { n: 'tulip', icon: '🌷', s: 10, set: 'hat', z: 2 }, { n: 'sunflower', icon: '🌻', s: 10, set: 'hat', z: 2 },
        { n: 'butterfly', icon: '🦋', s: 10, set: 'air', z: 2 }, { n: 'little chick', icon: '🐤', s: 12, slot: 'top', z: 3 },
      ], hint: 'Tap the flowers and ribbons to trim the bonnet. Tap one on the hat to take it off.' },
  ];
  function seasonFor(d) {
    const m = d.getMonth() + 1, day = d.getDate();
    if (m === 12 || (m === 11 && day >= 15) || (m === 1 && day <= 6)) return 'xmas';
    if (m === 10 || m === 11) return 'pumpkin';
    if (m === 3 || m === 4) return 'easter';
    if (m >= 6 && m <= 9) return 'sundae';
    return 'bonnet';
  }

  register({ id: 'seasonal', cat: 'gentle', order: 48, name: 'Seasonal Decorating', icon: '🎄', desc: 'Decorate a tree, eggs or a pumpkin', gentle: true, start: startSeasonal });

  function startSeasonal(level, api) {
    let theme = THEMES.find(t => t.id === seasonFor(new Date())) || THEMES[0];
    let finished = false;
    const wrap = el('div', 'g7s-wrap'); api.stage.append(wrap);
    const picker = el('div', 'g7s-pick');
    THEMES.forEach(th => {
      const b = el('button', 'tile c-card', th.icon); b.type = 'button'; b.setAttribute('aria-label', th.name); b.dataset.id = th.id;
      b.onclick = () => { if (finished || th === theme) return; sfx.tap(); theme = th; build(); };
      picker.append(b);
    });
    const main = el('div', 'g7s-main');
    wrap.append(picker, main);
    build();

    function build() {
      [...picker.children].forEach(b => b.classList.toggle('on', b.dataset.id === theme.id));
      main.innerHTML = '';
      const th = theme;
      const base = el('div', 'g7s-base'); base.style.background = th.bg;
      base.innerHTML = `<svg class="g7s-bsvg" viewBox="0 0 100 100" aria-hidden="true">${th.base}</svg>`;
      const bsvg = base.firstChild;
      const side = el('div', 'g7s-side');
      const pal = el('div', 'g7s-pal');
      const doneB = mkBtn('✓ All done!', 'c-leaf', finish);
      side.append(pal, doneB);
      main.append(base, side);
      api.hint(th.hint);

      const slotUse = {}; const setUse = {}; Object.keys(th.sets).forEach(k => setUse[k] = th.sets[k].map(() => null));
      const btns = [];
      let placedCount = 0;

      // Easter eggs
      const eggs = [];
      let sel = 0;
      if (th.eggs) {
        th.eggs.forEach(([cx, cy, w, h], i) => {
          const id = nid('egg');
          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'g7s-egg');
          g.innerHTML = `<ellipse cx="${cx}" cy="${cy + h + 1}" rx="${w}" ry="2.5" fill="rgba(0,0,0,.18)"/><clipPath id="${id}"><path d="${eggPath(cx, cy, w, h)}"/></clipPath><path d="${eggPath(cx, cy, w, h)}" fill="#FFFDF5"/><g clip-path="url(#${id})" class="g7s-pat"></g>
            <ellipse cx="${cx - w * .4}" cy="${cy - h * .45}" rx="${w * .22}" ry="${h * .16}" fill="rgba(255,255,255,.55)"/><path class="g7s-ring" d="${eggPath(cx, cy, w + 1.8, h + 1.8)}" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="1"/>`;
          bsvg.append(g);
          const egg = { g, cx, cy, w, h, pat: null };
          g.addEventListener('click', () => { if (finished) return; sel = i; sfx.tap(); markSel(); api.hint('Now tap a pattern to paint this egg.'); });
          eggs.push(egg);
        });
        markSel();
      }
      function markSel() { eggs.forEach((e, i) => e.g.classList.toggle('sel', i === sel)); }

      function refreshBtns() {
        btns.forEach(({ b, it }) => {
          let onNow = false;
          if (it.slot) onNow = slotUse[it.slot] && slotUse[it.slot].it === it;
          else if (it.set) onNow = setUse[it.set].some(u => u && u.it === it);
          else if (it.pat) onNow = eggs[sel] && eggs[sel].pat === it;
          b.classList.toggle('on', !!onNow);
        });
      }
      function makePlaced(it, pos) {
        const d = el('button', 'g7s-pl' + (it.overlay ? ' g7s-ov' : ''), it.place || it.icon);
        d.type = 'button'; d.setAttribute('aria-label', 'Take off the ' + it.n);
        if (!it.overlay) { d.style.left = pos[0] + '%'; d.style.top = pos[1] + '%'; d.style.setProperty('--s', it.s * (pos[2] || 1)); }
        d.style.zIndex = it.z || 2;
        base.append(d);
        return d;
      }
      function remove(d) { d.classList.add('out'); d.addEventListener('animationend', () => d.remove()); }
      function sparkAt(pos) { burst(base, pos ? pos[0] : 50, pos ? pos[1] : 50, 5); }
      function cheerTone() { placedCount++; rising(placedCount % 8); }

      function use(it) {
        if (finished) return;
        if (it.pat) {
          const egg = eggs[sel];
          const patG = egg.g.querySelector('.g7s-pat');
          if (egg.pat === it) { egg.pat = null; patG.innerHTML = ''; sfx.tap(); api.hint('Washed clean! Tap a pattern to paint it again.'); }
          else {
            egg.pat = it; patG.innerHTML = patBody(it, egg.cx, egg.cy, egg.w, egg.h); cheerTone(); sparkAt([egg.cx, egg.cy]);
            const nextI = eggs.findIndex(e => !e.pat);
            if (nextI >= 0) { sel = nextI; api.hint('Lovely! Tap a pattern for the next egg.'); } else api.hint('All the eggs are painted! Tap an egg to change it, or add a chick.');
            markSel();
          }
          refreshBtns(); return;
        }
        if (it.slot) {
          const cur = slotUse[it.slot];
          if (cur) remove(cur.d);
          if (cur && cur.it === it) { slotUse[it.slot] = null; sfx.tap(); refreshBtns(); return; }
          const pos = th.slots[it.slot];
          const d = makePlaced(it, pos); const u = { it, d }; slotUse[it.slot] = u;
          d.onclick = () => { if (finished) return; if (slotUse[it.slot] === u) slotUse[it.slot] = null; remove(d); sfx.tap(); refreshBtns(); };
          cheerTone(); sparkAt(pos); refreshBtns(); return;
        }
        const arr = setUse[it.set], spots = th.sets[it.set];
        const free = arr.map((u, i) => u ? -1 : i).filter(i => i >= 0);
        if (!free.length) { sfx.soft(); api.hint(`There’s no more room there. Tap one to take it off.`); return; }
        const i = th.seq && th.seq[it.set] ? free[0] : pick(free);
        const d = makePlaced(it, spots[i]); const u = { it, d }; arr[i] = u;
        if (th.seq && th.seq[it.set]) d.style.zIndex = (it.z || 1) + i;
        d.onclick = () => { if (finished) return; if (arr[i] === u) arr[i] = null; remove(d); sfx.tap(); refreshBtns(); };
        cheerTone(); sparkAt(spots[i]); refreshBtns();
      }

      th.items.forEach(it => {
        const b = el('button', 'tile c-card g7s-it', it.pat ? eggIcon(it) : it.icon); b.type = 'button'; b.setAttribute('aria-label', it.n);
        b.onclick = () => use(it);
        pal.append(b); btns.push({ b, it });
      });
      refreshBtns();

      function finish() {
        if (finished) return; finished = true;
        sfx.win();
        for (let k = 0; k < 4; k++) api.later(() => burst(base, 20 + Math.random() * 60, 20 + Math.random() * 60, 10, ['✨', '⭐', '💫', '🌟']), k * 220);
        api.hint('What a beautiful job! It looks wonderful.');
        doneB.disabled = true;
        api.later(() => api.done(3), 1500);
      }
    }
  }
})();
