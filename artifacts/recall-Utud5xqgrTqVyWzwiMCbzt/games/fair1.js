/* Recall: Seaside Fairground 1. Hook a Duck, Coconut Shy, Skittles and Ring Toss.
   Plain canvas scenes with striped awnings, bunting and warm bulbs. Everything moves slowly,
   aiming is a single tap, and every round wins fairground tickets (R.tickets). */
(function () {
  const { register, el, pick, tone, sfx, cheer } = R;

  const W = 360, H = 380;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const ease = u => (u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
  const easeOut = u => 1 - Math.pow(1 - u, 3);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const lv = L => Math.max(1, Math.floor(+L || 1));
  const diffK = L => clamp((lv(L) - 1) / 14, 0, 1); // 0 at level 1, levels off at 15+
  const FONT = "'Fredoka', ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif";
  const CONF = ['#FF6B4A', '#FFC234', '#3CC46B', '#45AEFF', '#F25A95', '#A98BFF'];

  R.css(`
.fr-wrap{width:min(100%,470px);margin:0 auto;display:grid;gap:12px}
.fr-cv{display:block;width:100%;height:auto;aspect-ratio:360/380;border-radius:22px;touch-action:manipulation;cursor:pointer;
  background:#1E3F66;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;
  box-shadow:inset 0 0 0 4px rgba(255,255,255,.14),0 8px 0 #4A2B15,0 16px 28px rgba(0,0,0,.35)}
.fr-bar{display:flex;align-items:center;justify-content:space-between;gap:4px 14px;flex-wrap:wrap;min-height:56px;box-sizing:border-box;
  background:var(--card);color:var(--ink);border-radius:18px;padding:8px 16px;
  box-shadow:0 6px 0 var(--card-edge),0 10px 18px rgba(0,0,0,.25);font:600 1.25rem/1.25 var(--display)}
.fr-won{display:inline-block;color:var(--coral-d)}
.fr-won.fr-go{animation:fr-pop .6s ease-out}
.fr-tot{color:var(--ink-soft)}
.fr-tot b{color:var(--ink)}
@keyframes fr-pop{0%{transform:scale(.6)}55%{transform:scale(1.22)}100%{transform:scale(1)}}
`);

  /* ---------- little sounds ---------- */
  function noise(dur, freq, vol, q) {
    if (R.isMuted && R.isMuted()) return;
    try {
      const A = R.audio(); if (!A) return;
      const { ctx, bus } = A, n = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = b; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1; g.gain.value = vol;
      s.connect(f); f.connect(g); g.connect(bus); s.start();
    } catch (e) { /* sound is optional */ }
  }
  const jingle = n => { [988, 1319, 1568].slice(0, n >= 3 ? 3 : 2).forEach((f, i) => tone(f, .14, 'triangle', .09, i * .09)); };
  const splash = () => noise(.35, 900, .16, .8);
  const thud = () => { tone(150, .16, 'sine', .14); noise(.12, 300, .12, 1.2); };
  const clink = () => { tone(1480, .09, 'triangle', .07); tone(1960, .08, 'triangle', .05, .06); };

  /* ---------- shared fairground scene ---------- */
  function scene(api, total) {
    const wrap = el('div', 'fr-wrap'), cv = el('canvas', 'fr-cv'), ctx = cv.getContext('2d');
    const K = clamp((window.devicePixelRatio || 1) * 1.4, 1.5, 4);
    cv.width = Math.round(W * K); cv.height = Math.round(H * K);
    cv.setAttribute('role', 'img');
    const bar = el('div', 'fr-bar'), won = el('span', 'fr-won', '🎟 Win tickets!'), tot = el('span', 'fr-tot', '');
    bar.append(won, tot); wrap.append(cv, bar); api.stage.append(wrap);
    const S = { cv, ctx, t: 0, fx: [], won: 0, over: false, done: 0, total, update: null, draw: null, tap: null };
    cv._fr = S; // read by tests only
    const showTot = n => { tot.innerHTML = `Total <b>🎟 ${n}</b>`; };
    showTot(R.tickets());
    api.rounds(total, 0);

    S.float = (text, x, y, col, size) => S.fx.push({ k: 'txt', text, x, y, col: col || '#FFE27A', size: size || 28, t: 0, d: 1.7 });
    S.burst = (x, y, n) => { for (let i = 0; i < n; i++) S.fx.push({ k: 'sp', x, y, vx: rnd(-110, 110), vy: rnd(-190, -50), c: pick(CONF), t: 0, d: rnd(.8, 1.4), r: rnd(3, 6) }); };
    S.award = (n, x, y) => {
      n = Math.max(1, Math.round(n)); S.won += n;
      const all = R.tickets(n);
      won.textContent = `🎟 +${n} ticket${n === 1 ? '' : 's'}`;
      won.classList.remove('fr-go'); void won.offsetWidth; won.classList.add('fr-go');
      showTot(all);
      if (x != null) { S.float(`+${n} 🎟`, x, y); S.burst(x, y, 16); }
      jingle(n);
    };
    S.step = () => { S.done++; api.rounds(total, S.done); };
    S.finish = stars => {
      if (S.over) return; S.over = true;
      if (!S.won) S.award(1, W / 2, H / 2);
      const t = R.tickets();
      api.hint(`That's the round! You won ${S.won} tickets. You have ${t} tickets now.`);
      sfx.win();
      for (let i = 0; i < 4; i++) api.later(() => S.burst(rnd(60, 300), rnd(110, 220), 20), i * 260);
      api.later(() => api.done(clamp(stars, 1, 3)), 2100);
    };

    cv.addEventListener('pointerdown', e => {
      if (S.over || !S.tap) return;
      const r = cv.getBoundingClientRect(); if (!r.width) return;
      e.preventDefault();
      S.tap((e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H);
    });

    let last = performance.now();
    const frame = now => {
      if (!cv.isConnected) return; // player left: stop the loop
      const dt = clamp((now - last) / 1000, 0, .05); last = now; S.t += dt;
      if (S.update) S.update(dt);
      ctx.setTransform(K, 0, 0, K, 0, 0); ctx.clearRect(0, 0, W, H);
      if (S.draw) S.draw(ctx, S.t);
      drawFx(ctx, S, dt);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    return S;
  }

  function drawFx(ctx, S, dt) {
    S.fx = S.fx.filter(f => (f.t += dt) < f.d);
    S.fx.forEach(f => {
      const u = f.t / f.d, a = u < .6 ? 1 : 1 - (u - .6) / .4;
      ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
      if (f.k === 'sp') {
        f.vy += 320 * dt; f.x += f.vx * dt; f.y += f.vy * dt;
        ctx.fillStyle = f.c; ctx.translate(f.x, f.y); ctx.rotate(f.t * 6);
        ctx.fillRect(-f.r, -f.r * .6, f.r * 2, f.r * 1.2);
      } else {
        const s = u < .15 ? .6 + u / .15 * .4 : 1;
        ctx.font = `700 ${Math.round(f.size * s)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const y = f.y - 40 * easeOut(u);
        ctx.lineJoin = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(60,25,10,.85)'; ctx.strokeText(f.text, f.x, y);
        ctx.fillStyle = f.col; ctx.fillText(f.text, f.x, y);
      }
      ctx.restore();
    });
  }

  function backWall(ctx, top, bot, line) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = line; ctx.lineWidth = 2;
    for (let x = 30; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  }
  function poles(ctx) {
    [0, W - 12].forEach(x => {
      ctx.save(); ctx.beginPath(); ctx.rect(x, 0, 12, H); ctx.clip();
      ctx.fillStyle = '#FFF3DC'; ctx.fillRect(x, 0, 12, H);
      ctx.fillStyle = '#E8463A';
      for (let y = -20; y < H + 20; y += 22) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 12, y - 10); ctx.lineTo(x + 12, y); ctx.lineTo(x, y + 10); ctx.fill(); }
      ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(x + 8, 0, 4, H);
      ctx.restore();
    });
  }
  function awning(ctx, t, cols) {
    cols = cols || ['#E8463A', '#FFF3DC'];
    const top = 6, h = 30, sw = 36;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 5;
    for (let i = 0, x = 0; x < W; i++, x += sw) {
      ctx.fillStyle = cols[i % 2];
      ctx.beginPath(); ctx.rect(x, top, sw, h); ctx.arc(x + sw / 2, top + h, sw / 2, 0, Math.PI); ctx.fill();
    }
    ctx.restore();
    const g = ctx.createLinearGradient(0, top, 0, top + h + sw / 2);
    g.addColorStop(0, 'rgba(0,0,0,.2)'); g.addColorStop(.45, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(0,0,0,.14)');
    ctx.fillStyle = g;
    for (let x = 0; x < W; x += sw) { ctx.beginPath(); ctx.rect(x, top, sw, h); ctx.arc(x + sw / 2, top + h, sw / 2, 0, Math.PI); ctx.fill(); }
    ctx.fillStyle = '#5A361C'; ctx.fillRect(0, 0, W, 8); ctx.fillStyle = '#E9C67E'; ctx.fillRect(0, 6, W, 2);
    // warm bulbs under each scallop, twinkling slowly
    for (let i = 0, x = sw / 2; x < W; i++, x += sw) {
      const y = top + h + sw / 2 + 4, a = .7 + .3 * Math.sin(t * 1.4 + i * 1.9);
      const gl = ctx.createRadialGradient(x, y, 1, x, y, 16);
      gl.addColorStop(0, `rgba(255,230,150,${.75 * a})`); gl.addColorStop(1, 'rgba(255,200,90,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, 16, 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(255,${210 + 35 * a | 0},${120 + 60 * a | 0},1)`; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.fill();
    }
  }
  function bunting(ctx, t, y0, sag) {
    const ys = x => y0 + sag * Math.sin(Math.PI * x / W);
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2;
    ctx.beginPath(); for (let x = 0; x <= W; x += 10) x ? ctx.lineTo(x, ys(x)) : ctx.moveTo(x, ys(x)); ctx.stroke();
    for (let i = 0, x = 16; x < W - 8; i++, x += 26) {
      const y = ys(x), sw = Math.sin(t * 1.1 + i * .8) * .12;
      ctx.save(); ctx.translate(x, y); ctx.rotate(sw);
      ctx.fillStyle = CONF[i % CONF.length];
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.lineTo(0, 18); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(0, 0); ctx.lineTo(0, 18); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function sign(ctx, text, x, y, size, bg, fg) {
    ctx.font = `700 ${size}px ${FONT}`; const w = ctx.measureText(text).width + size * 1.1, h = size * 1.6;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; roundRect(ctx, x - w / 2, y - h / 2 + 4, w, h, h / 2.6); ctx.fill();
    ctx.fillStyle = bg; roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2.6); ctx.fill();
    ctx.strokeStyle = '#E9C67E'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + 1);
  }

  /* =========================================================
     1. HOOK A DUCK
     ========================================================= */
  const PRIZES = [1, 1, 2, 2, 2, 3, 3, 4, 5];
  const NUMCOL = { 1: '#3CC46B', 2: '#45AEFF', 3: '#A98BFF', 4: '#FF9A3C', 5: '#F25A95' };

  function drawDuck(ctx, x, y, s, face, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * face, s);
    ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = '#B07800';
    ctx.fillStyle = '#EFE4C8'; ctx.beginPath(); ctx.ellipse(0, 12, 20, 6, 0, 0, 7); ctx.fill(); ctx.stroke(); // base
    ctx.fillStyle = '#FFD23A';
    ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-34, -14); ctx.lineTo(-16, -6); ctx.closePath(); ctx.fill(); ctx.stroke(); // tail
    ctx.beginPath(); ctx.ellipse(0, 2, 26, 14, 0, 0, 7); ctx.fill(); ctx.stroke(); // body
    ctx.beginPath(); ctx.arc(14, -16, 12, 0, 7); ctx.fill(); ctx.stroke(); // head
    ctx.fillStyle = '#FFE780'; ctx.beginPath(); ctx.ellipse(-6, -4, 11, 5, -.2, 0, 7); ctx.fill();
    ctx.fillStyle = '#F2B81C'; ctx.beginPath(); ctx.ellipse(-4, 3, 12, 6, .15, 0, 7); ctx.fill();
    ctx.fillStyle = '#FF8A2A'; ctx.strokeStyle = '#C45A10'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(28, -13, 7, 4, .1, 0, 7); ctx.fill(); ctx.stroke(); // beak
    ctx.fillStyle = '#1B1B1B'; ctx.beginPath(); ctx.arc(17, -19, 2.8, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(18, -20, 1, 0, 7); ctx.fill();
    ctx.strokeStyle = '#9AA1AB'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(12, -32, 5, 0, 7); ctx.stroke(); // hook ring
    ctx.restore();
  }
  function badge(ctx, x, y, n, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.arc(0, 3, 20, 0, 7); ctx.fill();
    ctx.fillStyle = NUMCOL[n] || '#FF6B4A'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
    ctx.font = `700 26px ${FONT}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(n, 0, 1);
    ctx.restore();
  }

  function startDuck(level, api) {
    const L = lv(level), k = diffK(L);
    const total = L >= 10 ? 8 : L >= 4 ? 7 : 6;
    const S = scene(api, total);
    const cx = 180, cy = 268, rx = 136, ry = 62;
    const speed = .2 + .22 * k, hitR = 56 - 14 * k, nD = 7;
    const ducks = [...Array(nD)].map((_, i) => ({ a: i / nD * Math.PI * 2 + .2, ph: rnd(0, 6), num: pick(PRIZES), lift: 0, flip: 0, busy: false, x: 0, y: 0, s: 1, face: 1 }));
    const IDLE = [292, 122];
    const rod = { x: IDLE[0], y: IDLE[1], line: 40 };
    let job = null, misses = 0;
    const SHOW = [180, 132];

    const place = d => {
      const a = d.a, ox = cx + rx * Math.cos(a), oy = cy + ry * Math.sin(a) + Math.sin(S.t * 2 + d.ph) * 3;
      const ps = .78 + .28 * (Math.sin(a) + 1) / 2;
      const e = ease(d.lift);
      d.x = lerp(ox, SHOW[0], e); d.y = lerp(oy, SHOW[1], e); d.s = lerp(ps, 1.25, e);
      const f = -Math.sin(a) * 3; d.face = d.lift > 0 ? 1 : (f < 0 ? -1 : 1) * Math.max(.4, Math.min(1, Math.abs(f)));
    };
    ducks.forEach(place);
    api.hint('Tap a duck as it floats by to hook it. Every duck wins!');
    S._tgt = () => { const d = ducks.filter(d => !d.busy && Math.sin(d.a) > 0)[0]; return job || !d ? null : [d.x, d.y - 6]; };

    S.tap = (x, y) => {
      if (job) return;
      let best = null, bd = 1e9;
      ducks.forEach(d => { if (d.busy) return; const dd = Math.hypot(x - d.x, y - (d.y - 6)); if (dd < bd) { bd = dd; best = d; } });
      if (!best || bd > hitR * 1.6) {
        if (y > 170) { misses++; sfx.soft(); api.hint('Nearly! Tap right on a yellow duck.'); }
        return;
      }
      sfx.tap(); best.busy = true; job = { d: best, ph: 'reach', t: 0 };
      api.hint('Got it on the hook…');
    };

    S.update = dt => {
      ducks.forEach(d => { d.a += speed * dt; place(d); });
      if (!job) {
        rod.x = lerp(rod.x, IDLE[0], dt * 3); rod.y = lerp(rod.y, IDLE[1] + Math.sin(S.t) * 4, dt * 3); rod.line = lerp(rod.line, 40, dt * 3);
        return;
      }
      const d = job.d; job.t += dt;
      if (job.ph === 'reach') {
        const u = clamp(job.t / .6, 0, 1), ringY = d.y - 32 * d.s;
        rod.x = lerp(rod.x, d.x + 10 * d.face * d.s, clamp(dt * 10, 0, 1)); rod.y = lerp(rod.y, ringY - 70, clamp(dt * 10, 0, 1)); rod.line = lerp(40, ringY - rod.y, ease(u));
        if (u >= 1) { job.ph = 'lift'; job.t = 0; splash(); tone(520, .2, 'sine', .1); }
      } else if (job.ph === 'lift') {
        const u = clamp(job.t / .9, 0, 1); d.lift = u;
        rod.x = d.x + 10 * d.face * d.s; rod.line = 40; rod.y = d.y - 32 * d.s - rod.line;
        if (u >= 1) { job.ph = 'show'; job.t = 0; }
      } else if (job.ph === 'show') {
        d.flip = clamp(job.t / .5, 0, 1);
        rod.x = lerp(rod.x, IDLE[0], dt * 3); rod.y = lerp(rod.y, IDLE[1], dt * 3);
        if (!job.paid && job.t > .5) {
          job.paid = true; S.award(d.num, SHOW[0], SHOW[1] - 40); S.step();
          api.hint(`Number ${d.num}! ${d.num === 1 ? 'That wins 1 ticket.' : `That wins ${d.num} tickets.`} ${cheer()}`);
        }
        if (job.t > 1.9) { job.ph = 'back'; job.t = 0; }
      } else if (job.ph === 'back') {
        const u = clamp(job.t / .9, 0, 1); d.lift = 1 - u; d.flip = 1 - clamp(job.t / .4, 0, 1);
        if (u >= 1) {
          splash(); d.busy = false; d.lift = 0; d.flip = 0; d.num = pick(PRIZES); job = null;
          if (S.done >= total) S.finish(misses <= 2 ? 3 : misses <= 5 ? 2 : 1);
          else api.hint(`Tap another duck. ${total - S.done} go${total - S.done === 1 ? '' : 'es'} left.`);
        }
      }
    };

    S.draw = (ctx, t) => {
      backWall(ctx, '#2C6FA3', '#123E63', 'rgba(255,255,255,.06)');
      // prize shelf
      ctx.fillStyle = '#7A4A28'; ctx.fillRect(14, 140, W - 28, 10); ctx.fillStyle = '#4A2B15'; ctx.fillRect(14, 150, W - 28, 5);
      ctx.font = `30px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ['🧸', '🎈', '🐠', '🍭', '🪀', '🧸', '🎁'].forEach((e, i) => ctx.fillText(e, 40 + i * 46.5, 138 + Math.sin(t * .8 + i) * 1.2));
      poles(ctx); awning(ctx, t); bunting(ctx, t, 74, 14);
      // the stream
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(cx, cy + 10, rx + 36, ry + 32, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#E8463A'; ctx.beginPath(); ctx.ellipse(cx, cy, rx + 36, ry + 32, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#FFF3DC'; ctx.lineWidth = 5; ctx.setLineDash([16, 16]); ctx.beginPath(); ctx.ellipse(cx, cy, rx + 31, ry + 27, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      const wg = ctx.createLinearGradient(0, cy - ry - 24, 0, cy + ry + 24); wg.addColorStop(0, '#5CC8F0'); wg.addColorStop(1, '#2A93D0');
      ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(cx, cy, rx + 24, ry + 22, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2.5;
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2 + t * speed, r2 = i % 2 ? 12 : -10;
        const x = cx + (rx + r2) * Math.cos(a), y = cy + (ry + r2 * .5) * Math.sin(a);
        ctx.beginPath(); ctx.arc(x, y, 7, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      }
      const order = ducks.filter(d => !d.lift).sort((a, b) => a.y - b.y);
      const back = order.filter(d => Math.sin(d.a) < 0), front = order.filter(d => Math.sin(d.a) >= 0);
      back.forEach(d => drawDuck(ctx, d.x, d.y, d.s, d.face, Math.sin(t * 2 + d.ph) * .05));
      // island with sign
      ctx.fillStyle = '#C46512'; ctx.beginPath(); ctx.ellipse(cx, cy + 4, rx - 38, ry - 26, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#FF9A3C'; ctx.beginPath(); ctx.ellipse(cx, cy, rx - 38, ry - 26, 0, 0, 7); ctx.fill();
      ctx.font = `700 19px ${FONT}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Every duck wins!', cx, cy);
      front.forEach(d => drawDuck(ctx, d.x, d.y, d.s, d.face, Math.sin(t * 2 + d.ph) * .05));
      // fishing pole and line
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#4A2B15'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(372, 396); ctx.lineTo(rod.x, rod.y); ctx.stroke();
      ctx.strokeStyle = '#B9874B'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(372, 396); ctx.lineTo(rod.x, rod.y); ctx.stroke();
      const hy = rod.y + rod.line;
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(rod.x, rod.y); ctx.lineTo(rod.x, hy); ctx.stroke();
      ctx.strokeStyle = '#D9DEE5'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(rod.x - 5, hy, 5, 0, Math.PI); ctx.stroke();
      // the hooked duck, lifted and turned over to show its number
      ducks.filter(d => d.lift > 0).forEach(d => {
        const rot = d.flip * Math.PI;
        drawDuck(ctx, d.x, d.y, d.s, d.face, rot + Math.sin(t * 3) * .04 * (1 - d.flip));
        if (d.flip > .5) badge(ctx, d.x, d.y - 12 * d.s, d.num, d.s * (d.flip - .5) * 2);
      });
      ctx.lineCap = 'butt';
    };
  }

  /* =========================================================
     2. COCONUT SHY
     ========================================================= */
  function drawCoconut(ctx, x, y, rot, gold, seed) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const g = ctx.createRadialGradient(-7, -8, 3, 0, 0, 23); g.addColorStop(0, '#A8703A'); g.addColorStop(1, '#4A2B15');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 21, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(40,20,8,.6)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 16; i++) { const a = i * 2.4 + seed + (i % 3), r = 4 + (i * 7 % 15); ctx.beginPath(); ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); ctx.lineTo(Math.cos(a + .3) * (r + 5), Math.sin(a + .3) * (r + 5)); ctx.stroke(); }
    ctx.fillStyle = '#2A1608'; [[-6, -5], [5, -5], [0, 4]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(a, b, 2.6, 0, 7); ctx.fill(); });
    if (gold) {
      ctx.fillStyle = '#FFC234'; ctx.strokeStyle = '#C28A00'; ctx.lineWidth = 2;
      ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 5 : 11; ctx.lineTo(Math.cos(a) * r, -12 + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  function startCoconut(level, api) {
    const L = lv(level), k = diffK(L);
    const nC = L >= 6 ? 5 : L >= 3 ? 4 : 3, balls = nC + 3;
    const S = scene(api, balls);
    const baseR = 64 - 28 * k, sway = L >= 5 ? 5 + 9 * k : 0;
    const goldI = L >= 3 ? Math.floor(Math.random() * nC) : -1;
    const span = nC === 3 ? [80, 280] : [48, 312];
    const nuts = [...Array(nC)].map((_, i) => ({
      x0: lerp(span[0], span[1], i / (nC - 1)), x: 0, y: 176 + (i % 2) * 24 + rnd(-5, 5), ph: rnd(0, 6), seed: rnd(0, 6),
      st: 'up', t: 0, rot: 0, vx: 0, vy: 0, gold: i === goldI
    }));
    nuts.forEach(n => { n.x = n.x0; n.py = n.y; });
    let ball = null, used = 0, help = 0, misses = 0, down = 0;
    api.hint('Tap a coconut to throw a ball at it.');
    S._tgt = () => { const n = nuts.find(n => n.st === 'up'); return ball || !n ? null : [n.x, n.y]; };

    S.tap = (x, y) => {
      if (ball || used >= balls) return;
      sfx.tap(); noise(.2, 1600, .06, .7);
      used++; S.step();
      ball = { st: 'fly', u: 0, tx: clamp(x, 20, W - 20), ty: clamp(y, 90, 300), x: 180, y: 360, r: 15, vx: 0, vy: 0, a: 1 };
    };
    const afterBall = () => {
      ball = null;
      if (down === nC) {
        S.award(2, 180, 140); api.hint('You knocked them all down! Bonus tickets!');
        return S.finish(3);
      }
      if (used >= balls) return S.finish(down * 2 >= nC ? 2 : 1);
      if (!S.over) api.hint(`Tap a coconut to throw. ${balls - used} ball${balls - used === 1 ? '' : 's'} left.`);
    };

    S.update = dt => {
      nuts.forEach(n => {
        if (n.st === 'up') { n.x = n.x0 + sway * Math.sin(S.t * .55 + n.ph); }
        else if (n.st === 'wob') { n.t += dt; n.rot = Math.sin(n.t * 22) * .3 * (1 - n.t / .7); if (n.t > .7) { n.st = 'fall'; n.vy = -90; n.vx = rnd(-30, 30); } }
        else if (n.st === 'fall') { n.vy += 700 * dt; n.y += n.vy * dt; n.x += n.vx * dt; n.rot += n.vx * .02 * dt + dt * 2; if (n.y > 330 && !n.thud) { n.thud = 1; thud(); } if (n.y > 420) n.st = 'gone'; }
      });
      if (!ball) return;
      if (ball.st === 'fly') {
        ball.u = Math.min(1, ball.u + dt / .8);
        const u = ball.u;
        ball.x = lerp(180, ball.tx, u); ball.y = lerp(360, ball.ty, u) - 120 * 4 * u * (1 - u); ball.r = lerp(15, 10, u);
        if (u >= 1) {
          let hit = null, bd = 1e9;
          nuts.forEach(n => { if (n.st !== 'up') return; const d = Math.hypot(ball.tx - n.x, ball.ty - n.y); if (d < bd) { bd = d; hit = n; } });
          if (hit && bd < baseR + help) {
            hit.st = 'wob'; hit.t = 0; down++;
            tone(200, .12, 'square', .06); tone(130, .2, 'sine', .14, .02);
            const v = hit.gold ? 5 : 3; S.award(v, hit.x, hit.y - 30);
            api.hint(hit.gold ? 'The golden coconut! 5 tickets!' : `${cheer()} Down it goes!`);
            ball.st = 'bounce'; ball.vx = (ball.x - hit.x) * 5 + rnd(-40, 40); ball.vy = -160;
          } else {
            misses++; help = Math.min(48, help + 16); sfx.soft();
            api.hint('Nearly! Aim right at a coconut.');
            ball.st = 'bounce'; ball.vx = rnd(-20, 20); ball.vy = 20;
          }
        }
      } else {
        ball.vy += 700 * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.a = Math.max(0, ball.a - dt * 1.2);
        if (ball.y > 400 || ball.a <= 0) afterBall();
      }
    };

    S.draw = (ctx, t) => {
      backWall(ctx, '#2F6E4E', '#1D4733', 'rgba(0,0,0,.12)');
      ctx.fillStyle = 'rgba(255,255,255,.05)'; for (let x = 10; x < W; x += 40) ctx.fillRect(x, 0, 14, H);
      poles(ctx); awning(ctx, t, ['#FFC234', '#FFF3DC']); bunting(ctx, t, 74, 12);
      sign(ctx, '3 tickets a coconut', 180, 112, 18, '#C4432A', '#fff');
      // posts
      nuts.forEach(n => {
        const px = n.st === 'up' || n.st === 'wob' ? n.x : n.x0 + sway * Math.sin(S.t * .55 + n.ph), top = n.py + 18;
        ctx.save(); ctx.beginPath(); ctx.rect(px - 6, top, 12, 310 - top); ctx.clip();
        ctx.fillStyle = '#FFF3DC'; ctx.fillRect(px - 6, top, 12, 310 - top); ctx.fillStyle = '#E8463A';
        for (let y = top; y < 310; y += 20) ctx.fillRect(px - 6, y, 12, 10);
        ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(px + 2, top, 4, 310 - top); ctx.restore();
        ctx.fillStyle = '#C9822B'; ctx.beginPath(); ctx.ellipse(px, top, 15, 6, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = '#7A4A28'; ctx.lineWidth = 2; ctx.stroke();
      });
      nuts.forEach(n => { if (n.st !== 'gone') drawCoconut(ctx, n.x, n.y, n.rot, n.gold, n.seed); });
      // counter
      ctx.fillStyle = '#7A4A28'; ctx.fillRect(0, 300, W, 18); ctx.fillStyle = '#A8693A'; ctx.fillRect(0, 300, W, 5);
      for (let x = 0, i = 0; x < W; x += 30, i++) { ctx.fillStyle = i % 2 ? '#FFF3DC' : '#E8463A'; ctx.fillRect(x, 318, 30, H - 318); }
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, 318, W, 6);
      // balls waiting in a little pile
      const left = balls - used;
      ctx.fillStyle = '#7A4A28'; roundRect(ctx, 22, 342, 84, 30, 10); ctx.fill(); ctx.fillStyle = '#A8693A'; ctx.fillRect(26, 350, 76, 4); ctx.fillRect(26, 360, 76, 4);
      for (let i = 0; i < left - (ball ? 0 : 1); i++) {
        const bx = 36 + (i % 4) * 18 + (i >= 4 ? 9 : 0), by = 340 - (i >= 4 ? 13 : 0);
        ctx.fillStyle = '#F5F0E6'; ctx.beginPath(); ctx.arc(bx, by, 9, 0, 7); ctx.fill(); ctx.strokeStyle = '#B9B2A2'; ctx.lineWidth = 2; ctx.stroke();
      }
      // the ball in hand
      if (!ball && used < balls && !S.over) {
        const by = 356 + Math.sin(t * 2) * 3;
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(180, 372, 16, 5, 0, 0, 7); ctx.fill();
        drawBall(ctx, 180, by, 15, 1);
      }
      if (ball) drawBall(ctx, ball.x, ball.y, ball.r, ball.a);
    };
    function drawBall(ctx, x, y, r, a) {
      ctx.save(); ctx.globalAlpha = a;
      const g = ctx.createRadialGradient(x - r * .35, y - r * .35, 1, x, y, r); g.addColorStop(0, '#fff'); g.addColorStop(1, '#D5CDBC');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.strokeStyle = '#9C9483'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
  }

  /* =========================================================
     3. SKITTLES
     ========================================================= */
  function startSkittles(level, api) {
    const L = lv(level), k = diffK(L);
    const S = scene(api, 6);
    const HALF = 100, LEN = 600, rp = 8, rb = 22 - 8 * k, V = 330;
    const amp = .07 + .2 * k, om = 1 + .6 * k, slack = 7 - 3 * k;
    const proj = (X, Y) => { const d = Y / LEN, sc = 1 - .42 * d; return [180 + X * sc * 1.15, 372 - 268 * d, sc]; };
    let pins = [], ball, phase = 'aim', aimT = 0, theta = 0, frame = 0, bnum = 0, ph = 0, total = 0, floored = false, lastClack = 0;
    const rack = () => {
      pins = [];
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) pins.push({ x: (i - j) * 26, y: 480 + (i + j) * 26, vx: 0, vy: 0, down: false, counted: false, fallT: 0, la: 0, lf: 1, gone: false, alpha: 1, pop: 0 });
    };
    const newBall = () => { ball = { x: 0, y: 40, vx: 0, vy: 0, live: false }; };
    rack(); newBall();
    const aimHint = () => api.hint(`Frame ${frame + 1} of 3, ball ${bnum + 1}. Tap to bowl when the arrow points at the pins.`);
    aimHint();

    S._tgt = () => (phase === 'aim' && Math.abs(theta) < amp * .3 ? [180, 250] : null);
    const knock = p => {
      if (p.down) return;
      p.down = true; p.fallT = 0;
      const sp = Math.hypot(p.vx, p.vy) || 1, fa = Math.atan2(p.vy / sp, p.vx / sp);
      const a = proj(p.x, p.y), b = proj(p.x + Math.cos(fa) * 10, p.y + Math.sin(fa) * 10);
      p.la = Math.atan2(b[1] - a[1], b[0] - a[0]); p.lf = .55 + .45 * Math.abs(Math.cos(p.la));
      if (S.t - lastClack > .05) { lastClack = S.t; tone(rnd(650, 900), .07, 'square', .04); noise(.08, 2200, .05, 2); }
    };
    function phys(dt) {
      if (ball.live) {
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        if (Math.abs(ball.x) > HALF - rb) { ball.x = Math.sign(ball.x) * (HALF - rb); ball.vx = -ball.vx * .6; tone(160, .08, 'sine', .08); }
        pins.forEach(p => {
          if (p.gone) return;
          const dx = p.x - ball.x, dy = p.y - ball.y, d = Math.hypot(dx, dy);
          if (d < rb + rp && d > 0) {
            const nx = dx / d, ny = dy / d, vn = ball.vx * nx + ball.vy * ny;
            p.x = ball.x + nx * (rb + rp); p.y = ball.y + ny * (rb + rp);
            if (vn > 0) {
              p.vx += nx * vn * 1.3 + ball.vx * .2; p.vy += ny * vn * 1.3 + ball.vy * .2;
              ball.vx -= nx * vn * .22; ball.vy -= ny * vn * .22;
              knock(p);
            }
          }
        });
        if (ball.y > LEN + 40 || Math.hypot(ball.vx, ball.vy) < 25) ball.live = false;
      }
      const fr = Math.exp(-1.9 * dt);
      pins.forEach(p => {
        if (p.gone) return;
        p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= fr; p.vy *= fr;
        if (Math.abs(p.x) > HALF - rp) { p.x = Math.sign(p.x) * (HALF - rp); p.vx = -p.vx * .5; }
        if (p.y > LEN - 10) { p.vx = p.vy = 0; p.y = LEN - 10; }
      });
      for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++) {
        const a = pins[i], b = pins[j]; if (a.gone || b.gone) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || .01;
        if (d > 2 * rp + slack) continue;
        const nx = dx / d, ny = dy / d, rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (rv > 15) {
          a.vx -= nx * rv * .9; a.vy -= ny * rv * .9; b.vx += nx * rv * .9; b.vy += ny * rv * .9;
          knock(a); knock(b);
        }
        if (d < 2 * rp) { const o = (2 * rp - d) / 2; a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o; }
      }
    }
    function score() {
      const now = pins.filter(p => p.down && !p.counted); now.forEach(p => { p.counted = true; });
      const n = now.length; total += n;
      floored = bnum === 0 && pins.every(p => p.down);
      S.step();
      if (floored) { S.award(n + 3, 180, 140); api.hint(`All nine down! ${cheer()} That's ${n + 3} tickets with the bonus.`); }
      else if (n) { S.award(n, 180, 140); api.hint(`${n} pin${n === 1 ? '' : 's'} down! ${n >= 5 ? cheer() : 'Lovely.'}`); }
      else { sfx.soft(); api.hint('Nearly! The ball slipped past. Have another go.'); }
      phase = 'clear'; ph = 0;
    }
    function next() {
      const done = frame * 2 + bnum + 1;
      if (done >= 6) { phase = 'end'; return S.finish(total >= 18 ? 3 : total >= 9 ? 2 : 1); }
      if (bnum === 0) { bnum = 1; if (floored) rack(); else pins = pins.filter(p => !p.down); }
      else { bnum = 0; frame++; rack(); }
      newBall(); phase = 'aim'; aimT = 0; aimHint();
    }

    S.tap = () => {
      if (phase !== 'aim') return;
      ball.vx = V * Math.sin(theta); ball.vy = V * Math.cos(theta); ball.live = true;
      phase = 'roll'; ph = 0; sfx.tap(); noise(1.3, 180, .1, .7);
      api.hint('Rolling…');
    };
    S.update = dt => {
      pins.forEach(p => { if (p.pop < 1) p.pop = Math.min(1, p.pop + dt * 2.5); if (p.down && p.fallT < 1) p.fallT = Math.min(1, p.fallT + dt * 2.6); });
      if (phase === 'aim') { aimT += dt; theta = amp * Math.sin(om * aimT); }
      else if (phase === 'roll') {
        for (let i = 0; i < 4; i++) phys(dt / 4);
        ph += dt;
        const still = !ball.live && pins.every(p => p.gone || Math.hypot(p.vx, p.vy) < 4);
        if (still || ph > 7) { phase = 'settle'; ph = 0; }
      } else if (phase === 'settle') { ph += dt; if (ph > .6) score(); }
      else if (phase === 'clear') { ph += dt; pins.forEach(p => { if (p.down) p.alpha = Math.max(0, 1 - ph / .8); }); if (ph > 1.2) next(); }
    };

    function pinShape(ctx, h, w, stroke) {
      const parts = () => {
        ctx.beginPath(); ctx.ellipse(0, -.3 * h, .5 * w, .3 * h, 0, 0, 7); ctx.rect(-.16 * w, -.72 * h, .32 * w, .45 * h); ctx.ellipse(0, -.82 * h, .27 * w, .18 * h, 0, 0, 7);
      };
      if (stroke) { ctx.strokeStyle = '#5A3B2A'; ctx.lineWidth = 3; parts(); ctx.stroke(); }
      ctx.fillStyle = '#FFFDF6'; parts(); ctx.fill();
      ctx.fillStyle = '#E8463A'; ctx.fillRect(-.2 * w, -.66 * h, .4 * w, .05 * h); ctx.fillRect(-.2 * w, -.58 * h, .4 * w, .05 * h);
      ctx.fillStyle = 'rgba(120,100,80,.18)'; ctx.beginPath(); ctx.ellipse(.18 * w, -.3 * h, .22 * w, .26 * h, 0, 0, 7); ctx.fill();
    }
    function drawPin(ctx, p) {
      const [sx, sy, sc] = proj(p.x, p.y), sp = p.pop < 1 ? easeOut(p.pop) * (1 + .15 * Math.sin(p.pop * Math.PI)) : 1;
      const h = 60 * sc * sp, w = 23 * sc * sp, up = -Math.PI / 2;
      let dA = p.la - up; while (dA > Math.PI) dA -= 2 * Math.PI; while (dA < -Math.PI) dA += 2 * Math.PI;
      const e = ease(p.fallT), ang = up + dA * e, lf = lerp(1, p.lf, e);
      ctx.save(); ctx.globalAlpha = p.alpha;
      ctx.fillStyle = 'rgba(40,20,5,.25)'; ctx.beginPath(); ctx.ellipse(sx, sy, w * .6, w * .22, 0, 0, 7); ctx.fill();
      ctx.translate(sx, sy - e * 4 * sc); ctx.rotate(ang + Math.PI / 2); ctx.scale(1, lf);
      pinShape(ctx, h, w, true);
      ctx.restore();
    }
    S.draw = (ctx, t) => {
      backWall(ctx, '#6B3E22', '#3E2412', 'rgba(0,0,0,.18)');
      poles(ctx); awning(ctx, t, ['#45AEFF', '#FFF3DC']);
      // alley
      const P = (x, y) => proj(x, y);
      const quad = (x0, x1, y0, y1, fill) => { const a = P(x0, y0), b = P(x1, y0), c = P(x1, y1), d = P(x0, y1); ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill(); };
      quad(-HALF - 18, HALF + 18, -20, LEN, '#4A2B15');
      const lg = ctx.createLinearGradient(0, 104, 0, 380); lg.addColorStop(0, '#C98E52'); lg.addColorStop(1, '#EBC089');
      quad(-HALF, HALF, -20, LEN - 30, lg);
      quad(-HALF, HALF, LEN - 30, LEN, '#2A170A');
      ctx.strokeStyle = 'rgba(150,95,45,.45)'; ctx.lineWidth = 1.5;
      for (let x = -75; x <= 75; x += 25) { const a = P(x, -20), b = P(x, LEN - 30); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      ctx.strokeStyle = '#E8463A'; ctx.lineWidth = 3; { const a = P(-HALF, 75), b = P(HALF, 75); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      // padded back cushion
      { const a = P(-HALF - 18, LEN), b = P(HALF + 18, LEN); ctx.fillStyle = '#C4432A'; roundRect(ctx, a[0], a[1] - 16, b[0] - a[0], 18, 6); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(a[0] + 4, a[1] - 13, b[0] - a[0] - 8, 3); }
      bunting(ctx, t, 62, 10);
      // pins and ball, far ones first
      const items = pins.filter(p => !p.gone && p.alpha > 0).map(p => ({ y: p.y, f: () => drawPin(ctx, p) }));
      if (phase !== 'end' && ball.y < LEN + 30) items.push({ y: ball.y, f: () => {
        const [bx, by, sc] = proj(ball.x, ball.y), r = rb * sc * 1.15;
        ctx.fillStyle = 'rgba(30,15,5,.3)'; ctx.beginPath(); ctx.ellipse(bx, by, r, r * .3, 0, 0, 7); ctx.fill();
        const g = ctx.createRadialGradient(bx - r * .35, by - r * 1.35, 1, bx, by - r, r); g.addColorStop(0, '#B07A4A'); g.addColorStop(1, '#4A2410');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by - r, r, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(255,220,170,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by - r, r * .62, 0, 7); ctx.stroke();
      } });
      items.sort((a, b) => b.y - a.y).forEach(i => i.f());
      // swinging aim arrow
      if (phase === 'aim') {
        const a = P(0, 70), b = P(Math.sin(theta) * 280, 70 + Math.cos(theta) * 280);
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), len = Math.hypot(b[0] - a[0], b[1] - a[1]), pulse = 1 + .06 * Math.sin(t * 5);
        ctx.save(); ctx.translate(a[0], a[1]); ctx.rotate(ang); ctx.scale(pulse, pulse);
        ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(len - 26, -7); ctx.lineTo(len - 26, -17); ctx.lineTo(len, 0); ctx.lineTo(len - 26, 17); ctx.lineTo(len - 26, 7); ctx.lineTo(0, 7); ctx.closePath();
        ctx.fillStyle = '#FFC234'; ctx.fill(); ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.stroke();
        ctx.restore();
      }
      // frame scoreboard
      ctx.font = `700 18px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(30,15,5,.6)'; roundRect(ctx, 16, 330, 96, 38, 12); ctx.fill();
      ctx.fillStyle = '#FFE27A'; ctx.fillText(`Pins ${total}`, 26, 349);
    };
  }

  /* =========================================================
     4. RING TOSS
     ========================================================= */
  const GLASS = [['#3BA55C', '#1F6E38'], ['#C9822B', '#7E4E14'], ['#3F86D1', '#1F528A']];
  const HOOPS = ['#FF6B4A', '#FFC234', '#45AEFF', '#F25A95', '#3CC46B'];

  function startRing(level, api) {
    const L = lv(level), k = diffK(L);
    const total = L >= 9 ? 8 : L >= 4 ? 7 : 6;
    const S = scene(api, total);
    const ROWS = [
      { base: 206, sc: .85, val: 5, xs: [110, 180, 250] },
      { base: 260, sc: 1, val: 3, xs: [72, 144, 216, 288] },
      { base: 318, sc: 1.15, val: 2, xs: [95, 180, 265] }
    ];
    const bottles = [];
    ROWS.forEach((r, ri) => r.xs.forEach((x, i) => bottles.push({ x, base: r.base, sc: r.sc, val: r.val, row: ri, g: GLASS[(i + ri) % 3], rings: [], h: 74 * r.sc })));
    const pBase = .92 - .42 * k;
    let hoop = null, thrown = 0, rings = 0, streak = 0;
    api.hint('Tap a bottle to toss a hoop over it.');

    S._tgt = () => { if (hoop) return null; const b = pick(bottles); return [b.x, b.base - b.h * .5]; };
    S.tap = (x, y) => {
      if (hoop || thrown >= total) return;
      let best = null, bd = 1e9;
      bottles.forEach(b => { const d = Math.hypot(x - b.x, y - (b.base - b.h * .5)); if (d < bd) { bd = d; best = b; } });
      if (!best || bd > 58) { api.hint('Tap a bottle to toss a hoop over it.'); return; }
      const p = pBase - (best.row === 0 ? .06 * k : 0);
      const win = streak >= 2 || Math.random() < p;
      thrown++; S.step(); sfx.tap(); noise(.25, 1200, .05, .6);
      hoop = { b: best, win, st: 'fly', u: 0, x: 180, y: 360, rx: 26, spin: 0, c: HOOPS[thrown % HOOPS.length], tx: best.x, ty: best.base - best.h - 6, vx: 0, vy: 0, a: 1, tilt: 0 };
      api.hint('Up it goes…');
    };
    const after = () => {
      hoop = null;
      if (thrown >= total) { const r = rings / total; return S.finish(r >= .6 ? 3 : r >= .3 ? 2 : 1); }
      api.hint(`Tap a bottle to toss. ${total - thrown} hoop${total - thrown === 1 ? '' : 's'} left.`);
    };

    S.update = dt => {
      bottles.forEach(b => b.rings.forEach(r => { if (r.u < 1) { r.u = Math.min(1, r.u + dt / .5); if (r.u >= 1) { tone(320, .12, 'triangle', .1); } } }));
      if (!hoop) return;
      const h = hoop, b = h.b;
      if (h.st === 'fly') {
        h.u = Math.min(1, h.u + dt / .95); const u = h.u;
        h.x = lerp(180, h.tx, u); h.y = lerp(360, h.ty, u) - 130 * 4 * u * (1 - u); h.rx = lerp(26, 18 * b.sc, u); h.spin += dt * 9;
        if (u >= 1) {
          if (h.win) {
            b.rings.push({ c: h.c, u: 0 }); rings++; streak = 0; clink();
            S.award(b.val, b.x, b.base - b.h - 20);
            api.hint(`Ringed it! ${cheer()} ${b.val} tickets.`);
            h.st = 'gone'; api.later(after, 900);
          } else {
            streak++; clink();
            h.st = 'bounce'; h.vx = (b.x < 180 ? -1 : 1) * rnd(60, 100); h.vy = -170; h.tilt = 0;
            api.hint('Nearly! It bounced off the rim. Have another go.');
          }
        }
      } else if (h.st === 'bounce') {
        h.vy += 650 * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.tilt += h.vx * .01 * dt * 6; h.spin += dt * 6;
        if (h.y > b.base + 10) h.a = Math.max(0, h.a - dt * 2);
        if (h.a <= 0 || h.y > 420) after();
      }
    };

    function bottlePath(ctx, b) {
      const { x, base } = b, s = b.sc, h = b.h, bw = 28 * s, nw = 10 * s;
      ctx.beginPath();
      ctx.moveTo(x - bw / 2, base - 4 * s); ctx.quadraticCurveTo(x - bw / 2, base, x - bw / 2 + 4 * s, base);
      ctx.lineTo(x + bw / 2 - 4 * s, base); ctx.quadraticCurveTo(x + bw / 2, base, x + bw / 2, base - 4 * s);
      ctx.lineTo(x + bw / 2, base - h * .55); ctx.quadraticCurveTo(x + bw / 2, base - h * .72, x + nw / 2, base - h * .8);
      ctx.lineTo(x + nw / 2, base - h); ctx.lineTo(x - nw / 2, base - h); ctx.lineTo(x - nw / 2, base - h * .8);
      ctx.quadraticCurveTo(x - bw / 2, base - h * .72, x - bw / 2, base - h * .55); ctx.closePath();
    }
    const ringY = (b, i, r) => { const top = b.base - b.h - 4, bot = b.base - 4 * b.sc - i * 5 * b.sc, u = r.u; return lerp(top, bot, u * u) - Math.sin(u * Math.PI) * 0; };
    function ringHalf(ctx, x, y, rx, c, front, s) {
      ctx.strokeStyle = c; ctx.lineWidth = 6 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.ellipse(x, y, rx, rx * .32, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.ellipse(x, y - 1.5 * s, rx, rx * .32, 0, front ? .3 : Math.PI + .3, front ? Math.PI - .3 : Math.PI * 2 - .3); ctx.stroke();
      ctx.lineCap = 'butt';
    }
    function drawBottle(ctx, b, t) {
      const s = b.sc;
      b.rings.forEach((r, i) => ringHalf(ctx, b.x, ringY(b, i, r), 18 * s, r.c, false, s));
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(b.x, b.base, 17 * s, 4 * s, 0, 0, 7); ctx.fill();
      bottlePath(ctx, b);
      const g = ctx.createLinearGradient(b.x - 14 * s, 0, b.x + 14 * s, 0); g.addColorStop(0, b.g[0]); g.addColorStop(1, b.g[1]);
      ctx.fillStyle = g; ctx.globalAlpha = .95; ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = b.g[1]; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(b.x - 10 * s, b.base - b.h * .58, 4 * s, b.h * .5);
      ctx.fillStyle = b.g[1]; ctx.fillRect(b.x - 6.5 * s, b.base - b.h - 2 * s, 13 * s, 5 * s);
      // ticket label
      ctx.fillStyle = '#FFF9EF'; ctx.beginPath(); ctx.arc(b.x, b.base - b.h * .3, 11 * s, 0, 7); ctx.fill();
      ctx.font = `700 ${Math.round(17 * s)}px ${FONT}`; ctx.fillStyle = '#18242C'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.val, b.x, b.base - b.h * .3 + 1);
      b.rings.forEach((r, i) => ringHalf(ctx, b.x, ringY(b, i, r), 18 * s, r.c, true, s));
    }
    S.draw = (ctx, t) => {
      backWall(ctx, '#6A3A86', '#3A1D4A', 'rgba(255,255,255,.05)');
      poles(ctx); awning(ctx, t, ['#F25A95', '#FFF3DC']); bunting(ctx, t, 74, 12);
      sign(ctx, 'Ring a bottle, win tickets', 180, 112, 17, '#3F86D1', '#fff');
      ROWS.forEach((r, ri) => {
        const y = r.base, w = 300 - (2 - ri) * 22;
        ctx.fillStyle = '#7A4A28'; ctx.fillRect(180 - w / 2, y - 2, w, 8);
        for (let x = 180 - w / 2, i = 0; x < 180 + w / 2; x += 20, i++) { ctx.fillStyle = i % 2 ? '#FFF3DC' : '#E8463A'; ctx.fillRect(x, y + 6, Math.min(20, 180 + w / 2 - x), 14 + ri * 3); }
        ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(180 - w / 2, y + 6, w, 3);
        bottles.filter(b => b.row === ri).forEach(b => drawBottle(ctx, b, t));
      });
      // hoops waiting on a peg
      const left = total - thrown;
      for (let i = 0; i < left; i++) { ctx.strokeStyle = HOOPS[(thrown + 1 + i) % HOOPS.length]; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(46, 372 - i * 7, 22, 7, 0, 0, 7); ctx.stroke(); }
      ctx.fillStyle = '#7A4A28'; ctx.fillRect(43, 372 - Math.max(1, left) * 7 - 10, 6, Math.max(1, left) * 7 + 12);
      if (hoop && hoop.st !== 'gone') {
        const ry = hoop.rx * (.3 + .5 * Math.abs(Math.sin(hoop.spin))) * (hoop.st === 'fly' ? 1 - hoop.u * .5 : 1);
        ctx.save(); ctx.globalAlpha = hoop.a; ctx.strokeStyle = hoop.c; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.ellipse(hoop.x, hoop.y, hoop.rx, Math.max(3, ry), hoop.tilt, 0, 7); ctx.stroke();
        ctx.restore();
      }
    };
  }

  register({ id: 'hookduck', cat: 'fair', order: 1, name: 'Hook a Duck', icon: '🦆', desc: 'Hook a floating duck to win its prize', gentle: true, start: startDuck });
  register({ id: 'coconut', cat: 'fair', order: 2, name: 'Coconut Shy', icon: '🥥', desc: 'Throw balls to knock coconuts down', gentle: false, start: startCoconut });
  register({ id: 'skittles', cat: 'fair', order: 3, name: 'Skittles', icon: '🎳', desc: 'Bowl a ball to knock down the pins', gentle: false, start: startSkittles });
  register({ id: 'ringtoss', cat: 'fair', order: 4, name: 'Ring Toss', icon: '⭕', desc: 'Toss a hoop over a bottle', gentle: true, start: startRing });
})();
