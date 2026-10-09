# Background music

"Schoolyard Afternoon" is an original composition implemented in src/music.ts. It uses soft, decaying wooden-bar partials inspired by roneat and quiet drum/brush accents at 88 BPM. There are no vocals, orchestral layers, external recordings, third-party samples, or remote audio dependencies. This is a stylized instrumental, not a recording of traditional performers. The procedural composition is original project material.

The 32-beat loop wraps note tails into the beginning of the buffer for continuous playback. Music has its own saved On/Off and 0–100% volume preferences, defaulting to Off/25%, independent of sound effects. The volume is attenuated to leave headroom for effects. Settings provides a 12-second preview; closing Settings cancels a preview while enabled background music continues.

A single MusicProvider owns playback across screens. Browser interaction unlocks audio, On/Off/volume use 300ms gain fades, hidden pages stop/suspend audio, and only enabled music resumes at its saved loop position. Source creation is idempotent; preview and normal playback share one source.

Verified in the browser: actual AudioContext running/suspended states and live buffer-source counts; preview playback; slider output gain; sound-effects-muted/music-playing independence; no duplicate source across Home → Setup → Home; background pause/resume; Off remaining stopped after background return; persistence after reload; no playback before a new user interaction; and English/Khmer Settings controls at 390×844 and 320×640. Screenshots are in .verification/music-*.png.

Tests cover deterministic composition, finite/quiet output, seam continuity, preference migration/clamping, interaction requirement, gain changes, duplicate prevention, pause/resume, and previews. All 419 tests in 17 suites pass; production build passes.