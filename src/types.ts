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

export interface ResponseCacheEntry {
  key: string;
  method: string;
  url: string;
  statusCode: number;
  responseHeaders: Record<string, string>;
  responseBody: Buffer;
  cachedAt: string;
}

export interface HurlmanConfig {
  proxy: {
    enabled: boolean;
    url?: string;
    ttlMs: number | null;
  };
}

export interface ProxyHandle {
  address: string;
  stop: () => Promise<void>;
}
