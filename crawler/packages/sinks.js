import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient } from '@clickhouse/client';
import { config } from './config.js';

function jsonlSink() {
  return {
    kind: 'jsonl',
    async write(rows, errors = []) {
      await mkdir(config.dataDir, { recursive: true });
      const stamp = new Date().toISOString().slice(0, 10);
      if (rows.length) {
        await appendFile(join(config.dataDir, `rows-${stamp}.jsonl`), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
      }
      if (errors.length) {
        await appendFile(join(config.dataDir, `errors-${stamp}.jsonl`), errors.map((e) => JSON.stringify(e)).join('\n') + '\n');
      }
    },
    async close() {},
  };
}

function clickhouseSink() {
  const client = createClient({ url: config.clickhouseUrl });
  return {
    kind: 'clickhouse',
    async write(rows, errors = []) {
      if (rows.length) {
        await client.insert({
          table: 'crawl.item_snapshots',
          values: rows.map((row) => ({
            ...row,
            observed_at: String(row.observed_at).replace('T', ' ').replace('Z', '').slice(0, 19),
          })),
          format: 'JSONEachRow',
        });
      }
      if (errors.length) {
        const now = new Date();
        await client.insert({
          table: 'crawl.item_errors',
          values: errors.map((error) => ({
            date: now.toISOString().slice(0, 10),
            item_id: String(error.item_id || ''),
            shop_id: String(error.shop_id || ''),
            market: error.market || 'VN',
            reason: String(error.reason || 'unknown'),
            observed_at: now.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19),
          })),
          format: 'JSONEachRow',
        });
      }
    },
    async close() {
      await client.close();
    },
  };
}

let singleton = null;

export function sink() {
  if (singleton) return singleton;
  singleton = config.clickhouseUrl ? clickhouseSink() : jsonlSink();
  return singleton;
}
