import * as cp from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { LogMode } from '../types.js';

export interface HurlResult {
  exitCode: number | null;
  reportPath?: string;
  storeDir?: string;
  tmpDir?: string;
}

export function hasErrorFormatFlag(args: string[]): boolean {
  return args.some((a) => a.startsWith('--error-format'));
}

export async function runHurl(
  passthroughArgs: string[],
  variables: Record<string, string>,
  secrets: Record<string, string>,
  logMode: LogMode,
): Promise<HurlResult> {
  const hurlArgs: string[] = [];

  for (const [k, v] of Object.entries(secrets)) {
    hurlArgs.push('--secret', `${k}=${v}`);
  }
  for (const [k, v] of Object.entries(variables)) {
    hurlArgs.push('--variable', `${k}=${v}`);
  }

  const addTest = !passthroughArgs.some(
    (a) => a === '--test' || a.startsWith('--test='),
  ) && !passthroughArgs.some((a) => a.startsWith('--report-html'));

  if (hasErrorFormatFlag(passthroughArgs)) {
    const allArgs = [...hurlArgs, ...passthroughArgs];
    return spawnInherit('hurl', allArgs);
  }

  if (logMode === 'raw') {
    const allArgs = [...hurlArgs, '--json', ...passthroughArgs];
    return spawnInherit('hurl', allArgs);
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hurlman-'));
  const reportPath = path.join(tmpDir, 'report.json');
  const storeDir = path.join(tmpDir, 'store');

  const allArgs = [...hurlArgs, '--report-json', tmpDir, ...passthroughArgs];
  if (addTest) {
    allArgs.push('--test');
  }

  const exitCode = await spawnCapture('hurl', allArgs, tmpDir);

  return { exitCode, reportPath, storeDir, tmpDir };
}

function spawnInherit(cmd: string, args: string[]): HurlResult {
  const result = cp.spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: false,
  });
  return { exitCode: result.status };
}

function spawnCapture(
  cmd: string,
  args: string[],
  tmpDir: string,
): Promise<number | null> {
  return new Promise((resolve) => {
    const child = cp.spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on('data', (d) => stdoutChunks.push(d as Buffer));
    child.stderr.on('data', (d) => stderrChunks.push(d as Buffer));

    child.on('close', (code) => {
      if (code !== 0) {
        const stdout = Buffer.concat(stdoutChunks).toString();
        const stderr = Buffer.concat(stderrChunks).toString();
        if (stdout) process.stdout.write(stdout);
        if (stderr) process.stderr.write(stderr);
      }
      resolve(code);
    });

    child.on('error', (err) => {
      console.error(`Failed to run hurl: ${err.message}`);
      resolve(1);
    });
  });
}
