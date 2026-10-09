# Khmer terminology review

The interface uses descriptive Khmer rather than claiming one standard set of Cambodian schoolyard names. The Khmer copy has not had native-speaker review. Please review these terms with a Khmer-speaking Ching player before treating them as official local terminology:

- **Move round — វគ្គចលនា:** one simultaneous choice per active player. This is a descriptive UI term; a local schoolyard term may be more familiar.
- **Game — ការលេងមួយលើក / លើកទី …:** play until one survivor or a draw. **Match — ការប្រកួត:** multiple games until the win target. Review this distinction for clarity in local usage.
- **Reload — បញ្ចូលគ្រាប់:** add one ammo. Local players may simply say គ្រាប់.
- **Block 1–3 — ការពារ ១–៣:** descriptive defense labels. Confirm any locally preferred names for the three hand gestures.
- **Bot — បូត:** a computer-controlled player. Review whether តួអង្គកុំព្យូទ័រ would be clearer for younger players.
- The Seuteang gesture explanation uses **កាំភ្លើងបាញ់រ៉ុក្កែត** to explain the bazooka-like pose; confirm that this is the clearest familiar description.

Ching, Swing, Klarteang, and Seuteang retain their supplied spellings in both languages. Shwing, Chwing, and Zooteang remain in the translated gesture explanations. Avatar display names are original proper names and remain unchanged. Player nicknames, room codes, and invite links are never translated.

Edit `src/i18n/km.json` for wording changes. Keep interpolation tokens such as `{name}`, `{target}`, and `{move}` intact, and keep the English keys unchanged. Run `npm test` to check catalog completeness and token parity.

Reaction copy also needs native-speaker review: **Nice move — ក្បាច់ល្អណាស់**, **That was close — ប្រផិតប្រផើយណាស់**, and **Good game — លេងសប្បាយណាស់** use friendly descriptive phrases. Check the new activity winner/draw wording for consistency with the game/match distinction above.

The new round announcements use **គ្មានអ្នកឈ្នះ** for “No winner,” **អ្នកនៅសល់** for remaining players, and **ត្រូវបានទប់ស្កាត់** for a blocked attack. Please include these result phrases and the new game-winner heading in native-speaker terminology review.
