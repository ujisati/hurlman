export interface SetterRecord {
  produce: (env: Record<string, string>) => string | Promise<string>;
  cacheable?: boolean;
  ttlMs?: number;
  validator?: (value: string) => boolean;
  secret?: boolean;
  fingerprint?: (env: Record<string, string>) => string;
}

export type Variable = string | SetterRecord;

export interface EnvModule {
  variables?: Record<string, Variable>;
}

export interface CacheEntry {
  value: string;
  cachedAt: string;
}

export interface CacheFile {
  [key: string]: CacheEntry;
}
