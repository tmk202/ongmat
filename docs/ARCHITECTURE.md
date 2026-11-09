# ecommarketdata — System Architecture

> Status: P0 design (Shopee data, single-person operation, Cloudflare public edge).
> Goal: sell normalized marketplace data as a product (API + dashboard + downloads), not as custom scraping work.

## 1. Principles

1. **Collect once, sell many** — raw is ingested once; every customer queries the same gold tables.
2. **Private core, public edge** — crawler, PostgreSQL and raw R2 stay private; only the Cloudflare Worker is public.
3. **Idempotent by snapshot date** — rerunning a day replaces that day, never duplicates.
4. **No per-client pipelines** — every need maps to API filters.
5. **Provable data** — every row carries `observed_at`, `method`, `confidence`, `source`.

## 2. Topology

```
PRIVATE (local machine)                                  PUBLIC (Cloudflare)
┌──────────────────────────────────────────┐            ┌──────────────────────────────┐
│ Crawler farm (shopee_fast_tester)        │            │ ecommarketdata Worker        │
│  Chrome profiles + job queue             │            │  /api/v1/*  (API key auth)   │
│  verify-sold QA                          │            │  cache: KV + CDN             │
│        │                                 │            │  /download/* signed URLs     │
│        ▼                                 │            │  /api/billing/webhook        │
│ R2: shopee-output-local (parquet/csv)    │            │                              │
│        │                                 │  tunnel    │ Astro site + dashboard       │
│        ▼                                 │◄──────────►│ D1 (keys/usage) or Postgres  │
│ PostgreSQL shopee_output (127.0.0.1)     │  Access    │ R2: public-gold (exports)    │
│  jobs, job_parts, job_batches, artifacts │            └──────────────────────────────┘
│        │                                 │
│        ▼                                 │
│ Transform (cron 02:00 SGT)               │
│  DuckDB/pyarrow over Parquet → market.*  │
│        │                                 │
│        ▼                                 │
│ Internal Market API (127.0.0.1:8097)     │
└──────────────────────────────────────────┘
```

## 3. Data layers

| Layer | Store | Format | Reader |
|---|---|---|---|
| Bronze | R2 `shopee-output-local` | parquet / csv.gz / jsonl.gz | transform only |
| Silver | PostgreSQL `market.silver_items` | table | transform |
| Gold | PostgreSQL `market.*` | tables | internal API |
| Export | R2 `public-gold` | csv / parquet | customers (signed) |
| Cache | Cloudflare KV | JSON | public Worker |

## 4. Schema (see `pipeline/schema.sql`)

- `market.silver_items` — one row per (platform, item, shop, snapshot_date).
- `market.market_daily` — (date, platform, category_l1, brand) → items, units, GMV, avg price, stock.
- `market.market_monthly` — monthly trend for charts.
- `market.market_items` — latest row per item for row-level API.
- `market.data_quality` — daily matched %, outliers, coverage.
- `market.transform_runs` — pipeline audit log.

## 5. Transform pipeline

```
cron 02:00
 1. pick latest completed/partial job for snapshot_date
 2. GET /api/jobs/{id}/results?format=manifest  (CF Access)
 3. download csv.gz signed URL
 4. pyarrow read → normalize (prices /100000, payload_json → brand, catid, rating…)
 5. COPY into market.silver_items
 6. aggregate → DELETE+INSERT market_daily / market_monthly / market_items / data_quality
 7. write transform_runs + Telegram alert on failure
```

Idempotency: all writes are scoped by `snapshot_date` and replace, not append.

## 6. Public API (v1)

Base `https://ecommarketdata.com/api/v1` · auth `X-API-Key`.

| Endpoint | Purpose |
|---|---|
| `GET /meta` | platforms, categories, date range, last_updated |
| `GET /metrics?platform=&category=&brand=&granularity=month&from=&to=` | gold tables |
| `GET /items?platform=&category=&brand=&q=&sort=units_sold&limit=&cursor=` | row-level |
| `GET /items/{item_id}` | single SKU |
| `GET /download?format=csv&...` | signed export URL |
| `GET /quality?date=` | confidence/coverage |

Response envelope:
```json
{ "ok": true, "meta": { "last_updated": "...", "cached": true }, "rows": [ ... ] }
```
Rate limits: Free 60/min · Pro 600/min · Enterprise custom.
Caching: `s-maxage=300`, KV key by query.
Errors: `{ "ok": false, "error": { "code", "message" } }`.

## 7. Auth, billing, multi-tenancy

```
Stripe Checkout → webhook → api_keys(key_hash, plan, status)
                           → usage_events(key_id, ts, endpoint, rows)
                           → entitlements(plan → history_months, max_rows, download)
```
- Keys stored hashed (sha256); plaintext shown once.
- P0: Stripe payment link + manual/first-party key issuance; P1: automatic provisioning.

## 8. Operations (single person)

| Concern | Mechanism |
|---|---|
| Crawl failure | Telegram alert (existing bot) |
| Transform failure | Telegram + block gold publish |
| Freshness SLA | daily by 08:00 SGT; `last_updated` in `/meta` |
| Backup | nightly `pg_dump` → R2, 30 copies |
| Uptime | Cloudflare health check on `/api/v1/meta` |
| Cost control | R2 + Workers/KV/D1 free tiers cover P0 |

## 9. Scaling path

| Phase | Data | Infra |
|---|---|---|
| P0 | Shopee, daily snapshot | PostgreSQL + R2 + Worker |
| P1 | + TikTok/Lazada/Amazon | `platform` dimension, crawler farm |
| P2 | >50M rows, many tenants | gold → ClickHouse/BigQuery; PG = metadata |
| P3 | Enterprise | warehouse sync, webhooks, SLA |

Serving scales via CDN/KV cache (≈99% hits); PostgreSQL only serves cache misses.

## 10. Security & compliance

- PostgreSQL bound to `127.0.0.1`; never exposed.
- Internal API behind Cloudflare Access service token.
- Public Worker holds secrets only server-side.
- No PII; derived/aggregated product data only; publish methodology and disclaimers.
- Review marketplace ToS before paid distribution.

## 11. P0 build plan

1. `pipeline/schema.sql` — market schema.
2. `pipeline/transform.py` — manifest → CSV → normalize → COPY → aggregates.
3. Internal Market API (`/internal/metrics|items|quality`).
4. Public Worker `/api/v1/*` with API key + KV cache.
5. Dashboard reads `/api/v1` (replace static JSON).
6. Gold export → R2 `public-gold` + signed links.
7. Stripe + `api_keys`.
8. Cron + alerting + backup + `last_updated`.
