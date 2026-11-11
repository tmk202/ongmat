import { readFile, appendFile, mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { ProxyAgent } from 'undici';
import { extractPdp } from '../services/session/platforms/tiktok.js';
import { listAccounts } from '../packages/accounts.js';

const args = Object.fromEntries(
  process.argv.slice(2).map((entry) => {
    const [key, ...rest] = entry.replace(/^--/, '').split('=');
    return [key, rest.join('=')];
  })
);

const mode = args.mode || 'pdp';
const mock = args.mock === '1';
const limit = Number(args.limit || 0);
const concurrency = Number(args.concurrency || 6);
const retries = Number(args.retries || 2);
const runId = args.run || new Date().toISOString().replace(/[:.]/g, '-');
const runDir = join(process.env.DATA_DIR || new URL('../data', import.meta.url).pathname, 'runs', runId);
await mkdir(runDir, { recursive: true });

const log = (event, fields = {}) => {
  const line = JSON.stringify({ ts: new Date().toISOString(), event, run: runId, ...fields });
  console.log(line);
  return appendFile(join(runDir, 'events.jsonl'), line + '\n').catch(() => {});
};

const exists = async (path) => access(path).then(() => true).catch(() => false);

async function loadCookie() {
  if (mock) return { cookie: '', user_agent: 'mock', proxy_url: null, label: 'mock' };
  if (args.cookie) return { cookie: args.cookie, user_agent: args.ua || 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', proxy_url: args.proxy || null };
  const accounts = await listAccounts({ platform: 'tiktok' });
  const account = args.label ? accounts.find((a) => a.label === args.label) : accounts[0];
  if (!account) throw new Error('no tiktok account; run services/session/login.js first or pass --cookie');
  return account;
}

function buildItemList(payload) {
  const raw = payload.products || payload.items || payload;
  if (!Array.isArray(raw)) throw new Error('input needs products/items array');
  return raw.map((p) => ({ item_id: String(p.item_id || p.product_id), shop_id: String(p.shop_id || '') }));
}

async function readJsonl(path) {
  if (!(await exists(path))) return [];
  const text = await readFile(path, 'utf8');
  return text.split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

const account = await loadCookie();
const dispatcher = account.proxy_url ? new ProxyAgent(account.proxy_url) : undefined;
const headers = { 'User-Agent': account.user_agent || 'Mozilla/5.0', Cookie: account.cookie || '', Accept: 'text/html', 'Accept-Encoding': 'identity' };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchHtml(url) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, { headers, dispatcher, signal: AbortSignal.timeout(Number(process.env.FETCH_TIMEOUT_MS || 20000)) });
      if (response.status === 429 || response.status === 403) throw new Error(`http_${response.status}`);
      if (!response.ok) throw new Error(`http_${response.status}`);
      return response.text();
    } catch (error) {
      if (attempt === retries) throw error;
      await sleep(300 * (attempt + 1));
    }
  }
}

