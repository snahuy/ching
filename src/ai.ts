import { legalMoves, MOVES, type MoveId, type Round } from './rules';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type AIContext = { playerAmmo: number; aiAmmo: number; history: readonly Round[] };
// No current player choice is accepted here. Call once when opening a round,
// and retain the returned move privately until simultaneous resolution.
export function chooseAI(context: AIContext, difficulty: Difficulty, random: () => number = Math.random): MoveId {
  const { playerAmmo, aiAmmo, history } = context;
  const legal = legalMoves(aiAmmo);
  const weights = legal.map(id => {
    const move = MOVES[id];
    if (difficulty === 'easy') return move.kind === 'block' ? 0.65 : 1;
    let weight = move.kind === 'reload' ? (aiAmmo < 3 ? 3 : 1.2) : move.kind === 'attack' ? (playerAmmo === 0 ? 4 : 1.7 + move.strength * 0.25) : (playerAmmo === 0 ? 0.2 : 1);
    if (move.kind === 'block') weight *= move.stops.some(attack => MOVES[attack].cost <= playerAmmo) ? 1.8 : 0.25;
    if (difficulty === 'hard' && history.length) {
      const recent = history.slice(-8);
      let score = 0;
      for (const round of recent) {
        const previous = MOVES[round.playerMove];
        if (move.kind === 'attack' && (previous.kind === 'reload' || (previous.kind === 'attack' && move.strength > previous.strength) || (previous.kind === 'block' && !previous.stops.includes(id)))) score += 1;
        if (move.kind === 'block' && move.stops.includes(previous.id)) score += 1.4;
        if (move.kind === 'reload' && previous.kind === 'block') score += 0.8;
      }
      weight *= 0.6 + score / recent.length * 2.4;
    }
    return weight;
  });
  let pick = random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < legal.length; i++) { pick -= weights[i]; if (pick < 0) return legal[i]; }
  return legal[legal.length - 1];
}
