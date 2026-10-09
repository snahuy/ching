import { afterEach, describe, expect, it, vi } from 'vitest';
import { RoomManager, ROOM_LIMITS } from './rooms';
import { DEFAULT_PROFILE, AVATARS } from '../src/avatars';
import { INTERMISSION_MS } from '../src/match';
import { validateAction } from '../src/multiplayer/rules';
afterEach(() => vi.restoreAllMocks());
function setup(count = 2, winsRequired = 2, roundSeconds = 5) {
  let now = 1000;
  const m = new RoomManager({ now: () => now });
  const sessions = [m.create('c0', 'Dara', DEFAULT_PROFILE)];
  for (let i = 1; i < count; i++) sessions.push(m.join(`c${i}`, sessions[0].code, `Friend ${i}`, DEFAULT_PROFILE));
  m.setSettings('c0', { roundSeconds, winsRequired });
  const tick = (ms: number, run = true) => { now += ms; if (run) m.tick(); };
  const view = () => m.view('c0');
  const lock = (i: number, move = 'reload', target?: number) => m.lock(`c${i}`, view().roundId, move, target === undefined ? undefined : sessions[target].playerId);
  const start = () => { sessions.forEach((_, i) => m.setReady(`c${i}`, true)); m.start('c0'); };
  const resolve = () => { tick(ROOM_LIMITS.clapMs); tick(ROOM_LIMITS.moveMs); tick(ROOM_LIMITS.revealMs - ROOM_LIMITS.moveMs); };
  const win = () => { lock(0); lock(1); resolve(); lock(0, 'ching', 1); lock(1); resolve(); };
  return { m, sessions, tick, view, lock, start, resolve, win };
}
describe('timed server-authoritative matches', () => {
  it('defaults only unsubmitted active players at exactly the server deadline, never spectators', () => {
    const s = setup(); s.start(); s.m.join('wait', s.sessions[0].code, 'Waiting', DEFAULT_PROFILE);
    expect(s.view().phaseEndsAt).toBe(6000); s.lock(0); s.tick(4999); expect(s.view().phase).toBe('choosing');
    s.tick(1); expect(s.view().phase).toBe('countdown'); expect(s.view().history).toEqual([]);
    expect(s.m.view('c1').selfAction?.move).toBe('block1'); expect(s.view().selfAction?.move).toBe('reload');
    s.resolve(); const room = s.view(); expect(room.round).toBe(2); expect(room.players.map(p => p.ammo)).toEqual([1, 0, 0]); expect(room.history[0].actions).toHaveLength(2); expect(room.phaseEndsAt).toBe(room.serverNow + 5000);
  });
  it('enforces expired deadlines on incoming locks even before the periodic tick runs', () => {
    const s = setup(); s.start(); const id = s.view().roundId; s.tick(5000, false);
    expect(() => s.m.lock('c0', id, 'reload')).toThrow('closed'); expect(s.view().selfAction?.move).toBe('block1');
    expect(s.view().players.every(p => p.locked)).toBe(true);
  });
  it('resolves early when everyone locks and uses fresh deadlines after paused animations', () => {
    const s = setup(); s.start(); s.tick(1000); s.lock(0); s.lock(1); expect(s.view().phase).toBe('countdown'); expect(s.view().phaseEndsAt).toBe(2000 + ROOM_LIMITS.clapMs);
    s.tick(ROOM_LIMITS.clapMs); expect(s.view().phase).toBe('reveal'); s.tick(ROOM_LIMITS.moveMs); expect(s.view().phase).toBe('reaction');
    s.tick(ROOM_LIMITS.revealMs - ROOM_LIMITS.moveMs); expect(s.view().phase).toBe('choosing'); expect(s.view().phaseEndsAt).toBe(s.view().serverNow + 5000);
  });
  it('awards only game wins, revives all participants, preserves scores, and ends at the exact target', () => {
    const s = setup(); s.start(); s.lock(0); s.lock(1); s.resolve(); expect(s.view().players.every(p => p.score === 0)).toBe(true);
    s.lock(0, 'ching', 1); s.lock(1); s.resolve(); expect(s.view().phase).toBe('intermission'); expect(s.view().players.map(p => p.score)).toEqual([1, 0]);
    expect(s.view().lastGame?.winnerId).toBe(s.sessions[0].playerId); s.tick(INTERMISSION_MS - 1); expect(s.view().gameNumber).toBe(1);
    s.tick(1); expect(s.view().gameNumber).toBe(2); expect(s.view().players.every(p => p.active && p.ammo === 0)).toBe(true); expect(s.view().players.map(p => p.score)).toEqual([1, 0]);
    s.win(); const final = s.view(); expect(final.phase).toBe('finished'); expect(final.championId).toBe(s.sessions[0].playerId); expect(final.players.map(p => p.score)).toEqual([2, 0]);
    s.tick(10_000); expect(s.view().players.map(p => p.score)).toEqual([2, 0]); expect(s.view().gameNumber).toBe(2);
    expect(() => s.m.start('c0')).toThrow('running'); s.m.again('c0'); expect(s.view().players.every(p => p.score === 0 && !p.ready)).toBe(true); expect(s.view().settings).toEqual({ roundSeconds: 5, winsRequired: 2 });
  });
  it('simultaneous multi-player draws award no points and automatically start a new game', () => {
    const s = setup(3); s.start(); [0, 1, 2].forEach(i => s.lock(i)); s.resolve(); [0, 1, 2].forEach(i => s.lock(i, 'ching', (i + 1) % 3)); s.resolve();
    expect(s.view().phase).toBe('intermission'); expect(s.view().outcome).toBe('draw'); expect(s.view().players.every(p => p.score === 0)).toBe(true);
    s.tick(INTERMISSION_MS); expect(s.view().gameNumber).toBe(2); expect(s.view().players.every(p => p.active && p.ammo === 0 && p.score === 0)).toBe(true);
  });
  it('reconnects with the same score, no duplicate award, and keeps waiting guests out of subsequent games', () => {
    const s = setup(); s.start(); s.win(); s.m.join('wait', s.sessions[0].code, 'Waiting', DEFAULT_PROFILE); s.m.disconnect('c0');
    s.tick(1000); s.m.resume('back', s.sessions[0].code, s.sessions[0].token); expect(s.m.view('back').players.find(p => p.id === s.sessions[0].playerId)?.score).toBe(1);
    s.tick(INTERMISSION_MS - 1000); const room = s.m.view('back'); expect(room.gameNumber).toBe(2); expect(room.players.find(p => p.id === s.sessions[0].playerId)?.score).toBe(1); expect(room.players.at(-1)?.participating).toBe(false);
  });
});
describe('lobby settings and persistent bots', () => {
  it('authorizes settings only for the lobby host, validates values, and clears human readiness', () => {
    const s = setup(); s.m.addBot('c0', 'hard'); s.m.setReady('c0', true); s.m.setReady('c1', true);
    expect(() => s.m.setSettings('c1', { roundSeconds: 15, winsRequired: 10 })).toThrow('host');
    expect(() => s.m.setSettings('c0', { roundSeconds: 5, winsRequired: 101 })).toThrow('whole number');
    expect(s.view().players.every(p => p.ready)).toBe(true);
    s.m.setSettings('c0', { roundSeconds: 15, winsRequired: 10 }); expect(s.view().players.map(p => p.ready)).toEqual([false, false, true]);
    s.start(); expect(() => s.m.setSettings('c0', { roundSeconds: 5, winsRequired: 5 })).toThrow('before'); expect(() => s.m.addBot('c0', 'easy')).toThrow('before'); expect(() => s.m.removeBot('c0', s.view().players[2].id)).toThrow('before');
  });
  it('allows one ready human with bots and privately commits legal bot actions before any human input', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const s = setup(1); s.m.addBot('c0', 'normal'); const bot = s.view().players[1];
    expect(AVATARS.some(a => a.id === bot.profile.avatarId)).toBe(true); expect(bot.ready).toBe(true); s.start();
    const room = s.m.rooms.get(s.sessions[0].code)!; const committed = structuredClone(room.locks.get(bot.id));
    expect(committed?.move).toBe('reload'); expect(s.view().players[1].locked).toBe(true); expect(s.view().history).toEqual([]); expect(JSON.stringify(s.view())).not.toContain('"move":"reload"');
    s.lock(0, 'block3'); expect(room.locks.get(bot.id)).toEqual(committed); expect(() => validateAction(s.view().players, committed!)).not.toThrow();
    expect(() => s.m.resume('intruder', s.sessions[0].code, '')).toThrow('expired');
  });
  it('enforces eight-player capacity, lets only the host remove bots, and never transfers host to a bot', () => {
    const s = setup(); for (let i = 0; i < 6; i++) s.m.addBot('c0', 'easy');
    expect(() => s.m.addBot('c0', 'hard')).toThrow('full'); expect(() => s.m.addBot('c1', 'hard')).toThrow('host'); expect(() => s.m.removeBot('c0', s.sessions[1].playerId)).toThrow('bot');
    s.m.removeBot('c0', s.view().players[2].id); expect(s.view().players).toHaveLength(7); s.m.disconnect('c0', true); expect(s.m.view('c1').hostId).toBe(s.sessions[1].playerId);
    s.m.disconnect('c1', true); expect(s.m.rooms.get(s.sessions[0].code)?.hostId).toBeNull();
  });
  it('awards a bot one game win and declares it champion at the target', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    const s = setup(1, 1); s.m.addBot('c0', 'normal'); const bot = s.view().players[1]; s.start(); s.lock(0);
    random.mockReturnValue(0.55); s.resolve(); s.lock(0); s.resolve();
    expect(s.view().phase).toBe('finished'); expect(s.view().championId).toBe(bot.id); expect(s.view().players.map(p => p.score)).toEqual([0, 1]);
  });
  it('keeps bot identities, difficulty, avatars, and settings through rematch while resetting scores', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); const s = setup(1, 1); s.m.addBot('c0', 'hard'); const bot = s.view().players[1]; s.start(); s.lock(0); s.resolve(); s.m.lock('c0', s.view().roundId, 'ching', bot.id); s.resolve();
    expect(s.view().championId).toBe(s.sessions[0].playerId); expect(s.view().players[0].score).toBe(1); s.m.again('c0');
    expect(s.view().players[1]).toMatchObject({ id: bot.id, nickname: bot.nickname, profile: bot.profile, botDifficulty: 'hard', ready: true, score: 0 }); expect(s.view().settings.winsRequired).toBe(1);
  });
  it('ends safely if the only human leaves during a bot-match intermission, without a phantom point', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const s = setup(1, 5); s.m.addBot('c0', 'hard'); const bot = s.view().players[1]; s.start(); s.lock(0); s.resolve(); s.m.lock('c0', s.view().roundId, 'ching', bot.id); s.resolve();
    expect(s.view().phase).toBe('intermission'); s.m.disconnect('c0', true);
    expect(() => s.tick(INTERMISSION_MS)).not.toThrow(); const room = s.m.rooms.get(s.sessions[0].code)!;
    expect(room.phase).toBe('finished'); expect(room.gameNumber).toBe(1); expect(room.members.get(bot.id)?.score).toBe(0);
  });
  it('cleans up a bot room when no humans remain connected', () => {
    const s = setup(1); s.m.addBot('c0', 'normal'); s.m.disconnect('c0'); s.tick(ROOM_LIMITS.emptyMs); expect(s.m.rooms.size).toBe(0);
  });
});
