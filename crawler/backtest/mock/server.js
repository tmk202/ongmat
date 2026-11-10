import Fastify from 'fastify';
import { readFile } from 'node:fs/promises';

const FIXTURE = new URL('../fixtures/tiktok/products.json', import.meta.url);

export async function startMock(scenario = {}) {
  const data = JSON.parse(await readFile(FIXTURE, 'utf8'));
  const byId = new Map(data.products.map((p) => [p.id, p]));
  const config = {
    latencyMs: scenario.latencyMs ?? 0,
    errorRate: scenario.errorRate ?? 0,
    failFirst: scenario.failFirst ?? 0,
    rateLimitRpm: scenario.rateLimitRpm ?? 0,
    missingIds: new Set((scenario.missingIds || []).map(String)),
    seed: scenario.seed ?? 42,
  };
  const app = Fastify({ logger: false });
  const stats = { requests: 0, rateLimited: 0, byPath: {} };
  let windowStart = Date.now();
  let windowCount = 0;
  let random = config.seed;
  const nextRandom = () => {
    random = (random * 1103515245 + 12345) % 2147483648;
    return random / 2147483648;
  };

  const guard = async (req, reply) => {
    stats.requests += 1;
    stats.byPath[req.url.split('?')[0]] = (stats.byPath[req.url.split('?')[0]] || 0) + 1;
    if (config.latencyMs) await new Promise((resolve) => setTimeout(resolve, config.latencyMs));
    if (config.rateLimitRpm) {
      const now = Date.now();
      if (now - windowStart >= 60000) {
        windowStart = now;
        windowCount = 0;
      }
      windowCount += 1;
      if (windowCount > config.rateLimitRpm) {
        stats.rateLimited += 1;
        reply.code(429).header('Retry-After', '1').send({ error: 'rate_limited' });
        return false;
      }
    }
    if (config.failFirst && stats.requests <= config.failFirst) {
      reply.code(503).send({ error: 'warming_up' });
      return false;
    }
    if (config.errorRate && nextRandom() < config.errorRate) {
      reply.code(503).send({ error: 'server_busy' });
      return false;
    }
    return true;
  };

  app.get('/v1/products/:id', async (req, reply) => {
    if (!(await guard(req, reply))) return reply;
    const product = byId.get(String(req.params.id));
    if (!product || config.missingIds.has(String(req.params.id))) {
      return reply.code(404).send({ error: 'not_found' });
    }
    return product;
  });

  app.get('/v1/search', async (req, reply) => {
    if (!(await guard(req, reply))) return reply;
    const q = String(req.query.q || '').toLowerCase();
    const page = Number(req.query.page || 1);
    const size = Number(req.query.size || 2);
    const matches = data.products.filter((p) => p.title.toLowerCase().includes(q) || !q);
    const slice = matches.slice((page - 1) * size, page * size);
    return { items: slice, page, has_more: page * size < matches.length };
  });

  app.get('/__stats', async () => stats);

  await app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = app.server.address();
  return { app, baseUrl: `http://127.0.0.1:${port}`, stats };
}
