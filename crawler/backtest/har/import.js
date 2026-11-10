import { readFile, writeFile } from 'node:fs/promises';

export function sanitizeEntries(har) {
  const entries = (har?.log?.entries || []).filter((entry) => /tiktok/i.test(entry.request?.url || ''));
  return entries.map((entry) => {
    let body = entry.response?.content?.text || '';
    if (entry.response?.content?.encoding === 'base64') {
      body = Buffer.from(body, 'base64').toString('utf8');
    }
    return {
      method: entry.request.method,
      url: entry.request.url,
      status: entry.response.status,
      mime_type: entry.response.content?.mimeType || 'application/json',
      request_body: entry.request.postData?.text || null,
      response_body: body,
      started_at: entry.startedDateTime,
    };
  });
}

export async function importHar(inputPath, outputPath) {
  const har = JSON.parse(await readFile(inputPath, 'utf8'));
  const entries = sanitizeEntries(har);
  await writeFile(outputPath, JSON.stringify({ source: inputPath, imported_at: new Date().toISOString(), entries }, null, 2));
  return { entries: entries.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error('usage: node backtest/har/import.js capture.har fixtures/tiktok/capture.json');
    process.exit(1);
  }
  const result = await importHar(input, output);
  console.log(JSON.stringify({ ok: true, ...result, output }));
}
