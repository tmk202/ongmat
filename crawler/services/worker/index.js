import { config, chunk, log, mapLimit, sleep } from '../../packages/config.js';
import { bus } from '../../packages/bus.js';
import { store } from '../../packages/store.js';
import { sink } from '../../packages/sinks.js';
import { fetcher } from '../../packages/fetcher.js';

export async function processShard(message) {
  const output = sink();
  const fetchBatch = fetcher();
  const jobs = store();
  const batches = chunk(message.items || [], config.batchSize);
  let success = 0;
  let errors = 0;
  let nextAt = 0;

  await mapLimit(batches, config.concurrency, async (batch) => {
    const now = Date.now();
    const wait = Math.max(0, nextAt - now);
    nextAt = Math.max(now, nextAt) + Math.round(1000 / config.ratePerSecond);
    if (wait) await sleep(wait);
    try {
      const result = await fetchBatch.fetchBatch(batch);
      success += result.rows.length;
      errors += result.errors.length;
      await output.write(result.rows, result.errors);
    } catch (error) {
      errors += batch.length;
      log('error', 'batch failed', { job_id: message.job_id, error: String(error) });
    }
  });

  await jobs.markShardDone(message.job_id, { success, errors });
  log('info', 'shard done', { job_id: message.job_id, shard: message.shard, success, errors });
}

export async function startWorker() {
  const b = bus();
  log('info', 'worker started', { bus: b.kind, fetcher: config.sessionUrl ? 'session' : 'mock', batchSize: config.batchSize });
  await b.consume(config.topicJobs, processShard);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startWorker().catch((error) => {
    log('error', 'worker crashed', { error: String(error) });
    process.exit(1);
  });
}
