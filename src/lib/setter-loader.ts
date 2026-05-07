import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { SetterModule, SetterRecord } from '../types.js';

export async function loadSetters(
  settersPath: string,
): Promise<Record<string, SetterRecord>> {
  const resolved = path.resolve(process.cwd(), settersPath);
  const url = pathToFileURL(resolved).href;

  let mod: unknown;
  try {
    mod = (await import(url)) as unknown;
  } catch (err: unknown) {
    throw new Error(
      `Failed to load setters file at ${resolved}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const setterModule = mod as SetterModule;
  if (!setterModule || typeof setterModule !== 'object') {
    throw new Error(`Setters file at ${resolved} must export an object as default`);
  }

  const setters = setterModule.default;
  if (!setters || typeof setters !== 'object') {
    throw new Error(
      `Setters file at ${resolved} must have a default export that is an object`,
    );
  }

  for (const [key, record] of Object.entries(setters)) {
    if (typeof record !== 'object' || record === null) {
      throw new Error(
        `Setter "${key}" must be a setter record object`,
      );
    }
    if (typeof (record as SetterRecord).produce !== 'function') {
      throw new Error(
        `Setter "${key}" must have a "produce" function`,
      );
    }
  }

  return setters as Record<string, SetterRecord>;
}
