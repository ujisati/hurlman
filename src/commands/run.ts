import { loadEnvs } from '../lib/env-loader.js';
import { loadSetters } from '../lib/setter-loader.js';
import { runSetters } from '../lib/setter-runner.js';
import { runHurl } from '../lib/hurl-dispatcher.js';

const DEFAULT_SETTERS_PATH = 'runner/setters.ts';
const DEFAULT_ENVS_DIR = 'envs';

export async function runCommand(opts: {
  env: string[];
  hurlArgs: string[];
  settersPath?: string;
  envsDir?: string;
}): Promise<void> {
  const settersPath = opts.settersPath ?? DEFAULT_SETTERS_PATH;
  const envsDir = opts.envsDir ?? DEFAULT_ENVS_DIR;

  const rawEnv = loadEnvs(opts.env, envsDir);
  const setters = await loadSetters(settersPath);
  const resolved = await runSetters(setters, rawEnv);

  const variables = { ...rawEnv, ...resolved.variables };
  const exitCode = runHurl(opts.hurlArgs, variables, resolved.secrets);
  process.exit(exitCode ?? 1);
}
