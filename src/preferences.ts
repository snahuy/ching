import { DEFAULT_MATCH_SETTINGS, validateMatchSettings, type MatchSettings } from './match';
import type { Difficulty } from './ai';
export type SoloPreferences = { name: string; difficulty: Difficulty; settings: MatchSettings };
export const PREFERENCES_KEY = 'ching.solo.preferences.v1';
export function validPlayerName(name: string) { return name.trim().length > 0 && [...name.trim()].length <= 20 && !/[\u0000-\u001f\u007f]/.test(name); }
export function readPreferences(storage: Pick<Storage, 'getItem'>): SoloPreferences {
  const fallback: SoloPreferences = { name: 'Player', difficulty: 'normal', settings: { ...DEFAULT_MATCH_SETTINGS } };
  try {
    const saved = JSON.parse(storage.getItem(PREFERENCES_KEY) ?? 'null');
    if (!saved || !validPlayerName(saved.name ?? '') || !['easy', 'normal', 'hard'].includes(saved.difficulty)) return fallback;
    return { name: saved.name.trim(), difficulty: saved.difficulty, settings: validateMatchSettings(saved.settings) };
  } catch { return fallback; }
}
export function savePreferences(storage: Pick<Storage, 'setItem'>, preferences: SoloPreferences) {
  if (!validPlayerName(preferences.name)) return;
  try { storage.setItem(PREFERENCES_KEY, JSON.stringify({ ...preferences, name: preferences.name.trim(), settings: validateMatchSettings(preferences.settings) })); } catch { /* Session choices still work without storage. */ }
}
