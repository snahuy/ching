import { Client } from 'pg';
import { randomUUID } from 'node:crypto';

export interface AsyncRoomStorage {
  save(payload: string): Promise<void>;
  close(): Promise<void>;
  onFailure?: () => void;
}

/** Remote durable state with a fenced single writer, including overlapping deploys. */
export class PostgresRoomStorage implements AsyncRoomStorage {
  private client: Client;
  private owner = randomUUID();
  private revision = '0';
  private failed = false;
  onFailure?: () => void;
  private constructor(connectionString: string) {
    this.client = new Client({ connectionString, connectionTimeoutMillis: 15_000, query_timeout: 15_000, keepAlive: true });
    this.client.on('error', () => { this.failed = true; this.onFailure?.(); });
  }
  static async open(connectionString: string) {
    const storage = new PostgresRoomStorage(connectionString);
    try {
      await storage.client.connect();
      await storage.client.query(`CREATE TABLE IF NOT EXISTS ching_room_state (
        id TEXT PRIMARY KEY CHECK (id = 'main'), version INTEGER NOT NULL,
        payload TEXT NOT NULL, owner TEXT NOT NULL, revision BIGINT NOT NULL DEFAULT 0
      )`);
      // Claim ownership and read the last committed state in one atomic statement.
      // A superseded process cannot write or acknowledge another command.
      const result = await storage.client.query(`INSERT INTO ching_room_state(id, version, payload, owner)
        VALUES ('main', 1, $1, $2) ON CONFLICT(id) DO UPDATE SET owner = EXCLUDED.owner
        RETURNING version, payload, revision`, [JSON.stringify({ version: 1, rooms: [] }), storage.owner]);
      const row = result.rows[0];
      if (row.version !== 1) throw new Error('Unsupported room database version.');
      storage.revision = String(row.revision);
      return { storage, snapshot: row.payload as string };
    } catch (cause) { await storage.close(); throw cause; }
  }
  async save(payload: string) {
    if (this.failed) throw new Error('Room database disconnected.');
    const result = await this.client.query(`UPDATE ching_room_state SET payload=$1, revision=revision+1
      WHERE id='main' AND owner=$2 AND revision=$3 RETURNING revision`, [payload, this.owner, this.revision]);
    if (result.rowCount !== 1) throw new Error('Room server superseded. Reconnect to the current deployment.');
    this.revision = String(result.rows[0].revision);
  }
  async close() { await this.client.end(); }
}
