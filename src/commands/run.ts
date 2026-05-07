import { loadEnvs } from '../lib/env-loader.js';
import { runSetters } from '../lib/setter-runner.js';
import { runHurl } from '../lib/hurl-dispatcher.js';

const DEFAULT_ENVS_DIR = 'envs';

export async function runCommand(opts: {
  env: string[];
  hurlArgs: string[];
  envsDir?: string;
}): Promise<void> {
  const envsDir = opts.envsDir ?? DEFAULT_ENVS_DIR;

  let variables: Record<string, string>;
  let secrets: Record<string, string>;
  try {
    const resolved = await loadEnvs(opts.env, envsDir);
    const ran = await runSetters(resolved.setters, resolved.variables);
    variables = { ...resolved.variables, ...ran.variables };
    secrets = ran.secrets;
  } catch (err: unknown) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }

  const exitCode = runHurl(opts.hurlArgs, variables, secrets);
  process.exit(exitCode ?? 1);
}
