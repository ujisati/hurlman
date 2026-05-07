import { loadEnvs } from '../lib/env-loader.js';
import { loadSetters } from '../lib/setter-loader.js';
import { runSetters } from '../lib/setter-runner.js';

const DEFAULT_SETTERS_PATH = 'runner/setters.ts';
const DEFAULT_ENVS_DIR = 'envs';

export async function envCommand(opts: {
  env: string[];
  settersPath?: string;
  envsDir?: string;
}): Promise<void> {
  const settersPath = opts.settersPath ?? DEFAULT_SETTERS_PATH;
  const envsDir = opts.envsDir ?? DEFAULT_ENVS_DIR;

  const rawEnv = loadEnvs(opts.env, envsDir);
  const setters = await loadSetters(settersPath);
  const resolved = await runSetters(setters, rawEnv);

  for (const key of Object.keys(resolved.variables)) {
    if (key in rawEnv) {
      console.error(
        `# WARNING: ${key} overridden by setter (was: ${rawEnv[key]})`,
      );
    }
  }

  const all = { ...rawEnv, ...resolved.variables, ...resolved.secrets };
  for (const [k, v] of Object.entries(all).sort(([a], [b]) => a.localeCompare(b))) {
    process.stdout.write(`${k}=${v}\n`);
  }
}
