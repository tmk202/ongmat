---
title: "Access control for internal data APIs"
description: "Internal does not mean trusted. Scope keys to the tables they actually need."
pubDate: 2026-08-13
category: 'custom-apis-data-pipelines'
tags: ['custom apis', 'practice']
---

Internal does not mean trusted. Scope keys to the tables they actually need.

Schemas outlive the systems that produced them. Treat field names and types as a contract, and change them on purpose.

Make every job idempotent. If a retry can double a number, it eventually will, and it will happen on the day it matters most.

Failures should be loud. A pipeline that quietly writes zero rows is more dangerous than one that stops with an error.
