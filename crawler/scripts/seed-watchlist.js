import { readFile } from 'node:fs/promises';
import { addWatchlistItems, createWatchlist, listWatchlists } from '../packages/watchlists.js';

const args = Object.fromEntries(
  process.argv.slice(2).map((entry) => {
    const [key, ...rest] = entry.replace(/^--/, '').split('=');
    return [key, rest.join('=')];
  })
);
const file = args.file;
const name = args.name || 'tiktok-seed';
if (!file) {
  console.error('usage: node scripts/seed-watchlist.js --file=seeds/tiktok-vn-1000.json --name=tiktok-vn-1000-daily');
  process.exit(1);
}
const data = JSON.parse(await readFile(file, 'utf8'));
const items = (data.products || []).map((product) => ({
  item_id: product.item_id,
  shop_id: product.shop_id,
  market: data.market || 'VN',
}));
const existing = (await listWatchlists()).find((watchlist) => watchlist.name === name);
const watchlist = existing || (await createWatchlist({ name, schedule: 'daily' }));
const added = await addWatchlistItems(watchlist.id, items);
console.log(JSON.stringify({ ok: true, watchlist_id: watchlist.id, name, submitted: items.length, added }));
