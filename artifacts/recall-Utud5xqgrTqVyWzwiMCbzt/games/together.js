/* Recall: games to share. Memory Lane Quiz (reminiscence), Pairs Together (two-player concentration),
   Photo Jigsaw (the player's own photo, shared with Photo Pairs). No timers, no losing, generous stars. */
(function () {
  const { register, el, randInt, pick, shuffle, wob, tone, sfx, toast, cheer, starsFor, store } = R;

  const lvl = L => Math.max(1, Math.floor(+L || 1));
  const mkBtn = (label, cls, fn) => { const b = el('button', 'btn ' + cls, label); b.type = 'button'; if (fn) b.onclick = fn; return b; };
  const finisher = api => { let d = false; return s => { if (d) return; d = true; api.done(Math.max(1, Math.min(3, s))); }; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  R.css(`
.tg-wrap{display:flex;flex-direction:column;align-items:stretch;gap:14px;max-width:660px;margin:0 auto;color:var(--on-table)}
.tg-row{display:flex;flex-wrap:wrap;justify-content:center;gap:12px}
.tg-panel{background:var(--card);color:var(--ink);border-radius:24px;padding:16px;box-shadow:0 7px 0 var(--card-edge),0 14px 26px rgba(0,0,0,.28)}
.tg-big{font-size:1.35rem!important;min-height:72px!important;padding:.6em 1.3em!important}
.tg-note{margin:0;text-align:center;font:600 1.1rem/1.3 var(--display);color:var(--on-table-soft)}
@keyframes tg-bounce{0%{transform:scale(.6)}60%{transform:scale(1.1)}100%{transform:scale(1)}}
@keyframes tg-glow{50%{box-shadow:0 0 0 6px var(--sun),0 0 24px 8px rgba(255,194,52,.75)}}
@keyframes tg-float{50%{translate:0 -6px}}

/* Memory Lane Quiz */
.tg-q{position:relative;text-align:center;font:600 clamp(1.3rem,4.6vw,1.65rem)/1.3 var(--display);text-wrap:balance;padding:18px 16px}
.tg-reg{display:inline-block;vertical-align:middle;margin:0 0 8px;font:700 .95rem/1 var(--display);letter-spacing:.06em;padding:.4em .8em;border-radius:999px;background:var(--sky);color:var(--ink);box-shadow:0 3px 0 var(--sky-d)}
.tg-reg.tg-uk{background:var(--coral);box-shadow:0 3px 0 var(--coral-d)}
.tg-opts{display:grid;grid-template-columns:repeat(var(--cols,2),1fr);gap:14px}
.tg-opt{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:118px;padding:12px 8px;border-radius:22px;cursor:pointer;
  font:600 clamp(1.15rem,4vw,1.35rem)/1.15 var(--display);text-align:center;transition:opacity .25s,transform .15s}
.tg-opt .tg-pic{font-size:clamp(2.4rem,10vw,3.2rem);line-height:1;filter:drop-shadow(0 3px 2px rgba(0,0,0,.2))}
.tg-opt.tg-nope{opacity:.35;pointer-events:none}
.tg-opt.tg-right{--c:var(--good-bg);--d:var(--leaf-d);animation:tg-bounce .45s}
.tg-talk{display:grid;gap:12px;justify-items:center;text-align:center;animation:tg-bounce .45s cubic-bezier(.3,1.5,.5,1)}
.tg-ans{display:flex;align-items:center;gap:14px;font:700 clamp(1.35rem,5vw,1.7rem)/1.2 var(--display);color:var(--leaf-d)}
.tg-ans .tg-pic{font-size:clamp(3rem,13vw,4rem);line-height:1}
.tg-fact{margin:0;font-size:1.25rem;line-height:1.4}
.tg-chat{width:100%;border-radius:18px;padding:12px 14px;background:#FFE6EE;box-shadow:inset 0 0 0 3px var(--rose)}
.tg-chat b{display:block;font:700 1.15rem var(--display);color:var(--rose-d)}
.tg-chat p{margin:4px 0 0;font:600 1.35rem/1.3 var(--display)}

/* Pairs Together */
.tg-score{display:flex;gap:10px;justify-content:center}
.tg-pl{flex:1 1 0;min-width:0;display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:18px;background:rgba(0,0,0,.2);transition:transform .25s,background .25s;border:3px solid transparent}
.tg-pl .tile{flex:none;width:40px;height:40px;font:700 1.3rem var(--display);border-radius:11px}
.tg-pl .tg-nm{min-width:0;flex:1;font:600 1.2rem/1.1 var(--display);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tg-pl .tg-pts{font:700 1.8rem/1 var(--display)}
.tg-pl.tg-on{background:var(--card);color:var(--ink);transform:translateY(-3px) scale(1.03);border-color:var(--pc)}
.tg-pl.tg-bump .tg-pts{animation:tg-bounce .45s}
.tg-board{display:grid;grid-template-columns:repeat(var(--cols),1fr);gap:clamp(7px,2vw,12px);width:100%;max-width:calc(var(--cols) * 104px);margin:0 auto}
.tg-card{aspect-ratio:1;perspective:800px;background:none;border:0;padding:0;cursor:pointer;min-width:56px}
.tg-in{position:relative;display:block;width:100%;height:100%;transition:transform .45s cubic-bezier(.3,1.3,.5,1);transform-style:preserve-3d}
.tg-card.tg-up .tg-in{transform:rotateY(180deg)}
.tg-bk,.tg-fc{position:absolute;inset:0;border-radius:16px;backface-visibility:hidden;-webkit-backface-visibility:hidden;display:grid;place-items:center;
  box-shadow:inset 0 -5px 0 rgba(0,0,0,.12),0 5px 0 var(--d),0 9px 14px rgba(0,0,0,.25)}
.tg-bk{--d:var(--grape-d);color:rgba(255,255,255,.85);font:700 1.6rem var(--display);
  background:radial-gradient(circle,rgba(255,255,255,.35) 0 22%,transparent 23%),repeating-linear-gradient(45deg,rgba(255,255,255,.16) 0 9px,transparent 9px 18px),var(--grape)}
.tg-fc{--d:var(--card-edge);background:var(--card);transform:rotateY(180deg);font-size:clamp(1.9rem,8.5vw,3rem);line-height:1}
.tg-card.tg-got .tg-fc{background:var(--pbg);--d:var(--pc);animation:tg-bounce .45s}
.tg-card.tg-got .tg-fc::after{content:attr(data-s);position:absolute;right:3px;top:3px;width:24px;height:24px;display:grid;place-items:center;border-radius:50%;background:var(--pc);color:#fff;font:700 .9rem/1 var(--display)}
.tg-card.tg-got{cursor:default}
.tg-card.tg-cpu .tg-fc{box-shadow:0 0 0 5px var(--sun),0 5px 0 var(--d)}
.tg-setup{display:grid;grid-template-columns:minmax(0,1fr);gap:14px}
.tg-setup h3{margin:0;text-align:center;font:600 1.5rem var(--display)}
.tg-mode{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.tg-mode .btn{flex-direction:column;gap:2px;min-height:86px;font-size:1.2rem;padding:.4em .5em}
.tg-mode .btn span{font-size:2rem;line-height:1}
.tg-mode .btn[aria-pressed="true"]{--c:var(--sun);--d:var(--sun-d);outline:4px solid #fff;outline-offset:3px}
.tg-who{display:flex;align-items:center;gap:10px}
.tg-who .tile{flex:none;width:56px;height:56px;font:700 1.7rem var(--display);border-radius:14px}
.tg-who input{flex:1;min-width:0;width:100%;height:62px;border-radius:16px;border:3px solid var(--card-edge);background:#fff;color:var(--ink);padding:0 14px;font:600 1.35rem var(--display)}
.tg-who input:focus{outline:4px solid var(--sun);outline-offset:1px}
.tg-who .tg-cpuname{flex:1;font:600 1.35rem var(--display);padding:0 6px}
.tg-final{display:grid;gap:12px;justify-items:center;text-align:center}
.tg-final h3{margin:0;font:700 clamp(1.6rem,6vw,2.1rem) var(--display)}
.tg-podium{display:flex;gap:14px;justify-content:center;width:100%}
.tg-pod{flex:1 1 0;max-width:220px;display:grid;justify-items:center;gap:4px;padding:12px 8px;border-radius:20px;background:var(--pbg);box-shadow:0 5px 0 var(--pc);animation:tg-bounce .5s both}
.tg-pod:nth-child(2){animation-delay:.15s}
.tg-pod .tg-cr{font-size:2.4rem;line-height:1;animation:tg-float 1.6s ease-in-out infinite}
.tg-pod b{font:700 1.3rem/1.1 var(--display);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tg-pod .tg-pts{font:700 2.4rem/1 var(--display)}
.tg-pod small{font:600 1.05rem var(--display);color:var(--ink-soft)}

/* Photo Jigsaw */
.tg-thumbs{display:flex;flex-wrap:wrap;justify-content:center;gap:12px}
.tg-th{width:84px;height:84px;padding:0;border:0;border-radius:16px;cursor:pointer;background-size:cover;background-position:center;box-shadow:0 0 0 4px #fff,0 6px 12px rgba(0,0,0,.3);transition:transform .15s}
.tg-th:active{transform:translateY(4px)}
.tg-jtop{display:flex;align-items:center;justify-content:center;gap:14px}
.tg-mini{width:76px;height:76px;flex:none;border-radius:12px;background-size:cover;box-shadow:0 0 0 4px #fff,0 6px 12px rgba(0,0,0,.3)}
.tg-jboard{position:relative;width:min(100%,400px);aspect-ratio:1;margin:0 auto;display:grid;grid-template-columns:repeat(var(--cols),1fr);grid-template-rows:repeat(var(--rows),1fr);
  border-radius:16px;background:var(--card);box-shadow:0 7px 0 var(--card-edge),0 14px 26px rgba(0,0,0,.3)}
.tg-guide{position:absolute;inset:0;border-radius:16px;background-size:100% 100%;opacity:.28;filter:grayscale(.3);pointer-events:none}
.tg-pc{position:relative;border:0;padding:0;cursor:pointer;min-width:56px;min-height:56px;background-size:calc(var(--cols) * 100%) calc(var(--rows) * 100%);border-radius:10px;transform:scale(.88);
  box-shadow:0 0 0 3px #fff,0 6px 0 rgba(0,0,0,.25),0 10px 16px rgba(0,0,0,.3);transition:transform .2s cubic-bezier(.3,1.5,.5,1)}
.tg-pc.tg-sel{transform:scale(.97) translateY(-6px);box-shadow:0 0 0 6px var(--sun),0 12px 18px rgba(0,0,0,.4);z-index:2}
.tg-pc.tg-lock{transform:none;border-radius:0;box-shadow:none;cursor:default}
.tg-pc.tg-new{animation:tg-lockb .6s cubic-bezier(.3,1.6,.5,1);z-index:3}
.tg-pc.tg-moved{animation:tg-bounce .35s}
.tg-pc.tg-target{outline:6px solid var(--sun);outline-offset:-6px;animation:tg-glow 1s infinite}
.tg-jboard.tg-whole{animation:tg-bounce .6s}
.tg-jboard.tg-whole .tg-guide{opacity:0}
@keyframes tg-lockb{0%{transform:scale(.88)}50%{transform:scale(1.1)}100%{transform:scale(1)}}
.tg-empty{display:grid;justify-items:center;gap:12px;text-align:center}
.tg-empty .tg-mini{width:120px;height:120px}
.tg-empty p{margin:0;font:600 1.25rem/1.3 var(--display);color:var(--ink-soft)}
`);

  /* =========================================================
     1. MEMORY LANE QUIZ
     Each entry: [region, question, [[pic, correct], [pic, wrong] x3], fact, talk]
     region: '' = everywhere, 'UK' = Britain, 'US' = America
     ========================================================= */
  const ML = [
    // the milkman and the doorstep
    ['', 'What did the milkman leave on the doorstep?', [['🥛', 'Glass bottles of milk'], ['📦', 'Cardboard boxes'], ['🥫', 'Tins of soup'], ['🧃', 'Cartons of juice']], 'The empty bottles were rinsed, put back out, and collected to be used again.', 'Did you have milk delivered? What was your milkman like?'],
    ['UK', 'Which part of the milk bottle did blue tits learn to peck through?', [['🔘', 'The foil top'], ['🍾', 'A cork'], ['🏷️', 'The paper label'], ['🧱', 'The glass']], 'The clever birds pecked through the foil caps to sip the cream at the top.', 'Did the birds ever get to your milk first?'],
    ['', 'What rose to the top of an old-fashioned bottle of milk?', [['🍦', 'The cream'], ['🧊', 'Ice'], ['🍯', 'Honey'], ['🫧', 'Soap bubbles']], 'Lots of families argued over who got the "top of the milk" for their cereal.', 'Who got the top of the milk in your house?'],
    ['UK', 'What did many British milkmen drive on their rounds?', [['🔋', 'An electric milk float'], ['🚂', 'A steam train'], ['🚁', 'A helicopter'], ['🛶', 'A canoe']], 'Milk floats hummed quietly along the streets in the early morning.', 'Do you remember the hum and clink of the milk float?'],
    ['', 'Before vans, what pulled many milk carts and bread carts?', [['🐴', 'A horse'], ['🐕', 'A team of dogs'], ['🐫', 'A camel'], ['🐘', 'An elephant']], 'Many cart horses knew the round so well that they stopped at each house on their own.', 'Did a horse and cart ever come down your street?'],
    ['', 'Which van played a tune to tell children it was coming?', [['🍦', 'The ice cream van'], ['📮', 'The post van'], ['🚚', 'The removal van'], ['🧺', 'The laundry van']], 'Children came running with their pennies as soon as they heard the chimes.', 'What was your favourite ice cream?'],
    ['US', 'What did the "Good Humor man" sell from his truck?', [['🍦', 'Ice cream bars'], ['🧹', 'Brooms'], ['📰', 'Newspapers'], ['🧵', 'Sewing thread']], 'Good Humor trucks rang bells as they drove slowly through the neighborhood.', 'Did you ever chase the ice cream truck?'],
    ['', 'What did the coal man carry on his back?', [['⚫', 'Sacks of coal'], ['🥔', 'Sacks of potatoes'], ['✉️', 'Letters'], ['🧸', 'Toys']], 'He tipped the coal into the coal shed, bunker or cellar, and left a black, dusty trail.', 'Did you have a coal fire at home? Who built it up in the morning?'],
    ['UK', 'What did the rag-and-bone man collect?', [['🧦', 'Old clothes and scrap'], ['🍎', 'Fresh fruit'], ['🐟', 'Fish'], ['📚', 'Library books']], 'He often came by with a horse and cart, calling out as he went. Some gave children a balloon in return.', 'Do you remember his call? What did he shout?'],
    ['US', 'In America before refrigerators, who delivered big blocks of ice?', [['🧊', 'The iceman'], ['👮', 'The policeman'], ['💈', 'The barber'], ['🎩', 'The banker']], 'The iceman carried the block with big tongs and put it in the icebox to keep food cool.', 'Did your family have an icebox or a refrigerator first?'],
    ['', 'Who cleaned the soot out of chimneys with long brushes?', [['🧹', 'The chimney sweep'], ['🥖', 'The baker'], ['💇', 'The hairdresser'], ['⛪', 'The vicar']], 'Many people thought it was lucky to see a sweep, especially on a wedding day.', 'Did a sweep ever come to your house?'],

    // telephones
    ['UK', 'What colour were Britain’s famous telephone boxes?', [['🟥', 'Red'], ['🟦', 'Blue'], ['🟩', 'Green'], ['🟨', 'Yellow']], 'The red kiosk was designed by Sir Giles Gilbert Scott, and thousands stood in towns and villages.', 'Do you remember making a call from a phone box?'],
    ['', 'How did you choose a number on an old telephone?', [['☎️', 'Turn a round dial'], ['📱', 'Tap a screen'], ['🗣️', 'Shout it out'], ['✉️', 'Write it down']], 'You put your finger in a hole and turned the dial round to the stop, one number at a time.', 'Can you remember a telephone number from long ago?'],
    ['UK', 'In an old British phone box, which button did you press when the call was answered?', [['🅰️', 'Button A'], ['🅱️', 'Button B'], ['⭐', 'The star'], ['🔔', 'The bell']], 'Button A put your money in so you could talk. Button B gave your money back if nobody answered.', 'Who would you ring from the phone box?'],
    ['US', 'In America, what was it called when neighbors shared one phone line?', [['🏘️', 'A party line'], ['🎂', 'A birthday line'], ['🚂', 'A train line'], ['🎣', 'A fishing line']], 'If you picked up the phone, you might hear the neighbors already chatting!', 'Did your family share a line with anyone?'],
    ['', 'Who connected your telephone call in the early days?', [['👩', 'The operator'], ['🤖', 'A robot'], ['👨‍🍳', 'The cook'], ['👮', 'A policeman']], 'Operators sat at a switchboard and plugged cords into holes to join the calls.', 'Did you ever have to "ask the operator" for a number?'],
    ['', 'What did you need to stick on a letter before you posted it?', [['📮', 'A stamp'], ['🍬', 'A sweet'], ['🎀', 'A bow'], ['🌸', 'A flower']], 'Lots of people collected stamps from all over the world in albums.', 'Did you collect stamps, or write to a pen pal?'],
    ['', 'What colour are post boxes in Britain, and mailboxes in America?', [['📮', 'Red in Britain, blue in America'], ['🟩', 'Green in both'], ['🟨', 'Yellow in both'], ['⬛', 'Black in both']], 'British pillar boxes are bright red. American mailboxes are blue.', 'Who wrote you the best letters?'],

    // records and radio
    ['', 'What did you play a vinyl record on?', [['🎶', 'A record player'], ['🍳', 'A frying pan'], ['🧺', 'A laundry basket'], ['📺', 'A television']], 'You lowered the needle carefully onto the edge of the record and the music began.', 'What was the first record you bought?'],
    ['', 'What speed did a small "single" record usually turn at?', [['4️⃣5️⃣', '45'], ['1️⃣0️⃣', '10'], ['9️⃣9️⃣', '99'], ['1️⃣2️⃣', '12']], 'Singles spun at 45 turns a minute. Long-playing records turned at 33, and older ones at 78.', 'Did you have a favourite single you played again and again?'],
    ['', 'What did you turn to play an old wind-up gramophone?', [['🔄', 'A handle'], ['🔋', 'A battery'], ['☀️', 'A sunshade'], ['🚲', 'Bicycle pedals']], 'Wind-up gramophones had a big horn to make the sound louder.', 'Did anyone in your family have a gramophone?'],
    ['', 'What did a jukebox do when you put a coin in?', [['🎵', 'Played a record'], ['🍔', 'Made a burger'], ['☕', 'Poured a coffee'], ['🎟️', 'Gave a ticket']], 'Jukeboxes in cafés and diners let you pick a song from dozens of records.', 'Which song would you pick on the jukebox?'],
    ['', 'Before TV, what did families gather round in the evening?', [['📻', 'The radio, or "wireless"'], ['💻', 'A computer'], ['📱', 'A mobile phone'], ['🎮', 'A games machine']], 'In Britain it was often called "the wireless". Families listened to comedies, plays, news and music together.', 'What did you listen to on the radio?'],
    ['', 'What did an old valve radio need to do before it played?', [['🔥', 'Warm up'], ['❄️', 'Cool down'], ['🚿', 'Have a wash'], ['💤', 'Have a nap']], 'The valves (called tubes in America) glowed orange and took a little while to warm up.', 'Where did the radio sit in your home?'],
    ['', 'Which small radio could you carry to the beach in the 1960s?', [['📻', 'A transistor radio'], ['📺', 'A television set'], ['⌨️', 'A typewriter'], ['🎹', 'A piano']], 'Transistor radios ran on batteries, so teenagers could take their music anywhere.', 'Did you have a little transistor radio?'],
    ['', 'In the 1970s, what did people use to tape songs off the radio?', [['📼', 'A cassette tape'], ['💿', 'A DVD'], ['💾', 'A floppy disk'], ['🧻', 'A paper roll']], 'You pressed Record and Play together, and hoped the DJ wouldn’t talk over the end!', 'Did you make your own tapes of favourite songs?'],
    ['', 'Who was called "the King of Rock and Roll"?', [['🎸', 'Elvis Presley'], ['🎺', 'Louis Armstrong'], ['🎹', 'Liberace'], ['🎤', 'Bing Crosby']], 'Elvis had his first big hit, Heartbreak Hotel, in 1956.', 'Were you an Elvis fan? Which song do you like best?'],
    ['', 'Which band from Liverpool caused "Beatlemania" in the 1960s?', [['🪲', 'The Beatles'], ['🏄', 'The Beach Boys'], ['💃', 'The Supremes'], ['🎻', 'The Shadows']], 'When they played on American TV in 1964, millions of people tuned in.', 'Who was your favourite Beatle?'],
    ['', 'Which singer was nicknamed "Ol’ Blue Eyes"?', [['🎤', 'Frank Sinatra'], ['🍸', 'Dean Martin'], ['🎙️', 'Perry Como'], ['🎹', 'Nat King Cole']], 'Frank Sinatra sang classics like "Fly Me to the Moon" and "My Way".', 'Did you have a favourite crooner?'],
    ['UK', 'Who sang "We’ll Meet Again" and was called the Forces’ Sweetheart?', [['🎤', 'Vera Lynn'], ['🌼', 'Doris Day'], ['🌈', 'Judy Garland'], ['🌃', 'Petula Clark']], 'Vera Lynn’s songs gave comfort and hope to many families in the 1940s.', 'Can you sing a line of "We’ll Meet Again"?'],
    ['', 'Who sang "Que Sera, Sera (Whatever Will Be, Will Be)"?', [['🌼', 'Doris Day'], ['🎤', 'Vera Lynn'], ['🤠', 'Patsy Cline'], ['💋', 'Dusty Springfield']], 'Doris Day sang it in a film in 1956, and it became a huge hit.', 'Did your mother or grandmother sing this song?'],
    ['', 'Which singer had a hit with "White Christmas"?', [['🎄', 'Bing Crosby'], ['🎸', 'Elvis Presley'], ['🪲', 'John Lennon'], ['🎺', 'Louis Armstrong']], 'Bing Crosby’s "White Christmas" is one of the best-selling records of all time.', 'What songs did your family play at Christmas?'],

    // television
    ['', 'What colour were the pictures on most early television sets?', [['🔳', 'Black and white'], ['🌈', 'Full colour'], ['🟩', 'All green'], ['🟦', 'All blue']], 'Colour TV only became common in homes in the late 1960s and 1970s.', 'Do you remember your first colour TV?'],
    ['', 'How did you change the channel on an old TV?', [['🚶', 'Get up and turn a knob'], ['🎛️', 'Use a remote control'], ['🗣️', 'Ask it nicely'], ['🔨', 'Tap it with a hammer']], 'Children were often sent to change the channel. They were the remote control!', 'Who was in charge of the TV in your house?'],
    ['', 'What did homes put on the roof, or on the TV, to get a picture?', [['📡', 'An aerial (antenna)'], ['🐓', 'A weathervane'], ['🪁', 'A kite'], ['🔔', 'A bell']], 'Indoor aerials were called "rabbit ears", and people moved them about to get a clearer picture.', 'Did you ever have to wiggle the aerial to fix the picture?'],
    ['UK', 'What did British TV show when no programmes were on?', [['🖼️', 'A test card'], ['🎞️', 'A cartoon'], ['⚽', 'A football match'], ['🍳', 'A cookery show']], 'The famous Test Card F showed a girl playing noughts and crosses with a toy clown.', 'Do you remember the test card, or the TV closing down at night?'],
    ['', 'What appeared in the middle of an old TV screen when you switched it off?', [['⚪', 'A small white dot'], ['🌈', 'A rainbow'], ['🕰️', 'A clock'], ['⭐', 'A star']], 'The picture shrank to a bright little dot that slowly faded away.', 'Did you watch the little dot disappear?'],
    ['US', 'Which much-loved TV comedy starred Lucille Ball?', [['❤️', 'I Love Lucy'], ['🧙', 'Bewitched'], ['🚌', 'The Honeymooners'], ['🦫', 'Leave It to Beaver']], 'I Love Lucy began in 1951, and Lucy’s funny schemes made the whole country laugh.', 'Which TV shows made your family laugh?'],
    ['UK', 'Who was Sooty?', [['🐻', 'A little yellow bear puppet'], ['🐶', 'A talking dog'], ['🐱', 'A cartoon cat'], ['🐰', 'A rabbit magician']], 'Sooty never spoke out loud. He whispered to Harry Corbett and waved his magic wand.', 'Which children’s programmes did you watch?'],
    ['UK', 'Where did Bill and Ben, the puppet men, live?', [['🪴', 'In flowerpots'], ['🏰', 'In a castle'], ['🚂', 'On a train'], ['🛶', 'In a boat']], 'Bill and Ben spoke in their own funny language, with Little Weed growing between them.', 'Can you remember any of the puppets from children’s TV?'],
    ['US', 'Who was Howdy Doody?', [['🤠', 'A cowboy puppet'], ['🦆', 'A cartoon duck'], ['🚀', 'A spaceman'], ['🎩', 'A magician']], 'The freckled puppet and Buffalo Bob were on American TV from 1947 to 1960.', 'What did you watch on TV after school?'],
    ['US', 'In America, what was a "TV dinner"?', [['🍱', 'A frozen meal on a tray'], ['📺', 'A dinner cooked by the TV'], ['🎉', 'A party for a new TV'], ['🧑‍🍳', 'A cookery show']], 'TV dinners came in a foil tray with little sections for meat, potatoes and vegetables.', 'Did your family ever eat in front of the TV?'],
    ['UK', 'In 1953, many British families crowded round a TV to watch what?', [['👑', 'The Coronation'], ['🌕', 'The Moon landing'], ['⚽', 'The World Cup final'], ['🏇', 'The Grand National']], 'Lots of people bought or rented their first TV to watch Queen Elizabeth II being crowned.', 'Where did you watch the Coronation? Was there a street party?'],
    ['UK', 'Whose message did British families listen to on Christmas Day afternoon?', [['👑', 'The King or Queen'], ['🥛', 'The milkman'], ['⚽', 'A football captain'], ['🌦️', 'The weatherman']], 'The royal Christmas message began on the radio in 1932 and was first shown on TV in 1957.', 'What did your family do on Christmas afternoon?'],

    // the pictures
    ['', 'Going to the cinema was often called going to…', [['🎞️', 'The pictures'], ['🥖', 'The bakery'], ['🏇', 'The races'], ['📚', 'The library']], 'It was also called "the flicks" in Britain and "the movies" in America.', 'Who did you go to the pictures with?'],
    ['UK', 'Who went to the Saturday morning cinema club?', [['🧒', 'Children'], ['👵', 'Grandparents'], ['🐶', 'Dogs'], ['👮', 'Policemen']], 'Clubs like the ABC Minors had cartoons, cowboy films and their own club song.', 'Did you go to Saturday morning pictures?'],
    ['US', 'What kind of movie theater could you watch from your car?', [['🚗', 'A drive-in'], ['🛶', 'A float-in'], ['✈️', 'A fly-in'], ['🚲', 'A pedal-in']], 'You hung a little speaker on the car window and watched the film on a giant screen.', 'Did you ever go to a drive-in?'],
    ['', 'Who showed you to your seat at the cinema with a torch (flashlight)?', [['🔦', 'An usherette'], ['🥛', 'The milkman'], ['📮', 'The postman'], ['💈', 'The barber']], 'The usherette also sold ice creams from a tray during the interval.', 'What did you like to eat at the pictures?'],
    ['', 'Which film star danced with Ginger Rogers in ten films?', [['🎩', 'Fred Astaire'], ['☔', 'Gene Kelly'], ['🤵', 'Cary Grant'], ['🤠', 'John Wayne']], 'Fred and Ginger glided across the floor in films like "Top Hat".', 'Did you have a favourite film star?'],
    ['', 'Who danced with an umbrella in "Singin’ in the Rain"?', [['☔', 'Gene Kelly'], ['🎩', 'Fred Astaire'], ['🎄', 'Bing Crosby'], ['🎬', 'Clark Gable']], 'Gene Kelly splashed through puddles in one of the happiest dance scenes ever filmed.', 'Do you like dancing in the rain?'],
    ['', 'Which curly-haired child star sang "On the Good Ship Lollipop"?', [['🍭', 'Shirley Temple'], ['🌈', 'Judy Garland'], ['🎶', 'Julie Andrews'], ['🌼', 'Doris Day']], 'Shirley Temple was one of the biggest film stars of the 1930s.', 'Did anyone try to give you Shirley Temple curls?'],
    ['', 'In "The Wizard of Oz", what colour were Dorothy’s magic slippers?', [['🔴', 'Ruby red'], ['🟢', 'Emerald green'], ['🔵', 'Sky blue'], ['🟡', 'Gold']], 'Dorothy clicked her ruby slippers together and said, "There’s no place like home."', 'Can you remember the songs from The Wizard of Oz?'],
    ['', 'Who starred as Maria in "The Sound of Music" in 1965?', [['🎶', 'Julie Andrews'], ['👒', 'Audrey Hepburn'], ['👑', 'Grace Kelly'], ['🌼', 'Doris Day']], 'Julie Andrews sang "Do-Re-Mi" and "My Favorite Things".', 'Which of the songs do you like best?'],
    ['', 'Which cartoon mouse first appeared in 1928 and became famous everywhere?', [['🐭', 'Mickey Mouse'], ['🐱', 'Felix the Cat'], ['🦆', 'Donald Duck'], ['🐰', 'Bugs Bunny']], 'Mickey Mouse whistled his way into "Steamboat Willie", one of the first cartoons with sound.', 'Which cartoons did you love?'],

    // ration books and the home front
    ['UK', 'In 1940s Britain, what did you need to buy butter and sugar?', [['📒', 'A ration book'], ['💳', 'A credit card'], ['📚', 'A library card'], ['🚌', 'A bus pass']], 'Food rationing in Britain finally ended in 1954. Shopkeepers stamped or cut coupons from the book.', 'Do you remember the ration books, or hearing about them?'],
    ['UK', 'Which treat came off the ration in Britain in 1953, to children’s delight?', [['🍬', 'Sweets'], ['🥦', 'Broccoli'], ['🍞', 'Bread'], ['🧂', 'Salt']], 'Children queued at sweet shops on the day sweets came off the ration.', 'What were your favourite sweets?'],
    ['', 'In wartime, people grew vegetables at home. Britain called it "Dig for…"?', [['🥕', 'Victory'], ['💰', 'Treasure'], ['🐛', 'Worms'], ['⛏️', 'Gold']], 'In America they were called Victory Gardens. Lawns and parks became vegetable patches.', 'Did your family grow vegetables? What grew best?'],
    ['US', 'What did American families use in the war to buy sugar, coffee and meat?', [['🎟️', 'Ration stamps'], ['💳', 'Credit cards'], ['🪙', 'Gold coins'], ['🐚', 'Seashells']], 'From 1942, every American had a ration book with little stamps to tear out.', 'Do you remember anyone talking about "making do"?'],
    ['UK', 'Which powdered food came in tins during wartime Britain?', [['🥚', 'Dried egg'], ['🍕', 'Pizza'], ['🍣', 'Sushi'], ['🍫', 'Chocolate cake']], 'Dried egg was mixed with water to make scrambled egg or cakes.', 'What did your mother cook when things were scarce?'],
    ['', 'What did people use to mend holes in socks?', [['🍄', 'A darning mushroom'], ['🍳', 'A frying pan'], ['🥖', 'A rolling pin'], ['🥄', 'A teaspoon']], 'It was all part of "make do and mend". Nothing was thrown away if it could be fixed.', 'Who did the darning and sewing in your house?'],

    // the corner shop and money
    ['', 'How were sweets often sold at the corner shop?', [['🫙', 'From big glass jars'], ['🤖', 'From a robot'], ['💻', 'On a computer'], ['🥫', 'In tin cans']], 'The shopkeeper weighed them out and tipped them into a paper bag.', 'Which sweets did you buy with your pocket money?'],
    ['', 'What did the grocer use to weigh sugar, flour and tea?', [['⚖️', 'Scales with weights'], ['📏', 'A ruler'], ['🧭', 'A compass'], ['⏱️', 'A stopwatch']], 'Loose goods were weighed and wrapped in paper bags or brown paper.', 'Do you remember the smell of the old grocer’s shop?'],
    ['', 'Which shop sold meat?', [['🥩', 'The butcher'], ['🥖', 'The baker'], ['👞', 'The cobbler'], ['🌸', 'The florist']], 'Many butchers had sawdust on the floor and a striped apron.', 'Which shops did you go to with your mother?'],
    ['', 'Who mended shoes?', [['👞', 'The cobbler'], ['🥩', 'The butcher'], ['🐟', 'The fishmonger'], ['🥛', 'The milkman']], 'Shoes were mended again and again with new soles and heels.', 'Did you have shoes mended, or Sunday-best shoes?'],
    ['', 'Where did you buy medicine and toothpaste?', [['💊', 'The chemist or drugstore'], ['🥩', 'The butcher'], ['🐟', 'The fishmonger'], ['🔨', 'The ironmonger']], 'Many American drugstores also had a counter selling milkshakes and sodas.', 'Which shops were on your high street or main street?'],
    ['US', 'What could you get at a drugstore soda fountain?', [['🥤', 'Milkshakes and ice cream sodas'], ['⛽', 'Gasoline'], ['🐎', 'A horse'], ['👓', 'Eyeglasses']], 'The young man behind the counter was called a "soda jerk".', 'What was your favourite treat at the soda fountain?'],
    ['UK', 'Before 1971, how many old pennies were in a shilling?', [['1️⃣2️⃣', '12'], ['🔟', '10'], ['2️⃣0️⃣', '20'], ['💯', '100']], 'There were 20 shillings in a pound, so 240 pennies. Decimal money arrived in February 1971.', 'Do you remember changing over to new money?'],
    ['UK', 'What was a "tanner" in old British money?', [['🪙', 'Sixpence'], ['💷', 'A pound'], ['🥉', 'A ha’penny'], ['🎩', 'A guinea']], 'A "bob" was a shilling, and a "tanner" was sixpence.', 'What could you buy with sixpence?'],
    ['UK', 'In old British money, what was a "bob"?', [['🪙', 'A shilling'], ['💷', 'A pound'], ['🥉', 'A penny'], ['💵', 'A dollar']], 'People still say "a few bob" to mean a bit of money.', 'How much pocket money did you get?'],
    ['US', 'In America, how much is a "nickel" worth?', [['5️⃣', '5 cents'], ['🔟', '10 cents'], ['2️⃣5️⃣', '25 cents'], ['1️⃣', '1 cent']], 'A dime was ten cents and a quarter was twenty-five. A nickel could buy a soda or a candy bar.', 'What could you buy with a nickel when you were young?'],
    ['', 'What was sold in a "five and dime" store, like Woolworth’s?', [['🧷', 'Cheap everyday odds and ends'], ['🚗', 'Cars'], ['🏠', 'Houses'], ['🐄', 'Cows']], 'Woolworth’s was in towns in both America and Britain, with its pick-and-mix sweets.', 'Did you go to Woolworth’s? What did you buy?'],
    ['', 'What could children take back to the shop to get a few pennies?', [['🍾', 'Empty glass bottles'], ['🍌', 'Banana skins'], ['📰', 'Old newspapers'], ['👟', 'Old shoes']], 'Pop bottles had a deposit on them, so children collected them for pocket money.', 'How did you earn your pocket money?'],
    ['', 'What did shoppers collect, stick in books and swap for gifts?', [['📗', 'Trading stamps'], ['📮', 'Postage stamps'], ['🍂', 'Autumn leaves'], ['🧾', 'Bus tickets']], 'Green Shield Stamps in Britain and S&H Green Stamps in America filled many kitchen drawers.', 'What did you save up for?'],
    ['', 'What did people often carry their shopping in?', [['🧺', 'A basket or string bag'], ['🧳', 'A suitcase'], ['🪣', 'A bucket'], ['🛷', 'A sledge']], 'Many women had a wicker basket on the arm, or a basket on the front of a bicycle.', 'Where did your family do the weekly shop?'],

    // school days
    ['', 'What did schoolchildren drink each morning from a little bottle?', [['🥛', 'Milk'], ['☕', 'Coffee'], ['🍵', 'Soup'], ['🫖', 'Tea']], 'In Britain it was a third of a pint, sometimes warm from the sun or icy in winter. American schools served milk too.', 'Did you like school milk? Who was the milk monitor?'],
    ['', 'What did the teacher write on at the front of the class?', [['⬛', 'A blackboard with chalk'], ['📱', 'A tablet'], ['🪟', 'The window'], ['🧱', 'The brick wall']], 'Clapping the chalk dust out of the board rubbers was a favourite job.', 'Who was your favourite teacher?'],
    ['', 'Where did children dip their pens at school?', [['🖋️', 'An inkwell'], ['🥣', 'A soup bowl'], ['🫖', 'A teapot'], ['🥛', 'A milk bottle']], 'An ink monitor filled the inkwells in the desks, and fingers often ended up inky!', 'Did you write with a dip pen or a fountain pen?'],
    ['', 'What did many children carry their school books in?', [['🎒', 'A satchel'], ['🧳', 'A suitcase'], ['🪣', 'A bucket'], ['🎩', 'A top hat']], 'Leather satchels lasted for years and were often handed down.', 'How did you get to school?'],
    ['', 'What did children chant rhymes to in the playground, with a rope?', [['🪢', 'Skipping (jump rope)'], ['⛳', 'Golf'], ['🎱', 'Snooker'], ['🎾', 'Tennis']], 'Two children turned the rope while others jumped in, chanting rhymes.', 'Do you remember any skipping rhymes?'],
    ['US', 'How did the school day often begin in America?', [['🇺🇸', 'The Pledge of Allegiance'], ['😴', 'A nap'], ['🍔', 'Lunch'], ['🎬', 'A movie']], 'Children stood with a hand on their heart and said the Pledge together.', 'What do you remember about your first school?'],
    ['UK', 'How did the school day often begin in Britain?', [['🎶', 'Assembly and a hymn'], ['😴', 'A nap'], ['🍰', 'Cake'], ['🏊', 'A swim']], 'The whole school gathered in the hall to sing a hymn and hear the notices.', 'Can you remember a hymn you sang at school?'],
    ['US', 'What colour is the famous American school bus?', [['🟨', 'Yellow'], ['🟥', 'Red'], ['🟪', 'Purple'], ['🟩', 'Green']], 'The bright yellow colour was chosen so the buses were easy to see.', 'Did you ride the bus to school, or walk?'],
    ['', 'How did many children learn their times tables?', [['🗣️', 'Chanting them out loud'], ['💤', 'In their sleep'], ['📺', 'From the TV'], ['🎮', 'From computer games']], '"Two twos are four, three twos are six…" The whole class chanted together.', 'Can you still say your seven times table?'],

    // seaside holidays
    ['UK', 'What animal could you ride on the beach at the British seaside?', [['🫏', 'A donkey'], ['🐘', 'An elephant'], ['🐪', 'A camel'], ['🦒', 'A giraffe']], 'Seaside donkeys often had their names on their bridles.', 'Did you have a donkey ride? What was its name?'],
    ['UK', 'Which puppet show was put on at the seaside?', [['🎭', 'Punch and Judy'], ['🩰', 'A ballet'], ['🤠', 'A rodeo'], ['🎻', 'An opera']], 'Children sat on the sand to watch, and shouted "He’s behind you!"', 'Did you watch Punch and Judy at the seaside?'],
    ['UK', 'Which seaside sweet has the town’s name running all the way through it?', [['🍭', 'A stick of rock'], ['🍩', 'A doughnut'], ['🍎', 'A toffee apple'], ['⚪', 'A gobstopper']], 'Blackpool, Brighton and many other resorts had their own rock.', 'Which seaside town did you go to?'],
    ['', 'What folding chair did people sit on at the beach?', [['🪑', 'A deckchair'], ['👑', 'A throne'], ['🛋️', 'A sofa'], ['🚽', 'A potty']], 'Putting up a deckchair without pinching your fingers was quite a skill!', 'Who fell asleep in the deckchair in your family?'],
    ['', 'What did people send home from their holidays?', [['💌', 'A postcard'], ['📠', 'A fax'], ['📱', 'A text message'], ['🏖️', 'A bucket of sand']], '"Having a lovely time. Wish you were here!"', 'Where did you go on your holidays?'],
    ['UK', 'Blackpool Tower was built to look like which famous tower?', [['🗼', 'The Eiffel Tower'], ['🕰️', 'Big Ben'], ['🏰', 'The Tower of London'], ['🏛️', 'The Leaning Tower of Pisa']], 'Blackpool Tower opened in 1894, with a famous ballroom inside.', 'Have you been up Blackpool Tower, or danced in the ballroom?'],
    ['UK', 'At holiday camps, what were the cheerful helpers in red jackets called?', [['🧥', 'Redcoats'], ['🔔', 'Bluebells'], ['🌲', 'Greenjackets'], ['👒', 'Yellowhats']], 'Redcoats ran the games, talent shows and knobbly knees contests.', 'Did you ever go to a holiday camp?'],
    ['US', 'Which New York beach had a famous fairground and hot dogs?', [['🎢', 'Coney Island'], ['🎬', 'Hollywood'], ['🌊', 'Niagara Falls'], ['🎰', 'Las Vegas']], 'Coney Island had roller coasters, a boardwalk and Nathan’s hot dogs.', 'Where did your family go on summer vacation?'],
    ['', 'What did children build on the beach with a bucket and spade (pail and shovel)?', [['🏰', 'A sandcastle'], ['🚀', 'A rocket'], ['🚂', 'A train'], ['⛪', 'A church']], 'The best sandcastles had a moat for the sea to fill.', 'Did you build sandcastles, or bury someone in the sand?'],
    ['', 'Which fluffy pink treat on a stick was sold at the fair and seaside?', [['🍭', 'Candy floss (cotton candy)'], ['🐟', 'Fish fingers'], ['🧅', 'Pickled onions'], ['🥣', 'Porridge']], 'It was spun from sugar in a big round drum, and it was very sticky!', 'What was your favourite treat at the fair?'],
    ['UK', 'What did people eat at the seaside, wrapped in paper?', [['🍟', 'Fish and chips'], ['🍝', 'Spaghetti'], ['🍲', 'Soup'], ['🎂', 'Birthday cake']], 'Salt and vinegar, eaten with your fingers, sitting on the sea wall.', 'Where was the best fish and chip shop you’ve known?'],
    ['', 'What did you put up on a windy beach to keep sheltered?', [['⛱️', 'A windbreak or beach umbrella'], ['🚪', 'A front door'], ['🧱', 'A brick wall'], ['🪟', 'A window']], 'A stripy windbreak hammered into the sand made a cosy spot for a picnic.', 'What did you take on a beach picnic?'],

    // toys and games
    ['', 'Which toy spins up and down on a string?', [['🪀', 'A yo-yo'], ['🪁', 'A kite'], ['🧸', 'A teddy bear'], ['🎲', 'A dice']], 'Clever players could do tricks like "walk the dog".', 'Could you do any yo-yo tricks?'],
    ['', 'Which plastic hoop craze swept the world in 1958?', [['⭕', 'The hula hoop'], ['🛞', 'The bicycle wheel'], ['🍩', 'The doughnut'], ['💍', 'The wedding ring']], 'Millions were sold, and children tried to keep them spinning for as long as they could.', 'Could you keep a hula hoop going?'],
    ['', 'What were most marbles made of?', [['🔮', 'Glass'], ['🍫', 'Chocolate'], ['🧶', 'Wool'], ['📄', 'Paper']], 'Players had favourites with swirls of colour, and big ones called "bonkers" or "shooters".', 'Did you have a favourite marble?'],
    ['', 'What did you draw on the pavement to play hopscotch?', [['🔢', 'Numbered squares in chalk'], ['🏠', 'A house'], ['🐟', 'A fish'], ['🌙', 'The moon']], 'You threw a stone onto a square, then hopped along to fetch it.', 'What games did you play in the street?'],
    ['', 'Which little toy cars came in a box the size of a matchbox?', [['🚗', 'Matchbox cars'], ['👞', 'Shoebox cars'], ['🍱', 'Lunchbox cars'], ['🧰', 'Toolbox cars']], 'They first went on sale in 1953 and children collected whole fleets of them.', 'Did you collect toy cars, or dolls?'],
    ['', 'Which fashion doll first appeared in 1959?', [['💃', 'Barbie'], ['🐻', 'Paddington'], ['🐭', 'Mickey Mouse'], ['🐶', 'Snoopy']], 'In Britain, Sindy arrived a few years later, in 1963.', 'Did you have a favourite doll or teddy?'],
    ['', 'Which building toy used metal strips, nuts and bolts?', [['🔩', 'Meccano'], ['🧸', 'A teddy bear'], ['🪁', 'A kite'], ['🎨', 'A paint box']], 'Meccano was made in Britain. In America a similar set was called an Erector set.', 'What did you like to build?'],
    ['', 'Which wooden toy could children ride without going anywhere?', [['🐴', 'A rocking horse'], ['🚲', 'A racing bike'], ['🛶', 'A canoe'], ['🚂', 'A train set']], 'Dappled grey rocking horses with real hair manes were especially loved.', 'Did you have a rocking horse or a tricycle?'],
    ['', 'What did you turn with a key to make a tin toy move?', [['🔑', 'A clockwork spring'], ['🔋', 'A battery'], ['☀️', 'A solar panel'], ['🕯️', 'A candle']], 'Wind-up tin toys whirred along the floor until the spring ran down.', 'What was the best present you ever got?'],
    ['', 'What did children fly on a windy day?', [['🪁', 'A kite'], ['🧸', 'A teddy'], ['🎲', 'A dice'], ['🪀', 'A yo-yo']], 'Many children made their own kites from paper, sticks and string.', 'Where did you go to fly a kite?'],
    ['', 'In which board game do you buy streets and build houses?', [['🎩', 'Monopoly'], ['🐍', 'Snakes and Ladders'], ['🎲', 'Ludo'], ['⚫', 'Draughts (checkers)']], 'The British board has London streets, and the American board has Atlantic City streets.', 'Who always won at Monopoly in your family?'],
    ['', 'Which word game uses little letter tiles on a board?', [['🔤', 'Scrabble'], ['🎱', 'Snooker'], ['♟️', 'Chess'], ['🃏', 'Snap']], 'High-scoring letters like Q and Z were worth ten points.', 'Did your family play board games together?'],
    ['', 'The teddy bear was named after which American president?', [['🧸', 'Theodore "Teddy" Roosevelt'], ['🎩', 'Abraham Lincoln'], ['🦅', 'George Washington'], ['🥜', 'Jimmy Carter']], 'In 1902, the president refused to shoot a bear on a hunting trip, and toy makers named a bear after him.', 'Did you have a teddy bear? What was its name?'],
    ['', 'Which drawing toy had two white knobs and a grey screen?', [['🖍️', 'Etch A Sketch'], ['📷', 'A camera'], ['📻', 'A radio'], ['⌨️', 'A typewriter']], 'You turned one knob to draw across and one to draw up and down, then shook it to start again.', 'Did you like drawing or colouring as a child?'],
    ['', 'Which springy toy could "walk" down the stairs?', [['🌀', 'A Slinky'], ['🪀', 'A yo-yo'], ['🪁', 'A kite'], ['🎯', 'A dartboard']], 'The Slinky was invented in America in the 1940s.', 'Did you ever send a Slinky down the stairs?'],
    ['UK', 'What big orange ball with "ears" did children bounce along on in the 1970s?', [['🟠', 'A space hopper'], ['🎈', 'A balloon'], ['🏀', 'A basketball'], ['🍊', 'An orange']], 'You held on to the handles on top and bounced as far as you could.', 'Did you or your children have a space hopper?'],
    ['UK', 'What did British children thread on string to play conkers?', [['🌰', 'Horse chestnuts'], ['🍎', 'Apples'], ['🥔', 'Potatoes'], ['🥚', 'Eggs']], 'Some children soaked their conkers in vinegar or baked them to make them harder!', 'Did you play conkers? Did you have a champion one?'],
    ['', 'What did children play with a little ball and small metal stars?', [['⭐', 'Jacks'], ['🎳', 'Bowling'], ['🏏', 'Cricket'], ['🏓', 'Ping-pong']], 'You bounced the ball and scooped up the jacks before catching it again.', 'What games did you play with your friends?'],
    ['', 'Which toy do you bounce along on, with a spring and two foot rests?', [['🦘', 'A pogo stick'], ['🛹', 'A skateboard'], ['🛷', 'A sledge'], ['🛴', 'A scooter']], 'Pogo sticks were a big craze, and great for showing off.', 'Were you a daring child or a careful one?'],

    // kitchen and home
    ['', 'What squeezed water out of wet washing between two rollers?', [['🧺', 'A mangle (wringer)'], ['🍞', 'A toaster'], ['🫖', 'A kettle'], ['📻', 'A radio']], 'You turned the big handle and the flattened washing came out the other side.', 'Did you help with wash day? What was the hardest part?'],
    ['', 'Which day of the week was traditionally wash day?', [['1️⃣', 'Monday'], ['5️⃣', 'Friday'], ['6️⃣', 'Saturday'], ['7️⃣', 'Sunday']], 'Monday was wash day in many homes, often with leftovers from Sunday’s dinner.', 'What did your family have on a Monday?'],
    ['', 'What held wet washing on the line?', [['📎', 'Pegs (clothespins)'], ['🩹', 'Sticky plasters'], ['🔨', 'Nails'], ['🍯', 'Honey']], 'Wooden pegs were kept in a peg bag, and some were sold door to door.', 'Do you like the smell of washing dried outside?'],
    ['', 'Where was food kept cool before most homes had a fridge?', [['🧊', 'A larder or icebox'], ['🔥', 'The oven'], ['🛏️', 'Under the bed'], ['🚗', 'In the car']], 'A cool larder often had a stone shelf and a little window covered in mesh.', 'What did your family keep in the larder or pantry?'],
    ['', 'Which pot cooked food quickly with a loud hiss?', [['♨️', 'A pressure cooker'], ['🫖', 'A teapot'], ['🥣', 'A mixing bowl'], ['🧺', 'A bread basket']], 'Pressure cookers rattled and hissed on the stove, and children kept well back!', 'Who was the best cook in your family?'],
    ['', 'What did a stovetop kettle do when the water boiled?', [['😗', 'Whistled'], ['🔔', 'Rang a bell'], ['💡', 'Flashed a light'], ['🎶', 'Played a tune']], 'The whistle meant it was time for a cup of tea.', 'How do you like your tea or coffee?'],
    ['', 'What did you use to beat eggs by hand?', [['🥚', 'A hand whisk (egg beater)'], ['🔨', 'A hammer'], ['🪥', 'A toothbrush'], ['🧹', 'A broom']], 'You turned a little handle and the beaters whirred round.', 'What did you like to bake?'],
    ['', 'Which plastic food boxes were sold at parties in people’s homes?', [['🥡', 'Tupperware'], ['🍪', 'Biscuit tins'], ['🎩', 'Hatboxes'], ['🧺', 'Picnic hampers']], 'Tupperware parties began in America in the 1950s and came to Britain around 1960.', 'Did you ever go to a Tupperware party?'],
    ['', 'What knitted cover kept the teapot warm?', [['🫖', 'A tea cosy'], ['🧢', 'A baseball cap'], ['🧣', 'A scarf'], ['🧤', 'A mitten']], 'Some tea cosies were knitted in bright stripes, with a bobble on top.', 'Did anyone in your family knit or crochet?'],
    ['', 'Which coffee pot bubbled away, popping coffee into a little glass knob on top?', [['☕', 'A percolator'], ['🫖', 'A teapot'], ['🥛', 'A milk jug'], ['🍶', 'A gravy boat']], 'You could hear it "perking" and smell the coffee all through the house.', 'Did your family drink tea or coffee in the morning?'],
    ['', 'What warmed your feet in a cold bed?', [['🔥', 'A hot water bottle'], ['🌀', 'An electric fan'], ['🧊', 'An ice pack'], ['🍉', 'A watermelon']], 'Some families used a stone bottle, or a brick warmed in the oven and wrapped in cloth.', 'Was your bedroom cold in winter? Do you remember frost on the windows?'],
    ['UK', 'What did many British people call the vacuum cleaner?', [['🧹', 'The Hoover'], ['🌪️', 'The Twister'], ['🐝', 'The Buzzer'], ['🐘', 'The Trunk']], '"Hoovering" became the word for vacuuming, after the famous make.', 'Which housework did you not mind doing?'],
    ['', 'How was an old flat iron heated?', [['🔥', 'On the stove or fire'], ['☀️', 'In the sunshine'], ['🔌', 'With a USB cable'], ['🕯️', 'With a candle']], 'People kept two irons, using one while the other heated up.', 'Who did the ironing in your house?'],
    ['', 'Which room was kept tidy "for best" and for visitors?', [['🛋️', 'The front room (parlour)'], ['🪵', 'The coal shed'], ['🚗', 'The garage'], ['🏚️', 'The attic']], 'The best china and the good chairs lived in the front room.', 'What was special about the front room in your home?'],
    ['', 'What big meal did many families share on a Sunday?', [['🍗', 'A roast dinner'], ['🍕', 'A takeaway pizza'], ['🥣', 'A bowl of cereal'], ['🍣', 'Sushi']], 'Roast meat, potatoes, vegetables and gravy, with a pudding to follow.', 'What was your favourite Sunday dinner?'],
    ['', 'Which machine went "ding!" at the end of every line?', [['⌨️', 'A typewriter'], ['🧺', 'A washing machine'], ['🍞', 'A toaster'], ['📞', 'A telephone']], 'You pushed the lever to move the paper back for the next line.', 'Could you type? Did you learn at school or at work?'],

    // cameras and photos
    ['', 'After taking photos, what did you do with the film?', [['📮', 'Sent it off to be developed'], ['🍽️', 'Ate it'], ['🌱', 'Planted it'], ['🧼', 'Washed it']], 'Then you waited a week or so to see how the pictures had come out!', 'Do you have a favourite old photograph?'],
    ['', 'Which camera printed the photo right away?', [['📸', 'A Polaroid'], ['🔭', 'A telescope'], ['🔬', 'A microscope'], ['📟', 'A pager']], 'You waved the picture about while you waited for it to appear.', 'Who took the photos in your family?'],
    ['', 'Which simple box camera did many families own?', [['📷', 'The Box Brownie'], ['🎥', 'A cinema camera'], ['📱', 'A smartphone'], ['🛰️', 'A satellite']], 'The Kodak Brownie made photography cheap enough for everyone.', 'Do you remember having your photo taken as a child?'],

    // the Moon and the skies
    ['', 'In what year did people first walk on the Moon?', [['🌕', '1969'], ['📅', '1949'], ['🗓️', '1959'], ['📆', '1979']], 'Hundreds of millions of people watched it live on television.', 'Where were you when you watched the Moon landing?'],
    ['', 'Who was the first person to step onto the Moon?', [['👨‍🚀', 'Neil Armstrong'], ['🎸', 'Elvis Presley'], ['✈️', 'Charles Lindbergh'], ['⚽', 'Pelé']], 'Buzz Aldrin joined him a little later, while Michael Collins circled overhead.', 'Did you stay up late to watch it?'],
    ['', 'What was the name of the mission that first landed on the Moon?', [['🚀', 'Apollo 11'], ['🚢', 'Titanic'], ['⛵', 'Mayflower'], ['✈️', 'Concorde']], 'The landing craft was called the Eagle. "The Eagle has landed."', 'Did you ever dream of going into space?'],
    ['', 'Finish Neil Armstrong’s words: "One small step for man, one giant leap for…"', [['🌍', 'mankind'], ['🐸', 'frogs'], ['🦘', 'kangaroos'], ['🍰', 'cake']], 'He said it as he stepped off the ladder onto the Moon’s dusty ground.', 'What other big news events do you remember?'],
    ['', 'What did the astronauts plant on the Moon?', [['🚩', 'A flag'], ['🌳', 'A tree'], ['🌻', 'A sunflower'], ['🥕', 'A carrot']], 'They also left footprints that are still there today, because there is no wind on the Moon.', 'Do you like looking up at the Moon and stars?'],
    ['', 'Who was the first person to travel into space, in 1961?', [['🚀', 'Yuri Gagarin'], ['🎩', 'Charlie Chaplin'], ['🎸', 'Buddy Holly'], ['🏏', 'Don Bradman']], 'He went once round the Earth in about 108 minutes.', 'What did you think of all the space news?'],

    // fashions
    ['', 'Which short skirt became the fashion in the 1960s?', [['👗', 'The miniskirt'], ['🧥', 'The ball gown'], ['🥻', 'The sari'], ['👘', 'The kimono']], 'Mary Quant in London helped make the miniskirt famous.', 'What did you like to wear when you went out?'],
    ['', 'Which wide-bottomed trousers were all the rage in the 1970s?', [['👖', 'Flares (bell-bottoms)'], ['🩳', 'Shorts'], ['🏇', 'Jodhpurs'], ['🧦', 'Leggings']], 'The wider the flares, the more fashionable you were!', 'Did you wear flares? What colour were they?'],
    ['', 'What did ladies often wear to go to town in the 1950s?', [['👒', 'A hat and gloves'], ['⛑️', 'A crash helmet'], ['🧢', 'A baseball cap'], ['🎧', 'Headphones']], 'People dressed smartly to go shopping, to church or to the pictures.', 'Did you have a favourite hat or coat?'],
    ['', 'What did ladies wear in their hair overnight to make curls?', [['🌀', 'Rollers (curlers)'], ['👑', 'A crown'], ['🏊', 'A swimming cap'], ['🎀', 'A bow tie']], 'Some ladies wore a headscarf over their rollers to go to the shops.', 'Who did your hair when you were young?'],
    ['', 'Which full skirt, with petticoats underneath, was 1950s fashion?', [['👗', 'A circle skirt'], ['🏴', 'A kilt'], ['🩰', 'A tutu'], ['🥻', 'A sarong']], 'In America, poodle skirts with a felt poodle on them were a favourite.', 'Did you have a dress you loved to dance in?'],
    ['', 'What hat did many men wear in the 1940s and 50s?', [['🎩', 'A trilby or fedora'], ['🧢', 'A baseball cap'], ['🪖', 'A helmet'], ['👑', 'A crown']], 'Men raised their hats to say good morning to a lady.', 'Did your father wear a hat to work?'],
    ['UK', 'What did 1950s "Teddy boys" wear?', [['🧥', 'Long drape jackets'], ['🏴', 'Kilts'], ['🧑‍🚀', 'Spacesuits'], ['🤿', 'Wetsuits']], 'They wore long jackets, narrow trousers, thick-soled shoes and slicked-back hair.', 'Which fashions do you remember from your teenage years?'],
    ['', 'What ran up the back of a lady’s stockings?', [['🧵', 'A seam'], ['🤐', 'A zip'], ['🔘', 'A row of buttons'], ['🎀', 'A ribbon']], 'When stockings were scarce, some girls drew a seam on their legs with an eyebrow pencil!', 'Did you ever have to "make do" with clothes?'],
    ['UK', 'Which London street was famous for fashion in the "Swinging Sixties"?', [['🛍️', 'Carnaby Street'], ['💼', 'Wall Street'], ['🍪', 'Sesame Street'], ['📺', 'Coronation Street']], 'Young people flocked there for the latest bright, bold clothes.', 'Where did you buy your clothes when you were young?'],
    ['', 'Which tall hairstyle was popular in the 1960s?', [['🐝', 'The beehive'], ['💈', 'The crew cut'], ['🎀', 'Plaits'], ['🧑‍🦲', 'A shaved head']], 'It took lots of backcombing and hairspray to keep a beehive up.', 'What was your hairstyle like at your wedding, or a special dance?'],
    ['', 'Which chunky shoes made people taller in the 1970s?', [['👢', 'Platform shoes'], ['🩴', 'Flip-flops'], ['🥿', 'Ballet flats'], ['🧦', 'Slipper socks']], 'Pop stars wore platforms so high that walking was quite an adventure.', 'Did you ever wear shoes that were hard to walk in?'],

    // dances
    ['', 'Which lively dance with spins and lifts was popular in the 1940s?', [['💃', 'The jitterbug'], ['🎻', 'The minuet'], ['🩰', 'Ballet'], ['🦢', 'Swan Lake']], 'Couples swung, spun and flipped to big band swing music.', 'Did you like to dance? Where did you go?'],
    ['', 'Which 1960 dance had you swivel as if drying your back with a towel?', [['🔄', 'The Twist'], ['🐦', 'The Charleston'], ['🚂', 'The Conga'], ['🎻', 'The Waltz']], 'Chubby Checker’s "The Twist" got everyone, young and old, on the dance floor.', 'Can you still do the Twist?'],
    ['', 'In which party dance do you "put your left leg in"?', [['🦵', 'The Hokey Cokey (Hokey Pokey)'], ['🌹', 'The Tango'], ['🦊', 'The Foxtrot'], ['🔄', 'The Twist']], 'In Britain it is the Hokey Cokey, and in America the Hokey Pokey.', 'Which dances did you do at parties and weddings?'],
    ['', 'Which dance has everyone in a long line, holding the person in front?', [['🚂', 'The Conga'], ['🩰', 'Ballet'], ['🌹', 'The Tango'], ['🎻', 'The Waltz']], 'Da-da-da-da-da-da, HEY! The line wiggles all round the room.', 'Have you led a conga line?'],
    ['', 'Which ballroom dance goes "one-two-three, one-two-three"?', [['🎻', 'The Waltz'], ['🔄', 'The Twist'], ['🕺', 'The Jive'], ['🚂', 'The Conga']], 'The waltz glides round and round the ballroom floor.', 'Who taught you to dance?'],
    ['UK', 'Where did young people go dancing on a Saturday night?', [['🪩', 'The dance hall (the Palais)'], ['📚', 'The library'], ['📮', 'The post office'], ['🦷', 'The dentist']], 'Many couples met for the first time at the local dance hall.', 'Where did you meet your sweetheart?'],
    ['', 'Which 1970s dance music came with glitter balls and flashing floors?', [['🪩', 'Disco'], ['🎺', 'Brass band'], ['🎻', 'String quartet'], ['🪕', 'Bluegrass']], 'The film "Saturday Night Fever" in 1977 made disco even bigger.', 'Did you ever go to a disco?'],
    ['', 'In which dance do you lean back and go under a low pole?', [['🎋', 'The Limbo'], ['🎻', 'The Waltz'], ['🦊', 'The Foxtrot'], ['🌹', 'The Tango']], '"How low can you go?" The bar went lower each time.', 'Have you ever tried the limbo?'],
    ['US', 'Why was a school dance called a "sock hop"?', [['🧦', 'Shoes came off to protect the gym floor'], ['🎁', 'Socks were the prizes'], ['🥶', 'It was always cold'], ['🧺', 'It was held in a laundry']], 'Teenagers danced in their socks to rock and roll records.', 'Did you go to dances at school?'],

    // getting about
    ['', 'What ran on rails along the town streets, ringing a bell?', [['🚋', 'A tram (streetcar)'], ['🛶', 'A canoe'], ['🎈', 'A hot-air balloon'], ['🚜', 'A tractor']], 'In America they were called streetcars or trolleys.', 'How did you get around town when you were young?'],
    ['UK', 'Who took your fare on a British bus?', [['🎫', 'The conductor'], ['🥛', 'The milkman'], ['📮', 'The postman'], ['⛪', 'The vicar']], 'The conductor clipped your ticket and rang the bell to tell the driver to go. Women conductors were called "clippies".', 'Where did you go on the bus?'],
    ['', 'What powered most trains in the 1940s and 50s?', [['🚂', 'Steam'], ['🔋', 'Batteries'], ['⛵', 'Sails'], ['🚲', 'Pedals']], 'Steam trains puffed clouds of smoke, and you might get a smut in your eye at the window.', 'Do you remember a journey on a steam train?'],
    ['UK', 'Which tiny British car first came out in 1959?', [['🚗', 'The Mini'], ['🚙', 'The Land Rover'], ['🚐', 'The camper van'], ['🏎️', 'The racing car']], 'The Mini was small outside but surprisingly roomy inside.', 'What was the first car you remember in your family?'],
    ['', 'Which car was nicknamed the "Beetle"?', [['🐞', 'The Volkswagen'], ['🚕', 'The London taxi'], ['🚓', 'The police car'], ['🚒', 'The fire engine']], 'Its round shape really did look a little like a beetle.', 'Did you learn to drive? Who taught you?'],
    ['', 'On a Sunday afternoon, families often went out for a…', [['🚗', 'Drive'], ['🏊', 'Swim'], ['🎳', 'Bowling match'], ['🧹', 'Spring clean']], 'Families piled into the car for a run out into the countryside, often with a picnic.', 'Where did your family like to go for a day out?'],

    // holidays and celebrations
    ['', 'What did children hang up on Christmas Eve?', [['🧦', 'A stocking'], ['🎩', 'A top hat'], ['🧥', 'A coat'], ['🕰️', 'A clock']], 'Many found an orange, some nuts and a little toy inside in the morning.', 'What did you find in your stocking?'],
    ['', 'What did people pull at Christmas dinner, with a bang?', [['🎉', 'Crackers'], ['🥕', 'Carrots'], ['🧶', 'Wool'], ['🔔', 'Bells']], 'Inside were a paper hat, a joke and a tiny toy. Christmas crackers are a British tradition.', 'Do you remember a good cracker joke?'],
    ['UK', 'What did British children make a "guy" for, on 5th November?', [['🎆', 'Bonfire Night'], ['🎃', 'Halloween'], ['🎄', 'Christmas'], ['🥚', 'Easter']], 'Children asked passers-by for "a penny for the guy" before the bonfire and fireworks.', 'Did you go to a bonfire? What did you eat?'],
    ['US', 'What did American families eat at Thanksgiving?', [['🦃', 'Turkey'], ['🌭', 'Hot dogs'], ['🍕', 'Pizza'], ['🌮', 'Tacos']], 'With stuffing, cranberry sauce and pumpkin pie to follow.', 'What was on your family’s table on special days?'],
    ['', 'What was often held in the street to celebrate a big royal or national day?', [['🎉', 'A street party'], ['🏃', 'A marathon'], ['🎬', 'A film shoot'], ['🛒', 'A sale']], 'Tables ran down the middle of the road, with bunting, sandwiches and jelly.', 'Do you remember a street party or a big parade?'],
    ['', 'What wobbly pudding was a favourite at children’s parties?', [['🍮', 'Jelly (Jell-O)'], ['🥧', 'Pork pie'], ['🥦', 'Broccoli'], ['🥨', 'Pretzels']], 'Jelly and ice cream was the party treat. In America it was Jell-O.', 'What did you have at your birthday parties?'],

    // sport and leisure
    ['UK', 'Which country won the football World Cup in 1966?', [['⚽', 'England'], ['🇧🇷', 'Brazil'], ['🇮🇹', 'Italy'], ['🇫🇷', 'France']], 'England beat West Germany 4–2 at Wembley, and Bobby Moore lifted the trophy.', 'Do you remember where you watched it?'],
    ['US', 'Which sport was called "America’s favorite pastime"?', [['⚾', 'Baseball'], ['🏏', 'Cricket'], ['🥌', 'Curling'], ['🏉', 'Rugby']], 'Families listened to games on the radio and went to the ballpark on summer afternoons.', 'Did you have a favorite team?'],
    ['', 'Where did people go to play bingo, or watch a show, on a night out?', [['🎭', 'The village or church hall'], ['🦷', 'The dentist'], ['🏦', 'The bank'], ['🚒', 'The fire station']], 'Halls held dances, whist drives, jumble sales and talent shows too.', 'What did you do for a night out?'],
    ['UK', 'What did you have to guess to win on the football pools?', [['⚽', 'The football results'], ['🌦️', 'The weather'], ['🐎', 'The horse races'], ['🎵', 'The top of the charts']], 'Every week the pools coupon was filled in and collected, in hope of a big win on Saturday.', 'Did anyone in your family "do the pools"?'],
    ['', 'Where did families go to pick their own fruit in summer?', [['🍓', 'A farm or orchard'], ['🏦', 'A bank'], ['🏭', 'A factory'], ['🚉', 'A railway station']], 'Strawberries, raspberries and apples went into jams, pies and crumbles.', 'Did your family make jam?'],
    ['', 'What did people play on a summer evening on the village green?', [['🏏', 'Cricket or baseball'], ['⛷️', 'Skiing'], ['🏒', 'Ice hockey'], ['🏄', 'Surfing']], 'The sound of bat on ball on a summer evening was part of growing up for many.', 'What sports did you play or watch?']
  ];

  function startMemLane(L0, api) {
    const L = lvl(L0), done = finisher(api), TOTAL = 8;
    const nOpts = L <= 1 ? 2 : L <= 2 ? 3 : 4;
    // prefer questions this player hasn't seen recently
    let seen = store.get('memlane-seen', []); if (!Array.isArray(seen)) seen = [];
    const fresh = shuffle([...ML.keys()].filter(i => !seen.includes(i)));
    const pool = fresh.length >= TOTAL ? fresh : fresh.concat(shuffle([...ML.keys()].filter(i => !fresh.includes(i))));
    const picks = pool.slice(0, TOTAL);
    store.set('memlane-seen', seen.concat(picks).slice(-Math.min(ML.length - TOTAL, 96)));
    let qi = 0, mistakes = 0, streak = 0;
    const root = el('div', 'tg-wrap'); api.stage.append(root);
    function show() {
      api.rounds(TOTAL, qi); root.innerHTML = '';
      const [reg, text, opts, fact, talk] = ML[picks[qi]];
      const card = el('div', 'tg-panel tg-q');
      card.innerHTML = (reg ? `<span class="tg-reg ${reg === 'UK' ? 'tg-uk' : ''}">${reg === 'UK' ? 'IN BRITAIN' : 'IN AMERICA'}</span><br>` : '') + text;
      const grid = el('div', 'tg-opts'); grid.style.setProperty('--cols', nOpts === 3 ? 1 : 2);
      const choices = shuffle([opts[0]].concat(shuffle(opts.slice(1)).slice(0, nOpts - 1)));
      if (nOpts === 3) grid.classList.add('tg-three');
      let missed = 0, solved = false;
      choices.forEach(o => {
        const b = el('button', 'tile c-card tg-opt', `<span class="tg-pic">${o[0]}</span><span>${o[1]}</span>`); b.type = 'button';
        if (nOpts === 3) { b.style.flexDirection = 'row'; b.style.minHeight = '84px'; b.style.justifyContent = 'flex-start'; b.style.gap = '14px'; b.style.textAlign = 'left'; b.style.padding = '10px 16px'; }
        b.onclick = () => {
          if (solved) return;
          if (o === opts[0]) {
            solved = true; b.classList.add('tg-right');
            streak = missed ? 0 : streak + 1;
            sfx.good(); if (streak >= 2) tone(660 + streak * 60, .2, 'triangle', .1, .25);
            if (!missed) toast(cheer());
            api.later(() => reveal(o, fact, talk, missed), 900);
          } else {
            missed++; mistakes++; b.classList.add('tg-nope'); sfx.soft(); wob(b);
            api.hint(missed === 1 ? 'Not quite. Have another look, there’s no rush.' : 'Nearly there. Try one of the others.');
          }
        };
        grid.append(b);
      });
      root.append(card, grid);
      api.hint(qi === 0 ? 'Pick the answer you think is right. Take your time.' : `Question ${qi + 1} of ${TOTAL}. Pick an answer.`);
    }
    function reveal(o, fact, talk, missed) {
      root.innerHTML = '';
      const p = el('div', 'tg-panel tg-talk');
      p.innerHTML = `<div class="tg-ans"><span class="tg-pic">${o[0]}</span><span>✓ ${o[1]}</span></div><p class="tg-fact">${fact}</p>` +
        `<div class="tg-chat"><b>💬 Talk about it</b><p>${talk}</p></div>`;
      const last = qi === TOTAL - 1;
      const nx = mkBtn(last ? '★ Finish' : 'Next question →', 'c-leaf tg-big', () => {
        sfx.tap(); qi++;
        if (qi >= TOTAL) { api.rounds(TOTAL, TOTAL); api.hint('That was a lovely trip down memory lane!'); done(mistakes <= 5 ? 3 : 2); nx.disabled = true; }
        else show();
      });
      p.append(nx); root.append(p);
      api.rounds(TOTAL, qi + 1);
      api.hint(missed ? 'That’s the one! Have a chat about it, then tap Next.' : 'Well remembered! Have a chat about it, then tap Next.');
    }
    show();
  }

  /* =========================================================
     2. PAIRS TOGETHER (two players on one screen, or a friendly computer)
     ========================================================= */
  const PT_SETS = [
    ['🌻', '🌷', '🌹', '🍄', '🐝', '🦋', '🐞', '🐌', '🌳', '🌼'],
    ['🫖', '☕', '🍰', '🍪', '🥚', '🍞', '🧀', '🍎', '🍋', '🍓'],
    ['⛵', '🐚', '🦀', '🐟', '🐬', '⛱️', '🍦', '🐳', '🦞', '🌞'],
    ['🐄', '🐖', '🐑', '🐓', '🐴', '🐐', '🦆', '🐕', '🚜', '🌽'],
    ['🧸', '🎈', '🎲', '🚂', '⚽', '🎨', '🥁', '🎺', '🪁', '🎁']
  ];
  const PT_COL = [
    { c: 'var(--sky)', d: 'var(--sky-d)', bg: '#DCEFFF', s: '★', cls: 'c-sky' },
    { c: 'var(--berry)', d: 'var(--berry-d)', bg: '#FFE0EC', s: '♥', cls: 'c-berry' }
  ];
  function startPairsRace(L0, api) {
    const L = lvl(L0), done = finisher(api);
    const pairs = L <= 1 ? 6 : L <= 2 ? 8 : 10;
    const recall = Math.min(.8, .3 + (L - 1) * .07); // how well the computer remembers
    const saved = store.get('pairsrace', {}) || {};
    let vsCpu = saved.cpu === true;
    const names = [saved.n1 || '', saved.n2 || ''];
    const root = el('div', 'tg-wrap'); api.stage.append(root);

    function setup() {
      root.innerHTML = '';
      api.hint('Who is playing? Type your names, or just tap Start.');
      const p = el('div', 'tg-panel tg-setup');
      p.append(el('h3', '', 'Who’s playing?'));
      const mode = el('div', 'tg-mode');
      const bTwo = mkBtn('<span>👥</span>Two players', 'c-card'), bCpu = mkBtn('<span>🤖</span>Me and the computer', 'c-card');
      mode.append(bTwo, bCpu); p.append(mode);
      const rows = el('div', 'tg-setup');
      p.append(rows);
      const inputs = [];
      function drawRows() {
        bTwo.setAttribute('aria-pressed', String(!vsCpu)); bCpu.setAttribute('aria-pressed', String(vsCpu));
        rows.innerHTML = ''; inputs.length = 0;
        [0, 1].forEach(k => {
          const r = el('div', 'tg-who');
          r.append(el('span', 'tile ' + PT_COL[k].cls, PT_COL[k].s));
          if (k === 1 && vsCpu) r.append(el('span', 'tg-cpuname', '🤖 Robo, the computer'));
          else {
            const inp = el('input'); inp.type = 'text'; inp.maxLength = 14; inp.placeholder = 'Player ' + (k + 1);
            inp.value = names[k]; inp.setAttribute('aria-label', 'Name for player ' + (k + 1)); inp.autocomplete = 'off';
            inp.oninput = () => { names[k] = inp.value; };
            inp.onkeydown = e => { if (e.key === 'Enter') inp.blur(); };
            inputs.push(inp); r.append(inp);
          }
          rows.append(r);
        });
      }
      bTwo.onclick = () => { sfx.tap(); vsCpu = false; drawRows(); };
      bCpu.onclick = () => { sfx.tap(); vsCpu = true; drawRows(); };
      drawRows();
      const go = mkBtn('▶ Start', 'c-leaf tg-big', () => {
        sfx.tap();
        const n1 = names[0].trim().slice(0, 14), n2 = names[1].trim().slice(0, 14);
        store.set('pairsrace', { cpu: vsCpu, n1, n2 });
        play([n1 || 'Player 1', vsCpu ? 'Robo' : (n2 || 'Player 2')]);
      });
      const r = el('div', 'tg-row'); r.append(go); p.append(r);
      root.append(p);
    }

    function play(pn) {
      root.innerHTML = '';
      const faces = shuffle(shuffle(pick(PT_SETS).slice()).slice(0, pairs).flatMap(f => [f, f]));
      const N = faces.length, cols = N <= 12 ? 4 : N <= 16 ? 4 : 5;
      const score = [0, 0], got = new Array(N).fill(-1), mem = new Map();
      let turn = 0, open = [], lock = false, found = 0, combo = 0, over = false;
      const sb = el('div', 'tg-score');
      const plEls = [0, 1].map(k => {
        const d = el('div', 'tg-pl'); d.style.setProperty('--pc', PT_COL[k].c);
        d.innerHTML = `<span class="tile ${PT_COL[k].cls}">${PT_COL[k].s}</span><span class="tg-nm">${esc(pn[k])}</span><span class="tg-pts">0</span>`;
        sb.append(d); return d;
      });
      const board = el('div', 'tg-board'); board.style.setProperty('--cols', cols);
      const cards = faces.map((f, i) => {
        const b = el('button', 'tg-card', `<span class="tg-in"><span class="tg-bk">?</span><span class="tg-fc">${f}</span></span>`);
        b.type = 'button'; b.setAttribute('aria-label', 'Face-down card');
        b.onclick = () => { if (!(vsCpu && turn === 1)) flip(i); };
        board.append(b); return b;
      });
      root.append(sb, board);
      api.rounds(pairs, 0);
      const isCpu = () => vsCpu && turn === 1;
      const name = k => pn[k];
      function showTurn(msg) {
        plEls.forEach((d, k) => d.classList.toggle('tg-on', k === turn));
        if (isCpu()) api.hint((msg ? msg + ' ' : '') + 'Robo the computer is having a think…');
        else api.hint((msg ? msg + ' ' : '') + `${name(turn)}, tap two cards to turn them over.`);
      }
      function flip(i) {
        if (lock || over || got[i] >= 0 || open.includes(i)) return;
        sfx.tap();
        cards[i].classList.add('tg-up'); cards[i].setAttribute('aria-label', 'Card showing ' + faces[i]);
        if (Math.random() < recall) mem.set(i, faces[i]);
        open.push(i);
        if (open.length < 2) { if (!isCpu()) api.hint(`${name(turn)}, now turn over another card.`); return; }
        lock = true;
        const [a, b] = open;
        if (faces[a] === faces[b]) {
          api.later(() => {
            [a, b].forEach(k => { got[k] = turn; mem.delete(k); const c = cards[k]; c.classList.remove('tg-cpu'); c.classList.add('tg-got');
              c.style.setProperty('--pc', PT_COL[turn].d); c.style.setProperty('--pbg', PT_COL[turn].bg); c.querySelector('.tg-fc').dataset.s = PT_COL[turn].s; });
            score[turn]++; found++; combo++; open = [];
            const pts = plEls[turn]; pts.querySelector('.tg-pts').textContent = score[turn];
            pts.classList.remove('tg-bump'); void pts.offsetWidth; pts.classList.add('tg-bump');
            api.rounds(pairs, found);
            [0, 1, 2].forEach(n => tone(520 + combo * 70 + n * 130, .16, 'triangle', .12, n * .08));
            if (found === pairs) { finish(); return; }
            if (combo >= 2) toast(`${cheer()} ${combo} in a row!`);
            lock = false;
            showTurn(`A pair for ${name(turn)}! ${isCpu() ? 'It goes again.' : 'Have another go.'}`);
            if (isCpu()) cpuTurn();
          }, 600);
        } else {
          api.later(() => {
            sfx.soft();
            api.hint(`Not a pair. Have a good look at where they are…`);
          }, 500);
          api.later(() => {
            [a, b].forEach(k => { cards[k].classList.remove('tg-up', 'tg-cpu'); cards[k].setAttribute('aria-label', 'Face-down card'); });
            open = []; combo = 0; turn = 1 - turn; lock = false;
            showTurn(`Over to ${name(turn)}.`);
            if (isCpu()) cpuTurn();
          }, 2000);
        }
      }
      function cpuChoose(exclude) {
        const left = faces.map((f, i) => i).filter(i => got[i] < 0 && i !== exclude);
        if (exclude == null) {
          // a pair it remembers?
          const known = [...mem.keys()].filter(i => got[i] < 0);
          for (const i of known) for (const j of known) if (i < j && faces[i] === faces[j] && Math.random() < recall + .1) return [i, j];
          const unknown = left.filter(i => !mem.has(i));
          return [pick(unknown.length ? unknown : left)];
        }
        const match = [...mem.keys()].find(i => i !== exclude && got[i] < 0 && faces[i] === faces[exclude]);
        if (match != null && Math.random() < recall + .1) return [match];
        const unknown = left.filter(i => !mem.has(i));
        return [pick(unknown.length && Math.random() < .8 ? unknown : left)];
      }
      function cpuTurn() {
        lock = true;
        api.later(() => {
          if (over) return;
          const ch = cpuChoose(null);
          lock = false; cards[ch[0]].classList.add('tg-cpu'); flip(ch[0]); lock = true;
          api.later(() => {
            const second = ch.length > 1 ? ch[1] : cpuChoose(ch[0])[0];
            lock = false; cards[second].classList.add('tg-cpu'); flip(second);
          }, 1100);
        }, 1100);
      }
      function finish() {
        over = true; lock = true;
        plEls.forEach(d => d.classList.remove('tg-on'));
        const [s1, s2] = score, draw = s1 === s2, win = s1 > s2 ? 0 : 1;
        let title, line, stars;
        if (draw) { title = 'It’s a draw!'; line = 'Neck and neck. What a match, well played both of you!'; }
        else { title = `${esc(name(win))} wins!`; line = `Brilliant playing from both of you. ${esc(name(1 - win))}, you found ${score[1 - win]} pair${score[1 - win] === 1 ? '' : 's'}. Lovely!`; }
        if (!vsCpu) stars = 3;
        else if (draw) stars = 2;
        else if (win === 0) stars = 3;
        else { stars = 1; line = `Robo won this time, but you found ${s1} pair${s1 === 1 ? '' : 's'}. Lovely playing! Fancy a rematch?`; }
        sfx.win();
        const pan = el('div', 'tg-panel tg-final');
        pan.innerHTML = `<h3>🎉 ${title}</h3>`;
        const pod = el('div', 'tg-podium');
        [0, 1].forEach(k => {
          const d = el('div', 'tg-pod'); d.style.setProperty('--pc', PT_COL[k].d); d.style.setProperty('--pbg', PT_COL[k].bg);
          const crown = draw ? '🌟' : k === win ? '🏆' : '🌟';
          d.innerHTML = `<span class="tg-cr">${crown}</span><b>${PT_COL[k].s} ${esc(name(k))}</b><span class="tg-pts">${score[k]}</span><small>${score[k] === 1 ? 'pair' : 'pairs'}</small>`;
          pod.append(d);
        });
        pan.append(pod, el('p', 'tg-fact', line));
        const fin = mkBtn('★ See the stars', 'c-leaf tg-big', () => { sfx.tap(); fin.disabled = true; done(stars); });
        pan.append(fin);
        root.innerHTML = ''; root.append(pan);
        api.hint(draw ? 'A draw! Hooray for both of you!' : `Hooray for ${name(win)}! And three cheers for ${name(1 - win)} too!`);
        api.later(() => done(stars), 6000);
      }
      showTurn(`${name(0)} goes first.`);
    }
    setup();
  }

  /* =========================================================
     3. PHOTO JIGSAW (the player's own photo; shares Photo Pairs' saved photos)
     ========================================================= */
  const PP_KEY = 'gentle-photos'; // same key as Photo Pairs in gentle.js
  function loadPhotos() {
    try { const a = store.get(PP_KEY, []); return Array.isArray(a) ? a.filter(s => typeof s === 'string' && s.startsWith('data:image/')).slice(0, 8) : []; } catch (e) { return []; }
  }
  function savePhotos(list) {
    try { store.set(PP_KEY, list); const back = store.get(PP_KEY, []); return Array.isArray(back) && back.length === list.length; } catch (e) { return false; }
  }
  function shrinkPhoto(file) {
    return new Promise(res => {
      try {
        const fr = new FileReader();
        fr.onerror = () => res(null);
        fr.onload = () => {
          const img = new Image();
          img.onerror = () => res(null);
          img.onload = () => {
            try {
              const S = 360, cv = document.createElement('canvas'); cv.width = cv.height = S;
              const side = Math.min(img.naturalWidth, img.naturalHeight);
              cv.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, S, S);
              res(cv.toDataURL('image/jpeg', .78));
            } catch (e) { res(null); }
          };
          img.src = fr.result;
        };
        fr.readAsDataURL(file);
      } catch (e) { res(null); }
    });
  }
  // built-in sample: a sunny seaside with beach huts (drawn fresh, original art)
  function paintSample(S) {
    const cv = document.createElement('canvas'); cv.width = cv.height = S;
    const x = cv.getContext('2d');
    const circle = (X, Y, r, c) => { x.beginPath(); x.arc(X, Y, r, 0, Math.PI * 2); x.fillStyle = c; x.fill(); };
    const sky = x.createLinearGradient(0, 0, 0, S * .5); sky.addColorStop(0, '#3FA9F5'); sky.addColorStop(1, '#CFEFFF');
    x.fillStyle = sky; x.fillRect(0, 0, S, S * .52);
    // sun
    x.strokeStyle = '#FFC234'; x.lineWidth = S * .012; x.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; x.beginPath(); x.moveTo(S * .8 + Math.cos(a) * S * .085, S * .15 + Math.sin(a) * S * .085); x.lineTo(S * .8 + Math.cos(a) * S * .115, S * .15 + Math.sin(a) * S * .115); x.stroke(); }
    circle(S * .8, S * .15, S * .07, '#FFD23F');
    // clouds
    [[.2, .12], [.48, .22]].forEach(([cx, cy]) => { [[0, 0, 1.2], [-1.2, .3, .9], [1.2, .3, .9], [-.4, -.5, .9], [.6, -.4, .8]].forEach(([dx, dy, r]) => circle(S * cx + dx * S * .045, S * cy + dy * S * .045, r * S * .045, '#FFFFFF')); });
    // gulls
    x.strokeStyle = '#33424C'; x.lineWidth = S * .007;
    [[.35, .1], [.42, .14], [.6, .08]].forEach(([gx, gy]) => { x.beginPath(); x.moveTo(S * gx - S * .025, S * gy); x.quadraticCurveTo(S * gx - S * .012, S * gy - S * .02, S * gx, S * gy); x.quadraticCurveTo(S * gx + S * .012, S * gy - S * .02, S * gx + S * .025, S * gy); x.stroke(); });
    // sea with stripes
    x.fillStyle = '#1D8FD8'; x.fillRect(0, S * .4, S, S * .22);
    x.fillStyle = '#45AEFF'; for (let i = 0; i < 4; i++) x.fillRect(0, S * (.43 + i * .05), S, S * .012);
    // sailing boat
    x.fillStyle = '#C4432A'; x.beginPath(); x.moveTo(S * .12, S * .44); x.lineTo(S * .3, S * .44); x.lineTo(S * .27, S * .48); x.lineTo(S * .15, S * .48); x.fill();
    x.fillStyle = '#FFFFFF'; x.beginPath(); x.moveTo(S * .21, S * .25); x.lineTo(S * .21, S * .43); x.lineTo(S * .3, S * .43); x.fill();
    x.fillStyle = '#FFC234'; x.beginPath(); x.moveTo(S * .2, S * .28); x.lineTo(S * .2, S * .43); x.lineTo(S * .13, S * .43); x.fill();
    // lighthouse
    x.fillStyle = '#FFFFFF'; x.fillRect(S * .88, S * .26, S * .06, S * .17);
    x.fillStyle = '#FF5A4E'; [0, 1, 2].forEach(i => x.fillRect(S * .88, S * (.29 + i * .05), S * .06, S * .022));
    x.fillStyle = '#33424C'; x.beginPath(); x.moveTo(S * .87, S * .26); x.lineTo(S * .91, S * .22); x.lineTo(S * .95, S * .26); x.fill();
    // sand
    x.fillStyle = '#F4D58D'; x.beginPath(); x.moveTo(0, S * .6); x.quadraticCurveTo(S * .5, S * .54, S, S * .6); x.lineTo(S, S); x.lineTo(0, S); x.fill();
    x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.moveTo(0, S * .6); x.quadraticCurveTo(S * .5, S * .54, S, S * .6); x.lineTo(S, S * .615); x.quadraticCurveTo(S * .5, S * .556, 0, S * .615); x.fill();
    // beach huts
    const huts = ['#FF6B4A', '#FFC234', '#3CC46B', '#45AEFF', '#F25A95'];
    huts.forEach((c, i) => {
      const hx = S * (.05 + i * .19), hy = S * .66, hw = S * .15, hh = S * .17;
      x.fillStyle = c; x.fillRect(hx, hy, hw, hh);
      x.fillStyle = 'rgba(255,255,255,.35)'; for (let k = 0; k < 3; k++) x.fillRect(hx + hw * (.15 + k * .3), hy, hw * .12, hh);
      x.fillStyle = '#FFFFFF'; x.beginPath(); x.moveTo(hx - hw * .08, hy); x.lineTo(hx + hw / 2, hy - hh * .4); x.lineTo(hx + hw * 1.08, hy); x.fill();
      x.fillStyle = '#7A4A28'; x.fillRect(hx + hw * .3, hy + hh * .35, hw * .4, hh * .65);
      circle(hx + hw * .62, hy + hh * .7, S * .006, '#FFC234');
      x.fillStyle = '#C9A15B'; x.fillRect(hx - hw * .05, hy + hh, hw * 1.1, S * .015);
    });
    // beach ball and bucket
    const bx = S * .25, by = S * .92, br = S * .05;
    ['#FF5A4E', '#FFFFFF', '#45AEFF', '#FFFFFF', '#FFC234', '#FFFFFF'].forEach((c, i) => { x.beginPath(); x.moveTo(bx, by); x.arc(bx, by, br, i * Math.PI / 3, (i + 1) * Math.PI / 3); x.fillStyle = c; x.fill(); });
    x.fillStyle = '#F25A95'; x.beginPath(); x.moveTo(S * .66, S * .88); x.lineTo(S * .76, S * .88); x.lineTo(S * .74, S * .97); x.lineTo(S * .68, S * .97); x.fill();
    x.strokeStyle = '#AE2A5F'; x.lineWidth = S * .006; x.beginPath(); x.arc(S * .71, S * .88, S * .045, Math.PI, 0); x.stroke();
    // starfish
    x.fillStyle = '#FF9A3C'; x.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? S * .015 : S * .04; x.lineTo(S * .5 + Math.cos(a) * r, S * .93 + Math.sin(a) * r); }
    x.fill();
    return cv.toDataURL('image/jpeg', .88);
  }

  function startPhotoJig(L0, api) {
    const L = lvl(L0), done = finisher(api);
    const [cols, rows] = [[2, 2], [3, 2], [3, 3], [4, 3]][Math.min(L, 4) - 1];
    const n = cols * rows;
    let photos = loadPhotos(), sample = null;
    const getSample = () => sample || (sample = paintSample(480));
    const root = el('div', 'tg-wrap'); api.stage.append(root);
    const input = el('input'); input.type = 'file'; input.accept = 'image/*'; input.hidden = true;
    api.stage.append(input);
    input.onchange = async () => {
      const file = (input.files || [])[0]; input.value = '';
      if (!file) return;
      api.hint('Getting your photo ready…');
      const got = await shrinkPhoto(file);
      if (!root.isConnected) return;
      if (!got) { api.hint('Sorry, that photo would not open. Try another one.'); setup(); return; }
      photos = [got].concat(photos).slice(0, 8);
      if (savePhotos(photos)) toast('Photo added'); else api.hint('Your photo is ready (it could not be saved for next time).');
      play(got);
    };
    const addBtn = (label, cls) => mkBtn(label, cls, () => { sfx.tap(); input.click(); });

    function setup() {
      root.innerHTML = '';
      const panel = el('div', 'tg-panel tg-empty');
      if (!photos.length) {
        api.hint('Add a photo of your own, or try our seaside picture.');
        panel.innerHTML = `<div class="tg-mini" style="background-image:url(${getSample()})" role="img" aria-label="A seaside picture"></div><p>Family, pets and favourite places make lovely jigsaws.</p>`;
        const r = el('div', 'tg-row'); r.append(addBtn('📷 Add a photo', 'c-sun tg-big')); panel.append(r);
        const r2 = el('div', 'tg-row'); r2.append(mkBtn('▶ Use the seaside picture', 'c-leaf', () => { sfx.tap(); play(getSample()); })); panel.append(r2);
      } else {
        api.hint('Tap a photo to make it into a jigsaw.');
        panel.append(el('p', '', `Pick a photo. It will be cut into ${n} pieces.`));
        const th = el('div', 'tg-thumbs');
        photos.forEach((p, i) => {
          const b = el('button', 'tg-th'); b.type = 'button'; b.style.backgroundImage = `url(${p})`; b.setAttribute('aria-label', 'Your photo ' + (i + 1));
          b.onclick = () => { sfx.tap(); play(p); }; th.append(b);
        });
        const sb = el('button', 'tg-th'); sb.type = 'button'; sb.style.backgroundImage = `url(${getSample()})`; sb.setAttribute('aria-label', 'Seaside picture');
        sb.onclick = () => { sfx.tap(); play(getSample()); }; th.append(sb);
        panel.append(th);
        const r = el('div', 'tg-row'); r.append(addBtn('📷 Add a photo', 'c-sun')); panel.append(r);
      }
      panel.append(el('p', '', '🔒 Photos stay only on this device.'));
      root.append(panel);
    }

    function play(url) {
      root.innerHTML = '';
      let pos; do pos = shuffle([...Array(n).keys()]); while (pos.some((p, s) => p === s));
      let sel = null, slips = 0, finished = false, fresh = new Set(), moved = new Set(), target = null;
      const top = el('div', 'tg-jtop');
      top.innerHTML = `<div class="tg-mini" style="background-image:url(${url})" role="img" aria-label="The finished picture"></div>`;
      const helpBtn = mkBtn('💡 Show me one', 'c-sun', help);
      top.append(helpBtn);
      const board = el('div', 'tg-jboard'); board.style.setProperty('--cols', cols); board.style.setProperty('--rows', rows);
      root.append(top, board);
      api.hint('Tap a piece, then tap where it should go. The two pieces swap places.');
      const correct = () => pos.filter((p, s) => p === s).length;
      function render() {
        board.innerHTML = `<div class="tg-guide" style="background-image:url(${url})"></div>`;
        pos.forEach((p, s) => {
          const b = el('button', 'tg-pc'); b.type = 'button';
          b.style.gridArea = `${Math.floor(s / cols) + 1} / ${s % cols + 1}`;
          b.style.backgroundImage = `url(${url})`;
          const pc = p % cols, pr = Math.floor(p / cols);
          b.style.backgroundPosition = `${cols > 1 ? pc / (cols - 1) * 100 : 0}% ${rows > 1 ? pr / (rows - 1) * 100 : 0}%`;
          b.setAttribute('aria-label', p === s ? 'Piece in place' : 'Puzzle piece');
          if (p === s) b.classList.add('tg-lock');
          if (fresh.has(s)) b.classList.add('tg-new'); else if (moved.has(s)) b.classList.add('tg-moved');
          if (sel === s) b.classList.add('tg-sel');
          if (target === s) b.classList.add('tg-target');
          b.onclick = () => tap(s);
          board.append(b);
        });
        fresh = new Set(); moved = new Set();
        api.rounds(n, correct());
      }
      function tap(s) {
        if (finished || pos[s] === s) return;
        if (sel === null) { sel = s; sfx.tap(); api.hint('Now tap the spot where that piece belongs.'); render(); return; }
        if (sel === s) { sel = null; target = null; api.hint('Tap a piece, then tap where it should go.'); render(); return; }
        const a = sel; sel = null; target = null;
        [pos[a], pos[s]] = [pos[s], pos[a]];
        const now = [a, s].filter(k => pos[k] === k);
        if (now.length) now.forEach((k, i) => { fresh.add(k); tone(520 + correct() * 40 + i * 80, .18, 'triangle', .13, i * .1); });
        else { slips++; tone(440, .1, 'triangle', .08); }
        [a, s].forEach(k => moved.add(k));
        render();
        if (correct() === n) {
          finished = true; board.classList.add('tg-whole'); helpBtn.style.visibility = 'hidden';
          api.hint('You made the picture! Isn’t it lovely?'); sfx.win();
          done(slips <= n ? 3 : 2);
        } else {
          if (now.length && correct() > 1 && Math.random() < .5) toast(cheer());
          api.hint(now.length ? 'That piece is in the right place. Keep going!' : 'Swapped. Tap a piece, then tap where it should go.');
        }
      }
      function help() {
        if (finished) return;
        const s = pos.findIndex((p, k) => p !== k); if (s < 0) return;
        sel = pos.indexOf(s); target = s; sfx.tap();
        api.hint('The lifted piece goes in the glowing space. Tap the glowing space.');
        render();
      }
      render();
    }
    setup();
  }

  register({ id: 'memlane', cat: 'gentle', gentle: true, order: 35, name: 'Memory Lane Quiz', icon: '📻', desc: 'Picture questions about the good old days', start: startMemLane });
  register({ id: 'pairsrace', cat: 'cards', order: 24, name: 'Pairs Together', icon: '👫', desc: 'Take turns finding pairs with a friend', start: startPairsRace });
  register({ id: 'photojig', cat: 'gentle', gentle: true, order: 36, name: 'Photo Jigsaw', icon: '🖼️', desc: 'Make a jigsaw from your own photo', start: startPhotoJig });

})();
