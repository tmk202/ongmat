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
      const json = (body, status = 200, cache = 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400') =>
        new Response(JSON.stringify(body), {
          status,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': cache,
            'Access-Control-Allow-Origin': '*',
          },
        });

      const route = url.pathname;
      const need = route === '/api/v1/items' ? 'items/top.json' : 'metrics/latest.json';
      const metaOnly = route === '/api/v1/meta';

      if (metaOnly) {
        const object = await env.GOLD.get('metrics/meta.json');
        if (!object) {
          return json({ ok: false, error: { code: 'NO_DATA', message: 'No snapshot published yet' } }, 503, 'no-store');
        }
        return new Response(object.body, {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      if (!['/api/v1/metrics', '/api/v1/categories', '/api/v1/items'].includes(route)) {
        return json({ ok: false, error: { code: 'NOT_FOUND', message: 'Unknown endpoint' } }, 404, 'no-store');
      }

      const object = await env.GOLD.get(need);
      if (!object) {
        return json({ ok: false, error: { code: 'NO_DATA', message: 'No snapshot published yet' } }, 503, 'no-store');
      }

      let data;
      try {
        data = await object.json();
      } catch {
        return json({ ok: false, error: { code: 'BAD_DATA', message: 'Published snapshot is unreadable' } }, 500, 'no-store');
      }

      if (route === '/api/v1/categories') {
        const monthly = Array.isArray(data.monthly) ? data.monthly : [];
        const valid = monthly.filter((row) => row.category_l1 && row.category_l1 !== 'all');
        const latest = valid.reduce((max, row) => (row.month > max ? row.month : max), '');
        const rows = valid
          .filter((row) => row.month === latest)
          .map((row) => ({
            category_l1: row.category_l1,
            items_count: Number(row.items_count) || 0,
            units_sold: Number(row.units_sold) || 0,
          }))
          .sort((a, b) => b.units_sold - a.units_sold);
        return json({ ok: true, meta: data.meta, rows });
      }

      if (route === '/api/v1/metrics') {
        const granularity = url.searchParams.get('granularity') || 'month';
        const category = url.searchParams.get('category');
        if (granularity === 'day') {
          let rows = Array.isArray(data.daily) ? data.daily : [];
          if (category) rows = rows.filter((row) => row.category_l1 === category);
          return json({ ok: true, meta: data.meta, rows });
        }
        let rows = (Array.isArray(data.monthly) ? data.monthly : []).map((row) => ({
          period: row.month,
          category_l1: row.category_l1,
          units_sold: Number(row.units_sold) || 0,
          gmv_est: Number(row.gmv_est) || 0,
          items_count: Number(row.items_count) || 0,
          price_index: row.price_index == null ? null : Number(row.price_index),
        }));
        rows = category
          ? rows.filter((row) => row.category_l1 === category)
          : rows.filter((row) => row.category_l1 && row.category_l1 !== 'all');
        rows.sort((a, b) => (a.period === b.period ? 0 : a.period < b.period ? -1 : 1));
        return json({ ok: true, meta: data.meta, rows });
      }

      const category = url.searchParams.get('category');
      const q = (url.searchParams.get('q') || '').trim().toLowerCase();
      const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 100, 1), 500);
      const order = url.searchParams.get('order') === 'asc' ? 1 : -1;
      const sortMap = {
        units_sold_month: 'units_sold_month',
        units_sold_total: 'units_sold_total',
        price: 'price',
        rating: 'rating',
        revenue: 'revenue',
      };
      const sort = sortMap[url.searchParams.get('sort') || 'units_sold_month'] || 'units_sold_month';
      const valueOf = (row) =>
        sort === 'revenue'
          ? (Number(row.units_sold_month) || 0) * (Number(row.price) || 0)
          : row[sort];
      let rows = Array.isArray(data.rows) ? data.rows : [];
      if (category) {
        const needle = category.toLowerCase();
        rows = rows.filter((row) => (row.category_l1 || '').toLowerCase() === needle);
      }
      if (q) {
        rows = rows.filter(
          (row) => (row.title || '').toLowerCase().includes(q) || (row.brand || '').toLowerCase().includes(q)
        );
      }
      rows = [...rows]
        .sort((a, b) => {
          const av = valueOf(a);
          const bv = valueOf(b);
          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          return order * (Number(av) - Number(bv));
        })
        .slice(0, limit);
      return json({ ok: true, meta: data.meta, rows });
    }

    return env.ASSETS.fetch(request);
  },
};
