# Local Backend API

Private, read-only API over the `market` schema in PostgreSQL `shopee_output`.
Runs on `127.0.0.1:8102` by default. No external dependencies beyond `pg`.

## Run

```bash
npm run backend          # node backend/index.mjs
npm run backend:test     # node --test backend/test/api.test.mjs
```

Environment comes from `.env` (see `.env.example`):
`DATABASE_URL`, `BACKEND_HOST`, `BACKEND_PORT`, `BACKEND_AUTH`,
`BACKEND_RATE_LIMIT`, `BACKEND_ADMIN_TOKEN`.

## Endpoints

All responses use `{ "ok": true, ... }` or `{ "ok": false, "error": { code, message } }`.

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | liveness + DB check |
| GET | `/v1/meta` | snapshot date, last_updated, currency, categories, totals |
| GET | `/v1/categories` | per-category items and units for the latest snapshot |
| GET | `/v1/metrics?granularity=month\|day&category=&from=&to=&limit=` | gold metrics |
| GET | `/v1/items?category=&brand=&q=&min_units=&sort=&order=&limit=&cursor=` | row-level, keyset pagination |
| GET | `/v1/items/:id` | single item (latest snapshot) |
| GET | `/v1/quality?from=&to=` | coverage/quality per snapshot |
| POST | `/v1/keys` | admin: create API key (returns plaintext once) |
| GET | `/v1/keys` | admin: list keys (no secrets) |
| GET | `/v1/usage?days=7` | admin: usage per key/endpoint |

`sort` accepts `units_sold_month`, `units_sold_total`, `price`, `rating`.
`order` accepts `asc`, `desc`. `limit` max 100 for items, 1000 for metrics.

### Examples

```bash
curl 'http://127.0.0.1:8102/v1/meta'
curl 'http://127.0.0.1:8102/v1/metrics?granularity=month'
curl 'http://127.0.0.1:8102/v1/metrics?granularity=day&category=Supplements'
curl 'http://127.0.0.1:8102/v1/items?limit=20&sort=units_sold_total'
curl 'http://127.0.0.1:8102/v1/items/2591950137'
```

Admin:

```bash
TOKEN=$(grep BACKEND_ADMIN_TOKEN .env | cut -d= -f2)
curl -X POST -H "X-Admin-Token: $TOKEN" -H 'Content-Type: application/json' \
  -d '{"label":"partner-a","plan":"pro"}' http://127.0.0.1:8102/v1/keys
```

## Auth & limits

- `BACKEND_AUTH=off` → public read (local development).
- `BACKEND_AUTH=on` → requires `X-API-Key`; keys are stored as sha256 in `market.api_keys`.
- Fixed-window rate limit per key (or IP) from `BACKEND_RATE_LIMIT` (default 600/min).
- Usage is written to `market.usage_events` (non-blocking) when an API key is used.

## Pipeline

1. `pipeline/transform.py --latest` → raw job → `market.silver_items` → gold tables.
2. `pipeline/publish.py` → gold tables → R2 snapshot for the public Worker (optional in local mode).

Idempotent by `snapshot_date`.

## Notes / limits

- Data currently comes from Shopee VN (VND). Currency is surfaced in `/v1/meta`.
- `category_l1` uses a keyword classifier until a real `market.category_map` is populated.
- `confidence` is a placeholder until the sold-verification pipeline is wired in.
