#!/usr/bin/env node

import { program } from 'commander';
import { initCommand } from './commands/init.js';
import { runCommand } from './commands/run.js';
import { envCommand } from './commands/env.js';
import { cacheCommand } from './commands/cache.js';

const collect = (val: string, prev: string[]) => prev.concat(val);

program.name('hurlman').version('0.1.0');

program
  .command('init')
  .description('Bootstrap a new project with envs/default.js')
  .option('--envs-dir <path>', 'Path to envs directory', 'envs')
  .option('--force', 'Overwrite existing files')
  .action((opts) => initCommand(opts));

program
  .command('run [hurlArgs...]')
  .description(
    'Resolve env + setters, then exec hurl. Hurlman flags come first; ' +
      'put "--" before all hurl args. Example: ' +
      'hurlman run --env staging -- foo.hurl --test --very-verbose',
  )
  .option('--env <name>', 'Environment to load (repeatable)', collect, [] as string[])
  .option('--envs-dir <path>', 'Path to envs directory')
  .option('--refresh', 'Force re-produce of cacheable setters; updates the cache')
  .option('--cache', 'Enable HTTP proxy cache for this run (overrides hurlman.json)')
  .option('--no-cache', 'Disable HTTP proxy cache for this run (overrides hurlman.json)')
  .action((hurlArgs: string[], opts) => {
    if (!hurlArgs || hurlArgs.length === 0) {
      process.stderr.write(
        'hurlman run: no hurl arguments provided. Use "--" to pass args to hurl, e.g.\n' +
          '  hurlman run --env staging -- foo.hurl --test\n',
      );
      process.exit(2);
    }
    runCommand({
      env: opts.env,
      hurlArgs,
      envsDir: opts.envsDir,
      refresh: opts.refresh,
      cache: opts.cache as boolean | undefined,
    });
  });

program
  .command('env')
  .description('Print the resolved hurl-variable map')
  .option('--env <name>', 'Environment to load (repeatable)', collect, [] as string[])
  .option('--envs-dir <path>', 'Path to envs directory')
  .option('--refresh', 'Force re-produce of cacheable setters; updates the cache')
  .action((opts) => envCommand(opts));

const cache = program
  .command('cache')
  .description('Inspect / manage the persistent cache');

cache
  .command('list')
  .description('List all token/setter cache keys and their timestamps')
  .action(() => cacheCommand('list'));

cache
  .command('clear [pattern]')
  .description('Wipe the cache. No flags = everything; --responses / --setters to scope.')
  .option('--responses', 'Wipe only HTTP response cache entries (optional URL substring pattern)')
  .option('--setters', 'Wipe only token/setter cache entries')
  .action((pattern: string | undefined, opts: { responses?: boolean; setters?: boolean }) =>
    cacheCommand('clear', undefined, { ...opts, pattern }),
  );

cache
  .command('invalidate <key>')
  .description('Remove a single token/setter cache entry by key')
  .action((key: string) => cacheCommand('invalidate', key));

program.parse();
