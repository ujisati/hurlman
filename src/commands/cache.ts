import { listEntries, clearCache, deleteEntry } from '../lib/cache-engine.js';

export function cacheCommand(action: string, key?: string): void {
  switch (action) {
    case 'list': {
      const entries = listEntries();
      if (entries.length === 0) {
        console.log('Cache is empty');
        return;
      }
      for (const { key, cachedAt } of entries) {
        process.stdout.write(`${key}\t${cachedAt}\n`);
      }
      return;
    }
    case 'clear': {
      clearCache();
      console.log('Cache cleared');
      return;
    }
    case 'invalidate': {
      if (!key) {
        console.error('Error: "cache invalidate" requires a key');
        process.exit(1);
      }
      const deleted = deleteEntry(key);
      if (deleted) {
        console.log(`Invalidated: ${key}`);
      } else {
        console.log(`Key not found: ${key}`);
      }
      return;
    }
    default: {
      console.error(`Unknown cache action: ${action}`);
      console.error('Available: list, clear, invalidate <key>');
      process.exit(1);
    }
  }
}
