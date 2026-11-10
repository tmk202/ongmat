import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { config } from './config.js';

function memoryStore() {
  const jobs = new Map();
  return {
    kind: 'memory',
    async createJob({ name, total, shards }) {
      const job = {
        id: randomUUID(),
        name,
        status: 'running',
        total_items: total,
        shards,
        completed_shards: 0,
        success: 0,
        errors: 0,
        created_at: new Date().toISOString(),
      };
      jobs.set(job.id, job);
      return job;
    },
    async getJob(id) {
      return jobs.get(id) || null;
    },
    async markShardDone(id, { success, errors }) {
      const job = jobs.get(id);
      if (!job) return null;
      job.completed_shards += 1;
      job.success += success;
      job.errors += errors;
      if (job.completed_shards >= job.shards) job.status = 'done';
      return job;
    },
    async listJobs(limit = 20) {
      return [...jobs.values()].slice(-limit).reverse();
    },
    async stats() {
      const all = [...jobs.values()];
      return {
        jobs: all.length,
        running: all.filter((j) => j.status === 'running').length,
        items: all.reduce((sum, j) => sum + j.total_items, 0),
        success: all.reduce((sum, j) => sum + j.success, 0),
        errors: all.reduce((sum, j) => sum + j.errors, 0),
      };
    },
    async close() {},
  };
}

function pgStore() {
  const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10 });
  return {
    kind: 'postgres',
    async createJob({ name, total, shards }) {
      const { rows } = await pool.query(
        `INSERT INTO crawl.jobs (name, total_items, shards)
         VALUES ($1, $2, $3)
         RETURNING id, name, status, total_items, shards, completed_shards, success, errors, created_at`,
        [name, total, shards]
      );
      return rows[0];
    },
    async getJob(id) {
      const { rows } = await pool.query('SELECT * FROM crawl.jobs WHERE id = $1', [id]);
      return rows[0] || null;
    },
    async markShardDone(id, { success, errors }) {
      const { rows } = await pool.query(
        `UPDATE crawl.jobs
            SET completed_shards = completed_shards + 1,
                success = success + $2,
                errors = errors + $3,
                status = CASE WHEN completed_shards + 1 >= shards THEN 'done' ELSE status END,
                updated_at = now()
          WHERE id = $1
          RETURNING *`,
        [id, success, errors]
      );
      return rows[0] || null;
    },
    async listJobs(limit = 20) {
      const { rows } = await pool.query('SELECT * FROM crawl.jobs ORDER BY created_at DESC LIMIT $1', [limit]);
      return rows;
    },
    async stats() {
      const { rows } = await pool.query(
        `SELECT count(*)::int AS jobs,
                count(*) FILTER (WHERE status = 'running')::int AS running,
                COALESCE(sum(total_items), 0)::bigint AS items,
                COALESCE(sum(success), 0)::bigint AS success,
                COALESCE(sum(errors), 0)::bigint AS errors
           FROM crawl.jobs`
      );
      return rows[0];
    },
    async close() {
      await pool.end();
    },
  };
}

let singleton = null;

export function store() {
  if (singleton) return singleton;
  singleton = config.databaseUrl ? pgStore() : memoryStore();
  return singleton;
}
