import pg from 'pg';
import { config } from './config.js';
import { redis } from './redis.js';

const LEASE_MS = Number(process.env.ACCOUNT_LEASE_MS || 90000);
const RATE_WINDOW_MS = 60000;
const MAX_PER_MINUTE = Number(process.env.ACCOUNT_RPM || 30);
const FAIL_LIMIT = Number(process.env.ACCOUNT_FAIL_LIMIT || 3);

let pool = null;
function db() {
  if (!config.databaseUrl) return null;
  if (!pool) pool = new pg.Pool({ connectionString: config.databaseUrl, max: 5 });
  return pool;
}

const memoryAccounts = [];

function memoryCandidates(market, platform) {
  return memoryAccounts.filter(
    (account) =>
      account.status === 'active' &&
      account.market === market &&
      (account.platform || 'shopee') === platform &&
      (!account.cooldown_until || new Date(account.cooldown_until) <= new Date())
  );
}

export function registerMemoryAccount(account) {
  const record = {
    id: memoryAccounts.length + 1,
    label: account.label,
    market: account.market || 'VN',
    platform: account.platform || 'shopee',
    cookie: account.cookie,
    user_agent: account.user_agent || null,
    proxy_url: account.proxy_url || null,
    status: 'active',
    cooldown_until: null,
    success_count: 0,
    fail_count: 0,
    last_used_at: null,
  };
  memoryAccounts.push(record);
  return record;
}

async function candidates(market, platform, limit = 50) {
  const connection = db();
  if (!connection) return memoryCandidates(market, platform).slice(0, limit);
  const { rows } = await connection.query(
    `SELECT id, label, platform, market, cookie, user_agent, proxy_url, status, cooldown_until, success_count, fail_count, last_used_at
       FROM crawl.accounts
      WHERE market = $1 AND platform = $2 AND status = 'active'
        AND (cooldown_until IS NULL OR cooldown_until <= now())
      ORDER BY last_used_at ASC NULLS FIRST
      LIMIT $3`,
    [market, platform, limit]
  );
  return rows;
}

export async function leaseAccount({ market = 'VN', platform = 'shopee' } = {}) {
  const store = redis();
  const list = await candidates(market, platform);
  for (const account of list) {
    const rateKey = `account:rate:${account.id}`;
    const used = await store.incrWindow(rateKey, RATE_WINDOW_MS);
    if (used > MAX_PER_MINUTE) continue;
    const leased = await store.setNx(`account:lease:${account.id}`, '1', LEASE_MS);
    if (!leased) continue;
    const connection = db();
    if (connection) {
      await connection.query('UPDATE crawl.accounts SET last_used_at = now() WHERE id = $1', [account.id]).catch(() => {});
    } else {
      account.last_used_at = new Date().toISOString();
    }
    return account;
  }
  return null;
}

export async function releaseAccount(account) {
  await redis().del(`account:lease:${account.id}`);
}

export async function cooldownAccount(account, minutes = 60, reason = 'unspecified') {
  const until = new Date(Date.now() + minutes * 60000);
  const connection = db();
  if (connection) {
    await connection.query(
      `UPDATE crawl.accounts
          SET cooldown_until = $2, fail_count = fail_count + 1, status = CASE WHEN fail_count + 1 >= $3 THEN 'dead' ELSE status END
        WHERE id = $1`,
      [account.id, until, FAIL_LIMIT]
    ).catch(() => {});
  } else {
    account.cooldown_until = until.toISOString();
    account.fail_count = (account.fail_count || 0) + 1;
  }
  await redis().del(`account:lease:${account.id}`);
  await redis().setEx(`account:cooldown:${account.id}`, reason, minutes * 60000);
}

export async function markSuccess(account) {
  const connection = db();
  if (connection) {
    await connection.query('UPDATE crawl.accounts SET success_count = success_count + 1 WHERE id = $1', [account.id]).catch(() => {});
  } else {
    account.success_count = (account.success_count || 0) + 1;
  }
}

export async function markFailure(account, reason = 'failure') {
  const connection = db();
  if (connection) {
    const { rows } = await connection.query(
      `UPDATE crawl.accounts SET fail_count = fail_count + 1 WHERE id = $1 RETURNING fail_count`,
      [account.id]
    ).catch(() => ({ rows: [] }));
    const failCount = rows[0]?.fail_count ?? 0;
    if (failCount >= FAIL_LIMIT) await cooldownAccount(account, 120, reason);
  } else {
    account.fail_count = (account.fail_count || 0) + 1;
    if (account.fail_count >= FAIL_LIMIT) await cooldownAccount(account, 120, reason);
  }
}

export async function getAccount(id) {
  const connection = db();
  if (!connection) return memoryAccounts.find((a) => a.id === Number(id)) || null;
  const { rows } = await connection.query('SELECT * FROM crawl.accounts WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function listAccounts({ market = null, platform = null } = {}) {
  const connection = db();
  if (!connection) {
    return memoryAccounts.filter((a) => (!market || a.market === market) && (!platform || (a.platform || 'shopee') === platform));
  }
  const filters = [];
  const params = [];
  if (market) {
    params.push(market);
    filters.push(`market = $${params.length}`);
  }
  if (platform) {
    params.push(platform);
    filters.push(`platform = $${params.length}`);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const { rows } = await connection.query(`SELECT * FROM crawl.accounts ${where} ORDER BY id`, params);
  return rows;
}

export async function upsertAccount({ label, market = 'VN', cookie, user_agent = null, proxy_url = null, platform = 'shopee' }) {
  const connection = db();
  if (!connection) {
    const existing = memoryAccounts.find((a) => a.label === label);
    if (existing) {
      Object.assign(existing, { cookie, user_agent, proxy_url, market, platform });
      return existing;
    }
    return registerMemoryAccount({ label, market, cookie, user_agent, proxy_url, platform });
  }
  const { rows } = await connection.query(
    `INSERT INTO crawl.accounts (label, market, cookie, user_agent, proxy_url, platform)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (label) DO UPDATE
       SET cookie = EXCLUDED.cookie, user_agent = EXCLUDED.user_agent,
           proxy_url = EXCLUDED.proxy_url, market = EXCLUDED.market,
           platform = EXCLUDED.platform,
           status = 'active', cooldown_until = NULL, fail_count = 0
     RETURNING *`,
    [label, market, cookie, user_agent, proxy_url, platform]
  );
  return rows[0];
}
