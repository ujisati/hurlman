import { loadEnvs } from '../lib/env-loader.js';
import { runSetters } from '../lib/setter-runner.js';
import { runHurl } from '../lib/hurl-dispatcher.js';
import { loadConfig } from '../lib/hurlman-config.js';
import { startProxy } from '../lib/proxy-server.js';

const DEFAULT_ENVS_DIR = 'envs';

export async function runCommand(opts: {
  env: string[];
  hurlArgs: string[];
  envsDir?: string;
  refresh?: boolean;
  cache?: boolean;
}): Promise<void> {
  const envsDir = opts.envsDir ?? DEFAULT_ENVS_DIR;

  let config;
  try {
    config = loadConfig();
  } catch (err: unknown) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }

  const proxyEnabled = opts.cache ?? config.proxy.enabled;

  let variables: Record<string, string>;
  let secrets: Record<string, string>;
  try {
    const resolved = await loadEnvs(opts.env, envsDir);
    const ran = await runSetters(resolved.setters, resolved.variables, opts.refresh ?? false);
    variables = { ...resolved.variables, ...ran.variables };
    secrets = ran.secrets;
  } catch (err: unknown) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }

  let proxyAddress: string | undefined;
  const proxyHandle = proxyEnabled ? await startProxy(config.proxy) : undefined;
  if (proxyHandle) proxyAddress = proxyHandle.address;

  const exitCode = await runHurl(opts.hurlArgs, variables, secrets, proxyAddress);
  process.exit(exitCode);
}
