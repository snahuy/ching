import { describe, it, expect } from 'vitest';
import { MOVE_LIST, MOVES, resolveRound, DEFAULT_RULES } from './rules';
import { characterState } from './characterState';
import { AVATARS } from './avatars';
import { CHARACTER_DESIGNS } from './characterDesigns';

describe('character animation follows resolved gameplay', () => {
  it('has a matching full-body design for every existing avatar', () => {
    expect(Object.keys(CHARACTER_DESIGNS).sort()).toEqual(AVATARS.map(a => a.id).sort());
  });
  for (const player of MOVE_LIST) for (const ai of MOVE_LIST) {
    it(`${player.name} vs ${ai.name}: hides locked moves, reveals together, reacts to actual outcome`, () => {
      const round = resolveRound(8, 8, player.id, ai.id);
      for (const side of ['player', 'ai'] as const) {
        const own = side === 'player' ? player : ai, other = side === 'player' ? ai : player;
        expect(characterState('choose', round, side)).toBe('idle');
        expect(characterState('countdown', round, side)).toBe('clap');
        expect(characterState('reveal', round, side)).toBe(own.id);
        const terminal = round.outcome === 'player' || round.outcome === 'ai';
        if (terminal) {
          expect(characterState('reaction', round, side)).toBe(round.outcome === side ? 'idle' : 'hit');
          expect(characterState('over', round, side)).toBe(round.outcome === side ? 'victory' : 'defeat');
        } else {
          const defended = own.kind === 'block' && other.kind === 'attack';
          expect(characterState('reaction', round, side)).toBe(defended ? 'blocked' : own.kind === 'reload' ? 'reload' : 'idle');
          expect(characterState('over', round, side)).toBe('idle');
        }
      }
    });
  }
  it('also honors configurable local rules when showing successful blocks', () => {
    const round = resolveRound(1, 0, 'ching', 'block3', { ...DEFAULT_RULES, blocksStopWeaker: true });
    expect(MOVES.block3.stops).not.toContain('ching');
    expect(characterState('reaction', round, 'ai')).toBe('blocked');
  });
  it('draws never show a hit, winner, or defeated player', () => {
    const round = resolveRound(1, 1, 'ching', 'ching', { ...DEFAULT_RULES, equalAttacks: 'draw' });
    for (const side of ['player', 'ai'] as const) {
      expect(characterState('reaction', round, side)).toBe('idle');
      expect(characterState('over', round, side)).toBe('idle');
    }
  });
  it('starts ready before any completed round exists', () => {
    expect(characterState('choose', undefined, 'player')).toBe('idle');
    expect(characterState('countdown', undefined, 'ai')).toBe('clap');
  });
});
