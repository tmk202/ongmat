/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCabinetAssets } from './assets/cabinetSprites';
import {
  ALL_PLATFORM_DATASETS,
  CURIOSITY_ARTIFACTS,
  CuriosityArtifact,
  getArtifactBySlug,
  getSectionByItemSlug,
  NAV_SECTIONS,
  NavSectionContent,
} from './data/ecomCabinetData';
import { SpiderCabinetEngine } from './engine/spiderEngine';
import { syncSeoHead } from './seo/seoHead';

type NavKey = 'home' | 'archive' | 'oddities' | 'experiments' | 'drawer' | 'about' | 'contact';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<SpiderCabinetEngine | null>(null);

  const assets = useMemo(() => getCabinetAssets(), []);

  // Route & Drawer State synced with `/data/[slug]` and SEO Head
  const [activeNav, setActiveNav] = useState<NavKey>('home');
  const [selectedArtifact, setSelectedArtifact] = useState<CuriosityArtifact | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadCompany, setLeadCompany] = useState('');
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // Parse URL path (`/data/[slug]` or `/?q=...`) on initial load & browser back/forward
  const applyPathnameState = useCallback((pathname: string, search: string) => {
    const params = new URLSearchParams(search);
    const qParam = params.get('q');
    if (qParam) {
      setSearchQuery(qParam);
      setSearchOpen(true);
    }

    const cleanPath = pathname.replace(/\/+$/, '') || '/';
    if (cleanPath.startsWith('/data/')) {
      const slug = cleanPath.slice('/data/'.length);
      const matchedArtifact = getArtifactBySlug(slug);
      if (matchedArtifact) {
        setActiveNav('home');
        setSelectedArtifact(matchedArtifact);
        return;
      }
      const matchedSection = getSectionByItemSlug(slug);
      if (matchedSection) {
        setSelectedArtifact(null);
        setActiveNav(matchedSection.section.id);
        return;
      }
    }

    const sectionKey = cleanPath.slice(1) as NavKey;
    if (
      sectionKey &&
      sectionKey !== 'home' &&
      Object.prototype.hasOwnProperty.call(NAV_SECTIONS, sectionKey)
    ) {
      setSelectedArtifact(null);
      setActiveNav(sectionKey);
      return;
    }

    setSelectedArtifact(null);
    setActiveNav('home');
  }, []);

  useEffect(() => {
    applyPathnameState(window.location.pathname, window.location.search);
    const onPopState = () => {
      applyPathnameState(window.location.pathname, window.location.search);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [applyPathnameState]);

  // Navigate to `/data/[slug]` or `/` and update browser URL + SEO canonical/JSON-LD
  const navigateToDatasetSlug = useCallback((artifact: CuriosityArtifact) => {
    setSearchOpen(false);
    setMenuOpen(false);
    setActiveNav('home');
    setSelectedArtifact(artifact);
    const targetPath = `/data/${artifact.slug}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ slug: artifact.slug }, '', targetPath);
    }
  }, []);

  const navigateToSection = useCallback((nav: NavKey, customSlug?: string) => {
    setSearchOpen(false);
    setMenuOpen(false);
    setSelectedArtifact(null);
    setActiveNav(nav);
    const targetPath = customSlug ? `/data/${customSlug}` : nav === 'home' ? '/' : `/${nav}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ nav, slug: customSlug }, '', targetPath);
    }
  }, []);

  const closeDossierToHome = useCallback(() => {
    setSelectedArtifact(null);
    setActiveNav('home');
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
  }, []);

  const currentNavContent: NavSectionContent | null =
    activeNav !== 'home' ? NAV_SECTIONS[activeNav] : null;

  // Sync <title>, <link rel="canonical">, OpenGraph, Twitter Card, and Schema.org JSON-LD
  useEffect(() => {
    syncSeoHead({
      artifact: selectedArtifact,
      section: currentNavContent,
    });
  }, [selectedArtifact, currentNavContent]);

  // Initialize Cyber-Bee & Honey Droplets Canvas Engine
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new SpiderCabinetEngine(canvasRef.current, assets);
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [assets]);

  const handleDownloadSampleCsv = (filename: string) => {
    const csvContent = [
      'timestamp,marketplace,category,sku_id,brand,price_usd,discount_pct,hourly_units_sold,gmv_usd,conversion_rate',
      '2026-11-11T00:15:00Z,Shopee Mall,Beauty & Skincare,SHP-8849201,LuminaDerm,26.80,32.0,1420,38056.00,5.8%',
      '2026-11-11T00:15:00Z,TikTok Shop,Beauty & Skincare,TTS-3391042,GlowLab SEA,18.40,40.0,2890,53176.00,6.4%',
      '2026-11-11T00:15:00Z,Lazada LazMall,Consumer Electronics,LAZ-9920114,AeroSound Pro,112.00,25.0,640,71680.00,3.4%',
      '2026-11-11T00:15:00Z,Amazon Global,Home Appliances,AMZ-5510293,BrewMaster X,64.20,18.0,910,58422.00,6.1%',
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${filename} (ecommarketdata verified sample)`);
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadEmail.includes('@') || leadEmail.trim().length < 5) {
      showToast('Please enter a valid work email address.');
      return;
    }
    setLeadSubmitted(true);
    showToast('Enterprise sandbox API credentials dispatched to your inbox.');
  };

  // Filtered search items across all `/data/[slug]` JSON datasets and sections
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const allItems: {
      code: string;
      href: string;
      title: string;
      subtitle: string;
      onSelect: () => void;
    }[] = [];

    ALL_PLATFORM_DATASETS.forEach((art) => {
      allItems.push({
        code: `${art.catalogCode} · /data/${art.slug}`,
        href: `/data/${art.slug}`,
        title: art.title,
        subtitle: `${art.category} · ${art.subtitle}`,
        onSelect: () => navigateToDatasetSlug(art),
      });
    });

    Object.values(NAV_SECTIONS).forEach((sec) => {
      sec.items.forEach((it) => {
        allItems.push({
          code: `${it.code} · /data/${it.slug}`,
          href: `/data/${it.slug}`,
          title: it.name,
          subtitle: `${it.category} · ${it.metric}`,
          onSelect: () => navigateToSection(sec.id, it.slug),
        });
      });
    });

    if (!q) return allItems.slice(0, 6);
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q)
    );
  }, [searchQuery, navigateToDatasetSlug, navigateToSection]);

  return (
    <main className="page">
      {/* LAYER 1: .frame (All base content and web anchors) */}
      <div className="frame">
        {/* Top Navigation */}
        <header className="top-nav">
          <a
            href="/"
            className="logo-box"
            onClick={(e) => {
              e.preventDefault();
              closeDossierToHome();
              setSearchOpen(false);
              setMenuOpen(false);
            }}
          >
            <img
              src={assets.logoBackUrl}
              alt=""
              width={53}
              height={41}
              decoding="async"
              className="logo-folder-back"
            />
            <img
              src={assets.logoFrontUrl}
              alt=""
              width={53}
              height={34}
              decoding="async"
              className="logo-folder-front"
            />
            <span className="logo-word" data-web-anchor>
              ecommarketdata
            </span>
          </a>

          <nav className="nav-links" aria-label="Primary Navigation">
            {(
              [
                ['home', 'home', '/'],
                ['archive', 'archive', '/archive'],
                ['oddities', 'oddities', '/oddities'],
                ['experiments', 'experiments', '/experiments'],
                ['drawer', 'the drawer', '/drawer'],
                ['about', 'about', '/about'],
                ['contact', 'contact', '/contact'],
              ] as const
            ).map(([key, label, href]) => (
              <a
                key={key}
                href={href}
                data-web-anchor
                className={`nav-link ${activeNav === key && !selectedArtifact ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigateToSection(key);
                }}
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="nav-icons">
            <button
              type="button"
              className="nav-icon-btn"
              title="Search 14.2B E-Commerce SKUs & /data/[slug] Datasets"
              aria-label="Search market datasets"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                setSearchOpen((v) => !v);
              }}
            >
              <img
                src={assets.searchUrl}
                alt="Search market archive"
                width={26}
                height={26}
                decoding="async"
                data-web-anchor
              />
            </button>
            <button
              type="button"
              className="nav-icon-btn"
              title="Cabinet Controls & Cyber-Bee Telemetry"
              aria-label="Open cabinet controls"
              onClick={(e) => {
                e.stopPropagation();
                setSearchOpen(false);
                setMenuOpen((v) => !v);
              }}
            >
              <img
                src={assets.menuUrl}
                alt="Open cabinet menu"
                width={26}
                height={26}
                decoding="async"
                data-web-anchor
              />
            </button>
          </div>
        </header>

        {/* Giant Center Wordmark (.found) — "ecom" at 350u with "o" transparent here and visible in .over */}
        <h1 className="found" data-web-anchor>
          <span>ec</span>
          <span className="letter-o">o</span>
          <span>m</span>
          <span className="found-sub-tag">marketdata</span>
        </h1>

        {/* 3D Sculpted Platform Letterforms linked to `/data/[slug]` */}
        <img
          src={assets.mugUrl}
          alt="Shopee 3D Orange S Emblem — /data/shopee-tiktok-gmv-pod"
          width={300}
          height={300}
          loading="eager"
          decoding="async"
          className="cabinet-obj obj-mug"
          data-web-anchor
          onClick={(e) => {
            e.stopPropagation();
            navigateToDatasetSlug(CURIOSITY_ARTIFACTS.mug);
          }}
        />

        <img
          src={assets.ibookUrl}
          alt="Amazon 3D A and Smile Arrow Emblem — /data/amazon-shopify-buybox-terminal"
          width={312}
          height={377}
          loading="eager"
          decoding="async"
          className="cabinet-obj obj-ibook"
          data-web-anchor
          onClick={(e) => {
            e.stopPropagation();
            navigateToDatasetSlug(CURIOSITY_ARTIFACTS.ibook);
          }}
        />

        <img
          src={assets.bookUrl}
          alt="TikTok Shop 3D Emblem — /data/tiktok-shop-live-telemetry"
          width={293}
          height={322}
          loading="eager"
          decoding="async"
          className="cabinet-obj obj-book"
          data-web-anchor
          onClick={(e) => {
            e.stopPropagation();
            navigateToDatasetSlug(CURIOSITY_ARTIFACTS.book);
          }}
        />

        <img
          src={assets.tshirtUrl}
          alt="Shopify 3D Green Bag S Emblem — /data/etsy-lazada-omni-hub"
          width={280}
          height={260}
          loading="eager"
          decoding="async"
          className="cabinet-obj obj-tshirt"
          data-web-anchor
          data-stick="bottom"
          onClick={(e) => {
            e.stopPropagation();
            navigateToDatasetSlug(CURIOSITY_ARTIFACTS.tshirt);
          }}
        />

        {/* Headline (.cabinet) & Tagline (.tagline) */}
        <h2 className="cabinet" data-web-anchor>
          the curiosity
          <br />
          cabinet
        </h2>

        <p className="tagline" data-web-anchor>
          Deep e-commerce market intelligence for modern enterprises.
        </p>

        {/* Crawlable Semantic `/data/[slug]` Links for Search Engine Bots & Screen Readers */}
        <nav className="seo-catalog-nav" aria-label="E-Commerce Datasets Directory">
          <ul>
            {ALL_PLATFORM_DATASETS.map((art) => (
              <li key={art.slug}>
                <a
                  href={`/data/${art.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigateToDatasetSlug(art);
                  }}
                >
                  {art.title} — {art.seoDescription}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* LAYER 2: .web-layer (Single full-size 2D canvas for Cyber-Bee & honey droplets) */}
      <canvas ref={canvasRef} className="web-layer" />

      {/* LAYER 3: .over (Second copy of the giant wordmark with only the letter "o" visible) */}
      <div className="over" aria-hidden="true">
        <div className="found">
          <span>ec</span>
          <span className="letter-o">o</span>
          <span>m</span>
          <span className="found-sub-tag">marketdata</span>
        </div>
      </div>

      {/* Bottom-right Cyber-Bee Instructions Hint */}
      <div id="spider-instructions">
        <span className="hint-desktop">
          Click platforms — open /data/[slug] · Cyber-Bee autonomously harvests platform data
        </span>
        <span className="hint-touch">
          Tap platforms — open /data/[slug]
        </span>
      </div>

      {/* Interactive Search Modal (Pure CSS) */}
      {searchOpen && (
        <div
          data-no-spider
          className="modal-backdrop"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="search-dialog"
            role="dialog"
            aria-label="Search ecommarketdata datasets"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="search-header">
              <input
                type="search"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Query 14.2B SKUs, /data/[slug] datasets, Shopee / TikTok Shop..."
                className="search-input"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="esc-btn"
              >
                ESC
              </button>
            </div>

            <div className="search-list">
              {searchResults.map((res) => (
                <a
                  key={res.code + res.title}
                  href={res.href}
                  onClick={(e) => {
                    e.preventDefault();
                    res.onSelect();
                  }}
                  className="search-item"
                >
                  <div>
                    <div className="search-item-code">{res.code}</div>
                    <div className="search-item-title">{res.title}</div>
                    <div className="search-item-sub">{res.subtitle}</div>
                  </div>
                  <span className="search-item-cta">Open →</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Cabinet & Cyber-Bee Controls Popover (Pure CSS) */}
      {menuOpen && (
        <div
          data-no-spider
          className="menu-popover"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="menu-header">
            <div>
              <div className="menu-title">ecommarketdata.com</div>
              <div className="menu-subtitle">Astro 7 Static SEO · Cloudflare Workers</div>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="menu-close"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          <div className="menu-actions">
            <button
              type="button"
              onClick={() => {
                engineRef.current?.triggerSpiderJump();
                setMenuOpen(false);
              }}
              className="btn-primary-white"
            >
              <span>Make Cyber-Bee Pounce Deal</span>
              <span>Click / Jump</span>
            </button>

            <button
              type="button"
              onClick={() => {
                engineRef.current?.triggerClearWeb();
                setMenuOpen(false);
                showToast('Cleared honey droplets from cabinet.');
              }}
              className="btn-ghost-white"
            >
              <span>Clear Honey Droplets</span>
              <span>Del / Backspace</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                handleDownloadSampleCsv('ecommarketdata_Q4_benchmark_sample.csv');
              }}
              className="btn-ghost-white"
            >
              <span>Download Sample E-Com CSV</span>
              <span>4.2 KB</span>
            </button>

            <div className="menu-grid">
              {(
                [
                  ['archive', 'Archive'],
                  ['oddities', 'Oddities'],
                  ['experiments', 'Experiments'],
                  ['drawer', 'The Drawer'],
                  ['about', 'Tech Stack'],
                  ['contact', 'API Access'],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => navigateToSection(k)}
                  className="menu-grid-btn"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* `/data/[slug]` Dataset Dossier Drawer (Opens when clicking Shopee, Amazon, TikTok, or Etsy) */}
      {selectedArtifact && (
        <article
          data-no-spider
          className="dossier-drawer"
          itemScope
          itemType="https://schema.org/Dataset"
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            <div className="dossier-top">
              <div>
                <div className="dossier-kicker">{selectedArtifact.catalogCode}</div>
                <span className="dossier-route-badge">
                  /data/{selectedArtifact.slug} · src/data/{selectedArtifact.slug}.json
                </span>
              </div>
              <button
                type="button"
                onClick={closeDossierToHome}
                className="dossier-close-btn"
              >
                Close Dossier
              </button>
            </div>

            <h3 className="dossier-title" itemProp="name">
              {selectedArtifact.title}
            </h3>
            <p className="dossier-subtitle">{selectedArtifact.subtitle}</p>

            <p className="dossier-summary" itemProp="description">
              {selectedArtifact.summary}
            </p>

            {/* Key Quantitative Metrics */}
            <div className="metric-grid">
              {selectedArtifact.metrics.map((m) => (
                <div key={m.label} className="metric-card">
                  <div className="metric-label">{m.label}</div>
                  <div className="metric-value">{m.value}</div>
                  <div className="metric-delta">{m.delta}</div>
                </div>
              ))}
            </div>

            {/* Platform / Category Benchmark Table */}
            <div className="table-section">
              <div className="table-heading">Verified Marketplace Telemetry (Tabular)</div>
              <div className="table-wrap">
                <table className="benchmark-table">
                  <thead>
                    <tr>
                      <th>Segment / Platform</th>
                      <th>Share</th>
                      <th>YoY</th>
                      <th>AOV</th>
                      <th>CVR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedArtifact.benchmarks.map((row) => (
                      <tr key={row.platform}>
                        <td className="cell-platform">{row.platform}</td>
                        <td>{row.share}</td>
                        <td className="cell-growth">{row.yoyGrowth}</td>
                        <td>{row.avgBasket}</td>
                        <td className="cell-cvr">{row.conversionRate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="analyst-note">
              <strong>Analyst Takeaway: </strong>
              {selectedArtifact.insightNote}
            </div>
          </div>

          <div className="dossier-footer">
            <button
              type="button"
              onClick={() => handleDownloadSampleCsv(selectedArtifact.sampleCsvFilename)}
              className="btn-export"
            >
              Export Raw CSV
            </button>
            <button
              type="button"
              onClick={() => navigateToSection('contact')}
              className="btn-secondary-action"
            >
              Request Full Category API →
            </button>
          </div>
        </article>
      )}

      {/* Navigation Section Drawer (Archive, Oddities, Experiments, The Drawer, About, Contact) */}
      {currentNavContent && !selectedArtifact && (
        <section
          data-no-spider
          className="dossier-drawer wide"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="dossier-top">
            <div className="dossier-kicker">{currentNavContent.kicker}</div>
            <button
              type="button"
              onClick={closeDossierToHome}
              className="dossier-close-btn"
            >
              Back to Cabinet
            </button>
          </div>

          <h3 className="dossier-title">{currentNavContent.title}</h3>
          <p className="dossier-subtitle">{currentNavContent.description}</p>

          <div className="section-list">
            {currentNavContent.items.map((item) => (
              <div key={item.code} className="section-card">
                <div className="section-card-meta">
                  <span>
                    {item.code} · /data/{item.slug}
                  </span>
                  <span>{item.category}</span>
                </div>
                <div className="section-card-head">
                  <h4 className="section-card-title">{item.name}</h4>
                  <span className="section-card-metric">{item.metric}</span>
                </div>
                <p className="section-card-detail">{item.detail}</p>
                {activeNav === 'drawer' && (
                  <button
                    type="button"
                    onClick={() => handleDownloadSampleCsv(item.name)}
                    className="section-card-btn"
                  >
                    Download Sample File
                  </button>
                )}
              </div>
            ))}
          </div>

          {activeNav === 'contact' && (
            <form onSubmit={handleLeadSubmit} className="lead-form">
              <div className="lead-form-title">Request Enterprise Sandbox & API Key</div>
              {leadSubmitted ? (
                <div className="lead-success">
                  Thank you! Your 14-day ecommarketdata API sandbox key and Snowflake/BigQuery
                  schema docs have been sent to <strong>{leadEmail}</strong>.
                </div>
              ) : (
                <>
                  <div>
                    <label className="form-label">Work Email</label>
                    <input
                      type="email"
                      required
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      placeholder="analyst@enterprise.com"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Company & Target Marketplaces</label>
                    <input
                      type="text"
                      value={leadCompany}
                      onChange={(e) => setLeadCompany(e.target.value)}
                      placeholder="e.g. Acme Consumer · Shopee, TikTok Shop, Amazon"
                      className="form-input"
                    />
                  </div>
                  <button type="submit" className="btn-primary-white">
                    <span>Provision Sandbox Credentials</span>
                    <span>→</span>
                  </button>
                </>
              )}
            </form>
          )}
        </section>
      )}

      {/* Subtle Toast Notification */}
      {toastMsg && (
        <div data-no-spider className="toast-banner">
          {toastMsg}
        </div>
      )}
    </main>
  );
}
