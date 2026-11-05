import shopeePodJson from './shopee-tiktok-gmv-pod.json';
import amazonTerminalJson from './amazon-shopify-buybox-terminal.json';
import tiktokVaultJson from './tiktok-shop-live-telemetry.json';
import etsyHubJson from './etsy-lazada-omni-hub.json';
import sectionsJson from './sections.json';

export interface CuriosityArtifact {
  id: 'mug' | 'ibook' | 'book' | 'tshirt';
  slug: string;
  platformName: string;
  title: string;
  subtitle: string;
  catalogCode: string;
  category: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  lastModified: string;
  temporalCoverage: string;
  rowCount: string;
  sampleCsvFilename: string;
  summary: string;
  metrics: {
    label: string;
    value: string;
    delta: string;
  }[];
  benchmarks: {
    platform: string;
    share: string;
    yoyGrowth: string;
    avgBasket: string;
    conversionRate: string;
  }[];
  insightNote: string;
}

export interface NavSectionItem {
  code: string;
  slug: string;
  name: string;
  category: string;
  metric: string;
  detail: string;
}

export interface NavSectionContent {
  id: 'archive' | 'oddities' | 'experiments' | 'drawer' | 'about' | 'contact';
  title: string;
  kicker: string;
  description: string;
  items: NavSectionItem[];
}

export const CURIOSITY_ARTIFACTS: Record<CuriosityArtifact['id'], CuriosityArtifact> = {
  mug: shopeePodJson as CuriosityArtifact,
  ibook: amazonTerminalJson as CuriosityArtifact,
  book: tiktokVaultJson as CuriosityArtifact,
  tshirt: etsyHubJson as CuriosityArtifact,
};

export const ALL_PLATFORM_DATASETS: CuriosityArtifact[] = [
  CURIOSITY_ARTIFACTS.mug,
  CURIOSITY_ARTIFACTS.ibook,
  CURIOSITY_ARTIFACTS.book,
  CURIOSITY_ARTIFACTS.tshirt,
];

export const NAV_SECTIONS: Record<NavSectionContent['id'], NavSectionContent> =
  sectionsJson as Record<NavSectionContent['id'], NavSectionContent>;

export function getArtifactBySlug(slug: string): CuriosityArtifact | null {
  const normalized = slug.trim().toLowerCase();
  for (const art of ALL_PLATFORM_DATASETS) {
    if (art.slug === normalized || art.id === normalized) {
      return art;
    }
  }
  return null;
}

export function getSectionByItemSlug(
  slug: string
): { section: NavSectionContent; item: NavSectionItem } | null {
  const normalized = slug.trim().toLowerCase();
  for (const sec of Object.values(NAV_SECTIONS)) {
    for (const item of sec.items) {
      if (item.slug === normalized) {
        return { section: sec, item };
      }
    }
  }
  return null;
}
