-- ecommarketdata market schema (P0)
-- Lives in the existing private PostgreSQL database (`shopee_output`),
-- isolated in its own `market` schema.

CREATE SCHEMA IF NOT EXISTS market;

-- One row per (platform, item, shop, snapshot_date)
CREATE TABLE IF NOT EXISTS market.silver_items (
  platform             text        NOT NULL DEFAULT 'shopee',
  item_id              bigint      NOT NULL,
  shop_id              bigint      NOT NULL,
  snapshot_date        date        NOT NULL,
  market               text,
  title                text,
  brand                text,
  category_id          bigint,
  category_l1          text,
  category_l2          text,
  currency             text,
  price_min            numeric(14,2),
  price_max            numeric(14,2),
  price_before         numeric(14,2),
  discount_pct         numeric(6,2),
  units_sold_month     integer,
  units_sold_total     integer,
  rating               numeric(4,2),
  rating_count         integer,
  stock_total          integer,
  shop_name            text,
  shop_location        text,
  item_url             text,
  observed_at          timestamptz,
  confidence           numeric(4,3),
  method               text,
  PRIMARY KEY (platform, item_id, shop_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS silver_items_date_idx     ON market.silver_items (snapshot_date);
CREATE INDEX IF NOT EXISTS silver_items_category_idx ON market.silver_items (category_l1);
CREATE INDEX IF NOT EXISTS silver_items_brand_idx    ON market.silver_items (brand);

-- Daily aggregate (dashboard "units sold by month/category/brand")
CREATE TABLE IF NOT EXISTS market.market_daily (
  date          date   NOT NULL,
  platform      text   NOT NULL,
  category_l1   text   NOT NULL DEFAULT 'all',
  brand         text   NOT NULL DEFAULT 'all',
  items_count   integer NOT NULL,
  units_sold    bigint  NOT NULL,
  gmv_est       numeric(18,2) NOT NULL,
  avg_price     numeric(14,2),
  stock_total   bigint,
  PRIMARY KEY (date, platform, category_l1, brand)
);

-- Monthly trend
CREATE TABLE IF NOT EXISTS market.market_monthly (
  month         date   NOT NULL,
  platform      text   NOT NULL,
  category_l1   text   NOT NULL DEFAULT 'all',
  units_sold    bigint  NOT NULL,
  gmv_est       numeric(18,2) NOT NULL,
  items_count   integer NOT NULL,
  price_index   numeric(14,2),
  PRIMARY KEY (month, platform, category_l1)
);

-- Latest row per item (row-level API)
CREATE TABLE IF NOT EXISTS market.market_items (
  platform           text   NOT NULL DEFAULT 'shopee',
  item_id            bigint NOT NULL,
  shop_id            bigint NOT NULL,
  title              text,
  brand              text,
  category_l1        text,
  price              numeric(14,2),
  units_sold_month   integer,
  units_sold_total   integer,
  rating             numeric(4,2),
  stock_total        integer,
  image_url          text,
  item_url           text,
  snapshot_date      date   NOT NULL,
  PRIMARY KEY (platform, item_id, shop_id)
);

-- Data quality per snapshot (trust layer)
CREATE TABLE IF NOT EXISTS market.data_quality (
  date          date   NOT NULL,
  platform      text   NOT NULL,
  matched       bigint NOT NULL,
  matched_pct   numeric(6,2),
  outliers      integer NOT NULL DEFAULT 0,
  coverage_pct  numeric(6,2),
  PRIMARY KEY (date, platform)
);

-- Pipeline audit
CREATE TABLE IF NOT EXISTS market.transform_runs (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id         text,
  snapshot_date  date,
  status         text NOT NULL,
  rows_silver    integer NOT NULL DEFAULT 0,
  rows_daily     integer NOT NULL DEFAULT 0,
  started_at     timestamptz NOT NULL DEFAULT now(),
  finished_at    timestamptz,
  error          text
);

-- API keys & usage (local auth / billing)
CREATE TABLE IF NOT EXISTS market.api_keys (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key_hash     text UNIQUE NOT NULL,
  label        text,
  plan         text NOT NULL DEFAULT 'free',
  status       text NOT NULL DEFAULT 'active',
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE TABLE IF NOT EXISTS market.usage_events (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key_id      bigint REFERENCES market.api_keys(id) ON DELETE SET NULL,
  ts          timestamptz NOT NULL DEFAULT now(),
  endpoint    text NOT NULL,
  status      integer NOT NULL,
  rows        integer NOT NULL DEFAULT 0,
  duration_ms integer
);
CREATE INDEX IF NOT EXISTS usage_events_ts_idx ON market.usage_events (ts);

-- Taxonomy & brand normalisation (extendable)
CREATE TABLE IF NOT EXISTS market.category_map (
  category_id bigint PRIMARY KEY,
  category_l1 text NOT NULL,
  category_l2 text
);

CREATE TABLE IF NOT EXISTS market.brand_canonical (
  alias     text PRIMARY KEY,
  canonical text NOT NULL
);
