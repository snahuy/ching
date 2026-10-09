import { describe, expect, it } from 'vitest';
import { awardGame, validateMatchSettings, type MatchProgress } from './match';
const fresh = (): MatchProgress => ({ scores: { a: 0, b: 0 }, completedGame: 0, championId: null });
describe('shared match settings and scoring', () => {
  it.each([1, 5, 10, 100])('accepts whole-number win target %i', winsRequired => expect(validateMatchSettings({ roundSeconds: 15, winsRequired }).winsRequired).toBe(winsRequired));
  it.each([0, 101, 1.5, NaN, Infinity, '5', null])('rejects invalid win target %s', winsRequired => expect(() => validateMatchSettings({ roundSeconds: 10, winsRequired })).toThrow('whole number'));
  it.each([0, 301, 5.5, NaN, '10', null])('rejects invalid timer %s', roundSeconds => expect(() => validateMatchSettings({ roundSeconds, winsRequired: 5 })).toThrow('whole number'));
  it('awards exactly one point per game, none for a draw, and never mutates or double-awards', () => {
    const start = fresh(), one = awardGame(start, 1, 'a', 2);
    expect(start.scores.a).toBe(0); expect(one.scores).toEqual({ a: 1, b: 0 });
    expect(awardGame(one, 1, 'b', 2)).toBe(one);
    const draw = awardGame(one, 2, null, 2); expect(draw.scores).toEqual(one.scores); expect(draw.championId).toBeNull();
    const end = awardGame(draw, 3, 'a', 2); expect(end.championId).toBe('a'); expect(end.scores.a).toBe(2);
    expect(awardGame(end, 4, 'b', 2)).toBe(end);
  });
  it('rejects an out-of-order game or unknown winner', () => {
    expect(() => awardGame(fresh(), 2, 'a', 5)).toThrow('order'); expect(() => awardGame(fresh(), 1, 'intruder', 5)).toThrow('participant');
  });
});
