import Fastify from 'fastify';
import { ProxyAgent } from 'undici';
import { config, log } from '../../packages/config.js';
import { cooldownAccount, leaseAccount, markFailure, markSuccess, releaseAccount } from '../../packages/accounts.js';
import { fetchShopeeBatch } from './platforms/shopee.js';
import { fetchTiktokBatch, searchAll, searchTiktok } from './platforms/tiktok.js';

export function buildSessionServer() {
  const app = Fastify({ logger: false });

  app.get('/health', async () => ({ ok: true }));

  app.post('/v1/fetch', async (req, reply) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return reply.code(400).send({ ok: false, error: 'items_required' });
    const market = items[0].market || 'VN';
    const platform = items[0].platform || 'shopee';
    const account = await leaseAccount({ market, platform });
    if (!account) return reply.code(503).send({ ok: false, error: 'no_account_available' });

    const dispatcher = account.proxy_url ? new ProxyAgent(account.proxy_url) : undefined;
    try {
      const result = platform === 'tiktok'
        ? await fetchTiktokBatch({ items, account, dispatcher })
        : await fetchShopeeBatch({ items, account, dispatcher });
      if (result.accountErrors > 0) {
        await cooldownAccount(account, Number(process.env.BAN_COOLDOWN_MINUTES || 60), 'account_error');
      } else {
        await markSuccess(account);
      }
      return { ok: true, account: account.label, platform, rows: result.rows, errors: result.errors };
    } catch (error) {
      await markFailure(account, String(error));
      log('error', 'session batch failed', { account: account.label, error: String(error) });
      return reply.code(502).send({ ok: false, error: 'fetch_failed', detail: String(error) });
    } finally {
      await releaseAccount(account);
    }
  });

  app.post('/v1/search', async (req, reply) => {
    const keyword = String(req.body?.keyword || '').trim();
    if (!keyword) return reply.code(400).send({ ok: false, error: 'keyword_required' });
    const page = Number(req.body?.page || 1);
    const market = String(req.body?.market || 'VN').toUpperCase();
    const account = await leaseAccount({ market, platform: 'tiktok' });
    if (!account) return reply.code(503).send({ ok: false, error: 'no_account_available' });
    const dispatcher = account.proxy_url ? new ProxyAgent(account.proxy_url) : undefined;
    try {
      const result = req.body?.mode === 'html'
        ? await searchTiktok({ keyword, page, account, dispatcher })
        : await searchAll({ keyword, account, dispatcher, maxPages: Number(req.body?.maxPages || 20) });
      await markSuccess(account);
      return { ok: true, account: account.label, count: result.rows.length, ...result };
    } catch (error) {
      const reason = String(error);
      if (/challenge_required|http_(401|403|429)/.test(reason)) {
        await cooldownAccount(account, Number(process.env.BAN_COOLDOWN_MINUTES || 60), reason);
      } else {
        await markFailure(account, reason);
      }
      return reply.code(502).send({ ok: false, error: 'search_failed', detail: reason });
    } finally {
      await releaseAccount(account);
    }
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
