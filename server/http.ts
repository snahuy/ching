import { createServer, type IncomingMessage } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { RoomManager } from './rooms.ts';
import type { ServerMessage } from '../src/multiplayer/protocol.ts';

export function createGameServer() {
  const sockets = new Map<string, WebSocket>();
  const send = (socket: WebSocket, message: ServerMessage) => { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message)); };
  const manager = new RoomManager({
    changed(code) {
      if (!manager.rooms.has(code)) return;
      for (const [id, membership] of manager.connections) {
        if (membership.code === code) { const socket = sockets.get(id); if (socket) send(socket, { type: 'state', room: manager.view(id) }); }
      }
    },
    removed(_code, ids) {
      for (const id of ids) { const socket = sockets.get(id); if (socket) { send(socket, { type: 'error', message: 'This inactive room has closed. Create or join another room.', fatal: true }); socket.close(4000, 'Room expired'); } }
    },
  });
  const dist = fileURLToPath(new URL('../dist/', import.meta.url));
  const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname === '/health') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true })); return; }
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
      const trusted = (process.env.ALLOWED_ORIGINS ?? '').split(',').filter(Boolean);
      return new URL(origin).host === req.headers.host || trusted.includes(origin);
    } catch { return false; }
  }
  server.on('upgrade', (req, socket, head) => {
    if (req.url?.split('?')[0] !== '/socket' || !allowedOrigin(req)) { socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); socket.destroy(); return; }
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
            for (const oldId of oldIds) if (!manager.connections.has(oldId)) sockets.get(oldId)?.close(4001, 'Session resumed elsewhere');
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
    });
    socket.on('close', () => { sockets.delete(id); manager.disconnect(id); });
    socket.on('error', () => socket.close());
  });
  const tick = setInterval(() => manager.tick(), 50);
  const heartbeat = setInterval(() => {
    for (const socket of sockets.values()) {
      if (!alive.get(socket)) { socket.terminate(); continue; }
      alive.set(socket, false); socket.ping();
    }
  }, 10_000);
  return {
    server, manager,
    async close() {
      clearInterval(tick); clearInterval(heartbeat);
      for (const socket of sockets.values()) socket.terminate();
      await new Promise<void>(resolve => wss.close(() => resolve()));
      await new Promise<void>(resolve => server.close(() => resolve()));
    },
  };
}
