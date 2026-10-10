# Single Player viewport-fit verification

Changes are scoped to `.single-setup-shell`; other page layouts are unchanged by this update.

- Captured and inspected English and Khmer layouts at 320×568, 360×640, 375×667, 390×844, 440×956, 768×1024, 1366×768, 1440×900, 1920×1080, and 812×375.
- Compact settings open in a modal on short screens. Custom 12-second / first-to-3 settings persisted after closing. Character picker opens independently; Escape preserves selections.
- Match initialization was left unchanged; automated click-through verification timed out while closing the character picker.
- Content remains in normal flow for enlarged text, validation, or keyboard-reduced viewports. Native dialogs scroll independently.
- Production build passed. 100 targeted avatar, solo, and localization tests passed. Diff whitespace check passed.
- Real mobile browser chrome and OS keyboard behavior still warrant physical-device testing; screenshots use desktop browser viewport emulation.

