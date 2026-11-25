# Cydcor 3D Wallpaper

The Cydcor C in light azure, rendered as one solid 3D piece with soft shadows, turning slowly on a gray/black background. No orbit ring.

Everything comes in two versions. Pick the folder for the direction you want:

- **`Rotate-Right/`**: the logo turns to the right (front moves left → right)
- **`Rotate-Left/`**: the logo turns to the left (front moves right → left)

## What's in each folder

| Folder / file | Use it for |
|---|---|
| `Desktop-JPG/` | Still images: Windows 1080p, 1440p, 4K, Surface 3:2; Mac 5K, MacBook Pro 16", MacBook Pro 14" |
| `Phone-JPG/` | Still images: iPhone (1290×2796), Android (1440×3120) |
| `Live-Wallpaper/Cydcor-3D-Wallpaper-*.html` | The live 3D animation. Double-click to view; works offline |
| `Windows-Lively/Cydcor-3D-*-Lively.zip` | The live 3D animation packaged for Lively Wallpaper (Windows) |
| `Video/Cydcor-*-Desktop-1080p.mp4` | 24-second seamless loop, 1920×1080 |
| `Video/Cydcor-*-Phone-15s.mp4` | 15-second seamless loop, vertical 1080×2340, for phones |
| `GIF/Cydcor-3D-*-1080p.gif` / `-720p.gif` | Animated GIF, 24-second seamless loop |
| `GIF/Cydcor-GIF-Viewer.html` | Double-click to play the GIF full screen |

## Live HTML controls

Double-click the HTML file, then move the mouse. A control bar appears at the bottom:
- **Turning: Right / Left** button (or press **D**, or **←** / **→**)
- **Logo size** slider (or **+** / **−**)

It fades out after 3 seconds. Add `?size=50` (any 10–95) or `?period=40` (seconds per turn) to the end of the file address to change the defaults.

## Windows 11

**Lock screen** (Windows only allows still images here)
Settings → Personalization → Lock screen → Picture → Browse photos → pick `Desktop-JPG/…Windows-4K-3840x2160.jpg`.

**Desktop, still**
Settings → Personalization → Background → Picture → Browse photos.

**Desktop, animated**
1. Install **Lively Wallpaper** (free, Microsoft Store).
2. Drag `Windows-Lively/Cydcor-3D-Right-Lively.zip` (or Left) into Lively.
3. To change direction, size or speed: right-click the tile → **Customize**.
   You can also add the MP4 or GIF to Lively instead.

**Screensaver**
1. In Lively, open **Settings** and turn on the **Screensaver** option (wording varies by version). It plays the current Lively wallpaper.
2. Windows Settings → Personalization → Lock screen → **Screen saver** → set the wait time, and tick **On resume, display logon screen** to lock afterwards.

Windows can't animate a GIF by itself: Settings → Background and the built-in screensavers show only its first frame. Use Lively for animation.

## Mac

**Desktop and lock screen, still**
System Settings → Wallpaper → **Add Photo…** → pick the Mac JPG for your screen. The lock screen uses it automatically.

**Desktop, animated**
Install **Plash** (free, Mac App Store) → Add Website → choose the local file `Live-Wallpaper/Cydcor-3D-Wallpaper-Right.html` (or Left). Or use a video-wallpaper app with the 1080p MP4.

**Screensaver**
1. Install **WebViewScreenSaver** (free): `brew install --cask webviewscreensaver`, or download it from its GitHub releases page.
2. System Settings → Screen Saver → **WebViewScreenSaver** → **Options…**
3. Add the address `file:///Users/<you>/<folder>/Rotate-Right/Live-Wallpaper/Cydcor-3D-Wallpaper-Right.html?controls=0`.

## iPhone

**Still:** Settings → Wallpaper → Add New Wallpaper → Photos → pick `Phone-JPG/…iPhone-1290x2796.jpg`.

**Animated:** iOS doesn't accept video wallpapers directly.
1. Save `Video/…Phone-15s.mp4` to Photos.
2. Turn it into a Live Photo with a free app such as **intoLive**.
3. Settings → Wallpaper → Add New Wallpaper → Photos → pick the Live Photo with **Live Photo** turned on.
iOS plays a Live Photo wallpaper for a few seconds when you wake the phone; it can't loop non-stop.

## Android

**Still:** long-press the home screen → Wallpaper & style → pick `Phone-JPG/…Android-1440x3120.jpg`.

**Animated:**
- **Samsung Galaxy:** open `Video/…Phone-15s.mp4` in Gallery → ⋮ → **Set as wallpaper** → Lock screen. Samsung allows videos up to 15 seconds, so this loop is exactly 15.
- **Pixel and other phones:** install a free video live wallpaper app from the Play Store and choose the phone MP4.
