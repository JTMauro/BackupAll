/* Recall: Gentle Games 4. Warm, everyday, picture-led games with no failure:
   Which Instrument?, Picture Story, Stock the Shop, Pet Care, Post the Letters.
   Every level is generated fresh; difficulty rises gently and levels off at a sensible cap. */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor } = R;

  const lvl = L => Math.max(1, Math.floor(+L || 1));
  const mkBtn = (label, cls, fn) => { const b = el('button', 'btn ' + cls, label); b.type = 'button'; if (fn) b.onclick = fn; return b; };
  const finisher = api => { let d = false; return s => { if (d) return; d = true; api.done(Math.max(1, Math.min(3, s))); }; };
  const chime = k => tone(523 * Math.pow(2, Math.min(k, 12) * 2 / 12), .2, 'triangle', .12);
  const sample = (arr, n) => shuffle(arr.slice()).slice(0, n);

  /* fly a copy of `src` to `dst` inside `wrap` (works while the stage is CSS-scaled) */
  function localRect(wrap, node) {
    const W = wrap.getBoundingClientRect(), k = (W.width / (wrap.offsetWidth || 1)) || 1, r = node.getBoundingClientRect();
    return { x: (r.left - W.left) / k, y: (r.top - W.top) / k, w: r.width / k, h: r.height / k };
  }
  function fly(wrap, src, dst, opt, done) {
    opt = opt || {};
    const end = () => { if (wrap.isConnected && done) done(); };
    try {
      const a = localRect(wrap, src), b = localRect(wrap, dst);
      const c = src.cloneNode(true);
      c.classList.add('g4-fly'); c.classList.remove('g4-sel', 'g4-pop'); c.style.visibility = 'visible';
      Object.assign(c.style, { left: a.x + 'px', top: a.y + 'px', width: a.w + 'px', height: a.h + 'px' });
      wrap.append(c);
      const s = opt.scale == null ? 1 : opt.scale;
      const dx = b.x + b.w / 2 - (a.x + a.w / 2), dy = b.y + b.h / 2 - (a.y + a.h / 2) + (opt.dy || 0);
      if (!c.animate) { c.remove(); end(); return; }
      const an = c.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * .5}px,${dy * .5 - 40}px) scale(${(1 + s) / 2 * 1.08})`, opacity: 1, offset: .5 },
        { transform: `translate(${dx}px,${dy}px) scale(${s})`, opacity: opt.fade ? 0 : 1 }
      ], { duration: opt.ms || 520, easing: 'ease-in-out' });
      an.onfinish = () => { c.remove(); end(); };
    } catch (e) { end(); }
  }

  R.css(`
.g4-wrap{position:relative;max-width:760px;margin:0 auto;display:grid;gap:12px}
.g4-fly{position:absolute!important;margin:0!important;z-index:40;pointer-events:none;transition:none!important}
.g4-row{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:12px}
.g4-panel{background:var(--card);color:var(--ink);border-radius:22px;padding:12px 14px;box-shadow:0 6px 0 var(--card-edge),0 12px 22px rgba(0,0,0,.26)}
.g4-msg{font:600 20px/1.3 var(--display);text-align:center;color:var(--on-table);margin:0}
.g4-title{display:flex;align-items:center;justify-content:center;gap:10px;font:700 24px/1.15 var(--display);color:var(--on-table);margin:0;text-align:center}
.g4-title span{font-size:34px}
.g4-sel{transform:translateY(-8px) scale(1.06)!important;outline:5px solid #fff;outline-offset:3px;z-index:2}
.g4-glow{outline:6px solid var(--sun)!important;outline-offset:3px;animation:g4-glowk 1s infinite}
.g4-pop{animation:g4-bounce .5s cubic-bezier(.3,1.6,.5,1)}
.g4-big{font-size:1.3rem!important;min-height:64px!important;padding:.5em 1.2em!important}
@keyframes g4-bounce{0%{transform:scale(.6)}60%{transform:scale(1.12)}100%{transform:scale(1)}}
@keyframes g4-glowk{0%,100%{outline-color:rgba(255,194,52,1)}50%{outline-color:rgba(255,255,255,.9)}}
@keyframes g4-notek{0%{opacity:0;transform:translate(0,10px) rotate(-10deg)}30%{opacity:1}100%{opacity:0;transform:translate(var(--nx,10px),-46px) rotate(12deg)}}
@keyframes g4-hop{0%,100%{transform:translateY(0) scale(1)}30%{transform:translateY(-26px) scale(1.06,.96)}55%{transform:translateY(0) scale(1.08,.92)}75%{transform:translateY(-8px)}}
@keyframes g4-heart{0%{opacity:0;transform:translate(0,0) scale(.4)}20%{opacity:1;transform:translate(0,-14px) scale(1.1)}100%{opacity:0;transform:translate(var(--hx,0px),-110px) scale(.9)}}
@keyframes g4-tilt{0%,100%{rotate:0deg}30%{rotate:-9deg}70%{rotate:9deg}}
@keyframes g4-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.03,.98)}}
@keyframes g4-flap{0%,100%{transform:scaleY(1)}40%{transform:scaleY(.2)}}

