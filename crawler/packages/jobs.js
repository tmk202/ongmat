import { config, chunk } from './config.js';
import { bus } from './bus.js';
import { store } from './store.js';

export async function enqueueJob({ name, items }) {
  const clean = items.map((item) => ({
    item_id: String(item.item_id),
    shop_id: String(item.shop_id),
    market: (item.market || 'VN').toUpperCase(),
  }));
  const shards = chunk(clean, config.shardSize);
  const job = await store().createJob({ name, total: clean.length, shards: shards.length });
  for (let index = 0; index < shards.length; index += 1) {
    await bus().publish(config.topicJobs, { job_id: job.id, shard: index, shards: shards.length, items: shards[index] });
  }
  return job;
}
