import { MOVES, type MoveId, type Round } from './rules';

export const CHARACTER_STATES = ['idle', 'clap', 'reload', 'ching', 'swing', 'klarteang', 'seuteang', 'block1', 'block2', 'block3', 'blocked', 'hit', 'victory', 'defeat'] as const;
export type CharacterState = typeof CHARACTER_STATES[number];
export type Phase = 'choose' | 'countdown' | 'reveal' | 'reaction' | 'intermission' | 'over';
export const ROUND_TIMING = { clapBeat: 240, reducedClapBeat: 90, move: 420, continuingReveal: 2300, finalReveal: 2500 } as const;
export const STATE_LABELS: Record<CharacterState, string> = {
  idle: 'Ready stance', clap: 'Clapping', reload: 'Reloading', ching: 'Ching attack', swing: 'Swing attack',
  klarteang: 'Klarteang attack', seuteang: 'Seuteang attack', block1: 'Block 1', block2: 'Block 2',
  block3: 'Block 3', blocked: 'Successful block', hit: 'Taking a hit', victory: 'Victory', defeat: 'Defeat',
};
// Presentation reads completed round outcomes; it never resolves moves or
// accepts an avatar ID. Every character follows the same round clock.
export function characterState(phase: Phase, round: Round | undefined, side: 'player' | 'ai'): CharacterState {
  if (phase === 'countdown') return 'clap';
  if (phase === 'choose' || !round) return 'idle';
  const move: MoveId = side === 'player' ? round.playerMove : round.aiMove;
  const other = side === 'player' ? round.aiMove : round.playerMove;
  if (phase === 'reveal') return move;
  if (phase === 'over' || phase === 'intermission') return round.outcome === side ? 'victory' : round.outcome === 'continue' || round.outcome === 'draw' ? 'idle' : 'defeat';
  if (round.outcome !== 'continue' && round.outcome !== 'draw') return round.outcome === side ? 'idle' : 'hit';
  if (MOVES[move].kind === 'block' && MOVES[other].kind === 'attack' && round.outcome === 'continue') return 'blocked';
  return move === 'reload' ? 'reload' : 'idle';
}
