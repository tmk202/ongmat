import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const SITE = 'https://ecommarketdata.com';

export default defineConfig({
  site: SITE,
  integrations: [sitemap()],
  server: {
    port: 3000,
    host: true,
  },
  vite: {
    server: {
      allowedHosts: true,
    },
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
