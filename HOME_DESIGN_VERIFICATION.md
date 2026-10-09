# Home layout and language verification

The reference screenshot asset was removed entirely. The CHING wordmark is a native SVG; the backdrop is a text-free SVG; two independent transparent SVG character rigs reuse local head assets and articulated limbs. Home-only casual clothing includes a krama detail. The rigs cycle through ready, reload, Ching, and Block 1 without changing game state. Reduced motion stops the cycle and idle animation.

All home headings, descriptions, buttons, help, accessibility labels, and footer text use the centralized English/Khmer language catalogs. Settings language switches update immediately and persist after reload. APP_VERSION remains sourced from package metadata (1.0.2).

Rendered and inspected both languages at 360×640, 375×667, 390×844, 440×956, 667×375 landscape, and 1280×800 desktop. Document height and width matched each viewport. Both play buttons, Settings, help, and version remained visible; touch controls were at least 44px tall. No reference image or embedded text/button artwork remains. Screenshots are in .verification (ignored by Git).

Verified Single Player → Setup → Game and Multiplayer → Create/Join controls, Settings return, language persistence, reload/attack/block poses, and reduced-motion static ready poses. Enlarged accessibility text retains the existing scrolling fallback.

Validation: all 416 tests in 16 suites passed; production build passed. Game rules, server, scoring, timers, and match behavior are unchanged; the optional casual costume defaults off for gameplay characters.
## Cambodian theme
The home now uses warm ivory, indigo, and brick red. A separate local, text-free independence-monument.svg stays fixed behind the cycling character layers and is included in asset preloading. Krama details appear on the casual scarf/headband and bottom border. Match styles and rules are unchanged.

Inspected English/Khmer screenshots at 360×640, 390×844, 440×956, and 667×375. Page dimensions matched the viewport; How to Play and the 1.0.2 footer remained visible. Monument and button geometry remained identical across a five-second scene transition. Single Player setup and Multiplayer create/join navigation passed.

## Character tap interaction
Each foreground character has a native button with a localized accessible name and visible keyboard focus. A short Reload, Ching, or Block 1 gesture changes only that character. The other character's animation is paused during the gesture. Web Audio cues respect the shared Sound preference. A ref guard rejects repeated taps immediately; pending crossfades finish before the gesture starts. Cycling stops during interaction and gets a fresh five-second timer after the 850ms gesture. Reduced motion shows a static pose and returns to the static home scene.

Browser verification covered all three poses, rapid same-turn taps (one sound/gesture), Enter/Space, Khmer labels, muted sound, reduced motion, timer restart, and tapping during a crossfade. Button geometry was identical before/after; the monument stayed fixed. Screenshots are in .verification. All 416 tests and the production build passed.
