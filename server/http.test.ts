import { afterEach, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { createGameServer } from './http';
import { DEFAULT_PROFILE } from '../src/avatars';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RoomStorage } from './storage';
import type { ClientMessage, ServerMessage, PublicRoom, RoomSession } from '../src/multiplayer/protocol';
const apps: ReturnType<typeof createGameServer>[] = [];
it('serializes asynchronous durable commits before sending sessions, private moves or results', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ching-async-db-'));
  const database = new RoomStorage(join(dir, 'rooms.sqlite'));
  let release: (() => void) | undefined, writes = 0;
  const app = createGameServer({ remoteStorage: {
    async save(payload) {
      if (++writes === 1) await new Promise<void>(resolve => { release = resolve; });
      else await new Promise(resolve => setTimeout(resolve, 15));
      database.save(payload);
    }, async close() { database.close(); },
  } });
  apps.push(app); await new Promise<void>(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const address = app.server.address(); if (!address || typeof address === 'string') throw Error('No port');
  const url = `ws://127.0.0.1:${address.port}/socket`, a = await client(url), b = await client(url);
  a.send({ type: 'create', nickname: 'Async host', profile: DEFAULT_PROFILE });
  await a.wait(() => release ? true : undefined);
  expect(a.messages).toHaveLength(0); expect(database.load()).toBeUndefined();
  release!(); const host = await a.session(); expect(database.load()).toContain(host.playerId);
  b.send({ type: 'join', code: host.code, nickname: 'Async guest', profile: DEFAULT_PROFILE }); const guest = await b.session();
  a.send({ type: 'ready', ready: true }); b.send({ type: 'ready', ready: true }); await a.state(r => r.players.length === 2 && r.players.every(p => p.ready));
  a.send({ type: 'start' }); const round = await a.state(r => r.phase === 'choosing');
  a.send({ type: 'lock', roundId: round.roundId, move: 'reload' });
  const privateView = await b.state(r => r.players[0].locked); expect(privateView.selfAction).toBeNull();
  b.send({ type: 'lock', roundId: round.roundId, move: 'reload' });
  const resolved = await a.state(r => r.phase === 'reveal');
  expect(resolved.history).toHaveLength(1); expect(resolved.players.every(p => p.ammo === 1)).toBe(true);
  const committed = JSON.parse(database.load()!).rooms[0]; expect(committed.phase).toBe('reveal'); expect(committed.history).toHaveLength(1);
  expect(committed.members.some(([id]: [string]) => id === guest.playerId)).toBe(true);
  await app.close(); apps.pop(); rmSync(dir, { recursive: true });
});
it('fails closed when durable storage cannot commit, without acknowledging a room', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ching-storage-fail-'));
  const app = createGameServer({ databasePath: join(dir, 'rooms.sqlite') });
  apps.push(app);
  await new Promise<void>(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const address = app.server.address(); if (!address || typeof address === 'string') throw Error('No port');
  const c = await client(`ws://127.0.0.1:${address.port}/socket`);
  vi.spyOn(RoomStorage.prototype, 'save').mockImplementation(() => { throw Error('Disk full'); });
  c.send({ type: 'create', nickname: 'Host', profile: DEFAULT_PROFILE });
  await new Promise<void>(resolve => c.socket.once('close', () => resolve()));
  expect(c.messages.some(m => m.type === 'session' || m.type === 'state')).toBe(false);
  expect((await fetch(`http://127.0.0.1:${address.port}/health`)).status).toBe(503);
  await app.close(); apps.pop(); rmSync(dir, { recursive: true });
});
it('persists real socket sessions and a hidden submission across server replacement', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ching-socket-db-'));
  const databasePath = join(dir, 'rooms.sqlite');
  async function launch() {
    const app = createGameServer({ databasePath });
    await new Promise<void>(resolve => app.server.listen(0, '127.0.0.1', resolve));
    const address = app.server.address(); if (!address || typeof address === 'string') throw Error('No port');
    return { app, url: `ws://127.0.0.1:${address.port}/socket` };
  }
  let running = await launch();
  const a = await client(running.url), b = await client(running.url);
  a.send({ type: 'create', nickname: 'Host', profile: DEFAULT_PROFILE }); const host = await a.session();
  b.send({ type: 'join', code: host.code, nickname: 'Guest', profile: DEFAULT_PROFILE }); const guest = await b.session();
  a.send({ type: 'ready', ready: true }); b.send({ type: 'ready', ready: true }); await a.state(r => r.players.length === 2 && r.players.every(p => p.ready));
  a.send({ type: 'start' }); const first = await a.state(r => r.phase === 'choosing');
  a.send({ type: 'lock', roundId: first.roundId, move: 'reload' }); await b.state(r => r.players[0].locked);
  await running.app.close(); running = await launch(); apps.push(running.app);
  const ar = await client(running.url), br = await client(running.url);
  ar.send({ type: 'resume', code: host.code, token: host.token }); br.send({ type: 'resume', code: guest.code, token: guest.token });
  expect((await ar.session()).playerId).toBe(host.playerId);
  const restored = await br.state(r => r.players.every(p => p.connected));
  expect(restored.players).toHaveLength(2); expect(restored.roundId).toBe(first.roundId); expect(restored.phaseEndsAt).toBe(first.phaseEndsAt);
  expect(restored.selfAction).toBeNull(); expect(restored.history).toHaveLength(0);
  br.send({ type: 'lock', roundId: first.roundId, move: 'reload' });
  const reveal = await br.state(r => r.phase === 'reveal'); expect(reveal.players.every(p => p.ammo === 1)).toBe(true);
  await running.app.close(); apps.pop(); rmSync(dir, { recursive: true });
});
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(apps.splice(0).map(app => app.close())); });
async function client(url: string) {
  const socket = new WebSocket(url), messages: ServerMessage[] = [];
  socket.on('message', raw => messages.push(JSON.parse(raw.toString()) as ServerMessage));
  await new Promise<void>((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  async function wait<T>(read: () => T | undefined, timeout = 5000): Promise<T> {
    const end = Date.now() + timeout;
    while (Date.now() < end) { const result = read(); if (result !== undefined) return result; await new Promise(r => setTimeout(r, 10)); }
    throw new Error('Timed out waiting for synchronized server state.');
  }
  return { socket, messages, send: (m: ClientMessage) => socket.send(JSON.stringify(m)), session: () => wait(() => messages.find(m => m.type === 'session')?.type === 'session' ? (messages.find(m => m.type === 'session') as { type: 'session'; session: RoomSession }).session : undefined), state: (predicate: (room: PublicRoom) => boolean) => wait(() => { const latest = messages.filter((m): m is { type: 'state'; room: PublicRoom } => m.type === 'state').at(-1); return latest && predicate(latest.room) ? latest.room : undefined; }), wait };
}
it('synchronizes eight real WebSocket clients, hides secret targets, rejects duplicates, and detects a simultaneous draw', async () => {
  const app = createGameServer(); apps.push(app);
  await new Promise<void>(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const address = app.server.address(); if (!address || typeof address === 'string') throw Error('No server port');
  const url = `ws://127.0.0.1:${address.port}/socket`;
  expect(await (await fetch(`http://127.0.0.1:${address.port}/health`)).json()).toEqual({ ok: true });
  expect((await fetch(`http://127.0.0.1:${address.port}/?room=TEST23`)).status).toBe(200);
  const clients = await Promise.all(Array.from({ length: 8 }, () => client(url)));
  clients[0].send({ type: 'create', nickname: 'Player 0', profile: DEFAULT_PROFILE }); const host = await clients[0].session();
  for (let i = 1; i < clients.length; i++) clients[i].send({ type: 'join', code: host.code, nickname: `Player ${i}`, profile: DEFAULT_PROFILE });
  const sessions = await Promise.all(clients.map(c => c.session()));
  clients.forEach(c => c.send({ type: 'ready', ready: true })); await clients[0].state(r => r.players.length === 8 && r.players.every(p => p.ready));
  clients[0].send({ type: 'start' }); const first = await clients[0].state(r => r.phase === 'choosing');
  clients.forEach(c => c.send({ type: 'lock', roundId: first.roundId, move: 'reload' }));
  const second = await clients[0].state(r => r.phase === 'choosing' && r.round === 2);
  expect(second.players.every(p => p.ammo === 1)).toBe(true);
  clients[0].send({ type: 'lock', roundId: second.roundId, move: 'ching', targetId: sessions[1].playerId });
  const secret = await clients[1].state(r => r.round === 2 && r.players[0].locked);
  expect(secret.selfAction).toBeNull(); expect(secret.history).toHaveLength(1); expect(JSON.stringify(secret)).not.toContain('"move":"ching"');
  clients[0].send({ type: 'lock', roundId: second.roundId, move: 'reload' });
  await clients[0].wait(() => clients[0].messages.some(m => m.type === 'error' && m.message.includes('already locked')) ? true : undefined);
  for (let i = 1; i < clients.length; i++) clients[i].send({ type: 'lock', roundId: second.roundId, move: 'ching', targetId: sessions[(i + 1) % sessions.length].playerId });
  const finished = await Promise.all(clients.map(c => c.state(r => r.phase === 'intermission')));
  for (const room of finished) { expect(room.outcome).toBe('draw'); expect(room.players.every(p => !p.active && p.ammo === 0)).toBe(true); expect(room.placements).toHaveLength(1); expect(room.placements[0].playerIds).toHaveLength(8); }
  const next = await clients[7].state(r => r.phase === 'choosing' && r.gameNumber === 2); expect(next.players.every(p => p.active && p.ammo === 0 && p.score === 0)).toBe(true);
}, 15_000);
it('resumes a disconnected client over the real protocol without creating another player', async () => {
  const app = createGameServer(); apps.push(app); await new Promise<void>(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const address = app.server.address(); if (!address || typeof address === 'string') throw Error('No server port');
  const url = `ws://127.0.0.1:${address.port}/socket`, a = await client(url), b = await client(url);
  a.send({ type: 'create', nickname: 'Host', profile: DEFAULT_PROFILE }); const host = await a.session();
  b.send({ type: 'join', code: host.code, nickname: 'Guest', profile: DEFAULT_PROFILE }); const guest = await b.session();
  b.socket.close(); await a.state(r => r.players.some(p => p.id === guest.playerId && !p.connected));
  const resumed = await client(url); resumed.send({ type: 'resume', code: host.code, token: guest.token }); expect((await resumed.session()).playerId).toBe(guest.playerId);
  const room = await resumed.state(r => r.players.every(p => p.connected)); expect(room.players).toHaveLength(2);
  a.send({ type: 'leave' }); const transfer = await resumed.state(r => r.hostId === guest.playerId); expect(transfer.players).toHaveLength(1);
});

it('synchronizes timed bot matches, scoring, intermission reconnects, champion, and rematch over real WebSockets', async () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const app = createGameServer(); apps.push(app); await new Promise<void>(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const address = app.server.address(); if (!address || typeof address === 'string') throw Error('No server port');
  const url = `ws://127.0.0.1:${address.port}/socket`, host = await client(url);
  host.send({ type: 'create', nickname: 'Dara', profile: DEFAULT_PROFILE }); const session = await host.session();
  host.send({ type: 'settings', settings: { roundSeconds: 1, winsRequired: 2 } }); host.send({ type: 'addBot', difficulty: 'hard' });
  const lobby = await host.state(r => r.players.length === 2 && r.settings.roundSeconds === 1); const bot = lobby.players.find(p => p.botDifficulty)!;
  host.send({ type: 'ready', ready: true }); await host.state(r => r.players.every(p => p.ready)); host.send({ type: 'start' });
  const first = await host.state(r => r.phase === 'choosing'); expect(first.players.find(p => p.id === bot.id)?.locked).toBe(true); expect(first.history).toEqual([]);
  const timeout = await host.state(r => r.phase === 'countdown'); expect(timeout.selfAction?.move).toBe('block1'); expect(timeout.history).toEqual([]);
  let round = await host.state(r => r.phase === 'choosing' && r.round === 2); host.send({ type: 'lock', roundId: round.roundId, move: 'reload' });
  round = await host.state(r => r.phase === 'choosing' && r.round === 3); host.send({ type: 'lock', roundId: round.roundId, move: 'ching', targetId: bot.id });
  const game = await host.state(r => r.phase === 'intermission'); expect(game.players.find(p => p.id === session.playerId)?.score).toBe(1);
  host.socket.close(); const resumed = await client(url); resumed.send({ type: 'resume', code: session.code, token: session.token }); expect((await resumed.session()).playerId).toBe(session.playerId);
  round = await resumed.state(r => r.gameNumber === 2 && r.phase === 'choosing'); expect(round.players.every(p => p.ammo === 0 && p.active)).toBe(true); expect(round.players.find(p => p.id === session.playerId)?.score).toBe(1);
  resumed.send({ type: 'lock', roundId: round.roundId, move: 'reload' }); round = await resumed.state(r => r.gameNumber === 2 && r.round === 2 && r.phase === 'choosing');
  resumed.send({ type: 'lock', roundId: round.roundId, move: 'ching', targetId: bot.id }); const final = await resumed.state(r => r.phase === 'finished'); expect(final.championId).toBe(session.playerId); expect(final.players.find(p => p.id === session.playerId)?.score).toBe(2);
  resumed.send({ type: 'again' }); const rematch = await resumed.state(r => r.phase === 'lobby'); expect(rematch.players.every(p => p.score === 0)).toBe(true); expect(rematch.players.find(p => p.id === bot.id)).toMatchObject({ botDifficulty: 'hard', ready: true, profile: bot.profile }); expect(rematch.settings).toEqual({ roundSeconds: 1, winsRequired: 2 });
}, 30_000);
