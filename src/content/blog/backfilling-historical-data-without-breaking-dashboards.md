---
title: "Backfilling historical data without breaking dashboards"
description: "Backfills rewrite the past. Dashboards that assume the past is fixed will mislead you."
pubDate: 2026-08-19
category: 'custom-apis-data-pipelines'
tags: ['custom apis', 'practice']
---

Backfills rewrite the past. Dashboards that assume the past is fixed will mislead you.

Schemas outlive the systems that produced them. Treat field names and types as a contract, and change them on purpose.

Make every job idempotent. If a retry can double a number, it eventually will, and it will happen on the day it matters most.

Failures should be loud. A pipeline that quietly writes zero rows is more dangerous than one that stops with an error.
