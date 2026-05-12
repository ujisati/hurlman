import type { CacheEntry } from '../types.js';
import { getDb, getDbPath, setDbPath } from './db.js';
import { clearResponses } from './response-cache.js';

export function setCachePath(p: string): void {
  setDbPath(p);
}

export function getCachePath(): string {
  return getDbPath();
}

export function getEntry(key: string): CacheEntry | undefined {
  const row = getDb()
    .prepare('SELECT value, cached_at FROM token_cache WHERE key = ?')
    .get(key) as { value: string; cached_at: string } | undefined;
  if (!row) return undefined;
  return { value: row.value, cachedAt: row.cached_at };
}

export function setEntry(key: string, entry: CacheEntry): void {
  getDb()
    .prepare('INSERT OR REPLACE INTO token_cache (key, value, cached_at) VALUES (?, ?, ?)')
    .run(key, entry.value, entry.cachedAt);
}

export function deleteEntry(key: string): boolean {
  const result = getDb()
    .prepare('DELETE FROM token_cache WHERE key = ?')
    .run(key);
  return result.changes > 0;
}

export function clearSetters(): void {
  getDb().prepare('DELETE FROM token_cache').run();
}

export function clearCache(): void {
  clearSetters();
  clearResponses();
}

export function listEntries(): { key: string; cachedAt: string }[] {
  const rows = getDb()
    .prepare('SELECT key, cached_at FROM token_cache ORDER BY key')
    .all() as { key: string; cached_at: string }[];
  return rows.map((r) => ({ key: r.key, cachedAt: r.cached_at }));
}

export function deriveKey(varName: string, fingerprint: string): string {
  return `${varName}::${fingerprint}`;
}

export function isFresh(
  entry: CacheEntry,
  ttlMs: number,
  validator?: (value: string) => boolean,
): boolean {
  const cachedAt = Date.parse(entry.cachedAt);
  if (Number.isNaN(cachedAt)) return false;
  if (ttlMs !== Infinity && Date.now() - cachedAt > ttlMs) return false;
  if (validator && !validator(entry.value)) return false;
  return true;
}
