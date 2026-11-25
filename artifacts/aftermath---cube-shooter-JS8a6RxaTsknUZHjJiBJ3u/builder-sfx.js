/*  builder-sfx.js — procedural sound for "Chip Away" (Web Audio only; no files, no fetches).
 *
 *    BuilderSFX.init();                 // call from a click/tap: creates or resumes the AudioContext
 *    BuilderSFX.setMasterVolume(0.8); BuilderSFX.mute(false);
 *    BuilderSFX.startEngine(); BuilderSFX.setThrottle(0.4); BuilderSFX.stopEngine();
 *    BuilderSFX.laser(gunIndexOrHue);   // cheap; fine at ~12/s; pitch varies per gun
 *    BuilderSFX.cubePop(); hammerLaunch(); hammerImpact(); purgeBeam(seconds); droneDeploy(); droneShot();
 *    BuilderSFX.stackChime(); uiClick(); loadClick(); jamWarning(); levelClear(); planetExplosion();
 *
 *  Everything goes through one master bus: gain -> compressor -> limiter -> speakers, so many
 *  overlapping sounds don't distort. The engine is the deep "Builder rumble" from Kessel Run, kept
 *  quiet at idle so lasers sit on top. init(ctx) also accepts your own (or an Offline) AudioContext.
 */
