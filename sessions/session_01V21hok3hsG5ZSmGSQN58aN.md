### Unhappy Woks
*Created 2026-11-23 · last active 2026-11-24 · session `session_01V21hok3hsG5ZSmGSQN58aN`*

**Goal:** A private, Angry-Birds-style 3D browser game ("Unhappy Woks") where Ewok-like furry "Woks" are launched from a blaster-shaped crossbow at robot "storm trooper" forts across Star Wars-flavored worlds, for fun with friends.

**Requirements & decisions:**
- Title first given as "Unhappy Ewoks"; Angry Birds style with high graphics, 3D and shadowing; creature likenesses from uploaded photos (incl. a larger Wookiee). Use the photos as likeness; make it "really close".
- Woks are the "birds" trying to knock out storm troopers; each has different characteristics/abilities. Final roster: Bramble (dash), Soot (split into three), Pip (tiny blast), Ash (heavy slam), Thornback (huge charge). Enemies: Tinkbots and armored Sentries. Blocks: ice, wood, stone, metal.
- Use the Claude Code chat named **Builder** for sounds, music, textures and trees (user clarified Builder is a chat, not a plugin; Claude eventually found and messaged it).
- 1/2/3-star levels; worlds like Endor, Hoth, Death Star, Tatooine, Alderaan etc.; 100 levels; training level for each bird and obstacle. Built as 10 worlds x 10 levels: Grumblewood, Frostreach, Twin Sun Dunes, Ironhalo Station, Verdant Peaks, Cinderfall, Mirebog, Skyharbor, Stormdeep, Templeroot (no actual Star Wars imagery). Not for public use.
- Launcher is a crossbow shaped like a blaster, not a slingshot.
- Enemy on a post falls when the post is removed; aiming direction "up is up, right is right".
- Different scream per creature and different crash sounds per material; voices like "weee" or grumbles instead of beeps; celebration music in the spirit of the Ewok song from Episode 6 (kept original, no copied music).
- Targets/objects get terrain and skin, not round balls.
- Boss level at the end of each world (10 named robot bosses, e.g. Grindle the Lumberjack, Frostjaw, Magmaw, Skylord Vexx).
- Training camp "Meet the gang": introduce each shooter, click one for a demo; show a photo of each instead of circles.
- App name is **Unhappy Woks** (not Grumblewood; Grumblewood stays as world 1). Creatures are called Woks, not Tinkbots.
- Settings: sound and music volume sliders, mute, full-screen toggle; later versioning under Settings (What's new / changelog).
- Pack as HTML named **unhappywoks.html** (not index.html).
- All levels 3-star possible, gradually increasing difficulty and distance; passed levels replayable.
- Realistic terrain from Builder: grass blades, snow dents, animal tracks; realistic trees from Builder (17 models).
- Trailer of all 5 Woks through the 10 worlds.
- Fixes: aiming dots clashed with snow (now orange with dark outline); game too easy -> keep 100 as Easy and add 10 Medium + 10 Advanced per world (300 levels, 30 bosses).
- Preview test for every scene ("Preview scenes" screen, one play per world/tier) and Settings > Unlock everything.
- Complex forts: castles, rock walls to lob over, arches, ledges, plateaus, varied distances, like real Angry Birds.
- Physics: heavy (brick/stone/metal) walls falling on bad guys crush them, light walls just lean; bad guys have hit points, get bruised, but can still die in one clean hit; three stars still achievable.
- Zoom and pan to see the whole field when bad guys go off screen.
- Hover over Woks shows their name.
- Lava level (Cinderfall) visibility fixed: brighter light, lighter fog, light-grey stone, less clutter.
- Make it phone viewable: compact menus, touch/pinch controls, phone quality mode, best held sideways.

**Delivered & links:**
- Game preview: https://claude.ai/artifact/Nbw95FsCXfKgyhpQc55t9j (latest Version 26, phone support, published 2026-11-24 20:00)
- Final downloads sent in chat: **unhappywoks.html** (~15 MB, offline single file, version 1.0.0 + phone update), **UnhappyWoks.zip** (~44 MB: game, trailer, README), **UnhappyWoks_Trailer.mp4** (42 s, final re-record with castles and brighter Cinderfall), **UnhappyWoks_Example_Levels.jpg**
- Source at /home/user/grumblewood.html and /home/user/dist/UnhappyWoks/ (container files, may be lost)

**Final state:** Unhappy Woks 1.0.0 complete: 300 levels (Easy/Medium/Advanced), 30 boss fights, Builder's 47 sounds + music, realistic terrain and trees, trailer, settings with versioning, hover names, zoom/pan. Phone layout added at the last turn and tested only in a simulated phone browser, not a real phone.

**Open items:** User to try the phone version on a real phone.

**Your messages:**
1. *(2026-11-23)* Unhappy Ewoks
2. *(2026-11-23)* In the style of Angry Birds - i want high graphics, 3d and shadowing - creatures will be [image attached]
3. *(2026-11-23)* include - [image attached]
4. *(2026-11-23)* and a larger wookie - [image attached]
5. *(2026-11-24)* these will be the birds trying to knock out storm troopers
6. *(2026-11-24)*  [image attached]
7. *(2026-11-24)* all the "birds" will have different characteristics and abilities  and use claude code chat builder to assist.
8. *(2026-11-24)* still 1 2 and 3 star levels - 10 levels were scene - and scenes would be endor, hoth, death star, tatooine, alderaan, and morebackground and terrain.  a training level to learn how to use each bird and obstacle. i would like 100 levels with various "Star Wars" themed locations. if you need or want me to download photos, let me know.  this will not be for the public, just fun with friends.
9. *(2026-11-24)* instead of a sling shot it is a crossbow shaped like a blaster.
10. *(2026-11-24)* make is really close.
11. *(2026-11-24)* use the photos as a likeness
12. *(2026-11-24)* if a enemy is on a post  and the post if removed - enemy should fall
13. *(2026-11-24)* make the aiming opposite - up is up and right is right.
14. *(2026-11-24)* make each creature that is shot have a different screaming sound. and the items they hit can a different crash sound - use claude code builder for greatness
15. *(2026-11-24)* make the target and aimed objects have more character than a round ball - give terrain and skin.
16. *(2026-11-24)* add a boss level at the end of each world
17. *(2026-11-24)* in training camp there is "meet the gang" and introduce each type of shooter and show what they do.  show all of them then a user can click on 1 and you give a demonstration
18. *(2026-11-24)* show a photo of each instead of the circles
19. *(2026-11-24)* sounds instead of noises - make they do a various weee or a grumble - use claude code chat called builder.
20. *(2026-11-24)* builder is there from claude code
21. *(2026-11-24)* also a celebration sound like the ewoks music in episode 6 of star wars
22. *(2026-11-24)* builder is not a plug in - it is the name of the claude chat make sounds and a music from it
23. *(2026-11-24)* Name of App is called Unhappy Woks - not grumblewood
24. *(2026-11-24)* no - find the chat called Builder in claude code - every other chat can find it so you can too
25. *(2026-11-24)* good - make sound and music under setting with volume control slide and full screen toggle
26. *(2026-11-24)* once done , pack it. html would be best and if you do don't name it index.html unhappywoks.html
27. *(2026-11-24)* make all levels possible to get 3 starts and build up difficulty and distance
28. *(2026-11-24)* fix it then build it
29. *(2026-11-24)* before that - give better terrain from the Builder chat.  get some realistic look to the background and the ground they are on.  make the grass have blades or snow have dents and little animal tracks or something - give it all character
30. *(2026-11-24)* the creatures are woks, not tinkbots
31. *(2026-11-24)* Build a trailer of all 5 of them in in quick shots through the 10 worlds
32. *(2026-11-24)* once you play a level and pass it you can go back to it.
33. *(2026-11-24)* yep build it
34. *(2026-11-24)* isn't everything done ?
35. *(2026-11-24)* give me something to download and well as the published preview
36. *(2026-11-24)* background looks great but trees are basic - use Builder to jazz them up
37. *(2026-11-24)* all done ?
38. *(2026-11-24)* ok - when done post all 3
39. *(2026-11-24)* show preview
40. *(2026-11-24)* ok - snow and aiming dots clash - and the game it really too easy.  keep what you have then make 10 medium for each and 10 advanced for each.
41. *(2026-11-24)* can you give a preview test for every scene so i can check
42. *(2026-11-24)* give example of complicates and not just 1 in at box - and make distance , etc...
43. *(2026-11-24)* and shoot over rock or between things just the real angry birds
44. *(2026-11-24)* that is good now give preview of the scene by giving me 1 play on each set
45. *(2026-11-24)* 1 thing i noticed if a wall falls on a bad guy from a distance he should die if the wall has that many "hit points" or weight - not all the time with light walls but if a brick wall falls on one of them it should just lean on them.
46. *(2026-11-24)* how about the bad guys get hit points to die and get more bruised before they die if they aren't demolished on first shot.
47. *(2026-11-24)* but they can die in one hit...
48. *(2026-11-24)* make sure three stars are still possible - are stars my score of numbers of woks used ?
49. *(2026-11-24)* 1 last problem to fix - sometimes bad guys alive go off screen it would be nice to be able to zoom and pan out so you can see your field
50. *(2026-11-24)* that works
51. *(2026-11-24)* once done pack it and gives a download and previews.
52. *(2026-11-24)* all downloads and previews
53. *(2026-11-24)* rerecord please then repack it all up
54. *(2026-11-24)* under settings also add versioning.
55. *(2026-11-24)* add if i mouse over the woks that it gives their name (if it doesn't already)
56. *(2026-11-24)* great - now im done.
57. *(2026-11-24)* lava level - hard to see bad guys and structures/ how to fix
58. *(2026-11-24)* perfect.
59. *(2026-11-24)* Can you make is phone viewable too