/* Which Instrument */
.g4-top{display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap}
.g4-radio{position:relative;width:104px;height:92px;border-radius:44px 44px 12px 12px;flex:none;display:grid;place-items:center;
  background:linear-gradient(155deg,rgba(255,255,255,.25),rgba(255,255,255,0) 50%),linear-gradient(#8A5A32,#5E3A1C);box-shadow:0 6px 0 #3B220F,0 12px 18px rgba(0,0,0,.3)}
.g4-grille{width:64px;height:52px;border-radius:32px 32px 8px 8px;background:repeating-linear-gradient(90deg,#3B220F 0 3px,#E9C67E 3px 7px);box-shadow:inset 0 0 0 4px #C9A25E}
.g4-radio::after{content:"";position:absolute;bottom:7px;left:50%;width:14px;height:8px;margin-left:-7px;border-radius:4px;background:#E9C67E}
.g4-note{position:absolute;top:4px;font-size:26px;opacity:0;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.3)}
.g4-radio.g4-on .g4-note{animation:g4-notek 1.5s infinite}
.g4-radio.g4-on{animation:g4-breathe .5s infinite}
.g4-icards{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px}
.g4-icard{min-height:108px;display:grid;justify-items:center;align-content:center;gap:2px;padding:10px 6px;font:600 22px/1.1 var(--display);cursor:pointer;border-radius:22px}
.g4-icard .g4-ic{font-size:50px;line-height:1.1;height:58px;display:grid;place-items:center}
.g4-icard svg{width:58px;height:58px}
.g4-icard.g4-right{--c:var(--leaf);--d:var(--leaf-d);animation:g4-bounce .5s cubic-bezier(.3,1.6,.5,1)}
.g4-icard.g4-nope{opacity:.42;filter:grayscale(.7)}
.g4-fact{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;align-items:center;font:20px/1.35 var(--body)}
.g4-fact b{font:700 22px var(--display)}
.g4-fact .g4-ic{grid-row:span 2;font-size:44px}
.g4-fact svg{width:50px;height:50px}

/* Picture Story */
.g4-slots,.g4-pile{display:grid;grid-template-columns:repeat(var(--cols,3),minmax(0,104px));justify-content:center;gap:10px}
.g4-slot{position:relative;min-height:116px;border-radius:18px;background:rgba(0,0,0,.18);box-shadow:inset 0 0 0 3px rgba(255,255,255,.35);display:grid;place-items:center}
.g4-slot > i{font:700 40px var(--display);font-style:normal;color:rgba(255,255,255,.55)}
.g4-slot.g4-next{box-shadow:inset 0 0 0 4px #fff;background:rgba(255,255,255,.14)}
.g4-slot .g4-num{position:absolute;top:-10px;left:-8px;z-index:3;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font:700 20px var(--display);color:var(--ink);background:var(--sun);box-shadow:0 3px 0 var(--sun-d)}
.g4-scard{width:100%;min-height:116px;display:grid;justify-items:center;align-content:center;gap:2px;padding:8px 4px;border-radius:18px;font:600 20px/1.1 var(--display);cursor:pointer;text-align:center}
.g4-scard .g4-ic{font-size:42px;line-height:1.15}
.g4-slot .g4-scard{cursor:default;--c:var(--good-bg);--d:var(--leaf-d);animation:g4-bounce .45s cubic-bezier(.3,1.6,.5,1)}
.g4-ghost{min-height:116px;border-radius:18px;border:3px dashed rgba(255,255,255,.25)}
.g4-done-row{font:700 24px var(--display);color:var(--on-table);text-align:center;margin:0;animation:g4-bounce .5s cubic-bezier(.3,1.6,.5,1)}

/* Stock the Shop */
.g4-shelves{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.g4-shelf{display:grid;gap:0;padding:0;border:0;background:none;cursor:pointer;border-radius:18px;font:inherit;color:inherit}
.g4-sign{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px;min-height:46px;padding:4px 8px;border-radius:14px 14px 4px 4px;font:700 20px/1.05 var(--display);position:relative;z-index:1}
.g4-sign span{font-size:26px}
.g4-plank{display:flex;flex-wrap:wrap;align-content:flex-end;justify-content:center;gap:2px;min-height:62px;padding:6px 6px 4px;font-size:30px;line-height:1;
  background:linear-gradient(rgba(0,0,0,.18),rgba(0,0,0,.08)),rgba(255,255,255,.12);border-bottom:12px solid #A8743F;box-shadow:0 5px 0 #6F4A24,0 10px 14px rgba(0,0,0,.25);border-radius:0 0 6px 6px}
.g4-tight .g4-sign{gap:0 4px;padding:4px 4px;min-height:58px}.g4-tight .g4-sign span{font-size:22px}.g4-tight .g4-plank{min-height:50px;font-size:26px}.g4-tight{gap:10px 8px}
.g4-plank > *{animation:g4-bounce .4s cubic-bezier(.3,1.6,.5,1)}
.g4-shelf.g4-hit .g4-sign{animation:g4-bounce .45s cubic-bezier(.3,1.6,.5,1)}
.g4-crate{display:flex;flex-wrap:wrap;justify-content:center;gap:9px;padding:14px 12px 16px;border-radius:20px;min-height:90px;
  background:repeating-linear-gradient(0deg,#D7A866 0 22px,#C48F4C 22px 26px);box-shadow:inset 0 0 0 6px #A8743F,0 7px 0 #7A4F27,0 14px 22px rgba(0,0,0,.3)}
.g4-item{width:66px;height:66px;display:grid;place-items:center;font-size:38px;line-height:1;cursor:pointer;border-radius:16px;padding:0;transition:transform .15s}
.g4-tin{position:relative;display:inline-grid;place-items:center;width:.95em;height:1.15em;border-radius:.12em/.08em;vertical-align:bottom;
  background:linear-gradient(90deg,#8D96A0,#EEF2F5 35%,#B7C0C8 70%,#7D8790);box-shadow:inset 0 .07em 0 #6E7882,inset 0 -.07em 0 #6E7882}
.g4-tin i{font-style:normal;font-size:.5em;width:100%;text-align:center;line-height:1.35;background:var(--tc,#E8483A);box-shadow:inset 0 2px 0 rgba(255,255,255,.35)}
.g4-label{font:600 20px var(--display);color:var(--on-table);text-align:center;margin:0;min-height:26px}

/* Pet Care */
.g4-pick{display:grid;grid-template-columns:repeat(3,minmax(0,140px));justify-content:center;gap:12px}
.g4-pick button{min-height:140px;display:grid;justify-items:center;align-content:center;gap:4px;font:700 22px var(--display);cursor:pointer;border-radius:24px}
.g4-pick button span{font-size:64px;line-height:1.1}
.g4-room{position:relative;height:250px;border-radius:24px;overflow:hidden;
  background:linear-gradient(transparent 68%,#C98D55 68%,#B37845),repeating-linear-gradient(90deg,#FFE9C9 0 26px,#FFDDB0 26px 52px);box-shadow:0 7px 0 var(--card-edge),0 14px 24px rgba(0,0,0,.3)}
.g4-rug{position:absolute;left:50%;bottom:16px;width:200px;height:44px;margin-left:-100px;border-radius:50%;background:radial-gradient(#F25A95 0 30%,#FFC234 31% 46%,#45AEFF 47% 70%,#3CC46B 71%)}
.g4-window{position:absolute;left:14px;top:16px;width:70px;height:62px;border-radius:8px;background:linear-gradient(#9ED8FF,#D9F1FF);box-shadow:inset 0 0 0 5px #fff,0 3px 0 rgba(0,0,0,.15)}
.g4-window::before{content:"";position:absolute;left:33px;top:0;bottom:0;width:4px;background:#fff}
.g4-window::after{content:"";position:absolute;top:29px;left:0;right:0;height:4px;background:#fff}
.g4-petbox{position:absolute;left:50%;bottom:30px;width:150px;margin-left:-75px;text-align:center;font-size:118px;line-height:1;transform-origin:50% 100%;animation:g4-breathe 2.4s ease-in-out infinite}
.g4-petbox.g4-happy{animation:g4-hop .6s ease-in-out 2}
.g4-petbox.g4-no{animation:g4-tilt .5s ease-in-out}
.g4-petname{position:absolute;right:12px;top:12px;padding:4px 12px;border-radius:999px;background:rgba(255,255,255,.8);color:var(--ink);font:700 20px var(--display)}
.g4-bubble{position:absolute;right:10px;top:56px;max-width:46%;padding:8px 12px;border-radius:20px;background:#fff;color:var(--ink);font:700 20px/1.2 var(--display);text-align:center;
  box-shadow:0 4px 0 #DCCCAF,0 8px 14px rgba(0,0,0,.2);animation:g4-bounce .45s cubic-bezier(.3,1.6,.5,1)}
.g4-bubble span{display:block;font-size:32px;line-height:1.2}
.g4-bubble::after{content:"";position:absolute;left:12px;bottom:-12px;border:12px solid transparent;border-bottom:0;border-top-color:#fff}
.g4-hrt{position:absolute;left:50%;bottom:110px;font-size:34px;pointer-events:none;animation:g4-heart 1.4s ease-out forwards}
.g4-care{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:10px}
.g4-care button{min-height:92px;display:grid;justify-items:center;align-content:center;gap:0;font:600 20px/1.1 var(--display);cursor:pointer;border-radius:20px;padding:6px 4px}
.g4-care button .g4-ic{font-size:40px;line-height:1.15;height:46px;display:grid;place-items:center}
.g4-care button svg{width:44px;height:44px}
.g4-care button.g4-nope{animation:wobble .5s}
.g4-hearts{font:700 22px var(--display);color:var(--on-table);text-align:center;margin:0;min-height:30px;letter-spacing:2px}

/* Post the Letters */
.g4-street{display:grid;gap:6px}
.g4-sname{justify-self:center;display:flex;align-items:center;gap:6px;padding:3px 14px;border-radius:10px;background:#fff;color:#1D3F8C;font:700 20px var(--display);box-shadow:inset 0 0 0 3px #1D3F8C,0 4px 0 rgba(0,0,0,.25)}
.g4-houses{display:grid;grid-template-columns:repeat(var(--n,3),minmax(0,104px));justify-content:center;gap:10px}
.g4-house{position:relative;display:grid;justify-items:center;padding:0;border:0;background:none;cursor:pointer;font:inherit;color:inherit;border-radius:12px}
.g4-roof{width:100%;height:30px;clip-path:polygon(50% 0,100% 100%,0 100%);background:linear-gradient(#D9604A,#B8452F)}
.g4-wall{width:88%;height:102px;display:grid;justify-items:center;align-content:end;background:linear-gradient(90deg,#F4E2C4,#FFF4E0 50%,#EAD6B4);border-radius:0 0 6px 6px;box-shadow:0 5px 0 #B49A72,0 10px 14px rgba(0,0,0,.25)}
.g4-door{position:relative;width:54px;height:84px;border-radius:26px 26px 0 0;display:grid;justify-items:center;align-content:start;padding-top:6px;
  background:linear-gradient(155deg,rgba(255,255,255,.35),rgba(255,255,255,0) 55%),var(--c);box-shadow:inset 0 0 0 3px var(--d)}
.g4-door b{font:700 24px/1 var(--display);color:var(--ink);background:#FFF9EF;border-radius:8px;padding:2px 5px;min-width:30px;text-align:center;box-shadow:0 2px 0 rgba(0,0,0,.25)}
.g4-door .g4-sym{font-size:22px;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.35);line-height:1}
.g4-slotbox{position:absolute;left:11px;right:11px;top:50px;height:9px;border-radius:3px;background:#3A2410;box-shadow:0 0 0 3px #E9C67E;transform-origin:50% 0}
.g4-house.g4-got .g4-slotbox{animation:g4-flap .4s}
.g4-knob{position:absolute;right:6px;top:62px;width:8px;height:8px;border-radius:50%;background:#E9C67E}
.g4-plate{margin-top:8px;padding:2px 6px;border-radius:8px;background:#FFF9EF;color:var(--ink);font:700 20px/1.05 var(--display);text-align:center;box-shadow:0 3px 0 var(--card-edge)}
.g4-count{position:absolute;top:2px;right:2px;z-index:2;min-width:30px;height:30px;padding:0 4px;border-radius:15px;display:grid;place-items:center;background:var(--leaf);color:#fff;font:700 18px var(--display);box-shadow:0 3px 0 var(--leaf-d)}
.g4-bag{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:12px;padding:12px;border-radius:20px;background:rgba(0,0,0,.18);min-height:104px}
.g4-env{position:relative;width:150px;height:88px;padding:0;border:0;border-radius:8px;cursor:pointer;color:var(--ink);font:700 22px/1.05 var(--display);display:grid;place-items:center;
  background:linear-gradient(to top right,transparent calc(50% - 1px),#D9C9A8 50%,transparent calc(50% + 1px)) top left/50% 46% no-repeat,
             linear-gradient(to top left,transparent calc(50% - 1px),#D9C9A8 50%,transparent calc(50% + 1px)) top right/50% 46% no-repeat,#FFF9EF;
  box-shadow:0 5px 0 var(--card-edge),0 10px 16px rgba(0,0,0,.28);transition:transform .15s}
.g4-env .g4-addr{position:relative;z-index:1;margin-top:12px;background:rgba(255,249,239,.92);padding:1px 6px;border-radius:6px;text-align:center}
.g4-env small{display:block;font:700 20px/1.05 var(--display);white-space:nowrap}
.g4-stamp{position:absolute;top:6px;right:6px;width:26px;height:30px;border-radius:3px;background:var(--c,#E8483A);outline:2px dashed #fff;outline-offset:-4px;display:grid;place-items:center;color:#fff;font-size:15px}
.g4-env.g4-colour{font-size:0}
.g4-env.g4-colour .g4-stamp{position:static;width:54px;height:58px;font-size:30px;outline-width:3px;box-shadow:0 3px 0 var(--d)}
.g4-bagcount{font:600 20px var(--display);color:var(--on-table-soft)}
  `);

  /* =========================================================
     1. WHICH INSTRUMENT?
     ========================================================= */
  const SVG = {
    clarinet: `<svg viewBox="0 0 64 64" aria-hidden="true"><g transform="rotate(32 32 32)"><rect x="29" y="1" width="6" height="8" rx="2" fill="#555"/><rect x="28" y="7" width="8" height="42" rx="3" fill="#24262B"/><rect x="27" y="17" width="10" height="2.5" fill="#C9CED6"/><rect x="27" y="33" width="10" height="2.5" fill="#C9CED6"/><circle cx="32" cy="24" r="1.8" fill="#C9CED6"/><circle cx="32" cy="29" r="1.8" fill="#C9CED6"/><circle cx="32" cy="40" r="1.8" fill="#C9CED6"/><path d="M27 48h10l6 13H21z" fill="#24262B"/><rect x="21" y="59" width="22" height="3" rx="1.5" fill="#C9CED6"/></g></svg>`,
    trombone: `<svg viewBox="0 0 64 64" aria-hidden="true"><g fill="none" stroke="#E0A526" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 22H48a5 5 0 0 1 0 10H28"/><path d="M28 38H58a4 4 0 0 1 0 8H28"/><path d="M28 32v14"/><path d="M33 29v12"/></g><path d="M2 12 L16 19 L16 25 L2 32 Z" fill="#E0A526" stroke="#B07A12" stroke-width="2" stroke-linejoin="round"/><circle cx="27" cy="31" r="2.4" fill="#B07A12"/></svg>`,
    bass: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="29.5" y="3" width="5" height="26" rx="2" fill="#2B1B10"/><circle cx="32" cy="4" r="3.6" fill="#7A4318"/><path d="M32 18c-9 0-13 5-11 11 1 3-1 5-4 7-5 4-5 13 1 18 6 5 22 5 28 0 6-5 6-14 1-18-3-2-5-4-4-7 2-6-2-11-11-11z" fill="#B5621F" stroke="#7A3E10" stroke-width="2"/><path d="M24 38c1 3 1 6 0 9M40 38c-1 3-1 6 0 9" stroke="#2B1B10" stroke-width="1.8" fill="none" stroke-linecap="round"/><rect x="27" y="48" width="10" height="4" rx="1" fill="#2B1B10"/><g stroke="#F1E3C6" stroke-width=".8"><path d="M30.5 6v44M31.8 6v44M33 6v44M34.2 6v44"/></g><rect x="31" y="56" width="2" height="7" fill="#888"/></svg>`,
    vibes: `<svg viewBox="0 0 64 64" aria-hidden="true"><g fill="#B8C2CC" stroke="#7E8A96" stroke-width="1"><rect x="4" y="18" width="8" height="24" rx="2"/><rect x="14" y="20" width="8" height="22" rx="2"/><rect x="24" y="22" width="8" height="20" rx="2"/><rect x="34" y="24" width="8" height="18" rx="2"/><rect x="44" y="26" width="8" height="16" rx="2"/><rect x="54" y="28" width="7" height="14" rx="2"/></g><g fill="#E9C67E"><rect x="6" y="44" width="4" height="14"/><rect x="16" y="44" width="4" height="13"/><rect x="26" y="44" width="4" height="12"/><rect x="36" y="44" width="4" height="11"/><rect x="46" y="44" width="4" height="10"/><rect x="56" y="44" width="4" height="9"/></g><rect x="2" y="42" width="60" height="3" rx="1.5" fill="#444"/><path d="M14 4 26 18M46 4 36 20" stroke="#8A5A32" stroke-width="2.4" stroke-linecap="round"/><circle cx="12.5" cy="3.5" r="3.5" fill="#6F4FD0"/><circle cx="47.5" cy="3.5" r="3.5" fill="#6F4FD0"/></svg>`,
    brush: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="18" width="38" height="18" rx="8" fill="#B5763A"/><rect x="40" y="23" width="21" height="8" rx="4" fill="#8A5626"/><circle cx="56" cy="27" r="1.8" fill="#E9C67E"/><g stroke="#4A4A4A" stroke-width="3" stroke-linecap="round"><path d="M11 37v11M17 37v12M23 37v12M29 37v12M35 37v12M41 37v10"/></g></svg>`
  };
  const icHTML = it => it.svg ? SVG[it.svg] : it.ic;

  /* phrases: [beat, semitone offset, length in beats, velocity] */
  const MEL = [
    [[0, .5], [2, .5], [4, .5], [5, .5], [7, 1], [9, .5], [7, 1.5]],
    [[7, 1], [4, .5], [5, .5], [7, 1], [12, 1], [11, .5], [9, .5], [7, 1.5]],
    [[0, .75], [4, .25], [7, .5], [9, .5], [7, .5], [4, .5], [2, .5], [0, 1.5]],
    [[4, .5], [7, .5], [9, 1], [7, .5], [4, .5], [2, .5], [4, 1.5]]
  ];
  const seq = (notes, vel = 1) => { let t = 0; return notes.map(([o, d]) => { const e = [t, o, d, vel]; t += d; return e; }); };
  const STYLE = {
    melody: () => seq(pick(MEL)),
    piano: () => { const m = seq(pick(MEL), .9); return m.concat([[0, -12, 2, .55], [0, -5, 2, .45], [2, -8, 2, .5], [2, -12, 2, .5], [4, -12, 2.5, .55], [4, -5, 2.5, .45]]); },
    guitar: () => {
      const a = pick([[0, 7, 12, 16, 19, 16, 12, 7], [0, 4, 7, 12, 7, 4, 5, 9]]);
      return a.map((o, i) => [i * .5, o, .9, .9]).concat([[4, 0, 2.5, .8], [4.05, 7, 2.5, .7], [4.1, 12, 2.5, .7], [4.15, 16, 2.5, .7]]);
    },
    bass: () => pick([[0, 4, 7, 9, 12, 9, 7, 4, 0], [0, 2, 4, 5, 7, 5, 4, 2, 0], [0, 7, 5, 4, 2, 4, 5, 7, 0]]).map((o, i) => [i * .75, o, .7, 1]),
    vibes: () => { const a = pick([[0, 4, 7, 11, 12, 11, 7, 4], [0, 4, 7, 9, 12, 9, 7, 4]]); return a.map((o, i) => [i * .5, o, .9, .85]).concat([[4, 0, 3, .9], [4, 4, 3, .7], [4, 7, 3, .7]]); },
    strings: () => {
      const top = pick([[[7, 2], [9, 1], [7, 1], [4, 2]], [[4, 1.5], [5, .5], [7, 2], [12, 2]], [[12, 2], [11, 1], [9, 1], [7, 2]]]);
      return seq(top, .9).concat([[0, 0, 3.8, .6], [0, -5, 3.8, .55], [4, -3, 2, .6], [4, 0, 2, .55]]);
    }
  };
  const INST = [
    { id: 'piano', name: 'Piano', ic: '🎹', s: [['acoustic_grand_piano', 60]], style: 'piano', tier: 1, fam: 'keys', rel: .9, syn: 'triangle',
      fact: 'A piano has 88 keys. Each key makes a little felt hammer strike the strings inside.' },
    { id: 'sax', name: 'Saxophone', ic: '🎷', s: [['alto_sax', 63], ['tenor_sax', 55]], style: 'melody', tier: 2, fam: 'reed', rel: .15, syn: 'sawtooth',
      fact: 'The saxophone is made of brass but played with a reed. Adolphe Sax invented it in the 1840s.' },
    { id: 'clarinet', name: 'Clarinet', svg: 'clarinet', s: [['clarinet', 62]], style: 'melody', tier: 3, fam: 'reed', rel: .15, syn: 'square',
      fact: 'The clarinet was a star of the swing bands. Benny Goodman, the "King of Swing", played one.' },
    { id: 'trumpet', name: 'Trumpet', ic: '🎺', s: [['muted_trumpet', 67]], style: 'melody', tier: 1, fam: 'brass', rel: .12, syn: 'sawtooth',
      fact: 'This trumpet has a mute in its bell, giving that soft, buzzy jazz sound. Louis Armstrong made the trumpet famous.' },
    { id: 'trombone', name: 'Trombone', svg: 'trombone', s: [['trombone', 50]], style: 'melody', tier: 3, fam: 'brass', rel: .15, syn: 'sawtooth',
      fact: 'A trombone has a long slide instead of buttons. The player slides it in and out to change the note.' },
    { id: 'strings', name: 'Violins', ic: '🎻', s: [['string_ensemble_1', 62]], style: 'strings', tier: 1, fam: 'strings', rel: .35, syn: 'sawtooth',
      fact: 'A violin bow is strung with horsehair. In an orchestra the violins often play the tune.' },
    { id: 'guitar', name: 'Guitar', ic: '🎸', s: [['acoustic_guitar_nylon', 52]], style: 'guitar', tier: 1, fam: 'strings', rel: .7, syn: 'triangle',
      fact: 'This is a Spanish guitar with soft nylon strings. Long ago, guitar strings were made of gut.' },
    { id: 'bass', name: 'Double Bass', svg: 'bass', s: [['acoustic_bass', 40]], style: 'bass', tier: 3, fam: 'strings', rel: .25, syn: 'triangle',
      fact: 'The double bass is the biggest of the string family. Players stand up, or sit on a tall stool, to play it.' },
    { id: 'vibes', name: 'Vibraphone', svg: 'vibes', s: [['vibraphone', 65]], style: 'vibes', tier: 2, fam: 'keys', rel: 1.2, syn: 'sine',
      fact: 'The vibraphone has metal bars, and little spinning fans in its tubes make the notes shimmer.' }
  ];
  const MIXV = { acoustic_grand_piano: .8, acoustic_bass: 1.5, clarinet: .7, alto_sax: .65, tenor_sax: .7, trombone: .55, muted_trumpet: .5, vibraphone: .7, string_ensemble_1: .5, acoustic_guitar_nylon: .75 };

  const AU = { ctx: null, bus: null, out: null, bufs: {}, loading: {}, live: [] };
  /* routes through the core's shared AudioContext and game-sound bus (follows mute and volume) */
  function actx() {
    let A = null;
    try { A = R.audio ? R.audio() : null; } catch (e) { A = null; }
    if (!A || !A.ctx || !A.bus) return null;
    if (AU.ctx !== A.ctx || AU.bus !== A.bus) {
      AU.ctx = A.ctx; AU.bus = A.bus; AU.bufs = {}; AU.loading = {};
      try {
        const comp = AU.ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.connect(A.bus);
        AU.out = AU.ctx.createGain(); AU.out.gain.value = .9; AU.out.connect(comp);
      } catch (e) { AU.out = A.bus; }
    }
    if (AU.ctx.state === 'suspended') { try { const p = AU.ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
    return AU.ctx;
  }
  function loadSamp(name) {
    if (AU.loading[name]) return AU.loading[name];
    const ctx = actx();
    if (!ctx || !window.fetch) return Promise.resolve(false);
    AU.loading[name] = fetch('samples/' + name + '.json')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('missing')))
      .then(obj => Promise.all(Object.keys(obj).map(m => new Promise(res => {
        try {
          const bin = atob(obj[m]), u = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
          const p = ctx.decodeAudioData(u.buffer, ab => res([+m, ab]), () => res(null));
          if (p && p.catch) p.catch(() => res(null));
        } catch (e) { res(null); }
      }))))
      .then(list => { const ok = list.filter(Boolean).sort((a, b) => a[0] - b[0]); if (!ok.length) throw new Error('none'); AU.bufs[name] = ok; return true; })
      .catch(() => { delete AU.loading[name]; return false; });
    return AU.loading[name];
  }
  function stopAll() { AU.live.forEach(s => { try { s.stop(); } catch (e) {} }); AU.live = []; }
  const BEAT = .36;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  /* returns the phrase length in seconds */
  function playPhrase(inst, sName, root, evs) {
    stopAll();
    const ctx = actx(), set = ctx && AU.bufs[sName];
    const len = Math.max(...evs.map(e => (e[0] + e[2]) * BEAT)) + inst.rel * .6;
    if (set && ctx) {
      const t0 = ctx.currentTime + .06, bus = ctx.createGain();
      bus.gain.value = MIXV[sName] || .6; bus.connect(AU.out);
      evs.forEach(([b, off, d, vel]) => {
        const m = root + off; let best = set[0];
        for (const s of set) if (Math.abs(s[0] - m) < Math.abs(best[0] - m)) best = s;
        try {
          const src = ctx.createBufferSource(), g = ctx.createGain();
          src.buffer = best[1]; src.playbackRate.value = Math.pow(2, (m - best[0]) / 12);
          const t = t0 + b * BEAT + (Math.random() - .5) * .012, end = t + d * BEAT, v = (vel || 1) * (.9 + Math.random() * .15);
          g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, end); g.gain.exponentialRampToValueAtTime(.0008, end + inst.rel);
          src.connect(g); g.connect(bus); src.start(t); src.stop(end + inst.rel + .05);
          AU.live.push(src);
        } catch (e) {}
      });
    } else {
      /* stand-in voices through the core's own tone() */
      const vol = { triangle: .14, sawtooth: .06, square: .06, sine: .16 }[inst.syn] || .1;
      evs.forEach(([b, off, d, vel]) => {
        let f = mtof(root + off); while (f < 110) f *= 2;
        tone(f, Math.max(.15, d * BEAT * (inst.rel > .5 ? 1.4 : .95)), inst.syn, vol * (vel || 1), b * BEAT);
      });
    }
    return len;
  }

  function startInstrument(level, api) {
    const L = lvl(level), total = 5, finish = finisher(api);
    const nOpt = L <= 2 ? 3 : 4;
    const maxTier = L === 1 ? 1 : L <= 3 ? 2 : 3;
    const pool = INST.filter(x => x.tier <= maxTier);
    const answers = shuffle(pool.slice());
    while (answers.length < total) answers.push(...shuffle(pool.slice()));
    let i = 0, mistakes = 0, fallback = false;
    actx();
    pool.forEach(x => x.s.forEach(s => loadSamp(s[0])));   /* warm up in the background */

    function question() {
      api.stage.innerHTML = ''; api.rounds(total, i);
      const ans = answers[i];
      const others = shuffle(pool.filter(x => x !== ans));
      if (L >= 6) others.sort((a, b) => (b.fam === ans.fam) - (a.fam === ans.fam));
      const opts = shuffle([ans, ...others.slice(0, nOpt - 1)]);
      const [sName, root] = pick(ans.s), evs = STYLE[ans.style]();
      let solved = false, ready = false;

      const wrap = el('div', 'g4-wrap');
      const top = el('div', 'g4-top');
      const radio = el('div', 'g4-radio', '<div class="g4-grille"></div>' +
        ['♪', '♫', '♪'].map((n, k) => `<span class="g4-note" style="left:${14 + k * 30}px;animation-delay:${k * .45}s;--nx:${k * 8 - 8}px">${n}</span>`).join(''));
      const play = mkBtn('▶ Play it again', 'c-sun g4-big', () => doPlay(true));
      top.append(radio, play);
      const msg = el('p', 'g4-msg', 'Tuning up the band…');
      const cards = el('div', 'g4-icards');
      const fact = el('div', 'g4-panel g4-fact'); fact.hidden = true;
      const next = mkBtn(i + 1 >= total ? 'Finish ★' : 'Next tune ▶', 'c-leaf g4-big', () => { sfx.tap(); stopAll(); i++; if (i >= total) { api.rounds(total, total); finish(starsFor(mistakes, 1, 3)); } else question(); });
      next.hidden = true;
      wrap.append(top, msg, cards, fact, next);
      api.stage.append(wrap);
      api.hint('Listen to the tune. Which instrument is playing?');

      function setMuteMsg() {
        msg.innerHTML = '';
        msg.append('The sound is turned off. ');
        const b = mkBtn('🔊 Turn sound on', 'c-sky', () => { R.unmute(); sfx.tap(); later(() => doPlay(true), 150); });
        b.style.marginTop = '6px';
        msg.append(b);
      }
      function later(fn, ms) { api.later(fn, ms); }
      function doPlay(user) {
        if (!wrap.isConnected) return;
        if (R.isMuted()) { setMuteMsg(); return; }
        if (!ready) return;
        actx();
        if (user) sfx.tap();
        msg.textContent = fallback ? 'The real recordings could not load here, so this is a simple stand-in sound.' : (solved ? 'Have another listen.' : 'Listen…');
        const len = playPhrase(ans, sName, root, evs);
        radio.classList.add('g4-on');
        const endAt = performance.now() + len * 1000;
        const watch = () => {
          if (!wrap.isConnected) { stopAll(); return; }
          if (performance.now() < endAt) requestAnimationFrame(watch);
          else { radio.classList.remove('g4-on'); if (!solved && !fallback) msg.textContent = 'Tap the instrument you heard.'; }
        };
        requestAnimationFrame(watch);
      }

      opts.forEach(o => {
        const b = el('button', 'tile c-card g4-icard', `<span class="g4-ic">${icHTML(o)}</span><span>${o.name}</span>`);
        b.type = 'button';
        b.onclick = () => {
          if (solved || b.classList.contains('g4-nope')) return;
          if (o === ans) {
            solved = true; stopAll(); radio.classList.remove('g4-on');
            b.classList.add('g4-right'); sfx.good(); toast(cheer());
            [...cards.children].forEach(c => { if (c !== b) c.classList.add('g4-nope'); });
            fact.innerHTML = `<span class="g4-ic">${icHTML(ans)}</span><b>It's the ${ans.name.toLowerCase()}!</b><span>${ans.fact}</span>`;
            fact.hidden = false; next.hidden = false; msg.hidden = true;
            cards.style.display = 'none';
            api.hint(`Yes, that was the ${ans.name.toLowerCase()}. Play it again if you like.`);
            api.rounds(total, i + 1);
          } else {
            mistakes++; b.classList.add('g4-nope'); wob(b); sfx.soft();
            api.hint(`Not the ${o.name.toLowerCase()}. Have another listen.`);
          }
        };
        cards.append(b);
      });

      loadSamp(sName).then(ok => {
        if (!wrap.isConnected) return;
        fallback = !ok; ready = true;
        if (R.isMuted()) setMuteMsg();
        else doPlay(false);
      });
    }
    question();
  }

  /* =========================================================
     2. PICTURE STORY
     ========================================================= */
  const STORIES = [
    { t: 'Make a cup of tea', ic: '☕', s: [['🚰', 'Fill the kettle'], ['♨️', 'Boil the water'], ['🫖', 'Pour on the tea'], ['🥛', 'Add the milk'], ['☕', 'Drink up!']] },
    { t: 'Plant a seed', ic: '🌱', s: [['🕳️', 'Dig a hole'], ['🌰', 'Drop in a seed'], ['🤲', 'Cover it over'], ['💧', 'Water it'], ['🌻', 'Watch it grow']] },
    { t: 'Post a letter', ic: '✉️', s: [['📝', 'Write the letter'], ['✉️', 'Seal it up'], ['🖊️', 'Write the address'], ['📮', 'Post it'], ['📬', 'It arrives!']] },
    { t: 'Bake some bread', ic: '🍞', s: [['🥣', 'Mix the dough'], ['🤲', 'Knead it well'], ['⏳', 'Let it rise'], ['🔥', 'Bake it'], ['🍞', 'Slice and eat']] },
    { t: 'Wash up', ic: '🧽', s: [['🚰', 'Fill the sink'], ['🫧', 'Add some soap'], ['🧽', 'Scrub the dishes'], ['🍽️', 'Dry the plates'], ['✨', 'All clean!']] },
    { t: 'Get ready to go out', ic: '🚪', s: [['⏰', 'Wake up'], ['🚿', 'Have a wash'], ['🧦', 'Socks on'], ['👞', 'Shoes on'], ['🚪', 'Out the door']] },
    { t: 'Make a sandwich', ic: '🥪', s: [['🍞', 'Two slices'], ['🧈', 'Spread butter'], ['🧀', 'Add cheese'], ['🥪', 'Put the top on'], ['😋', 'Tuck in!']] },
    { t: 'Boil an egg', ic: '🥚', s: [['💧', 'Fill a pan'], ['🔥', 'Bring to boil'], ['🥚', 'Pop in the egg'], ['⏲️', 'Wait a bit'], ['🥄', 'Eat it up']] },
    { t: 'Have a bath', ic: '🛁', s: [['🚰', 'Run the bath'], ['🛁', 'Climb in'], ['🧼', 'Soap up'], ['🚿', 'Rinse off'], ['🧖', 'Wrap in a towel']] },
    { t: 'Wrap a present', ic: '🎁', s: [['📦', 'Find a box'], ['🧸', 'Put gift in'], ['🎁', 'Wrap it up'], ['🎀', 'Tie a bow'], ['🤗', 'Give it!']] },
    { t: 'Brush your teeth', ic: '🪥', s: [['🪥', 'Get the brush'], ['🧴', 'Add paste'], ['😁', 'Brush well'], ['🚰', 'Rinse'], ['✨', 'Big smile!']] },
    { t: 'Hang out the washing', ic: '👕', s: [['🧺', 'Fill the basket'], ['🚶', 'Out to the line'], ['👕', 'Peg it up'], ['☀️', 'Let it dry'], ['🏠', 'Bring it in']] },
    { t: 'Go to the shops', ic: '🛒', s: [['📝', 'Write a list'], ['🧥', 'Coat on'], ['🛒', 'Fill the trolley'], ['💷', 'Pay'], ['🏠', 'Home again']] }
  ];

  function startStory(level, api) {
    const L = lvl(level), finish = finisher(api);
    const n = L <= 2 ? 3 : L <= 5 ? 4 : 5;
    const total = L <= 1 ? 3 : 4;
    const stories = sample(STORIES, total);
    let r = 0, mistakes = 0;

    function round() {
      api.stage.innerHTML = ''; api.rounds(total, r);
      const st = stories[r];
      /* keep first and last, pick middle steps in order */
      const mids = sample([1, 2, 3], n - 2).sort();
      const steps = [0, ...mids, 4].map(k => st.s[k]);
      let order;
      do { order = shuffle(steps.map((_, k) => k)); } while (order.every((v, k) => v === k));
      let pos = 0, miss = 0, busy = false;

      const wrap = el('div', 'g4-wrap');
      const title = el('p', 'g4-title', `<span>${st.ic}</span>${st.t}`);
      const cols = n === 4 ? 2 : 3;
      const slots = el('div', 'g4-slots'), pile = el('div', 'g4-pile');
      slots.style.setProperty('--cols', cols); pile.style.setProperty('--cols', cols);
      const slotEls = steps.map((_, k) => { const s = el('div', 'g4-slot', `<i>${k + 1}</i>`); slots.append(s); return s; });
      const cards = [];
      order.forEach(k => {
        const c = el('button', 'tile c-card g4-scard', `<span class="g4-ic">${steps[k][0]}</span><span>${steps[k][1]}</span>`);
        c.type = 'button'; c._k = k; cards.push(c);
        c.onclick = () => tapCard(c);
        pile.append(c);
      });
      wrap.append(title, slots, pile);
      api.stage.append(wrap);
      mark();

      function mark() {
        slotEls.forEach((s, k) => s.classList.toggle('g4-next', k === pos));
        api.hint(pos === 0 ? `How do you ${st.t.toLowerCase()}? Tap the picture that comes first.` : 'Lovely. What happens next?');
      }
      function tapCard(c) {
        if (busy || c.parentNode !== pile) return;
        if (c._k === pos) {
          busy = true; sfx.tap(); chime(pos * 2);
          cards.forEach(x => x.classList.remove('g4-glow'));
          const slot = slotEls[pos], ghost = el('div', 'g4-ghost');
          fly(wrap, c, slot, { ms: 480 }, () => {
            pile.replaceChild(ghost, c);
            slot.innerHTML = ''; slot.append(el('span', 'g4-num', String(c._k + 1)), c);
            c.style.visibility = '';
            pos++; miss = 0; busy = false;
            if (pos === n) solved(); else mark();
          });
          c.style.visibility = 'hidden';
        } else {
          mistakes++; miss++; sfx.soft(); wob(c);
          api.hint(pos === 0 ? 'Not that one first. What would you do before that?' : 'Not just yet. What comes next?');
          if (miss >= 2) cards.forEach(x => x.classList.toggle('g4-glow', x._k === pos));
        }
      }
      function solved() {
        slotEls.forEach(s => s.classList.remove('g4-next'));
        r++; api.rounds(total, r);
        toast(cheer()); sfx.good();
        [0, 1, 2, 3].forEach(k => tone(523 * Math.pow(2, [0, 4, 7, 12][k] / 12), .22, 'triangle', .1, .25 + k * .1));
        pile.replaceWith(el('p', 'g4-done-row', `${st.ic} You did it, step by step!`));
        api.hint(`That's how to ${st.t.toLowerCase()}.`);
        api.later(() => { if (r >= total) finish(starsFor(mistakes, 1, 3)); else round(); }, 2000);
      }
    }
    round();
  }

  /* =========================================================
     3. STOCK THE SHOP
     ========================================================= */
  const TIN_C = ['#E8483A', '#2E8B57', '#2F6FD0', '#E08A1E', '#8E44AD'];
  const SHELVES = [
    { id: 'bakery', n: 'Bakery', ic: '🥐', c: 'c-orange', easy: 1, items: [['🍞', 'Bread'], ['🥐', 'Croissant'], ['🥯', 'Bagel'], ['🥖', 'French stick'], ['🧁', 'Cupcake'], ['🥧', 'Pie']] },
    { id: 'veg', n: 'Fruit & Veg', ic: '🍎', c: 'c-leaf', easy: 1, items: [['🍎', 'Apple'], ['🍌', 'Banana'], ['🥕', 'Carrot'], ['🥦', 'Broccoli'], ['🍇', 'Grapes'], ['🍐', 'Pear'], ['🥔', 'Potatoes'], ['🍋', 'Lemon']] },
    { id: 'drinks', n: 'Drinks', ic: '🧃', c: 'c-sun', easy: 1, items: [['🧃', 'Juice'], ['🥤', 'Fizzy pop'], ['🍷', 'Wine'], ['🍺', 'Beer'], ['☕', 'Coffee'], ['🍾', 'Bubbly']] },
    { id: 'dairy', n: 'Dairy', ic: '🧀', c: 'c-sky', easy: 1, items: [['🧀', 'Cheese'], ['🧈', 'Butter'], ['🥚', 'Eggs'], ['🥛', 'Milk']] },
    { id: 'tins', n: 'Tins', ic: '🥫', c: 'c-grape', items: [['🍲', 'Tin of soup', 1], ['🐟', 'Sardines', 1], ['🫘', 'Baked beans', 1], ['🍑', 'Tinned peaches', 1], ['🍝', 'Spaghetti', 1]] },
    { id: 'butcher', n: 'Butcher', ic: '🥩', c: 'c-coral', items: [['🥩', 'Steak'], ['🍗', 'Chicken'], ['🥓', 'Bacon'], ['🌭', 'Sausages']] },
    { id: 'frozen', n: 'Frozen', ic: '❄️', c: 'c-mint', items: [['🍨', 'Ice cream'], ['🧊', 'Ice cubes'], ['🍦', 'Ice cream cone'], ['🍕', 'Frozen pizza']] },
    { id: 'sweets', n: 'Sweets', ic: '🍬', c: 'c-berry', items: [['🍫', 'Chocolate'], ['🍬', 'Toffees'], ['🍭', 'Lollipop'], ['🍪', 'Biscuits']] },
    { id: 'home', n: 'Household', ic: '🧽', c: 'c-peach', items: [['🧻', 'Kitchen roll'], ['🧼', 'Soap'], ['🧽', 'Sponge'], ['🕯️', 'Candles'], ['🪥', 'Toothbrush']] }
  ];
  const itemHTML = it => it[2] ? `<span class="g4-tin" style="--tc:${TIN_C[it.tc || 0]}"><i>${it[0]}</i></span>` : it[0];

  function startStockShop(level, api) {
    const L = lvl(level), finish = finisher(api);
    const nShelf = L <= 2 ? 2 : L <= 4 ? 3 : L <= 7 ? 4 : L <= 11 ? 5 : 6;
    let shelves;
    if (L === 1) shelves = SHELVES.filter(s => s.id === 'bakery' || s.id === 'veg');
    else if (L === 2) shelves = sample(SHELVES.filter(s => s.easy), 2);
    else shelves = sample(SHELVES, nShelf);
    const per = nShelf <= 2 ? 3 : nShelf <= 4 ? 3 : 2;
    let items = [];
    shelves.forEach(s => sample(s.items, Math.min(per + (nShelf >= 5 && Math.random() < .4 ? 1 : 0), s.items.length)).forEach(it => {
      const x = it.slice(); x.shelf = s; x.tc = randInt(TIN_C.length); items.push(x);
    }));
    items = shuffle(items).slice(0, 14);
    const total = items.length;
    let placed = 0, mistakes = 0, sel = null, miss = 0, combo = 0, busy = false;

    api.stage.innerHTML = ''; api.rounds(total, 0);
    const wrap = el('div', 'g4-wrap');
    const grid = el('div', 'g4-shelves');
    grid.style.gridTemplateColumns = `repeat(${nShelf >= 5 ? 3 : 2},minmax(0,1fr))`;
    if (nShelf >= 5) grid.classList.add('g4-tight');
    const shelfEls = shelves.map(s => {
      const b = el('button', 'g4-shelf', `<div class="tile ${s.c} g4-sign"><span>${s.ic}</span>${s.n}</div><div class="g4-plank"></div>`);
      b.type = 'button'; b._s = s; b.onclick = () => tapShelf(b);
      grid.append(b); return b;
    });
    const label = el('p', 'g4-label', '');
    const crate = el('div', 'g4-crate');
    items.forEach(it => {
      const b = el('button', 'tile c-card g4-item', itemHTML(it));
      b.type = 'button'; b._it = it; b.setAttribute('aria-label', it[1]);
      b.onclick = () => tapItem(b);
      crate.append(b);
    });
    wrap.append(grid, label, crate);
    api.stage.append(wrap);
    api.hint('The delivery is here! Tap something in the crate.');

    function tapItem(b) {
      if (busy) return;
      sfx.tap();
      if (sel) sel.classList.remove('g4-sel');
      shelfEls.forEach(s => s.classList.remove('g4-glow'));
      if (sel === b) { sel = null; label.textContent = ''; api.hint('Tap something in the crate.'); return; }
      sel = b; miss = 0; b.classList.add('g4-sel');
      label.textContent = b._it[1];
      api.hint(`${b._it[1]}. Which shelf does it go on?`);
    }
    function tapShelf(sh) {
      if (busy) return;
      if (!sel) { wob(crate); api.hint('First tap something in the crate.'); return; }
      const it = sel._it;
      if (sh._s === it.shelf) {
        busy = true; combo++; chime(combo);
        const b = sel; sel = null; b.classList.remove('g4-sel');
        const plank = sh.querySelector('.g4-plank');
        const mark = el('span', '', itemHTML(it)); mark.style.visibility = 'hidden'; plank.append(mark);
        b.style.visibility = 'hidden';
        fly(wrap, b, mark, { scale: .5, ms: 460 }, () => {
          mark.style.visibility = ''; b.remove();
          sh.classList.remove('g4-hit'); void sh.offsetWidth; sh.classList.add('g4-hit');
          placed++; busy = false; api.rounds(total, placed); label.textContent = '';
          if (combo >= 3 && combo % 3 === 0) toast(cheer());
          if (placed === total) {
            sfx.win();
            api.hint('The shelves are all stocked. Open for business!');
            label.textContent = '🛒 The shop is ready! 🛒';
            api.later(() => finish(starsFor(mistakes, 1, 3)), 1300);
          } else api.hint(pick(['Lovely. Tap the next thing in the crate.', 'Good. What else is in the crate?', 'On the shelf it goes. Next one!']));
        });
      } else {
        mistakes++; miss++; combo = 0; sfx.soft(); wob(sh);
        api.hint(`The ${it[1].toLowerCase()} doesn't go with the ${sh._s.n.toLowerCase()}. Try another shelf.`);
        if (miss >= 2) shelfEls.forEach(s => s.classList.toggle('g4-glow', s._s === it.shelf));
      }
    }
  }

  /* =========================================================
     4. PET CARE
     ========================================================= */
  const PETS = {
    dog: { n: 'Dog', ic: '🐶', name: 'Biscuit', needs: [
      ['hungry', '😋', "I'm hungry!", '🍖', 'Food'], ['thirsty', '💦', "I'm thirsty!", '💧', 'Water'], ['messy', '🌀', 'My fur is messy!', 'svg:brush', 'Brush'],
      ['walk', '🌳', 'Can we go for a walk?', '🦮', 'Lead'], ['ball', '⚡', 'I want to chase something!', '🎾', 'Ball'], ['cuddle', '💗', "I'd love a cuddle!", '🤗', 'Cuddle'], ['sleepy', '💤', "I'm sleepy!", '🛏️', 'Bed']] },
    cat: { n: 'Cat', ic: '🐱', name: 'Marmalade', needs: [
      ['hungry', '😋', "I'm hungry!", '🐟', 'Fish'], ['thirsty', '💦', "I'm thirsty!", '💧', 'Water'], ['messy', '🌀', 'My fur is messy!', 'svg:brush', 'Brush'],
      ['play', '⚡', 'I want to play!', '🧶', 'Wool'], ['cuddle', '💗', "I'd love a cuddle!", '🤗', 'Cuddle'], ['sleepy', '💤', "I'm sleepy!", '🧺', 'Basket']] },
    rabbit: { n: 'Rabbit', ic: '🐰', name: 'Clover', needs: [
      ['hungry', '😋', "I'm hungry!", '🥕', 'Carrot'], ['thirsty', '💦', "I'm thirsty!", '💧', 'Water'], ['messy', '🌀', 'My fur is messy!', 'svg:brush', 'Brush'],
      ['hop', '🌳', 'I want a hop outside!', '🌿', 'Garden'], ['cuddle', '💗', "I'd love a cuddle!", '🤗', 'Cuddle'], ['sleepy', '💤', "I'm sleepy!", '🌾', 'Hay bed']] }
  };
  const careIc = s => s.startsWith('svg:') ? SVG[s.slice(4)] : s;

  function startPet(level, api) {
    const L = lvl(level), finish = finisher(api);
    const nItems = L === 1 ? 3 : L === 2 ? 4 : L <= 4 ? 5 : 7;
    const goal = Math.min(8, 3 + L);
    let mistakes = 0;
    choose();

    function choose() {
      api.stage.innerHTML = ''; api.rounds(goal, 0);
      const last = R.store.get('g4pet', null);
      const wrap = el('div', 'g4-wrap');
      wrap.append(el('p', 'g4-title', 'Who would you like to look after?'));
      const row = el('div', 'g4-pick');
      Object.keys(PETS).forEach(k => {
        const p = PETS[k];
        const b = el('button', 'tile ' + (k === last ? 'c-sun' : 'c-card'), `<span>${p.ic}</span>${p.n}`);
        b.type = 'button';
        b.onclick = () => { sfx.good(); R.store.set('g4pet', k); play(k); };
        row.append(b);
      });
      wrap.append(row);
      api.stage.append(wrap);
      api.hint('Pick a pet to look after today.');
    }

    function play(kind) {
      const pet = PETS[kind];
      const all = pet.needs.slice(0, Math.min(nItems, pet.needs.length));
      let shown = all.slice(), done = 0, cur = null, prev = null, busy = false, miss = 0;
      api.stage.innerHTML = '';
      const wrap = el('div', 'g4-wrap');
      const room = el('div', 'g4-room', `<div class="g4-window"></div><div class="g4-rug"></div><div class="g4-petname">${pet.name}</div>`);
      const petBox = el('div', 'g4-petbox', pet.ic);
      room.append(petBox);
      const hearts = el('p', 'g4-hearts', '');
      const care = el('div', 'g4-care');
      const btns = shuffle(shown.slice()).map(nd => {
        const b = el('button', 'tile c-card', `<span class="g4-ic">${careIc(nd[3])}</span><span>${nd[4]}</span>`);
        b.type = 'button'; b._nd = nd; b.onclick = () => give(b);
        care.append(b); return b;
      });
      wrap.append(room, hearts, care);
      api.stage.append(wrap);
      newNeed();

      function newNeed() {
        const opts = shown.filter(x => x !== prev);
        cur = pick(opts); prev = cur; miss = 0;
        const old = room.querySelector('.g4-bubble'); if (old) old.remove();
        room.append(el('div', 'g4-bubble', `<span>${cur[1]}</span>${cur[2]}`));
        api.hint(`${pet.name} says: "${cur[2]}" What would help?`);
        busy = false;
      }
      function burst(nHearts) {
        for (let k = 0; k < nHearts; k++) {
          const h = el('span', 'g4-hrt', pick(['❤️', '💖', '💕', '💗']));
          h.style.marginLeft = (randInt(120) - 70) + 'px';
          h.style.setProperty('--hx', (randInt(80) - 40) + 'px');
          h.style.animationDelay = (k * .12) + 's';
          room.append(h);
          api.later(() => h.remove(), 1700 + k * 120);
        }
      }
      function give(b) {
        if (busy) return;
        if (b._nd === cur) {
          busy = true; sfx.tap();
          btns.forEach(x => x.classList.remove('g4-glow'));
          const bub = room.querySelector('.g4-bubble'); if (bub) bub.remove();
          fly(wrap, b.querySelector('.g4-ic'), petBox, { scale: .7, fade: true, ms: 520 }, () => {
            done++; api.rounds(goal, done);
            petBox.classList.remove('g4-happy', 'g4-no'); void petBox.offsetWidth; petBox.classList.add('g4-happy');
            burst(5);
            [0, 4, 7, 12].forEach((s, k) => tone(587 * Math.pow(2, s / 12), .2, 'sine', .1, k * .09));
            hearts.textContent = '❤️'.repeat(done);
            if (done >= goal) {
              api.hint(`${pet.name} is happy, comfy and loved. Thank you!`);
              toast(cheer());
              api.later(() => { burst(8); sfx.win(); }, 700);
              api.later(() => finish(starsFor(mistakes, 2, 5)), 2400);
            } else {
              api.hint(pick([`${pet.name} loves that!`, `Happy ${pet.name}!`, `Just what ${pet.name} needed.`]));
              api.later(newNeed, 1500);
            }
          });
        } else {
          mistakes++; miss++; sfx.soft();
          b.classList.remove('g4-nope'); void b.offsetWidth; b.classList.add('g4-nope');
          petBox.classList.remove('g4-happy', 'g4-no'); void petBox.offsetWidth; petBox.classList.add('g4-no');
          api.hint(`${pet.name} doesn't need the ${b._nd[4].toLowerCase()} just now. "${cur[2]}"`);
          if (miss >= 2) btns.forEach(x => x.classList.toggle('g4-glow', x._nd === cur));
        }
      }
    }
  }

  /* =========================================================
     5. POST THE LETTERS
     ========================================================= */
  const DOOR_C = ['c-coral', 'c-sky', 'c-sun', 'c-leaf', 'c-berry'];
  const DOOR_SYM = ['●', '★', '▲', '■', '♥'];
  const DOOR_NAME = ['red', 'blue', 'yellow', 'green', 'pink'];
  const DECO = ['c-grape', 'c-orange', 'c-mint', 'c-rose', 'c-peach', 'c-sky', 'c-leaf', 'c-coral'];
  const TITLES = ['Mrs', 'Mr', 'Miss'];
  const SURN = ['Brown', 'Patel', 'Green', 'Jones', 'Singh', 'Evans', 'Kelly', 'Ahmed', 'Price', 'Hill', 'Moore', 'Ward', 'Baker', 'Lewis', 'Clark', 'Wood'];
  const STREETS = [['Rose Lane', '🌹'], ['Oak Road', '🌳'], ['Mill Street', '⚙️'], ['Park Avenue', '⛲'], ['Church Row', '⛪'], ['Station Road', '🚉']];

  function startLetters(level, api) {
    const L = lvl(level), finish = finisher(api);
    /* mode by level: colour → numbers → names → streets / odd-even sides, then keep varying */
    let mode;
    if (L <= 2) mode = 'colour';
    else if (L <= 4) mode = 'number';
    else if (L <= 6) mode = 'name';
    else mode = ['street', 'sides', 'street', 'name'][L % 4];
    const rows = [];   /* [{label, houses:[{key, door, num, name}]}] */
    if (mode === 'colour') {
      const k = L === 1 ? 3 : 4, idx = sample([0, 1, 2, 3, 4], k);
      rows.push({ houses: idx.map(i => ({ key: 'c' + i, ci: i, door: DOOR_C[i] })) });
    } else if (mode === 'number') {
      const k = L === 3 ? 3 : 4;
      let nums;
      if (L === 3) { const s = 1 + randInt(8), st = pick([1, 2]); nums = [0, 1, 2].map(j => s + j * st); }
      else { const set = new Set(); while (set.size < k) set.add(2 + randInt(40)); nums = [...set].sort((a, b) => a - b); }
      { const dc = sample(DECO, nums.length); rows.push({ houses: nums.map((n, j) => ({ key: 'n' + n, num: n, door: dc[j] })) }); }
    } else if (mode === 'name') {
      const k = L <= 5 ? 3 : 4;
      const sur = sample(SURN, k);
      { const dc = sample(DECO, k); rows.push({ houses: sur.map((s, j) => ({ key: 's' + s, name: pick(TITLES) + ' ' + s, door: dc[j] })) }); }
    } else if (mode === 'street') {
      const k = L <= 9 ? 3 : 4, sts = sample(STREETS, 2), st0 = 1 + randInt(5);
      const nums = [...Array(k)].map((_, j) => st0 + j * 2);
      sts.forEach(s => rows.push({ label: s, houses: nums.map(n => ({ key: s[0] + n, num: n, street: s, door: pick(DECO) })) }));
    } else {
      const k = L <= 9 ? 3 : 4, base = 1 + 2 * randInt(10), s = pick(STREETS);
      rows.push({ label: [s[0] + ' (odd side)', s[1]], houses: [...Array(k)].map((_, j) => ({ key: 'n' + (base + 2 * j), num: base + 2 * j, door: pick(DECO) })) });
      rows.push({ label: [s[0] + ' (even side)', s[1]], houses: [...Array(k)].map((_, j) => ({ key: 'n' + (base + 1 + 2 * j), num: base + 1 + 2 * j, door: pick(DECO) })) });
    }
    const houses = rows.flatMap(r => r.houses);
    const nLetters = Math.min(9, { colour: L === 1 ? 5 : 6, number: 6, name: 7, street: 8, sides: 8 }[mode] + (L >= 10 ? 1 : 0));
    let letters = houses.slice();
    while (letters.length < nLetters) letters.push(pick(houses));
    letters = shuffle(letters.slice(0, Math.max(nLetters, houses.length)));
    const total = letters.length;
    let delivered = 0, mistakes = 0, sel = null, miss = 0, combo = 0, busy = false;
    const inBag = letters.slice();

    api.stage.innerHTML = ''; api.rounds(total, 0);
    const wrap = el('div', 'g4-wrap');
    const houseEls = [];
    rows.forEach(r => {
      const st = el('div', 'g4-street');
      if (r.label) st.append(el('div', 'g4-sname', `<span>${r.label[1]}</span>${r.label[0]}`));
      const hs = el('div', 'g4-houses'); hs.style.setProperty('--n', r.houses.length);
      r.houses.forEach(h => {
        const ci = h.ci;
        const doorInner = mode === 'colour' ? `<span class="g4-sym">${DOOR_SYM[ci]}</span>` : h.num != null ? `<b>${h.num}</b>` : '';
        const b = el('button', 'g4-house', `<div class="g4-roof"></div><div class="g4-wall"><div class="g4-door ${h.door}">${doorInner}<span class="g4-slotbox"></span><span class="g4-knob"></span></div></div>` +
          (h.name ? `<div class="g4-plate">${h.name.replace(' ', '<br>')}</div>` : ''));
        b.type = 'button'; b._h = h; b._n = 0;
        b.setAttribute('aria-label', mode === 'colour' ? DOOR_NAME[ci] + ' door' : h.name || ('number ' + h.num + (h.street ? ' ' + h.street[0] : '')));
        b.onclick = () => tapHouse(b);
        hs.append(b); houseEls.push(b);
      });
      st.append(hs); wrap.append(st);
    });
    const bag = el('div', 'g4-bag');
    const bagCount = el('span', 'g4-bagcount', '');
    wrap.append(bag);
    api.stage.append(wrap);
    refill();
    api.hint(mode === 'colour' ? 'Tap a letter, then the door with the same colour.' : 'Tap a letter, then the house it is going to.');

    function envHTML(h) {
      if (mode === 'colour') return `<span class="g4-stamp ${DOOR_C[h.ci]}" style="background:var(--c)">${DOOR_SYM[h.ci]}</span>`;
      const stamp = `<span class="g4-stamp" style="--c:${pick(['#E8483A', '#2F6FD0', '#2E8B57'])}">♛</span>`;
      if (h.name) return stamp + `<span class="g4-addr">${h.name}</span>`;
      if (h.street) return stamp + `<span class="g4-addr">No. ${h.num}<small>${h.street[1]} ${h.street[0]}</small></span>`;
      return stamp + `<span class="g4-addr" style="font-size:28px">No. ${h.num}</span>`;
    }
    function refill() {
      while (bag.querySelectorAll('.g4-env').length < 3 && inBag.length) {
        const h = inBag.shift();
        const e = el('button', 'g4-env g4-pop' + (mode === 'colour' ? ' g4-colour' : ''), envHTML(h));
        e.type = 'button'; e._h = h;
        e.setAttribute('aria-label', 'Letter for ' + (mode === 'colour' ? 'the ' + DOOR_NAME[h.ci] + ' door' : h.name || ('number ' + h.num + (h.street ? ' ' + h.street[0] : ''))));
        e.onclick = () => tapLetter(e);
        bag.insertBefore(e, bagCount.parentNode === bag ? bagCount : null);
      }
      if (inBag.length) { bagCount.textContent = `📬 ${inBag.length} more`; if (bagCount.parentNode !== bag) bag.append(bagCount); }
      else bagCount.remove();
    }
    function tapLetter(e) {
      if (busy) return;
      sfx.tap();
      houseEls.forEach(x => x.classList.remove('g4-glow'));
      if (sel) sel.classList.remove('g4-sel');
      if (sel === e) { sel = null; api.hint('Tap a letter.'); return; }
      sel = e; miss = 0; e.classList.add('g4-sel');
      const h = e._h;
      api.hint(mode === 'colour' ? `Which door has the ${DOOR_SYM[h.ci]} ${DOOR_NAME[h.ci]} colour?` :
        h.name ? `This one is for ${h.name}. Which house?` : h.street ? `Number ${h.num}, ${h.street[0]}. Which house?` : `Number ${h.num}. Which house?`);
    }
    function tapHouse(hb) {
      if (busy) return;
      if (!sel) { wob(bag); api.hint('First tap a letter in the post bag.'); return; }
      const h = sel._h;
      if (hb._h === h) {
        busy = true; combo++; chime(combo);
        const e = sel; sel = null; e.classList.remove('g4-sel');
        e.style.visibility = 'hidden';
        fly(wrap, e, hb.querySelector('.g4-slotbox'), { scale: .25, fade: true, ms: 560 }, () => {
          e.remove();
          hb.classList.remove('g4-got'); void hb.offsetWidth; hb.classList.add('g4-got');
          hb._n++;
          let cnt = hb.querySelector('.g4-count');
          if (!cnt) { cnt = el('span', 'g4-count'); hb.append(cnt); }
          cnt.textContent = '✉' + hb._n; cnt.classList.remove('g4-pop'); void cnt.offsetWidth; cnt.classList.add('g4-pop');
          delivered++; api.rounds(total, delivered); busy = false;
          if (combo >= 3 && combo % 3 === 0) toast(cheer());
          refill();
          if (delivered === total) {
            sfx.win(); api.hint('All the post is delivered. Thank you, postie!');
            api.later(() => finish(starsFor(mistakes, 1, 3)), 1300);
          } else api.hint(pick(['Through the letterbox! Tap the next letter.', 'Delivered. Next letter!', 'Lovely. Who is the next one for?']));
        });
      } else {
        mistakes++; miss++; combo = 0; sfx.soft(); wob(hb);
        api.hint(mode === 'colour' ? `That is the ${DOOR_NAME[hb._h.ci]} door. Look at the colour on the letter.` : 'Not this house. Have another look at the letter.');
        if (miss >= 2) houseEls.forEach(x => x.classList.toggle('g4-glow', x._h === h));
      }
    }
  }

  /* ========================================================= */
  [
    { id: 'instrument', order: 23, name: 'Which Instrument?', icon: '🎷', desc: 'Listen to the tune and name the instrument', start: startInstrument },
    { id: 'story', order: 24, name: 'Picture Story', icon: '🖼️', desc: 'Put the pictures in the right order', start: startStory },
    { id: 'stockshop', order: 25, name: 'Stock the Shop', icon: '🛒', desc: 'Put the groceries on the right shelves', start: startStockShop },
    { id: 'pet', order: 26, name: 'Pet Care', icon: '🐶', desc: 'Feed, brush and cuddle a happy pet', start: startPet },
    { id: 'post', order: 27, name: 'Post the Letters', icon: '✉️', desc: 'Deliver each letter to the right door', start: startLetters }
  ].forEach(g => register(Object.assign({ cat: 'gentle', gentle: true }, g)));
})();
