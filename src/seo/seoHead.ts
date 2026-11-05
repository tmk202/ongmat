import { ALL_PLATFORM_DATASETS } from '../data/ecomCabinetData';
import type { CuriosityArtifact, NavSectionContent } from '../data/ecomCabinetData';

export const SITE_ORIGIN = 'https://ecommarketdata.com';
export const DEFAULT_TITLE =
  'ecommarketdata — Global E-Commerce Market Intelligence & SKU Telemetry';
export const DEFAULT_DESCRIPTION =
  'Deep e-commerce market intelligence across 14.2B SKUs on Shopee, Amazon, TikTok Shop, Lazada, and Etsy. Explore verified GMV, Buy-Box, and conversion datasets.';

function setMetaTag(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonicalLink(url: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

export function buildHomeJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_ORIGIN}/#organization`,
        name: 'ecommarketdata',
        url: `${SITE_ORIGIN}/`,
        description: DEFAULT_DESCRIPTION,
        sameAs: [
          'https://ecommarketdata.com',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_ORIGIN}/#website`,
        url: `${SITE_ORIGIN}/`,
        name: 'ecommarketdata — The Curiosity Cabinet',
        publisher: { '@id': `${SITE_ORIGIN}/#organization` },
        inLanguage: 'en-US',
      },
      {
        '@type': 'DataCatalog',
        '@id': `${SITE_ORIGIN}/#datacatalog`,
        name: 'ecommarketdata Global Marketplace Telemetry Catalog',
        url: `${SITE_ORIGIN}/`,
        description: DEFAULT_DESCRIPTION,
        creator: { '@id': `${SITE_ORIGIN}/#organization` },
        dataset: ALL_PLATFORM_DATASETS.map((art) => ({
          '@type': 'Dataset',
          '@id': `${SITE_ORIGIN}/data/${art.slug}#dataset`,
          name: art.title,
          description: art.seoDescription,
          url: `${SITE_ORIGIN}/data/${art.slug}`,
          keywords: art.keywords,
          temporalCoverage: art.temporalCoverage,
          dateModified: art.lastModified,
          isAccessibleForFree: true,
          creator: { '@id': `${SITE_ORIGIN}/#organization` },
          distribution: {
            '@type': 'DataDownload',
            encodingFormat: 'text/csv',
            contentUrl: `${SITE_ORIGIN}/data/${art.slug}/${art.sampleCsvFilename}`,
          },
        })),
      },
    ],
  };
}

export function buildDatasetJsonLd(artifact: CuriosityArtifact) {
  const canonicalUrl = `${SITE_ORIGIN}/data/${artifact.slug}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_ORIGIN}/#organization`,
        name: 'ecommarketdata',
        url: `${SITE_ORIGIN}/`,
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'ecommarketdata',
            item: `${SITE_ORIGIN}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Datasets',
            item: `${SITE_ORIGIN}/data/${artifact.slug}`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: artifact.platformName,
            item: canonicalUrl,
          },
        ],
      },
      {
        '@type': 'Dataset',
        '@id': `${canonicalUrl}#dataset`,
        name: artifact.title,
        alternateName: artifact.catalogCode,
        description: artifact.seoDescription,
        url: canonicalUrl,
        keywords: artifact.keywords,
        temporalCoverage: artifact.temporalCoverage,
        dateModified: artifact.lastModified,
        isAccessibleForFree: true,
        creator: { '@id': `${SITE_ORIGIN}/#organization` },
        includedInDataCatalog: {
          '@type': 'DataCatalog',
          name: 'ecommarketdata Global Marketplace Telemetry Catalog',
          url: `${SITE_ORIGIN}/`,
        },
        distribution: [
          {
            '@type': 'DataDownload',
            encodingFormat: 'text/csv',
            contentUrl: `${canonicalUrl}/${artifact.sampleCsvFilename}`,
          },
          {
            '@type': 'DataDownload',
            encodingFormat: 'application/json',
            contentUrl: `${SITE_ORIGIN}/src/data/${artifact.slug}.json`,
          },
        ],
        variableMeasured: artifact.metrics.map((m) => ({
          '@type': 'PropertyValue',
          name: m.label,
          value: m.value,
          description: m.delta,
        })),
      },
    ],
  };
}

export function syncSeoHead(opts: {
  artifact?: CuriosityArtifact | null;
  section?: NavSectionContent | null;
}) {
  let title = DEFAULT_TITLE;
  let description = DEFAULT_DESCRIPTION;
  let canonicalUrl = `${SITE_ORIGIN}/`;
  let ogType = 'website';
  let jsonLdPayload: Record<string, unknown> = buildHomeJsonLd();

  if (opts.artifact) {
    title = opts.artifact.seoTitle;
    description = opts.artifact.seoDescription;
    canonicalUrl = `${SITE_ORIGIN}/data/${opts.artifact.slug}`;
    ogType = 'article';
    jsonLdPayload = buildDatasetJsonLd(opts.artifact);
  } else if (opts.section) {
    title = `${opts.section.title} | ecommarketdata`;
    description = opts.section.description;
    canonicalUrl = `${SITE_ORIGIN}/${opts.section.id}`;
  }

  document.title = title;
  setCanonicalLink(canonicalUrl);
  setMetaTag('name', 'description', description);
  setMetaTag('property', 'og:type', ogType);
  setMetaTag('property', 'og:url', canonicalUrl);
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:site_name', 'ecommarketdata');
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', title);
  setMetaTag('name', 'twitter:description', description);

  let scriptEl = document.getElementById('seo-jsonld') as HTMLScriptElement | null;
  if (!scriptEl) {
    scriptEl = document.createElement('script');
    scriptEl.id = 'seo-jsonld';
    scriptEl.type = 'application/ld+json';
    document.head.appendChild(scriptEl);
  }
  scriptEl.textContent = JSON.stringify(jsonLdPayload);
}
