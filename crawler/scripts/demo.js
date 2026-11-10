import { config } from '../packages/config.js';
import { startApi } from '../services/api/index.js';
import { startWorker } from '../services/worker/index.js';

const app = await startApi({ port: 0, host: '127.0.0.1' });
startWorker();

const port = app.server.address().port;
const items = Array.from({ length: 500 }, (_, index) => ({
  item_id: 1000000 + index,
  shop_id: 5000 + (index % 50),
  market: 'VN',
}));

const created = await fetch(`http://127.0.0.1:${port}/v1/jobs`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${config.apiToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'demo 500 items', items }),
}).then((r) => r.json());

const jobId = created.job.id;
let job = created.job;
const started = Date.now();
while (job.status !== 'done' && Date.now() - started < 30000) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  job = await fetch(`http://127.0.0.1:${port}/v1/jobs/${jobId}`).then((r) => r.json()).then((d) => d.job);
}

const stats = await fetch(`http://127.0.0.1:${port}/v1/stats`).then((r) => r.json());
console.log(JSON.stringify({ job, stats: stats.stats }, null, 2));
await app.close();
process.exit(job.status === 'done' ? 0 : 1);
