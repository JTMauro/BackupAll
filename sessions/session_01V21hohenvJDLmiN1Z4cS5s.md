### SEO optimization potential
*Created 2026-11-10 · last active 2026-11-13 · session `session_01V21hohenvJDLmiN1Z4cS5s`*

**Goal:** Build an internal company/employee tool ("Hunter") combining an SEO auditor with a personal-data exposure checker (breach, deep/dark web, PII footprint, fix and removal), with a Cydni-branded 3D UI, a browser-only Lite version, and a Cydcor-signed Windows desktop build.

**Requirements & decisions:**
- Build an SEO tool, no API for now, for the company and employees (crawler, 70+ checks, scored HTML report, web UI, CLI, schedules).
- Add a search: deep web search on full name, email, phone; check for breaches ("PWNED") and anything bad, with ways to solve it.
- "As robust as possible, the kitchen sink": all ways to search, fix and remove, plus anything automatic at the press of a button; include contacting domain owners, IP address and location data (WHOIS/RDAP, DNS, IP/ASN).
- App name: **Hunter**.
- People must be able to look themselves up: email one-time code verification (10 min, single use, 5-try lock), self-signup for breach alerts, option to open Exposure Check without app password.
- Do not use Have I Been Pwned; build Hunter's own HIBP-like breach database (keyed-hash identifiers, ~40 public breach starter catalog, imports of own incidents/vendor lists; no stolen dumps) plus a built-in dark/deep web scan.
- Load public password lists (UK NCSC 100k, Pwdb 1M, Xato 1M, Darkweb 10k from SecLists): 1,643,556 unique passwords; auto-download on first start.
- Add a "Refresh lists now" button in admin panel (monthly auto-refresh too).
- Publish a preview walkthrough of the layout before making HTML/external app (searches not expected to work in preview).
- 3D "HUNTER" title with shadow and Cydni (the user's robot mascot from the CYDNI 3D artifact) leaning over it with a magnifying glass; lifted buttons; cyber theme.
- Front screen: info panel on top, search-action buttons under it, results frame underneath doing the work.
- Opening: big HUNTER + Cydni centered, then shrink to upper-left header and stay; logo appears nowhere else (screenshots retaken without app header).
- Preview notes become hover pop-ups to give the app more space.
- Rename "Front Screen" to **Home**; Cydni winks briefly on the big opening screen, then normal eyes.
- Exposure includes **Check all** (Home and Exposure page) with summary; Home fits one screen without scrolling.
- Build and use **version 2.0.1** (version tag, changelog, git tag, one-click start files, build zip).
- Desktop app must be signed using the signing tool other chats use. Initially "Sign This"; user then directed: use the CydFTP signing certificate (signtool + Cydcor LLC cert, thumbprint FD0DC0C9FAE1C247E79C8388F81A3AFB0D742D3F, machine store, admin).
- **Hunter Lite**: single-file HTML version, with "Lite" to the right of the robot at a 45-degree angle going up (violet neon 3D badge).
- All download files in one area (`Hunter-2.0.1-ALL-DOWNLOADS.zip`) and redisplay the published preview.
- New **Photo & name** tab: search web/deep/dark web and social media for PII and visibility from a photo or name; name alone can search, small extra details narrow results; visibility score; photo EXIF check.
- Fixes for user's Windows build: rcedit import error; signtool "badexeformat" (strip node.exe's embedded signature); Smart App Control block (user reported "smartapp").
- Match the MuchSmarter chat's approach: sign every .exe/.dll/.node, clear Mark-of-the-Web, verify all, signed per-user Inno Setup installer and uninstaller, constrained-language-safe PowerShell, one admin prompt.
- User asked how to make all future apps automatically signed this way (answer: shared SignKit `Sign-CydcorApp.ps1` + installer template + `signing.json`, a Claude skill, optional GitHub Actions runner / Azure Trusted Signing).

**Delivered & links:**
- Hunter preview walkthrough: https://claude.ai/artifact/Qu6anWBfWoJK5nGHezDUQC (latest: "Photo & name tab" update, 2026-11-12)
- Hunter Lite: https://claude.ai/artifact/HEQXHa38two1M8YWDAUQgU (latest: "Photo & name footprint", 2026-11-12)
- Referenced: CYDNI 3D https://claude.ai/artifact/NGZZbmSJPmgeBL72yWZixn ; signing reference artifact https://claude.ai/artifact/UY1dVLvvhhGjA8Rzzhhxaq
- Files sent: `Hunter-2.0.1-ALL-DOWNLOADS.zip` (Hunter-Lite-2.0.1.html, Hunter-2.0.1-source.zip with BUILD HUNTER kit, Hunter-2.0.1-linux-x64.zip, Sample-SEO-Report.html, Hunter-icon.png, README/CHANGELOG), rebuilt several times through 2026-11-13
- Source: `/home/user/seo-auditor/` (local git repo, tag v2.0.1; `packaging/sign-windows.ps1`, `packaging/hunter.iss`, `packaging/signing.json`, `packaging/build-app.js`) (container file, may be lost)

