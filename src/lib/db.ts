import Database from 'better-sqlite3';
import * as path from 'node:path';

let dbPathOverride: string | undefined;
let instance: Database.Database | undefined;

export function setDbPath(p: string): void {
  dbPathOverride = p;
  instance = undefined;
}

export function getDbPath(): string {
  if (dbPathOverride) return dbPathOverride;
  if (process.env.HURLMAN_CACHE_PATH) return process.env.HURLMAN_CACHE_PATH;
  return path.resolve(process.cwd(), '.hurlman.db');
}

export function getDb(): Database.Database {
  if (instance) return instance;
  instance = new Database(getDbPath());
  instance.exec(`
    CREATE TABLE IF NOT EXISTS token_cache (
      key       TEXT PRIMARY KEY,
      value     TEXT NOT NULL,
      cached_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS responses (
      key              TEXT PRIMARY KEY,
      method           TEXT NOT NULL,
      url              TEXT NOT NULL,
      status_code      INTEGER NOT NULL,
      response_headers TEXT NOT NULL,
      response_body    BLOB NOT NULL,
      cached_at        TEXT NOT NULL
    );
  `);
  return instance;
}
