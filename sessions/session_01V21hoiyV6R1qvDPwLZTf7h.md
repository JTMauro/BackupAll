### Relay chat system feasibility
*Created 2026-11-15 · last active 2026-11-16 · session `session_01V21hoiyV6R1qvDPwLZTf7h`*

**Goal:** Assess and build "Relay — Crew Connect", an internal sci-fi-themed chat system combining the best of Slack, Teams and Zoom, with expiring files/groups, emergency alerts, a website plus desktop and phone clients, and a key-based integration with CydVerse.

**Requirements & decisions:**
- Name: **Relay — Crew Connect**. Intro uses the CydNI 3D bot (Cydni) "with the twist" and a headset with microphone. Internal use only; separate from CydVerse (which is file-related). CydFTP and CydVerse are other Claude chats.
- File drop without retention: files expire after an admin-chosen time; chats can also have end dates.
- Website plus a connecting client, and phone quick-connect through an app.
- User pasted a long product blueprint (continuity: chat to voice session, decision or task; features borrowed from Slack, Zoom, Teams; AI summaries); turned into a staged `ROADMAP.md` (full scope is Slack/Teams-scale; Stage 1 about 3-4 months for 1-2 developers).
- Not Slack-style channels; Zoom-like structure: **Global** feed for everyone (only approved people post; everyone can reply), **SideQuests** (invite-only groups) that can expire on admin time limits; creator notified of lifecycle and can request permanence; admins see everything, general users don't.
- Emergency alert system: Global posts as Alerts, emailed to all users, with pop-ups in CydVerse via an agent connection; notify on initial post (default) or every reply.
- Look: Star Trek / Men in Black sci-fi, easy to read; per-user themes **Sci-Fi (default), Windows, Mac** on all platforms.
- Deliverables: video, manual, installation guide, hardware/VM requirements, PPTX, DOCX, diagram, and how to connect to CydVerse via an add-in/KEY (not built in).
- Icon must be the user's real 3D Cydni from the "CYDNI 3D" artifact (https://claude.ai/artifact/NGZZbmSJPmgeBL72yWZixn), with headset and boom mic.
- Admins have full control, including deleting SideQuests, renaming, changing owner, adding/removing members.
- Video updated with an original space-feel soundtrack and very soft whooshes between scenes (~2.5 min).
- Relay keeps its own reporting; user approved adding a read-only reporting feed for CydVerse (JSON/CSV, counts only, logged).
- Centralizing in Starbase (planned new name for the CydVerse admin console, designed but not built): recommended as a front door, not a merger; no iframe.
- User built both on the same machine; assistant fetched a newer Go and built a two-way integration with CydVerse 0.1 source from the Release Kit: Relay page in Orbit's admin console, CydVerse security alerts into an IT Alerts SideQuest (critical-to-company option off by default), CydVerse test suite still passes.
- 2026-11-16: Encryption: in transit yes (HTTPS), passwords hashed, keys hashed, webhooks signed; NOT encrypted at rest (database, files, two webhook secrets). Recommended AES-256-GCM at rest with per-conversation keys (crypto-shred on expiry); not end-to-end (would break admin oversight). Needs decision on master key location.
- Relay doesn't use the mail system for chat; only optional Alert emails (off switch in Admin > Alerts & CydVerse; nothing sent if mail isn't configured).

**Delivered & links:**
- Attachments: Relay v0.1 desktop/phone screenshots and roadmap; Relay v0.2 bundle (cydni-full.png, Relay-Walkthrough.mp4, Relay-Overview.pptx deck of 13 slides, user/admin manual .docx, install guide with hardware/VM requirements .docx, system diagram); updated Relay-Walkthrough.mp4 (2.5 min with soundtrack); CydVerse Relay page screenshots, `integrations/cydverse-orbit/relay-page.patch` and handoff README.
- `/home/user/relay` (git repo with code and docs; container files, may be lost: never pushed to GitHub, the assistant repeatedly asked for a repo)
- No artifacts published for Relay.

**Final state:** Relay v0.2 (web, PWA phone, desktop client source) works in browser tests with Global, SideQuests, Messages, Alerts, admin controls, themes and CydVerse integration both ways. Not tested: alert emails (no mail server), Windows/Mac desktop installers (not built). Data at rest is not encrypted.

