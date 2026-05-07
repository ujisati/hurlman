import * as fs from 'node:fs';
import { loadEnvs } from '../lib/env-loader.js';
import { loadSetters } from '../lib/setter-loader.js';
import { runSetters } from '../lib/setter-runner.js';
import { runHurl, hasErrorFormatFlag } from '../lib/hurl-dispatcher.js';
import { formatOutput } from '../lib/log-formatter.js';
import type { LogMode } from '../types.js';

const DEFAULT_SETTERS_PATH = 'runner/setters.ts';
const DEFAULT_ENVS_DIR = 'envs';

export async function runCommand(opts: {
  env: string[];
  log: LogMode;
  passthrough: string[];
  settersPath?: string;
  envsDir?: string;
}): Promise<void> {
  const settersPath = opts.settersPath ?? DEFAULT_SETTERS_PATH;
  const envsDir = opts.envsDir ?? DEFAULT_ENVS_DIR;

  const rawEnv = loadEnvs(opts.env, envsDir);
  const setters = await loadSetters(settersPath);
  const resolved = await runSetters(setters, rawEnv);

  const variables = { ...rawEnv, ...resolved.variables };
  const secrets = resolved.secrets;

  const result = await runHurl(opts.passthrough, variables, secrets, opts.log);

  if (!hasErrorFormatFlag(opts.passthrough) && opts.log !== 'raw') {
    if (result.reportPath && result.storeDir) {
      formatOutput(result.reportPath, result.storeDir, opts.log);
    }
  }

  if (result.tmpDir) {
    fs.rmSync(result.tmpDir, { recursive: true, force: true });
  }

  process.exit(result.exitCode ?? 1);
}
