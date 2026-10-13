import { afterEach, expect, it } from 'vitest';
import { PostgresRoomStorage } from './postgres';
const stores: PostgresRoomStorage[] = [];
afterEach(async () => { await Promise.all(stores.splice(0).map(store => store.close())); });
// Opt-in: a real disposable PostgreSQL database, never a production database.
it.skipIf(!process.env.CHING_TEST_DATABASE_URL)('uses real PostgreSQL durability and fences a replaced server', async () => {
  const url = process.env.CHING_TEST_DATABASE_URL!;
  const first = await PostgresRoomStorage.open(url); stores.push(first.storage);
  const snapshot = JSON.stringify({ version: 1, rooms: [], testMarker: 'persisted-' + Date.now() });
  await first.storage.save(snapshot);
  const next = await PostgresRoomStorage.open(url); stores.push(next.storage);
  expect(next.snapshot).toBe(snapshot);
  await expect(first.storage.save('stale overwrite')).rejects.toThrow('superseded');
  await next.storage.save(snapshot);
});
