import Fastify from 'fastify';
import { config, log, mapLimit } from '../../packages/config.js';

const BASE = process.env.SHOPEE_BASE || 'https://shopee.vn';

function accounts() {
  if (!process.env.SESSION_ACCOUNTS) return [];
  try {
    const parsed = JSON.parse(process.env.SESSION_ACCOUNTS);
    return Array.isArray(parsed) ? parsed.filter((a) => a && a.cookie) : [];
  } catch {
    return [];
  }
}

function pickAccount(pool, index) {
  return pool[index % pool.length];
}

async function fetchItem(item, account) {
  const url = `${BASE}/api/v4/pdp/get_pc?item_id=${encodeURIComponent(item.item_id)}&shop_id=${encodeURIComponent(item.shop_id)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': account.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      Cookie: account.cookie,
      Referer: `${BASE}/product/${item.shop_id}/${item.item_id}`,
      'x-api-source': 'pc',
      'x-shopee-language': account.language || 'vi',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`http_${response.status}`);
  const body = await response.json();
  const product = body?.data?.item;
  if (!product) throw new Error('no_item');
  const rating = product.item_rating || {};
  const observed = new Date();
  const price = Number(product.price || product.price_min || 0) / 100000;
  return {
    date: observed.toISOString().slice(0, 10),
    item_id: String(product.itemid || item.item_id),
    shop_id: String(product.shopid || item.shop_id),
    market: item.market || 'VN',
    title: product.name || '',
    price: Math.round(price * 100) / 100,
    units_sold_month: Number(product.sold || 0),
    units_sold_total: Number(product.historical_sold || 0),
    rating: Number(rating.rating_star || 0),
    observed_at: observed.toISOString(),
  };
}

export function buildSessionServer() {
  const app = Fastify({ logger: false });
  const pool = accounts();

  app.get('/health', async () => ({ ok: true, accounts: pool.length, base: BASE }));

  app.post('/v1/fetch', async (req, reply) => {
    if (!pool.length) {
      return reply.code(503).send({ ok: false, error: 'no_accounts_configured' });
    }
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return reply.code(400).send({ ok: false, error: 'items_required' });
    const rows = [];
    const errors = [];
    await mapLimit(items, Number(process.env.SESSION_CONCURRENCY || 8), async (item, index) => {
      try {
        rows.push(await fetchItem(item, pickAccount(pool, index)));
      } catch (error) {
        errors.push({ item_id: String(item.item_id), shop_id: String(item.shop_id), reason: String(error) });
      }
    });
    return { ok: true, rows, errors };
  });

  return app;
}

export async function startSession({ port = config.sessionPort, host = '0.0.0.0' } = {}) {
  const app = buildSessionServer();
  await app.listen({ port, host });
  log('info', 'session listening', { port });
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startSession().catch((error) => {
    log('error', 'session crashed', { error: String(error) });
    process.exit(1);
  });
}
