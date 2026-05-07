import * as cp from 'node:child_process';

export function runHurl(
  hurlArgs: string[],
  variables: Record<string, string>,
  secrets: Record<string, string>,
): number | null {
  const args: string[] = [];
  for (const [k, v] of Object.entries(secrets)) {
    args.push('--secret', `${k}=${v}`);
  }
  for (const [k, v] of Object.entries(variables)) {
    args.push('--variable', `${k}=${v}`);
  }
  args.push(...hurlArgs);

  const result = cp.spawnSync('hurl', args, {
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) {
    process.stderr.write(`Failed to run hurl: ${result.error.message}\n`);
    return 1;
  }
  return result.status;
}
