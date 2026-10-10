# Shared page shell verification

- PageShell.tsx supplies the full-width top and bottom 16px krama strips. The pattern, cream backing, blend mode, colors, and tile dimensions match the prior Home trims. The strips are in normal flow with device safe-area padding; Settings reuses this shell inside its full-screen dialog.
- page-shell.css centralizes Home wordmark and page-header typography. Home, Single Player, Multiplayer flow titles, lobby titles, and Settings share font family, responsive font size, weight 900, and line height 1.7. Khmer uses Battambang without character spacing. English uses Source Sans 3. Long headers wrap within flexible navigation rows.
- Removed the under-header krama divider. Home's former absolute trims are disabled to avoid duplicate borders. Root shell spans every navigation state, including solo/private gameplay, lobby, results and instructions. Compact in-game round information retains its size to keep actions accessible.
- Single Player's summary/Start sit near the lower strip when there is room; short pages grow naturally. Desktop setup uses a content-sized panel positioned near the lower edge. No avatar or font shrinking was introduced.
- Rendered screenshots checked at 320x640, 360x640, 393x852, 440x956, 768x1024 and 1440x900, in Khmer and English. Home, Settings, setup, multiplayer hub, room creation and gameplay were inspected. At 360x640 gameplay scroll height equals viewport height and all eight moves end above the bottom strip.
- Long room title at 320px wraps without horizontal overflow; back control stays 44px. At 440x956 the bottom strip ends exactly at the viewport bottom. 24px enlarged text remains scrollable with Start reachable. CSS explicitly reserves all safe-area insets.

Screenshots are saved in the ignored .verification directory. Production build passed. An older winner test was updated to assert the selected Robot identity rather than the generic Bot name.
