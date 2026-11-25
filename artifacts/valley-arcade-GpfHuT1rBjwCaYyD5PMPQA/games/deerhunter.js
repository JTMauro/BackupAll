// Deer Hunter (WizardWorks, 1997) — first-person pseudo-3D whitetail hunt.
// Mode-7 textured ground, painted panoramic hill layers, mip-mapped + fogged billboards with
// depth sorting, deer AI (wander / graze / alert / flee / come to call), wind & scent, grunt call,
// cover scent, 4x rifle scope, bolt-action rifle with recoil, GPS map with tracks and blood trail,
// trophy screen with antler score, autumn or snow season, time of day from dawn to dusk.
(function () {
  'use strict';
  const W = 320, H = 200;
  const TS = 7; // ground texels per metre
  const F = 240, ZOOM = 4, FZ = F * ZOOM, HZ = 92, CAMH = 1.6, FAR = 260;
  const TAU = Math.PI * 2;

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
    ')': [8, 4, 2, 2, 2, 4, 8], '>': [8, 4, 2, 1, 2, 4, 8], '<': [2, 4, 8, 16, 8, 4, 2], '*': [0, 4, 21, 14, 21, 4, 0],
    '&': [12, 18, 20, 8, 21, 18, 13], '#': [10, 31, 10, 10, 31, 10, 0], ' ': [0, 0, 0, 0, 0, 0, 0]
  };
  function text(ctx, s, x, y, col, sc, align, shadow) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'c') x = Math.round(x - w / 2); else if (align === 'r') x = x - w;
    if (shadow) text(ctx, s, x + sc, y + sc, shadow, sc);
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

  // ---------- utilities ----------
  function newCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; }
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function hash2(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function hexRGB(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgbStr(c) { return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function angDiff(a, b) { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
  // smooth value noise (2D, tiling period p)
  function makeNoise(seed, p) {
    const r = rng(seed), g = new Float32Array(p * p); for (let i = 0; i < g.length; i++) g[i] = r();
    return (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const a = g[((yi % p + p) % p) * p + ((xi % p + p) % p)], b = g[((yi % p + p) % p) * p + (((xi + 1) % p + p) % p)];
      const c = g[(((yi + 1) % p + p) % p) * p + ((xi % p + p) % p)], d = g[(((yi + 1) % p + p) % p) * p + (((xi + 1) % p + p) % p)];
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    };
  }
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function bayer(x, y) { return BAY[(y & 3) * 4 + (x & 3)] / 16; }

  // ---------- deer sprites (hand-laid pixel art, shaded; facing right) ----------
  const DEER_STAND = [
    '............................................oo..................',
    '...........................................oAaooo...............',
    '............................................oAacdo..............',
    '............................................oaAabco.............',
    '.............................................oaAacdo............',
    '..............................................oVAAAAo...........',
    '.............................................oaAAAaAao..........',
    '............................................oaAaAaWkacoo........',
    '...........................................oaAcabbbbaAaao.......',
    '.........................................ooaAAAcbccdaWabko......',
    '........................................oaaAaAWWdddddWVWko......',
    '.......................................oAaAAAAAVVoooooodo.......',
    '..............oooooo..................oaaAaAaAaao......o........',
    '.........oooooAAAAAAooooooooooooooooooAaAaAAAaabo...............',
    '........oabbAAAAAAAAAAAAAAAAAAAAaAAAAaaAaAAAaabo................',
    '........obabAAAAAAAAAaAAAAAAAAAaAAAAAaAaAAAAabao................',
    '........obbbAAAAaAaAaAAAAAAAAAAAAAAAbaaAaAaAbbo.................',
    '.......oababAAAAAaAAAAAAAAAAAAAAAAAAAaAAAAAbao..................',
    '.......oWWbAaAaAaAAAAAAAAAaAaAaAaAaAaAaAaAbbbo..................',
    '.......oWWaaAaAaAAAAAAAAAAAaAaaaAaAaaAAAAaabao..................',
    '.......oWWbabababaaAaaaAaaaababababaaAaAabbbbbo.................',
    '.......oWWababababaaabaaababababbbbbAaAaababbco.................',
    '........oocbbbcbcbbbbabbbbcbcbcccbccbababacbcco.................',
    '.........obcbcbcbcbcbcbcbcbcbccccccdabababbccdo.................',
    '..........ocdcdcdddVVVVVVVVVVVVVVVVVVbcbccdcdo..................',
    '...........ocdcddddddVVVVVVVVVVVVVVoodcccdcddo..................',
    '............oodddAbcdoooooVVVVooooo..obcdVVVo...................',
    '............obcdoabdo.....oooo.......oaccVdo....................',
    '............obddoacdo................obbdbdo....................',
    '............obcdobbdo................oAcdcdo....................',
    '............obdoaado.................oabdbdo....................',
    '............ocdoAbco.................oAccbco....................',
    '............ocdobcdo.................oabdbdo....................',
    '............oddoado..................oAbdbco....................',
    '...........obcdAbco..................oabdado....................',
    '...........oadoabdo..................oAbcbco....................',
    '...........ocdoado...................oabdodo....................',
    '...........oadoabo...................oAbooco....................',
    '...........obcoAco...................oaboodo....................',
    '............ocooado..................oAcobdo....................',
    '............ocdobdo..................oabobdo....................',
    '............obdoAco..................oAcobdo....................',
    '............oadoAbo..................oacoado....................',
    '.............ocoobo..................oAcobdo....................',
    '.............ocooao..................oacobdo....................',
    '.............obkoako.................oAkobko....................',
    '.............obkkAkko................oakkbkko...................',
    '..............oooooo..................oooooo....................'
  ];
  const DEER_WALK0 = [
    '............................................oo..................',
    '...........................................oAaooo...............',
    '............................................oAacdo..............',
    '............................................oaAabco.............',
    '.............................................oaAacdo............',
    '..............................................oVAAAAo...........',
    '.............................................oaAAAaAao..........',
    '............................................oaAaAaWkacoo........',
    '...........................................oaAcabbbbaAaao.......',
    '.........................................ooaAAAcbccdaWabko......',
    '........................................oaaAaAWWdddddWVWko......',
    '.......................................oAaAAAAAVVoooooodo.......',
    '..............oooooo..................oaaAaAaAaao......o........',
    '.........oooooAAAAAAooooooooooooooooooAaAaAAAaabo...............',
    '........oabbAAAAAAAAAAAAAAAAAAAAaAAAAaaAaAAAaabo................',
    '........obabAAAAAAAAAaAAAAAAAAAaAAAAAaAaAAAAabao................',
    '........obbbAAAAaAaAaAAAAAAAAAAAAAAAbaaAaAaAbbo.................',
    '.......oababAAAAAaAAAAAAAAAAAAAAAAAAAaAAAAAbao..................',
    '.......oWWbAaAaAaAAAAAAAAAaAaAaAaAaAaAaAaAbbbo..................',
    '.......oWWaaAaAaAAAAAAAAAAAaAaaaAaAaaAAAAaabao..................',
    '.......oWWbabababaaAaaaAaaaababababaaAaAabbbbbo.................',
    '.......oWWababababaaabaaababababbbbbAaAaababbco.................',
    '........oocbbbcbcbbbbabbbbcbcbcccbccbababacbcco.................',
    '.........obcbcbcbcbcbcbcbcbcbccccccdabababbccdo.................',
    '..........ocdcdcdddVVVVVVVVVVVVVVVVVVbcbccdcdo..................',
    '...........ocdcddddddVVVVVVVVVVVVVVoodcccdcddo..................',
    '............oodddAbcdoooooVVVVooooo..obbdVVVo...................',
    '.............obdoabdo.....oooo.......oAbcVdo....................',
    '.............oddoacdo................oabdcdo....................',
    '.............ocdAbco.................oAbcddo....................',
    '.............oddabdo..................oaccdo....................',
    '............obcdaco...................oabddo....................',
    '............obdAcdo...................oAcdo.....................',
    '............obcacdo...................oAbdo.....................',
    '............oadbdo....................oAbco.....................',
    '............obAcco.....................oaco.....................',
    '............obbco......................obco.....................',
    '............obado......................oAco.....................',
    '.............obco......................oabo.....................',
    '.............oado.....................obAbo.....................',
    '.............obcdo....................obdbo.....................',
    '.............oAddo....................ocdbo.....................',
    '.............obcdo....................ocdao.....................',
    '.............oAdado...................odoado....................',
    '.............oacodo...................odoado....................',
    '.............oAkocko.................oakoako....................',
    '.............oakkbkko................obkkAkko...................',
    '..............oooooo..................oooooo....................'
  ];
  const DEER_WALK1 = [
    '............................................oo..................',
    '...........................................oAaooo...............',
    '............................................oAacdo..............',
    '............................................oaAabco.............',
    '.............................................oaAacdo............',
    '..............................................oVAAAAo...........',
    '.............................................oaAAAaAao..........',
    '............................................oaAaAaWkacoo........',
    '...........................................oaAcabbbbaAaao.......',
    '.........................................ooaAAAcbccdaWabko......',
    '........................................oaaAaAWWdddddWVWko......',
    '.......................................oAaAAAAAVVoooooodo.......',
    '..............oooooo..................oaaAaAaAaao......o........',
    '.........oooooAAAAAAooooooooooooooooooAaAaAAAaabo...............',
    '........oabbAAAAAAAAAAAAAAAAAAAAaAAAAaaAaAAAaabo................',
    '........obabAAAAAAAAAaAAAAAAAAAaAAAAAaAaAAAAabao................',
    '........obbbAAAAaAaAaAAAAAAAAAAAAAAAbaaAaAaAbbo.................',
    '.......oababAAAAAaAAAAAAAAAAAAAAAAAAAaAAAAAbao..................',
    '.......oWWbAaAaAaAAAAAAAAAaAaAaAaAaAaAaAaAbbbo..................',
    '.......oWWaaAaAaAAAAAAAAAAAaAaaaAaAaaAAAAaabao..................',
    '.......oWWbabababaaAaaaAaaaababababaaAaAabbbbbo.................',
    '.......oWWababababaaabaaababababbbbbAaAaababbco.................',
    '........oocbbbcbcbbbbabbbbcbcbcccbccbababacbcco.................',
    '.........obcbcbcbcbcbcbcbcbcbccccccdabababbccdo.................',
    '..........ocdcdcdddVVVVVVVVVVVVVVVVVVbcbccdcdo..................',
    '...........ocdcddddddVVVVVVVVVVVVVVoodcccdcddo..................',
    '............oodddAbcdoooooVVVVooooo..obcdVVVo...................',
    '............obcdoabdo.....oooo.......oaccVdo....................',
    '............obddoacdo................oabdcdo....................',
    '............obcdAbco.................oAbccdo....................',
    '............obddabdo.................oabdbdo....................',
    '............obdoAcdo.................oAbccdo....................',
    '............ocdobco..................oabdcdo....................',
    '............ocdAbdo...................obccdo....................',
    '............ocdAcdo...................oadbdo....................',
    '............ocdabo....................oabcdo....................',
    '............odoado....................oadcdo....................',
    '...........oaddbco....................oaccdo....................',
    '............obdado....................oadcdo....................',
    '............obdabo....................oaccdo....................',
    '............oadAco....................oadco.....................',
    '.............obAbo....................oacdo.....................',
    '.............obdbo....................oaddo.....................',
    '.............oadao....................oacdo.....................',
    '..............ocbdo...................oAkdo.....................',
    '..............obAko...................oakko.....................',
    '..............obakko...................obkko....................',
    '...............oooo.....................ooo.....................'
  ];
  const DEER_WALK2 = [
    '............................................oo..................',
    '...........................................oAaooo...............',
    '............................................oAacdo..............',
    '............................................oaAabco.............',
    '.............................................oaAacdo............',
    '..............................................oVAAAAo...........',
    '.............................................oaAAAaAao..........',
    '............................................oaAaAaWkacoo........',
    '...........................................oaAcabbbbaAaao.......',
    '.........................................ooaAAAcbccdaWabko......',
    '........................................oaaAaAWWdddddWVWko......',
    '.......................................oAaAAAAAVVoooooodo.......',
    '..............oooooo..................oaaAaAaAaao......o........',
    '.........oooooAAAAAAooooooooooooooooooAaAaAAAaabo...............',
    '........oabbAAAAAAAAAAAAAAAAAAAAaAAAAaaAaAAAaabo................',
    '........obabAAAAAAAAAaAAAAAAAAAaAAAAAaAaAAAAabao................',
    '........obbbAAAAaAaAaAAAAAAAAAAAAAAAbaaAaAaAbbo.................',
    '.......oababAAAAAaAAAAAAAAAAAAAAAAAAAaAAAAAbao..................',
    '.......oWWbAaAaAaAAAAAAAAAaAaAaAaAaAaAaAaAbbbo..................',
    '.......oWWaaAaAaAAAAAAAAAAAaAaaaAaAaaAAAAaabao..................',
    '.......oWWbabababaaAaaaAaaaababababaaAaAabbbbbo.................',
    '.......oWWababababaaabaaababababbbbbAaAaababbco.................',
    '........oocbbbcbcbbbbabbbbcbcbcccbccbababacbcco.................',
    '.........obcbcbcbcbcbcbcbcbcbccccccdabababbccdo.................',
    '..........ocdcdcdddVVVVVVVVVVVVVVVVVVbcbccdcdo..................',
    '...........ocdcddddddVVVVVVVVVVVVVVoodcccdcddo..................',
    '............oadddAbcdoooooVVVVooooo.oAbcdVVVo...................',
    '............obcdoAado.....oooo......oAacVVcdo...................',
    '............obddoAcco...............oAbcobddo...................',
    '............ocdooabdo...............oaadobbdo...................',
    '...........obcdooacdo...............oAcdoocdo...................',
    '...........oaddooabo................oabdoobdo...................',
    '...........ocdo.oado................oacdoobdo...................',
    '...........ocdo.obco................oabo.oaddo..................',
    '..........oaddooabdo................oaco..ocdo..................',
    '..........obdo.oAbdo................oabo..ocdo..................',
    '..........obdo.oaco.................oado..obdo..................',
    '..........ocdo.oAbco................obco..obdo..................',
    '..........ocdo..oado...............oAbdo..oado..................',
    '..........ocdo..oAbo...............oAco...obco..................',
    '..........obdo...obco..............obco....odo..................',
    '..........ocdo...oAco..............oado....oco..................',
    '..........obdo....obo..............obdo....oco..................',
    '..........obdo....oabo.............obo.....obo..................',
    '..........obdo.....oco.............oco.....ocdo.................',
    '..........obko.....oAko...........oAko.....obko.................',
    '..........obkko....oakko..........oAkko....obkko................',
    '...........ooo......ooo............ooo......ooo.................'
  ];
  const DEER_WALK3 = [
    '............................................oo..................',
    '...........................................oAaooo...............',
    '............................................oAacdo..............',
    '............................................oaAabco.............',
    '.............................................oaAacdo............',
    '..............................................oVAAAAo...........',
    '.............................................oaAAAaAao..........',
    '............................................oaAaAaWkacoo........',
    '...........................................oaAcabbbbaAaao.......',
    '.........................................ooaAAAcbccdaWabko......',
    '........................................oaaAaAWWdddddWVWko......',
    '.......................................oAaAAAAAVVoooooodo.......',
    '..............oooooo..................oaaAaAaAaao......o........',
    '.........oooooAAAAAAooooooooooooooooooAaAaAAAaabo...............',
    '........oabbAAAAAAAAAAAAAAAAAAAAaAAAAaaAaAAAaabo................',
    '........obabAAAAAAAAAaAAAAAAAAAaAAAAAaAaAAAAabao................',
    '........obbbAAAAaAaAaAAAAAAAAAAAAAAAbaaAaAaAbbo.................',
    '.......oababAAAAAaAAAAAAAAAAAAAAAAAAAaAAAAAbao..................',
    '.......oWWbAaAaAaAAAAAAAAAaAaAaAaAaAaAaAaAbbbo..................',
    '.......oWWaaAaAaAAAAAAAAAAAaAaaaAaAaaAAAAaabao..................',
    '.......oWWbabababaaAaaaAaaaababababaaAaAabbbbbo.................',
    '.......oWWababababaaabaaababababbbbbAaAaababbco.................',
    '........oocbbbcbcbbbbabbbbcbcbcccbccbababacbcco.................',
    '.........obcbcbcbcbcbcbcbcbcbccccccdabababbccdo.................',
    '..........ocdcdcdddVVVVVVVVVVVVVVVVVVbcbccdcdo..................',
    '...........ocdcddddddVVVVVVVVVVVVVVoodcccdcddo..................',
    '............oodddAbcdoooooVVVVooooo..obcdVVVo...................',
    '............obcdoaado.....oooo.......oacVVdo....................',
    '............obddoacdo................obcobdo....................',
    '............ocdooabdo................oacobcdo...................',
    '............obdooado.................obcoaddo...................',
    '............ocdoAbco.................oacobcdo...................',
    '...........obcdoabdo.................obcooddo...................',
    '...........obdooAcdo.................oacoobdo...................',
    '...........ocdoobco..................obcoocdo...................',
    '...........obdooado..................oacoobdo...................',
    '...........oddoAcdo..................obcoocdo...................',
    '...........ocdoAado..................oadoobdo...................',
    '...........ocdoobco..................obdoocdo...................',
    '...........oadooAco..................oadoobdo...................',
    '...........obdooabo..................oco.ocdo...................',
    '...........oado.obco.................obo.obdo...................',
    '............oco.oAdo................oAco.ocdo...................',
    '............oco.oAbo................oAco.obdo...................',
    '............oco..obo................oAko.obdo...................',
    '............obko.oAko...............oakkooako...................',
    '............obkkooakko...............ooo.obkko..................',
    '.............ooo..ooo.....................ooo...................'
  ];
  const DEER_GRAZE = [
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '..............oooooo............................................',
    '.........oooooAAAAAAooooooooooooooooooooo.......................',
    '........oabbAAAAAAAAAAAAAAAAAAAAaAAAAAAAao......................',
    '........obabAAAAAAAAAaAAAAAAAAAaAAAAAAAAAao.....................',
    '........obbbAAAAaAaAaAAAAAAAAAAAAAAAaAaAAAbo....................',
    '.......oababAAAAAaAAAAAAAAAAAAAAAAAAAaAAAAAAo...................',
    '.......oWWbAaAaAaAAAAAAAAAaAaAaAaAaAaAAAAAaabo..................',
    '.......oWWaaAaAaAAAAAAAAAAAaAaaaAaAaaAAAAAAaAo..................',
    '.......oWWbabababaaAaaaAaaaababababaaAaAaAaAbbo.................',
    '.......oWWababababaaabaaababababbbbbAbaAAAAaAao.................',
    '........oocbbbcbcbbbbabbbbcbcbcccbccbabAAAaAaao.................',
    '.........obcbcbcbcbcbcbcbcbcbccccccdababAAAaAaao................',
    '..........ocdcdcdddVVVVVVVVVVVVVVVVVVbbaaAAAaaao................',
    '...........ocdcddddddVVVVVVVVVVVVVVoodabaaAAAaAo................',
    '............oodddAbcdoooooVVVVooooo..obcdAaAaAaao...............',
    '............obcdoabdo.....oooo.......oaccaAAAAAao...............',
    '............obddoacdo................obbdaaAaAaAo...............',
    '............obcdobbdo................oAcdbaAAAAaAo..............',
    '............obdoaado.................oabdabAaAaAao..............',
    '............ocdoAbco.................oAccbabAAAAAao.............',
    '............ocdobcdo.................oabdbdaaAAAaao.............',
    '............oddoado..................oAbdbcoaaAAAao.............',
    '...........obcdAbco..................oabdadobAaaAAao............',
    '...........oadoabdo..................oAbcbcooWAaAaAco...........',
    '...........ocdoado...................oabdodooVVVaAAAao..........',
    '...........oadoabo...................oAbooco.oaAAAAaAo..........',
    '...........obcoAco...................oaboodo..ooaAaabbo.........',
    '............ocooado..................oAcobdo...oabaWkco.........',
    '............ocdobdo..................oabobdo....obccado.........',
    '............obdoAco..................oAcobdo....odcAAao.........',
    '............oadoAbo..................oacoado.....ooWWaco........',
    '.............ocoobo..................oAcobdo......oWWbco........',
    '.............ocooao..................oacobdo.......oVkdo........',
    '.............obkoako.................oAkobko.......odkdo........',
    '.............obkkAkko................oakkbkko.......ooo.........',
    '..............oooooo..................oooooo....................'
  ];
  const DEER_ALERT = [
    '............................................oaaAdco.............',
    '............................................ooVaAAo.............',
    '...........................................oAAaAAAbooo..........',
    '..........................................oaAaAaWkAAAAo.........',
    '..........................................oAcbbbcbaabako........',
    '.........................................oAAAcbccdbWWWko........',
    '........................................oAaAAWddddoodVo.........',
    '........................................oaAAAVVooo..oo..........',
    '.......................................oaAaAaAbo................',
    '......................................oaAaAAAbao................',
    '.....................................obaaAaAaao.................',
    '.....................................oAaAAAAabo.................',
    '..............oooooo................oaaAaAaAbbo.................',
    '.........oooooAAAAAAooooooooooooooooaaAAAAAaabo.................',
    '........oabbAAAAAAAAAAAAAAAAAAAAaAAaaAaAAAaabo..................',
    '........obabAAAAAAAAAaAAAAAAAAAaAAAaAaAAAAabao..................',
    '........obbbAAAAaAaAaAAAAAAAAAAAAAAAaAaAaAbbco..................',
    '.......oababAAAAAaAAAAAAAAAAAAAAAAAAAaAAAbabo...................',
    '.......oWWbAaAaAaAAAAAAAAAaAaAaAaAaAaAAAaabbao..................',
    '.......oWWaaAaAaAAAAAAAAAAAaAaaaAaAaaAAAAAabao..................',
    '.......oWWbabababaaAaaaAaaaababababaaAaAaaaabbo.................',
    '.......oWWababababaaabaaababababbbbbAaAaababbco.................',
    '........oocbbbcbcbbbbabbbbcbcbcccbccbababacbcco.................',
    '.........obcbcbcbcbcbcbcbcbcbccccccdabababbccdo.................',
    '..........ocdcdcdddVVVVVVVVVVVVVVVVVVbcbccdcdo..................',
    '...........ocdcddddddVVVVVVVVVVVVVVoodcccdcddo..................',
    '............oodddAbcdoooooVVVVooooo..obcdVVVo...................',
    '............obcdoabdo.....oooo.......oaccVdo....................',
    '............obddoacdo................obbdbdo....................',
    '............obcdobbdo................oAcdcdo....................',
    '............obdoaado.................oabdbdo....................',
    '............ocdoAbco.................oAccbco....................',
    '............ocdobcdo.................oabdbdo....................',
    '............oddoado..................oAbdbco....................',
    '...........obcdAbco..................oabdado....................',
    '...........oadoabdo..................oAbcbco....................',
    '...........ocdoado...................oabdodo....................',
    '...........oadoabo...................oAbooco....................',
    '...........obcoAco...................oaboodo....................',
    '............ocooado..................oAcobdo....................',
    '............ocdobdo..................oabobdo....................',
    '............obdoAco..................oAcobdo....................',
    '............oadoAbo..................oacoado....................',
    '.............ocoobo..................oAcobdo....................',
    '.............ocooao..................oacobdo....................',
    '.............obkoako.................oAkobko....................',
    '.............obkkAkko................oakkbkko...................',
    '..............oooooo..................oooooo....................'
  ];
  const DEER_RUN0 = [
    '................................................................',
    '.............................................o..................',
    '............................................oAooo...............',
    '......o.....................................oaAaboooo...........',
    '.....oWo.....................................ooAaaAAAoo.........',
    '....oWWWo.....................................oVAaAAAaAo........',
    '...oWWWWo...................................ooaAaAaaWkboo.......',
    '....oWWWWo................................ooAaAAAbababAAAo......',
    '....oWWWWo..............................ooaAaAaAWcccdaaabao.....',
    '.....oWWWo....oooooo..................ooaaAaAAAAWWWdddWWWcko....',
    '.....oWWWWo.ooAAAAAAoooooooooooooooooobaaAaAAAaAaVoooooVVVko....',
    '......oWWWooAAAAAAAAAaAAAAAAAAAAAAAAAaAaAAAAAAAaao.....oooo.....',
    '.......oWWWAAAAAAAAAaabAaAAAAAaaAAAAAAaAaAAAaAbao...............',
    '.......oWWAAAAAAAAAaAAAAAAAAAAAAAAAAAAAAAAAAAbabo...............',
    '........ooaAAAaAaAaAAAAAAAAAAAAAAAaAaAAAAAaAbabo................',
    '.........oAaAAAaAAAAAAAAAAAAAAAaAAAaAAAAAAAbabo.................',
    '.........oaAaaaaaAaAaAaAaAaAaababababAAAaabbco..................',
    '.........oaaababAaAaAaAaAaAaababababAAAAAaabaco.................',
    '.........obababbbabababababababbbbcbaAaaaabbcco.................',
    '.........obbabbcabababababbbbbbcbcbcaaababbcbco.................',
    '.........ocbccccdccbcbcbccccdcdcdcdccbbbcbccddo.................',
    '..........occdcccdcVVVVVVVVVVVVVVVVVVcbcbccddo..................',
    '...........odddaccdddVVVVVVVVVVVVVVoocdAbcdddo..................',
    '..........obcdAbcdVVooooooVVVVooooo..oVAAbcVdo..................',
    '..........ocddbcdooo......oooo........ooaacbddo.................',
    '.........obddabdo.......................oaadbdo.................',
    '........obddabdo.........................oabdbdo................',
    '........oddoacco.........................oAabbbdo...............',
    '.......oddoAcdo...........................oAbcbbdo..............',
    '.....oobddAbdo.............................oAbcbcdoo............',
    '....oadddobco...............................oAcobbddo...........',
    '..oobddooabdo...............................oAadooabcoo.........',
    '.ocddooobcdo.................................oaadooobbdoo.......',
    'okdoo.obcdo...................................oaAco.oobcko......',
    'bkko.ocdoo.....................................ooAco..obkko.....',
    'ooo.occo.........................................oAboo.ooo......',
    '...okco...........................................oAbko.........',
    '..oakko............................................oAkko........',
    '...ooo..............................................ooo.........',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................'
  ];
  const DEER_RUN1 = [
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '.............................................o..................',
    '............................................oaooo...............',
    '......o.....................................oAaadoooo...........',
    '.....oWo.....................................ooaAaAAAoo.........',
    '....oWWWo.....................................oVaaAAaAbo........',
    '...oWWWWo...................................ooAaaaAaWkaoo.......',
    '....oWWWWo................................ooaAaAAabbbbaAao......',
    '....oWWWWo..............................ooAaAAAAWcbcbaAaAbo.....',
    '.....oWWWo....oooooo..................oobaaAaAAAWWVdddWWWcko....',
    '.....oWWWWo.ooAAAAAAooooooooooooooooooaaAaAAAAAAAVoooooVVVko....',
    '......oWWWooAAAAAAAAAAAAAAAAAAAAaAAAAabaaAaAAAaAbo.....oooo.....',
    '.......oWWWAAAAAAAAAAaAAAAAAAAAaAAAAAAAaAAAAAAabo...............',
    '.......oWWAAAAAAaAaAaAAAAAAAAAAAAAAAaAaAaAAAaabbo...............',
    '........ooAAAAAAAaAAAAAAAAAAAAAAAAAAAaAAAAAaabao................',
    '.........oaAaAaAaAAAAAAAAAaAaAaAaAaAaAAAAAaabbo.................',
    '.........oAaAaAaAAAAAAAAAAAaAaaaAaAaaAAAAaabao..................',
    '.........obabababaaAaaaAaaaababababaaAaAaabbbbo.................',
    '.........oababababaaabaaababababbbbbAaAaababbco.................',
    '.........ocbbbcbcbbbbabbbbcbcbcccbccbababacbcco.................',
    '.........obcbcbcbcbcbcbcbcbcbccccccdabababbccdo.................',
    '..........ocdcdcdddVVVVVVVVVVVVVVVVVVbcbccdcdo..................',
    '...........ocdcddddddVVVVVVVVVVVVVVoodcccdcddo..................',
    '............oodddVVVooooooVVVVooooo..oVVVVVVo...................',
    '..............oooooo......oooo........ooVVoo....................',
    '..............oooooo..................oooooo....................',
    '.............oaddaado................oAbcbcdo...................',
    '..............obdAabdo...............oabdaddo...................',
    '..............obadAabo................oabdaddo..................',
    '...............obbdAbco...............oAbcbcdo..................',
    '................obbdAbco...............oacobco..................',
    '.................obcAAco...............oabdocdo.................',
    '..................obcAado..............oAacocdo.................',
    '...................obdabdo.............oabdcdo..................',
    '....................obdAbo.............obdado...................',
    '.....................odoaco...........oadoddo...................',
    '.....................oadAbdo.........oadocdo....................',
    '......................obdAco........oadooko.....................',
    '.......................obkAco.......okcoakko....................',
    '.......................obkkako.....oakkoooo.....................',
    '........................oooakko.....ooo.........................',
    '...........................ooo..................................',
    '................................................................',
    '................................................................',
    '................................................................'
  ];
  const DEER_RUN2 = [
    '................................................................',
    '................................................................',
    '.............................................o..................',
    '............................................oaooo...............',
    '......o.....................................oaaAdoooo...........',
    '.....oWo.....................................ooaAaAAAoo.........',
    '....oWWWo.....................................oVaAAAaAbo........',
    '...oWWWWo...................................ooAaAaAaWkaoo.......',
    '....oWWWWo................................ooaaaAabbbcbaAao......',
    '....oWWWWo..............................ooAaAaAAWcbccaAaabo.....',
    '.....oWWWo....oooooo..................ooaaaAaAaAWWVdddWWWbko....',
    '.....oWWWWo.ooAAAAAAooooooooooooooooooaaAaAAAAAAAVoooooVVVko....',
    '......oWWWooAAAAAAAAaAAAAAAAAAAAaAAAAaaaaAaAaAaAbo.....oooo.....',
    '.......oWWWAAAAAAAAAAaAAAAAAAAAaAAAAAAAaAAAAAaabo...............',
    '.......oWWAAAAAAAAaAaAAAAAAAAAAAAAAAAAaAaAaAaabbo...............',
    '........ooAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAaabao................',
    '.........oaAaAaAaAAAAAAAAAAAaAaAaAaAaAAAaAaabbo.................',
    '.........oAaAaAaAaAAAAAAAaAaAaaaAaAaaAAAAbabbo..................',
    '.........obababaaAaAaAaaaabababababbaAaAaAbbbbo.................',
    '.........oabababaaaaAaabaaababababbbAaAaAaabbco.................',
    '.........ocbcbcbcbbbbbbbcbcbcbccccccbababbcbcco.................',
    '.........obcbcbcccbcbcbcbcbcbccccdcdbbabbcbccdo.................',
    '..........ocdcdcdcdVVVVVVVVVVVVVVVVVVbcbccdcdo..................',
    '...........ocdcdcddddVVVVVVVVVVVVVVooccdcdcddo..................',
    '............oodddVVVooooooVVVVooooo..oVVVVVVo...................',
    '............oooooooo......oooo........ooVVoo....................',
    '...........obcdaccdo.................oabdbdo....................',
    '...........obdAbbdo..................oAbbbcdo...................',
    '..........obddabdo....................oAcdddo...................',
    '.........oaddaado.....................oAacbdo...................',
    '.........ocddaddo......................oabddo...................',
    '........obcdAbdo.......................oAacdo...................',
    '........ocdobdo.........................oAcddo..................',
    '.......obdoabdo.........................oAacdo..................',
    '.......oddobdo...........................oabdo..................',
    '......ocdoAco.............................oaao..................',
    '......oddocdo..............................oaco.................',
    '.....obdoabo...............................obabo................',
    '.....odooado...............................obdaco...............',
    '....ocdoAco.................................odAako..............',
    '....okoocdo.................................ocoAkko.............',
    '...oakkAko..................................obkooo..............',
    '....oooAkko.................................obkko...............',
    '.......ooo...................................ooo................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................'
  ];
  const DEER_ANCHORS = {"STAND": [49, 5], "WALK0": [49, 5], "WALK1": [49, 5], "WALK2": [49, 5], "WALK3": [49, 5], "GRAZE": [50, 36], "ALERT": [47, 1], "RUN0": [51, 4], "RUN1": [51, 7], "RUN2": [51, 5]};
  const DEER_DEAD = [
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '..............oooooooo..............oooooo......................',
    '..........oo.oAAAAAAAAooooooooooooooAAAAAAo.....................',
    '.........obboAAAAAAAaAAAAAAAAAAAAAaAAAbabAaoo...oo..............',
    '........obabAAAAAAAAAAAAAAAAAAAAAaAAAAAbababaoooAaooo...........',
    '........oabbaAaAaAaAAAAAAAaAaAaAaAaAaAabbabbbabboAaaao..........',
    '.......oababAaAaAaAaAAAaAaAaAaAaAaAaAaAaabababababaoAoooo.......',
    '.......obboabababaaabaaababababababababbcbcbcbcbcbcbAAAAao......',
    '........ooobababbbabababababbbbbbbabbbbcbcbbbcbbbcbAAAAakbooo...',
    '...oooooobddcbcbcbcbcbcbcbcbcbcccccccbdcdbcbcbcbcbcaaababAaAao..',
    '..okdddddddoocaccdddcdccbccdcdcdcdddcdcdcAAaAaAaAbccbbbcbaabaco.',
    '.obkkkoobddcdddcVVVVVVVVVVVVVVVVVVVVddddddoooooooAaAaAaAaakcddko',
    '..ooAkkdcooooooooooooooooooooooooooooooooo.......ooooooooakkooo.',
    '....ooooo................................................ooo....',
    '................................................................'
  ];
  const DEAD_ANCHOR = [54, 37];

  const COATS = [
    { o: '#2a180c', d: '#46281a', c: '#6a4024', b: '#8c5a32', a: '#b07a46', A: '#d4a46a', W: '#ece8e0', V: '#b8b0a4', k: '#141010' },
    { o: '#241a14', d: '#3e3028', c: '#5a463a', b: '#76604e', a: '#927a64', A: '#ae967c', W: '#f0eeea', V: '#bcb6ae', k: '#141010' }
  ];
  const DEER_FRAMES = { STAND: DEER_STAND, WALK0: DEER_WALK0, WALK1: DEER_WALK1, WALK2: DEER_WALK2, WALK3: DEER_WALK3, GRAZE: DEER_GRAZE, ALERT: DEER_ALERT, RUN0: DEER_RUN0, RUN1: DEER_RUN1, RUN2: DEER_RUN2, DEAD: DEER_DEAD };
  DEER_ANCHORS.DEAD = DEAD_ANCHOR;
  const DPAD = 12, DW = 64, DH = 48 + DPAD; // padded canvas so antlers fit
  function antlers(g, ax, ay, pts, rot) {
    // whitetail rack seen from the side: beams sweep back then forward, tines rise off the top
    const per = pts / 2, ca = Math.cos(rot || 0), sa = Math.sin(rot || 0);
    const R = (x, y) => [ax + x * ca - y * sa, ay + x * sa + y * ca];
    const span = 3 + per * 1.3, rise = 4 + per * 1.1;
    const dot = (p, col) => { g.fillStyle = col; g.fillRect(Math.round(p[0]), Math.round(p[1]), 1, 1); };
    for (const side of [0, 1]) {
      const ox = side ? 0 : 2.5, oy = side ? 0 : -0.5;
      const light = side ? '#eadfc2' : '#b9a684', mid = side ? '#c8b48c' : '#9a8664', dark = side ? '#7a6446' : '#5a4a32';
      const bez = t => {
        const u = 1 - t, x0 = ox, y0 = oy, x1 = -span * 1.1 + ox, y1 = -rise * 0.55 + oy, x2 = span * 0.9 + ox, y2 = -rise + oy;
        return [u * u * x0 + 2 * u * t * x1 + t * t * x2, u * u * y0 + 2 * u * t * y1 + t * t * y2];
      };
      for (let i = 0; i <= 48; i++) {
        const t = i / 48, [x, y] = bez(t);
        dot(R(x, y + 1), dark); dot(R(x, y), t < 0.5 ? mid : light);
        if (t < 0.3) dot(R(x - 1, y), mid);
      }
      dot(R(ox, oy + 1), '#5a4a32'); dot(R(ox + 1, oy + 1), '#5a4a32'); // burr
      // brow tine
      const [bx, by] = bez(0.1);
      for (let j = 1; j <= 2; j++) dot(R(bx + j * 0.3, by - j), light);
      // typical tines
      for (let k = 1; k < per; k++) {
        const t = 0.42 + (k - 1) / Math.max(1, per - 1) * 0.48, [tx, ty] = bez(t);
        const len = Math.round(2 + per * 0.55 + (k === 1 || k === 2 ? 1.5 : 0) - (k === per - 1 ? 1 : 0));
        for (let j = 1; j <= len; j++) dot(R(tx - j * 0.18, ty - j), j === len ? '#f6eedc' : light);
        dot(R(tx + 1, ty - 1), mid);
      }
    }
  }
  function buildDeerFrame(rows, coat, pts, anchor) {
    const c = newCanvas(DW, DH), g = c.getContext('2d');
    for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
      const col = coat[rows[y][x]]; if (col) { g.fillStyle = col; g.fillRect(x, y + DPAD, 1, 1); }
    }
    if (pts) antlers(g, anchor[0], anchor[1] + DPAD, pts, rows === DEER_DEAD ? 1.25 : rows === DEER_GRAZE ? 0.5 : 0);
    return c;
  }
  function flipC(src) { const c = newCanvas(src.width, src.height), g = c.getContext('2d'); g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); return c; }

  // ---------- sprite LOD: lazily-built mip levels and fog variants ----------
  let HAZE = [200, 210, 218];
  function lod(base, targetH, fog) {
    let mi = 0; while (mi < 4 && base.height / (1 << (mi + 1)) >= targetH) mi++;
    const fl = fog < 0.12 ? 0 : fog < 0.35 ? 1 : fog < 0.6 ? 2 : 3;
    if (!base._lod) base._lod = {};
    const key = mi * 4 + fl;
    let c = base._lod[key];
    if (!c) {
      let src = base;
      if (mi > 0) {
        src = newCanvas(Math.ceil(base.width / (1 << mi)), Math.ceil(base.height / (1 << mi)));
        const g = src.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
        g.drawImage(base, 0, 0, src.width, src.height);
      }
      if (fl === 0) c = src;
      else {
        c = newCanvas(src.width, src.height); const g = c.getContext('2d');
        g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-atop';
        g.fillStyle = 'rgba(' + HAZE[0] + ',' + HAZE[1] + ',' + HAZE[2] + ',' + [0, 0.28, 0.52, 0.76][fl] + ')';
        g.fillRect(0, 0, c.width, c.height);
      }
      base._lod[key] = c;
    }
    return c;
  }

  // ---------- painted scenery generators ----------
  function shadeCircle(g, cx, cy, r, cols, rnd, light) {
    // dithered, lit clump; cols dark..light
    const r2 = r * r;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d2 = x * x + y * y; if (d2 > r2) continue;
      // ragged edge
      if (d2 > r2 * 0.72 && rnd() < 0.45) continue;
      const nx = x / r, ny = y / r, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      let l = clamp(0.5 + (-nx * 0.5 - ny * 0.7 + nz * 0.3) * 0.75 * light, 0, 0.999) + (rnd() - 0.5) * 0.25;
      const k = clamp(Math.floor(l * cols.length), 0, cols.length - 1);
      g.fillStyle = cols[k]; g.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
    }
  }
  function makePine(seed, snow, h) {
    const r = rng(seed), w = Math.round(h * 0.62), c = newCanvas(w, h), g = c.getContext('2d');
    const cx = w / 2;
    // trunk
    for (let y = Math.round(h * 0.25); y < h; y++) {
      const tw = Math.max(1, Math.round(h * 0.016 + (y / h) * h * 0.014));
      for (let x = -tw; x <= tw; x++) { g.fillStyle = x < -tw / 3 ? '#6a4a34' : x > tw / 3 ? '#2e2018' : '#4a3424'; g.fillRect(Math.round(cx + x), y, 1, 1); }
    }
    const greens = snow ? ['#0e1c14', '#1a2e20', '#2a4430', '#3c5a3e'] : ['#0e1e12', '#18301c', '#25462a', '#36603a', '#4c7a48'];
    const tiers = 13 + Math.floor(r() * 5);
    for (let i = 0; i < tiers; i++) {
      const t = i / (tiers - 1), y = h * 0.05 + t * h * 0.82;
      const hw = (h * 0.05 + t * h * 0.27) * (0.85 + r() * 0.3);
      const thick = 3 + t * h * 0.05;
      for (let x = -hw; x <= hw; x += 1) {
        const e = Math.abs(x) / hw, droop = e * e * thick * 0.9, top = y + droop - thick * (1 - e * 0.6);
        const bot = y + droop + thick * 0.35;
        for (let yy = Math.round(top); yy <= Math.round(bot); yy++) {
          if ((e > 0.85 || yy === Math.round(top)) && r() < 0.35) continue;
          const lv = clamp(0.55 - x / hw * 0.35 - (yy - top) / (bot - top + 1) * 0.5 + (r() - 0.5) * 0.35, 0, 0.999);
          g.fillStyle = greens[Math.floor(lv * greens.length)];
          g.fillRect(Math.round(cx + x), yy, 1, 1);
        }
        if (snow && r() < 0.85 && e < 0.95) {
          const sy = Math.round(top);
          g.fillStyle = x < 0 ? '#f4f8fc' : '#c8d4e4'; g.fillRect(Math.round(cx + x), sy, 1, 1);
          if (r() < 0.5) { g.fillStyle = '#dde6f0'; g.fillRect(Math.round(cx + x), sy + 1, 1, 1); }
        }
      }
    }
    // tip
    g.fillStyle = greens[1]; g.fillRect(Math.round(cx), 0, 1, Math.round(h * 0.06));
    return c;
  }
  function makeDeciduous(seed, season, h, birch) {
    const r = rng(seed), w = Math.round(h * 0.9), c = newCanvas(w, h), g = c.getContext('2d');
    const cx = w / 2;
    const bark = birch ? ['#5a5450', '#c8c4b8', '#eae6dc'] : ['#2a2018', '#4a3a2c', '#6a5644'];
    const ends = [];
    const branch = (x, y, a, len, wd, depth) => {
      const steps = Math.ceil(len);
      for (let i = 0; i < steps; i++) {
        const xx = x + Math.sin(a) * i, yy = y - Math.cos(a) * i, ww = Math.max(1, wd * (1 - i / steps * 0.35));
        for (let k = -ww / 2; k <= ww / 2; k += 1) {
          const sh = k < -ww / 6 ? 2 : k > ww / 6 ? 0 : 1;
          g.fillStyle = bark[sh]; g.fillRect(Math.round(xx + k), Math.round(yy), 1, 1);
        }
        if (birch && r() < 0.12) { g.fillStyle = '#1a1814'; g.fillRect(Math.round(xx - ww / 2 + r() * ww), Math.round(yy), 2, 1); }
        if (season === 1 && r() < 0.7 && Math.abs(Math.sin(a)) > 0.3) { g.fillStyle = '#f0f4fa'; g.fillRect(Math.round(xx), Math.round(yy - ww / 2) - 1, 1, 1); }
      }
      const ex = x + Math.sin(a) * len, ey = y - Math.cos(a) * len;
      if (depth <= 0 || len < 4) { ends.push([ex, ey]); return; }
      const n = 2 + (r() < 0.4 ? 1 : 0);
      for (let i = 0; i < n; i++) branch(ex, ey, a + (r() - 0.5) * 1.3 + (i - (n - 1) / 2) * 0.5, len * (0.62 + r() * 0.15), wd * 0.62, depth - 1);
    };
    branch(cx, h, (r() - 0.5) * 0.1, h * 0.36, Math.max(3, h * (birch ? 0.05 : 0.075)), 5);
    if (season === 0) {
      const palettes = [
        ['#5a1c0c', '#8c2a12', '#c0401a', '#e0662a', '#f0904a'],
        ['#6a3a08', '#a05e10', '#d0901c', '#ecbc3a', '#f8dc70'],
        ['#4a1a10', '#7a2a18', '#a8401e', '#cc6a2c', '#e0a050'],
        ['#2a3214', '#465222', '#6a7230', '#98923e', '#c0b058']
      ];
      const pal = birch ? palettes[1] : palettes[Math.floor(r() * palettes.length)];
      const clumps = ends.slice();
      clumps.sort((a, b) => a[1] - b[1]);
      for (const [x, y] of clumps) shadeCircle(g, x, y, Math.max(3, Math.round(h * (0.05 + r() * 0.04))), pal, r, 1);
      for (let i = 0; i < clumps.length / 2; i++) { const [x, y] = clumps[Math.floor(r() * clumps.length)]; shadeCircle(g, x + (r() - 0.5) * h * 0.1, y + (r() - 0.5) * h * 0.08, Math.max(2, Math.round(h * 0.04)), pal, r, 1); }
    }
    return c;
  }
  function makeBush(seed, season, h) {
    const r = rng(seed), w = Math.round(h * 2.2), c = newCanvas(w, h), g = c.getContext('2d');
    const pal = season === 1 ? ['#2a2a2a', '#4a463e', '#6a6458', '#8a8070'] : (r() < 0.5 ? ['#3a1a10', '#6a2a14', '#9a4018', '#c86a28'] : ['#2a2a12', '#4a4a1e', '#6e6a2a', '#948a3a']);
    for (let i = 0; i < 14; i++) shadeCircle(g, w * 0.2 + r() * w * 0.6, h * 0.45 + r() * h * 0.3, Math.round(h * (0.2 + r() * 0.15)), pal, r, 1);
    if (season === 1) for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) {
      const d = g.getImageData(x, y, 1, 1).data; if (d[3] && (y === 0 || !g.getImageData(x, y - 1, 1, 1).data[3]) && r() < 0.8) { g.fillStyle = '#eef3f9'; g.fillRect(x, y, 1, 2); }
    }
    return c;
  }
  function makeRock(seed, season, h) {
    const r = rng(seed), w = Math.round(h * 1.8), c = newCanvas(w, h), g = c.getContext('2d');
    const pal = ['#2e2e30', '#4a4a4e', '#68686c', '#8a8a8e', '#a8a8aa'];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const nx = (x - w / 2) / (w / 2), ny = (y - h) / h;
      if (nx * nx + ny * ny > 1 - (r() * 0.08)) continue;
      const l = clamp(0.55 - nx * 0.35 + ny * 0.45 + (r() - 0.5) * 0.25, 0, 0.999);
      g.fillStyle = pal[Math.floor(l * pal.length)]; g.fillRect(x, y, 1, 1);
      if (season === 1 && ny < -0.6 + (r() * 0.1)) { g.fillStyle = nx < 0.2 ? '#f2f6fa' : '#cad6e6'; g.fillRect(x, y, 1, 1); }
    }
    return c;
  }
  function makeCloud(seed, h, overcast) {
    const r = rng(seed), w = h * 3, c = newCanvas(w, h), g = c.getContext('2d');
    g.imageSmoothingEnabled = true;
    for (let i = 0; i < 26; i++) {
      const x = w * 0.15 + r() * w * 0.7, y = h * 0.4 + r() * h * 0.35, rr = h * (0.12 + r() * 0.2);
      const gr = g.createRadialGradient(x - rr * 0.3, y - rr * 0.4, rr * 0.1, x, y, rr);
      gr.addColorStop(0, overcast ? 'rgba(236,238,242,0.9)' : 'rgba(255,255,255,0.95)');
      gr.addColorStop(0.7, overcast ? 'rgba(190,196,206,0.6)' : 'rgba(232,236,244,0.55)');
      gr.addColorStop(1, 'rgba(220,226,236,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
    }
    return c;
  }

  // panoramic ridge layers (periodic in azimuth) -> canvas width 2*PI*F
  function periodicRidge(seed, k0, k1, falloff) {
    const r = rng(seed), terms = [];
    for (let k = k0; k <= k1; k++) terms.push([k, r() * TAU, Math.pow(k, -falloff) * (0.6 + r() * 0.8)]);
    let norm = 0; for (const t of terms) norm += t[2];
    return a => { let s = 0; for (const [k, p, amp] of terms) s += Math.sin(a * k + p) * amp; return s / norm; };
  }
  function buildPanorama(season, layer) {
    const PW = Math.round(TAU * F), cfg = [
      // far mountains, mid forested hills, near treeline
      { hMax: 40, base: 12, seed: 3, k1: 60, fall: 1.25, amp: 30 },
      { hMax: 24, base: 6, seed: 7, k1: 120, fall: 1.0, amp: 14 },
      { hMax: 16, base: 4, seed: 11, k1: 260, fall: 0.8, amp: 9 }
    ][layer];
    const c = newCanvas(PW, cfg.hMax + 8), g = c.getContext('2d');
    const id = g.createImageData(PW, c.height), d = id.data;
    const ridge = periodicRidge(cfg.seed + season * 100, 1, cfg.k1, cfg.fall);
    const spikes = periodicRidge(cfg.seed + 50, 150, 420, 0.3);
    const colorN = makeNoise(cfg.seed + 9, 64);
    const hazeC = HAZE;
    const by = c.height - 4; // horizon row inside the strip
    for (let x = 0; x < PW; x++) {
      const a = x / PW * TAU;
      let hgt = cfg.base + (ridge(a) * 0.5 + 0.5) * cfg.amp;
      if (layer === 2) hgt += Math.abs(spikes(a)) * 5; // pine tips along the treeline
      if (layer === 1) hgt += Math.abs(spikes(a * 0.5)) * 2;
      const top = by - hgt;
      for (let y = 0; y < c.height; y++) {
        if (y < top) continue;
        const depth = (y - top) / Math.max(1, hgt);
        let col;
        if (layer === 0) {
          const rock = season === 1 ? [150, 160, 180] : [120, 128, 150];
          const lit = Math.sin(a * 23 + y * 0.3) * 0.5 + colorN(x * 0.05, y * 0.2) - 0.5;
          col = mix(rock, [90, 100, 125], depth * 0.6 + lit * 0.15);
          if (depth < 0.22 + colorN(x * 0.1, 3) * 0.25) col = season === 1 ? [240, 244, 250] : mix(col, [228, 232, 240], 0.55);
          col = mix(col, hazeC, 0.55);
        } else if (layer === 1) {
          const n = colorN(x * 0.04, y * 0.18);
          let base = season === 1 ? [70, 82, 84] : (n > 0.62 ? [150, 80, 40] : n > 0.45 ? [120, 108, 52] : [62, 76, 48]);
          if (season === 1 && colorN(x * 0.08, y * 0.3) > 0.55) base = [200, 208, 220];
          col = mix(base, [40, 46, 40], depth * 0.4);
          col = mix(col, hazeC, 0.38);
        } else {
          const n = colorN(x * 0.09, y * 0.3);
          let base = season === 1 ? [34, 48, 40] : (n > 0.66 ? [120, 56, 26] : n > 0.5 ? [96, 84, 34] : [30, 46, 30]);
          if (season === 1 && (y - top) < 1.5 + n * 2) base = [222, 228, 238];
          col = mix(base, [16, 22, 16], depth * 0.5);
          col = mix(col, hazeC, 0.16);
        }
        const dj = (bayer(x, y) - 0.5) * 10;
        const o = (y * PW + x) * 4;
        d[o] = clamp(col[0] + dj, 0, 255); d[o + 1] = clamp(col[1] + dj, 0, 255); d[o + 2] = clamp(col[2] + dj, 0, 255);
        // fade the very bottom into the haze so it meets the ground fog
        d[o + 3] = y > by ? 255 * (1 - (y - by) / 4) : 255;
      }
    }
    g.putImageData(id, 0, 0);
    const z = newCanvas(PW * ZOOM, c.height * ZOOM), zg = z.getContext('2d');
    zg.imageSmoothingEnabled = true; zg.drawImage(c, 0, 0, z.width, z.height);
    return { c, z, by };
  }

  // ground textures (3 blur levels)
  function buildGround(season) {
    const N = 256, lv = [];
    const n1 = makeNoise(31 + season, 32), n2 = makeNoise(57 + season, 64), n3 = makeNoise(91, 128);
    const r = rng(77 + season);
    const px = new Uint8ClampedArray(N * N * 3);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const a = n1(x / 8, y / 8), b = n2(x / 4, y / 4), c3 = n3(x / 2, y / 2);
      let col;
      if (season === 0) {
        col = mix([88, 84, 40], [120, 100, 54], a);
        col = mix(col, [70, 58, 34], b > 0.62 ? 0.6 : 0);
        col = mix(col, [60, 74, 36], c3 > 0.7 ? 0.5 : 0);
        const rr = r();
        if (rr < 0.035) col = mix(col, [176, 82, 30], 0.7); else if (rr < 0.055) col = mix(col, [210, 156, 52], 0.6); else if (rr < 0.065) col = mix(col, [140, 44, 24], 0.7);
        else if (rr < 0.13) col = mix(col, [150, 134, 80], 0.6);
        col = mix(col, [0, 0, 0], (c3 - 0.5) * 0.25);
      } else {
        col = mix([226, 232, 242], [196, 208, 226], a * 0.8 + (b - 0.5) * 0.4);
        const rr = r();
        if (rr < 0.012) col = [120, 112, 86]; else if (rr < 0.03) col = [250, 252, 255];
        col = mix(col, [170, 184, 206], c3 > 0.72 ? 0.35 : 0);
      }
      const o = (y * N + x) * 3; px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2];
    }
    lv.push(px);
    // box-blurred levels for distant rows (reduces shimmer)
    let src = px;
    for (let k = 0; k < 2; k++) {
      const out = new Uint8ClampedArray(N * N * 3), rad = 1 << k;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        let s0 = 0, s1 = 0, s2 = 0, cnt = 0;
        for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
          const o = (((y + dy) & 255) * N + ((x + dx) & 255)) * 3; s0 += src[o]; s1 += src[o + 1]; s2 += src[o + 2]; cnt++;
        }
        const o = (y * N + x) * 3; out[o] = s0 / cnt; out[o + 1] = s1 / cnt; out[o + 2] = s2 / cnt;
      }
      lv.push(out); src = out;
    }
    // large-scale light/dark patches
    const patch = new Float32Array(N * N), n4 = makeNoise(13 + season, 16);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) patch[y * N + x] = 0.82 + n4(x / 16, y / 16) * 0.36;
    return { lv, patch };
  }

  function buildSeason(season) {
    HAZE = season === 1 ? [214, 222, 234] : [186, 198, 208];
    const S = { season, haze: HAZE.slice() };
    S.ground = buildGround(season);
    S.pano = [0, 1, 2].map(l => buildPanorama(season, l));
    S.trees = [];
    for (let i = 0; i < 5; i++) S.trees.push({ img: makePine(100 + i, season, 120 + i * 8), h: 14 + i * 1.5, kind: 'pine' });
    if (season === 0) {
      for (let i = 0; i < 5; i++) S.trees.push({ img: makeDeciduous(200 + i, 0, 120, false), h: 12 + i, kind: 'oak' });
      for (let i = 0; i < 2; i++) S.trees.push({ img: makeDeciduous(300 + i, 0, 120, true), h: 13, kind: 'birch' });
    } else {
      for (let i = 0; i < 4; i++) S.trees.push({ img: makeDeciduous(200 + i, 1, 120, i === 3), h: 12 + i, kind: 'bare' });
    }
    S.bushes = [0, 1, 2].map(i => ({ img: makeBush(400 + i, season, 40), h: 1.3 }));
    S.rocks = [0, 1].map(i => ({ img: makeRock(500 + i, season, 30), h: 1.1 }));
    S.clouds = [0, 1, 2, 3].map(i => makeCloud(600 + i, 40, season === 1));
    S.deer = {}; // lazily built by coat/antler key
    return S;
  }
  function deerSet(S, pts) {
    const key = 'p' + pts;
    if (S.deer[key]) return S.deer[key];
    const coat = COATS[S.season], set = {};
    for (const k in DEER_FRAMES) { const c = buildDeerFrame(DEER_FRAMES[k], coat, pts, DEER_ANCHORS[k]); set[k] = c; set[k + 'L'] = flipC(c); }
    S.deer[key] = set; return set;
  }

  // world objects: deterministic per 16m cell
  const CELL = 16;
  const densN = makeNoise(4242, 64);
  function density(x, y) { return densN(x / 140, y / 140); }
  function cellObjects(S, cx, cy, out) {
    const wx = cx * CELL, wy = cy * CELL;
    const d = density(wx, wy);
    const n = d < 0.38 ? (hash2(cx, cy, 1) < 0.15 ? 1 : 0) : d < 0.5 ? 1 + (hash2(cx, cy, 2) < 0.3 ? 1 : 0) : 2 + (hash2(cx, cy, 3) < 0.6 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const h1 = hash2(cx, cy, 10 + i), h2 = hash2(cx, cy, 20 + i), h3 = hash2(cx, cy, 30 + i), h4 = hash2(cx, cy, 40 + i);
      const x = wx + h1 * CELL, y = wy + h2 * CELL;
      let def, scale = 0.8 + h4 * 0.45;
      if (h3 < 0.12) def = S.bushes[Math.floor(h4 * 3)];
      else if (h3 < 0.17) def = S.rocks[Math.floor(h4 * 2)];
      else {
        // the stand overlooks a meadow: only the odd lone tree near the start
        const r0 = Math.hypot(x, y);
        if (r0 < 70 && (r0 < 30 || hash2(cx, cy, 50 + i) > 0.08)) continue;
        def = S.trees[Math.floor(h3 * 997) % S.trees.length];
      }
      if (Math.hypot(x, y) < 12) continue;
      out.push({ x, y, def, scale });
    }
  }

  ArcadeRegistry.register({
    id: 'deerhunter',
    title: 'Deer Hunter',
    year: 1997,
    maker: 'WizardWorks',
    width: W, height: H,
    vector: false,
    pointer: true,
    controls: 'Mouse aim, click fire · Right-click/Z scope · Arrows/edges turn, Up/Down walk · C call · V scent · M map',
    marquee: { bg: '#2a3a1a', fg: '#e8d8a8', accent: '#c05a1a' },
    create(api) {
      const au = api.audio;
      const seasons = [null, null];
      let season = 0, S = null;
      function useSeason(s) { season = s; if (!seasons[s]) seasons[s] = buildSeason(s); S = seasons[s]; HAZE = S.haze; }
      useSeason(0);

      let state = 'title', titleT = 0, hi = api.getHiScore(0);
      // player / world
      let P = { x: 0, y: 0, th: 0 };
      let aimX = W / 2, aimY = HZ + 10, lastMX = -1, lastMY = -1, mouseActive = 0;
      let scope = false, mapOpen = false, recoil = 0, flashT = 0, boltT = 0, ammo = 5, reloadT = 0;
      let clock = 0, wind = { a: 0, sp: 6 }, scentT = 0, scentLeft = 3, callCool = 0, callLog = [];
      let deer = [], tracks = [], msgs = [], trophies = [], total = 0, walking = false, stepT = 0;
      let drawn = [], puffs = [], flakes = [], current = null, lastShot = null, ambT = 3;
      let rightClick = false;
      const imgData = new ImageData(W, H), buf32 = new Uint32Array(imgData.data.buffer);

      // right mouse button = scope (listen on window; runtime handles left clicks)
      const onDown = e => { if (e.button === 2) rightClick = true; };
      const onMenu = e => { if (e.target && e.target.tagName === 'CANVAS') e.preventDefault(); };
      window.addEventListener('pointerdown', onDown, true);
      window.addEventListener('contextmenu', onMenu);

      for (let i = 0; i < 140; i++) flakes.push({ x: Math.random() * W, y: Math.random() * H, z: 0.3 + Math.random() * 0.7, s: Math.random() * TAU });

      // ----- sounds -----
      const sfx = {
        shot() {
          au.noise(0.9, { vol: 0.75, freq: 3000, slideTo: 90 });
          au.tone(70, 0.45, { type: 'triangle', vol: 0.5, slideTo: 28 });
          au.noise(0.7, { vol: 0.16, freq: 900, slideTo: 120, delay: 0.38 });
          au.noise(0.9, { vol: 0.08, freq: 600, slideTo: 100, delay: 0.95 });
        },
        bolt() {
          au.noise(0.05, { vol: 0.25, freq: 3500, type: 'highpass', delay: 0.55 }); au.tone(1700, 0.03, { type: 'square', vol: 0.05, delay: 0.56 });
          au.noise(0.06, { vol: 0.25, freq: 2500, type: 'highpass', delay: 0.78 }); au.tone(1200, 0.03, { type: 'square', vol: 0.05, delay: 0.8 });
        },
        reload() { for (let i = 0; i < 5; i++) au.noise(0.04, { vol: 0.18, freq: 3000, type: 'highpass', delay: 0.25 * i }); au.tone(900, 0.04, { type: 'square', vol: 0.05, delay: 1.4 }); },
        dry() { au.tone(2200, 0.02, { type: 'square', vol: 0.06 }); },
        step() { if (season === 1) au.noise(0.14, { vol: 0.1, freq: 1400, slideTo: 500, type: 'bandpass' }); else au.noise(0.12, { vol: 0.08, freq: 2400, slideTo: 900, type: 'bandpass' }); },
        grunt() { for (let i = 0; i < 2; i++) { au.tone(125, 0.28, { type: 'sawtooth', vol: 0.22, slideTo: 92, delay: i * 0.45 }); au.noise(0.28, { vol: 0.08, freq: 380, type: 'bandpass', delay: i * 0.45 }); } },
        scent() { au.noise(0.6, { vol: 0.14, freq: 5000, slideTo: 7000, type: 'highpass' }); },
        snort() { au.noise(0.18, { vol: 0.16, freq: 1100, type: 'bandpass' }); au.noise(0.22, { vol: 0.14, freq: 900, type: 'bandpass', delay: 0.3 }); },
        hooves() { for (let i = 0; i < 6; i++) au.noise(0.05, { vol: 0.07, freq: 500, delay: i * 0.13 }); },
        thunk() { au.noise(0.1, { vol: 0.2, freq: 700, delay: 0.05 }); },
        bird() { const f = 2600 + Math.random() * 1500; au.tone(f, 0.07, { type: 'sine', vol: 0.04, slideTo: f * 1.4 }); au.tone(f * 1.1, 0.06, { type: 'sine', vol: 0.035, slideTo: f * 0.9, delay: 0.1 }); au.tone(f, 0.08, { type: 'sine', vol: 0.03, slideTo: f * 1.5, delay: 0.2 }); },
        crow() { for (let i = 0; i < 3; i++) au.tone(560, 0.18, { type: 'sawtooth', vol: 0.05, slideTo: 420, delay: i * 0.3 }); },
        wind() { au.noise(3, { vol: 0.05, freq: 380, slideTo: 200 }); },
        trophy() { au.melody([[392, .15], [494, .15], [587, .15], [784, .5]], { type: 'triangle', vol: 0.15 }); },
        click() { au.tone(1000, 0.03, { type: 'square', vol: 0.05 }); },
        scopeIn() { au.noise(0.06, { vol: 0.1, freq: 2000, type: 'bandpass' }); }
      };

      function msg(s, t) { msgs.push({ s, t: t || 3 }); if (msgs.length > 3) msgs.shift(); }

      // ----- hunt setup -----
      function newHunt() {
        P = { x: 0, y: 0, th: Math.random() * TAU };
        aimX = W / 2; aimY = HZ + 5; scope = false; mapOpen = false; recoil = 0;
        clock = 6.5 * 60; wind = { a: P.th + Math.PI + (Math.random() - 0.5) * 1.2, sp: 3 + Math.random() * 9 };
        scentT = 0; scentLeft = 3; callCool = 0; callLog = []; ammo = 5; reloadT = 0; boltT = 0;
        deer = []; tracks = []; msgs = []; trophies = []; total = 0; puffs = []; current = null;
        // first deer grazing in view so the hunter has something to stalk
        const d0 = spawnDeer(36 + Math.random() * 10, P.th + (Math.random() - 0.5) * 0.35);
        d0.state = 'graze';
        for (let i = 0; i < 6; i++) spawnDeer(90 + Math.random() * 180, P.th + (Math.random() - 0.5) * 3.4);
        state = 'hunt';
        msg('DAWN. FIND A BUCK. WIND FROM ' + compassName(wind.a + Math.PI), 5);
      }
      function spawnDeer(dist, az) {
        const buck = Math.random() < 0.45;
        const pts = buck ? [4, 6, 8, 8, 10, 10, 12][Math.floor(Math.random() * 7)] : 0;
        const d = {
          x: P.x + Math.sin(az) * dist, y: P.y - Math.cos(az) * dist, face: Math.random() * TAU,
          state: 'graze', t: Math.random() * 3, dur: 3 + Math.random() * 6, anim: 0, buck, pts,
          weight: Math.round(buck ? 140 + pts * 9 + Math.random() * 40 : 95 + Math.random() * 45),
          wary: 0, tgt: null, trackD: 0, wounded: 0, lethal: false, dieT: 0, id: Math.random()
        };
        deer.push(d); return d;
      }
      function compassName(a) { const n = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']; return n[((Math.round(a / (TAU / 8)) % 8) + 8) % 8]; }
      function clockStr() { let h = Math.floor(clock / 60), m = Math.floor(clock % 60); const ap = h >= 12 ? 'PM' : 'AM'; const hh = h > 12 ? h - 12 : h; return hh + ':' + String(m).padStart(2, '0') + ' ' + ap; }

      // ----- deer AI -----
      function distP(d) { return Math.hypot(d.x - P.x, d.y - P.y); }
      function azTo(fx, fy, tx, ty) { return Math.atan2(tx - fx, -(ty - fy)); }
      function startFlee(d, why) {
        if (d.state === 'flee' || d.state === 'dead' || d.state === 'dying') return;
        d.state = 'flee'; d.t = 0; d.dur = 7 + Math.random() * 4;
        d.face = azTo(P.x, P.y, d.x, d.y) + (Math.random() - 0.5) * 0.9;
        if (distP(d) < 160) { sfx.snort(); sfx.hooves(); }
        if (why && distP(d) < 200) msg(why, 2.5);
      }
      function alertDeer(d) {
        if (d.state === 'flee' || d.state === 'dead' || d.state === 'dying' || d.state === 'alert') return;
        d.state = 'alert'; d.t = 0; d.dur = 2 + Math.random() * 2.5; d.face = azTo(d.x, d.y, P.x, P.y); d.wary += 1;
      }
      function updateDeer(dt) {
        const scentOn = scentT > 0;
        for (const d of deer) {
          d.t += dt;
          const dist = distP(d);
          let speed = 0;
          if (d.state === 'dead') { continue; }
          if (d.state === 'dying') { if (d.t > 0.7) { d.state = 'dead'; d.t = 0; } continue; }
          // senses (sampled)
          if (d.state !== 'flee' && Math.random() < dt * 4) {
            const downwind = Math.abs(angDiff(azTo(P.x, P.y, d.x, d.y), wind.a)) < 0.45;
            if (!scentOn && downwind && dist < 150) startFlee(d, 'A DEER WINDED YOU!');
            else if (walking && dist < 24) startFlee(d, 'DEER SPOOKED');
            else if (walking && dist < 55) alertDeer(d);
            else if (dist < 9) startFlee(d, 'DEER SPOOKED');
          }
          if (d.state === 'graze') {
            if (d.t > d.dur) {
              if (Math.random() < 0.35) { d.state = 'look'; d.t = 0; d.dur = 1 + Math.random() * 2; }
              else { d.state = 'walk'; d.t = 0; const a = Math.random() * TAU, r = 6 + Math.random() * 26; d.tgt = { x: d.x + Math.sin(a) * r, y: d.y - Math.cos(a) * r }; }
            }
          } else if (d.state === 'look') {
            if (d.t > d.dur) { d.state = 'graze'; d.t = 0; d.dur = 3 + Math.random() * 6; }
          } else if (d.state === 'alert') {
            d.face = azTo(d.x, d.y, P.x, P.y);
            if (d.t > d.dur) {
              if (walking && dist < 70) startFlee(d, 'DEER SPOOKED');
              else { d.state = 'graze'; d.t = 0; d.dur = 2 + Math.random() * 4; }
            }
          } else if (d.state === 'walk' || d.state === 'approach') {
            speed = d.state === 'approach' ? 1.5 : 1.1;
            const tg = d.tgt; const dx = tg.x - d.x, dy = tg.y - d.y, l = Math.hypot(dx, dy);
            d.face = Math.atan2(dx, -dy);
            if (l < 1.5) {
              d.state = d.state === 'approach' ? 'look' : 'graze'; d.t = 0; d.dur = d.state === 'look' ? 3 + Math.random() * 3 : 4 + Math.random() * 6;
            }
            if (d.state === 'approach' && Math.random() < dt * 0.25) { d.state = 'pause'; d.t = 0; d.dur = 1 + Math.random() * 2; }
          } else if (d.state === 'pause') {
            if (d.t > d.dur) { d.state = 'approach'; d.t = 0; }
          } else if (d.state === 'flee') {
            speed = d.wounded ? 8 : 12;
            if (d.wounded && d.lethal && d.t > d.dieT) { d.state = 'dying'; d.t = 0; msg('YOU HEAR THE DEER GO DOWN. FOLLOW THE BLOOD (M)', 5); continue; }
            if (d.t > d.dur) { d.state = 'walk'; d.t = 0; d.tgt = { x: d.x + Math.sin(d.face) * 40, y: d.y - Math.cos(d.face) * 40 }; d.wary += 2; if (d.wounded) d.gone = true; }
          }
          if (speed) {
            d.x += Math.sin(d.face) * speed * dt; d.y -= Math.cos(d.face) * speed * dt;
            d.anim += dt * (speed > 3 ? 9 : 5.5);
            d.trackD += speed * dt;
            if (d.trackD > (speed > 3 ? 5 : 2.5)) {
              d.trackD = 0;
              tracks.push({ x: d.x, y: d.y, t: clock, blood: d.wounded > 0, a: d.face });
              if (tracks.length > 500) tracks.shift();
            }
          }
          if (dist > 420) d.gone = true;
        }
        // keep a healthy herd within range
        for (let i = deer.length - 1; i >= 0; i--) if (deer[i].gone) deer.splice(i, 1);
        const alive = deer.filter(d => d.state !== 'dead').length;
        if (alive < 7 && Math.random() < dt * 0.5) spawnDeer(170 + Math.random() * 120, P.th + Math.PI + (Math.random() - 0.5) * 3);
      }
      function blowCall() {
        if (callCool > 0) return;
        callCool = 4; sfx.grunt();
        callLog = callLog.filter(t => clock - t < 30); callLog.push(clock);
        const over = callLog.length > 3;
        msg(over ? 'TOO MUCH CALLING MAKES DEER WARY' : 'YOU BLOW THE GRUNT CALL', 2.5);
        for (const d of deer) {
          if (d.state === 'flee' || d.state === 'dead' || d.state === 'dying') continue;
          const dist = distP(d);
          if (over) { if (dist < 200) alertDeer(d); continue; }
          const ch = d.buck ? (dist < 260 ? 0.7 : 0) : (dist < 120 ? 0.25 : 0);
          if (Math.random() < ch / (1 + d.wary * 0.5)) {
            const a = Math.random() * TAU, r = 12 + Math.random() * 18;
            d.state = 'approach'; d.t = 0; d.tgt = { x: P.x + Math.sin(a) * r, y: P.y - Math.cos(a) * r };
            if (d.buck && Math.random() < 0.6) setTimeout(() => { try { au.tone(110, 0.3, { type: 'sawtooth', vol: 0.08, slideTo: 85 }); } catch (e) { } }, 1200 + Math.random() * 1500);
          }
        }
      }

      // ----- shooting -----
      function fire() {
        if (boltT > 0 || reloadT > 0) return;
        if (ammo <= 0) { sfx.dry(); reloadT = 2.2; sfx.reload(); return; }
        ammo--; sfx.shot(); flashT = 3; recoil = scope ? 22 : 9; boltT = 1.0;
        if (ammo > 0) sfx.bolt(); else { reloadT = 2.4; setTimeout(() => sfx.reload(), 700); }
        const sx = scope ? W / 2 : aimX, sy = scope ? H / 2 : aimY;
        // nearest opaque billboard under the sight
        const cand = drawn.filter(o => sx >= o.x && sx < o.x + o.w && sy >= o.y && sy < o.y + o.h).sort((a, b) => a.z - b.z);
        let hitObj = null, u = 0, v = 0;
        for (const o of cand) {
          const lx = Math.floor((sx - o.x) / o.w * o.img.width), ly = Math.floor((sy - o.y) / o.h * o.img.height);
          let a = 0;
          try { a = o.img.getContext('2d').getImageData(clamp(lx, 0, o.img.width - 1), clamp(ly, 0, o.img.height - 1), 1, 1).data[3]; } catch (e) { a = 0; }
          if (a > 60) { hitObj = o; u = (sx - o.x) / o.w; v = (sy - o.y) / o.h; break; }
        }
        // every deer nearby hears the shot
        for (const d of deer) { const dd = distP(d); if (d.state === 'dead' || d.state === 'dying') continue; if (dd < 230) { if (!hitObj || hitObj.deer !== d) startFlee(d); } else alertDeer(d); }
        if (!hitObj) { puffs.push({ x: sx, y: sy, t: 0, kind: sy > (scope ? H / 2 : HZ) ? 'dirt' : 'none' }); return; }
        if (!hitObj.deer) { sfx.thunk(); puffs.push({ x: sx, y: sy, t: 0, kind: 'bark' }); msg('YOUR SHOT HIT ' + (hitObj.kind === 'rock' ? 'A ROCK' : 'A TREE'), 2); return; }
        const d = hitObj.deer;
        // map to base sprite coords (facing right)
        let bx = u * DW, by = v * DH;
        if (hitObj.flip) bx = DW - bx;
        by -= DPAD;
        const head = DEER_ANCHORS[hitObj.frame] || [49, 5];
        let zone;
        if (Math.hypot(bx - (head[0] + 1), by - (head[1] + 4)) < 5) zone = 'HEAD';
        else if (Math.hypot((bx - 37) / 7, (by - 21) / 5.5) < 1) zone = 'HEART/LUNG';
        else if (by > 27) zone = 'LEG';
        else if (bx > 40 && by < 20) zone = 'NECK';
        else zone = 'GUT';
        const range = Math.round(hitObj.z * 1.094);
        lastShot = { zone, range };
        if (zone === 'HEAD' || zone === 'HEART/LUNG' || zone === 'NECK') {
          d.state = 'dying'; d.t = 0; d.killZone = zone; d.range = range;
          current = d; current.trophyT = 2.2;
          msg(zone === 'HEART/LUNG' ? 'CLEAN KILL!' : zone + ' SHOT - DOWN!', 3);
        } else {
          d.wounded = 1; d.lethal = Math.random() < (zone === 'GUT' ? 0.7 : 0.25); d.dieT = 4 + Math.random() * 5; d.killZone = zone; d.range = range;
          d.state = 'graze'; startFlee(d); msg('HIT! THE DEER RUNS OFF WOUNDED', 3);
          for (let k = 0; k < 3; k++) tracks.push({ x: d.x + (Math.random() - 0.5), y: d.y + (Math.random() - 0.5), t: clock, blood: true, a: 0 });
        }
      }
      function scoreDeer(d) {
        if (!d.buck) return { score: 25, title: 'WHITETAIL DOE', detail: 'NO ANTLERS - MEAT ONLY', frac: '' };
        const base = { 4: 62, 6: 88, 8: 118, 10: 140, 12: 158 }[d.pts] || 100;
        const sc = base + Math.floor((d.id * 997) % 22);
        const frac = ['', '1/8', '2/8', '3/8', '4/8', '5/8', '6/8', '7/8'][Math.floor(d.id * 7919) % 8];
        return { score: sc, title: d.pts + ' POINT WHITETAIL BUCK', detail: 'GROSS SCORE ' + sc + (frac ? ' ' + frac : '') + ' B&C', frac };
      }
      function tagDeer(d) {
        const s = scoreDeer(d);
        total += s.score;
        trophies.push({ ...s, pts: d.pts, buck: d.buck, weight: d.weight, zone: d.killZone || 'HEART/LUNG', range: d.range || 0, time: clockStr() });
        current = d; state = 'trophy'; titleT = 0; sfx.trophy();
        d.tagged = true;
      }

      // ----- rendering the world -----
      function skyCols() {
        const t = clock / 60;
        const keys = season === 1 ?
          [[5.5, '#3a4460', '#a8a4b4'], [8, '#8a9ab4', '#dfe4ec'], [15.5, '#8a9ab4', '#dfe4ec'], [17.5, '#5a5a78', '#c09898'], [18.5, '#202434', '#504860']] :
          [[5.5, '#1c2850', '#e89870'], [7.5, '#3a68b0', '#d8c8b8'], [9, '#2e64b8', '#c4d6e8'], [15, '#2e64b8', '#c8d8e8'], [16.8, '#3a5aa0', '#e8b890'], [17.6, '#2a3270', '#f08850'], [18.5, '#101634', '#803c40']];
        let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
        const a = keys[i], b = keys[i + 1], k = clamp((t - a[0]) / (b[0] - a[0]), 0, 1);
        return [mix(hexRGB(a[1]), hexRGB(b[1]), k), mix(hexRGB(a[2]), hexRGB(b[2]), k)];
      }
      function tintCol() {
        const t = clock / 60;
        const keys = [[5.5, [190, 150, 150]], [7.5, [255, 236, 220]], [9, [255, 255, 255]], [15.5, [255, 255, 255]], [17, [255, 220, 190]], [17.8, [210, 160, 150]], [18.5, [110, 100, 130]]];
        let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
        const a = keys[i], b = keys[i + 1], k = clamp((t - a[0]) / (b[0] - a[0]), 0, 1);
        return mix(a[1], b[1], k);
      }

      function renderWorld(g, f, hz, th, showHud) {
        const sk = skyCols(), top = sk[0], hor = sk[1];
        const hz0 = Math.floor(hz);
        // sky rows
        for (let y = 0; y < H && y <= hz0; y++) {
          const ang = Math.atan((hz - y) / f), t = clamp(ang / 0.55, 0, 1), tt = Math.pow(t, 0.6);
          const r = hor[0] + (top[0] - hor[0]) * tt, gg = hor[1] + (top[1] - hor[1]) * tt, b = hor[2] + (top[2] - hor[2]) * tt;
          const c = (255 << 24) | ((b | 0) << 16) | ((gg | 0) << 8) | (r | 0);
          buf32.fill(c, y * W, y * W + W);
        }
        // ground (mode 7)
        const fwdx = Math.sin(th), fwdy = -Math.cos(th), rtx = Math.cos(th), rty = Math.sin(th);
        const G = S.ground, haze = HAZE, N = 256;
        for (let y = Math.max(0, hz0 + 1); y < H; y++) {
          const dy = y + 0.5 - hz; if (dy <= 0) continue;
          const z = CAMH * f / dy;
          const fog = clamp(Math.pow(z / FAR, 1.15), 0, 1);
          const off = y * W;
          if (fog >= 0.999) { buf32.fill((255 << 24) | (haze[2] << 16) | (haze[1] << 8) | haze[0], off, off + W); continue; }
          const step = z / f * TS; // texels per pixel
          const tex = step > 3 ? G.lv[2] : step > 1.4 ? G.lv[1] : G.lv[0];
          const rx0 = (0.5 - W / 2) * z / f;
          let u = (P.x + fwdx * z + rtx * rx0) * TS, v = (P.y + fwdy * z + rty * rx0) * TS;
          const du = rtx * z / f * TS, dv = rty * z / f * TS;
          const fh0 = haze[0] * fog, fh1 = haze[1] * fog, fh2 = haze[2] * fog, inv = 1 - fog;
          for (let x = 0; x < W; x++) {
            const ui = (u | 0) & 255, vi = (v | 0) & 255;
            const o = (vi * N + ui) * 3;
            const m = G.patch[(((v * 0.025) | 0) & 255) * N + (((u * 0.025) | 0) & 255)] * inv;
            const r = tex[o] * m + fh0, gg = tex[o + 1] * m + fh1, b = tex[o + 2] * m + fh2;
            buf32[off + x] = (255 << 24) | ((b > 255 ? 255 : b) << 16) | ((gg > 255 ? 255 : gg) << 8) | (r > 255 ? 255 : r);
            u += du; v += dv;
          }
        }
        g.putImageData(imgData, 0, 0);
        // sun
        const t = clock / 60, sunAz = Math.PI / 2 + (t - 6) / 12 * Math.PI, sunAlt = Math.sin((t - 6) / 12 * Math.PI) * 0.62;
        const rel = angDiff(sunAz, th);
        if (Math.abs(rel) < 1.2 && season === 0) {
          const sx = W / 2 + Math.tan(rel) * f, sy = hz - Math.tan(sunAlt) * f;
          const rad = 0.03 * f;
          const gr = g.createRadialGradient(sx, sy, rad * 0.5, sx, sy, rad * 6);
          gr.addColorStop(0, 'rgba(255,250,220,0.55)'); gr.addColorStop(1, 'rgba(255,240,200,0)');
          g.fillStyle = gr; g.fillRect(sx - rad * 6, sy - rad * 6, rad * 12, rad * 12);
          g.fillStyle = t < 8 || t > 16.5 ? '#ffd8a0' : '#fffbe8'; g.beginPath(); g.arc(sx, sy, rad, 0, TAU); g.fill();
        }
        // clouds at infinity
        for (let i = 0; i < 9; i++) {
          const az = i * 0.71 + (api.time * 0.002) + 0.3, alt = 0.06 + (i % 4) * 0.05;
          const rr = angDiff(az, th); if (Math.abs(rr) > 1.1) continue;
          const img = S.clouds[i % S.clouds.length], sc = f / F * (0.8 + (i % 3) * 0.3);
          const cw = img.width * sc, ch = img.height * sc;
          const cx = W / 2 + Math.tan(rr) * f - cw / 2, cy = hz - Math.tan(alt) * f - ch / 2;
          g.globalAlpha = season === 1 ? 0.85 : 0.75; g.imageSmoothingEnabled = true;
          g.drawImage(img, cx, cy, cw, ch); g.globalAlpha = 1; g.imageSmoothingEnabled = false;
        }
        // panoramic hill layers (far -> near), with a touch of positional parallax
        const zoomed = f !== F;
        for (let l = 0; l < 3; l++) {
          const pn = S.pano[l], src = zoomed ? pn.z : pn.c, scale = zoomed ? ZOOM : 1;
          const PW = src.width, dist = [6000, 1800, 700][l];
          const par = (P.x * Math.cos(th) + P.y * Math.sin(th)) / dist;
          let sx0 = ((th + par) * f - W / 2) % PW; if (sx0 < 0) sx0 += PW;
          const dyTop = Math.round(hz - pn.by * scale);
          const w1 = Math.min(W, PW - sx0);
          g.drawImage(src, sx0, 0, w1, src.height, 0, dyTop, w1, src.height);
          if (w1 < W) g.drawImage(src, 0, 0, W - w1, src.height, w1, dyTop, W - w1, src.height);
        }
        // ---- billboards ----
        const objs = [];
        const cosT = Math.cos(th), sinT = Math.sin(th), halfTan = (W / 2 + 40) / f;
        const R = FAR, c0x = Math.floor((P.x - R) / CELL), c1x = Math.floor((P.x + R) / CELL), c0y = Math.floor((P.y - R) / CELL), c1y = Math.floor((P.y + R) / CELL);
        const tmp = [];
        for (let cy = c0y; cy <= c1y; cy++) for (let cx = c0x; cx <= c1x; cx++) {
          const mx = cx * CELL + CELL / 2 - P.x, my = cy * CELL + CELL / 2 - P.y;
          const zc = mx * sinT - my * cosT; if (zc < -CELL) continue;
          const xc = mx * cosT + my * sinT;
          if (Math.abs(xc) > (zc + CELL * 1.5) * halfTan + CELL) continue;
          tmp.length = 0; cellObjects(S, cx, cy, tmp);
          for (const o of tmp) {
            const dx = o.x - P.x, dy = o.y - P.y, z = dx * sinT - dy * cosT;
            if (z < 2.5 || z > FAR) continue;
            const xr = dx * cosT + dy * sinT;
            objs.push({ z, xr, o });
          }
        }
        for (const d of deer) {
          const dx = d.x - P.x, dy = d.y - P.y, z = dx * sinT - dy * cosT;
          if (z < 1.5 || z > FAR) continue;
          objs.push({ z, xr: dx * cosT + dy * sinT, deer: d });
        }
        objs.sort((a, b) => b.z - a.z);
        drawn.length = 0;
        // deer tracks in the snow / leaves near the hunter
        for (const tr of tracks) {
          const dx = tr.x - P.x, dy = tr.y - P.y, z = dx * sinT - dy * cosT; if (z < 2 || z > 45) continue;
          const sx = W / 2 + (dx * cosT + dy * sinT) / z * f, sy = hz + CAMH * f / z;
          if (sx < -4 || sx > W + 4) continue;
          const s = Math.max(1, Math.round(0.25 * f / z));
          g.fillStyle = tr.blood ? '#8a1010' : season === 1 ? '#7888a0' : '#3a2c18';
          g.fillRect(Math.round(sx), Math.round(sy), s + 1, Math.max(1, s >> 1));
        }
        for (const it of objs) {
          const fog = clamp(Math.pow(it.z / FAR, 1.15), 0, 1);
          if (it.deer) { drawDeer(g, it, f, hz, fog); continue; }
          const def = it.o.def, hM = def.h * it.o.scale;
          const sh = hM * f / it.z, sw = sh * def.img.width / def.img.height;
          if (sh < 1.5) continue;
          const sx = W / 2 + it.xr / it.z * f - sw / 2, sy = hz + CAMH * f / it.z - sh;
          if (sx > W || sx + sw < 0) continue;
          const img = lod(def.img, sh, fog);
          if (it.z < 6) g.globalAlpha = clamp((it.z - 2.5) / 3.5, 0, 1);
          if (sh > img.height * 1.4) g.imageSmoothingEnabled = true;
          g.drawImage(img, Math.round(sx), Math.round(sy), Math.round(sw), Math.round(sh));
          g.globalAlpha = 1; g.imageSmoothingEnabled = false;
          drawn.push({ x: sx, y: sy, w: sw, h: sh, z: it.z, img, kind: def.kind || 'rock' });
        }
      }

      function deerFrame(d) {
        const s = d.state;
        if (s === 'flee') return 'RUN' + (Math.floor(d.anim) % 3);
        if (s === 'walk' || s === 'approach') return 'WALK' + (Math.floor(d.anim) % 4);
        if (s === 'graze') return (d.t % 4 < 3.2) ? 'GRAZE' : 'STAND';
        if (s === 'alert' || s === 'look' || s === 'pause') return 'ALERT';
        return 'STAND';
      }
      function drawDeer(g, it, f, hz, fog) {
        const d = it.deer, set = deerSet(S, d.pts);
        const frame = deerFrame(d);
        if (d.state !== 'dying' && d.state !== 'dead') d.lastFrame = frame;
        // facing: compare deer heading against the camera's right vector
        const th = renderTh, fx = Math.sin(d.face), fy = -Math.cos(d.face);
        const flip = (fx * Math.cos(th) + fy * Math.sin(th)) < 0;
        const base = set[frame + (flip ? 'L' : '')];
        const pxPerM = 22; // sprite pixels per metre (deer drawn a touch large for playability)
        const sw = DW / pxPerM * f / it.z, sh = DH / pxPerM * f / it.z;
        const gx = W / 2 + it.xr / it.z * f, gy = hz + CAMH * f / it.z;
        const sx = gx - sw / 2, sy = gy - sh * (58 / DH);
        if (sx > W || sx + sw < 0) return;
        const img = lod(base, sh, fog * 0.8);
        if (d.state === 'dying' || d.state === 'dead') {
          // collapse: buckle the standing frame, then the lying frame
          if (d.state === 'dying' && d.t < 0.45) {
            const k = 1 - d.t / 0.45 * 0.55, img2 = lod(set[(d.lastFrame || 'STAND') + (flip ? 'L' : '')], sh, fog * 0.8);
            g.drawImage(img2, Math.round(sx), Math.round(gy - sh * (58 / DH) * k), Math.round(sw), Math.round(sh * k));
          } else {
            const img2 = lod(set['DEAD' + (flip ? 'L' : '')], sh, fog * 0.8);
            g.drawImage(img2, Math.round(sx), Math.round(sy), Math.round(sw), Math.round(sh));
          }
          if (d.state === 'dead' && !d.tagged && distP(d) < 14 && state === 'hunt') nearDead = d;
          return;
        }
        if (sh > img.height * 1.4) g.imageSmoothingEnabled = true;
        g.drawImage(img, Math.round(sx), Math.round(sy), Math.round(sw), Math.round(sh));
        g.imageSmoothingEnabled = false;
        drawn.push({ x: sx, y: sy, w: sw, h: sh, z: it.z, img, deer: d, flip, frame });
      }

      let renderTh = 0, nearDead = null;
      function renderScene(g) {
        nearDead = null;
        if (scope) {
          const ha = Math.atan((aimX - W / 2) / F), va = Math.atan((aimY - HZ) / F);
          renderTh = P.th + ha;
          const hzZ = H / 2 - Math.tan(va) * FZ + recoil * ZOOM * 0.6;
          renderWorld(g, FZ, hzZ, renderTh);
        } else {
          renderTh = P.th;
          renderWorld(g, F, HZ + recoil, P.th);
        }
        // weather
        if (season === 1) {
          g.fillStyle = '#ffffff';
          for (const fl of flakes) { const s = fl.z > 0.8 ? 2 : 1; g.globalAlpha = 0.5 + fl.z * 0.5; g.fillRect(Math.round(fl.x), Math.round(fl.y), s, s); }
          g.globalAlpha = 1;
        } else {
          for (let i = 0; i < 14; i++) { const fl = flakes[i]; g.fillStyle = ['#c0501c', '#d89a30', '#8c3018'][i % 3]; g.fillRect(Math.round(fl.x), Math.round(fl.y), 2, 1); }
        }
        // time-of-day light
        const tc = tintCol();
        if (tc[0] < 254 || tc[1] < 254 || tc[2] < 254) { g.globalCompositeOperation = 'multiply'; g.fillStyle = rgbStr(tc); g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
        // bullet impacts
        for (const p of puffs) {
          if (p.kind === 'none') continue;
          const c = p.kind === 'bark' ? '#5a4030' : season === 1 ? '#f4f8ff' : '#8a7448';
          const sx = scope ? W / 2 : p.x, sy = scope ? H / 2 : p.y;
          for (let k = 0; k < 7; k++) { const a = k * 0.9 + p.t * 3, r = p.t * 28 * (0.5 + (k % 3) * 0.3); g.fillStyle = c; g.globalAlpha = Math.max(0, 1 - p.t * 2); g.fillRect(Math.round(sx + Math.cos(a) * r), Math.round(sy - Math.abs(Math.sin(a)) * r), 2, 2); }
          g.globalAlpha = 1;
        }
        if (flashT > 0) { g.fillStyle = 'rgba(255,240,200,' + (flashT * 0.12) + ')'; g.fillRect(0, 0, W, H); }
      }

      function drawScopeOverlay(g) {
        const cx = W / 2, cy = H / 2, R = 92;
        g.fillStyle = '#000';
        g.beginPath(); g.rect(0, 0, W, H); g.arc(cx, cy, R, 0, TAU, true); g.fill();
        // lens vignette ring
        g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, R - 3, 0, TAU); g.stroke();
        g.strokeStyle = 'rgba(40,40,40,0.9)'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
        // duplex reticle
        g.fillStyle = '#000';
        g.fillRect(cx - R, cy - 1, R - 22, 3); g.fillRect(cx + 22, cy - 1, R - 22, 3);
        g.fillRect(cx - 1, cy + 22, 3, R - 22); g.fillRect(cx - 1, cy - R, 3, R - 22);
        g.fillRect(cx - 22, cy, 44, 1); g.fillRect(cx, cy - 22, 1, 44);
        text(g, '4X', W - 20, H - 12, '#9a9a9a');
      }
      function drawHud(g) {
        if (!mapOpen) drawCompass(g);
        drawStatus(g);
        if (mapOpen) return;
        let my = 18;
        for (const m of msgs) { text(g, m.s, W / 2, my, '#fff4d0', 1, 'c', '#000'); my += 10; }
        if (nearDead) text(g, 'PRESS ENTER TO TAG YOUR DEER', W / 2, H - 34, '#ffe080', 1, 'c', '#000');
      }
      function drawCompass(g) {
        g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(100, 2, 120, 11);
        for (let k = -60; k <= 60; k++) {
          const a = P.th + k / 60 * 0.9;
          const deg = Math.round(a / TAU * 360);
          const dd = ((deg % 360) + 360) % 360;
          const x = 160 + k;
          if (dd % 45 === 0 && Math.abs((a / TAU * 360) - deg) < 0.8) {
            const lab = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][dd / 45];
            text(g, lab, x, 4, dd === 0 ? '#ff6040' : '#f0e8d0', 1, 'c');
          } else if (dd % 15 === 0 && Math.abs((a / TAU * 360) - deg) < 0.8) { g.fillStyle = '#a0a090'; g.fillRect(x, 9, 1, 3); }
        }
        g.fillStyle = '#ff6040'; g.fillRect(160, 1, 1, 2);
      }
      function drawStatus(g) {
        // clock, wind
        g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(2, H - 22, 92, 20);
        text(g, clockStr(), 6, H - 20, '#f0e8d0');
        text(g, 'WIND ' + compassName(wind.a + Math.PI) + ' ' + Math.round(wind.sp), 6, H - 11, '#c8d8e8');
        // wind arrow relative to view
        const wa = wind.a - P.th, ax = 84, ay = H - 12;
        g.strokeStyle = '#c8d8e8'; g.lineWidth = 1; g.beginPath();
        g.moveTo(ax - Math.sin(wa) * 5, ay + Math.cos(wa) * 5); g.lineTo(ax + Math.sin(wa) * 5, ay - Math.cos(wa) * 5); g.stroke();
        g.fillStyle = '#ffffff'; g.fillRect(Math.round(ax + Math.sin(wa) * 5) - 1, Math.round(ay - Math.cos(wa) * 5) - 1, 2, 2);
        // ammo / items
        g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(W - 96, H - 22, 94, 20);
        for (let i = 0; i < 5; i++) {
          const x = W - 92 + i * 6;
          g.fillStyle = i < ammo ? '#d0a040' : '#3a3a3a'; g.fillRect(x, H - 19, 3, 7); g.fillStyle = i < ammo ? '#a0a0a8' : '#2a2a2a'; g.fillRect(x, H - 21, 3, 2);
        }
        if (reloadT > 0) text(g, 'RELOAD', W - 60, H - 20, '#ff9060');
        else text(g, 'BAG ' + trophies.length, W - 60, H - 20, '#f0e8d0');
        text(g, 'SCENT ' + scentLeft + (scentT > 0 ? '*' : ''), W - 92, H - 11, scentT > 0 ? '#90ff90' : '#c8d8e8');
        text(g, callCool > 0 ? 'CALL.' : 'CALL', W - 32, H - 11, callCool > 0 ? '#808080' : '#c8d8e8');
      }
      function drawSight(g) {
        const x = Math.round(aimX), y = Math.round(aimY);
        g.fillStyle = 'rgba(0,0,0,0.7)';
        g.fillRect(x - 9, y, 6, 1); g.fillRect(x + 4, y, 6, 1); g.fillRect(x, y - 9, 1, 6); g.fillRect(x, y + 4, 1, 6);
        g.fillStyle = '#ff3020'; g.fillRect(x, y, 1, 1);
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(x + 0.5, y + 0.5, 6, 0, TAU); g.stroke();
      }

      // ----- GPS map -----
      let mapCanvas = null, mapAt = null;
      function buildMap() {
        const M = 180, mpp = 3.2; // metres per pixel
        const c = newCanvas(M, M), g = c.getContext('2d'), id = g.createImageData(M, M), d = id.data;
        const hN = makeNoise(5, 64);
        for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) {
          const wx = P.x + (x - M / 2) * mpp, wy = P.y + (y - M / 2) * mpp;
          const dens = density(wx, wy), el = hN(wx / 90, wy / 90);
          let col = season === 1 ? [226, 230, 222] : [214, 204, 166];
          if (dens > 0.5) col = season === 1 ? [168, 186, 168] : [136, 160, 104]; else if (dens > 0.38) col = season === 1 ? [196, 208, 192] : [176, 184, 132];
          const contour = Math.abs(((el * 12) % 1) - 0.5) < 0.04;
          if (contour) col = mix(col, [120, 90, 60], 0.5);
          const o = (y * M + x) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
        }
        g.putImageData(id, 0, 0);
        mapCanvas = c; mapAt = { x: P.x, y: P.y, mpp, M };
      }
      function drawMap(g) {
        if (!mapCanvas || Math.hypot(P.x - mapAt.x, P.y - mapAt.y) > 30) buildMap();
        const { mpp, M } = mapAt, ox = (W - M) / 2, oy = 10;
        g.fillStyle = 'rgba(20,16,10,0.85)'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#5a4428'; g.fillRect(ox - 4, oy - 4, M + 8, M + 8);
        g.drawImage(mapCanvas, ox, oy);
        const toS = (wx, wy) => [ox + M / 2 + (wx - mapAt.x) / mpp, oy + M / 2 + (wy - mapAt.y) / mpp];
        for (const t of tracks) {
          const [x, y] = toS(t.x, t.y); if (x < ox || y < oy || x >= ox + M || y >= oy + M) continue;
          const age = clock - t.t; if (age > 180) continue;
          g.fillStyle = t.blood ? '#c01010' : age < 30 ? '#4a2a10' : '#8a6a40';
          g.fillRect(Math.round(x), Math.round(y), t.blood ? 2 : 1, t.blood ? 2 : 1);
        }
        // tagged deer marker for found carcasses
        for (const d of deer) if (d.state === 'dead' && !d.tagged) { const [x, y] = toS(d.x, d.y); if (x > ox && x < ox + M && y > oy && y < oy + M) { g.fillStyle = '#c01010'; g.fillRect(Math.round(x) - 2, Math.round(y), 5, 1); g.fillRect(Math.round(x), Math.round(y) - 2, 1, 5); } }
        // player arrow
        const px = ox + M / 2 + (P.x - mapAt.x) / mpp, py = oy + M / 2 + (P.y - mapAt.y) / mpp;
        g.fillStyle = '#ff2010'; g.strokeStyle = '#ffffff';
        g.beginPath(); g.moveTo(px + Math.sin(P.th) * 6, py - Math.cos(P.th) * 6);
        g.lineTo(px + Math.sin(P.th + 2.5) * 4, py - Math.cos(P.th + 2.5) * 4); g.lineTo(px + Math.sin(P.th - 2.5) * 4, py - Math.cos(P.th - 2.5) * 4); g.closePath(); g.fill(); g.stroke();
        // north & wind & legend
        text(g, 'N', ox + M - 8, oy + 3, '#2a1a0a');
        const wx = ox + 12, wy = oy + 14;
        g.strokeStyle = '#1a3a8a'; g.lineWidth = 2; g.beginPath(); g.moveTo(wx - Math.sin(wind.a) * 7, wy + Math.cos(wind.a) * 7); g.lineTo(wx + Math.sin(wind.a) * 7, wy - Math.cos(wind.a) * 7); g.stroke(); g.lineWidth = 1;
        g.fillStyle = '#1a3a8a'; g.fillRect(Math.round(wx + Math.sin(wind.a) * 7) - 1, Math.round(wy - Math.cos(wind.a) * 7) - 1, 3, 3);
        text(g, 'GPS - TRACKS', 6, oy, '#e8d8a8'); text(g, '1 PX=' + Math.round(mpp * 1.09) + 'YD', 6, oy + 10, '#e8d8a8');
        text(g, 'BROWN: TRACKS', 6, oy + 30, '#c8a070'); text(g, 'RED: BLOOD', 6, oy + 40, '#ff6060');
        text(g, 'M: CLOSE', W - 56, oy, '#e8d8a8');
      }

      // ----- trophy & summary screens -----
      function woodPanel(g) {
        const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#4a2a14'); gr.addColorStop(1, '#2a160a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.strokeStyle = 'rgba(20,10,4,0.5)'; for (let y = 0; y < H; y += 3) { g.beginPath(); g.moveTo(0, y + Math.sin(y) * 2); g.lineTo(W, y + Math.cos(y * 0.7) * 2); g.stroke(); }
        g.strokeStyle = '#c8a050'; g.strokeRect(4.5, 4.5, W - 9, H - 9); g.strokeStyle = '#6a4a20'; g.strokeRect(7.5, 7.5, W - 15, H - 15);
      }
      function renderTrophy(g) {
        woodPanel(g);
        const tr = trophies[trophies.length - 1]; if (!tr) return;
        text(g, 'TROPHY', W / 2, 14, '#f0d890', 2, 'c', '#1a0c04');
        // the deer on a field backdrop
        const fx = 14, fy = 40, fw = 150, fh = 110;
        const bg = g.createLinearGradient(0, fy, 0, fy + fh); bg.addColorStop(0, season ? '#c8d4e4' : '#8ab0d0'); bg.addColorStop(0.55, season ? '#e8eef6' : '#d8d0b0'); bg.addColorStop(0.56, season ? '#e4eaf2' : '#8a8440'); bg.addColorStop(1, season ? '#c8d2e0' : '#5a5428');
        g.fillStyle = bg; g.fillRect(fx, fy, fw, fh);
        const set = deerSet(S, tr.buck ? tr.pts : 0);
        g.drawImage(set.STAND, fx + 11, fy + fh - DH * 2 + 2, DW * 2, DH * 2);
        g.strokeStyle = '#c8a050'; g.strokeRect(fx - 0.5, fy - 0.5, fw + 1, fh + 1);
        let y = 44; const x = 174;
        const line = (s, c) => { text(g, s, x, y, c || '#f0e8d0'); y += 11; };
        line(tr.buck ? tr.pts + ' POINT BUCK' : 'WHITETAIL DOE', '#ffe8a0');
        if (tr.buck) { line('SCORE ' + tr.score + (tr.frac ? ' ' + tr.frac : '')); line('BOONE & CROCKETT'); }
        else line('NO ANTLERS');
        line('WEIGHT ' + tr.weight + ' LBS');
        line('RANGE ' + tr.range + ' YDS');
        line(tr.zone + ' SHOT');
        line('TIME ' + tr.time);
        y += 4; line('POINTS +' + tr.score, '#90ff90');
        text(g, 'TOTAL ' + total, W / 2, 160, '#f0d890', 1, 'c');
        if (Math.floor(titleT * 2) % 2 === 0) text(g, 'CLICK OR ENTER TO CONTINUE', W / 2, 180, '#f0e8d0', 1, 'c');
      }
      function renderSummary(g) {
        woodPanel(g);
        text(g, 'END OF HUNT', W / 2, 14, '#f0d890', 2, 'c', '#1a0c04');
        let y = 40;
        if (!trophies.length) { text(g, 'NO DEER TAGGED TODAY', W / 2, 70, '#f0e8d0', 1, 'c'); y = 90; }
        for (const t of trophies.slice(-8)) { text(g, (t.buck ? t.pts + 'PT BUCK' : 'DOE').padEnd(10) + ' ' + String(t.score).padStart(4) + '  ' + t.range + 'YD', 24, y, '#f0e8d0'); y += 11; }
        text(g, 'TOTAL POINTS ' + total, W / 2, 150, '#ffe8a0', 1, 'c');
        text(g, 'BEST HUNT ' + hi, W / 2, 162, '#c8b890', 1, 'c');
        if (Math.floor(titleT * 2) % 2 === 0) text(g, 'PRESS ENTER', W / 2, 180, '#f0e8d0', 1, 'c');
      }
      // Continue: the hunt day is extended with more daylight; trophies and points are kept.
      function extendHunt() {
        const back = clock - 13 * 60;
        clock -= back;
        for (const t of tracks) t.t -= back;
        callLog = callLog.map(t => t - back);
        msg('THE HUNT GOES ON - MORE DAYLIGHT', 4);
      }
      function endHunt() {
        state = 'summary'; titleT = 0; scope = false; mapOpen = false;
        if (total > hi) { hi = total; api.setHiScore(total); }
        au.melody([[392, .3], [330, .3], [294, .3], [262, .6]], { type: 'triangle', vol: 0.12 });
      }

      // ----- title -----
      const titleCam = { x: 0, y: 0, th: 0 };
      let titleDeer = null;
      let coinFlash = 0;   // coin-op: INSERT COIN flash after a start attempt with no credit
      function renderTitle(g) {
        const save = P; P = titleCam; titleCam.th = api.time * 0.05; clock = 17.1 * 60;
        if (!titleDeer || titleDeer.season !== season) {
          deer = [];
          for (let i = 0; i < 5; i++) { const d = spawnDeer(40 + i * 18, i * 1.25); d.state = i % 2 ? 'graze' : 'look'; d.dur = 1e9; d.pts = i % 2 ? 8 : 0; d.buck = !!d.pts; }
          titleDeer = { season };
        }
        renderTh = titleCam.th; renderWorld(g, F, HZ, titleCam.th);
        const tc = tintCol(); g.globalCompositeOperation = 'multiply'; g.fillStyle = rgbStr(tc); g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
        P = save;
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 18, W, 46);
        text(g, 'DEER HUNTER', W / 2 + 2, 26, '#2a1404', 3, 'c');
        text(g, 'DEER HUNTER', W / 2, 24, '#f0d890', 3, 'c');
        text(g, 'THE WHITETAIL CHALLENGE', W / 2, 52, '#e8c890', 1, 'c', '#000');
        g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(40, 116, 240, 70);
        text(g, '< SEASON: ' + (season ? 'SNOW ' : 'AUTUMN') + ' >', W / 2, 122, '#ffffff', 1, 'c');
        text(g, 'BEST HUNT ' + hi, W / 2, 134, '#c8d8a0', 1, 'c');
        text(g, 'C CALL  V SCENT  Z SCOPE  M MAP', W / 2, 148, '#c8c0a8', 1, 'c');
        text(g, 'ARROWS TURN/WALK  CLICK FIRE', W / 2, 158, '#c8c0a8', 1, 'c');
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(g, 'INSERT COIN', W / 2, 172, '#ff6040', 1, 'c'); }
        else if (api.credits === 0) { if ((api.frame >> 4) & 1) text(g, 'INSERT COIN', W / 2, 172, '#ffe080', 1, 'c'); }
        else text(g, 'PRESS START TO HUNT', W / 2, 172, Math.floor(titleT * 2) % 2 === 0 ? '#ffe080' : '#ffffff', 1, 'c');
        text(g, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, 4, '#f0e8d0', 1, null, '#000');
        text(g, '@1997 WIZARDWORKS', W / 2, 190, '#a09880', 1, 'c', '#000');
      }

      return {
        update(dt) {
          titleT += dt;
          if (coinFlash > 0) coinFlash = api.credits > 0 ? 0 : coinFlash - 1;
          const m = api.mouse;
          const moved = m.x !== lastMX || m.y !== lastMY;
          const rc = rightClick; rightClick = false;
          const leftClick = m.clicked && !rc;
          if (state === 'title') {
            if (api.anyPressed('ArrowLeft', 'ArrowRight')) { useSeason(1 - season); titleDeer = null; sfx.click(); }
            if (api.anyPressed('Enter', 'Space') || leftClick) {
              // the credit is spent when the hunt begins; choosing the season is free
              if (api.useCredit()) { coinFlash = 0; deer = []; titleDeer = null; newHunt(); }
              else { coinFlash = 90; au.tone(70, 0.25, { type: 'square', vol: 0.25 }); }
            }
            lastMX = m.x; lastMY = m.y;
            return;
          }
          if (state === 'trophy') {
            if (titleT > 0.8 && (api.anyPressed('Enter', 'Space') || leftClick)) {
              state = 'hunt';
              const i = deer.indexOf(current); if (i >= 0) deer.splice(i, 1);
              current = null;
            }
            return;
          }
          if (state === 'summary') {
            if (titleT > 1 && (api.anyPressed('Enter', 'Space') || leftClick)) { state = 'title'; titleT = 0; titleDeer = null; }
            return;
          }
          // --- hunt ---
          clock += dt * 2.8;
          if (clock >= 18.25 * 60) {
            if (api.offerContinue) api.offerContinue(extendHunt, endHunt);
            else endHunt();
            return;
          }
          if (api.pressed('KeyM')) { mapOpen = !mapOpen; sfx.click(); if (mapOpen) { scope = false; buildMap(); } }
          if (api.pressed('KeyZ') || rc) { if (!mapOpen) { scope = !scope; sfx.scopeIn(); } }
          if (api.pressed('KeyC')) blowCall();
          if (api.pressed('KeyV')) { if (scentLeft > 0 && scentT <= 0) { scentLeft--; scentT = 150; sfx.scent(); msg('COVER SCENT APPLIED', 2.5); } else msg(scentT > 0 ? 'SCENT STILL ACTIVE' : 'OUT OF SCENT', 2); }
          // aim
          if (moved) {
            if (scope) { if (lastMX >= 0) { aimX += (m.x - lastMX) / ZOOM; aimY += (m.y - lastMY) / ZOOM; } }
            else { aimX = m.x; aimY = m.y; }
            mouseActive = 2.5;
          }
          lastMX = m.x; lastMY = m.y;
          mouseActive -= dt;
          aimX = clamp(aimX, 2, W - 3); aimY = clamp(aimY, 10, H - 3);
          // turning
          let turn = 0;
          if (api.key('ArrowLeft') || api.key('KeyA')) turn -= 1;
          if (api.key('ArrowRight') || api.key('KeyD')) turn += 1;
          if (!scope && !mapOpen && mouseActive > 0) { if (aimX < 14) turn -= 0.8; else if (aimX > W - 15) turn += 0.8; }
          if (scope && mouseActive > 0) { if (aimX < 40) turn -= 0.25; else if (aimX > W - 40) turn += 0.25; }
          P.th = (P.th + turn * dt * (scope ? 0.35 : 1.3) + TAU) % TAU;
          // walking
          let mv = 0;
          if (!mapOpen) { if (api.key('ArrowUp') || api.key('KeyW')) mv = 1; if (api.key('ArrowDown') || api.key('KeyS')) mv = -0.6; }
          walking = mv !== 0;
          if (walking) {
            const sp = scope ? 0 : 1.7 * mv;
            P.x += Math.sin(P.th) * sp * dt; P.y -= Math.cos(P.th) * sp * dt;
            stepT -= dt; if (stepT <= 0) { stepT = 0.5; sfx.step(); }
          }
          if (!mapOpen) {
            if (leftClick) { if (!scope) { aimX = m.x; aimY = m.y; } fire(); }
            if (api.pressed('Space')) fire();
          }
          if (api.pressed('Enter') && nearDead) { tagDeer(nearDead); return; }
          // timers
          recoil *= Math.pow(0.0005, dt); if (recoil < 0.2) recoil = 0;
          if (flashT > 0) flashT--;
          if (boltT > 0) boltT -= dt;
          if (reloadT > 0) { reloadT -= dt; if (reloadT <= 0) ammo = 5; }
          if (scentT > 0) { scentT -= dt * 2.8 / 2.8; if (scentT <= 0) msg('COVER SCENT HAS WORN OFF', 2.5); }
          if (callCool > 0) callCool -= dt;
          for (const mm of msgs) mm.t -= dt; while (msgs.length && msgs[0].t <= 0) msgs.shift();
          for (const p of puffs) p.t += dt; while (puffs.length && puffs[0].t > 0.6) puffs.shift();
          wind.a += (Math.random() - 0.5) * dt * 0.02;
          updateDeer(dt);
          if (current && current.state !== 'tagged' && current.trophyT !== undefined) { current.trophyT -= dt; if (current.trophyT <= 0) { current.trophyT = undefined; tagDeer(current); } }
          // weather
          for (const fl of flakes) {
            if (season === 1) { fl.y += (14 + fl.z * 26) * dt; fl.x += Math.sin(fl.s + api.time) * 6 * dt - turn * fl.z * 60 * dt + Math.sin(wind.a - P.th) * wind.sp * dt; }
            else { fl.y += (10 + fl.z * 12) * dt; fl.x += Math.sin(fl.s + api.time * 2) * 18 * dt - turn * fl.z * 60 * dt; }
            if (fl.y > H) { fl.y = -2; fl.x = Math.random() * W; } if (fl.x < 0) fl.x += W; if (fl.x > W) fl.x -= W;
          }
          // ambience
          ambT -= dt;
          if (ambT <= 0) { ambT = 3 + Math.random() * 6; const r = Math.random(); if (season === 0 && r < 0.5 && clock < 17 * 60) sfx.bird(); else if (r < 0.7) sfx.crow(); else sfx.wind(); }
        },
        render(g) {
          if (state === 'title') { renderTitle(g); return; }
          if (state === 'trophy') { renderTrophy(g); return; }
          if (state === 'summary') { renderSummary(g); return; }
          renderScene(g);
          if (scope) drawScopeOverlay(g);
          if (mapOpen) drawMap(g);
          drawHud(g);
          if (!scope && !mapOpen) drawSight(g);
        },
        destroy() {
          window.removeEventListener('pointerdown', onDown, true);
          window.removeEventListener('contextmenu', onMenu);
        }
      };
    }
  });
})();
