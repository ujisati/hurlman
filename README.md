# hurlman

A thin CLI wrapper around [hurl](https://hurl.dev/) that adds environment composition, computed-variable injection (with persistent caching), and an optional transparent HTTP proxy cache that replays prior API responses without modifying `.hurl` files.

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
npx hurlman run [--env <name>...] [--envs-dir <path>] [--refresh] [--cache|--no-cache] -- <hurl args>
npx hurlman env [--env <name>...] [--envs-dir <path>] [--refresh]
npx hurlman init [--envs-dir <path>] [--force]
npx hurlman cache list
npx hurlman cache clear [--responses [<pattern>]] [--setters]
npx hurlman cache invalidate <key>
```

Examples:

```bash
# Default env (envs/default.js):
npx hurlman run -- foo.hurl

# Compose default + staging:
npx hurlman run --env staging -- foo.hurl --test

# Enable HTTP response cache for this run:
npx hurlman run --cache -- foo.hurl

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
| `cacheable` | boolean | `false` | If true, the value is cached in `.hurlman.db`. |
| `ttlMs` | number | `3600000` | Cache age limit. Use `Infinity` to cache indefinitely. |
| `validator` | `(value) => boolean` | undefined | Optional second freshness check (e.g. JWT not expired). False → re-produce. |
| `secret` | boolean | `false` | If true, injected as `--secret` (redacted in hurl's verbose output). |
| `fingerprint` | `(env) => string` | `() => ''` | Cache-key suffix from inputs. Critical when the same setter runs against different inputs. |

## Token/setter cache

Cached setter values are stored in `.hurlman.db` (SQLite) in the project root. Override the path with `HURLMAN_CACHE_PATH`. Add `.hurlman.db` to your `.gitignore`.

```bash
npx hurlman cache list              # show keys + timestamps (no values)
npx hurlman cache invalidate <key>  # remove one entry
npx hurlman cache clear --setters   # wipe only setter/token entries
npx hurlman run --refresh -- ...    # bypass cache for this run (writes back)
```

## HTTP response cache

Hurlman can optionally spawn a local HTTPS proxy before each hurl invocation to **memoize successful responses from a hurl flow**. On a first run it records, on subsequent runs it replays — failed or uncached steps re-execute against the real API, prior successful steps are served from the database. Think of it as step memoization for a request flow, not a generic HTTP cache.

What gets cached:

- **Only 2xx responses.** 3xx, 4xx, 5xx pass through unchanged but are never persisted, so a failing step always retries against the real API on the next run.
- **All HTTP methods** — including POST/PUT/PATCH/DELETE. This is required so that chained workflows (a POST that returns an `id`, then a GET against that `id`) stay self-consistent across re-runs.

A corollary worth knowing: once a flow has been recorded successfully, re-runs do not hit the real backend at all. That's the point — but it means side effects (real rows in the DB, etc.) are not re-applied. Use `hurlman cache clear --responses [pattern]` to force a fresh round-trip when you want one.

Enable it via `hurlman.json`:

```json
{
  "proxy": {
    "enabled": true,
    "ttlMs": 28800000
  }
}
```

Per-run overrides:

```bash
npx hurlman run --cache -- foo.hurl     # enable for this run
npx hurlman run --no-cache -- foo.hurl  # disable for this run
```

Cache key: `METHOD::URL::SHA256(body)`. Request headers are not part of the key, so auth token rotation doesn't invalidate cached responses.

Managing response cache entries:

```bash
npx hurlman cache clear                           # wipe everything (responses + setters)
npx hurlman cache clear --responses               # wipe all response entries
npx hurlman cache clear --responses api.example.com  # wipe responses matching URL substring
npx hurlman cache clear --setters                 # wipe only setter/token entries
```

### `hurlman.json` options

| key | type | default | notes |
|---|---|---|---|
| `proxy.enabled` | boolean | `false` | Start the proxy on `run` |
| `proxy.url` | string | auto | Override the proxy address (e.g. for a fixed port) |
| `proxy.ttlMs` | number \| null | `28800000` | Response TTL in ms. `null` = never expire. |

## TypeScript users

Env files can be plain JS with JSDoc types, or TS if you invoke hurlman via your own loader:

```bash
tsx node_modules/.bin/hurlman run -- foo.hurl
```

Hurlman itself does not bundle a TS loader.

## Agent Skill

A skill for AI coding agents is bundled in this package. Install it with:

```bash
npx skills add ujisati/hurlman
```

This teaches your agent how to work in a hurlman project — running hurl files, editing env files, composing environments, and managing the cache.

## License

MIT
