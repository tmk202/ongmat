CREATE SCHEMA IF NOT EXISTS crawl;

CREATE TABLE IF NOT EXISTS crawl.jobs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  status            text NOT NULL DEFAULT 'running',
  total_items       integer NOT NULL,
  shards            integer NOT NULL,
  completed_shards  integer NOT NULL DEFAULT 0,
  success           bigint NOT NULL DEFAULT 0,
  errors            bigint NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jobs_status_idx ON crawl.jobs (status, created_at DESC);

CREATE TABLE IF NOT EXISTS crawl.watchlists (
  id          bigserial PRIMARY KEY,
  name        text NOT NULL,
  schedule    text NOT NULL DEFAULT 'daily',
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crawl.watchlist_items (
  watchlist_id  bigint NOT NULL REFERENCES crawl.watchlists(id) ON DELETE CASCADE,
  item_id       bigint NOT NULL,
  shop_id       bigint NOT NULL,
  market        text NOT NULL DEFAULT 'VN',
  PRIMARY KEY (watchlist_id, item_id, shop_id)
);

CREATE TABLE IF NOT EXISTS crawl.accounts (
  id           bigserial PRIMARY KEY,
  label        text NOT NULL UNIQUE,
  market       text NOT NULL DEFAULT 'VN',
  cookie       text NOT NULL,
  user_agent   text,
  proxy_url    text,
  status       text NOT NULL DEFAULT 'active',
  last_used_at timestamptz,
  cooldown_until timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crawl.proxies (
  id         bigserial PRIMARY KEY,
  url        text NOT NULL UNIQUE,
  market     text NOT NULL DEFAULT 'VN',
  kind       text NOT NULL DEFAULT 'isp',
  status     text NOT NULL DEFAULT 'active',
  last_ok_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
