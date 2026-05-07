import * as cp from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const DEFAULT_SETTERS_CONTENT = `/*
 * Hurlman setters — declare computed hurl variables here.
 *
 * Each key is a hurl variable name (lower_snake).
 * Hurlman calls produce(env) where env is the resolved key/value map
 * from your .env files.
 *
 * Example setter (commented out):
 *
 *   import type { SetterRecord } from "hurlman/types";
 *   const setters: Record<string, SetterRecord> = {
 *     // Static alias — runs every time, no caching:
 *     // api_url: { produce: (env) => env.base_url + "/api" },
 *
 *     // Cached token — cached per client_id, refreshes every 8 hours:
 *     // api_token: {
 *     //   produce: async (env) => { … sign a JWT … },
 *     //   cacheable: true,
 *     //   ttlMs: 28800000,
 *     //   validator: (val) => jwtNotExpired(val),
 *     //   fingerprint: (env) => env.client_id,
 *     //   secret: true,
 *     // },
 *   };
 *   export default setters;
 */
export default {};`;

const DEFAULT_ENV_CONTENT = `# Hurlman environment file.
# Format: KEY=VALUE per line (no interpolation, no shell expansion).
# Lines starting with # are comments. Blank lines are ignored.

# base_url=https://httpbin.org
# client_id=my-client
`;

function hurlExists(): boolean {
  try {
    cp.execSync('hurl --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function writeIfMissing(filePath: string, content: string, force: boolean): boolean {
  if (fs.existsSync(filePath) && !force) {
    console.log(`  exists, skipping: ${path.relative(process.cwd(), filePath)}`);
    return false;
  }
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  created: ${path.relative(process.cwd(), filePath)}`);
  return true;
}

export async function initCommand(opts: {
  settersPath?: string;
  envsDir?: string;
  force?: boolean;
}): Promise<void> {
  if (!hurlExists()) {
    console.error('Error: hurl >= 4.0 must be installed and on PATH.');
    process.exit(1);
  }

  const settersPath = opts.settersPath ?? 'runner/setters.ts';
  const envsDir = opts.envsDir ?? 'envs';

  console.log('hurlman init');

  writeIfMissing(path.resolve(envsDir, 'default.env'), DEFAULT_ENV_CONTENT, opts.force ?? false);
  writeIfMissing(path.resolve(settersPath), DEFAULT_SETTERS_CONTENT, opts.force ?? false);

  const readmeDir = path.resolve('scripts');
  const readmePath = path.join(readmeDir, 'README.md');
  if (!fs.existsSync(readmeDir)) fs.mkdirSync(readmeDir, { recursive: true });
  if (!fs.existsSync(readmePath) || opts.force) {
    fs.writeFileSync(
      readmePath,
      `# Scripts

Write bash scripts here to compose \`npx hurlman\` calls.

Example:

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail
npx hurlman run --env staging \\
  --glob "api/users/**/*.hurl" \\
  --report-html build/report
\`\`\`
`,
      'utf-8',
    );
    console.log(`  created: scripts/README.md`);
  } else {
    console.log(`  exists, skipping: scripts/README.md`);
  }

  console.log('Done.');
}
