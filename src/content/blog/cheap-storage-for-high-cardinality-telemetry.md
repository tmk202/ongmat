---
title: "Cheap storage for high-cardinality telemetry"
description: "Per-SKU time series grows fast. Partitioning beats indexing once you pass a few billion rows."
pubDate: 2026-08-10
category: 'custom-apis-data-pipelines'
tags: ['custom apis', 'practice']
---

Per-SKU time series grows fast. Partitioning beats indexing once you pass a few billion rows.

Schemas outlive the systems that produced them. Treat field names and types as a contract, and change them on purpose.

Make every job idempotent. If a retry can double a number, it eventually will, and it will happen on the day it matters most.

Failures should be loud. A pipeline that quietly writes zero rows is more dangerous than one that stops with an error.
