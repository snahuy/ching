# Reactions and activity verification

Implemented in the existing React/TypeScript app and authoritative WebSocket room server. No game rules or timing settings changed.

- `npm run build`: passed.
- `npm test`: 395 tests passed across 13 suites. Coverage includes all nine presets, exact three-second boundaries, retry deduplication, independent sender cooldowns, server membership/request validation, stale match rejection, reconnect preservation, reveal privacy, target/elimination events, zero-point draws, scoring/champion event uniqueness, bot reveal-only decisions, occasional reactions, bot cooldown and final good-game scheduling, localization and existing gameplay tests.
- Inspected rendered screenshots at 360×640, 375×667, 390×844, 440×956 and 667×375 landscape, in English and Khmer, for solo and eight-player private rooms. All eight move targets were at least 44×44 and fully inside the viewport; document height equaled viewport height and there was no horizontal overflow. The compact activity strip occupies the existing reserved result space.
- Real WebSocket room: seven guests received the host reaction with one stable event ID. A revealed Ching target and elimination appeared only after countdown; the feed retained earlier rounds. A reconnecting guest viewed English while the host viewed Khmer, with unchanged nicknames and identical event data.
- Reaction mute removed bubbles but retained reactions and gameplay results in Activity. A reaction from an opponent outside the main character preview also appeared beside that opponent's avatar in the target rail.
- Solo match: recorded both reloads, Ching against Bot, elimination, game winner with 1–0 score, champion and Bot's good-game reaction. The Activity sheet remained available over the match results screen.
- Screenshots are saved under `.verification/activity-*.png`; representative files include `activity-solo-360.png`, `activity-room-km-360x640.png`, `activity-room-en-667x375.png`, `activity-room-km-feed.png`, `activity-room-revealed-attack.png`, and `activity-solo-winner.png`.

The presets are localized centrally in `src/i18n/en.json` and `src/i18n/km.json`. Khmer reaction terminology is flagged for native-speaker review in `TRANSLATION_REVIEW.md`. Tests and browser checks verify rendering and catalog completeness, not linguistic review.

Launch: `npm install` (if needed), then `npm run dev`, and open http://localhost:5173. Use the smile button to react and Activity to open the complete feed.
