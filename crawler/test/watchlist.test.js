import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL = '';
process.env.REDIS_URL = '';
process.env.KAFKA_BROKERS = '';

const { createWatchlist, addWatchlistItems, listWatchlistItems, dueWatchlists, markWatchlistRun } = await import('../packages/watchlists.js');
const { enqueueJob } = await import('../packages/jobs.js');
const { store } = await import('../packages/store.js');

test('watchlist stores unique items and can be queued', async () => {
  const watchlist = await createWatchlist({ name: 'top-vn', schedule: 'daily' });
  const items = [
    { item_id: 1, shop_id: 10 },
    { item_id: 1, shop_id: 10 },
    { item_id: 2, shop_id: 20, market: 'vn' },
  ];
  const added = await addWatchlistItems(watchlist.id, items);
  assert.equal(added, 2);
  const stored = await listWatchlistItems(watchlist.id);
  assert.equal(stored.length, 2);
  assert.equal(stored[1].market, 'VN');
});

test('interval watchlist becomes due after its window', async () => {
  const { listWatchlists } = await import('../packages/watchlists.js');
  const watchlist = await createWatchlist({ name: 'two-hour', intervalMinutes: 120 });
  await addWatchlistItems(watchlist.id, [{ item_id: 4, shop_id: 40 }]);
  await markWatchlistRun(watchlist.id);
  expectNotDue: {
    const due = await dueWatchlists();
    assert.ok(!due.some((w) => w.id === watchlist.id));
  }
  const record = (await listWatchlists()).find((w) => w.id === watchlist.id);
  record.last_run_at = new Date(Date.now() - 121 * 60000).toISOString();
  const due = await dueWatchlists();
  assert.ok(due.some((w) => w.id === watchlist.id));
});

test('due watchlists run once per day', async () => {
  const watchlist = await createWatchlist({ name: 'daily-check' });
  await addWatchlistItems(watchlist.id, [{ item_id: 3, shop_id: 30 }]);
  const dueBefore = await dueWatchlists();
  assert.ok(dueBefore.some((w) => w.id === watchlist.id));
  const job = await enqueueJob({ name: 'watchlist test', items: await listWatchlistItems(watchlist.id) });
  assert.equal(job.total_items, 1);
  const jobs = await store().listJobs(10);
  assert.ok(jobs.some((j) => j.id === job.id));
  await markWatchlistRun(watchlist.id);
  const dueAfter = await dueWatchlists();
  assert.ok(!dueAfter.some((w) => w.id === watchlist.id));
});
