---
title: "Structured data from PDF catalogues"
description: "Supplier PDFs are still the most common handoff in B2B. Table extraction needs layout awareness, not regex."
pubDate: 2026-10-12
category: 'web-scraping-data-extraction'
tags: ['web scraping', 'practice']
---

Supplier PDFs are still the most common handoff in B2B. Table extraction needs layout awareness, not regex.

Extraction looks like a parsing problem until you run it at volume. The failure modes that matter are almost always on the network side: rate limits, reputation and layout drift.

The practical approach is boring. Keep a stable identity per cohort, back off exponentially, and compare a structural checksum of each page before you trust its contents.

Log every run with a row count and a schema hash. When a number moves, you want to know whether the market moved or the page did.
