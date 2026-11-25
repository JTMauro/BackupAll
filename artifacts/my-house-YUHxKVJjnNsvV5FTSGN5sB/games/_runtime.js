// Arcade runtime: game registry, input, audio and a fixed-step host.
// Every game file calls ArcadeRegistry.register({...}). See GAME_API.md.
(function () {
  const games = [];
  const ArcadeRegistry = {
    games,
    register(def) { games.push(def); },
    get(id) { return games.find(g => g.id === id); }
  };
  window.ArcadeRegistry = ArcadeRegistry;

  // ---------- Audio ----------
  let actx = null, master = null, muted = false;
  function ac() {
    if (!actx) {
      try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        master = actx.createGain();
        master.gain.value = 0.35;
        master.connect(actx.destination);
      } catch (e) { return null; }
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  let noiseBuf = null;
  function getNoise(c) {
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }
  const audio = {
    get muted() { return muted; },
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.35; },
    unlock() { ac(); },
    // tone(freq, dur, {type:'square'|'sine'|'triangle'|'sawtooth', vol, slideTo, delay, attack})
    tone(freq, dur = 0.1, o = {}) {
      const c = ac(); if (!c || muted) return;
      const t0 = c.currentTime + (o.delay || 0);
      const osc = c.createOscillator(), g = c.createGain();
      osc.type = o.type || 'square';
      osc.frequency.setValueAtTime(Math.max(1, freq), t0);
      if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.slideTo), t0 + dur);
      const v = (o.vol == null ? 0.2 : o.vol);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(v, t0 + (o.attack || 0.005));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g); g.connect(master);
      osc.start(t0); osc.stop(t0 + dur + 0.02);
    },
    // noise(dur, {vol, freq (lowpass cutoff), slideTo, delay, type:'lowpass'|'bandpass'|'highpass'})
    noise(dur = 0.2, o = {}) {
      const c = ac(); if (!c || muted) return;
      const t0 = c.currentTime + (o.delay || 0);
      const src = c.createBufferSource(); src.buffer = getNoise(c); src.loop = true;
      const f = c.createBiquadFilter(); f.type = o.type || 'lowpass';
      f.frequency.setValueAtTime(o.freq || 2000, t0);
      if (o.slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.slideTo), t0 + dur);
      const g = c.createGain(); const v = o.vol == null ? 0.25 : o.vol;
      g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t0); src.stop(t0 + dur + 0.02);
    },
    // sequence of [freq, dur] notes (freq 0 = rest)
    melody(notes, o = {}) {
      let t = o.delay || 0;
      for (const [f, d] of notes) { if (f) audio.tone(f, d * 0.95, { ...o, delay: t }); t += d; }
      return t;
    }
  };
  ArcadeRegistry.audio = audio;

  // ---------- Input ----------
  const held = new Set(), downThisFrame = new Set(), pendingDown = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false, _pendingClick: false };
  let activeCanvas = null, activeDef = null;

  function onKeyDown(e) {
    if (!activeDef) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!held.has(e.code)) pendingDown.add(e.code);
    held.add(e.code);
    audio.unlock();
  }
  function onKeyUp(e) { held.delete(e.code); }
  function toGame(e) {
    const r = activeCanvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / r.width * activeDef.width;
    mouse.y = (e.clientY - r.top) / r.height * activeDef.height;
  }
  function onPointerMove(e) { if (activeCanvas) toGame(e); }
  function onPointerDown(e) {
    if (!activeCanvas) return;
    toGame(e); mouse.down = true; mouse._pendingClick = true; audio.unlock();
  }
  function onPointerUp() { mouse.down = false; }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => held.clear());

  // Virtual buttons (touch overlay / gamepad) feed the same key codes.
  function virtualKey(code, isDown) {
    if (isDown) { if (!held.has(code)) pendingDown.add(code); held.add(code); audio.unlock(); }
    else held.delete(code);
  }

  // ---------- High scores ----------
  function hiKey(id) { return 'arcade.hi.' + id; }
  function getHi(id, dflt) {
    try { const v = localStorage.getItem(hiKey(id)); return v ? +v : (dflt || 0); } catch (e) { return dflt || 0; }
  }
  function setHi(id, n) { try { if (n > getHi(id)) localStorage.setItem(hiKey(id), String(n)); } catch (e) { } }

  // ---------- Host ----------
  // ArcadeRegistry.run(id, canvas, {onExit}) -> {stop()}
  ArcadeRegistry.run = function (id, canvas, opts = {}) {
    const def = ArcadeRegistry.get(id);
    if (!def) throw new Error('Unknown game ' + id);
    activeDef = def; activeCanvas = canvas;
    canvas.width = def.width; canvas.height = def.height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    held.clear(); pendingDown.clear(); downThisFrame.clear();

    const api = {
      width: def.width, height: def.height, time: 0, frame: 0,
      key: code => held.has(code),
      pressed: code => downThisFrame.has(code),
      anyPressed: (...codes) => codes.some(c => downThisFrame.has(c)),
      mouse,
      audio,
      // Coin-op: the shell passes opts.coins = {credits, onChange}; without it (test page) it is free play.
      get credits() { return opts.coins ? opts.coins.credits : 99; },
      useCredit() {
        if (!opts.coins) return true;
        if (opts.coins.credits > 0) { opts.coins.credits--; opts.coins.onChange && opts.coins.onChange(); return true; }
        return false;
      },
      getHiScore: dflt => getHi(def.id, dflt),
      setHiScore: n => setHi(def.id, n),
      exit: () => opts.onExit && opts.onExit(),
      // Continue: call when the last life is lost. The game freezes under a 5-second CONTINUE? countdown.
      // A coin inserted during it (or Start with a spare credit) spends a credit and calls onContinue();
      // otherwise onEnd() runs and the game should do its normal GAME OVER.
      offerContinue(onContinue, onEnd) {
        if (cont) return;
        cont = { t: 5, onContinue, onEnd, last: api.credits, sec: 6 };
      },
      get continuing() { return !!cont; }
    };
    let cont = null;
    function stepContinue() {
      cont.t -= STEP;
      const sec = Math.max(0, Math.ceil(cont.t));
      if (sec !== cont.sec) { cont.sec = sec; if (sec > 0) audio.tone(sec === 1 ? 660 : 523, .09, { type: 'square', vol: .18 }); }
      const coinIn = api.credits > cont.last; cont.last = api.credits;
      const start = downThisFrame.has('Enter') || downThisFrame.has('Space');
      if ((coinIn || (start && api.credits > 0)) && api.useCredit()) {
        const f = cont.onContinue; cont = null;
        audio.melody([[523, .07], [659, .07], [784, .07], [1047, .16]], { type: 'square', vol: .16 });
        try { f && f(); } catch (e) { console.error(e); }
        return;
      }
      if (cont.t <= 0) { const f = cont.onEnd; cont = null; try { f && f(); } catch (e) { console.error(e); } }
    }
    function drawContinue(ctx) {
      const W = def.width, H = def.height, k = W / 224;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const font = sz => `${Math.round(sz * k)}px "Press Start 2P", ui-monospace, monospace`;
      ctx.fillStyle = '#ffd24a'; ctx.font = font(14); ctx.fillText('CONTINUE?', W / 2, H * .36);
      const n = Math.max(0, Math.ceil(cont.t));
      const pulse = 1 + (cont.t % 1) * .25;
      ctx.font = font(44 * pulse); ctx.fillStyle = n <= 2 ? '#ff4040' : '#ffffff'; ctx.fillText(String(n), W / 2, H * .52);
      const blink = Math.floor(cont.t * 4) % 2 === 0;
      ctx.font = font(8); ctx.fillStyle = '#38f4ff';
      if (blink) ctx.fillText(api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, H * .68);
      ctx.fillStyle = '#aaa'; ctx.fillText(`CREDIT ${String(Math.min(99, api.credits)).padStart(2, '0')}`, W / 2, H * .76);
      ctx.restore();
    }
    let game = def.create(api);
    let last = performance.now(), acc = 0, raf = 0, running = true;
    const STEP = 1 / 60;
    function frame(now) {
      if (!running) return;
      acc += Math.min(0.1, (now - last) / 1000); last = now;
      // gamepad polling
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const p = pads && pads[0];
      if (p) {
        const map = [['ArrowLeft', p.axes[0] < -0.5 || (p.buttons[14] && p.buttons[14].pressed)],
        ['ArrowRight', p.axes[0] > 0.5 || (p.buttons[15] && p.buttons[15].pressed)],
        ['ArrowUp', p.axes[1] < -0.5 || (p.buttons[12] && p.buttons[12].pressed)],
        ['ArrowDown', p.axes[1] > 0.5 || (p.buttons[13] && p.buttons[13].pressed)],
        ['Space', p.buttons[0] && p.buttons[0].pressed],
        ['KeyX', p.buttons[1] && p.buttons[1].pressed],
        ['Enter', p.buttons[9] && p.buttons[9].pressed]];
        for (const [c, on] of map) {
          const k = 'pad:' + c;
          if (on && !held.has(k)) { held.add(k); virtualKey(c, true); }
          else if (!on && held.has(k)) { held.delete(k); virtualKey(c, false); }
        }
      }
      let steps = 0;
      while (acc >= STEP && steps < 6) {
        downThisFrame.clear();
        for (const c of pendingDown) downThisFrame.add(c);
        pendingDown.clear();
        mouse.clicked = mouse._pendingClick; mouse._pendingClick = false;
        try { if (cont) stepContinue(); else game.update(STEP); } catch (e) { console.error(e); }
        api.time += STEP; api.frame++;
        acc -= STEP; steps++;
      }
      try { game.render(ctx); if (cont) drawContinue(ctx); } catch (e) { console.error(e); }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return {
      def,
      stop() {
        running = false; cancelAnimationFrame(raf);
        try { game.destroy && game.destroy(); } catch (e) { }
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointerup', onPointerUp);
        activeDef = null; activeCanvas = null; held.clear();
      }
    };
  };
  ArcadeRegistry.virtualKey = virtualKey;
})();
