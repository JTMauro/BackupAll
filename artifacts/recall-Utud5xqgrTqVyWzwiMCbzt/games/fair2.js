/* Recall: Seaside Fairground, part 2
   Tin Can Alley, Crazy Golf, Darts and the Prize Stall. */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, cheer, store } = R;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const COLS = { coral: '#FF6B4A', sky: '#45AEFF', sun: '#FFC234', leaf: '#3CC46B', berry: '#F25A95', orange: '#FF9A3C', grape: '#A98BFF', mint: '#5FD8B9' };
  const DARK = { coral: '#C4432A', sky: '#1D70C0', sun: '#C28A00', leaf: '#1F8C46', berry: '#AE2A5F' };

  R.css(`
.f2-wrap{display:flex; flex-direction:column; align-items:center; gap:10px; width:100%; max-width:460px; margin:0 auto}
.f2-cv{display:block; width:100%; height:auto; border-radius:22px; touch-action:manipulation; cursor:pointer;
  box-shadow:0 0 0 5px #5A361C, 0 0 0 9px #E9C67E, 0 10px 0 9px #A47A35, 0 18px 30px 6px rgba(0,0,0,.35); -webkit-tap-highlight-color:transparent}
.f2-row{display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:8px 12px; width:100%; margin-top:12px}
.f2-tix{position:relative; display:inline-flex; align-items:center; gap:.35em; font:600 1.25rem/1 var(--display); color:var(--brass-ink);
  background:linear-gradient(#FFE9B0, #F2C76A); padding:.45em .9em; border-radius:12px; box-shadow:0 5px 0 #B8862F, 0 9px 14px rgba(0,0,0,.25);
  border:2px dashed rgba(122,74,40,.45)}
.f2-tix b{font-size:1.45rem; font-variant-numeric:tabular-nums}
.f2-pop{position:absolute; left:50%; bottom:100%; white-space:nowrap; font:700 1.35rem var(--display); color:#fff; background:var(--berry);
  padding:.3em .7em; border-radius:999px; box-shadow:0 5px 0 var(--berry-d); pointer-events:none; animation:f2rise 2.4s ease-out forwards}
@keyframes f2rise{0%{transform:translate(-50%,10px) scale(.6); opacity:0} 15%{transform:translate(-50%,-6px) scale(1.08); opacity:1} 75%{opacity:1} 100%{transform:translate(-50%,-40px) scale(1); opacity:0}}
.f2-chip{font:600 1.2rem/1.1 var(--display); background:rgba(0,0,0,.22); padding:.45em .8em; border-radius:12px; color:var(--on-table)}
.f2-balls{display:flex; gap:6px; align-items:center; font:600 1.2rem var(--display)}
.f2-balls i{width:30px; height:30px; border-radius:50%; background:radial-gradient(circle at 35% 30%, #fff 0 12%, #FF8A6E 13%, #E23D24 70%, #A92612); box-shadow:0 3px 0 rgba(0,0,0,.3); transition:opacity .3s, transform .3s}
.f2-balls i.used{opacity:.22; transform:scale(.75)}
/* darts score board */
.f2-board{display:flex; align-items:stretch; gap:10px; width:100%; justify-content:center}
.f2-big{min-width:120px; text-align:center; background:#18242C; color:#FFF4D8; border-radius:16px; padding:6px 14px 8px;
  box-shadow:inset 0 0 0 3px #E9C67E, 0 6px 0 #5A361C}
.f2-big small{display:block; font:600 1.05rem/1.2 var(--display); color:#E9C67E}
.f2-big b{display:block; color:#FFD65A; font:700 2.6rem/1 var(--display); font-variant-numeric:tabular-nums}
.f2-big b.pop{animation:pop .5s}
.f2-throws{display:flex; flex-direction:column; justify-content:center; gap:4px}
.f2-slots{display:flex; gap:6px}
.f2-slots span{min-width:52px; height:52px; display:grid; place-items:center; border-radius:12px; background:rgba(0,0,0,.22);
  font:700 1.35rem var(--display); color:#fff; border:2px dashed rgba(255,255,255,.35)}
.f2-slots span.on{background:#FFF4D8; color:#18242C; border:0; box-shadow:0 4px 0 #C9A55E; animation:bounceIn .4s}
/* prize stall */
.f2-stall{width:100%; max-width:640px; margin:0 auto; display:flex; flex-direction:column; gap:12px}
.f2-top{display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap}
.f2-tabs{display:flex; gap:8px}
.f2-tabs .btn{min-height:56px; padding:.5em .8em; font-size:1.1rem}
.f2-tabs .btn.sel{outline:4px solid #fff; outline-offset:2px}
.f2-booth{border-radius:20px; overflow:hidden; background:#2E4A6B; box-shadow:0 0 0 5px #5A361C, 0 10px 0 5px #3A2410, 0 16px 26px rgba(0,0,0,.35)}
.f2-awn{height:46px; background:repeating-linear-gradient(90deg, #E8443A 0 40px, #FFF4E0 40px 80px); position:relative}
.f2-awn::after{content:''; position:absolute; left:0; right:0; bottom:-14px; height:14px;
  background:radial-gradient(circle at 20px 0, #E8443A 0 19px, transparent 20px) 0 0/80px 14px repeat-x,
             radial-gradient(circle at 60px 0, #FFF4E0 0 19px, transparent 20px) 0 0/80px 14px repeat-x}
.f2-lights{display:flex; justify-content:space-around; padding:18px 8px 4px}
.f2-lights i{width:14px; height:14px; border-radius:50%; background:#FFE07A; box-shadow:0 0 10px 3px rgba(255,214,90,.75); animation:f2tw 2.4s ease-in-out infinite}
.f2-lights i:nth-child(2n){animation-delay:1.2s}
@keyframes f2tw{0%,100%{opacity:1} 50%{opacity:.45}}
.f2-grid{display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; padding:6px 10px 14px}
@media (min-width:640px){.f2-grid{grid-template-columns:repeat(6, 1fr)}}
.f2-prize{position:relative; height:90px; min-width:0; border-radius:16px; cursor:pointer; padding:4px 2px 30px; display:grid; place-items:center}
.f2-prize.sel{outline:4px solid #fff; outline-offset:2px; animation:pop .4s}
.f2-prize.cant{filter:saturate(.75)}
.f2-tag{position:absolute; left:50%; bottom:6px; transform:translateX(-50%) rotate(-3deg); font:700 1.1rem/1 var(--display); background:#FFF4D8; color:#3A2410;
  padding:.2em .45em; border-radius:6px; box-shadow:0 2px 0 #C9A55E; white-space:nowrap}
.f2-art{display:grid; place-items:center; width:58px; height:58px; font-size:42px; line-height:1; position:relative}
.f2-detail{display:flex; align-items:center; gap:12px; background:var(--card); color:var(--ink); border-radius:18px; padding:10px 14px; box-shadow:0 6px 0 var(--card-edge), 0 12px 18px rgba(0,0,0,.25); min-height:96px}
.f2-detail .f2-art{flex:none; width:72px; height:72px}
.f2-detail h3{font-size:1.4rem}
.f2-detail p{margin:2px 0 0; font-size:1.05rem; color:var(--ink-soft)}
.f2-detail .grow{flex:1; min-width:0}
.f2-buy{display:flex; flex-wrap:wrap; gap:10px; justify-content:center}
.f2-shelf{border-radius:18px; padding:14px 12px 0; display:grid; grid-template-columns:repeat(auto-fill, minmax(80px, 1fr)); grid-auto-rows:110px; gap:0 8px;
  background:repeating-linear-gradient(to bottom, transparent 0 90px, #B9773E 90px 102px, #6B3A1B 102px 110px), linear-gradient(#F7E9CF, #EBD3A8);
  box-shadow:inset 0 0 0 6px #8A5228, 0 8px 0 #5A361C, 0 14px 24px rgba(0,0,0,.3); min-height:236px}
.f2-item{position:relative; display:flex; align-items:flex-end; justify-content:center; padding-bottom:20px; border:0; background:none; cursor:pointer}
.f2-item .f2-art{transform:scale(1.2); transform-origin:50% 100%; filter:drop-shadow(0 5px 3px rgba(0,0,0,.25))}
.f2-item em{position:absolute; top:4px; right:4px; font:700 1rem/1 var(--display); font-style:normal; background:var(--berry); color:#fff; border-radius:999px; padding:.25em .45em}
.f2-empty{grid-column:1/-1; align-self:center; text-align:center; color:#6B3A1B; font:600 1.25rem var(--display); padding:0 10px}
.f2-new{animation:bounceIn .7s}
/* prize art made of shapes */
.f2-floss{position:relative; width:50px; height:64px}
.f2-floss::before{content:''; position:absolute; left:3px; top:0; width:44px; height:40px; border-radius:50%;
  background:radial-gradient(circle at 30% 35%, #FFE3F0 0 18%, transparent 19%), radial-gradient(circle at 25% 55%, #FF9CC8 0 30%, transparent 31%), radial-gradient(circle at 70% 40%, #FFB3D6 0 34%, transparent 35%), radial-gradient(circle at 50% 70%, #FF8DBE 0 36%, transparent 37%), #FFA8CF;
  box-shadow:0 0 0 3px #FFC9E1}
.f2-floss::after{content:''; position:absolute; left:23px; top:36px; width:5px; height:28px; border-radius:3px; background:#F2E6C9; box-shadow:inset -2px 0 0 #CDB98A}
.f2-rock{width:16px; height:62px; border-radius:8px; transform:rotate(22deg); background:repeating-linear-gradient(140deg, #FF7FB0 0 6px, #FFF6FA 6px 10px); box-shadow:inset -4px 0 0 rgba(0,0,0,.12), 0 0 0 2px #E2578F}
.f2-pin{position:relative; width:56px; height:64px}
.f2-pin::after{content:''; position:absolute; left:26px; top:26px; width:5px; height:38px; border-radius:3px; background:#7A4A28}
.f2-pin i{position:absolute; left:6px; top:2px; width:46px; height:46px; border-radius:50%; z-index:1;
  background:radial-gradient(circle, #fff 0 10%, transparent 11%), conic-gradient(#FF6B4A 0 25%, #FFC234 0 50%, #45AEFF 0 75%, #3CC46B 0);
  clip-path:polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%); animation:f2spin 5s linear infinite}
@keyframes f2spin{to{transform:rotate(360deg)}}
.f2-bag{position:relative; width:52px; height:64px}
.f2-bag::before{content:''; position:absolute; left:2px; top:10px; width:48px; height:52px; border-radius:40% 40% 48% 48%;
  background:linear-gradient(to bottom, rgba(255,255,255,.35) 0 30%, rgba(80,170,255,.55) 30%); box-shadow:inset 0 0 0 2px rgba(255,255,255,.8), inset 6px 0 0 rgba(255,255,255,.35)}
.f2-bag::after{content:''; position:absolute; left:20px; top:0; width:12px; height:12px; background:#F25A95; border-radius:3px 3px 50% 50%}
.f2-bag span{position:absolute; left:12px; top:26px; font-size:28px; animation:f2swim 3s ease-in-out infinite}
@keyframes f2swim{0%,100%{transform:translateX(-3px)} 50%{transform:translateX(4px) scaleX(-1)}}
.f2-plinth::after{content:''; position:absolute; left:8px; right:8px; bottom:-4px; height:10px; border-radius:4px; background:linear-gradient(#FFE9A8, #C9A050)}
.f2-ball{width:52px; height:52px; border-radius:50%; background:conic-gradient(#FF6B4A 0 16.6%, #fff 0 33.3%, #45AEFF 0 50%, #fff 0 66.6%, #FFC234 0 83.3%, #fff 0); box-shadow:inset -6px -6px 0 rgba(0,0,0,.12), 0 0 0 2px rgba(0,0,0,.08)}
`);

  /* ---------- shared bits ---------- */
  function mkCanvas(parent, W, H) {
    const cv = el('canvas', 'f2-cv');
    const d = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * d); cv.height = Math.round(H * d);
    cv.style.aspectRatio = W + ' / ' + H;
    const c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0);
    parent.append(cv);
    return { cv, c };
  }
  function tapPos(cv, e, W, H) {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }
  function runLoop(cv, step) {
    let last = performance.now();
    function frame(now) {
      if (!cv.isConnected) return;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
      step(dt, now / 1000);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function tixBar() {
    const b = el('div', 'f2-tix');
    const show = () => { b.innerHTML = `<span aria-hidden="true">🎟</span> <b>${R.tickets()}</b> tickets`; };
    show(); b.show = show;
    b.award = n => {
      const total = R.tickets(n); show();
      const p = el('div', 'f2-pop', `🎟 +${n} ticket${n === 1 ? '' : 's'}`); b.append(p);
      p.addEventListener('animationend', () => p.remove());
      wob(b); [784, 988, 1175].forEach((f, i) => tone(f, .14, 'triangle', .1, i * .08));
      return total;
    };
    return b;
  }
  const tixText = (n, total) => `🎟 +${n} ticket${n === 1 ? '' : 's'}. You have ${total} tickets.`;
  function noise(dur, f0, f1, vol) {
    if (R.isMuted()) return;
    const A = R.audio(); if (!A) return;
    try {
      const { ctx, bus } = A, n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime;
      s.buffer = buf; f.type = 'bandpass'; f.Q.value = 1.2;
      f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.value = vol; s.connect(f).connect(g).connect(bus); s.start(t);
    } catch (e) {}
  }
  const clang = (v = 1) => { tone(700 + Math.random() * 500, .12, 'triangle', .12 * v); tone(1500 + Math.random() * 400, .08, 'square', .03 * v, .01); };

  /* fairground decorations drawn on canvas */
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function awning(c, W, h, cols) {
    const n = 9, sw = W / n;
    for (let i = 0; i < n; i++) {
      c.fillStyle = cols[i % 2];
      c.fillRect(i * sw, 0, sw + .5, h);
      c.beginPath(); c.arc(i * sw + sw / 2, h, sw / 2, 0, Math.PI); c.fill();
    }
    const g = c.createLinearGradient(0, 0, 0, h + sw / 2);
    g.addColorStop(0, 'rgba(0,0,0,.25)'); g.addColorStop(.35, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(0,0,0,.12)');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(W, h);
    for (let i = n - 1; i >= 0; i--) c.arc(i * sw + sw / 2, h, sw / 2, 0, Math.PI);
    c.closePath(); c.fill();
  }
  function bulbs(c, W, y, t, step = 30) {
    let i = 0;
    for (let x = step / 2; x < W; x += step, i++) {
      const on = .55 + .45 * Math.sin(t * 1.6 - i * .9);
      const g = c.createRadialGradient(x, y, 1, x, y, 13);
      g.addColorStop(0, `rgba(255,236,150,${.9 * on})`); g.addColorStop(1, 'rgba(255,200,80,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, 13, 0, TAU); c.fill();
      c.fillStyle = `rgb(255,${200 + 40 * on | 0},${110 + 60 * on | 0})`; c.beginPath(); c.arc(x, y, 4.5, 0, TAU); c.fill();
    }
  }
  function bunting(c, W, y, t, sag = 14) {
    const cols = ['#FF6B4A', '#FFC234', '#45AEFF', '#3CC46B', '#F25A95', '#FFF4E0'];
    c.strokeStyle = 'rgba(60,40,20,.7)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(0, y); c.quadraticCurveTo(W / 2, y + sag * 2, W, y); c.stroke();
    const n = Math.floor(W / 26);
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = u * W, yy = y + sag * 2 * 2 * u * (1 - u) * 1;
      const sw = Math.sin(t * 1.1 + i * .7) * .12;
      c.save(); c.translate(x, yy); c.rotate(sw);
      c.fillStyle = cols[i % cols.length];
      c.beginPath(); c.moveTo(-9, 0); c.lineTo(9, 0); c.lineTo(0, 17); c.closePath(); c.fill();
      c.fillStyle = 'rgba(0,0,0,.12)'; c.beginPath(); c.moveTo(0, 0); c.lineTo(9, 0); c.lineTo(0, 17); c.closePath(); c.fill();
      c.restore();
    }
  }
  function sym(c, s, x, y, size, col) {
    c.fillStyle = col; c.font = `700 ${size}px Fredoka, system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, x, y + size * .05);
  }

  /* =========================================================
     1. TIN CAN ALLEY
     ========================================================= */
  register({ id: 'tincans', cat: 'fair', order: 5, name: 'Tin Can Alley', icon: '🥫', desc: 'Throw balls to knock the tins down', gentle: false, start: startTins });

  function startTins(L, api) {
    const W = 360, H = 400, SY = 268, SX0 = 52, SX1 = 308, FLOOR = H - 34, G = 760;
    const rounds = L <= 2 ? 2 : 3;
    const assist = L <= 1 ? .6 : L <= 3 ? .45 : .3;
    const pad = Math.max(5, 15 - L * 1.2);
    let round = 0, balls = 3, totalDown = 0, totalTins = 0, busy = false, roundOver = false, T = 0;
    let tins = [], ball = null, sparks = [], msg = null;

    const wrap = el('div', 'f2-wrap');
    const { cv, c } = mkCanvas(wrap, W, H);
    const row = el('div', 'f2-row'), ballsEl = el('div', 'f2-balls'), tix = tixBar();
    row.append(ballsEl, tix); wrap.append(row); api.stage.append(wrap);
    api.rounds(rounds, 0);

    function shapeFor() {
      if (L <= 1) return { rows: [3, 2, 1] };
      if (L === 2) return { rows: [4, 3, 2, 1] };
      const n = Math.min(5, 3 + Math.floor(L / 3));
      const kind = pick(L < 5 ? ['pyr', 'pyr', 'wall'] : ['pyr', 'wall', 'twin', 'tower']);
      if (kind === 'wall') return { rows: [n - 1, n - 1, n - 2] };
      if (kind === 'twin') return { twin: true, rows: [3, 2, 1] };
      if (kind === 'tower') return { rows: [3, 3, 3, 2] };
      const r = []; for (let k = n; k >= 1; k--) r.push(k); return { rows: r };
    }
    function setup() {
      const sh = shapeFor(), widest = sh.twin ? 6.6 : Math.max(...sh.rows), gap = 3;
      const shrink = Math.max(.78, 1 - (L - 1) * .025);
      const tw = Math.min(42, (226 - gap * (widest - 1)) / widest, 150 / (sh.rows.length * 1.22)) * shrink, th = tw * 1.22;
      tins = [];
      const cols = Object.keys(DARK);
      const centres = sh.twin ? [W / 2 - 62 * shrink, W / 2 + 62 * shrink] : [W / 2];
      let ci = randInt(5);
      centres.forEach(cx => sh.rows.forEach((k, r) => {
        for (let i = 0; i < k; i++) {
          const col = cols[ci++ % 5];
          tins.push({ x: cx + (i - (k - 1) / 2) * (tw + gap), y: SY - th / 2 - r * th, w: tw, h: th, row: r, vx: 0, vy: 0, a: 0, va: 0,
            state: 'stand', col, s: R.CUBES.find(q => q.c === col).s, drop: 0 });
        }
      }));
      totalTins += tins.length;
      balls = 3; roundOver = false; busy = false; ball = null;
      drawBalls();
      api.hint(round === 0 ? 'Tap a tin to throw a ball at it. Knock down as many as you can!' : `Round ${round + 1}. Fresh tins! Tap a tin to throw.`);
    }
    function drawBalls() { ballsEl.innerHTML = [0, 1, 2].map(i => `<i class="${i >= balls ? 'used' : ''}"></i>`).join(''); }

    const half = t => Math.abs(Math.cos(t.a)) * t.h / 2 + Math.abs(Math.sin(t.a)) * t.w / 2;
    const halfW = t => Math.abs(Math.cos(t.a)) * t.w / 2 + Math.abs(Math.sin(t.a)) * t.h / 2;
    function knock(t, fx, fy) {
      if (t.state === 'stand') { t.state = 'fly'; clang(); }
      t.vx = fx + (Math.random() - .5) * 60; t.vy = fy; t.va = (Math.random() - .5) * 9;
      for (let i = 0; i < 4; i++) sparks.push({ x: t.x, y: t.y, vx: (Math.random() - .5) * 160, vy: -Math.random() * 160, life: .6, col: COLS[t.col] });
    }
    function rectDist(t, x, y) {
      const dx = Math.max(Math.abs(x - t.x) - halfW(t), 0), dy = Math.max(Math.abs(y - t.y) - half(t), 0);
      return Math.hypot(dx, dy);
    }

    cv.addEventListener('pointerdown', e => {
      if (busy || roundOver || balls <= 0) return;
      const p = tapPos(cv, e, W, H);
      let best = null, bd = 90;
      tins.forEach(t => { if (t.state === 'stand') { const d = Math.hypot(t.x - p.x, t.y - p.y); if (d < bd) { bd = d; best = t; } } });
      const tx = best ? lerp(p.x, best.x, assist) : p.x, ty = best ? lerp(p.y, best.y, assist) : p.y;
      balls--; drawBalls(); busy = true;
      ball = { phase: 'air', t: 0, x0: W / 2, y0: H - 18, x1: tx, y1: Math.min(ty, SY + 30), x: W / 2, y: H - 18, r: 17 };
      noise(.35, 600, 2400, .25); sfx.tap();
    });

    function impact() {
      const x = ball.x1, y = ball.y1; let hit = 0;
      tins.forEach(t => {
        if (t.state === 'gone') return;
        if (rectDist(t, x, y) < 9 + pad) {
          const dx = t.x - x;
          knock(t, clamp(dx * 5, -170, 170), -230 - Math.random() * 120); hit++;
        }
      });
      ball.phase = 'fall'; ball.vx = hit ? (Math.random() - .5) * 80 : 0; ball.vy = hit ? -70 : 20; ball.life = 1.8;
      if (!hit) { tone(140, .15, 'sine', .14); }
      api.later(afterThrow, 1700);
      api.later(() => { if (!roundOver && balls > 0) busy = false; }, 900);
    }
    function afterThrow() {
      if (roundOver) return;
      const down = tins.filter(t => t.state !== 'stand').length;
      if (down === tins.length || balls <= 0) endRound();
      else {
        const left = tins.length - down;
        api.hint(`${down ? cheer() + ' ' : ''}${left} tin${left === 1 ? '' : 's'} still standing. ${balls} ball${balls === 1 ? '' : 's'} left.`);
      }
    }
    function endRound() {
      roundOver = true; busy = true;
      const down = tins.filter(t => t.state !== 'stand').length, all = down === tins.length;
      totalDown += down;
      const n = 1 + Math.floor(down / 2) + (all ? 3 : 0);
      const total = tix.award(n);
      if (all) { sfx.win(); msg = { text: 'All down!', t: 2.4 }; } else sfx.good();
      api.hint(`${all ? 'All down! Smashing! ' : `You knocked down ${down} tin${down === 1 ? '' : 's'}. `}${tixText(n, total)}`);
      round++; api.rounds(rounds, round);
      if (round < rounds) api.later(setup, 2800);
      else api.later(() => { const f = totalDown / totalTins; api.done(f >= .6 ? 3 : f >= .3 ? 2 : 1); }, 2600);
    }

    function step(dt) {
      T += dt;
      if (ball) {
        if (ball.phase === 'air') {
          ball.t += dt / .55;
          const u = Math.min(1, ball.t), e = 1 - (1 - u) * (1 - u);
          ball.x = lerp(ball.x0, ball.x1, e); ball.y = lerp(ball.y0, ball.y1, e) - Math.sin(u * Math.PI) * 70; ball.r = lerp(17, 10, u);
          if (u >= 1) impact();
        } else {
          ball.vy += G * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.life -= dt;
          tins.forEach(t => { if (t.state === 'stand' && rectDist(t, ball.x, ball.y) < 8 && ball.vy > 0) { knock(t, ball.vx * .5 + (t.x - ball.x) * 3, -120); ball.vy *= .4; } });
          if (ball.y > FLOOR) { ball.y = FLOOR; ball.vy *= -.35; }
          if (ball.life <= 0) ball = null;
        }
      }
      // support
      tins.slice().sort((a, b) => a.row - b.row).forEach(t => {
        if (t.state !== 'stand' || t.row === 0) return;
        const ok = tins.some(o => o.state === 'stand' && o.row === t.row - 1 && Math.abs(o.x - t.x) < (o.w + t.w) / 2 * .92);
        if (!ok) { t.state = 'fly'; t.vx = (Math.random() - .5) * 50; t.vy = 0; t.va = (Math.random() - .5) * 3; clang(.6); }
      });
      const sub = 2, h = dt / sub;
      for (let s = 0; s < sub; s++) tins.forEach(t => {
        if (t.state !== 'fly') return;
        const prevBottom = t.y + half(t);
        t.vy += G * h; t.x += t.vx * h; t.y += t.vy * h; t.a += t.va * h;
        const eh = half(t);
        if (t.x > SX0 && t.x < SX1 && prevBottom <= SY + 3 && t.y + eh > SY && t.vy > 0) {
          t.y = SY - eh; t.vy *= -.3; t.vx *= .75; t.va *= .6; if (Math.abs(t.vy) < 50) t.vy = 0;
          if (Math.abs(t.vy) > 60) clang(.4);
        }
        if (t.y + eh > FLOOR) { t.y = FLOOR - eh; t.vy *= -.3; t.vx *= .7; t.va *= .6; if (Math.abs(t.vy) < 50) t.vy = 0; }
        if (t.y + eh >= SY - 1 && t.y + eh <= SY + 1 && t.vy === 0) { t.vx *= Math.pow(.05, h); t.va *= Math.pow(.02, h); }
        if (t.y + eh >= FLOOR - 1 && t.vy === 0) { t.vx *= Math.pow(.05, h); t.va *= Math.pow(.02, h); }
        if (t.x < 24) { t.x = 24; t.vx = Math.abs(t.vx) * .5; }
        if (t.x > W - 24) { t.x = W - 24; t.vx = -Math.abs(t.vx) * .5; }
        const sp = Math.hypot(t.vx, t.vy);
        if (sp > 110) tins.forEach(o => {
          if (o.state === 'stand' && Math.abs(o.x - t.x) < (o.w + t.w) / 2 * .8 && Math.abs(o.y - t.y) < (o.h + t.h) / 2 * .8) {
            knock(o, t.vx * .6 + (o.x - t.x) * 2, Math.min(-80, t.vy * .3 - 80)); t.vx *= .7; t.vy *= .7;
          }
        });
      });
      sparks.forEach(p => { p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
      sparks = sparks.filter(p => p.life > 0);
      if (msg) { msg.t -= dt; if (msg.t <= 0) msg = null; }
      draw();
    }

    function drawTin(t) {
      c.save(); c.translate(t.x, t.y); c.rotate(t.a);
      const w = t.w, h = t.h;
      c.fillStyle = 'rgba(0,0,0,.25)'; rr(c, -w / 2 + 3, -h / 2 + 4, w, h, 5); c.fill();
      const g = c.createLinearGradient(-w / 2, 0, w / 2, 0);
      g.addColorStop(0, '#8C959C'); g.addColorStop(.35, '#F4F7F8'); g.addColorStop(.6, '#C3CACF'); g.addColorStop(1, '#7B848B');
      c.fillStyle = g; rr(c, -w / 2, -h / 2, w, h, 5); c.fill();
      const lg = c.createLinearGradient(-w / 2, 0, w / 2, 0);
      lg.addColorStop(0, DARK[t.col]); lg.addColorStop(.35, COLS[t.col]); lg.addColorStop(1, DARK[t.col]);
      c.fillStyle = lg; c.fillRect(-w / 2, -h * .3, w, h * .6);
      c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-w / 2 + w * .18, -h * .3, w * .1, h * .6);
      sym(c, t.s, 0, 0, w * .5, '#fff');
      c.strokeStyle = 'rgba(60,70,78,.6)'; c.lineWidth = 1.5;
      [-h / 2 + 3, h / 2 - 3].forEach(y => { c.beginPath(); c.moveTo(-w / 2 + 1, y); c.lineTo(w / 2 - 1, y); c.stroke(); });
      c.restore();
    }
    function draw() {
      // back wall: velvet with stripes
      const bg = c.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#24395A'); bg.addColorStop(1, '#16243B');
      c.fillStyle = bg; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,255,255,.04)';
      for (let x = 0; x < W; x += 36) c.fillRect(x, 0, 18, H);
      for (let i = 0; i < 14; i++) {
        const x = (i * 97) % W, y = 100 + (i * 53) % 150, a = .3 + .3 * Math.sin(T * 1.3 + i);
        c.fillStyle = `rgba(255,226,140,${a})`; sym(c, '✦', x, y, 12, `rgba(255,226,140,${a})`);
      }
      // poles
      [[0, 22], [W - 22, 22]].forEach(([x, w]) => {
        c.save(); c.beginPath(); c.rect(x, 40, w, H); c.clip();
        c.fillStyle = '#FFF4E0'; c.fillRect(x, 40, w, H);
        c.fillStyle = '#E8443A';
        for (let y = 20; y < H + 40; y += 28) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y - 16); c.lineTo(x + w, y - 4); c.lineTo(x, y + 12); c.fill(); }
        c.restore();
      });
      awning(c, W, 46, ['#E8443A', '#FFF4E0']);
      bulbs(c, W, 74, T, 32);
      c.save(); c.translate(22, 0); bunting(c, W - 44, 92, T, 10); c.restore();
      // shelf
      c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(SX0 + 6, SY + 14, SX1 - SX0, 10);
      c.fillStyle = '#5A361C'; c.fillRect(SX0 + 22, SY + 14, 10, FLOOR - SY); c.fillRect(SX1 - 32, SY + 14, 10, FLOOR - SY);
      // tins (behind shelf front? no: tins in front of the back wall, on top of shelf)
      const g2 = c.createLinearGradient(0, SY, 0, SY + 16);
      g2.addColorStop(0, '#D9A066'); g2.addColorStop(.3, '#B9773E'); g2.addColorStop(1, '#7A4A28');
      c.fillStyle = g2; rr(c, SX0, SY, SX1 - SX0, 16, 4); c.fill();
      tins.forEach(drawTin);
      // sparks
      sparks.forEach(p => { c.globalAlpha = Math.max(0, p.life / .6); c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, 3, 0, TAU); c.fill(); });
      c.globalAlpha = 1;
      // counter
      const cy = H - 50;
      const cg = c.createLinearGradient(0, cy, 0, H);
      cg.addColorStop(0, '#C98B4E'); cg.addColorStop(.2, '#9A5B2E'); cg.addColorStop(1, '#5A361C');
      c.fillStyle = cg; c.fillRect(0, cy, W, 50);
      c.fillStyle = '#E8443A'; c.fillRect(0, cy + 18, W, 12);
      c.fillStyle = '#FFF4E0'; for (let x = 0; x < W; x += 24) c.fillRect(x, cy + 18, 12, 12);
      for (let i = 0; i < balls - (ball && ball.phase === 'air' ? 0 : 0); i++) drawBall(28 + i * 26, cy - 2, 10);
      // ball in the air
      if (ball) drawBall(ball.x, ball.y, ball.phase === 'air' ? ball.r : 10);
      if (msg) {
        const s = 1 + .08 * Math.sin(T * 6);
        c.save(); c.translate(W / 2, 170); c.scale(s, s);
        c.font = '700 44px Fredoka, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineWidth = 8; c.strokeStyle = '#7A2B12'; c.strokeText(msg.text, 0, 0); c.fillStyle = '#FFD65A'; c.fillText(msg.text, 0, 0);
        c.restore();
      }
    }
    function drawBall(x, y, r) {
      c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(x + 2, y + r * .9, r * .9, r * .3, 0, 0, TAU); c.fill();
      const g = c.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r);
      g.addColorStop(0, '#FFE3D9'); g.addColorStop(.25, '#FF7A5C'); g.addColorStop(1, '#A92612');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }

    setup();
    runLoop(cv, step);
  }

  /* =========================================================
     2. CRAZY GOLF
     ========================================================= */
  register({ id: 'golf', cat: 'fair', order: 6, name: 'Crazy Golf', icon: '⛳', desc: 'Putt past windmills, bridges and ramps', gentle: false, start: startGolf });

  const BR = 7, KF = 1.1, VMAX = 660, EB = .72;
  const RECT = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  function blankHole() { return { poly: null, walls: [], blocks: [], posts: [], water: [], bridges: [], ramps: [], sand: [], mills: [], tee: null, cup: null, par: 3, name: '' }; }
  function placePosts(r, H, n, x0, y0, x1, y1, rad) {
    const avoid = [H.tee, H.cup].concat(H.posts);
    for (let k = 0, tries = 0; k < n && tries < 200; tries++) {
      const p = { x: lerp(x0, x1, r()), y: lerp(y0, y1, r()), r: rad, col: Object.keys(DARK)[(k + H.posts.length) % 5] };
      if (avoid.every(a => Math.hypot(a.x - p.x, a.y - p.y) > (a.r || 10) + rad + 34)) { H.posts.push(p); avoid.push(p); k++; }
    }
  }
  const HOLES = [
    function straight(r, L) {
      const H = blankHole(); H.name = 'Straight and Steady'; H.par = 2;
      H.poly = RECT(70, 58, 290, 444); H.tee = { x: 180, y: 404 }; H.cup = { x: lerp(120, 240, r()), y: lerp(100, 130, r()) };
      placePosts(r, H, Math.min(3, Math.ceil(L / 2)), 104, 180, 256, 330, 14);
      return H;
    },
    function dogleg(r, L) {
      const H = blankHole(); H.name = 'Round the Corner'; H.par = 3;
      H.poly = [[50, 444], [180, 444], [180, 214], [310, 214], [310, 58], [50, 58]];
      H.tee = { x: 115, y: 404 }; H.cup = { x: lerp(250, 280, r()), y: lerp(100, 160, r()) };
      if (L >= 2) placePosts(r, H, 1, 80, 270, 150, 350, 12);
      if (L >= 4) placePosts(r, H, 1, 120, 90, 220, 180, 12);
      return H;
    },
    function ramp(r, L) {
      const H = blankHole(); H.name = 'Down the Slope'; H.par = 3;
      H.poly = RECT(60, 58, 300, 444); const gx = lerp(120, 240, r());
      H.blocks.push([60, 302, gx - 42, 318], [gx + 42, 302, 300, 318]);
      H.ramps.push({ x0: 60, y0: 178, x1: 300, y1: 290, ax: 0, ay: L <= 1 ? -110 : (L % 2 ? -90 : 70) });
      H.tee = { x: 180, y: 410 }; H.cup = { x: lerp(110, 250, r()), y: lerp(96, 130, r()) };
      return H;
    },
    function windmill(r, L) {
      const H = blankHole(); H.name = 'The Windmill'; H.par = 3;
      H.poly = RECT(60, 58, 300, 444); const gx = lerp(130, 230, r()), gw = Math.max(24, 30 - L * .4);
      H.blocks.push([60, 240, gx - gw, 272], [gx + gw, 240, 300, 272]);
      H.mills.push({ x: gx - gw, y: 256, len: gw * 2 - 6, n: 3, spd: Math.min(1.1, .55 + L * .04), a: r() * TAU });
      H.tee = { x: 180, y: 410 }; H.cup = { x: lerp(110, 250, r()), y: lerp(96, 130, r()) };
      return H;
    },
    function bridge(r, L) {
      const H = blankHole(); H.name = 'Over the Bridge'; H.par = 3;
      H.poly = RECT(50, 58, 310, 444); const bw = Math.max(54, 76 - L * 1.2), bx = lerp(76, 284 - bw, r());
      H.water.push([50, 210, 310, 282]); H.bridges.push([bx, 204, bx + bw, 288]);
      H.walls.push({ a: [bx, 204], b: [bx, 288], t: 6, rail: 1 }, { a: [bx + bw, 204], b: [bx + bw, 288], t: 6, rail: 1 });
      H.tee = { x: lerp(100, 260, r()), y: 410 }; H.cup = { x: lerp(100, 260, r()), y: lerp(96, 130, r()) };
      return H;
    },
    function zigzag(r, L) {
      const H = blankHole(); H.name = 'Zig-Zag'; H.par = 4;
      H.poly = RECT(60, 58, 300, 444);
      const y1 = lerp(310, 340, r()), x1 = lerp(196, 224, r()), y2 = lerp(170, 200, r()), x2 = lerp(136, 164, r());
      H.walls.push({ a: [60, y1], b: [x1, y1], t: 12 }, { a: [x2, y2], b: [300, y2], t: 12 });
      H.tee = { x: 110, y: 410 }; H.cup = { x: lerp(200, 262, r()), y: lerp(96, 126, r()) };
      if (L >= 6) placePosts(r, H, 1, 100, y2 + 40, 250, y1 - 40, 12);
      return H;
    },
    function millPosts(r, L) {
      const H = HOLES[3](r, L); H.name = 'Windmill and Bumpers'; H.par = 3;
      H.mills[0].spd = Math.min(1.2, H.mills[0].spd + .15);
      placePosts(r, H, 2, 90, 300, 270, 370, 13);
      placePosts(r, H, 1, 90, 150, 270, 200, 12);
      return H;
    },
    function bridgeBreeze(r, L) {
      const H = HOLES[4](r, L); H.name = 'Bridge and Slope'; H.par = 3;
      H.ramps.push({ x0: 50, y0: 304, x1: 310, y1: 366, ax: r() < .5 ? -100 : 100, ay: 0 });
      return H;
    },
    function lighthouse(r, L) {
      const H = blankHole(); H.name = 'Lighthouse Point'; H.par = 3;
      H.poly = [[92, 58], [268, 58], [310, 100], [310, 402], [268, 444], [92, 444], [50, 402], [50, 100]];
      H.tee = { x: 180, y: 410 }; H.cup = { x: lerp(130, 230, r()), y: lerp(100, 128, r()) };
      H.posts.push({ x: 180 + lerp(-14, 14, r()), y: lerp(232, 262, r()), r: 32, lighthouse: 1 });
      const sx = lerp(70, 200, r()); H.sand.push([sx, 300, sx + 90, 344]);
      placePosts(r, H, Math.min(3, 1 + Math.floor(L / 4)), 70, 160, 290, 210, 11);
      return H;
    }
  ];

  function startGolf(L, api) {
    const W = 360, H = 460, NH = 3;
    const seed = L * 7919 + randInt(100000);
    let hi = 0, hole, ball, state = 'aim', ang = 0, pw = 0, pt0 = 0, T = 0, strokes = 0, totalStrokes = 0, totalPar = 0;
    let shotStart = null, rollT = 0, splashes = [], help = null, sinkT = 0, banner = null, lastHit = 0;
    const aimSpd = .5 + Math.min(10, L) * .03;

    const wrap = el('div', 'f2-wrap');
    const { cv, c } = mkCanvas(wrap, W, H);
    const row = el('div', 'f2-row'), info = el('div', 'f2-chip'), tix = tixBar();
    row.append(info, tix); wrap.append(row); api.stage.append(wrap);
    api.rounds(NH, 0);

    function segs() {
      const S = [];
      const P = hole.poly; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; S.push({ a, b, t: 0 }); }
      hole.walls.forEach(w => S.push(w));
      hole.blocks.forEach(([x0, y0, x1, y1]) => { const q = RECT(x0, y0, x1, y1); for (let i = 0; i < 4; i++) S.push({ a: q[i], b: q[(i + 1) % 4], t: 0 }); });
      return S;
    }
    let SEGS = [];
    function setupHole() {
      const k = ((L - 1) * NH + hi) % HOLES.length;
      hole = HOLES[k](rng(seed + hi * 1013), L);
      SEGS = segs();
      ball = { x: hole.tee.x, y: hole.tee.y, vx: 0, vy: 0, s: 1 }; shotStart = { x: ball.x, y: ball.y };
      strokes = 0; state = 'aim'; help = null; sinkT = 0;
      ang = Math.atan2(hole.cup.y - ball.y, hole.cup.x - ball.x) - 1.0;
      banner = { text: `Hole ${hi + 1}: ${hole.name}`, t: 2.6 };
      updInfo(); aimHint();
    }
    function updInfo() { info.innerHTML = `Hole ${hi + 1} of ${NH} · Par ${hole.par} · Shots ${strokes}`; }
    function aimHint() { api.hint('Tap when the arrow points the right way. Or tap the ball, then tap where it should go.'); }

    const inRect = (p, [x0, y0, x1, y1]) => p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1;
    function inPoly(p, P) {
      let ins = false;
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
        const [xi, yi] = P[i], [xj, yj] = P[j];
        if ((yi > p.y) !== (yj > p.y) && p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi) ins = !ins;
      }
      return ins;
    }
    function bladeSegs(m) {
      const out = [];
      for (let k = 0; k < m.n; k++) { const a = m.a + k * TAU / m.n; out.push({ a: [m.x, m.y], b: [m.x + Math.cos(a) * m.len, m.y + Math.sin(a) * m.len], t: 7, m }); }
      return out;
    }
    function collide(sg) {
      const [ax, ay] = sg.a, [bx, by] = sg.b, dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      const u = l2 ? clamp(((ball.x - ax) * dx + (ball.y - ay) * dy) / l2, 0, 1) : 0;
      const qx = ax + u * dx, qy = ay + u * dy; let nx = ball.x - qx, ny = ball.y - qy; const d = Math.hypot(nx, ny), Rr = BR + sg.t / 2;
      if (d >= Rr || d === 0) return;
      nx /= d; ny /= d; ball.x = qx + nx * Rr; ball.y = qy + ny * Rr;
      let vbx = 0, vby = 0;
      if (sg.m) { vbx = -sg.m.spd * (qy - sg.m.y); vby = sg.m.spd * (qx - sg.m.x); }
      const rvx = ball.vx - vbx, rvy = ball.vy - vby, vn = rvx * nx + rvy * ny;
      if (vn < 0) { ball.vx -= (1 + EB) * vn * nx; ball.vy -= (1 + EB) * vn * ny; bump(-vn); }
      if (sg.m && state !== 'roll') { state = 'roll'; rollT = 0; }
    }
    function collidePost(p) {
      let nx = ball.x - p.x, ny = ball.y - p.y; const d = Math.hypot(nx, ny), Rr = BR + p.r;
      if (d >= Rr || d === 0) return;
      nx /= d; ny /= d; ball.x = p.x + nx * Rr; ball.y = p.y + ny * Rr;
      const vn = ball.vx * nx + ball.vy * ny;
      if (vn < 0) { ball.vx -= (1 + .8) * vn * nx; ball.vy -= (1 + .8) * vn * ny; bump(-vn, true); p.flash = .3; }
    }
    function bump(v, post) { if (v > 50 && T - lastHit > .06) { lastHit = T; tone(post ? 520 + Math.random() * 200 : 260 + Math.random() * 60, .08, post ? 'sine' : 'triangle', Math.min(.14, v / 3000)); } }

    function shoot(a, v) {
      v = clamp(v, 60, VMAX);
      ball.vx = Math.cos(a) * v; ball.vy = Math.sin(a) * v;
      shotStart = { x: ball.x, y: ball.y };
      strokes++; totalStrokes++; updInfo();
      state = 'roll'; rollT = 0;
      tone(330, .1, 'triangle', .16); noise(.12, 3000, 1500, .12);
      api.hint('Off it goes…');
    }
    cv.addEventListener('pointerdown', e => {
      const p = tapPos(cv, e, W, H), nearBall = Math.hypot(p.x - ball.x, p.y - ball.y) < 34;
      if (state === 'aim') {
        if (nearBall) { state = 'target'; sfx.tap(); api.hint('Now tap the spot where you want the ball to roll.'); }
        else { state = 'power'; pt0 = T; sfx.tap(); api.hint('Good. Now tap again to choose how hard to hit it.'); }
      } else if (state === 'power') {
        shoot(ang, 70 + pw * (VMAX - 70));
      } else if (state === 'target') {
        if (nearBall) { state = 'aim'; sfx.tap(); aimHint(); return; }
        const d = Math.hypot(p.x - ball.x, p.y - ball.y);
        ang = Math.atan2(p.y - ball.y, p.x - ball.x);
        shoot(ang, d * KF + 10);
      }
    });

    function stopBall() {
      ball.vx = ball.vy = 0;
      if (strokes >= 6) {
        help = { x0: ball.x, y0: ball.y, t: 0 }; state = 'help';
        api.hint('Let me give you a helping hand… in it goes!');
        return;
      }
      state = 'aim'; ang = Math.atan2(hole.cup.y - ball.y, hole.cup.x - ball.x) - 1.0;
      api.hint(`Shot ${strokes} done. ${pick(['Nice and steady.', 'Getting closer.', 'Lovely.', 'Take your time.'])} Tap to aim again, or tap the ball then a spot.`);
    }
    function sink() {
      state = 'sunk'; sinkT = 0; ball.vx = ball.vy = 0;
      [523, 659, 784, 1047].forEach((f, i) => tone(f, .2, 'sine', .14, .1 + i * .1));
      const par = hole.par; totalPar += par;
      const n = (strokes <= par ? 3 : strokes <= par + 2 ? 2 : 1) + (strokes === 1 ? 2 : 0);
      const total = tix.award(n);
      const word = strokes === 1 ? 'Hole in one!' : strokes < par ? 'Under par, wonderful!' : strokes === par ? 'Par, well played!' : 'In the hole!';
      banner = { text: strokes === 1 ? 'Hole in one!' : 'In it goes!', t: 2.4 };
      if (strokes === 1) sfx.win();
      api.hint(`${word} ${strokes} shot${strokes === 1 ? '' : 's'}. ${tixText(n, total)}`);
      hi++; api.rounds(NH, hi);
      if (hi < NH) api.later(setupHole, 3000);
      else api.later(() => { const over = totalStrokes - totalPar; api.done(over <= 1 ? 3 : over <= 4 ? 2 : 1); }, 2800);
    }
    function splash() {
      splashes.push({ x: ball.x, y: ball.y, t: 0 });
      noise(.5, 900, 300, .3); tone(200, .25, 'sine', .1);
      ball.x = shotStart.x; ball.y = shotStart.y; ball.vx = ball.vy = 0;
      if (strokes >= 6) { stopBall(); return; }
      state = 'aim';
      api.hint('Splash! The ball is back where it was, no harm done. Try again.');
    }

    function physics(dt) {
      hole.mills.forEach(m => { m.a += m.spd * dt; });
      const msegs = [].concat(...hole.mills.map(bladeSegs));
      if (state === 'aim' || state === 'target' || state === 'power') {
        // a sail may nudge a resting ball
        msegs.forEach(collide);
        return;
      }
      if (state !== 'roll') return;
      rollT += dt;
      const sub = 5, h = dt / sub;
      for (let s = 0; s < sub; s++) {
        let k = KF, onRamp = false;
        hole.ramps.forEach(rp => { if (inRect(ball, [rp.x0, rp.y0, rp.x1, rp.y1])) { ball.vx += rp.ax * h; ball.vy += rp.ay * h; onRamp = true; } });
        hole.sand.forEach(sd => { if (inRect(ball, sd)) k += 3; });
        const dcx = hole.cup.x - ball.x, dcy = hole.cup.y - ball.y, dc = Math.hypot(dcx, dcy), sp = Math.hypot(ball.vx, ball.vy);
        if (dc < 30 && sp < 170) { ball.vx += dcx / dc * 260 * h; ball.vy += dcy / dc * 260 * h; k += 1.5; }
        const f = Math.exp(-k * h); ball.vx *= f; ball.vy *= f;
        ball.x += ball.vx * h; ball.y += ball.vy * h;
        SEGS.forEach(collide); msegs.forEach(collide); hole.posts.forEach(collidePost);
        if (dc < 10 && sp < 400) { sink(); return; }
        if (hole.water.some(w => inRect(ball, w)) && !hole.bridges.some(b => inRect(ball, b))) { splash(); return; }
        if (!inPoly(ball, hole.poly)) { ball.x = shotStart.x; ball.y = shotStart.y; ball.vx = ball.vy = 0; }
        const onR = onRamp;
        if ((Math.hypot(ball.vx, ball.vy) < 7 && !onR) || (Math.hypot(ball.vx, ball.vy) < 4 && rollT > 3) || rollT > 14) { stopBall(); return; }
      }
    }
    function step(dt) {
      T += dt;
      if (state === 'aim') ang += aimSpd * dt;
      if (state === 'power') pw = .5 - .5 * Math.cos((T - pt0) * TAU / 3.4);
      physics(dt);
      if (state === 'help') {
        help.t += dt / 1.6; const u = Math.min(1, help.t), e = u * u * (3 - 2 * u);
        ball.x = lerp(help.x0, hole.cup.x, e); ball.y = lerp(help.y0, hole.cup.y, e) - Math.sin(u * Math.PI) * 26;
        if (u >= 1) sink();
      }
      if (state === 'sunk') sinkT += dt;
      splashes.forEach(s => s.t += dt); splashes = splashes.filter(s => s.t < 1.2);
      hole.posts.forEach(p => { if (p.flash) p.flash = Math.max(0, p.flash - dt); });
      if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
      draw();
    }

    function polyPath(P) { c.beginPath(); P.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); }
    function draw() {
      // promenade
      c.fillStyle = '#EAD7AE'; c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(150,110,60,.18)'; c.lineWidth = 1;
      for (let y = 40; y < H; y += 24) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); for (let x = (y / 24 % 2) * 24; x < W; x += 48) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 24); c.stroke(); } }
      // course
      c.save(); c.translate(4, 6); polyPath(hole.poly); c.fillStyle = 'rgba(0,0,0,.22)'; c.fill(); c.restore();
      polyPath(hole.poly); c.fillStyle = '#58BA5B'; c.fill();
      c.save(); polyPath(hole.poly); c.clip();
      c.fillStyle = '#4FAE53';
      for (let x = -H; x < W + H; x += 44) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 22, 0); c.lineTo(x + 22 + H, H); c.lineTo(x + H, H); c.fill(); }
      // water
      hole.water.forEach(([x0, y0, x1, y1]) => {
        const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#2C8FD0'); g.addColorStop(.5, '#4FB4EA'); g.addColorStop(1, '#2C8FD0');
        c.fillStyle = g; c.fillRect(x0, y0, x1 - x0, y1 - y0);
        c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2;
        for (let y = y0 + 12; y < y1 - 4; y += 16) for (let x = x0 - 30 + ((T * 14 + y) % 40); x < x1; x += 40) { c.beginPath(); c.arc(x, y, 7, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
      });
      // sand
      hole.sand.forEach(([x0, y0, x1, y1]) => {
        c.fillStyle = '#F1DC9E'; rr(c, x0, y0, x1 - x0, y1 - y0, 16); c.fill();
        c.fillStyle = 'rgba(170,130,60,.35)'; for (let i = 0; i < 26; i++) { c.beginPath(); c.arc(x0 + 8 + (i * 37) % (x1 - x0 - 14), y0 + 6 + (i * 23) % (y1 - y0 - 10), 1.6, 0, TAU); c.fill(); }
      });
      // ramps
      hole.ramps.forEach(rp => {
        const g = rp.ay ? c.createLinearGradient(0, rp.y0, 0, rp.y1) : c.createLinearGradient(rp.x0, 0, rp.x1, 0);
        const down = (rp.ay || rp.ax) > 0;
        g.addColorStop(0, down ? '#7ED07B' : '#3E9B45'); g.addColorStop(1, down ? '#3E9B45' : '#7ED07B');
        c.fillStyle = g; c.fillRect(rp.x0, rp.y0, rp.x1 - rp.x0, rp.y1 - rp.y0);
        c.save(); c.beginPath(); c.rect(rp.x0, rp.y0, rp.x1 - rp.x0, rp.y1 - rp.y0); c.clip();
        c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
        const dx = Math.sign(rp.ax), dy = Math.sign(rp.ay), off = (T * 16) % 34;
        if (dy) for (let y = (dy > 0 ? rp.y0 - 34 + off : rp.y1 + 34 - off); dy > 0 ? y < rp.y1 + 20 : y > rp.y0 - 20; y += dy * 34) for (let x = rp.x0 + 30; x < rp.x1; x += 60) { c.beginPath(); c.moveTo(x - 12, y - dy * 8); c.lineTo(x, y + dy * 4); c.lineTo(x + 12, y - dy * 8); c.stroke(); }
        if (dx) for (let x = (dx > 0 ? rp.x0 - 34 + off : rp.x1 + 34 - off); dx > 0 ? x < rp.x1 + 20 : x > rp.x0 - 20; x += dx * 34) for (let y = rp.y0 + 16; y < rp.y1; y += 30) { c.beginPath(); c.moveTo(x - dx * 8, y - 10); c.lineTo(x + dx * 4, y); c.lineTo(x - dx * 8, y + 10); c.stroke(); }
        c.restore();
      });
      c.restore();
      // border
      polyPath(hole.poly); c.lineJoin = 'round'; c.lineWidth = 12; c.strokeStyle = '#8A5228'; c.stroke();
      c.lineWidth = 3; c.strokeStyle = '#C98B4E'; c.stroke();
      // bridges
      hole.bridges.forEach(([x0, y0, x1, y1]) => {
        c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(x0 + 3, y0 + 4, x1 - x0, y1 - y0);
        c.fillStyle = '#C98B4E'; c.fillRect(x0, y0, x1 - x0, y1 - y0);
        c.strokeStyle = '#8A5228'; c.lineWidth = 2; for (let y = y0 + 8; y < y1; y += 10) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); }
      });
      // blocks (painted kerb blocks)
      hole.blocks.forEach(([x0, y0, x1, y1]) => {
        c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x0 + 3, y0 + 5, x1 - x0, y1 - y0);
        c.fillStyle = '#C4432A'; c.fillRect(x0, y0, x1 - x0, y1 - y0);
        c.save(); c.beginPath(); c.rect(x0, y0, x1 - x0, y1 - y0); c.clip();
        c.fillStyle = '#FFF4E0'; for (let x = x0 - 40; x < x1 + 20; x += 28) { c.beginPath(); c.moveTo(x, y1); c.lineTo(x + 14, y1); c.lineTo(x + 14 + (y1 - y0), y0); c.lineTo(x + (y1 - y0), y0); c.fill(); }
        c.restore();
        c.strokeStyle = '#7A2B12'; c.lineWidth = 2; c.strokeRect(x0, y0, x1 - x0, y1 - y0);
      });
      // walls
      c.lineCap = 'round';
      hole.walls.forEach(w => {
        c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = w.t; c.beginPath(); c.moveTo(w.a[0] + 2, w.a[1] + 4); c.lineTo(w.b[0] + 2, w.b[1] + 4); c.stroke();
        c.strokeStyle = w.rail ? '#6B3A1B' : '#8A5228'; c.beginPath(); c.moveTo(w.a[0], w.a[1]); c.lineTo(w.b[0], w.b[1]); c.stroke();
        c.strokeStyle = w.rail ? '#A9713F' : '#C98B4E'; c.lineWidth = Math.max(2, w.t / 3); c.stroke();
      });
      // tee mat
      c.fillStyle = 'rgba(255,255,255,.35)'; rr(c, hole.tee.x - 16, hole.tee.y - 10, 32, 20, 6); c.fill();
      // cup and flag
      const cp = hole.cup;
      c.fillStyle = '#1B2A1E'; c.beginPath(); c.ellipse(cp.x, cp.y, 11, 10, 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; c.stroke();
      // posts
      hole.posts.forEach(p => {
        c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(p.x + 3, p.y + 5, p.r, 0, TAU); c.fill();
        if (p.lighthouse) {
          [[1, '#E8443A'], [.75, '#FFF4E0'], [.5, '#E8443A'], [.3, '#FFE07A']].forEach(([k, col]) => { c.fillStyle = col; c.beginPath(); c.arc(p.x, p.y, p.r * k, 0, TAU); c.fill(); });
          const a = T * .8; c.fillStyle = 'rgba(255,240,170,.28)';
          c.beginPath(); c.moveTo(p.x, p.y); c.arc(p.x, p.y, 90, a - .25, a + .25); c.closePath(); c.fill();
        } else {
          const g = c.createRadialGradient(p.x - p.r * .4, p.y - p.r * .4, 1, p.x, p.y, p.r);
          g.addColorStop(0, '#fff'); g.addColorStop(.3, COLS[p.col]); g.addColorStop(1, DARK[p.col]);
          c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.r * (1 + (p.flash || 0) * .4), 0, TAU); c.fill();
          sym(c, R.CUBES.find(q => q.c === p.col).s, p.x, p.y, p.r, 'rgba(255,255,255,.9)');
        }
      });
      // windmills
      hole.mills.forEach(m => {
        c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(m.x + 3, m.y + 5, 17, 0, TAU); c.fill();
        c.fillStyle = '#FFF4E0'; c.beginPath(); c.arc(m.x, m.y, 17, 0, TAU); c.fill();
        c.fillStyle = '#E8443A'; c.beginPath(); c.arc(m.x, m.y, 11, 0, TAU); c.fill();
        bladeSegs(m).forEach(s => {
          const [ax, ay] = s.a, [bx, by] = s.b, a = Math.atan2(by - ay, bx - ax);
          c.save(); c.translate(ax, ay); c.rotate(a);
          c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(8, 2, m.len - 6, 12);
          c.fillStyle = '#6B3A1B'; c.fillRect(0, -2.5, m.len, 5);
          c.fillStyle = '#FFF9EF'; c.fillRect(12, -8, m.len - 14, 7);
          c.strokeStyle = '#B9773E'; c.lineWidth = 1; for (let x = 16; x < m.len; x += 7) { c.beginPath(); c.moveTo(x, -8); c.lineTo(x, -1); c.stroke(); }
          c.restore();
        });
        c.fillStyle = '#FFC234'; c.beginPath(); c.arc(m.x, m.y, 5, 0, TAU); c.fill();
      });
      // splashes
      splashes.forEach(s => { c.strokeStyle = `rgba(255,255,255,${1 - s.t / 1.2})`; c.lineWidth = 3; [1, .6].forEach(k => { c.beginPath(); c.arc(s.x, s.y, 6 + s.t * 30 * k, 0, TAU); c.stroke(); }); });
      // ball
      const sunkScale = state === 'sunk' ? Math.max(0, 1 - sinkT * 2) : 1;
      if (sunkScale > 0) {
        c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.arc(ball.x + 2, ball.y + 3, BR * sunkScale, 0, TAU); c.fill();
        const g = c.createRadialGradient(ball.x - 2.5, ball.y - 2.5, 1, ball.x, ball.y, BR);
        g.addColorStop(0, '#fff'); g.addColorStop(1, '#C9CFD4');
        c.fillStyle = g; c.beginPath(); c.arc(ball.x, ball.y, BR * sunkScale, 0, TAU); c.fill();
      }
      // flag (drawn above ball)
      c.strokeStyle = '#5A361C'; c.lineWidth = 3; c.beginPath(); c.moveTo(cp.x, cp.y); c.lineTo(cp.x + 4, cp.y - 46); c.stroke();
      const wv = Math.sin(T * 3) * 3;
      c.fillStyle = '#FFC234'; c.beginPath(); c.moveTo(cp.x + 4, cp.y - 46); c.quadraticCurveTo(cp.x + 18, cp.y - 42 + wv, cp.x + 32, cp.y - 38); c.lineTo(cp.x + 4, cp.y - 30); c.closePath(); c.fill();
      c.strokeStyle = '#C28A00'; c.lineWidth = 1.5; c.stroke();
      sym(c, String(Math.min(NH, hi + 1)), cp.x + 14, cp.y - 39, 11, '#5A361C');
      // aiming
      if (state === 'aim' || state === 'power') {
        const len = state === 'power' ? 40 + pw * 70 : 70;
        const ex = ball.x + Math.cos(ang) * len, ey = ball.y + Math.sin(ang) * len;
        c.setLineDash([6, 7]); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 4; c.beginPath(); c.moveTo(ball.x, ball.y); c.lineTo(ex, ey); c.stroke(); c.setLineDash([]);
        c.save(); c.translate(ex, ey); c.rotate(ang);
        c.fillStyle = '#FF6B4A'; c.strokeStyle = '#fff'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(14, 0); c.lineTo(-8, -11); c.lineTo(-8, 11); c.closePath(); c.stroke(); c.fill();
        c.restore();
      }
      if (state === 'target') {
        const k = 1 + .15 * Math.sin(T * 5);
        c.strokeStyle = '#FFC234'; c.lineWidth = 4; c.beginPath(); c.arc(ball.x, ball.y, 20 * k, 0, TAU); c.stroke();
      }
      // awning, bunting and lights on top
      awning(c, W, 26, ['#3B9BE0', '#FFF4E0']);
      bulbs(c, W, 46, T, 36);
      if (state === 'power') {
        const x0 = 50, x1 = W - 50, y = H - 26;
        c.fillStyle = 'rgba(24,36,44,.8)'; rr(c, x0 - 8, y - 14, x1 - x0 + 16, 28, 14); c.fill();
        const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, '#3CC46B'); g.addColorStop(.6, '#FFC234'); g.addColorStop(1, '#FF6B4A');
        c.fillStyle = g; rr(c, x0, y - 7, (x1 - x0) * Math.max(.04, pw), 14, 7); c.fill();
        sym(c, 'Power', W / 2, y - 26, 18, '#18242C');
      }
      if (banner) {
        c.save(); c.globalAlpha = Math.min(1, banner.t * 2);
        c.font = '700 26px Fredoka, system-ui, sans-serif'; const tw = c.measureText(banner.text).width + 36;
        c.fillStyle = 'rgba(255,249,239,.95)'; rr(c, W / 2 - tw / 2, 160, tw, 46, 23); c.fill();
        c.strokeStyle = '#E9C67E'; c.lineWidth = 3; c.stroke();
        sym(c, banner.text, W / 2, 183, 24, '#18242C');
        c.restore();
      }
    }

    setupHole();
    runLoop(cv, step);
  }

  /* =========================================================
     3. DARTS
     ========================================================= */
  register({ id: 'darts', cat: 'fair', order: 7, name: 'Darts', icon: '🎯', desc: 'Tap to throw darts at a big friendly board', gentle: false, start: startDarts });

  const SEG = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
  function startDarts(L, api) {
    const W = 360, H = 400, cx = 180, cy = 234, RB = 140, MAXT = 10;
    const rtc = L >= 3 && L % 2 === 1;
    const goal = rtc ? Math.min(12, L + 1) : L <= 1 ? 101 : L === 2 ? 151 : Math.min(201, 101 + L * 10);
    let left = goal, target = 1, turn = 1, thrown = [], flying = null, busy = false, finished = false, T = 0, bulls = 0, dartsUsed = 0;
    let pops = [], aimBase = { x: cx, y: cy };
    const amp = rtc ? RB * (.22 + Math.min(12, L) * .018) : RB * (.42 + Math.min(10, L) * .03);
    const w1 = .5 + Math.min(10, L) * .03, w2 = w1 * 1.37, ph = Math.random() * TAU;

    const wrap = el('div', 'f2-wrap');
    const board = el('div', 'f2-board');
    const big = el('div', 'f2-big'), throws = el('div', 'f2-throws');
    board.append(big, throws);
    const { cv, c } = mkCanvas(wrap, W, H);
    wrap.prepend(board);
    const row = el('div', 'f2-row'), tix = tixBar(), turnChip = el('div', 'f2-chip');
    row.append(turnChip, tix); wrap.append(row); api.stage.append(wrap);
    api.rounds(3, 0);

    function updBoard(popIt) {
      big.innerHTML = rtc ? `<small>Aim for</small><b>${Math.min(target, goal)}</b>` : `<small>To go</small><b>${left}</b>`;
      if (popIt) big.querySelector('b').classList.add('pop');
      throws.innerHTML = `<div class="f2-chip" style="background:none;padding:0">${rtc ? `Round the Clock: 1 to ${goal}` : `Count down from ${goal}`}</div>` +
        `<div class="f2-slots">${[0, 1, 2].map(i => `<span class="${thrown[i] ? 'on' : ''}">${thrown[i] ? thrown[i].txt : ''}</span>`).join('')}</div>`;
      turnChip.textContent = `Turn ${turn}`;
      api.rounds(3, thrown.length);
    }
    function startHint() {
      api.hint(rtc ? `Hit the number ${target}. Tap anywhere to throw when the circle is over it.` : 'Tap anywhere to throw a dart where the circle is.');
    }
    function segCentre(n) { const i = SEG.indexOf(n), a = (-90 + i * 18) * Math.PI / 180; return { x: cx + Math.cos(a) * RB * .72, y: cy + Math.sin(a) * RB * .72 }; }
    function aimPos() {
      return { x: aimBase.x + Math.sin(T * w1 + ph) * amp, y: aimBase.y + Math.sin(T * w2 + ph * 2) * amp * .9 };
    }
    function scoreAt(x, y) {
      const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy) / RB;
      if (r > 1) return { s: 0, n: 0, txt: '0', label: 'Just off the board. Never mind!' };
      if (r < .055) return { s: 50, n: 'bull', txt: '50', label: 'Bullseye! 50!' };
      if (r < .125) return { s: 25, n: 'bull', txt: '25', label: 'Outer bull, 25!' };
      let a = Math.atan2(dx, -dy) * 180 / Math.PI; if (a < 0) a += 360;
      const n = SEG[Math.floor((a + 9) / 18) % 20];
      const m = r >= .9 ? 2 : (r >= .5 && r < .585) ? 3 : 1;
      return { s: n * m, n, m, txt: String(n * m), label: m === 3 ? `Treble ${n}, that's ${n * 3}!` : m === 2 ? `Double ${n}, that's ${n * 2}!` : `${n}.` };
    }

    cv.addEventListener('pointerdown', () => {
      if (busy || finished || flying || thrown.length >= 3) return;
      const p = aimPos();
      flying = { x: p.x, y: p.y, t: 0 };
      noise(.25, 2500, 900, .18); sfx.tap();
    });
    function land(d) {
      const sc = scoreAt(d.x, d.y); dartsUsed++;
      d.sc = sc; d.txt = sc.txt; d.wob = 1; thrown.push(d);
      tone(sc.s ? 180 : 120, .07, 'square', .08);
      let msgText = sc.label;
      if (sc.n === 'bull') { bulls++; const tot = tix.award(1); msgText += ` 🎟 +1 ticket. You have ${tot}.`; sfx.good(); }
      pops.push({ x: d.x, y: d.y - 24, text: sc.s ? (sc.n === 'bull' ? 'Bull!' : sc.txt) : 'Oops', t: 0 });
      if (rtc) {
        const hit = sc.n === target || sc.n === 'bull';
        if (hit) {
          d.txt = '✓'; target++; tone(660 + target * 20, .16, 'sine', .14);
          msgText = sc.n === 'bull' ? `Bullseye counts as a hit!` : `Yes, ${sc.n}! ${cheer()}`;
          if (target > goal) { updBoard(true); return finish(); }
          msgText += ` Now aim for ${target}.`;
        } else { d.txt = sc.s ? String(sc.n) : '0'; msgText = sc.s ? `That's ${sc.n}. Still aiming for ${target}.` : `Just off the board. Still aiming for ${target}.`; }
      } else {
        left = Math.max(0, left - sc.s);
        if (sc.s >= 40) tone(990, .2, 'sine', .12, .08);
        if (left === 0) { updBoard(true); return finish(); }
        msgText += ` ${left} to go.`;
      }
      updBoard(true);
      api.hint(msgText);
      if (thrown.length >= 3) {
        busy = true;
        api.later(() => {
          if (turn >= MAXT) return finish();
          turn++; thrown = []; busy = false; updBoard(); sfx.soft();
          api.hint(`Turn ${turn}. ${rtc ? `Aim for ${target}.` : `${left} to go.`} Tap to throw.`);
        }, 1700);
      }
    }
    function finish() {
      finished = true; busy = true;
      let stars;
      if (left === 0 && !rtc || rtc && target > goal) {
        const base = rtc ? Math.ceil(goal * 2 / 3) + 1 : Math.ceil(goal / 40);
        stars = turn <= base ? 3 : turn <= base + 2 ? 2 : 1;
      } else stars = 1;
      const n = stars + 2, total = tix.award(n);
      const done = left === 0 || target > goal;
      api.hint(`${done ? (rtc ? 'All the way round the clock!' : 'Game shot! You got down to zero!') : 'What a lovely game of darts!'} ${dartsUsed} darts. ${tixText(n, total)}`);
      if (done) { sfx.win(); pops.push({ x: cx, y: cy - 30, text: rtc ? 'Round the Clock!' : 'Game shot!', t: -1.2, big: 1 }); }
      api.later(() => api.done(stars), 2800);
    }

    function step(dt) {
      T += dt;
      const want = rtc && target <= goal ? segCentre(target) : { x: cx, y: cy };
      aimBase.x += (want.x - aimBase.x) * Math.min(1, dt * 1.5); aimBase.y += (want.y - aimBase.y) * Math.min(1, dt * 1.5);
      if (flying) { flying.t += dt / .38; if (flying.t >= 1) { const d = flying; flying = null; land(d); } }
      thrown.forEach(d => { if (d.wob) d.wob = Math.max(0, d.wob - dt * 2.5); });
      pops.forEach(p => p.t += dt); pops = pops.filter(p => p.t < 1.4);
      draw();
    }
    function sector(r0, r1, a0, a1, col) { c.fillStyle = col; c.beginPath(); c.arc(cx, cy, r1, a0, a1); c.arc(cx, cy, r0, a1, a0, true); c.closePath(); c.fill(); }
    function drawDart(x, y, s, wobble) {
      c.save(); c.translate(x, y); c.rotate(-.5 + Math.sin(wobble * 20) * wobble * .15); c.scale(s, s);
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(4, 3, 4, 2, 0, 0, TAU); c.fill();
      c.strokeStyle = '#9AA3AA'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -10); c.stroke();
      c.fillStyle = '#C9A050'; rr(c, -3, -30, 6, 20, 3); c.fill();
      c.fillStyle = '#F25A95'; c.beginPath(); c.moveTo(0, -30); c.lineTo(-11, -48); c.lineTo(0, -44); c.lineTo(11, -48); c.closePath(); c.fill();
      c.strokeStyle = '#AE2A5F'; c.lineWidth = 1; c.stroke();
      c.restore();
    }
    function draw() {
      // wood panelling
      c.fillStyle = '#6B3E22'; c.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x += 40) { c.fillStyle = (x / 40) % 2 ? '#74442A' : '#663A20'; c.fillRect(x, 0, 40, H); c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x, 0, 2, H); }
      awning(c, W, 30, ['#2E9E5B', '#FFF4E0']);
      bulbs(c, W, 50, T, 30);
      // board
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(cx + 5, cy + 8, RB * 1.17, 0, TAU); c.fill();
      c.fillStyle = '#1C1C1E'; c.beginPath(); c.arc(cx, cy, RB * 1.17, 0, TAU); c.fill();
      c.strokeStyle = '#C9A050'; c.lineWidth = 4; c.stroke();
      for (let i = 0; i < 20; i++) {
        const a = (-90 + i * 18) * Math.PI / 180, a0 = a - Math.PI / 20, a1 = a + Math.PI / 20, odd = i % 2;
        const single = odd ? '#F3E3BC' : '#2C3640', ring = odd ? '#2E9E5B' : '#E2483A';
        sector(RB * .125, RB * .5, a0, a1, single); sector(RB * .5, RB * .585, a0, a1, ring);
        sector(RB * .585, RB * .9, a0, a1, single); sector(RB * .9, RB, a0, a1, ring);
        sym(c, String(SEG[i]), cx + Math.cos(a) * RB * 1.085, cy + Math.sin(a) * RB * 1.085, 19, '#FFF4D8');
      }
      if (rtc && target <= goal) {
        const i = SEG.indexOf(target), a = (-90 + i * 18) * Math.PI / 180;
        sector(RB * .125, RB, a - Math.PI / 20, a + Math.PI / 20, `rgba(255,214,90,${.5 + .15 * Math.sin(T * 3)})`);
        c.strokeStyle = '#FFD65A'; c.lineWidth = 3; c.beginPath(); c.arc(cx + Math.cos(a) * RB * 1.085, cy + Math.sin(a) * RB * 1.085, 15, 0, TAU); c.stroke();
      }
      c.fillStyle = '#2E9E5B'; c.beginPath(); c.arc(cx, cy, RB * .125, 0, TAU); c.fill();
      c.fillStyle = '#E2483A'; c.beginPath(); c.arc(cx, cy, RB * .055, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(210,215,220,.55)'; c.lineWidth = 1;
      [.125, .5, .585, .9, 1].forEach(k => { c.beginPath(); c.arc(cx, cy, RB * k, 0, TAU); c.stroke(); });
      for (let i = 0; i < 20; i++) { const a = (-81 + i * 18) * Math.PI / 180; c.beginPath(); c.moveTo(cx + Math.cos(a) * RB * .125, cy + Math.sin(a) * RB * .125); c.lineTo(cx + Math.cos(a) * RB, cy + Math.sin(a) * RB); c.stroke(); }
      // board shine
      const sh = c.createRadialGradient(cx - RB * .5, cy - RB * .6, 5, cx, cy, RB * 1.2);
      sh.addColorStop(0, 'rgba(255,255,255,.16)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = sh; c.beginPath(); c.arc(cx, cy, RB * 1.17, 0, TAU); c.fill();
      thrown.forEach(d => drawDart(d.x, d.y, 1, d.wob));
      if (flying) { const u = flying.t, e = 1 - (1 - u) * (1 - u); drawDart(lerp(cx + 40, flying.x, e), lerp(H + 60, flying.y, e), lerp(2.6, 1, e), 0); }
      // crosshair
      if (!finished && !busy && thrown.length < 3) {
        const p = aimPos(), k = 1 + .08 * Math.sin(T * 4);
        c.lineWidth = 7; c.strokeStyle = 'rgba(24,36,44,.6)';
        c.beginPath(); c.arc(p.x, p.y, 20 * k, 0, TAU); c.stroke();
        c.lineWidth = 4; c.strokeStyle = '#fff'; c.stroke();
        c.beginPath(); [[-32, 0, -12, 0], [12, 0, 32, 0], [0, -32, 0, -12], [0, 12, 0, 32]].forEach(([a, b, d, e]) => { c.moveTo(p.x + a, p.y + b); c.lineTo(p.x + d, p.y + e); });
        c.lineWidth = 7; c.strokeStyle = 'rgba(24,36,44,.6)'; c.stroke(); c.lineWidth = 4; c.strokeStyle = '#FFD65A'; c.stroke();
        c.fillStyle = '#FFD65A'; c.beginPath(); c.arc(p.x, p.y, 3, 0, TAU); c.fill();
      }
      pops.forEach(p => {
        if (p.t < 0) return;
        const a = 1 - Math.max(0, p.t - .8) / .6, y = p.y - p.t * 26;
        c.save(); c.globalAlpha = a; c.font = `700 ${p.big ? 36 : 28}px Fredoka, system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineWidth = 6; c.strokeStyle = '#18242C'; c.strokeText(p.text, p.x, y); c.fillStyle = '#FFD65A'; c.fillText(p.text, p.x, y);
        c.restore();
      });
    }

    updBoard(); startHint();
    runLoop(cv, step);
  }

  /* =========================================================
     4. PRIZE STALL
     ========================================================= */
  register({ id: 'prizes', cat: 'fair', order: 8, name: 'Prize Stall', icon: '🧸', desc: 'Swap your tickets for lovely prizes', gentle: true, start: startPrizes });

  const PRIZES = [
    { id: 'duck', name: 'Rubber duck', cost: 3, art: '🦆', col: 'c-sun', note: 'Quack quack! Perfect for bath time.' },
    { id: 'rock', name: 'Stick of rock', cost: 4, art: 'rock', col: 'c-rose', note: 'Pink and minty, with letters all the way through.' },
    { id: 'balloon', name: 'Balloon', cost: 4, art: '🎈', col: 'c-sky', note: 'Hold on tight so it doesn’t float away!' },
    { id: 'windmill', name: 'Toy windmill', cost: 5, art: 'pin', col: 'c-mint', note: 'It spins round and round in the sea breeze.' },
    { id: 'floss', name: 'Candy floss', cost: 6, art: 'floss', col: 'c-berry', note: 'Sweet, pink and sticky. A seaside treat!' },
    { id: 'goldfish', name: 'Goldfish in a bag', cost: 8, art: 'fish', col: 'c-sky', note: 'A little friend to take home. What will you call it?' },
    { id: 'bucket', name: 'Bucket and spade', cost: 8, art: '🪣', col: 'c-orange', note: 'Ready to build the finest sandcastle.' },
    { id: 'hat', name: 'Seaside hat', cost: 10, art: '👒', col: 'c-peach', note: 'Keeps the sun off on a lovely day out.' },
    { id: 'coconut', name: 'Coconut', cost: 10, art: '🥥', col: 'c-orange', note: 'A proper fairground prize from the coconut shy.' },
    { id: 'kewpie', name: 'Kewpie doll', cost: 14, art: '👼', col: 'c-rose', note: 'Rosy cheeks and a little curl on top.' },
    { id: 'chinadog', name: 'China dog', cost: 18, art: '🐕', col: 'c-card', note: 'A fine ornament for the mantelpiece.', plinth: 1 },
    { id: 'teddy', name: 'Big teddy bear', cost: 25, art: '🧸', col: 'c-peach', note: 'The top prize! Soft, cuddly and very loved.' }
  ];
  function prizeArt(p) {
    const inner = p.art === 'rock' ? '<span class="f2-rock"></span>' : p.art === 'pin' ? '<span class="f2-pin"><i></i></span>' :
      p.art === 'floss' ? '<span class="f2-floss"></span>' : p.art === 'fish' ? '<span class="f2-bag"><span>🐠</span></span>' :
      p.art === 'ball' ? '<span class="f2-ball"></span>' : p.art;
    return `<span class="f2-art${p.plinth ? ' f2-plinth' : ''}" aria-hidden="true">${inner}</span>`;
  }

  function startPrizes(L, api) {
    let shelf = store.get('prizeShelf', []);
    if (!Array.isArray(shelf)) shelf = [];
    let view = 'stall', sel = null, fresh = null;
    let welcome = '';
    if (!store.get('prizeStarter', false)) {
      R.tickets(10); store.set('prizeStarter', true);
      welcome = 'Welcome to the Prize Stall! Here is a gift of 10 tickets to start you off. ';
    }

    const root = el('div', 'f2-stall');
    const top = el('div', 'f2-top'), tix = tixBar(), tabs = el('div', 'f2-tabs');
    const tStall = el('button', 'btn c-orange', '🎪 Stall'), tShelf = el('button', 'btn c-card', '');
    const doneBtn = el('button', 'btn c-leaf', '✓ Done');
    [tStall, tShelf, doneBtn].forEach(b => b.type = 'button');
    tabs.append(tStall, tShelf, doneBtn); top.append(tix, tabs);
    const body = el('div'), detail = el('div', 'f2-detail');
    root.append(top, body, detail); api.stage.append(root);
    api.rounds(0, 0);

    tStall.onclick = () => { sfx.tap(); view = 'stall'; sel = null; render(); api.hint('Tap a prize to have a look.'); };
    tShelf.onclick = () => { sfx.tap(); view = 'shelf'; sel = null; render(); api.hint(shelf.length ? 'Your prize shelf. Tap a prize to admire it.' : 'Your shelf is waiting for its first prize.'); };
    doneBtn.onclick = () => { sfx.tap(); doneBtn.disabled = true; api.done(3); };

    function counts() { const m = new Map(); shelf.forEach(s => m.set(s.id, (m.get(s.id) || 0) + 1)); return m; }
    function render() {
      tShelf.innerHTML = `🏠 My shelf (${shelf.length})`;
      tStall.classList.toggle('sel', view === 'stall'); tShelf.classList.toggle('sel', view === 'shelf');
      body.innerHTML = '';
      if (view === 'stall') {
        const booth = el('div', 'f2-booth');
        booth.append(el('div', 'f2-awn'), el('div', 'f2-lights', '<i></i>'.repeat(9)));
        const grid = el('div', 'f2-grid'), have = R.tickets();
        PRIZES.forEach(p => {
          const b = el('button', `tile ${p.col} f2-prize${sel === p ? ' sel' : ''}${p.cost > have ? ' cant' : ''}`, `${prizeArt(p)}<span class="f2-tag">🎟 ${p.cost}</span>`);
          b.type = 'button'; b.setAttribute('aria-label', `${p.name}, ${p.cost} tickets`);
          b.onclick = () => { sel = p; tone(620 + p.cost * 12, .1, 'triangle', .1); render(); };
          grid.append(b);
        });
        booth.append(grid); body.append(booth);
        renderDetail();
      } else {
        const sh = el('div', 'f2-shelf'), m = counts();
        if (!shelf.length) sh.append(el('div', 'f2-empty', 'Your shelf is waiting for its first prize. Pick one at the stall!'));
        [...m.keys()].forEach(id => {
          const p = PRIZES.find(q => q.id === id); if (!p) return;
          const b = el('button', 'f2-item' + (fresh === id ? ' f2-new' : ''), prizeArt(p) + (m.get(id) > 1 ? `<em>×${m.get(id)}</em>` : ''));
          b.type = 'button'; b.setAttribute('aria-label', p.name);
          b.onclick = () => { wob(b); sel = p; [523, 659, 784].forEach((f, i) => tone(f, .14, 'sine', .1, i * .07)); renderDetail(); api.hint(`${p.name}. ${p.note}`); };
          sh.append(b);
        });
        fresh = null;
        body.append(sh);
        renderDetail();
      }
    }
    function renderDetail() {
      detail.innerHTML = '';
      if (!sel) {
        detail.append(el('div', 'grow', view === 'stall'
          ? `<h3>Roll up, roll up!</h3><p>Tap a prize to see it. You have ${R.tickets()} tickets to spend.</p>`
          : `<h3>My prize shelf</h3><p>${shelf.length ? `${shelf.length} prize${shelf.length === 1 ? '' : 's'} collected. Tap one to admire it.` : 'Win tickets at the fairground games, then choose a prize.'}</p>`));
        return;
      }
      const p = sel, have = R.tickets(), own = counts().get(p.id) || 0;
      const art = el('div', `tile ${p.col}`, prizeArt(p)); art.style.cssText = 'width:84px;height:84px;flex:none;border-radius:18px';
      const txt = el('div', 'grow', `<h3>${p.name}</h3><p>${p.note}${own ? ` You have ${own} on your shelf.` : ''}</p>`);
      detail.append(art, txt);
      if (view === 'stall') {
        const box = el('div', 'f2-buy');
        if (have >= p.cost) {
          const b = el('button', 'btn c-leaf', `Swap 🎟 ${p.cost}`); b.type = 'button';
          b.onclick = () => buy(p);
          box.append(b);
        } else {
          box.append(el('p', '', `You need ${p.cost - have} more.`));
        }
        txt.append(box);
        if (have < p.cost) api.hint(`Win more tickets at the fairground games! The ${p.name.toLowerCase()} costs ${p.cost} and you have ${have}.`);
        else api.hint(`${p.name} for ${p.cost} tickets. Tap “Swap” to take it home.`);
      }
    }
    function buy(p) {
      if (R.tickets() < p.cost) return;
      const total = R.tickets(-p.cost); tix.show();
      shelf.push({ id: p.id, t: Date.now() }); store.set('prizeShelf', shelf);
      fresh = p.id;
      [523, 659, 784, 1047].forEach((f, i) => tone(f, .18, 'sine', .14, i * .09));
      api.toast(`${p.name}! ${cheer()}`);
      api.hint(`Lovely! The ${p.name.toLowerCase()} is on your shelf. You have ${total} tickets left.`);
      view = 'shelf'; sel = p; render();
      wob(tShelf);
      api.later(() => { if (view === 'shelf') { view = 'stall'; sel = null; render(); api.hint(`You have ${R.tickets()} tickets. Pick another prize, or tap ✓ Done.`); } }, 3200);
    }

    render();
    api.hint(welcome + (R.tickets() ? `You have ${R.tickets()} tickets. Tap a prize to have a look.` : 'Win more tickets at the fairground games! Then come back for a prize.'));
  }
})();
