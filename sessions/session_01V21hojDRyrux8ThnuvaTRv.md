### Claude usage counter HTML
*Created 2026-10-31 · last active 2026-11-20 · session `session_01V21hojDRyrux8ThnuvaTRv`*

**Goal:** A live usage counter showing Claude / Claude Code usage and how much is left, without having to check the usage page; ended up as a cross-browser extension with a usage "coach".

**Requirements & decisions:**
- Live numbers; user is on Windows.
- A plain HTML page cannot read plan usage; first built a Claude Code status line (bash/jq, then PowerShell for Windows) and a Windows desktop tray widget (usage-widget.ps1 + "Claude Usage.cmd" launcher), then v2 with history.
- Widget showed "no data" because the user uses Claude on the web, not Claude Code on the PC.
- Built an unofficial Chrome extension that reads the same usage data claude.ai's Settings > Usage page fetches; user approved (admin, work account, uses Chrome).
- Zip with two folders: Desktop (PC widget) and Web (Chrome extension); works on Mac Chrome too.
- Icon: analog clock in Claude colors with a starburst in the lower right (own design, not the trademarked logo), orange background removed; % shown bottom-middle in black on a solid white rounded label (drawn into the icon).
- Gemini/ChatGPT support discussed twice; user declined ("Claude only is fine").
- Separate folders for Edge, Firefox, Brave, DuckDuckGo, Safari and others; must work on Windows, Mac and maybe Linux.
- "INSTRUCTIONS - READ ME FIRST.txt" inside the zip, written for non-technical users.
- Extra entries "Copper kite" / "Granite teacup" are Anthropic internal usage counters; user said leave them.
- (Nov 20) Added a coach: meter unchanged, small "i" button opens a suggestions bubble (status, session/week pace, "What's next?" task picker recommending model and thinking setting, usage pattern, rotating tip).

**Delivered & links:**
- Files sent as attachments (container files in /home/user/claude-usage-statusline/, may be lost): statusline.sh + settings-snippet.json; statusline.ps1 + settings-snippet-windows.json; claude-usage-widget-windows.zip, claude-usage-widget-windows-v2.zip; claude-usage-meter.zip, -v2, -v3, -v4, -v5; claude-usage-meter-all-browsers.zip (final, with coach) and coach-preview.png
- No artifacts or GitHub links.

**Final state:** Chrome extension confirmed working by the user; all-browsers zip with instructions delivered; coach bubble added and checked visually with sample data, not yet confirmed by the user.

**Open items:** User to install the coach version and confirm.

**Your messages:**
1. *(2026-10-31)* are you able to built a counter html that monitors my claude and claude code usage - gives me numbers and how much i have left so i don't have to look at it.
2. *(2026-10-31)* live numbers
3. *(2026-10-31)* this is windows but it shouldn't matter.
4. *(2026-10-31)* i would like to just open something and have it running on my desktop or toolbar.
5. *(2026-10-31)* i need to download it
6. *(2026-10-31)* how do i run a .ps1 file? i just type the name, right ? in powershell
7. *(2026-10-31)* works - thanks
8. *(2026-10-31)* says no data yet - can it track my current usage percentage and current history so i know where i am at.
9. *(2026-10-31)* give me a new download when ready
10. *(2026-10-31)* give me the download again
11. *(2026-10-31)* its saying plan % left isn't reported for this account....
12. *(2026-10-31)* [image]
13. *(2026-10-31)* no - it is on the web
14. *(2026-10-31)* aah - only work with desktop .  anything to make it work for web?
15. *(2026-10-31)* i allow it - im the admin. work account. i use chrome for claude.
16. *(2026-10-31)* if you can make an addin - in the zip make a folder for desktop and the other for web
17. *(2026-10-31)* html for chrome web just says loading and refreshing - nothing else.
18. *(2026-10-31)* got it - all good.
19. *(2026-10-31)* can you do the same for chatgpt and gemini in the same app ?
20. *(2026-10-31)* nevermind.  all good for now.
21. *(2026-10-31)* will the addin word on mac chrome ?
22. *(2026-10-31)* can we change the logo to a claude logo with a analog clock
23. *(2026-10-31)* an analog clock with the starburst in the lower right
24. *(2026-10-31)* lose the orange around the clock and it will be good
25. *(2026-10-31)* this one - and the percentage meeting at the bottom middle in black with solid rounded white background
26. *(2026-10-31)* [image]
27. *(2026-11-02)* this looks great - please separate and make folders for Microsoft Edge, Firefox, Brave, Duck Duck Go, Safari, so i can put them in other browsers - or any other browser you can think of.
28. *(2026-11-02)* will need to use for mac or windows, and maybe linux if it is not too difficult.
29. *(2026-11-02)* create instructions inside the .zip file so anyone can follow it. it can be txt
30. *(2026-11-08)* mine shows up with copper kite and granite teacup - what are those ?
31. *(2026-11-08)* are you able to add chatgpt and gemini usage ?
32. *(2026-11-08)* nevermind - not enough usage of gemini. Claude only is ine.
33. *(2026-11-08)* those are fine.  only shows up for me so it must be an admin thing.
34. *(2026-11-20)* can we update the counter to offer suggestions based on current usage and and usage style to give best model match and difficulty to use to save economically ?
35. *(2026-11-20)* to analze current usage and give recommendations is what i meant to ask. the meter is great but may an information button to open a bubble to give suggestion.
36. *(2026-11-20)* that is good too.
37. *(2026-11-20)* exactly and that coach.
