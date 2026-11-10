#!/usr/bin/env python3
"""Spot-check a snapshot against the live collector before publishing.

Samples a few items from market.silver_items, asks the warehouse collector
for a fresh copy of the same items, and compares the stored numbers. A
snapshot that fails this check must not reach the dashboard.

Usage:
  python verify.py [--snapshot YYYY-MM-DD] [--sample 5]
"""
from __future__ import annotations

import argparse
import gzip
import json
import os
import random
import sys
import time
import urllib.request
from pathlib import Path

import psycopg2
from psycopg2.extras import RealDictCursor

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".env"
PASS_PCT = 80.0
TOLERANCE = 2.0


def load_env() -> None:
    if not ENV_FILE.exists():
        return
    for raw in ENV_FILE.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def api(path: str, method: str = "GET", body: dict | None = None) -> dict:
    base = os.environ["SHOPEE_API_BASE"].rstrip("/")
    payload = json.dumps(body).encode() if body else None
    req = urllib.request.Request(
        base + path,
        data=payload,
        method=method,
        headers={
            "User-Agent": "ecommarketdata-verify/1.0",
            "CF-Access-Client-Id": os.environ["SHOPEE_CF_ACCESS_CLIENT_ID"],
            "CF-Access-Client-Secret": os.environ["SHOPEE_CF_ACCESS_CLIENT_SECRET"],
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.load(response)


def fetch_live(rows: list[dict], timeout_s: int = 360) -> dict[int, dict]:
    created = api(
        "/api/jobs",
        "POST",
        {
            "name": "snapshot verification",
            "request_key": f"verify-{int(time.time())}",
            "priority": True,
            "items": [{"item_id": int(r["item_id"]), "shop_id": int(r["shop_id"])} for r in rows],
        },
    )
    job_id = created["job_id"]
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        status = api(f"/api/jobs/{job_id}").get("status")
        if status in ("completed", "partial", "failed"):
            break
        time.sleep(5)
    manifest = api(f"/api/jobs/{job_id}/results?format=manifest")
    file = next((f for f in manifest.get("files", []) if f.get("format") == "jsonl.gz"), None)
    if not file:
        raise SystemExit("Collector returned no jsonl.gz artifact")
    with urllib.request.urlopen(
        urllib.request.Request(file["url"], headers={"User-Agent": "ecommarketdata-verify/1.0"}),
        timeout=120,
    ) as response:
        data = response.read()
    out: dict[int, dict] = {}
    for line in gzip.decompress(data).decode("utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        payload = row.get("payload") or {}
        rating = payload.get("item_rating") or {}
        counts = rating.get("rating_count")
        rating_count = sum(int(x) for x in counts) if isinstance(counts, list) else None
        out[int(row["item_id"])] = {
            "sold": payload.get("sold"),
            "historical_sold": payload.get("historical_sold"),
            "rating_count": rating_count,
        }
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--snapshot")
    ap.add_argument("--sample", type=int, default=5)
    args = ap.parse_args()
    load_env()

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            snapshot = args.snapshot
            if not snapshot:
                cur.execute("SELECT max(snapshot_date)::text AS d FROM market.silver_items")
                snapshot = cur.fetchone()["d"]
            if not snapshot:
                raise SystemExit("No snapshot in market.silver_items")
            cur.execute(
                """SELECT item_id, shop_id, title, units_sold_month, units_sold_total,
                          rating_count, rating
                   FROM market.silver_items
                   WHERE snapshot_date=%s AND units_sold_total > 0
                   ORDER BY units_sold_month DESC NULLS LAST
                   LIMIT 50""",
                (snapshot,),
            )
            candidates = [dict(r) for r in cur.fetchall()]
            if not candidates:
                raise SystemExit(f"No rows for snapshot {snapshot}")
            head = candidates[: max(1, args.sample // 2)]
            tail = random.sample(candidates, min(args.sample - len(head), len(candidates)))
            sample = {int(r["item_id"]): r for r in head + tail}
    finally:
        conn.close()

    print(f"snapshot={snapshot} sampling={len(sample)} items")
    live = fetch_live(list(sample.values()))
    matched = 0
    for item_id, row in sample.items():
        fresh = live.get(item_id)
        if not fresh:
            print(f"  MISSING  {item_id}  {row['title'][:40]}")
            continue
        stored_rating = float(row["rating_count"] or 0)
        live_rating = float(fresh["rating_count"] or 0)
        stored_total = float(row["units_sold_total"] or 0)
        live_total = float(fresh["historical_sold"] or 0)
        rating_ratio = stored_rating / max(live_rating, 1)
        total_ratio = stored_total / max(live_total, 1)
        ok = (1 / TOLERANCE) <= rating_ratio <= TOLERANCE and (1 / TOLERANCE) <= total_ratio <= TOLERANCE
        matched += 1 if ok else 0
        print(
            f"  {'OK  ' if ok else 'FAIL'}  {item_id}  ratings {stored_rating:.0f} vs {live_rating:.0f}"
            f"  total {stored_total:.0f} vs {live_total:.0f}  {row['title'][:36]}"
        )

    pct = matched / len(sample) * 100 if sample else 0
    print(f"matched {matched}/{len(sample)} ({pct:.0f}%)")
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM market.data_quality WHERE date=%s AND platform='shopee'", (snapshot,))
            cur.execute(
                """INSERT INTO market.data_quality (date, platform, matched, matched_pct, outliers, coverage_pct)
                   VALUES (%s, 'shopee', %s, %s, %s, 100.0)""",
                (snapshot, matched, round(pct, 1), len(sample) - matched),
            )
        conn.commit()
    finally:
        conn.close()
    return 0 if pct >= PASS_PCT else 1


if __name__ == "__main__":
    raise SystemExit(main())
