---
title: "Dealing with duplicate listings in scraped catalogs"
description: "The same SKU appears under three IDs. Deduplication rules decide whether your counts are usable."
pubDate: 2026-10-21
category: 'web-scraping-data-extraction'
tags: ['web scraping', 'practice']
---

The same SKU appears under three IDs. Deduplication rules decide whether your counts are usable.

Extraction looks like a parsing problem until you run it at volume. The failure modes that matter are almost always on the network side: rate limits, reputation and layout drift.

The practical approach is boring. Keep a stable identity per cohort, back off exponentially, and compare a structural checksum of each page before you trust its contents.

Log every run with a row count and a schema hash. When a number moves, you want to know whether the market moved or the page did.
