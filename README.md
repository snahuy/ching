# Ching

A responsive single-player and private multiplayer browser game based on the Cambodian schoolyard hand game. Built with React, TypeScript, and Vite, with original SVG gesture illustrations and optional synthesized sound. Local traditions vary; this implementation follows the supplied rules.

## Launch

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run dev
```

This starts both the authoritative room server (port 3001) and Vite (port 5173). Open the localhost URL printed by Vite (normally http://localhost:5173). For a phone on the same network, use your computer’s local IP with port 5173; your firewall must allow that connection.

```sh
npm test       # rules, AI, rooms, and real WebSocket integration tests
npm run build # TypeScript checks and production bundle
npm start     # serve the production bundle and multiplayer at http://localhost:3001
```

## Play

Pick a bot difficulty, move-round timer, and match win target, then press Let’s play. You both start at zero គ្រាប់ (ammo). Reload to gain ammo, attack to spend it, or choose a free block. Your choice locks immediately, followed by three quick clap beats and a simultaneous reveal. The next round opens automatically. Successful attacks end a game; equal attacks cancel by default. A move round is one simultaneous choice, a game continues until a winner or draw, and a match continues until someone reaches the selected number of game wins.

- Ching costs 1; Swing costs 2; Klarteang costs 3; Seuteang costs 5.
- Block 1 stops Ching and Swing; Block 2 stops Klarteang; Block 3 stops Seuteang.
- Stronger attacks beat weaker attacks. Reload loses to an attack.
- All ammo changes apply simultaneously, including losing reloads and attacks on the final round.
- Sound starts muted. Use the music button to toggle it. Reduced motion defaults to your system preference and can be toggled in the footer.
- Open How to Play on the start screen to configure equal-attack outcomes, blocks stopping weaker attacks, and whether failed attacks spend ammo. Settings are fixed for the duration of a match.

## Avatars

Use My avatar in the header or Change on your lobby profile to open the picker. All 24 original avatars are unlocked, with category filters, a larger preview, Random Avatar, and eight background colors. Save with Use [name]; Cancel discards edits. Your choice persists in local storage on this device. If browser storage is unavailable, it still works for the current session. There are no signed-in accounts or leaderboard in this version.

Your avatar appears in the lobby, match panels, and results. Each match assigns the AI an avatar from the same collection, different from yours at match start. Tab reaches the avatar grid; arrow keys, Home, and End navigate, and Enter or Space selects. Escape closes the picker. Category and color buttons also support standard keyboard navigation.

Artwork lives in `public/avatars/*.svg`, with no external image dependencies. The original drawing source is `scripts/create-avatars.mjs`; regenerate with `node scripts/create-avatars.mjs`. Profile validation and storage tests live in `src/avatars.test.ts`.

## Playable characters

All 24 avatars have matching full-body characters, using their exact original face artwork, matching colors, outfits, and accessories. Character head assets in `public/characters/heads/` are generated from the same drawing source as the profile icons. `src/characterDesigns.ts` defines the costumes, and `src/Character.tsx` draws their body details and a shared articulated arm rig. Player and AI characters face inward with mirrored poses.

The picker shows the full character and includes Try an animation for ready, clap, reload, all four attacks, all three blocks, successful block, hit, victory, and defeat. Selecting and saving an avatar immediately selects its matching gameplay character.

`src/characterState.ts` maps completed round outcomes to animation states. Both characters clap before revealing together, spend 420ms showing their moves, then react to the result. Successful defenders brace; losing characters recoil before defeat. Winners celebrate in the arena and result screen. Shared rig dimensions and round timing keep all cosmetics equivalent. Reduced motion shows clear static poses with no bobbing, clapping motion, lunges, or impact flashes. Both characters fit the phone arena.

## Code structure

- `src/rules.ts`: pure rules engine; central move costs, strengths, block mappings, descriptions, and default rules.
- `src/ai.ts`: weighted legal-move selection. Easy is mostly random; Normal weighs ammo; Hard also weighs the previous eight rounds. All retain randomness.
- `src/main.tsx`: round lifecycle. AI is chosen and stored when a round opens, before any player submission. The AI receives only starting ammo and completed history, never the pending player move.
- `src/Gesture.tsx`: vector characters and move-specific gesture illustrations.
- `src/Character.tsx`: selected full-body playable characters with shared joint animations; `src/characterState.test.ts` verifies hidden choices, simultaneous reveals, and outcome reactions across all 64 pairings.
- `src/rules.test.ts`: independent 64-pair outcome matrix, ammo boundaries, final-round simultaneous changes, rule variants, and AI legality/habit adaptation.

Single-player runs in the browser. Multiplayer requires the included Node server; no accounts, third-party services, or API keys are needed. English and Khmer fonts are bundled locally, so the interface does not wait for external font services.

## Private multiplayer

Choose Private room, enter a nickname, choose your character, and create a room. Share the six-character room code, invite link, or QR code. Guests can join without an account. Every human must be ready before the host starts; rooms support 2–8 players including bots. One human can play with bots. Arrivals during a match spectate all remaining games and join the next match lobby.

Select a move and, for attacks, one other active player. Change your target freely until Lock my move. Choices stay hidden until everyone locks. All legal attacks resolve simultaneously, even from players eliminated that round. Matching blocks stop all covered incoming attacks. Reciprocal attacks compare strengths; equal attacks cancel. Attacking provides no protection from other players. One successful hit eliminates a defender. Ammo changes apply once, including final-round changes. Eliminated players spectate; the last survivor wins, or simultaneous elimination of everyone is a draw. Placements group eliminations from the same move round. Each game winner earns exactly 1 point; draws award none. After a 2.5-second intermission, the next game revives eligible participants with zero ammo and preserves scores. The match ends when someone reaches the win target. The host’s Rematch returns everyone to the lobby with scores reset, retaining players, bots, and settings.

Reloading the tab reconnects with the same player and locked action. Reconnect credentials are stored per tab; treat the tab as your player session. Disconnects have a 20-second grace window, then forfeit at a round boundary. Host ownership transfers automatically. Rooms close after 30 minutes of inactivity, or 5 minutes with no connected players.

- `src/multiplayer/rules.ts`: pure targeted simultaneous rules and tied placements.
- `server/rooms.ts`: authoritative membership, readiness, locking, rounds, reconnection, host transfer, and cleanup.
- `server/http.ts`: HTTP assets and viewer-specific WebSocket snapshots; hidden choices and reconnect credentials are never broadcast to other players.
- `src/multiplayer/Multiplayer.tsx`: lobby, QR invites, targets, synchronized character reveals, attack paths, spectators, history, and results.

For Vercel production multiplayer, deploy the authoritative backend with its hosted PostgreSQL database and configure `VITE_MULTIPLAYER_URL`. See [MULTIPLAYER_DEPLOYMENT.md](MULTIPLAYER_DEPLOYMENT.md) for exact setup, recovery behavior, and verification. Local `npm run dev` still uses the Vite `/socket` proxy; static preview alone cannot host multiplayer.


## Timers, bots, and match targets

Both modes default to a 10-second move-selection timer and first to 5 wins. Choose 5, 10, or 15 seconds, or a custom whole number from 1–300 seconds. Select first to 5 or 10 wins, or a custom whole number from 1–100. The timer runs only while choosing; everyone locking early starts the reveal immediately. An unsubmitted choice becomes **Block 1** at the deadline. Spectators never delay rounds.

In private rooms the host controls settings before the match. Any settings change clears human readiness. Hosts can add Easy, Normal, or Hard bots, or remove them in the lobby. Bots have original avatars and full-body characters, stay ready, and persist through rematches. Bot actions and targets are committed from starting ammo and completed history before humans submit. The server enforces deadlines, validates actions, resolves games, and awards scores once per game. Reconnecting restores the same player and score. If fewer than two eligible participants remain between games, the match closes without manufacturing extra wins.

The live scoreboard includes every human and bot, showing progress toward the target. Single-player uses the same timeout, scoring, and game-reset rules; Rematch keeps settings and resets scores, while Change settings returns to setup. Single-player remains local and does not require the room server.

`src/match.ts` centralizes validation and idempotent scoring; `src/solo.ts` handles single-player progression; `src/multiplayer/bots.ts` selects legal targeted bot actions without access to hidden choices. Tests include deadline races, early locks, bot legality across ammo boundaries, private bot commitments, draws, scoring, resets, champion detection, rematches, and reconnects. Real WebSocket tests cover timed one-human bot matches across multiple games.


## Khmer / English

Use **ខ្មែរ | English** in the header/home or settings. The picker and single-player results also include the toggle so it remains available inside modal screens. Changes apply immediately, including historical results and existing validation notices, without changing ammo, hidden choices, scores, deadlines, or match progress. Your choice persists in local storage under `ching.language.v1`. Each running client chooses independently; language is never sent as a shared room setting. Player nicknames, room codes, invite links, and original avatar display names remain unchanged. Attack names stay Ching, Swing, Klarteang, and Seuteang, with translated explanations.

Translations are centralized in `src/i18n/en.json` and `src/i18n/km.json`. Most labels use their English source phrase as a stable key; structured results use named keys and interpolation parameters. `src/i18n/core.ts` falls back to the English catalog for any missing Khmer entry. `src/i18n/react.tsx` owns the preference and updates the HTML language attribute and page title. Both solo results and multiplayer attack messages are rendered from move/outcome/event data in the viewer’s language rather than saved translated text.

Noto Sans Khmer is locally bundled at regular, semibold, and bold weights. Khmer layout styles remove Latin letter spacing, allow taller line boxes, and use roomier mobile controls. DM Sans and Space Grotesk are also bundled locally. Translation tests cover catalog completeness, interpolation parity, interface/accessibility keys, validation errors, all 64 move pairings, event messages, preserved attack names, storage failures, and English fallback.

The Khmer copy has not been reviewed by a native-speaking Ching player. The descriptive terms for move rounds, games, blocks, and bots are flagged in [TRANSLATION_REVIEW.md](TRANSLATION_REVIEW.md) for local terminology review.

## Verification

375 automated rules, AI, avatar profile, and character state tests pass and the production TypeScript/Vite build succeeds. Browser smoke checks in Edge covered opening ammo restrictions, reload, victory, defeat, canceled attacks, configurable draws, final-round ammo, restart, duplicate submission protection, instructions, locked match settings, sound toggling, and reduced motion. Avatar checks covered all 24 SVGs loading, category filters, arrow/Home/End navigation, keyboard selection, background selection, save/reload, Random Avatar, Cancel, and player/AI avatars across rounds and results. Desktop and phone (390px) layouts were visually inspected; the phone has no horizontal overflow. Full-body checks covered all 24 character designs and 336 character/state combinations, synchronized clapping and move reveals, successful blocks, hit/victory/defeat transitions, matching player/AI selections, and static poses under reduced motion. The installed dependency audit reports zero vulnerabilities.

Multiplayer browser checks covered desktop and 390px phone lobbies, QR invites, readiness, hidden moves, target changes, a refresh with a locked attack, late-arrival spectators, eliminated-player spectators, reciprocal strength resolution, placements, and returning all players to the lobby. Automated integration tests connect eight real WebSocket clients, including simultaneous draws, reconnects, and host transfer.

Timer/match browser checks verified automatic Block 1 on timeout, custom-value validation, synchronized desktop/phone countdowns, adding/removing bots, readiness resets, per-game score updates, ammo resets, intermission reconnects, champions, and rematches in both modes. Phone layouts had no horizontal overflow and these flows produced no browser runtime errors.

Language browser checks covered independent English/Khmer clients in one room, switching during single-player clapping and active multiplayer, translated blocked/hit events, unchanged ammo/timers/scores/invites, champion screens, persistent preference on reload, and validation errors switching in place. Khmer home and match layouts were inspected at 390px without horizontal overflow or clipped glyphs.

### Mobile navigation

The home screen opens either Single Player setup or the Multiplayer Create/Join menu. Single-player setup lets you edit your name, select a full-body character, and choose difficulty, round time, and wins required. Valid selections are remembered on this device. Character colors and the complete collection are available through “All characters & colors”; instructions and reduced motion are available through How to Play. Custom timer values accept 1–300 seconds; custom win targets accept 1–100 wins.

The interface supports safe-area insets and scrolling when the available height shrinks. The viewport requests content resizing when a supported mobile browser opens its keyboard.

### Playing on a phone

Gameplay uses the available viewport height, with all eight moves in two rows of four. The menu button opens language, sound, instructions, reduced motion, and history; private matches also include standings. Opponents are selected in the arena's horizontal target rail. Choosing a move and locking it does not move the panel during the reveal. Larger accessibility text gets a scrollable layout instead of clipped controls.

## Reactions and activity

Use the smile button beside **Activity** to send one of nine localized preset reactions. Each sender has a three-second cooldown, enforced by the multiplayer server; retries use stable event IDs. **Hide reaction bubbles** silences bubbles without removing reactions or gameplay results from the feed. Bots occasionally react to revealed blocks/canceled attacks, congratulate game winners, and say good game at match completion.

**Activity** opens a separately scrolling match feed with revealed actions, targets, blocks, eliminations, explicit draws, game winners and scores, and the match champion. Earlier games remain available until a new match starts. Hidden choices never enter the feed. Each viewer’s language controls all event messages independently; player names remain unchanged.

See `ACTIVITY_VERIFICATION.md` for mobile and synchronization checks.

Revealed moves appear above the main characters, with reload gains and multiplayer targets; opponent selectors also show every revealed move. Result text uses resolved events, distinguishes canceled/blocked rounds from wins, and lists eliminated and remaining players in private rooms. A brief 2.3–2.5 second reveal period allows reading before the next timer starts. Game-end announcements include the game number, winner and updated scores. See `ROUND_RESULTS_VERIFICATION.md` for checks.

## Settings

Open the gear button on home or **Settings** in the gameplay menu. Language, sound effects, reduced motion and reaction bubble visibility apply immediately and are remembered on this device. The version footer reads package metadata. Back preserves the previous screen, game, room and selections. Solo move selection pauses while Settings is open and resumes with the remaining time; private rooms continue on the server timer with a notice. See `SETTINGS_VERIFICATION.md` for persistence, localization and live-game checks.
