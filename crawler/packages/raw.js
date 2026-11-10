import { gzipSync } from 'node:zlib';
import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = () => process.env.RAW_DIR || new URL('../data/raw', import.meta.url).pathname;
const safe = (value) => String(value).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);

export async function saveRaw({ platform, kind, key, payload, meta = {} }) {
  if (process.env.RAW_ENABLED === '0') return null;
  const date = new Date().toISOString().slice(0, 10);
  const dir = join(root(), platform, kind, date);
  await mkdir(dir, { recursive: true });
  const body = JSON.stringify(payload);
  const file = join(dir, `${safe(key)}.json.gz`);
  await writeFile(file, gzipSync(Buffer.from(body)));
  await appendFile(
    join(root(), 'index.jsonl'),
    JSON.stringify({ ts: new Date().toISOString(), platform, kind, key: String(key), file, bytes: body.length, ...meta }) + '\n'
  );
  return file;
}
