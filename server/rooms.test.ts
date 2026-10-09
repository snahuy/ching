import { describe, expect, it, vi } from 'vitest';
import { RoomManager, ROOM_LIMITS } from './rooms';
import { DEFAULT_PROFILE } from '../src/avatars';
function setup(count = 2) {
  let now = 1000;
  const manager = new RoomManager({ now: () => now });
  const sessions = [manager.create('c0', 'Player 0', DEFAULT_PROFILE)];
  for (let i = 1; i < count; i++) sessions.push(manager.join(`c${i}`, sessions[0].code, `Player ${i}`, DEFAULT_PROFILE));
  manager.setSettings('c0', { roundSeconds: 300, winsRequired: 1 });
  const tick = (ms: number) => { now += ms; manager.tick(); };
  const start = () => { sessions.forEach((_, i) => manager.setReady(`c${i}`, true)); manager.start('c0'); };
  const lock = (index: number, move = 'reload', target?: number) => manager.lock(`c${index}`, manager.view(`c${index}`).roundId, move, target === undefined ? undefined : sessions[target].playerId);
  const finishRound = () => { tick(ROOM_LIMITS.clapMs); tick(ROOM_LIMITS.moveMs); tick(ROOM_LIMITS.revealMs - ROOM_LIMITS.moveMs); };
  return { manager, sessions, tick, start, lock, finishRound };
}
describe('private room authority and reliability', () => {
  it('requires 2–8 connected, ready players and authorizes only the host', () => {
    const s = setup();
    expect(() => s.manager.start('c0')).toThrow('ready'); expect(() => s.manager.start('c1')).toThrow('host');
    expect(() => s.manager.setReady('outsider', true)).toThrow('Join');
    s.start(); expect(s.manager.view('c0').players.every(p => p.active && p.ammo === 0)).toBe(true);
  });
  it('enforces capacity, unique nicknames, validated profiles, and private room codes', () => {
    const s = setup(8);
    expect(() => s.manager.join('extra', s.sessions[0].code, 'Extra', DEFAULT_PROFILE)).toThrow('full');
    expect(s.sessions[0].code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    expect(() => s.manager.create('bad', '', DEFAULT_PROFILE)).toThrow('nickname');
    expect(() => s.manager.create('bad', 'Good name', { avatarId: 'fake', backgroundId: 'mint' })).toThrow('avatar');
    const smaller = setup(); expect(() => smaller.manager.join('x', smaller.sessions[0].code, 'player 0', DEFAULT_PROFILE)).toThrow('taken');
  });
  it('withholds other players’ actions and targets until the actual simultaneous reveal', () => {
    const s = setup(); s.start(); s.lock(0); s.lock(1); s.finishRound();
    s.lock(0, 'ching', 1);
    const guest = s.manager.view('c1');
    expect(guest.selfAction).toBeNull(); expect(guest.players[0].locked).toBe(true);
    expect(JSON.stringify(guest)).not.toContain('"move":"ching"'); expect(JSON.stringify(guest)).not.toContain(s.sessions[0].token);
    s.lock(1, 'reload'); expect(s.manager.view('c1').phase).toBe('countdown'); expect(s.manager.view('c1').history).toHaveLength(1);
    s.tick(ROOM_LIMITS.clapMs); expect(s.manager.view('c1').history[1].actions[0].targetId).toBe(s.sessions[1].playerId);
  });
  it('rejects duplicate locks and stale round IDs, preserving the original choice', () => {
    const s = setup(); s.start(); const old = s.manager.view('c0').roundId;
    s.lock(0); expect(() => s.lock(0, 'block1')).toThrow('already locked'); expect(s.manager.view('c0').selfAction?.move).toBe('reload');
    s.lock(1); s.finishRound(); expect(() => s.manager.lock('c0', old, 'reload')).toThrow('closed');
  });
  it('eliminated players spectate, cannot act or be targeted, and new guests wait', () => {
    const s = setup(3); s.start(); s.lock(0); s.lock(1); s.lock(2); s.finishRound();
    s.lock(0, 'ching', 1); s.lock(1); s.lock(2, 'block1'); s.finishRound();
    expect(s.manager.view('c1').players.find(p => p.id === s.sessions[1].playerId)?.active).toBe(false);
    expect(() => s.lock(1)).toThrow('Spectators'); expect(() => s.lock(0, 'ching', 1)).toThrow();
    const next = s.manager.join('waiting', s.sessions[0].code, 'Next game', DEFAULT_PROFILE);
    expect(s.manager.view('waiting').players.find(p => p.id === next.playerId)?.participating).toBe(false);
    expect(() => s.manager.setReady('waiting', true)).toThrow('lobby'); expect(() => s.manager.lock('waiting', s.manager.view('waiting').roundId, 'reload')).toThrow('Spectators');
  });
  it('reconnects within the grace window with the same player, ammo, and locked action', () => {
    const s = setup(); s.start(); s.lock(0); s.lock(1); s.finishRound(); s.lock(0, 'ching', 1);
    s.manager.disconnect('c0'); s.tick(ROOM_LIMITS.reconnectMs - 1);
    const resumed = s.manager.resume('new', s.sessions[0].code, s.sessions[0].token);
    expect(resumed.playerId).toBe(s.sessions[0].playerId); expect(s.manager.view('new').selfAction?.move).toBe('ching');
    expect(s.manager.view('new').players.find(p => p.id === resumed.playerId)?.ammo).toBe(1);
    expect(() => s.manager.resume('intruder', s.sessions[0].code, 'wrong-token')).toThrow('expired');
  });
  it('a superseded connection cannot act or disconnect the resumed player', () => {
    const s = setup(); s.manager.resume('new', s.sessions[0].code, s.sessions[0].token); s.manager.disconnect('c0');
    expect(s.manager.view('new').players[0].connected).toBe(true); expect(() => s.manager.setReady('c0', true)).toThrow('Join');
  });
  it('expires an unlocked disconnected player at a boundary without granting reload ammo', () => {
    const s = setup(3); s.start(); s.manager.disconnect('c2'); s.tick(ROOM_LIMITS.reconnectMs);
    s.lock(0); s.lock(1); s.finishRound();
    const p = s.manager.view('c0').players.find(p => p.id === s.sessions[2].playerId)!;
    expect(p.active).toBe(false); expect(p.ammo).toBe(0); expect(p.eliminatedRound).toBe(1);
    expect(s.manager.view('c0').history[0].forfeits).toEqual([p.id]);
  });
  it('does not restore expired players into the active match when they resume late', () => {
    const s = setup(3); s.start(); s.manager.disconnect('c2'); s.tick(ROOM_LIMITS.reconnectMs + 1);
    s.manager.resume('late', s.sessions[0].code, s.sessions[2].token);
    expect(s.manager.view('late').players.find(p => p.id === s.sessions[2].playerId)?.forfeitPending).toBe(true);
    expect(() => s.manager.lock('late', s.manager.view('late').roundId, 'reload')).toThrow('Spectators');
    s.lock(0); s.lock(1); s.finishRound(); expect(s.manager.view('late').players.find(p => p.id === s.sessions[2].playerId)?.active).toBe(false);
  });
  it('keeps an expired player’s locked attack in simultaneous resolution', () => {
    const s = setup(3); s.start(); s.lock(0); s.lock(1); s.lock(2); s.finishRound();
    s.lock(0, 'ching', 1); s.manager.disconnect('c0'); s.tick(ROOM_LIMITS.reconnectMs + 1);
    s.lock(1, 'ching', 2); s.lock(2, 'ching', 0); s.finishRound();
    const room = s.manager.view('c1'); expect(room.outcome).toBe('draw');
    expect(room.history.at(-1)?.actions).toHaveLength(3); expect(room.players.every(p => p.ammo === 0 && !p.active)).toBe(true);
  });
  it('transfers host ownership on disconnect or leave and lets the remaining host rematch', () => {
    const s = setup(); s.start(); s.manager.disconnect('c0', true);
    expect(s.manager.view('c1').hostId).toBe(s.sessions[1].playerId); expect(s.manager.view('c1').phase).toBe('finished');
    expect(s.manager.view('c1').winnerId).toBe(s.sessions[1].playerId); s.manager.again('c1');
    expect(s.manager.view('c1').phase).toBe('lobby'); expect(s.manager.view('c1').players).toHaveLength(1);
  });
  it('returns survivors, eliminated players, and waiting guests to a fresh lobby', () => {
    const s = setup(); s.start(); const wait = s.manager.join('waiting', s.sessions[0].code, 'Waiting', DEFAULT_PROFILE);
    s.lock(0); s.lock(1); s.finishRound(); s.lock(0, 'ching', 1); s.lock(1); s.finishRound();
    expect(() => s.manager.again('c1')).toThrow('host'); s.manager.again('c0');
    const room = s.manager.view('c0'); expect(room.players).toHaveLength(3); expect(room.players.every(p => !p.ready && !p.active && !p.participating && p.ammo === 0)).toBe(true);
    expect(room.players.some(p => p.id === wait.playerId)).toBe(true); expect(room.history).toEqual([]);
  });
  it('cleans up empty and inactive rooms and invalidates their sessions', () => {
    const empty = setup(); empty.manager.disconnect('c0'); empty.manager.disconnect('c1'); empty.tick(ROOM_LIMITS.emptyMs);
    expect(empty.manager.rooms.size).toBe(0); expect(() => empty.manager.resume('x', empty.sessions[0].code, empty.sessions[0].token)).toThrow('expired');
    const idle = setup(); idle.tick(ROOM_LIMITS.idleMs); expect(idle.manager.rooms.size).toBe(0); expect(() => idle.manager.view('c0')).toThrow('Join');
  });
});

describe('server synchronized activity and reactions', () => {
  it('validates membership, presets, request IDs, cooldown and match generation', () => {
    const s=setup(); s.start(); const match=s.manager.view('c0').activityMatchId;
    expect(()=>s.manager.react('outside','hello','a',match)).toThrow('Join');
    expect(()=>s.manager.react('c0','custom text','a',match)).toThrow('preset');
    expect(()=>s.manager.react('c0','hello','<bad>',match)).toThrow('Invalid');
    s.manager.react('c0','hello','a',match);
    s.manager.react('c0','hello','a',match);
    expect(s.manager.view('c1').activity).toHaveLength(1);
    expect(()=>s.manager.react('c0','haha','b',match)).toThrow('three seconds');
    s.tick(3000);s.manager.react('c0','haha','b',match);
    expect(s.manager.view('c1').activity).toHaveLength(2);
    expect(()=>s.manager.react('c0','hello','c','earlier')).toThrow('earlier match');
  });
  it('retains reactions and cooldown across reconnection without duplicating events', () => {
    const s=setup();s.start();const match=s.manager.view('c0').activityMatchId;
    s.manager.react('c0','hello','a',match);s.manager.disconnect('c0');
    s.manager.resume('resumed',s.sessions[0].code,s.sessions[0].token);
    s.manager.react('resumed','hello','a',match);
    expect(s.manager.view('resumed').activity).toHaveLength(1);
    expect(()=>s.manager.react('resumed','haha','b',match)).toThrow('three seconds');
  });
  it('publishes actions and targets only on reveal, then awards one game and match event', () => {
    const s=setup();s.start();s.lock(0);s.lock(1);s.finishRound();
    s.lock(0,'ching',1); expect(s.manager.view('c1').activity).toHaveLength(1);
    s.lock(1,'reload');expect(s.manager.view('c1').activity).toHaveLength(1);
    s.tick(ROOM_LIMITS.clapMs);
    const event=s.manager.view('c1').activity[1];expect(event.kind).toBe('round');
    if(event.kind==='round') {expect(event.actions[0].targetId).toBe(s.sessions[1].playerId);expect(event.eliminated).toEqual([s.sessions[1].playerId]);}
    s.tick(ROOM_LIMITS.revealMs);s.tick(ROOM_LIMITS.revealMs);s.tick(1);
    const feed=s.manager.view('c0').activity;
    expect(feed.filter(e=>e.kind==='game')).toHaveLength(1);expect(feed.filter(e=>e.kind==='match')).toHaveLength(1);
    expect(new Set(feed.map(e=>e.id)).size).toBe(feed.length);
    s.manager.again('c0');expect(s.manager.view('c0').activity).toEqual([]);
  });
  it('records every revealed target, block, elimination and a zero-point multiplayer draw', () => {
    const s=setup(3);s.start();s.lock(0);s.lock(1);s.lock(2);s.finishRound();
    s.lock(0,'ching',1);s.lock(1,'ching',2);s.lock(2,'ching',0);s.finishRound();
    const view=s.manager.view('c0'), event=view.activity.find(e=>e.kind==='game');
    expect(event?.kind).toBe('game');if(event?.kind==='game'){expect(event.winnerId).toBeNull();expect(Object.values(event.scores)).toEqual([0,0,0]);}
    const round=view.activity.filter(e=>e.kind==='round').at(-1);if(round?.kind==='round'){expect(round.actions).toHaveLength(3);expect(round.eliminated).toHaveLength(3);expect(round.draw).toBe(true);}
  });
});


describe('server bot reaction scheduling', () => {
  it('waits for revealed blocks, respects cooldown, and sends good game after the champion event', () => {
    const random=vi.spyOn(Math,'random').mockReturnValue(0);
    try {
      const s=setup(1);s.manager.addBot('c0','easy');s.start();
      const room=s.manager.rooms.get(s.sessions[0].code)!;
      const bot=[...room.members.values()].find(p=>p.botDifficulty)!;
      bot.ammo=1;room.locks.set(bot.id,{playerId:bot.id,move:'ching',targetId:s.sessions[0].playerId});
      s.lock(0,'block1');expect(s.manager.view('c0').activity).toHaveLength(0);
      s.tick(ROOM_LIMITS.clapMs);expect(s.manager.view('c0').activity).toHaveLength(1);
      s.tick(250);const reactions=s.manager.view('c0').activity.filter(e=>e.kind==='reaction');
      expect(reactions).toHaveLength(1);if(reactions[0].kind==='reaction')expect(reactions[0].reaction).toBe('niceBlock');
      s.tick(ROOM_LIMITS.moveMs);s.tick(ROOM_LIMITS.revealMs);
      s.lock(0,'reload');s.finishRound();
      bot.ammo=0;room.locks.set(bot.id,{playerId:bot.id,move:'reload'});
      s.manager.lock('c0',s.manager.view('c0').roundId,'ching',bot.id);s.finishRound();s.tick(3000);
      const feed=s.manager.view('c0').activity;const good=feed.find(e=>e.kind==='reaction'&&e.reaction==='goodGame');expect(good).toBeTruthy();expect(feed.findIndex(e=>e.kind==='match')).toBeLessThan(feed.indexOf(good!));
      const times=feed.filter(e=>e.kind==='reaction').map(e=>e.at);expect(times[1]-times[0]).toBeGreaterThanOrEqual(3000);
    } finally { random.mockRestore(); }
  });
});
