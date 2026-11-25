/* Recall: Seaside Fairground 3. Penny Falls, Grab a Prize and Test Your Strength.
   Canvas scenes in the same striped-awning, bulbs-and-bunting look as fair1. Aiming is a tap,
   everything moves gently, and every round wins fairground tickets (R.tickets). */
(function () {
  const { register, el, pick, shuffle, tone, sfx, cheer } = R;

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
.f3-wrap{width:min(100%,470px);margin:0 auto;display:grid;gap:12px}
.f3-cv{display:block;width:100%;height:auto;aspect-ratio:360/380;border-radius:22px;touch-action:manipulation;cursor:pointer;
  background:#1E3F66;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;
  box-shadow:inset 0 0 0 4px rgba(255,255,255,.14),0 8px 0 #4A2B15,0 16px 28px rgba(0,0,0,.35)}
.f3-ctrl{display:flex;gap:12px;justify-content:center}
.f3-ctrl .btn{min-width:72px;min-height:64px;font-size:1.5rem;padding:.4em .9em}
.f3-ctrl .f3-big{flex:1 1 auto;max-width:220px;font-size:1.45rem}
.f3-ctrl .btn:disabled{opacity:.55;cursor:default}
.f3-bar{display:flex;align-items:center;justify-content:space-between;gap:4px 14px;flex-wrap:wrap;min-height:56px;box-sizing:border-box;
  background:var(--card);color:var(--ink);border-radius:18px;padding:8px 16px;
  box-shadow:0 6px 0 var(--card-edge),0 10px 18px rgba(0,0,0,.25);font:600 1.25rem/1.25 var(--display)}
.f3-won{display:inline-block;color:var(--coral-d)}
.f3-won.f3-go{animation:f3-pop .6s ease-out}
.f3-tot{color:var(--ink-soft)}
.f3-tot b{color:var(--ink)}
@keyframes f3-pop{0%{transform:scale(.6)}55%{transform:scale(1.22)}100%{transform:scale(1)}}
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
  const clink = (p) => { tone(1500 * (p || 1), .07, 'triangle', .05); tone(2100 * (p || 1), .06, 'triangle', .035, .04); };
  const thud = () => { tone(140, .16, 'sine', .14); noise(.12, 300, .12, 1.2); };
  const bell = () => { [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, 1.1, 'sine', .1, i * .02)); tone(523, 1.4, 'triangle', .06); };

  /* ---------- shared fairground scene ---------- */
  function scene(api, total, ctrl) {
    const wrap = el('div', 'f3-wrap'), cv = el('canvas', 'f3-cv'), ctx = cv.getContext('2d');
    const K = clamp((window.devicePixelRatio || 1) * 1.4, 1.5, 4);
    cv.width = Math.round(W * K); cv.height = Math.round(H * K);
    cv.setAttribute('role', 'img');
    const bar = el('div', 'f3-bar'), won = el('span', 'f3-won', '🎟 Win tickets!'), tot = el('span', 'f3-tot', '');
    bar.append(won, tot); wrap.append(cv); if (ctrl) wrap.append(ctrl); wrap.append(bar); api.stage.append(wrap);
    const S = { cv, ctx, t: 0, fx: [], won: 0, over: false, done: 0, total, update: null, draw: null, tap: null };
    cv._f3 = S; // read by tests only
    const showTot = n => { tot.innerHTML = `Total <b>🎟 ${n}</b>`; };
    showTot(R.tickets());
    api.rounds(total, 0);

    S.float = (text, x, y, col, size) => S.fx.push({ k: 'txt', text, x, y, col: col || '#FFE27A', size: size || 28, t: 0, d: 1.7 });
    S.burst = (x, y, n) => { for (let i = 0; i < n; i++) S.fx.push({ k: 'sp', x, y, vx: rnd(-110, 110), vy: rnd(-190, -50), c: pick(CONF), t: 0, d: rnd(.8, 1.4), r: rnd(3, 6) }); };
    S.award = (n, x, y, quiet) => {
      n = Math.max(1, Math.round(n)); S.won += n;
      const all = R.tickets(n);
      won.textContent = `🎟 +${n} ticket${n === 1 ? '' : 's'}`;
      won.classList.remove('f3-go'); void won.offsetWidth; won.classList.add('f3-go');
      showTot(all);
      if (x != null) { S.float(`+${n} 🎟`, x, y); S.burst(x, y, 16); }
      if (!quiet) jingle(n);
    };
    S.step = () => { S.done++; api.rounds(total, S.done); };
    S.finish = (stars, words) => {
      if (S.over) return; S.over = true;
      if (!S.won) S.award(1, W / 2, H / 2);
      const t = R.tickets();
      api.hint(`${words ? words + ' ' : ''}You won ${S.won} tickets. You have ${t} tickets now.`);
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
  function awning(ctx, t, cols) {
    cols = cols || ['#E8463A', '#FFF3DC'];
    const top = 6, h = 26, sw = 36;
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
    for (let i = 0, x = sw / 2; x < W; i++, x += sw) bulb(ctx, x, top + h + sw / 2 + 3, t, i);
  }
  function bulb(ctx, x, y, t, i, r) {
    r = r || 4.5;
    const a = .7 + .3 * Math.sin(t * 1.4 + i * 1.9);
    const gl = ctx.createRadialGradient(x, y, 1, x, y, r * 3.4);
    gl.addColorStop(0, `rgba(255,230,150,${.75 * a})`); gl.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, r * 3.4, 0, 7); ctx.fill();
    ctx.fillStyle = `rgba(255,${210 + 35 * a | 0},${120 + 60 * a | 0},1)`; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  function bunting(ctx, t, y0, sag, x0, x1) {
    x0 = x0 || 0; x1 = x1 || W;
    const ys = x => y0 + sag * Math.sin(Math.PI * (x - x0) / (x1 - x0));
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2;
    ctx.beginPath(); for (let x = x0; x <= x1; x += 10) x > x0 ? ctx.lineTo(x, ys(x)) : ctx.moveTo(x, ys(x)); ctx.stroke();
    for (let i = 0, x = x0 + 16; x < x1 - 8; i++, x += 26) {
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
  function btn(cls, html, label) { const b = el('button', 'btn ' + cls, html); b.type = 'button'; if (label) b.setAttribute('aria-label', label); return b; }

  /* =========================================================
     1. PENNY FALLS (side view: the shelf pushes to the right, the tray is bottom right)
     ========================================================= */
  const PR = 12, PD = 24, PT = 8;                       // penny radius, diameter, thickness
  const BED = 268, EDGE = 314, PWALL = 30, SHELF = BED - 6 * PT, TRAY = 334, DROPY = 98;

  function drawPenny(ctx, x, yb, gold, rot) {
    ctx.save(); ctx.translate(x, yb - PT / 2); if (rot) ctx.rotate(rot);
    const top = gold ? '#FFD94A' : '#E59A55', side = gold ? '#C28A00' : '#9A5524', rim = gold ? '#FFF1A8' : '#F7C08A';
    ctx.fillStyle = side;
    ctx.beginPath(); ctx.ellipse(0, 1, PR, 3, 0, 0, Math.PI); ctx.lineTo(-PR, -1); ctx.ellipse(0, -1, PR, 3, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
    ctx.fillRect(-PR, -1, PR * 2, 2);
    ctx.fillStyle = top; ctx.beginPath(); ctx.ellipse(0, -1, PR, 3, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = rim; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, -1, PR - 3, 1.7, 0, 0, 7); ctx.stroke();
    if (gold) { ctx.fillStyle = '#fff'; ctx.font = `700 9px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★', 0, -1.5); }
    ctx.restore();
  }

  function startPenny(level, api) {
    const L = lv(level), k = diffK(L), TOTAL = 15;
    const S = scene(api, TOTAL);
    const per = 3.2 + .8 * k, amp = 26, mid = 94;
    const pAt = t => mid + amp * Math.sin(t * 2 * Math.PI / per);
    const pMax = mid + amp;
    let p = pAt(0), dropped = 0, settle = 0, tail = 0, cool = 0, pend = 0, pendT = 0, finished = false;
    const coins = [], tray = [];
    S._coins = coins;

    // a nicely loaded table: a full bottom row, bricked layers on top, and a lucky gold coin
    const front = EDGE - 3 - 10 * k;
    const lay0 = [];
    for (let x = front; x - PR >= pMax + 1; x -= PD) lay0.push(x);
    lay0.forEach(x => coins.push({ st: 'rest', x, lay: 0 }));
    let below = lay0.slice().sort((a, b) => b - a);
    const counts = [Math.round(6 - 2.5 * k), Math.round(3 - 2 * k), L <= 3 ? 1 : 0];
    const allUp = [];
    counts.forEach((n, li) => {
      const mids = [];
      for (let i = 1; i < below.length; i++) if (Math.abs(below[i - 1] - below[i] - PD) < .5) mids.push((below[i - 1] + below[i]) / 2);
      let chosen = mids.slice(0, n + 1);
      if (chosen.length > n) chosen.splice(Math.floor(Math.random() * chosen.length), 1);
      chosen.forEach(x => { const c = { st: 'rest', x, lay: li + 1 }; coins.push(c); allUp.push(c); });
      below = chosen.sort((a, b) => b - a);
    });
    if (allUp.length) pick(allUp).gold = true;
    coins.push({ st: 'shelf', x: PWALL + PR }, { st: 'shelf', x: PWALL + PR + PD });

    const hintLeft = () => {
      const n = TOTAL - dropped;
      api.hint(n ? `Tap above the table to drop a penny. ${n} penn${n === 1 ? 'y' : 'ies'} left.` : 'Watch the last pennies tumble…');
    };
    api.hint('Tap above the table to drop a penny. Drop it in front of the sliding shelf to push coins into the tray!');
    S._tgt = () => (dropped < TOTAL && cool <= 0 ? [clamp(p + rnd(14, 40), PWALL + PR, EDGE - PR), 150] : null);

    S.tap = (x, y) => {
      if (dropped >= TOTAL || cool > 0 || y < 60 || y > 300) return;
      cool = .35; dropped++; S.step();
      coins.push({ st: 'fall', x: clamp(x, PWALL + PR, EDGE - PR), y: DROPY, vy: 40, vx: 0, fresh: 1 });
      sfx.tap(); hintLeft();
    };

    const highest = (x, self) => {
      let top = -1;
      coins.forEach(o => { if (o !== self && o.st === 'rest' && Math.abs(o.x - x) < .72 * PD && o.lay > top) top = o.lay; });
      return top;
    };
    const fallC = (c, vx) => { c.st = 'fall'; c.y = BED - c.lay * PT; c.vy = 0; c.vx = vx; c.rot = 0; };
    const land = (c, kind, top) => {
      c.vy = 0; c.vx = 0; c.rot = 0;
      if (kind === 'tray') {
        c.st = 'tray'; tray.push({ x: clamp(c.x + rnd(-6, 6), EDGE + 6, W - 26), n: tray.length, gold: c.gold });
        pend += c.gold ? 5 : 1; pendT = pendT || .45; clink(.8); noise(.08, 3000, .05, 2);
        return;
      }
      if (kind === 'shelf') { c.st = 'shelf'; clink(1.1); return; }
      c.st = 'rest'; c.lay = top + 1;
      if (c.lay > 0) {
        let sup = null, nd = 1e9;
        coins.forEach(o => { if (o.st === 'rest' && o !== c && o.lay === c.lay - 1) { const d = Math.abs(o.x - c.x); if (d < nd) { nd = d; sup = o; } } });
        if (sup && nd > .5 * PD) c.x = sup.x + Math.sign(c.x - sup.x) * .5 * PD;
      }
      clink(1 + c.lay * .06);
    };

    S.update = dt => {
      cool -= dt;
      const np = pAt(S.t), dp = np - p; p = np;
      // shelf coins ride the shelf and get scraped off its front by the back wall
      const sh = coins.filter(c => c.st === 'shelf').sort((a, b) => a.x - b.x);
      sh.forEach(c => { c.x = Math.max(PWALL + PR, c.x + dp); });
      for (let i = 1; i < sh.length; i++) if (sh[i].x < sh[i - 1].x + PD) sh[i].x = sh[i - 1].x + PD;
      sh.forEach(c => { if (c.x > p + 2) { c.st = 'fall'; c.y = SHELF; c.vy = 0; c.vx = 30; c.lay = 0; } });
      // the bed: push, carry stacked coins, keep each layer apart
      const rest = coins.filter(c => c.st === 'rest');
      rest.forEach(c => {
        c.ox = c.x; c.sup = null;
        if (!c.lay) return;
        let bd = .62 * PD;
        rest.forEach(o => { if (o.lay === c.lay - 1) { const d = Math.abs(o.x - c.x); if (d < bd) { bd = d; c.sup = o; } } });
      });
      const maxLay = rest.reduce((m, c) => Math.max(m, c.lay), -1);
      for (let l = 0; l <= maxLay; l++) {
        const row = rest.filter(c => c.lay === l);
        row.forEach(c => { if (c.sup) c.x += c.sup.x - c.sup.ox; if (l < 6 && c.x - PR < p) c.x = p + PR; });
        row.sort((a, b) => a.x - b.x);
        for (let i = 1; i < row.length; i++) if (row[i].x < row[i - 1].x + PD) row[i].x = row[i - 1].x + PD;
      }
      rest.forEach(c => {
        if (c.x > EDGE + (c.lay ? 3 : 0)) { fallC(c, 40); return; }
        if (c.lay === 0) return;
        let ok = false, near = null, nd = 1e9;
        rest.forEach(o => { if (o.st === 'rest' && o.lay === c.lay - 1) { const d = Math.abs(o.x - c.x); if (d < .62 * PD) ok = true; if (d < nd) { nd = d; near = o; } } });
        if (!ok) fallC(c, near ? Math.sign(c.x - near.x || 1) * 45 : 45);
      });
      // tall piles slump: a coin two layers above its neighbour slips down that side (forward if both)
      const restNow = coins.filter(c => c.st === 'rest');
      const hAt = (x, self) => {
        if (x - PR < p) return 99;
        if (x > EDGE) return -1;
        let h = -1; restNow.forEach(o => { if (o !== self && o.st === 'rest' && Math.abs(o.x - x) < .55 * PD && o.lay > h) h = o.lay; });
        return h;
      };
      restNow.forEach(c => {
        if (c.lay < 1 || c.st !== 'rest' || Math.random() > dt * 4) return;
        const hF = hAt(c.x + .6 * PD, c), hB = hAt(c.x - .6 * PD, c);
        const dir = hF <= c.lay - 2 && hF <= hB ? 1 : hB <= c.lay - 2 ? -1 : 0;
        if (!dir) return;
        fallC(c, dir * 70); c.x += dir * .3 * PD;
      });
      // falling coins
      coins.forEach(c => {
        if (c.st !== 'fall') return;
        const py = c.y;
        c.vy += 1100 * dt; c.y += c.vy * dt; c.x = clamp(c.x + c.vx * dt, PWALL + PR, W - 22); c.vx *= Math.max(0, 1 - 2.5 * dt);
        if (c.x > EDGE - PR) c.rot = (c.rot || 0) + dt * 7;
        if (c.y > SHELF + 3 && c.x - PR < p && c.x < p + PR) c.x = p + PR;
        const top = highest(c.x, c);
        let surf, kind = 'bed';
        if (top >= 0) surf = BED - (top + 1) * PT;
        else if (c.x < p) { surf = SHELF; kind = 'shelf'; }
        else if (c.x <= EDGE) surf = BED;
        else { surf = TRAY; kind = 'tray'; }
        if (c.y >= surf && (py <= surf + 10 || kind !== 'tray')) { c.y = surf; land(c, kind, top); }
      });
      for (let i = coins.length - 1; i >= 0; i--) if (coins[i].st === 'tray') coins.splice(i, 1);
      if (pendT > 0 && (pendT -= dt) <= 0) {
        pendT = 0; const n = pend; pend = 0; S.award(n, 272, 300);
        if (!S.over) api.hint(n > 1 ? `${n} tickets! ${cheer()}` : 'A coin dropped in! +1 ticket.');
        api.later(() => { if (!S.over && dropped < TOTAL) hintLeft(); }, 1500);
      }
      // the round ends a little after the last penny has settled
      if (dropped >= TOTAL && !finished) {
        tail += dt;
        if ((coins.some(c => c.st === 'fall') || pendT > 0) && tail < 12) settle = 0;
        else if ((settle += dt) > per * 1.6 || tail > 14) {
          finished = true;
          S.finish(S.won >= 9 ? 3 : S.won >= 5 ? 2 : 1, 'That was your last penny!');
        }
      }
    };

    S.draw = (ctx, t) => {
      backWall(ctx, '#2A5F8E', '#123657', 'rgba(255,255,255,.05)');
      awning(ctx, t, ['#2C9C5A', '#FFF3DC']); bunting(ctx, t, 62, 8);
      // the cabinet
      ctx.fillStyle = '#7A1E1A'; roundRect(ctx, 6, 82, W - 12, 292, 18); ctx.fill();
      ctx.fillStyle = '#C8332B'; roundRect(ctx, 10, 78, W - 20, 290, 16); ctx.fill();
      for (let i = 0, x = 24; x < W - 16; i++, x += 26) { bulb(ctx, x, 86, t, i, 3.5); bulb(ctx, x, 358, t, i + 3, 3.5); }
      // glass and painted back
      const gl = ctx.createLinearGradient(0, 96, 0, 340); gl.addColorStop(0, '#203C63'); gl.addColorStop(1, '#3A6E9C');
      ctx.fillStyle = gl; roundRect(ctx, 20, 96, W - 40, 248, 10); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      for (let x = 40; x < W - 30; x += 36) { ctx.beginPath(); ctx.moveTo(x, 96); ctx.lineTo(x + 18, 96); ctx.lineTo(x - 30, 344); ctx.lineTo(x - 48, 344); ctx.closePath(); ctx.fill(); }
      sign(ctx, 'Penny Falls', 186, 126, 22, '#7A1E1A', '#FFE27A');
      // drop rail
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([6, 8]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(PWALL + 4, DROPY - 8); ctx.lineTo(EDGE, DROPY - 8); ctx.stroke(); ctx.setLineDash([]);
      // back wall the shelf slides under
      ctx.fillStyle = '#5A361C'; ctx.fillRect(20, 144, PWALL - 20, SHELF - 144);
      ctx.fillStyle = '#E9C67E'; ctx.fillRect(PWALL - 3, 144, 3, SHELF - 144);
      // bed (table) and front lip
      const bg = ctx.createLinearGradient(0, BED, 0, BED + 30); bg.addColorStop(0, '#2F9A63'); bg.addColorStop(1, '#1D6B42');
      ctx.fillStyle = bg; ctx.fillRect(20, BED, EDGE - 20, 26);
      ctx.fillStyle = '#E9C67E'; ctx.fillRect(EDGE - 4, BED, 6, 28);
      ctx.fillStyle = '#B88B3E'; ctx.fillRect(20, BED + 26, EDGE - 18, 6);
      // the tray
      ctx.fillStyle = '#4A2B15'; roundRect(ctx, EDGE - 6, TRAY - 8, W - 14 - EDGE, 24, 6); ctx.fill();
      tray.forEach((c, i) => drawPenny(ctx, c.x, TRAY - Math.floor(i / 2) % 2 * 3 - (i % 3), c.gold, 0));
      ctx.fillStyle = '#E9C67E'; roundRect(ctx, EDGE - 8, TRAY + 4, W - 10 - EDGE, 12, 5); ctx.fill();
      ctx.font = `700 11px ${FONT}`; ctx.fillStyle = '#5A361C'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('TRAY', (EDGE + W - 16) / 2, TRAY + 10);
      // the sliding shelf
      const sg = ctx.createLinearGradient(0, SHELF, 0, BED); sg.addColorStop(0, '#F2F5F8'); sg.addColorStop(.5, '#A9B4C0'); sg.addColorStop(1, '#6E7B88');
      ctx.fillStyle = sg; ctx.fillRect(20, SHELF, p - 20, BED - SHELF);
      ctx.fillStyle = '#E8463A'; ctx.fillRect(p - 6, SHELF, 6, BED - SHELF);
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(20, SHELF, p - 20, 3);
      // coins: shelf, then the bed layer by layer, then falling ones
      coins.filter(c => c.st === 'shelf').forEach(c => drawPenny(ctx, c.x, SHELF, c.gold));
      coins.filter(c => c.st === 'rest').sort((a, b) => a.lay - b.lay || a.x - b.x).forEach(c => drawPenny(ctx, c.x, BED - c.lay * PT, c.gold));
      coins.filter(c => c.st === 'fall').forEach(c => drawPenny(ctx, c.x, c.y, c.gold, c.rot));
      // pennies still in hand
      const left = TOTAL - dropped;
      for (let i = 0; i < Math.min(left, 15); i++) drawPenny(ctx, 46 + (i % 2) * 4, 334 - i * 4.5);
      ctx.font = `700 18px ${FONT}`; ctx.fillStyle = '#FFE27A'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(60,25,10,.85)'; ctx.strokeText(`× ${left}`, 64, 330); ctx.fillText(`× ${left}`, 64, 330);
      if (left && t % 2 < 1.4) {
        ctx.font = `700 15px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillText('▼ tap to drop ▼', 186, DROPY + 4);
      }
    };
  }

  /* =========================================================
     2. GRAB A PRIZE (claw machine)
     ========================================================= */
  const PLUSH = [['🧸', 'teddy bear'], ['🐰', 'bunny'], ['🐻', 'brown bear'], ['🐼', 'panda'], ['🐸', 'frog'], ['🐷', 'piggy'], ['🦊', 'fox'],
    ['🐱', 'kitten'], ['🐶', 'puppy'], ['🐵', 'monkey'], ['🐥', 'chick'], ['🐙', 'octopus'], ['🐳', 'whale'], ['🐨', 'koala'], ['🐯', 'tiger']];
  const CX0 = 56, CX1 = 322, RAIL = 92, REST = 112, CHUTE = [20, 90];

  function drawClaw(ctx, x, y, open, t) {
    ctx.save(); ctx.translate(x, y);
    ctx.lineCap = 'round';
    const ang = .25 + open * .7;
    [-1, 1].forEach(s => {
      ctx.save(); ctx.rotate(s * ang);
      ctx.strokeStyle = '#6E7B88'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, 30); ctx.quadraticCurveTo(0, 42, -s * 10, 44); ctx.stroke();
      ctx.strokeStyle = '#D9DEE5'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-1, 8); ctx.lineTo(-1, 30); ctx.stroke();
      ctx.restore();
    });
    ctx.strokeStyle = '#8994A0'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, 34); ctx.stroke();
    const g = ctx.createLinearGradient(-16, 0, 16, 0); g.addColorStop(0, '#9AA5B1'); g.addColorStop(.4, '#F2F5F8'); g.addColorStop(1, '#6E7B88');
    ctx.fillStyle = g; roundRect(ctx, -16, -8, 32, 18, 7); ctx.fill();
    ctx.fillStyle = '#E8463A'; ctx.beginPath(); ctx.arc(0, 1, 4, 0, 7); ctx.fill();
    ctx.restore();
  }

  function startClaw(level, api) {
    const L = lv(level), k = diffK(L), GOES = 5;
    const ctrl = el('div', 'f3-ctrl');
    const bL = btn('c-sky', '◀', 'Move claw left'), bG = btn('c-coral f3-big', 'Grab! ✊', 'Grab'), bR = btn('c-sky', '▶', 'Move claw right');
    ctrl.append(bL, bG, bR);
    const S = scene(api, GOES, ctrl);
    const tol = 44 - 18 * k, pS = .97 - .3 * k;
    const pool = shuffle(PLUSH.slice());
    const prizes = [];
    const rows = [[6, 116, 318], [5, 137, 284], [4, 158, 252]];
    rows.forEach(([n, x0, y], r) => { for (let i = 0; i < n; i++) prizes.push({ x: x0 + i * 42 + rnd(-3, 3), y: y + rnd(-3, 3), r, e: pool[(prizes.length) % pool.length], v: 3, rot: rnd(-.25, .25), ph: rnd(0, 6), on: true }); });
    const star = pick(prizes.filter(p => p.r === 2)); star.e = ['🦄', 'unicorn']; star.v = 6; star.star = true;
    const claw = { x: 206, tx: 206, y: REST, open: .35 };
    let ph = 'idle', pt = 0, job = null, goes = 0, wins = 0;
    const got = [];

    const candidate = () => {
      let best = null;
      prizes.forEach(p => { if (p.on && Math.abs(p.x - claw.x) < tol * 1.4 && (!best || p.y < best.y - 4 || (Math.abs(p.y - best.y) <= 4 && Math.abs(p.x - claw.x) < Math.abs(best.x - claw.x)))) best = p; });
      return best;
    };
    const setBtns = () => { const on = ph === 'idle' && !S.over; [bL, bG, bR].forEach(b => { b.disabled = !on; }); };
    const idleHint = () => api.hint(`Move the claw over a prize, then tap Grab. ${GOES - goes} go${GOES - goes === 1 ? '' : 'es'} left.`);
    api.hint('Move the claw with the arrows, or tap where it should go. Then tap Grab!');
    setBtns();

    const move = d => { if (ph !== 'idle' || S.over) return; claw.tx = clamp(claw.tx + d, CX0, CX1); sfx.tap(); tone(330 + (claw.tx - CX0), .08, 'triangle', .05); };
    bL.onclick = () => move(-42);
    bR.onclick = () => move(42);
    S.tap = (x, y) => { if (ph !== 'idle' || y < 70) return; claw.tx = clamp(x, CX0, CX1); sfx.tap(); };
    const grab = () => {
      if (ph !== 'idle' || S.over) return;
      const p = candidate();
      claw.x = claw.tx = clamp(claw.tx, CX0, CX1);
      if (!p) { sfx.soft(); api.hint('Move the claw over a prize first, then tap Grab.'); return; }
      sfx.tap(); goes++;
      const centred = Math.abs(p.x - claw.x) < 12, pity = !wins && goes === GOES;
      job = { p, ok: centred || pity || Math.random() < pS, x0: claw.x, py: p.y };
      ph = 'down'; pt = 0; setBtns();
      api.hint('Down goes the claw…');
      tone(260, .5, 'sawtooth', .025);
    };
    bG.onclick = grab;
    S._tgt = () => { if (ph !== 'idle') return null; const p = prizes.filter(p => p.on).sort((a, b) => a.y - b.y)[0]; return p ? [p.x, 200] : null; };
    S._grab = grab;

    S.update = dt => {
      pt += dt;
      prizes.forEach(p => { if (p.fall) { p.vy += 900 * dt; p.y += p.vy * dt; if (p.y >= p.fall) { p.y = p.fall; p.fall = 0; thud(); } } });
      if (ph === 'idle') { claw.x = lerp(claw.x, claw.tx, clamp(dt * 5, 0, 1)); claw.y = REST + Math.sin(S.t * 2) * 1.5; claw.open = .35; return; }
      const j = job, p = j.p, low = j.py - 40;
      if (ph === 'down') {
        const u = clamp(pt / 1.1, 0, 1);
        claw.x = lerp(j.x0, j.ok ? p.x : lerp(j.x0, p.x, .5), ease(u)); claw.y = lerp(REST, low, ease(u)); claw.open = lerp(.35, 1, clamp(u * 3, 0, 1));
        if (u >= 1) { ph = 'close'; pt = 0; tone(180, .15, 'square', .04); }
      } else if (ph === 'close') {
        const u = clamp(pt / .45, 0, 1); claw.open = lerp(1, j.ok ? .12 : 0, u);
        if (u >= 1) { ph = 'up'; pt = 0; p.held = true; tone(330, .6, 'sawtooth', .02); }
      } else if (ph === 'up') {
        const u = clamp(pt / 1.1, 0, 1); claw.y = lerp(low, REST, ease(u));
        if (p.held) p.y = claw.y + 40;
        if (!j.ok && p.held && u > .35) {
          p.held = false; p.fall = j.py; p.vy = 0; sfx.soft();
          api.hint('Oh, it wriggled free! So close.');
        }
        if (u >= 1) {
          if (j.ok) { ph = 'carry'; pt = 0; j.cx = claw.x; }
          else { ph = 'idle'; S.step(); after(); }
        }
      } else if (ph === 'carry') {
        const u = clamp(pt / 1.3, 0, 1); claw.x = lerp(j.cx, CX0, ease(u)); p.x = claw.x; p.y = claw.y + 40;
        if (u >= 1) { ph = 'drop'; pt = 0; p.held = false; p.fall = 330; p.vy = 0; p.chute = true; claw.open = 1; tone(400, .1, 'triangle', .06); }
      } else if (ph === 'drop') {
        if (pt > .7 && !j.paid) {
          j.paid = true; p.on = false; wins++; got.push(p.e[0]); S.step();
          S.award(p.v, 110, 250);
          api.hint(`You won the ${p.e[1]}! ${p.star ? 'The star prize! ' : ''}${cheer()}`);
        }
        if (pt > 1.4) { ph = 'home'; pt = 0; claw.tx = 206; }
      } else if (ph === 'home') {
        claw.x = lerp(claw.x, claw.tx, clamp(dt * 3, 0, 1)); claw.open = .35;
        if (Math.abs(claw.x - claw.tx) < 2) { ph = 'idle'; after(); }
      }
    };
    const after = () => {
      if (goes >= GOES) {
        setBtns();
        api.later(() => S.finish(wins >= 3 ? 3 : wins >= 2 ? 2 : 1, wins ? `You won ${wins} prize${wins === 1 ? '' : 's'}!` : ''), 600);
      } else { setBtns(); api.later(() => { if (ph === 'idle' && !S.over) idleHint(); }, 1200); }
    };

    S.draw = (ctx, t) => {
      backWall(ctx, '#7E3FA0', '#3E1A5A', 'rgba(255,255,255,.06)');
      awning(ctx, t, ['#F25A95', '#FFF3DC']);
      // cabinet frame
      ctx.fillStyle = '#C46512'; roundRect(ctx, 6, 70, W - 12, 304, 18); ctx.fill();
      ctx.fillStyle = '#FF9A3C'; roundRect(ctx, 10, 66, W - 20, 300, 16); ctx.fill();
      for (let i = 0, y = 84; y < 352; i++, y += 24) { bulb(ctx, 16, y, t, i, 3.2); bulb(ctx, W - 16, y, t, i + 2, 3.2); }
      const gl = ctx.createLinearGradient(0, 78, 0, 344); gl.addColorStop(0, '#FDE7F1'); gl.addColorStop(1, '#F7B9D3');
      ctx.fillStyle = gl; roundRect(ctx, 24, 78, W - 48, 266, 10); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      for (let i = 0; i < 18; i++) { ctx.beginPath(); ctx.arc(40 + (i * 53) % 280, 150 + (i * 37) % 80, 2.5, 0, 7); ctx.fill(); }
      // rail and cable
      ctx.fillStyle = '#6E7B88'; ctx.fillRect(24, RAIL - 6, W - 48, 8); ctx.fillStyle = '#D9DEE5'; ctx.fillRect(24, RAIL - 6, W - 48, 3);
      ctx.fillStyle = '#4A5560'; roundRect(ctx, claw.x - 18, RAIL - 10, 36, 14, 5); ctx.fill();
      ctx.strokeStyle = '#4A5560'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(claw.x, RAIL); ctx.lineTo(claw.x, claw.y - 6); ctx.stroke();
      // aim guide
      if (ph === 'idle') {
        ctx.strokeStyle = 'rgba(232,70,58,.45)'; ctx.setLineDash([5, 7]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(claw.x, claw.y + 46); ctx.lineTo(claw.x, 334); ctx.stroke(); ctx.setLineDash([]);
        const c = candidate();
        if (c) { ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(c.x, c.y + 2, 26, 26, 0, 0, 7); ctx.stroke(); }
      }
      // prizes
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const drawPrize = p => {
        if (!p.on) return;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.held ? Math.sin(t * 8) * .08 : p.rot + Math.sin(t * 1.3 + p.ph) * .03);
        ctx.font = `40px ${FONT}`; ctx.fillText(p.e[0], 0, 0);
        if (p.star) { ctx.font = `700 16px ${FONT}`; ctx.fillStyle = '#FFC234'; ctx.fillText('★', 18, -18); ctx.fillStyle = '#000'; }
        ctx.restore();
      };
      prizes.filter(p => !p.held && !p.chute).sort((a, b) => a.r - b.r).forEach(drawPrize);
      // chute with its front panel
      prizes.filter(p => p.chute).forEach(drawPrize);
      ctx.fillStyle = '#C46512'; roundRect(ctx, CHUTE[0] + 4, 214, CHUTE[1] - CHUTE[0], 130, 8); ctx.fill();
      ctx.fillStyle = '#FFC234'; roundRect(ctx, CHUTE[0] + 4, 208, CHUTE[1] - CHUTE[0], 12, 5); ctx.fill();
      ctx.font = `700 15px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText('PRIZE', (CHUTE[0] + CHUTE[1]) / 2 + 4, 246); ctx.fillText('CHUTE', (CHUTE[0] + CHUTE[1]) / 2 + 4, 266);
      ctx.font = `26px ${FONT}`; ctx.fillText('⬇', (CHUTE[0] + CHUTE[1]) / 2 + 4, 300);
      drawClaw(ctx, claw.x, claw.y, claw.open, t);
      prizes.filter(p => p.held).forEach(drawPrize);
      // glass shine
      ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.moveTo(250, 78); ctx.lineTo(290, 78); ctx.lineTo(220, 344); ctx.lineTo(180, 344); ctx.closePath(); ctx.fill();
      // won prizes shelf
      ctx.fillStyle = '#7A3D0C'; roundRect(ctx, 24, 348, W - 48, 22, 8); ctx.fill();
      ctx.font = `700 14px ${FONT}`; ctx.fillStyle = '#FFE27A'; ctx.textAlign = 'left'; ctx.fillText('Won:', 34, 360);
      ctx.font = `18px ${FONT}`; got.forEach((e, i) => ctx.fillText(e, 80 + i * 26, 360));
    };
  }

  /* =========================================================
     3. TEST YOUR STRENGTH (high striker)
     ========================================================= */
  const TX = 148, TBASE = 326, TTOP = 104, MX = 26, MW = 38, MTOP = 124, MBOT = 330;
  const BANDS = [[0, 'Warming up'], [.2, 'Not bad!'], [.38, 'Getting there!'], [.55, 'Strong!'], [.7, 'Mighty!'], [.84, 'Strong as an ox!']];
  const labelFor = h => (h >= .999 ? 'DING! Champion!' : BANDS.filter(b => h >= b[0]).pop()[1]);

  function startStrength(level, api) {
    const L = lv(level), k = diffK(L), SW = 5;
    const ctrl = el('div', 'f3-ctrl');
    const bS = btn('c-coral f3-big', 'Swing! 🔨', 'Swing the mallet');
    ctrl.append(bS);
    const S = scene(api, SW, ctrl);
    const per = 2.8 - 1.0 * k, win = .3 - .15 * k;
    let ph = 'aim', pt = 0, mt = 0, m = 0, power = 0, h = 0, puck = 0, rings = 0, swings = 0, shake = 0, flash = 0, lastLabel = '';
    const mal = { a: 0 };
    api.hint('Watch the marker go up and down. Tap Swing when it is high in the gold!');
    const swing = () => {
      if (ph !== 'aim' || S.over) return;
      power = m; ph = 'swing'; pt = 0; swings++; bS.disabled = true;
      const ring = power >= 1 - win;
      h = ring ? 1 : clamp(.12 + .82 * power / (1 - win), .12, .94);
      sfx.tap(); noise(.25, 700, .06, .6);
    };
    bS.onclick = swing;
    S.tap = () => swing();
    S._tgt = () => (ph === 'aim' && m >= 1 - win * .6 ? [180, 200] : null);

    S.update = dt => {
      shake = Math.max(0, shake - dt * 2); flash = Math.max(0, flash - dt);
      if (ph === 'aim') { mt += dt; m = .5 - .5 * Math.cos(mt * 2 * Math.PI / per); mal.a = Math.sin(S.t * 2) * .04; return; }
      pt += dt;
      if (ph === 'swing') {
        const u = clamp(pt / .32, 0, 1); mal.a = u * u;
        if (u >= 1) { ph = 'fly'; pt = 0; thud(); noise(.18, 200, .2, .8); S.burst(TX + 6, TBASE + 4, 10); }
      } else if (ph === 'fly') {
        const up = .45 + .6 * h, u = clamp(pt / up, 0, 1);
        puck = h * (1 - Math.pow(1 - u, 2)); mal.a = 1 - clamp(pt / .6, 0, 1) * .4;
        if (!pt || u < 1) tone(220 + 600 * puck, .03, 'triangle', .02);
        if (u >= 1) {
          ph = 'top'; pt = 0; lastLabel = labelFor(h);
          if (h >= .999) { rings++; bell(); shake = 1; flash = 1.2; }
          const n = h >= .999 ? 4 : h >= .7 ? 3 : h >= .38 ? 2 : 1;
          S.award(n, 270, TBASE - h * (TBASE - TTOP) + 10);
          if (h >= .999) api.later(() => { S.award(3, 270, 120); S.float('Bonus!', 270, 90, '#FFC234', 26); }, 600);
          S.float(lastLabel, TX, Math.max(70, TBASE - h * (TBASE - TTOP) - 26), '#fff', 24);
          api.hint(h >= .999 ? `Ding! You rang the bell! ${cheer()} Bonus tickets!` : `${lastLabel} ${n} ticket${n === 1 ? '' : 's'}. Tap when the marker is right at the top to ring the bell.`);
          S.step();
        }
      } else if (ph === 'top') {
        mal.a = lerp(mal.a, 0, clamp(dt * 4, 0, 1));
        if (pt > .55) { ph = 'down'; pt = 0; }
      } else if (ph === 'down') {
        const u = clamp(pt / .7, 0, 1); puck = h * (1 - u * u); mal.a = lerp(mal.a, 0, clamp(dt * 4, 0, 1));
        if (u >= 1) {
          puck = 0; tone(160, .1, 'sine', .08);
          if (swings >= SW) {
            ph = 'end';
            S.finish(rings >= 2 ? 3 : rings >= 1 || S.won >= 12 ? 2 : 1, rings ? `You rang the bell ${rings === 1 ? 'once' : rings + ' times'}!` : 'What a strong arm!');
          } else {
            ph = 'aim'; mt = 0; bS.disabled = false;
            api.later(() => { if (ph === 'aim' && !S.over) api.hint(`Tap Swing when the marker is high. ${SW - swings} swing${SW - swings === 1 ? '' : 's'} left.`); }, 1300);
          }
        }
      }
    };

    S.draw = (ctx, t) => {
      backWall(ctx, '#2C6FA3', '#123E63', 'rgba(255,255,255,.06)');
      if (flash > 0) { ctx.fillStyle = `rgba(255,226,122,${.3 * Math.min(1, flash) * (Math.sin(t * 20) > 0 ? 1 : .5)})`; ctx.fillRect(0, 0, W, H); }
      awning(ctx, t, ['#45AEFF', '#FFF3DC']);
      bunting(ctx, t, 60, 10, 190, W);
      // ground
      ctx.fillStyle = '#C49A5A'; ctx.fillRect(0, 338, W, 42); ctx.fillStyle = '#A57A3E'; ctx.fillRect(0, 338, W, 5);
      // power meter
      ctx.fillStyle = '#4A2B15'; roundRect(ctx, MX - 6, MTOP - 30, MW + 12, MBOT - MTOP + 42, 12); ctx.fill();
      const mg = ctx.createLinearGradient(0, MBOT, 0, MTOP); mg.addColorStop(0, '#3CC46B'); mg.addColorStop(.5, '#FFC234'); mg.addColorStop(1, '#FF6B4A');
      ctx.fillStyle = mg; roundRect(ctx, MX, MTOP, MW, MBOT - MTOP, 8); ctx.fill();
      const zy = MTOP + (MBOT - MTOP) * 0, zh = (MBOT - MTOP) * win, inZone = ph === 'aim' && m >= 1 - win;
      ctx.fillStyle = inZone ? `rgba(255,255,255,${.55 + .3 * Math.sin(t * 14)})` : 'rgba(255,242,170,.55)';
      roundRect(ctx, MX, zy, MW, zh, 8); ctx.fill();
      ctx.strokeStyle = '#FFE27A'; ctx.lineWidth = 3; roundRect(ctx, MX, zy, MW, zh, 8); ctx.stroke();
      ctx.font = `700 14px ${FONT}`; ctx.fillStyle = '#FFE27A'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('POWER', MX + MW / 2, MTOP - 16);
      ctx.font = `20px ${FONT}`; ctx.fillText('★', MX + MW / 2, zy + zh / 2);
      const mv = ph === 'aim' ? m : power, my = MBOT - mv * (MBOT - MTOP);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1B1B1B'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(MX - 8, my - 10); ctx.lineTo(MX + MW + 14, my - 4); ctx.lineTo(MX + MW + 14, my + 4); ctx.lineTo(MX - 8, my + 10); ctx.closePath(); ctx.fill(); ctx.stroke();
      // tower
      const sx = shake ? Math.sin(t * 60) * 3 * shake : 0;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(TX - 13, TTOP, 32, TBASE - TTOP + 14);
      ctx.fillStyle = '#FFF3DC'; ctx.fillRect(TX - 16, TTOP, 32, TBASE - TTOP + 12);
      const span = TBASE - TTOP;
      BANDS.forEach((b, i) => {
        const y0 = TBASE - b[0] * span, y1 = TBASE - (BANDS[i + 1] ? BANDS[i + 1][0] : 1) * span;
        ctx.fillStyle = CONF[i % CONF.length]; ctx.fillRect(TX - 16, y1, 32, y0 - y1);
        ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(TX - 16, y1, 8, y0 - y1);
        ctx.fillStyle = '#FFF3DC'; ctx.fillRect(TX - 16, y1 - 1, 32, 2);
        const lit = (ph === 'top' || ph === 'down' || ph === 'fly') && puck >= b[0];
        if (!i) return;
        ctx.font = `700 ${i === BANDS.length - 1 ? 15 : 16}px ${FONT}`; ctx.textAlign = 'left';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(30,20,10,.75)'; ctx.strokeText(b[1], TX + 24, (y0 + y1) / 2);
        ctx.fillStyle = lit ? '#FFE27A' : '#fff'; ctx.fillText(b[1], TX + 24, (y0 + y1) / 2);
      });
      ctx.strokeStyle = '#4A5560'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(TX, TTOP - 4); ctx.lineTo(TX, TBASE); ctx.stroke();
      // bell
      ctx.save(); ctx.translate(TX + sx, TTOP - 22); ctx.rotate(shake ? Math.sin(t * 30) * .2 * shake : 0);
      const bg = ctx.createLinearGradient(-22, 0, 22, 0); bg.addColorStop(0, '#C28A00'); bg.addColorStop(.4, '#FFE27A'); bg.addColorStop(1, '#B07800');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(-22, 14); ctx.quadraticCurveTo(-20, -18, 0, -20); ctx.quadraticCurveTo(20, -18, 22, 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8A5A00'; ctx.fillRect(-24, 12, 48, 5);
      ctx.restore();
      if (flash > 0) for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + t; ctx.strokeStyle = '#FFE27A'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(TX + Math.cos(a) * 30, TTOP - 22 + Math.sin(a) * 30); ctx.lineTo(TX + Math.cos(a) * 42, TTOP - 22 + Math.sin(a) * 42); ctx.stroke(); }
      for (let i = 0; i < 7; i++) bulb(ctx, TX - 26, TTOP + 14 + i * 33, t, i, 3.2);
      // puck
      const py = TBASE - puck * span;
      ctx.fillStyle = '#E8463A'; roundRect(ctx, TX - 13, py - 10, 26, 16, 6); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)'; roundRect(ctx, TX - 10, py - 8, 12, 5, 3); ctx.fill();
      // base and pad
      ctx.fillStyle = '#5A361C'; roundRect(ctx, TX - 40, TBASE + 6, 80, 18, 6); ctx.fill();
      ctx.fillStyle = '#9AA5B1'; roundRect(ctx, TX - 2, TBASE + 1, 46, 8, 4); ctx.fill();
      ctx.fillStyle = '#E8463A'; ctx.beginPath(); ctx.arc(TX + 36, TBASE + 4, 8, 0, 7); ctx.fill();
      // mallet: pivot to the right, swings down onto the pad
      sign(ctx, 'Test Your Strength!', 250, 362, 15, '#C8332B', '#FFE27A');
      const piv = [300, 330], len = 100;
      const a = lerp(-Math.PI / 2 - .3, -Math.PI + .06, mal.a);
      const hx = piv[0] + Math.cos(a) * len, hy = piv[1] + Math.sin(a) * len;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#4A2B15'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(piv[0] + 14 * Math.cos(a + Math.PI), piv[1] + 14 * Math.sin(a + Math.PI)); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.strokeStyle = '#C8955A'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(piv[0] + 14 * Math.cos(a + Math.PI), piv[1] + 14 * Math.sin(a + Math.PI)); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = '#7A1E1A'; roundRect(ctx, -24, -14, 48, 30, 8); ctx.fill();
      ctx.fillStyle = '#C8332B'; roundRect(ctx, -24, -16, 48, 28, 8); ctx.fill();
      ctx.fillStyle = '#E9C67E'; ctx.fillRect(-26, -16, 6, 28); ctx.fillRect(20, -16, 6, 28);
      ctx.restore();
      ctx.lineCap = 'butt';
    };
  }

  register({ id: 'pennyfalls', cat: 'fair', order: 10, name: 'Penny Falls', icon: '🪙', desc: 'Drop pennies and push coins into the tray', gentle: true, start: startPenny });
  register({ id: 'claw', cat: 'fair', order: 11, name: 'Grab a Prize', icon: '🧸', desc: 'Steer the claw and grab a cuddly prize', gentle: true, start: startClaw });
  register({ id: 'strength', cat: 'fair', order: 12, name: 'Test Your Strength', icon: '🔨', desc: 'Swing the mallet and ring the bell', gentle: false, start: startStrength });
})();
