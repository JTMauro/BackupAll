### App Lab
*Created 2026-11-11 · last active 2026-11-12 · session `session_01V21hohQF4DK1vvmz9A8FuJ`*

**Goal:** Build an "app tester" that deconstructs applications (installed apps, folders/.exe, websites) into an analysis, compares several, and rebuilds/merges the best parts into a better design, later packaged as a signed Windows desktop app.

**Requirements & decisions:**
- Tool tears apps down into rated parts (seven layers: users, features, screens/flows, data, technical setup, business model, integrations), compares them, and rebuilds a merged blueprint or exports a deconstruct analysis. Up to 6 specimens.
- Name is just "App Lab" (originally published as "App Teardown Lab").
- Apps come from what is installed: pick from installed-apps list, or point to an .exe or folder (scanned locally for frameworks, version info, libraries, manifests).
- Visual theme: traditional lab background with beakers etc.; "awesome 3D graphics with shadowing" (Three.js lab bench, bubbling liquids, molecule model, glow in dark mode).
- Websites allowed as specimens too (paste page source or drop saved .html; sandbox cannot fetch sites).
- Opening intro uses the CYDNI robot from the user's "Cydni 3D" artifact: single spin, pours one beaker into another, smoke from beaker, big "App Lab" title then shrinks to upper left. Skip intro button / Esc.
- Add a version number (for tracking changes) and an About menu with changelog.
- CYDNI centered for the intro, then flies to the upper left beside the title (v1.4.0); made a bit smaller at the end (v1.5.0). User said the opening is good.
- No PowerShell needed to choose apps: checkmark select screen of ~70 known work apps (Teams, Outlook, Excel, Salesforce, Smartsheet, Slack, Zoom, SPOTIO, SalesRabbit...), plus separate manual-entry screen.
- Three sources: Known apps, On this computer (read Start-menu shortcuts via file picker; PowerShell command as fallback/Mac), Manual entry.
- Sources are buttons opening pop-up panels so the home screen is calm (v1.6.0).
- Signing/build routine modeled on the user's CydFTP artifact: Windows desktop build (Python + pywebview + PyInstaller), `BUILD APP LAB.cmd` one-click on the PC with the Cydcor certificate; signing via local cert, Azure Trusted Signing or Azure Key Vault (`signing.json`); all-users and per-user installers, signature checks, release zip with checksums, public cert, `DEPLOY.md` (silent install / Intune) (v1.7.0).
- Walkthrough feature: open a single app and go through all menus and settings to duplicate its features, experience and usability (Windows UI Automation, desktop app only). User chose all 3 click modes available and "all of it" as outputs (v1.8.0).
- Separate download page with the signed-build package, like CydFTP's.
- Build failed from network drive `I:\Ops\Cyberdine\JT\Test\APPLab` (comtypes `gen` import error); user chose to move it to Documents. v1.8.1 builds network-drive folders from a local copy (`%LOCALAPPDATA%\AppLab-build`) and pre-creates the comtypes folder.

**Delivered & links:**
- App Lab page: https://claude.ai/artifact/CQerLJj8KvDHmMzHmfgxM1 (latest v1.8.1, with `app-lab-desktop.b64.txt` package attached)
- App Lab download page (build kit `app-lab-desktop.zip`, SHA-256, screenshots, signing steps): https://claude.ai/artifact/5xNQ7oDc4ar68ZBNFPQnbY (latest v1.8.1)
- Referenced: CYDNI 3D artifact https://claude.ai/artifact/NGZZbmSJPmgeBL72yWZixn ; CydFTP Download artifact https://claude.ai/artifact/F24EvnsHq6hkCBR3Zf8yyu
- Source: `/home/user/app-teardown-lab/index.html`, `/home/user/app-teardown-lab/download/index.html`, desktop package (Python app, PyInstaller spec, installer script, build scripts, 14 tests) (container files, may be lost)

**Final state:** v1.8.1 published; web page works with example data and local checks; Python tests and self-test pass. Claude teardown calls and the Windows PowerShell build/signing script have not been run for real; the user's first build hit the network-drive error that 1.8.1 addresses.

**Open items:** User to rerun `BUILD APP LAB.cmd` with the 1.8.1 kit from Documents (or `C:\AppLab` if OneDrive) and report any error.

**Your messages:**
1. *(2026-11-11)* can you create an app tester to where you can deconstruct and rebuild an application - the point would be that you can "test" multiple application and create something merging them both and building better or leave a deconstruct analysis.
2. *(2026-11-11)* just App Lab - apps would be currently installed so i would need to either go from the list of installed apps or point you to an exe or folder.
3. *(2026-11-11)* background being a traditional lab with beakers, etc.
4. *(2026-11-11)* awesome 3d graphics with shadowing.  lab theme
5. *(2026-11-11)* allow for website too
6. *(2026-11-11)* for app lab - use cydni 3d from chat - same thing single spin  open - mixes 1 beaker into another and smoke from beaker. Title App Lab, then shrinks to title in upper left
7. *(2026-11-11)* ad version in case of needed changed
8. *(2026-11-11)* add about menu
9. *(2026-11-11)* make cydni intro centered then move to upper left with title
10. *(2026-11-11)* instead of opening power shell can you make a select screen to choose installed apps by checkmarks, then have another screen for manual entry.  make cydni a little smaller at the end. but opening is good.
11. *(2026-11-11)* that is good - make known apps - and also apps on current machine - as well as manual.
12. *(2026-11-11)* make them a button to open so it isn't so crazy of the home screen
13. *(2026-11-11)* build a signing routine like the chat cydftp
14. *(2026-11-11)* can this tool also open a single app and go through all the menus and settings to duplicate ?
15. *(2026-11-11)* duplicate experience as well.
16. *(2026-11-11)* and usability
17. *(2026-11-11)* (answers to Claude's questions: how far the walkthrough should click on its own / what it should produce) opens for all 3 / all of it
18. *(2026-11-11)* also need a package with signing to download
19. *(2026-11-12)* [pasted 18 lines of App Lab build error log: comtypes "cannot import name 'gen'" ImportError from the I:\Ops\Cyberdine\JT\Test\APPLab .venv on \\KEY-FILER1]
20. *(2026-11-12)* ILL MOVE IT TO DOCUMENTS
