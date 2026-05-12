import * as cp from 'node:child_process';

export function runHurl(
  hurlArgs: string[],
  variables: Record<string, string>,
  secrets: Record<string, string>,
  proxyAddress?: string,
): Promise<number> {
  const args: string[] = [];
  if (proxyAddress) {
    args.push('--proxy', proxyAddress, '--insecure');
  }
  for (const [k, v] of Object.entries(secrets)) {
    args.push('--secret', `${k}=${v}`);
  }
  for (const [k, v] of Object.entries(variables)) {
    args.push('--variable', `${k}=${v}`);
  }
  args.push(...hurlArgs);

  return new Promise((resolve) => {
    const child = cp.spawn('hurl', args, { stdio: 'inherit', shell: false });
    child.on('error', (err) => {
      process.stderr.write(`Failed to run hurl: ${err.message}\n`);
      resolve(1);
    });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}
