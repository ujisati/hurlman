# hurlman

A thin CLI wrapper around [hurl](https://hurl.dev/) that adds environment composition and computed-variable injection (with persistent caching). Lets you declare token-minting / value-fetching logic alongside your static config and run hurl files without sourcing shell scripts.

Hurlman does not format, capture, or interpret hurl's output. Hurl owns stdout/stderr.

## Requirements

- Node.js >= 20
- [hurl](https://hurl.dev/) >= 4.0 on PATH

## Install

```bash
npm install --save-dev hurlman
```

## Quickstart

```bash
npx hurlman init
```

Creates `envs/default.js`. Edit it to add your config:

```js
/** @type {import('hurlman').EnvModule} */
const env = {
  variables: {
    base_url: 'https://api.example.com',
    client_id: 'demo-app',

    // Computed variable (runs at invocation time):
    api_token: {
      produce: async (env) => signJwt(env.client_id),
      cacheable: true,
      ttlMs: 28800000,
      fingerprint: (env) => env.client_id,
      secret: true,
    },
  },
};
export default env;
```

Then run hurl files with variables injected:

```bash
npx hurlman run -- requests/users.hurl --test
```

## CLI

Hurlman flags come first. The literal `--` separator divides hurlman flags from hurl flags. Anything after `--` is forwarded to hurl verbatim.

```bash
npx hurlman run [--env <name>...] [--envs-dir <path>] [--refresh] -- <hurl args>
npx hurlman env [--env <name>...] [--envs-dir <path>] [--refresh]
npx hurlman init [--envs-dir <path>] [--force]
npx hurlman cache list
npx hurlman cache clear
npx hurlman cache invalidate <key>
```

Examples:

```bash
# Default env (envs/default.js):
npx hurlman run -- foo.hurl

# Compose default + staging:
npx hurlman run --env staging -- foo.hurl --test

# Pass any hurl flag through:
npx hurlman run -- foo.hurl --very-verbose --error-format long --report-html out/
```

## Env composition

`envs/default.js` is required and always loads first. `--env staging` adds `envs/staging.js` on top. `--env a --env b` loads `a` then `b` over default. Later writes win on key conflict.

A common pattern: declare a setter once in `default.js`, and let each named env supply its own inputs through static variables.

```js
// envs/default.js — setter + base inputs
export default {
  variables: {
    base_url: 'https://default.example.com',
    client_id: 'default-app',
    api_token: {
      produce: (env) => signJwt(env.client_id, env.base_url),
      cacheable: true,
      fingerprint: (env) => `${env.client_id}@${env.base_url}`,
      secret: true,
    },
  },
};

// envs/staging.js — only the inputs differ; setter from default still runs
export default {
  variables: {
    base_url: 'https://staging.example.com',
    client_id: 'staging-app',
  },
};
```

On `--env staging`, the setter sees the merged static map (staging's inputs win), recomputes, and the fingerprint puts it in its own cache entry.

## Setter contract

Each setter is an object with a `produce` function plus optional knobs:

| field | type | default | notes |
|---|---|---|---|
| `produce` | `(env) => string \| Promise<string>` | required | Receives the merged static-variables map. |
| `cacheable` | boolean | `false` | If true, the value is cached on disk. |
| `ttlMs` | number | `3600000` | Cache age limit. Use `Infinity` to cache indefinitely. |
| `validator` | `(value) => boolean` | undefined | Optional second freshness check (e.g. JWT not expired). False → re-produce. |
| `secret` | boolean | `false` | If true, injected as `--secret` (redacted in hurl's verbose output). |
| `fingerprint` | `(env) => string` | `() => ''` | Cache-key suffix from inputs. Critical when the same setter runs against different inputs. |

## Cache

Cache is stored at `.cache.json` in the project root (override via `HURLMAN_CACHE_PATH`). Add it to your `.gitignore`.

```bash
npx hurlman cache list             # show keys + timestamps (no values)
npx hurlman cache invalidate <key> # remove one entry
npx hurlman cache clear            # wipe all
npx hurlman run --refresh -- ...   # bypass cache for this run (writes back)
```

## TypeScript users

Env files can be plain JS with JSDoc types, or TS if you invoke hurlman via your own loader:

```bash
tsx node_modules/.bin/hurlman run -- foo.hurl
```

Hurlman itself does not bundle a TS loader.

## License

MIT
