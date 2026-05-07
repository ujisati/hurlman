import type { SetterRecord } from '../types.js';
import { getEntry, setEntry, deriveKey, isFresh } from './cache-engine.js';

const REFRESH = (process.env.REFRESH ?? '0') !== '0';

export interface ResolvedVars {
  variables: Record<string, string>;
  secrets: Record<string, string>;
}

export async function runSetters(
  setters: Record<string, SetterRecord>,
  env: Record<string, string>,
): Promise<ResolvedVars> {
  const variables: Record<string, string> = {};
  const secrets: Record<string, string> = {};

  for (const [name, setter] of Object.entries(setters)) {
    const ttlMs = setter.ttlMs ?? 3600000;

    let value: string;

    if (setter.cacheable && !REFRESH) {
      const fp = (setter.fingerprint ?? (() => ''))(env);
      const key = deriveKey(name, fp);
      const cached = getEntry(key);
      const validator = setter.validator;

      if (cached && isFresh(cached, ttlMs, validator)) {
        value = cached.value;
      } else {
        value = await safeProduce(name, setter.produce, env);
        setEntry(key, { value, cachedAt: new Date().toISOString() });
      }
    } else {
      value = await safeProduce(name, setter.produce, env);
    }

    if (setter.secret) {
      secrets[name] = value;
    } else {
      variables[name] = value;
    }
  }

  return { variables, secrets };
}

async function safeProduce(
  name: string,
  produce: (env: Record<string, string>) => string | Promise<string>,
  env: Record<string, string>,
): Promise<string> {
  try {
    return await produce(env);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Setter '${name}' failed: ${msg}`);
  }
}
