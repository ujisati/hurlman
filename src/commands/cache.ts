import { listEntries, clearCache, clearSetters, deleteEntry } from '../lib/cache-engine.js';
import { clearResponses } from '../lib/response-cache.js';

export function cacheCommand(
  action: string,
  key?: string,
  opts?: { responses?: boolean; setters?: boolean; pattern?: string },
): void {
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
      const { responses = false, setters = false, pattern } = opts ?? {};
      if (!responses && !setters) {
        clearCache();
        console.log('Cache cleared');
      } else {
        if (responses) {
          clearResponses(pattern);
          console.log(pattern ? `Response cache cleared (url ~ "${pattern}")` : 'Response cache cleared');
        }
        if (setters) {
          clearSetters();
          console.log('Setter cache cleared');
        }
      }
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
