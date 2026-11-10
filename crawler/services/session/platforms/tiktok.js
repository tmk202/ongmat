import { mapLimit } from '../../../packages/config.js';
import { saveRaw } from '../../../packages/raw.js';

const BASE = process.env.TIKTOK_BASE || 'https://shop.tiktok.com';
const SEARCH_PATH = process.env.TIKTOK_SEARCH_PATH || '/vn/s';
const PDP_PATH = process.env.TIKTOK_PDP_PATH || '/vn/pdp';

function headers(account) {
  return {
    'User-Agent': account.user_agent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    Cookie: account.cookie,
    Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
    'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
  };
}

export function embeddedState(html) {
  const patterns = [
    /<script[^>]*id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/,
    /<script[^>]*id="__MODERN_ROUTER_DATA__"[^>]*>([\s\S]*?)<\/script>/,
    /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
    /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) continue;
    try {
      return JSON.parse(match[1]);
    } catch {
      continue;
    }
  }
  return null;
}

const idOf = (node) => node.product_id || node.productId || node.id || node.item_id;
const titleOf = (node) => node.title || node.product_name || node.productName || node.name || node.desc;
const money = (value) => {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  const digits = String(value).replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
};

function normalizeProduct(node) {
  const price = node.product_price_info || {};
  const rate = node.rate_info || {};
  const sold = node.sold_info || {};
  const seller = node.seller_info || {};
  const observed = new Date();
  return {
    date: observed.toISOString().slice(0, 10),
    platform: 'tiktok',
    item_id: String(idOf(node)),
    shop_id: String(seller.seller_id || node.shop_id || node.seller_id || ''),
    shop_name: seller.shop_name || null,
    market: 'VN',
    title: String(titleOf(node) || ''),
    price: money(price.sale_price_decimal ?? price.sale_price_format ?? node.price),
    price_original: money(price.origin_price_decimal ?? price.origin_price_format ?? null),
    units_sold_month: null,
    units_sold_total: Number(sold.sold_count ?? node.sold ?? 0),
    rating: Number(rate.score ?? node.rating ?? 0),
    review_count: Number(rate.review_count ?? 0) || null,
    stock_total: null,
    category_l1: null,
    brand: node.brand_info?.brand_name || null,
    item_url: node.seo_url?.canonical_url || `${BASE}${PDP_PATH}/${idOf(node)}`,
    observed_at: observed.toISOString(),
  };
}

function collect(node, out, depth = 0) {
  if (!node || depth > 12 || out.length > 500) return;
  if (Array.isArray(node)) {
    for (const child of node) collect(child, out, depth + 1);
    return;
  }
  if (typeof node !== 'object') return;
  const id = idOf(node);
  const title = titleOf(node);
  if (id && title && typeof id === 'string' && id.length >= 6 && (node.product_price_info || node.skus || node.price || node.sold_count != null)) {
    out.push(node);
    return;
  }
  for (const value of Object.values(node)) collect(value, out, depth + 1);
}

export function extractProducts(html) {
  const state = embeddedState(html);
  const found = [];
  if (state) collect(state, found);
  const products = new Map();
  for (const node of found) {
    const id = String(idOf(node));
    if (products.has(id)) continue;
    products.set(id, normalizeProduct(node));
  }
  return [...products.values()];
}

