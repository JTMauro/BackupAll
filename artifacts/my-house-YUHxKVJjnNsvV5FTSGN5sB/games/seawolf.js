// Sea Wolf (Midway, 1976) - from-scratch recreation for the Game Room.
// Look through the periscope of a submarine, swing it left and right and fire torpedoes at the ships
// steaming across the horizon. Five torpedoes per salvo, then a reload; floating mines swallow torpedoes.
// Beat the clock: score enough before time runs out and you earn extended time.
(function () {
  'use strict';
  const W = 256, H = 224;

  // ---------- 5x7 font ----------
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
    '.': [0, 0, 0, 0, 0, 12, 12], ':': [0, 12, 12, 0, 12, 12, 0], '-': [0, 0, 0, 31, 0, 0, 0], '!': [4, 4, 4, 4, 4, 0, 4],
    '/': [1, 1, 2, 4, 8, 16, 16], '=': [0, 0, 31, 0, 31, 0, 0], '\u00a9': [14, 17, 23, 25, 23, 17, 14], "'": [4, 4, 8, 0, 0, 0, 0]
  };
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) { const b = g[r]; if (!b) continue; for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc); }
    }
  }

  // ---------- ship pixel art (facing right) ----------
  const PAL = { h: '#c8ccd4', d: '#6a707c', s: '#ffffff', f: '#ff5a3a', w: '#203048', k: '#1a1e28', g: '#9aa2ae' };
  const SHIPS = {
    freighter: { pts: 100, sp: 0.32, art: [
      '..................f.............',
      '.....g............f.......g.....',
      '.....g...........fff......g.....',
      '.....g....sssss..fff......g.....',
      '....ggg...swsws.fffff....ggg....',
      'hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh.',
      'hhhhhhhhhhhhhhhhhhhhhhhhhhhhhh..',
      '.dddddddddddddddddddddddddddd...',
      '..dddddddddddddddddddddddddd....'] },
    tanker: { pts: 200, sp: 0.42, art: [
      '...s........................f.....',
      '..sss.......................f.....',
      '..sws......................sss....',
      '..sss...........g..........sws.f..',
      'hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh',
      '.hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh.',
      '..dddddddddddddddddddddddddddddd..',
      '...dddddddddddddddddddddddddddd...'] },
    destroyer: { pts: 300, sp: 0.62, art: [
      '..............g.........',
      '..............g.........',
      '.........g...sss........',
      '.....dd..ff..sws..dd....',
      '....ddddsffssssssdddd...',
      'hhhhhhhhhhhhhhhhhhhhhhhh',
      '.hhhhhhhhhhhhhhhhhhhhhh.',
      '...dddddddddddddddddd...'] },
    pt: { pts: 700, sp: 1.15, art: [
      '.......g.....',
      '.....ssss....',
      '....sswws....',
      'hhhhhhhhhhhh.',
      '.dddddddddhhh',
      '..ddddddddd..'] }
  };
  function mkSprite(art, flip) {
    const h = art.length, w = art[0].length;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    for (let r = 0; r < h; r++) for (let i = 0; i < w; i++) {
      const ch = art[r][flip ? w - 1 - i : i];
      if (PAL[ch]) { x.fillStyle = PAL[ch]; x.fillRect(i, r, 1, 1); }
    }
    return c;
  }

  // lanes: far to near (y of the waterline)
  const LANES = [{ y: 58, sp: 0.7, sc: 1 }, { y: 76, sp: 0.85, sc: 1 }, { y: 104, sp: 1.0, sc: 2 }];
  const MINE_ROWS = [{ y: 118, dir: 1, sp: 0.25 }, { y: 140, dir: -1, sp: 0.35 }];
  const HORIZON = 46, SUB_Y = H - 34;

  ArcadeRegistry.register({
    id: 'seawolf', title: 'Sea Wolf', year: 1976, maker: 'Midway',
    width: W, height: H, vector: false, pointer: true,
    controls: 'Left/Right or Mouse: swing periscope \u00b7 Space/Click: fire torpedo \u00b7 Enter: start',
    marquee: { bg: '#03142e', fg: '#9fe6ff', accent: '#ff5a3a' },
    create(api) {
      const A = api.audio;
      const SPR = {}; for (const k in SHIPS) SPR[k] = [mkSprite(SHIPS[k].art, false), mkSprite(SHIPS[k].art, true)];
      const rnd = (a, b) => a + Math.random() * (b - a);
      let hi = api.getHiScore(4000);
      let state = 'attract', T = 0, score = 0, time = 0, extended = false, coinFlash = 0;
      let aim = W / 2, tubes = 5, loadT = 0, torps = [], ships = [], mines = [], booms = [], msgs = [], flash = 0, laneT = [60, 160, 260];
      let lastMouseX = -1, mouseAim = false, prevFire = false, demoT = 0;
      const GAME_TIME = 90 * 60, EXT_SCORE = 4000, EXT_TIME = 40 * 60;

      function resetSea() {
        ships = []; torps = []; booms = []; msgs = []; mines = [];
        for (let r = 0; r < MINE_ROWS.length; r++) for (let i = 0; i < 4; i++) mines.push({ row: r, x: i * 72 + r * 36 + rnd(0, 16), bob: rnd(0, 6) });
        laneT = [40, 120, 220]; tubes = 5; loadT = 0;
      }
      function spawnShip(lane) {
        const roll = Math.random(), lvl = Math.min(1, (GAME_TIME - time) / GAME_TIME + (extended ? 0.5 : 0));
        let kind = roll < 0.4 ? 'freighter' : roll < 0.7 ? 'tanker' : roll < 0.9 ? 'destroyer' : 'pt';
        if (lane === 0 && kind === 'pt' && Math.random() < 0.5) kind = 'destroyer';
        const def = SHIPS[kind], dir = Math.random() < 0.5 ? 1 : -1;
        const sc = LANES[lane].sc, wpx = def.art[0].length * sc;
        ships.push({
          kind, lane, dir, sc, w: wpx, h: def.art.length * sc, x: dir > 0 ? -wpx - 4 : W + 4,
          sp: def.sp * LANES[lane].sp * (1 + lvl * 0.35) * dir, sink: 0, alive: true
        });
      }
      function fire() {
        if (tubes <= 0 || loadT > 0) return;
        tubes--;
        torps.push({ x: aim, y: SUB_Y, trail: [] });
        if (state === 'play') { A.noise(0.35, { freq: 900, slideTo: 200, vol: 0.18 }); A.tone(160, 0.25, { type: 'sine', vol: 0.12, slideTo: 80 }); }
        if (tubes === 0) loadT = 120;
      }
      function addScore(n) { if (state !== 'play') return; score += n; if (score > hi) hi = score; }
      function explode(x, y, big) {
        booms.push({ x, y, t: 0, big });
        flash = big ? 10 : 4;
        if (state === 'play') {
          if (big) { A.noise(1.4, { freq: 1600, slideTo: 50, vol: 0.4 }); A.tone(70, 1.0, { type: 'sine', vol: 0.2, slideTo: 30 }); }
          else A.noise(0.4, { freq: 2400, slideTo: 300, vol: 0.18 });
        }
      }

      function startGame() {
        state = 'play'; T = 0; score = 0; time = GAME_TIME; extended = false; resetSea(); aim = W / 2; prevFire = true;
        A.melody([[392, .12], [523, .12], [659, .12], [784, .3]], { type: 'square', vol: .1 });
      }
      function tryStart() { if (api.useCredit()) startGame(); else { coinFlash = 90; A.tone(80, 0.25, { type: 'square', vol: 0.2 }); } }
      function attract() { state = 'attract'; T = 0; resetSea(); }

      function update() {
        T++;
        if (coinFlash > 0) coinFlash--;
        if (flash > 0) flash--;
        if (state === 'over') { if (T > 300 || (T > 60 && api.anyPressed('Enter', 'Space'))) attract(); return; }
        if (state === 'hold') return;
        if (state === 'attract') {
          if (api.anyPressed('Enter', 'Space') || api.mouse.clicked) { tryStart(); return; }
          // demo periscope
          const tgt = ships.find(s => s.alive && s.x > 20 && s.x < W - 40);
          if (tgt) {
            const lead = tgt.x + tgt.w / 2 + tgt.sp * ((SUB_Y - LANES[tgt.lane].y) / 1.6);
            aim += Math.max(-2, Math.min(2, lead - aim));
            if (Math.abs(lead - aim) < 3 && --demoT <= 0) { fire(); demoT = 40; }
          }
        } else {
          // controls
          if (api.key('ArrowLeft')) { aim -= 1.8; mouseAim = false; }
          if (api.key('ArrowRight')) { aim += 1.8; mouseAim = false; }
          const mx = api.mouse.x;
          if (mx !== lastMouseX) { if (lastMouseX >= 0) mouseAim = true; lastMouseX = mx; }
          if (mouseAim) aim += Math.max(-3, Math.min(3, mx - aim));
          const f = api.key('Space') || api.key('KeyX') || api.key('ArrowUp');
          if ((f && !prevFire) || api.mouse.clicked) fire();
          prevFire = f;
          // clock
          time--;
          if (time === 600 || time === 300) A.tone(1200, 0.1, { type: 'square', vol: 0.1 });
          if (time <= 0) {
            if (!extended && score >= EXT_SCORE) {
              extended = true; time = EXT_TIME; msgs.push({ s: 'EXTENDED TIME', x: W / 2, y: 120, t: 150 });
              A.melody([[523, .1], [659, .1], [784, .1], [1047, .1], [784, .1], [1047, .3]], { type: 'square', vol: .12 });
            } else {
              time = 0; state = 'hold';
              const over = () => { state = 'over'; T = 0; api.setHiScore(score); A.melody([[392, .25], [330, .25], [262, .25], [196, .6]], { type: 'square', vol: .1 }); };
              if (api.offerContinue) api.offerContinue(() => { state = 'play'; time = 60 * 60; tubes = 5; loadT = 0; }, over); else over();
              return;
            }
          }
        }
        aim = Math.max(8, Math.min(W - 8, aim));
        // reload
        if (loadT > 0 && --loadT === 0) { tubes = 5; if (state === 'play') A.tone(600, 0.08, { type: 'square', vol: 0.08, slideTo: 900 }); }
        // ships
        for (let l = 0; l < LANES.length; l++) {
          if (!ships.some(s => s.lane === l && s.alive) && --laneT[l] <= 0) { spawnShip(l); laneT[l] = rnd(60, 200); }
        }
        for (const s of ships) {
          if (s.alive) { s.x += s.sp; if (s.x < -60 || s.x > W + 60) s.gone = true; }
          else { s.sink += 0.12; s.x += s.sp * 0.2; if (s.sink > s.h + 4) s.gone = true; }
        }
        ships = ships.filter(s => !s.gone);
        // mines drift
        for (const m of mines) {
          const row = MINE_ROWS[m.row];
          m.x += row.sp * row.dir; m.bob += 0.06;
          if (m.x > W + 10) m.x -= W + 20; if (m.x < -10) m.x += W + 20;
        }
        // torpedoes
        for (const t of torps) {
          t.y -= 1.6; t.trail.push([t.x, t.y + 4]); if (t.trail.length > 22) t.trail.shift();
          // mines
          for (const m of mines) {
            const my = MINE_ROWS[m.row].y;
            if (!t.dead && Math.abs(t.y - my) < 4 && Math.abs(t.x - m.x) < 5) {
              t.dead = true; explode(m.x, my, false); m.x = (m.x + W / 2) % (W + 20);
              msgs.push({ s: 'MINE', x: t.x, y: my - 10, t: 40 });
            }
          }
          // ships: nearest lane first (the torpedo travels away from the sub)
          for (let l = LANES.length - 1; l >= 0 && !t.dead; l--) {
            const ly = LANES[l].y;
            if (Math.abs(t.y - (ly - 1)) > 2) continue;
            for (const s of ships) {
              if (!s.alive || s.lane !== l) continue;
              if (t.x >= s.x - 1 && t.x <= s.x + s.w + 1) {
                t.dead = true; s.alive = false;
                const v = SHIPS[s.kind].pts + (2 - l) * 100;
                addScore(v); explode(t.x, ly - 4, true);
                msgs.push({ s: String(v), x: s.x + s.w / 2, y: ly - 22, t: 70 });
                break;
              }
            }
          }
          if (t.y < HORIZON + 4) t.dead = true;
        }
        torps = torps.filter(t => !t.dead);
        for (const b of booms) b.t++; booms = booms.filter(b => b.t < (b.big ? 50 : 24));
        for (const m of msgs) m.t--; msgs = msgs.filter(m => m.t > 0);
        if (state === 'attract' && T > 60 * 40) attract();
      }

      // ---------- drawing ----------
      function render(ctx) {
        // sky
        ctx.fillStyle = flash > 0 && (flash & 2) ? '#ff8040' : '#06102a'; ctx.fillRect(0, 0, W, HORIZON);
        ctx.fillStyle = '#0c2048'; ctx.fillRect(0, HORIZON - 10, W, 10);
        ctx.fillStyle = '#16306a'; ctx.fillRect(0, HORIZON - 4, W, 4);
        // sea
        ctx.fillStyle = '#0a3a6e'; ctx.fillRect(0, HORIZON, W, H - HORIZON);
        for (let y = HORIZON + 2, k = 0; y < H; y += 3 + (k >> 1), k++) {
          ctx.fillStyle = k & 1 ? '#0e4880' : '#124e8a';
          const off = (T * (0.3 + k * 0.05) + k * 37) % 24;
          for (let x = -24 + off; x < W; x += 24) ctx.fillRect(Math.round(x), y, 10 + (k % 3) * 2, 1);
        }
        // ships by lane, far to near; mines in their rows
        for (let l = 0; l < LANES.length; l++) {
          const ly = LANES[l].y;
          for (const s of ships) {
            if (s.lane !== l) continue;
            const spr = SPR[s.kind][s.dir > 0 ? 0 : 1];
            const top = Math.round(ly - s.h + 2 + s.sink);
            ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, ly + 1); ctx.clip();
            ctx.drawImage(spr, Math.round(s.x), top, s.w, s.h);
            ctx.restore();
            if (s.alive) {
              ctx.fillStyle = '#d8f0ff';
              const bx = s.dir > 0 ? s.x + s.w : s.x - 4;
              ctx.fillRect(Math.round(bx), ly, 3, 1);
              const sx = s.dir > 0 ? s.x - 8 : s.x + s.w;
              ctx.fillStyle = '#5a90c0'; ctx.fillRect(Math.round(sx), ly + 1, 8, 1);
            } else if ((T >> 2) & 1) {
              ctx.fillStyle = '#ffd040'; ctx.fillRect(Math.round(s.x + s.w / 2 - 3), Math.round(ly - 6 - s.sink * 0.3), 6, 3);
            }
          }
        }
        for (const m of mines) {
          const y = Math.round(MINE_ROWS[m.row].y + Math.sin(m.bob) * 1.2), x = Math.round(m.x);
          ctx.fillStyle = '#101418'; ctx.fillRect(x - 3, y - 2, 6, 5); ctx.fillRect(x - 2, y - 3, 4, 7);
          ctx.fillStyle = '#c0c8d0'; ctx.fillRect(x - 4, y, 1, 1); ctx.fillRect(x + 3, y, 1, 1); ctx.fillRect(x, y - 4, 1, 1); ctx.fillRect(x - 1, y - 1, 1, 1);
        }
        // torpedoes and wakes
        for (const t of torps) {
          ctx.fillStyle = '#c8ecff';
          for (let i = 0; i < t.trail.length; i += 2) { const p = t.trail[i]; ctx.fillRect(Math.round(p[0] - 1 + ((i >> 1) & 1)), Math.round(p[1]), 1, 1); }
          ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(t.x) - 1, Math.round(t.y), 2, 4);
        }
        // explosions
        for (const b of booms) {
          const r = b.big ? Math.min(18, b.t * 1.2) : Math.min(8, b.t);
          const cols = ['#ffffff', '#fff060', '#ff9a30', '#ff4020', '#802010'];
          const ci = Math.min(cols.length - 1, Math.floor(b.t / (b.big ? 10 : 5)));
          ctx.fillStyle = cols[ci];
          for (let i = 0; i < 10; i++) {
            const a = i / 10 * Math.PI * 2 + b.t * 0.05, rr = r * (0.5 + ((i * 7) % 5) / 8);
            ctx.fillRect(Math.round(b.x + Math.cos(a) * rr) - 1, Math.round(b.y - Math.abs(Math.sin(a)) * rr * 1.3) - 1, 3, 3);
          }
          if (b.big && b.t < 30) { ctx.fillStyle = '#d8f0ff'; ctx.fillRect(Math.round(b.x - 1), Math.round(b.y - b.t * 0.8), 3, Math.round(b.t * 0.8)); }
        }
        // periscope reticle
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        for (let y = HORIZON + 2; y < SUB_Y - 4; y += 6) ctx.fillRect(Math.round(aim), y, 1, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(aim) - 6, LANES[2].y + 12, 4, 1); ctx.fillRect(Math.round(aim) + 3, LANES[2].y + 12, 4, 1);
        // periscope housing (bottom panel)
        ctx.fillStyle = '#000'; ctx.fillRect(0, SUB_Y + 4, W, H - SUB_Y - 4);
        ctx.fillStyle = '#20406a'; ctx.fillRect(0, SUB_Y + 4, W, 1);
        // aim marker on the bearing scale
        ctx.fillStyle = '#4a7aa8'; for (let x = 8; x < W; x += 16) ctx.fillRect(x, SUB_Y + 7, 1, x % 64 === 8 ? 4 : 2);
        ctx.fillStyle = '#ffd040'; const ax = Math.round(aim);
        ctx.fillRect(ax - 3, SUB_Y + 12, 7, 1); ctx.fillRect(ax - 2, SUB_Y + 11, 5, 1); ctx.fillRect(ax - 1, SUB_Y + 10, 3, 1); ctx.fillRect(ax, SUB_Y + 9, 1, 1);
        // torpedo lamps
        for (let i = 0; i < 5; i++) {
          const on = i < tubes;
          ctx.fillStyle = on ? '#ff5a3a' : '#40200a'; ctx.fillRect(8 + i * 10, H - 9, 7, 4);
        }
        if (loadT > 0) text(ctx, 'LOAD', 62, H - 11, (T >> 3) & 1 ? '#ff5a3a' : '#803020');
        else text(ctx, 'READY', 62, H - 11, '#60ff80');
        // top HUD
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 12);
        text(ctx, 'SCORE', 4, 3, '#9fe6ff'); text(ctx, String(score).padStart(5, '0'), 40, 3, '#ffffff');
        text(ctx, 'HIGH', 152, 3, '#9fe6ff'); text(ctx, String(hi).padStart(5, '0'), 182, 3, '#ffffff');
        if (state !== 'attract') {
          const secs = Math.ceil(time / 60);
          text(ctx, 'TIME', 168, H - 11, '#9fe6ff');
          text(ctx, String(secs).padStart(2, '0'), 198, H - 11, secs <= 10 && (T >> 3) & 1 ? '#ff4040' : '#ffffff');
          if (extended) text(ctx, 'EXT', 220, H - 11, '#ffd040');
        } else text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W - 4, H - 11, '#9fe6ff', 1, 'right');
        for (const m of msgs) text(ctx, m.s, m.x, Math.round(m.y), m.s === 'MINE' ? '#ff8080' : '#ffff60', 1, 'center');
        if (state === 'attract') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(28, 104, W - 56, 70);
          text(ctx, 'SEA WOLF', W / 2 + 2, 110, '#003060', 3, 'center');
          text(ctx, 'SEA WOLF', W / 2, 108, '#9fe6ff', 3, 'center');
          text(ctx, 'SCORE ' + EXT_SCORE + ' FOR EXTENDED TIME', W / 2, 136, '#ffffff', 1, 'center');
          const blink = (T >> 4) & 1;
          if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 150, '#ff5a3a', 1, 'center'); }
          else if (api.credits > 0) { if (blink) text(ctx, 'PUSH START', W / 2, 150, '#ffd040', 1, 'center'); }
          else if (blink) text(ctx, 'INSERT COIN', W / 2, 150, '#ffd040', 1, 'center');
          text(ctx, '\u00a9 1976 MIDWAY', W / 2, 162, '#80a0c0', 1, 'center');
        }
        if (state === 'over' || state === 'hold') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(48, 104, W - 96, 30);
          text(ctx, 'GAME OVER', W / 2, 112, '#ff5a3a', 2, 'center');
        }
      }
      attract();
      return { update, render, destroy() { } };
    }
  });
})();
