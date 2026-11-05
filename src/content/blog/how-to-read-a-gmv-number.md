---
title: "How to read a GMV number without getting fooled"
description: "GMV looks like a single number. In practice it hides at least four different definitions. Here is how to tell which one you are looking at."
category: 'web-scraping-data-extraction'
pubDate: 2026-10-28
tags: ["GMV", "methodology", "marketplaces"]
---

Two reports can both say "marketplace GMV grew 22%" and still describe different things. Before you quote a figure in a deck, work out which of the four common definitions produced it.

## 1. Gross vs net

Gross merchandise value usually means the total value of goods sold through the platform before returns, discounts and cancellations. Net revenue is what the platform actually keeps. A marketplace can post enormous gross value and still lose money, so never treat gross value as a proxy for platform health.

Ask: does the figure include cancelled orders? Does it include shipping and vouchers?

## 2. Order date vs ship date

A campaign that runs on 11 November books orders that ship days later. Some datasets count the calendar date the order was placed, others count the date it was fulfilled. Around campaign peaks the two series can diverge by several percent for a week or more.

## 3. Platform-reported vs estimated

Only a handful of marketplaces publish audited GMV. Most third-party datasets are modelled from public signals: review velocity, listing counts, traffic estimates, seller interviews. That is not automatically bad, but an estimate should be labelled as one and should come with a stated method.

## 4. Market definition

"Singapore GMV" might mean orders shipped to Singapore, orders placed by Singapore accounts, or sales by Singapore-registered sellers. Cross-border trade makes these three numbers very different.

## A short checklist

- Is the number gross or net?
- Does it include returns and cancellations?
- Which date is being counted?
- Is it reported by the platform or modelled?
- What counts as "in market"?

If a source cannot answer those questions, treat the number as directional. Directional is fine for a trend line. It is not fine for a board slide that implies precision.

Every dataset on this site states its definition, market and period on the dataset page, so you can check which of the four you are reading.
