# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- **Deploy:** `wrangler deploy`
- **Dev server:** `wrangler dev` or `yarn dev`
- **Run all tests:** `yarn test` or `vitest`
- **Run single test:** `vitest run test/index.spec.js -t "test description"`
- **Watch tests:** `vitest watch`

## Architecture

POG-Cache is a Cloudflare Worker that fetches Consumer Price Index (CPI) data from the BLS (Bureau of Labor Statistics) API and caches it in Cloudflare R2 storage. It runs on a daily cron schedule (midnight UTC).

### Data flow
1. `scheduled` handler triggers daily (or manually via `POST /update` with Bearer token auth)
2. For each of the 5 US regions (national, northeast, midwest, south, west), the worker batch-fetches all BLS series IDs defined in `src/goods.json`
3. BLS API responses are processed per-series: each series is matched back to its item in `goods.json` via `findItemBySeriesId()`
4. Individual item data is stored to R2 at `{region}/{itemKey}.json`
5. The full `goods.json` manifest is also uploaded to R2

### Key files
- `src/worker.js` — Single worker file with `scheduled` (cron) and `fetch` (HTTP) handlers
- `src/goods.json` — Item catalog defining categories, items, BLS series IDs per region, and display metadata (icons, colors)
- `wrangler.toml` — Worker config: cron trigger, R2 bucket binding (`POGCACHE_R2_BUCKET`)

### Environment variables (via `env` object)
- `BLS_API_KEY` — BLS API registration key
- `UPDATE_TOKEN` — Bearer token for manual `/update` endpoint
- `POGCACHE_R2_BUCKET` — R2 bucket binding (configured in wrangler.toml)

### Testing
Tests use `@cloudflare/vitest-pool-workers` which runs vitest inside the Workers runtime. Config is in `vitest.config.js` with wrangler.toml providing the worker configuration.

## Code Style
- **Formatting:** Tabs, single quotes, semicolons, 140 char print width (see `.prettierrc`)
- **Indentation:** Tabs for all files, spaces for YAML (see `.editorconfig`)
- **Console logging:** Uses emoji prefixes for status — `✓` success, `❌` error, `⚠️` warning