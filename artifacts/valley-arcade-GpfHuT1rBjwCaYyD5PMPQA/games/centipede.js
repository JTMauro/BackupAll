// Centipede (Atari, 1980) — faithful browser recreation for Arcade Games Galore.
(function () {
  // ---- compact 5x7 bitmap arcade font ----
  const FK = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-.,:!?=*/'\"<>()+%#@^_~";
  const FD = "ehjlphe4c4444eeh168gvv2421he26aiv22vgu11he68guhhev124888ehhehheehhf12c4ahhvhhuhhuhhuehgggheuhhhhhuvgguggvvggugggfggjhhfhhhvhhhe44444e11111hehikokihggggggvhrllhhhhhpljhhehhhhheuhhugggehhhliduhhukihfgge11uv444444hhhhhhehhhhha4hhhllrhhha4ahhhha4444v1248gv000v00000000cc0000c480cc0cc04444404eh1240400v0v000level001248g04480000aa00000248g842842124824888428422248044v440pq48mj0avaaavaehnlnge4el4444000000vehlplhe";
  const FONT = {};
  for (let i = 0; i < FK.length; i++) { const g = []; for (let r = 0; r < 7; r++) g.push(parseInt(FD[i * 7 + r], 32)); FONT[FK[i]] = g; }
  FONT['©'] = [0x0E, 0x11, 0x17, 0x14, 0x17, 0x11, 0x0E];
  // text(ctx, str, x, y, colour, {scale, adv, center, bold})
  function text(ctx, s, x, y, col, o) {
    o = o || {}; const sc = o.scale || 1, adv = (o.adv || 8) * sc, bw = o.bold ? 2 : 1;
    s = String(s).toUpperCase();
    if (o.center) x = Math.round(x - (s.length * adv - (adv - (4 + bw) * sc)) / 2);
    if (o.right) x = Math.round(x - (s.length * adv - (adv - (4 + bw) * sc)));
    ctx.fillStyle = col;
    for (const ch of s) {
      const g = FONT[ch];
      if (g) for (let r = 0; r < 7; r++) { const b = g[r]; if (b) for (let c = 0; c < 5; c++) if ((b >> (4 - c)) & 1) ctx.fillRect(x + c * sc, y + r * sc, sc * bw, sc); }
      x += adv;
    }
  }
  // build a sprite canvas from rows of chars + palette {char: colour}
  function spr(rows, pal) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
    return c;
  }

  const W = 240, H = 256, COLS = 30, ROWS = 32, CS = 8;
  const TOP_ROW = 1, BOTTOM_ROW = 30, ZONE_ROW = 24;      // player zone = rows 24..30
  const STEP = 4;                                          // frames per cell (2 px / frame)

  // per-wave colour sets: mushroom cap, mushroom stem/outline, centipede body, centipede accent, shooter, spider, flea, scorpion
  const PALS = [
    { m1: '#ff2c8c', m2: '#2ca0ff', c1: '#38ff38', c2: '#ff2c8c', sh: '#ffe02c', sp: '#ff2c8c', sp2: '#2ca0ff', fl: '#2ca0ff', sc: '#2ca0ff' },
    { m1: '#ffa02c', m2: '#ff2c2c', c1: '#2cff70', c2: '#ffa02c', sh: '#ffffff', sp: '#2cff70', sp2: '#ff2c2c', fl: '#ff2c2c', sc: '#ffa02c' },
    { m1: '#2cff2c', m2: '#ff2cff', c1: '#ffe02c', c2: '#ff2cff', sh: '#2cffff', sp: '#ff2cff', sp2: '#2cff2c', fl: '#ffe02c', sc: '#ff2cff' },
    { m1: '#2cffff', m2: '#ffe02c', c1: '#ff602c', c2: '#2cffff', sh: '#ff2cff', sp: '#ffe02c', sp2: '#ff602c', fl: '#ff602c', sc: '#2cffff' },
    { m1: '#ffe02c', m2: '#2c50ff', c1: '#2cffff', c2: '#ff2c2c', sh: '#ff2c8c', sp: '#2c50ff', sp2: '#ffe02c', fl: '#2cffff', sc: '#ffe02c' },
    { m1: '#ff2cff', m2: '#2cff2c', c1: '#ff2c2c', c2: '#ffe02c', sh: '#2cff2c', sp: '#ff2c2c', sp2: '#2cff2c', fl: '#ff2cff', sc: '#2cff2c' },
    { m1: '#2c70ff', m2: '#ffa02c', c1: '#ff2cff', c2: '#2cff2c', sh: '#ffe02c', sp: '#ffa02c', sp2: '#2c70ff', fl: '#ffa02c', sc: '#2c70ff' },
    { m1: '#ff602c', m2: '#2cffff', c1: '#ffffff', c2: '#ff602c', sh: '#2cffff', sp: '#ff602c', sp2: '#ffffff', fl: '#2cffff', sc: '#ff602c' }];

  // ---------------- pixel art ----------------
  const ART = {
    mush: [
      '..AAAA..',
      '.AAAAAA.',
      'AAAAAAAA',
      'BAAAAAAB',
      '.BBAABB.',
      '..BAAB..',
      '..BAAB..',
      '..BBBB..'],
    head: [[
      '.B....B.',
      '..BAAB..',
      '.AAAAAA.',
      'AACAACAA',
      'AAAAAAAA',
      '.AAAAAA.',
      '..AAAA..',
      '.B....B.'], [
      'B......B',
      '.BBAABB.',
      '.AAAAAA.',
      'AACAACAA',
      'AAAAAAAA',
      '.AAAAAA.',
      '.BAAAAB.',
      'B......B']],
    body: [[
      '.B....B.',
      '..AAAA..',
      '.AAAAAA.',
      'AAAAAAAA',
      'AAAAAAAA',
      '.AAAAAA.',
      '..AAAA..',
      '.B....B.'], [
      'B......B',
      '.BAAAAB.',
      '.AAAAAA.',
      'AAAAAAAA',
      'AAAAAAAA',
      '.AAAAAA.',
      '.BAAAAB.',
      'B......B']],
    shooter: [
      '...C...',
      '..CAC..',
      '..AAA..',
      '.AAAAA.',
      '.ABABA.',
      'AAAAAAA',
      '.AA.AA.',
      '.A...A.'],
    spider: [[
      '.A....BBB....A.',
      'A.A..BBBBB..A.A',
      '...A.BCBCB.A...',
      '....ABBBBBA....',
      '...A.BBBBB.A...',
      '..A...BBB...A..',
      '.A...........A.',
      'A.............A'], [
      '...............',
      '.A...BBBBB...A.',
      'A.A..BCBCB..A.A',
      '...AABBBBBAA...',
      '..A..BBBBB..A..',
      '.A....BBB....A.',
      '.A...........A.',
      '..A.........A..']],
    flea: [[
      '..BBBB...',
      '.BBAABB..',
      'BBAAAABB.',
      'BAACAAB.A',
      '.BAAAB.A.',
      '..BAB.A..',
      '.A.A.A...',
      'A..A..A..'], [
      '..BBBB...',
      '.BBAABB..',
      'BBAAAABB.',
      'BAACAAB..',
      '.BAAAB.A.',
      '..BAB..A.',
      '..A.A.A..',
      '.A..A..A.']],
    scorpion: [[
      '..AAA...........',
      '.A...A..........',
      '.A....A.........',
      '..A...ABB.BB....',
      '......BBBBBBB.CC',
      '.....BBBBBBBBC..',
      '....B.B.B.B.B.CC',
      '...B.B.B.B.B....'], [
      '..AAA...........',
      '.A...A..........',
      '.A....A.........',
      '..A...ABB.BB..CC',
      '......BBBBBBBC..',
      '.....BBBBBBBB.CC',
      '.....B.B.B.B.B..',
      '....B.B.B.B.B...']]
  };
  const BOOMART = [[
    '........',
    '...A....',
    '..ABA...',
    '.ABBBA..',
    '..ABA...',
    '...A....',
    '........',
    '........'], [
    '.A...A..',
    '..A.A...',
    '.A.B.A..',
    '..BBB...',
    '.A.B.A..',
    '..A.A...',
    '.A...A..',
    '........'], [
    'A..A..A.',
    '........',
    '..B.B...',
    'A.....A.',
    '..B.B...',
    '........',
    'A..A..A.',
    '........']];
  function mirror(rows) { return rows.map(r => r.split('').reverse().join('')); }

  // build per-palette sprite caches
  function buildSet(P) {
    const s = {};
    const mp = { A: P.m1, B: P.m2 };
    const pp = { A: P.m2, B: P.m1 };          // poisoned mushrooms swap colours
    s.mush = [], s.pmush = [];
    for (let d = 0; d < 4; d++) {
      const rows = ART.mush.map((r, i) => i < 8 - d * 2 ? r : '........');
      s.mush.push(spr(rows, mp)); s.pmush.push(spr(rows, pp));
    }
    const cp = { A: P.c1, B: P.c2, C: '#000000' };
    s.headR = ART.head.map(r => spr(r, cp)); s.headL = s.headR; s.body = ART.body.map(r => spr(r, cp));
    s.shooter = spr(ART.shooter, { A: P.sh, B: P.m1, C: '#ffffff' });
    s.spider = ART.spider.map(r => spr(r, { A: P.sp, B: P.sp2, C: '#ffffff' }));
    s.flea = ART.flea.map(r => spr(r, { A: P.m1, B: P.fl, C: '#ffffff' }));
    s.scorpR = ART.scorpion.map(r => spr(r, { A: P.sc, B: P.m1, C: P.c1 }));
    s.scorpL = ART.scorpion.map(r => spr(mirror(r), { A: P.sc, B: P.m1, C: P.c1 }));
    s.boom = BOOMART.map(r => spr(r, { A: P.c1, B: '#ffffff' }));
    return s;
  }
  const SETS = PALS.map(buildSet);

  ArcadeRegistry.register({
    id: 'centipede',
    title: 'Centipede',
    year: 1980,
    maker: 'Atari',
    width: W, height: H,
    vector: false,
    pointer: true,
    controls: 'Mouse/trackball or arrows: move · Click/Space: fire · Enter: start',
    marquee: { bg: '#100018', fg: '#30ff60', accent: '#ff2c8c' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(16543);
      let mode = 'title', frame = 0, titleT = 0;
      let g = null;
      let lastMX = -1, lastMY = -1, mouseMode = false;
      // ---------- coin-op ----------
      let coinOp = false, lastCred = api.credits, coinFlash = 0;
      function pollCoins() {
        const c = api.credits; if (c === 0) coinOp = true;
        if (c > lastCred) au.tone(1319, 0.06, { type: 'square', vol: 0.07, slideTo: 1976 });
        lastCred = c;
      }
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 }); au.tone(73, 0.28, { type: 'sawtooth', vol: 0.08 });
        return false;
      }
      const pushScreen = () => coinOp && api.credits > 0;

      // ---------- setup ----------
      function newGame(attract) {
        g = {
          attract, score: 0, lives: 3, wave: 0, nextLife: 12000,
          mush: new Uint8Array(COLS * ROWS), poison: new Uint8Array(COLS * ROWS),
          px: 116, py: 236, shot: null, chains: [], spider: null, flea: null, scorp: null,
          booms: [], pops: [], phase: 'play', phaseT: 0, stepT: 0,
          spiderT: 200, scorpT: 600, headT: 0, reachedBottom: false, beatI: 0
        };
        for (let i = 0; i < 46; i++) {
          const c = Math.floor(Math.random() * COLS), r = 2 + Math.floor(Math.random() * 27);
          g.mush[r * COLS + c] = 4;
        }
        startWave();
      }
      function pal() { return SETS[g.wave % SETS.length]; }
      function startWave(layout) {
        g.chains = [];
        const heads = layout ? null : g.wave % 12;
        const lens = layout || [12 - heads].concat(new Array(heads).fill(1));
        let col = 14;
        lens.forEach((len, i) => {
          if (i === 0) {
            const segs = [];
            for (let k = 0; k < len; k++) segs.push(mkSeg(col + k, TOP_ROW));
            g.chains.push({ segs, h: -1, v: 1, plunge: false });
          } else {
            const c = Math.floor(Math.random() * COLS);
            const segs = [];
            for (let k = 0; k < len; k++) segs.push(mkSeg(c, TOP_ROW));
            g.chains.push({ segs, h: Math.random() < 0.5 ? -1 : 1, v: 1, plunge: false });
          }
        });
        g.stepT = 0; g.reachedBottom = false; g.headT = 0;
        g.fast = false;
      }
      function mkSeg(c, r) { return { c, r, pc: c, pr: r }; }

      // ---------- helpers ----------
      const mAt = (c, r) => (c >= 0 && c < COLS && r >= 0 && r < ROWS) ? g.mush[r * COLS + c] : 0;
      function setM(c, r, v) { if (c >= 0 && c < COLS && r >= TOP_ROW && r <= BOTTOM_ROW) { g.mush[r * COLS + c] = v; if (!v) g.poison[r * COLS + c] = 0; } }
      function addScore(n) {
        if (g.attract) return;
        g.score += n;
        while (g.score >= g.nextLife) {
          g.nextLife += 12000; if (g.lives < 6) g.lives++;
          au.melody([[988, .07], [1319, .07], [988, .07], [1319, .07], [1760, .15]], { type: 'square', vol: 0.06 });
        }
        if (g.score > hi) hi = g.score;
      }
      function segPos(s, t) { return { x: (s.pc + (s.c - s.pc) * t) * CS, y: (s.pr + (s.r - s.pr) * t) * CS }; }

      // ---------- sounds ----------
      const sfx = {
        shot() { au.tone(2400, 0.05, { type: 'square', slideTo: 1200, vol: 0.035 }); },
        mush() { au.tone(1800, 0.03, { type: 'square', vol: 0.03 }); },
        seg() { au.noise(0.12, { freq: 3000, slideTo: 400, vol: 0.15 }); au.tone(600, 0.08, { type: 'square', slideTo: 200, vol: 0.04 }); },
        beat(i) { au.tone(i ? 110 : 165, 0.06, { type: 'square', vol: 0.05, slideTo: i ? 90 : 130 }); },
        spider() { au.tone(api.frame % 16 < 8 ? 700 : 520, 0.09, { type: 'triangle', vol: 0.05 }); },
        flea() { au.tone(2000, 0.9, { type: 'sine', slideTo: 300, vol: 0.05 }); },
        scorp() { au.tone(220, 0.12, { type: 'sawtooth', vol: 0.025, slideTo: 260 }); },
        kill() { au.noise(0.35, { freq: 2200, slideTo: 150, vol: 0.25 }); au.tone(900, 0.3, { type: 'square', slideTo: 80, vol: 0.05 }); },
        die() { au.noise(1.2, { freq: 2500, slideTo: 60, vol: 0.35 }); for (let i = 0; i < 6; i++) au.tone(1200 - i * 150, 0.12, { type: 'square', vol: 0.05, delay: i * 0.12 }); },
        restore() { au.tone(1400, 0.04, { type: 'square', vol: 0.05 }); }
      };

      // ---------- centipede ----------
      function occupiedByOther(chain, c, r) {
        for (const ch of g.chains) if (ch !== chain) for (const s of ch.segs) if (s.c === c && s.r === r) return true;
        return false;
      }
      function nextHeadCell(ch) {
        const hd = ch.segs[0];
        if (ch.plunge) {
          if (hd.r < BOTTOM_ROW) return [hd.c, hd.r + 1];
          ch.plunge = false; ch.v = -1;
        }
        const nc = hd.c + ch.h;
        const out = nc < 0 || nc >= COLS;
        const m = !out && mAt(nc, hd.r);
        const headOn = !out && !m && occupiedByOther(ch, nc, hd.r) && Math.random() < 0.5;
        if (out || m || headOn) {
          if (m && g.poison[hd.r * COLS + nc]) { ch.plunge = true; ch.h = -ch.h; return [hd.c, Math.min(BOTTOM_ROW, hd.r + 1)]; }
          ch.h = -ch.h;
          let nr = hd.r + ch.v;
          if (nr > BOTTOM_ROW) { ch.v = -1; nr = hd.r - 1; g.reachedBottom = true; }
          else if (ch.v < 0 && nr < ZONE_ROW) { ch.v = 1; nr = hd.r + 1; }
          return [hd.c, nr];
        }
        return [nc, hd.r];
      }
      function stepCentipede() {
        for (const ch of g.chains) {
          const [nc, nr] = nextHeadCell(ch);
          for (let i = ch.segs.length - 1; i >= 1; i--) {
            const s = ch.segs[i], a = ch.segs[i - 1];
            s.pc = s.c; s.pr = s.r; s.c = a.c; s.r = a.r;
          }
          const hd = ch.segs[0];
          hd.pc = hd.c; hd.pr = hd.r; hd.c = nc; hd.r = nr;
        }
        if (!g.attract && g.chains.length) { sfx.beat(g.beatI); g.beatI ^= 1; }
      }
      function hitSegment(ch, idx) {
        const s = ch.segs[idx];
        const isHead = idx === 0;
        addScore(isHead ? 100 : 10);
        const t = g.stepT / STEP;
        const p = segPos(s, t);
        g.booms.push({ x: p.x, y: p.y, t: 0 });
        // leave a mushroom behind
        const mc = Math.round(p.x / CS), mr = Math.round(p.y / CS);
        if (mr >= TOP_ROW && mr <= BOTTOM_ROW && mc >= 0 && mc < COLS) { setM(mc, mr, 4); g.poison[mr * COLS + mc] = 0; }
        const front = ch.segs.slice(0, idx), back = ch.segs.slice(idx + 1);
        const i = g.chains.indexOf(ch); g.chains.splice(i, 1);
        if (front.length) g.chains.push({ segs: front, h: ch.h, v: ch.v, plunge: ch.plunge });
        if (back.length) {
          const b = back[0];
          let h = Math.sign(s.c - b.c); if (!h) h = -ch.h;
          g.chains.push({ segs: back, h, v: ch.v < 0 ? -1 : 1, plunge: false });
        }
        sfx.seg();
      }

      // ---------- player ----------
      function blockedAt(x, y) { // shooter box 7x8 at x,y
        const c0 = Math.floor((x + 1) / CS), c1 = Math.floor((x + 5) / CS);
        const r0 = Math.floor((y + 1) / CS), r1 = Math.floor((y + 7) / CS);
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (mAt(c, r)) return true;
        return false;
      }
      function movePlayer() {
        let dx = 0, dy = 0;
        const m = api.mouse;
        if (m.x !== lastMX || m.y !== lastMY) { if (lastMX >= 0) mouseMode = true; lastMX = m.x; lastMY = m.y; }
        if (api.key('ArrowLeft') || api.key('ArrowRight') || api.key('ArrowUp') || api.key('ArrowDown')) mouseMode = false;
        if (mouseMode) {
          dx = Math.max(-4, Math.min(4, m.x - 3 - g.px));
          dy = Math.max(-4, Math.min(4, m.y - 4 - g.py));
        } else {
          const sp = 2;
          if (api.key('ArrowLeft')) dx = -sp; if (api.key('ArrowRight')) dx = sp;
          if (api.key('ArrowUp')) dy = -sp; if (api.key('ArrowDown')) dy = sp;
        }
        const minY = ZONE_ROW * CS, maxY = BOTTOM_ROW * CS + 1;
        // move axis by axis, pixel by pixel, stopping at mushrooms
        const sx = Math.sign(dx);
        for (let i = 0; i < Math.abs(Math.round(dx)); i++) { const nx = g.px + sx; if (nx < 0 || nx > W - 7 || blockedAt(nx, g.py)) break; g.px = nx; }
        const sy = Math.sign(dy);
        for (let i = 0; i < Math.abs(Math.round(dy)); i++) { const ny = g.py + sy; if (ny < minY || ny > maxY || blockedAt(g.px, ny)) break; g.py = ny; }
        const fire = api.key('Space') || api.key('KeyX') || api.key('KeyZ') || m.down;
        if (fire && !g.shot) { g.shot = { x: g.px + 3, y: g.py - 1 }; sfx.shot(); }
      }
      function updateShot() {
        const s = g.shot; if (!s) return;
        const t = g.stepT / STEP;
        for (let k = 0; k < 4; k++) {
          s.y -= 2;
          if (s.y < CS) { g.shot = null; return; }
          const c = Math.floor(s.x / CS), r = Math.floor(s.y / CS);
          // mushrooms
          if (mAt(c, r)) {
            const v = g.mush[r * COLS + c] - 1; g.mush[r * COLS + c] = v;
            if (!v) { g.poison[r * COLS + c] = 0; addScore(1); }
            sfx.mush(); g.shot = null; return;
          }
          // centipede
          for (const ch of g.chains) for (let i = 0; i < ch.segs.length; i++) {
            const p = segPos(ch.segs[i], t);
            if (s.x >= p.x && s.x < p.x + 8 && s.y >= p.y && s.y < p.y + 8) { hitSegment(ch, i); g.shot = null; return; }
          }
          // spider
          const sp = g.spider;
          if (sp && s.x >= sp.x && s.x < sp.x + 15 && s.y >= sp.y && s.y < sp.y + 8) {
            const d = Math.abs((g.py) - (sp.y + 4));
            const pts = d < 16 ? 900 : d < 32 ? 600 : 300;
            addScore(pts); g.pops.push({ x: sp.x + 7, y: sp.y, txt: String(pts), t: 60 });
            g.booms.push({ x: sp.x + 4, y: sp.y, t: 0, big: true }); g.spider = null; sfx.kill(); g.shot = null; return;
          }
          const fl = g.flea;
          if (fl && s.x >= fl.x && s.x < fl.x + 9 && s.y >= fl.y && s.y < fl.y + 8) {
            if (--fl.hp <= 0) { addScore(200); g.booms.push({ x: fl.x, y: fl.y, t: 0, big: true }); g.flea = null; sfx.kill(); }
            else { fl.vy = 4; sfx.seg(); }
            g.shot = null; return;
          }
          const sc = g.scorp;
          if (sc && s.x >= sc.x && s.x < sc.x + 16 && s.y >= sc.y && s.y < sc.y + 8) {
            addScore(1000); g.pops.push({ x: sc.x + 8, y: sc.y, txt: '1000', t: 60 });
            g.booms.push({ x: sc.x + 4, y: sc.y, t: 0, big: true }); g.scorp = null; sfx.kill(); g.shot = null; return;
          }
        }
      }

      // ---------- enemies ----------
      function updateSpider() {
        const sp = g.spider;
        if (!sp) {
          if (--g.spiderT <= 0) {
            const left = Math.random() < 0.5;
            g.spider = { x: left ? -15 : W, y: 200 + Math.random() * 30, vx: (left ? 1 : -1) * (g.score > 5000 ? 1.5 : 1), vy: 1.5, t: 0, dir: left ? 1 : -1 };
          }
          return;
        }
        sp.t++;
        if (sp.t % 20 === 0) {
          // random zig-zag changes (sometimes pure vertical hops)
          const r = Math.random();
          sp.vx = r < 0.25 ? 0 : sp.dir * (g.score > 5000 ? 1.5 : 1);
          if (Math.random() < 0.3) sp.vy = -sp.vy;
        }
        sp.x += sp.vx; sp.y += sp.vy;
        const top = ZONE_ROW * CS - 24, bot = BOTTOM_ROW * CS;
        if (sp.y < top) { sp.y = top; sp.vy = Math.abs(sp.vy); }
        if (sp.y > bot) { sp.y = bot; sp.vy = -Math.abs(sp.vy); }
        // eats mushrooms
        if (sp.t % 6 === 0) { const c = Math.floor((sp.x + 7) / CS), r = Math.floor((sp.y + 4) / CS); if (mAt(c, r) && Math.random() < 0.6) setM(c, r, 0); }
        if (!g.attract && sp.t % 9 === 0) sfx.spider();
        if (sp.x < -20 || sp.x > W + 4) { g.spider = null; g.spiderT = 120 + Math.random() * 200; }
      }
      function zoneMushrooms() {
        let n = 0; for (let r = ZONE_ROW; r <= BOTTOM_ROW; r++) for (let c = 0; c < COLS; c++) if (g.mush[r * COLS + c]) n++;
        return n;
      }
      function updateFlea() {
        const fl = g.flea;
        if (!fl) {
          if (g.wave >= 1 && api.frame % 60 === 0 && zoneMushrooms() < 5 && Math.random() < 0.5) {
            g.flea = { x: Math.floor(Math.random() * COLS) * CS, y: 8, vy: 2, hp: 2, lastR: 0 };
            if (!g.attract) sfx.flea();
          }
          return;
        }
        fl.y += fl.vy;
        const r = Math.floor(fl.y / CS), c = Math.floor(fl.x / CS);
        if (r !== fl.lastR) { fl.lastR = r; if (r >= 2 && r < BOTTOM_ROW && !mAt(c, r) && Math.random() < 0.25) setM(c, r, 4); }
        if (fl.y > H) g.flea = null;
      }
      function updateScorpion() {
        const sc = g.scorp;
        if (!sc) {
          if (g.wave >= 2 && --g.scorpT <= 0) {
            g.scorpT = 500 + Math.random() * 600;
            const left = Math.random() < 0.5;
            g.scorp = { x: left ? -16 : W, y: (3 + Math.floor(Math.random() * 14)) * CS, vx: (left ? 1 : -1) * (g.score > 20000 ? 2 : 1) };
          }
          return;
        }
        sc.x += sc.vx;
        const c = Math.floor((sc.x + 8) / CS), r = Math.floor(sc.y / CS);
        if (mAt(c, r)) g.poison[r * COLS + c] = 1;
        if (!g.attract && api.frame % 10 === 0) sfx.scorp();
        if (sc.x < -18 || sc.x > W + 2) g.scorp = null;
      }
      function spawnSideHead() {
        if (!g.reachedBottom) return;
        let total = 0; for (const ch of g.chains) total += ch.segs.length;
        if (total >= 16 || !g.chains.length) return;
        if (++g.headT < 360) return;
        g.headT = 0;
        const left = Math.random() < 0.5;
        const c = left ? 0 : COLS - 1, r = ZONE_ROW + Math.floor(Math.random() * 3);
        g.chains.push({ segs: [mkSeg(c, r)], h: left ? 1 : -1, v: 1, plunge: false });
      }

      function playerHit() {
        if (g.attract) return false;
        const box = { x: g.px + 1, y: g.py + 1, w: 5, h: 7 };
        const ov = (x, y, w, h) => box.x < x + w && box.x + box.w > x && box.y < y + h && box.y + box.h > y;
        const t = g.stepT / STEP;
        for (const ch of g.chains) for (const s of ch.segs) { const p = segPos(s, t); if (ov(p.x + 1, p.y + 1, 6, 6)) return true; }
        if (g.spider && ov(g.spider.x + 2, g.spider.y + 1, 11, 6)) return true;
        if (g.flea && ov(g.flea.x + 1, g.flea.y, 7, 8)) return true;
        return false;
      }

      // ---------- main update ----------
      function updateGame() {
        for (const b of g.booms) b.t++;
        g.booms = g.booms.filter(b => b.t < 18);
        for (const p of g.pops) p.t--;
        g.pops = g.pops.filter(p => p.t > 0);

        if (g.phase === 'dying') {
          if (--g.phaseT <= 0) {
            g.phase = 'restore'; g.restoreList = [];
            for (let i = 0; i < g.mush.length; i++) if (g.mush[i] && (g.mush[i] < 4 || g.poison[i])) g.restoreList.push(i);
            g.phaseT = 6;
          }
          return;
        }
        if (g.phase === 'restore') {
          if (--g.phaseT > 0) return;
          if (g.restoreList.length) {
            const i = g.restoreList.shift(); g.mush[i] = 4; g.poison[i] = 0; addScore(5); sfx.restore(); g.phaseT = 5; return;
          }
          if (g.lives <= 0) {
            const over = () => { api.setHiScore(g.score); g.phase = 'over'; g.phaseT = 240; };
            if (api.offerContinue && !g.attract) {
              g.phase = 'continue';
              api.offerContinue(() => {
                g.lives = 3;
                startWave(g.saved.length ? g.saved : null);
                g.px = 116; g.py = 236; g.phase = 'play';
              }, over);
            } else over();
            return;
          }
          // restart the centipede from the top with the same composition
          const layout = g.saved.length ? g.saved : null;
          startWave(layout);
          g.px = 116; g.py = 236; g.phase = 'play';
          return;
        }
        if (g.phase === 'continue') return;
        if (g.phase === 'over') {
          if (--g.phaseT <= 0) { mode = 'title'; titleT = 0; newGame(true); }
          return;
        }

        if (!g.attract) movePlayer();
        updateShot();
        const stepLen = g.fast ? 2 : STEP;
        g.stepT++;
        if (g.stepT >= stepLen) { g.stepT = 0; stepCentipede(); }
        updateSpider(); updateFlea(); updateScorpion(); spawnSideHead();

        if (playerHit()) {
          g.phase = 'dying'; g.phaseT = 90; g.lives--;
          g.saved = g.chains.map(ch => ch.segs.length).sort((a, b) => b - a);
          g.deathX = g.px; g.deathY = g.py;
          g.chains = []; g.spider = null; g.flea = null; g.scorp = null; g.shot = null;
          sfx.die();
          return;
        }
        if (!g.chains.length) {
          g.wave++;
          startWave();
          if (!g.attract) au.melody([[523, .06], [659, .06], [784, .06], [1047, .1]], { type: 'square', vol: 0.04 });
        }
      }

      // ---------- rendering ----------
      function drawField(ctx, S) {
        for (let r = TOP_ROW; r <= BOTTOM_ROW; r++) for (let c = 0; c < COLS; c++) {
          const v = g.mush[r * COLS + c];
          if (v) ctx.drawImage((g.poison[r * COLS + c] ? S.pmush : S.mush)[4 - v], c * CS, r * CS);
        }
      }
      function drawActors(ctx, S) {
        const t = (g.stepT) / (g.fast ? 2 : STEP);
        const leg = (frame >> 2) & 1;
        for (const ch of g.chains) {
          for (let i = ch.segs.length - 1; i >= 0; i--) {
            const s = ch.segs[i], p = segPos(s, t);
            const im = i === 0 ? S.headR[(leg + i) & 1] : S.body[(leg + i) & 1];
            ctx.drawImage(im, Math.round(p.x), Math.round(p.y));
          }
        }
        if (g.spider) ctx.drawImage(S.spider[(frame >> 3) & 1], Math.round(g.spider.x), Math.round(g.spider.y));
        if (g.flea) ctx.drawImage(S.flea[(frame >> 2) & 1], g.flea.x, Math.round(g.flea.y));
        if (g.scorp) ctx.drawImage((g.scorp.vx > 0 ? S.scorpR : S.scorpL)[(frame >> 3) & 1], Math.round(g.scorp.x), g.scorp.y);
        for (const b of g.booms) {
          const f = Math.min(2, Math.floor(b.t / 6));
          ctx.drawImage(S.boom[f], Math.round(b.x), Math.round(b.y));
          if (b.big) ctx.drawImage(S.boom[f], Math.round(b.x) + 6, Math.round(b.y));
        }
        for (const p of g.pops) text(ctx, p.txt, p.x, p.y, '#ffffff', { center: true, adv: 6 });
      }
      function drawPlayer(ctx, S) {
        if (g.attract) return;
        if (g.phase === 'play') {
          ctx.drawImage(S.shooter, g.px, g.py);
          if (g.shot) { ctx.fillStyle = PALS[g.wave % 8].sh; ctx.fillRect(g.shot.x, g.shot.y, 1, 6); }
        } else if (g.phase === 'dying') {
          // multicolour starburst death
          const k = 90 - g.phaseT;
          const cols = ['#ffffff', '#ff2c8c', '#ffe02c', '#2cffff', '#2cff2c'];
          const cx = g.deathX + 3, cy = g.deathY + 4;
          for (let a = 0; a < 12; a++) {
            const ang = a * Math.PI / 6 + k * 0.05, rr = Math.min(18, k * 0.5);
            for (let d = 2; d < rr; d += 3) {
              ctx.fillStyle = cols[(a + (d >> 1) + (k >> 2)) % cols.length];
              ctx.fillRect(Math.round(cx + Math.cos(ang) * d), Math.round(cy + Math.sin(ang) * d), 1, 1);
            }
          }
          if (k < 30) { ctx.fillStyle = cols[(k >> 1) % cols.length]; ctx.fillRect(cx - 2, cy - 2, 5, 5); }
        }
      }
      function drawTop(ctx, S) {
        const P = PALS[g ? g.wave % 8 : 0];
        text(ctx, String(g && !g.attract ? g.score : 0), 56, 0, P.m1, { right: true });
        if (g && !g.attract) for (let i = 0; i < Math.min(5, g.lives - 1); i++) ctx.drawImage(S.shooter, 64 + i * 9, 0);
        text(ctx, String(hi), 152, 0, P.m1, { right: true });
      }

      function drawTitle(ctx, S) {
        const P = PALS[0];
        // shaded logo
        const word = 'CENTIPEDE';
        for (let i = 0; i < word.length; i++) {
          const col = i % 2 ? P.c2 : P.c1;
          const bob = Math.round(Math.sin(frame * 0.08 + i * 0.7) * 2);
          text(ctx, word[i], 15 + i * 24 + 2, 46 + bob + 2, '#300030', { scale: 3, bold: true });
          text(ctx, word[i], 15 + i * 24, 46 + bob, col, { scale: 3, bold: true });
        }
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(28, 96, 184, 92);
        text(ctx, 'HIGH SCORE', 120, 104, '#ffe02c', { center: true });
        text(ctx, String(hi), 120, 118, '#ffffff', { center: true });
        text(ctx, 'BONUS EVERY 12000', 120, 138, P.m2, { center: true });
        text(ctx, 'HEAD 100   BODY 10', 120, 152, '#ffffff', { center: true });
        text(ctx, 'FLEA 200  SCORPION 1000', 120, 164, '#ffffff', { center: true });
        text(ctx, 'SPIDER 300/600/900', 120, 176, '#ffffff', { center: true });
        const cs = 'CREDITS ' + Math.min(99, api.credits);
        ctx.fillStyle = '#000'; ctx.fillRect(120 - cs.length * 4 - 2, 246, cs.length * 8 + 2, 10);
        text(ctx, cs, 120, 248, '#ffffff', { center: true });
        if (pushScreen()) {
          ctx.fillStyle = '#000'; ctx.fillRect(28, 96, 184, 92);
          text(ctx, 'PUSH START', 120, 112, ((frame >> 4) & 1) ? '#ffe02c' : P.m2, { center: true });
          text(ctx, api.credits > 1 ? '1 OR 2 PLAYERS' : '1 PLAYER', 120, 130, '#ffffff', { center: true });
          text(ctx, 'BONUS EVERY 12000', 120, 154, P.m2, { center: true });
          text(ctx, '© 1980 ATARI', 120, 174, '#ffffff', { center: true });
          return;
        }
        const pr = api.credits === 0 ? ((coinFlash > 0 || ((frame >> 5) & 1)) ? 'INSERT COIN' : '') : (((frame >> 5) & 1) ? 'PUSH START' : '');
        if (pr) { ctx.fillStyle = '#000'; ctx.fillRect(120 - pr.length * 4 - 2, 212, pr.length * 8 + 2, 11); text(ctx, pr, 120, 214, api.credits === 0 && coinFlash > 0 && ((frame >> 2) & 1) ? '#ff2c8c' : '#ffe02c', { center: true }); }
      }

      newGame(true);
      if (api.debugHook) api.debugHook({ g: () => g, sum: () => ({ mode, phase: g.phase, wave: g.wave, score: g.score, lives: g.lives, chains: g.chains.map(c => c.segs.length).join(','), sp: !!g.spider, fl: !!g.flea, sc: !!g.scorp }) });

      return {
        update() {
          frame++; pollCoins(); if (coinFlash > 0) coinFlash--;
          if (mode === 'title') {
            titleT++;
            if (!pushScreen()) updateGame();
            if ((api.anyPressed('Enter', 'Space') || (api.mouse.clicked && titleT > 20)) && tryStart()) {
              mode = 'play'; newGame(false); lastMX = api.mouse.x; lastMY = api.mouse.y; mouseMode = false;
              au.melody([[392, .08], [523, .08], [659, .08], [784, .16]], { type: 'square', vol: 0.05 });
            }
            return;
          }
          updateGame();
        },
        render(ctx) {
          ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
          const S = SETS[g.wave % SETS.length];
          if (mode === 'title' && pushScreen()) { drawTop(ctx, S); drawTitle(ctx, S); return; }
          drawField(ctx, S);
          drawActors(ctx, S);
          drawPlayer(ctx, S);
          drawTop(ctx, S);
          if (mode === 'title') drawTitle(ctx, S);
          else if (g.phase === 'over') {
            ctx.fillStyle = '#000'; ctx.fillRect(76, 116, 88, 18);
            text(ctx, 'GAME OVER', 120, 121, PALS[g.wave % 8].m1, { center: true });
          }
        }
      };
    }
  });
})();
