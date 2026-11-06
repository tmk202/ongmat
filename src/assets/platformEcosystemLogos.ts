// Authentic Vector Brand Logos & Structured Configuration for the 21-Node Multi-Platform Ecosystem
// Used by the Left-Side Platform Sources visualization in RefineryCanvasEngine

export type PlatformClusterId = 'ecommerce' | 'marketplaces' | 'social' | 'marketing';

export interface PlatformNodeConfig {
  id: string;
  name: string;
  cluster: PlatformClusterId;
  tier: 1 | 2 | 3; // 1 = primary (22px), 2 = secondary (17px), 3 = tertiary (14px)
  color: string;
  rx: number; // Normalized X (0.05 .. 0.30, left 35-40% of canvas)
  ry: number; // Normalized Y (0.08 .. 0.92)
  phaseOffset: number;
}

export interface ClusterMeta {
  id: PlatformClusterId;
  label: string;
  hubRx: number;
  hubRy: number;
  labelRx: number;
  labelRy: number;
  tint: string;
}

export const CLUSTER_META: Record<PlatformClusterId, ClusterMeta> = {
  ecommerce: {
    id: 'ecommerce',
    label: 'E-COMMERCE',
    hubRx: 0.37,
    hubRy: 0.2,
    labelRx: 0.05,
    labelRy: 0.055,
    tint: 'rgba(17, 41, 226, 0.20)',
  },
  marketplaces: {
    id: 'marketplaces',
    label: 'MARKETPLACES',
    hubRx: 0.385,
    hubRy: 0.435,
    labelRx: 0.05,
    labelRy: 0.295,
    tint: 'rgba(99, 102, 241, 0.22)',
  },
  social: {
    id: 'social',
    label: 'SOCIAL COMMERCE',
    hubRx: 0.38,
    hubRy: 0.635,
    labelRx: 0.05,
    labelRy: 0.6,
    tint: 'rgba(59, 130, 246, 0.20)',
  },
  marketing: {
    id: 'marketing',
    label: 'MARKETING & CRM',
    hubRx: 0.37,
    hubRy: 0.825,
    labelRx: 0.05,
    labelRy: 0.74,
    tint: 'rgba(124, 58, 237, 0.20)',
  },
};

