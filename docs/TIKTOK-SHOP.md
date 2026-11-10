# TikTok Shop VN — crawl findings

Measured 2026-11-10 against `shop.tiktok.com/vn` with a logged-in session.

## Access model

| Attempt | Result |
|---|---|
| Anonymous HTTP, desktop UA | Puzzle Security Check on every path, including robots.txt |
| Anonymous API call | `{"code":10000}` |
| Logged-in session, desktop UA | Still Security Check |
| Logged-in session + mobile UA | Search, PDP and category pages load normally |

Captcha appears once per session; after that ~1,000 PDP requests were served
with zero challenges.

## Endpoints

### Search page (server rendered)

```
GET https://shop.tiktok.com/vn/s?q={keyword}
```

Products are embedded in `<script id="__MODERN_ROUTER_DATA__">`. Product objects
carry `product_price_info`, `rate_info`, `sold_info`, `seller_info`,
`brand_info`, `sku_info`, `seo_url`.

### Search API (pagination)

```
POST https://shop.tiktok.com/api/shop/vn/brandy/s/product_list
```

```json
{
  "type": "search_word",
  "component_name": "feed_list_search_word",
  "count": 200,
  "request_limit": 10,
  "offset": 0,
  "load_more_params": { "search_word": "serum", "page_token": "", "exclude_product_ids": [] }
}
```

- `count` up to **200**: one request returned 197 products for `serum`.
- Total per keyword is capped at roughly **200** (`offset: 200` returns zero).
- `X-Tts-Oec-Bsid` is **not required** when called from a page context with cookies.
- Response: `data.component_data.products[]` with the same fields as the page state.

### Product detail (PDP)

```
GET https://shop.tiktok.com/vn/pdp/{product_id}
```

Full product lives in `__MODERN_ROUTER_DATA__` → `product_info`:
`price` (min/max/original), `skus[]` (variant price, stock, props),
`specifications`, `images`, `desc_blocks`, `sold_count`, `review`, `seller`.

The JSON endpoint `/api/shop/pdp_h5/page_data` requires a per-request
`X-Tts-Oec-Bsid` token and returns 404 without it, so HTML parsing is the stable
path.

### Category page

```
GET https://shop.tiktok.com/vn/c/{slug}/{category_id}
```

Server renders only ~15 products; no additional product_list calls were fired on
scroll, so category pages are not yet a usable bulk surface.

## Batch optimisation

| Surface | Batch size | Requests for 1,000 items |
|---|---|---|
| Search API | **200 per request** | **5** (one per keyword) |
| PDP | 1 per request | 1,000 |

Use search for discovery and 30-day ranking, PDP for watchlist products where
lifetime sold and stock matter. There is no batch PDP endpoint.

## Sold semantics

Comparing the same 1,000 products across both surfaces:

| Surface | Field | Meaning |
|---|---|---|
| Search | `sold_info.sold_count` | **last 30 days** |
| PDP | `sold_count` | **lifetime** (page note: "items sold globally since this item was listed") |

Evidence: Torriden search 45,593 vs PDP 531,744; Jumiso 4 vs 37,936; recently
launched items show near-equal values. Sum across the sample: 33.1M (search) vs
103.4M (PDP lifetime).

The crawler therefore stores search sold as `units_sold_month` and PDP sold as
`units_sold_total`.

## Measured throughput (trial run)

| Metric | Value |
|---|---|
| Products fetched | 1,000 |
| Missing/parse failures | 5 (0.5%) |
| Captcha challenges | 0 in 1,004 requests |
| Wall time | 225 s |
| Throughput | ~4.4 PDP/s at concurrency 10 |
| Price median | 100,331₫ |
| Lifetime sold (sum) | 103,445,929 |
| Stock (sum) | 351,009,858 |
| Variants (sum) | 6,179 |
| Zero-sold listings | 315 |

At 1,000 products every 2 hours: ~4 minutes per run, ~48 minutes per day.

Scaling to 2,000,000 products/day needs ~23 items/s, roughly 5–6 sessions at the
measured rate, assuming the per-account limit holds.

## Operational rules

- Always deduplicate by `product_id`; the trial produced 5 duplicates when a
  failed item shifted the batch window.
- Filter obvious test listings (price = 1₫).
- Store the session cookie once; refresh only when challenges reappear.
- Keep raw core payloads and the `sha256` lineage; full payloads are optional
  (`RAW_FULL=1`).
