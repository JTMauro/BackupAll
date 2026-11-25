### AstroHerd
*Created 2026-11-21 · last active 2026-11-21 · session `session_01V21hohzqQxRRfApb3f8i98`*

**Goal:** A 3D space-age Lemmings-style game, **Astro Herd**, where you guide a herd of aliens to their color-matched portals using gear like grapples/ropes and jetpacks, with top-tier graphics, many hazards, bad guys, bosses and lots of levels.

**Requirements & decisions:**
- Lemmings rules in space: grapples instead of ladders, jetpacks instead of umbrellas; 3D, highest graphics, shadows ("spare no expense"); use the Claude chat **Builder** for assist; lots of obstacles and traps.
- Name: **Astro Herd**.
- Goal is finishing levels with all or most aliens; helpers free; added gravity/grav boots (float a little over spikes/bad things), mag boots, blaster to arm the lead alien against bad guys.
- Multiple portals by alien color; 3D aliens based on the user's uploaded design in 3-4 colors (later a second reference image for look).
- Control left/right of items; grapple must preview where it goes.
- Huge multi-area levels, better terrain, near-realistic 3D, rotatable camera; portals linking sides, randomly switching portals needing timing; training level.
- Bad guys: turrets, Men-in-Black-style agents with space helmets; realistic lava pits and bubbling acid pools; other dangers (void mites, crushers, meteors, etc.).
- Boss level with a giant alien mothership.
- Much slower play with speed options (like the "defend this" chat): normal = 10% of earlier speed, up to 10x, later 50x; aliens then made twice as fast to start.
- Training pauses to show instructions; smaller instruction overlay; help box not over gear.
- Click locations the herd walks through (beacons), not aliens; a barrier/block device; on click, pop-up menu for direction/options, then place.
- Death animations: fall = splat with arm up; fly away = both arms waving; drown = Terminator 2 thumbs-up; shot = clutch chest Old West style. Max fall height 1.25 grapple lengths.
- Grapple/rope rework: pick FROM point, then TO end point; X if too far; "shadow alien" simulates the shot and the first real alien to touch it fires it; any angle with max length; can be short; rope for climbing; not step-looking; climb hand-over-hand above 45 degrees, walk on it below; grapple-to-grapple allowed; snapping fixes for missed clicks.
- Pause that freezes everything plus a pause button.
- UI: gear locked to bottom bar; settings gear top-right with music, SFX, voices toggles and volume sliders; ominous X-Files-style music, "strange aah" on death, "phew" on success, "weee" with jetpack, "aaaahhh" until splat without; shrink UI.
- Any completed level replayable; autosave and backup/restore.
- Sounds via Builder; list all sounds; Sound Board to test them; music between current and Benny Hill theme but slower; then "more alien, less trumpet".
- 1,000 generated Frontier levels of varying difficulty, not impossible, still fun (plus 14 campaign sectors).
- Fix ring around the planet in background; random backgrounds.
- Package as HTML; backup to a dated file and restore by file/date, saved under Documents > AstroHerd.

**Delivered & links:**
- Online game: https://claude.ai/artifact/9oYVD67Tvdsrrd7698dHHr (latest publish 2026-11-21 18:04)
- Files sent in chat: **AstroHerd.html** (~300 KB single file) and **AstroHerd.zip** (~95 KB), final versions 2026-11-21 18:04
- Files at /home/user/AstroHerd/ and source in session scratchpad game/ folder (container files, may be lost)

**Final state:** Complete: 14 campaign sectors, 1,000 Frontier levels, Builder sounds and alien music, Sound Board, settings, dated file backup/restore (tested in Chrome). The packaged HTML needs internet on launch (3D engine and fonts from web); backups save to a chosen folder only in Chrome/Edge; online artifact uses backup codes instead.

**Open items:** Optional fully offline build was offered but not requested.

