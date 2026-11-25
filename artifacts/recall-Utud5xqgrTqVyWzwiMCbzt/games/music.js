/* Recall: music games. Play a Tune (gentle), Tap Along (relax), Stained Glass (relax).
   Real instrument recordings come from samples/*.json and play through R.audio()'s bus. */
(function () {
  const { register, el, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor } = R;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  /* =========================================================
     Shared little sampler (decoded buffers kept for the visit)
     ========================================================= */
  const SM = { bufs: {}, loading: {} };
  const MIXM = { acoustic_grand_piano: .62, acoustic_bass: 1.15, alto_sax: .42, tenor_sax: .44, clarinet: .44, muted_trumpet: .3, trombone: .34, vibraphone: .46, string_ensemble_1: .26, acoustic_guitar_nylon: .42 };
  const WIND = { alto_sax: 1, tenor_sax: 1, clarinet: 1, muted_trumpet: 1, trombone: 1, string_ensemble_1: 1 };
  function AC() { try { return R.audio ? R.audio() : null; } catch (e) { return null; } }
  function loadInst(name) {
    if (SM.loading[name]) return SM.loading[name];
    const a = AC();
    if (!a || !window.fetch) return Promise.resolve(false);
    SM.loading[name] = fetch('samples/' + name + '.json')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('missing')))
      .then(obj => Promise.all(Object.keys(obj).map(k => new Promise(res => {
        try {
          const bin = atob(obj[k]), u = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
          const p = a.ctx.decodeAudioData(u.buffer, ab => res([+k, ab]), () => res(null));
          if (p && p.catch) p.catch(() => res(null));
        } catch (e) { res(null); }
      }))))
      .then(list => { const ok = list.filter(Boolean).sort((x, y) => x[0] - y[0]); if (!ok.length) throw new Error('none'); SM.bufs[name] = ok; return true; })
      .catch(() => { delete SM.loading[name]; return false; });
    return SM.loading[name];
  }
  /* resolves when all loaded, or after ms, whichever is first */
  function loadSome(names, ms, later) {
    return new Promise(res => {
      let done = false; const go = () => { if (!done) { done = true; res(); } };
      Promise.all(names.map(loadInst)).then(go, go); later(go, ms);
    });
  }
  /* a per-game mixer: gain into the core bus, a touch of room, and a watchdog that fades it when the game is left */
  function mixer(api, vol) {
    const a = AC(); if (!a) return null;
    const ctx = a.ctx;
    try {
      const out = ctx.createGain(); out.gain.value = vol; out.connect(a.bus);
      const dry = ctx.createGain(); dry.connect(out);
      const len = Math.floor(ctx.sampleRate * 1.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
      const rev = ctx.createConvolver(); rev.buffer = ir; const wet = ctx.createGain(); wet.gain.value = .16;
      dry.connect(rev); rev.connect(wet); wet.connect(out);
      const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      const M = { ctx, in: dry, out, noise, dead: false };
      M.fade = (s = .25) => {
        if (M.dead) return; M.dead = true;
        try { out.gain.cancelScheduledValues(ctx.currentTime); out.gain.setTargetAtTime(0, ctx.currentTime, s / 3); } catch (e) {}
        setTimeout(() => { try { out.disconnect(); } catch (e) {} }, s * 1000 + 1500);
      };
      const iv = setInterval(() => { if (!api.stage.isConnected) { clearInterval(iv); M.fade(.15); } }, 200);
      return M;
    } catch (e) { return null; }
  }
  /* D is {ctx, in, noise, dead} (a mixer, or a band layer on top of one) */
  function voice(D, name, t, m, dur, vel, o = {}) {
    if (!D || D.dead) return;
    const ctx = D.ctx, set = SM.bufs[name];
    try {
      if (set) {
        let best = set[0]; for (const s of set) if (Math.abs(s[0] - m) < Math.abs(best[0] - m)) best = s;
        const src = ctx.createBufferSource(); src.buffer = best[1]; src.playbackRate.value = Math.pow(2, (m - best[0]) / 12);
        if (o.scoop) { src.detune.setValueAtTime(-o.scoop, t); src.detune.linearRampToValueAtTime(0, t + .09); }
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400 + vel * vel * 9000; lp.Q.value = .3;
        const g = ctx.createGain(), peak = vel * (MIXM[name] || .35), a = o.attack || .005, rel = o.release || .2;
        const hold = Math.max(a, Math.min(dur, best[1].duration / src.playbackRate.value - rel));
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a);
        g.gain.setValueAtTime(peak, t + hold); g.gain.linearRampToValueAtTime(0, t + hold + rel);
        src.connect(lp); lp.connect(g); g.connect(D.in); src.start(t); src.stop(t + hold + rel + .05);
      } else {
        /* stand-in synth voice */
        const bass = name === 'acoustic_bass', wind = WIND[name];
        const g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
        lp.frequency.value = bass ? 500 : wind ? 1400 : 2600; lp.connect(g); g.connect(D.in);
        const pk = vel * (bass ? .22 : wind ? .07 : .1);
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(pk, t + (wind ? .05 : .01));
        g.gain.exponentialRampToValueAtTime(wind ? pk * .8 : pk * .3, t + Math.max(.05, dur * .6)); g.gain.exponentialRampToValueAtTime(.0001, t + dur + .3);
        const osc = ctx.createOscillator(); osc.type = wind ? 'square' : 'triangle'; osc.frequency.value = mtof(m);
        osc.connect(lp); osc.start(t); osc.stop(t + dur + .35);
      }
    } catch (e) {}
  }
  function noiseHit(D, t, o) {
    if (!D || D.dead) return;
    try {
      const ctx = D.ctx, s = ctx.createBufferSource(); s.buffer = D.noise;
      const f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = o.type || 'highpass'; f.frequency.setValueAtTime(o.f || 3800, t); if (o.f2) f.frequency.linearRampToValueAtTime(o.f2, t + (o.dec || .1)); f.Q.value = o.q || .7;
      g.gain.setValueAtTime(.0001, t);
      if (o.swell) g.gain.linearRampToValueAtTime(o.v, t + o.swell); else g.gain.exponentialRampToValueAtTime(o.v, t + .004);
      g.gain.exponentialRampToValueAtTime(.0001, t + (o.swell || 0) + (o.dec || .07));
      s.connect(f); f.connect(g); g.connect(D.in); s.start(t, Math.random() * .4); s.stop(t + (o.swell || 0) + (o.dec || .07) + .05);
    } catch (e) {}
  }
  const brush = (D, t, v, kind) => kind === 'sweep'
    ? noiseHit(D, t, { type: 'bandpass', f: 1800, f2: 3200, q: .7, v, swell: .12, dec: .4 })
    : noiseHit(D, t, { f: 3800, v, dec: kind === 'slap' ? .16 : .07 });
  function boom(D, t, v, f0 = 80, f1 = 45, dec = .22) {
    if (!D || D.dead) return;
    try {
      const ctx = D.ctx, o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dec * .55);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + dec);
      o.connect(g); g.connect(D.in); o.start(t); o.stop(t + dec + .05);
    } catch (e) {}
  }

  /* harmony helpers */
  const PCN = { C: 0, Db: 1, 'C#': 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
  const QUAL = { '': [0, 4, 7], maj: [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9], dim7: [0, 3, 6, 9] };
  const chd = s => { const [r, q] = s.split(':'); return { root: PCN[r], q: QUAL[q || ''] || QUAL[''] }; };
  const above = (pc, lo) => lo + ((pc - lo) % 12 + 12) % 12;
  const chordPcs = c => c.q.map(i => (c.root + i) % 12);
  const voicing = (c, lo) => [...new Set(c.q.map(i => above(c.root + i, lo)))].sort((a, b) => a - b);
  function nearest(pcs, target, lo, hi) {
    for (let d = 0; d < 12; d++) for (const m of [target + d, target - d]) if (m >= lo && m <= hi && pcs.includes(((m % 12) + 12) % 12)) return m;
    return Math.max(lo, Math.min(hi, target));
  }

  /* =========================================================
     1. PLAY A TUNE
     ========================================================= */
  R.css(`
.pt-wrap{display:flex; flex-direction:column; align-items:center; gap:12px; max-width:660px; margin:0 auto}
.pt-pick{display:grid; grid-template-columns:1fr; gap:14px; width:100%; max-width:440px; margin:6px auto 0}
.pt-pick .btn{justify-content:flex-start; font-size:1.3rem; min-height:76px; padding:.5em .9em; text-align:left}
.pt-pick .btn .e{font-size:2.1rem; width:1.4em; text-align:center; flex:none}
.pt-title{font:700 1.35rem/1.2 var(--display); text-align:center; display:flex; align-items:center; gap:.4em}
.pt-strip{display:flex; gap:8px; align-items:center; justify-content:center; min-height:66px; flex-wrap:nowrap; max-width:100%; overflow:hidden}
.pt-bub{flex:none; width:42px; height:42px; border-radius:50%; display:grid; place-items:center; font:700 1.25rem var(--display); color:var(--ink);
  background:linear-gradient(155deg, rgba(255,255,255,.5), rgba(255,255,255,0) 55%), var(--kc); box-shadow:0 4px 0 var(--kd), 0 6px 10px rgba(0,0,0,.25); opacity:.82}
.pt-bub.now{width:62px; height:62px; font-size:1.75rem; opacity:1; animation:pt-bob 1.1s ease-in-out infinite}
.pt-bub.far{width:32px; height:32px; font-size:1rem; opacity:.55}
@keyframes pt-bob{50%{transform:translateY(-5px) scale(1.06)}}
.pt-prog{width:100%; max-width:520px; height:12px; background:rgba(0,0,0,.25); border-radius:8px; overflow:hidden}
.pt-prog i{display:block; height:100%; width:0; background:linear-gradient(90deg, var(--sun), var(--coral)); border-radius:8px; transition:width .3s}
.pt-board{width:100%; padding:14px 10px 16px; border-radius:24px;
  background:linear-gradient(180deg, #7A4A28, #4A2B15); box-shadow:inset 0 3px 0 rgba(255,255,255,.18), 0 8px 0 #2f1b0c, 0 14px 22px rgba(0,0,0,.35)}
.pt-keys{position:relative; display:flex; gap:4px; height:260px}
.pt-key{flex:1 1 0; min-width:0; position:relative; border:0; border-radius:6px 6px 16px 16px; cursor:pointer; padding:0;
  background:linear-gradient(180deg, rgba(255,255,255,.62), rgba(255,255,255,.18) 45%, rgba(255,255,255,0) 70%), var(--kc);
  box-shadow:inset 0 -12px 0 rgba(0,0,0,.16), inset 0 2px 0 rgba(255,255,255,.7), 0 7px 0 var(--kd), 0 10px 14px rgba(0,0,0,.3);
  transition:transform .08s, box-shadow .08s, filter .2s; touch-action:manipulation}
.pt-key .lab{position:absolute; left:0; right:0; bottom:16px; font:700 1.3rem var(--display); color:var(--ink); text-align:center; pointer-events:none}
.pt-key .star{position:absolute; left:50%; bottom:50px; transform:translateX(-50%) scale(0); font-size:1.6rem; color:#fff; text-shadow:0 2px 4px rgba(0,0,0,.4); transition:transform .2s; pointer-events:none}
.pt-key.go{z-index:2; transform:translateY(-3px); filter:brightness(1.12) saturate(1.1);
  box-shadow:inset 0 -12px 0 rgba(0,0,0,.12), 0 7px 0 var(--kd), 0 0 0 4px #fff, 0 0 28px 10px rgba(255,236,150,.9); animation:pt-glow 1.1s ease-in-out infinite alternate}
.pt-key.go .star{transform:translateX(-50%) scale(1)}
.pt-key.go.nudge{animation:pt-glow .45s ease-in-out infinite alternate}
@keyframes pt-glow{to{box-shadow:inset 0 -12px 0 rgba(0,0,0,.12), 0 7px 0 var(--kd), 0 0 0 5px #fff, 0 0 40px 18px rgba(255,236,150,1)}}
.pt-key.nx::after{content:''; position:absolute; inset:6px 6px 12px; border:3px dashed rgba(255,255,255,.9); border-radius:6px 6px 12px 12px; pointer-events:none}
.pt-key.down{transform:translateY(6px); box-shadow:inset 0 -6px 0 rgba(0,0,0,.16), 0 1px 0 var(--kd), 0 3px 6px rgba(0,0,0,.25)}
.pt-key.play{filter:brightness(1.25); box-shadow:inset 0 -12px 0 rgba(0,0,0,.12), 0 7px 0 var(--kd), 0 0 0 4px #fff, 0 0 26px 8px rgba(255,255,255,.85)}
.pt-blk{position:absolute; top:0; height:52%; border-radius:0 0 8px 8px; pointer-events:none; z-index:3;
  background:linear-gradient(180deg, #3a3a40, #121216); box-shadow:inset 0 -6px 0 rgba(255,255,255,.08), 0 5px 0 #000, 0 7px 10px rgba(0,0,0,.4)}
.pt-row{display:flex; gap:12px; flex-wrap:wrap; justify-content:center}
.pt-notes{font:600 1.05rem var(--display); color:var(--on-table-soft)}
`);
  const KEYCOL = { 0: 'coral', 2: 'orange', 4: 'sun', 5: 'leaf', 7: 'sky', 9: 'grape', 11: 'berry' };
  const LET = { 0: 'C', 2: 'D', 4: 'E', 5: 'F', 7: 'G', 9: 'A', 11: 'B' };
  const WHITE = [0, 2, 4, 5, 7, 9, 11];
  /* Melodies in C major (white keys only). [Chord] marks a chord change, NOTE/beats, r = rest, || = end of the short version. */
  const TUNES = [
    { id: 'mary', name: 'Mary Had a Little Lamb', ic: '🐑', bpm: 112, meter: 4, up: 0,
      s: '[C]E4 D4 C4 D4 E4 E4 E4/2 [G]D4 D4 D4/2 [C]E4 G4 G4/2 || E4 D4 C4 D4 E4 E4 E4 E4 [G]D4 D4 E4 D4 [C]C4/4' },
    { id: 'twinkle', name: 'Twinkle Twinkle Little Star', ic: '⭐', bpm: 104, meter: 4, up: 0,
      s: '[C]C4 C4 G4 G4 [F]A4 A4 [C]G4/2 [F]F4 F4 [C]E4 E4 [G]D4 D4 [C]C4/2 || [C]G4 G4 [F]F4 F4 [C]E4 E4 [G]D4/2 [C]G4 G4 [F]F4 F4 [C]E4 E4 [G]D4/2 [C]C4 C4 G4 G4 [F]A4 A4 [C]G4/2 [F]F4 F4 [C]E4 E4 [G]D4 D4 [C]C4/2' },
    { id: 'ode', name: 'Ode to Joy', ic: '🎼', bpm: 108, meter: 4, up: 0,
      s: '[C]E4 E4 F4 G4 [G]G4 F4 E4 D4 [C]C4 C4 D4 E4 [G]E4/1.5 D4/.5 D4/2 [C]E4 E4 F4 G4 [G]G4 F4 E4 D4 [C]C4 C4 D4 E4 [G]D4/1.5 C4/.5 [C]C4/2 || [G]D4 D4 [C]E4 C4 [G]D4 E4/.5 F4/.5 [C]E4 C4 [G]D4 E4/.5 F4/.5 [C]E4 D4 [Am]C4 [D]D4 [G]G3/2 [C]E4 E4 F4 G4 [G]G4 F4 E4 D4 [C]C4 C4 D4 E4 [G]D4/1.5 C4/.5 [C]C4/2' },
    { id: 'frere', name: 'Frère Jacques', ic: '🔔', bpm: 104, meter: 4, up: 0,
      s: '[C]C4 D4 E4 C4 C4 D4 E4 C4 E4 F4 G4/2 E4 F4 G4/2 || G4/.5 A4/.5 G4/.5 F4/.5 E4 C4 G4/.5 A4/.5 G4/.5 F4/.5 E4 C4 C4 [G]G3 [C]C4/2 C4 [G]G3 [C]C4/2' },
    { id: 'london', name: 'London Bridge', ic: '🌉', bpm: 112, meter: 4, up: 0,
      s: '[C]G4/1.5 A4/.5 G4 F4 E4 F4 G4/2 [G7]D4 E4 F4/2 [C]E4 F4 G4/2 || [C]G4/1.5 A4/.5 G4 F4 E4 F4 G4/2 [G7]D4/2 G4/2 [C]E4 C4/3' },
    { id: 'row', name: 'Row, Row, Row Your Boat', ic: '🚣', bpm: 200, meter: 6, up: 0,
      s: '[C]C4/3 C4/3 C4/2 D4 E4/3 E4/2 D4 E4/2 F4 G4/6 || C5 C5 C5 G4 G4 G4 E4 E4 E4 C4 C4 C4 [G7]G4/2 F4 E4/2 D4 [C]C4/6' },
    { id: 'jingle', name: 'Jingle Bells', ic: '🛷', bpm: 132, meter: 4, up: 0,
      s: '[C]E4 E4 E4/2 E4 E4 E4/2 E4 G4 C4/1.5 D4/.5 E4/4 [F]F4 F4 F4/1.5 F4/.5 [C]F4 E4 E4 E4/.5 E4/.5 [D7]E4 D4 D4 E4 [G7]D4/2 G4/2 || [C]E4 E4 E4/2 E4 E4 E4/2 E4 G4 C4/1.5 D4/.5 E4/4 [F]F4 F4 F4 F4 [C]F4 E4 E4 E4/.5 E4/.5 [G7]G4 G4 F4 D4 [C]C4/4' },
    { id: 'birthday', name: 'Happy Birthday', ic: '🎂', bpm: 104, meter: 3, up: 1,
      s: 'G3/.75 G3/.25 [C]A3 G3 C4 [G7]B3/2 G3/.75 G3/.25 A3 G3 D4 [C]C4/2 G3/.75 G3/.25 [C7]G4 E4 C4 [F]B3 A3 F4/.75 F4/.25 [C]E4 C4 [G7]D4 [C]C4/2' },
    { id: 'brahms', name: 'Brahms’ Lullaby', ic: '🌙', bpm: 84, meter: 3, up: 1,
      s: 'E4/.5 E4/.5 [C]G4/2 E4/.5 E4/.5 G4/2 E4/.5 G4/.5 [F]C5 B4 A4 [C]A4 G4 [G7]D4/.5 E4/.5 F4 D4 D4/.5 E4/.5 F4/2 D4/.5 F4/.5 B4/.5 A4/.5 G4 B4 [C]C5/2' },
    { id: 'saints', name: 'When the Saints Go Marching In', ic: '🎺', bpm: 120, meter: 4, up: 0,
      s: '[C]r C4 E4 F4 G4/4 r C4 E4 F4 G4/4 r C4 E4 F4 G4/2 E4/2 C4/2 E4/2 [G7]D4/4 || r E4 E4 D4 [C]C4/3 [C7]C4 [F]E4/2 G4/2 G4/2 F4/2 [C]r C4 E4 F4 G4/2 E4/2 [G7]C4/2 D4/2 [C]C4/4' },
    { id: 'auld', name: 'Auld Lang Syne', ic: '🥂', bpm: 84, meter: 4, up: 1,
      s: 'G3 [C]C4/1.5 C4/.5 C4 E4 [G7]D4/1.5 C4/.5 D4 E4 [C]C4/1.5 C4/.5 E4 G4 [F]A4/3 || A4 [C]G4/1.5 E4/.5 E4 C4 [G7]D4/1.5 C4/.5 D4 E4 [Am]C4/1.5 A3/.5 A3 [G7]G3 [C]C4/3' },
    { id: 'grace', name: 'Amazing Grace', ic: '🕊️', bpm: 80, meter: 3, up: 1,
      s: 'G3 [C]C4/2 E4/.5 C4/.5 E4/2 D4 [F]C4/2 A3 [C]G3/2 G3 C4/2 E4/.5 C4/.5 [G]E4/2 D4 G4/5 || [C]E4 G4/2 E4/.5 C4/.5 [G]E4/2 D4 [F]C4/2 A3 [C]G3/2 G3 C4/2 E4/.5 C4/.5 [G7]E4/2 D4 [C]C4/2' }
  ];
  function noteNum(s) { const m = s.match(/^([A-G])(\d)$/); return 12 * (+m[2] + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]; }
  function parseTune(T) {
    const notes = []; let chord = null, b = 0, cut = null;
    T.s.trim().split(/\s+/).forEach(tok => {
      if (tok === '||') { cut = notes.length; return; }
      const mm = tok.match(/^(?:\[([A-G][b#]?)(m7|maj7|m|7|6)?\])?(r|[A-G]\d)(?:\/([\d.]+))?$/);
      if (!mm) throw new Error('bad token ' + tok + ' in ' + T.id);
      if (mm[1]) chord = { root: PCN[mm[1]], q: QUAL[mm[2] || ''] };
      const d = mm[4] ? +mm[4] : 1;
      notes.push({ m: mm[3] === 'r' ? null : noteNum(mm[3]), b, d, ch: chord, chNew: !!mm[1] });
      b += d;
    });
    return { notes, cut, len: b };
  }
  R._musicTunes = TUNES.map(t => Object.assign({ parsed: parseTune(t) }, t));   /* for tests */

  function startPlayTune(level, api) {
    const L = Math.max(1, level | 0);
    const full = L >= 3;
    const poolN = Math.min(TUNES.length, 4 + L);
    const offer = shuffle(TUNES.slice(0, poolN).slice()).slice(0, 3);
    const M = mixer(api, 1);
    loadInst('acoustic_grand_piano'); loadInst('acoustic_bass');
    const wrap = el('div', 'pt-wrap'); api.stage.append(wrap);

    api.hint('Pick a tune to play on the piano.');
    const pk = el('div', 'pt-pick');
    const cols = ['c-peach', 'c-mint', 'c-sky'];
    offer.forEach((T, i) => {
      const b = el('button', 'btn ' + cols[i], `<span class="e" aria-hidden="true">${T.ic}</span><span>${T.name}</span>`); b.type = 'button';
      b.onclick = () => { sfx.tap(); play(T); };
      pk.append(b);
    });
    wrap.append(pk);

    function pianoOK() { return !!(M && SM.bufs.acoustic_grand_piano); }
    function pnote(m, dur, vel, t) {
      if (pianoOK()) voice(M, 'acoustic_grand_piano', t == null ? M.ctx.currentTime + .005 : t, m, dur, vel, { release: .5 });
      else tone(mtof(m), Math.max(.25, dur), 'triangle', .04 + .14 * vel, t == null || !M ? 0 : Math.max(0, t - M.ctx.currentTime));
    }
    function accChord(ch, vel, t, dur) {
      if (!ch) return;
      const V = voicing(ch, 48);
      if (pianoOK()) V.forEach((m, i) => voice(M, 'acoustic_grand_piano', t + i * .012, m, dur, vel * (.85 + Math.random() * .2), { release: .4 }));
      else if (!M) V.forEach(m => tone(mtof(m), dur, 'sine', .035 * vel / .3));
      else V.forEach(m => voice(M, 'acoustic_grand_piano', t, m, dur, vel));
    }
    function accBass(ch, vel, t, dur, fifth) {
      if (!ch) return;
      const m = above(ch.root + (fifth ? 7 : 0), 36);
      if (M) voice(M, 'acoustic_bass', t, m, dur, vel, { release: .25 });
      else tone(mtof(m + 12), dur, 'triangle', .1);
    }

    function play(T) {
      wrap.innerHTML = '';
      const P = parseTune(T);
      const all = P.notes;
      const useN = !full && P.cut ? P.cut : all.length;
      const song = all.slice(0, useN);
      const taps = song.filter(n => n.m != null);
      const ms = taps.map(n => n.m);
      let lo = Math.min(...ms), hi = Math.max(...ms);
      const keys = [];
      for (let m = lo; m <= hi; m++) if (WHITE.includes(m % 12)) keys.push(m);
      while (keys.length < 8) {
        const top = keys[keys.length - 1], bot = keys[0];
        if (top < 74) { let m = top + 1; while (!WHITE.includes(m % 12)) m++; keys.push(m); }
        else { let m = bot - 1; while (!WHITE.includes(m % 12)) m--; keys.unshift(m); }
      }
      wrap.append(el('div', 'pt-title', `<span aria-hidden="true">${T.ic}</span><span>${T.name}</span>`));
      const strip = el('div', 'pt-strip'); wrap.append(strip);
      const prog = el('div', 'pt-prog', '<i></i>'); wrap.append(prog);
      const board = el('div', 'pt-board'), kw = el('div', 'pt-keys'); board.append(kw); wrap.append(board);
      const row = el('div', 'pt-row'); wrap.append(row);
      const n = keys.length;
      const kEls = keys.map((m, i) => {
        const c = KEYCOL[m % 12];
        const b = el('button', 'pt-key', `<span class="star" aria-hidden="true">★</span><span class="lab">${LET[m % 12]}</span>`); b.type = 'button';
        b.style.setProperty('--kc', `var(--${c})`); b.style.setProperty('--kd', `var(--${c}-d)`);
        b.setAttribute('aria-label', 'Piano key ' + LET[m % 12]);
        b.dataset.m = m;
        b.addEventListener('pointerdown', e => { e.preventDefault(); press(i); });
        b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); press(i); } });
        kw.append(b);
        return b;
      });
      keys.forEach((m, i) => {
        if (i < n - 1 && [0, 2, 5, 7, 9].includes(m % 12)) {
          const k = el('div', 'pt-blk');
          k.style.left = `calc(${(i + 1) / n} * (100% + 4px) - 2px - ${.29 / n} * (100% + 4px))`;
          k.style.width = `calc(${.58 / n} * (100% + 4px))`;
          kw.append(k);
        }
      });
      const keyIdx = m => keys.indexOf(m);

      let pos = 0, mistakes = 0, missedHere = false, busy = false, token = 0;
      api.hint('Tap the glowing key with the star. The tune waits for you.');
      function showStrip() {
        strip.innerHTML = '';
        taps.slice(pos, pos + 6).forEach((nn, k) => {
          const c = KEYCOL[nn.m % 12];
          const b = el('div', 'pt-bub' + (k === 0 ? ' now' : k >= 4 ? ' far' : ''), LET[nn.m % 12]);
          b.style.setProperty('--kc', `var(--${c})`); b.style.setProperty('--kd', `var(--${c}-d)`);
          strip.append(b);
        });
        prog.firstChild.style.width = (100 * pos / taps.length) + '%';
      }
      function light() {
        kEls.forEach(k => k.classList.remove('go', 'nx', 'nudge'));
        if (pos >= taps.length) return;
        const cur = keyIdx(taps[pos].m); kEls[cur].classList.add('go');
        if (pos + 1 < taps.length) { const nx = keyIdx(taps[pos + 1].m); if (nx !== cur) kEls[nx].classList.add('nx'); }
        showStrip();
        const my = ++token;
        api.later(() => { if (my === token && !busy) { kEls[cur].classList.add('nudge'); api.hint('Tap the key that is glowing, with the white star on it.'); } }, 8000);
      }
      function press(i) {
        if (busy || pos >= taps.length) return;
        const k = kEls[i], m = keys[i];
        k.classList.add('down'); api.later(() => k.classList.remove('down'), 160);
        const want = taps[pos];
        if (m === want.m) {
          const spb = 60 / T.bpm, dur = Math.max(.35, Math.min(1.6, want.d * spb * 1.1));
          pnote(m, dur, .72);
          if (want.chNew || pos === 0) {
            const t = M ? M.ctx.currentTime + .01 : 0;
            accChord(want.ch, .2, t, Math.max(.8, dur * 1.5)); accBass(want.ch, .38, t, Math.max(.8, dur * 1.5));
          }
          if (missedHere) mistakes++;
          missedHere = false; pos++;
          if (pos === taps.length) return finish();
          if (pos % 8 === 0) api.hint(pick(['Lovely playing!', 'That sounds beautiful.', 'You’re doing wonderfully.', 'Keep going, nice and easy.']) + ' Follow the glowing key.');
          light();
        } else {
          pnote(m, .4, .18); missedHere = true; sfx.soft();
          const ck = kEls[keyIdx(want.m)]; ck.classList.add('nudge'); wob(ck);
          api.hint('That’s a different note. Try the glowing key with the star.');
        }
      }
      function finish() {
        busy = true; token++;
        kEls.forEach(k => k.classList.remove('go', 'nx', 'nudge'));
        strip.innerHTML = ''; prog.firstChild.style.width = '100%';
        sfx.good(); toast(cheer());
        api.hint('Bravo! Now listen to your whole tune, with the band joining in.');
        api.later(playback, 1300);
      }
      function playback() {
        const spb = 60 / T.bpm * (T.meter === 6 ? 1 : 1), t0 = (M ? M.ctx.currentTime : 0) + .25;
        const total = song.reduce((a, x) => Math.max(a, x.b + x.d), 0);
        /* melody */
        song.forEach(nn => {
          if (nn.m == null) return;
          const dur = nn.d * spb * .95, idx = keyIdx(nn.m);
          if (pianoOK()) voice(M, 'acoustic_grand_piano', t0 + nn.b * spb, nn.m, dur, .74, { release: .5 });
          else api.later(() => tone(mtof(nn.m), Math.max(.25, dur), 'triangle', .15), (nn.b * spb + .25) * 1000);
          api.later(() => { kEls[idx].classList.add('play'); }, (nn.b * spb + .25) * 1000);
          api.later(() => { kEls[idx].classList.remove('play'); }, (nn.b * spb + .25 + Math.max(.15, dur * .8)) * 1000);
        });
        /* accompaniment: oom-pah, by metre */
        const chordAt = b => { let c = null; for (const x of song) { if (x.b <= b + 1e-6) c = x.ch; else break; } return c; };
        const pat = T.meter === 3 ? [[0, 'b'], [1, 'c'], [2, 'c']] : T.meter === 6 ? [[0, 'bc'], [3, 'c']] : [[0, 'bc'], [2, 'bc5']];
        for (let bar = T.up ? T.up - T.meter : 0; bar < total; bar += T.meter) {
          pat.forEach(([o, what]) => {
            const b = bar + o; if (b < T.up - 1e-6 || b >= total - .01) return;
            const ch = chordAt(b); const t = t0 + b * spb;
            const isLast = b + T.meter >= total - .01 && o === 0;
            const len = isLast ? spb * 3 : (T.meter === 3 ? spb * .8 : spb * (T.meter === 6 ? 2.6 : 1.7));
            const go = () => {
              if (what.includes('b')) accBass(ch, .5, M ? t : 0, isLast ? spb * 3 : spb * (T.meter === 6 ? 2.8 : 1.6), what.includes('5') && !isLast);
              if (what.includes('c')) accChord(ch, T.meter === 3 && o ? .17 : .22, M ? t : 0, len);
            };
            if (pianoOK() || M) go(); else api.later(go, (b * spb + .25) * 1000);
          });
        }
        const lenMs = (total * spb + 1.6) * 1000;
        const fin = el('button', 'btn c-mint', '✓ Finish'); fin.type = 'button';
        let ended = false;
        const end = () => { if (ended) return; ended = true; if (M && !M.dead) M.fade(.4); api.done(starsFor(mistakes, 2, 6)); };
        fin.onclick = () => { sfx.tap(); end(); };
        row.innerHTML = ''; row.append(fin);
        api.later(() => { sfx.win(); end(); }, lenMs);
      }
      light();
    }
  }
  register({ id: 'playtune', cat: 'gentle', order: 42, name: 'Play a Tune', icon: '🎹', desc: 'Tap the glowing keys to play an old favourite', gentle: true, start: startPlayTune });

  /* =========================================================
     2. TAP ALONG
     ========================================================= */
  R.css(`
.ta-wrap{display:flex; flex-direction:column; align-items:center; gap:14px; max-width:620px; margin:0 auto; --pl:0}
.ta-grooves{display:flex; gap:8px; flex-wrap:wrap; justify-content:center}
.ta-grooves .btn{min-height:58px; font-size:1.05rem; padding:.45em .6em; gap:.3em}
.ta-grooves .btn.on{box-shadow:0 6px 0 var(--d), 0 0 0 4px #fff, 0 10px 18px rgba(0,0,0,.25)}
.ta-grooves .btn:not(.on){opacity:.8}
.ta-band{width:100%; max-width:440px; border-radius:24px; padding:12px 14px 14px; position:relative; overflow:hidden;
  background:radial-gradient(120% 90% at 50% 0%, #B8323F 0%, #7E1A28 55%, #4C0C17 100%);
  box-shadow:inset 0 3px 0 rgba(255,255,255,.2), inset 0 -10px 0 rgba(0,0,0,.25), 0 8px 0 #3a0912, 0 14px 22px rgba(0,0,0,.35)}
.ta-band::before{content:''; position:absolute; inset:0; background:repeating-linear-gradient(90deg, rgba(0,0,0,.14) 0 10px, rgba(255,255,255,0) 10px 26px); pointer-events:none}
.ta-players{position:relative; display:flex; justify-content:space-around; font-size:2.6rem; line-height:1; margin-bottom:10px}
.ta-players span{display:inline-block; transform:translateY(calc(var(--pl) * -7px)) rotate(calc(var(--pl) * var(--rot, 4deg))); filter:drop-shadow(0 4px 3px rgba(0,0,0,.35))}
.ta-players span:nth-child(2){--rot:-5deg}
.ta-bulbs{position:relative; display:flex; gap:14px; justify-content:center}
.ta-bulb{width:46px; height:46px; border-radius:50%; background:radial-gradient(circle at 40% 35%, #8a7a55, #4a3d22 70%); box-shadow:inset 0 -4px 0 rgba(0,0,0,.3), 0 3px 0 rgba(0,0,0,.35); transition:background .08s, box-shadow .08s}
.ta-bulb.on{background:radial-gradient(circle at 40% 35%, #fff, #FFE68A 40%, #FFC234 75%); box-shadow:0 0 0 3px rgba(255,255,255,.6), 0 0 26px 10px rgba(255,214,90,.85)}
.ta-bulb.on.one{background:radial-gradient(circle at 40% 35%, #fff, #FFC2B0 40%, #FF6B4A 75%); box-shadow:0 0 0 3px rgba(255,255,255,.6), 0 0 26px 10px rgba(255,120,90,.85)}
.ta-pads{display:flex; gap:18px; justify-content:center; width:100%}
.ta-pad{position:relative; width:min(44vw, 170px); height:min(44vw, 170px); border-radius:28%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px;
  font:700 1.25rem var(--display); cursor:pointer; transform:scale(calc(1 + var(--pl) * .025)); touch-action:manipulation}
.ta-pad .e{font-size:4.2rem; line-height:1}
.ta-pad svg{width:76px; height:76px}
.ta-pad.hit{transform:translateY(5px) scale(.97); box-shadow:inset 0 -4px 0 rgba(0,0,0,.14), 0 1px 0 var(--d), 0 3px 6px rgba(0,0,0,.2)}
.ta-ring{position:absolute; inset:0; border-radius:28%; border:6px solid #fff; opacity:0; pointer-events:none}
.ta-ring.go{animation:ta-ring .5s ease-out}
@keyframes ta-ring{0%{opacity:.95; transform:scale(.9)} 100%{opacity:0; transform:scale(1.25)}}
.ta-foot{display:flex; gap:12px; justify-content:center}
`);
  const TAMB_SVG = `<svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="30" fill="#F7E7C4" stroke="#8A5A2B" stroke-width="9"/>
    <circle cx="40" cy="40" r="30" fill="none" stroke="#C48A4A" stroke-width="3"/>
    ${[0, 72, 144, 216, 288].map(a => { const x = 40 + 34 * Math.cos(a * Math.PI / 180), y = 40 + 34 * Math.sin(a * Math.PI / 180); return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="7" ry="5" fill="#E9C67E" stroke="#7a5a20" stroke-width="2" transform="rotate(${a + 90} ${x.toFixed(1)} ${y.toFixed(1)})"/>`; }).join('')}
    <path d="M30 34 q10 -8 20 0" stroke="#d9c39a" stroke-width="3" fill="none"/></svg>`;
  const GROOVES = [
    { id: 'swing', name: 'Swing', ic: '🎷', col: 'c-sun', bpm: 112, meter: 4, feel: 'swing', key: 0, grid: [0, .67], lo: 63, hi: 79, leads: ['alto_sax', 'clarinet'], players: ['🎹', '🎻', '🎷'],
      A: ['C:6', 'A:7', 'D:m7', 'G:7', 'E:m7', 'A:7', 'D:m7', 'G:7'], B: ['F:6', 'F:m6', 'C:6', 'A:7', 'D:7', 'D:7', 'G:7', 'G:7'], inst: ['acoustic_grand_piano', 'acoustic_bass', 'alto_sax', 'clarinet'] },
    { id: 'waltz', name: 'Waltz', ic: '💃', col: 'c-rose', bpm: 100, meter: 3, feel: 'waltz', key: 5, grid: [0, .5], lo: 62, hi: 80, leads: ['vibraphone', 'clarinet'], players: ['🎹', '🎻', '🎶'],
      A: ['F:maj7', 'F:6', 'G:m7', 'C:7', 'A:m7', 'D:7', 'G:m7', 'C:7'], B: ['Bb:maj7', 'Bb:m6', 'F:maj7', 'D:7', 'G:m7', 'C:7', 'F:6', 'C:7'], inst: ['acoustic_grand_piano', 'acoustic_bass', 'vibraphone', 'clarinet'] },
    { id: 'march', name: 'March', ic: '🎺', col: 'c-sky', bpm: 108, meter: 4, feel: 'march', key: 0, grid: [0, .5], lo: 62, hi: 77, leads: ['muted_trumpet', 'clarinet'], players: ['🎹', '🎻', '🎺'],
      A: ['C:6', 'C:6', 'G:7', 'G:7', 'G:7', 'G:7', 'C:6', 'C:6'], B: ['F:6', 'F:6', 'C:6', 'C:6', 'D:7', 'D:7', 'G:7', 'G:7'], inst: ['acoustic_grand_piano', 'acoustic_bass', 'muted_trumpet', 'clarinet', 'trombone'] }
  ];
  const PATS = {
    swing: [[[0, 1], [1, .67], [1.67, 1.33]], [[.67, .33], [1, 1], [2, 2]], [[0, .67], [.67, .33], [1, .67], [1.67, 2.33]], [[0, 1.5], [1.67, .33], [2, 2]], [[.67, 1.33], [2, .67], [2.67, 1.33]]],
    march: [[[0, 1], [1, 1], [2, 2]], [[0, .5], [.5, .5], [1, 1], [2, 2]], [[0, 1.5], [1.5, .5], [2, 2]], [[0, 1], [1, .5], [1.5, .5], [2, 2]]],
    waltz: [[[0, 2], [2, 1]], [[0, 1], [1, 1], [2, 1]], [[0, 1.5], [1.5, .5], [2, 1]], [[1, 1], [2, 1]]]
  };
  function composeLead(G, prog) {
    const pats = PATS[G.feel], scale = WHITE.map(i => (G.key + i) % 12), mid = Math.round((G.lo + G.hi) / 2);
    const motif = pick(pats), answer = pick(pats), notes = [];
    let p = mid;
    prog.forEach((cs, bi) => {
      const c = chd(cs), last = bi === prog.length - 1, second = bi % 2 === 1;
      const rhythm = last ? [[0, G.meter - .5]] : second ? (bi % 4 === 3 ? [[0, G.meter - 1]] : answer) : (bi === 4 ? pick(pats) : motif);
      rhythm.forEach(([b, d], k) => {
        const strong = k === 0 || d >= 1.5 || last;
        const target = k === 0 && !second ? mid + [0, 3, 5, -1][(bi >> 1) % 4] : p + pick([-3, -2, -1, 1, 2, 3]);
        p = nearest(last ? [c.root, (c.root + c.q[1]) % 12] : strong ? chordPcs(c) : scale, Math.round(target), G.lo, G.hi);
        notes.push({ bar: bi, b, d, m: p });
      });
    });
    return notes;
  }

  function startTapAlong(level, api) {
    const M = mixer(api, 1);
    let gi = Math.max(0, (level | 0) - 1) % GROOVES.length;
    let band = null, finished = false, taps = 0, timer = null;
    const used = new Set();
    const clock = () => M ? M.ctx.currentTime : performance.now() / 1000;
    const wrap = el('div', 'ta-wrap'); api.stage.append(wrap);
    const gRow = el('div', 'ta-grooves'); wrap.append(gRow);
    const gBtns = GROOVES.map((G, i) => {
      const b = el('button', 'btn ' + G.col, `<span aria-hidden="true">${G.ic}</span> ${G.name}`); b.type = 'button';
      b.onclick = () => { if (i === gi && band) return; sfx.tap(); gi = i; startBand(); };
      gRow.append(b); return b;
    });
    const stageEl = el('div', 'ta-band'); wrap.append(stageEl);
    const players = el('div', 'ta-players'); stageEl.append(players);
    const bulbs = el('div', 'ta-bulbs'); stageEl.append(bulbs);
    const pads = el('div', 'ta-pads'); wrap.append(pads);
    const drum = el('button', 'tile ta-pad c-coral', '<span class="e" aria-hidden="true">🥁</span><span>Drum</span><i class="ta-ring"></i>');
    const tamb = el('button', 'tile ta-pad c-sun', TAMB_SVG + '<span>Tambourine</span><i class="ta-ring"></i>');
    [drum, tamb].forEach(b => { b.type = 'button'; pads.append(b); });
    drum.setAttribute('aria-label', 'Drum'); tamb.setAttribute('aria-label', 'Tambourine');
    drum.addEventListener('pointerdown', e => { e.preventDefault(); hit('drum', drum); });
    tamb.addEventListener('pointerdown', e => { e.preventDefault(); hit('tamb', tamb); });
    [[drum, 'drum'], [tamb, 'tamb']].forEach(([b, k]) => b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hit(k, b); } }));
    const foot = el('div', 'ta-foot'); wrap.append(foot);
    const fin = el('button', 'btn c-mint', '✓ I’m finished'); fin.type = 'button'; foot.append(fin);
    fin.onclick = () => {
      if (finished) return; finished = true; fin.disabled = true; sfx.good();
      stopBand(); if (M) M.fade(.6); if (timer) clearInterval(timer); api.done(3);
    };

    function stopBand() { if (band && band.layer) { const L = band.layer; L.dead = true; try { L.g.gain.setTargetAtTime(0, M.ctx.currentTime, .15); setTimeout(() => { try { L.g.disconnect(); } catch (e) {} }, 2000); } catch (e) {} } band = null; }
    function startBand() {
      stopBand();
      const G = GROOVES[gi];
      gBtns.forEach((b, i) => b.classList.toggle('on', i === gi));
      players.innerHTML = G.players.map(p => `<span>${p}</span>`).join('');
      bulbs.innerHTML = ''; for (let i = 0; i < G.meter; i++) bulbs.append(el('div', 'ta-bulb' + (i === 0 ? ' one' : '')));
      const st = { G, ready: false, bar: 0 };
      band = st;
      api.hint('The band is tuning up…');
      loadSome(G.inst, 5000, api.later).then(() => {
        if (band !== st || finished || !api.stage.isConnected) return;
        let layer = null;
        if (M && !M.dead) {
          const g = M.ctx.createGain(); g.gain.setValueAtTime(.0001, M.ctx.currentTime); g.gain.exponentialRampToValueAtTime(1, M.ctx.currentTime + .6); g.connect(M.in);
          layer = { ctx: M.ctx, in: g, g, noise: M.noise, dead: false };
        }
        st.layer = layer; st.t0 = clock() + .3; st.t = st.t0; st.ready = true;
        st.mel = { A: composeLead(G, G.A), B: composeLead(G, G.B) };
        api.hint(taps ? 'Here’s the ' + G.name.toLowerCase() + '. Keep tapping along!' : 'Tap the drum or the tambourine along with the band. Every tap fits the music.');
      });
    }
    function scheduleBar(st, t) {
      const G = st.G, D = st.layer, spb = 60 / G.bpm;
      const secIdx = Math.floor(st.bar / 8) % 4, sec = 'AABA'[secIdx], inBar = st.bar % 8;
      const prog = G[sec], c = chd(prog[inBar]), nextC = chd(prog[(inBar + 1) % 8]);
      const root = above(c.root, 33), fifth = above(c.root + 7, 33), third = above(c.root + c.q[1], 33);
      const V = voicing(c, 53), at = (b, j = 10) => t + b * spb + (Math.random() - .5) * j / 1000;
      const P = 'acoustic_grand_piano', BASS = 'acoustic_bass';
      const vary = (v, a = .2) => v * (1 - a / 2 + Math.random() * a);
      const comp = (b, dur, vel) => V.forEach((m, i) => voice(D, P, at(b, 6) + i * .009, m, dur, vary(vel)));
      if (G.feel === 'swing') {
        const approach = above(nextC.root + pick([1, -1, 7]), 33);
        [root, pick([third, fifth]), fifth, approach].forEach((m, b) => voice(D, BASS, at(b, 8), m, spb * .92, vary(b === 0 ? .82 : .7, .15), { release: .15 }));
        pick([[[0, .8], [1.67, .5]], [[.67, .5], [2.67, .6]], [[1.67, .6], [3.67, .4]], [[0, 1.1], [2, 1]], [[1, .5], [2.67, .9]]]).forEach(([b, d]) => comp(b, spb * d * 1.3, .4));
        [0, 1, 2, 3].forEach(b => boom(D, at(b, 4), .05));
        [1, 3].forEach(b => brush(D, at(b, 4), .05, 'slap'));
        [0, 1, 1.67, 2, 3, 3.67].forEach(b => brush(D, at(b, 6), .024, 'tap'));
      } else if (G.feel === 'waltz') {
        voice(D, BASS, at(0), root, spb * 1.7, vary(.8, .15), { release: .2 });
        if (inBar % 2 === 1) voice(D, BASS, at(2), fifth, spb * .8, vary(.5, .15));
        [1, 2].forEach(b => comp(b, spb * .7, b === 1 ? .34 : .28));
        brush(D, at(0), .028, 'sweep');
        [1, 2].forEach(b => brush(D, at(b, 6), .018, 'tap'));
      } else {
        [[0, root], [2, fifth]].forEach(([b, m]) => {
          voice(D, BASS, at(b, 6), m, spb * .8, vary(.85, .1), { release: .12 });
          voice(D, 'trombone', at(b, 6), m + 12, spb * .55, vary(.42, .1), { attack: .02, release: .1 });
        });
        [1, 3].forEach(b => comp(b, spb * .38, .36));
        [0, 2].forEach(b => boom(D, at(b, 3), .12, 90, 50, .25));
        [0, 1, 2, 3, 3.5].forEach(b => noiseHit(D, at(b, 4), { type: 'bandpass', f: 2600, q: .9, v: b % 1 ? .03 : .045, dec: .09 }));
        [1, 3].forEach(b => noiseHit(D, at(b, 4), { type: 'bandpass', f: 1900, q: .6, v: .06, dec: .14 }));
      }
      /* lead: rests through the first 2 bars, then plays the tune */
      if (st.bar >= 2) {
        const leadName = G.leads[(Math.floor(st.bar / 32) + (sec === 'B' ? 1 : 0)) % G.leads.length];
        const wind = WIND[leadName];
        st.mel[sec].filter(nn => nn.bar === inBar).forEach((nn, k) => {
          voice(D, leadName, at(nn.b, 14), nn.m, nn.d * spb * (wind ? .95 : .9), vary(k === 0 ? .78 : .66), wind ? { attack: .03, release: .18, scoop: k === 0 && Math.random() < .4 ? 40 : 0 } : { release: .5 });
        });
      }
      if (st.bar > 0 && st.bar % 64 === 0) st.mel = { A: composeLead(G, G.A), B: composeLead(G, G.B) };
    }
    function tick() {
      if (!api.stage.isConnected || finished) { clearInterval(timer); timer = null; return; }
      const st = band; if (!st || !st.ready || !st.layer) return;
      const barDur = 60 / st.G.bpm * st.G.meter;
      if (st.t < clock() - 1) { const skip = Math.ceil((clock() - st.t) / barDur); st.t += skip * barDur; st.bar += skip; }   /* came back from a hidden tab */
      while (st.t < clock() + .35) { scheduleBar(st, st.t); st.t += barDur; st.bar++; }
    }
    timer = setInterval(tick, 60);

    /* lights */
    let lastIdx = -1;
    (function frame() {
      if (!wrap.isConnected) return;
      const st = band;
      if (st && st.ready) {
        const spb = 60 / st.G.bpm, beat = (clock() - st.t0) / spb;
        if (beat >= 0) {
          const idx = Math.floor(beat) % st.G.meter, fr = beat - Math.floor(beat);
          wrap.style.setProperty('--pl', Math.max(0, 1 - fr * 2.2).toFixed(3));
          if (idx !== lastIdx) { lastIdx = idx; [...bulbs.children].forEach((b, i) => b.classList.toggle('on', i === idx)); }
        }
      } else if (lastIdx !== -1) { lastIdx = -1; [...bulbs.children].forEach(b => b.classList.remove('on')); wrap.style.setProperty('--pl', 0); }
      requestAnimationFrame(frame);
    })();

    function playHit(kind, t, accent) {
      if (!M || M.dead) { if (kind === 'drum') tone(accent ? 90 : 120, .25, 'sine', .3); else tone(2400, .08, 'square', .03); return; }
      const D = M;
      if (kind === 'drum') {
        boom(D, t, accent ? .9 : .6, accent ? 120 : 160, accent ? 50 : 70, accent ? .45 : .3);
        noiseHit(D, t, { type: 'lowpass', f: 900, v: accent ? .25 : .16, dec: .08 });
      } else {
        const v = accent ? .3 : .22;
        [0, .014, .03].forEach((o, i) => noiseHit(D, t + o, { f: 6500, v: v * [1, .7, .45][i], dec: .1 }));
        noiseHit(D, t, { type: 'bandpass', f: 9200, q: 5, v: v * .9, dec: .28 });
        noiseHit(D, t + .012, { type: 'bandpass', f: 7300, q: 6, v: v * .6, dec: .22 });
      }
    }
    function hit(kind, btn) {
      if (finished) return;
      const now = clock();
      let t = now + .005, accent = false;
      const st = band;
      if (st && st.ready && now >= st.t0 - .05) {
        const spb = 60 / st.G.bpm, beat = (now - st.t0) / spb, g = st.G.grid;
        const bi = Math.floor(beat), pts = [];
        for (let k = -1; k <= 2; k++) g.forEach(x => pts.push(bi + k + x));
        pts.sort((a, b) => a - b);
        const prev = pts.filter(p => p <= beat + 1e-6).pop(), next = pts.filter(p => p > beat + 1e-6);
        let pos;
        if (prev != null && (beat - prev) * spb < .07) { pos = prev; t = now + .003; }
        else { pos = next[0]; t = st.t0 + pos * spb; }
        let key = kind + ':' + Math.round(pos * 100);
        if (used.has(key)) {
          pos = next.find(p => p > pos && !used.has(kind + ':' + Math.round(p * 100)));
          if (pos == null) pos = null; else { key = kind + ':' + Math.round(pos * 100); t = st.t0 + pos * spb; }
        }
        if (pos == null) t = null;
        else {
          used.add(key); if (used.size > 300) used.clear();
          accent = Math.abs(pos - Math.round(pos)) < .01 && ((Math.round(pos) % st.G.meter) === 0 || (st.G.feel === 'march' && Math.round(pos) % 2 === 0));
        }
      }
      btn.classList.add('hit'); api.later(() => btn.classList.remove('hit'), 120);
      if (t == null) return;
      playHit(kind, t, accent);
      const ring = btn.querySelector('.ta-ring');
      api.later(() => { ring.classList.remove('go'); void ring.offsetWidth; ring.classList.add('go'); }, Math.max(0, (t - now) * 1000));
      taps++;
      if (taps === 12) api.hint('Lovely! You’re keeping time beautifully.');
      else if (taps % 40 === 0) api.hint(pick(['What a band! Try the other button too.', 'Toe-tapping stuff! Try a different tune at the top.', 'Splendid rhythm. Keep going as long as you like.']));
    }
    startBand();
  }
  register({ id: 'tapalong', cat: 'relax', order: 11, name: 'Tap Along', icon: '🥁', desc: 'Play the drum along with a swing band', gentle: true, start: startTapAlong });

  /* =========================================================
     3. STAINED GLASS
     ========================================================= */
  R.css(`
