import * as fs from 'node:fs';
import * as path from 'node:path';

function parseEnvFile(content: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim().toLowerCase();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

export function loadEnvs(
  envNames: string[],
  envsDir: string,
): Record<string, string> {
  const names = envNames.length > 0 ? envNames : ['default'];
  const resolved: Record<string, string> = {};

  for (const name of names) {
    const filePath = path.resolve(envsDir, `${name}.env`);
    if (!fs.existsSync(filePath)) {
      throw new Error(
        `Environment file not found: ${filePath}`,
      );
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const vars = parseEnvFile(content);
    for (const [k, v] of Object.entries(vars)) {
      resolved[k] = v;
    }
  }

  return resolved;
}
