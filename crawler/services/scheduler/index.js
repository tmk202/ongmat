import { log } from '../../packages/config.js';
import { dueWatchlists, listWatchlistItems, markWatchlistRun } from '../../packages/watchlists.js';
import { enqueueJob } from '../../packages/jobs.js';

const HOUR = Number(process.env.WATCHLIST_HOUR || 1);
const RUN_ON_START = process.env.WATCHLIST_RUN_ON_START === '1';

let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    const now = new Date();
    const due = await dueWatchlists();
    for (const watchlist of due) {
      const items = await listWatchlistItems(watchlist.id);
      if (!items.length) {
        log('warn', 'watchlist empty', { watchlist: watchlist.id });
        continue;
      }
      const job = await enqueueJob({ name: `watchlist:${watchlist.name}`, items });
      await markWatchlistRun(watchlist.id);
      log('info', 'watchlist queued', { watchlist: watchlist.id, job_id: job.id, items: items.length, hour: now.getUTCHours() });
    }
  } catch (error) {
    log('error', 'scheduler tick failed', { error: String(error) });
  } finally {
    running = false;
  }
}

async function loop() {
  if (RUN_ON_START) await tick();
  while (true) {
    const now = new Date();
    const wait = 60000 - (now.getUTCSeconds() * 1000 + now.getUTCMilliseconds());
    await new Promise((resolve) => setTimeout(resolve, Math.max(1000, wait)));
    if (new Date().getUTCHours() === HOUR) await tick();
  }
}

log('info', 'scheduler started', { hourUtc: HOUR, runOnStart: RUN_ON_START });
loop().catch((error) => {
  log('error', 'scheduler crashed', { error: String(error) });
  process.exit(1);
});
