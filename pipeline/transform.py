#!/usr/bin/env python3
"""ecommarketdata P0 transform: R2 parquet/csv artifacts -> PostgreSQL market.*.

Usage:
  python transform.py --job-id job_xxx [--dry-run]
  python transform.py --latest [--dry-run]

Requires: pyarrow, psycopg2-binary
Env (.env): SHOPEE_API_BASE, SHOPEE_CF_ACCESS_CLIENT_ID,
            SHOPEE_CF_ACCESS_CLIENT_SECRET, DATABASE_URL
"""
from __future__ import annotations

import argparse
import csv
import gzip
import io
import json
import os
import sys
import tempfile
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import pyarrow.csv as pacsv
import pyarrow as pa
import psycopg2
from psycopg2.extras import execute_values

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".env"
CATEGORY_MAP = Path(__file__).resolve().parent / "category_map.json"
CSV_COLUMNS = [
    "item_id", "shop_id", "market", "observed_at", "currency", "title",
    "price_min", "price_max", "sold_monthly", "historical_sold", "stock", "payload_json",
]


def load_env() -> None:
    if not ENV_FILE.exists():
        return
    for raw in ENV_FILE.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())


def api_get(path: str) -> dict:
    base = os.environ["SHOPEE_API_BASE"].rstrip("/")
    req = urllib.request.Request(
        base + path,
        headers={
            "User-Agent": "ecommarketdata-pipeline/1.0",
            "CF-Access-Client-Id": os.environ["SHOPEE_CF_ACCESS_CLIENT_ID"],
            "CF-Access-Client-Secret": os.environ["SHOPEE_CF_ACCESS_CLIENT_SECRET"],
        },
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def pick_latest_job() -> str:
    """Pick the newest completed/partial job from the private metadata DB."""
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT j.id FROM jobs j
                WHERE j.status IN ('completed','partial')
                  AND EXISTS (SELECT 1 FROM artifacts a WHERE a.job_id = j.id)
                ORDER BY j.created_at DESC
                LIMIT 1
                """
            )
            row = cur.fetchone()
            if not row:
                raise SystemExit("No completed/partial job with artifacts found")
            return row[0]
    finally:
        conn.close()


def download_csv(manifest: dict, dest: Path) -> None:
    files = [f for f in manifest.get("files", []) if f.get("format") == "csv.gz"]
    if not files:
        raise SystemExit("Manifest has no csv.gz artifact")
    req = urllib.request.Request(files[0]["url"], headers={"User-Agent": "ecommarketdata-pipeline/1.0"})
    with urllib.request.urlopen(req, timeout=300) as r, dest.open("wb") as out:
        while chunk := r.read(1 << 20):
            out.write(chunk)


def load_category_map() -> dict[str, str]:
    if not CATEGORY_MAP.exists():
        return {}
    return {str(k): str(v) for k, v in json.loads(CATEGORY_MAP.read_text()).items()}



CATEGORY_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("Supplements", ("whey", "protein", "collagen", "vitamin", "omega", "creatine", "bcaa",
        "mass gainer", "pre workout", "probiotic", "men vi sinh", "thực phẩm bổ sung", "tpcn",
        "thuốc bổ", "sữa bột", "glutamine", "amino", "dầu cá", "canxi", "kẽm", "magnesium")),
    ("Beauty", ("mỹ phẩm", "kem dưỡng", "serum", "son môi", "trang điểm", "dưỡng da",
        "sữa rửa mặt", "nước hoa", "tẩy trang", "mặt nạ", "kem chống nắng", "makeup",
        "skincare", "lipstick", "cleanser", "toner")),
    ("Electronics", ("điện thoại", "tai nghe", "sạc dự phòng", "cáp sạc", "chuột", "bàn phím",
        "loa ", "màn hình", "laptop", "camera", "usb", "smartwatch", "đồng hồ thông minh",
        "headphone", "earbuds", "power bank")),
    ("Fashion", ("áo ", "quần ", "váy", "đầm", "giày", "dép", "túi xách", "mũ ", "nón",
        "thắt lưng", "sneaker", "shirt", "dress", "pants", "jacket", "hoodie", "t-shirt")),
    ("Sports", ("tạ ", "gym", "yoga", "bóng đá", "bóng rổ", "vợt", "xe đạp", "thể thao",
        "dumbbell", "fitness", "running")),
    ("Baby", ("em bé", "trẻ em", "tã ", "bỉm", "sữa bột trẻ", "đồ chơi", "baby", "kids")),
    ("Home & Living", ("chổi", "hót rác", "nhà bếp", "nồi", "chảo", "gối", "chăn", "kệ ",
        "hộp ", "ly ", "cốc", "bình ", "đèn ", "quạt", "móc", "khăn", "thảm", "tủ ",
        "bàn ", "ghế", "home", "kitchen")),
    ("Food & Beverage", ("cà phê", "trà ", "bánh", "kẹo", "mì ", "gạo", "nước mắm", "mật ong",
        "sữa ", "đồ ăn", "thực phẩm", "snack", "chẩm chéo", "atiso", "coffee", "tea", "food")),
]


def classify(title: str | None, brand: str | None) -> str:
    text = f"{title or ''} {brand or ''}".lower()
    for label, keys in CATEGORY_RULES:
        for key in keys:
            if key in text:
                return label
    return "Other"


def normalize(csv_path: Path, snapshot_date: str, limit: int | None):
    table = pacsv.read_csv(
        csv_path,
        read_options=pacsv.ReadOptions(use_threads=True),
        convert_options=pacsv.ConvertOptions(include_columns=CSV_COLUMNS),
    )
    catmap = load_category_map()
    rows = []
    seen = 0
    for batch in table.to_batches():
        data = batch.to_pylist()
        for r in data:
            if limit is not None and seen >= limit:
                break
            seen += 1
            try:
                payload = json.loads(r.get("payload_json") or "{}")
            except Exception:
                payload = {}
            try:
                # CSV price columns are already normalized to major units;
                # raw payload prices are stored x100000.
                price_min = float(r["price_min"]) if r.get("price_min") is not None else None
                price_max = float(r["price_max"]) if r.get("price_max") is not None else None
            except Exception:
                price_min = price_max = None
            before_raw = payload.get("price_before_discount") or payload.get("price_min_before_discount")
            price_before = float(before_raw) / 100000.0 if before_raw else None
            discount_pct = None
            if price_before and price_min and price_before > 0:
                discount_pct = round(max(0.0, (price_before - price_min) / price_before * 100), 2)
            catid = payload.get("catid")
            rating_obj = payload.get("item_rating") or {}
            rating = rating_obj.get("rating_star")
            rc = rating_obj.get("rating_count")
            rating_count = sum(int(x) for x in rc) if isinstance(rc, list) else payload.get("cmt_count")
            market = (r.get("market") or "VN").lower()
            domain = "shopee.sg" if market == "sg" else "shopee.vn"
            rows.append((
                "shopee",
                int(r["item_id"]),
                int(r["shop_id"]),
                snapshot_date,
                market.upper(),
                r.get("title"),
                (payload.get("brand") or "").strip() or None,
                int(catid) if catid else None,
                (catmap.get(str(catid)) or classify(r.get('title'), payload.get('brand'))),
                None,
                (r.get("currency") or payload.get("currency") or "VND").upper(),
                price_min,
                price_max,
                price_before,
                discount_pct,
                int(r.get("sold_monthly") or 0),
                int(r.get("historical_sold") or 0),
                float(rating) if rating is not None else None,
                int(rating_count) if rating_count is not None else None,
                int(r.get("stock") or 0),
                payload.get("shop_name"),
                payload.get("shop_location"),
                f"https://{domain}/product/{r['shop_id']}/{r['item_id']}",
                r.get("observed_at"),
                1.0,
                "shopee_items_api",
            ))
        if limit is not None and seen >= limit:
            break
    return rows


def copy_silver(conn, rows) -> None:
    cols = (
        "platform,item_id,shop_id,snapshot_date,market,title,brand,category_id,category_l1,"
        "category_l2,currency,price_min,price_max,price_before,discount_pct,units_sold_month,"
        "units_sold_total,rating,rating_count,stock_total,shop_name,shop_location,item_url,"
        "observed_at,confidence,method"
    )
    with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False, newline="") as fh:
        tmp = fh.name
        writer = csv.writer(fh)
        writer.writerows(rows)
    try:
        with conn.cursor() as cur, open(tmp, "r", newline="") as f:
            cur.copy_expert(
                f"COPY market.silver_items ({cols}) FROM STDIN WITH (FORMAT csv, NULL '')", f
            )
    finally:
        os.unlink(tmp)


def aggregate(conn, snapshot_date: str) -> int:
    with conn.cursor() as cur:
        cur.execute("DELETE FROM market.market_daily WHERE date = %s AND platform='shopee'", (snapshot_date,))
        cur.execute(
            """
            INSERT INTO market.market_daily
              (date, platform, category_l1, brand, items_count, units_sold, gmv_est, avg_price, stock_total)
            SELECT snapshot_date, platform,
                   COALESCE(category_l1, 'uncategorized'), 'all',
                   COUNT(*), SUM(units_sold_month),
                   SUM(units_sold_month * COALESCE((price_min + price_max) / 2.0, price_min, 0)),
                   ROUND(AVG(COALESCE((price_min + price_max) / 2.0, price_min)), 2),
                   SUM(stock_total)
            FROM market.silver_items
            WHERE snapshot_date = %s AND platform = 'shopee'
            GROUP BY snapshot_date, platform, COALESCE(category_l1, 'uncategorized')
            """,
            (snapshot_date,),
        )
        cur.execute(
            """
            INSERT INTO market.market_daily
              (date, platform, category_l1, brand, items_count, units_sold, gmv_est, avg_price, stock_total)
            SELECT snapshot_date, platform, 'all', 'all', COUNT(*), SUM(units_sold_month),
                   SUM(units_sold_month * COALESCE((price_min + price_max) / 2.0, price_min, 0)),
                   ROUND(AVG(COALESCE((price_min + price_max) / 2.0, price_min)), 2),
                   SUM(stock_total)
            FROM market.silver_items
            WHERE snapshot_date = %s AND platform = 'shopee'
            GROUP BY 1, 2
            """,
            (snapshot_date,),
        )
        daily = cur.rowcount
        cur.execute(
            "DELETE FROM market.market_monthly WHERE month = date_trunc('month', %s::date) AND platform='shopee'",
            (snapshot_date,),
        )
        cur.execute(
            """
            INSERT INTO market.market_monthly
              (month, platform, category_l1, units_sold, gmv_est, items_count, price_index)
            SELECT date_trunc('month', snapshot_date)::date, platform,
                   COALESCE(category_l1, 'uncategorized'),
                   SUM(units_sold_month),
                   SUM(units_sold_month * COALESCE((price_min + price_max) / 2.0, price_min, 0)),
                   COUNT(*),
                   ROUND(AVG(COALESCE((price_min + price_max) / 2.0, price_min)), 2)
            FROM market.silver_items
            WHERE snapshot_date = %s AND platform = 'shopee'
            GROUP BY 1, 2, 3
            """,
            (snapshot_date,),
        )
        cur.execute(
            """
            INSERT INTO market.market_monthly
              (month, platform, category_l1, units_sold, gmv_est, items_count, price_index)
            SELECT date_trunc('month', snapshot_date)::date, platform, 'all',
                   SUM(units_sold_month),
                   SUM(units_sold_month * COALESCE((price_min + price_max) / 2.0, price_min, 0)),
                   COUNT(*),
                   ROUND(AVG(COALESCE((price_min + price_max) / 2.0, price_min)), 2)
            FROM market.silver_items
            WHERE snapshot_date = %s AND platform = 'shopee'
            GROUP BY 1, 2
            ON CONFLICT (month, platform, category_l1) DO UPDATE SET
              units_sold = EXCLUDED.units_sold, gmv_est = EXCLUDED.gmv_est,
              items_count = EXCLUDED.items_count, price_index = EXCLUDED.price_index
            """,
            (snapshot_date,),
        )
        cur.execute(
            """
            INSERT INTO market.market_items
              (platform, item_id, shop_id, title, brand, category_l1, price, units_sold_month,
               units_sold_total, rating, stock_total, item_url, snapshot_date)
            SELECT platform, item_id, shop_id, title, brand, category_l1,
                   COALESCE(price_min, price_max), units_sold_month, units_sold_total,
                   rating, stock_total, item_url, snapshot_date
            FROM market.silver_items s
            WHERE snapshot_date = %s AND platform='shopee'
            ON CONFLICT (platform, item_id, shop_id) DO UPDATE SET
              title = EXCLUDED.title, brand = EXCLUDED.brand, category_l1 = EXCLUDED.category_l1,
              price = EXCLUDED.price, units_sold_month = EXCLUDED.units_sold_month,
              units_sold_total = EXCLUDED.units_sold_total, rating = EXCLUDED.rating,
              stock_total = EXCLUDED.stock_total, item_url = EXCLUDED.item_url,
              snapshot_date = EXCLUDED.snapshot_date
            WHERE market.market_items.snapshot_date <= EXCLUDED.snapshot_date
            """,
            (snapshot_date,),
        )
        cur.execute("DELETE FROM market.data_quality WHERE date=%s AND platform='shopee'", (snapshot_date,))
        cur.execute(
            """
            INSERT INTO market.data_quality (date, platform, matched, matched_pct, outliers, coverage_pct)
            SELECT %s, 'shopee', COUNT(*), 100.0, 0, 100.0
            FROM market.silver_items WHERE snapshot_date=%s AND platform='shopee'
            """,
            (snapshot_date, snapshot_date),
        )
    conn.commit()
    return daily


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--job-id")
    ap.add_argument("--latest", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int)
    args = ap.parse_args()

    load_env()
    if not os.environ.get("DATABASE_URL"):
        print("DATABASE_URL missing in .env", file=sys.stderr)
        return 1

    job_id = args.job_id or (pick_latest_job() if args.latest else None)
    if not job_id:
        print("Provide --job-id or --latest", file=sys.stderr)
        return 1

    manifest = api_get(f"/api/jobs/{job_id}/results?format=manifest")
    job = api_get(f"/api/jobs/{job_id}/parts")
    snapshot_date = manifest.get("snapshot_date") or job.get("snapshot_date")
    if not snapshot_date:
        # snapshot date is stored on the job row; fall back to the DB
        conn = psycopg2.connect(os.environ["DATABASE_URL"])
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT snapshot_date::text FROM jobs WHERE id=%s", (job_id,))
                snapshot_date = cur.fetchone()[0]
        finally:
            conn.close()
    snapshot_date = str(snapshot_date)
    print(f"job={job_id} snapshot={snapshot_date}")

    tmpdir = Path(tempfile.mkdtemp(prefix="ecomm-"))
    csv_path = tmpdir / "data.csv.gz"
    download_csv(manifest, csv_path)
    rows = normalize(csv_path, snapshot_date, args.limit)
    print(f"silver rows: {len(rows)}")
    if args.dry_run:
        if rows:
            print("sample:", rows[0])
        return 0

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO market.transform_runs (job_id, snapshot_date, status) VALUES (%s,%s,'running') RETURNING id",
                (job_id, snapshot_date),
            )
            run_id = cur.fetchone()[0]
        conn.commit()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM market.silver_items WHERE snapshot_date=%s AND platform='shopee'", (snapshot_date,))
            copy_silver(conn, rows)
            conn.commit()
            daily = aggregate(conn, snapshot_date)
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE market.transform_runs SET status='done', rows_silver=%s, rows_daily=%s, finished_at=now() WHERE id=%s",
                    (len(rows), daily, run_id),
                )
            conn.commit()
            print(f"done: silver={len(rows)} daily_groups={daily}")
        except Exception as exc:
            conn.rollback()
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE market.transform_runs SET status='failed', error=%s, finished_at=now() WHERE id=%s",
                    (str(exc)[:500], run_id),
                )
            conn.commit()
            raise
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
