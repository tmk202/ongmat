import './env.js';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { mkdir, writeFile, appendFile, unlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const safe = (value) => String(value).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
const root = () => process.env.RAW_DIR || new URL('../data/raw', import.meta.url).pathname;

const execFileAsync = promisify(execFile);
let s3Client = null;
let s3Denied = false;
let pgPool = null;

function s3() {
  const account = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.RAW_BUCKET;
  if (!account || !accessKeyId || !secretAccessKey || !bucket) return null;
  if (!s3Client) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${account}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return { client: s3Client, bucket };
}

function db() {
  if (!process.env.DATABASE_URL) return null;
  if (!pgPool) pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  return pgPool;
}

async function catalog(entry) {
  const pool = db();
  if (!pool) return;
  await pool.query(
    `INSERT INTO crawl.raw_objects (platform, kind, source_key, bucket, object_key, sha256, bytes, meta)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (sha256) DO NOTHING`,
    [entry.platform, entry.kind, entry.source_key, entry.bucket, entry.object_key, entry.sha256, entry.bytes, entry.meta || {}]
  ).catch(() => {});
}

export async function saveRaw({ platform, kind, key, payload, meta = {} }) {
  if (process.env.RAW_ENABLED === '0') return null;
  const date = new Date().toISOString().slice(0, 10);
  const body = JSON.stringify(payload);
  const gz = gzipSync(Buffer.from(body));
  const sha256 = createHash('sha256').update(body).digest('hex');
  const store = s3();
  if (store) {
    const objectKey = `raw/${platform}/${kind}/dt=${date}/${sha256}.json.gz`;
    if (!s3Denied) {
      try {
        try {
          await store.client.send(new HeadObjectCommand({ Bucket: store.bucket, Key: objectKey }));
        } catch (error) {
          if (error?.$metadata?.httpStatusCode === 403) throw error;
          await store.client.send(
            new PutObjectCommand({ Bucket: store.bucket, Key: objectKey, Body: gz, ContentType: 'application/json', ContentEncoding: 'gzip' })
          );
        }
        await catalog({ platform, kind, source_key: String(key), bucket: store.bucket, object_key: objectKey, sha256, bytes: gz.length, meta });
        return { objectKey, bucket: store.bucket, sha256, bytes: gz.length };
      } catch (error) {
        if (error?.$metadata?.httpStatusCode !== 403) throw error;
        s3Denied = true;
      }
    }
    const tmp = `${tmpdir()}/raw-${sha256}.json.gz`;
    await writeFile(tmp, gz);
    try {
      await execFileAsync('npx', ['wrangler', 'r2', 'object', 'put', `${store.bucket}/${objectKey}`, `--file=${tmp}`, '--content-type=application/json', '--remote'], { cwd: new URL('..', import.meta.url).pathname, timeout: 120000 });
    } finally {
      await unlink(tmp).catch(() => {});
    }
    await catalog({ platform, kind, source_key: String(key), bucket: store.bucket, object_key: objectKey, sha256, bytes: gz.length, meta });
    return { objectKey, bucket: store.bucket, sha256, bytes: gz.length, via: 'wrangler' };
  }
  const dir = join(root(), platform, kind, `dt=${date}`);
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${safe(key)}.json.gz`);
  await writeFile(file, gz);
  await appendFile(join(root(), 'index.jsonl'), JSON.stringify({ ts: new Date().toISOString(), platform, kind, key: String(key), file, sha256, bytes: gz.length, ...meta }) + '\n');
  await catalog({ platform, kind, source_key: String(key), bucket: 'local', object_key: file, sha256, bytes: gz.length, meta });
  return { objectKey: file, bucket: 'local', sha256, bytes: gz.length };
}
