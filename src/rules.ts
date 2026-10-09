export type MoveId = 'reload' | 'ching' | 'swing' | 'klarteang' | 'seuteang' | 'block1' | 'block2' | 'block3';
export type Move = { id: MoveId; name: string; kind: 'reload' | 'attack' | 'block'; cost: number; strength: number; stops: readonly MoveId[]; gesture: string };
export const MOVES: Record<MoveId, Move> = {
  reload: { id: 'reload', name: 'Reload', kind: 'reload', cost: 0, strength: 0, stops: [], gesture: 'Elbows bent, forearms up, fists closed.' },
  ching: { id: 'ching', name: 'Ching', kind: 'attack', cost: 1, strength: 1, stops: [], gesture: 'Open hands slice diagonally downward.' },
  swing: { id: 'swing', name: 'Swing', kind: 'attack', cost: 2, strength: 2, stops: [], gesture: 'Slice with both hands on the opposite diagonal. Also called Shwing or Chwing.' },
  klarteang: { id: 'klarteang', name: 'Klarteang', kind: 'attack', cost: 3, strength: 3, stops: [], gesture: 'Diagonal slice with index and middle fingers together.' },
  seuteang: { id: 'seuteang', name: 'Seuteang', kind: 'attack', cost: 5, strength: 4, stops: [], gesture: 'Raise an elbow toward your rival, supported by your other hand. Also called Zooteang.' },
  block1: { id: 'block1', name: 'Block 1', kind: 'block', cost: 0, strength: 0, stops: ['ching', 'swing'], gesture: 'Cross your arms into an X.' },
  block2: { id: 'block2', name: 'Block 2', kind: 'block', cost: 0, strength: 0, stops: ['klarteang'], gesture: 'Forearms up, index and middle fingers extended together.' },
  block3: { id: 'block3', name: 'Block 3', kind: 'block', cost: 0, strength: 0, stops: ['seuteang'], gesture: 'Hook hands together, one palm down and one palm up.' },
};
export const MOVE_LIST = Object.values(MOVES);
export type RuleOptions = { equalAttacks: 'cancel' | 'draw'; blocksStopWeaker: boolean; spendFailedAttacks: boolean };
export const DEFAULT_RULES: RuleOptions = { equalAttacks: 'cancel', blocksStopWeaker: false, spendFailedAttacks: true };
export type Outcome = 'continue' | 'player' | 'ai' | 'draw';
export type Round = { playerMove: MoveId; aiMove: MoveId; playerAmmo: number; aiAmmo: number; outcome: Outcome; message: string };
export function legalMoves(ammo: number): MoveId[] { return MOVE_LIST.filter(m => m.cost <= ammo).map(m => m.id); }
function stopped(attack: Move, block: Move, rules: RuleOptions) {
  return block.stops.includes(attack.id) || (rules.blocksStopWeaker && block.stops.some(id => MOVES[id].strength >= attack.strength));
}
export function resolveRound(playerAmmo: number, aiAmmo: number, playerMove: MoveId, aiMove: MoveId, rules: RuleOptions = DEFAULT_RULES): Round {
  if (![playerAmmo, aiAmmo].every(n => Number.isSafeInteger(n) && n >= 0)) throw new Error('Ammo must be a non-negative safe integer.');
  const p = MOVES[playerMove], a = MOVES[aiMove];
  if (!p || !a) throw new Error('Unknown move.');
  if (p.cost > playerAmmo || a.cost > aiAmmo) throw new Error('Insufficient ammo at the beginning of the round.');
  let outcome: Outcome = 'continue', message = '';
  if (p.kind === 'attack' && a.kind === 'attack') {
    if (p.strength === a.strength) { outcome = rules.equalAttacks === 'draw' ? 'draw' : 'continue'; message = `${p.name} meets ${a.name}. ${outcome === 'draw' ? 'A draw!' : 'Both cancel out.'}`; }
    else { outcome = p.strength > a.strength ? 'player' : 'ai'; message = `${outcome === 'player' ? p.name : a.name} beats ${outcome === 'player' ? a.name : p.name}.`; }
  } else if (p.kind === 'attack') {
    if (a.kind === 'block' && stopped(p, a, rules)) message = `Your ${p.name} was blocked.`;
    else { outcome = 'player'; message = a.kind === 'reload' ? `Your ${p.name} caught your rival reloading!` : `${p.name} breaks through ${a.name}!`; }
  } else if (a.kind === 'attack') {
    if (p.kind === 'block' && stopped(a, p, rules)) message = `You blocked their ${a.name}!`;
    else { outcome = 'ai'; message = p.kind === 'reload' ? `Their ${a.name} caught you reloading!` : `${a.name} breaks through your ${p.name}!`; }
  } else message = p.kind === 'reload' && a.kind === 'reload' ? 'Both reload. One more គ្រាប់ each.' : p.kind === 'block' && a.kind === 'block' ? 'Both block. The standoff continues.' : p.kind === 'reload' ? 'You reload safely. +1 គ្រាប់.' : 'Your rival reloads safely. +1 គ្រាប់.';
  const nextAmmo = (ammo: number, move: Move, won: boolean) => ammo + (move.kind === 'reload' ? 1 : 0) - (move.kind === 'attack' && (rules.spendFailedAttacks || won) ? move.cost : 0);
  return { playerMove, aiMove, playerAmmo: nextAmmo(playerAmmo, p, outcome === 'player'), aiAmmo: nextAmmo(aiAmmo, a, outcome === 'ai'), outcome, message };
}
