### Morph This
*Created 2026-11-12 · last active 2026-11-15 · session `session_01V21hojRr6b6u8N4RepGTr3`*

**Goal:** Build "Morph This", a browser app that morphs two pictures (and video) together with the best features of morph, video and photo makers: animation, a morph-degree slider, choice of what to morph, background options, and object swapping.

**Requirements & decisions:**
- Morph two pictures together; animation; slider for degree of morph; choose what to morph (whole picture, face only, features only, custom points); background options to create.
- Title: **Morph This**.
- Video: take a video and recreate it (e.g. swap guns in hands for walkie-talkies). True AI redraw not possible in-browser; instead: face-tracked morph through video frames and an Objects tab to overlay/track a replacement object with keyframes and blur the original.
- Also wanted as a standalone HTML file (`morph-this.html`, ~850 KB, face models embedded; needs internet for face-finder and video-export code).
- 2026-11-15: 0 to 100 must go fully from one side to the other, and be more detailed (0.1% steps, labeled stops, exact-percent box, +/- buttons, readouts, "Mesh detail" Standard/Fine/Ultra, "Go all the way" option).
- Multi-point drag and drop for faces or items (box/shift select, group move/scale/rotate/mirror, trace an item, bigger editor), auto-smooth clean-up (auto-smooth strength, snap B to picture, steady face tracking, copy A layout to B), and object swap (cut from A/B, track through clip, auto-smooth path).

**Delivered & links:**
- Morph This artifact (latest, updated 2026-11-15): https://claude.ai/artifact/4cRoYzdgqhznicxc1BoVMt
- `morph-this.html` standalone file sent as attachment (updated 2026-11-15)
- `/home/user/morph-this.html` and scratchpad `site/` folder (container files, may be lost)

**Final state:** Works in headless-browser tests (samples, face finding, video tracking, patterns, GIF export, phone layout, slider endpoints checked pixel by pixel). MP4 export not checked in a real browser; exported video has no sound; background cut-out is not true AI segmentation; snap-to-picture works poorly across different faces; object tracking follows position only.

**Open items:** None.

**Your messages:**
1. *(2026-11-12)* Build a morph app two pictures to morph together - but will all the great thing of all morph and video and picture makers - it can do animation, and a slider for degree of morph and request what to be morphed like faces only, etc...  and background options to create.
2. *(2026-11-12)* Title Morph This.
3. *(2026-11-12)* i wan to be able to take video, recreate video.  like instead of having guns in your hand, your can have walkie-talkies...
4. *(2026-11-12)* let s make an  heml
5. *(2026-11-12)* html
6. *(2026-11-15)* 0 to 100 should from 1 side to the other - be a little more detailed
7. *(2026-11-15)* add a multiple point drag and drop option for faces or items. and an auto-smooth ability to clean it to the new image. and object swap as well.
