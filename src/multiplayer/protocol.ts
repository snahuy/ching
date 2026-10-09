import type { ActivityEvent, ReactionId } from '../activity';
import type { MatchSettings } from '../match';
import type { Difficulty } from '../ai';
import type { AvatarProfile } from '../avatars';
import type { BattlePlayer, LockedAction, AttackEvent, Placement } from './rules';
export type RoomPhase = 'lobby' | 'choosing' | 'countdown' | 'reveal' | 'reaction' | 'intermission' | 'finished';
export type RoomPlayer = BattlePlayer & {
  score: number; botDifficulty: Difficulty | null; nickname: string; profile: AvatarProfile; connected: boolean; ready: boolean;
  participating: boolean; locked: boolean; left: boolean; reconnectUntil: number | null; forfeitPending: boolean;
};
export type RoundHistory = { game: number; round: number; kind: 'actions' | 'disconnect'; actions: LockedAction[]; events: AttackEvent[]; eliminated: string[]; forfeits: string[] };
export type PublicRoom = {
  activity: ActivityEvent[]; activityMatchId: string; reactionReadyAt: number; settings: MatchSettings; gameNumber: number; championId: string | null; lastGame: { game: number; winnerId: string | null; scores: Record<string, number> } | null; code: string; hostId: string | null; phase: RoomPhase; round: number; roundId: string;
  players: RoomPlayer[]; history: RoundHistory[]; winnerId: string | null; outcome: 'continue' | 'winner' | 'draw';
  placements: Placement[]; phaseEndsAt: number | null; serverNow: number; selfId: string; selfAction: LockedAction | null;
};
export type RoomSession = { code: string; playerId: string; token: string };
export type ClientMessage =
  | { type: 'create'; nickname: string; profile: AvatarProfile }
  | { type: 'join'; code: string; nickname: string; profile: AvatarProfile }
  | { type: 'resume'; code: string; token: string }
  | { type: 'ready'; ready: boolean }
  | { type: 'profile'; profile: AvatarProfile }
  | { type: 'settings'; settings: MatchSettings }
  | { type: 'addBot'; difficulty: Difficulty }
  | { type: 'removeBot'; playerId: string }
  | { type: 'start' }
  | { type: 'lock'; roundId: string; move: string; targetId?: string }
  | { type: 'reaction'; reaction: ReactionId; requestId: string; matchId: string }
  | { type: 'again' }
  | { type: 'leave' };
export type ServerMessage =
  | { type: 'session'; session: RoomSession }
  | { type: 'state'; room: PublicRoom }
  | { type: 'error'; message: string; fatal?: boolean }
  | { type: 'left' };
