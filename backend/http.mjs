import crypto from 'node:crypto';
import { config } from './config.mjs';
import { query } from './db.mjs';

export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function sendJson(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    ...headers,
  });
  res.end(body);
}

export function sendError(res, error) {
  const status = error instanceof HttpError ? error.status : 500;
  const code = error instanceof HttpError ? error.code : 'INTERNAL_ERROR';
  const message = error instanceof HttpError ? error.message : 'Unexpected server error';
  if (status >= 500) console.error(JSON.stringify({ level: 'error', code, message, stack: error?.stack }));
  sendJson(res, status, { ok: false, error: { code, message, details: error.details ?? undefined } });
}

export function makeRouter() {
  const routes = [];
  const add = (method, pattern, handler) => {
    routes.push({ method, segments: pattern.split('/').filter(Boolean), handler });
  };
  const match = (method, pathname) => {
    const parts = pathname.split('/').filter(Boolean);
    for (const route of routes) {
      if (route.method !== method) continue;
      if (route.segments.length !== parts.length) continue;
      const params = {};
      let ok = true;
      for (let i = 0; i < route.segments.length; i++) {
        const seg = route.segments[i];
        if (seg.startsWith(':')) params[seg.slice(1)] = decodeURIComponent(parts[i]);
        else if (seg !== parts[i]) { ok = false; break; }
      }
      if (ok) return { handler: route.handler, params };
    }
    return null;
  };
  return { add, match };
}

const buckets = new Map();

export function rateLimit(key) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.start >= 60000) {
    buckets.set(key, { start: now, count: 1 });
    return { ok: true };
  }
  bucket.count += 1;
  if (bucket.count > config.rateLimitPerMin) {
    return { ok: false, retryAfter: Math.ceil((60000 - (now - bucket.start)) / 1000) };
  }
  return { ok: true };
}

export async function authenticate(req) {
  if (config.auth !== 'on') return { keyId: null, plan: 'public' };
  const key = req.headers['x-api-key'];
  if (!key) throw new HttpError(401, 'MISSING_KEY', 'Provide an X-API-Key header');
  const hash = crypto.createHash('sha256').update(String(key)).digest('hex');
  const { rows } = await query('SELECT id, plan, status FROM market.api_keys WHERE key_hash = $1', [hash]);
  if (!rows.length || rows[0].status !== 'active') {
    throw new HttpError(401, 'INVALID_KEY', 'Invalid or inactive API key');
  }
  return { keyId: rows[0].id, plan: rows[0].plan };
}

export function recordUsage({ keyId, endpoint, status, rows, durationMs }) {
  if (keyId === null) return;
  setImmediate(() => {
    query(
      'INSERT INTO market.usage_events (key_id, endpoint, status, rows, duration_ms) VALUES ($1,$2,$3,$4,$5)',
      [keyId, endpoint, status, rows, durationMs]
    ).catch(() => {});
    query('UPDATE market.api_keys SET last_used_at = now() WHERE id = $1', [keyId]).catch(() => {});
  });
}

export function clientIp(req) {
  return String(req.headers['cf-connecting-ip'] || req.socket?.remoteAddress || 'unknown');
}

export function parseIntParam(value, { min = 0, max = Number.MAX_SAFE_INTEGER, name = 'value' } = {}) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new HttpError(400, 'INVALID_PARAM', `${name} must be an integer between ${min} and ${max}`);
  }
  return n;
}

export function parseDateParam(value, name) {
  if (value === undefined || value === null || value === '') return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, 'INVALID_PARAM', `${name} must be YYYY-MM-DD`);
  }
  return value;
}
