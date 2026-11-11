import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { listAccounts } from '../packages/accounts.js';
import { embeddedState } from '../services/session/platforms/tiktok.js';
import { saveRaw } from '../packages/raw.js';

const dir = 'data/rea/payloads';
await mkdir(dir, { recursive: true });
const account = (await listAccounts({ platform: 'tiktok' }))[0];
if (!account) throw new Error('no account');
const headers = { 'User-Agent': account.user_agent, Cookie: account.cookie, 'Accept-Encoding': 'identity', 'Content-Type': 'application/json', Accept: 'application/json' };

const results = [];
async function capture(name, url, options = {}) {
  const response = await fetch(url, { headers, ...options, signal: AbortSignal.timeout(30000) });
  const text = await response.text();
  const file = join(dir, `${name}.json`);
  await writeFile(file, text);
  let shape = null;
  try {
    const json = JSON.parse(text);
    shape = { code: json.code, message: json.message, dataType: Array.isArray(json.data) ? `array(${json.data.length})` : typeof json.data, dataKeys: json.data && !Array.isArray(json.data) ? Object.keys(json.data).slice(0, 15) : null, sampleKeys: json.data?.[0] ? Object.keys(json.data[0]).slice(0, 20) : json.data?.component_data?.products?.[0] ? Object.keys(json.data.component_data.products[0]).slice(0, 20) : null };
  } catch {
    shape = { html: true, bytes: text.length, state: embeddedState(text) ? 'embedded' : null };
  }
  const row = { name, url, status: response.status, bytes: text.length, file, shape };
  results.push(row);
  await saveRaw({ platform: 'tiktok', kind: `rea-${name}`, key: String(Date.now()), payload: { url, status: response.status, body: text.slice(0, 5000000) } });
  return row;
}

const base = 'https://shop.tiktok.com';
await capture('search-product-list', `${base}/api/shop/vn/brandy/s/product_list`, { method: 'POST', body: JSON.stringify({ type: 'search_word', component_name: 'feed_list_search_word', count: 200, request_limit: 10, offset: 0, load_more_params: { search_word: 'serum', page_token: '', exclude_product_ids: [] } }) });
for (const component of [7, 10, 11]) {
  await capture(`home-component-${component}`, `${base}/api/shop/home/product_component`, { method: 'POST', body: JSON.stringify({ productComponent: component, count: 200, exclude_product_ids: [] }) });
}
await capture('home-search-words', `${base}/api/shop/home/search_words`, { method: 'POST', body: JSON.stringify({ count: 20 }) });
await capture('home-event-sales', `${base}/api/shop/home/event_sales_collections`, { method: 'POST', body: JSON.stringify({}) });
await capture('cart', `${base}/api/shop/cart_desktop/`, { method: 'POST', body: JSON.stringify({}) });
await capture('orders', `${base}/api/shop/order_desktop/`, { method: 'POST', body: JSON.stringify({}) });
await capture('search-page', `${base}/vn/s?q=serum`, { method: 'GET', headers: { ...headers, Accept: 'text/html' } });
await capture('pdp-page', `${base}/vn/pdp/1733711228014855277`, { method: 'GET', headers: { ...headers, Accept: 'text/html' } });
await capture('category-page', `${base}/vn/c/serums-essences/601619`, { method: 'GET', headers: { ...headers, Accept: 'text/html' } });

await writeFile('data/rea/collected.json', JSON.stringify(results, null, 1));
console.log(JSON.stringify(results.map(({ name, status, bytes, shape }) => ({ name, status, bytes, code: shape?.code, dataType: shape?.dataType, keys: shape?.dataKeys || shape?.sampleKeys, state: shape?.state })), null, 1));
