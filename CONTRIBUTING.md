# Contributing

Fork of [DirectorVector/n8n-nodes-kraken](https://github.com/DirectorVector/n8n-nodes-kraken).
The sharp edges below were each hit once; they are written down so they are not
rediscovered.

## Getting set up

```bash
npm ci          # not `npm install` — see the eslint pin below
npm run build
npm run lint
npm test        # unit tests, run against dist
npm run test:built
```

`npm run test:live` runs the upstream scripts against the public Kraken API.

## Sharp edges

**Nonces only go up.** Kraken rejects any nonce not higher than the last one
seen for an API key, and there is no reset. `nextNonce()` uses milliseconds and
bumps on ties — the scheme `node-kraken-api` used. Changing it (to microseconds
and back, say) locks out every key that was already used.

**History is paged newest-first.** Without an `end`, Kraken recounts up to "now"
on every page, so entries arriving mid-run shift the offsets and are skipped
silently. `timeRange()` pins `end` to the start of the run.

**No runtime dependencies.** n8n rejects community packages that have them.
Talk to Kraken through `KrakenClient` over `this.helpers.httpRequest`; the
signature test uses the example from Kraken's REST docs.

**`eslint` is pinned to an exact version.** `@n8n/eslint-plugin-community-nodes`
declares it as an exact peer. A caret range passes `npm install` and fails
`npm ci`.

**Use `'main' as NodeConnectionType`, not `NodeConnectionType.Main`.** An older
shared `n8n-workflow` lacks the constant and n8n reports it as *"Class could not
be found"*.

**`n8n-workflow` types follow the cluster's n8n**, not npm's `latest` tag, which
lags far behind (2.16.0 while n8n ships 2.39.x). Look up
`npm view n8n@<version> dependencies.n8n-workflow`. The node `group` must be one
of n8n's `NodeGroupType` values; upstream's `'finance'` stopped compiling.

## The very first publish of a new package

A trusted publisher can only be configured on a package that already exists, and
`publishConfig.provenance` fails outside CI (`provider: null`). So the first
version goes out once by hand, logged in, with `--no-provenance`:

```bash
npm login
npm publish --no-provenance
npm trust github @munin92/<package> --file release.yml --repo munin92/<repo> --allow-publish
```

Without `npm login` first, the publish into the `@munin92` scope answers
`404 Not Found`, not 401. An `NPM_TOKEN` in CI does not help: tokens that bypass
2FA are being restricted for publishing, and the run fails with `EOTP` after
semantic-release has already pushed the tag — then the tag has to be published
by hand anyway (this happened for 2.0.0).

## Commits and releases

Conventional Commits — semantic-release reads them and every push to `main`
publishes through npm trusted publishing with provenance, no token.
Merge `develop` → `main` with a merge commit, never squash: semantic-release
needs the individual commits. Do not edit the version in `package.json`.
