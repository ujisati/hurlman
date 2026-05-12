import * as fs from 'node:fs';
import * as path from 'node:path';
import type { HurlmanConfig } from '../types.js';

const DEFAULTS: HurlmanConfig = {
  proxy: {
    enabled: false,
    ttlMs: 28800000,
  },
};

export function loadConfig(): HurlmanConfig {
  const configPath = path.resolve(process.cwd(), 'hurlman.json');
  if (!fs.existsSync(configPath)) return DEFAULTS;

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    throw new Error(`hurlman.json is not valid JSON`);
  }

  const obj = raw as Record<string, unknown>;
  const proxy = (obj.proxy ?? {}) as Record<string, unknown>;

  return {
    proxy: {
      enabled: typeof proxy.enabled === 'boolean' ? proxy.enabled : DEFAULTS.proxy.enabled,
      url: typeof proxy.url === 'string' ? proxy.url : undefined,
      ttlMs:
        proxy.ttlMs === null
          ? null
          : typeof proxy.ttlMs === 'number'
          ? proxy.ttlMs
          : DEFAULTS.proxy.ttlMs,
    },
  };
}
