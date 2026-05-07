---
name: hurlman
description: >
  Use this skill whenever you are working in a project that uses hurlman — signs include an `envs/` directory
  (especially `envs/default.js`), `.hurl` files, or `hurlman` in `package.json` dependencies. Use it when the
  user wants to run hurl files, add or edit env variables or setters, compose environments, debug variable
  injection, or manage the cache. Even if the user just says "run the hurl file" or "add an env var", use this
  skill — don't try to invoke hurl directly without it in a hurlman project.
---

# Hurlman

Hurlman is a thin CLI wrapper around [hurl](https://hurl.dev/) that adds environment composition and computed-variable injection with persistent caching. Hurl owns all output; hurlman only injects variables and manages the cache.

- Hurl docs: https://hurl.dev/docs/manual.html
- Unsure about a hurl flag? Run `hurl -h`
- Unsure about a hurlman flag? Run `hurlman -h` or `npx hurlman -h`

Hurlman may be invoked as `hurlman` (global install) or `npx hurlman` (local/dev dependency). Check `package.json` to determine which applies, or just try `hurlman` first.

## Recognizing a Hurlman Project

- `envs/default.js` (required — always loads first)
- `.hurl` files anywhere in the project
- `.cache.json` (gitignored, created on first cached setter run)

## Running Hurl Files

Hurlman flags go before `--`; everything after `--` is forwarded verbatim to hurl:

```bash
hurlman run -- foo.hurl
hurlman run --env staging -- foo.hurl --test
hurlman run -- foo.hurl --very-verbose --error-format long --report-html out/
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

## Cache Management

```bash
hurlman cache list              # show keys + timestamps (no values)
hurlman cache invalidate <key>  # remove one entry
hurlman cache clear             # wipe all
hurlman run --refresh -- ...    # bypass cache for this run (writes back)
```

Cache lives at `.cache.json` in the project root. Override with `HURLMAN_CACHE_PATH`.
