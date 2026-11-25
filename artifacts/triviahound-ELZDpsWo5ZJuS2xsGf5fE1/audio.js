/* audio.js — advanced synthesized sound for TriviaHound (made by Builder).
 *
 * Pure Web Audio: no samples, no files, no libraries. Works offline. All music is original.
 *
 *   Sound.settings            persisted in localStorage 'tictrivia.sound.v1'
 *                             { musicOn, music, thinkOn, think, sfxOn, sfx }
 *   Sound.unlock()            create/resume the AudioContext (call from the first user gesture)
 *   Sound.scene(name)         'bg' | 'think' | 'none'   (smooth crossfades)
 *   Sound.set(key, value)     update a setting, save it, apply live
 *   Sound.sfx(name)           'roll' 'step' 'click' 'correct' 'wrong' 'token' 'rollagain' 'win'
 *
 * Inside: music / think / sfx buses -> master compressor -> speakers, a generated reverb and a
 * tempo-synced delay, sidechain-style ducking (kick and sound effects dip the music), and a
 * 25 ms lookahead scheduler. bg rotates three themes (each 16 bars, A/B variations).
 * think builds tension over ~30 s: the clock ticks faster, the bass pulse doubles,
 * strings rise and the timpani arrive. Never throws if Web Audio is unavailable.
 */
