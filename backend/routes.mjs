import crypto from 'node:crypto';
import { config } from './config.mjs';
import { query } from './db.mjs';
import { HttpError, parseIntParam, parseDateParam } from './http.mjs';

const PLATFORMS = ['shopee'];

function platformParam(value) {
  const platform = (value || 'shopee').toLowerCase();
  if (!PLATFORMS.includes(platform)) {
    throw new HttpError(400, 'INVALID_PARAM', `platform must be one of: ${PLATFORMS.join(', ')}`);
  }
  return platform;
}

function encodeCursor(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function decodeCursor(value) {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    throw new HttpError(400, 'INVALID_PARAM', 'cursor is invalid');
  }
}

function requireAdmin(req) {
  const token = config.adminToken;
  if (!token) throw new HttpError(404, 'NOT_FOUND', 'Admin API disabled');
  if (String(req.headers['x-admin-token'] || '') !== token) {
    throw new HttpError(403, 'FORBIDDEN', 'Admin token required');
  }
}

async function latestSnapshot() {
  const { rows } = await query('SELECT max(snapshot_date)::text AS d FROM market.silver_items');
  const date = rows[0]?.d;
  if (!date) throw new HttpError(503, 'NO_DATA', 'No data has been published yet');
  return date;
}

export function registerRoutes(router) {
  router.add('GET', '/health', async () => ({
    ok: true,
    uptime_s: Math.round(process.uptime()),
    db: await query('SELECT 1').then(() => 'ok'),
  }));

  router.add('GET', '/v1/meta', async () => {
    const snapshot = await latestSnapshot();
    const [currencies, categories, totals, run] = await Promise.all([
      query('SELECT DISTINCT currency FROM market.silver_items WHERE snapshot_date = $1', [snapshot]),
      query(
        'SELECT DISTINCT category_l1 FROM market.silver_items WHERE snapshot_date = $1 AND category_l1 IS NOT NULL ORDER BY 1',
        [snapshot]
      ),
      query(
        "SELECT items_count, units_sold, gmv_est::float8, avg_price::float8 FROM market.market_daily WHERE date = $1 AND platform = 'shopee' AND category_l1 = 'all'",
        [snapshot]
      ),
      query("SELECT max(finished_at)::text AS t FROM market.transform_runs WHERE status = 'done'"),
    ]);
    return {
      ok: true,
      meta: {
        snapshot_date: snapshot,
        last_updated: run.rows[0]?.t ?? null,
        platform: 'shopee',
        currency: currencies.rows.length === 1 ? currencies.rows[0].currency : currencies.rows.map((r) => r.currency),
        categories: categories.rows.map((r) => r.category_l1),
        totals: totals.rows[0] ?? null,
      },
    };
  });

  router.add('GET', '/v1/categories', async ({ url }) => {
    const snapshot = await latestSnapshot();
    const platform = platformParam(url.searchParams.get('platform'));
    const { rows } = await query(
      `SELECT category_l1, items_count, units_sold
         FROM market.market_daily
        WHERE date = $1 AND platform = $2 AND category_l1 <> 'all'
        ORDER BY units_sold DESC`,
      [snapshot, platform]
    );
    return { ok: true, meta: { snapshot_date: snapshot, platform }, rows };
  });

  router.add('GET', '/v1/metrics', async ({ url }) => {
    const platform = platformParam(url.searchParams.get('platform'));
    const granularity = (url.searchParams.get('granularity') || 'month').toLowerCase();
    if (!['day', 'month'].includes(granularity)) {
      throw new HttpError(400, 'INVALID_PARAM', 'granularity must be day or month');
    }
    const category = (url.searchParams.get('category') || 'all').trim() || 'all';
    const from = parseDateParam(url.searchParams.get('from'), 'from');
    const to = parseDateParam(url.searchParams.get('to'), 'to');
    const limit = parseIntParam(url.searchParams.get('limit'), { min: 1, max: config.maxLimit, name: 'limit' }) ?? 120;

    if (granularity === 'month') {
      const params = [platform, limit];
      const filters = ['platform = $1'];
      if (category !== 'all') {
        params.push(category);
        filters.push(`category_l1 = $${params.length}`);
      } else {
        filters.push("category_l1 = 'all'");
      }
      if (from) {
        params.push(from);
        filters.push(`month >= date_trunc('month', $${params.length}::date)`);
      }
      if (to) {
        params.push(to);
        filters.push(`month <= date_trunc('month', $${params.length}::date)`);
      }
      const { rows } = await query(
        `SELECT month::text AS period, category_l1, units_sold, gmv_est::float8, items_count, price_index::float8
           FROM market.market_monthly
          WHERE ${filters.join(' AND ')}
          ORDER BY month DESC
          LIMIT $2`,
        params
      );
      return { ok: true, meta: { granularity, category, platform, rows: rows.length }, rows: rows.reverse(), summary: summarize(rows) };
    }

    const params = [platform, limit];
    const filters = ["platform = $1", "brand = 'all'"];
    if (category !== 'all') {
      params.push(category);
      filters.push(`category_l1 = $${params.length}`);
    } else {
      filters.push("category_l1 = 'all'");
    }
    if (from) {
      params.push(from);
      filters.push(`date >= $${params.length}::date`);
    }
    if (to) {
      params.push(to);
      filters.push(`date <= $${params.length}::date`);
    }
    const { rows } = await query(
      `SELECT date::text AS period, category_l1, units_sold, gmv_est::float8, items_count, avg_price::float8, stock_total
         FROM market.market_daily
        WHERE ${filters.join(' AND ')}
        ORDER BY date DESC
        LIMIT $2`,
      params
    );
    return { ok: true, meta: { granularity, category, platform, rows: rows.length }, rows: rows.reverse(), summary: summarize(rows) };
  });

  router.add('GET', '/v1/items', async ({ url }) => {
    const platform = platformParam(url.searchParams.get('platform'));
    const category = url.searchParams.get('category');
    const brand = url.searchParams.get('brand');
    const q = url.searchParams.get('q');
    const minUnits = parseIntParam(url.searchParams.get('min_units'), { min: 0, name: 'min_units' });
    const limit = parseIntParam(url.searchParams.get('limit'), { min: 1, max: 100, name: 'limit' }) ?? config.defaultLimit;
    const sortMap = {
      units_sold_month: 'units_sold_month',
      units_sold_total: 'units_sold_total',
      price: 'price',
      rating: 'rating',
    };
    const sort = sortMap[url.searchParams.get('sort') || 'units_sold_month'];
    if (!sort) throw new HttpError(400, 'INVALID_PARAM', 'sort must be units_sold_month, units_sold_total, price or rating');
    const order = (url.searchParams.get('order') || 'desc').toLowerCase();
    if (!['asc', 'desc'].includes(order)) throw new HttpError(400, 'INVALID_PARAM', 'order must be asc or desc');

    const params = [platform];
    const filters = ['platform = $1'];
    if (category && category !== 'all') {
      params.push(category);
      filters.push(`category_l1 = $${params.length}`);
    }
    if (brand) {
      params.push(brand);
      filters.push(`lower(brand) = lower($${params.length})`);
    }
    if (q) {
      params.push(`%${q}%`);
      filters.push(`title ILIKE $${params.length}`);
    }
    if (minUnits !== undefined) {
      params.push(minUnits);
      filters.push(`units_sold_month >= $${params.length}`);
    }

    const cursorRaw = url.searchParams.get('cursor');
    if (cursorRaw) {
      const cursor = decodeCursor(cursorRaw);
      params.push(cursor.v);
      const vIdx = params.length;
      params.push(cursor.id);
      const idIdx = params.length;
      if (cursor.n) {
        filters.push(`${sort} IS NULL AND item_id < $${idIdx}`);
      } else if (order === 'desc') {
        filters.push(`(${sort} IS NULL OR ${sort} < $${vIdx} OR (${sort} = $${vIdx} AND item_id < $${idIdx}))`);
      } else {
        filters.push(`(${sort} IS NOT NULL AND (${sort} > $${vIdx} OR (${sort} = $${vIdx} AND item_id > $${idIdx})))`);
      }
    }

    params.push(limit + 1);
    const { rows } = await query(
      `SELECT item_id::text, shop_id::text, title, brand, category_l1,
              price::float8, units_sold_month, units_sold_total, rating::float8, stock_total,
              item_url, snapshot_date::text
         FROM market.market_items
        WHERE ${filters.join(' AND ')}
        ORDER BY ${sort} ${order.toUpperCase()} NULLS LAST, item_id ${order.toUpperCase()}
        LIMIT $${params.length}`,
      params
    );

    let nextCursor = null;
    if (rows.length > limit) {
      rows.pop();
      const last = rows[rows.length - 1];
      nextCursor = encodeCursor({ v: last[sort], id: last.item_id, n: last[sort] === null });
    }
    return { ok: true, meta: { platform, rows: rows.length }, rows, next_cursor: nextCursor };
  });

  router.add('GET', '/v1/items/:id/history', async ({ params }) => {
    const itemId = Number(params.id);
    if (!Number.isSafeInteger(itemId) || itemId <= 0) {
      throw new HttpError(400, 'INVALID_PARAM', 'item id must be a positive integer');
    }
    const { rows } = await query(
      `SELECT snapshot_date::text AS date, units_sold_month, units_sold_total,
              price_min::float8 AS price, rating::float8
         FROM market.silver_items
        WHERE platform = 'shopee' AND item_id = $1
        ORDER BY snapshot_date`,
      [itemId]
    );
    return { ok: true, rows };
  });

  router.add('GET', '/v1/items/:id', async ({ params }) => {
    const itemId = Number(params.id);
    if (!Number.isSafeInteger(itemId) || itemId <= 0) {
      throw new HttpError(400, 'INVALID_PARAM', 'item id must be a positive integer');
    }
    const { rows } = await query(
      `SELECT item_id::text, shop_id::text, title, brand, category_l1,
              price::float8, units_sold_month, units_sold_total, rating::float8, stock_total,
              item_url, snapshot_date::text
         FROM market.market_items WHERE item_id = $1
        ORDER BY snapshot_date DESC LIMIT 1`,
      [itemId]
    );
    if (!rows.length) throw new HttpError(404, 'NOT_FOUND', 'Item not found');
    return { ok: true, row: rows[0] };
  });

  router.add('GET', '/v1/quality', async ({ url }) => {
    const from = parseDateParam(url.searchParams.get('from'), 'from');
    const to = parseDateParam(url.searchParams.get('to'), 'to');
    const params = [];
    const filters = [];
    if (from) {
      params.push(from);
      filters.push(`date >= $${params.length}::date`);
    }
    if (to) {
      params.push(to);
      filters.push(`date <= $${params.length}::date`);
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT date::text, platform, matched, matched_pct::float8, outliers, coverage_pct::float8
         FROM market.data_quality ${where} ORDER BY date DESC LIMIT 90`,
      params
    );
    return { ok: true, rows };
  });

  router.add('POST', '/v1/keys', async ({ req, readJson }) => {
    requireAdmin(req);
    const body = await readJson();
    const label = String(body?.label || '').slice(0, 120) || null;
    const plan = ['free', 'pro', 'enterprise'].includes(body?.plan) ? body.plan : 'free';
    const plaintext = `emd_${crypto.randomBytes(24).toString('base64url')}`;
    const hash = crypto.createHash('sha256').update(plaintext).digest('hex');
    const { rows } = await query(
      'INSERT INTO market.api_keys (key_hash, label, plan) VALUES ($1,$2,$3) RETURNING id, plan, created_at',
      [hash, label, plan]
    );
    return { ok: true, __status: 201, key: plaintext, id: String(rows[0].id), plan: rows[0].plan, created_at: rows[0].created_at };
  });

  router.add('GET', '/v1/keys', async ({ req }) => {
    requireAdmin(req);
    const { rows } = await query(
      'SELECT id::text, label, plan, status, created_at, last_used_at FROM market.api_keys ORDER BY created_at DESC'
    );
    return { ok: true, rows };
  });

  router.add('GET', '/v1/usage', async ({ req, url }) => {
    requireAdmin(req);
    const days = parseIntParam(url.searchParams.get('days'), { min: 1, max: 90, name: 'days' }) ?? 7;
    const { rows } = await query(
      `SELECT key_id::text, endpoint, count(*)::int AS calls, sum(rows)::int AS rows, avg(duration_ms)::int AS avg_ms
         FROM market.usage_events
        WHERE ts >= now() - ($1 || ' days')::interval
        GROUP BY key_id, endpoint ORDER BY calls DESC`,
      [days]
    );
    return { ok: true, days, rows };
  });
}

function summarize(rows) {
  return rows.reduce(
    (acc, r) => {
      acc.units_sold += Number(r.units_sold || 0);
      acc.gmv_est += Number(r.gmv_est || 0);
      acc.items_count += Number(r.items_count || 0);
      return acc;
    },
    { units_sold: 0, gmv_est: 0, items_count: 0 }
  );
}
