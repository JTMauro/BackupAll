/* CydPhoto version + changelog. Bump VERSION and add a CHANGELOG entry with every release. */
window.CP = window.CP || {};
CP.VERSION = '1.1.1';
CP.BUILD_DATE = '2026-11-11';
CP.CHANGELOG = [
  {
    version: '1.1.1',
    date: '2026-11-11',
    notes: [
      'CydPhoto and CydPhoto Lite now install as two separate apps, and each can be set as a default photo app.',
      'About menu links to CydPhoto Lite when both are hosted together.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-11-11',
    notes: [
      'After the intro, Cydni shrinks into the upper-left with the title, giving Home more room.',
      'New paintbrush for Cydni on the Draw tab.',
      'New companion app: CydPhoto Lite, a fast viewer-only version (lite.html).',
      'Photos opened in CydPhoto Lite can be sent to the full editor.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-11-11',
    notes: [
      'First release of CydPhoto.',
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

/* CydPhoto Lite (viewer only) has its own version + changelog. */
CP.LITE_VERSION = '1.0.1';
CP.LITE_BUILD_DATE = '2026-11-11';
CP.LITE_CHANGELOG = [
  {
    version: '1.0.1',
    date: '2026-11-11',
    notes: ['Lite now lives in its own folder (lite/) so it installs as its own app and can be your default photo viewer alongside CydPhoto.'],
  },
  {
    version: '1.0.0',
    date: '2026-11-11',
    notes: [
      'First release of CydPhoto Lite: a fast, viewer-only CydPhoto.',
      'Opens the same 270+ formats as CydPhoto, including HEIC/HEIF, camera RAW, TIFF and PSD.',
      'Grid and full-screen views, zoom and pan, rotate and flip, slideshow, filmstrip, camera info.',
      'Save a copy in another format, copy to clipboard.',
      'Installable on its own and can be set as your default photo viewer.',
    ],
  },
];
