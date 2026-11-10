import { chromium } from 'playwright-core';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { upsertAccount } from '../../packages/accounts.js';

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
if (!label) {
  console.error('usage: node services/session/login.js --label=shopee-vn-01 [--proxy=http://user:pass@host:port]');
  process.exit(1);
}

const proxy = parseProxy(args.proxy);
const browser = await chromium.launch({
  channel: process.env.CHROME_CHANNEL || 'chrome',
  headless: false,
  proxy,
});
const context = await browser.newContext({ locale: 'vi-VN' });
const page = await context.newPage();
await page.goto(process.env.SHOPEE_BASE || 'https://shopee.vn', { waitUntil: 'domcontentloaded' });

const rl = readline.createInterface({ input, output });
await rl.question('Đăng nhập Shopee trên cửa sổ vừa mở, xong rồi nhấn Enter...');
rl.close();

const cookies = await context.cookies();
const cookie = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
const userAgent = await page.evaluate(() => navigator.userAgent);
if (!cookie.includes('SPC_F') && !cookie.includes('SPC_U')) {
  console.error('Không thấy cookie đăng nhập (SPC_F/SPC_U). Kiểm tra lại.');
  await browser.close();
  process.exit(1);
}

const account = await upsertAccount({ label, market, cookie, user_agent: userAgent, proxy_url: args.proxy || null });
console.log(JSON.stringify({ ok: true, account: { id: account.id, label: account.label, market: account.market, cookies: cookies.length } }));
await browser.close();
