export type LogMode = 'quiet' | 'default' | 'full' | 'raw';

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

export interface HurlEntry {
  index: number;
  method: string;
  url: string;
  status: number;
  asserts: HurlAssert[];
  request: {
    headers: { name: string; value: string }[];
  };
  response: {
    headers: { name: string; value: string }[];
    status: number;
    url: string;
    body: string;
  };
}

export interface HurlAssert {
  success: boolean;
  message: string;
  line: number;
}
