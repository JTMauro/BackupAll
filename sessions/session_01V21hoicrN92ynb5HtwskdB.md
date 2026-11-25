### Personal Profiles
*Created 2026-11-19 · last active 2026-11-19 · session `session_01V21hoicrN92ynb5HtwskdB`*

**Goal:** Build a reusable writing-voice profile system (a Claude skill) that learns how the user writes so other chats can produce documents in their voice on request ("ChatProfile JT"), plus a clean, shareable "Personal Profiles" version for other people.

**Requirements & decisions:**
- Learn how the user speaks/writes so documents created in other chats use their voice; built as a skill ("voice-profiles"), not a chat app.
- Questionnaire to learn writing style; named profiles invoked like "ChatProfile JT1"; can create many profiles via questionnaire.
- Profile renamed from JT1 to **JT**.
- Writing sample provided (deadline-by-Friday note); Claude also analyzed ~45 sent emails and favored emails over questionnaire answers where they differed (e.g. mostly no sign-off or "JTM", no exclamation points).
- Ask who the audience is when creating (e.g. performance evaluation should be more professional); four formality levels by audience.
- Works in regular Claude chat as well as Claude Code once the skill is saved; skills are now under **Customize > Skills > + > Upload a skill** (zip upload).
- Deeper "learn me" rounds: work style, scenario replies (bad news, vague ask, shout-out to Taylor, project pitch with humor and a "6000 foot view", policy deferral, "dedicated to a fault" self-description); JT rebuilt with "Who you are" traits (dedicated, hands-on, high standards with earned trust framed as ownership, protects the team).
- Raw export without the user's info for another account: skill called **Personal Profiles**; user renames the chat to Personal Profiles; first question is first name; first profile created as "Brian1" and confirmed; then questions; afterwards build the person's own zip and show how to install the skill.
- Add education level question (optional, plus fields/certifications) to Personal Profiles; add the user's own education to JT (Master's or higher; IT/technical, psychology, religion, science).

**Delivered & links:**
- voice-profiles.skill (two versions) and **voice-profiles.zip** (latest 2026-11-19 16:56, JT with education) sent in chat
- **personal-profiles.zip** (latest 2026-11-19 16:29, with education question) sent in chat
- /home/user/voice-profiles-dist/ and /home/user/personal-profiles-dist/ (container files, may be lost)

**Final state:** JT profile skill complete with audience-based formality, deep personality traits and education; Personal Profiles shareable skill scrubbed of personal info and builds a zip for the new user. Personal Profiles flow never run with a real person; installation depends on user uploading via Customize > Skills (org must allow custom skills).

**Open items:** User to upload the latest voice-profiles.zip (replacing the old one) and test; Personal Profiles untested with a real person.

**Your messages:**
1. *(2026-11-19)* i would like to build this chat with profiles so learn how i speak and if i wanted to create a document in another chat it would learn to create it using my way of speaking
2. *(2026-11-19)* give questions to learn how i write and figure out how a can request to chat and choose JT1 and a profile where i can create many through questionairre
3. *(2026-11-19)* for instance - in another app i would request write up a how to guide using "ChatProfile JT1" chat - or another profile name
4. *(2026-11-19)* change jt1 to JT
5. *(2026-11-19)* Hi All - just FYI - i would like to get all this done by Friday. If any issues arise, please let me know and we can figure out next steps.
6. *(2026-11-19)* now if i am writing my performance evaluation it would be more professional - when creating i would suggest to ask who is the audience
7. *(2026-11-19)* can i also use chat or do i have to use claude code chat
8. *(2026-11-19)* save skill
9. *(2026-11-19)* it changed - tell me the new way to save this skill under customize
10. *(2026-11-19)* learn me better my asking a series of questions and answers to recompile - not just basics but learn me
11. *(2026-11-19)* 1 - We had an issue - i am working to resolve and will update you. I will get it right. 2 - let us know what part you want to help on. we can do what you need but also want to clarify their needs so we aren't doing double work.
12. *(2026-11-19)* 3 - Thank you Taylor for the extra effort and getting the job done.  We all appreciate your dedication. 4 - I am really excited about this new project. I would use a little humor. i want to gie you the 6000 foot view and you can ask me questions later.  i will get a little granular but stop me when you've heard enough. 5 - i would defer to my leadership but our policy will not allow it, but upon approval we can assist you in the installations. 6. i am dedicated to a fault - i will always volunteer especially when other sit on their hands.  i want things done and i know how to do anything and have little trust in other doing the right thing or the thing right.  it take time to trust.
13. *(2026-11-19)* this is great - can you create a raw export without my informaton but creating a brand new chat profile on another account.  to where they create the chat - you rename it to Personal Profiles, and start asking questions. first question is First name, then create the first profile as Brian1  and ask if OK.  then proceed to ask questions.
14. *(2026-11-19)* after asking questions build .zip file for person and show how to create a skill
15. *(2026-11-19)* include education level
16. *(2026-11-19)* yes add to me
