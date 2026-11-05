---
title: "Designing a stable schema for marketplace data"
description: "Every marketplace will rename a field. Your schema should absorb that without breaking clients."
pubDate: 2026-08-28
category: 'custom-apis-data-pipelines'
tags: ['custom apis', 'practice']
---

Every marketplace will rename a field. Your schema should absorb that without breaking clients.

Schemas outlive the systems that produced them. Treat field names and types as a contract, and change them on purpose.

Make every job idempotent. If a retry can double a number, it eventually will, and it will happen on the day it matters most.

Failures should be loud. A pipeline that quietly writes zero rows is more dangerous than one that stops with an error.
