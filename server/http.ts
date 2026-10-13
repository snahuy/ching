import { createServer, type IncomingMessage } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { RoomManager } from './rooms.ts';
import { RoomStorage } from './storage.ts';
import type { AsyncRoomStorage } from './postgres.ts';
import type { ServerMessage } from '../src/multiplayer/protocol.ts';

export function createGameServer(options: { databasePath?: string; remoteStorage?: AsyncRoomStorage; initialSnapshot?: string } = {}) {
  if (options.databasePath && options.remoteStorage) throw new Error('Choose one room storage backend.');
  const storage = options.databasePath ? new RoomStorage(options.databasePath) : undefined;
  const remote = options.remoteStorage;
  let healthy = true;
  let dirty = false, outbox: (() => void)[] | null = null;
  let queue = Promise.resolve();
  function unavailable() {
    healthy = false;
    for (const socket of sockets.values()) socket.close(1011, 'Room storage unavailable');
  }
  if (remote) remote.onFailure = unavailable;
  function dispatch(operation: () => void): Promise<void> {
    if (!remote) { operation(); return Promise.resolve(); }
    queue = queue.then(async () => {
      if (!healthy) return;
      outbox = []; dirty = false;
      try {
        operation();
        if (dirty) await remote.save(manager.snapshot());
        const delivery = outbox; outbox = null;
        if (healthy) for (const deliver of delivery) deliver();
      } catch { outbox = null; unavailable(); }
    });
    return queue;
  }
  function persist() {
    if (remote) { dirty = true; return; }
    try { storage?.save(manager.snapshot()); }
    catch {
      unavailable();
      throw new Error('Room storage unavailable. Reconnect after the server recovers.');
    }
  }
  const sockets = new Map<string, WebSocket>();
  const send = (socket: WebSocket, message: ServerMessage) => {
    const encoded = JSON.stringify(message);
    const deliver = () => { if (socket.readyState === WebSocket.OPEN) socket.send(encoded); };
    if (outbox) outbox.push(deliver); else deliver();
  };
  const manager = new RoomManager({
    changed(code) {
      if (!manager.rooms.has(code)) return;
      persist(); // Commit private state before acknowledging or broadcasting it.
      for (const [id, membership] of manager.connections) {
        if (membership.code === code) { const socket = sockets.get(id); if (socket) send(socket, { type: 'state', room: manager.view(id) }); }
      }
    },
    removed(_code, ids) {
      persist();
      for (const id of ids) { const socket = sockets.get(id); if (socket) { send(socket, { type: 'error', message: 'This inactive room has closed. Create or join another room.', fatal: true }); const close = () => socket.close(4000, 'Room expired'); if (outbox) outbox.push(close); else close(); } }
    },
  });
  const saved = options.initialSnapshot ?? storage?.load();
  if (saved) { manager.restore(saved); if (!remote) persist(); }
  const ready = remote && saved ? dispatch(() => { persist(); }) : Promise.resolve();
  const dist = fileURLToPath(new URL('../dist/', import.meta.url));
  const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname === '/health') { res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: healthy })); return; }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    try {
      let filename = path.resolve(dist, `.${decodeURIComponent(url.pathname)}`);
      if (filename !== path.resolve(dist) && !filename.startsWith(path.resolve(dist) + path.sep)) { res.writeHead(403); res.end(); return; }
      const info = await stat(filename).catch(() => null);
      if (!info?.isFile()) {
        if (path.extname(url.pathname)) { res.writeHead(404); res.end('Not found'); return; }
        filename = path.join(dist, 'index.html');
      }
      const body = await readFile(filename);
      res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch { res.writeHead(404); res.end('Build Ching with npm run build first, or use npm run dev.'); }
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 8192 });
  function allowedOrigin(req: IncomingMessage) {
    const origin = req.headers.origin;
    if (!origin) return true; // Native clients and integration tests do not send Origin.
    try {
      const trusted = (process.env.ALLOWED_ORIGINS ?? '').split(',').map(value => value.trim()).filter(Boolean);
      return new URL(origin).host === req.headers.host || trusted.includes(origin);
    } catch { return false; }
  }
  server.on('upgrade', (req, socket, head) => {
    if (!healthy || req.url?.split('?')[0] !== '/socket' || !allowedOrigin(req)) { socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  });
  const alive = new WeakMap<WebSocket, boolean>();
  wss.on('connection', socket => {
    const id = randomUUID(); sockets.set(id, socket); alive.set(socket, true);
    let intervalStart = Date.now(), count = 0;
    socket.on('pong', () => alive.set(socket, true));
    socket.on('message', raw => {
      if (Date.now() - intervalStart > 10_000) { intervalStart = Date.now(); count = 0; }
      if (++count > 30) { send(socket, { type: 'error', message: 'Too many requests. Please slow down.' }); return; }
      void dispatch(() => {
      if (!healthy) { socket.close(1011, 'Room storage unavailable'); return; }
      try {
        const input: unknown = JSON.parse(raw.toString());
        if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid request.');
        const msg = input as Record<string, unknown>;
        switch (msg.type) {
          case 'create': {
            if (manager.rooms.size >= 200) throw new Error('The server is full. Try again shortly.');
            const session = manager.create(id, msg.nickname, msg.profile); send(socket, { type: 'session', session }); break;
          }
          case 'join': { const session = manager.join(id, msg.code, msg.nickname, msg.profile); send(socket, { type: 'session', session }); break; }
          case 'resume': {
            const oldIds = new Set(manager.connections.keys());
            try { const session = manager.resume(id, msg.code, msg.token); send(socket, { type: 'session', session }); }
            catch (error) { send(socket, { type: 'error', message: error instanceof Error ? error.message : 'Session expired.', fatal: true }); return; }
            for (const oldId of oldIds) if (!manager.connections.has(oldId)) {
              const close = () => sockets.get(oldId)?.close(4001, 'Session resumed elsewhere');
              if (outbox) outbox.push(close); else close();
            }
            break;
          }
          case 'ready': manager.setReady(id, msg.ready); break;
          case 'profile': manager.setProfile(id, msg.profile); break;
          case 'settings': manager.setSettings(id, msg.settings); break;
          case 'addBot': manager.addBot(id, msg.difficulty); break;
          case 'removeBot': manager.removeBot(id, msg.playerId); break;
          case 'start': manager.start(id); break;
          case 'lock': manager.lock(id, msg.roundId, msg.move, msg.targetId); break;
          case 'reaction': manager.react(id, msg.reaction, msg.requestId, msg.matchId); break;
          case 'again': manager.again(id); break;
          case 'leave': manager.disconnect(id, true); send(socket, { type: 'left' }); break;
          default: throw new Error('Unknown request.');
        }
        if (manager.connections.has(id)) send(socket, { type: 'state', room: manager.view(id) });
      } catch (error) { send(socket, { type: 'error', message: error instanceof Error ? error.message : 'Invalid request.' }); }
    }); });
    socket.on('close', () => { sockets.delete(id); void dispatch(() => { if (healthy) { try { manager.disconnect(id); } catch { /* Health endpoint reports storage failure. */ } } }); });
    socket.on('error', () => socket.close());
  });
  let tickPending = false;
  const tick = setInterval(() => {
    if (!healthy || tickPending) return;
    tickPending = true;
    void dispatch(() => { try { manager.tick(); } catch { unavailable(); } }).finally(() => { tickPending = false; });
  }, 50);
  const heartbeat = setInterval(() => {
    for (const socket of sockets.values()) {
      if (!alive.get(socket)) { socket.terminate(); continue; }
      alive.set(socket, false); socket.ping();
    }
  }, 10_000);
  return {
    server, manager, ready: ready.then(() => { if (!healthy) throw new Error('Room storage unavailable. Reconnect after the server recovers.'); }),
    async close() {
      clearInterval(tick); clearInterval(heartbeat);
      for (const socket of sockets.values()) socket.terminate();
      await new Promise<void>(resolve => wss.close(() => resolve()));
      await new Promise<void>(resolve => server.close(() => resolve()));
      await queue;
      if (remote) { remote.onFailure = undefined; await remote.close(); }
      storage?.close();
    },
  };
}
