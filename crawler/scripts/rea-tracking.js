import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const profile = process.env.CHROME_PROFILE_DIR || '/tmp/tiktok-track-profile';
const outDir = 'data/rea/tracking';
await mkdir(outDir, { recursive: true });

const hosts = ['mon.tiktokv.com', 'mon-va.byteoversea.com', 'mssdk-sg.tiktok.com', 'sgali-mcs.byteoversea.com', 'mcs-sg.tiktokv.com', 'libraweb-sg.tiktok.com', 'api-verification.tiktokshop.com', 'analytics.tiktok.com', 'business-api.tiktok.com'];

const context = await chromium.launchPersistentContext(profile, {
  channel: 'chrome',
  headless: true,
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
const captured = [];
let index = 0;
page.on('request', (request) => {
  const url = request.url();
  if (!hosts.some((host) => url.includes(host))) return;
  index += 1;
  captured.push({ id: index, method: request.method(), url, postData: request.postData() || null });
});
await page.goto('https://shop.tiktok.com/vn', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
await page.waitForTimeout(4000);
for (let i = 0; i < 3; i += 1) { await page.mouse.wheel(0, 1200).catch(() => {}); await page.waitForTimeout(1200); }
await page.goto('https://shop.tiktok.com/vn/s?q=serum', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
await page.waitForTimeout(4000);

for (const item of captured) {
  if (!item.postData) continue;
  const file = join(outDir, `${String(item.id).padStart(3, '0')}.txt`);
  await writeFile(file, item.postData);
  item.file = file;
  item.bytes = item.postData.length;
}
await writeFile('data/rea/tracking.json', JSON.stringify(captured, null, 1));
console.log(JSON.stringify({ captured: captured.length, endpoints: [...new Set(captured.map((item) => item.url.split('?')[0]))] }, null, 1));
await context.close();