(function () {
  "use strict";
  var ctx = null, master = null, comp = null, limiter = null, reverb = null, revSend = null, N = null;
  var volume = 0.85, muted = false, engine = null, laserVoices = 0, popVoices = 0;
  var MAX_LASERS = 10, MAX_POPS = 8;

  function now() { return ctx.currentTime; }
  function noiseBuffers() {
    var len = ctx.sampleRate * 3, white = ctx.createBuffer(1, len, ctx.sampleRate), brown = ctx.createBuffer(1, len, ctx.sampleRate), pink = ctx.createBuffer(1, len, ctx.sampleRate);
    var w = white.getChannelData(0), b = brown.getChannelData(0), p = pink.getChannelData(0), last = 0, b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (var i = 0; i < len; i++) {
      var x = Math.random() * 2 - 1; w[i] = x;
      last = (last + 0.02 * x) / 1.02; b[i] = last * 3.5;
      b0 = 0.99886 * b0 + x * 0.0555179; b1 = 0.99332 * b1 + x * 0.0750759; b2 = 0.969 * b2 + x * 0.153852;
      b3 = 0.8665 * b3 + x * 0.3104856; b4 = 0.55 * b4 + x * 0.5329522; b5 = -0.7616 * b5 - x * 0.016898;
      p[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362) * 0.11; b6 = x * 0.115926;
    }
    return { white: white, brown: brown, pink: pink };
  }
  function impulse(seconds, decay) {             // small generated room/space reverb
    var len = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay) * (i < 40 ? i / 40 : 1);
    }
    return buf;
  }
  function softClip(amount) {
    var ws = ctx.createWaveShaper(), n = 1024, curve = new Float32Array(n);
    for (var i = 0; i < n; i++) { var x = (i / (n - 1)) * 2 - 1; curve[i] = Math.tanh(x * amount) / Math.tanh(amount); }
    ws.curve = curve; ws.oversample = "2x"; return ws;
  }

  function init(existing) {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      ctx = existing || new AC();
      master = ctx.createGain(); master.gain.value = muted ? 0 : volume;
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.18;
      limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -2.5; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.001; limiter.release.value = 0.08;
      var trim = ctx.createGain(); trim.gain.value = 0.9;
      master.connect(comp).connect(limiter).connect(trim).connect(ctx.destination);
      reverb = ctx.createConvolver(); reverb.buffer = impulse(2.2, 3.2);
      revSend = ctx.createGain(); revSend.gain.value = 0.35; revSend.connect(reverb).connect(master);
      N = noiseBuffers();
    }
    var offline = window.OfflineAudioContext && ctx instanceof window.OfflineAudioContext;
    if (!offline && ctx.state === "suspended" && ctx.resume) { var pr = ctx.resume(); if (pr && pr.catch) pr.catch(function () {}); }
    return ctx;
  }
  function ready() { if (!ctx) init(); return ctx; }

  // ------------------------------------------------------------ small building blocks
  function env(g, t0, attack, peak, decay) {
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  }
  function out(gain, wet) {                       // a per-sound bus into master (+ optional reverb send)
    var g = ctx.createGain(); g.gain.value = gain; g.connect(master);
    if (wet) { var s = ctx.createGain(); s.gain.value = wet; g.connect(s).connect(revSend); }
    return g;
  }
  function tone(type, f0, f1, t0, dur, peak, dest, attack) {
    var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t0); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    env(g, t0, attack || 0.003, peak, dur); o.connect(g).connect(dest); o.start(t0); o.stop(t0 + dur + (attack || 0.003) + 0.05);
    return o;
  }
  function noise(kind, t0, dur, peak, dest, filterType, f0, f1, q, attack) {
    var s = ctx.createBufferSource(); s.buffer = N[kind];
    var f = ctx.createBiquadFilter(); f.type = filterType || "bandpass"; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0 || 1000, t0); if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    var g = ctx.createGain(); env(g, t0, attack || 0.002, peak, dur);
    s.connect(f).connect(g).connect(dest); s.start(t0, Math.random() * 2); s.stop(t0 + dur + (attack || 0.002) + 0.05);
    return s;
  }

  // ------------------------------------------------------------ engine: Kessel Run "Builder rumble"
  function startEngine() {
    ready();
    if (engine) return engine;
    var nodes = [], track = function (n) { nodes.push(n); return n; };
    var o = ctx.createGain(); o.gain.value = 0;
    var tone_ = ctx.createBiquadFilter(); tone_.type = "lowpass"; tone_.frequency.value = 4500; tone_.Q.value = 0.5;
    var level = ctx.createGain(); level.gain.value = 0.55;
    o.connect(tone_).connect(level).connect(master);
    o.gain.setTargetAtTime(1, now(), 0.4);
    function loop(buf, rate) { var s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = rate; s.start(0, Math.random() * 2); return track(s); }
    // sub: two sines + very low brown noise, surging
    var subG = ctx.createGain(); subG.gain.value = 0; subG.connect(o);
    var sub1 = track(ctx.createOscillator()); sub1.type = "sine"; sub1.connect(subG); sub1.start();
    var sub2 = track(ctx.createOscillator()); sub2.type = "sine"; var s2g = ctx.createGain(); s2g.gain.value = 0.55; sub2.connect(s2g).connect(subG); sub2.start();
    var subN = loop(N.brown, 0.5), subNF = ctx.createBiquadFilter(); subNF.type = "lowpass"; subNF.frequency.value = 60; subN.connect(subNF).connect(subG);
    // roar: resonant saturated brown noise 80-300 Hz
    var roar = loop(N.brown, 0.8), roarLP = ctx.createBiquadFilter(); roarLP.type = "lowpass"; roarLP.Q.value = 0.8;
    var roarPk = ctx.createBiquadFilter(); roarPk.type = "peaking"; roarPk.frequency.value = 110; roarPk.Q.value = 1.1; roarPk.gain.value = 10;
    var roarPost = ctx.createBiquadFilter(); roarPost.type = "lowpass"; roarPost.frequency.value = 420;
    var roarG = ctx.createGain(); roarG.gain.value = 0;
    roar.connect(roarLP).connect(roarPk).connect(softClip(4.5)).connect(roarPost).connect(roarG).connect(o);
    // growl: detuned low saws, burbling
    var growlBus = ctx.createGain(); growlBus.gain.value = 0;
    var growlLP = ctx.createBiquadFilter(); growlLP.type = "lowpass"; growlLP.Q.value = 2.2;
    var burble = ctx.createGain(); burble.gain.value = 1;
    growlBus.connect(burble).connect(growlLP).connect(softClip(3)).connect(o);
    var growls = [0, -9, 12].map(function (det, i) { var x = track(ctx.createOscillator()); x.type = "sawtooth"; x.detune.value = det; var g = ctx.createGain(); g.gain.value = [0.5, 0.4, 0.18][i]; x.connect(g).connect(growlBus); x.start(); return x; });
    var bLfo = track(ctx.createOscillator()); bLfo.type = "triangle"; var bD = ctx.createGain(); bD.gain.value = 0.35; bLfo.connect(bD).connect(burble.gain); bLfo.start();
    // afterburner thunder (throttle > 1.15)
    var ab = loop(N.pink, 0.7), ab2 = loop(N.brown, 0.6), abLP = ctx.createBiquadFilter(); abLP.type = "lowpass"; abLP.frequency.value = 380;
    var abSh = ctx.createBiquadFilter(); abSh.type = "lowshelf"; abSh.frequency.value = 90; abSh.gain.value = 10;
    var abG = ctx.createGain(); abG.gain.value = 0;
    ab.connect(abLP); ab2.connect(abLP); abLP.connect(abSh).connect(softClip(3.5)).connect(abG).connect(o);
    var crackle = ctx.createGain(); crackle.gain.value = 0.7; var crLP = ctx.createBiquadFilter(); crLP.type = "lowpass"; crLP.frequency.value = 900; crackle.connect(crLP).connect(o);

    // laptop-speaker layer: a warm 110-250 Hz hum (saws, lowpassed) and a soft high whoosh, both subtle
    var humG = ctx.createGain(); humG.gain.value = 0;
    var humLP = ctx.createBiquadFilter(); humLP.type = "lowpass"; humLP.frequency.value = 420; humLP.Q.value = 1;
    humLP.connect(humG).connect(o);
    var hum1 = track(ctx.createOscillator()); hum1.type = "sawtooth"; hum1.connect(humLP); hum1.start();
    var hum2 = track(ctx.createOscillator()); hum2.type = "sawtooth"; hum2.detune.value = 7; var h2g = ctx.createGain(); h2g.gain.value = 0.5; hum2.connect(h2g).connect(humLP); hum2.start();
    var whoosh = loop(N.white, 1), whBP = ctx.createBiquadFilter(); whBP.type = "bandpass"; whBP.Q.value = 0.8; whBP.frequency.value = 1800;
    var whG = ctx.createGain(); whG.gain.value = 0; whoosh.connect(whBP).connect(whG).connect(o);
    var target = 0.35, rpm = 0, boost = 0, surge = 0, surgeT = 0, surgeTimer = 0, last = now();
    function set(p, v, tc) { p.setTargetAtTime(v, now(), tc || 0.08); }
    var timer = setInterval(function () {
      var t = now(), dt = Math.min(0.2, t - last); last = t;
      var thr = Math.min(1.15, target), boostT = target > 1.15 ? Math.min(1, (target - 1.15) / 0.3) : 0;
      rpm += (thr - rpm) * (1 - Math.exp(-dt / (thr > rpm ? 1.1 : 1.6)));
      boost += (boostT - boost) * (1 - Math.exp(-dt / 0.45));
      surgeTimer -= dt; if (surgeTimer <= 0) { surgeT = Math.random() * Math.random(); surgeTimer = 0.4 + Math.random() * 1.2; }
      surge += (surgeT - surge) * (1 - Math.exp(-dt / 0.5));
      var r = Math.max(0, rpm), f0 = 26 + r * 22;
      set(sub1.frequency, f0, 0.15); set(sub2.frequency, f0 * 0.75, 0.15);
      set(subG.gain, (0.3 + 0.35 * r + boost * 0.3) * (0.75 + 0.5 * surge), 0.12);
      set(roarLP.frequency, 160 + r * 230 + boost * 160 + surge * 60);
      set(roarG.gain, (0.08 + 0.5 * Math.pow(r, 1.2) + boost * 0.35) * (0.85 + 0.3 * surge));
      growls.forEach(function (x) { set(x.frequency, 38 + r * 46, 0.12); });
      set(growlLP.frequency, 140 + r * 260 + boost * 120); set(growlBus.gain, 0.04 + 0.2 * r); set(bLfo.frequency, 5 + r * 7 + surge * 2, 0.2);
      set(abG.gain, boost * 0.9, 0.15);
      set(hum1.frequency, 110 + r * 140 + surge * 8, 0.12); set(hum2.frequency, (110 + r * 140) * 1.5, 0.12);
      set(humG.gain, 0.05 + 0.07 * Math.min(r, 1) + 0.03 * boost, 0.15);
      set(whBP.frequency, 1800 + r * 1500, 0.15); set(whG.gain, 0.04 + 0.1 * Math.min(r, 1) + 0.06 * boost, 0.15);
      set(level.gain, 0.32 + 0.38 * Math.min(r, 1) + 0.15 * boost, 0.2);     // quiet at idle, under the lasers
      if (boost > 0.3 && Math.random() < 0.6 * boost) noise("brown", now() + Math.random() * 0.03, 0.03 + Math.random() * 0.07, 0.4 + Math.random() * 0.4, crackle, "bandpass", 120 + Math.random() * 500, 0, 0.9, 0.004);
    }, 40);
    engine = {
      setThrottle: function (v) { target = Math.max(0, Math.min(1.5, v)); },
      stop: function (fade) {
        fade = fade == null ? 0.6 : fade; clearInterval(timer); o.gain.setTargetAtTime(0, now(), fade / 3);
        setTimeout(function () { nodes.forEach(function (n) { try { n.stop(); } catch (e) { /* already stopped */ } }); level.disconnect(); }, fade * 1000 + 300);
      }
    };
    return engine;
  }
  function setThrottle(v) { if (engine) engine.setThrottle(v); }
  function stopEngine(fade) { if (engine) { engine.stop(fade); engine = null; } }

  // ------------------------------------------------------------ one-shots
  function hueOf(x) {                             // gun index (0..) or a hue 0..1 or 0..360 -> pitch factor
    if (x == null) return 1;
    if (x >= 0 && x < 12 && x === Math.floor(x)) return [1, 1.12, 0.9, 1.24, 0.82, 1.06, 0.95, 1.18][x % 8];
    var h = x > 1 ? x / 360 : x; return 0.85 + 0.4 * h;
  }
  function laser(gunOrHue) {
    ready(); if (laserVoices >= MAX_LASERS) return;
    laserVoices++; var t0 = now() + 0.005, k = hueOf(gunOrHue) * (0.97 + Math.random() * 0.06), bus = out(1.1, 0.06);
    // punchy zap: fast pitch drop square+saw through a resonant sweep, plus a bright noise snap
    var o1 = tone("square", 1700 * k, 240 * k, t0, 0.14, 0.5, bus, 0.002);
    tone("sawtooth", 860 * k, 120 * k, t0, 0.16, 0.35, bus, 0.002);
    noise("white", t0, 0.04, 0.35, bus, "highpass", 3000, 0, 0.7, 0.001);
    tone("sine", 140 * k, 60, t0, 0.09, 0.45, bus, 0.002);                       // body thump
    o1.onended = function () { laserVoices--; setTimeout(function () { bus.disconnect(); }, 50); };
  }
  function droneShot() {
    ready(); if (laserVoices >= MAX_LASERS) return;
    laserVoices++; var t0 = now() + 0.005, k = 1.35 + Math.random() * 0.1, bus = out(1.0, 0.08);
    var o = tone("triangle", 2200 * k, 500 * k, t0, 0.1, 0.5, bus, 0.002);
    tone("square", 1100 * k, 300 * k, t0, 0.08, 0.2, bus, 0.002);
    o.onended = function () { laserVoices--; setTimeout(function () { bus.disconnect(); }, 50); };
  }
  function cubePop() {
    ready(); if (popVoices >= MAX_POPS) return;
    popVoices++; var t0 = now() + 0.005, k = 0.9 + Math.random() * 0.25, bus = out(2.0, 0.1);
    var o = tone("sine", 900 * k, 420 * k, t0, 0.09, 0.55, bus, 0.002);          // glassy pop
    tone("sine", 2350 * k, 1900 * k, t0, 0.06, 0.18, bus, 0.001);
    noise("white", t0, 0.03, 0.4, bus, "bandpass", 2600 * k, 0, 1.4, 0.001);     // click
    for (var i = 0; i < 4; i++) noise("white", t0 + 0.02 + Math.random() * 0.1, 0.04, 0.12, bus, "bandpass", 3500 + Math.random() * 4000, 0, 6, 0.001);   // shatter tinkles
    o.onended = function () { popVoices--; setTimeout(function () { bus.disconnect(); }, 200); };
  }
  function hammerLaunch() {
    ready(); var t0 = now() + 0.005, bus = out(0.7, 0.15);
    tone("sine", 130, 38, t0, 0.35, 0.9, bus, 0.004);                             // heavy thunk
    noise("pink", t0, 0.5, 0.5, bus, "lowpass", 2500, 300, 0.8, 0.01);            // whoosh
    [181, 412, 693, 1102].forEach(function (f, i) { tone("sine", f, f * 0.98, t0, 0.25 - i * 0.04, 0.22 / (i + 1), bus, 0.001); });  // metallic clank
    tone("sawtooth", 70, 140, t0 + 0.02, 0.4, 0.25, bus, 0.05);                   // charge rising
  }
  function hammerImpact() {
    ready(); var t0 = now() + 0.005, bus = out(0.55, 0.25), sat = softClip(2); sat.connect(bus);
    tone("sine", 110, 30, t0, 0.6, 1.0, sat, 0.003);
    noise("pink", t0, 0.9, 0.8, sat, "lowpass", 2400, 160, 0.7, 0.006);
    noise("white", t0, 0.08, 0.5, bus, "highpass", 1800, 0, 0.7, 0.001);
    for (var i = 0; i < 10; i++) noise("white", t0 + 0.05 + Math.random() * 0.5, 0.05 + Math.random() * 0.08, 0.15, bus, "bandpass", 500 + Math.random() * 2500, 0, 3, 0.002);
  }
  function purgeBeam(seconds) {
    ready(); var d = Math.max(0.3, seconds || 1), t0 = now() + 0.005, bus = out(0.0001, 0.2);
    bus.gain.setValueAtTime(0.0001, t0); bus.gain.exponentialRampToValueAtTime(0.35, t0 + 0.08);
    bus.gain.setValueAtTime(0.35, t0 + d); bus.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.3);
    var bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 3; bp.frequency.value = 900; bp.connect(bus);
    var lfo = ctx.createOscillator(); lfo.frequency.value = 7; var lg = ctx.createGain(); lg.gain.value = 500; lfo.connect(lg).connect(bp.frequency);
    var oscs = [0, 9, -12].map(function (det) {
      var o = ctx.createOscillator(); o.type = "sawtooth"; o.detune.value = det;
      o.frequency.setValueAtTime(110, t0); o.frequency.exponentialRampToValueAtTime(165, t0 + d); o.connect(bp); return o;
    });
    var shimmer = ctx.createOscillator(); shimmer.type = "sine"; shimmer.frequency.setValueAtTime(1760, t0); shimmer.frequency.exponentialRampToValueAtTime(2640, t0 + d);
    var sg = ctx.createGain(); sg.gain.value = 0.06; shimmer.connect(sg).connect(bus);
    var hiss = ctx.createBufferSource(); hiss.buffer = N.white; hiss.loop = true; var hf = ctx.createBiquadFilter(); hf.type = "highpass"; hf.frequency.value = 5000;
    var hg = ctx.createGain(); hg.gain.value = 0.08; hiss.connect(hf).connect(hg).connect(bus);
    oscs.concat([lfo, shimmer, hiss]).forEach(function (n) { n.start(t0); n.stop(t0 + d + 0.4); });
    setTimeout(function () { bus.disconnect(); }, (d + 1) * 1000);
  }
  function droneDeploy() {
    ready(); var t0 = now() + 0.005, bus = out(0.75, 0.1);
    var o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(220, t0); o.frequency.exponentialRampToValueAtTime(700, t0 + 0.35);
    var f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 4; f.frequency.setValueAtTime(600, t0); f.frequency.exponentialRampToValueAtTime(1800, t0 + 0.35);
    var g = ctx.createGain(); env(g, t0, 0.03, 0.35, 0.4); o.connect(f).connect(g).connect(bus); o.start(t0); o.stop(t0 + 0.5);   // servo whir
    [0, 0.12, 0.42].forEach(function (dt) { noise("white", t0 + dt, 0.025, 0.4, bus, "bandpass", 3000, 0, 2, 0.001); });           // latch clicks
    tone("sine", 660, 990, t0 + 0.4, 0.12, 0.2, bus, 0.005);                       // ready blip
  }
  function chimeNote(f, t0, peak, dest) {         // bell: inharmonic partials
    [[1, 1], [2.01, 0.45], [2.76, 0.28], [5.4, 0.1]].forEach(function (p) { tone("sine", f * p[0], f * p[0], t0, 0.9 / p[0] + 0.25, peak * p[1], dest, 0.004); });
  }
  function stackChime() {
    ready(); var t0 = now() + 0.005, bus = out(0.22, 0.4), base = 659.25;
    [1, 1.25, 1.5].forEach(function (m, i) { chimeNote(base * m, t0 + i * 0.06, 0.5, bus); });
  }
  function uiClick() {
    ready(); var t0 = now() + 0.003, bus = out(2.2, 0.02);
    noise("white", t0, 0.012, 0.6, bus, "bandpass", 4200, 0, 2, 0.0005); tone("sine", 1800, 1200, t0, 0.03, 0.25, bus, 0.001);
  }
  function loadClick() {
    ready(); var t0 = now() + 0.003, bus = out(0.9, 0.05);
    noise("white", t0, 0.03, 0.6, bus, "bandpass", 1500, 0, 3, 0.001);
    noise("white", t0 + 0.07, 0.04, 0.7, bus, "bandpass", 900, 0, 3, 0.001);
    tone("square", 320, 260, t0 + 0.07, 0.05, 0.12, bus, 0.001);
    tone("sine", 990, 1320, t0 + 0.13, 0.07, 0.15, bus, 0.004);                    // charged ping
  }
  function jamWarning() {
    ready(); var t0 = now() + 0.005, bus = out(0.45, 0.05), lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400; lp.connect(bus);
    [[880, 0], [660, 0.16], [880, 0.4], [660, 0.56]].forEach(function (n) { tone("square", n[0], n[0], t0 + n[1], 0.13, 0.4, lp, 0.005); });
  }
  function levelClear() {
    ready(); var t0 = now() + 0.01, bus = out(0.26, 0.45);
    [523.25, 659.25, 783.99, 987.77, 1046.5].forEach(function (f, i) { chimeNote(f, t0 + i * 0.09, 0.45, bus); });
    [261.63, 329.63, 392].forEach(function (f) { tone("triangle", f, f, t0 + 0.45, 1.6, 0.18, bus, 0.15); });   // warm pad under it
    noise("pink", t0, 1.2, 0.2, bus, "bandpass", 600, 5000, 0.8, 0.3);            // rising whoosh
  }
  // Big and deep (Kessel Run style, without the high crack): thump, body, long rolling rumble with echoes, debris.
  function planetExplosion(size) {
    ready(); var S = size || 3.2, t0 = now() + 0.02, end = t0 + 2.5 + S * 2.4;
    var bus = ctx.createGain(); bus.gain.value = 0.85;
    var air = ctx.createBiquadFilter(); air.type = "lowpass"; air.frequency.value = 2200;
    var sat = softClip(1.8), head = ctx.createGain(); head.gain.value = 0.8;
    bus.connect(air).connect(sat).connect(head).connect(master);
    var wet = ctx.createGain(); wet.gain.value = 0.25; head.connect(wet).connect(revSend);
    tone("sine", 120 / Math.sqrt(S), 22, t0, 0.8 * S, 1.2, bus, 0.006);                            // thump
    noise("pink", t0, 1.4 * S, 0.9, bus, "lowpass", 2400, 140, 0.7, 0.012);                       // body
    var s = ctx.createBufferSource(); s.buffer = N.brown; s.loop = true;                             // rolling rumble
    var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 130;
    var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.95, t0 + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, end);
    var roll = ctx.createOscillator(); roll.frequency.value = 1.3 + Math.random() * 0.8; var rollG = ctx.createGain(); rollG.gain.value = 0.35; roll.connect(rollG).connect(g.gain);
    var echo = ctx.createDelay(2); echo.delayTime.value = 0.45 + Math.random() * 0.3; var fb = ctx.createGain(); fb.gain.value = 0.35;
    var ef = ctx.createBiquadFilter(); ef.type = "lowpass"; ef.frequency.value = 380;
    s.connect(f).connect(g).connect(bus); g.connect(echo).connect(ef).connect(fb).connect(echo); ef.connect(bus);
    s.start(t0, Math.random() * 2); s.stop(end); roll.start(t0); roll.stop(end);
    tone("sine", 34, 24, t0 + 0.2, S * 1.8, 0.6, bus, 0.4);                                         // sub swell
    for (var i = 0; i < Math.round(10 + 10 * S); i++) {                                             // distant debris crunches
      var at = t0 + 0.3 + Math.random() * (1.4 + 1.6 * S);
      noise("white", at, 0.04 + Math.random() * 0.12, 0.06 + Math.random() * 0.12, bus, "bandpass", 300 + Math.random() * 1500, 0, 2 + Math.random() * 4, 0.003);
    }
    setTimeout(function () { bus.disconnect(); }, (end - now() + 1.5) * 1000);
    return end;
  }

  function setMasterVolume(v) { volume = Math.max(0, Math.min(1, v)); if (master && !muted) master.gain.setTargetAtTime(volume, now(), 0.03); }
  function mute(m) { muted = !!m; if (master) master.gain.setTargetAtTime(muted ? 0 : volume, now(), 0.03); }

  window.BuilderSFX = {
    version: "1.1.0",
    init: init, context: function () { return ctx; }, output: function () { return master; },
    setMasterVolume: setMasterVolume, mute: mute,
    startEngine: startEngine, setThrottle: setThrottle, stopEngine: stopEngine,
    laser: laser, cubePop: cubePop, hammerLaunch: hammerLaunch, hammerImpact: hammerImpact, purgeBeam: purgeBeam,
    droneDeploy: droneDeploy, droneShot: droneShot, stackChime: stackChime, uiClick: uiClick, loadClick: loadClick,
    jamWarning: jamWarning, levelClear: levelClear, planetExplosion: planetExplosion
  };
})();
