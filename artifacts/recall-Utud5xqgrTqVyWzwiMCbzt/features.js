/* Recall: extra features layered on the core.
   Profiles, search, recently played, how-to-play guides, photo frame, break reminders,
   comfort modes, TV channels (decades), new music, The Wireless, stickers and calendar. */
(function () {
  const defaults = { howto: true, frameMins: 5, breakMins: 30, hc: false, steady: false, calm: false, dockPos: 'right', era: '30s', seenHelp: [] };
  Object.keys(defaults).forEach(k => { if (settings[k] === undefined) settings[k] = defaults[k]; });

  R.css(`
  /* ---------- comfort modes ---------- */
  body.hc, body.hc[data-era]{--table:#00262D; --table-hi:#003A44; --table-deep:#001A1F; --card:#FFFFFF; --card-edge:#7A7A7A; --ink:#000000; --ink-soft:#1E1E1E; --on-table-soft:#FFFFFF}
  body.hc .tile, body.hc .btn, body.hc .tbtn, body.hc .gcard{outline:3px solid #000; outline-offset:-3px}
  body.hc .hintbar p{font-weight:700}
  body.calm *, body.calm *::before, body.calm *::after{animation-duration:.01ms !important; animation-iteration-count:1 !important; transition-duration:.01ms !important}
  body.calm #confetti{display:none}
  /* button bar as a column on the right (or left), so screens need less scrolling */
  body.dock-v .dock{top:50%; bottom:auto; left:auto; right:max(calc(var(--bz) + 6px), env(safe-area-inset-right, 0px)); transform:translateY(-50%); flex-direction:column; padding:6px; gap:6px; border-radius:22px; max-width:none}
  body.dock-v.dock-l .dock{right:auto; left:max(calc(var(--bz) + 6px), env(safe-area-inset-left, 0px))}
  body.dock-v .brass{flex:none; min-width:0; width:62px; min-height:58px; padding:4px 2px; border-radius:16px}
  body.dock-v .brass .i{font-size:1.35rem}
  body.dock-v .brass .l{font-size:.72rem; white-space:normal; line-height:1.05; text-align:center}
  body.dock-v{padding-right:max(calc(12px + var(--bz) + 74px * var(--z)), env(safe-area-inset-right, 0px)); padding-bottom:calc(16px + var(--bz))}
  body.dock-v.dock-l{padding-right:max(calc(12px + var(--bz)), env(safe-area-inset-right, 0px)); padding-left:max(calc(12px + var(--bz) + 74px * var(--z)), env(safe-area-inset-left, 0px))}
  body.dock-v.ingame{padding-bottom:calc(10px + var(--bz))}
  body.dock-v #home.fit{min-height:calc((100dvh - 2 * var(--bz) - 34px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)) / var(--z))}
  @media (max-height:520px){ body.dock-v .dock{top:calc(var(--bz) + 6px); transform:none; max-height:calc(100dvh - 2 * var(--bz) - 12px); overflow-y:auto} }
  /* narrow phones: during a game the bar goes back to a slim bottom row so boards keep the full width */
  @media (max-width:599px){
    body.dock-v.ingame .dock{top:auto; bottom:calc(var(--bz) + 6px + env(safe-area-inset-bottom, 0px)); left:calc(var(--bz) + 8px); right:calc(var(--bz) + 8px); transform:none; flex-direction:row; border-radius:22px}
    body.dock-v.ingame .brass{flex:1 1 0; width:auto; min-height:50px}
    body.dock-v.ingame{padding-left:max(calc(16px + var(--bz)), env(safe-area-inset-left, 0px)); padding-right:max(calc(16px + var(--bz)), env(safe-area-inset-right, 0px)); padding-bottom:calc(80px * var(--z) + var(--bz))}
  }

  /* ---------- decades (TV channels) ---------- */
  body[data-era="40s"]{--table:#22406B; --table-hi:#2F5590; --table-deep:#132743; --wood-frame:#3E2A1C}
  body[data-era="50s"]{--table:#2E8C7E; --table-hi:#3FB3A1; --table-deep:#1C5B52; --wood-frame:#7A2E3B}
  body[data-era="60s"]{--table:#B4561F; --table-hi:#D2732F; --table-deep:#7A3510; --wood-frame:#4A3B12}
  .tv-chan{position:absolute; left:50%; bottom:12%; transform:translateX(-50%); z-index:3; font:700 calc(var(--g, 4px) * 2.6) var(--display); color:rgba(230,240,235,.5); white-space:nowrap}
  .tv.on .tv-chan{color:#fff}
  .tv-knob{cursor:pointer}

  /* ---------- profile chip and sheets ---------- */
  .profchip{display:inline-flex; align-items:center; gap:.4em; font:600 1rem var(--display); background:rgba(0,0,0,.2); color:var(--on-table); border:0; border-radius:999px; padding:.5em 1em; cursor:pointer; min-height:44px}
  .profchip:active{transform:translateY(2px)}
  .xsheet{position:fixed; inset:0; z-index:85; display:grid; place-items:center; background:rgba(5,40,50,.72);
    padding:max(16px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) max(16px, env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px))}
  .xcard{background:var(--card); color:var(--ink); border-radius:28px; width:min(560px, 100%); max-height:calc(100% / var(--z, 1)); overflow-y:auto; padding:22px 20px; zoom:var(--z);
    box-shadow:0 9px 0 var(--card-edge), 0 24px 50px rgba(0,0,0,.45); animation:rise .4s cubic-bezier(.3,1.4,.5,1)}
  .xcard h2{font-size:1.8rem; margin-bottom:10px}
  .xcard p{font-size:1.1rem; margin:6px 0}
  .proflist{display:grid; grid-template-columns:repeat(auto-fill, minmax(120px, 1fr)); gap:12px; margin:12px 0}
  .profbtn{display:flex; flex-direction:column; align-items:center; gap:6px; padding:14px 8px; border:0; border-radius:20px; cursor:pointer; background:#F3EADA; box-shadow:0 5px 0 var(--card-edge); font:600 1.1rem var(--display); color:var(--ink)}
  .profbtn .av{font-size:2.6rem; line-height:1}
  .profbtn.on{background:var(--sun); box-shadow:0 5px 0 var(--sun-d), 0 0 0 3px var(--sun-d)}
  .emrow{display:flex; flex-wrap:wrap; gap:8px; margin:8px 0}
  .emrow button{font-size:1.7rem; width:54px; height:54px; border:0; border-radius:14px; background:#F3EADA; cursor:pointer; box-shadow:0 4px 0 var(--card-edge)}
  .emrow button[aria-pressed="true"]{background:var(--sun); box-shadow:0 4px 0 var(--sun-d), 0 0 0 3px var(--sun-d)}
  .xinput{width:100%; font:600 1.15rem var(--body); padding:12px 14px; border-radius:14px; border:2px solid var(--card-edge); background:#fff; color:var(--ink)}
  .xbtns{display:flex; flex-wrap:wrap; gap:10px; margin-top:14px}
  .xbtns .btn{flex:1 1 140px}
  .howto .hicon{font-size:3.4rem; line-height:1; margin-bottom:6px}
  .howto .howline{background:#F3EADA; border-radius:16px; padding:12px 14px; font:600 1.15rem/1.35 var(--body); margin:10px 0}
  .howto ul{margin:8px 0 0; padding-left:1.2em; font-size:1.05rem; line-height:1.5}
  .helpbtn{flex:none; width:46px; height:46px; border:0; border-radius:50%; cursor:pointer; font:700 1.4rem/1 var(--display); color:var(--ink);
    background:var(--card); box-shadow:0 4px 0 var(--card-edge), 0 6px 10px rgba(0,0,0,.25)}
  @media (max-width:440px){ body.ingame .helpbtn{width:40px; height:40px; font-size:1.2rem} }

  /* ---------- search and recently played ---------- */
  .findbar{display:flex; gap:10px; align-items:center; margin:6px 0 6px}
  .findbar input{flex:1; min-width:0; font:600 1.1rem var(--body); padding:12px 16px 12px 44px; border-radius:999px; border:0; background:var(--card) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='%234A5862' stroke-width='2.6' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='M20 20l-4-4'/%3E%3C/svg%3E") 14px 50% no-repeat; color:var(--ink); box-shadow:0 4px 0 var(--card-edge)}
  .findbar input::placeholder{color:var(--ink-soft)}
  .recent{display:flex; gap:8px; overflow-x:auto; padding:4px 2px 8px; scrollbar-width:thin}
  .recent span.lab{flex:none; align-self:center; font:600 .95rem var(--display); color:var(--on-table-soft); margin-right:2px}
  .recent button{flex:none; display:inline-flex; align-items:center; gap:6px; border:0; border-radius:999px; padding:6px 12px 6px 8px; cursor:pointer; background:var(--card); color:var(--ink); font:600 .95rem var(--display); box-shadow:0 3px 0 var(--card-edge); min-height:44px}
  .recent button span{font-size:1.3rem}

  .quick{display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:8px; margin:4px 0 8px}
  .qbtn{display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; border:0; border-radius:16px; min-height:58px; padding:6px 4px; cursor:pointer; text-align:center;
    font:600 clamp(.78rem, 2.6vw, 1rem)/1.1 var(--display); color:var(--ink); background:linear-gradient(180deg, #FFFDF7, var(--card)); box-shadow:0 4px 0 var(--card-edge), 0 6px 12px rgba(0,0,0,.22)}
  .qbtn span{font-size:1.4rem}
  @media (min-width:700px){ .qbtn{flex-direction:row; gap:8px; min-height:52px} }
  #home.fit{height:auto !important; min-height:calc((100dvh - 2 * var(--bz) - 12px - 100px * var(--z) - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)) / var(--z))}
  #menu .tilegrid:not(.scroll){grid-auto-rows:minmax(104px, 1fr)}
  #menu .tilegrid.cats4{grid-template-rows:repeat(3, minmax(104px, 1fr)); gap:clamp(8px, 1.8vmin, 18px)}
  @media (max-width:520px){ #menu .tilegrid.cats4 .tbtn{padding:4px 2px} #menu .tilegrid.cats4 .tbtn b{font-size:clamp(.68rem, 2.85vw, 1rem); overflow-wrap:normal; word-break:normal} #menu .tilegrid.cats4 .tbtn small{font-size:.72rem} }
  .qbtn:active{transform:translateY(3px); box-shadow:0 1px 0 var(--card-edge)}
  @media (max-width:440px){ body.ingame .favbtn, body.ingame .helpbtn{width:36px; height:36px; font-size:1.1rem} body.ingame .gtitle{gap:6px} }
  /* ---------- photo frame ---------- */
  .frame{position:fixed; inset:0; z-index:90; background:#140F0B; color:#fff; cursor:pointer; display:grid; grid-template-rows:1fr auto; animation:fadein 1s}
  .frame .pic{position:relative; overflow:hidden}
  .frame .pic img, .frame .pic .scene{position:absolute; inset:4% 4% 0; width:92%; height:96%; object-fit:contain; transition:opacity 1.2s; display:grid; place-items:center; font-size:min(40vw, 40vh)}
  .frame .cap{position:absolute; left:50%; bottom:3%; transform:translateX(-50%); background:rgba(0,0,0,.55); padding:.3em 1em; border-radius:999px; font:600 clamp(1.2rem, 4vw, 2rem) var(--display); white-space:nowrap; max-width:90%; overflow:hidden; text-overflow:ellipsis}
  .frame .clockrow{display:flex; flex-wrap:wrap; align-items:baseline; justify-content:center; gap:4px 22px; padding:14px 16px calc(18px + env(safe-area-inset-bottom, 0px))}
  .frame .t{font:700 clamp(2.6rem, 10vw, 5rem)/1 var(--display)}
  .frame .d{font:600 clamp(1.2rem, 4vw, 2rem) var(--display); color:#E9DCC4}
  .frame .tap{position:absolute; top:calc(14px + env(safe-area-inset-top, 0px)); right:16px; font:600 1rem var(--display); color:rgba(255,255,255,.6)}
  @keyframes fadein{from{opacity:0}}

  /* ---------- stickers and calendar ---------- */
  .tabs{display:flex; gap:10px; margin:0 0 14px}
  .tabs .btn{flex:1; min-height:52px}
  .tabs .btn[aria-pressed="true"]{--c:var(--sun); --d:var(--sun-d)}
  .stickers{display:grid; grid-template-columns:repeat(auto-fill, minmax(104px, 1fr)); gap:14px}
  .stk{display:flex; flex-direction:column; align-items:center; gap:6px; text-align:center; background:var(--card); color:var(--ink); border-radius:20px; padding:12px 6px; box-shadow:0 5px 0 var(--card-edge)}
  .stk .disc{width:68px; height:68px; border-radius:50%; display:grid; place-items:center; font-size:2.2rem;
    background:radial-gradient(circle at 35% 30%, #FFF6D8, var(--sun) 55%, var(--sun-d)); box-shadow:inset 0 -5px 0 rgba(0,0,0,.15), 0 5px 0 #8C6400, 0 8px 12px rgba(0,0,0,.25)}
  .stk.locked .disc{background:#E2D8C6; box-shadow:inset 0 -5px 0 rgba(0,0,0,.08), 0 5px 0 #B9AC95; filter:grayscale(1); opacity:.6}
  .stk b{font:600 .95rem/1.15 var(--display)}
  .stk small{font-size:.8rem; color:var(--ink-soft); line-height:1.2}
  .cal{background:var(--card); color:var(--ink); border-radius:22px; padding:14px; box-shadow:0 6px 0 var(--card-edge)}
  .calhead{display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px}
  .calhead h3{font-size:1.4rem; margin:0}
  .calhead .btn{min-height:48px; width:56px; padding:0}
  .calgrid{display:grid; grid-template-columns:repeat(7, 1fr); gap:5px}
  .calgrid .dow{font:600 .85rem var(--display); color:var(--ink-soft); text-align:center}
  .calgrid .day{aspect-ratio:1; border-radius:12px; background:#F3EADA; display:flex; flex-direction:column; align-items:center; justify-content:center; font:600 .95rem var(--display)}
  .calgrid .day span{font-size:1.25rem; line-height:1}
  .calgrid .day.today{box-shadow:0 0 0 3px var(--coral)}
  .calgrid .day.empty{background:none}
  .calnote{margin-top:10px; font-size:1rem; color:var(--ink-soft)}

  /* ---------- the wireless ---------- */
  .wl{display:grid; gap:16px; max-width:560px; margin:0 auto}
  .radio{position:relative; border-radius:46% 46% 18px 18px / 30% 30% 18px 18px; padding:26px 22px 22px; color:#fff;
    background:repeating-linear-gradient(93deg, rgba(0,0,0,.08) 0 3px, transparent 3px 12px), linear-gradient(180deg, #91592F, #5E3719);
    box-shadow:inset 0 0 0 3px rgba(0,0,0,.25), inset 0 8px 0 rgba(255,255,255,.12), 0 18px 30px rgba(0,0,0,.4)}
  .radio .grille{height:110px; border-radius:50% 50% 14px 14px / 40% 40% 14px 14px; background:repeating-linear-gradient(90deg, #2B1A0D 0 5px, #C9A15B 5px 7px); box-shadow:inset 0 4px 10px rgba(0,0,0,.6)}
  .radio .dial{margin-top:14px; height:46px; border-radius:999px; background:linear-gradient(#F8EBC8, #DCC38D); box-shadow:inset 0 2px 5px rgba(0,0,0,.45); position:relative; overflow:hidden}
  .radio .dial i{position:absolute; top:10%; bottom:10%; width:4px; background:#C4432A; border-radius:2px; transition:left .8s cubic-bezier(.4,1.4,.5,1)}
  .radio .dial span{position:absolute; top:50%; transform:translate(-50%, -50%); font:700 .8rem var(--display); color:#5A3A1A}
  .radio .glow{position:absolute; left:50%; top:18px; width:60%; height:6px; transform:translateX(-50%); border-radius:999px; background:#FFC234; box-shadow:0 0 18px 6px rgba(255,194,52,.6); opacity:.2; transition:opacity .6s}
  .radio.on .glow{opacity:1}
  .wl .say{background:var(--card); color:var(--ink); border-radius:20px; padding:14px 16px; font:600 1.15rem/1.4 var(--body); box-shadow:0 6px 0 var(--card-edge); min-height:3.2em}
  .wl .stations{display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:10px}
  .wl .stations .btn{min-height:60px; font-size:1.02rem}
  .wl .stations .btn[aria-pressed="true"]{--c:var(--sun); --d:var(--sun-d)}
  .wl .row{display:flex; flex-wrap:wrap; gap:10px}
  .wl .row .btn{flex:1 1 150px}
  `);

  /* ======================================================================
     COMFORT MODES
     ====================================================================== */
  function applyComfort() {
    document.body.classList.toggle('hc', !!settings.hc);
    document.body.classList.toggle('calm', !!settings.calm);
    document.body.classList.toggle('dock-v', settings.dockPos !== 'bottom');
    document.body.classList.toggle('dock-l', settings.dockPos === 'left');
    document.body.dataset.era = settings.era || '30s';
    const ch = document.querySelector('.tv-chan'); if (ch) ch.textContent = eraLabel();
  }
  // steady hands: ignore a second tap that comes too quickly, and taps where the finger slid
  let lastTap = 0, downAt = null;
  document.addEventListener('pointerdown', e => { downAt = { x: e.clientX, y: e.clientY }; }, true);
  document.addEventListener('click', e => {
    if (!settings.steady) return;
    const now = performance.now();
    const slid = downAt && e.clientX != null && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 24;
    if (now - lastTap < 450 || slid) { e.stopPropagation(); e.preventDefault(); return; }
    lastTap = now;
  }, true);

  /* ======================================================================
     TV CHANNELS (DECADES) AND NEW MUSIC
     ====================================================================== */
  const ERAS = [
    { id: '30s', name: '1930s', ch: 1, track: 'lounge', ic: '🎙️' },
    { id: '40s', name: '1940s', ch: 2, track: 'forties', ic: '🎺' },
    { id: '50s', name: '1950s', ch: 3, track: 'ballad', ic: '💃' },
    { id: '60s', name: '1960s', ch: 4, track: 'easy', ic: '🌼' }
  ];
  const eraOf = () => ERAS.find(e => e.id === settings.era) || ERAS[0];
  const eraLabel = () => `Channel ${eraOf().ch} · ${eraOf().name}`;
  Object.assign(Sound.TRACKS, {
    forties: { name: 'Forties Swing', desc: 'A brisk, happy dance band', ic: '🎺', bpm: 128, meter: 4, style: 'swing', key: 7, leads: ['clarinet', 'muted_trumpet'], lo: 62, hi: 79,
      A: ['G:6', 'E:7', 'A:m7', 'D:7', 'B:m7', 'E:7', 'A:m7', 'D:7'], B: ['C:maj7', 'C:m6', 'G:6', 'E:7', 'A:7', 'A:7', 'D:7', 'D:7'], form: 'AABA',
      inst: ['acoustic_grand_piano', 'acoustic_bass', 'clarinet', 'muted_trumpet', 'trombone', 'tenor_sax', 'acoustic_guitar_nylon'] },
    ballad: { name: 'Fifties Ballad', desc: 'A slow dance with tenor sax', ic: '💃', bpm: 66, meter: 4, style: 'lounge', key: 0, leads: ['tenor_sax', 'vibraphone'], lo: 58, hi: 76,
      A: ['C:maj7', 'A:m7', 'F:maj7', 'G:7', 'C:maj7', 'A:m7', 'D:m7', 'G:7'], B: ['E:m7', 'A:7', 'D:m7', 'G:7', 'E:m7', 'A:7', 'D:m7', 'G:7'], form: 'AABA',
      inst: ['acoustic_grand_piano', 'acoustic_bass', 'tenor_sax', 'vibraphone'] },
    easy: { name: 'Sixties Easy Listening', desc: 'Strings, vibes and a gentle sway', ic: '🌼', bpm: 100, meter: 3, style: 'waltz', key: 5, leads: ['vibraphone', 'clarinet'], lo: 63, hi: 80,
      A: ['F:maj7', 'D:m7', 'G:m7', 'C:7', 'A:m7', 'D:7', 'G:m7', 'C:7'], B: ['Bb:maj7', 'Bb:m6', 'A:m7', 'D:7', 'G:m7', 'C:7', 'F:6', 'C:7'], form: 'AABA',
      inst: ['acoustic_grand_piano', 'acoustic_bass', 'vibraphone', 'clarinet', 'string_ensemble_1', 'acoustic_guitar_nylon'] }
  });
  function setEra(id, playMusic) {
    settings.era = id; saveSettings(); applyComfort();
    if (playMusic && settings.track !== 'off') { settings.track = eraOf().track; saveSettings(); if (!musicPaused) Sound.play(settings.track); }
  }
  // the TV in the intro shows its channel, and its right-hand knob changes channel
  (function tvChannel() {
    const glass = document.querySelector('.tv-glass'); if (!glass) return;
    const lab = document.createElement('span'); lab.className = 'tv-chan'; glass.append(lab);
    const knobs = document.querySelectorAll('.tv-knob'); const knob = knobs[knobs.length - 1];
    if (knob) knob.addEventListener('click', e => {
      e.stopPropagation(); e.preventDefault();
      const i = ERAS.indexOf(eraOf()); setEra(ERAS[(i + 1) % ERAS.length].id, false); tone(500 + i * 60, .08, 'square', .05);
      knob.style.transform = `rotate(${(i + 1) * 70}deg)`;
    }, true);
  })();

  /* ======================================================================
     PROFILES
     ====================================================================== */
  const profiles = () => { let p; try { p = JSON.parse(localStorage.getItem('recall:profiles')); } catch (e) {} if (!Array.isArray(p) || !p.length) p = [{ id: '', name: 'Me', ic: '🙂' }]; return p; };
  const saveProfiles = list => { try { localStorage.setItem('recall:profiles', JSON.stringify(list)); } catch (e) {} };
  const me = () => profiles().find(p => p.id === ACTIVE_PROFILE) || profiles()[0];
  const esc = t => String(t).replace(/[<&>"]/g, c => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;', '"': '&quot;' }[c]));
  function switchProfile(id) {
    try { localStorage.setItem('recall:activeProfile', id); sessionStorage.setItem('recall:skipIntro', '1'); } catch (e) {}
    location.reload();
  }
  const AVATARS = ['🙂', '👵', '👴', '👩', '👨', '🧑', '🌷', '🌻', '🐱', '🐶', '⭐', '🎩'];
  function sheet(html) {
    const s = el('div', 'xsheet', `<div class="xcard" role="dialog">${html}</div>`);
    s.addEventListener('click', e => { if (e.target === s) s.remove(); });
    document.body.append(s); return s;
  }
  function openProfiles() {
    const list = profiles();
    const s = sheet(`<h2>Who's playing?</h2><p>Each person keeps their own games, stars, favourites and settings on this device.</p><div class="proflist"></div>
      <div class="xbtns"><button class="btn c-leaf" data-add type="button">+ Add a person</button><button class="btn c-card" data-close type="button">Close</button></div>`);
    const box = s.querySelector('.proflist');
    list.forEach(p => {
      const b = el('button', 'profbtn' + (p.id === ACTIVE_PROFILE ? ' on' : ''), `<span class="av">${p.ic}</span>${esc(p.name)}`); b.type = 'button';
      b.onclick = () => { if (p.id === ACTIVE_PROFILE) { s.remove(); return; } sfx.tap(); switchProfile(p.id); };
      box.append(b);
    });
    s.querySelector('[data-close]').onclick = () => s.remove();
    s.querySelector('[data-add]').onclick = () => { s.remove(); addProfile(); };
    if (list.length > 1) {
      const rm = el('button', 'btn c-card', '🗑 Remove a person'); rm.type = 'button'; rm.style.marginTop = '10px'; rm.style.width = '100%';
      rm.onclick = () => { s.remove(); removeProfile(); }; s.querySelector('.xcard').append(rm);
    }
  }
  function addProfile() {
    let ic = AVATARS[1];
    const s = sheet(`<h2>Add a person</h2><label for="pname"><p>Their name</p></label><input id="pname" class="xinput" maxlength="16" autocomplete="off" placeholder="e.g. Mum, Arthur, Room 12">
      <p>Pick a picture</p><div class="emrow"></div><div class="xbtns"><button class="btn c-leaf" data-ok type="button">Add</button><button class="btn c-card" data-close type="button">Cancel</button></div>`);
    const row = s.querySelector('.emrow');
    AVATARS.forEach(a => { const b = el('button', '', a); b.type = 'button'; b.setAttribute('aria-pressed', String(a === ic)); b.onclick = () => { ic = a; row.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x.textContent === a))); }; row.append(b); });
    s.querySelector('[data-close]').onclick = () => s.remove();
    s.querySelector('[data-ok]').onclick = () => {
      const name = s.querySelector('#pname').value.trim(); if (!name) { s.querySelector('#pname').focus(); return; }
      const list = profiles(); const id = 'u' + Date.now().toString(36);
      list.push({ id, name, ic }); saveProfiles(list); sfx.good(); switchProfile(id);
    };
    setTimeout(() => s.querySelector('#pname').focus(), 50);
  }
  function removeProfile() {
    const list = profiles();
    const s = sheet(`<h2>Remove a person</h2><p>This deletes their games, stars, photos and settings on this device. Tap a person twice to remove them.</p><div class="proflist"></div><div class="xbtns"><button class="btn c-card" data-close type="button">Done</button></div>`);
    const box = s.querySelector('.proflist');
    list.forEach(p => {
      if (p.id === '' && list.length === 1) return;
      const b = el('button', 'profbtn', `<span class="av">${p.ic}</span>${esc(p.name)}`); b.type = 'button'; let armed = false;
      b.onclick = () => {
        if (!armed) { armed = true; b.lastChild.textContent = 'Tap to remove'; setTimeout(() => { armed = false; b.lastChild.textContent = p.name; }, 3000); return; }
        try { Object.keys(localStorage).filter(k => p.id ? k.startsWith('recall:p:' + p.id + ':') : (k.startsWith('recall:') && !k.startsWith('recall:p:') && k !== 'recall:profiles' && k !== 'recall:activeProfile')).forEach(k => localStorage.removeItem(k)); } catch (e) {}
        const rest = profiles().filter(x => x.id !== p.id); saveProfiles(rest.length ? rest : [{ id: '', name: 'Me', ic: '🙂' }]);
        if (p.id === ACTIVE_PROFILE) switchProfile(rest.length ? rest[0].id : ''); else { s.remove(); removeProfile(); }
      };
      box.append(b);
    });
    s.querySelector('[data-close]').onclick = () => s.remove();
  }
  // profile chip on the home screen
  const chip = el('button', 'profchip'); chip.type = 'button';
  chip.onclick = () => { sfx.tap(); openProfiles(); };
  document.querySelector('.topbtns').prepend(chip);
  const drawChip = () => { const p = me(); chip.innerHTML = `${p.ic} ${esc(p.name)} ▾`; chip.setAttribute('aria-label', 'Player: ' + p.name + '. Change player'); };
  drawChip();

  /* ======================================================================
     SEARCH AND RECENTLY PLAYED
     ====================================================================== */
  const findbar = el('div', 'findbar', '<input id="findGame" type="search" placeholder="Find a game…" aria-label="Find a game" autocomplete="off">');
  const recent = el('div', 'recent'), quick = el('div', 'quick');
  const menu = document.getElementById('menu');
  menu.parentNode.insertBefore(quick, menu); menu.parentNode.insertBefore(findbar, menu); menu.parentNode.insertBefore(recent, menu);
  const find = document.getElementById('findGame');
  const norm = t => t.toLowerCase().replace(/[’']/g, '');
  find.addEventListener('input', () => { const q = find.value.trim(); view = q ? { type: 'search', q } : { type: 'cats' }; renderHome(); });
  function recentGames() {
    const log = store.get('log', []), out = [];
    for (let i = log.length - 1; i >= 0 && out.length < 6; i--) { const g = GAMES.find(x => x.id === log[i].id); if (g && !out.includes(g) && shown(g)) out.push(g); }
    return out;
  }

  /* ======================================================================
     STICKERS AND CALENDAR
     ====================================================================== */
  function playedIds() { return Object.keys(progress).filter(id => Object.keys(progress[id].best || {}).length); }
  function stickerList() {
    const played = playedIds(), stars = GAMES.reduce((a, g) => a + gameStars(g.id), 0);
    const threes = Object.values(progress).reduce((a, p) => a + Object.values(p.best || {}).filter(s => s === 3).length, 0);
    const log = store.get('log', []), days = new Set(log.map(e => new Date(e.d).toDateString())).size;
    const list = [];
    CATS.forEach(c => list.push({ ic: c.icon, name: c.name, how: `Finish a game in ${c.name}`, got: played.some(id => (GAMES.find(g => g.id === id) || {}).cat === c.id) }));
    [[1, '🎉', 'First game'], [10, '🔟', '10 different games'], [25, '🎯', '25 different games'], [50, '🏆', '50 different games'], [100, '💯', '100 different games'], [150, '👑', '150 different games']]
      .forEach(([n, ic, name]) => list.push({ ic, name, how: `Finish ${n} different game${n > 1 ? 's' : ''}`, got: played.length >= n }));
    [[10, '⭐'], [50, '🌟'], [100, '💫'], [250, '✨'], [500, '🌠'], [1000, '🌌']].forEach(([n, ic]) => list.push({ ic, name: `${n} stars`, how: `Collect ${n} stars`, got: stars >= n }));
    [[1, '🥇', 'Perfect!'], [10, '🎖️', 'Ten perfect games'], [50, '🏅', 'Fifty perfect games']].forEach(([n, ic, name]) => list.push({ ic, name, how: `Get 3 stars ${n === 1 ? 'once' : n + ' times'}`, got: threes >= n }));
    [[3, '🌱'], [7, '🌼'], [30, '🌻'], [100, '🌳']].forEach(([n, ic]) => list.push({ ic, name: `${n} days`, how: `Play on ${n} different days`, got: days >= n }));
    list.push({ ic: '🎁', name: 'Prize winner', how: 'Swap tickets for a fairground prize', got: (store.get('prizeShelf', []) || []).length > 0 });
    list.push({ ic: '💖', name: 'Favourites', how: 'Choose 3 favourite games', got: (settings.favs || []).length >= 3 });
    list.push({ ic: '👪', name: 'Family album', how: "Add someone to Who's Who", got: (store.get('whoswho', []) || []).length > 0 });
    list.push({ ic: '🤝', name: 'Playing together', how: 'Play a game in Play together mode', got: !!(settings.together && settings.together.stars.some(x => x > 0)) });
    list.push({ ic: '📻', name: 'Listener', how: 'Tune in to The Wireless', got: !!store.get('wirelessHeard', false) });
    return list;
  }
  let calMonth = null;
  function renderRewards(box, tab) {
    const head = el('div', 'viewhead'); head.append(backButton(() => setView({ type: 'cats' })), el('div', '', '<h2>🏅 Stickers & Calendar</h2>'));
    const tabs = el('div', 'tabs');
    [['stickers', '🏅 Sticker book'], ['cal', '📅 Days played']].forEach(([id, label]) => { const b = el('button', 'btn c-card', label); b.type = 'button'; b.setAttribute('aria-pressed', String(tab === id)); b.onclick = () => { sfx.tap(); setView({ type: 'rewards', tab: id }); }; tabs.append(b); });
    box.append(head, tabs);
    if (tab === 'cal') {
      const log = store.get('log', []), now = new Date();
      if (!calMonth) calMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const y = calMonth.getFullYear(), m = calMonth.getMonth(), first = new Date(y, m, 1), daysIn = new Date(y, m + 1, 0).getDate();
      const mins = {}; log.forEach(e => { const k = new Date(e.d).toDateString(); mins[k] = (mins[k] || 0) + e.m / 60; });
      const cal = el('div', 'cal'); const hd = el('div', 'calhead');
      const prev = el('button', 'btn c-card', '◀'), next = el('button', 'btn c-card', '▶'); prev.type = next.type = 'button';
      prev.setAttribute('aria-label', 'Previous month'); next.setAttribute('aria-label', 'Next month');
      prev.onclick = () => { calMonth = new Date(y, m - 1, 1); renderHome(); }; next.onclick = () => { calMonth = new Date(y, m + 1, 1); renderHome(); };
      hd.append(prev, el('h3', '', first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })), next);
      const grid = el('div', 'calgrid');
      ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach(d => grid.append(el('div', 'dow', d)));
      for (let i = 0; i < (first.getDay() + 6) % 7; i++) grid.append(el('div', 'day empty'));
      let played = 0;
      for (let d = 1; d <= daysIn; d++) {
        const dt = new Date(y, m, d), k = dt.toDateString(), mn = mins[k] || 0; if (mn) played++;
        grid.append(el('div', 'day' + (k === now.toDateString() ? ' today' : ''), `${d}<span>${mn >= 30 ? '🌻' : mn >= 10 ? '🌼' : mn > 0 ? '🌱' : ''}</span>`));
      }
      cal.append(hd, grid, el('p', 'calnote', `${played} day${played === 1 ? '' : 's'} with games this month. 🌱 a little · 🌼 10 minutes or more · 🌻 half an hour or more`));
      box.append(cal);
      $('#home').classList.remove('fit');
    } else {
      const list = stickerList(), got = list.filter(s => s.got).length;
      box.append(el('p', 'viewhead', `<span style="font:600 1.15rem var(--display)">${got} of ${list.length} stickers collected</span>`));
      const grid = el('div', 'stickers');
      list.forEach(s => grid.append(el('div', 'stk' + (s.got ? '' : ' locked'), `<span class="disc">${s.got ? s.ic : '?'}</span><b>${esc(s.name)}</b><small>${esc(s.how)}</small>`)));
      box.append(grid);
      $('#home').classList.remove('fit');
    }
  }

  /* ======================================================================
     HOME SCREEN: wrap renderHome for search, recent, rewards and new views
     ====================================================================== */
  const baseRenderHome = renderHome;
  renderHome = function () {
    drawChip(); applyComfort();
    const simple = settings.simple && settings.simple.on;
    const showFind = !simple && (view.type === 'cats' || view.type === 'search');
    findbar.hidden = !showFind; if (view.type !== 'search' && find.value) find.value = '';
    if (view.type === 'search') {
      tickClock(); renderTogether && renderTogether();
      const box = $('#menu'); box.innerHTML = '';
      const q = norm(view.q), words = q.split(/\s+/).filter(Boolean);
      const hits = GAMES.filter(shown).filter(g => { const hay = norm(g.name + ' ' + g.desc + ' ' + (catOf(g.cat) || {}).name); return words.every(w => hay.includes(w)); }).sort((a, b) => a.name.localeCompare(b.name));
      const head = el('div', 'viewhead', `<div><h2>${hits.length ? hits.length + ' game' + (hits.length > 1 ? 's' : '') : 'No games found'}</h2><p>${hits.length ? 'for “' + esc(view.q) + '”' : 'Try another word, like cards, birds or music.'}</p></div>`);
      box.append(head); if (hits.length) box.append(gameTiles(hits)); else $('#home').classList.remove('fit');
      recent.hidden = true; return;
    }
    if (view.type === 'rewards') {
      tickClock(); const box = $('#menu'); box.innerHTML = ''; recent.hidden = true;
      renderRewards(box, view.tab || 'stickers'); return;
    }
    baseRenderHome();
    // recently played row
    const rec = (view.type === 'cats') ? recentGames() : [];
    recent.hidden = !rec.length; recent.innerHTML = '';
    if (rec.length) {
      recent.append(el('span', 'lab', 'Recently:'));
      rec.forEach(g => { const b = el('button', '', `<span aria-hidden="true">${g.icon}</span>${esc(g.name)}`); b.type = 'button'; b.onclick = () => { sfx.tap(); openGame(g.id, prog(g.id).level); }; recent.append(b); });
    }
    // quick buttons: Today, Today's Three, Favourites, Stickers
    quick.hidden = !(view.type === 'cats' && !simple); quick.innerHTML = '';
    if (!quick.hidden) {
      const nf = GAMES.filter(g => isFav(g.id) && shown(g)).length, got = stickerList().filter(s => s.got).length;
      [['📅', 'Today', () => setView({ type: 'board' })], ['🎲', 'Today’s 3', () => setView({ type: 'today' })],
       nf ? ['♥', `Favourites`, () => setView({ type: 'favs' })] : null, ['🏅', `Stickers`, () => setView({ type: 'rewards', tab: 'stickers' })]]
        .filter(Boolean).forEach(([ic, name, fn]) => { const b = el('button', 'qbtn', `<span aria-hidden="true">${ic}</span>${name}`); b.type = 'button'; b.onclick = () => { sfx.tap(); fn(); }; quick.append(b); });
    }
  };

  /* ======================================================================
     HOW TO PLAY
     ====================================================================== */
  const helpBtn = el('button', 'helpbtn', '?'); helpBtn.type = 'button'; helpBtn.setAttribute('aria-label', 'How to play');
  helpBtn.onclick = () => { sfx.tap(); if (current) showHowTo(current.g); };
  document.querySelector('.gtitle').append(helpBtn);
  function showHowTo(g) {
    const c = catOf(g.cat) || {}, first = ($('#gHint').textContent || '').trim();
    const tips = ['Tap things to choose them. You never need to drag.', 'Look for the 💡 or “Help me” buttons if you get stuck.', 'There are no timers, and you can’t lose.', '↻ Again starts over. ← Back goes to the menu.'];
    if (c.id === 'relax') tips.splice(2, 1, 'There’s nothing to win. Tap ✓ when you’ve had enough.');
    const s = sheet(`<div class="howto"><div class="hicon" aria-hidden="true">${g.icon}</div><h2>${esc(g.name)}</h2><p>${esc(g.desc)}.</p>
      ${first ? `<div class="howline">${esc(first)}</div>` : ''}<ul>${tips.map(t => `<li>${t}</li>`).join('')}</ul>
      <div class="xbtns"><button class="btn c-leaf" data-go type="button">Let’s play!</button><button class="btn c-card" data-say type="button">🔊 Read it to me</button></div></div>`);
    s.querySelector('[data-go]').onclick = () => { sfx.tap(); s.remove(); };
    const sayB = s.querySelector('[data-say]');
    if (!('speechSynthesis' in window)) sayB.remove();
    else sayB.onclick = () => { if (!R.say(`${g.name}. ${g.desc}. ${first}`)) toast('Turn the sound on to hear it'); };
  }

  /* ======================================================================
     GAME HOOKS: how-to-play on first visit, break timer, stickers, wireless flag
     ====================================================================== */
  let playSecs = store.get('playSecs', 0);
  setInterval(() => { if (current && !document.hidden && !$('#game').hidden) { playSecs += 5; if (playSecs % 60 === 0) store.set('playSecs', playSecs); } }, 5000);
  const baseOpen = openGame;
  openGame = function (id, level) {
    document.querySelectorAll('.xsheet').forEach(s => s.remove());
    if (typeof stopWireless === 'function' && id !== 'wireless') stopWireless();
    baseOpen(id, level);
    const g = GAMES.find(x => x.id === id);
    if (g && settings.howto && !(settings.seenHelp || []).includes(id)) {
      settings.seenHelp = (settings.seenHelp || []).concat(id); saveSettings();
      setTimeout(() => { if (current && current.g.id === id) showHowTo(g); }, 250);
    }
  };
  const baseFinish = finishGame;
  finishGame = function (stars) {
    const before = stickerList().filter(s => s.got).map(s => s.name);
    baseFinish(stars);
    setTimeout(() => {
      const fresh = stickerList().filter(s => s.got && !before.includes(s.name));
      if (fresh.length) toast(`🏅 New sticker: ${fresh[0].ic} ${fresh[0].name}`);
    }, 1700);
    if (settings.breakMins && playSecs >= settings.breakMins * 60) setTimeout(breakSheet, 2600);
  };
  function breakSheet() {
    if (document.querySelector('.xsheet')) return;
    const mins = Math.round(playSecs / 60);
    const s = sheet(`<div class="howto"><div class="hicon" aria-hidden="true">☕</div><h2>Time for a little break?</h2><p>You’ve been playing for about ${mins} minutes. How about a cup of tea, a drink of water and a gentle stretch?</p>
      <div class="xbtns"><button class="btn c-leaf" data-break type="button">☕ I’ll take a break</button><button class="btn c-card" data-on type="button">Keep playing</button></div></div>`);
    if (settings.speak) R.say('Time for a little break? How about a cup of tea and a gentle stretch?');
    s.querySelector('[data-break]').onclick = () => { playSecs = 0; store.set('playSecs', 0); s.remove(); showHome(); toast('Enjoy your break ☕'); };
    s.querySelector('[data-on]').onclick = () => { playSecs = Math.max(0, playSecs - 15 * 60); store.set('playSecs', playSecs); s.remove(); };
  }

  /* ======================================================================
     PHOTO FRAME (when Recall is left on the home screen)
     ====================================================================== */
  let lastActive = Date.now(), frameEl = null;
  ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(ev => document.addEventListener(ev, () => { lastActive = Date.now(); }, { passive: true, capture: true }));
  function framePictures() {
    const pics = [];
    (store.get('whoswho', []) || []).forEach(p => { if (p && typeof p.img === 'string' && p.img.startsWith('data:image/')) pics.push({ src: p.img, cap: p.name + (p.rel ? ', ' + p.rel : '') }); });
    (store.get('gentle-photos', []) || []).forEach(src => { if (typeof src === 'string' && src.startsWith('data:image/')) pics.push({ src, cap: '' }); });
    (store.get('lifebook', []) || []).forEach(p => { if (!p) return; const src = Object.values(p).find(v => typeof v === 'string' && v.startsWith('data:image/')); if (src) pics.push({ src, cap: p.cap || '' }); });
    if (!pics.length) [['🌅', 'A calm morning'], ['🌻', 'Sunflowers'], ['🏖️', 'By the seaside'], ['🌳', 'In the park'], ['🫖', 'Time for tea'], ['🐦', 'Birdsong'], ['🌙', 'A peaceful night']].forEach(([e, c]) => pics.push({ emoji: e, cap: c }));
    return pics;
  }
  window.RecallFramePictures = framePictures;
  function showFrame() {
    if (window.RecallFrame) return window.RecallFrame.show(); /* photoframe.js: MiVida photos, picks, timing */
    if (frameEl) return;
    const pics = framePictures(); let i = 0;
    frameEl = el('div', 'frame', '<div class="pic"></div><div class="clockrow"><span class="t"></span><span class="d"></span></div><span class="tap">Tap to return</span>');
    frameEl.setAttribute('role', 'dialog'); frameEl.setAttribute('aria-label', 'Photo frame. Tap to return');
    document.body.append(frameEl);
    const pic = frameEl.querySelector('.pic');
    const tick = () => { const d = new Date(); frameEl.querySelector('.t').textContent = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); frameEl.querySelector('.d').textContent = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }); };
    const showPic = () => {
      const p = pics[i++ % pics.length];
      const node = p.src ? el('img') : el('div', 'scene', p.emoji); if (p.src) { node.src = p.src; node.alt = p.cap || 'Photo'; }
      node.style.opacity = 0; pic.append(node);
      const cap = el('div', 'cap', esc(p.cap || '')); if (!p.cap) cap.hidden = true;
      requestAnimationFrame(() => { node.style.opacity = 1; });
      [...pic.children].forEach(ch => { if (ch !== node && ch !== cap) { ch.style.opacity = 0; setTimeout(() => ch.remove(), 1300); } });
      pic.append(cap);
    };
    tick(); showPic();
    const t1 = setInterval(tick, 15000), t2 = setInterval(showPic, 9000);
    frameEl.onclick = () => { clearInterval(t1); clearInterval(t2); frameEl.remove(); frameEl = null; lastActive = Date.now(); };
  }
  setInterval(() => {
    if (!settings.frameMins || frameEl || document.querySelector('.frame')) return;
    const onHome = !$('#home').hidden && $('#intro').hidden && $('#settings').hidden && !document.querySelector('.xsheet');
    if (onHome && Date.now() - lastActive > settings.frameMins * 60000) showFrame();
  }, 10000);

  /* ======================================================================
     SETTINGS: comfort, channels, guides, frame, breaks
     ====================================================================== */
  const extra = el('div', '', `
    <h3 id="chanHead">TV channel</h3><div class="opts" id="eras" role="radiogroup" aria-labelledby="chanHead"></div>
    <h3>Comfort</h3>
    <div class="setrow"><span id="lblHc">High contrast</span><button class="switch" id="swHc" type="button" role="switch" aria-labelledby="lblHc"></button></div>
    <div class="setrow"><span id="lblSteady">Steady hands (ignore accidental double taps)</span><button class="switch" id="swSteady" type="button" role="switch" aria-labelledby="lblSteady"></button></div>
    <div class="setrow"><span id="lblCalm">Calmer movement (less animation)</span><button class="switch" id="swCalm" type="button" role="switch" aria-labelledby="lblCalm"></button></div>
    <div class="setrow"><span id="lblHow">Show how to play the first time</span><button class="switch" id="swHow" type="button" role="switch" aria-labelledby="lblHow"></button></div>
    <h3 id="sideHead">Where the big buttons go</h3><div class="opts" id="sides" role="radiogroup" aria-labelledby="sideHead"></div>
    <h3 id="frameHead">Photo frame when left alone</h3><div class="opts" id="frames" role="radiogroup" aria-labelledby="frameHead"></div>
    <div class="sheetbtns" style="margin-top:10px"><button class="btn c-card" id="frameOptsBtn" type="button">🖼️ Photos and timing</button><button class="btn c-sky" id="frameNowBtn" type="button">▶ Show it now</button></div>
    <h3 id="breakHead">Break reminder</h3><div class="opts" id="breaks" role="radiogroup" aria-labelledby="breakHead"></div>`);
  const carerHead = document.getElementById('carerHead'); carerHead.parentNode.insertBefore(extra, carerHead);
  function radios(boxId, opts, cur, onPick) {
    const box = document.getElementById(boxId); box.innerHTML = '';
    opts.forEach(([val, label, ic]) => {
      const b = el('button', 'opt', `${ic ? `<span class="ic" aria-hidden="true">${ic}</span>` : ''}<b>${label}</b>`); b.type = 'button';
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(cur === val));
      b.onclick = () => { onPick(val); sfx.tap(); renderSettings(); }; box.append(b);
    });
  }
  const baseRenderSettings = renderSettings;
  renderSettings = function () {
    baseRenderSettings();
    setSwitch('swHc', !!settings.hc); setSwitch('swSteady', !!settings.steady); setSwitch('swCalm', !!settings.calm); setSwitch('swHow', !!settings.howto);
    radios('eras', ERAS.map(e => [e.id, `${e.name}`, e.ic]), settings.era, v => setEra(v, true));
    radios('sides', [['right', 'Right', '➡️'], ['left', 'Left', '⬅️'], ['bottom', 'Bottom', '⬇️']], settings.dockPos, v => { settings.dockPos = v; saveSettings(); applyComfort(); queueFit(); renderHome(); });
    radios('frames', [[0, 'Off'], [2, '2 min'], [5, '5 min'], [10, '10 min']], settings.frameMins, v => { settings.frameMins = v; saveSettings(); });
    radios('breaks', [[0, 'Off'], [20, '20 min'], [30, '30 min'], [45, '45 min']], settings.breakMins, v => { settings.breakMins = v; saveSettings(); });
  };
  document.getElementById('swHc').onclick = () => { settings.hc = !settings.hc; saveSettings(); applyComfort(); renderSettings(); };
  document.getElementById('swSteady').onclick = () => { settings.steady = !settings.steady; saveSettings(); renderSettings(); };
  document.getElementById('swCalm').onclick = () => { settings.calm = !settings.calm; saveSettings(); applyComfort(); renderSettings(); };
  document.getElementById('swHow').onclick = () => { settings.howto = !settings.howto; if (settings.howto) settings.seenHelp = []; saveSettings(); renderSettings(); };
  ['#frames', '#breaks', '#sides', '#eras'].forEach(id => { const b = document.querySelector(id); if (b) b.classList.add('three'); });
  R.css(`#frames, #breaks{grid-template-columns:repeat(4, minmax(0, 1fr))} #sides{grid-template-columns:repeat(3, minmax(0, 1fr))} #eras{grid-template-columns:repeat(auto-fit, minmax(110px, 1fr))} #eras .opt, #frames .opt, #breaks .opt, #sides .opt{grid-template-columns:1fr; justify-items:center; text-align:center}`);

  /* ======================================================================
     THE WIRELESS (a radio with announcements between tunes)
     ====================================================================== */
  MUSIC_GAMES.add('wireless');
  let wirelessOn = false;
  const stopWireless = () => { if (wirelessOn) { wirelessOn = false; Sound.stop(); try { speechSynthesis.cancel(); } catch (e) {} } };
  const baseShowHome = showHome;
  showHome = function () { stopWireless(); baseShowHome(); };
  function startWireless(level, api) {
    store.set('wirelessHeard', true); wirelessOn = true;
    const stations = Object.entries(Sound.TRACKS).map(([id, t]) => ({ id, ...t }));
    let st = stations.findIndex(s => s.id === eraOf().track); if (st < 0) st = 0;
    const root = el('div', 'wl');
    const radio = el('div', 'radio on', '<span class="glow"></span><div class="grille"></div><div class="dial"><i></i></div>');
    const dial = radio.querySelector('.dial'), needle = dial.querySelector('i');
    stations.forEach((s, i) => { const lab = el('span', '', String(i + 1)); lab.style.left = (8 + i * 84 / Math.max(1, stations.length - 1)) + '%'; dial.append(lab); });
    const say = el('div', 'say', '');
    const stBox = el('div', 'stations');
    const row = el('div', 'row');
    const annB = el('button', 'btn c-sun', '🎙️ Hear the news'), fin = el('button', 'btn c-leaf', '✓ I’m finished'); annB.type = fin.type = 'button';
    row.append(annB, fin); root.append(radio, say, stBox, row); api.stage.append(root);
    const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
    function announcement() {
      const d = new Date(), b = store.get('board', {}), key = d.toDateString();
      const wx = b.wx && b.wx[key] != null ? WX[b.wx[key]] : null;
      const notes = (b.notes || []).filter(n => n.k === key).map(n => n.t);
      let t = `${greet()}, and welcome to Radio Recall. It's ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} on ${d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}.`;
      if (wx) t += ` The weather today is ${wx[1].toLowerCase()}.`;
      if (notes.length) t += ` A reminder for today: ${notes.join('. ')}.`;
      t += ` Here's some ${stations[st].name.replace(/^the /i, '')} for you.`;
      return t;
    }
    function tune(i, talk) {
      st = i; needle.style.left = (8 + i * 84 / Math.max(1, stations.length - 1)) + '%';
      stBox.querySelectorAll('.btn').forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
      Sound.stop();
      if (talk) {
        const t = announcement(); say.textContent = '🎙️ ' + t; api.hint('Radio Recall is on the air. Tap a station to change the music.');
        const spoke = R.say(t, .88);
        api.later(() => Sound.play(stations[st].id), spoke ? Math.min(14000, 2500 + t.length * 65) : 1200);
      } else { say.textContent = '🎵 Now playing: ' + stations[st].name + '. ' + stations[st].desc + '.'; Sound.play(stations[st].id); }
    }
    stations.forEach((s, i) => { const b = el('button', 'btn c-card', `${s.ic} ${s.name}`); b.type = 'button'; b.onclick = () => { sfx.tap(); tune(i, false); }; stBox.append(b); });
    annB.onclick = () => tune(st, true);
    let done = false;
    fin.onclick = () => { if (done) return; done = true; Sound.stop(); try { speechSynthesis.cancel(); } catch (e) {} api.done(3); };
    if (R.isMuted()) { const u = el('button', 'btn c-sun', '🔊 Turn the sound on'); u.type = 'button'; u.onclick = () => { R.unmute(); u.remove(); tune(st, true); }; row.prepend(u); }
    tune(st, true);
    // a fresh announcement every few minutes
    (function loop() { api.later(() => { if (!root.isConnected || done) return; tune(st, true); loop(); }, 4 * 60 * 1000); })();
    // stop the band when leaving
    (function watch() { api.later(() => { if (!root.isConnected) return; watch(); }, 1000); })();
  }
  register({ id: 'wireless', cat: 'relax', gentle: true, order: 16, name: 'The Wireless', icon: '📻', desc: 'Old-time radio with music and friendly announcements', start: startWireless });

  /* MiVida button in the button bar (MiVida lives in the mivida/ folder inside Recall) */
  // MiVida opens as its own page in a new tab or window, so Recall keeps running untouched
  const mvBtn = el('a', 'brass', '<span class="i" aria-hidden="true">📘</span><span class="l">MiVida</span>');
  mvBtn.id = 'mvBtn'; mvBtn.href = MIVIDA_URL; mvBtn.target = '_blank'; mvBtn.rel = 'noopener'; mvBtn.style.textDecoration = 'none';
  mvBtn.setAttribute('aria-label', 'Open MiVida in a new tab');
  mvBtn.addEventListener('click', () => { sfx.tap(); setTimeout(pauseRecall, 50); });
  mvBtn.addEventListener('pause-recall', () => pauseRecall());
  // while MiVida is open, Recall pauses: sound stops and a big "Paused" card waits for a tap
  let pauseEl = null;
  function pauseRecall() {
    if (pauseEl) return;
    try { speechSynthesis.cancel(); } catch (e) {}
    const ctx = Sound.init(); if (ctx) try { ctx.suspend(); } catch (e) {}
    pauseEl = el('button', 'pauseov', `<span class="pz-card"><span class="pic" aria-hidden="true">⏸️</span><b>Recall is paused</b><span>MiVida is open in another tab or window.</span><span class="go">Tap anywhere to carry on ▶</span></span>`);
    pauseEl.type = 'button'; pauseEl.setAttribute('aria-label', 'Recall is paused. Tap to carry on');
    pauseEl.onclick = () => { pauseEl.remove(); pauseEl = null; const c = Sound.init(); if (c) try { c.resume(); } catch (e) {} sfx.tap(); };
    document.body.append(pauseEl);
  }
  R.css(`.pauseov{position:fixed; inset:0; z-index:95; border:0; padding:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; background:rgba(5,30,38,.82); color:var(--ink); font:inherit}
    .pauseov .pz-card{display:flex; flex-direction:column; align-items:center; gap:8px; text-align:center; background:var(--card); border-radius:28px; padding:28px 26px; width:min(440px, 100%); height:auto; align-self:center; justify-self:center;
      box-shadow:0 9px 0 var(--card-edge), 0 24px 50px rgba(0,0,0,.45); animation:rise .4s cubic-bezier(.3,1.4,.5,1)}
    .pauseov .pic{font-size:3.6rem; line-height:1}
    .pauseov b{font:700 2rem var(--display)}
    .pauseov span{font-size:1.15rem; color:var(--ink-soft)}
    .pauseov .go{margin-top:10px; font:600 1.3rem var(--display); color:var(--ink); background:var(--leaf); border-radius:18px; padding:.6em 1.2em; box-shadow:0 6px 0 var(--leaf-d)}`);
  document.getElementById('dock').append(mvBtn);
  // Home button at the top of the button bar: back to the main game page from anywhere
  const homeDockBtn = el('button', 'brass', '<span class="i" aria-hidden="true">🏠</span><span class="l">Home</span>');
  homeDockBtn.type = 'button'; homeDockBtn.id = 'homeDockBtn'; homeDockBtn.setAttribute('aria-label', 'Home: back to the main game page');
  homeDockBtn.onclick = () => {
    sfx.tap();
    document.querySelectorAll('.xsheet').forEach(s => s.remove());
    $('#settings').hidden = true; $('#win').hidden = true;
    view = { type: 'cats' }; showHome();
  };
  document.getElementById('dock').prepend(homeDockBtn);

  /* ======================================================================
     START-UP
     ====================================================================== */
  applyComfort();
  try {
    if (sessionStorage.getItem('recall:skipIntro')) {
      sessionStorage.removeItem('recall:skipIntro');
      $('#intro').hidden = true; $('#bezel').hidden = false; $('#dock').hidden = false; document.body.classList.add('tv-on');
      view = { type: 'cats' };
      setTimeout(() => toast(`Hello, ${me().name}!`), 400);
    }
  } catch (e) {}
})();
