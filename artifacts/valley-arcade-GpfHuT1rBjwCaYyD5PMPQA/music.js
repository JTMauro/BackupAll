// Valley Arcade background music: an original 80s-style synth track, sequenced live with WebAudio.
// A minor, 116 BPM. Two 8-bar sections (verse / chorus) over a drum machine, bass, arpeggio, pad and lead.
const BPM = 116, STEP = 60 / BPM / 4; // 16th notes
const N = n => 440 * Math.pow(2, (n - 69) / 12); // MIDI note -> Hz

// chord roots (MIDI) and chord tones per bar
const CHORDS = {
  Am: [57, [57, 60, 64]], F: [53, [53, 57, 60]], C: [48, [55, 60, 64]], G: [55, [55, 59, 62]],
  Dm: [50, [57, 62, 65]], E: [52, [56, 59, 64]], Em: [52, [55, 59, 64]]
};
const VERSE = ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'E'];
const CHORUS = ['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'E'];
// lead melodies: [step (0-127 within 8 bars), MIDI note, length in steps]
const LEAD_A = [[0, 76, 4], [4, 74, 2], [6, 72, 2], [8, 71, 4], [12, 72, 4], [16, 69, 6], [22, 72, 2], [24, 74, 4], [28, 72, 4],
  [32, 67, 4], [36, 69, 2], [38, 72, 2], [40, 71, 6], [46, 67, 2], [48, 74, 4], [52, 72, 2], [54, 71, 2], [56, 69, 8],
  [64, 76, 4], [68, 79, 4], [72, 77, 4], [76, 76, 4], [80, 74, 6], [86, 72, 2], [88, 71, 4], [92, 72, 4],
  [96, 69, 4], [100, 72, 4], [104, 74, 4], [108, 76, 4], [112, 75, 4], [116, 76, 4], [120, 71, 8]];
const LEAD_B = [[0, 77, 3], [3, 76, 3], [6, 74, 2], [8, 79, 6], [14, 77, 2], [16, 76, 4], [20, 74, 4], [24, 76, 8],
  [32, 77, 3], [35, 76, 3], [38, 74, 2], [40, 79, 4], [44, 81, 4], [48, 79, 4], [52, 76, 4], [56, 72, 8],
  [64, 77, 3], [67, 76, 3], [70, 74, 2], [72, 79, 6], [78, 81, 2], [80, 83, 4], [84, 81, 4], [88, 79, 8],
  [96, 77, 4], [100, 76, 4], [104, 74, 4], [108, 72, 4], [112, 71, 6], [118, 74, 2], [120, 76, 8]];

export function createMusic() {
  let ctx = null, master = null, bus = null, delaySend = null, playing = false, timer = 0;
  let nextTime = 0, step = 0, volume = .5, muted = false, duck = 1;
  let noiseBuf = null;

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.connect(master);
    bus = ctx.createGain(); bus.gain.value = .9; bus.connect(comp);
    // dotted-eighth echo for the lead and arpeggio
    const delay = ctx.createDelay(1); delay.delayTime.value = STEP * 3;
    const fb = ctx.createGain(); fb.gain.value = .32; const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2600;
    delaySend = ctx.createGain(); delaySend.gain.value = .35;
    delaySend.connect(delay); delay.connect(tone); tone.connect(fb); fb.connect(delay); tone.connect(bus);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function applyGain() { if (master) master.gain.setTargetAtTime(muted ? 0 : volume * .55 * duck, ctx.currentTime, .15); }

  // ---- instruments
  function osc(type, f, t, dur, vol, { cutoff = 0, q = 1, detune = 0, attack = .005, release = .08, send = 0, env = 0 } = {}) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, t + Math.max(attack, dur - release)); g.gain.linearRampToValueAtTime(0, t + dur);
    let out = g;
    if (cutoff) {
      const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.Q.value = q;
      f2.frequency.setValueAtTime(cutoff + env, t); f2.frequency.exponentialRampToValueAtTime(Math.max(80, cutoff), t + Math.min(dur, .25));
      o.connect(f2); f2.connect(g);
    } else o.connect(g);
    out.connect(bus); if (send) { const s = ctx.createGain(); s.gain.value = send; out.connect(s); s.connect(delaySend); }
    o.start(t); o.stop(t + dur + .02);
  }
  function noise(t, dur, vol, type, freq) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
  }
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + .12);
    g.gain.setValueAtTime(.9, t); g.gain.exponentialRampToValueAtTime(.001, t + .35);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + .4);
  }
  function snare(t) {
    noise(t, .22, .45, 'bandpass', 1800); noise(t, .5, .12, 'highpass', 4000); // gated-room tail
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle';
    o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(140, t + .08);
    g.gain.setValueAtTime(.35, t); g.gain.exponentialRampToValueAtTime(.001, t + .12); o.connect(g); g.connect(bus); o.start(t); o.stop(t + .15);
  }
  const hat = (t, open) => noise(t, open ? .22 : .045, open ? .1 : .13, 'highpass', 8000);
  function tom(t, f) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * .55, t + .25);
    g.gain.setValueAtTime(.5, t); g.gain.exponentialRampToValueAtTime(.001, t + .3); o.connect(g); g.connect(bus); o.start(t); o.stop(t + .32);
  }

  // ---- one 16th step of the song (a 32-bar form: verse, chorus, verse, chorus without lead in the first verse)
  function play(st, t) {
    const bar = Math.floor(st / 16) % 32, s16 = st % 16, sec = Math.floor(bar / 8), b8 = bar % 8;
    const chorus = sec % 2 === 1;
    const [root, tones] = CHORDS[(chorus ? CHORUS : VERSE)[b8]];
    // drums
    const fill = b8 === 7 && s16 >= 12;
    if (!fill) {
      if (s16 === 0 || s16 === 8 || (chorus && s16 === 10) || s16 === 6 && b8 % 2) kick(t);
      if (s16 === 4 || s16 === 12) snare(t);
      if (s16 % 2 === 0) hat(t, s16 === 14);
      else if (chorus) hat(t, false);
    } else tom(t, [196, 165, 140, 110][s16 - 12]);
    if (bar === 0 && s16 === 0 && st > 0) noise(t, 1.6, .18, 'highpass', 5000); // crash
    if (b8 === 0 && s16 === 0 && chorus) noise(t, 1.4, .16, 'highpass', 5000);
    // bass: driving 8ths with an octave jump
    if (s16 % 2 === 0) {
      const oct = (s16 === 6 || s16 === 14) ? 12 : 0;
      osc('sawtooth', N(root - 12 + oct), t, STEP * 1.8, .22, { cutoff: 420, q: 6, env: 900, release: .05 });
      osc('square', N(root - 24 + oct), t, STEP * 1.8, .08, { cutoff: 300 });
    }
    // arpeggio: chord tones up and down, two octaves up
    const arp = [0, 1, 2, 1, 0, 1, 2, 3][s16 % 8], note = arp === 3 ? tones[0] + 12 : tones[arp];
    osc('square', N(note + 12), t, STEP * .9, chorus ? .05 : .045, { cutoff: 2200, release: .03, send: .5 });
    // pad: detuned saw chord at the top of every bar
    if (s16 === 0) for (const n of tones) for (const dt of [-9, 9]) osc('sawtooth', N(n), t, STEP * 16, .028, { cutoff: chorus ? 1500 : 900, attack: .35, release: .4, detune: dt });
    // lead (silent on the very first verse)
    if (bar >= 8) {
      const mel = chorus ? LEAD_B : LEAD_A, pos = (bar % 8) * 16 + s16;
      for (const [p, n, len] of mel) if (p === pos) {
        osc('square', N(n), t, STEP * len, .075, { cutoff: 3200, attack: .01, release: .06, send: .45 });
        osc('sawtooth', N(n), t, STEP * len, .04, { cutoff: 2400, detune: 7, attack: .01, release: .06 });
      }
    }
  }
  function schedule() {
    while (nextTime < ctx.currentTime + .15) { play(step, nextTime); step++; nextTime += STEP; }
  }
  return {
    start() {
      init(); if (ctx.state === 'suspended') ctx.resume();
      if (playing) return; playing = true;
      nextTime = ctx.currentTime + .08; applyGain();
      timer = setInterval(schedule, 30);
    },
    stop() { playing = false; clearInterval(timer); if (master) master.gain.setTargetAtTime(0, ctx.currentTime, .1); },
    setVolume(v) { volume = v; if (ctx) applyGain(); },
    setMuted(m) { muted = m; if (ctx) applyGain(); },
    setDuck(d) { duck = d; if (ctx) applyGain(); }
  };
}
