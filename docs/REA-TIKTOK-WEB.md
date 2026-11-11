# REA — TikTok Shop web client

Scope: the web client at `shop.tiktok.com` (VN), using the route manifest and
JavaScript chunks shipped to the browser, plus runtime capture from our own
logged-in session. No mobile app binary, TLS interception or protection bypass
was used.

## Method

1. Fetch `/vn` with a logged-in cookie and mobile user agent.
2. Read `route-manifest-main.*.js`, collect every route chunk.
3. Extract API paths and request builders from the chunks.
4. Observe real requests/responses in a headless browser using the same profile.
5. Replay every discovered endpoint from Node with the session cookie and keep
   the raw responses.

Artifacts:

| File | Content |
|---|---|
| `crawler/data/rea/endpoints.json` | Extracted API paths and related chunks |
| `crawler/data/rea/requests.json` | Observed request methods, URLs, bodies |
| `crawler/data/rea/collected.json` | Replay results, sizes and response shapes |
| `crawler/data/rea/payloads/*.json` | Full raw responses and HTML pages |

## Endpoints found

| Endpoint | Method | Body | Status |
|---|---|---|---|
| `/api/shop/vn/brandy/s/product_list` | POST | `{type:"search_word", component_name:"feed_list_search_word", count, request_limit, offset, load_more_params:{search_word, page_token, exclude_product_ids}}` | 200 |
| `/api/shop/home/product_component` | POST | `{productComponent:7\|10\|11, count, exclude_product_ids:[], is_video_included?}` | 200 |
| `/api/shop/home/search_words` | POST | unknown | 400 |
| `/api/shop/home/event_sales_collections` | POST | unknown | 400 |
| `/api/shop/cart_desktop/` | POST | unknown | 404 |
| `/api/shop/order_desktop/` | POST | unknown | 404 |
| `/api/shop/pdp_h5/page_data` | GET | needs per-request `X-Tts-Oec-Bsid` | 404 without token |

`X-Tts-Oec-Bsid` is only required by `pdp_h5/page_data`; the search and
`product_component` endpoints accept plain cookie + mobile UA from Node.

## What the client exposes

Search and `product_component` product objects:

`product_id, title, image, product_price_info (sale/origin/discount), rate_info,
sold_info (30-day sold), seller_info (id, name, logo), brand_info, sku_info,
product_marketing_info, seo_url, seo_pdp_url`.

PDP HTML state adds: lifetime `sold_count`, `price` min/max/original,
`skus[]` (variant price, stock, props), `specifications`, `images`,
`desc_blocks`, `review`, `seller`.

Category HTML state adds: `categoryInfo` (id, level, leaf, parent, name) and
`categoryProductsData` (15 products, `hasMore`).

## Payload sizes

| Capture | Bytes | Products | Bytes/product |
|---|---|---|---|
| Search `product_list` | 2.98 MB | 200 | ~15 KB |
| Home component 7 | 3.05 MB | 106 | ~29 KB |
| Home component 10 | 4.25 MB | 154 | ~28 KB |
| Home component 11 | 5.68 MB | 164 | ~35 KB |
| Search page HTML | 859 KB | 200 | — |
| PDP HTML | 128 KB | 1 | — |
| Category HTML | 512 KB | 15 | — |

Full raw retention at 2M products/day is therefore tens of GB per day; the
canonical core (~1–2 KB/product) is the practical source of truth.

## Reach and limits

- Search: one request returns up to 200; total ~200 per keyword.
- Home components: component 7 ~591 unique across 11 pages, component 10 154,
  component 11 164.
- Category: 15 products, no pagination trigger on web.
- PDP: 1 product per HTML request.

The web client cannot enumerate millions of SKUs; keyword search, components
and category pages are the only discovery surfaces.

## Reproduce

```bash
cd crawler
node scripts/rea-web.js      # extract endpoints from shipped JS
node scripts/rea-capture.js  # observe real requests with the login profile
node scripts/rea-collect.js  # replay endpoints and save raw payloads
```
