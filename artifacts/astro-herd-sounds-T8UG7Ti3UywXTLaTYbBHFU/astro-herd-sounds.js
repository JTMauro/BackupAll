/* astro-herd-sounds.js — procedural sound set for Astro Herd (made by Builder).
 * Pure Web Audio: no files, no imports. One global: window.AH_SOUNDS.
 * Every entry: AH_SOUNDS.name(ctx, out, opts) plays now on `ctx` into AudioNode `out`.
 * scream(...) and music(...) return { stop() }.  opts.gain scales any sound (default 1).
 * Style: eerie sci-fi with comic timing; voices are cartoon-alien formant voices, not speech.
 */
(function () {
  "use strict";
  var NB = typeof WeakMap !== "undefined" ? new WeakMap() : null;   // per-context noise + reverb cache

  // ---------------------------------------------------------------- private helpers
  function kit(ctx) {
    var k = NB && NB.get(ctx);
    if (k) return k;
    var n = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = n.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    var len = Math.floor(ctx.sampleRate * 1.6), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) { var r = ir.getChannelData(c); for (i = 0; i < len; i++) r[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    k = { noise: n, ir: ir };
    if (NB) NB.set(ctx, k);
    return k;
  }
  function G(ctx, v) { var g = ctx.createGain(); g.gain.value = v == null ? 1 : v; return g; }
  function bus(ctx, out, opts, gain) { var g = G(ctx, (opts && opts.gain != null ? opts.gain : 1) * gain); g.connect(out); return g; }
  function env(ctx, t, a, peak, hold, rel) {
    var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    if (hold > 0) g.gain.setValueAtTime(Math.max(peak, 0.0002), t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
    return g;
  }
  function osc(ctx, type, f, t, end, dest) { var o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.connect(dest); o.start(t); o.stop(end); return o; }
  function filt(ctx, type, f, q, dest) { var b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q || 0.7; b.connect(dest); return b; }
  function noise(ctx, t, dur, dest) { var s = ctx.createBufferSource(); s.buffer = kit(ctx).noise; s.connect(dest); s.start(t, Math.random()); s.stop(t + dur + 0.05); return s; }
  function tone(ctx, type, f0, f1, t, dur, peak, dest, a) {
    var g = env(ctx, t, a || 0.003, peak, 0, dur); g.connect(dest);
    var o = osc(ctx, type, f0, t, t + dur + 0.1, g); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    return o;
  }
  function burst(ctx, t, dur, peak, dest, type, f0, f1, q, a) {
    var g = env(ctx, t, a || 0.002, peak, 0, dur); g.connect(dest);
    var f = filt(ctx, type, f0, q, g); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    noise(ctx, t, dur + (a || 0.002), f);
  }
  function verb(ctx, dest, amount) { var cv = ctx.createConvolver(); cv.buffer = kit(ctx).ir; var w = G(ctx, amount); w.connect(cv).connect(dest); return w; }
  function clip(ctx, amt) { var ws = ctx.createWaveShaper(), c = new Float32Array(512); for (var i = 0; i < 512; i++) { var x = i / 255.5 - 1; c[i] = Math.tanh(x * amt) / Math.tanh(amt); } ws.curve = c; return ws; }

  // Alien formant voice: buzzy source (saw + ring-mod) -> 3 parallel vowel bandpasses (+ breath).
  // pitch: [[time, Hz], ...] relative to t; vowel: [F1, F2, F3]; warble: vibrato depth (0..1).
  var VOWELS = { a: [850, 1250, 2700], e: [380, 2300, 3100], u: [380, 950, 2400], o: [550, 900, 2500] };
  function voice(ctx, dest, t, o) {
    var dur = o.dur, out = G(ctx, 0); out.connect(dest);
    out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(o.peak || 0.5, t + (o.attack || 0.04));
    if (!o.sustain) { out.gain.setValueAtTime(o.peak || 0.5, t + dur * 0.7); out.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
    var src = ctx.createOscillator(); src.type = "sawtooth";
    o.pitch.forEach(function (p, i) { if (i === 0) src.frequency.setValueAtTime(p[1], t + p[0]); else src.frequency.exponentialRampToValueAtTime(p[1], t + p[0]); });
    var vib = ctx.createOscillator(); vib.frequency.value = o.vibRate || 7; var vg = G(ctx, (o.warble || 0.3) * o.pitch[0][1] * 0.12); vib.connect(vg).connect(src.frequency);
    var ring = ctx.createOscillator(); ring.frequency.value = o.ring || 55; var rg = G(ctx, 0); ring.connect(rg.gain);   // ring-mod: alien edge
    var dry = G(ctx, 1 - (o.ringMix || 0.35)); src.connect(dry); src.connect(rg); var rgOut = G(ctx, o.ringMix || 0.35); rg.connect(rgOut);
    var mix = G(ctx, 1); dry.connect(mix); rgOut.connect(mix);
    var vw = o.vowel, shift = o.formantShift || 1.25;                                            // small big-headed creatures: formants up
    [[vw[0], 6, 1], [vw[1], 9, 0.55], [vw[2], 12, 0.3]].forEach(function (F, i) {
      var bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.setValueAtTime(F[0] * shift, t); bp.Q.value = F[1];
      if (o.vowelTo) bp.frequency.exponentialRampToValueAtTime(o.vowelTo[i] * shift, t + dur * 0.8);
      var fg = G(ctx, F[2] * 3); mix.connect(bp).connect(fg).connect(out);
    });
    if (o.breath) { var bf = filt(ctx, "bandpass", 2400, 0.8, G(ctx, o.breath)); bf.disconnect(); var bg = G(ctx, o.breath); bf.connect(bg).connect(out); noise(ctx, t, dur, bf); }
    var end = t + dur + 0.1;
    [src, vib, ring].forEach(function (n) { n.start(t); n.stop(end); });
    return { out: out, nodes: [src, vib, ring], end: end };
  }

  var S = {};

  // ---------------------------------------------------------------- voices
  S.aah = function (ctx, out, opts) {          // an alien dies: warbly, falling "aah"
    var t = ctx.currentTime + 0.01, b = bus(ctx, out, opts, 0.9);
    voice(ctx, b, t, { dur: 1.05, peak: 0.6, vowel: VOWELS.a, vowelTo: VOWELS.o, pitch: [[0, 520], [0.15, 560], [1.0, 170]], warble: 0.55, vibRate: 9, ring: 63, ringMix: 0.4 });
    verb(ctx, out, 0.12); return b;
  };
  S.scream = function (ctx, out, opts) {       // deadly fall: held "aaaaahhh" (up to 6 s), falls away (Doppler-ish)
    var t = ctx.currentTime + 0.01, max = Math.min(6, (opts && opts.duration) || 6), b = bus(ctx, out, opts, 0.85);
    var v = voice(ctx, b, t, { dur: max, peak: 0.55, sustain: true, vowel: VOWELS.a, pitch: [[0, 690], [0.3, 740], [max, 330]], warble: 0.35, vibRate: 6.5, ring: 48, ringMix: 0.3, breath: 0.06 });
    v.out.gain.setValueAtTime(0.55, t + max * 0.6); v.out.gain.exponentialRampToValueAtTime(0.12, t + max);   // fading into the distance
    var stopped = false;
    return { stop: function () {
      if (stopped) return; stopped = true;
      var n = ctx.currentTime; v.out.gain.cancelScheduledValues(n); v.out.gain.setValueAtTime(v.out.gain.value, n); v.out.gain.linearRampToValueAtTime(0, n + 0.04);
      v.nodes.forEach(function (x) { try { x.stop(n + 0.06); } catch (e) { /* already stopped */ } });
    } };
  };
  S.wee = function (ctx, out, opts) {          // jetpack fall: happy rising "weee!"
    var t = ctx.currentTime + 0.01, b = bus(ctx, out, opts, 0.85);
    voice(ctx, b, t, { dur: 0.8, peak: 0.5, vowel: VOWELS.u, vowelTo: VOWELS.e, pitch: [[0, 420], [0.1, 480], [0.75, 980]], warble: 0.25, vibRate: 11, ring: 90, ringMix: 0.25 });
    return b;
  };
  S.phew = function (ctx, out, opts) {         // reached the portal: breathy relieved "phew"
    var t = ctx.currentTime + 0.01, b = bus(ctx, out, opts, 0.9);
    burst(ctx, t, 0.16, 0.3, b, "highpass", 2500, 0, 0.7, 0.02);                                     // "ph"
    voice(ctx, b, t + 0.12, { dur: 0.5, peak: 0.42, vowel: VOWELS.e, vowelTo: VOWELS.u, pitch: [[0, 470], [0.5, 300]], warble: 0.15, ring: 70, ringMix: 0.2, breath: 0.18, attack: 0.05 });
    return b;
  };

  // ---------------------------------------------------------------- gear and actions
  S.assign = function (ctx, out, opts) {       // beacon placed: short theremin blip
    var t = ctx.currentTime + 0.005, b = bus(ctx, out, opts, 0.6);
    var o = tone(ctx, "sine", 700, 1150, t, 0.16, 0.5, b, 0.01);
    var v = osc(ctx, "sine", 18, t, t + 0.3, G(ctx, 30)); v.disconnect(); var vg = G(ctx, 30); v.connect(vg).connect(o.frequency);
    tone(ctx, "triangle", 1400, 2300, t, 0.1, 0.08, b);
    return b;
  };
  S.deny = function (ctx, out, opts) {         // not allowed: low buzz
    var t = ctx.currentTime + 0.005, b = bus(ctx, out, opts, 0.5), lp = filt(ctx, "lowpass", 900, 2, b);
    [0, 0.12].forEach(function (d) { tone(ctx, "sawtooth", 110, 104, t + d, 0.1, 0.45, lp, 0.005); tone(ctx, "square", 55, 52, t + d, 0.1, 0.2, lp, 0.005); });
    return b;
  };
  S.grapple = function (ctx, out, opts) {      // rope fires: whoosh + chain rattle + hook clank
    var t = ctx.currentTime + 0.005, b = bus(ctx, out, opts, 1.1);
    burst(ctx, t, 0.3, 0.35, b, "bandpass", 600, 3500, 1.2, 0.02);
    for (var i = 0; i < 9; i++) { var at = t + 0.05 + i * 0.028 + Math.random() * 0.01; burst(ctx, at, 0.025, 0.22, b, "bandpass", 3000 + Math.random() * 3000, 0, 8); }
    [2950, 4120, 5600].forEach(function (f) { tone(ctx, "sine", f, f * 0.99, t + 0.33, 0.25, 0.12, b); });
    burst(ctx, t + 0.33, 0.04, 0.4, b, "bandpass", 1800, 0, 2);
    return b;
  };
  S.zap = function (ctx, out, opts) {          // player blaster
    var t = ctx.currentTime + 0.005, b = bus(ctx, out, opts, 0.55);
    tone(ctx, "square", 1600, 220, t, 0.14, 0.45, filt(ctx, "lowpass", 4000, 3, b), 0.002);
    tone(ctx, "sawtooth", 900, 150, t, 0.16, 0.3, b, 0.002);
    burst(ctx, t, 0.03, 0.3, b, "highpass", 3500);
    return b;
  };
  S.spawn = function (ctx, out, opts) {        // alien drops out of the pod: hatch hiss + pop + plop
    var t = ctx.currentTime + 0.005, b = bus(ctx, out, opts, 0.7);
    burst(ctx, t, 0.22, 0.25, b, "highpass", 3000, 1500, 0.7, 0.02);
    tone(ctx, "sine", 300, 900, t + 0.18, 0.06, 0.4, b);
    tone(ctx, "sine", 260, 90, t + 0.42, 0.12, 0.6, b);
    return b;
  };
  S.tele = function (ctx, out, opts) {         // teleport / warp: shimmering sweep with a pop out
    var t = ctx.currentTime + 0.005, b = bus(ctx, out, opts, 0.55), w = verb(ctx, b, 0.4);
    for (var i = 0; i < 5; i++) { var o = tone(ctx, "sine", 300 * (1 + i * 0.5), 2400 * (1 + i * 0.25), t + i * 0.02, 0.45, 0.12, b, 0.05); o.connect(w); }
    burst(ctx, t, 0.5, 0.12, b, "bandpass", 800, 6000, 3, 0.1);
    tone(ctx, "sine", 1800, 300, t + 0.48, 0.08, 0.4, b);
    return b;
  };
  S.launch = function (ctx, out, opts) {       // gas vent / tractor air blast
    var t = ctx.currentTime + 0.005, b = bus(ctx, out, opts, 1.0);
    burst(ctx, t, 0.7, 0.55, b, "bandpass", 300, 2500, 0.9, 0.03);
    burst(ctx, t, 0.5, 0.3, b, "lowpass", 400, 120, 0.7, 0.01);
    tone(ctx, "sine", 90, 50, t, 0.25, 0.4, b);
    return b;
  };

  // ---------------------------------------------------------------- hazards and deaths
  S.splat = function (ctx, out, opts) {        // wet thud
    var t = ctx.currentTime + 0.005, b = bus(ctx, out, opts, 0.65);
    tone(ctx, "sine", 150, 45, t, 0.16, 0.9, b, 0.002);
    burst(ctx, t, 0.12, 0.5, b, "lowpass", 1400, 300, 1.5);
    for (var i = 0; i < 6; i++) { var at = t + 0.03 + Math.random() * 0.2; tone(ctx, "sine", 500 + Math.random() * 600, 150, at, 0.05, 0.12, b); }   // squelchy drips
    return b;
  };
  S.crush = function (ctx, out, opts) {        // metallic slam / stalactite shatter
    var t = ctx.currentTime + 0.005, b = bus(ctx, out, opts, 0.5), sat = clip(ctx, 2.5); sat.connect(b);
    tone(ctx, "sine", 120, 35, t, 0.4, 1.0, sat, 0.002);
    burst(ctx, t, 0.3, 0.7, sat, "lowpass", 3000, 300, 0.8);
    [517, 793, 1211, 1730, 2410].forEach(function (f, i) { tone(ctx, "sine", f, f * 0.995, t, 0.7 - i * 0.1, 0.13, b); });   // metal ring
    for (var i = 0; i < 12; i++) burst(ctx, t + 0.05 + Math.random() * 0.4, 0.03, 0.18, b, "bandpass", 3000 + Math.random() * 5000, 0, 6);   // shards
    return b;
  };
  S.shock = function (ctx, out, opts) {        // electric arc crackle
    var t = ctx.currentTime + 0.005, b = bus(ctx, out, opts, 0.45), sat = clip(ctx, 5); sat.connect(b);
    tone(ctx, "sawtooth", 120, 118, t, 0.55, 0.35, sat, 0.01);
    for (var i = 0; i < 26; i++) burst(ctx, t + Math.random() * 0.55, 0.008 + Math.random() * 0.02, 0.3 + Math.random() * 0.4, b, "highpass", 2000 + Math.random() * 4000);
    return b;
  };
  S.die = function (ctx, out, opts) {          // short death sting (sits under the voice)
    var t = ctx.currentTime + 0.005, b = bus(ctx, out, opts, 0.45), w = verb(ctx, b, 0.3);
    [[62, 0], [61, 0.12], [56, 0.24]].forEach(function (n) {
      var f = 440 * Math.pow(2, (n[0] - 69) / 12);
      tone(ctx, "triangle", f, f, t + n[1], 0.3, 0.35, b, 0.01).connect(w);
    });
    return b;
  };
  S.boom = function (ctx, out, opts) {         // overload explosion / mothership hit
    var t = ctx.currentTime + 0.01, b = bus(ctx, out, opts, 0.6), sat = clip(ctx, 1.8); sat.connect(b);
    tone(ctx, "sine", 110, 28, t, 1.0, 1.0, sat, 0.004);
    burst(ctx, t, 1.4, 0.8, sat, "lowpass", 3000, 150, 0.7, 0.01);
    burst(ctx, t, 0.08, 0.4, b, "highpass", 2000);
    var rum = env(ctx, t, 0.2, 0.5, 0.6, 1.6); rum.connect(b); noise(ctx, t, 2.4, filt(ctx, "lowpass", 140, 0.8, rum));
    for (var i = 0; i < 10; i++) burst(ctx, t + 0.3 + Math.random() * 1.2, 0.05, 0.12, b, "bandpass", 500 + Math.random() * 2500, 0, 3);
    verb(ctx, b, 0.2);
    return b;
  };
  S.meteor = function (ctx, out, opts) {       // incoming whistle, then impact
    var t = ctx.currentTime + 0.01, b = bus(ctx, out, opts, 0.65);
    tone(ctx, "sine", 2400, 500, t, 0.45, 0.12, b, 0.05);
    burst(ctx, t, 0.45, 0.15, b, "bandpass", 4000, 900, 4, 0.1);
    var hit = t + 0.45;
    tone(ctx, "sine", 130, 32, hit, 0.6, 1.0, b, 0.003);
    burst(ctx, hit, 0.8, 0.7, b, "lowpass", 2500, 180, 0.7, 0.005);
    for (var i = 0; i < 8; i++) burst(ctx, hit + 0.1 + Math.random() * 0.6, 0.04, 0.15, b, "bandpass", 700 + Math.random() * 2500, 0, 3);
    return b;
  };

  // ---------------------------------------------------------------- bad guys
  S.mite = function (ctx, out, opts) {         // void mite growl / destroyed
    var t = ctx.currentTime + 0.005, b = bus(ctx, out, opts, 0.45), sat = clip(ctx, 4);
    var lp = filt(ctx, "lowpass", 900, 6, b); sat.connect(lp);
    var o = tone(ctx, "sawtooth", 95, 60, t, 0.45, 0.6, sat, 0.02);
    var am = osc(ctx, "sine", 28, t, t + 0.6, G(ctx, 0)); am.disconnect(); var ag = G(ctx, 40); am.connect(ag).connect(o.frequency);
    lp.frequency.setValueAtTime(400, t); lp.frequency.linearRampToValueAtTime(1400, t + 0.15); lp.frequency.exponentialRampToValueAtTime(300, t + 0.45);
    burst(ctx, t + 0.38, 0.15, 0.35, b, "bandpass", 1200, 300, 1.5);                                // squish as it pops
    return b;
  };
  S.enemy = function (ctx, out, opts) {        // turret / agent firing: menacing buzz + crack
    var t = ctx.currentTime + 0.005, b = bus(ctx, out, opts, 0.6), sat = clip(ctx, 3); sat.connect(b);
    tone(ctx, "sawtooth", 160, 140, t, 0.12, 0.35, sat, 0.02);
    tone(ctx, "square", 80, 70, t, 0.12, 0.25, filt(ctx, "lowpass", 600, 1, b), 0.02);
    burst(ctx, t + 0.1, 0.05, 0.6, b, "highpass", 1500);
    tone(ctx, "sawtooth", 1200, 120, t + 0.1, 0.18, 0.3, filt(ctx, "lowpass", 3000, 2, b), 0.002);
    return b;
  };

  // ---------------------------------------------------------------- results
  function bell(ctx, f, t, dur, peak, dest) {
    var c = ctx.createOscillator(), m = ctx.createOscillator(), mg = G(ctx, f * 2.5);
    c.frequency.value = f; m.frequency.value = f * 3.5; mg.gain.setValueAtTime(f * 2.5, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + dur);
    m.connect(mg).connect(c.frequency); var g = env(ctx, t, 0.003, peak, 0, dur); c.connect(g).connect(dest);
    c.start(t); m.start(t); c.stop(t + dur + 0.05); m.stop(t + dur + 0.05);
  }
  function mf(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  S.save = function (ctx, out, opts) {         // soft home chime (under the phew)
    var t = ctx.currentTime + 0.01, b = bus(ctx, out, opts, 0.45), w = verb(ctx, b, 0.5);
    [76, 81].forEach(function (m, i) { bell(ctx, mf(m), t + i * 0.09, 0.8, 0.22, b); bell(ctx, mf(m), t + i * 0.09, 0.8, 0.1, w); });
    return b;
  };
  S.win = function (ctx, out, opts) {          // sector cleared jingle
    var t = ctx.currentTime + 0.01, b = bus(ctx, out, opts, 0.55), w = verb(ctx, b, 0.35);
    [[67, 0], [71, 0.11], [74, 0.22], [79, 0.33], [78, 0.5], [79, 0.62], [83, 0.74]].forEach(function (n) { bell(ctx, mf(n[0]), t + n[1], 0.5, 0.2, b); bell(ctx, mf(n[0]), t + n[1], 0.5, 0.08, w); });
    [55, 59, 62, 67].forEach(function (m) { tone(ctx, "triangle", mf(m), mf(m), t + 0.74, 0.9, 0.08, b, 0.02).connect(w); });
    tone(ctx, "sine", mf(79), mf(91), t + 0.74, 0.8, 0.12, b, 0.05);                                  // theremin swoop up
    return b;
  };
  S.lose = function (ctx, out, opts) {         // herd lost: drooping, spooky-comic "wah wah"
    var t = ctx.currentTime + 0.01, b = bus(ctx, out, opts, 0.55), w = verb(ctx, b, 0.35);
    [[67, 64, 0, 0.35], [66, 63, 0.4, 0.35], [65, 62, 0.8, 0.35], [64, 52, 1.2, 1.0]].forEach(function (n) {
      var lp = filt(ctx, "lowpass", 700, 4, b); lp.frequency.setValueAtTime(400, t + n[2]); lp.frequency.linearRampToValueAtTime(1600, t + n[2] + 0.12); lp.frequency.linearRampToValueAtTime(500, t + n[2] + n[3]);
      tone(ctx, "sawtooth", mf(n[0]), mf(n[1]), t + n[2], n[3], 0.28, lp, 0.02).connect(w);
    });
    return b;
  };

  // ---------------------------------------------------------------- music: original spooky-comedic chase
  // 118 bpm, light swing, D minor with chromatic turns. Soft gliding alien bass on 1 and 3, glassy FM
  // plucks on 2 and 4, a theremin lead with chromatic runs, a ring-mod warble synth and bubbly blips on
  // the B section, brushes, and an eerie drone bed. (v2: "more alien, less trumpet".)
  S.music = function (ctx, out, opts) {
    opts = opts || {};
    var BPM = opts.bpm || 118, SPB = 60 / BPM, SW = 0.58, b = bus(ctx, out, opts, 0.14), w = verb(ctx, b, 0.25);
    var prog = [[50, [0, 3, 7]], [50, [0, 3, 7, 9]], [46, [0, 4, 7, 10]], [45, [0, 4, 7, 10, 13]],
                [43, [0, 3, 7, 9]], [50, [0, 3, 7]], [52, [0, 3, 6, 9]], [45, [0, 4, 7, 10]]];          // Dm Dm6 Bb7 A7b9 | Gm6 Dm Edim7 A7
    var phrases = [   // [step, semitone above chord root (melody register), length in steps]; original lines
      [[0, 15, 1], [2, 14, 1], [3, 15, 1], [4, 19, 2], [8, 17, 1], [10, 15, 1], [12, 14, 3]],
      [[0, 12, 1], [1, 13, 1], [2, 14, 1], [3, 15, 1], [4, 16, 1], [6, 19, 2], [10, 18, 1], [12, 19, 4]],   // chromatic run up
      [[0, 22, 1], [2, 21, 1], [4, 20, 1], [6, 19, 1], [8, 16, 2], [12, 15, 2], [14, 12, 2]],                // chromatic tumble down
      [[2, 19, 1], [4, 15, 1], [6, 12, 2], [10, 13, 1], [12, 14, 1], [14, 15, 2]]
    ];
    var start = ctx.currentTime + 0.1, step = 0, bar = 0, barStart = start, stopped = false;
    function st(s) { var bt = barStart + Math.floor(s / 4) * SPB, sub = s % 4; return sub === 0 ? bt : sub === 2 ? bt + SW * SPB : sub === 1 ? bt + SW * SPB / 2 : bt + SW * SPB + (1 - SW) * SPB / 2; }
    // Alien voices for the band (all soft; nothing brassy)
    function alienBass(t, m, dur) {           // round sine bass that slides into its note, with a slow FM wobble
      var g = env(ctx, t, 0.012, 0.42, dur * 0.5, 0.12); g.connect(b);
      var o = osc(ctx, "sine", mf(m) * 1.06, t, t + dur + 0.2, g); o.frequency.exponentialRampToValueAtTime(mf(m), t + 0.05);
      var wob = osc(ctx, "sine", 5.5, t, t + dur + 0.2, G(ctx, 0)); wob.disconnect(); var wg = G(ctx, mf(m) * 0.03); wob.connect(wg).connect(o.frequency);
      var h = env(ctx, t, 0.012, 0.06, dur * 0.4, 0.1); h.connect(filt(ctx, "lowpass", 700, 1, b));   // soft 2nd harmonic so laptops hear it
      osc(ctx, "triangle", mf(m) * 2, t, t + dur + 0.2, h);
    }
    function glass(t, m, peak) {               // glassy FM pluck (high, bell-like, very short)
      var f = mf(m), c = ctx.createOscillator(), mo = ctx.createOscillator(), mg = G(ctx, f * 1.8);
      c.frequency.value = f; mo.frequency.value = f * 4.01; mg.gain.setValueAtTime(f * 1.8, t); mg.gain.exponentialRampToValueAtTime(f * 0.02, t + 0.25);
      mo.connect(mg).connect(c.frequency); var g = env(ctx, t, 0.002, peak, 0, 0.3); c.connect(g); g.connect(b); g.connect(w);
      c.start(t); mo.start(t); c.stop(t + 0.4); mo.stop(t + 0.4);
    }
    function theremin(t, m, dur, from, peak) { // sine with a portamento glide in and a slow, wide vibrato
      var g = env(ctx, t, 0.06, peak, dur * 0.75, 0.15); g.connect(b); g.connect(w);
      var o = osc(ctx, "sine", mf(from == null ? m - 5 : from), t, t + dur + 0.3, g); o.frequency.exponentialRampToValueAtTime(mf(m), t + 0.1);
      var v = osc(ctx, "sine", 6, t, t + dur + 0.3, G(ctx, 0)); v.disconnect(); var vg = G(ctx, 0); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(mf(m) * 0.022, t + 0.25); v.connect(vg).connect(o.frequency);
      var h = G(ctx, 0.12); h.connect(g); var o2 = osc(ctx, "triangle", mf(from == null ? m - 5 : from) * 2, t, t + dur + 0.3, h); o2.frequency.exponentialRampToValueAtTime(mf(m) * 2, t + 0.1);
    }
    function warble(t, m, dur, peak) {        // ring-modulated sci-fi synth: triangle x detuned sine, gently filtered
      var g = env(ctx, t, 0.02, peak, dur * 0.6, 0.12); g.connect(filt(ctx, "lowpass", 2400, 1, b)); g.connect(w);
      var car = osc(ctx, "triangle", mf(m), t, t + dur + 0.2, G(ctx, 0)); car.disconnect();
      var ring = G(ctx, 0); car.connect(ring); ring.connect(g);
      var mod = osc(ctx, "sine", mf(m) * 1.498, t, t + dur + 0.2, G(ctx, 0)); mod.disconnect(); mod.connect(ring.gain);
      var dry = G(ctx, 0.45); car.connect(dry).connect(g);
    }
    function bubble(t, m) {                    // bubbly blip: sine that pops upward
      var g = env(ctx, t, 0.003, 0.12, 0, 0.09); g.connect(b); g.connect(w);
      var o = osc(ctx, "sine", mf(m), t, t + 0.15, g); o.frequency.exponentialRampToValueAtTime(mf(m) * 1.9, t + 0.07);
    }
    var lastLead = null;
    function play(s, t) {
      var c = prog[bar % 8], root = c[0], sec = Math.floor(bar / 8) % 2;
      // soft alien bass on 1 and 3 (root / fifth), with a little pickup before the next bar
      if (s === 0 || s === 8) alienBass(t, root - 12 + (s === 8 ? 7 : 0), SPB * 0.8);
      if (s === 14 && bar % 2 === 1) alienBass(t, root - 12 + 11, SPB * 0.3);
      // glassy off-beat plucks instead of chord stabs (still bouncy on 2 and 4)
      if (s === 4 || s === 12) c[1].slice(1, 4).forEach(function (i, k) { glass(t + k * 0.012, root + 24 + i, 0.05); });
      // light kit: soft shaker, brush, and a tiny kick
      if (s === 4 || s === 12) burst(ctx, t, 0.1, 0.07, b, "bandpass", 3500, 0, 0.6, 0.01);
      if (s % 2 === 0) burst(ctx, t, 0.03, s % 4 === 2 ? 0.05 : 0.03, b, "highpass", 8000);
      if (s === 0) tone(ctx, "sine", 110, 48, t, 0.1, 0.32, b);
      // lead: theremin carries the A section; the B section trades the theremin with a ring-mod warble synth
      var ph = phrases[(bar + sec) % phrases.length];
      for (var i = 0; i < ph.length; i++) if (ph[i][0] === s) {
        var m = root + ph[i][1], dur = Math.max(ph[i][2], 2) * SPB / 4;
        if (sec === 0 || bar % 2 === 0) theremin(t, m, dur, lastLead, 0.13);
        else warble(t, m, dur, 0.1);
        lastLead = m;
      }
      // bubbly chatter in the gaps of the B section
      if (sec === 1 && (s === 7 || s === 15) && Math.random() < 0.6) bubble(t, root + 24 + c[1][Math.floor(Math.random() * c[1].length)]);
      // eerie bed: soft detuned drone that shifts with the chord, plus a slow high "sky" glide every 4 bars
      if (s === 0) [root + 12, root + 12 + c[1][1]].forEach(function (n) { tone(ctx, "sine", mf(n), mf(n) * 1.004, t, SPB * 3.6, 0.03, w, 0.4); });
      if (s === 0 && bar % 4 === 2) { var sky = tone(ctx, "sine", mf(root + 31), mf(root + 36), t, SPB * 7, 0.025, w, 0.8); }
    }
    function tick(until) {
      while (!stopped) {
        var t = st(step); if (t > until) break;
        if (t >= ctx.currentTime - 0.05) play(step, t);
        if (++step >= 16) { step = 0; bar++; barStart += 4 * SPB; }
      }
    }
    var timer = null;
    if (opts.renderSeconds) tick(start + opts.renderSeconds);           // offline rendering: schedule everything now
    else { timer = setInterval(function () { tick(ctx.currentTime + 0.15); }, 25); tick(ctx.currentTime + 0.15); }
    return { stop: function (fade) {
      if (stopped) return; stopped = true; if (timer) clearInterval(timer);
      var n = ctx.currentTime, f = fade == null ? 0.6 : fade;
      b.gain.cancelScheduledValues(n); b.gain.setValueAtTime(b.gain.value, n); b.gain.linearRampToValueAtTime(0, n + f);
      setTimeout(function () { try { b.disconnect(); } catch (e) { /* gone */ } }, f * 1000 + 3000);
    } };
  };

  window.AH_SOUNDS = S;
})();
