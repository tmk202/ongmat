import './env.js';

export const config = {
  port: Number(process.env.PORT || 8300),
  sessionPort: Number(process.env.SESSION_PORT || 8301),
  kafkaBrokers: (process.env.KAFKA_BROKERS || '').split(',').map((s) => s.trim()).filter(Boolean),
  topicJobs: process.env.TOPIC_JOBS || 'crawl.jobs',
  topicResults: process.env.TOPIC_RESULTS || 'crawl.results',
  consumerGroup: process.env.CONSUMER_GROUP || 'crawl-workers',
  batchSize: Number(process.env.BATCH_SIZE || 30),
  concurrency: Number(process.env.CONCURRENCY || 16),
  ratePerSecond: Number(process.env.RATE_PER_SECOND || 50),
  shardSize: Number(process.env.SHARD_SIZE || 5000),
  databaseUrl: process.env.DATABASE_URL || '',
  clickhouseUrl: process.env.CLICKHOUSE_URL || '',
  sessionUrl: process.env.SESSION_URL || '',
  apiToken: process.env.API_TOKEN || 'dev-token',
  dataDir: process.env.DATA_DIR || new URL('../data', import.meta.url).pathname,
};

export const log = (level, message, fields = {}) => {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, message, ...fields });
  if (level === 'error') console.error(line);
  else console.log(line);
};

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const chunk = (items, size) => {
  const output = [];
  for (let i = 0; i < items.length; i += size) output.push(items.slice(i, i + size));
  return output;
};

export async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}
