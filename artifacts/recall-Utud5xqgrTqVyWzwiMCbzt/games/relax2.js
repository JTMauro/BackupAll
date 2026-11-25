/* Recall: Relax games, part 2. No scores, nothing to win. Kaleidoscope, Knit a Scarf, Snow Globe, Rainy Window. */
(function () {
  const { register, el, sfx, tone, toast, cheer } = R;

  R.css(`
.r2-wrap{display:flex; flex-direction:column; align-items:center; gap:14px; width:100%; margin:0 auto}
.r2-wrap.r2-side{flex-direction:row; justify-content:center; align-items:center; gap:22px}
.r2-cv{display:block; width:100%; height:auto; border-radius:22px; cursor:pointer; user-select:none; -webkit-user-select:none; touch-action:manipulation;
  box-shadow:0 0 0 5px rgba(255,255,255,.2), 0 9px 0 5px rgba(0,0,0,.22), 0 18px 30px rgba(0,0,0,.32)}
.r2-cv.r2-drag{touch-action:none}
.r2-ctl{display:flex; flex-direction:column; gap:12px; width:100%}
.r2-side .r2-ctl{flex:0 0 310px; width:310px}
.r2-row.r2-balls{gap:6px}
.r2-row{display:grid; grid-template-columns:repeat(var(--n, 3), minmax(0, 1fr)); gap:10px; width:100%}
.r2-row .btn{min-height:60px; padding:.4em .3em; font-size:1.1rem; text-align:center}
.r2-row .btn.r2-col{flex-direction:column; gap:2px; min-height:70px}
.r2-ic{font-size:1.6rem; line-height:1; filter:drop-shadow(0 2px 1px rgba(0,0,0,.2))}
.r2-sel{outline:4px solid #fff; outline-offset:3px; transform:translateY(-2px)}
.r2-sw{display:block; width:34px; height:34px; border-radius:50%; box-shadow:inset 0 -4px 0 rgba(0,0,0,.2), 0 0 0 3px rgba(255,255,255,.8)}
.r2-ball{min-width:0; border:0; border-radius:50%; aspect-ratio:1; width:100%; max-width:68px; justify-self:center; cursor:pointer; padding:0;
  background:radial-gradient(circle at 34% 30%, rgba(255,255,255,.55), rgba(255,255,255,0) 42%),
    repeating-linear-gradient(60deg, rgba(0,0,0,0) 0 5px, rgba(0,0,0,.13) 5px 7px), var(--yc);
  box-shadow:inset 0 -6px 0 rgba(0,0,0,.18), 0 6px 0 rgba(0,0,0,.25), 0 10px 16px rgba(0,0,0,.25); transition:transform .1s}
.r2-ball:active{transform:translateY(4px)}
.r2-ball.r2-sel{outline-offset:4px}
.r2-wide{width:100%; font-size:1.3rem !important; min-height:66px !important}
.r2-done .btn{width:100%}
`);

  const G = [
    ['kaleido', 7, 'Kaleidoscope', '🔮', 'Draw glowing patterns that mirror round', startKaleido],
    ['scarf', 8, 'Knit a Scarf', '🧣', 'Pick wool and knit a cosy scarf, row by row', startScarf],
    ['snowglobe', 9, 'Snow Globe', '❄️', 'Shake the globe and watch the snow fall', startSnow],
    ['rainwindow', 10, 'Rainy Window', '🌧️', 'Draw in the mist on a rainy window', startRain]
  ];
  G.forEach(([id, order, name, icon, desc, start]) => register({ id, cat: 'relax', order, name, icon, desc, gentle: true, start }));

  /* ---------- shared toolkit ---------- */
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  const PENTA = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 784, 880, 1046.5, 1174.7, 1318.5];
  function bell(f, v = .1, delay = 0, len = 1.8) {
    tone(f, len, 'sine', v, delay);
    tone(f * 2, len * .5, 'sine', v * .25, delay);
    tone(f * 3, len * .25, 'sine', v * .08, delay);
  }
  function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function mix(h, to, a) { const c = hexRgb(h), t = to === 'w' ? [255, 255, 255] : [0, 0, 0]; return `rgb(${c.map((v, i) => Math.round(v + (t[i] - v) * a)).join(',')})`; }

  function setup(api, hFn, drag) {
    const wrap = el('div', 'r2-wrap');
    api.stage.append(wrap);
    const sw = api.stage.clientWidth || 340;
    const side = sw >= 640;
    if (side) wrap.classList.add('r2-side');
    const W = Math.round(side ? clamp(sw - 334, 300, 440) : clamp(sw, 280, 440));
    const H = Math.round(hFn(W));
    const d = Math.min(2, window.devicePixelRatio || 1);
    const cv = el('canvas', 'r2-cv' + (drag ? ' r2-drag' : ''));
    cv.width = Math.round(W * d); cv.height = Math.round(H * d); cv.style.maxWidth = W + 'px';
    const ctx = cv.getContext('2d'); ctx.setTransform(d, 0, 0, d, 0, 0);
    const ctl = el('div', 'r2-ctl');
    wrap.style.maxWidth = (side ? W + 332 : W) + 'px';
    const box = el('div', ''); box.style.cssText = `width:100%; max-width:${W}px; flex:0 1 ${W}px`;
    box.append(cv);
    wrap.append(box, ctl);
    const sc = clamp(W / 360, .82, 1.3);
    const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
    return { wrap, cv, ctx, ctl, W, H, d, sc, pos };
  }
  function layer(S) {
    const c = document.createElement('canvas'); c.width = S.cv.width; c.height = S.cv.height;
    const x = c.getContext('2d'); x.setTransform(S.d, 0, 0, S.d, 0, 0); return [c, x];
  }
  function loop(cv, fn, onStop) {
    let last = performance.now();
    function f(now) {
      if (!cv.isConnected) { if (onStop) onStop(); return; }
      const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
      fn(dt, now / 1000);
      requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  }
  function row(S, n) { const r = el('div', 'r2-row'); r.style.setProperty('--n', n); S.ctl.append(r); return r; }
  function button(parent, html, cls, fn, label) {
    const b = el('button', 'btn ' + cls, html); b.type = 'button';
    if (label) b.setAttribute('aria-label', label);
    b.onclick = () => fn(b); parent.append(b); return b;
  }
  function finishBtn(api, parent) {
    let fin = false;
    return button(parent, '✓ I’m finished', 'c-mint', b => {
      if (fin) return; fin = true; b.disabled = true; sfx.good(); api.done(3);
    });
  }
  function selectIn(map, key) { Object.entries(map).forEach(([k, b]) => { b.classList.toggle('r2-sel', String(k) === String(key)); b.setAttribute('aria-pressed', String(String(k) === String(key))); }); }
  function rrect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  /* =========================================================
     7. KALEIDOSCOPE
     ========================================================= */
  function startKaleido(level, api) {
    const S = setup(api, W => W, true);
    const { cv, ctx, W, H, sc } = S;
    const C = W / 2, RAD = W / 2 - 10 * sc;
    const [paint, p] = layer(S);
    const COLS = [
      { name: 'Rainbow', css: 'conic-gradient(#FF5A5A, #FFC234, #3CC46B, #45AEFF, #A98BFF, #FF5A9A, #FF5A5A)' },
      { name: 'Gold', h: 44, css: '#FFC234' },
      { name: 'Pink', h: 328, css: '#FF6FB0' },
      { name: 'Blue', h: 198, css: '#45C4FF' },
      { name: 'Green', h: 140, css: '#4BE38A' }
    ];
    const SYMS = [6, 8, 12];
    let col = 0, seg = SYMS[(level - 1) % 3], hueRun = rand(0, 360), fading = -1;
    let cur = null, autoS = null, autoLeft = 0, dist = 0, down = null;
    const W0 = 6.5 * sc;

    function newStroke(dot) {
      const c = COLS[col];
      if (c.h == null) hueRun = (hueRun + 47) % 360;
      return { pts: [], hue: c.h == null ? hueRun : c.h + rand(-10, 10), rain: c.h == null, seg, dot: !!dot };
    }
    function trace(c, st) {
      c.beginPath();
      if (st.dot) {
        const [x, y] = st.pts[0], r = 10 * sc;
        c.moveTo(x, y); c.lineTo(x + .01, y);
        for (let k = 0; k < 6; k++) { const a = k / 6 * TAU, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; c.moveTo(px, py); c.lineTo(px + .01, py); }
        return;
      }
      st.pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
      if (st.pts.length === 1) c.lineTo(st.pts[0][0] + .01, st.pts[0][1]);
    }
    function drawStroke(c, st) {
      if (!st.pts.length) return;
      const n = st.seg / 2;
      c.save(); c.beginPath(); c.arc(C, C, RAD, 0, TAU); c.clip();
      c.translate(C, C); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
      const w = st.dot ? W0 * .9 : W0;
      for (let k = 0; k < n; k++) for (const m of [1, -1]) {
        c.save(); c.rotate(k * TAU / n); if (m < 0) c.scale(1, -1);
        const h = st.rain ? (st.hue + k * 360 / n) % 360 : st.hue;
        trace(c, st);
        [[w * 3.4, `hsla(${h},100%,55%,.07)`], [w * 1.9, `hsla(${h},100%,60%,.17)`], [w, `hsla(${h},100%,66%,.6)`], [w * .36, `hsla(${h},100%,93%,.55)`]]
          .forEach(([lw, s]) => { c.lineWidth = lw; c.strokeStyle = s; c.stroke(); });
        c.restore();
      }
      c.restore();
    }
    function commit() { if (cur) { drawStroke(p, cur); cur = null; } }
    function addPt(x, y) {
      const dx = x - C, dy = y - C, L = Math.hypot(dx, dy), lim = RAD - 6 * sc;
      const q = L > lim ? [dx / L * lim, dy / L * lim] : [dx, dy];
      if (cur.pts.length) {
        const lp = cur.pts[cur.pts.length - 1], dd = Math.hypot(q[0] - lp[0], q[1] - lp[1]);
        if (dd < 2.5 * sc) return;
        dist += dd;
        if (dist > 55 * sc) { dist = 0; bell(PENTA[clamp(Math.floor(Math.hypot(q[0], q[1]) / RAD * 9) + 2, 0, 12)], .035); }
      }
      cur.pts.push(q);
      if (cur.pts.length > 150) { const last = cur.pts[cur.pts.length - 1], st = cur; commit(); cur = Object.assign({}, st, { pts: [last] }); }
    }
    cv.addEventListener('pointerdown', e => {
      if (fading >= 0) return;
      stopAuto();
      const q = S.pos(e); down = { id: e.pointerId, x: q.x, y: q.y, moved: false };
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    });
    cv.addEventListener('pointermove', e => {
      if (!down || e.pointerId !== down.id) return;
      const q = S.pos(e);
      if (!down.moved && Math.hypot(q.x - down.x, q.y - down.y) > 6 * sc) { down.moved = true; cur = newStroke(); addPt(down.x, down.y); }
      if (down.moved) addPt(q.x, q.y);
    });
    const end = e => {
      if (!down || e.pointerId !== down.id) return;
      if (down.moved) commit();
      else if (e.type === 'pointerup') {
        cur = newStroke(true); addPt(down.x, down.y); commit();
        const r = Math.hypot(down.x - C, down.y - C) / RAD;
        bell(PENTA[clamp(Math.floor(r * 8) + 3, 0, 12)], .06); bell(PENTA[clamp(Math.floor(r * 8) + 5, 0, 12)], .03, .09);
      }
      down = null;
    };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);

    function startAuto(n) { stopAuto(); autoLeft = n; nextAuto(); }
    function nextAuto() {
      if (autoLeft <= 0) { autoS = null; return; }
      autoLeft--;
      cur = newStroke();
      autoS = { t: 0, dur: rand(2.2, 3.2), r0: rand(.25, .7) * RAD, A: rand(.12, .32) * RAD, th0: rand(0, TAU), spin: rand(.5, 1.2) * (Math.random() < .5 ? -1 : 1), f: rand(2, 5), ph: rand(0, TAU) };
    }
    function stopAuto() { if (autoS) { commit(); autoS = null; autoLeft = 0; } }

    api.hint('Draw with your finger, or tap. Your pattern mirrors all the way round.');
    // controls
    const cRow = row(S, 5), cBtns = {};
    COLS.forEach((c, i) => {
      cBtns[i] = button(cRow, `<span class="r2-sw" style="background:${c.css}"></span>`, 'c-card', () => {
        col = i; selectIn(cBtns, i); bell(PENTA[4 + i], .07); api.hint(`${c.name} light. Draw or tap to make a pattern.`);
      }, c.name);
    });
    selectIn(cBtns, col);
    const sRow = row(S, 3), sBtns = {};
    SYMS.forEach(n => {
      sBtns[n] = button(sRow, `<span class="r2-ic">${n === 6 ? '❄️' : n === 8 ? '🌸' : '🌟'}</span><span>${n} parts</span>`, 'c-grape r2-col', () => {
        seg = n; selectIn(sBtns, n); sfx.tap(); api.hint(`Now your drawing mirrors into ${n} parts.`);
      });
    });
    selectIn(sBtns, seg);
    const aRow = row(S, 3);
    button(aRow, '<span class="r2-ic">✨</span><span>Auto</span>', 'c-sun r2-col', () => {
      if (fading >= 0) return; startAuto(3); api.hint('Watch a pattern draw itself. Draw any time to join in.');
    });
    button(aRow, '<span class="r2-ic">🌀</span><span>New pattern</span>', 'c-sky r2-col', () => {
      if (fading >= 0) return; stopAuto(); cur = null; fading = 0;
      [784, 659.25, 523.25, 392].forEach((f, k) => tone(f, .7, 'sine', .04, k * .1));
    });
    const fb = finishBtn(api, aRow); fb.classList.add('r2-col');

    startAuto(1);
    loop(cv, (dt, t) => {
      if (autoS) {
        autoS.t += dt;
        const a = autoS, u = Math.min(a.t, a.dur), steps = 3;
        for (let s = 1; s <= steps; s++) {
          const tt = u - dt + dt * s / steps; if (tt < 0) continue;
          const th = a.th0 + a.spin * tt, r = clamp(a.r0 + a.A * Math.sin(a.f * tt + a.ph), 12 * sc, RAD - 10 * sc);
          addPt(C + Math.cos(th) * r, C + Math.sin(th) * r);
        }
        if (a.t >= a.dur) { commit(); nextAuto(); }
      }
      if (fading >= 0) {
        fading += dt / .9;
        p.save(); p.globalCompositeOperation = 'destination-out'; p.fillStyle = 'rgba(0,0,0,.14)'; p.fillRect(0, 0, W, H); p.restore();
        if (fading >= 1) { fading = -1; p.clearRect(0, 0, W, H); api.hint('A fresh start. Draw with your finger, or tap.'); }
      }
      // backdrop
      const bg = ctx.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#3A2458'); bg.addColorStop(1, '#1C1236');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.beginPath(); ctx.arc(C, C, RAD, 0, TAU); ctx.clip();
      const dg = ctx.createRadialGradient(C, C, 0, C, C, RAD); dg.addColorStop(0, '#1A1440'); dg.addColorStop(1, '#07061A');
      ctx.fillStyle = dg; ctx.fillRect(0, 0, W, H);
      // faint wedge guides
      ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
      for (let k = 0; k < seg; k++) { const a = k / seg * TAU; ctx.beginPath(); ctx.moveTo(C, C); ctx.lineTo(C + Math.cos(a) * RAD, C + Math.sin(a) * RAD); ctx.stroke(); }
      ctx.drawImage(paint, 0, 0, W, H);
      ctx.restore();
      if (cur) drawStroke(ctx, cur);
      // brass rim + glass
      const rg = ctx.createLinearGradient(0, 0, W, H); rg.addColorStop(0, '#F7DFA0'); rg.addColorStop(.5, '#B88A3E'); rg.addColorStop(1, '#6E4C1C');
      ctx.strokeStyle = rg; ctx.lineWidth = 10 * sc; ctx.beginPath(); ctx.arc(C, C, RAD + 4 * sc, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(C, C, RAD + 8 * sc, Math.PI * 1.05, Math.PI * 1.6); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.beginPath(); ctx.ellipse(C - RAD * .38, C - RAD * .45, RAD * .38, RAD * .14, -.7, 0, TAU); ctx.fill();
    });
  }

  /* =========================================================
     8. KNIT A SCARF
     ========================================================= */
  function startScarf(level, api) {
    const S = setup(api, W => Math.min(W * .86, 380));
    const { cv, ctx, W, H, sc, d } = S;
    const YARN = [
      { n: 'Red', c: '#E2443C' }, { n: 'Yellow', c: '#FFC234' }, { n: 'Blue', c: '#3D9CF0' },
      { n: 'Green', c: '#36B567' }, { n: 'Purple', c: '#9466F2' }
    ];
    const CREAM = '#FFF2DA';
    const PATS = [['plain', '▢', 'Plain'], ['stripes', '▤', 'Stripes'], ['spots', '●', 'Spots'], ['hearts', '♥', 'Hearts']];
    const HEART = ['..X..', '.XXX.', 'XXXXX', 'XXXXX', '.X.X.'];
    const COLS = 11;
    const scW = Math.round(W * .56), sw = scW / COLS, rh = sw * .8;
    const x0 = Math.round((W - scW) / 2) - 10 * sc, needleY = 34 * sc, topY = needleY + 3 * sc;
    let yarn = (level - 1) % YARN.length, pat = 'plain', pr = 0;
    let rows = [], anim = null, queue = 0, mode = 'knit', reveal = null, ballRot = 0;
    const sprites = {};
    function sprite(hex) {
      if (sprites[hex]) return sprites[hex];
      const c = document.createElement('canvas'); c.width = Math.ceil(sw * d); c.height = Math.ceil(rh * 1.5 * d);
      const x = c.getContext('2d'); x.scale(d, d);
      x.fillStyle = mix(hex, 'k', .45); x.fillRect(0, rh * .25, sw, rh * 1.02);
      [-1, 1].forEach(s => {
        x.save(); x.translate(sw / 2 + s * sw * .22, rh * .72); x.rotate(s * .5);
        const g = x.createRadialGradient(-sw * .06, -rh * .25, 1, 0, 0, rh * .7);
        g.addColorStop(0, mix(hex, 'w', .45)); g.addColorStop(.45, hex); g.addColorStop(1, mix(hex, 'k', .3));
        x.fillStyle = g; x.beginPath(); x.ellipse(0, 0, sw * .25, rh * .62, 0, 0, TAU); x.fill();
        x.strokeStyle = mix(hex, 'k', .4); x.lineWidth = .8; x.stroke();
        x.strokeStyle = mix(hex, 'w', .3); x.globalAlpha = .55; x.lineWidth = .7;
        x.beginPath(); x.moveTo(-sw * .05, -rh * .4); x.quadraticCurveTo(sw * .03, 0, -sw * .04, rh * .38); x.stroke();
        x.restore();
      });
      return (sprites[hex] = c);
    }
    function rowColours() {
      const main = YARN[yarn].c, out = [];
      for (let c = 0; c < COLS; c++) {
        let alt = false;
        if (pat === 'stripes') alt = Math.floor(pr / 2) % 2 === 1;
        else if (pat === 'spots') alt = (pr % 4 === 1 && c % 4 === 1) || (pr % 4 === 3 && c % 4 === 3);
        else if (pat === 'hearts') { const ri = pr % 8 - 1; alt = ri >= 0 && ri < 5 && c >= 3 && c <= 7 && HEART[ri][c - 3] === 'X'; }
        out.push(alt ? CREAM : main);
      }
      pr++;
      return out;
    }
    // background wallpaper
    const [bgL, b] = layer(S);
    b.fillStyle = '#F6E2C2'; b.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 28 * sc) { b.fillStyle = 'rgba(214,150,120,.13)'; b.fillRect(x, 0, 12 * sc, H); }
    b.fillStyle = 'rgba(200,90,90,.22)';
    for (let y = 18 * sc, i = 0; y < H; y += 34 * sc, i++) for (let x = (i % 2 ? 20 : 34) * sc; x < W; x += 56 * sc) {
      for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + .78; b.beginPath(); b.arc(x + Math.cos(a) * 3.4 * sc, y + Math.sin(a) * 3.4 * sc, 2.6 * sc, 0, TAU); b.fill(); }
    }
    const vg = b.createRadialGradient(W / 2, H * .4, W * .2, W / 2, H * .5, W * .85); vg.addColorStop(0, 'rgba(255,240,210,0)'); vg.addColorStop(1, 'rgba(120,70,30,.28)');
    b.fillStyle = vg; b.fillRect(0, 0, W, H);

    function knitRow() {
      if (mode !== 'knit') return;
      if (anim) { queue = Math.min(queue + 1, 4); return; }
      rows.unshift(rowColours());
      anim = { t: 0, dur: .8, shown: 0 };
      api.hint('Knit, knit, knit… Tap again for another row.');
    }
    for (let i = 0; i < 4; i++) rows.unshift(rowColours());

    function drawRowAt(c, r, x, y, n, scale = 1) {
      for (let k = 0; k < n; k++) c.drawImage(sprite(r[k]), x + k * sw * scale, y - rh * .25 * scale, sw * scale, rh * 1.5 * scale);
    }
    function drawNeedles(tipX, alpha) {
      ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'round';
      const wood = (x1, y1, x2, y2, th) => {
        ctx.strokeStyle = '#7A4A28'; ctx.lineWidth = th + 2 * sc; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.strokeStyle = '#C98F55'; ctx.lineWidth = th; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,240,210,.6)'; ctx.lineWidth = th * .3; ctx.beginPath(); ctx.moveTo(x1, y1 - th * .2); ctx.lineTo(x2, y2 - th * .2); ctx.stroke();
      };
      // holding needle (left), knob on left
      wood(x0 - 30 * sc, needleY, x0 + scW + 6 * sc, needleY, 6 * sc);
      ctx.fillStyle = '#E2443C'; ctx.beginPath(); ctx.arc(x0 - 32 * sc, needleY, 8 * sc, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(x0 - 34 * sc, needleY - 3 * sc, 2.5 * sc, 0, TAU); ctx.fill();
      // working needle
      const ty = needleY + 2 * sc, tx2 = tipX + 70 * sc, ty2 = -10 * sc;
      wood(tipX, ty, tx2, ty2, 6 * sc);
      ctx.restore();
      return [tipX, ty];
    }
    function drawBall(x, y, r, hex) {
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = 'rgba(80,40,10,.25)'; ctx.beginPath(); ctx.ellipse(3 * sc, r * .92, r * 1.05, r * .28, 0, 0, TAU); ctx.fill();
      const g = ctx.createRadialGradient(-r * .35, -r * .4, r * .1, 0, 0, r * 1.05); g.addColorStop(0, mix(hex, 'w', .45)); g.addColorStop(.6, hex); g.addColorStop(1, mix(hex, 'k', .35));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip(); ctx.rotate(ballRot);
      ctx.strokeStyle = mix(hex, 'k', .25); ctx.lineWidth = 1.6 * sc;
      for (let k = -4; k <= 4; k++) { ctx.beginPath(); ctx.ellipse(k * r * .22, 0, r * .35, r * 1.1, .5, 0, TAU); ctx.stroke(); }
      ctx.restore(); ctx.restore();
    }

    cv.addEventListener('pointerdown', () => { if (mode === 'knit') knitRow(); });

    // controls
    const yRow = row(S, 5), yBtns = {}; yRow.classList.add('r2-balls');
    YARN.forEach((y, i) => {
      const bt = el('button', 'r2-ball'); bt.type = 'button'; bt.style.setProperty('--yc', y.c); bt.setAttribute('aria-label', y.n + ' wool');
      bt.onclick = () => { yarn = i; selectIn(yBtns, i); tone(330 + i * 40, .2, 'sine', .07); api.hint(`${y.n} wool. Tap “Knit a row”.`); };
      yBtns[i] = bt; yRow.append(bt);
    });
    selectIn(yBtns, yarn);
    const pRow = row(S, 4), pBtns = {};
    PATS.forEach(([id, ic, label]) => {
      pBtns[id] = button(pRow, `<span class="r2-ic">${ic}</span><span>${label}</span>`, 'c-card r2-col', () => {
        pat = id; pr = 0; selectIn(pBtns, id); sfx.tap();
        api.hint(id === 'plain' ? 'Plain knitting. Tap “Knit a row”.' : `${label} in cream wool. Knit a few rows to see them.`);
      });
    });
    selectIn(pBtns, pat);
    const kRow = row(S, 1);
    const knitBtn = button(kRow, '🧶 Knit a row', 'c-coral r2-wide', () => {
      if (mode === 'knit') knitRow();
      else { // start a new scarf
        mode = 'knit'; reveal = null; rows = []; pr = 0; for (let i = 0; i < 4; i++) rows.unshift(rowColours());
        knitBtn.textContent = '🧶 Knit a row'; tasBtn.disabled = false; sfx.tap();
        api.hint('A new scarf. Choose your wool and knit a row.');
      }
    });
    const fRow = row(S, 2);
    const tasBtn = button(fRow, '🎀 Add tassels', 'c-rose', () => {
      if (mode !== 'knit') return;
      while (rows.length < 8) rows.unshift(rowColours());
      anim = null; queue = 0; mode = 'reveal'; tasBtn.disabled = true;
      buildReveal();
      knitBtn.textContent = '🧶 Start a new scarf';
      [523.25, 659.25, 784, 1046.5].forEach((f, k) => bell(f, .06, k * .14));
      api.hint(`What a lovely scarf, ${rows.length} rows long! Tap “I’m finished” when you like.`);
      toast('Lovely knitting!');
    });
    finishBtn(api, fRow);
    api.hint('Pick a ball of wool, then tap “Knit a row” or tap the needles.');

    function buildReveal() {
      const tl = rh * 3.2, L = rows.length * rh + tl * 2;
      const s = Math.min(1, (H - 20 * sc) / L);
      const [lay, c] = layer(S);
      const w = scW * s, x = (W - w) / 2, y = (H - L * s) / 2 + tl * s;
      c.fillStyle = 'rgba(90,45,15,.25)'; rrect(c, x + 6 * sc, y + 6 * sc, w, rows.length * rh * s, 4); c.fill();
      rows.forEach((r, k) => drawRowAt(c, r, x, y + k * rh * s, COLS, s));
      reveal = { lay, s, x, y, w, tl, t: 0, len: rows.length * rh * s };
    }
    function tassels(rv, g) {
      const s = rv.s, len = rv.tl * s * g;
      [[0, -1], [rows.length - 1, 1]].forEach(([ri, dir]) => {
        const r = rows[ri], ey = dir < 0 ? rv.y : rv.y + rv.len;
        for (let c = 0; c < COLS; c += 2) {
          const cx = rv.x + (c + .5) * sw * s, hex = r[c];
          ctx.lineCap = 'round';
          ctx.save(); ctx.shadowColor = 'rgba(80,40,10,.55)'; ctx.shadowBlur = 2; ctx.shadowOffsetY = 1;
          for (let k = -2; k <= 2; k++) {
            const sway = Math.sin(performance.now() / 900 + c + k) * 1.5 * sc;
            ctx.strokeStyle = k % 2 ? mix(hex, 'k', .2) : hex; ctx.lineWidth = Math.max(1.4, 2.4 * s * sc);
            ctx.beginPath(); ctx.moveTo(cx + k * sw * s * .1, ey); ctx.quadraticCurveTo(cx + k * sw * s * .2, ey + dir * len * .5, cx + k * sw * s * .3 + sway, ey + dir * len); ctx.stroke();
          }
          ctx.fillStyle = mix(hex, 'k', .3); ctx.beginPath(); ctx.ellipse(cx, ey + dir * len * .22, sw * s * .32, Math.max(1.5, rh * s * .25), 0, 0, TAU); ctx.fill(); ctx.restore();
        }
      });
    }

    loop(cv, dt => {
      ctx.drawImage(bgL, 0, 0, W, H);
      if (mode === 'reveal' && reveal) {
        reveal.t = Math.min(1, reveal.t + dt / 1.1);
        ctx.globalAlpha = ease(Math.min(1, reveal.t * 1.6));
        ctx.drawImage(reveal.lay, 0, 0, W, H);
        tassels(reveal, ease(clamp(reveal.t * 1.4 - .3, 0, 1)));
        ctx.globalAlpha = 1;
        return;
      }
      let off = 0, shown = COLS;
      if (anim) {
        anim.t += dt; const u = Math.min(1, anim.t / anim.dur);
        off = -rh * (1 - ease(Math.min(1, u * 1.4)));
        shown = Math.min(COLS, Math.floor(u * COLS + .5));
        ballRot += dt * 3;
        while (anim.shown < shown) { anim.shown++; if (anim.shown % 2) tone(rand(1500, 1900), .03, 'triangle', .02); }
        if (u >= 1) {
          tone(330, .12, 'sine', .05);
          if (rows.length % 25 === 0) toast(cheer());
          anim = null;
          if (queue > 0) { queue--; knitRow(); }
        }
      }
      // scarf shadow
      const vis = Math.min(rows.length, Math.ceil((H - topY) / rh) + 2);
      ctx.fillStyle = 'rgba(90,45,15,.22)'; ctx.fillRect(x0 + 6 * sc, topY + 6 * sc, scW, Math.min(H, vis * rh + off));
      for (let k = vis - 1; k >= 0; k--) {
        const y = topY + k * rh + off;
        if (y > H) continue;
        drawRowAt(ctx, rows[k], x0, y, k === 0 ? shown : COLS);
      }
      const tipX = x0 + (anim ? Math.min(shown, COLS) : COLS) * sw;
      const [tx, ty] = drawNeedles(tipX, 1);
      // yarn strand to the ball
      const bx = W - 34 * sc, by = H - 36 * sc, hex = YARN[yarn].c;
      ctx.strokeStyle = hex; ctx.lineWidth = 2.6 * sc; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.bezierCurveTo(tx + 30 * sc, ty + 80 * sc, bx - 10 * sc, by - 90 * sc, bx, by - 20 * sc); ctx.stroke();
      drawBall(bx, by, 24 * sc, hex);
      // row count
      ctx.font = `600 ${Math.round(17 * sc)}px Fredoka, system-ui, sans-serif`; ctx.textBaseline = 'bottom';
      const txt = `${rows.length} rows`, tw = ctx.measureText(txt).width;
      ctx.fillStyle = 'rgba(255,248,235,.85)'; rrect(ctx, 8 * sc, H - 34 * sc, tw + 18 * sc, 26 * sc, 13 * sc); ctx.fill();
      ctx.fillStyle = '#5A361C'; ctx.fillText(txt, 17 * sc, H - 12 * sc);
    });
  }

  /* =========================================================
     9. SNOW GLOBE
     ========================================================= */
  function startSnow(level, api) {
    const S = setup(api, W => W * .4 * 2.3 + 22);
    const { cv, ctx, W, H, sc } = S;
    const R0 = W * .4, gx = W / 2, gy = R0 + 10, u = R0 / 100;
    const SCENES = [
      { id: 'cottage', ic: '🏡', name: 'Cottage', sky: ['#14224F', '#3D4F98', '#7C86C8'], ph: .4 },
      { id: 'village', ic: '🏘️', name: 'Village', sky: ['#2E2866', '#8A6AB0', '#F2A7A8'], ph: 1.7 },
      { id: 'snowman', ic: '⛄', name: 'Snowman', sky: ['#5BB0EE', '#9AD3F7', '#DDF2FF'], ph: 2.6 },
      { id: 'pines', ic: '🌲', name: 'Pine wood', sky: ['#0F3550', '#2F6A86', '#86B7C4'], ph: 3.3 }
    ];
    let si = (level - 1) % SCENES.length, scene = SCENES[si];
    const ground = x => gy + 30 * u + Math.sin((x - gx) / R0 * 2.2 + scene.ph) * 6 * u;
    let sceneL = null, swirl = 0, shakeT = 0, chimney = null, glowSpots = [];

    function pine(c, x, yb, h) {
      c.fillStyle = '#5A3A22'; c.fillRect(x - h * .05, yb - h * .14, h * .1, h * .16);
      for (let k = 0; k < 3; k++) {
        const ty = yb - h * .12 - k * h * .26, w = h * (.42 - k * .1), th = h * .42;
        c.fillStyle = k % 2 ? '#2A7A4E' : '#1F6A44';
        c.beginPath(); c.moveTo(x - w, ty); c.lineTo(x, ty - th); c.lineTo(x + w, ty); c.closePath(); c.fill();
        c.fillStyle = '#FFFFFF';
        c.beginPath(); c.moveTo(x - w * .45, ty - th * .55); c.lineTo(x, ty - th); c.lineTo(x + w * .45, ty - th * .55);
        c.quadraticCurveTo(x + w * .2, ty - th * .45, x, ty - th * .52); c.quadraticCurveTo(x - w * .2, ty - th * .45, x - w * .45, ty - th * .55); c.fill();
      }
    }
    function windowAt(c, x, y, w, h) {
      glowSpots.push([x + w / 2, y + h / 2, w * 1.6]);
      const g = c.createRadialGradient(x + w / 2, y + h / 2, 1, x + w / 2, y + h / 2, w * 1.6);
      g.addColorStop(0, 'rgba(255,214,120,.55)'); g.addColorStop(1, 'rgba(255,214,120,0)');
      c.fillStyle = g; c.fillRect(x - w, y - h, w * 3, h * 3);
      c.fillStyle = '#FFD878'; c.fillRect(x, y, w, h);
      c.fillStyle = '#7A4A28'; c.fillRect(x + w / 2 - .7 * u, y, 1.4 * u, h); c.fillRect(x, y + h / 2 - .7 * u, w, 1.4 * u);
    }
    function house(c, x, yb, w, h, wall, roof, opt = {}) {
      if (opt.chim) { c.fillStyle = '#8A4B3A'; c.fillRect(x + w * .18, yb - h - h * .55, w * .14, h * .4); c.fillStyle = '#fff'; c.fillRect(x + w * .16, yb - h - h * .58, w * .18, h * .08); chimney = [x + w * .25, yb - h - h * .6]; }
      c.fillStyle = wall; c.fillRect(x - w / 2, yb - h, w, h);
      c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(x + w * .25, yb - h, w * .25, h);
      c.fillStyle = roof; c.beginPath(); c.moveTo(x - w * .62, yb - h + 1.5 * u); c.lineTo(x, yb - h - h * .62); c.lineTo(x + w * .62, yb - h + 1.5 * u); c.closePath(); c.fill();
      c.fillStyle = '#FFFFFF'; c.beginPath(); c.moveTo(x - w * .62, yb - h - .5 * u); c.lineTo(x, yb - h - h * .66); c.lineTo(x + w * .62, yb - h - .5 * u);
      c.quadraticCurveTo(x + w * .3, yb - h - h * .12, x, yb - h - h * .22); c.quadraticCurveTo(x - w * .3, yb - h - h * .1, x - w * .62, yb - h - .5 * u); c.fill();
      c.fillStyle = opt.door || '#B23A3A'; rrect(c, x - w * .12, yb - h * .5, w * .24, h * .5, w * .1); c.fill();
      c.fillStyle = '#FFD24A'; c.beginPath(); c.arc(x + w * .07, yb - h * .25, .9 * u, 0, TAU); c.fill();
      windowAt(c, x - w * .4, yb - h * .72, w * .2, h * .3);
      windowAt(c, x + w * .2, yb - h * .72, w * .2, h * .3);
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x, yb, w * .62, 2.6 * u, 0, 0, TAU); c.fill();
    }
    function church(c, x, yb, s) {
      const w = 22 * u * s, h = 26 * u * s;
      c.fillStyle = '#E9DDC8'; c.fillRect(x - w / 2, yb - h, w, h);
      c.fillStyle = '#E9DDC8'; c.fillRect(x - w * .2, yb - h - 18 * u * s, w * .4, 18 * u * s);
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - w * .28, yb - h - 18 * u * s); c.lineTo(x, yb - h - 38 * u * s); c.lineTo(x + w * .28, yb - h - 18 * u * s); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - w * .6, yb - h); c.lineTo(x, yb - h - 10 * u * s); c.lineTo(x + w * .6, yb - h); c.fill();
      c.strokeStyle = '#C9A24A'; c.lineWidth = 1.2 * u; c.beginPath(); c.moveTo(x, yb - h - 38 * u * s); c.lineTo(x, yb - h - 45 * u * s); c.moveTo(x - 3 * u * s, yb - h - 42 * u * s); c.lineTo(x + 3 * u * s, yb - h - 42 * u * s); c.stroke();
      windowAt(c, x - 3 * u * s, yb - h - 13 * u * s, 6 * u * s, 7 * u * s);
      windowAt(c, x - 7 * u * s, yb - h * .8, 5 * u * s, 9 * u * s); windowAt(c, x + 2 * u * s, yb - h * .8, 5 * u * s, 9 * u * s);
      c.fillStyle = '#7A4A28'; rrect(c, x - 3 * u * s, yb - 10 * u * s, 6 * u * s, 10 * u * s, 3 * u * s); c.fill();
    }
    function lamp(c, x, yb, h) {
      const g = c.createRadialGradient(x, yb - h, 1, x, yb - h, 18 * u); g.addColorStop(0, 'rgba(255,220,130,.7)'); g.addColorStop(1, 'rgba(255,220,130,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, yb - h, 18 * u, 0, TAU); c.fill();
      glowSpots.push([x, yb - h, 14 * u]);
      c.fillStyle = '#2C2C38'; c.fillRect(x - .9 * u, yb - h, 1.8 * u, h);
      c.fillStyle = '#FFE39A'; c.beginPath(); c.arc(x, yb - h, 3 * u, 0, TAU); c.fill();
      c.fillStyle = '#2C2C38'; c.fillRect(x - 3.4 * u, yb - h - 4 * u, 6.8 * u, 1.6 * u);
    }
    function snowman(c, x, yb, s) {
      [[0, -9, 13], [0, -27, 10], [0, -42, 7.5]].forEach(([dx, dy, r]) => {
        const g = c.createRadialGradient(x + dx * u * s - r * .4 * u * s, yb + dy * u * s - r * .4 * u * s, 1, x + dx * u * s, yb + dy * u * s, r * u * s);
        g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#C6D9EE'); c.fillStyle = g;
        c.beginPath(); c.arc(x + dx * u * s, yb + dy * u * s, r * u * s, 0, TAU); c.fill();
      });
      const hy = yb - 42 * u * s;
      c.strokeStyle = '#6B4425'; c.lineWidth = 1.6 * u * s; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x - 9 * u * s, yb - 28 * u * s); c.lineTo(x - 21 * u * s, yb - 36 * u * s); c.moveTo(x + 9 * u * s, yb - 28 * u * s); c.lineTo(x + 21 * u * s, yb - 37 * u * s); c.stroke();
      c.fillStyle = '#E2443C'; c.fillRect(x - 8 * u * s, hy + 5 * u * s, 16 * u * s, 3.2 * u * s); c.fillRect(x + 3 * u * s, hy + 6 * u * s, 3.5 * u * s, 10 * u * s);
      c.fillStyle = '#22222C'; c.fillRect(x - 8 * u * s, hy - 7.5 * u * s, 16 * u * s, 2.2 * u * s); c.fillRect(x - 5.5 * u * s, hy - 17 * u * s, 11 * u * s, 10 * u * s);
      c.fillStyle = '#E2443C'; c.fillRect(x - 5.5 * u * s, hy - 10 * u * s, 11 * u * s, 2 * u * s);
      c.fillStyle = '#22222C'; [[-2.6, -1.5], [2.6, -1.5], [0, 13], [0, 18], [0, 23]].forEach(([dx, dy]) => { c.beginPath(); c.arc(x + dx * u * s, hy + dy * u * s, 1.1 * u * s, 0, TAU); c.fill(); });
      c.fillStyle = '#FF8A2A'; c.beginPath(); c.moveTo(x, hy); c.lineTo(x + 8 * u * s, hy + 1.5 * u * s); c.lineTo(x, hy + 2.4 * u * s); c.fill();
    }
    function buildScene() {
      chimney = null; glowSpots = [];
      const [lay, c] = layer(S);
      c.save(); c.beginPath(); c.arc(gx, gy, R0, 0, TAU); c.clip();
      const sk = c.createLinearGradient(0, gy - R0, 0, gy + 30 * u);
      sk.addColorStop(0, scene.sky[0]); sk.addColorStop(.6, scene.sky[1]); sk.addColorStop(1, scene.sky[2]);
      c.fillStyle = sk; c.fillRect(gx - R0, gy - R0, R0 * 2, R0 * 2);
      const night = scene.id !== 'snowman';
      if (night) {
        c.fillStyle = 'rgba(255,255,255,.8)';
        for (let k = 0; k < 26; k++) { c.globalAlpha = rand(.3, .9); c.beginPath(); c.arc(gx + rand(-R0, R0), gy - rand(5, 95) * u, rand(.5, 1.3) * u, 0, TAU); c.fill(); }
        c.globalAlpha = 1;
        const mx = gx + 42 * u, my = gy - 55 * u, mg = c.createRadialGradient(mx, my, 2, mx, my, 26 * u);
        mg.addColorStop(0, 'rgba(255,248,220,.45)'); mg.addColorStop(1, 'rgba(255,248,220,0)'); c.fillStyle = mg; c.fillRect(mx - 30 * u, my - 30 * u, 60 * u, 60 * u);
        c.fillStyle = '#FFF6D8'; c.beginPath(); c.arc(mx, my, 9 * u, 0, TAU); c.fill();
      } else {
        c.fillStyle = 'rgba(255,240,180,.9)'; c.beginPath(); c.arc(gx - 50 * u, gy - 52 * u, 10 * u, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,.85)';
        [[gx + 30 * u, gy - 60 * u], [gx - 10 * u, gy - 40 * u]].forEach(([x, y]) => { [0, 7, 14].forEach((dx, i) => { c.beginPath(); c.arc(x + dx * u, y - (i === 1 ? 3 : 0) * u, (i === 1 ? 7 : 5) * u, 0, TAU); c.fill(); }); });
      }
      // far hills
      c.fillStyle = night ? '#C8D4EE' : '#EAF4FF';
      c.beginPath(); c.moveTo(gx - R0, gy + 20 * u);
      for (let x = gx - R0; x <= gx + R0; x += 4) c.lineTo(x, gy + 14 * u + Math.sin((x - gx) / R0 * 3.1 + scene.ph * 2) * 9 * u);
      c.lineTo(gx + R0, gy + R0); c.lineTo(gx - R0, gy + R0); c.fill();
      // scene objects (back)
      const G = x => ground(x);
      if (scene.id === 'cottage') {
        pine(c, gx - 62 * u, G(gx - 62 * u) - 6 * u, 46 * u); pine(c, gx + 64 * u, G(gx + 64 * u) - 4 * u, 52 * u); pine(c, gx - 44 * u, G(gx - 44 * u) - 2 * u, 34 * u);
        house(c, gx + 2 * u, G(gx) + 2 * u, 44 * u, 28 * u, '#F2C27A', '#B23A3A', { chim: true, door: '#3B6FB8' });
      } else if (scene.id === 'village') {
        church(c, gx - 34 * u, G(gx - 34 * u) - 6 * u, .9);
        house(c, gx + 30 * u, G(gx + 30 * u) - 6 * u, 28 * u, 20 * u, '#9EC6E8', '#5A5A78', { door: '#B23A3A' });
        house(c, gx - 2 * u, G(gx) + 6 * u, 30 * u, 22 * u, '#F7A6A0', '#6A3A2A', { chim: true, door: '#2F7A4E' });
        house(c, gx + 58 * u, G(gx + 58 * u) + 3 * u, 24 * u, 18 * u, '#FFE08A', '#3B6FB8');
        lamp(c, gx - 56 * u, G(gx - 56 * u) + 8 * u, 28 * u);
      } else if (scene.id === 'snowman') {
        house(c, gx + 52 * u, G(gx + 52 * u) - 10 * u, 22 * u, 15 * u, '#E9DDC8', '#B23A3A', { chim: true });
        pine(c, gx - 58 * u, G(gx - 58 * u) - 2 * u, 48 * u);
        snowman(c, gx + 2 * u, G(gx) + 8 * u, 1.05);
      } else {
        [[-70, -10, 34], [-40, -14, 44], [48, -12, 40], [72, -8, 30], [-62, 4, 52], [62, 6, 56]].forEach(([dx, dy, h]) => pine(c, gx + dx * u, G(gx + dx * u) + dy * u, h * u));
        house(c, gx + 4 * u, G(gx) + 4 * u, 30 * u, 20 * u, '#8A5A3A', '#5A3A22', { chim: true, door: '#E2A23A' });
      }
      // foreground snow
      const sg = c.createLinearGradient(0, gy + 20 * u, 0, gy + R0);
      sg.addColorStop(0, '#FFFFFF'); sg.addColorStop(1, night ? '#B9C8EA' : '#CFE3F7');
      c.fillStyle = sg; c.beginPath(); c.moveTo(gx - R0, G(gx - R0) + 12 * u);
      for (let x = gx - R0; x <= gx + R0; x += 3) c.lineTo(x, G(x) + 12 * u);
      c.lineTo(gx + R0, gy + R0); c.lineTo(gx - R0, gy + R0); c.fill();
      c.restore();
      sceneL = lay;
    }
    // base
    const [baseL, bc] = layer(S);
    (function () {
      const top = gy + R0 * .72, bot = H - 6, tw = R0 * 1.5, bw = R0 * 1.92;
      bc.fillStyle = 'rgba(0,0,0,.25)'; bc.beginPath(); bc.ellipse(gx, bot - 2, bw * .55, 8 * sc, 0, 0, TAU); bc.fill();
      const wg = bc.createLinearGradient(gx - bw / 2, 0, gx + bw / 2, 0);
      wg.addColorStop(0, '#5A2F16'); wg.addColorStop(.35, '#A8683A'); wg.addColorStop(.6, '#8A5228'); wg.addColorStop(1, '#4A2510');
      bc.fillStyle = wg; bc.beginPath(); bc.moveTo(gx - tw / 2, top); bc.lineTo(gx + tw / 2, top); bc.lineTo(gx + bw / 2, bot - 8); bc.quadraticCurveTo(gx + bw / 2, bot, gx + bw / 2 - 8, bot); bc.lineTo(gx - bw / 2 + 8, bot); bc.quadraticCurveTo(gx - bw / 2, bot, gx - bw / 2, bot - 8); bc.closePath(); bc.fill();
      const br = bc.createLinearGradient(0, top, 0, top + 9 * sc); br.addColorStop(0, '#F7DFA0'); br.addColorStop(1, '#A47A35');
      bc.fillStyle = br; bc.beginPath(); bc.ellipse(gx, top, tw / 2 + 4 * sc, 9 * sc, 0, 0, TAU); bc.fill();
      bc.fillStyle = 'rgba(255,255,255,.18)'; bc.fillRect(gx - tw * .38, top + 12 * sc, 6 * sc, bot - top - 26 * sc);
    })();
    function plate() {
      const top = gy + R0 * .72, bot = H - 6, py = (top + bot) / 2 + 6 * sc, pw = R0 * .9, ph = 24 * sc;
      const g = ctx.createLinearGradient(0, py - ph / 2, 0, py + ph / 2); g.addColorStop(0, '#F6DDA5'); g.addColorStop(1, '#C99A4B');
      ctx.fillStyle = g; rrect(ctx, gx - pw / 2, py - ph / 2, pw, ph, 8 * sc); ctx.fill();
      ctx.fillStyle = '#3A2410'; ctx.font = `600 ${Math.round(16 * sc)}px Fredoka, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(scene.name, gx, py + 1); ctx.textAlign = 'left';
    }

    // snow
    const N = 230, flakes = [];
    for (let i = 0; i < N; i++) flakes.push({ x: 0, y: 0, vx: 0, vy: 0, r: rand(1.1, 3) * sc, fall: rand(9, 20) * sc, ph: rand(0, TAU), dep: rand(0, 1), s: false, a: rand(.65, 1) });
    function scatterTop() {
      flakes.forEach(f => {
        let x, y; do { x = gx + rand(-R0, R0); y = gy + rand(-R0, R0 * .3); } while (Math.hypot(x - gx, y - gy) > R0 - 8);
        f.x = x; f.y = y; f.vx = 0; f.vy = f.fall * .6; f.s = false;
      });
    }
    const settleY = f => Math.min(ground(f.x) + 12 * u + f.dep * 40 * u, gy + Math.sqrt(Math.max(0, (R0 - 8) ** 2 - (f.x - gx) ** 2)) - 3);
    function shake() {
      swirl = 1; shakeT = 1;
      flakes.forEach(f => {
        f.s = false; f.vx = rand(-1, 1) * 160 * sc; f.vy = -rand(70, 240) * sc;
      });
      [0, 1, 2, 3, 4].forEach(k => bell(PENTA[7 + Math.floor(Math.random() * 6)], .035, k * .09 + rand(0, .05), 1.2));
      api.hint('Swirl, swirl… now watch the snow settle slowly.');
    }
    cv.addEventListener('pointerdown', e => {
      const q = S.pos(e);
      if (Math.hypot(q.x - gx, q.y - gy) > R0 + 6) { shake(); return; }
      let n = 0;
      flakes.forEach(f => {
        const dx = f.x - q.x, dy = f.y - q.y, dd = Math.hypot(dx, dy);
        if (dd < R0 * .6) { n++; f.s = false; const k = (1 - dd / (R0 * .6)); f.vx += (dx / (dd || 1)) * 140 * sc * k + rand(-30, 30) * sc; f.vy += -rand(60, 170) * sc * k; }
      });
      swirl = Math.max(swirl, .35); shakeT = Math.max(shakeT, .25);
      bell(PENTA[6 + Math.floor(Math.random() * 6)], .04, 0, 1.2); bell(PENTA[8 + Math.floor(Math.random() * 4)], .025, .08, 1);
      api.hint('Lovely. Tap again, or press “Shake”.');
    });

    // controls
    const scRow = row(S, 4), scBtns = {};
    SCENES.forEach((s, i) => {
      scBtns[i] = button(scRow, `<span class="r2-ic">${s.ic}</span><span>${s.name}</span>`, 'c-card r2-col', () => {
        if (si === i) { shake(); return; }
        si = i; scene = s; selectIn(scBtns, i); buildScene(); scatterTop();
        bell(523.25, .06); bell(783.99, .04, .1);
        api.hint(`The ${s.name.toLowerCase()}. Tap the glass or press “Shake”.`);
      });
    });
    selectIn(scBtns, si);
    const aRow = row(S, 2);
    button(aRow, '<span class="r2-ic">🤲</span><span>Shake</span>', 'c-sky r2-col', shake);
    const fb = finishBtn(api, aRow); fb.classList.add('r2-col');
    buildScene(); scatterTop();
    api.hint('Tap “Shake” or tap the glass to swirl the snow.');

    loop(cv, (dt, t) => {
      swirl *= Math.exp(-dt * .9); shakeT = Math.max(0, shakeT - dt / 1.3);
      const k = 1 - Math.exp(-dt * (.7 + 1.2 * (1 - swirl)));
      const lim = R0 - 7;
      for (const f of flakes) {
        if (f.s) continue;
        const tx = Math.sin(t * .8 + f.ph) * 7 * sc, ty = f.fall;
        if (swirl > .05) { const dx = f.x - gx, dy = f.y - gy; f.vx += -dy / R0 * swirl * 260 * sc * dt; f.vy += dx / R0 * swirl * 260 * sc * dt; }
        f.vx += (tx - f.vx) * k * .6; f.vy += (ty - f.vy) * k * .6;
        f.x += f.vx * dt; f.y += f.vy * dt;
        const dx = f.x - gx, dy = f.y - gy, dd = Math.hypot(dx, dy);
        if (dd > lim) { const nx = dx / dd, ny = dy / dd; f.x = gx + nx * lim; f.y = gy + ny * lim; const vn = f.vx * nx + f.vy * ny; if (vn > 0) { f.vx -= 1.7 * vn * nx; f.vy -= 1.7 * vn * ny; } }
        if (swirl < .25 && f.vy > 0 && f.y >= settleY(f)) { f.s = true; f.y = settleY(f); }
      }
      ctx.clearRect(0, 0, W, H);
      const ox = Math.sin(t * 26) * 9 * sc * shakeT * shakeT, rot = Math.sin(t * 26 + 1) * .05 * shakeT * shakeT;
      ctx.save(); ctx.translate(gx + ox, gy + R0); ctx.rotate(rot); ctx.translate(-gx, -gy - R0);
      // globe interior
      ctx.drawImage(sceneL, 0, 0, W, H);
      ctx.save(); ctx.beginPath(); ctx.arc(gx, gy, R0, 0, TAU); ctx.clip();
      glowSpots.forEach(([x, y, r], i) => {
        const a = .12 + .1 * Math.sin(t * 2.3 + i * 1.7);
        const g = ctx.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, `rgba(255,220,140,${a})`); g.addColorStop(1, 'rgba(255,220,140,0)');
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      });
      if (chimney) {
        for (let j = 0; j < 5; j++) {
          const ph = (t * .25 + j / 5) % 1;
          ctx.fillStyle = `rgba(235,235,245,${.45 * (1 - ph)})`;
          ctx.beginPath(); ctx.arc(chimney[0] + Math.sin(ph * 5 + j) * 4 * u + ph * 10 * u, chimney[1] - ph * 34 * u, (2.5 + ph * 5) * u, 0, TAU); ctx.fill();
        }
      }
      ctx.fillStyle = '#FFFFFF';
      [[.95, f => f.r > 2], [.75, f => f.r <= 2]].forEach(([al, test]) => {
        ctx.globalAlpha = al; ctx.beginPath();
        for (const f of flakes) if (test(f)) { ctx.moveTo(f.x + f.r, f.y); ctx.arc(f.x, f.y, f.r, 0, TAU); }
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      // glass
      const gg = ctx.createRadialGradient(gx - R0 * .2, gy - R0 * .25, R0 * .3, gx, gy, R0);
      gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(.85, 'rgba(210,235,255,.08)'); gg.addColorStop(1, 'rgba(210,235,255,.35)');
      ctx.fillStyle = gg; ctx.fillRect(gx - R0, gy - R0, R0 * 2, R0 * 2);
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,.32)'; ctx.beginPath(); ctx.ellipse(gx - R0 * .45, gy - R0 * .45, R0 * .26, R0 * .1, -.75, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.ellipse(gx + R0 * .55, gy + R0 * .3, R0 * .1, R0 * .04, -.9, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2.5 * sc; ctx.beginPath(); ctx.arc(gx, gy, R0, 0, TAU); ctx.stroke();
      ctx.drawImage(baseL, 0, 0, W, H);
      plate();
      ctx.restore();
    });
  }

  /* =========================================================
     10. RAINY WINDOW
     ========================================================= */
  function makeRain() {
    let ac = null, g = null, lp = null, onVis = null;
    function build() {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      try { ac = new AC(); } catch (e) { ac = null; return false; }
      const len = Math.floor(ac.sampleRate * 3), buf = ac.createBuffer(2, len, ac.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const dd = buf.getChannelData(ch); let b = 0; for (let i = 0; i < len; i++) { b = b * .55 + (Math.random() * 2 - 1) * .45; dd[i] = b; } }
      const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 350;
      lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; lp.Q.value = .3;
      g = ac.createGain(); g.gain.value = 0;
      src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(ac.destination); src.start();
      onVis = () => { if (!ac) return; try { document.hidden ? ac.suspend() : ac.resume(); } catch (e) {} };
      document.addEventListener('visibilitychange', onVis);
      return true;
    }
    return {
      set(v, bright) {
        if (!ac) { if (v <= 0 || !build()) return; }
        try {
          if (ac.state === 'suspended' && !document.hidden) ac.resume();
          g.gain.setTargetAtTime(v, ac.currentTime, .5);
          lp.frequency.setTargetAtTime(bright, ac.currentTime, .5);
        } catch (e) {}
      },
      close() {
        if (onVis) document.removeEventListener('visibilitychange', onVis);
        if (ac) { try { ac.close(); } catch (e) {} } ac = null;
      }
    };
  }

  function startRain(level, api) {
    const S = setup(api, W => Math.min(W * .95, 420), true);
    const { cv, ctx, W, H, sc } = S;
    const fr = 14 * sc, sill = 34 * sc, mul = 9 * sc;
    const gx0 = fr, gy0 = fr, gx1 = W - fr, gy1 = H - sill;
    const VAR = [
      { sky: ['#2C3A6A', '#6A6CA0', '#E0A58E'], lawn: ['#2F6A3A', '#1C4426'], lamp: 1, name: 'evening' },
      { sky: ['#7C8EA6', '#A8B6C2', '#D9DDD6'], lawn: ['#4C8A45', '#2E5E30'], lamp: .6, name: 'afternoon' },
      { sky: ['#101A38', '#283A68', '#4D5A88'], lawn: ['#1E4A2E', '#10291A'], lamp: 1.3, name: 'night' }
    ];
    const V = VAR[(level - 1) % VAR.length];

    // sharp garden scene
    const [sharp, s] = layer(S);
    (function () {
      const sk = s.createLinearGradient(0, 0, 0, H * .6); sk.addColorStop(0, V.sky[0]); sk.addColorStop(.6, V.sky[1]); sk.addColorStop(1, V.sky[2]);
      s.fillStyle = sk; s.fillRect(0, 0, W, H);
      // distant trees
      s.fillStyle = '#26472F';
      for (let x = -20; x < W + 30; x += 26 * sc) { s.beginPath(); s.arc(x, H * .5 - rand(0, 18) * sc, rand(20, 32) * sc, 0, TAU); s.fill(); }
      // neighbour house with lit window
      s.fillStyle = '#6A4A44'; s.fillRect(W * .62, H * .3, W * .3, H * .24);
      s.fillStyle = '#4A2E2A'; s.beginPath(); s.moveTo(W * .59, H * .31); s.lineTo(W * .77, H * .18); s.lineTo(W * .95, H * .31); s.fill();
      [[.66, .36], [.8, .36]].forEach(([fx, fy]) => {
        const x = W * fx, y = H * fy, w = W * .08, h = H * .08;
        const g = s.createRadialGradient(x + w / 2, y + h / 2, 2, x + w / 2, y + h / 2, w * 1.8); g.addColorStop(0, 'rgba(255,200,110,.8)'); g.addColorStop(1, 'rgba(255,200,110,0)');
        s.fillStyle = g; s.fillRect(x - w * 1.5, y - h * 1.5, w * 4, h * 4);
        s.fillStyle = '#FFD27A'; s.fillRect(x, y, w, h);
      });
      // lawn
      const lg = s.createLinearGradient(0, H * .5, 0, H); lg.addColorStop(0, V.lawn[0]); lg.addColorStop(1, V.lawn[1]);
      s.fillStyle = lg; s.beginPath(); s.moveTo(0, H * .54); s.quadraticCurveTo(W * .5, H * .49, W, H * .55); s.lineTo(W, H); s.lineTo(0, H); s.fill();
      // path
      s.fillStyle = 'rgba(210,190,160,.55)'; s.beginPath(); s.moveTo(W * .42, H * .53); s.lineTo(W * .5, H * .53); s.lineTo(W * .66, H); s.lineTo(W * .26, H); s.fill();
      // big tree
      s.fillStyle = '#4A3020'; s.fillRect(W * .14, H * .3, 12 * sc, H * .28);
      [[.1, .26, 46], [.22, .22, 40], [.16, .14, 42], [.05, .16, 30]].forEach(([fx, fy, r]) => { s.fillStyle = '#2E6A3A'; s.beginPath(); s.arc(W * fx, H * fy, r * sc, 0, TAU); s.fill(); });
      s.fillStyle = 'rgba(120,190,110,.35)'; s.beginPath(); s.arc(W * .14, H * .15, 26 * sc, 0, TAU); s.fill();
      // flower beds
      const FL = ['#FF6B8A', '#FFD24A', '#FFFFFF', '#FF8A3C', '#C78BFF', '#FF4A5A'];
      for (let k = 0; k < 70; k++) {
        const side = k % 2, x = side ? rand(W * .66, W) : rand(0, W * .3), y = rand(H * .62, H * .95);
        s.fillStyle = '#1F4A26'; s.beginPath(); s.arc(x, y + 5 * sc, 7 * sc, 0, TAU); s.fill();
        s.fillStyle = FL[k % FL.length]; s.beginPath(); s.arc(x, y, rand(4, 7) * sc, 0, TAU); s.fill();
      }
      // lamp post with warm glow
      const lx = W * .58, ly = H * .4;
      const lgw = s.createRadialGradient(lx, ly, 2, lx, ly, 90 * sc * V.lamp); lgw.addColorStop(0, 'rgba(255,214,130,.95)'); lgw.addColorStop(.3, 'rgba(255,190,100,.35)'); lgw.addColorStop(1, 'rgba(255,190,100,0)');
      s.fillStyle = lgw; s.fillRect(0, 0, W, H);
      s.fillStyle = '#1E1E26'; s.fillRect(lx - 2.5 * sc, ly, 5 * sc, H * .26);
      s.fillStyle = '#FFF0C0'; s.beginPath(); s.arc(lx, ly, 8 * sc, 0, TAU); s.fill();
    })();
    function blurred(px) {
      const [c, x] = layer(S);
      x.fillStyle = V.sky[1]; x.fillRect(0, 0, W, H);
      if (typeof x.filter === 'string') {
        x.filter = `blur(${px * S.d}px)`; x.drawImage(sharp, -px * 2, -px * 2, W + px * 4, H + px * 4); x.filter = 'none';
      } else {
        const f = Math.max(2, px / 1.5), sm = document.createElement('canvas'); sm.width = Math.max(1, Math.round(W / f)); sm.height = Math.max(1, Math.round(H / f));
        const sx = sm.getContext('2d'); sx.imageSmoothingQuality = 'high'; sx.drawImage(sharp, 0, 0, sm.width, sm.height);
        x.imageSmoothingQuality = 'high'; x.drawImage(sm, 0, 0, W, H);
      }
      return c;
    }
    const blurBg = blurred(9), clearBg = blurred(2.5);
    // fog texture
    const [fog, fx] = layer(S);
    fx.fillStyle = 'rgba(212,222,234,.56)'; fx.fillRect(0, 0, W, H);
    for (let k = 0; k < W * H / 60; k++) { fx.fillStyle = `rgba(255,255,255,${rand(.08, .3)})`; fx.beginPath(); fx.arc(rand(0, W), rand(0, H), rand(.4, 1.3), 0, TAU); fx.fill(); }
    const [mask, mx] = layer(S);
    const [tmp, tx] = layer(S);
    // window frame overlay
    const [frameL, f] = layer(S);
    (function () {
      f.fillStyle = '#EFE2CB';
      f.beginPath(); f.rect(0, 0, W, H); f.rect(gx0, gy0, gx1 - gx0, gy1 - gy0); f.fill('evenodd');
      const cx = (gx0 + gx1) / 2, cy = (gy0 + gy1) / 2;
      f.fillRect(cx - mul / 2, gy0, mul, gy1 - gy0); f.fillRect(gx0, cy - mul / 2, gx1 - gx0, mul);
      f.fillStyle = 'rgba(90,60,30,.28)';
      f.fillRect(gx0, gy0, gx1 - gx0, 4 * sc); f.fillRect(gx0, gy0, 4 * sc, gy1 - gy0);
      f.fillRect(cx + mul / 2, gy0, 3 * sc, gy1 - gy0); f.fillRect(gx0, cy + mul / 2, gx1 - gx0, 3 * sc);
      f.fillStyle = 'rgba(255,255,255,.5)'; f.fillRect(cx - mul / 2, gy0, 2 * sc, gy1 - gy0); f.fillRect(gx0, cy - mul / 2, gx1 - gx0, 2 * sc);
      // sill
      const sg = f.createLinearGradient(0, gy1, 0, H); sg.addColorStop(0, '#C58C5A'); sg.addColorStop(.25, '#A86E40'); sg.addColorStop(1, '#6E4220');
      f.fillStyle = sg; f.fillRect(0, gy1, W, sill);
      f.fillStyle = 'rgba(255,230,190,.45)'; f.fillRect(0, gy1, W, 3 * sc);
      // plant pot
      const px = 46 * sc, py = H - 8 * sc;
      f.fillStyle = '#3F8A45';
      for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * .38; f.beginPath(); f.ellipse(px + Math.cos(a) * 16 * sc, py - 26 * sc + Math.sin(a) * 18 * sc, 6 * sc, 13 * sc, a + Math.PI / 2, 0, TAU); f.fill(); }
      f.fillStyle = '#C8623A'; f.beginPath(); f.moveTo(px - 16 * sc, py - 24 * sc); f.lineTo(px + 16 * sc, py - 24 * sc); f.lineTo(px + 12 * sc, py); f.lineTo(px - 12 * sc, py); f.fill();
      f.fillStyle = '#A84A2A'; f.fillRect(px - 18 * sc, py - 28 * sc, 36 * sc, 7 * sc);
      // mug
      const mx2 = W - 52 * sc, my = H - 8 * sc;
      f.strokeStyle = '#3D7FD0'; f.lineWidth = 4 * sc; f.beginPath(); f.arc(mx2 + 14 * sc, my - 12 * sc, 7 * sc, -Math.PI / 2, Math.PI / 2); f.stroke();
      f.fillStyle = '#4A90E2'; rrect(f, mx2 - 14 * sc, my - 26 * sc, 28 * sc, 26 * sc, 5 * sc); f.fill();
      f.fillStyle = '#FFFFFF'; f.font = `${Math.round(14 * sc)}px system-ui, sans-serif`; f.textAlign = 'center'; f.textBaseline = 'middle'; f.fillText('♥', mx2, my - 13 * sc); f.textAlign = 'left';
    })();
    const mugX = W - 52 * sc, mugY = H - 36 * sc;

    // state
    const strokes = [];          // mist wipes {pts, w, end, hold, fade}
    const beads = [], runners = [];
    let level3 = 1, soundOn = !R.isMuted(), lastVol = -1, spawnB = 0, spawnR = 0, wipeDist = 0, down = null;
    const RATES = [[6, 90, .45], [12, 150, .9], [22, 210, 1.6]];
    const rain = makeRain();
    const now = () => performance.now() / 1000;

    function addStroke(w, hold, fade) { const st = { pts: [], w, end: null, hold, fade }; strokes.push(st); if (strokes.length > 160) strokes.shift(); return st; }
    cv.addEventListener('pointerdown', e => {
      const q = S.pos(e);
      down = { id: e.pointerId, st: addStroke(30 * sc, 6, 9) };
      down.st.pts.push([q.x, q.y]);
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      tone(rand(620, 760), .09, 'sine', .015);
    });
    cv.addEventListener('pointermove', e => {
      if (!down || e.pointerId !== down.id) return;
      const q = S.pos(e), pts = down.st.pts, l = pts[pts.length - 1], dd = Math.hypot(q.x - l[0], q.y - l[1]);
      if (dd < 3 * sc) return;
      pts.push([q.x, q.y]); wipeDist += dd;
      if (wipeDist > 70 * sc) { wipeDist = 0; tone(rand(560, 820), .1, 'sine', .012); }
      if (pts.length > 120) { down.st.end = now(); const nst = addStroke(30 * sc, 6, 9); nst.pts.push([q.x, q.y]); down.st = nst; }
    });
    const end = e => { if (!down || e.pointerId !== down.id) return; down.st.end = now(); down = null; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);

    function spawnRunner(x, y) {
      runners.push({ x, y, r: rand(3.6, 5.5) * sc, v: 0, go: true, wob: rand(0, TAU), trail: addStroke(rand(5, 8) * sc, 2, 6), lastT: y });
      runners[runners.length - 1].trail.pts.push([x, y]);
    }

    // controls
    const cRow = row(S, 2);
    const sndBtn = button(cRow, '', 'c-sky r2-col', () => {
      if (!soundOn && R.isMuted()) R.unmute();
      soundOn = !soundOn; sndLabel(); sfx.tap();
    });
    function sndLabel() { sndBtn.innerHTML = `<span class="r2-ic">${soundOn ? '🔊' : '🔈'}</span><span>Rain sound: ${soundOn ? 'on' : 'off'}</span>`; sndBtn.setAttribute('aria-pressed', String(soundOn)); }
    sndLabel();
    const rainBtn = button(cRow, '', 'c-grape r2-col', () => { level3 = (level3 + 1) % 3; rainLabel(); sfx.tap(); });
    function rainLabel() { rainBtn.innerHTML = `<span class="r2-ic">${['🌦️', '🌧️', '⛈️'][level3]}</span><span>${['Light', 'Steady', 'Heavy'][level3]} rain</span>`; }
    rainLabel();
    const dRow = row(S, 2);
    button(dRow, '<span class="r2-ic">🧽</span><span>Wipe it clear</span>', 'c-peach r2-col', () => {
      const st = addStroke(70 * sc, 5, 10);
      for (let y = gy0; y <= gy1; y += 40 * sc) { st.pts.push([gx0, y]); st.pts.push([gx1, y + 20 * sc]); }
      st.end = now(); tone(520, .4, 'sine', .03); tone(660, .4, 'sine', .02, .12);
      api.hint('All clear for a moment. The mist will slowly come back.');
    });
    const fb = finishBtn(api, dRow); fb.classList.add('r2-col');
    api.hint('Draw in the mist with your finger. It slowly mists over again.');

    // a few beads to start
    for (let k = 0; k < 60; k++) beads.push({ x: rand(gx0, gx1), y: rand(gy0, gy1), r: rand(1, 3.2) * sc, t: -9 });

    loop(cv, (dt, t) => {
      const T = now(), [bRate, bMax, rRate] = RATES[level3];
      // sound
      const vol = soundOn && !R.isMuted() ? [.03, .045, .065][level3] : 0;
      if (vol !== lastVol) { lastVol = vol; rain.set(vol, [1600, 2200, 3000][level3]); }
      // beads
      spawnB += dt * bRate;
      while (spawnB > 1) { spawnB--; beads.push({ x: rand(gx0, gx1), y: rand(gy0, gy1), r: rand(1, 3.4) * sc, t: T }); }
      while (beads.length > bMax) beads.shift();
      spawnR += dt * rRate;
      if (spawnR > 1 && runners.length < 9) { spawnR = 0; spawnRunner(rand(gx0 + 8, gx1 - 8), rand(gy0, gy0 + (gy1 - gy0) * .5)); }
      for (let i = runners.length - 1; i >= 0; i--) {
        const r = runners[i];
        if (Math.random() < dt * (r.go ? .35 : 1.4)) r.go = !r.go;
        const target = r.go ? (35 + r.r * 9) * sc : 0;
        r.v += (target - r.v) * Math.min(1, dt * 4);
        r.y += r.v * dt; r.wob += dt * 2; r.x += Math.sin(r.wob) * 6 * sc * dt;
        const tp = r.trail.pts, l = tp[tp.length - 1];
        if (Math.hypot(r.x - l[0], r.y - l[1]) > 4 * sc) tp.push([r.x, r.y]);
        if (r.y - r.lastT > 26 * sc && Math.random() < .5) { r.lastT = r.y; beads.push({ x: r.x + rand(-2, 2), y: r.y - r.r * 2, r: rand(.8, 1.6) * sc, t: T }); }
        for (let j = beads.length - 1; j >= 0; j--) { const b = beads[j]; if (Math.abs(b.x - r.x) < r.r + b.r && Math.abs(b.y - r.y) < r.r + b.r) { beads.splice(j, 1); r.r = Math.min(7.5 * sc, r.r + b.r * .12); } }
        if (r.y > gy1 + r.r) { r.trail.end = T; runners.splice(i, 1); if (soundOn && Math.random() < .5) tone(rand(1700, 2500), .06, 'sine', .006); }
      }
      // mist mask
      mx.clearRect(0, 0, W, H); mx.lineCap = 'round'; mx.lineJoin = 'round'; mx.strokeStyle = '#fff'; mx.fillStyle = '#fff';
      for (let i = strokes.length - 1; i >= 0; i--) {
        const st = strokes[i];
        let a = 1;
        if (st.end != null) { const age = T - st.end; a = age < st.hold ? 1 : 1 - (age - st.hold) / st.fade; }
        if (a <= 0) { strokes.splice(i, 1); continue; }
        a = a * a * (3 - 2 * a);
        mx.beginPath(); st.pts.forEach(([x, y], k) => k ? mx.lineTo(x, y) : mx.moveTo(x, y)); if (st.pts.length === 1) mx.lineTo(st.pts[0][0] + .1, st.pts[0][1]);
        mx.globalAlpha = a * .35; mx.lineWidth = st.w * 1.45; mx.stroke();
        mx.globalAlpha = a; mx.lineWidth = st.w; mx.stroke();
      }
      mx.globalAlpha = .35;
      for (const b of beads) { mx.beginPath(); mx.arc(b.x, b.y, b.r * 1.2, 0, TAU); mx.fill(); }
      mx.globalAlpha = 1;
      // compose
      ctx.drawImage(blurBg, 0, 0, W, H);
      tx.globalCompositeOperation = 'source-over'; tx.clearRect(0, 0, W, H); tx.drawImage(clearBg, 0, 0, W, H);
      tx.globalCompositeOperation = 'destination-in'; tx.drawImage(mask, 0, 0, W, H);
      ctx.drawImage(tmp, 0, 0, W, H);
      tx.globalCompositeOperation = 'source-over'; tx.clearRect(0, 0, W, H); tx.drawImage(fog, 0, 0, W, H);
      tx.globalCompositeOperation = 'destination-out'; tx.drawImage(mask, 0, 0, W, H);
      tx.globalCompositeOperation = 'source-over';
      ctx.drawImage(tmp, 0, 0, W, H);
      // drops
      const drop = (x, y, r, sy) => {
        ctx.fillStyle = 'rgba(40,50,70,.28)'; ctx.beginPath(); ctx.ellipse(x, y + r * .25, r, r * sy, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(235,242,255,.4)'; ctx.beginPath(); ctx.ellipse(x, y, r * .85, r * sy * .85, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(x - r * .3, y - r * .35, Math.max(.6, r * .28), 0, TAU); ctx.fill();
      };
      for (const b of beads) { const g = Math.min(1, (T - b.t) * 4); drop(b.x, b.y, b.r * g, 1); }
      for (const r of runners) drop(r.x, r.y, r.r, 1.25);
      // room light
      const rl = ctx.createRadialGradient(W * .9, H, 10, W * .9, H, W * .9); rl.addColorStop(0, 'rgba(255,190,110,.2)'); rl.addColorStop(1, 'rgba(255,190,110,0)');
      ctx.fillStyle = rl; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(frameL, 0, 0, W, H);
      // steam from the mug
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2.5 * sc; ctx.lineCap = 'round';
      for (let j = 0; j < 2; j++) {
        ctx.beginPath();
        for (let k = 0; k <= 10; k++) { const yy = mugY - k * 2.4 * sc, xx = mugX - 4 * sc + j * 8 * sc + Math.sin(t * 1.6 + k * .5 + j * 2) * 3 * sc; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
        ctx.stroke();
      }
    }, () => rain.close());
  }
})();
