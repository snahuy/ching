import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/** Private, server-only durable state. One writer/service instance per disk. */
export class RoomStorage {
  private db: DatabaseSync;
  constructor(filename: string) {
    mkdirSync(dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;');
    this.db.exec('CREATE TABLE IF NOT EXISTS ching_state (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL, payload TEXT NOT NULL)');
  }
  load(): string | undefined {
    const row = this.db.prepare('SELECT version, payload FROM ching_state WHERE id = 1').get();
    if (!row) return undefined;
    if (row.version !== 1) throw new Error('Unsupported room database version. Restore a compatible backup.');
    return row.payload as string;
  }
  save(payload: string) {
    // A single SQLite statement is atomic, including a crash during a write.
    this.db.prepare('INSERT INTO ching_state(id, version, payload) VALUES(1, 1, ?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(payload);
  }
  close() { this.db.close(); }
}
