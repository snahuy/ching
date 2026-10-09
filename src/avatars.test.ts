import { describe, expect, it } from 'vitest';
import { AVATARS, BACKGROUNDS, CATEGORIES, DEFAULT_PROFILE, PROFILE_KEY, randomAvatar, readProfile, saveProfile } from './avatars';
describe('avatar collection and guest profiles', () => {
  it('has 24 unique avatars, four in every category, and eight colors', () => {
    expect(AVATARS).toHaveLength(24);
    expect(new Set(AVATARS.map(a => a.id)).size).toBe(24);
    expect(new Set(AVATARS.map(a => a.name)).size).toBe(24);
    CATEGORIES.slice(1).forEach(c => expect(AVATARS.filter(a => a.category === c)).toHaveLength(4));
    expect(new Set(BACKGROUNDS.map(b => b.color)).size).toBe(8);
  });
  it('saves and restores an avatar and its background', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const profile = { avatarId: 'dragon', backgroundId: 'mint' } as const;
    expect(saveProfile(storage, profile)).toBe(true);
    expect(readProfile(storage)).toEqual(profile);
    expect(values.has(PROFILE_KEY)).toBe(true);
  });
  it.each([null, 'broken json', 'null', '[]', '42', '{"avatarId":"unknown","backgroundId":"invalid"}'])('safely handles missing or malformed storage %s', value => {
    expect(readProfile({ getItem: () => value })).toEqual(DEFAULT_PROFILE);
  });
  it('keeps valid fields when the other field is invalid', () => {
    expect(readProfile({ getItem: () => '{"avatarId":"tiger","backgroundId":"invalid"}' })).toEqual({ ...DEFAULT_PROFILE, avatarId: 'tiger' });
  });
  it('works when browser storage is denied or full', () => {
    expect(readProfile({ getItem: () => { throw new Error('denied'); } })).toEqual(DEFAULT_PROFILE);
    expect(saveProfile({ setItem: () => { throw new Error('quota'); } }, DEFAULT_PROFILE)).toBe(false);
  });
  it('random selection spans the whole collection and avoids the current avatar', () => {
    expect(new Set(Array.from({ length: 24 }, (_, i) => randomAvatar(undefined, () => i / 24))).size).toBe(24);
    for (const avatar of AVATARS) {
      for (let i = 0; i < 24; i++) expect(randomAvatar(avatar.id, () => i / 24)).not.toBe(avatar.id);
    }
  });
});
