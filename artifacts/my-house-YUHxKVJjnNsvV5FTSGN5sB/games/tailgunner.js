// Tail Gunner (Cinematronics, 1979) - from-scratch vector recreation.
// You man the rear turret of a starship: squadrons of three fighters swoop in from deep space behind you
// and try to slip past. Aim the crosshair, fire the twin lasers, and raise the shield when one gets too
// close. Every fighter that gets by costs one of your ten ships; lose them all and the game is over.
(function () {
  'use strict';
  const W = 640, H = 480, CX = W / 2, CY = H / 2, F = 420;

  // ---------- stroke font ----------
  const VF = {
    A: '0602204246 0343', B: '0006 003041423303 3344453606', C: '40000646', D: '0006 003041453606',
    E: '40000646 0333', F: '400006 0333', G: '40000646 4643 2343', H: '0006 4046 0343', I: '0040 2026 0646',
    J: '4045361605', K: '0006 400346', L: '000646', M: '0600224046', N: '06004640', O: '0040460600',
    P: '0600404303', Q: '0040460600 2446', R: '0600404303 1346', S: '400003434606', T: '0040 2026',
    U: '00064640', V: '002640', W: '0006244640', X: '0046 4006', Y: '002240 2226', Z: '00400646',
    '0': '0040460600 4006', '1': '112026 1636', '2': '004043030646', '3': '00404606 1343', '4': '000343 4046',
    '5': '400003434606', '6': '400006464303', '7': '004026', '8': '0040460600 0343', '9': '4303004046',
    '-': '0343', '.': '2526', ':': '2122 2425', '!': '2024 2526', '/': '4006', '=': '0242 0444', "'": '2022',
    ',': '2516', '?': '0040432324 2526', '(': '30121436', ')': '10323416', '>': '004306', '<': '400346', '+': '2125 0343'
  };
  function vtext(ctx, str, x, y, sc, align) {
    str = String(str).toUpperCase();
    const adv = 6 * sc, w = str.length * adv - 2 * sc;
    if (align === 'center') x -= w / 2; else if (align === 'right') x -= w;
    for (const ch of str) {
      const g = VF[ch];
      if (g) for (const st of g.split(' ')) {
        for (let i = 0; i < st.length; i += 2) {
          const px = x + (+st[i]) * sc, py = y + (+st[i + 1]) * sc;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        if (st.length === 2) ctx.lineTo(x + (+st[0]) * sc + 0.6, y + (+st[1]) * sc);
      }
      x += adv;
    }
  }

  // ---------- 3D fighter model (nose toward -z, i.e. toward the viewer when approaching) ----------
  const FV = [[0, 0, -16], [-14, 2, 8], [14, 2, 8], [0, -6, 6], [0, 3, 10], [-20, 2, 12], [20, 2, 12], [-6, 2, 4], [6, 2, 4]];
  const FE = [[0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [1, 4], [2, 4], [3, 4], [1, 5], [2, 6], [5, 7], [6, 8]];

  ArcadeRegistry.register({
    id: 'tailgunner', title: 'Tail Gunner', year: 1979, maker: 'Cinematronics',
    width: W, height: H, vector: true, pointer: true,
    controls: 'Arrows/Mouse: aim \u00b7 Space/Click: fire \u00b7 X: shield \u00b7 Enter: start',
    marquee: { bg: '#00040a', fg: '#a8e8ff', accent: '#ff5050' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      let hi = api.getHiScore(10000);
      let state = 'attract', T = 0, score = 0, ships = 10, wave = 0, coinFlash = 0, nextBonus = 20000;
      let cx = CX, cy = CY, cvx = 0, cvy = 0, cool = 0, beams = [], shield = 1, shieldOn = false, shieldHit = 0;
      let foes = [], stars = [], debris = [], waveT = 0, msg = '', msgT = 0, passFlash = 0, lastMouse = { x: -1, y: -1 }, mouseAim = false;
      let waveKills = 0;
      for (let i = 0; i < 90; i++) stars.push(newStar(true));

      function newStar(any) { return { x: rnd(-1, 1) * 600, y: rnd(-1, 1) * 450, z: any ? rnd(20, 1200) : rnd(10, 40) }; }
      function project(x, y, z) { return [CX + x / z * F, CY + y / z * F]; }

      // ---------- squadrons ----------
      function speedK() { return 1 + Math.min(1.4, (wave - 1) * 0.09); }
      function spawnWave() {
        wave++; waveKills = 0;
        foes = [];
        const n = 3;
        const side = rnd(-1, 1) < 0 ? -1 : 1, base = rnd(0, 6);
        for (let i = 0; i < n; i++) {
          foes.push({
            x: side * rnd(250, 420), y: rnd(-200, 120), z: 1300 + i * 70,
            vx: 0, vy: 0, vz: 0, ph: 'approach', t: i * 30, alive: true,
            ox: rnd(-1, 1), oy: rnd(-1, 1), wob: base + i * 2.1, yaw: 0, roll: 0, tx: 0, ty: 0, hold: rnd(140, 260) / speedK() + i * 40
          });
        }
        waveT = 0; msg = 'WAVE ' + wave; msgT = 70;
        if (state === 'play') A.melody([[220, .08], [330, .08], [440, .12]], { type: 'square', vol: .08 });
      }
      function stepFoe(f) {
        if (!f.alive) return;
        const k = speedK();
        f.t++;
        if (f.ph === 'approach') {
          // swoop in from deep space, weaving around the field of view
          const tz = 380 + Math.sin(f.wob) * 80;
          f.z += (tz - f.z) * 0.012 * k;
          const tx = Math.sin(f.t * 0.02 * k + f.wob) * 260, ty = Math.cos(f.t * 0.027 * k + f.wob) * 150;
          f.vx += (tx - f.x) * 0.0016 * k; f.vy += (ty - f.y) * 0.0016 * k;
          f.vx *= 0.97; f.vy *= 0.97;
          f.x += f.vx * k; f.y += f.vy * k;
          if (f.t > f.hold) { f.ph = 'attack'; f.tx = rnd(-40, 40); f.ty = rnd(-30, 30); f.vz = -(2.2 + wave * 0.18); }
        } else if (f.ph === 'attack') {
          // dive straight at the turret
          const s = Math.max(0.02, Math.min(0.08, 6 / f.z));
          f.x += (f.tx + Math.sin(f.t * 0.06) * 30 - f.x) * s; f.y += (f.ty + Math.cos(f.t * 0.05) * 20 - f.y) * s;
          f.vz -= 0.03 * k; f.z += f.vz;
          if (f.z < 34) {
            if (shieldOn && shield > 0) {
              // bounced off the shield
              f.ph = 'retreat'; f.vz = 6 + wave * 0.2; f.z = 36; shieldHit = 20; shield = Math.max(0, shield - 0.08);
              f.vx = rnd(-4, 4); f.vy = rnd(-3, 3);
              if (state === 'play') { A.noise(0.25, { freq: 3000, slideTo: 400, vol: 0.16, type: 'bandpass' }); A.tone(1600, 0.2, { type: 'triangle', vol: 0.08, slideTo: 300 }); }
            } else {
              f.alive = false; passFlash = 30;
              if (state === 'play') {
                ships--; msg = 'SHIP LOST'; msgT = 60;
                A.tone(600, 0.6, { type: 'sawtooth', vol: 0.12, slideTo: 60 }); A.noise(0.4, { freq: 700, vol: 0.12 });
              }
            }
          }
        } else if (f.ph === 'retreat') {
          f.x += f.vx; f.y += f.vy; f.z += f.vz; f.vz *= 0.985;
          if (f.vz < 1.2 || f.z > 700) { f.ph = 'approach'; f.t = 0; f.hold = rnd(80, 180) / k; f.vx *= 0.3; f.vy *= 0.3; }
        }
        // banking for looks
        f.roll += ((-(f.vx || 0) * 0.08) - f.roll) * 0.1;
        f.yaw = Math.atan2(f.x, 600) * 0.6;
      }
      function foeScreen(f) { const p = project(f.x, f.y, f.z); return { x: p[0], y: p[1], r: Math.max(5, 26 / f.z * F * 0.6) }; }

      // ---------- player ----------
      function fire(auto) {
        if (cool > 0) return;
        cool = 9;
        beams.push({ x: cx, y: cy, t: 7 });
        if (state === 'play' || auto) if (state === 'play') A.tone(1800, 0.12, { type: 'sawtooth', vol: 0.07, slideTo: 200 });
        // the lasers converge where the crosshair is; hit the nearest fighter under it
        let best = null, bd = 1e9;
        for (const f of foes) {
          if (!f.alive || f.z < 20) continue;
          const s = foeScreen(f), d = Math.hypot(s.x - cx, s.y - cy);
          if (d < s.r + 6 && f.z < bd) { bd = f.z; best = f; }
        }
        if (best) {
          best.alive = false; waveKills++;
          const s = foeScreen(best);
          for (let i = 0; i < 18; i++) {
            const a = Math.random() * Math.PI * 2, v = rnd(0.5, 4) * Math.min(3, 300 / best.z);
            debris.push({ x: s.x, y: s.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, a: rnd(0, 6), l: rnd(3, 10) * Math.min(2.5, 300 / best.z), t: rnd(25, 50) });
          }
          if (state === 'play') {
            const v = 100 + Math.min(400, (wave - 1) * 25);
            addScore(v);
            if (waveKills === 3) { addScore(500); msg = 'SQUADRON BONUS 500'; msgT = 70; }
            A.noise(0.6, { freq: 2600, slideTo: 90, vol: 0.28 });
          }
        }
      }
      function addScore(n) {
        score += n;
        if (score >= nextBonus) { nextBonus += 20000; ships++; msg = 'BONUS SHIP'; msgT = 90; A.melody([[880, .08], [1175, .08], [1760, .16]], { type: 'square', vol: .1 }); }
        if (score > hi) hi = score;
      }
      function aiAim() {
        let best = null, bd = 1e9;
        for (const f of foes) if (f.alive && f.z > 30) { const d = f.ph === 'attack' ? f.z * 0.5 : f.z; if (d < bd) { bd = d; best = f; } }
        if (!best) return;
        const s = foeScreen(best);
        cvx += (s.x - cx) * 0.02; cvy += (s.y - cy) * 0.02;
        if (Math.hypot(s.x - cx, s.y - cy) < s.r && Math.random() < 0.25) fire(true);
        shieldOn = best.ph === 'attack' && best.z < 90 && Math.random() < 0.7;
      }
      function stepPlayer() {
        if (cool > 0) cool--;
        if (state === 'attract') aiAim();
        else {
          const acc = 0.9;
          if (api.key('ArrowLeft')) { cvx -= acc; mouseAim = false; }
          if (api.key('ArrowRight')) { cvx += acc; mouseAim = false; }
          if (api.key('ArrowUp')) { cvy -= acc; mouseAim = false; }
          if (api.key('ArrowDown')) { cvy += acc; mouseAim = false; }
          const m = api.mouse;
          if (m.x !== lastMouse.x || m.y !== lastMouse.y) { if (lastMouse.x >= 0) mouseAim = true; lastMouse = { x: m.x, y: m.y }; }
          if (mouseAim) { cvx = 0; cvy = 0; cx += (m.x - cx) * 0.5; cy += (m.y - cy) * 0.5; }
          if (api.key('Space') || api.key('KeyZ') || (api.mouse.down)) fire(false);
          shieldOn = api.key('KeyX') || api.key('ShiftLeft');
        }
        cvx *= 0.82; cvy *= 0.82; cx += cvx; cy += cvy;
        cx = Math.max(20, Math.min(W - 20, cx)); cy = Math.max(40, Math.min(H - 60, cy));
        if (shieldOn) {
          if (shield > 0) { shield = Math.max(0, shield - 0.0035); if (state === 'play' && T % 6 === 0) A.tone(90 + (T % 12) * 4, 0.08, { type: 'square', vol: 0.03 }); }
          else shieldOn = false;
        }
      }

      // ---------- flow ----------
      function attractInit() { state = 'attract'; T = 0; wave = 0; ships = 10; shield = 1; spawnWave(); }
      function startGame() {
        state = 'play'; T = 0; score = 0; ships = 10; wave = 0; shield = 1; nextBonus = 20000; cx = CX; cy = CY;
        spawnWave();
        A.melody([[262, .1], [330, .1], [392, .1], [523, .25]], { type: 'square', vol: .1 });
      }
      function tryStart() { if (api.useCredit()) startGame(); else { coinFlash = 120; A.tone(70, 0.25, { type: 'square', vol: 0.2 }); } }

      function update() {
        T++;
        if (coinFlash > 0) coinFlash--;
        if (msgT > 0) msgT--;
        if (passFlash > 0) passFlash--;
        if (shieldHit > 0) shieldHit--;
        // stars stream away toward the vanishing point
        for (const s of stars) { s.z += 6 + wave * 0.15; if (s.z > 1200) Object.assign(s, newStar(false)); }
        for (const d of debris) { d.x += d.vx; d.y += d.vy; d.a += 0.2; d.t--; }
        debris = debris.filter(d => d.t > 0);
        for (const b of beams) b.t--; beams = beams.filter(b => b.t > 0);
        if (state === 'over') { if (T > 300 || (T > 90 && api.anyPressed('Enter', 'Space'))) attractInit(); return; }
        if (state === 'hold') return;
        if (state === 'attract' && api.anyPressed('Enter') ) { tryStart(); return; }
        if (state === 'attract' && api.pressed('Space') && T > 30) { tryStart(); return; }
        stepPlayer();
        for (const f of foes) stepFoe(f);
        if (foes.every(f => !f.alive)) {
          if (++waveT > 80) { shield = Math.min(1, shield + 0.25); spawnWave(); }
        }
        if (state === 'play' && ships <= 0) {
          state = 'hold';
          const over = () => { state = 'over'; T = 0; api.setHiScore(score); A.melody([[330, .25], [262, .25], [196, .25], [131, .6]], { type: 'square', vol: .12 }); };
          if (api.offerContinue) api.offerContinue(() => { ships = 5; shield = 1; state = 'play'; }, over); else over();
        }
        if (state === 'attract' && T > 60 * 45) attractInit();
      }

      // ---------- drawing ----------
      function drawFoe(ctx, f) {
        const cyw = Math.cos(f.yaw), syw = Math.sin(f.yaw), cr = Math.cos(f.roll), sr = Math.sin(f.roll);
        const pts = FV.map(v => {
          let x = v[0], y = v[1], z = v[2];
          // roll about z, then yaw about y
          const x1 = x * cr - y * sr, y1 = x * sr + y * cr;
          const x2 = x1 * cyw + z * syw, z2 = -x1 * syw + z * cyw;
          return project(f.x + x2, f.y + y1, Math.max(5, f.z + z2));
        });
        for (const e of FE) { ctx.moveTo(pts[e[0]][0], pts[e[0]][1]); ctx.lineTo(pts[e[1]][0], pts[e[1]][1]); }
      }
      function render(ctx) {
        ctx.fillStyle = passFlash > 0 && (passFlash & 4) ? '#200808' : '#000'; ctx.fillRect(0, 0, W, H);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        // stars
        for (const s of stars) {
          const p = project(s.x, s.y, s.z), b = Math.max(0.25, Math.min(1, 300 / s.z));
          ctx.fillStyle = `rgba(220,235,255,${b.toFixed(2)})`; ctx.fillRect(p[0], p[1], b > 0.7 ? 2 : 1.3, b > 0.7 ? 2 : 1.3);
        }
        // fighters, far to near
        const list = foes.filter(f => f.alive).sort((a, b) => b.z - a.z);
        for (const f of list) {
          const near = f.ph === 'attack' && f.z < 140;
          ctx.strokeStyle = near && (T & 4) ? '#ff6060' : '#c8ecff';
          ctx.lineWidth = Math.max(1, Math.min(2.4, 300 / f.z));
          ctx.beginPath(); drawFoe(ctx, f); ctx.stroke();
        }
        // debris
        ctx.strokeStyle = '#ffe080'; ctx.lineWidth = 1.3;
        for (const d of debris) {
          ctx.globalAlpha = Math.min(1, d.t / 20); ctx.beginPath();
          ctx.moveTo(d.x - Math.cos(d.a) * d.l / 2, d.y - Math.sin(d.a) * d.l / 2); ctx.lineTo(d.x + Math.cos(d.a) * d.l / 2, d.y + Math.sin(d.a) * d.l / 2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // laser beams from the two gun ports
        ctx.strokeStyle = '#ff5050'; ctx.lineWidth = 2;
        for (const b of beams) {
          const k = b.t / 7;
          ctx.globalAlpha = k; ctx.beginPath();
          ctx.moveTo(60, H - 30); ctx.lineTo(b.x, b.y); ctx.moveTo(W - 60, H - 30); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // shield
        if (shieldOn && shield > 0) {
          ctx.strokeStyle = shieldHit > 0 ? '#ffffff' : 'rgba(110,200,255,0.55)'; ctx.lineWidth = 1.2; ctx.beginPath();
          const r = 40, off = (T % 2) * 2;
          for (let gy = -3; gy <= 3; gy++) for (let gx = -4; gx <= 4; gx++) {
            const hx = CX + gx * r * 1.5, hy = CY + gy * r * 1.73 + (gx & 1) * r * 0.865 + off;
            for (let k = 0; k <= 6; k++) { const a = k / 6 * Math.PI * 2, px = hx + Math.cos(a) * r * 0.95, py = hy + Math.sin(a) * r * 0.95; if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
          }
          ctx.stroke();
        }
        // cockpit frame & gun ports
        ctx.strokeStyle = '#7fa0c0'; ctx.lineWidth = 1.6; ctx.beginPath();
        ctx.moveTo(0, H - 18); ctx.lineTo(40, H - 40); ctx.lineTo(80, H - 40); ctx.lineTo(100, H - 18);
        ctx.moveTo(W, H - 18); ctx.lineTo(W - 40, H - 40); ctx.lineTo(W - 80, H - 40); ctx.lineTo(W - 100, H - 18);
        ctx.moveTo(100, H - 18); ctx.lineTo(W - 100, H - 18);
        ctx.stroke();
        // crosshair
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath();
        ctx.moveTo(cx - 14, cy); ctx.lineTo(cx - 5, cy); ctx.moveTo(cx + 5, cy); ctx.lineTo(cx + 14, cy);
        ctx.moveTo(cx, cy - 14); ctx.lineTo(cx, cy - 5); ctx.moveTo(cx, cy + 5); ctx.lineTo(cx, cy + 14);
        ctx.stroke();
        // HUD
        ctx.strokeStyle = '#e8f4ff'; ctx.lineWidth = 1.5; ctx.beginPath();
        if (state !== 'attract') {
          vtext(ctx, String(score), 20, 10, 2.6, 'left');
          vtext(ctx, 'HIGH ' + hi, CX, 10, 1.8, 'center');
          vtext(ctx, 'SHIPS ' + Math.max(0, ships), W - 20, 10, 2.2, 'right');
          vtext(ctx, 'SHIELD', 140, H - 34, 1.4, 'left');
        }
        ctx.stroke();
        if (state !== 'attract') {
          ctx.strokeStyle = shield < 0.2 && (T & 8) ? '#ff5050' : '#6ec8ff'; ctx.lineWidth = 1.4; ctx.beginPath();
          ctx.rect(190, H - 35, 260, 8); ctx.stroke();
          ctx.fillStyle = 'rgba(110,200,255,0.8)'; ctx.fillRect(191, H - 34, 258 * shield, 6);
        }
        if (msgT > 0 && state === 'play') { ctx.strokeStyle = msg === 'SHIP LOST' ? '#ff6060' : '#ffffff'; ctx.lineWidth = 1.8; ctx.beginPath(); vtext(ctx, msg, CX, 70, 3, 'center'); ctx.stroke(); }
        if (state === 'attract') {
          ctx.strokeStyle = '#a8e8ff'; ctx.lineWidth = 2.6; ctx.beginPath(); vtext(ctx, 'TAIL GUNNER', CX, 70, 7, 'center'); ctx.stroke();
          ctx.strokeStyle = '#e8f4ff'; ctx.lineWidth = 1.4; ctx.beginPath();
          vtext(ctx, 'HIGH SCORE ' + hi, CX, 130, 2, 'center');
          vtext(ctx, 'DO NOT LET THE FIGHTERS GET BY', CX, 340, 1.8, 'center');
          vtext(ctx, 'X: SHIELD   SPACE: LASERS', CX, 362, 1.8, 'center');
          vtext(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 20, 12, 1.6, 'left');
          vtext(ctx, '(C) 1979 CINEMATRONICS', CX, H - 12, 1.4, 'center');
          ctx.stroke();
          const blink = (T >> 5) & 1;
          ctx.strokeStyle = '#ff6060'; ctx.lineWidth = 1.8; ctx.beginPath();
          if (coinFlash > 0) { if ((coinFlash >> 3) & 1) vtext(ctx, 'INSERT COIN', CX, 395, 3, 'center'); }
          else if (api.credits > 0) { if (blink) vtext(ctx, 'PUSH START', CX, 395, 3, 'center'); }
          else if (blink) vtext(ctx, 'INSERT COIN', CX, 395, 3, 'center');
          ctx.stroke();
        }
        if (state === 'over' || state === 'hold') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); vtext(ctx, 'GAME OVER', CX, 200, 5, 'center'); ctx.stroke(); }
      }
      attractInit();
      return { update, render, destroy() { } };
    }
  });
})();
