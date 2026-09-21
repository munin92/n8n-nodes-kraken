# [2.0.0](https://github.com/munin92/n8n-nodes-kraken/compare/v1.3.0...v2.0.0) (2026-09-21)


### Bug Fixes

* drop runtime dependencies and move to the n8n community lint ([51572c1](https://github.com/munin92/n8n-nodes-kraken/commit/51572c10cd6b5ca832b84311829a3dc6c748e716))
* load under shared n8n-workflow and make the credential test sign its request ([147ad06](https://github.com/munin92/n8n-nodes-kraken/commit/147ad0656837cc7e8cbea6e6052ff277534bc7de))
* pin the history window so paging cannot skip entries ([0cb2c1b](https://github.com/munin92/n8n-nodes-kraken/commit/0cb2c1bac62e9f931f141e2503f3112f31aee4f5))
* use a valid node group and refresh the lockfile ([b759192](https://github.com/munin92/n8n-nodes-kraken/commit/b759192f5ce6a89e3a152b0ebac22240ba352f2d))


### Features

* add Get Ledgers and paginate ledger and trade history ([891bfc1](https://github.com/munin92/n8n-nodes-kraken/commit/891bfc1f49041cbce0b3a6240eb72692ca9d8c2d))


### BREAKING CHANGES

* Get Trades History emits one item per trade instead of a
single item holding the trades map.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
