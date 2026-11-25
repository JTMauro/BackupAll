/* Recall batch: Compound Words, Missing Vowels (words) and Who's Who (gentle) */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor, store } = R;

  R.css(`
/* ---------- Compound Words ---------- */
.cw-wrap{max-width:560px;margin:0 auto;display:grid;gap:12px}
.cw-shelf{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;min-height:52px;align-items:center;
  background:rgba(0,0,0,.16);border-radius:18px;padding:6px 8px}
.cw-shelf .cw-empty{color:var(--on-table-soft);font:600 1.05rem var(--body)}
.cw-made{display:inline-flex;align-items:center;gap:6px;background:var(--card);color:var(--ink);border-radius:14px;
  padding:6px 12px;font:700 1.2rem var(--display);box-shadow:0 4px 0 var(--card-edge);animation:bounceIn .45s}
.cw-made b{font-size:1.5rem;font-weight:400}
.cw-board{display:grid;grid-template-columns:1fr 34px 1fr;gap:10px 6px;align-items:start}
.cw-col{display:grid;gap:12px}
.cw-colhead{text-align:center;color:var(--on-table-soft);font:600 1rem var(--display);margin-bottom:-4px}
.cw-plus{align-self:center;justify-self:center;color:var(--on-table);font:700 2rem var(--display);text-shadow:0 3px 0 rgba(0,0,0,.25)}
.cw-t{min-height:64px;width:100%;padding:6px 8px;font:700 clamp(1.25rem,5.2vw,1.55rem)/1.05 var(--display);cursor:pointer;
  display:flex;align-items:center;justify-content:center;gap:8px;border-radius:16px;transition:transform .12s,opacity .3s}
.cw-t .cw-e{font-size:1.6rem;font-weight:400;line-height:1}
.cw-t .cw-s{position:absolute;left:7px;top:5px;font-size:.8rem;opacity:.55}
.cw-t{position:relative}
.cw-t.cw-sel{transform:translateY(-5px) scale(1.05);outline:4px solid #fff;outline-offset:2px}
.cw-t.cw-done{--c:var(--good-bg);--d:var(--leaf-d);opacity:.55;pointer-events:none}
.cw-t.cw-done::after{content:'✓';position:absolute;right:8px;top:4px;color:var(--leaf-d);font-size:1.1rem}
.cw-t.cw-glow{animation:cwGlow 1s ease-in-out infinite}
@keyframes cwGlow{0%,100%{box-shadow:0 6px 0 var(--d),0 0 0 0 rgba(255,255,255,.9)}50%{box-shadow:0 6px 0 var(--d),0 0 0 9px rgba(255,255,255,.55)}}
.cw-pop{animation:pop .4s}
.cw-tools{display:flex;justify-content:center;gap:12px;flex-wrap:wrap}
.cw-big{position:fixed;left:50%;top:42%;transform:translate(-50%,-50%);z-index:30;pointer-events:none;font-size:110px;
  animation:cwBig 1.1s ease-out forwards;filter:drop-shadow(0 8px 6px rgba(0,0,0,.35))}
@keyframes cwBig{0%{transform:translate(-50%,-50%) scale(.2);opacity:0}25%{transform:translate(-50%,-50%) scale(1.15);opacity:1}70%{opacity:1}100%{transform:translate(-50%,-90%) scale(.9);opacity:0}}

/* ---------- Missing Vowels ---------- */
.mv-wrap{max-width:640px;margin:0 auto;display:grid;gap:16px}
.mv-card{background:var(--card);color:var(--ink);border-radius:26px;padding:20px 14px;text-align:center;
  box-shadow:0 7px 0 var(--card-edge),0 14px 26px rgba(0,0,0,.28)}
.mv-pic{font-size:64px;line-height:1.1;margin-bottom:6px}
.mv-code{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 22px;font:700 clamp(1.7rem,7.5vw,2.5rem)/1.2 var(--display);letter-spacing:.06em}
.mv-code.mv-long{font-size:clamp(1.45rem,6vw,2.1rem);gap:4px 18px}
.mv-w{white-space:nowrap}
.mv-v{display:none;color:var(--coral-d)}
.mv-v.mv-on{display:inline-block;animation:bounceIn .4s}
.mv-tag{display:inline-block;margin-top:10px;font:600 1rem var(--body);color:var(--ink-soft)}
.mv-ch{display:grid;gap:12px}
.mv-opt{width:100%;min-height:66px;font-size:clamp(1.25rem,5vw,1.55rem)!important;text-align:center}
.mv-opt.mv-right{--c:var(--leaf);--d:var(--leaf-d);animation:pop .4s}
.mv-opt.mv-nope{opacity:.35;pointer-events:none}
.mv-tools{display:flex;justify-content:center}

/* ---------- Who's Who ---------- */
.ww-wrap{max-width:620px;margin:0 auto;display:grid;gap:14px}
.ww-panel{background:var(--card);color:var(--ink);border-radius:26px;padding:16px;box-shadow:0 7px 0 var(--card-edge),0 14px 26px rgba(0,0,0,.28);display:grid;gap:12px}
.ww-row{display:flex;flex-wrap:wrap;justify-content:center;gap:12px}
.ww-label{font:600 1.25rem/1.25 var(--display);color:var(--ink-soft);text-align:center;margin:0}
.ww-small{font:400 1.05rem/1.3 var(--body);color:var(--ink-soft);text-align:center;margin:0}
.ww-big{font-size:1.35rem!important;min-height:72px!important}
.ww-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:12px}
.ww-exgrid{grid-template-columns:repeat(4,1fr);gap:8px}
.ww-exgrid .ww-ph{font-size:38px}
.ww-pc{position:relative;border:0;padding:6px 6px 8px;border-radius:18px;background:#fff;box-shadow:0 5px 0 var(--card-edge),0 8px 14px rgba(0,0,0,.18);
  display:grid;gap:4px;justify-items:center;cursor:pointer;font:600 1.1rem var(--display);color:var(--ink);min-height:56px}
.ww-pc.ww-arm{outline:4px solid var(--coral);outline-offset:2px}
.ww-pc .ww-n{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ww-ph{width:100%;aspect-ratio:1;border-radius:14px;object-fit:cover;display:grid;place-items:center;font-size:46px;background:var(--c,var(--sky));overflow:hidden}
.ww-ph img{width:100%;height:100%;object-fit:cover}
.ww-ex{position:absolute;top:-8px;left:50%;transform:translateX(-50%) rotate(-4deg);background:var(--sun);color:var(--ink);
  font:700 .85rem var(--display);padding:2px 9px;border-radius:9px;box-shadow:0 3px 0 var(--sun-d);letter-spacing:.04em}
.ww-hero{width:min(260px,72vw);aspect-ratio:1;margin:0 auto;border-radius:24px;overflow:hidden;display:grid;place-items:center;
  font-size:130px;background:var(--c,var(--sky));box-shadow:0 7px 0 var(--d,var(--sky-d)),0 14px 26px rgba(0,0,0,.3);animation:bounceIn .45s;position:relative}
.ww-hero img{width:100%;height:100%;object-fit:cover}
.ww-hero .ww-ex{top:10px;font-size:1rem}
.ww-name{font:700 clamp(2rem,9vw,2.8rem)/1.05 var(--display);text-align:center;margin:0;color:var(--ink)}
.ww-rel{font:600 clamp(1.3rem,5.5vw,1.6rem)/1.2 var(--display);text-align:center;margin:0;color:var(--ink-soft)}
.ww-q{font:400 1.25rem/1.3 var(--body);text-align:center;margin:0;color:var(--ink);background:var(--good-bg);border-radius:14px;padding:10px 12px}
.ww-nav{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ww-nav .btn{width:100%}
.ww-opts{display:grid;gap:12px}
.ww-opt{width:100%;min-height:70px;font-size:clamp(1.4rem,6vw,1.8rem)!important}
.ww-opt.ww-right{--c:var(--leaf);--d:var(--leaf-d);animation:pop .4s}
.ww-opt.ww-glow{animation:cwGlow 1s ease-in-out infinite;--c:var(--leaf);--d:var(--leaf-d)}
.ww-opt.ww-dim{opacity:.4}
.ww-form{display:grid;gap:10px}
.ww-form label{font:600 1.15rem var(--display);color:var(--ink)}
.ww-form input[type=text]{width:100%;box-sizing:border-box;font:400 1.3rem var(--body);padding:12px 14px;min-height:58px;border-radius:14px;
  border:3px solid var(--card-edge);background:#fff;color:var(--ink)}
.ww-form input[type=text]:focus{outline:none;border-color:var(--sky)}
.ww-prev{width:120px;height:120px;margin:0 auto;border-radius:18px;overflow:hidden;display:grid;place-items:center;font-size:56px;background:var(--sky)}
.ww-prev img{width:100%;height:100%;object-fit:cover}
.ww-note{font:400 1rem/1.3 var(--body);color:var(--on-table-soft);text-align:center;margin:0}
`);

  register({ id: 'compound', cat: 'words', order: 15, name: 'Compound Words', icon: '🌻', desc: 'Join two picture words to make one', gentle: false, start: startCompound });
  register({ id: 'vowels', cat: 'words', order: 16, name: 'Missing Vowels', icon: '🔡', desc: 'Words and sayings with the vowels taken out', gentle: false, start: startVowels });
  register({ id: 'whoswho', cat: 'gentle', order: 43, name: 'Who’s Who', icon: '👪', desc: 'A family photo album to look through', gentle: true, start: startWhosWho });

  const mkBtn = (label, cls, fn) => { const b = el('button', 'btn ' + cls); b.type = 'button'; b.textContent = label; b.onclick = fn; return b; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function chime(n) { tone(523 + n * 70, .14, 'triangle', .12); tone(659 + n * 70, .16, 'triangle', .1, .08); tone(784 + n * 70, .22, 'triangle', .09, .16); }

  /* =========================================================
     1. COMPOUND WORDS
     ========================================================= */
  // [first word, picture, second word, picture, picture of the whole word ('' if none)]
  const COMPOUNDS = [
    ['sun', '☀️', 'flower', '🌸', '🌻'], ['rain', '🌧️', 'bow', '🎀', '🌈'], ['foot', '🦶', 'ball', '🏐', '⚽'],
    ['tea', '🍵', 'pot', '🍲', '🫖'], ['butter', '🧈', 'fly', '🪰', '🦋'], ['cup', '☕', 'cake', '🍰', '🧁'],
    ['snow', '❄️', 'man', '👨', '⛄'], ['star', '⭐', 'fish', '🐟', ''], ['pan', '🍳', 'cake', '🍰', '🥞'],
    ['bed', '🛏️', 'room', '🚪', '🛌'], ['pop', '🎉', 'corn', '🌽', '🍿'], ['sun', '☀️', 'glasses', '👓', '🕶️'],
    ['tooth', '🦷', 'brush', '🖌️', '🪥'], ['straw', '🌾', 'berry', '🫐', '🍓'], ['lady', '👩', 'bird', '🐦', '🐞'],
    ['water', '💧', 'melon', '🍈', '🍉'], ['pine', '🌲', 'apple', '🍎', '🍍'], ['rain', '🌧️', 'coat', '🧥', ''],
    ['snow', '❄️', 'ball', '🏐', ''], ['foot', '🦶', 'print', '🖨️', '👣'], ['fire', '🔥', 'work', '🔧', '🎆'],
    ['fire', '🔥', 'man', '👨', '🚒'], ['light', '💡', 'house', '🏠', ''], ['sea', '🌊', 'horse', '🐴', ''],
    ['sea', '🌊', 'shell', '🐚', ''], ['sand', '🏖️', 'castle', '🏰', ''], ['arm', '💪', 'chair', '🪑', '🛋️'],
    ['door', '🚪', 'bell', '🔔', ''], ['hand', '✋', 'bag', '🛍️', '👜'], ['egg', '🥚', 'cup', '☕', ''],
    ['bath', '🛁', 'room', '🚪', ''], ['air', '🌬️', 'port', '⚓', '🛫'], ['cow', '🐮', 'boy', '👦', '🤠'],
    ['horse', '🐴', 'shoe', '👞', ''], ['gold', '🥇', 'fish', '🐟', '🐠'], ['jelly', '🍮', 'fish', '🐟', '🪼'],
    ['post', '📮', 'man', '👨', ''], ['post', '📮', 'box', '📦', ''], ['farm', '🚜', 'house', '🏠', '🏡'],
    ['green', '🟩', 'house', '🏠', ''], ['tree', '🌳', 'house', '🏠', ''], ['hair', '💇', 'brush', '🖌️', ''],
    ['hair', '💇', 'cut', '✂️', ''], ['tooth', '🦷', 'paste', '🧴', ''], ['book', '📖', 'case', '💼', '📚'],
    ['book', '📖', 'worm', '🪱', ''], ['earth', '🌍', 'worm', '🪱', ''], ['moon', '🌙', 'light', '💡', ''],
    ['sun', '☀️', 'light', '💡', ''], ['star', '⭐', 'light', '💡', '✨'], ['candle', '🕯️', 'stick', '🪵', ''],
    ['pea', '🫛', 'nut', '🌰', '🥜'], ['wall', '🧱', 'paper', '📄', ''], ['news', '📰', 'paper', '📄', ''],
    ['tea', '🍵', 'cup', '☕', ''], ['tea', '🍵', 'spoon', '🥄', ''], ['key', '🔑', 'hole', '🕳️', ''],
    ['butter', '🧈', 'cup', '☕', '🌼'], ['blue', '🔵', 'bell', '🔔', '🪻'], ['milk', '🥛', 'man', '👨', ''],
    ['ear', '👂', 'ring', '💍', ''], ['dragon', '🐉', 'fly', '🪰', ''], ['rose', '🌹', 'bud', '🌱', ''],
    ['shoe', '👞', 'lace', '🧵', ''], ['rain', '🌧️', 'drop', '💧', ''], ['snow', '❄️', 'drop', '💧', ''],
    ['sail', '⛵', 'boat', '🚤', ''], ['hedge', '🌳', 'hog', '🐗', '🦔'], ['wind', '🌬️', 'mill', '🏭', ''],
    ['cup', '☕', 'board', '🪵', ''], ['door', '🚪', 'mat', '🟫', ''], ['bed', '🛏️', 'time', '🕰️', '😴'],
    ['lunch', '🥪', 'box', '📦', '🍱'], ['sweet', '🍬', 'heart', '❤️', '💕'], ['basket', '🧺', 'ball', '🏐', '🏀'],
    ['water', '💧', 'fall', '🍂', ''], ['sun', '☀️', 'shine', '✨', ''], ['thunder', '⚡', 'storm', '🌪️', '⛈️'],
    ['cheese', '🧀', 'cake', '🍰', ''], ['fish', '🐟', 'bowl', '🥣', ''], ['blue', '🔵', 'berry', '🫐', ''],
    ['black', '⚫', 'bird', '🐦', ''], ['black', '⚫', 'board', '🪵', ''], ['honey', '🍯', 'bee', '🐝', ''],
    ['cat', '🐱', 'nap', '😴', ''], ['bull', '🐂', 'dog', '🐶', ''], ['house', '🏠', 'boat', '🚤', ''],
    ['bird', '🐦', 'song', '🎵', ''], ['sun', '☀️', 'hat', '👒', ''], ['oat', '🌾', 'meal', '🍽️', ''],
    ['grape', '🍇', 'fruit', '🍐', ''], ['ginger', '🫚', 'bread', '🍞', ''], ['rain', '🌧️', 'fall', '🍂', ''],
    ['sun', '☀️', 'rise', '🌅', '']
  ].map(([a, ae, b, be, w]) => ({ a, ae, b, be, w, word: a + b }));
  const CW_SET = new Set(COMPOUNDS.map(c => c.word));
  const CW_EASY = new Set(('sunflower rainbow football teapot butterfly cupcake snowman pancake bedroom popcorn sunglasses toothbrush strawberry ' +
    'ladybird watermelon pineapple goldfish cowboy snowball fireman armchair handbag starfish lunchbox basketball hedgehog raindrop doorbell ' +
    'teacup postman sandcastle seashell eggcup farmhouse').split(' '));

  // Pick n pairs whose words never cross-combine into a different compound, so each board has exactly one solution.
  function cwBoard(n, pool, avoid) {
    for (let tries = 0; tries < 400; tries++) {
      const out = [];
      for (const c of shuffle(pool.slice())) {
        if (avoid.has(c.word) && tries < 200) continue;
        if (out.some(o => o.a === c.a || o.b === c.b || o.word === c.word)) continue;
        if (out.some(o => CW_SET.has(o.a + c.b) || CW_SET.has(c.a + o.b))) continue;
        out.push(c); if (out.length === n) return out;
      }
    }
    return null;
  }
  R._cwBoard = cwBoard; R._cwSet = CW_SET; R._cwList = COMPOUNDS;

  function startCompound(L, api) {
    const pairs = L <= 2 ? 3 : L <= 4 ? 4 : 5;
    const boards = L <= 1 ? 2 : 3;
    const pics = L <= 4 || (L >= 9 && L % 3 === 0);
    const pool = L <= 2 ? COMPOUNDS.filter(c => CW_EASY.has(c.word)) : COMPOUNDS;
    const used = new Set();
    let b = 0, mistakes = 0, combo = 0;
    api.rounds(boards, 0);
    function board() {
      api.stage.innerHTML = '';
      const set = cwBoard(pairs, pool, used) || cwBoard(pairs, COMPOUNDS, new Set());
      set.forEach(c => used.add(c.word));
      const left = shuffle(set.slice()), right = shuffle(set.slice());
      const wrap = el('div', 'cw-wrap'), shelf = el('div', 'cw-shelf', '<span class="cw-empty">Your new words go here</span>');
      const grid = el('div', 'cw-board');
      const colL = el('div', 'cw-col', '<div class="cw-colhead">● First</div>'), colR = el('div', 'cw-col', '<div class="cw-colhead">★ Second</div>');
      const plus = el('div', 'cw-plus', '+');
      grid.append(colL, plus, colR);
      let sel = null, found = 0;
      const tiles = [];
      const mk = (c, side) => {
        const t = el('button', 'tile cw-t ' + (side === 'L' ? 'c-sun' : 'c-sky')); t.type = 'button';
        const w = side === 'L' ? c.a : c.b, e = side === 'L' ? c.ae : c.be;
        t.innerHTML = `<span class="cw-s">${side === 'L' ? '●' : '★'}</span>${pics ? `<span class="cw-e">${e}</span>` : ''}<span>${w}</span>`;
        t.setAttribute('aria-label', w);
        const rec = { c, side, t };
        t.onclick = () => tap(rec);
        tiles.push(rec); return t;
      };
      left.forEach(c => colL.append(mk(c, 'L')));
      right.forEach(c => colR.append(mk(c, 'R')));
      const help = mkBtn('💡 Help me', 'c-card', () => {
        sfx.tap();
        tiles.forEach(r => r.t.classList.remove('cw-glow'));
        const base = sel || tiles.find(r => r.side === 'L' && !r.done);
        if (!base) return;
        if (!sel) select(base);
        const mate = tiles.find(r => r.c === base.c && r !== base);
        mate.t.classList.add('cw-glow');
        api.hint(`${cap(base.c.a)} joins with the glowing word. Tap it!`);
      });
      const tools = el('div', 'cw-tools'); tools.append(help);
      wrap.append(shelf, grid, tools); api.stage.append(wrap);
      api.hint(b === 0 ? 'Tap a yellow word, then the blue word that joins it to make one new word.' : 'Here are some more. Join a yellow word to a blue word.');
      function select(r) { if (sel) sel.t.classList.remove('cw-sel'); sel = r; if (r) r.t.classList.add('cw-sel'); }
      function tap(r) {
        if (r.done) return;
        if (sel === r) { sfx.tap(); select(null); return; }
        if (!sel || sel.side === r.side) {
          sfx.tap(); select(r);
          api.hint(r.side === 'L' ? `${cap(r.c.a)}… now tap a blue word to join on the end.` : `…${r.c.b}. Now tap the yellow word that goes in front.`);
          return;
        }
        const L0 = sel.side === 'L' ? sel : r, R0 = sel.side === 'L' ? r : sel;
        if (L0.c === R0.c) {
          const c = L0.c; select(null); combo++; found++;
          tiles.forEach(x => x.t.classList.remove('cw-glow'));
          [L0, R0].forEach(x => { x.done = true; x.t.classList.add('cw-done', 'cw-pop'); });
          chime(Math.min(combo, 6));
          if (found === 1) shelf.innerHTML = '';
          shelf.append(el('span', 'cw-made', `${c.w ? `<b>${c.w}</b>` : ''}${c.word}`));
          if (c.w) { const big = el('div', 'cw-big', c.w); document.body.append(big); api.later(() => big.remove(), 1200); }
          api.hint(`${cap(c.a)} + ${c.b} = ${c.word.toUpperCase()}!`);
          if (found === pairs) {
            b++; api.rounds(boards, b);
            api.later(() => {
              if (!api.stage.isConnected) return;
              if (b === boards) { api.hint('You joined them all. Lovely work!'); api.done(starsFor(mistakes, 1, 4)); }
              else { toast(cheer()); board(); }
            }, 1500);
          } else if (combo >= 3) toast(cheer());
        } else {
          mistakes++; combo = 0; sfx.soft(); wob(r.t);
          api.hint(`“${L0.c.a}${R0.c.b}” isn’t a word. Try another blue word, or tap Help me.`);
          if (r.side === 'L') select(r);
        }
      }
    }
    board();
  }
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  /* =========================================================
     2. MISSING VOWELS
     ========================================================= */
  const MV_SHORT = [['CAT', '🐱'], ['DOG', '🐶'], ['SUN', '☀️'], ['HAT', '🎩'], ['CUP', '☕'], ['BUS', '🚌'], ['PIG', '🐷'], ['COW', '🐮'], ['BED', '🛏️'],
    ['FISH', '🐟'], ['BOOK', '📖'], ['TREE', '🌳'], ['MOON', '🌙'], ['BIRD', '🐦'], ['BOAT', '⛵'], ['BELL', '🔔'], ['DUCK', '🦆'], ['CAKE', '🍰'],
    ['MILK', '🥛'], ['KEY', '🔑'], ['HEN', '🐔'], ['FROG', '🐸'], ['BEAR', '🐻'], ['LION', '🦁'], ['SOCK', '🧦'], ['COAT', '🧥'], ['RING', '💍'],
    ['DOOR', '🚪'], ['KITE', '🪁'], ['DRUM', '🥁'], ['RAIN', '🌧️'], ['STAR', '⭐'], ['ROSE', '🌹'], ['LEAF', '🍃'], ['CORN', '🌽'], ['PEAR', '🍐'],
    ['SOUP', '🍲'], ['BIKE', '🚲'], ['SHIP', '🚢'], ['GIFT', '🎁'], ['TENT', '⛺'], ['SNOW', '❄️'], ['FIRE', '🔥'], ['HAND', '✋']];
  const MV_LONG = [['APPLE', '🍎'], ['HOUSE', '🏠'], ['CLOCK', '🕰️'], ['BREAD', '🍞'], ['TRAIN', '🚂'], ['HORSE', '🐴'], ['PIANO', '🎹'], ['TEAPOT', '🫖'],
    ['FLOWER', '🌸'], ['CANDLE', '🕯️'], ['GUITAR', '🎸'], ['RABBIT', '🐰'], ['BANANA', '🍌'], ['TURTLE', '🐢'], ['PENGUIN', '🐧'], ['MONKEY', '🐒'],
    ['CARROT', '🥕'], ['TOMATO', '🍅'], ['BUTTER', '🧈'], ['CHEESE', '🧀'], ['ORANGE', '🍊'], ['ROCKET', '🚀'], ['TELEPHONE', '☎️'], ['UMBRELLA', '☂️'],
    ['ELEPHANT', '🐘'], ['BUTTERFLY', '🦋'], ['RAINBOW', '🌈'], ['SNOWMAN', '⛄'], ['KITTEN', '🐈'], ['PUPPY', '🐕'], ['DONKEY', '🫏'], ['TIGER', '🐯'],
    ['ZEBRA', '🦓'], ['CAMEL', '🐫'], ['SPIDER', '🕷️'], ['PEANUT', '🥜'], ['LEMON', '🍋'], ['CHERRY', '🍒'], ['PUMPKIN', '🎃'], ['BALLOON', '🎈'],
    ['CASTLE', '🏰'], ['ANCHOR', '⚓'], ['PENCIL', '✏️'], ['SCISSORS', '✂️'], ['HAMMER', '🔨'], ['TRACTOR', '🚜'], ['DOLPHIN', '🐬'], ['OCTOPUS', '🐙']];
  const MV_PHRASES = ['CUP OF TEA', 'FISH AND CHIPS', 'SALT AND PEPPER', 'BREAD AND BUTTER', 'BACON AND EGGS', 'KNIFE AND FORK', 'CUP AND SAUCER',
    'BUCKET AND SPADE', 'HAPPY BIRTHDAY', 'GOOD MORNING', 'GOOD NIGHT', 'THANK YOU', 'CHEESE ON TOAST', 'SUNDAY ROAST', 'APPLE PIE', 'BEANS ON TOAST',
    'SUNNY DAY', 'CHRISTMAS TREE', 'FRONT DOOR', 'GARDEN GATE', 'ROSE GARDEN', 'BUS STOP', 'POST OFFICE', 'ICE CREAM', 'CHOCOLATE CAKE',
    'STRAWBERRIES AND CREAM', 'ROCK AND ROLL', 'NEEDLE AND THREAD', 'PEN AND PAPER', 'HAT AND COAT', 'SALT AND VINEGAR', 'MILK AND SUGAR',
    'TEA FOR TWO', 'CUP OF COCOA', 'BOWL OF SOUP', 'BIRTHDAY CAKE', 'SEASIDE PIER', 'FISHING BOAT', 'WEDDING DAY', 'SUMMER HOLIDAY',
    'GARDEN SHED', 'BOILED EGG', 'JAM SANDWICH', 'APPLE CRUMBLE', 'MORNING PAPER', 'SHEPHERD’S PIE', 'BANGERS AND MASH', 'TOAST AND MARMALADE'];
  const MV_SAYINGS = ['A STITCH IN TIME SAVES NINE', 'EVERY CLOUD HAS A SILVER LINING', 'THE EARLY BIRD CATCHES THE WORM', 'AN APPLE A DAY KEEPS THE DOCTOR AWAY',
    'TOO MANY COOKS SPOIL THE BROTH', 'MANY HANDS MAKE LIGHT WORK', 'LOOK BEFORE YOU LEAP', 'BIRDS OF A FEATHER FLOCK TOGETHER',
    'ACTIONS SPEAK LOUDER THAN WORDS', 'ROME WASN’T BUILT IN A DAY', 'THERE’S NO PLACE LIKE HOME', 'BETTER LATE THAN NEVER', 'PRACTICE MAKES PERFECT',
    'A WATCHED POT NEVER BOILS', 'HONESTY IS THE BEST POLICY', 'LAUGHTER IS THE BEST MEDICINE', 'TWO HEADS ARE BETTER THAN ONE',
    'SLOW AND STEADY WINS THE RACE', 'OUT OF SIGHT OUT OF MIND', 'STRIKE WHILE THE IRON IS HOT', 'MAKE HAY WHILE THE SUN SHINES', 'STILL WATERS RUN DEEP',
    'OLD HABITS DIE HARD', 'ONCE IN A BLUE MOON', 'AS BUSY AS A BEE', 'AS FIT AS A FIDDLE', 'AS GOOD AS GOLD', 'AS LIGHT AS A FEATHER', 'HOME SWEET HOME',
    'EVERY DOG HAS ITS DAY', 'DON’T CRY OVER SPILT MILK', 'IT TAKES TWO TO TANGO', 'ALL’S WELL THAT ENDS WELL', 'TIME FLIES WHEN YOU’RE HAVING FUN',
    'WHERE THERE’S A WILL THERE’S A WAY', 'THE BEST THINGS IN LIFE ARE FREE', 'A PICTURE PAINTS A THOUSAND WORDS', 'HOME IS WHERE THE HEART IS',
    'PATIENCE IS A VIRTUE', 'GREAT MINDS THINK ALIKE', 'NO NEWS IS GOOD NEWS', 'EASY COME EASY GO', 'FIRST COME FIRST SERVED',
    'RAINING CATS AND DOGS', 'AS CLEAR AS A BELL', 'AS COOL AS A CUCUMBER', 'AS SNUG AS A BUG IN A RUG', 'MIND YOUR PS AND QS'];
  const VOW = /[AEIOU]/;
  const skel = s => s.replace(/[AEIOU]/g, '').replace(/\s+/g, ' ').trim();

  function mvTier(L, i) {
    if (L <= 1) return 0;
    if (L === 2) return i < 3 ? 0 : 1;
    if (L === 3) return 1;
    if (L === 4) return i < 2 ? 1 : 2;
    if (L === 5) return 2;
    if (L <= 7) return i < 2 ? 2 : 3;
    return i === 0 ? 2 : 3;
  }
  function startVowels(L, api) {
    const total = 5, cardPic = L <= 1, showPics = L === 2;
    const used = new Set();
    let i = 0, mistakes = 0;
    const tiers = [MV_SHORT.map(([w, e]) => ({ t: w, e })), MV_LONG.map(([w, e]) => ({ t: w, e })), MV_PHRASES.map(t => ({ t })), MV_SAYINGS.map(t => ({ t }))];
    function round() {
      api.rounds(total, i); api.stage.innerHTML = '';
      const tier = tiers[mvTier(L, i)];
      const ans = shuffle(tier.filter(x => !used.has(x.t)))[0] || pick(tier);
      used.add(ans.t);
      const sk = skel(ans.t);
      const others = tier.filter(x => x !== ans && skel(x.t) !== sk)
        .map(x => ({ x, k: Math.abs(x.t.length - ans.t.length) + Math.random() * 5 })).sort((a, b) => a.k - b.k).slice(0, 2).map(o => o.x);
      const opts = shuffle([ans, ...others]);
      const wrap = el('div', 'mv-wrap'), card = el('div', 'mv-card');
      const code = el('div', 'mv-code' + (ans.t.length > 16 ? ' mv-long' : ''));
      const vowels = [];
      ans.t.split(' ').forEach(w => {
        const g = el('span', 'mv-w');
        [...w].forEach(ch => {
          if (VOW.test(ch)) { const v = el('span', 'mv-v'); v.textContent = ch; vowels.push(v); g.append(v); }
          else g.append(document.createTextNode(ch));
        });
        code.append(g);
      });
      card.append(code);
      card.append(el('div', 'mv-tag', ans.t.includes(' ') ? (mvTier(L, i) === 3 ? 'A well-known saying' : 'Two or three words') : 'One word'));
      const ch = el('div', 'mv-ch');
      let solved = false, shown = 0;
      const helper = mkBtn('', 'c-sun', () => { sfx.tap(); showVowel(); });
      const setHelper = () => { const left = vowels.length - shown; helper.textContent = left ? `🅰 Show a vowel (${left} hidden)` : 'All the vowels are showing'; helper.disabled = !left || solved; helper.style.opacity = helper.disabled ? .5 : 1; };
      function showVowel() {
        if (shown >= vowels.length) return;
        const v = vowels[shown++]; v.classList.add('mv-on'); tone(600 + shown * 40, .12, 'triangle', .1); setHelper();
      }
      opts.forEach(o => {
        const b = el('button', 'btn c-card mv-opt'); b.type = 'button';
        b.textContent = (showPics && o.e ? o.e + ' ' : '') + o.t;
        b.onclick = () => {
          if (solved) return;
          if (o === ans) {
            solved = true; b.classList.add('mv-right'); sfx.good(); vowels.forEach(v => v.classList.add('mv-on')); setHelper();
            api.hint(`Yes! ${cap(ans.t.toLowerCase())}.`); toast(cheer()); i++;
            api.later(() => {
              if (i === total) { api.rounds(total, i); api.hint('All done. Well spotted!'); api.done(starsFor(mistakes, 1, 3)); }
              else round();
            }, 1600);
          } else {
            mistakes++; b.classList.add('mv-nope'); sfx.soft(); wob(card);
            showVowel();
            api.hint('Not that one. Here is a vowel to help. Try again.');
          }
        };
        ch.append(b);
      });
      if (cardPic && ans.e) card.prepend(el('div', 'mv-pic', ans.e));
      const tools = el('div', 'mv-tools'); tools.append(helper); setHelper();
      wrap.append(card, ch, tools); api.stage.append(wrap);
      api.hint(i === 0 ? 'The vowels (A E I O U) have been taken out. Which one is it?' : 'Which one is it with the vowels put back?');
    }
    round();
  }

  /* =========================================================
     3. WHO'S WHO (a family album the carer fills in)
     ========================================================= */
  const WW_KEY = 'whoswho', WW_MAX = 12;
  const WW_COLORS = ['c-sky', 'c-peach', 'c-mint', 'c-grape', 'c-sun', 'c-rose', 'c-leaf', 'c-orange'];
  const WW_EXAMPLES = [
    { id: 'ex1', name: 'Mary', rel: 'your sister', emoji: '👵', ex: true },
    { id: 'ex2', name: 'Tom', rel: 'your grandson', emoji: '👦', ex: true },
    { id: 'ex3', name: 'Anne', rel: 'your daughter', emoji: '👩', ex: true },
    { id: 'ex4', name: 'Biscuit', rel: 'your dog', emoji: '🐕', ex: true }
  ];
  const WW_PROMPTS = ['What do you like doing with {n}?', 'What makes {n} smile?', 'What colour is {n} wearing here?', 'What would you like to say to {n}?',
    'What is {n} good at?', 'Does {n} look happy in this picture?', 'What would you have for tea with {n}?', 'Where might {n} be in this picture?'];
  let wwMem = null; // keeps people for this visit even if storage fails
  function wwLoad() {
    if (wwMem) return wwMem;
    try {
      const a = store.get(WW_KEY, []);
      wwMem = Array.isArray(a) ? a.filter(p => p && typeof p.name === 'string' && p.name.trim()).map(p => ({
        id: String(p.id || Math.random()), name: p.name.slice(0, 24), rel: typeof p.rel === 'string' ? p.rel.slice(0, 40) : '',
        img: typeof p.img === 'string' && p.img.startsWith('data:image/') ? p.img : ''
      })).slice(0, WW_MAX) : [];
    } catch (e) { wwMem = []; }
    return wwMem;
  }
  function wwSave(list) {
    wwMem = list;
    try { store.set(WW_KEY, list); const back = store.get(WW_KEY, null); return Array.isArray(back) && JSON.stringify(back) === JSON.stringify(list); } catch (e) { return false; }
  }
  function wwShrink(file) {
    return new Promise(res => {
      try {
        const fr = new FileReader();
        fr.onerror = () => res(null);
        fr.onload = () => {
          const img = new Image();
          img.onerror = () => res(null);
          img.onload = () => {
            try {
              const w = img.naturalWidth, h = img.naturalHeight; if (!w || !h) return res(null);
              const k = Math.min(1, 300 / Math.max(w, h)), W = Math.max(1, Math.round(w * k)), H = Math.max(1, Math.round(h * k));
              const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
              const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.drawImage(img, 0, 0, W, H);
              res(cv.toDataURL('image/jpeg', .78));
            } catch (e) { res(null); }
          };
          img.src = fr.result;
        };
        fr.readAsDataURL(file);
      } catch (e) { res(null); }
    });
  }
  const wwColor = p => WW_COLORS[[...(p.name || 'x')].reduce((s, c) => s + c.charCodeAt(0), 0) % WW_COLORS.length];
  function wwPhoto(p, cls) {
    const d = el('div', cls + ' ' + wwColor(p));
    if (p.img) { const im = el('img'); im.src = p.img; im.alt = 'Photo of ' + p.name; d.append(im); }
    else if (p.emoji) d.textContent = p.emoji;
    else d.textContent = (p.name || '?').trim().charAt(0).toUpperCase();
    if (cls === 'ww-hero') { d.style.font = p.img || p.emoji ? '' : '700 120px var(--display)'; }
    return d;
  }
  const wwLine = p => p.rel ? `${p.name}, ${p.rel}` : p.name;

  function startWhosWho(L, api) {
    const root = el('div', 'ww-wrap'); api.stage.append(root);
    const input = el('input'); input.type = 'file'; input.accept = 'image/*'; input.hidden = true; api.stage.append(input);
    let finished = false;
    const finish = () => { if (finished) return; finished = true; sfx.good(); api.done(3); };
    const people = () => wwLoad();

    function home() {
      root.innerHTML = ''; api.rounds(0, 0);
      const list = people();
      if (!list.length) return welcome();
      api.hint('Your family album. Look through it, or play a name game.');
      const panel = el('div', 'ww-panel');
      const r1 = el('div', 'ww-row');
      r1.append(mkBtn('📖 Look through', 'c-leaf ww-big', () => { sfx.tap(); look(list, 0); }));
      const m = mkBtn('🎯 Match the names', 'c-sky ww-big', () => { sfx.tap(); if (list.length >= 2) match(list); else api.hint('Add one more person to play the name game.'); });
      if (list.length < 2) m.style.opacity = .5;
      r1.append(m); panel.append(r1);
      const grid = el('div', 'ww-grid');
      let armed = null;
      list.forEach(p => {
        const c = el('button', 'ww-pc'); c.type = 'button';
        c.append(wwPhoto(p, 'ww-ph'), el('span', 'ww-n', esc(p.name)));
        c.setAttribute('aria-label', 'Change ' + p.name);
        c.onclick = () => {
          sfx.tap();
          if (armed !== c) { if (armed) armed.classList.remove('ww-arm'); armed = c; c.classList.add('ww-arm'); api.hint(`Tap ${p.name} again to change or remove.`); return; }
          edit(p);
        };
        grid.append(c);
      });
      panel.append(el('p', 'ww-small', 'For carers: tap a person twice to change them.'), grid);
      const r2 = el('div', 'ww-row');
      if (list.length < WW_MAX) r2.append(mkBtn('➕ Add someone', 'c-sun', () => { sfx.tap(); edit(null); }));
      else r2.append(el('p', 'ww-small', `The album is full (${WW_MAX} people).`));
      r2.append(mkBtn('✓ I’m finished', 'c-card', finish));
      panel.append(r2);
      root.append(panel, el('p', 'ww-note', '🔒 Photos and names stay only on this device.'));
    }

    function welcome() {
      api.hint('Add someone special: a photo, their name and who they are.');
      const panel = el('div', 'ww-panel');
      panel.append(el('p', 'ww-label', 'Make a family album of the people you love. A carer can help.'));
      const grid = el('div', 'ww-grid ww-exgrid');
      WW_EXAMPLES.forEach(p => {
        const c = el('div', 'ww-pc'); c.style.cursor = 'default';
        c.append(el('span', 'ww-ex', 'EXAMPLE'), wwPhoto(p, 'ww-ph'), el('span', 'ww-n', esc(p.name)));
        grid.append(c);
      });
      panel.append(grid);
      const r = el('div', 'ww-row'); r.append(mkBtn('➕ Add someone special', 'c-sun ww-big', () => { sfx.tap(); edit(null); })); panel.append(r);
      const r2 = el('div', 'ww-row');
      r2.append(mkBtn('👀 Try with the examples', 'c-leaf', () => { sfx.tap(); look(WW_EXAMPLES, 0); }));
      r2.append(mkBtn('✓ I’m finished', 'c-card', finish));
      panel.append(r2);
      root.append(panel, el('p', 'ww-note', '🔒 Photos and names stay only on this device.'));
    }

    function edit(p) {
      root.innerHTML = '';
      const isNew = !p;
      let img = p ? p.img : '', rmArmed = false;
      api.hint(isNew ? 'Choose a photo, then type their name and who they are.' : `Change ${p.name}’s details.`);
      const panel = el('div', 'ww-panel ww-form');
      const prev = el('div', 'ww-prev');
      const drawPrev = () => { prev.innerHTML = ''; if (img) { const im = el('img'); im.src = img; im.alt = 'Chosen photo'; prev.append(im); } else prev.textContent = '📷'; };
      drawPrev();
      const photoBtn = mkBtn(img ? '📷 Change the photo' : '📷 Choose a photo', 'c-sky', () => { sfx.tap(); input.click(); });
      input.onchange = async () => {
        const f = input.files && input.files[0]; input.value = '';
        if (!f) return;
        api.hint('Getting the photo ready…');
        const got = await wwShrink(f);
        if (!root.isConnected) return;
        if (!got) { api.hint('Sorry, that photo would not open. Try another one.'); return; }
        img = got; drawPrev(); photoBtn.textContent = '📷 Change the photo'; sfx.good();
        api.hint('Lovely photo. Now type their name.');
      };
      const nameIn = el('input'); nameIn.type = 'text'; nameIn.maxLength = 24; nameIn.placeholder = 'Tom'; nameIn.value = p ? p.name : ''; nameIn.id = 'ww-name';
      const relIn = el('input'); relIn.type = 'text'; relIn.maxLength = 40; relIn.placeholder = 'your grandson'; relIn.value = p ? p.rel : ''; relIn.id = 'ww-rel';
      const l1 = el('label', '', 'Their name'); l1.htmlFor = 'ww-name';
      const l2 = el('label', '', 'Who they are'); l2.htmlFor = 'ww-rel';
      const r0 = el('div', 'ww-row'); r0.append(photoBtn);
      panel.append(prev, r0, l1, nameIn, l2, relIn, el('p', 'ww-small', 'For example: “your grandson”, “your best friend”, “your neighbour”.'));
      const r = el('div', 'ww-row');
      r.append(mkBtn(isNew ? '✓ Add to the album' : '✓ Save changes', 'c-leaf ww-big', () => {
        const name = nameIn.value.trim(), rel = relIn.value.trim();
        if (!name) { sfx.soft(); api.hint('Please type their name first.'); nameIn.focus(); return; }
        const list = people().slice();
        const rec = { id: p ? p.id : 'p' + Date.now().toString(36) + randInt(1000), name, rel, img };
        if (isNew) { if (list.length >= WW_MAX) return home(); list.push(rec); } else { const k = list.findIndex(x => x.id === p.id); if (k >= 0) list[k] = rec; else list.push(rec); }
        const ok = wwSave(list); chime(2);
        if (ok) toast(isNew ? `${name} is in the album` : 'Saved');
        home();
        if (!ok) api.hint(`${name} is in the album for now, but this device couldn’t keep it for next time. Sorry about that.`);
      }));
      r.append(mkBtn('Cancel', 'c-card', () => { sfx.tap(); home(); }));
      panel.append(r);
      if (!isNew) {
        const rm = mkBtn(`Remove ${p.name}`, 'c-card', () => {
          sfx.tap();
          if (!rmArmed) { rmArmed = true; rm.textContent = 'Tap again to remove'; rm.classList.replace('c-card', 'c-coral'); api.hint(`Tap again to take ${p.name} out of the album.`); return; }
          const ok = wwSave(people().filter(x => x.id !== p.id));
          home();
          if (!ok) api.hint('Removed for now, but this device couldn’t save the change. Sorry about that.');
        });
        const r3 = el('div', 'ww-row'); r3.append(rm); panel.append(r3);
      }
      root.append(panel);
    }

    function look(list, k) {
      root.innerHTML = '';
      const p = list[k], ex = !!p.ex;
      const panel = el('div', 'ww-panel');
      const hero = wwPhoto(p, 'ww-hero');
      if (ex) hero.append(el('span', 'ww-ex', 'EXAMPLE'));
      const q = pick(WW_PROMPTS).replace('{n}', p.name);
      panel.append(hero, el('p', 'ww-name', esc(p.name)));
      if (p.rel) panel.append(el('p', 'ww-rel', esc(p.rel)));
      panel.append(el('p', 'ww-q', esc(q)));
      if (typeof R.say === 'function') {
        const r = el('div', 'ww-row');
        r.append(mkBtn('🔊 Say it', 'c-sun', () => { if (!R.say(wwLine(p))) api.hint(`${wwLine(p)}. (The sound is off, so here are the words.)`); }));
        panel.append(r);
      }
      const nav = el('div', 'ww-nav');
      const prevB = mkBtn('◀ Back', 'c-card', () => { sfx.tap(); look(list, (k - 1 + list.length) % list.length); });
      const nextB = mkBtn(k === list.length - 1 ? 'From the start ▶' : 'Next ▶', 'c-leaf', () => { sfx.tap(); look(list, (k + 1) % list.length); });
      nav.append(prevB, nextB); panel.append(nav);
      const r2 = el('div', 'ww-row');
      r2.append(mkBtn('🏠 Album', 'c-card', () => { sfx.tap(); home(); }), mkBtn('✓ I’m finished', 'c-card', finish));
      panel.append(r2);
      root.append(panel);
      api.rounds(list.length, k + 1);
      api.hint(`This is ${wwLine(p)}. ${q}`);
      tone(440 + k * 30, .2, 'sine', .08);
    }

    function match(all) {
      const withPh = all.filter(p => p.img), list = withPh.length >= 2 ? withPh : all;
      const nOpt = L >= 3 && list.length >= 3 ? 3 : 2;
      const total = list.length >= 5 ? 5 : 4;
      const order = [];
      while (order.length < total) shuffle(list.slice()).forEach(p => { if (order.length < total && order[order.length - 1] !== p) order.push(p); });
      let i = 0, mistakes = 0;
      function round() {
        root.innerHTML = ''; api.rounds(total, i);
        const p = order[i];
        const decoys = shuffle(list.filter(x => x !== p && x.name.trim().toLowerCase() !== p.name.trim().toLowerCase())).slice(0, nOpt - 1);
        const opts = shuffle([p, ...decoys]);
        const panel = el('div', 'ww-panel');
        panel.append(wwPhoto(p, 'ww-hero'));
        const box = el('div', 'ww-opts');
        let missed = false, solved = false;
        const btns = opts.map(o => {
          const b = mkBtn(o.name, 'c-card ww-opt', () => {
            if (solved) return;
            if (o === p) {
              solved = true; b.classList.remove('ww-glow'); b.classList.add('ww-right'); btns.forEach(x => x !== b && x.classList.add('ww-dim'));
              chime(i); api.hint(`Yes, this is ${wwLine(p)}.`); if (!missed) toast(cheer());
              i++;
              api.later(() => {
                if (i === total) { api.rounds(total, i); api.hint('What a lovely family album.'); api.done(starsFor(mistakes, 1, 3)); }
                else round();
              }, 1800);
            } else {
              mistakes++; missed = true; sfx.soft(); b.classList.add('ww-dim');
              const right = btns[opts.indexOf(p)]; right.classList.add('ww-glow');
              api.hint(`This is ${p.name}. Tap the glowing name.`);
            }
          });
          box.append(b); return b;
        });
        panel.append(box);
        const r = el('div', 'ww-row'); r.append(mkBtn('🏠 Album', 'c-card', () => { sfx.tap(); home(); })); panel.append(r);
        root.append(panel);
        api.hint('Who is this? Tap their name.');
      }
      round();
    }

    home();
  }
})();
