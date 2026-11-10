#!/usr/bin/env python3
"""Publish gold tables to R2 for the public Worker API.

Reads market.* from PostgreSQL and uploads:
  metrics/latest.json  -> /api/v1/metrics
  metrics/meta.json    -> /api/v1/meta
  items/top.json       -> /api/v1/items

Usage: python publish.py [--limit 500]
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
from psycopg2.extras import RealDictCursor

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".env"
BUCKET = "ecommarketdata-gold"


def load_env() -> None:
    if not ENV_FILE.exists():
        return
    for raw in ENV_FILE.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())


def upload(key: str, payload: dict) -> None:
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as fh:
        json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"))
        tmp = fh.name
    try:
        subprocess.run(
            [
                "npx", "wrangler", "r2", "object", "put",
                f"{BUCKET}/{key}",
                f"--file={tmp}",
                "--content-type=application/json",
                "--remote",
            ],
            cwd=ROOT,
            check=True,
            stdout=subprocess.DEVNULL,
        )
        print(f"uploaded {key} ({os.path.getsize(tmp)} bytes)")
    finally:
        os.unlink(tmp)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=500)
    args = ap.parse_args()
    load_env()
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT max(snapshot_date) AS d FROM market.silver_items")
            snapshot = cur.fetchone()["d"]
            if not snapshot:
                print("No silver data", file=sys.stderr)
                return 1
            cur.execute("SELECT DISTINCT currency FROM market.silver_items WHERE snapshot_date=%s", (snapshot,))
            currencies = sorted({r["currency"] for r in cur.fetchall() if r["currency"]})
            cur.execute("SELECT DISTINCT category_l1 FROM market.silver_items WHERE snapshot_date=%s AND category_l1 IS NOT NULL ORDER BY 1", (snapshot,))
            categories = [r["category_l1"] for r in cur.fetchall()]

            cur.execute(
                """SELECT date::text, category_l1, brand, items_count, units_sold,
                          gmv_est::float8, avg_price::float8, stock_total
                   FROM market.market_daily WHERE date=%s ORDER BY units_sold DESC""",
                (snapshot,),
            )
            daily = [dict(r) for r in cur.fetchall()]

            cur.execute(
                """SELECT month::text, category_l1, units_sold, gmv_est::float8,
                          items_count, price_index::float8
                   FROM market.market_monthly ORDER BY month, category_l1"""
            )
            monthly = [dict(r) for r in cur.fetchall()]

            cur.execute(
                """SELECT item_id::text, shop_id::text, title, brand, category_l1,
                          price::float8, units_sold_month, units_sold_total,
                          rating::float8, stock_total, item_url, snapshot_date::text
                   FROM market.market_items ORDER BY units_sold_month DESC NULLS LAST LIMIT %s""",
                (args.limit,),
            )
            items = [dict(r) for r in cur.fetchall()]

            ids = [int(r["item_id"]) for r in items]
            history: dict[str, list[dict]] = {}
            if ids:
                cur.execute(
                    """SELECT item_id::text, snapshot_date::text AS date,
                              units_sold_month, units_sold_total,
                              price_min::float8 AS price, rating::float8
                       FROM market.silver_items
                       WHERE platform='shopee' AND item_id = ANY(%s)
                       ORDER BY item_id, snapshot_date""",
                    (ids,),
                )
                for row in cur.fetchall():
                    history.setdefault(row["item_id"], []).append(
                        {
                            "date": row["date"],
                            "units_sold_month": int(row["units_sold_month"] or 0),
                            "units_sold_total": int(row["units_sold_total"] or 0),
                            "price": row["price"],
                            "rating": row["rating"],
                        }
                    )
    finally:
        conn.close()

    meta = {
        "snapshot_date": str(snapshot),
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "platform": "shopee",
        "currency": currencies[0] if len(currencies) == 1 else currencies,
        "categories": categories,
        "rows": len(daily),
    }

    upload("metrics/latest.json", {"ok": True, "meta": meta, "daily": daily, "monthly": monthly})
    upload("metrics/meta.json", {"ok": True, "meta": meta})
    upload("items/top.json", {"ok": True, "meta": meta, "rows": items})
    upload("items/history.json", {"ok": True, "meta": meta, "series": history})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
