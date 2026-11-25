// Donkey Kong (Nintendo, 1981) \u2014 browser recreation for Arcade Games Galore.
// All graphics are hand-made pixel art defined below as string arrays; no external assets.
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Pixel helpers (font, sprites)
  // ---------------------------------------------------------------------------
  const FONTSRC = "01c26636363321c10c1c0c0c0c0c3f23e63071e3c707f33f060c1e03633e40e1e36667f060657e607e0303633e61e30607e63633e77f63060c18181883c62723c4f433e93e63633f03063cA1c3663637f6363B7e63637e63637eC1e33606060331eD7c66636363667cE7f60607e60607fF7f60607e606060G1f30606763331fH6363637f636363I3f0c0c0c0c0c3fJ0703030363633eK63666c787c6e67L3030303030303fM63777f7f6b6363N63737b7f6f6763O3e63636363633eP7e6363637e6060Q3e6363636f663dR7e6363677c6e67S3c66603e03633eT7e181818181818U6363636363633eV636363773e1c08W63636b7f7f7763X63773e1c3e7763Y6666663c181818Z7f070e1c38707f 00000000000000.00000000001818,00000000181830-0000003e000000!18181818180018?3e63060c0c000c=00007e007e0000:00181800181800'18183000000000\"6c6c4800000000/03060c18306000(0c18303030180c)180c0606060c18@1e214d514d211e*002a1c3e1c2a00+0008083e080800%62640810264600<060c1830180c06>30180c060c1830#14147f147f1414";
  const FONT = {};
  for (let i = 0; i + 15 <= FONTSRC.length; i += 15) {
    const rows = [];
    for (let r = 0; r < 7; r++) rows.push(parseInt(FONTSRC.substr(i + 1 + r * 2, 2), 16));
    FONT[FONTSRC[i]] = rows;
  }
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return c; }
  const glyphCache = new Map();
  function glyph(ch, col) {
    const k = ch + col; let g = glyphCache.get(k);
    if (g) return g;
    const rows = FONT[ch]; if (!rows) return null;
    g = mk(7, 7); const x = g.getContext('2d'); x.fillStyle = col;
    for (let r = 0; r < 7; r++) for (let b = 0; b < 7; b++) if (rows[r] & (64 >> b)) x.fillRect(b, r, 1, 1);
    glyphCache.set(k, g); return g;
  }
  function txt(ctx, s, x, y, col) {
    s = String(s).toUpperCase();
    for (let i = 0; i < s.length; i++) { const g = glyph(s[i], col || '#fff'); if (g) ctx.drawImage(g, x + i * 8, y); }
  }
  function txtC(ctx, s, y, col, w) { s = String(s); txt(ctx, s, Math.round(((w || 224) - s.length * 8) / 2), y, col); }
  function spr(rows, pal) {
    let w = 0; for (const r of rows) w = Math.max(w, r.length);
    const c = mk(w, rows.length), x = c.getContext('2d');
    for (let j = 0; j < rows.length; j++) {
      const r = rows[j];
      for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } }
    }
    return c;
  }
  function flip(c) { const o = mk(c.width, c.height), x = o.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return o; }
  function vflip(c) { const o = mk(c.width, c.height), x = o.getContext('2d'); x.translate(0, c.height); x.scale(1, -1); x.drawImage(c, 0, 0); return o; }
  function rot(c, q) {
    q = ((q % 4) + 4) % 4; if (!q) return c;
    const w = c.width, h = c.height, o = (q & 1) ? mk(h, w) : mk(w, h), x = o.getContext('2d');
    x.translate(o.width / 2, o.height / 2); x.rotate(q * Math.PI / 2); x.drawImage(c, -w / 2, -h / 2); return o;
  }
  // DK body halves are drawn as a left half and mirrored.
  function mirror(left, right) { return left.map((r, i) => r + (right || left)[i].split('').reverse().join('')); }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const chance = p => Math.random() < p;

  // ---------------------------------------------------------------------------
  // Pixel art
  // ---------------------------------------------------------------------------
  const PAL_MARIO = { R: '#f42020', B: '#2060ff', S: '#ffb48c', H: '#6a2a00' };
  const MARIO_STAND = [
    '.....RRRRR......',
    '....RRRRRRRRR...',
    '....HHHSSHS.....',
    '...HSHSSSHSSS...',
    '...HSHHSSSHSSS..',
    '...HHSSSSHHHH...',
    '.....SSSSSSS....',
    '....BBRBBB......',
    '...BBBRBBRBBB...',
    '..BBBBRRRRBBBB..',
    '..SSBRSRRSRBSS..',
    '..SSSRRRRRRSSS..',
    '..SSRRRRRRRRSS..',
    '....RRR..RRR....',
    '...HHH....HHH...',
    '..HHHH....HHHH..'];
  const MARIO_WALK_A = [
    '.....RRRRR......',
    '....RRRRRRRRR...',
    '....HHHSSHS.....',
    '...HSHSSSHSSS...',
    '...HSHHSSSHSSS..',
    '...HHSSSSHHHH...',
    '.....SSSSSSS....',
    '...BBBRBBBR.....',
    '.SSBBBRBBBRBSS..',
    '.SSBBBRRRRRBSS..',
    '..SBBRSRRSRRS...',
    '....RRRRRRRR....',
    '...RRRRRRRRRR...',
    '..RRRR....RRRR..',
    '.HHHH......HHHH.',
    '.HHHHH....HHHHH.'];
  const MARIO_WALK_B = [
    '.....RRRRR......',
    '....RRRRRRRRR...',
    '....HHHSSHS.....',
    '...HSHSSSHSSS...',
    '...HSHHSSSHSSS..',
    '...HHSSSSHHHH...',
    '.....SSSSSSS....',
    '.....BBRBB......',
    '....BBBRBBB.....',
    '....BBRRRBBS....',
    '....SSRSRRSS....',
    '....SSRRRRR.....',
    '.....RRRRRR.....',
    '.....RRRRRR.....',
    '.....HHHHHH.....',
    '.....HHHHHHH....'];
  const MARIO_JUMP = [
    '.....RRRRR...SS.',
    '....RRRRRRRRRSS.',
    '....HHHSSHS..BB.',
    '...HSHSSSHSSSBB.',
    '...HSHHSSSHSSBB.',
    '...HHSSSSHHHHB..',
    '.....SSSSSSSB...',
    '..BBBBBRBBBR....',
    '.BBBBBBRBBBR....',
    'SSBBBBBRRRRR....',
    'SSS.RRRSRRSR....',
    '.S..RRRRRRRRR...',
    '...RRRRRRRRRRR..',
    '..RRRR....RRRRH.',
    '.HHHH......HHHH.',
    '.HHH........HHH.'];
  const MARIO_CLIMB = [
    '..SS............',
    '..SS.RRRRRR.....',
    '..BBRRRRRRRR....',
    '..BBRRRRRRRR....',
    '..BBHHHHHHHH....',
    '..BBHHHHHHHH....',
    '...BBHHHHHH.....',
    '...BBBSSSSBB....',
    '....BBBBBBBBB...',
    '....BRBBBBRBBSS.',
    '....RRRRRRRRBSS.',
    '....RRRRRRRR....',
    '....RRRR.RRR....',
    '....RRRR.RRR....',
    '...HHHH..RRR....',
    '...HHHH..HHHH...'];
  const MARIO_ICON = [
    '..RRR..',
    '.RRRRR.',
    '.HSSH..',
    '.SSSSS.',
    'BRBBRB.',
    '.RRRR..',
    '.R..R..',
    'HH..HH.'];
  const HALO = ['..YYYY..', '.Y....Y.', '..YYYY..'];
  const HAMMER = [
    '.MMMMMM.',
    'MMMMMMMM',
    'MLMMMMMM',
    'MMMMMMMM',
    '.MMMMMM.',
    '...NN...',
    '...NN...',
    '...NN...',
    '...NN...',
    '...NN...',
    '...NN...'];
  const PAL_HAMMER = { M: '#c87020', L: '#ffd090', N: '#ffd8a8' };

  const PAL_PAULINE = { O: '#f86818', S: '#ffc0a0', K: '#202020', R: '#e01010', P: '#ff6cb0', W: '#ffffff', Q: '#d03888' };
  const PAULINE_A = [
    '....OOOOO.......',
    '...OOOOOOO......',
    '..OOOOOSSSO.....',
    '..OOOOSSKSS.....',
    '..OOOOSSSSSS....',
    '.OOOOOSSSRR.....',
    '.OOOOOOSSS......',
    '..OOOOPPWPP.....',
    '...OOPPPWPPP....',
    '...OPPPPPPPPS...',
    '....PPPPPPP.SS..',
    '....QQQQQQQ.....',
    '....PPPPPPP.....',
    '...PPPPPPPPP....',
    '...PPPPPPPPP....',
    '..PPPPPPPPPPP...',
    '..PPPPPPPPPPP...',
    '.PPPPPPPPPPPPP..',
    '.QPQPQPQPQPQPQ..',
    '....SS...SS.....',
    '....SS...SS.....',
    '...WWW..WWW.....'];
  const PAULINE_B = [
    '....OOOOO.......',
    '...OOOOOOO......',
    '..OOOOOSSSO.....',
    '..OOOOSSKSS..SS.',
    '..OOOOSSSSSS.SS.',
    '.OOOOOSSSRR..PP.',
    '.OOOOOOSSS..PP..',
    '..OOOOPPWPPPP...',
    '...OOPPPWPPP....',
    '...OPPPPPPPP....',
    '....PPPPPPP.....',
    '....QQQQQQQ.....',
    '....PPPPPPP.....',
    '...PPPPPPPPP....',
    '..PPPPPPPPPP....',
    '..PPPPPPPPPPP...',
    '.PPPPPPPPPPPP...',
    '.PPPPPPPPPPPPP..',
    'QPQPQPQPQPQPQ...',
    '....SS...SS.....',
    '....SS...SS.....',
    '...WWW..WWW.....'];

  // Donkey Kong: brown fur, tan skin, white eyes/teeth
  const PAL_DK = { D: '#a8400c', E: '#6e2400', T: '#ffb878', W: '#ffffff', K: '#3c1000' };
  const DK_HALF = [
    '..............DDDDDD',
    '............DDDDDDDD',
    '...........DDDDDDDDD',
    '..........DDDDDDDDDD',
    '..........DDDDDTTTTT',
    '..........DDDDTWWWTT',
    '..........DDDTTWKWTT',
    '..........DDDTTWWWTT',
    '..........DDDTTTTTTT',
    '...........DDTTTTTKT',
    '......DDDDDDDTTTTTTT',
    '....DDDDDDDDDTTTTTTT',
    '...DDDDDDDDDDTTWWWWW',
    '..DDDDDDDDDDDDTTTTTT',
    '..DDDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDTTT',
    '.DDDDDDDDDDDDDDTTTTT',
    '.DDDDEDDDDDDDTTTTTTT',
    'DDDDE.DDDDDDDTTTTTTT',
    'DDDDE..DDDDDDTTTTTTT',
    'DDDD...DDDDDDDTTTTTT',
    'DDDD...DDDDDDDDTTTTT',
    'DDDD....DDDDDDDDDDDD',
    'DDDD....DDDDDDDDDDDD',
    'TTTT....DDDDDDDDDDDD',
    'TTTTT...DDDDDDD..DDD',
    'TTTTT...DDDDDD....DD',
    'TT.TT...DDDDDD......',
    '........TTTTTTT.....',
    '.......TTTTTTTT.....',
    '......TTTTTTTTT.....',
    '....................'];
  const DK_HALF_UP = [
    '..............DDDDDD',
    '............DDDDDDDD',
    '...........DDDDDDDDD',
    '..........DDDDDDDDDD',
    '..........DDDDDTTTTT',
    '..TTT.....DDDDTWWWTT',
    '.TTTTT....DDDTTWKWTT',
    '.TTTTT....DDDTTWWWTT',
    '.TTTTT....DDDTTTTTTT',
    '.DDDDD.....DDTTTTTKT',
    '.DDDDDDDDDDDDTTTTTTT',
    '.DDDDDDDDDDDDTTTTTTT',
    '..DDDDDDDDDDDTTWWWWW',
    '...DDDDDDDDDDTTTTTTT',
    '....DDDDDDDDDDDDDDDD',
    '.....DDDDDDDDDDDDTTT',
    '.....DDDDDDDDDDTTTTT',
    '......DDDDDDDDTTTTTT',
    '......DDDDDDDTTTTTTT',
    '.......DDDDDDTTTTTTT',
    '.......DDDDDDDTTTTTT',
    '.......DDDDDDDDTTTTT',
    '........DDDDDDDDDDDD',
    '........DDDDDDDDDDDD',
    '........DDDDDDDDDDDD',
    '........DDDDDDD..DDD',
    '........DDDDDD....DD',
    '........DDDDDD......',
    '........TTTTTTT.....',
    '.......TTTTTTTT.....',
    '......TTTTTTTTT.....',
    '....................'];
  // grinning variant: open mouth row
  const DK_HALF_GRIN = DK_HALF.map((r, i) => i === 11 ? '....DDDDDDDDDTWWWWWW' : i === 12 ? '...DDDDDDDDDDTWKKKKK' : i === 13 ? '..DDDDDDDDDDDDTWWWWW' : r);
  const DK_SIDE = [
    '..........DDDDDD................',
    '........DDDDDDDDDD..............',
    '.......DDDDDDDDDDDD.............',
    '......DDDDDDDDDDTTD.............',
    '......DDDDDDDDDTWWTD............',
    '......DDDDDDDDTTWKTT............',
    '.....DDDDDDDDDTTTTTTT...........',
    '.....DDDDDDDDDDTTTTTTT..........',
    '.....DDDDDDDDDDTTTTTKTT.........',
    '....DDDDDDDDDDDDTTTTTTT.........',
    '....DDDDDDDDDDDDDWWWWWW.........',
    '...DDDDDDDDDDDDDDTTTTTT.........',
    '...DDDDDDDDDDDDDDDDDDD..........',
    '..DDDDDDDDDDDDDDDDDDDDDD........',
    '..DDDDDDDDDDDDDDDDDDDDDDDD......',
    '..DDDDDDDDDDDDDDDDDDDDDDDDD.....',
    '..DDDDDDDDDDDDDDEEEEDDDDDDDD....',
    '..DDDDDDDDDDDDDE......DDDDDD....',
    '..DDDDDDDDDDDDD........DDDDDD...',
    '..DDDDDDDDDDDDD.........TTTTTT..',
    '...DDDDDDDDDDDD........TTTTTTT..',
    '...DDDDDDDDDDDD........TTTTTT...',
    '....DDDDDDDDDDDD................',
    '....DDDDDDDDDDDDD...............',
    '....DDDDDD.DDDDDD...............',
    '....DDDDD...DDDDD...............',
    '....DDDDD....DDDD...............',
    '....DDDDD....DDDD...............',
    '...TTTTTT...TTTTTT..............',
    '..TTTTTTT..TTTTTTT..............',
    '................................',
    '................................'];

  // Barrels: rolling (end view, two rotation frames), side view.
  const PAL_BARREL = { D: '#7a2c00', O: '#e88028', Y: '#ffc070' };
  const PAL_BLUEBARREL = { D: '#0828a0', O: '#2c8cff', Y: '#b8e8ff' };
  const BARREL_P = [
    '...DDDDDD...',
    '.DDOOOOOODD.',
    'DOYYODDOOOOD',
    'DOYOODDOOOOD',
    'DDDDDDDDDDDD',
    'DDDDDDDDDDDD',
    'DOOOODDOOOOD',
    'DOOOODDOOOOD',
    '.DDOOOOOODD.',
    '...DDDDDD...'];
  const BARREL_X = [
    '...DDDDDD...',
    '.DDDOOOODDD.',
    'DODDDOODDDOD',
    'DYODDDDDDOOD',
    'DYOODDDDOOOD',
    'DOOODDDDOOOD',
    'DOODDDDDDOOD',
    'DODDDOODDDOD',
    '.DDDOOOODDD.',
    '...DDDDDD...'];
  const BARREL_SIDE = [
    '.DDDDDDDDDDDDDD.',
    'DOODOOOOOOOODOOD',
    'DOODOYYYYYOODOOD',
    'DOODOOOOOOOODOOD',
    'DDDDOOOOOOOODDDD',
    'DDDDOOOOOOOODDDD',
    'DOODOOOOOOOODOOD',
    'DOODOOOOOOOODOOD',
    'DOODOOOOOOOODOOD',
    '.DDDDDDDDDDDDDD.'];

  const PAL_FIRE = { R: '#f82000', O: '#ff9000', Y: '#fff040', W: '#ffffff', K: '#000000' };
  const PAL_FIREFOX = { R: '#ff2860', O: '#ff7000', Y: '#ffd040', W: '#ffffff', K: '#000000' };
  const PAL_FIREBLUE = { R: '#1830ff', O: '#30a0ff', Y: '#b0f0ff', W: '#ffffff', K: '#000040' };
  const FIRE_BODY = [
    '..RRROOYYYYOORR.',
    '.RROOYYYYYYYOORR',
    '.ROOYWWYYYWWYOOR',
    '.ROOYWKYYYWKYOOR',
    '.ROOYYYYYYYYYOOR',
    '.RROOYYYYYYYOORR',
    '..RROOOYYYOOORR.',
    '...RRROOOOORRR..',
    '.....RRRRRRR....'];
  const FIRE_A = [
    '.......R........',
    '......RR....R...',
    '.....RRO...RR...',
    '..R..ROO..ROR...',
    '..RR.ROOORROR.R.',
    '..RORROOOOOORRR.',
    '..ROOOOYYYOOOOR.'].concat(FIRE_BODY);
  const FIRE_B = [
    '........R.......',
    '...R....RR......',
    '...RR...ORR.....',
    '...ROR..OOR..R..',
    '.R.RORROOOR.RR..',
    '.RRROOOOOORRORR.',
    '..ROOOOYYYOOOOR.'].concat(FIRE_BODY);

  const PAL_DRUM = { L: '#8cb4ff', B: '#2048d0', W: '#ffffff', D: '#102880' };
  const DRUM = [
    '.LLLLLLLLLLLLLL.',
    'LLBBBBBBBBBBBBLL',
    '.LLLLLLLLLLLLLL.',
    '.BBBBBBBBBBBBBD.',
    '.BBBBBBBBBBBBBD.',
    '.BBWWWBWBWBBBBD.',
    '.BBWBWBWBWBBBBD.',
    '.BBWBWBWBWBBBBD.',
    '.BBWBWBWBWBBBBD.',
    '.BBWWWBWBWWWBBD.',
    '.BBBBBBBBBBBBBD.',
    '.BBBBBBBBBBBBBD.',
    '.LLLLLLLLLLLLLL.',
    '.BBBBBBBBBBBBBD.',
    'LLBBBBBBBBBBBBLL',
    '.LLLLLLLLLLLLLL.'];
  const FLAME_A = [
    '....R.....R.....',
    '...RR..R..RR..R.',
    '..ROR.RR.ROR.RR.',
    '.ROOR.ROROOORROR',
    '.ROYORROOOYOROOR',
    'ROYYOOOYOYYOOYOR',
    'ROYYYYYYYYYYYYOR',
    'OOYYYYYYYYYYYYOO'];
  const FLAME_B = [
    '.R.....R.....R..',
    '.RR...RR..R..RR.',
    'RORR..ROR.RR.ROR',
    'ROOR.ROORROR.ROR',
    'ROYOROOYOROORROR',
    'ROYOOYOYYOYOOYOR',
    'ROYYYYYYYYYYYYOR',
    'OOYYYYYYYYYYYYOO'];

  const PAL_SPRING = { C: '#c8d0ff', G: '#6070d0', R: '#ff3838' };
  const SPRING_A = [
    '.CCCCCCCCCCCCCC.',
    'GGGGGGGGGGGGGGGG',
    '...RRRRRRRRRR...',
    '....R......R....',
    '...RRRRRRRRRR...',
    '....R......R....',
    '...RRRRRRRRRR...',
    '....R......R....',
    '...RRRRRRRRRR...',
    'GGGGGGGGGGGGGGGG',
    '.CCCCCCCCCCCCCC.'];
  const SPRING_B = [
    '.CCCCCCCCCCCCCC.',
    'GGGGGGGGGGGGGGGG',
    '...RRRRRRRRRR...',
    '...RRRRRRRRRR...',
    '...RRRRRRRRRR...',
    'GGGGGGGGGGGGGGGG',
    '.CCCCCCCCCCCCCC.'];

  const PAL_PIE = { Y: '#ffd070', O: '#e87818', G: '#c0c0c0', D: '#707070', W: '#ffffff' };
  const PIE = [
    '....YYYYYYYY....',
    '..YYYOYYYYOYYY..',
    '.YYOYYYYOYYYOYY.',
    'WGGGGGGGGGGGGGGW',
    '.GGGGGGGGGGGGGG.',
    '..DDDDDDDDDDDD..'];

  const PAL_ITEM = { P: '#ff5ca8', W: '#ffffff', B: '#4078ff', Q: '#c02878' };
  const HAT = [
    '.....PPPPP......',
    '....PPPPPPP.....',
    '....PPPPPPP.....',
    '....PPPPPPP.....',
    '....WWWWWWW.....',
    '..PPPPPPPPPPP...',
    'PPPPPPPPPPPPPPP.',
    '.QQQQQQQQQQQQQ..'];
  const PURSE = [
    '....WWWWW.....',
    '...W.....W....',
    '...W.....W....',
    '.PPPPPPPPPPP..',
    'PPPPPPPPPPPPP.',
    'PPPPWWWWWPPPP.',
    'PPPPPPWPPPPPP.',
    'PPPPPPPPPPPPP.',
    'PPPPPPPPPPPPP.',
    '.QQQQQQQQQQQ..'];
  const UMBRELLA = [
    '.......W........',
    '.....PPPPP......',
    '...PPPPPPPPP....',
    '..PPPPPPPPPPP...',
    '.PPPPPPPPPPPPP..',
    '.PPBPPPBPPPBPP..',
    'PP.PP.PPP.PP.PP.',
    '.......W........',
    '.......W........',
    '.......W........',
    '.......W........',
    '.......W........',
    '.....W.W........',
    '.....WW.........'];
  const HEART = [
    '..PPPP....PPPP..',
    '.PPPPPP..PPPPPP.',
    'PPWWPPPPPPPPPPPP',
    'PPWPPPPPPPPPPPPP',
    'PPPPPPPPPPPPPPPP',
    'PPPPPPPPPPPPPPPP',
    '.PPPPPPPPPPPPPP.',
    '..PPPPPPPPPPPP..',
    '...PPPPPPPPPP...',
    '....PPPPPPPP....',
    '.....PPPPPP.....',
    '......PPPP......',
    '.......PP.......'];
  const HEART_BROKEN = [
    '..PPPP.....PPPP...',
    '.PPPPPP...PPPPPP..',
    'PPWWPPPP..PPPPPPPP',
    'PPWPPPP...PPPPPPPP',
    'PPPPPPPP...PPPPPPP',
    'PPPPPPP...PPPPPPPP',
    '.PPPPPPP...PPPPPP.',
    '..PPPPP...PPPPPP..',
    '...PPPPP...PPPPP..',
    '....PPP...PPPPP...',
    '.....PPP...PPP....',
    '......P...PPP.....',
    '...........P......'];
  const SMASH_A = [
    '................',
    '................',
    '.......Y........',
    '...Y...Y...Y....',
    '....Y.YWY.Y.....',
    '.....YWWWY......',
    '..YYYWWWWWYYY...',
    '.....YWWWY......',
    '....Y.YWY.Y.....',
    '...Y...Y...Y....',
    '.......Y........',
    '................'];
  const SMASH_B = [
    '.......W........',
    '...W...Y...W....',
    '....Y.....Y.....',
    '.....Y...Y......',
    '................',
    'WY....WWW....YW.',
    '................',
    '.....Y...Y......',
    '....Y.....Y.....',
    '...W...Y...W....',
    '.......W........',
    '................'];
  const SMASH_C = [
    '.W.....Y.....W..',
    '................',
    '...Y.......Y....',
    '................',
    '................',
    'Y..............Y',
    '................',
    '................',
    '...Y.......Y....',
    '................',
    '.W.....Y.....W..',
    '................'];
  const PAL_SMASH = { Y: '#ffe040', W: '#ffffff' };
  const RIVET = [
    '.YYYYYY.',
    'YWYYYYYO',
    'YYYYYYYO',
    'YYYYYYYO',
    'YYYYYYYO',
    'YYYYYYYO',
    'YYYYYYYO',
    'YYYYYYYO',
    '.OOOOOO.'];
  const PAL_RIVET = { Y: '#ffd800', W: '#ffffc0', O: '#c08000' };

  const GIRDER_SEG = [
    '################',
    '.#....#..#....#.',
    '..#..#....#..#..',
    '...##......##...',
    '...##......##...',
    '..#..#....#..#..',
    '.#....#..#....#.',
    '################'];

  let SP = null;
  function buildSprites() {
    if (SP) return SP;
    const m = s => spr(s, PAL_MARIO);
    const stand = m(MARIO_STAND), wa = m(MARIO_WALK_A), wb = m(MARIO_WALK_B), jp = m(MARIO_JUMP), cl = m(MARIO_CLIMB);
    const dkFront = spr(mirror(DK_HALF), PAL_DK);
    const dkUpL = spr(mirror(DK_HALF_UP, DK_HALF), PAL_DK);
    const dkUpBoth = spr(mirror(DK_HALF_UP), PAL_DK);
    const dkGrin = spr(mirror(DK_HALF_GRIN), PAL_DK);
    const dkSide = spr(DK_SIDE, PAL_DK);
    const hammer = spr(HAMMER, PAL_HAMMER);
    const fireA = spr(FIRE_A, PAL_FIRE), fireB = spr(FIRE_B, PAL_FIRE);
    SP = {
      mario: { stand: [stand, flip(stand)], wa: [wa, flip(wa)], wb: [wb, flip(wb)], jump: [jp, flip(jp)], climb: [cl, flip(cl)] },
      marioRot: [stand, rot(stand, 1), rot(stand, 2), rot(stand, 3)],
      marioDead: rot(stand, 1),
      halo: spr(HALO, { Y: '#ffe040' }),
      icon: spr(MARIO_ICON, PAL_MARIO),
      hammerUp: [hammer, flip(hammer)],
      hammerDown: [rot(hammer, 1), flip(rot(hammer, 1))],
      pauline: [spr(PAULINE_A, PAL_PAULINE), spr(PAULINE_B, PAL_PAULINE)],
      paulineL: [flip(spr(PAULINE_A, PAL_PAULINE)), flip(spr(PAULINE_B, PAL_PAULINE))],
      dkFront, dkUpL, dkUpR: flip(dkUpL), dkUpBoth, dkGrin, dkSideR: dkSide, dkSideL: flip(dkSide),
      dkFall: vflip(dkFront),
      barrel: [spr(BARREL_P, PAL_BARREL), spr(BARREL_X, PAL_BARREL)],
      barrelBlue: [spr(BARREL_P, PAL_BLUEBARREL), spr(BARREL_X, PAL_BLUEBARREL)],
      barrelSide: spr(BARREL_SIDE, PAL_BARREL),
      barrelSideBlue: spr(BARREL_SIDE, PAL_BLUEBARREL),
      barrelUp: rot(spr(BARREL_SIDE, PAL_BARREL), 1),
      fire: [fireA, fireB], fireL: [flip(fireA), flip(fireB)],
      firefox: [spr(FIRE_A, PAL_FIREFOX), spr(FIRE_B, PAL_FIREFOX)],
      fireBlue: [spr(FIRE_A, PAL_FIREBLUE), spr(FIRE_B, PAL_FIREBLUE)],
      drum: spr(DRUM, PAL_DRUM),
      flame: [spr(FLAME_A, PAL_FIRE), spr(FLAME_B, PAL_FIRE)],
      spring: [spr(SPRING_A, PAL_SPRING), spr(SPRING_B, PAL_SPRING)],
      pie: spr(PIE, PAL_PIE),
      hat: spr(HAT, PAL_ITEM), purse: spr(PURSE, PAL_ITEM), umbrella: spr(UMBRELLA, PAL_ITEM),
      heart: spr(HEART, { P: '#ff4c9c', W: '#ffd0e8' }),
      heartBroken: spr(HEART_BROKEN, { P: '#ff4c9c', W: '#ffd0e8' }),
      smash: [spr(SMASH_A, PAL_SMASH), spr(SMASH_B, PAL_SMASH), spr(SMASH_C, PAL_SMASH)],
      rivet: spr(RIVET, PAL_RIVET),
      girder: {}
    };
    return SP;
  }
  function girderSprite(col, hi) {
    const key = col + hi;
    if (SP.girder[key]) return SP.girder[key];
    const rows = GIRDER_SEG.map((r, i) => (i === 0 ? r.replace(/#/g, 'H') : r));
    return (SP.girder[key] = spr(rows, { '#': col, H: hi }));
  }

  // ---------------------------------------------------------------------------
  // Stage geometry
  // ---------------------------------------------------------------------------
  // A girder/platform: { x0, x1, top(x), roll (barrel roll direction), conv (conveyor speed), kind, goal }
  function plat(x0, x1, y, o) { const p = Object.assign({ x0, x1, y, kind: 'girder', solid: true }, o || {}); if (!p.top) p.top = function () { return this.y; }; return p; }
  function seg(x) { return Math.floor(x / 16); }

  const STAGE_COLORS = {
    25: { girder: '#ff1c54', hi: '#ff8cb0', ladder: '#00e8e8' },
    50: { girder: '#f88838', hi: '#ffd080', ladder: '#ffd800', belt: '#e8401c' },
    75: { girder: '#ff1c54', hi: '#ff8cb0', ladder: '#00e8e8' },
    100: { girder: '#2850ff', hi: '#90a8ff', ladder: '#ffd800' }
  };

  function ladder(x, upper, lower, o) {
    return Object.assign({
      x, upper, lower, broken: false,
      get top() { return this.upper.top(this.x); },
      get bot() { return this.lower.top(this.x) - (this.raise || 0); }
    }, o || {});
  }

  function build25() {
    const flat = [248, 214, 181, 148, 115, 84];
    const fns = [
      x => { const k = seg(x); return k < 7 ? 248 : 248 - (k - 6); },
      x => 208 + seg(x),
      x => 175 + (13 - seg(x)),
      x => 142 + seg(x),
      x => 109 + (13 - seg(x)),
      x => { const k = seg(x); return k < 9 ? 84 : 84 + (k - 8); }
    ];
    const ranges = [[0, 224], [0, 208], [16, 224], [0, 208], [16, 224], [0, 208]];
    const rolls = [-1, 1, -1, 1, -1, 1];
    const g = [];
    for (let i = 0; i < 6; i++) {
      const f = fns[i], fl = flat[i];
      g.push(plat(ranges[i][0], ranges[i][1], 0, {
        idx: i, roll: rolls[i], bend: 1, sloped: true,
        top(x) { const xs = Math.max(this.x0, Math.min(this.x1 - 1, x)); return Math.round(fl + (f(xs) - fl) * this.bend); }
      }));
    }
    const P = plat(88, 136, 56, { goal: true, idx: 6 });
    g.push(P);
    const L = [
      ladder(80, g[1], g[0], { broken: true }), ladder(184, g[1], g[0]),
      ladder(32, g[2], g[1]), ladder(96, g[2], g[1]),
      ladder(64, g[3], g[2], { broken: true }), ladder(112, g[3], g[2]), ladder(184, g[3], g[2]),
      ladder(32, g[4], g[3]), ladder(104, g[4], g[3]), ladder(160, g[4], g[3], { broken: true }),
      ladder(72, g[5], g[4], { broken: true }), ladder(184, g[5], g[4]),
      ladder(128, P, g[5], { noEnemy: true })
    ];
    return {
      kind: 25, plats: g, ladders: L, bottom: g[0], dkGirder: g[5],
      hammers: [{ x: 44, g: g[4] }, { x: 160, g: g[1] }],
      items: [],
      start: { x: 72, g: g[0], dir: 1 },
      dk: { x: 22, y: 84 }, pauline: { x: 100, y: 56 },
      drum: { x: 16, y: 248 }
    };
  }

  function build50() {
    const F0 = plat(0, 224, 248);
    const C1 = plat(16, 208, 208, { kind: 'belt', conv: 0.5 });
    const C2L = plat(0, 96, 168, { kind: 'belt', conv: 0.5 });
    const C2R = plat(128, 224, 168, { kind: 'belt', conv: -0.5 });
    const F3 = plat(16, 208, 128);
    const C4 = plat(0, 224, 88, { kind: 'belt', conv: 0.5, goal: true });
    const P = plat(88, 136, 56, { deco: true });
    const L = [
      ladder(24, C1, F0), ladder(112, C1, F0), ladder(200, C1, F0),
      ladder(48, C2L, C1), ladder(176, C2R, C1),
      ladder(24, F3, C2L), ladder(80, F3, C2L), ladder(144, F3, C2R), ladder(200, F3, C2R),
      ladder(40, C4, F3, { retract: true, raise: 0, phase: 0 }), ladder(184, C4, F3, { retract: true, raise: 0, phase: 1 })
    ];
    return {
      kind: 50, plats: [F0, C1, C2L, C2R, F3, C4, P], ladders: L, belts: { C1, C2L, C2R, C4 },
      hammers: [{ x: 72, g: C1 }, { x: 176, g: F3 }],
      items: [{ x: 208, g: C2R, k: 'hat' }, { x: 112, g: F3, k: 'purse' }, { x: 144, g: C1, k: 'umbrella' }],
      start: { x: 40, g: F0, dir: 1 },
      dk: { x: 92, y: 88 }, pauline: { x: 104, y: 56 },
      fire: { x: 104, y: 168 }
    };
  }

  function build75() {
    const S = plat(0, 32, 232);
    const IL = plat(60, 92, 200), IH = plat(60, 92, 144);
    const R1 = plat(120, 224, 216), R2 = plat(176, 224, 168), T1 = plat(136, 224, 120);
    const T0 = plat(0, 176, 84);
    const P = plat(88, 136, 56, { goal: true });
    const L = [
      ladder(76, IH, IL), ladder(216, R2, R1), ladder(192, T1, R2), ladder(144, T0, T1), ladder(128, P, T0, { noEnemy: true })
    ];
    return {
      kind: 75, plats: [S, IL, IH, R1, R2, T1, T0, P], ladders: L,
      elev: [{ x0: 36, x1: 52, dir: -1, top: 104, bot: 248 }, { x0: 96, x1: 112, dir: 1, top: 104, bot: 248 }],
      hammers: [],
      items: [{ x: 84, g: IH, k: 'purse' }, { x: 160, g: R1, k: 'hat' }, { x: 210, g: T1, k: 'umbrella' }],
      start: { x: 14, g: S, dir: 1 },
      dk: { x: 8, y: 84 }, pauline: { x: 100, y: 56 },
      fireStart: [{ g: IL, x: 80 }, { g: R1, x: 200 }],
      T0
    };
  }

  function build100() {
    const plats = [], L = [], rivets = [];
    const F0 = plat(0, 224, 248);
    plats.push(F0);
    const floors = [F0];
    const ys = [208, 168, 128, 88], x0s = [8, 16, 24, 32];
    for (let i = 0; i < 4; i++) {
      const y = ys[i], a = x0s[i], b = 224 - a;
      const pieces = [plat(a, 52, y), plat(60, 164, y), plat(172, b, y)];
      const r1 = plat(52, 60, y, { rivet: true }), r2 = plat(164, 172, y, { rivet: true });
      plats.push(...pieces, r1, r2);
      rivets.push({ x: 56, g: r1, side: 0 }, { x: 168, g: r2, side: 0 });
      floors.push({ y, pieces, at(x) { return this.pieces.find(p => x >= p.x0 && x < p.x1); } });
    }
    const P = plat(72, 152, 48, { deco: true });
    plats.push(P);
    const fl = (i, x) => (i === 0 ? F0 : floors[i].at(x));
    const add = (i, xs) => xs.forEach(x => L.push(ladder(x, fl(i + 1, x), fl(i, x))));
    add(0, [16, 112, 208]); add(1, [24, 88, 136, 200]); add(2, [32, 112, 192]); add(3, [40, 80, 144, 184]);
    return {
      kind: 100, plats, ladders: L, rivets, floors,
      hammers: [{ x: 184, g: floors[1].at(184) }, { x: 96, g: floors[3].at(96) }],
      items: [{ x: 176, g: floors[4].at(176), k: 'hat' }, { x: 200, g: floors[2].at(200), k: 'umbrella' }, { x: 36, g: floors[1].at(36), k: 'purse' }],
      start: { x: 32, g: F0, dir: 1 },
      dk: { x: 92, y: 88 }, pauline: { x: 104, y: 48 },
      midFloor: floors[4].pieces[1]
    };
  }

  const LEVEL_SEQ = [[25, 100], [25, 75, 100], [25, 50, 75, 100], [25, 50, 25, 75, 100], [25, 50, 25, 75, 25, 100]];

  // ---------------------------------------------------------------------------
  ArcadeRegistry.register({
    id: 'donkeykong',
    title: 'Donkey Kong',
    year: 1981,
    maker: 'Nintendo',
    width: 224, height: 256,
    controls: 'Arrows: move/climb \u00b7 Space: jump \u00b7 Enter: start',
    marquee: { bg: '#0b0b2a', fg: '#ff2a55', accent: '#ffb878' },
    create(api) {
      const sp = buildSprites();
      const au = api.audio;
      const W = 224, H = 256;
      const WALK = 0.9, CLIMB = 0.6, JV = 1.85, GRAV = 0.115;

      const S = {
        mode: 'title', t: 0, score: 0, hi: api.getHiScore(7650), lives: 3, level: 1, stageIdx: 0,
        extra: false, bonus: 5000, stage: null, firstStage: true
      };
      let M = null;          // Mario
      let st = null;         // current stage
      let barrels = [], flames = [], pies = [], springs = [], elevs = [], popups = [], fx = [];
      let dk = null;
      let stT = 0, bonusT = 0, bgmT = 0, stepT = 0, hamMusicT = 0;

      // ---------------- sound ----------------
      const snd = {
        walk() { au.tone(stepT++ & 1 ? 330 : 247, 0.035, { type: 'square', vol: 0.05 }); },
        jump() { au.tone(260, 0.2, { type: 'square', vol: 0.07, slideTo: 620 }); },
        land() { au.tone(150, 0.05, { type: 'triangle', vol: 0.08 }); },
        points() { au.melody([[1319, 0.05], [1760, 0.05], [2093, 0.09]], { type: 'square', vol: 0.06 }); },
        smash() { au.noise(0.3, { vol: 0.25, freq: 3000, slideTo: 200 }); au.tone(600, 0.2, { type: 'square', vol: 0.06, slideTo: 80 }); },
        hammer() { au.melody([[523, 0.06], [659, 0.06], [784, 0.06], [1047, 0.12]], { type: 'square', vol: 0.07 }); },
        stomp() { au.noise(0.35, { vol: 0.35, freq: 400, slideTo: 60 }); au.tone(70, 0.3, { type: 'triangle', vol: 0.25, slideTo: 40 }); },
        throwB() { au.tone(180, 0.12, { type: 'triangle', vol: 0.12, slideTo: 90 }); },
        boing() { au.tone(180, 0.14, { type: 'triangle', vol: 0.12, slideTo: 520 }); },
        rivet() { au.tone(1400, 0.06, { type: 'square', vol: 0.06 }); au.tone(900, 0.08, { type: 'square', vol: 0.05, delay: 0.05 }); },
        item() { au.melody([[784, 0.05], [988, 0.05], [1175, 0.05], [1568, 0.1]], { type: 'square', vol: 0.06 }); },
        drum() { au.noise(0.25, { vol: 0.18, freq: 1200, slideTo: 300 }); },
        fireSpawn() { au.tone(900, 0.15, { type: 'sawtooth', vol: 0.04, slideTo: 300 }); },
        death() {
          au.melody([[1047, 0.07], [988, 0.07], [932, 0.07], [880, 0.07], [831, 0.07], [784, 0.07], [740, 0.07], [698, 0.07], [659, 0.07], [622, 0.07], [587, 0.07], [554, 0.07]], { type: 'square', vol: 0.07, delay: 0.9 });
          au.melody([[0, 0.1], [523, 0.16], [0, 0.04], [392, 0.16], [0, 0.04], [262, 0.4]], { type: 'square', vol: 0.08, delay: 2.0 });
        },
        howHigh() { au.melody([[392, 0.14], [523, 0.14], [587, 0.14], [659, 0.28], [523, 0.14], [659, 0.14], [784, 0.42]], { type: 'square', vol: 0.07 }); au.melody([[131, 0.28], [196, 0.28], [165, 0.28], [196, 0.28], [131, 0.56]], { type: 'triangle', vol: 0.1 }); },
        intro() { au.melody([[196, 0.12], [0, 0.12], [196, 0.12], [0, 0.12], [262, 0.12], [0, 0.12], [262, 0.12], [0, 0.12]], { type: 'triangle', vol: 0.12 }); },
        clear() { au.melody([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.2], [0, 0.05], [784, 0.1], [1047, 0.35]], { type: 'square', vol: 0.07 }); },
        rescue() { au.melody([[784, 0.12], [659, 0.12], [784, 0.12], [1047, 0.24], [988, 0.12], [1047, 0.12], [1175, 0.12], [1319, 0.5]], { type: 'square', vol: 0.07 }); au.melody([[262, 0.24], [330, 0.24], [392, 0.24], [523, 0.48], [392, 0.24], [523, 0.5]], { type: 'triangle', vol: 0.1 }); },
        timer() { au.tone(1760, 0.04, { type: 'square', vol: 0.04 }); },
        start() { au.melody([[262, 0.08], [330, 0.08], [392, 0.08], [523, 0.16]], { type: 'square', vol: 0.07 }); }
      };
      const BGM = {
        25: [131, 0, 196, 0, 165, 0, 196, 0],
        50: [196, 247, 294, 247, 196, 247, 294, 330],
        75: [220, 0, 262, 330, 220, 0, 262, 330],
        100: [175, 220, 262, 220, 196, 247, 294, 247]
      };
      const HAMMER_TUNE = [523, 659, 784, 659, 523, 659, 784, 1047, 880, 784, 659, 784, 659, 523, 587, 659];

      // ---------------- helpers ----------------
      function addScore(n, x, y, show) {
        S.score += n;
        if (!S.extra && S.score >= 7000) { S.extra = true; S.lives++; au.melody([[1047, 0.08], [1319, 0.08], [1568, 0.08], [2093, 0.2]], { type: 'square', vol: 0.07 }); }
        if (S.score > S.hi) S.hi = S.score;
        if (show && popups.length < 12) popups.push({ x, y, s: String(n), t: 60 });
      }
      function allPlats() { return elevs.length ? st.plats.concat(elevs) : st.plats; }
      function supportAt(x, y, tol, prefer) {
        if (prefer && prefer.solid !== false && !prefer.deco && x >= prefer.x0 && x < prefer.x1 && Math.abs(prefer.top(x) - y) <= tol) return prefer;
        let best = null, bd = 1e9;
        for (const p of allPlats()) {
          if (p.solid === false || p.deco || x < p.x0 || x >= p.x1) continue;
          const d = Math.abs(p.top(x) - y);
          if (d <= tol && d < bd) { bd = d; best = p; }
        }
        return best;
      }
      function landOn(x, y0, y1) {
        let best = null, bt = 1e9;
        for (const p of allPlats()) {
          if (p.solid === false || p.deco || x < p.x0 || x >= p.x1) continue;
          const t = p.top(x);
          if (y0 <= t + 0.75 && y1 >= t && t < bt) { bt = t; best = p; }
        }
        return best;
      }
      function overlap(a, b) { return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]; }
      function mBox() { return [M.x - 4, M.y - 13, M.x + 4, M.y - 2]; }
      function difficulty() { return Math.min(5, S.level + Math.floor(stT / 1800)); }

      // ---------------- stage setup ----------------
      function stageKind() { const seq = LEVEL_SEQ[Math.min(S.level, 5) - 1]; return seq[S.stageIdx % seq.length]; }
      function initStage() {
        const k = stageKind();
        st = k === 25 ? build25() : k === 50 ? build50() : k === 75 ? build75() : build100();
        st.colors = STAGE_COLORS[k];
        barrels = []; flames = []; pies = []; springs = []; elevs = []; popups = []; fx = [];
        st.hammers.forEach(h => { h.taken = false; });
        st.items.forEach(i => { i.taken = false; });
        M = { x: st.start.x, y: st.start.g.top(st.start.x), dir: st.start.dir, state: 'walk', on: st.start.g, vx: 0, vy: 0, y0: 0, anim: 0, lad: null, hammer: 0, jumpCount: 0, jumpId: 0, moving: false };
        dk = { x: st.dk.x, y: st.dk.y, mode: 'idle', t: 0, wait: 60, pose: 'front', firstThrow: true, dir: 1, holding: false };
        S.bonus = Math.min(8000, 5000 + 1000 * (S.level - 1));
        stT = 0; bonusT = 0; bgmT = 0;
        if (k === 25) { st.drumLit = false; st.flare = 0; }
        if (k === 50) { st.pieT = 60; st.c1T = 360; st.c2T = 420; st.c4T = 200; st.fireT = 120; st.retT = 0; }
        if (k === 75) {
          for (const e of st.elev) {
            for (let y = e.bot; y >= e.top; y -= 52) {
              elevs.push(plat(e.x0, e.x1, e.dir < 0 ? y : e.top + (e.bot - y), { kind: 'elev', sh: e }));
            }
            e.spawn = 0;
          }
          for (const f of st.fireStart) flames.push(newFlame(f.x, f.g.top(f.x), f.g, 'fire'));
          st.springT = 90;
        }
        if (k === 100) { st.foxT = 120; st.rivetsLeft = 8; dk.x = 92; dk.dir = 1; }
        S.ready = 70;
      }

      function newFlame(x, y, g, kind) {
        return { x, y, g, dir: chance(0.5) ? 1 : -1, st: 'walk', lad: null, cool: 30, t: (Math.random() * 60) | 0, kind, vx: 0, vy: 0, cdir: 0, scored: -1, pop: kind === 'fox' ? 30 : 0 };
      }

      // ---------------- game flow ----------------
      function startGame() {
        S.score = 0; S.lives = 3; S.level = 1; S.stageIdx = 0; S.extra = false; S.firstStage = true;
        snd.start();
        initStage();
        S.mode = 'intro'; S.t = 0;
        setupIntro();
      }
      function toHowHigh() { S.mode = 'howhigh'; S.t = 0; snd.howHigh(); }
      function nextStage() {
        S.stageIdx++;
        const seq = LEVEL_SEQ[Math.min(S.level, 5) - 1];
        if (S.stageIdx >= seq.length) { S.stageIdx = 0; S.level++; }
        initStage(); toHowHigh();
      }
      function killMario() {
        if (S.mode !== 'play') return;
        S.mode = 'dying'; S.t = 0; M.hammer = 0; snd.death();
      }
      function gameOver() {
        api.setHiScore(S.score); S.hi = Math.max(S.hi, api.getHiScore(0));
        S.mode = 'gameover'; S.t = 0;
      }

      // ---------------- intro (DK climbs, bends girders) ----------------
      let intro = null;
      function setupIntro() {
        st.plats.slice(0, 5).forEach(g => { g.bend = 0; });
        intro = { phase: 'climb', dkx: 76, dky: 248, t: 0, stomps: 0, pauline: false };
        snd.intro();
      }
      function updateIntro() {
        const I = intro; I.t++;
        if (I.phase === 'climb') {
          if (I.t % 12 === 0) { I.dky -= 8; au.tone(I.t % 24 ? 196 : 262, 0.08, { type: 'triangle', vol: 0.12 }); }
          if (I.dky <= 84) { I.dky = 84; I.phase = 'set'; I.t = 0; I.pauline = true; au.melody([[392, 0.1], [523, 0.2]], { type: 'square', vol: 0.06 }); }
        } else if (I.phase === 'set') {
          if (I.t > 40) { I.phase = 'hop'; I.t = 0; }
        } else if (I.phase === 'hop') {
          // hop left to his post
          const p = Math.min(1, I.t / 50);
          I.dkx = 76 + (22 - 76) * p;
          I.jy = -Math.sin(p * Math.PI) * 16;
          if (I.t >= 50) { I.phase = 'stomp'; I.t = 0; I.jy = 0; }
        } else if (I.phase === 'stomp') {
          const c = I.t % 40;
          I.jy = c < 20 ? -Math.sin(c / 20 * Math.PI) * 10 : 0;
          if (c === 20) {
            const gi = 4 - I.stomps;
            if (gi >= 0) st.plats[gi].bend = 1;
            I.stomps++; snd.stomp(); I.shake = 8;
          }
          if (I.stomps >= 5 && c === 39) { I.phase = 'grin'; I.t = 0; }
        } else if (I.phase === 'grin') {
          if (I.t > 70) { intro = null; S.firstStage = false; toHowHigh(); }
        }
        if (I && I.shake) I.shake--;
      }

      // ---------------- Mario ----------------
      function ladderUp() {
        for (const L of st.ladders) {
          if (Math.abs(M.x - L.x) <= 3 && Math.abs(M.y - L.bot) <= 2.5) return L;
        }
        return null;
      }
      function ladderDown() {
        for (const L of st.ladders) {
          if (L.broken || L.retract) continue;
          if (Math.abs(M.x - L.x) <= 3 && Math.abs(M.y - L.top) <= 2.5) return L;
        }
        return null;
      }
      function updateMario() {
        const left = api.key('ArrowLeft'), right = api.key('ArrowRight'), up = api.key('ArrowUp'), down = api.key('ArrowDown');
        const jump = api.pressed('Space') || api.pressed('KeyX') || api.pressed('KeyZ');
        M.moving = false;
        if (M.hammer > 0) {
          M.hammer--;
          if (M.hammer === 0) { /* hammer ends */ }
        }
        if (M.state === 'walk') {
          if (M.on && M.on.conv) M.x += M.on.conv;
          if (M.on && M.on.kind === 'elev') M.y = M.on.top(M.x);
          const dx = left ? -1 : right ? 1 : 0;
          let L;
          if (jump && !M.hammer) {
            M.state = 'jump'; M.vy = -JV; M.vx = dx * WALK; M.y0 = M.y; M.jumpId++; M.jumpCount = 0; M.on = null;
            if (dx) M.dir = dx;
            snd.jump();
            return;
          } else if (up && !M.hammer && (L = ladderUp())) {
            M.state = 'climb'; M.lad = L; M.x = L.x; M.on = null; M.anim = 0;
          } else if (down && !M.hammer && (L = ladderDown())) {
            M.state = 'climb'; M.lad = L; M.x = L.x; M.y += 1; M.on = null; M.anim = 0;
          } else if (dx) {
            M.x += dx * WALK; M.dir = dx; M.moving = true; M.anim += WALK;
            if (((M.anim / WALK) | 0) % 9 === 0) snd.walk();
          }
          M.x = Math.max(6, Math.min(W - 6, M.x));
          if (M.state === 'walk') {
            const s = supportAt(M.x, M.y, 3, M.on);
            if (s) { M.on = s; M.y = s.top(M.x); }
            else { M.state = 'fall'; M.vy = 0; M.vx = M.dir * 0.5; M.y0 = M.y; M.on = null; }
          }
        } else if (M.state === 'climb') {
          const L = M.lad;
          if (L.retract && M.y > L.bot) M.y = L.bot; // carried by retracting ladder
          const maxUp = L.broken ? L.bot - 10 : L.top;
          if (up) {
            M.y -= CLIMB; M.anim += CLIMB; M.moving = true;
            if (M.y <= maxUp) {
              M.y = maxUp;
              if (!L.broken) { M.state = 'walk'; M.on = L.upper; M.y = L.upper.top(M.x); }
            }
          } else if (down) {
            M.y += CLIMB; M.anim += CLIMB; M.moving = true;
            if (M.y >= L.bot) {
              M.y = L.bot;
              const s = supportAt(M.x, M.y, 3);
              if (s) { M.state = 'walk'; M.on = s; M.y = s.top(M.x); }
            }
          }
          if (M.moving && ((M.anim / CLIMB) | 0) % 14 === 0) au.tone(200 + (M.anim % 2) * 40, 0.03, { type: 'square', vol: 0.04 });
        } else { // jump / fall
          const py = M.y;
          M.vy = Math.min(M.vy + GRAV, 3);
          M.x += M.vx; M.y += M.vy;
          if (M.x < 6 || M.x > W - 6) { M.x = Math.max(6, Math.min(W - 6, M.x)); M.vx = -M.vx * 0.5; }
          if (M.vy > 0) {
            const g = landOn(M.x, py, M.y);
            if (g) {
              M.y = g.top(M.x);
              const drop = M.y - M.y0;
              if (drop > 20 || (M.state === 'fall' && drop > 12)) { M.state = 'walk'; M.on = g; killMario(); return; }
              M.state = 'walk'; M.on = g; M.vx = 0; snd.land();
            }
          }
          if (M.y > H + 8) killMario();
          // jumping over objects
          if (M.state === 'jump') {
            const check = o => {
              if (o.jumped === M.jumpId) return;
              if (Math.abs(o.x - M.x) < 6 && o.y > M.y && o.y - M.y < 26) {
                o.jumped = M.jumpId; M.jumpCount++;
                const v = M.jumpCount === 1 ? 100 : M.jumpCount === 2 ? 200 : 500;
                addScore(v, o.x, o.y - 14, true); snd.points();
              }
            };
            barrels.forEach(check); flames.forEach(check); pies.forEach(check);
          }
        }
        // hammer pickup
        for (const h of st.hammers) {
          if (h.taken) continue;
          const hy = h.g.top(h.x) - 26;
          if (overlap(mBox(), [h.x - 4, hy, h.x + 4, hy + 10])) {
            h.taken = true; M.hammer = 600; snd.hammer();
            if (M.state === 'jump') { /* keep jumping */ }
          }
        }
        // item pickup
        for (const it of st.items) {
          if (it.taken) continue;
          const iy = it.g.top(it.x);
          if (overlap(mBox(), [it.x - 6, iy - 12, it.x + 6, iy])) {
            it.taken = true; const v = S.level === 1 ? 300 : S.level === 2 ? 500 : 800;
            addScore(v, it.x, iy - 16, true); snd.item();
          }
        }
        // rivets
        if (st.kind === 100) {
          for (const r of st.rivets) {
            if (!r.g.solid) continue;
            const ry = r.g.y;
            if (M.y > ry + 2 || M.y < ry - 26) { r.side = 0; continue; }
            const dxr = M.x - r.x;
            if (Math.abs(dxr) >= 5) {
              const s = Math.sign(dxr);
              if (r.side && s !== r.side) {
                r.g.solid = false; st.rivetsLeft--; addScore(100, r.x, ry - 18, true); snd.rivet();
                if (M.on === r.g) M.on = null;
              }
              r.side = s;
            }
          }
        }
        // goal
        if (M.state === 'walk' && M.on && M.on.goal) { stageClear(); }
        if (st.kind === 100 && st.rivetsLeft <= 0) stageClear();
      }
      function hammerBox() {
        const up = ((M.hammer >> 3) & 1) === 0;
        if (up) return [M.x - 7, M.y - 32, M.x + 7, M.y - 12];
        return M.dir > 0 ? [M.x + 2, M.y - 12, M.x + 18, M.y + 1] : [M.x - 18, M.y - 12, M.x - 2, M.y + 1];
      }
      function smashAt(x, y, base) {
        fx.push({ x, y, t: 0 });
        const v = base === 300 ? (chance(0.15) ? 800 : chance(0.3) ? 500 : 300) : (chance(0.2) ? 800 : 500);
        addScore(v, x, y - 12, true);
        snd.smash();
      }

      // ---------------- DK (25m barrel thrower) ----------------
      function spawnBarrel(kind) {
        if (barrels.length >= 14) return;
        const g = st.dkGirder;
        if (kind === 'roll') {
          const blue = chance(0.12 + 0.02 * S.level);
          barrels.push({ x: 66, y: g.top(66), dir: 1, st: 'roll', g, blue, sp: 0, roll: 0, lastLad: null, jumped: -1 });
        } else {
          const straight = kind === 'straight';
          barrels.push({ x: 42, y: 70, dir: -1, st: 'wild', g: null, blue: straight || chance(0.3), vx: straight ? 0 : (chance(0.5) ? 1 : -1) * rnd(0.6, 1.2), vy: 0.5, roll: 0, straight, lastLad: null, jumped: -1, bounces: 0 });
        }
      }
      function updateDK25() {
        dk.t++;
        if (dk.mode === 'idle') {
          dk.pose = (dk.t >> 4) % 4 === 1 ? 'upL' : (dk.t >> 4) % 4 === 3 ? 'upR' : 'front';
          if (dk.t > dk.wait) { dk.mode = dk.firstThrow ? 'hold' : 'grab'; dk.t = 0; }
        } else if (dk.mode === 'grab') {
          dk.pose = 'sideL'; dk.holding = dk.t > 12;
          if (dk.t > 22) {
            dk.t = 0;
            const wild = S.level >= 1 && chance(0.06 + 0.04 * difficulty());
            dk.mode = wild ? 'hold' : 'place'; dk.wild = wild;
          }
        } else if (dk.mode === 'hold') {
          dk.pose = 'upBoth'; dk.holding = true;
          if (dk.t > 26) {
            dk.holding = false;
            spawnBarrel(dk.firstThrow ? 'straight' : 'wild'); snd.throwB();
            dk.firstThrow = false; dk.mode = 'idle'; dk.t = 0; dk.wait = (rnd(80, 150) - difficulty() * 10) | 0;
          }
        } else if (dk.mode === 'place') {
          dk.pose = 'sideR'; dk.holding = dk.t < 14;
          if (dk.t === 14) { spawnBarrel('roll'); snd.throwB(); }
          if (dk.t > 26) { dk.mode = 'idle'; dk.t = 0; dk.wait = (rnd(70, 160) - difficulty() * 12) | 0; }
        }
      }
      function updateBarrels() {
        const sp = 1.1 + 0.12 * difficulty();
        for (let i = barrels.length - 1; i >= 0; i--) {
          const b = barrels[i];
          if (b.st === 'roll') {
            const px = b.x;
            b.x += b.dir * sp; b.roll += sp;
            if (b.x < b.g.x0 || b.x >= b.g.x1) {
              const c = supportAt(b.x, b.y, 3);
              if (c) b.g = c; else { b.st = 'fall'; b.vx = b.dir * 0.6; b.vy = 0; b.from = b.g; }
            }
            if (b.st === 'roll') {
              b.y = b.g.top(b.x);
              // ladder choice
              for (const L of st.ladders) {
                if (L.noEnemy || L === b.lastLad || L.upper !== b.g) continue;
                if ((px - L.x) * (b.x - L.x) <= 0) {
                  b.lastLad = L;
                  let p = 0.18 + difficulty() * 0.04;
                  if (M.y > b.y + 8 && Math.abs(M.x - L.x) < 48) p += 0.3;
                  if (chance(p)) { b.st = 'ladder'; b.x = L.x; b.lad = L; }
                  break;
                }
              }
              // oil drum
              if (b.g === st.bottom && b.x <= st.drum.x + 16 && b.dir < 0) { hitDrum(b); barrels.splice(i, 1); continue; }
            }
          } else if (b.st === 'ladder') {
            b.y += 0.9;
            if (b.y >= b.lad.bot) { b.y = b.lad.bot; b.g = b.lad.lower; b.st = 'roll'; b.dir = b.g.roll || -b.dir; }
          } else if (b.st === 'fall' || b.st === 'bounce') {
            const py = b.y;
            b.vy += 0.12; b.x += b.vx; b.y += b.vy;
            if (b.vy > 0) {
              const g = landOn(b.x, py, b.y);
              if (g && g !== b.from) {
                b.y = g.top(b.x); b.g = g;
                if (b.st === 'fall') { b.st = 'bounce'; b.vy = -1.2; b.vx = (g.roll || -b.dir) * 0.4; b.from = null; b.dir = g.roll || -b.dir; }
                else { b.st = 'roll'; }
              }
            }
          } else if (b.st === 'wild') {
            const py = b.y;
            b.vy = Math.min(b.vy + 0.08, 2.4); b.x += b.vx; b.y += b.vy; b.roll += 1;
            if (b.x < 8 || b.x > W - 8) b.vx = -b.vx;
            if (b.vy > 0) {
              const g = landOn(b.x, py, b.y);
              if (g && g !== b.g && !g.goal) {
                b.g = g;
                if (g === st.bottom) { b.st = 'bounce'; b.y = g.top(b.x); b.vy = -1; b.vx = -0.4; b.dir = -1; b.from = null; }
                else {
                  b.y = g.top(b.x); b.vy = -1.4; b.bounces++;
                  if (!b.straight) b.vx = (chance(0.5) ? 1 : -1) * rnd(0.5, 1.3);
                }
              }
            }
          }
          if (b.y > H + 16) { barrels.splice(i, 1); continue; }
          // collisions with Mario
          const box = [b.x - 5, b.y - 9, b.x + 5, b.y - 1];
          if (M.hammer && overlap(hammerBox(), box)) { smashAt(b.x, b.y - 5, 300); barrels.splice(i, 1); continue; }
          if (overlap(mBox(), box)) { killMario(); }
        }
      }
      function hitDrum(b) {
        st.flare = 40; snd.drum();
        if (!st.drumLit) st.drumLit = true;
        if ((b.blue || b.straight) && flames.length < 5) {
          const f = newFlame(st.drum.x + 8, st.drum.y - 18, null, 'fire');
          f.st = 'jump'; f.vx = 0.7; f.vy = -1.6; flames.push(f); snd.fireSpawn();
        }
      }

      // ---------------- fireballs / firefoxes ----------------
      function updateFlames() {
        const scared = M.hammer > 0;
        const sp = (st.kind === 25 || st.kind === 75 ? 0.42 : 0.5) + 0.05 * difficulty();
        for (let i = flames.length - 1; i >= 0; i--) {
          const f = flames[i]; f.t++;
          if (f.pop > 0) { f.pop--; continue; }
          if (f.st === 'jump') {
            const py = f.y; f.vy += 0.08; f.x += f.vx; f.y += f.vy;
            if (f.vy > 0) { const g = landOn(f.x, py, f.y); if (g) { f.g = g; f.y = g.top(f.x); f.st = 'walk'; f.dir = f.vx >= 0 ? 1 : -1; } }
            if (f.y > H + 10) { flames.splice(i, 1); continue; }
          } else if (f.st === 'climb') {
            f.y += f.cdir * sp * 0.85;
            const L = f.lad;
            if (f.cdir < 0 && f.y <= L.top) { f.y = L.top; f.g = L.upper; f.st = 'walk'; f.cool = 50; }
            else if (f.cdir > 0 && f.y >= L.bot) { f.y = L.bot; f.g = L.lower; f.st = 'walk'; f.cool = 50; }
          } else {
            if (!f.g) { f.g = supportAt(f.x, f.y, 4); if (!f.g) { f.st = 'jump'; f.vx = 0; f.vy = 0; continue; } }
            if (f.cool > 0) f.cool--;
            if (f.t % 45 === 0) {
              const same = Math.abs(M.y - f.y) < 14;
              if (scared) f.dir = M.x < f.x ? 1 : -1;
              else if (same && chance(0.75)) f.dir = M.x < f.x ? -1 : 1;
              else if (chance(0.3)) f.dir = -f.dir;
            }
            let nx = f.x + f.dir * sp * (scared ? 0.8 : 1);
            if (nx < f.g.x0 + 3 || nx >= f.g.x1 - 3) {
              const c = supportAt(nx + f.dir * 4, f.y, 3);
              if (c && c !== f.g && c.solid !== false) f.g = c; else { f.dir = -f.dir; nx = f.x; }
            }
            f.x = Math.max(6, Math.min(W - 6, nx));
            if (f.g.conv) f.x += f.g.conv * 0.5;
            f.y = f.g.top(f.x);
            if (f.cool === 0) {
              for (const L of st.ladders) {
                if (L.noEnemy || L.retract || Math.abs(f.x - L.x) > sp) continue;
                if (L.lower === f.g && !L.broken) {
                  const p = scared ? 0.1 : (M.y < f.y - 8 ? 0.55 : 0.2);
                  f.cool = 40;
                  if (chance(p)) { f.st = 'climb'; f.cdir = -1; f.lad = L; f.x = L.x; }
                  break;
                }
                if (L.upper === f.g && !L.broken) {
                  const p = scared ? 0.4 : (M.y > f.y + 8 ? 0.55 : 0.2);
                  f.cool = 40;
                  if (chance(p)) { f.st = 'climb'; f.cdir = 1; f.lad = L; f.x = L.x; }
                  break;
                }
              }
            }
          }
          const bob = st.kind === 25 ? Math.round(Math.sin(f.t * 0.25)) : 0;
          f.bob = bob;
          const box = [f.x - 5, f.y - 12 + bob, f.x + 5, f.y - 2];
          if (M.hammer && overlap(hammerBox(), box)) { smashAt(f.x, f.y - 7, 500); flames.splice(i, 1); continue; }
          if (overlap(mBox(), box)) killMario();
        }
      }

      // ---------------- 50m: conveyors, pies, firefoxes ----------------
      function update50() {
        const B = st.belts;
        st.c1T--; st.c2T--; st.c4T--;
        if (st.c1T <= 0) { B.C1.conv = -B.C1.conv; st.c1T = (rnd(300, 540)) | 0; }
        if (st.c2T <= 0) { B.C2L.conv = -B.C2L.conv; B.C2R.conv = -B.C2R.conv; st.c2T = (rnd(360, 600)) | 0; }
        // DK walks on the top conveyor
        dk.t++;
        if (st.c4T <= 0) { B.C4.conv = -B.C4.conv; st.c4T = (rnd(120, 260)) | 0; }
        dk.x += B.C4.conv * 0.6;
        if (dk.x < 52) { dk.x = 52; B.C4.conv = Math.abs(B.C4.conv); }
        if (dk.x > 132) { dk.x = 132; B.C4.conv = -Math.abs(B.C4.conv); }
        dk.pose = (dk.t >> 4) % 4 === 1 ? 'upL' : (dk.t >> 4) % 4 === 3 ? 'upR' : 'front';
        // retractable ladders
        st.retT++;
        for (const L of st.ladders) {
          if (!L.retract) continue;
          const cyc = (st.retT + L.phase * 150) % 300;
          const target = cyc < 150 ? 0 : 16;
          L.raise += Math.sign(target - L.raise) * 0.25;
        }
        // pies
        st.pieT--;
        if (st.pieT <= 0 && pies.length < 8) {
          st.pieT = (rnd(90, 160) - difficulty() * 8) | 0;
          const opts = [];
          opts.push(B.C1.conv > 0 ? { g: B.C1, x: B.C1.x0 + 4 } : { g: B.C1, x: B.C1.x1 - 4 });
          if (B.C2L.conv > 0) opts.push({ g: B.C2L, x: 4 });
          if (B.C2R.conv < 0) opts.push({ g: B.C2R, x: 220 });
          const o = opts[(Math.random() * opts.length) | 0];
          pies.push({ x: o.x, y: o.g.y, g: o.g, st: 'ride', vy: 0, jumped: -1 });
        }
        for (let i = pies.length - 1; i >= 0; i--) {
          const p = pies[i];
          if (p.st === 'ride') {
            p.x += p.g.conv;
            if (p.x < p.g.x0 - 2 || p.x > p.g.x1 + 2) { p.st = 'fall'; p.vy = 0; }
          } else {
            p.vy += 0.12; p.y += p.vy;
            if (Math.abs(p.x - 112) < 16 && p.y > 160) { st.flare = 20; pies.splice(i, 1); continue; }
            if (p.y > H + 10) { pies.splice(i, 1); continue; }
          }
          const box = [p.x - 7, p.y - 6, p.x + 7, p.y];
          if (M.hammer && overlap(hammerBox(), box)) { smashAt(p.x, p.y - 4, 500); pies.splice(i, 1); continue; }
          if (overlap(mBox(), box)) killMario();
        }
        // firefoxes from the central oil fire
        st.fireT--;
        const maxF = Math.min(5, 1 + S.level);
        if (st.fireT <= 0) {
          st.fireT = (rnd(280, 420)) | 0;
          if (flames.length < maxF) {
            const f = newFlame(112, 156, null, 'fox'); f.st = 'jump'; f.pop = 0; f.vx = chance(0.5) ? 0.8 : -0.8; f.vy = -1.8;
            flames.push(f); snd.fireSpawn(); st.flare = 30;
          }
        }
        if (st.flare > 0) st.flare--;
        // DK and fire contact
        if (overlap(mBox(), [dk.x + 4, dk.y - 30, dk.x + 36, dk.y])) killMario();
        if (overlap(mBox(), [100, 152, 124, 172])) killMario();
      }

      // ---------------- 75m: elevators, springs ----------------
      function update75() {
        dk.t++;
        dk.pose = (dk.t >> 4) % 4 === 1 ? 'upL' : (dk.t >> 4) % 4 === 3 ? 'upR' : 'front';
        const ES = 0.5;
        for (let i = elevs.length - 1; i >= 0; i--) {
          const e = elevs[i];
          e.y += e.sh.dir * ES;
          if ((e.sh.dir < 0 && e.y < e.sh.top) || (e.sh.dir > 0 && e.y > e.sh.bot)) {
            if (M.on === e && M.state === 'walk') { if (e.sh.dir < 0) { killMario(); } else { M.on = null; } }
            elevs.splice(i, 1);
          }
        }
        for (const sh of st.elev) {
          sh.spawn += ES;
          if (sh.spawn >= 52) { sh.spawn = 0; elevs.push(plat(sh.x0, sh.x1, sh.dir < 0 ? sh.bot : sh.top, { kind: 'elev', sh })); }
        }
        if (M.state === 'walk' && M.on && M.on.kind === 'elev') {
          M.y = M.on.y;
          if (M.on.sh.dir < 0 && M.y < 112) killMario();
        }
        // springs
        st.springT--;
        if (st.springT <= 0 && springs.length < 4) {
          st.springT = (rnd(110, 200) - difficulty() * 10) | 0;
          springs.push({ x: 52, y: 84, vx: 1.15 + 0.05 * difficulty(), vy: -2, st: 'hop', sq: 0, jumped: -1 });
          dk.pose = 'upBoth';
        }
        for (let i = springs.length - 1; i >= 0; i--) {
          const s = springs[i];
          if (s.sq > 0) { s.sq--; if (s.sq === 0) { s.vy = -2.1; snd.boing(); } }
          else {
            s.vy += 0.12; s.y += s.vy;
            if (s.st === 'hop') {
              s.x += s.vx;
              if (s.vy > 0 && s.y >= 84 && s.x < 176) { s.y = 84; s.vy = 0; s.sq = 6; }
              if (s.x >= 180) { s.st = 'drop'; s.x = 180; }
            }
          }
          if (s.y > H + 16) { springs.splice(i, 1); continue; }
          if (overlap(mBox(), [s.x - 6, s.y - 10, s.x + 6, s.y])) killMario();
        }
        if (overlap(mBox(), [dk.x + 4, dk.y - 30, dk.x + 36, dk.y])) killMario();
      }

      // ---------------- 100m: rivets ----------------
      function update100() {
        dk.t++;
        if (dk.mode === 'idle') {
          dk.x += dk.dir * 0.35;
          if (dk.x < 72 || dk.x > 112) { dk.dir = -dk.dir; dk.x = Math.max(72, Math.min(112, dk.x)); }
          if (chance(0.006)) { dk.mode = 'pound'; dk.t = 0; }
          dk.pose = (dk.t >> 3) & 1 ? 'sideR' : 'front';
          if (dk.dir < 0) dk.pose = (dk.t >> 3) & 1 ? 'sideL' : 'front';
        } else {
          dk.pose = (dk.t >> 3) & 1 ? 'upL' : 'upR';
          if (dk.t > 60) { dk.mode = 'idle'; dk.t = 0; }
        }
        st.foxT--;
        const maxF = Math.min(5, 1 + S.level);
        if (st.foxT <= 0) {
          st.foxT = (rnd(200, 360)) | 0;
          if (flames.length < maxF) {
            // appear on a random floor piece away from Mario
            for (let k = 0; k < 6; k++) {
              const fi = 1 + ((Math.random() * 3) | 0);
              const fl = st.floors[fi];
              const piece = fl.pieces[(Math.random() * 3) | 0];
              const x = rnd(piece.x0 + 6, piece.x1 - 6);
              if (Math.abs(x - M.x) + Math.abs(fl.y - M.y) < 60) continue;
              flames.push(newFlame(x, fl.y, piece, 'fox')); snd.fireSpawn();
              break;
            }
          }
        }
        if (overlap(mBox(), [dk.x + 4, dk.y - 30, dk.x + 36, dk.y])) killMario();
      }

      // ---------------- stage clear ----------------
      function stageClear() {
        if (S.mode !== 'play') return;
        S.mode = 'clear'; S.t = 0;
        addScore(S.bonus, 0, 0, false);
        M.hammer = 0;
        if (st.kind === 100) { snd.rescue(); } else snd.clear();
      }

      // ---------------- update ----------------
      let coinFlash = 0, coinHold = 0, lastCredits = api.credits;
      function update() {
        S.t++;
        if (coinFlash > 0) coinFlash--;
        if (coinHold > 0) coinHold--;
        const cr = api.credits;
        if (S.mode === 'title') {
          if (lastCredits === 0 && cr > 0) { coinHold = 150; coinFlash = 0; }
          lastCredits = cr;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { lastCredits = api.credits; startGame(); }
            else { coinFlash = 150; au.tone(70, 0.28, { type: 'square', vol: 0.3 }); au.tone(58, 0.28, { type: 'sawtooth', vol: 0.15 }); }
          }
          return;
        }
        lastCredits = cr;
        if (S.mode === 'gameover') {
          if (S.t > 200 || (S.t > 60 && api.anyPressed('Enter'))) { S.mode = 'title'; S.t = 0; }
          return;
        }
        if (S.mode === 'intro') {
          if (S.t > 30 && api.anyPressed('Enter', 'Space')) { st.plats.forEach(g => { if (g.sloped) g.bend = 1; }); intro = null; S.firstStage = false; toHowHigh(); return; }
          updateIntro(); return;
        }
        if (S.mode === 'howhigh') {
          if (S.t > 170) { S.mode = 'play'; S.t = 0; S.ready = 0; }
          return;
        }
        if (S.mode === 'dying') {
          if (S.t === 240) {
            S.lives--;
            if (S.lives <= 0) {
              // last life: offer a continue (Mario stays down under the countdown), then replay this stage
              if (api.offerContinue) api.offerContinue(() => { S.lives = 3; initStage(); S.mode = 'play'; S.t = 0; }, gameOver);
              else gameOver();
            }
            else { initStage(); S.mode = 'play'; S.t = 0; }
          }
          return;
        }
        if (S.mode === 'clear') {
          if (st.kind === 100) {
            if (S.t === 1) { st.midFloor.solid = false; dk.fall = 0; }
            if (dk.y < 248) { dk.fall += 0.08; dk.y = Math.min(248, dk.y + dk.fall); }
            if (S.t === 60) { M.x = 132; M.y = 48; M.state = 'walk'; M.dir = -1; }
            if (S.t > 300) nextStage();
          } else {
            if (S.t > 100) { dk.y -= 0.8; if (st.kind === 25) dk.x += Math.sign(56 - dk.x) * Math.min(1, Math.abs(56 - dk.x)); }
            if (S.t > 230) nextStage();
          }
          return;
        }
        // play
        if (S.ready > 0) { S.ready--; return; }
        stT++;
        // bonus timer
        bonusT++;
        if (bonusT >= 110) {
          bonusT = 0; S.bonus = Math.max(0, S.bonus - 100);
          if (S.bonus <= 1000) snd.timer();
          if (S.bonus <= 0) { killMario(); return; }
        }
        // music
        bgmT++;
        if (M.hammer > 0) {
          if (bgmT % 7 === 0) { au.tone(HAMMER_TUNE[hamMusicT++ % HAMMER_TUNE.length], 0.08, { type: 'square', vol: 0.045 }); }
        } else if (bgmT % 15 === 0) {
          const pat = BGM[st.kind], n = pat[(bgmT / 15) % pat.length | 0];
          if (n) au.tone(n, 0.14, { type: 'triangle', vol: 0.11 });
        }
        updateMario();
        if (S.mode !== 'play') return;
        if (st.kind === 25) {
          updateDK25(); updateBarrels();
          if (st.flare > 0) st.flare--;
          if (overlap(mBox(), [dk.x + 4, dk.y - 30, dk.x + 36, dk.y])) killMario();
          if (overlap(mBox(), [st.drum.x, st.drum.y - 24, st.drum.x + 16, st.drum.y])) killMario();
        } else if (st.kind === 50) update50();
        else if (st.kind === 75) update75();
        else update100();
        updateFlames();
        for (let i = popups.length - 1; i >= 0; i--) if (--popups[i].t <= 0) popups.splice(i, 1);
        for (let i = fx.length - 1; i >= 0; i--) if (++fx[i].t > 30) fx.splice(i, 1);
      }

      // ---------------- rendering ----------------
      function drawLadder(ctx, L, col) {
        const top = L.top, bot = L.bot;
        ctx.fillStyle = col;
        const drawPart = (a, b) => {
          if (b <= a) return;
          ctx.fillRect(L.x - 4, a, 1, b - a); ctx.fillRect(L.x + 3, a, 1, b - a);
          for (let y = Math.ceil((b - 2) / 4) * 4 - 2; y > a; y -= 4) if (y < b) ctx.fillRect(L.x - 4, y, 8, 1);
        };
        if (L.broken) { drawPart(top, top + 14); drawPart(bot - 10, bot); }
        else drawPart(top, bot);
      }
      function drawPlat(ctx, p, c) {
        if (p.deco && st.kind !== 50 && st.kind !== 100 && !p.goal) return;
        if (p.solid === false) return;
        if (p.rivet) { ctx.drawImage(sp.rivet, p.x0, p.y - 1); return; }
        if (p.kind === 'belt') { drawBelt(ctx, p, c); return; }
        const gs = girderSprite(c.girder, c.hi);
        for (let x = p.x0; x < p.x1; x += 16) {
          const w = Math.min(16, p.x1 - x);
          ctx.drawImage(gs, 0, 0, w, 8, x, p.top(x), w, 8);
        }
      }
      function drawBelt(ctx, p, c) {
        const off = ((api.frame * Math.abs(p.conv)) | 0) % 8;
        const dir = p.conv > 0 ? 1 : -1;
        for (let x = p.x0; x < p.x1; x++) {
          ctx.fillStyle = c.belt; ctx.fillRect(x, p.y, 1, 1); ctx.fillRect(x, p.y + 7, 1, 1);
          const ph = ((x - off * dir) % 8 + 8) % 8;
          if (ph < 4) { ctx.fillStyle = '#ffd080'; ctx.fillRect(x, p.y + 2 + (ph === 0 || ph === 3 ? 1 : 0), 1, 2); }
          else { ctx.fillStyle = '#a02000'; ctx.fillRect(x, p.y + 3, 1, 2); }
        }
        // end rollers
        for (const ex of [p.x0, p.x1 - 8]) {
          ctx.fillStyle = '#ffd800'; ctx.fillRect(ex + 1, p.y, 6, 8); ctx.fillRect(ex, p.y + 1, 8, 6);
          ctx.fillStyle = '#a06000';
          const a = (api.frame >> 3) & 1;
          if (a) { ctx.fillRect(ex + 3, p.y + 1, 2, 6); } else { ctx.fillRect(ex + 1, p.y + 3, 6, 2); }
        }
      }
      function drawDK(ctx, x, y, pose) {
        let s = sp.dkFront;
        if (pose === 'upL') s = sp.dkUpL; else if (pose === 'upR') s = sp.dkUpR; else if (pose === 'upBoth') s = sp.dkUpBoth;
        else if (pose === 'sideL') s = sp.dkSideL; else if (pose === 'sideR') s = sp.dkSideR; else if (pose === 'grin') s = sp.dkGrin;
        const ox = (pose === 'sideL' || pose === 'sideR') ? 4 : 0;
        ctx.drawImage(s, Math.round(x + ox), Math.round(y - 31));
      }
      function drawMario(ctx) {
        const d = M.dir > 0 ? 0 : 1;
        let s;
        const x = Math.round(M.x) - 8, y = Math.round(M.y) - 16;
        if (S.mode === 'dying') {
          if (S.t < 60) s = sp.mario.stand[d];
          else if (S.t < 150) s = sp.marioRot[((S.t - 60) >> 3) % 4];
          else { ctx.drawImage(sp.marioDead, x, y); ctx.drawImage(sp.halo, x + 4, y - 4); return; }
          ctx.drawImage(s, x, y); return;
        }
        if (M.state === 'climb') {
          s = sp.mario.climb[((M.anim / 4) | 0) & 1];
        } else if (M.state === 'jump' || M.state === 'fall') {
          s = sp.mario.jump[d];
          if (M.hammer) s = sp.mario.wa[d];
        } else if (M.moving) {
          const f = ((M.anim / 5) | 0) % 4;
          s = [sp.mario.wa, sp.mario.wb, sp.mario.stand, sp.mario.wb][f][d];
        } else s = sp.mario.stand[d];
        if (M.hammer && M.hammer < 120 && (api.frame >> 2) & 1) {
          // flashing hammer near the end: just blink the hammer
        }
        ctx.drawImage(s, x, y);
        if (M.hammer) {
          const blink = M.hammer < 120 && ((api.frame >> 2) & 1);
          const up = ((M.hammer >> 3) & 1) === 0;
          if (!blink) {
            if (up) ctx.drawImage(sp.hammerUp[d], Math.round(M.x) - 4 + (M.dir > 0 ? 1 : -1), y - 11);
            else ctx.drawImage(sp.hammerDown[d], M.dir > 0 ? Math.round(M.x) + 5 : Math.round(M.x) - 16, Math.round(M.y) - 10);
          }
        }
      }
      function drawHUD(ctx) {
        const blink = (api.frame >> 4) & 1;
        if (S.mode === 'title' || blink || S.mode !== 'play') txt(ctx, '1UP', 24, 0, '#ff2a2a');
        txt(ctx, 'HIGH SCORE', 72, 0, '#ff2a2a');
        txt(ctx, String(S.score).padStart(6, '0'), 8, 9, '#fff');
        txt(ctx, String(S.hi).padStart(6, '0'), 88, 9, '#fff');
        if (S.mode === 'title') return;
        for (let i = 0; i < Math.min(S.lives - 1, 6); i++) ctx.drawImage(sp.icon, 8 + i * 9, 20);
        txt(ctx, 'L=' + String(Math.min(99, S.level)).padStart(2, '0'), 168, 20, '#3a62ff');
        // bonus box
        ctx.fillStyle = '#3a62ff';
        ctx.fillRect(160, 29, 56, 2); ctx.fillRect(160, 49, 56, 2); ctx.fillRect(160, 29, 2, 22); ctx.fillRect(214, 29, 2, 22);
        txt(ctx, 'BONUS', 168, 32, '#00e8e8');
        const bcol = S.bonus <= 1000 && blink ? '#ff2a2a' : '#ffffff';
        txt(ctx, String(S.bonus).padStart(4, '0'), 172, 41, bcol);
      }
      function drawStage(ctx) {
        const c = st.colors;
        const shake = intro && intro.shake ? ((intro.shake & 2) ? 1 : -1) : 0;
        ctx.save(); ctx.translate(0, shake);
        // elevator shafts (75m)
        if (st.kind === 75) {
          for (const sh of st.elev) {
            ctx.fillStyle = '#ffd800';
            ctx.fillRect(sh.x0 + 1, sh.top - 2, 1, sh.bot - sh.top + 10); ctx.fillRect(sh.x1 - 2, sh.top - 2, 1, sh.bot - sh.top + 10);
            ctx.fillStyle = '#ff8c00';
            ctx.fillRect(sh.x0 - 2, sh.top - 8, sh.x1 - sh.x0 + 4, 6); ctx.fillRect(sh.x0 - 2, sh.bot + 8, sh.x1 - sh.x0 + 4, 6);
            ctx.fillStyle = '#ffd800';
            const a = (api.frame >> 3) & 1;
            ctx.fillRect(sh.x0 + 4 + a * 4, sh.top - 7, 2, 4); ctx.fillRect(sh.x0 + 4 + a * 4, sh.bot + 9, 2, 4);
          }
        }
        for (const L of st.ladders) drawLadder(ctx, L, c.ladder);
        // intro ladders
        if (S.mode === 'intro') {
          const tmpL = { broken: false };
          for (const lx of [88, 104]) {
            ctx.fillStyle = c.ladder;
            ctx.fillRect(lx - 4, 40, 1, 208); ctx.fillRect(lx + 3, 40, 1, 208);
            for (let y = 44; y < 248; y += 4) ctx.fillRect(lx - 4, y, 8, 1);
          }
          void tmpL;
        }
        for (const p of st.plats) drawPlat(ctx, p, c);
        for (const e of elevs) {
          const gs = girderSprite(c.girder, c.hi);
          ctx.drawImage(gs, 0, 0, 16, 8, e.x0, Math.round(e.y), 16, 8);
        }
        // extra deco at top of 25m: ladders behind DK
        if (st.kind === 25 && S.mode !== 'intro') {
          ctx.fillStyle = c.ladder;
          for (const lx of [68, 84]) {
            ctx.fillRect(lx - 4, 28, 1, 56); ctx.fillRect(lx + 3, 28, 1, 56);
            for (let y = 30; y < 84; y += 4) ctx.fillRect(lx - 4, y, 8, 1);
          }
        }
        ctx.restore();
      }
      function drawEntities(ctx) {
        const f8 = (api.frame >> 3) & 1;
        // hammers
        for (const h of st.hammers) if (!h.taken) ctx.drawImage(sp.hammerUp[0], h.x - 4, h.g.top(h.x) - 26);
        for (const it of st.items) if (!it.taken) { const s = sp[it.k]; ctx.drawImage(s, it.x - (s.width >> 1), it.g.top(it.x) - s.height); }
        // oil drum (25m)
        if (st.kind === 25) {
          ctx.drawImage(sp.drum, st.drum.x, st.drum.y - 16);
          if (st.drumLit) {
            const fl = sp.flame[(api.frame >> 2) & 1];
            if (st.flare > 0) ctx.drawImage(fl, st.drum.x, st.drum.y - 28, 16, 12);
            else ctx.drawImage(fl, st.drum.x, st.drum.y - 24);
          }
          // barrel stack
          ctx.drawImage(sp.barrelUp, 2, 52); ctx.drawImage(sp.barrelUp, 12, 52);
          ctx.drawImage(sp.barrelUp, 2, 68); ctx.drawImage(sp.barrelUp, 12, 68);
        }
        if (st.kind === 50) {
          // central oil drum with fire
          ctx.drawImage(sp.drum, 104, 152);
          const fl = sp.flame[(api.frame >> 2) & 1];
          ctx.drawImage(fl, 104, st.flare > 0 ? 136 : 144, 16, st.flare > 0 ? 16 : 8);
        }
        // Pauline
        if (!(S.mode === 'clear' && st.kind !== 100 && S.t > 100)) {
          const pl = st.pauline;
          const help = S.mode === 'play' && (api.frame % 120) < 50;
          const ps = sp.pauline[help ? ((api.frame >> 3) & 1) : 0];
          ctx.drawImage(ps, pl.x - 8, pl.y - 22);
          if (help) txt(ctx, 'HELP!', pl.x + (st.kind === 100 ? 12 : 10), pl.y - 30, '#00e8e8');
        }
        // DK
        if (!(S.mode === 'clear' && st.kind !== 100 && dk.y < -40)) {
          if (S.mode === 'clear' && st.kind === 100) ctx.drawImage(sp.dkFall, Math.round(dk.x), Math.round(dk.y - 31));
          else if (S.mode === 'clear') {
            drawDK(ctx, dk.x, dk.y, (S.t >> 3) & 1 ? 'upL' : 'upR');
            if (S.t > 100) ctx.drawImage(sp.paulineL[0], Math.round(dk.x) + 30, Math.round(dk.y) - 34);
          }
          else {
            drawDK(ctx, dk.x, dk.y, dk.pose);
            if (st.kind === 25 && dk.holding) {
              if (dk.pose === 'upBoth') ctx.drawImage(dk.firstThrow || dk.wild ? sp.barrelSideBlue : sp.barrelSide, dk.x + 12, dk.y - 42);
              else if (dk.pose === 'sideL') ctx.drawImage(sp.barrelSide, dk.x - 2, dk.y - 13);
              else if (dk.pose === 'sideR') ctx.drawImage(sp.barrelSide, dk.x + 26, dk.y - 13);
            }
          }
        }
        // springs
        for (const s of springs) ctx.drawImage(sp.spring[s.sq > 0 ? 1 : 0], Math.round(s.x) - 8, Math.round(s.y) - (s.sq > 0 ? 7 : 11));
        // pies
        for (const p of pies) ctx.drawImage(sp.pie, Math.round(p.x) - 8, Math.round(p.y) - 6);
        // barrels
        for (const b of barrels) {
          const x = Math.round(b.x), y = Math.round(b.y);
          if (b.st === 'ladder' || (b.st === 'wild' && b.straight)) ctx.drawImage(b.blue ? sp.barrelSideBlue : sp.barrelSide, x - 8, y - 10);
          else {
            const f = ((b.roll / 5) | 0) & 1;
            ctx.drawImage((b.blue ? sp.barrelBlue : sp.barrel)[f], x - 6, y - 10);
          }
        }
        // flames
        for (const f of flames) {
          if (f.pop > 0) { if ((f.pop >> 2) & 1) ctx.drawImage(sp.smash[1], Math.round(f.x) - 8, Math.round(f.y) - 14); continue; }
          const fr = ((f.t >> 3) & 1);
          let s = M.hammer > 0 ? sp.fireBlue[fr] : f.kind === 'fox' ? sp.firefox[fr] : sp.fire[fr];
          if (f.dir < 0 && M.hammer <= 0 && f.kind !== 'fox') s = sp.fireL[fr];
          ctx.drawImage(s, Math.round(f.x) - 8, Math.round(f.y) - 16 + (f.bob || 0));
        }
        void f8;
        // smash effects
        for (const e of fx) ctx.drawImage(sp.smash[Math.min(2, (e.t / 10) | 0)], Math.round(e.x) - 8, Math.round(e.y) - 6);
        // Mario
        drawMario(ctx);
        // popups
        for (const p of popups) {
          const s = p.s; const w = s.length * 8;
          txt(ctx, s, Math.round(Math.max(0, Math.min(W - w, p.x - w / 2))), Math.round(p.y), '#ffffff');
        }
        // clear-stage heart
        if (S.mode === 'clear') {
          const pl = st.pauline;
          const hx = st.kind === 100 ? 110 : pl.x + 6, hy = st.kind === 100 ? 22 : pl.y - 40;
          if (st.kind === 100) { if (S.t > 60) ctx.drawImage(sp.heart, hx, hy); }
          else ctx.drawImage(S.t > 100 ? sp.heartBroken : sp.heart, hx, hy);
        }
      }

      function drawTitle(ctx) {
        // Big girder-block "DONKEY KONG" logo
        const big = (s, y) => {
          const w = s.length * 32 - 4; let x0 = (W - w) >> 1;
          for (const ch of s) {
            const rows = FONT[ch];
            for (let r = 0; r < 7; r++) for (let b = 0; b < 7; b++) if (rows[r] & (64 >> b)) {
              ctx.fillStyle = '#ff1c54'; ctx.fillRect(x0 + b * 4, y + r * 4, 4, 4);
              ctx.fillStyle = '#ff8cb0'; ctx.fillRect(x0 + b * 4, y + r * 4, 4, 1);
              ctx.fillStyle = '#9c0028'; ctx.fillRect(x0 + b * 4 + 3, y + r * 4 + 1, 1, 3);
            }
            x0 += 32;
          }
        };
        big('DONKEY', 36); big('KONG', 72);
        const pose = (S.t >> 4) % 4 === 1 ? 'upL' : (S.t >> 4) % 4 === 3 ? 'upR' : 'grin';
        drawDK(ctx, 92, 148, pose);
        // little girder under DK
        const gs = girderSprite('#ff1c54', '#ff8cb0');
        for (let x = 64; x < 160; x += 16) ctx.drawImage(gs, x, 148);
        if (api.credits > 0) { if (coinHold > 0 || (S.t % 60) < 40) txtC(ctx, 'PUSH ONLY 1 PLAYER BUTTON', 168, '#00e8e8'); }
        else if (coinFlash > 0 ? (coinFlash > 90 || (coinFlash % 20) < 14) : (S.t % 60) < 40) txtC(ctx, 'INSERT COIN', 168, coinFlash > 0 ? '#ff2a2a' : '#00e8e8');
        txt(ctx, 'CREDIT ' + String(Math.min(api.credits, 99)).padStart(2, '0'), 144, 248, '#00e8e8');
        txtC(ctx, 'HOW HIGH CAN YOU GET ?', 184, '#ffffff');
        ctx.drawImage(sp.icon, 64, 200); txt(ctx, 'EXTRA AT 7000', 76, 200, '#ffb878');
        txtC(ctx, 'ENTER OR SPACE TO PLAY', 216, '#ff2a2a');
        txtC(ctx, 'NINTENDO 1981', 230, '#ffffff');
      }
      function drawHowHigh(ctx) {
        const n = S.stageIdx + 1;
        for (let i = 0; i < n; i++) {
          const y = 224 - i * 32;
          drawDK(ctx, 92, y, 'front');
          txt(ctx, (i + 1) * 25 + ' M', 32, y - 18, '#ffffff');
        }
        txtC(ctx, 'HOW HIGH CAN YOU GET ?', 236, '#ffffff');
      }

      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (S.mode === 'title') { drawTitle(ctx); drawHUD(ctx); return; }
        if (S.mode === 'howhigh') { drawHowHigh(ctx); drawHUD(ctx); return; }
        drawStage(ctx);
        if (S.mode === 'intro') {
          const I = intro;
          if (I) {
            if (I.pauline) ctx.drawImage(sp.pauline[0], st.pauline.x - 8, st.pauline.y - 22);
            const pose = I.phase === 'climb' ? ((I.t >> 3) & 1 ? 'upL' : 'upR') : I.phase === 'grin' ? 'grin' : 'front';
            drawDK(ctx, I.dkx, I.dky + (I.jy || 0), pose);
            if (I.phase === 'climb') ctx.drawImage(sp.paulineL[0], I.dkx + 26, I.dky - 34);
          }
          drawHUD(ctx);
          return;
        }
        drawEntities(ctx);
        drawHUD(ctx);
        if (S.mode === 'play' && S.ready > 0) txtC(ctx, 'PLAYER 1  READY', 128, '#00e8e8');
        if (S.mode === 'gameover') {
          ctx.fillStyle = '#000'; ctx.fillRect(56, 116, 112, 24);
          ctx.fillStyle = '#3a62ff'; ctx.fillRect(56, 116, 112, 1); ctx.fillRect(56, 139, 112, 1); ctx.fillRect(56, 116, 1, 24); ctx.fillRect(167, 116, 1, 24);
          txtC(ctx, 'GAME  OVER', 124, '#00e8e8');
        }
      }

      if (/[?&]dbg=1/.test(location.search)) {
        window.__G = {
          S, get st() { return st; }, get M() { return M; },
          goto(kind) { S.level = 3; S.stageIdx = [25, 50, 75, 100].indexOf(kind); initStage(); S.mode = 'play'; S.ready = 0; },
          clearRivets() { st.rivets.forEach(r => { r.g.solid = false; }); st.rivetsLeft = 0; },
          get barrels() { return barrels; }, get flames() { return flames; }
        };
      }

      return { update, render };
    }
  });
})();
