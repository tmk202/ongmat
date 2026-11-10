import { extractProducts, searchAll } from '../services/session/platforms/tiktok.js';
import { listAccounts } from '../packages/accounts.js';

const args = Object.fromEntries(
  process.argv.slice(2).map((entry) => {
    const [key, ...rest] = entry.replace(/^--/, '').split('=');
    return [key, rest.join('=')];
  })
);
const label = args.label;
const keyword = args.keyword || 'serum';
if (!label) {
  console.error('usage: node scripts/tiktok-probe.js --label=tiktok-vn-01 [--keyword=serum]');
  process.exit(1);
}
const accounts = await listAccounts({ platform: 'tiktok' });
const account = accounts.find((a) => a.label === label);
if (!account) {
  console.error(`account not found: ${label}`);
  process.exit(1);
}

const base = process.env.TIKTOK_BASE || 'https://shop.tiktok.com';
const urls = [
  `${base}/vn/s?q=${encodeURIComponent(keyword)}`,
  `${base}/vn/search?q=${encodeURIComponent(keyword)}`,
  `${base}/vn/search?keyword=${encodeURIComponent(keyword)}`,
  `${base}/vn/s?keyword=${encodeURIComponent(keyword)}`,
  `${base}/vn/pdp/1732127366200920467`,
];

for (const url of urls) {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': account.user_agent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        Cookie: account.cookie,
        Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(30000),
    });
    const body = await response.text();
    const rows = extractProducts(body);
    console.log(JSON.stringify({
      url,
      status: response.status,
      location: response.headers.get('location') || null,
      bytes: body.length,
      challenge: /Security Check|oec-ttweb-captcha/i.test(body),
      state: /__UNIVERSAL_DATA_FOR_REHYDRATION__/.test(body) ? 'universal' : (/__NEXT_DATA__/.test(body) ? 'next' : (/__INITIAL_STATE__/.test(body) ? 'initial' : null)),
      products: rows.length,
      sample: rows.slice(0, 2).map((row) => ({ id: row.item_id, title: row.title.slice(0, 40), price: row.price, sold: row.units_sold_month })),
      ms: Date.now() - started,
    }));
  } catch (error) {
    console.log(JSON.stringify({ url, error: String(error), ms: Date.now() - started }));
  }
}

try {
  const started = Date.now();
  const result = await searchAll({ keyword, account, maxPages: Number(process.env.MAX_PAGES || 20) });
  console.log(JSON.stringify({ mode: 'api', count: result.rows.length, uniqueShops: new Set(result.rows.map((r) => r.shop_id)).size, sample: result.rows.slice(0, 3), ms: Date.now() - started }));
} catch (error) {
  console.log(JSON.stringify({ mode: 'api', error: String(error) }));
}
