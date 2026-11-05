/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getCabinetAssets } from './assets/cabinetSprites';
import {
  CURIOSITY_ARTIFACTS,
  CuriosityArtifact,
  NAV_SECTIONS,
  NavSectionContent,
} from './data/ecomCabinetData';
import { SpiderCabinetEngine } from './engine/spiderEngine';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<SpiderCabinetEngine | null>(null);

  const assets = useMemo(() => getCabinetAssets(), []);

  // Interactive Ecommarketdata Cabinet Modals / Drawers
  const [activeNav, setActiveNav] = useState<
    'home' | 'archive' | 'oddities' | 'experiments' | 'drawer' | 'about' | 'contact'
  >('home');
  const [selectedArtifact, setSelectedArtifact] = useState<CuriosityArtifact | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadCompany, setLeadCompany] = useState('');
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Initialize Spider & Silk Canvas Engine
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

  const currentNavContent: NavSectionContent | null =
    activeNav !== 'home' ? NAV_SECTIONS[activeNav] : null;

  // Filtered search items across all sections and artifacts
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const allItems: { code: string; title: string; subtitle: string; onSelect: () => void }[] = [];

    Object.values(CURIOSITY_ARTIFACTS).forEach((art) => {
      allItems.push({
        code: art.catalogCode,
        title: art.title,
        subtitle: `${art.category} · ${art.subtitle}`,
        onSelect: () => {
          setSearchOpen(false);
          setActiveNav('home');
          setSelectedArtifact(art);
        },
      });
    });

    Object.values(NAV_SECTIONS).forEach((sec) => {
      sec.items.forEach((it) => {
        allItems.push({
          code: it.code,
          title: it.name,
          subtitle: `${it.category} · ${it.metric}`,
          onSelect: () => {
            setSearchOpen(false);
            setSelectedArtifact(null);
            setActiveNav(sec.id);
          },
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
  }, [searchQuery]);

  return (
    <div className="page">
      {/* LAYER 1: .frame (All base content and web anchors) */}
      <div className="frame">
        {/* Top Navigation */}
        <header className="top-nav">
          <a
            href="#home"
            className="logo-box"
            onClick={(e) => {
              e.preventDefault();
              setActiveNav('home');
              setSelectedArtifact(null);
              setSearchOpen(false);
              setMenuOpen(false);
            }}
          >
            <img
              src={assets.logoBackUrl}
              alt=""
              className="logo-folder-back"
              referrerPolicy="no-referrer"
            />
            <img
              src={assets.logoFrontUrl}
              alt=""
              className="logo-folder-front"
              referrerPolicy="no-referrer"
            />
            <span className="logo-word" data-web-anchor>
              ecommarketdata
            </span>
          </a>

          <nav className="nav-links" aria-label="Primary Navigation">
            {(
              [
                ['home', 'home'],
                ['archive', 'archive'],
                ['oddities', 'oddities'],
                ['experiments', 'experiments'],
                ['drawer', 'the drawer'],
                ['about', 'about'],
                ['contact', 'contact'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                data-web-anchor
                className={`nav-link ${activeNav === key && !selectedArtifact ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedArtifact(null);
                  setSearchOpen(false);
                  setMenuOpen(false);
                  setActiveNav(key);
                }}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="nav-icons">
            <button
              type="button"
              className="nav-icon-btn"
              title="Search 14.2B E-Commerce SKUs & Datasets"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                setSearchOpen((v) => !v);
              }}
            >
              <img
                src={assets.searchUrl}
                alt="Search market archive"
                data-web-anchor
                referrerPolicy="no-referrer"
              />
            </button>
            <button
              type="button"
              className="nav-icon-btn"
              title="Cabinet Controls & Spider Telemetry"
              onClick={(e) => {
                e.stopPropagation();
                setSearchOpen(false);
                setMenuOpen((v) => !v);
              }}
            >
              <img
                src={assets.menuUrl}
                alt="Open cabinet menu"
                data-web-anchor
                referrerPolicy="no-referrer"
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

        {/* Clean 3D Sculpted Platform Letterforms (Shopee 'S', Amazon 'a', TikTok Glyph, Etsy 'E') */}
        <img
          src={assets.mugUrl}
          alt="Shopee 3D Orange S Emblem"
          className="cabinet-obj obj-mug"
          data-web-anchor
          referrerPolicy="no-referrer"
          onClick={(e) => {
            e.stopPropagation();
            setActiveNav('home');
            setSelectedArtifact(CURIOSITY_ARTIFACTS.mug);
          }}
        />

        <img
          src={assets.ibookUrl}
          alt="Amazon 3D A and Smile Arrow Emblem"
          className="cabinet-obj obj-ibook"
          data-web-anchor
          referrerPolicy="no-referrer"
          onClick={(e) => {
            e.stopPropagation();
            setActiveNav('home');
            setSelectedArtifact(CURIOSITY_ARTIFACTS.ibook);
          }}
        />

        <img
          src={assets.bookUrl}
          alt="TikTok Shop 3D Emblem"
          className="cabinet-obj obj-book"
          data-web-anchor
          referrerPolicy="no-referrer"
          onClick={(e) => {
            e.stopPropagation();
            setActiveNav('home');
            setSelectedArtifact(CURIOSITY_ARTIFACTS.book);
          }}
        />

        <img
          src={assets.tshirtUrl}
          alt="Etsy 3D Orange E Emblem"
          className="cabinet-obj obj-tshirt"
          data-web-anchor
          data-stick="bottom"
          referrerPolicy="no-referrer"
          onClick={(e) => {
            e.stopPropagation();
            setActiveNav('home');
            setSelectedArtifact(CURIOSITY_ARTIFACTS.tshirt);
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
      </div>

      {/* LAYER 2: .web-layer (Single full-size 2D canvas for spider, silk web, shadows, drops & fly) */}
      <canvas ref={canvasRef} className="web-layer" />

      {/* LAYER 3: .over (Second copy of the giant wordmark with only the letter "o" visible so spider crawls UNDER "o") */}
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
          Del / Backspace — clear data web · Click — Cyber-Bee pounces Deal · Click objects — inspect market data
        </span>
        <span className="hint-touch">
          Hold — clear data web
          <br />
          Double-tap — make the Cyber-Bee jump
        </span>
      </div>

      {/* Interactive Search Modal (data-no-spider) */}
      {searchOpen && (
        <div
          data-no-spider
          className="fixed inset-0 z-30 flex items-start justify-center pt-20 px-4 bg-[#09157a]/25 backdrop-blur-sm"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-[#1129e2] border border-white/25 shadow-2xl p-5 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/15">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Query 14.2B SKUs, Shopee / TikTok Shop benchmarks, or objects..."
                className="w-full bg-transparent text-white placeholder-white/55 text-base focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="text-xs text-white/70 hover:text-white px-2 py-1 rounded border border-white/20 whitespace-nowrap"
              >
                ESC
              </button>
            </div>

            <div className="mt-3 space-y-2 max-h-80 overflow-y-auto pr-1">
              {searchResults.map((res) => (
                <button
                  key={res.code + res.title}
                  type="button"
                  onClick={res.onSelect}
                  className="w-full text-left p-3 rounded-xl bg-white/10 hover:bg-white/18 transition-colors flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-xs font-mono text-amber-300">{res.code}</div>
                    <div className="text-sm font-semibold text-white">{res.title}</div>
                    <div className="text-xs text-white/75">{res.subtitle}</div>
                  </div>
                  <span className="text-xs text-white/70 whitespace-nowrap">Inspect →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Cabinet & Cyber-Bee Controls Popover (data-no-spider) */}
      {menuOpen && (
        <div
          data-no-spider
          className="fixed top-20 right-6 z-30 w-80 rounded-2xl bg-[#1129e2] border border-white/25 backdrop-blur-md shadow-2xl p-5 text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/15">
            <div>
              <div className="text-sm font-semibold">ecommarketdata Cabinet</div>
              <div className="text-xs text-white/75">Cyber-Bee Harvester & Hive Volatility</div>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="text-xs text-white/70 hover:text-white px-2 py-1"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 space-y-2.5">

            <button
              type="button"
              onClick={() => {
                engineRef.current?.triggerSpiderJump();
                setMenuOpen(false);
              }}
              className="w-full py-2 px-3 rounded-xl bg-white text-[#1129e2] font-semibold text-xs hover:bg-white/90 transition-colors text-left flex items-center justify-between"
            >
              <span>Make Cyber-Bee Pounce Deal</span>
              <span>Click / Jump</span>
            </button>

            <button
              type="button"
              onClick={() => {
                engineRef.current?.triggerClearWeb();
                setMenuOpen(false);
                showToast('Cleared data-silk web from cabinet.');
              }}
              className="w-full py-2 px-3 rounded-xl bg-white/12 hover:bg-white/20 text-white font-medium text-xs transition-colors text-left flex items-center justify-between"
            >
              <span>Clear Data-Silk Network</span>
              <span>Del / Backspace</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                handleDownloadSampleCsv('ecommarketdata_Q4_benchmark_sample.csv');
              }}
              className="w-full py-2 px-3 rounded-xl bg-white/12 hover:bg-white/20 text-white font-medium text-xs transition-colors text-left flex items-center justify-between"
            >
              <span>Download Sample E-Com CSV</span>
              <span>4.2 KB</span>
            </button>

            <div className="pt-2 border-t border-white/15 grid grid-cols-2 gap-1.5">
              {(
                [
                  ['archive', 'Archive'],
                  ['oddities', 'Oddities'],
                  ['experiments', 'Experiments'],
                  ['drawer', 'The Drawer'],
                  ['about', 'About Tech'],
                  ['contact', 'API Access'],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setSelectedArtifact(null);
                    setActiveNav(k);
                  }}
                  className="py-1.5 px-2.5 rounded-lg bg-white/8 hover:bg-white/15 text-xs text-left text-white/90"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Collectible Object Dossier Drawer (Opens when clicking Mug, iBook, Almanac Book, or T-Shirt) */}
      {selectedArtifact && (
        <div
          data-no-spider
          className="fixed inset-y-0 right-0 z-30 w-full max-w-lg bg-[#0a1888]/92 backdrop-blur-xl border-l border-white/25 shadow-2xl p-6 text-white overflow-y-auto flex flex-col justify-between"
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/15">
              <div className="text-xs font-mono tracking-wider text-sky-300">
                {selectedArtifact.catalogCode}
              </div>
              <button
                type="button"
                onClick={() => setSelectedArtifact(null)}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium"
              >
                Close Dossier
              </button>
            </div>

            <h3 className="mt-4 text-2xl font-semibold tracking-tight leading-snug">
              {selectedArtifact.title}
            </h3>
            <p className="mt-1 text-sm text-white/75">{selectedArtifact.subtitle}</p>

            <p className="mt-4 text-sm leading-relaxed text-white/90 bg-white/8 rounded-xl p-4 border border-white/15">
              {selectedArtifact.summary}
            </p>

            {/* Key Quantitative Metrics */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              {selectedArtifact.metrics.map((m) => (
                <div
                  key={m.label}
                  className="rounded-xl bg-white/10 border border-white/15 p-3 flex flex-col justify-between"
                >
                  <div className="text-[11px] text-white/70">{m.label}</div>
                  <div className="mt-1 text-xl font-semibold tabular-nums text-white">
                    {m.value}
                  </div>
                  <div className="mt-0.5 text-[11px] text-sky-300">{m.delta}</div>
                </div>
              ))}
            </div>

            {/* Platform / Category Benchmark Table */}
            <div className="mt-6">
              <div className="text-xs font-semibold uppercase tracking-wider text-white/70 mb-2">
                Verified Marketplace Telemetry (Tabular)
              </div>
              <div className="rounded-xl border border-white/20 overflow-hidden bg-white/5">
                <table className="w-full text-left border-collapse text-xs tabular-nums">
                  <thead>
                    <tr className="border-b border-white/15 text-white/70 bg-white/8">
                      <th className="py-2.5 px-3 font-medium">Segment / Platform</th>
                      <th className="py-2.5 px-2 font-medium">Share</th>
                      <th className="py-2.5 px-2 font-medium">YoY</th>
                      <th className="py-2.5 px-2 font-medium">AOV</th>
                      <th className="py-2.5 px-3 font-medium text-right">CVR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedArtifact.benchmarks.map((row) => (
                      <tr key={row.platform} className="border-b border-white/10 last:border-none">
                        <td className="py-2.5 px-3 font-medium text-white">{row.platform}</td>
                        <td className="py-2.5 px-2 text-white/85">{row.share}</td>
                        <td className="py-2.5 px-2 text-emerald-300 font-medium">
                          {row.yoyGrowth}
                        </td>
                        <td className="py-2.5 px-2 text-white/85">{row.avgBasket}</td>
                        <td className="py-2.5 px-3 text-right text-sky-200">{row.conversionRate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-sky-400/15 border border-sky-300/30 p-3.5 text-xs leading-relaxed text-sky-100">
              <strong className="font-semibold text-white">Analyst Takeaway: </strong>
              {selectedArtifact.insightNote}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/15 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() =>
                handleDownloadSampleCsv(`ecommarketdata_${selectedArtifact.id}_telemetry.csv`)
              }
              className="px-4 py-2.5 rounded-xl bg-white text-[#1129e2] font-semibold text-xs hover:bg-white/90 transition-colors whitespace-nowrap"
            >
              Export Raw CSV
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedArtifact(null);
                setActiveNav('contact');
              }}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-medium text-xs transition-colors whitespace-nowrap"
            >
              Request Full Category API →
            </button>
          </div>
        </div>
      )}

      {/* Navigation Section Drawer (Archive, Oddities, Experiments, The Drawer, About, Contact) */}
      {currentNavContent && !selectedArtifact && (
        <div
          data-no-spider
          className="fixed inset-y-0 right-0 z-30 w-full max-w-xl bg-[#0a1888]/92 backdrop-blur-xl border-l border-white/25 shadow-2xl p-6 text-white overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/15">
            <div className="text-xs font-mono tracking-wider text-sky-300">
              {currentNavContent.kicker}
            </div>
            <button
              type="button"
              onClick={() => setActiveNav('home')}
              className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium"
            >
              Back to Cabinet
            </button>
          </div>

          <h3 className="mt-4 text-2xl font-semibold tracking-tight">{currentNavContent.title}</h3>
          <p className="mt-2 text-sm text-white/80 leading-relaxed">
            {currentNavContent.description}
          </p>

          <div className="mt-5 space-y-3">
            {currentNavContent.items.map((item) => (
              <div
                key={item.code}
                className="rounded-xl bg-white/10 border border-white/15 p-4 hover:bg-white/14 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-sky-300 font-mono">
                  <span>{item.code}</span>
                  <span>{item.category}</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-3">
                  <h4 className="text-base font-semibold text-white">{item.name}</h4>
                  <span className="text-xs font-semibold tabular-nums text-emerald-300 whitespace-nowrap">
                    {item.metric}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-white/80 leading-relaxed">{item.detail}</p>
                {activeNav === 'drawer' && (
                  <button
                    type="button"
                    onClick={() => handleDownloadSampleCsv(item.name)}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-white text-[#1129e2] font-semibold text-xs hover:bg-white/90 transition-colors"
                  >
                    Download Sample File
                  </button>
                )}
              </div>
            ))}
          </div>

          {activeNav === 'contact' && (
            <form
              onSubmit={handleLeadSubmit}
              className="mt-6 rounded-2xl bg-white/10 border border-white/20 p-5 space-y-3"
            >
              <div className="text-sm font-semibold">Request Enterprise Sandbox & API Key</div>
              {leadSubmitted ? (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-300/40 text-xs text-emerald-100">
                  Thank you! Your 14-day ecommarketdata API sandbox key and Snowflake/BigQuery
                  schema docs have been sent to <strong>{leadEmail}</strong>.
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs text-white/75 mb-1">Work Email</label>
                    <input
                      type="email"
                      required
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      placeholder="analyst@enterprise.com"
                      className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/25 text-sm text-white placeholder-white/45 focus:outline-none focus:border-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/75 mb-1">
                      Company & Target Marketplaces
                    </label>
                    <input
                      type="text"
                      value={leadCompany}
                      onChange={(e) => setLeadCompany(e.target.value)}
                      placeholder="e.g. Acme Consumer · Shopee, TikTok Shop, Amazon"
                      className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/25 text-sm text-white placeholder-white/45 focus:outline-none focus:border-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-white text-[#1129e2] font-semibold text-xs hover:bg-white/90 transition-colors"
                  >
                    Provision Sandbox Credentials
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      )}

      {/* Subtle Toast Notification */}
      {toastMsg && (
        <div
          data-no-spider
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-white text-[#1129e2] font-medium text-xs shadow-xl"
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}
