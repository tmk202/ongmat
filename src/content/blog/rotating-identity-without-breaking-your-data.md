---
title: "Rotating identity without breaking your data"
description: "Changing IPs mid-run can silently change what you see. Keep the identity stable within a cohort."
pubDate: 2026-10-15
category: 'web-scraping-data-extraction'
tags: ['web scraping', 'practice']
---

Changing IPs mid-run can silently change what you see. Keep the identity stable within a cohort.

Extraction looks like a parsing problem until you run it at volume. The failure modes that matter are almost always on the network side: rate limits, reputation and layout drift.

The practical approach is boring. Keep a stable identity per cohort, back off exponentially, and compare a structural checksum of each page before you trust its contents.

Log every run with a row count and a schema hash. When a number moves, you want to know whether the market moved or the page did.
