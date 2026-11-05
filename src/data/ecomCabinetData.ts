export interface CuriosityArtifact {
  id: 'mug' | 'ibook' | 'book' | 'tshirt';
  title: string;
  subtitle: string;
  catalogCode: string;
  category: string;
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

export interface NavSectionContent {
  id: 'archive' | 'oddities' | 'experiments' | 'drawer' | 'about' | 'contact';
  title: string;
  kicker: string;
  description: string;
  items: {
    code: string;
    name: string;
    category: string;
    metric: string;
    detail: string;
  }[];
}

export const CURIOSITY_ARTIFACTS: Record<CuriosityArtifact['id'], CuriosityArtifact> = {
  mug: {
    id: 'mug',
    title: 'Shopee × TikTok Shop Dual-Core GMV Harvester Pod',
    subtitle: '11.11 / 12.12 Live-Stream Checkout & Flash-Sale Reactor',
    catalogCode: 'OBJ-01 · SHOPEE + TIKTOK SHOP POD',
    category: 'Hourly Checkout Surge & Live-Cart Conversion',
    summary:
      'CNC-machined dual-core collector pod housing custom Shopee & TikTok Shop telemetry sensors. Captures how top 1% hero SKUs ("Main Characters") command 64.8% of category GMV within the first 90 minutes of campaign launch.',
    metrics: [
      { label: 'Peak Checkout Surge', value: '+340.4%', delta: 'First 45 mins of 11.11' },
      { label: 'Hero SKU Concentration', value: '64.8%', delta: 'Top 20 SKUs per category' },
      { label: 'Voucher Redemption Lift', value: '2.84x', delta: 'Stacked platform + shop codes' },
    ],
    benchmarks: [
      { platform: 'Shopee Mall SEA', share: '46.2%', yoyGrowth: '+24.5%', avgBasket: '$26.80', conversionRate: '5.6%' },
      { platform: 'TikTok Shop Live', share: '31.4%', yoyGrowth: '+68.2%', avgBasket: '$18.40', conversionRate: '4.9%' },
      { platform: 'Lazada LazMall', share: '14.8%', yoyGrowth: '+11.2%', avgBasket: '$34.10', conversionRate: '3.8%' },
      { platform: 'Amazon Global D2C', share: '7.6%', yoyGrowth: '+19.4%', avgBasket: '$58.90', conversionRate: '6.4%' },
    ],
    insightNote:
      'Brands that pre-warm TikTok Shop & Shopee live-stream carts 4 hours before midnight cut paid CAC by 38% while doubling organic algorithm weight.',
  },
  ibook: {
    id: 'ibook',
    title: 'Amazon × Shopify 14.2B SKU Buy-Box Terminal',
    subtitle: 'Armored Clamshell Analyzer in Sapphire Borosilicate Enclosure',
    catalogCode: 'OBJ-02 · AMAZON + SHOPIFY TERMINAL',
    category: 'Automated Competitor Price, Buy-Box & Stock Tracking',
    summary:
      'Encased in a precision CNC-bolted sapphire glass sleeve, this armored terminal continuously ingests hourly Amazon Buy-Box shifts, Shopify D2C checkout velocity, and warehouse stock depletion across 14.2 billion listings.',
    metrics: [
      { label: 'Indexed Active SKUs', value: '14.2B', delta: 'Refreshed every 15 mins' },
      { label: 'Buy-Box Win Precision', value: '99.4%', delta: 'Verified against merchant ERP' },
      { label: 'Out-of-Stock Detection', value: '< 8 min', delta: 'Real-time SKU alert latency' },
    ],
    benchmarks: [
      { platform: 'Amazon FBA Global', share: '38.5%', yoyGrowth: '+19.8%', avgBasket: '$54.50', conversionRate: '6.4%' },
      { platform: 'Shopify Plus D2C', share: '24.1%', yoyGrowth: '+31.7%', avgBasket: '$82.00', conversionRate: '3.9%' },
      { platform: 'Shopee Official Mall', share: '21.8%', yoyGrowth: '+28.4%', avgBasket: '$27.20', conversionRate: '5.7%' },
      { platform: 'TikTok Shop Mall', share: '15.6%', yoyGrowth: '+64.3%', avgBasket: '$22.60', conversionRate: '5.2%' },
    ],
    insightNote:
      'Dynamic repricing within 12 minutes of an Amazon or Shopify competitor stock-out yields an average +19.4% net margin expansion without sacrificing Buy-Box rank.',
  },
  book: {
    id: 'book',
    title: 'Etsy × Lazada Index Vault & CNC Click-Wheel Pod',
    subtitle: 'Cross-Border Artisanal & Brand Mall Telemetry Ledger',
    catalogCode: 'OBJ-03 · ETSY + LAZADA VAULT',
    category: 'Longitudinal Cohort, Search Intent & Repeat Retention',
    summary:
      'Armored magenta-gold ledger vault paired with a machined aluminum click-wheel telemetry pod. Benchmarks high-margin bespoke Etsy categories alongside Lazada LazMall flagship store cohorts.',
    metrics: [
      { label: 'Cross-Border GMV Share', value: '42.6%', delta: '+1,420 bps YoY shift' },
      { label: '90-Day Repeat Purchase', value: '37.9%', delta: 'Curated & flagship SKUs' },
      { label: 'Creator Affiliate ROI', value: '5.4x', delta: 'Mid-tier 50k–250k creators' },
    ],
    benchmarks: [
      { platform: 'Etsy Global Marketplace', share: '29.0%', yoyGrowth: '+22.0%', avgBasket: '$48.30', conversionRate: '4.6%' },
      { platform: 'Lazada LazMall SEA', share: '27.5%', yoyGrowth: '+18.1%', avgBasket: '$36.80', conversionRate: '4.8%' },
      { platform: 'TikTok Shop Video Feed', share: '24.0%', yoyGrowth: '+69.4%', avgBasket: '$21.50', conversionRate: '5.1%' },
      { platform: 'Amazon Handmade & D2C', share: '19.5%', yoyGrowth: '+16.2%', avgBasket: '$59.20', conversionRate: '5.9%' },
    ],
    insightNote:
      'Merchants combining Etsy search-intent keywords with short-video product teardowns exhibit a 28% lower return rate than flash-voucher impulse buyers.',
  },
  tshirt: {
    id: 'tshirt',
    title: 'Multi-Platform E-Com Command Hub · (888) 799-2021',
    subtitle: 'Shopee · Amazon · TikTok Shop · Etsy Live Warehouse Sync',
    catalogCode: 'OBJ-04 · OMNI-CHANNEL COMMAND RIG',
    category: 'Custom Data Pipelines · Snowflake / BigQuery Firehose',
    summary:
      'Docked at the base of the cabinet with dual gold-plated telemetry antennas and custom Shopee, Amazon, TikTok Shop, and Etsy cores. Connect ecommarketdata directly to your BI warehouse or call (888) 799-2021.',
    metrics: [
      { label: 'Warehouse Sync Latency', value: 'Real-Time', delta: 'Snowflake · BigQuery · S3' },
      { label: 'Historical Backfill', value: '60 Months', delta: 'Granular daily SKU series' },
      { label: 'Enterprise SLA Uptime', value: '99.98%', delta: 'Dedicated data engineering' },
    ],
    benchmarks: [
      { platform: 'Shopee + Lazada Firehose', share: 'JSON / Parquet', yoyGrowth: '10M req/day', avgBasket: '< 45ms p95', conversionRate: '99.99%' },
      { platform: 'Amazon + Shopify Buy-Box', share: 'MAP & Sellers', yoyGrowth: '24/7 Crawl', avgBasket: 'Auto-Alert', conversionRate: '98.7%' },
      { platform: 'TikTok Shop Live Stream', share: 'Room Telemetry', yoyGrowth: 'Sub-Minute', avgBasket: 'GMV Curve', conversionRate: '99.5%' },
      { platform: 'Etsy + Global Niche Audit', share: 'Search Demand', yoyGrowth: 'NLP Reviews', avgBasket: 'SKU Specs', conversionRate: '96.4%' },
    ],
    insightNote:
      'Over 240 global consumer brands, private equity funds, and marketplace aggregators rely on ecommarketdata before launching new product lines.',
  },
};

export const NAV_SECTIONS: Record<NavSectionContent['id'], NavSectionContent> = {
  archive: {
    id: 'archive',
    title: 'The E-Commerce Market Archive',
    kicker: '14.2 BILLION SKUS · 2021–2026 HISTORICAL LEDGER',
    description:
      'Explore our longitudinal datasets across Southeast Asia, North America, and Europe. Every price change, bundle promotion, and verified buyer review is preserved.',
    items: [
      {
        code: 'ARC-01',
        name: 'SEA Mega-Campaign Ledger (9.9 to 12.12)',
        category: 'Shopee · TikTok Shop · Lazada',
        metric: '$48.6B GMV Tracked',
        detail: 'Minute-by-minute price discounting, voucher exhaustion curves, and top 10,000 brand rankings across 6 SEA markets.',
      },
      {
        code: 'ARC-02',
        name: 'Global D2C Beauty & Skincare Ingredient Index',
        category: 'Product Formulation & Pricing',
        metric: '1.8M Active Listings',
        detail: 'Correlates active ingredient claims (Niacinamide, Retinol, Peptides, Centella) with repeat velocity and review sentiment.',
      },
      {
        code: 'ARC-03',
        name: 'Cross-Border Shenzhen-to-Global Electronics Flow',
        category: 'Supply Chain & Margin Telemetry',
        metric: '640K Factory Stores',
        detail: 'Tracks FOB price spreads versus retail marketplace sell-through across audio, smart home, and mobile accessories.',
      },
      {
        code: 'ARC-04',
        name: 'Verified Buyer Review NLP Sentiment Corpus',
        category: 'Defect & Packaging Intelligence',
        metric: '920M Reviews Parsed',
        detail: 'Extracts product defect complaints, sizing friction, and packaging damage signals from 1-star to 5-star buyer photos.',
      },
    ],
  },
  oddities: {
    id: 'oddities',
    title: 'Market Oddities & Anomalies',
    kicker: 'OUTLIER SKUS · VIRAL SPIKES · ALGORITHMIC CURIOSITIES',
    description:
      'Strange, counter-intuitive e-commerce phenomena discovered by our anomaly detection spiders crawling midnight marketplace feeds.',
    items: [
      {
        code: 'ODD-01',
        name: 'The 03:00 AM Insomniac High-Ticket Cart Spike',
        category: 'Behavioral Economics',
        metric: '+62% Higher AOV',
        detail: 'Orders placed between 02:30 and 04:00 AM show a 62% higher average order value in luxury home fragrance and mechanical keyboards.',
      },
      {
        code: 'ODD-02',
        name: 'The Decoy Bundle Anchoring Effect',
        category: 'Pricing Psychology',
        metric: '3.4x Twin-Pack Shift',
        detail: 'Adding an overpriced 5-pack SKU with zero inventory causes 2-pack conversion rates to jump from 1.9% to 6.5%.',
      },
      {
        code: 'ODD-03',
        name: 'Ugly-Thumbnail Lo-Fi Video Outperformance',
        category: 'Creative Telemetry',
        metric: '+118% ROAS Lift',
        detail: 'Raw warehouse packing clips filmed on handheld phones outperform studio-lit 4K commercials across 19 of 24 Gen-Z categories.',
      },
    ],
  },
  experiments: {
    id: 'experiments',
    title: 'Data Lab & Predictive Experiments',
    kicker: 'ELASTICITY SIMULATIONS · AI DEMAND FORECASTING',
    description:
      'Live algorithmic models testing price sensitivity, thumbnail eye-tracking, and creator-to-SKU affinity graphs.',
    items: [
      {
        code: 'EXP-01',
        name: 'Sub-Hour Dynamic Coupon Decay Model',
        category: 'Reinforcement Pricing',
        metric: '+14.8% Net Contribution',
        detail: 'Automatically tapers voucher subsidy as organic livestream viewer concurrency crosses 2,500 simultaneous shoppers.',
      },
      {
        code: 'EXP-02',
        name: 'Visual Hero-Image Contrast & CTR Predictor',
        category: 'Computer Vision',
        metric: '0.89 R² Correlation',
        detail: 'Predicts search-grid click-through rate before launch by scoring badge placement, saturation contrast, and negative space.',
      },
      {
        code: 'EXP-03',
        name: 'Early-Signal Viral TikTok Sound-to-SKU Graph',
        category: 'Social Velocity',
        metric: '72-Hr Lead Time',
        detail: 'Detects rising audio trends and maps them to associated shoppable video anchors 3 days before marketplace search volume peaks.',
      },
    ],
  },
  drawer: {
    id: 'drawer',
    title: 'The Analyst Drawer (Downloadable Samples)',
    kicker: 'RAW CSV SCHEMAS · BENCHMARK SNAPSHOTS',
    description:
      'Inspect and export clean sample rows from the ecommarketdata enterprise warehouse. Ready for Python, Excel, BigQuery, or Looker.',
    items: [
      {
        code: 'CSV-2026-Q4',
        name: 'SEA_Marketplace_Category_Share_2026.csv',
        category: 'Quarterly Market Share',
        metric: '24,500 Rows · Clean Tabular',
        detail: 'Includes GMV, Units Sold, Average Selling Price, Discount Depth %, and Official Store Share across 180 sub-categories.',
      },
      {
        code: 'CSV-SKU-VEL',
        name: 'Top_5000_Viral_Livestream_SKUs.csv',
        category: 'Social Commerce Velocity',
        metric: '5,000 Rows · Hourly Series',
        detail: 'Tracks creator commission rate, live room conversion rate, and 30-day post-campaign organic rank retention.',
      },
      {
        code: 'JSON-MAP-AUDIT',
        name: 'Grey_Market_Reseller_Price_Violations.json',
        category: 'Brand Governance',
        metric: 'Real-Time Webhook Schema',
        detail: 'Identifies unauthorized cross-border sellers undercutting official MAP pricing by more than 15%.',
      },
    ],
  },
  about: {
    id: 'about',
    title: 'About ecommarketdata',
    kicker: 'THE E-COMMERCE CURIOSITY CABINET · ENTERPRISE DATA TECH',
    description:
      'We build high-precision web crawlers, market intelligence pipelines, and econometric models that turn chaotic e-commerce activity into clear enterprise strategy.',
    items: [
      {
        code: '01. CRAWL',
        name: 'High-Frequency Distributed Spider Network',
        category: 'Infrastructure',
        metric: '4.2M Pages / Min',
        detail: 'Just like the jumping spider in our cabinet, our distributed collectors traverse every category, search keyword, and flash-sale node.',
      },
      {
        code: '02. NORMALIZE',
        name: 'Cross-Platform SKU Entity Resolution',
        category: 'Machine Learning',
        metric: '99.1% Match Precision',
        detail: 'Unifies identical products sold under different titles and bundles across Shopee, TikTok Shop, Lazada, and Amazon.',
      },
      {
        code: '03. DELIVER',
        name: 'Zero-ETL Warehouse Sync & Executive Dashboards',
        category: 'Enterprise Delivery',
        metric: '15-Minute Freshness',
        detail: 'Direct table sharing into Snowflake, Google BigQuery, Databricks, or our interactive web terminal.',
      },
    ],
  },
  contact: {
    id: 'contact',
    title: 'Connect With Our Data Analysts',
    kicker: 'REQUEST API ACCESS · CUSTOM CATEGORY AUDIT',
    description:
      'Book a 20-minute live terminal walkthrough or request a custom e-commerce market dataset for your target category.',
    items: [
      {
        code: 'API TRIAL',
        name: '14-Day Enterprise Sandbox Key',
        category: 'Developer & BI Teams',
        metric: 'Full REST + SQL Access',
        detail: 'Query 3 full categories of your choice with historical daily GMV, unit sales, and price elasticity curves.',
      },
      {
        code: 'BESPOKE AUDIT',
        name: 'Custom Category & Competitor Deep-Dive',
        category: 'Strategy & Brand Leadership',
        metric: 'Delivered in 48 Hours',
        detail: 'Receive a board-ready market share deck + raw SKU ledger covering your top 25 marketplace competitors.',
      },
    ],
  },
};
