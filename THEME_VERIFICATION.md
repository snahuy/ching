# Cambodian theme verification

The homepage remains the visual reference: warm ivory #fffdf3, deep indigo #141b4d, brick red #ac292e, the #b52d34 → #a0242b primary gradient, #7b1d22 button shadow, #bec2d6 secondary border, and #f9e3de supporting surface.

## Implementation

- src/theme.css centralizes interface tokens, shared primary/secondary buttons, inputs, tabs, selections, dialog surfaces, status colors, and woven krama details.
- Removed old purple interface colors from setup, avatar picker, multiplayer, Settings, instructions, gameplay, activity/reactions, and results CSS.
- Green reload/success, navy block controls, amber warnings, and dark red errors remain distinguishable.
- No character assets, character color configuration, rules, networking, translations, or animation timing were changed.
- Decorations paint within existing header/dialog/battle padding, without adding gameplay rows or covering controls.

## Rendered checks

- Inspected English and Khmer setup, avatar selection, Settings, instructions, game menu and desktop setup screenshots.
- Inspected multiplayer hub, create/join flow, lobby/invite/QR display, join error, and eight-player gameplay.
- Completed a real single-player game and inspected game-winner and match-winner announcements, updated scores, replay/home controls, reaction picker and bubbles.
- Single-player gameplay in both languages: 360×640, 375×667, 390×844, 440×956, 844×390 landscape, and 1440×900 desktop. All eight controls visible, touch targets at least 44px, no page scrolling or horizontal overflow.
- Eight-player multiplayer in both languages: 360×640, 390×844, 440×956, 844×390 and 1440×900. All eight controls visible, seven opponents available in the internal selector, no page scrolling.
- Unknown room validation remains functional with a distinct dark-red error message.
- 423 tests passed; production build passed. Screenshots are saved locally under ignored .verification/.