export const PLATFORM_ECOSYSTEM_CONFIG: PlatformNodeConfig[] = [
  // Cluster 1: E-Commerce Storefronts
  {
    id: 'shopify',
    name: 'Shopify',
    cluster: 'ecommerce',
    tier: 1,
    color: '#95BF47',
    rx: 0.275,
    ry: 0.17,
    phaseOffset: 0.1,
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    cluster: 'ecommerce',
    tier: 2,
    color: '#96588A',
    rx: 0.165,
    ry: 0.12,
    phaseOffset: 0.8,
  },
  {
    id: 'magento',
    name: 'Magento',
    cluster: 'ecommerce',
    tier: 2,
    color: '#F26322',
    rx: 0.075,
    ry: 0.2,
    phaseOffset: 1.5,
  },
  {
    id: 'bigcommerce',
    name: 'BigCommerce',
    cluster: 'ecommerce',
    tier: 3,
    color: '#121118',
    rx: 0.18,
    ry: 0.235,
    phaseOffset: 2.2,
  },
  {
    id: 'prestashop',
    name: 'PrestaShop',
    cluster: 'ecommerce',
    tier: 3,
    color: '#DF0067',
    rx: 0.085,
    ry: 0.095,
    phaseOffset: 2.9,
  },

  // Cluster 2: Global & Regional Marketplaces
  {
    id: 'amazon',
    name: 'Amazon',
    cluster: 'marketplaces',
    tier: 1,
    color: '#FF9900',
    rx: 0.29,
    ry: 0.365,
    phaseOffset: 0.4,
  },
  {
    id: 'shopee',
    name: 'Shopee',
    cluster: 'marketplaces',
    tier: 1,
    color: '#EE4D2D',
    rx: 0.23,
    ry: 0.47,
    phaseOffset: 1.1,
  },
  {
    id: 'lazada',
    name: 'Lazada',
    cluster: 'marketplaces',
    tier: 2,
    color: '#0F146D',
    rx: 0.16,
    ry: 0.35,
    phaseOffset: 1.9,
  },
  {
    id: 'ebay',
    name: 'eBay',
    cluster: 'marketplaces',
    tier: 2,
    color: '#E53238',
    rx: 0.135,
    ry: 0.49,
    phaseOffset: 2.6,
  },
  {
    id: 'etsy',
    name: 'Etsy',
    cluster: 'marketplaces',
    tier: 2,
    color: '#F1641E',
    rx: 0.065,
    ry: 0.44,
    phaseOffset: 3.3,
  },
  {
    id: 'walmart',
    name: 'Walmart',
    cluster: 'marketplaces',
    tier: 3,
    color: '#0071CE',
    rx: 0.08,
    ry: 0.335,
    phaseOffset: 4.0,
  },
  {
    id: 'aliexpress',
    name: 'AliExpress',
    cluster: 'marketplaces',
    tier: 3,
    color: '#E62E04',
    rx: 0.075,
    ry: 0.555,
    phaseOffset: 4.7,
  },

  // Cluster 3: Social Commerce
  {
    id: 'tiktok',
    name: 'TikTok Shop',
    cluster: 'social',
    tier: 1,
    color: '#111827',
    rx: 0.285,
    ry: 0.625,
    phaseOffset: 0.6,
  },
  {
    id: 'metashops',
    name: 'Meta Shops',
    cluster: 'social',
    tier: 2,
    color: '#0668E1',
    rx: 0.18,
    ry: 0.645,
    phaseOffset: 1.7,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    cluster: 'social',
    tier: 3,
    color: '#E1306C',
    rx: 0.095,
    ry: 0.68,
    phaseOffset: 2.8,
  },

  // Cluster 4: Marketing, CRM & Payments
  {
    id: 'stripe',
    name: 'Stripe',
    cluster: 'marketing',
    tier: 1,
    color: '#635BFF',
    rx: 0.275,
    ry: 0.815,
    phaseOffset: 0.3,
  },
  {
    id: 'googleads',
    name: 'Google Ads',
    cluster: 'marketing',
    tier: 2,
    color: '#4285F4',
    rx: 0.19,
    ry: 0.77,
    phaseOffset: 1.2,
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    cluster: 'marketing',
    tier: 2,
    color: '#00A1E0',
    rx: 0.155,
    ry: 0.89,
    phaseOffset: 2.1,
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    cluster: 'marketing',
    tier: 2,
    color: '#FF7A59',
    rx: 0.095,
    ry: 0.805,
    phaseOffset: 3.0,
  },
  {
    id: 'analytics',
    name: 'Google Analytics',
    cluster: 'marketing',
    tier: 3,
    color: '#F9AB00',
    rx: 0.065,
    ry: 0.905,
    phaseOffset: 3.9,
  },
  {
    id: 'klaviyo',
    name: 'Klaviyo',
    cluster: 'marketing',
    tier: 3,
    color: '#182026',
    rx: 0.245,
    ry: 0.925,
    phaseOffset: 4.8,
  },
];

