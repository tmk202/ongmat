// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

/**
 * Astro 7 Configuration for https://ecommarketdata.com
 * - Static HTML output by default (0 JS baseline for Core Web Vitals)
 * - Deployed on Cloudflare Workers via @astrojs/cloudflare + Wrangler
 * - Automatic sitemap-index.xml & sitemap-0.xml generation via @astrojs/sitemap
 */
export default defineConfig({
  site: 'https://ecommarketdata.com',
  output: 'static',
  adapter: cloudflare({
    imageService: 'compile',
    platformProxy: {
      enabled: true,
    },
  }),
  integrations: [
    sitemap({
      changefreq: 'daily',
      priority: 0.9,
      lastmod: new Date('2026-11-05T00:00:00.000Z'),
    }),
  ],
  build: {
    inlineStylesheets: 'auto',
  },
});
