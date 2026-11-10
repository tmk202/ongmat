import { mapLimit } from '../../../packages/config.js';

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

function embeddedState(html) {
  const patterns = [
    /<script[^>]*id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/,
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

function collect(node, out, depth = 0) {
  if (!node || depth > 12 || out.length > 500) return;
  if (Array.isArray(node)) {
    for (const child of node) collect(child, out, depth + 1);
    return;
  }
  if (typeof node !== 'object') return;
  const id = idOf(node);
  const title = titleOf(node);
  if (id && title && typeof id === 'string' && id.length >= 6) {
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
    const observed = new Date();
    products.set(id, {
      date: observed.toISOString().slice(0, 10),
      platform: 'tiktok',
      item_id: id,
      shop_id: String(node.shop_id || node.shopId || node.seller_id || node.sellerId || ''),
      market: 'VN',
      title: String(titleOf(node) || ''),
      price: money(node.price ?? node.sale_price ?? node.price_str),
      units_sold_month: Number(node.sold_30d ?? node.sold_30_days ?? node.sold ?? 0),
      units_sold_total: Number(node.sold_total ?? node.historical_sold ?? node.sold ?? 0),
      rating: Number(node.rating ?? node.score ?? 0),
      stock_total: Number(node.stock ?? node.stock_num ?? 0),
      category_l1: node.category || node.category_name || null,
      observed_at: observed.toISOString(),
    });
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
      const found = extractProducts(html).find((row) => row.item_id === String(item.item_id));
      if (!found) throw new Error('no_item');
      rows.push(found);
    } catch (error) {
      const reason = String(error);
      errors.push({ item_id: String(item.item_id), shop_id: String(item.shop_id || ''), reason });
      if (/challenge_required|http_(401|403|429)/.test(reason)) accountErrors += 1;
    }
  });
  return { rows, errors, accountErrors };
}
