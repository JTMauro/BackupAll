/* Recall: Relax games. No scores, nothing to win. Six calm canvas toys. */
(function () {
  const { register, el, sfx, tone, toast, cheer } = R;

  R.css(`
.rx-wrap{display:flex; flex-direction:column; align-items:center; gap:16px; width:100%; margin:0 auto}
.rx-cv{display:block; width:100%; height:auto; border-radius:22px; cursor:pointer; user-select:none; -webkit-user-select:none; touch-action:manipulation;
  box-shadow:0 0 0 5px rgba(255,255,255,.2), 0 9px 0 5px rgba(0,0,0,.22), 0 18px 30px rgba(0,0,0,.32)}
.rx-cv.rx-drag{touch-action:none}
.rx-ctl{display:flex; flex-wrap:wrap; justify-content:center; gap:12px; width:100%}
.rx-ctl .btn{min-height:60px; font-size:1.18rem}
.rx-ctl .btn:disabled{opacity:.6; cursor:default}
.rx-grid{display:grid; grid-template-columns:repeat(auto-fit, minmax(98px, 1fr)); gap:12px 10px; width:100%}
.rx-grid .btn{flex-direction:column; gap:3px; padding:.45em .3em; min-height:74px; font-size:1.1rem}
.rx-ic{font-size:1.75rem; line-height:1; filter:drop-shadow(0 2px 1px rgba(0,0,0,.2))}
.rx-sel{outline:4px solid #fff; outline-offset:3px; transform:translateY(-2px)}
.rx-done{flex:1 1 150px; max-width:360px}
.rx-grid .rx-done{max-width:none}
`);

  const G = [
    ['bubbles', 1, 'Bubble Pop', '🫧', 'Tap big, slow bubbles to pop them', startBubbles],
    ['fireworks', 2, 'Fireworks', '🎆', 'Tap the night sky to light up fireworks', startFireworks],
    ['musicbox', 3, 'Music Box', '🎶', 'Tap the bells. Every tune sounds lovely', startMusic],
    ['zen', 4, 'Zen Garden', '🪨', 'Rake the sand and place smooth stones', startZen],
    ['leaves', 5, 'Falling Leaves', '🍂', 'Catch autumn leaves in a basket', startLeaves],
    ['aquarium', 6, 'Aquarium', '🐠', 'Fill a fish tank and watch them swim', startAquarium]
  ];
  G.forEach(([id, order, name, icon, desc, start]) => register({ id, cat: 'relax', order, name, icon, desc, gentle: true, start }));

  /* ---------- shared toolkit ---------- */
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const PENTA = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 784, 880, 1046.5, 1174.7, 1318.5];
  function bell(f, v = .12, delay = 0, len = 2) {
    tone(f, len, 'sine', v, delay);
    tone(f * 2, len * .55, 'sine', v * .28, delay);
    tone(f * 3, len * .28, 'sine', v * .1, delay);
    tone(f * 5.4, .22, 'sine', v * .035, delay);
  }
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function setup(api, hFn, drag) {
    const wrap = el('div', 'rx-wrap');
    api.stage.append(wrap);
    const W = Math.round(clamp(api.stage.clientWidth || 340, 280, 720));
    const H = Math.round(hFn(W));
    const d = Math.min(2, window.devicePixelRatio || 1);
    const cv = el('canvas', 'rx-cv' + (drag ? ' rx-drag' : ''));
    cv.width = Math.round(W * d); cv.height = Math.round(H * d); cv.style.maxWidth = W + 'px';
    const ctx = cv.getContext('2d'); ctx.setTransform(d, 0, 0, d, 0, 0);
    const ctl = el('div', 'rx-ctl');
    wrap.style.maxWidth = W + 'px';
    wrap.append(cv, ctl);
    const sc = clamp(W / 360, .85, 1.45);
    const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
    return { wrap, cv, ctx, ctl, W, H, d, sc, pos };
  }
  function layer(S) {
    const c = document.createElement('canvas'); c.width = S.cv.width; c.height = S.cv.height;
    const x = c.getContext('2d'); x.setTransform(S.d, 0, 0, S.d, 0, 0); return [c, x];
  }
  function loop(cv, fn) {
    let last = performance.now();
    function f(now) {
      if (!cv.isConnected) return;
      const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
      fn(dt, now / 1000);
      requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  }
  function button(parent, html, cls, fn) {
    const b = el('button', 'btn ' + cls, html); b.type = 'button';
    b.onclick = () => fn(b); parent.append(b); return b;
  }
  function finishBtn(api, parent) {
    let fin = false;
    return button(parent, '✓ I’m finished', 'c-mint rx-done', b => {
      if (fin) return; fin = true; b.disabled = true; sfx.good(); api.done(3);
    });
  }
  function rrect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function star4(c, x, y, r) {
    c.beginPath(); c.moveTo(x, y - r);
    c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r);
    c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fill();
  }
  function heart(c, x, y, s) {
    c.beginPath(); c.moveTo(x, y + s * .35);
    c.bezierCurveTo(x - s * .9, y - s * .25, x - s * .45, y - s * .95, x, y - s * .45);
    c.bezierCurveTo(x + s * .45, y - s * .95, x + s * .9, y - s * .25, x, y + s * .35); c.fill();
  }

  /* =========================================================
     1. BUBBLE POP
     ========================================================= */
  function startBubbles(level, api) {
    const S = setup(api, W => Math.min(W * 1.15, 430));
    const { cv, ctx, W, H, sc } = S;
    const THEMES = [
      { sky: ['#A6DCFF', '#C9BCFF', '#FFD9EC'], bok: '255,255,255' },
      { sky: ['#FFC29A', '#FF9DB5', '#B39BFF'], bok: '255,244,214' },
      { sky: ['#6EDDD0', '#47A9D2', '#3070B8'], bok: '214,255,250' }
    ];
    const th = THEMES[(level - 1) % THEMES.length];
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, th.sky[0]); bg.addColorStop(.55, th.sky[1]); bg.addColorStop(1, th.sky[2]);
    const bokeh = [...Array(12)].map(() => ({ x: rand(0, W), y: rand(0, H), r: rand(14, 46) * sc, a: rand(.06, .16), vx: rand(-4, 4), vy: rand(-6, -2) }));
    const bubbles = [], sparks = [], rings = [];
    let spawnT = 0, popped = 0;
    function spawn(y) {
      const r = rand(36, 56) * sc;
      bubbles.push({ bx: rand(r, W - r), y: y == null ? H + r + 4 : y, r, vy: rand(17, 27) * sc, ph: rand(0, TAU), hue: rand(0, 360), sway: rand(8, 18) * sc, sf: rand(.35, .6) });
    }
    for (let i = 0; i < 5; i++) spawn(rand(H * .25, H * .95));
    api.hint('Tap the bubbles to pop them. There is no hurry.');

    cv.addEventListener('pointerdown', e => {
      const p = S.pos(e), t = performance.now() / 1000;
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i], bx = b.bx + Math.sin(t * b.sf + b.ph) * b.sway;
        if (Math.hypot(p.x - bx, p.y - b.y) < b.r + 14 * sc) { pop(i, bx); return; }
      }
    });
    function pop(i, x) {
      const b = bubbles.splice(i, 1)[0];
      rings.push({ x, y: b.y, r: b.r, t: 0, hue: b.hue });
      for (let k = 0; k < 14; k++) {
        const a = k / 14 * TAU + rand(-.2, .2), s = rand(50, 140) * sc;
        sparks.push({ x: x + Math.cos(a) * b.r * .6, y: b.y + Math.sin(a) * b.r * .6, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: rand(.55, .9), hue: (b.hue + rand(-40, 40) + 360) % 360, r: rand(4, 8) * sc, star: k % 2 === 0 });
      }
      const f = PENTA[5 + Math.floor(Math.random() * 6)];
      tone(f, .11, 'sine', .11); tone(f * 1.5, .1, 'sine', .04, .025); tone(f * 2, .45, 'sine', .018, .06);
      popped++;
      if (popped % 20 === 0) toast(cheer());
      if (bubbles.length < 3) spawnT = 99;
    }
    function drawBubble(b, x, t) {
      const r = b.r, w = Math.sin(t * 1.7 + b.ph) * .035;
      ctx.save(); ctx.translate(x, b.y); ctx.scale(1 + w, 1 - w);
      const g = ctx.createRadialGradient(-r * .25, -r * .3, r * .1, 0, 0, r);
      g.addColorStop(0, 'rgba(255,255,255,.06)');
      g.addColorStop(.72, `hsla(${b.hue},90%,85%,.14)`);
      g.addColorStop(.93, `hsla(${(b.hue + 50) % 360},95%,78%,.42)`);
      g.addColorStop(1, `hsla(${(b.hue + 100) % 360},95%,92%,.75)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      const lg = ctx.createLinearGradient(-r, -r, r, r);
      lg.addColorStop(0, `hsla(${b.hue},100%,90%,.8)`); lg.addColorStop(.5, `hsla(${(b.hue + 120) % 360},100%,85%,.55)`); lg.addColorStop(1, `hsla(${(b.hue + 240) % 360},100%,88%,.8)`);
      ctx.strokeStyle = lg; ctx.lineWidth = 2.2 * sc; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.beginPath(); ctx.ellipse(-r * .38, -r * .42, r * .3, r * .15, -.75, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath(); ctx.arc(-r * .08, -r * .64, r * .06, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(r * .42, r * .44, r * .16, r * .07, -.75, 0, TAU); ctx.fill();
      ctx.restore();
    }
    loop(cv, (dt, t) => {
      spawnT += dt;
      if (spawnT > 1.7 && bubbles.length < 8) { spawnT = 0; spawn(); }
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      bokeh.forEach(o => {
        o.x += o.vx * dt; o.y += o.vy * dt;
        if (o.y < -o.r) { o.y = H + o.r; o.x = rand(0, W); }
        if (o.x < -o.r) o.x = W + o.r; if (o.x > W + o.r) o.x = -o.r;
        ctx.fillStyle = `rgba(${th.bok},${o.a})`; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU); ctx.fill();
      });
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i]; b.y -= b.vy * dt;
        if (b.y < -b.r - 10) { bubbles.splice(i, 1); continue; }
        drawBubble(b, b.bx + Math.sin(t * b.sf + b.ph) * b.sway, t);
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        const g = rings[i]; g.t += dt; const u = g.t / .45;
        if (u >= 1) { rings.splice(i, 1); continue; }
        ctx.strokeStyle = `hsla(${g.hue},100%,96%,${(1 - u) * .8})`; ctx.lineWidth = 3 * sc * (1 - u) + .5;
        ctx.beginPath(); ctx.arc(g.x, g.y, g.r * (1 + u * .5), 0, TAU); ctx.stroke();
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]; s.life += dt;
        if (s.life >= s.max) { sparks.splice(i, 1); continue; }
        s.vx *= Math.pow(.05, dt); s.vy *= Math.pow(.05, dt); s.vy += 30 * dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        const a = 1 - s.life / s.max;
        ctx.fillStyle = `hsla(${s.hue},100%,${s.star ? 92 : 80}%,${a})`;
        if (s.star) star4(ctx, s.x, s.y, s.r * (.6 + a * .6));
        else { ctx.beginPath(); ctx.arc(s.x, s.y, s.r * .35 * a + .8, 0, TAU); ctx.fill(); }
      }
    });
    finishBtn(api, S.ctl);
  }

  /* =========================================================
     2. FIREWORKS
     ========================================================= */
  function startFireworks(level, api) {
    const S = setup(api, W => Math.min(W * 1.15, 430));
    const { cv, ctx, W, H, sc } = S;
    const rng = mulberry(level * 7919 + 13);
    const groundY = H - 8 * sc;
    // sky layer
    const [sky, sx] = layer(S);
    const g = sx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#070B2A'); g.addColorStop(.6, '#18215C'); g.addColorStop(1, '#3A3C82');
    sx.fillStyle = g; sx.fillRect(0, 0, W, H);
    const mx = W * (.72 + rng() * .16), my = H * .14, mr = 20 * sc;
    const mg = sx.createRadialGradient(mx, my, mr * .5, mx, my, mr * 4);
    mg.addColorStop(0, 'rgba(255,248,214,.28)'); mg.addColorStop(1, 'rgba(255,248,214,0)');
    sx.fillStyle = mg; sx.fillRect(0, 0, W, H);
    sx.fillStyle = '#FFF6D6'; sx.beginPath(); sx.arc(mx, my, mr, 0, TAU); sx.fill();
    sx.fillStyle = 'rgba(210,200,170,.35)';
    [[-.3, -.2, .22], [.25, .2, .16], [.05, .4, .1]].forEach(([a, b, r]) => { sx.beginPath(); sx.arc(mx + a * mr, my + b * mr, r * mr, 0, TAU); sx.fill(); });
    // hills
    sx.fillStyle = '#20275E'; sx.beginPath(); sx.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) sx.lineTo(x, H * .74 + Math.sin(x / W * 5 + level) * 10 * sc + Math.sin(x / W * 13) * 4 * sc);
    sx.lineTo(W, H); sx.fill();
    // town layer
    const [town, tx] = layer(S);
    const ink = '#0A0D24';
    tx.fillStyle = ink;
    let x = -10 * sc; const churchAt = 2 + Math.floor(rng() * 4);
    const wins = [];
    for (let n = 0; x < W + 10; n++) {
      const kind = n === churchAt ? 'church' : rng() < .6 ? 'house' : rng() < .5 ? 'tall' : 'tree';
      if (kind === 'tree') {
        const r = (10 + rng() * 8) * sc, cx = x + r;
        tx.fillRect(cx - 2 * sc, groundY - r * 1.2, 4 * sc, r * 1.2);
        tx.beginPath(); tx.arc(cx, groundY - r * 1.5, r, 0, TAU); tx.arc(cx - r * .55, groundY - r * 1.1, r * .7, 0, TAU); tx.arc(cx + r * .55, groundY - r * 1.1, r * .7, 0, TAU); tx.fill();
        x += r * 2 + 2 * sc; continue;
      }
      const w = (kind === 'tall' ? 30 + rng() * 16 : kind === 'church' ? 34 : 34 + rng() * 22) * sc;
      const h = (kind === 'tall' ? 56 + rng() * 26 : kind === 'church' ? 50 : 30 + rng() * 18) * sc;
      const top = groundY - h;
      tx.fillRect(x, top, w, h + 10);
      if (kind === 'house') {
        tx.beginPath(); tx.moveTo(x - 4 * sc, top); tx.lineTo(x + w / 2, top - w * .45); tx.lineTo(x + w + 4 * sc, top); tx.fill();
        tx.fillRect(x + w * .68, top - w * .42, 6 * sc, w * .3);
      } else if (kind === 'tall') {
        tx.fillRect(x - 3 * sc, top - 4 * sc, w + 6 * sc, 5 * sc);
      } else {
        tx.fillRect(x + w * .25, top - 26 * sc, w * .5, 26 * sc);
        tx.beginPath(); tx.moveTo(x + w * .2, top - 26 * sc); tx.lineTo(x + w / 2, top - 70 * sc); tx.lineTo(x + w * .8, top - 26 * sc); tx.fill();
        tx.fillRect(x + w / 2 - 1 * sc, top - 82 * sc, 2 * sc, 14 * sc); tx.fillRect(x + w / 2 - 5 * sc, top - 77 * sc, 10 * sc, 2 * sc);
        wins.push([x + w / 2, top - 14 * sc, 'clock']);
      }
      const cols = Math.max(1, Math.floor(w / (13 * sc))), rows = Math.max(1, Math.floor((h - 8 * sc) / (15 * sc)));
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (rng() < .45) {
        wins.push([x + (c + .5) * w / cols, top + 8 * sc + r * 15 * sc + 4 * sc, 'w']);
      }
      x += w + (2 + rng() * 6) * sc;
    }
    tx.fillRect(0, groundY, W, H - groundY);
    wins.forEach(([wx, wy, k]) => {
      if (k === 'clock') {
        tx.fillStyle = '#FFE7A8'; tx.beginPath(); tx.arc(wx, wy, 6 * sc, 0, TAU); tx.fill();
        tx.strokeStyle = ink; tx.lineWidth = 1.4 * sc; tx.beginPath(); tx.moveTo(wx, wy); tx.lineTo(wx, wy - 4 * sc); tx.moveTo(wx, wy); tx.lineTo(wx + 3 * sc, wy); tx.stroke();
      } else {
        const gl = tx.createRadialGradient(wx, wy, 0, wx, wy, 10 * sc);
        gl.addColorStop(0, 'rgba(255,200,90,.35)'); gl.addColorStop(1, 'rgba(255,200,90,0)');
        tx.fillStyle = gl; tx.fillRect(wx - 10 * sc, wy - 10 * sc, 20 * sc, 20 * sc);
        tx.fillStyle = '#FFD47E'; tx.fillRect(wx - 3 * sc, wy - 4 * sc, 6 * sc, 7 * sc);
      }
    });
    const stars = [...Array(Math.round(W * H / 2600))].map(() => ({ x: rand(0, W), y: rand(0, H * .7), r: rand(.5, 1.5) * sc, ph: rand(0, TAU), f: rand(.6, 1.8) }));

    const PAL = [['#FF6B4A', '#FFC234'], ['#45AEFF', '#FFFFFF'], ['#F25A95', '#FFC1DC'], ['#3CC46B', '#EAFF8E'], ['#A98BFF', '#FFC8FF'], ['#FFC234', '#FF9A3C'], ['#5FD8B9', '#C9FFF1']];
    const SHAPES = ['peony', 'ring', 'heart', 'willow', 'star', 'double', 'smile', 'peony', 'ring', 'willow'];
    let shapeQ = [], palI = Math.floor(Math.random() * PAL.length);
    const rockets = [], parts = [], flashes = [];
    let showing = false;

    function launch(px, py) {
      const ty = clamp(py, H * .12, H * .6), x0 = clamp(px, 24, W - 24);
      rockets.push({ x0, x: x0, y: H, ty, t: 0, T: .85 + (H - ty) / H * .55, ph: rand(0, TAU) });
      tone(330, .4, 'sine', .025); tone(440, .35, 'sine', .016, .12);
      if (parts.length > 1400) parts.splice(0, 300);
    }
    function P(x, y, vx, vy, col, o = {}) {
      parts.push(Object.assign({ x, y, vx, vy, col, life: 0, max: rand(1.4, 2), g: 40 * sc, drag: .972, tr: [], tl: 5, tw: false, id: Math.random() * 99 }, o));
    }
    function burst(x, y) {
      if (!shapeQ.length) shapeQ = SHAPES.slice().sort(() => Math.random() - .5);
      const shape = shapeQ.pop(), [c1, c2] = PAL[palI++ % PAL.length], v = 105 * sc;
      flashes.push({ x, y, t: 0, col: c1 });
      if (shape === 'peony') for (let i = 0; i < 70; i++) { const a = i / 70 * TAU + rand(-.05, .05), s = v * rand(.75, 1.1); P(x, y, Math.cos(a) * s, Math.sin(a) * s, Math.random() < .25 ? c2 : c1); }
      if (shape === 'double') {
        for (let i = 0; i < 56; i++) { const a = i / 56 * TAU, s = v * rand(.95, 1.1); P(x, y, Math.cos(a) * s, Math.sin(a) * s, c1); }
        for (let i = 0; i < 34; i++) { const a = i / 34 * TAU, s = v * rand(.45, .6); P(x, y, Math.cos(a) * s, Math.sin(a) * s, c2, { tw: true }); }
      }
      if (shape === 'ring') {
        const tilt = rand(.45, 1), rot = rand(0, TAU);
        for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, ux = Math.cos(a), uy = Math.sin(a) * tilt; P(x, y, (ux * Math.cos(rot) - uy * Math.sin(rot)) * v * 1.1, (ux * Math.sin(rot) + uy * Math.cos(rot)) * v * 1.1, c1, { g: 22 * sc }); }
        for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; P(x, y, Math.cos(a) * v * .4, Math.sin(a) * v * .4, c2, { g: 22 * sc, tw: true }); }
      }
      if (shape === 'heart') {
        const hc = Math.random() < .6 ? '#FF5C8A' : c1;
        for (let i = 0; i < 56; i++) { const t = i / 56 * TAU, hx = 16 * Math.pow(Math.sin(t), 3), hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); P(x, y, hx / 16 * v * 1.05, hy / 16 * v * 1.05, hc, { g: 14 * sc, drag: .965 }); }
      }
      if (shape === 'star') {
        const pts = [], rot = rand(0, TAU);
        for (let k = 0; k < 10; k++) { const a = rot + k / 10 * TAU - Math.PI / 2, r = k % 2 ? .45 : 1; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
        for (let k = 0; k < 10; k++) { const [ax, ay] = pts[k], [bx, by] = pts[(k + 1) % 10]; for (let j = 0; j < 7; j++) { const u = j / 7; P(x, y, (ax + (bx - ax) * u) * v * 1.15, (ay + (by - ay) * u) * v * 1.15, k % 2 ? c2 : c1, { g: 14 * sc, drag: .965 }); } }
      }
      if (shape === 'willow') for (let i = 0; i < 70; i++) { const a = i / 70 * TAU, s = v * rand(.5, .85); P(x, y, Math.cos(a) * s, Math.sin(a) * s, i % 3 ? '#FFD27A' : '#FFF1C2', { max: rand(2.4, 3), g: 48 * sc, drag: .965, tl: 12, tw: i % 4 === 0 }); }
      if (shape === 'smile') {
        const sc2 = v * .95, o = { g: 10 * sc, drag: .965 };
        for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; P(x, y, Math.cos(a) * sc2, Math.sin(a) * sc2, '#FFD23F', o); }
        [-1, 1].forEach(s => { for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; P(x, y, (s * .35 + Math.cos(a) * .06) * sc2, (-.28 + Math.sin(a) * .06) * sc2, '#FFF6C9', o); } });
        for (let i = 0; i <= 12; i++) { const a = .18 * Math.PI + i / 12 * .64 * Math.PI; P(x, y, Math.cos(a) * .58 * sc2, Math.sin(a) * .58 * sc2, '#FFF6C9', o); }
      }
      tone(65, 1.1, 'sine', .17); tone(98, .5, 'triangle', .04);
      const chime = [1568, 1760, 2093, 2349, 2637];
      for (let k = 0; k < (shape === 'willow' ? 8 : 5); k++) tone(chime[Math.floor(Math.random() * 5)], .3, 'sine', .016, .25 + k * .1 + Math.random() * .06);
    }
    cv.addEventListener('pointerdown', e => { const p = S.pos(e); launch(p.x, p.y); });
    api.hint('Tap anywhere in the sky to light a firework.');
    api.later(() => launch(W * .5, H * .3), 500);

    loop(cv, (dt, t) => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(sky, 0, 0, W, H);
      stars.forEach(s => { ctx.fillStyle = `rgba(255,255,240,${.35 + .45 * (.5 + .5 * Math.sin(t * s.f + s.ph))})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); });
      ctx.globalCompositeOperation = 'lighter';
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i]; f.t += dt; const a = 1 - f.t / .5;
        if (a <= 0) { flashes.splice(i, 1); continue; }
        const fg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 90 * sc);
        fg.addColorStop(0, `rgba(255,240,220,${a * .55})`); fg.addColorStop(1, 'rgba(255,240,220,0)');
        ctx.fillStyle = fg; ctx.fillRect(f.x - 90 * sc, f.y - 90 * sc, 180 * sc, 180 * sc);
        ctx.fillStyle = `rgba(120,110,200,${a * .08})`; ctx.fillRect(0, 0, W, H);
      }
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i]; r.t += dt; const u = Math.min(1, r.t / r.T), e = 1 - (1 - u) * (1 - u);
        r.x = r.x0 + Math.sin(u * 9 + r.ph) * 2 * sc; r.y = H - (H - r.ty) * e;
        P(r.x + rand(-1, 1), r.y + 3 * sc, rand(-8, 8), rand(10, 30), '#FFC98A', { max: rand(.3, .55), g: 10, tl: 2 });
        ctx.fillStyle = '#FFF4D8'; ctx.beginPath(); ctx.arc(r.x, r.y, 2.4 * sc, 0, TAU); ctx.fill();
        if (u >= 1) { rockets.splice(i, 1); burst(r.x, r.y); }
      }
      ctx.lineCap = 'round';
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.life += dt;
        if (p.life >= p.max) { parts.splice(i, 1); continue; }
        p.tr.push(p.x, p.y); if (p.tr.length > p.tl * 2) p.tr.splice(0, 2);
        const k = Math.pow(p.drag, dt * 60); p.vx *= k; p.vy *= k; p.vy += p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        let a = 1 - p.life / p.max; a = a * a * (3 - 2 * a);
        if (p.tw) a *= .45 + .55 * Math.abs(Math.sin(t * 22 + p.id));
        ctx.globalAlpha = a * .5; ctx.strokeStyle = p.col; ctx.lineWidth = 1.6 * sc;
        ctx.beginPath(); ctx.moveTo(p.tr[0], p.tr[1]); for (let j = 2; j < p.tr.length; j += 2) ctx.lineTo(p.tr[j], p.tr[j + 1]); ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.globalAlpha = a; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, 1.9 * sc, 0, TAU); ctx.fill();
        ctx.globalAlpha = a * .22; ctx.beginPath(); ctx.arc(p.x, p.y, 4.5 * sc, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(town, 0, 0, W, H);
    });
    const show = button(S.ctl, '✨ A little show', 'c-grape', b => {
      if (showing) return; showing = true; b.disabled = true;
      for (let k = 0; k < 7; k++) api.later(() => launch(rand(W * .15, W * .85), rand(H * .12, H * .45)), k * 650 + (k % 3 === 2 ? 250 : 0));
      api.later(() => { showing = false; b.disabled = false; }, 7 * 650 + 1500);
    });
    show.setAttribute('aria-label', 'Launch a little fireworks show');
    finishBtn(api, S.ctl);
  }

  /* =========================================================
     3. MUSIC BOX
     ========================================================= */
  function startMusic(level, api) {
    const NOTES = PENTA.slice(0, 8);
    const COL = [['#FF6B4A', '#C4432A'], ['#FF9A3C', '#C46512'], ['#FFC234', '#C28A00'], ['#3CC46B', '#1F8C46'], ['#5FD8B9', '#2A9C80'], ['#45AEFF', '#1D70C0'], ['#A98BFF', '#6F4FD0'], ['#F25A95', '#AE2A5F']];
    const cols = (api.stage.clientWidth || 340) >= 520;
    const S = setup(api, W => cols ? Math.min(W * .62, 380) : 8 * 54 + 28, true);
    const { cv, ctx, W, H, sc } = S;
    const pad = 14, n = 8;
    const band = cols ? (W - pad * 2) / n : (H - pad * 2) / n;
    const bars = NOTES.map((f, i) => {
      if (cols) { const bw = band * .72, L = H * (.9 - i * .05); return { f, x: pad + band * i + (band - bw) / 2, y: (H - L) / 2, w: bw, h: L, hit: 0, age: 9 }; }
      const bh = band * .74, L = W * (.95 - i * .045);
      return { f, x: (W - L) / 2, y: pad + band * i + (band - bh) / 2, w: L, h: bh, hit: 0, age: 9 };
    });
    const node = (b, k) => cols ? [b.x + b.w / 2, b.y + b.h * (k ? .78 : .22)] : [b.x + b.w * (k ? .78 : .22), b.y + b.h / 2];
    const [bgL, bx] = layer(S);
    const wg = bx.createLinearGradient(0, 0, W, H); wg.addColorStop(0, '#8E5A33'); wg.addColorStop(1, '#5E361C');
    bx.fillStyle = wg; bx.fillRect(0, 0, W, H);
    bx.globalAlpha = .12; bx.strokeStyle = '#2A1408';
    for (let k = 0; k < 40; k++) { bx.lineWidth = rand(.5, 2); bx.beginPath(); const y0 = rand(0, H); bx.moveTo(0, y0); bx.bezierCurveTo(W * .3, y0 + rand(-14, 14), W * .7, y0 + rand(-14, 14), W, y0 + rand(-10, 10)); bx.stroke(); }
    bx.globalAlpha = 1;
    rrect(bx, 6, 6, W - 12, H - 12, 16); bx.fillStyle = '#3B2112'; bx.fill();
    bx.strokeStyle = 'rgba(255,220,170,.18)'; bx.lineWidth = 2; bx.stroke();
    [0, 1].forEach(k => {
      bx.strokeStyle = '#9E2F3B'; bx.lineWidth = 9 * sc; bx.lineCap = 'round'; bx.lineJoin = 'round';
      bx.beginPath(); bars.forEach((b, i) => { const [x, y] = node(b, k); i ? bx.lineTo(x, y) : bx.moveTo(x, y); }); bx.stroke();
      bx.strokeStyle = '#C8505C'; bx.lineWidth = 3 * sc; bx.stroke();
    });
    const floaters = [];
    let lastBand = {}, playing = false, tuneI = (level - 1) % 4;

    function strike(i) {
      const b = bars[i]; b.hit = 1; b.age = 0;
      bell(b.f, .13, 0, 2.2);
      const [cx, cy] = [b.x + b.w / 2, b.y + b.h / 2];
      floaters.push({ x: cols ? cx : b.x + b.w * (.3 + Math.random() * .4), y: cols ? b.y : cy, vy: -rand(40, 60) * sc, age: 0, col: COL[i][0], ch: Math.random() < .5 ? '♪' : '♫', ph: rand(0, TAU) });
    }
    function bandAt(p) { const v = cols ? p.x : p.y; return clamp(Math.floor((v - pad) / band), 0, n - 1); }
    cv.addEventListener('pointerdown', e => { const i = bandAt(S.pos(e)); lastBand[e.pointerId] = i; strike(i); });
    cv.addEventListener('pointermove', e => {
      if (!(e.pointerId in lastBand) || !e.buttons) return;
      const i = bandAt(S.pos(e)); if (i !== lastBand[e.pointerId]) { lastBand[e.pointerId] = i; strike(i); }
    });
    const up = e => { delete lastBand[e.pointerId]; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('pointerleave', up);
    api.hint('Tap the coloured bells to play. Any order sounds nice.');

    const TUNES = [
      [[0, 1], [2, 1], [4, 1], [5, 2], [4, 1], [2, 1], [3, 2], [2, 1], [1, 1], [0, 3]],
      [[4, 1], [5, 1], [7, 2], [6, 1], [5, 1], [4, 2], [3, 1], [4, 1], [5, 1], [2, 1], [3, 3]],
      [[2, 1], [2, 1], [3, 1], [4, 2], [3, 1], [2, 1], [1, 2], [0, 1], [1, 1], [2, 1], [4, 1], [3, 1], [1, 1], [0, 3]],
      [[5, 1.5], [4, .5], [3, 1], [4, 1], [5, 1], [7, 1], [6, 2], [5, 1], [3, 1], [4, 1], [2, 1], [0, 3]]
    ];
    const tuneBtn = button(S.ctl, '♪ Play a tune for me', 'c-sun', b => {
      if (playing) return; playing = true; b.disabled = true; b.textContent = '♪ Playing…';
      const tune = TUNES[tuneI++ % TUNES.length], beat = .4;
      let at = 0;
      tune.forEach(([i, d]) => { api.later(() => strike(i), at * 1000); if (d >= 2) api.later(() => bell(NOTES[i] / 2, .05, 0, 2.4), at * 1000); at += d * beat; });
      api.later(() => { playing = false; b.disabled = false; b.textContent = '♪ Play another tune'; api.hint('Now you try. Tap the bells to play.'); }, at * 1000 + 600);
      api.hint('Listen… then have a go yourself.');
    });
    tuneBtn.setAttribute('aria-label', 'Play a tune for me');

    loop(cv, (dt, t) => {
      ctx.drawImage(bgL, 0, 0, W, H);
      bars.forEach((b, i) => {
        b.age += dt; b.hit = Math.max(0, b.hit - dt * 1.6);
        const sh = Math.sin(b.age * 55) * b.hit * 2.2 * sc;
        const x = b.x + (cols ? sh : 0), y = b.y + (cols ? 0 : sh), r = Math.min(b.w, b.h) * .3;
        const [c, dk] = COL[i];
        ctx.save();
        if (b.hit > 0) { ctx.shadowColor = c; ctx.shadowBlur = 26 * b.hit * sc; }
        rrect(ctx, x, y + 4 * sc, b.w, b.h, r); ctx.fillStyle = dk; ctx.fill();
        ctx.restore();
        rrect(ctx, x, y, b.w, b.h, r);
        const gr = cols ? ctx.createLinearGradient(x, 0, x + b.w, 0) : ctx.createLinearGradient(0, y, 0, y + b.h);
        gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(.18, c); gr.addColorStop(.8, c); gr.addColorStop(1, dk);
        ctx.fillStyle = gr; ctx.fill();
        if (b.hit > 0) { ctx.fillStyle = `rgba(255,255,255,${b.hit * .45})`; ctx.fill(); }
        [0, 1].forEach(k => { let [px, py] = node(b, k); px += cols ? sh : 0; py += cols ? 0 : sh; ctx.fillStyle = '#7A5A2A'; ctx.beginPath(); ctx.arc(px, py + 1, 4 * sc, 0, TAU); ctx.fill(); ctx.fillStyle = '#E9C67E'; ctx.beginPath(); ctx.arc(px, py, 3.2 * sc, 0, TAU); ctx.fill(); });
        const lx = x + b.w / 2, ly = y + b.h / 2, lr = Math.min(b.w, b.h) * .34;
        ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.beginPath(); ctx.arc(lx, ly, lr, 0, TAU); ctx.fill();
        ctx.fillStyle = '#18242C'; ctx.font = `700 ${Math.round(lr * 1.25)}px Fredoka, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), lx, ly + 1);
      });
      for (let i = floaters.length - 1; i >= 0; i--) {
        const f = floaters[i]; f.age += dt;
        if (f.age > 1.6) { floaters.splice(i, 1); continue; }
        f.y += f.vy * dt;
        const a = 1 - f.age / 1.6;
        ctx.globalAlpha = a; ctx.fillStyle = f.col; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3;
        ctx.font = `700 ${Math.round(28 * sc)}px system-ui, sans-serif`; ctx.textAlign = 'center';
        const fx = f.x + Math.sin(f.age * 4 + f.ph) * 10 * sc;
        ctx.strokeText(f.ch, fx, f.y); ctx.fillText(f.ch, fx, f.y);
        ctx.globalAlpha = 1;
      }
    });
    finishBtn(api, S.ctl);
  }

  /* =========================================================
     4. ZEN GARDEN
     ========================================================= */
  function startZen(level, api) {
    const S = setup(api, W => Math.min(W * .85, 410), true);
    const { cv, ctx, W, H, sc } = S;
    const fr = 15 * sc, ix = fr, iy = fr, iw = W - fr * 2, ih = H - fr * 2;
    const SAND = ['#E9D6AF', '#EADFC4', '#E3CDA6'][(level - 1) % 3];
    const [base, b] = layer(S);
    const wg = b.createLinearGradient(0, 0, W, H); wg.addColorStop(0, '#93603A'); wg.addColorStop(1, '#5E3A20');
    rrect(b, 0, 0, W, H, 22); b.fillStyle = wg; b.fill();
    b.globalAlpha = .14; b.strokeStyle = '#2A1408';
    for (let k = 0; k < 30; k++) { b.lineWidth = rand(.6, 2); b.beginPath(); const y0 = rand(0, H); b.moveTo(0, y0); b.bezierCurveTo(W * .3, y0 + rand(-12, 12), W * .7, y0 + rand(-12, 12), W, y0); b.stroke(); }
    b.globalAlpha = 1;
    b.fillStyle = SAND; b.fillRect(ix, iy, iw, ih);
    for (let k = 0; k < iw * ih / 18; k++) {
      b.fillStyle = Math.random() < .5 ? `rgba(255,255,255,${rand(.15, .45)})` : `rgba(120,90,40,${rand(.1, .3)})`;
      b.fillRect(ix + Math.random() * iw, iy + Math.random() * ih, rand(.6, 1.6), rand(.6, 1.6));
    }
    const [sand, s] = layer(S);
    s.drawImage(base, 0, 0, W, H);
    const objs = [];
    let mode = 'rake', active = null, down = null, smoothing = -1, rakeDist = 0;
    const GW = 4.6 * sc, GAP = 8.5 * sc;

    function groove(c, path, w) {
      c.save(); c.beginPath(); c.rect(ix, iy, iw, ih); c.clip();
      c.lineCap = 'round'; c.lineJoin = 'round';
      const o = w * .32;
      [[-o, -o, '#FFF6E2', w * .8], [o, o * 1.2, '#B69A6C', w * .85], [0, 0, '#D2BC93', w * .72]].forEach(([dx, dy, col, lw]) => {
        c.save(); c.translate(dx, dy); c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); path(c); c.stroke(); c.restore();
      });
      c.restore();
    }
    const polyPath = pts => c => { c.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k++) c.lineTo(pts[k][0], pts[k][1]); if (pts.length === 1) c.lineTo(pts[0][0] + .1, pts[0][1]); };
    const circlePath = (x, y, r) => c => { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); };
    function rings(x, y, r0, k = 3) { for (let j = 0; j < k; j++) groove(s, circlePath(x, y, r0 + j * 10 * sc), GW); }

    function addPoint(p) {
      const last = active.raw[active.raw.length - 1];
      let dx = p.x - last.x, dy = p.y - last.y; const L = Math.hypot(dx, dy);
      if (L < 3 * sc) return;
      dx /= L; dy /= L;
      active.dir = active.dir ? [active.dir[0] * .6 + dx * .4, active.dir[1] * .6 + dy * .4] : [dx, dy];
      const m = Math.hypot(...active.dir) || 1, nx = -active.dir[1] / m, ny = active.dir[0] / m;
      if (active.tines[0].length === 0) active.tines.forEach((tn, k) => tn.push([last.x + nx * (k - 1.5) * GAP, last.y + ny * (k - 1.5) * GAP]));
      active.tines.forEach((tn, k) => tn.push([p.x + nx * (k - 1.5) * GAP, p.y + ny * (k - 1.5) * GAP]));
      active.raw.push(p);
      rakeDist += L;
      if (rakeDist > 70 * sc) { rakeDist = 0; tone(rand(160, 200), .5, 'sine', .022); }
    }
    function commit() { if (active && active.tines[0].length > 1) active.tines.forEach(tn => groove(s, polyPath(tn), GW)); active = null; }

    function place(p) {
      if (objs.length >= 24) { api.hint('Your garden is lovely and full. Tap “Smooth the sand” to start fresh.'); return; }
      if (mode === 'rake') { rings(p.x, p.y, 9 * sc, 3); tone(392, .9, 'sine', .05); tone(523, .7, 'sine', .03, .08); return; }
      if (mode === 'stone') {
        const r = rand(15, 24) * sc;
        rings(p.x, p.y, r * 1.2 + 6 * sc, 3);
        objs.push({ k: 'stone', x: p.x, y: p.y, r, rot: rand(0, Math.PI), sq: rand(.72, .9), col: ['#8C8F94', '#6E7378', '#A39E95', '#5E6268', '#9A8F86'][Math.floor(Math.random() * 5)], t: 0 });
        tone(150, .3, 'sine', .13); tone(300, .12, 'triangle', .035);
      } else {
        rings(p.x, p.y, 24 * sc, 2);
        objs.push({ k: 'plant', x: p.x, y: p.y, s: rand(.9, 1.15) * sc, t: 0, flw: Math.random() < .5 ? '#FF8FA8' : '#FFFFFF', ph: rand(0, TAU) });
        bell(659.25, .07); bell(987.8, .04, .1);
      }
    }
    cv.addEventListener('pointerdown', e => {
      if (smoothing >= 0) return;
      const p = S.pos(e); down = { p, id: e.pointerId, moved: false };
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    });
    cv.addEventListener('pointermove', e => {
      if (!down || e.pointerId !== down.id) return;
      const p = S.pos(e);
      if (!down.moved && Math.hypot(p.x - down.p.x, p.y - down.p.y) > 8 * sc) { down.moved = true; active = { raw: [down.p], tines: [[], [], [], []], dir: null }; }
      if (down.moved) addPoint(p);
    });
    const end = e => {
      if (!down || e.pointerId !== down.id) return;
      if (down.moved) commit(); else if (e.type === 'pointerup') place(down.p);
      down = null;
    };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);

    const HINT = {
      rake: 'Drag a finger to rake lines in the sand, or tap to make little circles.',
      stone: 'Tap the sand to set down a smooth stone. Dragging still rakes.',
      plant: 'Tap the sand to plant a little plant. Dragging still rakes.'
    };
    const modeBtns = {}, mgrid = el('div', 'rx-grid'); S.ctl.append(mgrid);
    function setMode(m) { mode = m; Object.entries(modeBtns).forEach(([k, bt]) => bt.classList.toggle('rx-sel', k === m)); api.hint(HINT[m]); }
    [['rake', '〰️', 'Rake', 'c-peach'], ['stone', '🪨', 'Stone', 'c-card'], ['plant', '🌱', 'Plant', 'c-leaf']].forEach(([m, ic, label, c]) => {
      modeBtns[m] = button(mgrid, `<span class="rx-ic">${ic}</span><span>${label}</span>`, c, () => { sfx.tap(); setMode(m); });
    });
    button(S.ctl, '🌬️ Smooth the sand', 'c-sky', () => {
      if (smoothing >= 0) return; smoothing = 0; active = null; down = null;
      [523.25, 440, 392, 329.63].forEach((f, k) => tone(f, .8, 'sine', .05, k * .14));
    });
    setMode('rake');
    // a gentle starting pattern
    const st = { x: ix + iw * .7, y: iy + ih * .38 };
    mode = 'stone'; place(st); mode = 'rake';
    for (let k = 0; k < 3; k++) { const pts = [], y0 = iy + ih * (.72 + k * .07); for (let x = ix; x <= ix + iw; x += 6) pts.push([x, y0 + Math.sin(x / iw * 5) * 6 * sc]); groove(s, polyPath(pts), GW); }

    loop(cv, dt => {
      if (smoothing >= 0) {
        smoothing += dt / .9;
        s.globalAlpha = smoothing >= 1 ? 1 : .14; s.drawImage(base, 0, 0, W, H); s.globalAlpha = 1;
        if (smoothing >= 1) { smoothing = -1; objs.length = 0; api.hint('Fresh sand. ' + HINT[mode]); }
      }
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(sand, 0, 0, W, H);
      const sh = ctx.createLinearGradient(0, iy, 0, iy + 14 * sc); sh.addColorStop(0, 'rgba(60,35,10,.35)'); sh.addColorStop(1, 'rgba(60,35,10,0)');
      ctx.fillStyle = sh; ctx.fillRect(ix, iy, iw, 14 * sc);
      const sl = ctx.createLinearGradient(ix, 0, ix + 10 * sc, 0); sl.addColorStop(0, 'rgba(60,35,10,.25)'); sl.addColorStop(1, 'rgba(60,35,10,0)');
      ctx.fillStyle = sl; ctx.fillRect(ix, iy, 10 * sc, ih);
      if (active && active.tines[0].length > 1) active.tines.forEach(tn => groove(ctx, polyPath(tn), GW));
      const fade = smoothing >= 0 ? 1 - smoothing : 1;
      ctx.globalAlpha = fade;
      objs.forEach(o => {
        o.t = Math.min(1, o.t + dt / .45);
        const u = o.t, bounce = 1 + Math.sin(u * Math.PI) * .18 * (1 - u);
        ctx.save(); ctx.translate(o.x, o.y);
        if (o.k === 'stone') {
          const drop = (1 - u) * (1 - u) * -26 * sc;
          ctx.fillStyle = 'rgba(70,45,15,.28)'; ctx.beginPath(); ctx.ellipse(4 * sc, 6 * sc, o.r * 1.15, o.r * o.sq * 1.05, o.rot, 0, TAU); ctx.fill();
          ctx.translate(0, drop); ctx.scale(bounce, 1 / bounce);
          ctx.rotate(o.rot); ctx.beginPath(); ctx.ellipse(0, 0, o.r * 1.15, o.r * o.sq, 0, 0, TAU); ctx.rotate(-o.rot);
          const g = ctx.createRadialGradient(-o.r * .4, -o.r * .45, o.r * .1, 0, 0, o.r * 1.2);
          g.addColorStop(0, '#E4E2DE'); g.addColorStop(.45, o.col); g.addColorStop(1, '#3A3D42');
          ctx.fillStyle = g; ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-o.r * .38, -o.r * .4 * o.sq, o.r * .32, o.r * .14, -.5, 0, TAU); ctx.fill();
        } else {
          const k = o.s * (.3 + .7 * u) * bounce;
          ctx.scale(k, k);
          ctx.fillStyle = 'rgba(60,40,10,.25)'; ctx.beginPath(); ctx.ellipse(3, 6, 20, 9, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = '#3F7A35'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
          for (let j = 0; j < 7; j++) { const a = -Math.PI / 2 + (j - 3) * .32; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(a) * 14, Math.sin(a) * 18, Math.cos(a) * 22 + (j - 3) * 2, Math.sin(a) * 26); ctx.stroke(); }
          [[-8, -2, 9, '#3E7D3A'], [8, -1, 9, '#3E7D3A'], [0, -6, 10, '#4F9443'], [-5, -9, 7, '#66AD52'], [6, -10, 6, '#78BE5C'], [0, -14, 6, '#8ACB66']].forEach(([x, y, r, c]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); });
          ctx.fillStyle = o.flw;
          [[-6, -13], [7, -15], [1, -19]].forEach(([x, y]) => { for (let q = 0; q < 5; q++) { const a = q / 5 * TAU; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2, 1.8, 0, TAU); ctx.fill(); } });
          ctx.fillStyle = '#FFC234'; [[-6, -13], [7, -15], [1, -19]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 1.4, 0, TAU); ctx.fill(); });
        }
        ctx.restore();
      });
      ctx.globalAlpha = 1;
    });
    finishBtn(api, S.ctl);
  }

  /* =========================================================
     5. FALLING LEAVES
     ========================================================= */
  function startLeaves(level, api) {
    const S = setup(api, W => Math.min(W * 1.1, 420));
    const { cv, ctx, W, H, sc } = S;
    const groundY = H - 30 * sc, bw = 104 * sc, bh = 52 * sc;
    const bTop = groundY + 8 * sc - bh;
    const [bgL, b] = layer(S);
    const skies = [['#A9DAF2', '#FCE6C4', '#FFD3A6'], ['#F7C59F', '#FBD9B3', '#FCE9C8'], ['#B9D4EE', '#E8E2D6', '#F4D6B4']];
    const sk = skies[(level - 1) % 3];
    const g = b.createLinearGradient(0, 0, 0, H); g.addColorStop(0, sk[0]); g.addColorStop(.6, sk[1]); g.addColorStop(1, sk[2]);
    b.fillStyle = g; b.fillRect(0, 0, W, H);
    const sg = b.createRadialGradient(W * .78, H * .3, 0, W * .78, H * .3, 70 * sc); sg.addColorStop(0, 'rgba(255,240,190,.95)'); sg.addColorStop(.35, 'rgba(255,225,150,.6)'); sg.addColorStop(1, 'rgba(255,225,150,0)');
    b.fillStyle = sg; b.fillRect(0, 0, W, H);
    [['#E9B98A', .62, 16], ['#D59A68', .7, 10]].forEach(([c, h, a], k) => {
      b.fillStyle = c; b.beginPath(); b.moveTo(0, H);
      for (let x = 0; x <= W; x += 6) b.lineTo(x, H * h + Math.sin(x / W * (3 + k * 2) + k) * a * sc);
      b.lineTo(W, H); b.fill();
    });
    // little distant trees
    for (let k = 0; k < 6; k++) { const x = rand(0, W), y = H * .7 + rand(-6, 6) * sc, r = rand(8, 14) * sc; b.fillStyle = ['#C9653A', '#D88A3C', '#B5552F'][k % 3]; b.beginPath(); b.arc(x, y - r, r, 0, TAU); b.fill(); b.fillStyle = '#7A4A28'; b.fillRect(x - 1.5 * sc, y - 2, 3 * sc, r * .8); }
    const gg = b.createLinearGradient(0, groundY, 0, H); gg.addColorStop(0, '#9DB15A'); gg.addColorStop(1, '#788C3E');
    b.fillStyle = gg; b.beginPath(); b.moveTo(0, groundY + 4 * sc); for (let x = 0; x <= W; x += 10) b.lineTo(x, groundY + Math.sin(x * .05) * 3 * sc); b.lineTo(W, H); b.lineTo(0, H); b.fill();
    // a branch along the top
    b.strokeStyle = '#5A3A22'; b.lineCap = 'round';
    b.lineWidth = 12 * sc; b.beginPath(); b.moveTo(-10, 18 * sc); b.bezierCurveTo(W * .25, 40 * sc, W * .45, 10 * sc, W * .7, 26 * sc); b.stroke();
    b.lineWidth = 6 * sc; b.beginPath(); b.moveTo(W * .3, 30 * sc); b.quadraticCurveTo(W * .36, 48 * sc, W * .42, 54 * sc); b.moveTo(W * .55, 18 * sc); b.quadraticCurveTo(W * .6, 4 * sc, W * .66, 0); b.moveTo(W * .12, 28 * sc); b.quadraticCurveTo(W * .16, 46 * sc, W * .2, 50 * sc); b.stroke();
    const COLS = ['#E8442E', '#F28C28', '#F6C13A', '#C9682E', '#D9572B', '#E6A33A'];
    for (let k = 0; k < 16; k++) { b.save(); b.translate(rand(0, W * .72), rand(8, 50) * sc); b.rotate(rand(0, TAU)); drawLeaf(b, k % 3, COLS[k % COLS.length], rand(14, 22) * sc); b.restore(); }

    function drawLeaf(c, kind, col, s) {
      c.beginPath();
      if (kind === 0) {
        c.moveTo(0, -s / 2); c.bezierCurveTo(s * .45, -s * .22, s * .34, s * .3, 0, s / 2); c.bezierCurveTo(-s * .34, s * .3, -s * .45, -s * .22, 0, -s / 2);
      } else if (kind === 1) {
        for (let k = 0; k <= 60; k++) {
          const th = k / 60 * TAU, a = th - Math.PI / 2, lobe = Math.pow(Math.abs(Math.cos(th * 2.5)), .8);
          let r = s * .5 * (.45 + .55 * lobe - (k % 2) * .05);
          if (Math.sin(a) > .75) r *= .55;
          const x = Math.cos(a) * r, y = Math.sin(a) * r; k ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.closePath();
      } else {
        c.moveTo(0, -s * .52); c.bezierCurveTo(s * .55, -s * .35, s * .45, s * .4, 0, s * .4); c.bezierCurveTo(-s * .45, s * .4, -s * .55, -s * .35, 0, -s * .52);
      }
      const lg = c.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2); lg.addColorStop(0, col); lg.addColorStop(1, shade(col));
      c.fillStyle = lg; c.fill();
      c.strokeStyle = 'rgba(90,40,10,.45)'; c.lineWidth = Math.max(1, s * .05);
      c.beginPath(); c.moveTo(0, s * .55); c.lineTo(0, -s * .38);
      if (kind === 1) { [-.85, .85, -2.1, 2.1].forEach(a => { c.moveTo(0, 0); c.lineTo(Math.sin(a) * s * .32, -Math.cos(a) * s * .32); }); }
      else { [-.15, .1].forEach(y => { c.moveTo(0, y * s); c.lineTo(s * .2, (y - .14) * s); c.moveTo(0, y * s); c.lineTo(-s * .2, (y - .14) * s); }); }
      c.stroke();
    }
    function shade(hex) { const n = parseInt(hex.slice(1), 16); const f = v => Math.round(v * .68).toString(16).padStart(2, '0'); return '#' + f(n >> 16) + f(n >> 8 & 255) + f(n & 255); }

    const leaves = [], pile = [], twinkles = [];
    let bx = W / 2, btx = W / 2, bounce = 0, count = 0, spawnT = 1;
    function spawn(y) {
      leaves.push({ x0: rand(W * .08, W * .92), x: 0, y: y == null ? rand(0, 40 * sc) : y, vy: rand(22, 34) * sc, s: rand(30, 38) * sc, kind: Math.floor(Math.random() * 3), col: COLS[Math.floor(Math.random() * COLS.length)], ph: rand(0, TAU), swA: rand(14, 30) * sc, swF: rand(.7, 1.2), spin: rand(-.6, .6), rot: 0, st: 'fall', t: 0 });
    }
    for (let k = 0; k < 3; k++) spawn(rand(H * .1, H * .55));
    function catchLeaf(L) {
      count++; bounce = 1;
      pile.push({ kind: L.kind, col: L.col, ox: rand(-.33, .33) * bw, oy: rand(0, 7) * sc, rot: rand(-1.2, 1.2) });
      if (pile.length > 16) pile.shift();
      const f = PENTA[3 + (count - 1) % 8];
      tone(f, .55, 'sine', .1); tone(f * 2, .3, 'sine', .03, .02);
      for (let k = 0; k < 6; k++) twinkles.push({ x: bx + rand(-bw * .4, bw * .4), y: bTop + rand(-6, 6), vy: -rand(30, 60) * sc, t: 0 });
      if (count % 10 === 0) toast(cheer());
    }
    cv.addEventListener('pointerdown', e => {
      const p = S.pos(e);
      for (let i = leaves.length - 1; i >= 0; i--) {
        const L = leaves[i];
        if (L.st === 'fall' && Math.hypot(p.x - L.x, p.y - L.y) < Math.max(L.s * .7, 30 * sc) + 6 * sc) {
          L.st = 'fly'; L.t = 0; L.sx = L.x; L.sy = L.y; tone(784, .2, 'sine', .05); return;
        }
      }
      btx = clamp(p.x, bw / 2 + 6, W - bw / 2 - 6); sfx.tap();
    });
    api.hint('Tap a leaf to catch it, or tap left or right to move the basket.');
    loop(cv, (dt, t) => {
      spawnT += dt;
      if (spawnT > 1.6 && leaves.filter(l => l.st !== 'ground').length < 7) { spawnT = 0; spawn(); }
      bx += (btx - bx) * Math.min(1, dt * 4.5); bounce = Math.max(0, bounce - dt * 2.5);
      ctx.drawImage(bgL, 0, 0, W, H);
      const drawPile = () => pile.forEach(p => { ctx.save(); ctx.translate(bx + p.ox, bTop + 6 * sc + p.oy); ctx.rotate(p.rot); drawLeaf(ctx, p.kind, p.col, 24 * sc); ctx.restore(); });
      // ground leaves behind basket
      for (let i = leaves.length - 1; i >= 0; i--) {
        const L = leaves[i];
        if (L.st === 'ground') {
          L.t += dt; if (L.t > 7) { leaves.splice(i, 1); continue; }
          ctx.globalAlpha = Math.min(1, (7 - L.t) / 2); ctx.save(); ctx.translate(L.x, L.y); ctx.rotate(L.rot); ctx.scale(1, .55); drawLeaf(ctx, L.kind, L.col, L.s * .8); ctx.restore(); ctx.globalAlpha = 1;
        }
      }
      // basket
      const sq = 1 + Math.sin(bounce * Math.PI) * .06;
      ctx.save(); ctx.translate(bx, groundY + 8 * sc); ctx.scale(sq, 1 / sq);
      ctx.fillStyle = 'rgba(40,40,10,.25)'; ctx.beginPath(); ctx.ellipse(0, 2 * sc, bw * .55, 7 * sc, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#8A5225'; ctx.lineWidth = 6 * sc; ctx.beginPath(); ctx.ellipse(0, -bh, bw * .36, bh * .75, 0, Math.PI, TAU); ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.translate(0, 0); drawPile(); ctx.restore();
      ctx.save(); ctx.translate(bx, groundY + 8 * sc); ctx.scale(sq, 1 / sq);
      ctx.beginPath(); ctx.moveTo(-bw / 2, -bh); ctx.lineTo(bw / 2, -bh); ctx.lineTo(bw * .4, 0); ctx.quadraticCurveTo(0, 6 * sc, -bw * .4, 0); ctx.closePath();
      const bg2 = ctx.createLinearGradient(0, -bh, 0, 0); bg2.addColorStop(0, '#D99A55'); bg2.addColorStop(1, '#A8692F');
      ctx.fillStyle = bg2; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.strokeStyle = 'rgba(110,60,20,.55)'; ctx.lineWidth = 2 * sc;
      for (let y = -bh + 10 * sc; y < 4; y += 9 * sc) { ctx.beginPath(); ctx.moveTo(-bw / 2, y); ctx.lineTo(bw / 2, y); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,220,160,.35)';
      for (let x = -bw / 2; x < bw / 2; x += 10 * sc) { ctx.beginPath(); ctx.moveTo(x, -bh); ctx.lineTo(x * .82, 4); ctx.stroke(); }
      ctx.restore();
      rrect(ctx, -bw / 2 - 4 * sc, -bh - 5 * sc, bw + 8 * sc, 10 * sc, 5 * sc); ctx.fillStyle = '#9A5C27'; ctx.fill();
      ctx.fillStyle = 'rgba(255,230,180,.45)'; ctx.fillRect(-bw / 2, -bh - 4 * sc, bw, 2.5 * sc);
      ctx.restore();
      // falling and flying leaves
      leaves.forEach(L => {
        if (L.st === 'fall') {
          L.y += L.vy * dt; L.x = L.x0 + Math.sin(t * L.swF + L.ph) * L.swA;
          L.rot = Math.sin(t * L.swF + L.ph) * .7 + (L.spin * t) % TAU;
          if (L.y > bTop - 2 && L.y < bTop + 16 * sc && Math.abs(L.x - bx) < bw / 2 - 2) { L.st = 'gone'; catchLeaf(L); }
          else if (L.y > groundY + 4 * sc + (L.ph % 1) * 16 * sc) { L.st = 'ground'; L.t = 0; }
        } else if (L.st === 'fly') {
          L.t += dt / .7; const u = Math.min(1, L.t), e = u * u * (3 - 2 * u);
          const cx = (L.sx + bx) / 2, cy = Math.min(L.sy, bTop) - 60 * sc;
          L.x = (1 - e) * (1 - e) * L.sx + 2 * (1 - e) * e * cx + e * e * bx;
          L.y = (1 - e) * (1 - e) * L.sy + 2 * (1 - e) * e * cy + e * e * (bTop + 4 * sc);
          L.rot += dt * 8;
          if (u >= 1) { L.st = 'gone'; catchLeaf(L); }
        }
        if (L.st === 'fall' || L.st === 'fly') {
          ctx.save(); ctx.translate(L.x, L.y); ctx.rotate(L.rot);
          ctx.scale(1, .75 + .25 * Math.cos(t * L.swF * 2 + L.ph));
          drawLeaf(ctx, L.kind, L.col, L.s); ctx.restore();
        }
      });
      for (let i = leaves.length - 1; i >= 0; i--) if (leaves[i].st === 'gone') leaves.splice(i, 1);
      for (let i = twinkles.length - 1; i >= 0; i--) {
        const w = twinkles[i]; w.t += dt; if (w.t > .8) { twinkles.splice(i, 1); continue; }
        w.y += w.vy * dt; ctx.fillStyle = `rgba(255,236,150,${1 - w.t / .8})`; star4(ctx, w.x, w.y, 6 * sc);
      }
      // counter
      const label = '🧺 ' + count;
      ctx.font = `700 ${Math.round(22 * sc)}px Fredoka, system-ui, sans-serif`;
      const tw = ctx.measureText(label).width + 26 * sc;
      rrect(ctx, W - tw - 10 * sc, 10 * sc, tw, 38 * sc, 19 * sc);
      ctx.fillStyle = 'rgba(255,249,239,.92)'; ctx.fill();
      ctx.fillStyle = '#18242C'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, W - tw / 2 - 10 * sc, 29 * sc + 1);
    });
    button(S.ctl, '◀ Left', 'c-sun', () => { btx = clamp(btx - W * .25, bw / 2 + 6, W - bw / 2 - 6); sfx.tap(); });
    button(S.ctl, 'Right ▶', 'c-sun', () => { btx = clamp(btx + W * .25, bw / 2 + 6, W - bw / 2 - 6); sfx.tap(); });
    finishBtn(api, S.ctl);
  }

  /* =========================================================
     6. AQUARIUM
     ========================================================= */
  function startAquarium(level, api) {
    const S = setup(api, W => Math.min(W * .78, 380));
    const { cv, ctx, W, H, sc } = S;
    const sandY = H - 34 * sc;
    const [bgL, b] = layer(S);
    const wg = b.createLinearGradient(0, 0, 0, H); wg.addColorStop(0, '#7FE0F0'); wg.addColorStop(.45, '#2FA3CC'); wg.addColorStop(1, '#14608F');
    b.fillStyle = wg; b.fillRect(0, 0, W, H);
    b.fillStyle = 'rgba(20,70,110,.35)'; b.beginPath(); b.moveTo(0, H); for (let x = 0; x <= W; x += 8) b.lineTo(x, sandY - 22 * sc + Math.sin(x / W * 4) * 10 * sc); b.lineTo(W, H); b.fill();
    const sg = b.createLinearGradient(0, sandY, 0, H); sg.addColorStop(0, '#F4DDA6'); sg.addColorStop(1, '#D3AE70');
    b.fillStyle = sg; b.beginPath(); b.moveTo(0, H); for (let x = 0; x <= W; x += 6) b.lineTo(x, sandY + Math.sin(x / W * 7 + 1) * 4 * sc); b.lineTo(W, H); b.fill();
    for (let k = 0; k < W * 1.4; k++) { b.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.4)' : 'rgba(140,100,40,.3)'; b.fillRect(rand(0, W), rand(sandY + 4 * sc, H), 1.2, 1.2); }

    const fish = [], plants = [], chests = [], stones = [], bubbles = [], pebbles = [], hearts = [];
    const motes = [...Array(18)].map(() => ({ x: rand(0, W), y: rand(0, sandY), r: rand(.6, 1.6), vy: rand(-4, -1), ph: rand(0, TAU) }));
    let kindI = (level - 1) % 6, tapAt = null;
    const KINDS = ['clown', 'tang', 'puffer', 'angel', 'neon', 'gold'];
    const kinds = { clown: 1, tang: 1.05, puffer: .95, angel: 1.05, neon: .6, gold: 1 };
    const swimTop = 22 * sc, swimBot = () => sandY - 22 * sc;

    function addFish(kind, dir = Math.random() < .5 ? 1 : -1, y) {
      const s = kinds[kind] * .82 * sc;
      fish.push({ kind, s, x: dir > 0 ? -40 * s : W + 40 * s, y: y ?? rand(swimTop + 20 * sc, swimBot() - 10 * sc), dir, vx: dir * 30 * sc, face: dir, sp: rand(22, 34) * sc * (kind === 'neon' ? 1.25 : kind === 'puffer' ? .7 : 1), ty: rand(swimTop + 10 * sc, swimBot()), turnT: rand(4, 9), ph: rand(0, TAU), wig: 0 });
    }
    function wiggle(f) {
      f.wig = 1;
      for (let k = 0; k < 3; k++) hearts.push({ x: f.x + rand(-10, 10) * sc, y: f.y - 18 * f.s, vy: -rand(26, 40) * sc, t: -k * .12, ph: rand(0, TAU) });
      [0, 2, 4].forEach((n, k) => bell(PENTA[5 + n], .06, k * .09, 1));
    }
    cv.addEventListener('pointerdown', e => {
      const p = S.pos(e);
      for (let i = fish.length - 1; i >= 0; i--) {
        const f = fish[i], rx = 36 * f.s + 8 * sc, ry = 26 * f.s + 8 * sc;
        if (Math.pow((p.x - f.x) / rx, 2) + Math.pow((p.y - f.y) / ry, 2) < 1) { wiggle(f); return; }
      }
      for (const c of chests) if (Math.abs(p.x - c.x) < 40 * sc && p.y > c.y - 46 * sc && p.y < c.y + 8 * sc) { c.ph = 'opening'; c.t = 0; bell(784, .06); bell(1046.5, .05, .12); return; }
      if (p.y < sandY) {
        tapAt = { x: p.x, y: p.y, t: 0 };
        fish.forEach(f => { if (Math.hypot(f.x - p.x, f.y - p.y) < 180 * sc) { f.dir = Math.sign(p.x - f.x) || 1; f.ty = clamp(p.y, swimTop, swimBot()); f.turnT = 3; } });
        tone(523.25, .25, 'sine', .03);
      }
    });

    const full = msg => api.hint(msg + ' Tap a fish to say hello.');
    const grid = el('div', 'rx-grid'); S.ctl.append(grid);
    const add = (ic, label, c, fn) => button(grid, `<span class="rx-ic">${ic}</span><span>${label}</span>`, c, fn);
    add('🐠', 'Fish', 'c-orange', () => {
      if (fish.length >= 16) { full('The tank is lovely and full of fish.'); return; }
      const k = KINDS[kindI++ % KINDS.length];
      if (k === 'neon') { const d = Math.random() < .5 ? 1 : -1, y = rand(swimTop + 30 * sc, swimBot() - 20 * sc); for (let j = 0; j < 3; j++) addFish('neon', d, y + (j - 1) * 14 * sc); }
      else addFish(k);
      bell(523.25, .07); bell(659.25, .05, .1);
      api.hint('Here comes a fish! Tap it to see a happy wiggle.');
    });
    add('🌿', 'Plant', 'c-leaf', () => {
      if (plants.length >= 10) { full('Plenty of plants now.'); return; }
      const cs = [['#3CC46B', '#1F8C46'], ['#7BC74D', '#4E8E2A'], ['#2FA88A', '#1A6E5A'], ['#E0605A', '#A83A36']];
      const [c1, c2] = cs[Math.random() < .2 ? 3 : Math.floor(Math.random() * 3)];
      plants.push({ x: rand(14 * sc, W - 14 * sc), h: rand(.4, .62) * H, n: 3 + Math.floor(Math.random() * 3), c1, c2, ph: rand(0, TAU), g: 0 });
      plants.sort((a, b) => a.h - b.h);
      tone(392, .6, 'sine', .06); tone(587.33, .5, 'sine', .04, .1);
    });
    add('💰', 'Treasure', 'c-sun', () => {
      if (chests.length >= 2) { full('Two treasure chests is plenty!'); return; }
      const x = chests.length ? (chests[0].x < W / 2 ? rand(W * .62, W * .82) : rand(W * .18, W * .38)) : rand(W * .25, W * .75);
      chests.push({ x, y: sandY + 10 * sc, open: 0, ph: 'closed', t: 3, g: 0, bt: 0 });
      bell(659.25, .06); bell(880, .05, .1); bell(1046.5, .04, .2);
    });
    add('🫧', 'Bubbles', 'c-sky', () => {
      if (stones.length >= 4) { full('Lots of bubbles already.'); return; }
      stones.push({ x: rand(W * .1, W * .9), t: 0 });
      tone(700, .12, 'sine', .05); tone(900, .12, 'sine', .04, .08);
    });
    add('🪨', 'Pebbles', 'c-peach', () => {
      if (pebbles.length >= 140) { full('The pebbles are all in.'); return; }
      const cs = ['#E8E1D3', '#C9B79C', '#9AA3AB', '#F2A7A0', '#A6CBE3', '#C8B6E8', '#F6D58E'];
      for (let k = 0; k < 16; k++) pebbles.push({ x: rand(0, W), y: rand(sandY + 6 * sc, H - 4 * sc), r: rand(3, 6) * sc, c: cs[Math.floor(Math.random() * cs.length)], drop: rand(0, 1) });
      pebbles.sort((a, b) => a.y - b.y);
      for (let k = 0; k < 4; k++) tone(rand(500, 900), .08, 'sine', .04, k * .06);
    });
    api.hint('Your tank is empty. Tap the buttons to add fish, plants and more.');

    function drawFish(f, t) {
      const wag = Math.sin(t * (f.kind === 'neon' ? 9 : 5) + f.ph) * (.28 + f.wig * .5);
      const hop = -Math.sin(f.wig * Math.PI) * 14 * sc;
      ctx.save(); ctx.translate(f.x, f.y + hop + Math.sin(t * 1.3 + f.ph) * 2 * sc);
      ctx.scale(f.face * f.s, f.s);
      if (f.wig > 0) ctx.rotate(Math.sin(t * 24) * .22 * f.wig);
      const tail = (len, spread, c) => { ctx.save(); ctx.translate(-24, 0); ctx.rotate(wag); ctx.beginPath(); ctx.moveTo(4, 0); ctx.quadraticCurveTo(-len * .5, -spread * .3, -len, -spread); ctx.quadraticCurveTo(-len * .7, 0, -len, spread); ctx.quadraticCurveTo(-len * .5, spread * .3, 4, 0); ctx.fillStyle = c; ctx.fill(); ctx.restore(); };
      const body = (rx, ry, top, mid, bot) => { ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); const g = ctx.createLinearGradient(0, -ry, 0, ry); g.addColorStop(0, top); g.addColorStop(.5, mid); g.addColorStop(1, bot); ctx.fillStyle = g; ctx.fill(); };
      const eye = (x, y, r) => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.fillStyle = '#18242C'; ctx.beginPath(); ctx.arc(x + r * .2, y, r * .58, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + r * .35, y - r * .3, r * .22, 0, TAU); ctx.fill(); };
      const fin = (c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-8, -14); ctx.quadraticCurveTo(2, -28 - wag * 4, 12, -13); ctx.fill(); ctx.beginPath(); ctx.ellipse(2, 6, 7, 3.5, .6 + wag, 0, TAU); ctx.fill(); };
      const k = f.kind;
      if (k === 'clown') {
        tail(18, 13, '#F26B1D'); fin('#F26B1D'); body(30, 16, '#FFB36A', '#FF8A2A', '#E06A12');
        ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 30, 16, 0, 0, TAU); ctx.clip();
        [-15, 3, 19].forEach((x, i) => { ctx.fillStyle = '#18242C'; ctx.fillRect(x - 5, -20, 10, 40); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x - 3.5, -20, 7, 40); });
        ctx.restore(); eye(21, -4, 4.4);
      } else if (k === 'tang') {
        tail(18, 13, '#FFD23F'); fin('#1C4FB0'); body(30, 18, '#5C9BFF', '#2E6FE0', '#1C4FB0');
        ctx.strokeStyle = '#122E6E'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(18, -9); ctx.quadraticCurveTo(-2, -16, -18, -2); ctx.quadraticCurveTo(-4, 6, 8, 2); ctx.stroke();
        eye(20, -4, 4.4);
      } else if (k === 'puffer') {
        tail(12, 9, '#E5B92C'); body(22, 20, '#FFE680', '#F7D34A', '#E8B830');
        ctx.fillStyle = '#FFF6D6'; ctx.beginPath(); ctx.ellipse(2, 8, 16, 9, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#B4772A'; [[-8, -10], [2, -13], [-14, -2], [-4, -4], [8, -7]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 2.3, 0, TAU); ctx.fill(); });
        ctx.fillStyle = '#E5B92C'; ctx.beginPath(); ctx.ellipse(-2, 2, 7, 4, .8 + wag, 0, TAU); ctx.fill();
        eye(11, -5, 5.5);
        ctx.strokeStyle = '#8A5A1C'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(18, 3, 3, .2, Math.PI - .4); ctx.stroke();
      } else if (k === 'angel') {
        tail(14, 12, '#EDE3B5');
        ctx.fillStyle = '#E8D9A0';
        ctx.beginPath(); ctx.moveTo(-4, -18); ctx.quadraticCurveTo(-14, -40, -26 + wag * 6, -42); ctx.quadraticCurveTo(-14, -24, -14, -10); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-4, 18); ctx.quadraticCurveTo(-14, 40, -26 + wag * 6, 42); ctx.quadraticCurveTo(-14, 24, -14, 10); ctx.fill();
        ctx.beginPath(); ctx.moveTo(26, 0); ctx.quadraticCurveTo(12, -24, -4, -22); ctx.quadraticCurveTo(-24, -6, -24, 0); ctx.quadraticCurveTo(-24, 6, -4, 22); ctx.quadraticCurveTo(12, 24, 26, 0);
        const g = ctx.createLinearGradient(0, -22, 0, 22); g.addColorStop(0, '#FFF6CF'); g.addColorStop(1, '#E6CF7E'); ctx.fillStyle = g; ctx.fill();
        ctx.save(); ctx.clip(); ctx.fillStyle = '#2D2A3A'; [-14, 0, 13].forEach(x => ctx.fillRect(x - 2.5, -26, 5, 52)); ctx.restore();
        eye(16, -4, 3.8);
      } else if (k === 'neon') {
        tail(10, 7, 'rgba(200,230,255,.7)');
        body(24, 7.5, '#9FF0FF', '#3BC8FF', '#FF4D6D');
        ctx.fillStyle = '#FF4D6D'; ctx.beginPath(); ctx.ellipse(-4, 3.5, 16, 3.5, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(160,250,255,.9)'; ctx.fillRect(-16, -2.5, 30, 2.5);
        eye(16, -1.5, 3.4);
      } else {
        ctx.save(); ctx.globalAlpha = .82; tail(26, 18, '#FFB25A'); ctx.restore();
        fin('#FF9A3C'); body(26, 17, '#FFD08A', '#FFA43A', '#E07818');
        ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(4, -7, 14, 4, -.15, 0, TAU); ctx.fill();
        eye(17, -4, 4.6);
      }
      ctx.restore();
    }
    function drawChest(c, t, dt) {
      c.t -= dt;
      if (c.ph === 'closed' && c.t <= 0) { c.ph = 'opening'; }
      if (c.ph === 'opening') { c.open = Math.min(1, c.open + dt * 1.6); if (c.open >= 1) { c.ph = 'open'; c.t = 3; } }
      else if (c.ph === 'open') { if (c.t <= 0) c.ph = 'closing'; c.bt -= dt; if (c.bt <= 0) { c.bt = .22; bubbles.push({ x: c.x + rand(-12, 12) * sc, y: c.y - 30 * sc, r: rand(2.5, 5) * sc, vy: rand(30, 45) * sc, ph: rand(0, TAU) }); } }
      else if (c.ph === 'closing') { c.open = Math.max(0, c.open - dt * 1.2); if (c.open <= 0) { c.ph = 'closed'; c.t = rand(5, 8); } }
      const w = 54 * sc, h = 30 * sc, x = c.x - w / 2, y = c.y - h;
      ctx.fillStyle = 'rgba(60,40,10,.3)'; ctx.beginPath(); ctx.ellipse(c.x, c.y + 2 * sc, w * .6, 6 * sc, 0, 0, TAU); ctx.fill();
      if (c.open > .05) {
        const gl = ctx.createRadialGradient(c.x, y, 0, c.x, y, 50 * sc); gl.addColorStop(0, `rgba(255,220,100,${c.open * .6})`); gl.addColorStop(1, 'rgba(255,220,100,0)');
        ctx.fillStyle = gl; ctx.fillRect(c.x - 50 * sc, y - 50 * sc, 100 * sc, 100 * sc);
        ctx.fillStyle = '#FFD23F'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + w * (.2 + k * .15), y + 2 * sc - Math.sin(k * 1.7) * 3 * sc, 5 * sc, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#FFF2A8'; star4(ctx, c.x + Math.sin(t * 2) * 10 * sc, y - 6 * sc, 5 * sc * c.open * (.6 + .4 * Math.sin(t * 6)));
      }
      rrect(ctx, x, y, w, h, 5 * sc); ctx.fillStyle = '#8A4E22'; ctx.fill();
      ctx.fillStyle = '#6A3814'; ctx.fillRect(x, y + h * .45, w, 2 * sc);
      ctx.fillStyle = '#E9C67E'; ctx.fillRect(x + w * .14, y, 6 * sc, h); ctx.fillRect(x + w * .86 - 6 * sc, y, 6 * sc, h);
      ctx.save(); ctx.translate(x, y); ctx.rotate(-c.open * .9);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.quadraticCurveTo(w, -16 * sc, w / 2, -16 * sc); ctx.quadraticCurveTo(0, -16 * sc, 0, 0); ctx.fillStyle = '#A3622E'; ctx.fill();
      ctx.fillStyle = '#E9C67E'; ctx.fillRect(w * .14, -15 * sc, 6 * sc, 15 * sc); ctx.fillRect(w * .86 - 6 * sc, -15 * sc, 6 * sc, 15 * sc);
      ctx.restore();
      ctx.fillStyle = '#FFD23F'; rrect(ctx, c.x - 5 * sc, y - 3 * sc, 10 * sc, 10 * sc, 2 * sc); ctx.fill();
    }

    loop(cv, (dt, t) => {
      ctx.drawImage(bgL, 0, 0, W, H);
      // light rays
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 4; k++) {
        const x0 = W * (.12 + k * .26) + Math.sin(t * .3 + k) * 20 * sc, wdt = (26 + k * 6) * sc;
        const g = ctx.createLinearGradient(0, 0, 0, sandY); g.addColorStop(0, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + wdt, 0); ctx.lineTo(x0 + wdt * 2.2 - 40 * sc, sandY); ctx.lineTo(x0 - 40 * sc, sandY); ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2 * sc;
      for (let k = 0; k < 2; k++) { ctx.beginPath(); for (let x = 0; x <= W; x += 8) { const y = 6 * sc + k * 7 * sc + Math.sin(x * .04 + t * 1.5 + k * 2) * 2.5 * sc; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
      motes.forEach(m => { m.y += m.vy * dt; if (m.y < 0) m.y = sandY; ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.arc(m.x + Math.sin(t + m.ph) * 4, m.y, m.r, 0, TAU); ctx.fill(); });
      // pebbles
      pebbles.forEach(p => {
        p.drop = Math.min(1, p.drop + dt * 1.8); const yy = p.y - (1 - p.drop) * (1 - p.drop) * 60 * sc;
        ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(p.x, yy, p.r * 1.25, p.r * .85, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(p.x - p.r * .35, yy - p.r * .3, p.r * .4, p.r * .2, -.3, 0, TAU); ctx.fill();
      });
      // plants
      ctx.lineCap = 'round';
      plants.forEach(pl => {
        pl.g = Math.min(1, pl.g + dt * .8); const gh = pl.h * (1 - Math.pow(1 - pl.g, 3)), base = sandY + 6 * sc;
        for (let j = 0; j < pl.n; j++) {
          const off = (j - (pl.n - 1) / 2) * 8 * sc, hh = gh * (.7 + .3 * Math.sin(j * 2.3 + pl.ph) ** 2);
          let px = pl.x + off, py = base;
          for (let s = 1; s <= 12; s++) {
            const u = s / 12, nx = pl.x + off + Math.sin(t * 1.1 + s * .45 + pl.ph + j) * u * u * 18 * sc, ny = base - hh * u;
            ctx.strokeStyle = s % 2 ? pl.c1 : pl.c2; ctx.lineWidth = (9 - u * 6) * sc;
            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke(); px = nx; py = ny;
          }
        }
      });
      chests.forEach(c => drawChest(c, t, dt));
      // air stones
      stones.forEach(s => {
        s.t -= dt; if (s.t <= 0) { s.t = rand(.15, .35); bubbles.push({ x: s.x + rand(-3, 3) * sc, y: sandY + 2 * sc, r: rand(2, 5.5) * sc, vy: rand(34, 52) * sc, ph: rand(0, TAU) }); }
        ctx.fillStyle = '#6F7E86'; ctx.beginPath(); ctx.ellipse(s.x, sandY + 6 * sc, 10 * sc, 5 * sc, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#9DADB5'; ctx.beginPath(); ctx.ellipse(s.x - 2 * sc, sandY + 4 * sc, 5 * sc, 2 * sc, 0, 0, TAU); ctx.fill();
      });
      // fish
      fish.forEach(f => {
        f.turnT -= dt; f.wig = Math.max(0, f.wig - dt / 1.2);
        if (f.turnT <= 0) { f.turnT = rand(4, 10); if (Math.random() < .3) f.dir *= -1; f.ty = rand(swimTop + 10 * sc, swimBot()); }
        const m = 30 * sc;
        if (f.x < m && f.dir < 0) f.dir = 1; if (f.x > W - m && f.dir > 0) f.dir = -1;
        const spd = f.sp * (f.wig > 0 ? .3 : 1);
        f.vx += (f.dir * spd - f.vx) * Math.min(1, dt * 1.2);
        f.x += f.vx * dt; f.y += (clamp(f.ty, swimTop, swimBot()) - f.y) * Math.min(1, dt * .5);
        const want = f.vx >= 0 ? 1 : -1; f.face += (want - f.face) * Math.min(1, dt * 4);
        if (Math.abs(f.face) < .08) f.face = f.face < 0 ? -.08 : .08;
        drawFish(f, t);
      });
      // bubbles
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const bb = bubbles[i]; bb.y -= bb.vy * dt;
        if (bb.y < 6 * sc) { bubbles.splice(i, 1); continue; }
        const x = bb.x + Math.sin(t * 3 + bb.ph) * 3 * sc;
        ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.3; ctx.fillStyle = 'rgba(255,255,255,.12)';
        ctx.beginPath(); ctx.arc(x, bb.y, bb.r, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(x - bb.r * .35, bb.y - bb.r * .35, bb.r * .25, 0, TAU); ctx.fill();
      }
      // hearts
      for (let i = hearts.length - 1; i >= 0; i--) {
        const h = hearts[i]; h.t += dt; if (h.t > 1.2) { hearts.splice(i, 1); continue; } if (h.t < 0) continue;
        h.y += h.vy * dt; ctx.fillStyle = `rgba(255,95,140,${1 - h.t / 1.2})`;
        heart(ctx, h.x + Math.sin(h.t * 5 + h.ph) * 6 * sc, h.y, 11 * sc);
      }
      if (tapAt) { tapAt.t += dt; const u = tapAt.t / .6; if (u >= 1) tapAt = null; else { ctx.strokeStyle = `rgba(255,255,255,${(1 - u) * .7})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(tapAt.x, tapAt.y, 8 * sc + u * 26 * sc, 0, TAU); ctx.stroke(); } }
      // glass shine
      const gs = ctx.createLinearGradient(0, 0, W * .3, 0); gs.addColorStop(0, 'rgba(255,255,255,.14)'); gs.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gs; ctx.beginPath(); ctx.moveTo(W * .04, 0); ctx.lineTo(W * .14, 0); ctx.lineTo(W * .06, H); ctx.lineTo(0, H); ctx.lineTo(0, H * .2); ctx.fill();
    });
    finishBtn(api, grid);
  }
})();
