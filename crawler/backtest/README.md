# Backtest environment

Deterministic test bench for platform crawlers. No live platform traffic is
used: a local mock replays fixtures, injects latency, failures and rate limits,
and the crawler is checked against expected rows.

## Parts

| Path | Purpose |
|---|---|
| `fixtures/` | Sanitized captured responses (start with the synthetic TikTok sample) |
| `mock/server.js` | Local mock API with latency, error rate, rate limit, missing items |
| `client.js` | Reference client with retry/backoff and normalized output contract |
| `har/import.js` | Converts a HAR capture into a fixture, strips request headers |
| `backtest.test.js` | Happy path, missing item, retries, rate limit, pagination, HAR sanitization |

## Run

```bash
npm run backtest
```

## Capturing traffic (your own test device)

Use a proxy you control (mitmproxy, Charles, Proxyman) or the browser DevTools
Network panel, and export a HAR. Only capture sessions you own and are allowed
to test. The importer keeps method, URL, status and response body, and drops
request headers (cookies, tokens).

```bash
node backtest/har/import.js capture.har fixtures/tiktok/capture.json
```

Decoding tools worth having locally:

- `gzip`/`brotli` for compressed bodies
- `jq` for JSON inspection
- `protobufjs` or `msgpack` when a response is not JSON
- `mitmproxy` for replay, rewrite and latency simulation

The backtest environment does not bypass platform protections. It replays
responses you already captured in a normal session, so crawler logic can be
tested without hitting the platform.

## TikTok Shop surfaces to capture

Start with these five, one fixture each:

1. Product detail
2. Search result page
3. Shop page
4. Reviews page
5. Video/live attach to product

For each, record which fields exist and how they behave before writing the
adapter. Open questions to settle from captures:

- Is the displayed sold count lifetime or 30 days, and is a second field present?
- Are variant prices and stock separate objects?
- Are vouchers and flash-sale prices in the product payload or a separate call?
- Is the category a platform taxonomy or free text?
