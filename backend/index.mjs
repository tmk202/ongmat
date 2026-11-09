import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from './config.mjs';
import { closePool } from './db.mjs';
import {
  HttpError,
  authenticate,
  clientIp,
  makeRouter,
  rateLimit,
  recordUsage,
  sendError,
  sendJson,
} from './http.mjs';
import { registerRoutes } from './routes.mjs';

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 64 * 1024) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Request body too large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'Invalid JSON body');
  }
}

export function createApp() {
  const router = makeRouter();
  registerRoutes(router);

  const server = http.createServer(async (req, res) => {
    const started = Date.now();
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    let keyId = null;
    let status = 500;

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, X-Admin-Token',
        'Access-Control-Max-Age': '86400',
      });
      res.end();
      status = 204;
      return;
    }

    try {
      const auth = await authenticate(req);
      keyId = auth.keyId;

      const limit = rateLimit(keyId !== null ? `key:${keyId}` : `ip:${clientIp(req)}`);
      if (!limit.ok) {
        throw new HttpError(429, 'RATE_LIMITED', 'Too many requests', { retry_after: limit.retryAfter });
      }

      const found = router.match(req.method || 'GET', url.pathname);
      if (!found) throw new HttpError(404, 'NOT_FOUND', 'Unknown endpoint');

      const result = await found.handler({
        req,
        res,
        url,
        params: found.params,
        readJson: () => readJson(req),
      });

      const statusCode = result?.__status ?? 200;
      const payload = { ...result };
      delete payload.__status;
      status = statusCode;
      sendJson(res, statusCode, payload);
    } catch (error) {
      status = error instanceof HttpError ? error.status : 500;
      sendError(res, error);
    } finally {
      recordUsage({
        keyId,
        endpoint: `${req.method} ${url.pathname}`,
        status,
        rows: 0,
        durationMs: Date.now() - started,
      });
      console.log(
        JSON.stringify({
          level: status >= 500 ? 'error' : 'info',
          method: req.method,
          path: url.pathname,
          status,
          ms: Date.now() - started,
          keyId,
        })
      );
    }
  });

  server.on('clientError', (_err, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  });

  return server;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  if (!config.databaseUrl) {
    console.error('DATABASE_URL is missing (set it in .env)');
    process.exit(1);
  }
  const server = createApp();
  server.listen(config.port, config.host, () => {
    console.log(`ecommarketdata backend listening on http://${config.host}:${config.port}`);
    console.log(`auth=${config.auth} rate_limit=${config.rateLimitPerMin}/min`);
  });
  const shutdown = () => {
    server.close(async () => {
      await closePool().catch(() => {});
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
