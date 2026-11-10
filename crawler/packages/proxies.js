import pg from 'pg';
import { ProxyAgent } from 'undici';
import { config } from './config.js';

let pool = null;
function db() {
  if (!config.databaseUrl) return null;
  if (!pool) pool = new pg.Pool({ connectionString: config.databaseUrl, max: 5 });
  return pool;
}

const memoryProxies = [];

export async function upsertProxy({ url, market = 'VN', kind = 'isp' }) {
  const connection = db();
  if (!connection) {
    const existing = memoryProxies.find((p) => p.url === url);
    if (existing) return existing;
    const record = { id: memoryProxies.length + 1, url, market, kind, status: 'active', last_ok_at: null };
    memoryProxies.push(record);
    return record;
  }
  const { rows } = await connection.query(
    `INSERT INTO crawl.proxies (url, market, kind)
     VALUES ($1, $2, $3)
     ON CONFLICT (url) DO UPDATE SET market = EXCLUDED.market, kind = EXCLUDED.kind
     RETURNING *`,
    [url, market, kind]
  );
  return rows[0];
}

export async function listProxies() {
  const connection = db();
  if (!connection) return memoryProxies;
  const { rows } = await connection.query('SELECT * FROM crawl.proxies ORDER BY id');
  return rows;
}

export async function checkProxy(url, timeoutMs = 10000) {
  const started = Date.now();
  try {
    const dispatcher = new ProxyAgent(url);
    const response = await fetch(process.env.PROXY_HEALTH_URL || 'https://api.ipify.org?format=json', {
      dispatcher,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`http_${response.status}`);
    const data = await response.json();
    return { ok: true, ip: data.ip, ms: Date.now() - started };
  } catch (error) {
    return { ok: false, error: String(error), ms: Date.now() - started };
  }
}

export async function healthSweep() {
  const proxies = await listProxies();
  const results = [];
  for (const proxy of proxies) {
    const result = await checkProxy(proxy.url);
    results.push({ id: proxy.id, url: proxy.url, ...result });
    const connection = db();
    if (connection) {
      await connection.query(
        `UPDATE crawl.proxies SET status = $2, last_ok_at = CASE WHEN $2 = 'active' THEN now() ELSE last_ok_at END WHERE id = $1`,
        [proxy.id, result.ok ? 'active' : 'down']
      ).catch(() => {});
    } else {
      proxy.status = result.ok ? 'active' : 'down';
      if (result.ok) proxy.last_ok_at = new Date().toISOString();
    }
  }
  return results;
}
