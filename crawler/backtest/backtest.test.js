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

test('tiktok embedded state extractor finds products', async () => {
  const { extractProducts } = await import('../services/session/platforms/tiktok.js');
  const html = `<html><script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">${JSON.stringify({
    data: {
      products: [
        { product_id: '1730001', title: 'Serum Vitamin C', product_price_info: { sale_price_decimal: '189000' }, sold_info: { sold_count: 1240 }, seller_info: { seller_id: '90001' } },
        { product_id: '1730002', title: 'Kem chống nắng', product_price_info: { sale_price_decimal: '245000' }, sold_info: { sold_count: 3120 }, seller_info: { seller_id: '90002' } },
      ],
    },
  })}</script></html>`;
  const rows = extractProducts(html);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].item_id, '1730001');
  assert.equal(rows[0].price, 189000);
  assert.equal(rows[0].units_sold_month, 1240);
  assert.equal(rows[1].units_sold_month, 3120);
});

test('tiktok api payload normalizes nested fields', async () => {
  const { extractFromApi } = await import('../services/session/platforms/tiktok.js');
  const payload = {
    code: 0,
    data: {
      component_data: {
        products: [
          {
            product_id: '1731559750857099289',
            title: 'KANS Serum',
            product_price_info: { sale_price_decimal: '279617', origin_price_decimal: '499000' },
            rate_info: { score: 4.8, review_count: '729' },
            sold_info: { sold_count: 14725 },
            seller_info: { seller_id: '7496022687932450841', shop_name: 'Kans Official' },
            seo_url: { canonical_url: 'https://shop.tiktok.com/vn/pdp/1731559750857099289' },
            brand_info: { brand_name: 'KANS' },
          },
        ],
      },
    },
  };
  const [row] = extractFromApi(payload);
  assert.equal(row.item_id, '1731559750857099289');
  assert.equal(row.price, 279617);
  assert.equal(row.price_original, 499000);
  assert.equal(row.units_sold_month, 14725);
  assert.equal(row.units_sold_total, null);
  assert.equal(row.rating, 4.8);
  assert.equal(row.shop_id, '7496022687932450841');
  assert.equal(row.brand, 'KANS');
});

test('tiktok pdp extractor reads variants and lifetime sold', async () => {
  const { extractPdp } = await import('../services/session/platforms/tiktok.js');
  const state = {
    loaderData: {
      page: {
        page_config: {
          components_map: [
            {},
            {
              component_data: {
                product_info: {
                  product_id: '1731559750857099289',
                  title: 'KANS Serum',
                  sold_count: '14725',
                  price: { min_sku_price: '321.399', max_sku_price: '635.999', original_price: '499.000₫' },
                  review: { product_rating: 4.8, review_count: '729' },
                  seller: { seller_id: '7496022687932450841', name: 'Kans Official' },
                  skus: [
                    { sku_id: '1', stock: 1319, price: { sale_price_decimal: '321399' } },
                    { sku_id: '2', stock: 1385, price: { sale_price_decimal: '635999' } },
                  ],
                  specifications: [{ name: 'Xuất xứ', value: 'Trung Quốc' }],
                },
              },
            },
          ],
        },
      },
    },
  };
  const html = `<script id="__MODERN_ROUTER_DATA__" type="application/json">${JSON.stringify(state)}</script>`;
  const row = extractPdp(html);
  assert.equal(row.item_id, '1731559750857099289');
  assert.equal(row.price, 321399);
  assert.equal(row.price_max, 635999);
  assert.equal(row.units_sold_total, 14725);
  assert.equal(row.variant_count, 2);
  assert.equal(row.stock_total, 2704);
  assert.equal(row.rating, 4.8);
  assert.equal(row.review_count, 729);
  assert.equal(row.shop_id, '7496022687932450841');
});

test('raw store keeps the full payload gzipped', async () => {
  const { mkdtemp, readFile, readdir } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const { gunzipSync } = await import('node:zlib');
  const dir = await mkdtemp(join(tmpdir(), 'raw-'));
  process.env.RAW_DIR = dir;
  process.env.RAW_BUCKET = '';
  process.env.R2_ACCESS_KEY_ID = '';
  process.env.R2_SECRET_ACCESS_KEY = '';
  const { saveRaw } = await import('../packages/raw.js');
  const payload = { code: 0, data: { products: [{ product_id: '1', title: 'x', skus: [{ stock: 5 }] }] } };
  const result = await saveRaw({ platform: 'tiktok', kind: 'search', key: 'serum-0', payload });
  assert.ok(result.objectKey);
  const body = JSON.parse(gunzipSync(await readFile(result.objectKey)).toString('utf8'));
  assert.equal(body.data.products[0].skus[0].stock, 5);
  const day = new Date().toISOString().slice(0, 10);
  const files = await readdir(join(dir, 'tiktok', 'search', `dt=${day}`));
  assert.equal(files.length, 1);
});

test('core payloads keep commercial fields only', async () => {
  const { coreFromSearch, coreFromPdp } = await import('../services/session/platforms/tiktok.js');
  const search = {
    data: {
      component_data: {
        products: [
          {
            product_id: '1731559750857099289',
            title: 'KANS Serum',
            product_price_info: { sale_price_decimal: '279617', origin_price_decimal: '499000', currency_name: 'VND', discount_format: '44%' },
            sold_info: { sold_count: 14725 },
            rate_info: { score: 4.8, review_count: '729' },
            seller_info: { seller_id: '7496022687932450841', shop_name: 'Kans Official' },
            brand_info: { brand_name: 'KANS' },
            sku_info: [{ SkuId: 'a' }, { SkuId: 'b' }],
            image: { url_list: ['https://img/1'] },
            seo_url: { canonical_url: 'https://shop.tiktok.com/vn/pdp/x' },
            product_marketing_info: { huge: 'drop me' },
          },
        ],
      },
    },
  };
  const core = coreFromSearch(search, 'serum', 0);
  assert.equal(core.count, 1);
  assert.equal(core.products[0].sold_30d, 14725);
  assert.equal(core.products[0].sku_ids.length, 2);
  assert.equal(core.products[0].product_marketing_info, undefined);
  assert.equal(core.products[0].image, 'https://img/1');

  const pdpState = { loaderData: { x: { product_id: '1', title: 't', sold_count: '5', skus: [{ sku_id: 's', stock: 2, price: { sale_price_decimal: '1' } }], images: [{ url_list: ['https://img/1'] }, { url_list: ['https://img/2'] }], specifications: [{ name: 'a', value: 'b' }], seller: { seller_id: '9', name: 'shop' }, price: {}, review: {} } } };
  const pdp = coreFromPdp(pdpState);
  assert.equal(pdp.skus.length, 1);
  assert.equal(pdp.images.length, 2);
});
