/* Recall: Sing the Words (gentle karaoke) and Carousel Ride (seaside fair).
   Sing the Words: real instrument recordings from samples/*.json (piano, bass, a lead and soft brushes)
   play public-domain songs (all published before 1929) while the words light up in time.
   Carousel Ride: a canvas merry-go-round at dusk with a synthesised band-organ waltz (original tune). */
(function () {
  const { register, el, pick, tone, sfx, toast, cheer } = R;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;

  /* =========================================================
     Small sampler + mixer (decoded buffers kept for the visit)
     ========================================================= */
  const SM = { bufs: {}, loading: {} };
  const MIX = { acoustic_grand_piano: .6, acoustic_bass: 1.1, alto_sax: .44, tenor_sax: .46, clarinet: .48, muted_trumpet: .32, trombone: .34, vibraphone: .5, string_ensemble_1: .34, acoustic_guitar_nylon: .42 };
  const WIND = { alto_sax: 1, tenor_sax: 1, clarinet: 1, muted_trumpet: 1, trombone: 1, string_ensemble_1: 1 };
  function AC() { try { return R.audio ? R.audio() : null; } catch (e) { return null; } }
  function loadInst(name) {
    if (SM.loading[name]) return SM.loading[name];
    const a = AC();
    if (!a || !window.fetch || location.protocol === 'file:') return Promise.resolve(false);
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
  function loadSome(names, ms, later) {
    return new Promise(res => {
      let done = false; const go = () => { if (!done) { done = true; res(); } };
      Promise.all(names.map(loadInst)).then(go, go); later(go, ms);
    });
  }
  /* a per-game mixer into the core bus, with a little room and a watchdog that fades it when the game is left */
  function mixer(api, vol, wetAmt = .16) {
    const a = AC(); if (!a) return null;
    const ctx = a.ctx;
    try {
      const out = ctx.createGain(); out.gain.value = vol; out.connect(a.bus);
      const dry = ctx.createGain(); dry.connect(out);
      const len = Math.floor(ctx.sampleRate * 1.3), ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
      const rev = ctx.createConvolver(); rev.buffer = ir; const wet = ctx.createGain(); wet.gain.value = wetAmt;
      dry.connect(rev); rev.connect(wet); wet.connect(out);
      const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      const M = { ctx, in: dry, out, noise, dead: false };
      M.fade = (s = .25) => {
        if (M.dead) return; M.dead = true;
        try { out.gain.cancelScheduledValues(ctx.currentTime); out.gain.setTargetAtTime(0, ctx.currentTime, s / 3); } catch (e) {}
        setTimeout(() => { try { out.disconnect(); } catch (e) {} }, s * 1000 + 1500);
      };
      /* a layer: its own gain, so a song can be stopped or paused without touching the mixer */
      M.layer = () => {
        const g = ctx.createGain(); g.gain.setValueAtTime(.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(1, ctx.currentTime + .25); g.connect(dry);
        const L = { ctx, in: g, noise, dead: false };
        L.kill = (s = .12) => { if (L.dead) return; L.dead = true; try { g.gain.cancelScheduledValues(ctx.currentTime); g.gain.setTargetAtTime(0, ctx.currentTime, s / 3); setTimeout(() => { try { g.disconnect(); } catch (e) {} }, s * 1000 + 1200); } catch (e) {} };
        return L;
      };
      const iv = setInterval(() => { if (!api.stage.isConnected) { clearInterval(iv); M.fade(.15); } }, 200);
      return M;
    } catch (e) { return null; }
  }
  function voice(D, name, t, m, dur, vel, o = {}) {
    if (!D || D.dead) return;
    const ctx = D.ctx, set = SM.bufs[name];
    try {
      if (set) {
        let best = set[0]; for (const s of set) if (Math.abs(s[0] - m) < Math.abs(best[0] - m)) best = s;
        const src = ctx.createBufferSource(); src.buffer = best[1]; src.playbackRate.value = Math.pow(2, (m - best[0]) / 12);
        if (o.scoop) { src.detune.setValueAtTime(-o.scoop, t); src.detune.linearRampToValueAtTime(0, t + .09); }
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400 + vel * vel * 9000; lp.Q.value = .3;
        const g = ctx.createGain(), peak = vel * (MIX[name] || .35), a = o.attack || .005, rel = o.release || .2;
        const hold = Math.max(a, Math.min(dur, best[1].duration / src.playbackRate.value - rel));
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a);
        g.gain.setValueAtTime(peak, t + hold); g.gain.linearRampToValueAtTime(0, t + hold + rel);
        src.connect(lp); lp.connect(g); g.connect(D.in); src.start(t); src.stop(t + hold + rel + .05);
      } else {
        /* stand-in synth voice if the recordings could not load */
        const bass = name === 'acoustic_bass', wind = WIND[name];
        const g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
        lp.frequency.value = bass ? 500 : wind ? 1500 : 2600; lp.connect(g); g.connect(D.in);
        const pk = vel * (bass ? .22 : wind ? .08 : .1);
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
  const PCN = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const QUAL = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9], dim7: [0, 3, 6, 9], dim: [0, 3, 6, 9] };
  const above = (pc, lo) => lo + ((pc - lo) % 12 + 12) % 12;
  const voicing = (root, q, lo) => [...new Set(q.map(i => above(root + i, lo)))].sort((a, b) => a - b);
  /* ABC-style pitch: C = middle C (60), c = 72, ' up an octave, , down; ^ sharp, _ flat, = natural */
  function pitch(s) {
    const m = s.match(/^([_^=]?)([A-Ga-g])([',]*)$/);
    if (!m) throw new Error('bad pitch ' + s);
    const L = m[2], up = L === L.toLowerCase();
    let n = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[L.toUpperCase()] + (up ? 72 : 60);
    for (const ch of m[3]) n += ch === "'" ? 12 : -12;
    return n + (m[1] === '^' ? 1 : m[1] === '_' ? -1 : 0);
  }

  /* =========================================================
     1. SING THE WORDS
     ========================================================= */
  /* Song lines: tokens are  [Chord]syllable:pitch/beats.  A syllable ending in "-" joins the next one
     into a word ("=" joins and keeps a hyphen). "~" holds the same syllable over another note; "r/beats" is a rest.
     All songs are in the public domain (published before 1929). Melodies are written in C and moved by tr. */
  function relyric(lines, text) {
    const w = text.trim().split(/\s+/); let i = 0;
    const out = lines.map(ln => ln.trim().split(/\s+/).map(tok => {
      const m = tok.match(/^(\[[^\]]*\])?([^:]*):(.*)$/);
      if (!m || m[2] === '~') return tok;
      return (m[1] || '') + w[i++] + ':' + m[3];
    }).join(' '));
    if (i !== w.length) out.bad = true;
    return out;
  }
  /* a verse that is followed by another needs a rest so the next pickup lands in time */
  const more = (lines, add) => lines.slice(0, -1).concat(lines[lines.length - 1] + ' ' + add);
  const MOUNTAIN = [
    "She'll:G be:A [C]com-:c ing:c round:c the:c moun-:A tain:G when:E she:G comes,:c/5 r",
    "she'll:c be:d com-:e ing:e round:e the:e moun-:g tain:e when:d she:c [G7]comes,:d/5 r",
    "she'll:g be:f [C]com-:e ing:e round:e the:e moun-:d tain,:c",
    "she'll:c be:c [F]com-:A ing:A round:A the:A [D7]moun-:d tain,:c",
    "she'll:B be:A [C]com-:G ing:G round:c the:d [D7]moun-:e tain:d [G7]when:A she:B [C]comes.:c/4"
  ];
  const SAINTS = [
    "Oh,:c when:e the:f [C]saints:g/4 r go:c march-:e ing:f in,:g/4",
    "r Oh,:c when:e the:f saints:g/2 go:e/2 march-:c/2 ing:e/2 [G7]in,:d/4",
    "r I:e want:e to:d [C]be:c/4 [C7]in:e/2 that:g/2 [F]num-:g ber,:f/3",
    "r/2 when:e the:f [C]saints:g/2 go:e/2 [G7]march-:c/2 ing:d/2 [C]in.:c/4"
  ];
  const GRACE = [
    "A-:G [C]maz-:c/2 ing:e/.5 ~:c/.5 [C7]grace,:e/2 how:d [F]sweet:c/2 the:A [C]sound:G/2",
    "that:G saved:c/2 a:e/.5 ~:c/.5 wretch:e/2 like:d/.5 ~:e/.5 [G]me!:g/3 [G7]~:g/2",
    "I:e/.5 ~:g/.5 [C]once:g/2 was:e/.5 ~:c/.5 lost,:e/2 but:e/.5 ~:d/.5 [F]now:c/2 am:A [C]found,:G/2",
    "was:G blind,:c/2 but:e/.5 ~:c/.5 [G7]now:e/2 I:d [C]see.:c/3"
  ];
  const SWING_CHORUS = [
    "[C]Swing:e low,:c/2 sweet:e [F]char-:c/2 i-:c/.5 ot,:A/.5 ~:G",
    "[C]Com-:c/.5 in':c/.5 for:c/.5 to:c/.5 car-:e/.5 ry:e/.5 me:g [G7]home.:g/4",
    "[C]Swing:a/.5 ~:g/.5 low,:e/2 sweet:g [F]char-:c/2 i-:c/.5 ot,:A/.5 ~:G",
    "[C]Com-:c/.5 in':c/.5 for:c/.5 to:c/.5 car-:e/.5 ry:e/.5 [G7]me:d [C]home.:c/3"
  ];
  const JINGLE = [
    "[C]Jin-:e gle:e bells,:e/2 jin-:e gle:e bells,:e/2",
    "jin-:e gle:g all:c/1.5 the:d/.5 way!:e/4",
    "[F]Oh,:f what:f fun:f/1.5 it:f/.5 [C]is:f to:e ride:e in:e/.5 a:e/.5",
    "[D7]one=:e horse:d o-:d pen:e [G7]sleigh,:d/2 hey!:g/2"
  ];
  const TWINKLE = [
    "[C]Twin-:c kle,:c twin-:g kle,:g [F]lit-:a tle:a [C]star,:g/2",
    "[F]How:f I:f [C]won-:e der:e [G7]what:d you:d [C]are!:c/2",
    "[C]Up:g a-:g [F]bove:f the:f [C]world:e so:e [G7]high,:d/2",
    "[C]Like:g a:g [F]dia-:f mond:f [C]in:e the:e [G7]sky.:d/2"
  ];
  const SONGS = [
    { id: 'daisy', name: 'Daisy Bell', ic: '🚲', year: 1892, meter: 3, up: 0, bpm: 120, tr: 0, lead: 'clarinet', lines: [
      "[C]Dai-:g/3 sy,:e/3 Dai-:c/3 sy,:G/3 [F]give:A me:B your:c an-:A/2 swer,:c [C]do!:G/3 ~:G/2 r",
      "[G7]I'm:d/3 half:g/3 [C]cra-:e/3 zy,:c/3 [Dm]all:A for:B the:c love:d/2 of:e [G]you.:d/3 ~:d r",
      "It:e [G7]won't:f be:e a:d sty-:g/2 lish:e [C]mar-:d riage,:c/2 ~:c/2 I:d [Am]can't:e/2 af-:c [F]ford:A/2 a:c [C]car-:A riage,:G/2 ~:G r",
      "But:G [C]you'll:c/2 look:e [G7]sweet:d/2 r [C]up-:c/2 on:e [G7]the:d seat:e of:f/.5 a:f/.5 [C]bi-:g cy-:e cle:c [G7]built:d/2 for:G [C]two.:c/3"
    ] },
    { id: 'ballgame', name: 'Take Me Out to the Ball Game', ic: '⚾', year: 1908, meter: 3, up: 0, bpm: 132, tr: -7, lead: 'alto_sax', lines: [
      "[C]Take:c/2 me:c' out:a to:g the:e [G7]ball:g/3 game,:d/3",
      "[C]Take:c/2 me:c' out:a to:g the:e [G7]crowd.:g/3 [C]~:g/2 r",
      "[A7]Buy:a me:^g some:a pea-:e nuts:f and:g [Dm]Crack-:a/2 er:f Jack,:d/3",
      "[D7]I:a/2 don't:a care:a if:b I:c' [G7]nev-:d' er:b get:a back.:g",
      "Let:e me:d [C]root,:c/2 root,:c' root:a for:g the:e home:g/3 [G7]team.:d/2",
      "If:d [C7]they:c/2 don't:d win:e it's:f a:g [F]shame.:a/3 [Dm]~:a",
      "For:a it's:b [C]one,:c'/3 two,:c'/3 three:c' strikes:b you're:a out:g at:^f the:g [D7]old:a/3 [G7]ball:b/3 [C]game!:c'/3 ~:c'/3"
    ] },
    { id: 'clementine', name: 'Oh My Darling, Clementine', ic: '⛏️', year: 1884, meter: 3, up: 1, bpm: 104, tr: -2, lead: 'vibraphone', lines: [
      "In:c/.75 a:c/.25 [C]cav-:c ern,:G in:e/.75 a:e/.25 can-:e yon,:c ex-:c/.75 ca-:e/.25 va-:g ting:g for:f/.75 a:e/.25 [G7]mine,:d/2",
      "Dwelt:d/.75 a:e/.25 mi-:f ner,:f for-:e/.75 ty=:d/.25 [C]nin-:e er,:c and:c/.75 his:e/.25 [G7]daugh-:d ter,:G Clem-:B/.75 en-:d/.25 [C]tine.:c/2",
      "Oh:c/.75 my:c/.25 [C]dar-:c ling,:G oh:e/.75 my:e/.25 dar-:e ling,:c oh:c/.75 my:e/.25 dar-:g ling:g Clem-:f/.75 en-:e/.25 [G7]tine,:d/2",
      "You:d/.75 are:e/.25 lost:f and:f gone:e/.75 for-:d/.25 [C]ev-:e er,:c dread-:c/.75 ful:e/.25 [G7]sor-:d ry,:G Clem-:B/.75 en-:d/.25 [C]tine.:c/2"
    ] },
    { id: 'range', name: 'Home on the Range', ic: '🦬', year: 1873, meter: 3, up: 1, bpm: 100, tr: -2, lead: 'clarinet', lines: [
      "Oh,:G [C]give:G me:c a:d home:e/2 where:c/.5 the:B/.5 [F]buf-:A fa-:f lo:f [Fm]roam,:f/2",
      "where:e/.5 the:f/.5 [C]deer:g/1.5 and:c/.5 the:c [D7]an-:c te-:B lope:c [G7]play;:d/4 r",
      "Where:G [C]sel-:G dom:c is:d heard:e/2 a:c/.5 dis-:B/.5 [F]cour-:A ag-:f ing:f [Fm]word,:f/2",
      "and:f/.5 the:f/.5 [C]skies:e/1.5 are:d/.5 not:c [G7]cloud-:B y:c all:d [C]day.:c/4 r/2",
      "[C]Home,:g/3 [G7]home:f on:e/1.5 the:d/.5 [C]range,:e/3 [E7]~:e r",
      "where:G/.5 the:G/.5 [Am]deer:c/1.5 and:c/.5 the:c [D7]an-:c te-:B lope:c [G7]play;:d/4 r",
      "Where:G [C]sel-:G dom:c is:d heard:e/2 a:c/.5 dis-:B/.5 [F]cour-:A ag-:f ing:f [Fm]word,:f/2",
      "and:f/.5 the:f/.5 [C]skies:e/1.5 are:d/.5 not:c [G7]cloud-:B y:c all:d [C]day.:c/3"
    ] },
    { id: 'auld', name: 'Auld Lang Syne', ic: '🥂', year: 1788, meter: 4, up: 1, bpm: 80, tr: -2, lead: 'string_ensemble_1', lines: [
      "Should:G [C]auld:c/1.5 ac-:c/.5 quain-:c tance:e [G7]be:d/1.5 for-:c/.5 got,:d",
      "and:e [C]nev-:c/1.5 er:c/.5 brought:e to:g [F]mind?:a/3",
      "Should:a [C]auld:g/1.5 ac-:e/.5 quain-:e tance:c [G7]be:d/1.5 for-:c/.5 got,:d",
      "and:e [F]days:c/1.5 of:A/.5 auld:A [G7]lang:G [C]syne?:c/3"
    ] },
    { id: 'twinkle', name: 'Twinkle, Twinkle, Little Star', ic: '⭐', year: 1806, meter: 4, up: 0, bpm: 92, tr: 0, lead: 'vibraphone', lines: TWINKLE.concat(TWINKLE.slice(0, 2)) },
    { id: 'flag', name: 'You’re a Grand Old Flag', ic: '🎏', year: 1906, meter: 2, up: 1, bpm: 108, tr: -2, lead: 'muted_trumpet', lines: [
      "You're:g/.75 a:e/.25 [C]grand:c old:c flag,:c you're:A/.5 a:G/.5 [G7]high:c/.5 fly-:d ing:B/.5 [C]flag,:c",
      "and:A/.5 for-:G/.5 [C]ev-:c er:A/.5 in:G/.5 peace:c may:A/.5 you:G/.5 [G7]wave.:B/2.5 r/.5",
      "You're:G/.5 the:A/.5 [G7]em-:B blem:c of:d/1.5 the:G/.5 [C]land:c I:d love,:e/1.5",
      "the:c/.5 [D7]home:d/.5 of:e the:c/.5 free:d/.5 and:e the:c/.5 [G7]brave.:d/2.5 r/.5",
      "Ev-:g/.75 'ry:e/.25 [C]heart:c beats:c true:c un-:A/.5 der:G/.5 [G7]red,:c/.5 white:d and:B/.5 [C7]blue,:c",
      "where:B/.5 there's:_B/.5 [A7]nev-:A er:^c/.5 a:e/.5 boast:A or:e [Dm]brag.:d/2.5 r/.5",
      "[G7]But:G/.5 should:G/.5 [C]auld:c/1.5 ac-:B/.5 quain-:c tance:e [G7]be:d/1.5 for-:^c/.5 got,:d",
      "keep:B/.5 your:G/.5 [D7]eye:A/.5 on:c the:A/.5 [G7]grand:c old:B [C]flag!:c/2"
    ] },
    { id: 'harvest', name: 'Shine On, Harvest Moon', ic: '🌕', year: 1908, meter: 4, up: 1, bpm: 92, tr: 0, lead: 'alto_sax', swing: true, lines: [
      "Oh,:e [A7]shine:f/2 on,:e/2 shine:f on,:e Har-:^c vest:A [D7]Moon:^F/2.75",
      "up:=F/.25 in:^F/.75 the:e/.25 sky.:d/3 r",
      "[G7]I:e/2 ain't:d/2 had:e no:d/.5 lov-:g in':e/.5 since:d",
      "[C]Jan-:c/.75 u-:A/.25 [G7]ar-:G/.75 y,:B/.25 [C]Feb-:c/.75 ru-:A/.25 [G7]ar-:G/.75 y,:A/.25 [F]June:c/.75 or:A/.25 [C]Ju-:G/.5 ly.:c/1.5 r",
      "[A7]Snow:f/2 time:e/2 ain't:f no:e time:^c to:A [D7]stay:^F/2.75",
      "out-:=F/.25 doors:^F/.75 and:e/.25 spoon,:d/3",
      "So:d [G7]shine:e/2 on,:d/2 shine:e on,:d/.5 har-:g vest:e/1.5 [C]moon:c/1.5",
      "for:G/.5 [F]me:A/.5 and:G/.5 my:A/.5 [C]gal!:c/3.5"
    ] },
    { id: 'silvery', name: 'By the Light of the Silvery Moon', ic: '🌙', year: 1909, meter: 4, up: 1, bpm: 100, tr: 0, lead: 'clarinet', swing: true, lines: [
      "By:E/.5 the:F/.5 [C]light:G/5 of:c/.75 the:d/.25 sil-:e/.75 ver-:d/.25 y:c [D7]moon,:A/5",
      "I:d want:c to:A [G7]spoon,:B/5 to:G/.5 my:A/.5 hon-:B/.5 ey:A/.5 I'll:G [C]croon:A/2 love's:E/2 [G7]tune.:G/2.5 r/.5",
      "Hon-:E/.5 ey-:F/.5 [C]moon,:G/5 keep:c/.5 a=:d/.5 shin-:e/.5 ing:d/.5 in:c [A7]June.:A/5",
      "[Dm]Your:d sil-:e v'ry:f [C]beams:e [C7]will:c [D7]bring:d [Fm]love:f [Am]dreams;:e",
      "we'll:c/.75 be:d/.25 cud-:e/.75 ~:d/.25 dling:c [A7]soon,:e/4 [D7]~:e by:c/.75 the:d/.25 sil-:e/.75 ver-:c/.25 [G7]y:d [C]moon.:c/4"
    ] },
    { id: 'sweetheart', name: 'Let Me Call You Sweetheart', ic: '💕', year: 1910, meter: 3, up: 0, bpm: 108, tr: 0, lead: 'alto_sax', lines: [
      "[C]Let:E/2 me:G call:c/2 you:d sweet-:e heart,:G/2 [D#dim7]I'm:^F/2 in:G [F]love:A/3 [A7]with:A/3 [D7]you.:A/6",
      "[G7]Let:B/2 me:_B hear:B/2 you:c whis-:d per:B/2 that:A/2 you:B [C]love:G/3 [A7]me:G/3 [Dm]too.:G/3 [G7]~:G/2 r",
      "[C]Keep:E/2 the:G love=:c/2 light:d glow-:e ing:G/2 [D#dim7]in:^F/2 your:G [F]eyes:A/3 [A7]so:A/3 [D7]true.:d/6",
      "[F]Let:d/2 me:c [G7]call:B/2 you:c [C]sweet-:e heart,:G/2 [A7]I'm:f/2 in:e [D7]love:A/3 [G7]with:B/3 [C]you.:c/6"
    ] },
    { id: 'summertime', name: 'In the Good Old Summertime', ic: '☀️', year: 1902, meter: 3, up: 2, bpm: 116, tr: 0, lead: 'clarinet', lines: [
      "In:G the:A [C]good:G old:E/2 sum-:G/2 mer-:c [C7]time,:e/4",
      "in:d the:c [F]good:c old:d/2 sum-:c/2 mer-:A [C]time,:G/6",
      "Stroll-:E/2 ing:G thru':c/2 the:d shad-:e/2 y:d [Am]lanes:c/3 [D7]with:d/2 your:e ba-:d/2 by:e [Dm]mine;:d/3 [G7]~:d/2",
      "You:G [C]hold:E/2 her:G hand:c/2 and:d [C7]she:e/2 holds:d yours,:c/2 and:c [F]that's:c/2 a:d ver-:c y:A good:c [C]sign.:G/5",
      "That:G she's:E/2 your:G toot-:c/2 sie=:d woot-:e/2 sie:d [Am]in:c/2 the:G [D7]good:A old:c/2 [G7]sum-:c/2 mer-:d [C]time.:c/3"
    ] },
    { id: 'bonnie', name: 'My Bonnie Lies over the Ocean', ic: '⛵', year: 1881, meter: 3, up: 1, bpm: 108, tr: 0, lead: 'clarinet', lines: [
      "My:G [C]Bon-:e nie:d lies:c [F]o-:d ver:c the:A [C]o-:G cean,:E/3 r",
      "My:G [C]Bon-:e nie:d lies:c [G7]o-:c ver:B the:c [G]sea;:d/4 r",
      "My:G [C]Bon-:e nie:d lies:c [F]o-:d ver:c the:A [C]o-:G cean,:E/3 r",
      "Oh,:G [Dm]bring:A back:d my:c [G7]Bon-:B nie:A to:B [C]me.:c/5 r",
      "[C]Bring:G/3 [C7]back,:c/3 [F]bring:A/3 [D7]back,:d/2 ~:c [G]bring:B back:B my:B [G7]Bon-:B nie:A to:B [C]me,:c/2 to:d me;:e/3",
      "[C]Bring:G/3 [C7]back,:c/3 [F]bring:A/3 [D7]back,:d/2 ~:c [G]bring:B back:B my:B [G7]Bon-:B nie:A to:B [C]me.:c/3"
    ] },
    { id: 'mountain', name: 'She’ll Be Coming Round the Mountain', ic: '⛰️', year: 1899, meter: 4, up: 2, bpm: 108, tr: -2, lead: 'alto_sax', swing: true, lines: more(MOUNTAIN, 'r/2').concat(relyric(MOUNTAIN,
      "She'll be dri- ving six white hor- ses when she comes, she'll be dri- ving six white hor- ses when she comes, " +
      "she'll be dri- ving six white hor- ses, she'll be dri- ving six white hor- ses, she'll be dri- ving six white hor- ses when she comes.")) },
    { id: 'saints', name: 'When the Saints Go Marching In', ic: '🎺', year: 1896, meter: 4, up: 3, bpm: 108, tr: -5, lead: 'muted_trumpet', swing: true, lines: more(SAINTS, 'r').concat(relyric(SAINTS,
      "Oh, when the sun re- fuse to shine, Oh, when the sun re- fuse to shine, I want to be in that num- ber, when the sun re- fuse to shine.")) },
    { id: 'grace', name: 'Amazing Grace', ic: '🕊️', year: 1835, meter: 3, up: 1, bpm: 84, tr: -2, lead: 'string_ensemble_1', lines: more(GRACE, 'r/2').concat(relyric(GRACE,
      "'Twas grace that taught my heart to fear, and grace my fears re- lieved; How pre- cious did that grace ap- pear the hour I first be- lieved.")) },
    { id: 'swinglow', name: 'Swing Low, Sweet Chariot', ic: '🌄', year: 1872, meter: 4, up: 0, bpm: 72, tr: -5, lead: 'tenor_sax', swing: true, lines: SWING_CHORUS.slice(0, 3).concat([
      "[C]Com-:c/.5 in':c/.5 for:c/.5 to:c/.5 car-:e/.5 ry:e/.5 [G7]me:d [C]home.:c/3",
      "I:e [C]looked:g o-:c/.5 ver:A Jor-:c/.5 dan,:c/.5 and:c/.5 [Am]what:c/.5 did:c/.5 I:c see,:A/.5 ~:G/1.5",
      "[C]Com-:c/.5 in':c/.5 for:c/.5 to:c/.5 car-:e/.5 ry:e/.5 me:g [G7]home?:g/3",
      "A:g [C]band:a/.5 ~:g/.5 of:e an-:e gels:c [Am]com-:c/.5 in':c/.5 af-:c/.5 ter:c/.5 me,:A/.5 ~:G/1.5",
      "[C]Com-:c/.5 in':c/.5 for:c/.5 to:c/.5 car-:e/.5 ry:e/.5 [G7]me:d [C]home.:c/4"
    ], SWING_CHORUS) },
    { id: 'jingle', name: 'Jingle Bells', ic: '🛷', year: 1857, meter: 4, up: 0, bpm: 112, tr: -5, lead: 'vibraphone', swing: true, lines: JINGLE.concat(JINGLE.slice(0, 3), [
      "[G7]one=:g horse:g o-:f pen:d [C]sleigh!:c/4"
    ]) },
    { id: 'birthday', name: 'Happy Birthday', ic: '🎂', year: 1893, meter: 3, up: 1, bpm: 96, tr: -2, lead: 'clarinet', lines: [
      "Hap-:G/.75 py:G/.25 [C]birth-:A day:G to:c [G7]you,:B/2",
      "Hap-:G/.75 py:G/.25 birth-:A day:G to:d [C]you,:c/2",
      "Hap-:G/.75 py:G/.25 [C7]birth-:g day,:e dear:c [F]friend,:B ~:A",
      "Hap-:f/.75 py:f/.25 [C]birth-:e day:c [G7]to:d [C]you!:c/3"
    ] }
  ];

  function parseSong(S) {
    const notes = [], lines = [], chords = [];
    let b = 0;
    const sw = x => { if (!S.swing) return x; const f = x - Math.floor(x); return Math.abs(f - .5) < 1e-6 ? x + .08 : x; };
    let word = null;
    S.lines.forEach(ln => {
      const words = [];
      ln.trim().split(/\s+/).forEach(tok => {
        const mm = tok.match(/^(?:\[([A-G][b#]?)(maj7|m7|m6|dim7|dim|m|7|6)?\])?(.*)$/);
        if (mm[1]) chords.push({ b, root: PCN[mm[1]], q: QUAL[mm[2] || ''] });
        const body = mm[3];
        let dur = 1, syl = null, m = null;
        const rest = body.match(/^r(?:\/([\d.]+))?$/);
        if (rest) dur = rest[1] ? +rest[1] : 1;
        else {
          const ci = body.indexOf(':'); if (ci < 1) throw new Error('bad token ' + tok + ' in ' + S.id);
          syl = body.slice(0, ci); let p = body.slice(ci + 1);
          const si = p.indexOf('/'); if (si >= 0) { dur = +p.slice(si + 1); p = p.slice(0, si); }
          m = pitch(p);
        }
        if (!(dur > 0)) throw new Error('bad duration ' + tok + ' in ' + S.id);
        const s0 = sw(b), s1 = sw(b + dur);
        if (m != null) notes.push({ b: s0, d: s1 - s0, m });
        if (syl && syl !== '~') {
          const joinPrev = word && word.open;
          if (!joinPrev) { word = { text: '', s: s0, e: s1, open: false, syl: [] }; words.push(word); }
          const keep = syl.endsWith('='), open = keep || syl.endsWith('-');
          word.text += open ? syl.slice(0, -1) + (keep ? '-' : '') : syl;
          word.open = open; word.e = s1; word.syl.push(s0);
        } else if (syl === '~' && word) word.e = s1;
        b += dur;
      });
      if (!words.length) throw new Error('empty line in ' + S.id);
      lines.push({ words, s: words[0].s, e: words[words.length - 1].e });
    });
    return { notes, lines, chords, len: b, end: notes.length ? Math.max(...notes.map(n => n.b + n.d)) : b };
  }
  /* the band's part: an intro, then piano, bass and brushes by metre, plus the lead playing the tune */
  function arrange(S, P) {
    const E = [], M = S.meter, up = S.up || 0, tr = S.tr || 0;
    const first = up > 0 ? up - M : 0, introBars = M === 4 ? 1 : 2, B0 = first - introBars * M;
    const lastNote = P.notes[P.notes.length - 1];
    const endBar = up + Math.floor((lastNote.b - up) / M + 1e-6) * M;
    const chordAt = b => { let c = P.chords[0]; for (const x of P.chords) { if (x.b <= b + 1e-6) c = x; else break; } return c; };
    const P_ = 'acoustic_grand_piano', BASS = 'acoustic_bass';
    const comp = (b, d, v) => { const c = chordAt(b); voicing(c.root + tr, c.q, 53).forEach((m, i) => E.push({ b, inst: P_, m, d, v, roll: i * .01 })); };
    const bass = (b, d, v, fifth) => { const c = chordAt(b); E.push({ b, inst: BASS, m: above(c.root + tr + (fifth ? 7 : 0), 36), d, v, bass: 1 }); };
    let k = 0;
    for (let bar = B0; bar < endBar - 1e-6; bar += M, k++) {
      if (M === 3) {
        bass(bar, 1.6, .8, k % 2 === 1 && chordAt(bar) === chordAt(bar - M));
        comp(bar + 1, .7, .34); comp(bar + 2, .7, .28);
        E.push({ b: bar, br: 'sweep', v: .024 }); E.push({ b: bar + 1, br: 'tap', v: .016 }); E.push({ b: bar + 2, br: 'tap', v: .016 });
      } else if (M === 2) {
        bass(bar, .8, .82, k % 2 === 1 && chordAt(bar) === chordAt(bar - M)); comp(bar + 1, .5, .32);
        E.push({ b: bar, br: 'tap', v: .02 }); E.push({ b: bar + 1, br: 'slap', v: .03 });
      } else {
        bass(bar, 1.8, .8, false); bass(bar + 2, 1.8, .7, chordAt(bar + 2) === chordAt(bar));
        comp(bar + 1, .8, .34); comp(bar + 3, .8, .3);
        if (S.swing && k % 2 === 1) comp(bar + 3.67, .5, .24);
        [0, 2].forEach(o => E.push({ b: bar + o, br: 'sweep', v: .02 }));
        [1, 3].forEach(o => E.push({ b: bar + o, br: 'slap', v: .028 }));
        if (S.swing) [1.67, 3.67].forEach(o => E.push({ b: bar + o, br: 'tap', v: .014 }));
      }
    }
    /* final chord, held */
    { const c = chordAt(endBar); E.push({ b: endBar, inst: BASS, m: above(c.root + tr, 36), d: M + 1, v: .8, bass: 1 });
      voicing(c.root + tr, c.q, 55).forEach((m, i) => E.push({ b: endBar, inst: P_, m, d: M + 1.5, v: .36, roll: i * .03 }));
      E.push({ b: endBar, br: 'sweep', v: .03 }); }
    P.notes.forEach(n => E.push({ b: n.b, inst: S.lead, m: n.m + tr, d: n.d, v: .74, lead: 1 }));
    E.sort((a, b) => a.b - b.b);
    return { ev: E, B0, end: Math.max(P.end, endBar + M) };
  }
  R._sing = { SONGS, parseSong, arrange, relyric, pitch };   /* for tests */

  R.css(`
.sw-wrap{display:flex; flex-direction:column; align-items:center; gap:12px; width:100%; max-width:640px; margin:0 auto}
.sw-pick{display:grid; grid-template-columns:1fr 1fr; gap:12px; width:100%}
.sw-card{flex-direction:column; justify-content:center; gap:2px; min-height:92px; padding:.35em .45em; font-size:1.18rem; line-height:1.12; text-align:center; white-space:normal}
.sw-card .e{font-size:2.05rem; line-height:1}
.sw-row{display:flex; gap:10px; justify-content:center; flex-wrap:wrap; width:100%}
.sw-row .btn{min-height:58px; font-size:1.12rem; padding:.35em .75em; gap:.3em}
.sw-row .btn[disabled]{opacity:.45}
.sw-title{display:flex; align-items:center; gap:.4em; font:700 1.3rem/1.2 var(--display); color:var(--on-table); text-align:center}
.sw-box{position:relative; width:100%; min-height:250px; box-sizing:border-box; border-radius:26px; padding:44px 14px 18px; color:var(--ink); text-align:center;
  display:flex; flex-direction:column; justify-content:center; gap:16px; overflow:hidden;
  background:radial-gradient(120% 80% at 50% 0%, #FFFDF4, #F8E9C8 70%, #EFD9A8);
  box-shadow:inset 0 0 0 6px rgba(255,255,255,.55), inset 0 0 0 9px #C99B4E, inset 0 3px 0 10px rgba(255,255,255,.4), 0 8px 0 #8A5B22, 0 14px 24px rgba(0,0,0,.32)}
.sw-line{display:flex; flex-wrap:wrap; justify-content:center; gap:.08em .32em; font:700 2.05rem/1.22 var(--display)}
.sw-next{display:flex; flex-wrap:wrap; justify-content:center; gap:.05em .3em; font:600 1.3rem/1.25 var(--display); color:#8E7A55}
.sw-w{display:inline-block; position:relative; transition:color .12s, transform .12s}
.sw-w.sung{color:#C2412A}
.sw-w.now{color:#E8501C; transform:translateY(-2px) scale(1.1); text-shadow:0 3px 0 rgba(255,196,60,.55)}
.sw-ball{position:absolute; left:0; top:0; width:24px; height:24px; margin:-12px 0 0 -12px; border-radius:50%; pointer-events:none; z-index:2;
  background:radial-gradient(circle at 35% 30%, #fff, #FFE07A 40%, #F2961F 80%); box-shadow:0 3px 0 rgba(150,80,0,.35), 0 0 14px 4px rgba(255,200,80,.6)}
.sw-ready{font:700 1.4rem var(--display); color:#8E7A55}
.sw-speed{display:flex; align-items:center; gap:6px; font:600 1.05rem var(--display); color:var(--on-table)}
.sw-speed i{width:12px; height:12px; border-radius:50%; background:rgba(255,255,255,.28)}
.sw-speed i.on{background:var(--sun); box-shadow:0 0 0 2px rgba(0,0,0,.15)}
.sw-end{display:flex; flex-direction:column; align-items:center; gap:10px}
.sw-end .big{font:700 1.8rem var(--display); color:#C2412A}
@media (max-width:420px){ .sw-line{font-size:1.75rem} .sw-next{font-size:1.15rem} .sw-row .btn{font-size:1.02rem; padding:.3em .55em} }
`);

  const SPEEDS = [.7, .8, .9, 1, 1.12];
  const SPEED_NAMES = ['Very slow', 'Slow', 'Easy', 'Normal', 'Brisk'];
  const CARD_COLS = ['c-coral', 'c-sun', 'c-leaf', 'c-sky', 'c-berry', 'c-orange', 'c-grape', 'c-peach', 'c-mint', 'c-rose'];

  function startSing(level, api) {
    const L = Math.max(1, level | 0);
    const M = mixer(api, 1, .14);
    const clock = () => M ? M.ctx.currentTime : performance.now() / 1000;
    loadInst('acoustic_grand_piano'); loadInst('acoustic_bass');
    const wrap = el('div', 'sw-wrap'); api.stage.append(wrap);
    const PER = 6, pages = Math.ceil(SONGS.length / PER);
    let page = (L - 1) % pages, finished = false, st = null, speedI = store('speed', 2);
    function store(k, d) { try { return R.store.get('sw-' + k, d); } catch (e) { return d; } }
    function save(k, v) { try { R.store.set('sw-' + k, v); } catch (e) {} }
    function finish() {
      if (finished) return; finished = true;
      stopSong(); if (M) M.fade(.6); sfx.good(); api.done(3);
    }
    const finBtn = () => { const b = el('button', 'btn c-mint', '✓ Finished'); b.type = 'button'; b.onclick = () => { sfx.tap(); finish(); }; return b; };
    function soundRow(row) {
      if (R.isMuted && R.isMuted()) {
        const s = el('button', 'btn c-sun', '🔊 Sound on'); s.type = 'button';
        s.onclick = () => { R.unmute(); s.remove(); sfx.tap(); };
        row.append(s);
      }
    }

    /* ---- song picker ---- */
    function showPicker() {
      stopSong();
      wrap.innerHTML = '';
      api.hint('Pick a song to sing. The words light up as the band plays.');
      const grid = el('div', 'sw-pick'); wrap.append(grid);
      SONGS.slice(page * PER, page * PER + PER).forEach((S, i) => {
        const b = el('button', 'btn sw-card ' + CARD_COLS[(page * PER + i) % CARD_COLS.length], `<span class="e" aria-hidden="true">${S.ic}</span><span>${S.name}</span>`);
        b.type = 'button'; b.onclick = () => { sfx.tap(); playSong(S); };
        grid.append(b);
      });
      const row = el('div', 'sw-row'); wrap.append(row);
      const more = el('button', 'btn c-card', `🎵 More songs (${page + 1} of ${pages})`); more.type = 'button';
      more.onclick = () => { sfx.tap(); page = (page + 1) % pages; showPicker(); };
      row.append(more, finBtn());
      soundRow(row);
    }

    /* ---- the player ---- */
    function stopSong() {
      if (!st) return;
      st.dead = true; if (st.layer) st.layer.kill(.2); st = null;
    }
    function playSong(S) {
      stopSong();
      const P = parseSong(S), A = arrange(S, P);
      wrap.innerHTML = '';
      wrap.append(el('div', 'sw-title', `<span aria-hidden="true">${S.ic}</span><span>${S.name}</span>`));
      const box = el('div', 'sw-box'); wrap.append(box);
      const ball = el('div', 'sw-ball'); ball.style.display = 'none';
      const lineEl = el('div', 'sw-line'), nextEl = el('div', 'sw-next');
      box.append(ball, lineEl, nextEl);
      const ctl = el('div', 'sw-row'), ctl2 = el('div', 'sw-row');
      const slow = el('button', 'btn c-sky', '🐢 Slower'), pause = el('button', 'btn c-sun', '⏸ Pause'), fast = el('button', 'btn c-coral', '🐇 Faster');
      const again = el('button', 'btn c-peach', '↻ Sing it again'), songs = el('button', 'btn c-card', '🎵 Songs');
      [slow, pause, fast, again, songs].forEach(b => { b.type = 'button'; });
      ctl.append(slow, pause, fast);
      const speedEl = el('div', 'sw-speed');
      ctl2.append(again, songs, finBtn());
      soundRow(ctl2);
      wrap.append(speedEl, ctl, ctl2);
      const my = { S, P, A, dead: false, paused: false, ready: false, i: 0, layer: null, aT: 0, aB: A.B0, bps: 1, shown: -1, ended: false };
      st = my;
      wrap._sw = my;   /* read by tests */
      const bpsNow = () => S.bpm * SPEEDS[speedI] / 60;
      const beatAt = t => my.aB + (t - my.aT) * my.bps;
      const timeAt = b => my.aT + (b - my.aB) / my.bps;
      function showSpeed() {
        speedEl.innerHTML = '<span>Speed:</span>' + SPEEDS.map((_, i) => `<i class="${i <= speedI ? 'on' : ''}"></i>`).join('') + `<span>${SPEED_NAMES[speedI]}</span>`;
        slow.disabled = speedI === 0; fast.disabled = speedI === SPEEDS.length - 1;
      }
      showSpeed();
      function setSpeed(d) {
        const n = clamp(speedI + d, 0, SPEEDS.length - 1); if (n === speedI) return;
        speedI = n; save('speed', n); showSpeed();
        if (my.ready && !my.paused) { const now = clock(); my.aB = beatAt(now); my.aT = now; }
        my.bps = bpsNow();
        api.hint(d < 0 ? 'A little slower. Take your time.' : 'A little faster.');
      }
      slow.onclick = () => { sfx.tap(); setSpeed(-1); };
      fast.onclick = () => { sfx.tap(); setSpeed(1); };
      pause.onclick = () => {
        sfx.tap();
        if (!my.ready || my.ended) return;
        if (!my.paused) {
          my.paused = true; my.pB = beatAt(clock()); if (my.layer) my.layer.kill(.1); my.layer = null;
          pause.innerHTML = '▶ Play'; api.hint('Paused. Tap Play when you are ready to carry on.');
        } else {
          /* carry on from the start of the line we were on */
          let ln = P.lines.findIndex(x => x.e > my.pB); if (ln < 0) ln = P.lines.length - 1;
          go(Math.max(A.B0, P.lines[ln].s - S.meter));
          pause.innerHTML = '⏸ Pause'; api.hint('Here we go again from the start of the line.');
        }
      };
      again.onclick = () => { sfx.tap(); if (!my.ready) return; go(A.B0); pause.innerHTML = '⏸ Pause'; api.hint('From the top! Sing along when the words light up.'); };
      songs.onclick = () => { sfx.tap(); showPicker(); };

      function go(fromB) {
        if (my.layer) my.layer.kill(.1);
        my.layer = M && !M.dead ? M.layer() : null;
        my.paused = false; my.ended = false;
        my.bps = bpsNow(); my.aB = fromB; my.aT = clock() + .25;
        my.i = A.ev.findIndex(e => e.b >= fromB - 1e-6); if (my.i < 0) my.i = A.ev.length;
        my.shown = -1;
        const endEl = box.querySelector('.sw-end'); if (endEl) endEl.remove();
        lineEl.style.display = ''; nextEl.style.display = '';
      }
      function playEv(e, now) {
        let t = timeAt(e.b);
        if (t < now - .08) return;
        t = Math.max(now + .005, t + (e.lead ? 0 : (Math.random() - .5) * .016) + (e.roll || 0));
        const dur = Math.max(.12, e.d / my.bps);
        if (my.layer) {
          const D = my.layer;
          if (e.br) brush(D, t, e.v * (.85 + Math.random() * .3), e.br);
          else if (e.lead) { const wind = WIND[e.inst]; voice(D, e.inst, t, e.m, dur * (wind ? .96 : .9), e.v * (.92 + Math.random() * .16), wind ? { attack: e.inst === 'string_ensemble_1' ? .09 : .03, release: .2, scoop: Math.random() < .25 ? 30 : 0 } : { release: .5 }); }
          else voice(D, e.inst, t, e.m, dur, e.v * (.88 + Math.random() * .24), e.bass ? { release: .15 } : { release: .4 });
        } else if (!M && e.lead) {
          api.later(() => tone(mtof(e.m), Math.max(.2, dur * .9), 'triangle', .13), Math.max(0, (t - now) * 1000));
        }
      }
      function tick() {
        if (my.dead || st !== my || !api.stage.isConnected) return;
        if (my.ready && !my.paused && !my.ended) {
          const now = clock();
          if (timeAt(A.ev[Math.min(my.i, A.ev.length - 1)] ? A.ev[Math.min(my.i, A.ev.length - 1)].b : 0) < now - 1.5) {
            /* came back from a hidden tab: skip what was missed */
            while (my.i < A.ev.length && timeAt(A.ev[my.i].b) < now - .05) my.i++;
          }
          const horizon = beatAt(now + .3);
          while (my.i < A.ev.length && A.ev[my.i].b < horizon) playEv(A.ev[my.i++], now);
          if (beatAt(now) > A.end + 1) ending();
        }
        api.later(tick, 45);
      }
      function ending() {
        if (my.ended) return; my.ended = true;
        ball.style.display = 'none';
        lineEl.style.display = 'none'; nextEl.style.display = 'none';
        const end = el('div', 'sw-end', `<div class="big">${cheer()}</div><div class="sw-ready">Thank you for singing along.</div>`);
        box.append(end);
        sfx.win();
        api.hint('That was lovely! Tap “Sing it again”, pick another song, or tap ✓ Finished.');
      }
      function wordsHtml(line) { return line.words.map(w => `<span class="sw-w">${w.text}</span>`).join(''); }
      function frame() {
        if (my.dead || st !== my || !wrap.isConnected) return;
        if (my.ready && !my.ended) {
          const beat = my.paused ? my.pB : beatAt(clock());
          /* which line to show: the next line appears a beat before it starts */
          let li = 0;
          for (let k = 0; k < P.lines.length; k++) if (P.lines[k].s - 1.2 <= beat) li = k;
          if (li !== my.shown) {
            my.shown = li;
            lineEl.innerHTML = wordsHtml(P.lines[li]);
            nextEl.innerHTML = li + 1 < P.lines.length ? wordsHtml(P.lines[li + 1]) : '';
            my.wEls = [...lineEl.children];
          }
          const line = P.lines[li], ws = line.words, wEls = my.wEls;
          let cur = -1;
          ws.forEach((w, k) => {
            const sung = beat >= w.s - .02;
            if (sung) cur = k;
            wEls[k].classList.toggle('sung', sung);
          });
          wEls.forEach((e, k) => e.classList.toggle('now', k === cur && beat < ws[k].e + .25));
          /* the bouncing ball */
          const pos = k => { const e = wEls[k]; return { x: e.offsetLeft + e.offsetWidth / 2, y: e.offsetTop }; };
          let x, y;
          if (cur < 0) {
            const p = pos(0), wait = ws[0].s - beat, u = (beat % 1 + 1) % 1;
            x = p.x - Math.min(40, wait * 14); y = p.y - 10 - 26 * Math.sin(Math.PI * u);
          } else if (cur + 1 < ws.length) {
            const a = pos(cur), b2 = pos(cur + 1), span = Math.max(.25, ws[cur + 1].s - ws[cur].s), u = clamp((beat - ws[cur].s) / span, 0, 1);
            const h = Math.min(46, 18 + span * 12);
            x = lerp(a.x, b2.x, u); y = lerp(a.y, b2.y, u) - 10 - h * Math.sin(Math.PI * u);
          } else {
            const a = pos(cur), u = clamp((beat - ws[cur].s) / 1, 0, 1);
            x = a.x; y = a.y - 10 - 14 * Math.abs(Math.sin(Math.PI * u * 2)) * (1 - u);
          }
          ball.style.display = '';
          ball.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        }
        requestAnimationFrame(frame);
      }
      api.hint('The band is tuning up…');
      lineEl.innerHTML = `<span class="sw-ready">Get ready to sing…</span>`;
      nextEl.innerHTML = wordsHtml(P.lines[0]);
      loadSome(['acoustic_grand_piano', 'acoustic_bass', S.lead], 5000, api.later).then(() => {
        if (st !== my || my.dead || finished) return;
        my.ready = true; go(A.B0);
        api.hint('Sing along when the ball bounces on each word. No rush at all.');
        tick(); requestAnimationFrame(frame);
      });
    }
    showPicker();
  }
  register({ id: 'singwords', cat: 'gentle', order: 44, name: 'Sing the Words', icon: '🎤', desc: 'Sing old favourites as the words light up', gentle: true, start: startSing });

  /* =========================================================
     2. CAROUSEL RIDE
     ========================================================= */
  const CW = 360, CH = 400;
  const FONT = "'Fredoka', ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif";
  R.css(`
.cr-wrap{width:min(100%,470px); margin:0 auto; display:grid; gap:12px}
.cr-cv{display:block; width:100%; height:auto; aspect-ratio:360/400; border-radius:22px; touch-action:manipulation; cursor:pointer; background:#2B1E4F;
  -webkit-tap-highlight-color:transparent; user-select:none; -webkit-user-select:none;
  box-shadow:inset 0 0 0 4px rgba(255,255,255,.14), 0 8px 0 #4A2B15, 0 16px 28px rgba(0,0,0,.35)}
.cr-row{display:flex; gap:10px; justify-content:center; flex-wrap:wrap}
.cr-row .btn{min-height:58px; font-size:1.1rem; padding:.35em .7em; gap:.3em}
.cr-row .btn[disabled]{opacity:.45}
.cr-speed{display:flex; justify-content:center; align-items:center; gap:6px; font:600 1.05rem var(--display); color:var(--on-table)}
.cr-speed i{width:12px; height:12px; border-radius:50%; background:rgba(255,255,255,.28)}
.cr-speed i.on{background:var(--sun)}
`);
  const HORSES = [
    { name: 'Bluebell', body: '#F6F2EA', shade: '#D9D1C2', mane: '#4F67D8', saddle: '#2F7BE8', trim: '#FFD34D' },
    { name: 'Ginger', body: '#E9A05A', shade: '#C27A38', mane: '#7A3412', saddle: '#2FA35A', trim: '#FFE07A' },
    { name: 'Duchess', body: '#F8D9E6', shade: '#E2B2C6', mane: '#C2417F', saddle: '#8E44D9', trim: '#FFD34D' },
    { name: 'Captain', body: '#5A463C', shade: '#3F2F27', mane: '#F2E6C9', saddle: '#E0402E', trim: '#FFD34D' },
    { name: 'Primrose', body: '#FFF4CC', shade: '#E8D59A', mane: '#E39A12', saddle: '#E86A9A', trim: '#FFFFFF' },
    { name: 'Pepper', body: '#BFC4CC', shade: '#9AA0AA', mane: '#2E3440', saddle: '#F2A900', trim: '#FFF2B0' }
  ];
  const SKIES = [
    { top: '#3A2A6B', mid: '#B4507A', low: '#FFAA5C', sea: '#3B4F8C', sea2: '#F7A25E', sun: '#FFD27A', stars: .2 },
    { top: '#221B4D', mid: '#6B3C78', low: '#E9806A', sea: '#2C3A72', sea2: '#D9786A', sun: '#FFC38A', stars: .6 },
    { top: '#0F1638', mid: '#283068', low: '#5A4A8A', sea: '#1C2652', sea2: '#8B86C9', sun: null, stars: 1 }
  ];
  /* An original band-organ waltz in C, 3/4: [Chord] then pitch/beats */
  const WALTZ = [
    '[C]e/2 g [C]c\'/2 g [Dm]a/2 f [G7]d/3 [G7]f/2 d [G7]b/2 a [C]g e c [C]e/3',
    '[C]e/2 g [C]c\'/2 e\' [F]d\'/2 c\' [F]a/3 [D7]^f a c\' [G7]b/2 a [G7]g a b [C]c\'/3',
    '[F]a b c\' [F]f\'/2 c\' [C]e\' d\' c\' [C]g/3 [Dm]f g a [G7]d\'/2 b [C]c\' b c\' [A7]e\'/2 ^c\'',
    '[Dm]d\' c\' a [Dm]f/3 [C]e g c\' [A7]a/2 g [D7]^f a d\' [G7]b/2 a [G7]g a b [C]c\'/3'
  ];
  function parseWaltz() {
    const notes = [], bars = []; let b = 0;
    WALTZ.join(' ').trim().split(/\s+/).forEach(tok => {
      const mm = tok.match(/^(?:\[([A-G][b#]?)(m7|m|7|6)?\])?([_^=]?[A-Ga-g][',]*|r)(?:\/([\d.]+))?$/);
      if (!mm) throw new Error('bad waltz token ' + tok);
      if (mm[1]) bars[Math.round(b / 3)] = { root: PCN[mm[1]], q: QUAL[mm[2] || ''] };
      const d = mm[4] ? +mm[4] : 1;
      if (mm[3] !== 'r') notes.push({ b, d, m: pitch(mm[3]) });
      b += d;
    });
    for (let i = 0; i < bars.length; i++) if (!bars[i]) bars[i] = bars[i - 1];
    return { notes, bars, len: b };
  }
  const WZ = parseWaltz();
  R._carousel = { WZ, HORSES };   /* for tests */

  /* band-organ voices (synthesised) */
  function pipe(D, t, m, dur, vel) {
    if (!D || D.dead) return;
    try {
      const ctx = D.ctx, f = mtof(m), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = .5; lp.connect(g); g.connect(D.in);
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5.6; lg.gain.value = 7; lfo.connect(lg);
      [['square', 1, .22], ['triangle', 2, .45], ['sine', 1, .7], ['sawtooth', 1.003, .08]].forEach(([type, mul, v]) => {
        const o = ctx.createOscillator(), og = ctx.createGain(); o.type = type; o.frequency.value = f * mul; og.gain.value = v;
        lg.connect(o.detune); o.connect(og); og.connect(lp); o.start(t); o.stop(t + dur + .15);
      });
      const pk = vel * .075;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(pk, t + .025);
      g.gain.setValueAtTime(pk, t + Math.max(.03, dur - .06)); g.gain.exponentialRampToValueAtTime(.0001, t + dur + .1);
      lfo.start(t); lfo.stop(t + dur + .15);
    } catch (e) {}
  }
  function bell(D, t, m, vel) {
    if (!D || D.dead) return;
    try {
      const ctx = D.ctx, f = mtof(m);
      [[1, 1, .9], [2.76, .35, .35], [5.4, .15, .18]].forEach(([mul, v, dec]) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * mul;
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vel * v * .05, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + dec);
        o.connect(g); g.connect(D.in); o.start(t); o.stop(t + dec + .05);
      });
    } catch (e) {}
  }
  function oom(D, t, m, vel) {
    if (!D || D.dead) return;
    try {
      const ctx = D.ctx, f = mtof(m), g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
      lp.connect(g); g.connect(D.in);
      [['triangle', 1, .9], ['square', 1, .18], ['sine', .5, .4]].forEach(([type, mul, v]) => { const o = ctx.createOscillator(), og = ctx.createGain(); o.type = type; o.frequency.value = f * mul; og.gain.value = v; o.connect(og); og.connect(lp); o.start(t); o.stop(t + .5); });
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vel * .22, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + .42);
    } catch (e) {}
  }
  function pah(D, t, ms, vel) {
    if (!D || D.dead) return;
    try {
      const ctx = D.ctx, g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500; lp.connect(g); g.connect(D.in);
      ms.forEach(m => { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = mtof(m); o.connect(lp); o.start(t); o.stop(t + .3); });
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vel * .03, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + .24);
    } catch (e) {}
  }

  /* ---------- drawing ---------- */
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function glowDot(c, x, y, r, col, a) {
    const g = c.createRadialGradient(x, y, 0, x, y, r * 3.2);
    g.addColorStop(0, `rgba(255,250,220,${a})`); g.addColorStop(.3, col.replace('A', a * .8)); g.addColorStop(1, col.replace('A', 0));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 3.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = `rgba(255,252,235,${.55 + a * .45})`; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
  /* a painted carousel horse, facing right at dir 1, centred on its body */
  function drawHorse(c, x, y, s, dir, H, chosen, shade) {
    c.save(); c.translate(x, y); c.scale(s * dir, s);
    if (chosen) { c.shadowColor = 'rgba(255,225,120,.95)'; c.shadowBlur = 18; }
    c.lineCap = 'round'; c.lineJoin = 'round';
    const leg = (pts, w) => { c.strokeStyle = H.shade; c.lineWidth = w; c.beginPath(); c.moveTo(pts[0], pts[1]); c.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]); c.stroke();
      c.fillStyle = H.trim; c.beginPath(); c.arc(pts[4], pts[5], w * .55, 0, Math.PI * 2); c.fill(); };
    /* far legs */
    leg([-16, 6, -26, 16, -38, 22], 6); leg([14, 6, 30, 8, 26, 20], 6);
    /* tail */
    c.fillStyle = H.mane; c.beginPath(); c.moveTo(-24, -6); c.bezierCurveTo(-40, -12, -48, 4, -42, 22); c.bezierCurveTo(-38, 10, -32, 4, -22, 2); c.fill();
    /* body */
    c.fillStyle = H.body; c.beginPath(); c.ellipse(0, 0, 27, 13.5, 0, 0, Math.PI * 2); c.fill();
    /* neck and head */
    c.beginPath(); c.moveTo(10, -9); c.quadraticCurveTo(16, -30, 26, -38); c.quadraticCurveTo(38, -42, 46, -27); c.quadraticCurveTo(48, -20, 42, -19);
    c.lineTo(32, -22); c.quadraticCurveTo(26, -10, 24, 4); c.closePath(); c.fill();
    c.shadowBlur = 0;
    /* ear and eye, nostril */
    c.beginPath(); c.moveTo(27, -36); c.lineTo(29, -47); c.lineTo(33, -38); c.closePath(); c.fill();
    c.fillStyle = '#2A1A12'; c.beginPath(); c.arc(34, -31, 2.1, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(44, -23, 1.1, 0, Math.PI * 2); c.fill();
    /* mane */
    c.fillStyle = H.mane; c.beginPath(); c.moveTo(25, -39);
    for (let i = 0; i <= 5; i++) { const u = i / 5, mx = lerp(25, 8, u), my = lerp(-39, -10, u); c.quadraticCurveTo(mx - 9, my + 2, lerp(25, 8, u + .1) - 2, lerp(-39, -10, u + .1)); }
    c.lineTo(13, -8); c.quadraticCurveTo(18, -26, 28, -36); c.closePath(); c.fill();
    /* blanket, saddle and bridle */
    c.fillStyle = H.saddle; c.beginPath(); c.moveTo(-12, -12); c.quadraticCurveTo(0, -16, 12, -12); c.lineTo(10, 6); c.quadraticCurveTo(0, 9, -10, 6); c.closePath(); c.fill();
    c.strokeStyle = H.trim; c.lineWidth = 2; c.beginPath(); c.moveTo(-10, 5); c.quadraticCurveTo(0, 8.5, 10, 5); c.stroke();
    c.fillStyle = H.trim; for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(i * 7, 2.5, 1.6, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#7A3A1C'; c.beginPath(); c.ellipse(0, -13, 10, 3.6, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = H.trim; c.lineWidth = 1.8; c.beginPath(); c.moveTo(42, -21); c.lineTo(30, -30); c.moveTo(42, -21); c.quadraticCurveTo(24, -18, 8, -14); c.stroke();
    /* near legs (raised, prancing) */
    leg([-12, 9, -18, 22, -30, 28], 6.5); leg([18, 8, 32, 14, 22, 24], 6.5);
    if (shade > 0) { c.globalCompositeOperation = 'source-atop'; c.fillStyle = `rgba(30,18,60,${shade})`; c.fillRect(-50, -50, 100, 90); }
    c.restore();
  }
  function brassPole(c, x, y0, y1, w, shade) {
    const g = c.createLinearGradient(x - w, 0, x + w, 0);
    g.addColorStop(0, '#8A6A1E'); g.addColorStop(.45, '#FFF0A8'); g.addColorStop(1, '#A57F22');
    c.fillStyle = g; c.fillRect(x - w / 2, y0, w, y1 - y0);
    c.strokeStyle = 'rgba(120,80,10,.45)'; c.lineWidth = 1;
    for (let y = y0 + 4; y < y1; y += 7) { c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x + w / 2, y + 3); c.stroke(); }
    if (shade > 0) { c.fillStyle = `rgba(30,18,60,${shade})`; c.fillRect(x - w / 2, y0, w, y1 - y0); }
  }

  function startCarousel(level, api) {
    const L = Math.max(1, level | 0);
    const sky = SKIES[(L - 1) % SKIES.length];
    const M = mixer(api, 1, .2);
    const clock = () => M ? M.ctx.currentTime : performance.now() / 1000;
    const wrap = el('div', 'cr-wrap'), cv = el('canvas', 'cr-cv'), ctx = cv.getContext('2d');
    const K = clamp((window.devicePixelRatio || 1) * 1.4, 1.5, 3.5);
    cv.width = Math.round(CW * K); cv.height = Math.round(CH * K);
    cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'A merry-go-round at a seaside fair');
    const speedEl = el('div', 'cr-speed'), row = el('div', 'cr-row');
    const change = el('button', 'btn c-peach', '🎠 Change horse'), slow = el('button', 'btn c-sky', '🐢 Slower'), fast = el('button', 'btn c-coral', '🐇 Faster'), fin = el('button', 'btn c-mint', '✓ Finished');
    [change, slow, fast, fin].forEach(b => { b.type = 'button'; });
    change.hidden = true;
    row.append(change, slow, fast, fin);
    if (R.isMuted && R.isMuted()) { const s = el('button', 'btn c-sun', '🔊 Sound on'); s.type = 'button'; s.onclick = () => { R.unmute(); s.remove(); sfx.tap(); }; row.append(s); }
    wrap.append(cv, speedEl, row); api.stage.append(wrap);

    const SP = [.7, .85, 1, 1.15, 1.3], SPN = ['Very gentle', 'Gentle', 'Easy', 'Lively', 'Merry'];
    let spI = 2, finished = false;
    const S = { mode: 'pick', chosen: -1, trans: 0, aT: clock() + .3, aB: 0, bps: 138 / 60 * SP[spI], nextBar: 0, layer: M ? M.layer() : null, sparkle: [], tapT: -9 };
    cv._cr = S;   /* read by tests */
    const beatAt = t => S.aB + (t - S.aT) * S.bps;
    const timeAt = b => S.aT + (b - S.aB) / S.bps;
    function showSpeed() {
      speedEl.innerHTML = '<span>Speed:</span>' + SP.map((_, i) => `<i class="${i <= spI ? 'on' : ''}"></i>`).join('') + `<span>${SPN[spI]}</span>`;
      slow.disabled = spI === 0; fast.disabled = spI === SP.length - 1;
    }
    showSpeed();
    function setSpeed(d) {
      const n = clamp(spI + d, 0, SP.length - 1); if (n === spI) return;
      spI = n; const now = clock(); S.aB = beatAt(now); S.aT = now; S.bps = 138 / 60 * SP[spI]; showSpeed();
      api.hint(d < 0 ? 'Slowing down gently…' : 'A little faster. Whee!');
    }
    slow.onclick = () => { sfx.tap(); setSpeed(-1); };
    fast.onclick = () => { sfx.tap(); setSpeed(1); };
    fin.onclick = () => { if (finished) return; finished = true; sfx.good(); if (S.layer) S.layer.kill(.8); if (M) M.fade(1); api.done(3); };
    change.onclick = () => { sfx.tap(); S.mode = 'pick'; S.chosen = -1; change.hidden = true; api.hint('Tap a painted horse to choose your ride.'); };
    api.hint('Tap a painted horse to choose your ride.');

    /* ---- the music: an endless band-organ waltz ---- */
    function scheduleBar(bar) {
      const D = S.layer; if (!D || D.dead) return;
      const n = WZ.bars.length, bi = ((bar % n) + n) % n, ch = WZ.bars[bi], spb = 1 / S.bps;
      const at = b => timeAt(bar * 3 + b) + (Math.random() - .5) * .008;
      const root = above(ch.root, 36), fifth = above(ch.root + 7, 36);
      oom(D, at(0), bi % 2 ? fifth : root, .9);
      boom(D, at(0), .16, 95, 50, .25);
      const V = voicing(ch.root, ch.q, 55).slice(0, 3);
      pah(D, at(1), V, .9); pah(D, at(2), V, .75);
      noiseHit(D, at(1), { type: 'bandpass', f: 3200, q: .9, v: .02, dec: .06 });
      noiseHit(D, at(2), { type: 'bandpass', f: 3200, q: .9, v: .016, dec: .06 });
      if (bi % 16 === 0) noiseHit(D, at(0), { f: 6000, v: .03, dec: .7 });
      if (bi % 8 === 7) [2, 2.25, 2.5, 2.75].forEach(b => noiseHit(D, at(b), { type: 'bandpass', f: 2400, q: .8, v: .025, dec: .05 }));
      WZ.notes.filter(x => x.b >= bi * 3 - 1e-6 && x.b < bi * 3 + 3 - 1e-6).forEach(x => {
        const t = at(x.b - bi * 3), dur = x.d * spb * .92;
        pipe(D, t, x.m - 12, dur, .95);
        bell(D, t, x.m, x.b % 3 === 0 ? .9 : .6);
      });
    }
    function tick() {
      if (finished || !api.stage.isConnected) return;
      const now = clock();
      if (S.layer && timeAt(S.nextBar * 3) < now - 1) S.nextBar = Math.ceil(beatAt(now) / 3);   /* back from a hidden tab */
      while (timeAt(S.nextBar * 3) < now + .35) { scheduleBar(S.nextBar); S.nextBar++; }
      api.later(tick, 50);
    }
    tick();

    /* ---- scene state ---- */
    const N = HORSES.length, CX = 180;
    const rotAt = beat => beat * (Math.PI * 2 / 36);   /* one turn every 12 bars */
    const bobAt = (beat, i) => .5 + .5 * Math.sin(beat * Math.PI / 3 + (i % 2 ? Math.PI : 0) + i * .4);
    const stars = [...Array(40)].map(() => ({ x: Math.random() * CW, y: Math.random() * 150, p: Math.random() * 6 }));
    function horsePos(i, beat) {
      const a = rotAt(beat) + i * Math.PI * 2 / N, z = Math.sin(a);
      const x = CX + 122 * Math.cos(a), base = 292 + 16 * z, s = .78 + .3 * (z + 1) / 2;
      const y = base - 6 - 22 * bobAt(beat, i) * s;
      return { a, z, x, y, s, dir: z > 0 ? -1 : 1, poleTop: 128 + 20 * z, poleBot: 318 + 18 * z };
    }

    /* ---- backgrounds ---- */
    function drawSky(c, t, horizon) {
      const g = c.createLinearGradient(0, 0, 0, horizon);
      g.addColorStop(0, sky.top); g.addColorStop(.55, sky.mid); g.addColorStop(1, sky.low);
      c.fillStyle = g; c.fillRect(0, 0, CW, horizon + 2);
      stars.forEach(s => { const a = sky.stars * (.4 + .6 * Math.abs(Math.sin(t * 1.3 + s.p))); if (s.y < horizon - 30) { c.fillStyle = `rgba(255,255,240,${a * .9})`; c.fillRect(s.x, s.y, 1.6, 1.6); } });
    }
    function drawSea(c, t, y0, y1, off) {
      const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, sky.sea2); g.addColorStop(.25, sky.sea); g.addColorStop(1, '#141C3C');
      c.fillStyle = g; c.fillRect(0, y0, CW, y1 - y0);
      c.strokeStyle = 'rgba(255,220,170,.35)'; c.lineWidth = 1.4;
      for (let k = 0; k < 9; k++) {
        const y = y0 + 4 + k * (y1 - y0 - 6) / 9, w = 14 + k * 3;
        for (let x = ((k * 37 - off * (.4 + k * .05) + t * 6) % 70 + 70) % 70 - 70; x < CW; x += 70) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.stroke(); }
      }
    }
    function sunMoon(c, x, y) {
      if (sky.sun) { const g = c.createRadialGradient(x, y, 4, x, y, 60); g.addColorStop(0, 'rgba(255,240,190,1)'); g.addColorStop(.3, 'rgba(255,200,120,.9)'); g.addColorStop(1, 'rgba(255,160,90,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, 60, 0, Math.PI * 2); c.fill(); c.fillStyle = sky.sun; c.beginPath(); c.arc(x, y, 20, Math.PI, 0); c.fill(); }
      else { c.fillStyle = '#FFF6D8'; c.beginPath(); c.arc(x, y - 60, 15, 0, Math.PI * 2); c.fill(); c.fillStyle = sky.top; c.beginPath(); c.arc(x + 6, y - 64, 13, 0, Math.PI * 2); c.fill(); }
    }
    function pier(c, x, y, t) {
      c.fillStyle = '#1E1530'; c.fillRect(x, y - 10, 120, 7);
      for (let k = 0; k < 7; k++) c.fillRect(x + 6 + k * 18, y - 4, 3, 18);
      c.fillRect(x + 84, y - 30, 30, 20); c.beginPath(); c.moveTo(x + 80, y - 30); c.lineTo(x + 99, y - 44); c.lineTo(x + 118, y - 30); c.fill();
      for (let k = 0; k < 8; k++) glowDot(c, x + 4 + k * 15, y - 13, 1.4, 'rgba(255,214,120,A)', .55 + .45 * Math.sin(t * 2 + k));
    }
    function wheel(c, x, y, r, t) {
      c.strokeStyle = 'rgba(40,24,70,.95)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(x - r * .55, y + r + 16); c.lineTo(x, y); c.lineTo(x + r * .55, y + r + 16); c.stroke();
      c.lineWidth = 2; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
      const rot = t * .12;
      for (let k = 0; k < 12; k++) {
        const a = rot + k * Math.PI / 6, px = x + r * Math.cos(a), py = y + r * Math.sin(a);
        c.beginPath(); c.moveTo(x, y); c.lineTo(px, py); c.stroke();
        glowDot(c, px, py, 1.6, k % 2 ? 'rgba(255,120,150,A)' : 'rgba(120,220,255,A)', .5 + .5 * Math.sin(t * 3 + k));
      }
    }
    function stall(c, x, y, col) {
      c.fillStyle = '#2A1B3D'; c.fillRect(x, y - 26, 44, 26);
      for (let k = 0; k < 4; k++) { c.fillStyle = k % 2 ? '#FFF2DC' : col; c.beginPath(); c.moveTo(x - 4 + k * 13, y - 26); c.lineTo(x + 9 + k * 13, y - 26); c.lineTo(x + 9 + k * 13, y - 34); c.lineTo(x - 4 + k * 13, y - 34); c.fill(); }
      c.fillStyle = 'rgba(255,214,120,.65)'; c.fillRect(x + 6, y - 20, 32, 10);
    }
    function lamp(c, x, y, t, k) {
      c.fillStyle = '#1A1228'; c.fillRect(x - 2, y - 70, 4, 70); c.fillRect(x - 8, y - 72, 16, 4);
      glowDot(c, x, y - 78, 4, 'rgba(255,220,140,A)', .75 + .25 * Math.sin(t * 2 + k));
    }

    /* ---- the overview: the whole carousel ---- */
    function drawCanopy(c, t, rot) {
      const ry = 24, cy = 128, rx = 170, apexY = 50;
      /* cone */
      const NS = 16;
      for (let k = 0; k < NS; k++) {
        const a0 = rot + k * Math.PI * 2 / NS, a1 = a0 + Math.PI * 2 / NS, mid = (a0 + a1) / 2;
        if (Math.sin(mid) < -0.05) continue;
        c.fillStyle = k % 2 ? '#FFF3DE' : '#D93A3A';
        c.beginPath(); c.moveTo(CX, apexY); c.lineTo(CX + rx * Math.cos(a0), cy + ry * Math.sin(a0)); c.lineTo(CX + rx * Math.cos(a1), cy + ry * Math.sin(a1)); c.closePath(); c.fill();
      }
      const sh = c.createLinearGradient(CX - rx, 0, CX + rx, 0); sh.addColorStop(0, 'rgba(30,10,50,.35)'); sh.addColorStop(.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(30,10,50,.35)');
      c.fillStyle = sh; c.beginPath(); c.moveTo(CX, apexY); c.lineTo(CX - rx, cy); c.ellipse(CX, cy, rx, ry, 0, Math.PI, 0, true); c.closePath(); c.fill();
      /* finial and flag */
      c.fillStyle = '#FFD34D'; c.beginPath(); c.arc(CX, apexY - 4, 6, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#7A5A1E'; c.lineWidth = 2; c.beginPath(); c.moveTo(CX, apexY - 8); c.lineTo(CX, apexY - 34); c.stroke();
      c.fillStyle = '#3CC46B'; c.beginPath(); c.moveTo(CX, apexY - 34); c.quadraticCurveTo(CX + 12, apexY - 30 + 3 * Math.sin(t * 4), CX + 22, apexY - 30); c.lineTo(CX, apexY - 24); c.fill();
      /* rim band with gold trim */
      c.fillStyle = '#7B2A8E'; c.beginPath(); c.ellipse(CX, cy + 6, rx, ry, 0, 0, Math.PI); c.lineTo(CX - rx, cy - 2); c.ellipse(CX, cy - 2, rx, ry, 0, Math.PI, 0, true); c.closePath(); c.fill();
      c.strokeStyle = '#FFD34D'; c.lineWidth = 2.5; c.beginPath(); c.ellipse(CX, cy + 6, rx, ry, 0, 0, Math.PI); c.stroke();
      /* scalloped valance and twinkling bulbs, turning with the ride */
      const NB = 28;
      for (let k = 0; k < NB; k++) {
        const a = rot + k * Math.PI * 2 / NB, z = Math.sin(a); if (z < 0) continue;
        const a2 = a + Math.PI * 2 / NB, x0 = CX + rx * Math.cos(a), y0 = cy + 6 + ry * z, x1 = CX + rx * Math.cos(a2), y1 = cy + 6 + ry * Math.sin(a2);
        c.fillStyle = k % 2 ? '#2F7BE8' : '#FFC234';
        c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + 14, x1, y1); c.closePath(); c.fill();
        const tw = .45 + .55 * Math.abs(Math.sin(t * 2.2 + k * 1.7));
        glowDot(c, x0, cy + 1 + ry * z, 2, k % 3 ? 'rgba(255,214,110,A)' : 'rgba(255,150,170,A)', tw);
      }
    }
    function drawPlatform(c, rot) {
      const cy = 318, rx = 162, ry = 26;
      c.fillStyle = '#5C2A6E'; c.beginPath(); c.ellipse(CX, cy + 16, rx, ry, 0, 0, Math.PI); c.lineTo(CX - rx, cy); c.ellipse(CX, cy, rx, ry, 0, Math.PI, 0, true); c.closePath(); c.fill();
      for (let k = 0; k < 24; k++) { const a = rot + k * Math.PI / 12; if (Math.sin(a) < 0) continue; const x = CX + rx * Math.cos(a); glowDot(c, x, cy + 8 + ry * Math.sin(a), 1.3, 'rgba(255,214,110,A)', .5 + .5 * Math.sin(k + rot * 8)); }
      const g = c.createRadialGradient(CX, cy, 10, CX, cy, rx); g.addColorStop(0, '#C79A62'); g.addColorStop(1, '#8E6236');
      c.fillStyle = g; c.beginPath(); c.ellipse(CX, cy, rx, ry, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(90,50,20,.35)'; c.lineWidth = 1;
      for (let k = 0; k < 12; k++) { const a = rot + k * Math.PI / 6; c.beginPath(); c.moveTo(CX, cy); c.lineTo(CX + rx * Math.cos(a), cy + ry * Math.sin(a)); c.stroke(); }
    }
    function drawColumn(c, t, rot) {
      const top = 132, bot = 318, w = 34;
      const g = c.createLinearGradient(CX - w, 0, CX + w, 0); g.addColorStop(0, '#4A2160'); g.addColorStop(.5, '#B05AC4'); g.addColorStop(1, '#4A2160');
      c.fillStyle = g; c.fillRect(CX - w, top, w * 2, bot - top);
      /* mirrored panels sliding round */
      for (let k = 0; k < 8; k++) {
        const a = rot * 1 + k * Math.PI / 4, z = Math.sin(a); if (z < 0.1) continue;
        const x = CX + w * .8 * Math.cos(a), pw = 12 * z;
        const mg = c.createLinearGradient(0, 150, 0, 300); mg.addColorStop(0, 'rgba(220,240,255,.85)'); mg.addColorStop(1, 'rgba(150,180,230,.7)');
        c.fillStyle = mg; rr(c, x - pw / 2, 160, pw, 120, 4); c.fill();
        c.strokeStyle = '#FFD34D'; c.lineWidth = 1.5; c.stroke();
      }
      c.fillStyle = '#FFD34D'; c.fillRect(CX - w, top, w * 2, 6); c.fillRect(CX - w, bot - 10, w * 2, 6);
      for (let k = 0; k < 5; k++) glowDot(c, CX - w + 8 + k * 13, top + 14, 1.5, 'rgba(255,214,110,A)', .5 + .5 * Math.sin(t * 3 + k * 2));
    }
    function drawOverview(c, t, beat) {
      const rot = rotAt(beat), horizon = 196;
      drawSky(c, t, horizon); sunMoon(c, 96, horizon); drawSea(c, t, horizon, 250, 0);
      pier(c, -10, horizon + 6, t); wheel(c, 318, 118, 46, t);
      /* promenade */
      const pg = c.createLinearGradient(0, 250, 0, CH); pg.addColorStop(0, '#5A3A4E'); pg.addColorStop(1, '#2A1A2C');
      c.fillStyle = pg; c.fillRect(0, 250, CW, CH - 250);
      c.strokeStyle = 'rgba(255,255,255,.06)'; c.lineWidth = 1; for (let y = 262; y < CH; y += 14) { c.beginPath(); c.moveTo(0, y); c.lineTo(CW, y); c.stroke(); }
      stall(c, 6, 258, '#3CC46B'); stall(c, 310, 258, '#45AEFF');
      lamp(c, 26, 392, t, 1); lamp(c, 334, 392, t, 2);
      /* bunting */
      [[0, 30, 120, 60], [240, 60, 360, 28]].forEach(([x0, y0, x1, y1], j) => {
        c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + 16, x1, y1); c.stroke();
        for (let k = 0; k < 7; k++) { const u = (k + .5) / 7, x = lerp(x0, x1, u), y = lerp(y0, y1, u) + 16 * 2 * u * (1 - u) * 2; c.fillStyle = ['#FF6B4A', '#FFC234', '#3CC46B', '#45AEFF', '#F25A95'][(k + j) % 5]; c.beginPath(); c.moveTo(x - 5, y); c.lineTo(x + 5, y); c.lineTo(x, y + 10); c.fill(); }
      });
      drawPlatform(c, rot);
      const hs = HORSES.map((H, i) => Object.assign({ i, H }, horsePos(i, beat))).sort((a, b) => a.z - b.z);
      const drawOne = h => {
        const shade = clamp(.45 * (1 - (h.z + 1) / 2) - .02, 0, .45);
        brassPole(c, h.x, h.poleTop, h.poleBot, 4 * h.s, shade);
        drawHorse(c, h.x, h.y, h.s, h.dir, h.H, h.i === S.chosen, shade);
        if (h.i === S.chosen) { c.fillStyle = '#FFE07A'; c.font = `700 ${Math.round(20 * h.s)}px ${FONT}`; c.textAlign = 'center'; c.fillText('★', h.x, h.y - 50 * h.s); }
      };
      hs.filter(h => h.z < 0).forEach(drawOne);
      drawColumn(c, t, rot);
      hs.filter(h => h.z >= 0).forEach(drawOne);
      drawCanopy(c, t, rot);
      S.lastHs = hs;
    }

    /* ---- the ride: you're on the horse and the fair goes by ---- */
    const PAN = 1500;
    function drawRide(c, t, beat) {
      const H = HORSES[S.chosen], i = S.chosen;
      const bob = bobAt(beat, i), off = rotAt(beat) * 240;   /* how far the world has slid by */
      const view = (bob - .5) * 10;                           /* the gentle bob of the view */
      const horizon = 190;
      c.save(); c.translate(0, view);
      drawSky(c, t, horizon + 12);
      const wrapX = (x, sp) => ((x - off * sp) % PAN + PAN) % PAN - 120;
      { const x = wrapX(260, .25); sunMoon(c, x, horizon); if (x > PAN - 400) sunMoon(c, x - PAN, horizon); }
      drawSea(c, t, horizon, 252, off * .4);
      const far = [['pier', 120], ['wheel', 560], ['pier', 980], ['wheel', 1320]];
      far.forEach(([k, x0]) => { const x = wrapX(x0, .5); [x, x - PAN].forEach(xx => { if (xx < -160 || xx > CW + 60) return; if (k === 'pier') pier(c, xx, horizon + 8, t); else wheel(c, xx, 130, 52, t); }); });
      const pg = c.createLinearGradient(0, 250, 0, CH); pg.addColorStop(0, '#5A3A4E'); pg.addColorStop(1, '#2A1A2C');
      c.fillStyle = pg; c.fillRect(0, 250, CW, CH);
      const mid = [['#3CC46B', 80], ['#FF6B4A', 380], ['#45AEFF', 700], ['#F25A95', 1000], ['#FFC234', 1260]];
      mid.forEach(([col, x0]) => { const x = wrapX(x0, 1); [x, x - PAN].forEach(xx => { if (xx > -60 && xx < CW + 20) stall(c, xx, 284, col); }); });
      for (let k = 0; k < 7; k++) { const x = wrapX(k * 215, 1.6); [x, x - PAN].forEach(xx => { if (xx > -30 && xx < CW + 30) lamp(c, xx, 340, t, k); }); }
      c.restore();
      /* the carousel around you: the canopy above, the platform below, neighbours on either side */
      c.fillStyle = '#5C2A6E'; c.fillRect(0, 352, CW, CH - 352);
      const fg = c.createLinearGradient(0, 352, 0, CH); fg.addColorStop(0, '#C79A62'); fg.addColorStop(1, '#7E5530');
      c.fillStyle = fg; c.beginPath(); c.moveTo(0, 360); c.lineTo(CW, 360); c.lineTo(CW, CH); c.lineTo(0, CH); c.fill();
      c.strokeStyle = 'rgba(90,50,20,.35)'; for (let k = -6; k <= 6; k++) { c.beginPath(); c.moveTo(CX + k * 30, 360); c.lineTo(CX + k * 70, CH); c.stroke(); }
      [[-1, 22], [1, 338]].forEach(([side, x]) => {
        const j = (i + (side > 0 ? 1 : N - 1)) % N, b2 = bobAt(beat, j);
        brassPole(c, x, 0, 360, 9, .35);
        drawHorse(c, x + side * 18, 262 - 30 * b2, 1.9, 1, HORSES[j], false, .38);
      });
      /* canopy underside */
      const cg = c.createLinearGradient(0, 0, 0, 56); cg.addColorStop(0, '#5A1430'); cg.addColorStop(1, '#8E2A4A');
      c.fillStyle = cg; c.fillRect(0, 0, CW, 50);
      for (let k = 0; k < 9; k++) { c.fillStyle = k % 2 ? 'rgba(255,240,220,.18)' : 'rgba(0,0,0,.12)'; c.beginPath(); c.moveTo(CX, -120); c.lineTo(k * 45 - 20, 50); c.lineTo(k * 45 + 25, 50); c.closePath(); c.fill(); }
      c.fillStyle = '#FFD34D'; c.fillRect(0, 46, CW, 5);
      for (let k = 0; k < 13; k++) {
        const x = k * 30; c.fillStyle = k % 2 ? '#2F7BE8' : '#D93A3A';
        c.beginPath(); c.moveTo(x, 50); c.quadraticCurveTo(x + 15, 70, x + 30, 50); c.closePath(); c.fill();
        glowDot(c, x + 15, 56, 2.4, k % 3 ? 'rgba(255,214,110,A)' : 'rgba(255,150,170,A)', .45 + .55 * Math.abs(Math.sin(t * 2.2 + k * 1.7)));
      }
      /* your horse */
      const y = 248 - 26 * bob, wig = (t - S.tapT) < .6 ? Math.sin((t - S.tapT) * 30) * 2 * (1 - (t - S.tapT) / .6) : 0;
      brassPole(c, CX + 6, 0, 360, 10, 0);
      drawHorse(c, CX + 6 + wig, y, 2.35, 1, H, true, 0);
      brassPole(c, CX + 6, y - 40, y - 26, 10, 0);
      /* a little name plaque */
      c.font = `700 20px ${FONT}`; c.textAlign = 'center';
      const tw = c.measureText(H.name).width + 26;
      c.fillStyle = 'rgba(40,20,60,.75)'; rr(c, CX - tw / 2, CH - 34, tw, 28, 14); c.fill();
      c.fillStyle = '#FFE07A'; c.fillText(H.name, CX, CH - 13);
    }
    function drawSparkles(c, t) {
      S.sparkle = S.sparkle.filter(p => t - p.t0 < 1);
      S.sparkle.forEach(p => { const u = (t - p.t0); c.fillStyle = `rgba(255,236,150,${1 - u})`; c.font = `700 ${16 + 10 * u}px ${FONT}`; c.textAlign = 'center'; c.fillText('✦', p.x + p.vx * u * 40, p.y - u * 50); });
    }

    /* ---- taps ---- */
    cv.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (finished) return;
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * CW, y = (e.clientY - r.top) / r.height * CH;
      const t = performance.now() / 1000;
      if (S.mode === 'pick') {
        const hs = (S.lastHs || []).slice().reverse();   /* front first */
        let best = null, bd = 1e9;
        hs.forEach(h => { const d = Math.hypot(x - (h.x + 8 * h.dir * h.s), y - (h.y - 8 * h.s)) - 18 * (h.z + 1); if (d < bd) { bd = d; best = h; } });
        if (!best || bd > 70) { api.hint('Tap one of the painted horses to ride it.'); return; }
        S.chosen = best.i; S.mode = 'trans'; S.trans = t; S.tx = best.x; S.ty = best.y;
        sfx.good(); bell(S.layer, clock() + .01, 84, 1); bell(S.layer, clock() + .14, 88, 1);
        api.hint(`Up you get on ${HORSES[best.i].name}! Hold on to the brass pole and enjoy the ride.`);
        change.hidden = false;
      } else {
        S.tapT = t; S.sparkle.push({ x, y, vx: Math.random() - .5, t0: t });
        bell(S.layer, clock() + .01, pick([79, 84, 88, 91]), .9);
        if (Math.random() < .35) api.hint(pick(['What a lovely evening for a ride.', 'Listen to the band organ play!', 'Wave to the people by the pier.', 'Up and down, round and round.']));
      }
    });

    function frame() {
      if (!api.stage.isConnected) return;
      const t = performance.now() / 1000, beat = beatAt(clock());
      ctx.setTransform(K, 0, 0, K, 0, 0);
      if (S.mode === 'pick') drawOverview(ctx, t, beat);
      else if (S.mode === 'trans') {
        const u = clamp((t - S.trans) / 1.3, 0, 1), e = u * u * (3 - 2 * u);
        ctx.save(); ctx.translate(S.tx, S.ty); ctx.scale(1 + e * 1.6, 1 + e * 1.6); ctx.translate(-S.tx, -S.ty); drawOverview(ctx, t, beat); ctx.restore();
        ctx.globalAlpha = e; drawRide(ctx, t, beat); ctx.globalAlpha = 1;
        if (u >= 1) S.mode = 'ride';
      } else drawRide(ctx, t, beat);
      drawSparkles(ctx, t);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  register({ id: 'carousel', cat: 'fair', order: 9, name: 'Carousel Ride', icon: '🎠', desc: 'Ride a painted horse round and round', gentle: true, start: startCarousel });
})();