function svgToDataUrl(svg: string): string {
  const withDims = svg
    .trim()
    .replace('<svg xmlns="http://www.w3.org/2000/svg"', '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(withDims)}`;
}

export function buildPlatformLogoMap(): Map<string, HTMLImageElement> {
  const svgs: Record<string, string> = {
    shopify: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <path d="M22 18 C22 10 42 10 42 18" fill="none" stroke="#5E8E3E" stroke-width="3.8" stroke-linecap="round"/>
      <path d="M16 18 L48 15 L52 52 L12 50 Z" fill="#95BF47"/>
      <path d="M48 15 L54 19 L56 49 L52 52 Z" fill="#5E8E3E"/>
      <path d="M35 26 C33 23 25 23 25 28 C25 34 37 32 36 40 C35 45 26 45 23 41" fill="none" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round"/>
    </svg>`,

    woocommerce: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect x="6" y="14" width="52" height="34" rx="14" fill="#96588A"/>
      <polygon points="22,47 30,47 26,55" fill="#96588A"/>
      <path d="M14 25 L18 37 L22 28 L26 37 L30 25" fill="none" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="38" cy="32" r="4.5" fill="none" stroke="#FFFFFF" stroke-width="3"/>
      <circle cx="49" cy="32" r="4.5" fill="none" stroke="#FFFFFF" stroke-width="3"/>
    </svg>`,

    magento: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <polygon points="32,8 52,20 52,44 44,49 44,25 32,17 20,25 20,49 12,44 12,20" fill="#F26322"/>
      <polygon points="32,23 38,27 38,52 32,56 26,52 26,27" fill="#D94E14"/>
    </svg>`,

    bigcommerce: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <polygon points="10,48 50,12 50,48" fill="#121118"/>
      <path d="M24 30 H36 C39 30 41 32 41 34.5 C41 37 39 38.5 36 38.5 H24 Z M24 38.5 H37 C40 38.5 42 40.5 42 43 C42 45.5 40 47.5 37 47.5 H24 Z" fill="#FFFFFF"/>
    </svg>`,

    prestashop: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <path d="M18 14 H36 C45 14 50 19 50 27.5 C50 36 45 41 36 41 H27 V52 H18 Z" fill="#DF0067"/>
      <circle cx="34.5" cy="27.5" r="5" fill="#FFFFFF"/>
      <path d="M18 41 L27 41 L27 52 Z" fill="#A8004D"/>
    </svg>`,

    amazon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <path d="M21 24 C22 17 28 14 35 14 C43 14 47 18 47 26 V37 C47 40 48 42 49 43 H41 C40 42 39.5 40 39.5 38 C36.5 42 32 43.5 27 43.5 C20 43.5 16 39 16 34 C16 27.5 21.5 24.5 31 23.5 L39 22.5 V21 C39 18 36.5 16.5 33 16.5 C29.5 16.5 27.5 18 26.5 21 Z M39 27.5 L32 28.5 C26.5 29.2 24 31 24 33.8 C24 36.5 26.2 38 29.5 38 C34.5 38 39 34.5 39 29.5 Z" fill="#111827"/>
      <path d="M14 48 Q32 58 50 46" fill="none" stroke="#FF9900" stroke-width="4.2" stroke-linecap="round"/>
      <path d="M43 44 L52 45 L48 53" fill="none" stroke="#FF9900" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

    shopee: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <path d="M23 19 A9 9 0 0 1 41 19" fill="none" stroke="#EE4D2D" stroke-width="3.8" stroke-linecap="round"/>
      <rect x="13" y="19" width="38" height="35" rx="7" fill="#EE4D2D"/>
      <path d="M38 28 C36 24 25 24 25 30 C25 36 39 34 39 41 C39 47 26 47 24 42" fill="none" stroke="#FFFFFF" stroke-width="4.2" stroke-linecap="round"/>
    </svg>`,

    lazada: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <polygon points="32,24 14,14 8,24 8,42 32,56 56,42 56,24 50,14" fill="#0F146D"/>
      <polygon points="32,24 14,14 8,24 32,38" fill="#FF6600"/>
      <polygon points="32,24 50,14 56,24 32,38" fill="#F5227F"/>
    </svg>`,

    ebay: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <circle cx="16" cy="34" r="8" fill="#E53238"/>
      <rect x="23" y="21" width="7" height="21" rx="2" fill="#0064D2"/>
      <circle cx="30" cy="34" r="7" fill="#0064D2"/>
      <circle cx="41" cy="34" r="7.5" fill="#F5AF02"/>
      <path d="M47 27 L52 39 L57 27 M52 39 L49 46" fill="none" stroke="#86B817" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

    etsy: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <path d="M16 14 H48 V24 H42 L40.5 19.5 H26.5 V29.5 H39.5 V35 H26.5 V44.5 H41 L42.5 39 H48.5 L47 50 H16 V44.5 L20.5 44.5 V19.5 L16 19.5 Z" fill="#F1641E"/>
    </svg>`,

    walmart: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <g stroke="#FFC220" stroke-width="6.5" stroke-linecap="round">
        <line x1="32" y1="9" x2="32" y2="21"/>
        <line x1="32" y1="43" x2="32" y2="55"/>
        <line x1="12.5" y1="20.5" x2="22.5" y2="26.5"/>
        <line x1="41.5" y1="37.5" x2="51.5" y2="43.5"/>
        <line x1="12.5" y1="43.5" x2="22.5" y2="37.5"/>
        <line x1="41.5" y1="26.5" x2="51.5" y2="20.5"/>
      </g>
    </svg>`,

    aliexpress: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect x="12" y="16" width="40" height="36" rx="9" fill="#E62E04"/>
      <path d="M22 27 A10 10 0 0 0 42 27" fill="none" stroke="#FFD700" stroke-width="4.2" stroke-linecap="round"/>
      <circle cx="22" cy="26" r="2.8" fill="#FFFFFF"/>
      <circle cx="42" cy="26" r="2.8" fill="#FFFFFF"/>
    </svg>`,

    tiktok: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <path d="M35 42 A10 10 0 1 1 25 32 M35 42 V14 Q36 25 49 26" fill="none" stroke="#25F4EE" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" transform="translate(-2.5,-2)"/>
      <path d="M35 42 A10 10 0 1 1 25 32 M35 42 V14 Q36 25 49 26" fill="none" stroke="#FE2C55" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" transform="translate(2.5,2)"/>
      <path d="M35 42 A10 10 0 1 1 25 32 M35 42 V14 Q36 25 49 26" fill="none" stroke="#111827" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

    metashops: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <path d="M19 41 C12 41 10 34 14 27 C18 20 24 21 32 32 C40 43 46 41 50 35 C54 29 51 22 45 22 C39 22 35 27 32 32 C29 37 25 41 19 41 Z" fill="none" stroke="#0668E1" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

    instagram: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="ig" x1="10" y1="54" x2="54" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#FD5949"/>
          <stop offset="50%" stop-color="#D6249F"/>
          <stop offset="100%" stop-color="#285AEB"/>
        </linearGradient>
      </defs>
      <rect x="12" y="12" width="40" height="40" rx="12" fill="none" stroke="url(#ig)" stroke-width="5"/>
      <circle cx="32" cy="32" r="9.5" fill="none" stroke="url(#ig)" stroke-width="4.5"/>
      <circle cx="43.5" cy="20.5" r="3" fill="#D6249F"/>
    </svg>`,

    stripe: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <path d="M44 21 C39 17.5 22 17 22 25.5 C22 34.5 46 30.5 46 42.5 C46 51.5 27 52 19 47.5" fill="none" stroke="#635BFF" stroke-width="8.5" stroke-linecap="round"/>
    </svg>`,

    googleads: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <line x1="28" y1="14" x2="14" y2="46" stroke="#FBBC04" stroke-width="11" stroke-linecap="round"/>
      <line x1="34" y1="14" x2="48" y2="46" stroke="#4285F4" stroke-width="11" stroke-linecap="round"/>
      <circle cx="16" cy="46" r="5.5" fill="#34A853"/>
    </svg>`,

    salesforce: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <path d="M20 44 H45 A10 10 0 0 0 47 25 A13 13 0 0 0 23 21 A11 11 0 0 0 20 44 Z" fill="#00A1E0"/>
    </svg>`,

    hubspot: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <circle cx="33" cy="34" r="9.5" fill="none" stroke="#FF7A59" stroke-width="5"/>
      <line x1="33" y1="24" x2="33" y2="14" stroke="#FF7A59" stroke-width="4.5" stroke-linecap="round"/>
      <line x1="41" y1="39" x2="50" y2="45" stroke="#FF7A59" stroke-width="4.5" stroke-linecap="round"/>
      <line x1="24" y1="38" x2="15" y2="44" stroke="#FF7A59" stroke-width="4.5" stroke-linecap="round"/>
      <circle cx="33" cy="13" r="4.5" fill="#FF7A59"/>
      <circle cx="51" cy="46" r="4.5" fill="#FF7A59"/>
      <circle cx="14" cy="45" r="4.5" fill="#FF7A59"/>
    </svg>`,

    analytics: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect x="14" y="36" width="9" height="16" rx="4.5" fill="#F9AB00"/>
      <rect x="27.5" y="25" width="9" height="27" rx="4.5" fill="#F9AB00"/>
      <rect x="41" y="13" width="9" height="39" rx="4.5" fill="#E37400"/>
    </svg>`,

    klaviyo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <polygon points="10,16 54,16 43,32 54,48 10,48" fill="#182026"/>
      <polygon points="16,22 44,22 37,32 44,42 16,42" fill="#25D366"/>
    </svg>`,
  };

  const map = new Map<string, HTMLImageElement>();
  for (const [id, rawSvg] of Object.entries(svgs)) {
    const img = new Image();
    img.src = svgToDataUrl(rawSvg);
    map.set(id, img);
  }
  return map;
}