(function () {
  "use strict";

  var KEY = "tictrivia.sound.v1";
  var DEFAULTS = { musicOn: true, music: 0.35, thinkOn: true, think: 0.5, sfxOn: true, sfx: 0.7 };
  var settings = {};
  (function load() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { saved = null; }
    for (var k in DEFAULTS) settings[k] = saved && typeof saved[k] === typeof DEFAULTS[k] ? saved[k] : DEFAULTS[k];
  })();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* private mode */ } }

  var ctx = null, master = null, buses = {}, reverb = null, revSend = null, delay = null, delaySend = null, noiseBuf = null;
  var current = "none", timer = null, tracks = {};
  var LOOKAHEAD = 0.15, TICK = 25;

  // ------------------------------------------------------------------ setup
  function unlock() {
    try {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        build(new AC());
      }
      if (ctx.state === "suspended" && ctx.resume) { var p = ctx.resume(); if (p && p.catch) p.catch(function () {}); }
      if (!timer) timer = setInterval(tick, TICK);
      applyScene(true);
    } catch (e) { /* no audio on this device: stay silent */ }
    return ctx;
  }
  function build(c) {
    ctx = c;
    master = ctx.createDynamicsCompressor();
    master.threshold.value = -14; master.knee.value = 8; master.ratio.value = 4; master.attack.value = 0.004; master.release.value = 0.2;
    var out = ctx.createGain(); out.gain.value = 0.9; master.connect(out).connect(ctx.destination);
    ["music", "think", "sfx"].forEach(function (k) {
      var g = ctx.createGain(); g.gain.value = 0;
      var duck = ctx.createGain(); duck.gain.value = 1;           // sidechain-style dips land here
      g.connect(duck).connect(master);
      buses[k] = { gain: g, duck: duck };
    });
    // reverb: generated stereo impulse
    var len = Math.floor(ctx.sampleRate * 2.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) { var d = ir.getChannelData(ch); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3) * (i < 60 ? i / 60 : 1); }
    reverb = ctx.createConvolver(); reverb.buffer = ir;
    revSend = ctx.createGain(); revSend.gain.value = 0.3; revSend.connect(reverb).connect(master);
    // light delay (tempo-ish 3/16 at 116 bpm), filtered feedback
    delay = ctx.createDelay(1.5); delay.delayTime.value = 0.39;
    var fb = ctx.createGain(); fb.gain.value = 0.28; var dlp = ctx.createBiquadFilter(); dlp.type = "lowpass"; dlp.frequency.value = 2600;
    delaySend = ctx.createGain(); delaySend.gain.value = 0.18;
    delaySend.connect(delay); delay.connect(dlp).connect(fb).connect(delay); dlp.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var nd = noiseBuf.getChannelData(0); for (i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    applyVolumes(0);
  }

  // ------------------------------------------------------------------ volumes and scenes
  var MUSIC_SCALE = 0.55, THINK_SCALE = 0.55, SFX_SCALE = 0.9;
  function busTarget(k) {
    if (k === "sfx") return settings.sfxOn ? settings.sfx * SFX_SCALE : 0;
    if (k === "music") return current === "bg" && settings.musicOn ? settings.music * MUSIC_SCALE : 0;
    if (k === "think") return current === "think" && settings.thinkOn ? settings.think * THINK_SCALE : 0;
    return 0;
  }
  function ramp(param, v, secs) {
    var t = ctx.currentTime;
    param.cancelScheduledValues(t); param.setValueAtTime(param.value, t);
    param.linearRampToValueAtTime(v, t + Math.max(0.01, secs));
  }
  function applyVolumes(fade) {
    if (!ctx) return;
    ["music", "think", "sfx"].forEach(function (k) { ramp(buses[k].gain.gain, busTarget(k), fade == null ? 0.08 : fade); });
  }
  // What actually plays for the requested scene (think falls back to bg when the think music is off).
  function resolved(name) {
    if (name === "think" && !settings.thinkOn) return settings.musicOn ? "bg" : "none";
    if (name === "bg" && !settings.musicOn) return "none";
    return name;
  }
  var requested = "none";
  function scene(name) {
    requested = name === "bg" || name === "think" ? name : "none";
    if (!ctx) return;
    applyScene(false);
  }
  function applyScene(instant) {
    if (!ctx) return;
    var want = resolved(requested);
    var prev = current;
    current = want;
    if (want !== "none") {
      var tr = tracks[want === "bg" ? "music" : "think"];
      if (!tr.running || prev !== want) tr.start(ctx.currentTime + 0.05, prev !== want);
    }
    // a think track that's been replaced, or bg while thinking, fades out and then stops scheduling
    ["music", "think"].forEach(function (k) {
      var tr = tracks[k], active = (want === "bg" && k === "music") || (want === "think" && k === "think");
      if (!active && tr.running) tr.stopAt(ctx.currentTime + (instant ? 0.05 : 1.3));
    });
    applyVolumes(instant ? 0.05 : 1.2);
  }
  function set(key, value) {
    if (!(key in DEFAULTS)) return;
    settings[key] = typeof DEFAULTS[key] === "boolean" ? !!value : Math.max(0, Math.min(1, +value || 0));
    save();
    if (!ctx) return;
    if (key === "musicOn" || key === "thinkOn") applyScene(false); else applyVolumes(0.08);
  }

  // ------------------------------------------------------------------ voices (every node stops and disconnects itself)
  function clean(src, nodes) { src.onended = function () { nodes.forEach(function (n) { try { n.disconnect(); } catch (e) { /* gone */ } }); }; }
  function env(t, a, peak, hold, rel) {
    var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    if (hold > 0) g.gain.setValueAtTime(Math.max(peak, 0.0002), t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
    return g;
  }
  function voice(type, freq, t, dur, a, peak, rel, dest, opts) {
    opts = opts || {};
    var o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + (opts.glide || dur));
    if (opts.detune) o.detune.value = opts.detune;
    var g = env(t, a, peak, Math.max(0, dur - a), rel), nodes = [o, g], last = g;
    o.connect(g);
    if (opts.filter) { var f = ctx.createBiquadFilter(); f.type = opts.filter[0]; f.frequency.setValueAtTime(opts.filter[1], t); f.Q.value = opts.filter[2] || 0.7;
      if (opts.filter[3]) f.frequency.exponentialRampToValueAtTime(opts.filter[3], t + dur); g.connect(f); last = f; nodes.push(f); }
    last.connect(dest);
    if (opts.wet) { var w = ctx.createGain(); w.gain.value = opts.wet; last.connect(w).connect(revSend); nodes.push(w); }
    if (opts.echo) { var e = ctx.createGain(); e.gain.value = opts.echo; last.connect(e).connect(delaySend); nodes.push(e); }
    o.start(t); o.stop(t + dur + rel + 0.05); clean(o, nodes);
    return o;
  }
  function fm(freq, t, dur, peak, dest, ratio, index, wet) {     // simple FM bell / marimba
    var car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain();
    car.frequency.value = freq; mod.frequency.value = freq * (ratio || 3.5);
    mg.gain.setValueAtTime(freq * (index || 3), t); mg.gain.exponentialRampToValueAtTime(freq * 0.05, t + dur);
    mod.connect(mg).connect(car.frequency);
    var g = env(t, 0.003, peak, 0, dur), nodes = [car, mod, mg, g];
    car.connect(g).connect(dest);
    if (wet) { var w = ctx.createGain(); w.gain.value = wet; g.connect(w).connect(revSend); nodes.push(w); }
    car.start(t); mod.start(t); car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05); clean(car, nodes);
  }
  function noise(t, dur, peak, dest, filter, a, wet) {
    var s = ctx.createBufferSource(); s.buffer = noiseBuf;
    var f = ctx.createBiquadFilter(); f.type = filter[0]; f.frequency.setValueAtTime(filter[1], t); f.Q.value = filter[2] || 0.7;
    if (filter[3]) f.frequency.exponentialRampToValueAtTime(filter[3], t + dur);
    var g = env(t, a || 0.001, peak, 0, dur), nodes = [s, f, g];
    s.connect(f).connect(g).connect(dest);
    if (wet) { var w = ctx.createGain(); w.gain.value = wet; g.connect(w).connect(revSend); nodes.push(w); }
    s.start(t, Math.random() * 0.5); s.stop(t + dur + (a || 0.001) + 0.05); clean(s, nodes);
  }
  function duck(bus, t, depth, secs) {
    var p = buses[bus].duck.gain;
    p.cancelScheduledValues(t); p.setValueAtTime(1 - depth, t); p.linearRampToValueAtTime(1, t + secs);
  }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // drums
  function kick(t, v, dest, bus) { voice("sine", 140, t, 0.02, 0.002, 0.8 * v, 0.2, dest, { to: 48, glide: 0.11 }); if (bus) duck(bus, t, 0.18, 0.25); }
  function snare(t, v, dest) { noise(t, 0.14, 0.32 * v, dest, ["bandpass", 2400, 0.8]); voice("triangle", 190, t, 0.01, 0.001, 0.2 * v, 0.08, dest); }
  function brush(t, v, dest) { noise(t, 0.16, 0.12 * v, dest, ["bandpass", 3800, 0.6], 0.012); }
  function hat(t, v, dest, open) { noise(t, open ? 0.2 : 0.035, 0.1 * v, dest, ["highpass", 8000, 0.7]); }
  function block(t, f, v, dest) { voice("sine", f, t, 0.005, 0.001, 0.35 * v, 0.05, dest, { filter: ["bandpass", f, 6] }); voice("square", f * 2.01, t, 0.003, 0.001, 0.05 * v, 0.02, dest); }

  // ------------------------------------------------------------------ harmony helpers
  var Q = { maj: [0, 4, 7], min: [0, 3, 7], dom7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], six: [0, 4, 7, 9], add9: [0, 4, 7, 14] };
  function chord(r, q) { return Q[q].map(function (i) { return r + i; }); }
  function ct(ch, i, oct) { var n = ch.length; return ch[((i % n) + n) % n] + 12 * (Math.floor(i / n) + (oct || 0)); }

  // ------------------------------------------------------------------ track engine
  // A track asks its pattern for notes one 16th step at a time; the scheduler keeps ~150 ms ahead.
  function makeTrack(bus, pattern) {
    var tr = { running: false, stopAtTime: Infinity, step: 0, bar: 0, barStart: 0, t0: 0, state: {} };
    tr.start = function (at, fresh) {
      tr.running = true; tr.stopAtTime = Infinity;
      if (fresh || !tr.started) { tr.step = 0; tr.bar = 0; tr.barStart = at; tr.t0 = at; tr.lastT = at; tr.state = {}; if (pattern.reset) pattern.reset(tr.state); }
      tr.started = true;
    };
    tr.stopAt = function (t) { tr.stopAtTime = Math.min(tr.stopAtTime, t); };
    tr.stepTime = function (s) {
      var spb = 60 / pattern.bpm(tr), beat = Math.floor(s / 4), sub = s % 4, sw = pattern.swing || 0.5, bt = tr.barStart + beat * spb;
      return sub === 0 ? bt : sub === 2 ? bt + sw * spb : sub === 1 ? bt + sw * spb / 2 : bt + sw * spb + (1 - sw) * spb / 2;
    };
    tr.fill = function (until) {
      if (!tr.running) return;
      var guard = 0;
      while (guard++ < 64) {
        var t = tr.stepTime(tr.step);
        if (t > until) break;
        if (t >= tr.stopAtTime) { tr.running = false; break; }
        if (t < ctx.currentTime - 0.05) {                        // fell far behind (hidden tab): skip ahead cleanly
          var barLen = 4 * 60 / pattern.bpm(tr), skip = Math.ceil((ctx.currentTime - tr.barStart) / barLen);
          tr.barStart += skip * barLen; tr.bar += skip; tr.step = 0; continue;
        }
        tr.lastT = t;
        pattern.step(tr, tr.step, tr.bar, t, 60 / pattern.bpm(tr), buses[bus].gain);
        tr.step++;
        if (tr.step >= 16) { tr.step = 0; tr.bar++; tr.barStart += 4 * 60 / pattern.bpm(tr); }
      }
    };
    return tr;
  }

  // ------------------------------------------------------------------ bg: three original themes, 16 bars each
  var THEMES = [
    { name: "Sunny Square", bpm: 116, swing: 0.6, key: 60, lead: "bell",
      prog: [[60, "maj"], [57, "min7"], [62, "min7"], [55, "dom7"], [53, "maj7"], [55, "dom7"], [52, "min7"], [57, "min7"]],
      motifs: [[[0, 2, 2], [2, 3, 2], [4, 4, 4], [10, 3, 2], [12, 2, 4]], [[0, 4, 3], [4, 3, 1], [6, 2, 2], [8, 1, 6]], [[2, 2, 2], [4, 4, 2], [6, 5, 4], [12, 4, 4]]] },
    { name: "Board Walk", bpm: 108, swing: 0.5, key: 65, lead: "marimba",
      prog: [[65, "add9"], [60, "maj"], [62, "min"], [58, "maj"], [65, "maj"], [57, "min"], [58, "six"], [60, "dom7"]],
      motifs: [[[0, 0, 1], [2, 2, 1], [4, 4, 2], [6, 2, 1], [8, 5, 2], [12, 4, 4]], [[0, 4, 2], [3, 3, 1], [4, 2, 2], [6, 1, 2], [8, 2, 8]]] },
    { name: "Breezy Bonus", bpm: 124, swing: 0.58, key: 67, lead: "whistle",
      prog: [[67, "maj"], [64, "min"], [60, "maj"], [62, "dom7"], [67, "maj"], [59, "min"], [60, "six"], [62, "dom7"]],
      motifs: [[[0, 4, 6], [6, 3, 2], [8, 2, 4], [12, 3, 4]], [[0, 2, 1], [1, 3, 1], [2, 4, 2], [4, 5, 4], [10, 4, 2], [12, 3, 4]]] }
  ];
  var bgPattern = {
    swing: 0.58,
    reset: function (st) { st.theme = Math.floor(Math.random() * THEMES.length); st.last = null; },
    bpm: function (tr) { return THEMES[tr.state.theme || 0].bpm; },
    step: function (tr, s, bar, t, spb, dest) {
      var st = tr.state;
      if (s === 0 && bar > 0 && bar % 16 === 0) st.theme = (st.theme + 1) % THEMES.length;   // rotate themes
      var th = THEMES[st.theme], local = bar % 16, section = local < 8 ? 0 : 1;
      bgPattern.swing = th.swing;
      var c = th.prog[local % th.prog.length], ch = chord(c[0], c[1]);
      // drums: light pop shuffle
      if (s === 0 || s === 8 || (s === 10 && section)) kick(t, 0.6, dest, "music");
      if (s === 4 || s === 12) (section ? snare : brush)(t, 0.7, dest);
      if (s % 2 === 0) hat(t, s % 4 === 2 ? 0.7 : 0.45, dest);
      if (local === 15 && s >= 12) snare(t + spb / 8, 0.35, dest);                       // fill into the next section
      // bass: root/fifth bounce with passing notes (triangle + filtered saw so laptops hear it)
      if (s % 4 === 0) {
        var bn = ct(ch, [0, 2, 1, 2][s / 4], -2);
        voice("triangle", mtof(bn), t, spb * 0.55, 0.005, 0.32, 0.1, dest);
        voice("sawtooth", mtof(bn), t, spb * 0.4, 0.005, 0.06, 0.08, dest, { filter: ["lowpass", 700] });
      }
      // chords: soft filtered pad on the bar, plucky offbeat comps
      if (s === 0) ch.forEach(function (n) { voice("sawtooth", mtof(n), t, spb * 3.6, 0.2, 0.025, 0.5, dest, { detune: 6, filter: ["lowpass", 1300], wet: 0.4 }); });
      if (s === 6 || s === 14) ch.forEach(function (n) { voice("triangle", mtof(n + 12), t, 0.06, 0.003, 0.05, 0.12, dest, { wet: 0.2 }); });
      // lead: motif over chord tones, varied by section
      var motif = th.motifs[(Math.floor(local / 2) + section) % th.motifs.length];
      if (section && local % 4 === 3) return;                                              // breathing room
      for (var i = 0; i < motif.length; i++) if (motif[i][0] === s) {
        var m = ct(ch, motif[i][1] + (section ? 1 : 0) + (Math.random() < 0.1 ? 1 : 0), 1), dur = motif[i][2] * spb / 4;
        if (th.lead === "bell") fm(mtof(m), t, Math.max(0.35, dur * 1.5), 0.16, dest, 3.5, 2.5, 0.35);
        else if (th.lead === "marimba") fm(mtof(m), t, Math.max(0.3, dur), 0.2, dest, 4.0, 1.4, 0.25);
        else voice("sine", mtof(m + 12), t, dur * 0.9, 0.04, 0.09, 0.12, dest, { wet: 0.3, echo: 0.6 });   // whistle
        st.last = m;
      }
    }
  };

  // ------------------------------------------------------------------ think: original suspense cue, builds over ~30 s
  var thinkPattern = {
    swing: 0.5,
    reset: function (st) { st.var = 0; },
    bpm: function (tr) { return 112 + 16 * tension(tr); },
    step: function (tr, s, bar, t, spb, dest) {
      var k = tension(tr), st = tr.state;
      var prog = [[57, "min"], [57, "min"], [53, "maj"], [52, "dom7"]];               // Am Am F E7 (minor, with a pull)
      var c = prog[bar % 4], ch = chord(c[0], c[1]);
      // the clock: tick-tock on beats, then 8ths, then 16ths as tension grows; pitch creeps upward
      var lift = Math.round(k * 5), every = k < 0.33 ? 4 : k < 0.66 ? 2 : 1;
      if (s % every === 0) block(t, (s % 8 < 4 ? 1500 : 1150) * Math.pow(2, lift / 12), 0.55 + 0.35 * k, dest);
      // heartbeat / bass pulse: quarters, then 8ths
      var pulse = k < 0.5 ? 4 : 2;
      if (s % pulse === 0) {
        var bn = ct(ch, s % 8 === 0 ? 0 : 2, -2);
        voice("sine", mtof(bn), t, spb * 0.3, 0.004, 0.36, 0.08, dest);
        voice("square", mtof(bn), t, spb * 0.2, 0.004, 0.045, 0.06, dest, { filter: ["lowpass", 600] });
      }
      // pizzicato motif (original): a questioning figure that rises a step every 4 bars
      var piz = [[0, 0], [3, 2], [6, 1], [10, 3]], rise = Math.floor(bar / 4) % 3;
      for (var i = 0; i < piz.length; i++) if (piz[i][0] === s && (bar % 2 === 0 || k > 0.4))
        fm(mtof(ct(ch, piz[i][1] + rise, 1)), t, 0.22, 0.12 + 0.06 * k, dest, 2.0, 1.2, 0.2);
      // strings: a pad whose filter opens as the clock runs
      if (s === 0) ch.forEach(function (n) {
        voice("sawtooth", mtof(n), t, spb * 3.8, 0.4, 0.012 + 0.02 * k, 0.4, dest, { detune: (n % 2 ? 7 : -7), filter: ["lowpass", 600 + 2200 * k, 0.9], wet: 0.5 });
      });
      // later: timpani at bar starts and a shaker that thickens
      if (k > 0.45 && s === 0) voice("sine", mtof(ch[0] - 24), t, 0.05, 0.003, 0.45 * k, 0.45, dest, { to: mtof(ch[0] - 25), glide: 0.4 });
      if (k > 0.25 && s % 2 === 1) hat(t, 0.25 + 0.4 * k, dest);
      if (k > 0.8 && bar % 4 === 3 && s >= 8) snare(t, 0.25 + 0.2 * (s - 8) / 8, dest);   // roll into each new cycle
    }
  };
  // 0..1 over the first 30 s of a question, measured at the time each note is scheduled to play
  function tension(tr) { return Math.min(1, Math.max(0, ((tr.lastT || tr.t0) - tr.t0) / 30)); }

  tracks.music = makeTrack("music", bgPattern);
  tracks.think = makeTrack("think", thinkPattern);

  function tick() {
    if (!ctx) return;
    var until = ctx.currentTime + LOOKAHEAD;
    tracks.music.fill(until); tracks.think.fill(until);
  }

  // ------------------------------------------------------------------ sound effects
  var SFX = {
    roll: function (t, d) {                    // dice rattling in a cup, then tumbling
      for (var i = 0; i < 14; i++) {
        var at = t + Math.pow(Math.random(), 0.8) * 0.5;
        noise(at, 0.02 + Math.random() * 0.02, 0.36 + Math.random() * 0.3, d, ["bandpass", 1800 + Math.random() * 3200, 4]);
        if (Math.random() < 0.4) block(at, 600 + Math.random() * 500, 0.7, d);
      }
      noise(t, 0.5, 0.05, d, ["bandpass", 900, 0.8], 0.05);
    },
    step: function (t, d) {                    // a game piece hopping one space
      var f = 520 + Math.random() * 120;
      voice("sine", f, t, 0.02, 0.002, 0.5, 0.07, d, { to: f * 1.5, glide: 0.04 });
      block(t + 0.002, f * 2, 0.55, d);
    },
    click: function (t, d) {                   // the die lands
      voice("sine", 160, t, 0.01, 0.001, 0.7, 0.08, d, { to: 70, glide: 0.06 });
      noise(t, 0.04, 0.6, d, ["bandpass", 2600, 2]);
      block(t + 0.07, 900, 0.55, d);
    },
    correct: function (t, d) {                 // bright rising arpeggio + shimmer
      [72, 76, 79, 84].forEach(function (m, i) { fm(mtof(m), t + i * 0.07, 0.6, 0.2, d, 3.5, 2, 0.35); });
      noise(t + 0.2, 0.6, 0.05, d, ["highpass", 7000, 0.7], 0.15, 0.4);
    },
    wrong: function (t, d) {                   // two falling buzzy notes, a little comic
      [[311, 262], [262, 196]].forEach(function (p, i) {
        voice("sawtooth", p[0], t + i * 0.22, 0.18, 0.01, 0.16, 0.12, d, { to: p[1], glide: 0.2, filter: ["lowpass", 1200, 2] });
        voice("square", p[0] / 2, t + i * 0.22, 0.18, 0.01, 0.05, 0.12, d, { to: p[1] / 2, glide: 0.2, filter: ["lowpass", 700] });
      });
    },
    token: function (t, d) {                   // earned a category cube: short brass fanfare
      var notes = [[67, 0, 0.12], [72, 0.12, 0.12], [76, 0.24, 0.12], [79, 0.36, 0.5]];
      notes.forEach(function (n) { brass([n[0], n[0] - 12], t + n[1], n[2], 0.16, d); });
      fm(mtof(91), t + 0.36, 1.1, 0.08, d, 3.5, 2.2, 0.5);
      noise(t + 0.3, 0.8, 0.06, d, ["highpass", 6000, 0.7], 0.25, 0.5);       // cymbal swell
    },
    rollagain: function (t, d) {               // quick upward whoosh + two happy blips
      noise(t, 0.35, 0.3, d, ["bandpass", 500, 1.5, 4000], 0.08);
      voice("square", 784, t + 0.25, 0.05, 0.003, 0.2, 0.05, d, { filter: ["lowpass", 3000] });
      voice("square", 1047, t + 0.33, 0.07, 0.003, 0.2, 0.08, d, { filter: ["lowpass", 3000] });
    },
    win: function (t, d) {                     // big original winner fanfare, ~3 s
      var plan = [[[60, 64, 67], 0, 0.25], [[60, 64, 67], 0.3, 0.12], [[65, 69, 72], 0.45, 0.35], [[67, 71, 74], 0.85, 0.35], [[72, 76, 79, 84], 1.25, 1.4]];
      plan.forEach(function (p) { brass(p[0], t + p[1], p[2], 0.13, d); });
      for (var i = 0; i < 10; i++) voice("sine", mtof(48), t + 0.9 + i * 0.035, 0.01, 0.002, 0.12 + i * 0.02, 0.08, d);   // timpani roll
      voice("sine", mtof(36), t + 1.25, 0.05, 0.003, 0.55, 1.2, d, { to: mtof(35), glide: 1 });
      [84, 88, 91, 96, 100].forEach(function (m, i) { fm(mtof(m), t + 1.3 + i * 0.08, 0.9, 0.09, d, 3.5, 2.5, 0.5); });
      noise(t + 1.2, 1.6, 0.09, d, ["highpass", 5500, 0.7], 0.02, 0.6);
    }
  };
  function brass(notes, t, dur, peak, d) {
    notes.forEach(function (m) {
      voice("sawtooth", mtof(m), t, dur, 0.02, peak, 0.18, d, { detune: -6, filter: ["lowpass", 900, 1.5, 2600], wet: 0.3 });
      voice("sawtooth", mtof(m), t, dur, 0.02, peak * 0.7, 0.18, d, { detune: 7, filter: ["lowpass", 1100, 1.2] });
    });
  }
  function sfx(name) {
    try {
      if (!ctx || !SFX[name] || !settings.sfxOn) return;
      var t = ctx.currentTime + 0.01;
      SFX[name](t, buses.sfx.gain);
      if (name === "win" || name === "token" || name === "correct" || name === "wrong") {   // let the moment through
        duck("music", t, name === "win" ? 0.7 : 0.45, name === "win" ? 3.2 : 1.2);
        duck("think", t, 0.5, 1.0);
      }
    } catch (e) { /* never break the game for a sound */ }
  }

  window.Sound = {
    settings: settings,
    unlock: unlock,
    scene: function (name) { try { scene(name); } catch (e) { /* silent */ } },
    set: function (k, v) { try { set(k, v); } catch (e) { /* silent */ } },
    sfx: sfx,
    // for tests: render into an OfflineAudioContext you provide
    _attach: function (c) { if (!ctx) build(c); return ctx; },
    _fill: function (until) { tracks.music.fill(until); tracks.think.fill(until); },
    _state: function () { return { scene: current, requested: requested, bg: tracks.music.running, think: tracks.think.running, theme: tracks.music.state.theme }; }
  };
})();
