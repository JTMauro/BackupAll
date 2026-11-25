// Lode Runner (Irem arcade, 1984) - from-scratch recreation for the MAME32 Game Room.
// Collect every chest of gold, dig holes to trap the guards, then climb the escape ladder to the top.
(function () {
  'use strict';
  const W = 256, H = 224;

  // ---------- 5x7 bitmap font ----------
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
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function sprite(rows, pal) {
    const h = rows.length, w = rows[0].length, cv = mk(w, h), c = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = pal[rows[y][x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } }
    return cv;
  }
  const flip = rows => rows.map(r => r.split('').reverse().join(''));
  const pair = (rows, pal) => [sprite(rows, pal), sprite(flip(rows), pal)]; // [right, left]

  // ---------- levels (28 x 16) ----------
  // # brick (diggable)  @ solid stone  H ladder  - rope  X false brick  S hidden escape ladder  $ gold  P runner  E guard
  const LEVELS = [
    [ // 1
      '                  S         ',
      '    $             S         ',
      '#######H###########         ',
      '       H                    ',
      '       H-----------    $    ',
      '       H          H#######H#',
      '  E    H     $    H       H ',
      '#####H############H       H ',
      '     H            H    $  H ',
      '     H            #######H##',
      '     H     E             H  ',
      '   #######H#####         H  ',
      '          H        ----  H  ',
      '   $      H   $    H  ######',
      '          H   P    H    $  E',
      '############################'],
    [ // 2
      '     S                S     ',
      '     S   $        $   S     ',
      '#####S###H########H###S#####',
      '         H        H         ',
      '  $      H   E    H      $  ',
      '###H#####H########H#####H###',
      '   H     H        H     H   ',
      '   H   -----------------H   ',
      '   H   H      $       H H   ',
      '###H###H##############H#H###',
      '   H   H              H     ',
      ' $ H   H   E      E   H   $ ',
      '#######H######H#######H#####',
      '       H      H       H     ',
      '   E   H   $  H   P   H   E ',
      '############################'],
    [ // 3
      'S                          S',
      'S   $     ---------    $   S',
      'S#######H#        #H#######S',
      '        H          H        ',
      '        H    $$    H        ',
      '  ##H######@@@@######H###   ',
      '    H                H      ',
      '    H     E    E     H      ',
      '#######H##########H#########',
      '       H          H         ',
      '  $    H----------H     $   ',
      '###H#######    #########H###',
      '   H                    H   ',
      '   H   $    P     $     H   ',
      '   H#######################H',
      '   H                    E  H'],
    [ // 4
      '             S              ',
      '  $          S          $   ',
      '#####H#######S#######H######',
      '     H       S       H      ',
      '     H   $   S   $   H      ',
      '     H#######H#######H      ',
      '     H       H       H      ',
      '  E  H-------H-------H  E   ',
      '#####H       H       H######',
      '     H   $   H   $   H      ',
      '     H#######H#######H      ',
      '     H       H       H      ',
      '  $  H       P       H  $   ',
      '#####H###############H######',
      '     H       E       H      ',
      '############################'],
    [ // 5
      'S                           ',
      'S   $   $   $   $   $   $   ',
      'S##H###H###H###H###H###H####',
      '   H   H   H   H   H   H    ',
      '   H   H   H   H   H   H    ',
      '---H---H---H---H---H---H----',
      '   H       E       E   H    ',
      '   H                   H    ',
      '###H#####H#######H#####H####',
      '         H       H          ',
      '   $     H   $   H     $    ',
      '#####H####@@@@@@@####H######',
      '     H               H      ',
      '     H   E     P     H      ',
      '###########################H',
      '                           H'],
    [ // 6
      '                     S      ',
      '  $                  S   $  ',
      '###H#########H#######S###H##',
      '   H         H       S   H  ',
      '   H   $     H    $  S   H  ',
      '   H#####----H----#####  H  ',
      '   H         H           H  ',
      '   H   E     H      E    H  ',
      '########H####H####H#########',
      '        H         H         ',
      '  $     H         H     $   ',
      '####X###H##XXXX###H###X#####',
      '        H         H         ',
      '        H    P    H     E   ',
      '   $    H         H   $     ',
      '############################'],
    [ // 7
      '          S        S        ',
      '          S   $$   S        ',
      '   H#####################H  ',
      '   H                     H  ',
      '   H  $   E      E    $  H  ',
      '   H###H##############H##H  ',
      '   H   H              H  H  ',
      '   H   H   --------   H  H  ',
      '   H   H   H  $   H   H  H  ',
      '   H   H   ########   H  H  ',
      '   H   H              H  H  ',
      ' $ H   H   $  P   $   H  H $',
      '#####H###########H#######H##',
      '     H           H       H  ',
      '  E  H     $     H    E  H  ',
      '############################'],
    [ // 8
      'S                          S',
      'S                          S',
      'S   $    $    $    $    $  S',
      'S@@@@H@@@@H@@@@H@@@@H@@@@@@S',
      '     H    H    H    H       ',
      '     H    H    H    H       ',
      '##########H#########H#######',
      '          H         H       ',
      '   $   E  H   $     H  E  $ ',
      '#######H#######H#######H####',
      '       H       H       H    ',
      '       H-------H-------H    ',
      '       H       H       H    ',
      '  $    H   P   H   $   H  E ',
      '#######H###############H####',
      '       H       $       H    '],
    [ // 9
      '            S               ',
      '   $        S        $      ',
      '#######H####S####H#######   ',
      '       H    S    H      H   ',
      '       H    S    H      H   ',
      '   ----H--  S  --H----  H   ',
      '   H     H  S  H     H  H   ',
      '   H  $  H  H  H  $  H  H   ',
      '   H#####H##H##H#####H  H   ',
      '   H        H        H  H   ',
      ' E H   $    H    $   H  H E ',
      '###H#####   H   #####H  H###',
      '   H    #####H###    H  H   ',
      '   H         H    $  H  H   ',
      '   H  $ E    H   P   H  H   ',
      '############################'],
    [ // 10
      '                           S',
      '  $   $   $   $   $   $    S',
      '##H###########H###########HS',
      '  H           H           H ',
      '  H  E        H        E  H ',
      '  H#####XX####H####XX#####H ',
      '  H           H           H ',
      '  H-----------H-----------H ',
      '  H           H           H ',
      '  H   $   $   H   $   $   H ',
      '##########H#######H#########',
      '          H       H         ',
      '          H   P   H         ',
      '####H###############H#######',
      '    H       E       H       ',
      '    H   $       $   H       '],
    [ // 11
      'S                           ',
      'S  $                    $   ',
      'S######H#########H#######   ',
      '       H         H      #   ',
      '  $    H  -----  H   $  #   ',
      '###@@@@H  H   H  H@@@@###   ',
      '       H  H $ H  H          ',
      '       H  #####  H     E    ',
      '   E   H         H##H#######',
      '########H####       H       ',
      '        H   ####    H   $   ',
      '   $    H   $  #    H###### ',
      '######  H #######   H       ',
      '        H           H   E   ',
      '    P   H     $     H       ',
      '############################'],
    [ // 12
      '              S             ',
      '      $       S       $     ',
      '   #####H#####S#####H#####  ',
      '        H     S     H       ',
      '        H     S     H       ',
      ' -------H-----S-----H-------',
      ' H      H     H     H      H',
      ' H  $   H  E  H  E  H   $  H',
      ' H######H#####H#####H######H',
      ' H                         H',
      ' H    $      $ $      $    H',
      ' H@@@@@@@H@@@@@@@@@@H@@@@@@H',
      '         H          H       ',
      '   E     H    P     H    E  ',
      '############################',
      '                            '],
    [ // 13
      '     S                      ',
      '     S    $   $   $   $     ',
      '#####S####H###H###H###H#####',
      '          H   H   H   H     ',
      '  $   E   H   H   H   H  $  ',
      '###H######H###H###H###H#####',
      '   H                        ',
      '   H----------------------- ',
      '   H                      H ',
      '   H   $    E      $      H ',
      '########H########H#########H',
      '        H        H         H',
      '   $    H   P    H    $    H',
      '#############H##############',
      '             H    E         ',
      '   $         H          $   '],
    [ // 14
      '                          S ',
      '                          S ',
      '  $    $    $    $    $   S ',
      '###H####H####H####H####H##S#',
      '   H    H    H    H    H    ',
      '   H E  H    H    H  E H    ',
      '#######H######H######H######',
      '       H      H      H      ',
      '  $    H------H------H   $  ',
      '###H###H      H      H###H##',
      '   H   H   $  H  $   H   H  ',
      '   H   ##############    H  ',
      '   H                     H  ',
      '   H   E     P       $   H  ',
      '############################',
      '                            '],
    [ // 15
      'S                          S',
      'S $                      $ S',
      'S######H##########H########S',
      '       H          H         ',
      '   $   H   E  E   H    $    ',
      '#H#####H##########H#######H#',
      ' H     H          H       H ',
      ' H     H-----$----H       H ',
      ' H     H          H       H ',
      ' H  $  H          H   $   H ',
      ' H######XXXX##XXXX#######H# ',
      ' H                       H  ',
      ' H     E    $    $    E  H  ',
      ' H##########H#####H######H  ',
      ' H          H  P  H      H  ',
      '############################'],
    [ // 16
      '         S         S        ',
      '  $      S    $    S     $  ',
      '###H#####S####H####S#####H##',
      '   H     S    H    S     H  ',
      '   H     S    H    S     H  ',
      '   H   $ S    H    S $   H  ',
      '   H#####H#########H######  ',
      '   H                     -- ',
      '   H   E      $      E    H ',
      '   ######H#######H#########H',
      '         H       H         H',
      '  $      H       H      $  H',
      '####H############H######H##H',
      '    H     E           P H   ',
      '    H  $          $     H   ',
      '############################'],
    [ // 17
      '  S                    S    ',
      '  S  $              $  S    ',
      '##S###H############H###S####',
      '      H            H        ',
      '      H  $  ##  $  H        ',
      '  ----H  ########  H----    ',
      '  H   H            H   H    ',
      '  H   H  E      E  H   H    ',
      '##H##############H#####H####',
      '  H              H     H    ',
      '  H  $   --------H  $  H    ',
      '  H###########   H######    ',
      '  H              H          ',
      '  H  $  E   P    H     $  E ',
      '####################H#######',
      '                    H   $   '],
    [ // 18
      'S                           ',
      'S  $   $   $   $   $   $    ',
      'S@@@H@@@@@@@@@@@@@@@@@@@H@@@',
      '    H                   H   ',
      '    H  E            E   H   ',
      '    H###H#########H#####H   ',
      '        H         H         ',
      '        H  $   $  H         ',
      '  ------H#########H------   ',
      '  H                     H   ',
      '  H  $     E     $      H   ',
      '###H##XX#########XX####H####',
      '   H                   H    ',
      '   H   $     P     $   H    ',
      '############################',
      '                            '],
    [ // 19
      '                 S          ',
      '  $              S       $  ',
      '#######H#########S##H#######',
      '       H         S  H       ',
      '   $   H   E     S  H   $   ',
      '#####H####@@@@@@@H########H#',
      '     H           H        H ',
      '     H   ------  H   $    H ',
      '     H   H    H  H  ####  H ',
      '  $  H   H $  H  H        H ',
      '#####H####H##H#####H#######H',
      '     H             H        ',
      '     H    E   $    H     E  ',
      '#############H#############H',
      '      P      H      $      H',
      '############################'],
    [ // 20
      '            S    S          ',
      '   $        S $  S      $   ',
      '##H#####################H###',
      '  H                     H   ',
      '  H  $   E        E  $  H   ',
      '  H####H##########H#####H   ',
      '  H    H          H     H   ',
      '  H    H---$------H     H   ',
      '  H    H          H     H   ',
      '###H###H###@@@@###H##H#####H',
      '   H                 H     H',
      '   H  $           $  H   $ H',
      '##########H####H###########H',
      '          H    H            ',
      '  E   $   H  P H     $   E  ',
      '############################'],
    [ // 21
      'S                          S',
      'S   $                  $   S',
      'S@@@@@@@H@@@@@@@@@@H@@@@@@@S',
      '        H          H        ',
      '  $  E  H   $  $   H  E  $  ',
      '#####H#######HH#######H#####',
      '     H       HH       H     ',
      '     H-------HH-------H     ',
      '     H       HH       H     ',
      '  $  H       HH       H  $  ',
      '#####H###H###HH###H###H#####',
      '         H        H         ',
      '    $    H   P    H    $    ',
      '#####XXXXH########HXXXX#####',
      '         H   E    H         ',
      '   $     H        H     $   '],
    [ // 22
      '      S              S      ',
      '  $   S      $       S   $  ',
      '###H##S######H#######S##H###',
      '   H         H          H   ',
      '   H   $     H     $    H   ',
      '   H######---H---#######H   ',
      '   H         H          H   ',
      '   H    E    H    E     H   ',
      '###H#####H########H#####H###',
      '         H        H         ',
      '  $   ---H        H---   $  ',
      '######H  H   $$   H  H######',
      '      H  ##########  H      ',
      '      H              H      ',
      '   E  H      P       H  E   ',
      '############################'],
    [ // 23
      '                          S ',
      ' $    $    $    $    $    S ',
      '#H####H####H####H####H####S#',
      ' H    H    H    H    H      ',
      ' H  E H    H    H  E H      ',
      '#####-----H######-----######',
      '          H                 ',
      '   $      H    E      $     ',
      '#H########H####H###########H',
      ' H             H           H',
      ' H    $   ---- H    $      H',
      ' H#######H    #H#######H###H',
      ' H       H     H       H    ',
      ' H   $   H  P  H    $  H  E ',
      '############################',
      '                            '],
    [ // 24
      'S             S            S',
      'S  $    $     S     $    $ S',
      'SH@@@@@@@@H@@@S@@@H@@@@@@@HS',
      ' H        H   S   H       H ',
      ' H   E    H   S   H   E   H ',
      ' H--------H   S   H-------H ',
      ' H        H   S   H       H ',
      ' H   $    H###H###H   $   H ',
      '####H######   H   ######H###',
      '    H         H         H   ',
      '    H  $   E  H  E   $  H   ',
      '####H##XX#####H#####XX##H###',
      '    H         H         H   ',
      '    H   $     P     $   H   ',
      '####H###################H###',
      '    H $              $  H   ']
  ];

  const COLS = 28, ROWS = 16, TW = 9, TH = 12, OX = 2, OY = 4;
  const DIG_T = 20, OPEN_T = 320, FILL_T = 36;

  // ---------- sprites (8 x 11) ----------
  const FR = {
    run1: ['...ww...', '...ww...', '........', '..wwww..', '.w.ww.w.', 'w..ww..w', '...ww...', '...ww...', '..w..w..', '.w....w.', 'w......w'],
    run2: ['...ww...', '...ww...', '........', '..wwww..', '..www.w.', '..w.ww..', '...ww...', '...ww...', '...w.w..', '...w.w..', '...w..w.'],
    climb1: ['w..ww...', 'w..ww...', '.w.....w', '..wwwww.', '...ww...', '...ww...', '...ww...', '...ww...', '..w..w..', '..w..w..', '..w.....'],
    rope1: ['w......w', '.w.ww.w.', '..wwww..', '...ww...', '...ww...', '...ww...', '...ww...', '..w..w..', '..w..w..', '.w....w.', '.w......'],
    rope2: ['.w....w.', '.w.ww.w.', '..wwww..', '...ww...', '...ww...', '...ww...', '...ww...', '..w..w..', '..w..w..', '..w...w.', '......w.'],
    fall: ['.w.ww.w.', '.w.ww.w.', '..w..w..', '..wwww..', '...ww...', '...ww...', '...ww...', '..wwww..', '.w....w.', '.w....w.', '........'],
    dig: ['...ww...', '...ww...', '........', '..wwwwww', '.w.ww...', 'w..ww...', '...ww...', '...ww...', '..w..w..', '.w....w.', 'w......w']
  };
  FR.climb2 = flip(FR.climb1);
  function frames(pal) {
    const o = {};
    for (const k in FR) o[k] = pair(FR[k], pal);
    return o;
  }
  const RUNNER = frames({ w: '#f8f8f8' });
  const GUARD = frames({ w: '#ff5050' });
  const GUARD_GOLD = frames({ w: '#ffb030' });
  const GOLD = sprite(['..yyyy..', '.ywyyyo.', 'yyyyyyyo', 'yyoyyyyo', 'oooooooo'], { y: '#f8d020', w: '#fffff0', o: '#b08010' });

  ArcadeRegistry.register({
    id: 'loderunner', title: 'Lode Runner', year: 1984, maker: 'Irem',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: run / climb \u00b7 Space: dig left \u00b7 X: dig right \u00b7 Enter: start (in play: give up life)',
    marquee: { bg: '#000', fg: '#f8d020', accent: '#d84020' },
    create(api) {
      // ---------- attract-mode demo: an autopilot plays through the same input layer ----------
      let demo = false, demoT = 0, dKeys = new Set(), dPrev = new Set();
      const A = { tone: (...a) => { if (!demo) api.audio.tone(...a); }, noise: (...a) => { if (!demo) api.audio.noise(...a); }, melody: (...a) => (demo ? 0 : api.audio.melody(...a)) };
      const key = c => (demo ? dKeys.has(c) : api.key(c));
      const pressed = c => (demo ? dKeys.has(c) && !dPrev.has(c) : api.pressed(c));
      let hi = api.getHiScore(20000);
      let state = 'title', T = 0, score = 0, lives = 5, level = 1, coinFlash = 0, loop = 0;
      let g, gold, goldLeft, holes, runner, guards, revealed, popups, clearT, digLock;
      let titleAnim = 0;

      function addScore(n) { score += n; if (!demo && score > hi) hi = score; }
      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; A.tone(98, .28, { type: 'square', vol: .14 }); return false;
      }
      // ---------- sounds ----------
      const sStep = () => A.tone(1800, .012, { type: 'square', vol: .03 });
      const sGold = () => A.melody([[1319, .04], [1760, .04], [2093, .07]], { type: 'square', vol: .1 });
      const sDig = () => { A.noise(.25, { vol: .12, freq: 1200, slideTo: 300 }); };
      const sTrap = () => A.tone(500, .18, { type: 'triangle', vol: .14, slideTo: 200 });
      const sKill = () => A.tone(160, .3, { type: 'sawtooth', vol: .1, slideTo: 60 });
      const sReveal = () => A.melody([[523, .06], [659, .06], [784, .06], [1047, .06], [1319, .06], [1568, .15]], { type: 'square', vol: .12 });
      const sDie = () => A.melody([[880, .08], [698, .08], [587, .08], [440, .08], [349, .08], [294, .3]], { type: 'square', vol: .13 });
      const sClear = () => A.melody([[784, .08], [988, .08], [1175, .08], [1568, .12], [0, .04], [1175, .08], [1568, .3]], { type: 'square', vol: .13 });
      const sStart = () => A.melody([[392, .1], [523, .1], [659, .1], [784, .1], [659, .1], [784, .1], [1047, .3]], { type: 'square', vol: .12 });

      // ---------- map ----------
      const tile = (c, r) => (c < 0 || c >= COLS || r < 0 || r >= ROWS) ? '@' : g[r][c];
      const holeAt = (c, r) => holes.find(h => h.c === c && h.r === r);
      const isOpenHole = (c, r) => { const h = holeAt(c, r); return !!h && h.phase !== 'dig'; };
      const solid = (c, r) => { const t = tile(c, r); return t === '@' || (t === '#' && !isOpenHole(c, r)); };
      const solidStatic = (c, r) => { const t = tile(c, r); return t === '@' || t === '#'; };
      const lad = (c, r) => tile(c, r) === 'H';
      const rope = (c, r) => tile(c, r) === '-';
      const goldAt = (c, r) => gold[r * COLS + c] === 1;
      const allGold = () => goldLeft === 0 && !guards.some(e => e.gold);

      function loadLevel() {
        const src = LEVELS[(level - 1) % LEVELS.length];
        g = []; gold = new Uint8Array(COLS * ROWS); goldLeft = 0; holes = []; guards = []; popups = []; revealed = false;
        for (let r = 0; r < ROWS; r++) {
          const row = (src[r] || '').padEnd(COLS).slice(0, COLS).split('');
          for (let c = 0; c < COLS; c++) {
            const ch = row[c];
            if (ch === '$') { gold[r * COLS + c] = 1; goldLeft++; row[c] = ' '; }
            else if (ch === 'P') { runner = mkEnt(c, r); row[c] = ' '; }
            else if (ch === 'E') { guards.push(mkEnt(c, r)); row[c] = ' '; }
          }
          g.push(row);
        }
        digLock = 0;
      }
      function mkEnt(c, r) { return { c, r, tc: c, tr: r, p: 0, mv: false, kind: 'run', face: 1, anim: 0, gold: false, goldT: 0, st: 'ok', t: 0, outSide: false, dig: 0, wait: 0 }; }
      const ex = e => e.c + (e.tc - e.c) * e.p, ey = e => e.r + (e.tr - e.r) * e.p;
      const cellOf = e => [Math.round(ex(e)), Math.round(ey(e))];
      function guardOn(c, r, except) {
        return guards.find(o => o !== except && o.st !== 'dead' && ((o.c === c && o.r === r) || (o.mv && o.tc === c && o.tr === r)));
      }
      function standOnGuard(c, r, self) { const o = guardOn(c, r + 1, self); return !!o && o.st !== 'spawn' && (o.st === 'trap' || !(o.mv && o.kind === 'fall')); }
      function supported(e) {
        const c = e.c, r = e.r;
        return lad(c, r) || rope(c, r) || solid(c, r + 1) || lad(c, r + 1) || standOnGuard(c, r, e);
      }
      function move(e, c, r, kind) {
        e.tc = c; e.tr = r; e.p = 0; e.mv = true; e.kind = kind;
        if (c !== e.c) e.face = c > e.c ? 1 : -1;
      }

      function startLevel() { loadLevel(); state = 'ready'; T = 0; }
      function startGame() { score = 0; lives = 5; level = 1; loop = 0; startLevel(); sStart(); }

      // ---------- runner ----------
      function tryDig(d) {
        const e = runner, c = e.c, r = e.r, x = c + d, y = r + 1;
        e.face = d;
        const standing = solid(c, r + 1) || lad(c, r + 1) || lad(c, r) || standOnGuard(c, r, e);
        if (!standing || rope(c, r) || y >= ROWS || tile(x, y) !== '#' || holeAt(x, y) || solid(x, r) || lad(x, r) || rope(x, r) || goldAt(x, r) || guardOn(x, r)) {
          A.tone(110, .05, { type: 'square', vol: .06 }); digLock = 10; return;
        }
        holes.push({ c: x, r: y, phase: 'dig', t: 0 });
        e.dig = DIG_T; sDig();
      }
      function runnerArrive() {
        const e = runner;
        if (goldAt(e.c, e.r)) {
          gold[e.r * COLS + e.c] = 0; goldLeft--; addScore(250); sGold();
          popups.push({ x: e.c, y: e.r, t: 40, s: '250' });
          checkReveal();
        }
        if (revealed && e.r === 0) { state = 'clear'; T = 0; clearT = 0; sClear(); }
      }
      function checkReveal() {
        if (revealed || !allGold()) return;
        revealed = true;
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (g[r][c] === 'S') g[r][c] = 'H';
        sReveal();
        if (runner.r === 0 && !runner.mv) runnerArrive();
      }
      function updateRunner() {
        const e = runner;
        const Lk = key('ArrowLeft'), Rk = key('ArrowRight'), U = key('ArrowUp'), D = key('ArrowDown');
        if (digLock > 0) digLock--;
        if (e.dig > 0) { e.dig--; return; }
        if (e.mv) {
          // reverse mid-step
          if (e.kind === 'run' || e.kind === 'rope') {
            const d = e.tc - e.c;
            if ((d > 0 && Lk && !Rk) || (d < 0 && Rk && !Lk)) { const c = e.c; e.c = e.tc; e.tc = c; e.p = 1 - e.p; e.face = -e.face; }
          } else if (e.kind === 'climb') {
            const d = e.tr - e.r;
            if ((d < 0 && D && !U) || (d > 0 && U && !D && lad(e.tc, e.tr))) { const r = e.r; e.r = e.tr; e.tr = r; e.p = 1 - e.p; }
          }
          const sp = e.kind === 'fall' ? 0.13 : e.kind === 'climb' ? 0.085 : 0.1;
          e.p += sp; e.anim++;
          if (e.kind !== 'fall' && (e.anim % 6) === 0) sStep();
          if (e.p >= 1) { e.c = e.tc; e.r = e.tr; e.p = 0; e.mv = false; runnerArrive(); if (state !== 'play') return; }
          else return;
        }
        const c = e.c, r = e.r;
        if (!supported(e)) { if (r < ROWS - 1) { move(e, c, r + 1, 'fall'); A.tone(900 - r * 30, .1, { type: 'triangle', vol: .05 }); } return; }
        if (digLock === 0) {
          if (key('Space') || key('KeyZ')) { tryDig(-1); return; }
          if (key('KeyX')) { tryDig(1); return; }
        }
        if (U && lad(c, r) && r > 0 && !solid(c, r - 1)) { move(e, c, r - 1, 'climb'); return; }
        if (D && r < ROWS - 1 && !solid(c, r + 1) && !guardOn(c, r + 1)) { move(e, c, r + 1, lad(c, r + 1) || lad(c, r) ? 'climb' : 'fall'); return; }
        if (Lk || Rk) {
          const d = Lk ? -1 : 1; e.face = d;
          if (!solid(c + d, r)) move(e, c + d, r, rope(c + d, r) ? 'rope' : 'run');
        }
      }

      // ---------- guards ----------
      function guardMoves(c, r, self) {
        const out = [];
        const sup = lad(c, r) || rope(c, r) || solidStatic(c, r + 1) || lad(c, r + 1);
        if (!sup) { if (r < ROWS - 1) out.push([c, r + 1, 'fall']); return out; }
        if (!solidStatic(c - 1, r)) out.push([c - 1, r, rope(c - 1, r) ? 'rope' : 'run']);
        if (!solidStatic(c + 1, r)) out.push([c + 1, r, rope(c + 1, r) ? 'rope' : 'run']);
        if (lad(c, r) && r > 0 && !solidStatic(c, r - 1)) out.push([c, r - 1, 'climb']);
        if (r < ROWS - 1 && !solidStatic(c, r + 1)) out.push([c, r + 1, lad(c, r + 1) || lad(c, r) ? 'climb' : 'fall']);
        return out;
      }
      function bfsStep(e) {
        const [pc, pr] = cellOf(runner);
        const start = e.r * COLS + e.c, goal = pr * COLS + pc;
        const prev = new Int16Array(COLS * ROWS).fill(-1), first = new Array(COLS * ROWS);
        prev[start] = start; const q = [start];
        let found = -1, best = start, bestD = 1e9;
        while (q.length) {
          const k = q.shift(), c = k % COLS, r = (k / COLS) | 0;
          const d = Math.abs(r - pr) * 3 + Math.abs(c - pc);
          if (d < bestD) { bestD = d; best = k; }
          if (k === goal) { found = k; break; }
          for (const m of guardMoves(c, r, e)) {
            const nk = m[1] * COLS + m[0];
            if (prev[nk] !== -1) continue;
            prev[nk] = k; first[nk] = k === start ? m : first[k]; q.push(nk);
          }
        }
        const tgt = found >= 0 ? found : best;
        return tgt === start ? null : first[tgt];
      }
      function guardSpeed() { return Math.min(0.088, 0.052 + (level - 1) * 0.0013 + loop * 0.01); }
      function respawnGuard(e) {
        const opts = [];
        for (let r = 0; r < 3 && !opts.length; r++) for (let c = 0; c < COLS; c++) if (tile(c, r) === ' ' && !goldAt(c, r) && !guardOn(c, r, e) && Math.abs(c - runner.c) + Math.abs(r - runner.r) > 4) opts.push([c, r]);
        const [c, r] = opts.length ? opts[(Math.random() * opts.length) | 0] : [1, 0];
        Object.assign(e, mkEnt(c, r)); e.st = 'spawn'; e.t = 50;
      }
      function guardArrive(e) {
        const c = e.c, r = e.r;
        if (e.st === 'out') { e.st = 'ok'; e.outSide = true; return; }
        if (isOpenHole(c, r) && tile(c, r) === '#') {
          e.st = 'trap'; e.t = Math.max(70, 130 - level * 2); addScore(75); sTrap();
          popups.push({ x: c, y: r - 1, t: 40, s: '75' });
          if (e.gold) {
            if (r > 0 && !solid(c, r - 1) && !goldAt(c, r - 1) && !lad(c, r - 1) && !rope(c, r - 1)) { gold[(r - 1) * COLS + c] = 1; goldLeft++; e.gold = false; }
          }
          return;
        }
        if (goldAt(c, r) && !e.gold && Math.random() < 0.55) { gold[r * COLS + c] = 0; goldLeft--; e.gold = true; e.goldT = 90 + Math.random() * 300; }
      }
      function updateGuards() {
        const sp = guardSpeed();
        for (const e of guards) {
          e.anim++;
          if (e.st === 'dead') { if (--e.t <= 0) respawnGuard(e); continue; }
          if (e.st === 'spawn') { if (--e.t <= 0) e.st = 'ok'; continue; }
          if (e.gold) e.goldT--;
          if (e.st === 'trap') {
            if (--e.t <= 0) {
              if (!solid(e.c, e.r - 1) && !guardOn(e.c, e.r - 1, e)) { e.st = 'out'; move(e, e.c, e.r - 1, 'climb'); }
              else e.t = 10;
            }
            continue;
          }
          if (e.mv) {
            const k = e.kind === 'fall' ? 0.11 : e.kind === 'climb' ? sp * 0.85 : sp;
            e.p += k * (e.st === 'out' ? 0.6 : 1);
            if (e.p >= 1) { e.c = e.tc; e.r = e.tr; e.p = 0; e.mv = false; guardArrive(e); }
            continue;
          }
          if (e.wait > 0) { e.wait--; continue; }
          const c = e.c, r = e.r;
          if (e.outSide) {
            e.outSide = false;
            const pref = runner.c >= c ? 1 : -1;
            for (const d of [pref, -pref]) if (!solid(c + d, r) && !guardOn(c + d, r, e)) { move(e, c + d, r, rope(c + d, r) ? 'rope' : 'run'); break; }
            if (e.mv) continue;
          }
          if (!supported(e)) {
            if (r < ROWS - 1 && !guardOn(c, r + 1, e)) move(e, c, r + 1, 'fall');
            continue;
          }
          // drop carried gold
          if (e.gold && e.goldT <= 0 && tile(c, r) === ' ' && !goldAt(c, r) && solid(c, r + 1)) { gold[r * COLS + c] = 1; goldLeft++; e.gold = false; }
          let m = Math.random() < 0.08 ? null : bfsStep(e);
          if (!m) { const opts = guardMoves(c, r, e); m = opts.length ? opts[(Math.random() * opts.length) | 0] : null; }
          if (m) {
            if (solid(m[0], m[1]) || guardOn(m[0], m[1], e)) { e.wait = 6; continue; }
            move(e, m[0], m[1], m[2]);
          }
        }
      }

      // ---------- holes ----------
      function updateHoles() {
        for (let i = holes.length - 1; i >= 0; i--) {
          const h = holes[i]; h.t++;
          if (h.phase === 'dig' && h.t >= DIG_T) { h.phase = 'open'; h.t = 0; }
          else if (h.phase === 'open' && h.t >= OPEN_T) { h.phase = 'fill'; h.t = 0; }
          else if (h.phase === 'fill' && h.t >= FILL_T) {
            holes.splice(i, 1);
            const [rc, rr] = cellOf(runner);
            if (rc === h.c && rr === h.r) { die(); }
            for (const e of guards) {
              if (e.st === 'dead' || e.st === 'spawn') continue;
              const [gc, gr] = cellOf(e);
              if ((gc === h.c && gr === h.r) || (e.c === h.c && e.r === h.r && (e.st === 'trap' || e.st === 'out'))) {
                e.st = 'dead'; e.t = 70; e.mv = false; addScore(75); sKill();
                popups.push({ x: h.c, y: h.r - 1, t: 40, s: '75' });
                if (e.gold) { e.gold = false; checkGoldLost(); }
              }
            }
          }
        }
      }
      function checkGoldLost() {
        // a crushed guard's gold reappears near the top so the level stays winnable
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          if (tile(c, r) === ' ' && !goldAt(c, r) && (solid(c, r + 1) || lad(c, r + 1))) { gold[r * COLS + c] = 1; goldLeft++; return; }
        }
        checkReveal();
      }

      function die() {
        if (state !== 'play') return;
        state = 'dying'; T = 0; sDie();
      }
      function updatePlay() {
        if (pressed('Enter')) { die(); return; }
        updateHoles(); if (state !== 'play') return;
        updateRunner(); if (state !== 'play') return;
        updateGuards();
        const rx = ex(runner), ry = ey(runner);
        for (const e of guards) {
          if (e.st === 'dead' || e.st === 'spawn') continue;
          if (Math.abs(ex(e) - rx) < 0.7 && Math.abs(ey(e) - ry) < 0.75) { die(); return; }
        }
        for (let i = popups.length - 1; i >= 0; i--) if (--popups[i].t <= 0) popups.splice(i, 1);
      }

      // ---------- demo autopilot ----------
      function startDemo() {
        demo = true; demoT = 0; dKeys = new Set(); dPrev = new Set();
        startGame(); level = 1 + ((Math.random() * 8) | 0); startLevel(); T = 60;
      }
      function endDemo() { demo = false; dKeys = new Set(); score = 0; state = 'title'; T = 0; }
      function runnerMoves(c, r) {
        const out = [];
        const sup = lad(c, r) || rope(c, r) || solid(c, r + 1) || lad(c, r + 1);
        if (!sup) { if (r < ROWS - 1) out.push([c, r + 1]); }
        else {
          for (const d of [-1, 1]) if (!solid(c + d, r)) out.push([c + d, r]);
          if (lad(c, r) && r > 0 && !solid(c, r - 1)) out.push([c, r - 1]);
          if (r < ROWS - 1 && !solid(c, r + 1)) out.push([c, r + 1]);
        }
        return out.filter(([x, y]) => !guards.some(o => o.st !== 'dead' && o.st !== 'trap' && Math.abs(ex(o) - x) < 1.6 && Math.abs(ey(o) - y) < 1.2));
      }
      function pathStep(goal) {
        const start = runner.r * COLS + runner.c, prev = new Int16Array(COLS * ROWS).fill(-1), first = [];
        prev[start] = start; const q = [start];
        while (q.length) {
          const k = q.shift(), c = k % COLS, r = (k / COLS) | 0;
          if (k !== start && goal(c, r)) return first[k];
          for (const m of runnerMoves(c, r)) {
            const nk = m[1] * COLS + m[0];
            if (prev[nk] !== -1) continue;
            prev[nk] = k; first[nk] = k === start ? m : first[k]; q.push(nk);
          }
        }
        return null;
      }
      function demoAI() {
        const k = new Set(), e = runner;
        if (state !== 'play' || e.mv || e.dig > 0) return k;
        // a guard closing in on the same row: dig a hole in its path
        for (const o of guards) {
          if (o.st !== 'ok' || Math.round(ey(o)) !== e.r) continue;
          const dx = ex(o) - e.c;
          if (Math.abs(dx) < 3.5 && Math.abs(dx) > 1.2 && digLock === 0) { k.add(dx < 0 ? 'Space' : 'KeyX'); return k; }
        }
        const m = pathStep(revealed ? (c, r) => r === 0 : (c, r) => goldAt(c, r));
        if (!m) { if ((demoT & 63) === 0) k.add((demoT & 64) ? 'Space' : 'KeyX'); return k; }
        if (m[0] < e.c) k.add('ArrowLeft'); else if (m[0] > e.c) k.add('ArrowRight');
        else if (m[1] < e.r) k.add('ArrowUp'); else if (m[1] > e.r) k.add('ArrowDown');
        return k;
      }

      function update() {
        T++; if (coinFlash > 0) coinFlash--; titleAnim++;
        if (demo) {
          if (api.anyPressed('Enter', 'Space')) { endDemo(); return; }
          dPrev = dKeys; dKeys = demoAI();
          if (++demoT > 2700 || state === 'clear') { endDemo(); return; }
        }
        switch (state) {
          case 'title':
            if (api.anyPressed('Enter', 'Space') && tryStart()) startGame();
            else if (T > 720) startDemo();
            break;
          case 'ready':
            if (T >= 120 || (T > 30 && api.anyPressed('ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'))) { state = 'play'; T = 0; }
            break;
          case 'play': updatePlay(); break;
          case 'dying':
            if (T >= 120 && demo) { endDemo(); break; }
            if (T >= 120) {
              const respawn = () => { startLevel(); };
              const over = () => { state = 'over'; T = 0; api.setHiScore(score); };
              lives--;
              if (lives <= 0) { if (api.offerContinue) api.offerContinue(() => { lives = 5; respawn(); }, over); else over(); }
              else respawn();
            }
            break;
          case 'clear':
            clearT++;
            if (clearT === 30) { addScore(1500); lives = Math.min(lives + 1, 99); }
            if (clearT > 150) { level++; if (level > LEVELS.length) { level = 1; loop++; } startLevel(); }
            break;
          case 'over':
            if (T >= 240 || (T > 60 && api.anyPressed('Enter', 'Space'))) { state = 'title'; T = 0; }
            break;
        }
      }

      // ---------- rendering ----------
      function drawBrick(ctx, x, y, h) {
        // h = visible height from the bottom (for digging / refilling)
        if (h <= 0) return;
        const top = y + TH - h;
        ctx.fillStyle = '#c84818'; ctx.fillRect(x, top, TW, h);
        ctx.fillStyle = '#f08840'; if (h >= TH) ctx.fillRect(x, y, TW, 1);
        ctx.fillStyle = '#601800';
        const lines = [5, 11];
        for (const ly of lines) if (y + ly >= top) ctx.fillRect(x, y + ly, TW, 1);
        if (y + 1 >= top) ctx.fillRect(x + 4, Math.max(top, y + 1), 1, 4);
        if (y + 6 >= top) { ctx.fillRect(x, Math.max(top, y + 6), 1, 5); }
      }
      function drawTile(ctx, c, r) {
        const t = g[r][c], x = OX + c * TW, y = OY + r * TH;
        if (t === '#' || t === 'X') {
          const h = t === '#' ? holeAt(c, r) : null;
          if (!h) drawBrick(ctx, x, y, TH);
          else if (h.phase === 'dig') drawBrick(ctx, x, y, Math.round(TH * (1 - h.t / DIG_T)));
          else if (h.phase === 'fill') drawBrick(ctx, x, y, Math.round(TH * h.t / FILL_T));
        } else if (t === '@') {
          ctx.fillStyle = '#7880a0'; ctx.fillRect(x, y, TW, TH);
          ctx.fillStyle = '#b8c0e0'; ctx.fillRect(x, y, TW, 1); ctx.fillRect(x, y, 1, TH);
          ctx.fillStyle = '#383c58'; ctx.fillRect(x, y + TH - 1, TW, 1); ctx.fillRect(x + TW - 1, y, 1, TH);
        } else if (t === 'H') {
          ctx.fillStyle = '#e8e8f8'; ctx.fillRect(x + 1, y, 1, TH); ctx.fillRect(x + 7, y, 1, TH);
          for (let k = 1; k < TH; k += 4) ctx.fillRect(x + 1, y + k, 7, 1);
        } else if (t === '-') {
          ctx.fillStyle = '#e8e8f8'; ctx.fillRect(x, y + 1, TW, 1);
        }
        if (goldAt(c, r)) ctx.drawImage(GOLD, x + 1, y + 7);
      }
      function entFrame(set, e) {
        const fr = (e.anim >> 3) & 1;
        if (e === runner && e.dig > 0) return set.dig[e.face > 0 ? 0 : 1];
        if (e.st === 'trap') return set.fall[0];
        if (e.mv) {
          if (e.kind === 'fall') return set.fall[0];
          if (e.kind === 'climb') return fr ? set.climb2[0] : set.climb1[0];
          if (e.kind === 'rope') return set[fr ? 'rope2' : 'rope1'][e.face > 0 ? 0 : 1];
          return set[fr ? 'run2' : 'run1'][e.face > 0 ? 0 : 1];
        }
        if (rope(e.c, e.r)) return set.rope1[e.face > 0 ? 0 : 1];
        if (lad(e.c, e.r)) return set.climb1[0];
        return set.run2[e.face > 0 ? 0 : 1];
      }
      function drawEnt(ctx, set, e) {
        const x = Math.round(OX + ex(e) * TW) , y = Math.round(OY + ey(e) * TH) + 1;
        ctx.drawImage(entFrame(set, e), x, y);
      }
      function drawHud(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 197, W, H - 197);
        ctx.fillStyle = '#c84818'; ctx.fillRect(0, 197, W, 2);
        text(ctx, 'SCORE', 4, 203, '#f8d020'); text(ctx, String(score).padStart(7, '0'), 38, 203, '#fff');
        text(ctx, 'MEN', 92, 203, '#f8d020'); text(ctx, String(Math.max(0, lives)).padStart(2, '0'), 114, 203, '#fff');
        text(ctx, 'LEVEL', 136, 203, '#f8d020'); text(ctx, String(level).padStart(3, '0'), 170, 203, '#fff');
        text(ctx, 'HI', 196, 203, '#f8d020'); text(ctx, String(hi).padStart(7, '0').slice(-7), 210, 203, '#fff');
        text(ctx, 'GOLD ' + String(goldLeft).padStart(2, '0'), 4, 213, '#b0b0b0');
        if (revealed) text(ctx, 'ESCAPE TO THE TOP!', 70, 213, (T >> 3) & 1 ? '#f8d020' : '#fff');
      }
      function coinLine(ctx, y) {
        const blink = (T >> 5) & 1;
        if (api.credits === 0) { if (coinFlash > 0 ? (coinFlash >> 2) & 1 : blink) text(ctx, 'INSERT COIN', W / 2, y, '#ff5050', 1, 'center'); }
        else if (blink) text(ctx, 'PUSH START BUTTON', W / 2, y, '#f8d020', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W - 4, H - 10, '#aaa', 1, 'right');
      }
      function renderTitle(ctx) {
        text(ctx, 'HI SCORE ' + String(hi).padStart(7, '0'), W / 2, 4, '#fff', 1, 'center');
        // brick logo band
        for (let c = 0; c < 28; c++) { drawBrick(ctx, OX + c * TW, 18, TH); drawBrick(ctx, OX + c * TW, 78, TH); }
        text(ctx, 'LODE', W / 2, 34, '#f8d020', 3, 'center');
        text(ctx, 'RUNNER', W / 2, 56, '#f8d020', 3, 'center');
        // little chase scene
        const span = 300, t = titleAnim % span;
        const rx = -10 + t * 0.95, gx = rx - 34;
        for (let c = 0; c < 28; c++) drawBrick(ctx, OX + c * TW, 112, TH);
        const fake = { c: 0, r: 0, tc: 0, tr: 0, p: 0, mv: true, kind: 'run', face: 1, anim: titleAnim, st: 'ok' };
        ctx.drawImage(entFrame(RUNNER, fake), Math.round(rx), 101);
        ctx.drawImage(entFrame(GUARD, fake), Math.round(gx), 101);
        ctx.drawImage(entFrame(GUARD, fake), Math.round(gx - 20), 101);
        if (rx < 150) ctx.drawImage(GOLD, 150, 107);
        text(ctx, 'COLLECT ALL THE GOLD', W / 2, 132, '#fff', 1, 'center');
        text(ctx, 'DIG HOLES TO TRAP THE GUARDS', W / 2, 142, '#fff', 1, 'center');
        text(ctx, 'GOLD 250   GUARD 75   LEVEL 1500', W / 2, 156, '#b0b0b0', 1, 'center');
        text(ctx, String(LEVELS.length) + ' LEVELS', W / 2, 166, '#b0b0b0', 1, 'center');
        coinLine(ctx, 182);
        text(ctx, '\u00a9 1984 IREM CORP.', 4, H - 10, '#888');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { renderTitle(ctx); return; }
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) drawTile(ctx, c, r);
        for (const e of guards) {
          if (e.st === 'dead') continue;
          if (e.st === 'spawn' && (e.t >> 2) & 1) continue;
          drawEnt(ctx, e.gold ? GUARD_GOLD : GUARD, e);
        }
        if (state === 'dying') {
          const x = Math.round(OX + ex(runner) * TW), y = Math.round(OY + ey(runner) * TH) + 1;
          if (T < 60) { if ((T >> 2) & 1) ctx.drawImage(RUNNER.fall[0], x, y); }
          else { ctx.fillStyle = '#fff'; const k = T - 60; for (let i = 0; i < 8; i++) ctx.fillRect(x + 4 + Math.round(Math.cos(i * 0.8) * k * 0.4), y + 5 + Math.round(Math.sin(i * 0.8) * k * 0.4), 1, 1); }
        } else drawEnt(ctx, RUNNER, runner);
        for (const p of popups) text(ctx, p.s, OX + p.x * TW + 4, OY + p.y * TH - (40 - p.t) * 0.2, '#fff', 1, 'center');
        drawHud(ctx);
        if (state === 'ready') {
          ctx.fillStyle = '#000'; ctx.fillRect(78, 82, 100, 28);
          text(ctx, 'LEVEL ' + String(level).padStart(3, '0'), W / 2, 86, '#f8d020', 1, 'center');
          text(ctx, 'READY', W / 2, 98, (T >> 3) & 1 ? '#fff' : '#888', 1, 'center');
        }
        if (state === 'clear') {
          ctx.fillStyle = '#000'; ctx.fillRect(68, 82, 120, 28);
          text(ctx, 'LEVEL CLEAR!', W / 2, 86, '#f8d020', 1, 'center');
          if (clearT >= 30) text(ctx, 'BONUS 1500  +1 MAN', W / 2, 98, '#fff', 1, 'center');
        }
        if (state === 'over') { ctx.fillStyle = '#000'; ctx.fillRect(68, 86, 120, 24); text(ctx, 'GAME OVER', W / 2, 91, '#ff5050', 2, 'center'); }
        if (demo) {
          ctx.fillStyle = '#000'; ctx.fillRect(0, 208, 128, 16);
          text(ctx, 'DEMO PLAY', 4, 213, '#f8d020');
          if ((T >> 5) & 1) text(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', 64, 213, api.credits > 0 ? '#fff' : '#ff5050');
        }
      }

      return { update, render, destroy() { if (!demo) api.setHiScore(score); } };
    }
  });
})();
