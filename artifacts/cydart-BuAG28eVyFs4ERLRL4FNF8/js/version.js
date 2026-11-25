/* CydArt version + changelog. Bump VERSION and add a CHANGELOG entry with every release. */
window.CP = window.CP || {};
CP.VERSION = '2.1.0';
CP.BUILD_DATE = '2026-11-12';
CP.CHANGELOG = [
  {
    version: '2.1.0',
    date: '2026-11-12',
    notes: [
      'New Converter: drop in any mix of photos, videos and music and convert them all at once, with resize options. ZIP or separate files.',
      'Video export and conversion to 33 formats: MP4 (H.264, H.265/HEVC, AV1 on desktop), WebM, MOV, M4V, MKV, AVI, WMV, MPEG-2, TS, M2TS, 3GP, FLV, OGV, ProRes, DNxHR, FFV1 lossless, Motion JPEG, GIF, animated WebP, APNG, and audio as MP3, M4A, AAC, WAV, FLAC, ALAC, OGG, Opus, AIFF, WMA and AC-3.',
      'Video editor: crop each clip (sliders and aspect presets), mark a scene with In/Out (I and O keys), and export just that scene or just the selected clip.',
      'Screenshot any frame and save it in any photo format, including HEIC on desktop.',
      'Export a video as an image sequence (every frame, or a few per second) in any photo format.',
      'Opens even more files: more camera RAW and camcorder formats, OGM, WTV, RealMedia, and audio such as FLAC, ALAC, APE and WavPack.',
      'Both apps can also be the default app for music and audio files.',
    ],
  },
  {
    version: '2.0.0',
    date: '2026-11-11',
    notes: [
      'CydPhoto is now CydArt. Your Library and settings carry over, and the installer replaces CydPhoto.',
      'New Video tab: play any video (MP4, MOV, MKV, AVI, WMV, WebM, MPEG, 3GP, FLV and more).',
      'Video editor: timeline with Main, Overlay, Titles and Music tracks; trim, split, reorder, duplicate, undo.',
      'Transitions (crossfade, fade through black, flash, wipes, slide, push, zoom, circle, blur, spin), speed and slow-mo, fades and volume.',
      'Color looks and adjustments, Ken Burns zoom, picture-in-picture, green screen, animated titles in 7 styles.',
      'Freeze frame, and send any frame to the Photo editor.',
      'Export MP4 or WebM up to 4K, plus MOV, MKV, AVI, WMV, GIF, MP3, WAV and M4A. Save and reopen projects.',
      'Photo Library keeps and plays videos. Cydni holds a clapperboard on the Video tab.',
      'CydArt and CydArt Lite can be the default app for videos as well as photos.',
    ],
  },
  {
    version: '1.2.1',
    date: '2026-11-11',
    notes: [
      'Installer: check boxes to install CydArt, CydArt Lite, or both. Run it again to add or remove one.',
      'Signed build: picks a certificate that can sign, tests signing first, and signs in an administrator window when Windows requires it.',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-11-11',
    notes: [
      'Windows desktop app with a one-click signed build (BUILD CYDART.cmd) and a Cydcor-signed installer.',
      'The installer registers CydArt and CydArt Lite with Open with and Windows Default apps.',
      'Saves true HEIC (the iPhone format) in the desktop app.',
      'Works fully offline: all libraries are bundled.',
      'Double-clicking more photos while CydArt is open sends them to the open window.',
    ],
  },
  {
    version: '1.1.1',
    date: '2026-11-11',
    notes: [
      'CydArt and CydArt Lite now install as two separate apps, and each can be set as a default photo app.',
      'About menu links to CydArt Lite when both are hosted together.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-11-11',
    notes: [
      'After the intro, Cydni shrinks into the upper-left with the title, giving Home more room.',
      'New paintbrush for Cydni on the Draw tab.',
      'New companion app: CydArt Lite, a fast viewer-only version (lite.html).',
      'Photos opened in CydArt Lite can be sent to the full editor.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-11-11',
    notes: [
      'First release of CydArt.',
      'Cydni intro and 3D title screen with Photo and Draw starting points.',
      'Layered editor: brushes, pencil, eraser, clone, smudge, blur, dodge/burn, fill, gradient, shapes, text, selections, magic wand, crop, free transform.',
      'Adjustments: levels, curves, hue/saturation, exposure, vibrance, temperature and more, with live preview.',
      'Filters and one-click photo looks.',
      'Opens 270+ formats including HEIC/HEIF, camera RAW, TIFF, PSD (with layers), AVIF, JPEG XL.',
      'Saves PNG, JPEG, WebP, AVIF, HEIF (AV1), TIFF, layered PSD, GIF, BMP, ICO, JPEG XL, JPEG 2000, TGA, PDF, SVG and more.',
      'Photo Library with albums, favorites, ratings, tags, search, slideshow, batch convert.',
      'Installable app that can open image files from your computer.',
      'About menu with version history and Check for updates.',
    ],
  },
];

/* CydArt Lite (viewer only) has its own version + changelog. */
CP.LITE_VERSION = '2.1.0';
CP.LITE_BUILD_DATE = '2026-11-12';
CP.LITE_CHANGELOG = [
  {
    version: '2.1.0',
    date: '2026-11-12',
    notes: ['Converter for photos, videos and music (Convert button).', 'Save a video frame as any picture format.', 'Opens more photo, video and audio formats, and can be the default music player.'],
  },
  {
    version: '2.0.0',
    date: '2026-11-11',
    notes: ['CydPhoto Lite is now CydArt Lite.', 'Plays videos too: MP4, MOV, MKV, AVI, WMV, WebM and more, with speed, loop, A-B repeat, frame stepping, snapshots and picture in picture.', 'Can be the default app for videos as well as photos.'],
  },
  {
    version: '1.1.0',
    date: '2026-11-11',
    notes: ['Windows desktop version (CydArtLite.exe), installed with CydArt and registered as a default photo viewer.', 'Save a copy as true HEIC in the desktop app.', 'Works fully offline.'],
  },
  {
    version: '1.0.1',
    date: '2026-11-11',
    notes: ['Lite now lives in its own folder (lite/) so it installs as its own app and can be your default photo viewer alongside CydArt.'],
  },
  {
    version: '1.0.0',
    date: '2026-11-11',
    notes: [
      'First release of CydArt Lite: a fast, viewer-only CydArt.',
      'Opens the same 270+ formats as CydArt, including HEIC/HEIF, camera RAW, TIFF and PSD.',
      'Grid and full-screen views, zoom and pan, rotate and flip, slideshow, filmstrip, camera info.',
      'Save a copy in another format, copy to clipboard.',
      'Installable on its own and can be set as your default photo viewer.',
    ],
  },
];
