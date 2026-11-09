import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../index.mjs';
import { closePool } from '../db.mjs';
import { config } from '../config.mjs';

let server;
let base;

before(async () => {
  server = createApp();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await closePool();
});

const get = async (path) => {
  const res = await fetch(base + path);
  return { status: res.status, body: await res.json() };
};

test('health reports db ok', async () => {
  const { status, body } = await get('/health');
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.db, 'ok');
});

test('meta exposes snapshot and categories', async () => {
  const { status, body } = await get('/v1/meta');
  assert.equal(status, 200);
  assert.match(body.meta.snapshot_date, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Array.isArray(body.meta.categories));
});

test('monthly metrics return summary', async () => {
  const { status, body } = await get('/v1/metrics?granularity=month');
  assert.equal(status, 200);
  assert.ok(body.rows.length >= 1);
  assert.equal(typeof body.summary.units_sold, 'number');
  assert.ok(body.summary.units_sold > 0);
});

test('daily metrics filter by category', async () => {
  const { status, body } = await get('/v1/metrics?granularity=day&category=Supplements');
  assert.equal(status, 200);
  for (const row of body.rows) assert.equal(row.category_l1, 'Supplements');
});

test('items keyset pagination does not overlap', async () => {
  const first = await get('/v1/items?limit=5&sort=units_sold_total&order=desc');
  assert.equal(first.status, 200);
  assert.equal(first.body.rows.length, 5);
  assert.ok(first.body.next_cursor);

  const second = await get(
    `/v1/items?limit=5&sort=units_sold_total&order=desc&cursor=${first.body.next_cursor}`
  );
  assert.equal(second.status, 200);
  const ids = new Set(first.body.rows.map((r) => r.item_id));
  for (const row of second.body.rows) assert.ok(!ids.has(row.item_id));
});

test('item detail returns the requested item', async () => {
  const list = await get('/v1/items?limit=1');
  const itemId = list.body.rows[0].item_id;
  const { status, body } = await get(`/v1/items/${itemId}`);
  assert.equal(status, 200);
  assert.equal(body.row.item_id, itemId);
});

test('invalid sort is rejected', async () => {
  const { status, body } = await get('/v1/items?sort=drop_table');
  assert.equal(status, 400);
  assert.equal(body.error.code, 'INVALID_PARAM');
});

test('invalid date is rejected', async () => {
  const { status, body } = await get('/v1/metrics?from=09-11-2026');
  assert.equal(status, 400);
  assert.equal(body.error.code, 'INVALID_PARAM');
});

test('unknown endpoint returns 404', async () => {
  const { status, body } = await get('/v1/unknown');
  assert.equal(status, 404);
  assert.equal(body.error.code, 'NOT_FOUND');
});

test('admin keys are protected', async () => {
  const res = await fetch(`${base}/v1/keys`, { method: 'POST' });
  const body = await res.json();
  if (config.adminToken) {
    assert.equal(res.status, 403);
    assert.equal(body.error.code, 'FORBIDDEN');
  } else {
    assert.equal(res.status, 404);
  }
});
