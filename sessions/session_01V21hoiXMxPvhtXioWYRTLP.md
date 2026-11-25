### Outlook add-in for folder favorites
*Created 2026-10-30 · last active 2026-11-02 · session `session_01V21hoiXMxPvhtXioWYRTLP`*

**Goal:** Stop Outlook Favorites folders from disappearing by automatically saving and restoring the Favorites list and order.

**Requirements & decisions:**
- User asked for an Outlook add-in; built as a VBA macro instead because modern Office.js add-ins cannot touch the folder pane. Classic Outlook for Windows only (not New Outlook or Outlook on the web).
- FavoritesKeeper.bas: SaveFavorites (saves folder paths in order to %APPDATA%\FavoritesKeeper.txt, hand-editable), RestoreFavorites (re-adds missing folders and fixes order), REMOVE_EXTRAS option (default False).
- ThisOutlookSession.txt: Application_Startup hook restores Favorites silently on every Outlook start.
- Setup: Alt+F11 import, allow macros (or SelfCert signing; IT may block), restart, arrange, SaveFavorites.
- Likely causes noted: switching between New/classic Outlook, damaged nav pane (outlook.exe /resetnavpane), late-loading shared mailboxes.
- Toolbar shortcut with two options: FavoritesMenu macro (Yes = Save, No = Restore, Cancel) added to the Quick Access Toolbar.
- A browser-folders request was sent to this chat by mistake; user said "disregard, wrong chat."
- Instructions packaged with the .bas in a zip ("READ ME - Setup Instructions.txt", Windows line endings).

**Delivered & links:**
- FavoritesKeeper.bas (updated with FavoritesMenu), ThisOutlookSession.txt, FavoritesKeeper.zip (with READ ME - Setup Instructions.txt), all in /home/user/outlook-favorites-keeper/ (container files, may be lost; sent as attachments)

**Final state:** Macro and zip delivered with full setup instructions; never run in Outlook by Claude (no Outlook in sandbox).

**Open items:** None.

**Your messages:**
1. *(2026-10-30)* can you write me an outlook add-in for automating the appearance.  I constantly have to re-add folders into my favorites bar and adjust them.  they keep disappearing and there is no reason why.
2. *(2026-10-30)* where is the file ?
3. *(2026-10-30)* got it.  can i also add a shortcut to my toolbar - so i can click on it and have 2 options - save or restore ?
4. *(2026-11-02)* this looks great - please separate and make folders for Microsoft Edge, Firefox, Brave, Duck Duck Go, Safari, so i can put them in other browsers - or any other browser you can think of.
5. *(2026-11-02)* disregard, wrong chat.
6. *(2026-11-02)* can you include instruction with the .bas file in a zip
