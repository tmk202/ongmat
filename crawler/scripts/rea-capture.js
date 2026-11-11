import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const profile = process.env.CHROME_PROFILE_DIR || join(fileURLToPath(new URL('..', import.meta.url)), '.chrome-tiktok');
const outDir = 'data/rea/payloads';
await mkdir(outDir, { recursive: true });

const context = await chromium.launchPersistentContext(profile, {
  channel: process.env.CHROME_CHANNEL || 'chrome',
  headless: true,
  locale: 'vi-VN',
  timezoneId: 'Asia/Ho_Chi_Minh',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  ignoreDefaultArgs: ['--enable-automation'],
  args: ['--disable-blink-features=AutomationControlled'],
});

const requests = [];
const responses = [];
let counter = 0;

context.on('request', (request) => {
  const url = request.url();
  if (!url.includes('/api/shop/')) return;
  counter += 1;
  requests.push({ id: counter, method: request.method(), url, postData: request.postData() || null });
});

context.on('response', async (response) => {
  const url = response.url();
  if (!url.includes('/api/shop/')) return;
  const type = response.headers()['content-type'] || '';
  if (!type.includes('json')) return;
  try {
    const body = await response.text();
    const file = join(outDir, `${String(counter).padStart(3, '0')}-response.json`);
    await writeFile(file, body);
    responses.push({ url, status: response.status(), file, bytes: body.length });
  } catch {}
});

const page = context.pages()[0] || (await context.newPage());
for (const url of ['https://shop.tiktok.com/vn', 'https://shop.tiktok.com/vn/s?q=serum', 'https://shop.tiktok.com/vn/c/serums-essences/601619']) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
  for (let i = 0; i < 3; i += 1) {
    await page.mouse.wheel(0, 1500).catch(() => {});
    await page.waitForTimeout(1200);
  }
}

await writeFile('data/rea/requests.json', JSON.stringify(requests, null, 1));
await writeFile('data/rea/responses.json', JSON.stringify(responses, null, 1));
console.log(JSON.stringify({ requests: requests.length, responses: responses.length, urls: [...new Set(requests.map((r) => r.url.split('?')[0]))] }, null, 1));
await context.close();
