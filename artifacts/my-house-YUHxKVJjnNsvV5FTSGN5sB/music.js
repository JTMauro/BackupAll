// House music: an original, laid-back 70s soul/disco groove synthesized live with Web Audio.
// Rhodes-style electric piano, syncopated bass, wah "chicka" guitar, brushed disco drums, string pad and a flute hook.
// 98 BPM, 16-bar form (8 bars groove, 8 bars with the flute), looping. No samples, no external files.

export function createMusic() {
  let ctx = null, out = null, verb = null, playing = false, timer = 0, nextT = 0, step = 0, vol = .55, target = 0;
  const BPM = 98, S16 = 60 / BPM / 4;
  const N = n => 440 * Math.pow(2, (n - 69) / 12);  // midi -> Hz

  // chords (midi): Dm9, G13, Cmaj9, Am9 | Bbmaj7, A7sus/A7, Dm9, G13
  const PROG_A = [[50, 53, 57, 60, 64], [43, 53, 57, 59, 64], [48, 52, 55, 59, 62], [45, 55, 60, 64, 67]];
  const PROG_B = [[46, 53, 57, 62, 65], [45, 55, 59, 62, 64], [50, 53, 57, 60, 64], [43, 53, 57, 59, 64]];
  const ROOT = [[38, 43, 36, 33], [34, 33, 38, 31]];
  // bass rhythm per bar: [step, semitone offset from root, length in 16ths]
  const BASS = [[0, 0, 3], [3, 12, 1], [6, 0, 2], [8, 7, 2], [10, 10, 1], [11, 12, 2], [14, 7, 1], [15, 5, 1]];
  // flute hook (step within 2 bars, midi, length)
  const HOOK = [[0, 74, 3], [4, 72, 2], [6, 69, 2], [8, 72, 6], [16, 74, 2], [18, 76, 2], [20, 77, 3], [24, 76, 2], [26, 72, 6]];
  const HOOK2 = [[0, 69, 3], [4, 72, 2], [6, 74, 2], [8, 76, 4], [12, 74, 2], [16, 72, 3], [20, 69, 2], [22, 67, 2], [24, 69, 8]];

  function init() {
    if (ctx) return;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    out = ctx.createGain(); out.gain.value = 0;
    // small room reverb from a generated impulse
    verb = ctx.createConvolver();
    const len = ctx.sampleRate * 1.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    verb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = .22;
    verb.connect(wet); wet.connect(out);
    out.connect(comp); comp.connect(ctx.destination);
  }
  let noiseBuf = null;
  function noise() {
    if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s;
  }
  function bus(gain, send = 0) {
    const g = ctx.createGain(); g.gain.value = gain; g.connect(out);
    if (send) { const s = ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(verb); }
    return g;
  }

  // ---------------- instruments ----------------
  function rhodes(t, midi, dur, v, dest) {
    const f = N(midi), car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
    car.type = 'sine'; mod.type = 'sine'; car.frequency.value = f; mod.frequency.value = f * 1.0;
    mg.gain.setValueAtTime(f * 1.6, t); mg.gain.exponentialRampToValueAtTime(f * .08, t + .35);   // bell-like tine attack
    mod.connect(mg); mg.connect(car.frequency);
    const trem = ctx.createOscillator(), tg = ctx.createGain(); trem.frequency.value = 4.6; tg.gain.value = .18; trem.connect(tg); tg.connect(g.gain);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .008); g.gain.exponentialRampToValueAtTime(v * .35, t + .4); g.gain.exponentialRampToValueAtTime(.0001, t + dur + .3);
    car.connect(g); g.connect(dest);
    for (const o of [car, mod, trem]) { o.start(t); o.stop(t + dur + .35); }
  }
  function bassNote(t, midi, dur, v, dest, slide) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'triangle'; o2.type = 'sawtooth';
    const f = N(midi);
    o.frequency.setValueAtTime(slide ? f * .94 : f, t); o.frequency.exponentialRampToValueAtTime(f, t + .05);
    o2.frequency.setValueAtTime(f, t);
    const g2 = ctx.createGain(); g2.gain.value = .25;
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(260, t + .18); lp.Q.value = 3;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .01); g.gain.setValueAtTime(v * .8, t + dur * .7); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(dest);
    o.start(t); o2.start(t); o.stop(t + dur + .02); o2.stop(t + dur + .02);
  }
  function wah(t, midi, v, dest) {  // muted "chicka" with an envelope filter sweep
    const o = ctx.createOscillator(), bp = ctx.createBiquadFilter(), g = ctx.createGain(), nz = noise(), ng = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = N(midi);
    bp.type = 'bandpass'; bp.Q.value = 7; bp.frequency.setValueAtTime(500, t); bp.frequency.exponentialRampToValueAtTime(2200, t + .05); bp.frequency.exponentialRampToValueAtTime(700, t + .12);
    ng.gain.value = .35;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + .11);
    o.connect(bp); nz.connect(ng); ng.connect(bp); bp.connect(g); g.connect(dest);
    o.start(t); nz.start(t); o.stop(t + .13); nz.stop(t + .13);
  }
  function kick(t, v, dest) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + .14);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + .32);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + .34);
  }
  function snare(t, v, dest) {  // soft, slightly brushy backbeat
    const n = noise(), bp = ctx.createBiquadFilter(), g = ctx.createGain(), o = ctx.createOscillator(), og = ctx.createGain();
    bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = .7;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + .2);
    o.frequency.setValueAtTime(210, t); o.frequency.exponentialRampToValueAtTime(160, t + .06); og.gain.setValueAtTime(v * .6, t); og.gain.exponentialRampToValueAtTime(.0001, t + .08);
    n.connect(bp); bp.connect(g); g.connect(dest); o.connect(og); og.connect(dest);
    n.start(t); n.stop(t + .22); o.start(t); o.stop(t + .1);
  }
  function hat(t, v, open, dest) {
    const n = noise(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
    hp.type = 'highpass'; hp.frequency.value = 7500;
    const d = open ? .22 : .045;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    n.connect(hp); hp.connect(g); g.connect(dest); n.start(t); n.stop(t + d + .02);
  }
  function conga(t, midi, v, dest) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(N(midi) * 1.3, t); o.frequency.exponentialRampToValueAtTime(N(midi), t + .03);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + .18);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + .2);
  }
  function pad(t, notes, dur, v, dest) {  // string machine: detuned saws, slow attack
    const lp = ctx.createBiquadFilter(), g = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 1400;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .6); g.gain.setValueAtTime(v, t + dur - .3); g.gain.linearRampToValueAtTime(0, t + dur + .4);
    for (const m of notes) for (const det of [-7, 6]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = N(m + 12); o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur + .45); }
    lp.connect(g); g.connect(dest);
  }
  function flute(t, midi, dur, v, dest) {
    const o = ctx.createOscillator(), vib = ctx.createOscillator(), vg = ctx.createGain(), g = ctx.createGain(), n = noise(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
    o.type = 'sine'; o.frequency.value = N(midi);
    vib.frequency.value = 5.2; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(N(midi) * .012, t + .25); vib.connect(vg); vg.connect(o.frequency);
    nf.type = 'bandpass'; nf.frequency.value = N(midi) * 2; nf.Q.value = 2; ng.gain.value = .06;   // breath
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .06); g.gain.setValueAtTime(v * .9, t + dur - .05); g.gain.linearRampToValueAtTime(0, t + dur + .08);
    o.connect(g); n.connect(nf); nf.connect(ng); ng.connect(g); g.connect(dest);
    for (const x of [o, vib, n]) { x.start(t); x.stop(t + dur + .1); }
  }

  // ---------------- sequencer ----------------
  let B = null;
  function buses() {
    if (B) return B;
    B = { keys: bus(.16, .5), bass: bus(.42, .05), gtr: bus(.07, .3), drums: bus(.5, .12), hat: bus(.06, .1), perc: bus(.08, .3), pad: bus(.035, .8), lead: bus(.12, .7) };
    return B;
  }
  function schedule(t, s) {
    const b = buses();
    const bar = Math.floor(s / 16) % 16, i = s % 16, half = bar < 8 ? 0 : 1, ci = bar % 4;
    const chord = (half ? PROG_B : PROG_A)[ci], root = ROOT[half][ci];
    const swing = (i % 2) ? S16 * .14 : 0, tt = t + swing;
    // drums: four on the floor, soft; backbeat on 2 & 4; 16th hats with open hat on the "and"
    if (i % 4 === 0) kick(tt, bar % 8 === 7 && i === 12 ? .6 : .85, b.drums);
    if (i === 4 || i === 12) snare(tt, .32, b.drums);
    if (bar % 8 === 7 && i >= 13) snare(tt, .14, b.drums);                       // little fill
    hat(tt, i % 4 === 2 ? .5 : i % 2 ? .22 : .32, i % 4 === 2, b.hat);
    if (i === 3 || i === 7 || i === 10 || i === 14) conga(tt, [62, 57, 64, 57][[3, 7, 10, 14].indexOf(i)], .5, b.perc);
    // bass
    for (const [st, off, len] of BASS) if (st === i) bassNote(tt, root + off, len * S16 * .95, .9, b.bass, off === 12);
    // electric piano comping: syncopated stabs, with a held chord on bar starts
    if (i === 0) for (const m of chord.slice(1)) rhodes(tt, m + 12, S16 * 3, .5, b.keys);
    if (i === 6 || i === 10 || (i === 14 && bar % 2)) for (const m of chord.slice(1)) rhodes(tt, m + 12, S16 * 1.6, .35, b.keys);
    // wah guitar on offbeat 16ths
    if (i % 2 === 1 && i !== 15) wah(tt, chord[2] + 12, i % 4 === 1 ? .5 : .3, b.gtr);
    // string pad every 2 bars in the second half, and on the turnaround
    if (i === 0 && bar % 2 === 0 && (half || bar === 6)) pad(tt, chord.slice(1, 4), S16 * 32, 1, b.pad);
    // flute hook in the second half
    if (half) { const hook = bar < 12 ? HOOK : HOOK2; const local = (bar % 2) * 16 + i; for (const [st, m, len] of hook) if (st === local) flute(tt, m, len * S16, .7, b.lead); }
  }
  function pump() {
    if (!playing || !ctx) return;
    while (nextT < ctx.currentTime + .25) { schedule(nextT, step); step++; nextT += S16; }
    timer = setTimeout(pump, 60);
  }
  function fadeTo(v, sec) {
    if (!ctx) return;
    const g = out.gain, now = ctx.currentTime;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(v, now + sec);
  }
  return {
    // start (or resume) from a user gesture
    play() {
      init(); if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      target = vol;
      if (!playing) { playing = true; nextT = ctx.currentTime + .1; pump(); }
      fadeTo(target, 1.2);
    },
    // fade out and stop scheduling
    pause(sec = 1) {
      if (!ctx || !playing) return;
      target = 0; fadeTo(0, sec);
      setTimeout(() => { if (target === 0) { playing = false; clearTimeout(timer); } }, sec * 1000 + 50);
    },
    setVolume(v) { vol = v; if (playing && target > 0) { target = v; fadeTo(v, .3); } },
    get playing() { return playing && target > 0; }
  };
}
