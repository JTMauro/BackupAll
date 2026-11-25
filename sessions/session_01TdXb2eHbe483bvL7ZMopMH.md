### Language teacher simulation
*Created 2026-10-19 · last active 2026-10-21 · session `session_01TdXb2eHbe483bvL7ZMopMH`*

**Goal:** Build a human-like, first-person language teacher that speaks and listens with a school-style curriculum for all languages; the session then expanded into self-hosted, fee-free picture/video and voice-cloning tools on the user's own PC.

**Requirements & decisions:**
- Simulated human language teacher who speaks and listens, teaching curriculum plus conversation, all languages, up-front first person, like learning in school (built as a claude.ai page with chalkboard, drills, quizzes, homework, report card; uses db/user capabilities).
- Renamed from "Lingua Hall" to **Professor Lingua**.
- Microphone active and more human voice: mic is blocked inside claude.ai pages, so a downloadable professor-lingua.html (Edge/Chrome, needs an Anthropic API key) was made; both versions pick the most natural device voices with per-language voice menus.
- "No API key": claude.ai page uses the user's Claude account plus device voice typing.
- "Fluid voices and faces": video teacher **Professor Lingua Live** using HeyGen LiveAvatar (one LiveAvatar API key, ~40 languages, 4 terms / 26 lessons, free test mode); runs only as a local file in Edge/Chrome.
- Download problems in the Claude app ("NO CHANGES TO SHOW", "can't reach claude") solved by placing the file in the user's OneDrive (that copy loads the HeyGen SDK from the internet).
- New request: own app to generate real-life photos and videos from uploads or prompts; user rejected paid cloud services ("build my own, not linked to anything for a fee") -> **Frame Studio**: local ComfyUI engine with free models Z-Image Turbo (pictures) and Wan 2.2 (video); Windows installer (~40 GB of models, ~60 GB disk).
- Voice simulator: human and animal voices, clone from uploaded voice/audio, read uploaded text in that voice -> **Voice Studio** (free local models, e.g. Chatterbox; 23 languages, effects, voice conversion, sound effects up to 30 s).
- Other programs must be able to use the voice tool and the video tool -> **Studio Hub** local API at http://127.0.0.1:7777 (OpenAI-compatible /v1 and /api/speak, pictures, video, sound effects; local-only).

**Delivered & links:**
- Artifact "Professor Lingua" (claude.ai page): https://claude.ai/artifact/K59A4W72xKmyonKunesxzc (latest 2026-10-19 22:44, voice-typing version).
- professor-lingua.html (mic version, needs Anthropic API key) and professor-lingua-live.html (HeyGen video teacher) sent as downloads.
- OneDrive: https://cydcorllc-my.sharepoint.com/personal/jmauro_cydcor_com/Documents/Professor%20Lingua%20Live.html
- OneDrive folder Frame Studio: https://cydcorllc-my.sharepoint.com/personal/jmauro_cydcor_com/Documents/Frame%20Studio (Install Frame Studio.bat, start file, studio app).
- OneDrive folder Voice Studio: https://cydcorllc-my.sharepoint.com/personal/jmauro_cydcor_com/Documents/Voice%20Studio (Voice Studio page, Studio Hub program, installer, start file).
- Local copies under /home/user (container file, may be lost).

**Final state:** All tools delivered but none run for real: no lesson tested with a real API key or HeyGen; Frame Studio and Voice Studio tested only against stand-in engines (no GPU/models in the container); Windows package resolution checked for Voice Studio.

**Open items:** User to run Professor Lingua Live, Frame Studio and Voice Studio on their PC and report issues; assistant asked which program to connect to Studio Hub (e.g. Professor Lingua using cloned voices).

**Your messages:**
1. *(2026-10-19)* i would like to build a human simulated language teacher who will speak to me and listen to me back - with teaching curriculum and conversation.  all languages.  up front first person.  simulation to be like learning in school
2. *(2026-10-19)* call it "Professor Lingua"
3. *(2026-10-19)* make microphone active and make a more human sounding voice.
4. *(2026-10-19)* can you make it to where is doesn't need an API key ?
5. *(2026-10-19)* no - i want fluid voices and faces to talk to.
6. *(2026-10-19)* when i click the html it says "NO CHANGES TO SHOW"
7. *(2026-10-19)* says can't reach claude - check your connection
8. *(2026-10-20)* can you build me an app that can generate real life photos and videos
9. *(2026-10-20)* i want me build my own video creator tool based on uploaded images or self created. i want to be able to create pictures and videos as needed.
10. *(2026-10-20)* no - i want to build my own - not link it to anything for a fee - i want to build my own
11. *(2026-10-20)* now i would like to create a voice simulator as well - where i can create human sounding voices and animals - where i can upload my voice or an file with audio to replicate the voice.  i would also like to have the option to upload text that the voice can read in the sound of that voice.
12. *(2026-10-20)* i would also like the ability to attach another program to this for voice use.
13. *(2026-10-20)* i would also like my video program to be able to be used by another app
