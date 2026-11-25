// Night Driver (Atari, 1976) -- first-person night driving: only the roadside reflector posts are visible
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

  const W = 256, H = 240;
  const HORIZ = 92, FOC = 150, CAMH = 4.2;
  const SP = 8;                 // metres between reflector posts
  const ROADW = 6;              // posts stand this far either side of the centre line
  const VIEW = 26;              // posts drawn ahead
  const GEAR_MAX = [0, 48, 82, 118, 156];   // mph at the red line in each gear
  const GEAR_ACC = [0, 0.62, 0.42, 0.29, 0.2];
  const TRACKS = ['NOVICE', 'PRO', 'EXPERT'];

  function buildTrack(t) {
    // deterministic per course: [length in metres, curvature]
    let seed = 1234 + t * 777;
    const r = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const maxC = [0.0016, 0.0023, 0.003][t];
    const segs = [[260, 0]];
    let total = 260;
    while (total < 7000) {
      const straight = (t === 2 ? 40 : 60) + r() * (t === 2 ? 120 : 160);
      segs.push([straight, 0]);
      const dir = r() < 0.5 ? -1 : 1;
      const c = dir * maxC * (0.35 + r() * 0.65);
      const len = 120 + r() * 260;
      // ease in, hold, ease out
      segs.push([len * 0.25, c * 0.5], [len * 0.5, c], [len * 0.25, c * 0.5]);
      if (t > 0 && r() < 0.35 + t * 0.15) {   // S-bend
        const c2 = -dir * maxC * (0.5 + r() * 0.5), l2 = 100 + r() * 180;
        segs.push([l2 * 0.3, c2 * 0.5], [l2 * 0.4, c2], [l2 * 0.3, c2 * 0.5]);
        total += l2;
      }
      total += straight + len;
    }
    // per-metre lookup table
    const n = Math.ceil(segs.reduce((s, x) => s + x[0], 0));
    const table = new Float32Array(n);
    let pos = 0;
    for (const [len, c] of segs) { const e = Math.min(n, Math.round(pos + len)); for (let i = Math.round(pos); i < e; i++) table[i] = c; pos += len; }
    return table;
  }

  ArcadeRegistry.register({
    id: 'nightdriver', title: 'Night Driver', year: 1976, maker: 'Atari',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Left/Right: steer \u00b7 Up: accelerator \u00b7 Down: brake \u00b7 Space: shift up \u00b7 X: shift down \u00b7 Enter: start (Left/Right on title: course)',
    marquee: { bg: '#000', fg: '#ffffff', accent: '#9a9a9a' },
    create(api) {
      const A = api.audio;
      const tracks = [buildTrack(0), buildTrack(1), buildTrack(2)];
      const GAME_TIME = 100, EXTEND_AT = [550, 500, 450], EXTEND_TIME = 50;
      let course = 0;
      let state = 'attract', stateT = 0;
      let hi = api.getHiScore(0);
      let z = 0, px = 0, speed = 0, gear = 1, time = GAME_TIME * 60, score = 0, extended = false;
      let crashT = 0, flashT = 0, holdT = 0, msg = '', msgT = 0, skidT = 0, engT = 0, drift = 0;
      let coinFlash = 0, coinHold = 0, lastCredits = api.credits;

      const curveAt = m => { const t = tracks[course]; return t[((Math.floor(m) % t.length) + t.length) % t.length]; };

      function resetCar() { z = 0; px = 0; speed = 0; gear = 1; crashT = 0; flashT = 0; holdT = 0; }
      function startGame() {
        state = 'play'; stateT = 0; resetCar(); time = GAME_TIME * 60; score = 0; extended = false;
        msg = TRACKS[course]; msgT = 120;
        A.melody([[440, .1], [0, .05], [440, .1], [0, .05], [880, .3]], { type: 'square', vol: 0.12 });
      }
      function attractInit() { state = 'attract'; stateT = 0; resetCar(); }
      function gameOver() {
        state = 'gameover'; stateT = 0;
        if (score > hi) { hi = score; api.setHiScore(hi); }
      }

      function engineSound() {
        if (--engT > 0) return;
        engT = 3;
        const rpm = Math.min(1.15, speed / GEAR_MAX[gear]);
        A.tone(38 + rpm * 110 + gear * 4, 0.07, { type: 'sawtooth', vol: state === 'play' ? 0.07 : 0.025 });
      }
      function crash() {
        crashT = 80; flashT = 24; holdT = 80;
        if (state !== 'play') { flashT = 8; return; }
        A.noise(0.9, { freq: 2600, slideTo: 100, vol: 0.5 });
        A.noise(0.4, { freq: 300, vol: 0.4, delay: 0.05 });
        A.tone(120, 0.5, { type: 'square', vol: 0.15, slideTo: 40 });
      }
      function drive(ctl) {
        // gears
        const loud = state === 'play';
        if (ctl.up && gear < 4) { gear++; if (loud) A.tone(220, 0.05, { type: 'square', vol: 0.08 }); }
        if (ctl.down && gear > 1) { gear--; if (loud) A.tone(180, 0.05, { type: 'square', vol: 0.08 }); }
        const top = GEAR_MAX[gear], rpm = speed / top;
        if (ctl.gas) {
          // torque curve: weak when lugging a high gear, nothing past the red line
          let tq = rpm < 0.25 ? 0.18 + rpm * 2.4 : rpm < 1 ? 1 - (rpm - 0.25) * 0.5 : 0;
          if (gear === 1) tq = Math.max(tq, 0.6);
          speed += GEAR_ACC[gear] * tq;
        } else speed -= 0.08 + speed * 0.002;
        if (ctl.brake) speed -= 1.1;
        if (speed > top) speed -= Math.min(speed - top, 0.9);   // over-rev: engine braking
        speed = Math.max(0, Math.min(GEAR_MAX[4] + 2, speed));
        // lateral: steering versus the curve pushing you to the outside
        const c = curveAt(z + 6);
        const steer = (ctl.right ? 1 : 0) - (ctl.left ? 1 : 0);
        const sf = Math.min(1, speed / 25);
        px += steer * (0.035 + speed * 0.0006) * sf;
        drift = c * speed * speed * 0.0034;
        px -= drift;
        if (state === 'play' && Math.abs(drift) > 0.05 && speed > 60 && --skidT <= 0) { skidT = 10; A.noise(0.12, { freq: 4000, type: 'bandpass', vol: 0.06 }); }
        // advance; check each post we pass
        const before = Math.floor(z / SP);
        z += speed * 0.00745 * 1.25;
        const after = Math.floor(z / SP);
        if (after > before) {
          if (state === 'play') score += after - before;
          if (Math.abs(px) > ROADW - 1.15) { crash(); return; }
        }
        if (Math.abs(px) > ROADW + 1.5) crash();
      }
      function autoCtl() {
        const c = curveAt(z + 6), cAhead = curveAt(z + 60);
        const wantGear = gear < 4 && speed > GEAR_MAX[gear] * 0.9 ? 1 : gear > 1 && speed < GEAR_MAX[gear - 1] * 0.5 ? -1 : 0;
        const limit = Math.abs(cAhead) > 0.0018 ? 105 : 150;
        const target = c * speed * speed * 0.0034 * 4;
        return { left: px - target > 0.3, right: px - target < -0.3, gas: speed < limit, brake: speed > limit + 15, up: wantGear > 0, down: wantGear < 0 };
      }

      function update() {
        stateT++;
        if (coinFlash > 0) coinFlash--;
        if (coinHold > 0) coinHold--;
        if (flashT > 0) flashT--;
        if (msgT > 0) msgT--;
        const cr = api.credits;
        if (state === 'attract') {
          if (lastCredits === 0 && cr > 0) { coinHold = 150; }
          lastCredits = cr;
          if (api.anyPressed('ArrowLeft')) { course = (course + 2) % 3; A.tone(660, 0.05, { vol: 0.1 }); }
          if (api.anyPressed('ArrowRight')) { course = (course + 1) % 3; A.tone(660, 0.05, { vol: 0.1 }); }
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { lastCredits = api.credits; startGame(); return; }
            coinFlash = 150; A.tone(70, 0.28, { type: 'square', vol: 0.3 });
          }
          if (holdT > 0) { holdT--; if (holdT === 0) { px = 0; speed = 0; gear = 1; } return; }
          drive(autoCtl());
          return;
        }
        lastCredits = cr;
        if (state === 'gameover') {
          if (stateT > 300 || (stateT > 90 && api.anyPressed('Enter', 'Space'))) attractInit();
          return;
        }
        if (state === 'hold') return;
        // play
        time--;
        if (time % 60 === 0 && time <= 600 && time > 0) A.tone(1000, 0.05, { type: 'square', vol: 0.08 });
        if (!extended && score >= EXTEND_AT[course]) {
          extended = true; time += EXTEND_TIME * 60; msg = 'EXTENDED PLAY'; msgT = 180;
          A.melody([[523, .08], [659, .08], [784, .08], [1047, .2]], { type: 'square', vol: 0.14 });
        }
        if (time <= 0) {
          time = 0; speed = 0;
          if (score > hi) { hi = score; api.setHiScore(hi); }
          state = 'hold';
          if (api.offerContinue) api.offerContinue(() => { state = 'play'; time = EXTEND_TIME * 60; msg = 'CONTINUE'; msgT = 90; }, gameOver);
          else gameOver();
          return;
        }
        if (holdT > 0) { holdT--; if (holdT === 0) { px = 0; speed = 0; gear = 1; } return; }
        drive({
          left: api.key('ArrowLeft'), right: api.key('ArrowRight'), gas: api.key('ArrowUp'), brake: api.key('ArrowDown'),
          up: api.pressed('Space'), down: api.pressed('KeyX') || api.pressed('KeyZ')
        });
        engineSound();
      }

      // ---------- drawing ----------
      function drawPosts(ctx, fg) {
        // lateral road offset ahead, integrated from the curvature (continuous in z)
        const first = Math.floor(z / SP) + 1;
        let x = 0, dx = 0, prevD = 0;
        const items = [];
        for (let i = 0; i < VIEW; i++) {
          const k = first + i, D = k * SP - z;
          const step = D - prevD;
          dx += curveAt(z + (prevD + D) / 2) * step;
          x += dx * step;
          prevD = D;
          items.push([D, x]);
        }
        ctx.fillStyle = fg;
        for (let i = items.length - 1; i >= 0; i--) {
          const [D, rx] = items[i];
          if (D < 1.5) continue;
          const s = FOC / D;
          const yb = HORIZ + CAMH * s;
          const h = Math.max(1, Math.round(1.1 * s)), w = Math.max(1, Math.round(0.45 * s));
          for (const side of [-1, 1]) {
            const sx = W / 2 + (rx + side * ROADW - px) * s;
            if (sx < -w || sx > W + w) continue;
            ctx.fillRect(Math.round(sx - w / 2), Math.round(yb - h), w, h);
          }
        }
      }
      function drawCar(ctx, fg, bg) {
        // the hood of the car, as on the cabinet's screen overlay
        ctx.fillStyle = fg;
        const y0 = 196;
        for (let y = y0; y < H; y++) {
          const t = (y - y0) / (H - y0);
          const half = 58 + t * 70;
          ctx.fillRect(W / 2 - half, y, half * 2, 1);
        }
        ctx.fillStyle = bg;
        for (let y = y0 + 3; y < H; y++) {
          const t = (y - y0) / (H - y0);
          const half = 52 + t * 66;
          ctx.fillRect(W / 2 - half, y, half * 2, 1);
        }
        ctx.fillStyle = fg;
        ctx.fillRect(W / 2 - 1, y0 - 6, 2, 9); ctx.fillRect(W / 2 - 3, y0 - 6, 6, 2);   // hood ornament
        for (let i = 0; i < 2; i++) { const s = i ? 1 : -1; ctx.fillRect(W / 2 + s * 30 - 1, y0 + 6, 2, 34); }
      }
      function render(ctx) {
        const flash = flashT > 0 && (flashT >> 2) % 2 === 0;
        const fg = flash ? '#000' : '#fff', bg = flash ? '#fff' : '#000';
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        drawPosts(ctx, fg);
        drawCar(ctx, fg, bg);
        if (state === 'attract') {
          const blinkOn = coinHold > 0 || (coinFlash > 0 ? (coinFlash % 20) < 12 : (stateT % 60) < 40);
          text(ctx, 'NIGHT DRIVER', W / 2, 26, fg, 2, 'center');
          for (let i = 0; i < 3; i++) {
            const x = W / 2 + (i - 1) * 74;
            text(ctx, TRACKS[i], x, 56, i === course ? fg : '#777', 1, 'center');
            if (i === course) ctx.fillRect(x - 22, 66, 44, 1);
          }
          if (blinkOn) text(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 124, fg, 1, 'center');
          text(ctx, 'HIGH SCORE ' + hi, W / 2, 140, '#aaa', 1, 'center');
          text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 6, H - 10, '#888', 1);
          text(ctx, '\u00a9 1976 ATARI', W - 6, H - 10, '#888', 1, 'right');
          return;
        }
        text(ctx, String(score).padStart(3, '0'), 8, 6, fg, 2);
        text(ctx, String(Math.ceil(time / 60)).padStart(3, '0'), W - 8, 6, fg, 2, 'right');
        text(ctx, 'SCORE', 8, 22, '#888', 1); text(ctx, 'TIME', W - 8, 22, '#888', 1, 'right');
        // gear lever and speed in the dash
        text(ctx, 'GEAR ' + gear, W / 2, 214, fg, 1, 'center');
        text(ctx, Math.round(speed) + ' MPH', W / 2, 226, '#aaa', 1, 'center');
        for (let g = 1; g <= 4; g++) {
          const gx = 24 + (g - 1) * 10;
          ctx.fillStyle = g === gear ? fg : '#555'; ctx.fillRect(gx, 222, 6, 6);
        }
        if (msgT > 0 && (msgT >> 3) & 1) text(ctx, msg, W / 2, 40, fg, 1, 'center');
        if (state === 'play' && time <= 600 && (time >> 4) & 1) text(ctx, 'TIME', W / 2, 54, fg, 1, 'center');
        if (state === 'gameover') {
          ctx.fillStyle = bg; ctx.fillRect(W / 2 - 60, 98, 120, 40);
          text(ctx, 'GAME OVER', W / 2, 104, fg, 2, 'center');
          text(ctx, 'SCORE ' + score, W / 2, 124, fg, 1, 'center');
        }
      }
      attractInit();
      return { update, render, destroy() { } };
    }
  });
})();
