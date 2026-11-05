---
title: "Versioning an API your clients depend on"
description: "Additive changes are cheap. Everything else needs a plan and a sunset date."
pubDate: 2026-08-22
category: 'custom-apis-data-pipelines'
tags: ['custom apis', 'practice']
---

Additive changes are cheap. Everything else needs a plan and a sunset date.

Schemas outlive the systems that produced them. Treat field names and types as a contract, and change them on purpose.

Make every job idempotent. If a retry can double a number, it eventually will, and it will happen on the day it matters most.

Failures should be loud. A pipeline that quietly writes zero rows is more dangerous than one that stops with an error.
