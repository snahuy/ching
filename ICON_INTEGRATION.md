# Official logo and installation integration

The official, user-provided 1254×1254 source is preserved byte-for-byte at `public/branding/ching-official.png`. No characters, colors, monument, lettering, or patterns were redrawn. The source already contains a rounded contour and black corners; these are intentionally retained. No additional rounding is applied.

## Modified files

- `index.html`: favicon, Apple touch icon, manifest, navy browser theme, application name, and standalone Apple metadata.
- `public/site.webmanifest`: Ching identity, `/` start URL and scope, standalone mode, cream background, and normal/maskable icons.
- `scripts/generate_icons.py`: reproducible Pillow resizing from the official source.
- `public/branding/ching-official.png`: original artwork.
- Generated icons in `public/`: favicon ICO (16/32/48), PNG favicons (16/32/48), Apple touch PNGs (180/152/167), Android PNGs (192/512), and maskable PNGs (192/512).

Maskable images contain the complete source centered at 55% scale on the existing cream color, fitting inside the guaranteed 40%-radius safe circle. This padding is only for maskable images; ordinary and Apple icons use the complete source edge to edge. No SVG tracing was introduced.

## Installation behavior

The app had no previous manifest, service worker, or native iOS/Android wrapper. This adds browser installation metadata; it does not add caching, fetch interception, offline support, install banners, or changes to existing page branding. HTTPS is supplied by the existing Vercel deployment. Vite copies public assets to the root of `dist`; the manifest and icon paths target that root. Room invite query strings remain within the `/` scope.

References: [Apple Safari web application configuration](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html), [Web app manifest and maskable safe area](https://web.dev/learn/pwa/web-app-manifest), [Chrome menu installation without a fetch service worker](https://developer.chrome.com/blog/update-install-criteria).

## Manual checks after deployment

- Fetch `/site.webmanifest`, every listed icon, and Apple touch icons on the actual Vercel HTTPS URL.
- iPhone/iPad Safari: Share → Add to Home Screen; verify icon, app name, and standalone launch.
- Android Chrome/Samsung Internet/Edge: use Install/Add to Home Screen; verify launcher masks and standalone launch.
- Desktop Chrome/Edge and Safari: verify favicon, bookmarks, and available install controls. Browser support and install promotion differ; no automatic installation prompt is guaranteed.
- Verify private-room networking in an installed app. It still requires the existing live server and internet connection.
- Remove and reinstall an older home-screen shortcut if its OS-cached icon does not update.

The detailed supplied artwork cannot retain all visual detail at 16 pixels. It is downsampled without substituting a redesigned mark.

## Local validation completed

Production build passed. All 11 configured icon URLs returned HTTP 200 with image MIME types from the built preview. PNG and ICO sizes were checked, original SHA-256 matched the supplied file, and Chromium parsed the manifest without errors. Home and Single Player still opened with existing artwork and layout. Physical installation and the deployed Vercel hostname have not been tested.
