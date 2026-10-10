import { chooseAI, type Difficulty } from './ai';
import { DEFAULT_PROFILE, randomOpponent, type AvatarProfile } from './avatars';
import { awardGame, type MatchProgress, type MatchSettings } from './match';
import type { MoveId, Round } from './rules';
import type { Phase } from './characterState';
export type SoloSession = { playerAmmo: number; aiAmmo: number; history: Round[]; botHistory: Round[]; lockedAI: MoveId; aiProfile: AvatarProfile; phase: Phase; chosen?: MoveId; count: number; deadline: number; gameNumber: number; progress: MatchProgress; timedOut: boolean };
export function createSolo(difficulty: Difficulty, settings: MatchSettings, player = DEFAULT_PROFILE, now = Date.now(), opponent?: AvatarProfile): SoloSession {
  return { playerAmmo: 0, aiAmmo: 0, history: [], botHistory: [], lockedAI: chooseAI({ playerAmmo: 0, aiAmmo: 0, history: [] }, difficulty), aiProfile: opponent ? { ...opponent } : randomOpponent(player.avatarId), phase: 'choose', count: 3, deadline: now + settings.roundSeconds * 1000, gameNumber: 1, progress: { scores: { player: 0, ai: 0 }, completedGame: 0, championId: null }, timedOut: false };
}
export function finishSoloGame(session: SoloSession, settings: MatchSettings): SoloSession {
  const outcome = session.history.at(-1)?.outcome;
  if (!outcome || outcome === 'continue') throw new Error('Finish a game before scoring.');
  const progress = awardGame(session.progress, session.gameNumber, outcome === 'draw' ? null : outcome, settings.winsRequired);
  return { ...session, progress, phase: progress.championId ? 'over' : 'intermission' };
}
export function nextSoloGame(session: SoloSession, difficulty: Difficulty, settings: MatchSettings, now = Date.now()): SoloSession {
  if (session.phase !== 'intermission') throw new Error('Next game requires an intermission.');
  return { ...session, playerAmmo: 0, aiAmmo: 0, history: [], phase: 'choose', chosen: undefined, count: 3, timedOut: false, deadline: now + settings.roundSeconds * 1000, gameNumber: session.gameNumber + 1, lockedAI: chooseAI({ playerAmmo: 0, aiAmmo: 0, history: session.botHistory }, difficulty) };
}
export function deadlineMove(move: MoveId, deadline: number, now = Date.now()): MoveId { return now >= deadline ? 'block1' : move; }
