### Human interface for Claude code
*Created 2026-10-25 · last active 2026-10-25 · session `session_01AmPKFVJEg7j8WE7zgkFY6N`*

**Goal:** Find out what is needed to build a talking human interface: a lifelike AI teacher that listens and speaks back and forth, shown both as full human figures and close-up headshots.

**Requirements & decisions:**
- First asked what is needed for a human interface that "speaks through Claude Code". Answer: four pieces (a way to drive Claude Code via headless CLI or the Claude Agent SDK; speech-to-text such as Web Speech API, Whisper or Deepgram; text-to-speech such as browser speechSynthesis, Piper or ElevenLabs; a small glue app), with a minimal Python Agent SDK example and a lighter Stop-hook speak-back option.
- Then specified: a human teacher that speaks back and forth, responds and listens; completely human full figures as well as close-up headshots that talk like a human.
- Recommendation: the teacher should run on the Claude API directly (Claude Code is for building the app). Stack: STT (Deepgram/AssemblyAI/Whisper) + Claude teacher persona + TTS (ElevenLabs/Cartesia) + real-time avatar for headshots (Tavus, HeyGen, D-ID, Simli, bring-your-own-LLM) + web app.
- Full-body options: Unreal MetaHumans (most realistic, most work), hybrid pre-rendered body clips cutting to a live headshot, or stylized three.js 3D.
- Notes given: latency under about 1 second, interruptions, short spoken turns, memory; disclose AI to students; COPPA/FERPA if students are minors; do not model on a real person without consent.
- Suggested first build: web page with live headshot avatar (Tavus or HeyGen), Deepgram, Claude, ElevenLabs.

**Delivered & links:**
- None (advice only; no files or artifacts).

**Final state:** Advice given; nothing built. The session ended waiting on the user's answers.

**Open items:** Claude asked: who the students are and the subject; prototype or product; whether API accounts exist (Anthropic, HeyGen or Tavus, ElevenLabs) or a setup checklist is wanted.

**Your messages:**
1. *(2026-10-25)* what do i need to create a human interface that speaks through claude code ?
2. *(2026-10-25)* i want to create a human teacher that will speak back and forth and respond and listen.  i want to create completely human figures as well as close up headshots. that will talk like a human
