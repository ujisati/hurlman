export interface SetterRecord {
  produce: (env: Record<string, string>) => string | Promise<string>;
  cacheable?: boolean;
  ttlMs?: number;
  validator?: (value: string) => boolean;
  secret?: boolean;
  fingerprint?: (env: Record<string, string>) => string;
}

export interface SetterModule {
  default: Record<string, SetterRecord>;
}

export interface CacheEntry {
  value: string;
  cachedAt: string;
}

export interface CacheFile {
  [key: string]: CacheEntry;
}


