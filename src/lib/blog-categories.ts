export const BLOG_CATEGORIES = [
  { slug: 'web-scraping-data-extraction', label: 'Web Scraping & Data Extraction' },
  { slug: 'business-process-automation', label: 'Business Process Automation' },
  { slug: 'ai-agents-intelligent-workflows', label: 'AI Agents & Intelligent Workflows' },
  { slug: 'custom-apis-data-pipelines', label: 'Custom APIs & Data Pipelines' },
] as const;

export type BlogCategorySlug = (typeof BLOG_CATEGORIES)[number]['slug'];

export function categoryLabel(slug: string): string {
  return BLOG_CATEGORIES.find((category) => category.slug === slug)?.label ?? slug;
}
