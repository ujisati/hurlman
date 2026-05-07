#!/usr/bin/env node

import { program } from 'commander';
import { initCommand } from './commands/init.js';
import { runCommand } from './commands/run.js';
import { envCommand } from './commands/env.js';
import { cacheCommand } from './commands/cache.js';
import type { LogMode } from './types.js';

const collect = (val: string, prev: string[]) => prev.concat(val);

program.name('hurlman').version('0.1.0');

program
  .command('init')
  .description('Bootstrap a new project with the expected file layout')
  .option('--setters-path <path>', 'Path to setters file', 'runner/setters.ts')
  .option('--envs-dir <path>', 'Path to envs directory', 'envs')
  .option('--force', 'Overwrite existing files')
  .action((opts) => initCommand(opts));

program
  .command('run [passthrough...]')
  .description('Resolve env + setters, run hurl')
  .option('--env <name>', 'Environment to load (repeatable)', collect, [] as string[])
  .option('--log <mode>', 'Log mode: quiet | default | full | raw', 'default')
  .option('--setters-path <path>', 'Path to setters file')
  .option('--envs-dir <path>', 'Path to envs directory')
  .action((passthrough: string[], opts) => {
    runCommand({
      env: opts.env,
      log: opts.log as LogMode,
      passthrough: passthrough ?? [],
      settersPath: opts.settersPath,
      envsDir: opts.envsDir,
    });
  });

program
  .command('env')
  .description('Print the resolved hurl-variable map')
  .option('--env <name>', 'Environment to load (repeatable)', collect, [] as string[])
  .option('--setters-path <path>', 'Path to setters file')
  .option('--envs-dir <path>', 'Path to envs directory')
  .action((opts) => envCommand(opts));

program
  .command('cache <action> [key]')
  .description('Inspect / manage the persistent cache')
  .action((action: string, key: string | undefined) => cacheCommand(action, key));

program.parse();
