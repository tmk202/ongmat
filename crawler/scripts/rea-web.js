import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { listAccounts } from '../packages/accounts.js';
import { saveRaw } from '../packages/raw.js';

const BASE = 'https://shop.tiktok.com';

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const accounts = await listAccounts({ platform: 'tiktok' });
const account = accounts[0];
if (!account) throw new Error('no tiktok account');
const headers = { 'User-Agent': account.user_agent || UA, Cookie: account.cookie, 'Accept-Encoding': 'identity', 'Accept-Language': 'vi-VN,vi;q=0.9' };

const get = async (url, options = {}) => {
  const response = await fetch(url, { headers, ...options, signal: AbortSignal.timeout(30000) });
  return { status: response.status, text: await response.text() };
};

const html = (await get(`${BASE}/vn`)).text;
const manifestMatch = html.match(/\/\/[^"']*route-manifest-main\.[a-f0-9]+\.js/);
if (!manifestMatch) throw new Error('manifest not found');
const manifestUrl = `https:${manifestMatch[0]}`;
const APP = manifestUrl.replace(/static\/js\/route-manifest-main\.[a-f0-9]+\.js$/, '');
const manifest = (await get(manifestUrl)).text;
const jsonMatch = manifest.match(/window\._MODERNJS_ROUTE_MANIFEST\s*=\s*({[\s\S]*?});/);
const routes = JSON.parse(jsonMatch[1]).routeAssets || {};
const assets = new Set();
for (const route of Object.values(routes)) for (const asset of route.assets || []) if (asset.endsWith('.js')) assets.add(asset);
const list = [...assets];
const endpoints = new Map();
const keywords = new Map();
let fetched = 0;
const workers = Array.from({ length: 6 }, async () => {
  while (true) {
    const asset = list.shift();
    if (!asset) return;
    fetched += 1;
    try {
      const { text } = await get(APP + asset);
      for (const match of text.matchAll(/["'`](\/api\/[a-zA-Z0-9_\/\-.${}]+)["'`]/g)) {
        const path = match[1];
        if (!endpoints.has(path)) endpoints.set(path, { path, assets: [] });
        endpoints.get(path).assets.push(asset);
      }
      for (const kw of ['product_list', 'pdp_h5', 'brandy/s', 'search_word', 'category_id', 'shop_id', 'review', 'sku_id', 'add_to_cart']) {
        if (text.includes(kw)) {
          if (!keywords.has(kw)) keywords.set(kw, []);
          keywords.get(kw).push(asset);
        }
      }
    } catch (error) {
      keywords.set(`error:${asset}`, [String(error)]);
    }
  }
});
await Promise.all(workers);
await mkdir('data/rea', { recursive: true });
await writeFile('data/rea/endpoints.json', JSON.stringify({
  manifest: manifestUrl,
  assets: fetched,
  endpoints: [...endpoints.values()],
  keywords: Object.fromEntries([...keywords].map(([k, v]) => [k, v.slice(0, 10)])),
}, null, 1));
console.log(JSON.stringify({ assets: fetched, endpoints: endpoints.size, paths: [...endpoints.keys()].slice(0, 40), keywords: [...keywords.keys()] }, null, 1));
