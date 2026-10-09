# Move labels and round result verification

- Build passed. All 405 tests passed across 14 suites, including event-based presentation tests for reloads, blocked attacks, equal attacks, attack strength, hits during reloading, surviving-player detection, simultaneous draws, and game scores.
- Solo browser checks showed `Reload (+1 ammo)`, `Block 1` versus `Ching`, equal Ching attacks, and `Dara wins! Ching hit Bot while reloading.` Game completion prominently showed `Game 1 winner: Dara!` and the updated 1–0 score.
- Real eight-player WebSocket room: labels and targets were absent before reveal; then both main characters and all seven opponent selectors displayed revealed moves. Verified Ching targeting Guest 1 against Block 1, reciprocal Ching cancellation, elimination of Dara while reloading with all seven survivors named, and cyclic attacks eliminating everyone simultaneously. The draw awarded no points.
- English and Khmer mobile layouts checked at 360×640, 375×667, 390×844, 440×956 and 667×375 landscape. Solo also checked at 1280×800. After viewport resize settled, all eight buttons stayed inside the viewport with at least 44×44 touch targets, no horizontal overflow, and no vertical page scrolling. Labels sit above the main characters, in a reserved row, separately from reaction bubbles. Controls do not shift during reveals or results.
- Solo reveal reading period is 2.3 seconds for continuing rounds and 2.5 seconds for game-ending rounds; server multiplayer reveal period is 2.5 seconds. Timers remain paused during these phases. Reduced motion keeps the reading period.
- Activity retains revealed actions, attack targets, resolved outcomes, eliminations, survivors, game winners/draws and scores, localized per viewer from structured event data.
- Rendered screenshots inspected under `.verification/round-*.png`, including `round-reload-360.png`, `round-solo-blocked-360.png`, `round-game-winner-360.png`, `round-room-blocked-360.png`, `round-room-draw-360.png`, `round-room-game-draw-360.png`, `round-room-elimination-km.png`, and both languages' mobile/landscape captures.

Launch remains `npm run dev`, then http://localhost:5173.

## Centered single-player game winner (2026-10-09)

- Added a centered arena announcement for You win / Bot wins / Draw with resolved winner avatar/name, short attack explanation and updated score. Victory and defeat states remain active behind the announcement. No-point rounds continue with their existing result strip and no winner card.
- The existing 2500 ms intermission now visibly holds the game result. Final games hold the same announcement before the match screen appears with You win the match / Bot wins the match and Replay/Home controls. Replay preserves settings and clears scores.
- Fake-clock browser checks verified bot victory at 2499 ms still showed the card, retained final ammo and paused the timer; at 2500 ms it switched to the final match screen. Draws displayed both avatars and 0–0, stayed visible at 2499 ms, then advanced to Game 2 without awarding points. Player victories advanced to Game 2 with ammo reset only after the announcement, one retained point, and unchanged move-button coordinates.
- English/Khmer snapshots inspected at 360×640, 375×667, 390×844, 440×956 and 667×375 landscape. Cards stayed inside the arena; all eight controls stayed visible and document height equaled viewport height. Screenshots: `.verification/winner-player-360.png`, `winner-bot-360.png`, `winner-draw-360.png`, `winner-bot-match.png`, and `winner-{en,km}-{width}x{height}.png`.
- `npm run build` passed. `npm test` passed: 412 tests in 15 suites, including winner identity/avatar, Khmer rendering, exact-once player/bot scoring, preserved final ammo, and rejection of scoring blocked/canceled move rounds.
