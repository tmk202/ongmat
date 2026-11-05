---
title: "Idempotency for scheduled ETL jobs"
description: "A retried job should not double your revenue. Keys and constraints are the whole trick."
pubDate: 2026-08-25
category: 'custom-apis-data-pipelines'
tags: ['custom apis', 'practice']
---

A retried job should not double your revenue. Keys and constraints are the whole trick.

Schemas outlive the systems that produced them. Treat field names and types as a contract, and change them on purpose.

Make every job idempotent. If a retry can double a number, it eventually will, and it will happen on the day it matters most.

Failures should be loud. A pipeline that quietly writes zero rows is more dangerous than one that stops with an error.
