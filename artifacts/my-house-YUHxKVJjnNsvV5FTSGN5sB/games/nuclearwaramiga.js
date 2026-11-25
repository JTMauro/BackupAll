// Nuclear War \u2014 Commodore Amiga version (New World Computing, 1989) for Arcade Games Galore.
// Five cartoon leaders each rule an island nation in a stylised ocean. Each turn: BUILD weapons,
// spread PROPAGANDA, DEFEND, draw a SECRET card or ATTACK (delivery system + warhead + target).
// Peace lasts until the first nuke; eliminated nations launch a FINAL RETALIATION. Last survivor wins.
(function () {
  'use strict';
  // ---- 5x7 bitmap font ----
  // ---- compact 5x7 bitmap arcade font ----
  const FK = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-.,:!?=*/'\"<>()+%#@^_~";
  const FD = "ehjlphe4c4444eeh168gvv2421he26aiv22vgu11he68guhhev124888ehhehheehhf12c4ahhvhhuhhuhhuehgggheuhhhhhuvgguggvvggugggfggjhhfhhhvhhhe44444e11111hehikokihggggggvhrllhhhhhpljhhehhhhheuhhugggehhhliduhhukihfgge11uv444444hhhhhhehhhhha4hhhllrhhha4ahhhha4444v1248gv000v00000000cc0000c480cc0cc04444404eh1240400v0v000level001248g04480000aa00000248g842842124824888428422248044v440pq48mj0avaaavaehnlnge4el4444000000vehlplhe";
  const FONT = {};
  for (let i = 0; i < FK.length; i++) { const g = []; for (let r = 0; r < 7; r++) g.push(parseInt(FD[i * 7 + r], 32)); FONT[FK[i]] = g; }
  FONT['\u00a9'] = [0x0E, 0x11, 0x17, 0x14, 0x17, 0x11, 0x0E];
  const LOWER = {a: [0, 0, 14, 1, 15, 17, 15], b: [16, 16, 22, 25, 17, 17, 30], c: [0, 0, 14, 16, 16, 17, 14], d: [1, 1, 13, 19, 17, 17, 15], e: [0, 0, 14, 17, 31, 16, 14], f: [6, 9, 8, 28, 8, 8, 8], g: [0, 0, 15, 17, 15, 1, 14], h: [16, 16, 22, 25, 17, 17, 17], i: [4, 0, 12, 4, 4, 4, 14], j: [2, 0, 6, 2, 2, 18, 12], k: [16, 16, 18, 20, 24, 20, 18], l: [12, 4, 4, 4, 4, 4, 14], m: [0, 0, 26, 21, 21, 17, 17], n: [0, 0, 22, 25, 17, 17, 17], o: [0, 0, 14, 17, 17, 17, 14], p: [0, 0, 30, 17, 30, 16, 16], q: [0, 0, 15, 17, 15, 1, 1], r: [0, 0, 22, 25, 16, 16, 16], s: [0, 0, 14, 16, 14, 1, 30], t: [8, 8, 28, 8, 8, 9, 6], u: [0, 0, 17, 17, 17, 19, 13], v: [0, 0, 17, 17, 17, 10, 4], w: [0, 0, 17, 17, 21, 21, 10], x: [0, 0, 17, 10, 4, 10, 17], y: [0, 0, 17, 17, 15, 1, 14], z: [0, 0, 31, 2, 4, 8, 31]};
  for (const k in LOWER) FONT[k] = LOWER[k];
  function text(ctx, s, x, y, col, o) {
    o = o || {}; const sc = o.scale || 1, adv = (o.adv || 6) * sc;
    s = o.mixed ? String(s) : String(s).toUpperCase();
    const wpx = s.length * adv - (adv - 5 * sc);
    if (o.center) x = Math.round(x - wpx / 2); else if (o.right) x = Math.round(x - wpx);
    const base = { scale: sc, adv: o.adv, wave: o.wave, wt: o.wt, mixed: o.mixed };
    if (o.outline) for (const d of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]]) text(ctx, s, x + d[0], y + d[1], o.outline, base);
    if (o.shadow) text(ctx, s, x + (o.sd || 1), y + (o.sd || 1), o.shadow, Object.assign({}, base, { outline: null }));
    let i = 0;
    for (const ch of s) {
      const gl = FONT[ch];
      const yy = o.wave ? y + Math.round(Math.sin((o.wt || 0) + i * 0.55) * o.wave) : y;
      if (gl) for (let r = 0; r < 7; r++) {
        const b = gl[r]; if (!b) continue;
        ctx.fillStyle = o.rows ? o.rows[r] : col;
        for (let c = 0; c < 5; c++) if ((b >> (4 - c)) & 1) ctx.fillRect(x + c * sc, yy + r * sc, sc, sc);
      }
      x += adv; i++;
    }
    return wpx;
  }
  const tw = (s, sc) => String(s).length * 6 * (sc || 1) - (sc || 1);
  function wrap(s, n) {
    const out = []; let line = '';
    for (const w of String(s).split(' ')) {
      if (line && (line + ' ' + w).length > n) { out.push(line); line = w; } else line = line ? line + ' ' + w : w;
    }
    if (line) out.push(line);
    return out;
  }

  // ---- helpers ----
  const W = 320, H = 256, TAU = Math.PI * 2;
  const VX = 104, VY = 81, VW = 112, VH = 100, BX = VX, BW = VW;
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
  // Amiga OCS: 12-bit colour (4 bits per gun)
  const q4 = v => Math.round(clamp(v) / 17) * 17;
  const M12 = {};
  function mix12(a, b, t) {
    t = Math.max(0, Math.min(1, t)); const k = a + b + ((t * 64) | 0);
    let v = M12[k]; if (v) return v;
    const A = rgb(a), B = rgb(b);
    v = hex(q4(A[0] + (B[0] - A[0]) * t), q4(A[1] + (B[1] - A[1]) * t), q4(A[2] + (B[2] - A[2]) * t));
    M12[k] = v; return v;
  }
  function gradAt(st, f) {
    if (f <= st[0][0]) return mix12(st[0][1], st[0][1], 0);
    for (let i = 1; i < st.length; i++) if (f <= st[i][0]) { const a = st[i - 1], b = st[i]; return mix12(a[1], b[1], (f - a[0]) / (b[0] - a[0] || 1)); }
    return mix12(st[st.length - 1][1], st[st.length - 1][1], 0);
  }
  function vgrad(x, X, Y, w, h, st) { for (let i = 0; i < h; i++) { x.fillStyle = gradAt(st, h > 1 ? i / (h - 1) : 0); x.fillRect(X, Y + i, w, 1); } }
  const dark = (c, k) => mix(c, '#000000', k);
  const lite = (c, k) => mix(c, '#ffffff', k);
  function hash(x, y) { let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return (n ^ (n >>> 16)) >>> 0; }
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const bay = (x, y) => (BAY[((y & 3) << 2) | (x & 3)] + .5) / 16;
  function rect(x, c, X, Y, w, h) { x.fillStyle = c; x.fillRect(Math.round(X), Math.round(Y), Math.round(w), Math.round(h)); }
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
  // shaded ball: ramp dark -> light, light from upper-left
  function ball(x, cx, cy, rx, ry, ramp, out) {
    if (out) ell(x, out, cx, cy, rx + 1, ry + 1);
    const n = ramp.length;
    for (let i = 0; i < n; i++) {
      const k = i / n;
      ell(x, ramp[i], cx - k * rx * .32, cy - k * ry * .36, rx * (1 - k * .62), ry * (1 - k * .62));
    }
  }
  const rampOf = (c, n) => { const r = []; n = n || 5; for (let i = 0; i < n; i++) { const t = i / (n - 1); r.push(t < .5 ? dark(c, (.5 - t) * 1.0) : lite(c, (t - .5) * .8)); } return r; };
  function spr(x, rows, pal, X, Y, flip) {
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r], n = row.length;
      for (let i = 0; i < n; i++) { const col = pal[row[flip ? n - 1 - i : i]]; if (col) { x.fillStyle = col; x.fillRect(X + i, Y + r, 1, 1); } }
    }
  }
  function line(x, c, x0, y0, x1, y1, w) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); w = w || 1;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0; x.fillStyle = c;
    while (n++ < 900) { x.fillRect(x0, y0, w, w); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  }
  const ease = t => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
  const inR = (r, x, y) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

  // =====================================================================
  //  THE LEADERS
  // =====================================================================
  const LEADERS = [
    { key: 'raygun', tag: 'RONNIE RAYGUN', n1: 'RONNIE', n2: 'RAYGUN', name: 'RONNIE RAYGUN', short: 'RAYGUN', land: 'AMERICANIA', col: '#3a8cff',
      skin: '#f2b48e', sh: '#c47c5a', hi: '#ffdcc4', hair: '#5a3218', hairHi: '#a8683c', brow: '#3a200e', eye: '#3a78c8',
      suit: '#26325e', tie: '#d02828', rx: 15, ry: 17, jaw: 6, sep: 6, ny: 5, nw: 2.8, nh: 2.4, my: 12, mw: 6, mouth: 'grin', rosy: 1, bth: 2,
      voice: 165, aggr: .75, propW: .25,
      intro: "WELL... I'VE SIGNED A LAW OUTLAWING YOUR COUNTRIES. BOMBING BEGINS IN FIVE MINUTES.",
      atk: ['WELL... HERE COMES A LITTLE STAR WAR!', 'GO AHEAD. MAKE MY MEGATON.', 'I PAUSED FOR A JELLY BEAN. NOW... FIRE!'],
      hit: ['THERE YOU GO AGAIN!', "I DON'T RECALL AUTHORIZING THAT!", 'NANCY! CALL THE ASTROLOGER!'],
      prop: ['COME TO AMERICANIA! FREE JELLY BEANS!', "IT'S MORNING HERE. MOVE IN!"],
      build: ['A BIGGER STICK. FOR PEACE.', 'TRICKLE-DOWN MEGATONNAGE!'],
      def: ['STAR WARS SHIELD ONLINE. I THINK.'], laugh: ['HEH HEH. WELL...', 'WIN ONE FOR THE GIPPER!'],
      block: ['HA! BOUNCED RIGHT OFF MY SHIELD!'], dead: 'HONEY... I FORGOT TO DUCK.', win: 'IT IS MORNING IN THE WORLD. WHAT IS LEFT OF IT.' },
    { key: 'gorby', tag: 'GORBACHEF', n1: 'MIKHAIL', n2: 'GORBACHEF', name: 'MIKHAIL GORBACHEF', short: 'GORBACHEF', land: 'SOVIETSKAYA', col: '#ff3a3a',
      skin: '#f0b898', sh: '#c4846a', hi: '#ffe0cc', hair: '#9a9aa4', hairHi: '#d4d4dc', brow: '#6c6c74', eye: '#5a6a3a',
      suit: '#3a4250', tie: '#8c2030', rx: 16, ry: 17, jaw: 3, sep: 6, ny: 5, nw: 3, nh: 2.6, my: 12, mw: 5, mouth: 'smile', bth: 1,
      voice: 112, aggr: .55, propW: .3,
      intro: 'GLASNOST MEANS I CAN SEE ALL OF YOUR CITIES FROM HERE.',
      atk: ['GLASNOST! NOW YOU CAN SEE IT COMING!', 'PERESTROIKA... RESTRUCTURING YOUR CITIES!', 'A SMALL GIFT FROM THE POLITBURO!'],
      hit: ['NYET! MY BIRTHMARK IS THROBBING!', 'THIS WAS NOT IN THE FIVE YEAR PLAN!'],
      prop: ['DEFECT NOW! FREE BORSCHT AND QUEUES!', "THE WORKERS' PARADISE HAS VACANCIES!"],
      build: ['THE TRACTOR FACTORY NOW MAKES ROCKETS.', 'FIVE YEAR PLAN COMPLETE IN ONE TURN!'],
      def: ['THE IRON CURTAIN IS NOW REINFORCED.'], laugh: ['HO HO! VODKA FOR EVERYONE!'],
      block: ['OUR ROCKETS ARE BIGGER, COMRADE!'], dead: 'I SHOULD HAVE STAYED A FARMER...', win: 'THE PARTY IS OVER. I WIN THE PARTY!' },
    { key: 'castro', tag: 'INFIDEL CASTRO', n1: 'INFIDEL', n2: 'CASTRO', name: 'INFIDEL CASTRO', short: 'CASTRO', land: 'CIGARRA', col: '#ff6ad0',
      skin: '#dca07a', sh: '#a86c4c', hi: '#f2c4a4', hair: '#24201c', hairHi: '#4c4238', brow: '#1c1814', eye: '#4a2c14',
      suit: '#56703a', rx: 14, ry: 17, jaw: 0, sep: 6, ny: 4, nw: 3.2, nh: 2.6, my: 11, mw: 5, mouth: 'smile', bth: 2, beard: 1,
      voice: 138, aggr: .6, propW: .35,
      intro: 'I WILL NOW SPEAK FOR SIX HOURS. THEN WE BOMB.',
      atk: ['VIVA LA KABOOM!', 'THIS CIGAR IS ALSO EXPLOSIVE!', 'AFTER MY SPEECH... FIRE!'],
      hit: ['MY CIGAR WENT OUT! YOU WILL PAY!', 'IMPERIALISTS! THIS IS A BAY OF PAIN!'],
      prop: ['FREE CIGARS AND RUMBA FOR DEFECTORS!', 'JOIN THE REVOLUTION! IT IS SUNNY!'],
      build: ['THE REVOLUTION NEEDS BIGGER BANGS.'], def: ['BAY OF PIGS? NOT THIS TIME!'], laugh: ['JA JA JA! VIVA ME!'],
      block: ['HA! I HAVE SURVIVED 600 ATTEMPTS!'], dead: 'HISTORY WILL ABSOLVE... COUGH...', win: 'THE REVOLUTION HAS WON. ALONE.' },
    { key: 'kooks', tag: 'A. KOOKS', n1: 'AYATOLLAH', n2: 'KOOKS', name: 'AYATOLLAH KOOKS', short: 'KOOKS', land: 'KOOKISTAN', col: '#e0d090',
      skin: '#c88c64', sh: '#986040', hi: '#e4b08a', hair: '#1c1c26', hairHi: '#4a4a5c', brow: '#101010', eye: '#2a1a10',
      suit: '#22222c', rx: 13, ry: 18, jaw: 0, sep: 5, ny: 5, nw: 2.4, nh: 3.2, my: 12, mw: 5, mouth: 'frown', bth: 3, beard: 2,
      voice: 84, aggr: .95, propW: .15,
      intro: 'DEATH TO EVERYONE! YES. YOU TOO.',
      atk: ['DEATH TO... WHOEVER IS NEXT!', 'THE GREAT SATAN GETS A GREAT BOMB!', 'FEEL THE WRATH OF KOOKS!'],
      hit: ['A THOUSAND CURSES ON YOUR CAMELS!', 'YOU HAVE SINGED MY BEARD!'],
      prop: ['REPENT! AND MOVE HERE. WE HAVE SAND.', 'JOIN US! WE HAVE EXCITING RULES!'],
      build: ['MORE ROCKETS! THE PROPHECY DEMANDS IT!'], def: ['NOTHING SHALL PASS MY BEARD!'], laugh: ['HAH! THE KOOKS ARE AMUSED!'],
      block: ['MY BEARD DEFLECTS ALL!'], dead: 'THIS... WAS NOT IN THE PROPHECY.', win: 'THE KOOKS INHERIT THE EARTH!' },
    { key: 'mao', tag: 'MAO THE PUN', n1: 'MAO', n2: 'THE PUN', name: 'MAO THE PUN', short: 'MAO', land: 'PUNCHINA', col: '#ffd020',
      skin: '#f0c890', sh: '#c49860', hi: '#ffe8c0', hair: '#18181c', hairHi: '#44444e', brow: '#18181c', eye: '#2a1a10',
      suit: '#7a8a6c', rx: 17, ry: 17, jaw: 4, sep: 6, ny: 5, nw: 3, nh: 2, my: 11, mw: 5, mouth: 'smile', bth: 1, rosy: 1,
      voice: 104, aggr: .7, propW: .3,
      intro: 'A JOURNEY OF A THOUSAND MILES BEGINS WITH A SINGLE BOMB.',
      atk: ['LET A HUNDRED BOMBS BLOSSOM!', 'POWER GROWS OUT OF A NOSE CONE!', 'A GREAT LEAP FORWARD... ONTO YOU!'],
      hit: ['YOU MAO-NSTER!', 'THAT WAS NOT VERY CONFUCIUS!'],
      prop: ['READ MY LITTLE RED BOOK! MOVE HERE!', 'A BILLION PEOPLE CANNOT BE WRONG!'],
      build: ['CULTURAL REVOLUTION, NOW WITH ROCKETS.'], def: ['THE GREAT WALL NOW HAS A ROOF.'], laugh: ['HA HA! PAPER TIGERS!'],
      block: ['HA! A PAPER TIGER MISSILE!'], dead: 'THE PUN... IS... OVER.', win: 'WHO IS THE PUN-ISHER NOW?' },
    { key: 'ghanji', tag: 'GHANJI', n1: 'GHANJI', n2: '', name: 'GHANJI', short: 'GHANJI', land: 'GHANJISTAN', col: '#ff9028',
      skin: '#b07448', sh: '#7e4e2c', hi: '#d29a6c', hair: '#d8d8d8', hairHi: '#ffffff', brow: '#d0d0d0', eye: '#2a1a10',
      suit: '#f0ece0', rx: 13, ry: 16, jaw: 0, sep: 5, ny: 5, nw: 2.2, nh: 3.4, my: 12, mw: 4, mouth: 'gummy', bth: 1, ears: 1,
      voice: 205, aggr: .25, propW: .55,
      intro: 'VIOLENCE IS BAD. THIS IS JUST A VERY LOUD KIND OF PEACE.',
      atk: ['THIS IS A NON-VIOLENT MEGATON.', 'I SEND YOU INNER PEACE. AT MACH 20.', 'OM... BOOM.'],
      hit: ['I SHALL FAST UNTIL YOU GLOW!', 'MY KARMA RUNS OVER YOUR DOGMA!'],
      prop: ['PEACE, LOVE AND FREE SANDALS!', 'COME MEDITATE WITH US. NO BOMBS. MOSTLY.'],
      build: ['IT IS A PEACEFUL MISSILE. HONEST.'], def: ['I WILL SIT HERE AND BLOCK THEM.'], laugh: ['HEE HEE! ENLIGHTENMENT!'],
      block: ['PASSIVE RESISTANCE WORKS!'], dead: 'OM... OUCH.', win: 'PEACE AT LAST. VERY, VERY QUIET PEACE.' },
    { key: 'farter', tag: 'JIMMY FARTER', n1: 'JIMMY', n2: 'FARTER', name: 'JIMMY FARTER', short: 'FARTER', land: 'PEANUTIA', col: '#e8a850',
      skin: '#f4bc94', sh: '#c8886a', hi: '#ffe0c8', hair: '#c49c5c', hairHi: '#ecd49c', brow: '#9c7440', eye: '#3a78c8',
      suit: '#7a5c3c', tie: '#3050c0', rx: 15, ry: 17, jaw: 3, sep: 6, ny: 4, nw: 2.6, nh: 2.4, my: 11, mw: 7, mouth: 'teeth', bth: 1, ears: 1, rosy: 1,
      voice: 188, aggr: .35, propW: .45,
      intro: "I'VE LUSTED IN MY HEART... FOR WORLD PEACE. AND PEANUTS.",
      atk: ["THIS ONE'S A REAL NUTCRACKER!", 'AW SHUCKS. SORRY ABOUT THIS.', "I'M NUTS ENOUGH TO DO IT!"],
      hit: ["THAT AIN'T VERY NEIGHBORLY!", 'YOU JUST SHELLED MY PEANUTS!'],
      prop: ['FREE PEANUT BUTTER! CRUNCHY OR SMOOTH!', 'COME ON DOWN TO PEANUTIA!'],
      build: ['ANOTHER ONE FOR THE PEANUT GALLERY.'], def: ['A KILLER RABBIT GUARDS OUR SKIES.'], laugh: ['HYUK! AW SHUCKS!'],
      block: ['HA! THAT WAS JUST A GOOBER!'], dead: 'I SHOULD HAVE STUCK TO PEANUTS.', win: 'AW SHUCKS... I WON!' },
    { key: 'maggie', tag: 'P.M. SATCHER', n1: 'P.M.', n2: 'SATCHER', name: 'P.M. SATCHER', short: 'SATCHER', land: 'BRITANNIUM', col: '#b47cff',
      skin: '#f4c4a8', sh: '#c88c74', hi: '#ffe4d4', hair: '#c49048', hairHi: '#f0c878', brow: '#8a6030', eye: '#3a78c8',
      suit: '#2444b0', rx: 13, ry: 16, jaw: 0, sep: 5, ny: 5, nw: 2.2, nh: 2.4, my: 11, mw: 4, mouth: 'lips', bth: 1, lady: 1,
      voice: 250, aggr: .75, propW: .2,
      intro: 'THE LADY IS NOT FOR TURNING. OR FOR LOSING.',
      atk: ['ONE LUMP OR TWO MEGATONS?', "THE LADY'S NOT FOR TURNING. FIRE!", 'RULE BRITANNIA! RULE THE CRATERS!'],
      hit: ['HOW FRIGHTFULLY RUDE!', 'THAT IS SIMPLY NOT CRICKET!', "YOU'LL HEAR FROM MY HANDBAG!"],
      prop: ['TEA AND CRUMPETS FOR ALL DEFECTORS!', 'PRIVATIZE YOUR LOYALTY TO ME!'],
      build: ['A STRONG ECONOMY BUILDS STRONG BOMBS.'], def: ['NOTHING SPOILS TEA TIME. NOTHING.'], laugh: ['REJOICE! JUST REJOICE!'],
      block: ['MY HANDBAG SWATTED IT AWAY!'], dead: 'NOT... CRICKET...', win: 'RULE BRITANNIA! RULE EVERYTHING!' }
  ];
  const BACKQ = ["YOU CAN'T GET RID OF ME THAT EASILY!", 'I WAS IN THE BUNKER. HA!', 'SURPRISE! THE SURVIVORS ARE BACK!'];

  // =====================================================================
  //  PORTRAITS (56x56, shaded Deluxe-Paint style)
  // =====================================================================
  const PW = 56, PCX = 28, PCY = 25;
  const PCACHE = {};
  function portrait(li, ex, f) {
    const key = li + ':' + ex + ':' + f; let c = PCACHE[key]; if (c) return c;
    c = mk(PW, PW); drawPortrait(c.getContext('2d'), LEADERS[li], ex, f); PCACHE[key] = c; return c;
  }
  function pbg(x, L, ex, f) {
    let top, bot, acc;
    switch (ex) {
      case 'angry': top = '#e83a1a'; bot = '#3a0404'; acc = '#ff9a50'; break;
      case 'laugh': top = '#fff070'; bot = '#c04a00'; acc = '#fff8d0'; break;
      case 'shock': top = '#f0f4ff'; bot = '#3a4aa0'; acc = '#ffffff'; break;
      case 'cry': top = '#5a8ad8'; bot = '#061636'; acc = '#a8d0ff'; break;
      case 'dead': top = '#ff8a2a'; bot = '#140400'; acc = '#ffd070'; break;
      case 'smug': top = '#c8e4ff'; bot = '#6a7ae0'; acc = mix('#ffffff', L.col, .3); break;
      default: top = '#b8dcff'; bot = '#5a8ae0'; acc = '#e0f0ff';
    }
    for (let py = 0; py < PW; py++) {
      const rc = mix12(top, bot, py / (PW - 1)), rl = mix12(rc, acc, .38);
      for (let px = 0; px < PW; px++) {
        const dx = px - 28, dy = py - 22, d = Math.sqrt(dx * dx + dy * dy) / 31;
        let v = d < 1 ? (1 - d) * .7 : 0;
        const a = Math.atan2(dy, dx);
        if (ex === 'laugh' && Math.floor((a + TAU + f * .2) / (TAU / 16)) % 2 === 0) v += .45;
        else if (ex === 'angry') { const s = ((a + TAU) / (TAU / 12)) % 1; if (d > .45 && Math.abs(s - .5) < .3 * (1.2 - d)) v += .5; }
        else if (ex === 'shock') { if (((d * 9 + f * .5) % 1) < .32) v += .4; }
        else if (ex === 'cry') { if ((px * 5 + py * 1 + f * 4 + (px >> 2) * 7) % 19 === 0) v += .9; }
        else if (ex === 'dead') { if (py > 30 && (hash(px, py + f * 3) & 31) === 0) v += 1; }
        x.fillStyle = v > bay(px, py) ? rl : rc; x.fillRect(px, py, 1, 1);
      }
    }
  }
  function V(x, col, cx, top, bot, k) { for (let y = top; y <= bot; y++) { const hw = (bot - y) * k; if (hw >= .5) rect(x, col, Math.round(cx - hw), y, Math.round(hw * 2), 1); } }
  function pbody(x, L, dead, P) {
    const suit = dead ? mix(L.suit, '#1a1414', .65) : L.suit;
    const r = [dark(suit, .55), dark(suit, .32), suit, lite(suit, .16), lite(suit, .32)];
    const O = '#0c0608';
    ell(x, O, 28, 59, 29, 16);
    ell(x, r[0], 28, 59, 28, 15); ell(x, r[1], 27, 58, 26, 13.5); ell(x, r[2], 25, 57, 22, 11); ell(x, r[3], 20, 53, 11, 4.5); ell(x, r[4], 17, 51, 5, 2);
    // neck
    const nk = P.sh;
    rect(x, O, 21, 33, 14, 14); rect(x, nk, 22, 33, 12, 14); rect(x, dark(nk, .22), 30, 33, 4, 14); rect(x, dark(nk, .3), 22, 41, 12, 2);
    switch (L.key) {
      case 'castro':
        V(x, O, 28, 43, 55, .7); V(x, dark(suit, .2), 28, 44, 55, .6);
        rect(x, dark(suit, .5), 14, 47, 1, 9); rect(x, dark(suit, .5), 41, 47, 1, 9);
        for (const px of [11, 33]) { rect(x, dark(suit, .45), px, 49, 10, 1); rect(x, r[3], px, 50, 10, 1); rect(x, dark(suit, .35), px + 4, 51, 2, 2); }
        rect(x, dead ? '#5a5030' : '#d8c050', 6, 46, 7, 2); rect(x, dead ? '#5a5030' : '#d8c050', 43, 46, 7, 2);
        break;
      case 'kooks':
        V(x, '#5a5a6a', 28, 41, 56, .55); V(x, dead ? '#5a5650' : '#ece8dc', 28, 42, 56, .4);
        rect(x, dark(suit, .5), 9, 46, 1, 10); rect(x, dark(suit, .5), 46, 46, 1, 10);
        break;
      case 'mao':
        rect(x, O, 17, 41, 22, 6); rect(x, r[2], 18, 42, 20, 4); rect(x, r[3], 18, 42, 20, 1); rect(x, r[1], 27, 42, 2, 4);
        rect(x, r[1], 27, 46, 2, 10);
        for (const by of [48, 52]) { rect(x, dead ? '#5a5030' : '#e8d070', 27, by, 2, 2); rect(x, '#ffffff', 27, by, 1, 1); }
        rect(x, r[1], 12, 50, 8, 1); rect(x, r[1], 36, 50, 8, 1); rect(x, r[0], 12, 50, 1, 4); rect(x, r[0], 43, 50, 1, 4);
        break;
      case 'ghanji': {
        // bare right shoulder, shawl draped over the left
        ell(x, O, 46, 56, 13, 9); ell(x, P.sh, 46, 56, 12, 8); ell(x, P.mid, 45, 55, 10, 6.5); ell(x, P.skin, 44, 54, 6, 3.5);
        const dark2 = dead, sw = dead ? '#6a6458' : '#f4f0e4', sd = dead ? '#4a463e' : '#cfc6ae', sk = dead ? '#3a362e' : '#a8a088';
        const sl = dark2 ? '#7a7468' : '#ffffff', tones = [sk, sd, sw, sl];
        for (let y = 40; y < 56; y++) for (let xx = 0; xx < 56; xx++) {
          const ex2 = (xx - 28) / 28.5, ey2 = (y - 59) / 16; if (ex2 * ex2 + ey2 * ey2 > 1) continue;
          const xe = 31 + (y - 42) * 1.25; if (xx > xe) continue;
          let v = 2.3 - (y - 40) / 9 - Math.abs(xx - 16) / 22 + Math.sin((xx * .8 - y) * .5) * .55;
          if (xx > xe - 2) v -= 1; if (ex2 * ex2 + ey2 * ey2 > .9) v -= 1.2;
          v = Math.max(0, Math.min(2.99, v)); const i0 = Math.floor(v);
          x.fillStyle = tones[Math.min(3, i0 + ((v - i0) > bay(xx, y) ? 1 : 0))]; x.fillRect(xx, y, 1, 1);
        }
        break;
      }
      case 'maggie':
        V(x, '#c8c8d8', 28, 41, 53, .6); V(x, '#ffffff', 28, 42, 53, .5);
        // bow
        ell(x, '#9090a8', 24, 45, 4, 2.6); ell(x, '#9090a8', 32, 45, 4, 2.6); ell(x, '#ffffff', 24, 44.6, 3, 1.8); ell(x, '#ffffff', 32, 44.6, 3, 1.8);
        rect(x, '#b0b0c8', 27, 43, 2, 3);
        // pearls
        for (let i = 0; i < 9; i++) { const a = Math.PI * (.15 + i * .0875); const px = Math.round(28 - Math.cos(a) * 7), py = Math.round(38 + Math.sin(a) * 3.5); rect(x, dead ? '#706860' : '#e8e4f0', px, py, 2, 2); rect(x, '#ffffff', px, py, 1, 1); }
        break;
      default: {
        V(x, O, 28, 42, 56, .62); V(x, dead ? '#5a5650' : '#f4f4f4', 28, 43, 56, .52);
        line(x, r[0], 21, 43, 27, 56); line(x, r[0], 35, 43, 29, 56);
        const tie = dead ? '#3a2020' : L.tie;
        rect(x, dark(tie, .4), 26, 43, 4, 3); rect(x, tie, 27, 43, 2, 2);
        for (let y = 46; y < 56; y++) { const w = 2 + Math.floor((y - 46) / 4); rect(x, tie, 28 - w / 2 - .5, y, w + 1, 1); }
        rect(x, lite(tie, .3), 27, 47, 1, 6);
        if (L.key === 'raygun') { rect(x, '#e8e8f0', 12, 49, 4, 3); rect(x, '#d02020', 12, 49, 4, 1); rect(x, '#2040a0', 12, 49, 2, 2); }
        if (L.key === 'farter') { ell(x, '#3a2410', 14, 50, 2.6, 3.4); ell(x, '#d8a860', 14, 50, 1.8, 2.6); rect(x, '#f0d090', 13, 48, 1, 2); }
      }
    }
  }
  function pear(x, L, cx, cy, P) {
    const er = L.ears ? [5, 6.5] : [3.4, 4.8];
    for (const s of [-1, 1]) {
      const ex = cx + s * (L.rx - .5);
      ell(x, P.O, ex, cy + 2, er[0] + 1, er[1] + 1); ell(x, P.sh, ex, cy + 2, er[0], er[1]); ell(x, P.mid, ex - s * .6, cy + 1.6, er[0] - 1.2, er[1] - 1.2);
      ell(x, P.sh2, ex + s * .4, cy + 2.4, er[0] * .4, er[1] * .55);
      if (L.lady) { rect(x, P.dead ? '#706860' : '#f4f0ff', ex - 1, cy + 6, 3, 3); rect(x, '#ffffff', ex - 1, cy + 6, 1, 1); }
    }
  }
  function headLayer(x, L, col, cx, cy, s, ox, oy) {
    ell(x, col, cx + ox, cy + oy, L.rx - s, L.ry - s);
    if (L.jaw) ell(x, col, cx + ox * .6, cy + L.ry * .42 + oy * .5, L.rx + L.jaw * .25 - s, L.ry * .58 - s * .8);
  }
  function eye(x, ex, ey, kind, look, L, side, P, f) {
    const O = P.O;
    if (kind === 'blink') { rect(x, P.sh2, ex - 3, ey, 7, 1); rect(x, O, ex - 3, ey + 1, 7, 1); rect(x, O, ex - 4 + (side > 0 ? 7 : 0), ey + 2, 1, 1); return; }
    if (kind === 'happy') { const pts = [[-3, 1], [-2, 0], [-1, -1], [0, -1], [1, -1], [2, 0], [3, 1]]; for (const p of pts) { rect(x, O, ex + p[0], ey + p[1], 1, 2); } return; }
    if (kind === 'squeeze') {
      for (let i = 0; i < 4; i++) { const xx = ex + side * (i - 3) * -1; rect(x, O, ex - side * (3 - i), ey - 2 + i, 2, 1); rect(x, O, ex - side * (3 - i), ey + 2 - i, 2, 1); }
      return;
    }
    const wide = kind === 'wide', blank = kind === 'blank';
    const rx = wide ? 4.2 : 3.3, ry = wide ? 4.4 : 3;
    ell(x, O, ex, ey, rx + 1, ry + 1);
    ell(x, blank ? '#f0f0e8' : '#ffffff', ex, ey, rx, ry);
    rect(x, '#c4ccdc', ex - 2, ey - Math.round(ry) + (wide ? 1 : 0), 5, 1);
    if (wide) { rect(x, '#000000', ex + look, ey, 2, 2); rect(x, '#ffffff', ex + look, ey, 1, 1); }
    else if (blank) { rect(x, '#000000', ex + (f ? 1 : -1), ey + (f ? 0 : 1), 1, 1); }
    else {
      rect(x, L.eye, ex - 1 + look, ey - 1, 3, 3); rect(x, '#000000', ex + look, ey, 1, 2); rect(x, '#ffffff', ex - 1 + look, ey - 1, 1, 1);
      if (L.lady && !P.dead) { ell(x, '#5a8ae0', ex, ey - 3.4, 4, 1.4); rect(x, O, ex - 3, ey - 3, 7, 1); for (let i = -3; i <= 3; i += 2) rect(x, O, ex + i, ey - 4, 1, 1); }
    }
    if (kind === 'half') { rect(x, P.mid, ex - 4, ey - 4, 9, 4); rect(x, P.sh2, ex - 4, ey - 1, 9, 1); rect(x, O, ex - 3, ey - 1, 7, 1); }
    if (kind === 'angry') { for (let i = 0; i < 9; i++) { const xx = ex - 4 + i, inner = side < 0 ? i : 8 - i; const h = 1 + Math.floor(inner * .45); rect(x, P.mid, xx, ey - 4, 1, h + 1); rect(x, O, xx, ey - 4 + h + 1, 1, 1); } }
  }
  function brow(x, ex, ey, kind, side, col, th) {
    for (let i = 0; i <= 7; i++) {
      const u = i / 7, X = Math.round(ex - side * (4 - i * 8 / 7));
      let y;
      switch (kind) {
        case 'angry': y = ey - 7 + u * 4; break;
        case 'sad': y = ey - 4 - u * 3.5; break;
        case 'up': y = ey - 9 - Math.sin(u * Math.PI) * 1.5; break;
        case 'raise': y = ey - 8 - Math.sin(u * Math.PI) * 2.2; break;
        default: y = ey - 6 - Math.sin(u * Math.PI) * 1.4;
      }
      y = Math.round(y);
      rect(x, col, X, y, 1, th);
      if (th > 1) rect(x, lite(col, .25), X, y, 1, 1);
    }
  }
  function nose(x, nx, ny, L, P) {
    ell(x, P.sh2, nx + .8, ny + .9, L.nw + .4, L.nh + .3);
    ell(x, P.sh, nx + .3, ny + .3, L.nw, L.nh);
    ell(x, P.mid, nx - .3, ny - .4, L.nw - .7, L.nh - .7);
    rect(x, P.hi, Math.round(nx - 1), Math.round(ny - 1), 1, 1);
    rect(x, P.O, Math.round(nx - L.nw * .5), Math.round(ny + L.nh - 1), 1, 1); rect(x, P.O, Math.round(nx + L.nw * .5), Math.round(ny + L.nh - 1), 1, 1);
    // bridge shadow
    rect(x, P.sh, Math.round(nx + 1), Math.round(ny - L.nh - 4), 1, 4);
  }
  function mouthD(x, mx, my, w, h, P, o) {
    // open "D" mouth: flat top, rounded bottom (o.inv: rounded top)
    const lip = o.lip || P.O;
    for (let r = -1; r <= h; r++) {
      const t = Math.min(1, Math.max(0, r / h)), hw = Math.round((w + 1) * Math.sqrt(Math.max(0, 1 - (o.inv ? (1 - t) * (1 - t) : t * t))));
      if (hw > 0) rect(x, lip, mx - hw, my + r, hw * 2 + 1, 1);
    }
    for (let r = 0; r < h; r++) {
      const t = r / h, hw = Math.round(w * Math.sqrt(Math.max(0, 1 - (o.inv ? (1 - t) * (1 - t) : t * t))));
      if (hw > 0) rect(x, '#3a0a10', mx - hw, my + r, hw * 2 + 1, 1);
    }
    if (o.tongue) ell(x, '#e04a5a', mx + 1, my + h - 1.5, w * .55, Math.max(1.2, h * .32));
    if (o.teeth) { const th = o.teeth; for (let r = 0; r < th; r++) { const hw = Math.round(w * Math.sqrt(Math.max(0, 1 - (o.inv ? 1 : (r / h) * (r / h))))) - 1; if (hw > 0) rect(x, r === th - 1 ? '#d8d0c0' : '#fffaf0', mx - hw, my + r, hw * 2 + 1, 1); } if (o.gaps) for (let i = -w + 2; i < w; i += 3) rect(x, '#c0b4a0', mx + i, my, 1, th); }
    if (o.lower) { const hw = Math.round(w * .7); rect(x, '#fffaf0', mx - hw, my + h - 2, hw * 2 + 1, 2); rect(x, '#c8c0b0', mx - hw, my + h - 2, hw * 2 + 1, 1); }
  }
  function mouth(x, kind, mx, my, L, P, f) {
    const O = L.lady && !P.dead ? '#a81830' : P.O, w = L.mw;
    switch (kind) {
      case 'smile': for (let i = -w; i <= w; i++) { const y = my + Math.round((1 - (i / w) * (i / w)) * 1.8); rect(x, O, mx + i, y, 1, 1); } rect(x, P.sh, mx - 2, my + 3, 5, 1); rect(x, P.O, mx - w - 1, my - 1, 1, 1); rect(x, P.O, mx + w + 1, my - 1, 1, 1); break;
      case 'frown': for (let i = -w; i <= w; i++) { const y = my + 1 - Math.round((1 - (i / w) * (i / w)) * 1.5); rect(x, O, mx + i, y, 1, 1); } break;
      case 'lips': ell(x, '#801020', mx, my + 1, w + 1.5, 2.2); ell(x, '#d0283c', mx, my + .8, w + .8, 1.6); rect(x, '#801020', mx - w, my + 1, w * 2 + 1, 1); rect(x, '#ff7080', mx - 1, my + 2, 2, 1); break;
      case 'gummy': mouthD(x, mx, my, w, 3, P, { tongue: 1 }); break;
      case 'grin': mouthD(x, mx, my, w, 4, P, { teeth: 2, gaps: 1, tongue: 1 }); break;
      case 'teeth': mouthD(x, mx, my - 1, w + 1, 6, P, { teeth: 4, gaps: 1 }); break;
      case 'talk0': for (let i = -w + 1; i <= w - 1; i++) rect(x, O, mx + i, my + 1, 1, 1); rect(x, P.sh, mx - 2, my + 3, 5, 1); break;
      case 'talk1': mouthD(x, mx, my, w - 1, 4, P, { teeth: L.mouth === 'gummy' ? 0 : 1, tongue: 1, lip: O }); break;
      case 'talk2': mouthD(x, mx, my, w - 1, 2, P, { teeth: L.mouth === 'gummy' ? 0 : 1, lip: O }); break;
      case 'shout': mouthD(x, mx, my - 1, w + 1, 7, P, { teeth: 2, tongue: 1, lower: 1, lip: O }); break;
      case 'grit': rect(x, O, mx - w - 1, my - 1, w * 2 + 3, 5); rect(x, '#fffaf0', mx - w, my, w * 2 + 1, 3); rect(x, '#b8ac98', mx - w, my + 1, w * 2 + 1, 1); for (let i = -w + 1; i < w; i += 2) rect(x, '#b8ac98', mx + i, my, 1, 3); break;
      case 'laugh': mouthD(x, mx, my - 1, w + 2, 8 + (f ? 1 : 0), P, { teeth: 2, tongue: 1, lip: O }); break;
      case 'O': ell(x, O, mx, my + 2, 3.4, 4.4 + (f ? .5 : 0)); ell(x, '#3a0a10', mx, my + 2, 2.4, 3.4 + (f ? .5 : 0)); ell(x, '#c04050', mx, my + 4, 1.4, 1); break;
      case 'wail': mouthD(x, mx, my, w + 1, 5 + (f ? 1 : 0), P, { inv: 1, tongue: 0, lip: O }); rect(x, '#fffaf0', mx - w + 1, my + 4 + (f ? 1 : 0), w * 2 - 1, 1); break;
      case 'smirk': for (let i = -w; i <= w + 1; i++) { const t = (i + w) / (2 * w); const y = my + 1 - Math.round(t > .6 ? (t - .6) * 6 : 0); rect(x, O, mx + i, y, 1, 1); } rect(x, P.sh, mx + w + 2, my - 2, 1, 2); break;
      case 'grimace': rect(x, P.O, mx - w - 1, my - 1, w * 2 + 3, 5); rect(x, '#e8e0c8', mx - w, my, w * 2 + 1, 3); for (let i = -w + 1; i < w; i += 2) rect(x, '#5a4a3a', mx + i, my + (i & 2 ? 0 : 1), 1, 2); break;
    }
  }
  function phair(x, L, cx, cy, P, front, dead, f) {
    const hr = [P.O, dark(P.hair, .35), P.hair, mix(P.hair, P.hairHi, .5), P.hairHi];
    switch (L.key) {
      case 'raygun':
        if (!front) { ell(x, P.O, cx, cy - 8, L.rx + 2, 11); ell(x, hr[1], cx, cy - 8, L.rx + 1, 10); return; }
        // pompadour swoop
        ell(x, P.O, cx + 1, cy - 13, L.rx + 1, 8); ell(x, hr[1], cx + 1, cy - 13, L.rx, 7); ell(x, hr[2], cx, cy - 14, L.rx - 1.5, 5.5);
        ell(x, hr[3], cx - 3, cy - 16, 8, 2.6); ell(x, hr[4], cx - 4, cy - 17, 4, 1.2);
        ell(x, P.O, cx + 6, cy - 9, 8, 3.4); ell(x, hr[2], cx + 6, cy - 9.5, 7, 2.6); rect(x, hr[3], cx + 2, cy - 11, 7, 1);
        for (const s of [-1, 1]) { rect(x, P.O, cx + s * (L.rx - 1) - 1, cy - 8, 3, 9); rect(x, hr[2], cx + s * (L.rx - 1), cy - 8, 2, 8); rect(x, hr[3], cx + s * (L.rx - 1), cy - 8, 1, 4); }
        break;
      case 'gorby':
        if (!front) return;
        for (const s of [-1, 1]) { ell(x, P.O, cx + s * (L.rx - 1), cy - 4, 2.6, 5); ell(x, hr[2], cx + s * (L.rx - 1), cy - 4, 1.8, 4.2); for (let i = 0; i < 4; i++) rect(x, hr[4], cx + s * (L.rx - 1) - (i & 1), cy - 7 + i * 2, 1, 1); }
        ell(x, lite(P.hi, .3), cx - 5, cy - 11, 4, 2);
        if (!dead) { const m = '#b03c6a', md = '#82284c'; ell(x, md, cx + 4, cy - 12, 4.2, 2.6); ell(x, m, cx + 3.6, cy - 12.4, 3.4, 1.9); ell(x, m, cx + 7, cy - 10.5, 1.6, 1.4); rect(x, md, cx + 1, cy - 14, 2, 1); rect(x, m, cx + 8, cy - 13, 1, 1); rect(x, lite(m, .3), cx + 2, cy - 13, 2, 1); }
        else { ell(x, '#3a2830', cx + 4, cy - 12, 4, 2.4); }
        break;
      case 'castro': {
        if (!front) { for (const s of [-1, 1]) { rect(x, P.O, cx + s * L.rx - 2, cy - 7, 5, 10); rect(x, hr[2], cx + s * L.rx - 1, cy - 7, 3, 9); } return; }
        const cap = dead ? '#3a3a2a' : '#5a7034', cr = [dark(cap, .5), dark(cap, .25), cap, lite(cap, .18), lite(cap, .35)];
        rect(x, P.O, cx - 14, 0, 29, cy - 9); for (let i = 0; i < 27; i++) { const t = i / 26; rect(x, t < .2 ? cr[4] : t < .45 ? cr[3] : t < .8 ? cr[2] : cr[1], cx - 13 + i, 1, 1, cy - 11); }
        rect(x, cr[0], cx - 13, cy - 13, 27, 2); rect(x, cr[4], cx - 13, 1, 27, 1);
        ell(x, P.O, cx, cy - 10, 16, 3.6); ell(x, cr[1], cx, cy - 10.5, 15, 2.6); ell(x, cr[3], cx - 4, cy - 11.2, 7, 1); rect(x, dark(cap, .65), cx - 12, cy - 9, 25, 1);
        rect(x, dead ? '#806040' : '#e8c840', cx - 1, cy - 19, 3, 3); rect(x, '#ffffff', cx - 1, cy - 19, 1, 1);
        break;
      }
      case 'kooks': {
        if (!front) return;
        const tb = dead ? '#141010' : '#1c1c26', tr = [P.O, dark(tb, .2), tb, lite(tb, .14), lite(tb, .28)];
        ell(x, P.O, cx, cy - 15, L.rx + 6, 10); ell(x, tr[1], cx, cy - 15, L.rx + 5, 9); ell(x, tr[2], cx - 1, cy - 16, L.rx + 3, 7);
        for (let i = 0; i < 4; i++) for (let X = -L.rx - 4; X <= L.rx + 4; X++) {
          const Y = Math.round(cy - 22 + i * 3.2 + (X * X) * .012 * (i - 1.2) + X * .08);
          const dx = X / (L.rx + 5), dy = (Y - (cy - 15)) / 9; if (dx * dx + dy * dy < .82) rect(x, (X + i) % 5 === 0 ? tr[4] : tr[3], cx + X, Y, 1, 1);
        }
        rect(x, P.O, cx - L.rx - 1, cy - 8, L.rx * 2 + 3, 2); rect(x, tr[3], cx - L.rx, cy - 8, L.rx * 2 + 1, 1);
        break;
      }
      case 'mao':
        if (!front) { ell(x, P.O, cx, cy - 6, L.rx + 1.5, 13); ell(x, hr[1], cx, cy - 6, L.rx + .5, 12); return; }
        ell(x, P.O, cx, cy - 14, L.rx - 1, 6); ell(x, hr[2], cx, cy - 14.5, L.rx - 2, 5); ell(x, hr[3], cx - 4, cy - 17, 6, 1.6); ell(x, hr[4], cx - 5, cy - 17.6, 2.5, .8);
        // receding hairline: forehead shows
        ell(x, P.mid, cx - .5, cy - 8, L.rx - 5, 5); ell(x, P.skin, cx - 1.5, cy - 8.5, L.rx - 8, 3.5); ell(x, P.hi, cx - 4, cy - 9, 3, 1.4);
        for (const s of [-1, 1]) { ell(x, hr[2], cx + s * (L.rx - 1.5), cy - 3, 2, 6); }
        break;
      case 'ghanji':
        if (!front) return;
        ell(x, lite(P.hi, .3), cx - 4, cy - 11, 3.4, 1.8);
        for (const s of [-1, 1]) { ell(x, P.O, cx + s * (L.rx - 1), cy - 3, 2.2, 3.4); ell(x, hr[3], cx + s * (L.rx - 1), cy - 3, 1.4, 2.6); }
        break;
      case 'farter':
        if (!front) { ell(x, P.O, cx, cy - 7, L.rx + 1.5, 11); ell(x, hr[1], cx, cy - 7, L.rx + .5, 10); return; }
        ell(x, P.O, cx - 1, cy - 12, L.rx + 1, 7); ell(x, hr[2], cx - 1, cy - 12.5, L.rx, 6); ell(x, hr[3], cx - 5, cy - 14.5, 7, 2.4); ell(x, hr[4], cx - 6, cy - 15, 3.5, 1);
        ell(x, P.O, cx + 5, cy - 8.5, 9, 3.2); ell(x, hr[2], cx + 5, cy - 9, 8, 2.4); rect(x, hr[3], cx + 1, cy - 10, 8, 1); rect(x, P.O, cx - 7, cy - 17, 1, 6);
        for (const s of [-1, 1]) { rect(x, P.O, cx + s * (L.rx - 1) - 1, cy - 8, 3, 7); rect(x, hr[2], cx + s * (L.rx - 1), cy - 8, 2, 6); }
        break;
      case 'maggie':
        if (!front) { ell(x, P.O, cx, cy - 5, L.rx + 8, 17); ell(x, hr[1], cx, cy - 5, L.rx + 7, 16); ell(x, hr[2], cx - 1, cy - 7, L.rx + 5, 13); for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const yy = cy - 6 + i * 4, xx = cx + s * (L.rx + 3.5 - i * .6); ell(x, hr[1], xx + s, yy + 1, 2.6, 1.8); ell(x, hr[3], xx, yy, 2.2, 1.3); rect(x, hr[4], xx - 1, yy - 1, 1, 1); } return; }
        ell(x, P.O, cx + 1, cy - 13, L.rx + 4, 8); ell(x, hr[2], cx + 1, cy - 13.5, L.rx + 3, 7); ell(x, hr[3], cx - 3, cy - 16, 9, 3.4); ell(x, hr[4], cx - 4, cy - 17, 4.4, 1.4);
        for (let i = 0; i < 5; i++) { ell(x, hr[1], cx - 9 + i * 5, cy - 9, 2.4, 1.6); ell(x, hr[3], cx - 9.5 + i * 5, cy - 9.6, 1.4, .8); }
        break;
    }
    if (front && dead && L.key !== 'castro' && L.key !== 'kooks') {
      // frazzled, smoking hair spikes
      for (let i = 0; i < 9; i++) { const a = Math.PI * (1.12 + i * .095), r0 = L.ry - 1, r1 = L.ry + 3 + (i % 3) * 2; line(x, i & 1 ? '#3a3230' : '#1a1616', cx + Math.cos(a) * r0, cy - 3 + Math.sin(a) * r0, cx + Math.cos(a) * r1 + (f ? 1 : -1), cy - 3 + Math.sin(a) * r1); }
    }
  }
  function beard(x, L, cx, cy, P, dead, open) {
    if (L.beard === 1) { // Castro: bushy black beard
      const b = dead ? '#141010' : '#26201c', br = [P.O, dark(b, .2), b, lite(b, .12), lite(b, .24)];
      ell(x, P.O, cx, cy + 12, L.rx + 2, 9); ell(x, br[1], cx, cy + 12, L.rx + 1, 8); ell(x, br[2], cx - 1, cy + 11, L.rx - 1, 6.5);
      for (let i = 0; i < 26; i++) { const px = cx - L.rx + 2 + (hash(i, 3) % (L.rx * 2 - 3)), py = cy + 6 + (hash(i, 7) % 12); rect(x, i & 1 ? br[3] : br[4], px, py, 1, 2); }
      for (const s of [-1, 1]) { rect(x, P.O, cx + s * (L.rx - 1) - 2, cy - 3, 5, 10); rect(x, br[2], cx + s * (L.rx - 1) - 1, cy - 3, 3, 10); }
      // mouth hole
      ell(x, P.mid, cx, cy + L.my - 1, L.mw + 2, 3 + (open ? 2 : 0));
    } else if (L.beard === 2) { // Kooks: long white beard
      const b = dead ? '#5a5650' : '#d8d4cc', br = [dark(b, .55), dark(b, .3), b, lite(b, .4), '#ffffff'];
      ell(x, P.O, cx, cy + 18, L.rx + 2, 14); ell(x, br[1], cx, cy + 18, L.rx + 1, 13); ell(x, br[2], cx - 1, cy + 16, L.rx - 1, 11);
      for (let i = 0; i < 14; i++) { const px = cx - L.rx + 3 + i * 1.6; line(x, i & 1 ? br[0] : br[1], px, cy + 11 + (i % 3), px + (i - 7) * .25, cy + 28 + (i % 4)); }
      ell(x, br[3], cx - 5, cy + 12, 4, 3); ell(x, br[4], cx - 6, cy + 11, 1.6, 1.2);
      for (const s of [-1, 1]) { const sx = cx + s * (L.rx - 2); for (let y = cy - 2; y < cy + 9; y++) rect(x, (y & 1) ? br[1] : br[2], sx - (s < 0 ? 1 : 0), y, 2, 1); }
      ell(x, P.mid, cx, cy + L.my - 1, L.mw + 2, 3 + (open ? 2 : 0));
    }
  }
  function mustache(x, L, cx, cy, P, dead) {
    const my = cy + L.my - 2;
    if (L.beard === 1) { const m = dead ? '#141010' : '#2a2420'; ell(x, P.O, cx, my, L.mw + 3, 2.6); ell(x, m, cx, my - .3, L.mw + 2, 1.8); rect(x, lite(m, .2), cx - 3, my - 1, 3, 1); }
    else if (L.beard === 2) { const m = dead ? '#5a5650' : '#e8e4dc'; ell(x, dark(m, .4), cx, my, L.mw + 3, 2.4); ell(x, m, cx, my - .3, L.mw + 2, 1.6); }
    else if (L.key === 'ghanji') { const m = dead ? '#5a5650' : '#e8e8e8'; ell(x, dark(m, .3), cx, my, 4, 1.6); ell(x, m, cx, my - .4, 3, 1); }
  }
  function drawPortrait(x, L, ex, f) {
    const dead = ex === 'dead', angry = ex === 'angry', laugh = ex === 'laugh', shock = ex === 'shock', cry = ex === 'cry', smug = ex === 'smug', talk = ex === 'talk';
    let skin = L.skin, sh = L.sh, hi = L.hi, hair = L.hair, hairHi = L.hairHi;
    if (angry) { skin = mix(skin, '#ff4a30', .3); sh = mix(sh, '#b81810', .32); hi = mix(hi, '#ff9a80', .3); }
    if (shock) { skin = mix(skin, '#e0eef8', .3); sh = mix(sh, '#8aa0b8', .3); hi = mix(hi, '#ffffff', .3); }
    if (cry) { skin = mix(skin, '#c8d4ff', .14); sh = mix(sh, '#6a7ab0', .14); }
    if (dead) { skin = '#4c4440'; sh = '#2c2422'; hi = '#6e625a'; hair = '#1c1818'; hairHi = '#3a3230'; }
    const P = { skin, sh, hi, hair, hairHi, dead, sh2: dark(sh, .28), mid: mix(skin, sh, .45), O: dead ? '#080404' : dark(sh, .74) };
    pbg(x, L, ex, f);
    pbody(x, L, dead, P);
    const bob = laugh ? (f & 1 ? -1 : 0) : angry ? (f & 1 ? 1 : 0) : 0;
    const cx = PCX + (angry && f & 1 ? 1 : 0), cy = PCY + bob + (shock ? -1 : 0);
    phair(x, L, cx, cy, P, false, dead, f);
    pear(x, L, cx, cy, P);
    // head with smooth multi-tone shading
    headLayer(x, L, P.O, cx, cy, -1, 0, 0);
    headLayer(x, L, P.sh2, cx, cy, 0, 0, 0);
    headLayer(x, L, sh, cx, cy, 1.1, -.7, -.7);
    headLayer(x, L, P.mid, cx, cy, 2.5, -1.4, -1.6);
    headLayer(x, L, skin, cx, cy, 4.2, -2.2, -2.6);
    ell(x, mix(skin, hi, .5), cx - 4, cy - 6, L.rx * .48, L.ry * .4);
    ell(x, hi, cx - 5, cy - 8, L.rx * .22, L.ry * .15);
    // cheeks
    if ((L.rosy || laugh || angry) && !dead) for (const s of [-1, 1]) ell(x, mix(skin, '#ff4a5a', angry ? .45 : .32), cx + s * (L.sep + 3) - 1, cy + 5, 3.2, 2);
    if (L.key === 'raygun' && !dead) { for (const s of [-1, 1]) { rect(x, P.sh, cx + s * (L.sep + 5), cy - 1, 1, 1); rect(x, P.sh, cx + s * (L.sep + 5), cy + 1, 1, 1); } line(x, P.sh, cx - 9, cy + 6, cx - 8, cy + 11); line(x, P.sh, cx + 9, cy + 6, cx + 8, cy + 11); }
    if (L.key === 'kooks' && !dead) { line(x, P.sh2, cx - 1, cy - 9, cx - 1, cy - 6); line(x, P.sh2, cx + 1, cy - 9, cx + 1, cy - 6); }
    if (L.key === 'mao' && !dead) { rect(x, '#3a2418', cx + 3, cy + 15, 2, 2); }
    if (dead) { // soot & cracks
      for (let i = 0; i < 18; i++) { const a = hash(i, 11) / 4294967296 * TAU, r = (hash(i, 5) % 100) / 100 * L.rx * .8; rect(x, i & 1 ? '#2a2220' : '#5c524a', Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 1.1), 1, 1); }
      line(x, '#140c0a', cx - 9, cy - 9, cx - 6, cy - 5); line(x, '#140c0a', cx + 8, cy + 6, cx + 11, cy + 2);
    }
    if (L.beard) beard(x, L, cx, cy, P, dead, ex === 'talk' || ex === 'angry' || ex === 'laugh' || ex === 'shock' || ex === 'cry' || dead);
    // eye sockets
    const ey = cy - 1, el = cx - L.sep - 1, er = cx + L.sep;
    if (!dead) for (const exx of [el, er]) ell(x, P.mid, exx, ey + .3, 4.6, 3.8);
    // eyes
    let ek = 'open', look = 0, bk = 'n';
    if (ex === 'neutral') ek = f === 2 ? 'blink' : 'open';
    if (talk) { bk = f === 1 ? 'up' : 'n'; }
    if (smug) { ek = 'half'; look = 1; }
    if (angry) { ek = 'angry'; bk = 'angry'; }
    if (laugh) { ek = 'happy'; bk = 'up'; }
    if (shock) { ek = 'wide'; bk = 'up'; look = f ? 0 : -1; }
    if (cry) { ek = 'squeeze'; bk = 'sad'; }
    if (dead) { ek = 'blank'; bk = 'sad'; }
    if (L.key === 'ghanji' && (ek === 'open' || ek === 'blink')) look = 0;
    eye(x, el, ey, ek, look, L, -1, P, f); eye(x, er, ey, ek, look, L, 1, P, f);
    const bcol = dead ? '#1a1414' : angry ? dark(L.brow, .2) : L.brow;
    if (smug) { brow(x, el, ey, 'n', -1, bcol, L.bth); brow(x, er, ey, f ? 'raise' : 'up', 1, bcol, L.bth); }
    else { brow(x, el, ey, bk, -1, bcol, L.bth); brow(x, er, ey, bk, 1, bcol, L.bth); }
    if (L.key === 'ghanji') { // round wire spectacles
      const gc = dead ? '#3a3a3a' : '#c8c8d0';
      for (const exx of [el, er]) { for (let a = 0; a < 24; a++) { const t = a / 24 * TAU; rect(x, gc, Math.round(exx + Math.cos(t) * 4.6), Math.round(ey + Math.sin(t) * 4.2), 1, 1); } rect(x, '#ffffff', exx - 3, ey - 3, 1, 1); }
      rect(x, gc, el + 4, ey - 1, er - el - 8, 1); rect(x, gc, el - 9, ey - 1, 4, 1); rect(x, gc, er + 5, ey - 1, 4, 1);
    }
    nose(x, cx, cy + L.ny, L, P);
    // mouth
    let mk2 = L.mouth, open = false;
    if (talk) { mk2 = ['talk0', 'talk1', 'talk2'][f % 3]; open = f > 0; }
    else if (smug) mk2 = L.mouth === 'teeth' || L.mouth === 'grin' ? 'grin' : 'smirk';
    else if (angry) { mk2 = f & 1 ? 'shout' : 'grit'; open = true; }
    else if (laugh) { mk2 = 'laugh'; open = true; }
    else if (shock) { mk2 = 'O'; open = true; }
    else if (cry) { mk2 = 'wail'; open = true; }
    else if (dead) { mk2 = 'grimace'; open = true; }
    mouth(x, mk2, cx, cy + L.my, L, P, f);
    mustache(x, L, cx, cy, P, dead);
    phair(x, L, cx, cy, P, true, dead, f);
    // castro's cigar
    if (L.key === 'castro' && !open) {
      const mx = cx + 3, my = cy + L.my + 1;
      line(x, P.O, mx, my - 1, mx + 11, my + 2, 1); rect(x, P.O, mx, my - 1, 12, 3);
      for (let i = 0; i < 10; i++) rect(x, i < 8 ? (i & 2 ? '#8a5a2a' : '#7a4c22') : '#c8c8c0', mx + 1 + i, my, 1, 1);
      rect(x, '#a87038', mx + 1, my, 7, 1); rect(x, dead ? '#5a4a3a' : (f & 1 ? '#ff6020' : '#ffb040'), mx + 11, my - 1, 1, 2);
      if (!dead) for (let i = 0; i < 4; i++) rect(x, i & 1 ? '#c8c8d0' : '#9898a8', mx + 12 + Math.round(Math.sin(i + f * 2) * 1.5), my - 3 - i * 3, 1, 2);
    }
    // effects
    if (cry) for (const s of [-1, 1]) {
      const tx = (s < 0 ? el : er) + s * 3;
      for (let y = ey + 2; y < ey + 14; y++) rect(x, (y + f * 2) % 4 === 0 ? '#ffffff' : '#5ab0ff', tx + Math.round((y - ey) * .15 * s), y, 1, 1);
      const dy = ey + 15 + f * 4; ell(x, '#5ab0ff', tx + s * 2, dy, 1.2, 1.6); rect(x, '#ffffff', tx + s * 2, dy - 1, 1, 1);
    }
    if (laugh && f & 1) for (const s of [-1, 1]) { const tx = (s < 0 ? el : er) + s * 6; ell(x, '#7ac8ff', tx, ey - 1, 1.2, 1.6); rect(x, '#ffffff', tx, ey - 2, 1, 1); }
    if (shock) { const sx = cx + L.rx - 2, sy = cy - 8 + f * 3; ell(x, '#3a6aa0', sx, sy + 1, 2, 2.8); ell(x, '#9ad4ff', sx, sy + 1, 1.3, 2); rect(x, '#ffffff', sx - 1, sy, 1, 1); rect(x, '#9ad4ff', sx, sy - 2, 1, 1); }
    if (angry) {
      const vx = cx - L.rx + 2, vy = cy - L.ry + 6; const vc = '#ff2020';
      for (const d of [[0, 0], [3, 0], [0, 3], [3, 3]]) { rect(x, vc, vx + d[0], vy + d[1] - 1, 1, 2); rect(x, vc, vx + d[0] - 1, vy + d[1], 2, 1); }
      for (const s of [-1, 1]) { const px = cx + s * (L.rx + 4), py = cy - L.ry + 1 - f * 3; disc(x, '#d8d8e0', px, py, 2.4 + f * .6); disc(x, '#ffffff', px - .5, py - .5, 1.4); disc(x, '#c0c0c8', px + s * 2, py - 4, 1.4); }
    }
    if (dead) for (let i = 0; i < 4; i++) { const px = cx - 6 + i * 4 + (f ? 1 : 0), py = 6 - ((i * 3 + f * 4) % 7); disc(x, i & 1 ? '#8a8a90' : '#5a5a60', px, py, 2.2); disc(x, '#b0b0b8', px - .6, py - .6, 1); }
  }

  // =====================================================================
  //  WEAPONS & SECRETS
  // =====================================================================
  const DELIV = [
    { id: 'atlas', name: 'ATLAS', full: 'ATLAS MISSILE', cap: 10, kind: 'm', col: '#e8e8f0', nose: '#e83030', w: 15 },
    { id: 'titan', name: 'TITAN', full: 'TITAN MISSILE', cap: 20, kind: 'm', col: '#b4bcc8', nose: '#3a3a44', w: 12 },
    { id: 'polaris', name: 'POLARIS', full: 'POLARIS MISSILE', cap: 50, kind: 'm', col: '#5a8ad8', nose: '#ffd040', w: 7 },
    { id: 'trident', name: 'TRIDENT', full: 'TRIDENT MISSILE', cap: 100, kind: 'm', col: '#e8c050', nose: '#d02020', w: 4 },
    { id: 'np1', name: 'NP-1', full: 'NP-1 BOMBER', cap: 50, kind: 'b', col: '#a4aebc', nose: '#3a3a44', w: 6 },
    { id: 'gr2', name: 'GR-2', full: 'GR-2 BOMBER', cap: 100, kind: 'b', col: '#8a96a8', nose: '#d02020', w: 3 }
  ];
  const WARH = [
    { mt: 10, col: '#6ad060', w: 14 }, { mt: 20, col: '#4aa8ff', w: 11 }, { mt: 50, col: '#ff9a20', w: 6 }, { mt: 100, col: '#ff3a3a', w: 3 }
  ];
  const KILL = { 10: 4, 20: 7.5, 50: 14, 100: 25 };
  const SECRETS = [
    { id: 'germ', title: 'SUPER GERM', good: 1, w: 9, desc: 'A GENETICALLY CRANKY GERM IS RELEASED ON YOUR BIGGEST RIVAL.' },
    { id: 'leak', title: 'LAB LEAK', good: 0, w: 6, desc: 'OOPS. THE SUPER GERM GOT OUT AT HOME. -4M' },
    { id: 'sat', title: 'KILLER SATELLITE', good: 1, w: 8, desc: 'AN ORBITAL LASER WILL ZAP THE NEXT 2 MISSILES AIMED AT YOU.' },
    { id: 'doom', title: 'DOOMSDAY DEVICE', good: 1, w: 5, desc: 'IF YOUR NATION DIES, IT TAKES THE WHOLE WORLD WITH IT.' },
    { id: 'sab', title: 'SABOTEUR', good: 1, w: 8, desc: 'YOUR AGENT BLOWS UP PART OF A RIVAL ARSENAL.' },
    { id: 'spy', title: 'MASTER SPY', good: 1, w: 8, desc: 'YOUR SPY SMUGGLES HOME A RIVAL WARHEAD.' },
    { id: 'dud', title: 'DUD WARHEAD', good: 0, w: 6, desc: 'YOUR BIGGEST WARHEAD TURNS OUT TO BE FULL OF CONFETTI.' },
    { id: 'oops', title: 'SILO ACCIDENT', good: 0, w: 5, desc: 'A JANITOR LEANED ON THE BIG RED BUTTON. -3M' },
    { id: 'defect', title: 'DEFECTORS', good: 1, w: 8, desc: 'A RIVAL SCIENTIST AND HIS VERY EXTENDED FAMILY MOVE IN. +3M' },
    { id: 'abm', title: 'STAR SHIELD', good: 1, w: 8, desc: 'BREAKTHROUGH! YOU GAIN 3 ANTI-MISSILES.' },
    { id: 'mega', title: 'MEGA WARHEAD', good: 1, w: 6, desc: 'YOUR MAD SCIENTISTS BUILT A 100 MEGATON MONSTER.' },
    { id: 'boom', title: 'BABY BOOM', good: 1, w: 7, desc: 'NOTHING GOOD ON TV TONIGHT. POPULATION +4M.' }
  ];
  function wpick(list) { let s = 0; for (const e of list) s += e.w; let r = rand() * s; for (const e of list) { r -= e.w; if (r <= 0) return e; } return list[0]; }

  // =====================================================================
  //  SMALL ICONS
  // =====================================================================
  const MIS_S = ['..n..', '.nnn.', '.bhb.', '.bhb.', '.sss.', '.bhb.', '.bhb.', '.bhb.', 'fbhbf', 'f.b.f'];
  const BOMB_S = ['.....n.....', '....bhb....', '....bhb....', '...bbhbb...', '.bbbbhbbbb.', 'bbbbbhbbbbb', '....bhb....', '....bhb....', '...bbhbb...', '....f.f....'];
  const SHIELD_S = ['.ddddd.', 'dhhwwhd', 'dhwwwhd', 'dhhwhhd', '.dhhhd.', '.dhhhd.', '..dhd..', '...d...'];
  const SKULL_S = ['.wwwww.', 'wwwwwww', 'wkkwkkw', 'wkkwkkw', 'wwwkwww', '.wwwww.', '.wkwkw.'];
  function icoMissile(x, i, X, Y) {
    const D = DELIV[i];
    if (D.kind === 'b') { spr(x, BOMB_S, { n: D.nose, b: D.col, h: lite(D.col, .5), f: '#ff9020' }, X - 3, Y); return; }
    spr(x, MIS_S, { n: D.nose, b: D.col, h: lite(D.col, .55), s: dark(D.col, .45), f: dark(D.col, .45) }, X, Y);
    if (i >= 2) { rect(x, D.nose, X + 1, Y + 6, 3, 1); }
    if (i === 3) { rect(x, dark(D.col, .45), X - 1, Y + 7, 1, 3); rect(x, dark(D.col, .45), X + 5, Y + 7, 1, 3); }
  }
  function icoWarhead(x, k, X, Y) {
    const c = WARH[k].col;
    rect(x, dark(c, .5), X + 1, Y + 7, 5, 2); rect(x, dark(c, .5), X + 3, Y + 6, 1, 3);
    ball(x, X + 3.5, Y + 4, 3, 3.6, rampOf(c, 4), '#100808');
    rect(x, '#101010', X + 3, Y + 3, 1, 1); rect(x, '#ffe040', X + 2, Y + 4, 3, 1);
  }
  function icoShield(x, X, Y) { spr(x, SHIELD_S, { d: '#103a6a', h: '#3a9aff', w: '#c8ecff' }, X, Y); }
  function icoSkull(x, X, Y) { spr(x, SKULL_S, { w: '#f0f0e0', k: '#200808' }, X, Y); }
  function icoSat(x, X, Y, t) {
    rect(x, '#2a3a8a', X, Y + 2, 3, 4); rect(x, '#5a7ae0', X, Y + 2, 3, 1); rect(x, '#2a3a8a', X + 7, Y + 2, 3, 4); rect(x, '#5a7ae0', X + 7, Y + 2, 3, 1);
    rect(x, '#808890', X + 3, Y + 3, 4, 1); rect(x, '#d8d8e0', X + 4, Y + 1, 2, 5); rect(x, '#ffffff', X + 4, Y + 1, 1, 2);
    rect(x, ((t || 0) >> 3) & 1 ? '#ff4040' : '#801010', X + 4, Y, 1, 1);
  }

  // =====================================================================
  //  BIG CARD ART (build window)
  // =====================================================================
  function bigMissile(x, i, cx, base) {
    const D = DELIV[i], h = [24, 28, 31, 35][i], w = i === 3 ? 9 : 7, top = base - h;
    const r = rampOf(D.col, 6);
    // fins
    for (const s of [-1, 1]) for (let k = 0; k < 6; k++) rect(x, dark(D.col, .5 - k * .03), cx + s * (w / 2 + k * .6) - (s < 0 ? 1 : 0), base - 8 + k, 1, 8 - k);
    // body: column shading
    for (let c = 0; c < w; c++) { const u = c / (w - 1), ri = Math.min(5, Math.max(0, Math.round(5 - Math.abs(u - .32) * 9))); rect(x, r[ri], cx - Math.floor(w / 2) + c, top + 6, 1, h - 6); }
    // nose cone
    for (let k = 0; k < 7; k++) { const ww = Math.max(1, Math.round((k + 1) / 7 * w)); const nr = rampOf(D.nose, 3); rect(x, nr[1], cx - Math.floor(ww / 2), top + k, ww, 1); rect(x, nr[2], cx - Math.floor(ww / 2), top + k, Math.max(1, Math.floor(ww / 3)), 1); }
    rect(x, dark(D.col, .55), cx - Math.floor(w / 2), top + 12, w, 1); rect(x, dark(D.col, .55), cx - Math.floor(w / 2), base - 10, w, 1);
    if (i === 0) for (let k = 0; k < 3; k++) rect(x, '#d02020', cx - 1, top + 15 + k * 3, 2, 1);
    if (i >= 2) rect(x, D.nose, cx - Math.floor(w / 2), top + 8, w, 2);
    // exhaust bell
    rect(x, '#3a3a44', cx - 2, base, 5, 2); rect(x, '#6a6a74', cx - 2, base, 2, 1);
  }
  function bigBomber(x, cx, cy) {
    const c = DELIV[4].col, r = rampOf(c, 5);
    // delta wings
    for (let k = 0; k < 14; k++) { const hw = 2 + k * 1.15; rect(x, k < 12 ? r[1] : r[0], cx - hw, cy - 4 + k, hw * 2, 1); rect(x, r[2], cx - hw + 1, cy - 4 + k, hw - 1, 1); }
    rect(x, r[3], cx - 15, cy + 9, 13, 1);
    // fuselage
    ell(x, '#101018', cx, cy, 3, 15); ell(x, r[2], cx, cy, 2.2, 14.2); ell(x, r[4], cx - .8, cy - 3, .9, 10);
    ell(x, '#2a3a5a', cx, cy - 10, 1.3, 2.2); rect(x, '#9ad4ff', cx - 1, cy - 11, 1, 1);
    // canards & tail
    rect(x, r[1], cx - 6, cy - 9, 12, 2); rect(x, r[3], cx - 6, cy - 9, 5, 1);
    rect(x, r[0], cx - 3, cy + 11, 1, 4); rect(x, r[0], cx + 2, cy + 11, 1, 4);
    rect(x, '#ff9020', cx - 2, cy + 15, 1, 2); rect(x, '#ff9020', cx + 1, cy + 15, 1, 2); rect(x, '#ffe080', cx - 2, cy + 15, 1, 1); rect(x, '#ffe080', cx + 1, cy + 15, 1, 1);
    rect(x, '#d02020', cx - 12, cy + 6, 2, 2); rect(x, '#ffffff', cx + 9, cy + 6, 2, 2);
  }
  function trefoil(x, cx, cy, r, c) {
    for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + k * TAU / 3; for (let rr = 1.5; rr <= r; rr += .5) for (let da = -.5; da <= .5; da += .12) rect(x, c, Math.round(cx + Math.cos(a + da) * rr), Math.round(cy + Math.sin(a + da) * rr), 1, 1); }
    disc(x, c, cx, cy, 1);
  }
  function bigWarhead(x, k, cx, cy) {
    const c = WARH[k].col, sz = [7, 8, 9.5, 11][k];
    rect(x, '#100808', cx - 6, cy + sz - 1, 13, 5); rect(x, dark(c, .45), cx - 5, cy + sz, 11, 3); rect(x, dark(c, .2), cx - 5, cy + sz, 4, 1);
    rect(x, '#100808', cx - 1, cy + sz - 4, 3, 6);
    ball(x, cx, cy, sz * .8, sz, rampOf(c, 6), '#100808');
    rect(x, '#ffe040', cx - Math.round(sz * .8) + 1, cy - 2, Math.round(sz * 1.6) - 1, 5); rect(x, '#b89a10', cx - Math.round(sz * .8) + 1, cy + 2, Math.round(sz * 1.6) - 1, 1);
    trefoil(x, cx, cy, 2.4, '#141414');
  }

  // =====================================================================
  //  SECRET CARD ART (48x36)
  // =====================================================================
  function secretArt(x, id, X, Y, t) {
    const f = (t >> 3) & 1;
    vgrad(x, X, Y, 48, 36, [[0, '#1a2a4a'], [1, '#05080f']]);
    const cx = X + 24, cy = Y + 18;
    switch (id) {
      case 'germ': case 'leak': {
        if (id === 'leak') { // flask
          ell(x, '#101418', cx, cy + 7, 11, 9); ell(x, '#8ad8ff', cx, cy + 7, 10, 8); ell(x, '#3ac850', cx, cy + 10, 9, 5); ell(x, '#8af070', cx - 3, cy + 9, 3, 1.4);
          rect(x, '#101418', cx - 4, Y + 4, 9, 10); rect(x, '#bfe8ff', cx - 3, Y + 4, 7, 10); rect(x, '#ffffff', cx - 2, Y + 5, 1, 8);
          for (let i = 0; i < 4; i++) disc(x, i & 1 ? '#5ae060' : '#3aa040', cx - 6 + i * 4 + (f ? 1 : 0), Y + 2 - (i % 2), 2.4);
        } else {
          for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + f * .15; line(x, '#2a8a2a', cx, cy, cx + Math.cos(a) * 17, cy + Math.sin(a) * 14, 2); disc(x, '#5ae05a', cx + Math.cos(a) * 17, cy + Math.sin(a) * 14, 1.6); }
          ball(x, cx, cy, 12, 11, ['#1a6a1a', '#2a9a2a', '#4ac84a', '#8af08a'], '#082008');
          ell(x, '#ffffff', cx - 5, cy - 2, 3, 3.5); ell(x, '#ffffff', cx + 4, cy - 2, 3, 3.5); rect(x, '#d01010', cx - 5, cy - 1, 2, 2); rect(x, '#d01010', cx + 4, cy - 1, 2, 2);
          line(x, '#082008', cx - 8, cy - 6, cx - 3, cy - 4); line(x, '#082008', cx + 7, cy - 6, cx + 2, cy - 4);
          mouthD(x, cx, cy + 4, 5, 3, { O: '#082008' }, { teeth: 1, gaps: 1 });
        }
        break;
      }
      case 'sat': {
        for (let i = 0; i < 12; i++) rect(x, '#ffffff', X + (hash(i, 1) % 48), Y + (hash(i, 2) % 36), 1, 1);
        rect(x, '#101018', cx - 22, cy - 5, 15, 9); rect(x, '#101018', cx + 7, cy - 5, 15, 9);
        for (let i = 0; i < 3; i++) { rect(x, '#2a4ab0', cx - 21 + i * 5, cy - 4, 4, 7); rect(x, '#2a4ab0', cx + 8 + i * 5, cy - 4, 4, 7); rect(x, '#7aa0ff', cx - 21 + i * 5, cy - 4, 4, 1); rect(x, '#7aa0ff', cx + 8 + i * 5, cy - 4, 4, 1); }
        rect(x, '#8a8a94', cx - 7, cy - 1, 14, 2);
        ball(x, cx, cy, 6, 6, ['#6a6a74', '#a0a0aa', '#d0d0d8', '#ffffff'], '#101018');
        rect(x, '#202028', cx + 2, cy + 4, 3, 3);
        if (f) { line(x, '#ff3030', cx + 4, cy + 6, X + 44, Y + 34, 1); line(x, '#ffb0b0', cx + 3, cy + 6, X + 43, Y + 34, 1); disc(x, '#ffffff', X + 43, Y + 33, 2); }
        break;
      }
      case 'doom': {
        rect(x, '#0a0a0a', cx - 17, cy - 13, 34, 29); vgrad(x, cx - 16, cy - 12, 32, 27, [[0, '#7a7a84'], [1, '#2a2a34']]);
        rect(x, '#a0a0aa', cx - 16, cy - 12, 32, 1);
        icoSkull(x, cx - 3, cy - 10);
        for (let i = 0; i < 5; i++) { rect(x, (i + (t >> 2)) % 5 === 0 ? '#ff2020' : i & 1 ? '#40ff40' : '#ffd020', cx - 14 + i * 6, cy - 1, 3, 2); }
        for (let i = 0; i < 2; i++) { disc(x, '#101010', cx - 8 + i * 16, cy + 8, 4.4); disc(x, '#e8e8d8', cx - 8 + i * 16, cy + 8, 3.4); const a = t * .1 * (i ? -1 : 1); line(x, '#d01010', cx - 8 + i * 16, cy + 8, cx - 8 + i * 16 + Math.cos(a) * 3, cy + 8 + Math.sin(a) * 3); }
        rect(x, '#d01010', cx - 2, cy + 5, 5, 6); rect(x, '#ff6060', cx - 2, cy + 5, 5, 1);
        break;
      }
      case 'sab': {
        for (let i = 0; i < 4; i++) { rect(x, '#3a0808', cx - 10 + i * 5, cy - 6, 5, 20); rect(x, '#d02020', cx - 9 + i * 5, cy - 6, 3, 20); rect(x, '#ff6060', cx - 9 + i * 5, cy - 6, 1, 20); }
        rect(x, '#2a2a2a', cx - 11, cy + 2, 22, 3); rect(x, '#6a6a6a', cx - 11, cy + 2, 22, 1);
        line(x, '#c8b890', cx, cy - 6, cx + 6, cy - 14); line(x, '#c8b890', cx + 6, cy - 14, cx + 10, cy - 12);
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * .3; rect(x, i & 1 ? '#ffffff' : '#ffd020', Math.round(cx + 10 + Math.cos(a) * (2 + f)), Math.round(cy - 13 + Math.sin(a) * (2 + f)), 1, 1); }
        break;
      }
      case 'spy': {
        // trenchcoat & fedora silhouette
        ell(x, '#3a3020', cx, cy + 14, 14, 10); ell(x, '#6a5634', cx - 2, cy + 13, 11, 8); line(x, '#2a2214', cx, cy + 6, cx, cy + 18);
        ell(x, '#100808', cx, cy - 1, 8, 8); ell(x, '#d8a880', cx, cy, 6, 7);
        rect(x, '#100808', cx - 13, cy - 7, 26, 3); rect(x, '#3a3a3a', cx - 12, cy - 7, 24, 1);
        rect(x, '#100808', cx - 7, cy - 15, 14, 9); rect(x, '#4a4a4a', cx - 6, cy - 14, 12, 7); rect(x, '#202020', cx - 6, cy - 9, 12, 2);
        rect(x, '#100808', cx - 6, cy - 2, 12, 3); rect(x, '#ffffff', cx - 4 + f, cy - 1, 2, 1); rect(x, '#ffffff', cx + 2 + f, cy - 1, 2, 1);
        rect(x, '#3a3020', cx - 7, cy + 4, 14, 3);
        break;
      }
      case 'dud': {
        bigWarhead(x, 2, cx - 4, cy + 2);
        rect(x, '#101010', cx + 6, cy - 12, 1, 14); rect(x, '#ffffff', cx + 7, cy - 12, 12, 7); rect(x, '#101010', cx + 7, cy - 12, 12, 1);
        text(x, 'POP', cx + 8, cy - 10, '#d01010', { adv: 4 });
        for (let i = 0; i < 10; i++) rect(x, ['#ff5050', '#50ff50', '#5080ff', '#ffff50'][i & 3], X + (hash(i, t >> 4) % 48), Y + 2 + ((hash(i, 9) + t) % 30), 1, 1);
        break;
      }
      case 'oops': {
        rect(x, '#5a5a5a', cx - 12, cy + 4, 24, 10); rect(x, '#8a8a8a', cx - 12, cy + 4, 24, 1); rect(x, '#202020', cx - 5, cy + 4, 10, 3);
        ell(x, '#ff6010', cx, cy - 3 - f, 10, 9); ell(x, '#ffd030', cx, cy - 3 - f, 7, 6); ell(x, '#ffffff', cx, cy - 3 - f, 3, 3);
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; rect(x, '#ffd030', Math.round(cx + Math.cos(a) * 13), Math.round(cy - 3 + Math.sin(a) * 11), 2, 2); }
        disc(x, '#d02020', cx + 15, cy + 9, 3); rect(x, '#ffffff', cx + 14, cy + 8, 1, 1);
        break;
      }
      case 'defect': {
        for (let i = 0; i < 5; i++) {
          const px = X + 6 + i * 9, py = cy + 4 + ((i + f) & 1);
          disc(x, '#101010', px, py - 8, 3); disc(x, ['#f0c090', '#c08060', '#f4d0b0', '#8a5a3a', '#e0b080'][i], px, py - 8, 2.2);
          rect(x, '#101010', px - 3, py - 5, 7, 9); rect(x, ['#d03030', '#3070d0', '#30a040', '#d0a030', '#9040c0'][i], px - 2, py - 5, 5, 8);
          rect(x, '#2a1a10', px - 1, py + 4, 1, 4); rect(x, '#2a1a10', px + 1, py + 4, 1, 4);
          rect(x, '#5a3a1a', px + 3, py, 4, 4); rect(x, '#8a5a2a', px + 3, py, 4, 1);
        }
        break;
      }
      case 'abm': {
        for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + t * .03; line(x, i & 1 ? '#3a7aff' : '#8ac8ff', cx, cy, cx + Math.cos(a) * 24, cy + Math.sin(a) * 18); }
        spr(x, SHIELD_S.map(r => r), { d: '#103a6a', h: '#3a9aff', w: '#c8ecff' }, cx - 3, cy - 4);
        ball(x, cx, cy, 10, 12, ['#0a3070', '#1a5ac0', '#3a8aff', '#9ad0ff'], '#000818');
        trefoil(x, cx, cy, 4, '#ffffff');
        break;
      }
      case 'mega': bigWarhead(x, 3, cx, cy - 1); text(x, '100', cx, Y + 28, '#ffe040', { center: true, outline: '#000000' }); break;
      case 'boom': {
        // crib with babies
        rect(x, '#5a3010', cx - 18, cy + 2, 36, 12); rect(x, '#c08040', cx - 17, cy + 3, 34, 10);
        for (let i = 0; i < 8; i++) rect(x, '#8a5020', cx - 15 + i * 4, cy + 3, 1, 10);
        for (let i = 0; i < 4; i++) { const px = cx - 12 + i * 8, py = cy - 2 + ((i + f) & 1); disc(x, '#3a2010', px, py, 4); disc(x, '#ffd0b0', px, py, 3.2); rect(x, '#101010', px - 1, py - 1, 1, 1); rect(x, '#101010', px + 1, py - 1, 1, 1); rect(x, '#ff7080', px, py + 1, 1, 1); }
        for (let i = 0; i < 3; i++) { disc(x, '#ff5070', X + 8 + i * 16, Y + 5 + ((i + f) & 1), 2); }
        break;
      }
    }
  }

  // =====================================================================
  //  AMIGA WINDOW (Workbench style)
  // =====================================================================
  function amigaWin(x, X, Y, w, h, title, t) {
    rect(x, '#000000', X + 3, Y + 3, w, h);
    rect(x, '#000022', X, Y, w, h); rect(x, '#ffffff', X, Y, w - 1, h - 1); rect(x, '#0055aa', X + 1, Y + 1, w - 3, h - 3);
    vgrad(x, X + 2, Y + 11, w - 5, h - 14, [[0, '#0a62b8'], [1, '#003a80']]);
    // title bar with drag stripes
    rect(x, '#ffffff', X + 1, Y + 1, w - 3, 10);
    for (let i = 0; i < 4; i++) rect(x, '#0055aa', X + 12, Y + 3 + i * 2, w - 36, 1);
    rect(x, '#ff8800', X + 12, Y + 2, w - 36, 8); for (let i = 0; i < 4; i++) rect(x, '#cc5500', X + 12, Y + 3 + i * 2, w - 36, 1);
    // close gadget
    rect(x, '#000022', X + 2, Y + 2, 8, 8); rect(x, '#ffffff', X + 3, Y + 3, 6, 6); rect(x, '#000022', X + 5, Y + 5, 2, 2);
    // depth gadgets
    rect(x, '#000022', X + w - 23, Y + 2, 20, 8); rect(x, '#ffffff', X + w - 22, Y + 3, 18, 6);
    rect(x, '#000022', X + w - 21, Y + 4, 6, 4); rect(x, '#ff8800', X + w - 19, Y + 5, 6, 3); rect(x, '#000022', X + w - 12, Y + 4, 6, 4); rect(x, '#ffffff', X + w - 11, Y + 5, 4, 2); rect(x, '#0055aa', X + w - 9, Y + 6, 4, 2);
    const tw2 = tw(title); rect(x, '#ff8800', X + Math.round(w / 2 - tw2 / 2) - 3, Y + 2, tw2 + 6, 8);
    text(x, title, X + w / 2, Y + 3, '#000022', { center: true });
  }

  // =====================================================================
  //  ISLANDS (close-up map viewport), CITIES, LANDMARKS
  // =====================================================================
  const LANDP = ['#16501a', '#226e22', '#2e8c2a', '#48a83a', '#6cc450', '#98dc70'];
  const SEAP = ['#1c1270', '#261a86', '#30229c', '#3a2cb0'];
  function makeIsland(seed) {
    const CW = VW, CH = VH, ox = CW / 2, oy = CH / 2 + 4, rx = 45, ry = 36;
    const s1 = seed * 1.7, s2 = seed * 2.3 + 1, s3 = seed * .9 + 2, s4 = seed * 3.1 + 3;
    const islets = [];
    for (let i = 0; i < 3; i++) { const a = (i / 3 + rand() * .2) * TAU; islets.push([ox + Math.cos(a) * CW * .56, oy + Math.sin(a) * CH * .56, 6 + rand() * 8, 5 + rand() * 6, rand() * 9]); }
    const D = new Float32Array(CW * CH);
    for (let py = 0; py < CH; py++) for (let px = 0; px < CW; px++) {
      const dx = (px + .5 - ox) / rx, dy = (py + .5 - oy) / ry, a = Math.atan2(dy, dx);
      const rr = 1 + .13 * Math.sin(3 * a + s1) + .08 * Math.sin(5 * a + s2) + .05 * Math.sin(7 * a + s4) + .04 * Math.sin(2 * a + s3);
      let v = Math.sqrt(dx * dx + dy * dy) / rr + .035 * Math.sin(px * .7 + s1) * Math.sin(py * .6 + s2);
      for (const it of islets) { const ex = (px - it[0]) / it[2], ey = (py - it[1]) / it[3], aa = Math.atan2(ey, ex); v = Math.min(v, Math.sqrt(ex * ex + ey * ey) / (1 + .2 * Math.sin(3 * aa + it[4]))); }
      D[py * CW + px] = v;
    }
    const d = (px, py) => (px < 0 || py < 0 || px >= CW || py >= CH) ? 9 : D[py * CW + px];
    const cv = mk(CW, CH), x = cv.getContext('2d'), waves = [];
    for (let py = 0; py < CH; py++) for (let px = 0; px < CW; px++) {
      const v = d(px, py); let col;
      if (v < 1) {
        if (v > .9) col = (v - .9) * 10 > bay(px, py) ? '#58b048' : '#8ad868';
        else {
          const n = Math.sin(px * .31 + s1) * Math.sin(py * .27 + s2) + Math.sin(px * .9 + py * .4 + s3) * .4;
          let lt = .55 - .3 * ((px - ox) / rx * .5 + (py - oy) / ry * .6) + n * .22 - v * .12;
          lt = Math.max(0, Math.min(.999, lt)) * (LANDP.length - 1);
          const i0 = Math.floor(lt); col = LANDP[Math.min(LANDP.length - 1, i0 + ((lt - i0) > bay(px, py) ? 1 : 0))];
          if ((hash(px, py + seed * 7 | 0) & 31) === 0) col = '#10401a';
        }
      } else if (v < 1.22) col = (v - 1) / .22 > bay(px, py) ? '#5a4ad8' : '#7a6cf0';
      else {
        const n = Math.sin(px * .09 + s1) * Math.sin(py * .11 + s2) + Math.sin(px * .23 - py * .17 + s3) * .5;
        let lt = Math.max(0, Math.min(.999, .55 + n * .35)) * (SEAP.length - 1); const i0 = Math.floor(lt);
        col = SEAP[i0 + ((lt - i0) > bay(px, py) ? 1 : 0)];
        if (waves.length < 120 && (hash(px, py * 3 + 1) % 97) === 0) waves.push(px, py);
      }
      x.fillStyle = col; x.fillRect(px, py, 1, 1);
    }
    // city sites
    const sites = [];
    const free = (px, py, dx, dy) => !sites.some(s => Math.abs(s.x - px) < dx && Math.abs(s.y - py) < dy);
    for (let tries = 0; tries < 900 && sites.length < 5; tries++) {
      const px = 12 + Math.floor(rand() * (CW - 24)), py = 12 + Math.floor(rand() * (CH - 20));
      if (d(px, py) > .68 || d(px - 8, py) > .9 || d(px + 14, py) > .95) continue;
      if (!free(px, py, 30, 17)) continue;
      sites.push({ x: px, y: py });
    }
    for (let i = 0; sites.length < 5 && i < 60; i++) { const px = ox - 30 + (i % 6) * 12, py = oy - 18 + Math.floor(i / 6) * 9; if (d(px, py) < .85 && free(px, py, 14, 9)) sites.push({ x: px, y: py }); }
    sites.sort((a, b) => (Math.abs(a.x - ox) + Math.abs(a.y - oy) * 1.5) - (Math.abs(b.x - ox) + Math.abs(b.y - oy) * 1.5));
    let radar = null;
    for (let tries = 0; tries < 400 && !radar; tries++) { const px = 10 + Math.floor(rand() * (CW - 20)), py = 10 + Math.floor(rand() * (CH - 16)); if (d(px, py) < .75 && free(px, py, 22, 16)) radar = { x: px, y: py }; }
    if (!radar) radar = { x: Math.round(ox), y: Math.round(oy - 14) };
    const cities = sites.map((s, i) => {
      const bld = [], hs = [];
      if (i === 0) { for (let k = 0; k < 3; k++) bld.push({ dx: 6 + k * 5, w: 4, h: 8 + (hash(k, seed | 0) % 6) + (k === 1 ? 3 : 0), col: ['#c8ccd8', '#a8b0c8', '#e0e0e8'][k], s: hash(k, i) }); }
      else { const n = 3 + (hash(i, seed * 5 | 0) % 3); for (let k = 0; k < n; k++) hs.push({ dx: -8 + (k % 3) * 7 + ((k / 3 | 0) & 1) * 3, dy: (k / 3 | 0) * 5 - 2, roof: ['#d02a1a', '#c84a20', '#b02030'][hash(k, i) % 3] }); hs.sort((a, b) => a.dy - b.dy); }
      const right = i === 0 ? 30 : Math.max(...hs.map(h => h.dx)) + 9;
      return { x: s.x, y: s.y, init: 8, pop: 8, bld, hs, cap: i === 0, burn: 0, lx: VX + s.x + right };
    });
    // a few tree clumps
    for (let i = 0; i < 30; i++) {
      const px = 6 + Math.floor(rand() * (CW - 12)), py = 4 + Math.floor(rand() * (CH - 10));
      if (d(px, py) > .85 || cities.some(c => Math.abs(c.x - px) < 16 && Math.abs(c.y - py) < 10) || (Math.abs(radar.x - px) < 8 && Math.abs(radar.y - py) < 8)) continue;
      ell(x, '#0c3a10', px + .5, py + 1, 2.4, 1.8); ell(x, '#1e6a1e', px, py, 2, 1.7); rect(x, '#5aaa40', px - 1, py - 1, 1, 1);
    }
    cities.sort((a, b) => a.y - b.y);
    return { cv, x, cities, radar, waves, ox, oy, CW, CH, D };
  }
  function scorch(isl, px, py, r) {
    const x = isl.x;
    for (let yy = -r; yy <= r; yy++) for (let xx = -r * 1.6; xx <= r * 1.6; xx++) {
      const X = Math.round(px + xx), Y = Math.round(py + yy); if (X < 0 || Y < 0 || X >= isl.CW || Y >= isl.CH) continue;
      if (isl.D[Y * isl.CW + X] >= 1) continue;
      const dd = Math.sqrt((xx / 1.6) * (xx / 1.6) + yy * yy) / r;
      if (dd < 1 && dd < bay(X, Y) * .6 + .5) { x.fillStyle = dd < .45 ? '#1a120c' : dd < .75 ? '#3a2a1a' : '#5a4a28'; x.fillRect(X, Y, 1, 1); }
    }
  }
  function house(x, gx, gy, roof) {
    rect(x, '#101018', gx - 1, gy - 6, 8, 7);
    rect(x, '#f4f4f0', gx, gy - 3, 6, 3); rect(x, '#b8b8c8', gx + 5, gy - 3, 1, 3);
    rect(x, roof, gx, gy - 5, 6, 2); rect(x, lite(roof, .35), gx, gy - 5, 6, 1); rect(x, '#101018', gx - 1, gy - 6, 1, 1); rect(x, '#101018', gx + 6, gy - 6, 1, 1);
    rect(x, '#3050a0', gx + 1, gy - 2, 1, 1); rect(x, '#3050a0', gx + 3, gy - 2, 1, 1); rect(x, '#6a3a1a', gx + 4, gy - 2, 1, 2);
  }
  function radarIcon(x, gx, gy, t, dead) {
    if (dead) { rect(x, '#2a2420', gx - 3, gy - 2, 7, 2); rect(x, '#5a504a', gx - 2, gy - 3, 4, 1); return; }
    for (let r = 0; r < 3; r++) { const rr = 4 + ((t * .15 + r * 4) % 12); for (let a = 0; a < 20; a++) { const an = Math.PI * (1.1 + a / 19 * .8); rect(x, '#ffffff', gx + Math.cos(an) * rr, gy - 8 + Math.sin(an) * rr * .8, 1, 1); } }
    rect(x, '#101018', gx - 3, gy - 2, 7, 3); rect(x, '#d8d8e0', gx - 2, gy - 1, 5, 1);
    line(x, '#101018', gx, gy - 2, gx, gy - 7); line(x, '#e8e8f0', gx, gy - 2, gx, gy - 7);
    ell(x, '#101018', gx, gy - 8, 3.4, 2.4); ell(x, '#ffffff', gx, gy - 8.4, 2.6, 1.6); rect(x, '#ff3030', gx, gy - 9, 1, 1);
  }
  function building(x, b, gx, gy, hh, lit) {
    const X = gx + b.dx, Y = gy - hh;
    rect(x, '#101018', X - 1, Y - 1, b.w + 3, hh + 1);
    rect(x, b.col, X, Y, b.w, hh); rect(x, dark(b.col, .38), X + b.w, Y, 1, hh); rect(x, lite(b.col, .4), X, Y, b.w, 1); rect(x, lite(b.col, .15), X, Y, 1, hh);
    for (let wy = Y + 2; wy < gy - 1; wy += 2) for (let wx = X + 1; wx < X + b.w - 0; wx += 2) rect(x, lit && (hash(wx * 7 + b.s, wy) % 3 === 0) ? '#ffe890' : dark(b.col, .5), wx, wy, 1, 1);
    if (b.h > 12 && hh > 10) rect(x, '#d03030', X + Math.floor(b.w / 2), Y - 2, 1, 2);
  }
  function rubble(x, gx, gy, w, burn, t, k) {
    rect(x, '#2a2420', gx - 1, gy - 2, w + 2, 2); rect(x, '#5a504a', gx, gy - 3, w, 1); rect(x, '#3a322c', gx + 1, gy - 4, Math.max(1, w - 2), 1);
    rect(x, '#7a6a5a', gx + (k & 1), gy - 3, 1, 1);
    if (burn > 0 && ((t >> 2) + k) & 1) { rect(x, '#ff7020', gx + 1 + ((t >> 3) + k) % Math.max(1, w), gy - 4, 1, 2); rect(x, '#ffd040', gx + 1 + ((t >> 3) + k) % Math.max(1, w), gy - 3, 1, 1); }
  }
  function landmark(x, key, gx, gy, ruined, col, t) {
    if (ruined) { rubble(x, gx - 7, gy, 14, 1, t, 3); rect(x, '#8a8478', gx - 3, gy - 7, 2, 4); rect(x, '#6a645a', gx + 2, gy - 5, 2, 2); return; }
    const O = '#101018';
    switch (key) {
      case 'raygun': // capitol dome
        rect(x, O, gx - 8, gy - 7, 17, 7); rect(x, '#f0f0f4', gx - 7, gy - 6, 15, 6); for (let i = -6; i <= 6; i += 2) rect(x, '#b8b8c4', gx + i, gy - 5, 1, 5);
        rect(x, O, gx - 4, gy - 10, 9, 3); rect(x, '#e0e0e8', gx - 3, gy - 9, 7, 2);
        ell(x, O, gx + .5, gy - 11, 5, 5); ell(x, '#e8e8f0', gx + .5, gy - 11, 4, 4); ell(x, '#ffffff', gx - .5, gy - 12, 1.6, 2);
        rect(x, '#d0d0d8', gx, gy - 17, 1, 3); rect(x, '#ffffff', gx, gy - 18, 1, 1); break;
      case 'gorby': // onion domes
        rect(x, O, gx - 7, gy - 8, 15, 8); rect(x, '#c83a2a', gx - 6, gy - 7, 13, 7); for (let i = -5; i <= 5; i += 3) rect(x, '#ffe0a0', gx + i, gy - 5, 1, 2);
        for (const [dx, c, s] of [[-4, '#30a050', 3], [4, '#3060d0', 3], [0, '#e8b020', 4]]) { const by = gy - 8 - (s === 4 ? 4 : 0); rect(x, '#d8d0c0', gx + dx - 1, by - 2, 3, 3); ell(x, O, gx + dx + .5, by - 4, s, s); ell(x, c, gx + dx + .5, by - 4, s - 1, s - 1); rect(x, lite(c, .5), gx + dx - 1, by - 6, 1, 2); rect(x, O, gx + dx, by - 9 - (s - 3) * 2, 1, 3); }
        break;
      case 'castro': // fort + palms
        rect(x, O, gx - 6, gy - 6, 12, 6); rect(x, '#e8d8b0', gx - 5, gy - 5, 10, 5); for (let i = -5; i < 5; i += 2) rect(x, '#e8d8b0', gx + i, gy - 7, 1, 1); rect(x, '#5a3a20', gx - 1, gy - 3, 2, 3);
        for (const dx of [-9, 8]) { line(x, '#7a5a30', gx + dx, gy, gx + dx + 2, gy - 12); for (let k = 0; k < 5; k++) { const a = Math.PI * (1.05 + k * .22) + Math.sin(t * .05 + k) * .05; line(x, k & 1 ? '#2a8a2a' : '#4ab040', gx + dx + 2, gy - 12, gx + dx + 2 + Math.cos(a) * 6, gy - 12 + Math.sin(a) * 4 + 3); } }
        break;
      case 'kooks': // mosque
        rect(x, O, gx - 7, gy - 7, 15, 7); rect(x, '#e8dcc0', gx - 6, gy - 6, 13, 6); rect(x, '#3a5ab0', gx - 1, gy - 4, 3, 4);
        ell(x, O, gx + .5, gy - 9, 5, 5); ell(x, '#2ab0a8', gx + .5, gy - 9, 4, 4); ell(x, '#9af0e8', gx - .5, gy - 10, 1.4, 1.6); rect(x, '#ffd040', gx, gy - 16, 1, 3);
        for (const dx of [-9, 9]) { rect(x, O, gx + dx - 1, gy - 15, 3, 15); rect(x, '#f0e8d8', gx + dx, gy - 14, 1, 14); rect(x, '#2ab0a8', gx + dx - 1, gy - 16, 3, 2); }
        break;
      case 'mao': // pagoda
        for (let k = 0; k < 3; k++) { const yy = gy - 4 - k * 5, w = 9 - k * 2; rect(x, O, gx - w / 2 - 1, yy, w + 2, 4); rect(x, '#c82a2a', gx - w / 2, yy + 1, w, 3); rect(x, O, gx - w / 2 - 3, yy - 1, w + 6, 2); rect(x, '#2a7a4a', gx - w / 2 - 2, yy - 1, w + 4, 1); rect(x, '#ffd040', gx - w / 2 - 3, yy, 1, 1); rect(x, '#ffd040', gx + w / 2 + 2, yy, 1, 1); }
        rect(x, '#ffd040', gx, gy - 21, 1, 4); break;
      case 'ghanji': // taj
        rect(x, O, gx - 8, gy - 7, 17, 7); rect(x, '#f4f0f4', gx - 7, gy - 6, 15, 6); rect(x, '#c8c0d8', gx - 1, gy - 5, 3, 5);
        ell(x, O, gx + .5, gy - 11, 5.4, 6); ell(x, '#ffffff', gx + .5, gy - 11, 4.4, 5); ell(x, '#d8d0e8', gx + 2, gy - 10, 2, 3.4); rect(x, '#ffd040', gx, gy - 19, 1, 3);
        for (const dx of [-8, 8]) { rect(x, O, gx + dx - 1, gy - 13, 3, 13); rect(x, '#f8f4f8', gx + dx, gy - 12, 1, 12); rect(x, '#ffffff', gx + dx - 1, gy - 14, 3, 2); }
        break;
      case 'farter': // giant peanut statue
        rect(x, O, gx - 5, gy - 4, 11, 4); rect(x, '#a8a8b0', gx - 4, gy - 3, 9, 3);
        ell(x, O, gx + .5, gy - 8, 4.4, 5); ell(x, O, gx + .5, gy - 15, 4, 4.6); ell(x, '#d8a860', gx + .5, gy - 8, 3.4, 4); ell(x, '#d8a860', gx + .5, gy - 15, 3, 3.6); rect(x, '#b08040', gx - 2, gy - 11, 5, 1);
        rect(x, '#f0d090', gx - 1, gy - 16, 1, 2); rect(x, '#f0d090', gx - 1, gy - 9, 1, 2); rect(x, O, gx - 1, gy - 14, 1, 1); rect(x, O, gx + 2, gy - 14, 1, 1); rect(x, O, gx, gy - 12, 2, 1);
        break;
      case 'maggie': // clock tower
        rect(x, O, gx - 4, gy - 22, 9, 22); rect(x, '#d8c088', gx - 3, gy - 21, 7, 21); rect(x, '#a89058', gx + 2, gy - 21, 2, 21);
        rect(x, '#ffffff', gx - 2, gy - 17, 5, 5); rect(x, O, gx, gy - 16, 1, 2); rect(x, O, gx, gy - 15, 2, 1);
        rect(x, O, gx - 2, gy - 25, 5, 3); rect(x, '#3a6a4a', gx - 1, gy - 25, 3, 3); rect(x, '#3a6a4a', gx, gy - 28, 1, 3);
        rect(x, O, gx - 10, gy - 8, 7, 8); rect(x, '#d8c088', gx - 9, gy - 7, 5, 7); break;
    }
  }

  // =====================================================================
  //  MUSHROOM CLOUD
  // =====================================================================
  const HOT = ['#a02000', '#ff5a00', '#ffa020', '#ffe070', '#ffffff'];
  const COOL = ['#3a2c28', '#5a4a40', '#7a6858', '#a08c7a', '#c8b8a8'];
  function newBoom(x, gy, sc) {
    const puffs = [];
    for (let i = 0; i < 11; i++) { const a = i / 11 * TAU + rand() * .3; puffs.push([Math.cos(a) * (.55 + rand() * .3), Math.sin(a) * .32 - .1 - rand() * .15, .42 + rand() * .22]); }
    puffs.push([0, -.3, .55]); puffs.sort((a, b) => a[1] - b[1]);
    return { x, gy, sc, age: 0, puffs };
  }
  function heatRamp(h) { return HOT.map((c, i) => mix(c, COOL[i], h)); }
  function mushroom(x, m) {
    const a = m.age, sc = m.sc, p = ease(a / 80), heat = Math.min(1, Math.max(0, (a - 20) / 120));
    const R = heatRamp(heat), O = mix('#4a1000', '#141010', heat);
    if (a < 10) { disc(x, '#ffffff', m.x, m.gy - 3 * sc, (3 + a * 1.2) * sc); disc(x, '#fff8c0', m.x, m.gy - 3 * sc, (2 + a) * sc); return; }
    const capY = m.gy - (8 + 42 * p) * sc, capR = (7 + 15 * p) * sc;
    // dust skirt at base
    const br = (8 + 18 * ease(a / 120)) * sc;
    ell(x, O, m.x, m.gy, br + 1, br * .3 + 1); ell(x, R[1], m.x, m.gy, br, br * .3); ell(x, R[2], m.x - br * .2, m.gy - 1, br * .7, br * .2); ell(x, R[3], m.x - br * .3, m.gy - 1, br * .3, br * .1);
    // stem
    const sw = (3 + 2.5 * p) * sc;
    for (let y = Math.round(capY); y < m.gy; y++) {
      const u = (y - capY) / (m.gy - capY), ww = sw * (1 + (1 - u) * .2 + u * u * .9) + Math.sin(y * .7 + a * .2) * .5;
      rect(x, O, m.x - ww - 1, y, ww * 2 + 2, 1); rect(x, R[1], m.x - ww, y, ww * 2, 1); rect(x, R[2], m.x - ww * .8, y, ww * 1.1, 1); rect(x, R[3], m.x - ww * .6, y, ww * .4, 1);
    }
    // condensation ring
    if (p > .55) { const ry = capY + (m.gy - capY) * .42, rr = capR * .75; ell(x, O, m.x, ry, rr + 1, rr * .2 + 1); ell(x, mix('#ffffff', COOL[3], heat * .5), m.x, ry, rr, rr * .2); ell(x, m.gy > 0 ? R[1] : R[1], m.x, ry + .5, sw + 1, rr * .12); }
    // cap: puffs, outline pass then shading passes
    for (const q of m.puffs) ell(x, O, m.x + q[0] * capR, capY + q[1] * capR, q[2] * capR + 1, q[2] * capR * .85 + 1);
    for (let k = 0; k < 5; k++) for (const q of m.puffs) {
      const r = q[2] * capR * (1 - k * .17), off = k * q[2] * capR * .14;
      ell(x, R[k], m.x + q[0] * capR - off, capY + q[1] * capR - off, r, r * .85);
    }
    // glowing underside while hot
    if (heat < .7) ell(x, mix('#ff3000', R[1], heat), m.x, capY + capR * .3, capR * .6, capR * .14);
  }

  // =====================================================================
  //  GAME
  // =====================================================================
  const ACTIONS = ['BUILD', 'PROPAGANDA', 'DEFEND', 'SECRET', 'ATTACK!'];
  const ORDER = [0, 1, 2, 4, 3];
  const CORNER = { 1: [1, 1], 2: [255, 1], 3: [1, 185], 4: [255, 185] };
  const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
  const TUNE = [
    [69, 72, 76, 81, 79, 76, 74, 76, 72, 74, 76, 79, 76, 74, 72, 74],
    [69, 72, 76, 81, 83, 81, 79, 76, 77, 76, 74, 72, 74, 71, 67, 71],
    [77, 76, 74, 72, 74, 76, 72, 69, 67, 69, 72, 74, 76, 74, 72, 71],
    [69, 0, 69, 72, 76, 0, 76, 79, 81, 79, 76, 74, 72, 71, 69, 0]
  ];
  const BASS = [[45, 45, 52, 45, 48, 48, 55, 48], [45, 45, 52, 45, 41, 41, 43, 43], [41, 41, 48, 41, 43, 43, 50, 47], [45, 52, 45, 52, 40, 47, 45, 45]];
  const fmt = p => (Math.max(0, Math.round(p * 10) / 10)).toFixed(1) + 'M';
  const pad = (n, k) => String(Math.max(0, Math.floor(n))).padStart(k, '0');

  ArcadeRegistry.register({
    id: 'nuclearwaramiga',
    title: 'Nuclear War v3',
    year: 1989,
    maker: 'New World Computing',
    width: W, height: H,
    vector: false,
    pointer: true,
    controls: 'Mouse or Arrows: choose \u00b7 Space/Enter: OK \u00b7 X: back',
    marquee: { bg: '#001a44', fg: '#ff8800', accent: '#00d0ff' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(50000);
      let mode = 'title', T = 0, frame = 0, g = null, over = null, sel = 0, selT = 0;
      let lastMX = -1, lastMY = -1, mouseMv = false;
      let musicAt = 0, musicN = 0;

      // ---------- coin-op ----------
      let lastCred = api.credits, coinFlash = 0;
      function pollCoins() {
        const c = api.credits;
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
        move() { au.tone(1200, .025, { type: 'square', vol: .035 }); },
        ok() { au.tone(660, .05, { type: 'square', vol: .06 }); au.tone(990, .08, { type: 'square', vol: .06, delay: .05 }); },
        back() { au.tone(440, .05, { type: 'square', vol: .05 }); au.tone(294, .08, { type: 'square', vol: .05, delay: .05 }); },
        buzz() { au.tone(110, .16, { type: 'square', vol: .08 }); },
        launch() { au.noise(1.5, { freq: 400, slideTo: 4200, vol: .22, type: 'bandpass' }); au.noise(.5, { freq: 900, vol: .18 }); au.tone(90, 1.2, { type: 'sawtooth', slideTo: 600, vol: .05 }); },
        bomber() { au.tone(70, 1.8, { type: 'sawtooth', slideTo: 90, vol: .06 }); au.noise(1.8, { freq: 300, vol: .1 }); },
        siren() { for (let i = 0; i < 3; i++) { au.tone(480, .5, { type: 'sine', slideTo: 980, vol: .09, delay: i * 1 }); au.tone(980, .5, { type: 'sine', slideTo: 480, vol: .09, delay: i * 1 + .5 }); } },
        whistle() { au.tone(2400, .7, { type: 'sine', slideTo: 260, vol: .06 }); },
        boom(mt) { au.noise(2.2 + mt / 50, { freq: 1800, slideTo: 40, vol: .55 }); au.tone(70, 1.8, { type: 'sine', slideTo: 20, vol: .45 }); au.noise(.3, { freq: 6000, vol: .3, type: 'highpass' }); au.noise(1.2, { freq: 200, vol: .3, delay: .25 }); },
        pop() { au.noise(.35, { freq: 3200, slideTo: 300, vol: .25 }); au.tone(800, .14, { type: 'square', slideTo: 120, vol: .05 }); },
        zap() { au.tone(2400, .25, { type: 'sawtooth', slideTo: 300, vol: .07 }); au.tone(1800, .25, { type: 'square', slideTo: 600, vol: .04, delay: .05 }); },
        jingle() { au.melody([[784, .1], [659, .1], [784, .1], [1047, .2], [988, .1], [880, .1], [784, .1], [880, .1], [1047, .3]], { type: 'square', vol: .07 }); au.melody([[262, .2], [330, .2], [392, .2], [523, .2], [392, .2], [523, .4]], { type: 'triangle', vol: .12 }); },
        build() { for (let i = 0; i < 4; i++) { au.tone(180 + i * 60, .05, { type: 'square', vol: .07, delay: i * .09 }); au.noise(.05, { freq: 3000, vol: .1, delay: i * .09 + .04, type: 'highpass' }); } au.tone(880, .14, { type: 'square', vol: .06, delay: .4 }); },
        shield() { au.tone(300, .6, { type: 'triangle', slideTo: 1400, vol: .1 }); au.tone(310, .6, { type: 'sine', slideTo: 1420, vol: .06, delay: .05 }); },
        germ() { for (let i = 0; i < 7; i++) au.tone(160 + (i & 1) * 70, .13, { type: 'sine', vol: .1, delay: i * .1, slideTo: 110 }); },
        secret() { au.melody([[392, .12], [370, .12], [392, .12], [311, .4], [0, .1], [294, .12], [311, .5]], { type: 'square', vol: .06 }); },
        turn() { au.tone(784, .06, { type: 'square', vol: .06 }); au.tone(1175, .1, { type: 'square', vol: .06, delay: .07 }); },
        banner() { au.tone(392, .12, { type: 'sawtooth', vol: .06 }); au.tone(523, .25, { type: 'sawtooth', vol: .06, delay: .1 }); },
        fanfare() { au.melody([[523, .15], [523, .1], [523, .1], [659, .3], [523, .15], [659, .15], [784, .6]], { type: 'square', vol: .08 }); au.melody([[131, .35], [165, .35], [196, .7]], { type: 'triangle', vol: .12 }); },
        dirge() { au.melody([[392, .45], [370, .45], [349, .45], [330, 1]], { type: 'triangle', vol: .12 }); },
        voice(L) { au.tone(L.voice * (0.75 + rand() * 0.7), .05, { type: rand() < .5 ? 'square' : 'sawtooth', vol: .03, slideTo: L.voice * (0.6 + rand() * 0.8) }); }
      };
      function music() {
        const k = musicN % 4, st = .15, mel = TUNE[[0, 1, 0, 2, 0, 1, 3, 2][musicN % 8] % 4];
        for (let i = 0; i < 16; i++) {
          if (mel[i]) { au.tone(NOTE(mel[i]), st * .9, { type: 'square', vol: .04, delay: i * st }); au.tone(NOTE(mel[i]), st * .8, { type: 'square', vol: .015, delay: i * st + st * .5 }); }
          au.noise(.03, { freq: 7000, vol: i % 4 === 2 ? .05 : .02, type: 'highpass', delay: i * st });
          if (i % 2 === 0) { const b = BASS[k][i >> 1]; au.tone(NOTE(b), st * 1.8, { type: 'triangle', vol: .11, delay: i * st }); }
        }
        musicN++;
      }

      const STARS = []; for (let i = 0; i < 60; i++) STARS.push([rand() * W, rand() * H, 1 + (i % 3)]);

      // ---------- countries ----------
      const popOf = c => { let s = 0; for (const ct of c.isl.cities) s += ct.pop; return s; };
      function newCountry(li, slot) {
        const isl = makeIsland(slot * 3.1 + li * 1.7 + rand() * 6);
        const c = { li, L: LEADERS[li], slot, isl, hate: 0,
          d: [1, 0, 0, 0, 0, 0], w: [1, 0, 0, 0], abm: 0, sat: 0, doom: false, dead: false, dying: false,
          expr: 'neutral', exprT: 0, ef: 0, grudge: null, disp: 40, blink: 60 + Math.floor(rand() * 120), shieldT: 0 };
        const extra = rand(); if (extra < .5) c.w[1]++; else if (extra < .8) c.d[1]++; else c.abm++;
        return c;
      }
      const cityXY = (c, ct) => ({ x: VX + ct.x, y: VY + ct.y });
      const islC = c => ({ x: VX + Math.round(c.isl.ox), y: VY + Math.round(c.isl.oy) });
      // where a nation lies relative to the viewport (towards its corner portrait; you are "below")
      const edgeOf = c => c.slot === 1 ? { x: VX - 8, y: VY - 8 } : c.slot === 2 ? { x: VX + VW + 8, y: VY - 8 } : c.slot === 3 ? { x: VX - 8, y: VY + VH + 8 } : c.slot === 4 ? { x: VX + VW + 8, y: VY + VH + 8 } : { x: VX + VW / 2, y: VY + VH + 10 };
      function setView(c) { if (g.view !== c) { g.view = c; g.parts = []; g.floats = []; } }
      function addBoom(c, x, y, sc) { sc = Math.min(sc, Math.max(.32, (y - VY - 4) / 54)); if (g.booms.length > 6) g.booms.shift(); const b = newBoom(x, y, sc); b.c = c; g.booms.push(b); }
      const alive = () => g.cs.filter(c => !c.dead);
      const rivalsOf = c => g.cs.filter(o => o !== c && !o.dead && !o.dying);
      function setExpr(c, e, n) { if ((c.dead || c.dying) && e !== 'dead') return; c.expr = e; c.exprT = n || 0; }
      function quote(c, k) { const v = c.L[k]; return Array.isArray(v) ? pick(v) : v; }
      function damage(c, ct, amt) {
        const total = popOf(c); if (total <= 0) return 0;
        amt = Math.min(amt, total);
        let rem = amt;
        if (ct) { const a = Math.min(ct.pop, amt * .65); ct.pop -= a; rem -= a; }
        let guard = 0;
        while (rem > .001 && guard++ < 8) {
          const left = popOf(c); if (left <= 0) break;
          const k = Math.min(1, rem / left);
          let took = 0; for (const q of c.isl.cities) { const a = q.pop * k; q.pop -= a; took += a; }
          rem -= took;
        }
        for (const q of c.isl.cities) if (q.pop < .05) q.pop = 0;
        return amt - Math.max(0, rem);
      }
      function grow(c, amt) { const tot = c.isl.cities.reduce((s, q) => s + q.init, 0); for (const q of c.isl.cities) q.pop = Math.min(q.init * 1.6, q.pop + amt * q.init / tot); }
      function bestCombo(c) {
        let best = null;
        for (let di = 0; di < DELIV.length; di++) if (c.d[di] > 0) for (let wk = WARH.length - 1; wk >= 0; wk--) if (c.w[wk] > 0 && WARH[wk].mt <= DELIV[di].cap) { if (!best || WARH[wk].mt > WARH[best.wk].mt || (WARH[wk].mt === WARH[best.wk].mt && DELIV[di].cap < DELIV[best.di].cap)) best = { di, wk }; break; }
        return best;
      }
      const canFire = (c, di) => c.d[di] > 0 && c.w.some((n, k) => n > 0 && WARH[k].mt <= DELIV[di].cap);

      function newGame(li) {
        const others = []; for (let i = 0; i < 8; i++) if (i !== li) others.push(i);
        for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = others[i]; others[i] = others[j]; others[j] = t; }
        const cs = [newCountry(li, 0)]; for (let s = 1; s < 5; s++) cs.push(newCountry(others[s - 1], s));
        g = { cs, player: cs[0], order: ORDER.map(s => cs[s]), turn: -1, round: 0, war: false, q: [], cur: null, phase: 'run', sel: 0,
          booms: [], parts: [], floats: [], fx: [], msg: '', banner: null, balloon: null, score: 0, kills: 0, shake: 0, flash: 0, flashCol: '#ffffff',
          offers: null, di: 0, wk: 0, tsel: 0, tmode: 'atk', lsel: 0, playerOut: false, warT: 0, view: cs[0], quip: null, focus: 0, selD: -1, ptrT: 0 };
        mode = 'war'; T = 0;
        push({ k: 'banner', text: 'PEACE... FOR NOW', sub: 'THE WORLD HOLDS ITS BREATH', col: '#7af0ff', dur: 110 });
        push({ k: 'say', c: g.player, text: g.player.L.intro });
        push({ k: 'fn', f: nextTurn });
      }

      // ---------- queue ----------
      function push(s) { if (g.q.length < 160) g.q.push(s); }
      function front(arr) { g.q.unshift.apply(g.q, arr); }
      function addPart(p) { if (g.parts.length < 320) g.parts.push(p); }
      function float(x, y, s, col, life) { const hw = tw(s) / 2 + 2; x = Math.max(VX + hw, Math.min(VX + VW - hw, x)); if (g.floats.length < 24) g.floats.push({ x, y, s, col, t: 0, life: life || 100 }); }

      function nextTurn() {
        if (checkEnd()) return;
        for (let k = 0; k < 5; k++) {
          g.turn++;
          if (g.turn >= 5) { g.turn = 0; g.round++; }
          const c = g.order[g.turn];
          if (!c.dead && !c.dying) break;
        }
        const c = g.order[g.turn];
        if (c === g.player) { setView(c); g.selD = -1; g.phase = 'act'; g.sel = Math.min(g.sel, 4); if (!actEnabled()[g.sel]) g.sel = 0; g.msg = 'YOUR TURN. CHOOSE AN ACTION.'; sfx.turn(); }
        else { g.phase = 'run'; push({ k: 'think', c }); }
      }
      function checkEnd() {
        const al = alive();
        if (g.playerOut || g.player.dead) { finish(al.length ? 'lose' : 'nobody'); return true; }
        if (al.length === 0) { finish('nobody'); return true; }
        if (al.length === 1 && al[0] === g.player) { finish('win'); return true; }
        return false;
      }
      function finish(kind) {
        const al = alive();
        if (kind === 'win') g.score += 25000 + Math.round(popOf(g.player) * 2000);
        if (g.score > hi) { hi = g.score; api.setHiScore(hi); }
        over = { kind, t: 0, score: g.score, winner: al.length === 1 ? al[0] : null, booms: [] };
        mode = 'over'; T = 0;
        if (kind === 'win') sfx.fanfare(); else sfx.dirge();
      }

      // ---------- actions ----------
      function warCheck(arr) { if (!g.war) { g.war = true; arr.unshift({ k: 'banner', text: 'WAR HAS BEGUN!', sub: 'THE FIRST NUKE IS IN THE AIR', col: '#ff4a2a', siren: 1, dur: 120 }); } }
      function doAttack(a, b, di, wk) {
        if (!(a.d[di] > 0 && a.w[wk] > 0 && WARH[wk].mt <= DELIV[di].cap)) return;
        a.d[di]--; a.w[wk]--;
        const steps = [{ k: 'say', c: a, text: quote(a, 'atk'), ex: 'laugh', dur: 70 }, { k: 'launch', a, b, di, wk }];
        warCheck(steps); for (const s of steps) push(s);
      }
      function doBuild(c, it) {
        if (rand() < .35) push({ k: 'say', c, text: quote(c, 'build'), ex: 'smug', dur: 60 });
        push({ k: 'build', c, it });
      }
      function doProp(c, b) { push({ k: 'say', c, text: quote(c, 'prop'), ex: 'talk', dur: 70 }); push({ k: 'prop', a: c, b }); }
      function doDefend(c) { push({ k: 'say', c, text: quote(c, 'def'), ex: 'smug', dur: 60 }); push({ k: 'defend', c }); }
      function doSecret(c) { push({ k: 'secret', c, card: wpick(SECRETS) }); }
      function offers() { const o = []; for (let i = 0; i < 3; i++) { const all = DELIV.map((d, k) => ({ kind: 'd', i: k, w: d.w })).concat(WARH.map((wv, k) => ({ kind: 'w', i: k, w: wv.w }))); o.push(wpick(all)); } return o; }
      const itemName = it => it.kind === 'd' ? DELIV[it.i].name : WARH[it.i].mt + 'MT';

      // ---------- AI ----------
      function aiTarget(c) {
        const rv = rivalsOf(c); if (!rv.length) return null;
        if (c.grudge && !c.grudge.dead && !c.grudge.dying && rand() < .5) return c.grudge;
        if (rand() < .22 && rv.includes(g.player)) return g.player;
        if (rand() < .45) return rv.slice().sort((p, q) => popOf(q) - popOf(p))[0];
        return pick(rv);
      }
      function aiDecide(c) {
        const b = aiTarget(c); if (!b) return;
        const combo = bestCombo(c);
        const pAtk = g.war ? c.L.aggr * .72 + (c.grudge && !c.grudge.dead ? .15 : 0) : Math.min(.5, c.L.aggr * .045 * g.round);
        if (combo && rand() < pAtk) return doAttack(c, b, combo.di, combo.wk);
        if (g.war && c.abm < 2 && c.grudge && rand() < .3) return doDefend(c);
        if (rand() < .12) return doSecret(c);
        if (rand() < c.L.propW * (g.war ? .45 : 1.1)) return doProp(c, b);
        const of = offers();
        const hasD = c.d.some(n => n > 0), hasW = c.w.some(n => n > 0);
        let it = of[0];
        for (const o of of) { if (!hasD && o.kind === 'd') { it = o; break; } if (!hasW && o.kind === 'w') { it = o; break; } if (o.kind === it.kind && o.i > it.i) it = o; }
        doBuild(c, it);
      }

      // ---------- death / continue ----------
      function retaliation(c) {
        const out = [];
        const ds = []; for (let di = DELIV.length - 1; di >= 0; di--) for (let n = 0; n < c.d[di]; n++) ds.push(di);
        ds.sort((p, q) => DELIV[q].cap - DELIV[p].cap);
        for (const di of ds) { for (let wk = WARH.length - 1; wk >= 0; wk--) if (c.w[wk] > 0 && WARH[wk].mt <= DELIV[di].cap) { c.w[wk]--; out.push({ di, wk }); break; } }
        c.d = [0, 0, 0, 0, 0, 0]; c.w = [0, 0, 0, 0];
        return out.slice(0, 8);
      }
      function kill(c, by) {
        if (c.dead || c.dying) return;
        for (const q of c.isl.cities) q.pop = 0;
        if (c === g.player && !g.playerOut) {
          c.dying = true; c.expr = 'dead'; sfx.dirge(); g.killer = by;
          api.offerContinue(contYes, contNo);
          return;
        }
        markDead(c, by);
      }
      function markDead(c, by) {
        c.dead = true; c.dying = false; c.expr = 'dead';
        if (by === g.player && c !== g.player) { g.kills++; g.score += 5000; }
        const steps = [{ k: 'banner', text: c.L.land + ' IS DESTROYED!', sub: c.L.name + ' IS TOAST', col: '#ff8a3a', dur: 100 }, { k: 'say', c, text: c.L.dead, ex: 'dead', dur: 80 }];
        const ret = retaliation(c);
        if (ret.length || c.doom) {
          steps.push({ k: 'banner', text: 'FINAL RETALIATION!', sub: c.L.short + ' LAUNCHES EVERYTHING', col: '#ff3030', siren: 1, dur: 110 });
          for (const r of ret) steps.push({ k: 'launch', a: c, b: null, by, di: r.di, wk: r.wk, final: 1 });
          if (c.doom) steps.push({ k: 'doomsday', c });
        }
        front(steps);
      }
      function contYes() {
        const p = g.player;
        p.dying = false; p.dead = false;
        for (const q of p.isl.cities) { q.pop = q.init * .4; q.burn = 0; }
        p.abm = Math.max(p.abm, 1); setExpr(p, 'laugh', 160);
        front([{ k: 'banner', text: 'SURVIVORS CRAWL OUT!', sub: 'THE BUNKERS OPEN. THE WAR GOES ON.', col: '#80ff80', dur: 110 }, { k: 'say', c: p, text: pick(BACKQ), ex: 'laugh', dur: 80 }]);
      }
      function contNo() { g.player.dying = false; g.playerOut = true; markDead(g.player, g.killer); }

      // ---------- steps ----------
      const mapU = (s, u) => s.bomber ? u : (u < .5 ? u * .9 : .45 + (u - .5) * 1.1);
      function bez(s, u) { const v = 1 - u; return [v * v * s.x0 + 2 * v * u * s.qx + u * u * s.x1, v * v * s.y0 + 2 * v * u * s.qy + u * u * s.y1]; }
      function satPos(c, t) { const p = islC(c); return [p.x + Math.cos(t * .03 + c.slot) * 34, VY + 9 + Math.sin(t * .03 + c.slot) * 3]; }
      function initStep(s) {
        s.t = 0;
        switch (s.k) {
          case 'think': s.dur = 34; g.msg = s.c.L.name + ' IS PLOTTING...'; setExpr(s.c, 'smug', 40); break;
          case 'say': {
            s.dur = s.dur || Math.min(170, 50 + s.text.length * 1.6);
            if (s.c.dead && !s.ex) s.ex = 'dead';
            g.quip = { c: s.c, text: s.text, t0: T };
            s.prev = s.c.expr; s.c.talk = s.ex || 'talk'; break;
          }
          case 'banner': s.dur = s.dur || 100; g.banner = s; if (s.siren) sfx.siren(); else sfx.banner(); break;
          case 'build': {
            const c = s.c, it = s.it; s.dur = 55; setView(c);
            if (it.kind === 'd') c.d[it.i] = Math.min(9, c.d[it.i] + 1); else c.w[it.i] = Math.min(9, c.w[it.i] + 1);
            const p = islC(c); float(p.x, p.y - 22, '+1 ' + itemName(it), '#ffe060', 90); sfx.build();
            g.msg = c.L.short + ' BUILDS ' + (it.kind === 'd' ? DELIV[it.i].full : 'A ' + WARH[it.i].mt + ' MEGATON WARHEAD') + '.';
            for (let i = 0; i < 12; i++) addPart({ x: p.x + (rand() - .5) * 30, y: p.y - 4, vx: (rand() - .5) * .6, vy: -rand() * 1.2, life: 30 + rand() * 20, max: 50, col: '#ffe060', r: 0, kind: 'spark' });
            break;
          }
          case 'defend': { const c = s.c; s.dur = 70; setView(c); c.abm = Math.min(9, c.abm + 2); c.shieldT = 90; sfx.shield(); const p = islC(c); float(p.x, p.y - 24, '+2 ANTI-MISSILES', '#7ad8ff', 90); g.msg = c.L.short + ' DIGS IN. +2 ANTI-MISSILES.'; break; }
          case 'prop': {
            const a = s.a, b = s.b; s.dur = 150;
            if (!b || b.dead || b.dying) { s.dur = 1; break; }
            s.amt = Math.min(popOf(b), 1.5 + rand() * 2.5 + (a.L.propW > .4 ? .8 : 0));
            s.back = g.war && rand() < .1;
            setView(b); b.hate += a === g.player ? 1 : 0;
            const pa = edgeOf(a), pb = islC(b); s.pa = pa; s.pb = pb;
            sfx.jingle(); setExpr(a, 'smug', 150); g.msg = a.L.short + ' BROADCASTS PROPAGANDA AT ' + b.L.land + '!';
            break;
          }
          case 'secret': {
            s.dur = s.c === g.player ? 600 : 150; s.applied = false; sfx.secret(); g.msg = s.c.L.short + ' DRAWS A SECRET...';
            break;
          }
          case 'launch': {
            const a = s.a;
            let b = s.b;
            if (!b || b.dead || b.dying) {
              const rv = rivalsOf(a);
              if (!rv.length) { s.dur = 1; s.skip = 1; break; }
              b = s.by && rv.includes(s.by) && rand() < .5 ? s.by : pick(rv);
              s.b = b;
            }
            const D = DELIV[s.di]; s.bomber = D.kind === 'b';
            setView(b); if (a === g.player) b.hate += 2;
            const cands = b.isl.cities.filter(q => q.pop > 0); s.city = cands.length ? pick(cands) : pick(b.isl.cities);
            const p0 = edgeOf(a), p1 = cityXY(b, s.city);
            s.x0 = p0.x; s.y0 = p0.y; s.x1 = p1.x; s.y1 = p1.y - 2;
            if (s.bomber) { s.x0 = p0.x < VX + VW / 2 ? VX - 12 : VX + VW + 12; s.y0 = VY + 12 + rand() * 20; s.qx = (s.x0 + s.x1) / 2; s.qy = Math.min(s.y0, s.y1) - 6; }
            else { s.qx = (s.x0 + s.x1) / 2; s.qy = Math.min(s.y0, s.y1) - 40; }
            s.dur = s.bomber ? 150 : 95;
            s.icpt = null;
            if (!s.bomber && b.sat > 0) { b.sat--; s.icpt = 'sat'; }
            else if (!s.bomber && b.abm > 0) { b.abm--; s.icpt = rand() < .62 ? 'abm' : 'miss'; }
            else if (s.bomber && rand() < .2) s.icpt = 'flak';
            s.cut = s.icpt === 'abm' || s.icpt === 'sat' ? .7 : s.icpt === 'flak' ? .78 : 1;
            if (s.bomber) sfx.bomber(); else sfx.launch();
            if (b === g.player) setTimeout0(() => sfx.siren());
            setExpr(a, 'laugh', 120);
            g.msg = (s.final ? 'LAST GASP! ' + a.L.short + ': ' : a.L.short + ' FIRES ') + D.name + ' + ' + WARH[s.wk].mt + 'MT AT ' + b.L.land + '!';
            s.px = s.x0; s.py = s.y0; s.ang = -Math.PI / 2;
            break;
          }
          case 'boom': {
            const b = s.b, mt = WARH[s.wk].mt;
            s.dur = 100;
            const amt = KILL[mt] * (.8 + rand() * .45);
            const loss = damage(b, s.city, amt);
            if (s.a === g.player && b !== g.player) g.score += Math.round(loss * 1000);
            const p = cityXY(b, s.city);
            setView(b); addBoom(b, p.x, p.y, { 10: .45, 20: .58, 50: .74, 100: .9 }[mt]);
            g.flash = 12; g.flashCol = '#ffffff'; g.shake = 10 + mt / 8;
            scorch(b.isl, s.city.x, s.city.y, 3 + mt / 25);
            for (const q of b.isl.cities) if (Math.abs(q.x - s.city.x) < 16 + mt / 6 && Math.abs(q.y - s.city.y) < 10) q.burn = 500 + mt * 6;
            sfx.boom(mt);
            float(p.x, p.y - 30, '-' + fmt(loss), '#ff6a4a', 110);
            setExpr(b, 'shock', 100); b.grudge = s.a;
            for (let i = 0; i < 26; i++) { const an = rand() * TAU, sp = .6 + rand() * 2; addPart({ x: p.x, y: p.y - 2, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp * .5 - .6, life: 30 + rand() * 30, max: 60, col: rand() < .5 ? '#ffb030' : '#ff6020', r: 0, kind: 'spark' }); }
            g.msg = b.L.land + ' LOSES ' + fmt(loss) + ' PEOPLE!';
            break;
          }
          case 'doomsday': s.dur = 200; s.hits = 0; g.flash = 30; g.flashCol = '#ff2010'; sfx.siren(); g.msg = 'THE DOOMSDAY DEVICE OF ' + s.c.L.land + ' GOES OFF!'; break;
          case 'wait': s.dur = s.dur || 30; break;
        }
      }
      // a tiny delay helper for staggered sounds (runs inside the fixed step loop)
      const timers = [];
      function setTimeout0(f) { if (timers.length < 8) timers.push({ t: 30, f }); }

      function endStep(s) {
        switch (s.k) {
          case 'think': aiDecide(s.c); break;
          case 'say': s.c.talk = null; if (!s.c.dead && !s.c.dying) setExpr(s.c, s.after || (s.ex === 'laugh' ? 'smug' : 'neutral'), 0); break;
          case 'banner': g.banner = null; break;
          case 'launch': {
            if (s.skip) break;
            if (s.cut < 1) {
              // shot down
              if (s.bomber) float(s.px, s.py - 8, 'BOMBER DOWN!', '#7ad8ff', 90); else float(s.px, s.py - 8, 'INTERCEPTED!', '#7ad8ff', 90);
              setExpr(s.b, 'laugh', 90);
              if (rand() < .6) front([{ k: 'say', c: s.b, text: quote(s.b, 'block'), ex: 'laugh', dur: 70 }]);
              break;
            }
            front([{ k: 'boom', a: s.a, b: s.b, city: s.city, wk: s.wk, bomber: s.bomber, di: s.di }]);
            break;
          }
          case 'boom': {
            const b = s.b;
            if (s.bomber && !s.a.dead && !s.a.dying) { s.a.d[s.di] = Math.min(9, s.a.d[s.di] + 1); if (s.a === g.player) g.msg = 'YOUR ' + DELIV[s.di].name + ' BOMBER RETURNS HOME SAFELY.'; }
            if (popOf(b) <= .05) kill(b, s.a);
            else {
              const big = WARH[s.wk].mt >= 50;
              setExpr(b, big ? 'cry' : 'angry', 140);
              if (rand() < .75) front([{ k: 'say', c: b, text: quote(b, 'hit'), ex: big ? 'cry' : 'angry', after: big ? 'cry' : 'angry', dur: 80 }]);
            }
            if (!s.a.dead && !s.a.dying && s.a !== b) setExpr(s.a, 'laugh', 100);
            break;
          }
          case 'prop': {
            if (s.dur <= 1) break;
            if (popOf(s.b) <= .05) kill(s.b, s.a);
            break;
          }
          case 'secret': if (!s.applied) applySecret(s); g.card = null; break;
          case 'doomsday': for (const c of g.cs) if (!c.dead && !c.dying && popOf(c) <= .05) kill(c, s.c); break;
        }
      }
      function propTransfer(s) {
        let a = s.a, b = s.b; if (s.back) { const t = a; a = b; b = t; }
        const amt = Math.min(s.amt, popOf(b));
        damage(b, null, amt); grow(a, amt);
        if (a === g.player) g.score += Math.round(amt * 500);
        const pb = islC(s.b);
        float(pb.x, pb.y - 24, (s.back ? '+' : '-') + fmt(amt), s.back ? '#80ff80' : '#ff8080', 100);
        g.msg = s.back ? 'PROPAGANDA BACKFIRES! ' + fmt(amt) + ' DEFECT TO ' + a.L.land + '!' : fmt(amt) + ' PEOPLE DEFECT TO ' + a.L.land + '!';
        setExpr(b, 'angry', 100); setExpr(a, 'laugh', 100);
      }
      function applySecret(s) {
        s.applied = true;
        const c = s.c, id = s.card.id, rv = rivalsOf(c), me = islC(c);
        let res = '', victim = null;
        switch (id) {
          case 'germ': {
            const b = rv.slice().sort((p, q) => popOf(q) - popOf(p))[0];
            if (!b) { res = 'NOBODY LEFT TO INFECT.'; break; }
            const loss = damage(b, null, Math.max(3, popOf(b) * .15)); victim = b;
            res = b.L.land + ' LOSES ' + fmt(loss) + '!'; g.fx.push({ k: 'germ', c: b, t: 0, dur: 150 }); setExpr(b, 'cry', 140); sfx.germ();
            if (c === g.player) g.score += Math.round(loss * 1000);
            break;
          }
          case 'leak': { const loss = damage(c, null, 4); victim = c; res = 'YOU LOSE ' + fmt(loss) + '.'; g.fx.push({ k: 'germ', c, t: 0, dur: 150 }); setExpr(c, 'cry', 140); sfx.germ(); break; }
          case 'sat': c.sat = Math.min(6, c.sat + 2); res = 'LASER SATELLITE IN ORBIT!'; sfx.zap(); break;
          case 'doom': c.doom = true; res = 'THE DEVICE IS ARMED. TICK TOCK.'; break;
          case 'sab': {
            const tg = rv.filter(o => o.d.some(n => n > 0) || o.w.some(n => n > 0));
            if (!tg.length) { res = 'NOTHING TO SABOTAGE. YOUR AGENT GOES SURFING.'; break; }
            const b = pick(tg); let n = 0;
            for (let k = 0; k < 2; k++) { const opts = []; b.d.forEach((v, i) => { if (v > 0) opts.push(['d', i]); }); b.w.forEach((v, i) => { if (v > 0) opts.push(['w', i]); }); if (!opts.length) break; const o = pick(opts); b[o[0]][o[1]]--; n++; }
            res = n + ' WEAPON' + (n > 1 ? 'S' : '') + ' DESTROYED IN ' + b.L.land + '!'; const p = islC(b); g.fx.push({ k: 'pop', x: p.x, y: p.y - 4, t: 0, dur: 40 }); sfx.pop(); setExpr(b, 'angry', 100);
            break;
          }
          case 'spy': {
            const tg = rv.filter(o => o.w.some(n => n > 0));
            if (!tg.length) { res = 'NO WARHEADS TO STEAL. THE SPY DEFECTS.'; break; }
            const b = pick(tg); let k = 3; while (k > 0 && !b.w[k]) k--; b.w[k]--; c.w[k] = Math.min(9, c.w[k] + 1);
            res = 'STOLE A ' + WARH[k].mt + 'MT WARHEAD FROM ' + b.L.short + '!'; setExpr(b, 'shock', 90);
            break;
          }
          case 'dud': { let k = 3; while (k >= 0 && !c.w[k]) k--; if (k < 0) { res = 'LUCKILY YOU HAD NO WARHEADS.'; break; } c.w[k]--; res = 'LOST YOUR ' + WARH[k].mt + 'MT WARHEAD.'; setExpr(c, 'cry', 90); break; }
          case 'oops': { const ct = pick(c.isl.cities); const loss = damage(c, ct, 3); victim = c; res = 'YOU LOSE ' + fmt(loss) + '.'; const p = cityXY(c, ct); addBoom(c, p.x, p.y, .35); g.flash = 6; g.shake = 6; ct.burn = 300; sfx.boom(10); setExpr(c, 'shock', 90); break; }
          case 'defect': {
            const tg = rv.filter(o => popOf(o) > 3); if (!tg.length) { res = 'NOBODY WANTS TO COME.'; break; }
            const b = pick(tg); damage(b, null, 3); grow(c, 3); victim = b; res = '3.0M ARRIVE FROM ' + b.L.land + '!'; float(me.x, me.y - 22, '+3.0M', '#80ff80', 90); setExpr(b, 'angry', 90);
            break;
          }
          case 'abm': c.abm = Math.min(9, c.abm + 3); c.shieldT = 90; res = 'ANTI-MISSILES: ' + c.abm; sfx.shield(); break;
          case 'mega': c.w[3] = Math.min(9, c.w[3] + 1); res = 'A 100MT WARHEAD IS YOURS!'; break;
          case 'boom': grow(c, 4); res = 'POPULATION +4.0M!'; float(me.x, me.y - 22, '+4.0M', '#80ff80', 90); break;
        }
        s.res = res; g.msg = c.L.short + ': ' + s.card.title + '. ' + res; setView(victim || c);
        if (s.card.good) setExpr(c, 'laugh', 100); else if (c.expr !== 'cry') setExpr(c, 'angry', 100);
        if (victim && popOf(victim) <= .05) kill(victim, c);
      }

      function updStep(s) {
        s.t++;
        switch (s.k) {
          case 'say': {
            if (s.t % 4 === 1 && s.t < s.dur - 10) sfx.voice(s.c.L);
            if (s.t > 14 && skipPressed()) return true;
            break;
          }
          case 'banner': if (s.t > 30 && skipPressed()) return true; break;
          case 'think': break;
          case 'launch': {
            if (s.skip) return true;
            const u = Math.min(1, s.t / s.dur), uu = mapU(s, u);
            const [px, py] = bez(s, Math.min(uu, 1));
            s.ang = Math.atan2(py - s.py, px - s.px); s.px = px; s.py = py;
            if (s.t % 2 === 0) addPart({ x: px - Math.cos(s.ang) * 3, y: py - Math.sin(s.ang) * 3, vx: (rand() - .5) * .2, vy: -.05, life: s.bomber ? 30 : 50, max: s.bomber ? 30 : 50, col: s.bomber ? '#c8c8d0' : '#e0e0e8', r: s.bomber ? 1 : 1.5, kind: 'smoke' });
            if (s.b === g.player && u > .45) setExpr(s.b, 'shock', 30);
            if (s.icpt === 'abm' || s.icpt === 'miss') {
              const pb = { x: VX + s.b.isl.radar.x, y: VY + s.b.isl.radar.y };
              if (u > .4) {
                const k = Math.min(1, (u - .4) / .3), [mx, my] = bez(s, mapU(s, .7));
                const tx = s.icpt === 'abm' ? mx : mx + 18, ty = s.icpt === 'abm' ? my : my - 12;
                s.ax = pb.x + (tx - pb.x) * k; s.ay = pb.y - 8 + (ty - pb.y + 8) * k;
                if (s.t % 2 === 0 && k < 1) addPart({ x: s.ax, y: s.ay, vx: 0, vy: 0, life: 24, max: 24, col: '#a0d8ff', r: 1, kind: 'smoke' });
                if (s.icpt === 'miss' && k >= 1 && !s.missPop) { s.missPop = 1; burst(s.ax, s.ay, '#a0d8ff', 10); sfx.pop(); float(s.ax, s.ay - 8, 'MISSED!', '#ffa0a0', 60); }
              }
            }
            if (s.icpt === 'sat' && u > .6 && u < .7) { s.laser = 1; if (!s.zapped) { s.zapped = 1; sfx.zap(); } } else s.laser = 0;
            if (s.icpt === 'flak' && u > .55 && s.t % 6 === 0) burst(s.px + (rand() - .5) * 16, s.py + (rand() - .5) * 10, '#ffd080', 5);
            if (u >= s.cut) {
              if (s.cut < 1) { burst(s.px, s.py, '#ffe080', 22); sfx.pop(); g.flash = 3; }
              return true;
            }
            if (u >= .86 && !s.whistled && !s.bomber) { s.whistled = 1; sfx.whistle(); }
            break;
          }
          case 'prop': {
            if (s.dur <= 1) return true;
            if (s.t === 70) propTransfer(s);
            break;
          }
          case 'secret': {
            if (s.t === 50 && !s.applied) applySecret(s);
            if (s.c === g.player && s.t > 60 && skipPressed()) return true;
            if (s.c !== g.player && s.t > 70 && skipPressed()) return true;
            break;
          }
          case 'doomsday': {
            const tg = g.cs.filter(c => !c.dead && !c.dying && c !== s.c);
            if (s.t % 40 === 10 && s.hits < tg.length) {
              const b = tg[s.hits++]; const ct = pick(b.isl.cities); const loss = damage(b, ct, Math.max(6, popOf(b) * .45));
              setView(b); const p = cityXY(b, ct); addBoom(b, p.x, p.y, .8);
              g.flash = 10; g.flashCol = '#ffffff'; g.shake = 14; sfx.boom(50); scorch(b.isl, ct.x, ct.y, 6); ct.burn = 600;
              float(p.x, p.y - 30, '-' + fmt(loss), '#ff6a4a', 100); setExpr(b, 'shock', 120);
            }
            break;
          }
        }
        return s.t >= s.dur;
      }
      function burst(x, y, col, n) { for (let i = 0; i < n; i++) { const a = rand() * TAU, sp = .4 + rand() * 1.6; addPart({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 18 + rand() * 18, max: 36, col, r: 0, kind: 'spark' }); } addPart({ x, y, vx: 0, vy: 0, life: 10, max: 10, col: '#ffffff', r: 4, kind: 'flash' }); }
      let skipLatch = false;
      function skipPressed() { return skipLatch; }

      function runQueue() {
        for (let guard = 0; guard < 12; guard++) {
          if (!g.cur) {
            if (!g.q.length) return false;
            g.cur = g.q.shift();
            if (g.cur.k === 'fn') { const f = g.cur.f; g.cur = null; f(); if (mode !== 'war') return true; continue; }
            initStep(g.cur);
          }
          break;
        }
        if (!g.cur) return false;
        const s = g.cur;
        if (updStep(s)) { g.cur = null; endStep(s); }
        return true;
      }

      // ---------- player input ----------
      const CARD_R = i => ({ x: 78 + i * 58, y: 96, w: 52, h: 82 });
      function actEnabled() { const p = g.player; return [true, rivalsOf(p).length > 0, p.abm < 9, true, !!bestCombo(p)]; }
      // ---------- console controls ----------
      const CTRL = [];
      const addC = (id, x, y, w, h) => CTRL.push({ id, x, y, w, h });
      addC('p1', 1, 1, 64, 62); addC('factory', 68, 12, 34, 34); addC('radio', 218, 12, 34, 34); addC('p2', 255, 1, 64, 62);
      for (let i = 0; i < 4; i++) addC('m' + i, 69, 79 + i * 11, 32, 10);
      for (let i = 0; i < 4; i++) addC('w' + i, 69, 132 + i * 11, 32, 10);
      addC('b4', 219, 82, 32, 10); addC('b5', 219, 104, 32, 10); addC('lnds', 219, 135, 32, 10); addC('mega', 219, 157, 32, 10);
      addC('mpanel', 1, 78, 58, 42); addC('wpanel', 1, 131, 58, 42); addC('bpanel', 261, 78, 58, 42); addC('dpanel', 261, 131, 58, 42);
      addC('p3', 1, 185, 64, 62); addC('p4', 255, 185, 64, 62);
      const NAVC = CTRL.filter(c => !/panel/.test(c.id));
      const ctrlAt = (mx, my) => CTRL.find(c => inR(c, mx, my));
      const rivalOfCtrl = id => /^p\d$/.test(id) ? g.cs[+id[1]] : null;
      function navFocus(dx, dy) {
        const cur = NAVC[g.focus] || NAVC[0], cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2;
        let best = -1, bs = 1e9;
        NAVC.forEach((c, i) => {
          const ex = c.x + c.w / 2 - cx, ey = c.y + c.h / 2 - cy;
          const along = ex * dx + ey * dy, side = Math.abs(ex * dy) + Math.abs(ey * dx);
          if (along <= 2) return;
          const sc = along + side * 2.5; if (sc < bs) { bs = sc; best = i; }
        });
        if (best >= 0) { g.focus = best; sfx.move(); }
      }
      function rivalInfo(c) {
        if (c.dead) return c.L.name + ' IS NOTHING BUT ASHES.';
        const nd = c.d.reduce((a, b) => a + b, 0), nw = c.w.reduce((a, b) => a + b, 0);
        return c.L.name + ' OF ' + c.L.land + ': ' + fmt(popOf(c)) + ' PEOPLE, ' + nd + ' LAUNCHERS, ' + nw + ' WARHEADS, ' + c.abm + ' ABMS.' + (c.hate > 2 ? ' HATES YOU.' : c.hate ? ' IS ANNOYED WITH YOU.' : '');
      }
      function pressDeliv(di) {
        const p = g.player, D = DELIV[di];
        if (p.d[di] <= 0) { sfx.buzz(); g.msg = 'YOU HAVE NO ' + D.full + 'S. CLICK THE FACTORY TO BUILD WEAPONS.'; return; }
        if (!canFire(p, di)) { sfx.buzz(); g.msg = 'NO WARHEAD FITS YOUR ' + D.full + ' (MAX ' + D.cap + ' MEG). BUILD ONE AT THE FACTORY.'; return; }
        sfx.ok(); g.di = di; g.selD = di; g.phase = 'warh'; g.msg = D.full + ' READY. NOW CLICK A WARHEAD (LIT BUTTONS FIT).  X: CANCEL';
      }
      function press(id) {
        const p = g.player;
        if (g.phase === 'target') {
          const c = rivalOfCtrl(id);
          if (c && c.slot && !c.dead && !c.dying) {
            g.phase = 'run'; sfx.ok(); g.selD = -1;
            if (g.tmode === 'atk') doAttack(p, c, g.di, g.wk); else doProp(p, c);
            push({ k: 'fn', f: nextTurn });
          } else if (c && c.dead) { sfx.buzz(); g.msg = c.L.name + ' IS ALREADY DESTROYED.'; }
          else if (/^[mb]\d$/.test(id) && g.tmode === 'atk') { g.phase = 'act'; press(id); }
          else sfx.buzz();
          return;
        }
        if (g.phase === 'warh') {
          if (/^w\d$/.test(id)) {
            const k = +id[1];
            if (p.w[k] > 0 && WARH[k].mt <= DELIV[g.di].cap) { sfx.ok(); g.wk = k; g.phase = 'target'; g.tmode = 'atk'; g.msg = DELIV[g.di].name + ' ARMED WITH ' + WARH[k].mt + ' MEG. CLICK A RIVAL\'S PORTRAIT TO FIRE!  X: CANCEL'; }
            else { sfx.buzz(); g.msg = p.w[k] > 0 ? 'A ' + WARH[k].mt + ' MEG WARHEAD IS TOO BIG FOR THAT ' + DELIV[g.di].name + '.' : 'YOU HAVE NO ' + WARH[k].mt + ' MEG WARHEADS.'; }
            return;
          }
          if (/^m\d$/.test(id)) return pressDeliv(+id[1]);
          if (/^b\d$/.test(id)) return pressDeliv(+id[1]);
          if (id === 'bpanel') return pressDeliv(p.d[4] ? 4 : 5);
          return;
        }
        if (g.phase !== 'act') return;
        const rc = rivalOfCtrl(id);
        if (rc) { g.msg = rivalInfo(rc); sfx.move(); return; }
        switch (id) {
          case 'factory': sfx.ok(); if (!g.offers) g.offers = offers(); g.phase = 'build'; g.lsel = 0; return;
          case 'radio': if (!rivalsOf(p).length) return; sfx.ok(); g.phase = 'target'; g.tmode = 'prop'; g.msg = "PROPAGANDA! CLICK A RIVAL'S PORTRAIT TO LURE THEIR PEOPLE AWAY.  X: CANCEL"; return;
          case 'lnds': case 'dpanel': if (p.abm >= 9) { sfx.buzz(); g.msg = 'YOUR ANTI-MISSILE SILOS ARE FULL (9).'; return; } sfx.ok(); g.phase = 'run'; doDefend(p); push({ k: 'fn', f: nextTurn }); return;
          case 'mega': sfx.ok(); g.phase = 'run'; doSecret(p); push({ k: 'fn', f: nextTurn }); return;
          case 'mpanel': { const i = [0, 1, 2, 3].find(i => canFire(p, i)); if (i === undefined) { sfx.buzz(); g.msg = 'NO MISSILE WITH A FITTING WARHEAD. VISIT THE FACTORY.'; } else pressDeliv(i); return; }
          case 'bpanel': pressDeliv(p.d[4] ? 4 : 5); return;
          case 'wpanel': g.msg = 'WARHEADS: 10 / 20 / 50 / 100 MEG. PICK A MISSILE OR BOMBER FIRST, THEN ITS WARHEAD.'; return;
        }
        if (/^[mb]\d$/.test(id)) return pressDeliv(+id[1]);
        if (/^w\d$/.test(id)) { sfx.buzz(); g.msg = 'FIRST PICK A MISSILE OR BOMBER, THEN A WARHEAD THAT FITS IT.'; }
      }
      const HELP = {
        factory: 'FACTORY: BUILD A NEW WEAPON.', radio: 'RADIO TOWER: BROADCAST PROPAGANDA TO STEAL POPULATION.',
        lnds: 'LNDS: BUILD 2 ANTI-MISSILE DEFENSES.', mega: 'MEGA: DRAW A TOP SECRET CARD. GOOD... OR BAD.',
        mpanel: 'MISSILES: CLICK A LIT MEGATON BUTTON TO PICK ONE.', wpanel: 'WARHEADS: CHOSEN AFTER THE MISSILE OR BOMBER.',
        bpanel: 'BOMBERS: IMMUNE TO ANTI-MISSILES AND THEY COME BACK.', dpanel: 'DEFENSE: BUILD 2 ANTI-MISSILES.'
      };
      function hoverHelp(id) {
        const p = g.player;
        if (HELP[id]) return HELP[id];
        if (/^m\d$/.test(id)) { const i = +id[1]; return DELIV[i].full + ' (' + DELIV[i].cap + ' MEG MAX): YOU HAVE ' + p.d[i] + '.'; }
        if (/^b\d$/.test(id)) { const i = +id[1]; return DELIV[i].full + ' (' + DELIV[i].cap + ' MEG MAX): YOU HAVE ' + p.d[i] + '.'; }
        if (/^w\d$/.test(id)) { const k = +id[1]; return WARH[k].mt + ' MEGATON WARHEADS: YOU HAVE ' + p.w[k] + '.'; }
        const c = rivalOfCtrl(id); if (c) return rivalInfo(c);
        return null;
      }
      function updPlayer() {
        const mx = api.mouse.x, my = api.mouse.y, click = api.mouse.clicked;
        const ok = api.anyPressed('Space', 'Enter'), back = api.anyPressed('KeyX', 'KeyZ');
        const up = api.anyPressed('ArrowUp'), dn = api.anyPressed('ArrowDown'), lf = api.anyPressed('ArrowLeft'), rt = api.anyPressed('ArrowRight');
        if (g.phase === 'build') {
          if (lf || up) { g.lsel = (g.lsel + 2) % 3; sfx.move(); } if (rt || dn) { g.lsel = (g.lsel + 1) % 3; sfx.move(); }
          let hit = -1; for (let i = 0; i < 3; i++) if (inR(CARD_R(i), mx, my)) hit = i;
          if (hit >= 0 && (mouseMv || click) && hit !== g.lsel) { g.lsel = hit; sfx.move(); }
          g.msg = 'PRODUCTION: CHOOSE ONE CARD TO BUILD.  X: CANCEL';
          if (back || (click && hit < 0 && !inR({ x: 70, y: 70, w: 180, h: 118 }, mx, my))) { g.phase = 'act'; sfx.back(); g.msg = 'YOUR TURN. CHOOSE AN ACTION.'; return; }
          if (ok || (click && hit >= 0)) { const it = g.offers[g.lsel]; g.offers = null; sfx.ok(); g.phase = 'run'; doBuild(g.player, it); push({ k: 'fn', f: nextTurn }); }
          return;
        }
        if (lf) navFocus(-1, 0); if (rt) navFocus(1, 0); if (up) navFocus(0, -1); if (dn) navFocus(0, 1);
        const hc = ctrlAt(mx, my);
        if (hc && mouseMv) { const i = NAVC.indexOf(hc); if (i >= 0) g.focus = i; if (g.phase === 'act') { const h = hoverHelp(hc.id); if (h) g.msg = h; } }
        if (back && g.phase !== 'act') { sfx.back(); g.phase = 'act'; g.selD = -1; g.msg = 'CANCELLED. YOUR TURN.'; return; }
        if (click && hc) press(hc.id);
        else if (ok) press((NAVC[g.focus] || NAVC[0]).id);
      }
      // ---------- per-frame world update ----------
      function updWorld() {
        for (const c of g.cs) {
          c.disp += (popOf(c) - c.disp) * .08;
          if (c.exprT > 0 && --c.exprT === 0 && !c.dead && !c.dying) c.expr = 'neutral';
          if (c.shieldT > 0) c.shieldT--;
          if (--c.blink < 0) c.blink = 90 + Math.floor(rand() * 160);
          for (const q of c.isl.cities) if (q.burn > 0) { q.burn--; if (q.burn % 7 === 0 && c === g.view) { const p = cityXY(c, q); addPart({ x: p.x + (rand() - .5) * 8, y: p.y - 3, vx: .08 + rand() * .08, vy: -.25 - rand() * .2, life: 70, max: 70, col: '#4a4048', r: 1.5, kind: 'smoke' }); } }
        }
        for (const b of g.booms) b.age++;
        g.booms = g.booms.filter(b => b.age < 260);
        for (const p of g.parts) { p.x += p.vx; p.y += p.vy; if (p.kind === 'spark') p.vy += .04; if (p.kind === 'smoke') { p.r += .04; p.vx *= .99; } p.life--; }
        g.parts = g.parts.filter(p => p.life > 0);
        for (const f of g.floats) f.t++;
        g.floats = g.floats.filter(f => f.t < f.life);
        for (const f of g.fx) f.t++;
        g.fx = g.fx.filter(f => f.t < f.dur);
        if (g.shake > 0) g.shake *= .88; if (g.shake < .4) g.shake = 0;
        if (g.flash > 0) g.flash--;
        for (const t of timers) if (--t.t === 0) t.f();
        for (let i = timers.length - 1; i >= 0; i--) if (timers[i].t <= 0) timers.splice(i, 1);
      }

      // =================================================================
      //  RENDERING
      // =================================================================
      const CYC = ['#ff2020', '#ff8800', '#ffee00', '#30ff30', '#00e0ff', '#3080ff', '#ff40ff'];
      const cyc = k => CYC[((T >> 2) + (k || 0)) % CYC.length];
      function exprFor(c) {
        if (c.dead || c.dying) return 'dead';
        if (c.talk) return c.talk;
        return c.expr;
      }
      function frOf(c, ex) {
        if (ex === 'talk') return [0, 1, 2, 1, 0, 2][((T + c.slot * 3) >> 2) % 6];
        if (ex === 'neutral') return c.blink < 7 ? 2 : 0;
        return ((T + c.slot * 5) >> 4) & 1;
      }
      function bevel(ctx, X, Y, w, h, top, bot) {
        rect(ctx, '#000010', X, Y, w, h);
        vgrad(ctx, X + 1, Y + 1, w - 2, h - 2, [[0, top], [1, bot]]);
        rect(ctx, lite(top, .45), X + 1, Y + 1, w - 2, 1); rect(ctx, lite(top, .3), X + 1, Y + 1, 1, h - 2);
        rect(ctx, dark(bot, .5), X + 1, Y + h - 2, w - 2, 1); rect(ctx, dark(bot, .5), X + w - 2, Y + 1, 1, h - 2);
      }
      function popCol(f) { return f > .6 ? '#60ff60' : f > .3 ? '#ffe040' : '#ff5040'; }
      function popBar(ctx, X, Y, w, f) {
        rect(ctx, '#000010', X, Y, w, 4); rect(ctx, '#1a2040', X + 1, Y + 1, w - 2, 2);
        const n = Math.round((w - 2) * Math.max(0, Math.min(1, f)));
        for (let i = 0; i < n; i++) { const u = i / (w - 2); rect(ctx, u < .3 ? '#ff4030' : u < .6 ? '#ffd030' : '#50e050', X + 1 + i, Y + 1, 1, 2); }
        if (n > 0) rect(ctx, '#ffffff', X + 1, Y + 1, n, 1);
      }
      function drawBanner(ctx) {
        const s = g.banner; if (!s) return;
        const k = Math.min(1, s.t / 10), o = s.t > s.dur - 10 ? Math.max(0, (s.dur - s.t) / 10) : 1, hh = Math.round(38 * Math.min(k, o));
        if (hh < 2) return;
        const cy = 131, col = s.col || '#ffffff', BX = 0, BW = W;
        for (let i = 0; i < hh; i++) { const u = i / (hh - 1 || 1), v = 1 - Math.abs(u - .5) * 2; rect(ctx, mix12(dark(col, .85), dark(col, .35), v), BX, cy - (hh >> 1) + i, BW, 1); }
        rect(ctx, lite(col, .5), BX, cy - (hh >> 1), BW, 1); rect(ctx, lite(col, .5), BX, cy - (hh >> 1) + hh - 1, BW, 1);
        if (k < 1 || o < 1) return;
        const big = s.text.length * 10 <= 300;
        const rows = [lite(col, .85), lite(col, .6), lite(col, .3), col, col, dark(col, .2), dark(col, .4)];
        if (big) text(ctx, s.text, BX + BW / 2, cy - 13, col, { center: true, scale: 2, adv: 5, outline: '#000000', rows, wave: 2, wt: T * .15 });
        else text(ctx, s.text, BX + BW / 2, cy - 9, col, { center: true, outline: '#000000', rows, wave: 1, wt: T * .15 });
        if (s.sub) text(ctx, s.sub, BX + BW / 2, cy + 7, '#ffffff', { center: true, outline: '#000000' });
      }
      function drawMissile(ctx, s) {
        if (s.bomber) {
          const dir = Math.cos(s.ang) >= 0 ? 1 : -1, x = Math.round(s.px), y = Math.round(s.py);
          const P = ['....ww.....', '.wwwwwwwww.', 'kkkkkwwwwwn', '....kk.....'];
          spr(ctx, P, { w: '#d0d8e4', k: '#5a6474', n: '#ff4040' }, x - 5, y - 2, dir < 0);
          return;
        }
        const ca = Math.cos(s.ang), sa = Math.sin(s.ang);
        for (let i = -5; i <= 3; i++) {
          const px = Math.round(s.px + ca * i), py = Math.round(s.py + sa * i);
          const col = i >= 3 ? DELIV[s.di].nose : i >= -2 ? (i === 0 ? '#ffffff' : DELIV[s.di].col) : i === -3 ? ((T >> 1) & 1 ? '#ffe060' : '#ffffff') : '#ff7020';
          if (i < -3 && ((T + i) & 1)) continue;
          rect(ctx, col, px, py, i >= -2 && i < 3 ? 2 : 1, i >= -2 && i < 3 ? 2 : 1);
        }
      }
      function drawProp(ctx, s) {
        if (s.dur <= 1) return;
        let a = s.pa, b = s.pb; if (s.back && s.t > 60) { const t = a; a = b; b = t; }
        if (s.t < 75) {
          for (let r = 0; r < 3; r++) { const rr = ((s.t * .8 + r * 9) % 27) + 4; for (let k = -6; k <= 6; k++) { const an = Math.atan2(b.y - a.y, b.x - a.x) + k * .07; rect(ctx, r & 1 ? '#ffe060' : '#ffffff', a.x + Math.cos(an) * rr, a.y - 12 + Math.sin(an) * rr * .6, 1, 1); } }
          for (let i = 0; i < 10; i++) {
            const u = (s.t - i * 4) / 50; if (u < 0 || u > 1) continue;
            const x = a.x + (b.x - a.x) * u + Math.sin(u * 12 + i) * 4, y = a.y - 12 + (b.y - a.y) * u - Math.sin(u * Math.PI) * 30;
            rect(ctx, '#000010', x - 1, y - 1, 5, 4); rect(ctx, (T + i) & 4 ? '#ffffff' : '#ffe8a0', x, y, 3, 2); rect(ctx, '#d02020', x, y, 1, 1);
          }
        } else {
          const u0 = (s.t - 75) / 70;
          for (let i = 0; i < 4; i++) {
            const u = Math.max(0, Math.min(1, u0 - i * .06)); if (u <= 0) continue;
            const x = b.x + (a.x - b.x) * u + (i - 1.5) * 6, y = b.y + 6 + (a.y - b.y) * u + Math.sin(u * 8 + i) * 2 + (i & 1) * 4, bob = (T >> 3) + i & 1;
            rect(ctx, '#5ab0e8', x - 4, y + 2, 9, 1);
            rect(ctx, '#000010', x - 4, y - 1 + bob, 9, 3); rect(ctx, '#a0602a', x - 3, y + bob, 7, 1); rect(ctx, '#d08a40', x - 3, y - 1 + bob, 7, 1);
            rect(ctx, '#d8d8d8', x, y - 6 + bob, 1, 5); rect(ctx, '#ffffff', x + 1, y - 6 + bob, 3, 3); rect(ctx, '#ffffff', x + 1, y - 3 + bob, 2, 1);
            rect(ctx, '#ffd0a0', x - 2, y - 3 + bob, 1, 2); rect(ctx, '#ffd0a0', x + 3, y - 3 + bob, 1, 2);
          }
        }
      }
      function drawFx(ctx) {
        for (const f of g.fx) {
          if (f.c && f.c !== g.view) continue;
          if (f.k === 'germ') {
            const p = islC(f.c), k = f.t / f.dur, o = k < .8 ? 1 : (1 - k) / .2;
            ctx.globalAlpha = .85 * o;
            for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + f.t * .02, r = 8 + k * 18; disc(ctx, i & 1 ? '#3ab03a' : '#6ae04a', p.x + Math.cos(a) * r, p.y - 4 + Math.sin(a) * r * .4 - k * 6, 5 + k * 5); }
            for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + f.t * .02 + .3, r = 6 + k * 14; disc(ctx, '#a0ff80', p.x + Math.cos(a) * r - 1, p.y - 6 + Math.sin(a) * r * .4 - k * 6, 2 + k * 2); }
            ctx.globalAlpha = 1;
            if ((f.t >> 3) & 1) icoSkull(ctx, p.x - 3, p.y - 30 - k * 6);
          } else if (f.k === 'pop') { const r = f.t * .8; for (let a = 0; a < 24; a++) rect(ctx, a & 1 ? '#ffe060' : '#ff6020', f.x + Math.cos(a / 24 * TAU) * r, f.y + Math.sin(a / 24 * TAU) * r * .6, 1, 1); if (f.t < 8) disc(ctx, '#ffffff', f.x, f.y, 6 - f.t * .6); }
        }
      }
      function drawParts(ctx) {
        for (const p of g.parts) {
          const k = p.life / p.max;
          if (p.kind === 'smoke') { ctx.globalAlpha = Math.min(.7, k * .8); disc(ctx, p.col, p.x, p.y, p.r + (1 - k) * 2); ctx.globalAlpha = 1; }
          else if (p.kind === 'flash') disc(ctx, '#ffffff', p.x, p.y, p.r * k + 1);
          else rect(ctx, k > .5 ? p.col : dark(p.col, .4), p.x, p.y, 1, 1);
        }
      }
      const cardCv = mk(110, 132), cardX = cardCv.getContext('2d');
      function drawSecret(ctx, s) {
        const cw = 110, ch = 132, X = 160 - cw / 2, Y = 64, x = cardX;
        const fl = Math.min(1, s.t / 16), face = fl >= .5, sw = Math.max(2, Math.round(cw * (face ? (fl - .5) * 2 : 1 - fl * 2)));
        x.clearRect(0, 0, cw, ch);
        rect(x, '#000010', 0, 0, cw, ch);
        if (!face) {
          vgrad(x, 1, 1, cw - 2, ch - 2, [[0, '#2a3a8a'], [1, '#0a1240']]);
          for (let yy = 6; yy < ch - 6; yy += 6) for (let xx = 6; xx < cw - 6; xx += 6) rect(x, '#3a4aa0', xx + ((yy / 6) & 1) * 3, yy, 2, 2);
          trefoil(x, cw / 2, ch / 2, 12, '#ffd040');
        } else {
          const bc = s.applied ? (s.card.good ? '#30c040' : '#e03030') : '#c0a060';
          rect(x, bc, 1, 1, cw - 2, ch - 2);
          vgrad(x, 3, 3, cw - 6, ch - 6, [[0, '#fff8e4'], [1, '#d8c8a0']]);
          rect(x, '#c01010', 22, 5, 66, 11); rect(x, '#fff8e4', 23, 6, 64, 9); text(x, 'TOP SECRET', 55, 7, '#c01010', { center: true });
          rect(x, '#000010', 30, 19, 50, 38); secretArt(x, s.card.id, 31, 20, T);
          text(x, s.card.title, 55, 60, '#101830', { center: true });
          wrap(s.card.desc, 17).slice(0, 4).forEach((l, i) => text(x, l, 55, 71 + i * 8, '#4a3a2a', { center: true }));
          if (s.applied && s.res) wrap(s.res, 17).slice(0, 2).forEach((l, i) => text(x, l, 55, 107 + i * 9, s.card.good ? '#107a20' : '#b01010', { center: true }));
        }
        ctx.drawImage(cardCv, Math.round(X + (cw - sw) / 2), Y, sw, ch);
        if (s.applied && (T >> 4) & 1) text(ctx, s.c === g.player ? 'CLICK OR SPACE' : s.c.L.short + "'S SECRET", 160, Y - 9, '#ffffff', { center: true, outline: '#000010' });
      }
      function drawBuildWin(ctx) {
        amigaWin(ctx, 70, 70, 180, 118, 'PRODUCTION', T);
        text(ctx, 'CHOOSE ONE TO BUILD', 160, 84, '#ffffff', { center: true });
        g.offers.forEach((it, i) => {
          const r = CARD_R(i), on = g.lsel === i, y = r.y - (on ? 2 : 0);
          rect(ctx, '#000010', r.x - 1, y - 1, r.w + 2, r.h + 2);
          if (on) rect(ctx, cyc(i), r.x - 2, y - 2, r.w + 4, r.h + 4), rect(ctx, '#000010', r.x - 1, y - 1, r.w + 2, r.h + 2);
          vgrad(ctx, r.x, y, r.w, r.h, [[0, '#fff8e8'], [1, '#c8b890']]);
          const hc = it.kind === 'd' ? (it.i >= 4 ? '#506070' : '#2a4ab0') : '#b02a2a';
          rect(ctx, hc, r.x, y, r.w, 10); text(ctx, it.kind === 'd' ? (it.i >= 4 ? 'BOMBER' : 'MISSILE') : 'WARHEAD', r.x + r.w / 2, y + 2, '#ffffff', { center: true });
          vgrad(ctx, r.x + 3, y + 12, r.w - 6, 46, [[0, '#0a1a40'], [1, '#2a4a8a']]);
          const cx = r.x + r.w / 2;
          if (it.kind === 'd') { if (it.i >= 4) bigBomber(ctx, cx, y + 34); else bigMissile(ctx, it.i, cx, y + 53); }
          else bigWarhead(ctx, it.i, cx, y + 33);
          text(ctx, it.kind === 'd' ? DELIV[it.i].name : WARH[it.i].mt + ' MT', cx, y + 62, '#101830', { center: true });
          text(ctx, it.kind === 'd' ? 'MAX ' + DELIV[it.i].cap + 'MT' : 'YOU HAVE ' + g.player.w[it.i], cx, y + 72, '#5a4a30', { center: true, adv: 5 });
        });
      }
      // ---------- stone console (static, built once) ----------
      const STONE = ['#56565a', '#646468', '#727276', '#808084', '#8e8e92', '#9c9ca0'];
      function stoneFill(x, X, Y, w, h, base) {
        for (let y = Y; y < Y + h; y++) for (let xx = X; xx < X + w; xx++) {
          const n = (hash(xx, y) & 255) / 255, v = base + (n - .5) * 1.7 + Math.sin(xx * .37 + y * .23) * Math.sin(y * .19 - xx * .07) * .45;
          x.fillStyle = STONE[Math.max(0, Math.min(5, Math.round(v)))]; x.fillRect(xx, y, 1, 1);
        }
      }
      function bev(x, X, Y, w, h, inset) {
        const a = inset ? '#2e2e32' : '#e4e4e8', b = inset ? '#d4d4d8' : '#262628', a2 = inset ? '#4a4a4e' : '#b8b8bc', b2 = inset ? '#a8a8ac' : '#46464a';
        rect(x, a, X, Y, w, 1); rect(x, a, X, Y, 1, h); rect(x, b, X, Y + h - 1, w, 1); rect(x, b, X + w - 1, Y, 1, h);
        rect(x, a2, X + 1, Y + 1, w - 2, 1); rect(x, a2, X + 1, Y + 1, 1, h - 2); rect(x, b2, X + 1, Y + h - 2, w - 2, 1); rect(x, b2, X + w - 2, Y + 1, 1, h - 2);
      }
      function rivet(x, X, Y) { rect(x, '#202024', X, Y, 3, 3); rect(x, '#c8c8cc', X, Y, 2, 2); rect(x, '#ffffff', X, Y, 1, 1); }
      function greenFrame(x, X, Y, w, h) {
        rect(x, '#0a240a', X + 2, Y, w - 4, h); rect(x, '#0a240a', X, Y + 2, w, h - 4); rect(x, '#0a240a', X + 1, Y + 1, w - 2, h - 2);
        rect(x, '#2c9a2c', X + 2, Y + 1, w - 4, h - 2); rect(x, '#2c9a2c', X + 1, Y + 2, w - 2, h - 4);
        rect(x, '#8ae88a', X + 3, Y + 1, w - 6, 1); rect(x, '#8ae88a', X + 1, Y + 3, 1, h - 6); rect(x, '#5ac85a', X + 2, Y + 2, w - 4, 1); rect(x, '#5ac85a', X + 2, Y + 2, 1, h - 4);
        rect(x, '#105a10', X + 3, Y + h - 2, w - 6, 1); rect(x, '#105a10', X + w - 2, Y + 3, 1, h - 6);
        rect(x, '#0a240a', X + 3, Y + 3, w - 6, h - 6);
      }
      function greenBg(x, X, Y, w, h) { for (let y = Y; y < Y + h; y++) for (let xx = X; xx < X + w; xx++) { const n = hash(xx, y) & 15; x.fillStyle = n === 0 ? '#167016' : n === 1 ? '#3aa03a' : '#228a22'; x.fillRect(xx, y, 1, 1); } }
      function stoneBtn(x, X, Y, w, h, label) { rect(x, '#18181c', X - 1, Y - 1, w + 2, h + 2); vgrad(x, X, Y, w, h, [[0, '#c4c4c8'], [1, '#9a9a9e']]); bev(x, X, Y, w, h, false); text(x, label, X + w / 2 + 1, Y + 2, '#000000', { center: true, adv: label.length > 5 ? 5 : 6 }); }
      function ring(x, c, cx, cy, rx, ry, rot) { for (let a = 0; a < 70; a++) { const t = a / 70 * TAU, px = Math.cos(t) * rx, py = Math.sin(t) * ry; rect(x, c, Math.round(cx + px * Math.cos(rot) - py * Math.sin(rot)), Math.round(cy + px * Math.sin(rot) + py * Math.cos(rot)), 1, 1); } }
      function rocketArt(x, cx, base, h, w, stripes) {
        for (const s of [-1, 1]) for (let k = 0; k < 6; k++) rect(x, k < 2 ? '#e8e8f0' : '#9898a4', cx + s * (Math.floor(w / 2) + 1 + Math.floor(k * .5)) - (s < 0 ? 0 : 0), base - 8 + k, 1, 8 - k);
        for (let c = 0; c < w; c++) { const u = c / Math.max(1, w - 1); rect(x, u < .35 ? '#ffffff' : u < .75 ? '#dcdce4' : '#9a9aa8', cx - Math.floor(w / 2) + c, base - h + 7, 1, h - 7); }
        for (let k = 0; k < 8; k++) { const ww = Math.max(1, Math.round((k + 1) / 8 * w)); rect(x, stripes ? (k < 5 ? '#e02020' : '#ffffff') : '#ffffff', cx - Math.floor(ww / 2), base - h + k, ww, 1); }
        if (stripes) for (let k = 0; k < 2; k++) rect(x, '#e02020', cx - Math.floor(w / 2), base - h + 13 + k * 6, w, 2);
        rect(x, '#6a6a78', cx - Math.floor(w / 2), base - 10, w, 1); rect(x, '#3a3a44', cx - 1, base, 3, 1);
      }
      function buildConsole() {
        const c = mk(W, H), x = c.getContext('2d');
        stoneFill(x, 0, 0, W, H, 2.2);
        bev(x, 0, 0, W, H, false);
        // corner portrait frames
        for (const k in CORNER) { const [X, Y] = CORNER[k]; greenFrame(x, X, Y, 64, 62); }
        // factory & radio icons
        for (const X of [68, 218]) { rect(x, '#18181c', X - 1, 11, 36, 36); bev(x, X, 12, 34, 34, false); bev(x, X + 2, 14, 30, 30, true); }
        // factory art
        vgrad(x, 71, 15, 28, 28, [[0, '#a8c8e8'], [1, '#e8eef4']]);
        for (let i = 0; i < 3; i++) { disc(x, '#c8c8cc', 79 + i * 3, 21 - i * 2, 2.5 + i * .4); disc(x, '#f0f0f4', 78 + i * 3, 20 - i * 2, 1.4); }
        rect(x, '#202024', 76, 22, 4, 12); rect(x, '#8a8a90', 77, 22, 2, 12); rect(x, '#202024', 83, 25, 4, 9); rect(x, '#8a8a90', 84, 25, 2, 9);
        rect(x, '#202024', 72, 30, 26, 13); rect(x, '#9a9aa4', 73, 31, 24, 11);
        for (let i = 0; i < 4; i++) { for (let k = 0; k < 5; k++) rect(x, '#5a5a64', 73 + i * 6 + k, 30 - Math.min(k, 3), 1, 1 + Math.min(k, 3)); }
        for (let i = 0; i < 6; i++) { rect(x, '#3a4a6a', 74 + i * 4, 34, 2, 3); rect(x, '#ffe080', 74 + i * 4, 38, 2, 2); }
        rect(x, '#6a6a74', 73, 41, 24, 1);
        // radio art
        vgrad(x, 221, 15, 28, 28, [[0, '#ff5020'], [.5, '#ffb040'], [1, '#ffe8a0']]);
        line(x, '#101010', 235, 18, 229, 42); line(x, '#101010', 235, 18, 241, 42); line(x, '#101010', 234, 18, 228, 42); line(x, '#101010', 236, 18, 242, 42);
        for (let k = 0; k < 6; k++) { const y = 22 + k * 3.6, hw = (y - 18) * .25; line(x, '#101010', 235 - hw, y, 235 + hw, y + 3.6); line(x, '#101010', 235 + hw, y, 235 - hw, y + 3.6); }
        rect(x, '#e02020', 234, 16, 2, 2);
        for (let r = 0; r < 3; r++) for (let a = -8; a <= 8; a++) { const an = a * .09; for (const s of [-1, 1]) rect(x, r === 1 ? '#ffffff' : '#e01010', 235 + s * Math.cos(an) * (5 + r * 3.5), 18 + Math.sin(an) * (5 + r * 3.5), 1, 1); }
        // logo plate
        bev(x, 104, 2, 112, 60, true);
        stoneFill(x, 106, 4, 108, 56, 1.8);
        const logo = (s, y) => {
          const sc = 3, adv = 16, wpx = s.length * adv - 1, x0 = 160 - Math.floor(wpx / 2);
          for (let pass = 0; pass < 2; pass++) for (let i = 0; i < s.length; i++) { const gl = FONT[s[i]]; for (let r = 0; r < 7; r++) for (let cc = 0; cc < 5; cc++) {
            if (!((gl[r] >> (4 - cc)) & 1)) continue;
            const X = x0 + i * adv + cc * sc, Y = y + r * sc;
            if (pass === 0) { rect(x, '#18181c', X - 1, Y - 1, sc + 2, sc + 2); continue; }
            rect(x, '#b4b4b8', X, Y, sc, sc);
            const on = (rr, c2) => rr >= 0 && rr < 7 && c2 >= 0 && c2 < 5 && ((gl[rr] >> (4 - c2)) & 1);
            if (!on(r - 1, cc)) rect(x, '#f0f0f4', X, Y, sc, 1);
            if (!on(r, cc - 1)) rect(x, '#dcdce0', X, Y, 1, sc);
            if (!on(r + 1, cc)) rect(x, '#5a5a60', X, Y + sc - 1, sc, 1);
            if (!on(r, cc + 1)) rect(x, '#6a6a70', X + sc - 1, Y, 1, sc);
          } }
        };
        logo('NUCLEAR', 7); logo('WAR', 35);
        // speech bar
        rect(x, '#18181c', 73, 64, 174, 13); rect(x, '#f4f4ec', 74, 65, 172, 11); rect(x, '#ffffff', 75, 65, 170, 1); rect(x, '#b8b8b0', 75, 75, 170, 1);
        rect(x, '#18181c', 73, 64, 1, 1); rect(x, '#18181c', 246, 64, 1, 1); rect(x, '#18181c', 73, 76, 1, 1); rect(x, '#18181c', 246, 76, 1, 1);
        // weapon panels
        const panels = [[1, 78], [1, 131], [261, 78], [261, 131]];
        for (const [X, Y] of panels) { greenFrame(x, X, Y, 58, 42); greenBg(x, X + 3, Y + 3, 52, 36); }
        // missiles art
        rocketArt(x, 13, 115, 31, 7, false); rocketArt(x, 30, 115, 26, 6, false); rocketArt(x, 46, 115, 21, 5, true);
        // warhead art: black bomb with yellow atom
        rect(x, '#101010', 26, 134, 6, 8); rect(x, '#3a3a3a', 27, 134, 2, 8); rect(x, '#101010', 21, 133, 16, 3); rect(x, '#4a4a4a', 22, 134, 14, 1);
        ball(x, 29, 153, 13, 14, ['#0a0a0a', '#1c1c1c', '#2e2e30', '#4a4a50', '#7a7a82'], '#000000');
        for (let r = 0; r < 3; r++) ring(x, '#ffe020', 29, 154, 9, 3.2, r * Math.PI / 3);
        disc(x, '#ffe020', 29, 154, 2); rect(x, '#fff8a0', 28, 153, 1, 1);
        // bomber art: grey jet side view
        { const X = 264, Y = 84;
          for (let k = 0; k < 14; k++) rect(x, k < 2 ? '#d8d8e0' : '#8a8a94', X + 18 + k, Y + 12 - Math.floor(k * .6), 18 - k, 1);
          ell(x, '#2a2a30', X + 26, Y + 15, 23, 3.6); ell(x, '#b8b8c4', X + 26, Y + 14.6, 22, 2.8); rect(x, '#e8e8f0', X + 6, Y + 13, 38, 1);
          for (let k = 0; k < 8; k++) rect(x, k ? '#9a9aa4' : '#e8e8f0', X + 40 - k, Y + 5 + k, 4 + k * .5, 1);
          for (let k = 0; k < 10; k++) rect(x, '#70707a', X + 14 + k * 2, Y + 17 + Math.floor(k * .55), 14 - k, 1);
          ell(x, '#3a5a8a', X + 10, Y + 13, 4, 1.4); rect(x, '#a0d0ff', X + 8, Y + 12, 2, 1);
          rect(x, '#2a2a30', X + 1, Y + 14, 4, 1); rect(x, '#ff6020', X + 49, Y + 14, 3, 2); }
        // defense art: radar dish + missile battery
        { const X = 264, Y = 134;
          rect(x, '#5ab84a', X, Y + 28, 52, 6); for (let i = 0; i < 52; i += 3) rect(x, '#3a8a2a', X + i, Y + 28 + (i % 2), 2, 1);
          rect(x, '#18181c', X + 18, Y + 18, 5, 11); rect(x, '#c8c8d0', X + 19, Y + 18, 3, 10);
          ell(x, '#18181c', X + 18, Y + 12, 12, 9); ell(x, '#e8e8f0', X + 17, Y + 11.5, 11, 8); ell(x, '#a8a8b8', X + 19, Y + 13, 7, 5); ell(x, '#6a6a7a', X + 20, Y + 14, 3, 2);
          line(x, '#18181c', X + 17, Y + 11, X + 27, Y + 4); rect(x, '#ff3030', X + 27, Y + 3, 2, 2);
          for (let i = 0; i < 3; i++) { rect(x, '#18181c', X + 34 + i * 5, Y + 17, 3, 11); rect(x, '#ffffff', X + 35 + i * 5, Y + 17, 1, 10); rect(x, '#e02020', X + 35 + i * 5, Y + 16, 1, 2); }
          rect(x, '#5a5a64', X + 32, Y + 26, 18, 3); }
        // labels
        const lab = (s, cx, y) => text(x, s, cx, y, '#ff2020', { center: true, shadow: '#400000' });
        lab('MISSILE', 30, 122); lab('WARHEAD', 30, 175); lab('BOMBER', 290, 122); lab('DEFENSE', 290, 175);
        // buttons + light sockets
        const meg = ['10MEG', '20MEG', '50MEG', '100MEG'];
        for (let i = 0; i < 4; i++) { stoneBtn(x, 69, 79 + i * 11, 32, 10, meg[i]); stoneBtn(x, 69, 132 + i * 11, 32, 10, meg[i]); rect(x, '#18181c', 60, 79 + i * 11, 8, 10); rect(x, '#18181c', 60, 132 + i * 11, 8, 10); }
        [['NP-1', 82], ['GR-2', 104], ['LNDS', 135], ['MEGA', 157]].forEach(([s, y]) => { stoneBtn(x, 219, y, 32, 10, s); rect(x, '#18181c', 252, y, 8, 10); });
        // map frame
        rect(x, '#18181c', VX - 3, VY - 3, VW + 6, VH + 6); bev(x, VX - 2, VY - 2, VW + 4, VH + 4, true);
        // message box
        bev(x, 68, 185, 184, 70, false); stoneFill(x, 70, 187, 180, 66, 2.6);
        rect(x, '#18181c', 72, 188, 176, 51); rect(x, '#fff4b0', 73, 189, 174, 49); rect(x, '#ffffd8', 73, 189, 174, 1); rect(x, '#c8b870', 73, 237, 174, 1);
        for (let i = 0; i < 2; i++) { bev(x, 74, 242 + i * 6, 172, 5, true); }
        for (const [X, Y] of [[69, 186], [247, 186], [69, 251], [247, 251], [3, 64], [314, 64]]) rivet(x, X, Y);
        return c;
      }
      let CONSOLE = null;
      function light(ctx, X, Y, n, blink) {
        const on = n > 0, col = on ? '#30e030' : '#e02020';
        rect(ctx, blink && (T >> 3) & 1 ? '#ffff80' : col, X + 1, Y + 1, 6, 8); rect(ctx, on ? '#a0ffa0' : '#ff8080', X + 1, Y + 1, 6, 1);
        if (on && n > 1) text(ctx, String(Math.min(9, n)), X + 2, Y + 2, '#043004');
      }
      function smiley(ctx, X, Y, mood) {
        const face = mood === 'angry' ? '#ff9a20' : '#ffe020';
        disc(ctx, '#3a2000', X + 5, Y + 5, 5.6); disc(ctx, face, X + 5, Y + 5, 4.7); rect(ctx, '#fff8b0', X + 3, Y + 2, 2, 1);
        rect(ctx, '#201000', X + 3, Y + 3, 1, 2); rect(ctx, '#201000', X + 7, Y + 3, 1, 2);
        if (mood === 'smile') { rect(ctx, '#201000', X + 2, Y + 6, 1, 1); rect(ctx, '#201000', X + 3, Y + 7, 5, 1); rect(ctx, '#201000', X + 8, Y + 6, 1, 1); }
        else if (mood === 'neutral') rect(ctx, '#201000', X + 3, Y + 7, 5, 1);
        else { rect(ctx, '#201000', X + 2, Y + 8, 1, 1); rect(ctx, '#201000', X + 3, Y + 7, 5, 1); rect(ctx, '#201000', X + 8, Y + 8, 1, 1); }
        if (mood === 'angry') { rect(ctx, '#201000', X + 2, Y + 2, 2, 1); rect(ctx, '#201000', X + 7, Y + 2, 2, 1); rect(ctx, '#201000', X + 4, Y + 3, 1, 1); rect(ctx, '#201000', X + 6, Y + 3, 1, 1); }
      }
      function moodOf(c) { const h = c.hate + (c.grudge === g.player ? 1 : 0); return h >= 3 ? 'angry' : h >= 1 ? 'frown' : c.L.aggr > .7 ? 'neutral' : 'smile'; }
      function drawCorner(ctx, c) {
        const [X, Y] = CORNER[c.slot];
        rect(ctx, '#a8d0ff', X + 3, Y + 3, 58, 56);
        const ex = exprFor(c);
        ctx.drawImage(portrait(c.li, ex, frOf(c, ex)), X + 4, Y + 3);
        if (c.dead) { rect(ctx, '#000010', X + 47, Y + 5, 11, 11); icoSkull(ctx, X + 49, Y + 7); }
        else smiley(ctx, X + 47, Y + 5, moodOf(c));
        text(ctx, String(Math.round(c.disp)), X + 59, Y + 18, '#e81818', { right: true, outline: '#ffffff' });
        const ny = c.slot <= 2 ? 66 : 249;
        const tad = c.L.tag.length > 10 ? 5 : 6, tw5 = c.L.tag.length * tad, lx = c.slot === 1 || c.slot === 3 ? Math.max(33, 1 + tw5 / 2) : Math.min(287, 319 - tw5 / 2);
        text(ctx, c.L.tag, lx, ny, c.dead ? '#802020' : '#ff2020', { center: true, adv: tad });
        const active = g.order[g.turn] === c && !c.dead && g.phase === 'run';
        const targ = g.phase === 'target' && !c.dead && !c.dying;
        if (active || targ) {
          const col = targ ? ((T >> 2) & 1 ? '#ff2020' : '#ffff40') : cyc(c.slot);
          rect(ctx, col, X, Y, 64, 1); rect(ctx, col, X, Y + 61, 64, 1); rect(ctx, col, X, Y, 1, 62); rect(ctx, col, X + 63, Y, 1, 62);
        }
      }
      function drawCityV(ctx, c, q) {
        const gx = VX + q.x, gy = VY + q.y, frac = q.pop / q.init;
        if (q.cap) {
          landmark(ctx, c.L.key, gx, gy, frac < .3, c.L.col, T);
          const n = q.bld.length, st = frac <= 0 ? 0 : Math.ceil(Math.min(1, frac) * n - .001);
          q.bld.forEach((b, i) => { if (i < st) building(ctx, b, gx + 4, gy, Math.max(3, Math.round(b.h * (.45 + .55 * Math.min(1, frac)))), true); else rubble(ctx, gx + 4 + b.dx, gy, b.w, q.burn, T, i); });
        } else {
          const n = q.hs.length, st = frac <= 0 ? 0 : Math.ceil(Math.min(1, frac) * n - .001);
          q.hs.forEach((h, i) => { if (i < st) house(ctx, gx + h.dx, gy + h.dy, h.roof); else rubble(ctx, gx + h.dx, gy + h.dy, 6, q.burn, T, i); });
        }
        if (q.pop > .05) text(ctx, q.pop < 1 ? q.pop.toFixed(1) : String(Math.round(q.pop)), q.lx > VX + VW - 8 ? gx - 16 : q.lx, gy - 8, '#ffffff', { outline: '#000010' });
      }
      function drawView(ctx) {
        const c = g.view, isl = c.isl;
        ctx.save();
        ctx.beginPath(); ctx.rect(VX, VY, VW, VH); ctx.clip();
        if (g.shake) ctx.translate(Math.round((rand() - .5) * g.shake), Math.round((rand() - .5) * g.shake * .6));
        ctx.drawImage(isl.cv, VX, VY);
        for (let i = 0; i < isl.waves.length; i += 2) { const k = ((i >> 1) * 5 + (T >> 4)) % 7; if (k < 2) rect(ctx, k ? '#6a5ae0' : '#a8a0ff', VX + isl.waves[i] + ((T >> 5) & 1), VY + isl.waves[i + 1], 3, 1); }
        radarIcon(ctx, VX + isl.radar.x, VY + isl.radar.y, T, c.dead);
        for (const q of isl.cities) drawCityV(ctx, c, q);
        if (c.shieldT > 0) {
          const p = islC(c), k = c.shieldT / 90, rx = 50, ry = 42;
          for (let a = 0; a < 160; a++) { const t = a / 160 * TAU, px = p.x + Math.cos(t) * rx, py = p.y + Math.sin(t) * ry; if (((a + (T >> 1)) % 8) < 7 * k + 1) rect(ctx, a % 16 < 8 ? '#c8f8ff' : '#3ab0ff', px, py, 2, 1); }
          for (let yy = -ry; yy <= ry; yy += 2) { const hw = rx * Math.sqrt(Math.max(0, 1 - (yy / ry) * (yy / ry))); for (let xx = -hw; xx <= hw; xx += 2) if (((xx + yy + (T >> 2)) & 7) === 0 && bay(xx + 99, yy + 99) < .4 * k) rect(ctx, '#7ad8ff', p.x + xx, p.y + yy, 1, 1); }
        }
        if (c.sat > 0 && !c.dead) { const [sx, sy] = satPos(c, T); icoSat(ctx, Math.round(sx) - 5, Math.round(sy) - 3, T); }
        const bs = g.booms.filter(b => b.c === c).sort((a, b) => a.gy - b.gy);
        for (const b of bs) { if (b.age > 200) ctx.globalAlpha = Math.max(0, 1 - (b.age - 200) / 60); mushroom(ctx, b); ctx.globalAlpha = 1; }
        drawParts(ctx); drawFx(ctx);
        const s = g.cur;
        if (s && s.k === 'launch' && !s.skip && s.b === c) {
          drawMissile(ctx, s);
          if (s.ax !== undefined && !s.missPop) { rect(ctx, '#ffffff', s.ax, s.ay, 2, 2); rect(ctx, '#ff9020', s.ax, s.ay + 2, 1, 1); }
          if (s.laser) { const [sx, sy] = satPos(s.b, T); line(ctx, '#ff3030', sx, sy + 2, s.px, s.py, 1); line(ctx, (T & 1) ? '#ffffff' : '#ffb0b0', sx + 1, sy + 2, s.px + 1, s.py, 1); }
        }
        if (s && s.k === 'prop' && s.b === c) drawProp(ctx, s);
        for (const f of g.floats) { if (f.t > f.life - 20 && (f.t & 2)) continue; text(ctx, f.s, f.x, Math.max(VY + 12, f.y - f.t * .22), f.col, { center: true, outline: '#000010' }); }
        if (g.flash > 0) { ctx.globalAlpha = Math.min(.85, g.flash / 12); rect(ctx, g.flashCol, VX, VY, VW, VH); ctx.globalAlpha = 1; }
        ctx.restore();
        // captions
        text(ctx, c === g.player ? 'YOU: ' + c.L.land : c.L.land, VX + 2, VY + 2, c === g.player ? '#ffe060' : lite(c.L.col, .3), { outline: '#000010', adv: 5 });
        text(ctx, (g.war ? 'WAR' : 'PEACE') + ' ' + Math.max(1, g.round + 1), VX + 2, VY + VH - 9, g.war ? '#ff6040' : '#80ff90', { outline: '#000010', adv: 5 });
        text(ctx, pad(g.score, 6), VX + VW - 2, VY + VH - 9, '#ffe060', { right: true, outline: '#000010', adv: 5 });
      }
      // sentence-case helper for the Amiga-style mixed-case speech bar and message box
      const MIXC = {}; let PROPER = null;
      const titleC = w => w.toLowerCase().replace(/(^|[\s.\-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
      function mixed(s) {
        let v = MIXC[s]; if (v) return v;
        if (!PROPER) { PROPER = []; for (const L of LEADERS) PROPER.push(L.name, L.tag, L.land, L.short); PROPER.sort((a, b) => b.length - a.length); }
        v = s.toLowerCase();
        for (const ph of PROPER) { const lp = ph.toLowerCase(); if (v.includes(lp)) v = v.split(lp).join(titleC(ph)); }
        v = v.replace(/(^|[.!?:]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/\bi\b/g, 'I').replace(/\bi'/g, "I'")
          .replace(/\b(\d+)(mt|meg|m)\b/g, (m, a, b) => a + b.toUpperCase()).replace(/\b(abms?|np-1|gr-2|tv|lnds|mega|x)\b/g, m => m.toUpperCase());
        if (Object.keys(MIXC).length > 400) for (const k in MIXC) delete MIXC[k];
        MIXC[s] = v; return v;
      }
      const PTR = ['KK........', 'KRWK......', 'KRRWK.....', 'KRRRWK....', 'KRRRRWK...', 'KRRRRRWK..', 'KRRRRRRWK.', 'KRRRRKKKKK', 'KRKKRRK...', 'KK..KRRK..', '.....KRRK.', '......KK..'];
      function renderWar(ctx) {
        if (!CONSOLE) CONSOLE = buildConsole();
        ctx.drawImage(CONSOLE, 0, 0);
        drawView(ctx);
        for (const c of g.cs) if (c.slot) drawCorner(ctx, c);
        // lights
        const p = g.player, warh = g.phase === 'warh';
        for (let i = 0; i < 4; i++) {
          light(ctx, 60, 79 + i * 11, p.d[i], g.selD === i);
          light(ctx, 60, 132 + i * 11, p.w[i], warh && p.w[i] > 0 && WARH[i].mt <= DELIV[g.di].cap);
        }
        light(ctx, 252, 82, p.d[4], g.selD === 4); light(ctx, 252, 104, p.d[5], g.selD === 5);
        light(ctx, 252, 135, p.abm, false); light(ctx, 252, 157, 1 + p.sat, false);
        // speech bar
        if (g.quip) {
          const q = g.quip, s = mixed((q.c === g.player ? q.c.L.short + ': ' : '') + q.text), w = tw(s) * 5 / 6;
          ctx.save(); ctx.beginPath(); ctx.rect(75, 66, 170, 9); ctx.clip();
          if (w <= 166) text(ctx, s, 160, 67, '#d81010', { center: true, adv: 5, mixed: 1 });
          else { const span = w + 60, off = Math.max(0, (T - q.t0 - 40) * .6) % span; text(ctx, s, 77 - off, 67, '#d81010', { adv: 5, mixed: 1 }); if (off > span - 172) text(ctx, s, 77 - off + span, 67, '#d81010', { adv: 5, mixed: 1 }); }
          ctx.restore();
        }
        // message box
        const lines = wrap(mixed(g.msg), 28).slice(0, 5);
        lines.forEach((l, i) => text(ctx, l, 76, 191 + i * 9, '#14143a', { mixed: 1 }));
        if (lines.length && g.phase !== 'run' || (g.cur && (g.cur.k === 'say' || g.cur.k === 'secret' || g.cur.k === 'banner'))) {
          const lx = 76 + tw(lines[lines.length - 1] || '') + 4, ly = 191 + (lines.length - 1) * 9;
          if (lx < 240) { rect(ctx, '#14143a', lx + 1, ly + 1, 5, 6); rect(ctx, '#14143a', lx + 2, ly, 3, 1); rect(ctx, (T >> 4) & 1 ? '#ff3030' : '#8a8a9a', lx + 2, ly + 1, 1, 2); rect(ctx, '#d8d8e0', lx + 3, ly + 1, 2, 2); }
        }
        // keyboard focus
        if (g.phase !== 'run' && g.phase !== 'build') { const f = NAVC[g.focus]; if (f && (T >> 3) & 1) { ctx.strokeStyle = '#00e0ff'; ctx.lineWidth = 1; ctx.strokeRect(f.x - 1.5, f.y - 1.5, f.w + 3, f.h + 3); } }
        if (g.phase === 'build' && g.offers) drawBuildWin(ctx);
        if (g.cur && g.cur.k === 'secret') drawSecret(ctx, g.cur);
        drawBanner(ctx);
        if (mouseSeen > 0) spr(ctx, PTR, { K: '#000000', R: '#e02010', W: '#ffd0a0' }, Math.round(api.mouse.x), Math.round(api.mouse.y));
      }

      // =================================================================
      //  TITLE
      // =================================================================
      function bigText(ctx, s, x, y, sc, rows, wt) {
        s = String(s).toUpperCase(); const adv = 6 * sc, wpx = s.length * adv - sc;
        x = Math.round(x - wpx / 2);
        for (let pass = 0; pass < 3; pass++) {
          let i = 0;
          for (const ch of s) {
            const gl = FONT[ch], ox = x + i * adv, oy = y + Math.round(Math.sin(wt + i * .7) * 3);
            if (gl) for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) {
              if (!((gl[r] >> (4 - c)) & 1)) continue;
              const X = ox + c * sc, Y = oy + r * sc;
              if (pass === 0) { rect(ctx, '#000000', X + 3, Y + 3, sc, sc); }
              else if (pass === 1) { rect(ctx, '#000022', X - 1, Y - 1, sc + 2, sc + 2); }
              else {
                rect(ctx, rows[r], X, Y, sc, sc);
                const up = r > 0 && (gl[r - 1] >> (4 - c)) & 1, lf = c > 0 && (gl[r] >> (5 - c)) & 1, dn = r < 6 && (gl[r + 1] >> (4 - c)) & 1;
                if (!up) rect(ctx, '#ffffff', X, Y, sc, 1);
                if (!lf) rect(ctx, lite(rows[r], .5), X, Y, 1, sc);
                if (!dn) rect(ctx, dark(rows[r], .45), X, Y + sc - 1, sc, 1);
              }
            }
            i++;
          }
        }
      }
      const LOGO1 = ['#e8f4ff', '#b8dcff', '#78acf0', '#3a6ac8', '#ffb050', '#ff7a1a', '#c84000'];
      const LOGO2 = ['#fff8a0', '#ffe040', '#ffb020', '#ff7a10', '#ff4a10', '#d02010', '#901000'];
      const SCROLL = '      NEW WORLD COMPUTING PRESENTS ...  NUCLEAR WAR VERSION 3  ...  NOW ON THE COMMODORE AMIGA IN 32 GLORIOUS COLOURS!  ...  BASED ON THE CARD GAME BY FLYING BUFFALO INC.  ...  CHOOSE YOUR LEADER, BUILD YOUR ARSENAL, SPREAD PROPAGANDA, DRAW TOP SECRETS AND MAKE THE WORLD SAFE FOR ... NOBODY!  ...  REMEMBER: THERE ARE NO WINNERS IN A NUCLEAR WAR. EXCEPT MAYBE YOU.  ...  GREETINGS TO ALL AMIGA FREAKS!';
      function renderTitle(ctx) {
        vgrad(ctx, 0, 0, W, H, [[0, '#000010'], [.5, '#06103a'], [1, '#000008']]);
        for (const s of STARS) { const x = (s[0] - T * s[2] * .25 % W + W) % W; rect(ctx, s[2] === 3 ? '#ffffff' : s[2] === 2 ? '#8aa0e0' : '#3a4a8a', x, s[1], 1, 1); }
        // copper bars
        const bars = [['#ff2a00', '#ffe060'], ['#0040ff', '#a0f0ff'], ['#a000c0', '#ffa0ff']];
        bars.forEach((b, k) => { const cy = 48 + Math.sin(T * .035 + k * 2.1) * 34; for (let i = 0; i < 14; i++) { const v = 1 - Math.abs(i - 6.5) / 7; rect(ctx, mix12(b[0], b[1], v * v), 0, Math.round(cy - 7 + i), W, 1); } });
        const bounce = -Math.round(Math.abs(Math.sin(T * .05)) * 7);
        bigText(ctx, 'NUCLEAR', 160, 10 + bounce, 4, LOGO1, T * .08);
        bigText(ctx, 'WAR', 160, 44 + bounce, 6, LOGO2, T * .08 + 2);
        // leaders line up
        const set = Math.floor(T / 480), lt = T % 480, exs = ['smug', 'laugh', 'talk', 'neutral', 'angry', 'talk'];
        for (let i = 0; i < 5; i++) {
          const li = (set * 3 + i * 1 + (set & 1) * 5) % 8;
          const tin = (lt - i * 10) / 30, tout = (lt - 450 + i * 4) / 20;
          let oy = 0;
          if (tin < 1) { const u = Math.max(0, tin); oy = (1 - u) * 130 - Math.sin(Math.min(1, u) * Math.PI) * 10; }
          if (tout > 0) oy = Math.min(1, tout) * 140;
          const x = 10 + i * 61, y = 96 + Math.round(oy);
          const ex = exs[(i + Math.floor(T / 100)) % exs.length], fr = ex === 'talk' ? [0, 1, 2, 1][(T >> 2) & 3] : ex === 'neutral' ? ((T + i * 40) % 150 < 6 ? 2 : 0) : (T >> 4) & 1;
          rect(ctx, cyc(i), x - 2, y - 2, 60, 60); rect(ctx, '#000010', x - 1, y - 1, 58, 58);
          ctx.drawImage(portrait(li, ex, fr), x, y);
          if (oy < 20) text(ctx, LEADERS[li].short, x + 28, y + 60, lite(LEADERS[li].col, .4), { center: true, shadow: '#000000' });
        }
        rect(ctx, '#000010', 0, 168, W, 52);
        if (api.credits === 0) { if (coinFlash > 0 || ((T >> 5) & 1)) text(ctx, 'INSERT COIN', 160, 172, coinFlash > 0 && ((T >> 2) & 1) ? '#ff3b2b' : '#ffd400', { center: true, scale: 2, outline: '#400000' }); }
        else if ((T >> 5) & 1) text(ctx, 'PUSH START', 160, 172, '#ffd400', { center: true, scale: 2, outline: '#400000' });
        text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), 110, 191, '#ffffff', { center: true });
        text(ctx, 'HI ' + pad(hi, 7), 214, 191, '#ffe060', { center: true });
        text(ctx, 'VERSION 3  \u00b7  \u00a9 1989 NEW WORLD COMPUTING', 160, 203, '#ff8800', { center: true });
        // sine scroller
        const off = (T * 1.5) % (SCROLL.length * 8);
        const rows = ['#ffffff', '#e0f8ff', '#a8ecff', '#50dcff', '#10c0f8', '#0898e8', '#3070e0'];
        rect(ctx, '#ff8800', 0, 222, W, 1); rect(ctx, '#ff8800', 0, 253, W, 1);
        for (let i = 0; i < 44; i++) {
          const ci = Math.floor((off + i * 8) / 8), ch = SCROLL[ci % SCROLL.length];
          const x = i * 8 - ((off) % 8), y = 234 + Math.round(Math.sin(T * .08 + x * .03) * 6);
          text(ctx, ch, x, y, '#00d0ff', { rows });
        }
      }
      function updTitle() {
        if (api.time >= musicAt) { if (musicAt === 0 || api.time - musicAt > 1) musicAt = api.time; music(); musicAt += 2.4; }
        if (api.anyPressed('Enter', 'Space') || api.mouse.clicked) {
          if (tryStart()) { mode = 'select'; T = 0; sel = 0; selT = 0; sfx.ok(); }
        }
      }

      // =================================================================
      //  LEADER SELECT
      // =================================================================
      const SEL_R = i => ({ x: 20 + (i % 4) * 76 - 2, y: 30 + Math.floor(i / 4) * 82 - 2, w: 60, h: 78 });
      function updSelect() {
        selT++;
        const o = sel;
        if (api.pressed('ArrowLeft')) sel = (sel + 7) % 8;
        if (api.pressed('ArrowRight')) sel = (sel + 1) % 8;
        if (api.pressed('ArrowUp') || api.pressed('ArrowDown')) sel = (sel + 4) % 8;
        let hit = -1; for (let i = 0; i < 8; i++) if (inR(SEL_R(i), api.mouse.x, api.mouse.y)) hit = i;
        if (hit >= 0 && (mouseMv || api.mouse.clicked)) sel = hit;
        if (sel !== o) { selT = 0; sfx.move(); }
        const talkLen = 40 + LEADERS[sel].intro.length * 1.6;
        if (selT < talkLen && selT % 4 === 1) sfx.voice(LEADERS[sel]);
        if (selT > 4 && (api.anyPressed('Enter', 'Space') || (api.mouse.clicked && hit === sel))) { sfx.fanfare(); newGame(sel); }
      }
      function renderSelect(ctx) {
        vgrad(ctx, 0, 0, W, H, [[0, '#0a0a30'], [.6, '#1a0a3a'], [1, '#000010']]);
        for (let i = 0; i < 16; i++) { const v = 1 - Math.abs(i - 7.5) / 8; rect(ctx, mix12('#002a6a', '#00d0ff', v * v), 0, 3 + i, W, 1); }
        text(ctx, 'CHOOSE YOUR LEADER', 160, 5, '#ffffff', { center: true, scale: 2, adv: 5, outline: '#000022', rows: LOGO1 });
        const talkLen = 40 + LEADERS[sel].intro.length * 1.6;
        for (let i = 0; i < 8; i++) {
          const r = SEL_R(i), L = LEADERS[i], on = i === sel;
          rect(ctx, on ? cyc(0) : dark(L.col, .4), r.x, r.y, 60, 60); rect(ctx, '#000010', r.x + 1, r.y + 1, 58, 58);
          const ex = on ? (selT < talkLen ? 'talk' : 'smug') : 'neutral', fr = ex === 'talk' ? [0, 1, 2, 1][(T >> 2) & 3] : ex === 'neutral' ? ((T + i * 37) % 170 < 6 ? 2 : 0) : (T >> 4) & 1;
          ctx.drawImage(portrait(i, ex, fr), r.x + 2, r.y + 2);
          if (!on) { ctx.globalAlpha = .35; rect(ctx, '#000010', r.x + 2, r.y + 2, 56, 56); ctx.globalAlpha = 1; }
          text(ctx, L.n1, r.x + 30, r.y + 62, on ? '#ffffff' : '#8090b0', { center: true });
          if (L.n2) text(ctx, L.n2, r.x + 30, r.y + 70, on ? lite(L.col, .3) : dark(L.col, .2), { center: true });
        }
        // intro balloon
        const L = LEADERS[sel], lines = wrap(L.intro, 44);
        const bh = lines.length * 9 + 18;
        rect(ctx, '#000010', 9, 197, 302, bh + 2); rect(ctx, '#ffffff', 10, 198, 300, bh);
        text(ctx, L.name + ' OF ' + L.land, 16, 201, dark(L.col, .35));
        lines.forEach((l, i) => text(ctx, l, 16, 211 + i * 9, '#101830'));
        if ((T >> 4) & 1) text(ctx, 'SPACE / CLICK TO LEAD ' + L.land, 160, 247, '#ffd040', { center: true, outline: '#000010' });
      }

      // =================================================================
      //  ENDINGS
      // =================================================================
      function updOver() {
        over.t++;
        if (over.kind === 'nobody' && over.t % 50 === 1 && over.booms.length < 6) over.booms.push(newBoom(40 + rand() * 240, 150 + rand() * 12, .7 + rand() * .4));
        for (const b of over.booms) b.age++;
        if (over.kind === 'nobody' && over.t % 50 === 2) sfx.boom(20);
        if (over.t > 720 || (over.t > 100 && (api.anyPressed('Enter', 'Space') || api.mouse.clicked))) { mode = 'title'; T = 0; musicAt = 0; g = null; }
      }
      const BGC = {};
      function dgrad(key, w, h, st) {
        let c = BGC[key]; if (c) return c;
        c = mk(w, h); const x = c.getContext('2d');
        const pal = []; for (let i = 0; i < 24; i++) pal.push(gradAt(st, i / 23));
        for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) { const f = y / (h - 1) * 23, i = Math.floor(f); x.fillStyle = pal[Math.min(23, i + ((f - i) > bay(xx, y) ? 1 : 0))]; x.fillRect(xx, y, 1, 1); }
        BGC[key] = c; return c;
      }
      function ruins(ctx, y0, t) {
        for (let i = 0; i < 26; i++) {
          const w = 6 + hash(i, 4) % 12, h = 8 + hash(i, 6) % 26, x = (hash(i, 2) % 340) - 10;
          rect(ctx, '#0c0408', x, y0 - h, w, h + 40);
          for (let k = 0; k < w; k += 2) rect(ctx, '#0c0408', x + k, y0 - h - (hash(i, k) % 4), 2, 4);
          if ((hash(i, 9) & 3) === 0 && ((t >> 3) + i) & 1) rect(ctx, '#ff6020', x + 2, y0 - h + 3, 1, 2);
        }
        for (let i = 0; i < 14; i++) { const ph = ((t * .4 + i * 23) % 120), x = 10 + (hash(i, 7) % 300) + ph * .2, y = y0 - 10 - ph; ctx.globalAlpha = Math.max(0, .5 - ph / 240); disc(ctx, '#5a4a50', x, y, 3 + ph * .06); ctx.globalAlpha = 1; }
      }
      function big2(ctx, li, ex, X, Y) { const pc = portrait(li, ex, (T >> 4) & 1); ctx.drawImage(pc, X, Y, 112, 112); }
      function renderOver(ctx) {
        const o = over;
        if (o.kind === 'nobody') {
          ctx.drawImage(dgrad('nb1', W, 160, [[0, '#100000'], [.6, '#5a0a04'], [1, '#d04010']]), 0, 0);
          ctx.drawImage(dgrad('nb2', W, 96, [[0, '#2a0a04'], [1, '#000000']]), 0, 160);
          for (let i = 0; i < 40; i++) rect(ctx, '#3a1008', (hash(i, 1) % W), 160 + (hash(i, 2) % 90), 3 + hash(i, 3) % 8, 1);
          for (const b of o.booms) { if (b.age < 260) { ctx.globalAlpha = b.age > 200 ? Math.max(0, 1 - (b.age - 200) / 60) : 1; mushroom(ctx, b); ctx.globalAlpha = 1; } }
          o.booms = o.booms.filter(b => b.age < 260);
          bigText(ctx, 'NOBODY', 160, 14, 4, LOGO2, T * .06);
          bigText(ctx, 'WINS', 160, 48, 4, LOGO2, T * .06 + 1);
          g && g.cs.forEach((c, i) => { const x = 22 + i * 58; rect(ctx, '#ff4020', x - 1, 181, 50, 50); ctx.drawImage(portrait(c.li, 'dead', (T >> 4) & 1), x, 182, 48, 48); });
          text(ctx, 'THE WORLD IS NOW SAFE FOR COCKROACHES.', 160, 238, '#ffa070', { center: true, outline: '#000000' });
        } else if (o.kind === 'win') {
          ctx.drawImage(dgrad('win', W, H, [[0, '#3a2000'], [.5, '#a06000'], [1, '#200800']]), 0, 0);
          for (let i = 0; i < 16; i++) for (let d = -2; d <= 2; d++) { const a = i / 16 * TAU + T * .01 + d * .012 * (1 + 0); for (let r = 30 + Math.abs(d) * 8; r < 220; r += 2) rect(ctx, i & 1 ? '#c88a28' : '#7a4a08', 160 + Math.cos(a) * r, 96 + Math.sin(a) * r, 2, 2); }
          const p = g.player;
          rect(ctx, cyc(0), 102, 38, 116, 116); rect(ctx, '#000010', 103, 39, 114, 114); big2(ctx, p.li, 'laugh', 104, 40);
          bigText(ctx, 'VICTORY!', 160, 4, 4, LOGO2, T * .08);
          text(ctx, p.L.name + ' RULES THE WORLD!', 160, 160, '#ffffff', { center: true, outline: '#000000' });
          text(ctx, '"' + p.L.win + '"', 160, 172, '#ffe080', { center: true, outline: '#000000' });
          text(ctx, 'SCORE ' + pad(o.score, 7) + '   HI ' + pad(hi, 7), 160, 190, '#ffffff', { center: true, outline: '#000000' });
          for (let i = 0; i < 6; i++) { const ph = (T + i * 40) % 120, fx = 30 + i * 52, fy = 120 - ph * .6; if (ph > 60) for (let k = 0; k < 12; k++) { const a = k / 12 * TAU, r = (ph - 60) * .5; rect(ctx, CYC[(i + k) % 7], fx + Math.cos(a) * r, fy + 36 + Math.sin(a) * r, 1, 1); } else rect(ctx, '#ffffff', fx, 120 - ph * .6 + 36, 1, 2); }
        } else {
          ctx.drawImage(dgrad('lose', W, H, [[0, '#000010'], [.55, '#2a0a24'], [.8, '#7a1a10'], [1, '#200404']]), 0, 0);
          ruins(ctx, 226, T);
          const p = g.player;
          rect(ctx, '#ff3020', 22, 46, 116, 116); rect(ctx, '#000010', 23, 47, 114, 114); big2(ctx, p.li, 'dead', 24, 48);
          bigText(ctx, 'GAME OVER', 160, 6, 4, LOGO2, T * .06);
          text(ctx, p.L.land + ' HAS BEEN', 230, 60, '#ffffff', { center: true });
          text(ctx, 'VAPORIZED.', 230, 70, '#ff6040', { center: true });
          if (o.winner) {
            const wv = o.winner;
            rect(ctx, cyc(0), 201, 87, 58, 58); rect(ctx, '#000010', 202, 88, 56, 56); ctx.drawImage(portrait(wv.li, 'laugh', (T >> 4) & 1), 202, 88);
            text(ctx, wv.L.short + ' WINS!', 230, 150, lite(wv.L.col, .3), { center: true, outline: '#000000' });
            text(ctx, '"' + wv.L.win + '"', 160, 176, '#ffe080', { center: true, outline: '#000000' });
          } else text(ctx, 'THE SURVIVORS FIGHT ON...', 230, 110, '#a0a0c0', { center: true });
          text(ctx, 'SCORE ' + pad(o.score, 7) + '   HI ' + pad(hi, 7), 160, 184, '#ffffff', { center: true, outline: '#000000' });
        }
        if (o.t > 100 && (T >> 4) & 1) text(ctx, 'PRESS START', 160, o.kind === 'nobody' ? 248 : 230, '#ffd040', { center: true, outline: '#000000' });
      }

      let mouseSeen = 0;
      if (/nwadebug/.test(location.search)) window.__nwa = { get g() { return g; }, newGame, kill, markDead, finish, push, doAttack, doSecret, SECRETS, setMode(m) { mode = m; }, get over() { return over; } };

      return {
        update() {
          frame++; T++; pollCoins(); if (coinFlash > 0) coinFlash--;
          mouseMv = api.mouse.x !== lastMX || api.mouse.y !== lastMY; if (mouseMv && lastMX >= 0) mouseSeen = 180; else if (mouseSeen > 0) mouseSeen--; lastMX = api.mouse.x; lastMY = api.mouse.y;
          skipLatch = api.anyPressed('Space', 'Enter') || api.mouse.clicked;
          if (mode === 'title') updTitle();
          else if (mode === 'select') updSelect();
          else if (mode === 'war') {
            updWorld();
            if (g.phase === 'run') { if (!runQueue() && mode === 'war' && g.phase === 'run') nextTurn(); }
            else updPlayer();
            if (g.cur && g.cur.k === 'say') { /* talking handled by step */ }
          } else updOver();
        },
        render(ctx) {
          if (mode === 'title') renderTitle(ctx);
          else if (mode === 'select') renderSelect(ctx);
          else if (mode === 'war') renderWar(ctx);
          else renderOver(ctx);
        }
      };
    }
  });
})();
