import { describe, expect, it } from 'vitest';
import { PREFERENCES_KEY, readPreferences, savePreferences, validPlayerName } from './preferences';
describe('remembered single-player setup', () => {
  it('preserves Khmer names, difficulty and custom match values', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const preferences = { name: ' ដារ៉ា ', difficulty: 'hard' as const, settings: { roundSeconds: 12, winsRequired: 3 } };
    savePreferences(storage, preferences);
    expect(readPreferences(storage)).toEqual({ ...preferences, name: 'ដារ៉ា' });
  });
  it.each(['broken JSON', JSON.stringify({ name: 'Dara', difficulty: 'hard', settings: { roundSeconds: 0, winsRequired: 5 } }), JSON.stringify({ name: '', difficulty: 'normal', settings: { roundSeconds: 10, winsRequired: 5 } })])('recovers invalid saved data: %s', value => {
    expect(readPreferences({ getItem: () => value })).toEqual({ name: 'Player', difficulty: 'normal', settings: { roundSeconds: 10, winsRequired: 5 } });
  });
  it('works when browser storage is unavailable', () => {
    expect(readPreferences({ getItem: () => { throw new Error('unavailable'); } }).name).toBe('Player');
    expect(() => savePreferences({ setItem: () => { throw new Error('unavailable'); } }, { name: 'Dara', difficulty: 'easy', settings: { roundSeconds: 5, winsRequired: 1 } })).not.toThrow();
  });
  it('does not replace remembered preferences with an unfinished name', () => {
    let saved = 'previous';
    savePreferences({ setItem: (_key, value) => { saved = value; } }, { name: ' ', difficulty: 'easy', settings: { roundSeconds: 5, winsRequired: 1 } });
    expect(saved).toBe('previous'); expect(PREFERENCES_KEY).toBe('ching.solo.preferences.v1');
  });
  it('validates readable names and rejects control characters and oversized names', () => {
    expect(validPlayerName('ដារ៉ា')).toBe(true); expect(validPlayerName('Dara')).toBe(true);
    for (const name of ['', ' ', 'a'.repeat(21), 'Dara\n']) expect(validPlayerName(name)).toBe(false);
  });
});
