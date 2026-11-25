// Nuclear War (New World Computing, 1989) \u2014 satirical turn-based recreation for Arcade Games Galore.
// Based on Flying Buffalo's card game: pick a cartoon world leader, BUILD, spread PROPAGANDA,
// ATTACK and DEFEND against four AI leaders. Last leader with a population left wins.
(function () {
  // ---- compact 5x7 bitmap arcade font ----
  const FK = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-.,:!?=*/'\"<>()+%#@^_~";
  const FD = "ehjlphe4c4444eeh168gvv2421he26aiv22vgu11he68guhhev124888ehhehheehhf12c4ahhvhhuhhuhhuehgggheuhhhhhuvgguggvvggugggfggjhhfhhhvhhhe44444e11111hehikokihggggggvhrllhhhhhpljhhehhhhheuhhugggehhhliduhhukihfgge11uv444444hhhhhhehhhhha4hhhllrhhha4ahhhha4444v1248gv000v00000000cc0000c480cc0cc04444404eh1240400v0v000level001248g04480000aa00000248g842842124824888428422248044v440pq48mj0avaaavaehnlnge4el4444000000vehlplhe";
  const FONT = {};
  for (let i = 0; i < FK.length; i++) { const g = []; for (let r = 0; r < 7; r++) g.push(parseInt(FD[i * 7 + r], 32)); FONT[FK[i]] = g; }
  FONT['\u00a9'] = [0x0E, 0x11, 0x17, 0x14, 0x17, 0x11, 0x0E];
  function text(ctx, s, x, y, col, o) {
    o = o || {}; const sc = o.scale || 1, adv = (o.adv || 6) * sc, bw = o.bold ? 2 : 1;
    s = String(s).toUpperCase();
    const wpx = s.length * adv - (adv - (4 + bw) * sc);
    if (o.center) x = Math.round(x - wpx / 2); else if (o.right) x = Math.round(x - wpx);
    const base = { scale: sc, adv: o.adv, bold: o.bold };
    if (o.outline) for (const d of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]]) text(ctx, s, x + d[0], y + d[1], o.outline, base);
    if (o.shadow) text(ctx, s, x + (o.sd || 1), y + (o.sd || 1), o.shadow, base);
    for (const ch of s) {
      const gl = FONT[ch];
      if (gl) for (let r = 0; r < 7; r++) {
        const b = gl[r]; if (!b) continue;
        ctx.fillStyle = o.rows ? o.rows[r] : col;
        for (let c = 0; c < 5; c++) if ((b >> (4 - c)) & 1) ctx.fillRect(x + c * sc, y + r * sc, sc * bw, sc);
      }
      x += adv;
    }
    return wpx;
  }
  function wrap(s, n) {
    const out = []; let line = '';
    for (const w of String(s).split(' ')) {
      if (line && (line + ' ' + w).length > n) { out.push(line); line = w; } else line = line ? line + ' ' + w : w;
    }
    if (line) out.push(line);
    return out;
  }

  // ---- helpers ----
  const W = 320, H = 240, MH = 128, TAU = Math.PI * 2;
  const rand = Math.random;
  const pick = a => a[Math.floor(rand() * a.length)];
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
  const RGBC = {};
  function rgb(h) {
    let v = RGBC[h]; if (v) return v;
    let s = h.slice(1); if (s.length === 3) s = s.replace(/./g, c => c + c);
    const n = parseInt(s, 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    RGBC[h] = v; return v;
  }
  function hex(r, g, b) { return '#' + ((1 << 24) | (clamp(r) << 16) | (clamp(g) << 8) | clamp(b)).toString(16).slice(1); }
  function mix(a, b, t) { const A = rgb(a), B = rgb(b); return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
  const dark = (c, k) => mix(c, '#000000', 1 - k);
  function hash(x, y) { let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return (n ^ (n >>> 16)) >>> 0; }
  function rect(x, c, X, Y, w, h) { x.fillStyle = c; x.fillRect(Math.round(X), Math.round(Y), w, h); }
  function ell(x, c, cx, cy, rx, ry) {
    if (rx <= 0 || ry <= 0) return;
    x.fillStyle = c;
    const y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
    for (let y = y0; y < y1; y++) {
      const dy = (y + 0.5 - cy) / ry; if (dy <= -1 || dy >= 1) continue;
      const hw = rx * Math.sqrt(1 - dy * dy), a = Math.round(cx - hw), b = Math.round(cx + hw);
      if (b > a) x.fillRect(a, y, b - a, 1);
    }
  }
  const disc = (x, c, cx, cy, r) => ell(x, c, cx, cy, r, r);
  function ellRing(x, c, cx, cy, rx, ry, dash, ph) {
    x.fillStyle = c; const n = Math.max(12, Math.round((rx + ry) * 3.2)); let lx = -999, ly = -999;
    for (let i = 0; i < n; i++) {
      if (dash && ((i + ph) % dash) >= dash / 2) continue;
      const a = i / n * TAU, X = Math.round(cx + Math.cos(a) * rx), Y = Math.round(cy + Math.sin(a) * ry);
      if (X !== lx || Y !== ly) { x.fillRect(X, Y, 1, 1); lx = X; ly = Y; }
    }
  }
  function spr(x, rows, pal, X, Y, flip) {
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r], n = row.length;
      for (let i = 0; i < n; i++) { const col = pal[row[flip ? n - 1 - i : i]]; if (col) { x.fillStyle = col; x.fillRect(X + i, Y + r, 1, 1); } }
    }
  }
  function sprC(rows, pal, flip) { const c = mk(rows[0].length, rows.length); spr(c.getContext('2d'), rows, pal, 0, 0, flip); return c; }
  function line(x, c, x0, y0, x1, y1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0; x.fillStyle = c;
    while (n++ < 800) { x.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  }

  // =====================================================================
  //  THE LEADERS
  // =====================================================================
  const LEADERS = [
    { key: 'raygun', n1: 'RONNIE', n2: 'RAYGUN', name: 'RONNIE RAYGUN', short: 'RAYGUN', land: 'U.S. OF A.', col: '#5cc8ff',
      skin: '#f2b48c', sh: '#c47e5a', hi: '#ffdcc0', hair: '#5c3418', hairHi: '#946034', brow: '#3c2010', suit: '#2c3868', tie: '#d82828',
      rx: 14, ry: 15, sep: 3, ey: 18, my: 29, ny: 24, nw: 2.5, nh: 2, grin: true, rosy: true, voice: 170, aggr: .8, prop: .2, scape: 'dome',
      intro: "WELL... LET'S MAKE THE WORLD SAFE FOR ME.",
      atk: ['WE BEGIN BOMBING IN FIVE MINUTES!', 'GO AHEAD, MAKE MY DAY!', 'WELL... BOMBS AWAY!'],
      hit: ['THERE YOU GO AGAIN!', "NOW I'M REALLY MAD, BONZO!", "I DON'T RECALL ALLOWING THAT!"],
      prop: ["IT'S MORNING IN MY COUNTRY! MOVE HERE!", 'FREE JELLY BEANS FOR EVERYBODY!'],
      build: ['STAR WARS IS A GO!', 'PEACE THROUGH BIGGER STICKS.'],
      def: ["SDI SHIELD UP! I THINK IT'S PLUGGED IN."], block: ['HA! MISSED ME, COMMIE!'],
      dead: 'HONEY, I FORGOT TO DUCK.', win: 'WIN ONE FOR THE GIPPER!' },
    { key: 'gorby', n1: 'MIKHAIL', n2: 'GORBACHEF', name: 'MIKHAIL GORBACHEF', short: 'GORBACHEF', land: 'U.S.S.R.', col: '#ff4a4a',
      skin: '#f0b898', sh: '#c48468', hi: '#ffdcc8', hair: '#a8a8b0', hairHi: '#d0d0d8', brow: '#7c7c84', suit: '#3c4450', tie: '#8c2030',
      rx: 15, ry: 15, sep: 3, ey: 18, my: 29, ny: 24, nw: 3, nh: 2.5, voice: 115, aggr: .55, prop: .3, scape: 'onion',
      intro: 'GLASNOST MEANS I CAN SEE YOUR CITIES FROM HERE.',
      atk: ['PERESTROIKA? MORE LIKE PERE-DESTROY-KA!', 'THIS IS FOR THE GRAIN EMBARGO!', 'SIGN THIS TREATY... WITH YOUR ASHES!'],
      hit: ['NYET! NOW YOU HAVE MADE ME CROSS!', 'MY BIRTHMARK IS THROBBING!', 'THIS MEANS VODKA... ER, WAR!'],
      prop: ['DEFECT NOW! FREE BORSCHT!', "COME TO THE WORKERS' PARADISE!"],
      build: ['FIVE YEAR PLAN: DONE IN ONE TURN!', 'THE MOTHERLAND NEEDS MORE TOYS.'],
      def: ['THE IRON CURTAIN IS NOW BOMB-PROOF.'], block: ['HA! OUR MISSILES ARE BIGGER, COMRADE!'],
      dead: 'I SHOULD HAVE STAYED A FARMER.', win: 'THE PARTY WINS AGAIN!' },
    { key: 'castro', n1: 'INFIDEL', n2: 'CASTRO', name: 'INFIDEL CASTRO', short: 'CASTRO', land: 'CUBA', col: '#ff70d0',
      skin: '#dca07a', sh: '#a86c4c', hi: '#f0c0a0', hair: '#2a2420', hairHi: '#4c4238', brow: '#1c1814', suit: '#5a7030', lip: '#d88a78',
      rx: 13, ry: 15, sep: 3, ey: 18, my: 29, ny: 23, nw: 3, nh: 2.5, voice: 140, aggr: .6, prop: .35, scape: 'palm',
      intro: 'I WILL NOW SPEAK FOR SIX HOURS. THEN WE BOMB.',
      atk: ['HASTA LA VISTA, BABY!', 'THIS CIGAR IS ALSO A MISSILE!', 'VIVA LA KABOOM!'],
      hit: ['MY CIGAR WENT OUT! YOU WILL PAY!', 'YANKEE IMPERIALIST... OR WHOEVER!'],
      prop: ['COME FOR THE CIGARS, STAY FOREVER!', 'FREE RUMBA LESSONS FOR DEFECTORS!'],
      build: ['THE REVOLUTION NEEDS BIGGER BANGS.', 'PUT IT NEXT TO THE CIGAR FACTORY.'],
      def: ['BAY OF PIGS? NOT THIS TIME!'], block: ['HA! I HAVE SURVIVED 600 ATTEMPTS!'],
      dead: 'HISTORY WILL ABSOLVE ME... MAYBE.', win: 'VIVA LA REVOLUCION!' },
    { key: 'kooks', n1: 'AYATOLLAH', n2: 'KOOKS', name: 'AYATOLLAH KOOKS', short: 'KOOKS', land: 'IRAN', col: '#f0e0a8',
      skin: '#c88c64', sh: '#9a6444', hi: '#e0aa84', hair: '#1c1c26', hairHi: '#40404e', brow: '#141414', suit: '#1c1c26',
      rx: 12, ry: 15, sep: 2, ey: 19, my: 30, ny: 25, nw: 2, nh: 3, thick: true, voice: 85, aggr: .95, prop: .15, scape: 'mosque',
      intro: 'DEATH TO EVERYONE! YES, YOU TOO.',
      atk: ['THE GREAT SATAN GETS A GREAT BOMB!', 'DEATH TO... UH... WHOEVER THAT IS!', 'FEEL THE WRATH OF KOOKS!'],
      hit: ['YOU HAVE ANGERED THE KOOKS!', 'A THOUSAND CURSES ON YOUR CAMELS!'],
      prop: ['JOIN US. WE HAVE SAND. LOTS OF SAND.', 'REPENT AND MOVE HERE!'],
      build: ['MORE ROCKETS! THE PROPHECY DEMANDS IT!'],
      def: ['NOTHING SHALL PASS MY BEARD!'], block: ['MY BEARD DEFLECTS ALL!'],
      dead: 'THIS WAS NOT IN THE PROPHECY.', win: 'THE KOOKS INHERIT THE EARTH!' },
    { key: 'mao', n1: 'MAO', n2: 'THE PUN', name: 'MAO THE PUN', short: 'MAO', land: 'CHINA', col: '#ffd820',
      skin: '#f0c890', sh: '#c49860', hi: '#ffe4b8', hair: '#141418', hairHi: '#3a3a44', brow: '#141418', suit: '#7c8a70',
      rx: 15, ry: 15, sep: 3, ey: 19, my: 30, ny: 25, nw: 3.5, nh: 2, voice: 105, aggr: .7, prop: .3, scape: 'pagoda',
      intro: 'A LONG MARCH BEGINS WITH A SINGLE BOMB.',
      atk: ['POWER GROWS FROM A BIG BARREL!', 'LET A HUNDRED BOMBS BLOSSOM!', 'THIS IS A GREAT LEAP... FORWARD!'],
      hit: ['YOU MAO-NSTER!', 'THAT WAS NOT VERY CONFUCIUS!'],
      prop: ['READ MY LITTLE RED BOOK!', "A BILLION PEOPLE CAN'T BE WRONG!"],
      build: ['CULTURAL REVOLUTION: NOW WITH ROCKETS!'],
      def: ['THE GREAT WALL NOW HAS A ROOF.'], block: ['HA! PAPER TIGER MISSILE!'],
      dead: 'THE PUN IS... OVER.', win: 'WHO IS THE PUN-ISHER NOW?' },
    { key: 'ghanji', n1: 'GHANJI', n2: '', name: 'GHANJI', short: 'GHANJI', land: 'INDIA', col: '#ff9028',
      skin: '#b07448', sh: '#82502c', hi: '#cc9468', hair: '#dcdcdc', hairHi: '#ffffff', brow: '#d0d0d0', suit: '#f0ece0',
      rx: 12, ry: 14, sep: 3, ey: 18, my: 29, ny: 24, nw: 2, nh: 3, bigEars: true, voice: 210, aggr: .25, prop: .55, scape: 'taj',
      intro: 'VIOLENCE IS BAD. THIS IS JUST VERY LOUD PEACE.',
      atk: ['THIS IS A NON-VIOLENT MEGATON.', 'I AM SENDING YOU... INNER PEACE.', 'OM... BOOM.'],
      hit: ['I SHALL NOT EAT UNTIL YOU GLOW!', 'MY KARMA RUNS OVER YOUR DOGMA!'],
      prop: ['PEACE, LOVE AND FREE SANDALS!', 'COME MEDITATE WITH US. NO BOMBS... MOSTLY.'],
      build: ['IT IS A PEACEFUL MISSILE. HONEST.'],
      def: ['I WILL SIT HERE AND BLOCK THEM.'], block: ['PASSIVE RESISTANCE WORKS!'],
      dead: 'OM... OUCH.', win: 'PEACE AT LAST. VERY QUIET PEACE.' },
    { key: 'maggie', n1: 'MAGGIE', n2: 'THATCHER', name: 'MAGGIE THATCHER', short: 'THATCHER', land: 'BRITAIN', col: '#b47cff',
      skin: '#f4c0a4', sh: '#c88c74', hi: '#ffe0d0', hair: '#c08a40', hairHi: '#ecbc6c', brow: '#8a6030', suit: '#2444b0', lip: '#c41c3c',
      rx: 13, ry: 15, sep: 3, ey: 18, my: 29, ny: 24, nw: 2, nh: 2, voice: 260, aggr: .75, prop: .2, scape: 'clock',
      intro: 'THE LADY IS NOT FOR TURNING. OR FOR LOSING.',
      atk: ['ONE LUMP OR TWO MEGATONS?', "THE LADY'S NOT FOR TURNING. FIRE!", 'RULE BRITANNIA, RULE THE CRATERS!'],
      hit: ['HOW FRIGHTFULLY RUDE!', 'THAT IS NOT CRICKET!', "YOU'LL HEAR FROM MY HANDBAG!"],
      prop: ['TEA AND CRUMPETS FOR ALL DEFECTORS!', 'PRIVATIZE YOUR LOYALTY TO ME!'],
      build: ['A STRONG ECONOMY BUILDS STRONG BOMBS.'],
      def: ['NOT ONE MISSILE SHALL SPOIL TEA TIME!'], block: ['REJOICE! JUST REJOICE!'],
      dead: 'NOT... CRICKET...', win: 'RULE BRITANNIA!' },
    { key: 'farter', n1: 'JIMMY', n2: 'FARTER', name: 'JIMMY FARTER', short: 'FARTER', land: 'PEANUTIA', col: '#e8a850',
      skin: '#f4bc94', sh: '#c8886a', hi: '#ffdcc4', hair: '#c8a060', hairHi: '#ecd49c', brow: '#a07840', suit: '#7a5c3c', tie: '#3050c0',
      rx: 14, ry: 15, sep: 3, ey: 18, my: 28, ny: 24, nw: 2.5, nh: 2, grin: true, bigEars: true, voice: 190, aggr: .35, prop: .45, scape: 'peanut',
      intro: "I'VE LUSTED IN MY HEART FOR WORLD PEACE.",
      atk: ["THIS ONE'S A REAL NUTCRACKER!", 'AW SHUCKS, SORRY ABOUT THIS.', "I'M NUTS ENOUGH TO DO IT!"],
      hit: ["THAT AIN'T VERY NEIGHBORLY!", 'YOU JUST SHELLED MY PEANUTS!'],
      prop: ['FREE PEANUT BUTTER! CRUNCHY OR SMOOTH!', 'COME ON DOWN TO PEANUTIA!'],
      build: ['ANOTHER ONE FOR THE PEANUT GALLERY.'],
      def: ["I'M SITTING ON THE BUTTON. THE DEFENSE ONE."], block: ['HA! THAT WAS A GOOBER!'],
      dead: 'I SHOULD HAVE STUCK TO PEANUTS.', win: 'AW SHUCKS, I WON!' }
  ];
  const BACKQ = ["YOU CAN'T GET RID OF ME THAT EASILY!", 'I WAS IN THE BUNKER. HA!', "SURPRISE! I'M BACK!"];

  // ---- portrait parts ----
  const OUT = '#1c0c0c';
  const EYE_OPEN = ['.oooo.', 'oWKKWo', 'oWKKWo', '.oooo.'];
  const EYE_CLOSED = ['......', '......', 'oooooo', '.oooo.'];
  const EYE_ANGRY = ['o.....', 'oooo..', 'oWKKoo', '.oooo.'];
  const EYE_LAUGH = ['......', '.oooo.', 'o....o', '......'];
  const EYE_X = ['o...o.', '.o.o..', '..o...', '.o.o..', 'o...o.'];
  const BROW_N = ['.bbbbb.', 'b.....b'];
  const BROW_ANGRY = ['bb.....', '.bbbb..', '....bbb'];
  const BROW_UP = ['..bbb..', '.b...b.', 'b.....b'];
  const BROW_SAD = ['....bbb', '.bbbb..', 'bb.....'];
  const M_SMILE = ['o..........o', '.oo......oo.', '...oooooo...'];
  const M_GRIN = ['o............o', '.oooooooooooo.', '.oZZgZZgZZgZo.', '..oZZgZZgZZo..', '...oooooooo...'];
  const M_TALK = ['..oooooooo..', '.oZZZZZZZZo.', '.oRRRRRRRRo.', '..oRTTTTRo..', '...oooooo...'];
  const M_GRIT = ['.oooooooooo.', 'oZZgZZgZZgZo', 'oZZgZZgZZgZo', '.oooooooooo.'];
  const M_SHOUT = ['..oooooooo..', '.oZZZZZZZZo.', 'oRRRRRRRRRRo', 'oRRRRRRRRRRo', 'oRRRTTTTRRRo', '.oRTTTTTTRo.', '..oooooooo..'];
  const M_LAUGH = ['oooooooooooo', 'oZZZZZZZZZZo', 'oRRRRRRRRRRo', '.oRRRRRRRRo.', '.oRRTTTTRRo.', '..oTTTTTTo..', '...oooooo...'];
  const M_LAUGH2 = ['oooooooooooo', 'oZZZZZZZZZZo', '.oRRRRRRRRo.', '..oTTTTTTo..', '...oooooo...'];
  const M_WAVY = ['............', '.oo..oo..oo.', 'o..oo..oo..o'];
  const M_GASP = ['....oooo....', '...oRRRRo...', '...oRRRRo...', '....oooo....'];
  const VEIN = ['.r.r.', 'rr.rr', '.....', 'rr.rr', '.r.r.'];
  const STAR5 = ['..r..', '.rrr.', 'rrrrr', '.rrr.', '.r.r.'];
  const BIRTH = ['..mm...', '.mmmm.m', 'mmmmmmm', '.mmmmm.', '..mm.m.'];
  const BOW = ['ww...ww', 'wwwbwww', 'ww...ww'];

  function body(x, L, dead) {
    const suit = dead ? mix(L.suit, '#404040', .5) : L.suit, sd = dark(suit, .7);
    ell(x, OUT, 24, 49, 22, 13); ell(x, sd, 24, 49, 21, 12); ell(x, suit, 22, 49, 19, 11);
    const neckW = L.key === 'ghanji' ? 6 : 8, nx = 24 - neckW / 2, sh = dead ? mix(L.sh, '#5c6c5a', .7) : L.sh;
    rect(x, OUT, nx - 1, 31, neckW + 2, 7); rect(x, sh, nx, 31, neckW, 7);
    const V = (col, k, top, bot) => { for (let y = top; y <= bot; y++) { const hw = Math.max(0, (bot - y) * k); if (hw >= .5) rect(x, col, Math.round(24 - hw), y, Math.round(hw * 2), 1); } };
    switch (L.key) {
      case 'castro':
        V(OUT, .55, 36, 45); V('#d8d0b0', .45, 37, 44);
        for (const px of [11, 30]) { rect(x, sd, px, 41, 7, 1); rect(x, sd, px, 41, 1, 5); rect(x, sd, px + 6, 41, 1, 5); rect(x, sd, px, 46, 7, 1); }
        rect(x, '#c8b040', 8, 39, 6, 1); rect(x, '#c8b040', 34, 39, 6, 1);
        break;
      case 'kooks':
        V('#4a4a5a', .5, 35, 47); V('#e8e4dc', .32, 36, 47);
        break;
      case 'mao':
        rect(x, OUT, 17, 35, 14, 4); rect(x, suit, 18, 36, 12, 3); rect(x, sd, 23, 39, 2, 9);
        for (const by of [40, 43, 46]) rect(x, '#e8d488', 23, by, 2, 1);
        rect(x, sd, 12, 43, 6, 1); rect(x, sd, 30, 43, 6, 1);
        break;
      case 'ghanji':
        for (let i = 0; i < 5; i++) line(x, mix(suit, '#9a8c70', .45), 6 + i * 8, 39, 13 + i * 8, 48);
        rect(x, sh, 8, 42, 5, 6);
        break;
      case 'maggie':
        V('#f4f0f0', .5, 36, 45); spr(x, BOW, { w: '#ffffff', b: '#d0d0e0' }, 21, 37);
        for (let i = 0; i < 6; i++) rect(x, '#fffaf0', 19 + i * 2, 34 + (i === 0 || i === 5 ? 0 : 1), 1, 1);
        break;
      default:
        V(OUT, .55, 36, 47); V('#f4f4f4', .45, 37, 47);
        rect(x, L.tie, 23, 39, 3, 9); rect(x, dark(L.tie, .7), 23, 38, 3, 2);
        if (L.key === 'farter') { ell(x, OUT, 13, 44, 2, 3); ell(x, '#e0b070', 13, 44, 1.2, 2.2); }
        if (L.key === 'raygun') { rect(x, '#d82828', 12, 42, 3, 2); rect(x, '#ffffff', 12, 44, 3, 1); }
    }
  }

  const PCACHE = {};
  function portrait(li, expr, fr) {
    const key = li + expr + fr; if (PCACHE[key]) return PCACHE[key];
    const L = LEADERS[li], c = mk(48, 48), x = c.getContext('2d');
    const dead = expr === 'dead', angry = expr === 'angry', laugh = expr === 'laugh';
    let skin = L.skin, sh = L.sh, hi = L.hi, hair = L.hair, hairHi = L.hairHi;
    if (angry) { skin = mix(skin, '#ff5a3c', .2); sh = mix(sh, '#d03020', .22); }
    if (dead) { skin = mix(skin, '#8c9c84', .7); sh = mix(sh, '#5c6c5a', .7); hi = mix(hi, '#b0c0a8', .7); hair = mix(hair, '#303030', .5); hairHi = mix(hairHi, '#505050', .5); }
    // background spotlight
    const bc = angry ? '#d83030' : laugh ? '#f0c020' : dead ? '#585860' : L.col;
    rect(x, dark(bc, .22), 0, 0, 48, 48);
    disc(x, dark(bc, .36), 24, 21, 26); disc(x, dark(bc, .5), 24, 21, 19);
    if (laugh || angry) for (let i = 0; i < 14; i++) {
      const a = i / 14 * TAU + .1;
      for (let r = 21; r < 36; r += 1) { const X = Math.round(24 + Math.cos(a) * r), Y = Math.round(21 + Math.sin(a) * r); if (X >= 0 && X < 48 && Y >= 0 && Y < 48) rect(x, dark(bc, .62), X, Y, 1, 1); }
    }
    body(x, L, dead);
    // hair behind head
    if (L.key === 'maggie') { ell(x, OUT, 24, 19, 18, 16); ell(x, hair, 24, 19, 17, 15); for (let i = 0; i < 5; i++) rect(x, hairHi, 8 + i, 18 + i * 2, 1, 3); for (let i = 0; i < 5; i++) rect(x, dark(hair, .75), 39 - i, 18 + i * 2, 1, 3); }
    // ears
    const er = L.bigEars ? [4, 5] : [3, 4];
    for (const s of [-1, 1]) {
      const ex = 24 + s * L.rx;
      ell(x, OUT, ex, 23, er[0] + 1, er[1] + 1); ell(x, sh, ex, 23, er[0], er[1]); ell(x, skin, ex - s * .6, 22.5, er[0] - 1.5, er[1] - 1.5);
    }
    // head
    ell(x, OUT, 24, 21, L.rx + 1, L.ry + 1); ell(x, sh, 24, 21, L.rx, L.ry); ell(x, skin, 23, 20, L.rx - 1.5, L.ry - 1.5);
    ell(x, hi, 19, 12, 3.5, 2.5);
    // hair / hats
    switch (L.key) {
      case 'raygun':
        rect(x, OUT, 9, 9, 4, 11); rect(x, hair, 10, 10, 3, 10); rect(x, OUT, 35, 9, 4, 11); rect(x, hair, 35, 10, 3, 10);
        ell(x, OUT, 24, 9, 15, 7); ell(x, hair, 24, 9, 14, 6); ell(x, hairHi, 21, 6.5, 8, 2.5);
        ell(x, OUT, 30, 12.5, 6, 3); ell(x, hair, 30, 12, 5, 2.5); rect(x, hairHi, 28, 11, 4, 1);
        rect(x, sh, 18, 16, 4, 1); rect(x, sh, 26, 16, 4, 1);
        break;
      case 'gorby':
        ell(x, OUT, 10.5, 21, 3, 6.5); ell(x, hair, 10.5, 21, 2, 5.5); ell(x, OUT, 37.5, 21, 3, 6.5); ell(x, hair, 37.5, 21, 2, 5.5);
        ell(x, mix(hi, '#ffffff', .3), 20, 10, 3, 1.5);
        spr(x, BIRTH, { m: dead ? '#5a3048' : '#b03c70' }, 25, 7);
        break;
      case 'castro':
        rect(x, OUT, 9, 13, 4, 10); rect(x, hair, 10, 13, 3, 10); rect(x, OUT, 35, 13, 4, 10); rect(x, hair, 35, 13, 3, 10);
        rect(x, OUT, 10, 1, 28, 12); rect(x, dead ? '#4a5038' : '#5a7030', 11, 2, 26, 10); rect(x, dead ? '#5a6048' : '#748a44', 11, 2, 26, 2); rect(x, '#465a24', 11, 10, 26, 2);
        spr(x, STAR5, { r: dead ? '#803030' : '#e82020' }, 22, 4);
        ell(x, OUT, 24, 13, 15, 3); ell(x, '#3a4a1c', 24, 13, 14, 2);
        break;
      case 'kooks': {
        ell(x, OUT, 24, 8, 17, 9.5); ell(x, hair, 24, 8, 16, 8.5);
        for (let i = 0; i < 4; i++) for (let X = 9; X < 40; X++) {
          const Y = Math.round(2 + i * 3.4 + Math.abs(X - 24) * .14 * (i - 1.2));
          const dx = (X - 24) / 15.5, dy = (Y - 8) / 8; if (dx * dx + dy * dy < .9) rect(x, hairHi, X, Y, 1, 1);
        }
        break;
      }
      case 'mao':
        rect(x, OUT, 8, 11, 5, 11); rect(x, hair, 9, 11, 3, 10); rect(x, OUT, 35, 11, 5, 11); rect(x, hair, 36, 11, 3, 10);
        ell(x, OUT, 24, 9, 16, 7.5); ell(x, hair, 24, 9, 15, 6.5); ell(x, skin, 23.5, 13.5, 10, 6); ell(x, hi, 20, 11, 3, 1.5);
        rect(x, hairHi, 15, 4, 12, 1); rect(x, hairHi, 13, 6, 4, 1);
        break;
      case 'ghanji':
        ell(x, OUT, 10.5, 16, 2.5, 3.5); ell(x, hair, 10.5, 16, 1.6, 2.6); ell(x, OUT, 37.5, 16, 2.5, 3.5); ell(x, hair, 37.5, 16, 1.6, 2.6);
        ell(x, mix(hi, '#ffffff', .35), 20, 9, 3, 1.5);
        break;
      case 'maggie':
        ell(x, OUT, 24, 9, 15.5, 7); ell(x, hair, 24, 9, 14.5, 6); ell(x, hairHi, 20, 6.5, 8, 2.5);
        ell(x, OUT, 16, 13, 4.5, 3); ell(x, hair, 16, 12.5, 4, 2.5); ell(x, OUT, 32, 13, 4.5, 3); ell(x, hair, 32, 12.5, 4, 2.5);
        rect(x, hairHi, 14, 11, 3, 1); rect(x, hairHi, 30, 11, 3, 1);
        break;
      case 'farter':
        rect(x, OUT, 9, 10, 4, 7); rect(x, hair, 10, 10, 3, 6); rect(x, OUT, 35, 10, 4, 7); rect(x, hair, 35, 10, 3, 6);
        ell(x, OUT, 24, 9, 15, 7); ell(x, hair, 24, 9, 14, 6); ell(x, hairHi, 28, 7, 8, 2.5);
        line(x, dark(hair, .55), 17, 4, 19, 13);
        break;
    }
    // nose
    ell(x, OUT, 24, L.ny + .5, L.nw + .8, L.nh + .8); ell(x, sh, 24, L.ny, L.nw, L.nh);
    rect(x, hi, 23, Math.round(L.ny - L.nh + 1), 1, 1); rect(x, dark(sh, .7), 22, L.ny + 1, 1, 1); rect(x, dark(sh, .7), 26, L.ny + 1, 1, 1);
    // cheeks
    if (laugh || L.rosy) { ell(x, '#f08070', 24 - L.rx + 4, L.my - 1, 2, 1.5); ell(x, '#f08070', 24 + L.rx - 4, L.my - 1, 2, 1.5); }
    if (angry) { ell(x, '#e83828', 24 - L.rx + 4, L.my - 2, 3, 1.5); ell(x, '#e83828', 24 + L.rx - 4, L.my - 2, 3, 1.5); }
    // beards
    if (L.key === 'castro') {
      rect(x, OUT, 9, 18, 4, 12); rect(x, hair, 10, 18, 3, 12); rect(x, OUT, 35, 18, 4, 12); rect(x, hair, 35, 18, 3, 12);
      ell(x, OUT, 24, 31, 14.5, 9.5); ell(x, hair, 24, 31, 13.5, 8.5);
      for (let i = 0; i < 40; i++) { const hx = 12 + (hash(i, 3) % 25), hy = 26 + (hash(i, 7) % 13), dx = (hx - 24) / 13, dy = (hy - 31) / 8.5; if (dx * dx + dy * dy < .85) rect(x, hairHi, hx, hy, 1, 1); }
      ell(x, hair, 24, 27, 6.5, 1.8);
    }
    if (L.key === 'kooks') {
      const bd = dead ? '#9a9a94' : '#b4b4ac', bl = dead ? '#c0c0b8' : '#e4e4dc';
      ell(x, OUT, 24, 34, 13, 13); ell(x, bd, 24, 34, 12, 12); ell(x, bl, 22.5, 33, 10, 10.5);
      for (let i = 0; i < 7; i++) rect(x, bd, 16 + i * 2.4, 36 + (i & 1) * 2, 1, 5);
      ell(x, bl, 24, 28, 6.5, 1.8);
    }
    // mouth
    let M;
    if (dead) M = fr === 1 ? M_GASP : M_WAVY;
    else if (angry) M = fr === 1 ? M_SHOUT : M_GRIT;
    else if (laugh) M = fr === 1 ? M_LAUGH2 : M_LAUGH;
    else M = fr === 1 ? M_TALK : (L.grin ? M_GRIN : M_SMILE);
    const mw = M[0].length;
    spr(x, M, { o: L.lip || (L.key === 'kooks' ? '#3a2018' : OUT), Z: '#fffff4', g: '#b8b8c8', R: '#6a1018', T: '#e05a70' }, Math.round(24 - mw / 2), L.my);
    if (L.key === 'castro' && !dead && expr === 'neutral' && fr !== 1) {
      rect(x, OUT, 29, 30, 12, 4); rect(x, '#8c5a2c', 30, 31, 10, 2); rect(x, '#d8a830', 32, 31, 1, 2); rect(x, '#ff6a20', 40, 31, 1, 2);
      rect(x, '#d0d0d8', 41, 28, 1, 1); rect(x, '#d0d0d8', 42, 26, 1, 1); rect(x, '#d0d0d8', 41, 24, 1, 1); rect(x, '#d0d0d8', 42, 22, 1, 1);
    }
    // eyes
    const ex1 = 24 - L.sep - 6, ex2 = 24 + L.sep, ey = L.ey;
    if (L.key === 'ghanji') {
      for (const exx of [ex1, ex2]) { disc(x, '#202020', exx + 3, ey + 2, 5); disc(x, mix(skin, '#d8f0ff', .45), exx + 3, ey + 2, 4); }
      rect(x, '#202020', ex1 + 6, ey + 1, ex2 - ex1 - 6, 1); rect(x, '#202020', 8, ey + 1, ex1 - 9, 1); rect(x, '#202020', ex2 + 9, ey + 1, 40 - ex2 - 9, 1);
    }
    if (L.key === 'maggie' && !dead) { rect(x, '#6c88e8', ex1 + 1, ey - 1, 4, 1); rect(x, '#6c88e8', ex2 + 1, ey - 1, 4, 1); }
    let E;
    if (dead) E = EYE_X; else if (laugh) E = EYE_LAUGH; else if (fr === 2) E = EYE_CLOSED; else if (angry) E = EYE_ANGRY; else E = EYE_OPEN;
    const ep = { o: OUT, W: '#ffffff', K: '#141020' };
    spr(x, E, ep, ex1, ey, false); spr(x, E, ep, ex2, ey, true);
    if (L.key === 'maggie' && !dead) { rect(x, OUT, ex1 - 1, ey, 1, 1); rect(x, OUT, ex2 + 6, ey, 1, 1); rect(x, '#ffffff', 10, 28, 2, 2); rect(x, '#ffffff', 36, 28, 2, 2); }
    // brows
    const B = dead ? BROW_SAD : angry ? BROW_ANGRY : laugh ? BROW_UP : BROW_N;
    const by = ey - B.length - (laugh ? 1 : 0);
    spr(x, B, { b: L.brow }, ex1 - 1, by, false); spr(x, B, { b: L.brow }, ex2, by, true);
    if (L.thick) { spr(x, B, { b: L.brow }, ex1 - 1, by - 1, false); spr(x, B, { b: L.brow }, ex2, by - 1, true); }
    // expression extras
    if (angry) {
      spr(x, VEIN, { r: '#ff2a2a' }, 37, 3);
      const sx = fr === 1 ? 40 : 7;
      disc(x, '#f4f4f4', sx, 9, 2.5); disc(x, '#f4f4f4', sx + (fr === 1 ? 3 : -3), 5, 1.6);
    }
    if (laugh) { rect(x, '#80d8ff', ex1 - 2, ey + 3, 1, 2); rect(x, '#80d8ff', ex2 + 7, ey + 3, 1, 2); rect(x, '#c0f0ff', ex1 - 2, ey + 3, 1, 1); }
    if (dead) {
      disc(x, '#2a2a2a', 16, 11, 1.5); disc(x, '#2a2a2a', 33, 25, 1.3); rect(x, '#2a2a2a', 13, 27, 2, 1); rect(x, '#2a2a2a', 30, 9, 3, 1);
      rect(x, '#e8d8b0', 27, 9, 7, 2); rect(x, '#e8d8b0', 29.5, 7, 2, 6); rect(x, '#c0a880', 27, 10, 7, 1);
      const o = fr === 1 ? 1 : 0;
      disc(x, '#8a8a92', 11, 4 - o, 3); disc(x, '#b4b4bc', 17, 2 - o, 2.3); disc(x, '#8a8a92', 37, 3 + o, 3); disc(x, '#b4b4bc', 42, 1 + o, 2);
    }
    // frame shading
    rect(x, 'rgba(255,255,255,0.12)', 0, 0, 48, 1); rect(x, 'rgba(0,0,0,0.25)', 0, 47, 48, 1);
    PCACHE[key] = c; return c;
  }

  // =====================================================================
  //  THE WORLD MAP  (lon,lat polygons -> crisp pixel masks)
  // =====================================================================
  const PX = lon => (lon + 180) * W / 360, PY = lat => (75 - lat) * MH / 130;
  const tUK = (a, b) => [-6.5 + (a + 2) * 1.75, 58 + (b - 54.5) * 1.75];
  const tCU = (a, b) => [-74 + (a + 79.5) * 2, 19 + (b - 21.5) * 3];
  const tf = (p, f) => { const o = []; for (let i = 0; i < p.length; i += 2) { const q = f(p[i], p[i + 1]); o.push(q[0], q[1]); } return o; };
  const NAM = [-168, 66, -162, 70, -150, 71, -140, 70, -128, 70, -115, 69, -100, 69, -94, 72, -82, 73, -78, 70, -72, 67, -64, 60, -61, 56, -56, 52, -60, 47, -66, 45, -70, 43, -71, 41, -74, 40, -76, 37, -76, 35, -78, 33, -81, 31, -80, 27, -80, 25, -82, 26, -83, 29, -86, 30, -90, 29, -94, 29.5, -97, 27, -97, 22, -95, 18.5, -91, 19, -90, 21, -87, 21, -88, 16, -84, 15, -83, 10, -79, 9, -77, 8, -78, 7, -80, 7.5, -84, 9, -86, 12, -88, 13, -92, 14.5, -96, 16, -101, 17, -105, 20, -106, 23, -109, 26, -112, 29, -113, 31, -114, 30, -110, 24, -112, 24, -115, 28, -117, 32, -119, 34, -121, 35, -123, 38, -124, 42, -124, 46, -124, 49, -127, 51, -131, 55, -135, 58, -140, 60, -146, 61, -152, 59, -158, 57, -162, 55, -158, 58, -162, 60, -166, 62, -165, 64];
  const GREEN = [-72, 78, -60, 82, -30, 83, -20, 80, -18, 75, -22, 70, -30, 68, -40, 65, -44, 60, -50, 62, -54, 66, -56, 72, -66, 76];
  const BAFFIN = [-80, 73, -68, 70, -62, 66, -66, 63, -74, 64, -80, 68, -90, 71];
  const ARCT = [-122, 74, -95, 74, -82, 76.5, -100, 80, -122, 78];
  const ICEL = [-28, 66, -18, 67, -17.5, 65, -24, 64];
  const SAM = [-80, 9, -76, 11, -72, 12, -64, 10.5, -60, 8.5, -55, 6, -51, 4, -50, 0, -44, -2, -38, -4, -35, -6, -35, -9, -39, -15, -39, -18, -41, -22, -44, -23, -48, -26, -49, -29, -53, -33, -58, -35, -57, -38, -62, -39, -65, -42, -64, -45, -68, -47, -66, -50, -69, -52, -68, -54, -72, -54, -75, -50, -74, -44, -73, -38, -71, -30, -70, -20, -71, -17, -76, -14, -78, -10, -81, -6, -80, -2, -78, 1, -77, 4, -78, 7];
  const AFR = [-17, 21, -16, 26, -13, 28, -9, 32, -6, 35.8, -1, 35.5, 3, 36.8, 10, 37.2, 11, 33, 15, 32, 20, 31, 25, 32, 29, 31, 32, 31.3, 34, 28, 37, 22, 39, 16, 43, 12, 51, 12, 51, 10, 48, 5, 42, -1, 40, -5, 40, -11, 41, -15, 35, -21, 35, -24, 33, -27, 30, -31, 25, -34, 20, -35, 18, -32, 15, -27, 12, -18, 13, -12, 12, -6, 9, -1, 9, 4, 5, 5, 0, 5.5, -5, 5, -8, 4.5, -12, 7, -15, 11, -17, 14.5];
  const MADA = [44, -12, 50, -15, 50, -17, 47, -25, 44, -25, 43, -20, 44, -17];
  const EUR = [-9, 37, -9, 43, -2, 43.5, -1.5, 46, -4.5, 48, -1, 49.5, 2, 51, 4, 52, 5, 53.3, 8, 54, 8.5, 57, 10.5, 57.7, 10.5, 54.5, 12, 54.3, 14, 54, 19, 54.5, 21, 57, 24, 59.5, 29, 60, 23, 61, 21, 63, 25, 65.5, 22, 65.8, 17, 61, 19, 60, 16, 56.5, 12.5, 56, 11, 59, 8, 58, 5, 59, 5, 62, 11, 64, 14, 67, 18, 69.5, 25, 71, 30, 70, 33, 69, 41, 67, 41, 66, 34, 66, 36, 64.5, 44, 66, 44, 68, 53, 68.5, 60, 69.5, 68, 71, 73, 72, 80, 73, 87, 75, 100, 77, 113, 74, 128, 73, 140, 72.5, 150, 71.5, 160, 70, 170, 70, 180, 69, 180, 65, 178, 64.5, 173, 61, 165, 60, 163, 57, 162, 55, 156, 51, 156, 57, 160, 61, 154, 59.5, 143, 59, 137, 54.5, 140, 52, 141, 48, 135, 43, 130, 42, 129, 40, 128, 35, 126, 34.7, 126.5, 37.5, 125, 39.5, 121, 39, 122, 40.5, 119, 39.5, 118, 38.5, 120.5, 37, 119, 35, 121, 32, 121.8, 30.5, 120, 26, 117, 23.5, 114, 22.3, 110, 21, 109, 19, 107, 21, 106, 18, 109, 12, 109, 10.5, 105, 8.6, 105, 10, 103, 10.5, 100, 13.5, 99.5, 10, 101, 6.5, 104, 1.5, 101, 3, 98.5, 8, 98.2, 13, 97.6, 16.5, 94.5, 17, 94, 19.5, 92, 21.5, 90, 22, 88, 21.6, 86.5, 20, 85, 19.5, 80.3, 15.5, 80, 10, 77.5, 8, 76, 10, 74.5, 14, 73, 19, 72.5, 21.5, 70, 22.5, 68.5, 23.5, 66.5, 25.3, 61.5, 25.2, 57, 25.7, 56.3, 27, 54, 26.6, 51.5, 27.9, 50, 30, 48, 30, 50, 26, 51.5, 25, 51.5, 24, 54, 24, 56, 26, 56.5, 24, 59.8, 22.5, 57.5, 19, 55, 17, 52, 16, 48, 14, 45, 13, 43.5, 12.7, 42.5, 15, 41, 19, 39, 22, 38, 24, 35, 28, 34.5, 29.5, 34, 31.5, 35, 33, 36, 35.5, 36, 36.8, 32, 36.2, 29, 36.5, 27, 37.5, 26.3, 40, 28.5, 41, 26, 41, 26, 40.5, 24, 40, 22.5, 40.5, 24, 38, 22, 36.5, 21, 38.5, 19.5, 41, 19, 42.5, 16, 44, 13.8, 45.6, 12.4, 45, 13.6, 43.5, 16, 41.8, 18.5, 40.2, 16.5, 39, 16, 38, 15.6, 40, 12, 41.8, 10.5, 43, 8.8, 44.4, 6, 43, 3, 43.3, 3.2, 42, 0.8, 41, -0.5, 39, 0, 38.8, -0.7, 37.6, -2.2, 36.7, -5.6, 36, -6.3, 36.8, -7.5, 37.2];
  const BRIT = tf([-5.7, 50, 1.5, 51, 1.8, 52.8, 0, 53.5, -1.5, 55, -2, 56, -1.8, 57.6, -3, 58.7, -5, 58.6, -6.2, 57.5, -5.6, 56, -4.8, 54.8, -3, 54.5, -3.3, 53.4, -4.5, 53.2, -4.2, 52, -5.3, 51.7, -3.5, 51.4], tUK);
  const IREL = tf([-10, 51.6, -6, 52, -6, 55.2, -8, 55.2, -10, 54], (a, b) => { const q = tUK(a, b); return [q[0] - 2.6, q[1]]; });
  const CUBA = tf([-85, 21.8, -82, 23.1, -78, 22.7, -74.2, 20.2, -77.5, 19.9, -80.5, 21.6, -84.5, 21.1], tCU);
  const JAPAN = [130, 31, 131.5, 34, 135, 33.5, 140, 35, 141, 38, 142, 41, 140, 40.5, 139, 38, 137, 36.8, 133, 35.5, 130, 33.5];
  const HOKK = [140, 42, 145.5, 43.3, 142, 45.5, 141.5, 43.5];
  const SRIL = [80, 10, 81.8, 7.5, 80.5, 6, 79.8, 8];
  const TAIW = [120.5, 22.5, 121.7, 25.2, 121, 25, 120, 23.5];
  const BORN = [109, 1.5, 117, 7, 119, 5, 118, 1, 116, -4, 111, -3, 109, -1];
  const SUMA = [95, 5.5, 98, 4, 104, -2, 106, -5.8, 104, -5, 100, -1, 96, 3];
  const JAVA = [105, -6, 114, -7, 114.5, -8.5, 106, -7];
  const NGUI = [131, -1, 138, -1.5, 147, -6, 150, -10, 143, -9, 138, -8, 135, -4, 132, -2.5];
  const PHIL = [120, 18.5, 122.5, 18, 124, 13, 126, 7, 125, 6, 122, 7, 123.5, 10, 121, 13, 120, 15];
  const AUS = [114, -22, 114, -26, 115, -34, 118, -35, 123, -33.8, 126, -32.3, 131, -31.5, 135, -34.8, 138, -35, 138, -32.5, 140, -38, 144, -38.5, 146.5, -39, 150, -37.5, 153, -32, 153.5, -28, 153, -25, 150.5, -22.5, 146, -19, 145.3, -15, 142.5, -10.7, 141.5, -13, 141.5, -17, 139, -17.5, 136, -15.5, 137, -12, 133, -11.5, 130, -13, 129, -15, 125, -14.5, 123, -17, 121, -19.5, 117, -20.7];
  const NZN = [172.5, -34.5, 175.5, -37.5, 178.5, -37.7, 176, -41.5, 174.5, -41.3];
  const NZS = [172, -40.5, 174, -41.5, 171, -44.5, 168.5, -46.5, 166.5, -46, 170.5, -42.5];
  const LAND = [NAM, GREEN, BAFFIN, ARCT, ICEL, SAM, AFR, MADA, EUR, BRIT, IREL, CUBA, JAPAN, HOKK, SRIL, TAIW, BORN, SUMA, JAVA, NGUI, PHIL, AUS, NZN, NZS];
  const WATER = [[-95, 59, -94, 64, -86, 66, -80, 63, -77, 60, -80, 55, -82, 52, -87, 56, -92, 57],
    [28, 41.5, 29, 44.5, 33, 44.5, 33.5, 46, 36.5, 45.5, 38, 47, 39.5, 47, 41.5, 42, 37, 41, 31, 41],
    [47, 45.5, 49.5, 46.5, 53, 46.5, 52.5, 44, 51, 42.5, 53, 41, 53.8, 37, 50.5, 37, 49, 38.5, 49.5, 40.5, 47.5, 43]];
  // countries indexed like LEADERS
  const CTRY = [
    { polys: [[-125, 49, -95, 49, -89, 48, -83, 46, -82.5, 42, -79, 43, -76, 44, -71, 45, -67, 45, -60, 44, -66, 40, -76, 30, -80, 24, -86, 29, -97, 24.5, -100, 28, -103, 29, -106, 31.5, -111, 31.3, -115, 32.5, -118, 32, -126, 40], [-170, 72, -141, 72, -141, 60, -130, 54, -160, 50, -170, 58]],
      cities: [['WASHINGTON', -77, 38.9], ['LOS ANGELES', -118.2, 34.2], ['CHICAGO', -87.7, 41.8], ['HOUSTON', -95.4, 29.9]] },
    { polys: [[21, 55, 27, 57, 28, 60, 30, 61, 29, 69.5, 32, 70.5, 45, 70, 60, 72, 80, 76, 110, 80, 180, 72, 180, 62, 165, 58, 155, 48, 140, 46, 135, 48, 131, 43, 127, 50, 122, 53, 117, 50, 108, 50, 98, 51, 88, 49, 80, 45, 75, 40, 70, 37.5, 66, 37.4, 61, 35.6, 55, 38, 53.5, 37.5, 50, 37.5, 47, 39, 44, 41, 40, 41.3, 37, 45, 31, 46, 29, 46, 27, 48.5, 23, 49, 23, 52, 24, 53.8]],
      cities: [['MOSCOW', 37.6, 55.8], ['LENINGRAD', 30.3, 59.9], ['NOVOSIBIRSK', 82.9, 55], ['VLADIVOSTOK', 133, 44.5]] },
    { polys: [CUBA], island: true, cities: [['HAVANA', -82.3, 22.6], ['SANTIAGO', -76.5, 20.5]].map(c => [c[0]].concat(tCU(c[1], c[2]))) },
    { polys: [[44, 39.5, 48, 38.5, 49, 38, 53.5, 37.5, 55, 38, 61, 35.8, 61.5, 31, 60.8, 29.5, 63, 26, 61.5, 25, 57, 25.5, 54, 26.6, 51.5, 27.9, 50, 30, 48, 30.2, 46, 33, 45.5, 35.5, 44, 37.5]],
      cities: [['TEHRAN', 50, 36], ['MASHHAD', 59, 34.5], ['BANDAR', 55, 27.5]] },
    { polys: [[74, 39, 80, 42, 82, 45, 87, 49, 90, 47.5, 96, 43, 105, 41.5, 112, 43, 117, 46.5, 120, 49, 122, 53, 127, 50, 131, 43, 129, 42, 125, 40, 121.5, 40.8, 117, 38, 121, 36.5, 122, 30, 120, 25, 116, 22, 110, 20.5, 108, 18, 106, 22.5, 101, 22, 98, 24.5, 97.5, 28.2, 92, 27.8, 89, 28, 86, 28, 81, 30, 78.5, 32.5, 79, 35.5, 75, 37.5]],
      cities: [['BEIJING', 116.4, 39.9], ['SHANGHAI', 120.5, 31.2], ['CANTON', 113.3, 23.1], ['CHENGDU', 104, 30.6]] },
    { polys: [[68, 23.5, 70, 26, 71, 28, 74, 31, 74, 34.5, 77, 35.5, 79, 33, 79, 31, 81, 30, 84, 28, 88, 27, 92, 28, 96, 29, 97, 27, 95, 25, 92.5, 22, 89, 22, 88, 21.6, 86.5, 20, 85, 19.5, 80.3, 15.5, 80, 10, 77.5, 7.5, 76, 10, 74.5, 14, 73, 19, 72.5, 21.5, 70, 22.5]],
      cities: [['NEW DELHI', 77.2, 28.6], ['BOMBAY', 73.8, 19.5], ['CALCUTTA', 88, 23], ['MADRAS', 79.6, 13.1]] },
    { polys: [BRIT], island: true, cities: [['LONDON', -0.6, 51.7], ['EDINBURGH', -3.4, 56.4]].map(c => [c[0]].concat(tUK(c[1], c[2]))) },
    { polys: [[-74, -5, -70, 2, -60, 5, -52, 4, -50, 0, -44, -2, -35, -6, -39, -15, -41, -22, -48, -26, -53, -33, -57, -30, -55, -26, -58, -20, -60, -14, -66, -10, -73, -10]],
      cities: [['PLAINS', -47.9, -15.8], ['GOOBER BAY', -38.6, -12.5], ['JIMMYVILLE', -44, -22.5], ['LEGUME CITY', -60, -4]] }
  ];
  const PRIORITY = [6, 2, 3, 5, 4, 0, 7, 1];

  function maskOf(polys) {
    const c = mk(W, MH), x = c.getContext('2d'); x.fillStyle = '#fff';
    for (const p of polys) {
      x.beginPath();
      for (let i = 0; i < p.length; i += 2) { const X = PX(p[i]), Y = PY(p[i + 1]); if (i) x.lineTo(X, Y); else x.moveTo(X, Y); }
      x.closePath(); x.fill();
    }
    const d = x.getImageData(0, 0, W, MH).data, m = new Uint8Array(W * MH);
    for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] >= 128 ? 1 : 0;
    return m;
  }
  function landCol(lon, lat, h) {
    if (lat > 67 || lat < -50) return h % 3 ? '#eef4fa' : '#d0dcea';
    if (lat > 57) return h % 4 ? '#7aaa62' : '#68985a';
    const desert = (lon > -17 && lon < 33 && lat > 15 && lat < 31) || (lon > 35 && lon < 60 && lat > 15 && lat < 31) ||
      (lon > 118 && lon < 142 && lat > -32 && lat < -19) || (lon > 85 && lon < 115 && lat > 38 && lat < 46) ||
      (lon > -116 && lon < -103 && lat > 29 && lat < 37) || (lon > 52 && lon < 66 && lat > 36 && lat < 45);
    if (desert) return h % 4 ? '#dcbc64' : '#c8a44c';
    if (lat > -12 && lat < 9) return h % 3 ? '#2e9a3a' : '#22802e';
    return h % 5 ? '#4cae3c' : '#3e9632';
  }
  function buildMap() {
    const land = maskOf(LAND), wat = maskOf(WATER);
    for (let i = 0; i < land.length; i++) if (wat[i]) land[i] = 0;
    const own = new Int8Array(W * MH).fill(-1);
    for (const ci of PRIORITY) { const m = maskOf(CTRY[ci].polys); for (let i = 0; i < m.length; i++) if (m[i] && land[i] && own[i] < 0) own[i] = ci; }
    const cv = mk(W, MH), cx = cv.getContext('2d'), img = cx.createImageData(W, MH), d = img.data;
    const Lm = (x, y) => x >= 0 && x < W && y >= 0 && y < MH && land[y * W + x] === 1;
    for (let y = 0; y < MH; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, lon = (x + .5) * 360 / W - 180, lat = 75 - (y + .5) * 130 / MH, h = hash(x, y);
      let col;
      if (land[i]) {
        col = landCol(lon, lat, h);
        if (!Lm(x - 1, y) || !Lm(x + 1, y) || !Lm(x, y - 1) || !Lm(x, y + 1)) col = dark(col, .55);
        else if (!Lm(x - 1, y - 1)) col = mix(col, '#ffffff', .2);
      } else {
        let near = 9;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (Lm(x + dx, y + dy)) near = Math.min(near, Math.max(Math.abs(dx), Math.abs(dy)));
        if (near === 1) col = '#4c8ae4'; else if (near === 2) col = '#3272d2';
        else {
          col = '#1c44a8';
          if ((y & 3) === 1 && ((x + (y >> 2) * 5) % 11) < 2) col = '#2a58c0';
          else if (((x % 40) === 0 || (y % 32) === 0) && ((x + y) & 1)) col = '#2850b8';
        }
      }
      const c3 = rgb(col); d[i * 4] = c3[0]; d[i * 4 + 1] = c3[1]; d[i * 4 + 2] = c3[2]; d[i * 4 + 3] = 255;
    }
    cx.putImageData(img, 0, 0);
    const info = [];
    for (let ci = 0; ci < 8; ci++) {
      let sx = 0, sy = 0, n = 0, x0 = W, x1 = 0, y0 = MH, y1 = 0;
      for (let i = 0; i < own.length; i++) if (own[i] === ci) { const x = i % W, y = (i / W) | 0; sx += x; sy += y; n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      info.push(n ? { cx: sx / n, cy: sy / n, x0, x1, y0, y1 } : { cx: 160, cy: 64, x0: 150, x1: 170, y0: 54, y1: 74 });
    }
    return { cv, land, own, rgbData: new Uint8ClampedArray(d), info };
  }

  // map sprites
  const CITY = ['...o...', '..owo..', '.oowoo.', 'owwwwwo', 'owywywo', 'ooooooo'];
  const CRATER = ['.......', '.kkkkk.', 'krrkrrk', '.kkkkk.'];
  const S_CITY = sprC(CITY, { o: '#1a1a2a', w: '#e8e8f0', y: '#ffe060' });
  const S_CAP = sprC(CITY, { o: '#1a1a2a', w: '#fff4a0', y: '#ff9020' });
  const S_CRATER = [sprC(CRATER, { k: '#2a1810', r: '#ff6020' }), sprC(CRATER, { k: '#2a1810', r: '#c03010' })];
  const BOMBER = ['o.........', 'oo....oo..', 'oocccccccoo', 'oooooocooo.', '.....oo....'];
  const S_BOMBER = {};
  const ICONS = {
    atlas: ['..w..', '.www.', '.wrw.', '.www.', '.www.', '.www.', 'wwwww', 'w.w.w'],
    titan: ['...w...', '..www..', '..wrw..', '.wwwww.', '.wwwww.', '.wwwww.', 'wwwwwww', 'ww.w.ww'],
    bomber: ['....w....', '...www...', 'wwwwwwwww', '...www...', '...www...', '..wwwww..'],
    bomb: ['..kk..', '.kyyk.', 'kyyyyk', 'kyrryk', 'kyyyyk', '.kyyk.', '..kk..', '.k..k.'],
    abm: ['.ccccc.', 'cwwcwwc', 'cwwcwwc', 'cccwccc', '.cwwwc.', '.cwwwc.', '..cwc..', '...c...'],
    moon: ['..yyy..', '.yyy...', 'yyy....', 'yyy....', 'yyy....', '.yyy...', '..yyy..'],
    station: ['b.....b', 'bb.w.bb', 'bbwwwbb', 'bb.w.bb', 'b.....b']
  };
  const PERSON = [['.ooo.', 'ohhho', 'obbbo', 'bbbbb', 'obbbo', 'olol.', 'o.o..'], ['.ooo.', 'ohhho', 'obbbo', 'bbbbb', 'obbbo', '.olol', '..o.o']];
  const ICP = { w: '#e8ecf8', r: '#ff3030', k: '#2a2010', y: '#ffd040', c: '#2c90ff', b: '#4cb4ff' };
  const SI = {}; for (const k in ICONS) SI[k] = sprC(ICONS[k], ICP);

  function mushroom(x, cx, gy, h, rc, age, t) {
    const PAL = [['#ffffc8', '#ffd040', '#f08000', '#ffe890', '#ffb000'], ['#ffc868', '#f07018', '#a02c08', '#ffa848', '#d05010'],
      ['#e8a070', '#b45a2c', '#5c2414', '#c87a48', '#84381a'], ['#b8aaa0', '#7c7470', '#3c3438', '#a49890', '#625a5a']];
    const P = PAL[Math.max(0, Math.min(3, Math.floor(age * 4)))], out = '#1a0e0a', capY = gy - h;
    ell(x, out, cx, gy - 1, rc * 1.5 + 1, 4); ell(x, P[2], cx, gy - 1, rc * 1.5, 3); ell(x, P[1], cx - 2, gy - 2, rc * 1.05, 2);
    for (let k = 0; k <= h; k++) {
      const y = gy - k, f = k / Math.max(1, h);
      let hw = rc * .24 + (f < .25 ? (.25 - f) * rc * 2.2 : 0) + Math.sin(k * .7 + t * .15) * .5;
      hw = Math.max(1.5, hw);
      rect(x, out, cx - hw - 1, y, Math.round(hw * 2 + 2), 1);
      rect(x, P[4], cx - hw, y, Math.round(hw * 2), 1);
      rect(x, P[3], cx - hw * .55, y, Math.max(1, Math.round(hw * .6)), 1);
    }
    if (h > 16) { const ry = gy - h * .55; ell(x, out, cx, ry, rc * .75 + 1, 2.5); ell(x, P[0], cx, ry, rc * .75, 1.5); rect(x, P[3], cx - rc * .5, ry - 1, Math.round(rc * .4), 1); }
    const n = 9, sp = t * .02, blobs = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU + sp; blobs.push([cx + Math.cos(a) * rc * .78, capY + Math.sin(a) * rc * .32, rc * .44]); }
    blobs.push([cx, capY - rc * .32, rc * .6]);
    for (const b of blobs) disc(x, out, b[0], b[1], b[2] + 1);
    for (const b of blobs) disc(x, P[1], b[0], b[1], b[2]);
    ell(x, P[2], cx, capY + rc * .34, rc * .86, rc * .2);
    for (const b of blobs) if (b[1] <= capY + .5) disc(x, P[0], b[0] - b[2] * .25, b[1] - b[2] * .3, b[2] * .5);
    if (age < .3) disc(x, '#ffffff', cx, capY - rc * .1, rc * .22);
  }

  ArcadeRegistry.register({
    id: 'nuclearwar',
    title: 'Nuclear War',
    year: 1989,
    maker: 'New World Computing',
    width: W, height: H,
    vector: false,
    pointer: true,
    controls: 'Arrows/mouse: select \u00b7 Space/Enter: choose \u00b7 X: back',
    marquee: { bg: '#101830', fg: '#ffd400', accent: '#ff3b2b' },
    create(api) {
      const au = api.audio;
      const MAP = buildMap();
      let hi = api.getHiScore(250000);
      let mode = 'title', frame = 0, titleT = 0, sel = 0, selT = 0, g = null, over = null;
      let lastMX = -1, lastMY = -1;
      const stars = []; for (let i = 0; i < 90; i++) stars.push([Math.floor(rand() * W), Math.floor(rand() * H), rand() < .2 ? '#ffffff' : rand() < .5 ? '#8890c0' : '#4c5488', Math.floor(rand() * 64)]);

      // ---------- coin-op ----------
      let coinOp = false, lastCred = api.credits, coinFlash = 0;
      function pollCoins() {
        const c = api.credits; if (c === 0) coinOp = true;
        if (c > lastCred) au.tone(1175, 0.07, { type: 'square', vol: 0.07, slideTo: 1760 });
        lastCred = c;
      }
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 }); au.tone(73, 0.28, { type: 'sawtooth', vol: 0.08 });
        return false;
      }

      // ---------- sound ----------
      const sfx = {
        move() { au.tone(880, .03, { type: 'square', vol: .04 }); },
        ok() { au.tone(660, .05, { type: 'square', vol: .06 }); au.tone(990, .07, { type: 'square', vol: .06, delay: .05 }); },
        back() { au.tone(392, .06, { type: 'square', vol: .05 }); au.tone(262, .08, { type: 'square', vol: .05, delay: .05 }); },
        buzz() { au.tone(110, .18, { type: 'square', vol: .08 }); },
        launch() { au.noise(1.3, { freq: 500, slideTo: 3500, vol: .2 }); au.tone(110, 1.1, { type: 'sawtooth', slideTo: 700, vol: .05 }); },
        siren() { for (let i = 0; i < 2; i++) { au.tone(520, .45, { type: 'sawtooth', slideTo: 900, vol: .06, delay: i * .9 }); au.tone(900, .45, { type: 'sawtooth', slideTo: 520, vol: .06, delay: i * .9 + .45 }); } },
        whistle() { au.tone(2000, .5, { type: 'sine', slideTo: 300, vol: .07 }); },
        boom(mt) { au.noise(2 + mt / 60, { freq: 1500, slideTo: 40, vol: .5 }); au.tone(80, 1.6, { type: 'sine', slideTo: 22, vol: .4 }); au.noise(.25, { freq: 5000, vol: .3 }); },
        pop() { au.noise(.3, { freq: 3000, slideTo: 300, vol: .22 }); au.tone(900, .12, { type: 'square', slideTo: 150, vol: .05 }); },
        jingle() { au.melody([[523, .09], [659, .09], [784, .09], [1047, .18], [880, .09], [1047, .09], [1319, .3]], { type: 'triangle', vol: .13 }); au.melody([[262, .27], [349, .27], [392, .27], [523, .39]], { type: 'square', vol: .03 }); },
        build() { au.tone(196, .05, { type: 'square', vol: .08 }); au.noise(.06, { freq: 2600, vol: .12, delay: .08 }); au.tone(294, .05, { type: 'square', vol: .08, delay: .16 }); au.noise(.06, { freq: 2600, vol: .12, delay: .24 }); au.tone(392, .12, { type: 'square', vol: .07, delay: .32 }); },
        klaxon() { for (let i = 0; i < 3; i++) { au.tone(440, .18, { type: 'square', vol: .07, delay: i * .3 }); au.tone(330, .1, { type: 'square', vol: .06, delay: i * .3 + .18 }); } },
        germ() { for (let i = 0; i < 6; i++) au.tone(180 + (i & 1) * 60, .12, { type: 'sine', vol: .1, delay: i * .1, slideTo: 120 }); },
        rocket() { au.noise(1.6, { freq: 300, slideTo: 2400, vol: .16 }); au.tone(180, 1.6, { type: 'triangle', slideTo: 1400, vol: .05 }); },
        secret() { au.melody([[392, .12], [370, .12], [392, .12], [311, .36]], { type: 'square', vol: .06 }); },
        turn() { au.tone(784, .06, { type: 'square', vol: .06 }); au.tone(1175, .1, { type: 'square', vol: .06, delay: .07 }); },
        fanfare() { au.melody([[523, .15], [523, .1], [523, .1], [659, .3], [523, .15], [659, .15], [784, .5]], { type: 'square', vol: .08 }); },
        dirge() { au.melody([[392, .4], [370, .4], [349, .4], [330, .9]], { type: 'triangle', vol: .12 }); },
        voice(L, n) { for (let i = 0; i < n; i++) au.tone(L.voice * (0.8 + rand() * 0.6), .045, { type: 'square', vol: .035, delay: i * .065 }); }
      };

      // ---------- globe (title / ending) ----------
      const GR = 30, GD = GR * 2 + 1, globeC = mk(GD, GD), gctx = globeC.getContext('2d'), gimg = gctx.createImageData(GD, GD);
      const gp = [];
      for (let dy = -GR; dy <= GR; dy++) for (let dx = -GR; dx <= GR; dx++) {
        const q = GR * GR - dx * dx - dy * dy; if (q < 0) continue;
        const z = Math.sqrt(q), nx = dx / GR, ny = dy / GR, nz = z / GR;
        const lat = Math.asin(Math.max(-1, Math.min(1, -ny))) * 180 / Math.PI, lon = Math.atan2(nx, nz) * 180 / Math.PI;
        const light = Math.max(0, -.45 * nx - .35 * ny + .82 * nz);
        gp.push([(dy + GR) * GD + dx + GR, Math.floor((75 - lat) * MH / 130), lon * W / 360, Math.min(1.15, .22 + .9 * light), q < GR * 2.2]);
      }
      function drawGlobe(ctx, cx, cy, rot, dead) {
        const d = gimg.data, src = MAP.rgbData;
        for (const p of gp) {
          let r, gg, b;
          if (p[1] < 0 || p[1] >= MH) { r = 230; gg = 238; b = 248; }
          else { const mx = ((Math.floor(p[2] + rot) % W) + W) % W, si = (p[1] * W + mx) * 4; r = src[si]; gg = src[si + 1]; b = src[si + 2]; }
          if (dead) { const l = (r + gg + b) / 3; r = l * .7 + 40; gg = l * .55 + 25; b = l * .45 + 20; }
          let s = p[3]; if (p[4]) { r = r * .6 + 60; gg = gg * .6 + 110; b = b * .6 + 150; s = Math.max(s, .55); }
          const o = p[0] * 4; d[o] = r * s; d[o + 1] = gg * s; d[o + 2] = b * s; d[o + 3] = 255;
        }
        gctx.putImageData(gimg, 0, 0);
        ctx.drawImage(globeC, cx - GR, cy - GR);
        ellRing(ctx, dead ? '#806040' : '#70b0ff', cx, cy, GR + 1, GR + 1);
      }

      // =================================================================
      //  WAR STATE
      // =================================================================
      const CAP = { atlas: 20, bomber: 50, titan: 100 };
      const CNAME = { atlas: 'ATLAS MISSILE', titan: 'TITAN ICBM', bomber: 'BOMBER' };
      const BUILD = [
        { id: 'atlas', name: 'ATLAS MISSILES', n: 2, info: 'CARRY 20MT' },
        { id: 'titan', name: 'TITAN ICBM', n: 1, info: 'CARRIES 100MT' },
        { id: 'bomber', name: 'BOMBER', n: 1, info: '50MT REUSABLE' },
        { id: 'w10', name: '10 MT WARHEADS', n: 3 },
        { id: 'w20', name: '20 MT WARHEADS', n: 2 },
        { id: 'w50', name: '50 MT WARHEAD', n: 1 },
        { id: 'w100', name: '100 MT WARHEAD', n: 1 },
        { id: 'abm', name: 'ANTI-MISSILES', n: 3, info: 'SHOOT DOWN' }
      ];
      const START_POP = 40;
      function have(c, id) { return id[0] === 'w' ? c.w[+id.slice(1)] : c[id]; }
      function give(c, id, n) { if (id[0] === 'w') { const k = +id.slice(1); c.w[k] = Math.min(99, c.w[k] + n); } else c[id] = Math.min(99, c[id] + n); }
      function newCountry(li, slot) {
        const C = CTRY[li], inf = MAP.info[li];
        return {
          slot, li, L: LEADERS[li], pop: START_POP, disp: START_POP, dead: false,
          atlas: 1, titan: 0, bomber: 0, w: { 10: 1, 20: 1, 50: 0, 100: 0 }, abm: 2,
          alert: false, moon: false, station: false, anger: [0, 0, 0, 0, 0], expr: 'neutral', exprT: 0,
          cities: C.cities.map(cc => ({ name: cc[0], x: Math.round(PX(cc[1])), y: Math.round(PY(cc[2])), ruined: false })),
          cx: inf.cx, cy: inf.cy, box: inf
        };
      }
      function startWar(li) {
        const others = [0, 1, 2, 3, 4, 5, 6, 7].filter(i => i !== li);
        for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = others[i]; others[i] = others[j]; others[j] = t; }
        const lis = [li].concat(others.slice(0, 4));
        g = {
          c: lis.map((l, s) => newCountry(l, s)), byCi: [], round: 1, ti: -1, war: false, defcon: 5,
          q: [], cur: null, phase: 'idle', parts: [], floats: [], clouds: [], kills: 0,
          bal: null, banner: null, msg: '', flash: 0, shake: 0, ov: mk(W, MH), menu: { lvl: 'main', sel: 0 },
          turnOf: null, contPending: false, ended: false
        };
        g.player = g.c[0];
        for (const c of g.c) g.byCi[c.li] = c;
        buildOverlay();
        mode = 'war';
        const ai = pick(g.c.slice(1));
        push({ k: 'banner', text: 'THE COLD WAR BEGINS', col: '#80d0ff', n: 110 });
        push({ k: 'say', c: ai, text: ai.L.intro, expr: 'laugh' });
        push({ k: 'say', c: g.player, text: g.player.L.intro });
      }
      function buildOverlay() {
        const x = g.ov.getContext('2d'), img = x.createImageData(W, MH), d = img.data, own = MAP.own;
        for (let i = 0; i < own.length; i++) {
          const ci = own[i]; if (ci < 0) continue; const c = g.byCi[ci]; if (!c) continue;
          const px = i % W, py = (i / W) | 0, h = hash(px, py);
          const same = (X, Y) => X >= 0 && X < W && Y >= 0 && Y < MH && own[Y * W + X] === ci;
          const edge = !same(px - 1, py) || !same(px + 1, py) || !same(px, py - 1) || !same(px, py + 1);
          let col;
          if (c.dead) col = edge ? '#241a14' : (h % 9 === 0 ? '#b04018' : h % 3 ? '#5a4634' : '#46362a');
          else col = edge ? dark(c.L.col, .42) : (h % 6 === 0 ? dark(c.L.col, .82) : (!same(px - 1, py - 1) ? mix(c.L.col, '#ffffff', .35) : c.L.col));
          const c3 = rgb(col); d[i * 4] = c3[0]; d[i * 4 + 1] = c3[1]; d[i * 4 + 2] = c3[2]; d[i * 4 + 3] = 255;
        }
        x.clearRect(0, 0, W, MH); x.putImageData(img, 0, 0);
      }
      const alive = () => g.c.filter(c => !c.dead);
      const rivals = c => g.c.filter(o => o !== c && !o.dead);
      function push(s) { if (g.q.length < 120) g.q.push(s); }
      function front(arr) { g.q.unshift.apply(g.q, arr); }
      function addPart(p) { if (g.parts.length < 420) g.parts.push(p); }
      function float(x, y, s, col, life, ui) { if (g.floats.length < 24) g.floats.push({ x, y, s, col, t: 0, life: life || 90, ui: !!ui }); }
      function setExpr(c, e, n) { if (c.dead && e !== 'dead') return; c.expr = e; c.exprT = n || 0; }
      function quote(c, kind) { const v = kind === 'back' ? BACKQ : c.L[kind]; return Array.isArray(v) ? pick(v) : v; }
      function capital(c) { return c.cities[0]; }
      function fmt(p) { return (Math.max(0, Math.round(p * 10) / 10)).toFixed(1) + 'M'; }
      function bestStrike(c) {
        for (const mt of [100, 50, 20, 10]) {
          if (!c.w[mt]) continue;
          for (const cr of ['atlas', 'bomber', 'titan']) if (c[cr] > 0 && CAP[cr] >= mt) return { carrier: cr, mt };
        }
        return null;
      }
      function canStrike(c) { return !!bestStrike(c); }

      // ---- actions (shared by player and AI) ----
      function actAttack(a, b, carrier, mt) {
        a[carrier]--; a.w[mt]--;
        b.anger[a.slot] += 20 + mt * .3;
        for (const o of g.c) if (o !== a && o !== b) o.anger[a.slot] += 2;
        push({ k: 'say', c: a, text: quote(a, 'atk'), expr: 'laugh' });
        if (!g.war) { g.war = true; push({ k: 'fn', f: () => { g.defcon = 1; sfx.siren(); } }); push({ k: 'banner', text: 'NUCLEAR WAR!', col: '#ff3b2b', n: 120, big: true }); }
        push({ k: 'fly', a, b, carrier, mt });
      }
      function actProp(a, b) {
        b.anger[a.slot] += 8;
        push({ k: 'say', c: a, text: quote(a, 'prop'), expr: 'laugh' });
        push({ k: 'prop', a, b });
      }
      function actDefend(a) {
        push({ k: 'say', c: a, text: quote(a, 'def') });
        push({ k: 'alert', c: a });
      }
      function actBuild(a, id) {
        if (a !== g.player && rand() < .35) push({ k: 'say', c: a, text: quote(a, 'build') });
        push({ k: 'build', c: a, id });
      }

      // ---- AI ----
      function aiTurn(c) {
        const R = rivals(c); if (!R.length) return;
        push({ k: 'wait', n: 34, msg: c.L.name + ' IS PLOTTING...' });
        const strike = bestStrike(c);
        const myAnger = Math.max.apply(null, R.map(o => c.anger[o.slot]));
        const threat = R.reduce((s, o) => s + o.anger[c.slot], 0);
        const r = rand();
        const wantAttack = strike && (g.war ? r < .42 + c.L.aggr * .42 || myAnger > 30 : (g.round >= 3 && r < c.L.aggr * .3) || myAnger > 0);
        if (wantAttack) {
          let best = null, bs = -1;
          for (const o of R) { const s = c.anger[o.slot] + rand() * 12 + (o.pop > c.pop ? 4 : 0) + (o === g.player ? 3 : 0); if (s > bs) { bs = s; best = o; } }
          actAttack(c, best, strike.carrier, strike.mt); return;
        }
        if (g.war && c.abm > 0 && !c.alert && threat > 25 && rand() < .3) { actDefend(c); return; }
        if (rand() < c.L.prop * (g.war ? .7 : 1.2)) {
          let best = R[0]; for (const o of R) if (o.pop + rand() * 8 > best.pop) best = o;
          actProp(c, best); return;
        }
        actBuild(c, aiBuildChoice(c));
      }
      function aiBuildChoice(c) {
        const carriers = c.atlas + c.titan + c.bomber, heads = c.w[10] + c.w[20] + c.w[50] + c.w[100], big = g.round >= 3;
        if (g.war && c.abm < 2 && rand() < .45) return 'abm';
        if (carriers === 0 || (carriers < heads && rand() < .6)) return pick(big ? ['titan', 'bomber', 'atlas', 'titan'] : ['atlas', 'atlas', 'bomber', 'titan']);
        if (heads === 0 || heads < carriers) return pick(big ? ['w50', 'w100', 'w20', 'w50'] : ['w10', 'w20', 'w20', 'w50']);
        return pick(['titan', 'w100', 'w50', 'abm', 'bomber', 'atlas', 'w20']);
      }

      // ---- turns ----
      function nextTurn() {
        g.ti++;
        if (g.ti >= g.c.length) { g.ti = 0; g.round++; roundStart(); }
        const c = g.c[g.ti];
        if (c.dead) return;
        c.alert = false; g.turnOf = c;
        if (c === g.player) {
          g.phase = 'menu'; g.menu = { lvl: 'main', sel: 0 };
          g.msg = 'YOUR TURN, ' + c.L.short + '!'; sfx.turn();
        } else { g.phase = 'ai'; aiTurn(c); }
      }
      function roundStart() {
        for (const c of g.c) for (let i = 0; i < 5; i++) c.anger[i] *= .88;
        if (!g.war) g.defcon = Math.max(2, 6 - g.round);
        push({ k: 'banner', text: 'ROUND ' + g.round, col: '#ffffff', n: 50 });
        if (g.round >= 2 && rand() < .4) {
          const pool = alive(); if (pool.length) {
            const c = pick(pool), types = ['germ', 'moon', 'station', 'science', 'baby', 'meltdown'];
            if (g.war) types.push('peace');
            let t = pick(types);
            if ((t === 'moon' && c.moon) || (t === 'station' && c.station)) t = 'baby';
            push({ k: 'event', c, type: t });
          }
        }
      }
      function checkEnd() {
        if (g.contPending) return true;
        const A = alive();
        if (A.length === 0) { finish('nobody'); return true; }
        if (g.player.dead) { finish('lose'); return true; }
        if (A.length === 1) { finish('win'); return true; }
        return false;
      }
      function finish(kind) {
        if (g.ended) return; g.ended = true;
        const pl = g.player, pop = pl.dead ? 0 : pl.pop;
        const score = Math.round(pop * 10000) + g.kills * 25000 + (kind === 'win' ? 100000 : 0);
        over = { kind, t: 0, score, pop, kills: g.kills, li: pl.li };
        api.setHiScore(score); hi = Math.max(hi, score);
        mode = 'over';
        if (kind === 'win') sfx.fanfare(); else sfx.dirge();
      }

      // ---- damage / death ----
      function hurt(c, amt, by) {
        if (c.dead) return;
        c.pop = Math.max(0, Math.round((c.pop - amt) * 10) / 10);
        if (c.pop <= 0.05) kill(c, by);
      }
      function kill(c, by) {
        c.pop = 0;
        if (c === g.player) {
          if (g.contPending) return;
          g.contPending = true; setExpr(c, 'dead');
          sfx.dirge();
          if (!api.offerContinue) { endPlayer(); return; }
          api.offerContinue(continueWar, endPlayer);
          return;
        }
        c.dead = true; setExpr(c, 'dead'); buildOverlay();
        if (by === g.player) g.kills++;
        const steps = [{ k: 'banner', text: c.L.land + ' IS WIPED OUT!', col: '#ff8040', n: 100 }, { k: 'say', c, text: c.L.dead }];
        if (by && !by.dead && by !== c) {
          let n = 0, s;
          while (n < 2 && (s = bestStrike(c))) { c[s.carrier]--; c.w[s.mt]--; steps.push({ k: 'fly', a: c, b: by, carrier: s.carrier, mt: s.mt, final: true }); n++; }
          if (n) steps.splice(2, 0, { k: 'banner', text: 'FINAL RETALIATION!', col: '#ff3b2b', n: 90 });
        }
        front(steps);
      }
      function continueWar() {
        const p = g.player;
        g.contPending = false; p.dead = false; p.pop = START_POP / 2; p.disp = 0; setExpr(p, 'laugh', 200);
        for (const ct of p.cities) ct.ruined = false;
        buildOverlay();
        front([{ k: 'banner', text: 'SURVIVORS CRAWL OUT OF THE BUNKERS!', col: '#80ff80', n: 110 }, { k: 'say', c: p, text: quote(p, 'back'), expr: 'laugh' }]);
      }
      function endPlayer() {
        const p = g.player;
        g.contPending = false; p.dead = true; p.pop = 0; setExpr(p, 'dead'); buildOverlay();
        g.q = []; g.cur = null; g.phase = 'idle';
        push({ k: 'banner', text: p.L.land + ' IS WIPED OUT!', col: '#ff8040', n: 90 });
        push({ k: 'say', c: p, text: p.L.dead });
        push({ k: 'fn', f: () => finish(alive().length ? 'lose' : 'nobody') });
      }

      // =================================================================
      //  STEPS
      // =================================================================
      const skip = () => api.pressed('Space') || api.pressed('Enter') || api.mouse.clicked;
      function bez(s, u) { const v = 1 - u; return [v * v * s.x0 + 2 * v * u * s.qx + u * u * s.x1, v * v * s.y0 + 2 * v * u * s.qy + u * u * s.y1]; }
      function initStep(s) {
        switch (s.k) {
          case 'wait': if (s.msg) g.msg = s.msg; break;
          case 'say': {
            const txt = s.text || '...';
            g.bal = { c: s.c, lines: wrap(txt, 22), t: 0, dur: 110 };
            if (s.expr) setExpr(s.c, s.expr, 130);
            sfx.voice(s.c.L, Math.min(12, 3 + (txt.length >> 3)));
            g.msg = s.c.L.short + ': "' + txt + '"';
            break;
          }
          case 'banner': g.banner = { text: s.text, col: s.col, t: 0, n: s.n, big: s.big }; break;
          case 'build': {
            const it = BUILD.find(b => b.id === s.id); give(s.c, s.id, it.n);
            sfx.build(); g.msg = s.c.L.short + ' BUILDS ' + (it.n > 1 ? it.n + ' ' : '') + it.name + '.';
            float(s.c.slot * 64 + 32, 150, '+' + it.n + ' ' + it.name.split(' ')[0], '#80ff80', 70, true);
            break;
          }
          case 'fly': {
            const a = s.a, b = s.b, live = b.cities.filter(ct => !ct.ruined);
            s.city = live.length ? pick(live) : pick(b.cities);
            const cap = capital(a);
            s.x0 = cap.x; s.y0 = cap.y - 2; s.x1 = s.city.x; s.y1 = s.city.y - 2;
            const dist = Math.hypot(s.x1 - s.x0, s.y1 - s.y0);
            s.qx = (s.x0 + s.x1) / 2; s.qy = Math.max(-30, Math.min(s.y0, s.y1) - dist * .38 - 8);
            s.dur = Math.round(s.carrier === 'bomber' ? 110 + dist * .55 : 64 + dist * .32);
            s.tries = b.abm > 0 && !b.dead;
            if (s.tries) {
              b.abm--;
              let ch = (b.alert ? .78 : .36) + (b.station ? .15 : 0) + (s.carrier === 'atlas' ? -.1 : s.carrier === 'bomber' ? .1 : .04);
              s.hit = rand() < Math.min(.92, ch);
            }
            s.il = .5; s.ui = .84;
            sfx.launch(); if (b === g.player) sfx.siren();
            g.msg = a.L.short + ' LAUNCHES ' + (s.carrier === 'bomber' ? 'A BOMBER' : 'A' + (s.carrier === 'atlas' ? 'N ATLAS' : ' TITAN')) + ' (' + s.mt + ' MT) AT ' + s.city.name + '!';
            setExpr(a, 'laugh', s.dur);
            break;
          }
          case 'boom': {
            const b = s.b;
            s.loss = Math.round(s.mt * (.16 + rand() * .12) * 10) / 10;
            s.sky = makeSkyline(b.li, 1 + Math.floor(rand() * 99999));
            s.gx = 160; s.gy = 108; s.dur = 210;
            sfx.whistle();
            break;
          }
          case 'prop': {
            s.amt = Math.min(s.b.pop, Math.round((0.8 + rand() * 2.4) * 10) / 10);
            const ca = capital(s.a), cb = capital(s.b);
            s.x0 = ca.x; s.y0 = ca.y - 3; s.x1 = cb.x; s.y1 = cb.y - 3;
            s.qx = (s.x0 + s.x1) / 2; s.qy = Math.min(s.y0, s.y1) - Math.hypot(s.x1 - s.x0, s.y1 - s.y0) * .3 - 6;
            sfx.jingle(); g.msg = s.a.L.short + ' BROADCASTS PROPAGANDA AT ' + s.b.L.land + '!';
            break;
          }
          case 'alert': s.c.alert = true; sfx.klaxon(); g.msg = s.c.L.short + ' PUTS ANTI-MISSILES ON RED ALERT!'; break;
          case 'event': sfx.secret(); g.msg = 'TOP SECRET NEWS FLASH!'; s.lines = wrap(eventText(s), 14); break;
        }
      }
      function eventText(s) {
        const c = s.c;
        switch (s.type) {
          case 'germ': return 'A SUPER-GERM ESCAPES FROM A SECRET LAB IN ' + c.L.land + '!';
          case 'moon': return c.L.name + ' FOUNDS A COLONY ON THE MOON! +4 MILLION';
          case 'station': return c.L.name + ' LAUNCHES A SPACE STATION! BETTER DEFENSES.';
          case 'science': return 'DEFECTING SCIENTISTS GIVE ' + c.L.short + ' A 50 MEGATON WARHEAD!';
          case 'baby': return 'BABY BOOM IN ' + c.L.land + '! +3 MILLION';
          case 'meltdown': return 'REACTOR MELTDOWN IN ' + c.L.land + '! OOPS.';
          default: return 'WORLD PEACE RALLY! EVERYBODY CALMS DOWN A LITTLE.';
        }
      }
      function applyEvent(s) {
        const c = s.c;
        switch (s.type) {
          case 'germ': { const l = Math.round((3 + rand() * 4) * 10) / 10; float(c.cx, c.cy, '-' + l + 'M', '#80ff60'); setExpr(c, 'angry', 140); sfx.germ(); hurt(c, l, null); break; }
          case 'moon': c.moon = true; c.pop += 4; float(c.cx, c.cy, '+4.0M', '#ffffff'); sfx.rocket(); setExpr(c, 'laugh', 140); break;
          case 'station': c.station = true; c.abm++; sfx.rocket(); setExpr(c, 'laugh', 140); break;
          case 'science': c.w[50]++; float(c.cx, c.cy, '+50MT', '#ffd040'); setExpr(c, 'laugh', 140); sfx.ok(); break;
          case 'baby': c.pop += 3; float(c.cx, c.cy, '+3.0M', '#ffffff'); setExpr(c, 'laugh', 140); sfx.ok(); break;
          case 'meltdown': { const l = Math.round((2 + rand() * 2.5) * 10) / 10; float(c.cx, c.cy, '-' + l + 'M', '#ff8040'); setExpr(c, 'angry', 140); sfx.pop(); hurt(c, l, null); break; }
          default: for (const o of g.c) for (let i = 0; i < 5; i++) o.anger[i] *= .5; sfx.jingle();
        }
        if (s.type === 'germ') for (let i = 0; i < 40; i++) addPart({ x: c.cx + (rand() - .5) * 14, y: c.cy + (rand() - .5) * 8, vx: (rand() - .5) * .4, vy: -rand() * .3, l: 60 + rand() * 60, ml: 120, c: rand() < .5 ? '#80ff40' : '#40c020', s: 2 });
        if (s.type === 'moon' || s.type === 'station') { s.rk = { x: capital(c).x, y: capital(c).y, tx: s.type === 'moon' ? 14 : capital(c).x + 10, ty: s.type === 'moon' ? 108 : 6 }; }
      }
      function runStep() {
        if (!g.cur) { g.cur = g.q.shift(); g.cur.t = 0; initStep(g.cur); }
        const s = g.cur; s.t++;
        if (updStep(s) && g.cur === s) g.cur = null;
      }
      function updStep(s) {
        switch (s.k) {
          case 'wait': return s.t >= s.n;
          case 'fn': s.f(); return true;
          case 'say': return s.t >= 96 || (s.t > 24 && skip());
          case 'banner': return s.t >= s.n || (s.t > 30 && skip());
          case 'build': return s.t >= 48;
          case 'alert': return s.t >= 80;
          case 'fly': return updFly(s);
          case 'boom': return updBoom(s);
          case 'prop': return updProp(s);
          case 'event':
            if (s.t === 70) applyEvent(s);
            if (s.rk && s.t > 70 && s.t < 130) { const u = (s.t - 70) / 60, x = s.rk.x + (s.rk.tx - s.rk.x) * u, y = s.rk.y + (s.rk.ty - s.rk.y) * u - Math.sin(u * Math.PI) * 30; s.rk.px = x; s.rk.py = y; addPart({ x, y, vx: (rand() - .5) * .3, vy: .2, l: 30, ml: 30, c: rand() < .5 ? '#ffd040' : '#ff6020' }); }
            return s.t >= 170 || (s.t > 80 && skip());
        }
        return true;
      }
      function updFly(s) {
        const u = Math.min(1, s.t / s.dur), p = bez(s, u);
        s.px = p[0]; s.py = p[1];
        if (s.carrier !== 'bomber' && (s.t & 1)) addPart({ x: p[0], y: p[1], vx: 0, vy: -.03, l: 70, ml: 70, c: 'smoke' });
        if (s.tries) {
          if (u >= s.il) {
            const m = bez(s, s.ui), v = (u - s.il) / (s.ui - s.il);
            const tx = s.hit ? m[0] : m[0] + 10, ty = s.hit ? m[1] : m[1] - 8;
            s.ix = s.x1 + (tx - s.x1) * Math.min(1.4, v); s.iy = s.y1 + (ty - s.y1) * Math.min(1.4, v);
            if (v <= 1.4 && (s.t & 1)) addPart({ x: s.ix, y: s.iy, vx: 0, vy: 0, l: 24, ml: 24, c: '#a0e8ff' });
            if (!s.hit && v > 1.4 && !s.missed) { s.missed = true; float(s.ix, s.iy - 4, 'MISSED!', '#ffffff', 50); }
          }
          if (s.hit && u >= s.ui) {
            for (let i = 0; i < 30; i++) { const a = rand() * TAU, sp = rand() * 1.2; addPart({ x: s.px, y: s.py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, l: 20 + rand() * 25, ml: 45, c: rand() < .5 ? '#ffffff' : '#ffd040' }); }
            sfx.pop();
            float(s.px, s.py - 6, s.carrier === 'bomber' ? 'SHOT DOWN!' : 'INTERCEPTED!', '#80ffff', 80);
            g.msg = s.b.L.short + "'S ANTI-MISSILE STOPS IT!";
            if (rand() < .6) front([{ k: 'say', c: s.b, text: quote(s.b, 'block'), expr: 'laugh' }]);
            return true;
          }
        }
        if (u >= 1) {
          for (let i = 0; i < 16; i++) { const a = rand() * TAU; addPart({ x: s.x1, y: s.y1, vx: Math.cos(a) * .7, vy: Math.sin(a) * .5, l: 20, ml: 20, c: '#ffffff' }); }
          if (s.carrier === 'bomber' && !s.a.dead) s.a.bomber++;
          front([{ k: 'boom', a: s.a, b: s.b, city: s.city, mt: s.mt }]);
          return true;
        }
        return false;
      }
      function updBoom(s) {
        const b = s.b;
        if (s.t === 30) {
          g.flash = 10; g.shake = 18; sfx.boom(s.mt);
          s.city.ruined = true;
          setExpr(b, 'angry', 260); setExpr(s.a, 'laugh', 200);
          g.clouds.length < 10 && g.clouds.push({ x: s.city.x, y: s.city.y, t: 0 });
          g.msg = s.mt + ' MEGATONS HIT ' + s.city.name + '! ' + s.loss + ' MILLION DEAD.';
          float(s.city.x, s.city.y - 10, '-' + s.loss + 'M', '#ff5040', 120);
          hurt(b, s.loss, s.a);
        }
        if (s.t > 30 && s.t < 90 && (s.t & 1)) for (let i = 0; i < 2; i++) { const a = -rand() * Math.PI; s.deb = s.deb || []; if (s.deb.length < 60) s.deb.push({ x: s.gx, y: s.gy - 4, vx: Math.cos(a) * (1 + rand() * 2.5), vy: Math.sin(a) * (1 + rand() * 2.5), l: 40 + rand() * 30 }); }
        if (s.deb) for (const d of s.deb) { d.x += d.vx; d.y += d.vy; d.vy += .08; d.l--; }
        if (s.deb) s.deb = s.deb.filter(d => d.l > 0 && d.y < s.gy + 4);
        const done = s.t >= s.dur || (s.t > 70 && skip());
        if (done && !b.dead && !g.contPending) front([{ k: 'say', c: b, text: quote(b, 'hit'), expr: 'angry' }]);
        return done;
      }
      function updProp(s) {
        s.lf = s.lf || []; s.pp = s.pp || [];
        if (s.t >= 8 && s.t < 50 && s.t % 4 === 0) s.lf.push({ t0: s.t, o: rand() * 10 - 5 });
        if (s.t >= 50 && s.t < 116 && s.t % 3 === 0) s.pp.push({ t0: s.t, o: rand() * 8 - 4 });
        if (s.t === 92) {
          const b = s.b, a = s.a, amt = Math.min(s.amt, b.pop);
          a.pop = Math.round((a.pop + amt) * 10) / 10;
          float(a.cx, a.cy - 6, '+' + amt.toFixed(1) + 'M', '#80ff80', 100);
          float(b.cx, b.cy - 6, '-' + amt.toFixed(1) + 'M', '#ff8080', 100);
          setExpr(b, 'angry', 140); setExpr(a, 'laugh', 140);
          g.msg = amt.toFixed(1) + ' MILLION ' + b.L.land + ' CITIZENS DEFECT TO ' + a.L.land + '!';
          hurt(b, amt, a);
          if (s.b === g.player && !g.contPending && !b.dead) front([{ k: 'say', c: b, text: quote(b, 'hit'), expr: 'angry' }]);
        }
        return s.t >= 150;
      }

      // ---- close-up city skyline ----
      function makeSkyline(li, seed) {
        const SW = 236, SH = 64, A = mk(SW, SH), B = mk(SW, SH), a = A.getContext('2d'), b = B.getContext('2d');
        let rs = seed; const r = () => ((rs = (Math.imul(rs, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff);
        const COLS = ['#3a4470', '#4a5480', '#343c64', '#56608a', '#40486e'];
        const blds = [];
        let x = -3;
        while (x < SW) {
          const w = 7 + Math.floor(r() * 12), h = 12 + Math.floor(r() * 34);
          if (x > 34 && x < 70 && !blds.lm) { blds.lm = true; blds.push({ x, w: 36, lm: true }); x += 36; continue; }
          blds.push({ x, w, h, col: pick(COLS) }); x += w - 1 + (r() < .3 ? 2 : 0);
        }
        for (const bd of blds) {
          if (bd.lm) { landmark(a, LEADERS[li].scape, bd.x, SH, false); landmark(b, LEADERS[li].scape, bd.x, SH, true); continue; }
          const top = SH - bd.h;
          rect(a, '#141828', bd.x, top, bd.w, bd.h); rect(a, bd.col, bd.x + 1, top + 1, bd.w - 2, bd.h - 1); rect(a, mix(bd.col, '#ffffff', .18), bd.x + 1, top + 1, 1, bd.h - 1);
          if (r() < .4) { rect(a, '#141828', bd.x + bd.w / 2 - 1, top - 4, 1, 4); rect(a, '#ff3030', bd.x + bd.w / 2 - 1, top - 5, 1, 1); }
          for (let wy = top + 3; wy < SH - 3; wy += 4) for (let wx = bd.x + 2; wx < bd.x + bd.w - 2; wx += 3) rect(a, r() < .45 ? '#ffe070' : '#232a48', wx, wy, 2, 2);
          const rh = 3 + Math.floor(r() * Math.max(2, bd.h * .3));
          for (let cx = bd.x; cx < bd.x + bd.w; cx++) { const hh = rh + Math.floor(r() * 4); rect(b, '#1a1416', cx, SH - hh, 1, hh); rect(b, '#3a2a28', cx, SH - hh + 1, 1, Math.max(0, hh - 2)); }
          bd.cx = bd.x + bd.w / 2;
        }
        for (const bd of blds) if (bd.lm) bd.cx = bd.x + 18;
        return { A, B, blds, SW, SH, fires: Array.from({ length: 26 }, () => [Math.floor(r() * SW), Math.floor(r() * 8)]) };
      }
      function landmark(x, kind, X, SH, ruined) {
        const O = '#141828';
        if (ruined) { for (let i = 0; i < 36; i++) { const h = 3 + ((hash(i, 9) % 7)); rect(x, '#1a1416', X + i, SH - h, 1, h); rect(x, '#4a3830', X + i, SH - h + 1, 1, Math.max(0, h - 2)); } return; }
        switch (kind) {
          case 'dome':
            rect(x, O, X + 2, SH - 18, 32, 18); rect(x, '#e8e4dc', X + 3, SH - 17, 30, 17);
            for (let i = 0; i < 7; i++) rect(x, '#a8a49c', X + 5 + i * 4, SH - 14, 1, 13);
            rect(x, O, X + 1, SH - 19, 34, 2); ell(x, O, X + 18, SH - 19, 11, 11); ell(x, '#f4f0e8', X + 18, SH - 19, 10, 10); ell(x, '#c8c4bc', X + 21, SH - 19, 6, 9);
            rect(x, O, X + 15, SH - 34, 6, 6); rect(x, '#f4f0e8', X + 16, SH - 33, 4, 5); rect(x, O, X + 17, SH - 38, 2, 4);
            rect(x, '#e8e4dc', X, SH - 2, 36, 2); break;
          case 'onion':
            rect(x, O, X + 4, SH - 22, 28, 22); rect(x, '#c83828', X + 5, SH - 21, 26, 21);
            for (const [ox, w, h, col] of [[6, 8, 30, '#30a040'], [14, 9, 40, '#e8c030'], [24, 8, 30, '#3060d0']]) {
              rect(x, O, X + ox, SH - h, w, h - 20); rect(x, '#e8dcc8', X + ox + 1, SH - h + 1, w - 2, h - 21);
              ell(x, O, X + ox + w / 2, SH - h - 2, w / 2 + 2, 5); ell(x, col, X + ox + w / 2, SH - h - 2, w / 2 + 1, 4);
              rect(x, mix(col, '#ffffff', .4), X + ox + w / 2 - 2, SH - h - 4, 1, 3);
              rect(x, O, X + ox + w / 2 - .5, SH - h - 10, 1, 5); rect(x, '#ffd040', X + ox + w / 2 - .5, SH - h - 10, 1, 1);
            }
            for (let i = 0; i < 6; i++) rect(x, '#ffe070', X + 8 + i * 4, SH - 12, 2, 3);
            break;
          case 'palm':
            rect(x, O, X + 2, SH - 14, 32, 14); rect(x, '#f0a0c0', X + 3, SH - 13, 14, 13); rect(x, '#a0d8e8', X + 18, SH - 13, 15, 13);
            for (let i = 0; i < 4; i++) rect(x, '#304060', X + 5 + i * 7, SH - 9, 3, 4);
            for (const px of [X + 6, X + 28]) { for (let k = 0; k < 22; k++) rect(x, '#7a5030', px + Math.round(Math.sin(k * .12) * 2), SH - 14 - k, 2, 1); const tx = px + 2, ty = SH - 36; for (const d of [-1, 1]) for (let k = 0; k < 9; k++) { rect(x, '#30a040', tx + d * k, ty + Math.round(k * k * .06), 1, 2); rect(x, '#30a040', tx + d * k * .6, ty - 2 + Math.round(k * .5), 1, 1); } }
            break;
          case 'peanut':
            rect(x, O, X + 4, SH - 8, 28, 8); rect(x, '#c8a878', X + 5, SH - 7, 26, 7);
            ell(x, O, X + 18, SH - 18, 7, 9); ell(x, O, X + 18, SH - 32, 6, 8); ell(x, '#d8a860', X + 18, SH - 18, 6, 8); ell(x, '#d8a860', X + 18, SH - 32, 5, 7);
            ell(x, '#ecc888', X + 16, SH - 34, 2, 3); ell(x, '#ecc888', X + 16, SH - 20, 2, 3);
            rect(x, O, X + 15, SH - 30, 1, 1); rect(x, O, X + 20, SH - 30, 1, 1); rect(x, O, X + 15, SH - 27, 6, 1);
            break;
          case 'mosque': case 'taj': {
            const wcol = kind === 'taj' ? '#f4f0ec' : '#3cc0c8', dcol = kind === 'taj' ? '#ffffff' : '#30a0e0';
            rect(x, O, X + 6, SH - 16, 24, 16); rect(x, wcol, X + 7, SH - 15, 22, 15);
            ell(x, O, X + 18, SH - 21, 9, 10); ell(x, dcol, X + 18, SH - 21, 8, 9); ell(x, mix(dcol, '#ffffff', .5), X + 15, SH - 24, 2, 4);
            rect(x, O, X + 17.5, SH - 34, 1, 4); rect(x, '#ffd040', X + 17, SH - 35, 2, 1);
            ell(x, '#202838', X + 18, SH - 6, 3, 6);
            for (const mx of [X + 1, X + 32]) { rect(x, O, mx, SH - 34, 4, 34); rect(x, wcol, mx + 1, SH - 33, 2, 33); ell(x, dcol, mx + 2, SH - 35, 2.5, 2.5); rect(x, O, mx, SH - 22, 4, 1); }
            break;
          }
          case 'pagoda':
            for (let i = 0; i < 4; i++) {
              const w = 30 - i * 6, y = SH - 10 - i * 9, xx = X + 18 - w / 2;
              rect(x, O, xx + 3, y, w - 6, 9); rect(x, '#d04030', xx + 4, y + 1, w - 8, 8); rect(x, '#ffd060', xx + 6, y + 3, 2, 3); rect(x, '#ffd060', xx + w - 8, y + 3, 2, 3);
              rect(x, O, xx - 1, y - 2, w + 2, 3); rect(x, '#2a8a60', xx, y - 1, w, 1); rect(x, '#2a8a60', xx - 1, y - 2, 2, 1); rect(x, '#2a8a60', xx + w - 1, y - 2, 2, 1);
            }
            rect(x, O, X + 17, SH - 52, 2, 8); rect(x, '#ffd040', X + 17, SH - 52, 2, 2);
            break;
          case 'clock':
            rect(x, O, X + 13, SH - 46, 10, 46); rect(x, '#c8a868', X + 14, SH - 45, 8, 45);
            for (let k = 0; k < 9; k++) rect(x, '#9a7e48', X + 15, SH - 40 + k * 4, 6, 1);
            rect(x, O, X + 12, SH - 36, 12, 10); rect(x, '#d8b878', X + 13, SH - 35, 10, 8);
            disc(x, O, X + 18, SH - 31, 4); disc(x, '#fff8e0', X + 18, SH - 31, 3); rect(x, O, X + 18, SH - 33, 1, 2); rect(x, O, X + 18, SH - 31, 2, 1);
            for (let k = 0; k < 8; k++) rect(x, O, X + 18 - (k >> 1), SH - 47 - k, 1 + (k >> 1) * 2 > 0 ? 1 : 1, 1), rect(x, '#3a3a40', X + 18 - Math.floor((8 - k) / 2), SH - 47 - k, Math.floor((8 - k) / 2) * 2 + 1, 1);
            rect(x, O, X + 0, SH - 14, 13, 14); rect(x, '#b89858', X + 1, SH - 13, 12, 13); rect(x, O, X + 23, SH - 14, 13, 14); rect(x, '#b89858', X + 23, SH - 13, 12, 13);
            for (let i = 0; i < 3; i++) { rect(x, '#ffe070', X + 3 + i * 4, SH - 9, 2, 3); rect(x, '#ffe070', X + 25 + i * 4, SH - 9, 2, 3); }
            break;
        }
      }

      // =================================================================
      //  PLAYER MENU
      // =================================================================
      const MAIN = ['BUILD', 'PROPAGANDA', 'ATTACK', 'DEFEND'];
      const mainRect = i => ({ x: 6 + i * 78, y: 212, w: 74, h: 12 });
      const inR = (r, x, y) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
      function mainEnabled() { const p = g.player; return [true, true, canStrike(p), p.abm > 0 && !p.alert]; }
      function listItems() {
        const m = g.menu, p = g.player;
        if (m.lvl === 'build') return BUILD.map(b => ({ label: b.name, right: '+' + b.n + '  HAVE ' + have(p, b.id), en: true, id: b.id })).concat([{ label: 'BACK', right: '', en: true, back: true }]);
        if (m.lvl === 'carrier') return ['atlas', 'titan', 'bomber'].map(cr => ({ label: CNAME[cr] + ' (' + CAP[cr] + 'MT)', right: 'HAVE ' + p[cr], en: p[cr] > 0 && [10, 20, 50, 100].some(mt => mt <= CAP[cr] && p.w[mt] > 0), id: cr })).concat([{ label: 'BACK', right: '', en: true, back: true }]);
        if (m.lvl === 'warhead') return [10, 20, 50, 100].map(mt => ({ label: mt + ' MEGATON WARHEAD', right: 'HAVE ' + p.w[mt], en: p.w[mt] > 0 && mt <= CAP[m.carrier], id: mt })).concat([{ label: 'BACK', right: '', en: true, back: true }]);
        return [];
      }
      const LIST_TITLE = { build: 'BUILD WHAT?', carrier: 'LAUNCH WITH WHAT?', warhead: 'WHICH WARHEAD?' };
      function listBox(n) { const h = n * 11 + 17; return { x: 52, y: 198 - h, w: 216, h }; }
      function stepSel(selv, dir, en) { const n = en.length; for (let k = 0; k < n; k++) { selv = (selv + dir + n) % n; if (en[selv]) return selv; } return selv; }
      function firstEn(en) { const i = en.indexOf(true); return i < 0 ? 0 : i; }
      function targets() { return rivals(g.player); }
      function mouseMoved() { const mv = api.mouse.x !== lastMX || api.mouse.y !== lastMY; lastMX = api.mouse.x; lastMY = api.mouse.y; return mv; }
      function updMenu() {
        const m = g.menu, p = g.player, mv = mouseMoved(), mx = api.mouse.x, my = api.mouse.y, click = api.mouse.clicked;
        const ok = api.pressed('Space') || api.pressed('Enter'), back = api.pressed('KeyX') || api.pressed('KeyZ');
        const lft = api.pressed('ArrowLeft'), rgt = api.pressed('ArrowRight'), up = api.pressed('ArrowUp'), dn = api.pressed('ArrowDown');
        if (m.lvl === 'main') {
          const en = mainEnabled(); if (!en[m.sel]) m.sel = firstEn(en);
          if (lft || up) { m.sel = stepSel(m.sel, -1, en); sfx.move(); }
          if (rgt || dn) { m.sel = stepSel(m.sel, 1, en); sfx.move(); }
          let hit = -1; for (let i = 0; i < 4; i++) if (inR(mainRect(i), mx, my)) hit = i;
          if (hit >= 0 && (mv || click) && en[hit] && m.sel !== hit) m.sel = hit;
          if (click && hit >= 0 && !en[hit]) sfx.buzz();
          if (ok || (click && hit >= 0 && en[hit])) {
            sfx.ok();
            if (m.sel === 0) { m.lvl = 'build'; m.sel = 0; }
            else if (m.sel === 1) { m.lvl = 'target'; m.act = 'prop'; m.sel = 0; }
            else if (m.sel === 2) { m.lvl = 'carrier'; m.sel = firstEn(listItems().map(i => i.en)); }
            else { g.phase = 'act'; actDefend(p); }
          }
          return;
        }
        if (m.lvl === 'target') {
          const T = targets(); if (!T.length) { m.lvl = 'main'; return; }
          if (m.sel >= T.length) m.sel = 0;
          if (lft || up) { m.sel = (m.sel + T.length - 1) % T.length; sfx.move(); }
          if (rgt || dn) { m.sel = (m.sel + 1) % T.length; sfx.move(); }
          let hit = -1;
          T.forEach((c, i) => { if (inR({ x: c.slot * 64, y: 128, w: 64, h: 72 }, mx, my)) hit = i; });
          if (hit < 0 && my < MH && mx >= 0 && mx < W) { const ci = MAP.own[Math.floor(my) * W + Math.floor(mx)]; if (ci >= 0) T.forEach((c, i) => { if (c.li === ci) hit = i; }); }
          if (hit >= 0 && (mv || click)) m.sel = hit;
          if (back) { sfx.back(); m.lvl = m.act === 'prop' ? 'main' : 'warhead'; m.sel = m.act === 'prop' ? 1 : firstEn(listItems().map(i => i.en)); if (m.act === 'prop') m.lvl = 'main'; return; }
          if (ok || (click && hit >= 0)) {
            sfx.ok(); const t = T[m.sel]; g.phase = 'act';
            if (m.act === 'prop') actProp(p, t); else actAttack(p, t, m.carrier, m.mt);
            m.lvl = 'main';
          }
          return;
        }
        const items = listItems(), en = items.map(i => i.en), box = listBox(items.length);
        if (!en[m.sel]) m.sel = firstEn(en);
        if (up || lft) { m.sel = stepSel(m.sel, -1, en); sfx.move(); }
        if (dn || rgt) { m.sel = stepSel(m.sel, 1, en); sfx.move(); }
        let hit = -1; items.forEach((it, i) => { if (inR({ x: box.x + 2, y: box.y + 14 + i * 11, w: box.w - 4, h: 11 }, mx, my)) hit = i; });
        if (hit >= 0 && (mv || click) && en[hit]) m.sel = hit;
        const goBack = () => { sfx.back(); if (m.lvl === 'warhead') { m.lvl = 'carrier'; m.sel = 0; } else { m.sel = m.lvl === 'build' ? 0 : 2; m.lvl = 'main'; } };
        if (back) { goBack(); return; }
        if (ok || (click && hit >= 0 && en[hit])) {
          const it = items[m.sel];
          if (it.back) { goBack(); return; }
          sfx.ok();
          if (m.lvl === 'build') { g.phase = 'act'; m.lvl = 'main'; actBuild(p, it.id); }
          else if (m.lvl === 'carrier') { m.carrier = it.id; m.lvl = 'warhead'; m.sel = 0; const e2 = listItems().map(i => i.en); let bi = 0; for (let i = 0; i < 4; i++) if (e2[i]) bi = i; m.sel = bi; }
          else if (m.lvl === 'warhead') { m.mt = it.id; m.lvl = 'target'; m.act = 'attack'; m.sel = 0; }
        }
      }

      // =================================================================
      //  UPDATE
      // =================================================================
      function updWar() {
        // cosmetics
        for (const p of g.parts) { p.x += p.vx; p.y += p.vy; p.l--; }
        g.parts = g.parts.filter(p => p.l > 0);
        for (const f of g.floats) f.t++;
        g.floats = g.floats.filter(f => f.t < f.life);
        for (const cl of g.clouds) cl.t++;
        g.clouds = g.clouds.filter(cl => cl.t < 420);
        if (g.bal) { g.bal.t++; if (g.bal.t > g.bal.dur) g.bal = null; }
        if (g.banner) { g.banner.t++; if (g.banner.t > g.banner.n) g.banner = null; }
        if (g.flash > 0) g.flash--; if (g.shake > 0) g.shake--;
        for (const c of g.c) {
          c.disp += (c.pop - c.disp) * .08; if (Math.abs(c.pop - c.disp) < .05) c.disp = c.pop;
          if (c.exprT > 0 && --c.exprT === 0 && !c.dead && !(g.contPending && c === g.player)) c.expr = 'neutral';
          if (!c.dead) for (const ct of c.cities) if (ct.ruined && (frame + ct.x) % 23 === 0) addPart({ x: ct.x + rand() * 3 - 1, y: ct.y - 3, vx: .05, vy: -.12, l: 60, ml: 60, c: 'smoke' });
        }
        if (g.ended) return;
        if (g.cur || g.q.length) { runStep(); return; }
        if (g.phase === 'menu') { updMenu(); return; }
        if (checkEnd()) return;
        nextTurn();
      }

      // =================================================================
      //  RENDER: WAR
      // =================================================================
      function drawMapLayer(ctx) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, MH); ctx.clip();
        ctx.drawImage(MAP.cv, 0, 0); ctx.drawImage(g.ov, 0, 0);
        // moon
        disc(ctx, '#2a3058', 14, 108, 10); disc(ctx, '#d8d8c8', 14, 108, 8); disc(ctx, '#f4f4e8', 12, 106, 5);
        disc(ctx, '#b0b0a0', 17, 110, 2); disc(ctx, '#b0b0a0', 11, 111, 1.5); disc(ctx, '#b0b0a0', 15, 104, 1);
        let fi = 0; for (const c of g.c) if (c.moon && !c.dead) { rect(ctx, '#202020', 10 + fi * 5, 97, 1, 5); rect(ctx, c.L.col, 11 + fi * 5, 97, 3, 2); fi++; }
        // stations
        let si = 0; for (const c of g.c) if (c.station && !c.dead) { ctx.drawImage(SI.station, 290 - si * 10, 4); rect(ctx, c.L.col, 293 - si * 10, 10, 1, 1); si++; }
        // HUD
        text(ctx, 'ROUND ' + g.round, 4, 50, '#ffffff', { shadow: '#0a1840' });
        const dc = ['#ff3030', '#ff8030', '#ffd030', '#80ff60', '#60c0ff'][g.defcon - 1];
        if (g.defcon > 1 || (frame >> 4) & 1) text(ctx, 'DEFCON ' + g.defcon, 4, 60, dc, { shadow: '#0a1840' });
        // alert domes
        for (const c of g.c) if (c.alert && !c.dead) {
          const bx = c.box, rx = (bx.x1 - bx.x0) / 2 + 5, ry = (bx.y1 - bx.y0) / 2 + 5;
          ellRing(ctx, (frame >> 3) & 1 ? '#a0ffff' : '#40c0ff', (bx.x0 + bx.x1) / 2, (bx.y0 + bx.y1) / 2, rx, ry, 4, frame >> 2);
        }
        // cities
        for (const c of g.c) c.cities.forEach((ct, i) => {
          if (ct.ruined || c.dead) ctx.drawImage(S_CRATER[(frame >> 3) & 1], ct.x - 3, ct.y - 3);
          else ctx.drawImage(i === 0 ? S_CAP : S_CITY, ct.x - 3, ct.y - 5);
        });
        // mini mushroom clouds
        for (const cl of g.clouds) {
          const a = Math.min(1, cl.t / 240), h = 6 + Math.min(1, cl.t / 50) * 8;
          if (cl.t < 300) mushroom(ctx, cl.x, cl.y, h, 4 + Math.min(1, cl.t / 60) * 2, a, frame);
          else { ctx.globalAlpha = (420 - cl.t) / 120; mushroom(ctx, cl.x, cl.y, h, 6, 1, frame); ctx.globalAlpha = 1; }
        }
        // particles
        for (const p of g.parts) {
          if (p.c === 'smoke') { const k = p.l / p.ml; rect(ctx, k > .66 ? '#e0e0e0' : k > .33 ? '#a0a0a8' : '#6c6c78', p.x, p.y, 1, 1); }
          else rect(ctx, p.c, p.x, p.y, p.s || 1, p.s || 1);
        }
        // current step map effects
        const s = g.cur;
        if (s && s.k === 'fly' && s.px !== undefined && !(s.hit && s.t / s.dur >= s.ui)) {
          if (s.carrier === 'bomber') {
            const dir = s.x1 >= s.x0 ? 1 : -1, key = s.a.li + ':' + dir;
            if (!S_BOMBER[key]) S_BOMBER[key] = sprC(BOMBER, { o: '#141828', c: s.a.L.col }, dir < 0);
            ctx.drawImage(S_BOMBER[key], Math.round(s.px - 5), Math.round(s.py - 2));
          } else {
            const p2 = bez(s, Math.max(0, s.t / s.dur - .02)), ang = Math.atan2(s.py - p2[1], s.px - p2[0]);
            rect(ctx, s.a.L.col, s.px - Math.cos(ang) * 2, s.py - Math.sin(ang) * 2, 1, 1);
            rect(ctx, '#ffffff', s.px - Math.cos(ang), s.py - Math.sin(ang), 1, 1);
            rect(ctx, (frame & 2) ? '#ffd040' : '#ffffff', s.px, s.py, 2, 2);
          }
          if (s.tries && s.ix !== undefined && s.t / s.dur < s.ui + (s.hit ? 0 : .3)) rect(ctx, '#ffffff', s.ix, s.iy, 2, 2);
          // target reticle
          if ((frame >> 2) & 1) ellRing(ctx, '#ff4040', s.x1, s.y1, 5, 5);
        }
        if (s && s.k === 'prop') {
          if (s.t < 70) for (let k = 0; k < 3; k++) { const r = ((s.t * .6 + k * 9) % 27) + 2; ellRing(ctx, k & 1 ? '#ffffff' : s.a.L.col, s.x0, s.y0, r, r * .7, 3, frame >> 1); }
          for (const lf of s.lf || []) { const u = (s.t - lf.t0) / 40; if (u < 0 || u > 1) continue; const p = bez(s, u); rect(ctx, (frame + lf.t0) & 4 ? '#ffffff' : '#ffe070', p[0] + lf.o * u, p[1] + Math.sin(u * 20) * 1.5, 2, 2); }
          for (const pp of s.pp || []) {
            const u = 1 - (s.t - pp.t0) / 46; if (u < 0 || u > 1) continue;
            const p = bez(s, u), hop = Math.abs(Math.sin((s.t - pp.t0) * .4)) * 2, X = Math.round(p[0] + pp.o * Math.sin(u * 3)), Y = Math.round(p[1] - hop);
            spr(ctx, PERSON[(s.t >> 2) & 1], { o: '#141828', h: '#ffd8b0', b: s.b.L.col, l: '#ffffff' }, X - 2, Y - 4);
          }
        }
        if (s && s.k === 'event' && s.rk && s.rk.px !== undefined && s.t < 130) { rect(ctx, '#ffffff', s.rk.px - 1, s.rk.py - 2, 2, 4); rect(ctx, '#ff3030', s.rk.px - 1, s.rk.py - 3, 2, 1); }
        drawFloats(ctx, false);
        // targeting crosshair
        if (g.phase === 'menu' && g.menu.lvl === 'target' && !g.cur && !g.q.length) {
          const T = targets(), t = T[g.menu.sel];
          if (t) {
            const cp = capital(t), cx = cp.x, cy = cp.y - 2, r = 7 + ((frame >> 2) & 3);
            const col = (frame >> 3) & 1 ? '#ffffff' : (g.menu.act === 'prop' ? '#80ff80' : '#ffd400');
            ellRing(ctx, col, cx, cy, r, r); rect(ctx, col, cx - r - 4, cy, 6, 1); rect(ctx, col, cx + r - 1, cy, 6, 1); rect(ctx, col, cx, cy - r - 4, 1, 6); rect(ctx, col, cx, cy + r - 1, 1, 6);
          }
        }
        ctx.restore();
      }
      function drawBoom(ctx, s) {
        const X0 = 40, Y0 = 6, PW = 240, PH = 116, sx = X0 + 2, sy = Y0 + 12, sw = PW - 4, sh = PH - 14, t = s.t, bt = t - 30;
        rect(ctx, '#000000', X0 - 1, Y0 - 1, PW + 2, PH + 2); rect(ctx, s.b.L.col, X0, Y0, PW, PH); rect(ctx, '#0a0f24', X0 + 1, Y0 + 1, PW - 2, 10);
        text(ctx, s.city.name + ', ' + s.b.L.land, X0 + 4, Y0 + 3, '#ffd400');
        text(ctx, s.mt + ' MT', X0 + PW - 4, Y0 + 3, '#ff6040', { right: true });
        ctx.save(); ctx.beginPath(); ctx.rect(sx, sy, sw, sh); ctx.clip();
        const glow = bt > 0 ? Math.max(0, 1 - bt / 120) : 0;
        const SKY = ['#0c1236', '#141c4a', '#20285c', '#30306a', '#463874', '#5c4078'];
        for (let i = 0; i < 6; i++) rect(ctx, mix(SKY[i], i > 2 ? '#ff7020' : '#a03020', glow * (.4 + i * .1)), sx, sy + i * 15, sw, 15);
        rect(ctx, mix('#5c4078', '#ff8040', glow * .9), sx, sy + 90, sw, 20);
        if (bt < 0) for (let i = 0; i < 30; i++) rect(ctx, (frame + i) % 40 < 3 ? '#ffffff' : '#9098c8', sx + (hash(i, 1) % sw), sy + (hash(i, 2) % 60), 1, 1);
        for (let x = 0; x < sw; x++) { const h = 10 + Math.round(Math.sin(x * .05) * 4 + Math.sin(x * .13 + 1) * 3); rect(ctx, mix('#262c58', '#602818', glow), sx + x, s.gy - 22 - h + 22, 1, h); }
        // fireball behind skyline
        if (bt >= 0 && bt < 70) { const R = Math.min(10 + s.mt * .14, bt * 1.6); disc(ctx, '#ff8020', s.gx, s.gy, R + 3); disc(ctx, '#ffd040', s.gx, s.gy, R); disc(ctx, '#ffffff', s.gx, s.gy, R * .6); }
        // skyline
        const sky = s.sky, shock = bt < 0 ? -1 : bt * 3.2, base = s.gy - sky.SH;
        for (const bd of sky.blds) {
          const ruined = shock >= 0 && Math.abs(bd.cx + sx - s.gx) < shock;
          const w = bd.lm ? 36 : bd.w;
          const bx = Math.max(0, bd.x), bw = Math.min(sky.SW, bd.x + w) - bx;
          if (bw > 0) ctx.drawImage(ruined ? sky.B : sky.A, bx, 0, bw, sky.SH, sx + bx, base, bw, sky.SH);
        }
        if (bt > 0) for (const f of sky.fires) if (Math.abs(f[0] + sx - s.gx) < shock && (frame + f[0]) % 6 < 4) rect(ctx, (frame + f[1]) & 2 ? '#ffd040' : '#ff5020', sx + f[0], s.gy - 4 - f[1] - ((frame >> 1) & 1), 1, 2);
        // ground
        rect(ctx, '#1a1a24', sx, s.gy, sw, 1); rect(ctx, mix('#2c3020', '#5a3018', glow), sx, s.gy + 1, sw, 12);
        for (let i = 0; i < 40; i++) rect(ctx, '#3a3c2c', sx + (hash(i, 5) % sw), s.gy + 2 + hash(i, 6) % 10, 2, 1);
        // incoming warhead
        if (bt < 0) {
          const u = t / 30, wy = sy - 4 + (s.gy - sy) * u * u;
          for (let k = 1; k < 14; k++) rect(ctx, k < 4 ? '#ffffff' : '#9098c8', s.gx, wy - k * 2, 1, 2);
          rect(ctx, '#141414', s.gx - 2, wy - 1, 5, 5); rect(ctx, '#e8e8e8', s.gx - 1, wy, 3, 4); rect(ctx, '#ff3030', s.gx - 1, wy + 3, 3, 1);
        }
        // shockwave dust
        if (bt > 0 && bt < 80) { const r = bt * 3.2; ell(ctx, '#8a7060', s.gx - r, s.gy - 1, 5, 2); ell(ctx, '#8a7060', s.gx + r, s.gy - 1, 5, 2); ellRing(ctx, '#ffe0a0', s.gx, s.gy, r, r * .25); }
        // mushroom
        if (bt > 6) {
          const age = Math.min(.99, (bt - 6) / 230), Hm = 44 + s.mt * .36, h = Hm * (1 - Math.pow(1 - Math.min(1, (bt - 6) / 80), 2)), rc = (11 + s.mt * .1) * (.4 + .6 * Math.min(1, (bt - 6) / 70));
          mushroom(ctx, s.gx, s.gy, Math.max(4, h), rc, age, frame);
        }
        if (s.deb) for (const d of s.deb) rect(ctx, d.l > 30 ? '#ffd040' : '#6a4a3a', d.x, d.y, 1, 1);
        // flash
        if (bt >= 0 && bt < 10) { ctx.fillStyle = `rgba(255,255,240,${1 - bt / 10})`; ctx.fillRect(sx, sy, sw, sh); }
        ctx.restore();
        if (bt > 40) {
          text(ctx, 'CASUALTIES: ' + s.loss.toFixed(1) + ' MILLION', sx + 4, sy + 4, (frame >> 3) & 1 ? '#ff5040' : '#ffd040', { outline: '#000000' });
          text(ctx, s.b.dead || (s.b === g.player && g.contPending) ? 'NO SURVIVORS!' : 'SURVIVORS: ' + fmt(s.b.pop), sx + 4, sy + 14, '#ffffff', { outline: '#000000' });
        }
      }
      function drawEventPanel(ctx, s) {
        const X0 = 64, Y0 = 18, PW = 192, PH = 92, c = s.c, t = s.t;
        rect(ctx, '#000000', X0 - 1, Y0 - 1, PW + 2, PH + 2); rect(ctx, '#8a7650', X0, Y0, PW, PH); rect(ctx, '#f0e6c4', X0 + 2, Y0 + 2, PW - 4, PH - 4);
        for (let i = 0; i < 6; i++) rect(ctx, '#e0d4ac', X0 + 4, Y0 + 30 + i * 10, PW - 8, 1);
        rect(ctx, '#c01818', X0 + PW - 84, Y0 + 6, 78, 13); rect(ctx, '#f0e6c4', X0 + PW - 83, Y0 + 7, 76, 11); rect(ctx, '#c01818', X0 + PW - 82, Y0 + 8, 74, 9);
        text(ctx, 'TOP SECRET', X0 + PW - 45, Y0 + 9, '#ffffff', { center: true });
        text(ctx, 'NEWS FLASH', X0 + 8, Y0 + 9, '#3a2a10');
        // icon
        const ix = X0 + 26, iy = Y0 + 56;
        rect(ctx, '#2a2a3a', ix - 18, iy - 22, 36, 40); rect(ctx, '#0c1030', ix - 17, iy - 21, 34, 38);
        drawEventIcon(ctx, s.type, ix, iy, t);
        (s.lines || []).forEach((ln, i) => text(ctx, ln, X0 + 50, Y0 + 26 + i * 10, '#2a1c08'));
        rect(ctx, '#3a2a10', X0 + PW - 55, Y0 + PH - 53, 50, 50);
        ctx.drawImage(portrait(c.li, t > 70 ? c.expr : 'neutral', (t >> 3) & 1), X0 + PW - 54, Y0 + PH - 52, 48, 48);
      }
      function drawEventIcon(ctx, type, x, y, t) {
        switch (type) {
          case 'germ': {
            const wob = Math.sin(t * .2) * 1.5;
            for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + t * .02; line(ctx, '#40a020', x + Math.cos(a) * 9, y + Math.sin(a) * 9, x + Math.cos(a) * (13 + wob), y + Math.sin(a) * (13 + wob)); disc(ctx, '#80ff40', x + Math.cos(a) * (13 + wob), y + Math.sin(a) * (13 + wob), 1.5); }
            disc(ctx, '#205010', x, y, 10); disc(ctx, '#60d030', x, y, 9); disc(ctx, '#90f060', x - 3, y - 3, 3);
            rect(ctx, '#ffffff', x - 5, y - 3, 4, 4); rect(ctx, '#ffffff', x + 1, y - 3, 4, 4); rect(ctx, '#000', x - 3, y - 2, 2, 2); rect(ctx, '#000', x + 2, y - 2, 2, 2);
            line(ctx, '#000', x - 6, y - 5, x - 2, y - 4); line(ctx, '#000', x + 6, y - 5, x + 2, y - 4); rect(ctx, '#401010', x - 4, y + 3, 8, 3); rect(ctx, '#ffffff', x - 3, y + 3, 2, 1); rect(ctx, '#ffffff', x + 1, y + 3, 2, 1);
            break;
          }
          case 'moon': case 'station': {
            for (let i = 0; i < 12; i++) rect(ctx, '#ffffff', x - 16 + hash(i, 3) % 32, y - 20 + hash(i, 4) % 36, 1, 1);
            if (type === 'moon') { disc(ctx, '#d8d8c8', x + 6, y - 8, 9); disc(ctx, '#b0b0a0', x + 9, y - 6, 2); disc(ctx, '#b0b0a0', x + 3, y - 11, 1.5); rect(ctx, '#202020', x + 5, y - 22, 1, 6); rect(ctx, '#ff3030', x + 6, y - 22, 4, 3); }
            else { rect(ctx, '#4cb4ff', x - 4, y - 14, 18, 5); rect(ctx, '#e8e8f0', x + 3, y - 16, 4, 9); rect(ctx, '#2c70c0', x - 4, y - 12, 18, 1); }
            const ry = y + 12 - Math.min(20, Math.max(0, t - 40) * .4);
            rect(ctx, '#e8e8f0', x - 9, ry - 6, 4, 10); rect(ctx, '#ff3030', x - 9, ry - 8, 4, 2); rect(ctx, '#ff3030', x - 11, ry + 1, 2, 3); rect(ctx, '#ff3030', x - 5, ry + 1, 2, 3);
            if ((t >> 1) & 1) rect(ctx, '#ffd040', x - 8, ry + 4, 2, 3);
            break;
          }
          case 'science':
            ellRing(ctx, '#60e0ff', x, y, 13, 4); ellRing(ctx, '#ff80ff', x, y, 4, 13);
            for (let k = 0; k < 2; k++) { const a = t * .12 + k * 3; disc(ctx, '#ffffff', x + Math.cos(a) * 13, y + Math.sin(a) * 4, 1.5); disc(ctx, '#ffffff', x + Math.cos(a + 1) * 4, y + Math.sin(a + 1) * 13, 1.5); }
            disc(ctx, '#ffd040', x, y, 3.5); disc(ctx, '#ff6020', x + 1, y + 1, 1.5);
            break;
          case 'baby':
            disc(ctx, '#ff4060', x - 4, y - 4, 5); disc(ctx, '#ff4060', x + 4, y - 4, 5);
            for (let k = 0; k < 9; k++) rect(ctx, '#ff4060', x - 8 + k, y - 2 + k, 17 - k * 2, 1);
            rect(ctx, '#ffa0b0', x - 5, y - 6, 2, 2);
            break;
          case 'meltdown':
            for (let k = 0; k < 18; k++) { const hw = 7 - Math.sin(k / 18 * Math.PI) * 3; rect(ctx, '#a8a8b0', x - hw, y + 14 - k, hw * 2, 1); rect(ctx, '#e0e0e8', x - hw, y + 14 - k, 2, 1); }
            for (let k = 0; k < 3; k++) disc(ctx, (t >> 3) & 1 ? '#80ff60' : '#c0ffa0', x - 2 + k * 3, y - 8 - ((t * .3 + k * 5) % 12), 3);
            break;
          default:
            ellRing(ctx, '#ffffff', x, y, 12, 12); ellRing(ctx, '#ffffff', x, y, 11, 11);
            line(ctx, '#ffffff', x, y - 12, x, y + 12); line(ctx, '#ffffff', x, y, x - 8, y + 8); line(ctx, '#ffffff', x, y, x + 8, y + 8);
        }
      }
      function cardExpr(c) {
        let e = c.expr, fr = 0;
        const talking = g.bal && g.bal.c === c && g.bal.t < 80;
        if (talking) fr = (frame >> 3) & 1;
        else if (e === 'laugh') fr = (frame >> 3) & 1;
        else if (e === 'dead') fr = (frame >> 4) & 1;
        else if (e === 'angry') fr = (frame >> 4) & 1 ? 1 : 0;
        else if ((frame + c.slot * 47) % 170 < 6) fr = 2;
        return [e, fr];
      }
      function drawFloats(ctx, ui) { for (const f of g.floats) { if (f.ui !== ui) continue; const yy = f.y - f.t * .25; if ((f.t > f.life - 20) && (f.t & 2)) continue; text(ctx, f.s, f.x, Math.max(1, yy), f.col, { center: true, outline: '#000000' }); } }
      function drawCards(ctx) {
        const tgt = g.phase === 'menu' && g.menu.lvl === 'target' && !g.cur && !g.q.length ? targets()[g.menu.sel] : null;
        const tgtOk = g.phase === 'menu' && g.menu.lvl === 'target' ? targets() : [];
        for (const c of g.c) {
          const x = c.slot * 64, y = 128;
          rect(ctx, '#05081a', x, y, 64, 72);
          let bc = c.dead ? '#4a4a50' : c.L.col;
          if (g.turnOf === c && !c.dead && ((frame >> 3) & 1)) bc = '#ffffff';
          if (c === tgt) bc = (frame >> 2) & 1 ? (g.menu.act === 'prop' ? '#80ff80' : '#ff3030') : '#ffffff';
          rect(ctx, bc, x + 1, y + 1, 62, 70); rect(ctx, '#0c1230', x + 3, y + 3, 58, 66);
          const [e, fr] = cardExpr(c), shk = e === 'angry' && fr === 1 ? ((frame >> 1) & 1) : 0;
          rect(ctx, '#000000', x + 7, y + 2, 50, 50);
          ctx.drawImage(portrait(c.li, e, fr), x + 8 + shk, y + 3);
          if (c === g.player) { rect(ctx, '#ffd400', x + 3, y + 3, 21, 9); text(ctx, 'YOU', x + 5, y + 4, '#101830'); }
          if (c.moon && !c.dead) ctx.drawImage(SI.moon, x + 49, y + 4);
          if (c.station && !c.dead) ctx.drawImage(SI.station, x + 48, y + 12);
          if (c.alert && !c.dead) ctx.drawImage(SI.abm, x + 49, y + 42);
          text(ctx, c.L.short, x + 32, y + 54, c === g.player ? '#ffd400' : '#ffffff', { center: true });
          if (c.dead || (c === g.player && g.contPending)) text(ctx, 'WIPED OUT', x + 32, y + 63, (frame >> 4) & 1 ? '#ff4040' : '#a02020', { center: true });
          else {
            const pc = c.disp < 10 ? '#ff6040' : c.disp < 20 ? '#ffd040' : '#80ff80';
            text(ctx, fmt(c.disp), x + 32, y + 63, pc, { center: true });
          }
          if (tgtOk.length && !tgtOk.includes(c) && c !== g.player) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x, y, 64, 72); }
          if (g.turnOf === c && !c.dead) { const ay = y - 6 + ((frame >> 3) & 1); for (let k = 0; k < 4; k++) rect(ctx, '#ffffff', x + 29 + k, ay + k, 7 - k * 2, 1); }
        }
      }
      function drawBalloon(ctx) {
        const b = g.bal; if (!b) return;
        const lines = b.lines, n = Math.min(lines.length, 4), wd = Math.max.apply(null, lines.map(l => l.length)) * 6 + 8, ht = n * 9 + 6;
        const cx = b.c.slot * 64 + 32, x = Math.max(2, Math.min(W - wd - 2, Math.round(cx - wd / 2))), y = 124 - ht;
        rect(ctx, '#101010', x - 1, y - 1, wd + 2, ht + 2); rect(ctx, '#ffffff', x, y, wd, ht); rect(ctx, '#d8d8e0', x, y + ht - 1, wd, 1);
        for (let k = 0; k < 5; k++) { rect(ctx, '#101010', cx - 3 + k - 1, y + ht + k, 6 - k * 1 + 2 - k, 1); rect(ctx, '#ffffff', cx - 3 + k, y + ht - 1 + k, Math.max(1, 5 - k * 1.5), 1); }
        const shown = Math.floor(b.t * 1.6);
        let used = 0;
        for (let i = 0; i < n; i++) { const ln = lines[i], vis = Math.max(0, Math.min(ln.length, shown - used)); used += ln.length; if (vis) text(ctx, ln.slice(0, vis), x + 4, y + 4 + i * 9, '#101830'); }
      }
      function drawBanner(ctx) {
        const b = g.banner; if (!b) return;
        const sc = b.big ? 3 : (b.text.length <= 18 ? 2 : 1), wpx = b.text.length * 6 * sc, x = 160 - wpx / 2 - 8, y = b.big ? 42 : 52, h = 7 * sc + 10;
        const k = Math.min(1, b.t / 8);
        rect(ctx, '#000000', x - 1, y - 1, wpx + 18, h + 2); rect(ctx, b.big && (frame >> 2) & 1 ? '#ff3b2b' : '#1c2c6c', x, y, wpx + 16, h);
        rect(ctx, '#0a1030', x + 2, y + 2, wpx + 12, h - 4);
        if (k >= 1) text(ctx, b.text, 160, y + 5, b.big && (frame >> 2) & 1 ? '#ffd400' : b.col, { center: true, scale: sc, shadow: '#000000' });
      }
      function drawInventory(ctx, y) {
        const p = g.player; let x = 4;
        const item = (ic, n, w) => { ctx.drawImage(SI[ic], x, y + (8 - SI[ic].height)); x += w; text(ctx, String(n), x, y + 1, n ? '#ffffff' : '#5a6488'); x += String(n).length * 6 + 6; };
        item('atlas', p.atlas, 7); item('titan', p.titan, 9); item('bomber', p.bomber, 11);
        ctx.drawImage(SI.bomb, x, y); x += 9;
        for (const mt of [10, 20, 50, 100]) { text(ctx, mt + ':', x, y + 1, '#ffd040'); x += (String(mt).length + 1) * 6; text(ctx, String(p.w[mt]), x, y + 1, p.w[mt] ? '#ffffff' : '#5a6488'); x += String(p.w[mt]).length * 6 + 5; }
        item('abm', p.abm, 9);
        if (p.alert) text(ctx, 'ALERT', x, y + 1, (frame >> 3) & 1 ? '#80ffff' : '#2c90ff');
      }
      function drawBar(ctx) {
        rect(ctx, '#0a1230', 0, 200, W, 40); rect(ctx, '#3c5cb0', 0, 200, W, 1); rect(ctx, '#1c2c60', 0, 201, W, 1); rect(ctx, '#1c2c60', 0, 225, W, 1);
        const menuOn = g.phase === 'menu' && !g.cur && !g.q.length && !g.ended;
        if (menuOn) {
          const m = g.menu;
          if (m.lvl === 'target') {
            const t = targets()[m.sel];
            text(ctx, m.act === 'prop' ? 'PROPAGANDA TARGET:' : 'TARGET FOR ' + m.mt + ' MT ' + CNAME[m.carrier] + ':', 4, 203, '#80d0ff');
            if (t) { text(ctx, '< ' + t.L.name + ' (' + t.L.land + ') >', 160, 214, (frame >> 3) & 1 ? '#ffd400' : '#ffffff', { center: true }); }
          } else {
            text(ctx, m.lvl === 'main' ? 'YOUR TURN, ' + g.player.L.short + '! CHOOSE AN ACTION:' : LIST_TITLE[m.lvl] + '  (X: BACK)', 4, 203, '#80d0ff');
            const en = mainEnabled();
            for (let i = 0; i < 4; i++) {
              const r = mainRect(i), on = m.lvl === 'main' && m.sel === i;
              rect(ctx, on ? '#ffd400' : en[i] ? '#2c3c80' : '#161c3c', r.x, r.y, r.w, r.h);
              if (!on) rect(ctx, '#0a1230', r.x + 1, r.y + 1, r.w - 2, r.h - 2);
              text(ctx, MAIN[i], r.x + r.w / 2, r.y + 3, on ? '#101830' : en[i] ? '#ffffff' : '#4a5480', { center: true });
            }
          }
        } else {
          const lines = wrap(g.msg, 52).slice(0, 2);
          lines.forEach((l, i) => text(ctx, l, 4, 204 + i * 10, i ? '#c0c8e8' : '#ffffff'));
        }
        drawInventory(ctx, 229);
      }
      function drawMenuPopup(ctx) {
        const m = g.menu; if (m.lvl === 'main' || m.lvl === 'target') return;
        const items = listItems(), b = listBox(items.length);
        rect(ctx, '#000000', b.x - 1, b.y - 1, b.w + 2, b.h + 2); rect(ctx, '#3c5cb0', b.x, b.y, b.w, b.h); rect(ctx, '#0c1438', b.x + 1, b.y + 1, b.w - 2, b.h - 2);
        rect(ctx, '#1c2c6c', b.x + 1, b.y + 1, b.w - 2, 11);
        text(ctx, LIST_TITLE[m.lvl], b.x + b.w / 2, b.y + 3, '#ffd400', { center: true });
        items.forEach((it, i) => {
          const y = b.y + 14 + i * 11, on = m.sel === i;
          if (on) rect(ctx, '#ffd400', b.x + 2, y, b.w - 4, 10);
          const col = on ? '#101830' : it.en ? '#ffffff' : '#4a5480';
          text(ctx, it.label, b.x + 6, y + 2, col);
          if (it.right) text(ctx, it.right, b.x + b.w - 6, y + 2, on ? '#101830' : it.en ? '#80d0ff' : '#4a5480', { right: true });
        });
      }
      function renderWar(ctx) {
        ctx.save();
        if (g.shake > 0) ctx.translate(Math.round((rand() - .5) * g.shake * .4), Math.round((rand() - .5) * g.shake * .4));
        drawMapLayer(ctx);
        if (g.cur && g.cur.k === 'boom') drawBoom(ctx, g.cur);
        if (g.cur && g.cur.k === 'event') drawEventPanel(ctx, g.cur);
        drawCards(ctx);
        drawBalloon(ctx);
        drawBanner(ctx);
        drawBar(ctx);
        if (g.phase === 'menu' && !g.cur && !g.q.length) drawMenuPopup(ctx);
        // floats
        drawFloats(ctx, true);
        ctx.restore();
        if (g.flash > 0) { ctx.fillStyle = `rgba(255,255,240,${Math.min(.85, g.flash / 10)})`; ctx.fillRect(0, 0, W, H); }
      }

      // =================================================================
      //  TITLE / SELECT / OVER
      // =================================================================
      const LOGO_ROWS = ['#fff8b0', '#ffe860', '#ffd400', '#ffc000', '#ffa800', '#ff8c00', '#ff6a00'];
      function drawStars(ctx) { for (const s of stars) rect(ctx, (frame + s[3]) % 90 < 4 ? '#ffffff' : s[2], s[0], s[1], 1, 1); }
      function renderTitle(ctx) {
        rect(ctx, '#070a1c', 0, 0, W, H); drawStars(ctx);
        // mushroom on the globe limb
        const cyc = (titleT % 300) / 300;
        if (cyc < .75) { const a = cyc / .75; mushroom(ctx, 183, 86, 5 + Math.min(1, a * 2.2) * 15, 4 + Math.min(1, a * 2) * 6, a, frame); }
        drawGlobe(ctx, 160, 104, titleT * .35, false);
        if (cyc < .03) { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(0, 0, W, H); }
        text(ctx, 'NUCLEAR', 160, 6, '#ffd400', { center: true, scale: 3, outline: '#400000', shadow: '#ff3b2b', sd: 2, rows: LOGO_ROWS });
        text(ctx, 'WAR', 160, 30, '#ffd400', { center: true, scale: 5, outline: '#400000', shadow: '#ff3b2b', sd: 3, rows: LOGO_ROWS });
        const set = Math.floor(titleT / 240) % 2, ex = ['laugh', 'angry', 'neutral', 'laugh'];
        [14, 66, 210, 262].forEach((px, i) => {
          const li = (set * 4 + i) % 8, e = ex[(i + Math.floor(titleT / 120)) % 4];
          rect(ctx, LEADERS[li].col, px - 1, 75, 50, 50);
          ctx.drawImage(portrait(li, e, (frame >> 3) & 1), px, 76);
          text(ctx, LEADERS[li].short, px + 24, 129, '#c0c8e8', { center: true });
        });
        text(ctx, 'BASED ON THE CARD GAME BY FLYING BUFFALO', 160, 142, '#60c0ff', { center: true });
        if (api.credits === 0) { if (coinFlash > 0 || ((frame >> 5) & 1)) text(ctx, 'INSERT COIN', 160, 156, coinFlash > 0 && ((frame >> 2) & 1) ? '#ff3b2b' : '#ffd400', { center: true, scale: 2, shadow: '#400000' }); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START', 160, 156, '#ffd400', { center: true, scale: 2, shadow: '#400000' });
        text(ctx, 'HI SCORE ' + String(hi).padStart(7, '0'), 160, 178, '#ffffff', { center: true });
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 160, 190, '#ffffff', { center: true });
        text(ctx, 'ARROWS/MOUSE: SELECT  SPACE: OK  X: BACK', 160, 208, '#7080b0', { center: true });
        text(ctx, '\u00a9 1989 NEW WORLD COMPUTING', 160, 222, '#ff9028', { center: true });
      }
      const selRect = i => ({ x: 8 + (i % 4) * 76 + 13, y: 26 + Math.floor(i / 4) * 76, w: 50, h: 70 });
      function updSelect() {
        selT++;
        const mv = mouseMoved(), mx = api.mouse.x, my = api.mouse.y;
        const o = sel;
        if (api.pressed('ArrowLeft')) sel = (sel + 7) % 8;
        if (api.pressed('ArrowRight')) sel = (sel + 1) % 8;
        if (api.pressed('ArrowUp') || api.pressed('ArrowDown')) sel = (sel + 4) % 8;
        let hit = -1; for (let i = 0; i < 8; i++) if (inR(selRect(i), mx, my)) hit = i;
        if (hit >= 0 && (mv || api.mouse.clicked)) sel = hit;
        if (sel !== o) { sfx.move(); sfx.voice(LEADERS[sel], 3); }
        if (selT > 20 && (api.pressed('Space') || api.pressed('Enter') || (api.mouse.clicked && hit >= 0))) { sfx.ok(); startWar(sel); }
      }
      function renderSelect(ctx) {
        rect(ctx, '#0a1028', 0, 0, W, H);
        for (let y = 0; y < H; y += 8) rect(ctx, '#0e1636', 0, y, W, 1);
        text(ctx, 'CHOOSE YOUR LEADER', 160, 6, '#ffd400', { center: true, scale: 2, shadow: '#a02010' });
        for (let i = 0; i < 8; i++) {
          const r = selRect(i), L = LEADERS[i], on = sel === i;
          rect(ctx, on ? ((frame >> 3) & 1 ? '#ffffff' : '#ffd400') : dark(L.col, .6), r.x - 1, r.y - 1, 52, 52);
          ctx.drawImage(portrait(i, on ? (Math.floor(selT / 90) % 2 ? 'laugh' : 'neutral') : 'neutral', on ? (frame >> 3) & 1 : ((frame + i * 40) % 160 < 6 ? 2 : 0)), r.x, r.y);
          text(ctx, L.n1, r.x + 25, r.y + 53, on ? '#ffd400' : '#ffffff', { center: true });
          if (L.n2) text(ctx, L.n2, r.x + 25, r.y + 62, on ? '#ffd400' : '#a0a8d0', { center: true });
        }
        const L = LEADERS[sel];
        rect(ctx, '#000000', 7, 181, 306, 56); rect(ctx, L.col, 8, 182, 304, 54); rect(ctx, '#0c1230', 10, 184, 300, 50);
        text(ctx, L.name + ' OF ' + L.land, 160, 188, '#ffd400', { center: true, bold: true });
        wrap('"' + L.intro + '"', 46).forEach((ln, i) => text(ctx, ln, 160, 200 + i * 9, '#ffffff', { center: true }));
        text(ctx, 'VS 4 RIVAL LEADERS  -  SPACE TO CHOOSE', 160, 222, '#80d0ff', { center: true });
      }
      function renderOver(ctx) {
        const o = over, L = LEADERS[o.li];
        rect(ctx, '#070a1c', 0, 0, W, H); drawStars(ctx);
        if (o.kind === 'nobody') {
          drawGlobe(ctx, 160, 92, o.t * .2, true);
          for (let i = 0; i < 18; i++) { const a = i / 18 * TAU + o.t * .01; disc(ctx, i & 1 ? '#5a4a40' : '#7a6a5c', 160 + Math.cos(a) * 33, 92 + Math.sin(a) * 33, 3 + (i % 3)); }
          for (let i = 0; i < 5; i++) { const a = Math.PI * (1.12 + i * .19), ph = ((o.t + i * 37) % 200) / 200; mushroom(ctx, 160 + Math.cos(a) * 29, 92 + Math.sin(a) * 29 + 3, 8 + ph * 10, 4 + ph * 3, .55 + ph * .45, frame + i * 20); }
          text(ctx, 'NUCLEAR WAR', 160, 10, '#ff6a00', { center: true, scale: 3, outline: '#400000', rows: LOGO_ROWS });
          text(ctx, 'NOBODY WINS', 160, 134, (frame >> 4) & 1 ? '#ffffff' : '#ff8080', { center: true, scale: 2, shadow: '#400000' });
        } else {
          const win = o.kind === 'win';
          rect(ctx, win ? '#ffd400' : '#802020', 15, 23, 98, 98);
          ctx.drawImage(portrait(o.li, win ? 'laugh' : 'dead', (frame >> 3) & 1), 16, 24, 96, 96);
          text(ctx, win ? 'VICTORY!' : 'GAME OVER', 216, 26, win ? '#ffd400' : '#ff3b2b', { center: true, scale: 2, shadow: '#400000', rows: win ? LOGO_ROWS : null });
          const msg = win ? L.name + ' RULES THE WORLD... WHAT IS LEFT OF IT.' : L.land + ' IS NOW A SMOKING CRATER.';
          wrap(msg, 30).forEach((ln, i) => text(ctx, ln, 216, 50 + i * 10, '#ffffff', { center: true }));
          const q = '"' + (win ? L.win : L.dead) + '"';
          wrap(q, 30).forEach((ln, i) => text(ctx, ln, 216, 84 + i * 10, '#80d0ff', { center: true }));
        }
        const y0 = 154;
        if (o.t > 30) { text(ctx, 'SURVIVORS', 40, y0, '#c0c8e8'); text(ctx, o.pop.toFixed(1) + 'M', 214, y0, '#ffffff', { right: true }); text(ctx, String(Math.round(o.pop * 10000)), 284, y0, '#ffffff', { right: true }); }
        if (o.t > 50) { text(ctx, 'RIVALS DESTROYED', 40, y0 + 11, '#c0c8e8'); text(ctx, o.kills + ' X 25000', 214, y0 + 11, '#ffffff', { right: true }); text(ctx, String(o.kills * 25000), 284, y0 + 11, '#ffffff', { right: true }); }
        if (o.t > 70) { text(ctx, 'WINNER BONUS', 40, y0 + 22, '#c0c8e8'); text(ctx, String(o.kind === 'win' ? 100000 : 0), 284, y0 + 22, '#ffffff', { right: true }); }
        if (o.t > 90) { rect(ctx, '#3c5cb0', 40, y0 + 32, 244, 1); text(ctx, 'SCORE', 40, y0 + 36, '#ffd400', { bold: true }); text(ctx, String(o.score), 284, y0 + 36, '#ffd400', { right: true, bold: true }); text(ctx, 'HI SCORE ' + hi, 160, y0 + 50, '#80d0ff', { center: true }); }
        if (o.t > 150 && (frame >> 4) & 1) text(ctx, 'PRESS START', 160, 228, '#ffffff', { center: true });
      }

      if (api.debugHook) api.debugHook({ g: () => g, map: () => MAP, mode: () => mode, hurt: (slot, amt, by) => hurt(g.c[slot], amt, g.c[by == null ? (slot ? 0 : 1) : by]), sum: () => g && { phase: g.phase, round: g.round, pops: g.c.map(c => c.pop), cur: g.cur && g.cur.k, q: g.q.length } });

      return {
        update() {
          frame++; pollCoins(); if (coinFlash > 0) coinFlash--;
          if (mode === 'title') {
            titleT++;
            if ((api.pressed('Enter') || (titleT > 30 && (api.pressed('Space') || api.mouse.clicked))) && tryStart()) { mode = 'select'; sel = 0; selT = 0; sfx.ok(); }
            return;
          }
          if (mode === 'select') { updSelect(); return; }
          if (mode === 'war') { updWar(); return; }
          if (mode === 'over') {
            over.t++;
            if (over.t > 900 || (over.t > 150 && (api.pressed('Enter') || api.pressed('Space') || api.mouse.clicked))) { mode = 'title'; titleT = 0; g = null; }
          }
        },
        render(ctx) {
          ctx.imageSmoothingEnabled = false;
          if (mode === 'title') renderTitle(ctx);
          else if (mode === 'select') renderSelect(ctx);
          else if (mode === 'war') renderWar(ctx);
          else renderOver(ctx);
        }
      };
    }
  });
})();
