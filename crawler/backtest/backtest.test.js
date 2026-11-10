import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startMock } from './mock/server.js';
import { createTikTokClient } from './client.js';
import { importHar, sanitizeEntries } from './har/import.js';

test('happy path returns normalized products', async () => {
  const mock = await startMock({ latencyMs: 5 });
  const client = createTikTokClient({ baseUrl: mock.baseUrl });
  const row = await client.getProduct('1730001');
  assert.equal(row.platform, 'tiktok');
  assert.equal(row.units_sold_month, 1240);
  assert.equal(row.category_l1, 'Beauty');
  assert.equal(row.price, 189000);
  await mock.app.close();
});

test('missing product surfaces a terminal error', async () => {
  const mock = await startMock({ missingIds: ['1730003'] });
  const client = createTikTokClient({ baseUrl: mock.baseUrl });
  await assert.rejects(() => client.getProduct('1730003'), /not_found/);
  await mock.app.close();
});

test('retries transient failures', async () => {
  const mock = await startMock({ failFirst: 2, latencyMs: 1 });
  const client = createTikTokClient({ baseUrl: mock.baseUrl, retries: 3, retryDelayMs: 10 });
  const row = await client.getProduct('1730004');
  assert.equal(row.item_id, '1730004');
  assert.equal(client.stats.retries, 2);
  await mock.app.close();
});

test('rate limited client gives up after retries', async () => {
  const mock = await startMock({ rateLimitRpm: 1 });
  const client = createTikTokClient({ baseUrl: mock.baseUrl, retries: 1, retryDelayMs: 5 });
  await client.getProduct('1730001');
  await assert.rejects(() => client.getProduct('1730002'), /retry_exhausted_429/);
  assert.ok(mock.stats.rateLimited > 0);
  await mock.app.close();
});

test('search paginates deterministically', async () => {
  const mock = await startMock();
  const client = createTikTokClient({ baseUrl: mock.baseUrl });
  const page1 = await client.search('', 1, 2);
  const page2 = await client.search('', 2, 2);
  assert.equal(page1.items.length, 2);
  assert.equal(page1.has_more, true);
  assert.notEqual(page1.items[0].id, page2.items[0].id);
  await mock.app.close();
});

test('HAR importer strips headers and decodes base64 bodies', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'har-'));
  const harPath = join(dir, 'capture.har');
  const outPath = join(dir, 'fixture.json');
  const body = JSON.stringify({ id: '1', title: 'Test' });
  await writeFile(harPath, JSON.stringify({
    log: {
      entries: [
        {
          startedDateTime: new Date().toISOString(),
          request: { method: 'GET', url: 'https://shop.tiktok.com/api/v1/products/1', headers: [{ name: 'Cookie', value: 'session=secret' }] },
          response: { status: 200, content: { mimeType: 'application/json', text: Buffer.from(body).toString('base64'), encoding: 'base64' } },
        },
      ],
    },
  }));
  const result = await importHar(harPath, outPath);
  assert.equal(result.entries, 1);
  const saved = await readFile(outPath, 'utf8');
  assert.ok(!saved.includes('session=secret'));
  assert.ok(saved.includes('Test'));
  const entries = sanitizeEntries({ log: { entries: [] } });
  assert.equal(entries.length, 0);
});
