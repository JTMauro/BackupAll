### Strategy game concept: Risk meets Nuclear War
*Created 2026-10-21 · last active 2026-10-21 · session `session_0142oGKUm7GMdayaEoMiBZFJ`*

**Goal:** Turn a concept for a super strategy game (Risk + Domination + Nuclear War-style missile attacks, as many countries as possible) into a playable, great-looking browser game with networked multiplayer.

**Requirements & decisions:**
- Combine Risk conquest and Domination ideas with missile attacks like the game Nuclear War; use as many countries as possible (built with real map data for 207 countries/territories). Working title chosen: **Global Dominion**.
- Best-graphics board game with realistic attacks and weapon attacks (missile strikes, propaganda, missile shields, nukes, Doomsday Clock).
- Victory condition selectable: 60%, 70%, 80%, 90% or 100% world control (AI rivals need the same share).
- Alliances and diplomacy (treaties); downloadable package; network multiplayer via Node.js server (lockstep engine with shared move queue and seeded randomness).
- Rotatable 3D globe; pop-up instructions/guide with advisor tips that can be turned off; mobile layout tightened.
- Joint assaults: several bordering countries can attack one target together (extra dice up to 5).
- Prices in credits ("cr"), not currency symbols.
- Dice speed option (Slow, Normal, Fast, Instant; per-player display setting).
- Settings menu (gear) on both the main setup screen and the play screen.
- Realistic planet: textured continents, realistic ocean, clouds (NASA Blue Marble imagery).
- Opening option "Draft": players take turns picking single territories until all are claimed (first pick is capital), alongside the default "Spheres" start; server updated for draft.

**Delivered & links:**
- Artifact "Global Dominion": https://claude.ai/artifact/3sgr3RpiKW3FMo3pJSnZo1 (latest version published 2026-10-21 03:27, with Draft opening).
- global-dominion.zip download (latest 2026-10-21 03:27): run `node server.js` (or start.bat on Windows) for multiplayer; public/index.html works offline solo. Replace old server.js with the new one.
- /home/user/global-dominion.zip and scratchpad game/global-dominion.html (container file, may be lost).

**Final state:** Game published and packaged; solo play, AI turns, two-browser multiplayer sync (including reload and draft) tested in headless browsers; phone layout checked.

**Open items:** None.

**Your messages:**
1. *(2026-10-21)* I am thinking of a super strategy game that uses all the great concepts of risk and all the great ideas of domination. but includes a attacks like missile attacks, etc. like the game nuclear war.  I want to utilitize as many countries as possible.
2. *(2026-10-21)* best graphics board game with realistic attacks and weapon attacks
3. *(2026-10-21)* victory option - percentage of world selectable - 60-100 %
4. *(2026-10-21)* add option for alliances, etc..  but also make downloadable and multiplayer option across network using node.js
5. *(2026-10-21)* make it a rotatable globe - 3d. and give instructions on what to do when playing using a pop-up screen - then opt to turn off asssistance.
6. *(2026-10-21)* allow that more than 1 neighboring country can attack - if you have 2 countries attacking another one, give option for multiple country attack
7. *(2026-10-21)* put price in credits, not euro or dollar.
8. *(2026-10-21)* give a dice speed option
9. *(2026-10-21)* and make a settings menu on main screen
10. *(2026-10-21)* and play screen
11. *(2026-10-21)* add texture to continents realistic ocean - make it look like a planet
12. *(2026-10-21)* add opening option in game to pick single territories in turns.
13. *(2026-10-21)* pick single terroritory in turns until all territories are chosen.
