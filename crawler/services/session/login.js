import { chromium } from 'playwright-core';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { upsertAccount } from '../../packages/accounts.js';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

function parseProxy(value) {
  if (!value) return undefined;
  const url = new URL(value);
  const auth = url.username ? { username: decodeURIComponent(url.username), password: decodeURIComponent(url.password) } : {};
  return { server: `${url.protocol}//${url.host}`, ...auth };
}

const args = Object.fromEntries(
  process.argv.slice(2).map((entry) => {
    const [key, ...rest] = entry.replace(/^--/, '').split('=');
    return [key, rest.join('=')];
  })
);

const label = args.label;
const market = (args.market || 'VN').toUpperCase();
const platform = (args.platform || 'shopee').toLowerCase();
if (!label) {
  console.error('usage: node services/session/login.js --label=tiktok-vn-01 --platform=tiktok [--proxy=http://user:pass@host:port]');
  process.exit(1);
}

const proxy = parseProxy(args.proxy);
const profileDir = args.profileDir || process.env.CHROME_PROFILE_DIR || join(fileURLToPath(new URL('../..', import.meta.url)), '.chrome-tiktok');
const context = await chromium.launchPersistentContext(profileDir, {
  channel: process.env.CHROME_CHANNEL || 'chrome',
  headless: false,
  proxy,
  locale: 'vi-VN',
});
const page = context.pages()[0] || (await context.newPage());
const startUrl = platform === 'tiktok'
  ? (process.env.TIKTOK_BASE || 'https://shop.tiktok.com') + '/vn'
  : (process.env.SHOPEE_BASE || 'https://shopee.vn');
await page.goto(startUrl, { waitUntil: 'domcontentloaded' });

const rl = readline.createInterface({ input, output });
await rl.question(`Đăng nhập ${platform} trên cửa sổ vừa mở (giải captcha nếu có), xong rồi nhấn Enter...`);
rl.close();

const cookies = await context.cookies();
const cookie = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
const userAgent = await page.evaluate(() => navigator.userAgent);
const loggedIn = platform === 'tiktok'
  ? cookies.some((c) => c.name === 'sessionid' || c.name === 'sid_tt')
  : cookie.includes('SPC_F') || cookie.includes('SPC_U');
if (!loggedIn) {
  console.error(`Không thấy cookie đăng nhập của ${platform}. Kiểm tra lại.`);
  await context.close();
  process.exit(1);
}

const account = await upsertAccount({ label, market, platform, cookie, user_agent: userAgent, proxy_url: args.proxy || null });
console.log(JSON.stringify({ ok: true, account: { id: account.id, label: account.label, market: account.market, cookies: cookies.length }, profile: profileDir }));
await context.close();
