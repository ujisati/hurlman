---
name: hurlman
description: >
  Use this skill whenever you are working in a project that uses hurlman — signs include an `envs/` directory
  (especially `envs/default.js`), `.hurl` files, or `hurlman` in `package.json` dependencies. Use it when the
  user wants to run hurl files, add or edit env variables or setters, compose environments, debug variable
  injection, manage the cache, or configure the HTTP proxy cache. Even if the user just says "run the hurl file"
  or "add an env var", use this skill — don't try to invoke hurl directly without it in a hurlman project.
---

# Hurlman

Hurlman is a thin CLI wrapper around [hurl](https://hurl.dev/) that adds environment composition, computed-variable injection with persistent caching, and an optional transparent HTTP proxy cache that replays prior API responses. Hurl owns all output; hurlman only injects variables, manages the cache, and optionally intercepts HTTP traffic.

- Hurl docs: https://hurl.dev/docs/manual.html
- Unsure about a hurl flag? Run `hurl -h`
- Unsure about a hurlman flag? Run `hurlman -h` or `npx hurlman -h`

Hurlman may be invoked as `hurlman` (global install) or `npx hurlman` (local/dev dependency). Check `package.json` to determine which applies, or just try `hurlman` first.

## Recognizing a Hurlman Project

- `envs/default.js` (required — always loads first)
- `.hurl` files anywhere in the project
- `.hurlman.db` (gitignored, SQLite cache created on first use)
- `hurlman.json` (optional config for proxy settings)

## Running Hurl Files

Hurlman flags go before `--`; everything after `--` is forwarded verbatim to hurl:

```bash
hurlman run -- foo.hurl
hurlman run --env staging -- foo.hurl --test
hurlman run -- foo.hurl --very-verbose --error-format long --report-html out/
```

Enable or disable the HTTP response cache for a single run:

```bash
hurlman run --cache -- foo.hurl     # enable proxy cache for this run
hurlman run --no-cache -- foo.hurl  # disable proxy cache for this run
```

## Env Files

`envs/<name>.{js,mjs,cjs}` exports `{ variables }`. Variables are either static strings or computed setters:

```js
export default {
  variables: {
    base_url: 'https://api.example.com',
    api_token: {
      produce: async (env) => fetchToken(env.client_id),
      cacheable: true,
      ttlMs: 3600000,
      fingerprint: (env) => env.client_id,
      secret: true,
    },
  },
};
```

Setter fields: `produce` (required), `cacheable`, `ttlMs`, `fingerprint`, `validator`, `secret`.

## Env Composition

`envs/default.js` always loads first. Named envs layer on top — later keys win:

```bash
hurlman run --env staging -- foo.hurl
hurlman run --env a --env b -- foo.hurl
```

Named envs only need to declare inputs that differ. Setters declared in `default.js` run against the merged static map automatically.

## Inspecting Resolved Variables

```bash
hurlman env
hurlman env --env staging
```

## Token/Setter Cache

Cached setter values live in `.hurlman.db` (SQLite) at the project root. Override with `HURLMAN_CACHE_PATH`.

```bash
hurlman cache list              # show keys + timestamps (no values)
hurlman cache invalidate <key>  # remove one entry
hurlman cache clear --setters   # wipe only setter/token entries
hurlman run --refresh -- ...    # bypass cache for this run (writes back)
```

## HTTP Proxy Cache

When enabled, hurlman spawns a local HTTPS proxy that memoizes **successful (2xx)** responses from a hurl flow into `.hurlman.db`. On re-runs, prior 2xx steps replay from the database; non-2xx and uncached steps re-execute against the real API. All methods are cached on 2xx (including POSTs — required for ID-chaining workflows). Once recorded, re-runs do not hit the real backend; clear the cache to force a fresh round-trip.

Configure via `hurlman.json` in the project root:

```json
{
  "proxy": {
    "enabled": true,
    "ttlMs": 28800000
  }
}
```

Cache key: `METHOD::URL::SHA256(body)`. Request headers are not part of the key, so auth token rotation doesn't invalidate cached responses. `--insecure` is auto-injected into hurl when the proxy is active.

Managing response cache entries:

```bash
hurlman cache clear                              # wipe everything
hurlman cache clear --responses                  # wipe all response entries
hurlman cache clear --responses api.example.com  # wipe responses matching URL substring
hurlman cache clear --setters                    # wipe only setter/token entries
```
