import { MOVES, type MoveId } from '../rules';

export type BattlePlayer = { id: string; ammo: number; active: boolean; eliminatedRound: number | null };
export type LockedAction = { playerId: string; move: MoveId; targetId?: string };
export type AttackEvent = { attackerId: string; targetId: string; move: MoveId; result: 'hit' | 'blocked' | 'canceled' | 'outmatched' };
export type BattleResult = {
  players: BattlePlayer[]; actions: LockedAction[]; events: AttackEvent[];
  eliminated: string[]; forfeits: string[]; outcome: 'continue' | 'winner' | 'draw'; winnerId: string | null;
};
export type Placement = { rank: number; playerIds: string[]; eliminatedRound: number | null };

export function validateAction(players: readonly BattlePlayer[], action: LockedAction) {
  const actor = players.find(p => p.id === action.playerId);
  if (!actor?.active) throw new Error('Only active players can choose a move.');
  if (!Object.hasOwn(MOVES, action.move)) throw new Error('Unknown move.');
  const move = MOVES[action.move];
  if (actor.ammo < move.cost) throw new Error('Insufficient ammo.');
  if (move.kind === 'attack') {
    if (action.targetId === actor.id) throw new Error('Choose another player as your target.');
    if (!players.some(p => p.id === action.targetId && p.active)) throw new Error('Choose an active target.');
  } else if (action.targetId !== undefined) throw new Error('Only attacks have targets.');
}

export function winner(players: readonly BattlePlayer[]) {
  const alive = players.filter(p => p.active);
  return { outcome: alive.length === 0 ? 'draw' as const : alive.length === 1 ? 'winner' as const : 'continue' as const, winnerId: alive.length === 1 ? alive[0].id : null };
}

// Pure, server-used simultaneous resolution. No ordering advantage: every
// attack uses the initial roster/actions, even if its attacker also gets hit.
export function resolveBattle(players: readonly BattlePlayer[], actions: readonly LockedAction[], round: number, forfeits: readonly string[] = []): BattleResult {
  if (!Number.isSafeInteger(round) || round < 1) throw new Error('Invalid round.');
  if (new Set(players.map(p => p.id)).size !== players.length) throw new Error('Duplicate player.');
  if (players.some(p => !Number.isSafeInteger(p.ammo) || p.ammo < 0)) throw new Error('Invalid ammo.');
  const active = players.filter(p => p.active);
  const byId = new Map<string, LockedAction>();
  for (const action of actions) {
    validateAction(players, action);
    if (byId.has(action.playerId)) throw new Error('Duplicate action.');
    byId.set(action.playerId, action);
  }
  const expired = new Set(forfeits);
  if ([...expired].some(id => !active.some(p => p.id === id))) throw new Error('Invalid forfeit.');
  if (active.some(p => !byId.has(p.id) && !expired.has(p.id))) throw new Error('Waiting for every active player.');
  const eliminated = new Set(expired);
  const events: AttackEvent[] = [];
  for (const action of actions) {
    const attack = MOVES[action.move];
    if (attack.kind !== 'attack') continue;
    const targetId = action.targetId!;
    const defending = byId.get(targetId);
    const defense = defending ? MOVES[defending.move] : undefined;
    let result: AttackEvent['result'] = 'hit';
    if (defense?.kind === 'block' && defense.stops.includes(action.move)) result = 'blocked';
    else if (defense?.kind === 'attack' && defending?.targetId === action.playerId) {
      // Strength protects only against the opponent you also attack.
      if (attack.strength === defense.strength) result = 'canceled';
      else if (attack.strength < defense.strength) result = 'outmatched';
    }
    if (result === 'hit') eliminated.add(targetId);
    events.push({ attackerId: action.playerId, targetId, move: action.move, result });
  }
  const next = players.map(p => {
    if (!p.active) return { ...p };
    const action = byId.get(p.id), move = action ? MOVES[action.move] : undefined;
    return { ...p, ammo: p.ammo + (move?.kind === 'reload' ? 1 : 0) - (move?.cost ?? 0), active: !eliminated.has(p.id), eliminatedRound: eliminated.has(p.id) ? round : p.eliminatedRound };
  });
  return { players: next, actions: actions.map(a => ({ ...a })), events, eliminated: [...eliminated], forfeits: [...expired], ...winner(next) };
}

export function placements(players: readonly BattlePlayer[]): Placement[] {
  const groups = new Map<number, string[]>();
  for (const player of players) {
    const key = player.active ? Infinity : player.eliminatedRound ?? 0;
    groups.set(key, [...(groups.get(key) ?? []), player.id]);
  }
  let rank = 1;
  return [...groups.entries()].sort(([a], [b]) => b - a).map(([round, playerIds]) => {
    const group = { rank, playerIds, eliminatedRound: round === Infinity ? null : round };
    rank += playerIds.length;
    return group;
  });
}
