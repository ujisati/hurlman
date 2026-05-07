import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CacheEntry, CacheFile } from '../types.js';

let cachePathOverride: string | undefined;

export function setCachePath(p: string): void {
  cachePathOverride = p;
}

export function getCachePath(): string {
  if (cachePathOverride) return cachePathOverride;
  if (process.env.HURLMAN_CACHE_PATH) return process.env.HURLMAN_CACHE_PATH;
  return path.resolve(process.cwd(), '.cache.json');
}

function readCacheFile(): CacheFile {
  const p = getCachePath();
  if (!fs.existsSync(p)) return {};
  const raw = fs.readFileSync(p, 'utf-8');
  return JSON.parse(raw) as CacheFile;
}

function writeCacheFile(cache: CacheFile): void {
  const p = getCachePath();
  fs.writeFileSync(p, JSON.stringify(cache, null, 2), 'utf-8');
}

export function getEntry(key: string): CacheEntry | undefined {
  const cache = readCacheFile();
  return cache[key];
}

export function setEntry(key: string, entry: CacheEntry): void {
  const cache = readCacheFile();
  cache[key] = entry;
  writeCacheFile(cache);
}

export function deleteEntry(key: string): boolean {
  const cache = readCacheFile();
  if (!(key in cache)) return false;
  delete cache[key];
  writeCacheFile(cache);
  return true;
}

export function clearCache(): void {
  writeCacheFile({});
}

export function listEntries(): { key: string; cachedAt: string }[] {
  const cache = readCacheFile();
  return Object.entries(cache).map(([key, entry]) => ({
    key,
    cachedAt: entry.cachedAt,
  }));
}

export function deriveKey(
  varName: string,
  fingerprint: string,
): string {
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