**Open items:** Provide a GitHub repo so the code is saved; decide whether to build at-rest encryption and where the master key lives (key file, Windows DPAPI or Azure Key Vault); decide whether to remove or keep the Alert email option; decisions on admin visibility of 1:1 messages (HR/Legal notice), hosting, sign-in method, pilot team and who may post Alerts.

**Your messages:**
1. *(2026-11-15)* How difficult of a task would it be to create a "Chat" system called Relay.  Use CydFTP  Cydni3d in the beginning, the twist - and have a head on with microphone. this would take the best things from slack, teams, and any other sytem build in to this.  It would be for internal use only. i was thinking of adding it to my CydVerse but that is all file related. this should be separate. it should have file drop - but not maintain - files should die after a chosen about of time by the administrator and chats can also have an end date as it should have a limit. get started and i will review the best features to include.  i would suggest to option, a website but also a client that connects.
2. *(2026-11-15)* Relay — Crew Connect.
3. *(2026-11-15)* cydftp and cydverse are claude chats
4. *(2026-11-15)* even phone quick connect through app.
5. *(2026-11-15)* Relay should combine excellent everyday chat with the feeling of a crew staying connected across ships, stations, and planets. Its strongest feature should be continuity: a conversation can become a voice session, a decision, or an assigned task without losing its context.
   
   I’d use the following as the product blueprint. The competitor references reflect their official documentation; availability varies by subscription and configuration. Everything described for Relay below is a proposed feature.
   Borrow from	Features worth bringing into Relay
   Slack	Channels, threaded conversations, casual audio huddles, recorded clips, collaborative canvases, lists, integrations, and visual workflow building. Slack
   Zoom	Easy transitions between chat and meetings, shared spaces that organize related channels, and AI assistance for catching up on discussions and identifying action items. Zoom
   Microsoft Teams	Team and channel organization, SharePoint document integration, and enterprise administration and compliance. Microsoft Learn
   Their AI capabilities	Summaries, meeting assistance, information retrieval, and agents are already part of this market. Relay should make these dependable, permission-aware, and easy to control. Slack
   
   
   1. Messaging that gets all the everyday details right
      This needs to be Relay’s strongest foundation.
      - Direct messages and group chats: Easy creation, clear participant lists, descriptive group names, and straightforward membership management.
      - Consistent th […truncated, 19864 chars total]
6. *(2026-11-15)* slack using channels is not a great way to see things.  Let use like zoom - we have Global - for everyone to see (like public facebook) - limited to certain people to create messages but others can reply on those mesages.  then we can have SideQuests(Groups) - to create and invite others to join - SideQuests can die off if time limits are set by admin.  creator will be notiified of group time life cycle and can request permanence. Everything is viewable to the Admins but not to general use public.
7. *(2026-11-15)* This would also act as an emergency alert system - posting on Global with email all users attached to system and can interact/connect with that agent from CydVerse to have a pop-up Alert for them to view Company Information from Global Posts.  notification should be set to initial post option or every response - but if we have every response it could get messy.  but the option is there.
8. *(2026-11-15)* i would like the appearance to be something our of Star Trek/Men in black/or any scifi - an easy to read but space age look to it.
9. *(2026-11-15)* that can be default but under setitngs/themes are individual they can choose standard windows or Mac look settings.
10. *(2026-11-15)* so Scifi - Standard, Windows look or Mac look (on all platforms).
11. *(2026-11-15)* and build be a video, manual, installation guide, hardware/vm requirements, pptx and docx and diagram - and how it would need to connect to the agent or have an add-in to Cydverse like a KEY to work with Cydverse since it won't be built-in
12. *(2026-11-15)* icon is not cydni - please looks at my 3d cydni from other chats
13. *(2026-11-15)* admin can delete sidequests right ?
14. *(2026-11-15)* full control for admins
15. *(2026-11-15)* update video - and you can add a "space feel soundtrack" and a very soft whoosh between slides
16. *(2026-11-15)* relay will use cydverse reporting ?
17. *(2026-11-15)* that is fine.
18. *(2026-11-15)* on buy in how easy would it to just add relay into Starbase ?  centralized would be best ?
19. *(2026-11-15)* if you need at cydverse chat - starbase in the admin console
20. *(2026-11-15)* i used the same machine to build both.  you should have the same access to the same things.  find it or let me know what you need
21. *(2026-11-15)* referring to go version
22. *(2026-11-16)* relay would be encrytped data, right ?
23. *(2026-11-16)* and it won't use our mail system ?
