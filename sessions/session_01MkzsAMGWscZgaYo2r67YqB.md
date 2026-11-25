### MuchSmarter
*Created 2026-10-21 · last active 2026-11-22 · session `session_01MkzsAMGWscZgaYo2r67YqB`*

**Goal:** Build "MuchSmarter", a full-featured IPTV Smarters-style player (Xtream, M3U, EPG, Stalker) with Live TV, Movies, Series, downloads, recording and a 3D themed menu, packaged for Windows, Mac, Linux, Android and iPhone, then iterate on it for weeks (buffering, filters, downloads, phone app, signing).

**Requirements & decisions:**
- Supports all IPTV connection types (Xtream Codes, M3U, EPG, Stalker portals); Live TV, Movies, Series; download TV/movies; record now and future TV; any window size, full screen, pop-out player; closed captions and all cast styles.
- Downloads can be organized/manipulated (rename, folders, reorder); favorites and recently viewed, with single-item remove and clear all.
- Main menu: high-graphics 3D with floating options and Settings; backgrounds Standard, Techno, Paleolithic, Futuristic, etc., custom colours; option to switch to a standard (non-3D) screen.
- Uploadable theme format: `.smartertheme` package (renamed zip with theme.json, images/video, fonts) or a standalone theme.json; sample "sunset-beach" theme included.
- Platforms: Linux, Mac, Windows, Android, iOS. Name: MuchSmarter; icon is a lightbulb inside a television. Refresh-catalog option. Builds must be self-contained (bundled ffmpeg, no external installs).
- Windows signing: Smart App Control blocked the unsigned exe; discussed free vs paid signing, Certum open-source certificate, SignTool; final kit signs with the **Cydcor certificate** the same way as the user's CydFTP app (only trusted on Cydcor-managed PCs; Azure Trusted Signing option via `signing.json` "mode": "trusted-signing"). Also a no-install zip/portable option.
- Deliverables via a Windows Build Kit (`BUILD MUCHSMARTER.cmd` builds the signed Setup.exe on the user's PC), plus 3-part all-in-one zips because a single 660 MB zip was too big; instructions in .txt files.
- In-Claude preview/demo of the real app wanted ("test it within claude").
- 2026-11-05 batch: colour-theme dots / follow Windows theme; buffering option up to 30 s; fix non-working player buttons; list / small / medium / big / compact views everywhere; favourite before opening; Paleolithic = stone age, Volcano = lava/hellfire; export/import ALL settings and favourites (backup file kept outside the install folder); ask on start to update library or continue; per-episode watched tracking; restart-at-freeze button; auto-raise buffer after 3 stalls in 1 minute with notification; signal-strength meter in bottom bar; buffer-ahead bar in light gray; fix audio dropouts/compat mode; export to VLC from Live/Series/Movies; remove items from Continue Watching; desktop description just "Much Smarter"; fix shortcut error.
- Channel filters (country, language, genre, subgenre, coverage, provider, quality, rating, channel type, features, personal) with "Access / cost" removed; same filters for Movies and Series.
- Shared copies must carry no personal data (provider credentials were in a build); erase-all option for new machines.
- Up-next prompt: Play next / Pause / Don't ask again this viewing / ask again after 3 episodes, while still buffering the next episode; keep full screen and screen size across buffering and next episode; pause keeps buffering to end of show for TV/movies; recording extend in 30-minute steps up to 4 hours; backup-on-exit prompt with "don't ask again" and a Settings slider.
- Buffer bars: two overlapping colours (blue and yellow, green where they overlap); feed-issue popup offering "download and play when ready"; local downloads never buffer; in-app player for downloads that looks like the streaming player.
- Versioning in an About tab using MAJOR.FEATURE.MINOR.BUILD (started 1.0.0.1), company "JTizzle Industries"; data and backup folders shown in About.
- Restore option, clear recently watched (single and all, on Live/Series/Movies); scroll performance fixes for big lists; persistent search bar.
- Hide-adult checkbox on Live/Movies/Series (subtle "A" + checkbox, checked by default, filter by rating not title; note "XXX" Vin Diesel film is not adult); adult content sorted to bottom of lists and categories; "Modify" mode to mark titles manually, remembered in backups.
- Rainbow colour themes, optional colour pulse glow, import Windows backgrounds.
- Android: install help, fix blank screen and hanging playlist connect, show-password toggle, loading indicator, screen rotation, Android backup; build all apps but also send the APK separately.
- Streaming buffer: option to download and play from disk, watch while downloading, 7-minute safety, bitrate selector remembered, CC sync issue, "30s or FULL" buffer readout.
- Downloads: queue (one at a time per provider), auto-retry aborted, resume after reboot, Select all / Select none in Downloads, Recordings, Favorites, Recently Viewed; unfinished items move to top; new single download queues instead of overtaking; download button on movie/show tiles (bottom right; show asks whole show or season).
- PATCH-HISTORY.txt line-item fix history, oldest first, included in every build.
- Phone "Suspicious Site Blocked" issue: turned out Spectrum was blocking the provider; provider fixed it (not an app bug).
- File names must carry the full version (after a 1.0.2.x mix-up); version jumped to 3.1.4.x at the user's request.
- User guide as .txt and a searchable PDF (10 pages, 18 sections).
- Project pushed to GitHub (private repo) on 2026-11-22 so the code is no longer lost when the workspace is wiped; Android keystore deliberately kept out of the repo.

**Delivered & links:**
- Artifact "MuchSmarter App" (real app running in Claude with a demo provider): https://claude.ai/artifact/QLitQawoE9VVVD3oVmBWZq (last published 2026-11-15).
- Artifact "MuchSmarter Preview" (screens and downloads page): https://claude.ai/artifact/AChC9BTMu97RnYLqSTKGCE (2026-11-04).
- GitHub: https://github.com/JTMauro/MuchSmarter (private, branch `main`, one commit "MuchSmarter 3.1.4.1", 190 files, no signing key).
- Final version 3.1.4.1 files (sent 2026-11-22): MuchSmarter-3.1.4.1.apk; MuchSmarter-3.1.4.1-Windows-Build-Kit.zip + MuchSmarter-Instructions.txt; MuchSmarter-User-Guide.pdf and .txt; WHATS-NEW.txt; PATCH-HISTORY.txt; MuchSmarter-3.1.4.1-mac-intel.zip; MuchSmarter-3.1.4.1-mac-apple-silicon.zip; MuchSmarter-3.1.4.1.AppImage; muchsmarter_3.1.4.1_amd64.deb; MuchSmarter-mobile-project.zip (iPhone, build on a Mac with Xcode); MuchSmarter-source.zip; All-in-one parts 1-3.
- Earlier releases: 1.0.0 (Oct-Nov 4), 1.0.0.1-1.0.2.18 (Nov 7-15), 3.1.4.0 (Nov 20).
- Container paths /home/user/iptv-player and its dist/ (container file, may be lost; the workspace was already wiped once on ~Nov 21).
- Android signing key `mobile\android-lite\muchsmarter.keystore` lives only in the user's source zip; needed for updates to install over the existing phone app.

**Final state:** 3.1.4.1 built and all files re-sent; code pushed to GitHub. Download queue fix and tile download button tested in the desktop app with a test provider. The Windows Build Kit (signing, icon/version stamping) has never been run here and is untested; Wine crashed on the new build machine so Windows exe stamping happens only in the kit. Buffering/freezing on some streams was improved over many builds but was still being monitored by the user.

**Open items:** User to run the 3.1.4.1 Windows Build Kit on a Cydcor PC and test; keep the Android keystore safe; optional permanent git-push allow rule; user planned further debugging through the holidays.

**Your messages:**
1. *(2026-10-21)* IPTV Smarter - Can we build and IPTV smarter app that supports all connection including Xtream, m3u, epg and anything else they use.  I want Live TV, Movies, Series options.  I also want ability to download tv or movies, record tv and future tv.  The screen can be all sizes including full screen and well and pop-out to resize as needed.  support all casts styles includes Closed Captioned and everything you can think of.
2. *(2026-10-21)* make sure we can manipulate and organize downloads.  have favorites, last viewed list and be able to remove single favorites and viewed
3. *(2026-10-21)* let's make the menu screen very high graphics 3D, with the options floating in place include a settings option.  background choices include Standard, Techno, Paleolithic, Futuristic, and other options to make your own screens colors.  also give ability to remove high graphics screen to a standard screen
4. *(2026-10-21)* for background screen and options - give me a format where i can upload new themes - and make it an option in the app
5. *(2026-10-21)* i would like to use this on linux, mac, windows, android, and ios (iphone)
6. *(2026-10-21)* Call the app MuchSmarter and the logo/icon to be a lightbulb in the television
7. *(2026-10-21)* this app also has a refresh catalog option , right ?
8. *(2026-10-22)* no - i want them all self contained
9. *(2026-10-22)* can you build installer packages ?
10. *(2026-10-22)* what type of file do i use to upload new themes ?
11. *(2026-10-22)* this computer is a windows pc - you can test on this
12. *(2026-10-22)* when done - please give all links or files at the end
13. *(2026-10-22)* to install on various devices
14. *(2026-10-22)* build what you need
15. *(2026-10-22)* list all my downloadable files and give me the info for making it on mac.
16. *(2026-10-22)* windows won't let me install due to smart app and the is not signed certificated on the app - can you fix that.
17. *(2026-10-22)* i want a free signed
18. *(2026-10-22)* or can you make the app work within its own folder and no install needed ? i can use zip , expand it and it would work ?
19. *(2026-10-23)* it is still blocking exe - can we build our own signing utility ?
20. *(2026-10-23)* can you check my version of windows as to whether i can turn off smart app and turn it back off if needed ?
21. *(2026-10-23)* i am 26300.9711
22. *(2026-10-23)* [image attached]
23. *(2026-10-23)* a popup gives me this :
24. *(2026-10-23)* for the windows app - it is possible to create a zip with all the necessary files and extract the zip for it to work ? or do we need to register dlls etc ?
25. *(2026-10-23)* tell me again the options to be able to sign .exe files properly
26. *(2026-10-23)* OK - tell me the steps for the paid method and can we sign for a year at a time?
27. *(2026-10-23)* tell me about certum open-source cerftificate
28. *(2026-10-23)* can i use sign tool ?
29. *(2026-11-04)* using that cert. give me files and instruction on how to sign and deploy this app.
30. *(2026-11-04)* in txt file
31. *(2026-11-04)* create the signing like you do the FTP app
32. *(2026-11-04)* look at the FTP app with encrytion and key chat
33. *(2026-11-04)* no - use the cydcor certificate
34. *(2026-11-04)* redisplay all the files and download i need
35. *(2026-11-04)* can you make a single zip for all the files.
36. *(2026-11-04)* make a preview
37. *(2026-11-04)* what do you call it when i can just it within claude - that is what i want
38. *(2026-11-04)* test it within claude
39. *(2026-11-05)* themed - include color theme dot colors so i can option color backrounds or use windows current theme.  video seems to freeze every few minutes and buffers for a bit - can we include buffering option in video screen up to 30 seconds. and button in the video don't seem to work even though they are there - settings button and some others.  when displaying show in all areas, can i get options like list view, small medium big icons and compact. and all areas.  add favorites option to items before i click on them
40. *(2026-11-05)* paleolithic and volcano are the same - paleo should be stone age theme and volcano is like lava and hell fire theme.
41. *(2026-11-05)* where is the export setting button to export and import ALL settings, favorites, etc. in case of reinstall
42. *(2026-11-05)* ask to update library on start or continue with current library
43. *(2026-11-05)* note any shows already viewed for episode viewing control not just the whole series
44. *(2026-11-05)* if show freezes are this, readd a restart button to restart at point of freezing
45. *(2026-11-05)* if screen halt 3 time within 1 minute - auto increase buffer and notify - a signal strength for feed would also be good at bottom bar for all viewing as well
46. *(2026-11-05)* show buffer ahead slide bar in light gray with the playing time bar
47. *(2026-11-05)* also noticed volume dies at times.  check on that.
48. *(2026-11-05)* said - no sound detected - switching to compatibility mode - but if i exit and go back in - sound fails.  i have to exit to menu and come back in.
49. *(2026-11-05)* the file that is the export/import file should not exist in the zip/install files so when i copy over another instance, the file will still be there to use.
50. *(2026-11-05)* perfect
51. *(2026-11-05)* one thing was missed- in the bar of live, series and movies, you should be able to export to VLC if wanted.
52. *(2026-11-05)* redisplay updated download files
53. *(2026-11-05)* when you  show the continue watching options, you should be able to remove them from that menu.
54. *(2026-11-05)* i don't see the 3 zip files all in one
55. *(2026-11-05)* it is called IPTV on desktop description - should just be Much Smarter
56. *(2026-11-05)* IPTV player for Xtream Codes, M3U and Stalker portals wit
57. *(2026-11-05)* [image attached]
58. *(2026-11-05)* shortcut give error while the app itself works -
59. *(2026-11-05)* add to the program a filtering options for channels by   
   Filter	Example choices  
   Country / region	United States, UK, Canada; state or city for local channels  
   Language	English, Spanish, French; multilingual  
   Genre	News, sports, movies, comedy, drama, documentaries, kids, music, lifestyle  
   Subgenre	Football, classic movies, cooking, travel, business news  
   Coverage	Local, national, international  
   Access / cost	Free, subscription, premium; requires provider login  
   Provider / service	DIRECTV, cable, antenna, streaming service  
   Video quality	SD, HD, 4K  
   Audience / rating	Preschool, family, teen, adult  
   Channel type	Traditional network, streaming-only, single-show channel  
   Features	Closed captions, alternate audio, catch-up, DVR  
   Personal choices	Favorites, recently watched, hidden channels
60. *(2026-11-05)* remove access/cost
61. *(2026-11-05)* that is good
62. *(2026-11-06)* i noticed my ottocean subscription was in the build or was it ?  did it somehow pull from another app ?
63. *(2026-11-06)* or ott ocean
64. *(2026-11-06)* all good - if i share this app i don't want that going with it - so new machine , no info
65. *(2026-11-06)* running is great  - seems to be missing the filtering.
66. *(2026-11-06)* those filters in series and movies ? and where is the buffer button for time - so far everything else i tested is working great.
67. *(2026-11-06)* when showing the next episode automatically give option to Play next episode or Pause - or Don't ask for remainder of this viewing or show again after 3 episodes.  While this is up, please still buffer the next episode.
68. *(2026-11-06)* and if i am in full screen and buffering issue arrive it changes back to previous view size.
69. *(2026-11-06)* when you pause and it keep going does the buffer ever stop for max time or it will continue until complete?
70. *(2026-11-06)* tv and movies on pause should not have a limit, it can continue to buffer until end of that show
71. *(2026-11-06)* when recording - give the option of expanding in 30 minute intervals up to 4 hours.
72. *(2026-11-06)* and when you goto next episode it will stay at the same screen size, right?
73. *(2026-11-06)* last adjustment for now - on exit ask to backup setting with the check box to not ask again and in setting make this a slide bar option.
74. *(2026-11-06)* the buffer bar shows as complete but video still freezes - i don't think it is accurate
75. *(2026-11-06)* maybe 2 buffer lines in slightly different shading too
76. *(2026-11-06)* ok - first load of show in series frozen -restart - nothing until i drag the time bar anywhere
77. *(2026-11-06)* and if i track i track past to halfway through it stays frozen
78. *(2026-11-06)* and my internet connect bar is missing
79. *(2026-11-06)* the quality meter - how many bars
80. *(2026-11-06)* nevermind - bar came back - i am thinking it was a network hiccup -
81. *(2026-11-06)* may the 2 buffer bars 2 different colors overlapping - Blue light for One Yellow line for other and when they over it goes green
82. *(2026-11-06)* show me latest files
83. *(2026-11-06)* i noticed on previous build pause also stopped the buffer
84. *(2026-11-06)* this is under series
85. *(2026-11-06)* because sometimes the feed dies - not the software's fault. but it we detect a couple of freezes - a popup should be added on movies and series "I notices there may be a feed issue, would you like me to download and play when ready".
86. *(2026-11-06)* and even though i pause sometimes the buffer doesn't extend even though the signal is good.
87. *(2026-11-06)* how can something i completely downloaded have a buffering problem when i play it ?
88. *(2026-11-06)* can you make an in-app video player for download like vlc but it looks just like the other player
89. *(2026-11-06)* is there any reason why regular streaming would not work as well as a few version ago - this morning no problem, not streaming buffers and freezes. just asking but may be conincidence.
90. *(2026-11-06)* it seems to be better now - probably a network or file issue.
91. *(2026-11-07)* i noticed it takes a while even on auto to start shws - the intent was to buffer after the show started as much as possible unless there was an issue.  is this still the case.
92. *(2026-11-07)* it seams when it goes to direct streaming is when the problems may have started.
93. *(2026-11-07)* please add version in an about tab - just use current and keep updating as need - when you feel a major change, add a first numnber, when mods, add later - EXAMPLE. 1.0.0.1 is the first try, major is 2.0.0.1 - mods goto 1.0.0.2 or 1.0.2.0  something like that. Company is aobut is JTizzle Industries.
94. *(2026-11-07)* done ?
95. *(2026-11-07)* i don't see a restore option in that settings, i cannot clear recently watched, the scroll side bar doesn't seem to hold all the inventory so it is difficult to scroll down.
96. *(2026-11-07)* recently watch clear a single show is also needed .
97. *(2026-11-07)* in about you have data folder, why not backup folder too
98. *(2026-11-07)* much better however because there are so many option in movies and series the list hangs now when scrolling.
99. *(2026-11-07)* excellent - i would like to add a button under all 3 for adult content - Live Movies and Series - a check box to hide Adult - just a box with small x next to it. by default it is checked.
100. *(2026-11-07)* just by rating is fine - not name -
101. *(2026-11-07)* just FYI - since i expand all zips to a single folder - there are duplicate files - i copy 1, then 2 - i replace 3 files, then copy 3 and i replace 8 files.  Not sure if you wanted it that way but just FYI - no need to build another round because of that.
102. *(2026-11-11)* on recently watched you cannot remove a single file - and the clear all didn't work.
103. *(2026-11-11)* live, series, and movies
104. *(2026-11-11)* and the big red x for hide adult should be subtle - just an A and a check box next to it.  and checked by default
105. *(2026-11-11)* can you also not make that search bar disappear from all the locations - if it scroll down, they disappear. and to be clear you made the clear all and individual clear active on all 3
106. *(2026-11-12)* every thing is great - but buffer goes up to 30 nicely , then stops and goes to zero instead of increasing.
107. *(2026-11-12)* itll hang, then go back to 30 seconds - but slowly lose buffering until it hits 0 and pauses again - it'll take may 6 minutes.
108. *(2026-11-12)* if you are rebuilding - add color themes from the rainbow - and give up for the color pulse be able to import background list windows backgrounds
109. *(2026-11-12)* color pulse is that little glow so it isn't a straight color - this can be turned on or off
110. *(2026-11-12)* so does the buffer continue to buffer instead of quits ?
111. *(2026-11-12)* not understanding your information - will the buffer run out and the player freeze or continue to buffer until the end
112. *(2026-11-12)* Can you make all adult content goto bottom on all menus when sorted and also the type selection on the left after you choose series,  movie, or live
113. *(2026-11-12)* Perfect
114. *(2026-11-12)* how to i install it on my android ?
115. *(2026-11-12)* android phone
116. *(2026-11-12)* installed on adroid successful - but screen is blank
117. *(2026-11-12)* App loads on android and I can get to Playlist where is just hangs trying to connect.  Can you also add show password in there too.
118. *(2026-11-12)* Can you also add loading in the center so I know I clicked on the add button
119. *(2026-11-12)* Thanks might as well build all apps as well but still give me the app separate too as I am using my phone
120. *(2026-11-12)* Great. Where is the backup for Android and also can you allow for screen rotato as needed
121. *(2026-11-13)* latest - buffer seems to goto 32 seconds then slows again.
122. *(2026-11-13)* take about 6 minutes before buffer dies
123. *(2026-11-13)* just during this chat buffer when went from 30 o 15 seconds.
124. *(2026-11-13)* it refreshes and goes back to 30 seconds.
125. *(2026-11-13)* just froze, refreshed and now buffering up to 30 seconds again.
126. *(2026-11-13)* maybe we have option of it downloading the file and reading the download ? so it is actually reading from the disk instead of network. ? or do you think you can fix the buffer issue properly ? network is good and feed is solid when this happens
127. *(2026-11-13)* can i watch as it downloads ?
128. *(2026-11-13)* goto 7 minutes to be sage
129. *(2026-11-13)* safe
130. *(2026-11-13)* in download in i try to download all - it aborted except for the last one -can it queue in case only 1 download at a time is allowed. also can we play as we download ?
131. *(2026-11-13)* if it abort is understands to wait until another one completley downloads
132. *(2026-11-13)* to verify , you saw the error, right ?
133. *(2026-11-13)* did you see the buffer error during your testing
134. *(2026-11-13)* i think i found something - 6 minutes from an already downloaded file - not internet feeding - from my computer downloaded - same problem.
135. *(2026-11-13)* yellow line goes to the end great. 3 green stops and eventually the video catching up and refreshes and starts over again. 6 minutes give or take
136. *(2026-11-13)* 32 seconds give or take and eventually loses speed and dies
137. *(2026-11-13)* i want yellow line to goto the end at well
138. *(2026-11-13)* if it is abitrate issue can we add a option to what bitrate we want to use on the viewing app - and remember last used ?
139. *(2026-11-13)* an option for bitrate in the viewer might still be good to assit.
140. *(2026-11-13)* and you are added a bitrate toggle ?
141. *(2026-11-13)* adding?
142. *(2026-11-13)* also noticed - the Closed Captioning works to not match the audio
143. *(2026-11-13)* thank- you are still writing the files right ?
144. *(2026-11-13)* haven't tried the video yet. but in the downloads i tried to download 2, 1 aborted but after the queue was empty, it didn't start up again.
145. *(2026-11-13)* i would look in queue and automatically try to download anything not in queue or completed. there are buttons i could use to stop or pause so if that isn't overidden then all should perform as needed.
146. *(2026-11-13)* it should try from top in whatever order is chosen
147. *(2026-11-13)* seems to be a constant 2.4 seconds in player.  but hasn't frozen. this is really good but is there a way to expand that buffer
148. *(2026-11-13)* what would be fine - 2.4s or whatever guess into background is done. then change from 2.4s to FULL?
149. *(2026-11-13)* that is fine if it says 30s or FULL or if there is a real way to know the lead time.
150. *(2026-11-13)* show completed successfully - got a glitch when next show started- could've been the feed as the bar were really low - they are now green again so i will try another show advance to new episode and see if issue happens again.
151. *(2026-11-13)* it completely froze  - i had to stop and restart - but it did try to download.
152. *(2026-11-13)* and was downloading
153. *(2026-11-13)* perfect - it is a pleasure building this with you.  i have many fans of this app.  you are great.
154. *(2026-11-13)* can you also include a patch-fix history from the beginning
155. *(2026-11-13)* line item please
156. *(2026-11-13)* reverse order oldest to newest
157. *(2026-11-13)* thanks - please include for future
158. *(2026-11-14)* almost seems worse or the internet is cutting out - can you also provide a select and deselect all in download or other places i may need it.
159. *(2026-11-14)* also when i had to reboot the files in download even though were there i couldn't resume download. it was like the links were dead - i had to readd them and it is working now.
160. *(2026-11-14)* in the queue of downloads it is like they are switching off who gets to download rather than let 1 finish
161. *(2026-11-14)* My phone app shows 0.movies.  refresh says It downloaded
162. *(2026-11-14)* Yes refresh updates not clears and reissues
163. *(2026-11-14)* new apk - sent refresh - all selections blank - blue line on top like it is working - should that be happening for a few minutes as it is downloading the first time or is there an issue ?
164. *(2026-11-14)* Phone. Signal is aborted without reason error
165. *(2026-11-14)* New error failed to fetch
166. *(2026-11-14)* Phone
167. *(2026-11-14)* The phone's connection did not answer.
168. *(2026-11-14)* Server didn't not retur.n so erorr
169. *(2026-11-14)* Don't need to rebuild all until the phone app is right.
170. *(2026-11-14)* Where is it
171. *(2026-11-14)* [attachment, no text]
172. *(2026-11-14)* [image attached]
173. *(2026-11-14)* I can't get into settings on the app
174. *(2026-11-14)* Mobile data did not work.  Off network, and private dns is auto
175. *(2026-11-14)* I have a other iptv app that works
176. *(2026-11-14)* Just movies aren't working  shows and tv are fi ellme
177. *(2026-11-14)* Fine
178. *(2026-11-14)* No movies are not.  TV a s live is working g
179. *(2026-11-14)* [image attached] Tell me what else to checm
180. *(2026-11-14)* How do I force my phone to con ect.  Bypass watning
181. *(2026-11-14)* M3u not working either
182. *(2026-11-14)* How domi make the phone bypass that. Set exclusion
183. *(2026-11-14)* VPN none
184. *(2026-11-14)* Computer is fi e
185. *(2026-11-14)* Fine
186. *(2026-11-14)* Just pho e
187. *(2026-11-14)* Phone
188. *(2026-11-14)* On and on wifi
189. *(2026-11-14)* Off and on wifi
190. *(2026-11-14)* I s started over. Can   
   Put i.  Address now.  Earlier person s of app worked
191. *(2026-11-14)* As early as yesterday
192. *(2026-11-14)* Where is it?
193. *(2026-11-14)* Wifi worked and downloaded
194. *(2026-11-14)* Sorry not wifi, data
195. *(2026-11-14)* Yes. Movies now show up and I connected on mobile data.  Can we patch the app now and be sure the patches don't affect this.
196. *(2026-11-14)* Why would phone fail on same. Network computers are that succeeds
197. *(2026-11-14)* How do I change my phone dns
198. *(2026-11-14)* To work r8ght.
199. *(2026-11-14)* No
200. *(2026-11-15)* solved - Spectrum blocked something (only spectrum) - i talked with the company that supplied the iptv stream and they fixed something. now it works.  i do like that the phone shows download status at bottom.  that is great.  I think i am done now for updates.  you can post the latest downloads and we are current. i will comtinue to debug next week or through the holidays. i think we have a good product right now.
201. *(2026-11-15)* 1 thing i do see is the adult (porn) is showing in the middle of good movies or series - can you put all of that at the bottom (the channel listing, in the sort of movies, and series?
202. *(2026-11-15)* the adult filter isn't working - i think you may have it my title which doesn't work not sure of the "A" Checkbox - but i think that works.
203. *(2026-11-15)* remember XXX is also a series with Vin Diesel - a regular movie.
204. *(2026-11-15)* is there a way for me to mark - en masse - and categorize myself - i can create a custom cagetory ? or would that complicate refreshes ?
205. *(2026-11-15)* if you can allow me to check ones you missed - how about a modify button at the top and i can select which movies to move to bottom in your resort.  not creating a new category, sort of auto labelling to assist you .  as part of the backup you can add that so it remembers.
206. *(2026-11-20)* checked download - cannot select all to delete all if i wanted . i have only group them and select all for a season or group
207. *(2026-11-20)* my version is 1.0.0  - check version too - this new build make 3.1.4
208. *(2026-11-20)* give me newest version to build
209. *(2026-11-20)* installed the wrong version from the 13th not the 18th.
210. *(2026-11-21)* why does download say "play as is" versus "Ready for smooth playback"
211. *(2026-11-21)* also build me a user guide
212. *(2026-11-21)* cool - thanks - so far this is great
213. *(2026-11-21)* make an adobe document guide with search
214. *(2026-11-22)* in app download - things are sitting as aborted - latest version - we should have a queue all incomplete - all auto move all incomplete to top.  as something is downloading if a add another single download it overtakes instead of queueing - understand ?
215. *(2026-11-22)* sounds good - commence
216. *(2026-11-22)* remake all files when ready
217. *(2026-11-22)* been a while - restart everything and rebuild
218. *(2026-11-22)* have you done the update
219. *(2026-11-22)* C:\Users\Sparky\Downloads can  you view in downloads it is over the size limite
220. *(2026-11-22)* [attachment, no text]
221. *(2026-11-22)* how do i enable remote control
222. *(2026-11-22)* before completing - put a download option on the icon of the show in series and movies so you don't need to get into it to download.
223. *(2026-11-22)* next to favorite button
224. *(2026-11-22)* button right is fine
225. *(2026-11-22)* bottom right please- - your idea is better
226. *(2026-11-22)* Clone the repository JTMauro/MuchSmarter into this session.
227. *(2026-11-22)* i set it private .  all good
228. *(2026-11-22)* how do i allow git push
229. *(2026-11-22)* i am under muchsmarter git where is it
230. *(2026-11-22)* changed to accept edits
231. *(2026-11-22)* redisplay all downloads again
