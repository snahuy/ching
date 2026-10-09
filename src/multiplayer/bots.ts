import { MOVES, legalMoves } from '../rules';
import type { Difficulty } from '../ai';
import type { BattlePlayer, LockedAction } from './rules';
import type { RoundHistory } from './protocol';
type BotContext = { selfId: string; players: readonly BattlePlayer[]; history: readonly RoundHistory[] };
// Only opening-round ammo and completed history enter this API, never current locks.
export function chooseBot({ selfId, players, history }: BotContext, difficulty: Difficulty, random: () => number = Math.random): LockedAction {
  const self = players.find(p => p.id === selfId && p.active);
  const opponents = players.filter(p => p.active && p.id !== selfId);
  if (!self || !opponents.length) throw new Error('Bot needs an active opponent.');
  const recent = history.slice(-8).flatMap(r => r.actions).filter(a => a.playerId !== selfId);
  const options = legalMoves(self.ammo).flatMap(moveId => {
    const move = MOVES[moveId];
    const targets = move.kind === 'attack' ? opponents : [null];
    return targets.map(target => {
      let weight = difficulty === 'easy' ? 1 / targets.length : move.kind === 'reload' ? (self.ammo < 3 ? 4 : 1) : move.kind === 'block' ? (opponents.some(p => move.stops.some(a => MOVES[a].cost <= p.ammo)) ? 1.5 : 0.12) : (target!.ammo === 0 ? 5 : 2 + move.strength * 0.3) / opponents.length;
      if (difficulty === 'hard') {
        const habits = target ? recent.filter(a => a.playerId === target.id) : recent;
        const favorable = habits.filter(a => {
          const previous = MOVES[a.move];
          return move.kind === 'block' ? move.stops.includes(a.move) : move.kind === 'attack' ? previous.kind === 'reload' || previous.kind === 'block' && !previous.stops.includes(moveId) : previous.kind === 'block';
        }).length;
        weight *= 0.65 + (habits.length ? favorable / habits.length : 0.35) * 2.5;
      }
      return { action: { playerId: selfId, move: moveId, ...(target ? { targetId: target.id } : {}) } as LockedAction, weight };
    });
  });
  let pick = random() * options.reduce((sum, o) => sum + o.weight, 0);
  for (const option of options) { pick -= option.weight; if (pick < 0) return option.action; }
  return options.at(-1)!.action;
}
