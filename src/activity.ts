import { battleAnnouncement, soloAnnouncement } from './roundPresentation';
import type { AvatarProfile } from './avatars';
import { MOVES, type Round } from './rules';
import type { AttackEvent, LockedAction } from './multiplayer/rules';
import { moveName, translate, type Language } from './i18n/core';
export const REACTIONS = [
  { id: 'hello', icon: '👋', text: 'Hello!' }, { id: 'niceMove', icon: '👍', text: 'Nice move!' },
  { id: 'niceBlock', icon: '🛡️', text: 'Nice block!' }, { id: 'close', icon: '😮', text: 'That was close!' },
  { id: 'haha', icon: '😂', text: 'Haha!' }, { id: 'letsGo', icon: '🔥', text: 'Let’s go!' },
  { id: 'wellPlayed', icon: '👏', text: 'Well played!' }, { id: 'goodGame', icon: '🤝', text: 'Good game!' },
  { id: 'rematch', icon: '🔄', text: 'Rematch?' },
] as const;
export type ReactionId = typeof REACTIONS[number]['id'];
export const REACTION_COOLDOWN = 3000;
export const BUBBLE_MS = 2800;
export type ActivityActor = { id: string; name: string; profile: AvatarProfile };
export type ActivityPayload =
  | { kind: 'reaction'; sender: ActivityActor; reaction: ReactionId }
  | { kind: 'round'; game: number; round: number; actors: ActivityActor[]; actions: LockedAction[]; attacks: AttackEvent[]; eliminated: string[]; forfeits: string[]; draw: boolean; remaining?: string[]; solo?: Round }
  | { kind: 'game'; game: number; actors: ActivityActor[]; winnerId: string | null; scores: Record<string, number> }
  | { kind: 'match'; actors: ActivityActor[]; winnerId: string; wins: number };
export type ActivityEvent = ActivityPayload & { id: string; at: number };
export type ActivityState = { matchId: string; events: ActivityEvent[]; cooldowns: Record<string, number> };
export function createActivity(matchId: string): ActivityState { return { matchId, events: [], cooldowns: {} }; }
export function appendActivity(state: ActivityState, key: string, payload: ActivityPayload, now: number): ActivityState {
  const id = `${state.matchId}:${key}`;
  if (state.events.some(event => event.id === id)) return state;
  return { ...state, events: [...state.events, { ...payload, id, at: now }] };
}
export function addReaction(state: ActivityState, sender: ActivityActor, value: unknown, requestId: string, now: number): ActivityState {
  if (!REACTIONS.some(reaction => reaction.id === value)) throw new Error('Choose a preset reaction.');
  const key = `reaction:${sender.id}:${requestId}`;
  if (state.events.some(event => event.id === `${state.matchId}:${key}`)) return state;
  if (now < (state.cooldowns[sender.id] ?? 0)) throw new Error('Wait three seconds before reacting again.');
  const next = appendActivity(state, key, { kind: 'reaction', sender: { ...sender, profile: { ...sender.profile } }, reaction: value as ReactionId }, now);
  return { ...next, cooldowns: { ...next.cooldowns, [sender.id]: now + REACTION_COOLDOWN } };
}
// Only completed, revealed attack events are accepted by this policy.
export function botRoundReaction(botId: string, attacks: readonly AttackEvent[], humanIds: readonly string[], random = Math.random): ReactionId | null {
  const againstHuman = attacks.filter(attack => attack.attackerId === botId && humanIds.includes(attack.targetId));
  const reaction = againstHuman.some(attack => attack.result === 'blocked') ? 'niceBlock' : againstHuman.some(attack => attack.result === 'canceled') ? 'close' : null;
  return reaction && random() < 0.28 ? reaction : null;
}
export function soloRoundActivity(round: Round, game: number, number: number, actors: ActivityActor[]): ActivityPayload {
  const actions: LockedAction[] = [{ playerId: 'player', move: round.playerMove, ...(MOVES[round.playerMove].kind === 'attack' ? { targetId: 'ai' } : {}) }, { playerId: 'ai', move: round.aiMove, ...(MOVES[round.aiMove].kind === 'attack' ? { targetId: 'player' } : {}) }];
  const attacks: AttackEvent[] = actions.filter(action => MOVES[action.move].kind === 'attack').map(action => ({ attackerId: action.playerId, targetId: action.targetId!, move: action.move, result: round.outcome === action.playerId ? 'hit' : round.outcome === 'continue' && MOVES[actions.find(other => other.playerId !== action.playerId)!.move].kind === 'block' ? 'blocked' : round.outcome === 'continue' || round.outcome === 'draw' ? 'canceled' : 'outmatched' }));
  return { kind: 'round', game, round: number, actors, actions, attacks, eliminated: round.outcome === 'player' ? ['ai'] : round.outcome === 'ai' ? ['player'] : [], forfeits: [], draw: round.outcome === 'draw', solo: { ...round }, remaining: round.outcome === 'draw' ? [] : actors.map(a=>a.id).filter(id=>round.outcome === 'continue' || id === round.outcome) };
}
export function activityText(language: Language, event: ActivityEvent): { label: string; lines: string[] } {
  const t = (key: string, params?: Record<string, string | number>) => translate(language, key, params);
  if (event.kind === 'reaction') return { label: event.sender.name, lines: [t(REACTIONS.find(reaction => reaction.id === event.reaction)!.text)] };
  const name = (id: string) => event.actors.find(actor => actor.id === id)?.name ?? t('PLAYER');
  if (event.kind === 'match') return { label: t('activity.matchWinner', { name: name(event.winnerId), wins: event.wins }), lines: [] };
  if (event.kind === 'game') return { label: event.winnerId ? t('activity.gameWinner', { game: event.game, name: name(event.winnerId) }) : t('activity.gameDraw', { game: event.game }), lines: [t('activity.scores', { scores: event.actors.filter(actor => Object.hasOwn(event.scores, actor.id)).map(actor => `${actor.name} ${event.scores[actor.id]}`).join(', ') })] };
  const lines = event.actions.map(action => t(action.targetId ? 'activity.usedAgainst' : 'activity.used', { name: name(action.playerId), move: moveName(language, action.move), target: action.targetId ? name(action.targetId) : '' }));
  if (event.actions.length && event.actions.every(action => action.move === 'reload')) lines.push(t(event.actions.length === 2 ? 'Both reloaded' : 'Everyone reloaded'));
  else if (!event.attacks.length && !event.eliminated.length) lines.push(t('No eliminations'));
  for (const attack of event.attacks) lines.push(t(`activity.${attack.result}`, { name: name(attack.attackerId), move: moveName(language, attack.move), target: name(attack.targetId) }));
  for (const id of event.eliminated) lines.push(t(event.forfeits.includes(id) ? 'activity.forfeit' : 'activity.eliminated', { name: name(id) }));
  if (event.draw) lines.push(t('Game drawn'));
  const summary = event.solo ? soloAnnouncement(language, event.solo, name('player'), name('ai')) : battleAnnouncement(language, { ...event, events: event.attacks }, event.remaining ?? event.actions.map(a=>a.playerId).filter(id=>!event.eliminated.includes(id)), name);
  lines.push([summary.headline, summary.detail].filter(Boolean).join(' — '));
  return { label: t('Game {game} · Round {round}', { game: event.game, round: event.round }), lines };
}
