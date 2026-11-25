// Hyper Sports (Konami, 1984) - from-scratch recreation.
// Five events: freestyle swimming, skeet shooting, archery, triple jump and weightlifting. Beat the qualifying mark or lose a life.
(function () {
  'use strict';
  // ---------- compact 5x7 bitmap font ----------
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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8]
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
  FONT['%'] = [24, 25, 2, 4, 8, 19, 3];

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = (a, b) => a + Math.random() * (b - a);

  ArcadeRegistry.register({
    id: 'hypersports', title: 'Hyper Sports', year: 1984, maker: 'Konami',
    width: 256, height: 224, vector: false, pointer: false,
    controls: 'Space / X alternately: run, swim, lift \u00b7 Up (or Z): breathe, jump, jerk \u00b7 Skeet: Space/Left = left gun, X/Right = right gun \u00b7 Archery: Up/Down aim, Space fire \u00b7 Enter: start',
    marquee: { bg: '#000', fg: '#ffd800', accent: '#e83030' },
    create(api) {
      const W = 256, H = 224;
      const EVENTS = ['FREESTYLE', 'SKEET SHOOTING', 'ARCHERY', 'TRIPLE JUMP', 'WEIGHTLIFTING'];
      let hi = api.getHiScore(40000);
      let mode = 'title', modeT = 0, coinFlash = 0;
      let score = 0, lives = 3, round = 0, evIdx = 0, ev = null, lastBtn = '', nextExtra = 50000, banner = '', bannerT = 0;
      let records = [24.0, 1600, 4800, 17.2, 230];

      const snd = {
        step() { api.audio.tone(140, 0.03, { type: 'square', vol: 0.06 }); },
        splash() { api.audio.noise(0.12, { vol: 0.08, freq: 2400 }); },
        gun() { api.audio.noise(0.18, { vol: 0.28, freq: 3000, slideTo: 300 }); },
        smash() { api.audio.noise(0.2, { vol: 0.18, freq: 5000, type: 'highpass' }); api.audio.tone(1200, 0.08, { type: 'square', vol: 0.1 }); },
        twang() { api.audio.tone(330, 0.15, { type: 'triangle', vol: 0.18, slideTo: 200 }); },
        thunk() { api.audio.tone(90, 0.1, { type: 'square', vol: 0.18 }); },
        whistle() { api.audio.tone(2400, 0.3, { type: 'sine', vol: 0.12 }); },
        beep(f) { api.audio.tone(f || 880, 0.06, { type: 'square', vol: 0.12 }); },
        fanfare() { api.audio.melody([[523, 0.1], [523, 0.1], [523, 0.1], [698, 0.3], [880, 0.15], [698, 0.15], [1047, 0.45]], { type: 'square', vol: 0.14 }); },
        fail() { api.audio.melody([[392, 0.2], [370, 0.2], [349, 0.2], [330, 0.5]], { type: 'triangle', vol: 0.2 }); },
        gasp() { api.audio.tone(200, 0.25, { type: 'sawtooth', vol: 0.1, slideTo: 90 }); },
        crowd() { api.audio.noise(1.0, { vol: 0.08, freq: 1600, type: 'bandpass' }); }
      };
      function say(t, n) { banner = t; bannerT = n || 60; }

      // alternating-button mash: returns power gained this frame
      function mash() {
        let g = 0;
        const l = api.pressed('Space') || api.pressed('ArrowLeft'), r = api.pressed('KeyX') || api.pressed('ArrowRight');
        if (l) { g += lastBtn === 'L' ? 0.3 : 1; lastBtn = 'L'; }
        if (r) { g += lastBtn === 'R' ? 0.3 : 1; lastBtn = 'R'; }
        return g;
      }
      const actPressed = () => api.pressed('ArrowUp') || api.pressed('KeyZ');
      const actHeld = () => api.key('ArrowUp') || api.key('KeyZ');
      function addScore(n) {
        score += n;
        if (score >= nextExtra) { nextExtra += 70000; lives = Math.min(6, lives + 1); say('EXTRA LIFE!', 90); snd.beep(1320); }
      }
      function qual() {
        const r = Math.min(round, 4);
        return [[30, 28, 26.5, 25.5, 25][r], [9, 11, 12, 13, 14][r], [3000, 3600, 4200, 4600, 5000][r], [14.5, 15.5, 16.3, 16.8, 17.2][r], [150, 175, 195, 210, 225][r]][evIdx];
      }

      // ---------------- athlete sprite ----------------
      function man(ctx, x, y, pose, ph, c) {
        x = Math.round(x); y = Math.round(y);
        const skin = '#f0b080', shirt = c || '#e83030', shorts = '#2040c0';
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - 5, y, 11, 2);
        if (pose === 'air') {
          ctx.fillStyle = skin; ctx.fillRect(x + 2, y - 18, 5, 5);
          ctx.fillStyle = shirt; ctx.fillRect(x - 1, y - 13, 6, 6);
          ctx.fillStyle = shorts; ctx.fillRect(x - 2, y - 7, 5, 3);
          ctx.fillStyle = skin; ctx.fillRect(x + 3, y - 6, 5, 2); ctx.fillRect(x - 4, y - 5, 3, 2); ctx.fillRect(x + 5, y - 12, 4, 2);
          return;
        }
        const leg = Math.floor(ph) % 4;
        // head
        ctx.fillStyle = '#3a2010'; ctx.fillRect(x - 2, y - 24, 5, 2);
        ctx.fillStyle = skin; ctx.fillRect(x - 2, y - 22, 5, 5);
        ctx.fillStyle = shirt; ctx.fillRect(x - 3, y - 17, 7, 7);
        ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 15, 3, 2);
        ctx.fillStyle = shorts; ctx.fillRect(x - 3, y - 10, 7, 3);
        ctx.fillStyle = skin;
        if (pose === 'run') {
          const a = [[-3, 3], [-1, 1], [3, -3], [1, -1]][leg];
          ctx.fillRect(x - 2 + a[0], y - 7, 2, 7); ctx.fillRect(x + 1 + a[1], y - 7, 2, 7);
          ctx.fillRect(x - 5 - a[0], y - 16, 2, 5); ctx.fillRect(x + 4 - a[1], y - 16, 2, 5);
        } else {
          ctx.fillRect(x - 2, y - 7, 2, 7); ctx.fillRect(x + 1, y - 7, 2, 7);
          if (pose === 'up') { ctx.fillRect(x - 5, y - 28, 2, 12); ctx.fillRect(x + 4, y - 28, 2, 12); }
          else if (pose === 'clean') { ctx.fillRect(x - 5, y - 20, 2, 5); ctx.fillRect(x + 4, y - 20, 2, 5); }
          else if (pose === 'squat') { ctx.fillRect(x - 5, y - 10, 2, 6); ctx.fillRect(x + 4, y - 10, 2, 6); }
          else if (pose === 'aim') { ctx.fillRect(x + 2, y - 16, 8, 2); ctx.fillRect(x - 4, y - 16, 2, 5); }
          else { ctx.fillRect(x - 5, y - 16, 2, 7); ctx.fillRect(x + 4, y - 16, 2, 7); }
        }
        ctx.fillStyle = '#fff'; ctx.fillRect(x - 3, y - 1, 3, 1); ctx.fillRect(x + 1, y - 1, 3, 1);
      }

      // ================= EVENTS =================
      // ---- 1. Freestyle swimming (50 m) ----
      const Swim = {
        init() { this.x = 0; this.v = 0; this.t = 0; this.ph = 0; this.rx = 0; this.rv = 50 / (qual() - 1.5); this.br = 150; this.win = 0; this.stall = 0; this.done = false; this.go = 90; this.splashT = 0; this.waves = 0; },
        update() {
          if (this.go > 0) { this.go--; if (this.go === 60 || this.go === 30) snd.beep(660); if (this.go === 0) snd.gun(); return; }
          if (this.done) return;
          const k = 1.6 / 60;
          this.t += k; this.waves++;
          if (this.stall > 0) { this.stall--; this.v *= 0.95; }
          else { const g = mash(); if (g) { this.v = Math.min(2.8, this.v + 0.12 * g); if (++this.splashT % 2 === 0) snd.splash(); } this.v *= 0.992; }
          // breathing
          if (this.win > 0) {
            this.win--;
            if (actPressed()) { this.win = 0; this.br = rnd(140, 210); addScore(100); say('GOOD BREATH', 30); snd.beep(990); }
            else if (this.win === 0) { this.stall = 40; this.v *= 0.4; this.br = rnd(140, 210); snd.gasp(); say('GASP!', 40); }
          } else if (--this.br <= 0) { this.win = 50; snd.beep(1500); }
          this.x += this.v * k; this.ph += this.v * 0.12;
          this.rx = Math.min(50, this.rx + this.rv * k * (0.97 + Math.sin(this.t) * 0.05));
          if (this.x >= 50) {
            this.x = 50; this.done = true;
            const q = qual(), ok = this.t <= q;
            const pts = ok ? Math.round((q + 6 - this.t) * 400) : 0;
            finishEvent(ok, this.t.toFixed(2) + ' SEC', pts, this.t < records[0] ? (records[0] = this.t, true) : false);
          }
        },
        render(ctx) {
          const px = 10, cam = clamp(this.x * px - 80, 0, 50 * px + 60 - W);
          ctx.fillStyle = '#d8d8d0'; ctx.fillRect(0, 40, W, 150);
          ctx.fillStyle = '#1a60d0'; ctx.fillRect(0, 60, W, 110);
          for (let i = 0; i < 40; i++) { const wx = ((i * 41 - this.waves * 0.6 - cam) % 300 + 300) % 300 - 20; ctx.fillStyle = '#4a90f0'; ctx.fillRect(wx, 64 + (i * 13) % 100, 6, 1); }
          // lane ropes
          for (let l = 0; l <= 4; l++) { const y = 60 + l * 27; for (let x = -((cam | 0) % 8); x < W; x += 8) { ctx.fillStyle = (x + (cam | 0)) % 16 < 8 ? '#e83030' : '#fff'; ctx.fillRect(x, y - 1, 6, 2); } }
          // distance markers / walls
          for (let m = 0; m <= 50; m += 5) { const x = Math.round(m * px - cam + 20); if (x < -20 || x > W + 20) continue; ctx.fillStyle = m % 25 ? '#3a78e0' : '#0a3a90'; ctx.fillRect(x, 60, 1, 108); text(ctx, m + 'M', x, 46, '#333', 1, 'center'); }
          const wx = Math.round(50 * px - cam + 20); ctx.fillStyle = '#eee'; ctx.fillRect(wx, 56, 8, 116);
          const sw = (x, lane, col, ph, moving) => {
            const sx = Math.round(x * px - cam + 20), sy = 60 + lane * 27 + 13;
            ctx.fillStyle = '#fff'; if (moving) for (let k = 0; k < 3; k++) ctx.fillRect(sx - 14 - k * 5 + ((ph * 4 | 0) % 3), sy - 1 + (k & 1) * 2, 3, 1);
            ctx.fillStyle = '#f0b080'; ctx.fillRect(sx - 12, sy - 1, 14, 3);
            ctx.fillStyle = col; ctx.fillRect(sx + 1, sy - 2, 5, 4);
            const a = Math.floor(ph) % 2;
            ctx.fillStyle = '#f0b080'; if (a) ctx.fillRect(sx + 4, sy - 6, 2, 5); else ctx.fillRect(sx - 4, sy + 1, 2, 4);
            ctx.fillRect(sx + 6 * (a ? 0 : 1) - 1, sy - 1, 4, 2);
          };
          sw(this.rx, 1, '#30c030', this.t * 3, this.go === 0);
          sw(this.x, 2, '#e83030', this.ph, this.v > 0.2);
          hudLine(ctx, 'TIME ' + this.t.toFixed(2), 'QUALIFY ' + qual().toFixed(2));
          // speed meter + breath indicator
          ctx.fillStyle = '#000'; ctx.fillRect(16, 196, 100, 8); ctx.fillStyle = '#ffd800'; ctx.fillRect(17, 197, Math.round(98 * this.v / 2.8), 6);
          text(ctx, 'SPEED', 16, 186, '#fff');
          if (this.win > 0 && (api.frame & 4)) text(ctx, 'BREATHE! (UP)', 180, 192, '#ff0', 1, 'center');
          if (this.go > 0) text(ctx, this.go > 30 ? 'READY' : 'SET', W / 2, 100, '#fff', 3, 'center');
        }
      };

      // ---- 2. Skeet shooting ----
      const Skeet = {
        init() {
          this.vol = 0; this.nVol = 12; this.hits = 0; this.clays = []; this.t = 60; this.shot = [false, false]; this.flash = [0, 0]; this.bits = []; this.done = false; this.thrown = 0;
          this.sight = [{ x: 74, y: 92 }, { x: 182, y: 92 }];
        },
        launch() {
          const pat = ['L', 'R', 'LR', 'L', 'R', 'LR'][Math.random() * 6 | 0];
          const sp = 1 + this.vol * 0.03 + round * 0.08;
          for (const s of pat) {
            const left = s === 'L';
            const s0 = this.sight[left ? 0 : 1], x0 = left ? 6 : W - 6, y0 = 170, T = rnd(42, 56) / sp, g = 0.05 * sp * sp;
            const tx = s0.x + rnd(-6, 6), ty = s0.y + rnd(-6, 6);
            this.clays.push({ side: left ? 0 : 1, x: x0, y: y0, vx: (tx - x0) / T, vy: (ty - y0 - 0.5 * g * T * T) / T, g, alive: true });
            this.thrown++;
          }
          this.shot = [false, false]; snd.thunk();
        },
        update() {
          if (this.done) return;
          for (let i = 0; i < 2; i++) if (this.flash[i] > 0) this.flash[i]--;
          if (this.clays.length === 0) {
            if (this.vol >= this.nVol) {
              this.done = true; const q = qual(), ok = this.hits >= q;
              const pts = this.hits * 100 + (this.hits === this.thrown ? 2000 : 0);
              finishEvent(ok, this.hits + ' HITS', ok ? pts : 0, this.hits > records[1] / 100 ? (records[1] = this.hits * 100, true) : false);
              return;
            }
            if (--this.t <= 0) { this.launch(); this.vol++; this.t = 50; }
            return;
          }
          const fire = [api.pressed('Space') || api.pressed('ArrowLeft'), api.pressed('KeyX') || api.pressed('ArrowRight')];
          for (let i = 0; i < 2; i++) if (fire[i] && !this.shot[i]) {
            this.shot[i] = true; this.flash[i] = 8; snd.gun();
            const s = this.sight[i];
            for (const c of this.clays) if (c.alive && c.side === i && Math.abs(c.x - s.x) < 13 && Math.abs(c.y - s.y) < 13) {
              c.alive = false; this.hits++; addScore(100); snd.smash();
              const perfect = Math.abs(c.x - s.x) < 5 && Math.abs(c.y - s.y) < 5;
              if (perfect) { addScore(400); say('PERFECT 500', 40); }
              for (let k = 0; k < 12; k++) this.bits.push({ x: c.x, y: c.y, vx: rnd(-2, 2), vy: rnd(-2, 1), l: 30 });
            }
          }
          for (const c of this.clays) { c.x += c.vx; c.y += c.vy; c.vy += c.g; if (c.y > 190 || c.x < -10 || c.x > W + 10) c.alive = false; }
          this.clays = this.clays.filter(c => c.alive);
          for (let k = this.bits.length - 1; k >= 0; k--) { const b = this.bits[k]; b.x += b.vx; b.y += b.vy; b.vy += 0.1; if (--b.l <= 0) this.bits.splice(k, 1); }
        },
        render(ctx) {
          const sky = ctx.createLinearGradient ? null : null;
          ctx.fillStyle = '#60a8f0'; ctx.fillRect(0, 24, W, 120);
          ctx.fillStyle = '#8cc8ff'; ctx.fillRect(0, 100, W, 44);
          ctx.fillStyle = '#2a8a2a'; ctx.fillRect(0, 144, W, 56);
          for (let i = 0; i < 12; i++) { ctx.fillStyle = '#1a6a1a'; ctx.beginPath(); ctx.arc(i * 24 + 6, 146, 12, Math.PI, 0); ctx.fill(); }
          // trap houses
          ctx.fillStyle = '#806040'; ctx.fillRect(0, 166, 16, 14); ctx.fillRect(W - 16, 166, 16, 14);
          ctx.fillStyle = '#402010'; ctx.fillRect(2, 168, 10, 4); ctx.fillRect(W - 12, 168, 10, 4);
          // shooter
          man(ctx, W / 2, 196, 'aim', 0, '#e83030');
          ctx.fillStyle = '#333'; ctx.fillRect(W / 2 + 4, 178, 12, 2);
          for (let i = 0; i < 2; i++) {
            const s = this.sight[i], c = this.flash[i] ? '#fff' : (this.shot[i] ? '#888' : '#ff2020');
            ctx.fillStyle = c;
            ctx.fillRect(s.x - 13, s.y - 13, 26, 1); ctx.fillRect(s.x - 13, s.y + 12, 26, 1); ctx.fillRect(s.x - 13, s.y - 13, 1, 26); ctx.fillRect(s.x + 12, s.y - 13, 1, 26);
            ctx.fillRect(s.x - 3, s.y, 7, 1); ctx.fillRect(s.x, s.y - 3, 1, 7);
            text(ctx, i ? 'R' : 'L', s.x, s.y - 22, '#fff', 1, 'center');
          }
          for (const c of this.clays) { ctx.fillStyle = '#ff8a20'; ctx.fillRect(Math.round(c.x) - 3, Math.round(c.y) - 1, 7, 3); ctx.fillStyle = '#ffd0a0'; ctx.fillRect(Math.round(c.x) - 2, Math.round(c.y) - 1, 4, 1); }
          for (const b of this.bits) { ctx.fillStyle = '#ff8a20'; ctx.fillRect(Math.round(b.x), Math.round(b.y), 2, 2); }
          hudLine(ctx, 'HITS ' + this.hits + '/' + this.thrown, 'QUALIFY ' + qual());
          text(ctx, 'VOLLEY ' + Math.min(this.vol, this.nVol) + '/' + this.nVol, W / 2, 204, '#fff', 1, 'center');
        }
      };

      // ---- 3. Archery ----
      const Archery = {
        init() { this.n = 0; this.max = 6; this.total = 0; this.ang = 4; this.ty = 120; this.tv = 0.7 + round * 0.15; this.arrow = null; this.wind = Math.round(rnd(-3, 3)); this.stuck = []; this.wait = 40; this.done = false; this.last = ''; },
        update() {
          if (this.done) return;
          this.ty += this.tv; if (this.ty < 66 || this.ty > 176) this.tv = -this.tv;
          if (this.wait > 0) { this.wait--; return; }
          if (!this.arrow) {
            if (api.key('ArrowUp')) this.ang = Math.min(25, this.ang + 0.15);
            if (api.key('ArrowDown')) this.ang = Math.max(-5, this.ang - 0.15);
            if (api.pressed('Space') || api.pressed('KeyX') || api.pressed('KeyZ')) {
              const a = this.ang * Math.PI / 180;
              this.arrow = { x: 36, y: 150, vx: 6 * Math.cos(a), vy: -6 * Math.sin(a) }; snd.twang();
            }
            return;
          }
          const ar = this.arrow;
          ar.x += ar.vx; ar.y += ar.vy; ar.vy += 0.035 - this.wind * 0.004;
          if (ar.x >= 226) {
            const d = Math.abs(ar.y - this.ty);
            const pts = d < 2.5 ? 1000 : d < 5.5 ? 800 : d < 8.5 ? 600 : d < 11.5 ? 400 : d < 14.5 ? 200 : 0;
            this.total += pts; addScore(pts); this.n++;
            this.last = pts ? String(pts) : 'MISS';
            if (pts) { this.stuck.push(ar.y - this.ty); snd.thunk(); if (pts === 1000) { say('BULLSEYE!', 50); snd.beep(1400); } } else api.audio.noise(0.1, { vol: 0.1, freq: 800 });
            this.arrow = null; this.wait = 50; this.wind = Math.round(rnd(-3, 3));
            if (this.n >= this.max) {
              this.done = true; const ok = this.total >= qual();
              finishEvent(ok, this.total + ' POINTS', ok ? Math.round(this.total / 2) : 0, this.total > records[2] ? (records[2] = this.total, true) : false);
            }
          }
          if (ar.y > 210 || ar.y < -40) { this.n++; this.last = 'MISS'; this.arrow = null; this.wait = 40; if (this.n >= this.max) { this.done = true; const ok = this.total >= qual(); finishEvent(ok, this.total + ' POINTS', ok ? Math.round(this.total / 2) : 0, false); } }
        },
        render(ctx) {
          ctx.fillStyle = '#70b8f8'; ctx.fillRect(0, 24, W, 90);
          ctx.fillStyle = '#3a9a3a'; ctx.fillRect(0, 114, W, 90);
          for (let i = 0; i < 16; i++) { ctx.fillStyle = '#2a7a2a'; ctx.fillRect(i * 16, 114, 8, 90); }
          ctx.fillStyle = '#fff'; ctx.fillRect(4, 40, 20, 1);
          // target on a vertical track
          ctx.fillStyle = '#806040'; ctx.fillRect(238, 50, 3, 150);
          const ty = Math.round(this.ty);
          const rings = ['#fff', '#000', '#3060f0', '#e82020', '#ffd800'];
          for (let r = 0; r < 5; r++) { ctx.fillStyle = rings[r]; ctx.fillRect(226, ty - 15 + r * 3, 8, 30 - r * 6); }
          for (const s of this.stuck) { ctx.fillStyle = '#5a3010'; ctx.fillRect(218, Math.round(ty + s), 9, 1); }
          man(ctx, 26, 160, 'aim', 0, '#e83030');
          // bow with angle
          const a = this.ang * Math.PI / 180;
          ctx.strokeStyle = '#8a5020'; ctx.beginPath(); ctx.arc(34, 148, 8, -Math.PI / 2 - a + 0.3, Math.PI / 2 - a - 0.3); ctx.stroke();
          if (!this.arrow) { ctx.fillStyle = '#ddd'; ctx.fillRect(28, 148, 1, 1); ctx.strokeStyle = '#ddd'; ctx.beginPath(); ctx.moveTo(26, 149 + Math.sin(a) * 2); ctx.lineTo(26 + Math.cos(a) * 16, 149 - Math.sin(a) * 16); ctx.stroke(); }
          else { const ar = this.arrow; ctx.strokeStyle = '#eee'; ctx.beginPath(); ctx.moveTo(ar.x - ar.vx * 2, ar.y - ar.vy * 2); ctx.lineTo(ar.x, ar.y); ctx.stroke(); }
          hudLine(ctx, 'POINTS ' + this.total, 'QUALIFY ' + qual());
          text(ctx, 'ANGLE ' + this.ang.toFixed(1), 8, 190, '#fff');
          text(ctx, 'WIND ' + (this.wind > 0 ? '+' : '') + this.wind, 96, 190, this.wind ? '#ff0' : '#fff');
          text(ctx, 'ARROW ' + Math.min(this.max, this.n + 1) + '/' + this.max, 170, 190, '#fff');
          if (this.wait > 0 && this.last) text(ctx, this.last, 190, 60, this.last === 'MISS' ? '#f44' : '#ff0', 2, 'center');
        }
      };

      // ---- 4. Triple jump ----
      const Triple = {
        init() { this.att = 0; this.best = 0; this.marks = []; this.reset(); },
        reset() { this.x = 0; this.v = 0; this.st = 'run'; this.ph = 0; this.phase = 0; this.ang = 0; this.jx = 0; this.air = null; this.dist = 0; this.wait = 0; this.res = ''; this.landT = 0; this.y = 0; },
        jump(ang) {
          const a = clamp(ang, 5, 70) * Math.PI / 180, k = [0.78, 0.65, 0.94][this.phase];
          const d = this.v * this.v * Math.sin(2 * a) / 9.8 * k;
          this.air = { x0: this.x, d, t: 0, T: Math.max(14, Math.round(d * 4.2)), h: d * Math.tan(a) * 0.25 };
          this.st = 'air'; snd.beep(700 + this.phase * 200);
        },
        update() {
          if (this.st === 'done') return;
          if (this.st === 'result') {
            if (--this.wait <= 0) {
              this.att++;
              const q = qual();
              if (this.best >= q || this.att >= 3) {
                this.st = 'done'; const ok = this.best >= q;
                finishEvent(ok, this.best.toFixed(2) + ' M', ok ? Math.round(this.best * 300) : 0, this.best > records[3] ? (records[3] = this.best, true) : false);
              } else this.reset();
            }
            return;
          }
          const BOARD = 40;
          if (this.st === 'run') {
            const g = mash(); if (g) { this.v = Math.min(11, this.v + 0.42 * g); }
            this.v *= 0.993; this.x += this.v / 60 * 1.2; this.ph += this.v * 0.06;
            if (g && (api.frame & 3) === 0) snd.step();
            if (actHeld() && this.x > BOARD - 14) { this.st = 'angle'; this.ang = 0; }
            if (this.x > BOARD + 0.3) { this.foul(); }
          } else if (this.st === 'angle') {
            this.ang += 3; this.x += this.v / 60 * (this.phase ? 0.4 : 1.2); this.ph += this.v * 0.06;
            if (this.phase === 0 && this.x > BOARD + 0.3) { this.foul(); return; }
            if (!actHeld() || this.ang >= 75) {
              if (this.phase === 0) this.takeoff = this.x;
              this.jump(this.ang);
            }
          } else if (this.st === 'air') {
            const a = this.air; a.t++;
            const t = a.t / a.T; this.x = a.x0 + a.d * t; this.y = a.h * 4 * t * (1 - t);
            if (a.t >= a.T) {
              this.y = 0; this.phase++; snd.thunk();
              this.v *= 0.9;
              if (this.phase >= 3) this.land();
              else { this.st = 'link'; this.landT = 24; }
            }
          } else if (this.st === 'link') {
            // must press again quickly for the step / jump
            this.x += this.v / 60 * 0.4;
            if (actHeld()) { this.st = 'angle'; this.ang = 0; }
            else if (--this.landT <= 0) this.land();
          }
        },
        foul() { this.st = 'result'; this.res = 'FOUL'; this.wait = 120; snd.fail(); this.marks.push('FOUL'); },
        land() {
          const d = Math.max(0, this.x - 40);
          this.dist = Math.round(d * 100) / 100;
          this.best = Math.max(this.best, this.dist);
          this.st = 'result'; this.res = this.dist.toFixed(2) + ' M'; this.wait = 140; snd.crowd();
          this.marks.push(this.dist.toFixed(2));
          if (this.dist >= qual()) say('QUALIFIED!', 80);
        },
        render(ctx) {
          const px = 12, cam = clamp(this.x * px - 90, 0, 70 * px - W);
          ctx.fillStyle = '#70b8f8'; ctx.fillRect(0, 24, W, 70);
          for (let i = 0; i < 26; i++) { const x = ((i * 23 - cam * 0.3) % (W + 30) + W + 30) % (W + 30) - 15; ctx.fillStyle = ['#e83030', '#3060f0', '#ffd800', '#ddd'][i & 3]; ctx.fillRect(x, 70 + (i % 3) * 6, 4, 4); ctx.fillStyle = '#f0b080'; ctx.fillRect(x, 67 + (i % 3) * 6, 4, 3); }
          ctx.fillStyle = '#505060'; ctx.fillRect(0, 90, W, 8);
          ctx.fillStyle = '#2a8a2a'; ctx.fillRect(0, 98, W, 110);
          ctx.fillStyle = '#c05030'; ctx.fillRect(0, 140, W, 26);
          // board and sand pit
          const bx = Math.round(40 * px - cam);
          ctx.fillStyle = '#fff'; ctx.fillRect(bx - 4, 140, 4, 26);
          ctx.fillStyle = '#e8d090'; ctx.fillRect(bx + 4 * px, 138, 22 * px, 30);
          for (let m = 10; m <= 20; m += 1) { const x = Math.round((40 + m) * px - cam); ctx.fillStyle = '#b09050'; ctx.fillRect(x, 168, 1, m % 5 ? 3 : 6); if (m % 5 === 0) text(ctx, m + 'M', x, 172, '#fff', 1, 'center'); }
          const qx = Math.round((40 + qual()) * px - cam); ctx.fillStyle = '#ff2020'; ctx.fillRect(qx, 132, 1, 40); text(ctx, 'Q', qx, 124, '#ff2020', 1, 'center');
          for (let m = 0; m < 70; m += 5) { const x = Math.round(m * px - cam); ctx.fillStyle = '#e07050'; ctx.fillRect(x, 140, 1, 26); }
          const sx = Math.round(this.x * px - cam), sy = 160 - Math.round(this.y * 6);
          const pose = this.st === 'air' ? 'air' : this.st === 'result' || this.st === 'done' ? (this.res === 'FOUL' ? 'stand' : 'squat') : 'run';
          man(ctx, sx, sy, pose, this.ph, '#e83030');
          hudLine(ctx, 'BEST ' + this.best.toFixed(2) + 'M', 'QUALIFY ' + qual().toFixed(2));
          ctx.fillStyle = '#000'; ctx.fillRect(10, 194, 82, 8); ctx.fillStyle = '#ffd800'; ctx.fillRect(11, 195, Math.round(80 * this.v / 11), 6);
          text(ctx, 'SPEED', 10, 184, '#fff');
          text(ctx, 'JUMP ' + Math.min(3, this.att + 1) + '/3', 112, 184, '#fff');
          if (this.st === 'angle' || (this.st === 'air' && this.air.t < 10)) {
            const a = this.ang * Math.PI / 180; ctx.strokeStyle = '#ff0'; ctx.beginPath(); ctx.moveTo(200, 200); ctx.lineTo(200 + Math.cos(a) * 30, 200 - Math.sin(a) * 30); ctx.stroke();
            text(ctx, Math.round(this.ang) + '', 236, 190, '#ff0', 1, 'center');
          }
          const ph = ['HOP', 'STEP', 'JUMP'][Math.min(2, this.phase)];
          if (this.st === 'link' && (api.frame & 4)) text(ctx, ph + '! (UP)', sx, sy - 40, '#ff0', 1, 'center');
          if (this.st === 'run' && this.x > 26 && (api.frame & 8)) text(ctx, 'HOLD UP AT THE BOARD', W / 2, 108, '#fff', 1, 'center');
          if (this.st === 'result') text(ctx, this.res, W / 2, 104, this.res === 'FOUL' ? '#f44' : '#fff', 2, 'center');
          this.marks.forEach((m, i) => text(ctx, (i + 1) + ': ' + m, 176, 30 + i * 10, '#000'));
        }
      };

      // ---- 5. Weightlifting ----
      const Lift = {
        init() { const q = qual(); this.weights = [q - 15, q, q + 20]; this.att = 0; this.best = 0; this.reset(); },
        reset() { this.p = 0; this.st = 'clean'; this.t = 0; this.needle = 0; this.nv = 2.2 + round * 0.3 + this.att * 0.3; this.wait = 0; this.res = ''; this.lights = 0; this.swings = 0; },
        update() {
          const w = this.weights[this.att];
          if (this.st === 'done') return;
          if (this.st === 'result') {
            if (--this.wait <= 0) {
              this.att++;
              if (this.att >= 3) {
                this.st = 'done'; const ok = this.best >= qual();
                finishEvent(ok, this.best + ' KG', ok ? this.best * 20 : 0, this.best > records[4] ? (records[4] = this.best, true) : false);
              } else this.reset();
            }
            return;
          }
          this.t++;
          if (this.st === 'clean') {
            const g = mash();
            this.p += g * Math.max(2, 8 - (w - 100) * 0.03);
            this.p = Math.max(0, this.p - (0.15 + (w - 100) * 0.002));
            if (g && (api.frame & 1)) api.audio.tone(100 + this.p * 3, 0.03, { type: 'square', vol: 0.05 });
            if (this.p >= 100) { this.st = 'jerk'; this.t = 0; snd.beep(880); }
            else if (this.t > 420) this.fail();
          } else if (this.st === 'jerk') {
            this.needle += this.nv; if (this.needle > 100 || this.needle < 0) { this.nv = -this.nv; this.swings++; }
            const zone = Math.max(8, 24 - (w - 140) * 0.12);
            if (actPressed() || api.pressed('Space') || api.pressed('KeyX')) {
              if (Math.abs(this.needle - 50) < zone / 2) { this.st = 'up'; this.t = 0; snd.beep(1200); }
              else this.fail();
            } else if (this.swings > 5) this.fail();
          } else if (this.st === 'up') {
            if (this.t === 60) { this.lights = 3; snd.fanfare(); }
            if (this.t > 120) { this.best = Math.max(this.best, w); this.st = 'result'; this.res = 'GOOD LIFT'; this.wait = 60; addScore(w * 5); }
          }
        },
        fail() { this.st = 'result'; this.res = 'NO LIFT'; this.wait = 120; snd.thunk(); snd.gasp(); this.lights = -3; },
        render(ctx) {
          ctx.fillStyle = '#301830'; ctx.fillRect(0, 24, W, 180);
          for (let i = 0; i < 40; i++) { ctx.fillStyle = ['#c33', '#33c', '#cc3', '#ddd'][i & 3]; ctx.fillRect((i * 29) % W, 40 + (i * 7) % 50, 3, 3); }
          ctx.fillStyle = '#806040'; ctx.fillRect(60, 160, 136, 12); ctx.fillStyle = '#a07850'; ctx.fillRect(60, 160, 136, 2);
          const w = this.weights[Math.min(2, this.att)];
          const barY = this.st === 'clean' ? 152 - this.p * 0.22 : this.st === 'jerk' ? 126 : this.st === 'up' ? 108 : this.res === 'GOOD LIFT' ? 108 : 154;
          const pose = this.st === 'clean' ? (this.p > 50 ? 'clean' : 'squat') : this.st === 'jerk' ? 'clean' : this.st === 'up' || this.res === 'GOOD LIFT' ? 'up' : 'squat';
          man(ctx, 128, 160, pose, 0, '#e83030');
          ctx.fillStyle = '#ccc'; ctx.fillRect(96, Math.round(barY), 64, 2);
          const plates = 2 + Math.floor((w - 100) / 40);
          for (let k = 0; k < plates; k++) { ctx.fillStyle = ['#e82020', '#2040e0', '#ffd800', '#20a020'][k % 4]; ctx.fillRect(98 + k * 4, Math.round(barY) - 10, 3, 22); ctx.fillRect(155 - k * 4, Math.round(barY) - 10, 3, 22); }
          // judges' lights
          for (let k = 0; k < 3; k++) { ctx.fillStyle = this.lights > k ? '#fff' : this.lights < 0 && -this.lights > k ? '#f22' : '#333'; ctx.beginPath(); ctx.arc(100 + k * 28, 44, 6, 0, TAU); ctx.fill(); }
          hudLine(ctx, 'WEIGHT ' + w + 'KG', 'QUALIFY ' + qual() + 'KG');
          text(ctx, 'LIFT ' + Math.min(3, this.att + 1) + '/3', 8, 60, '#fff'); text(ctx, 'BEST ' + this.best, 8, 72, '#fff');
          if (this.st === 'clean') {
            ctx.fillStyle = '#000'; ctx.fillRect(40, 186, 176, 10); ctx.fillStyle = this.p > 70 ? '#ff4040' : '#ffd800'; ctx.fillRect(41, 187, Math.round(174 * this.p / 100), 8);
            text(ctx, 'POWER - MASH SPACE / X', W / 2, 176, '#fff', 1, 'center');
          }
          if (this.st === 'jerk') {
            const zone = Math.max(8, 24 - (w - 140) * 0.12);
            ctx.fillStyle = '#000'; ctx.fillRect(40, 186, 176, 10);
            ctx.fillStyle = '#20c020'; ctx.fillRect(Math.round(40 + 176 * (50 - zone / 2) / 100), 187, Math.round(176 * zone / 100), 8);
            ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(40 + 176 * this.needle / 100), 184, 2, 14);
            text(ctx, 'JERK! PRESS UP IN THE GREEN', W / 2, 176, (api.frame & 8) ? '#ff0' : '#fff', 1, 'center');
          }
          if (this.st === 'result') text(ctx, this.res, W / 2, 120, this.res === 'GOOD LIFT' ? '#fff' : '#f44', 2, 'center');
        }
      };
      const EV = [Swim, Skeet, Archery, Triple, Lift];

      // ---------------- shared flow ----------------
      function hudLine(ctx, a, b) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 24);
        text(ctx, '1UP ' + String(score).padStart(6, '0'), 4, 3, '#fff');
        text(ctx, 'HI ' + String(Math.max(hi, score)).padStart(6, '0'), W - 4, 3, '#ff0', 1, 'right');
        text(ctx, a, 4, 14, '#8cf'); text(ctx, b, W - 4, 14, '#f88', 1, 'right');
        for (let i = 0; i < Math.min(6, lives - 1); i++) { ctx.fillStyle = '#e83030'; ctx.fillRect(100 + i * 8, 4, 5, 5); ctx.fillStyle = '#f0b080'; ctx.fillRect(101 + i * 8, 1, 3, 3); }
        ctx.fillStyle = '#000'; ctx.fillRect(0, H - 14, W, 14);
        text(ctx, EVENTS[evIdx], W / 2, H - 10, '#ffd800', 1, 'center');
      }
      function finishEvent(ok, resText, pts, record) {
        ev.result = { ok, resText, pts, record };
        if (ok) { addScore(pts + (record ? 5000 : 0)); snd.fanfare(); } else snd.fail();
        mode = 'result'; modeT = 0;
      }
      function beginEvent() { ev = EV[evIdx]; ev.result = null; ev.init(); lastBtn = ''; mode = 'intro'; modeT = 0; }
      function startGame() { score = 0; lives = 3; round = 0; evIdx = 0; nextExtra = 50000; beginEvent(); }
      function tryStart() {
        if (api.useCredit()) { startGame(); return; }
        coinFlash = 90; api.audio.tone(70, 0.25, { type: 'square', vol: 0.2 });
      }
      function afterResult() {
        const r = ev.result;
        if (r.ok) {
          evIdx++;
          if (evIdx >= EVENTS.length) { evIdx = 0; round++; mode = 'roundclear'; modeT = 0; addScore(10000); snd.fanfare(); return; }
          beginEvent();
        } else {
          lives--;
          if (lives <= 0) {
            mode = 'held';
            const end = () => { if (score > hi) hi = score; api.setHiScore(score); mode = 'gameover'; modeT = 0; };
            if (api.offerContinue) api.offerContinue(() => { lives = 1; beginEvent(); }, end); else end();
          } else beginEvent();
        }
      }

      // attract: show events rotating
      let demoEv = 0;
      function update() {
        modeT++;
        if (coinFlash > 0) coinFlash = api.credits > 0 ? 0 : coinFlash - 1;
        if (bannerT > 0) bannerT--;
        switch (mode) {
          case 'title':
            if (modeT % 300 === 0) demoEv = (demoEv + 1) % EVENTS.length;
            if (api.anyPressed('Enter', 'Space')) tryStart();
            break;
          case 'intro':
            if (modeT > 150 || (modeT > 40 && api.anyPressed('Enter'))) { mode = 'play'; modeT = 0; snd.whistle(); }
            break;
          case 'play': ev.update(); break;
          case 'result':
            if (modeT > 220 || (modeT > 60 && api.anyPressed('Enter'))) afterResult();
            break;
          case 'roundclear':
            if (modeT > 240) beginEvent();
            break;
          case 'held': break;
          case 'gameover':
            if (modeT > 300) { mode = 'title'; modeT = 0; }
            break;
        }
      }
      function credStr() { return 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'); }
      function panel(ctx, x, y, w, h, c) { ctx.fillStyle = 'rgba(0,0,0,.85)'; ctx.fillRect(x, y, w, h); ctx.fillStyle = c || '#ffd800'; ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + h - 2, w, 2); }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title' || mode === 'gameover') {
          // stadium backdrop
          ctx.fillStyle = '#101040'; ctx.fillRect(0, 0, W, H);
          for (let i = 0; i < 60; i++) { ctx.fillStyle = ['#c33', '#33c', '#cc3', '#ddd'][i & 3]; ctx.fillRect((i * 37 + (api.frame >> 3)) % W, 150 + (i * 11) % 30, 3, 3); }
          ctx.fillStyle = '#c05030'; ctx.fillRect(0, 186, W, 38);
          for (let i = 0; i < 4; i++) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 192 + i * 8, W, 1); }
          text(ctx, 'HYPER', W / 2 + 2, 22, '#600', 4, 'center'); text(ctx, 'HYPER', W / 2, 20, '#ffd800', 4, 'center');
          text(ctx, 'SPORTS', W / 2 + 2, 54, '#600', 4, 'center'); text(ctx, 'SPORTS', W / 2, 52, '#e83030', 4, 'center');
          if (mode === 'gameover') {
            text(ctx, 'GAME OVER', W / 2, 100, '#fff', 2, 'center');
            text(ctx, 'SCORE ' + score, W / 2, 124, '#ff0', 1, 'center');
          } else {
            EVENTS.forEach((e, i) => text(ctx, (i + 1) + '. ' + e, 64, 90 + i * 10, i === demoEv ? '#ff0' : '#fff'));
            text(ctx, 'HI-SCORE ' + String(hi).padStart(6, '0'), W / 2, 146, '#8cf', 1, 'center');
            man(ctx, 30 + ((modeT * 1.4) % 220), 210, 'run', modeT * 0.3, '#e83030');
            const blink = (api.frame >> 4) & 1;
            if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 162, '#fff', 1, 'center'); }
            else if (api.credits > 0) text(ctx, 'PUSH START', W / 2, 162, blink ? '#fff' : '#666', 1, 'center');
            else if (blink) text(ctx, 'INSERT COIN', W / 2, 162, '#fff', 1, 'center');
          }
          text(ctx, '\u00a9 1984 KONAMI', W / 2, 174, '#aaa', 1, 'center');
          text(ctx, credStr(), 4, H - 9, '#fff');
          return;
        }
        if (!ev) return;
        ev.render(ctx);
        if (bannerT > 0 && mode === 'play') text(ctx, banner, W / 2, 32, (bannerT >> 2) & 1 ? '#ff0' : '#fff', 1, 'center');
        if (mode === 'intro') {
          panel(ctx, 28, 70, 200, 76);
          text(ctx, 'EVENT ' + (evIdx + 1) + (round ? '  ROUND ' + (round + 1) : ''), W / 2, 78, '#ccc', 1, 'center');
          text(ctx, EVENTS[evIdx], W / 2, 92, '#ffd800', 2, 'center');
          const q = qual(), unit = [' SEC', ' HITS', ' PTS', ' M', ' KG'][evIdx];
          text(ctx, 'QUALIFY ' + (evIdx === 0 || evIdx === 3 ? q.toFixed(2) : q) + unit, W / 2, 114, '#fff', 1, 'center');
          const tips = ['ALTERNATE SPACE/X, UP TO BREATHE', 'FIRE WHEN CLAY IS IN THE SIGHT', 'UP/DOWN TO AIM, SPACE TO SHOOT', 'RUN, HOLD UP FOR ANGLE x3', 'MASH TO CLEAN, UP TO JERK'];
          text(ctx, tips[evIdx].replace('x3', ''), W / 2, 130, '#8cf', 1, 'center');
        }
        if (mode === 'result' && ev.result) {
          const r = ev.result;
          panel(ctx, 28, 70, 200, 80, r.ok ? '#30d030' : '#f03030');
          text(ctx, r.resText, W / 2, 80, '#fff', 2, 'center');
          if (r.record && r.ok && (api.frame & 8)) text(ctx, 'NEW WORLD RECORD!', W / 2, 102, '#ff0', 1, 'center');
          text(ctx, r.ok ? 'QUALIFIED!' : 'NOT QUALIFIED', W / 2, 116, r.ok ? '#30d030' : '#f03030', 2, 'center');
          if (r.ok) text(ctx, 'BONUS ' + (r.pts + (r.record ? 5000 : 0)), W / 2, 136, '#fff', 1, 'center');
          else text(ctx, lives > 1 ? 'TRY AGAIN' : 'LAST CHANCE GONE', W / 2, 136, '#fff', 1, 'center');
        }
        if (mode === 'roundclear') {
          panel(ctx, 20, 76, 216, 60);
          text(ctx, 'ALL EVENTS CLEARED!', W / 2, 86, '#ffd800', 1, 'center');
          text(ctx, 'BONUS 10000', W / 2, 102, '#fff', 1, 'center');
          text(ctx, 'ROUND ' + (round + 1) + ' - HARDER MARKS', W / 2, 118, '#8cf', 1, 'center');
        }
      }
      return { update, render, destroy() { } };
    }
  });
})();
