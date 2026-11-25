### PlanetGuard
*Created 2026-10-21 · last active 2026-11-03 · session `session_01AXdush2wU3pV4QMLvtA3FN`*

**Goal:** Build a Defender-style arcade shooter with excellent graphics seen from a Zaxxon-style angled overhead view, playable online and as a downloadable file, then refine gameplay over several rounds.

**Requirements & decisions:**
- Defender gameplay with a Zaxxon point of view, excellent graphics (built as "Planetguard": WebGL, glow effects, real-time shadows, synthesized sound, floating plateau).
- Downloadable single offline HTML file (planetguard.html, ~700 KB, 3D engine embedded).
- Controls slower (thrust ~35% gentler, top speed ~30% lower), wider view, no road drawn.
- Controls menu (Esc or CONTROLS button) and whole game 10% slower.
- Falling colonists open striped parachutes and drift down.
- Player can pick up colonists from the ground and drop them at shelter pads (with green light beam) to save them.
- Auto-shield absorbs one hit; hull takes 25% or 50% damage depending on enemy strength; repair via hangar ship.
- Shield hidden until it blocks a hit; repair station is a flying aircraft carrier with drone-style rotors, appearing only once per wave.
- Boss (mothership) every 10th wave; a quest each wave (e.g. save 5 colonists); difficulty ramps through each set of 10 waves, wave 11 is 5% harder than wave 1 and increasing; failing a quest costs a ship and restarts the wave.
- All quests must be completable within the wave; show ships/lives counter; countdown clock for timed quests.
- Abducting landers rise 20% slower; player shots cannot hurt colonists.
- Fix: "destroy 13 landers" quest on wave 8 when no landers remain (mutants now count).

**Delivered & links:**
- Artifact "Planetguard": https://claude.ai/artifact/5ZvSAoKvuu4bjGyXoZa4Pr (latest version published 2026-11-03).
- Download planetguard.html (re-sent after every change; latest 2026-11-03).
- /home/user/planetguard.html and scratchpad planetguard.html (container file, may be lost).

**Final state:** Latest build published and downloadable with quests, boss, carrier repair, parachutes, rescue shelters and the wave-8 quest fix; logic checked in a slow headless browser; sound not checked by ear.

**Open items:** None.

**Your messages:**
1. *(2026-10-21)* make a game like defender with excellent graphics - but with a zaxxon point of view.
2. *(2026-10-21)* downloadable
3. *(2026-10-21)* controls are a little fast - give more screen to view  and don't make the road. it is  understood.
4. *(2026-10-21)* give me menu for controls and slow down overall game play 10%
5. *(2026-10-21)* give colonists a parachute to have them in the air a little bit.
6. *(2026-10-21)* let me pick up colonists as well and add safe locations to drop them and save them.
7. *(2026-10-21)* add auto-shield to the ship with 1 hit and then they are lost - give shield refill opportunity through a repair hangar ship. ship can sustain damage 25% or 50% depending on strength of enemy.
8. *(2026-10-21)* don't show shield until needed and repair station is more like a flying aircraft carrier with drone style propellers around it.  it can only appear once each wave.
9. *(2026-10-21)* add a boss level every 10 levels and make various quests each round - ex. save 5 colonists. etc..  slowly increase difficulty through 10 levels, then make level 11 5% harder than level 1 and increasing .
10. *(2026-10-21)* and if you fail the quest, you die and have to restart.
11. *(2026-10-21)* downloadable
12. *(2026-10-26)* some of the quests cannot be completed - make sure the level can handle the quest, show ships lives, and a timed event should count down.
13. *(2026-10-27)* when they take my colonists - have them go up 20% slower so i may have a chance to save them.  and make it so i cannot shoot my people
14. *(2026-11-03)* level 8 - quest - destroy 13 landers in a wave with no landers
