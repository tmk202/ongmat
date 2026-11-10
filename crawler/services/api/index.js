import Fastify from 'fastify';
import { config, log } from '../../packages/config.js';
import { bus } from '../../packages/bus.js';
import { store } from '../../packages/store.js';
import { cooldownAccount, getAccount, listAccounts, upsertAccount } from '../../packages/accounts.js';
import { healthSweep, listProxies, upsertProxy } from '../../packages/proxies.js';
import { enqueueJob } from '../../packages/jobs.js';
import { addWatchlistItems, createWatchlist, listWatchlistItems, listWatchlists, markWatchlistRun } from '../../packages/watchlists.js';

const auth = async (req, reply) => {
  const header = req.headers.authorization || '';
  if (header !== `Bearer ${config.apiToken}`) {
    return reply.code(401).send({ ok: false, error: 'unauthorized' });
  }
};

export function buildServer() {
  const app = Fastify({ logger: false });
  const jobs = store();
  const b = bus();

  app.get('/health', async () => ({ ok: true, store: jobs.kind, bus: b.kind }));

  app.get('/v1/stats', async () => ({ ok: true, stats: await jobs.stats() }));

  app.get('/v1/jobs', async (req) => {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    return { ok: true, jobs: await jobs.listJobs(limit) };
  });

  app.get('/v1/jobs/:id', async (req, reply) => {
    const job = await jobs.getJob(req.params.id);
    if (!job) return reply.code(404).send({ ok: false, error: 'not_found' });
    return { ok: true, job };
  });

  app.post('/v1/jobs', { preHandler: auth }, async (req, reply) => {
    const body = req.body || {};
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return reply.code(400).send({ ok: false, error: 'items_required' });
    if (items.length > 500000) return reply.code(400).send({ ok: false, error: 'too_many_items' });
    const job = await enqueueJob({ name: body.name || 'crawl job', items });
    log('info', 'job queued', { job_id: job.id, items: items.length, shards: job.shards });
    return reply.code(202).send({ ok: true, job });
  });

  app.get('/v1/accounts', async (req) => ({
    ok: true,
    accounts: await listAccounts({ market: req.query.market ? String(req.query.market).toUpperCase() : null }),
  }));

  app.post('/v1/accounts', { preHandler: auth }, async (req, reply) => {
    const body = req.body || {};
    if (!body.label || !body.cookie) return reply.code(400).send({ ok: false, error: 'label_and_cookie_required' });
    const account = await upsertAccount({
      label: body.label,
      market: (body.market || 'VN').toUpperCase(),
      cookie: body.cookie,
      user_agent: body.user_agent || null,
      proxy_url: body.proxy_url || null,
    });
    return reply.code(201).send({ ok: true, account });
  });

  app.post('/v1/accounts/:id/cooldown', { preHandler: auth }, async (req, reply) => {
    const account = await getAccount(req.params.id);
    if (!account) return reply.code(404).send({ ok: false, error: 'not_found' });
    const minutes = Number(req.body?.minutes || 60);
    await cooldownAccount(account, minutes, 'manual');
    return { ok: true, account: { id: account.id, cooldown_minutes: minutes } };
  });

  app.get('/v1/watchlists', async () => ({ ok: true, watchlists: await listWatchlists() }));

  app.post('/v1/watchlists', { preHandler: auth }, async (req, reply) => {
    const body = req.body || {};
    if (!body.name) return reply.code(400).send({ ok: false, error: 'name_required' });
    const watchlist = await createWatchlist({ name: body.name, schedule: body.schedule || 'daily' });
    return reply.code(201).send({ ok: true, watchlist });
  });

  app.get('/v1/watchlists/:id/items', async (req) => ({
    ok: true,
    items: await listWatchlistItems(req.params.id),
  }));

  app.post('/v1/watchlists/:id/items', { preHandler: auth }, async (req, reply) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return reply.code(400).send({ ok: false, error: 'items_required' });
    const added = await addWatchlistItems(req.params.id, items);
    return { ok: true, added };
  });

  app.post('/v1/watchlists/:id/run', { preHandler: auth }, async (req, reply) => {
    const items = await listWatchlistItems(req.params.id);
    if (!items.length) return reply.code(400).send({ ok: false, error: 'watchlist_empty' });
    const job = await enqueueJob({ name: `watchlist ${req.params.id}`, items });
    await markWatchlistRun(req.params.id);
    log('info', 'watchlist queued', { watchlist: req.params.id, job_id: job.id, items: items.length });
    return reply.code(202).send({ ok: true, job });
  });

  app.get('/v1/proxies', async () => ({ ok: true, proxies: await listProxies() }));

  app.post('/v1/proxies', { preHandler: auth }, async (req, reply) => {
    const body = req.body || {};
    if (!body.url) return reply.code(400).send({ ok: false, error: 'url_required' });
    const proxy = await upsertProxy({ url: body.url, market: (body.market || 'VN').toUpperCase(), kind: body.kind || 'isp' });
    return reply.code(201).send({ ok: true, proxy });
  });

  app.post('/v1/proxies/health', { preHandler: auth }, async () => ({ ok: true, results: await healthSweep() }));

  return app;
}

export async function startApi({ port = config.port, host = '0.0.0.0' } = {}) {
  const app = buildServer();
  await app.listen({ port, host });
  const address = app.server.address();
  log('info', 'api listening', { address });
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startApi().catch((error) => {
    log('error', 'api crashed', { error: String(error) });
    process.exit(1);
  });
}
