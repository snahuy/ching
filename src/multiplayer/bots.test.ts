import { describe, expect, it } from 'vitest';
import { chooseBot } from './bots';
import { validateAction, type BattlePlayer } from './rules';
import type { RoundHistory } from './protocol';
const player = (id: string, ammo: number, active = true): BattlePlayer => ({ id, ammo, active, eliminatedRound: null });
describe('private-room bot legality and information boundary', () => {
  it.each(['easy', 'normal', 'hard'] as const)('%s always selects affordable moves and active opponents, across ammo boundaries', difficulty => {
    for (const ammo of [0, 1, 2, 3, 4, 5, 10]) for (let n = 0; n < 100; n++) {
      const players = [player('bot', ammo), player('a', 0), player('b', 5), player('dead', 10, false)];
      const action = chooseBot({ selfId: 'bot', players, history: [] }, difficulty, () => n / 100);
      expect(() => validateAction(players, action)).not.toThrow(); expect(action.targetId).not.toBe('dead'); expect(action.targetId).not.toBe('bot');
    }
  });
  it('hard adapts to completed habits while retaining varied legal choices', () => {
    const history: RoundHistory[] = Array.from({ length: 8 }, (_, round) => ({ game: 1, round, kind: 'actions', actions: [{ playerId: 'a', move: 'reload' }], events: [], eliminated: [], forfeits: [] }));
    const context = { selfId: 'bot', players: [player('bot', 5), player('a', 5)], history };
    const actions = Array.from({ length: 100 }, (_, n) => chooseBot(context, 'hard', () => n / 100));
    expect(new Set(actions.map(a => a.move)).size).toBeGreaterThan(3);
    expect(actions.filter(a => a.targetId).length).toBeGreaterThan(Array.from({ length: 100 }, (_, n) => chooseBot({ ...context, history: [] }, 'hard', () => n / 100)).filter(a => a.targetId).length);
  });
  it('rejects spectator bots and contexts without an opponent', () => {
    expect(() => chooseBot({ selfId: 'bot', players: [player('bot', 1, false), player('a', 1)], history: [] }, 'easy')).toThrow('opponent');
    expect(() => chooseBot({ selfId: 'bot', players: [player('bot', 1)], history: [] }, 'normal')).toThrow('opponent');
  });
});
