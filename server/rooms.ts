import { createActivity, appendActivity, addReaction, botRoundReaction, type ActivityState, type ActivityActor, type ReactionId } from '../src/activity.ts';
import { randomBytes, randomUUID } from 'node:crypto';
import { AVATARS, BACKGROUNDS, type AvatarProfile } from '../src/avatars.ts';
import { DEFAULT_MATCH_SETTINGS, INTERMISSION_MS, awardGame, validateMatchSettings, type MatchProgress, type MatchSettings } from '../src/match.ts';
import { chooseBot } from '../src/multiplayer/bots.ts';
import type { Difficulty } from '../src/ai.ts';
import { MOVES, type MoveId } from '../src/rules.ts';
import { placements, resolveBattle, validateAction, winner, type LockedAction } from '../src/multiplayer/rules.ts';
import type { PublicRoom, RoomPhase, RoomPlayer, RoomSession, RoundHistory } from '../src/multiplayer/protocol.ts';

export const ROOM_LIMITS = { capacity: 8, reconnectMs: 20_000, idleMs: 30 * 60_000, emptyMs: 5 * 60_000, clapMs: 720, moveMs: 420, revealMs: 2500 } as const;
type Member = Omit<RoomPlayer, 'locked'> & { token: string; connectionId: string | null };
type Room = {
  activity: ActivityState; pendingReactions: { botId: string; reaction: ReactionId; key: string; due: number }[]; settings: MatchSettings; gameNumber: number; progress: MatchProgress; lastGame: PublicRoom['lastGame']; code: string; hostId: string | null; members: Map<string, Member>; locks: Map<string, LockedAction>;
  phase: RoomPhase; round: number; roundId: string; history: RoundHistory[];
  winnerId: string | null; outcome: 'continue' | 'winner' | 'draw'; phaseEndsAt: number | null; lastActivity: number;
};
type Hooks = { now?: () => number; changed?: (code: string) => void; removed?: (code: string, connectionIds: string[]) => void };
export class RoomManager {
  rooms = new Map<string, Room>();
  connections = new Map<string, { code: string; playerId: string }>();
  private now: () => number;
  constructor(private hooks: Hooks = {}) { this.now = hooks.now ?? Date.now; }
  snapshot(): string {
    return JSON.stringify({ version: 1, rooms: [...this.rooms.values()].map(room => ({ ...room, members: [...room.members], locks: [...room.locks] })) });
  }
  restore(payload: string) {
    const saved = JSON.parse(payload) as { version: number; rooms: (Omit<Room, 'members' | 'locks'> & { members: [string, Member][]; locks: [string, LockedAction][] })[] };
    if (saved.version !== 1 || !Array.isArray(saved.rooms)) throw new Error('Invalid room snapshot.');
    this.connections.clear(); this.rooms.clear();
    for (const entry of saved.rooms) {
      const room: Room = { ...entry, members: new Map(entry.members), locks: new Map(entry.locks) };
      for (const member of room.members.values()) if (!member.botDifficulty && !member.left) {
        // Socket IDs never survive a process restart. Retain identities and hidden locks.
        if (member.connected) member.reconnectUntil = this.now() + ROOM_LIMITS.reconnectMs;
        member.connected = false; member.connectionId = null;
      }
      this.rooms.set(room.code, room);
    }
  }
  private announce(room: Room, activity = true) {
    if (activity) room.lastActivity = this.now();
    this.hooks.changed?.(room.code);
  }
  private roomFor(connectionId: string) {
    const membership = this.connections.get(connectionId);
    const room = membership && this.rooms.get(membership.code);
    const member = room && room.members.get(membership!.playerId);
    if (!room || !member || member.left || member.connectionId !== connectionId) throw new Error('Join a room first.');
    return { room, member };
  }
  private newCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    do { code = [...randomBytes(6)].map(n => alphabet[n % alphabet.length]).join(''); } while (this.rooms.has(code));
    return code;
  }
  private validateProfile(value: unknown): AvatarProfile {
    if (!value || typeof value !== 'object') throw new Error('Choose an avatar and background.');
    const p = value as Record<string, unknown>;
    if (!AVATARS.some(a => a.id === p.avatarId) || !BACKGROUNDS.some(b => b.id === p.backgroundId)) throw new Error('Unknown avatar or background.');
    return { avatarId: p.avatarId as AvatarProfile['avatarId'], backgroundId: p.backgroundId as AvatarProfile['backgroundId'] };
  }
  private addMember(room: Room, connectionId: string, nicknameValue: unknown, profileValue: unknown): RoomSession {
    if (this.connections.has(connectionId)) throw new Error('Leave your current room first.');
    if (room.members.size >= ROOM_LIMITS.capacity && room.phase === 'lobby') throw new Error('This room is full (8 players).');
    if ([...room.members.values()].filter(p => !p.left).length >= ROOM_LIMITS.capacity) throw new Error('This room is full (8 players).');
    if (typeof nicknameValue !== 'string') throw new Error('Enter a nickname.');
    const nickname = nicknameValue.trim();
    if (!nickname || [...nickname].length > 20 || /[\u0000-\u001f\u007f]/.test(nickname)) throw new Error('Use a nickname of 1–20 characters.');
    if ([...room.members.values()].some(p => !p.left && p.nickname.toLocaleLowerCase() === nickname.toLocaleLowerCase())) throw new Error('That nickname is taken in this room.');
    const profile = this.validateProfile(profileValue);
    const player: Member = { score: 0, botDifficulty: null, id: randomUUID(), nickname, profile, token: randomBytes(32).toString('hex'), connectionId, connected: true, ready: false, ammo: 0, active: false, participating: false, eliminatedRound: null, left: false, reconnectUntil: null, forfeitPending: false };
    room.members.set(player.id, player);
    this.connections.set(connectionId, { code: room.code, playerId: player.id });
    room.hostId ??= player.id;
    this.announce(room);
    return { code: room.code, playerId: player.id, token: player.token };
  }
  create(connectionId: string, nickname: unknown, profile: unknown) {
    if (this.connections.has(connectionId)) throw new Error('Leave your current room first.');
    const code = this.newCode();
    const room: Room = { activity: createActivity(randomUUID()), pendingReactions: [], settings: { ...DEFAULT_MATCH_SETTINGS }, gameNumber: 0, progress: { scores: {}, completedGame: 0, championId: null }, lastGame: null, code, hostId: null, members: new Map(), locks: new Map(), phase: 'lobby', round: 0, roundId: '', history: [], winnerId: null, outcome: 'continue', phaseEndsAt: null, lastActivity: this.now() };
    // Validate membership before exposing an otherwise empty room.
    const session = this.addMember(room, connectionId, nickname, profile);
    this.rooms.set(code, room);
    this.announce(room);
    return session;
  }
  join(connectionId: string, codeValue: unknown, nickname: unknown, profile: unknown) {
    if (typeof codeValue !== 'string') throw new Error('Enter a room code.');
    const room = this.rooms.get(codeValue.toUpperCase().trim());
    if (!room) throw new Error('Room not found. Check the code or create a new room.');
    // Joining a match adds a waiting spectator, never an active participant.
    return this.addMember(room, connectionId, nickname, profile);
  }
  resume(connectionId: string, codeValue: unknown, tokenValue: unknown) {
    if (this.connections.has(connectionId)) throw new Error('Already connected to a room.');
    const room = typeof codeValue === 'string' && this.rooms.get(codeValue);
    const member = room && typeof tokenValue === 'string' && [...room.members.values()].find(p => p.token === tokenValue && !p.left && !p.botDifficulty);
    if (!room || !member) throw new Error('Your room session has expired. Join again.');
    if (member.reconnectUntil !== null && this.now() >= member.reconnectUntil) member.forfeitPending = true;
    if (member.forfeitPending && room.phase === 'lobby') throw new Error('Your reconnect window expired. Join again.');
    if (member.connectionId) this.connections.delete(member.connectionId);
    member.connectionId = connectionId; member.connected = true; member.reconnectUntil = null;
    this.connections.set(connectionId, { code: room.code, playerId: member.id });
    room.hostId ??= member.id;
    this.announce(room);
    this.maybeBegin(room);
    return { code: room.code, playerId: member.id, token: member.token };
  }
  setReady(connectionId: string, value: unknown) {
    const { room, member } = this.roomFor(connectionId);
    if (room.phase !== 'lobby') throw new Error('Ready up in the lobby for the next game.');
    if (typeof value !== 'boolean') throw new Error('Invalid ready status.');
    member.ready = value; this.announce(room);
  }
  setProfile(connectionId: string, profile: unknown) {
    const { room, member } = this.roomFor(connectionId);
    if (room.phase !== 'lobby') throw new Error('Change your character in the lobby.');
    member.profile = this.validateProfile(profile); member.ready = false; this.announce(room);
  }
  private hostLobby(connectionId: string) {
    const state = this.roomFor(connectionId);
    if (state.room.hostId !== state.member.id) throw new Error('Only the host can change the lobby.');
    if (state.room.phase !== 'lobby') throw new Error('Change settings and bots before the match starts.');
    return state.room;
  }
  private clearReady(room: Room) { for (const p of room.members.values()) if (!p.botDifficulty) p.ready = false; }
  setSettings(connectionId: string, value: unknown) {
    const room = this.hostLobby(connectionId), settings = validateMatchSettings(value);
    if (JSON.stringify(settings) !== JSON.stringify(room.settings)) { room.settings = settings; this.clearReady(room); }
    this.announce(room);
  }
  addBot(connectionId: string, value: unknown) {
    const room = this.hostLobby(connectionId);
    if (!['easy', 'normal', 'hard'].includes(value as string)) throw new Error('Choose Easy, Normal, or Hard.');
    if (room.members.size >= ROOM_LIMITS.capacity) throw new Error('This room is full (8 players).');
    const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    let number = 1;
    while ([...room.members.values()].some(p => p.nickname === `Bot ${number}`)) number++;
    const bot: Member = { id: randomUUID(), nickname: `Bot ${number}`, profile: { avatarId: avatar.id, backgroundId: BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)].id }, botDifficulty: value as Difficulty, score: 0, token: '', connectionId: null, connected: true, ready: true, ammo: 0, active: false, participating: false, eliminatedRound: null, left: false, reconnectUntil: null, forfeitPending: false };
    room.members.set(bot.id, bot); this.clearReady(room); this.announce(room);
  }
  removeBot(connectionId: string, playerId: unknown) {
    const room = this.hostLobby(connectionId);
    if (typeof playerId !== 'string' || !room.members.get(playerId)?.botDifficulty) throw new Error('Choose a bot to remove.');
    room.members.delete(playerId); this.clearReady(room); this.announce(room);
  }
  start(connectionId: string) {
    const { room, member } = this.roomFor(connectionId);
    if (room.hostId !== member.id) throw new Error('Only the host can start.');
    if (room.phase !== 'lobby') throw new Error('A match is already running.');
    const players = [...room.members.values()].filter(p => !p.left);
    if (players.length < 2 || players.length > 8) throw new Error('A match needs 2–8 players, including bots.');
    if (players.some(p => !p.connected || !p.ready)) throw new Error('Every human must be connected and ready.');
    room.progress = { scores: Object.fromEntries(players.map(p => [p.id, 0])), completedGame: 0, championId: null };
    for (const player of players) { player.participating = true; player.score = 0; player.forfeitPending = false; }
    room.activity = { ...createActivity(randomUUID()), cooldowns: room.activity.cooldowns }; room.pendingReactions = [];
    room.history = []; room.gameNumber = 0; room.lastGame = null;
    this.beginGame(room); this.announce(room);
  }
  private beginGame(room: Room) {
    if ([...room.members.values()].filter(p => p.participating && !p.left && !p.forfeitPending).length < 2) { room.phase = 'finished'; room.phaseEndsAt = null; return; }
    room.gameNumber++; room.round = 1; room.outcome = 'continue'; room.winnerId = null;
    for (const p of room.members.values()) if (p.participating) {
      p.ammo = 0; p.active = !p.left && !p.forfeitPending; p.eliminatedRound = p.active ? null : 0;
    }
    this.beginRound(room);
  }
  private beginRound(room: Room) {
    room.roundId = randomUUID(); room.locks.clear(); room.phase = 'choosing';
    room.phaseEndsAt = this.now() + room.settings.roundSeconds * 1000;
    const active = [...room.members.values()].filter(p => p.active && p.participating);
    this.eliminateAtBoundary(room, active.filter(p => p.forfeitPending).map(p => p.id));
    if (room.phase !== 'choosing') return;
    const roster = [...room.members.values()].filter(p => p.active && p.participating);
    // All bots commit from the opening roster and completed history, before humans can submit.
    for (const bot of roster.filter(p => p.botDifficulty)) {
      const action = chooseBot({ selfId: bot.id, players: roster, history: room.history }, bot.botDifficulty!);
      validateAction(roster, action); room.locks.set(bot.id, action);
    }
    this.maybeBegin(room);
  }
  private expireRound(room: Room) {
    if (room.phase !== 'choosing' || room.phaseEndsAt === null || this.now() < room.phaseEndsAt) return;
    for (const p of room.members.values()) if (p.active && p.participating && !p.forfeitPending && !room.locks.has(p.id)) room.locks.set(p.id, { playerId: p.id, move: 'block1' });
    this.maybeBegin(room);
  }
  lock(connectionId: string, roundId: unknown, moveValue: unknown, targetValue?: unknown) {
    const { room, member } = this.roomFor(connectionId);
    this.expireRound(room);
    if (room.phase !== 'choosing' || roundId !== room.roundId) throw new Error('This round is closed.');
    if (!member.active || !member.participating || member.forfeitPending) throw new Error('Spectators cannot submit actions.');
    if (room.locks.has(member.id)) throw new Error('Your move is already locked.');
    if (typeof moveValue !== 'string' || !Object.hasOwn(MOVES, moveValue)) throw new Error('Unknown move.');
    if (targetValue !== undefined && typeof targetValue !== 'string') throw new Error('Invalid target.');
    const action: LockedAction = { playerId: member.id, move: moveValue as MoveId, ...(targetValue === undefined ? {} : { targetId: targetValue as string }) };
    validateAction([...room.members.values()].filter(p => p.participating), action);
    room.locks.set(member.id, action);
    this.announce(room); this.maybeBegin(room);
  }
  private transferHost(room: Room) {
    const current = room.hostId && room.members.get(room.hostId);
    if (!current || !current.connected || current.left) room.hostId = [...room.members.values()].find(p => p.connected && !p.left && !p.botDifficulty)?.id ?? null;
  }
  disconnect(connectionId: string, leave = false) {
    const membership = this.connections.get(connectionId);
    if (!membership) return;
    this.connections.delete(connectionId);
    const room = this.rooms.get(membership.code), member = room?.members.get(membership.playerId);
    if (!room || !member || member.connectionId !== connectionId) return;
    member.connectionId = null; member.connected = false; member.ready = false;
    member.reconnectUntil = this.now() + (leave ? 0 : ROOM_LIMITS.reconnectMs);
    if (leave) { member.left = true; member.forfeitPending = true; member.token = ''; }
    if (leave && (room.phase === 'lobby' || !member.participating)) room.members.delete(member.id);
    this.transferHost(room); this.announce(room); this.maybeBegin(room);
  }
  again(connectionId: string) {
    const { room, member } = this.roomFor(connectionId);
    if (member.id !== room.hostId) throw new Error('The host returns everyone to the lobby.');
    if (room.phase !== 'finished') throw new Error('Finish the match before playing again.');
    for (const player of room.members.values()) {
      if (player.left || (player.forfeitPending && !player.connected)) { room.members.delete(player.id); continue; }
      player.score = 0; player.ready = Boolean(player.botDifficulty); player.active = false; player.participating = false; player.ammo = 0; player.eliminatedRound = null; player.forfeitPending = false;
    }
    room.activity = { ...createActivity(randomUUID()), cooldowns: room.activity.cooldowns }; room.pendingReactions = [];
    room.progress = { scores: {}, completedGame: 0, championId: null }; room.gameNumber = 0; room.lastGame = null;
    room.phase = 'lobby'; room.round = 0; room.roundId = ''; room.history = []; room.locks.clear(); room.phaseEndsAt = null; room.outcome = 'continue'; room.winnerId = null;
    this.transferHost(room); this.announce(room);
  }
  private actors(room: Room): ActivityActor[] { return [...room.members.values()].map(p => ({ id: p.id, name: p.nickname, profile: { ...p.profile } })); }
  react(connectionId: string, reaction: unknown, requestId: unknown, matchId: unknown) {
    const { room, member } = this.roomFor(connectionId);
    if (matchId !== room.activity.matchId) throw new Error('This reaction belongs to an earlier match.');
    if (typeof requestId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(requestId)) throw new Error('Invalid reaction request.');
    const actor = this.actors(room).find(p => p.id === member.id)!;
    room.activity = addReaction(room.activity, actor, reaction, requestId, this.now());
    this.announce(room);
  }
  private queueBotReaction(room: Room, botId: string, reaction: ReactionId, key: string) {
    if (reaction === 'goodGame') room.pendingReactions = room.pendingReactions.filter(job => job.botId !== botId);
    if (room.pendingReactions.some(job => job.botId === botId && job.key === key)) return;
    room.pendingReactions.push({ botId, reaction, key, due: Math.max(this.now() + 250, room.activity.cooldowns[botId] ?? 0) });
  }
  private finishGame(room: Room) {
    room.progress = awardGame(room.progress, room.gameNumber, room.outcome === 'winner' ? room.winnerId : null, room.settings.winsRequired);
    for (const p of room.members.values()) p.score = room.progress.scores[p.id] ?? 0;
    room.lastGame = { game: room.gameNumber, winnerId: room.outcome === 'winner' ? room.winnerId : null, scores: { ...room.progress.scores } };
    const actors = this.actors(room);
    room.activity = appendActivity(room.activity, 'game:' + room.gameNumber, { kind: 'game', game: room.gameNumber, actors, winnerId: room.lastGame.winnerId, scores: { ...room.progress.scores } }, this.now());
    if (room.progress.championId) room.activity = appendActivity(room.activity, 'match-winner', { kind: 'match', actors, winnerId: room.progress.championId, wins: room.progress.scores[room.progress.championId] }, this.now());
    for (const bot of room.members.values()) if (bot.botDifficulty && bot.participating) {
      if (room.progress.championId) this.queueBotReaction(room, bot.id, 'goodGame', 'bot-match');
      else if (room.winnerId && room.winnerId !== bot.id && Math.random() < 0.5) this.queueBotReaction(room, bot.id, 'wellPlayed', 'bot-game-' + room.gameNumber);
    }
    const eligible = [...room.members.values()].filter(p => p.participating && !p.left && !p.forfeitPending);
    room.phase = room.progress.championId || eligible.length < 2 ? 'finished' : 'intermission';
    room.phaseEndsAt = room.phase === 'intermission' ? this.now() + INTERMISSION_MS : null;
  }
  private eliminateAtBoundary(room: Room, expired: string[]) {
    if (!expired.length) return;
    for (const id of expired) { const member = room.members.get(id)!; member.active = false; member.eliminatedRound = room.round; }
    room.history.push({ game: room.gameNumber, round: room.round, kind: 'disconnect', actions: [], events: [], eliminated: expired, forfeits: expired });
    room.activity = appendActivity(room.activity, 'disconnect:' + room.gameNumber + ':' + room.round + ':' + expired.join(','), { kind: 'round', game: room.gameNumber, round: room.round, actors: this.actors(room), actions: [], attacks: [], eliminated: [...expired], forfeits: [...expired], draw: false, remaining: [...room.members.values()].filter(p=>p.participating && p.active).map(p=>p.id) }, this.now());
    room.history = room.history.slice(-100);
    const result = winner([...room.members.values()].filter(p => p.participating));
    room.outcome = result.outcome; room.winnerId = result.winnerId;
    if (result.outcome !== 'continue') this.finishGame(room);
  }
  private maybeBegin(room: Room) {
    if (room.phase !== 'choosing') return;
    const active = [...room.members.values()].filter(p => p.active && p.participating);
    const expired = active.filter(p => p.forfeitPending).map(p => p.id);
    if (expired.length && active.length - expired.length <= 1 && !active.some(p => room.locks.has(p.id))) {
      this.eliminateAtBoundary(room, expired); this.announce(room, false); return;
    }
    if (!active.every(p => room.locks.has(p.id) || p.forfeitPending)) return;
    room.phase = 'countdown'; room.phaseEndsAt = this.now() + ROOM_LIMITS.clapMs;
    this.announce(room, false);
  }
  private reveal(room: Room) {
    const roster = [...room.members.values()].filter(p => p.participating);
    const result = resolveBattle(roster, [...room.locks.values()], room.round, roster.filter(p => p.active && p.forfeitPending).map(p => p.id));
    for (const p of result.players) { const member = room.members.get(p.id)!; member.ammo = p.ammo; member.active = p.active; member.eliminatedRound = p.eliminatedRound; }
    room.history.push({ game: room.gameNumber, round: room.round, kind: 'actions', actions: result.actions, events: result.events, eliminated: result.eliminated, forfeits: result.forfeits });
    room.history = room.history.slice(-100); room.outcome = result.outcome; room.winnerId = result.winnerId;
    room.activity = appendActivity(room.activity, 'round:' + room.gameNumber + ':' + room.round, { kind: 'round', game: room.gameNumber, round: room.round, actors: this.actors(room), actions: result.actions, attacks: result.events, eliminated: result.eliminated, forfeits: result.forfeits, draw: result.outcome === 'draw', remaining: result.players.filter(p => p.active).map(p => p.id) }, this.now());
    const humanIds = roster.filter(p => !p.botDifficulty).map(p => p.id);
    for (const bot of roster.filter(p => p.botDifficulty)) {
      const reaction = botRoundReaction(bot.id, result.events, humanIds);
      if (reaction) this.queueBotReaction(room, bot.id, reaction, 'bot-round-' + room.gameNumber + '-' + room.round);
    }
    room.phase = 'reveal'; room.phaseEndsAt = this.now() + ROOM_LIMITS.moveMs;
    this.announce(room, false);
  }
  tick() {
    const now = this.now();
    for (const room of this.rooms.values()) {
      let changed = false;
      for (const member of room.members.values()) {
        if (!member.connected && !member.forfeitPending && member.reconnectUntil !== null && now >= member.reconnectUntil) {
          member.forfeitPending = true; changed = true;
          if (room.phase === 'lobby' || !member.participating) room.members.delete(member.id);
        }
      }
      this.transferHost(room);
      if (changed) { this.announce(room, false); this.maybeBegin(room); }
      this.expireRound(room);
      if (room.phaseEndsAt !== null && now >= room.phaseEndsAt) {
        if (room.phase === 'intermission') { this.beginGame(room); this.announce(room, false); }
        else if (room.phase === 'countdown') this.reveal(room);
        else if (room.phase === 'reveal') { room.phase = 'reaction'; room.phaseEndsAt = now + ROOM_LIMITS.revealMs - ROOM_LIMITS.moveMs; this.announce(room, false); }
        else if (room.phase === 'reaction') {
          if (room.outcome !== 'continue') this.finishGame(room);
          else {
            room.round++; this.beginRound(room);
          }
          this.announce(room, false);
        }
      }
      let reacted = false;
      for (const job of room.pendingReactions.filter(job => job.due <= now)) {
        const bot = room.members.get(job.botId);
        if (bot?.botDifficulty && !bot.left) {
          if (now < (room.activity.cooldowns[bot.id] ?? 0)) { job.due = room.activity.cooldowns[bot.id]; continue; }
          room.activity = addReaction(room.activity, this.actors(room).find(actor => actor.id === bot.id)!, job.reaction, job.key, now); reacted = true;
        }
        room.pendingReactions = room.pendingReactions.filter(pending => pending !== job);
      }
      if (reacted) this.announce(room, false);
      const connected = [...room.members.values()].some(p => p.connected && !p.botDifficulty);
      if (now - room.lastActivity >= (connected ? ROOM_LIMITS.idleMs : ROOM_LIMITS.emptyMs)) {
        const ids = [...this.connections.entries()].filter(([, m]) => m.code === room.code).map(([id]) => id);
        ids.forEach(id => this.connections.delete(id)); this.rooms.delete(room.code); this.hooks.removed?.(room.code, ids);
      }
    }
  }
  view(connectionId: string): PublicRoom {
    const { room, member } = this.roomFor(connectionId);
    const players: RoomPlayer[] = [...room.members.values()].map(p => ({ score: p.score, botDifficulty: p.botDifficulty, id: p.id, nickname: p.nickname, profile: { ...p.profile }, ammo: p.ammo, active: p.active, eliminatedRound: p.eliminatedRound, connected: p.connected, ready: p.ready, participating: p.participating, left: p.left, reconnectUntil: p.reconnectUntil, forfeitPending: p.forfeitPending, locked: room.locks.has(p.id) }));
    return { activity: structuredClone(room.activity.events), activityMatchId: room.activity.matchId, reactionReadyAt: room.activity.cooldowns[member.id] ?? 0, settings: { ...room.settings }, gameNumber: room.gameNumber, championId: room.progress.championId, lastGame: structuredClone(room.lastGame), code: room.code, hostId: room.hostId, phase: room.phase, round: room.round, roundId: room.roundId, players, history: structuredClone(room.history.slice(-30)), winnerId: room.winnerId, outcome: room.outcome, placements: room.phase === 'finished' || room.phase === 'intermission' ? placements(players.filter(p => p.participating)) : [], phaseEndsAt: room.phaseEndsAt, serverNow: this.now(), selfId: member.id, selfAction: room.locks.has(member.id) ? { ...room.locks.get(member.id)! } : null };
  }
}
