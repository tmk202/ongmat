import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('ecommarketdata'),
    image: z.string().optional(),
    category: z.enum([
      'web-scraping-data-extraction',
      'business-process-automation',
      'ai-agents-intelligent-workflows',
      'custom-apis-data-pipelines',
    ]),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { blog };
