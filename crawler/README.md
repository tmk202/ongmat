# ecommarketdata crawler backend

Crawl backend designed for millions of Shopee SKUs per day.

## Architecture

```
API (control plane) ──► Redpanda topic crawl.jobs
                              │
                     Worker fleet (fetch, batch 30–50)
                              │  cookies
                     Session service (account + proxy pool)
                              │
                ClickHouse (analytics) + R2 (raw lake)
                              │
                     Postgres (jobs, accounts, watchlists)
```

- **API**: creates jobs, splits items into shards, publishes to Kafka.
- **Workers**: stateless, consume shards, call the session service in batches,
  write rows to ClickHouse and counters to Postgres.
- **Session service**: owns Shopee sessions (cookies, proxies, captcha) and is
  the only component that talks to Shopee. Browsers are used for login/captcha
  refresh, not for every item.
- **Storage**: Postgres holds control data; ClickHouse holds item snapshots
  (billions of rows); R2 keeps immutable raw JSON.

## Quick start (no Docker)

```bash
cd crawler
npm install
npm run demo
```

`npm run demo` starts the API and one worker in-process with a mock fetcher,
queues 500 items, and prints the finished job. Without `KAFKA_BROKERS`,
`DATABASE_URL`, or `CLICKHOUSE_URL`, the stack automatically falls back to the
in-memory bus, in-memory store and JSONL sink (`crawler/data/`).

## Full stack (Docker)

```bash
cd crawler
cp .env.example .env
docker compose up -d redpanda postgres clickhouse redis
docker compose up -d api worker session
curl -s localhost:8300/health
```

Create a job:

```bash
curl -s -X POST localhost:8300/v1/jobs \
  -H 'Authorization: Bearer dev-token' \
  -H 'Content-Type: application/json' \
  -d '{"name":"first run","items":[{"item_id":26077143862,"shop_id":1479983524}]}'
```

Real crawling requires `SESSION_ACCOUNTS` (JSON array of `{cookie, userAgent,
language}`) and VN proxies. Without accounts the session service returns 503 and
workers will not reach Shopee.

## Capacity math

| Target | Design |
|---|---|
| 3,000,000 SKU/day | 35 items/sec average |
| Batch size 30 | ~100,000 requests/day (~1.2 req/sec) |
| Peak | 10x average, handled by concurrency + worker replicas |
| Raw data | ~15 GB/day JSON, ~3 GB/day parquet |
| ClickHouse | ~1.1 B rows/year, partitioned by month |

## Scale-out

- Workers scale horizontally; each shard message is independent and idempotent.
- Increase `CONCURRENCY` and replicas until the session service becomes the
  bottleneck (accounts/proxies), then add session replicas.
- Keep `RATE_PER_SECOND` below the per-account limit; rate limiting is enforced
  inside the worker process and should be sharded per account as traffic grows.
- Kafka partition count controls maximum parallelism per topic.

## Roadmap

1. Account login refresh via Playwright (session service).
2. Proxy rotation and ban detection feeding `crawl.accounts` / `crawl.proxies`.
3. Watchlist scheduler: same SKU list crawled daily to build per-product history.
4. Raw JSON upload to R2 (`@aws-sdk/client-s3`) alongside ClickHouse rows.
5. Grafana dashboards: success rate, ban rate, Kafka lag, items/sec.

## Accounts and proxies

Accounts live in Postgres, leases and rate limits in Redis (memory fallback for
local runs). One account maps to one proxy and one browser context.

Add a proxy:

```bash
curl -X POST localhost:8300/v1/proxies -H 'Authorization: Bearer dev-token' \
  -H 'Content-Type: application/json' \
  -d '{"url":"http://user:pass@1.2.3.4:8000","market":"VN"}'
```

Log in and store an account (opens Chrome with the proxy):

```bash
node services/session/login.js --label=shopee-vn-01 --proxy=http://user:pass@1.2.3.4:8000
```

Check account pool:

```bash
curl localhost:8300/v1/accounts
curl -X POST localhost:8300/v1/proxies/health -H 'Authorization: Bearer dev-token'
```

Runtime rules:

- `ACCOUNT_RPM` requests per account per minute.
- `ACCOUNT_LEASE_MS` lease duration; expired lease frees the account.
- `ACCOUNT_FAIL_LIMIT` consecutive failures before a 120 minute cooldown.
- Session service returns 503 when no account is leasable.

## Watchlists and scheduling

A watchlist is a fixed SKU list that is crawled again on a schedule, which is
what produces per-product history.

```bash
# create watchlist
curl -X POST localhost:8300/v1/watchlists -H 'Authorization: Bearer dev-token' \
  -H 'Content-Type: application/json' -d '{"name":"top-vn","schedule":"daily"}'

# add items
curl -X POST localhost:8300/v1/watchlists/1/items -H 'Authorization: Bearer dev-token' \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"item_id":26077143862,"shop_id":1479983524}]}'

# run once now
curl -X POST localhost:8300/v1/watchlists/1/run -H 'Authorization: Bearer dev-token'
```

The scheduler queues every active watchlist once per day at `WATCHLIST_HOUR`
(UTC, default 1 = 08:00 SGT). `WATCHLIST_RUN_ON_START=1` queues immediately on
boot for testing. Run exactly one scheduler replica.

## Raw retention policy

Only commercial fields are kept by default. Each capture stores a canonical
"core" object (ids, price, sold, rating, stock, variants, seller, url), which is
enough to reproduce any published metric.

- `RAW_FULL=1` also stores the original payload under `*-full` kinds, intended
  for debugging and parser changes with a short retention window (30–90 days).
- Never stored: request headers, cookies, tracking beacons, ad labels and
  analytics payloads.
- Objects are content addressed (`sha256`), immutable, and indexed in
  `crawl.raw_objects`, which is the lineage record for every published number.

## Resumable TikTok crawl runner

`scripts/crawl-tiktok.js` crawls a product list or a keyword list, writes a
checkpoint per item and can resume after a crash.

```bash
# product list (PDP)
node scripts/crawl-tiktok.js --mode=pdp --file=seeds/tiktok-vn-1000.json --concurrency=8 --run=trial-1

# keyword discovery (200 results per keyword)
node scripts/crawl-tiktok.js --mode=discover --keywords="serum|kem chống nắng" --run=discovery-1

# resume: same --run skips items already in items.jsonl
```

State lives in `data/runs/<run-id>/`: `items.jsonl` or `ids.jsonl`,
`progress.json`, `summary.json`, `events.jsonl`. Nothing is written to the
database until review.

Login once with a persistent Chrome profile so cookies survive restarts:

```bash
node services/session/login.js --label=tiktok-vn-01 --platform=tiktok
```
