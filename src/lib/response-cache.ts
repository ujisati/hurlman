import * as crypto from 'node:crypto';
import type { ResponseCacheEntry } from '../types.js';
import { getDb } from './db.js';

export function deriveResponseKey(method: string, url: string, body: Buffer | undefined): string {
  const bodyHash = crypto
    .createHash('sha256')
    .update(body ?? Buffer.alloc(0))
    .digest('hex');
  return `${method}::${url}::${bodyHash}`;
}

export function getResponse(key: string): ResponseCacheEntry | undefined {
  const row = getDb()
    .prepare(
      'SELECT key, method, url, status_code, response_headers, response_body, cached_at FROM responses WHERE key = ?',
    )
    .get(key) as
    | {
        key: string;
        method: string;
        url: string;
        status_code: number;
        response_headers: string;
        response_body: Buffer;
        cached_at: string;
      }
    | undefined;
  if (!row) return undefined;
  return {
    key: row.key,
    method: row.method,
    url: row.url,
    statusCode: row.status_code,
    responseHeaders: JSON.parse(row.response_headers) as Record<string, string>,
    responseBody: row.response_body,
    cachedAt: row.cached_at,
  };
}

export function setResponse(entry: ResponseCacheEntry): void {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO responses
        (key, method, url, status_code, response_headers, response_body, cached_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      entry.key,
      entry.method,
      entry.url,
      entry.statusCode,
      JSON.stringify(entry.responseHeaders),
      entry.responseBody,
      entry.cachedAt,
    );
}

export function clearResponses(pattern?: string): void {
  if (pattern) {
    getDb()
      .prepare("DELETE FROM responses WHERE url LIKE '%' || ? || '%'")
      .run(pattern);
  } else {
    getDb().prepare('DELETE FROM responses').run();
  }
}

export function isResponseFresh(entry: ResponseCacheEntry, ttlMs: number | null): boolean {
  if (ttlMs === null) return true;
  const cachedAt = Date.parse(entry.cachedAt);
  if (Number.isNaN(cachedAt)) return false;
  return Date.now() - cachedAt <= ttlMs;
}
