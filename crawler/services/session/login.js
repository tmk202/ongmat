import { chromium } from 'playwright-core';

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
const mobile = platform === 'tiktok';
const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
let context;
try {
  context = await chromium.launchPersistentContext(profileDir, {
    channel: process.env.CHROME_CHANNEL || 'chrome',
    headless: false,
    proxy,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    ...(mobile
      ? { userAgent: mobileUA, viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
      : {}),
    ignoreDefaultArgs: ['--enable-automation'],
    args: ['--disable-blink-features=AutomationControlled', '--no-first-run', '--no-default-browser-check'],
  });
} catch (error) {
  console.error(`Không mở được Chrome profile ${profileDir}: ${String(error)}`);
  console.error('Đóng mọi cửa sổ Chrome đang dùng profile này rồi chạy lại.');
  process.exit(1);
}
const page = context.pages()[0] || (await context.newPage());
const startUrl = platform === 'tiktok'
  ? (process.env.TIKTOK_LOGIN_URL || 'https://www.tiktok.com/login')
  : (process.env.SHOPEE_BASE || 'https://shopee.vn');
await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});

const timeoutMs = Number(process.env.LOGIN_TIMEOUT_MS || 600000);
const deadline = Date.now() + timeoutMs;
let cookies = [];
let loggedIn = false;
while (Date.now() < deadline) {
  cookies = await context.cookies();
  loggedIn = platform === 'tiktok'
    ? cookies.some((c) => c.name === 'sessionid' || c.name === 'sid_tt')
    : cookies.some((c) => c.name === 'SPC_F' || c.name === 'SPC_U');
  if (loggedIn) break;
  await new Promise((resolve) => setTimeout(resolve, 3000));
}
if (!loggedIn) {
  console.error(`Không thấy cookie đăng nhập của ${platform} sau ${Math.round(timeoutMs / 1000)}s.`);
  await page.screenshot({ path: 'data/login-fail.png', fullPage: false }).catch(() => {});
  await context.close();
  process.exit(1);
}
const cookie = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
const userAgent = await page.evaluate(() => navigator.userAgent).catch(() => '');

const account = await upsertAccount({ label, market, platform, cookie, user_agent: userAgent, proxy_url: args.proxy || null });
console.log(JSON.stringify({ ok: true, account: { id: account.id, label: account.label, market: account.market, cookies: cookies.length }, profile: profileDir }));
await context.close();
