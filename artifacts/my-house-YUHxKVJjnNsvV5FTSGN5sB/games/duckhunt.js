// Duck Hunt (Nintendo, 1984) \u2014 NES / VS. style recreation for the light-gun (mouse) shell.
// Game A: 1 duck, Game B: 2 ducks, Game C: clay shooting. 10 targets per round, 3 shots each,
// required-hits bar, dog intro / catch / laugh, fly-away pink sky, perfect bonus, speeding rounds.
(function () {
  'use strict';
  const W = 256, H = 240;

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
    '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4], '/': [0, 1, 2, 4, 8, 16, 0], "'": [4, 4, 8, 0, 0, 0, 0],
    '=': [0, 0, 31, 0, 31, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0], '@': [14, 17, 23, 21, 23, 16, 14], '(': [2, 4, 8, 8, 8, 4, 2],
    ')': [8, 4, 2, 2, 2, 4, 8], '>': [8, 4, 2, 1, 2, 4, 8], '<': [2, 4, 8, 16, 8, 4, 2], '*': [0, 4, 21, 14, 21, 4, 0], ' ': [0, 0, 0, 0, 0, 0, 0]
  };
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'c') x = Math.round(x - w / 2); else if (align === 'r') x = x - w;
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) {
        const b = g[r]; if (!b) continue;
        for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
    return w;
  }

  // ---------- sprite helpers (string art + palette) ----------
  function newCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function mk(rows, pal) {
    const h = rows.length; let w = 0; for (const r of rows) w = Math.max(w, r.length);
    const c = newCanvas(w, h), g = c.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) {
      const col = pal[rows[y][x]]; if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    }
    return c;
  }
  function flip(src) {
    const c = newCanvas(src.width, src.height), g = c.getContext('2d');
    g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); return c;
  }
  // pixel-exact rotation (nearest neighbour, sampled at 3x then reduced by majority) for diagonal frames
  function rot(src, ang) {
    const sw = src.width, sh = src.height, sd = src.getContext('2d').getImageData(0, 0, sw, sh).data;
    const D = Math.ceil(Math.hypot(sw, sh)) + 2, c = newCanvas(D, D), g = c.getContext('2d');
    const out = g.createImageData(D, D), od = out.data;
    const ca = Math.cos(-ang), sa = Math.sin(-ang);
    for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) {
      const counts = new Map(); let best = -1, bestN = 0, trans = 0;
      for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++) {
        const px = x + (sx + 0.5) / 3 - D / 2, py = y + (sy + 0.5) / 3 - D / 2;
        const u = Math.floor(px * ca - py * sa + sw / 2), v = Math.floor(px * sa + py * ca + sh / 2);
        if (u < 0 || v < 0 || u >= sw || v >= sh || sd[(v * sw + u) * 4 + 3] < 128) { trans++; continue; }
        const k = (v * sw + u) * 4, key = (sd[k] << 16) | (sd[k + 1] << 8) | sd[k + 2];
        const n = (counts.get(key) || 0) + 1; counts.set(key, n); if (n > bestN) { bestN = n; best = key; }
      }
      if (best >= 0 && trans < 5) {
        const o = (y * D + x) * 4; od[o] = best >> 16; od[o + 1] = (best >> 8) & 255; od[o + 2] = best & 255; od[o + 3] = 255;
      }
    }
    g.putImageData(out, 0, 0); return c;
  }

  // ---------- NES-ish palette ----------
  const C = {
    sky: '#3cbcfc', pink: '#fcbcb0', black: '#000000', white: '#fcfcfc',
    g1: '#b8f818', g2: '#80d010', g3: '#00a800', g4: '#005800', g5: '#003000',
    dirt: '#ac7c00', dirt2: '#7c5000', dirt3: '#503000',
    hudGreen: '#80d010', hudBlue: '#3cbcfc', hudOrange: '#fca044', red: '#f83800', blue2: '#0078f8'
  };

  // ---------- DUCK ART (facing right) ----------
  // K outline, H head, E eye white, B body, L belly, F wing, D tail/dark, Y beak/feet, W neck ring
  const DUCK_UP = [
    '...........KK.....................',
    '..........KFFK....................',
    '..........KFDFK...................',
    '...........KFDFK..................',
    '...........KFFDFK.................',
    '............KFFDFK................',
    '............KFFFDFK...............',
    '.............KFFFDFK...KKKK.......',
    '.............KFFFFDFK.KHHHHK......',
    '..............KFFFFDFKHHHHHHK.....',
    '..............KFFFFFDKHHEKHHHK....',
    '...............KFFFFFKHHKKHHHKYY..',
    '..KK...........KFFFFFKHHHHHHHYYYY.',
    '..KDKK..........KFFFFKKHHHHHKYYY..',
    '..KDDDKKKKKKKKKKKFFFKKWWWWWWK.....',
    '...KDDDBBBBBBBBBBKKKBBBBBBBK......',
    '....KDDBBBBBBBBBBBBBBBBBBLLK......',
    '.....KKBBBBBBBBBBBBBBBBBLLLLK.....',
    '......KBBBBBBBBBBBBBBBBLLLLLK.....',
    '.......KKLLLLLLLLLLLLLLLLLKK......',
    '.........KKKKLLLLLLLLLKKKK........',
    '.............KKKKKKKKK............',
    '..............YK...YK.............',
    '.............YY...YY..............'
  ];
  const DUCK_MID = [
    '..................................',
    '..................................',
    '..................................',
    '..................................',
    '..................................',
    '..................................',
    '..................................',
    '.......................KKKK.......',
    '......................KHHHHK......',
    '.....................KHHHHHHK.....',
    '.....................KHHEKHHHK....',
    '..KKKKKKK............KHHKKHHHKYY..',
    '.KFFFFFFFKKKK........KHHHHHHHYYYY.',
    '..KKFDFDFFFFFKKKK.....KHHHHHKYYY..',
    '....KKFDFDFDFFFFFKK..KWWWWWWK.....',
    '..KK..KKKFDFDFDFFFFKKBBBBBBK......',
    '..KDKK...KKKKFDFDFFFBBBBBBLK......',
    '..KDDDKKKKKKKKKKFFFBBBBBBLLLK.....',
    '...KDDDBBBBBBBBBBBBBBBBBLLLLK.....',
    '....KDDBBBBBBBBBBBBBBBBLLLLLK.....',
    '.....KKBBBBBBBBBBBBBBBLLLLLK......',
    '......KKKLLLLLLLLLLLLLLLLKK.......',
    '.........KKKKLLLLLLLLKKKK.........',
    '.............KKKKKKKK.............',
    '..............YK...YK.............',
    '.............YY...YY..............'
  ];
  const DUCK_DOWN = [
    '..................................',
    '..................................',
    '..................................',
    '..................................',
    '..................................',
    '..................................',
    '..................................',
    '.......................KKKK.......',
    '......................KHHHHK......',
    '.....................KHHHHHHK.....',
    '.....................KHHEKHHHK....',
    '.....................KHHKKHHHKYY..',
    '.....................KHHHHHHHYYYY.',
    '......................KHHHHHKYYY..',
    '.....................KWWWWWWK.....',
    '..KK...............KKBBBBBBK......',
    '..KDKK......KKKKKKKBBBBBBBLK......',
    '..KDDDKKKKKKBBBBBBBBBBBBBLLLK.....',
    '...KDDDBBBBBBBBBBBBBBBBBLLLLK.....',
    '....KDDBBBBBKKKKKKBBBBBLLLLLK.....',
    '.....KKBBBBKFFFFFFKBBBLLLLLK......',
    '......KKKKKFDFDFFFKKLLLLLKK.......',
    '.........KFDFDFFFKKKLLLKK.........',
    '........KFDFDFFFK.KKKKYK..........',
    '.......KFDFDFFK.....YY............',
    '......KFDFDFFK....................',
    '.....KFFDFFK......................',
    '.....KFFFKK.......................',
    '.....KKKK.........................'
  ];
  const DUCK_SHOT = [
    '..............KKKK..............',
    '.............KHHHHK.............',
    '....KK......KHHHHHHK......KK....',
    '...KFFK.....KHEKKEHK.....KFFK...',
    '...KFDFK....KHKKKKHK....KFDFK...',
    '....KFDFK...KHHYYHHK...KFDFK....',
    '....KFFDFK...KHYYHK...KFDFFK....',
    '.....KFFDFK..KWWWWK..KFDFFK.....',
    '.....KFFFDFKKBBBBBBKKFDFFFK.....',
    '......KFFFFDBBBBBBBBDFFFFK......',
    '......KKFFFFBBBLLBBBFFFFKK......',
    '........KKKKBBLLLLBBKKKK........',
    '...........KBLLLLLLBK...........',
    '...........KBLLLLLLBK...........',
    '............KLLLLLLK............',
    '............KDKLLKDK............',
    '.............KDKKDK.............',
    '..............KKKK..............',
    '.............YK..KY.............',
    '............YY....YY............'
  ];
  const DUCK_FALL = [
    '.......YY..YY......',
    '........YKKY.......',
    '......KKKKKKKK.....',
    '.....KDDKLLKDDK....',
    '.....KDDLLLLDDK....',
    '....KBBLLLLLLBBK...',
    '....KBBLLLLLLBBK...',
    '...KFBBBLLLLBBBFK..',
    '...KFFBBBLLBBBFFK..',
    '...KFDFBBBBBBFDFK..',
    '...KFFDFBBBBFDFFK..',
    '....KFFDBBBBDFFK...',
    '....KFFFBBBBFFFK...',
    '.....KKFBBBBFKK....',
    '......KKWWWWKK.....',
    '......KHHHHHHK.....',
    '.....KHHHHHHHHK....',
    '.....KHEKHHKEHK....',
    '.....KHKKHHKKHK....',
    '......KHHYYHHK.....',
    '.......KKYYKK......',
    '.........YY........',
    '.........KK........'
  ];
  const DUCK_PALS = [
    // black duck (500)
    { K: '#000', H: '#00a800', E: '#fcfcfc', B: '#3c3c3c', L: '#a4a4a4', F: '#ac7c00', D: '#503000', Y: '#fca044', W: '#fcfcfc' },
    // blue duck (1000)
    { K: '#000', H: '#0058f8', E: '#fcfcfc', B: '#0000bc', L: '#bcbcbc', F: '#3cbcfc', D: '#0058f8', Y: '#fca044', W: '#fcfcfc' },
    // red duck (1500)
    { K: '#000', H: '#a81000', E: '#fcfcfc', B: '#881400', L: '#fce0a8', F: '#f87858', D: '#a81000', Y: '#fca044', W: '#fcfcfc' }
  ];
  const DUCK_SPR = DUCK_PALS.map(pal => {
    const hor = [DUCK_UP, DUCK_MID, DUCK_DOWN, DUCK_MID].map(r => mk(r, pal));
    const dia = hor.map(c => rot(c, -0.62));
    const shot = mk(DUCK_SHOT, pal), fall = mk(DUCK_FALL, pal);
    return { hor, horL: hor.map(flip), dia, diaL: dia.map(flip), shot, fall, fallL: flip(fall) };
  });

  // ---------- DOG ART ----------
  // K outline, B brown, L light tan, D dark brown, W white, P pink tongue, N nose
  const DOG_PAL = { K: '#000', B: '#b86818', L: '#f0bc3c', D: '#5c2c00', W: '#fcfcfc', P: '#f87858', N: '#000' };
  const DOG_BODY = [
    '..KK..............................................',
    '.KLBK.............................................',
    '.KBBK.............................................',
    '..KBBK............................................',
    '..KBBK....KKKKKKKKKKKKKKKKKK......................',
    '...KBBK.KKLLLLLLLLLLLLLLLLLLKK....................',
    '...KBBBKBBBBBBBBBBBBBBBBBBBBBBKK..................',
    '....KBBBBBBBDDDDBBBBBBBBBBBBBBBBK.................',
    '....KBBBBBBDDDDDDBBBBBBBBBBBBBBBBK................',
    '....KBBBBBBBDDDDBBBBBBBBBBBBBBBBBBKKKKK...........',
    '....KBBBBBBBBBBBBBBBBBBBBBBBBBBBBKLLLLLKK.........',
    '....KBBBBBBBBBBBBBBBBBBBBBBBBBBBKLLBBBBBBK........',
    '.....KBBBBBBBBBBBBBBBBBBBBBBBBBKDDBBBBBBBBK.......',
    '.....KBBBBBBBBBBBBBBBBBBBBBBBBKDDDDBBBBBBBBK......',
    '.....KBBBBBBBBBBBBBBBBBBBBBBBWKDDDDDBBBKKBBBK.....',
    '......KBBBBBBBBBBBBBBBBBBBBBWWKDDDDDBBBKWKBBBK....',
    '......KBBBBWWWWWWWWWWWWWWWWWWWKDDDDDBBBBBBBBBBK...',
    '......KBBBKKKKKKKKKKKKKKKKBBBWKDDDDDKBBBBWWWWWWK..',
    '.......KBBK..............KBBBKKDDDDK.KBBWWWWWWWWK.',
    '.......KBBK..............KBBBK.KDDDK..KWWWWWWKNNK.',
    '.......KBBK..............KBBK...KKK...KWWWWWKNNNK.',
    '.......KBBK..............KBBK..........KKKKKKKKK..'
  ];
  const DOG_LEGS_A = [
    '......KBBK...............KBBK.....................',
    '.....KBBK.................KBBK....................',
    '.....KBBK.................KBBK....................',
    '....KBBK...................KBBK...................',
    '....KWWWK..................KWWWK..................',
    '....KKKKK..................KKKKK..................'
  ];
  const DOG_LEGS_B = [
    '.......KBBK.............KBBK......................',
    '.......KBBK.............KBBK......................',
    '........KBBK............KBBK......................',
    '........KBBK............KBBK......................',
    '........KWWWK...........KWWWK.....................',
    '........KKKKK...........KKKKK.....................'
  ];
  // alert: head raised, ears perked, looking at player
  const DOG_ALERT = [
    '.......................................KKK........',
    '..KK..................................KDDDK.......',
    '.KLBK.............................KK.KDDDDK.......',
    '.KBBK............................KDDKKDDDK........',
    '..KBBK...........................KDDDKDDK.........',
    '..KBBK....KKKKKKKKKKKKKKKKKK....KKBBBBBBKK........',
    '...KBBK.KKLLLLLLLLLLLLLLLLLLKK.KLLBBBBBBBBK.......',
    '...KBBBKBBBBBBBBBBBBBBBBBBBBBBKKBBBBWKBBBBBK......',
    '....KBBBBBBBDDDDBBBBBBBBBBBBBBBKBBBBWKBBBBBBK.....',
    '....KBBBBBBDDDDDDBBBBBBBBBBBBBBKBBBBKKBBBBBBBK....',
    '....KBBBBBBBDDDDBBBBBBBBBBBBBBBKBBBBBBBBBWWWWWK...',
    '....KBBBBBBBBBBBBBBBBBBBBBBBBBBWKBBBBBBWWWWWKNNK..',
    '....KBBBBBBBBBBBBBBBBBBBBBBBBBWWKBBBBBWWWWWWKNNK..',
    '.....KBBBBBBBBBBBBBBBBBBBBBBBWWWWKBBBBWWWWWWWWKK..',
    '.....KBBBBBBBBBBBBBBBBBBBBBBWWWWWKKBBBKWWWWWWWK...',
    '.....KBBBBBBBBBBBBBBBBBBBBBWWWWWWK.KKKKKWWWWKK....',
    '......KBBBBBBBBBBBBBBBBBBBWWWWWWK......KKKKK......',
    '......KBBBBWWWWWWWWWWWWWWWWWWWWK..................',
    '......KBBBKKKKKKKKKKKKKKKKBBBBK...................',
    '.......KBBK..............KBBBK....................',
    '.......KBBK..............KBBBK....................',
    '.......KBBK..............KBBK.....................',
    '.......KBBK..............KBBK.....................',
    '.......KBBK..............KBBK.....................',
    '.......KBBK..............KBBK.....................',
    '.......KWWWK.............KWWWK....................',
    '.......KKKKK.............KKKKK....................'
  ];
  // leaping into the grass (seen from behind, legs tucked)
  const DOG_JUMP = [
    '..............KKKKKK..............',
    '............KKDDBBDDKK............',
    '...........KDDDBBBBDDDK...........',
    '..........KDDDDBBBBDDDDK..........',
    '..........KDDDKBBBBKDDDK..........',
    '..........KDDK.KBBK.KDDK..........',
    '...........KK.KBBBBK.KK...........',
    '.............KBBBBBBK.............',
    '.......KK...KLLLLLLLLK...KK.......',
    '......KBBK.KBBBBBBBBBBK.KBBK......',
    '......KBBBKBBBBBBBBBBBBKBBBK......',
    '.......KBBBBBBBDDBBBBBBBBBK.......',
    '........KBBBBBDDDDBBBBBBBK........',
    '.........KBBBBBDDBBBBBBBK.........',
    '.........KBBBBBBBBBBBBBBK.........',
    '.........KBBBBBBBBBBBBBBK.........',
    '..........KBBBBBBBBBBBBK..........',
    '.......KKKKBBBBBBBBBBBBKKKK.......',
    '......KBBBBKBBBBBBBBBBKBBBBK......',
    '......KWWWKKKBBBBBBBBKKKWWWK......',
    '......KKKK...KBBLLBBK...KKKK......',
    '..............KBLLBK..............',
    '..............KBBBBK..............',
    '...............KBBK...............',
    '................KK................'
  ];
  // front-facing head + torso (rises from grass)
  const DOG_FRONT_HEAD = [
    '..........KKKKKKKKKK..........',
    '........KKBBBBBBBBBBKK........',
    '.......KBBLLLLLLLLLLBBK.......',
    '....KKKBBBBBBBBBBBBBBBBKKK....',
    '...KDDDKBBBBBBBBBBBBBBKDDDK...',
    '..KDDDDKBBBBBBBBBBBBBBKDDDDK..',
    '..KDDDDKBBKKKBBBBKKKBBKDDDDK..',
    '..KDDDDKBKWWKBBBBKWWKBKDDDDK..',
    '..KDDDDKBKWKKBBBBKWKKBKDDDDK..',
    '..KDDDDKBBKKBBBBBBKKBBKDDDDK..',
    '..KDDDDDKBBBBWWWWBBBBKDDDDDK..',
    '..KDDDDDKBBBWWKKWWBBBKDDDDDK..',
    '..KDDDDDKBBWWKKKKWWBBKDDDDDK..',
    '...KDDDDKBWWWWKKWWWWBKDDDDK...',
    '...KDDDDKWWKWWWWWWKWWKDDDDK...',
    '...KDDDDKWWWKKKKKKWWWKDDDDK...',
    '....KDDDKKWWWWWWWWWWKKDDDK....',
    '.....KKKBKKWWWWWWWWKKBKKK.....',
    '......KBBBBKKKKKKKKBBBBK......'
  ];
  const DOG_LAUGH_HEAD = [
    '..........KKKKKKKKKK..........',
    '........KKBBBBBBBBBBKK........',
    '.......KBBLLLLLLLLLLBBK.......',
    '....KKKBBBBBBBBBBBBBBBBKKK....',
    '...KDDDKBBBBBBBBBBBBBBKDDDK...',
    '..KDDDDKBBBBBBBBBBBBBBKDDDDK..',
    '..KDDDDKBBBBBBBBBBBBBBKDDDDK..',
    '..KDDDDKBBKKKBBBBKKKBBKDDDDK..',
    '..KDDDDKBKBBBKBBKBBBKBKDDDDK..',
    '..KDDDDKBBBBBBBBBBBBBBKDDDDK..',
    '..KDDDDDKBBBBWWWWBBBBKDDDDDK..',
    '..KDDDDDKBBBWWKKWWBBBKDDDDDK..',
    '..KDDDDDKBBWWKKKKWWBBKDDDDDK..',
    '...KDDDDKBWKKKKKKKKWBKDDDDK...',
    '...KDDDDKWKWWWWWWWWKWKDDDDK...',
    '...KDDDDKWKPPPPPPPPKWKDDDDK...',
    '....KDDDKKWKPPPPPPKWKKDDDK....',
    '.....KKKBKKWKKKKKKWKKBKKK.....',
    '......KBBBBKKKKKKKKBBBBK......'
  ];
  const DOG_TORSO = [
    '.....KBBBBBBWWWWWWBBBBBBK.....',
    '....KBBBBBBWWWWWWWWBBBBBBK....',
    '...KBBBBBBWWWWWWWWWWBBBBBBK...',
    '...KBBBBBBWWWWWWWWWWBBBBBBK...',
    '...KBBBBBBWWWWWWWWWWBBBBBBK...',
    '...KBBBBBBBWWWWWWWWBBBBBBBK...',
    '...KBBBBBBBWWWWWWWWBBBBBBBK...',
    '...KBBBBBBBBWWWWWWBBBBBBBBK...',
    '...KBBBBBBBBBBBBBBBBBBBBBBK...',
    '...KBBBBBBBBBBBBBBBBBBBBBBK...'
  ];
  const DOG_ARM = [ // raised arm with paw, attached at shoulder (right side)
    '...KKKK.',
    '..KWWWWK',
    '..KWKWKK',
    '..KBBBBK',
    '.KBBBBK.',
    '.KBBBK..',
    'KBBBK...',
    'KBBK....',
    'KBBK....'
  ];
  const DOG_LAUGH_PAWS = [
    '.KKK................KKK.',
    'KBBBK..............KBBBK',
    'KBWBK..............KBWBK',
    'KBBBK..............KBBBK',
    '.KBBK..............KBBK.'
  ];
  const dogSpr = {
    walkA: mk(DOG_BODY.concat(DOG_LEGS_A), DOG_PAL),
    walkB: mk(DOG_BODY.concat(DOG_LEGS_B), DOG_PAL),
    alert: mk(DOG_ALERT, DOG_PAL),
    jump: mk(DOG_JUMP, DOG_PAL),
    front: mk(DOG_FRONT_HEAD.concat(DOG_TORSO), DOG_PAL),
    laugh: mk(DOG_LAUGH_HEAD.concat(DOG_TORSO), DOG_PAL),
    arm: mk(DOG_ARM, DOG_PAL),
    paws: mk(DOG_LAUGH_PAWS, DOG_PAL)
  };
  dogSpr.armL = flip(dogSpr.arm);
  dogSpr.leap = rot(dogSpr.alert, -0.55);
  dogSpr.leapTop = rot(dogSpr.alert, -0.1);
  dogSpr.dive = rot(dogSpr.alert, 0.75);

  // ---------- HUD icons ----------
  const HUD_DUCK = mk([
    '.....KK.',
    '....KWWK',
    '....KWWWY',
    'K..KWWWK',
    'KWKWWWWK',
    'KWWWWWWK',
    '.KWWWWK.',
    '..KKKK..'
  ], { K: '#000', W: '#fcfcfc', Y: '#fca044' });
  const HUD_DUCK_R = mk([
    '.....KK.',
    '....KRRK',
    '....KRRRY',
    'K..KRRRK',
    'KRKRRRRK',
    'KRRRRRRK',
    '.KRRRRK.',
    '..KKKK..'
  ], { K: '#000', R: '#f83800', Y: '#fca044' });
  const BULLET = mk([
    '.O.',
    'OOO',
    'OOO',
    'WWW',
    'WWW',
    'WWW',
    'WWW',
    'KKK'
  ], { O: '#fca044', W: '#3cbcfc', K: '#0058f8' });
  const CLAY_ART = [
    '....KKKKKK....',
    '..KKOOOOOOKK..',
    '.KOOYYYYYYOOK.',
    'KOOYYYYYYYYOOK',
    'KOOOYYYYYYOOOK',
    '.KOOOOOOOOOOK.',
    '..KKKKKKKKKK..'
  ];
  const CLAY = mk(CLAY_ART, { K: '#000', O: '#c84c0c', Y: '#fca044' });

  // ---------- backgrounds (generated pixel art) ----------
  function bayer(x, y) { const m = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]; return m[(y & 3) * 4 + (x & 3)] / 16; }
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  // foliage made of overlapping puffs, lit from top-left, dithered, outlined
  function puffLayer(g, puffs, cols, ox, oy, w, h) {
    const id = g.getImageData(ox, oy, w, h), d = id.data;
    const own = new Float32Array(w * h).fill(-1);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let best = -1;
      for (const p of puffs) {
        const dx = x + ox - p.x, dy = y + oy - p.y, r2 = dx * dx + dy * dy;
        if (r2 <= p.r * p.r) {
          const nx = dx / p.r, ny = dy / p.r;
          const l = Math.max(0, Math.min(1, 0.55 - nx * 0.45 - ny * 0.6 - Math.hypot(nx, ny) * 0.15 + p.b));
          best = l; // later puffs overwrite (painter order)
        }
      }
      own[y * w + x] = best;
    }
    const hex = cols.map(c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = own[y * w + x]; if (v < 0) continue;
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1 || own[y * w + x - 1] < 0 || own[y * w + x + 1] < 0 || own[(y - 1) * w + x] < 0 || own[(y + 1) * w + x] < 0;
      // internal crease where a puff boundary falls off sharply
      let crease = false;
      if (!edge) { const up = own[(y - 1) * w + x]; if (up - v > 0.28) crease = true; }
      let idx;
      if (edge || crease) idx = 0;
      else { const t = v * (hex.length - 1.01) + (bayer(x + ox, y + oy) - 0.5) * 0.9; idx = Math.max(1, Math.min(hex.length - 1, Math.floor(t) + 1)); }
      const col = hex[idx], k = (y * w + x) * 4;
      d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
    }
    g.putImageData(id, ox, oy);
  }

  function buildTreeLayer() {
    const c = newCanvas(W, H), g = c.getContext('2d');
    // trunk + branches
    const trunk = '#ac7c00', trunkD = '#503000', trunkL = '#e4a43c';
    function limb(x0, y0, x1, y1, w0, w1) {
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, w = w0 + (w1 - w0) * t;
        g.fillStyle = '#000'; g.fillRect(Math.round(x - w / 2) - 1, Math.round(y), Math.round(w) + 2, 1);
        g.fillStyle = trunk; g.fillRect(Math.round(x - w / 2), Math.round(y), Math.round(w), 1);
        g.fillStyle = trunkD; g.fillRect(Math.round(x + w / 2) - 2, Math.round(y), 2, 1);
        if (w > 5) { g.fillStyle = trunkL; g.fillRect(Math.round(x - w / 2) + 1, Math.round(y), 1, 1); }
      }
    }
    limb(36, 186, 34, 70, 16, 9);
    limb(34, 120, 62, 86, 7, 3);
    limb(32, 104, 10, 78, 6, 3);
    limb(35, 90, 52, 62, 5, 3);
    // bark texture
    const r = rng(7);
    for (let i = 0; i < 70; i++) {
      const y = 80 + Math.floor(r() * 100), x = 30 + Math.floor(r() * 9);
      g.fillStyle = trunkD; g.fillRect(x, y, 1, 2 + Math.floor(r() * 3));
    }
    // foliage puffs (pale NES greens)
    const puffs = [];
    const rr = rng(11);
    const centers = [[30, 52, 26], [62, 64, 18], [8, 66, 18], [46, 36, 20], [16, 38, 16], [70, 46, 12], [38, 72, 16]];
    for (const [x, y, s] of centers) {
      for (let i = 0; i < 5; i++) puffs.push({ x: x + (rr() - 0.5) * s * 1.2, y: y + (rr() - 0.5) * s * 0.8, r: s * (0.45 + rr() * 0.35), b: (rr() - 0.5) * 0.2 });
    }
    puffs.sort((a, b) => a.y - b.y);
    puffLayer(g, puffs, ['#005800', '#00a800', '#80d010', '#b8f818', '#d8f878'], 0, 6, 104, 110);
    // bush on the right
    const bp = [];
    const br = rng(23);
    for (let i = 0; i < 16; i++) bp.push({ x: 200 + br() * 50, y: 150 + br() * 16 - (i < 6 ? 10 : 0), r: 8 + br() * 10, b: (br() - 0.5) * 0.2 });
    bp.sort((a, b) => a.y - b.y);
    puffLayer(g, bp, ['#003000', '#005800', '#00a800', '#80d010'], 180, 126, 76, 60);
    return c;
  }

  function buildGrass() {
    const c = newCanvas(W, H), g = c.getContext('2d');
    const r = rng(42);
    const base = 186;
    // contour of the tall grass clump (higher in the middle-left, like the NES field)
    const top = new Array(W);
    for (let x = 0; x < W; x++) {
      const t = x / W;
      top[x] = 152 + Math.sin(t * 9.3) * 3 + Math.sin(t * 23.1 + 1) * 2 + (t > 0.7 ? (t - 0.7) * 20 : 0);
    }
    // body
    for (let x = 0; x < W; x++) for (let y = Math.floor(top[x]); y < base; y++) {
      const v = (y - top[x]) / (base - top[x]);
      let col = v < 0.15 ? C.g1 : v < 0.55 ? C.g2 : C.g3;
      if (bayer(x, y) < 0.5 && v > 0.45 && v < 0.6) col = C.g3;
      if (bayer(x, y) < 0.5 && v > 0.1 && v < 0.2) col = C.g2;
      g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
    // blades: tall pointed spikes sticking out of the clump
    for (let i = 0; i < 150; i++) {
      const x0 = Math.floor(r() * W), h = 8 + Math.floor(r() * 24), lean = (r() - 0.5) * 12, w = 4 + Math.floor(r() * 4);
      const y0 = Math.floor(top[x0]) + 6;
      for (let k = 0; k < h; k++) {
        const t = k / h, ww = Math.max(1, Math.round(w * (1 - t))), xx = Math.round(x0 + lean * t * t);
        const yy = y0 - k;
        g.fillStyle = C.g4; g.fillRect(xx - 1, yy, 1, 1); g.fillRect(xx + ww, yy, 1, 1);
        g.fillStyle = C.g2; g.fillRect(xx, yy, ww, 1);
        g.fillStyle = C.g1; g.fillRect(xx, yy, 1, 1);
        if (ww > 2) { g.fillStyle = C.g3; g.fillRect(xx + ww - 1, yy, 1, 1); }
      }
      g.fillStyle = C.g4; g.fillRect(Math.round(x0 + lean), y0 - h, 1, 1);
    }
    // inner blade lines
    for (let i = 0; i < 160; i++) {
      const x0 = Math.floor(r() * W), y0 = base - 2 - Math.floor(r() * 8), h = 8 + Math.floor(r() * 16), lean = (r() - 0.5) * 8;
      g.fillStyle = r() < 0.5 ? C.g3 : C.g4;
      for (let k = 0; k < h; k++) { const t = k / h; g.fillRect(Math.round(x0 + lean * t * t), y0 - k, 1, 1); }
    }
    // dirt
    for (let y = base; y < H; y++) for (let x = 0; x < W; x++) {
      let col = C.dirt;
      const n = r();
      if (y < base + 2) col = C.g3; else if (y < base + 3) col = C.dirt3;
      else if (n < 0.04) col = C.dirt2; else if (n < 0.05) col = '#e4a43c';
      g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
    return c;
  }

  function buildClayScene() {
    // distant hills, tree line and field for Game C
    const c = newCanvas(W, H), g = c.getContext('2d');
    const r = rng(77);
    const hz = 132;
    // far hills
    for (let x = 0; x < W; x++) {
      const h = hz - 18 - Math.sin(x / 31) * 8 - Math.sin(x / 13 + 2) * 3;
      for (let y = Math.floor(h); y < hz; y++) {
        g.fillStyle = (y - h < 1) ? '#005800' : (bayer(x, y) < 0.3 ? '#00a800' : '#007800'); g.fillRect(x, y, 1, 1);
      }
    }
    // tree line
    const tl = [];
    for (let i = 0; i < 40; i++) tl.push({ x: i * 7 + r() * 5, y: hz - 4 + r() * 3, r: 5 + r() * 5, b: (r() - 0.5) * 0.2 });
    puffLayer(g, tl, ['#003000', '#005800', '#00a800', '#80d010'], 0, hz - 18, W, 26);
    // field with perspective stripes
    for (let y = hz + 4; y < 186; y++) {
      const z = (y - hz) / (186 - hz);
      const band = Math.floor(Math.log(1 + z * 12) * 4) % 2;
      for (let x = 0; x < W; x++) {
        let col = band ? '#80d010' : '#58b800';
        if (bayer(x, y) < 0.12 && z < 0.4) col = '#00a800';
        g.fillStyle = col; g.fillRect(x, y, 1, 1);
      }
    }
    // a few big trees framing the field
    const side = [];
    for (let i = 0; i < 9; i++) side.push({ x: 4 + r() * 30, y: 70 + r() * 70, r: 12 + r() * 10, b: (r() - 0.5) * 0.2 });
    for (let i = 0; i < 9; i++) side.push({ x: 226 + r() * 30, y: 80 + r() * 60, r: 12 + r() * 10, b: (r() - 0.5) * 0.2 });
    side.sort((a, b) => a.y - b.y);
    g.fillStyle = '#503000'; g.fillRect(14, 120, 6, 66); g.fillRect(238, 120, 6, 66);
    g.fillStyle = '#ac7c00'; g.fillRect(15, 120, 3, 66); g.fillRect(239, 120, 3, 66);
    puffLayer(g, side.filter(p => p.x < 128), ['#003000', '#005800', '#00a800', '#80d010'], 0, 50, 60, 106);
    puffLayer(g, side.filter(p => p.x > 128), ['#003000', '#005800', '#00a800', '#80d010'], 196, 58, 60, 98);
    // foreground shrubs
    const fg = [];
    for (let i = 0; i < 26; i++) fg.push({ x: i * 10 + r() * 6, y: 184 + r() * 4, r: 7 + r() * 6, b: (r() - 0.5) * 0.2 });
    puffLayer(g, fg.filter(p => p.x < 104 || p.x > 152), ['#003000', '#005800', '#00a800', '#80d010', '#b8f818'], 0, 166, W, 20);
    // launcher pad
    g.fillStyle = '#503000'; g.fillRect(118, 176, 20, 6);
    g.fillStyle = '#7c7c7c'; g.fillRect(120, 172, 16, 5);
    g.fillStyle = '#000'; g.fillRect(118, 176, 20, 1);
    return c;
  }

  const treeLayer = buildTreeLayer();
  const grassLayer = buildGrass();
  const clayScene = buildClayScene();

  // ---------- rules ----------
  function pointsFor(type, round, game) {
    const tier = round <= 5 ? 0 : round <= 10 ? 1 : 2;
    if (game === 2) return [1000, 1500, 2000][tier];
    return [[500, 1000, 1500], [800, 1600, 2400], [1000, 2000, 3000]][tier][type];
  }
  function required(round) { return round <= 10 ? 6 : round <= 12 ? 7 : round <= 14 ? 8 : round <= 19 ? 9 : 10; }
  function perfectBonus(round) { return round <= 10 ? 10000 : round <= 15 ? 15000 : round <= 20 ? 20000 : 30000; }

  ArcadeRegistry.register({
    id: 'duckhunt',
    title: 'Duck Hunt',
    year: 1984,
    maker: 'Nintendo',
    width: W, height: H,
    vector: false,
    pointer: true,
    controls: 'Mouse: aim \u00b7 Click: shoot \u00b7 Arrows+Space also work \u00b7 Up/Down: pick game \u00b7 Enter: start',
    marquee: { bg: '#3cbcfc', fg: '#fcfcfc', accent: '#f83800' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(12000);
      let state = 'title', menu = 0, game = 0;
      let score = 0, round = 1, hits = [], duckIdx = 0, shots = 3;
      let ducks = [], dog = null, phaseT = 0, phase = '';
      let skyPink = false, flashT = 0, popups = [], msg = null, perfectT = 0;
      let aimX = 128, aimY = 100, lastMX = -1, lastMY = -1, tallyT = 0, tallyDone = false, tallyFlash = 0;
      let quackT = 0, frags = [], titleT = 0, overT = 0;
      let coinFlash = 0;   // coin-op: INSERT COIN flash after a start attempt with no credit
      // the credit is spent when the chosen game actually begins; browsing GAME A/B/C is free
      function tryStart(gm) {
        if (api.useCredit()) { coinFlash = 0; start(gm); return; }
        coinFlash = 90; au.tone(70, 0.25, { type: 'square', vol: 0.25 });
      }

      // --- sounds ---
      const sfx = {
        shot() { au.noise(0.35, { vol: 0.5, freq: 4000, slideTo: 200 }); au.tone(150, 0.18, { type: 'square', vol: 0.25, slideTo: 40 }); },
        quack() { au.tone(740, 0.07, { type: 'square', vol: 0.09, slideTo: 520 }); au.tone(700, 0.07, { type: 'square', vol: 0.08, slideTo: 480, delay: 0.1 }); },
        hit() { au.tone(1400, 0.05, { type: 'square', vol: 0.12 }); },
        fall() { au.tone(1800, 0.9, { type: 'triangle', vol: 0.18, slideTo: 300 }); },
        thud() { au.noise(0.15, { vol: 0.35, freq: 400 }); au.tone(90, 0.12, { type: 'triangle', vol: 0.3, slideTo: 40 }); },
        bark() { au.noise(0.08, { vol: 0.3, freq: 1500, type: 'bandpass' }); au.tone(300, 0.08, { type: 'sawtooth', vol: 0.15, slideTo: 180 }); },
        catch1() { au.melody([[784, 0.08], [1047, 0.08], [1319, 0.08], [1568, 0.25]], { type: 'square', vol: 0.12 }); },
        laugh() {
          for (let i = 0; i < 6; i++) { au.tone(i % 2 ? 330 : 392, 0.12, { type: 'square', vol: 0.12, delay: i * 0.17 }); au.tone(i % 2 ? 165 : 196, 0.12, { type: 'triangle', vol: 0.12, delay: i * 0.17 }); }
        },
        flyaway() { au.melody([[880, 0.1], [0, 0.04], [880, 0.1], [0, 0.04], [698, 0.1], [784, 0.3]], { type: 'square', vol: 0.1 }); },
        intro() {
          const n = [[523, .15], [659, .15], [784, .15], [659, .15], [698, .15], [880, .15], [1047, .3], [988, .15], [880, .15], [784, .15], [698, .15], [659, .3], [523, .15], [587, .15], [659, .15], [784, .45]];
          au.melody(n, { type: 'square', vol: 0.09 });
          au.melody([[131, .3], [196, .3], [175, .3], [262, .3], [196, .3], [175, .3], [131, .3], [196, .45]], { type: 'triangle', vol: 0.15 });
        },
        clear() { au.melody([[523, .12], [659, .12], [784, .12], [1047, .12], [784, .12], [1047, .4]], { type: 'square', vol: 0.12 }); au.melody([[262, .36], [392, .24], [523, .4]], { type: 'triangle', vol: 0.15 }); },
        perfect() { au.melody([[1047, .1], [1175, .1], [1319, .1], [1568, .1], [1319, .1], [1568, .1], [2093, .4]], { type: 'square', vol: 0.12 }); },
        over() { au.melody([[392, .25], [370, .25], [349, .25], [330, .6]], { type: 'square', vol: 0.12 }); au.melody([[196, .25], [185, .25], [175, .25], [165, .6]], { type: 'triangle', vol: 0.15 }); },
        tick() { au.tone(1200, 0.04, { type: 'square', vol: 0.1 }); },
        launch() { au.noise(0.2, { vol: 0.25, freq: 1200, slideTo: 3000, type: 'bandpass' }); },
        shatter() { au.noise(0.25, { vol: 0.35, freq: 6000, slideTo: 1500, type: 'highpass' }); },
        menu() { au.tone(988, 0.05, { type: 'square', vol: 0.1 }); }
      };

      function start(gm) {
        game = gm; score = 0; round = 1; state = 'play'; beginRound();
      }
      function beginRound() {
        hits = new Array(10).fill(0); duckIdx = 0; ducks = []; frags = [];
        skyPink = false; tallyDone = false; perfectT = 0;
        msg = { text: ['ROUND', String(round)], t: 0 };
        if (game < 2) {
          phase = 'intro'; phaseT = 0;
          dog = { mode: 'walk', x: -44, y: 150, t: 0, step: 0, stops: [56, 100] };
          sfx.intro();
        } else {
          phase = 'clayIntro'; phaseT = 0; dog = null;
          au.melody([[659, .12], [784, .12], [1047, .3]], { type: 'square', vol: 0.1 });
        }
      }
      function speedFor(type) {
        const base = Math.min(200, 72 + (round - 1) * 7);
        return base * [1, 1.25, 1.55][type];
      }
      function spawnSet() {
        const n = game === 0 ? 1 : 2;
        ducks = []; shots = 3; skyPink = false; phase = 'fly'; phaseT = 0; quackT = 0;
        for (let i = 0; i < n; i++) {
          if (duckIdx + i >= 10) break;
          if (game === 2) {
            const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
            const sp = 120 + Math.min(80, round * 6) + Math.random() * 30;
            ducks.push({ clay: true, x: 128 + (i ? 6 : -6), y: 172, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, z: 1, state: 'fly', t: 0, delay: i * 0.35 });
          } else {
            const r = Math.random(), type = r < 0.5 ? 0 : r < 0.8 ? 1 : 2;
            const sp = speedFor(type);
            const dir = Math.random() < 0.5 ? -1 : 1;
            const ang = -Math.PI / 2 + dir * (0.45 + Math.random() * 0.5);
            ducks.push({ type, x: 50 + Math.random() * 156, y: 176, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, sp, state: 'fly', t: 0, turnT: 0.8 + Math.random(), anim: 0, delay: 0 });
          }
        }
        if (game === 2) sfx.launch();
      }
      function flyTime() { return game === 2 ? 99 : Math.max(3.6, 6.2 - (round - 1) * 0.12); }

      function fire() {
        if (state !== 'play' || phase !== 'fly' || shots <= 0) return;
        shots--; sfx.shot(); flashT = 2;
        let hit = false;
        for (const d of ducks) {
          if (d.state !== 'fly' || d.delay > 0) continue;
          let hw, hh;
          if (d.clay) { const s = Math.max(0.25, d.z); hw = 9 * s + 3; hh = 6 * s + 3; }
          else { hw = 14; hh = 12; }
          if (Math.abs(aimX - d.x) <= hw && Math.abs(aimY - d.y) <= hh) {
            hit = true;
            const pts = pointsFor(d.type || 0, round, game);
            score += pts; popups.push({ x: d.x, y: d.y - 14, t: 0, v: pts });
            if (popups.length > 6) popups.shift();
            if (d.clay) {
              d.state = 'gone'; d.hit = true; sfx.shatter();
              for (let k = 0; k < 10; k++) frags.push({ x: d.x, y: d.y, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 60 - 10, t: 0 });
              if (frags.length > 60) frags.splice(0, frags.length - 60);
            } else { d.state = 'shot'; d.t = 0; d.hit = true; sfx.hit(); }
          }
        }
        if (!hit && shots === 0) { /* remaining targets will escape */ }
      }

      function liveCount() { return ducks.filter(d => d.state === 'fly' || d.state === 'shot' || d.state === 'fall' || d.state === 'flee').length; }

      function updateDucks(dt) {
        for (const d of ducks) {
          if (d.delay > 0) { d.delay -= dt; if (d.delay <= 0 && d.clay) sfx.launch(); continue; }
          d.t += dt;
          if (d.clay) {
            if (d.state === 'fly' || d.state === 'flee') {
              d.x += d.vx * dt * d.z; d.y += d.vy * dt * d.z;
              d.vy += 30 * dt; // slight arc
              d.z = Math.max(0.05, d.z - dt * (0.32 + round * 0.012));
              if (d.z <= 0.08 || d.y < 20) d.state = 'escaped';
            }
            continue;
          }
          d.anim += dt * (d.state === 'flee' ? 14 : 10);
          if (d.state === 'fly') {
            d.x += d.vx * dt; d.y += d.vy * dt;
            d.turnT -= dt;
            if (d.x < 12) { d.x = 12; d.vx = Math.abs(d.vx); }
            if (d.x > W - 12) { d.x = W - 12; d.vx = -Math.abs(d.vx); }
            if (d.y < 18) { d.y = 18; d.vy = Math.abs(d.vy); }
            if (d.y > 150 && d.t > 1) { d.y = 150; d.vy = -Math.abs(d.vy); }
            if (d.turnT <= 0 && d.t > 0.8) {
              d.turnT = 0.5 + Math.random() * 1.2;
              const up = [-2.4, -2.0, -1.1, -0.7, -0.25, -2.9], down = [0.7, 1.1, 2.0, 2.4, 0.2, 2.94];
              const pool = d.y > 100 ? up : d.y < 50 ? up.concat(down, down) : up.concat(down);
              const a = pool[Math.floor(Math.random() * pool.length)];
              d.vx = Math.cos(a) * d.sp; d.vy = Math.sin(a) * d.sp;
              if (Math.abs(d.vy) < 10) d.vy = (Math.random() < 0.5 ? -1 : 1) * 12;
            }
          } else if (d.state === 'shot') {
            if (d.t > 0.5) { d.state = 'fall'; d.t = 0; sfx.fall(); }
          } else if (d.state === 'fall') {
            d.y += 100 * dt;
            if (d.y >= 172) { d.state = 'down'; sfx.thud(); }
          } else if (d.state === 'flee') {
            d.y -= d.sp * 1.3 * dt; d.x += d.vx * 0.2 * dt;
            if (d.y < -30) d.state = 'escaped';
          }
        }
      }

      function endSet() {
        let caught = 0, sumX = 0;
        ducks.forEach((d, i) => {
          if (duckIdx + i < 10) hits[duckIdx + i] = d.hit ? 1 : 2;
          if (d.hit) { caught++; sumX += d.x; }
        });
        duckIdx += ducks.length;
        if (game === 2) { phase = 'pause'; phaseT = 0; return; }
        phase = 'dog'; phaseT = 0;
        if (caught) { dog = { mode: 'hold', n: caught, x: Math.max(40, Math.min(216, sumX / caught)), y: 0, t: 0 }; sfx.catch1(); }
        else { dog = { mode: 'laugh', x: 128, y: 0, t: 0 }; sfx.laugh(); }
      }

      function gameOver() {
        phase = 'over'; phaseT = 0; msg = { text: ['GAME OVER'], t: 0 }; sfx.over();
        if (game < 2 && !dog) { dog = { mode: 'laugh', x: 128, y: 0, t: 0 }; sfx.laugh(); }
      }

      function afterSet() {
        if (duckIdx >= 10) { phase = 'tally'; phaseT = 0; tallyT = 0; tallyDone = false; dog = null; }
        else spawnSet();
      }

      function updatePlay(dt) {
        phaseT += dt;
        if (msg) msg.t += dt;
        if (phase === 'intro') {
          // dog walks, sniffs, stops, alerts, jumps into the grass
          const d = dog; d.t += dt;
          if (d.mode === 'walk') {
            d.x += 40 * dt; d.step += dt;
            if (d.stops.length && d.x >= d.stops[0]) { d.stops.shift(); d.mode = d.stops.length ? 'sniff' : 'alert'; d.t = 0; if (d.mode === 'alert') sfx.bark(); }
          } else if (d.mode === 'sniff') {
            if (d.t > 0.6) { d.mode = 'walk'; d.t = 0; }
          } else if (d.mode === 'alert') {
            if (d.t > 0.6) { d.mode = 'jump'; d.t = 0; d.vy = -150; d.y0 = d.y; d.x += 6; }
          } else if (d.mode === 'jump') {
            d.vy += 380 * dt; d.y += d.vy * dt; d.x += 14 * dt;
            if (d.vy > 0 && d.y > 170) { dog = null; msg = null; phase = 'wait'; phaseT = 0; }
          }
        } else if (phase === 'clayIntro') {
          if (phaseT > 2) { msg = null; spawnSet(); }
        } else if (phase === 'wait') {
          if (phaseT > 0.5) spawnSet();
        } else if (phase === 'fly') {
          updateDucks(dt);
          if (game < 2) {
            quackT -= dt;
            if (quackT <= 0 && ducks.some(d => d.state === 'fly')) { sfx.quack(); quackT = 0.55 + Math.random() * 0.4; }
          }
          const flying = ducks.filter(d => d.state === 'fly' && d.delay <= 0);
          if (flying.length && (phaseT > flyTime() || shots === 0) && game < 2) {
            if (!ducks.some(d => d.state === 'shot')) {
              for (const d of flying) d.state = 'flee';
              skyPink = true; msg = { text: ['FLY AWAY'], t: 0 }; sfx.flyaway();
            }
          }
          if (game === 2 && shots === 0) { for (const d of flying) d.state = 'flee'; }
          if (liveCount() === 0 && !ducks.some(d => d.delay > 0)) {
            skyPink = false; msg = null; endSet();
          }
        } else if (phase === 'dog') {
          const d = dog; d.t += dt;
          const rise = 0.45, hold = d.mode === 'laugh' ? 1.4 : 1.2;
          if (d.t < rise) d.y = d.t / rise;
          else if (d.t < rise + hold) d.y = 1;
          else if (d.t < rise * 2 + hold) d.y = 1 - (d.t - rise - hold) / rise;
          else { dog = null; afterSet(); }
        } else if (phase === 'pause') {
          if (phaseT > 0.9) afterSet();
        } else if (phase === 'tally') {
          tallyT += dt;
          if (!tallyDone && tallyT > 0.14) {
            tallyT = 0;
            let swapped = false;
            for (let j = 0; j < 9; j++) if (hits[j] === 2 && hits[j + 1] === 1) { hits[j] = 1; hits[j + 1] = 2; swapped = true; sfx.tick(); break; }
            if (!swapped) { tallyDone = true; phaseT = 0; }
          }
          if (tallyDone && phaseT > 1.2) {
            const n = hits.filter(h => h === 1).length;
            if (n >= required(round)) {
              if (n === 10) { score += perfectBonus(round); msg = { text: ['PERFECT!!', String(perfectBonus(round))], t: 0 }; sfx.perfect(); }
              else sfx.clear();
              phase = 'clear'; phaseT = 0;
            } else {
              // failed round: the dog laughs first, then CONTINUE? (replays this round) or GAME OVER
              phase = 'fail'; phaseT = 0;
              if (game < 2) { dog = { mode: 'laugh', x: 128, y: 0, t: 0 }; sfx.laugh(); }
            }
          }
        } else if (phase === 'clear') {
          if (phaseT > (msg ? 2.6 : 1.6)) { round = Math.min(99, round + 1); beginRound(); }
        } else if (phase === 'fail') {
          if (dog) { dog.t += dt; dog.y = Math.min(1, dog.t / 0.45); }
          if (phaseT > (game < 2 ? 2 : 0.8)) {
            if (api.offerContinue) api.offerContinue(() => { dog = null; beginRound(); }, gameOver);
            else gameOver();
          }
        } else if (phase === 'over') {
          if (dog) { dog.t += dt; dog.y = Math.min(1, dog.t / 0.45); }
          if (phaseT > 4.5) {
            if (score > hi) { hi = score; }
            api.setHiScore(score);
            state = 'title'; titleT = 0; dog = null; msg = null;
          }
        }
        for (const p of popups) p.t += dt;
        while (popups.length && popups[0].t > 1.2) popups.shift();
        for (const f of frags) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 160 * dt; }
        while (frags.length && frags[0].t > 1.5) frags.shift();
      }

      function updateAim(dt) {
        const m = api.mouse;
        if (m.x !== lastMX || m.y !== lastMY) { aimX = m.x; aimY = m.y; lastMX = m.x; lastMY = m.y; }
        const sp = 140 * dt;
        if (api.key('ArrowLeft')) aimX -= sp; if (api.key('ArrowRight')) aimX += sp;
        if (api.key('ArrowUp')) aimY -= sp; if (api.key('ArrowDown')) aimY += sp;
        aimX = Math.max(0, Math.min(W - 1, aimX)); aimY = Math.max(0, Math.min(H - 1, aimY));
      }

      return {
        update(dt) {
          if (flashT > 0) flashT--;
          if (coinFlash > 0) coinFlash = api.credits > 0 ? 0 : coinFlash - 1;
          if (state === 'title') {
            titleT += dt;
            const m = api.mouse;
            if (m.x !== lastMX || m.y !== lastMY) { aimX = m.x; aimY = m.y; lastMX = m.x; lastMY = m.y; }
            if (api.pressed('ArrowUp')) { menu = (menu + 2) % 3; sfx.menu(); }
            if (api.pressed('ArrowDown') || api.pressed('KeyX')) { menu = (menu + 1) % 3; sfx.menu(); }
            if (m.clicked) {
              for (let i = 0; i < 3; i++) if (m.y >= 128 + i * 16 - 4 && m.y < 128 + i * 16 + 10) { menu = i; }
              tryStart(menu); return;
            }
            if (api.anyPressed('Enter', 'Space')) tryStart(menu);
            return;
          }
          updateAim(dt);
          if (api.mouse.clicked) { aimX = api.mouse.x; aimY = api.mouse.y; fire(); }
          if (api.pressed('Space')) fire();
          updatePlay(dt);
        },

        render(g) {
          if (state === 'title') return renderTitle(g);
          if (flashT > 0) {
            // NES Zapper detection frame: black screen, white boxes over targets
            g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
            g.fillStyle = '#fff';
            for (const d of ducks) if (d.state === 'fly' && d.delay <= 0) {
              const s = d.clay ? Math.max(0.3, d.z) : 1;
              g.fillRect(Math.round(d.x - 14 * s), Math.round(d.y - 12 * s), Math.round(28 * s), Math.round(24 * s));
            }
            return;
          }
          g.fillStyle = skyPink ? C.pink : C.sky; g.fillRect(0, 0, W, H);
          if (game === 2) {
            g.drawImage(clayScene, 0, 0);
            for (const d of ducks) {
              if (d.delay > 0 || (d.state !== 'fly' && d.state !== 'flee')) continue;
              const s = Math.max(0.15, d.z), w = Math.max(2, Math.round(CLAY.width * s)), h = Math.max(1, Math.round(CLAY.height * s));
              g.drawImage(CLAY, Math.round(d.x - w / 2), Math.round(d.y - h / 2), w, h);
            }
            for (const f of frags) { g.fillStyle = f.t % 0.2 < 0.1 ? '#fca044' : '#c84c0c'; g.fillRect(Math.round(f.x), Math.round(f.y), 2, 1); }
            g.drawImage(grassLayer, 0, 186, W, H - 186, 0, 186, W, H - 186);
          } else {
            g.drawImage(treeLayer, 0, 0);
            // ducks (behind grass)
            for (const d of ducks) drawDuck(g, d);
            // dog behind grass (rising/holding/laughing, or diving into it)
            if (dog && (phase === 'dog' || phase === 'fail' || phase === 'over' || (dog.mode === 'jump' && dog.vy > 0))) drawDog(g, dog);
            g.drawImage(grassLayer, 0, 0);
            if (dog && phase === 'intro' && !(dog.mode === 'jump' && dog.vy > 0)) drawDog(g, dog);
          }
          for (const p of popups) text(g, p.v, p.x, p.y - p.t * 8, '#fcfcfc', 1, 'c');
          drawHUD(g);
          if (msg) drawMsg(g, msg.text);
          drawCross(g);
        },
        destroy() { }
      };

      function drawDuck(g, d) {
        if (d.state === 'down' || d.state === 'escaped' || d.state === 'gone') return;
        const S = DUCK_SPR[d.type];
        let img;
        if (d.state === 'shot') img = S.shot;
        else if (d.state === 'fall') img = (Math.floor(d.t * 8) % 2) ? S.fall : S.fallL;
        else {
          const f = Math.floor(d.anim) % 4;
          const up = d.state === 'flee' || (d.vy < 0 && Math.abs(d.vy) > Math.abs(d.vx) * 0.6);
          const left = d.vx < 0;
          img = up ? (left ? S.diaL[f] : S.dia[f]) : (left ? S.horL[f] : S.hor[f]);
        }
        g.drawImage(img, Math.round(d.x - img.width / 2), Math.round(d.y - img.height / 2));
      }

      function drawDog(g, d) {
        if (d.mode === 'walk' || d.mode === 'sniff') {
          const img = d.mode === 'sniff' ? (Math.floor(d.t * 6) % 2 ? dogSpr.walkA : dogSpr.walkB) : (Math.floor(d.step * 6) % 2 ? dogSpr.walkA : dogSpr.walkB);
          const bob = d.mode === 'sniff' && Math.floor(d.t * 8) % 2 ? 1 : 0;
          g.drawImage(img, Math.round(d.x), Math.round(186 - img.height + bob));
        } else if (d.mode === 'alert') {
          g.drawImage(dogSpr.alert, Math.round(d.x), 186 - dogSpr.alert.height);
          text(g, '!', Math.round(d.x) + 44, 186 - dogSpr.alert.height - 10, '#fcfcfc');
        } else if (d.mode === 'jump') {
          const img = d.vy < -40 ? dogSpr.leap : d.vy < 60 ? dogSpr.leapTop : dogSpr.dive;
          g.drawImage(img, Math.round(d.x + 25 - img.width / 2), Math.round(d.y - img.height / 2 - 14));
        } else if (d.mode === 'hold' || d.mode === 'laugh') {
          const base = 178, top = base - Math.round(d.y * 76);
          const laugh = d.mode === 'laugh';
          const img = laugh ? dogSpr.laugh : dogSpr.front;
          const bob = laugh ? (Math.floor(d.t * 7) % 2) : 0;
          const x = Math.round(d.x - img.width / 2);
          g.drawImage(img, x, top + bob);
          if (laugh) g.drawImage(dogSpr.paws, x + 3, top + 19 + bob);
          else {
            const S = DUCK_SPR[0];
            // held ducks (use actual caught duck colours)
            const caught = ducks.filter(q => q.hit);
            g.drawImage(dogSpr.arm, x + img.width - 6, top + 13);
            const d1 = DUCK_SPR[caught[0] ? caught[0].type : 0].fall;
            g.drawImage(d1, x + img.width - 6, top - 6);
            if (d.n > 1) {
              g.drawImage(dogSpr.armL, x - 2, top + 13);
              const d2 = DUCK_SPR[caught[1] ? caught[1].type : 0].fallL;
              g.drawImage(d2, x - 14, top - 6);
            }
            void S;
          }
        }
      }

      function box(g, x, y, w, h, border) {
        g.fillStyle = '#000';
        g.fillRect(x + 1, y, w - 2, h); g.fillRect(x, y + 1, w, h - 2);
        g.fillStyle = border;
        g.fillRect(x + 2, y + 1, w - 4, 1); g.fillRect(x + 2, y + h - 2, w - 4, 1);
        g.fillRect(x + 1, y + 2, 1, h - 4); g.fillRect(x + w - 2, y + 2, 1, h - 4);
      }

      function drawHUD(g) {
        // round
        box(g, 20, 191, 40, 12, C.hudGreen);
        text(g, 'R=' + round, 25, 194, C.hudGreen);
        // shots
        box(g, 20, 206, 34, 24, C.hudGreen);
        for (let i = 0; i < shots; i++) g.drawImage(BULLET, 26 + i * 8, 209);
        text(g, 'SHOT', 26, 220, C.hudBlue);
        // hit counter
        box(g, 60, 206, 132, 24, C.hudGreen);
        text(g, 'HIT', 64, 211, C.hudGreen);
        const per = game === 0 ? 1 : 2;
        for (let i = 0; i < 10; i++) {
          const cur = (phase === 'fly' || phase === 'shot') && i >= duckIdx && i < duckIdx + per;
          let img = hits[i] === 1 ? HUD_DUCK_R : HUD_DUCK;
          if (cur && Math.floor(api.time * 4) % 2) continue;
          if (phase === 'tally' && tallyDone && hits[i] === 1 && Math.floor(api.time * 6) % 2) continue;
          g.drawImage(img, 86 + i * 10, 209);
        }
        // required bar
        const req = required(round);
        for (let i = 0; i < 10; i++) { g.fillStyle = i < req ? C.hudBlue : '#000'; g.fillRect(86 + i * 10, 221, 8, 4); }
        // score
        box(g, 196, 206, 56, 24, C.hudGreen);
        text(g, String(score).padStart(6, '0'), 248, 210, '#fcfcfc', 1, 'r');
        text(g, 'SCORE', 248, 220, '#fcfcfc', 1, 'r');
      }

      function drawMsg(g, lines) {
        const w = Math.max(...lines.map(s => s.length)) * 6 + 14, h = lines.length * 11 + 8;
        const x = Math.round(128 - w / 2), y = 56;
        box(g, x, y, w, h, '#fcfcfc');
        lines.forEach((s, i) => text(g, s, 128, y + 6 + i * 11, '#fcfcfc', 1, 'c'));
      }

      function drawCross(g) {
        const x = Math.round(aimX), y = Math.round(aimY);
        g.fillStyle = '#000';
        g.fillRect(x - 7, y - 1, 5, 3); g.fillRect(x + 3, y - 1, 5, 3); g.fillRect(x - 1, y - 7, 3, 5); g.fillRect(x - 1, y + 3, 3, 5);
        g.fillStyle = '#fcfcfc';
        g.fillRect(x - 6, y, 4, 1); g.fillRect(x + 3, y, 4, 1); g.fillRect(x, y - 6, 1, 4); g.fillRect(x, y + 3, 1, 4);
        g.fillStyle = '#f83800'; g.fillRect(x, y, 1, 1);
      }

      function renderTitle(g) {
        g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
        // big two-line logo: blue letters with orange shadow and underline bars
        const drawBig = (s, y) => {
          text(g, s, 130, y + 2, '#fca044', 6, 'c');
          text(g, s, 128, y, '#3cbcfc', 6, 'c');
          g.fillStyle = '#fca044'; g.fillRect(36, y + 46, 184, 4);
        };
        drawBig('DUCK', 14);
        drawBig('HUNT', 70);
        const items = ['GAME A   1 DUCK', 'GAME B   2 DUCKS', 'GAME C   CLAY SHOOTING'];
        items.forEach((s, i) => {
          text(g, s, 40, 128 + i * 16, '#fca044');
          if (i === menu) {
            g.drawImage(HUD_DUCK_R, 26, 127 + i * 16);
          }
        });
        text(g, 'TOP SCORE = ' + hi, 128, 186, '#80d010', 1, 'c');
        text(g, '@1984 NINTENDO', 128, 206, '#fcfcfc', 1, 'c');
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(g, 'INSERT COIN', 128, 224, '#f83800', 1, 'c'); }
        else if (api.credits === 0) { if ((api.frame >> 4) & 1) text(g, 'INSERT COIN', 128, 224, '#fcfcfc', 1, 'c'); }
        else text(g, 'PUSH START', 128, 224, Math.floor(titleT * 2) % 2 === 0 ? '#fcfcfc' : '#fca044', 1, 'c');
        text(g, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 128, 196, '#fcfcfc', 1, 'c');
        drawCross(g);
      }
    }
  });
})();
