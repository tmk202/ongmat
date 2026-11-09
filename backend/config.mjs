import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnv();

export const config = {
  root: ROOT,
  host: process.env.BACKEND_HOST || '127.0.0.1',
  port: Number(process.env.BACKEND_PORT || 8102),
  databaseUrl: process.env.DATABASE_URL || '',
  auth: (process.env.BACKEND_AUTH || 'off').toLowerCase(),
  rateLimitPerMin: Number(process.env.BACKEND_RATE_LIMIT || 600),
  maxLimit: 1000,
  defaultLimit: 50,
  adminToken: process.env.BACKEND_ADMIN_TOKEN || '',
};