**Final state:** Hunter 2.0.1 web app, Lite and preview work; 6 test suites pass. Live internet lookups (breach, WHOIS, web search, email delivery) never tested against real services. Windows build reworked to MuchSmarter-style full signing + signed installer but untested on Windows; user's previous build was blocked by Smart App Control.

**Open items:** User to run new Windows build and confirm Smart App Control passes; decide whether Claude should build the shared SignKit and Claude skill now.

**Your messages:**
1. *(2026-11-10)* How good can we make an SEO
2. *(2026-11-10)* tool to build - no API right now - for company and employees
3. *(2026-11-10)* i would like a search - deep web search if possible - checking full name with information or email address or phone number -  check for PWNED or anything bad and a way to solve the problem.
4. *(2026-11-10)* make it as robust as possible - include the kitchen sink - the works - all ways to search and all ways to fix and ways to remove - and anything automatic that can be done internally at the press of a button.
5. *(2026-11-10)* even ability to contact domain owner, ip address and all information of location data is stored.  anything that is possible.
6. *(2026-11-10)* App Name Hunter
7. *(2026-11-10)* i need to be allowed for people to look themselves up.
8. *(2026-11-10)* don't use pwned - i want something like pwned.
9. *(2026-11-10)* and a dark/deep web search built in
10. *(2026-11-10)* can you upload UK passwords or other database
11. *(2026-11-10)* give button to update list (refresh)
12. *(2026-11-10)* can you publish a preview  when ready before we make an html or external app
13. *(2026-11-10)* where is the preview ?
14. *(2026-11-10)* the in claude preview what says publish on it
15. *(2026-11-10)* i want it to see the layout and walkthrough - i understand the searches won't work
16. *(2026-11-10)* make hunter 3d with shadow and the Word Hunter with CYDNI 3D leaning over with a magifiying glasss.
17. *(2026-11-10)* button lifted the a cyber theme
18. *(2026-11-10)* front screen  top part is requested in and frame underneath does the work requested - buttons under info perform various search actions
19. *(2026-11-10)* cydni the robot mascot from my code chats
20. *(2026-11-10)* really good looking - can you make the page open with the big hunter and the bot, then shrink to the upper left and stay at the header.
21. *(2026-11-10)* the notes at the bottom - make them pop up by mouse over to give more space to the app
22. *(2026-11-10)* if hunter logo is in the upper left it doesn't need to be in the other frames
23. *(2026-11-10)* to be clear - hunter logo big on open then shrinks in the corner. it doesn't need to be anywhere else.
24. *(2026-11-10)* not Front Screen - Call it Home.  make hunter logo wink on big screen briefly then go back to normal eyes
25. *(2026-11-10)* exposure should also include check all
26. *(2026-11-10)* can you also make a full screen to not scroll or as much as possible
27. *(2026-11-10)* ok let's build and use  version 2.0.1
28. *(2026-11-10)* if you are making an app - it will need to be signed - use the signing tool other apps in other chats use
29. *(2026-11-10)* can you also make an html or would it not work well
30. *(2026-11-10)* yes, call the HTML version Hunter Lite with the Lite to the right of the robot at the 45 degree angle going up
31. *(2026-11-10)* great - give me all files to download in 1 area and redisplay the  published review
32. *(2026-11-12)* i would like to add a tab. with a photo or name i would like to search the web/deep/darkweb for information like PII and visibility to the world - include everything you can think of from google search to social media presense.
33. *(2026-11-12)* not just name - small bits of information to help track information as well.  but name alone can search.
34. *(2026-11-13)* does this include the cydcor signing like cydftp chat ?   and i am getting an error : [pasted 22 lines of Hunter Windows build log ending "BUILD FAILED: rcedit is not a function"]
35. *(2026-11-13)* no use the sign cert from cydftp for this app
36. *(2026-11-13)* [pasted 8 lines of signing log: SignTool Error (aka.ms/badexeformat) signing Hunter.exe, "BUILD FAILED: powershell.exe failed (exit 1)"]
37. *(2026-11-13)* powershell fails
38. *(2026-11-13)* hunter doesn't look like it is signed properly like the way cydftp is.
39. *(2026-11-13)* when i try to run it in windows it blocks me.  look at the way much smarter is sign as well.
40. *(2026-11-13)* smartapp
41. *(2026-11-13)* here is what another chat is doing - CydFTP and MuchSmarter ship real compiled .exe files via signed installers, so I’m replacing Migrate This’s ps2exe-wrapped script with a small compiled C# launcher.
42. *(2026-11-13)* by muchsmarter i mean that muchsmarter chat
43. *(2026-11-13)* explain how i can automatically make the apps created to be signed this way.
