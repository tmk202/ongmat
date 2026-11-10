import { config, sleep } from './config.js';

function mockRow(item, index) {
  const base = Number(item.item_id) % 9000;
  const units = 20 + ((base * 7 + index * 13) % 4800);
  const price = 15000 + (base % 400) * 1000;
  const observed = new Date();
  return {
    date: observed.toISOString().slice(0, 10),
    item_id: String(item.item_id),
    shop_id: String(item.shop_id),
    market: item.market || 'VN',
    title: `Mock product ${item.item_id}`,
    price,
    units_sold_month: units,
    units_sold_total: units + (base % 5000),
    rating: Math.round((3.8 + (base % 12) / 10) * 100) / 100,
    observed_at: observed.toISOString(),
  };
}

function sessionFetcher() {
  return {
    kind: 'session',
    async fetchBatch(items) {
      const response = await fetch(`${config.sessionUrl}/v1/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
        signal: AbortSignal.timeout(120000),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`session fetch failed ${response.status}: ${text.slice(0, 200)}`);
      }
      const data = await response.json();
      return { rows: data.rows || [], errors: data.errors || [] };
    },
  };
}

function mockFetcher() {
  return {
    kind: 'mock',
    async fetchBatch(items) {
      await sleep(5);
      const rows = [];
      const errors = [];
      items.forEach((item, index) => {
        if ((Number(item.item_id) + index) % 50 === 0) {
          errors.push({ item_id: String(item.item_id), shop_id: String(item.shop_id), reason: 'MOCK_NOT_FOUND' });
        } else {
          rows.push(mockRow(item, index));
        }
      });
      return { rows, errors };
    },
  };
}

export function fetcher() {
  return config.sessionUrl ? sessionFetcher() : mockFetcher();
}
