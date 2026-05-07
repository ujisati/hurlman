import * as cp from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ESM_TEMPLATE = `/** @type {import('hurlman').EnvModule} */
const env = {
  variables: {
    // Static values (literal strings):
    // base_url: 'https://api.example.com',

    // Computed values (setter records with a produce() function):
    // api_token: {
    //   produce: async (env) => {
    //     // sign a JWT, fetch a token, etc.
    //     return 'computed-value';
    //   },
    //   cacheable: true,
    //   ttlMs: 28800000,
    //   validator: (val) => true,
    //   fingerprint: (env) => env.client_id ?? '',
    //   secret: true,
    // },
  },
};
export default env;
`;

const CJS_TEMPLATE = `/** @type {import('hurlman').EnvModule} */
const env = {
  variables: {
    // Static values (literal strings):
    // base_url: 'https://api.example.com',

    // Computed values (setter records with a produce() function):
    // api_token: {
    //   produce: async (env) => {
    //     // sign a JWT, fetch a token, etc.
    //     return 'computed-value';
    //   },
    //   cacheable: true,
    //   ttlMs: 28800000,
    //   validator: (val) => true,
    //   fingerprint: (env) => env.client_id || '',
    //   secret: true,
    // },
  },
};
module.exports = env;
`;

function hurlExists(): boolean {
  try {
    cp.execSync('hurl --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function isUserPackageEsm(): boolean {
  const pkgPath = path.resolve(process.cwd(), 'package.json');
  if (!fs.existsSync(pkgPath)) return true;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { type?: string };
    return pkg.type === 'module';
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
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  created: ${path.relative(process.cwd(), filePath)}`);
  return true;
}

export async function initCommand(opts: {
  envsDir?: string;
  force?: boolean;
}): Promise<void> {
  if (!hurlExists()) {
    console.error('Error: hurl >= 4.0 must be installed and on PATH.');
    process.exit(1);
  }

  const envsDir = opts.envsDir ?? 'envs';
  const esm = isUserPackageEsm();
  const template = esm ? ESM_TEMPLATE : CJS_TEMPLATE;

  console.log(`hurlman init (${esm ? 'ESM' : 'CJS'} template)`);
  writeIfMissing(path.resolve(envsDir, 'default.js'), template, opts.force ?? false);
  console.log('Done.');
}
