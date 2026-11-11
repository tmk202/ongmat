import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const profile = process.env.CHROME_PROFILE_DIR || join(fileURLToPath(new URL('..', import.meta.url)), '.chrome-tiktok');
const target = process.argv[2] || 'https://shop.tiktok.com/vn/pdp/1733711228014855277';
const timeoutMs = Number(process.env.RECOVER_TIMEOUT_MS || 900000);

const context = await chromium.launchPersistentContext(profile, {
  channel: 'chrome',
  headless: false,
  locale: 'vi-VN',
  timezoneId: 'Asia/Ho_Chi_Minh',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  ignoreDefaultArgs: ['--enable-automation'],
  args: ['--disable-blink-features=AutomationControlled', '--no-first-run', '--no-default-browser-check'],
});
const page = context.pages()[0] || (await context.newPage());
await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
console.log(JSON.stringify({ waiting: true, target, timeout_s: Math.round(timeoutMs / 1000) }));

const check = () => page.evaluate(() => new Promise((resolve) => {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', '/vn/pdp/1733711228014855277', true);
  xhr.withCredentials = true;
  xhr.timeout = 15000;
  xhr.setRequestHeader('accept', 'text/html');
  xhr.onload = () => resolve({ status: xhr.status, len: xhr.responseText.length, challenge: /Security Check|Verify to continue/i.test(xhr.responseText) });
  xhr.onerror = () => resolve({ status: -1 });
  xhr.ontimeout = () => resolve({ status: -2 });
  xhr.send();
}));

const deadline = Date.now() + timeoutMs;
let result = null;
while (Date.now() < deadline) {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  result = await check();
  if (result && result.status === 200 && !result.challenge) break;
}
console.log(JSON.stringify({ ok: Boolean(result && result.status === 200 && !result.challenge), result }));
await context.close();
