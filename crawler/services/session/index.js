import Fastify from 'fastify';
import { ProxyAgent } from 'undici';
import { config, log, mapLimit } from '../../packages/config.js';
import { cooldownAccount, leaseAccount, markFailure, markSuccess, releaseAccount } from '../../packages/accounts.js';

const BASE = process.env.SHOPEE_BASE || 'https://shopee.vn';

function headers(account, item) {
  return {
    'User-Agent': account.user_agent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    Cookie: account.cookie,
    Referer: `${BASE}/product/${item.shop_id}/${item.item_id}`,
    'x-api-source': 'pc',
    'x-shopee-language': account.language || 'vi',
    Accept: 'application/json',
  };
}

function normalize(product, item) {
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

async function fetchItem(item, account, dispatcher) {
  const url = `${BASE}/api/v4/pdp/get_pc?item_id=${encodeURIComponent(item.item_id)}&shop_id=${encodeURIComponent(item.shop_id)}`;
  const response = await fetch(url, {
    headers: headers(account, item),
    dispatcher,
    signal: AbortSignal.timeout(Number(process.env.FETCH_TIMEOUT_MS || 30000)),
  });
  if (!response.ok) throw new Error(`http_${response.status}`);
  const body = await response.json();
  const product = body?.data?.item;
  if (!product) throw new Error('no_item');
  return normalize(product, item);
}

function isAccountError(reason) {
  return /http_(401|403|429|500|502|503)|verify|no_item/.test(String(reason));
}

export function buildSessionServer() {
  const app = Fastify({ logger: false });

  app.get('/health', async () => ({ ok: true, base: BASE }));

  app.post('/v1/fetch', async (req, reply) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return reply.code(400).send({ ok: false, error: 'items_required' });
    const market = items[0].market || 'VN';
    const account = await leaseAccount({ market });
    if (!account) return reply.code(503).send({ ok: false, error: 'no_account_available' });

    const dispatcher = account.proxy_url ? new ProxyAgent(account.proxy_url) : undefined;
    const rows = [];
    const errors = [];
    let accountErrors = 0;

    try {
      await mapLimit(items, Number(process.env.SESSION_CONCURRENCY || 8), async (item) => {
        try {
          rows.push(await fetchItem(item, account, dispatcher));
        } catch (error) {
          const reason = String(error);
          errors.push({ item_id: String(item.item_id), shop_id: String(item.shop_id), reason });
          if (isAccountError(reason)) accountErrors += 1;
        }
      });

      if (accountErrors > 0) {
        await cooldownAccount(account, Number(process.env.BAN_COOLDOWN_MINUTES || 60), 'account_error');
      } else {
        await markSuccess(account);
      }
    } catch (error) {
      await markFailure(account, String(error));
      log('error', 'session batch failed', { account: account.label, error: String(error) });
    } finally {
      await releaseAccount(account);
    }

    return { ok: true, account: account.label, rows, errors };
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
