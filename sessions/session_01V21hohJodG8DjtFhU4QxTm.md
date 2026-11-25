### Voice and Graphics Creator
*Created 2026-10-27 · last active 2026-11-11 · session `session_01V21hohJodG8DjtFhU4QxTm`*

**Goal:** Get lifelike voices and graphics with Unreal Engine (MetaHuman), then build a "MetaHuman Bridge" app connecting Claude, an Unreal MetaHuman character and the user's own Voice Studio voices, packaged as a Cydcor-signed Windows installer.

**Requirements & decisions (chronological):**
- 2026-10-27: wanted to "create an Unreal Engine 5.8 or 6" to handle lifelike voices and graphics on their own; advised to build a project/plugin on top of free Unreal (MetaHuman, Lumen, Nanite) rather than a new engine.
- Asked whether Claude can use free Unreal and how to direct it (it runs on the user's PC, not the cloud session; options: Claude Code on the PC, Remote Control folder, or copy-paste).
- Asked about platform limits (develop on Windows with an RTX GPU, target PC first; consoles need approval; web via Pixel Streaming) and signed executables (Unreal packages; Windows signing done afterward with signtool and a code-signing certificate; ship an installer).
- 2026-11-11: wanted to connect to Unreal for better graphics, and to MetaHuman; a fully rendered human as a secretary, teacher or action hero.
- Asked Claude to build an engine/app connecting Claude Code and Unreal MetaHuman, build voices using the user's other chat, use Unreal's libraries, and add voice capture and synthesis like the user's "Voice generator with API" chat; a complete video/audio generator.
- Wanted the app to have a key field to add API keys later.
- Characters: Ava (secretary), Professor Lee (teacher), Rex (action hero), each reply with a facial emotion; Settings panel for Claude, ElevenLabs or Voice Studio keys (saved only on the PC); Test mode without keys; Voice engine -> My Voice Studio with voice ids in personas.json; push-to-talk voice capture; audio side of a video generator (narration WAV, subtitles, emotion list); Unreal plugin with a "Claude Character" component.
- Asked for a published preview and whether the Voice Studio chat is still needed (only to speak in the user's own voice; ElevenLabs or the test voice need no Voice Studio).
- Asked for a signing build "like the CydFTP chat": Cydcor code-signing certificate (installed or USB token), DigiCert timestamp with fallbacks, PyInstaller exe plus Inno Setup installers (all-users and per-user), settings in %APPDATA%\MetaHumanBridge.

**Delivered & links:**
- MetaHuman Bridge preview artifact: https://claude.ai/artifact/W3fQTNdTFsK3UECPUrAsyS (sample replies, browser voice, no mic, Settings saves nothing)
- metahuman-bridge.zip sent twice (2026-11-11 02:25 first build; 04:39 updated with the signed build). Source /home/user/metahuman-bridge/ (container file, may be lost). Contains start-windows.bat, BUILD SIGNED.cmd, build scripts (build-signed.ps1, installer.iss, signing.json), server/, README.md; expected outputs MetaHumanBridge.exe, MetaHumanBridge-Setup-1.0.0.exe, MetaHumanBridge-Setup-1.0.0-PerUser.exe
- A live test app ran on port 8765 in the session preview (stopped at the background time limit).

**Final state:** Bridge works in test mode and was bundled with PyInstaller on Linux (settings saved to the user folder, chat with sound in test mode). Live Claude API connection untested (no key), Unreal plugin not compiled, and the PowerShell signing script never run or syntax-checked (PowerShell download was blocked).

**Open items:** Run BUILD SIGNED.cmd on the PC with the Cydcor certificate and report errors; test with real API keys and inside Unreal; optional merge of Voice Studio and the bridge into one app.

**Your messages:**
1. *(2026-10-27)* i would like to create and unreal engine 5.8 or 6 to handle life like voices and graphics on my own.
2. *(2026-10-27)* can you use the free unreal engine ? and if so how do i tell you to use it ?
3. *(2026-10-27)* with using unreal - what platforms am i limited to ?
4. *(2026-10-27)* can i create working executables signed, etcc through unreal engine ?
5. *(2026-11-11)* how can i connect to unreal ?
6. *(2026-11-11)* no - i would like to connect to the unreal engine so i can get better graphics.
7. *(2026-11-11)* how do i connect with metahuman
8. *(2026-11-11)* human looking full rendered - either as a secretary or a teacher or action hero. depends
9. *(2026-11-11)* can you build an engine that can connect to claude code as well as unreal metahuman.  i would also like to build voices as well with my other chat
10. *(2026-11-11)* or the libraries of unreal.  plus i want voice capturing and synthesizing like my other chat called voice generator with API
11. *(2026-11-11)* you can make a complete video/audio generator
12. *(2026-11-11)* understood - but the app with the key field to add later.
13. *(2026-11-11)* can i get a publish preview on this one and do i need the chat voice generator with api if i have this one ?
14. *(2026-11-11)* built a way to sign it like the chatp cydftp
