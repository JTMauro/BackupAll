// Track & Field (Konami, 1983) \u2014 from-scratch recreation for the MAME32 Game Room.
// Button-mashing athletics: 100m dash, long jump, javelin, 110m hurdles, hammer throw, high jump.
// Alternate Space / X to run, Up (or Z) to jump / throw (hold to set the angle). Miss a qualifying mark and it's over.
(function () {
  'use strict';
  const FONT = {
    A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30],
    E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
    I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
    M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
    Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
    U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
    Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
    0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31], 3: [31, 2, 4, 2, 1, 17, 14],
    4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14], 6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8],
    8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12],
    '.': [0, 0, 0, 0, 0, 12, 12], ',': [0, 0, 0, 0, 12, 4, 8], ':': [0, 12, 12, 0, 12, 12, 0], '-': [0, 0, 0, 31, 0, 0, 0],
    '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4], '/': [1, 1, 2, 4, 8, 16, 16], "'": [4, 4, 8, 0, 0, 0, 0],
    '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], '=': [0, 0, 31, 0, 31, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0],
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8],
    '&': [12, 18, 20, 8, 21, 18, 13], '\u00b0': [12, 18, 18, 12, 0, 0, 0]
  };
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) {
        const bits = g[r]; if (!bits) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
  }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  const W = 256, H = 224, PPM = 8, LANE_CPU = 120, LANE_P = 146, FIELD = 176;
  const EVENTS = [
    { k: 'dash', name: '100M DASH', unit: 'SEC', wr: 9.95, q0: 11.50, dq: -0.3, lim: 10.0, time: true },
    { k: 'long', name: 'LONG JUMP', unit: 'M', wr: 8.90, q0: 7.00, dq: 0.25, lim: 8.4 },
    { k: 'jav', name: 'JAVELIN THROW', unit: 'M', wr: 104.80, q0: 70.00, dq: 4, lim: 88 },
    { k: 'hurd', name: '110M HURDLES', unit: 'SEC', wr: 13.00, q0: 16.00, dq: -0.4, lim: 13.8, time: true },
    { k: 'ham', name: 'HAMMER THROW', unit: 'M', wr: 84.14, q0: 64.00, dq: 3, lim: 78 },
    { k: 'high', name: 'HIGH JUMP', unit: 'M', wr: 2.38, q0: 2.00, dq: 0.05, lim: 2.25 }
  ];
  const fmt = (v, d) => v.toFixed(d === undefined ? 2 : d);

  ArcadeRegistry.register({
    id: 'trackfield', title: 'Track & Field', year: 1983, maker: 'Konami',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Alternate Space / X: run \u00b7 Up (or Z): jump / throw, hold to set angle \u00b7 Enter: start',
    marquee: { bg: '#001840', fg: '#ffffff', accent: '#ff3030' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(30000);
      let mode = 'title', mt = 0, frame = 0, coinFlash = 0, overT = 0;
      let g = null;
      const records = EVENTS.map(e => e.wr);
      const crowd = [];
      for (let i = 0; i < 220; i++) crowd.push({ x: i * 5 + ((i * 37) % 3), row: (i * 13) % 7, c: ['#ff6060', '#6090ff', '#ffe060', '#60e060', '#ffffff', '#ff90ff', '#ffa040'][(i * 7) % 7] });

      const snd = {
        step() { au.tone(140, 0.025, { type: 'square', vol: 0.05 }); },
        gun() { au.noise(0.3, { vol: 0.25, freq: 4000, slideTo: 300 }); },
        jump() { au.tone(400, 0.15, { type: 'square', vol: 0.08, slideTo: 900 }); },
        throw() { au.tone(900, 0.3, { type: 'triangle', vol: 0.1, slideTo: 300 }); },
        land() { au.noise(0.15, { vol: 0.12, freq: 600 }); },
        foul() { au.tone(110, 0.5, { type: 'sawtooth', vol: 0.12 }); au.tone(116, 0.5, { type: 'square', vol: 0.08 }); },
        knock() { au.noise(0.1, { vol: 0.15, freq: 1500 }); au.tone(200, 0.08, { type: 'square', vol: 0.08 }); },
        cheer() { au.noise(1.4, { vol: 0.12, freq: 2500, slideTo: 1200, type: 'bandpass' }); },
        qualify() { au.melody([[523, 0.12], [523, 0.12], [523, 0.12], [698, 0.36], [880, 0.12], [698, 0.12], [880, 0.5]], { type: 'square', vol: 0.12 }); },
        fail() { au.melody([[392, 0.25], [370, 0.25], [349, 0.25], [330, 0.6]], { type: 'square', vol: 0.12 }); },
        beep() { au.tone(880, 0.1, { type: 'square', vol: 0.1 }); },
        tick() { au.tone(1500, 0.015, { type: 'square', vol: 0.04 }); },
        wr() { au.melody([[784, 0.1], [988, 0.1], [1175, 0.1], [1568, 0.3], [1175, 0.1], [1568, 0.4]], { type: 'square', vol: 0.12 }); }
      };
      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; au.tone(90, 0.25, { type: 'square', vol: 0.15 }); return false;
      }
      function addScore(n) { g.score += n; if (g.score > hi) hi = g.score; }
      function qual(e) {
        const q = e.q0 + e.dq * g.loop;
        return e.time ? Math.max(e.lim, q) : Math.min(e.lim, q);
      }

      // ---------------- input helpers ----------------
      // two run buttons must be alternated; arrows Left/Right are an alternative pair
      function mash(a) {
        let pressed = null;
        if (api.pressed('Space')) pressed = 'A'; else if (api.pressed('KeyX')) pressed = 'B';
        else if (api.pressed('ArrowLeft')) pressed = 'A'; else if (api.pressed('ArrowRight')) pressed = 'B';
        if (!pressed) return false;
        if (pressed !== a.lastBtn) a.v += 1.0 * (1 - a.v / 13.2);
        else a.v += 0.12 * (1 - a.v / 13.2);
        a.lastBtn = pressed; snd.step();
        return true;
      }
      const actionPressed = () => api.anyPressed('ArrowUp', 'KeyZ');
      const actionHeld = () => api.key('ArrowUp') || api.key('KeyZ');
      function decay(a) { a.v = Math.max(0, a.v - 0.035 - a.v * 0.001); }

      // ---------------- game flow ----------------
      function newGame() {
        g = { score: 0, loop: 0, ei: 0 };
        startEvent();
      }
      function startEvent() {
        const e = EVENTS[g.ei];
        g.e = { k: e.k, def: e, phase: 'intro', t: 150, attempts: 0, best: null, marks: [], fouls: 0 };
        g.msg = ''; g.msgT = 0;
        setupAttempt();
        g.e.phase = 'intro'; g.e.t = 150;
      }
      function athlete() { return { x: 0, v: 0, lastBtn: null, anim: 0, air: 0, h: 0 }; }
      function setupAttempt() {
        const e = g.e;
        e.a = athlete(); e.c = null; e.timer = 0; e.theta = 0; e.fly = null; e.res = null;
        if (e.k === 'dash' || e.k === 'hurd') {
          e.c = athlete(); e.c.top = 100 / (qual(e.def) - 0.4) * (e.k === 'hurd' ? 1.18 : 1.07);
          e.phase = 'mark'; e.t = 80;
          if (e.k === 'hurd') { e.hurdles = []; for (let i = 0; i < 10; i++) e.hurdles.push({ x: 13.72 + 9.14 * i, down: false, cdown: false }); }
        } else if (e.k === 'ham') {
          e.phi = Math.PI; e.om = 0.03; e.phase = 'ready'; e.t = 70;
        } else if (e.k === 'high') {
          if (e.bar === undefined) { e.bar = Math.round((qual(e.def) - 0.2) * 100) / 100; e.fails = 0; }
          e.phase = 'ready'; e.t = 80;
        } else { e.phase = 'ready'; e.t = 70; }
      }
      function say(m, t) { g.msg = m; g.msgT = t || 90; }
      function endAttemptThrow(dist) {
        const e = g.e;
        e.attempts++;
        e.marks.push(dist);
        if (dist !== null && (e.best === null || dist > e.best)) e.best = dist;
        e.phase = 'mark'; e.t = 130;
      }
      function eventOver(value) {
        const e = g.e, d = e.def, q = qual(d);
        e.final = value;
        const ok = value !== null && (d.time ? value <= q : value >= q);
        let pts = 0;
        if (value !== null) {
          if (d.k === 'dash') pts = Math.max(0, Math.round((14 - value) * 400));
          else if (d.k === 'hurd') pts = Math.max(0, Math.round((19 - value) * 400));
          else if (d.k === 'long') pts = Math.round(value * 150);
          else if (d.k === 'jav' || d.k === 'ham') pts = Math.round(value * 16);
          else pts = Math.max(0, Math.round((value - 1.5) * 4000));
        }
        addScore(pts);
        e.pts = pts;
        e.newWR = value !== null && (d.time ? value < records[g.ei] : value > records[g.ei]);
        if (e.newWR) { records[g.ei] = value; addScore(5000); }
        e.ok = ok; e.phase = 'final'; e.t = 260;
        if (ok) { snd.cheer(); if (e.newWR) snd.wr(); else snd.qualify(); } else snd.fail();
      }
      function finalDone() {
        const e = g.e;
        if (e.ok) {
          g.ei++;
          if (g.ei >= EVENTS.length) { g.ei = 0; g.loop++; g.roundT = 180; }
          startEvent();
        } else {
          e.phase = 'wait';
          const cg = g;
          const end = () => { if (g !== cg) return; api.setHiScore(g.score); mode = 'over'; overT = 300; };
          if (api.offerContinue) api.offerContinue(() => { if (g !== cg) return; startEvent(); }, end);
          else end();
        }
      }

      // ---------------- events ----------------
      function updRace(e) {
        const a = e.a, c = e.c, hurd = e.k === 'hurd', fin = hurd ? 110 : 100;
        if (e.phase === 'mark') {
          if (--e.t <= 0) { e.phase = 'set'; e.t = 50 + Math.floor(Math.random() * 70); snd.beep(); }
          return;
        }
        if (e.phase === 'set') {
          if (api.anyPressed('Space', 'KeyX', 'ArrowLeft', 'ArrowRight')) {
            e.fouls++; snd.foul();
            if (e.fouls >= 2) { say('DISQUALIFIED', 120); eventOver(null); return; }
            say('FALSE START', 100); e.phase = 'mark'; e.t = 110; return;
          }
          if (--e.t <= 0) { e.phase = 'run'; e.timer = 0; snd.gun(); }
          return;
        }
        if (e.phase === 'run') {
          e.timer++;
          if (a.x < fin) {
            if (!a.air || !hurd) mash(a);
            decay(a);
            if (hurd && !a.air && actionPressed()) { a.air = 1; snd.jump(); }
            const px = a.x; a.x += a.v / 60; a.anim += a.v / 60;
            if (a.air) { a.air++; a.h = Math.sin(a.air / 34 * Math.PI); if (a.air >= 34) { a.air = 0; a.h = 0; } }
            if (hurd) for (const h of e.hurdles) {
              if (!h.down && px < h.x && a.x >= h.x) {
                const clear = a.air >= 5 && a.air <= 29;
                if (!clear) { h.down = true; a.v *= 0.5; snd.knock(); }
              }
            }
            if (a.x >= fin) { a.time = e.timer / 60; e.fin = a.time; snd.tick(); }
          }
          // CPU
          if (c.x < fin + 20) {
            c.v = Math.min(c.top, c.v + 4.2 / 60);
            const px = c.x; c.x += c.v / 60; c.anim += c.v / 60;
            if (hurd) {
              if (c.air) { c.air++; c.h = Math.sin(c.air / 34 * Math.PI); if (c.air >= 34) { c.air = 0; c.h = 0; } }
              for (const h of e.hurdles) {
                if (!c.air && h.x - c.x > 0 && h.x - c.x < c.v * 0.28) { c.air = 1; }
                if (px < h.x && c.x >= h.x && !(c.air >= 5 && c.air <= 29)) h.cdown = true;
              }
            }
            if (c.x >= fin && !c.time) c.time = e.timer / 60;
          }
          if (a.x >= fin) { e.phase = 'finish'; e.t = 90; }
          else if (e.timer > 60 * 30) { a.time = 99.99; e.phase = 'finish'; e.t = 60; }
          return;
        }
        if (e.phase === 'finish') {
          a.v *= 0.96; a.x += a.v / 60; a.anim += a.v / 60;
          if (c.x < fin + 20) { c.x += c.v / 60; c.anim += c.v / 60; }
          if (--e.t <= 0) eventOver(Math.round(a.time * 100) / 100);
        }
      }
      // long jump & javelin share a run-up to a foul line
      function updRunup(e) {
        const a = e.a, LINE = e.k === 'long' ? 35 : 30;
        if (e.phase === 'ready') { if (--e.t <= 0) e.phase = 'run'; return; }
        if (e.phase === 'run') {
          mash(a); decay(a);
          a.x += a.v / 60; a.anim += a.v / 60;
          if (actionPressed() && a.v > 0.5) { e.phase = 'angle'; e.theta = 0; }
          if (a.x > LINE + 0.2) { foul(e); }
          return;
        }
        if (e.phase === 'angle') {
          decay(a); a.x += a.v / 60; a.anim += a.v / 60;
          if (actionHeld() && e.theta < 80) e.theta = Math.min(80, e.theta + 3);
          if (a.x > LINE + 0.05) { foul(e); return; }
          if (!actionHeld() || e.theta >= 80) {
            const th = e.theta * Math.PI / 180, short = LINE - a.x;
            let d;
            if (e.k === 'long') d = a.v * a.v * Math.sin(2 * th) / 9.8 - short;
            else d = Math.pow(a.v * 3.1, 2) * Math.sin(2 * th) / 9.8 - short * 0.5;
            d = Math.max(0.1, Math.floor(d * 100) / 100);
            const ft = e.k === 'long' ? Math.max(24, Math.round(2 * a.v * Math.sin(th) / 9.8 * 60)) : Math.max(40, Math.round(Math.sin(th) * 140));
            e.fly = { x0: a.x, d, t: 0, T: ft, th, line: LINE };
            e.phase = 'fly';
            if (e.k === 'long') snd.jump(); else snd.throw();
          }
          return;
        }
        if (e.phase === 'fly') {
          const f = e.fly; f.t++;
          if (e.k === 'long') { a.anim += 0; }
          else { a.v *= 0.9; a.x = Math.min(LINE, a.x + a.v / 60); }
          if (f.t >= f.T) { snd.land(); endAttemptThrow(f.d); say(fmt(f.d) + ' M', 120); }
          return;
        }
        if (e.phase === 'mark' || e.phase === 'foul') {
          if (--e.t <= 0) {
            if (e.attempts >= 3) eventOver(e.best);
            else setupAttempt();
          }
        }
      }
      function foul(e) {
        snd.foul(); say('FOUL', 110);
        e.attempts++; e.marks.push(null);
        e.phase = 'foul'; e.t = 120;
      }
      function updHammer(e) {
        const a = e.a;
        if (e.phase === 'ready') { if (--e.t <= 0) { e.phase = 'spin'; e.timer = 0; } return; }
        if (e.phase === 'spin' || e.phase === 'angle') {
          e.timer++;
          if (mash(a)) e.om += 0.02 * (1 - e.om / 0.16);
          e.om = Math.max(0.03, e.om - 0.00025);
          const pph = e.phi; e.phi += e.om;
          if (Math.floor(pph / (Math.PI * 2)) !== Math.floor(e.phi / (Math.PI * 2))) au.tone(200 + e.om * 2000, 0.05, { type: 'triangle', vol: 0.06 });
          if (e.phase === 'spin' && actionPressed()) { e.phase = 'angle'; e.theta = 0; }
          if (e.phase === 'angle') {
            if (actionHeld() && e.theta < 80) e.theta = Math.min(80, e.theta + 2.5);
            if (!actionHeld() || e.theta >= 80) {
              let off = ((e.phi % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); if (off > Math.PI) off -= Math.PI * 2;
              if (Math.abs(off) > 0.5) { foul(e); say('FOUL', 110); return; }
              const th = e.theta * Math.PI / 180;
              const d = Math.max(1, Math.floor(Math.pow(e.om / 0.16, 2) * 86 * Math.sin(2 * th) * Math.cos(off) * 100) / 100);
              e.fly = { d, t: 0, T: Math.max(40, Math.round(Math.sin(th) * 130)), th, off };
              e.phase = 'fly'; snd.throw();
            }
          }
          if (e.timer > 60 * 8) foul(e);
          return;
        }
        if (e.phase === 'fly') {
          e.fly.t++; e.om *= 0.95; e.phi += e.om;
          if (e.fly.t >= e.fly.T) { snd.land(); endAttemptThrow(e.fly.d); say(fmt(e.fly.d) + ' M', 120); }
          return;
        }
        if (e.phase === 'mark' || e.phase === 'foul') {
          if (--e.t <= 0) { if (e.attempts >= 3) eventOver(e.best); else setupAttempt(); }
        }
      }
      function updHigh(e) {
        const a = e.a, BAR = 16, Z0 = 11.5, Z1 = 15;
        if (e.phase === 'ready') { if (--e.t <= 0) e.phase = 'run'; return; }
        if (e.phase === 'run') {
          mash(a); decay(a);
          a.x += a.v / 60; a.anim += a.v / 60;
          if (actionPressed() && a.x >= Z0 - 1.5) {
            if (a.x < Z0) { e.phase = 'jump'; e.clr = 0.8 + a.v * 0.06; }
            else e.clr = 1.15 + a.v * 0.115 - Math.abs(a.x - 13.6) * 0.05;
            e.phase = 'jump'; e.jt = 0; e.arch = -99; e.x0 = a.x; snd.jump();
          } else if (a.x > Z1) {
            snd.foul(); say('FAULT', 100); e.res = false; e.phase = 'result'; e.t = 110;
          }
          return;
        }
        if (e.phase === 'jump') {
          e.jt++;
          if (actionPressed() && e.arch < 0 && e.jt > 3) e.arch = e.jt;
          a.x = e.x0 + (BAR + 1.2 - e.x0) * Math.min(1, e.jt / 50);
          if (e.jt >= 50) {
            const archOK = e.arch > 0 && Math.abs(e.arch - 25) <= 9;
            const clr = e.clr - (archOK ? 0 : 0.22);
            e.res = clr >= e.bar; e.clrShown = clr;
            if (e.res) { snd.cheer(); say('CLEAR!', 100); } else { snd.knock(); say(archOK ? 'FAILED' : 'NO ARCH', 100); }
            e.phase = 'result'; e.t = 120;
          }
          return;
        }
        if (e.phase === 'result') {
          if (--e.t <= 0) {
            if (e.res) { e.best = e.bar; e.bar = Math.round((e.bar + 0.06) * 100) / 100; e.fails = 0; setupAttempt(); }
            else { e.fails++; if (e.fails >= 3) eventOver(e.best); else setupAttempt(); }
          }
        }
      }

      function update() {
        frame++; mt++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); }
          return;
        }
        if (mode === 'over') {
          if (--overT <= 0 || (overT < 200 && api.anyPressed('Enter'))) { mode = 'title'; mt = 0; }
          return;
        }
        if (g.msgT > 0) g.msgT--;
        if (g.roundT > 0) g.roundT--;
        const e = g.e;
        if (e.phase === 'wait') return;
        if (e.phase === 'intro') { if (--e.t <= 0) setupAttempt(); return; }
        if (e.phase === 'final') { if (--e.t <= 0) finalDone(); return; }
        switch (e.k) {
          case 'dash': case 'hurd': updRace(e); break;
          case 'long': case 'jav': updRunup(e); break;
          case 'ham': updHammer(e); break;
          case 'high': updHigh(e); break;
        }
      }

      // ---------------- drawing ----------------
      function drawAthlete(ctx, x, y, anim, pose, shirt, num) {
        x = Math.round(x); y = Math.round(y);
        const skin = '#f0b080', shorts = '#2040c0';
        if (pose === 'flop') {
          ctx.fillStyle = shirt; ctx.fillRect(x - 6, y - 4, 10, 5);
          ctx.fillStyle = shorts; ctx.fillRect(x + 4, y - 4, 5, 5);
          ctx.fillStyle = skin; ctx.fillRect(x - 10, y - 3, 4, 4); ctx.fillRect(x + 9, y - 2, 6, 2);
          return;
        }
        if (pose === 'sit') {
          ctx.fillStyle = skin; ctx.fillRect(x + 2, y - 3, 8, 3);
          ctx.fillStyle = shorts; ctx.fillRect(x - 3, y - 5, 6, 5);
          ctx.fillStyle = shirt; ctx.fillRect(x - 3, y - 13, 6, 8);
          ctx.fillStyle = skin; ctx.fillRect(x - 2, y - 18, 5, 5); ctx.fillStyle = '#402010'; ctx.fillRect(x - 2, y - 19, 5, 2);
          return;
        }
        const ph = Math.floor(anim * 2.2) & 3;
        let L1 = 0, L2 = 0, lift1 = 0, lift2 = 0;
        if (pose === 'run') { L1 = [-4, 0, 4, 0][ph]; L2 = -L1; lift1 = [0, 2, 0, 0][ph]; lift2 = [0, 0, 0, 2][ph]; }
        if (pose === 'crouch') {
          ctx.fillStyle = skin; ctx.fillRect(x - 6, y - 4, 4, 4); ctx.fillRect(x + 2, y - 6, 4, 6);
          ctx.fillStyle = shorts; ctx.fillRect(x - 4, y - 9, 7, 4);
          ctx.fillStyle = shirt; ctx.fillRect(x + 1, y - 13, 7, 6);
          ctx.fillStyle = skin; ctx.fillRect(x + 7, y - 15, 5, 5); ctx.fillRect(x + 6, y - 8, 2, 8);
          ctx.fillStyle = '#402010'; ctx.fillRect(x + 7, y - 16, 5, 2);
          return;
        }
        if (pose === 'jump') { L1 = 4; L2 = -3; lift1 = 4; lift2 = 2; }
        // legs
        ctx.fillStyle = skin;
        ctx.fillRect(x - 2 + L1, y - 9 - lift1, 3, 9); ctx.fillRect(x + 1 + L2, y - 9 - lift2, 3, 9);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 3 + L1, y - 2 - lift1, 4, 2); ctx.fillRect(x + L2, y - 2 - lift2, 4, 2);
        ctx.fillStyle = shorts; ctx.fillRect(x - 3, y - 13, 8, 5);
        ctx.fillStyle = shirt; ctx.fillRect(x - 3, y - 21, 8, 8);
        if (num) { ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 19, 4, 3); }
        // arms
        ctx.fillStyle = skin;
        if (pose === 'throw') { ctx.fillRect(x - 8, y - 22, 6, 2); ctx.fillRect(x + 4, y - 19, 5, 2); }
        else if (pose === 'up') { ctx.fillRect(x - 3, y - 29, 2, 8); ctx.fillRect(x + 4, y - 29, 2, 8); }
        else { ctx.fillRect(x - 5 - L2 / 2, y - 20, 2, 7); ctx.fillRect(x + 5 - L1 / 2, y - 20, 2, 7); }
        ctx.fillRect(x - 1, y - 27, 6, 6);
        ctx.fillStyle = '#402010'; ctx.fillRect(x - 1, y - 28, 6, 2); ctx.fillRect(x - 2, y - 27, 2, 3);
      }
      function drawStadium(ctx, cam) {
        ctx.fillStyle = '#183060'; ctx.fillRect(0, 20, W, 64);
        for (let r = 0; r < 7; r++) { ctx.fillStyle = r & 1 ? '#203a70' : '#1a3264'; ctx.fillRect(0, 24 + r * 8, W, 4); }
        for (const c of crowd) {
          const x = ((c.x - cam * 0.4) % 1100 + 1100) % 1100;
          if (x > W) continue;
          const bob = ((frame >> 3) + c.row + (c.x & 3)) % 4 === 0 ? 1 : 0;
          ctx.fillStyle = c.c; ctx.fillRect(x | 0, 26 + c.row * 8 - bob, 3, 3);
        }
        // ad boards
        const ads = ['#e02020', '#2060e0', '#20a040', '#e0a000'];
        for (let i = -1; i < 10; i++) {
          const bx = i * 48 - ((cam * 0.9) % 48 + 48) % 48;
          ctx.fillStyle = ads[((i + Math.floor(cam * 0.9 / 48)) % 4 + 4) % 4]; ctx.fillRect(bx, 84, 46, 10);
          text(ctx, ['SPORT', 'RUN', 'JUMP', 'GO!'][((i + Math.floor(cam * 0.9 / 48)) % 4 + 4) % 4], bx + 23, 86, '#fff', 1, 'center');
        }
        ctx.fillStyle = '#30a040'; ctx.fillRect(0, 94, W, 8);
        // track
        ctx.fillStyle = '#c05030'; ctx.fillRect(0, 102, W, 52);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 102, W, 1); ctx.fillRect(0, 127, W, 1); ctx.fillRect(0, 153, W, 1);
        ctx.fillStyle = '#30a040'; ctx.fillRect(0, 154, W, H - 154);
        ctx.fillStyle = '#289038';
        for (let x = -((cam | 0) % 32); x < W; x += 32) ctx.fillRect(x, 160, 16, H - 160);
      }
      function mToX(m, cam) { return m * PPM - cam; }
      function renderRace(ctx, e) {
        const a = e.a, c = e.c, fin = e.k === 'hurd' ? 110 : 100;
        const cam = Math.max(0, a.x * PPM - 80);
        drawStadium(ctx, cam);
        // markers
        for (let m = 0; m <= fin; m += 10) {
          const x = Math.round(mToX(m, cam)); if (x < -20 || x > W + 20) continue;
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x, 103, 1, 50);
          text(ctx, String(m), x, 158, '#fff', 1, 'center');
        }
        const fx = Math.round(mToX(fin, cam));
        if (fx > -10 && fx < W + 10) { ctx.fillStyle = '#ffff40'; ctx.fillRect(fx - 1, 103, 3, 50); ctx.fillStyle = '#fff'; ctx.fillRect(fx, 92, 1, 12); ctx.fillRect(fx - 3, 92, 7, 2); }
        if (e.hurdles) for (const h of e.hurdles) {
          const x = Math.round(mToX(h.x, cam)); if (x < -10 || x > W + 10) continue;
          for (const [lane, down] of [[LANE_CPU, h.cdown], [LANE_P, h.down]]) {
            if (down) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 2, lane - 2, 8, 2); }
            else { ctx.fillStyle = '#ffffff'; ctx.fillRect(x, lane - 12, 2, 12); ctx.fillStyle = '#ff2020'; ctx.fillRect(x - 1, lane - 13, 4, 3); ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, lane - 10, 4, 1); }
          }
        }
        const ready = e.phase === 'mark' || e.phase === 'set' || e.phase === 'intro';
        drawAthlete(ctx, mToX(c.x, cam), LANE_CPU - (c.h || 0) * 14, c.anim, ready ? 'crouch' : (c.air ? 'jump' : 'run'), '#ffd040', true);
        drawAthlete(ctx, mToX(a.x, cam), LANE_P - (a.h || 0) * 14, a.anim, ready ? 'crouch' : (a.air ? 'jump' : (a.v < 0.3 && e.phase === 'run' ? 'stand' : 'run')), '#ffffff', true);
        text(ctx, 'CPU', Math.round(mToX(c.x, cam)), LANE_CPU - 36, '#ffd040', 1, 'center');
        text(ctx, '1P', Math.round(mToX(a.x, cam)), LANE_P - 36, '#ffffff', 1, 'center');
        // time
        const tm = e.phase === 'finish' && a.time ? a.time : e.timer / 60;
        text(ctx, 'TIME ' + fmt(tm), W - 6, 168, '#ffff60', 1, 'right');
        if (e.phase === 'mark') text(ctx, 'ON YOUR MARK', W / 2, 176, '#fff', 1, 'center');
        if (e.phase === 'set') text(ctx, 'SET', W / 2, 176, '#ff6060', 2, 'center');
        if (e.phase === 'run' && e.timer < 40) text(ctx, 'GO!', W / 2, 176, '#60ff60', 2, 'center');
        speedMeter(ctx, a.v);
      }
      function speedMeter(ctx, v) {
        ctx.fillStyle = '#000'; ctx.fillRect(6, 206, 104, 10);
        const n = Math.round(clamp(v / 11, 0, 1) * 20);
        for (let i = 0; i < 20; i++) { ctx.fillStyle = i < n ? (i < 12 ? '#40ff40' : i < 17 ? '#ffff40' : '#ff4040') : '#303030'; ctx.fillRect(8 + i * 5, 208, 4, 6); }
        text(ctx, 'SPEED', 114, 208, '#fff');
      }
      function renderRunup(ctx, e) {
        const a = e.a, LINE = e.k === 'long' ? 35 : 30, long = e.k === 'long';
        const fly = e.fly;
        let focus = a.x;
        if (fly && long) focus = fly.x0 + (fly.d + (LINE - fly.x0)) * Math.min(1, fly.t / fly.T);
        if (e.phase === 'mark' && long && fly) focus = LINE + fly.d;
        if (!long && fly) {
          renderJavField(ctx, e); return;
        }
        const cam = Math.max(0, focus * PPM - 90);
        drawStadium(ctx, cam);
        // runway
        ctx.fillStyle = '#d06040'; ctx.fillRect(0, 128, W, 26);
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 128, W, 1); ctx.fillRect(0, 153, W, 1);
        const lx = Math.round(mToX(LINE, cam));
        ctx.fillStyle = '#ffffff'; ctx.fillRect(lx - 3, 129, 4, 24);
        if (long) {
          const p0 = Math.round(mToX(LINE + 1, cam)), p1 = Math.round(mToX(LINE + 11, cam));
          ctx.fillStyle = '#e8d090'; ctx.fillRect(p0, 130, p1 - p0, 22);
          for (let m = 5; m <= 10; m++) { const x = Math.round(mToX(LINE + m, cam)); ctx.fillStyle = '#c0a060'; ctx.fillRect(x, 130, 1, 22); text(ctx, String(m), x, 158, '#fff', 1, 'center'); }
        } else {
          for (let m = 0; m <= LINE; m += 10) { const x = Math.round(mToX(m, cam)); text(ctx, String(m), x, 158, '#fff', 1, 'center'); }
        }
        if (e.phase === 'mark' && fly && long) {
          const x = Math.round(mToX(LINE + fly.d, cam));
          ctx.fillStyle = '#ff2020'; ctx.fillRect(x, 126, 2, 28);
          drawAthlete(ctx, x + 2, 146, 0, 'sit', '#ffffff');
        } else if (fly && long) {
          const f = fly, k = Math.min(1, f.t / f.T);
          const x = f.x0 + (f.d + (LINE - f.x0)) * k, hgt = Math.sin(k * Math.PI) * (12 + f.th * 30);
          drawAthlete(ctx, mToX(x, cam), 146 - hgt, 0, 'jump', '#ffffff', true);
        } else {
          const pose = e.phase === 'angle' ? (long ? 'run' : 'throw') : (a.v < 0.3 ? 'stand' : 'run');
          const ax = mToX(a.x, cam);
          drawAthlete(ctx, ax, 146, a.anim, pose, '#ffffff', true);
          if (!long) { // javelin carried
            ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 1; ctx.beginPath();
            const th = (e.phase === 'angle' ? e.theta : 10) * Math.PI / 180;
            const hx = ax + 2, hy = 146 - 22;
            ctx.moveTo(hx - Math.cos(th) * 12, hy + Math.sin(th) * 12); ctx.lineTo(hx + Math.cos(th) * 12, hy - Math.sin(th) * 12); ctx.stroke();
          }
          if (e.phase === 'angle') angleGauge(ctx, e.theta);
        }
        speedMeter(ctx, a.v);
        attemptsBox(ctx, e);
      }
      function angleGauge(ctx, th) {
        const cx = 210, cy = 200;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 26, cy); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 26); ctx.stroke();
        ctx.strokeStyle = '#ffff40'; ctx.beginPath(); ctx.moveTo(cx, cy);
        const r = th * Math.PI / 180; ctx.lineTo(cx + Math.cos(r) * 24, cy - Math.sin(r) * 24); ctx.stroke();
        text(ctx, Math.round(th) + '\u00b0', cx + 28, cy - 10, '#ffff40');
      }
      function attemptsBox(ctx, e) {
        for (let i = 0; i < 3; i++) {
          const m = e.marks[i];
          const s = m === undefined ? '-' : m === null ? 'X' : fmt(m);
          text(ctx, (i + 1) + ': ' + s, 150, 168 + i * 10, m === null ? '#ff6060' : '#ffffff');
        }
      }
      function renderJavField(ctx, e) {
        // wide view of the field, 1 m = 2 px
        const S = 2, X0 = 30;
        ctx.fillStyle = '#183060'; ctx.fillRect(0, 20, W, 50);
        for (const c of crowd) { if (c.x > W) continue; ctx.fillStyle = c.c; ctx.fillRect(c.x, 24 + c.row * 6, 2, 2); }
        ctx.fillStyle = '#30a040'; ctx.fillRect(0, 70, W, H - 70);
        for (let m = 10; m <= 110; m += 10) {
          const x = X0 + m * S;
          ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(X0, 150, m * S, m * S * 0.35, 0, -0.5, 0.5); ctx.stroke();
          text(ctx, String(m), x, 172, '#fff', 1, 'center');
        }
        ctx.fillStyle = '#fff'; ctx.fillRect(X0, 120, 2, 60);
        const f = e.fly, k = Math.min(1, f.t / f.T);
        const x = X0 + f.d * S * k, y = 150 - Math.sin(k * Math.PI) * Math.max(10, f.th * 70);
        const ang = Math.atan2(-Math.cos(k * Math.PI) * Math.max(10, f.th * 70) * Math.PI, f.d * S);
        ctx.strokeStyle = '#ffffff'; ctx.beginPath();
        ctx.moveTo(x - Math.cos(ang) * 8, y + Math.sin(ang) * 8); ctx.lineTo(x + Math.cos(ang) * 8, y - Math.sin(ang) * 8); ctx.stroke();
        drawAthlete(ctx, X0 - 6, 154, 0, 'throw', '#ffffff');
        if (e.phase === 'mark') { ctx.fillStyle = '#ff2020'; ctx.fillRect(X0 + f.d * S - 1, 140, 2, 14); }
        attemptsBox(ctx, e);
      }
      function renderHammer(ctx, e) {
        ctx.fillStyle = '#183060'; ctx.fillRect(0, 20, W, 50);
        for (const c of crowd) { if (c.x > W) continue; ctx.fillStyle = c.c; ctx.fillRect(c.x, 24 + c.row * 6, 2, 2); }
        ctx.fillStyle = '#30a040'; ctx.fillRect(0, 70, W, H - 70);
        const CX = 40, CY = 150, S = 2.3;
        // sector
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(CX + 230, CY - 230 * Math.tan(0.5) * 0.35); ctx.moveTo(CX, CY); ctx.lineTo(CX + 230, CY + 230 * Math.tan(0.5) * 0.35); ctx.stroke();
        for (let m = 20; m <= 90; m += 10) {
          ctx.beginPath(); ctx.ellipse(CX, CY, m * S, m * S * 0.35, 0, -0.5, 0.5); ctx.stroke();
          text(ctx, String(m), CX + m * S, CY + 24, '#fff', 1, 'center');
        }
        // circle + cage
        ctx.fillStyle = '#a0a0a0'; ctx.beginPath(); ctx.ellipse(CX, CY, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#d0d0d0';
        for (let k = 0; k < 7; k++) { const a = Math.PI * 0.6 + k * 0.25; const x = CX + Math.cos(a) * 22, y = CY + Math.sin(a) * 8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 40); ctx.stroke(); }
        // athlete & hammer
        const spinning = e.phase === 'spin' || e.phase === 'angle';
        const hx = CX + Math.cos(e.phi) * 20, hy = CY - 14 + Math.sin(e.phi) * 7;
        const behind = Math.sin(e.phi) < 0;
        const drawH = () => {
          if (e.fly || e.phase === 'mark') return;
          ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(CX, CY - 16); ctx.lineTo(hx, hy); ctx.stroke();
          ctx.fillStyle = '#404040'; ctx.fillRect(Math.round(hx) - 2, Math.round(hy) - 2, 5, 5);
        };
        if (behind) drawH();
        drawAthlete(ctx, CX, CY, spinning ? (e.phi / 3) : 0, spinning ? 'throw' : 'stand', '#ffffff', !behind);
        if (!behind) drawH();
        if (e.fly) {
          const f = e.fly, k = Math.min(1, f.t / f.T);
          const dx = f.d * S * k * Math.cos(f.off), dy = f.d * S * k * Math.sin(f.off) * 0.35;
          const x = CX + dx, y = CY + dy - Math.sin(k * Math.PI) * Math.max(10, f.th * 60);
          ctx.fillStyle = '#202020'; ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 5, 5);
          ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(Math.round(CX + dx) - 2, Math.round(CY + dy), 5, 2);
        }
        if (e.phase === 'mark' && e.fly) { const f = e.fly; ctx.fillStyle = '#ff2020'; ctx.fillRect(Math.round(CX + f.d * S * Math.cos(f.off)) - 1, Math.round(CY + f.d * S * Math.sin(f.off) * 0.35) - 12, 2, 12); }
        // spin meter
        ctx.fillStyle = '#000'; ctx.fillRect(6, 206, 104, 10);
        const n = Math.round(clamp(e.om / 0.16, 0, 1) * 20);
        for (let i = 0; i < 20; i++) { ctx.fillStyle = i < n ? (i < 12 ? '#40ff40' : i < 17 ? '#ffff40' : '#ff4040') : '#303030'; ctx.fillRect(8 + i * 5, 208, 4, 6); }
        text(ctx, 'SPIN', 114, 208, '#fff');
        if (e.phase === 'angle') angleGauge(ctx, e.theta);
        attemptsBox(ctx, e);
      }
      function renderHigh(ctx, e) {
        const a = e.a, BAR = 16;
        const cam = 0;
        drawStadium(ctx, 0);
        const S = 12, X0 = 20, GYH = 160;
        const bx = X0 + BAR * S;
        ctx.fillStyle = '#d06040'; ctx.fillRect(0, GYH - 4, bx, 8);
        // take-off zone
        ctx.fillStyle = '#ffffff'; ctx.fillRect(X0 + 11.5 * S, GYH - 4, 1, 8); ctx.fillRect(X0 + 15 * S, GYH - 4, 1, 8);
        // mat
        ctx.fillStyle = '#2050d0'; ctx.fillRect(bx - 4, GYH - 14, 40, 14); ctx.fillStyle = '#4070ff'; ctx.fillRect(bx - 4, GYH - 14, 40, 3);
        // bar
        const bpx = Math.round(e.bar * 28);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(bx - 1, GYH - bpx - 10, 2, bpx + 10); ctx.fillRect(bx + 25, GYH - bpx - 10, 2, bpx + 10);
        const knocked = e.phase === 'result' && !e.res;
        if (knocked) { ctx.fillStyle = '#ffff40'; ctx.fillRect(bx + 2, GYH - 16, 22, 2); }
        else { ctx.fillStyle = '#ffff40'; ctx.fillRect(bx, GYH - bpx, 26, 2); }
        text(ctx, fmt(e.bar) + 'M', bx + 12, GYH - bpx - 20, '#ffffff', 1, 'center');
        // athlete
        const ax = X0 + a.x * S;
        if (e.phase === 'jump') {
          const k = e.jt / 50, peak = Math.max(10, (e.clr - (e.arch > 0 && Math.abs(e.arch - 25) <= 9 ? 0 : 0.22)) * 28);
          const y = GYH - Math.sin(k * Math.PI) * peak;
          drawAthlete(ctx, ax, y + 8, 0, e.arch > 0 && e.jt > e.arch - 2 ? 'flop' : 'jump', '#ffffff');
        } else if (e.phase === 'result') {
          drawAthlete(ctx, X0 + (BAR + 1.2) * S + 4, GYH - 12, 0, 'flop', '#ffffff');
        } else drawAthlete(ctx, ax, GYH, a.anim, a.v < 0.3 ? 'stand' : 'run', '#ffffff', true);
        void cam;
        speedMeter(ctx, a.v);
        text(ctx, 'BEST ' + (e.best ? fmt(e.best) + 'M' : '-'), 150, 168, '#fff');
        text(ctx, 'TRIES', 150, 178, '#fff');
        for (let i = 0; i < 3; i++) { ctx.fillStyle = i < e.fails ? '#ff3030' : '#404040'; ctx.fillRect(186 + i * 8, 178, 6, 6); }
      }
      function drawHUD(ctx) {
        const e = g.e, d = e.def;
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 20);
        text(ctx, '1P ' + String(g.score).padStart(6, '0'), 4, 2, '#fff');
        text(ctx, 'HI ' + String(hi).padStart(6, '0'), W - 4, 2, '#ff6060', 1, 'right');
        text(ctx, d.name, 4, 11, '#ffff40');
        text(ctx, 'QUALIFY ' + fmt(qual(d)) + (d.time ? 'S' : 'M'), W - 4, 11, '#60ff60', 1, 'right');
        text(ctx, 'WORLD RECORD ' + fmt(records[g.ei]) + (d.time ? 'S' : 'M'), 4, H - 9, '#80c0ff');
      }
      function renderEvent(ctx) {
        const e = g.e;
        switch (e.k) {
          case 'dash': case 'hurd': renderRace(ctx, e); break;
          case 'long': case 'jav': renderRunup(ctx, e); break;
          case 'ham': renderHammer(ctx, e); break;
          case 'high': renderHigh(ctx, e); break;
        }
        drawHUD(ctx);
        if (e.phase === 'intro') {
          ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(28, 60, W - 56, 80);
          text(ctx, 'EVENT ' + (g.ei + 1 + g.loop * 6), W / 2, 66, '#fff', 1, 'center');
          text(ctx, e.def.name, W / 2, 80, '#ffff40', 2, 'center');
          text(ctx, 'QUALIFY ' + fmt(qual(e.def)) + (e.def.time ? ' SEC' : ' M'), W / 2, 102, '#60ff60', 1, 'center');
          const tip = { dash: 'ALTERNATE SPACE & X', long: 'HOLD UP TO SET ANGLE', jav: 'HOLD UP TO SET ANGLE', hurd: 'UP TO JUMP HURDLES', ham: 'MASH TO SPIN, HOLD UP', high: 'UP: JUMP  UP AGAIN: ARCH' }[e.k];
          text(ctx, tip, W / 2, 118, '#fff', 1, 'center');
        }
        if (e.phase === 'ready' && e.k === 'high') text(ctx, 'BAR ' + fmt(e.bar) + 'M', W / 2, 60, '#fff', 1, 'center');
        if (e.phase === 'ready' && (e.k === 'long' || e.k === 'jav' || e.k === 'ham')) text(ctx, 'ATTEMPT ' + (e.attempts + 1), W / 2, 60, '#fff', 1, 'center');
        if (g.msgT > 0 && e.phase !== 'final') text(ctx, g.msg, W / 2, 70, (frame >> 3) & 1 ? '#ffff40' : '#ffffff', 2, 'center');
        if (e.phase === 'final' || e.phase === 'wait') {
          ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(24, 50, W - 48, 100);
          text(ctx, e.def.name, W / 2, 56, '#ffff40', 1, 'center');
          const v = e.final === null || e.final === undefined ? 'NO MARK' : fmt(e.final) + (e.def.time ? ' SEC' : ' M');
          text(ctx, v, W / 2, 72, '#fff', 2, 'center');
          if (e.newWR) text(ctx, 'NEW WORLD RECORD!', W / 2, 94, (frame >> 3) & 1 ? '#ff4040' : '#ffff40', 1, 'center');
          text(ctx, e.ok ? 'QUALIFIED!' : 'NOT QUALIFIED', W / 2, 108, e.ok ? '#60ff60' : '#ff6060', 1, 'center');
          text(ctx, 'POINTS ' + e.pts, W / 2, 124, '#fff', 1, 'center');
        }
        if (g.roundT > 0) text(ctx, 'ROUND ' + (g.loop + 1), W / 2, 40, '#ffffff', 2, 'center');
      }
      function renderTitle(ctx) {
        drawStadium(ctx, mt * 2);
        ctx.fillStyle = 'rgba(0,0,30,0.7)'; ctx.fillRect(0, 20, W, 76);
        text(ctx, 'TRACK', W / 2 + 2, 26, '#600000', 3, 'center'); text(ctx, 'TRACK', W / 2, 24, '#ff3030', 3, 'center');
        text(ctx, '& FIELD', W / 2 + 2, 54, '#000060', 3, 'center'); text(ctx, '& FIELD', W / 2, 52, '#ffffff', 3, 'center');
        const page = Math.floor(mt / 400) % 2;
        // runners
        const r1 = (mt * 1.6) % (W + 60) - 30, r2 = (mt * 1.45 + 40) % (W + 60) - 30;
        drawAthlete(ctx, r2, LANE_CPU, mt / 9, 'run', '#ffd040', true);
        drawAthlete(ctx, r1, LANE_P, mt / 8, 'run', '#ffffff', true);
        ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(16, 158, W - 32, 46);
        if (page === 0) {
          text(ctx, 'HI SCORE ' + hi, W / 2, 162, '#fff', 1, 'center');
          text(ctx, 'ALTERNATE SPACE & X TO RUN', W / 2, 174, '#ffff40', 1, 'center');
        } else {
          EVENTS.forEach((ev, i) => text(ctx, ev.name.padEnd(13, ' ') + fmt(ev.q0), 30 + (i % 2) * 110 - (i % 2 ? 6 : 0), 162 + (i >> 1) * 9, '#fff'));
        }
        const blink = (mt >> 4) & 1;
        if (coinFlash > 0 ? (coinFlash >> 2) & 1 : api.credits === 0 && blink) text(ctx, 'INSERT COIN', W / 2, 192, '#fff', 1, 'center');
        else if (api.credits > 0 && blink) text(ctx, 'PUSH START', W / 2, 192, '#fff', 1, 'center');
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 20); ctx.fillRect(0, H - 14, W, 14);
        text(ctx, '\u00a9 1983 KONAMI', W / 2, 6, '#ff5050', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 10, '#aaa');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        renderEvent(ctx);
        if (mode === 'over') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 50, 84, 100, 24);
          text(ctx, 'GAME OVER', W / 2, 92, '#fff', 1, 'center');
        }
      }
      return { update, render, destroy() { } };
    }
  });
})();
