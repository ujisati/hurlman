import { loadEnvs } from '../lib/env-loader.js';
import { runSetters } from '../lib/setter-runner.js';

const DEFAULT_ENVS_DIR = 'envs';

export async function envCommand(opts: {
  env: string[];
  envsDir?: string;
  refresh?: boolean;
}): Promise<void> {
  const envsDir = opts.envsDir ?? DEFAULT_ENVS_DIR;

  let variables: Record<string, string>;
  let setterVars: Record<string, string>;
  let setterSecrets: Record<string, string>;
  try {
    const resolved = await loadEnvs(opts.env, envsDir);
    const ran = await runSetters(resolved.setters, resolved.variables, opts.refresh ?? false);
    variables = resolved.variables;
    setterVars = ran.variables;
    setterSecrets = ran.secrets;
  } catch (err: unknown) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }

  const all = { ...variables, ...setterVars, ...setterSecrets };
  for (const [k, v] of Object.entries(all).sort(([a], [b]) => a.localeCompare(b))) {
    process.stdout.write(`${k}=${v}\n`);
  }
}
