CREATE DATABASE IF NOT EXISTS crawl;

CREATE TABLE IF NOT EXISTS crawl.item_snapshots (
  date              Date,
  item_id           String,
  shop_id           String,
  market            LowCardinality(String),
  title             String,
  price             Float64,
  units_sold_month  UInt32,
  units_sold_total  UInt32,
  rating            Float32,
  observed_at       DateTime
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(date)
ORDER BY (date, market, item_id)
TTL toDate(date) + INTERVAL 365 DAY;

CREATE TABLE IF NOT EXISTS crawl.item_errors (
  date       Date,
  item_id    String,
  shop_id    String,
  market     LowCardinality(String),
  reason     String,
  observed_at DateTime
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(date)
ORDER BY (date, item_id)
TTL toDate(date) + INTERVAL 90 DAY;
