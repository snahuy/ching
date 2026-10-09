# Shared typography verification

The app now loads typography.css last. It centralizes the Source Sans 3/Battambang stack, heading/body/control leading, natural wrapping, Khmer tracking rules, text padding, and scrollable dialog behavior. The browser loaded both intended families. Latin content uses Source Sans 3; Khmer glyphs shape with Battambang. Unicode strings remain intact; no character splitting or inserted spaces were used.

Causes corrected:
- Conflicting home heading metrics reduced Khmer leading to 1.4; the authoritative Khmer heading leading is now 1.8, with responsive font sizes and separate decorative marks.
- Fixed/clamped result and opponent text was ellipsized or cut off. Revealed labels grow; activity text wraps and remains available in independently scrolling result/feed areas.
- A sticky setup dock covered difficulty and validation text. Setup actions now stay in document flow.
- Narrow avatar dialogs squeezed color controls and text; preview/collection stack, headers and action rows wrap, and dialog content scrolls naturally.
- Opponent selector flex rules stretched avatar spans and crowded the arena. Avatar dimensions stay fixed while text wraps.

Reviewed Home, Settings, How to Play, character dialog/rail, name validation, difficulty and match/custom settings, multiplayer create/lobby, eight-player matches, reaction picker/bubbles, action labels, activity feed, game winner and final match dialog. English and Khmer home/gameplay screenshots cover 320×640, 375×667, 390×844, 440×956, and 1280×800. Home and gameplay document dimensions matched viewport dimensions at standard text sizes; all move controls remained within the viewport. 24px root text enabled scrolling on Home/gameplay without horizontal overflow. Long nicknames and translated multiline labels were included.

Screenshots are saved in .verification (ignored by Git). All 416 tests in 16 suites passed; production build passed. Game rules, scoring, timers, character cycling, and translations were preserved.
## Stable Settings language switching
Settings now measures both complete translations inside shared grid text slots. Only the active translation is accessible; the hidden measurements reserve natural wrapping space. Matching 1.8 line heights and equal language-control columns keep header, gear, labels, buttons, notices, and footer geometry stable.

Compared every heading/control/header gear/footer bounding box in English and Khmer at 320×640, 375×667, 390×844, 440×956, 1032×1376, and 1440×900, with 16px and 24px root sizes. All comparisons were identical: maximum position/size delta 0px. Screenshots are in .verification/settings-stable-*.png.
