/*  builder-music.js — procedural background music for "Chip Away" (Web Audio only; no files, no fetches).
 *
 *    BuilderMusic.init();                     // reuses BuilderSFX.context() when present
 *    BuilderMusic.play('galactic50s');        // see BuilderMusic.styles for ids and labels
 *    BuilderMusic.setVolume(0.7); BuilderMusic.mute(false); BuilderMusic.setIntensity(0.8);
 *    BuilderMusic.stop(1.5);  BuilderMusic.current();   // -> style id or null
 *
 *  Routing: music -> its own gain -> gentle compressor -> ctx.destination (separate from the sound
 *  effects, so muting one never mutes the other). Default level sits about 12 dB under the lasers.
 *  A 16-step lookahead scheduler (setInterval + ctx.currentTime) loops seamlessly with variation:
 *  sections A/B every 8 bars, motif variations, fills at section ends. Basses carry harmonics so
 *  they still read on laptop speakers.
 */
(function () {
  "use strict";
  var ctx = null, musicGain = null, comp = null, reverb = null, revIn = null, noiseBuf = null;
  var volume = 0.7, muted = false, intensity = 0.6, style = null, timer = null, nextTime = 0, step = 0, bar = 0;
  var buses = null, seed = 1;
  var LOOKAHEAD = 0.3, TICK = 25;

  // Per-style trims put every style about 12 dB under the lasers at the default volume (rap keeps a little more beat).
  function level() { return volume * 0.17 * (style && STYLES[style] ? Math.pow(10, STYLES[style].trim / 20) : 0.3); }
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function init(existing) {
    if (!ctx) {
      ctx = existing || (window.BuilderSFX && window.BuilderSFX.context && window.BuilderSFX.context()) ||
        new (window.AudioContext || window.webkitAudioContext)();
      musicGain = ctx.createGain(); musicGain.gain.value = muted ? 0 : volume * 0.3;
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
      musicGain.connect(comp).connect(ctx.destination);
      var len = ctx.sampleRate * 1.8, ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (var ch = 0; ch < 2; ch++) { var d = ir.getChannelData(ch); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.5); }
      reverb = ctx.createConvolver(); reverb.buffer = ir; revIn = ctx.createGain(); revIn.gain.value = 0.28; revIn.connect(reverb).connect(musicGain);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var nd = noiseBuf.getChannelData(0); for (i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      buses = {};
      ["drums", "bass", "chords", "lead"].forEach(function (k) {
        var g = ctx.createGain(); g.gain.value = 1; g.connect(musicGain);
        var send = ctx.createGain(); send.gain.value = k === "chords" ? 0.45 : k === "lead" ? 0.35 : k === "drums" ? 0.08 : 0; g.connect(send).connect(revIn);
        buses[k] = g;
      });
    }
    var offline = window.OfflineAudioContext && ctx instanceof window.OfflineAudioContext;
    if (!offline && ctx.state === "suspended" && ctx.resume) { var p = ctx.resume(); if (p && p.catch) p.catch(function () {}); }
    return ctx;
  }

  // ------------------------------------------------------------ instruments (each note = a few nodes, then gone)
  function envGain(t, a, peak, hold, rel, dest) {
    var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    if (hold > 0) g.gain.setValueAtTime(Math.max(peak, 0.0002), t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel); g.connect(dest); return g;
  }
  function osc(type, f, t, dur, dest, detune) {
    var o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (detune) o.detune.value = detune;
    o.connect(dest); o.start(t); o.stop(t + dur + 0.05); return o;
  }
  function noise(t, dur, dest) { var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05); return s; }
  function filt(type, f, q, dest) { var b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q || 0.7; b.connect(dest); return b; }

  var I = {
    kick: function (t, v, deep) {
      var g = envGain(t, 0.002, 0.9 * v, 0, deep ? 0.35 : 0.22, buses.drums);
      var o = osc("sine", deep ? 120 : 150, t, 0.4, g); o.frequency.exponentialRampToValueAtTime(deep ? 42 : 50, t + 0.12);
      var c = envGain(t, 0.001, 0.25 * v, 0, 0.015, buses.drums); noise(t, 0.02, filt("highpass", 2500, 0.7, c));   // beater click
    },
    k808: function (t, midi, len, v) {           // long sub with a pitch glide + saturated harmonic for small speakers
      var f = mtof(midi), g = envGain(t, 0.003, 0.95 * v, len * 0.4, len * 0.7, buses.bass);
      var o = osc("sine", f * 2.2, t, len * 1.2, g); o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
      var ws = ctx.createWaveShaper(), cur = new Float32Array(256); for (var i = 0; i < 256; i++) { var x = i / 127.5 - 1; cur[i] = Math.tanh(x * 3); } ws.curve = cur;
      var hg = envGain(t, 0.003, 0.35 * v, len * 0.3, len * 0.6, buses.bass), lp = filt("lowpass", 900, 0.7, hg);
      ws.connect(lp); var o2 = osc("sine", f * 2.2, t, len * 1.2, ws); o2.frequency.exponentialRampToValueAtTime(f, t + 0.06);
      I.kick(t, 0.5 * v, true);
    },
    snare: function (t, v, gated) {
      var g = envGain(t, 0.001, 0.5 * v, gated ? 0.18 : 0, gated ? 0.02 : 0.16, buses.drums);
      noise(t, gated ? 0.25 : 0.2, filt("bandpass", gated ? 1800 : 2600, 0.8, g));
      var tg = envGain(t, 0.001, 0.35 * v, 0, 0.09, buses.drums); osc("triangle", 200, t, 0.12, tg);
      if (gated) { var s = ctx.createGain(); s.gain.value = 0.8; g.connect(s).connect(revIn); }
    },
    brush: function (t, v) { var g = envGain(t, 0.01, 0.18 * v, 0.03, 0.12, buses.drums); noise(t, 0.2, filt("bandpass", 3500, 0.6, g)); },
    clap: function (t, v) {
      [0, 0.012, 0.024].forEach(function (d, i) { var g = envGain(t + d, 0.001, (i === 2 ? 0.5 : 0.3) * v, 0, i === 2 ? 0.14 : 0.02, buses.drums); noise(t + d, 0.16, filt("bandpass", 1600, 1.2, g)); });
    },
    hat: function (t, v, open) { var g = envGain(t, 0.001, 0.16 * v, 0, open ? 0.22 : 0.045, buses.drums); noise(t, 0.3, filt("highpass", 7500, 0.7, g)); },
    ride: function (t, v) {
      var g = envGain(t, 0.001, 0.09 * v, 0, 0.5, buses.drums), hp = filt("highpass", 4000, 0.7, g);
      [1, 1.47, 1.98, 2.73].forEach(function (m) { osc("square", 420 * m, t, 0.6, hp); });
      noise(t, 0.4, filt("highpass", 8000, 0.7, envGain(t, 0.001, 0.06 * v, 0, 0.35, buses.drums)));
    },
    walk: function (t, midi, dur, v) {          // upright-ish pluck: triangle + saw harmonic, lowpassed (mid presence for laptops)
      var g = envGain(t, 0.006, 0.55 * v, 0.02, dur * 0.9, buses.bass), lp = filt("lowpass", 900, 1, g);
      osc("triangle", mtof(midi), t, dur + 0.1, lp); var h = ctx.createGain(); h.gain.value = 0.35; h.connect(lp); osc("sawtooth", mtof(midi), t, dur + 0.1, h);
    },
    synthBass: function (t, midi, dur, v, cutoff) {
      var g = envGain(t, 0.004, 0.45 * v, dur * 0.5, dur * 0.4, buses.bass), lp = filt("lowpass", cutoff || 700, 4, g);
      lp.frequency.setValueAtTime((cutoff || 700) * 2.5, t); lp.frequency.exponentialRampToValueAtTime(cutoff || 700, t + 0.12);
      osc("sawtooth", mtof(midi), t, dur + 0.1, lp); osc("square", mtof(midi - 12), t, dur + 0.1, lp, 4);
    },
    pad: function (t, notes, dur, v, bright) {
      var g = envGain(t, 0.25, 0.09 * v, dur - 0.3, 0.6, buses.chords), lp = filt("lowpass", bright ? 2600 : 1400, 0.7, g);
      notes.forEach(function (n) { osc("sawtooth", mtof(n), t, dur + 0.7, lp, -7); osc("sawtooth", mtof(n), t, dur + 0.7, lp, 7); });
    },
    doowop: function (t, notes, dur, v) {       // "ooh" choir: triangles through a vowel-ish bandpass
      var g = envGain(t, 0.06, 0.16 * v, dur * 0.6, 0.25, buses.chords), bp = filt("bandpass", 650, 1.2, g);
      notes.forEach(function (n) { var o = osc("triangle", mtof(n), t, dur + 0.3, bp); o.detune.setValueAtTime(-8, t); o.detune.linearRampToValueAtTime(8, t + dur); });
    },
    comp: function (t, notes, v, dur) {         // short piano/organ-like chord stab
      dur = dur || 0.18;
      var g = envGain(t, 0.004, 0.13 * v, 0.02, dur, buses.chords), lp = filt("lowpass", 2400, 0.7, g);
      notes.forEach(function (n) { osc("triangle", mtof(n), t, dur + 0.1, lp); osc("sine", mtof(n + 12), t, dur + 0.1, lp); });
    },
    rhodes: function (t, notes, dur, v) {
      var g = envGain(t, 0.01, 0.12 * v, dur * 0.3, dur * 0.8, buses.chords), trem = ctx.createGain(); trem.gain.value = 0.8; trem.connect(g);
      var lfo = osc("sine", 4.5, t, dur + 0.5, ctx.createGain()); var lg = ctx.createGain(); lg.gain.value = 0.2; lfo.disconnect(); lfo.connect(lg).connect(trem.gain);
      notes.forEach(function (n) { osc("sine", mtof(n), t, dur + 0.5, trem); var b = ctx.createGain(); b.gain.value = 0.25; b.connect(trem); osc("sine", mtof(n) * 2, t, dur * 0.4, b); });
    },
    brass: function (t, notes, dur, v) {
      var g = envGain(t, 0.02, 0.14 * v, dur * 0.4, 0.12, buses.chords), lp = filt("lowpass", 900, 2, g);
      lp.frequency.setValueAtTime(600, t); lp.frequency.exponentialRampToValueAtTime(3200, t + 0.05); lp.frequency.exponentialRampToValueAtTime(1200, t + dur);
      notes.forEach(function (n) { osc("sawtooth", mtof(n), t, dur + 0.2, lp, -5); osc("sawtooth", mtof(n), t, dur + 0.2, lp, 6); });
    },
    supersaw: function (t, notes, dur, v) {
      var g = envGain(t, 0.005, 0.07 * v, dur * 0.5, dur * 0.4, buses.chords), lp = filt("lowpass", 3800, 0.7, g);
      notes.forEach(function (n) { [-14, -5, 5, 14].forEach(function (d) { osc("sawtooth", mtof(n), t, dur + 0.1, lp, d); }); });
    },
    pluck: function (t, midi, dur, v, type) {
      var g = envGain(t, 0.003, 0.22 * v, 0, Math.min(dur, 0.35), buses.lead), lp = filt("lowpass", 3000, 2, g);
      lp.frequency.setValueAtTime(4500, t); lp.frequency.exponentialRampToValueAtTime(900, t + 0.25);
      osc(type || "square", mtof(midi), t, dur + 0.1, lp);
    },
    bell: function (t, midi, v) {
      var g = envGain(t, 0.002, 0.2 * v, 0, 0.9, buses.lead);
      osc("sine", mtof(midi), t, 1, g); var b = ctx.createGain(); b.gain.value = 0.3; b.connect(g); osc("sine", mtof(midi) * 2.76, t, 0.5, b);
    },
    theremin: function (t, midi, dur, v, prev) { // sine with portamento + wide vibrato
      var g = envGain(t, 0.05, 0.22 * v, dur * 0.7, 0.15, buses.lead);
      var o = osc("sine", mtof(prev || midi), t, dur + 0.25, g); o.frequency.exponentialRampToValueAtTime(mtof(midi), t + 0.08);
      var vib = ctx.createOscillator(); vib.frequency.value = 6.2; var vg = ctx.createGain(); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(mtof(midi) * 0.018, t + 0.25);
      vib.connect(vg).connect(o.frequency); vib.start(t); vib.stop(t + dur + 0.25);
      var h = ctx.createGain(); h.gain.value = 0.18; h.connect(g); var o2 = osc("triangle", mtof(prev || midi) * 2, t, dur + 0.25, h); o2.frequency.exponentialRampToValueAtTime(mtof(midi) * 2, t + 0.08);
    },
    sax: function (t, midi, dur, v) {
      var g = envGain(t, 0.03, 0.17 * v, dur * 0.6, 0.12, buses.lead), bp = filt("bandpass", 1200, 1.1, g), lp = filt("lowpass", 2600, 0.7, bp);
      var o = osc("sawtooth", mtof(midi) * 0.985, t, dur + 0.2, lp); o.frequency.linearRampToValueAtTime(mtof(midi), t + 0.06);
      var vib = ctx.createOscillator(); vib.frequency.value = 5.5; var vg = ctx.createGain(); vg.gain.value = mtof(midi) * 0.006; vib.connect(vg).connect(o.frequency); vib.start(t); vib.stop(t + dur + 0.2);
      noise(t, 0.08, filt("bandpass", 2500, 1, envGain(t, 0.005, 0.05 * v, 0, 0.06, buses.lead)));   // breath
    },
    synthLead: function (t, midi, dur, v, type) {
      var g = envGain(t, 0.01, 0.13 * v, dur * 0.6, 0.12, buses.lead), lp = filt("lowpass", 3500, 1, g);
      osc(type || "sawtooth", mtof(midi), t, dur + 0.2, lp, -6); osc(type || "sawtooth", mtof(midi), t, dur + 0.2, lp, 6);
      var d = ctx.createDelay(1); d.delayTime.value = 60 / (style && STYLES[style] ? STYLES[style].bpm : 110) * 0.75; var fb = ctx.createGain(); fb.gain.value = 0.3;
      g.connect(d).connect(fb).connect(d); fb.connect(buses.lead);
    }
  };

  // ------------------------------------------------------------ harmony helpers
  var Q = { maj: [0, 4, 7], min: [0, 3, 7], dom7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], m7b5: [0, 3, 6, 10], six: [0, 4, 7, 9] };
  function chord(rootMidi, q) { return Q[q].map(function (i) { return rootMidi + i; }); }
  function tone(ch, idx, oct) { var n = ch.length; return ch[((idx % n) + n) % n] + 12 * (Math.floor(idx / n) + (oct || 0)); }
  // motifs: [step, chord-tone index, length in steps]
  function pickMotif(list, b) { return list[(Math.floor(b / 2) + (b >= 8 && rnd() < 0.35 ? 1 : 0)) % list.length]; }

  // ------------------------------------------------------------ styles
  var STYLES = {
    galactic50s: { trim: -11, label: "Galactic 50s", bpm: 132, swing: 0.62,
      prog: [[60, "maj"], [57, "min"], [53, "maj"], [55, "dom7"]],
      motifs: [[[0, 4, 3], [4, 3, 2], [6, 2, 2], [8, 3, 6]], [[0, 2, 2], [2, 3, 2], [4, 4, 4], [10, 5, 4], [14, 4, 2]], [[0, 5, 6], [8, 4, 2], [10, 3, 2], [12, 2, 4]]],
      step: function (s, b, t, beat, ch, it) {
        if (s % 4 === 0) I.kick(t, s % 8 === 0 ? 0.6 : 0.35);
        if (s === 4 || s === 12) I.brush(t, 1);
        if (s % 2 === 0) I.hat(t, 0.5 + (s % 4 === 2 ? 0.3 : 0));
        if (s % 4 === 0) { var w = [0, 2, 1, 3][s / 4]; I.walk(t, tone(ch, w, -1), beat * 0.9, 0.9); }
        if (s === 4 || s === 12) I.doowop(t, ch.map(function (n) { return n + 12; }), beat * 1.6, 0.9);
        if (it > 0.35) melody(this, s, b, t, beat, ch, function (tt, m, d, prev) { I.theremin(tt, m, d, 1, prev); }, 12);
      } },
    swing: { trim: -9, label: "Swing", bpm: 152, swing: 0.66,
      prog: [[62, "min7"], [55, "dom7"], [60, "maj7"], [57, "dom7"]],
      motifs: [[[0, 3, 2], [2, 2, 2], [4, 1, 4], [12, 3, 2]], [[2, 4, 2], [6, 3, 2], [10, 2, 6]]],
      step: function (s, b, t, beat, ch, it) {
        if (s % 4 === 0 || s % 8 === 6) I.ride(t, s % 8 === 6 ? 0.6 : 1);
        if (s === 4 || s === 12) I.hat(t, 0.7);
        if (s % 4 === 0) { I.walk(t, tone(ch, [0, 1, 2, 3][s / 4] + (b % 2 && s === 12 ? 1 : 0), -1), beat * 0.9, 1); if (s === 0) I.kick(t, 0.25); }
        if ((s === 6 || s === 14 || (s === 10 && rnd() < 0.4)) && it > 0.25) I.comp(t, ch.map(function (n) { return n + 12; }), 1);
        if (it > 0.5) melody(this, s, b, t, beat, ch, function (tt, m, d) { I.synthLead(tt, m, d, 0.8, "square"); }, 12);
      } },
    fifties: { trim: -9.5, label: "50s rock'n'roll", bpm: 164, swing: 0.6,
      prog: [[57, "dom7"], [57, "dom7"], [57, "dom7"], [57, "dom7"], [62, "dom7"], [62, "dom7"], [57, "dom7"], [57, "dom7"], [64, "dom7"], [62, "dom7"], [57, "dom7"], [64, "dom7"]],
      motifs: [[[0, 4, 2], [2, 4, 2], [4, 3, 2], [6, 4, 4], [12, 2, 4]], [[0, 7, 4], [4, 6, 2], [6, 5, 2], [8, 4, 8]]],
      step: function (s, b, t, beat, ch, it) {
        if (s === 0 || s === 8 || (s === 10 && rnd() < 0.3)) I.kick(t, 0.8);
        if (s === 4 || s === 12) I.snare(t, 0.9);
        if (s % 2 === 0) I.hat(t, 0.6);
        if (s % 2 === 0) { var boog = [0, 0, 1, 1, 2, 2, 1, 1][s / 2]; var semis = [0, 4, 7, 9, 10, 9, 7, 4][s / 2]; I.walk(t, ch[0] - 12 + semis, beat * 0.45, 0.9); }
        if (s % 4 === 2 && it > 0.3) I.comp(t, [ch[0], ch[1], ch[2]], 0.9, 0.09);
        if (it > 0.5) melody(this, s, b, t, beat, ch, function (tt, m, d) { I.sax(tt, m, d, 1); }, 12);
      } },
    bigband: { trim: -8.5, label: "Big band", bpm: 144, swing: 0.66,
      prog: [[58, "six"], [55, "dom7"], [60, "min7"], [53, "dom7"]],
      motifs: [[[0, 3, 3], [4, 4, 2], [6, 5, 6]], [[2, 2, 2], [4, 3, 2], [6, 4, 2], [8, 5, 4], [14, 3, 2]]],
      step: function (s, b, t, beat, ch, it) {
        if (s % 4 === 0 || s % 8 === 6) I.ride(t, 1);
        if (s % 4 === 0) { I.kick(t, 0.2); I.walk(t, tone(ch, [0, 2, 1, 3][s / 4], -1), beat * 0.9, 1); }
        if (s === 12) I.hat(t, 0.8);
        if (it > 0.3 && (s === 6 || (s === 14 && b % 2 === 1) || (s === 0 && b % 4 === 0))) I.brass(t, ch.map(function (n) { return n + 12; }), beat * 0.6, 1);
        if (b % 4 === 3 && s >= 12 && s % 2 === 0) I.snare(t, 0.5);
        if (it > 0.45) melody(this, s, b, t, beat, ch, function (tt, m, d) { I.sax(tt, m, d, 1); }, 12);
      } },
    modern: { trim: -12.5, label: "Modern chill", bpm: 92, swing: 0.56,
      prog: [[57, "min7"], [53, "maj7"], [60, "maj7"], [55, "six"]],
      motifs: [[[0, 4, 3], [6, 3, 2], [10, 2, 6]], [[4, 5, 2], [8, 4, 4], [14, 2, 2]]],
      step: function (s, b, t, beat, ch, it) {
        if (s === 0 || s === 10) I.kick(t, 0.7);
        if (s === 4 || s === 12) I.snare(t, 0.45);
        if (s % 2 === 0 && it > 0.3) I.hat(t, 0.45 + 0.2 * (s % 4 === 0));
        if (s === 0) I.rhodes(t, ch.map(function (n) { return n + 12; }), beat * 3.5, 1);
        if (s === 0 || s === 7 || s === 10) I.synthBass(t, ch[0] - 12, beat * (s === 0 ? 1.4 : 0.6), 0.9, 420);
        if (it > 0.5) melody(this, s, b, t, beat, ch, function (tt, m, d) { I.pluck(tt, m, d, 0.8, "triangle"); }, 24);
      } },
    kpop: { trim: -13.5, label: "K-pop", bpm: 124, swing: 0.5,
      prog: [[57, "min"], [53, "maj"], [60, "maj"], [55, "maj"]],
      motifs: [[[0, 4, 2], [2, 4, 2], [4, 5, 2], [6, 4, 2], [8, 3, 4], [12, 2, 2], [14, 3, 2]], [[0, 5, 3], [3, 4, 3], [6, 3, 2], [8, 4, 6]]],
      step: function (s, b, t, beat, ch, it) {
        if (s % 4 === 0) { I.kick(t, 0.9); duck(t, beat); }
        if (s === 4 || s === 12) I.clap(t, 0.9);
        if (s % 4 === 2) I.hat(t, 0.8, true); else if (it > 0.5) I.hat(t, 0.35);
        if (s % 2 === 0) I.synthBass(t, ch[0] - 12 + (s % 4 === 2 ? 12 : 0), beat * 0.4, 0.9, 1100);
        if (s % 4 === 2 && it > 0.3) I.supersaw(t, ch.map(function (n) { return n + 12; }), beat * 0.35, 1);
        if (it > 0.4) melody(this, s, b, t, beat, ch, function (tt, m, d) { I.synthLead(tt, m, d, 1, "square"); }, 12);
      } },
    rap: { trim: -15, label: "Rap", bpm: 140, swing: 0.5,          // trap half-time: 808 + hats rolls
      prog: [[57, "min"], [57, "min"], [53, "maj"], [52, "min"]],
      motifs: [[[0, 2, 4], [6, 1, 2], [8, 0, 8]], [[0, 0, 2], [3, 1, 2], [6, 2, 4], [12, 1, 4]]],
      step: function (s, b, t, beat, ch, it) {
        var pat = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0];
        if (pat[s] || (s === 13 && b % 2)) I.k808(t, ch[0] - 24 + (s === 10 && b % 4 === 3 ? 3 : 0), beat * (s === 0 ? 1.6 : 1.1), 1);
        if (s === 8) { I.clap(t, 1); I.snare(t, 0.6); }
        var roll = (s >= 12 && b % 2 === 1 && it > 0.4);
        if (s % 2 === 0 || roll) I.hat(t, 0.55 + 0.3 * (s % 4 === 0));
        if (roll && s % 2 === 1) I.hat(t + beat / 8, 0.45);
        if (s === 0 && it > 0.3) I.pad(t, ch.map(function (n) { return n + 12; }), beat * 4, 0.7);
        if (it > 0.5) melody(this, s, b, t, beat, ch, function (tt, m) { I.bell(tt, m, 0.9); }, 24);
      } },
    eighties: { trim: -13, label: "80s", bpm: 108, swing: 0.5,
      prog: [[57, "min"], [53, "maj"], [60, "maj"], [55, "maj"]],
      motifs: [[[0, 4, 6], [6, 3, 2], [8, 2, 8]], [[0, 2, 2], [2, 3, 2], [4, 4, 8], [12, 5, 4]]],
      step: function (s, b, t, beat, ch, it) {
        if (s % 4 === 0) I.kick(t, 0.85);
        if (s === 4 || s === 12) I.snare(t, 0.9, true);
        if (s % 2 === 0 && it > 0.35) I.hat(t, 0.4);
        var arp = [0, 0, 12, 0, 7, 0, 12, 7]; I.synthBass(t, ch[0] - 24 + arp[s % 8], beat * 0.22, 0.75, 600);
        if (s === 0) I.pad(t, ch.map(function (n) { return n + 12; }), beat * 4, 1, true);
        if (it > 0.45) melody(this, s, b, t, beat, ch, function (tt, m, d) { I.synthLead(tt, m, d, 1); }, 12);
      } }
  };
  var ORDER = ["galactic50s", "swing", "fifties", "bigband", "modern", "kpop", "rap", "eighties"];

  var lastNote = null;
  function melody(st, s, b, t, beat, ch, play, octave) {
    var section = Math.floor(b / 8) % 2, phrase = b % 8;
    if (section === 1 && phrase % 4 === 3 && rnd() < 0.5) return;       // breathing room in B sections
    var motif = pickMotif(st.motifs, phrase + section * 3);
    for (var i = 0; i < motif.length; i++) if (motif[i][0] === s) {
      var idx = motif[i][1] + (section === 1 ? 1 : 0) + (rnd() < 0.12 ? (rnd() < 0.5 ? -1 : 1) : 0);
      var m = tone(ch, idx, 0) + octave;
      play(t, m, motif[i][2] * beat / 4, lastNote); lastNote = m;
    }
  }
  var duckGain = null;
  function duck(t, beat) {                        // K-pop pump: dip chords on each kick
    if (!buses) return;
    var g = buses.chords.gain; g.cancelScheduledValues(t); g.setValueAtTime(0.35, t); g.linearRampToValueAtTime(1, t + beat * 0.6);
  }

  // ------------------------------------------------------------ scheduler
  function stepTime(st, s, barStart, beat) {
    var beatIdx = Math.floor(s / 4), sub = s % 4, bt = barStart + beatIdx * beat, sw = st.swing;
    if (sub === 0) return bt;
    if (sub === 2) return bt + sw * beat;
    if (sub === 1) return bt + sw * beat / 2;
    return bt + sw * beat + (1 - sw) * beat / 2;
  }
  var barStart = 0;
  function tick() {
    if (!style) return;
    var st = STYLES[style], beat = 60 / st.bpm, now = ctx.currentTime;
    // After a long stall (hidden tab, heavy frame) jump ahead instead of bursting a backlog of notes.
    if (stepTime(st, step, barStart, beat) < now - 0.5) { var bars = Math.ceil((now - barStart) / (beat * 4)); barStart += bars * beat * 4; bar += bars; step = 0; }
    while (true) {
      var t = stepTime(st, step, barStart, beat);
      if (t > now + LOOKAHEAD) break;
      var c = st.prog[bar % st.prog.length], ch = chord(c[0], c[1]);
      var fill = bar % 8 === 7 && step >= 12 && style !== "rap";
      if (t < now) t = now + 0.005;              // slightly late: play it now rather than drop it
      {
        st.step(step, bar, t, beat, ch, intensity);
        if (fill && step % 1 === 0 && intensity > 0.3) I.snare(t + beat / 8, 0.35, false);
        if (step === 0 && bar % 8 === 0 && bar > 0 && style !== "modern") I.hat(t, 0.9, true);   // crash-ish lift at sections
      }
      step++;
      if (step >= 16) { step = 0; bar++; barStart += beat * 4; }
    }
  }
  function play(id) {
    init();
    if (!STYLES[id]) id = "galactic50s";
    if (style === id && timer) return;
    var wasPlaying = !!timer;
    style = id; step = 0; bar = 0; seed = 7 + ORDER.indexOf(id) * 101; lastNote = null;
    barStart = ctx.currentTime + 0.08;
    if (buses) buses.chords.gain.cancelScheduledValues(0), buses.chords.gain.value = 1;
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    if (!muted) { musicGain.gain.setValueAtTime(wasPlaying ? musicGain.gain.value : 0.0001, ctx.currentTime); musicGain.gain.linearRampToValueAtTime(level(), ctx.currentTime + 0.4); }
    if (!timer) timer = setInterval(tick, TICK);
    tick();
  }
  function stop(fadeSec) {
    if (!ctx) return;
    var f = fadeSec == null ? 1 : fadeSec;
    musicGain.gain.cancelScheduledValues(ctx.currentTime); musicGain.gain.setValueAtTime(musicGain.gain.value, ctx.currentTime);
    musicGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + Math.max(0.01, f));
    var was = style; style = null;
    setTimeout(function () { if (!style && timer) { clearInterval(timer); timer = null; } }, f * 1000 + 50);
    return was;
  }
  function setVolume(v) { volume = Math.max(0, Math.min(1, v)); if (musicGain && !muted && style) musicGain.gain.setTargetAtTime(level(), ctx.currentTime, 0.05); }
  function mute(m) { muted = !!m; if (musicGain) musicGain.gain.setTargetAtTime(muted || !style ? 0.0001 : level(), ctx.currentTime, 0.05); }

  window.BuilderMusic = {
    version: "1.0.0",
    styles: ORDER.map(function (id) { return { id: id, label: STYLES[id].label }; }),
    init: init, play: play, stop: stop, setVolume: setVolume, mute: mute,
    setIntensity: function (v) { intensity = Math.max(0, Math.min(1, v)); },
    current: function () { return style; },
    output: function () { return musicGain; },
    // for offline rendering/tests: schedule `seconds` of a style into the current context right away
    _renderInto: function (id, seconds) {
      init(); style = id; step = 0; bar = 0; seed = 7 + ORDER.indexOf(id) * 101; barStart = 0.05; lastNote = null;
      musicGain.gain.value = level();
      var st = STYLES[id], beat = 60 / st.bpm, t;
      while ((t = stepTime(st, step, barStart, beat)) < seconds) {
        var c = st.prog[bar % st.prog.length], ch = chord(c[0], c[1]);
        st.step(step, bar, t, beat, ch, intensity);
        step++; if (step >= 16) { step = 0; bar++; barStart += beat * 4; }
      }
      style = null;
    }
  };
})();
