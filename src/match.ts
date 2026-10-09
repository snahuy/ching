export type MatchSettings = { roundSeconds: number; winsRequired: number };
export const DEFAULT_MATCH_SETTINGS: MatchSettings = { roundSeconds: 10, winsRequired: 5 };
export const INTERMISSION_MS = 2500;
export function validateMatchSettings(value: unknown): MatchSettings {
  if (!value || typeof value !== 'object') throw new Error('Choose timer and match target.');
  const s = value as Record<string, unknown>;
  if (typeof s.roundSeconds !== 'number' || !Number.isInteger(s.roundSeconds) || s.roundSeconds < 1 || s.roundSeconds > 300) throw new Error('Round timer must be a whole number from 1 to 300 seconds.');
  if (typeof s.winsRequired !== 'number' || !Number.isInteger(s.winsRequired) || s.winsRequired < 1 || s.winsRequired > 100) throw new Error('Wins required must be a whole number from 1 to 100.');
  return { roundSeconds: s.roundSeconds, winsRequired: s.winsRequired };
}
export type MatchProgress = { scores: Record<string, number>; completedGame: number; championId: string | null };
// A game sequence number makes scoring idempotent, including retries/reconnects.
export function awardGame(progress: MatchProgress, game: number, winnerId: string | null, winsRequired: number): MatchProgress {
  if (game <= progress.completedGame || progress.championId) return progress;
  if (game !== progress.completedGame + 1) throw new Error('Games must finish in order.');
  const scores = { ...progress.scores };
  if (winnerId !== null) {
    if (!Object.hasOwn(scores, winnerId)) throw new Error('Winner must be a match participant.');
    scores[winnerId]++;
  }
  return { scores, completedGame: game, championId: winnerId !== null && scores[winnerId] >= winsRequired ? winnerId : null };
}
