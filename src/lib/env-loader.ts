import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { EnvModule, SetterRecord, Variable } from '../types.js';

export interface ResolvedEnv {
  variables: Record<string, string>;
  setters: Record<string, SetterRecord>;
}

const ENV_EXTENSIONS = ['.js', '.mjs', '.cjs'];

function resolveEnvPath(envsDir: string, name: string): string {
  for (const ext of ENV_EXTENSIONS) {
    const candidate = path.resolve(envsDir, `${name}${ext}`);
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    `Environment file not found: ${path.resolve(envsDir, name)}.{js,mjs,cjs}`,
  );
}

async function loadEnvModule(filePath: string): Promise<EnvModule> {
  const url = pathToFileURL(filePath).href;
  let mod: { default?: unknown } & Record<string, unknown>;
  try {
    mod = (await import(url)) as { default?: unknown } & Record<string, unknown>;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to load env file ${filePath}: ${msg}`);
  }

  const candidate = (mod.default ?? mod) as unknown;
  if (!candidate || typeof candidate !== 'object') {
    throw new Error(
      `Env file ${filePath} must export an EnvModule object (default export)`,
    );
  }
  return candidate as EnvModule;
}

function isSetterRecord(value: unknown): value is SetterRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { produce?: unknown }).produce === 'function'
  );
}

export async function loadEnvs(
  envNames: string[],
  envsDir: string,
): Promise<ResolvedEnv> {
  const names = ['default', ...envNames];
  const merged: Record<string, Variable> = {};
  const lastOrigin: Record<string, string> = {};

  for (const name of names) {
    const filePath = resolveEnvPath(envsDir, name);
    const mod = await loadEnvModule(filePath);
    const vars = mod.variables ?? {};
    if (typeof vars !== 'object' || vars === null) {
      throw new Error(`Env file ${filePath}: "variables" must be an object`);
    }
    for (const [k, v] of Object.entries(vars)) {
      merged[k] = v;
      lastOrigin[k] = filePath;
    }
  }

  const variables: Record<string, string> = {};
  const setters: Record<string, SetterRecord> = {};
  for (const [key, value] of Object.entries(merged)) {
    if (typeof value === 'string') {
      variables[key] = value;
    } else if (isSetterRecord(value)) {
      setters[key] = value;
    } else {
      throw new Error(
        `Variable "${key}" (last set in ${lastOrigin[key]}) must be a string or a SetterRecord with a produce() function`,
      );
    }
  }

  return { variables, setters };
}
