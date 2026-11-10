import pg from 'pg';
import { config } from './config.js';

let pool = null;
function db() {
  if (!config.databaseUrl) return null;
  if (!pool) pool = new pg.Pool({ connectionString: config.databaseUrl, max: 5 });
  return pool;
}

const memory = { watchlists: [], items: new Map(), nextId: 1 };

export async function createWatchlist({ name, schedule = 'daily' }) {
  const connection = db();
  if (!connection) {
    const record = { id: memory.nextId++, name, schedule, active: true, last_run_at: null, created_at: new Date().toISOString() };
    memory.watchlists.push(record);
    memory.items.set(record.id, []);
    return record;
  }
  const { rows } = await connection.query(
    'INSERT INTO crawl.watchlists (name, schedule) VALUES ($1, $2) RETURNING *',
    [name, schedule]
  );
  return rows[0];
}

export async function listWatchlists() {
  const connection = db();
  if (!connection) return memory.watchlists;
  const { rows } = await connection.query(
    `SELECT w.*, (SELECT count(*)::int FROM crawl.watchlist_items i WHERE i.watchlist_id = w.id) AS item_count
       FROM crawl.watchlists w ORDER BY w.id`
  );
  return rows;
}

export async function addWatchlistItems(id, items) {
  const clean = items.map((item) => ({
    item_id: String(item.item_id),
    shop_id: String(item.shop_id),
    market: (item.market || 'VN').toUpperCase(),
  }));
  const connection = db();
  if (!connection) {
    const list = memory.items.get(Number(id)) || [];
    for (const item of clean) {
      if (!list.some((x) => x.item_id === item.item_id && x.shop_id === item.shop_id)) list.push(item);
    }
    memory.items.set(Number(id), list);
    return list.length;
  }
  let added = 0;
  for (const item of clean) {
    const result = await connection.query(
      `INSERT INTO crawl.watchlist_items (watchlist_id, item_id, shop_id, market)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (watchlist_id, item_id, shop_id) DO NOTHING`,
      [id, item.item_id, item.shop_id, item.market]
    );
    added += result.rowCount;
  }
  return added;
}

export async function listWatchlistItems(id) {
  const connection = db();
  if (!connection) return memory.items.get(Number(id)) || [];
  const { rows } = await connection.query(
    'SELECT item_id::text, shop_id::text, market FROM crawl.watchlist_items WHERE watchlist_id = $1',
    [id]
  );
  return rows;
}

export async function markWatchlistRun(id) {
  const connection = db();
  if (!connection) {
    const record = memory.watchlists.find((w) => w.id === Number(id));
    if (record) record.last_run_at = new Date().toISOString();
    return;
  }
  await connection.query('UPDATE crawl.watchlists SET last_run_at = now() WHERE id = $1', [id]);
}

export async function dueWatchlists() {
  const connection = db();
  if (!connection) {
    const today = new Date().toISOString().slice(0, 10);
    return memory.watchlists.filter((w) => w.active && (!w.last_run_at || w.last_run_at.slice(0, 10) < today));
  }
  const { rows } = await connection.query(
    `SELECT * FROM crawl.watchlists
      WHERE active = true
        AND (last_run_at IS NULL OR last_run_at::date < current_date)
      ORDER BY id`
  );
  return rows;
}
