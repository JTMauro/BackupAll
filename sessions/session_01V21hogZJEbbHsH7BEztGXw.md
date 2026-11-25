### Sales heatmap with iPad geolocation
*Created 2026-11-25 · last active 2026-11-25 · session `session_01V21hogZJEbbHsH7BEztGXw`*

**Goal:** Build an earth-view globe (borrowed from the "Ra" session's look) that lands on the USA and Canada, as the front end for a live sales heat map fed by an iPad agent that "phones home" with location and iPad name, joined to iPad-to-office assignment and sales data.

**Requirements & decisions:**
- Bring in only the earth view from the Claude Code "Ra" session; exclude all of Ra's other layers. Ra's code was unreachable (container only, not on GitHub), so the globe was rebuilt on Ra's stack: React + Vite + CesiumJS, no widgets, keyless imagery.
- Earth "pops in" from space, spins ~2 s, then flies to and focuses on USA + Canada (light-blue outlines); Re-center and Replay intro buttons.
- Future pipeline agreed: iPad agent (check-in with iPad name, lat/long, time) -> check-in service -> iPad->rep->office assignment data -> sales data -> live heat map. Claude recommended an MDM-pushed managed iPad app with "Always" location; flagged HR/legal consent for employee tracking.
- User offered a repository if needed.
- App name: first "Rain Maker", then changed to **Rep Radar** (user: "i like that better").
- Add versioning: version in package.json, shown bottom-left (hover = build date), `npm run release:patch|minor|major`, CHANGELOG.md. Started at v0.1.0.
- Default landing view: zoom so USA and Canada fill the page; then trim Mexico; then cut off northern Canada (stop ~55°N, just below Hudson Bay) as the default. User can still pan/zoom manually; Re-center returns to default. Approved at v0.1.2.
- Sales simulation: large sale = yellow explosion; HOT regions glow orange; popups like "Office X posted X sales just now, today X"; "Rep of the Hour"; show excitement. Publish as a review page before building the real thing.
- Demo should run randomly with winners, leaderboard, etc.
- Simulation details delivered: cyan ripple per sale; big sale (8+) yellow explosion with flash, shockwaves, sparks; hot streak every 20-30 s with orange glow and HOT tag; gold BIG SALE popups; clicking popup flies to office; banners for Rep of the Hour, #1 office today, 50-sale milestones; scoreboard (total, hot offices, Rep of the Hour, top 6); Pause and 1x/3x/10x speed; "Simulated data" label, made-up reps in 33 cities; NASA Blue Marble imagery bundled because the published page blocks outside map services; effects read the same sale format the real feed will use.

**Delivered & links:**
- Review page (Rep Radar v0.2.0 simulation): https://claude.ai/artifact/VbcuC24i5osqR3RAh6yU52 (latest, published 2026-11-25 01:07)
- Zips sent in chat: sales-globe zip (earth view), rain-maker zip, rep-radar v0.1.0, v0.1.1, rep-radar-v0.1.2.zip, final **rep-radar-v0.2.0.zip** plus screenshot.png
- Code at /home/user/rep-radar (container file, may be lost); /home/user/rep-radar-v0.2.0.zip (container file, may be lost)
- GitHub: suggested repo `JTMauro/rep-radar` not yet created; nothing pushed.

**Final state:** Rep Radar v0.2.0 builds cleanly and ran without errors in a headless browser (animations only ~2 fps there, checked with slowed clock). Published page itself not opened/verified by Claude.

**Open items:**
- User to confirm the published review page loads and give tuning feedback on effect speed/size.
- User to create empty GitHub repo `JTMauro/rep-radar` so code can be pushed and v0.1.0-v0.2.0 tagged; code currently only in the container and zips.
- Choose next build: check-in service (recommended, with simulated moving iPads) or the iPad agent.

**Your messages:**
1. *(2026-11-25)* bring in from the claude code "Ra" session.  I only want the earth to pop in and then focused on USA and Canada.  this will be used later for a front end for sales data and live geolocation of ipads - i would like to build an agent that sits on the ipad and will "phone home" to this app giving geolocation/ipad name  - from there we had data showing the ipad assignment/office and from there we know their sales to do a sales heat map live.  make sense ?
2. *(2026-11-25)* all other from Ra can be excluded just earth view
3. *(2026-11-25)* if you need a repository,let me know
4. *(2026-11-25)* what would be a good app name for this
5. *(2026-11-25)* App Name : Rain Maker and add versioning
6. *(2026-11-25)* App Name : Rep Radar
7. *(2026-11-25)* i like that better
8. *(2026-11-25)* zoom closer to fill page of usa and cada
9. *(2026-11-25)* canada
10. *(2026-11-25)* mexico is showing so you can zoom more
11. *(2026-11-25)* good - as default you can cutoff half of canada since nothing much is up there. manually we can modify the screen i just want that as default
12. *(2026-11-25)* yes - that is good
13. *(2026-11-25)* now can you simulate sales in regions where a large sale gets a yellow explosion and a HOT regions start glowing orange. and make a popup of office X posted X sales just now and for the day they are X.  and the rep of the hour is X. something like that showing excitement an d use published review for simulation before building it all.
14. *(2026-11-25)* randomly demo with winners and leaderboard, etc...
