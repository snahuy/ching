import { expect, it } from 'vitest';
import { createSolo, deadlineMove, finishSoloGame, nextSoloGame } from './solo';
import { resolveRound } from './rules';
const settings = { roundSeconds: 5, winsRequired: 2 };
it('single-player enforces the same deadline, including a late clicked attack', () => {
  const s = createSolo('hard', settings, undefined, 1000); expect(s.deadline).toBe(6000);
  expect(deadlineMove('ching', s.deadline, 5999)).toBe('ching'); expect(deadlineMove('ching', s.deadline, 6000)).toBe('block1'); expect(deadlineMove('reload', s.deadline, 9000)).toBe('block1');
});
it('single-player preserves scores and character but resets ammo, history, and deadline between games', () => {
  const s = createSolo('normal', settings, undefined, 1000), win = resolveRound(1, 0, 'ching', 'reload');
  const done = finishSoloGame({ ...s, playerAmmo: win.playerAmmo, aiAmmo: win.aiAmmo, history: [win], botHistory: [win] }, settings);
  expect(done.progress.scores.player).toBe(1); expect(done.phase).toBe('intermission');
  const next = nextSoloGame(done, 'normal', settings, 20_000);
  expect(next.gameNumber).toBe(2); expect(next.playerAmmo).toBe(0); expect(next.aiAmmo).toBe(0); expect(next.history).toEqual([]); expect(next.botHistory).toHaveLength(1); expect(next.aiProfile).toEqual(s.aiProfile); expect(next.deadline).toBe(25_000); expect(next.progress).toEqual(done.progress);
  const end = finishSoloGame({ ...next, history: [win] }, settings); expect(end.phase).toBe('over'); expect(end.progress.championId).toBe('player'); expect(end.progress.scores.player).toBe(2);
  expect(finishSoloGame(end, settings).progress).toBe(end.progress);
  expect(createSolo('normal', settings).progress.scores).toEqual({ player: 0, ai: 0 });
});
it('single-player draws award nothing and the rival can win the match', () => {
  const draw = resolveRound(1, 1, 'ching', 'ching', { equalAttacks: 'draw', blocksStopWeaker: false, spendFailedAttacks: true });
  const s = finishSoloGame({ ...createSolo('easy', settings), history: [draw] }, settings); expect(s.progress.scores).toEqual({ player: 0, ai: 0 }); expect(s.phase).toBe('intermission');
  const aiWin = resolveRound(0, 1, 'reload', 'ching');
  const end = finishSoloGame({ ...createSolo('easy', { ...settings, winsRequired: 1 }), history: [aiWin] }, { ...settings, winsRequired: 1 }); expect(end.progress.championId).toBe('ai'); expect(end.phase).toBe('over');
});

it.each(['player','ai'] as const)('awards %s exactly once and preserves resolved ammo until the next game', winner=>{
  const round=resolveRound(3,3,winner==='player'?'ching':'reload',winner==='ai'?'ching':'reload');
  const s={...createSolo('easy',settings),history:[round],playerAmmo:round.playerAmmo,aiAmmo:round.aiAmmo};
  const result=finishSoloGame(s,settings),retry=finishSoloGame(result,settings);
  expect(result.phase).toBe('intermission');expect(result.progress.scores[winner]).toBe(1);expect(retry.progress.scores[winner]).toBe(1);
  expect(result.playerAmmo).toBe(round.playerAmmo);expect(result.aiAmmo).toBe(round.aiAmmo);
  const next=nextSoloGame(result,'easy',settings,5000);expect(next.playerAmmo).toBe(0);expect(next.aiAmmo).toBe(0);expect(next.progress.scores[winner]).toBe(1);
});
it('refuses to award points for a blocked or canceled move round',()=>{
  for(const ai of ['block1','ching'] as const){const round=resolveRound(1,1,'ching',ai);const s={...createSolo('easy',settings),history:[round]};expect(()=>finishSoloGame(s,settings)).toThrow('Finish a game');expect(s.progress.scores).toEqual({player:0,ai:0});}
});
