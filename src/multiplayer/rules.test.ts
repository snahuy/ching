import { describe, expect, it } from 'vitest';
import { MOVE_LIST, resolveRound } from '../rules';
import { placements, resolveBattle, validateAction, winner, type BattlePlayer, type LockedAction } from './rules';
const player = (id: string, ammo = 5): BattlePlayer => ({ id, ammo, active: true, eliminatedRound: null });
const action = (playerId: string, move: LockedAction['move'], targetId?: string): LockedAction => ({ playerId, move, ...(targetId ? { targetId } : {}) });
describe('multiplayer simultaneous rules', () => {
  for (const p of MOVE_LIST) for (const a of MOVE_LIST) it(`two-player ${p.name} vs ${a.name} agrees with the supplied duel rules`, () => {
    const result = resolveBattle([player('a'), player('b')], [action('a', p.id, p.kind === 'attack' ? 'b' : undefined), action('b', a.id, a.kind === 'attack' ? 'a' : undefined)], 1);
    const duel = resolveRound(5, 5, p.id, a.id);
    expect(result.players.map(p => p.ammo)).toEqual([duel.playerAmmo, duel.aiAmmo]);
    expect(result.winnerId).toBe(duel.outcome === 'player' ? 'a' : duel.outcome === 'ai' ? 'b' : null);
    expect(result.eliminated).toEqual(duel.outcome === 'player' ? ['b'] : duel.outcome === 'ai' ? ['a'] : []);
  });
  it('a matching block stops every covered incoming attack', () => {
    const r = resolveBattle(['a', 'b', 'c'].map(id => player(id)), [action('a', 'block1'), action('b', 'ching', 'a'), action('c', 'swing', 'a')], 1);
    expect(r.eliminated).toEqual([]); expect(r.events.map(e => e.result)).toEqual(['blocked', 'blocked']);
    expect(r.players.map(p => p.ammo)).toEqual([5, 4, 3]);
  });
  it('one uncovered hit eliminates a defender even if another incoming attack is blocked', () => {
    const r = resolveBattle(['a', 'b', 'c'].map(id => player(id)), [action('a', 'block1'), action('b', 'ching', 'a'), action('c', 'klarteang', 'a')], 2);
    expect(r.eliminated).toEqual(['a']); expect(r.events.map(e => e.result)).toEqual(['blocked', 'hit']);
    expect(r.players[0].eliminatedRound).toBe(2);
  });
  it('third-party attacks provide no reciprocal defense, and eliminated attackers still fire', () => {
    const r = resolveBattle(['a', 'b', 'c'].map(id => player(id)), [action('a', 'seuteang', 'b'), action('b', 'ching', 'a'), action('c', 'ching', 'a')], 1);
    expect(new Set(r.eliminated)).toEqual(new Set(['a', 'b'])); expect(r.winnerId).toBe('c');
    expect(r.events.map(e => e.result)).toEqual(['hit', 'outmatched', 'hit']);
    expect(r.players.map(p => p.ammo)).toEqual([0, 4, 4]);
  });
  it('a three-player attack cycle eliminates everyone simultaneously', () => {
    const r = resolveBattle(['a', 'b', 'c'].map(id => player(id, 1)), [action('a', 'ching', 'b'), action('b', 'ching', 'c'), action('c', 'ching', 'a')], 3);
    expect(r.outcome).toBe('draw'); expect(r.winnerId).toBeNull(); expect(r.players.every(p => !p.active && p.ammo === 0)).toBe(true);
    expect(placements(r.players)).toEqual([{ rank: 1, playerIds: ['a', 'b', 'c'], eliminatedRound: 3 }]);
  });
  it('equal reciprocal attacks cancel, but a third player can still hit either duelist', () => {
    const r = resolveBattle(['a', 'b', 'c'].map(id => player(id, 1)), [action('a', 'ching', 'b'), action('b', 'ching', 'a'), action('c', 'ching', 'a')], 1);
    expect(r.eliminated).toEqual(['a']); expect(r.events.map(e => e.result)).toEqual(['canceled', 'canceled', 'hit']); expect(r.outcome).toBe('continue');
  });
  it('applies losing reloads, single cost deductions, and untouched spectator ammo together', () => {
    const spectator = { ...player('s', 8), active: false, eliminatedRound: 1 };
    const r = resolveBattle([player('a', 2), player('b', 5), player('c', 1), spectator], [action('a', 'reload'), action('b', 'seuteang', 'a'), action('c', 'ching', 'a')], 2);
    expect(r.players.map(p => p.ammo)).toEqual([3, 0, 0, 8]); expect(r.eliminated).toEqual(['a']);
  });
  it('groups placements by elimination round using competition ranks', () => {
    const roster = [player('winner'), ...['a', 'b'].map(id => ({ ...player(id), active: false, eliminatedRound: 3 })), ...['c', 'd', 'e'].map(id => ({ ...player(id), active: false, eliminatedRound: 2 })), ...['f', 'g'].map(id => ({ ...player(id), active: false, eliminatedRound: 1 }))];
    expect(placements(roster).map(p => [p.rank, p.playerIds.length])).toEqual([[1, 1], [2, 2], [4, 3], [7, 2]]);
    expect(winner(roster)).toEqual({ outcome: 'winner', winnerId: 'winner' });
  });
  it('resolves a locked attack even when its disconnected attacker forfeits', () => {
    const r = resolveBattle([player('a', 1), player('b', 0)], [action('a', 'ching', 'b'), action('b', 'reload')], 1, ['a']);
    expect(r.outcome).toBe('draw'); expect(r.players.map(p => p.ammo)).toEqual([0, 1]);
  });
  it('allows missing actions only for players forfeiting at this boundary', () => {
    expect(() => resolveBattle([player('a'), player('b')], [action('a', 'reload')], 1)).toThrow('Waiting');
    const r = resolveBattle([player('a'), player('b')], [action('a', 'reload')], 1, ['b']);
    expect(r.winnerId).toBe('a'); expect(r.players.map(p => p.ammo)).toEqual([6, 5]);
  });
  it('rejects missing, self, eliminated, and unknown targets; spectators cannot act', () => {
    const roster = [player('a'), { ...player('b'), active: false, eliminatedRound: 1 }, player('c')];
    for (const target of [undefined, 'a', 'b', 'missing']) expect(() => validateAction(roster, action('a', 'ching', target))).toThrow();
    expect(() => validateAction(roster, action('b', 'reload'))).toThrow('Only active');
    expect(() => validateAction(roster, action('a', 'reload', 'c'))).toThrow('Only attacks');
  });
  it('rejects unaffordable attacks, duplicates, malformed ammo, and unknown moves', () => {
    expect(() => resolveBattle([player('a', 0), player('b')], [action('a', 'ching', 'b'), action('b', 'reload')], 1)).toThrow('Insufficient');
    expect(() => resolveBattle([player('a'), player('b')], [action('a', 'reload'), action('a', 'reload'), action('b', 'reload')], 1)).toThrow('Duplicate action');
    expect(() => resolveBattle([player('a', -1)], [], 1)).toThrow('Invalid ammo');
    expect(() => validateAction([player('a')], action('a', '__proto__' as LockedAction['move']))).toThrow('Unknown move');
  });
});