.sg-wrap{display:flex; flex-wrap:wrap; gap:14px 20px; justify-content:center; align-items:flex-start; max-width:820px; margin:0 auto}
.sg-pick{display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:14px; max-width:520px; width:100%; margin:6px auto 0}
.sg-pick .btn{flex-direction:column; padding:.55em .3em .6em; gap:6px; font-size:1.05rem; min-height:0}
.sg-pick .btn svg{width:100%; max-width:110px; aspect-ratio:1; border-radius:12px; background:#2a211b}
.sg-win{position:relative; width:min(100%, 340px); aspect-ratio:1; border-radius:22px; padding:10px;
  background:linear-gradient(160deg, #9A8B78, #6E604F 60%, #574a3c); box-shadow:inset 0 3px 0 rgba(255,255,255,.3), inset 0 -6px 0 rgba(0,0,0,.25), 0 8px 0 #3f352a, 0 16px 26px rgba(0,0,0,.4);
  transition:box-shadow .8s}
.sg-win svg{display:block; width:100%; height:100%; touch-action:manipulation; transition:filter .8s}
.sg-win svg [data-i]{cursor:pointer}
.sg-win.lit{box-shadow:inset 0 3px 0 rgba(255,255,255,.3), inset 0 -6px 0 rgba(0,0,0,.25), 0 8px 0 #3f352a, 0 0 60px 18px var(--glow, rgba(255,220,140,.7))}
.sg-win.lit svg{filter:brightness(1.22) saturate(1.3)}
.sg-side{display:flex; flex-direction:column; gap:14px; align-items:center; width:min(100%, 340px)}
.sg-pal{display:flex; flex-wrap:wrap; gap:9px; justify-content:center}
.sg-sw{width:56px; height:56px; border-radius:50%; border:0; cursor:pointer; position:relative;
  background:radial-gradient(circle at 38% 32%, rgba(255,255,255,.85), rgba(255,255,255,0) 42%), var(--g);
  box-shadow:inset 0 -5px 0 rgba(0,0,0,.2), 0 4px 0 rgba(0,0,0,.35), 0 0 14px 2px color-mix(in srgb, var(--g) 60%, transparent)}
.sg-sw.on{transform:translateY(-4px) scale(1.08); box-shadow:inset 0 -5px 0 rgba(0,0,0,.2), 0 0 0 4px #fff, 0 6px 0 rgba(0,0,0,.35), 0 0 22px 6px var(--g)}
.sg-sw.on::after{content:'✓'; position:absolute; inset:0; display:grid; place-items:center; font:700 1.5rem var(--display); color:#fff; text-shadow:0 1px 3px rgba(0,0,0,.7)}
.sg-btns{display:flex; flex-wrap:wrap; gap:10px; justify-content:center}
.sg-btns .btn{font-size:1.05rem; padding:.6em .8em; min-width:60px}
.sg-spark{position:absolute; pointer-events:none; color:#fff; font-size:22px; text-shadow:0 0 8px #fff, 0 0 16px #FFE68A; animation:sg-spark 1.2s ease-out forwards}
@keyframes sg-spark{0%{opacity:0; transform:scale(.3)} 30%{opacity:1; transform:scale(1.2)} 100%{opacity:0; transform:scale(.6) translateY(-12px)}}
.sg-pane-pop{animation:sg-pop .35s ease-out}
@keyframes sg-pop{0%{opacity:.4} 100%{opacity:1}}
`);
  const GLASS = [
    { n: 'Ruby red', c: '#E0324B' }, { n: 'Orange', c: '#FF8A2A' }, { n: 'Golden amber', c: '#FFC93C' }, { n: 'Spring green', c: '#9BD63A' },
    { n: 'Emerald', c: '#1FA86A' }, { n: 'Sky blue', c: '#4AA8FF' }, { n: 'Cobalt blue', c: '#2F5BD8' },
    { n: 'Violet', c: '#8E5BE8' }, { n: 'Rose pink', c: '#FF7EB3' }, { n: 'Clear glass', c: '#F4EFDF' }
  ];
  const BLANK = '#E9E3D2';
  const f1 = x => +x.toFixed(1);
  const pt = (cx, cy, r, a) => [f1(cx + r * Math.cos(a * Math.PI / 180)), f1(cy + r * Math.sin(a * Math.PI / 180))];
  const poly = pts => ({ t: 'polygon', a: { points: pts.map(p => p.join(',')).join(' ') } });
  const circ = (cx, cy, r) => ({ t: 'circle', a: { cx, cy, r } });
  const path = d => ({ t: 'path', a: { d } });
  function sector(cx, cy, r1, r2, a1, a2) {
    const [x1, y1] = pt(cx, cy, r2, a1), [x2, y2] = pt(cx, cy, r2, a2), [x3, y3] = pt(cx, cy, r1, a2), [x4, y4] = pt(cx, cy, r1, a1);
    return path(`M${x1} ${y1}A${r2} ${r2} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 0 0 ${x4} ${y4}Z`);
  }
  const wedge = (cx, cy, a1, a2, R = 460) => poly([[cx, cy], pt(cx, cy, R, a1), pt(cx, cy, R, a2)]);
  function wave(y0, y1, amp, phase = 0) {
    /* a band between two wavy lines across the full width */
    const top = [], bot = [];
    for (let x = 0; x <= 300; x += 75) { top.push([x, y0]); bot.push([x, y1]); }
    let d = `M0 ${y0}`;
    for (let i = 0; i < 4; i++) d += `Q${i * 75 + 37.5} ${y0 + ((i + phase) % 2 ? amp : -amp)} ${(i + 1) * 75} ${y0}`;
    d += `L300 ${y1}`;
    for (let i = 3; i >= 0; i--) d += `Q${i * 75 + 37.5} ${y1 + ((i + phase + 1) % 2 ? amp : -amp)} ${i * 75} ${y1}`;
    return path(d + 'Z');
  }
  const ARCH = 'M0 300V120A150 120 0 0 1 300 120V300Z';
  const DESIGNS = [
    { id: 'rose', name: 'Rose window', clip: null, build() {
      const r = [];
      [[0, 0], [150, 0], [0, 150], [150, 150]].forEach(([x, y]) => r.push(poly([[x, y], [x + 150, y], [x + 150, y + 150], [x, y + 150]])));
      for (let i = 0; i < 16; i++) r.push(sector(150, 150, 95, 142, i * 22.5 - 90, (i + 1) * 22.5 - 90));
      for (let i = 0; i < 8; i++) r.push(sector(150, 150, 48, 95, i * 45 - 90 + 22.5, (i + 1) * 45 - 90 + 22.5));
      for (let i = 0; i < 8; i++) { const [x, y] = pt(150, 150, 118, i * 45 - 90); r.push(circ(x, y, 15)); }
      r.push(circ(150, 150, 48)); r.push(circ(150, 150, 22));
      return { r };
    } },
    { id: 'tulips', name: 'Tulips', clip: ARCH, build() {
      const r = [];
      for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) r.push(poly([[x * 100, y * 100], [x * 100 + 100, y * 100], [x * 100 + 100, y * 100 + 100], [x * 100, y * 100 + 100]]));
      [[70, 150], [150, 118], [230, 150]].forEach(([x, y], k) => {
        r.push(poly([[x - 6, y + 22], [x + 6, y + 22], [x + 6, 262], [x - 6, 262]]));
        const s = k === 1 ? 1 : -1;
        r.push(path(`M${x - 4} 248Q${x - 46} 222 ${x - 40} ${y + 48}Q${x - 14} ${y + 78} ${x - 4} 222Z`));
        r.push(path(`M${x + 4} 252Q${x + 44} 238 ${x + 40} ${y + 70 + s * 6}Q${x + 14} ${y + 92} ${x + 4} 232Z`));
        r.push(poly([[x - 13, y + 22], [x - 16, y - 8], [x, y - 34], [x + 16, y - 8], [x + 13, y + 22]]));
        r.push(path(`M${x} ${y + 28}C${x - 26} ${y + 27} ${x - 32} ${y - 2} ${x - 25} ${y - 30}L${x - 8} ${y - 10}L${x} ${y - 2}Z`));
        r.push(path(`M${x} ${y + 28}C${x + 26} ${y + 27} ${x + 32} ${y - 2} ${x + 25} ${y - 30}L${x + 8} ${y - 10}L${x} ${y - 2}Z`));
      });
      r.push(wave(255, 300, 9));
      return { r };
    } },
    { id: 'sunrise', name: 'Sunrise', clip: ARCH, build() {
      const r = [];
      for (let i = 0; i < 10; i++) r.push(wedge(150, 200, 180 + i * 18, 180 + (i + 1) * 18));
      r.push(circ(150, 200, 72)); r.push(circ(150, 200, 46));
      r.push(wave(196, 228, 6)); r.push(wave(228, 262, 6, 1)); r.push(wave(262, 310, 6));
      r.push(poly([[118, 208], [182, 208], [174, 218], [126, 218]]));
      r.push(poly([[128, 238], [172, 238], [166, 248], [134, 248]]));
      r.push(poly([[138, 272], [162, 272], [158, 282], [142, 282]]));
      return { r, extra: '<path d="M60 70q10-9 20 0q10-9 20 0M200 52q8-7 16 0q8-7 16 0" fill="none"/>' };
    } },
    { id: 'dove', name: 'Dove of peace', clip: null, build() {
      const r = [];
      for (let i = 0; i < 12; i++) r.push(wedge(150, 150, i * 30 - 90, (i + 1) * 30 - 90));
      r.push({ t: 'path', a: { d: 'M150 10A140 140 0 1 1 149.9 10ZM150 26A124 124 0 1 0 150.1 26Z', 'fill-rule': 'evenodd' } });
      r.push(path('M128 158C146 196 168 222 206 232C200 202 190 180 178 160Z'));
      r.push(poly([[200, 140], [266, 118], [270, 150], [262, 178], [206, 168]]));
      r.push(path('M96 112C136 100 186 120 216 148C192 176 140 182 106 158C92 146 88 124 96 112Z'));
      r.push(circ(92, 116, 21));
      r.push(poly([[73, 112], [52, 122], [74, 126]]));
      r.push(path('M118 124C128 84 156 56 192 42L176 132Z'));
      r.push(path('M168 134L192 42C210 34 226 30 246 28C232 66 218 106 196 146Z'));
      r.push(path('M44 128q-18 2-24 16q18 0 24-16Z'));
      r.push(path('M36 146q-20 6-22 22q18-4 22-22Z'));
      r.push(path('M50 140q4 18 20 22q-2-18-20-22Z'));
      return { r, extra: '<circle cx="88" cy="110" r="3.5" fill="#1d1813"/><path d="M58 124Q46 140 30 160" fill="none"/>' };
    } },
    { id: 'lighthouse', name: 'Lighthouse', clip: ARCH, build() {
      const r = [];
      [[0, 0, 100, 120], [100, 0, 200, 120], [200, 0, 300, 120], [0, 120, 100, 230], [100, 120, 200, 230], [200, 120, 300, 230]].forEach(([a, b, c, d]) => r.push(poly([[a, b], [c, b], [c, d], [a, d]])));
      r.push(circ(240, 70, 22));
      r.push(poly([[150, 86], [0, 40], [0, 130]]));
      r.push(poly([[150, 86], [300, 46], [300, 136]]));
      r.push(wave(214, 244, 6)); r.push(wave(244, 274, 6, 1)); r.push(wave(274, 310, 6));
      r.push(poly([[70, 300], [96, 240], [150, 226], [208, 238], [236, 300]]));
      r.push(poly([[26, 300], [44, 266], [76, 300]]));
      const xAt = (y, side) => { const k = (y - 110) / 125; return f1(150 + side * (22 + k * 13)); };
      [110, 141, 172, 203].forEach(y => { const y2 = y + 31; r.push(poly([[xAt(y, -1), y], [xAt(y, 1), y], [xAt(y2, 1), y2], [xAt(y2, -1), y2]])); });
      r.push(path('M141 234V214A9 9 0 0 1 159 214V234Z'));
      r.push(poly([[118, 100], [182, 100], [182, 112], [118, 112]]));
      r.push(poly([[132, 70], [168, 70], [168, 100], [132, 100]]));
      r.push(poly([[124, 72], [150, 46], [176, 72]]));
      return { r };
    } },
    { id: 'geometric', name: 'Diamonds', clip: null, build() {
      const r = [];
      for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
        const X = x * 100, Y = y * 100, c = [X + 50, Y + 50];
        r.push(poly([[X, Y], [X + 100, Y], c])); r.push(poly([[X + 100, Y], [X + 100, Y + 100], c]));
        r.push(poly([[X + 100, Y + 100], [X, Y + 100], c])); r.push(poly([[X, Y + 100], [X, Y], c]));
      }
      [[100, 100], [200, 100], [100, 200], [200, 200]].forEach(([x, y]) => r.push(poly([[x, y - 26], [x + 26, y], [x, y + 26], [x - 26, y]])));
      r.push(circ(150, 150, 30));
      return { r };
    } }
  ];
  DESIGNS.forEach(d => { d.data = d.build(); });
  R._musicDesigns = DESIGNS;
  const attrs = a => Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(' ');
  let sgUid = 0;
  /* fills: array of colours or null. thumb: simple drawing without effects */
  function glassSVG(D, fills, thumb) {
    const u = 'sg' + (++sgUid);
    const clip = D.clip ? `clip-path="url(#${u}c)"` : '';
    const lw = thumb ? 5 : 4.5;
    let s = `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="${thumb ? 'true' : 'false'}"><defs>`;
    if (D.clip) s += `<clipPath id="${u}c"><path d="${D.clip}"/></clipPath>`;
    s += `<radialGradient id="${u}s" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".5" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></radialGradient>`;
    s += `<filter id="${u}t" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".035 .09" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0"/></filter>`;
    s += `<linearGradient id="${u}b" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#FFF6D8" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`;
    s += `</defs><rect width="300" height="300" fill="#2a211b"/><g ${clip}>`;
    D.data.r.forEach((sh, i) => {
      const a = attrs(sh.a);
      s += `<g><${sh.t} ${a} data-i="${i}" fill="${fills[i] || BLANK}"/>`;
      if (!thumb) s += `<${sh.t} ${a} fill="url(#${u}s)" pointer-events="none"/>`;
      s += `<${sh.t} ${a} fill="none" stroke="#1d1813" stroke-width="${lw}" stroke-linejoin="round" pointer-events="none"/></g>`;
    });
    if (D.data.extra) s += `<g stroke="#1d1813" stroke-width="${lw}" stroke-linecap="round" stroke-linejoin="round" pointer-events="none">${D.data.extra}</g>`;
    if (!thumb) {
      s += `<rect width="300" height="300" filter="url(#${u}t)" opacity=".16" style="mix-blend-mode:soft-light" pointer-events="none"/>`;
      s += `<polygon class="sg-beam" points="-60,-20 40,-20 -40,320 -140,320" fill="url(#${u}b)" style="mix-blend-mode:screen" opacity="0" pointer-events="none"/>`;
    }
    s += `</g>`;
    if (D.clip) s += `<path d="${D.clip}" fill="none" stroke="#1d1813" stroke-width="${thumb ? 10 : 9}" pointer-events="none"/>`;
    else s += `<rect x="2" y="2" width="296" height="296" fill="none" stroke="#1d1813" stroke-width="${thumb ? 10 : 7}" pointer-events="none"/>`;
    return s + '</svg>';
  }

  function startStained(level, api) {
    const L = Math.max(1, level | 0);
    const wrap = el('div', 'sg-wrap'); api.stage.append(wrap);
    api.hint('Choose a window to colour in.');
    const pk = el('div', 'sg-pick'); wrap.append(pk);
    const first = (L - 1) % DESIGNS.length;
    const order = DESIGNS.slice(first).concat(DESIGNS.slice(0, first));
    order.forEach((D, k) => {
      const demo = D.data.r.map((_, i) => GLASS[(i * 7 + k * 3 + D.id.length) % 9].c);
      const b = el('button', 'btn c-card', glassSVG(D, demo, true) + `<span>${D.name}</span>`); b.type = 'button';
      b.onclick = () => { sfx.tap(); colour(D); };
      pk.append(b);
    });

    function colour(D) {
      wrap.innerHTML = '';
      const fills = D.data.r.map(() => null), hist = [];
      let cur = 0, lit = false, finished = false, toldAll = false;
      const win = el('div', 'sg-win', glassSVG(D, fills, false)); wrap.append(win);
      const side = el('div', 'sg-side'); wrap.append(side);
      const pal = el('div', 'sg-pal'); side.append(pal);
      const sws = GLASS.map((g, i) => {
        const b = el('button', 'sg-sw' + (i === cur ? ' on' : '')); b.type = 'button';
        b.style.setProperty('--g', g.c); b.setAttribute('aria-label', g.n); b.title = g.n;
        b.onclick = () => { cur = i; sws.forEach((x, j) => x.classList.toggle('on', j === i)); tone(392 * Math.pow(2, [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24][i] / 12), .25, 'sine', .08); api.hint(g.n + ' chosen. Now tap a pane of glass.'); };
        pal.append(b); return b;
      });
      const btns = el('div', 'sg-btns'); side.append(btns);
      const mk = (h, c, fn) => { const b = el('button', 'btn ' + c, h); b.type = 'button'; b.onclick = fn; btns.append(b); return b; };
      const undoB = mk('<span aria-hidden="true">↶</span>', 'c-card', () => {
        const h = hist.pop(); if (!h) { sfx.soft(); return; }
        sfx.tap(); fills[h.i] = h.was; paint(h.i);
      });
      undoB.setAttribute('aria-label', 'Undo'); undoB.style.fontSize = '1.6rem';
      mk('☀ Light it up', 'c-sun', () => lightUp());
      mk('✓ Finished', 'c-mint', () => {
        if (finished) return; finished = true; sfx.good(); lightUp(true); api.later(() => api.done(3), 1600);
      });
      const svg = win.querySelector('svg');
      const paneEls = [...svg.querySelectorAll('[data-i]')];
      function paint(i) { const p = paneEls[i]; p.setAttribute('fill', fills[i] || BLANK); p.classList.remove('sg-pane-pop'); void p.getBoundingClientRect(); p.classList.add('sg-pane-pop'); }
      svg.addEventListener('click', e => {
        const t = e.target.closest && e.target.closest('[data-i]'); if (!t || finished) return;
        const i = +t.dataset.i, c = GLASS[cur].c;
        if (fills[i] === c) { wob(win); return; }
        hist.push({ i, was: fills[i] }); fills[i] = c; paint(i);
        tone(523 * Math.pow(2, [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24][cur] / 12), .35, 'sine', .07);
        tone(1046 * Math.pow(2, [0, 2, 4, 7, 9][i % 5] / 12), .5, 'sine', .025, .05);
        if (!toldAll && fills.every(Boolean)) {
          toldAll = true; toast(cheer());
          api.hint('Every pane is coloured! Tap “Light it up” to see the sun shine through, then “Finished”.');
          api.later(() => lightUp(), 500);
        } else if (hist.length === 1) api.hint('Lovely. Pick any colour and keep tapping panes. Tap “Light it up” any time.');
      });
      function lightUp(final) {
        if (lit) return; lit = true;
        /* glow in the most used colour */
        const cnt = {}; fills.forEach(c => { if (c) cnt[c] = (cnt[c] || 0) + 1; });
        const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
        win.style.setProperty('--glow', top ? top[0] + 'cc' : 'rgba(255,220,140,.7)');
        win.classList.add('lit');
        [0, 4, 7, 12, 16, 19, 24].forEach((s, k) => tone(523 * Math.pow(2, s / 12), .6, 'sine', .06, k * .12));
        if (!final) api.hint('Ahh, the sunshine is coming through. Lovely.');
        const beam = svg.querySelector('.sg-beam'), t0 = performance.now(), dur = 2600;
        for (let k = 0; k < 7; k++) api.later(() => {
          if (!win.isConnected) return;
          const s = el('span', 'sg-spark', '✦'); s.style.left = (10 + Math.random() * 80) + '%'; s.style.top = (10 + Math.random() * 80) + '%';
          win.append(s); api.later(() => s.remove(), 1300);
        }, 250 + k * 280);
        (function f(now) {
          if (!svg.isConnected) return;
          const p = Math.min(1, (now - t0) / dur);
          beam.setAttribute('transform', `translate(${(-40 + p * 480).toFixed(1)} 0)`);
          beam.setAttribute('opacity', (Math.sin(p * Math.PI) * .95).toFixed(3));
          if (p < 1) requestAnimationFrame(f);
        })(t0);
        api.later(() => { if (!final) { win.classList.remove('lit'); lit = false; } }, dur + 900);
      }
      api.hint('Pick a colour, then tap a pane of glass to colour it in.');
    }
  }
  register({ id: 'stainedglass', cat: 'relax', order: 12, name: 'Stained Glass', icon: '🪟', desc: 'Colour a glowing stained glass window', gentle: true, start: startStained });
})();
