# Ethereum Gas Price Chrome Extension

Manifest V3 badge-only extension. Displays the current Ethereum gas price (Gwei) for slow confirmation on the toolbar badge.

## Commands

- **Lint:** `npm run lint` — ESLint with `unicorn` + `security` plugins; config in `release/config/eslint.config.mjs`
- **Pack:** `npm run pack` — builds `.zip` + `.crx` into `dist/` via `release/scripts/pack.mjs` (requires `../Chrome-Extension-Keys/key.pem` for CRX signing)
- **Install for dev:** Load unpacked from repo root in `chrome://extensions` with Developer Mode on

## Release Process

1. **Bump version** in `manifest.json` `"version"` field
2. **Commit** all changes, push to `main`
3. **Run:** `npm run publish` (or `bash ../release/scripts/tag_release.sh .`)
   - Compares manifest version vs latest git tag
   - If newer: creates tag `v{version}`, builds ZIP+CRX, creates GitHub Release with both artifacts
4. **Requirements:** `gh` CLI authenticated, private key at `../Chrome-Extension-Keys/key.pem`
5. **Never commit** `key.pem`

## Architecture

Single-file extension. No modules, no imports — `background.js` is the entire codebase.

```
background.js          <- service worker; all logic inline
```

No options page, no popup, no content scripts.

## Key Patterns

- **Badge-only display** — `updateBadge(gasText)` truncates to 4 chars max for badge readability.
- **Exponential-backoff fetch** — `fetchWithRetry(url, opts, maxRetries=6, baseDelay=1000)` retries with doubling delay on network errors.
- **Cache with TTL** — `fetchEthGasPrice(forceUpdate=false)` checks `chrome.storage.local` for a cached value with 5-minute TTL before hitting the API.
- **API:** `GET https://api.blocknative.com/gasprices/blockprices?chainid=1` — extracts `blockPrices[0].estimatedPrices`, finds the 95% confidence price entry.
- **Re-initialization** — `chrome.runtime.onStartup` + `chrome.idle.onStateChanged` listeners re-fetch after browser restart or wake from sleep, since service workers are lazy-loaded in MV3.
- **Alarm** — `chrome.alarms` fires `'updateEthGasPrice'` every 5 minutes (shorter interval than other extensions due to gas price volatility).
- **Storage keys in `chrome.storage.local`:** `ethGasPrice` (number), `ethGasPriceTimestamp` (epoch ms).

## Gotchas

- **No bundler/transpiler** — plain JS loaded by Chrome. Don't use Node.js-only APIs.
- **`../release/` is a separate git repo** (`chrome-ext-release`) containing shared build tooling. Changes to build tooling go there.
- **CSP:** `script-src 'self'` — no inline scripts in HTML; all JS in separate files.
- **`sort -V` is broken on Windows** — if `tag_release.sh` version detection fails, tag manually.
