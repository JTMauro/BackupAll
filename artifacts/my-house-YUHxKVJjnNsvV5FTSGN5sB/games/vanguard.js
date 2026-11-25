// Vanguard (SNK, 1981) - from-scratch recreation for the MAME32 Game Room.
// Fly the tunnel through the Mountain, Rainbow, Stripe, City of Mystery and Bleak zones to Gond's lair.
// Fire in four directions, keep your energy topped up by shooting enemies, grab energy pods to ram everything.
(function () {
  'use strict';
  const W = 256, H = 224, PT = 24, PB = 206;

  // ================= 5x7 bitmap font =================
  const FONT_HEX = {
    '0': '0E11131519110E', '1': '040C040404040E', '2': '0E11010204081F', '3': '1F02040201110E',
    '4': '02060A121F0202', '5': '1F101E0101110E', '6': '0608101E11110E', '7': '1F010204080808',
    '8': '0E11110E11110E', '9': '0E11110F01020C', 'A': '0E11111F111111', 'B': '1E11111E11111E',
    'C': '0E11101010110E', 'D': '1C12111111121C', 'E': '1F10101E10101F', 'F': '1F10101E101010',
    'G': '0E11101711110F', 'H': '1111111F111111', 'I': '0E04040404040E', 'J': '0702020202120C',
    'K': '11121418141211', 'L': '1010101010101F', 'M': '111B1515111111', 'N': '11111915131111',
    'O': '0E11111111110E', 'P': '1E11111E101010', 'Q': '0E11111115120D', 'R': '1E11111E141211',
    'S': '0F10100E01011E', 'T': '1F040404040404', 'U': '1111111111110E', 'V': '11111111110A04',
    'W': '1111111515150A', 'X': '11110A040A1111', 'Y': '1111110A040404', 'Z': '1F01020408101F',
    ' ': '00000000000000', '!': '04040404040004', '-': '0000001F000000', '.': '00000000000C0C',
    ':': '000C0C000C0C00', '/': '00010204081000', "'": '04040000000000', '?': '0E110102040004',
    '\u00a9': '0E11171417110E', '=': '00001F001F0000', '+': '0004041F040400', '*': '0004150E150400'
  };
  const FONT = {};
  for (const k in FONT_HEX) { const s = FONT_HEX[k]; const a = []; for (let i = 0; i < 7; i++) a.push(parseInt(s.substr(i * 2, 2), 16) || 0); FONT[k] = a; }
  function txt(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) { const b = g[r]; if (!b) continue; for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc); }
    }
  }
  // run-length sprite painter: rows of chars, '.' transparent, other chars index the palette
  function spr(ctx, rows, x, y, pal, flip) {
    x = Math.round(x); y = Math.round(y);
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r], n = row.length; let c = 0;
      while (c < n) {
        const ch = row[c]; if (ch === '.') { c++; continue; }
        let e = c + 1; while (e < n && row[e] === ch) e++;
        ctx.fillStyle = pal[ch];
        ctx.fillRect(flip ? x + n - e : x + c, y + r, e - c, 1);
        c = e;
      }
    }
  }

  // ================= sprites =================
  const SHIP = [
    'aa..............',
    'aaa.............',
    'abbbbbbccc......',
    '.bbbbbbbbbbbbb..',
    'abbbbbbbbbbbbbbd',
    'aaa.............',
    'aa..............'];
  const SHIP_V = [ // nose up for the Stripe zone
    '...d...',
    '...b...',
    '..bbb..',
    '..bbb..',
    '..bcb..',
    '..bcb..',
    '..bcb..',
    '.bbbbb.',
    'abbbbba',
    'aa.b.aa',
    'a.....a'];
  const MIST = [
    '....cccc....',
    '..cccccccc..',
    '.dcdcdcdcdc.',
    'cccccccccccc',
    '..c..cc..c..'];
  const ROCKET = [
    '..a..',
    '.aaa.',
    '.bbb.',
    '.bab.',
    '.bbb.',
    '.bbb.',
    'b.b.b',
    'b...b'];
  const SEG = [
    '..aaaa..',
    '.abbbba.',
    'abbccbba',
    'abccccba',
    'abccccba',
    'abbccbba',
    '.abbbba.',
    '..aaaa..'];
  const DIVER = [
    '.aa.......',
    'aaaa..bb..',
    '.bbbbbbbbb',
    'cbbbbbbbbb',
    '.bbbbbbbbb',
    'aaaa..bb..',
    '.aa.......'];
  const BALLOON = [
    '..aaaa..',
    '.abbbba.',
    'abbbbbba',
    'abaabaab',
    'abbbbbba',
    '.abbbba.',
    '..c..c..',
    '.c....c.'];
  const TURRET = [
    '....aa....',
    '...aaaa...',
    '..bbbbbb..',
    '.bbcbbcbb.',
    'bbbbbbbbbb',
    'bbbbbbbbbb'];
  const ROCK = [
    '..aaa...',
    '.abbba..',
    'abbbbbaa',
    'abbcbbba',
    'abbbbcba',
    '.abbbba.',
    '..aaaa..'];

  const ZONES = [
    { name: 'MOUNTAIN', dir: 'h', len: 2600, sky: '#000018' },
    { name: 'RAINBOW', dir: 'h', len: 2600, sky: '#000010' },
    { name: 'STRIPE', dir: 'v', len: 2000, sky: '#000010' },
    { name: 'CITY', dir: 'h', len: 2600, sky: '#00000c' },
    { name: 'BLEAK', dir: 'h', len: 2000, sky: '#000000' },
    { name: 'GOND', dir: 'h', len: 380, sky: '#100008' }
  ];
  const RAINBOW = ['#ff2020', '#ff9020', '#ffff20', '#20ff40', '#20c0ff', '#4040ff', '#c040ff'];

  ArcadeRegistry.register({
    id: 'vanguard', title: 'Vanguard', year: 1981, maker: 'SNK',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: fly \u00b7 WASD: fire up/left/down/right \u00b7 Space: fire forward \u00b7 X: fire up+down \u00b7 Enter: start',
    marquee: { bg: '#000018', fg: '#ff3030', accent: '#ffd200' },
    create(api) {
      const A = api.audio;
      let hi = api.getHiScore(20000);
      let state = 'title', T = 0, score = 0, lives = 3, loop = 0, zoneIdx = 0, zone = ZONES[0];
      let pos = 0, scroll = 0, terr = null, player, shots, eshots, enemies, fx, stars, fuel, spawnT, podT, bannerT, nextExtra;
      let boss = null, barrier = null, clearT = 0, coinFlash = 0, titlePage = 0, inv = 0, invMusicT = 0, lowFuelT = 0;
      const cool = { u: 0, d: 0, l: 0, r: 0 };

      // ---------- sound ----------
      const snd = {
        shot() { A.tone(1500, 0.06, { type: 'square', vol: 0.06, slideTo: 500 }); },
        boom() { A.noise(0.3, { vol: 0.2, freq: 1500, slideTo: 200 }); },
        big() { A.noise(0.9, { vol: 0.25, freq: 900, slideTo: 60 }); A.tone(120, 0.6, { type: 'sawtooth', vol: 0.12, slideTo: 40 }); },
        die() { A.noise(1.2, { vol: 0.25, freq: 2500, slideTo: 80 }); A.tone(600, 1.0, { type: 'square', vol: 0.12, slideTo: 60 }); },
        pod() { A.melody([[523, .06], [659, .06], [784, .06], [1047, .06], [784, .06], [1047, .14]], { type: 'square', vol: 0.12 }); },
        zone() { A.melody([[392, .1], [523, .1], [659, .1], [784, .2], [659, .1], [784, .3]], { type: 'square', vol: 0.12 }); },
        start() { A.melody([[262, .12], [330, .12], [392, .12], [523, .24], [392, .12], [523, .12], [659, .4]], { type: 'square', vol: 0.13 }); },
        extra() { A.melody([[880, .08], [1175, .08], [880, .08], [1175, .2]], { type: 'square', vol: 0.12 }); },
        coin() { A.tone(1800, 0.06, { type: 'square', vol: 0.08, slideTo: 2400 }); }
      };
      let lastCred = api.credits;

      // ---------- terrain ----------
      const rnd = (a, b) => a + Math.random() * (b - a);
      function genTerrain(z) {
        if (z.dir === 'v') {
          const n = Math.ceil((z.len + 400) / 8);
          const left = new Float32Array(n), right = new Float32Array(n);
          let l = 16, r = 240, tl = 16, tr = 240;
          for (let i = 0; i < n; i++) {
            if (i % 10 === 0) { tl = rnd(6, 90); tr = rnd(166, 250); if (tr - tl < 116) tr = tl + 116; }
            l += Math.max(-3, Math.min(3, tl - l)); r += Math.max(-3, Math.min(3, tr - r));
            const calm = Math.min(1, i / 25, (n - i - 30) / 25);
            const c = Math.max(0, calm);
            left[i] = 12 * (1 - c) + l * c; right[i] = 244 * (1 - c) + r * c;
          }
          return { left, right, n };
        }
        const n = Math.ceil((z.len + 400) / 8);
        const top = new Float32Array(n), bot = new Float32Array(n), kind = new Uint8Array(n);
        let t = PT + 6, b = PB - 20, tt = t, tb = b, hold = 0, ph = rnd(0, 6);
        for (let i = 0; i < n; i++) {
          if (z.name === 'MOUNTAIN') {
            if (i % 7 === 0) tb = PB - rnd(14, 100);
            if (i % 11 === 0) tt = PT + rnd(2, 22);
            b += Math.max(-4, Math.min(4, tb - b)); t += Math.max(-2, Math.min(2, tt - t));
          } else if (z.name === 'RAINBOW') {
            t = PT + 30 + Math.sin(i * 0.06 + ph) * 26; b = PB - 30 - Math.sin(i * 0.05 + ph * 2) * 26;
          } else if (z.name === 'CITY') {
            if (--hold <= 0) { hold = 3 + (Math.random() * 4 | 0); tb = PB - rnd(14, 92); kind[i] = 1; }
            b = tb; t = PT + 2;
          } else if (z.name === 'BLEAK') {
            if (i % 2 === 0) { tt = PT + rnd(8, 54); tb = PB - rnd(8, 54); }
            t += (tt - t) * 0.5; b += (tb - b) * 0.5;
          } else { t = PT + 10; b = PB - 10; }
          let tp = t, bt = b;
          if (bt - tp < 88) { const m = (tp + bt) / 2; tp = m - 44; bt = m + 44; }
          const c = Math.max(0, Math.min(1, i / 25, (n - i - 30) / 25));
          top[i] = (PT + 4) * (1 - c) + tp * c; bot[i] = (PB - 12) * (1 - c) + bt * c;
        }
        return { top, bot, kind, n };
      }
      function colAt(arr, w) {
        let i = w / 8; let i0 = Math.floor(i); const f = i - i0;
        if (i0 < 0) return arr[0]; if (i0 >= terr.n - 1) return arr[terr.n - 1];
        return arr[i0] + (arr[i0 + 1] - arr[i0]) * f;
      }
      const ceilAt = sx => colAt(terr.top, sx + pos);
      const floorAt = sx => colAt(terr.bot, sx + pos);
      const leftAt = sy => colAt(terr.left, PB - sy + pos);
      const rightAt = sy => colAt(terr.right, PB - sy + pos);
      function solidAt(sx, sy) {
        if (sy < PT || sy >= PB) return true;
        if (zone.dir === 'h') return sy < ceilAt(sx) || sy > floorAt(sx);
        return sx < leftAt(sy) || sx > rightAt(sy);
      }

      // ---------- game flow ----------
      function newStars() { stars = []; for (let i = 0; i < 40; i++) stars.push({ x: rnd(0, W), y: rnd(PT, PB), c: (Math.random() * 7) | 0 }); }
      function startGame() {
        score = 0; lives = 3; loop = 0; zoneIdx = 0; nextExtra = 10000;
        snd.start(); enterZone(0, true);
      }
      function enterZone(i, banner) {
        zoneIdx = i; zone = ZONES[i]; pos = 0; terr = genTerrain(zone);
        shots = []; eshots = []; enemies = []; fx = []; boss = null; barrier = null; inv = 0;
        player = zone.dir === 'h' ? { x: 40, y: (PT + PB) / 2 } : { x: 128, y: PB - 40 };
        fuel = 1000; spawnT = 120; podT = 900 + rnd(0, 600); bannerT = banner ? 150 : 0;
        newStars(); state = 'play'; T = 0;
        if (zone.name === 'GOND') setupBoss();
        if (banner && T === 0 && i > 0) snd.zone();
      }
      function setupBoss() {
        boss = { x: 222, y: (PT + PB) / 2, vy: 0.5 + loop * 0.15, hp: 10 + loop * 3, flash: 0, fireT: 90, dead: 0, mouth: 0 };
        barrier = { off: 0, rows: [], regen: 0 };
        for (let r = 0; r < 22; r++) barrier.rows.push(r % 5 !== 2);
      }
      function addScore(n) {
        score += n;
        if (score >= nextExtra) { lives++; snd.extra(); nextExtra += nextExtra === 10000 ? 40000 : 50000; }
        if (score > hi) hi = score;
      }
      function boom(x, y, big) { fx.push({ x, y, t: 0, big: !!big }); }
      let noDie = false;
      function killPlayer() {
        if (state !== 'play' || noDie) return;
        state = 'dying'; T = 0; boom(player.x, player.y, true); snd.die(); inv = 0;
      }

      // ---------- spawning ----------
      function gapAt(sx) { return [ceilAt(sx), floorAt(sx)]; }
      function spawn() {
        const lv = loop, zn = zone.name;
        const rate = Math.max(28, 75 - lv * 10 - zoneIdx * 4);
        spawnT = rate + rnd(0, rate);
        if (zone.dir === 'v') {
          const y = PT - 8, l = leftAt(PT + 2), r = rightAt(PT + 2);
          const x = rnd(l + 12, r - 12);
          if (Math.random() < 0.7) enemies.push({ t: 'balloon', x, bx: x, y, vy: 0.3 + lv * 0.1, ph: rnd(0, 6), w: 8, h: 8, pts: 100, fire: rnd(60, 180) });
          else enemies.push({ t: 'diver', x, y, vy: 1.2 + lv * 0.2, vx: 0, w: 10, h: 7, pts: 150, fire: 999, vert: true });
          return;
        }
        const g = gapAt(W + 8);
        if (zn === 'MOUNTAIN') {
          if (Math.random() < 0.55) {
            const n = 1 + (Math.random() * 3 | 0), by = rnd(g[0] + 12, g[1] - 12);
            for (let k = 0; k < n; k++) enemies.push({ t: 'mist', x: W + 8 + k * 18, by, y: by, vx: -0.5 - rnd(0, 0.5) - lv * 0.15, ph: k * 0.8, amp: rnd(6, 18), w: 12, h: 5, pts: 50, fire: rnd(80, 240) });
          } else enemies.push({ t: 'rocket', x: W + 4, y: floorAt(W + 6) - 8, vy: 0, w: 5, h: 8, pts: 100, live: false });
        } else if (zn === 'RAINBOW') {
          if (Math.random() < 0.5) {
            const by = (g[0] + g[1]) / 2, amp = Math.min(30, (g[1] - g[0]) / 2 - 10);
            for (let k = 0; k < 6; k++) enemies.push({ t: 'seg', x: W + 8 + k * 9, by, y: by, vx: -0.8 - lv * 0.15, ph: -k * 0.45, amp, w: 8, h: 8, pts: k === 0 ? 300 : 100, head: k === 0 });
          } else enemies.push({ t: 'diver', x: W + 8, y: rnd(g[0] + 10, g[1] - 10), vx: -1.2 - lv * 0.2, vy: 0, w: 10, h: 7, pts: 150, fire: rnd(60, 160) });
        } else if (zn === 'CITY') {
          if (Math.random() < 0.5) enemies.push({ t: 'turret', x: W + 4, y: floorAt(W + 9) - 6, w: 10, h: 6, pts: 200, fire: rnd(40, 120) });
          else { const by = rnd(g[0] + 12, g[1] - 12); enemies.push({ t: 'mist', x: W + 8, by, y: by, vx: -0.9 - lv * 0.15, ph: 0, amp: rnd(8, 24), w: 12, h: 5, pts: 80, fire: rnd(60, 160) }); }
        } else if (zn === 'BLEAK') {
          enemies.push({ t: 'rock', x: W + 8, y: rnd(g[0] + 10, g[1] - 10), vx: -1.6 - rnd(0, 0.8) - lv * 0.2, vy: rnd(-0.3, 0.3), w: 8, h: 7, pts: 100, hp: 2, spin: 0 });
          spawnT *= 0.7;
        } else if (zn === 'GOND') {
          if (boss && !boss.dead && Math.random() < 0.6) { const by = rnd(PT + 30, PB - 30); enemies.push({ t: 'mist', x: 170, by, y: by, vx: -1.0 - lv * 0.2, ph: 0, amp: 14, w: 12, h: 5, pts: 80, fire: 999 }); }
          spawnT += 60;
        }
      }

      // ---------- update ----------
      function fireShot(dir) {
        if (cool[dir] > 0) return;
        let n = 0; for (const s of shots) if (s.dir === dir) n++;
        if (n >= 3) return;
        cool[dir] = 7;
        const v = { u: [0, -5], d: [0, 5], l: [-5, 0], r: [5, 0] }[dir];
        let sx = player.x, sy = player.y;
        if (zone.dir === 'h') { if (dir === 'r') sx += 9; if (dir === 'l') sx -= 9; }
        else { if (dir === 'u') sy -= 6; }
        shots.push({ x: sx, y: sy, vx: v[0], vy: v[1], dir, life: 60 });
        snd.shot();
      }
      function updatePlay() {
        T++;
        if (bannerT > 0) bannerT--;
        if (inv > 0) { inv--; if (--invMusicT <= 0) { invMusicT = 50; A.melody([[784, .05], [988, .05], [1175, .05], [988, .05]], { type: 'square', vol: 0.07 }); } }
        // scroll
        const fwd = zone.dir === 'h' ? api.key('ArrowRight') : api.key('ArrowUp');
        scroll = (1.0 + loop * 0.15) * (fwd ? 1.5 : 1);
        if (boss) { if (pos >= zone.len) scroll = 0; }
        else if (pos >= zone.len) { // zone finished
          const ni = zoneIdx + 1; addScore(1000); enterZone(ni, true); return;
        }
        pos += scroll;
        // stars
        for (const s of stars) {
          if (zone.dir === 'h') { s.x -= scroll * 0.4; if (s.x < 0) { s.x += W; s.y = rnd(PT, PB); } }
          else { s.y += scroll * 0.4; if (s.y > PB) { s.y -= PB - PT; s.x = rnd(0, W); } }
        }
        // player
        const sp = 1.7;
        if (api.key('ArrowLeft')) player.x -= sp;
        if (api.key('ArrowRight')) player.x += sp * (zone.dir === 'h' ? 0.7 : 1);
        if (api.key('ArrowUp')) player.y -= sp * (zone.dir === 'v' ? 0.7 : 1);
        if (api.key('ArrowDown')) player.y += sp;
        if (zone.dir === 'h') { player.x = Math.max(10, Math.min(boss ? 160 : 190, player.x)); player.y = Math.max(PT + 4, Math.min(PB - 4, player.y)); }
        else { player.x = Math.max(6, Math.min(W - 6, player.x)); player.y = Math.max(PT + 50, Math.min(PB - 8, player.y)); }
        // fire
        for (const k in cool) if (cool[k] > 0) cool[k]--;
        if (api.key('KeyW')) fireShot('u');
        if (api.key('KeyS')) fireShot('d');
        if (api.key('KeyA')) fireShot('l');
        if (api.key('KeyD')) fireShot('r');
        if (api.key('Space')) fireShot(zone.dir === 'h' ? 'r' : 'u');
        if (api.key('KeyX')) { if (zone.dir === 'h') { fireShot('u'); fireShot('d'); } else { fireShot('l'); fireShot('r'); } }
        // fuel
        const drain = (zone.name === 'BLEAK' ? 0.3 : 0.5) + loop * 0.06;
        if (bannerT <= 0) fuel -= drain;
        if (fuel < 250 && --lowFuelT <= 0) { lowFuelT = 30; A.tone(220, 0.08, { type: 'square', vol: 0.1 }); }
        if (fuel <= 0) { fuel = 0; killPlayer(); return; }
        // terrain collision
        const hw = zone.dir === 'h' ? 7 : 3, hh = zone.dir === 'h' ? 3 : 5;
        if (solidAt(player.x - hw, player.y - hh) || solidAt(player.x + hw, player.y - hh) || solidAt(player.x - hw, player.y + hh) || solidAt(player.x + hw, player.y + hh) || solidAt(player.x, player.y)) { killPlayer(); return; }
        // spawn
        if (bannerT <= 60 && --spawnT <= 0) spawn();
        if (zone.name !== 'BLEAK' && zone.name !== 'GOND' && --podT <= 0) {
          podT = 1300 + rnd(0, 900);
          if (zone.dir === 'h') { const g = gapAt(W + 8); enemies.push({ t: 'pod', x: W + 8, y: (g[0] + g[1]) / 2, w: 10, h: 10, pts: 0 }); }
          else enemies.push({ t: 'pod', x: (leftAt(PT + 4) + rightAt(PT + 4)) / 2, y: PT - 6, w: 10, h: 10, pts: 0 });
        }
        // shots
        for (const s of shots) {
          s.x += s.vx; s.y += s.vy; s.life--;
          if (s.x < -4 || s.x > W + 4 || s.y < PT || s.y > PB || solidAt(s.x, s.y)) s.life = 0;
        }
        // enemies
        const dx = zone.dir === 'h' ? -scroll : 0, dy = zone.dir === 'v' ? scroll : 0;
        for (const e of enemies) {
          e.x += dx; e.y += dy; if (e.by != null) e.by += dy;
          switch (e.t) {
            case 'mist': {
              e.x += e.vx; e.ph += 0.06; e.y = e.by + Math.sin(e.ph) * e.amp;
              if (zone.dir === 'h' && e.x < W) { const g = gapAt(e.x); e.y = Math.max(g[0] + 5, Math.min(g[1] - 5, e.y)); }
              if (--e.fire <= 0 && e.x < W - 10) { e.fire = Math.max(60, 200 - loop * 30) + rnd(0, 80); aimShot(e.x, e.y, 1.4 + loop * 0.2); }
              break;
            }
            case 'rocket': {
              if (!e.live && e.x - player.x < 70 + Math.random() * 30 && e.x < W - 4) { e.live = true; A.tone(300, 0.4, { type: 'sawtooth', vol: 0.06, slideTo: 1200 }); }
              if (e.live) { e.vy = Math.max(-3, e.vy - 0.06 - loop * 0.01); e.y += e.vy; if (solidAt(e.x, e.y - 5)) { e.dead = true; boom(e.x, e.y); } }
              else e.y = floorAt(e.x) - 8;
              break;
            }
            case 'seg': e.x += e.vx; e.ph += 0.05; e.y = e.by + Math.sin(e.ph) * e.amp; break;
            case 'diver': {
              if (e.vert) { e.y += e.vy; e.x += Math.max(-0.8, Math.min(0.8, (player.x - e.x) * 0.02)); }
              else {
                e.x += e.vx;
                if (e.x - player.x < 90) e.vy += Math.sign(player.y - e.y) * 0.05;
                e.vy = Math.max(-1.4, Math.min(1.4, e.vy)); e.y += e.vy;
                if (--e.fire <= 0) { e.fire = 150; aimShot(e.x, e.y, 1.6 + loop * 0.2); }
              }
              break;
            }
            case 'balloon': {
              e.y += e.vy; e.ph += 0.04; e.x = e.bx + Math.sin(e.ph) * 20;
              if (--e.fire <= 0 && e.y > PT) { e.fire = Math.max(70, 180 - loop * 30); aimShot(e.x, e.y, 1.4 + loop * 0.2); }
              break;
            }
            case 'turret': {
              e.y = floorAt(e.x + 5) - 6;
              if (--e.fire <= 0 && e.x < W - 8 && e.x > 8) { e.fire = Math.max(50, 120 - loop * 20) + rnd(0, 40); aimShot(e.x + 5, e.y, 1.5 + loop * 0.2); }
              break;
            }
            case 'rock': e.x += e.vx; e.y += e.vy; e.spin++; if (solidAt(e.x, e.y)) e.vy = -e.vy * 1.0, e.y += e.vy * 3; break;
            case 'pod': break;
          }
          if (e.x < -24 || e.x > W + 80 || e.y > PB + 16 || e.y < PT - 40) e.gone = true;
        }
        // eshots
        for (const s of eshots) { s.x += s.vx + dx; s.y += s.vy + dy; if (s.x < 0 || s.x > W || s.y < PT || s.y > PB || solidAt(s.x, s.y)) s.dead = true; }
        // boss
        if (boss) updateBoss();
        // collisions: shots vs enemies
        for (const s of shots) {
          if (s.life <= 0) continue;
          for (const e of enemies) {
            if (e.dead || e.gone || e.t === 'pod') continue;
            if (Math.abs(s.x - e.x) < e.w / 2 + 2 && Math.abs(s.y - e.y) < e.h / 2 + 2) {
              s.life = 0;
              if (e.hp && --e.hp > 0) { A.tone(900, 0.03, { type: 'square', vol: 0.06 }); break; }
              killEnemy(e); break;
            }
          }
        }
        // player vs enemies and shots
        for (const e of enemies) {
          if (e.dead || e.gone) continue;
          if (Math.abs(player.x - e.x) < e.w / 2 + 6 && Math.abs(player.y - e.y) < e.h / 2 + 3) {
            if (e.t === 'pod') { e.gone = true; inv = 600; invMusicT = 0; snd.pod(); addScore(500); continue; }
            if (inv > 0) { killEnemy(e); continue; }
            killPlayer(); return;
          }
        }
        for (const s of eshots) {
          if (s.dead) continue;
          if (Math.abs(player.x - s.x) < 6 && Math.abs(player.y - s.y) < 4) { if (inv > 0) { s.dead = true; continue; } killPlayer(); return; }
        }
        shots = shots.filter(s => s.life > 0);
        enemies = enemies.filter(e => !e.dead && !e.gone);
        eshots = eshots.filter(s => !s.dead);
      }
      function aimShot(x, y, sp) {
        const ax = player.x - x, ay = player.y - y, d = Math.hypot(ax, ay) || 1;
        eshots.push({ x, y, vx: ax / d * sp, vy: ay / d * sp });
      }
      function killEnemy(e) {
        e.dead = true; boom(e.x, e.y); snd.boom(); addScore(e.pts);
        fx.push({ x: e.x, y: e.y - 6, t: 0, pts: e.pts });
        if (zone.name !== 'BLEAK') fuel = Math.min(1000, fuel + 60);
      }
      function updateBoss() {
        const b = boss;
        if (b.dead) {
          b.dead++;
          if (b.dead % 8 === 0 && b.dead < 120) { boom(b.x + rnd(-14, 14), b.y + rnd(-18, 18), true); snd.boom(); }
          if (b.dead > 200) { loop++; enterZone(0, true); }
          return;
        }
        if (pos < zone.len) return;
        b.y += b.vy; if (b.y < PT + 30 || b.y > PB - 30) b.vy = -b.vy;
        if (b.flash > 0) b.flash--;
        b.mouth = (b.mouth + 1) % 40;
        if (--b.fireT <= 0) { b.fireT = Math.max(35, 90 - loop * 15); aimShot(b.x - 14, b.y, 1.5 + loop * 0.25); A.tone(160, 0.12, { type: 'sawtooth', vol: 0.1 }); }
        // barrier
        barrier.off = (barrier.off + 0.5 + loop * 0.15) % (22 * 8);
        if (++barrier.regen >= 70) { barrier.regen = 0; const i = barrier.rows.indexOf(false); if (i >= 0 && Math.random() < 0.6) barrier.rows[i] = true; }
        for (const s of shots) {
          if (s.life <= 0) continue;
          if (s.x >= 184 && s.x <= 194) {
            const r = barrierRowAt(s.y);
            if (r >= 0 && barrier.rows[r]) { barrier.rows[r] = false; s.life = 0; addScore(10); fuel = Math.min(1000, fuel + 15); A.tone(400, 0.05, { type: 'square', vol: 0.08 }); continue; }
          }
          if (Math.abs(s.x - b.x) < 12 && Math.abs(s.y - b.y) < 10) {
            s.life = 0; b.hp--; b.flash = 8; A.tone(200, 0.15, { type: 'square', vol: 0.15, slideTo: 80 });
            if (b.hp <= 0) { b.dead = 1; addScore(5000 * (loop + 1)); snd.big(); eshots = []; enemies = []; }
          }
        }
      }
      function barrierRowAt(sy) {
        const span = 22 * 8; let v = (sy - PT - 2 - barrier.off) % span; if (v < 0) v += span;
        return Math.floor(v / 8);
      }

      function update() {
        if (api.credits > lastCred) snd.coin(); lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        for (const f of (fx || [])) f.t++;
        if (fx) fx = fx.filter(f => f.t < (f.pts ? 50 : f.big ? 40 : 20));
        switch (state) {
          case 'title':
            T++; pos += 1; if (pos > zone.len) pos = 0;
            if (T % 420 === 0) titlePage ^= 1;
            if (api.anyPressed('Enter', 'Space')) {
              if (api.useCredit()) startGame(); else { coinFlash = 90; A.tone(90, 0.25, { type: 'square', vol: 0.15 }); }
            }
            break;
          case 'play': updatePlay(); break;
          case 'dying':
            T++;
            for (const s of eshots) { s.x += s.vx; s.y += s.vy; }
            if (T === 150) {
              const respawn = () => enterZone(zoneIdx, true);
              const over = () => { state = 'over'; T = 0; api.setHiScore(score); };
              if (lives <= 1) { lives = 0; if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, over); else over(); }
              else { lives--; respawn(); }
            }
            break;
          case 'over':
            T++;
            if (T > 240 || (T > 60 && api.anyPressed('Enter', 'Space'))) toTitle();
            break;
        }
      }
      function toTitle() {
        state = 'title'; T = 0; zone = ZONES[0]; terr = genTerrain(zone); pos = 0; fx = []; newStars();
      }
      toTitle();

      // ---------- render ----------
      function drawTerrain(ctx) {
        const zn = zone.name;
        if (zone.dir === 'h') {
          for (let x = 0; x < W; x += 2) {
            const wcol = Math.floor((x + pos) / 8);
            const t = Math.round(ceilAt(x)), b = Math.round(floorAt(x));
            let ct, cb;
            if (zn === 'MOUNTAIN') { ct = '#6a4020'; cb = '#3a8a2a'; }
            else if (zn === 'RAINBOW') { ct = RAINBOW[(wcol >> 1) % 7]; cb = RAINBOW[((wcol >> 1) + 3) % 7]; }
            else if (zn === 'CITY') { ct = '#202040'; cb = '#4050a0'; }
            else if (zn === 'BLEAK') { ct = '#606060'; cb = '#707070'; }
            else { ct = '#601040'; cb = '#601040'; }
            ctx.fillStyle = ct; ctx.fillRect(x, PT, 2, t - PT);
            ctx.fillStyle = cb; ctx.fillRect(x, b, 2, PB - b);
            // edge highlights / detail
            if (zn === 'MOUNTAIN') { ctx.fillStyle = '#c87830'; ctx.fillRect(x, b, 2, 2); ctx.fillStyle = '#2a5a1a'; if ((wcol & 3) === 0) ctx.fillRect(x, b + 8, 2, PB - b - 8); ctx.fillStyle = '#a06030'; ctx.fillRect(x, t - 2, 2, 2); }
            else if (zn === 'CITY') {
              ctx.fillStyle = '#8090ff'; ctx.fillRect(x, b, 2, 1);
              if (((x + pos) & 7) < 4) { ctx.fillStyle = (wcol * 7 & 3) ? '#ffe060' : '#303060'; for (let wy = b + 5; wy < PB - 3; wy += 7) ctx.fillRect(x, wy, 2, 3); }
            } else if (zn === 'BLEAK') { ctx.fillStyle = '#a0a0a0'; ctx.fillRect(x, b, 2, 1); ctx.fillRect(x, t - 1, 2, 1); }
            else if (zn === 'GOND') { ctx.fillStyle = '#ff40a0'; ctx.fillRect(x, b, 2, 1); ctx.fillRect(x, t - 1, 2, 1); }
          }
        } else {
          for (let y = PT; y < PB; y += 2) {
            const wrow = Math.floor((PB - y + pos) / 8);
            const l = Math.round(leftAt(y)), r = Math.round(rightAt(y));
            ctx.fillStyle = (wrow & 1) ? '#c02020' : '#f0f0f0'; ctx.fillRect(0, y, l, 2);
            ctx.fillStyle = (wrow & 1) ? '#f0f0f0' : '#c02020'; ctx.fillRect(r, y, W - r, 2);
            ctx.fillStyle = '#ffd020'; ctx.fillRect(l - 1, y, 1, 2); ctx.fillRect(r, y, 1, 2);
          }
        }
      }
      function drawShip(ctx, x, y) {
        const flash = inv > 0 && ((T >> 2) & 1);
        const pal = flash ? { a: '#ffff40', b: '#ff40ff', c: '#40ffff', d: '#ffffff' } : { a: '#ff3030', b: '#e0e0ff', c: '#30c0ff', d: '#ffff00' };
        if (zone.dir === 'h') { spr(ctx, SHIP, x - 8, y - 3, pal); if ((T >> 1) & 1) { ctx.fillStyle = '#ff9020'; ctx.fillRect(x - 11, y, 3, 1); } }
        else { spr(ctx, SHIP_V, x - 3, y - 5, pal); if ((T >> 1) & 1) { ctx.fillStyle = '#ff9020'; ctx.fillRect(x, y + 6, 1, 3); } }
      }
      function drawEnemy(ctx, e) {
        switch (e.t) {
          case 'mist': spr(ctx, MIST, e.x - 6, e.y - 2, { c: zone.name === 'CITY' ? '#ff60ff' : '#40ff60', d: ((T >> 3) & 1) ? '#ffff00' : '#ff3030' }); break;
          case 'rocket': spr(ctx, ROCKET, e.x - 2, e.y - 4, { a: '#ff3030', b: '#ffffff' }); if (e.live && (T & 2)) { ctx.fillStyle = '#ffa020'; ctx.fillRect(e.x - 1, e.y + 4, 2, 4); } break;
          case 'seg': spr(ctx, SEG, e.x - 4, e.y - 4, e.head ? { a: '#ffffff', b: '#ff2040', c: '#ffff40' } : { a: '#ffffff', b: RAINBOW[(((e.ph * 3) | 0) % 7 + 7) % 7], c: '#202020' }); break;
          case 'diver': if (e.vert) { ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(-Math.PI / 2); spr(ctx, DIVER, -5, -3, { a: '#40c0ff', b: '#ffd020', c: '#ff2020' }); ctx.restore(); } else spr(ctx, DIVER, e.x - 5, e.y - 3, { a: '#40c0ff', b: '#ffd020', c: '#ff2020' }); break;
          case 'balloon': spr(ctx, BALLOON, e.x - 4, e.y - 4, { a: '#2040ff', b: '#40c0ff', c: '#c0c0c0' }); break;
          case 'turret': spr(ctx, TURRET, e.x, e.y - 3, { a: '#ff3030', b: '#c0c0c0', c: '#202020' }); break;
          case 'rock': spr(ctx, ROCK, e.x - 4, e.y - 3, { a: '#a08060', b: '#705040', c: '#302010' }, (e.spin >> 3) & 1); break;
          case 'pod': {
            const c = ((T >> 2) & 1) ? '#ffff40' : '#ff40ff';
            ctx.fillStyle = c; ctx.fillRect(e.x - 5, e.y - 5, 10, 10);
            ctx.fillStyle = '#000'; ctx.fillRect(e.x - 4, e.y - 4, 8, 8);
            txt(ctx, 'E', e.x - 2, e.y - 3, c);
            break;
          }
        }
      }
      function drawBoss(ctx) {
        const b = boss;
        // barrier
        const span = 22 * 8;
        for (let r = 0; r < 22; r++) {
          if (!barrier.rows[r]) continue;
          let y = PT + 2 + ((r * 8 + barrier.off) % span);
          if (y > PB - 8) continue;
          ctx.fillStyle = '#40ff40'; ctx.fillRect(184, y, 10, 7);
          ctx.fillStyle = '#108010'; ctx.fillRect(186, y + 2, 6, 3);
        }
        if (b.dead > 60) return;
        const x = b.x, y = Math.round(b.y);
        const body = b.flash ? '#ffffff' : '#c02080';
        ctx.fillStyle = body;
        ctx.fillRect(x - 14, y - 22, 30, 44); ctx.fillRect(x - 18, y - 14, 4, 28); ctx.fillRect(x + 16, y - 26, 8, 52);
        // horns
        ctx.fillRect(x - 10, y - 28, 4, 6); ctx.fillRect(x + 6, y - 28, 4, 6);
        // eye
        ctx.fillStyle = '#ffff40'; ctx.fillRect(x - 10, y - 8, 16, 10);
        ctx.fillStyle = '#ff2020'; ctx.fillRect(x - 6 + Math.round(Math.sign(player.x - x) * 2), y - 6 + Math.round(Math.max(-2, Math.min(2, (player.y - y) / 20))), 6, 6);
        // mouth
        ctx.fillStyle = '#200010'; const m = b.mouth < 20 ? 2 : 6; ctx.fillRect(x - 12, y + 8, 18, m);
        ctx.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) ctx.fillRect(x - 11 + i * 4, y + 8, 2, 2);
        txt(ctx, 'GOND', x - 1, y - 40, '#ff80c0', 1, 'center');
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, PT); ctx.fillRect(0, PB, W, H - PB);
        const blink = state !== 'play' || ((T >> 4) & 1);
        if (blink) txt(ctx, '1UP', 10, 2, '#ff4040');
        txt(ctx, String(score).padStart(6, '0'), 10, 12, '#ffffff');
        txt(ctx, 'HI-SCORE', 92, 2, '#ff4040');
        txt(ctx, String(hi).padStart(6, '0'), 98, 12, '#ffffff');
        // energy
        txt(ctx, 'ENERGY', 186, 2, '#40c0ff');
        const f = state === 'title' ? 1000 : fuel;
        ctx.fillStyle = '#202040'; ctx.fillRect(176, 12, 72, 7);
        ctx.fillStyle = f < 250 ? (((T >> 3) & 1) ? '#ff2020' : '#802020') : f < 500 ? '#ffd020' : '#40ff40';
        ctx.fillRect(177, 13, Math.round(70 * f / 1000), 5);
        // course map
        const names = ['MTN', 'RBW', 'STR', 'CTY', 'BLK', 'GND'];
        for (let i = 0; i < 6; i++) {
          const x = 4 + i * 30;
          const cur = state !== 'title' && i === zoneIdx;
          ctx.fillStyle = cur ? '#403000' : i < zoneIdx && state !== 'title' ? '#202020' : '#101030';
          ctx.fillRect(x, PB + 3, 28, 13);
          txt(ctx, names[i], x + 5, PB + 6, cur ? '#ffd020' : '#8080c0');
          if (cur) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + Math.min(27, Math.round(27 * pos / zone.len)), PB + 3, 1, 13); }
        }
        // lives
        for (let i = 0; i < Math.min(5, lives - (state === 'play' || state === 'dying' ? 1 : 0)); i++) spr(ctx, SHIP, 190 + i * 13, PB + 6, { a: '#ff3030', b: '#e0e0ff', c: '#30c0ff', d: '#ffff00' });
        if (loop > 0) txt(ctx, 'R' + (loop + 1), 236, PB + 6 + 0, '#ffd020');
      }
      function drawFx(ctx) {
        for (const f of fx) {
          if (f.pts) { txt(ctx, String(f.pts), f.x, f.y - f.t * 0.3, '#ffffff', 1, 'center'); continue; }
          const r = (f.big ? 2 : 1) * Math.min(f.t, 10) + 2;
          const cols = ['#ffffff', '#ffff40', '#ff8020', '#ff2020'];
          ctx.fillStyle = cols[Math.min(3, f.t >> 2)];
          for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + f.t * 0.05; ctx.fillRect(Math.round(f.x + Math.cos(a) * r) - 1, Math.round(f.y + Math.sin(a) * r) - 1, f.big ? 3 : 2, f.big ? 3 : 2); }
        }
      }
      function render(ctx) {
        ctx.fillStyle = zone.sky; ctx.fillRect(0, 0, W, H);
        // stars
        for (const s of stars) { ctx.fillStyle = RAINBOW[s.c]; ctx.fillRect(s.x | 0, s.y | 0, 1, 1); }
        drawTerrain(ctx);
        if (state === 'title') { drawHUD(ctx); renderTitle(ctx); return; }
        if (boss) drawBoss(ctx);
        for (const e of enemies) drawEnemy(ctx, e);
        ctx.fillStyle = '#ffff80';
        for (const s of shots) { if (s.vx) ctx.fillRect(s.x - 3, s.y, 6, 1); else ctx.fillRect(s.x, s.y - 3, 1, 6); }
        for (const s of eshots) { ctx.fillStyle = (T & 4) ? '#ff4040' : '#ffffff'; ctx.fillRect(s.x - 1, s.y - 1, 3, 3); }
        if (state === 'play') drawShip(ctx, player.x, player.y);
        drawFx(ctx);
        drawHUD(ctx);
        if (state === 'play' && bannerT > 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(48, 92, 160, 36);
          txt(ctx, zone.name === 'GOND' ? "GOND'S LAIR" : zone.name + ' ZONE', W / 2, 100, '#ffd020', 1, 'center');
          txt(ctx, zoneIdx === 0 ? 'ROUND ' + (loop + 1) : zone.name === 'BLEAK' ? 'NO ENERGY REFILL' : zone.name === 'GOND' ? 'DESTROY GOND' : 'GO!', W / 2, 114, '#ffffff', 1, 'center');
        }
        if (state === 'play' && boss && boss.dead) txt(ctx, 'GOND DESTROYED!', W / 2, 100, '#ffff40', 1, 'center');
        if (state === 'play' && inv > 0 && inv < 120 && ((T >> 3) & 1)) txt(ctx, 'POWER ENDING', W / 2, PT + 4, '#ff40ff', 1, 'center');
        if (state === 'over') { ctx.fillStyle = '#000'; ctx.fillRect(70, 98, 116, 24); txt(ctx, 'GAME OVER', W / 2, 103, '#ff3030', 2, 'center'); }
      }
      function renderTitle(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(20, 30, 216, 170);
        const cols = ['#ff2020', '#ff6020', '#ffa020', '#ffd020'];
        const word = 'VANGUARD';
        for (let i = 0; i < word.length; i++) txt(ctx, word[i], 34 + i * 24, 38 + Math.round(Math.sin(T * 0.06 + i * 0.6) * 2), cols[(i + (T >> 3)) % 4], 3);
        if (titlePage === 0) {
          txt(ctx, 'SCORE TABLE', W / 2, 70, '#40c0ff', 1, 'center');
          const rows = [[MIST, { c: '#40ff60', d: '#ffff00' }, '50'], [ROCKET, { a: '#ff3030', b: '#ffffff' }, '100'], [SEG, { a: '#ffffff', b: '#ff2040', c: '#ffff40' }, '300'], [DIVER, { a: '#40c0ff', b: '#ffd020', c: '#ff2020' }, '150'], [TURRET, { a: '#ff3030', b: '#c0c0c0', c: '#202020' }, '200']];
          rows.forEach((r, i) => { spr(ctx, r[0], 80, 84 + i * 13, r[1]); txt(ctx, '= ' + r[2] + ' PTS', 100, 84 + i * 13, '#ffffff'); });
          txt(ctx, 'GOND  5000 PTS', W / 2, 152, '#ff80c0', 1, 'center');
        } else {
          txt(ctx, 'MOUNTAIN  RAINBOW  STRIPE', W / 2, 74, '#ffffff', 1, 'center');
          txt(ctx, 'CITY  BLEAK  GOND', W / 2, 86, '#ffffff', 1, 'center');
          txt(ctx, 'SHOOT ENEMIES TO REFUEL', W / 2, 104, '#40ff60', 1, 'center');
          txt(ctx, 'FIRE IN 4 DIRECTIONS', W / 2, 116, '#40ff60', 1, 'center');
          txt(ctx, 'GET E PODS TO RAM ENEMIES', W / 2, 128, '#ffff40', 1, 'center');
          txt(ctx, 'BONUS SHIP AT 10000', W / 2, 146, '#ff8080', 1, 'center');
        }
        const blink = (T >> 4) & 1;
        if (coinFlash > 0 || api.credits === 0) { if (blink || coinFlash > 0) txt(ctx, 'INSERT COIN', W / 2, 168, '#ff3030', 1, 'center'); }
        else if (blink) txt(ctx, 'PUSH START', W / 2, 168, '#ffffff', 1, 'center');
        txt(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W / 2, 180, '#a0a0ff', 1, 'center');
        txt(ctx, '\u00a9 1981 SNK', W / 2, 192, '#808080', 1, 'center');
      }
      if (api.debugHook) api.debugHook({ sum: () => ({ state, zone: zone.name, pos: Math.round(pos), loop, score, lives, fuel: Math.round(fuel), n: enemies && enemies.length, boss: boss && boss.hp }), god: v => { noDie = v; } });
      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
