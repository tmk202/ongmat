import { processLeadSubmission } from './server/leadHandler.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === 'www.ecommarketdata.com') {
      url.hostname = 'ecommarketdata.com';
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === '/google4334487ca5e49b48.html') {
      return new Response('google-site-verification: google4334487ca5e49b48.html\n', {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    if (url.pathname === '/api/lead' && request.method === 'POST') {
      try {
        const payload = await request.json();
        const result = await processLeadSubmission(payload, env || {});
        return new Response(JSON.stringify(result.body), {
          status: result.status,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid request payload' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    if (url.pathname.startsWith('/api/v1/') && request.method === 'GET') {
      const key = url.pathname === '/api/v1/metrics'
        ? 'metrics/latest.json'
        : url.pathname === '/api/v1/items'
          ? 'items/top.json'
          : url.pathname === '/api/v1/meta'
            ? 'metrics/meta.json'
            : null;

      if (!key) {
        return new Response(JSON.stringify({ ok: false, error: { code: 'NOT_FOUND', message: 'Unknown endpoint' } }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const object = await env.GOLD.get(key);
      if (!object) {
        return new Response(
          JSON.stringify({ ok: false, error: { code: 'NO_DATA', message: 'No snapshot published yet' } }),
          { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
        );
      }

      return new Response(object.body, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