**Your messages:**
1. *(2026-11-21)* let's make a lemmings game but space age similar rules but instead of ladders you have grapples. and instead of umbrellas you  have jetpacks.  3d design highest graphics - use claude chat Builder for assist.  lots of possible obstacles and traps possible
2. *(2026-11-21)* Name : Astro Herd
3. *(2026-11-21)* scoring is great but it is all about finishing levels with all of most of your guys. the 2 helpers are free unless you can think of something else like gravity boots to avoid spikes when you are floating and maybe have bad guys so you get to arm your lead guy.
4. *(2026-11-21)* multiple portal level due to alien color
5. *(2026-11-21)* here is my alien design but i know you are going to keep them smaller.  your can make a 3d version of this guy but in 3 or 4 different colors.
6. *(2026-11-21)* and the color show with portal to get to.
7. *(2026-11-21)* it will be like lemmings but so much better and 3d and shadows and magnificent. we build great things. spare no expense
8. *(2026-11-21)* can control left or right of items
9. *(2026-11-21)* grapple went left without asking and it should give a previous of where is it going
10. *(2026-11-21)* great multi levels - long levels make bigger , huge levels, with multi-location where you have to float to someplace else. better terrain, better 3d and shadowing .  almost realistic and 3d rotate view to help out.
11. *(2026-11-21)* portals to go from one side to the other to create another level in the game and portal that switch at random so you need to time where you are going and include a training level to practice.
12. *(2026-11-21)* and bad guys, right ?
13. *(2026-11-21)* turrets and fbi guys with space helmets (men in black with helmets
14. *(2026-11-21)* lava pits and bubble pools/acid pools look real please
15. *(2026-11-21)* and other dangers
16. *(2026-11-21)* add boss level with a giant alien mothership. let me go slower and  show how to use because i can't figure it out.  much slower.
17. *(2026-11-21)* make a speed options like my claude chat defend this .  slow and if i wanted to speed up;
18. *(2026-11-21)* training will pause to show you instruction
19. *(2026-11-21)* game would be better like lemming if instead of clicking on aliens you click on locations aliens walk through .  and is there a block device to stop aliens from moving to a location or lock them in between 2 aliens to protect them.
20. *(2026-11-21)* better but i cannot direct the items myself - seems random -  i want to click - itll ask left/right/up /down or whatever option, then place the item.  normal will be 10% of what is happening now and i can advance to 10x the speed to finish
21. *(2026-11-21)* can you make the lemmings look like this but whatever color you need and size - [image attached]
22. *(2026-11-21)* if they die from falling - they splat with an arm in the air - if they fly away - both arms are waving - if they drown  they give the terminator 2 hand up.
23. *(2026-11-21)* any other way they can die ?
24. *(2026-11-21)* if they are shot - they hot chest old west style and fall down
25. *(2026-11-21)* not hot , hold.
26. *(2026-11-21)* max fall height is 1 grapple end
27. *(2026-11-21)* make that 1.25 grapple end
28. *(2026-11-21)* aliens can move twice as fast to start - the instruction overlay is too big and hindering me to follow it.
29. *(2026-11-21)* help box is not over my gear - force grapple and other items to work where it needs to just missed the wall.  make it easier to work right. or autoplace where it needs to be.  also allow a pause so everything freezes while you work - for slower people.
30. *(2026-11-21)* grapple needs to be able to connect to the correct end or it doesn't work.
31. *(2026-11-21)* make grapple hit the end place versus placing it where you want to start. mark an x if it is too far away from being successful
32. *(2026-11-21)* simulate a "shadow alien" shooting to end end point then place it.
33. *(2026-11-21)* don't just pause - give me a pause button too.
34. *(2026-11-21)* grapple is better to have a from point because i am stuck now and i can grapple to another grapple
35. *(2026-11-21)* grapple has any angle has a maximum size but can also be short
36. *(2026-11-21)* rope can be an option too for climbing
37. *(2026-11-21)* or can grapple just be rope
38. *(2026-11-21)* when make grapple not look like steps.
39. *(2026-11-21)* grapple not working from is good - to is green and i click but shadon alient just moves there
40. *(2026-11-21)* is shador makes it - but the first alien to touch makes it happen
41. *(2026-11-21)* shadow makes it.
42. *(2026-11-21)* i like it grapple across sideways didn't work right but the rest of it looked good.
43. *(2026-11-21)* it looked lifted from the platform - first alien who make it walked across but rest of the ignored it - can we have the alien climb with their hands if it is over 45 degrees and walk their foot on them if not.
44. *(2026-11-21)* too much stuff on screen let's lock the gear to the bottom with the rest of them.  and the setting put in the upper right with a gear to include music , sound effects and volume sliders for all with a toggle on or off.  ominous x files style music and sound effects for gear , bad guys, and a "strange aah" when they die.  when they succeed to the end they say "phew".
45. *(2026-11-21)* you can shrink think if necessary. on tiny screen they are really easy to read
46. *(2026-11-21)* not think, things is what i meant to say.
47. *(2026-11-21)* any level can be replayed if desired and setting can have a autosave, or back/restore option to save to disk somwhere.
48. *(2026-11-21)* all level if already completed.
49. *(2026-11-21)* grav boots make you float a little to avoid bad things
50. *(2026-11-21)* falling with jetpack - they say weee - falling without is like dying .. aaaaahhh until they splat.
51. *(2026-11-21)* grapple missed again and make a 50x if all is confident to get out.  we will work on the sounds later.
52. *(2026-11-21)* good - use claude chat builder for sounds - list all sounds
53. *(2026-11-21)* update all sounds using that other chat. and make board so i can test them all
54. *(2026-11-21)* background - get somewhere between what you have and the benny hill theme song but not so fast
55. *(2026-11-21)* you can reach the other chat - goto claude chat named builder
56. *(2026-11-21)* sounds good - now let's make a thousand levels varying difficulty and challenges - not impossible and still fun
57. *(2026-11-21)* music background - more alien less trumpet.
58. *(2026-11-21)* can you also fix that weird ring around the plane in the background - and go ahead and make different random background if you want
59. *(2026-11-21)* that's good music.  done. package html
60. *(2026-11-21)* wait - backup code / restore code ?  just backup to a file with date and restore from file/date
61. *(2026-11-21)* documents folder and a folder under called astroherd
