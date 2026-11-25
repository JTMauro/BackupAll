// Punch-Out!! (Nintendo, 1984) \u2014 from-scratch recreation for the Game Room.
// Behind-the-boxer view: read the tells, dodge or block, counter, fill the KO meter and land the super punch.
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
    '=': [0, 0, 31, 0, 31, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0], '\u00a9': [14, 17, 23, 25, 23, 17, 14]
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

  // moves: side L/R = the screen side the punch comes from (dodge the other way), C = centre (either dodge works)
  const MV = (n, side, type, tell, wind, rec, dmg, w, extra) => Object.assign({ n, side, type, tell, wind, rec, dmg, w }, extra || {});
  const OPP = [
    {
      name: 'GLASS JOE', from: 'PARIS, FRANCE', rec: '1-99', skin: '#f8c8a0', hair: '#7a4a20', style: 'short', trunks: '#d02828', belt: '#ffffff',
      glove: '#e03030', w: 0.95, spd: 1.45, atk: 0.75, def: 1.7, flurry: 6, dodge: 0, getUp: [4, 7], taunt: 0.25, mus: false, tellFx: 'flash',
      moves: [MV('JAB', 'C', 'jab', 46, 10, 30, 7, 3), MV('LEFT HOOK', 'L', 'hook', 50, 12, 32, 9, 2), MV('RIGHT HOOK', 'R', 'hook', 50, 12, 32, 9, 2)],
      special: MV('VIVE LA FRANCE', 'C', 'special', 120, 14, 60, 24, 0, { chance: 0.12, fx: 'step' })
    },
    {
      name: 'PISTON HURRICANE', from: 'HAVANA, CUBA', rec: '12-3', skin: '#8a5530', hair: '#181010', style: 'flat', trunks: '#f0c020', belt: '#20a020',
      glove: '#e03030', w: 1.0, spd: 1.15, atk: 0.9, def: 1.25, flurry: 5, dodge: 0.05, getUp: [5, 8], taunt: 0.1, mus: true, tellFx: 'eyes',
      moves: [MV('JAB', 'C', 'jab', 36, 9, 26, 9, 3), MV('LEFT HOOK', 'L', 'hook', 40, 10, 28, 11, 2), MV('RIGHT HOOK', 'R', 'hook', 40, 10, 28, 11, 2),
      MV('UPPERCUT', 'C', 'upper', 44, 12, 34, 13, 1)],
      special: MV('HURRICANE RUSH', 'L', 'hook', 70, 8, 16, 10, 0, { chance: 0.16, fx: 'shake', combo: ['L', 'R', 'L', 'R'] })
    },
    {
      name: 'BALD BULL', from: 'ISTANBUL, TURKEY', rec: '34-4', skin: '#d8a070', hair: '#d8a070', style: 'bald', trunks: '#202020', belt: '#d02020',
      glove: '#e03030', w: 1.2, spd: 1.1, atk: 1.15, def: 1.0, flurry: 4, dodge: 0, getUp: [6, 8], taunt: 0.05, mus: true, tellFx: 'flash',
      moves: [MV('JAB', 'C', 'jab', 38, 10, 30, 11, 2), MV('LEFT HOOK', 'L', 'hook', 40, 12, 32, 13, 2), MV('RIGHT HOOK', 'R', 'hook', 40, 12, 32, 13, 2),
      MV('UPPERCUT', 'C', 'upper', 42, 14, 36, 16, 1)],
      special: MV('BULL CHARGE', 'C', 'special', 130, 10, 70, 30, 0, { chance: 0.2, fx: 'hop', counter: true })
    },
    {
      name: 'KID QUICK', from: 'NEW YORK, U.S.A.', rec: '20-1', skin: '#f8c8a0', hair: '#ffd040', style: 'pomp', trunks: '#20a040', belt: '#ffffff',
      glove: '#2050e0', w: 0.9, spd: 0.8, atk: 0.95, def: 1.1, flurry: 4, dodge: 0.3, getUp: [5, 8], taunt: 0.08, mus: false, tellFx: 'eyes',
      moves: [MV('JAB', 'C', 'jab', 28, 7, 22, 9, 4), MV('LEFT HOOK', 'L', 'hook', 32, 8, 24, 11, 2), MV('RIGHT HOOK', 'R', 'hook', 32, 8, 24, 11, 2)],
      special: MV('QUICK COMBO', 'R', 'hook', 50, 7, 14, 9, 0, { chance: 0.18, fx: 'shake', combo: ['R', 'L', 'C'] })
    },
    {
      name: 'PIZZA PASTA', from: 'NAPLES, ITALY', rec: '28-6', skin: '#f0b888', hair: '#301810', style: 'slick', trunks: '#f0f0f0', belt: '#20a040',
      glove: '#e03030', w: 1.3, spd: 1.05, atk: 1.3, def: 0.95, flurry: 4, dodge: 0, getUp: [6, 9], taunt: 0.06, mus: true, tellFx: 'flash',
      moves: [MV('JAB', 'C', 'jab', 40, 11, 30, 12, 2), MV('LEFT HOOK', 'L', 'hook', 42, 13, 34, 15, 3), MV('RIGHT HOOK', 'R', 'hook', 42, 13, 34, 15, 3),
      MV('UPPERCUT', 'C', 'upper', 44, 14, 36, 18, 1)],
      special: MV('PASTA SMASH', 'C', 'special', 90, 16, 60, 28, 0, { chance: 0.15, fx: 'step' })
    },
    {
      name: 'MR. SANDMAN', from: 'PHILADELPHIA, U.S.A.', rec: '31-0', skin: '#5a3420', hair: '#101010', style: 'flat', trunks: '#8030c0', belt: '#ffd000',
      glove: '#e03030', w: 1.15, spd: 0.85, atk: 1.4, def: 0.85, flurry: 4, dodge: 0.15, getUp: [7, 9], taunt: 0.03, mus: true, tellFx: 'eyes',
      moves: [MV('JAB', 'C', 'jab', 30, 9, 24, 13, 3), MV('LEFT HOOK', 'L', 'hook', 34, 10, 26, 15, 2), MV('RIGHT HOOK', 'R', 'hook', 34, 10, 26, 15, 2),
      MV('UPPERCUT', 'C', 'upper', 38, 12, 30, 19, 1)],
      special: MV('DREAMLAND EXPRESS', 'C', 'upper', 60, 10, 14, 16, 0, { chance: 0.18, fx: 'flash', combo: ['C', 'C', 'C'] })
    }
  ];
  const METER_MAX = 12;

  ArcadeRegistry.register({
    id: 'punchout', title: 'Punch-Out!!', year: 1984, maker: 'Nintendo',
    width: 256, height: 224, vector: false, pointer: false,
    controls: 'Space/X: left/right punch (hold Up: to the face) \u00b7 Left/Right: dodge \u00b7 Down: block \u00b7 Enter: KO punch when meter full / start',
    marquee: { bg: '#000', fg: '#40ff40', accent: '#ff2020' },
    create(api) {
      const W = 256, H = 224;
      const au = api.audio;
      const snd = {
        land(h) { au.noise(0.09, { vol: 0.25, freq: h ? 1800 : 900 }); au.tone(h ? 140 : 90, 0.08, { type: 'square', vol: 0.12 }); },
        block() { au.noise(0.05, { vol: 0.12, freq: 400 }); au.tone(70, 0.05, { type: 'triangle', vol: 0.12 }); },
        whiff() { au.noise(0.12, { vol: 0.08, freq: 3000, slideTo: 800, type: 'bandpass' }); },
        hurt() { au.noise(0.15, { vol: 0.3, freq: 700 }); au.tone(200, 0.15, { type: 'sawtooth', vol: 0.12, slideTo: 60 }); },
        bell() { for (let i = 0; i < 3; i++) au.tone(1480, 0.5, { type: 'sine', vol: 0.18, delay: i * 0.18 }); au.tone(2220, 0.3, { type: 'sine', vol: 0.06 }); },
        count(n) { au.tone(n >= 10 ? 880 : 440, 0.12, { type: 'square', vol: 0.12 }); },
        crowd() { au.noise(1.2, { vol: 0.12, freq: 1200, type: 'bandpass' }); },
        tell(p) { au.tone(p, 0.06, { type: 'square', vol: 0.06 }); },
        meter() { au.melody([[784, 0.05], [1046, 0.05], [1319, 0.1]], { type: 'square', vol: 0.1 }); },
        sup() { au.noise(0.3, { vol: 0.3, freq: 2500, slideTo: 300 }); au.tone(80, 0.3, { type: 'square', vol: 0.15, slideTo: 40 }); },
        win() { au.melody([[523, 0.12], [659, 0.12], [784, 0.12], [1046, 0.24], [784, 0.12], [1046, 0.4]], { type: 'square', vol: 0.13 }); },
        lose() { au.melody([[392, 0.2], [370, 0.2], [349, 0.2], [330, 0.5]], { type: 'square', vol: 0.12 }); },
        intro() { au.melody([[392, 0.1], [392, 0.1], [523, 0.2], [392, 0.1], [523, 0.1], [659, 0.3]], { type: 'square', vol: 0.12 }); }
      };

      const S = { mode: 'title', t: 0, score: 0, hi: api.getHiScore(50000), opp: 0, circuit: 0, round: 1, clock: 180, clockT: 0, msg: '', msgT: 0, count: 0, attract: 0, result: '' };
      let O = null, P = null, coinFlash = 0, shake = 0, flashT = 0;

      function oppDef() { return OPP[S.opp % OPP.length]; }
      function cmul() { return 1 + S.circuit * 0.2; }
      function addScore(n) { S.score += n; if (S.score > S.hi) S.hi = S.score; }
      function newBout() {
        const d = oppDef();
        O = { d, hp: 100, st: 'idle', t: 0, idleT: 80, guard: 'high', kd: 0, att: null, at: 0, tellT: 0, combo: [], hurtHits: 0, ht: 0, openLeft: 0, bt: 0, sx: 0, side: 1, lastHigh: true, ko: false, dealt: 0, sideT: 0 };
        P = { since: 30, calm: 0, hp: 100, st: 'idle', t: 0, side: 'L', high: false, meter: 0, kd: 0, x: 0, queued: null, dealt: 0, taken: 0, presses: 0 };
        S.round = 1; S.clock = 180; S.clockT = 0;
      }
      function startGame() { S.score = 0; S.opp = 0; S.circuit = 0; newBout(); S.mode = 'intro'; S.t = 0; snd.intro(); }
      function gameOver() { api.setHiScore(S.score); S.hi = Math.max(S.hi, api.getHiScore(0)); S.mode = 'gameover'; S.t = 0; }
      function say(m, t) { S.msg = m; S.msgT = t || 60; }

      // ---------------- opponent ----------------
      function chooseAttack() {
        const d = O.d;
        if (Math.random() < d.taunt * 0.4) { O.st = 'taunt'; O.t = 0; O.tt = 70; return; }
        let mv;
        if (Math.random() < d.special.chance + S.circuit * 0.03 + (O.hp < 50 ? 0.05 : 0)) mv = d.special;
        else {
          let tot = 0; for (const m of d.moves) tot += m.w;
          let r = Math.random() * tot;
          for (const m of d.moves) { r -= m.w; if (r <= 0) { mv = m; break; } }
          mv = mv || d.moves[0];
        }
        O.att = mv; O.combo = mv.combo ? mv.combo.slice(1) : [];
        O.curSide = mv.combo ? mv.combo[0] : mv.side;
        O.st = 'tell'; O.t = 0; O.tellT = Math.round(mv.tell * d.spd / cmul()); O.hurtHits = 0; O.blocks = 0; O.idleHits = 0;
        snd.tell(mv.type === 'special' ? 220 : 330 + (O.curSide === 'L' ? 0 : 80));
      }
      function curType() { const a = O.att; return a.combo ? (O.curSide === 'C' ? (a.type === 'upper' ? 'upper' : 'jab') : (a.type === 'upper' ? 'upper' : 'hook')) : a.type; }
      function resolveOppHit() {
        const a = O.att, p = P, type = curType(), side = O.curSide;
        if (p.st === 'down') return;
        let avoided = false, blocked = false;
        if (p.st === 'dodge' && p.t >= 1 && p.t <= 22) {
          if (type === 'hook') avoided = (side === 'L' && p.side === 'R') || (side === 'R' && p.side === 'L');
          else avoided = true;
        }
        if (!avoided && p.st === 'block' && (type === 'jab' || type === 'hook')) blocked = true;
        if (avoided) {
          snd.whiff();
          if (!O.combo.length) { O.st = 'open'; O.t = 0; O.openLeft = Math.round((a.type === 'special' ? 95 : 62) / Math.sqrt(cmul())); O.hurtHits = 0; say('COUNTER!', 30); }
          return 'miss';
        }
        const dmg = a.dmg * O.d.atk * cmul();
        if (blocked) { snd.block(); p.hp -= dmg * 0.12; p.st = 'bstun'; p.t = 0; p.taken += dmg * 0.12; }
        else {
          snd.hurt(); p.hp -= dmg; p.taken += dmg; p.st = 'hurt'; p.t = 0; p.meter = 0; shake = 10; flashT = 4;
          p.hurtSide = side;
        }
        if (p.hp <= 0) { p.hp = 0; playerDown(); }
        return blocked ? 'block' : 'hit';
      }
      function updOpp() {
        const o = O, d = o.d;
        o.t++;
        o.sideT += 0.03;
        switch (o.st) {
          case 'idle':
            if (--o.idleT <= 0) chooseAttack();
            if (Math.random() < 0.004) o.guard = o.guard === 'high' ? 'low' : 'high';
            break;
          case 'taunt':
            if (--o.tt <= 0) { o.st = 'idle'; o.idleT = 30; }
            break;
          case 'tell':
            if (o.att.fx === 'hop' && (o.t % 30) === 0) au.tone(120, 0.08, { type: 'square', vol: 0.12 });
            if (--o.tellT <= 0) { o.st = 'attack'; o.at = 0; }
            break;
          case 'attack': {
            o.at++;
            const a = o.att;
            const wind = Math.max(5, Math.round(a.wind / Math.sqrt(cmul())));
            if (o.at === wind) resolveOppHit();
            if (o.st !== 'attack') break;
            const rec = Math.round((o.combo.length ? 10 : a.rec) / Math.sqrt(cmul()));
            if (o.at >= wind + rec) {
              if (o.combo.length) { o.curSide = o.combo.shift(); o.st = 'tell'; o.t = 0; o.tellT = Math.round(14 * d.spd / cmul()); }
              else { o.st = 'idle'; o.idleT = Math.round((40 + Math.random() * 70) * d.spd / cmul()); }
            }
            break;
          }
          case 'open':
            if (--o.openLeft <= 0) { o.st = 'idle'; o.idleT = 20; o.hurtHits = 0; }
            break;
          case 'hurt':
            if (o.openLeft > 0) o.openLeft--;
            if (--o.ht <= 0) {
              if (o.hurtHits >= d.flurry || (o.openLeft <= 0 && (o.idleHits || 0) >= 2)) { o.st = 'block'; o.bt = 30; o.hurtHits = 0; o.blocks = 9; o.guard = o.lastHigh ? 'high' : 'low'; }
              else if (o.openLeft > 0) o.st = 'open';
              else { o.st = 'idle'; o.idleT = Math.round(20 * d.spd / cmul()); }
            }
            break;
          case 'block':
            if (--o.bt <= 0) { o.st = 'idle'; o.idleT = (o.blocks || 0) >= 3 ? 1 : Math.round(18 * d.spd); }
            break;
          case 'sidestep':
            if (--o.bt <= 0) { o.st = 'idle'; o.idleT = 10; }
            break;
        }
      }

      // ---------------- player ----------------
      function resolvePunch(high, isSuper) {
        const o = O, d = o.d;
        if (S.mode !== 'fight') return;
        let lands = false, counter = false;
        switch (o.st) {
          case 'open': case 'hurt': lands = true; break;
          case 'taunt': lands = true; counter = true; break;
          case 'tell':
            if (o.att.counter) {
              // Bald Bull's charge: a body blow at the last moment knocks him straight down
              if (!high && o.tellT < 26 && P.calm >= 10) { lands = true; counter = true; o.ko = true; }
              else lands = false;
            } else if (o.att.type !== 'special' && high && o.tellT < 16 && P.calm >= 10) { lands = true; counter = true; }
            break;
          case 'attack': lands = o.at > Math.max(5, o.att.wind); break;
          case 'idle':
            if (!isSuper && d.dodge && Math.random() < d.dodge * cmul()) {
              o.st = 'sidestep'; o.bt = 22; o.sideDir = Math.random() < 0.5 ? -1 : 1; snd.whiff(); return;
            }
            lands = isSuper ? (o.guard !== 'high' || Math.random() < 0.6) : (high ? o.guard === 'low' : o.guard === 'high') && Math.random() >= Math.min(0.7, [0, 0.25, 0.35, 0.3, 0.4, 0.5][S.opp % 6] + S.circuit * 0.1);
            break;
          default: lands = false;
        }
        if (!lands) {
          snd.block();
          if (o.st === 'idle') { o.st = 'block'; o.bt = 14; o.guard = high ? 'high' : 'low'; o.blocks = (o.blocks || 0) + 1; }
          if (isSuper) P.meter = 0;
          return;
        }
        let dmg = (high ? 6 : 4) * d.def / cmul();
        if (counter) dmg *= 2;
        if (isSuper) dmg = 34 * d.def / Math.sqrt(cmul());
        o.hp -= dmg; P.dealt += dmg;
        snd.land(high);
        addScore(isSuper ? 1000 : counter ? 200 : high ? 20 : 10);
        if (isSuper) { P.meter = 0; shake = 14; snd.sup(); }
        else {
          const before = P.meter;
          P.meter = Math.min(METER_MAX, P.meter + (counter ? 3 : 1));
          if (before < METER_MAX && P.meter >= METER_MAX) snd.meter();
        }
        o.lastHigh = high;
        if (counter) say(o.ko ? 'KNOCKOUT BLOW!' : 'COUNTER!', 40);
        if (o.st !== 'open' && o.st !== 'hurt') { o.openLeft = 0; if (!counter && !isSuper) o.idleHits = (o.idleHits || 0) + 1; }
        o.st = 'hurt'; o.ht = isSuper ? 30 : 11; o.hurtHigh = high; o.hurtHits++;
        if (counter && o.att) { o.combo = []; o.openLeft = Math.max(o.openLeft, 30); }
        if (o.ko || o.hp <= 0) { o.hp = Math.max(0, o.hp); if (o.ko) o.hp = 0; oppDown(); }
      }
      function updPlayer() {
        const p = P;
        p.t++;
        const canAct = p.st === 'idle' || p.st === 'block' || (p.st === 'dodge' && p.t >= 16 && api.anyPressed('Space', 'KeyX'));
        if (p.st === 'idle' || p.st === 'block') p.since++;
        const highKey = api.key('ArrowUp');
        if (p.st === 'punch' && p.t >= 9) {
          if (api.pressed('Space')) p.queued = ['L', highKey]; else if (api.pressed('KeyX')) p.queued = ['R', highKey];
        }
        if (canAct) {
          const sup = (api.pressed('Enter') || api.pressed('KeyZ') || (api.key('Space') && api.key('KeyX') && (api.pressed('Space') || api.pressed('KeyX')))) && p.meter >= METER_MAX;
          if (sup) { p.st = 'super'; p.t = 0; p.side = 'R'; p.high = true; }
          else if (api.pressed('ArrowLeft')) { p.st = 'dodge'; p.side = 'L'; p.t = 0; }
          else if (api.pressed('ArrowRight')) { p.st = 'dodge'; p.side = 'R'; p.t = 0; }
          else if (api.pressed('Space')) { p.st = 'punch'; p.side = 'L'; p.high = highKey; p.t = 0; p.calm = p.since; p.since = 0; }
          else if (api.pressed('KeyX')) { p.st = 'punch'; p.side = 'R'; p.high = highKey; p.t = 0; p.calm = p.since; p.since = 0; }
          else p.st = api.key('ArrowDown') ? 'block' : 'idle';
        } else if (p.st === 'punch') {
          if (p.t === 6) resolvePunch(p.high, false);
          if (p.t >= 15) {
            if (p.queued) { p.side = p.queued[0]; p.high = p.queued[1]; p.queued = null; p.t = 0; p.calm = 0; }
            else p.st = 'idle';
          }
        } else if (p.st === 'super') {
          if (p.t === 14) resolvePunch(true, true);
          if (p.t >= 32) p.st = 'idle';
        } else if (p.st === 'dodge') { if (p.t >= 28) p.st = 'idle'; }
        else if (p.st === 'hurt') { if (p.t >= 22) p.st = 'idle'; }
        else if (p.st === 'bstun') { if (p.t >= 8) p.st = api.key('ArrowDown') ? 'block' : 'idle'; }
        // dodge offset
        const target = p.st === 'dodge' && p.t < 22 ? (p.side === 'L' ? -46 : 46) : 0;
        p.x += (target - p.x) * 0.35;
      }
      function playerDown() {
        P.st = 'down'; P.kd++; P.presses = 0; S.mode = 'pdown'; S.t = 0; S.count = 0;
        au.noise(0.5, { vol: 0.3, freq: 500 });
        if (P.kd >= 3) { S.result = 'TKO'; loseBout(); }
      }
      function oppDown() {
        O.st = 'down'; O.kd++; S.mode = 'odown'; S.t = 0; S.count = 0; snd.crowd();
        addScore(2000);
        const g = O.d.getUp;
        O.getAt = O.ko || O.kd >= 3 ? 99 : Math.min(9, g[Math.min(1, O.kd - 1)] + (Math.random() * 2 | 0));
        if (O.kd >= 3) { S.result = 'TKO'; }
      }
      function winBout(how) {
        S.result = how; S.mode = 'win'; S.t = 0; snd.win();
        addScore(5000 * (S.opp % 6 + 1) * (S.circuit + 1) + S.clock * 50 * (4 - S.round));
      }
      function loseBout() {
        S.mode = 'lose'; S.t = 0; snd.lose();
      }
      function endRound() {
        snd.bell();
        if (S.round >= 3) {
          // decision
          const pts = P.dealt + O.kd * 30 - (P.taken + P.kd * 30);
          if (pts >= 0) winBout('DECISION'); else { S.result = 'DECISION'; loseBout(); }
          return;
        }
        S.mode = 'rest'; S.t = 0;
      }

      // ---------------- update ----------------
      function update() {
        S.t++;
        if (coinFlash > 0) coinFlash--;
        if (shake > 0) shake--;
        if (flashT > 0) flashT--;
        if (S.msgT > 0) S.msgT--;
        if (S.mode === 'title') {
          S.attract++;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) startGame();
            else { coinFlash = 120; au.tone(70, 0.25, { type: 'square', vol: 0.25 }); }
          }
          return;
        }
        if (S.mode === 'gameover') { if (S.t > 240 || (S.t > 60 && api.anyPressed('Enter'))) { S.mode = 'title'; S.t = 0; S.attract = 0; } return; }
        if (S.mode === 'intro') {
          if (S.t > 220 || (S.t > 40 && api.anyPressed('Enter', 'Space'))) { S.mode = 'ready'; S.t = 0; snd.bell(); }
          return;
        }
        if (S.mode === 'ready') { if (S.t > 80) { S.mode = 'fight'; S.t = 0; } return; }
        if (S.mode === 'rest') {
          if (S.t > 200 || (S.t > 50 && api.anyPressed('Enter'))) {
            S.round++; S.clock = 180; S.clockT = 0;
            P.hp = Math.min(100, P.hp + 30); O.hp = Math.min(100, O.hp + 15);
            P.st = 'idle'; O.st = 'idle'; O.idleT = 60; P.x = 0;
            S.mode = 'ready'; S.t = 0; snd.bell();
          }
          return;
        }
        if (S.mode === 'fight') {
          if (++S.clockT >= 20) { S.clockT = 0; S.clock--; if (S.clock <= 0) { S.clock = 0; endRound(); return; } }
          updPlayer();
          if (S.mode !== 'fight') return;
          updOpp();
          return;
        }
        if (S.mode === 'odown') {
          if (S.t % 50 === 0 && S.t > 0) {
            S.count++; snd.count(S.count);
            if (S.count >= O.getAt && S.count < 10) {
              O.hp = [70, 45, 25][Math.min(2, O.kd - 1)]; O.st = 'idle'; O.idleT = 40; O.guard = 'high'; O.hurtHits = 0;
              P.st = 'idle'; S.mode = 'fight'; S.t = 0; say('FIGHT!', 40);
            } else if (O.kd >= 3 && S.count >= 2) winBout('TKO');
            else if (S.count >= 10) winBout('KO');
          }
          P.x *= 0.9;
          return;
        }
        if (S.mode === 'pdown') {
          if (api.anyPressed('Space', 'KeyX')) { P.presses++; au.tone(300 + P.presses * 20, 0.03, { type: 'square', vol: 0.06 }); }
          const need = 9 + P.kd * 6;
          if (P.presses >= need && S.count >= 2) {
            P.hp = [60, 40, 25][Math.min(2, P.kd - 1)]; P.st = 'idle'; P.x = 0; O.st = 'idle'; O.idleT = 70;
            S.mode = 'fight'; S.t = 0; say('FIGHT!', 40);
            return;
          }
          if (S.t % 50 === 0 && S.t > 0) {
            S.count++; snd.count(S.count);
            if (S.count >= 10) { S.result = 'KO'; loseBout(); }
          }
          return;
        }
        if (S.mode === 'win') {
          if (S.t > 260) {
            S.opp++;
            if (S.opp % OPP.length === 0) { S.mode = 'champ'; S.t = 0; snd.win(); return; }
            newBout(); S.mode = 'intro'; S.t = 0; snd.intro();
          }
          return;
        }
        if (S.mode === 'champ') {
          if (S.t > 300) { S.circuit++; newBout(); S.mode = 'intro'; S.t = 0; snd.intro(); }
          return;
        }
        if (S.mode === 'lose') {
          if (S.t === 200) {
            S.mode = 'wait';
            const cont = () => { newBout(); S.mode = 'intro'; S.t = 0; snd.intro(); };
            if (api.offerContinue) api.offerContinue(cont, gameOver); else gameOver();
          }
          return;
        }
      }

      // ---------------- drawing ----------------
      function drawArena(ctx) {
        // crowd
        ctx.fillStyle = '#100818'; ctx.fillRect(0, 40, W, 70);
        for (let i = 0; i < 90; i++) {
          const x = (i * 37) % W, y = 46 + ((i * 53) % 56);
          const bob = ((S.t >> 3) + i) & 1 && (S.mode === 'odown' || S.mode === 'win') ? -2 : 0;
          ctx.fillStyle = ['#503850', '#704860', '#405070', '#685040'][i & 3];
          ctx.fillRect(x, y + bob, 6, 8); ctx.fillStyle = '#c09070'; ctx.fillRect(x + 1, y - 4 + bob, 4, 4);
        }
        // camera flashes
        if ((S.mode === 'odown' || S.mode === 'win') && (S.t % 23) < 2) { ctx.fillStyle = '#ffffff'; ctx.fillRect((S.t * 41) % W, 50 + (S.t * 13) % 40, 3, 3); }
        // ring floor
        ctx.fillStyle = '#4060a0'; ctx.beginPath(); ctx.moveTo(30, 112); ctx.lineTo(226, 112); ctx.lineTo(W, 170); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.lineTo(0, 170); ctx.fill();
        ctx.fillStyle = '#5070b0'; ctx.fillRect(0, 160, W, 2);
        // corner posts and ropes
        ctx.fillStyle = '#d0d0d0'; ctx.fillRect(28, 70, 5, 44); ctx.fillRect(223, 70, 5, 44);
        const ropes = ['#e02020', '#ffffff', '#2040e0'];
        for (let i = 0; i < 3; i++) { ctx.fillStyle = ropes[i]; ctx.fillRect(30, 76 + i * 12, 196, 2); }
        // logo on floor
        text(ctx, 'WVBA', W / 2, 176, '#5878b8', 2, 'center');
      }
      function drawBoxer(ctx, o, pose, cx, by, sc, flash) {
        const d = o.d;
        const skin = flash ? '#ffffff' : d.skin;
        ctx.save(); ctx.translate(Math.round(cx), Math.round(by)); ctx.scale(sc, sc);
        const w = d.w;
        if (pose === 'down') {
          ctx.fillStyle = skin; ctx.fillRect(-50, -14, 100, 14);
          ctx.fillStyle = d.trunks; ctx.fillRect(-6, -16, 26, 16);
          ctx.fillStyle = d.skin; ctx.fillRect(-64, -18, 18, 16);
          ctx.fillStyle = d.glove; ctx.beginPath(); ctx.arc(-30, -20, 8, 0, 6.3); ctx.arc(10, -22, 8, 0, 6.3); ctx.fill();
          ctx.restore(); return;
        }
        let headDX = 0, headDY = 0, lean = 0;
        if (pose === 'hitHigh') { headDY = -6; headDX = (o.t & 4) ? 3 : -3; }
        if (pose === 'hitBody') { lean = 6; headDY = 8; }
        if (pose === 'dazed') { headDX = Math.sin(S.t * 0.3) * 3; }
        if (pose.startsWith('punch')) lean = 8;
        // legs
        ctx.fillStyle = skin;
        ctx.fillRect(-17 * w, -46, 11 * w, 40); ctx.fillRect(6 * w, -46, 11 * w, 40);
        ctx.fillStyle = '#202020'; ctx.fillRect(-19 * w, -8, 14 * w, 8); ctx.fillRect(5 * w, -8, 14 * w, 8);
        ctx.fillStyle = '#e0e0e0'; ctx.fillRect(-19 * w, -10, 14 * w, 2); ctx.fillRect(5 * w, -10, 14 * w, 2);
        // trunks
        ctx.fillStyle = d.trunks; ctx.fillRect(-22 * w, -66 + lean, 44 * w, 24);
        ctx.fillStyle = d.belt; ctx.fillRect(-22 * w, -66 + lean, 44 * w, 4);
        ctx.fillStyle = '#000'; ctx.fillRect(-1, -60 + lean, 2, 18);
        // torso
        ctx.fillStyle = skin;
        ctx.fillRect(-21 * w, -104 + lean, 42 * w, 40);
        ctx.fillRect(-27 * w, -104 + lean, 54 * w, 12);
        if (!flash) {
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.fillRect(-1, -96 + lean, 2, 28); ctx.fillRect(-14 * w, -84 + lean, 28 * w, 1); ctx.fillRect(-12 * w, -76 + lean, 24 * w, 1);
          ctx.fillRect(-16 * w, -98 + lean, 12 * w, 2); ctx.fillRect(4 * w, -98 + lean, 12 * w, 2);
        }
        // head
        const hx = headDX, hy = -132 + headDY + lean;
        ctx.fillStyle = skin; ctx.fillRect(-6, hy + 22, 12, 8);
        ctx.fillRect(hx - 12, hy, 24, 28);
        ctx.fillRect(hx - 14, hy + 10, 2, 8); ctx.fillRect(hx + 12, hy + 10, 2, 8);
        ctx.fillStyle = d.hair;
        if (d.style === 'short') { ctx.fillRect(hx - 12, hy - 3, 24, 8); ctx.fillRect(hx - 13, hy, 3, 10); ctx.fillRect(hx + 10, hy, 3, 10); }
        else if (d.style === 'flat') { ctx.fillRect(hx - 12, hy - 6, 24, 9); }
        else if (d.style === 'pomp') { ctx.fillRect(hx - 12, hy - 4, 24, 7); ctx.fillRect(hx - 8, hy - 10, 20, 8); }
        else if (d.style === 'slick') { ctx.fillRect(hx - 13, hy - 4, 26, 8); ctx.fillRect(hx - 13, hy, 3, 14); ctx.fillRect(hx + 10, hy, 3, 14); }
        else if (d.style === 'bald') { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(hx - 6, hy + 2, 6, 2); }
        // face
        const tell = o.st === 'tell';
        const eyeCol = (tell && d.tellFx === 'eyes' && (S.t >> 2) & 1) ? '#ffff00' : (pose === 'dazed' || pose === 'hitHigh' ? '#ffffff' : '#101010');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(hx - 8, hy + 9, 6, 4); ctx.fillRect(hx + 2, hy + 9, 6, 4);
        ctx.fillStyle = eyeCol; ctx.fillRect(hx - 6, hy + 10, 3, 3); ctx.fillRect(hx + 4, hy + 10, 3, 3);
        ctx.fillStyle = d.style === 'bald' ? '#603010' : d.hair; ctx.fillRect(hx - 9, hy + 6 - (tell ? 2 : 0), 7, 2); ctx.fillRect(hx + 2, hy + 6 - (tell ? 2 : 0), 7, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(hx - 1, hy + 13, 3, 6);
        if (d.mus) { ctx.fillStyle = d.style === 'bald' ? '#302010' : d.hair; ctx.fillRect(hx - 8, hy + 19, 16, 3); }
        ctx.fillStyle = pose === 'hitHigh' || pose === 'dazed' ? '#a02020' : '#702020';
        if (pose === 'taunt') { ctx.fillStyle = '#fff'; ctx.fillRect(hx - 5, hy + 22, 10, 3); }
        else ctx.fillRect(hx - 4, hy + 23, 8, pose === 'hitHigh' ? 4 : 2);
        // gloves
        const G = { L: [-26, -96], R: [26, -96] }, gs = { L: 10, R: 10 };
        const side = o.curSide || 'C';
        switch (pose) {
          case 'guardHigh': G.L = [-9, -118]; G.R = [9, -118]; break;
          case 'guardLow': G.L = [-12, -78]; G.R = [12, -78]; break;
          case 'taunt': G.L = [-34, -122]; G.R = [34, -122]; break;
          case 'hitHigh': G.L = [-32, -100]; G.R = [32, -100]; break;
          case 'hitBody': G.L = [-24, -84]; G.R = [24, -84]; break;
          case 'dazed': G.L = [-30, -86]; G.R = [30, -86]; break;
          case 'wind':
            if (side === 'L') { G.L = [-38, -108]; G.R = [10, -114]; gs.L = 9; }
            else if (side === 'R') { G.R = [38, -108]; G.L = [-10, -114]; gs.R = 9; }
            else { G.R = [18, -70]; G.L = [-10, -114]; gs.R = 9; }
            break;
          case 'punch':
            if (side === 'L') { G.L = [-8, -86]; gs.L = 18; G.R = [12, -112]; }
            else if (side === 'R') { G.R = [8, -86]; gs.R = 18; G.L = [-12, -112]; }
            else if (curType() === 'upper') { G.R = [4, -124]; gs.R = 17; G.L = [-14, -100]; }
            else { G.R = [2, -96]; gs.R = 18; G.L = [-12, -112]; }
            break;
          case 'side': G.L = [-20, -110]; G.R = [20, -110]; break;
        }
        const shoulder = { L: [-24 * w, -100 + lean], R: [24 * w, -100 + lean] };
        for (const k of ['L', 'R']) {
          ctx.strokeStyle = skin; ctx.lineWidth = 9; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(shoulder[k][0], shoulder[k][1]); ctx.lineTo(G[k][0], G[k][1]); ctx.stroke();
        }
        for (const k of ['L', 'R']) {
          ctx.fillStyle = flash ? '#ffffff' : d.glove; ctx.beginPath(); ctx.arc(G[k][0], G[k][1], gs[k], 0, 6.3); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.arc(G[k][0] - gs[k] * 0.35, G[k][1] - gs[k] * 0.35, gs[k] * 0.35, 0, 6.3); ctx.fill();
          ctx.fillStyle = '#ffffff'; ctx.fillRect(G[k][0] - gs[k] * 0.6, G[k][1] + gs[k] * 0.55, gs[k] * 1.2, 2);
        }
        if (pose === 'dazed' || (o.st === 'down')) {
          for (let i = 0; i < 3; i++) {
            const a = S.t * 0.12 + i * 2.1;
            ctx.fillStyle = '#ffff40'; ctx.fillRect(hx + Math.cos(a) * 16 - 1, hy - 6 + Math.sin(a) * 4, 3, 3);
          }
        }
        ctx.restore();
      }
      function oppPose() {
        const o = O;
        switch (o.st) {
          case 'idle': return o.guard === 'high' ? 'guardHigh' : 'guardLow';
          case 'taunt': return 'taunt';
          case 'tell': return 'wind';
          case 'attack': {
            const wind = Math.max(5, Math.round(o.att.wind / Math.sqrt(cmul())));
            return o.at < wind - 2 ? 'wind' : o.at < wind + 8 ? 'punch' : 'guardHigh';
          }
          case 'open': return 'dazed';
          case 'hurt': return o.hurtHigh ? 'hitHigh' : 'hitBody';
          case 'block': return o.guard === 'high' ? 'guardHigh' : 'guardLow';
          case 'sidestep': return 'side';
          case 'down': return 'down';
        }
        return 'guardHigh';
      }
      function drawOpponent(ctx) {
        const o = O;
        let cx = 128 + Math.sin(o.sideT) * 8, by = 168, sc = 1;
        const pose = S.mode === 'odown' || (S.mode === 'win' && S.result !== 'DECISION') ? 'down' : S.mode === 'lose' ? 'taunt' : oppPose();
        let flash = false;
        if (o.st === 'tell') {
          const fx = o.att.fx || o.d.tellFx;
          if (fx === 'flash' && o.tellT < 24 && (o.tellT >> 1) & 1) flash = true;
          if (fx === 'step') sc = 0.88;
          if (fx === 'hop') by -= Math.abs(Math.sin(o.t * 0.105)) * 10;
          if (fx === 'shake') cx += ((o.t >> 2) & 1 ? 8 : -8);
          if (fx === 'eyes' && o.tellT < 10 && (o.tellT >> 1) & 1) flash = true;
        }
        if (o.st === 'attack' && pose === 'punch') { sc = o.att.type === 'special' ? 1.18 : 1.1; by += 6; }
        if (o.st === 'sidestep') cx += o.sideDir * 30 * Math.sin(o.bt / 22 * Math.PI);
        if (pose === 'down') { by = 178; }
        drawBoxer(ctx, o, pose, cx, by, sc, flash);
      }
      function drawPlayer(ctx) {
        const p = P;
        if (p.st === 'down' && S.mode === 'pdown') {
          // view from the canvas: just gloves at the bottom edges
          ctx.strokeStyle = '#40ff40'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(60, 220, 16, 0, 6.3); ctx.stroke(); ctx.beginPath(); ctx.arc(196, 220, 16, 0, 6.3); ctx.stroke();
          return;
        }
        let x = 128 + p.x, y = 0;
        if (p.st === 'hurt') { y = 8 * Math.max(0, 1 - p.t / 12); x += (p.hurtSide === 'L' ? 10 : -10) * Math.max(0, 1 - p.t / 12); }
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        const col = p.st === 'hurt' && (p.t >> 1) & 1 ? '#ff4040' : (p.meter >= METER_MAX && (S.t >> 3) & 1 ? '#ffff40' : '#40ff40');
        ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
        // head (back of head, wireframe)
        ctx.beginPath(); ctx.ellipse(0, 156, 13, 16, 0, 0, 6.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-10, 150); ctx.quadraticCurveTo(0, 142, 10, 150); ctx.stroke();
        // neck/shoulders/back
        ctx.beginPath();
        ctx.moveTo(-8, 170); ctx.lineTo(-10, 180); ctx.quadraticCurveTo(-46, 182, -54, 200); ctx.lineTo(-58, H);
        ctx.moveTo(8, 170); ctx.lineTo(10, 180); ctx.quadraticCurveTo(46, 182, 54, 200); ctx.lineTo(58, H);
        ctx.moveTo(-20, 200); ctx.quadraticCurveTo(0, 206, 20, 200);
        ctx.moveTo(0, 190); ctx.lineTo(0, H);
        ctx.stroke();
        // gloves
        let L = [-40, 186], R = [40, 186], rL = 12, rR = 12;
        if (p.st === 'block' || p.st === 'bstun') { L = [-14, 150]; R = [14, 150]; rL = rR = 13; }
        else if (p.st === 'punch' || p.st === 'super') {
          const dur = p.st === 'super' ? 14 : 6;
          const k = p.t <= dur ? p.t / dur : Math.max(0, 1 - (p.t - dur) / (p.st === 'super' ? 18 : 9));
          const ox = 128 + Math.sin(O.sideT) * 8 - x;
          const ty = p.high ? 50 : 88;
          const tx = ox + (p.side === 'L' ? -6 : 6);
          if (p.st === 'super') { const wind = p.t < 8 ? p.t / 8 : 0; R = [40 + 20 * wind + (tx - 40) * (p.t >= 8 ? k : 0), 186 + 20 * wind + (ty - 186) * (p.t >= 8 ? k : 0)]; rR = 12 - 4 * (p.t >= 8 ? k : 0); }
          else if (p.side === 'L') { L = [-40 + (tx + 40) * k, 186 + (ty - 186) * k]; rL = 12 - 4 * k; }
          else { R = [40 + (tx - 40) * k, 186 + (ty - 186) * k]; rR = 12 - 4 * k; }
        }
        ctx.beginPath(); ctx.moveTo(-50, 200); ctx.lineTo(L[0], L[1] + rL * 0.6); ctx.moveTo(50, 200); ctx.lineTo(R[0], R[1] + rR * 0.6); ctx.stroke();
        for (const [g, r] of [[L, rL], [R, rR]]) {
          ctx.beginPath(); ctx.arc(g[0], g[1], r, 0, 6.3); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(g[0] - r * 0.7, g[1] + r * 0.4); ctx.lineTo(g[0] + r * 0.7, g[1] + r * 0.4); ctx.stroke();
        }
        ctx.restore();
      }
      function bar(ctx, x, y, w, v, col, right) {
        ctx.fillStyle = '#202020'; ctx.fillRect(x, y, w, 6);
        const f = Math.max(0, Math.min(1, v / 100)) * w;
        ctx.fillStyle = col; ctx.fillRect(right ? x + w - f : x, y, f, 6);
        ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, 1);
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 40);
        text(ctx, '1P', 6, 2, '#40ff40'); text(ctx, String(S.score).padStart(7, '0'), 22, 2, '#fff');
        text(ctx, 'TOP', 160, 2, '#ff4040'); text(ctx, String(S.hi).padStart(7, '0'), 182, 2, '#fff');
        if (!O || S.mode === 'title') return;
        const m = Math.floor(S.clock / 60), s = S.clock % 60;
        text(ctx, 'TIME', W / 2, 12, '#ffd000', 1, 'center'); text(ctx, m + ':' + String(s).padStart(2, '0'), W / 2, 21, '#fff', 1, 'center');
        text(ctx, 'R' + S.round, W / 2, 31, '#aaa', 1, 'center');
        text(ctx, 'LITTLE MAC', 6, 12, '#40ff40');
        bar(ctx, 6, 21, 90, P.hp, '#40e040', false);
        text(ctx, O.d.name, W - 6, 12, '#ff6060', 1, 'right');
        bar(ctx, W - 96, 21, 90, O.hp, '#e04040', true);
        // KO meter
        text(ctx, 'KO', 6, 30, P.meter >= METER_MAX && (S.t >> 3) & 1 ? '#ffff40' : '#ff8040');
        for (let i = 0; i < METER_MAX; i++) {
          ctx.fillStyle = i < P.meter ? (P.meter >= METER_MAX ? ((S.t >> 2) & 1 ? '#ffff40' : '#ff8000') : '#ff8040') : '#302010';
          ctx.fillRect(20 + i * 6, 30, 5, 7);
        }
        for (let i = 0; i < O.kd; i++) { ctx.fillStyle = '#ffd000'; ctx.fillRect(W - 12 - i * 8, 31, 5, 5); }
        for (let i = 0; i < P.kd; i++) { ctx.fillStyle = '#40ff40'; ctx.fillRect(100 + i * 8, 31, 5, 5); }
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        text(ctx, 'PUNCH-OUT!!', W / 2 + 2, 30 + 2, '#600000', 3, 'center');
        text(ctx, 'PUNCH-OUT!!', W / 2, 30, '#ff2020', 3, 'center');
        // rotating opponent showcase
        const idx = (S.attract >> 7) % OPP.length;
        const fake = { d: OPP[idx], t: S.t, st: 'idle', sideT: 0, curSide: 'C' };
        drawBoxer(ctx, fake, (S.t >> 5) & 1 ? 'guardHigh' : 'taunt', W / 2, 168, 0.8, false);
        text(ctx, OPP[idx].name, W / 2, 172, '#ffd000', 1, 'center');
        text(ctx, OPP[idx].from + '  ' + OPP[idx].rec, W / 2, 182, '#aaa', 1, 'center');
        const blink = (S.t % 60) < 40;
        if (coinFlash > 0) { if ((coinFlash >> 3) & 1) text(ctx, 'INSERT COIN', W / 2, 196, '#ff4040', 1, 'center'); }
        else if (api.credits > 0) { if (blink) text(ctx, 'PUSH START', W / 2, 196, '#40ff40', 1, 'center'); }
        else if (blink) text(ctx, 'INSERT COIN', W / 2, 196, '#40ff40', 1, 'center');
        text(ctx, '\u00a9 1984 NINTENDO', 6, 213, '#fff');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W - 6, 213, '#aaa', 1, 'right');
        text(ctx, 'WATCH FOR THE TELLS', W / 2, 60, '#40ff40', 1, 'center');
      }
      function drawIntro(ctx) {
        ctx.fillStyle = '#000018'; ctx.fillRect(0, 40, W, H - 40);
        const d = oppDef();
        drawBoxer(ctx, { d, t: S.t, st: 'idle', sideT: 0, curSide: 'C' }, 'taunt', 72, 200, 0.95, false);
        text(ctx, S.circuit ? 'CIRCUIT ' + (S.circuit + 1) : 'BOUT ' + (S.opp % 6 + 1), 176, 56, '#40ff40', 1, 'center');
        text(ctx, d.name, 176, 76, '#ffd000', 1, 'center');
        text(ctx, 'FROM', 176, 94, '#aaa', 1, 'center'); text(ctx, d.from, 176, 104, '#fff', 1, 'center');
        text(ctx, 'RECORD ' + d.rec, 176, 122, '#fff', 1, 'center');
        text(ctx, 'SPECIAL:', 176, 140, '#aaa', 1, 'center'); text(ctx, d.special.n, 176, 150, '#ff6060', 1, 'center');
        if ((S.t >> 4) & 1) text(ctx, 'GET READY!', 176, 180, '#fff', 1, 'center');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (S.mode === 'title') { drawTitle(ctx); drawHUD(ctx); return; }
        if (S.mode === 'intro') { drawIntro(ctx); drawHUD(ctx); return; }
        ctx.save();
        if (shake > 0) ctx.translate((shake & 2) ? 3 : -3, (shake & 4) ? 2 : -1);
        drawArena(ctx);
        drawOpponent(ctx);
        drawPlayer(ctx);
        ctx.restore();
        if (flashT > 0) { ctx.fillStyle = 'rgba(255,0,0,0.3)'; ctx.fillRect(0, 40, W, H - 40); }
        drawHUD(ctx);
        if (S.msgT > 0) text(ctx, S.msg, W / 2, 50, '#ffff40', 2, 'center');
        if (S.mode === 'ready') { ctx.fillStyle = '#000'; ctx.fillRect(68, 96, 120, 28); text(ctx, 'ROUND ' + S.round, W / 2, 98, '#fff', 2, 'center'); if (S.t > 40) text(ctx, 'FIGHT!', W / 2, 114, '#ff4040', 1, 'center'); }
        if (S.mode === 'odown' || S.mode === 'pdown') {
          if (S.count > 0) text(ctx, String(S.count), W / 2, 64, '#ffffff', 4, 'center');
          if (S.mode === 'pdown') { text(ctx, 'GET UP! MASH SPACE/X', W / 2, 104, (S.t >> 3) & 1 ? '#40ff40' : '#ffff40', 1, 'center'); bar(ctx, 78, 116, 100, P.presses / (9 + P.kd * 6) * 100, '#40ff40'); }
          else if (O.kd >= 3) text(ctx, 'TKO!', W / 2, 104, '#ffd000', 2, 'center');
          else text(ctx, 'DOWN!', W / 2, 104, '#ffd000', 2, 'center');
        }
        if (S.mode === 'rest') {
          ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(40, 70, 176, 80);
          text(ctx, 'END OF ROUND ' + S.round, W / 2, 78, '#ffd000', 1, 'center');
          text(ctx, 'PUNCHES LANDED ' + Math.round(P.dealt), W / 2, 96, '#fff', 1, 'center');
          text(ctx, 'DAMAGE TAKEN ' + Math.round(P.taken), W / 2, 108, '#fff', 1, 'center');
          text(ctx, 'TIP: ' + ['DODGE THEN COUNTER', 'BLOCK JABS AND HOOKS', 'DODGE UPPERCUTS', 'HIT HIM WHERE HE ISN\'T GUARDING'][(S.opp + S.round) % 4], W / 2, 130, '#40ff40', 1, 'center');
        }
        if (S.mode === 'win') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(48, 84, 160, 44);
          text(ctx, S.result === 'DECISION' ? 'YOU WIN!' : S.result + '!', W / 2, 90, '#ffd000', 2, 'center');
          text(ctx, S.result === 'DECISION' ? 'BY DECISION' : 'YOU WIN!', W / 2, 112, '#fff', 1, 'center');
        }
        if (S.mode === 'champ') {
          ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(24, 70, 208, 70);
          text(ctx, 'CHAMPION!', W / 2, 80, '#ffd000', 3, 'center');
          text(ctx, 'NOW DEFEND THE BELT...', W / 2, 116, '#fff', 1, 'center');
        }
        if (S.mode === 'lose' || S.mode === 'wait') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(48, 84, 160, 44);
          text(ctx, 'YOU LOSE', W / 2, 90, '#ff4040', 2, 'center');
          text(ctx, 'BY ' + S.result, W / 2, 112, '#fff', 1, 'center');
        }
        if (S.mode === 'gameover') { ctx.fillStyle = '#000'; ctx.fillRect(64, 92, 128, 28); text(ctx, 'GAME OVER', W / 2, 98, '#fff', 2, 'center'); }
      }
      return { update, render, destroy() { } };
    }
  });
})();
