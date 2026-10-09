import {readFileSync} from 'node:fs';
import {catalogs} from './i18n/core';
import { describe, expect, it } from 'vitest';
import { AVATARS, BACKGROUNDS, CATEGORIES, DEFAULT_PROFILE, PROFILE_KEY, randomAvatar, readProfile, saveProfile } from './avatars';
describe('avatar collection and guest profiles', () => {
  it('has the revised unique roster, populated categories, and eight colors', () => {
    expect(AVATARS).toHaveLength(21);
    expect(new Set(AVATARS.map(a => a.id)).size).toBe(21);
    expect(new Set(AVATARS.map(a => a.name)).size).toBe(21);
    CATEGORIES.slice(1).forEach(c => expect(AVATARS.filter(a => a.category === c)).not.toHaveLength(0));
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
    expect(new Set(Array.from({ length: AVATARS.length }, (_, i) => randomAvatar(undefined, () => i / AVATARS.length))).size).toBe(21);
    for (const avatar of AVATARS) {
      for (let i = 0; i < AVATARS.length; i++) expect(randomAvatar(avatar.id, () => i / AVATARS.length)).not.toBe(avatar.id);
    }
  });
});

it('migrates removed avatars to Sok while keeping their background',()=>{for(const id of ['student','dancer','robot','astronaut','ninja','pirate','phoenix','wizard','spirit','gamer','runner'])expect(readProfile({getItem:()=>JSON.stringify({avatarId:id,backgroundId:'mint'})})).toEqual({avatarId:'sok',backgroundId:'mint'});});
it('keeps requested names and the renamed Robot ID',()=>{expect(AVATARS.find(a=>a.id==='bazooka')?.name).toBe('Robot');expect(AVATARS.find(a=>a.id==='bopha')?.name).toBe('Bopha');expect(AVATARS.find(a=>a.id==='elephant')?.name).toBe('Bopa Jumbo');expect(AVATARS.filter(a=>a.category==='Creator').map(a=>a.name)).toEqual(['Bro Sna']);});

it('provides local profile and character art plus bilingual descriptions for the selectable roster',()=>{for(const a of AVATARS){for(const folder of ['avatars','characters/heads'])expect(readFileSync(new URL(`../public/${folder}/${a.id}.svg`,import.meta.url),'utf8')).toContain('<svg');expect(catalogs.en[a.description]).toBeTruthy();expect(catalogs.km[a.description]).toBeTruthy();}});

it('includes Vandeoun in Cambodia-inspired and preserves Bro Sna as Creator',()=>{expect(AVATARS.find(a=>a.id==='vandeoun')).toMatchObject({name:'Vandeoun',category:'Cambodia-inspired'});expect(AVATARS.find(a=>a.id==='bro-sna')).toMatchObject({name:'Bro Sna',category:'Creator'});});
