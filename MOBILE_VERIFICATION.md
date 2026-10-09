# Mobile gameplay verification

The gameplay shell uses a compact header, flexible arena, and an eight-move grid in normal document layout. Help, language, sound, reduced motion, round history, and multiplayer standings open optional sheets. The target rail scrolls independently of the page.

## Rendered browser checks

Checked English and Khmer single-player and eight-player multiplayer at:

- 360 × 640
- 375 × 667
- 390 × 844
- 440 × 956
- 667 × 375 landscape
- 844 × 390 landscape

All 24 mode/language/viewport combinations have no horizontal or vertical page scrolling at normal text size. Every move is fully inside the viewport with a touch target greater than 44 × 44 pixels. Button coordinates remain identical through choosing, waiting for players, countdown, reveal, reaction, and subsequent round results. An actual game-winning attack also preserves the panel position through the score intermission.

A real eight-player server room was exercised with eight connected human clients. A separate room with one human and seven bots was also checked. Every move was selected with sufficient ammo, the last opponent was selected from the horizontal rail, and all eight standings appeared in the overlay. A targeted Ching attack produced an animated arrow toward its selected defender, eliminated the incorrectly blocking defender, awarded one game win, and appeared with its target and block in round history.

At 150% and 200% root text sizes, the interface switches to a scrollable accessibility layout: characters remain visible, move contents fit, and there is no horizontal page overflow. Changing viewport height from 570 to 844 pixels adjusts the gameplay shell and keeps its controls visible, simulating changing browser bars. These are rendered browser checks; actual device browser chrome was not available.

Screenshots were generated and visually inspected at the requested portrait widths and landscape sizes. The local `.verification` directory contains the screenshots and `battle-audit.json` with the per-scenario visibility, page-scroll, and phase-position assertions.

## Regression checks

The existing rules, AI, server timer, targeting, scoring, reconnection, avatar, saved preference, and localization suites remain in place. Run `npm test` and `npm run build` to repeat the checks.
