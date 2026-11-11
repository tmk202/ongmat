import { chromium } from 'playwright-core';
import { readFile, appendFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).map((entry) => {
  const [key, ...rest] = entry.replace(/^--/, '').split('=');
  return [key, rest.join('=')];
}));
const file = args.file;
const limit = Number(args.limit || 0);
const concurrency = Number(args.concurrency || 8);
const chunkSize = Number(args.chunkSize || 50);
const runId = args.run || new Date().toISOString().replace(/[:.]/g, '-');
const runDir = join(process.env.DATA_DIR || new URL('../data', import.meta.url).pathname, 'runs', runId);
await mkdir(runDir, { recursive: true });
const profile = process.env.CHROME_PROFILE_DIR || join(fileURLToPath(new URL('..', import.meta.url)), '.chrome-tiktok');

const exists = async (path) => access(path).then(() => true).catch(() => false);
const readJsonl = async (path) => (await exists(path)) ? (await readFile(path, 'utf8')).split('\n').filter(Boolean).map((line) => JSON.parse(line)) : [];
const log = (event, fields = {}) => { const line = JSON.stringify({ ts: new Date().toISOString(), event, run: runId, ...fields }); console.log(line); };

const input = JSON.parse(await readFile(file, 'utf8'));
let items = (input.products || input.items || input).map((p) => ({ item_id: String(p.item_id || p.product_id) }));
if (limit) items = items.slice(0, limit);
const outPath = join(runDir, 'items.jsonl');
const doneIds = new Set((await readJsonl(outPath)).map((row) => String(row.item_id)));
const pending = items.filter((item) => !doneIds.has(item.item_id));

const context = await chromium.launchPersistentContext(profile, {
  channel: process.env.CHROME_CHANNEL || 'chrome',
  headless: true,
  locale: 'vi-VN',
  timezoneId: 'Asia/Ho_Chi_Minh',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  ignoreDefaultArgs: ['--enable-automation'],
  args: ['--disable-blink-features=AutomationControlled', '--no-first-run', '--no-default-browser-check'],
});
const page = context.pages()[0] || (await context.newPage());
await page.goto('https://shop.tiktok.com/vn', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
await log('start', { total: items.length, done: doneIds.size, pending: pending.length, concurrency, chunkSize });

const scrape = async ({ ids, concurrency }) => {
  const getText = (url) => new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.withCredentials = true;
    xhr.timeout = 15000;
    xhr.setRequestHeader('accept', 'text/html');
    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText });
    xhr.onerror = () => resolve({ status: -1, text: '' });
    xhr.ontimeout = () => resolve({ status: -2, text: '' });
    xhr.send();
  });
  const extract = (html) => {
    const match = html.match(/<script[^>]*id="__MODERN_ROUTER_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) return null;
    let state;
    try { state = JSON.parse(match[1]); } catch { return null; }
    let node = null;
    const walk = (n, d = 0) => {
      if (!n || d > 20 || node) return;
      if (Array.isArray(n)) { for (const x of n) walk(x, d + 1); return; }
      if (typeof n === 'object') {
        if (n.product_id && n.title && Array.isArray(n.skus)) { node = n; return; }
        for (const v of Object.values(n)) walk(v, d + 1);
      }
    };
    walk(state);
    if (!node) return null;
    const price = node.price || {}, review = node.review || {}, seller = node.seller || {};
    const skus = node.skus || [];
    const money = (v) => Number(String(v || '').replace(/[^\d]/g, '') || 0);
    return {
      date: new Date().toISOString().slice(0, 10), platform: 'tiktok', item_id: String(node.product_id),
      shop_id: String(seller.seller_id || node.seller_id || ''), shop_name: seller.name || null, market: 'VN',
      title: node.title || '', price: money(price.min_sku_price), price_max: money(price.max_sku_price),
      price_original: money(price.original_price), units_sold_month: null, units_sold_total: Number(node.sold_count || 0),
      rating: Number(review.product_rating || 0), review_count: Number(review.review_count || 0) || null,
      stock_total: skus.reduce((sum, sku) => sum + (Number(sku.stock) || 0), 0) || null, variant_count: skus.length,
      category_l1: null, brand: null, specs: node.specifications || [], item_url: `https://shop.tiktok.com/vn/pdp/${node.product_id}`,
      observed_at: new Date().toISOString(),
    };
  };
  const results = []; const errors = []; let cursor = 0; let challenges = 0;
  const worker = async () => {
    while (true) {
      const i = cursor++;
      if (i >= ids.length) return;
      const id = ids[i];
      const response = await getText(`/vn/pdp/${encodeURIComponent(id)}`);
      if (response.status === -2) { errors.push({ item_id: id, error: 'timeout' }); continue; }
      if (response.status !== 200) { errors.push({ item_id: id, error: `http_${response.status}` }); continue; }
      if (/Security Check|Verify to continue/i.test(response.text)) { challenges += 1; errors.push({ item_id: id, error: 'challenge' }); continue; }
      const row = extract(response.text);
      if (!row) { errors.push({ item_id: id, error: 'no_state' }); continue; }
      results.push(row);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return { results, errors, challenges };
};

let processed = 0; let ok = 0; let failed = 0; let challenges = 0;
const started = Date.now();
for (let offset = 0; offset < pending.length; offset += chunkSize) {
  const chunk = pending.slice(offset, offset + chunkSize);
  const outcome = await page.evaluate(scrape, { ids: chunk.map((item) => item.item_id), concurrency });
  if (outcome.results.length) await appendFile(outPath, outcome.results.map((row) => JSON.stringify(row)).join('\n') + '\n');
  ok += outcome.results.length;
  failed += outcome.errors.length;
  challenges += outcome.challenges;
  processed += chunk.length;
  const elapsed = (Date.now() - started) / 1000;
  const progress = { mode: 'pdp-browser', total: items.length, done: doneIds.size + ok, ok, failed, challenges, rate_per_s: +(processed / Math.max(elapsed, 1)).toFixed(2), elapsed_s: Math.round(elapsed) };
  await writeFile(join(runDir, 'progress.json'), JSON.stringify(progress, null, 1));
  await log('progress', progress);
  if (challenges >= 3) { await log('abort', { reason: 'challenge_storm', challenges }); break; }
}
await writeFile(join(runDir, 'summary.json'), JSON.stringify({ mode: 'pdp-browser', total: items.length, done: doneIds.size + ok, ok, failed, challenges, elapsed_s: Math.round((Date.now() - started) / 1000) }, null, 1));
console.log('done');
await context.close();
