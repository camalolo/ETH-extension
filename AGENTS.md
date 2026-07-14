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
- **Multi-endpoint RPC** — `fetchGasPrice()` tries multiple public Ethereum RPC endpoints in sequence via `eth_feeHistory`, computing the safe (25th-percentile) gas price from base fee + priority fee. No API key, no rate limits.
- **Cache with TTL** — `fetchEthGasPrice(forceUpdate=false)` checks `chrome.storage.local` for a cached value with 5-minute TTL before hitting the RPC.
- **Retry on failure** — One-shot `chrome.alarms` fires 1 minute after an error to retry, looping until success.
- **Re-initialization** — `chrome.runtime.onStartup` + `chrome.idle.onStateChanged` listeners re-fetch after browser restart or wake from sleep, since service workers are lazy-loaded in MV3.
- **Alarm** — `chrome.alarms` fires `'updateEthGasPrice'` every 5 minutes (shorter interval than other extensions due to gas price volatility).
- **Storage keys in `chrome.storage.local`:** `gas` (number), `lastUpdate` (epoch ms).

## Gotchas

- **No bundler/transpiler** — plain JS loaded by Chrome. Don't use Node.js-only APIs.
- **`../release/` is a separate git repo** (`chrome-ext-release`) containing shared build tooling. Changes to build tooling go there.
- **CSP:** `script-src 'self'` — no inline scripts in HTML; all JS in separate files.
- **`sort -V` is broken on Windows** — if `tag_release.sh` version detection fails, tag manually.
