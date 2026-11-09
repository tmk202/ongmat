import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { processLeadSubmission } from './src/server/leadHandler.js';

const SITE = 'https://ecommarketdata.com';

function leadApiDevPlugin() {
  return {
    name: 'ecommarketdata-lead-api-dev',
    configureServer(server) {
      server.middlewares.use('/api/lead', (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }
        let rawBody = '';
        req.on('data', (chunk) => {
          rawBody += chunk;
        });
        req.on('end', async () => {
          try {
            const payload = JSON.parse(rawBody || '{}');
            const result = await processLeadSubmission(payload, process.env);
            res.statusCode = result.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result.body));
          } catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Invalid JSON payload' }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  site: SITE,
  integrations: [sitemap()],
  server: {
    port: 3000,
    host: true,
  },
  vite: {
    plugins: [leadApiDevPlugin()],
    server: {
      allowedHosts: true,
    },
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
