import { createGameServer } from './http.ts';
import { PostgresRoomStorage } from './postgres.ts';
if (process.env.NODE_ENV === 'production' && (!(process.env.DATABASE_URL || process.env.ROOM_DB_PATH) || !process.env.ALLOWED_ORIGINS)) {
  throw new Error('Production multiplayer requires DATABASE_URL (or ROOM_DB_PATH on a persistent disk) and ALLOWED_ORIGINS. See MULTIPLAYER_DEPLOYMENT.md.');
}
const remote = process.env.DATABASE_URL ? await PostgresRoomStorage.open(process.env.DATABASE_URL) : undefined;
const app = createGameServer(remote ? { remoteStorage: remote.storage, initialSnapshot: remote.snapshot } : { databasePath: process.env.ROOM_DB_PATH });
await app.ready;
const port = Number(process.env.PORT ?? 3001);
app.server.listen(port, '0.0.0.0', () => console.log(`Ching multiplayer listening on http://localhost:${port}`));
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { void app.close().then(() => process.exit(0)); });