async function getHtml(url, account, dispatcher) {
  const response = await fetch(url, {
    headers: headers(account),
    dispatcher,
    signal: AbortSignal.timeout(Number(process.env.FETCH_TIMEOUT_MS || 30000)),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`http_${response.status}`);
  if (/Security Check|oec-ttweb-captcha/i.test(text)) throw new Error('challenge_required');
  return text;
}

export async function searchTiktok({ keyword, page = 1, account, dispatcher }) {
  const url = `${BASE}${SEARCH_PATH}?q=${encodeURIComponent(keyword)}&page=${page}`;
  const html = await getHtml(url, account, dispatcher);
  const rows = extractProducts(html);
  return { rows, hasMore: rows.length > 0, url };
}

export async function fetchTiktokBatch({ items, account, dispatcher }) {
  const rows = [];
  const errors = [];
  let accountErrors = 0;
  await mapLimit(items, Number(process.env.SESSION_CONCURRENCY || 4), async (item) => {
    try {
      const html = await getHtml(`${BASE}${PDP_PATH}/${encodeURIComponent(item.item_id)}`, account, dispatcher);
      const state = embeddedState(html);
      const core = coreFromPdp(state);
      await saveRaw({ platform: 'tiktok', kind: 'pdp', key: item.item_id, payload: core || { html } });
      if (process.env.RAW_FULL === '1' && state) {
        await saveRaw({ platform: 'tiktok', kind: 'pdp-full', key: item.item_id, payload: state });
      }
      const detail = extractPdp(html);
      if (detail) {
        rows.push(detail);
      } else {
        const found = extractProducts(html).find((row) => row.item_id === String(item.item_id));
        if (!found) throw new Error('no_item');
        rows.push(found);
      }
    } catch (error) {
      const reason = String(error);
      errors.push({ item_id: String(item.item_id), shop_id: String(item.shop_id || ''), reason });
      if (/challenge_required|http_(401|403|429)/.test(reason)) accountErrors += 1;
    }
  });
  return { rows, errors, accountErrors };
}

export function extractFromApi(payload) {
  const products = payload?.data?.component_data?.products || [];
  return products.map(normalizeProduct);
}

function findPdpNode(state) {
  let found = null;
  const walk = (node, depth = 0) => {
    if (!node || depth > 20 || found) return;
    if (Array.isArray(node)) {
      for (const child of node) walk(child, depth + 1);
      return;
    }
    if (typeof node !== 'object') return;
    if (node.product_id && node.title && Array.isArray(node.skus)) {
      found = node;
      return;
    }
    for (const value of Object.values(node)) walk(value, depth + 1);
  };
  walk(state);
  return found;
}

export function extractPdp(html) {
  const state = embeddedState(html);
  if (!state) return null;
  const node = findPdpNode(state);
  if (!node) return null;
  const price = node.price || {};
  const review = node.review || {};
  const seller = node.seller || {};
  const skus = Array.isArray(node.skus) ? node.skus : [];
  const stock = skus.reduce((sum, sku) => sum + (Number(sku.stock) || 0), 0);
  const observed = new Date();
  return {
    date: observed.toISOString().slice(0, 10),
    platform: 'tiktok',
    item_id: String(node.product_id),
    shop_id: String(seller.seller_id || node.seller_id || ''),
    shop_name: seller.name || null,
    market: 'VN',
    title: node.title || '',
    price: money(price.min_sku_price ?? price.sale_price_decimal),
    price_max: money(price.max_sku_price ?? null),
    price_original: money(price.original_price ?? price.min_sku_original_price),
    units_sold_month: null,
    units_sold_total: Number(node.sold_count || 0),
    rating: Number(review.product_rating || 0),
    review_count: Number(review.review_count || 0) || null,
    stock_total: stock || null,
    variant_count: skus.length,
    category_l1: null,
    brand: null,
    specifications: node.specifications || [],
    item_url: `${BASE}${PDP_PATH}/${node.product_id}`,
    observed_at: observed.toISOString(),
  };
}

export async function searchApi({ keyword, offset = 0, pageToken = null, excludeIds = [], account, dispatcher }) {
  const market = (process.env.TIKTOK_MARKET || 'vn').toLowerCase();
  const body = {
    type: 'search_word',
    component_name: 'feed_list_search_word',
    count: 30,
    request_limit: 10,
    offset,
    load_more_params: {
      search_word: keyword,
      page_token: pageToken || '',
      exclude_product_ids: excludeIds,
    },
  };
  const response = await fetch(`${BASE}/api/shop/${market}/brandy/s/product_list`, {
    method: 'POST',
    headers: { ...headers(account), 'Content-Type': 'application/json', Accept: 'application/json,*/*;q=0.8' },
    body: JSON.stringify(body),
    dispatcher,
    signal: AbortSignal.timeout(Number(process.env.FETCH_TIMEOUT_MS || 30000)),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.code !== 0) {
    throw new Error(`api_error_${payload.code ?? response.status}`);
  }
  await saveRaw({ platform: 'tiktok', kind: 'search', key: `${keyword}-${offset}`, payload: coreFromSearch(payload, keyword, offset) });
  if (process.env.RAW_FULL === '1') {
    await saveRaw({ platform: 'tiktok', kind: 'search-full', key: `${keyword}-${offset}`, payload });
  }
  const rows = extractFromApi(payload);
  const nextToken = payload?.data?.fe_config?.data_source?.load_more_params?.page_token || pageToken;
  return { rows, pageToken: nextToken, raw: payload };
}

export async function searchAll({ keyword, account, dispatcher, maxPages = 20 }) {
  const seen = new Map();
  let pageToken = null;
  for (let page = 0; page < maxPages; page += 1) {
    const offset = page * 30;
    const { rows, pageToken: token } = await searchApi({
      keyword,
      offset,
      pageToken,
      excludeIds: [...seen.keys()],
      account,
      dispatcher,
    });
    pageToken = token;
    if (!rows.length) break;
    for (const row of rows) seen.set(row.item_id, row);
  }
  return { rows: [...seen.values()], pageToken };
}

export function coreFromSearch(payload, keyword, offset) {
  const products = (payload?.data?.component_data?.products || []).map((p) => ({
    product_id: p.product_id,
    title: p.title,
    sale_price: p.product_price_info?.sale_price_decimal,
    origin_price: p.product_price_info?.origin_price_decimal,
    currency: p.product_price_info?.currency_name,
    discount: p.product_price_info?.discount_format || null,
    sold: p.sold_info?.sold_count ?? null,
    rating: p.rate_info?.score ?? null,
    reviews: p.rate_info?.review_count ?? null,
    seller_id: p.seller_info?.seller_id,
    shop_name: p.seller_info?.shop_name,
    brand: p.brand_info?.brand_name || null,
    sku_ids: (p.sku_info || []).map((x) => x.SkuId),
    url: p.seo_url?.canonical_url || null,
    image: p.image?.url_list?.[0] || null,
  }));
  return { keyword, offset, captured_at: new Date().toISOString(), count: products.length, products };
}

export function coreFromPdp(state) {
  const node = findPdpNode(state);
  if (!node) return null;
  return {
    captured_at: new Date().toISOString(),
    product_id: node.product_id,
    title: node.title,
    sold: node.sold_count,
    sold_note: node.sold_count_note?.text || null,
    price: node.price,
    review: node.review,
    seller: node.seller ? { seller_id: node.seller.seller_id, name: node.seller.name, rating: node.seller.rating_value, products: node.seller.product_count } : null,
    skus: (node.skus || []).map((sku) => ({ sku_id: sku.sku_id, stock: sku.stock, price: sku.price, props: sku.sku_sale_props })),
    specifications: node.specifications || [],
    images: (node.images || []).slice(0, 3).map((img) => img?.url_list?.[0]).filter(Boolean),
  };
}
