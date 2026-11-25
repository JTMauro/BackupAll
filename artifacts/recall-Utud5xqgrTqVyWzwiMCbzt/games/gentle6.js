/* Recall: Gentle Games 6. Name That Sound, Dress Up and Postcard Maker.
   Warm, picture-led and impossible to get wrong. Animal calls are built live with Web Audio
   (oscillators, formant filters, noise and pitch glides) on the core's shared R.audio() bus. */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, cheer, starsFor } = R;

  const mkBtn = (label, cls, fn) => { const b = el('button', 'btn ' + cls, label); b.type = 'button'; if (fn) b.onclick = fn; return b; };
  const lvl = L => Math.max(1, Math.floor(+L || 1));
  const once = fn => { let d = false; return (...a) => { if (d) return; d = true; fn(...a); }; };
  let uid = 0;
  const nid = p => 'g6' + p + (++uid);

  R.css(`
.g6-wrap{max-width:820px;margin:0 auto;display:grid;gap:14px}
.g6-row{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:10px}
.g6-label{font:600 1.15rem/1.25 var(--display);color:var(--on-table);text-align:center;margin:0;text-wrap:balance}
.g6-panel{background:var(--card);color:var(--ink);border-radius:24px;padding:14px;box-shadow:0 7px 0 var(--card-edge),0 14px 26px rgba(0,0,0,.28)}
.g6-big{font-size:1.3rem!important;min-height:64px!important;padding:.5em 1.2em!important}
@keyframes g6-bounce{0%{transform:scale(.5)}60%{transform:scale(1.14)}100%{transform:scale(1)}}
@keyframes g6-hop{0%,100%{translate:0 0}35%{translate:0 -10px}65%{translate:0 2px}}
@keyframes g6-spark{0%{opacity:1;transform:translate(-50%,-50%) scale(.4)}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(1.2)}}
@keyframes g6-fall{from{transform:translateY(-30px) rotate(0)}to{transform:translateY(560px) rotate(300deg)}}

/* ---------- Name That Sound ---------- */
.as-top{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap}
.as-radio{position:relative;width:150px;height:118px;border-radius:26px 26px 18px 18px;flex:none;
  background:linear-gradient(160deg,#A8693A,#7A4A28 60%,#5A361C);box-shadow:inset 0 4px 0 rgba(255,255,255,.25),inset 0 -6px 0 rgba(0,0,0,.25),0 7px 0 #3E2412,0 14px 22px rgba(0,0,0,.35)}
.as-grille{position:absolute;left:14px;top:12px;width:86px;height:86px;border-radius:50%;
  background:repeating-radial-gradient(circle,#E9C67E 0 3px,#B98A45 3px 6px);box-shadow:inset 0 0 0 5px #4A2B15,0 2px 0 rgba(255,255,255,.2);display:grid;place-items:center;overflow:visible}
.as-grille b{font:700 2rem/1 var(--display);color:#4A2B15;transition:transform .2s}
.as-knobs{position:absolute;right:14px;top:18px;display:grid;gap:12px}
.as-knobs i{display:block;width:26px;height:26px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#FFE7B0,#C99A4B 60%,#7A5420);box-shadow:0 3px 0 #3E2412}
.as-wave{position:absolute;left:57px;top:55px;width:86px;height:86px;margin:-43px 0 0 -43px;border-radius:50%;border:4px solid rgba(255,230,160,.9);opacity:0;pointer-events:none}
.as-on .as-wave{animation:as-ring 1.2s ease-out infinite}
.as-on .as-wave:nth-child(2){animation-delay:.4s}.as-on .as-wave:nth-child(3){animation-delay:.8s}
.as-on .as-grille b{animation:as-beat .45s ease-in-out infinite}
@keyframes as-ring{from{transform:scale(1);opacity:.9}to{transform:scale(2.1);opacity:0}}
@keyframes as-beat{50%{transform:scale(1.3) rotate(-8deg)}}
.as-side{display:grid;gap:10px;justify-items:center}
.as-choices{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:12px;max-width:640px;width:100%;margin:0 auto}
@media (max-width:560px){.as-choices.four{--n:2!important}}
.as-card{min-height:118px;border-radius:24px;cursor:pointer;display:grid;place-items:center;align-content:center;gap:2px;padding:8px 4px;transition:opacity .3s,transform .15s}
.as-card .em{font-size:3.3rem;line-height:1.1}
.as-card b{font:600 1.2rem/1.1 var(--display)}
.as-card:active{transform:translateY(3px)}
.as-card.as-no{opacity:.35;pointer-events:none;filter:grayscale(.6)}
.as-card.as-yes{--c:var(--leaf);--d:var(--leaf-d)}
.as-card.as-yes .em{animation:as-dance .7s ease-in-out 2}
@keyframes as-dance{25%{transform:rotate(-14deg) scale(1.2)}75%{transform:rotate(14deg) scale(1.2)}}
.as-say{min-height:64px;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;text-align:center;font:600 1.3rem/1.3 var(--display);padding:10px 16px}
.as-say.clue{background:#FFF6D6}
.as-say.good{background:var(--good-bg)}
.as-say .em{font-size:2rem}

/* ---------- Dress Up ---------- */
.du-pick{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;max-width:560px;margin:0 auto;width:100%}
.du-scene{min-height:150px;border-radius:26px;cursor:pointer;display:grid;place-items:center;align-content:center;gap:4px;padding:12px 6px}
.du-scene .em{font-size:3.6rem;line-height:1.1}
.du-scene b{font:600 1.25rem/1.15 var(--display);text-wrap:balance}
.du-play{display:grid;gap:12px;justify-items:center}
@media (min-width:700px){.du-play{grid-template-columns:320px minmax(0,440px);justify-content:center;align-items:center;gap:24px}.du-play > .du-stagebox{width:100%}}
.du-stagebox{position:relative;width:min(290px,100%);border-radius:28px;overflow:hidden;padding:6px;
  box-shadow:inset 0 4px 0 rgba(255,255,255,.35),0 7px 0 rgba(0,0,0,.25),0 14px 24px rgba(0,0,0,.3)}
.du-fig{position:relative;width:100%;aspect-ratio:200/220;container-type:inline-size;animation:du-sway 5s ease-in-out infinite;transform-origin:50% 100%}
.du-fig.du-hop{animation:g6-hop .45s ease}
@keyframes du-sway{0%,100%{rotate:-1deg}50%{rotate:1deg}}
.du-fig > svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.du-it{position:absolute;transform:translate(-50%,-50%) rotate(var(--r,0deg));font-size:calc(var(--s) * .5cqw);line-height:1;cursor:pointer;user-select:none;filter:drop-shadow(0 2px 2px rgba(0,0,0,.25))}
.du-it.du-in{animation:du-in .55s cubic-bezier(.3,1.5,.5,1)}
.du-it.du-out{animation:du-out .35s ease-in forwards;pointer-events:none}
svg.du-it{transform:none;filter:drop-shadow(0 2px 1px rgba(0,0,0,.2));pointer-events:none}
svg.du-it *{pointer-events:auto}
@keyframes du-in{0%{opacity:0;scale:.2;translate:0 -40%}60%{opacity:1;scale:1.18;translate:0 4%}100%{scale:1;translate:0 0}}
@keyframes du-out{40%{scale:1.2}100%{scale:0;opacity:0;rotate:30deg}}
.du-spark{position:absolute;pointer-events:none;font-size:22px;animation:g6-spark .7s ease-out forwards;z-index:5}
.du-ctrl{display:grid;gap:10px;width:100%;max-width:440px}
.du-tabs{display:flex;flex-wrap:wrap;justify-content:center;gap:7px}
.du-tab{width:58px;height:58px;border-radius:18px;font-size:1.8rem;cursor:pointer;transition:transform .15s}
.du-tab.on{outline:5px solid var(--sun);outline-offset:2px;transform:translateY(-3px)}
.du-dname{margin:0;text-align:center;font:600 1.2rem var(--display);color:var(--on-table)}
.du-items{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;padding:8px;border-radius:22px;background:linear-gradient(#C58B57,#9C6538);box-shadow:inset 0 4px 0 rgba(255,255,255,.25),inset 0 -5px 0 rgba(0,0,0,.2),0 6px 0 #5A361C}
.du-item{position:relative;width:58px;height:58px;border-radius:18px;font-size:2.1rem;cursor:pointer;padding:0}
.du-item svg{width:46px;height:46px}
.du-item .sw{width:38px;height:38px;border-radius:50%;box-shadow:inset 0 -4px 0 rgba(0,0,0,.18),0 0 0 3px #fff}
.du-item.on{--c:var(--good-bg);outline:4px solid var(--leaf);outline-offset:1px}
.du-item.on::after{content:"✓";position:absolute;right:-6px;top:-8px;width:26px;height:26px;border-radius:50%;background:var(--leaf);color:#fff;font:700 17px/26px var(--display);text-align:center;box-shadow:0 2px 0 var(--leaf-d)}
.du-snap{background:#FFFDF6;padding:14px 14px 10px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.4);rotate:-2deg;animation:g6-bounce .6s cubic-bezier(.3,1.5,.5,1);text-align:center;color:var(--ink);width:min(320px,100%)}
.du-snap .du-stagebox{width:100%;box-shadow:none;border-radius:6px}
.du-snap p{margin:10px 0 0;font:600 1.35rem/1.2 var(--display)}
.du-flash{position:fixed;inset:0;background:#fff;pointer-events:none;animation:du-flash .6s ease-out forwards;z-index:50}
@keyframes du-flash{from{opacity:.9}to{opacity:0}}
.du-confetti{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.du-confetti span{position:absolute;top:-30px;font-size:26px;animation:g6-fall 2.6s linear forwards}

/* ---------- Postcard Maker ---------- */
.pc-thumbs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;width:100%;max-width:640px;margin:0 auto}
@media (min-width:620px){.pc-thumbs{grid-template-columns:repeat(4,minmax(0,1fr))}}
.pc-thumb{border-radius:16px;padding:6px 6px 4px;cursor:pointer;display:grid;gap:3px;min-height:56px}
.pc-thumb canvas{width:100%;aspect-ratio:3/2;border-radius:10px;display:block;box-shadow:inset 0 0 0 2px rgba(0,0,0,.1)}
.pc-thumb b{font:600 1.02rem/1.15 var(--display)}
.pc-photo .ph{aspect-ratio:3/2;border-radius:10px;display:grid;place-items:center;font-size:2.4rem;background:repeating-linear-gradient(45deg,#FFF1D0 0 10px,#FFE6B0 10px 20px)}
.pc-msgs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;width:100%;max-width:560px;margin:0 auto}
.pc-msg{min-height:60px;font-size:1.12rem!important;padding:.4em .5em!important;text-wrap:balance}
.pc-msg.on{--c:var(--leaf);--d:var(--leaf-d);color:#fff}
.pc-own{display:flex;gap:8px;width:100%;max-width:560px;margin:0 auto}
.pc-own input{flex:1;min-width:0;min-height:58px;border-radius:16px;border:3px solid var(--card-edge);padding:0 14px;font:600 1.25rem var(--display);color:var(--ink);background:#fff}
.pc-front{position:relative;width:100%;aspect-ratio:3/2;border-radius:12px;overflow:hidden;background:#ddd;box-shadow:0 0 0 6px #fff,0 10px 24px rgba(0,0,0,.35);container-type:inline-size}
.pc-front canvas{position:absolute;inset:0;width:100%;height:100%}
.pc-greet{position:absolute;left:50%;bottom:4%;transform:translateX(-50%);white-space:nowrap;font:700 6.2cqw/1 var(--display);color:#fff;
  text-shadow:0 3px 0 rgba(0,0,0,.35),0 0 12px rgba(0,0,0,.35);-webkit-text-stroke:1px rgba(0,0,0,.25);pointer-events:none}
.pc-stk{position:absolute;transform:translate(-50%,-50%) rotate(var(--r,0deg));font-size:11cqw;line-height:1;cursor:pointer;border:0;background:none;padding:2px;
  filter:drop-shadow(0 3px 2px rgba(0,0,0,.35));animation:pc-stick .45s cubic-bezier(.3,1.6,.5,1)}
.pc-stk.out{animation:du-out .3s ease-in forwards}
@keyframes pc-stick{0%{scale:2;opacity:0}70%{scale:.9;opacity:1}100%{scale:1}}
.pc-pal{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;max-width:520px;margin:0 auto}
.pc-pal .btn{width:58px;height:58px;font-size:2rem;padding:0;border-radius:16px}
.pc-cards{display:flex;flex-wrap:wrap;justify-content:center;gap:24px 26px}
.pc-cards > *{width:min(390px,100%)}
.pc-back{position:relative;aspect-ratio:3/2;border-radius:12px;background:#FBF3E2;color:#2D3A6B;box-shadow:0 10px 24px rgba(0,0,0,.35),inset 0 0 0 6px #fff;container-type:inline-size;overflow:hidden}
.pc-back .line{position:absolute;left:58%;top:10%;bottom:10%;width:2px;background:#D9C9A8}
.pc-text{position:absolute;left:6%;top:12%;width:48%;bottom:10%;font:500 6.3cqw/1.3 'Segoe Print','Bradley Hand','Comic Sans MS','Fredoka',cursive;overflow-wrap:anywhere;rotate:-2deg}
.pc-stamp{position:absolute;right:5%;top:8%;width:19%;aspect-ratio:4/5;background:#fff;border:5px dotted #FBF3E2;box-shadow:0 1px 3px rgba(0,0,0,.25);display:grid;place-items:center;outline:1px solid rgba(0,0,0,.06)}
.pc-stamp .art{width:100%;height:100%;display:grid;place-items:center;align-content:center;background:linear-gradient(#FFB6A3,#FF7F7F);color:#fff;font:700 3.4cqw/1 var(--display)}
.pc-stamp .art span{font-size:8cqw;line-height:1.1}
.pc-pm{position:absolute;left:51%;top:6%;width:40%;rotate:-10deg;pointer-events:none;opacity:.85}
.pc-addr{position:absolute;left:63%;right:6%;top:58%;display:grid;gap:11cqw}
.pc-addr i{display:block;border-bottom:2px solid #D9C9A8;height:0}
.pc-addr b{position:absolute;top:-6.5cqw;left:2%;font:500 5cqw 'Segoe Print','Bradley Hand','Comic Sans MS','Fredoka',cursive;white-space:nowrap}
.pc-step{width:100%;max-width:480px;margin:0 auto}
.pc-say{margin:0;text-align:center;font:600 1.25rem/1.3 var(--display);color:var(--on-table);background:rgba(0,0,0,.2);border-radius:18px;padding:10px 14px}
`);

  /* =====================================================================
     1. NAME THAT SOUND
     ===================================================================== */
  /*CALLS-START*/
  const CALLS = (function () {
    // Each call is (ctx, out, t0, noiseBuffer) and returns its length in seconds.
    function P(param, pts, t0) {
      param.cancelScheduledValues(0);
      param.setValueAtTime(pts[0][1], t0 + pts[0][0]);
      for (let i = 1; i < pts.length; i++) param.linearRampToValueAtTime(pts[i][1], t0 + pts[i][0]);
    }
    const scale = (pts, k) => pts.map(([a, b]) => [a, b * k]);
    function osc(c, type, pts, t0, end) { const o = c.createOscillator(); o.type = type; P(o.frequency, pts, t0); o.start(t0); o.stop(t0 + end + .05); return o; }
    function amp(c, pts, t0, out) { const g = c.createGain(); g.gain.value = 0; P(g.gain, pts, t0); if (out) g.connect(out); return g; }
    function gain(c, v, out) { const g = c.createGain(); g.gain.value = v; if (out) g.connect(out); return g; }
    function filt(c, type, f, q, t0, out) {
      const b = c.createBiquadFilter(); b.type = type; b.Q.value = q;
      if (Array.isArray(f)) P(b.frequency, f, t0); else b.frequency.value = f;
      if (out) b.connect(out); return b;
    }
    function lfo(c, type, rate, depth, target, t0, end) {
      const o = c.createOscillator(); o.type = type; o.frequency.value = rate;
      const g = c.createGain(); if (Array.isArray(depth)) P(g.gain, depth, t0); else g.gain.value = depth;
      o.connect(g); g.connect(target); o.start(t0); o.stop(t0 + end + .05); return g;
    }
    function noise(c, nb, t0, dur) { const s = c.createBufferSource(); s.buffer = nb; s.loop = true; s.start(t0, Math.random() * .5); s.stop(t0 + dur + .05); return s; }
    function formants(c, input, list, t0, out) {
      list.forEach(F => { const b = filt(c, 'bandpass', F.f, F.q, t0); input.connect(b); b.connect(gain(c, F.g, out)); });
    }

    function cow(c, out, t) {
      const D = 1.7, fp = [[0, 92], [.3, 118], [1.0, 112], [1.7, 84]];
      const env = amp(c, [[0, 0], [.2, 1], [1.25, .9], [D, 0]], t, out);
      const lp = filt(c, 'lowpass', [[0, 320], [.35, 1500], [1.2, 1100], [D, 450]], 1, t, env);
      const pre = gain(c, .5);
      const a = osc(c, 'sawtooth', fp, t, D), b = osc(c, 'sawtooth', scale(fp, 1.007), t, D);
      lfo(c, 'sine', 5, 2.5, a.frequency, t, D); lfo(c, 'sine', 5, 2.5, b.frequency, t, D);
      a.connect(pre); b.connect(pre);
      formants(c, pre, [{ f: [[0, 280], [.4, 560], [1.3, 600], [D, 420]], q: 4, g: 2.4 }, { f: [[0, 750], [.4, 950], [D, 800]], q: 6, g: 1.1 }, { f: 2400, q: 8, g: .25 }], t, lp);
      pre.connect(filt(c, 'lowpass', 260, .7, t, gain(c, 1.2, lp)));
      return D;
    }
    function sheep(c, out, t) {
      const D = 1.05;
      const env = amp(c, [[0, 0], [.06, 1], [.85, .85], [D, 0]], t, out);
      const lp = filt(c, 'lowpass', [[0, 500], [.08, 3800], [D, 2400]], .8, t, env);
      const trem = gain(c, .62, lp); lfo(c, 'sine', 8.5, .36, trem.gain, t, D);
      const a = osc(c, 'sawtooth', [[0, 300], [.12, 345], [.7, 330], [D, 288]], t, D);
      lfo(c, 'sine', 8.5, 16, a.frequency, t, D);
      formants(c, a, [{ f: [[0, 450], [.1, 760], [D, 700]], q: 4, g: 1.6 }, { f: [[0, 1300], [D, 1150]], q: 6, g: 1.1 }, { f: 2700, q: 8, g: .4 }], t, trem);
      return D;
    }
    function cat(c, out, t) {
      const D = 1.0, fp = [[0, 470], [.3, 720], [.55, 690], [D, 420]];
      const env = amp(c, [[0, 0], [.12, 1], [.7, .9], [D, 0]], t, out);
      const lp = filt(c, 'lowpass', [[0, 700], [.12, 5000], [D, 1800]], .7, t, env);
      const a = osc(c, 'sawtooth', fp, t, D); lfo(c, 'sine', 6, 10, a.frequency, t, D);
      const b = osc(c, 'triangle', fp, t, D); lfo(c, 'sine', 6, 10, b.frequency, t, D);
      b.connect(gain(c, .35, lp));
      formants(c, a, [{ f: [[0, 280], [.25, 380], [.55, 850], [D, 520]], q: 3, g: 1.4 }, { f: [[0, 1700], [.25, 2400], [.55, 1400], [D, 950]], q: 5, g: 1.1 }, { f: 3200, q: 6, g: .3 }], t, lp);
      return D;
    }
    function bark(c, out, t, nb, k) {
      const D = .22, fp = [[0, 300 * k], [.035, 370 * k], [D, 150 * k]];
      const env = amp(c, [[0, 0], [.012, 1], [.07, .65], [D, 0]], t, out);
      const lp = filt(c, 'lowpass', [[0, 2600], [D, 450]], 3, t, env);
      const a = osc(c, 'sawtooth', fp, t, D), b = osc(c, 'sawtooth', scale(fp, 1.04), t, D);
      a.connect(lp); b.connect(lp);
      const bp = filt(c, 'bandpass', 550, 1.5, t, gain(c, 1.2, env)); a.connect(bp);
      const n = noise(c, nb, t, .08);
      n.connect(filt(c, 'bandpass', 900, .8, t, amp(c, [[0, 0], [.008, .5], [.06, 0]], t, out)));
      return D;
    }
    function dog(c, out, t, nb) { bark(c, out, t, nb, 1); bark(c, out, t + .36, nb, 1.05); return .6; }
    function quack(c, out, t, k) {
      const D = .2, fp = [[0, 240 * k], [.04, 255 * k], [D, 185 * k]];
      const env = amp(c, [[0, 0], [.015, 1], [.12, .8], [D, 0]], t, out);
      const hp = filt(c, 'highpass', 500, .7, t);
      const a = osc(c, 'square', fp, t, D), b = osc(c, 'sawtooth', scale(fp, 1.01), t, D);
      a.connect(hp); b.connect(hp);
      formants(c, hp, [{ f: 1100, q: 9, g: 3 }, { f: 2400, q: 9, g: 2.2 }, { f: 3600, q: 8, g: .8 }], t, env);
      return D;
    }
    function duck(c, out, t) { quack(c, out, t, 1); quack(c, out, t + .27, .96); quack(c, out, t + .54, 1.03); return .76; }
    function hoot(c, out, t, nb, d) {
      const fp = [[0, 330], [.07, 375], [d, 340]];
      const env = amp(c, [[0, 0], [.08, 1], [d - .12, .9], [d, 0]], t, out);
      const a = osc(c, 'sine', fp, t, d); lfo(c, 'sine', 4.5, 3, a.frequency, t, d); a.connect(env);
      const b = osc(c, 'triangle', fp, t, d); b.connect(gain(c, .2, env));
      noise(c, nb, t, d).connect(filt(c, 'lowpass', 900, .7, t, gain(c, .08, env)));
    }
    function owl(c, out, t, nb) { hoot(c, out, t, nb, .45); hoot(c, out, t + .75, nb, .28); hoot(c, out, t + 1.1, nb, .6); return 1.7; }
    function rooster(c, out, t) {
      const D = 1.65;
      const fp = [[0, 500], [.12, 560], [.15, 620], [.27, 650], [.32, 640], [.54, 720], [.6, 780], [1.0, 800], [D, 560]];
      const env = amp(c, [[0, 0], [.02, .9], [.11, .8], [.13, 0], [.16, 0], [.18, .9], [.27, .8], [.29, 0], [.32, 0], [.34, .9], [.53, .85], [.56, .1], [.6, 1], [1.3, .9], [D, 0]], t, out);
      const hp = filt(c, 'highpass', 300, .7, t);
      const a = osc(c, 'sawtooth', fp, t, D), b = osc(c, 'sawtooth', scale(fp, 1.012), t, D);
      lfo(c, 'sine', 7, [[0, 0], [.6, 0], [.8, 14], [D, 14]], a.frequency, t, D);
      a.connect(hp); b.connect(hp);
      formants(c, hp, [{ f: [[0, 700], [.6, 950], [D, 800]], q: 4, g: 1.6 }, { f: 1700, q: 5, g: 1.2 }, { f: 3000, q: 7, g: .5 }], t, env);
      return D;
    }
    function bird(c, out, t) {
      const list = [[0, .09, 2800, 3900], [.14, .09, 2800, 3900], [.28, .09, 2800, 3900],
        [.48, .05, 4200, 3400], [.55, .05, 4000, 3200], [.62, .05, 3800, 3000], [.69, .05, 3600, 2900], [.76, .05, 3400, 2700],
        [.95, .15, 2600, 4100]];
      list.forEach(([s, d, f0, f1]) => {
        const env = amp(c, [[0, 0], [.01, .5], [d - .015, .42], [d, 0]], t + s, out);
        osc(c, 'sine', [[0, f0], [d, f1]], t + s, d).connect(env);
      });
      return 1.1;
    }
    function horse(c, out, t, nb) {
      const D = 1.45;
      const env = amp(c, [[0, 0], [.08, 1], [.9, .85], [D, 0]], t, out);
      const a = osc(c, 'sawtooth', [[0, 520], [.12, 980], [.45, 860], [1.1, 450], [D, 380]], t, D);
      lfo(c, 'sine', 11, [[0, 10], [.3, 45], [D, 70]], a.frequency, t, D);
      formants(c, a, [{ f: [[0, 450], [.15, 650], [D, 550]], q: 4, g: 1.5 }, { f: [[0, 2100], [D, 1500]], q: 6, g: 1.2 }, { f: 3000, q: 8, g: .4 }], t, env);
      noise(c, nb, t, D).connect(filt(c, 'bandpass', 2000, .7, t, gain(c, .1, env)));
      const st = t + 1.6, snort = amp(c, [[0, 0], [.03, .9], [.3, 0]], st, out);
      const am = gain(c, .5, snort); lfo(c, 'square', 28, .5, am.gain, st, .3);
      noise(c, nb, st, .32).connect(filt(c, 'lowpass', 700, .8, st, am));
      return 1.95;
    }
    function croak(c, out, t, d, f) {
      const env = amp(c, [[0, 0], [.015, 1], [d - .03, .85], [d, 0]], t, out);
      const am = gain(c, .5, env); lfo(c, 'square', 26, .5, am.gain, t, d);
      const a = osc(c, 'sawtooth', [[0, f], [d, f * 1.08]], t, d);
      formants(c, a, [{ f: 450, q: 3, g: 2.2 }, { f: 1300, q: 4, g: 1 }], t, am);
    }
    function frog(c, out, t) { croak(c, out, t, .14, 95); croak(c, out, t + .17, .2, 120); croak(c, out, t + .75, .14, 95); croak(c, out, t + .92, .2, 120); return 1.15; }
    function bee(c, out, t) {
      const D = 1.9, fp = [[0, 205], [.9, 240], [D, 200]];
      const env = amp(c, [[0, 0], [.45, .6], [.9, 1], [1.4, .6], [D, 0]], t, out);
      const hp = filt(c, 'highpass', 150, .7, t, env);
      const bp = filt(c, 'bandpass', [[0, 450], [.9, 700], [D, 450]], 1.2, t, gain(c, 1.4, hp));
      const a = osc(c, 'sawtooth', fp, t, D), b = osc(c, 'sawtooth', scale(fp, 1.012), t, D);
      lfo(c, 'sine', 6, 8, a.frequency, t, D); lfo(c, 'sine', 6, 8, b.frequency, t, D);
      a.connect(bp); b.connect(bp);
      return D;
    }
    // per-call level so every animal sounds about as loud as the others
    const LEVEL = { cow: .42, sheep: .74, cat: .34, dog: .3, duck: .47, owl: .28, rooster: .26, bird: .35, horse: .57, frog: .8, bee: .4 };
    const FN = { cow, sheep, cat, dog, duck, owl, rooster, bird, horse, frog, bee };
    return { FN, LEVEL, play(c, out, name, t, nb) { const g = c.createGain(); g.gain.value = LEVEL[name]; g.connect(out); return FN[name](c, g, t, nb); } };
  })();
  /*CALLS-END*/

  const Audio6 = (() => {
    let ctx = null, bus = null, nb = null, voice = null;
    function init() {
      let A = null; try { A = R.audio && R.audio(); } catch (e) {}
      if (!A || !A.ctx || !A.bus) return null;
      if (A.ctx !== ctx) {   // shared core context: build our compressor and noise once, feeding the core bus
        ctx = A.ctx;
        const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.connect(A.bus);
        bus = ctx.createGain(); bus.gain.value = .9; bus.connect(comp);
        nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
      return ctx;
    }
    function stop() {
      if (!voice || !ctx) return;
      try { voice.gain.cancelScheduledValues(0); voice.gain.setTargetAtTime(0, ctx.currentTime, .03); } catch (e) {}
      const v = voice; voice = null; setTimeout(() => { try { v.disconnect(); } catch (e) {} }, 300);
    }
    function play(name) {
      if (R.isMuted()) return 0;
      const c = init(); if (!c) return 0;
      stop();
      voice = c.createGain(); voice.gain.value = 1; voice.connect(bus);
      try { return CALLS.play(c, voice, name, c.currentTime + .08, nb); } catch (e) { return 0; }
    }
    return { init, play, stop, ok: () => !!init() };
  })();

  const ANIMALS = {
    cow: { e: '🐮', n: 'Cow', say: 'Moo! Cows say moo.', clue: 'It lives on a farm, gives us milk and says “Moo”.', g: 'farm' },
    sheep: { e: '🐑', n: 'Sheep', say: 'Baa! Sheep say baa.', clue: 'It has a woolly coat and says “Baa”.', g: 'farm' },
    cat: { e: '🐱', n: 'Cat', say: 'Meow! Cats say meow.', clue: 'It purrs by the fire and says “Meow”.', g: 'pet' },
    dog: { e: '🐶', n: 'Dog', say: 'Woof! Dogs say woof.', clue: 'It wags its tail, fetches sticks and says “Woof”.', g: 'pet' },
    duck: { e: '🦆', n: 'Duck', say: 'Quack! Ducks say quack.', clue: 'It swims on the pond and says “Quack”.', g: 'bird' },
    owl: { e: '🦉', n: 'Owl', say: 'Hoo-hoo! Owls hoot at night.', clue: 'It is awake at night, has big eyes and says “Hoo-hoo”.', g: 'bird' },
    rooster: { e: '🐓', n: 'Rooster', say: 'Cock-a-doodle-doo! The rooster wakes the farm.', clue: 'It wakes everyone in the morning: “Cock-a-doodle-doo!”', g: 'bird' },
    bird: { e: '🐦', n: 'Songbird', say: 'Tweet tweet! Little birds sing in the trees.', clue: 'A little one that sings in the garden: “Tweet tweet”.', g: 'bird' },
    horse: { e: '🐴', n: 'Horse', say: 'Neigh! Horses neigh and whinny.', clue: 'You can ride it, it eats hay and says “Neigh”.', g: 'farm' },
    frog: { e: '🐸', n: 'Frog', say: 'Ribbit! Frogs croak by the pond.', clue: 'It is green, hops by the pond and says “Ribbit”.', g: 'small' },
    bee: { e: '🐝', n: 'Bee', say: 'Bzzz! Bees buzz round the flowers.', clue: 'It makes honey and goes “Bzzz”.', g: 'small' }
  };
  const EASY = ['cow', 'dog', 'cat', 'duck', 'sheep'];
  const ALL = Object.keys(ANIMALS);

  function startAnimal(L, api) {
    const lv = lvl(L);
    const pool = lv <= 1 ? EASY : lv === 2 ? EASY.concat(['owl', 'rooster']) : lv === 3 ? EASY.concat(['owl', 'rooster', 'bird', 'horse']) : ALL;
    const nCh = lv <= 2 ? 3 : 4, total = lv <= 2 ? 5 : 6;
    const tricky = lv >= 6 ? Math.min(.7, .2 + lv * .03) : 0;   // chance a distractor is a near neighbour
    const order = shuffle(pool.slice()).slice(0, total);
    let round = 0, mistakes = 0;
    const finish = once(s => { Audio6.stop(); api.done(s); });
    Audio6.init();

    function choicesFor(ans) {
      const set = [ans], others = shuffle(pool.filter(a => a !== ans));
      const near = shuffle(ALL.filter(a => a !== ans && ANIMALS[a].g === ANIMALS[ans].g));
      while (set.length < nCh) {
        const src = (Math.random() < tricky && near.length) ? near : others;
        const a = src.shift(); if (a && !set.includes(a)) set.push(a);
        if (!others.length && !near.length) break;
      }
      return shuffle(set);
    }

    function showRound() {
      api.stage.innerHTML = ''; api.rounds(total, round);
      const ans = order[round], A = ANIMALS[ans];
      let solved = false, wrongs = 0;
      const wrap = el('div', 'g6-wrap');
      const top = el('div', 'as-top');
      const radio = el('div', 'as-radio', '<span class="as-wave"></span><span class="as-wave"></span><span class="as-wave"></span><div class="as-grille"><b>♪</b></div><div class="as-knobs"><i></i><i></i></div>');
      const side = el('div', 'as-side');
      const playB = mkBtn('🔊 Play the sound', 'c-sun g6-big', () => playNow());
      const sound = el('div', 'g6-row');
      side.append(playB, sound);
      top.append(radio, side);
      const grid = el('div', 'as-choices' + (nCh === 4 ? ' four' : '')); grid.style.setProperty('--n', nCh);
      const say = el('div', 'g6-panel as-say', '<span>Listen, then tap the animal.</span>');
      const next = el('div', 'g6-row');
      wrap.append(top, grid, say, next);
      api.stage.append(wrap);
      api.hint('Listen to the sound. Which animal makes it?');

      function showMuted() {
        sound.innerHTML = '';
        sound.append(mkBtn('🔊 Turn the sound on', 'c-leaf', () => { R.unmute(); sound.innerHTML = ''; playNow(); }));
        say.className = 'g6-panel as-say clue';
        say.innerHTML = '<span class="em">🔇</span>';
        say.append(el('span', '', 'The sound is off. Here is a clue instead: ' + A.clue));
      }
      function playNow() {
        if (R.isMuted() || !Audio6.ok()) { showMuted(); return; }
        const d = Audio6.play(ans);
        if (!d) { showMuted(); return; }
        playB.innerHTML = '🔊 Play it again';
        radio.classList.add('as-on'); wob(radio);
        const me = ++playId;
        api.later(() => { if (me === playId) radio.classList.remove('as-on'); }, d * 1000 + 250);
      }
      choicesFor(ans).forEach(k => {
        const a = ANIMALS[k];
        const b = el('button', 'tile c-card as-card', `<span class="em">${a.e}</span><b>${a.n}</b>`); b.type = 'button';
        b.onclick = () => {
          if (solved) return;
          if (k === ans) {
            solved = true; b.classList.add('as-yes'); sfx.good();
            grid.querySelectorAll('.as-card').forEach(x => { if (x !== b) x.classList.add('as-no'); });
            say.className = 'g6-panel as-say good';
            say.innerHTML = `<span class="em">${a.e}</span>`; say.append(el('span', '', A.say));
            api.hint(wrongs ? 'You found it! ' + A.say : cheer() + ' ' + A.say);
            round++; api.rounds(total, round);
            next.innerHTML = '';
            if (round >= total) next.append(mkBtn('★ See my stars', 'c-leaf g6-big', () => finish(starsFor(mistakes, 1, 3))));
            else next.append(mkBtn('Next sound ▶', 'c-leaf g6-big', () => { sfx.tap(); showRound(); api.later(playNow2, 350); }));
          } else {
            mistakes++; wrongs++; b.classList.add('as-no'); sfx.soft(); wob(b);
            say.className = 'g6-panel as-say clue';
            say.innerHTML = '<span class="em">💡</span>'; say.append(el('span', '', 'Not the ' + a.n.toLowerCase() + '. Clue: ' + A.clue));
            api.hint('Not quite. Read the clue, or play the sound again.');
          }
        };
        grid.append(b);
      });
      playNow2 = playNow;
    }
    let playNow2 = () => {}, playId = 0;
    showRound();
    api.later(() => playNow2(), 500);
  }

  /* =====================================================================
     2. DRESS UP
     ===================================================================== */
  const scarfSVG = (a, b, cy, hw) => {
    const L = 100 - hw, Rt = 100 + hw, tx = 100 + hw * .4;
    return `<path d="M${L} ${cy - 7} Q100 ${cy + 7} ${Rt} ${cy - 7} L${Rt + 2} ${cy + 5} Q100 ${cy + 21} ${L - 2} ${cy + 5}Z" fill="${a}"/>
<path d="M${L + 6} ${cy - 1} Q100 ${cy + 12} ${Rt - 6} ${cy - 1}" stroke="${b}" stroke-width="3.5" fill="none"/>
<path d="M${tx - 6} ${cy + 6} L${tx + 8} ${cy + 4} L${tx + 14} ${cy + 40} L${tx} ${cy + 43}Z" fill="${a}"/>
<path d="M${tx - 2} ${cy + 18} L${tx + 10} ${cy + 16} M${tx} ${cy + 29} L${tx + 12} ${cy + 27}" stroke="${b}" stroke-width="4"/>
<path d="M${tx + 1} ${cy + 43} l0 6 M${tx + 5} ${cy + 42} l0 6 M${tx + 9} ${cy + 41.5} l0 6 M${tx + 13} ${cy + 40.5} l0 6" stroke="${a}" stroke-width="2.4" stroke-linecap="round"/>`;
  };
  const bowSVG = (a, b, cx, cy, dots) => `<path d="M${cx} ${cy} L${cx - 20} ${cy - 11} Q${cx - 24} ${cy} ${cx - 20} ${cy + 11}Z M${cx} ${cy} L${cx + 20} ${cy - 11} Q${cx + 24} ${cy} ${cx + 20} ${cy + 11}Z" fill="${a}" stroke="rgba(0,0,0,.2)" stroke-width="1.2"/>
${dots ? `<g fill="${b}"><circle cx="${cx - 13}" cy="${cy - 3}" r="2.2"/><circle cx="${cx - 9}" cy="${cy + 5}" r="2.2"/><circle cx="${cx + 13}" cy="${cy - 3}" r="2.2"/><circle cx="${cx + 9}" cy="${cy + 5}" r="2.2"/></g>` : ''}
<circle cx="${cx}" cy="${cy}" r="5.5" fill="${b}" stroke="rgba(0,0,0,.2)" stroke-width="1.2"/>`;
  const buttonsSVG = (col, ys, r) => ys.map(y => `<circle cx="100" cy="${y}" r="${r}" fill="${col}" stroke="rgba(0,0,0,.3)" stroke-width="1.2"/><circle cx="${100 - r * .35}" cy="${y - r * .35}" r="${r * .3}" fill="rgba(255,255,255,.55)"/>`).join('');
  const patchSVG = (col, x, y, w, h, rot) => `<g transform="rotate(${rot} ${x + w / 2} ${y + h / 2})"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${col}" stroke="rgba(0,0,0,.25)" stroke-width="1"/>
<rect x="${x + 2.5}" y="${y + 2.5}" width="${w - 5}" height="${h - 5}" fill="none" stroke="#fff" stroke-width="1.3" stroke-dasharray="3 2.5"/></g>`;

  // drawer: { n name, i icon, multi?, paint?, x,y,s (defaults), items:[{n, e | svg, at?, x,y,s,r, vars, sw, box}] }
  const SCENES = [
    {
      id: 'snowman', n: 'Dress a snowman', e: '⛄', bg: 'linear-gradient(#9FD6FF,#DDF1FF 70%,#fff)', snow: true,
      cap: ['What a smart snowman!', 'The best-dressed snowman in town!', 'Brrr, and very stylish!'],
      base: g => `<defs><radialGradient id="${g}" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#F1F6FB"/><stop offset="1" stop-color="#C9DCEE"/></radialGradient></defs>
<ellipse cx="100" cy="210" rx="92" ry="11" fill="#fff" opacity=".9"/>
<g stroke="#6B4A2B" stroke-width="4.5" stroke-linecap="round" fill="none"><path d="M72 108 L34 86 M46 93 L38 78 M46 93 L30 96"/><path d="M128 108 L166 86 M154 93 L162 78 M154 93 L170 96"/></g>
<circle cx="100" cy="168" r="44" fill="url(#${g})"/><circle cx="100" cy="112" r="32" fill="url(#${g})"/><circle cx="100" cy="64" r="25" fill="url(#${g})"/>
<circle cx="91" cy="59" r="3.4" fill="#2B2B2B"/><circle cx="109" cy="59" r="3.4" fill="#2B2B2B"/>
<g fill="#2B2B2B"><circle cx="88" cy="72" r="1.9"/><circle cx="93.5" cy="75.6" r="1.9"/><circle cx="100" cy="76.8" r="1.9"/><circle cx="106.5" cy="75.6" r="1.9"/><circle cx="112" cy="72" r="1.9"/></g>`,
      drawers: [
        { n: 'Hats', i: '🎩', x: 100, y: 30, s: 50, items: [{ n: 'Top hat', e: '🎩' }, { n: 'Sun hat', e: '👒', s: 56, y: 33 }, { n: 'Cap', e: '🧢', s: 46, y: 36 }, { n: 'Crown', e: '👑', s: 40, y: 34 }, { n: 'Bow', e: '🎀', s: 36, x: 116, y: 40, r: 18 }] },
        { n: 'Noses', i: '🥕', x: 101, y: 67, s: 20, items: [{ n: 'Carrot', e: '🥕', r: 45, x: 96 }, { n: 'Strawberry', e: '🍓', s: 15 }, { n: 'Cherry', e: '🍒', s: 16, y: 64 }, { n: 'Chilli', e: '🌶️', r: 30, x: 96 }] },
        { n: 'Scarves', i: '🧣', items: [
          { n: 'Red scarf', svg: scarfSVG('#E8473C', '#FFD447', 86, 26), sw: '#E8473C', box: [66, 72, 68, 70] },
          { n: 'Blue scarf', svg: scarfSVG('#3B8FE0', '#fff', 86, 26), sw: '#3B8FE0', box: [66, 72, 68, 70] },
          { n: 'Green scarf', svg: scarfSVG('#3DAE5B', '#FF8A3D', 86, 26), sw: '#3DAE5B', box: [66, 72, 68, 70] },
          { n: 'Purple scarf', svg: scarfSVG('#8E5BD6', '#FFB6D9', 86, 26), sw: '#8E5BD6', box: [66, 72, 68, 70] }] },
        { n: 'Buttons', i: '⚫', items: [
          { n: 'Coal buttons', svg: buttonsSVG('#2D2D2D', [102, 116, 130, 156, 176], 4.6), box: [88, 92, 24, 92] },
          { n: 'Red buttons', svg: buttonsSVG('#E8473C', [102, 116, 130, 156, 176], 4.8), box: [88, 92, 24, 92] },
          { n: 'Gold buttons', svg: buttonsSVG('#F5B82E', [102, 116, 130, 156, 176], 4.8), box: [88, 92, 24, 92] },
          { n: 'Daisies', e: '🌼', s: 13, at: [[100, 103], [100, 118], [100, 133], [100, 158]] }] },
        { n: 'Extras', i: '🐦', multi: true, items: [{ n: 'Sunglasses', e: '🕶️', x: 100, y: 59, s: 32 }, { n: 'Robin', e: '🐦', x: 36, y: 72, s: 26 }, { n: 'Mittens', e: '🧤', x: 168, y: 82, s: 24, r: 20 }, { n: 'Broom', e: '🧹', x: 166, y: 160, s: 56, r: 10 }, { n: 'Tulip', e: '🌷', x: 58, y: 192, s: 26 }] }
      ]
    },
    {
      id: 'teddy', n: 'Dress a teddy bear', e: '🧸', bg: 'linear-gradient(#FFE6C7,#FFD3A8 70%,#E9A36B)',
      cap: ['What a cuddly bear!', 'Teddy is ready for a party!', 'The smartest bear in the house!'],
      vars: { '--fur': '#C98B4B', '--fur2': '#F2D2A2' },
      base: () => `<ellipse cx="100" cy="212" rx="78" ry="8" fill="rgba(0,0,0,.15)"/>
<circle cx="62" cy="48" r="17" style="fill:var(--fur)"/><circle cx="138" cy="48" r="17" style="fill:var(--fur)"/>
<circle cx="62" cy="48" r="8.5" style="fill:var(--fur2)"/><circle cx="138" cy="48" r="8.5" style="fill:var(--fur2)"/>
<ellipse cx="72" cy="192" rx="23" ry="19" style="fill:var(--fur)"/><ellipse cx="128" cy="192" rx="23" ry="19" style="fill:var(--fur)"/>
<ellipse cx="70" cy="197" rx="12" ry="10" style="fill:var(--fur2)"/><ellipse cx="130" cy="197" rx="12" ry="10" style="fill:var(--fur2)"/>
<ellipse cx="54" cy="134" rx="14" ry="30" transform="rotate(28 54 134)" style="fill:var(--fur)"/><ellipse cx="146" cy="134" rx="14" ry="30" transform="rotate(-28 146 134)" style="fill:var(--fur)"/>
<ellipse cx="100" cy="148" rx="45" ry="50" style="fill:var(--fur)"/><ellipse cx="100" cy="154" rx="28" ry="33" style="fill:var(--fur2)"/>
<circle cx="100" cy="78" r="40" style="fill:var(--fur)"/><ellipse cx="100" cy="92" rx="18" ry="14" style="fill:var(--fur2)"/>
<ellipse cx="100" cy="86" rx="7" ry="5" fill="#3A2416"/><path d="M100 91 v6 M92 99 Q100 105 108 99" stroke="#3A2416" stroke-width="2.4" fill="none" stroke-linecap="round"/>
<circle cx="85" cy="72" r="4.6" fill="#2A1A10"/><circle cx="115" cy="72" r="4.6" fill="#2A1A10"/><circle cx="86.5" cy="70.5" r="1.4" fill="#fff"/><circle cx="116.5" cy="70.5" r="1.4" fill="#fff"/>`,
      drawers: [
        { n: 'Fur colour', i: '🎨', paint: true, items: [
          { n: 'Chocolate', sw: '#7A4E2D', vars: { '--fur': '#7A4E2D', '--fur2': '#C49A6C' } },
          { n: 'Snowy white', sw: '#EDE6DA', vars: { '--fur': '#EDE6DA', '--fur2': '#FFFFFF' } },
          { n: 'Pink', sw: '#F2A0B8', vars: { '--fur': '#F2A0B8', '--fur2': '#FFD9E4' } },
          { n: 'Grey', sw: '#9C9C9C', vars: { '--fur': '#9C9C9C', '--fur2': '#DADADA' } },
          { n: 'Sky blue', sw: '#8CC7F0', vars: { '--fur': '#8CC7F0', '--fur2': '#D7EEFF' } }] },
        { n: 'Hats', i: '👒', x: 100, y: 36, s: 54, items: [{ n: 'Top hat', e: '🎩', s: 46, y: 30 }, { n: 'Sun hat', e: '👒' }, { n: 'Cap', e: '🧢', s: 50, y: 40 }, { n: 'Crown', e: '👑', s: 40, y: 36 }, { n: 'Mortarboard', e: '🎓', s: 46, y: 34 }] },
        { n: 'Bows', i: '🎀', items: [
          { n: 'Red bow tie', svg: bowSVG('#E8473C', '#B5281F', 100, 119), sw: '#E8473C', box: [76, 104, 48, 30] },
          { n: 'Blue bow tie', svg: bowSVG('#3B8FE0', '#1F5FA6', 100, 119, 1), sw: '#3B8FE0', box: [76, 104, 48, 30] },
          { n: 'Spotty bow tie', svg: bowSVG('#FFD447', '#E8473C', 100, 119, 1), sw: '#FFD447', box: [76, 104, 48, 30] },
          { n: 'Ribbon', e: '🎀', x: 100, y: 118, s: 34 },
          { n: 'Scarf', svg: scarfSVG('#3DAE5B', '#fff', 117, 34), sw: '#3DAE5B', box: [60, 100, 80, 70] }] },
        { n: 'Tummy', i: '❤️', x: 100, y: 152, s: 26, items: [{ n: 'Heart', e: '❤️' }, { n: 'Star', e: '⭐' }, { n: 'Moon', e: '🌙' }, { n: 'Daisy', e: '🌼' }, { n: 'Rainbow', e: '🌈' }] },
        { n: 'Extras', i: '🎈', multi: true, items: [{ n: 'Glasses', e: '👓', x: 100, y: 73, s: 36 }, { n: 'Balloon', e: '🎈', x: 30, y: 74, s: 44 }, { n: 'Honey', e: '🍯', x: 162, y: 160, s: 28 }, { n: 'Sunflower', e: '🌻', x: 36, y: 160, s: 28 }, { n: 'Bee friend', e: '🐝', x: 168, y: 58, s: 22 }] }
      ]
    },
    {
      id: 'cake', n: 'Decorate a cake', e: '🎂', bg: 'linear-gradient(#FFE0EC,#FFC7DA 70%,#F5A6C0)',
      cap: ['What a scrumptious cake!', 'Too pretty to eat!', 'Time for tea and cake!'],
      vars: { '--ice': '#FFF4DC', '--ice2': '#FFE3A8' },
      base: () => `<ellipse cx="100" cy="208" rx="30" ry="6" fill="#D5DCE6"/><rect x="92" y="196" width="16" height="12" fill="#E6ECF3"/>
<ellipse cx="100" cy="196" rx="84" ry="10" fill="#F4F7FB" stroke="#D5DCE6" stroke-width="2"/>
<path d="M28 140 h144 v50 q0 7 -72 7 q-72 0 -72 -7z" style="fill:var(--ice)"/>
<path d="M28 140 h144 v12 q-6 10 -12 0 q-6 12 -14 0 q-7 9 -14 0 q-7 13 -15 0 q-7 9 -14 0 q-8 12 -15 0 q-7 10 -14 0 q-7 12 -15 0 q-7 9 -14 0 q-6 10 -11 0z" style="fill:var(--ice2)"/>
<ellipse cx="100" cy="140" rx="72" ry="9" style="fill:var(--ice2)"/>
<path d="M56 90 h88 v48 q0 6 -44 6 q-44 0 -44 -6z" style="fill:var(--ice)"/>
<path d="M56 90 h88 v10 q-5 9 -10 0 q-6 11 -12 0 q-6 8 -12 0 q-6 12 -13 0 q-6 8 -12 0 q-6 11 -12 0 q-6 9 -11 0 q-4 8 -6 0z" style="fill:var(--ice2)"/>
<ellipse cx="100" cy="90" rx="44" ry="7" style="fill:var(--ice2)"/>
<path d="M30 165 q70 10 140 0" stroke="rgba(255,255,255,.6)" stroke-width="3" fill="none"/>`,
      drawers: [
        { n: 'Icing', i: '🎨', paint: true, items: [
          { n: 'Strawberry', sw: '#FF9EC4', vars: { '--ice': '#FF9EC4', '--ice2': '#FFC6DC' } },
          { n: 'Chocolate', sw: '#8A5232', vars: { '--ice': '#8A5232', '--ice2': '#B9784E' } },
          { n: 'Lemon', sw: '#FFE066', vars: { '--ice': '#FFE066', '--ice2': '#FFF2A8' } },
          { n: 'Mint', sw: '#9EE8C8', vars: { '--ice': '#9EE8C8', '--ice2': '#CDF6E3' } },
          { n: 'Blueberry', sw: '#9FB8FF', vars: { '--ice': '#9FB8FF', '--ice2': '#D0DCFF' } }] },
        { n: 'On top', i: '🕯️', s: 22, items: [
          { n: 'Candles', e: '🕯️', at: [[80, 72], [100, 68], [120, 72]], s: 24 },
          { n: 'Cherry', e: '🍒', x: 100, y: 74, s: 30 },
          { n: 'Strawberries', e: '🍓', at: [[78, 82], [100, 78], [122, 82]], s: 20 },
          { n: 'Roses', e: '🌹', at: [[80, 80], [100, 76], [120, 80]], s: 20 },
          { n: 'Star', e: '⭐', x: 100, y: 70, s: 34 }] },
        { n: 'Sides', i: '🍬', s: 15, items: [
          { n: 'Sprinkles', svg: [...Array(26)].map((_, k) => { const x = 36 + (k * 37) % 128, y = 152 + (k * 13) % 34, c = ['#E8473C', '#3B8FE0', '#3DAE5B', '#F5B82E', '#8E5BD6'][k % 5]; return `<rect x="${x}" y="${y}" width="7" height="2.6" rx="1.3" fill="${c}" transform="rotate(${(k * 47) % 180} ${x + 3} ${y + 1})"/>`; }).join(''), sw: '#F5B82E', box: [28, 140, 144, 56] },
          { n: 'Sweets', e: '🍬', at: [[44, 172], [72, 176], [100, 177], [128, 176], [156, 172]] },
          { n: 'Hearts', e: '❤️', at: [[44, 172], [72, 176], [100, 177], [128, 176], [156, 172]] },
          { n: 'Daisies', e: '🌼', at: [[44, 172], [72, 176], [100, 177], [128, 176], [156, 172], [70, 118], [100, 120], [130, 118]] },
          { n: 'Blueberries', e: '🫐', at: [[44, 172], [72, 176], [100, 177], [128, 176], [156, 172]], s: 13 }] },
        { n: 'Extras', i: '🎁', multi: true, items: [{ n: 'Cup of tea', e: '☕', x: 24, y: 184, s: 30 }, { n: 'Present', e: '🎁', x: 178, y: 180, s: 32 }, { n: 'Balloon', e: '🎈', x: 28, y: 46, s: 40 }, { n: 'Party popper', e: '🎉', x: 170, y: 52, s: 34 }, { n: 'Bunting', e: '🎊', x: 100, y: 22, s: 34 }] }
      ]
    },
    {
      id: 'scarecrow', n: 'Dress a scarecrow', e: '🌾', bg: 'linear-gradient(#A6DDFF,#DDF3FF 62%,#9CD06A 62%,#7CB64C)',
      cap: ['What a cheerful scarecrow!', 'The birds will want to say hello!', 'The smartest scarecrow in the field!'],
      vars: { '--shirt': '#E8473C' },
      base: () => `<g fill="#E8B83A"><path d="M60 196 l-6 14 h14z M140 196 l-6 14 h14z"/></g>
<rect x="95" y="58" width="10" height="160" rx="3" fill="#8A5A2B"/><rect x="26" y="104" width="148" height="9" rx="3" fill="#8A5A2B"/>
<g stroke="#E8B83A" stroke-width="3" stroke-linecap="round"><path d="M30 102 l-12 -6 M30 108 l-14 0 M30 114 l-12 6"/><path d="M170 102 l12 -6 M170 108 l14 0 M170 114 l12 6"/>
<path d="M82 176 l-6 18 M90 178 l-2 18 M100 178 v20 M110 178 l2 18 M118 176 l6 18"/></g>
<path d="M30 100 L74 96 L70 100 L68 120 L30 120z M170 100 L126 96 L130 100 L132 120 L170 120z" style="fill:var(--shirt)"/>
<path d="M70 96 L130 96 L126 178 L74 178z" style="fill:var(--shirt)"/>
<g stroke="rgba(255,255,255,.35)" stroke-width="3"><path d="M84 96 V178 M100 96 V178 M116 96 V178 M72 120 H128 M73 145 H127 M74 168 H126 M44 100 V120 M156 100 V120"/></g>
<g stroke="rgba(0,0,0,.15)" stroke-width="2"><path d="M92 96 V178 M108 96 V178 M72 132 H128 M73 156 H127"/></g>
<path d="M100 98 V176" stroke="rgba(0,0,0,.2)" stroke-width="1.5"/><circle cx="100" cy="112" r="2.4" fill="#fff"/><circle cx="100" cy="132" r="2.4" fill="#fff"/><circle cx="100" cy="152" r="2.4" fill="#fff"/>
<g stroke="#E8B83A" stroke-width="3" stroke-linecap="round"><path d="M82 46 l-6 -10 M90 42 l-3 -12 M100 40 v-12 M110 42 l3 -12 M118 46 l6 -10"/></g>
<circle cx="100" cy="68" r="27" fill="#E9CFA0" stroke="#C8A66C" stroke-width="2"/>
<path d="M87 60 l7 7 M94 60 l-7 7 M106 60 l7 7 M113 60 l-7 7" stroke="#4A2B15" stroke-width="2.6" stroke-linecap="round"/>
<path d="M86 79 Q100 90 114 79" stroke="#4A2B15" stroke-width="2.4" fill="none" stroke-dasharray="3 2.5"/>
<path d="M84 92 Q100 98 116 92" stroke="#B88A4A" stroke-width="3" fill="none"/>`,
      drawers: [
        { n: 'Shirt colour', i: '🎨', paint: true, items: [
          { n: 'Blue shirt', sw: '#3B8FE0', vars: { '--shirt': '#3B8FE0' } }, { n: 'Green shirt', sw: '#3DAE5B', vars: { '--shirt': '#3DAE5B' } },
          { n: 'Orange shirt', sw: '#FF8A3D', vars: { '--shirt': '#FF8A3D' } }, { n: 'Purple shirt', sw: '#8E5BD6', vars: { '--shirt': '#8E5BD6' } }, { n: 'Yellow shirt', sw: '#F5C431', vars: { '--shirt': '#F5C431' } }] },
        { n: 'Hats', i: '👒', x: 100, y: 38, s: 60, items: [{ n: 'Straw hat', e: '👒' }, { n: 'Top hat', e: '🎩', s: 48, y: 30 }, { n: 'Cap', e: '🧢', s: 52, y: 42 }, { n: 'Crown', e: '👑', s: 40, y: 40 }] },
        { n: 'Neck', i: '🧣', items: [
          { n: 'Red scarf', svg: scarfSVG('#C8332B', '#FFD447', 96, 30), sw: '#C8332B', box: [62, 82, 76, 70] },
          { n: 'Blue scarf', svg: scarfSVG('#2E6FB8', '#fff', 96, 30), sw: '#2E6FB8', box: [62, 82, 76, 70] },
          { n: 'Spotty bow tie', svg: bowSVG('#FFD447', '#E8473C', 100, 100, 1), sw: '#FFD447', box: [76, 86, 48, 30] },
          { n: 'Green bow tie', svg: bowSVG('#3DAE5B', '#1F7A3A', 100, 100, 1), sw: '#3DAE5B', box: [76, 86, 48, 30] }] },
        { n: 'Patches', i: '🟫', multi: true, items: [
          { n: 'Yellow patch', svg: patchSVG('#F5C431', 78, 136, 18, 16, -10), sw: '#F5C431', box: [70, 128, 34, 32] },
          { n: 'Blue patch', svg: patchSVG('#4FA3F0', 106, 112, 16, 18, 12), sw: '#4FA3F0', box: [98, 104, 32, 34] },
          { n: 'Green patch', svg: patchSVG('#4CC36B', 40, 103, 15, 13, 8), sw: '#4CC36B', box: [32, 95, 31, 29] },
          { n: 'Pink patch', svg: patchSVG('#FF8FB5', 108, 156, 16, 15, -6), sw: '#FF8FB5', box: [100, 148, 32, 31] }] },
        { n: 'Friends', i: '🐦', multi: true, items: [{ n: 'Bird', e: '🐦', x: 160, y: 92, s: 26 }, { n: 'Sunflower', e: '🌻', x: 120, y: 118, s: 22 }, { n: 'Pumpkin', e: '🎃', x: 48, y: 196, s: 32 }, { n: 'Mouse', e: '🐭', x: 152, y: 204, s: 22 }, { n: 'Butterfly', e: '🦋', x: 38, y: 60, s: 24 }, { n: 'Carrot nose', e: '🥕', x: 96, y: 72, s: 16, r: 45 }] }
      ]
    }
  ];

  function startDress(L, api) {
    const finish = once(() => api.done(3));
    function chooseScene() {
      api.stage.innerHTML = ''; api.rounds(0, 0);
      api.hint('Who shall we dress up today? Tap a picture.');
      const wrap = el('div', 'g6-wrap'), grid = el('div', 'du-pick');
      const cols = ['c-sky', 'c-peach', 'c-rose', 'c-sun'];
      SCENES.forEach((sc, k) => {
        const b = el('button', 'tile du-scene ' + cols[k], `<span class="em">${sc.e}</span><b>${sc.n}</b>`); b.type = 'button';
        b.onclick = () => { sfx.good(); play(sc); };
        grid.append(b);
      });
      wrap.append(grid); api.stage.append(wrap);
    }

    function play(sc) {
      api.stage.innerHTML = '';
      const worn = new Map();   // key "d:i" -> element
      let paint = new Map();    // drawer index -> item index
      let open = 0, count = 0, finished = false;
      const wrap = el('div', 'du-play');
      const box = el('div', 'du-stagebox'); box.style.background = sc.bg;
      const fig = el('div', 'du-fig');
      if (sc.vars) Object.entries(sc.vars).forEach(([k, v]) => fig.style.setProperty(k, v));
      fig.innerHTML = `<svg viewBox="0 0 200 220" aria-hidden="true">${sc.base(nid('g'))}</svg>`;
      box.append(fig);
      if (sc.snow) {
        const fl = el('div', 'du-confetti');
        for (let k = 0; k < 10; k++) { const s = el('span', '', '❄'); s.style.cssText = `left:${randInt(95)}%;color:#fff;font-size:${12 + randInt(10)}px;opacity:.8;animation:g6-fall ${7 + randInt(6)}s linear ${-randInt(12)}s infinite`; fl.append(s); }
        box.prepend(fl);
      }
      const ctrl = el('div', 'du-ctrl');
      const tabs = el('div', 'du-tabs'), dname = el('p', 'du-dname'), items = el('div', 'du-items');
      const btns = el('div', 'g6-row');
      const doneB = mkBtn('✓ All done!', 'c-mint g6-big', () => snapshot());
      const backB = mkBtn('↺ Someone else', 'c-card', () => { sfx.tap(); chooseScene(); });
      btns.append(doneB, backB);
      ctrl.append(tabs, dname, items, btns);
      wrap.append(box, ctrl); api.stage.append(wrap);
      api.hint('Tap a drawer, then tap something to put it on. Tap it again to take it off.');

      function pos(it, d) { return { x: it.x ?? d.x ?? 100, y: it.y ?? d.y ?? 100, s: it.s ?? d.s ?? 30, r: it.r ?? d.r ?? 0 }; }
      function sparkle(x, y) {
        ['✨', '⭐', '✨', '💫'].forEach((s, k) => {
          const sp = el('span', 'du-spark', s); const a = k * Math.PI / 2 + .6;
          sp.style.left = (x / 2) + '%'; sp.style.top = (y / 2.2) + '%';
          sp.style.setProperty('--dx', Math.round(Math.cos(a) * 46) + 'px'); sp.style.setProperty('--dy', Math.round(Math.sin(a) * 46) + 'px');
          fig.append(sp); api.later(() => sp.remove(), 800);
        });
      }
      function hop() { fig.classList.remove('du-hop'); void fig.offsetWidth; fig.classList.add('du-hop'); }
      function chime() { const k = Math.min(count, 10); tone(523 * Math.pow(2, k * 2 / 12), .18, 'triangle', .12); tone(784 * Math.pow(2, k * 2 / 12), .22, 'sine', .07, .08); }

      function putOn(di, ii) {
        const d = sc.drawers[di], it = d.items[ii], key = di + ':' + ii;
        if (d.paint) {
          Object.entries(it.vars).forEach(([k, v]) => fig.style.setProperty(k, v));
          paint.set(di, ii); count++; hop(); chime(); sparkle(100, 130);
          return;
        }
        if (!d.multi) sc.drawers[di].items.forEach((_, j) => { if (worn.has(di + ':' + j)) takeOff(di, j, true); });
        let node;
        if (it.svg) {
          node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          node.setAttribute('viewBox', '0 0 200 220'); node.setAttribute('class', 'du-it du-in');
          node.style.cssText = 'left:0;top:0;width:100%;height:100%';
          const bx = it.box; node.style.transformOrigin = `${(bx[0] + bx[2] / 2) / 2}% ${(bx[1] + bx[3] / 2) / 2.2}%`;
          node.innerHTML = it.svg;
          node.querySelectorAll('*').forEach(n => { n.style.cursor = 'pointer'; });
          node.addEventListener('click', () => { if (!finished) { sfx.tap(); takeOff(di, ii); syncItems(); } });
          sparkle(bx[0] + bx[2] / 2, bx[1] + bx[3] / 2);
        } else {
          node = el('div', ''); node.style.cssText = 'position:absolute;inset:0;pointer-events:none';
          const spots = it.at || [[null, null]];
          spots.forEach(([ax, ay], k) => {
            const p = pos(it, d); if (ax != null) { p.x = ax; p.y = ay; }
            const s = el('span', 'du-it du-in', it.e); s.style.left = p.x / 2 + '%'; s.style.top = p.y / 2.2 + '%';
            s.style.setProperty('--s', p.s); s.style.setProperty('--r', p.r + 'deg'); s.style.pointerEvents = 'auto';
            s.style.animationDelay = (k * .08) + 's';
            s.onclick = () => { if (!finished) { sfx.tap(); takeOff(di, ii); syncItems(); } };
            node.append(s);
            if (k === 0) sparkle(p.x, p.y);
          });
        }
        fig.append(node); worn.set(key, node); count++; hop(); chime();
      }
      function takeOff(di, ii, quiet) {
        const d = sc.drawers[di], key = di + ':' + ii;
        if (d.paint) {
          paint.delete(di);
          Object.keys(it0(d).vars).forEach(k => fig.style.setProperty(k, sc.vars[k]));
          count = Math.max(0, count - 1); if (!quiet) tone(392, .16, 'sine', .08);
          return;
        }
        const node = worn.get(key); if (!node) return;
        worn.delete(key); count = Math.max(0, count - 1);
        const parts = node.tagName.toLowerCase() === 'svg' ? [node] : [...node.children];
        parts.forEach(p => { p.classList.remove('du-in'); p.classList.add('du-out'); });
        api.later(() => node.remove(), 380);
        if (!quiet) tone(392, .16, 'sine', .08);
      }
      const it0 = d => d.items[0];
      const isOn = (di, ii) => sc.drawers[di].paint ? paint.get(di) === ii : worn.has(di + ':' + ii);

      function thumb(it) {
        if (it.vars && !it.e) return `<span class="sw" style="background:${it.sw}"></span>`;
        if (it.svg) { const b = it.box; return `<svg viewBox="${b.join(' ')}" aria-hidden="true">${it.svg}</svg>`; }
        return it.e;
      }
      function syncItems() { items.querySelectorAll('.du-item').forEach((b, ii) => b.classList.toggle('on', isOn(open, ii))); }
      function showDrawer(di) {
        open = di; const d = sc.drawers[di];
        tabs.querySelectorAll('.du-tab').forEach((t, k) => t.classList.toggle('on', k === di));
        dname.textContent = d.n + (d.paint ? ': tap a colour' : d.multi ? ': tap as many as you like' : '');
        items.innerHTML = '';
        d.items.forEach((it, ii) => {
          const b = el('button', 'tile c-card du-item', thumb(it)); b.type = 'button'; b.setAttribute('aria-label', it.n); b.title = it.n;
          b.onclick = () => {
            if (finished) return;
            if (isOn(di, ii)) { takeOff(di, ii); api.hint('Taken off. Try something else!'); }
            else {
              if (d.paint && paint.has(di)) { paint.delete(di); count = Math.max(0, count - 1); }
              putOn(di, ii); api.hint(pick(['Lovely!', 'Very smart!', 'That looks grand!', 'Oh, how nice!', 'Perfect!']) + ' ' + it.n + (d.paint ? '.' : ' is on.'));
            }
            syncItems(); wob(b);
          };
          items.append(b);
        });
        syncItems();
      }
      sc.drawers.forEach((d, di) => {
        const t = el('button', 'tile c-sun du-tab', d.i); t.type = 'button'; t.setAttribute('aria-label', d.n); t.title = d.n;
        t.onclick = () => { sfx.tap(); showDrawer(di); };
        tabs.append(t);
      });
      showDrawer(0);

      function snapshot() {
        if (finished) return; finished = true;
        sfx.good();
        const flash = el('div', 'du-flash'); document.body.append(flash); api.later(() => flash.remove(), 700);
        tone(1400, .05, 'square', .05); tone(900, .06, 'square', .05, .06);
        api.stage.innerHTML = '';
        const w = el('div', 'g6-wrap'); w.style.justifyItems = 'center'; w.style.position = 'relative';
        const snap = el('div', 'du-snap');
        snap.append(box);
        const things = worn.size + paint.size;
        snap.append(el('p', '', pick(sc.cap)));
        if (things) snap.append(el('p', '', `<small style="font-size:1.05rem;color:var(--ink-soft)">${things} lovely ${things === 1 ? 'thing' : 'things'} on</small>`));
        const conf = el('div', 'du-confetti');
        for (let k = 0; k < 18; k++) { const s = el('span', '', pick(['🎉', '⭐', '✨', '💖', '🌟', '🎈'])); s.style.left = randInt(96) + '%'; s.style.animationDelay = (randInt(120) / 100) + 's'; conf.append(s); }
        w.append(snap, conf);
        api.stage.append(w);
        api.hint('Snap! What a lovely picture.');
        [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .25, 'triangle', .1, .2 + i * .1));
        api.later(finish, 2600);
      }
    }
    chooseScene();
  }

  /* =====================================================================
     3. POSTCARD MAKER
     ===================================================================== */
  const PW = 600, PH = 400;
  function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function grad(c, y0, y1, stops) { const g = c.createLinearGradient(0, y0, 0, y1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; }
  function cloud(c, x, y, s) { c.fillStyle = 'rgba(255,255,255,.92)'; [[0, 0, 22], [24, -10, 28], [52, 0, 22], [26, 8, 24]].forEach(([a, b, r]) => { c.beginPath(); c.arc(x + a * s, y + b * s, r * s, 0, 7); c.fill(); }); }
  function sun(c, x, y, r, col) { const g = c.createRadialGradient(x, y, r * .3, x, y, r * 2.2); g.addColorStop(0, 'rgba(255,240,170,.9)'); g.addColorStop(1, 'rgba(255,240,170,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 2.2, 0, 7); c.fill(); c.fillStyle = col || '#FFD34D'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
  function hill(c, y, amp, col, ph, r) { c.fillStyle = col; c.beginPath(); c.moveTo(0, PH); for (let x = 0; x <= PW; x += 10) c.lineTo(x, y - Math.sin(x / 110 + ph) * amp - Math.sin(x / 47 + ph * 2) * amp * .3); c.lineTo(PW, PH); c.fill(); }
  function tree(c, x, y, s, col) { c.fillStyle = '#7A4A28'; c.fillRect(x - 4 * s, y - 16 * s, 8 * s, 18 * s); c.fillStyle = col || '#3E9A3A'; [[0, -36, 22], [-14, -24, 16], [14, -24, 16]].forEach(([a, b, r]) => { c.beginPath(); c.arc(x + a * s, y + b * s, r * s, 0, 7); c.fill(); }); }
  function pine(c, x, y, s, snow) { c.fillStyle = '#5A361C'; c.fillRect(x - 3 * s, y - 8 * s, 6 * s, 10 * s); for (let k = 0; k < 3; k++) { c.fillStyle = '#2F7D4A'; c.beginPath(); c.moveTo(x, y - (40 + k * -0) * s - k * 14 * s); c.lineTo(x - (22 - k * 5) * s, y - 6 * s - k * 14 * s); c.lineTo(x + (22 - k * 5) * s, y - 6 * s - k * 14 * s); c.fill(); if (snow) { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x, y - 40 * s - k * 14 * s); c.lineTo(x - 8 * s, y - 28 * s - k * 14 * s); c.lineTo(x + 8 * s, y - 28 * s - k * 14 * s); c.fill(); } } }
  function house(c, x, y, w, h, wall, roof, snow, lit) {
    c.fillStyle = wall; c.fillRect(x, y - h, w, h);
    c.fillStyle = roof; c.beginPath(); c.moveTo(x - 8, y - h); c.lineTo(x + w / 2, y - h - w * .5); c.lineTo(x + w + 8, y - h); c.fill();
    if (snow) { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - 10, y - h + 2); c.lineTo(x + w / 2, y - h - w * .5 - 4); c.lineTo(x + w + 10, y - h + 2); c.lineTo(x + w + 4, y - h - 4); c.lineTo(x + w / 2, y - h - w * .5 + 4); c.lineTo(x - 4, y - h - 4); c.fill(); }
    c.fillStyle = '#7A4A28'; c.fillRect(x + w * .4, y - h * .5, w * .2, h * .5);
    c.fillStyle = lit ? '#FFD966' : '#BFE6FF'; c.fillRect(x + w * .12, y - h * .75, w * .2, h * .22); c.fillRect(x + w * .68, y - h * .75, w * .2, h * .22);
  }
  const SCENE_ART = [
    { n: 'Seaside', g: 'Greetings from the seaside', draw(c, r) {
      c.fillStyle = grad(c, 0, 230, ['#6CC8FF', '#D9F3FF']); c.fillRect(0, 0, PW, PH);
      sun(c, 470 + r() * 60, 70, 38); cloud(c, 60 + r() * 80, 70, 1.1); cloud(c, 280 + r() * 60, 110, .8);
      c.fillStyle = grad(c, 210, 310, ['#2E8FD0', '#5BC4EA']); c.fillRect(0, 210, PW, 110);
      c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 3;
      for (let k = 0; k < 14; k++) { const x = r() * PW, y = 225 + r() * 75; c.beginPath(); c.arc(x, y, 12, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
      const bx = 140 + r() * 220; c.fillStyle = '#8A4A28'; c.beginPath(); c.moveTo(bx - 40, 235); c.lineTo(bx + 40, 235); c.lineTo(bx + 28, 252); c.lineTo(bx - 28, 252); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(bx, 160); c.lineTo(bx, 232); c.lineTo(bx + 38, 232); c.fill(); c.fillStyle = '#E8473C'; c.beginPath(); c.moveTo(bx - 4, 172); c.lineTo(bx - 4, 232); c.lineTo(bx - 32, 232); c.fill();
      c.fillStyle = '#F5D58A'; c.beginPath(); c.moveTo(0, 300); c.quadraticCurveTo(300, 270, PW, 305); c.lineTo(PW, PH); c.lineTo(0, PH); c.fill();
      ['#E8473C', '#3B8FE0', '#3DAE5B', '#F5B82E', '#8E5BD6'].forEach((col, k) => { const x = 330 + k * 52, y = 330; c.fillStyle = '#fff'; c.fillRect(x, y, 40, 46); c.fillStyle = col; for (let s = 0; s < 4; s++) c.fillRect(x + s * 10, y, 5, 46); c.fillStyle = col; c.beginPath(); c.moveTo(x - 4, y); c.lineTo(x + 20, y - 18); c.lineTo(x + 44, y); c.fill(); c.fillStyle = '#5A361C'; c.fillRect(x + 14, y + 24, 12, 22); });
      c.fillStyle = '#E8473C'; c.beginPath(); c.arc(110, 330, 46, Math.PI, 0); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(110, 330); c.arc(110, 330, 46, Math.PI * 1.2, Math.PI * 1.4); c.fill(); c.beginPath(); c.moveTo(110, 330); c.arc(110, 330, 46, Math.PI * 1.6, Math.PI * 1.8); c.fill(); c.fillStyle = '#5A361C'; c.fillRect(107, 330, 6, 50);
      c.strokeStyle = '#4A4A4A'; c.lineWidth = 3; for (let k = 0; k < 3; k++) { const x = 160 + r() * 260, y = 50 + r() * 70; c.beginPath(); c.moveTo(x - 12, y); c.quadraticCurveTo(x - 6, y - 8, x, y); c.quadraticCurveTo(x + 6, y - 8, x + 12, y); c.stroke(); }
    } },
    { n: 'Countryside', g: 'Greetings from the country', draw(c, r) {
      c.fillStyle = grad(c, 0, 260, ['#7FCBFF', '#E6F7FF']); c.fillRect(0, 0, PW, PH);
      sun(c, 90 + r() * 40, 70, 34); cloud(c, 260 + r() * 60, 60, 1); cloud(c, 440 + r() * 60, 100, .8);
      hill(c, 220, 24, '#9AD27A', r() * 6, r); hill(c, 265, 20, '#6CBF52', r() * 6, r);
      const hx = 360 + r() * 100; house(c, hx, 270, 90, 60, '#FFF2D6', '#C0533A');
      c.fillStyle = 'rgba(255,255,255,.7)'; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(hx + 70 + k * 6, 170 - k * 16, 8 + k * 2, 0, 7); c.fill(); }
      c.fillStyle = '#9A5A3A'; c.fillRect(hx + 62, 180, 12, 22);
      hill(c, 320, 16, '#4FA63E', r() * 6, r);
      c.fillStyle = '#E9D7A8'; c.beginPath(); c.moveTo(hx + 40, 272); c.quadraticCurveTo(hx - 80, 330, 200, PH); c.lineTo(280, PH); c.quadraticCurveTo(hx - 40, 330, hx + 52, 272); c.fill();
      for (let k = 0; k < 4; k++) tree(c, 30 + k * 80 + r() * 30, 280 + r() * 20, 1 + r() * .3);
      for (let k = 0; k < 5; k++) { const x = 60 + r() * 260, y = 330 + r() * 50; c.fillStyle = '#fff'; [[0, 0, 12], [-9, 2, 9], [9, 2, 9]].forEach(([a, b, rr]) => { c.beginPath(); c.arc(x + a, y + b, rr, 0, 7); c.fill(); }); c.fillStyle = '#333'; c.beginPath(); c.arc(x + 15, y - 2, 6, 0, 7); c.fill(); c.fillRect(x - 6, y + 9, 3, 8); c.fillRect(x + 4, y + 9, 3, 8); }
    } },
    { n: 'Flowers', g: 'Greetings from the garden', draw(c, r) {
      c.fillStyle = grad(c, 0, 240, ['#BDE8FF', '#FFF3E0']); c.fillRect(0, 0, PW, PH);
      sun(c, 520, 64, 34); cloud(c, 80, 60, .9);
      c.fillStyle = '#fff'; for (let x = 0; x < PW; x += 34) { c.fillRect(x + 6, 170, 22, 90); c.beginPath(); c.moveTo(x + 6, 170); c.lineTo(x + 17, 156); c.lineTo(x + 28, 170); c.fill(); }
      c.fillRect(0, 190, PW, 10); c.fillRect(0, 232, PW, 10);
      c.fillStyle = grad(c, 240, PH, ['#6CC655', '#3E9A3A']); c.fillRect(0, 240, PW, 160);
      const cols = ['#FF5A7A', '#FFB020', '#B36BFF', '#FF7FBF', '#FFFFFF', '#FF6B3D', '#5FA8FF'];
      for (let k = 0; k < 22; k++) {
        const x = 15 + k * 27 + r() * 12, top = 190 + r() * 120, col = cols[Math.floor(r() * cols.length)], s = 1 + r() * .6;
        c.strokeStyle = '#2F7D2A'; c.lineWidth = 4; c.beginPath(); c.moveTo(x, PH); c.quadraticCurveTo(x + 8, (top + PH) / 2, x, top); c.stroke();
        c.fillStyle = '#3E9A3A'; c.beginPath(); c.ellipse(x + 9, (top + PH) / 2 + 20, 12, 5, -.5, 0, 7); c.fill();
        if (k % 3 === 0) { c.fillStyle = col; c.beginPath(); c.moveTo(x - 13 * s, top - 4); c.lineTo(x - 13 * s, top - 26 * s); c.lineTo(x - 5 * s, top - 16 * s); c.lineTo(x, top - 28 * s); c.lineTo(x + 5 * s, top - 16 * s); c.lineTo(x + 13 * s, top - 26 * s); c.lineTo(x + 13 * s, top - 4); c.quadraticCurveTo(x, top + 8, x - 13 * s, top - 4); c.fill(); }
        else { c.fillStyle = col; for (let p = 0; p < 6; p++) { const a = p * Math.PI / 3; c.beginPath(); c.arc(x + Math.cos(a) * 10 * s, top + Math.sin(a) * 10 * s, 8 * s, 0, 7); c.fill(); } c.fillStyle = '#FFD34D'; c.beginPath(); c.arc(x, top, 7 * s, 0, 7); c.fill(); }
      }
      for (let k = 0; k < 2; k++) { const x = 150 + r() * 300, y = 80 + r() * 60; c.fillStyle = k ? '#FF8A3D' : '#5FA8FF'; c.beginPath(); c.ellipse(x - 9, y, 10, 14, -.4, 0, 7); c.ellipse(x + 9, y, 10, 14, .4, 0, 7); c.fill(); c.fillStyle = '#333'; c.fillRect(x - 1.5, y - 10, 3, 20); }
    } },
    { n: 'City at night', g: 'Greetings from the city', draw(c, r) {
      c.fillStyle = grad(c, 0, PH, ['#0B1440', '#2A3D8F', '#5A4FA0']); c.fillRect(0, 0, PW, PH);
      c.fillStyle = '#fff'; for (let k = 0; k < 70; k++) { c.globalAlpha = .4 + r() * .6; c.beginPath(); c.arc(r() * PW, r() * 220, r() * 1.8 + .4, 0, 7); c.fill(); } c.globalAlpha = 1;
      const mx = 470 + r() * 60; sun(c, mx, 70, 32, '#FFF6D0'); c.fillStyle = 'rgba(200,190,150,.35)'; [[-10, -8, 7], [9, 6, 9], [-6, 14, 5]].forEach(([a, b2, rr]) => { c.beginPath(); c.arc(mx + a, 70 + b2, rr, 0, 7); c.fill(); });
      let x = -10;
      while (x < PW) {
        const w = 44 + r() * 50, h = 110 + r() * 170, y = 330 - h, col = ['#1A2350', '#232E66', '#141C44', '#2C3570'][Math.floor(r() * 4)];
        c.fillStyle = col; c.fillRect(x, y, w, h + 10);
        if (r() < .3) { c.fillRect(x + w / 2 - 3, y - 26, 6, 26); c.fillStyle = '#FF5A5A'; c.beginPath(); c.arc(x + w / 2, y - 28, 3, 0, 7); c.fill(); }
        for (let wy = y + 10; wy < 320; wy += 18) for (let wx = x + 7; wx < x + w - 10; wx += 14) if (r() < .45) { c.fillStyle = r() < .8 ? '#FFD966' : '#FFF1B3'; c.fillRect(wx, wy, 7, 10); }
        x += w + 4;
      }
      c.fillStyle = '#10183A'; c.fillRect(0, 330, PW, 70);
      c.fillStyle = 'rgba(255,217,102,.35)'; for (let k = 0; k < 40; k++) c.fillRect(r() * PW, 340 + r() * 55, 10 + r() * 30, 3);
      for (let k = 0; k < 4; k++) { const lx = 60 + k * 150; c.fillStyle = '#333'; c.fillRect(lx - 2, 290, 4, 42); const g = c.createRadialGradient(lx, 288, 2, lx, 288, 30); g.addColorStop(0, 'rgba(255,230,150,.9)'); g.addColorStop(1, 'rgba(255,230,150,0)'); c.fillStyle = g; c.beginPath(); c.arc(lx, 288, 30, 0, 7); c.fill(); }
    } },
    { n: 'Mountains', g: 'Greetings from the hills', draw(c, r) {
      c.fillStyle = grad(c, 0, 250, ['#8FD0FF', '#EAF8FF']); c.fillRect(0, 0, PW, PH);
      cloud(c, 60 + r() * 100, 60, .9); sun(c, 520, 60, 30);
      const peaks = [[90, 110], [230, 70], [380, 100], [520, 80]].map(([x, y]) => [x + r() * 30 - 15, y + r() * 30]);
      peaks.forEach(([x, y], k) => { c.fillStyle = k % 2 ? '#7E8FB8' : '#6A7BA6'; c.beginPath(); c.moveTo(x - 160, 250); c.lineTo(x, y); c.lineTo(x + 160, 250); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - 40, y + 40); c.lineTo(x, y); c.lineTo(x + 40, y + 40); c.lineTo(x + 18, y + 32); c.lineTo(x, y + 44); c.lineTo(x - 16, y + 32); c.fill(); });
      c.fillStyle = '#5DB34A'; c.fillRect(0, 245, PW, 20);
      c.fillStyle = grad(c, 260, 330, ['#3A9AD9', '#7CCBF0']); c.fillRect(0, 262, PW, 70);
      c.globalAlpha = .25; peaks.forEach(([x, y]) => { c.fillStyle = '#6A7BA6'; c.beginPath(); c.moveTo(x - 120, 264); c.lineTo(x, 264 + (250 - y) * .35); c.lineTo(x + 120, 264); c.fill(); }); c.globalAlpha = 1;
      c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2; for (let k = 0; k < 8; k++) { const x = r() * PW, y = 275 + r() * 50; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 30, y); c.stroke(); }
      c.fillStyle = '#4FA63E'; c.fillRect(0, 328, PW, 72);
      for (let k = 0; k < 9; k++) pine(c, 20 + k * 68 + r() * 20, 390 - r() * 30, 1 + r() * .4);
    } },
    { n: 'Snowy village', g: 'Season’s greetings', draw(c, r) {
      c.fillStyle = grad(c, 0, 260, ['#9DB9E0', '#E8F1FA']); c.fillRect(0, 0, PW, PH);
      hill(c, 230, 18, '#F4F8FC', r() * 6, r);
      for (let k = 0; k < 4; k++) house(c, 40 + k * 140 + r() * 30, 300 + r() * 10, 80 + r() * 20, 55 + r() * 20, ['#E8473C', '#FFF2D6', '#3B8FE0', '#F5C431'][k], '#6B3A2A', true, true);
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, 310); c.quadraticCurveTo(300, 290, PW, 315); c.lineTo(PW, PH); c.lineTo(0, PH); c.fill();
      for (let k = 0; k < 5; k++) pine(c, 30 + k * 130 + r() * 40, 380 + r() * 10, 1.1, true);
      const sx = 300 + r() * 80; c.fillStyle = '#fff'; c.strokeStyle = '#D0DCEA'; c.lineWidth = 2; [[0, 352, 22], [0, 320, 15]].forEach(([a, y, rr]) => { c.beginPath(); c.arc(sx + a, y, rr, 0, 7); c.fill(); c.stroke(); });
      c.fillStyle = '#FF8A3D'; c.beginPath(); c.moveTo(sx, 320); c.lineTo(sx + 14, 323); c.lineTo(sx, 326); c.fill(); c.fillStyle = '#222'; c.beginPath(); c.arc(sx - 5, 316, 2, 0, 7); c.arc(sx + 5, 316, 2, 0, 7); c.fill(); c.fillRect(sx - 12, 296, 24, 6); c.fillRect(sx - 8, 280, 16, 18);
      c.fillStyle = '#fff'; for (let k = 0; k < 90; k++) { c.globalAlpha = .6 + r() * .4; c.beginPath(); c.arc(r() * PW, r() * PH, 1.5 + r() * 2.5, 0, 7); c.fill(); } c.globalAlpha = 1;
    } }
  ];
  const MESSAGES = ['Thinking of you', 'Wish you were here', 'Happy birthday!', 'Love from…', 'Get well soon', 'Having a lovely time', 'Missing you', 'Thank you!'];
  const STICKERS = ['❤️', '⭐', '🌸', '🌞', '🐦', '🦋', '🎈', '⛵', '🌈', '🍰', '🐶', '🐱', '🌻', '🎁', '☕'];
  const SPOTS = [[13, 18], [87, 16], [16, 70], [84, 66], [50, 15], [33, 45], [67, 42], [50, 62], [10, 44], [90, 40], [30, 20], [70, 20]];

  function startPostcard(L, api) {
    const lv = lvl(L), finish = once(() => api.done(3));
    const S = { pic: null, greet: '', msg: '', stickers: [] };
    const seed = lv * 7919 + randInt(100000);
    let thumbs = null;
    function render(k) { const cv = document.createElement('canvas'); cv.width = PW; cv.height = PH; const c = cv.getContext('2d'); SCENE_ART[k].draw(c, rng(seed + k * 131)); return cv; }
    function copyTo(cv, src) { cv.width = PW; cv.height = PH; cv.getContext('2d').drawImage(src, 0, 0); return cv; }

    function frontEl(edit) {
      const f = el('div', 'pc-front');
      f.append(copyTo(document.createElement('canvas'), S.pic));
      if (S.greet) f.append(el('div', 'pc-greet', S.greet));
      S.stickers.forEach((st, k) => {
        const b = el('button', 'pc-stk', st.e); b.type = 'button';
        b.style.left = st.x + '%'; b.style.top = st.y + '%'; b.style.setProperty('--r', st.r + 'deg');
        b.setAttribute('aria-label', 'Sticker'); if (!edit) { b.style.animation = 'none'; b.style.cursor = 'default'; b.tabIndex = -1; }
        if (edit) b.onclick = () => { sfx.tap(); b.classList.add('out'); S.stickers.splice(S.stickers.indexOf(st), 1); api.later(() => edit(), 260); api.hint('Sticker taken off. Tap a sticker below to add another.'); };
        void k; f.append(b);
      });
      return f;
    }
    const step = (i, hint) => { api.stage.innerHTML = ''; api.rounds(4, i); api.hint(hint); const w = el('div', 'g6-wrap'); api.stage.append(w); return w; };

    function pickPicture() {
      const w = step(0, 'Pick a picture for the front of your postcard.');
      const grid = el('div', 'pc-thumbs');
      if (!thumbs) thumbs = SCENE_ART.map((_, k) => render(k));
      SCENE_ART.forEach((sc, k) => {
        const b = el('button', 'tile c-card pc-thumb'); b.type = 'button';
        const cv = copyTo(document.createElement('canvas'), thumbs[k]);
        b.append(cv, el('b', '', sc.n));
        b.onclick = () => { sfx.good(); S.pic = thumbs[k]; S.greet = sc.g; b.style.animation = 'g6-bounce .4s'; api.later(pickMessage, 300); };
        grid.append(b);
      });
      const ph = el('label', 'tile c-sun pc-thumb pc-photo', '<span class="ph">📷</span><b>My own photo</b>');
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.hidden = true;
      ph.append(inp);
      inp.onchange = () => {
        const f = inp.files && inp.files[0]; if (!f) return;
        const url = URL.createObjectURL(f), img = new Image();
        img.onload = () => {
          const cv = document.createElement('canvas'); cv.width = PW; cv.height = PH; const c = cv.getContext('2d');
          const k = Math.max(PW / img.naturalWidth, PH / img.naturalHeight), w2 = img.naturalWidth * k, h2 = img.naturalHeight * k;
          c.fillStyle = '#eee'; c.fillRect(0, 0, PW, PH); c.drawImage(img, (PW - w2) / 2, (PH - h2) / 2, w2, h2);
          URL.revokeObjectURL(url);
          if (!api.stage.isConnected) return;
          S.pic = cv; S.greet = ''; sfx.good(); pickMessage();
        };
        img.onerror = () => { URL.revokeObjectURL(url); sfx.soft(); api.hint('Sorry, that photo would not open. Try another, or pick a picture.'); };
        img.src = url;
      };
      grid.append(ph);
      w.append(grid);
    }

    function pickMessage() {
      const w = step(1, 'Now pick a message, or write your own.');
      const grid = el('div', 'pc-msgs');
      const own = el('div', 'pc-own'); own.hidden = true;
      const inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = 60; inp.placeholder = 'Type your message'; inp.setAttribute('aria-label', 'Your message');
      const ok = mkBtn('OK ✓', 'c-leaf', () => { if (inp.value.trim()) { S.msg = inp.value.trim(); sfx.good(); pickStickers(); } else { inp.focus(); api.hint('Type a few words, then tap OK.'); } });
      inp.onkeydown = e => { if (e.key === 'Enter') ok.click(); };
      own.append(inp, ok);
      const all = [];
      function openOwn(pre) { own.hidden = false; all.forEach(x => x.classList.remove('on')); inp.value = pre; inp.focus(); try { inp.setSelectionRange(pre.length, pre.length); } catch (e) {} api.hint(pre ? 'Add your name, then tap OK.' : 'Type your message, then tap OK.'); }
      MESSAGES.forEach(m => {
        const b = mkBtn(m, 'c-card pc-msg', () => {
          sfx.tap();
          if (m === 'Love from…') { openOwn('Love from '); b.classList.add('on'); return; }
          all.forEach(x => x.classList.toggle('on', x === b)); S.msg = m; api.later(pickStickers, 300);
        });
        if (S.msg === m) b.classList.add('on');
        all.push(b); grid.append(b);
      });
      const write = mkBtn('✏️ Write my own', 'c-sun pc-msg', () => { sfx.tap(); openOwn(''); });
      grid.append(write);
      w.append(grid, own, el('div', 'g6-row', '')); w.lastChild.append(mkBtn('◀ Back', 'c-card', () => { sfx.tap(); pickPicture(); }));
    }

    function pickStickers() {
      const w = step(2, 'Add some stickers! Tap one to stick it on. Tap it on the picture to take it off.');
      const holder = el('div', 'pc-step');
      const pal = el('div', 'pc-pal');
      function redraw() { holder.innerHTML = ''; holder.append(frontEl(redraw)); }
      redraw();
      STICKERS.forEach(e => {
        const b = mkBtn(e, 'tile c-card', () => {
          if (S.stickers.length >= SPOTS.length) { sfx.soft(); api.hint('That is lots of stickers! Tap one on the picture to take it off.'); return; }
          const used = S.stickers.map(s => s.spot), spot = SPOTS.findIndex((_, k) => !used.includes(k));
          const [x, y] = SPOTS[spot];
          S.stickers.push({ e, spot, x: x + randInt(7) - 3, y: y + randInt(7) - 3, r: randInt(31) - 15 });
          tone(660 + S.stickers.length * 40, .12, 'triangle', .1); wob(b); redraw();
          api.hint(pick(['Lovely!', 'How pretty!', 'Very nice!', 'Perfect!']) + ' Add another, or tap Next.');
        });
        b.setAttribute('aria-label', 'Sticker ' + e); pal.append(b);
      });
      const row = el('div', 'g6-row');
      row.append(mkBtn('◀ Back', 'c-card', () => { sfx.tap(); pickMessage(); }), mkBtn('See my postcard ▶', 'c-leaf g6-big', () => { sfx.good(); showCard(); }));
      w.append(holder, pal, row);
    }

    function showCard() {
      const w = step(3, 'Your postcard is ready! Show this to your family, or take a photo of the screen.');
      const cards = el('div', 'pc-cards');
      const back = el('div', 'pc-back');
      const d = new Date(), date = d.getDate() + ' ' + d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase() + ' ' + d.getFullYear();
      const pid = nid('pm');
      back.innerHTML = `<div class="line"></div>
<div class="pc-stamp"><div class="art"><span>${pick(['🌹', '🌻', '🐦', '⛵', '🌷'])}</span>1st</div></div>
<svg class="pc-pm" viewBox="0 0 160 100" aria-hidden="true"><defs><path id="${pid}" d="M30 50 a30 30 0 1 1 60 0"/></defs>
<g fill="none" stroke="#2D3A6B" stroke-width="2.4"><circle cx="60" cy="50" r="36"/><circle cx="60" cy="50" r="27" stroke-width="1.3"/>
<path d="M100 34 q8 -6 16 0 t16 0 t16 0 M100 46 q8 -6 16 0 t16 0 t16 0 M100 58 q8 -6 16 0 t16 0 t16 0 M100 70 q8 -6 16 0 t16 0 t16 0"/></g>
<text font-family="Fredoka,system-ui,sans-serif" font-weight="700" font-size="9.5" fill="#2D3A6B" letter-spacing="1.5"><textPath href="#${pid}" startOffset="50%" text-anchor="middle">RECALL POST</textPath></text>
<text x="60" y="56" text-anchor="middle" font-family="Fredoka,system-ui,sans-serif" font-weight="700" font-size="13" fill="#2D3A6B">${date}</text></svg>
<div class="pc-addr"><i></i><i></i><i></i><b>To my family</b></div>`;
      back.append(el('div', 'pc-text', ''));
      back.querySelector('.pc-text').textContent = S.msg || 'Thinking of you';
      cards.append(frontEl(null), back);
      const say = el('p', 'pc-say', '📸 Show this to your family, or take a photo of the screen.');
      const row = el('div', 'g6-row');
      row.append(mkBtn('◀ Change it', 'c-card', () => { sfx.tap(); pickStickers(); }), mkBtn('✓ Finished', 'c-mint g6-big', () => { sfx.good(); finish(); }));
      w.append(cards, say, row);
      [523, 659, 784].forEach((f, i) => tone(f, .22, 'triangle', .1, i * .1));
    }
    pickPicture();
  }

  [
    { id: 'animalsound', order: 32, name: 'Name That Sound', icon: '🐮', desc: 'Listen to the animal and pick who it is', start: startAnimal },
    { id: 'dressup', order: 33, name: 'Dress Up', icon: '⛄', desc: 'Dress a snowman, teddy or scarecrow', start: startDress },
    { id: 'postcard', order: 34, name: 'Postcard Maker', icon: '💌', desc: 'Make a pretty postcard to show your family', start: startPostcard }
  ].forEach(g => register(Object.assign({ cat: 'gentle', gentle: true }, g)));
})();
