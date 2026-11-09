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

    return env.ASSETS.fetch(request);
  },
};