if (mode === 'discover') {
  const keywordsArg = args.keywords || '';
  let keywords = keywordsArg ? keywordsArg.split('|').map((s) => s.trim()).filter(Boolean) : [];
  if (!keywords.length && args.keywordsFile) {
    const text = await readFile(args.keywordsFile, 'utf8');
    keywords = text.trim().startsWith('[') ? JSON.parse(text) : text.split('\n').map((s) => s.trim()).filter(Boolean);
  }
  if (!keywords.length) throw new Error('discover needs --keywords=a|b|c or --keywordsFile');
  const outPath = join(runDir, 'ids.jsonl');
  const seen = new Set((await readJsonl(outPath)).map((row) => String(row.item_id)));
  let done = 0;
  let added = 0;
  const started = Date.now();
  await log('discover_start', { keywords: keywords.length, have: seen.size });
  await fetch('https://shop.tiktok.com/vn?enter_method=direct', { headers, dispatcher, signal: AbortSignal.timeout(30000) }).catch(() => {});
  for (const keyword of keywords) {
    done += 1;
    try {
      const body = { type: 'search_word', component_name: 'feed_list_search_word', count: 200, request_limit: 10, offset: 0, load_more_params: { search_word: keyword, page_token: '', exclude_product_ids: [] } };
      const response = await fetch('https://shop.tiktok.com/api/shop/vn/brandy/s/product_list', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json', Accept: 'application/json', 'Accept-Encoding': 'identity' }, body: JSON.stringify(body), dispatcher, signal: AbortSignal.timeout(30000) });
      let payload = await response.json();
      if (payload.code !== 0) throw new Error(`api_code_${payload.code}`);
      let products = payload?.data?.component_data?.products || [];
      if (!products.length) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        const retry = await fetch('https://shop.tiktok.com/api/shop/vn/brandy/s/product_list', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json', Accept: 'application/json', 'Accept-Encoding': 'identity' }, body: JSON.stringify(body), dispatcher, signal: AbortSignal.timeout(30000) });
        payload = await retry.json();
        products = payload?.data?.component_data?.products || [];
      }
      const lines = [];
      for (const product of products) {
        const id = String(product.product_id);
        if (seen.has(id)) continue;
        seen.add(id);
        lines.push(JSON.stringify({ item_id: id, shop_id: String(product.seller_info?.seller_id || ''), keyword, price: Number(product.product_price_info?.sale_price_decimal || 0), sold_30d: Number(product.sold_info?.sold_count || 0), title: product.title || '' }));
      }
      if (lines.length) await appendFile(outPath, lines.join('\n') + '\n');
      added += lines.length;
      if (done % 20 === 0) {
        await writeFile(join(runDir, 'progress.json'), JSON.stringify({ mode, keywords: keywords.length, done, unique: seen.size, added, elapsed_s: Math.round((Date.now() - started) / 1000) }, null, 1));
        await log('progress', { done, unique: seen.size, added });
      }
    } catch (error) {
      await log('error', { keyword, error: String(error) });
    }
  }
  await writeFile(join(runDir, 'progress.json'), JSON.stringify({ mode, keywords: keywords.length, done, unique: seen.size, added, elapsed_s: Math.round((Date.now() - started) / 1000), finished: true }, null, 1));
  await log('discover_done', { unique: seen.size, added, done, elapsed_s: Math.round((Date.now() - started) / 1000) });
  process.exit(0);
}

const file = args.file;
if (!file) throw new Error('pdp mode needs --file=seeds/tiktok-vn-1000.json');
const input = JSON.parse(await readFile(file, 'utf8'));
let items = buildItemList(input);
if (limit) items = items.slice(0, limit);

const outPath = join(runDir, 'items.jsonl');
const doneRows = await readJsonl(outPath);
const doneIds = new Set(doneRows.map((row) => String(row.item_id)));
const pending = items.filter((item) => !doneIds.has(String(item.item_id)));
await log('pdp_start', { total: items.length, done: doneIds.size, pending: pending.length, concurrency, mock });

let ok = 0; let missing = 0; let failed = 0; let challenges = 0; let added = 0;
let index = 0;
let processedCount = 0;
const started = Date.now();

async function worker() {
  while (true) {
    const i = index++;
    if (i >= pending.length) return;
    const item = pending[i];
    try {
      if (mock) {
        const row = { item_id: String(item.item_id), shop_id: String(item.shop_id), title: `mock ${item.item_id}`, price: 1000 + (Number(item.item_id) % 500), sold: Number(item.item_id) % 10000, rating: 4.5, stock: 100, variants: 1, observed_at: new Date().toISOString() };
        await appendFile(outPath, JSON.stringify(row) + '\n');
        added += 1; ok += 1;
      } else {
        const html = await fetchHtml(`https://shop.tiktok.com/vn/pdp/${encodeURIComponent(item.item_id)}`);
        if (/Security Check|Verify to continue/i.test(html)) { challenges += 1; throw new Error('challenge'); }
        const row = extractPdp(html);
        if (!row) { missing += 1; throw new Error('no_state'); }
        await appendFile(outPath, JSON.stringify(row) + '\n');
        added += 1; ok += 1;
      }
    } catch (error) {
      failed += 1;
      await log('item_error', { item_id: item.item_id, error: String(error) });
      if (challenges >= 3) {
        await log('abort', { reason: 'challenge_storm', challenges, failed });
        process.exit(2);
      }
    }
    processedCount += 1;
    const processed = processedCount;
    if (processed % 25 === 0) {
      const elapsed = (Date.now() - started) / 1000;
      await writeFile(join(runDir, 'progress.json'), JSON.stringify({ mode: 'pdp', total: items.length, done: doneIds.size + added, pending_left: pending.length - processed, ok, missing, failed, challenges, rate_per_s: +(processed / Math.max(elapsed, 1)).toFixed(2), elapsed_s: Math.max(1, Math.round(elapsed)) }, null, 1));
      await log('progress', { ok, missing, failed, processed, rate: +(processed / elapsed).toFixed(2) });
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));
const elapsed = Math.round((Date.now() - started) / 1000);
const summary = { mode: 'pdp', total: items.length, done: doneIds.size + ok, ok, missing, failed, challenges, added, elapsed_s: elapsed, rate_per_s: +((ok + missing + failed) / Math.max(elapsed, 1)).toFixed(2) };
await writeFile(join(runDir, 'summary.json'), JSON.stringify(summary, null, 1));
await log('pdp_done', summary);
process.exit(0);
