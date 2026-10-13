# Changelog

## 1.0.5 — Internet multiplayer backend integration

- Added a configurable hosted WebSocket endpoint for the Vercel frontend.
- Added durable PostgreSQL room storage, serialized commits, and ownership checks to prevent conflicting deployment writes.
- Added Render Free deployment configuration and Neon database setup instructions.
- Preserved authoritative move validation, hidden opponent moves, shared deadlines, bots, scoring, and rematches.
- Improved guest identity persistence, refresh recovery, tab takeover, and Khmer/English connection messages.
- Added durability, asynchronous commit, and endpoint tests; retained the local SQLite storage option.
- Preserved the existing theme, avatars, navigation, and single-player gameplay.

Verification: 430 tests passed; one hosted PostgreSQL integration test requires a disposable database and was skipped. The production build passed. Internet multiplayer still requires Render/Neon setup, Vercel endpoint configuration, and deployed testing.

## 1.0.4 — Official app icon added

- Added the official Ching app icon for iPhone, iPad, Android, and desktop browsers.
- Added browser favicons and Android maskable icons generated from the original artwork.
- Added standalone PWA installation metadata with the existing navy and cream colors.
- Preserved existing page layouts, artwork, and gameplay; no offline caching was introduced.
## 1.0.3 — Single Player setup updates

Updated Single Player setup with responsive phone and tablet spacing, aligned match settings, and headers matching the Home theme.

### Single Player buttons and icons

- Added independent Change character and Change opponent buttons with themed character pickers.
- Added selected player and bot circular avatar icons beside their labels and names.
- Added a centered How to play button opening the setup guide.
- Updated the Start Game button size and bottom spacing.
- Made change-character buttons more compact.
- Removed the Timer & scoring rules button and the Bot difficulty info icon.
