import pg from 'pg';
import { config } from './config.mjs';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 6,
  idleTimeoutMillis: 30000,
  application_name: 'ecommarketdata-backend',
  options: '-c statement_timeout=15000',
});

export function query(text, params) {
  return pool.query(text, params);
}

export async function withClient(fn) {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function closePool() {
  await pool.end();
}
